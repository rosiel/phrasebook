#!/usr/bin/env python3
"""Convert HSK  words and translations to HTML.

Usage:
    python src/parse_csv.py data/numbers.csv
    python src/2c-htmlify-words.py vendor/hsk-words/2026/hsk1-words.json -o output/words.html
"""

import argparse
import json
import htmlify
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(
        description="Convert a HSK words JSON file to an HTML file with a table."
    )
    parser.add_argument(
        "--json_file",
        help="Path to the input JSON file.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Path to the output HTML file (default: stdout).",
    )
    parser.add_argument(
        "-t",
        "--title",
        default=None,
        help="Title of the HTML page.",
    )

    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: file not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, 'r') as fp:
        data = json.load(fp)

    template_soup = htmlify.get_soup_from_template('data/template2.html')

    soup = htmlify.htmlify_words(data, template_soup, args.title)

    with open(args.output, 'wb') as fp2:
        fp2.write(soup.prettify(encoding='utf-8'))

if __name__ == '__main__':
    main()
