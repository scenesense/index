import base64,gzip,hashlib,json,os,re

PAYLOAD='.tmp-tv-batch-payload.b64'
EXPECTED_SHA='fed375a715de5f2619b596a6f34e3f68ecd185addc6a05935968155fea3260dc'
EXPECTED={
 'kevin-from-work-2015':(10,10,12693),
 'the-law-according-to-lidia-poet-2023':(18,18,54443),
 'eva-lasting-2023':(45,45,121519),
 'last-resort-2012':(13,13,33508),
 'legend-of-the-seeker-2008':(44,43,114365),
 'lois-and-clark-1993':(88,87,241631),
}
FORMATS={
 'kevin-from-work-2015':{1:'SiLVER70'},
 'the-law-according-to-lidia-poet-2023':{1:'CLARiTY70',2:'CLARiTY35',3:'CLARiTY35'},
 'eva-lasting-2023':{1:'CLARiTY35',2:'CLARiTY35',3:'CLARiTY35',4:'CLARiTY35'},
 'last-resort-2012':{1:'SiLVER70'},
 'legend-of-the-seeker-2008':{1:'SiLVER70',2:'SiLVER70'},
 'lois-and-clark-1993':{1:'SiLVER70',2:'SiLVER70',3:'SiLVER70',4:'SiLVER70'},
}
EXPECTED_M=['s01e01-02','s01e03','s01e04','s01e06','s01e07','s01e09','s01e10','s01e11','s01e12','s01e13','s01e14','s01e16','s01e17','s01e18','s01e19','s01e20','s01e21','s01e22','s02e01','s02e03','s02e04','s02e05','s02e06','s02e10','s02e12','s02e13','s02e14','s02e16','s02e17','s02e18','s02e19','s02e20','s02e21','s02e22','s03e01','s03e06','s03e07','s03e14','s03e15','s03e16','s03e17','s03e18','s03e19','s04e04','s04e14','s04e15','s04e16']

blob=base64.b64decode(open(PAYLOAD,encoding='ascii').read().strip())
raw=gzip.decompress(blob)
sha=hashlib.sha256(raw).hexdigest()
if sha!=EXPECTED_SHA: raise SystemExit(f'PAYLOAD CHECKSUM FAILED: {sha}')
payload=json.loads(raw.decode('utf-8'))
files=payload['files']; new_entries=payload['catalogEntries']

for path,content in files.items():
 os.makedirs(os.path.dirname(path),exist_ok=True)
 with open(path,'w',encoding='utf-8',newline='\n') as f:f.write(content)

index_path='data/series/index-additions.json'
catalog=json.load(open(index_path,encoding='utf-8'))
new_ids={e['id'] for e in new_entries}
catalog['series']=[e for e in catalog.get('series',[]) if e.get('id') not in new_ids]+new_entries
with open(index_path,'w',encoding='utf-8',newline='\n') as f:
 json.dump(catalog,f,ensure_ascii=False,separators=(',',':'));f.write('\n')

