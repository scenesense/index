(function applyWarmScratchPosterTreatment(){
  if(document.getElementById("scenesenseWarmScratchFilter")) return;

  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.id="scenesenseWarmScratchFilter";
  svg.setAttribute("width","0");
  svg.setAttribute("height","0");
  svg.setAttribute("aria-hidden","true");
  svg.style.position="absolute";
  svg.style.width="0";
  svg.style.height="0";
  svg.style.overflow="hidden";
  svg.innerHTML=`<defs>
    <filter id="warmScratch" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="
        0.1893 0.6367 0.0643 0 0.0471
        0.1843 0.6198 0.0626 0 0.0314
        0.1709 0.5748 0.0580 0 0.0235
        0      0      0      1 0"/>
    </filter>
  </defs>`;
  document.body.prepend(svg);

  const style=document.createElement("style");
  style.id="scenesenseWarmScratchStyles";
  style.textContent=`
    img.poster[src$="source-code-2011.webp"],
    img.detailPoster[src$="source-code-2011.webp"],
    img.poster[src$="back-to-the-future-1985.webp"],
    img.detailPoster[src$="back-to-the-future-1985.webp"],
    img.poster[src$="back-to-the-future-ii-1989.webp"],
    img.detailPoster[src$="back-to-the-future-ii-1989.webp"],
    img.poster[src$="back-to-the-future-iii-1990.webp"],
    img.detailPoster[src$="back-to-the-future-iii-1990.webp"],
    img.poster[src$="oblivion-2013.webp"],
    img.detailPoster[src$="oblivion-2013.webp"]{
      filter:url(#warmScratch)!important;
    }
  `;
  document.head.appendChild(style);
})();
