# Hammer & Hearth — auction resale storefront

A complete storefront for reselling items bought at auction — antiques,
jewellery, electronics, vehicles, tiny homes and property — across a
catalogue, cart, international checkout, a Claude-powered curator, an admin
API, and two agents that handle the parts of the business that quietly stop
happening once you get busy: triaging enquiries and writing listing copy.

It runs with no keys and no server. Open `web/index.html` and everything
works except taking money. Add keys to turn on live payments, real
persistence, and the model-backed curator.

```
auction_storefront/
├── web/                     the storefront — static, deployable anywhere
│   ├── index.html
│   ├── terms.html / privacy.html / returns.html
│   └── assets/
│       ├── css/storefront.css
│       └── js/
│           ├── i18n.js       32 UI languages, 44 currencies, 199 countries
│           ├── catalog.js    inventory, departments, fulfilment types
│           ├── store.js      catalogue, cart, panels, checkout flow
│           ├── checkout.js   payment methods and order placement
│           └── assistant.js  the curator widget
├── server/                  FastAPI reference backend
│   ├── main.py              payments, webhook, curator, leads, admin API
│   ├── db.py                SQLite: sold state, orders, leads, enquiries
│   ├── fx.py                live exchange rates, cached
│   ├── lots.json            generated — see scripts/export_catalog.mjs
│   ├── requirements.txt
│   └── .env.example
├── agents/
│   ├── gtm_leads.py         triage consignment, vehicle and property enquiries
│   └── merchandising.py     draft listing copy, fulfilment-aware, any language
└── scripts/export_catalog.mjs
```

## Run it

**The shop, as a shopper sees it** — no install:

```bash
cd auction_storefront/web && python3 -m http.server 8000
# http://localhost:8000
```

**With payments, persistence, and the curator:**

```bash
cd auction_storefront/server
cp .env.example .env          # fill in your keys
uv pip install -r requirements.txt
uv run uvicorn main:app --reload --port 8000
```

A SQLite file (`hammer_and_hearth.db`) is created next to `main.py` on first
run — that's your database; see **Persistence** below.

Then set `HH_CONFIG` at the top of `web/index.html`:

```js
window.HH_CONFIG = {
  stripeKey: "pk_live_…",     // publishable key only
  paypalClientId: "…",
  apiBase: "http://localhost:8000",
};
```

## Departments and fulfilment

The catalogue spans seven departments — Interiors & Antiques, Jewellery &
Watches, Art & Collectables, Electronics & Computing, Vehicles, Tiny Homes,
and Property & Land — and a lot's **fulfilment type** decides how it can be
bought, because a house and a teapot cannot share a checkout:

| Fulfilment | Departments | What happens |
|---|---|---|
| `ship` | most antiques, jewellery, small electronics | Normal cart line, courier, insured, charged at checkout |
| `freight` | furniture, large electronics, tiny homes | Cart line at full price; carriage quoted after checkout, nothing moves until approved |
| `collect` | vehicles | The cart line is a **deposit**, not the price — reserves the lot for inspection. Balance is due on collection. No sales tax is charged on the deposit (vehicle tax is collected at title transfer, not booking) |
| `enquiry` | property, land | **Never enters a cart.** Opens a "register interest" form that reaches the owner directly — no checkout exists for this lot |

Both the client (`store.js`'s `totals()`) and the server (`main.py`'s
`price_order()`) enforce this the same way, independently — the server never
trusts the browser's arithmetic. `price_order()` also refuses to let a
collection lot (vehicle) check out alongside a shipped or freighted one in
the same cart, and refuses an enquiry lot outright.

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

**Availability is regional and the checkout reflects that.** A shopper in the
UK is offered 15 methods, 5 of them BNPL; a shopper in Brazil is offered 9, of
which 2. The map lives in `METHODS` in `web/assets/js/checkout.js` — each
entry names the countries it settles in. Coverage changes, so check the
current list for your own account in your provider's dashboard before launch.

**Stripe Tax.** Set `STRIPE_TAX_ENABLED=true` in `.env` to have `main.py` call
the Stripe Tax API for real jurisdiction rates on shipped/freighted sales,
instead of the flat 8.25% placeholder. It falls back to the flat rate rather
than failing checkout if the Tax API call errors. Requires Stripe Tax enabled
on your account and origin addresses configured there. Never applied to a
vehicle deposit — see the fulfilment table above.

**Two things the code does deliberately:**

- The browser sends its cart, not its total. `price_order()` recomputes the
  price from the catalogue and the fulfilment rules above, so editing the
  amount in devtools buys you nothing.
- Lots are marked sold on the `payment_intent.succeeded` **webhook**, not on
  the browser's success redirect — and only for an outright sale. A vehicle
  deposit marks nothing sold; a human still completes that sale after
  inspection. Klarna, SEPA, Boleto and OXXO settle minutes to days after
  checkout, which is exactly why this can't run on the redirect.

Before you take real orders you still need a merchant account with each
provider you want to offer, and BNPL providers underwrite separately —
enabling Klarna in Stripe is an application, not a checkbox.

## Persistence

`server/db.py` is a small SQLite layer — one file, no server process to run.
It holds:

- **Sold state and price overrides** per lot (`lot_state`) — survives a
  restart, unlike the in-memory dict this replaced.
- **Orders** (`orders`) — every PaymentIntent created and its outcome.
- **Leads** and **enquiries** — every consignment/trade message and every
  property "register interest" submission, with the triage agent's
  assessment stored alongside the lead.

One seller, one process is what SQLite is for. If you outgrow a single file —
multiple app servers, real write concurrency — swap `db.py` for Postgres;
nothing outside that module needs to change, since callers only see its
functions, never the schema.

