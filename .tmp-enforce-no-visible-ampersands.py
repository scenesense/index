from pathlib import Path
import json,re

AMP=chr(38)
ROOT=Path('.')

# 1) Remove every currently stored ampersand from production TV JSON while preserving file formatting.
changed=[]
for p in sorted(Path('data/series').rglob('*.json')):
    text=p.read_text(encoding='utf-8')
    if AMP not in text:
        continue
    before=text.count(AMP)
    text=text.replace(' '+AMP+' ',' and ')
    if AMP in text:
        raise SystemExit(f'Unhandled ampersand form remains in {p}')
    p.write_text(text,encoding='utf-8')
    changed.append((str(p),before))

# 2) Remove all visible rubric-heading ampersands. categories.js has no technical ampersand syntax.
p=Path('categories.js')
text=p.read_text(encoding='utf-8')
before=text.count(AMP)
text=text.replace(' '+AMP+' ',' and ')
if AMP in text:
    raise SystemExit('Unhandled ampersand remains in categories.js')
p.write_text(text,encoding='utf-8')
changed.append((str(p),before))

# 3) Strengthen permanent project documentation without relying on external-database punctuation.
tv=Path('TV_SERIES_INTEGRATION_GUIDE.md')
t=tv.read_text(encoding='utf-8')
old='''### Visible-title punctuation — hard rule\n\n- **Ampersands are not allowed in visible series or episode titles. Always write `and`, never `&`.**\n- Apply this to canonical titles, card titles, detail titles and episode titles.\n- Do not re-import an ampersand from IMDb, TMDb, TVMaze, Wikipedia, broadcaster metadata or poster copy.\n'''
new='''### Visible-text punctuation — hard rule\n\n- **The ampersand character (U+0026) is forbidden in all user-visible SceneSense text. Always write `and`.**\n- This applies to series titles, movie titles, card titles, detail titles, episode titles, category headings, descriptions, labels, metadata copy and any other text rendered to the user.\n- External sources never have punctuation authority here. IMDb, TMDb, TVMaze, Wikipedia, broadcaster metadata, poster copy and similar sources must be normalized before SceneSense data is written.\n- **A title audit is invalid if it copies an ampersand from a generic database. Episode identity may come from verification; punctuation must still obey SceneSense house style.**\n- Before every TV integration commit, run the repository visible-text validator and treat any failure as a release blocker.\n'''
if old not in t:
    raise SystemExit('TV guide punctuation block not found')
t=t.replace(old,new)
tv.write_text(t,encoding='utf-8')

handoff=Path('SCENESENSE_HANDOFF.md')
h=handoff.read_text(encoding='utf-8')
anchor='''6. For `data/movies.json`, preserve all newer ratings and fields. Never overwrite it from a stale local/chat copy.\n'''
insert='''6. For `data/movies.json`, preserve all newer ratings and fields. Never overwrite it from a stale local/chat copy.\n7. **Global visible-text rule: the ampersand character (U+0026) is forbidden everywhere the site can display text. Write `and` instead, including when importing or matching titles from external databases. Run `python scripts/validate-visible-ampersands.py` before committing content changes.**\n'''
if anchor not in h:
    raise SystemExit('Handoff insertion anchor not found')
h=h.replace(anchor,insert,1)
handoff.write_text(h,encoding='utf-8')

# 4) Permanent validator. It scans production JSON string values, the canonical rubric, and actual HTML text nodes.
scripts=Path('scripts'); scripts.mkdir(exist_ok=True)
validator=scripts/'validate-visible-ampersands.py'
validator.write_text('''from pathlib import Path\nimport json,re,sys\n\nAMP=chr(38)\nerrors=[]\n\ndef scan_value(value,path,file):\n    if isinstance(value,dict):\n        for k,v in value.items(): scan_value(v,path+[str(k)],file)\n    elif isinstance(value,list):\n        for i,v in enumerate(value): scan_value(v,path+[str(i)],file)\n    elif isinstance(value,str) and AMP in value:\n        errors.append(f"{file}: {'.'.join(path)} -> {value}")\n\nproduction_json=[]\nfor p in [Path('data/movies.json'),Path('data/movies-additions-20260830.json'),Path('data/series/index.json'),Path('data/series/index-additions.json')]:\n    if p.exists(): production_json.append(p)\nproduction_json.extend(sorted(Path('data/series').rglob('*.json')))\n\nseen=set()\nfor p in production_json:\n    if p in seen: continue\n    seen.add(p)\n    try:\n        data=json.loads(p.read_text(encoding='utf-8'))\n    except Exception as exc:\n        errors.append(f'{p}: JSON parse failure: {exc}')\n        continue\n    scan_value(data,[],p)\n\np=Path('categories.js')\nif p.exists() and AMP in p.read_text(encoding='utf-8'):\n    for n,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):\n        if AMP in line: errors.append(f'{p}:{n}: {line.strip()}')\n\nfor p in Path('.').glob('*.html'):\n    text=p.read_text(encoding='utf-8')\n    for n,line in enumerate(text.splitlines(),1):\n        for m in re.finditer(r'>([^<>]*'+re.escape(AMP)+r'[^<>]*)<',line):\n            errors.append(f'{p}:{n}: {m.group(1).strip()}')\n\nif errors:\n    print('VISIBLE AMPERSAND POLICY FAILED')\n    for e in errors: print(e)\n    sys.exit(1)\nprint(f'VISIBLE AMPERSAND POLICY PASSED: {len(seen)} production JSON files + categories.js + HTML text nodes contain zero user-visible ampersands.')\n''',encoding='utf-8')

# Remove one-shot trigger if present so it cannot survive the cleanup commit.
Path('.tmp-no-ampersand-trigger.txt').unlink(missing_ok=True)

# 5) Full local audit before commit.
exec(compile(validator.read_text(encoding='utf-8'),str(validator),'exec'),{'__name__':'__main__'})

print('CHANGED CONTENT FILES:')
for name,count in changed:
    print(f'{name}: replaced {count}')
print('POLICY DOCS AND PERMANENT VALIDATOR UPDATED')
