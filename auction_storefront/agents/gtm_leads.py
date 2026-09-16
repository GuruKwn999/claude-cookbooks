"""Score and route the enquiries that come in through the storefront.

A one-person resale shop spanning eight departments — antiques, jewellery,
electronics, vehicles, property and verified marine/heavy-equipment parts
among them — gets wildly different messages through the same contact form,
worth wildly different amounts of attention:

  * a household clearing a relative's estate — the best supply there is, and the
    person on the other end is usually grieving and in a hurry;
  * someone with a car or a house to consign — a different sale process
    entirely, and worth routing to the right one immediately;
  * a dealer who wants trade terms on three pieces — small margin, repeat volume;
  * someone who read "we buy" and wants to sell a broken television.

Triaging those by hand is the thing that quietly stops happening once the shop
gets busy. This scores each one, says what to do about it, and drafts the first
reply so answering is a matter of editing rather than starting.

    python agents/gtm_leads.py leads.jsonl          # score a backlog
    python agents/gtm_leads.py --demo               # try it on sample enquiries

Import `score_lead` to call it from the server's /api/leads endpoint.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Literal

import anthropic
from pydantic import BaseModel, Field

MODEL = "claude-opus-5"

SYSTEM = """You triage inbound enquiries for Hammer & Hearth, a one-person shop \
that sources single lots — mostly bought at regional auctions, plus a smaller \
line of parts salvaged from marine and heavy-equipment breakups and verified \
by serial number — and resells them online. The owner handles every enquiry \
personally and has limited hours, so your job is to say which ones to open \
first and why.

The shop's eight departments: interiors & antiques, jewellery & watches, art &
collectables, electronics & computing, vehicles, property & land, tiny homes,
and marine & heavy parts. A lead is worth routing to the right one, not just
scored.

What the shop wants, in order:
1. Estate clearances and probate sales — whole houses of unsorted goods, which
   can span several departments in one lot. Highest value per hour of the
   owner's time, and the seller usually needs help fast.
2. A single high-value item in its own right: a classic or well-kept modern
   car, a house or plot, vintage or tested working electronics, period
   furniture, jewellery, silver, studio ceramics, rugs, clocks or scientific
   instruments — or a salvage yard with genuine, identifiable parts off a
   vessel or heavy equipment being broken up.
3. Interior designers, set dressers and dealers sourcing for a project —
   repeat buyers, worth cultivating even on a slow first enquiry.
4. Trade buyers wanting three or more pieces.

What the shop does not want, and should decline warmly:
- Mass-market flat-pack furniture, dead or badly damaged consumer electronics
  with no collector or vintage interest, and appliances.
- Reproductions sold as period, or anything where the sender is evasive about
  where it came from — including a vehicle with no title, a property with
  disputed ownership, or a part with a filed, missing or unverifiable serial
  number.
- Requests to value something the sender has no intention of selling.

Judge urgency on the sender's situation, not their enthusiasm. A probate
deadline is urgent. "Excited to work with you" is not.

