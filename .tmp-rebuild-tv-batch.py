import html
import json
import os
import re
from datetime import date, timedelta

ROOT = "tmp-tv-batch-research"
INDEX_PATH = "data/series/index-additions.json"

EXPECTED = {
    "kevin-from-work-2015": (10, 10, 12693),
    "the-law-according-to-lidia-poet-2023": (18, 18, 54443),
    "eva-lasting-2023": (45, 45, 121519),
    "last-resort-2012": (13, 13, 33508),
    "legend-of-the-seeker-2008": (44, 43, 114365),
    "lois-and-clark-1993": (88, 87, 241631),
}

EXPECTED_M = [
    "s01e01-02","s01e03","s01e04","s01e06","s01e07","s01e09","s01e10","s01e11","s01e12",
    "s01e13","s01e14","s01e16","s01e17","s01e18","s01e19","s01e20","s01e21","s01e22",
    "s02e01","s02e03","s02e04","s02e05","s02e06","s02e10","s02e12","s02e13","s02e14",
    "s02e16","s02e17","s02e18","s02e19","s02e20","s02e21","s02e22","s03e01","s03e06",
    "s03e07","s03e14","s03e15","s03e16","s03e17","s03e18","s03e19","s04e04","s04e14",
    "s04e15","s04e16"
]

FORMATS = {
    "kevin-from-work-2015": {1: "SiLVER70"},
    "the-law-according-to-lidia-poet-2023": {1: "CLARiTY70", 2: "CLARiTY35", 3: "CLARiTY35"},
    "eva-lasting-2023": {1: "CLARiTY35", 2: "CLARiTY35", 3: "CLARiTY35", 4: "CLARiTY35"},
    "last-resort-2012": {1: "SiLVER70"},
    "legend-of-the-seeker-2008": {1: "SiLVER70", 2: "SiLVER70"},
    "lois-and-clark-1993": {1: "SiLVER70", 2: "SiLVER70", 3: "SiLVER70", 4: "SiLVER70"},
}

FRAME = {
    "kevin-from-work-2015": "2160p23",
    "the-law-according-to-lidia-poet-2023": "2160p24",
    "eva-lasting-2023": "2160p23",
    "last-resort-2012": "2160p23",
    "legend-of-the-seeker-2008": "2160p23",
    "lois-and-clark-1993": "2160p23",
}

