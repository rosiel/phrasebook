#!/usr/bin/env python3
"""Convert a CSV file (formatted like data/numbers.csv) to JSON in the
structure of data/parsed-hsk1-sentences.json.

Usage:
    python src/parse_csv.py data/numbers.csv
    python src/parse_csv.py data/numbers.csv -o output.json
"""

import argparse
import csv
import json
import sys
from pathlib import Path


def parse_csv_to_json(csv_path: Path) -> dict:
    """Read a CSV file and return a dict keyed by sequential string ids."""
    result = {}

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header is None:
            print("Error: CSV file is empty.", file=sys.stderr)
            sys.exit(1)

        for idx, row in enumerate(reader, start=1):
            # Skip completely empty rows
            if not row or all(cell.strip() == "" for cell in row):
                continue

            # Pad short rows with empty strings so indexing is safe
            while len(row) < 4:
                row.append("")

            word = row[0].strip()
            zh = row[1].strip() if len(row) > 1 else ""
            pinyin = row[2].strip() if len(row) > 2 else ""
            en = row[3].strip() if len(row) > 3 else ""

            str_id = str(idx)
            result[str_id] = {
                "id": str_id,
                "word": word,
                "sentence": {
                    "pinyin": pinyin,
                    "zh": zh,
                    "en": en,
                },
            }

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Convert a CSV file to the phrasebook JSON format."
    )
    parser.add_argument(
        "csv_file",
        help="Path to the input CSV file.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Path to the output JSON file (default: stdout).",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"Error: file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    data = parse_csv_to_json(csv_path)

    json_str = json.dumps(data, ensure_ascii=False, indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_str, encoding="utf-8")
        print(f"Wrote {len(data)} entries to {output_path}")
    else:
        print(json_str)


if __name__ == "__main__":
    main()
