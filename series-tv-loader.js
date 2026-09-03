(async function loadSeriesTvScoring(){
  try{
    if(!document.querySelector('script[data-scenesense-poster-warmth]')){
      const warmth=document.createElement("script");
      warmth.src=`poster-warmth.js?v=${Date.now()}`;
      warmth.dataset.scenesensePosterWarmth="1";
      document.body.appendChild(warmth);
    }

    const casting=TV_SEASON_CATEGORIES.find(cat=>cat.key==="casting");
    if(casting?.items?.[0]){
      casting.items[0][2]="Do the actors feel naturally right for their characters?";
    }

    const performanceIndex=TV_EPISODE_CATEGORIES.findIndex(cat=>cat.key==="performance");
    const alreadySeasonLevel=TV_SEASON_CATEGORIES.some(cat=>cat.key==="performance");
    if(performanceIndex>=0&&!alreadySeasonLevel){
      const performance=TV_EPISODE_CATEGORIES.splice(performanceIndex,1)[0];
      TV_SEASON_CATEGORIES.splice(1,0,{
        ...performance,
        items:[
          ["embodiment","Embodiment","Do the actors disappear convincingly into their roles?"],
          ["emotion","Emotion","Do the emotions feel genuine rather than performed?"]
        ]
      });
    }

    const response=await fetch(`series-tv.js?v=${Date.now()}`,{cache:"no-store"});
    if(!response.ok) throw new Error(`Could not load TV scoring module (${response.status}).`);
    let source=await response.text();
    source=source
      .replaceAll("“","\"")
      .replaceAll("”","\"")
      .replaceAll(" / 10 season ratings"," / 12 season ratings")
      .replaceAll(" / 20 episode ratings"," / 18 episode ratings")
      .replace("These 5 production-level categories are inherited by every episode in this season.","These 6 season-level categories are inherited by every episode in this season.")
      .replace("10 episode-specific categories. Season production scores supply the other 5 categories.","9 episode-specific categories. Season scores supply the other 6 categories.");

    const script=document.createElement("script");
    script.textContent=source;
    script.dataset.scenesenseSeriesScoring="1";
    document.body.appendChild(script);

    if(!document.querySelector('script[data-scenesense-series-enhancements]')){
      const enhancements=document.createElement("script");
      enhancements.src=`series-tv-enhancements.js?v=${Date.now()}`;
      enhancements.dataset.scenesenseSeriesEnhancements="1";
      enhancements.onload=()=>{
        if(typeof tvFormatBadge==="function"){
          tvFormatBadge=function(format){
            if(format==="PRiSM") return '<img class="detailPrismBadge" src="assets/format-logos/PRiSM.webp" alt="PRiSM">';
            if(format==="SiLVER70") return '<img class="detailSilver70Badge" src="assets/format-logos/SiLVER70.webp" alt="SiLVER70">';
            if(format==="SiLVER35") return '<img class="detailSilver35Badge" src="assets/format-logos/SiLVER35.webp" alt="SiLVER35">';
            return "";
          };
          if(activeSeriesId) renderActiveTvView();
        }
      };
      document.body.appendChild(enhancements);
    }
  }catch(error){
    console.error(error);
  }
})();
