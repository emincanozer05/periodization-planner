function videoEmbed(src){
  if(!src)return null;
  // Video kept on this device (cloud upload failed / henüz giriş yok) → yerel kopyayı oynat.
  if(isLocalRef(src)){const d=mediaSrc(src);return d&&d!==LM_BLANK?{kind:'file',src:d}:null;}
  if(src.startsWith('data:'))return{kind:'file',src};
  let m;
  if((m=src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)))return{kind:'iframe',src:'https://www.youtube.com/embed/'+m[1]};
  if((m=src.match(/vimeo\.com\/(?:video\/)?(\d+)/)))return{kind:'iframe',src:'https://player.vimeo.com/video/'+m[1]};
  // Instagram reels / posts / IGTV → official embeddable endpoint (raw URL blocks iframing)
  if((m=src.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i))){const ty=m[1].toLowerCase()==='reels'?'reel':m[1].toLowerCase();return{kind:'iframe',ig:true,src:'https://www.instagram.com/'+ty+'/'+m[2]+'/embed/'};}
  // TikTok video → embed player
  if((m=src.match(/tiktok\.com\/(?:.*\/video\/|v\/)(\d+)/)))return{kind:'iframe',src:'https://www.tiktok.com/embed/v2/'+m[1]};
  if(/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(src))return{kind:'file',src};
  if(/^https?:\/\//i.test(src))return{kind:'iframe',src};
  return null;
}
// Derive a cover-image URL from a video link (YouTube / Vimeo). Returns '' if none.
function videoThumb(src){
  if(!src)return'';
  let m;
  if((m=src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)))return'https://img.youtube.com/vi/'+m[1]+'/hqdefault.jpg';
  if((m=src.match(/vimeo\.com\/(?:video\/)?(\d+)/)))return'https://vumbnail.com/'+m[1]+'.jpg';
  return'';
}
// Best-effort: fetch the og:image (cover) of an Instagram reel/post via CORS proxies.
async function fetchOgImage(url){
  if(!url||!/instagram\.com\//i.test(url))return'';
  const proxies=[u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),u=>'https://corsproxy.io/?url='+encodeURIComponent(u)];
  const fetchT=(u,ms=7000)=>{const c=new AbortController();const id=setTimeout(()=>c.abort(),ms);return fetch(u,{cache:'no-store',signal:c.signal}).finally(()=>clearTimeout(id));};
  for(const p of proxies){
    try{const res=await fetchT(p(url));if(!res.ok)continue;const html=await res.text();
      let m=html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)||html.match(/"display_url":"([^"]+)"/);
      if(m)return m[1].replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    }catch(e){/* next */}
  }
  return'';
}