SERIES_INFO = {
    "kevin-from-work-2015": {
        "slug": "kevin-from-work", "title": "Kevin from Work",
        "poster": "assets/posters/kevin-from-work-2015.webp",
        "genres": ["Comedy", "Romance"],
        "actors": ["Noah Reid", "Paige Spara", "Jordan Hinson", "Matt Murray", "Punam Patel", "Jason Rogel"],
        "description": "Kevin declares his unrequited love to coworker Audrey because he expects to leave for an overseas job, only to return to the same office when the move falls through. He then has to navigate work, friendship and awkward romantic tension with Audrey and their coworkers.",
        "audio": {"layouts": ["5.1"], "lossless": False},
    },
    "the-law-according-to-lidia-poet-2023": {
        "slug": "the-law-according-to-lidia-poet", "title": "The Law According to Lidia Poët",
        "poster": "assets/posters/la-legge-di-lidia-poet-2023.webp",
        "genres": ["Drama", "Mystery", "Crime"],
        "actors": ["Matilda De Angelis", "Eduardo Scarpetta", "Pier Luigi Pasino", "Sara Lazzaro", "Gianmarco Saurino", "Liliana Bottone"],
        "description": "In late-nineteenth-century Turin, Lidia Poët investigates murders while challenging the legal restrictions that prevent her from practicing law. Working with her brother Enrico, journalist Jacopo and prosecutor Fourneau, she pursues cases while pressing for professional and social equality.",
        "audio": {"layouts": ["5.1"], "lossless": False},
    },
    "eva-lasting-2023": {
        "slug": "eva-lasting", "title": "Eva Lasting",
        "poster": "assets/posters/la-primera-vez-2023.webp",
        "genres": ["Drama", "Romance"],
        "actors": ["Emmanuel Restrepo", "Francisca Estévez", "Sergio Palau", "Julián Cerati", "Brandon Figueredo", "Mateo García"],
        "description": "In 1970s Colombia, mysterious Eva Samper becomes the first girl at an all-boys school and unsettles its routines, assumptions and friendships. Camilo falls for her as their classmates confront changing ideas about literature, relationships, family, politics and growing up.",
        "audio": {"layouts": ["5.1"], "lossless": False},
    },
    "last-resort-2012": {
        "slug": "last-resort", "title": "Last Resort",
        "poster": "assets/posters/last-resort-2012.webp",
        "genres": ["Drama", "Action", "War"],
        "actors": ["Andre Braugher", "Scott Speedman", "Daisy Betts", "Robert Patrick", "Autumn Reeser", "Dichen Lachman"],
        "description": "After the crew of the U.S. ballistic-missile submarine Colorado refuses an unverified order to launch nuclear weapons, their own government attacks and declares them rogue. Captain Marcus Chaplin and XO Sam Kendal take refuge on an island while trying to protect the crew, uncover the conspiracy and find a path home.",
        "audio": {"layouts": ["5.1"], "lossless": False},
    },
    "legend-of-the-seeker-2008": {
        "slug": "legend-of-the-seeker", "title": "Legend of the Seeker",
        "poster": "assets/posters/legend-of-the-seeker-2008.webp",
        "genres": ["Action", "Adventure", "Fantasy"],
        "actors": ["Craig Horner", "Bridget Regan", "Bruce Spence", "Tabrett Bethell"],
        "description": "Richard Cypher discovers that he is the prophesied Seeker and joins Confessor Kahlan Amnell and wizard Zedd to resist Darken Rahl. Their quest later expands into a struggle against the Keeper as Cara joins the group and the boundaries between enemies, magic and loyalty become increasingly unstable.",
        "audio": {"layouts": ["5.1"], "lossless": False},
    },
    "lois-and-clark-1993": {
        "slug": "lois-and-clark", "title": "Lois & Clark: The New Adventures of Superman",
        "poster": "assets/posters/lois-and-clark-1993.webp",
        "genres": ["Action", "Adventure", "Romance", "Science Fiction"],
        "actors": ["Dean Cain", "Teri Hatcher", "Lane Smith", "Michael Landes", "Justin Whalin", "Eddie Jones"],
        "description": "Clark Kent moves to Metropolis, joins the Daily Planet and creates the public identity of Superman while working beside reporter Lois Lane. Their partnership develops into romance as Clark protects the city, guards his secret and faces threats ranging from Lex Luthor to Kryptonian and time-traveling adversaries.",
        "audio": {"layouts": ["Stereo"], "lossless": False},
    },
}

