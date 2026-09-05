#!/usr/bin/env python3
import json
import re
import hashlib
from pathlib import Path

ROOT = Path(".")
SOURCE_PATH = ROOT / ".tmp-millionaire-source.json"
INDEX_PATH = ROOT / "data/series/index.json"
GUIDE_PATH = ROOT / "TV_SERIES_INTEGRATION_GUIDE.md"
SERIES_ID = "jeremy-clarksons-millionaire-2018"
FOLDER = ROOT / "data/series/jeremy-clarksons-millionaire"
POSTER = ROOT / "assets/posters/jeremy-clarksons-millionaire-2018.webp"

EXPECTED_OWNED_COUNTS = {1:7,2:11,3:11,4:10,5:7,6:13,7:5,8:14,9:11,10:17,11:6}
EXPECTED_CONCEPTUAL_COUNTS = {**EXPECTED_OWNED_COUNTS, 11:8}
EXPECTED_RUNTIME_BY_SEASON = {1:19349,2:30645,3:31486,4:31263,5:19555,6:36657,7:13855,8:38558,9:30785,10:47566,11:16568}
EXPECTED_TOTAL_RUNTIME = 316287
EXPECTED_OWNED = 112
EXPECTED_CONCEPTUAL = 114

def dump_compact(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

src = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
assert src["series"]["id"] == SERIES_ID
assert src["series"]["folder"] == "jeremy-clarksons-millionaire"
assert src["series"]["poster"] == "assets/posters/jeremy-clarksons-millionaire-2018.webp"
semantic = json.dumps({"unheldBroadcasts": src.get("unheldBroadcasts"), "seasons": src["seasons"]}, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
assert hashlib.sha256(semantic).hexdigest() == "80891261e3c1f31e6eabd466d9fa6f51ee79adb807ab763d98110219fca3ba9e", "staged source semantic checksum mismatch"
assert POSTER.is_file(), f"poster missing: {POSTER}"

unheld = src.get("unheldBroadcasts") or []
assert [x["airDate"] for x in unheld] == ["2026-07-14", "2026-07-16"]
assert all(x.get("status") == "not-held" for x in unheld)

source_seasons = {int(s["number"]): s for s in src["seasons"]}
assert set(source_seasons) == set(range(1, 12))
all_source_eps = [ep for s in src["seasons"] for ep in s["episodes"]]
assert len(all_source_eps) == EXPECTED_OWNED
assert len({ep["global"] for ep in all_source_eps}) == EXPECTED_OWNED
assert len({(s["number"], ep["episode"]) for s in src["seasons"] for ep in s["episodes"]}) == EXPECTED_OWNED
assert len({ep["title"] for ep in all_source_eps}) == EXPECTED_OWNED
assert len({ep["description"] for ep in all_source_eps}) == EXPECTED_OWNED
assert all(len(ep["description"]) >= 100 for ep in all_source_eps)
assert all("&" not in ep["title"] for ep in all_source_eps)
assert all(not re.fullmatch(r"(?:Episode(?:\s+#?\d+(?:\.\d+)?)?|Untitled)", ep["title"], re.I) for ep in all_source_eps)

for sn, s in source_seasons.items():
    eps = s["episodes"]
    assert len(eps) == EXPECTED_OWNED_COUNTS[sn]
    assert [ep["episode"] for ep in eps] == list(range(1, EXPECTED_OWNED_COUNTS[sn] + 1))
    assert sum(ep["runtimeSeconds"] for ep in eps) == EXPECTED_RUNTIME_BY_SEASON[sn]
    assert s["legacySeason"] == sn + 30

assert sum(ep["runtimeSeconds"] for ep in all_source_eps) == EXPECTED_TOTAL_RUNTIME

catalog = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
existing = [s for s in catalog["series"] if s.get("id") == SERIES_ID]
assert not existing, f"{SERIES_ID} already exists in catalogue; refusing blind overwrite"
assert not FOLDER.exists(), f"{FOLDER} already exists; refusing blind overwrite"

audio = {"layouts":["Stereo"],"lossless":False}
season_catalog = []

for sn in range(1, 12):
    s = source_seasons[sn]
    eps = s["episodes"]
    dates = [ep["airDate"] for ep in eps]
    year_start = min(int(d[:4]) for d in dates)
    year_end = max(int(d[:4]) for d in dates)
    if sn == 11:
        year_end = 2026

    core_eps = []
    meta_eps = {}
    for ep in eps:
        eid = f"s{sn:02d}e{int(ep['episode']):02d}"
        core_eps.append({"id":eid,"number":f"{int(ep['episode']):02d}","title":ep["title"],"airDate":ep["airDate"],"runtimeSeconds":int(ep["runtimeSeconds"]),"ratings":{}})
        meta_eps[eid] = {"airDate":ep["airDate"],"description":ep["description"],"runtimeSeconds":int(ep["runtimeSeconds"])}

    core = {"version":1,"seriesId":SERIES_ID,"season":sn,"yearStart":year_start,"yearEnd":year_end,"seasonRatings":{},"episodes":core_eps}
    meta = {"version":1,"seriesId":SERIES_ID,"season":sn,"source":s["source"],"description":s["description"],"episodes":meta_eps}
    dump_compact(FOLDER / f"season-{sn:02d}.json", core)
    dump_compact(FOLDER / f"season-{sn:02d}-meta.json", meta)
    season_catalog.append({"number":sn,"yearStart":year_start,"yearEnd":year_end,"episodeCount":EXPECTED_CONCEPTUAL_COUNTS[sn],"scoringEntryCount":EXPECTED_OWNED_COUNTS[sn],"audio":audio})

entry = {
    "id": SERIES_ID,
    "type": "series",
    "title": "Jeremy Clarkson's Millionaire",
    "yearStart": 2018,
    "yearEnd": 2026,
    "seasonCount": 11,
    "episodeCount": EXPECTED_CONCEPTUAL,
    "scoringEntryCount": EXPECTED_OWNED,
    "genres": ["Game Show"],
    "actors": ["Jeremy Clarkson"],
    "audio": audio,
    "description": "Jeremy Clarkson hosts the revived UK Who Wants to Be a Millionaire?, where contestants face an escalating ladder of 15 multiple-choice questions for a £1 million prize. Four lifelines offer limited help, including Clarkson himself, but the format still turns ordinary general knowledge into high-stakes decisions under studio pressure.",
    "collectionScope": "Jeremy Clarkson era only. Original broadcast seasons S31–S41 are normalized to SceneSense Seasons 1–11. Two additional ITVX broadcasts from 14 and 16 July 2026 are counted in Season 11 but are not yet held and therefore are not scoring entries.",
    "poster": "assets/posters/jeremy-clarksons-millionaire-2018.webp",
    "score": None,
    "questionsVersion": "tv-v1",
    "runtimeSeconds": EXPECTED_TOTAL_RUNTIME,
    "seasons": season_catalog
}
catalog["series"].append(entry)
dump_compact(INDEX_PATH, catalog)

guide = GUIDE_PATH.read_text(encoding="utf-8")
old = "`Documentary` is currently used as a deliberate nonfiction exception for the Brian Cox collection. Do not casually invent additional labels."
new = "`Documentary` and `Game Show` are deliberate nonfiction/television-format exceptions, currently used for the Brian Cox collection and Jeremy Clarkson's Millionaire respectively. Do not casually invent additional labels."
if old in guide:
    guide = guide.replace(old, new, 1)
elif new not in guide:
    raise SystemExit("genre exception guide anchor not found")
GUIDE_PATH.write_text(guide, encoding="utf-8")

catalog2 = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
series = next(s for s in catalog2["series"] if s["id"] == SERIES_ID)
assert series["title"] == "Jeremy Clarkson's Millionaire"
assert series["poster"] == "assets/posters/jeremy-clarksons-millionaire-2018.webp"
assert series["seasonCount"] == 11
assert series["episodeCount"] == EXPECTED_CONCEPTUAL
assert series["scoringEntryCount"] == EXPECTED_OWNED
assert series["runtimeSeconds"] == EXPECTED_TOTAL_RUNTIME
assert series["audio"] == audio
assert series["genres"] == ["Game Show"]
assert series["actors"] == ["Jeremy Clarkson"]
assert len(series["seasons"]) == 11
assert sum(x["episodeCount"] for x in series["seasons"]) == EXPECTED_CONCEPTUAL
assert sum(x["scoringEntryCount"] for x in series["seasons"]) == EXPECTED_OWNED
assert series["seasons"][-1]["episodeCount"] == 8
assert series["seasons"][-1]["scoringEntryCount"] == 6

core_total = meta_total = runtime_total = 0
titles = []
descriptions = []
for sn in range(1, 12):
    core_path = FOLDER / f"season-{sn:02d}.json"
    meta_path = FOLDER / f"season-{sn:02d}-meta.json"
    assert core_path.is_file() and meta_path.is_file()
    core = json.loads(core_path.read_text(encoding="utf-8"))
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert core["seriesId"] == SERIES_ID and meta["seriesId"] == SERIES_ID
    assert core["season"] == sn and meta["season"] == sn
    assert len(core["episodes"]) == EXPECTED_OWNED_COUNTS[sn]
    assert len(meta["episodes"]) == EXPECTED_OWNED_COUNTS[sn]
    assert "format" not in meta, "No SceneSense restoration format was supplied; do not invent a badge."
    for idx, ep in enumerate(core["episodes"], start=1):
        expected_id = f"s{sn:02d}e{idx:02d}"
        assert ep["id"] == expected_id
        assert ep["number"] == f"{idx:02d}"
        assert ep["runtimeSeconds"] == meta["episodes"][expected_id]["runtimeSeconds"]
        assert ep["airDate"] == meta["episodes"][expected_id]["airDate"]
        assert ep["ratings"] == {}
        assert "&" not in ep["title"]
        titles.append(ep["title"])
        descriptions.append(meta["episodes"][expected_id]["description"])
        runtime_total += ep["runtimeSeconds"]
    assert core["seasonRatings"] == {}
    core_total += len(core["episodes"])
    meta_total += len(meta["episodes"])

assert core_total == meta_total == EXPECTED_OWNED
assert runtime_total == EXPECTED_TOTAL_RUNTIME
assert len(set(titles)) == EXPECTED_OWNED
assert len(set(descriptions)) == EXPECTED_OWNED
assert all(len(x) >= 100 for x in descriptions)
assert "Game Show" in GUIDE_PATH.read_text(encoding="utf-8")
assert POSTER.is_file()

print("MILLIONAIRE AUDIT PASSED: 11 normalized seasons / 114 conceptual episodes / 112 scoring rows / 112 unique titles / 112 unique descriptions / 316287 seconds / Stereo perceptual / 2 July ITVX broadcasts counted unheld.")
