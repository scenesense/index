let seriesCatalog = [];
let libraryMediaMode = "all";
let activeSeriesId = null;

function seriesById(id){ return seriesCatalog.find(series => series.id === id); }
function seriesYearText(series){ return `${series.yearStart}\u2013${series.yearEnd}`; }
function seriesMetaText(series){ return `${seriesYearText(series)} · ${series.seasonCount} ${series.seasonCount===1?"season":"seasons"} · ${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`; }
function seriesGenres(series){ return series?.genres || []; }
function seriesSearchText(series){ return [series.title, series.yearStart, series.yearEnd, ...seriesGenres(series)].join(" ").toLowerCase(); }
function seriesScore(series){ if(series?.score == null) return null; const value=Number(series.score); return Number.isFinite(value) ? value : null; }

function ensureMediaFilter(){
  const heading=document.querySelector(".libraryHeading");
  if(!heading || document.getElementById("mediaFilter")) return;
  const filter=document.createElement("div");
  filter.id="mediaFilter";
  filter.className="mediaFilter";
  filter.setAttribute("aria-label","Library type");
  filter.innerHTML=`<button type="button" data-mode="all">All</button><button type="button" data-mode="movies">Movies</button><button type="button" data-mode="series">Series</button>`;
  filter.addEventListener("click",event=>{
    const button=event.target.closest("button[data-mode]");
    if(!button) return;
    libraryMediaMode=button.dataset.mode;
    renderLibrary();
  });
  heading.appendChild(filter);
}

function updateMediaFilter(){
  ensureMediaFilter();
  document.querySelectorAll("#mediaFilter button[data-mode]").forEach(button=>{
    const active=button.dataset.mode===libraryMediaMode;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",active?"true":"false");
  });
  const heading=document.querySelector(".libraryHeading h1");
  if(heading) heading.textContent=libraryMediaMode==="movies"?"Films":libraryMediaMode==="series"?"Series":"Library";
}

function ensureSeriesView(){
  if(document.getElementById("seriesView")) return;
  const section=document.createElement("section");
  section.id="seriesView";
  section.className="seriesView hidden";
  section.setAttribute("aria-live","polite");
  section.innerHTML=`<div class="movieHero wrap"><button id="seriesBackBtn" class="backBtn" type="button">← Library</button><div id="seriesHero"></div><div id="seriesSeasons"></div></div>`;
  document.querySelector("main")?.appendChild(section);
  $("seriesBackBtn")?.addEventListener("click",()=>closeSeries());
}

