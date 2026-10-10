/* =========================================================
   PHOTO RESIZE
   ========================================================= */
/* =========================================================
   LOCAL MEDIA STORE (device-only, IndexedDB)
   Holds files that must NOT go into the synced state at any price — a video, which
   at tens of megabytes would make the state undeliverable — under a `local:<id>`
   handle the state carries in their place, plus the handles an earlier version left
   on photos. liftLocalMedia() below empties it: each file goes to Firebase Storage
   as soon as the bucket accepts writes, and a photo it cannot upload is written back
   into the state so it still reaches the coach's other devices. Nothing a coach can
   see is left living in one browser's storage alone.
   ========================================================= */
const LM_DB='coachos-media',LM_STORE='files',LM_REF='local:';
// 1×1 transparent GIF — what a handle whose file lives on ANOTHER device resolves to,
// so a missing picture renders as an empty slot rather than a broken-image icon.
const LM_BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const _lmCache=new Map();          // id → data URL, filled by lmPreload() before the first render
let _lmDBP=null;
function lmDB(){
  if(_lmDBP)return _lmDBP;
  _lmDBP=new Promise((res,rej)=>{
    if(!window.indexedDB){rej(new Error('IndexedDB yok'));return;}
    const rq=indexedDB.open(LM_DB,1);
    rq.onupgradeneeded=()=>{const db=rq.result;if(!db.objectStoreNames.contains(LM_STORE))db.createObjectStore(LM_STORE);};
    rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);
  });
  return _lmDBP;
}
const lmTx=async(mode,fn)=>{const db=await lmDB();return new Promise((res,rej)=>{
  const tx=db.transaction(LM_STORE,mode);const st=tx.objectStore(LM_STORE);let out;
  try{out=fn(st);}catch(e){rej(e);return;}
  tx.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);tx.onerror=()=>rej(tx.error);});};
const lmPut=(id,dataUrl)=>lmTx('readwrite',st=>st.put(dataUrl,id));
const lmDel=id=>lmTx('readwrite',st=>st.delete(id));
// Everything at once into memory: a handle has to resolve synchronously inside render,
// and the store only ever holds the handful of pictures still waiting to be uploaded.
async function lmPreload(){
  try{
    const db=await lmDB();
    await new Promise((res,rej)=>{
      const tx=db.transaction(LM_STORE,'readonly');const st=tx.objectStore(LM_STORE);
      const kq=st.getAllKeys(),vq=st.getAll();
      tx.oncomplete=()=>{const ks=kq.result||[],vs=vq.result||[];ks.forEach((k,i)=>{if(typeof vs[i]==='string')_lmCache.set(String(k),vs[i]);});res();};
      tx.onerror=()=>rej(tx.error);
    });
  }catch(e){console.warn('local media preload failed',e);}
}
/* Script-writable storage is evictable by default: WebKit clears IndexedDB after seven
   days without a visit, and Chromium clears it under disk pressure — which is exactly the
   "the pictures I uploaded stop showing after a while" the coach sees, because the handle
   in the state outlives the file it points at. Asking for persistence is the only thing
   that takes the store out of that bucket. It is a request, not a guarantee (an installed
   PWA or a bookmarked, frequently used site usually gets it), so it is best effort: no
   dialog, no retry, and everything below still works if it is refused. */
async function lmPersist(){
  try{
    if(!navigator.storage||!navigator.storage.persist)return false;
    if(await navigator.storage.persisted())return true;
    const ok=await navigator.storage.persist();
    if(!ok)console.warn('local media store is evictable — the browser refused persistent storage');
    return ok;
  }catch(e){return false;}
}
/* When each file entered the store. A file written a moment ago is not collectable yet:
   saveLocalMedia() puts it in the store before its handle reaches the state, and a write
   landing inside that window would otherwise see a file nothing points at and delete the
   picture on its way in. Files read back by lmPreload() carry no birth time and are
   collectable at once, which is right — they predate this session. */
