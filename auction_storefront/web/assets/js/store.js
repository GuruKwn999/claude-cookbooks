/* store.js — catalogue rendering, cart state, and the slide-over panel that
 * carries the lot detail, the cart and the checkout flow. */

import { i18n } from "./i18n.js";
import { LOTS, CATEGORIES, GRADES, plate } from "./catalog.js";
import { renderPayment, placeOrder, mountStripeElement } from "./checkout.js";
import { mountAssistant, openAssistant } from "./assistant.js";

const CART_KEY = "hh.cart";
const SHIPPING_USD = 28;
const TAX_RATE = 0.0825;

export const state = {
  query: "",
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
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch { /* ignore */ }
}

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gradeOf = (code) => GRADES.find((g) => g.code === code) || GRADES[2];

/* ------------------------------------------------------------------ cart */

export function cartLines() {
  return state.cart
    .map((line) => ({ ...line, lot: LOTS.find((l) => l.id === line.id) }))
    .filter((line) => line.lot);
}

export function totals() {
  const subtotal = cartLines().reduce((sum, l) => sum + l.lot.priceUsd * l.qty, 0);
  const shipping = subtotal > 0 ? SHIPPING_USD : 0;
  const tax = subtotal * TAX_RATE;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
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
  let rows = LOTS.filter((lot) => {
    if (state.cat !== "all" && lot.cat !== state.cat) return false;
    if (state.grade !== "all" && !lot.grade.startsWith(state.grade)) return false;
    if (!q) return true;
    return [lot.title, lot.era, lot.house, lot.note, lot.lot]
      .join(" ").toLowerCase().includes(q);
  });

  const by = {
    new: (a, b) => b.listed.localeCompare(a.listed),
    low: (a, b) => a.priceUsd - b.priceUsd,
    high: (a, b) => b.priceUsd - a.priceUsd,
  }[state.sort];
  return rows.sort(by);
}

function lotCard(lot) {
  const g = gradeOf(lot.grade);
  const belowEstimate = lot.priceUsd < lot.estHigh;
  return `
    <button class="lot" type="button" data-lot="${lot.id}">
      <div class="plate">
        ${plate(lot.cat)}
        <span class="plate-tag">${i18n.t("lotNo")} ${lot.lot}</span>
        ${belowEstimate ? `<span class="plate-flag">Under estimate</span>` : ""}
      </div>
      <div class="lot-body">
        <span class="lot-title">${esc(lot.title)}</span>
        <span class="lot-meta">${esc(lot.era)} · ${esc(lot.house)}</span>
        <span class="lot-foot">
          <span class="lot-price">${i18n.price(lot.priceUsd)}</span>
          <span class="grade ${g.cls}">${g.code} · ${esc(g.label)}</span>
        </span>
      </div>
    </button>`;
}

export function renderCatalogue() {
  const rows = visibleLots();
  $("#lot-grid").innerHTML = rows.length
    ? rows.map(lotCard).join("")
    : `<p class="empty-state">No lots match that. Try widening the category or clearing the search.</p>`;
  $("#results-count").textContent = `${rows.length} ${i18n.t("results")}`;
}

/* ------------------------------------------------------------- panels */

let lastFocus = null;

