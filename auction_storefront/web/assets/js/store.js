/* store.js — catalogue rendering, cart state, and the slide-over panel that
 * carries the lot detail, the cart, checkout and the enquiry flow.
 *
 * Fulfilment drives everything downstream of "add to cart":
 *   ship / freight — a normal cart line, priced at the full hammer price
 *   collect        — the cart line is the DEPOSIT, not the price; the balance
 *                     is due on collection and stated everywhere so nobody is
 *                     surprised by it
 *   enquiry        — never enters a cart. Opens a private-treaty enquiry form
 *                     instead, because a house does not check out like a teapot
 */

import { i18n } from "./i18n.js";
import { LOTS, DEPARTMENTS, CATEGORIES, DEPT_OF, GRADES, FULFILMENT, glyph } from "./catalog.js";
import { renderPayment, placeOrder, mountStripeElement } from "./checkout.js";
import { mountAssistant, openAssistant } from "./assistant.js";

const CART_KEY = "hh.cart";
const SHIPPING_USD = 28;
const TAX_RATE = 0.0825;

export const state = {
  query: "",
  dept: "all",
  cat: "all",
  grade: "all",
  sort: "new",
  cart: loadCart(),
  order: { email: "", name: "", street: "", city: "", postal: "", country: "US", method: "card" },
};

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => LOTS.some((x) => x.id === l.id)) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  } catch {
    /* ignore */
  }
}

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gradeOf = (code) => GRADES.find((g) => g.code === code) || GRADES[2];

/** What a cart line actually charges now — full price, or a deposit. */
function chargeNow(lot) {
  return lot.fulfilment === "collect" ? lot.depositUsd : lot.priceUsd;
}

/* ------------------------------------------------------------------ cart */

export function cartLines() {
  return state.cart
    .map((line) => ({ ...line, lot: LOTS.find((l) => l.id === line.id) }))
    .filter((line) => line.lot);
}

export function totals() {
  const lines = cartLines();
  const subtotal = lines.reduce((sum, l) => sum + chargeNow(l.lot) * l.qty, 0);
  const balanceDue = lines.reduce(
    (sum, l) => sum + (l.lot.fulfilment === "collect" ? (l.lot.priceUsd - l.lot.depositUsd) * l.qty : 0),
    0
  );
  // A flat shipping line only makes sense for small parcels. Freight is
  // quoted after checkout; collection has no shipping leg at all.
  const shippable = lines.some((l) => l.lot.fulfilment === "ship");
  const hasFreight = lines.some((l) => l.lot.fulfilment === "freight");
  const shipping = shippable ? SHIPPING_USD : 0;
  // Vehicle sales tax is collected at title transfer against the full price,
  // not by this checkout against a refundable booking deposit — so a
  // collection-lot deposit is excluded from what's taxed here.
  const taxable = lines.reduce(
    (sum, l) => sum + (l.lot.fulfilment === "collect" ? 0 : chargeNow(l.lot) * l.qty),
    0
  );
  const tax = taxable * TAX_RATE;
  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    balanceDue,
    hasFreight,
  };
}

export function cartCount() {
  return state.cart.reduce((n, l) => n + l.qty, 0);
}

function addToCart(id) {
  const line = state.cart.find((l) => l.id === id);
  if (line) line.qty += 1;
  else state.cart.push({ id, qty: 1 });
  saveCart();
  paintCount();
}

function setQty(id, qty) {
  const line = state.cart.find((l) => l.id === id);
  if (!line) return;
  if (qty <= 0) state.cart = state.cart.filter((l) => l.id !== id);
  else line.qty = qty;
  saveCart();
  paintCount();
  openCart();
}

export function clearCart() {
  state.cart = [];
  saveCart();
  paintCount();
}

function paintCount() {
  const el = $("#cart-count");
  const n = cartCount();
  el.textContent = n;
  el.hidden = n === 0;
}

/* ------------------------------------------------------- catalogue view */