const _lmBorn=new Map();
const LM_GRACE=60*1000;
/* Drop device files nothing points at any more. Called ONLY after a write the cloud has
   accepted, and only for ids that appear in NONE of the serialised states handed to it —
   the one that was just written and the one on screen — so a file is never deleted while
   some version of the truth still needs it. Searched by looking each of the (few) held ids
   up in the JSON rather than by parsing handles out of it.
   This replaces deleting the file at the moment its picture was copied into the state.
   That copy could still be thrown away afterwards — the sync listener applies a remote
   snapshot that still carries the handle, a lift round is discarded because the coach typed
   while it ran, a write never lands — and the file was already gone, which is how an
   uploaded picture turned into a blank box that no reload could bring back. */
/* Which handles a serialised state names, read out of it in ONE pass. Looking each held id
   up with indexOf meant walking a multi-megabyte string once per picture, and that search
   ran on the main thread after every single write: a coach with sixty photos and a full
   season paid a third of a second there for every edit, which is most of the stutter after
   adding an exercise. A handle is a whole JSON string value, so it runs from `local:` to the
   closing quote — that is exactly the id, and reading it back cannot disagree with the
   serialiser about where it ends. */
const lmRefsIn=json=>{
  const out=new Set();
  if(typeof json!=='string')return out;
  const re=/local:([^"\\]*)/g;
  let m;while((m=re.exec(json)))out.add(m[1]);
  return out;
};
function lmSweep(){
  if(!_lmCache.size)return 0;
  const refs=[];
  for(let i=0;i<arguments.length;i++)if(typeof arguments[i]==='string')refs.push(lmRefsIn(arguments[i]));
  const now=Date.now();
  let n=0;
  Array.from(_lmCache.keys()).forEach(id=>{
    if(now-(_lmBorn.get(id)||0)<LM_GRACE)return;
    if(refs.some(s=>s.has(id)))return;
    _lmCache.delete(id);_lmBorn.delete(id);lmDel(id).catch(()=>{});n++;
  });
  return n;
}
const isLocalRef=v=>typeof v==='string'&&v.indexOf(LM_REF)===0;
const isInlineMedia=v=>typeof v==='string'&&(v.indexOf('data:image')===0||v.indexOf('data:video')===0);
/* True when the slot holds something but the something cannot be shown — a handle whose
   file is on another device or was evicted from this one. The upload surfaces test this
   rather than plain truthiness, so a picture that cannot be drawn reads as an empty slot
   asking to be filled instead of an invisible box the coach cannot explain. */
const isLostMedia=v=>isLocalRef(v)&&!_lmCache.has(v.slice(LM_REF.length));
const hasMedia=v=>!!v&&!isLostMedia(v);
/* Every <img src> that can carry coach-uploaded media goes through this: a plain URL or
   data URL passes straight through, a `local:` handle resolves to the file kept on this
   device. */
function mediaSrc(v){
  // Drive-hosted picture: the id is stored, the viewable URL is derived (as the print
  // builders' psrc has always done — screen renderers were showing the raw `drive:` string
  // to the browser, which cannot load it).
  if(typeof v==='string'&&v.indexOf('drive:')===0)return driveImg(v.slice(6));
  if(!isLocalRef(v))return v||'';
  // A handle whose file is on another device resolves to a blank pixel rather than a broken
  // image. It is only ever a handle while an upload is still pending — liftLocalMedia()
  // either gets it into Storage or writes the picture back into the state.
  return _lmCache.get(v.slice(LM_REF.length))||LM_BLANK;
}
/* BOZUK ÖNBELLEK KOPYASINI ONAR. Service worker Storage görsellerini çevrimdışı için saklıyor,
   ama kova CORS vermediği için yanıt opak: durum kodu okunamıyor ve bir 403/404/503 da
   görsel diye saklanıyordu. O cihazda görsel, her açılışta aynı bozuk kopyadan verildiği için
   kalıcı olarak boş görünüyordu. Çizilemeyen her Storage görselinde worker'dan o kopyayı
   silmesi isteniyor ve görsel bir kez yeniden yükleniyor. `error` olayı kabarmadığı için
   yakalama evresinde dinleniyor; böylece her <img> tek tek değiştirilmeden kapsanıyor. */
const isStorageMediaUrl=u=>typeof u==='string'&&/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^?#]*\?(?:[^#]*&)?alt=media(?:[&#]|$)/.test(u);
const _mediaRetried=new Set();   // adres başına oturumda bir kez: kalıcı bir hata döngüye girmesin
function dropCachedMedia(url){
  return new Promise(res=>{
    try{
      const sw=navigator.serviceWorker&&navigator.serviceWorker.controller;
      if(!sw||typeof MessageChannel==='undefined')return res(false);
      const ch=new MessageChannel();
      const t=setTimeout(()=>res(false),3000);
      ch.port1.onmessage=e=>{clearTimeout(t);res(!!(e.data&&e.data.dropped));};
      sw.postMessage({coachos:'drop-media',url},[ch.port2]);
    }catch(e){res(false);}
  });
}
if(typeof document!=='undefined')document.addEventListener('error',e=>{
  const img=e.target;
  if(!img||img.tagName!=='IMG')return;
  const url=img.src;
  if(!isStorageMediaUrl(url)||_mediaRetried.has(url))return;
  _mediaRetried.add(url);
  dropCachedMedia(url).then(dropped=>{
    // Kopya yoktuysa hata ağdan geldi; aynı isteği tekrarlamak bir şey değiştirmez.
    if(!dropped||!img.isConnected||img.src!==url)return;
    img.removeAttribute('src');img.src=url;
  });
},true);
/* Backup dosyası için: cihazda duran görselleri tutamak yerine gerçek içerikleriyle yaz.
   Yedek tek başına taşınabilir olmalı — tutamak başka bir cihazda hiçbir şeye karşılık gelmez.
   (Geri yüklemede base64 yeniden duruma girer; liftLocalMedia birkaç saniye içinde onu
   yine buluta/cihaz deposuna taşır, yani senkron yükü kalıcı olmaz.) */
function inlineLocalMedia(node){
  if(isLocalRef(node)){const d=_lmCache.get(node.slice(LM_REF.length));return d||node;}
  if(Array.isArray(node))return node.map(inlineLocalMedia);
  if(node&&typeof node==='object'){const o={};for(const k of Object.keys(node))o[k]=inlineLocalMedia(node[k]);return o;}
  return node;
}
async function saveLocalMedia(dataUrl){
  const id=Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
  _lmCache.set(id,dataUrl);_lmBorn.set(id,Date.now());   // off-limits to the sweep until its handle lands
  await lmPut(id,dataUrl);   // memory first so the picture shows even if the disk write fails
  return LM_REF+id;
}
// Anything in the state that is not a cloud URL yet: a device handle, or base64 left
// embedded by an older version. Cheap enough to run before each retry round.
function hasPendingMedia(node,seen){
  seen=seen||new Set();
  if(isLocalRef(node)||isInlineMedia(node))return true;
  if(!node||typeof node!=='object'||seen.has(node))return false;
  seen.add(node);
  return Object.keys(node).some(k=>hasPendingMedia(node[k],seen));
}
/* ---- Firebase Storage media upload (keeps big files OUT of the synced JSON) ---- */
function resizePhotoBlob(file,cb,mx=900,q=0.85){
  const img=new Image();const rd=new FileReader();
  rd.onload=e=>{img.src=e.target.result;};
  img.onload=()=>{let w=img.width,h=img.height;
    if(w>h&&w>mx){h=Math.round(h*mx/w);w=mx;}else if(h>=w&&h>mx){w=Math.round(w*mx/h);h=mx;}
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    c.toBlob(b=>cb(b||file),'image/jpeg',q);};
  rd.readAsDataURL(file);
}
async function uploadMedia(blob,folder,onProgress,name){
  const fb=(typeof FB==='function')?FB():null;
  if(!fb||!fb.storage)throw new Error('Bulut depolama yüklenmedi.');
  const user=fb.auth().currentUser;if(!user)throw new Error('Medya yüklemek için önce hesabınla giriş yap.');
  const ext=((name&&name.indexOf('.')>=0)?name.split('.').pop():((blob.type||'').split('/')[1]||'bin')).toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
  const path='users/'+user.uid+'/'+folder+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const ref=fb.storage().ref().child(path);
  const task=ref.put(blob);
  await new Promise((res,rej)=>task.on('state_changed',s=>{if(onProgress)onProgress(Math.round(s.bytesTransferred/Math.max(1,s.totalBytes)*100));},rej,res));
  return await ref.getDownloadURL();
}
/* A failed upload says nothing on screen: the picture is on the device, the state carries
   a handle, sync speed is untouched and the retry loop keeps uploading it in the
   background. Neither a dialog nor a standing notice earns the coach's attention for a
   console setting they cannot change from here — it goes to the console and no further. */
function warnStorageFailure(e){
  console.warn('media upload failed → kept on this device, will retry',e);
}
function handleImageUpload(file,folder,done,onProgress){
  if(!file)return;
  const fb=(typeof FB==='function')?FB():null;
  const loggedIn=fb&&fb.auth&&fb.auth().currentUser;
  resizePhotoBlob(file,async blob=>{
    if(loggedIn){try{const url=await uploadMedia(blob,folder,onProgress);done(url);return;}catch(e){warnStorageFailure(e);}}
    /* The upload did not go through (or nobody is signed in yet), so the picture goes into
       the state itself. It syncs to the coach's other devices from there — slowly, since
       the state is re-sent whole on every edit, but visibly. liftLocalMedia() keeps trying
       to move it to Storage; the moment the bucket accepts writes the state carries a short
       URL again and sync is fast. A photo only the uploading browser can see is not a
       trade worth making. */
    const r=new FileReader();
    r.onload=e=>done(e.target.result);
    r.readAsDataURL(blob);
  });
}
// Pull an image off the system clipboard (via the "paste" button) and run it
// through the same resize/upload path as a picked file. Falls back with a
// friendly note if the browser blocks clipboard reads or nothing image-like
// was copied.
async function pasteImageFromClipboard(folder,done){
  try{
    if(!navigator.clipboard||!navigator.clipboard.read){
      alert('Clipboard reading is not available in this browser. Copy an image, click the photo, then press Ctrl/Cmd+V instead.');return;
    }
    const items=await navigator.clipboard.read();
    for(const it of items){
      const type=it.types.find(t=>t.startsWith('image/'));
      if(type){
        const blob=await it.getType(type);
        handleImageUpload(new File([blob],'pasted.png',{type:blob.type}),folder,done);
        return;
      }
    }
    alert('No image found on the clipboard. Copy an image first, then click paste.');
  }catch(err){
    alert('Could not read the clipboard. Allow clipboard access for this site, or copy the image then press Ctrl/Cmd+V over the photo.');
  }
}
// Grab the first image out of a native paste (Ctrl/Cmd+V) event, if any.
// Returns the File so callers can decide whether to consume the event.
function imageFileFromPaste(e){
  const items=(e.clipboardData&&e.clipboardData.items)||[];
  for(const it of items){
    if(it.type&&it.type.startsWith('image/')){
      const f=it.getAsFile();
      if(f)return f;
    }
  }
  return null;
}

function resizePhoto(file,cb){
  // Higher quality for sport-science test photos: 700px max, JPEG 0.90.
  // ~3-5× more pixels than the old 200/0.75 setting → noticeably sharper
  // in the printed PDF. Trade-off is a larger stored payload per photo.
  const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{
    const c=document.createElement('canvas');let w=img.width,h=img.height;const mx=700;
    if(w>h){if(w>mx){h*=mx/w;w=mx;}}else{if(h>mx){w*=mx/h;h=mx;}}
    c.width=w;c.height=h;const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,w,h);cb(c.toDataURL('image/jpeg',.90));
  };img.src=e.target.result;};r.readAsDataURL(file);
}
/* Data healer: walk the whole state and lift every picture that is not yet a cloud URL
   out to Firebase Storage, leaving a short download URL in its place. Two kinds get lifted:
     • base64 still embedded from before this store existed — those are what made the synced
       payload several MB, and the payload is re-sent on every edit;
     • `local:` handles left by an upload that failed earlier.
   Mutates `obj` in place and returns true if anything moved. A picture that still cannot be
   uploaded is never lost: embedded base64 is moved into the device store (which already
   shrinks the synced JSON), and a handle simply stays a handle until the next attempt.
   Runs after the first cloud load and, while anything is still pending, every few minutes. */
