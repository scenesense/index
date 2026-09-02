(async function loadSeriesTvScoring(){
  try{
    const response=await fetch(`series-tv.js?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error(`Could not load TV scoring module (${response.status}).`);
    let source=await response.text();
    source=source.replaceAll("“","\"").replaceAll("”","\"");
    const script=document.createElement("script");
    script.textContent=source;
    script.dataset.scenesenseSeriesScoring="1";
    document.body.appendChild(script);
  }catch(error){
    console.error(error);
  }
})();
