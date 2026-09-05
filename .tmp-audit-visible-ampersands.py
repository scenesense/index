from pathlib import Path
import json,re

ROOT=Path('.')
SKIP_PARTS={'.git','assets'}
BIN_EXT={'.zip','.webp','.png','.jpg','.jpeg','.gif','.ico','.woff','.woff2','.ttf','.pdf'}

json_hits=[]
string_hits=[]
html_hits=[]


def walk_json(v,path,file):
    if isinstance(v,dict):
        for k,x in v.items(): walk_json(x,path+[str(k)],file)
    elif isinstance(v,list):
        for i,x in enumerate(v): walk_json(x,path+[str(i)],file)
    elif isinstance(v,str) and '&' in v:
        json_hits.append((str(file),'.'.join(path),v))

for p in ROOT.rglob('*'):
    if not p.is_file() or any(part in SKIP_PARTS for part in p.parts) or p.suffix.lower() in BIN_EXT:
        continue
    try:
        text=p.read_text(encoding='utf-8')
    except Exception:
        continue
    if p.suffix.lower()=='.json':
        try:
            walk_json(json.loads(text),[],p)
        except Exception as e:
            print(f'JSON_PARSE_ERROR\t{p}\t{e}')
        continue
    if p.suffix.lower() in {'.js','.html'}:
        # quoted/template string candidates containing literal ampersands; ignore obvious code-only URLs/entities later by inspection
        pat=re.compile(r'(["\'`])((?:\\.|(?!\1).)*&(?:\\.|(?!\1).)*)\1')
        for n,line in enumerate(text.splitlines(),1):
            for m in pat.finditer(line):
                s=m.group(2)
                if '&&' in s: continue
                string_hits.append((str(p),n,s.strip()))
        if p.suffix.lower()=='.html':
            for n,line in enumerate(text.splitlines(),1):
                for m in re.finditer(r'>([^<>]*&[^<>]*)<',line):
                    html_hits.append((str(p),n,m.group(1).strip()))

print('=== JSON STRING VALUES CONTAINING AMPERSAND ===')
for h in json_hits: print('JSON\t'+'\t'.join(h))
print(f'JSON_COUNT={len(json_hits)}')
print('=== JS/HTML STRING LITERALS CONTAINING AMPERSAND ===')
for f,n,s in string_hits: print(f'STR\t{f}\t{n}\t{s}')
print(f'STR_COUNT={len(string_hits)}')
print('=== HTML TEXT NODES CONTAINING AMPERSAND ===')
for f,n,s in html_hits: print(f'HTML\t{f}\t{n}\t{s}')
print(f'HTML_COUNT={len(html_hits)}')
