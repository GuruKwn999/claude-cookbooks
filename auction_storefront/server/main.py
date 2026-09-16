"""Reference server for the Hammer & Hearth storefront.

Run it with:

    uv run uvicorn main:app --reload --port 8000

What lives here and nowhere else, because none of it belongs in a browser: the
secret keys, the authoritative price of an order (fulfilment-aware — a car
deposit is not a teapot's price), the Claude call behind the curator, the
webhook that marks a lot sold, and the admin API.

The storefront works without this server — it falls back to a demo checkout and
an on-page curator. Point web/index.html's HH_CONFIG.apiBase at this process to
switch it on.
"""

from __future__ import annotations

import json
import os
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, Literal

import anthropic
import db
import fx
import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

sys.path.append(str(Path(__file__).parent.parent))  # for agents.*

load_dotenv()
db.init_db()

MODEL = "claude-opus-5"
SHIPPING_USD = Decimal("28.00")
TAX_RATE = Decimal("0.0825")

# Currencies whose smallest unit is the unit itself — amounts are not ×100.
ZERO_DECIMAL = {
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
}

_CATALOG = json.loads((Path(__file__).parent / "lots.json").read_text())
CATALOG_LOTS: dict[str, dict[str, Any]] = {lot["id"]: lot for lot in _CATALOG["lots"]}

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_TAX_ENABLED = os.getenv("STRIPE_TAX_ENABLED", "").lower() in {"1", "true", "yes"}
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

claude = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY, or an `ant auth login` profile

app = FastAPI(title="Hammer & Hearth")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("STOREFRONT_ORIGIN", "http://localhost:8000")],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)


def live_lot(lot_id: str) -> dict[str, Any] | None:
    """The catalogue row merged with whatever the database overrides —
    sold state and any admin-set price live in SQLite, not in lots.json."""
    base = CATALOG_LOTS.get(lot_id)
    if base is None:
        return None
    override = db.lot_overrides().get(lot_id, {})
    merged = {**base}
    if override.get("sold"):
        merged["sold"] = True
    if override.get("price_usd") is not None:
        merged["priceUsd"] = override["price_usd"]
    return merged


def live_catalog() -> dict[str, Any]:
    overrides = db.lot_overrides()
    lots = []
    for lot in _CATALOG["lots"]:
        o = overrides.get(lot["id"], {})
        merged = {**lot}
        if o.get("sold"):
            merged["sold"] = True
        if o.get("price_usd") is not None:
            merged["priceUsd"] = o["price_usd"]
        lots.append(merged)
    return {**_CATALOG, "lots": lots}


def require_admin(authorization: str = Header(default="")) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(503, "ADMIN_TOKEN is not set — admin API is disabled")
    if authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(401, "Bad or missing admin token")


# --------------------------------------------------------------------- models


class CartLine(BaseModel):
    id: str
    qty: int = Field(ge=1, le=10)


class IntentRequest(BaseModel):
    lots: list[CartLine]
    currency: str = "usd"
    country: str = "US"
    locale: str = "en"
    email: str | None = None
    # The browser also sends an `amount`. It is deliberately ignored: the price
    # of an order is decided here, against the catalogue, or a shopper could
    # edit it in devtools and buy a plan chest for a dollar.


class AssistantRequest(BaseModel):
    question: str
    locale: str = "en"
    currency: str = "USD"
    history: list[dict[str, Any]] = Field(default_factory=list)


class Lead(BaseModel):
    name: str
    email: EmailStr
    kind: Literal["consign", "estate", "trade", "interior", "vehicle", "property", "sell"] = (
        "consign"
    )
    note: str = ""


class Enquiry(BaseModel):
    lot_id: str
    name: str
    email: EmailStr
    note: str = ""


class PriceUpdate(BaseModel):
    price_usd: float | None = None  # null clears the override, back to catalogue price
    sold: bool | None = None


# ---------------------------------------------------------------- catalogue


@app.get("/api/lots")
def list_lots() -> dict[str, Any]:
    return live_catalog()


@app.get("/api/rates")
def rates() -> dict[str, Any]:
    """Live rates for pricing a checkout — see fx.py. Distinct from i18n.js's
    bundled table, which is indicative and must never price a charge."""
    try:
        return {"base": "USD", "rates": fx.usd_rates()}
    except Exception as exc:  # noqa: BLE001 — surface any feed failure as 502
        raise HTTPException(502, f"FX feed unavailable: {exc}") from exc


