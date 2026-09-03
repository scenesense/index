(async function installSceneAudioMetadata(){
  if(window.__sceneAudioMetadataInstalled) return;
  window.__sceneAudioMetadataInstalled=true;

  function audioText(audio){
    if(!audio) return "";
    const layouts=Array.isArray(audio.layouts)?audio.layouts.filter(Boolean):[];
    const parts=[];
    if(layouts.length) parts.push(layouts.join("/"));
    if(audio.lossless) parts.push("Lossless");
    if(audio.lossless && audio.quality) parts.push(String(audio.quality));
    return parts.join(" · ");
  }
  window.sceneAudioText=audioText;

  function appendTextAudio(target,audio){
    const text=audioText(audio);
    if(!target || !text) return;
    if(target.dataset.sceneAudio===text) return;
    target.textContent=`${target.textContent} · ${text}`;
    target.dataset.sceneAudio=text;
  }

  function catalogSeasonAudio(series,seasonNumber){
    return series?.seasons?.find(season=>Number(season.number)===Number(seasonNumber))?.audio || null;
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

  try{
    const response=await fetch(`data/audio_manifest.json?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error(`Could not load movie audio metadata (${response.status}).`);
    const payload=await response.json();
    const movieAudio=new Map((payload.movies||[]).map(entry=>[entry.id,entry.audio]));

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

    if(typeof cardMetaMarkup==="function"){
      cardMetaMarkup=function(movie){
        return [String(movie.year),`${movie.runtimeMinutes} min`,movie.version,audioText(movie.audio)]
          .filter(Boolean).map(value=>escapeHtml(value)).join(" · ");
      };
    }
    if(typeof detailMetaMarkup==="function"){
      detailMetaMarkup=function(movie){
        return [String(movie.year),runtimeText(movie),movie.version,audioText(movie.audio)]
          .filter(Boolean).map(value=>escapeHtml(value)).join(" · ");
      };
    }

    if(typeof seriesMetaText==="function"){
      const baseSeriesMetaText=seriesMetaText;
      seriesMetaText=function(series){
        return [baseSeriesMetaText(series),audioText(series?.audio)].filter(Boolean).join(" · ");
      };
    }
    if(typeof seriesDetailMetaText==="function"){
      const baseSeriesDetailMetaText=seriesDetailMetaText;
      seriesDetailMetaText=function(series){
        return [baseSeriesDetailMetaText(series),audioText(series?.audio)].filter(Boolean).join(" · ");
      };
    }

    if(typeof renderSeriesDetail==="function"){
      const baseRenderSeriesDetail=renderSeriesDetail;
      renderSeriesDetail=function(series){
        baseRenderSeriesDetail(series);
        document.querySelectorAll("#seriesSeasons .seasonBanner[data-season]").forEach(banner=>{
          const season=(series.seasons||[]).find(item=>Number(item.number)===Number(banner.dataset.season));
          appendTextAudio(banner.querySelector(".seasonBannerMeta"),season?.audio);
        });
      };
    }

    if(typeof renderTvSeason==="function"){
      const baseRenderTvSeason=renderTvSeason;
      renderTvSeason=function(series,seasonData){
        baseRenderTvSeason(series,seasonData);
        appendTextAudio(document.querySelector("#seriesHero .tvSubMeta"),catalogSeasonAudio(series,seasonData.season));
        document.querySelectorAll("#seriesSeasons .episodeCard[data-episode]").forEach(card=>{
          const episode=typeof tvEpisodeById==="function"?tvEpisodeById(seasonData,card.dataset.episode):null;
          if(!episode) return;
          const detail=card.children[1];
          let meta=detail?.querySelector(".episodeRuntime");
          const audio=tvAudioFor(series,seasonData,episode);
          const text=audioText(audio);
          if(!detail || !text) return;
          if(!meta){
            meta=document.createElement("div");
            meta.className="episodeRuntime";
            detail.appendChild(meta);
          }
          appendTextAudio(meta,audio);
        });
      };
    }

    if(typeof renderTvEpisode==="function"){
      const baseRenderTvEpisode=renderTvEpisode;
      renderTvEpisode=function(series,seasonData,episode){
        baseRenderTvEpisode(series,seasonData,episode);
        const meta=document.querySelector("#seriesHero .tvSubMeta");
        const audio=tvAudioFor(series,seasonData,episode);
        const text=audioText(audio);
        if(!meta || !text || meta.dataset.sceneAudio===text) return;
        if(meta.classList.contains("tvEpisodeMetaRail")){
          meta.insertAdjacentHTML("beforeend",`<span class="tvEpisodeMetaSep">·</span><span class="tvEpisodeMetaAudio">${escapeHtml(text)}</span>`);
          meta.dataset.sceneAudio=text;
        }else{
          appendTextAudio(meta,audio);
        }
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
