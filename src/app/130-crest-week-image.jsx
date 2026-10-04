/* THE WEEK AS A PICTURE. A plan sent as a paragraph of text is read; a plan sent as the
   sheet itself is recognised — the coach's staff already know that grid. The same HTML
   the printout uses is laid out in an offscreen iframe at A4-landscape width and
   captured with html2canvas, so what lands in WhatsApp is the sheet, not a screenshot of
   part of a screen. It is rendered once at `scale` 2 and that one picture serves both
   the preview on the panel and the file that is downloaded, copied or shared — a second
   pass at preview quality would be a second html2canvas run for the same image. */
/* THE CREST AS A PICTURE html2canvas CAN DRAW. The shared PNG and PDF are drawn by
   html2canvas, which re-loads every cross-origin <img> itself (in CORS mode) and silently
   skips any it cannot load — the crest on the shared sheet came out as an empty 34px box
   between the divider and the club name, while the sidebar showed the same picture.
   Reading the crest into a data URL up front takes that decision away from html2canvas:
   a data URL is always drawn. It is shrunk on the way (the slot is 34-56px,
   drawn at 2x), and PNG keeps a transparent crest transparent on the black header.
   If the crest cannot be read at all the slot is left out, so the sheet shows the club
   name alone rather than a hole.
   Firebase Storage sends no CORS headers on downloads until the bucket is given a CORS
   config, so a crest in Storage cannot be read directly. It is then fetched through
   /api/crest (api/crest.js) on this site's own origin, where no CORS applies. Applying
   cors.json to the bucket makes the first, direct attempt succeed as well:
     gcloud storage buckets update gs://periodization-planner.firebasestorage.app --cors-file=cors.json */
const CREST_PX=240;
const _crestCache=new Map();
const CREST_STORAGE=/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/periodization-planner\.firebasestorage\.app\/o\/users%2F/;
/* The crest's own drawing: shrunk to CREST_PX on the long side, kept as PNG. */
function crestPNG(im){
  let w=im.naturalWidth,h=im.naturalHeight;
  const k=Math.min(1,CREST_PX/Math.max(w,h));w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(im,0,0,w,h);
  return c.toDataURL('image/png');   // throws on a tainted canvas → next attempt
}
/* `render` turns the loaded picture into the data URL that is handed back — the crest's
   PNG by default; the exercise-library PDF passes its own fixed-frame crop. */
function readCrest(src,mode,render){
  return withTimeout(new Promise((res,rej)=>{
    const draw=(url,after)=>{
      const im=new Image();
      if(!/^(data|blob):/i.test(url))im.crossOrigin='anonymous';
      im.onload=()=>{
        try{
          if(!im.naturalWidth||!im.naturalHeight){rej(new Error('empty'));return;}
          res((render||crestPNG)(im));
        }catch(e){rej(e);}
        finally{if(after)after();}
      };
      im.onerror=()=>{if(after)after();rej(new Error('load'));};
      im.src=url;
    };
    if(mode==='direct'){draw(src);return;}
    /* 'proxy': the same file through this site's /api/crest — same origin, no CORS.
       'fresh': fetch it again past the cache. A copy the browser cached from a plain
       <img> may lack the CORS headers a CORS-mode load now needs; 'reload' skips it. */
    const req=mode==='proxy'?fetch('/api/crest?u='+encodeURIComponent(src)):fetch(src,{mode:'cors',cache:'reload'});
    req.then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.blob();})
      .then(b=>{const u=URL.createObjectURL(b);draw(u,()=>URL.revokeObjectURL(u));}).catch(rej);
  }),8000);
}
async function drawableCrest(){
  const raw=teamLogo();
  if(!hasMedia(raw))return '';
  const src=mediaSrc(raw);
  if(!src||src===LM_BLANK)return '';
  if(/^data:image\/(png|jpe?g|gif|webp)/i.test(src))return src;
  if(_crestCache.has(src))return _crestCache.get(src);
  const out=await readDrawable(src);
  if(out)_crestCache.set(src,out);   // a failure is not remembered: the next share tries again
  return out;
}
/* Any picture this app stores, read into a data URL by every route there is — directly,
   through /api/crest when it sits in this app's Storage bucket, then fetched afresh — so
   html2canvas or jsPDF can draw it. '' when none of them can read it. */
async function readDrawable(src,render){
  const modes=['direct'];
  if(CREST_STORAGE.test(src)&&/^https?:$/.test(location.protocol))modes.push('proxy');
  modes.push('fresh');
  for(const m of modes){
    try{return await readCrest(src,m,render);}
    catch(e){console.warn('picture: '+m+' read failed',e);}
  }
  return '';
}
async function buildWeekImageBlob(title,weekStart,days,athletes,scale=2){
  const logo=await drawableCrest();
  const html=buildWeekHTMLDoc(title,weekStart,days,athletes,{logo});
  const W=1123;   // 297mm at 96dpi — A4 landscape
  const iframe=document.createElement('iframe');
  iframe.style.cssText=`position:fixed;left:-9999px;top:0;width:${W}px;height:1px;border:none;visibility:hidden`;
  document.body.appendChild(iframe);
  try{
    const idoc=iframe.contentDocument||iframe.contentWindow.document;
    idoc.open();idoc.write(html);idoc.close();
    await new Promise(r=>setTimeout(r,50));
    try{if(idoc.fonts&&idoc.fonts.ready)await idoc.fonts.ready;}catch(e){}
    const imgs=Array.from(idoc.images||[]);
    await Promise.all(imgs.map(im=>im.complete?Promise.resolve():new Promise(rs=>{im.onload=rs;im.onerror=rs;})));
    const contentH=Math.max(idoc.body.scrollHeight,idoc.documentElement.scrollHeight,320);
    iframe.style.height=contentH+'px';
    await new Promise(r=>setTimeout(r,80));
    const canvas=await window.html2canvas(idoc.body,{
      scale,useCORS:true,backgroundColor:'#ffffff',logging:false,
      windowWidth:W,width:W,height:contentH});
    return await new Promise(res=>canvas.toBlob(b=>res(b),'image/png'));
  } finally {
    document.body.removeChild(iframe);
  }
}

/* The weekly sheet is one A4 landscape page by design: the week grid and the load
   distribution block belong on the coach's single sheet. A busy week grows the grid
   past the page and pushes the chart onto a second page, so the whole sheet is
   measured against the printable area and zoomed down until it fits. */
const RPT_WK_PAGE_W='285mm';                 // A4 landscape (297mm) minus the 6mm @page margins
const RPT_WK_PAGE_H=198/25.4*96;             // 210mm minus the same margins, in CSS px
const RPT_WK_FIT_MIN=0.55;
function fitWeekToPage(w){
  const doc=w.document,box=doc.querySelector('.fit');
  if(!box)return;
  const body=doc.body,prevW=body.style.width;
  body.style.width=RPT_WK_PAGE_W;
  try{
    let k=1;
    /* Zoom reflows rather than scaling pixels, so height does not fall exactly in
       step with it — a couple of passes settle it. */
    for(let i=0;i<4;i++){
      const h=box.getBoundingClientRect().height;
      if(h<=RPT_WK_PAGE_H)break;
      k=Math.max(RPT_WK_FIT_MIN,k*(RPT_WK_PAGE_H/h));
      box.style.zoom=k;
      if(k<=RPT_WK_FIT_MIN)break;
    }
  }finally{body.style.width=prevW;}
}

