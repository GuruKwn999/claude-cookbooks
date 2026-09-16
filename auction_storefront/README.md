# Hammer & Hearth — auction resale storefront

A complete storefront for reselling items bought at auction: catalogue, cart,
international checkout, a Claude-powered curator, and two agents that handle the
parts of the business that quietly stop happening once you get busy — triaging
enquiries and writing listing copy.

It runs with no keys and no server. Open `web/index.html` and everything works
except taking money. Add keys to turn on live payments and the model-backed
curator.

```
auction_storefront/
├── web/                     the storefront — static, deployable anywhere
│   ├── index.html
│   └── assets/
│       ├── css/storefront.css
│       └── js/
│           ├── i18n.js       32 UI languages, 44 currencies, 199 countries
│           ├── catalog.js    inventory + the line-art plates
│           ├── store.js      catalogue, cart, panels, checkout flow
│           ├── checkout.js   payment methods and order placement
│           └── assistant.js  the curator widget
├── server/                  FastAPI reference backend
│   ├── main.py              payments, webhook, curator, leads
│   ├── lots.json            generated — see scripts/export_catalog.mjs
│   ├── requirements.txt
│   └── .env.example
├── agents/
│   ├── gtm_leads.py         triage consignment and trade enquiries
│   └── merchandising.py     draft listing copy, in any language you sell in
└── scripts/export_catalog.mjs
```

## Run it

**The shop, as a shopper sees it** — no install:

```bash
cd auction_storefront/web && python3 -m http.server 8000
# http://localhost:8000
```

**With payments and the curator:**

```bash
cd auction_storefront/server
cp .env.example .env          # fill in your keys
uv pip install -r requirements.txt
uv run uvicorn main:app --reload --port 8000
```

Then set `HH_CONFIG` at the top of `web/index.html`:

```js
window.HH_CONFIG = {
  stripeKey: "pk_live_…",     // publishable key only
  paypalClientId: "…",
  apiBase: "http://localhost:8000",
};
```

## Payments

One Stripe integration covers every method the checkout offers. The server
creates a PaymentIntent with `automatic_payment_methods` enabled, and Stripe
returns the methods valid for that amount, currency and country.

- **Cards** — Visa, Mastercard, American Express, Discover, Diners Club, JCB,
  UnionPay, plus the regional rails: Cartes Bancaires, Elo, Hipercard, Mada,
  Interac.
- **Wallets** — Apple Pay, Google Pay, Link, PayPal, Amazon Pay, Cash App Pay,
  Revolut Pay, Alipay, WeChat Pay, GrabPay, UPI.
- **Buy now, pay later** — Klarna, Afterpay/Clearpay, Affirm, Zip, Sezzle,
  PayPal Pay Later, Alma, Scalapay, Atome, Tabby, Tamara, Mercado Crédito,
  Billie.
- **Bank rails and cash** — SEPA, iDEAL, Bancontact, BLIK, Przelewy24, EPS,
  Multibanco, TWINT, Swish, MobilePay, Vipps, ACH, Bacs, BECS, Pix, Boleto,
  OXXO, Konbini, PayNow, PromptPay, FPX, net banking, Instant EFT, M-Pesa.

**Availability is regional and the checkout reflects that.** A shopper in the UK
is offered 15 methods, 5 of them BNPL; a shopper in Brazil is offered 9, of which
2. The map lives in `METHODS` in `web/assets/js/checkout.js` — each entry names
the countries it settles in. Coverage changes, so check the current list for your
own account in your provider's dashboard before launch.

**Two things the code does deliberately:**

- The browser sends its cart, not its total. `price_order()` in `server/main.py`
  recomputes the price from the catalogue, so editing the amount in devtools buys
  you nothing.
- Lots are marked sold on the `payment_intent.succeeded` **webhook**, not on the
  browser's success redirect. Klarna, SEPA, Boleto and OXXO settle minutes to
  days after checkout, and every lot here is a single object that must leave the
  catalogue the moment it actually sells.

Before you take real orders you still need a merchant account with each provider
you want to offer, and BNPL providers underwrite separately — enabling Klarna in
Stripe is an application, not a checkbox.

## Languages and currencies

32 fully translated UI locales covering most of the world's readers, with
right-to-left layout for Arabic, Hebrew, Persian and Urdu. The language is
detected from the browser and remembered; prices format through `Intl` so each
locale gets its own separators, symbol placement and decimal rules.

Adding a language is one array. In `web/assets/js/i18n.js`, append an entry to
`STRINGS` with exactly `KEYS.length` values, add the endonym to `NAMES`, and add
the tag to `RTL` if it reads right to left.

**Two honest limits.** The translations are machine-assisted and cover the UI
chrome only — have a native speaker read each locale before you sell in it. And
lot descriptions stay in the language they were catalogued in; `agents/merchandising.py`
is how you translate those, one lot at a time, with a human reading the result.

The `RATES` table in `i18n.js` is indicative and will go stale. It prices the
window; it must not price the charge. `server/main.py` refuses to create a
PaymentIntent in a non-USD currency until you wire `rates()` to a real FX feed —
that refusal is deliberate, because a stale rate quietly eats your margin.

## The curator

The chat widget answers from the catalogue. With a server configured it calls
Claude with two tools — `search_lots` and `quote_shipping` — so it can only
describe lots that exist, and the API key never leaves the server. Without one it
answers from the catalogue in the page using the same retrieval, which means the
shop is useful before you have an API key.

The system prompt is the interesting part: it tells the curator to name faults
before virtues, and never to state a maker, date or provenance the record does
not support. That is the shop's actual sales strategy, written down.

## The agents

**`agents/gtm_leads.py`** — triages the contact form. An estate clearance against
a probate deadline and "got a 55 inch tv, how much" arrive through the same box
and are worth entirely different amounts of your afternoon. Scores each enquiry,
says what to ask next, and drafts a reply in your voice and the sender's language.

```bash
python agents/gtm_leads.py --demo        # four sample enquiries
python agents/gtm_leads.py leads.jsonl   # a real backlog
```

**`agents/merchandising.py`** — writes the listing copy that otherwise keeps a
lot in a box for a fortnight. Listing body, search description, social post, and
the one question the record cannot answer, so you know what to go and check.

```bash
python agents/merchandising.py --lots l1042 l1058 --lang en es ja
```

Both run on `claude-opus-5` with adaptive thinking and structured outputs, so the
result is a validated object rather than prose you have to parse.

## Editing the catalogue

`web/assets/js/catalog.js` is the source of truth — the browser reads it without
a fetch, which is what lets the shop run as a static file. After editing it:

```bash
node scripts/export_catalog.mjs   # regenerates server/lots.json
```

Commit both. When you outgrow a file, replace `LOTS` with a fetch from your
inventory service; nothing else in the app reads the array directly.

## Before you launch

- Read each locale with a native speaker.
- Confirm your live payment method list in your provider's dashboard.
- Wire `rates()` to a real FX feed, or price everything in one currency.
- Point the Stripe webhook at `/api/webhook` and set `STRIPE_WEBHOOK_SECRET`.
- Replace the in-memory `LOTS` dict in `server/main.py` with a real store — as
  written, "sold" is forgotten on restart.
- Photograph the lots. The line-art plates are placeholders, and nobody buys a
  £2,000 plan chest from a drawing of one.

---

© Pamela Logan 2020-2026: All rights reserved. Unauthorized use and/or
duplication of this material without express and written permission is strictly
prohibited. No part of this publication may be reproduced, distributed, or
transmitted in any form or by any means without the prior written permission of
the copyright holder.
