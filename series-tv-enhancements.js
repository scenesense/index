const tvPresentationCache = new Map();

function tvPresentationPath(seriesId, seasonNumber){
  return `data/series/${tvSeriesFolder(seriesId)}/season-${String(seasonNumber).padStart(2,"0")}-meta.json`;
}

async function loadTvPresentation(seriesId, seasonNumber){
  const key = tvSeasonKey(seriesId, seasonNumber);
  if(tvPresentationCache.has(key)) return tvPresentationCache.get(key);
  const response = await fetch(`${tvPresentationPath(seriesId,seasonNumber)}?v=${Date.now()}`, {cache:"no-store"});
  if(!response.ok){
    tvPresentationCache.set(key, null);
    return null;
  }
  const data = await response.json();
  tvPresentationCache.set(key, data);
  return data;
}

function tvPresentation(seriesId, seasonNumber){
  return tvPresentationCache.get(tvSeasonKey(seriesId,seasonNumber)) || null;
}

function tvEpisodePresentation(seriesId, seasonNumber, episodeId){
  return tvPresentation(seriesId,seasonNumber)?.episodes?.[episodeId] || null;
}

function tvFormatDateOne(value){
  if(!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if(Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(date);
}

function tvFormatAirDate(value){
  if(Array.isArray(value)) return value.map(tvFormatDateOne).filter(Boolean).join(" · ");
  return tvFormatDateOne(value);
}

function tvDisplayEpisodeTitle(title){
  return String(title||"")
    .replace(/\s+UNCUT\b/gi," (Uncut)")
    .replace(/\s+Part\s+(One|Two|Three|Four)\b/gi,(_,part)=>` (Part ${part.charAt(0).toUpperCase()+part.slice(1).toLowerCase()})`);
}

function tvEpisodeCodeMarkup(seasonNumber, episodeNumber){
  const season=`S${String(seasonNumber).padStart(2,"0")}`;
  const episodes=String(episodeNumber||"").split("-").filter(Boolean);
  return `<span class="episodeSeasonCode">${escapeHtml(season)}</span><span class="episodeNumberStack">${episodes.map(n=>`<span class="episodeNumberLine">E${escapeHtml(n)}</span>`).join("")}</span>`;
}

function tvPresentationRuntime(meta, episode){
  const exact = Number(episode?.runtimeSeconds ?? meta?.runtimeSeconds) || 0;
  if(exact){
    const total=Math.max(0,Math.round(exact));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    const s=total%60;
    return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
  }
  const approx = Number(meta?.runtimeApproxMinutes) || 0;
  return approx ? `~${approx} MIN` : "";
}

function tvFormatBadge(format){
  if(format === "PRiSM") return '<img class="detailPrismBadge" src="assets/format-logos/PRiSM.webp" alt="PRiSM">';
  if(format === "SiLVER35") return '<img class="detailSilver35Badge" src="assets/format-logos/SiLVER35.webp" alt="SiLVER35">';
  return "";
}

function injectTvEnhancementStyles(){
  if(document.getElementById("seriesTvEnhancementStyles")) return;
  const style = document.createElement("style");
  style.id = "seriesTvEnhancementStyles";
  style.textContent = `
    .seasonBannerGrid{grid-template-columns:1fr!important;gap:6px!important}
    button.seasonBanner{min-height:50px!important;border-radius:9px!important}
    .seasonBannerContent{padding:7px 12px!important}
    .seasonBannerTitle{font-size:16px!important}
    .seasonBannerMeta{margin-top:3px!important;font-size:11px!important}
    .seasonBannerScore{font-size:21px!important}
    .episodeGrid{grid-template-columns:1fr!important;gap:6px!important}
    .episodeCard{grid-template-columns:68px minmax(0,1fr) auto!important;column-gap:20px!important;min-height:48px!important;padding:7px 11px!important;border-radius:9px!important}
    .episodeCode{width:68px!important;display:grid!important;grid-template-columns:30px 38px!important;column-gap:0!important;align-items:stretch!important;line-height:1.03!important;white-space:nowrap!important}
    .episodeSeasonCode{display:flex!important;align-items:center!important;justify-content:flex-start!important;min-width:30px!important}
    .episodeNumberStack{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:1px!important;min-width:38px!important;margin-left:-2px!important}
    .episodeNumberLine{display:block!important}
    .tvBottomBack{display:inline-flex!important;margin:4px 0 28px!important}
    .tvPlotDescription{margin:17px 0 18px!important;max-width:980px!important}
    .tvEpisodePlot{max-width:900px!important}
    .tvEpisodeMetaRail{
      display:flex!important;
      width:max-content!important;
      max-width:100%!important;
      align-items:center!important;
      flex-wrap:wrap!important;
      gap:0!important;
      margin-top:14px!important;
      padding:7px 1px!important;
      border-top:1px solid rgba(197,155,69,.18)!important;
      border-bottom:1px solid rgba(197,155,69,.18)!important;
      color:#9eacc0!important;
      font-size:13.5px!important;
      font-weight:600!important;
      line-height:1.15!important;
      letter-spacing:.055em!important;
      font-variant-caps:normal!important;
      font-synthesis-small-caps:none!important;
    }
    .tvEpisodeMetaCode,.tvEpisodeMetaUncut{color:#c59b45!important;font-weight:700!important;letter-spacing:.075em!important}
    .tvEpisodeMetaSep{padding:0 .48em!important;color:rgba(197,155,69,.72)!important;font-weight:700!important}
    @media(max-width:620px){
      button.seasonBanner{min-height:47px!important}
      .seasonBannerContent{padding:7px 10px!important}
      .episodeCard{grid-template-columns:68px minmax(0,1fr) auto!important;column-gap:18px!important;min-height:46px!important;padding:7px 9px!important}
      .episodeCode{width:68px!important;grid-template-columns:30px 38px!important;column-gap:0!important}
      .episodeSeasonCode{min-width:30px!important}
      .tvEpisodeMetaRail{font-size:12.5px!important;letter-spacing:.045em!important}
    }
  `;
  document.head.appendChild(style);
}

seriesDetailMetaText = function(series){
  return [
    seriesYearText(series),
    `${series.seasonCount} ${series.seasonCount===1?"season":"seasons"}`,
    `${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`,
    series?.uncut ? "UNCUT" : ""
  ].filter(Boolean).join(" · ");
};

const baseEnhancedSeriesDetail = renderSeriesDetail;
renderSeriesDetail = function(series){
  baseEnhancedSeriesDetail(series);
  document.querySelectorAll("#seriesSeasons .seasonBannerMeta").forEach(meta=>{
    meta.textContent = meta.textContent.replace(/\s*·\s*\d+\s+entries\b/gi, "");
  });
};

const baseEnhancedOpenSeason = openTvSeason;
openTvSeason = async function(seriesId, seasonNumber){
  await loadTvPresentation(seriesId, seasonNumber);
  return baseEnhancedOpenSeason(seriesId, seasonNumber);
};

const baseEnhancedOpenEpisode = openTvEpisode;
openTvEpisode = async function(seriesId, seasonNumber, episodeId){
  await loadTvPresentation(seriesId, seasonNumber);
  return baseEnhancedOpenEpisode(seriesId, seasonNumber, episodeId);
};

const baseEnhancedRenderSeason = renderTvSeason;
renderTvSeason = function(series, seasonData){
  baseEnhancedRenderSeason(series, seasonData);
  const presentation = tvPresentation(series.id, seasonData.season);
  const hero = document.getElementById("seriesHero");
  const body = document.getElementById("seriesSeasons");
  if(!hero || !body) return;

  const topBack=document.getElementById("seriesBackBtn");
  if(topBack) topBack.textContent="← Overview";

  const meta = hero.querySelector(".tvSubMeta");
  if(meta) meta.textContent = meta.textContent.replace(/\s*·\s*\d+\s+scoring entries\b/gi, "");

  const scoreLine = hero.querySelector(".scoreLine");
  if(presentation?.description && scoreLine && !hero.querySelector(".tvPlotDescription")){
    scoreLine.insertAdjacentHTML("beforebegin", `<div class="detailDescription tvPlotDescription">${escapeHtml(presentation.description)}</div>`);
  }
  if(scoreLine && presentation?.format && !scoreLine.querySelector(".detailPrismBadge,.detailSilver35Badge")){
    scoreLine.insertAdjacentHTML("beforeend", tvFormatBadge(presentation.format));
  }

  const episodeMap = presentation?.episodes || {};
  body.querySelectorAll(".episodeCard[data-episode]").forEach(card=>{
    const episode = tvEpisodeById(seasonData, card.dataset.episode);
    const episodeMeta = episodeMap[card.dataset.episode];
    if(!episode) return;
    const code=card.querySelector(".episodeCode");
    if(code) code.innerHTML=tvEpisodeCodeMarkup(seasonData.season,episode.number);
    const detail = card.children[1];
    const title = detail?.querySelector(".episodeTitle");
    if(title) title.textContent = tvDisplayEpisodeTitle(episode.title);
    detail?.querySelector(".episodeRuntime")?.remove();
    const facts = [tvPresentationRuntime(episodeMeta,episode), tvFormatAirDate(episode.airDate || episodeMeta?.airDate)].filter(Boolean);
    if(detail && facts.length){
      detail.insertAdjacentHTML("beforeend", `<div class="episodeRuntime">${escapeHtml(facts.join(" · "))}</div>`);
    }
  });

  const episodeGrid=body.querySelector(".episodeGrid");
  if(episodeGrid && !body.querySelector(".tvBottomBack")){
    const bottomBack=document.createElement("button");
    bottomBack.type="button";
    bottomBack.className="backBtn tvBottomBack";
    bottomBack.textContent="← Overview";
    bottomBack.addEventListener("click",()=>document.getElementById("seriesBackBtn")?.click());
    episodeGrid.insertAdjacentElement("afterend",bottomBack);
  }

  const progress = hero.querySelector(".progressText");
  if(progress){
    const seasonRated = tvRatedCount(seasonData.seasonRatings, TV_SEASON_CATEGORIES);
    const complete = tvCompletedEpisodes(seasonData);
    const total = seasonData.episodes?.length || 0;
    progress.textContent = `${seasonRated} / 12 season ratings · ${complete} / ${total} episode scores complete`;
  }
};

const baseEnhancedRenderEpisode = renderTvEpisode;
renderTvEpisode = function(series, seasonData, episode){
  baseEnhancedRenderEpisode(series, seasonData, episode);
  const presentation = tvEpisodePresentation(series.id, seasonData.season, episode.id);
  const seasonPresentation = tvPresentation(series.id, seasonData.season);
  const hero = document.getElementById("seriesHero");
  if(!hero) return;

  const title = hero.querySelector("h1");
  if(title) title.textContent = tvDisplayEpisodeTitle(episode.title);

  const meta = hero.querySelector(".tvSubMeta");
  const episodeCode=`S${String(seasonData.season).padStart(2,"0")} E${tvDisplayEpisodeNumber(episode.number)}`;
  const date=tvFormatAirDate(episode.airDate || presentation?.airDate);
  const runtime=tvPresentationRuntime(presentation,episode);
  const facts=[
    [episodeCode,"tvEpisodeMetaCode"],
    [date,"tvEpisodeMetaDate"],
    [runtime,"tvEpisodeMetaRuntime"],
    [series?.uncut ? "UNCUT" : "","tvEpisodeMetaUncut"]
  ].filter(([value])=>Boolean(value));
  if(meta){
    meta.classList.add("tvEpisodeMetaRail");
    meta.innerHTML=facts.map(([value,className],index)=>`${index?'<span class="tvEpisodeMetaSep">·</span>':''}<span class="${className}">${escapeHtml(value)}</span>`).join("");
  }

  const scoreLine = hero.querySelector(".scoreLine");
  if(presentation?.description && scoreLine && !hero.querySelector(".tvPlotDescription")){
    scoreLine.insertAdjacentHTML("beforebegin", `<div class="detailDescription tvPlotDescription tvEpisodePlot">${escapeHtml(presentation.description)}</div>`);
  }
  if(scoreLine && seasonPresentation?.format && !scoreLine.querySelector(".detailPrismBadge,.detailSilver35Badge")){
    scoreLine.insertAdjacentHTML("beforeend", tvFormatBadge(seasonPresentation.format));
  }
};

injectTvEnhancementStyles();
if(activeSeriesId) renderActiveTvView();