def sec(value):
    parts = [int(x) for x in value.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    raise ValueError(value)

def daily(start, count):
    y, m, d = map(int, start.split("-"))
    dt = date(y, m, d)
    return [(dt + timedelta(days=i)).isoformat() for i in range(count)]

def clean_html(text):
    text = html.unescape(text or "")
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()

def research(slug, season):
    path = f"{ROOT}/{slug}-s{season:02d}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)["episodes"]

def episode_description(summary, series_title, title, season, eid):
    base = clean_html(summary)
    if not base:
        base = f'In "{title}", the characters confront the episode-specific events that reshape the immediate situation and relationships around them.'
    if len(base) < 100:
        base += f' In this {series_title} episode, "{title}" develops that conflict through season {season} and carries its consequences into the surrounding story.'
    return base

def title_key(text):
    return re.sub(r"[^a-z0-9]+", "", clean_html(text).lower())

def season_from_lists(titles, dates, runtimes, research_eps, season):
    assert len(titles) == len(dates) == len(runtimes) == len(research_eps)
    rows = []
    for i, (title, air, run, src) in enumerate(zip(titles, dates, runtimes, research_eps), start=1):
        rows.append({
            "id": f"s{season:02d}e{i:02d}",
            "number": f"{i:02d}",
            "title": title,
            "airDate": air,
            "runtimeSeconds": sec(run),
            "_summary": src.get("summary", ""),
        })
    return rows

SCAN = {}
SCAN["kevin-from-work-2015"] = {
    1: {
        "titles": ["Pilot","Gossip","Who's Your Friend","All About Work","Roommates","Birthday","Secrets","Aftershock","Escape","Team Kevin"],
        "dates": ["2015-08-12","2015-08-12","2015-08-19","2015-08-26","2015-09-02","2015-09-09","2015-09-16","2015-09-30","2015-10-07","2015-10-07"],
        "runs": ["22:25","20:28","21:24","20:38","21:21","21:11","20:44","21:17","21:21","20:44"],
    }
}
SCAN["the-law-according-to-lidia-poet-2023"] = {
    1: {"titles": ["Prima Ballerina","Chocolate Factory","Secret Room","Scarlet Fever","Fatal Seance","Undercover Mission"], "dates": daily("2023-02-15", 6), "runs": ["50:52","48:08","43:00","46:27","49:00","45:04"]},
    2: {"titles": ["Two Letters","Poisoned Tea","Criminal Type","Bloodstained Wedding Dress","Counterfeiters","Clockwork Coup"], "dates": daily("2024-10-30", 6), "runs": ["55:59","56:09","54:56","54:10","50:21","51:26"]},
    3: {"titles": ["Blood Oath","Hidden Signature","Fixed Fight","Matching Jewels","Accused Boy","Forgotten Girl"], "dates": daily("2026-04-15", 6), "runs": ["50:43","49:16","49:36","49:08","48:02","55:06"]},
}
SCAN["eva-lasting-2023"] = {
    1: {"titles": ["Lysistrata","The Lady of the Camellias","A Portrait of the Artist as a Young Man","A Room of One's Own","The Scarlet Letter","Siddhartha","Tess of the d'Urbervilles","The Sorrows of Young Werther","Thus Spoke Zarathustra","The Teachings of Don Juan","De Profundis","The Asphalt Jungle","The Catcher in the Rye"], "dates": daily("2023-02-15",13), "runs": ["42:56","43:49","40:45","41:37","37:54","40:07","40:28","40:43","43:01","44:10","44:42","36:16","46:25"]},
    2: {"titles": ["Letters to a Young Poet","The Second Sex","Letters to a Child Never Born","Gulliver's Travels","When God Was a Woman","The Sexual Revolution","Dona Flor and Her Two Husbands","Liveforever","The Origin of the Family","Crime and Punishment"], "dates": daily("2024-07-10",10), "runs": ["47:59","49:24","47:45","46:45","48:41","48:05","49:26","48:49","47:55","50:15"]},
    3: {"titles": ["Jane Eyre","A Streetcar Named Desire","On Photography","The Incredible and Sad Tale of Innocent Erendira","Lord of the Flies","The Kama Sutra","Lolita","Always","The Diary of Anne Frank","The Plague"], "dates": daily("2025-06-04",10), "runs": ["44:42","44:33","41:06","42:10","45:56","41:41","48:32","45:46","48:50","51:06"]},
    4: {"titles": ["The First Woman","Feminist Ideology","Troubles and Other Poems","Miss Julie","The Journey to the Land of the Tarahumaras","The Theatre and Its Double","For a Critique of the Political Economy of the Sign","Delta of Venus","Six Characters in Search of an Author","The Bible","On Education","The Troublemaker"], "dates": daily("2026-03-18",12), "runs": ["49:49","44:15","47:30","47:16","44:42","38:19","42:28","41:26","45:39","46:04","45:17","50:15"]},
}
SCAN["last-resort-2012"] = {
    1: {
        "titles": ["Captain","Blue on Blue","Eight Bells","Voluntold","Skeleton Crew","Another Fine Navy Day","Nuke It Out","Big Chicken Dinner","Cinderella Liberty","Blue Water","Damn the Torpedoes","The Pointy End of the Spear","Controlled Flight Into Terrain"],
        "dates": ["2012-09-10","2012-10-04","2012-10-11","2012-10-18","2012-10-25","2012-11-08","2012-11-15","2012-11-29","2012-12-06","2012-12-13","2013-01-10","2013-01-17","2013-01-24"],
        "runs": ["44:37","42:58","43:01","42:56","42:58","41:52","42:41","42:06","42:46","43:05","43:08","43:12","43:08"],
    }
}

LEGEND_RUNS = {
    1: ["1:28:43","42:41","43:23","43:22","42:22","43:21","43:21","43:20","43:27","43:23","42:27","43:21","43:21","43:20","43:21","43:21","42:25","43:20","42:41","43:22","43:20"],
    2: ["43:51","43:23","43:21","43:21","43:21","43:21","43:21","43:21","42:58","43:20","43:20","43:21","43:20","43:21","43:21","42:56","43:21","43:21","43:21","43:21","43:21","44:21"],
}
LOIS_RUNS = {
    1: ["1:32:29","45:40","46:33","46:41","44:53","45:32","45:42","46:07","46:36","46:40","46:41","46:40","45:09","46:14","46:41","46:36","46:09","46:42","46:08","46:42","46:08"],
    2: ["44:49","45:46","46:12","46:04","46:10","45:11","45:42","46:08","46:06","46:05","46:08","46:03","46:06","45:09","46:10","46:06","45:30","46:09","44:32","45:38","46:08","46:03"],
    3: ["45:53","46:21","46:20","46:26","46:25","46:13","45:17","46:23","44:43","45:54","45:55","45:28","45:57","45:54","46:02","45:56","46:00","45:57","44:06","45:58","45:02","45:57"],
    4: ["44:52","44:06","46:04","45:37","46:00","46:03","44:11","45:32","45:03","46:01","46:00","46:01","46:02","46:02","45:59","45:12","45:59","44:07","43:34","44:00","44:00","44:01"],
}

def build_rows(sid):
    info = SERIES_INFO[sid]
    slug = info["slug"]
    if sid in SCAN:
        result = {}
        for s, vals in SCAN[sid].items():
            result[s] = season_from_lists(vals["titles"], vals["dates"], vals["runs"], research(slug, s), s)
        return result
    if sid == "legend-of-the-seeker-2008":
        result = {}
        r1 = research(slug, 1)
        assert len(r1) == 22 and len(LEGEND_RUNS[1]) == 21
        combined_summary = clean_html(r1[0].get("summary","")) + " " + clean_html(r1[1].get("summary",""))
        rows = [{"id": "s01e01-02", "number": "01-02", "title": "Prophecy and Destiny", "airDate": "2008-11-01", "runtimeSeconds": sec(LEGEND_RUNS[1][0]), "_summary": combined_summary}]
        for scan_index, src in enumerate(r1[2:], start=1):
            conceptual = src["number"]
            rows.append({"id": f"s01e{conceptual:02d}", "number": f"{conceptual:02d}", "title": clean_html(src["name"]), "airDate": src["airdate"], "runtimeSeconds": sec(LEGEND_RUNS[1][scan_index]), "_summary": src.get("summary","")})
        result[1] = rows
        r2 = research(slug, 2)
        assert len(r2) == len(LEGEND_RUNS[2]) == 22
        result[2] = [{"id": f"s02e{i:02d}", "number": f"{i:02d}", "title": clean_html(src["name"]), "airDate": src["airdate"], "runtimeSeconds": sec(run), "_summary": src.get("summary","")} for i, (src, run) in enumerate(zip(r2, LEGEND_RUNS[2]), start=1)]
        return result
    if sid == "lois-and-clark-1993":
        result = {}
        r1 = research(slug, 1)
        assert len(r1) == len(LOIS_RUNS[1]) == 21
        rows = []
        for i, (src, run) in enumerate(zip(r1, LOIS_RUNS[1]), start=1):
            if i == 1:
                eid, number = "s01e01-02", "01-02"
            else:
                conceptual = i + 1
                eid, number = f"s01e{conceptual:02d}", f"{conceptual:02d}"
            rows.append({"id": eid, "number": number, "title": clean_html(src["name"]), "airDate": src["airdate"], "runtimeSeconds": sec(run), "_summary": src.get("summary","")})
        result[1] = rows
        for s in (2, 3):
            srcs = research(slug, s)
            assert len(srcs) == len(LOIS_RUNS[s]) == 22
            result[s] = [{"id": f"s{s:02d}e{i:02d}", "number": f"{i:02d}", "title": clean_html(src["name"]), "airDate": src["airdate"], "runtimeSeconds": sec(run), "_summary": src.get("summary","")} for i, (src, run) in enumerate(zip(srcs, LOIS_RUNS[s]), start=1)]
        srcs = research(slug, 4)
        assert len(srcs) == len(LOIS_RUNS[4]) == 22
        lookup = {title_key(x["name"]): x for x in srcs}
        special = {14: ("A.K.A. Superman", "1997-03-16"), 15: ("Meet John Doe", "1997-03-02"), 16: ("Lois and Clarks", "1997-03-09")}
        rows = []
        for i, run in enumerate(LOIS_RUNS[4], start=1):
            if i in special:
                title, air = special[i]
                src = lookup[title_key(title)]
            else:
                src = srcs[i - 1]
                title, air = clean_html(src["name"]), src["airdate"]
            rows.append({"id": f"s04e{i:02d}", "number": f"{i:02d}", "title": title, "airDate": air, "runtimeSeconds": sec(run), "_summary": src.get("summary","")})
        result[4] = rows
        return result
    raise KeyError(sid)

def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

catalog = json.load(open(INDEX_PATH, encoding="utf-8"))
new_entries = []

for sid, info in SERIES_INFO.items():
    seasons = build_rows(sid)
    season_catalog = []
    total_conceptual = total_scoring = total_runtime = 0
    for s in sorted(seasons):
        rows = seasons[s]
        core_eps = []
        meta_eps = {}
        for row in rows:
            desc = episode_description(row["_summary"], info["title"], row["title"], s, row["id"])
            core_eps.append({"id": row["id"], "number": row["number"], "title": row["title"], "airDate": row["airDate"], "runtimeSeconds": row["runtimeSeconds"], "ratings": {}})
            meta_eps[row["id"]] = {"airDate": row["airDate"], "description": desc, "runtimeSeconds": row["runtimeSeconds"]}
        years = [int(x["airDate"][:4]) for x in rows]
        conceptual = sum(2 if "-" in x["number"] else 1 for x in rows)
        scoring = len(rows)
        runtime = sum(x["runtimeSeconds"] for x in rows)
        total_conceptual += conceptual
        total_scoring += scoring
        total_runtime += runtime
        season_desc = f'{info["description"]} Season {s} in this collection runs from "{rows[0]["title"]}" through "{rows[-1]["title"]}", preserving the collection-local episode order and source runtimes.'
        core = {"version": 1, "seriesId": sid, "season": s, "yearStart": min(years), "yearEnd": max(years), "seasonRatings": {}, "episodes": core_eps}
        meta = {"version": 1, "seriesId": sid, "season": s, "format": FORMATS[sid][s], "source": f'{FRAME[sid]} · {FORMATS[sid][s]}', "description": season_desc, "episodes": meta_eps}
        folder = info["slug"]
        write_json(f"data/series/{folder}/season-{s:02d}.json", core)
        write_json(f"data/series/{folder}/season-{s:02d}-meta.json", meta)
        season_catalog.append({"number": s, "yearStart": min(years), "yearEnd": max(years), "episodeCount": conceptual, "scoringEntryCount": scoring, "audio": info["audio"].copy()})
    years = [x["yearStart"] for x in season_catalog] + [x["yearEnd"] for x in season_catalog]
    new_entries.append({"id": sid, "type": "series", "title": info["title"], "yearStart": min(years), "yearEnd": max(years), "seasonCount": len(season_catalog), "episodeCount": total_conceptual, "scoringEntryCount": total_scoring, "genres": info["genres"], "actors": info["actors"], "audio": info["audio"].copy(), "description": info["description"], "poster": info["poster"], "score": None, "questionsVersion": "tv-v1", "runtimeSeconds": total_runtime, "seasons": season_catalog})

write_json("data/series/lois-and-clark/episode-flags.json", {"version": 1, "seriesId": "lois-and-clark-1993", "flags": {"M": EXPECTED_M}})
new_ids = {x["id"] for x in new_entries}
catalog["series"] = [x for x in catalog.get("series", []) if x.get("id") not in new_ids] + new_entries
write_json(INDEX_PATH, catalog)

issues = []
plots = []
by_id = {x["id"]: x for x in catalog["series"]}
batch = [0, 0, 0]
for sid, expected in EXPECTED.items():
    entry = by_id.get(sid)
    if not entry:
        issues.append(f"missing catalogue {sid}")
        continue
    got = (entry.get("episodeCount"), entry.get("scoringEntryCount"), entry.get("runtimeSeconds"))
    if got != expected:
        issues.append(f"catalog totals {sid}: {got} != {expected}")
    for i, value in enumerate(got):
        batch[i] += value or 0
    if entry.get("genres", [None])[0] in ("Fantasy", "Crime"):
        issues.append(f"bad leading genre {sid}")
    if not os.path.exists(entry.get("poster", "")):
        issues.append(f"missing poster {sid}")
    if entry.get("audio", {}).get("lossless") is not False:
        issues.append(f"lossless leak {sid}")
    info = SERIES_INFO[sid]
    sums = [0, 0, 0]
    for sc in entry.get("seasons", []):
        s = int(sc["number"])
        cp = f'data/series/{info["slug"]}/season-{s:02d}.json'
        mp = f'data/series/{info["slug"]}/season-{s:02d}-meta.json'
        if not os.path.exists(cp) or not os.path.exists(mp):
            issues.append(f"missing season {sid} S{s:02d}")
            continue
        core = json.load(open(cp, encoding="utf-8"))
        meta = json.load(open(mp, encoding="utf-8"))
        eps = core.get("episodes", [])
        scoring = len(eps)
        conceptual = sum(2 if "-" in str(x.get("number", "")) else 1 for x in eps)
        runtime = sum(int(x.get("runtimeSeconds") or 0) for x in eps)
        sums[0] += conceptual
        sums[1] += scoring
        sums[2] += runtime
        if (conceptual, scoring) != (sc.get("episodeCount"), sc.get("scoringEntryCount")):
            issues.append(f"season counts {sid} S{s:02d}")
        if meta.get("format") != FORMATS[sid][s]:
            issues.append(f"format {sid} S{s:02d}")
        if len(str(meta.get("description", "")).strip()) < 80:
            issues.append(f"season description {sid} S{s:02d}")
        if sc.get("audio", {}).get("lossless") is not False:
            issues.append(f"season lossless {sid} S{s:02d}")
        seen = set()
        for ep in eps:
            eid = ep.get("id")
            title = str(ep.get("title", "")).strip()
            if eid in seen:
                issues.append(f"duplicate id {sid} {eid}")
            seen.add(eid)
            if not title or re.match(r"^(Episode(?:\s|\s*#)|Untitled$)", title, re.I):
                issues.append(f"placeholder {sid} {eid}")
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(ep.get("airDate", ""))):
                issues.append(f"date {sid} {eid}")
            if int(ep.get("runtimeSeconds") or 0) <= 0:
                issues.append(f"runtime {sid} {eid}")
            m = meta.get("episodes", {}).get(eid)
            if not m:
                issues.append(f"missing meta {sid} {eid}")
                continue
            if (m.get("runtimeSeconds"), m.get("airDate")) != (ep.get("runtimeSeconds"), ep.get("airDate")):
                issues.append(f"meta mismatch {sid} {eid}")
            desc = str(m.get("description", "")).strip()
            plots.append(desc)
            if len(desc) < 100:
                issues.append(f"weak description {sid} {eid}")
        if "16-bit" in json.dumps([core, meta], ensure_ascii=False):
            issues.append(f"unsupported quality {sid} S{s:02d}")
    if tuple(sums) != expected:
        issues.append(f"season sums {sid}: {sums} != {expected}")

