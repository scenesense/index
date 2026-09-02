const TV_SERIES_DATA_ROOT = "data/series";
const tvSeasonCache = new Map();
const tvSeasonSaved = new Map();
const tvDirtySeasons = new Set();
let activeTvSeasonNumber = null;
let activeTvEpisodeId = null;

function tvSeasonKey(seriesId, seasonNumber){ return `${seriesId}:${Number(seasonNumber)}`; }
function tvSeriesFolder(seriesId){ return String(seriesId||"").replace(/-\d{4}$/,“”); }
function tvSeasonPath(seriesId,seasonNumber){ return `${TV_SERIES_DATA_ROOT}/${tvSeriesFolder(seriesId)}/season-${String(seasonNumber).padStart(2,"0")}.json`; }
function tvRuntimeText(seconds){
  const total=Math.max(0,Math.round(Number(seconds)||0));
  if(!total) return "";
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function tvDisplayEpisodeNumber(number){ return String(number||"").replace("-", "\u2013"); }
function tvSeasonMeta(series,number){ return series?.seasons?.find(s=>Number(s.number)===Number(number))||null; }
function tvEpisodeById(seasonData,id){ return seasonData?.episodes?.find(ep=>ep.id===id)||null; }
function tvRatingsBucket(ratings,cat){ return cat.items.map(([key])=>ratings?.[cat.key]?.[key] ?? null); }
function tvCategoryScore(ratings,cat){
  const values=tvRatingsBucket(ratings,cat);
  if(values.some(v=>v==null)) return null;
  return values.reduce((sum,stars)=>sum+ratingPoints(stars),0)/values.length*5;
}
function tvRatedCount(ratings,categories){ return categories.reduce((n,cat)=>n+tvRatingsBucket(ratings,cat).filter(v=>v!=null).length,0); }
function tvEpisodeScore(seasonData,episode){
  if(!seasonData||!episode) return null;
  const all=[...TV_SEASON_CATEGORIES.map(cat=>[cat,seasonData.seasonRatings]),...TV_EPISODE_CATEGORIES.map(cat=>[cat,episode.ratings])];
  const scores=all.map(([cat,ratings])=>[tvCategoryScore(ratings,cat),cat.weight]);
  if(scores.some(([score])=>score==null)) return null;
  return scores.reduce((sum,[score,weight])=>sum+score*(weight/100),0);
}
function tvSeasonScore(seasonData){
  if(!seasonData) return null;
  const scores=(seasonData.episodes||[]).map(ep=>tvEpisodeScore(seasonData,ep)).filter(v=>v!=null);
  if(!scores.length) return null;
  return scores.reduce((a,b)=>a+b,0)/scores.length;
}
function tvCompletedEpisodes(seasonData){ return (seasonData?.episodes||[]).filter(ep=>tvEpisodeScore(seasonData,ep)!=null).length; }
function tvSeriesScoreFromCache(series){
  const scores=[];
  for(const season of series?.seasons||[]){
    const data=tvSeasonCache.get(tvSeasonKey(series.id,season.number));
    if(!data) continue;
    for(const ep of data.episodes||[]){
      const score=tvEpisodeScore(data,ep);
      if(score!=null) scores.push(score);
    }
  }
  return scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
}
function tvUpdateSeriesAggregate(series){
  if(!series) return;
  let completed=0;
  for(const season of series.seasons||[]){
    const data=tvSeasonCache.get(tvSeasonKey(series.id,season.number));
    if(data) completed+=tvCompletedEpisodes(data);
  }
  series.ratedEntryCount=completed;
  series.score=tvSeriesScoreFromCache(series);
}

async function loadTvSeasonData(seriesId,seasonNumber){
  const key=tvSeasonKey(seriesId,seasonNumber);
  if(tvSeasonCache.has(key)) return tvSeasonCache.get(key);
  const response=await fetch(`${tvSeasonPath(seriesId,seasonNumber)}?v=${Date.now()}`,{cache:"no-store"});
  if(!response.ok) throw new Error(`Could not load Season ${String(seasonNumber).padStart(2,"0")} (${response.status}).`);
  const data=await response.json();
  data.seasonRatings ||= {};
  (data.episodes||[]).forEach(ep=>ep.ratings ||= {});
  tvSeasonCache.set(key,data);
  tvSeasonSaved.set(key,deepClone(data));
  return data;
}

function injectTvStyles(){
  if(document.getElementById("seriesTvStyles")) return;
  const style=document.createElement("style");
  style.id="seriesTvStyles";
  style.textContent=`
    .seriesSeasonsWrap{margin-top:26px!important;padding-bottom:72px!important}
    .seriesSeasonHeading,.tvSectionHeading{margin:0 0 12px!important;font-size:20px!important;font-weight:650!important}
    .seasonBannerGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important}
    button.seasonBanner{position:relative!important;display:block!important;width:100%!important;min-height:76px!important;aspect-ratio:auto!important;padding:0!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:12px!important;background:radial-gradient(90% 150% at 10% 20%,rgba(197,155,69,.14),transparent 58%),linear-gradient(135deg,#101925,#090e16)!important;box-shadow:none!important;text-align:left!important;cursor:pointer!important}
    button.seasonBanner::after{content:""!important;position:absolute!important;inset:0!important;background:linear-gradient(90deg,rgba(7,11,18,.04),rgba(7,11,18,.22))!important;pointer-events:none!important}
    button.seasonBanner:hover{border-color:rgba(197,155,69,.48)!important;background:radial-gradient(90% 150% at 10% 20%,rgba(197,155,69,.22),transparent 58%),linear-gradient(135deg,#111b29,#0a1019)!important}
    .seasonBannerContent{position:relative!important;z-index:1!important;left:auto!important;right:auto!important;bottom:auto!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;padding:12px 14px!important}
    .seasonBannerTitle{font-size:17px!important;font-weight:700!important;line-height:1!important;color:#edf3fb!important}
    .seasonBannerMeta{margin-top:4px!important;color:#9cabc1!important;font-size:11.5px!important;font-weight:400!important;line-height:1.1!important}
    .seasonBannerScore{align-self:center;font-size:25px;font-weight:650;line-height:1;color:#c59b45}
    .tvSubHero{padding:8px 0 4px}
    .tvSubHero .tvKicker{color:#c59b45;font-size:14px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;font-variant-caps:normal!important;font-synthesis-small-caps:none!important}
    .tvSubHero h1{margin:5px 0 0;font-size:clamp(34px,5vw,62px);line-height:.98}
    .tvSubMeta{margin-top:10px;color:#aab4c2;font-size:14px;line-height:1.25}
    .tvScoreLine{margin-top:18px}
    .tvScoringIntro{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:26px 0 12px}
    .tvScoringIntro .tvSectionHeading{margin:0!important}
    .tvSectionNote{color:#8e9caf;font-size:12px;line-height:1.25}
    .tvCategories{margin-bottom:28px}
    .episodeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:28px}
    .episodeCard{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;min-height:58px;padding:9px 12px;border:1px solid rgba(255,255,255,.085);border-radius:11px;background:rgba(255,255,255,.025);color:#edf3fb;text-align:left;cursor:pointer}
    .episodeCard:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.04)}
    .episodeCode{color:#c59b45;font-size:12px;font-weight:700;white-space:nowrap}
    .episodeTitle{min-width:0;font-size:15px;font-weight:600;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .episodeRuntime{margin-top:3px;color:#8e9caf;font-size:10.5px;font-weight:400}
    .episodeScore{font-size:22px;font-weight:650;line-height:1;color:#edf3fb}
    .tvModeNotice{margin-top:22px}
    .tvSaveRow{margin-top:12px}
    .tvError{padding:18px;border:1px solid rgba(255,255,255,.10);border-radius:12px;color:#d7e0ec;background:rgba(255,255,255,.025)}
    @media(max-width:1050px){.seasonBannerGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:760px){.episodeGrid{grid-template-columns:1fr}.seasonBannerGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:620px){.seasonBannerGrid{grid-template-columns:1fr!important}button.seasonBanner{min-height:68px!important}.seasonBannerContent{padding:10px 12px!important}.seasonBannerTitle{font-size:16px!important}.seasonBannerScore{font-size:22px}.tvScoringIntro{display:block}.tvSectionNote{margin-top:4px}}
  `;
  document.head.appendChild(style);
}

function tvSetBackButton(label,handler){
  const old=document.getElementById("seriesBackBtn");
  if(!old) return;
  const fresh=old.cloneNode(true);
  fresh.textContent=label;
  old.replaceWith(fresh);
  fresh.addEventListener("click",handler);
}

function tvCategoryMarkup(categories,ratings){
  return categories.map((cat,idx)=>{
    const score=tvCategoryScore(ratings,cat);
    const completed=tvRatingsBucket(ratings,cat).filter(v=>v!=null).length;
    const bucket=ratings?.[cat.key]||{};
    return `<section class="category open" data-category="${escapeAttr(cat.key)}">
      <button class="categoryHeader" type="button" aria-expanded="true">
        <span class="categoryNum">${String(idx+1).padStart(2,"0")}</span>
        <span>
          <span class="categoryTitle">${escapeHtml(cat.title)}</span>
          <span class="categoryWeight">${cat.weight}% weight · ${completed}/2 rated</span>
        </span>
        <span class="categoryScore">${scoreText(score)}</span>
      </button>
      <div class="categoryBody">
        ${cat.items.map(([key,name,question])=>ratingRow(cat.key,key,name,question,bucket[key]??null)).join("")}
      </div>
    </section>`;
  }).join("");
}

function tvBindRatingRows(holder,onSet){
  holder.querySelectorAll(".ratingRow").forEach(row=>{
    const stars=[...row.querySelectorAll(".star")];
    stars.forEach(star=>{
      star.addEventListener("mouseenter",()=>{
        if(!adminToken) return;
        const n=Number(star.dataset.stars);
        stars.forEach(s=>s.classList.toggle("hovered",Number(s.dataset.stars)<=n));
      });
      star.addEventListener("mouseleave",()=>stars.forEach(s=>s.classList.remove("hovered")));
      star.addEventListener("click",()=>{
        if(!adminToken) return;
        onSet(row.dataset.category,row.dataset.item,Number(star.dataset.stars));
      });
    });
    row.querySelector(".clearRating")?.addEventListener("click",()=>{
      if(!adminToken) return;
      onSet(row.dataset.category,row.dataset.item,null);
    });
  });
}

function tvMarkDirty(seriesId,seasonNumber,data){
  const key=tvSeasonKey(seriesId,seasonNumber);
  const saved=tvSeasonSaved.get(key);
  if(saved && JSON.stringify(data)===JSON.stringify(saved)) tvDirtySeasons.delete(key);
  else tvDirtySeasons.add(key);
}

function tvSaveControlsMarkup(seriesId,seasonNumber){
  const dirty=tvDirtySeasons.has(tvSeasonKey(seriesId,seasonNumber));
  return `<div class="modeNotice tvModeNotice ${adminToken?"unlocked":""}">${adminToken?"Scoring unlocked · changes stay private until Save.":"Scores are read-only."}</div>
    <div class="saveRow tvSaveRow ${adminToken?"":"hidden"}">
      <button class="button primary" id="tvSaveBtn" type="button" ${dirty?"":"disabled"}>Save score</button>
      <button class="button" id="tvRevertBtn" type="button" ${dirty?"":"disabled"}>Revert</button>
      <span id="tvSaveStatus" class="saveStatus"></span>
    </div>`;
}

function tvBindSaveControls(series,seasonData){
  document.getElementById("tvSaveBtn")?.addEventListener("click",()=>saveTvSeason(series,seasonData));
  document.getElementById("tvRevertBtn")?.addEventListener("click",()=>revertTvSeason(series,seasonData.season));
}

function renderSeriesDetail(series){
  activeTvSeasonNumber=null;
  activeTvEpisodeId=null;
  ensureSeriesView();
  tvSetBackButton("← Library",()=>closeSeries());
  const hero=$("seriesHero"),seasons=$("seriesSeasons");
  if(!hero||!seasons) return;

  tvUpdateSeriesAggregate(series);
  const cast=(series.actors||[]).slice(0,5).map(name=>`<span class="actorChip">${escapeHtml(name)}</span>`).join("");
  const progress=Number(series.ratedEntryCount)||0;
  hero.innerHTML=`<div class="movieHeroGrid">
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

  const list=(series.seasons||[]).map(season=>{
    const data=tvSeasonCache.get(tvSeasonKey(series.id,season.number));
    const score=data?tvSeasonScore(data):null;
    const year=seasonYearText(season);
    const entries=Number(season.scoringEntryCount)||Number(season.episodeCount)||0;
    const episodeText=`${season.episodeCount} ${season.episodeCount===1?"episode":"episodes"}`;
    const entryText=entries!==season.episodeCount?` · ${entries} entries`:"";
    return `<button class="seasonBanner" type="button" data-season="${season.number}">
      <div class="seasonBannerContent">
        <div><div class="seasonBannerTitle">Season ${String(season.number).padStart(2,"0")}</div><div class="seasonBannerMeta">${escapeHtml(`${year} · ${episodeText}${entryText}`)}</div></div>
        <div class="seasonBannerScore">${scoreText(score)}</div>
      </div>
    </button>`;
  }).join("");
  seasons.innerHTML=`<h2 class="seriesSeasonHeading">Seasons</h2><div class="seasonBannerGrid">${list}</div>`;
  seasons.querySelectorAll(".seasonBanner[data-season]").forEach(btn=>btn.addEventListener("click",()=>openTvSeason(series.id,Number(btn.dataset.season))));
  const holder=hero.querySelector(".actorChips");
  if(typeof fitPrincipalCast==="function") requestAnimationFrame(()=>fitPrincipalCast(holder));
}

async function openTvSeason(seriesId,seasonNumber){
  const series=seriesById(seriesId);
  if(!series) return;
  activeSeriesId=seriesId;
  activeTvSeasonNumber=Number(seasonNumber);
  activeTvEpisodeId=null;
  try{
    const seasonData=await loadTvSeasonData(seriesId,seasonNumber);
    renderTvSeason(series,seasonData);
    scrollTo({top:0,behavior:"instant"});
  }catch(err){
    renderTvError(series,err);
  }
}

function renderTvSeason(series,seasonData){
  const hero=$("seriesHero"),body=$("seriesSeasons");
  if(!hero||!body) return;
  activeTvSeasonNumber=Number(seasonData.season);
  activeTvEpisodeId=null;
  tvSetBackButton(`← ${series.title}`,()=>renderSeriesDetail(series));

  const seasonMeta=tvSeasonMeta(series,seasonData.season);
  const year=seasonData.yearStart===seasonData.yearEnd?String(seasonData.yearStart):`${seasonData.yearStart}\u2013${seasonData.yearEnd}`;
  const episodes=seasonMeta?.episodeCount ?? seasonData.episodes?.length ?? 0;
  const entries=seasonMeta?.scoringEntryCount ?? seasonData.episodes?.length ?? 0;
  const seasonScore=tvSeasonScore(seasonData);
  const ratedSeason=tvRatedCount(seasonData.seasonRatings,TV_SEASON_CATEGORIES);
  const completedEpisodes=tvCompletedEpisodes(seasonData);

  hero.innerHTML=`<div class="tvSubHero">
    <div class="tvKicker">${escapeHtml(series.title)}</div>
    <h1>Season ${String(seasonData.season).padStart(2,"0")}</h1>
    <div class="tvSubMeta">${escapeHtml(`${year} · ${episodes} ${episodes===1?"episode":"episodes"}${entries!==episodes?` · ${entries} scoring entries`:""}`)}</div>
    <div class="scoreLine tvScoreLine">
      <div class="overallScore">${scoreText(seasonScore)}</div>
      <div><div class="scoreCaption">season score</div><div class="progressText">${ratedSeason} / 10 season ratings · ${completedEpisodes} / ${entries} entries complete</div></div>
    </div>
  </div>`;

  const episodeCards=(seasonData.episodes||[]).map(ep=>{
    const score=tvEpisodeScore(seasonData,ep);
    const runtime=tvRuntimeText(ep.runtimeSeconds);
    return `<button class="episodeCard" type="button" data-episode="${escapeAttr(ep.id)}">
      <div class="episodeCode">S${String(seasonData.season).padStart(2,"0")} E${escapeHtml(tvDisplayEpisodeNumber(ep.number))}</div>
      <div><div class="episodeTitle">${escapeHtml(ep.title)}</div>${runtime?`<div class="episodeRuntime">${runtime}</div>`:""}</div>
      <div class="episodeScore">${scoreText(score)}</div>
    </button>`;
  }).join("");

  body.innerHTML=`<div class="tvScoringIntro"><h2 class="tvSectionHeading">Season scoring</h2><div class="tvSectionNote">These 5 production-level categories are inherited by every episode in this season.</div></div>
    <div class="categories tvCategories" id="tvSeasonCategories">${tvCategoryMarkup(TV_SEASON_CATEGORIES,seasonData.seasonRatings)}</div>
    <h2 class="tvSectionHeading">Episodes</h2>
    <div class="episodeGrid">${episodeCards}</div>
    ${tvSaveControlsMarkup(series.id,seasonData.season)}`;

  const categoryHolder=document.getElementById("tvSeasonCategories");
  tvBindRatingRows(categoryHolder,(categoryKey,itemKey,value)=>{
    seasonData.seasonRatings ||= {};
    seasonData.seasonRatings[categoryKey] ||= {};
    if(value==null) delete seasonData.seasonRatings[categoryKey][itemKey];
    else seasonData.seasonRatings[categoryKey][itemKey]=value;
    tvMarkDirty(series.id,seasonData.season,seasonData);
    tvUpdateSeriesAggregate(series);
    renderTvSeason(series,seasonData);
  });
  body.querySelectorAll(".episodeCard[data-episode]").forEach(btn=>btn.addEventListener("click",()=>openTvEpisode(series.id,seasonData.season,btn.dataset.episode)));
  tvBindSaveControls(series,seasonData);
}

async function openTvEpisode(seriesId,seasonNumber,episodeId){
  const series=seriesById(seriesId);
  if(!series) return;
  try{
    const seasonData=await loadTvSeasonData(seriesId,seasonNumber);
    const episode=tvEpisodeById(seasonData,episodeId);
    if(!episode) throw new Error("Episode not found.");
    activeTvSeasonNumber=Number(seasonNumber);
    activeTvEpisodeId=episodeId;
    renderTvEpisode(series,seasonData,episode);
    scrollTo({top:0,behavior:"instant"});
  }catch(err){
    renderTvError(series,err);
  }
}

function renderTvEpisode(series,seasonData,episode){
  const hero=$("seriesHero"),body=$("seriesSeasons");
  if(!hero||!body) return;
  tvSetBackButton(`← Season ${String(seasonData.season).padStart(2,"0")}`,()=>renderTvSeason(series,seasonData));

  const score=tvEpisodeScore(seasonData,episode);
  const episodeRated=tvRatedCount(episode.ratings,TV_EPISODE_CATEGORIES);
  const seasonRated=tvRatedCount(seasonData.seasonRatings,TV_SEASON_CATEGORIES);
  const runtime=tvRuntimeText(episode.runtimeSeconds);
  const year=seasonData.yearStart===seasonData.yearEnd?String(seasonData.yearStart):`${seasonData.yearStart}\u2013${seasonData.yearEnd}`;
  const meta=[`S${String(seasonData.season).padStart(2,"0")} E${tvDisplayEpisodeNumber(episode.number)}`,runtime,year].filter(Boolean).join(" · ");

  hero.innerHTML=`<div class="tvSubHero">
    <div class="tvKicker">${escapeHtml(series.title)}</div>
    <h1>${escapeHtml(episode.title)}</h1>
    <div class="tvSubMeta">${escapeHtml(meta)}</div>
    <div class="scoreLine tvScoreLine">
      <div class="overallScore">${scoreText(score)}</div>
      <div><div class="scoreCaption">overall score</div><div class="progressText">${episodeRated} / 20 episode ratings · ${seasonRated} / 10 inherited season ratings</div></div>
    </div>
  </div>`;

  body.innerHTML=`<div class="tvScoringIntro"><h2 class="tvSectionHeading">Episode scoring</h2><div class="tvSectionNote">10 episode-specific categories. Season production scores supply the other 5 categories.</div></div>
    <div class="categories tvCategories" id="tvEpisodeCategories">${tvCategoryMarkup(TV_EPISODE_CATEGORIES,episode.ratings)}</div>
    ${tvSaveControlsMarkup(series.id,seasonData.season)}`;

  const categoryHolder=document.getElementById("tvEpisodeCategories");
  tvBindRatingRows(categoryHolder,(categoryKey,itemKey,value)=>{
    episode.ratings ||= {};
    episode.ratings[categoryKey] ||= {};
    if(value==null) delete episode.ratings[categoryKey][itemKey];
    else episode.ratings[categoryKey][itemKey]=value;
    tvMarkDirty(series.id,seasonData.season,seasonData);
    tvUpdateSeriesAggregate(series);
    renderTvEpisode(series,seasonData,episode);
  });
  tvBindSaveControls(series,seasonData);
}

function renderTvError(series,error){
  tvSetBackButton(`← ${series?.title||"Series"}`,()=>series&&renderSeriesDetail(series));
  const hero=$("seriesHero"),body=$("seriesSeasons");
  if(hero) hero.innerHTML="";
  if(body) body.innerHTML=`<div class="tvError">${escapeHtml(error?.message||"Could not load television data.")}</div>`;
}

async function saveTvSeason(series,seasonData){
  if(!adminToken) return;
  const key=tvSeasonKey(series.id,seasonData.season);
  if(!tvDirtySeasons.has(key)) return;
  const btn=document.getElementById("tvSaveBtn");
  const status=document.getElementById("tvSaveStatus");
  if(btn) btn.disabled=true;
  if(status) status.textContent="Saving…";
  try{
    const saved=tvSeasonSaved.get(key)||{};
    const seasonRatingsChanged=JSON.stringify(seasonData.seasonRatings||{})!==JSON.stringify(saved.seasonRatings||{});
    const changedEpisodeIds=(seasonData.episodes||[]).filter(ep=>{
      const old=(saved.episodes||[]).find(item=>item.id===ep.id);
      return JSON.stringify(ep.ratings||{})!==JSON.stringify(old?.ratings||{});
    }).map(ep=>ep.id);
    if(!seasonRatingsChanged&&!changedEpisodeIds.length){
      tvDirtySeasons.delete(key);
      renderActiveTvView();
      return;
    }

    const headers={
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${adminToken}`,
      "X-GitHub-Api-Version":"2022-11-28"
    };
    const path=tvSeasonPath(series.id,seasonData.season);
    const metaRes=await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`,{headers,cache:"no-store"});
    if(!metaRes.ok) throw new Error(`Could not read current season data (${metaRes.status}).`);
    const meta=await metaRes.json();
    const remote=JSON.parse(base64ToUtf8(meta.content));
    remote.seasonRatings ||= {};
    remote.episodes ||= [];

    if(seasonRatingsChanged) remote.seasonRatings=deepClone(seasonData.seasonRatings||{});
    changedEpisodeIds.forEach(id=>{
      const localEp=seasonData.episodes.find(ep=>ep.id===id);
      const remoteEp=remote.episodes.find(ep=>ep.id===id);
      if(localEp&&remoteEp) remoteEp.ratings=deepClone(localEp.ratings||{});
    });

    const payload={
      message:`Update ${series.title} Season ${seasonData.season} scores`,
      content:utf8ToBase64(JSON.stringify(remote,null,2)+"\n"),
      sha:meta.sha,
      branch:BRANCH
    };
    const saveRes=await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{
      method:"PUT",
      headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if(!saveRes.ok){
      let detail="";
      try{ detail=(await saveRes.json()).message||""; }catch{}
      throw new Error(`GitHub save failed (${saveRes.status})${detail?`: ${detail}`:""}`);
    }

    tvSeasonCache.set(key,remote);
    tvSeasonSaved.set(key,deepClone(remote));
    tvDirtySeasons.delete(key);
    tvUpdateSeriesAggregate(series);
    renderActiveTvView();
    const newStatus=document.getElementById("tvSaveStatus");
    if(newStatus) newStatus.textContent="Saved. GitHub Pages will update shortly.";
    renderLibrary();
  }catch(err){
    console.error(err);
    const currentStatus=document.getElementById("tvSaveStatus");
    if(currentStatus) currentStatus.textContent=err.message||"Save failed.";
    const currentBtn=document.getElementById("tvSaveBtn");
    if(currentBtn) currentBtn.disabled=false;
  }
}

function revertTvSeason(series,seasonNumber){
  const key=tvSeasonKey(series.id,seasonNumber);
  const saved=tvSeasonSaved.get(key);
  if(!saved) return;
  const episodeId=activeTvEpisodeId;
  const restored=deepClone(saved);
  tvSeasonCache.set(key,restored);
  tvDirtySeasons.delete(key);
  tvUpdateSeriesAggregate(series);
  if(episodeId){
    const ep=tvEpisodeById(restored,episodeId);
    if(ep) renderTvEpisode(series,restored,ep);
    else renderTvSeason(series,restored);
  }else renderTvSeason(series,restored);
  const status=document.getElementById("tvSaveStatus");
  if(status) status.textContent="Reverted.";
}

function renderActiveTvView(){
  const series=seriesById(activeSeriesId);
  if(!series) return;
  if(activeTvSeasonNumber==null){ renderSeriesDetail(series); return; }
  const data=tvSeasonCache.get(tvSeasonKey(series.id,activeTvSeasonNumber));
  if(!data){ openTvSeason(series.id,activeTvSeasonNumber); return; }
  if(activeTvEpisodeId){
    const ep=tvEpisodeById(data,activeTvEpisodeId);
    if(ep){ renderTvEpisode(series,data,ep); return; }
  }
  renderTvSeason(series,data);
}

async function hydrateTvSeriesScores(){
  for(let tries=0;tries<80&&!seriesCatalog.length;tries++) await new Promise(resolve=>setTimeout(resolve,50));
  for(const series of seriesCatalog){
    if(!series.seasons?.length) continue;
    await Promise.all(series.seasons.map(season=>loadTvSeasonData(series.id,season.number).catch(()=>null)));
    tvUpdateSeriesAggregate(series);
  }
  renderLibrary();
  if(activeSeriesId&&activeTvSeasonNumber==null){
    const series=seriesById(activeSeriesId);
    if(series) renderSeriesDetail(series);
  }
}

const tvBaseUnlock=unlock;
unlock=async function(token){
  await tvBaseUnlock(token);
  if(activeSeriesId) renderActiveTvView();
};
const tvBaseLock=lock;
lock=function(){
  tvBaseLock();
  if(activeSeriesId) renderActiveTvView();
};

window.addEventListener("beforeunload",event=>{
  if(!tvDirtySeasons.size) return;
  event.preventDefault();
  event.returnValue="";
});

injectTvStyles();
hydrateTvSeriesScores();
