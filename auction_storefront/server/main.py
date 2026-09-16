"""Reference server for the Hammer & Hearth storefront.

Run it with:

    uv run uvicorn main:app --reload --port 8000

Four things live here and nowhere else, because none of them belong in a
browser: the secret keys, the authoritative price of an order, the Claude call
behind the curator, and the webhook that marks a lot sold.

The storefront works without this server — it falls back to a demo checkout and
an on-page curator. Point web/index.html's HH_CONFIG.apiBase at this process to
switch it on.
"""

from __future__ import annotations

import json
import os
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, Literal

import anthropic
import stripe
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

load_dotenv()

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

CATALOG = json.loads((Path(__file__).parent / "lots.json").read_text())
LOTS: dict[str, dict[str, Any]] = {lot["id"]: lot for lot in CATALOG["lots"]}

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
claude = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY, or an `ant auth login` profile

app = FastAPI(title="Hammer & Hearth")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("STOREFRONT_ORIGIN", "http://localhost:8000")],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


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
    kind: Literal["consign", "estate", "trade", "interior", "sell"] = "consign"
    note: str = ""


# ---------------------------------------------------------------- catalogue


@app.get("/api/lots")
def list_lots() -> dict[str, Any]:
    return CATALOG


@app.get("/api/rates")
def rates() -> dict[str, Any]:
    """Wire this to your FX provider. The storefront falls back to its own
    indicative table when the call fails, which is fine for browsing and wrong
    for settlement — so fail loudly rather than serving a stale rate."""
    url = os.getenv("FX_API_URL")
    if not url:
        raise HTTPException(501, "No FX_API_URL configured")
    raise HTTPException(501, "Connect your FX provider in rates()")


# ------------------------------------------------------------------ payments


def price_order(lines: list[CartLine]) -> Decimal:
    """The authoritative total, in USD, computed from the catalogue."""
    subtotal = Decimal("0")
    for line in lines:
        lot = LOTS.get(line.id)
        if lot is None:
            raise HTTPException(400, f"Unknown lot: {line.id}")
        if lot.get("sold"):
            raise HTTPException(409, f"Lot {lot['lot']} has already sold")
        if line.qty > lot.get("qty", 1):
            raise HTTPException(409, f"Only {lot.get('qty', 1)} of lot {lot['lot']} available")
        subtotal += Decimal(str(lot["priceUsd"])) * line.qty

    total = subtotal + SHIPPING_USD + (subtotal * TAX_RATE)
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def to_minor_units(amount: Decimal, currency: str) -> int:
    if currency.lower() in ZERO_DECIMAL:
        return int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@app.post("/api/payment-intent")
def payment_intent(req: IntentRequest) -> dict[str, str]:
    """One PaymentIntent covers every method the storefront offers.

    `automatic_payment_methods` lets Stripe decide which of the methods enabled
    on your account are valid for this amount, currency and country — that is
    what makes the card networks, the wallets, Klarna, Afterpay, Affirm, Zip and
    the local bank rails a single integration rather than twenty.
    """
    if not stripe.api_key:
        raise HTTPException(503, "STRIPE_SECRET_KEY is not set")
    if not req.lots:
        raise HTTPException(400, "Empty cart")

    usd_total = price_order(req.lots)

    # Convert with your own FX source before charging in a non-USD currency;
    # the storefront's indicative table is for display only.
    if req.currency.lower() != "usd":
        raise HTTPException(
            501,
            "Settlement currency conversion is not wired up. Either present "
            "prices in USD at checkout, or convert here against your FX feed.",
        )

    intent = stripe.PaymentIntent.create(
        amount=to_minor_units(usd_total, req.currency),
        currency=req.currency.lower(),
        automatic_payment_methods={"enabled": True},
        receipt_email=req.email or None,
        metadata={
            "lots": ",".join(f"{line.id}x{line.qty}" for line in req.lots),
            "country": req.country,
            "locale": req.locale,
        },
    )
    return {"clientSecret": intent.client_secret}