function visibleLots() {
  const q = state.query.trim().toLowerCase();
  const rows = LOTS.filter((lot) => {
    if (state.dept !== "all" && DEPT_OF[lot.cat] !== state.dept) return false;
    if (state.cat !== "all" && lot.cat !== state.cat) return false;
    if (state.grade !== "all" && !lot.grade.startsWith(state.grade)) return false;
    if (!q) return true;
    return [lot.title, lot.era, lot.house, lot.note, lot.lot].join(" ").toLowerCase().includes(q);
  });

  const by = {
    new: (a, b) => b.listed.localeCompare(a.listed),
    low: (a, b) => a.priceUsd - b.priceUsd,
    high: (a, b) => b.priceUsd - a.priceUsd,
  }[state.sort];
  return rows.sort(by);
}

function fulfilmentBadge(lot) {
  const f = FULFILMENT[lot.fulfilment];
  return `<span class="fulfil-tag fulfil-${lot.fulfilment}">${esc(f.short)}</span>`;
}

/** Percent saved against a verified part's current factory price. */
function savingsPct(lot) {
  return lot.newPriceUsd ? Math.round((1 - lot.priceUsd / lot.newPriceUsd) * 100) : null;
}

function lotCard(lot, index) {
  const g = gradeOf(lot.grade);
  const save = savingsPct(lot);
  const belowEstimate = lot.priceUsd < lot.estHigh;
  const priceLine =
    lot.fulfilment === "collect"
      ? `<span class="lot-price">${i18n.price(lot.depositUsd)}<i>deposit</i></span>`
      : lot.fulfilment === "enquiry"
        ? `<span class="lot-price lot-price-poa">${i18n.t("priceOnEnquiry")}</span>`
        : save
          ? `<span class="lot-price">${i18n.price(lot.priceUsd)}<i>vs ${i18n.price(lot.newPriceUsd)} new</i></span>`
          : `<span class="lot-price">${i18n.price(lot.priceUsd)}</span>`;

  return `
    <button class="lot plate-${lot.cat}" type="button" data-lot="${lot.id}" style="--stagger:${index % 12}">
      <div class="plate plate-${lot.cat}">
        <span class="plate-sheen"></span>
        ${glyph(lot.cat)}
        <span class="plate-tag">${i18n.t("lotNo")} ${lot.lot}</span>
        ${fulfilmentBadge(lot)}
        ${
          save
            ? `<span class="plate-flag plate-flag-verified">Save ${save}%</span>`
            : belowEstimate && lot.fulfilment !== "enquiry"
              ? `<span class="plate-flag">Under estimate</span>`
              : ""
        }
      </div>
      <div class="lot-body">
        <span class="lot-title">${esc(lot.title)}</span>
        <span class="lot-meta">
          ${lot.verified ? `<span class="verified-chip" title="Serial-verified against OEM records">${checkIcon()} Verified OEM</span> · ` : ""}${esc(lot.era)} · ${esc(lot.house)}
        </span>
        <span class="lot-foot">
          ${priceLine}
          <span class="grade ${g.cls}" title="${esc(g.label)}">${g.code}</span>
        </span>
      </div>
    </button>`;
}

function checkIcon() {
  return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;
}

export function renderCatalogue() {
  const rows = visibleLots();
  $("#lot-grid").innerHTML = rows.length
    ? rows.map(lotCard).join("")
    : `<p class="empty-state">No lots match that. Try widening the department or clearing the search.</p>`;
  $("#results-count").textContent = `${rows.length} ${i18n.t("results")}`;
}

/* ------------------------------------------------------------- panels */

let lastFocus = null;

export function openPanel({ title, body, footer, wide }) {
  lastFocus = document.activeElement;
  $("#panel-title").textContent = title;
  $("#panel-body").innerHTML = body;
  $("#panel-foot").innerHTML = footer || "";
  $("#panel-foot").hidden = !footer;
  $("#panel").classList.toggle("panel-wide", Boolean(wide));
  $("#scrim").hidden = false;
  $("#panel").hidden = false;
  $("#panel-body").scrollTop = 0;
  document.body.style.overflow = "hidden";
  $("#panel-close").focus();
}

