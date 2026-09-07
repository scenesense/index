#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

VALID = re.compile(r"^\d{2}(?:[-–]\d{2})?$")
ROOT = Path("data/series")
errors = []
checked_files = 0
checked_episodes = 0

for path in sorted(ROOT.glob("*/season-*.json")):
    if path.name.endswith("-meta.json"):
        continue
    checked_files += 1
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{path}: invalid JSON: {exc}")
        continue
    episodes = payload.get("episodes", [])
    if not isinstance(episodes, list):
        continue
    for index, episode in enumerate(episodes, start=1):
        checked_episodes += 1
        if not isinstance(episode, dict):
            errors.append(f"{path}: episode row {index} is not an object")
            continue
        number = episode.get("number")
        if not isinstance(number, str) or not VALID.fullmatch(number):
            errors.append(
                f"{path}: {episode.get('id', f'row {index}')} has invalid episode number {number!r}; expected '01'..'99' or a zero-padded combined form such as '01-02'"
            )

if errors:
    print("Episode-number validation failed:")
    for error in errors:
        print(f"- {error}")
    print(f"\nChecked {checked_episodes} episode rows across {checked_files} core season files; {len(errors)} invalid row(s).")
    sys.exit(1)

print(f"Episode-number validation passed: {checked_episodes} episode rows across {checked_files} core season files.")
