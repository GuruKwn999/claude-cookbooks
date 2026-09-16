/* assistant.js — "Ask the curator", the storefront's commerce agent.
 *
 * LIVE  — window.PYLI_CONFIG.apiBase points at the reference server, which calls
 *         Claude with the catalogue and a small tool set (search_lots,
 *         check_availability, quote_shipping). Keys stay server-side; the
 *         browser never sees one.
 *
 * DEMO  — no server configured. The widget answers from the catalogue in the
 *         page using the same retrieval the server-side tool performs, so the
 *         shopping experience works before you have an API key. It says so.
 */

import { i18n } from "./i18n.js";
import { LOTS, CATEGORIES, GRADES } from "./catalog.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let history = [];

const config = () => (typeof window !== "undefined" && window.PYLI_CONFIG) || {};

/* ------------------------------------------------------- local retrieval */

/** The same search the server exposes to Claude as the `search_lots` tool. */
export function searchLots(query, { max = 4 } = {}) {
  const q = query.toLowerCase();
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

  const budget = q.match(/(\d[\d,.]*)\s*(?:dollars|usd|\$|euro|eur)?/);
  const ceiling = budget ? Number(budget[1].replace(/[,.]/g, "")) : null;

  return LOTS
    .map((lot) => {
      const hay = [lot.title, lot.cat, lot.era, lot.house, lot.note].join(" ").toLowerCase();
      let score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
      const cat = CATEGORIES.find((c) => c.id === lot.cat);
      if (cat && q.includes(cat.label.toLowerCase().split(" ")[0])) score += 2;
      if (ceiling && lot.priceUsd <= ceiling) score += 1;
      if (ceiling && lot.priceUsd > ceiling) score -= 2;
      return { lot, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.lot.priceUsd - b.lot.priceUsd)
    .slice(0, max)
    .map((r) => r.lot);
}

/** Canned answers for the questions a resale shop actually gets. */
function policyAnswer(q) {
  const has = (...words) => words.some((w) => q.includes(w));

  if (has("ship", "deliver", "post", "freight", "customs", "duty")) {
    return `Everything ships tracked and insured for the full purchase price. Small
      lots go by courier within two business days; anything over 20 kg — the plan
      chest, the larger furniture — is quoted as palletised freight after checkout,
      so you approve the cost before it moves. Import duty and VAT are the buyer's
      side of the line outside the United States, and the customs form carries the
      lot's actual hammer value, never a lower one.`;
  }
  if (has("return", "refund", "guarantee", "warranty")) {
    return `Fourteen days from delivery, for any reason, on everything except lots
      graded D — "as found" — which are described plainly and sold as projects.
      Return shipping is on the buyer unless the piece arrived misdescribed or
      damaged, in which case it is on me and I collect it.`;
  }
  if (has("pay", "card", "klarna", "afterpay", "affirm", "instal", "instalment", "installment", "later", "finance")) {
    return `All the card networks — Visa, Mastercard, American Express, Discover,
      JCB, UnionPay, Diners, and the regional rails like Cartes Bancaires, Elo and
      Mada. Wallets: Apple Pay, Google Pay, PayPal, Amazon Pay, Cash App, Alipay,
      WeChat Pay, UPI. For buy now, pay later it depends on where you are: Klarna,
      Afterpay/Clearpay, Affirm, Zip, Sezzle, PayPal Pay Later, Alma, Scalapay,
      Atome, Tabby and Tamara are all wired in, and the checkout only shows the
      ones that actually settle in your country.`;
  }
  if (has("condition", "grade", "damage", "restor", "repair")) {
    return `Grades run ${GRADES.map((g) => `${g.code} (${g.label})`).join(", ")}.
      I photograph every fault I find and write it into the lot note rather than
      shooting around it — the ring-mark on the teak chair, the hairline under the
      platter rim. If something is not mentioned, ask and I will look again.`;
  }
  if (has("provenance", "authentic", "real", "genuine", "fake")) {
    return `Each lot lists the sale room and lot number it came out of, which is
      the paper trail I can actually stand behind. Where a maker is an attribution
      rather than a signature — the stoneware vase, for instance — it says so in
      the note. I do not issue certificates of authenticity.`;
  }
  return null;
}

function lotLine(lot) {
  return `<button class="chip" data-lot="${lot.id}">${esc(lot.title)} · ${i18n.price(lot.priceUsd)}</button>`;
}

/** Demo-mode reply: retrieval plus policy, no model call. */
function localReply(question) {
  const q = question.toLowerCase();
  const policy = policyAnswer(q);
  const hits = searchLots(question);

  if (policy && !hits.length) return { text: policy, lots: [] };
  if (policy) return { text: policy, lots: hits };

  if (hits.length) {
    return {
      text: `${hits.length === 1 ? "One lot matches" : `${hits.length} lots match`}
        that. Prices are shown in ${i18n.currency} and every one of these is a
        single object — once it sells it is gone.`,
      lots: hits,
    };
  }

  return {
    text: `Nothing in the current catalogue matches that. There are
      ${LOTS.length} lots in stock across ${CATEGORIES.length} categories —
      furniture, jewellery, ceramics, timepieces, rugs, silver, lighting, glass,
      books, coins and instruments. Tell me a room, a budget or a period and I
      will pull what fits.`,
    lots: [],
  };
}

/* ----------------------------------------------------------- transport */

async function ask(question) {
  const cfg = config();
  if (!cfg.apiBase) return localReply(question);

  try {
    const response = await fetch(`${cfg.apiBase}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale: i18n.locale, currency: i18n.currency, history }),
    });
    if (!response.ok) throw new Error(`assistant ${response.status}`);
    const data = await response.json();
    return { text: data.reply, lots: (data.lot_ids || []).map((id) => LOTS.find((l) => l.id === id)).filter(Boolean) };
  } catch (err) {
    console.warn("Assistant server unreachable, answering from the page:", err.message);
    return localReply(question);
  }
}

/* -------------------------------------------------------------- widget */

function bubble(role, html) {
  return `<div class="bubble ${role}">${html}</div>`;
}

function paint() {
  $("#chat-log").innerHTML = history.map((turn) =>
    bubble(turn.role === "user" ? "me" : "them",
      `<p>${turn.role === "user" ? esc(turn.text) : turn.text}</p>` +
      (turn.lots?.length ? `<div class="chip-row">${turn.lots.map(lotLine).join("")}</div>` : "")
    )).join("");
  const log = $("#chat-log");
  log.scrollTop = log.scrollHeight;
}

async function send(text) {
  if (!text.trim()) return;
  history.push({ role: "user", text });
  paint();

  const input = $("#chat-input");
  input.value = "";
  input.disabled = true;

  const answer = await ask(text);
  history.push({ role: "curator", text: answer.text, lots: answer.lots });
  paint();

  input.disabled = false;
  input.focus();
}

export function openAssistant(lot) {
  const seeds = lot
    ? [`Tell me more about ${lot.title}`, "What condition is it really in?", "How would this ship to me?"]
    : ["Something under $500 for a hallway", "What ships fastest?", "Which buy-now-pay-later options do you take?"];

  if (!history.length) {
    history.push({
      role: "curator",
      lots: [],
      text: `I catalogue everything in this shop myself, straight out of the sale
        rooms. Ask me what fits a room, a budget or a period — or ask what is wrong
        with a piece, which is usually the more useful question.`,
    });
  }
  if (lot) {
    history.push({ role: "curator", lots: [lot], text: `Looking at lot ${lot.lot} — ${esc(lot.title)}.` });
  }

  document.querySelector("#assistant-modal").hidden = false;
  document.querySelector("#assistant-scrim").hidden = false;
  $("#chat-seeds").innerHTML = seeds.map((s) => `<button class="chip" data-seed="${esc(s)}">${esc(s)}</button>`).join("");
  paint();
  $("#chat-input").focus();
}

export function closeAssistant() {
  document.querySelector("#assistant-modal").hidden = true;
  document.querySelector("#assistant-scrim").hidden = true;
}

export function mountAssistant() {
  $("#assistant-open").addEventListener("click", () => openAssistant(null));
  $("#assistant-close").addEventListener("click", closeAssistant);
  $("#assistant-scrim").addEventListener("click", closeAssistant);

  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    send($("#chat-input").value);
  });

  $("#chat-seeds").addEventListener("click", (e) => {
    const seed = e.target.closest("[data-seed]");
    if (seed) send(seed.dataset.seed);
  });

  $("#chat-log").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-lot]");
    if (!chip) return;
    closeAssistant();
    document.querySelector(`.lot[data-lot="${chip.dataset.lot}"]`)?.click();
  });
}