function injectSeriesStyles(){
  if(document.getElementById("seriesStyles")) return;
  const style=document.createElement("style");
  style.id="seriesStyles";
  style.textContent=`
    .mediaFilter{display:flex;align-items:center;gap:3px;padding:3px;border:1px solid rgba(255,255,255,.085);border-radius:13px;background:rgba(255,255,255,.025)}
    .mediaFilter button{height:34px;padding:0 13px;border:0;border-radius:9px;background:transparent;color:#9cabc1;cursor:pointer;font-size:13px;font-weight:600;letter-spacing:.035em}
    .mediaFilter button:hover{color:#edf3fb;background:rgba(255,255,255,.04)}
    .mediaFilter button.active{color:#edf3fb;background:rgba(255,255,255,.085)}
    .seriesCard{cursor:pointer}
    .seriesCard .cardTitle{color:#c59b45!important}
    .seriesCard .cardMeta{font-size:13px!important}
    .seriesHeroGrid{display:grid;grid-template-columns:minmax(190px,300px) 1fr;gap:32px;align-items:start}
    .seriesPosterPanel{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--stroke);box-shadow:var(--shadow);background:radial-gradient(70% 55% at 50% 25%,rgba(121,169,255,.18),transparent 70%),linear-gradient(145deg,#101927,#070b12);aspect-ratio:2/3}
    .seriesPosterPanel img{width:100%;height:100%;display:block;object-fit:cover;object-position:center}
    .seriesPosterPanel.missing img{visibility:hidden}
    .seriesPosterPanel.missing::before{content:attr(data-label);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;color:rgba(237,243,251,.72);font-size:clamp(18px,2vw,28px);font-weight:600;line-height:1.12;letter-spacing:.05em}
    .seriesSummary{padding-top:10px}
    .seriesTitle{margin:8px 0 0;font-size:clamp(34px,5vw,66px);line-height:.98;color:#c59b45}
    .seriesDetailMeta{margin-top:10px;color:#aab4c2;font-size:14px;line-height:1.25}
    .seriesGenres{margin:4px 0 0;color:#91abc1;font-size:14px;font-weight:500;line-height:1.25}
    .seriesSeasonHeading{margin:38px 0 14px;font-size:22px;font-weight:650}
    .seasonGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding-bottom:80px}
    .seasonTile{padding:15px 16px;border:1px solid rgba(255,255,255,.085);border-radius:14px;background:rgba(255,255,255,.028);text-align:left}
    .seasonTileTitle{font-size:17px;font-weight:650;color:#edf3fb}
    .seasonTileMeta{margin-top:3px;color:#9cabc1;font-size:12px}
    @media(max-width:760px){.seriesHeroGrid{grid-template-columns:1fr}.seriesPosterPanel{max-width:300px}.seasonGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.libraryHeading{align-items:flex-end;gap:12px}.mediaFilter button{padding:0 9px;font-size:11px}.seasonGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function filteredSeries(){
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length) return [...seriesCatalog];
  return seriesCatalog.filter(series=>{
    const haystack=seriesSearchText(series);
    return terms.every(term=>haystack.includes(term));
  });
}

function renderSeriesCard(series){
  return `<button class="movieCard seriesCard" type="button" data-series="${escapeAttr(series.id)}">
    <div class="posterWrap${series.poster?"":" missingPoster"}"${series.poster?"":` data-label="${escapeAttr(series.title)}"`}>
      <img class="poster" ${series.poster?`src="${escapeAttr(series.poster)}"`:""} alt="${escapeAttr(series.title)} poster" loading="lazy">
      <div class="cardScore">${scoreText(seriesScore(series))}</div>
    </div>
    <div class="cardInfo">
      <div class="cardTitle">${escapeHtml(series.title)}</div>
      <div class="cardMeta">${escapeHtml(seriesMetaText(series))}</div>
      <div class="cardGenres"></div>
    </div>
  </button>`;
}

function fitSeriesCardGenres(card,series){
  const row=card?.querySelector(".cardGenres");
  const genres=seriesGenres(series);
  if(!row || !genres.length){ if(row) row.textContent=""; return; }
  let count=genres.length;
  row.textContent=genres.join(" · ");
  while(count>1 && row.scrollWidth>row.clientWidth){
    count-=1;
    row.textContent=genres.slice(0,count).join(" · ");
  }
}

function decorateSeriesCards(){
  document.querySelectorAll(".seriesCard[data-series]").forEach(card=>{
    const series=seriesById(card.dataset.series);
    if(!series) return;
    fitSeriesCardGenres(card,series);
    const title=card.querySelector(".cardTitle");
    const meta=card.querySelector(".cardMeta");
    if(title) fitCardLine(title,11);
    if(meta) meta.style.removeProperty("font-size");
  });
}

function bindSeriesCards(){
  document.querySelectorAll(".seriesCard[data-series]").forEach(card=>{
    card.addEventListener("click",()=>openSeries(card.dataset.series));
  });
}

function renderSeriesDetail(series){
  ensureSeriesView();
  const hero=$("seriesHero");
  const seasons=$("seriesSeasons");
  if(!hero || !seasons) return;
  hero.innerHTML=`<div class="seriesHeroGrid"><div class="seriesPosterPanel ${series.poster?"":"missing"}" ${series.poster?"":`data-label="${escapeAttr(series.title)}"`}><img ${series.poster?`src="${escapeAttr(series.poster)}"`:""} alt="${escapeAttr(series.title)} poster"></div><div class="seriesSummary"><h1 class="seriesTitle">${escapeHtml(series.title)}</h1><div class="seriesDetailMeta">${escapeHtml(seriesMetaText(series))}</div><div class="seriesGenres">${escapeHtml(seriesGenres(series).join(" · "))}</div></div></div>`;
  const list=(series.seasons||Array.from({length:series.seasonCount},(_,i)=>({number:i+1}))).map(season=>{
    const ep=season.episodeCount==null?"":`${season.episodeCount} ${season.episodeCount===1?"episode":"episodes"}`;
    return `<div class="seasonTile"><div class="seasonTileTitle">Season ${String(season.number).padStart(2,"0")}</div><div class="seasonTileMeta">${escapeHtml(ep)}</div></div>`;
  }).join("");
  seasons.innerHTML=`<h2 class="seriesSeasonHeading">Seasons</h2><div class="seasonGrid">${list}</div>`;
}

function openSeries(id,updateHash=true){
  const series=seriesById(id);
  if(!series) return;
  activeSeriesId=id;
  activeMovieId=null;
  if(updateHash) history.pushState(null,"",`#series=${encodeURIComponent(id)}`);
  $("libraryView")?.classList.add("hidden");
  $("movieView")?.classList.add("hidden");
  $("seriesView")?.classList.remove("hidden");
  renderSeriesDetail(series);
  scrollTo({top:0,behavior:"instant"});
}

