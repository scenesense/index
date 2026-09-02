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

function tvPresentationRuntime(meta, episode){
  const exact = Number(episode?.runtimeSeconds ?? meta?.runtimeSeconds) || 0;
  if(exact) return tvRuntimeText(exact);
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
    .episodeCard{min-height:48px!important;padding:7px 11px!important;border-radius:9px!important}
    .tvPlotDescription{margin:17px 0 18px!important;max-width:980px!important}
    .tvEpisodePlot{max-width:900px!important}
    @media(max-width:620px){
      button.seasonBanner{min-height:47px!important}
      .seasonBannerContent{padding:7px 10px!important}
      .episodeCard{min-height:46px!important;padding:7px 9px!important}
    }
  `;
  document.head.appendChild(style);
}

seriesDetailMetaText = function(series){
  return [
    seriesYearText(series),
    `${series.seasonCount} ${series.seasonCount===1?"season":"seasons"}`,
    `${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`
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
    const detail = card.children[1];
    detail?.querySelector(".episodeRuntime")?.remove();
    const facts = [tvPresentationRuntime(episodeMeta,episode), tvFormatAirDate(episode.airDate || episodeMeta?.airDate)].filter(Boolean);
    if(detail && facts.length){
      detail.insertAdjacentHTML("beforeend", `<div class="episodeRuntime">${escapeHtml(facts.join(" · "))}</div>`);
    }
  });

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

  const meta = hero.querySelector(".tvSubMeta");
  const facts = [
    `S${String(seasonData.season).padStart(2,"0")} E${tvDisplayEpisodeNumber(episode.number)}`,
    tvFormatAirDate(episode.airDate || presentation?.airDate),
    tvPresentationRuntime(presentation,episode)
  ].filter(Boolean);
  if(meta) meta.textContent = facts.join(" · ");

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
