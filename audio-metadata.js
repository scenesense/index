(function(){
  const loadExtras=()=>{
    if(!document.querySelector('script[data-scenesense-series-additions]')){
      const additions=document.createElement("script");
      additions.src=`series-catalog-additions.js?v=${Date.now()}`;
      additions.dataset.scenesenseSeriesAdditions="1";
      document.body.appendChild(additions);
    }
  };
  const base=document.createElement("script");
  base.src=`audio-metadata-base.js?v=${Date.now()}`;
  base.dataset.scenesenseAudioMetadataBase="1";
  base.onload=loadExtras;
  document.body.appendChild(base);
})();