function closeSeries(updateHash=true){
  activeSeriesId=null;
  if(updateHash) history.pushState(null,"",location.pathname+location.search);
  $("seriesView")?.classList.add("hidden");
  $("movieView")?.classList.add("hidden");
  $("libraryView")?.classList.remove("hidden");
  renderLibrary();
  scrollTo({top:0,behavior:"instant"});
}

function mixedLibraryItem(card){
  if(card.dataset.series){
    const series=seriesById(card.dataset.series);
    return series?{kind:"series",item:series}:null;
  }
  const movie=movieById(card.dataset.movie);
  return movie?{kind:"movie",item:movie}:null;
}

function mixedTitle(item){ return item.kind==="movie"?titleSortKey(item.item):String(item.item.title||""); }
function mixedYear(item){ return item.kind==="movie"?Number(item.item.year)||0:Number(item.item.yearStart)||0; }
function mixedRuntime(item){ return item.kind==="movie"?runtimeSortValue(item.item):Number(item.item.runtimeSeconds)||0; }
function mixedScore(item){ return item.kind==="movie"?(overallScore(item.item)??0):(seriesScore(item.item)??0); }

function compareMixedItems(a,b){
  if(a.kind==="movie" && b.kind==="movie") return compareLibraryMovies(a.item,b.item);
  const ta=mixedTitle(a),tb=mixedTitle(b);
  const titleAsc=ta.localeCompare(tb)||String(a.item.title||"").localeCompare(String(b.item.title||""));
  switch(sortMode){
    case "score-asc": { const sa=mixedScore(a),sb=mixedScore(b); return sa!==sb?sa-sb:titleAsc; }
    case "title": return titleAsc;
    case "title-desc": return -titleAsc;
    case "year": { const ya=mixedYear(a),yb=mixedYear(b); return ya!==yb?ya-yb:titleAsc; }
    case "year-desc": { const ya=mixedYear(a),yb=mixedYear(b); return ya!==yb?yb-ya:titleAsc; }
    case "runtime": { const ra=mixedRuntime(a),rb=mixedRuntime(b); return ra!==rb?ra-rb:titleAsc; }
    case "runtime-desc": { const ra=mixedRuntime(a),rb=mixedRuntime(b); return ra!==rb?rb-ra:titleAsc; }
    case "score":
    default: { const sa=mixedScore(a),sb=mixedScore(b); return sa!==sb?sb-sa:titleAsc; }
  }
}