export function closePanel() {
  $("#scrim").hidden = true;
  $("#panel").hidden = true;
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

/** The extra spec table a vehicle, property or tiny-home lot carries. */
function specRows(lot) {
  if (!lot.specs) return "";
  return lot.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
}

function fulfilmentNote(lot) {
  if (lot.verified) {
    return `Genuine part, not a reproduction — the serial number is verified against the manufacturer's own records before this lot goes live. ${
      lot.fulfilment === "freight" ? "Too large for parcel courier; palletised freight is quoted after checkout." : "Ships tracked and insured."
    }`;
  }
  if (lot.fulfilment === "ship") return null;
  if (lot.fulfilment === "freight")
    return "Too large for parcel courier. Palletised freight is quoted after checkout — nothing moves until you approve the cost.";
  if (lot.fulfilment === "collect")
    return `A ${i18n.price(lot.depositUsd)} deposit reserves it. The balance, ${i18n.price(lot.priceUsd - lot.depositUsd)}, is due on collection or on the day of inspection — whichever you arrange.`;
  return "Sold by private treaty, not by cart. Register your interest and the details go straight to the owner.";
}

function openLot(id) {
  const lot = LOTS.find((l) => l.id === id);
  if (!lot) return;
  const g = gradeOf(lot.grade);
  const inCart = state.cart.some((l) => l.id === id);
  const note = fulfilmentNote(lot);

  openPanel({
    title: `${i18n.t("lotNo")} ${lot.lot}`,
    wide: Boolean(lot.specs),
    body: `
      <div class="plate detail-plate plate-${lot.cat}">
        <span class="plate-sheen"></span>
        ${glyph(lot.cat)}
        <span class="plate-tag">${esc(lot.era)}</span>
        <span class="plate-flag">${esc(g.label)}</span>
      </div>
      <h2 class="detail-title">${esc(lot.title)}</h2>
      <p class="detail-lede">${esc(lot.note)}</p>
      ${note ? `<div class="callout">${note}</div>` : ""}
      <table class="spec-table">
        <tbody>
          ${lot.verified ? `<tr><th>OEM part</th><td>${esc(lot.oem)}</td></tr>` : ""}
          ${lot.verified ? `<tr><th>Serial</th><td>${esc(lot.serial)}</td></tr>` : ""}
          ${lot.newPriceUsd ? `<tr><th>Factory new price</th><td>${i18n.price(lot.newPriceUsd)} — this lot saves ${savingsPct(lot)}%</td></tr>` : ""}
          ${lot.fulfilment === "enquiry" ? "" : `<tr><th>${i18n.t("estimate")}</th><td>${i18n.price(lot.estLow)} – ${i18n.price(lot.estHigh)}</td></tr>`}
          <tr><th>${i18n.t("provenance")}</th><td>${esc(lot.house)} · ${esc(lot.sale)}</td></tr>
          <tr><th>${i18n.t("condition")}</th><td>${g.code} · ${esc(g.label)}</td></tr>
          <tr><th>${i18n.t("dimensions")}</th><td>${esc(lot.dims)}</td></tr>
          ${lot.weight ? `<tr><th>Weight</th><td>${esc(lot.weight)}</td></tr>` : ""}
          ${specRows(lot)}
          <tr><th>Listed</th><td>${i18n.date(lot.listed)}</td></tr>
          <tr><th>Availability</th><td>One only — not restockable</td></tr>
        </tbody>
      </table>`,
    footer:
      lot.fulfilment === "enquiry"
        ? `<button class="btn btn-primary" data-enquire="${lot.id}">${i18n.t("registerInterest")}</button>
           <button class="btn" data-ask="${lot.id}">${i18n.t("assistantTitle")}</button>`
        : `<button class="btn btn-primary" data-add="${lot.id}">
             ${inCart ? i18n.t("added") : i18n.t("addToCart")} · ${i18n.price(chargeNow(lot))}${lot.fulfilment === "collect" ? ` <i>deposit</i>` : ""}
           </button>
           <button class="btn" data-ask="${lot.id}">${i18n.t("assistantTitle")}</button>`,
  });
}

function openEnquiry(id) {
  const lot = LOTS.find((l) => l.id === id);
  if (!lot) return;

  openPanel({
    title: i18n.t("registerInterest"),
    body: `
      <p class="detail-lede">${esc(lot.title)} — ${i18n.price(lot.priceUsd)}. This does not book a viewing
        or hold the lot; it opens a conversation with the owner, who replies personally.</p>
      <div class="field">
        <label for="enq-name">${i18n.t("fullName")}</label>
        <input id="enq-name" autocomplete="name">
      </div>
      <div class="field">
        <label for="enq-email">${i18n.t("email")}</label>
        <input id="enq-email" type="email" autocomplete="email">
      </div>
      <div class="field">
        <label for="enq-note">What would you like to know?</label>
        <input id="enq-note" placeholder="A viewing time, the legal pack, financing…">
      </div>
      <span class="field-error" id="err-enquiry" hidden>Add your name and email so the owner can reply.</span>`,
    footer: `<button class="btn btn-primary" data-send-enquiry="${lot.id}">${i18n.t("continue")}</button>`,
  });
}

function submitEnquiry(id) {
  const name = $("#enq-name").value.trim();
  const email = $("#enq-email").value.trim();
  const ok = name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  $("#err-enquiry").hidden = ok;
  if (!ok) return;

  const lot = LOTS.find((l) => l.id === id);
  openPanel({
    title: i18n.t("registerInterest"),
    body: `
      <div class="receipt">
        <span class="seal"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.6" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span>
        <h2>Sent</h2>
        <p>The owner has your enquiry about lot ${lot.lot} and will reply to <b>${esc(email)}</b>
          within two business days.</p>
      </div>`,
    footer: `<button class="btn" data-jump="#catalogue">Back to the catalogue</button>`,
  });
}

export function openCart() {
  const lines = cartLines();
  const t = totals();

  const body = lines.length
    ? lines
        .map(({ lot, qty }) => {
          const isDeposit = lot.fulfilment === "collect";
          return `
        <div class="cart-line">
          <div class="plate plate-${lot.cat}"><span class="plate-sheen"></span>${glyph(lot.cat)}</div>
          <div>
            <h4>${esc(lot.title)}</h4>
            <p class="lot-meta">${i18n.t("lotNo")} ${lot.lot} · ${fulfilmentBadge(lot)}</p>
          </div>
          <div class="cart-line-end">
            <span class="lot-price">${i18n.price(chargeNow(lot) * qty)}${isDeposit ? ` <i>deposit</i>` : ""}</span>
            <span class="qty">
              <button type="button" data-qty="${lot.id}" data-to="${qty - 1}" aria-label="Reduce quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-qty="${lot.id}" data-to="${qty + 1}" aria-label="Increase quantity">+</button>
            </span>
            <button class="link-btn" data-qty="${lot.id}" data-to="0">${i18n.t("remove")}</button>
          </div>
        </div>`;
        })
        .join("") +
      `<div class="totals" style="margin-top:20px">
          <div><span>${i18n.t("subtotal")}</span><span>${i18n.price(t.subtotal)}</span></div>
          ${t.shipping ? `<div><span>${i18n.t("shipping")}</span><span>${i18n.price(t.shipping)}</span></div>` : ""}
          ${t.hasFreight ? `<div><span>Freight</span><span>Quoted after checkout</span></div>` : ""}
          <div><span>${i18n.t("tax")}</span><span>${i18n.price(t.tax)}</span></div>
          <div class="grand"><span>${i18n.t("total")}</span><b>${i18n.price(t.total)}</b></div>
          ${t.balanceDue ? `<div class="balance-note"><span>Balance due on collection</span><span>${i18n.price(t.balanceDue)}</span></div>` : ""}
         </div>`
    : `<p class="empty-state">${i18n.t("cartEmpty")}</p>`;

  openPanel({
    title: i18n.t("cart"),
    body,
    footer: lines.length
      ? `<button class="btn btn-primary" data-checkout="1">${i18n.t("checkout")} · ${i18n.price(t.total)}</button>`
      : "",
  });
}

/* ----------------------------------------------------------- checkout */

const STEPS = ["contactStep", "addressStep", "paymentStep"];

/** Set once Stripe's Payment Element is mounted; null means demo checkout. */
let liveStripe = null;

export function openCheckout(step = 0) {
  const t = totals();
  const o = state.order;

  const tabs = `<div class="steps">${STEPS.map(
    (k, i) =>
      `<button class="step" type="button" data-step="${i}" ${i === step ? 'aria-current="step"' : ""}>${i + 1}. ${i18n.t(k)}</button>`
  ).join("")}</div>`;

  let form;
  if (step === 0) {
    form = `
      <div class="callout">
        <b>One of each.</b> Everything here is a single auction lot, so a cart holds
        it for 20 minutes. We email a condition addendum before anything ships.
        ${t.balanceDue ? `A collection-lot deposit is charged now; the balance is due when you collect.` : ""}
      </div>
      <div class="field">
        <label for="co-email">${i18n.t("email")}</label>
        <input id="co-email" type="email" autocomplete="email" inputmode="email"
               value="${esc(o.email)}" placeholder="you@example.com">
        <span class="field-error" id="err-email" hidden>Enter an email we can send the receipt to.</span>
      </div>`;
  } else if (step === 1) {
    form = `
      <div class="field">
        <label for="co-name">${i18n.t("fullName")}</label>
        <input id="co-name" autocomplete="name" value="${esc(o.name)}">
      </div>
      <div class="field">
        <label for="co-street">${i18n.t("street")}</label>
        <input id="co-street" autocomplete="street-address" value="${esc(o.street)}">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="co-city">${i18n.t("city")}</label>
          <input id="co-city" autocomplete="address-level2" value="${esc(o.city)}">
        </div>
        <div class="field">
          <label for="co-postal">${i18n.t("postal")}</label>
          <input id="co-postal" autocomplete="postal-code" value="${esc(o.postal)}">
        </div>
      </div>
      <div class="field">
        <label for="co-country">${i18n.t("country")}</label>
        <select id="co-country" autocomplete="country">
          ${i18n.countries
            .map((c) => `<option value="${c.code}"${c.code === o.country ? " selected" : ""}>${esc(c.name)}</option>`)
            .join("")}
        </select>
      </div>
      <span class="field-error" id="err-address" hidden>Fill in the name, street, city and postal code.</span>`;
  } else {
    form = renderPayment(t, state.order);
  }

  openPanel({
    title: i18n.t("checkout"),
    body: `${tabs}${form}
      <div class="totals" style="margin-top:24px">
        <p class="eyebrow" style="margin-bottom:8px">${i18n.t("summary")}</p>
        <div><span>${i18n.t("subtotal")}</span><span>${i18n.price(t.subtotal)}</span></div>
        ${t.shipping ? `<div><span>${i18n.t("shipping")}</span><span>${i18n.price(t.shipping)}</span></div>` : ""}
        <div><span>${i18n.t("tax")}</span><span>${i18n.price(t.tax)}</span></div>
        <div class="grand"><span>${i18n.t("total")}</span><b>${i18n.price(t.total)}</b></div>
      </div>`,
    footer:
      step === 2
        ? `<button class="btn btn-primary" data-pay="1">${i18n.t("payNow")} · ${i18n.price(t.total)}</button>
         <p class="secure-note">${lockIcon()} ${i18n.t("secured")} · PCI DSS SAQ-A</p>`
        : `<button class="btn btn-primary" data-step-next="${step}">${i18n.t("continue")}</button>`,
  });

  if (step === 2) {
    mountStripeElement({ totals: t, order: state.order, cart: state.cart })
      .then((handle) => {
        liveStripe = handle;
      })
      .catch((err) => {
        liveStripe = null;
        console.warn("Falling back to demo checkout:", err.message);
      });
  }
}

function lockIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
}