# ------------------------------------------------------------------ payments


class Priced(BaseModel):
    subtotal: Decimal
    shipping: Decimal
    tax: Decimal
    total: Decimal
    kind: Literal["sale", "deposit"]
    balance_due: Decimal


def price_order(lines: list[CartLine]) -> Priced:
    """The authoritative order total, in USD — fulfilment-aware, matching the
    logic in web/assets/js/store.js's totals(). A collection-lot deposit is
    what's charged now, not the lot price; a deposit is never taxed here,
    since vehicle sales tax is collected at title transfer, not at booking.
    Every lot in one cart must share a fulfilment type — a teapot and a car
    do not check out together.
    """
    if not lines:
        raise HTTPException(400, "Empty cart")

    resolved = []
    for line in lines:
        lot = live_lot(line.id)
        if lot is None:
            raise HTTPException(400, f"Unknown lot: {line.id}")
        if lot.get("sold"):
            raise HTTPException(409, f"Lot {lot['lot']} has already sold")
        if lot["fulfilment"] == "enquiry":
            raise HTTPException(409, f"Lot {lot['lot']} is sold by enquiry, not checkout")
        if line.qty > lot.get("qty", 1):
            raise HTTPException(409, f"Only {lot.get('qty', 1)} of lot {lot['lot']} available")
        resolved.append((lot, line.qty))

    fulfilments = {lot["fulfilment"] for lot, _ in resolved}
    if "collect" in fulfilments and len(fulfilments) > 1:
        raise HTTPException(
            409, "Collection lots (vehicles) can't check out alongside shipped or freighted lots"
        )

    kind: Literal["sale", "deposit"] = "deposit" if "collect" in fulfilments else "sale"

    subtotal = Decimal("0")
    taxable = Decimal("0")
    balance_due = Decimal("0")
    for lot, qty in resolved:
        price = Decimal(str(lot["priceUsd"]))
        if lot["fulfilment"] == "collect":
            deposit = Decimal(str(lot["depositUsd"]))
            subtotal += deposit * qty
            balance_due += (price - deposit) * qty
        else:
            subtotal += price * qty
            taxable += price * qty

    shipping = (
        SHIPPING_USD if any(lot["fulfilment"] == "ship" for lot, _ in resolved) else Decimal("0")
    )
    tax = (taxable * TAX_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal + shipping + tax).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return Priced(
        subtotal=subtotal,
        shipping=shipping,
        tax=tax,
        total=total,
        kind=kind,
        balance_due=balance_due,
    )


def stripe_tax_for(lines: list[CartLine], country: str, priced: Priced) -> Decimal | None:
    """Recompute tax with Stripe Tax when enabled, for real jurisdiction rates
    instead of the flat TAX_RATE. Returns None (caller keeps the flat rate) if
    Stripe Tax is off, unconfigured for the destination, or the call fails —
    a tax-engine outage should not be able to block checkout."""
    if not STRIPE_TAX_ENABLED or priced.kind == "deposit":
        return None
    try:
        calc = stripe.tax.Calculation.create(
            currency="usd",
            line_items=[
                {
                    "amount": to_minor_units(
                        Decimal(str(live_lot(line.id)["priceUsd"])) * line.qty, "usd"
                    ),
                    "reference": line.id,
                }
                for line in lines
            ],
            customer_details={"address": {"country": country}, "address_source": "shipping"},
        )
        return Decimal(calc.tax_amount_exclusive) / Decimal(100)
    except Exception as exc:  # noqa: BLE001 — fall back to the flat rate, don't 500 checkout
        print(f"Stripe Tax calculation failed, using flat rate: {exc}")
        return None


def to_minor_units(amount: Decimal, currency: str) -> int:
    if currency.lower() in ZERO_DECIMAL:
        return int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@app.post("/api/payment-intent")
