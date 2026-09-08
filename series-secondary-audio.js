(function installSeriesSecondaryAudio(){
  if(window.__sceneSeriesSecondaryAudioInstalled) return;
  window.__sceneSeriesSecondaryAudioInstalled=true;

  function currentSecondaryAudioLabel(){
    try{
      if(typeof activeSeriesId==="undefined" || !activeSeriesId) return "";
      if(typeof activeTvSeasonNumber==="undefined" || activeTvSeasonNumber==null) return "";
      if(typeof tvPresentation!=="function") return "";
      return String(tvPresentation(activeSeriesId,activeTvSeasonNumber)?.secondaryAudioLabel || "").trim();
    }catch(error){ return ""; }
  }

  function appendEpisodeLabel(meta,label){
    if(meta.querySelector(".tvSecondaryAudioLabel")) return;
    const labelSpan=document.createElement("span");
    labelSpan.className="tvSecondaryAudioLabel";
    labelSpan.textContent=label;
    const sep=document.createElement("span");
    sep.className="tvEpisodeMetaSep tvSecondaryAudioSep";
    sep.textContent="·";
    const edition=meta.querySelector(".tvEpisodeMetaUncut");
    if(edition){
      const before=edition.previousElementSibling;
      if(before?.classList.contains("tvEpisodeMetaSep")){
        meta.insertBefore(sep,before);
        meta.insertBefore(labelSpan,before);
      }else{
        meta.insertBefore(sep,edition);
        meta.insertBefore(labelSpan,edition);
      }
    }else{
      meta.appendChild(sep);
      meta.appendChild(labelSpan);
    }
  }

  function applySecondaryAudio(){
    const label=currentSecondaryAudioLabel();
    const meta=document.querySelector("#seriesHero .tvSubMeta");
    if(!meta || !label) return;
    if(meta.textContent.includes(label)) return;
    if(meta.classList.contains("tvEpisodeMetaRail")){
      appendEpisodeLabel(meta,label);
    }else if(meta.classList.contains("tvDetailMetaRail")){
      meta.appendChild(document.createTextNode(` · ${label}`));
    }
  }

  let queued=false;
  const queueApply=()=>{
    if(queued) return;
    queued=true;
    queueMicrotask(()=>{ queued=false; applySecondaryAudio(); });
  };
  const observer=new MutationObserver(queueApply);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener("hashchange",queueApply);
  queueApply();
})();