/* Put every `local:` handle whose file is on THIS device back into the state, with no
   network and nothing to wait for. An earlier version moved pictures out of the state into
   the device store; while Storage refuses uploads those handles resolve to nothing anywhere
   the store is not (another device, another browser, cleared site data), which is a photo
   the coach cannot see. So they are inlined again the moment the state is loaded — the
   picture syncs and shows everywhere, and liftLocalMedia() still moves it to Storage later.
   Mutates `obj`; returns how many were restored and how many handles are left pointing at a
   file this device does not have. */
function restoreLocalMedia(obj){
  let restored=0,missing=0;
  /* The device copy is NOT dropped here. Writing the picture into `obj` is not the same as
     that `obj` surviving: the sync listener can replace it with a remote snapshot that still
     carries the handle, and then the only copy of the picture would be one this function had
     already deleted. lmSweep() drops it later, once a write has actually landed. */
  const fix=v=>{
    const id=v.slice(LM_REF.length);
    const data=_lmCache.get(id);
    if(!data){missing++;return v;}
    restored++;
    return data;
  };
  const walk=node=>{
    if(Array.isArray(node)){
      for(let i=0;i<node.length;i++){const v=node[i];
        if(isLocalRef(v))node[i]=fix(v);else if(v&&typeof v==='object')walk(v);}
    }else if(node&&typeof node==='object'){
      for(const k of Object.keys(node)){const v=node[k];
        if(isLocalRef(v))node[k]=fix(v);else if(v&&typeof v==='object')walk(v);}
    }
  };
  walk(obj);
  return{restored,missing};
}
/* The same recovery, done WITHOUT a copy of the state to do it to. The version above needs
   one — it writes in place — so the pass that runs after every edit began by cloning the
   whole state through JSON, walking the clone, counting its pictures and logging the count,
   and it did all of that even when there was nothing to restore. A handle pointing at a file
   that is on another device never resolves, so that never stopped happening: a coach whose
   squad shares one plan paid a fifth of a second half a second after every edit, which is
   the stutter felt when adding an exercise.
   This rebuilds only the nodes on the path to a picture it can actually put back, shares
   every other subtree, and hands the SAME object straight back when there is nothing to do —
   no allocation, nothing for React to re-render, and no round through the serialiser. */
