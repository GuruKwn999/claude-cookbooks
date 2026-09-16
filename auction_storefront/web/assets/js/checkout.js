/* checkout.js — payment method surface and order placement.
 *
 * Two modes, chosen at runtime:
 *
 *   LIVE  — window.HH_CONFIG.stripeKey is set and the reference server is
 *           reachable. A PaymentIntent is created server-side with
 *           automatic_payment_methods enabled, and Stripe's Payment Element is
 *           mounted here. One integration covers every card network, the
 *           wallets, the BNPL providers and the local bank rails below.
 *
 *   DEMO  — no key configured (or Stripe.js could not load, as in a sandboxed
 *           preview). The method list becomes the selector, and placing an
 *           order produces a receipt without money moving. Nothing here ever
 *           touches a card number: the browser must not see one.
 *
 * Availability is real and it is regional. A shopper in Brazil is not offered
 * Klarna and a shopper in Sweden is not offered Affirm, because those providers
 * do not operate there. Confirm the current list for your own account against
 * your provider's dashboard before launch — coverage changes.
 */

import { i18n } from "./i18n.js";

const EU_SEPA = ["AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK","CH","LI","NO","IS"];

/** id, label, note, the countries it settles in, and the group it sits under. */
const METHODS = [
  // ---- Cards: one entry, because the card rails are a single integration ----
  { id: "card", group: "cards", label: "Credit & debit card",
    note: "Every major network, plus the regional rails — Cartes Bancaires, Elo, Hipercard, Mada, Interac",
    regions: "global" },

  // ---- Wallets ----
  { id: "apple_pay", group: "wallets", label: "Apple Pay", note: "Safari and iOS, card on file", regions: "global" },
  { id: "google_pay", group: "wallets", label: "Google Pay", note: "Chrome and Android, card on file", regions: "global" },
  { id: "link", group: "wallets", label: "Link", note: "Saved card, one-tap", regions: "global" },
  { id: "paypal", group: "wallets", label: "PayPal", note: "Balance, bank or card", regions: "global" },
  { id: "amazon_pay", group: "wallets", label: "Amazon Pay", note: "Address and card from Amazon", regions: ["US","GB","DE","FR","IT","ES","JP","AT","BE","LU","NL","PT","IE","DK","SE","HU","CY"] },
  { id: "cashapp", group: "wallets", label: "Cash App Pay", note: "Cash App balance", regions: ["US"] },
  { id: "revolut_pay", group: "wallets", label: "Revolut Pay", note: "Revolut balance", regions: [...EU_SEPA, "GB"] },
  { id: "alipay", group: "wallets", label: "Alipay", note: "支付宝", regions: ["CN","HK","SG","MY","AU","US","GB","JP","KR"] },
  { id: "wechat_pay", group: "wallets", label: "WeChat Pay", note: "微信支付", regions: ["CN","HK","SG","MY","AU","US","GB","JP"] },
  { id: "grabpay", group: "wallets", label: "GrabPay", note: "Southeast Asia wallet", regions: ["SG","MY","PH","TH","ID","VN"] },
  { id: "paytm_upi", group: "wallets", label: "UPI", note: "Any UPI app — GPay, PhonePe, Paytm", regions: ["IN"] },

  // ---- Buy now, pay later ----
  { id: "klarna", group: "bnpl", label: "Klarna", note: "Pay in 4, pay in 30 days, or financing",
    regions: ["US","GB","DE","AT","CH","NL","BE","SE","NO","DK","FI","IE","FR","IT","ES","PL","PT","CZ","GR","RO","CA","AU","NZ"] },
  { id: "afterpay", group: "bnpl", label: "Afterpay / Clearpay", note: "4 payments, every 2 weeks",
    regions: ["US","CA","AU","NZ","GB","FR","IT","ES"] },
  { id: "affirm", group: "bnpl", label: "Affirm", note: "Pay in 4, or 3–36 month terms", regions: ["US","CA"] },
  { id: "zip", group: "bnpl", label: "Zip", note: "4 instalments, no interest", regions: ["US","AU","NZ","CA","GB","MX","AE","SA","ZA"] },
  { id: "sezzle", group: "bnpl", label: "Sezzle", note: "4 payments over 6 weeks", regions: ["US","CA","IN","BR"] },
  { id: "paypal_later", group: "bnpl", label: "PayPal Pay Later", note: "Pay in 4, or monthly",
    regions: ["US","GB","DE","FR","IT","ES","AU","CA","MX","JP"] },
  { id: "alma", group: "bnpl", label: "Alma", note: "2×, 3× or 4× without fees", regions: ["FR","BE","LU","DE","ES","IT","NL","PT","IE","AT"] },
  { id: "scalapay", group: "bnpl", label: "Scalapay", note: "3 instalments", regions: ["IT","FR","ES","PT","DE","AT","BE","NL","FI"] },
  { id: "atome", group: "bnpl", label: "Atome", note: "3 instalments", regions: ["SG","MY","ID","TH","PH","VN","HK","JP","TW"] },
  { id: "tabby", group: "bnpl", label: "Tabby", note: "4 payments, no interest", regions: ["AE","SA","KW","QA","BH","EG"] },
  { id: "tamara", group: "bnpl", label: "Tamara", note: "Split in 3 or 4", regions: ["SA","AE","KW","BH","OM","QA"] },
  { id: "mercado_credito", group: "bnpl", label: "Mercado Crédito", note: "Instalments in Latin America", regions: ["BR","AR","MX","CL","CO","PE","UY"] },
  { id: "billie", group: "bnpl", label: "Billie", note: "30-day invoice, business buyers", regions: ["DE","AT","NL","SE","FR","BE","CH","GB"] },

  // ---- Bank rails and cash networks ----
  { id: "sepa_debit", group: "bank", label: "SEPA Direct Debit", note: "IBAN, 2–5 business days", regions: EU_SEPA },
  { id: "ideal", group: "bank", label: "iDEAL", note: "Dutch bank transfer", regions: ["NL"] },
  { id: "bancontact", group: "bank", label: "Bancontact", note: "Belgian debit", regions: ["BE"] },
  { id: "blik", group: "bank", label: "BLIK", note: "6-digit code from your bank app", regions: ["PL"] },
  { id: "p24", group: "bank", label: "Przelewy24", note: "Polish bank transfer", regions: ["PL"] },
  { id: "eps", group: "bank", label: "EPS", note: "Austrian bank transfer", regions: ["AT"] },
  { id: "multibanco", group: "bank", label: "Multibanco", note: "Reference payment", regions: ["PT"] },
  { id: "twint", group: "bank", label: "TWINT", note: "Swiss mobile payment", regions: ["CH"] },
  { id: "swish", group: "bank", label: "Swish", note: "Swedish mobile payment", regions: ["SE"] },
  { id: "mobilepay", group: "bank", label: "MobilePay", note: "Nordic mobile payment", regions: ["DK","FI"] },
  { id: "vipps", group: "bank", label: "Vipps", note: "Norwegian mobile payment", regions: ["NO"] },
  { id: "ach", group: "bank", label: "Bank transfer (ACH)", note: "US account, 3–5 business days", regions: ["US"] },
  { id: "bacs", group: "bank", label: "Bacs Direct Debit", note: "UK account", regions: ["GB"] },
  { id: "pad", group: "bank", label: "Pre-authorised debit", note: "Canadian account", regions: ["CA"] },
  { id: "becs", group: "bank", label: "BECS Direct Debit", note: "Australian account", regions: ["AU"] },
  { id: "pix", group: "bank", label: "Pix", note: "Instant, 24/7", regions: ["BR"] },
  { id: "boleto", group: "bank", label: "Boleto Bancário", note: "Pay at a bank or lottery agent", regions: ["BR"] },
  { id: "oxxo", group: "bank", label: "OXXO", note: "Cash at any OXXO store", regions: ["MX"] },
  { id: "konbini", group: "bank", label: "Konbini", note: "Pay at a convenience store", regions: ["JP"] },
  { id: "paynow", group: "bank", label: "PayNow", note: "QR from your bank app", regions: ["SG"] },
  { id: "promptpay", group: "bank", label: "PromptPay", note: "Thai QR transfer", regions: ["TH"] },
  { id: "fpx", group: "bank", label: "FPX", note: "Malaysian online banking", regions: ["MY"] },
  { id: "netbanking", group: "bank", label: "Net banking", note: "Indian bank transfer", regions: ["IN"] },
  { id: "eft", group: "bank", label: "Instant EFT", note: "South African bank transfer", regions: ["ZA"] },
  { id: "mpesa", group: "bank", label: "M-Pesa", note: "Mobile money", regions: ["KE","TZ","GH","MZ"] },
];

