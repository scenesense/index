(async function installSceneAudioMetadata(){
  if(window.__sceneAudioMetadataInstalled) return;
  window.__sceneAudioMetadataInstalled=true;

  function compactLosslessQuality(value){
    const quality=String(value||"").trim();
    if(!quality) return "";
    if(/^24-bit$/i.test(quality)) return "24-bit";
    const hiRes=quality.match(/^24-bit\/(\d+(?:\.\d+)?)kHz$/i);
    if(hiRes) return `24/${hiRes[1]}`;
    return quality;
  }

  function audioText(audio){
    if(!audio) return "";
    const layouts=Array.isArray(audio.layouts)?audio.layouts.filter(Boolean):[];
    const parts=[];
    if(layouts.length) parts.push(layouts.join("/"));
    if(audio.lossless){
      const quality=compactLosslessQuality(audio.quality);
      parts.push(quality ? `Lossless ${quality}` : "Lossless");
    }
    return parts.join(" · ");
  }
  window.sceneAudioText=audioText;

  function catalogSeason(series,seasonNumber){
    return series?.seasons?.find(season=>Number(season.number)===Number(seasonNumber)) || null;
  }

  function catalogSeasonAudio(series,seasonNumber){
    return catalogSeason(series,seasonNumber)?.audio || null;
  }

  function tvAudioFor(series,seasonData,episode){
    let presentation=null;
    try{
      if(episode && typeof tvEpisodePresentation==="function"){
        presentation=tvEpisodePresentation(series.id,seasonData.season,episode.id);
      }
    }catch(error){}
    return episode?.audio || presentation?.audio || seasonData?.audio || catalogSeasonAudio(series,seasonData?.season) || series?.audio || null;
  }

  function seasonYearTextLocal(season){
    const start=season?.yearStart;
    const end=season?.yearEnd;
    if(!start) return "";
    return !end || Number(start)===Number(end) ? String(start) : `${start}–${end}`;
  }

  function seasonEditionText(series,seasonData,presentation){
    const catalog=catalogSeason(series,seasonData?.season ?? presentation?.season);
    return String(
      presentation?.edition || presentation?.cutLabel ||
      seasonData?.edition || seasonData?.cutLabel ||
      catalog?.edition || catalog?.cutLabel ||
      (series?.uncut ? "UNCUT" : "")
    ).trim();
  }

  function seasonOverviewText(series,season){
    const year=seasonYearTextLocal(season);
    const episodes=season?.episodeCount==null ? "" : `${season.episodeCount} ${season.episodeCount===1?"episode":"episodes"}`;
    const edition=seasonEditionText(series,season,null);
    return [year,episodes,audioText(season?.audio),edition].filter(Boolean).join(" · ");
  }

  function seasonDetailText(series,seasonData){
    const catalog=catalogSeason(series,seasonData?.season);
    const presentation=typeof tvPresentation==="function" ? tvPresentation(series.id,seasonData.season) : null;
    const season=catalog || seasonData;
    const year=seasonYearTextLocal(season);
    const episodeCount=catalog?.episodeCount ?? seasonData?.episodes?.length;
    const episodes=episodeCount==null ? "" : `${episodeCount} ${episodeCount===1?"episode":"episodes"}`;
    const audio=seasonData?.audio || catalog?.audio || series?.audio || null;
    const edition=seasonEditionText(series,seasonData,presentation);
    return [year,episodes,audioText(audio),edition].filter(Boolean).join(" · ");
  }

  function rebuildEpisodeDetailMeta(meta,audio){
    const text=audioText(audio);
    if(!meta || !text || !meta.classList.contains("tvEpisodeMetaRail")) return;
    const facts=[
      [meta.querySelector(".tvEpisodeMetaCode")?.textContent||"","tvEpisodeMetaCode"],
      [meta.querySelector(".tvEpisodeMetaDate")?.textContent||"","tvEpisodeMetaDate"],
      [meta.querySelector(".tvEpisodeMetaRuntime")?.textContent||"","tvEpisodeMetaRuntime"],
      [text,"tvEpisodeMetaAudio"],
      [meta.querySelector(".tvEpisodeMetaUncut")?.textContent||"","tvEpisodeMetaUncut"]
    ].filter(([value])=>Boolean(String(value).trim()));
    meta.innerHTML=facts.map(([value,className],index)=>`${index?'<span class="tvEpisodeMetaSep">·</span>':''}<span class="${className}">${escapeHtml(value)}</span>`).join("");
    meta.dataset.sceneAudio=text;
  }

  try{
    const response=await fetch(`data/audio_manifest.json?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error(`Could not load movie audio metadata (${response.status}).`);
    const payload=await response.json();
    const movieAudio=new Map((payload.movies||[]).map(entry=>[entry.id,entry.audio]));

    // The media filename is authoritative here: the scan incorrectly reported Source Code as 7.1.
    movieAudio.set("source-code-2011",{layouts:["15.1"],lossless:true,quality:"24-bit"});

    const applyAudioToMovies=target=>{
      if(!target?.movies?.length) return 0;
      let covered=0;
      target.movies.forEach(movie=>{
        const audio=movieAudio.get(movie.id);
        if(!audio) return;
        movie.audio=audio;
        covered+=1;
      });
      return covered;
    };

    const applyMovieAudio=()=>{
      if(typeof data==="undefined" || !data?.movies?.length) return false;
      if(typeof savedData==="undefined" || !savedData?.movies?.length) return false;
      const covered=applyAudioToMovies(data);
      applyAudioToMovies(savedData);
      if(covered!==data.movies.length){
        console.warn(`Audio metadata available for ${covered}/${data.movies.length} movies.`);
      }
      return true;
    };

    // Library cards deliberately stay compact. Audio belongs on the movie detail view only.
    if(typeof detailMetaMarkup==="function"){
      detailMetaMarkup=function(movie){
        return [String(movie.year),runtimeText(movie),audioText(movie.audio),movie.version]
          .filter(Boolean).map(value=>escapeHtml(value)).join(" · ");
      };
    }

    // Series-level metadata deliberately remains editorial/catalogue metadata only.
    // Season rows carry audio and edition/cut information instead.
    if(typeof renderSeriesDetail==="function"){
      const baseRenderSeriesDetail=renderSeriesDetail;
      renderSeriesDetail=function(series){
        baseRenderSeriesDetail(series);
        document.querySelectorAll("#seriesSeasons .seasonBanner[data-season]").forEach(banner=>{
          const season=catalogSeason(series,banner.dataset.season);
          const meta=banner.querySelector(".seasonBannerMeta");
          if(meta && season) meta.textContent=seasonOverviewText(series,season);
        });
      };
    }

    if(typeof renderTvSeason==="function"){
      const baseRenderTvSeason=renderTvSeason;
      renderTvSeason=function(series,seasonData){
        baseRenderTvSeason(series,seasonData);
        const meta=document.querySelector("#seriesHero .tvSubMeta");
        if(meta){
          meta.textContent=seasonDetailText(series,seasonData);
          meta.dataset.sceneAudio=audioText(seasonData?.audio || catalogSeasonAudio(series,seasonData.season) || series?.audio);
        }
        // Episode-list rows intentionally omit audio. Runtime/date/cut status remain enough here.
      };
    }

    if(typeof renderTvEpisode==="function"){
      const baseRenderTvEpisode=renderTvEpisode;
      renderTvEpisode=function(series,seasonData,episode){
        baseRenderTvEpisode(series,seasonData,episode);
        rebuildEpisodeDetailMeta(document.querySelector("#seriesHero .tvSubMeta"),tvAudioFor(series,seasonData,episode));
      };
    }

    let attempts=0;
    const finish=()=>{
      attempts+=1;
      if(!applyMovieAudio() && attempts<80){
        setTimeout(finish,50);
        return;
      }
      if(typeof renderLibrary==="function") renderLibrary();
      if(typeof activeMovieId!=="undefined" && activeMovieId && typeof movieById==="function" && typeof renderMovieIdentity==="function"){
        const movie=movieById(activeMovieId);
        if(movie) renderMovieIdentity(movie);
      }
      if(typeof activeSeriesId!=="undefined" && activeSeriesId && typeof renderActiveTvView==="function"){
        renderActiveTvView();
      }
    };
    finish();
  }catch(error){
    console.error(error);
  }
})();
