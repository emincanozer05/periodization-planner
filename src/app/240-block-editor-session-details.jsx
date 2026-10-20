/* =========================================================
   BLOCK EDITOR (now with exercise description row)
   ========================================================= */
/* Exercise-name field: auto-growing textarea (long names wrap & stay visible)
   WITH a custom autocomplete dropdown fed from the shared exercise library
   (textarea can't use a native <datalist>, so we render our own list). */
const UNCAT='Kategorisiz';
/* The picker lists the exercises of the row's own category only (Kategori), and filters
   them by that category's types and directions (Tür · Yön) — the same boxes the row has.
   A row with no category yet lists the library by category instead. */
const EN_NO_TYPE='__none';
function ExNameField({value,onChange,onPick,tags,onNewName}){
  const[focus,setFocus]=useState(false);
  const[hi,setHi]=useState(-1);
  const[cats,setCats]=useState([]);   // selected category names (empty = no filter)
  const[,setTick]=useState(0); // force re-position on scroll/resize
  const taRef=useRef(null);
  const insideRef=useRef(false);   // pointer is over the panel → a blur must not close it
  const committedRef=useRef(null); // last value THIS box pushed to the library
  /* The name box holds what is being typed itself: every keystroke here also filters the
     library list behind it, and waiting for the whole app to rebuild before the letter
     appeared is what made naming an exercise feel like typing through treacle. */
  const[val,setVal]=useLiveValue(value||'',onChange);
  const fit=el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}};
  useEffect(()=>{fit(taRef.current);},[val]);
  // While open, keep the portal dropdown glued to the input as the page scrolls.
  useEffect(()=>{if(!focus)return;const on=()=>setTick(t=>t+1);
    window.addEventListener('scroll',on,true);window.addEventListener('resize',on);
    return()=>{window.removeEventListener('scroll',on,true);window.removeEventListener('resize',on);};},[focus]);
  // Clicking anywhere outside closes the picker — needed because dragging the panel's
  // scrollbar takes focus off the textarea without ever "leaving" the dropdown.
  useEffect(()=>{if(!focus)return;const on=e=>{const t=e.target;
    if(taRef.current&&taRef.current.contains(t))return;
    if(t&&t.closest&&t.closest('.en-pick'))return;
    insideRef.current=false;setFocus(false);setHi(-1);};
    document.addEventListener('mousedown',on,true);
    return()=>document.removeEventListener('mousedown',on,true);},[focus]);
  // Save to library only the box's FINAL value: first commit adds it; later edits
  // (incl. clearing) replace the previously auto-added stub instead of piling up.
  /* The row's movement pattern and execution ride into the library with the name, so an
     exercise written here is filed the way it is trained — whichever order the coach
     works in. Typing the name first and tagging it after already wrote the pair; this
     covers the other order, and a rename, which otherwise left a bare stub behind. */
  const withTags=nm=>{if(nm&&tags&&String(tags.pattern||'').trim())rememberExerciseTags(nm,tags.pattern,tags.plane||'',tags.dir||'');};
  /* A name the box has not filed before — freshly typed or renamed — is also the moment
     the row can be read for how the exercise is executed. An unchanged name is not: the
     coach may have cleared the execution on purpose, and re-entering the name field is
     no reason to argue with them. */
  const fresh=nm=>{if(nm&&onNewName)onNewName(nm);};
  const commit=v=>{const nm=(v||'').trim();const prev=committedRef.current;
    if(prev===null){if(nm)addExerciseToLibrary(nm);committedRef.current=nm;withTags(nm);fresh(nm);return;}
    if(nm===prev){withTags(nm);return;}
    replaceExerciseInLibrary(prev,nm);committedRef.current=nm;withTags(nm);fresh(nm);};
  const q=(val||'').trim().toLowerCase();
  const cat=tags&&MV_KEYS.includes(tags.pattern)?tags.pattern:'';
  const[dirs,setDirs]=useState([]);   // directions ticked (empty = no filter)
  /* A different category on the row is a different list: what was ticked for the last one
     does not carry over. */
  useEffect(()=>{setCats([]);setDirs([]);},[cat]);
  const libAll=focus?getLibItems():[];
  /* The row's category narrows the library first, so nothing of another category is offered. */
  const lib=useMemo(()=>cat?libAll.filter(e=>mvLibCat(e)===cat).map(e=>{const t=mvLibType(e,cat);
    return{...e,_t:t,_d:mvLibDir(e,cat,t)};}):libAll,[libAll,cat]);
  // Text query narrows the pool first; the counts on the right are computed from that pool
  // so they always say how many rows a filter would actually show.
  const pool=useMemo(()=>q?lib.filter(e=>e.name.toLowerCase().includes(q)):lib,[lib,q]);
  /* The filters on the right: the category's types (and its directions), or — on a row with
     no category — the categories themselves, with "Kategorisiz" for what none of them claims. */
  const catList=useMemo(()=>{
    const cnt=new Map();
    if(cat){
      pool.forEach(e=>{const k=e._t||EN_NO_TYPE;cnt.set(k,(cnt.get(k)||0)+1);});
      const out=mvTypes(cat).map(t=>({name:t,label:mvTerm(cat,t),n:cnt.get(t)||0}));
      if(cnt.get(EN_NO_TYPE))out.push({name:EN_NO_TYPE,label:L('Türsüz','No type'),n:cnt.get(EN_NO_TYPE)});
      return out;
    }
    pool.forEach(e=>{const k=mvLibCat(e)||UNCAT;cnt.set(k,(cnt.get(k)||0)+1);});
    const out=MV_KEYS.map(k=>({name:k,label:mvCatLabel(k),n:cnt.get(k)||0}));
    if(cnt.get(UNCAT))out.push({name:UNCAT,label:L('Kategorisiz','Uncategorized'),n:cnt.get(UNCAT)});
    return out;
  },[pool,cat]);
  const dirList=useMemo(()=>{
    if(!cat||!mvDirs(cat).length)return[];
    const cnt=new Map();pool.forEach(e=>{if(e._d)cnt.set(e._d,(cnt.get(e._d)||0)+1);});
    return mvDirs(cat).map(d=>({name:d,label:mvTerm(cat,d),n:cnt.get(d)||0}));
  },[pool,cat]);
  // Ticked values are OR-ed inside a list; the type and the direction lists are AND-ed.
  const matchesCats=e=>{
    if(cat){
      if(cats.length&&!cats.includes(e._t||EN_NO_TYPE))return false;
      if(dirs.length&&!dirs.includes(e._d))return false;
      return true;
    }
    return!cats.length||cats.includes(mvLibCat(e)||UNCAT);
  };
  const shown=useMemo(()=>pool.filter(matchesCats),[pool,cats,dirs,cat]);
  const sugg=shown.slice(0,300);   // cap the rendered rows; the header keeps the real total
  const toggleCat=c=>{setHi(-1);setCats(a=>a.includes(c)?a.filter(x=>x!==c):[...a,c]);};
  const toggleDir=c=>{setHi(-1);setDirs(a=>a.includes(c)?a.filter(x=>x!==c):[...a,c]);};
  // Picking a library row hands the whole entry back (not just the name) so the caller can
  // pull its cover image and video link onto the exercise; typing a free name never does.
  const pick=it=>{const n=it.name;if(onPick)onPick(it);else onChange(n);
    setFocus(false);setHi(-1);commit(n);};
  const rect=(focus&&taRef.current)?taRef.current.getBoundingClientRect():null;
  // Keep the panel inside the viewport: it is wider than the input, and flips above the
  // field when there isn't room below.
  let box=null;
  if(rect){
    const vw=window.innerWidth,vh=window.innerHeight;
    const w=Math.min(620,Math.max(rect.width,vw-24));
    const left=Math.max(12,Math.min(rect.left,vw-12-w));
    const up=vh-rect.bottom<260&&rect.top>vh-rect.bottom;
    box=up?{position:'fixed',left,bottom:vh-rect.top+2,width:w,right:'auto'}
          :{position:'fixed',left,top:rect.bottom+2,width:w,right:'auto'};
  }
  return(<div className="en-wrap">
    <textarea ref={taRef} className="en" rows={1} value={val} placeholder={L('Egzersiz adı','Exercise name')}
      onChange={e=>{setVal(e.target.value);fit(e.target);setHi(-1);setFocus(true);}}
      onFocus={()=>setFocus(true)}
      /* After a pick the box keeps DOM focus, so re-opening the picker needs an
         explicit click handler — onFocus alone would never fire again. */
      onClick={()=>setFocus(true)}
      onBlur={()=>{setTimeout(()=>{if(!insideRef.current)setFocus(false);},120);commit(val);}}
      onKeyDown={e=>{
        if(sugg.length&&e.key==='ArrowDown'){e.preventDefault();setHi(h=>Math.min(h+1,sugg.length-1));}
        else if(sugg.length&&e.key==='ArrowUp'){e.preventDefault();setHi(h=>Math.max(h-1,0));}
        else if(e.key==='Enter'){e.preventDefault();if(hi>=0&&sugg[hi])pick(sugg[hi]);else e.target.blur();}
        else if(e.key==='Escape'){setFocus(false);setHi(-1);}
      }}/>
    {/* Rendered in a body portal so no ancestor's overflow:hidden can clip it. */}
    {focus&&rect&&(lib.length>0||cat)&&ReactDOM.createPortal(
      <div className="en-sugg en-pick" style={box}
        onMouseEnter={()=>{insideRef.current=true;}}
        onMouseLeave={()=>{insideRef.current=false;}}
        onMouseDown={e=>e.preventDefault()}
        onMouseUp={()=>{if(taRef.current)taRef.current.focus();}}>
        <div className="en-pane en-pane-ex">
          <div className="en-phd"><span>{cat
            ?<><i className="en-catdot" style={{background:ML_PIE_COLS[cat]}}/><b>{mvCatLabel(cat)}</b> · {L(`${shown.length} egzersiz`,`${shown.length} exercises`)}</>
            :L(`${shown.length} egzersiz gösteriliyor`,`${shown.length} exercises shown`)}</span>
            {(cats.length>0||dirs.length>0)&&<button type="button" className="en-clear" onClick={()=>{setCats([]);setDirs([]);setHi(-1);}}>{L('filtreyi temizle','clear filter')}</button>}</div>
          <div className="en-plist">
            {sugg.map((e,i)=>
              <div key={e.name} className={"en-sopt"+(i===hi?" on":"")}
                onMouseDown={ev=>{ev.preventDefault();pick(e);}}>
                <span className="en-badge">{(e.name[0]||'?').toUpperCase()}</span>
                <span className="en-nm">{e.name}</span>
                <span className="en-tag">{cat
                  ?[mvTerm(cat,e._t),mvTerm(cat,e._d)].filter(Boolean).join(' · ')||'—'
                  :(mvLibCat(e)?mvCatLabel(mvLibCat(e)):L('Kategorisiz','Uncategorized'))}</span>
              </div>)}
            {shown.length===0&&<div className="en-none">{cat&&!lib.length
              ?L(`Kütüphanede ${mvCatLabel(cat)} kategorisinde egzersiz yok — adını yazarak ekleyebilirsin.`,`The library has no ${mvCatLabel(cat)} exercise yet — type a name to add one.`)
              :L('Bu filtreyle eşleşen egzersiz yok','No exercises match this filter')}</div>}
            {shown.length>sugg.length&&<div className="en-none">{L(`+${shown.length-sugg.length} egzersiz daha — aramayı daraltın`,`+${shown.length-sugg.length} more exercises — narrow your search`)}</div>}
          </div>
        </div>
        <div className="en-pane en-pane-cat">
          <div className="en-phd"><span>{cat?L(...mvTypeLab(cat)):L('Kategori','Category')}</span></div>
          <div className="en-plist">
            {catList.map(c=>
              <label key={c.name} className={"en-cat"+(cats.includes(c.name)?" on":"")+(c.n?"":" zero")}
                onMouseDown={ev=>{ev.preventDefault();toggleCat(c.name);}}>
                <span className="en-cbx">{cats.includes(c.name)?'✓':''}</span>
                <span className="en-cnm">{c.label}</span>
                <span className="en-cn">{c.n}</span>
              </label>)}
            {dirList.length>0&&<div className="en-phd en-phd-sub"><span>{L(...mvDirLab(cat))}</span></div>}
            {dirList.map(c=>
              <label key={c.name} className={"en-cat"+(dirs.includes(c.name)?" on":"")+(c.n?"":" zero")}
                onMouseDown={ev=>{ev.preventDefault();toggleDir(c.name);}}>
                <span className="en-cbx">{dirs.includes(c.name)?'✓':''}</span>
                <span className="en-cnm">{c.label}</span>
                <span className="en-cn">{c.n}</span>
              </label>)}
          </div>
        </div>
      </div>,document.body)}
  </div>);
}
/* ---- Boxes that keep up with the keyboard ---------------------------------
   A letter typed into an exercise row used to travel straight to the root state, and
   everything hanging off it re-rendered BEFORE the letter reached the screen: the day
   being written, the calendar around it, the copy of the session mirrored onto every
   assigned athlete, the insight board and its charts. On a full week that is tens of
   milliseconds per keystroke — which is what made writing sets, reps and rest feel
   like the screen was seizing up.
   Nothing about what is stored changes here, only WHEN the heavy work happens. The box
   holds what was typed itself, so the letter is on screen on the very next frame, and
   the same value is handed upward as a React transition: an interruptible render that
   yields to the next keystroke instead of blocking it. Type through a whole rest field
   and the app rebuilds once, when the typing stops, rather than once per character. */
