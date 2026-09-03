(async function loadSeriesTvScoring(){
  try{
    const movieBack=document.getElementById("backBtn");
    if(movieBack) movieBack.textContent="← Library";

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
      enhancements.onload=async()=>{
        if(typeof tvFormatBadge==="function"){
          tvFormatBadge=function(format){
            if(format==="PRiSM") return '<img class="detailPrismBadge" src="assets/format-logos/PRiSM.webp" alt="PRiSM">';
            if(format==="SiLVER70") return '<img class="detailSilver70Badge" src="assets/format-logos/SiLVER70.webp" alt="SiLVER70">';
            if(format==="SiLVER35") return '<img class="detailSilver35Badge" src="assets/format-logos/SiLVER35.webp" alt="SiLVER35">';
            return "";
          };
        }

        const tvEpisodeFlagCache=new Map();
        async function loadTvEpisodeFlags(seriesId){
          if(tvEpisodeFlagCache.has(seriesId)) return tvEpisodeFlagCache.get(seriesId);
          try{
            const response=await fetch(`data/series/${tvSeriesFolder(seriesId)}/episode-flags.json?v=${Date.now()}`,{cache:"no-store"});
            if(!response.ok){
              tvEpisodeFlagCache.set(seriesId,null);
              return null;
            }
            const data=await response.json();
            tvEpisodeFlagCache.set(seriesId,data);
            return data;
          }catch(error){
            tvEpisodeFlagCache.set(seriesId,null);
            return null;
          }
        }

        function appendMythologyBadge(target){
          if(!target || target.querySelector(".episodeFlagM")) return;
          const badge=document.createElement("span");
          badge.className="episodeFlagM";
          badge.textContent="M";
          badge.title="Mythology / memorable";
          badge.setAttribute("aria-label","Mythology / memorable");
          target.appendChild(badge);
        }

        function reorderSeasonContent(){
          const body=document.getElementById("seriesSeasons");
          if(!body) return;
          const scoringIntro=body.querySelector(".tvScoringIntro");
          const episodeGrid=body.querySelector(".episodeGrid");
          const episodeHeading=episodeGrid?.previousElementSibling;
          if(scoringIntro && episodeGrid && episodeHeading?.classList.contains("tvSectionHeading")){
            body.insertBefore(episodeHeading,scoringIntro);
            body.insertBefore(episodeGrid,scoringIntro);
          }
          const bottomBack=body.querySelector(".tvBottomBack");
          if(bottomBack) body.appendChild(bottomBack);
        }

        if(!document.getElementById("tvEpisodeFlagStyles")){
          const flagStyle=document.createElement("style");
          flagStyle.id="tvEpisodeFlagStyles";
          flagStyle.textContent=`
            .episodeFlagM{
              display:inline-flex;
              width:16px;
              height:16px;
              margin-left:7px;
              align-items:center;
              justify-content:center;
              box-sizing:border-box;
              border:1px solid #C59B45;
              border-radius:3px;
              color:#C59B45;
              font-size:9px;
              font-weight:800;
              line-height:1;
              letter-spacing:0;
              vertical-align:2px;
            }
            #seriesHero h1 .episodeFlagM{
              width:20px;
              height:20px;
              margin-left:10px;
              font-size:11px;
              vertical-align:4px;
            }
          `;
          document.head.appendChild(flagStyle);
        }

        const flagRenderSeason=renderTvSeason;
        renderTvSeason=function(series,seasonData){
          flagRenderSeason(series,seasonData);
          const flagData=tvEpisodeFlagCache.get(series.id);
          const mythology=new Set(flagData?.flags?.M || []);
          document.querySelectorAll("#seriesSeasons .episodeCard[data-episode]").forEach(card=>{
            if(!mythology.has(card.dataset.episode)) return;
            appendMythologyBadge(card.querySelector(".episodeTitle"));
          });
          reorderSeasonContent();
        };

        const flagRenderEpisode=renderTvEpisode;
        renderTvEpisode=function(series,seasonData,episode){
          flagRenderEpisode(series,seasonData,episode);
          const flagData=tvEpisodeFlagCache.get(series.id);
          const mythology=new Set(flagData?.flags?.M || []);
          if(mythology.has(episode.id)) appendMythologyBadge(document.querySelector("#seriesHero h1"));
        };

        const flagOpenSeason=openTvSeason;
        openTvSeason=async function(seriesId,seasonNumber){
          await loadTvEpisodeFlags(seriesId);
          return flagOpenSeason(seriesId,seasonNumber);
        };

        const flagOpenEpisode=openTvEpisode;
        openTvEpisode=async function(seriesId,seasonNumber,episodeId){
          await loadTvEpisodeFlags(seriesId);
          return flagOpenEpisode(seriesId,seasonNumber,episodeId);
        };

        if(activeSeriesId){
          await loadTvEpisodeFlags(activeSeriesId);
          renderActiveTvView();
        }
      };
      document.body.appendChild(enhancements);
    }
  }catch(error){
    console.error(error);
  }
})();
