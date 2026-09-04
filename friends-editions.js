(function installFriendsEditionLayer(){
  if(window.__friendsEditionLayerInstalled) return;
  const wait=()=>{
    if(typeof window.renderTvSeason!=="function" || typeof window.renderTvEpisode!=="function" || typeof window.tvPresentation!=="function" || typeof window.tvEpisodePresentation!=="function" || typeof window.sceneAudioText!=="function"){
      setTimeout(wait,40);
      return;
    }
    window.__friendsEditionLayerInstalled=true;

    const modes=new Map();
    const seasonKey=n=>`friends-${Number(n)}`;
    const modeFor=n=>modes.get(seasonKey(n))||"all";
    const setMode=(n,mode)=>modes.set(seasonKey(n),mode);
    const runtimeText=value=>{
      const total=Math.max(0,Math.round(Number(value)||0));
      const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
      return h?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;
    };
    const groupFor=(presentation,id)=>(presentation?.editionGroups||[]).find(group=>group.id===id)||null;
    const audioText=audio=>window.sceneAudioText?.(audio)||"";
    const editionFacts=edition=>[runtimeText(edition?.runtimeSeconds),edition?.format,audioText(edition?.audio)].filter(Boolean).join(" · ");

    function ensureStyles(){
      if(document.getElementById("friendsEditionStyles")) return;
      const style=document.createElement("style");
      style.id="friendsEditionStyles";
      style.textContent=`
        .friendsEditionSwitch{display:flex;align-items:center;width:max-content;gap:3px;margin:0 0 13px;padding:3px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:rgba(255,255,255,.025)}
        .friendsEditionSwitch button{height:29px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:#929dad;font:600 11px/1 "Saira",sans-serif;letter-spacing:.055em;cursor:pointer}
        .friendsEditionSwitch button:hover{color:#edf3fb;background:rgba(255,255,255,.04)}
        .friendsEditionSwitch button.active{color:#edf3fb;background:rgba(255,255,255,.09)}
        .friendsEditionSummary{margin-top:3px;color:#8e9cac;font-size:11px;font-weight:500;letter-spacing:.035em;font-variant-caps:small-caps;font-synthesis-small-caps:auto}
        .friendsEditionsPanel{max-width:900px;margin:0 0 24px;padding:15px 17px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.025)}
        .friendsEditionsHeading{margin:0 0 10px;color:#dfe6ef;font-size:13px;font-weight:700;letter-spacing:.09em}
        .friendsEditionRows{display:grid;gap:7px}
        .friendsEditionRow{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:12px;min-height:31px;padding:5px 8px;border-top:1px solid rgba(255,255,255,.06)}
        .friendsEditionRow:first-child{border-top:0}
        .friendsEditionLabel{color:#c59b45;font-size:11px;font-weight:750;letter-spacing:.07em}
        .friendsEditionFacts{color:#c4ccd7;font-size:12px;font-weight:500;letter-spacing:.035em}
        @media(max-width:620px){.friendsEditionSwitch button{padding:0 8px;font-size:10px}.friendsEditionRow{grid-template-columns:76px minmax(0,1fr)}.friendsEditionFacts{font-size:11px}}
      `;
      document.head.appendChild(style);
    }

    function editionRowsFor(meta,presentation){
      const rows=[...(meta?.editions||[])];
      if(meta?.uncutGroupId){
        const group=groupFor(presentation,meta.uncutGroupId);
        if(group) rows.push({...group,id:"uncut-group",label:"UNCUT",source:group.source});
      }
      return rows;
    }

    function addSwitch(series,seasonData,presentation){
      if(!presentation?.editionAware) return;
      const body=document.getElementById("seriesSeasons");
      const grid=body?.querySelector(".episodeGrid");
      if(!grid) return;
      const heading=grid.previousElementSibling;
      const bar=document.createElement("div");
      bar.className="friendsEditionSwitch";
      const current=modeFor(seasonData.season);
      [["all","ALL EDITIONS"],["high-res","HIGH RES"],["uncut","UNCUT"]].forEach(([mode,label])=>{
        const button=document.createElement("button");
        button.type="button";
        button.textContent=label;
        button.classList.toggle("active",current===mode);
        button.addEventListener("click",()=>{
          if(modeFor(seasonData.season)===mode) return;
          setMode(seasonData.season,mode);
          renderTvSeason(series,seasonData);
        });
        bar.appendChild(button);
      });
      if(heading?.classList.contains("tvSectionHeading")) heading.insertAdjacentElement("afterend",bar);
      else grid.insertAdjacentElement("beforebegin",bar);
    }

    function applySeasonMode(series,seasonData,presentation){
      const mode=modeFor(seasonData.season);
      const cards=[...document.querySelectorAll("#seriesSeasons .episodeCard[data-episode]")];
      cards.forEach(card=>{
        const episode=tvEpisodeById(seasonData,card.dataset.episode);
        const meta=presentation?.episodes?.[card.dataset.episode];
        if(!episode||!meta) return;
        const detail=card.children[1];
        const baseMeta=detail?.querySelector(".episodeRuntime");
        const old=detail?.querySelector(".friendsEditionSummary");
        old?.remove();
        const editions=meta.editions||[];
        const high=editions.find(item=>item.id==="high-res")||editions[0];
        const uncut=editions.find(item=>item.id==="uncut");
        const group=meta.uncutGroupId?groupFor(presentation,meta.uncutGroupId):null;

        if(mode==="high-res"){
          if(baseMeta&&high) baseMeta.textContent=[runtimeText(high.runtimeSeconds),tvFormatAirDate(episode.airDate),"HIGH RES"].filter(Boolean).join(" · ");
          if(detail&&high){
            const line=document.createElement("div"); line.className="friendsEditionSummary";
            line.textContent=[high.format,audioText(high.audio)].filter(Boolean).join(" · "); detail.appendChild(line);
          }
          return;
        }

        if(mode==="uncut"){
          if(group){
            const first=group.members?.[0];
            if(card.dataset.episode!==first){ card.style.display="none"; return; }
            const code=card.querySelector(".episodeCode");
            if(code) code.innerHTML=tvEpisodeCodeMarkup(seasonData.season,group.number);
            const title=detail?.querySelector(".episodeTitle");
            if(title) title.textContent=group.title;
            if(baseMeta) baseMeta.textContent=[runtimeText(group.runtimeSeconds),tvFormatAirDate(episode.airDate),"UNCUT"].filter(Boolean).join(" · ");
            if(detail){ const line=document.createElement("div"); line.className="friendsEditionSummary"; line.textContent=[group.format,audioText(group.audio)].filter(Boolean).join(" · "); detail.appendChild(line); }
            return;
          }
          if(uncut){
            if(baseMeta) baseMeta.textContent=[runtimeText(uncut.runtimeSeconds),tvFormatAirDate(episode.airDate),"UNCUT"].filter(Boolean).join(" · ");
            if(detail){ const line=document.createElement("div"); line.className="friendsEditionSummary"; line.textContent=[uncut.format,audioText(uncut.audio)].filter(Boolean).join(" · "); detail.appendChild(line); }
          }
          return;
        }

        if(detail){
          const line=document.createElement("div");
          line.className="friendsEditionSummary";
          if(group){
            line.textContent=`HIGH RES ${runtimeText(high?.runtimeSeconds)} · UNCUT E${group.number} ${runtimeText(group.runtimeSeconds)}`;
          }else if(high&&uncut){
            const delta=Number(uncut.runtimeSeconds)-Number(high.runtimeSeconds);
            const deltaText=delta?` · ${delta>0?"+":"−"}${runtimeText(Math.abs(delta))}`:"";
            line.textContent=`HIGH RES ${runtimeText(high.runtimeSeconds)} · UNCUT ${runtimeText(uncut.runtimeSeconds)}${deltaText}`;
          }else if(high){
            line.textContent=`HIGH RES ${runtimeText(high.runtimeSeconds)}`;
          }
          detail.appendChild(line);
        }
      });
    }

    function addEpisodePanel(series,seasonData,episode,presentation){
      const meta=presentation?.episodes?.[episode.id];
      if(!meta) return;
      const rows=editionRowsFor(meta,presentation);
      if(!rows.length) return;
      const body=document.getElementById("seriesSeasons");
      const scoring=body?.querySelector(".tvScoringIntro");
      if(!body||!scoring) return;
      const panel=document.createElement("section");
      panel.className="friendsEditionsPanel";
      panel.innerHTML=`<h2 class="friendsEditionsHeading">EDITIONS</h2><div class="friendsEditionRows">${rows.map(item=>`<div class="friendsEditionRow"><div class="friendsEditionLabel">${escapeHtml(item.label||item.id||"")}</div><div class="friendsEditionFacts">${escapeHtml(editionFacts(item)+(item.id==="uncut-group"?` · E${item.number} COMBINED`:""))}</div></div>`).join("")}</div>`;
      scoring.insertAdjacentElement("beforebegin",panel);
    }

    const baseSeason=window.renderTvSeason;
    window.renderTvSeason=function(series,seasonData){
      baseSeason(series,seasonData);
      if(series?.id!=="friends-1994") return;
      ensureStyles();
      const presentation=tvPresentation(series.id,seasonData.season);
      if(!presentation?.editionAware) return;
      addSwitch(series,seasonData,presentation);
      applySeasonMode(series,seasonData,presentation);
    };

    const baseEpisode=window.renderTvEpisode;
    window.renderTvEpisode=function(series,seasonData,episode){
      baseEpisode(series,seasonData,episode);
      if(series?.id!=="friends-1994") return;
      ensureStyles();
      addEpisodePanel(series,seasonData,episode,tvPresentation(series.id,seasonData.season));
    };

    if(typeof activeSeriesId!=="undefined" && activeSeriesId==="friends-1994" && typeof renderActiveTvView==="function") renderActiveTvView();
  };
  wait();
})();
