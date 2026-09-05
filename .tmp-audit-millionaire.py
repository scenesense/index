#!/usr/bin/env python3
import json, hashlib, re
from pathlib import Path

SID="jeremy-clarksons-millionaire-2018"
F=Path("data/series/jeremy-clarksons-millionaire")
idx=json.loads(Path("data/series/index.json").read_text(encoding="utf-8"))
matches=[s for s in idx["series"] if s.get("id")==SID]
assert len(matches)==1
s=matches[0]
assert s["title"]=="Jeremy Clarkson's Millionaire"
assert s["yearStart"]==2018 and s["yearEnd"]==2026
assert s["seasonCount"]==11
assert s["episodeCount"]==114 and s["scoringEntryCount"]==112
assert s["runtimeSeconds"]==316287
assert s["genres"]==["Game Show"]
assert s["actors"]==["Jeremy Clarkson"]
assert s["audio"]=={"layouts":["Stereo"],"lossless":False}
assert s["poster"]=="assets/posters/jeremy-clarksons-millionaire-2018.webp"
assert Path(s["poster"]).is_file()
assert "14 and 16 July 2026" in s["collectionScope"]
assert len(s["seasons"])==11
assert [x["number"] for x in s["seasons"]]==list(range(1,12))
assert sum(x["episodeCount"] for x in s["seasons"])==114
assert sum(x["scoringEntryCount"] for x in s["seasons"])==112
assert s["seasons"][-1]["episodeCount"]==8
assert s["seasons"][-1]["scoringEntryCount"]==6

expected_counts={1:7,2:11,3:11,4:10,5:7,6:13,7:5,8:14,9:11,10:17,11:6}
expected_runtime={1:19349,2:30645,3:31486,4:31263,5:19555,6:36657,7:13855,8:38558,9:30785,10:47566,11:16568}
identity=[]
descriptions=[]
season_meta=[]
runtime=0
for sn in range(1,12):
    cp=F/f"season-{sn:02d}.json"
    mp=F/f"season-{sn:02d}-meta.json"
    assert cp.is_file() and mp.is_file()
    c=json.loads(cp.read_text(encoding="utf-8"))
    m=json.loads(mp.read_text(encoding="utf-8"))
    assert c["seriesId"]==SID and m["seriesId"]==SID
    assert c["season"]==sn and m["season"]==sn
    assert c["seasonRatings"]=={}
    assert len(c["episodes"])==len(m["episodes"])==expected_counts[sn]
    assert "format" not in m
    season_meta.append({"season":sn,"description":m["description"],"source":m["source"]})
    sr=0
    for i,ep in enumerate(c["episodes"],1):
        eid=f"s{sn:02d}e{i:02d}"
        assert ep["id"]==eid and ep["number"]==f"{i:02d}"
        assert ep["ratings"]=={}
        assert not ep.get("placeholder")
        assert "&" not in ep["title"]
        assert not re.fullmatch(r"(?:Episode(?:\s+#?\d+(?:\.\d+)?)?|Untitled|TBA.*)",ep["title"],re.I)
        em=m["episodes"][eid]
        assert ep["airDate"]==em["airDate"]
        assert ep["runtimeSeconds"]==em["runtimeSeconds"]
        assert len(em["description"])>=100
        identity.append({"season":sn,"number":ep["number"],"title":ep["title"],"airDate":ep["airDate"],"runtimeSeconds":ep["runtimeSeconds"]})
        descriptions.append({"season":sn,"id":eid,"description":em["description"]})
        runtime+=ep["runtimeSeconds"]
        sr+=ep["runtimeSeconds"]
    assert sr==expected_runtime[sn]

def h(obj):
    return hashlib.sha256(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")).hexdigest()

assert h(identity)=="471b0992255da89889403459a893e6cef5a0e3911109d92808c8485e9d42d5c1"
assert h(descriptions)=="8d71ad8118db3c1267bcc467fd0c297418b2f0b54f113954bc6facb025525b2b"
assert h(season_meta)=="a70e372350e98637e14914fddd8c137cc25db676a81ed119def817710035e7bf"
assert runtime==316287
assert len(identity)==len({x["title"] for x in identity})==112
assert len(descriptions)==len({x["description"] for x in descriptions})==112

c8=json.loads((F/"season-08.json").read_text(encoding="utf-8"))
assert c8["episodes"][10]["id"]=="s08e11" and c8["episodes"][10]["title"]=="The Hindenburg"
c10=json.loads((F/"season-10.json").read_text(encoding="utf-8"))
assert c10["episodes"][12]["id"]=="s10e13" and c10["episodes"][12]["title"]=="Precognition"
c11=json.loads((F/"season-11.json").read_text(encoding="utf-8"))
assert [e["id"] for e in c11["episodes"]]==[f"s11e{i:02d}" for i in range(1,7)]
assert c11["episodes"][0]["title"]=="Orient Express"
assert c11["episodes"][-1]["title"]=="Caledonia"
assert c11["episodes"][-1]["airDate"]=="2026-06-07"

guide=Path("TV_SERIES_INTEGRATION_GUIDE.md").read_text(encoding="utf-8")
assert "`Documentary` and `Game Show` are deliberate" in guide
for p in [".tmp-millionaire-source.json",".tmp-integrate-millionaire.py",".github/workflows/integrate-millionaire.yml"]:
    assert not Path(p).exists()

print("POST-WRITE MILLIONAIRE AUDIT PASSED: committed state = 11 normalized seasons / 114 conceptual / 112 scoring / 112 exact titles / 112 exact descriptions / 316287 seconds / Stereo perceptual / S11 8 conceptual, 6 held.")