def payment_intent(req: IntentRequest) -> dict[str, Any]:
    """One PaymentIntent covers every method the storefront offers.

    `automatic_payment_methods` lets Stripe decide which of the methods enabled
    on your account are valid for this amount, currency and country — that is
    what makes the card networks, the wallets, Klarna, Afterpay, Affirm, Zip and
    the local bank rails a single integration rather than twenty.
    """
    priced = price_order(req.lots)  # validate the cart before checking server config

    if not stripe.api_key:
        raise HTTPException(503, "STRIPE_SECRET_KEY is not set")

    tax_override = stripe_tax_for(req.lots, req.country, priced)
    total_usd = (
        priced.subtotal
        + priced.shipping
        + (tax_override if tax_override is not None else priced.tax)
    )

    if req.currency.lower() != "usd":
        try:
            amount_usd = float(total_usd)
            total = Decimal(str(fx.convert(amount_usd, req.currency))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Could not convert to {req.currency}: {exc}") from exc
    else:
        total = total_usd

    intent = stripe.PaymentIntent.create(
        amount=to_minor_units(total, req.currency),
        currency=req.currency.lower(),
        automatic_payment_methods={"enabled": True},
        receipt_email=req.email or None,
        metadata={
            "lots": ",".join(f"{line.id}x{line.qty}" for line in req.lots),
            "country": req.country,
            "locale": req.locale,
            "kind": priced.kind,
        },
    )

    db.record_order(
        id=intent.id,
        email=req.email,
        lots=[line.model_dump() for line in req.lots],
        amount_minor=to_minor_units(total, req.currency),
        currency=req.currency.lower(),
        country=req.country,
        status="requires_payment",
        kind=priced.kind,
    )

    return {"clientSecret": intent.client_secret}


@app.post("/api/webhook")
async def stripe_webhook(request: Request) -> dict[str, str]:
    """Mark lots sold when payment actually settles, and record the order.

    This matters more here than in most shops: most lots are one-of-one, so a
    lot that sells has to leave the catalogue before someone else buys it.
    Delayed methods — Klarna, SEPA, Boleto, OXXO — confirm minutes or days after
    checkout, which is exactly why this runs on the webhook and not on the
    browser's success redirect. A deposit (vehicles) marks the lot reserved,
    not sold — a human still needs to complete the collection sale.
    """
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not secret:
        raise HTTPException(503, "STRIPE_WEBHOOK_SECRET is not set")

    try:
        event = stripe.Webhook.construct_event(
            payload=await request.body(),
            sig_header=request.headers.get("stripe-signature", ""),
            secret=secret,
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(400, f"Invalid webhook: {exc}") from exc

    obj = event["data"]["object"]
    if event["type"] == "payment_intent.succeeded":
        meta = obj.get("metadata", {})
        kind = meta.get("kind", "sale")
        db.record_order(
            id=obj["id"],
            email=obj.get("receipt_email"),
            lots=[
                {"id": part.split("x")[0], "qty": int(part.split("x")[1])}
                for part in meta.get("lots", "").split(",")
                if part
            ],
            amount_minor=obj["amount"],
            currency=obj["currency"],
            country=meta.get("country"),
            status="succeeded",
            kind=kind,
        )
        # A deposit reserves a vehicle for inspection — it does not sell it.
        # Mark it sold only for an outright sale.
        if kind == "sale":
            for part in meta.get("lots", "").split(","):
                if part:
                    db.mark_sold(part.split("x")[0])

    return {"status": "ok"}


# ------------------------------------------------------------------ curator


CURATOR_SYSTEM = """You are the curator of Hammer & Hearth, a one-person shop \
that buys single lots at regional auctions and resells them — antiques, \
jewellery, electronics, vehicles and property — across seven departments.

How you talk:
- Plain, specific, unhurried. You know these objects personally.
- Name faults before virtues. A shopper who learns about the hairline — or the \
overspray, or the failed roof — from you rather than from the parcel comes back.
- Never invent a lot, a price, a maker or a provenance. Everything you state \
about an object must come from search_lots.
- If nothing in the catalogue fits, say so and suggest the nearest department \
rather than stretching a match.
- Two or three short paragraphs at most.

How a sale works depends on what it is:
- Shipped and freighted lots (antiques, electronics, tiny homes) — checkout, \
full price now, shipping quoted for freight after checkout.
- Vehicles — a deposit at checkout reserves the car for inspection; the \
balance is due on collection. Recommend inspecting before treating a deposit \
as final, since it becomes non-refundable once the buyer confirms after \
inspection.
- Property and land — never checkout. Point the shopper to "register interest" \
on the listing, which reaches the owner directly.

Policies you may state:
- Shipping is tracked and insured worldwide. Over 20 kg is quoted as freight \
after checkout and nothing moves until the buyer approves the cost.
- Returns: 14 days for any reason on grades A through C, shipped/freighted lots \
only. Grade D is "as found" and sold as a project, no returns on condition. \
Vehicle deposits and property are not covered by this return window.
- Payment: all major card networks, Apple Pay, Google Pay, PayPal, Amazon Pay, \
and buy-now-pay-later where it settles. Which ones appear depends on the \
shopper's country.
- Import duty and VAT are the buyer's outside the US, and the customs form \
carries the real value.

Answer in the shopper's language."""


@anthropic.beta_tool
def search_lots(query: str, max_price_usd: float | None = None) -> str:
    """Search the shop's live catalogue of auction lots.

    Args:
        query: What the shopper is looking for — a department, category,
            material, period, room, or the kind of object. Free text.
        max_price_usd: Optional ceiling. Omit if the shopper gave no budget.
    """
    words = [w for w in query.lower().split() if len(w) > 2]
    scored: list[tuple[int, dict[str, Any]]] = []
    overrides = db.lot_overrides()

    for lot in _CATALOG["lots"]:
        o = overrides.get(lot["id"], {})
        if o.get("sold") or lot.get("sold"):
            continue
        price = o.get("price_usd") if o.get("price_usd") is not None else lot["priceUsd"]
        if max_price_usd is not None and price > max_price_usd:
            continue
        haystack = " ".join(str(lot[k]) for k in ("title", "cat", "era", "house", "note")).lower()
        score = sum(1 for w in words if w in haystack)
        if score:
            scored.append((score, {**lot, "priceUsd": price}))

    scored.sort(key=lambda pair: (-pair[0], pair[1]["priceUsd"]))
    hits = [lot for _, lot in scored[:5]]

    if not hits:
        return json.dumps({"results": [], "note": "No lot matches that."})

    return json.dumps(
        {
            "results": [
                {
                    "id": lot["id"],
                    "lot": lot["lot"],
                    "title": lot["title"],
                    "price_usd": lot["priceUsd"],
                    "fulfilment": lot["fulfilment"],
                    "deposit_usd": lot.get("depositUsd"),
                    "era": lot["era"],
                    "grade": lot["grade"],
                    "dims": lot["dims"],
                    "provenance": f"{lot['house']} · {lot['sale']}",
                    "condition_note": lot["note"],
                }
                for lot in hits
            ]
        }
    )


@anthropic.beta_tool
def quote_shipping(country_code: str, weight_kg: float) -> str:
    """Quote shipping for a shipped or freighted lot to a destination. Not
    applicable to vehicles (collection only) or property (private treaty).

    Args:
        country_code: ISO 3166-1 alpha-2 code, e.g. "GB".
        weight_kg: The lot's weight in kilograms.
    """
    zones = {
        "US": (28, 64, "3–5 days"),
        "CA": (46, 98, "5–8 days"),
        "MX": (46, 98, "5–8 days"),
        "GB": (58, 126, "4–7 days"),
        "IE": (58, 126, "4–7 days"),
        "AU": (74, 158, "7–12 days"),
        "NZ": (74, 158, "7–12 days"),
        "JP": (68, 146, "6–10 days"),
        "KR": (68, 146, "6–10 days"),
        "SG": (68, 146, "6–10 days"),
    }
    eu = {
        "AT",
        "BE",
        "BG",
        "CY",
        "CZ",
        "DE",
        "DK",
        "EE",
        "ES",
        "FI",
        "FR",
        "GR",
        "HR",
        "HU",
        "IT",
        "LT",
        "LU",
        "LV",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SE",
        "SI",
        "SK",
    }

    code = country_code.upper()
    if code in zones:
        light, heavy, days = zones[code]
    elif code in eu:
        light, heavy, days = 62, 134, "5–9 days"
    else:
        light, heavy, days = 86, 178, "8–16 days"

    if weight_kg > 20:
        return json.dumps(
            {
                "method": "palletised freight",
                "note": "Quoted individually after checkout; nothing ships until the buyer approves the cost.",
                "transit": "10–21 days",
            }
        )

    return json.dumps(
        {
            "method": "tracked and insured courier",
            "cost_usd": light if weight_kg <= 5 else heavy,
            "transit": days,
        }
    )


@app.post("/api/assistant")
def assistant(req: AssistantRequest) -> dict[str, Any]:
    """Answer a shopper's question with Claude, grounded in the catalogue.

    The tool runner drives the loop: Claude calls search_lots or quote_shipping,
    the SDK executes them here and feeds the results back, and we read the final
    message once it stops asking for tools.
    """
    messages = [
        {"role": turn["role"] if turn["role"] == "user" else "assistant", "content": turn["text"]}
        for turn in req.history[-8:]
        if turn.get("text")
    ]
    messages.append(
        {
            "role": "user",
            "content": f"[Shopper's locale: {req.locale}, prices shown in {req.currency}]\n\n{req.question}",
        }
    )

    runner = claude.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "low"},  # a shop answer, not a research task
        system=[
            {
                "type": "text",
                "text": CURATOR_SYSTEM,
                "cache_control": {"type": "ephemeral"},  # stable prefix, cache it
            }
        ],
        tools=[search_lots, quote_shipping],
        messages=messages,
    )

    final = runner.until_done()

    if final.stop_reason == "refusal":
        return {
            "reply": "I can't help with that one. Ask me about a lot and I will.",
            "lot_ids": [],
        }

    reply = "".join(block.text for block in final.content if block.type == "text")

    lot_ids: list[str] = []
    for message in runner.messages:
        for block in message.get("content", []) if isinstance(message.get("content"), list) else []:
            if getattr(block, "type", None) == "tool_result" or (
                isinstance(block, dict) and block.get("type") == "tool_result"
            ):
                raw = block["content"] if isinstance(block, dict) else block.content
                text = raw if isinstance(raw, str) else json.dumps(raw, default=str)
                for lot_id in CATALOG_LOTS:
                    if f'"{lot_id}"' in text and lot_id not in lot_ids:
                        lot_ids.append(lot_id)

    return {"reply": reply, "lot_ids": lot_ids[:4]}


