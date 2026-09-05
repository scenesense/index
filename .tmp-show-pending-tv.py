#!/usr/bin/env python3
import json
from pathlib import Path

META=Path('data/series/jeremy-clarksons-millionaire/season-11-meta.json')
ENH=Path('series-tv-enhancements.js')
GUIDE=Path('TV_SERIES_INTEGRATION_GUIDE.md')

meta=json.loads(META.read_text(encoding='utf-8'))
assert meta['seriesId']=='jeremy-clarksons-millionaire-2018' and meta['season']==11
assert 'pendingEpisodes' not in meta
meta['pendingEpisodes']=[
    {'number':'07','airDate':'2026-07-14','label':'ITVX Broadcast','status':'NOT HELD'},
    {'number':'08','airDate':'2026-07-16','label':'ITVX Broadcast','status':'NOT HELD'}
]
META.write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

js=ENH.read_text(encoding='utf-8')
style_anchor='''    .episodeCard{grid-template-columns:68px minmax(0,1fr) auto!important;column-gap:20px!important;min-height:48px!important;padding:7px 11px!important;border-radius:9px!important}\n'''
style_add='''    .episodeCard{grid-template-columns:68px minmax(0,1fr) auto!important;column-gap:20px!important;min-height:48px!important;padding:7px 11px!important;border-radius:9px!important}\n    .pendingEpisodeCard{cursor:default!important;opacity:.72!important}\n    .pendingEpisodeCard .episodeTitle{color:#c9cdd3!important}\n    .pendingEpisodeStatus{color:rgba(201,205,211,.46)!important;font-size:18px!important}\n'''
assert style_anchor in js
js=js.replace(style_anchor,style_add,1)

old='''  const episodeGrid=body.querySelector(".episodeGrid");\n  if(episodeGrid && !body.querySelector(".tvBottomBack")){\n'''
new='''  const episodeGrid=body.querySelector(".episodeGrid");\n  const pendingEpisodes=Array.isArray(presentation?.pendingEpisodes) ? presentation.pendingEpisodes : [];\n  if(episodeGrid && pendingEpisodes.length){\n    pendingEpisodes.forEach(item=>{\n      const card=document.createElement("div");\n      card.className="episodeCard pendingEpisodeCard";\n      const label=String(item?.label || "Pending broadcast");\n      const facts=[tvFormatAirDate(item?.airDate), String(item?.status || "NOT HELD")].filter(Boolean);\n      card.innerHTML=`<div class="episodeCode">${tvEpisodeCodeMarkup(seasonData.season,item?.number)}</div><div><div class="episodeTitle">${escapeHtml(label)}</div>${facts.length?`<div class="episodeRuntime">${escapeHtml(facts.join(" · "))}</div>`:""}</div><div class="episodeScore pendingEpisodeStatus">—</div>`;\n      episodeGrid.appendChild(card);\n    });\n  }\n  if(episodeGrid && !body.querySelector(".tvBottomBack")){\n'''
assert old in js
js=js.replace(old,new,1)
ENH.write_text(js,encoding='utf-8')

guide=GUIDE.read_text(encoding='utf-8')
anchor='''If titles are derived rather than official, preserve that fact in working notes if needed, but **the UI still gets proper titles**.\n\n## External title audit rules\n'''
insert='''If titles are derived rather than official, preserve that fact in working notes if needed, but **the UI still gets proper titles**.\n\n## Confirmed broadcasts not yet held\n\nA confirmed broadcast that belongs to the collection but is **not yet held** is not a canonical scoring row and does not need a fabricated episode title, runtime or plot description. Store it in season presentation metadata as `pendingEpisodes`, for example:\n\n```json\n"pendingEpisodes": [\n  {"number":"07","airDate":"2026-07-14","label":"ITVX Broadcast","status":"NOT HELD"}\n]\n```\n\nRules:\n\n- pending broadcasts contribute to catalogue `episodeCount` but **not** `scoringEntryCount`\n- do not add them to the core season `episodes` array until the media is acquired and can be scored\n- do not invent runtime, question-derived title, description, audio or restoration format\n- the season page renders them as non-clickable pending rows with date/status\n- when acquired, remove the pending entry and add the normal core/meta episode row using authoritative collection metadata\n\nThis is distinct from a generic placeholder. It records a verified missing physical presentation without pretending unavailable episode content is known.\n\n## External title audit rules\n'''
assert anchor in guide
guide=guide.replace(anchor,insert,1)
GUIDE.write_text(guide,encoding='utf-8')

# Static audit of intended semantics.
meta2=json.loads(META.read_text(encoding='utf-8'))
assert meta2['pendingEpisodes']==[
    {'number':'07','airDate':'2026-07-14','label':'ITVX Broadcast','status':'NOT HELD'},
    {'number':'08','airDate':'2026-07-16','label':'ITVX Broadcast','status':'NOT HELD'}
]
core=json.loads(Path('data/series/jeremy-clarksons-millionaire/season-11.json').read_text(encoding='utf-8'))
assert len(core['episodes'])==6
idx=json.loads(Path('data/series/index.json').read_text(encoding='utf-8'))
s=next(x for x in idx['series'] if x['id']=='jeremy-clarksons-millionaire-2018')
s11=next(x for x in s['seasons'] if x['number']==11)
assert s11['episodeCount']==8 and s11['scoringEntryCount']==6
js2=ENH.read_text(encoding='utf-8')
assert 'pendingEpisodes=Array.isArray(presentation?.pendingEpisodes)' in js2
assert 'pendingEpisodeCard' in js2
assert 'episodeGrid.appendChild(card)' in js2
assert 'Confirmed broadcasts not yet held' in GUIDE.read_text(encoding='utf-8')
print('PENDING TV AUDIT PASSED: S11 shows E07/E08 as non-clickable NOT HELD rows; scoring remains 6 rows.')
