(async function loadSceneSeriesAdditions(){
  let loadingGrid=null;
  try{
    const status=document.getElementById("libraryStatus");
    if(status && typeof libraryMediaMode!=="undefined" && libraryMediaMode!=="movies") status.textContent="Loading full series catalogue…";

    loadingGrid=document.getElementById("movieGrid");
    if(loadingGrid && typeof libraryMediaMode!=="undefined" && libraryMediaMode!=="movies"){
      loadingGrid.querySelectorAll(".seriesCard").forEach(card=>card.remove());
      loadingGrid.setAttribute("aria-busy","true");
    }

    const stamp=Date.now();
    const sources=[
      `data/series/index-additions.json?v=${stamp}`,
      `data/series/index-additions-sep06.json?v=${stamp}`,
      `data/series/index-additions-melrose.json?v=${stamp}`,
      `data/series/index-additions-mscl.json?v=${stamp}`,
      `data/series/index-additions-nautilus.json?v=${stamp}`,
      `data/series/index-additions-northern-exposure.json?v=${stamp}`,
      `data/series/index-additions-mr-sunshine.json?v=${stamp}`,
      `data/series/index-additions-one-tree-hill.json?v=${stamp}`,
      `data/series/index-additions-one-big-happy.json?v=${stamp}`,
      `data/series/index-additions-october-road.json?v=${stamp}`,
      `data/series/index-additions-missions.json?v=${stamp}`,
      `data/series/index-additions-les-grandes-grandes-vacances.json?v=${stamp}`,
      `data/series/index-additions-pat-and-mat.json?v=${stamp}`,
      `data/series/index-additions-rick-steins-odysseys.json?v=${stamp}`,
      `data/series/index-additions-sep08-r.json?v=${stamp}`,
      `data/series/index-additions-sep08-s.json?v=${stamp}`,
      `data/series/index-additions-sep09-t.json?v=${stamp}`,
      `data/series/index-additions-sep09-u.json?v=${stamp}`,
      `data/series/index-additions-sep09-tc.json?v=${stamp}`
    ];
    const groups=await Promise.all(sources.map(async source=>{
      try{
        const response=await fetch(source,{cache:"no-store"});
        if(!response.ok) return [];
        const payload=await response.json();
        return Array.isArray(payload.series)?payload.series:[];
      }catch(error){ console.error(error); return []; }
    }));
    const additions=groups.flat();
    if(typeof seriesCatalog==="undefined" || !Array.isArray(seriesCatalog)) return;
    const known=new Set(seriesCatalog.map(series=>series.id));
    additions.forEach(series=>{ if(!known.has(series.id)){ seriesCatalog.push(series); known.add(series.id); } });

    const installSeriesFranchiseChronology=()=>{
      if(typeof mixedTitle!=="function") return;
      if(mixedTitle.__sceneSeriesFranchiseChronology) return;
      const baseMixedTitle=mixedTitle;
      const wrappedMixedTitle=function(item){
        if(item?.kind==="series"){
          const series=item.item || {};
          const canonical=String(series.title||"").trim();
          const lower=canonical.toLowerCase();
          const year=String(Number(series.yearStart)||0).padStart(4,"0");
          if(lower.startsWith("star trek")) return `star trek ${year}`;
          if(lower.startsWith("stargate")) return `stargate ${year}`;
        }
        return baseMixedTitle(item);
      };
      wrappedMixedTitle.__sceneSeriesFranchiseChronology=true;
      mixedTitle=wrappedMixedTitle;
    };
    installSeriesFranchiseChronology();

    const installStarTrekSeriesCardTitles=()=>{
      if(typeof renderSeriesCard!=="function"){
        setTimeout(installStarTrekSeriesCardTitles,25);
        return;
      }
      if(renderSeriesCard.__sceneStarTrekTwoLine) return;
      if(!document.getElementById("starTrekSeriesCardTitleStyles")){
        const style=document.createElement("style");
        style.id="starTrekSeriesCardTitleStyles";
        style.textContent=`
          .seriesCard .starTrekSeriesSubtitle{
            color:#c59b45!important;
          }
        `;
        document.head.appendChild(style);
      }
      const baseRenderSeriesCard=renderSeriesCard;
      const wrappedRenderSeriesCard=function(series){
        let html=baseRenderSeriesCard(series);
        const starTrekSubtitles={
          "star-trek-deep-space-nine-1993":"Deep Space Nine",
          "star-trek-enterprise-2001":"Enterprise",
          "star-trek-voyager-1995":"Voyager",
          "star-trek-the-next-generation-1987":"The Next Generation",
          "star-trek-strange-new-worlds-2019":"Strange New Worlds"
        };
        const subtitle=starTrekSubtitles[series?.id] || "";
        if(!subtitle) return html;
        const displayed=series.cardTitle || series.title;
        const original=`<div class="cardTitle">${escapeHtml(displayed)}</div>`;
        const replacement=`<div class="cardTitle">Star Trek</div><div class="cardSubtitle starTrekSeriesSubtitle">${escapeHtml(subtitle)}</div>`;
        return html.replace(original,replacement);
      };
      wrappedRenderSeriesCard.__sceneStarTrekTwoLine=true;
      renderSeriesCard=wrappedRenderSeriesCard;
    };
    installStarTrekSeriesCardTitles();

    if(loadingGrid) loadingGrid.removeAttribute("aria-busy");
    if(typeof renderLibrary==="function") renderLibrary();
    const hash=location.hash;
    if(hash.startsWith("#series=")){
      const id=decodeURIComponent(hash.replace(/^#series=/,""));
      if(additions.some(series=>series.id===id) && typeof openSeries==="function") openSeries(id,false);
    }
  }catch(error){
    if(loadingGrid) loadingGrid.removeAttribute("aria-busy");
    console.error(error);
  }
})();