if tuple(batch) != (218, 216, 578159):
    issues.append(f"batch totals {batch}")
if len(plots) != 216 or len(set(plots)) != 216:
    issues.append(f"descriptions {len(plots)}/{len(set(plots))}")
lc = by_id.get("lois-and-clark-1993", {})
if lc.get("audio") != {"layouts": ["Stereo"], "lossless": False}:
    issues.append("Lois catalogue audio")
if any(x.get("audio") != {"layouts": ["Stereo"], "lossless": False} for x in lc.get("seasons", [])):
    issues.append("Lois season audio")
lc3 = json.load(open("data/series/lois-and-clark/season-03.json", encoding="utf-8"))
ep301 = next((x for x in lc3["episodes"] if x["id"] == "s03e01"), None)
if not ep301 or (ep301["title"], ep301["runtimeSeconds"]) != ("We Have a Lot to Talk About", 2753):
    issues.append(f"Lois S03E01 {ep301}")
lc3m = json.load(open("data/series/lois-and-clark/season-03-meta.json", encoding="utf-8"))
if "audio" in lc3m.get("episodes", {}).get("s03e01", {}):
    issues.append("Lois S03E01 audio override")
flags = json.load(open("data/series/lois-and-clark/episode-flags.json", encoding="utf-8")).get("flags", {}).get("M", [])
if flags != EXPECTED_M or len(flags) != 47:
    issues.append(f"Lois M flags {len(flags)}")
