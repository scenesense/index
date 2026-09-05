from pathlib import Path
import json,re,sys

AMP=chr(38)
errors=[]

def scan_value(value,path,file):
    if isinstance(value,dict):
        for k,v in value.items(): scan_value(v,path+[str(k)],file)
    elif isinstance(value,list):
        for i,v in enumerate(value): scan_value(v,path+[str(i)],file)
    elif isinstance(value,str) and AMP in value:
        errors.append(f"{file}: {'.'.join(path)} -> {value}")

production_json=[]
for p in [Path('data/movies.json'),Path('data/movies-additions-20260830.json'),Path('data/series/index.json'),Path('data/series/index-additions.json')]:
    if p.exists(): production_json.append(p)
production_json.extend(sorted(Path('data/series').rglob('*.json')))

seen=set()
for p in production_json:
    if p in seen: continue
    seen.add(p)
    try:
        data=json.loads(p.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{p}: JSON parse failure: {exc}')
        continue
    scan_value(data,[],p)

p=Path('categories.js')
if p.exists() and AMP in p.read_text(encoding='utf-8'):
    for n,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
        if AMP in line: errors.append(f'{p}:{n}: {line.strip()}')

for p in Path('.').glob('*.html'):
    text=p.read_text(encoding='utf-8')
    for n,line in enumerate(text.splitlines(),1):
        for m in re.finditer(r'>([^<>]*'+re.escape(AMP)+r'[^<>]*)<',line):
            errors.append(f'{p}:{n}: {m.group(1).strip()}')

if errors:
    print('VISIBLE AMPERSAND POLICY FAILED')
    for e in errors: print(e)
    sys.exit(1)
print(f'VISIBLE AMPERSAND POLICY PASSED: {len(seen)} production JSON files + categories.js + HTML text nodes contain zero user-visible ampersands.')