function commitStep(step) {
  const o = state.order;
  if (step === 0) {
    o.email = $("#co-email").value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email);
    $("#err-email").hidden = ok;
    if (!ok) return;
  }
  if (step === 1) {
    o.name = $("#co-name").value.trim();
    o.street = $("#co-street").value.trim();
    o.city = $("#co-city").value.trim();
    o.postal = $("#co-postal").value.trim();
    o.country = $("#co-country").value;
    const ok = o.name && o.street && o.city && o.postal;
    $("#err-address").hidden = !!ok;
    if (!ok) return;
  }
  openCheckout(step + 1);
}

/* --------------------------------------------------------------- wiring */

function fillControls() {
  const langSel = $("#lang-select");
  langSel.innerHTML = i18n.languages
    .map((l) => `<option value="${l.code}"${l.code === i18n.locale ? " selected" : ""}>${esc(l.name)}</option>`)
    .join("");

  const curSel = $("#currency-select");
  curSel.innerHTML = i18n.currencies
    .map((c) => `<option value="${c}"${c === i18n.currency ? " selected" : ""}>${c}</option>`)
    .join("");

  $("#dept-list").innerHTML = [{ id: "all", label: i18n.t("all") }, ...DEPARTMENTS]
    .map((d) => {
      const n = d.id === "all" ? LOTS.length : LOTS.filter((l) => DEPT_OF[l.cat] === d.id).length;
      return `<button class="rail-opt" type="button" data-dept="${d.id}"
        aria-pressed="${state.dept === d.id}">${esc(d.label)}<em>${n}</em></button>`;
    })
    .join("");

  const catsInDept = state.dept === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.dept === state.dept);
  $("#cat-list").innerHTML = [{ id: "all", label: i18n.t("all") }, ...catsInDept]
    .map((c) => {
      const n = c.id === "all" ? catsInDept.reduce((s, x) => s + LOTS.filter((l) => l.cat === x.id).length, 0) : LOTS.filter((l) => l.cat === c.id).length;
      return `<button class="rail-opt" type="button" data-cat="${c.id}"
        aria-pressed="${state.cat === c.id}">${esc(c.label)}<em>${n}</em></button>`;
    })
    .join("");

  $("#grade-list").innerHTML = [{ code: "all", label: i18n.t("all") }, ...GRADES]
    .map(
      (g) =>
        `<button class="rail-opt" type="button" data-grade="${g.code}"
      aria-pressed="${state.grade === g.code}">${esc(g.label)}</button>`
    )
    .join("");

  $("#sort-select").innerHTML = [
    ["new", "sortNew"],
    ["low", "sortLow"],
    ["high", "sortHigh"],
  ]
    .map(([v, k]) => `<option value="${v}"${state.sort === v ? " selected" : ""}>${i18n.t(k)}</option>`)
    .join("");
}