const _liveT=(React&&typeof React.startTransition==='function')?React.startTransition:fn=>fn();
function useLiveValue(value,onChange){
  const[local,setLocal]=useState(value);
  const sent=useRef(value);            // the last value THIS box handed upward
  const cb=useRef(onChange);cb.current=onChange;
  /* A value that changed anywhere ELSE is taken: a row pasted over, an exercise picked
     off the library, a drill that moved under this box. The value coming back from our
     own edit is not — putting it back mid-word would drag the caret with it. */
  useEffect(()=>{if(value!==sent.current){sent.current=value;setLocal(value);}},[value]);
  const set=v=>{sent.current=v;setLocal(v);_liveT(()=>cb.current(v));};
  return[local,set];
}
/* An <input> / <textarea> that types at the speed of the keyboard. Same props as the
   plain box, except onChange is handed the value rather than the event. */
function LiveInput({value,onChange,...rest}){
  const[v,set]=useLiveValue(value==null?'':value,onChange);
  return<input value={v} onChange={e=>set(e.target.value)} {...rest}/>;
}
/* A phase name typed straight onto its bar. Sized to what is in it as it is typed —
   the bar shows the name in bold capitals, which run wider than the box's own
   character width, so a fixed size cut long names off. */
function PhaseNameInput({value,onChange,...rest}){
  const[v,set]=useLiveValue(value==null?'':value,onChange);
  const n=Math.max(4,[...String(v)].length+1);
  return<input value={v} onChange={e=>set(e.target.value)} style={{width:`calc(${n}ch + ${n*0.2}em)`}} {...rest}/>;
}
function LiveTextarea({value,onChange,...rest}){
  const[v,set]=useLiveValue(value==null?'':value,onChange);
  return<textarea value={v} onChange={e=>set(e.target.value)} {...rest}/>;
}
/* Tiny per-exercise image button. Click = paste the copied image from the
   clipboard (Ctrl/Cmd+V while focused also works); right-click = pick a file.
   On screen it only shows a small thumbnail — the image renders full-size in
   the "Print with Image" output. */
