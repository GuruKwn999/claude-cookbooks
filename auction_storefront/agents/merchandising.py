"""Write the listing copy for lots that have none.

The bottleneck in auction resale is not buying, it is describing. A lot bought
on Saturday sits unlisted until someone writes 120 words about it, and the
difference between a listing that sells and one that does not is mostly whether
the faults are stated in a way a buyer trusts.

This drafts that copy from the catalogue record — a listing paragraph, a search
description, a short social post, and the one question the listing leaves
unanswered — for every lot, in whichever languages you sell in.

    python agents/merchandising.py                      # all lots, English
    python agents/merchandising.py --lots l1042 l1058   # just these
    python agents/merchandising.py --lang es fr ja      # and in these languages

The draft is a draft. Read it against the object before it goes live: the model
can only work from the record, and the record is only as good as your notes.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel, Field

MODEL = "claude-opus-5"
CATALOG = json.loads((Path(__file__).parent.parent / "server" / "lots.json").read_text())

SYSTEM = """You write listing copy for Pamela Y. Logan Industries, a one-person shop selling \
single lots — mostly bought at regional auctions, plus a line of salvaged marine \
and heavy-equipment parts verified by serial number — from teapots to houses to \
engine blocks, across eight departments.

The house style, which is the whole business:
- Lead with the object, not an adjective. "A plan chest from a drawing office"
  beats "Stunning vintage industrial storage solution".
- State every fault the record mentions, in the listing body, in plain words. A
  buyer who reads about the hairline here does not open a dispute later.
- Concrete over evocative. Dimensions, materials, what it was for, what it has
  been through. No "perfect for any home", no "must-see", no exclamation marks.
- Never state a maker, date or provenance the record does not support. Where the
  record hedges ("attribution, not signature"), hedge the same way.
- Never imply more than one exists. Each lot is a single object.
- Match the call to action to how the lot is sold. A shipped or freighted lot
  is bought; a vehicle deposit reserves it for inspection, never "buy now" —
  say what the deposit does and that a balance follows; a property or land
  lot is never for sale on this page at all — invite the reader to register
  interest, not to purchase.
- A verified part's whole pitch is that it is genuine, not a reproduction —
  lead the listing with what was verified (the OEM part number, the serial)
  and against what price it saves money, not with adjectives about condition.

Length: `listing` is 90–140 words. `search_description` is under 155 characters
and reads as a sentence, not keywords. `social` is under 240 characters and
leads with the single most interesting true fact about the piece."""


class ListingCopy(BaseModel):
    headline: str = Field(description="Under 65 characters. The object, not a pitch.")
    listing: str = Field(description="The listing body, 90–140 words")
    search_description: str = Field(description="Under 155 characters, for search results")
    social: str = Field(description="Under 240 characters")
    open_question: str = Field(
        description="The thing a serious buyer would ask that this record cannot "
        "answer — so the owner knows what to go and check"
    )


FULFILMENT_NOTE = {
    "ship": "Sold and shipped through the site at the price above.",
    "freight": "Sold through the site; too large to ship, so freight is quoted after checkout.",
    "collect": "Sold through the site as a deposit that reserves it for inspection; "
    "the balance is due on collection. Never describe the price above as what "
    "the buyer pays today — it isn't.",
    "enquiry": "Not sold through a cart at all. The listing should invite the reader to "
    "register interest, not to buy — there is no checkout for this lot.",
}


def draft_copy(lot: dict, language: str, client: anthropic.Anthropic) -> ListingCopy:
    """Draft listing copy for one lot in one language."""
    lines = [
        f"Lot {lot['lot']} — {lot['title']}",
        f"Category: {lot['cat']}",
        f"Period: {lot['era']}",
        f"Condition grade: {lot['grade']}",
        f"Asking price: ${lot['priceUsd']:,}",
        f"{'Typical used-market range' if lot.get('verified') else 'Auction estimate was'}: "
        f"${lot['estLow']:,}–${lot['estHigh']:,}",
        f"{'Salvaged from' if lot.get('verified') else 'Bought at'}: {lot['house']}, {lot['sale']}",
        f"Dimensions: {lot['dims']}",
    ]
    if lot.get("weight"):
        lines.append(f"Weight: {lot['weight']}")
    if lot.get("depositUsd"):
        lines.append(f"Deposit to reserve: ${lot['depositUsd']:,}")
    if lot.get("verified"):
        lines.append(f"OEM part number: {lot['oem']}")
        lines.append(f"Serial number (verified): {lot['serial']}")
        if lot.get("newPriceUsd"):
            saved = round((1 - lot["priceUsd"] / lot["newPriceUsd"]) * 100)
            lines.append(
                f"Current factory price: ${lot['newPriceUsd']:,} — this lot saves {saved}%"
            )
    if lot.get("specs"):
        lines.append("Specification:")
        lines.extend(f"  {key}: {value}" for key, value in lot["specs"])
    lines.append(
        f"How it's sold: {FULFILMENT_NOTE.get(lot.get('fulfilment', 'ship'), FULFILMENT_NOTE['ship'])}"
    )
    lines.append(f"Cataloguer's notes: {lot['note']}")
    record = "\n".join(lines)

    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[
            {
                "role": "user",
                "content": f"Write the copy in {language}.\n\n{record}",
            }
        ],
        output_format=ListingCopy,
    )
    return response.parsed_output


LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "ja": "Japanese",
    "ko": "Korean",
    "zh-Hans": "Simplified Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "sv": "Swedish",
    "tr": "Turkish",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lots", nargs="*", help="Lot ids, e.g. l1042. Default: all.")
    parser.add_argument(
        "--lang",
        nargs="*",
        default=["en"],
        help=f"Language codes. Known: {', '.join(LANGUAGE_NAMES)}",
    )
    parser.add_argument("--out", type=Path, default=Path("listing_copy.json"))
    args = parser.parse_args()

    lots = CATALOG["lots"]
    if args.lots:
        wanted = set(args.lots)
        lots = [lot for lot in lots if lot["id"] in wanted]
        missing = wanted - {lot["id"] for lot in lots}
        if missing:
            parser.error(f"No such lot: {', '.join(sorted(missing))}")

    client = anthropic.Anthropic()
    drafted: dict[str, dict[str, dict]] = {}

    for lot in lots:
        drafted[lot["id"]] = {}
        for code in args.lang:
            language = LANGUAGE_NAMES.get(code, code)
            copy = draft_copy(lot, language, client)
            drafted[lot["id"]][code] = copy.model_dump()
            print(f"\nLot {lot['lot']} · {code}")
            print(f"  {copy.headline}")
            print(f"  ? {copy.open_question}")

    args.out.write_text(json.dumps(drafted, indent=2, ensure_ascii=False) + "\n")
    print(f"\n{len(lots)} lots × {len(args.lang)} languages → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
