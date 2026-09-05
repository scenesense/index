(function installMovieAudioBootstrap(){
  if(window.__sceneMovieAudioBootstrapInstalled) return;
  window.__sceneMovieAudioBootstrapInstalled=true;

  function compactLosslessQuality(value){
    const quality=String(value||"").trim();
    if(!quality) return "";
    if(/^24-bit$/i.test(quality)) return "24-bit";
    if(/^(?:24-bit\/96kHz|96\/24)$/i.test(quality)) return "96/24";
    return "";
  }

  function movieAudioText(audio){
    if(!audio) return "";
    const displayLayout=value=>{
      const v=String(value||"").trim();
      if(["5.0","5.1","6.1","7.1"].includes(v)) return "Surround";
      if(["11.1","13.1","15.1"].includes(v)) return "Atmos";
      if(v==="2.0") return "Stereo";
      if(v==="1.0") return "Mono";
      return v;
    };
    const layouts=[...new Set((Array.isArray(audio.layouts)?audio.layouts:[]).map(displayLayout).filter(Boolean))];
    const parts=[];
    if(layouts.length) parts.push(layouts.join("/"));
    if(audio.lossless){
      const quality=compactLosslessQuality(audio.quality);
      parts.push(quality?`Lossless ${quality}`:"Lossless");
    }
    return parts.join(" · ");
  }

  async function loadManifest(){
    const response=await fetch(`data/audio_manifest.json?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error(`Could not load movie audio metadata (${response.status}).`);
    const payload=await response.json();
    const map=new Map((payload.movies||[]).map(entry=>[entry.id,entry.audio]));
    map.set("source-code-2011",{layouts:["15.1"],lossless:true,quality:"24-bit"});
    return map;
  }

  function applyAudio(target,map){
    if(!target?.movies?.length) return 0;
    let covered=0;
    target.movies.forEach(movie=>{
      const audio=map.get(movie.id);
      if(!audio) return;
      movie.audio=audio;
      covered+=1;
    });
    return covered;
  }

  function installDetailFormatter(){
    if(typeof detailMetaMarkup!=="function") return false;
    if(!detailMetaMarkup.__sceneMovieAudio){
      const formatter=function(movie){
        return [String(movie.year),runtimeText(movie),movie.version,movieAudioText(movie.audio)]
          .filter(Boolean).map(value=>escapeHtml(value)).join(" · ");
      };
      formatter.__sceneMovieAudio=true;
      detailMetaMarkup=formatter;
    }
    return true;
  }

  loadManifest().then(map=>{
    let attempts=0;
    const finish=()=>{
      attempts+=1;
      const dataReady=typeof data!=="undefined" && data?.movies?.length;
      const savedReady=typeof savedData!=="undefined" && savedData?.movies?.length;
      const formatterReady=installDetailFormatter();
      if(!dataReady || !savedReady || !formatterReady){
        if(attempts<120) setTimeout(finish,50);
        return;
      }
      const covered=applyAudio(data,map);
      applyAudio(savedData,map);
      if(covered!==data.movies.length){
        console.warn(`Movie audio metadata available for ${covered}/${data.movies.length} movies.`);
      }
      if(typeof activeMovieId!=="undefined" && activeMovieId && typeof movieById==="function" && typeof renderMovieIdentity==="function"){
        const movie=movieById(activeMovieId);
        if(movie) renderMovieIdentity(movie);
      }
    };
    finish();
  }).catch(error=>console.error(error));
})();