# --------------------------------------------------------------------- leads


@app.post("/api/leads")
def capture_lead(lead: Lead) -> dict[str, Any]:
    """Score and route a consignment, trade, vehicle or property enquiry.

    The scoring itself lives in agents/gtm_leads.py so it can also be run over
    a backlog of enquiries offline.
    """
    from agents.gtm_leads import score_lead

    assessment = score_lead(lead.model_dump(), client=claude)
    db.record_lead(
        name=lead.name, email=lead.email, kind=lead.kind, note=lead.note, assessment=assessment
    )
    return {"status": "received", "assessment": assessment}


@app.post("/api/enquiries")
def capture_enquiry(enquiry: Enquiry) -> dict[str, str]:
    """Register interest in a private-treaty (property) lot. No payment, no
    cart — this just opens a conversation with the owner."""
    if enquiry.lot_id not in CATALOG_LOTS:
        raise HTTPException(400, f"Unknown lot: {enquiry.lot_id}")
    db.record_enquiry(
        lot_id=enquiry.lot_id, name=enquiry.name, email=enquiry.email, note=enquiry.note
    )
    return {"status": "received"}


# --------------------------------------------------------------------- admin


@app.get("/api/admin/lots", dependencies=[Depends(require_admin)])
def admin_lots() -> dict[str, Any]:
    return live_catalog()


@app.patch("/api/admin/lots/{lot_id}", dependencies=[Depends(require_admin)])
def admin_update_lot(lot_id: str, update: PriceUpdate) -> dict[str, Any]:
    if lot_id not in CATALOG_LOTS:
        raise HTTPException(404, f"Unknown lot: {lot_id}")
    if update.price_usd is not None or "price_usd" in update.model_fields_set:
        db.set_price(lot_id, update.price_usd)
    if update.sold is not None:
        db.set_sold(lot_id, update.sold)
    return live_lot(lot_id)


@app.get("/api/admin/orders", dependencies=[Depends(require_admin)])
def admin_orders() -> list[dict[str, Any]]:
    return db.list_orders()


@app.get("/api/admin/leads", dependencies=[Depends(require_admin)])
def admin_leads() -> list[dict[str, Any]]:
    return db.list_leads()


@app.get("/api/admin/enquiries", dependencies=[Depends(require_admin)])
def admin_enquiries() -> list[dict[str, Any]]:
    return db.list_enquiries()
