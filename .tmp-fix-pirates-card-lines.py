from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old_css = '.piratesMainNarrow{display:block!important;width:111.112%!important;white-space:nowrap!important;overflow:visible!important;transform:scaleX(.9);transform-origin:left center}.piratesSubtitleNarrow{display:block!important;width:106.383%!important;white-space:nowrap!important;overflow:visible!important;transform:scaleX(.94);transform-origin:left center}'
new_css = old_css + '.piratesCardLine{display:block!important;width:max-content!important;max-width:none!important;white-space:nowrap!important;overflow:visible!important;transform-origin:left center!important}'
if old_css not in s:
    raise SystemExit('Expected Pirates detail CSS not found')
s = s.replace(old_css, new_css, 1)

old_fit = 'function fitCardLine(row,minSize=10){if(!row||row.dataset.noFit==="1")return;row.style.fontSize="";const base=parseFloat(getComputedStyle(row).fontSize)||17;if(row.scrollWidth>row.clientWidth&&row.clientWidth>0){row.style.fontSize=`${Math.max(minSize,base*(row.clientWidth/row.scrollWidth)*.99)}px`}}'
new_fit = 'function fitPiratesCardLine(row){if(!row)return;row.style.fontSize="";row.style.transform="none";const info=row.closest(".cardInfo");if(!info)return;const cs=getComputedStyle(info),available=info.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0),natural=row.scrollWidth;if(natural>available&&available>0){row.style.transform=`scaleX(${available/natural})`}}function fitCardLine(row,minSize=10){if(!row)return;if(row.classList.contains("piratesCardLine")){fitPiratesCardLine(row);return}if(row.dataset.noFit==="1")return;row.style.fontSize="";const base=parseFloat(getComputedStyle(row).fontSize)||17;if(row.scrollWidth>row.clientWidth&&row.clientWidth>0){row.style.fontSize=`${Math.max(minSize,base*(row.clientWidth/row.scrollWidth)*.99)}px`}}'
if old_fit not in s:
    raise SystemExit('Expected fitCardLine implementation not found')
s = s.replace(old_fit, new_fit, 1)

old_decorate = 'function decorateLibraryCards(){document.querySelectorAll(".movieCard").forEach(card=>{const movie=movieById(card.dataset.movie);if(!movie)return;const info=card.querySelector(".cardInfo"),title=card.querySelector(".cardTitle"),meta=card.querySelector(".cardMeta");if(!info||!title||!meta)return;const parts=splitDisplayTitle(movie.title);title.textContent=parts.main;title.classList.remove("piratesMainNarrow");delete title.dataset.noFit;requestAnimationFrame(()=>fitCardLine(title,11));let subtitle=info.querySelector(".cardSubtitle");if(parts.subtitle){if(!subtitle){subtitle=document.createElement("div");subtitle.className="cardSubtitle";meta.before(subtitle)}subtitle.textContent=parts.subtitle;subtitle.classList.remove("piratesSubtitleNarrow");delete subtitle.dataset.noFit;requestAnimationFrame(()=>fitCardLine(subtitle,10))}else if(subtitle){subtitle.remove()}let genreRow=info.querySelector(".cardGenres");if(!genreRow){genreRow=document.createElement("div");genreRow.className="cardGenres"}meta.innerHTML=cardMetaMarkup(movie);requestAnimationFrame(()=>fitCardLine(meta,9));meta.after(genreRow);fitCardGenres(genreRow,movie)})}'
new_decorate = 'function decorateLibraryCards(){document.querySelectorAll(".movieCard").forEach(card=>{const movie=movieById(card.dataset.movie);if(!movie)return;const info=card.querySelector(".cardInfo"),title=card.querySelector(".cardTitle"),meta=card.querySelector(".cardMeta");if(!info||!title||!meta)return;const parts=splitDisplayTitle(movie.title),isPirates=movie.id==="pirates-of-the-caribbean-2003";title.textContent=parts.main;title.classList.remove("piratesMainNarrow");title.classList.toggle("piratesCardLine",isPirates);delete title.dataset.noFit;requestAnimationFrame(()=>fitCardLine(title,11));let subtitle=info.querySelector(".cardSubtitle");if(parts.subtitle){if(!subtitle){subtitle=document.createElement("div");subtitle.className="cardSubtitle";meta.before(subtitle)}subtitle.textContent=parts.subtitle;subtitle.classList.remove("piratesSubtitleNarrow");subtitle.classList.toggle("piratesCardLine",isPirates);delete subtitle.dataset.noFit;requestAnimationFrame(()=>fitCardLine(subtitle,10))}else if(subtitle){subtitle.remove()}let genreRow=info.querySelector(".cardGenres");if(!genreRow){genreRow=document.createElement("div");genreRow.className="cardGenres"}meta.innerHTML=cardMetaMarkup(movie);requestAnimationFrame(()=>fitCardLine(meta,9));meta.after(genreRow);fitCardGenres(genreRow,movie)})}'
if old_decorate not in s:
    raise SystemExit('Expected decorateLibraryCards implementation not found')
s = s.replace(old_decorate, new_decorate, 1)

p.write_text(s, encoding='utf-8')
print('Pirates card repair: restored strict one-line main title and subtitle; each line now scales only as much as needed to reach the same card-content right edge used by normal series titles.')