function restoredLocalMedia(node,out){
  if(Array.isArray(node)){
    let next=node;
    for(let i=0;i<node.length;i++){
      const v=node[i];
      const nv=isLocalRef(v)?lmResolve(v,out):(v&&typeof v==='object'?restoredLocalMedia(v,out):v);
      if(nv!==v){if(next===node)next=node.slice();next[i]=nv;}
    }
    return next;
  }
  if(!node||typeof node!=='object')return node;
  let next=node;
  for(const k of Object.keys(node)){
    const v=node[k];
    const nv=isLocalRef(v)?lmResolve(v,out):(v&&typeof v==='object'?restoredLocalMedia(v,out):v);
    if(nv!==v){if(next===node)next={...node};next[k]=nv;}
  }
  return next;
}
// A handle this device holds the file for becomes the picture; one it does not is left
// exactly as it is, and counted so the caller can say so.
function lmResolve(ref,out){
  const data=_lmCache.get(ref.slice(LM_REF.length));
  if(!data){out.missing++;return ref;}
  out.restored++;return data;
}
/* What the state's pictures actually are, counted by kind. The Backup panel shows this,
   and it is written to the console on every load: when a picture does not appear, the first
   thing to know is whether the state still holds it (data:), points at the cloud (https),
   points at this device (local:, resolvable) or points at a file no reachable device has. */
