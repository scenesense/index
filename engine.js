const $ = (id) => document.getElementById(id);
let data = null;
let savedData = null;
let runtimeManifest = [];
let supplementalMovies = [];
let activeMovieId = null;
let adminToken = "";
let dirty = false;
let query = "";
let sortMode = "score";

function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function movieById(id){ return data?.movies.find(m => m.id === id); }
function ratingPoints(stars){ return stars == null ? null : (Number(stars)-1)*0.5; }

function categoryRatings(movie, cat){
  const bucket = movie.ratings?.[cat.key] || {};
  return cat.items.map(([key]) => bucket[key] ?? null);
}
function categoryScore(movie, cat){
  const values = categoryRatings(movie, cat);
  if(values.some(v => v == null)) return null;
  return values.reduce((sum, stars) => sum + ratingPoints(stars), 0);
}
function ratedCount(movie){
  return CATEGORIES.reduce((n, cat) => n + categoryRatings(movie, cat).filter(v => v != null).length, 0);
}
function overallScore(movie){
  const scores = CATEGORIES.map(cat => [categoryScore(movie, cat), cat.weight]);
  if(scores.some(([score]) => score == null)) return null;
  return scores.reduce((sum,[score,weight]) => sum + score*(weight/100), 0);
}
function scoreText(value){ return value == null ? "—" : value.toFixed(1); }

