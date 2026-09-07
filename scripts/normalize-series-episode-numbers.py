#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path("data/series")
NUMERIC = re.compile(r'("number"\s*:\s*)(\d+)(?=\s*[,}])')
UNPADDED_STRING = re.compile(r'("number"\s*:\s*")(\d{1,2})("(?=\s*[,}]))')
changed_files = 0
changed_rows = 0

for path in sorted(ROOT.glob("*/season-*.json")):
    if path.name.endswith("-meta.json"):
        continue
    text = path.read_text(encoding="utf-8")
    count = 0

    def numeric_repl(match):
        nonlocal_count[0] += 1
        return f'{match.group(1)}"{int(match.group(2)):02d}"'

    nonlocal_count = [0]
    text = NUMERIC.sub(numeric_repl, text)
    count += nonlocal_count[0]

    def string_repl(match):
        value = match.group(2)
        padded = f"{int(value):02d}"
        if padded != value:
            string_count[0] += 1
        return f'{match.group(1)}{padded}{match.group(3)}'

    string_count = [0]
    text = UNPADDED_STRING.sub(string_repl, text)
    count += string_count[0]

    if count:
        path.write_text(text, encoding="utf-8")
        changed_files += 1
        changed_rows += count
        print(f"normalized {count:3d} row(s): {path}")

print(f"Normalized {changed_rows} episode number row(s) across {changed_files} core season file(s).")