function mediaReport(node,acc,seen){
  acc=acc||{cloud:0,inline:0,device:0,lost:0,drive:0};
  seen=seen||new Set();
  if(typeof node==='string'){
    if(isLocalRef(node))acc[_lmCache.has(node.slice(LM_REF.length))?'device':'lost']++;
    else if(isInlineMedia(node))acc.inline++;
    else if(node.indexOf('drive:')===0)acc.drive++;
    else if(/^https?:\/\/[^ ]*(firebasestorage|googleusercontent|drive\.google)/.test(node))acc.cloud++;
    return acc;
  }
  if(!node||typeof node!=='object'||seen.has(node))return acc;
  seen.add(node);
  Object.keys(node).forEach(k=>mediaReport(node[k],acc,seen));
  return acc;
}
/* Pull pictures out of a backup file and into the state where the state has lost them.
   Nothing else in the backup is touched — a coach who has any older export can get the
   photos back without rolling the whole plan back to that day. Objects are matched by id
   where they carry one, by position otherwise; a picture is copied only into a slot that
   is empty or points at a file this device does not have. */
function mergeMediaFrom(cur,bak){
  let copied=0;
  const missing=v=>v==null||v===''||(isLocalRef(v)&&!_lmCache.has(v.slice(LM_REF.length)));
  const walk=(c,b)=>{
    if(!c||!b||typeof c!=='object'||typeof b!=='object')return;
    if(Array.isArray(c)&&Array.isArray(b)){
      const byId={};b.forEach((x,i)=>{if(x&&typeof x==='object'&&x.id!=null)byId[x.id]=x;});
      c.forEach((x,i)=>{
        const m=(x&&typeof x==='object'&&x.id!=null&&byId[x.id])?byId[x.id]:b[i];
        if(x&&typeof x==='object'&&m&&typeof m==='object')walk(x,m);
      });
      return;
    }
    if(Array.isArray(c)!==Array.isArray(b))return;
    Object.keys(b).forEach(k=>{
      const bv=b[k],cv=c[k];
      if(isInlineMedia(bv)){if(missing(cv)){c[k]=bv;copied++;}return;}
      if(bv&&typeof bv==='object'&&cv&&typeof cv==='object')walk(cv,bv);
    });
  };
  walk(cur,bak);
  return copied;
}
/* While Storage refuses writes every picture in the state fails on every round, so a
   failed round stands the retry down for half an hour instead of re-running the whole
   walk every few minutes. Reloading the page clears it — a coach who has just published
   the rules should not have to wait one out. */