@app.post("/api/webhook")
async def stripe_webhook(request: Request) -> dict[str, str]:
    """Mark lots sold when payment actually settles.

    This matters more here than in most shops: every lot is a single object, so
    a lot that sells has to leave the catalogue before someone else buys it.
    Delayed methods — Klarna, SEPA, Boleto, OXXO — confirm minutes or days after
    checkout, which is exactly why this runs on the webhook and not on the
    browser's success redirect.
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

    if event["type"] == "payment_intent.succeeded":
        for part in event["data"]["object"]["metadata"].get("lots", "").split(","):
            if not part:
                continue
            lot_id = part.split("x")[0]
            if lot_id in LOTS:
                LOTS[lot_id]["sold"] = True  # replace with your inventory store

    return {"status": "ok"}


# ------------------------------------------------------------------ curator


CURATOR_SYSTEM = """You are the curator of Hammer & Hearth, a one-person shop \
that buys single lots at regional auctions and resells them online.

How you talk:
- Plain, specific, unhurried. You know these objects personally.
- Name faults before virtues. A shopper who learns about the hairline from you \
rather than from the parcel comes back.
- Never invent a lot, a price, a maker or a provenance. Everything you state \
about an object must come from search_lots.
- If nothing in the catalogue fits, say so and suggest the nearest category \
rather than stretching a match.
- Two or three short paragraphs at most.

Policies you may state:
- Shipping is tracked and insured worldwide. Over 20 kg is quoted as freight \
after checkout and nothing moves until the buyer approves the cost.
- Returns: 14 days for any reason on grades A through C. Grade D is "as found" \
and sold as a project, no returns on condition.
- Payment: all major card networks, Apple Pay, Google Pay, PayPal, Amazon Pay, \
and buy-now-pay-later where it settles — Klarna, Afterpay/Clearpay, Affirm, \
Zip, Sezzle, PayPal Pay Later, Alma, Scalapay, Atome, Tabby, Tamara. Which ones \
appear depends on the shopper's country.
- Import duty and VAT are the buyer's outside the US, and the customs form \
carries the real value.

Answer in the shopper's language."""


@anthropic.beta_tool
def search_lots(query: str, max_price_usd: float | None = None) -> str:
    """Search the shop's live catalogue of auction lots.

    Args:
        query: What the shopper is looking for — a category, material, period,
            room, or the kind of object. Free text.
        max_price_usd: Optional ceiling. Omit if the shopper gave no budget.
    """
    words = [w for w in query.lower().split() if len(w) > 2]
    scored: list[tuple[int, dict[str, Any]]] = []

    for lot in CATALOG["lots"]:
        if lot.get("sold"):
            continue
        if max_price_usd is not None and lot["priceUsd"] > max_price_usd:
            continue
        haystack = " ".join(str(lot[k]) for k in ("title", "cat", "era", "house", "note")).lower()
        score = sum(1 for w in words if w in haystack)
        if score:
            scored.append((score, lot))

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
                    "era": lot["era"],
                    "grade": lot["grade"],
                    "dims": lot["dims"],
                    "weight": lot["weight"],
                    "provenance": f"{lot['house']} · {lot['sale']}",
                    "condition_note": lot["note"],
                }
                for lot in hits
            ]
        }
    )


@anthropic.beta_tool
def quote_shipping(country_code: str, weight_kg: float) -> str:
    """Quote shipping for a lot to a destination.

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

    # Surface whatever Claude actually looked at, so the page can link the lots.
    lot_ids: list[str] = []
    for message in runner.messages:
        for block in message.get("content", []) if isinstance(message.get("content"), list) else []:
            if getattr(block, "type", None) == "tool_result" or (
                isinstance(block, dict) and block.get("type") == "tool_result"
            ):
                raw = block["content"] if isinstance(block, dict) else block.content
                text = raw if isinstance(raw, str) else json.dumps(raw, default=str)
                for lot_id in LOTS:
                    if f'"{lot_id}"' in text and lot_id not in lot_ids:
                        lot_ids.append(lot_id)

    return {"reply": reply, "lot_ids": lot_ids[:4]}


# --------------------------------------------------------------------- leads


@app.post("/api/leads")
def capture_lead(lead: Lead) -> dict[str, Any]:
    """Score and route a consignment or trade enquiry.

    The scoring itself lives in agents/gtm_leads.py so it can also be run over a
    backlog of enquiries offline.
    """
    import sys

    sys.path.append(str(Path(__file__).parent.parent))
    from agents.gtm_leads import score_lead

    assessment = score_lead(lead.model_dump(), client=claude)
    # Persist and notify here — a row in your CRM, an email to yourself.
    return {"status": "received", "assessment": assessment}