issues=[];plots=[];by_id={e['id']:e for e in catalog['series']}; bt=[0,0,0]
for sid,(ec,es,er) in EXPECTED.items():
 e=by_id.get(sid)
 if not e: issues.append(f'missing catalogue {sid}');continue
 got=(e.get('episodeCount'),e.get('scoringEntryCount'),e.get('runtimeSeconds'))
 if got!=(ec,es,er):issues.append(f'catalog totals {sid}: {got}')
 for i,v in enumerate(got):bt[i]+=v or 0
 if e.get('genres',[None])[0] in ('Fantasy','Crime'):issues.append(f'bad leading genre {sid}')
 if not os.path.exists(e.get('poster','')):issues.append(f'missing poster {sid}')
 if e.get('audio',{}).get('lossless') is not False:issues.append(f'lossless leak {sid}')
 folder=re.sub(r'-\d{4}$','',sid); st=[0,0,0]
 for season in e.get('seasons',[]):
  s=int(season['number']); cp=f'data/series/{folder}/season-{s:02d}.json'; mp=f'data/series/{folder}/season-{s:02d}-meta.json'
  if not os.path.exists(cp) or not os.path.exists(mp):issues.append(f'missing season {sid} S{s:02d}');continue
  core=json.load(open(cp,encoding='utf-8'));meta=json.load(open(mp,encoding='utf-8'));eps=core.get('episodes',[])
  sc=len(eps);co=sum(2 if '-' in str(x.get('number','')) else 1 for x in eps);rt=sum(int(x.get('runtimeSeconds') or 0) for x in eps)
  st[0]+=co;st[1]+=sc;st[2]+=rt
  if (co,sc)!=(season.get('episodeCount'),season.get('scoringEntryCount')):issues.append(f'season counts {sid} S{s:02d}')
  if meta.get('format')!=FORMATS[sid][s]:issues.append(f'format {sid} S{s:02d}')
  if len(str(meta.get('description','')).strip())<80:issues.append(f'season description {sid} S{s:02d}')
  if season.get('audio',{}).get('lossless') is not False:issues.append(f'season lossless {sid} S{s:02d}')
  seen=set()
  for ep in eps:
   eid=ep.get('id');title=str(ep.get('title','')).strip()
   if eid in seen:issues.append(f'duplicate id {sid} {eid}')
   seen.add(eid)
   if not title or re.match(r'^(Episode(?:\s|\s*#)|Untitled$)',title,re.I):issues.append(f'placeholder {sid} {eid}')
   if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(ep.get('airDate',''))):issues.append(f'date {sid} {eid}')
   if int(ep.get('runtimeSeconds') or 0)<=0:issues.append(f'runtime {sid} {eid}')
   m=meta.get('episodes',{}).get(eid)
   if not m:issues.append(f'missing meta {sid} {eid}');continue
   if (m.get('runtimeSeconds'),m.get('airDate'))!=(ep.get('runtimeSeconds'),ep.get('airDate')):issues.append(f'meta mismatch {sid} {eid}')
   d=str(m.get('description','')).strip();plots.append(d)
   if len(d)<100:issues.append(f'weak description {sid} {eid}')
  if '16-bit' in json.dumps([core,meta],ensure_ascii=False):issues.append(f'unsupported quality {sid} S{s:02d}')
 if tuple(st)!=(ec,es,er):issues.append(f'season sums {sid}: {st}')

if tuple(bt)!=(218,216,578159):issues.append(f'batch totals {bt}')
if len(plots)!=216 or len(set(plots))!=216:issues.append(f'descriptions {len(plots)}/{len(set(plots))}')
lc=by_id.get('lois-and-clark-1993',{})
if lc.get('audio')!={'layouts':['Stereo'],'lossless':False}:issues.append('Lois catalogue audio')
if any(s.get('audio')!={'layouts':['Stereo'],'lossless':False} for s in lc.get('seasons',[])):issues.append('Lois season audio')
lc3=json.load(open('data/series/lois-and-clark/season-03.json',encoding='utf-8')); ep301=next((x for x in lc3['episodes'] if x['id']=='s03e01'),None)
if not ep301 or (ep301['title'],ep301['runtimeSeconds'])!=('We Have a Lot to Talk About',2753):issues.append(f'Lois S03E01 {ep301}')
lc3m=json.load(open('data/series/lois-and-clark/season-03-meta.json',encoding='utf-8'))
if 'audio' in lc3m.get('episodes',{}).get('s03e01',{}):issues.append('Lois S03E01 audio override')
flags=json.load(open('data/series/lois-and-clark/episode-flags.json',encoding='utf-8')).get('flags',{}).get('M',[])
if flags!=EXPECTED_M or len(flags)!=47:issues.append(f'Lois M flags {len(flags)}')
lc4=json.load(open('data/series/lois-and-clark/season-04.json',encoding='utf-8'))
order=[(x['id'],x['title'],x['airDate']) for x in lc4['episodes'] if x['id'] in ('s04e14','s04e15','s04e16')]
if order!=[('s04e14','A.K.A. Superman','1997-03-16'),('s04e15','Meet John Doe','1997-03-02'),('s04e16','Lois and Clarks','1997-03-09')]:issues.append(f'Lois S4 order {order}')
leg1=json.load(open('data/series/legend-of-the-seeker/season-01.json',encoding='utf-8'))
lc1=json.load(open('data/series/lois-and-clark/season-01.json',encoding='utf-8'))
if (leg1['episodes'][0]['id'],leg1['episodes'][0]['runtimeSeconds'])!=('s01e01-02',5323):issues.append('Legend combined pilot')
if (lc1['episodes'][0]['id'],lc1['episodes'][0]['runtimeSeconds'])!=('s01e01-02',5549):issues.append('Lois combined pilot')
if issues:
 print('AUDIT FAILED');[print(' -',x) for x in issues];raise SystemExit(1)
print('AUDIT PASSED: 6 series; 15 seasons; 218 conceptual episodes; 216 scoring rows; 216 unique meaningful descriptions; 578159 seconds; 47 Lois M flags.')
