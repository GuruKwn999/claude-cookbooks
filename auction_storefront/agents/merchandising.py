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

SYSTEM = """You write listing copy for Hammer & Hearth, a one-person shop selling \
single lots bought at regional auctions.

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


def draft_copy(lot: dict, language: str, client: anthropic.Anthropic) -> ListingCopy:
    """Draft listing copy for one lot in one language."""
    record = (
        f"Lot {lot['lot']} — {lot['title']}\n"
        f"Category: {lot['cat']}\n"
        f"Period: {lot['era']}\n"
        f"Condition grade: {lot['grade']}\n"
        f"Asking price: ${lot['priceUsd']:,}\n"
        f"Auction estimate was: ${lot['estLow']:,}–${lot['estHigh']:,}\n"
        f"Bought at: {lot['house']}, {lot['sale']}\n"
        f"Dimensions: {lot['dims']}\n"
        f"Weight: {lot['weight']}\n"
        f"Cataloguer's notes: {lot['note']}"
    )

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