export function openPanel({ title, body, footer }) {
  lastFocus = document.activeElement;
  $("#panel-title").textContent = title;
  $("#panel-body").innerHTML = body;
  $("#panel-foot").innerHTML = footer || "";
  $("#panel-foot").hidden = !footer;
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

function openLot(id) {
  const lot = LOTS.find((l) => l.id === id);
  if (!lot) return;
  const g = gradeOf(lot.grade);
  const inCart = state.cart.some((l) => l.id === id);

  openPanel({
    title: `${i18n.t("lotNo")} ${lot.lot}`,
    body: `
      <div class="plate detail-plate">
        ${plate(lot.cat)}
        <span class="plate-tag">${esc(lot.era)}</span>
        <span class="plate-flag">${esc(g.label)}</span>
      </div>
      <h2 class="detail-title">${esc(lot.title)}</h2>
      <p class="detail-lede">${esc(lot.note)}</p>
      <table class="spec-table">
        <tbody>
          <tr><th>${i18n.t("estimate")}</th><td>${i18n.price(lot.estLow)} – ${i18n.price(lot.estHigh)}</td></tr>
          <tr><th>${i18n.t("provenance")}</th><td>${esc(lot.house)} · ${esc(lot.sale)}</td></tr>
          <tr><th>${i18n.t("condition")}</th><td>${g.code} · ${esc(g.label)}</td></tr>
          <tr><th>${i18n.t("dimensions")}</th><td>${esc(lot.dims)}</td></tr>
          <tr><th>Weight</th><td>${esc(lot.weight)}</td></tr>
          <tr><th>Listed</th><td>${i18n.date(lot.listed)}</td></tr>
          <tr><th>Availability</th><td>One only — not restockable</td></tr>
        </tbody>
      </table>`,
    footer: `
      <button class="btn btn-primary" data-add="${lot.id}">
        ${inCart ? i18n.t("added") : i18n.t("addToCart")} · ${i18n.price(lot.priceUsd)}
      </button>
      <button class="btn" data-ask="${lot.id}">${i18n.t("assistantTitle")}</button>`,
  });
}

export function openCart() {
  const lines = cartLines();
  const t = totals();

  const body = lines.length
    ? lines.map(({ lot, qty }) => `
        <div class="cart-line">
          <div class="plate">${plate(lot.cat)}</div>
          <div>
            <h4>${esc(lot.title)}</h4>
            <p class="lot-meta">${i18n.t("lotNo")} ${lot.lot} · ${esc(lot.era)}</p>
          </div>
          <div class="cart-line-end">
            <span class="lot-price">${i18n.price(lot.priceUsd * qty)}</span>
            <span class="qty">
              <button type="button" data-qty="${lot.id}" data-to="${qty - 1}" aria-label="Reduce quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-qty="${lot.id}" data-to="${qty + 1}" aria-label="Increase quantity">+</button>
            </span>
            <button class="link-btn" data-qty="${lot.id}" data-to="0">${i18n.t("remove")}</button>
          </div>
        </div>`).join("")
      + `<div class="totals" style="margin-top:20px">
          <div><span>${i18n.t("subtotal")}</span><span>${i18n.price(t.subtotal)}</span></div>
          <div><span>${i18n.t("shipping")}</span><span>${i18n.price(t.shipping)}</span></div>
          <div><span>${i18n.t("tax")}</span><span>${i18n.price(t.tax)}</span></div>
          <div class="grand"><span>${i18n.t("total")}</span><b>${i18n.price(t.total)}</b></div>
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

  const tabs = `<div class="steps">${STEPS.map((k, i) =>
    `<button class="step" type="button" data-step="${i}" ${i === step ? 'aria-current="step"' : ""}>${i + 1}. ${i18n.t(k)}</button>`
  ).join("")}</div>`;

  let form;
  if (step === 0) {
    form = `
      <div class="callout">
        <b>One of each.</b> Everything here is a single auction lot, so a cart holds
        it for 20 minutes. We email a condition addendum before anything ships.
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
          ${i18n.countries.map((c) =>
            `<option value="${c.code}"${c.code === o.country ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
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
        <div><span>${i18n.t("shipping")}</span><span>${i18n.price(t.shipping)}</span></div>
        <div><span>${i18n.t("tax")}</span><span>${i18n.price(t.tax)}</span></div>
        <div class="grand"><span>${i18n.t("total")}</span><b>${i18n.price(t.total)}</b></div>
      </div>`,
    footer: step === 2
      ? `<button class="btn btn-primary" data-pay="1">${i18n.t("payNow")} · ${i18n.price(t.total)}</button>
         <p class="secure-note">${lockIcon()} ${i18n.t("secured")} · PCI DSS SAQ-A</p>`
      : `<button class="btn btn-primary" data-step-next="${step}">${i18n.t("continue")}</button>`,
  });

  if (step === 2) {
    mountStripeElement({ totals: t, order: state.order, cart: state.cart })
      .then((handle) => { liveStripe = handle; })
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

  $("#cat-list").innerHTML = [{ id: "all", label: i18n.t("all") }, ...CATEGORIES]
    .map((c) => {
      const n = c.id === "all" ? LOTS.length : LOTS.filter((l) => l.cat === c.id).length;
      return `<button class="rail-opt" type="button" data-cat="${c.id}"
        aria-pressed="${state.cat === c.id}">${esc(c.label)}<em>${n}</em></button>`;
    }).join("");

  $("#grade-list").innerHTML = [{ code: "all", label: i18n.t("all") }, ...GRADES]
    .map((g) => `<button class="rail-opt" type="button" data-grade="${g.code}"
      aria-pressed="${state.grade === g.code}">${esc(g.label)}</button>`).join("");

  $("#sort-select").innerHTML = [["new", "sortNew"], ["low", "sortLow"], ["high", "sortHigh"]]
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
  try { localStorage.setItem("hh.theme", theme); } catch { /* ignore */ }
  $("#theme-toggle").textContent = theme === "dark" ? "Light" : "Dark";
}

export function boot() {
  i18n.init();

  let theme = "dark";
  try { theme = localStorage.getItem("hh.theme") || "dark"; } catch { /* ignore */ }
  applyTheme(theme);

  applyTranslations();
  mountAssistant();

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

    const cat = hit("data-cat");
    if (cat) { state.cat = cat.dataset.cat; fillControls(); renderCatalogue(); return; }

    const grade = hit("data-grade");
    if (grade) { state.grade = grade.dataset.grade; fillControls(); renderCatalogue(); return; }

    const lot = hit("data-lot");
    if (lot) { openLot(lot.dataset.lot); return; }

    const add = hit("data-add");
    if (add) {
      addToCart(add.dataset.add);
      add.textContent = `${i18n.t("added")} ✓`;
      add.disabled = true;
      return;
    }

    const ask = hit("data-ask");
    if (ask) { closePanel(); openAssistant(LOTS.find((l) => l.id === ask.dataset.ask)); return; }

    const qty = hit("data-qty");
    if (qty) { setQty(qty.dataset.qty, Number(qty.dataset.to)); return; }

    if (hit("data-checkout")) { openCheckout(0); return; }

    const stepTab = hit("data-step");
    if (stepTab) { openCheckout(Number(stepTab.dataset.step)); return; }

    const next = hit("data-step-next");
    if (next) { commitStep(Number(next.dataset.stepNext)); return; }

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
    if (jump) { closePanel(); document.querySelector(jump.dataset.jump)?.scrollIntoView({ behavior: "smooth" }); }
  });
}