const GROUP_LABEL = { cards: "cards", wallets: "wallets", bnpl: "bnpl", bank: null };

function availableIn(country) {
  return METHODS.filter((m) => m.regions === "global" || m.regions.includes(country));
}

const config = () => (typeof window !== "undefined" && window.HH_CONFIG) || {};

const instalment = (totalUsd) => i18n.price(totalUsd / 4);

/**
 * Method list for the payment step.
 * @param {{total:number}} t      order totals, in USD
 * @param {{country:string, method:string}} order  the shopper's choices so far
 */
export function renderPayment(t, order) {
  const country = order.country;
  const methods = availableIn(country);
  const live = Boolean(config().stripeKey);

  const groups = ["cards", "wallets", "bnpl", "bank"].map((g) => {
    const rows = methods.filter((m) => m.group === g);
    if (!rows.length) return "";
    const heading = GROUP_LABEL[g] ? i18n.t(GROUP_LABEL[g]) : "Bank transfer & cash";
    return `
      <div class="pay-group">
        <h4>${heading}</h4>
        ${rows.map((m) => payOption(m, t, order)).join("")}
      </div>`;
  }).join("");

  const bnplCount = methods.filter((m) => m.group === "bnpl").length;

  return `
    <div class="callout">
      <b>${methods.length} payment methods</b> settle in
      ${i18n.countries.find((c) => c.code === country)?.name || country},
      ${bnplCount} of them buy-now-pay-later.
      Change the country on the previous step to see a different list.
    </div>
    ${live ? `<div id="stripe-element" style="margin-bottom:18px"></div>` : ""}
    ${groups}
    <p class="secure-note" style="justify-content:flex-start">
      Card details are entered in the provider's own hosted field. This site
      never receives, stores or transmits a card number.
    </p>`;
}