function ExImgBtn({image,onChange}){
  const fileRef=useRef(null);
  const save=f=>{if(f)handleImageUpload(f,'exercises',onChange);};
  return(<span className="eximg-wrap">
    <button type="button" className={'eximg-btn'+(hasMedia(image)?' has':'')}
      title={image?L('Egzersiz görseli · Tıkla: yeni kopyalanan görseli yapıştır · Sağ tık: dosya seç','Exercise image · Click: paste a new copied image · Right-click: choose file'):L('Egzersiz görseli ekle · Bir görseli kopyala, sonra tıklayıp yapıştır (ya da Ctrl/Cmd+V) · Sağ tık: dosya seç','Add exercise image · Copy an image, then click to paste (or Ctrl/Cmd+V) · Right-click: choose file')}
      onClick={()=>pasteImageFromClipboard('exercises',onChange)}
      onPaste={e=>{const f=imageFileFromPaste(e);if(f){e.preventDefault();save(f);}}}
      onContextMenu={e=>{e.preventDefault();fileRef.current?.click();}}>
      {hasMedia(image)?<img src={mediaSrc(image)} alt="exercise"/>:<span className="eximg-ph">🖼</span>}
    </button>
    {hasMedia(image)&&<button type="button" className="eximg-x" title={L('Görseli kaldır','Remove image')} onClick={()=>onChange('')}>×</button>}
    <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
      onChange={e=>{const f=e.target.files?.[0];if(f)save(f);e.target.value='';}}/>
  </span>);
}
/* Per-exercise reference link (video / article / cue clip). Stays behind a small
   "Add link" button until it holds something, so untouched rows are as compact as before.
   Picking an exercise from the library fills it from that entry's video link. */
