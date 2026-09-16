"""Live exchange rates, cached in memory.

The storefront's own i18n.js ships an indicative rate table so the page prices
sensibly with no server at all — that table is for display only and must never
price a charge. This module is the real feed: it calls Frankfurter
(frankfurter.dev), which republishes the European Central Bank's daily
reference rates and needs no API key, and caches the result for CACHE_TTL
seconds so browsing doesn't hammer the upstream API.

Swap the call in `_fetch_live` for your preferred provider (a paid feed with
intraday updates, if you settle in currencies the ECB doesn't quote) — nothing
else needs to change, since main.py only calls `usd_rates()`.
"""

from __future__ import annotations

import time

import httpx

CACHE_TTL = 60 * 60  # one hour — the ECB publishes once a day anyway
FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest"

_cache: dict[str, tuple[float, dict[str, float]]] = {}


def _fetch_live() -> dict[str, float]:
    """USD-based rates from Frankfurter, republished as {CODE: rate}."""
    response = httpx.get(FRANKFURTER_URL, params={"base": "USD"}, timeout=8.0)
    response.raise_for_status()
    data = response.json()
    rates = {k.upper(): float(v) for k, v in data["rates"].items()}
    rates["USD"] = 1.0
    return rates


def usd_rates() -> dict[str, float]:
    """USD-based conversion rates, cached for CACHE_TTL seconds.

    Raises whatever httpx raises on a bad request; main.py's /api/rates
    endpoint lets that propagate as a 502 rather than silently serving a stale
    or fabricated number — a checkout must know when its rate feed is down.
    """
    now = time.time()
    cached = _cache.get("rates")
    if cached and now - cached[0] < CACHE_TTL:
        return cached[1]

    rates = _fetch_live()
    _cache["rates"] = (now, rates)
    return rates


def convert(amount_usd: float, currency: str) -> float:
    rates = usd_rates()
    rate = rates.get(currency.upper())
    if rate is None:
        raise ValueError(f"No live rate for {currency}")
    return amount_usd * rate