let _liftPausedUntil=0;
const liftPaused=()=>Date.now()<_liftPausedUntil;
async function liftLocalMedia(obj,fb,uid){
  if(!fb||!fb.storage||!uid)return false;
  let changed=false,failed=false;
  const upBlob=async blob=>{const url=await uploadMedia(blob,'migrated',null);changed=true;return url;};
  const fromInline=async dataUrl=>{
    // Storage shut → the picture stays exactly where it is. Moving it to the device store
    // would shrink the synced document but make the picture device-only, and a photo that
    // vanishes from the coach's other devices costs more than a slow sync ever did.
    try{return await upBlob(await (await fetch(dataUrl)).blob());}
    catch(e){failed=true;warnStorageFailure(e);return dataUrl;}
  };
  /* One handle can appear in several places, so each is resolved once and the answer
     reused — otherwise the same file is uploaded twice. The device copies are left alone:
     this round's result is thrown away whenever the coach edits while it runs, and deleting
     the file here would take the picture with it. lmSweep() collects them after a write. */
  const seen=new Map();
  const fromRef=async ref=>{
    if(seen.has(ref))return seen.get(ref);
    const id=ref.slice(LM_REF.length);
    const data=_lmCache.get(id);
    if(!data)return ref;                       // file is on another device — leave the handle alone
    let out;
    try{
      out=await upBlob(await (await fetch(data)).blob());
    }catch(e){
      failed=true;warnStorageFailure(e);
      /* Cloud still shut and the picture is here: write it back into the state. That is
         what puts a photo taken on this device back on all the others, and it undoes the
         handles an earlier version left behind — a picture is never left living in one
         browser's storage alone. */
      changed=true;out=data;
    }
    seen.set(ref,out);
    return out;
  };
  const lift=v=>isInlineMedia(v)?fromInline(v):fromRef(v);
  const walk=async node=>{
    if(Array.isArray(node)){
      for(let i=0;i<node.length;i++){
        const v=node[i];
        if(isInlineMedia(v)||isLocalRef(v))node[i]=await lift(v);
        else if(v&&typeof v==='object')await walk(v);
      }
    }else if(node&&typeof node==='object'){
      for(const k of Object.keys(node)){
        const v=node[k];
        if(isInlineMedia(v)||isLocalRef(v))node[k]=await lift(v);
        else if(v&&typeof v==='object')await walk(v);
      }
    }
  };
  await walk(obj);
  if(failed)_liftPausedUntil=Date.now()+30*60*1000;
  return changed;
}