## Live exchange rates

`server/fx.py` calls [Frankfurter](https://frankfurter.dev) (republishes ECB
reference rates, no API key) and caches the result for an hour. This is
distinct from the indicative `RATES` table baked into `web/assets/js/i18n.js`,
which prices the *page* so the shop works with no server at all — `fx.py` is
what's allowed to price a *charge*. `/api/payment-intent` refuses to settle in
a non-USD currency if the live feed is unreachable, rather than silently
charging a stale or fabricated rate.

## Admin API

Set `ADMIN_TOKEN` in `.env` and every `/api/admin/*` route requires
`Authorization: Bearer <token>`:

| Route | Does |
|---|---|
| `GET /api/admin/lots` | Full catalogue with live sold state and price overrides |
| `PATCH /api/admin/lots/{id}` | `{"price_usd": 1200}` or `{"sold": true}` — updates SQLite, not the JSON file |
| `GET /api/admin/orders` | Every order, newest first |
| `GET /api/admin/leads` | Every consignment/trade lead with its triage assessment |
| `GET /api/admin/enquiries` | Every property "register interest" submission |

There's no UI in front of this yet — it's a plain JSON API you can drive with
`curl` or wire a dashboard to. `web/assets/js/catalog.js` stays the source of
truth for a lot's *content* (title, condition, specs); the admin API only
overrides what changes after listing: price and sold state.

## Languages and currencies

32 fully translated UI locales covering most of the world's readers, with
right-to-left layout for Arabic, Hebrew, Persian and Urdu. The language is
detected from the browser and remembered; prices format through `Intl` so
each locale gets its own separators, symbol placement and decimal rules.

Adding a language is one array. In `web/assets/js/i18n.js`, append an entry to
`STRINGS` with exactly `KEYS.length` values, add the endonym to `NAMES`, and
add the tag to `RTL` if it reads right to left.

**Two honest limits.** The translations are machine-assisted and cover the UI
chrome only — have a native speaker read each locale before you sell in it.
And lot descriptions stay in the language they were catalogued in;
`agents/merchandising.py` is how you translate those, one lot at a time, with
a human reading the result.

## The curator

The chat widget answers from the catalogue. With a server configured it calls
Claude with two tools — `search_lots` and `quote_shipping` — so it can only
describe lots that exist, and the API key never leaves the server. Without one
it answers from the catalogue in the page using the same retrieval, which
means the shop is useful before you have an API key.

The system prompt is fulfilment-aware: it tells the curator a vehicle deposit
reserves a car for inspection rather than buying it outright, and that
property is never checked out — and, department aside, to name faults before
virtues and never state a maker, date or provenance the record doesn't
support. That's the shop's actual sales strategy, written down.

## The agents

**`agents/gtm_leads.py`** — triages the contact form across all seven
departments. An estate clearance against a probate deadline, a 1968 MGB with
a clean title, and "got a 55 inch tv, how much" arrive through the same box
and are worth entirely different amounts of your afternoon. Scores each
enquiry, says what to ask next, and drafts a reply in your voice and the
sender's language.

```bash
python agents/gtm_leads.py --demo        # six sample enquiries, all departments
python agents/gtm_leads.py leads.jsonl   # a real backlog
```

**`agents/merchandising.py`** — writes the listing copy that otherwise keeps
a lot in a box for a fortnight. Fulfilment-aware: a vehicle listing talks
about the deposit and the balance, never "buy now"; a property listing
invites the reader to register interest, never to purchase. Listing body,
search description, social post, and the one question the record can't
answer, so you know what to go and check.

```bash
python agents/merchandising.py --lots l1042 l3001 l4001 --lang en es ja
```

Both run on `claude-opus-5` with adaptive thinking and structured outputs, so
the result is a validated object rather than prose you have to parse.

## Editing the catalogue

`web/assets/js/catalog.js` is the source of truth — the browser reads it
without a fetch, which is what lets the shop run as a static file. Every lot
needs a `fulfilment` value (`ship` / `freight` / `collect` / `depositUsd` /
`enquiry`) and a `cat` that maps to a department in `DEPT_OF`. After editing:

```bash
node scripts/export_catalog.mjs   # regenerates server/lots.json
```

Commit both. When you outgrow a file, replace `LOTS` with a fetch from your
inventory service; nothing else in the app reads the array directly. The
server's `live_catalog()` already merges in whatever the admin API has
overridden, so a fetch-backed catalogue and the admin API compose cleanly.

## Before you launch

- Read each locale with a native speaker.
- Confirm your live payment method list in your provider's dashboard, and
  apply for BNPL and Stripe Tax separately — neither is a checkbox.
- Set `ADMIN_TOKEN` to something real, and put the admin routes behind your
  own auth if you build a UI in front of them — a bearer token in an env var
  is adequate for one operator, not for a team.
- Point the Stripe webhook at `/api/webhook` and set `STRIPE_WEBHOOK_SECRET`.
- Back up `hammer_and_hearth.db`, or move to Postgres if you need more than
  one app server.
- Photograph the lots. The line-art plates are placeholders, and nobody buys
  a $28,000 Mercedes — or a $2,450 plan chest — from a drawing of one.
- Have a lawyer review `terms.html`, `privacy.html` and `returns.html` — the
  policies described there (vehicle deposits, property enquiries, the 14-day
  return window) match what the code actually does, but the wording is not
  legal advice.

---

© Pamela Logan 2020-2026: All rights reserved. Unauthorized use and/or
duplication of this material without express and written permission is
strictly prohibited. No part of this publication may be reproduced,
distributed, or transmitted in any form or by any means without the prior
written permission of the copyright holder.
