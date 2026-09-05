(async function loadSceneSeriesAdditions(){
  try{
    const sources=[
      `data/series/index-additions.json?v=${Date.now()}`,
      `data/series/index-additions-sep06.json?v=${Date.now()}`,
      `data/series/index-additions-melrose.json?v=${Date.now()}`,
      `data/series/index-additions-mscl.json?v=${Date.now()}`
    ];
    const additions=[];
    for(const source of sources){
      try{
        const response=await fetch(source,{cache:"no-store"});
        if(!response.ok) continue;
        const payload=await response.json();
        (payload.series||[]).forEach(series=>additions.push(series));
      }catch(error){ console.error(error); }
    }
    if(typeof seriesCatalog==="undefined" || !Array.isArray(seriesCatalog)) return;
    const known=new Set(seriesCatalog.map(series=>series.id));
    additions.forEach(series=>{ if(!known.has(series.id)){ seriesCatalog.push(series); known.add(series.id); } });
    if(typeof renderLibrary==="function") renderLibrary();
    const hash=location.hash;
    if(hash.startsWith("#series=")){
      const id=decodeURIComponent(hash.replace(/^#series=/,""));
      if(additions.some(series=>series.id===id) && typeof openSeries==="function") openSeries(id,false);
    }
  }catch(error){ console.error(error); }
})();