function normalizeRuntimeKey(value){
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function runtimeKey(item){
  return `${item.year}|${normalizeRuntimeKey(item.title)}|${normalizeRuntimeKey(item.version)}`;
}
function mergeSupplementalMovies(targetData){
  targetData.movies ||= [];
  const known = new Set(targetData.movies.map(movie => movie.id));
  supplementalMovies.forEach(movie => {
    if(known.has(movie.id)) return;
    targetData.movies.push(deepClone(movie));
    known.add(movie.id);
  });
  return targetData;
}
function applyRuntimeManifest(targetData, manifest){
  const byKey = new Map((manifest || []).map(item => [runtimeKey(item), item]));
  (targetData?.movies || []).forEach(movie => {
    const exact = byKey.get(runtimeKey(movie));
    if(!exact) return;
    movie.runtimeSeconds = Number(exact.runtimeSeconds);
    movie.runtimeExact = exact.runtimeExact;
    movie.runtimeMinutes = Math.floor((movie.runtimeSeconds + 30) / 60);
  });
  const covered=(targetData?.movies || []).filter(movie => movie.runtimeExact).length;
  if(targetData?.movies?.length && covered !== targetData.movies.length){
    console.warn(`Exact runtime data available for ${covered}/${targetData.movies.length} movies.`);
  }
}
function runtimeText(movie){
  const detailVisible = activeMovieId === movie?.id && !$("movieView")?.classList.contains("hidden");
  return detailVisible && movie?.runtimeExact ? movie.runtimeExact : `${movie?.runtimeMinutes ?? "—"} min`;
}

async function loadData(){
  const stamp = Date.now();
  const [movieResponse, runtimeResponse, supplementalResponse] = await Promise.all([
    fetch(`data/movies.json?v=${stamp}`, {cache:"no-store"}),
    fetch(`data/exact_runtimes_manifest.json?v=${stamp}`, {cache:"no-store"}),
    fetch(`data/movies-additions-20260830.json?v=${stamp}`, {cache:"no-store"})
  ]);
  if(!movieResponse.ok) throw new Error(`Could not load movie data (${movieResponse.status})`);
  if(!runtimeResponse.ok) throw new Error(`Could not load exact runtimes (${runtimeResponse.status})`);
  if(!supplementalResponse.ok) throw new Error(`Could not load supplemental movies (${supplementalResponse.status})`);
  data = await movieResponse.json();
  runtimeManifest = await runtimeResponse.json();
  const supplementalPayload = await supplementalResponse.json();
  supplementalMovies = supplementalPayload.movies || [];
  mergeSupplementalMovies(data);
  applyRuntimeManifest(data, runtimeManifest);
  savedData = deepClone(data);
  $("sort").value = sortMode;
  renderLibrary();
  const hashId = decodeURIComponent(location.hash.replace(/^#movie=/,""));
  if(location.hash.startsWith("#movie=") && movieById(hashId)) openMovie(hashId, false);
}

function renderLibrary(){
  if(!data) return;
  let movies = [...data.movies];
  const q = query.trim().toLowerCase();
  if(q) movies = movies.filter(m => `${m.title} ${m.year} ${m.version}`.toLowerCase().includes(q));
  movies.sort((a,b)=>{
    if(sortMode === "title") return a.title.localeCompare(b.title);
    if(sortMode === "year") return a.year-b.year || a.title.localeCompare(b.title);
    const sa = overallScore(a) ?? 0;
    const sb = overallScore(b) ?? 0;
    if(sb !== sa) return sb-sa;
    return a.title.localeCompare(b.title);
  });
  $("libraryStatus").textContent = `${movies.length} ${movies.length===1?"film":"films"}`;
  $("movieGrid").innerHTML = movies.map(m => `
    <button class="movieCard" type="button" data-movie="${escapeAttr(m.id)}">
      <div class="posterWrap">
        <img class="poster" src="${escapeAttr(m.poster)}" alt="${escapeAttr(m.title)} poster" loading="lazy">
        <div class="cardScore">${scoreText(overallScore(m))}</div>
      </div>
      <div class="cardInfo">
        <div class="cardTitle">${escapeHtml(m.title)}</div>
        <div class="cardMeta">${m.year} · ${escapeHtml(runtimeText(m))} · ${escapeHtml(m.version)}</div>
      </div>
    </button>`).join("");
  document.querySelectorAll(".movieCard").forEach(btn => btn.addEventListener("click",()=>openMovie(btn.dataset.movie)));

  queueMicrotask(()=>{
    document.querySelectorAll(".movieCard").forEach(card=>{
      const movie=movieById(card.dataset.movie);
      if(!movie) return;
      const meta=card.querySelector(".cardMeta");
      if(meta) meta.textContent=`${movie.year} · ${runtimeText(movie)} · ${movie.version}`;
      card.querySelector(".cardDescription")?.remove();
      card.querySelector(".cardVersion")?.remove();
    });
  });
}

function escapeHtml(v){
  return String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function escapeAttr(v){ return escapeHtml(v); }

function openMovie(id, updateHash=true){
  const movie = movieById(id);
  if(!movie) return;
  activeMovieId = id;
  if(updateHash) history.pushState(null,"",`#movie=${encodeURIComponent(id)}`);
  $("libraryView").classList.add("hidden");
  $("movieView").classList.remove("hidden");
  $("detailPoster").src = movie.poster;
  $("detailPoster").alt = `${movie.title} poster`;
  $("detailTitle").textContent = movie.title;
  $("detailMeta").textContent = `${movie.year} · ${runtimeText(movie)} · ${movie.version}`;
  renderMovie();
  scrollTo({top:0,behavior:"instant"});

  queueMicrotask(()=>{
    const current=movieById(id);
    if(!current) return;
    const meta=$("detailMeta");
    if(meta){
      meta.textContent=`${current.year} · ${runtimeText(current)} · ${current.version}`;
      meta.style.color="#aab4c2";
    }
    const separateVersion=$("detailVersion");
    if(separateVersion) separateVersion.textContent="";
  });
}

function closeMovie(){
  activeMovieId = null;
  history.pushState(null,"",location.pathname + location.search);
  $("movieView").classList.add("hidden");
  $("libraryView").classList.remove("hidden");
  renderLibrary();
  scrollTo({top:0,behavior:"instant"});
}

function renderMovie(){
  const movie = movieById(activeMovieId);
  if(!movie) return;
  document.body.classList.toggle("admin", !!adminToken);
  $("overallScore").textContent = scoreText(overallScore(movie));
  $("progressText").textContent = `${ratedCount(movie)} / 75 rated`;
  $("modeNotice").textContent = adminToken ? "Scoring unlocked · changes stay private until Save." : "Scores are read-only.";
  $("modeNotice").classList.toggle("unlocked", !!adminToken);
  $("saveRow").classList.toggle("hidden", !adminToken);
  $("saveBtn").disabled = !dirty;
  $("revertBtn").disabled = !dirty;

  $("categories").innerHTML = CATEGORIES.map((cat, idx) => {
    const score = categoryScore(movie, cat);
    const completed = categoryRatings(movie, cat).filter(v=>v!=null).length;
    const bucket = movie.ratings?.[cat.key] || {};
    return `<section class="category ${idx===0 ? "open":""}" data-category="${cat.key}">
      <button class="categoryHeader" type="button" aria-expanded="${idx===0}">
        <span class="categoryNum">${String(idx+1).padStart(2,"0")}</span>
        <span>
          <span class="categoryTitle">${escapeHtml(cat.title)}</span>
          <span class="categoryWeight">${cat.weight}% weight · ${completed}/5 rated</span>
        </span>
        <span class="categoryScore">${scoreText(score)}</span>
        <span class="categoryChevron">⌄</span>
      </button>
      <div class="categoryBody">
        ${cat.items.map(([key,name,question]) => ratingRow(cat.key,key,name,question,bucket[key] ?? null)).join("")}
      </div>
    </section>`;
  }).join("");

  document.querySelectorAll(".categoryHeader").forEach(btn => {
    btn.addEventListener("click",()=>{
      const section=btn.closest(".category");
      section.classList.toggle("open");
      btn.setAttribute("aria-expanded", section.classList.contains("open") ? "true":"false");
    });
  });
  bindStars();
}

function ratingRow(categoryKey,itemKey,name,question,value){
  const stars = [1,2,3,4,5].map(n => `<button type="button" class="star ${value!=null && n<=value?"filled":""}" data-stars="${n}" aria-label="${n} star${n===1?"":"s"}">★</button>`).join("");
  return `<div class="ratingRow" data-category="${categoryKey}" data-item="${itemKey}">
    <div class="ratingName">${escapeHtml(name)}</div>
    <div class="ratingQuestion">${escapeHtml(question)}</div>
    <div class="stars">${stars}<button type="button" class="clearRating" title="Clear rating" aria-label="Clear rating">×</button></div>
  </div>`;
}

function bindStars(){
  document.querySelectorAll(".ratingRow").forEach(row=>{
    const stars=[...row.querySelectorAll(".star")];
    stars.forEach(star=>{
      star.addEventListener("mouseenter",()=>{
        if(!adminToken) return;
        const n=Number(star.dataset.stars);
        stars.forEach(s=>s.classList.toggle("hovered",Number(s.dataset.stars)<=n));
      });
      star.addEventListener("mouseleave",()=>stars.forEach(s=>s.classList.remove("hovered")));
      star.addEventListener("click",()=>{
        if(!adminToken) return;
        setRating(row.dataset.category,row.dataset.item,Number(star.dataset.stars));
      });
    });
    row.querySelector(".clearRating").addEventListener("click",()=>{
      if(!adminToken) return;
      setRating(row.dataset.category,row.dataset.item,null);
    });
  });
}

function setRating(categoryKey,itemKey,value){
  const movie=movieById(activeMovieId);
  if(!movie) return;
  movie.ratings ||= {};
  movie.ratings[categoryKey] ||= {};
  if(value == null) delete movie.ratings[categoryKey][itemKey];
  else movie.ratings[categoryKey][itemKey]=value;
  dirty = JSON.stringify(data)!==JSON.stringify(savedData);
  $("saveStatus").textContent="";
  renderMovie();
}

function utf8ToBase64(text){
  const bytes=new TextEncoder().encode(text);
  let binary="";
  bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary);
}

function base64ToUtf8(text){
  const binary=atob(String(text || "").replace(/\s/g,""));
  const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function validateToken(token){
  const res=await fetch(`https://api.github.com/repos/${REPO}`,{
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2022-11-28"
    }
  });
  if(!res.ok) throw new Error("GitHub rejected that token.");
  const repo=await res.json();
  if(!(repo.permissions?.push || repo.permissions?.admin || repo.permissions?.maintain)){
    throw new Error("The token can read the repository but cannot write to it.");
  }
  return true;
}

async function unlock(token){
  await validateToken(token);
  adminToken=token;
  sessionStorage.setItem("scenesense_admin_token",token);
  $("adminBtn").textContent="Lock scoring";
  $("adminDialog").close();
  renderMovie();
}

function lock(){
  adminToken="";
  sessionStorage.removeItem("scenesense_admin_token");
  $("adminBtn").textContent="Unlock scoring";
  if(activeMovieId) renderMovie();
}

async function saveData(){
  if(!adminToken || !dirty) return;
  const btn=$("saveBtn");
  btn.disabled=true;
  $("saveStatus").textContent="Saving…";
  try{
    const changedIds=(data?.movies || []).filter(localMovie=>{
      const savedMovie=savedData?.movies?.find(m=>m.id===localMovie.id);
      return JSON.stringify(localMovie.ratings || {}) !== JSON.stringify(savedMovie?.ratings || {});
    }).map(m=>m.id);

    if(!changedIds.length){
      dirty=false;
      $("saveStatus").textContent="Nothing to save.";
      renderMovie();
      return;
    }

    const headers={
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${adminToken}`,
      "X-GitHub-Api-Version":"2022-11-28"
    };
    const metaRes=await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}?ref=${encodeURIComponent(BRANCH)}`,{headers,cache:"no-store"});
    if(!metaRes.ok) throw new Error(`Could not read current data file (${metaRes.status}).`);
    const meta=await metaRes.json();
    const remoteData=JSON.parse(base64ToUtf8(meta.content));
    remoteData.movies ||= [];

    changedIds.forEach(id=>{
      const localMovie=data.movies.find(m=>m.id===id);
      if(!localMovie) return;
      const remoteMovie=remoteData.movies.find(m=>m.id===id);
      if(remoteMovie){
        remoteMovie.ratings=deepClone(localMovie.ratings || {});
      }else{
        remoteData.movies.push(deepClone(localMovie));
      }
    });

    const payload={
      message:`Update SceneSense scores${activeMovieId ? `: ${movieById(activeMovieId)?.title || activeMovieId}` : ""}`,
      content:utf8ToBase64(JSON.stringify(remoteData,null,2)+"\n"),
      sha:meta.sha,
      branch:BRANCH
    };
    const saveRes=await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`,{
      method:"PUT",
      headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if(!saveRes.ok){
      let detail="";
      try{ detail=(await saveRes.json()).message || ""; }catch{}
      throw new Error(`GitHub save failed (${saveRes.status})${detail?`: ${detail}`:""}`);
    }

    data=deepClone(remoteData);
    mergeSupplementalMovies(data);
    applyRuntimeManifest(data, runtimeManifest);
    savedData=deepClone(data);
    dirty=false;
    $("saveStatus").textContent="Saved. GitHub Pages will update shortly.";
    renderMovie();
    renderLibrary();
  }catch(err){
    console.error(err);
    $("saveStatus").textContent=err.message || "Save failed.";
    btn.disabled=false;
  }
}

function revertChanges(){
  if(!dirty) return;
  const id=activeMovieId;
  data=deepClone(savedData);
  dirty=false;
  renderLibrary();
  if(id && movieById(id)){ activeMovieId=id; renderMovie(); }
  $("saveStatus").textContent="Reverted.";
}

function showAdminDialog(){
  $("adminError").textContent="";
  $("tokenInput").value="";
  $("adminDialog").showModal();
  setTimeout(()=>$("tokenInput").focus(),50);
}

$("search").addEventListener("input",e=>{query=e.target.value;renderLibrary();});
$("sort").addEventListener("change",e=>{sortMode=e.target.value;renderLibrary();});
$("backBtn").addEventListener("click",closeMovie);
$("homeBtn").addEventListener("click",()=>{ if(activeMovieId) closeMovie(); });
$("saveBtn").addEventListener("click",saveData);
$("revertBtn").addEventListener("click",revertChanges);
$("adminBtn").addEventListener("click",()=> adminToken ? lock() : showAdminDialog());

$("adminForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const token=$("tokenInput").value.trim();
  if(!token){ $("adminError").textContent="Enter a token first."; return; }
  $("unlockBtn").disabled=true;
  $("adminError").textContent="Checking access…";
  try{
    await unlock(token);
    $("adminError").textContent="";
  }catch(err){
    $("adminError").textContent=err.message || "Could not unlock.";
  }finally{
    $("unlockBtn").disabled=false;
  }
});

window.addEventListener("popstate",()=>{
  const id=decodeURIComponent(location.hash.replace(/^#movie=/,""));
  if(location.hash.startsWith("#movie=") && movieById(id)) openMovie(id,false);
  else if(activeMovieId){
    activeMovieId=null;
    $("movieView").classList.add("hidden");
    $("libraryView").classList.remove("hidden");
    renderLibrary();
  }
});
window.addEventListener("beforeunload",e=>{
  if(!dirty) return;
  e.preventDefault();
  e.returnValue="";
});

(async function init(){
  try{
    await loadData();
    const stored=sessionStorage.getItem("scenesense_admin_token");
    if(stored){
      try{
        await validateToken(stored);
        adminToken=stored;
        $("adminBtn").textContent="Lock scoring";
        if(activeMovieId) renderMovie();
      }catch{
        sessionStorage.removeItem("scenesense_admin_token");
      }
    }
  }catch(err){
    console.error(err);
    $("libraryStatus").textContent=err.message || "Could not load films.";
  }
})();
