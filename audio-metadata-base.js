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
    const rawLayouts=Array.isArray(audio.layouts)?audio.layouts.filter(Boolean):[];
    const displayLayout=value=>{
      const v=String(value||"").trim();
      if(["5.0","5.1","6.1","7.1"].includes(v)) return "Surround";
      if(["11.1","13.1","15.1"].includes(v)) return "Atmos";
      if(v==="2.0") return "Stereo";
      if(v==="1.0") return "Mono";
      return v;
    };
    const layouts=[...new Set(rawLayouts.map(displayLayout).filter(Boolean))];
    const parts=[];
    if(layouts.length) parts.push(layouts.join("/"));
    if(audio.lossless){
      const quality=compactLosslessQuality(audio.quality);
      parts.push(quality ? `Lossless ${quality}` : "Lossless");
    }
    return parts.join(" · ");
  }
  window.sceneAudioText=audioText;

  if(typeof seriesYearText==="function"){
    seriesYearText=function(series){
      const start=series?.yearStart;
      const end=series?.yearEnd;
      if(!start) return "";
      return !end || Number(start)===Number(end) ? String(start) : `${start}–${end}`;
    };
  }

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
      series?.edition ||
      (series?.uncut ? "UNCUT" : "")
    ).trim();
  }

  function episodeEditionText(series,seasonData,episode){
    const presentation=typeof tvEpisodePresentation==="function" ? tvEpisodePresentation(series.id,seasonData.season,episode.id) : null;
    const seasonPresentation=typeof tvPresentation==="function" ? tvPresentation(series.id,seasonData.season) : null;
    const catalog=catalogSeason(series,seasonData.season);
    const explicit=String(
      episode?.cutLabel || episode?.edition ||
      presentation?.cutLabel || presentation?.edition || ""
    ).trim();
    if(explicit) return explicit;
    const legacyUncut=/\bUNCUT\b|\(Uncut\)/i.test(String(episode?.title||""));
    if(series?.uncut || episode?.uncut || legacyUncut) return "UNCUT";
    return String(
      seasonPresentation?.edition || seasonPresentation?.cutLabel ||
      seasonData?.edition || seasonData?.cutLabel ||
      catalog?.edition || catalog?.cutLabel ||
      series?.edition || ""
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

  function seriesDetailTextLocal(series){
    const year=typeof seriesYearText==="function" ? seriesYearText(series) : seasonYearTextLocal({yearStart:series?.yearStart,yearEnd:series?.yearEnd});
    const seasons=series?.seasonCount==null ? "" : `${series.seasonCount} ${series.seasonCount===1?"season":"seasons"}`;
    const episodes=series?.episodeCount==null ? "" : `${series.episodeCount} ${series.episodeCount===1?"episode":"episodes"}`;
    const edition=String(series?.edition || (series?.uncut ? "UNCUT" : "")).trim();
    return [year,seasons,episodes,edition].filter(Boolean).join(" · ");
  }

  function rebuildEpisodeDetailMeta(meta,audio,edition){
    const text=audioText(audio);
    if(!meta || !meta.classList.contains("tvEpisodeMetaRail")) return;
    const facts=[
      [meta.querySelector(".tvEpisodeMetaCode")?.textContent||"","tvEpisodeMetaCode"],
      [meta.querySelector(".tvEpisodeMetaDate")?.textContent||"","tvEpisodeMetaDate"],
      [meta.querySelector(".tvEpisodeMetaRuntime")?.textContent||"","tvEpisodeMetaRuntime"],
      [text,"tvEpisodeMetaAudio"],
      [edition || meta.querySelector(".tvEpisodeMetaUncut")?.textContent||"","tvEpisodeMetaUncut"]
    ].filter(([value])=>Boolean(String(value).trim()));
    meta.innerHTML=facts.map(([value,className],index)=>`${index?'<span class="tvEpisodeMetaSep">·</span>':''}<span class="${className}">${escapeHtml(value)}</span>`).join("");
    meta.dataset.sceneAudio=text;
  }

  const tvFormatMap={
    BLURAY:["detailBlurayBadge","BLURAY.webp","Blu-ray"],
    PRiSM:["detailPrismBadge","PRiSM.webp","PRiSM"],
    SiLVER8:["detailSilver8Badge","SiLVER8.webp","SiLVER8"],
    SiLVER16:["detailSilver16Badge","SiLVER16.webp","SiLVER16"],
    SiLVER35:["detailSilver35Badge","SiLVER35.webp","SiLVER35"],
    SiLVER55:["detailSilver55Badge","SiLVER55.webp","SiLVER55"],
    SiLVER70:["detailSilver70Badge","SiLVER70.webp","SiLVER70"],
    BRAZiER35:["detailBrazier35Badge","BRAZiER35.webp","BRAZiER35"],
    BRAZiER70:["detailBrazier70Badge","BRAZiER70.webp","BRAZiER70"],
    CLARiTY35:["detailClarity35Badge","CLARiTY35.webp","CLARiTY35"],
    CLARiTY70:["detailClarity70Badge","CLARiTY70.webp","CLARiTY70"]
  };

  function formatList(presentation){
    if(!presentation) return [];
    const list=Array.isArray(presentation.formats) ? presentation.formats : [presentation.format];
    return [...new Set(list.filter(Boolean))];
  }

  function tvFormatBadgeLocal(format){
    const spec=tvFormatMap[format];
    if(!spec) return "";
    const [className,file,alt]=spec;
    return `<img class="${className} tvFormatBadge" src="assets/format-logos/${file}" alt="${alt}">`;
  }

  function renderTvFormatBadges(scoreLine,presentation){
    if(!scoreLine) return;
    const formats=formatList(presentation);
    if(!formats.length) return;
    scoreLine.querySelectorAll(".detailBlurayBadge,.detailPrismBadge,.detailSilver8Badge,.detailSilver16Badge,.detailSilver35Badge,.detailSilver55Badge,.detailSilver70Badge,.detailBrazier35Badge,.detailBrazier70Badge,.detailClarity35Badge,.detailClarity70Badge").forEach(node=>node.remove());
    scoreLine.insertAdjacentHTML("beforeend",formats.map(tvFormatBadgeLocal).join(""));
  }

  if(typeof tvFormatBadge==="function"){
    tvFormatBadge=tvFormatBadgeLocal;
  }

  if(!document.getElementById("tvMixedFormatBadgeStyles")){
    const style=document.createElement("style");
    style.id="tvMixedFormatBadgeStyles";
    style.textContent=`
      #seriesHero .scoreLine .tvFormatBadge{
        width:auto!important;
        height:44px!important;
        max-width:200px!important;
        max-height:44px!important;
        object-fit:contain!important;
      }
      #seriesHero .scoreLine .tvFormatBadge + .tvFormatBadge{margin-left:10px!important}
      @media(max-width:620px){
        #seriesHero .scoreLine .tvFormatBadge{height:38px!important;max-height:38px!important}
        #seriesHero .scoreLine .tvFormatBadge + .tvFormatBadge{margin-left:8px!important}
      }
    `;
    document.head.appendChild(style);
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
        return [String(movie.year),runtimeText(movie),movie.version,audioText(movie.audio)]
          .filter(Boolean).map(value=>escapeHtml(value)).join(" · ");
      };
    }

    // Series detail remains catalogue metadata only: no audio, but a collection-wide edition may be shown last.
    if(typeof renderSeriesDetail==="function"){
      const baseRenderSeriesDetail=renderSeriesDetail;
      renderSeriesDetail=function(series){
        baseRenderSeriesDetail(series);
        const detailTitle=document.querySelector("#seriesHero h1");
        if(detailTitle) detailTitle.textContent=series.detailTitle || series.title;
        const overviewMeta=document.querySelector("#seriesHero .movieSummary .eyebrow");
        if(overviewMeta) overviewMeta.textContent=seriesDetailTextLocal(series);
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
        const presentation=typeof tvPresentation==="function" ? tvPresentation(series.id,seasonData.season) : null;
        const meta=document.querySelector("#seriesHero .tvSubMeta");
        if(meta){
          meta.textContent=seasonDetailText(series,seasonData);
          meta.dataset.sceneAudio=audioText(seasonData?.audio || catalogSeasonAudio(series,seasonData.season) || series?.audio);
        }
        renderTvFormatBadges(document.querySelector("#seriesHero .scoreLine"),presentation);
        // Episode-list rows intentionally omit audio. Runtime/date/cut status remain enough here.
      };
    }

    if(typeof renderTvEpisode==="function"){
      const baseRenderTvEpisode=renderTvEpisode;
      renderTvEpisode=function(series,seasonData,episode){
        baseRenderTvEpisode(series,seasonData,episode);
        const episodePresentation=typeof tvEpisodePresentation==="function" ? tvEpisodePresentation(series.id,seasonData.season,episode.id) : null;
        const seasonPresentation=typeof tvPresentation==="function" ? tvPresentation(series.id,seasonData.season) : null;
        rebuildEpisodeDetailMeta(
          document.querySelector("#seriesHero .tvSubMeta"),
          tvAudioFor(series,seasonData,episode),
          episodeEditionText(series,seasonData,episode)
        );
        renderTvFormatBadges(document.querySelector("#seriesHero .scoreLine"),formatList(episodePresentation).length ? episodePresentation : seasonPresentation);
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
