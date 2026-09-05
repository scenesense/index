let seriesCatalog = [];
let libraryMediaMode = "all";
let activeSeriesId = null;

function seriesById(id){ return seriesCatalog.find(series => series.id === id); }
function seriesYearText(series){ return `${series.yearStart}\u2013${series.yearEnd}`; }
function seriesMetaText(series){ return `${seriesYearText(series)} · ${series.seasonCount} ${series.seasonCount===1?"season":"seasons"} · ${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`; }
function seriesRuntimeText(series){ const total=Math.max(0,Math.round(Number(series?.runtimeSeconds)||0)); if(!total) return ""; const hours=Math.floor(total/3600); const minutes=Math.floor((total%3600)/60); const seconds=total%60; return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`; }
function seriesDetailMetaText(series){ return [seriesYearText(series),seriesRuntimeText(series),`${series.seasonCount} ${series.seasonCount===1?"season":"seasons"}`,`${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`].filter(Boolean).join(" · "); }
function seriesGenres(series){ return series?.genres || []; }
function seriesSearchText(series){ return [series.title,series.yearStart,series.yearEnd,...seriesGenres(series),...(series.actors||[])].join(" ").toLowerCase(); }
function seriesScore(series){ if(series?.score == null) return null; const value=Number(series.score); return Number.isFinite(value)?value:null; }
function seasonYearText(season){ return season.yearStart===season.yearEnd?String(season.yearStart||""):`${season.yearStart}\u2013${season.yearEnd}`; }

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
  section.className="movieView seriesView hidden";
  section.setAttribute("aria-live","polite");
  section.innerHTML=`
    <div class="movieHero wrap">
      <button id="seriesBackBtn" class="backBtn" type="button">← Library</button>
      <div id="seriesHero"></div>
    </div>
    <div class="seriesSeasonsWrap wrap"><div id="seriesSeasons"></div></div>`;
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
    .seriesCard .cardMeta{font-size:13px!important;white-space:nowrap;overflow:visible;width:calc(100% + 7px);max-width:none}
    .seriesCardMetaText{display:inline-block;white-space:nowrap;transform-origin:left center}
    .seriesSeasonsWrap{margin-top:34px;padding-bottom:80px}
    .seriesSeasonHeading{margin:0 0 16px;font-size:22px;font-weight:650}
    .seasonBannerGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .seasonBanner{position:relative;min-height:150px;aspect-ratio:16/5;overflow:hidden;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:radial-gradient(85% 150% at 12% 20%,rgba(197,155,69,.18),transparent 58%),radial-gradient(100% 130% at 88% 75%,rgba(121,169,255,.14),transparent 62%),linear-gradient(135deg,#111a27,#090e16);box-shadow:0 12px 32px rgba(0,0,0,.22)}
    .seasonBanner::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,11,18,.16),rgba(7,11,18,.48))}
    .seasonBannerContent{position:absolute;z-index:1;left:20px;right:20px;bottom:17px}
    .seasonBannerTitle{font-size:22px;font-weight:700;line-height:1;color:#edf3fb}
    .seasonBannerMeta{margin-top:7px;color:#aab4c2;font-size:13px;font-weight:400;line-height:1.15}
    @media(max-width:760px){.seasonBannerGrid{grid-template-columns:1fr}.seasonBanner{min-height:125px}}
    @media(max-width:620px){.libraryHeading{align-items:flex-end;gap:12px}.mediaFilter button{padding:0 9px;font-size:11px}.seriesCard .cardMeta{width:calc(100% + 5px)}.seasonBannerContent{left:15px;right:15px;bottom:14px}.seasonBannerTitle{font-size:19px}}
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
      <div class="cardTitle">${escapeHtml(series.cardTitle || (series.id==="he-man-and-the-masters-of-the-universe-1983"?"He-Man: The Masters of the Universe":series.title))}</div>
      <div class="cardMeta"><span class="seriesCardMetaText">${escapeHtml(seriesMetaText(series))}</span></div>
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

function fitSeriesCardMeta(card){
  const meta=card?.querySelector(".cardMeta");
  const text=meta?.querySelector(".seriesCardMetaText");
  if(!meta || !text) return;
  text.style.transform="none";
  const natural=text.scrollWidth;
  const available=meta.clientWidth;
  const scale=natural>available && available>0 ? available/natural : 1;
  text.style.transform=scale<1?`scaleX(${scale})`:"none";
}

function decorateSeriesCards(){
  document.querySelectorAll(".seriesCard[data-series]").forEach(card=>{
    const series=seriesById(card.dataset.series);
    if(!series) return;
    fitSeriesCardGenres(card,series);
    const title=card.querySelector(".cardTitle");
    if(title) fitCardLine(title,11);
    fitSeriesCardMeta(card);
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

  const cast=(series.actors||[]).slice(0,5).map(name=>`<span class="actorChip">${escapeHtml(name)}</span>`).join("");
  const progress=Number(series.ratedEntryCount)||0;
  hero.innerHTML=`
    <div class="movieHeroGrid">
      <div class="posterPanel${series.poster?"":" missingPoster"}"${series.poster?"":` data-label="${escapeAttr(series.title)}"`}>
        <img class="detailPoster" ${series.poster?`src="${escapeAttr(series.poster)}"`:""} alt="${escapeAttr(series.title)} poster">
      </div>
      <div class="movieSummary">
        <h1>${escapeHtml(series.title)}</h1>
        <div class="eyebrow">${escapeHtml(seriesDetailMetaText(series))}</div>
        <div class="detailGenres">${escapeHtml(seriesGenres(series).join(" · "))}</div>
        <div class="actorChips" aria-label="Principal cast">${cast}</div>
        <div class="detailDescription">${escapeHtml(series.description||"")}</div>
        <div class="scoreLine">
          <div class="overallScore">${scoreText(seriesScore(series))}</div>
          <div><div class="scoreCaption">overall score</div><div class="progressText">${progress} / ${series.scoringEntryCount||series.episodeCount} entries rated</div></div>
        </div>
      </div>
    </div>`;

  const list=(series.seasons||Array.from({length:series.seasonCount},(_,i)=>({number:i+1}))).map(season=>{
    const year=season.yearStart?seasonYearText(season):"";
    const episodes=season.episodeCount==null?"":`${season.episodeCount} ${season.episodeCount===1?"episode":"episodes"}`;
    const meta=[year,episodes].filter(Boolean).join(" · ");
    return `<article class="seasonBanner" data-season="${season.number}"><div class="seasonBannerContent"><div class="seasonBannerTitle">Season ${String(season.number).padStart(2,"0")}</div><div class="seasonBannerMeta">${escapeHtml(meta)}</div></div></article>`;
  }).join("");
  seasons.innerHTML=`<h2 class="seriesSeasonHeading">Seasons</h2><div class="seasonBannerGrid">${list}</div>`;

  const holder=hero.querySelector(".actorChips");
  if(typeof fitPrincipalCast==="function") requestAnimationFrame(()=>fitPrincipalCast(holder));
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
  if(a.kind==="movie"&&b.kind==="movie") return compareLibraryMovies(a.item,b.item);
  const ta=mixedTitle(a),tb=mixedTitle(b);
  const titleAsc=ta.localeCompare(tb)||String(a.item.title||"").localeCompare(String(b.item.title||""));
  switch(sortMode){
    case "score-asc":{const sa=mixedScore(a),sb=mixedScore(b);return sa!==sb?sa-sb:titleAsc;}
    case "title":return titleAsc;
    case "title-desc":return -titleAsc;
    case "year":{const ya=mixedYear(a),yb=mixedYear(b);return ya!==yb?ya-yb:titleAsc;}
    case "year-desc":{const ya=mixedYear(a),yb=mixedYear(b);return ya!==yb?yb-ya:titleAsc;}
    case "runtime":{const ra=mixedRuntime(a),rb=mixedRuntime(b);return ra!==rb?ra-rb:titleAsc;}
    case "runtime-desc":{const ra=mixedRuntime(a),rb=mixedRuntime(b);return ra!==rb?rb-ra:titleAsc;}
    case "score":default:{const sa=mixedScore(a),sb=mixedScore(b);return sa!==sb?sb-sa:titleAsc;}
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
    $("libraryStatus").textContent=`${seriesCount} series`;
    return;
  }
  const parts=[];
  if(movieCount) parts.push(`${movieCount} ${movieCount===1?"film":"films"}`);
  if(seriesCount) parts.push(`${seriesCount} series`);
  $("libraryStatus").textContent=parts.join(" · ")||"No titles";
}

async function loadSeriesCatalog(){
  const response=await fetch(`data/series/index.json?v=${Date.now()}`,{cache:"no-store"});
  if(!response.ok) throw new Error(`Could not load series data (${response.status})`);
  const payload=await response.json();
  seriesCatalog=payload.series||[];
}

(async function initSeriesLibrary(){
  injectSeriesStyles();
  ensureMediaFilter();
  ensureSeriesView();
  try{ await loadSeriesCatalog(); }
  catch(error){ console.error(error); seriesCatalog=[]; }

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
      requestAnimationFrame(()=>decorateSeriesCards());
      return;
    }

    movieRenderLibrary();
    const movieCount=$("movieGrid")?.children.length||0;
    if(libraryMediaMode==="movies"){
      setLibraryStatus(movieCount,0);
      return;
    }

    const grid=$("movieGrid");
    if(grid&&series.length){
      grid.insertAdjacentHTML("beforeend",series.map(renderSeriesCard).join(""));
      decorateSeriesCards();
      applyPosterFallbacks();
      reorderMixedLibrary();
      bindSeriesCards();
    }
    setLibraryStatus(movieCount,series.length);
    requestAnimationFrame(()=>{fitAllCardTitles();fitAllCardSubtitles();fitAllCardMeta();decorateSeriesCards();requestAnimationFrame(decorateSeriesCards);});
  };

  window.addEventListener("resize",()=>{
    decorateSeriesCards();
    if(activeSeriesId&&typeof fitPrincipalCast==="function") fitPrincipalCast(document.querySelector("#seriesHero .actorChips"));
  });
  window.addEventListener("popstate",()=>{
    const hash=location.hash;
    if(hash.startsWith("#series=")){
      const id=decodeURIComponent(hash.replace(/^#series=/,""));
      if(seriesById(id)) openSeries(id,false);
    }else if(activeSeriesId){
      closeSeries(false);
    }
  });
  $("homeBtn")?.addEventListener("click",()=>{if(activeSeriesId) closeSeries();});

  renderLibrary();
  if(location.hash.startsWith("#series=")){
    const id=decodeURIComponent(location.hash.replace(/^#series=/,""));
    if(seriesById(id)) openSeries(id,false);
  }
})();
