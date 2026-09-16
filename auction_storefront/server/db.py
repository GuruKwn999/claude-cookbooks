"""SQLite persistence for the storefront.

Two things live here that used to be a comment in main.py saying "replace this
with a real store": which lots have sold, and what orders have come in. Both
now survive a server restart.

SQLite is the right amount of database for a shop this size — one seller, one
process. If you outgrow a single file (multiple app servers, high write
concurrency), swap this module for Postgres; nothing outside it needs to
change, since callers only see the functions below, not the schema.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("PYLI_DB_PATH", Path(__file__).parent / "pyli_industries.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS lot_state (
    lot_id      TEXT PRIMARY KEY,
    sold        INTEGER NOT NULL DEFAULT 0,
    price_usd   REAL,              -- NULL = use the catalogue price
    updated_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,       -- Stripe PaymentIntent id
    email           TEXT,
    lots_json       TEXT NOT NULL,          -- [{id, qty}, ...]
    amount_minor    INTEGER NOT NULL,
    currency        TEXT NOT NULL,
    country         TEXT,
    status          TEXT NOT NULL,          -- requires_payment | succeeded | ...
    kind            TEXT NOT NULL,          -- sale | deposit
    created_at      REAL NOT NULL,
    updated_at      REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    kind        TEXT NOT NULL,
    note        TEXT,
    assessment_json TEXT,
    created_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    note        TEXT,
    created_at  REAL NOT NULL
);
"""


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


# ----------------------------------------------------------------- lot state


def lot_overrides() -> dict[str, dict[str, Any]]:
    """Per-lot sold flag and price override, keyed by lot id."""
    with connect() as conn:
        rows = conn.execute("SELECT lot_id, sold, price_usd FROM lot_state").fetchall()
    return {r["lot_id"]: {"sold": bool(r["sold"]), "price_usd": r["price_usd"]} for r in rows}


def mark_sold(lot_id: str) -> None:
    with connect() as conn:
        conn.execute(
            """INSERT INTO lot_state (lot_id, sold, updated_at) VALUES (?, 1, ?)
               ON CONFLICT(lot_id) DO UPDATE SET sold = 1, updated_at = excluded.updated_at""",
            (lot_id, time.time()),
        )


def set_price(lot_id: str, price_usd: float | None) -> None:
    with connect() as conn:
        conn.execute(
            """INSERT INTO lot_state (lot_id, sold, price_usd, updated_at) VALUES (?, 0, ?, ?)
               ON CONFLICT(lot_id) DO UPDATE SET price_usd = excluded.price_usd, updated_at = excluded.updated_at""",
            (lot_id, price_usd, time.time()),
        )


def set_sold(lot_id: str, sold: bool) -> None:
    with connect() as conn:
        conn.execute(
            """INSERT INTO lot_state (lot_id, sold, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(lot_id) DO UPDATE SET sold = excluded.sold, updated_at = excluded.updated_at""",
            (lot_id, int(sold), time.time()),
        )


# --------------------------------------------------------------------- orders


def record_order(
    *,
    id: str,
    email: str | None,
    lots: list[dict[str, Any]],
    amount_minor: int,
    currency: str,
    country: str | None,
    status: str,
    kind: str,
) -> None:
    now = time.time()
    with connect() as conn:
        conn.execute(
            """INSERT INTO orders (id, email, lots_json, amount_minor, currency, country, status, kind, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at""",
            (id, email, json.dumps(lots), amount_minor, currency, country, status, kind, now, now),
        )


def list_orders(limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [{**dict(r), "lots": json.loads(r["lots_json"])} for r in rows]


# ---------------------------------------------------------------------- leads


def record_lead(*, name: str, email: str, kind: str, note: str, assessment: dict[str, Any]) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO leads (name, email, kind, note, assessment_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (name, email, kind, note, json.dumps(assessment), time.time()),
        )
        return cur.lastrowid


def record_enquiry(*, lot_id: str, name: str, email: str, note: str) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO enquiries (lot_id, name, email, note, created_at) VALUES (?, ?, ?, ?, ?)",
            (lot_id, name, email, note, time.time()),
        )
        return cur.lastrowid


def list_leads(limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM leads ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def list_enquiries(limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM enquiries ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]