// Instagram reel/post → fetch the real MP4 (og:video) via a CORS proxy and play
// it inline as a <video>. Falls back to the official embed card if extraction fails.
function InstagramVideo({url,embedSrc}){
  const[st,setSt]=useState({loading:true,mp4:'',failed:false});
  useEffect(()=>{
    let alive=true;setSt({loading:true,mp4:'',failed:false});
    const proxies=[
      u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
      u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
      u=>'https://r.jina.ai/'+u,
    ];
    const extract=html=>{
      let m=html.match(/property=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/i)
        ||html.match(/content=["']([^"']+)["']\s+property=["']og:video(?::secure_url)?["']/i)
        ||html.match(/"video_url":"([^"]+)"/)
        ||html.match(/"video_versions":\[\{[^}]*?"url":"([^"]+)"/);
      if(!m)return'';
      return m[1].replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    };
    const fetchT=(u,ms=7000)=>{const c=new AbortController();const id=setTimeout(()=>c.abort(),ms);
      return fetch(u,{cache:'no-store',signal:c.signal}).finally(()=>clearTimeout(id));};
    (async()=>{
      for(const p of proxies){
        try{
          const res=await fetchT(p(url));
          if(!res.ok)continue;
          const html=await res.text();
          const v=extract(html);
          if(v&&alive){setSt({loading:false,mp4:v,failed:false});return;}
        }catch(e){/* try next proxy */}
      }
      if(alive)setSt({loading:false,mp4:'',failed:true});
    })();
    return()=>{alive=false;};
  },[url]);
  if(st.loading)return<div className="ex-novid">Instagram videosu yükleniyor…</div>;
  if(st.mp4)return<video className="ex-video" src={st.mp4} controls playsInline preload="metadata"/>;
  // Extraction failed → official embed card (plays inside the card; may need a tap)
  return<iframe className="ex-video" src={embedSrc} title={L('egzersiz videosu','exercise video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0"/>;
}
function VideoPlayer({ex}){
  const v=videoEmbed(ex.videoData||ex.videoUrl);
  /* Only the video plays here. The exercise's picture is the library card's cover and the
     PDF's image; on the open entry it is shown only while editing, small, under its own
     Paste button. */
  if(!v)return<div className="ex-novid">{L('Henüz video yok — düzenleyip video yükle veya link yapıştır.','No video yet — edit to upload a video or paste a link.')}</div>;
  if(v.kind==='file')return<video className="ex-video" src={v.src} controls/>;
  if(v.ig)return<InstagramVideo url={ex.videoData||ex.videoUrl} embedSrc={v.src}/>;
  return<iframe className="ex-video" src={v.src} title={L('egzersiz videosu','exercise video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0"/>;
}

/* ---- Muscle groups: pick one, or type one the list does not have -------------
   The box used to be a native dropdown with a fixed seventeen names. A muscle the list
   did not carry — rotator cuff, tibialis, serratus — could not be added at all, and a
   coach reported the picker as "does not add". Now it is a text box with the list under
   it: typing filters the list, a click or Enter adds the highlighted name, and a name
   that is not on the list at all is added as it was typed AND remembered on the account
   (`data.customMuscles`, synced like everything else), so it is on the list for every
   exercise from then on. A remembered name can be taken off the list with its own ✕ —
   that forgets the suggestion only; exercises already tagged with it keep the tag. */
function MusclePicker({value,onAdd,custom,onRemember,onForget}){
  const[q,setQ]=useState('');
  const[open,setOpen]=useState(false);
  const[hi,setHi]=useState(0);
  const wrap=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const away=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',away);
    return()=>document.removeEventListener('mousedown',away);
  },[open]);
  const have=new Set((value||[]).map(v=>String(v).toLowerCase()));
  const customList=(Array.isArray(custom)?custom:[]).filter(m=>String(m||'').trim());
  const all=[...EX_MUSCLES,...customList.filter(c=>!EX_MUSCLES.some(m=>m.toLowerCase()===c.toLowerCase()))];
  const norm=x=>String(x||'').toLocaleLowerCase('tr');
  const t=q.trim();
  const opts=all.filter(m=>!have.has(m.toLowerCase()))
    .filter(m=>!t||norm(m).includes(norm(t))||norm(exLabel(m)).includes(norm(t)));
  /* The typed text itself, offered as a new muscle when it matches nothing on the list
     under either language — "Glutes" typed on a Turkish screen is still Glutes. */
  const exact=all.find(m=>norm(m)===norm(t)||norm(exLabel(m))===norm(t));
  const isNew=!!t&&!exact&&!have.has(t.toLowerCase());
  const rows=[...opts.map(m=>({m,isCustom:customList.includes(m)})),...(isNew?[{m:t,isNew:true}]:[])];
  const pick=r=>{
    if(!r)return;
    const v=r.isNew?t:r.m;
    if(r.isNew&&onRemember)onRemember(v);
    onAdd(v);
    setQ('');setHi(0);
  };
  return(<div className="mus-add" ref={wrap}>
    <input value={q} placeholder={L('+ Kas ekle… (listeden seç ya da yaz)','+ Add muscle… (pick or type)')}
      onFocus={()=>setOpen(true)}
      onChange={e=>{setQ(e.target.value);setOpen(true);setHi(0);}}
      onKeyDown={e=>{
        if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setHi(h=>Math.min(h+1,rows.length-1));}
        else if(e.key==='ArrowUp'){e.preventDefault();setHi(h=>Math.max(h-1,0));}
        else if(e.key==='Enter'){e.preventDefault();
          if(exact&&!have.has(exact.toLowerCase()))pick({m:exact});else pick(rows[hi]);}
        else if(e.key==='Escape'){setOpen(false);}
      }}/>
    {open&&rows.length>0&&<div className="mus-menu" role="listbox">
      {rows.map((r,i)=><div key={(r.isNew?'+':'')+r.m} role="option" aria-selected={i===hi}
        className={'mus-opt'+(i===hi?' hi':'')+(r.isNew?' new':'')}
        onMouseEnter={()=>setHi(i)} onMouseDown={e=>{e.preventDefault();pick(r);}}>
        {r.isNew
          ?<span>＋ {L(`"${r.m}" yeni kas olarak ekle`,`Add "${r.m}" as a new muscle`)}</span>
          :<span>{exLabel(r.m)}</span>}
        {r.isCustom&&<i className="mus-own">{L('eklediğin','yours')}</i>}
        {r.isCustom&&onForget&&<button type="button" className="mus-forget"
          title={L('Bu kası listeden kaldır (etiketli egzersizler etkilenmez)','Remove this muscle from the list (tagged exercises keep it)')}
          onMouseDown={e=>{e.preventDefault();e.stopPropagation();onForget(r.m);}}>✕</button>}
      </div>)}
    </div>}
  </div>);
}