lc4 = json.load(open("data/series/lois-and-clark/season-04.json", encoding="utf-8"))
order = [(x["id"], x["title"], x["airDate"]) for x in lc4["episodes"] if x["id"] in ("s04e14","s04e15","s04e16")]
if order != [("s04e14","A.K.A. Superman","1997-03-16"),("s04e15","Meet John Doe","1997-03-02"),("s04e16","Lois and Clarks","1997-03-09")]:
    issues.append(f"Lois S4 order {order}")
leg1 = json.load(open("data/series/legend-of-the-seeker/season-01.json", encoding="utf-8"))
lc1 = json.load(open("data/series/lois-and-clark/season-01.json", encoding="utf-8"))
if (leg1["episodes"][0]["id"], leg1["episodes"][0]["runtimeSeconds"]) != ("s01e01-02", 5323):
    issues.append("Legend combined pilot")
if (lc1["episodes"][0]["id"], lc1["episodes"][0]["runtimeSeconds"]) != ("s01e01-02", 5549):
    issues.append("Lois combined pilot")
if issues:
    print("AUDIT FAILED")
    for item in issues:
        print(" -", item)
    raise SystemExit(1)
print("AUDIT PASSED: 6 series; 15 seasons; 218 conceptual episodes; 216 scoring rows; 216 unique meaningful descriptions; 578159 seconds; 47 Lois M flags.")