Be honest in `reasoning`: if an enquiry is vague, say it is vague rather than
inventing promise. `draft_reply` is written in the owner's voice — plain, warm,
specific, no sales language, and it asks the one question that would most change
what happens next. Write it in the language the enquiry was written in."""


class LeadAssessment(BaseModel):
    """What the triage pass decides about one enquiry."""

    tier: Literal["priority", "standard", "nurture", "decline"] = Field(
        description="priority = open today; standard = this week; "
        "nurture = keep warm, no action; decline = politely not a fit"
    )
    score: int = Field(ge=0, le=100, description="Fit against what the shop wants")
    segment: Literal[
        "estate",
        "consignment",
        "vehicle",
        "property",
        "parts",
        "trade",
        "interior",
        "retail",
        "unclear",
    ]
    estimated_value_usd: int | None = Field(
        description="Rough value of the opportunity, or null when there is nothing to go on"
    )
    urgency: Literal["deadline", "soon", "open"] = Field(
        description="deadline = the sender is against a date; soon = weeks; open = no pressure"
    )
    categories: list[str] = Field(description="Shop categories this touches, if any")
    missing: list[str] = Field(description="What you would need to know to price this")
    reasoning: str = Field(description="Two sentences. Say it plainly.")
    draft_reply: str = Field(description="A reply the owner can send after light editing")


def score_lead(lead: dict[str, Any], client: anthropic.Anthropic | None = None) -> dict[str, Any]:
    """Triage one enquiry. Returns the assessment as a plain dict."""
    client = client or anthropic.Anthropic()

    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[
            {
                "role": "user",
                "content": (
                    f"Name: {lead.get('name', '(not given)')}\n"
                    f"Email: {lead.get('email', '(not given)')}\n"
                    f"Selected reason: {lead.get('kind', '(not given)')}\n"
                    f"Message: {lead.get('note') or '(left blank)'}"
                ),
            }
        ],
        output_format=LeadAssessment,
    )
    return response.parsed_output.model_dump()


DEMO_LEADS = [
    {
        "name": "Marguerite Osei",
        "email": "m.osei@example.com",
        "kind": "estate",
        "note": "My aunt died in March and the house has to be cleared before it goes "
        "to auction on the 14th. Three bedrooms of furniture, a lot of it "
        "older than she was, plus a case of pocket watches and some rugs.",
    },
    {
        "name": "Danny R.",
        "email": "danny@example.com",
        "kind": "sell",
        "note": "got a 55 inch tv and a leather sofa, barely used, how much",
    },
    {
        "name": "Priya Nair",
        "email": "priya.nair@example.com",
        "kind": "vehicle",
        "note": "Selling my dad's 1968 MGB, garaged for 15 years, he kept every "
        "service receipt. Title's clean, in my name now. Not in a rush.",
    },
    {
        "name": "Tom Holbrook",
        "email": "tholbrook@example.com",
        "kind": "property",
        "note": "We own a two-acre plot with lapsed planning permission, "
        "considering listing it — no survey done yet, just testing the water.",
    },
    {
        "name": "Dale Okafor",
        "email": "dale@gulfcoastmarinesalvage.example",
        "kind": "parts",
        "note": "We break up 15-20 hulls a year and most of the drivetrain and "
        "electronics comes off in good working order before we scrap the rest. "
        "Currently just landfilling it or selling scrap weight for the metal. "
        "Want to know what you'd need from us to list it properly.",
    },
    {
        "name": "Ines Fontana",
        "email": "ines@studiofontana.example",
        "kind": "interior",
        "note": "I dress period interiors for a production company. Looking for "
        "1930s–50s lighting and glass, usually 6–10 pieces a quarter, and I "
        "need to be able to return what doesn't work on camera.",
    },
    {
        "name": "Peter Halloran",
        "email": "p.halloran@example.com",
        "kind": "consign",
        "note": "I have a few bits from my father's workshop. Not sure if they're worth anything.",
    },
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", type=Path, help="JSONL file, one enquiry per line")
    parser.add_argument("--demo", action="store_true", help="Score four sample enquiries")
    args = parser.parse_args()

    if args.demo:
        leads = DEMO_LEADS
    elif args.path:
        leads = [json.loads(line) for line in args.path.read_text().splitlines() if line.strip()]
    else:
        parser.error("Give a JSONL path or --demo")

    client = anthropic.Anthropic()
    results = [{**lead, "assessment": score_lead(lead, client)} for lead in leads]
    results.sort(key=lambda r: -r["assessment"]["score"])

    for row in results:
        a = row["assessment"]
        value = f"${a['estimated_value_usd']:,}" if a["estimated_value_usd"] else "—"
        print(
            f"\n[{a['tier'].upper():>8}] {a['score']:>3}  {row['name']}  "
            f"({a['segment']}, {a['urgency']}, {value})"
        )
        print(f"           {a['reasoning']}")
        if a["missing"]:
            print(f"           Ask about: {', '.join(a['missing'])}")

    out = Path("lead_assessments.json")
    out.write_text(json.dumps(results, indent=2) + "\n")
    print(f"\nFull assessments and draft replies: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