function reorderMixedLibrary(){
  const grid=$("movieGrid");
  if(!grid) return;
  const cards=[...grid.children].map(card=>({card,model:mixedLibraryItem(card)})).filter(entry=>entry.model);
  cards.sort((a,b)=>compareMixedItems(a.model,b.model));
  cards.forEach(entry=>grid.appendChild(entry.card));
}

function setLibraryStatus(movieCount,seriesCount){
  if(libraryMediaMode==="movies"){
    $("libraryStatus").textContent=`${movieCount} ${movieCount===1?"film":"films"}`;
    return;
  }
  if(libraryMediaMode==="series"){
    $("libraryStatus").textContent=`${seriesCount} ${seriesCount===1?"series":"series"}`;
    return;
  }
  const parts=[];
  if(movieCount) parts.push(`${movieCount} ${movieCount===1?"film":"films"}`);
  if(seriesCount) parts.push(`${seriesCount} ${seriesCount===1?"series":"series"}`);
  $("libraryStatus").textContent=parts.join(" · ") || "No titles";
}

async function loadSeriesCatalog(){
  const response=await fetch(`data/series/index.json?v=${Date.now()}`,{cache:"no-store"});
  if(!response.ok) throw new Error(`Could not load series data (${response.status})`);
  const payload=await response.json();
  seriesCatalog=payload.series || [];
}

(async function initSeriesLibrary(){
  injectSeriesStyles();
  ensureMediaFilter();
  ensureSeriesView();
  try{
    await loadSeriesCatalog();
  }catch(error){
    console.error(error);
    seriesCatalog=[];
  }

  const movieRenderLibrary=renderLibrary;
  renderLibrary=function(){
    if(!data) return;
    updateMediaFilter();
    const series=filteredSeries();

    if(libraryMediaMode==="series"){
      const grid=$("movieGrid");
      const ordered=[...series].sort((a,b)=>compareMixedItems({kind:"series",item:a},{kind:"series",item:b}));
      grid.innerHTML=ordered.map(renderSeriesCard).join("");
      decorateSeriesCards();
      applyPosterFallbacks();
      bindSeriesCards();
      setLibraryStatus(0,ordered.length);
      requestAnimationFrame(()=>{fitAllCardTitles();fitAllCardMeta();decorateSeriesCards()});
      return;
    }

    movieRenderLibrary();
    const movieCount=$("movieGrid")?.children.length || 0;
    if(libraryMediaMode==="movies"){
      setLibraryStatus(movieCount,0);
      return;
    }

    const grid=$("movieGrid");
    if(grid && series.length){
      grid.insertAdjacentHTML("beforeend",series.map(renderSeriesCard).join(""));
      decorateSeriesCards();
      applyPosterFallbacks();
      reorderMixedLibrary();
      bindSeriesCards();
    }
    setLibraryStatus(movieCount,series.length);
    requestAnimationFrame(()=>{fitAllCardTitles();fitAllCardSubtitles();fitAllCardMeta();decorateSeriesCards()});
  };

  window.addEventListener("resize",()=>decorateSeriesCards());
  window.addEventListener("popstate",()=>{
    const hash=location.hash;
    if(hash.startsWith("#series=")){
      const id=decodeURIComponent(hash.replace(/^#series=/,""));
      if(seriesById(id)) openSeries(id,false);
    }else if(activeSeriesId){
      closeSeries(false);
    }
  });
  $("homeBtn")?.addEventListener("click",()=>{ if(activeSeriesId) closeSeries(); });

  renderLibrary();
  if(location.hash.startsWith("#series=")){
    const id=decodeURIComponent(location.hash.replace(/^#series=/,""));
    if(seriesById(id)) openSeries(id,false);
  }
})();