/** Re-label every element carrying data-t, then repaint the dynamic regions. */
export function applyTranslations() {
  document.querySelectorAll("[data-t]").forEach((el) => {
    el.textContent = i18n.t(el.dataset.t);
  });
  document.querySelectorAll("[data-t-ph]").forEach((el) => {
    el.placeholder = i18n.t(el.dataset.tPh);
  });
  fillControls();
  renderCatalogue();
  paintCount();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("hh.theme", theme);
  } catch {
    /* ignore */
  }
  $("#theme-toggle").textContent = theme === "dark" ? "Light" : "Dark";
}

/** Reveal-on-scroll for elements marked [data-reveal]. Respects reduced motion. */
function mountScrollReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((el) => io.observe(el));
}

/** A gilt glow that tracks the pointer across the hero, cheap and GPU-friendly. */
function mountHeroGlow() {
  const hero = document.querySelector(".hero");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    hero.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  });
}

export function boot() {
  i18n.init();

  let theme = "dark";
  try {
    theme = localStorage.getItem("hh.theme") || "dark";
  } catch {
    /* ignore */
  }
  applyTheme(theme);

  applyTranslations();
  mountAssistant();
  mountScrollReveal();
  mountHeroGlow();

  $("#lang-select").addEventListener("change", (e) => {
    i18n.setLocale(e.target.value);
    applyTranslations();
    closePanel();
  });

  $("#currency-select").addEventListener("change", (e) => {
    i18n.setCurrency(e.target.value);
    applyTranslations();
  });

  $("#theme-toggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  $("#search-input").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderCatalogue();
  });

  $("#sort-select").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderCatalogue();
  });

  $("#cart-button").addEventListener("click", openCart);
  $("#panel-close").addEventListener("click", closePanel);
  $("#scrim").addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#panel").hidden) closePanel();
  });

  document.addEventListener("click", (e) => {
    const hit = (attr) => e.target.closest(`[${attr}]`);

    const dept = hit("data-dept");
    if (dept) {
      state.dept = dept.dataset.dept;
      state.cat = "all";
      fillControls();
      renderCatalogue();
      return;
    }

    const cat = hit("data-cat");
    if (cat) {
      state.cat = cat.dataset.cat;
      fillControls();
      renderCatalogue();
      return;
    }

    const grade = hit("data-grade");
    if (grade) {
      state.grade = grade.dataset.grade;
      fillControls();
      renderCatalogue();
      return;
    }

    const lot = hit("data-lot");
    if (lot) {
      openLot(lot.dataset.lot);
      return;
    }

    const add = hit("data-add");
    if (add) {
      addToCart(add.dataset.add);
      add.textContent = `${i18n.t("added")} ✓`;
      add.disabled = true;
      return;
    }

    const enquire = hit("data-enquire");
    if (enquire) {
      openEnquiry(enquire.dataset.enquire);
      return;
    }

    const sendEnquiry = hit("data-send-enquiry");
    if (sendEnquiry) {
      submitEnquiry(sendEnquiry.dataset.sendEnquiry);
      return;
    }

    const ask = hit("data-ask");
    if (ask) {
      closePanel();
      openAssistant(LOTS.find((l) => l.id === ask.dataset.ask));
      return;
    }

    const qty = hit("data-qty");
    if (qty) {
      setQty(qty.dataset.qty, Number(qty.dataset.to));
      return;
    }

    if (hit("data-checkout")) {
      openCheckout(0);
      return;
    }

    const stepTab = hit("data-step");
    if (stepTab) {
      openCheckout(Number(stepTab.dataset.step));
      return;
    }

    const next = hit("data-step-next");
    if (next) {
      commitStep(Number(next.dataset.stepNext));
      return;
    }

    const method = hit("data-method");
    if (method) {
      state.order.method = method.dataset.method;
      document.querySelectorAll(".pay-opt").forEach((el) => el.classList.remove("on"));
      method.classList.add("on");
      const radio = method.querySelector("input");
      if (radio) radio.checked = true;
      return;
    }

    if (hit("data-pay")) {
      placeOrder({
        totals: totals(),
        order: state.order,
        stripe: liveStripe,
        renderPanel: openPanel,
        onSettled: clearCart,
      });
      return;
    }

    const jump = hit("data-jump");
    if (jump) {
      closePanel();
      document.querySelector(jump.dataset.jump)?.scrollIntoView({ behavior: "smooth" });
    }
  });
}