function payOption(m, t, order) {
  const on = order.method === m.id;
  const brands = m.id === "card"
    ? ["VISA", "MC", "AMEX", "DISC", "JCB", "UPI", "DINERS"]
    : [];
  const extra = m.group === "bnpl"
    ? `<small>${m.note} · 4 × ${instalment(t.total)}</small>`
    : `<small>${m.note}</small>`;

  return `
    <label class="pay-opt${on ? " on" : ""}" data-method="${m.id}">
      <input type="radio" name="pay-method" value="${m.id}"${on ? " checked" : ""}>
      <span><b>${m.label}</b>${extra}</span>
      <span class="pay-brands">${brands.map((b) => `<span class="brand-chip">${b}</span>`).join("")}</span>
    </label>`;
}

/* ----------------------------------------------------------- live path */

/**
 * Ask the reference server for a PaymentIntent and mount Stripe's Payment
 * Element. Returns null in demo mode, so the caller can fall back quietly.
 */
export async function mountStripeElement({ totals: t, order, cart }) {
  const cfg = config();
  if (!cfg.stripeKey || typeof window.Stripe !== "function") return null;

  const response = await fetch(`${cfg.apiBase || ""}/api/payment-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(i18n.convert(t.total) * 100),
      currency: i18n.currency.toLowerCase(),
      country: order.country,
      locale: i18n.locale,
      email: order.email,
      lots: cart,
    }),
  });
  if (!response.ok) throw new Error(`payment-intent failed: ${response.status}`);
  const { clientSecret } = await response.json();

  const stripe = window.Stripe(cfg.stripeKey, { locale: i18n.locale });
  const elements = stripe.elements({
    clientSecret,
    appearance: { theme: document.documentElement.dataset.theme === "light" ? "stripe" : "night" },
  });
  elements.create("payment", { layout: "tabs" }).mount("#stripe-element");
  return { stripe, elements };
}

/* -------------------------------------------------------------- order */

function orderNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const tail = String(Math.floor(Math.random() * 9000) + 1000);
  return `HH-${stamp}-${tail}`;
}

/**
 * Confirm payment (live) or produce a receipt (demo).
 * @param {{totals:object, order:object, renderPanel:Function, onSettled:Function}} ctx
 */
export async function placeOrder({ totals: t, order: o, stripe: live, renderPanel, onSettled }) {
  const method = METHODS.find((m) => m.id === o.method) || METHODS[0];

  if (live) {
    const { stripe, elements } = live;
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}${window.location.pathname}?paid=1` },
    });
    if (error) {
      const box = document.querySelector("#stripe-element");
      if (box) box.insertAdjacentHTML("afterend",
        `<span class="field-error">${error.message}</span>`);
      return;
    }
    return;  // Stripe redirects on success
  }

  const ref = orderNumber();
  const eta = new Date(Date.now() + 1000 * 60 * 60 * 24 * 9);

  renderPanel({
    title: i18n.t("checkout"),
    body: `
      <div class="receipt">
        <span class="seal">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.6" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
        </span>
        <h2>Order placed</h2>
        <p class="mono">${ref}</p>
        <p>
          ${method.label} · ${i18n.price(t.total)}. A confirmation and the condition
          addendum go to <b>${o.email || "your email"}</b>. Estimated arrival
          ${i18n.date(eta.toISOString())}.
        </p>
        <p class="eyebrow" style="margin-top:14px">
          Demo mode — no payment was taken. Add your Stripe key to HH_CONFIG to go live.
        </p>
      </div>`,
    footer: `<button class="btn" data-jump="#catalogue">Back to the catalogue</button>`,
  });

  onSettled();
}

export { METHODS, availableIn };
