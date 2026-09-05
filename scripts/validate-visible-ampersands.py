from pathlib import Path
import json,re,sys

AMP=chr(38)
errors=[]


def scan_value(value,path,file):
    if isinstance(value,dict):
        for k,v in value.items():
            scan_value(v,path+[str(k)],file)
    elif isinstance(value,list):
        for i,v in enumerate(value):
            scan_value(v,path+[str(i)],file)
    elif isinstance(value,str) and AMP in value:
        errors.append(f"{file}: {'.'.join(path)} -> {value}")


def quoted_strings(line):
    out=[]
    quote=None
    buf=[]
    escaped=False
    for ch in line:
        if quote is None:
            if ch in ('"',"'",'`'):
                quote=ch
                buf=[]
                escaped=False
            continue
        if escaped:
            buf.append(ch)
            escaped=False
            continue
        if ch=='\\':
            buf.append(ch)
            escaped=True
            continue
        if ch==quote:
            out.append(''.join(buf))
            quote=None
            buf=[]
            continue
        buf.append(ch)
    return out


production_json=[]
for p in [
    Path('data/movies.json'),
    Path('data/movies-additions-20260830.json'),
    Path('data/series/index.json'),
    Path('data/series/index-additions.json')
]:
    if p.exists():
        production_json.append(p)
production_json.extend(sorted(Path('data/series').rglob('*.json')))

seen=set()
for p in production_json:
    if p in seen:
        continue
    seen.add(p)
    try:
        data=json.loads(p.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{p}: JSON parse failure: {exc}')
        continue
    scan_value(data,[],p)

# Scan every JavaScript string literal, not just the canonical rubric. The only
# current technical exception is engine.js HTML escaping syntax, which is not UI copy.
js_files=sorted(Path('.').rglob('*.js'))
for p in js_files:
    if '.git' in p.parts:
        continue
    for n,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
        technical_escape=(
            p.name=='engine.js'
            and '&amp;' in line
            and '&lt;' in line
            and '&gt;' in line
            and '&quot;' in line
            and '&#39;' in line
        )
        if technical_escape:
            continue
        for s in quoted_strings(line):
            if AMP in s:
                errors.append(f'{p}:{n}: string -> {s}')

# HTML text nodes and quoted attributes/inline-script strings are checked. The
# Google Fonts stylesheet URL is a technical query string and the sole current exception.
html_files=sorted(Path('.').glob('*.html'))
for p in html_files:
    text=p.read_text(encoding='utf-8')
    for n,line in enumerate(text.splitlines(),1):
        for m in re.finditer(r'>([^<>]*'+re.escape(AMP)+r'[^<>]*)<',line):
            errors.append(f'{p}:{n}: text -> {m.group(1).strip()}')
        if 'fonts.googleapis.com/css2' in line:
            continue
        for s in quoted_strings(line):
            if AMP in s:
                errors.append(f'{p}:{n}: string -> {s}')

if errors:
    print('VISIBLE AMPERSAND POLICY FAILED')
    for e in errors:
        print(e)
    sys.exit(1)

print(
    'VISIBLE AMPERSAND POLICY PASSED: '
    f'{len(seen)} production JSON files + {len(js_files)} JavaScript files + '
    f'{len(html_files)} HTML files contain zero forbidden user-visible ampersands.'
)
