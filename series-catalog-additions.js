(async function loadSceneSeriesAdditions(){
  try{
    const response=await fetch(`data/series/index-additions.json?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) return;
    const payload=await response.json();
    if(typeof seriesCatalog==="undefined" || !Array.isArray(seriesCatalog)) return;
    const known=new Set(seriesCatalog.map(series=>series.id));
    (payload.series||[]).forEach(series=>{ if(!known.has(series.id)){ seriesCatalog.push(series); known.add(series.id); } });
    if(typeof renderLibrary==="function") renderLibrary();
    const hash=location.hash;
    if(hash.startsWith("#series=")){
      const id=decodeURIComponent(hash.replace(/^#series=/,""));
      if((payload.series||[]).some(series=>series.id===id) && typeof openSeries==="function") openSeries(id,false);
    }
  }catch(error){ console.error(error); }
})();
