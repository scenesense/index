from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8')
old='''const parts=splitDisplayTitle(movie.title),isPirates=movie.id==="pirates-of-the-caribbean-2003";title.textContent=parts.main;title.classList.toggle("piratesMainNarrow",isPirates);if(isPirates)title.dataset.noFit="1";else delete title.dataset.noFit;requestAnimationFrame(()=>fitCardLine(title,11));let subtitle=info.querySelector(".cardSubtitle");if(parts.subtitle){if(!subtitle){subtitle=document.createElement("div");subtitle.className="cardSubtitle";meta.before(subtitle)}subtitle.textContent=parts.subtitle;subtitle.classList.toggle("piratesSubtitleNarrow",isPirates);if(isPirates)subtitle.dataset.noFit="1";else delete subtitle.dataset.noFit;requestAnimationFrame(()=>fitCardLine(subtitle,10))}else if(subtitle){subtitle.remove()}'''
new='''const parts=splitDisplayTitle(movie.title);title.textContent=parts.main;title.classList.remove("piratesMainNarrow");delete title.dataset.noFit;requestAnimationFrame(()=>fitCardLine(title,11));let subtitle=info.querySelector(".cardSubtitle");if(parts.subtitle){if(!subtitle){subtitle=document.createElement("div");subtitle.className="cardSubtitle";meta.before(subtitle)}subtitle.textContent=parts.subtitle;subtitle.classList.remove("piratesSubtitleNarrow");delete subtitle.dataset.noFit;requestAnimationFrame(()=>fitCardLine(subtitle,10))}else if(subtitle){subtitle.remove()}'''
if old not in text:
    raise SystemExit('Target Pirates library-card block not found; refusing broad edit')
if text.count(old)!=1:
    raise SystemExit(f'Expected one target block, found {text.count(old)}')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')
print('Pirates library title and subtitle now use the same full-width fit path as normal library card titles; detail-page special narrowing remains unchanged.')