function ExLinkCell({value,onChange}){
  const[open,setOpen]=useState(false);
  const link=value||'';
  const href=safeURL(link);
  if(!link&&!open)return<button type="button" className="lk-add" onClick={()=>setOpen(true)}
    title={L('Bu egzersize bir video / referans linki ekle','Attach a video / reference link to this exercise')}>🔗 {L('Link ekle','Add link')}</button>;
  return(<div className="lk-row">
    <span className="lk-ic">🔗</span>
    <LiveInput value={link} autoFocus={!link} placeholder={L('https://…  (video / referans linki)','https://…  (video / reference link)')}
      onChange={onChange}/>
    {href&&<a className="lk-go" href={href} target="_blank" rel="noopener noreferrer" title={L('Linki aç','Open link')}>↗</a>}
    <button type="button" className="lk-x" title={L('Linki kaldır','Remove link')}
      onClick={()=>{onChange('');setOpen(false);}}>✕</button>
  </div>);
}
/* ---- One exercise on a calendar / template session ------------------------
   The same slot the individualization sheet uses: superset tag and group in front
   of the exercise, then what it trains and how, then the seven prescription fields
   in one strip, then the reference link and the coaching cues. The two screens are
   the same editor now — a coach who has learned one has learned the other. */
function CalSlotEdRaw({ex,tag,onChange,onMove,onRemove,first,last,phases}){
  useDescI18n(ex,onChange);
  const ss=(ex.superset||'').toUpperCase();
  const f=(k,v)=>onChange({...ex,[k]:v});
  const styles=exStylesFor(ex.pattern);
  const num=(lbl,k,opts,title,trLbl)=>(<label key={k}>{trLbl?L(trLbl,lbl):lbl}
    {opts?<SlotPick value={ex[k]} options={opts} onChange={v=>f(k,v)} title={title}/>
         :<LiveInput value={ex[k]||''} onChange={v=>f(k,v)} placeholder="—" title={title}/>}
  </label>);
  /* Tagging the pair here also teaches the library: the exercise carries it into the
     next program instead of being re-tagged there. Changing the pattern clears a style
     that belonged to the old one — "Horizontal" under Hip Dominant would be a tag
     nothing can read. */
  const setPattern=v=>{
    const keep=exStylesFor(v).includes(ex.plane)?ex.plane:'';
    const plane=keep||exGuessStyle(ex.name,v);
    onChange({...ex,pattern:v,plane});rememberExerciseTags(ex.name,v,plane);
  };
  const setPlane=v=>{onChange({...ex,plane:v});rememberExerciseTags(ex.name,ex.pattern,v);};
  /* Written the other way round — the pattern first, the exercise after — the execution
     is worked out once the name is there to read. */
  const nameTagged=nm=>{
    if(ex.plane)return;
    /* No pattern yet: the name says it (Dead Bug → Core · Anti-Extension). A pattern the
       coach set is never replaced — only its missing execution is filled. */
    const t=ex.pattern?{pattern:ex.pattern,plane:exGuessStyle(nm,ex.pattern)}:exResolveTags(nm,'','');
    if(!t.pattern||!t.plane)return;
    onChange({...ex,name:nm,pattern:t.pattern,plane:t.plane});rememberExerciseTags(nm,t.pattern,t.plane);
  };
  /* Typing a name the library already knows fills the row's image box from that entry,
     the same picture picking it off the list would have brought. Only when the box is
     empty and only on an exact name: a picture the coach put on THIS row is never
     replaced, and clearing one does not make it come back on the next keystroke. */
  const setName=v=>{
    const cur=String(ex.image||'').trim();
    if(cur){f('name',v);return;}
    const lo=String(v||'').trim().toLowerCase();
    const hit=lo?getLibItems().find(it=>(it.name||'').trim().toLowerCase()===lo):null;
    if(hit&&hit.image)onChange({...ex,name:v,image:hit.image});
    else f('name',v);
  };
  /* Pasting is tagging too: the exercise arrives with the pattern it trains, so the library
     learns it here exactly as it would if the coach had picked the pair by hand. */
  const exClip=useExerciseClipboard();
  const pasteEx=()=>{if(!exClip)return;onChange(slotFromExClipboard(ex,exClip));
    rememberExerciseTags(exClip.name,exClip.pattern||'',exClip.plane||'');};
  const empty=!String(ex.name||'').trim();
  /* ---- The alternative, on the back of this card ------------------------
     Written exactly like the exercise itself — same pattern pair, same seven numbers —
     plus the one thing the front has no room for: why the swap exists. Turning the card
     is a real turn: the face rotates out, the other rotates in, and only one of the two
     is ever mounted, so the card is always as tall as the side being read. */
  const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:null;
  const altName=String((alt&&alt.name)||'').trim();
  const hasAlt=!!(altName||String((alt&&alt.reason)||'').trim());
  const[face,setFace]=useState('front');
  const[anim,setAnim]=useState('');
  const turnT=useRef(null);
  useEffect(()=>()=>{if(turnT.current)clearTimeout(turnT.current);},[]);
  const turnTo=next=>{
    if(anim||next===face)return;
    setAnim('out');
    turnT.current=setTimeout(()=>{setFace(next);setAnim('in');
      turnT.current=setTimeout(()=>setAnim(''),220);},220);
  };
  const af=(k,v)=>onChange({...ex,alt:{...(alt||{}),[k]:v}});
  const altStyles=exStylesFor(alt&&alt.pattern);
  const setAltPattern=v=>{
    const keep=exStylesFor(v).includes(alt&&alt.plane)?alt.plane:'';
    const plane=keep||exGuessStyle((alt&&alt.name)||'',v);
    onChange({...ex,alt:{...(alt||{}),pattern:v,plane}});
    if(altName)rememberExerciseTags(altName,v,plane);
  };
  const anum=(lbl,k,opts,title,trLbl)=>(<label key={'a-'+k}>{trLbl?L(trLbl,lbl):lbl}
    {opts?<SlotPick value={alt&&alt[k]} options={opts} onChange={v=>af(k,v)} title={title}/>
         :<LiveInput value={(alt&&alt[k])||''} onChange={v=>af(k,v)} placeholder="—" title={title}/>}
  </label>);
  const clearAlt=()=>{
    if(hasAlt&&!confirm(L('Alternatif silinsin mi?','Delete this alternative?')))return;
    const{alt:_drop,...rest}=ex;onChange(rest);turnTo('front');
  };
  const front=(<>
    <div className="iv-slot-main">
      <span className={'iv-ss-tag'+(ss?' on':'')}>{tag}</span>
      <select className="iv-ss-sel" value={ss} onChange={e=>f('superset',e.target.value)} title={L('Süperset grubu','Superset group')}>
        <option value="">—</option>
        {SLOT_SS.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <div className="iv-slot-nm">
        {/* Picking a library exercise carries its program image, video link, cues and —
            when the entry has been tagged — its pattern / execution across. Typing a known
            name brings the image over on its own (setName above). */}
        <ExNameField value={ex.name} onChange={setName} tags={{pattern:ex.pattern,plane:ex.plane}}
          onNewName={nameTagged}
          onPick={it=>onChange({...ex,name:it.name,image:it.image||ex.image||'',
            link:it.link||ex.link||'',description:it.desc||ex.description||'',
            ...(exTagsFromLib(it,ex)||{})})}/>
      </div>
      <ExImgBtn image={ex.image||''} onChange={url=>{f('image',url||'');rememberExerciseImage(ex.name,url||'');}}/>
      <span className="iv-slotacts">
        <button type="button" onClick={()=>onMove(-1)} disabled={first} title={L('Yukarı taşı','Move up')}>↑</button>
        <button type="button" onClick={()=>onMove(1)} disabled={last} title={L('Aşağı taşı','Move down')}>↓</button>
        {/* Paste whatever the assistant coach put on the clipboard into THIS slot. Disabled
            until something is copied, so the button says whether there is anything to
            paste before it is pressed. */}
        <button type="button" className={'pst'+(exClip?' on':'')} disabled={!exClip} onClick={pasteEx}
          title={exClip?L(`Yapıştır: ${exClip.name||'egzersiz'}`,`Paste: ${exClip.name||'exercise'}`):L('Panoda egzersiz yok — Ass. Coach kutusundan Copy\'ye bas','Nothing on the clipboard — click Copy in the Assistant Coach box')}>⇩</button>
        <button type="button" className="del" onClick={onRemove} title={L('Bu egzersizi kaldır','Remove this exercise')}>✕</button>
      </span>
    </div>
    <div className="iv-slot-ed">
      {/* What this exercise trains and how it is executed — the pair the calendar's
          load distribution counts, and the one the printout now carries. */}
      <div className="iv-patrow" style={{'--pat-c':ML_PIE_COLS[ex.pattern]||'var(--border2)'}}>
        <label>{L('örüntü','pattern')}
          <select value={ex.pattern||''} onChange={e=>setPattern(e.target.value)} title={L('Bu egzersizin çalıştırdığı hareket örüntüsü','Movement pattern this exercise trains')}>
            <option value="">{L('— seçilmedi','— not set')}</option>
            {EX_PATTERNS.map(o=><option key={o} value={o}>{exLabel(o)}</option>)}
          </select>
        </label>
        <label>{L('uygulama','execution')}
          <select value={ex.plane||''} onChange={e=>setPlane(e.target.value)}
            disabled={!styles.length} title={styles.length?L('Örüntünün nasıl uygulandığı','How the pattern is executed'):L('Önce bir hareket örüntüsü seç','Pick a movement pattern first')}>
            <option value="">{styles.length?L('— seçilmedi','— not set'):'—'}</option>
            {styles.map(o=><option key={o} value={o}>{exLabel(o)}</option>)}
          </select>
        </label>
      </div>
      <div className="iv-numed">
        {num('sets','sets',SLOT_SETS,L('Set sayısı','Number of sets'),'set')}
        {num('reps','reps',SLOT_REPS,L('Tekrar sayısı','Number of reps'),'tekrar')}
        {num('time','duration',null,L('Çalışma süresi (ör. 30s)','Work time (e.g. 30s)'),'süre')}
        {num('tempo','tempo',null,L('Tempo (ör. 3-1-1)','Tempo (e.g. 3-1-1)'),'tempo')}
        {num('rpe','rpe',SLOT_RPES,L('Hedef RPE (4–10)','Target RPE (4–10)'),'rpe')}
        {num('load','load',null,L('Yük (kg, %1RM…)','Load (kg, %1RM…)'),'yük')}
        {num('rest','rest',null,L('Setler arası dinlenme','Rest between sets'),'dinlenme')}
      </div>
      <div className="iv-linkrow"><ExLinkCell value={ex.link||''} onChange={v=>f('link',v)}/></div>
      <div className="iv-noterow">
        <label>{L('açıklama','description')}<LiveInput value={exDesc(ex)} onChange={v=>f('description',v)}
          placeholder={L('Açıklama / koçluk ipuçları (opsiyonel)…','Description / coaching cues (optional)…')}/></label>
      </div>
      {/* The swap lives here, at the end of what is written about the exercise, because
          that is the moment a coach knows there needs to be one. Once written, the
          button says what the alternative is without turning the card over. */}
      <div className="ex-altrow">
        <button type="button" className={'ex-altbtn'+(hasAlt?' on':'')} onClick={()=>turnTo('back')}
          title={hasAlt?L('Alternatifi ve gerekçesini aç','Open the alternative and its reason')
                       :L('Bu egzersiz yapılamazsa yerine ne yapılacağını ve nedenini yaz','Write what is done instead of this exercise, and why')}>
          <i>⇄</i>{hasAlt
            ?<><span>{L('Alternatif:','Alternative:')}</span><b>{altName||L('(gerekçe yazıldı)','(reason only)')}</b></>
            :<span>{L('Alternatif ekle','Add alternative')}</span>}
        </button>
      </div>
    </div>
  </>);
  /* The back of the card: the same editor, written for the exercise that stands in. */
  const back=(<div className="ex-alt-face">
    <div className="ex-alt-hd">
      <span className="ex-alt-tag">⇄ {L('Alternatif','Alternative')}</span>
      <span className="ex-alt-for">{L('şunun yerine:','instead of:')} <b>{String(ex.name||'').trim()||L('(isimsiz egzersiz)','(unnamed exercise)')}</b></span>
      <span className="ex-alt-acts">
        {(hasAlt||(alt&&Object.keys(alt).length>0))&&<button type="button" className="ex-alt-clr" onClick={clearAlt}
          title={L('Alternatifi kaldır','Remove the alternative')}>✕ {L('Sil','Delete')}</button>}
        <button type="button" className="ex-alt-back" onClick={()=>turnTo('front')}
          title={L('Egzersize geri dön','Back to the exercise')}>↩ {L('Geri','Back')}</button>
      </span>
    </div>
    <div className="iv-slot-nm">
      <ExNameField value={(alt&&alt.name)||''} onChange={v=>af('name',v)}
        tags={{pattern:alt&&alt.pattern,plane:alt&&alt.plane}}
        onPick={it=>onChange({...ex,alt:{...(alt||{}),name:it.name,link:it.link||(alt&&alt.link)||'',
          description:it.desc||(alt&&alt.description)||'',...(exTagsFromLib(it,alt||{})||{})}})}/>
    </div>
    <div className="iv-slot-ed">
      <div className="iv-patrow" style={{'--pat-c':ML_PIE_COLS[alt&&alt.pattern]||'var(--border2)'}}>
        <label>{L('örüntü','pattern')}
          <select value={(alt&&alt.pattern)||''} onChange={e=>setAltPattern(e.target.value)}
            title={L('Alternatifin çalıştırdığı hareket örüntüsü','Movement pattern the alternative trains')}>
            <option value="">{L('— seçilmedi','— not set')}</option>
            {EX_PATTERNS.map(o=><option key={o} value={o}>{exLabel(o)}</option>)}
          </select>
        </label>
        <label>{L('uygulama','execution')}
          <select value={(alt&&alt.plane)||''} onChange={e=>af('plane',e.target.value)}
            disabled={!altStyles.length} title={altStyles.length?L('Örüntünün nasıl uygulandığı','How the pattern is executed'):L('Önce bir hareket örüntüsü seç','Pick a movement pattern first')}>
            <option value="">{altStyles.length?L('— seçilmedi','— not set'):'—'}</option>
            {altStyles.map(o=><option key={o} value={o}>{exLabel(o)}</option>)}
          </select>
        </label>
      </div>
      <div className="iv-numed">
        {anum('sets','sets',SLOT_SETS,L('Set sayısı','Number of sets'),'set')}
        {anum('reps','reps',SLOT_REPS,L('Tekrar sayısı','Number of reps'),'tekrar')}
        {anum('time','duration',null,L('Çalışma süresi (ör. 30s)','Work time (e.g. 30s)'),'süre')}
        {anum('tempo','tempo',null,L('Tempo (ör. 3-1-1)','Tempo (e.g. 3-1-1)'),'tempo')}
        {anum('rpe','rpe',SLOT_RPES,L('Hedef RPE (4–10)','Target RPE (4–10)'),'rpe')}
        {anum('load','load',null,L('Yük (kg, %1RM…)','Load (kg, %1RM…)'),'yük')}
        {anum('rest','rest',null,L('Setler arası dinlenme','Rest between sets'),'dinlenme')}
      </div>
      <div className="iv-linkrow"><ExLinkCell value={(alt&&alt.link)||''} onChange={v=>af('link',v)}/></div>
      <div className="iv-noterow">
        <label>{L('açıklama','description')}<LiveInput value={(alt&&alt.description)||''} onChange={v=>af('description',v)}
          placeholder={L('Açıklama / koçluk ipuçları (opsiyonel)…','Description / coaching cues (optional)…')}/></label>
      </div>
      <label className="ex-alt-why">{L('bu alternatif neden?','why this alternative?')}
        <LiveTextarea value={(alt&&alt.reason)||''} onChange={v=>af('reason',v)}
          placeholder={L('ör. Omuz ağrısı nedeniyle bar üstü baskı yerine nötr tutuş — aynı örüntü, ağrısız açı.','e.g. Shoulder pain, so a neutral-grip press instead of overhead — same pattern, pain-free angle.')}
          title={L('Bu gerekçe çıktıda alternatifin altında yazılır','This reason is printed under the alternative on the program')}/>
      </label>
    </div>
  </div>);
  return(<div className={'iv-slot'+(empty?' off':'')+(hasAlt?' has-alt':'')}>
    <div className={'exflip'+(anim?' '+anim:'')}>{face==='back'?back:front}</div>
  </div>);
}
/* Adding one exercise to a block used to re-render every OTHER exercise in it — a block of
   twenty rows is several hundred inputs, selects and auto-sizing textareas, and rebuilding
   all of them is the work that made the first seconds after "+ Add exercise" drop frames
   while the page was being scrolled. A row only depends on its own exercise, so it is
   memoised; BlockEd below hands it callbacks that keep their identity across renders,
   which is what lets the memo actually hold. */
const CalSlotEd=React.memo(CalSlotEdRaw);

/* =========================================================
   SESSION DETAILS — carried by every block
   =========================================================
   Who the session is for and what it is: the athlete picker, the session's name, its
   clock and length, the intensity it targets, and what it trains. These used to stand
   loose under the session heading, above the blocks. They ride inside each block now,
   because a block is where the coach is writing — adding one opens with the whole
   picture of the session it belongs to, rather than sending them back up the panel.

   The clock, the length, the intensity target and what the session trains belong to the
   session, so a change made in any block shows in all of them. Two things do NOT: the
   title and the participants. Those are the block's own — a session can run a guards'
   block and a forwards' block at once, each named for what it is and ticked for the
   players who do it — and they are handed in as `block` / `blockUpd` / `athUpd`. Without
   a block (the card a session with no blocks yet stands on) they fall back to the
   session's own name and participant list.
   The panel folds away per block, so a session made of several blocks does not repeat
   a full athlete grid down the whole panel. */
/* ---- Card colour, in the block's own header ----------------------------
   It stands where the assignment button used to (ticking names in the picker below IS
   the assignment, so the button had nothing left to do). Picking a swatch tints the
   whole header bar — the change is a CSS transition on background-color, so the bar
   fades into its new colour rather than snapping. The colour also becomes the session's
   card colour on the calendar, as it did from the strip it used to live in. */
/* The palette sits a shade deeper than it first did — the brighter set glared across a
   whole header bar. Cards saved with the earlier shades are read through CARD_COLOR_OLD,
   so they deepen with the palette (and still light up their swatch) without rewriting data. */
const CARD_COLORS=['#0070cc','#e0b020','#e04a3c','#16a34a','#ea580c','#9333ea','#0fb5cf','#db2777'];
const CARD_COLOR_OLD={'#0094ff':'#0070cc','#fcd34d':'#e0b020','#ff6b5b':'#e04a3c','#22c55e':'#16a34a',
  '#f97316':'#ea580c','#a855f7':'#9333ea','#22d3ee':'#0fb5cf','#ec4899':'#db2777'};
const cardCol=c=>c&&CARD_COLOR_OLD[String(c).toLowerCase()]||c;
function CardColorPick({value,onPick}){
  value=cardCol(value);
  return(<span className="blk-color">
    <span className="blk-color-l">{L('Kart Rengi','Card Color')}</span>
    {CARD_COLORS.map(c=><button key={c} type="button" className={'blk-sw'+(value===c?' on':'')} style={{background:c}}
      onClick={()=>onPick(c)} title={c}/>)}
    <input type="color" className="blk-sw-custom" value={value||CARD_COLORS[0]} onChange={e=>onPick(e.target.value)}
      title={L('Özel renk','Custom color')}/>
    <button type="button" className={'blk-sw-auto'+(value?'':' on')} onClick={()=>onPick('')}
      title={L('Varsayılan renge dön','Back to the default colour')}>{L('Otomatik','Auto')}</button>
  </span>);
}
/* The header's tint as the block's root carries it: `--blk-c` drives the bar's colour,
   and a light pick flips the bar's ink to dark so the title stays readable. */
const blkTint=c=>(c=cardCol(c))?{cls:' tinted'+(tmInk(c)==='#ffffff'?'':' lt'),style:{'--blk-c':c}}:{cls:'',style:undefined};
function SessionDetails({session,u,athletes,showPicker,isTemplate,coach,block,blockUpd,athUpd}){
  const[open,setOpen]=useState(true);
  return(<div className="blk-details">
    <button type="button" className={'blk-details-t'+(open?' on':'')} onClick={()=>setOpen(o=>!o)}
      title={open?L('Antrenman özelliklerini gizle','Hide the training details'):L('Antrenman özelliklerini göster','Show the training details')}>
      <i>{open?'▼':'▶'}</i>{L('Antrenman Özellikleri','Training Details')}
    </button>
    {open&&<div className="blk-details-b">
      {showPicker&&<AthletePicker athletes={athletes}
        selected={block?blkAthIds(session,block):(session.athletes||[])}
        onChange={ids=>{if(block&&athUpd)athUpd(ids);else u({athletes:ids});}}/>}
      {/* What the block IS, written as two cards rather than one strip of loose boxes.
          The left card is everything a coach fills in — the block's name, when it runs,
          how long, what it trains and how it is trained; each field wears its caption
          beside it, so the card reads as a form instead of a row of unlabelled boxes.
          The right card is the one thing that is not filled in but SET: the intensity
          the session is planned at, which is a scale to be dragged and needs the room
          to be one. (The target is not the actual / logged sRPE further down, which only
          exists once the session has happened.) */}
      <div className="sess-cards">
        <section className="sess-card">
          <header className="sess-card-h">
            <span className="sess-card-ic basics"><TIc k="grid" size={19}/></span>
            <div className="sess-card-ht">
              <b>{L('Temel Bilgiler','Basic Details')}</b>
              <span>{L('Antrenman bloğunun temel ayarlarını yapın.','Set this training block up.')}</span>
            </div>
          </header>
          <div className="sess-card-b sess-form">
            {/* NO TITLE BOX HERE. The heading directly above this card is the title —
                a block's heading names the block, and a session with no block yet is
                named on its own heading. A second box inside the form asked for the
                same name twice, on the same screen, one of them unlabelled. */}
            {!isTemplate&&<label className="sf-row">
              <span className="sf-l">{L('Saat','Time')}</span>
              <input className="sf-in mono" type="time" value={session.time} onChange={e=>u({time:e.target.value})}/>
            </label>}
            <label className="sf-row">
              <span className="sf-l">{L('Süre','Duration')}</span>
              {/* Emptying the box has to leave it empty. Coercing a blank field back to 0
                  on every keystroke pinned a 0 in front of the caret that could not be
                  deleted — you could only type to the right of it. So '' is kept as its
                  own value (as the drawer's duration box already does) and only read as
                  0 where a number is needed. */}
              <span className="sf-unit">
                <input className="sf-in mono" type="number" min="0" value={session.duration??''} title={L('Süre (dk)','Duration (min)')}
                  onChange={e=>{const raw=e.target.value.replace(/^0+(?=\d)/,'');if(raw!==e.target.value)e.target.value=raw;const d=raw===''?'':Math.max(0,Number(raw));const upd={duration:d};if(!session.auManual&&session.sRPE!=='')upd.au=Math.round(Number(session.sRPE)*(Number(d)||0));u(upd);}}/>
                <i>{L('dk','min')}</i>
              </span>
            </label>
            {/* One field, two stages — the focus, then the capacity inside it. HOW the
                session is trained is not asked here: that is Training Method below,
                which has asked it all along. `purpose` keeps carrying the answer as
                text: it is the legacy single-value field the printout and older saved
                sessions still read. */}
            <div className="sf-row">
              <span className="sf-l">{L('Seans Odağı','Session Focus')}</span>
              <div className="sf-in-wrap">
                <FocusSelect value={sesFocus(session)} sub={sesSubFocus(session)}
                  onChange={arr=>u({focus:arr,purpose:[...arr,...sesSubFocus(session)].join(', ')})}
                  onSubChange={arr=>u({sub:arr,purpose:[...sesFocus(session),...arr].join(', ')})}/>
              </div>
            </div>
            <div className="sf-row">
              <span className="sf-l">{L('Hedef Bölge','Target Region')}</span>
              <select className="sf-in" value={sesRegion(session)} onChange={e=>u({region:e.target.value})}>
                <option value="">{L('Bölge seç…','Select region…')}</option>
                {SESSION_REGIONS.map(r=><option key={r} value={r}>{exLabel(r)}</option>)}
              </select>
            </div>
            {/* Training method keeps a row of its own — the list it opens is the longest
                of the three. */}
            <div className="sf-row wide">
              <span className="sf-l">{L('Antrenman Metodu','Training Method')}</span>
              <div className="sf-in-wrap iv-mrow">
                <MethodSelect value={sesMethods(session)} onChange={arr=>u({methods:arr})}/>
              </div>
            </div>
          </div>
        </section>
        <section className="sess-card">
          <header className="sess-card-h">
            <span className="sess-card-ic rpe"><TIc k="target" size={19}/></span>
            <div className="sess-card-ht">
              <b>{L('Hedef Yoğunluk (RPE)','Target Intensity (RPE)')}</b>
              <span>{L('Bu blok için hedef RPE aralığını belirleyin.','Set the target RPE band for this block.')}</span>
            </div>
            {/* The band the target lands in, named at the head of the card rather than
                beside the number — the card IS the intensity, so its heading can say
                how hard it is. */}
            {(()=>{const z=rpeZone(sesRpeTarget(session));
              return<span className="sess-zone" style={{color:z.c,background:z.soft,borderColor:z.ring}}>{L(z.tr,z.en)}</span>;})()}
          </header>
          <div className="sess-card-b">
            <RpeGauge value={session.rpeTarget} onChange={v=>u({rpeTarget:v})} hideZone/>
            <div className="sess-note-i">
              <span className="ic"><TIc k="info" size={16}/></span>
              <div><b>{L('Bilgi','What this is')}</b>
                <p>{L('Hedef RPE aralığı, antrenmanın beklenen yoğunluk seviyesini belirtir. Sporcuların antrenman sonrası vereceği sRPE değerleriyle karşılaştırılır.',
                  'The target RPE band states the intensity this training is planned at. It is read against the sRPE the athletes give after the session.')}</p></div>
            </div>
          </div>
        </section>
      </div>
    </div>}
  </div>);
}
