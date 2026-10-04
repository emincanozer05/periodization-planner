function ExerciseModal({ex,onChange,onDelete,onClose,customMuscles,onRememberMuscle,onForgetMuscle}){
  const set=(k,v)=>onChange({[k]:v});
  /* A court drill and a lift are catalogued by different things, so the card asks
     different questions: the drill wants its diagram, how many players it is run with and
     what it teaches; the lift wants its pattern, its muscles and its difficulty. */
  const ball=exLib(ex)==='ball';
  const TYPES=ball?BALL_TYPES:EX_TYPES;
  const SUBS=ball?BALL_SUB_TYPES:SUB_TYPES;
  const[upPct,setUpPct]=useState(null);
  const[editing,setEditing]=useState(!ex.name);
  /* The court's tool rail belongs beside the clip, not on top of the floor it draws on:
     the left column holds the slot, the board keeps the right. State rather than a plain
     ref, so mounting the slot re-renders the editor that paints into it. */
  const[courtBar,setCourtBar]=useState(null);
  /* The notes box ends level with the bottom of the clip beside it. Measured rather than
     guessed: the clip is 16:9 of a column whose width is the modal's, so no fixed height
     lines the two up at every width. Falls back to its own minimum if nothing is there
     to measure against. */
  const playerRef=useRef(null);
  const notesRef=useRef(null);
  const[notesH,setNotesH]=useState(0);
  useLayoutEffect(()=>{
    const measure=()=>{
      const pl=playerRef.current,ta=notesRef.current;
      if(!pl||!ta){setNotesH(0);return;}
      const h=Math.round(pl.getBoundingClientRect().bottom-ta.getBoundingClientRect().top);
      // Stacked into one column (narrow screens), the clip ends above the notes start and
      // there is nothing to line up with: the box keeps its own height there.
      if(h<160){setNotesH(0);return;}
      // Same height back means nothing to do — writing it again would have the observer
      // wake this up for ever.
      setNotesH(o=>Math.abs(o-h)<=1?o:h);
    };
    measure();
    const pl=playerRef.current;
    const ro=(typeof ResizeObserver==='function'&&pl)?new ResizeObserver(measure):null;
    if(ro)ro.observe(pl);
    window.addEventListener('resize',measure);
    return()=>{ro&&ro.disconnect();window.removeEventListener('resize',measure);};
  },[editing,ball,ex.type,ex.image,ex.videoData,ex.videoUrl]);
  const shownName=useExerciseText(ex.name);
  const shownPurpose=useExerciseText(ex.purpose);
  const _vEmbed=videoEmbed(ex.videoData||ex.videoUrl);
  const onVideoFile=async file=>{
    if(!file)return;
    const mb=file.size/1048576;
    const fb=(typeof FB==='function')?FB():null;
    const loggedIn=fb&&fb.auth&&fb.auth().currentUser;
    if(loggedIn){
      if(mb>200){alert(L('Video çok büyük ('+mb.toFixed(0)+' MB). 200 MB altı bir dosya seç ya da YouTube linki kullan.','Video is too large ('+mb.toFixed(0)+' MB). Pick a file under 200 MB or use a YouTube link.'));return;}
      try{setUpPct(0);const url=await uploadMedia(file,'videos',p=>setUpPct(p),file.name);onChange({videoUrl:url,videoData:''});}
      catch(e){alert(L('Video yüklenemedi: ','Video upload failed: ')+(e.message||e));}
      finally{setUpPct(null);}
      return;
    }
    if(mb>25){alert(L('Bulut yüklemesi için giriş yap. Çevrimdışı sınır: 25 MB. Daha büyük videoda YouTube linki kullan.','Sign in for cloud upload. Offline limit: 25 MB. Use a YouTube link for a larger video.'));return;}
    if(mb>5&&!window.confirm(L('Video ~'+mb.toFixed(1)+' MB. Giriş yapmadan yüklersen cihaz hafızasını zorlar; giriş yapıp buluta yüklemen önerilir. Yine de yüklensin mi?','Video is ~'+mb.toFixed(1)+' MB. Uploading without signing in strains device storage; signing in and uploading to the cloud is recommended. Upload anyway?')))return;
    /* Cihazda saklanır ve duruma sadece tutamağı yazılır — bir video base64 olarak
       senkronlanan JSON'a girseydi her düzenlemede baştan gönderilirdi. */
    const r=new FileReader();
    r.onload=async e=>{
      try{set('videoData',await saveLocalMedia(e.target.result));}
      catch(err){console.warn('local media store unavailable → inline fallback',err);set('videoData',e.target.result);}
    };
    r.readAsDataURL(file);
  };
  /* A still or a GIF, for the exercises that are demonstrated by a loop rather than a clip.
     A GIF is uploaded byte for byte — the resize path draws it onto a canvas, which would
     hand back a single frame and quietly kill the animation. */
  const onImageFile=async file=>{
    if(!file)return;
    const isGif=/gif/i.test(file.type)||/\.gif$/i.test(file.name||'');
    if(!isGif){handleImageUpload(file,'eximg',url=>set('image',url),p=>setUpPct(p));return;}
    const mb=file.size/1048576;
    if(mb>25){alert(L('GIF çok büyük ('+mb.toFixed(0)+' MB). 25 MB altı bir dosya seç.','GIF is too large ('+mb.toFixed(0)+' MB). Pick a file under 25 MB.'));return;}
    const fb=(typeof FB==='function')?FB():null;
    if(fb&&fb.auth&&fb.auth().currentUser){
      try{setUpPct(0);const url=await uploadMedia(file,'eximg',pc=>setUpPct(pc),file.name);set('image',url);return;}
      catch(e){warnStorageFailure(e);}
      finally{setUpPct(null);}
    }
    const r=new FileReader();
    r.onload=async e=>{
      try{set('image',await saveLocalMedia(e.target.result));}
      catch(err){console.warn('local media store unavailable → inline fallback',err);set('image',e.target.result);}
    };
    r.readAsDataURL(file);
  };
  /* Paste Image / GIF: whatever image is on the clipboard is uploaded at once, through the
     same path as a picked file. Right-click on the button still opens the file picker. */
  const imgFileRef=useRef(null);
  const pasteExImage=async()=>{
    if(!navigator.clipboard||!navigator.clipboard.read){
      alert(L('Bu tarayıcı panodan okumaya izin vermiyor. Görseli kopyala, aşağıdaki kutuya tıkla ve Ctrl/Cmd+V yap.','This browser does not allow reading the clipboard. Copy the image, click the box below and press Ctrl/Cmd+V.'));return;}
    try{
      const items=await navigator.clipboard.read();
      for(const it of items){
        const type=it.types.find(t=>t.startsWith('image/'));
        if(!type)continue;
        const blob=await it.getType(type);
        const ext=(type.split('/')[1]||'png').replace(/[^a-z0-9]/gi,'')||'png';
        onImageFile(new File([blob],'pasted.'+ext,{type}));
        return;
      }
      alert(L('Panoda görsel yok. Önce bir görsel kopyala, sonra Yapıştır\'a bas.','No image on the clipboard. Copy an image first, then press Paste.'));
    }catch(e){
      alert(L('Pano okunamadı. Bu site için pano iznini aç ya da görseli kopyalayıp aşağıdaki kutuda Ctrl/Cmd+V yap.','The clipboard could not be read. Allow clipboard access for this site, or copy the image and press Ctrl/Cmd+V over the box below.'));
    }
  };
  // Removing the picture removes it everywhere it lives on the entry (see exPicture).
  const clearExImage=()=>onChange({image:'',planImage:'',thumb:''});
  const metaLbl={fontSize:10,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4,display:'block'};
  const metaBox=(label,value,extra)=>value?(<div style={{background:'var(--elevated)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 13px'}}>
    <span style={metaLbl}>{label}</span>
    <div style={{fontSize:13,fontWeight:600,color:'var(--text)',display:'flex',alignItems:'center',gap:6}}>{value}{extra}</div>
  </div>):null;
  /* The program-row picture had a paste slot here. A picture written onto a program row
     is chosen on the row, where the coach can see the box it lands in, so the slot on this
     page was a second place to set the same thing — `thumb`/`planImage` are still read
     when the exercise is written into a session. */
  const viewRight=(
    <div className="ex-modal-right">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {/* At a glance the coach needs what to set up and how hard it is; the filing
            (type, sub-type, action, pattern…) is on the edit side. A drill keeps its
            type and player count, which is how a drill is read. */}
        {ball&&metaBox(L('Dril Tipi','Drill Type'),exLabel(ex.type))}
        {ball&&SUBS[ex.type]&&metaBox(exLabel(SUBS[ex.type].label),ex.subType?exLabel(ex.subType):'—')}
        {ball&&metaBox(L('Oyuncu','Players'),ex.players)}
        {!ball&&(EX_EXTRA_FILTERS[ex.type]||[]).some(d=>d.key==='equipment')
          &&metaBox(exLabel('Equipment'),exMulti(ex.equipment).map(exLabel).join(', ')||'—')}
        {metaBox(L('Zorluk','Difficulty'),exLabel(ex.difficulty),ex.difficulty&&<span style={{width:8,height:8,borderRadius:'50%',background:DIFF_COLOR[ex.difficulty]||'var(--dim)',display:'inline-block'}}/>)}
      </div>
      {ball&&!sceneIsEmpty(ex.court)&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Saha Çizimi','Court Diagram')}</span>
        <div className="bp-modal-court"><CourtView scene={ex.court}/></div>
      </div>}
      {exContraOf(ex).length>0&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Kontrendikasyon Uyarısı','Contraindication Warning')}
          <span className="info-tip" tabIndex={0} aria-label={L('Kontrendikasyon nedir?','What is a contraindication?')}>?
            <span className="info-tip-box" role="tooltip">{L('Bu egzersizin, belirtilen bölgede sakatlığı veya ağrısı olan sporcular için uygun olmayabileceğini gösterir. Sporcuda bu sorun varsa egzersizi yapmaması ya da değiştirmesi önerilir.','Indicates this exercise may be unsuitable for athletes with an injury or pain in the listed area. If the athlete has this issue, skip or modify the exercise.')}</span>
          </span>
        </span>
        <div className="iv-chips">{exContraOf(ex).map(id=><span key={id} className="iv-chip on">{ctLabelIn(id,REPORT_LANG==='tr')}</span>)}</div>
      </div>}
      {(ex.muscle||[]).length>0&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Kas Grupları','Muscle Groups')}</span>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {(ex.muscle||[]).map((m,i)=><span key={i} className="mus-chip">{exLabel(m)}</span>)}
        </div>
      </div>}
      {ex.purpose&&<div>
        <span style={metaLbl}>{L('Amaç / Açıklama','Purpose / Description')}</span>
        <div className="ex-purpose-view" style={{color:'var(--text2)',whiteSpace:'pre-wrap'}}>{shownPurpose}</div>
      </div>}
      {!ex.type&&!ex.purpose&&!(ex.muscle||[]).length&&<div className="empty-st" style={{padding:'24px 0'}}>{L('Henüz detay yok — egzersiz bilgisi eklemek için Düzenle\'ye tıkla.','No details yet — click Edit to add exercise info.')}</div>}
    </div>
  );
  const editRight=(
    <div className="ex-modal-right">
      {/* One grid for every field, so an optional field that is absent (no action, no
          movement pattern) closes up instead of leaving an empty cell in the middle. */}
      <div className="grid cols-2">
        <div><label>{ball?L('Dril Tipi','Drill Type'):L('Egzersiz Tipi','Exercise Type')}</label>
          <select value={ex.type||''} onChange={e=>{const v=e.target.value;
            /* The category's own extra fields go with it: an Equipment set on a push is
               not carried onto a Core entry, where there is no filter to find it by. */
            const keep=new Set((EX_EXTRA_FILTERS[v]||[]).map(d=>d.key));
            const drop={};EX_EXTRA_KEYS.forEach(k=>{if(!keep.has(k)&&ex[k])drop[k]='';});
            onChange({type:v,subType:'',...(ACTIONS_FOR[v]?{}:{action:''}),...drop});}}>
            <option value="">—</option>
            {TYPES.map(t=><option key={t} value={t}>{exLabel(t)}</option>)}
          </select>
        </div>
        <div><label>{SUBS[ex.type]?exLabel(SUBS[ex.type].label):L('Alt Tip','Sub Type')}</label>
          <select value={ex.subType||''} onChange={e=>set('subType',e.target.value)} disabled={!SUBS[ex.type]}>
            <option value="">{SUBS[ex.type]?'—':L('Önce tip seç','Select type first')}</option>
            {(SUBS[ex.type]?.values||[]).map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>
        {!ball&&ACTIONS_FOR[ex.type]&&<div><label>{exLabel('Action')}</label>
          <select value={ex.action||''} onChange={e=>set('action',e.target.value)}>
            <option value="">—</option>
            {ACTIONS_FOR[ex.type].map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>}
        {!ball&&(EX_EXTRA_FILTERS[ex.type]||[]).map(d=>d.multi?<div key={d.key}><label>{exLabel(d.label)}</label>
          <div className="mus-pick">
            {exMulti(ex[d.key]).map(v=><span key={v} className="mus-chip on">{exLabel(v)}<button type="button" onClick={()=>set(d.key,exMulti(ex[d.key]).filter(x=>x!==v))}>✕</button></span>)}
            <select value="" onChange={e=>{const v=e.target.value;const list=exMulti(ex[d.key]);if(v&&!list.includes(v))set(d.key,[...list,v]);}}>
              <option value="">{exMulti(ex[d.key]).length?L('+ Ekle…','+ Add…'):'—'}</option>
              {d.values.filter(v=>!exMulti(ex[d.key]).includes(v)).map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
            </select>
          </div>
        </div>:<div key={d.key}><label>{exLabel(d.label)}</label>
          <select value={ex[d.key]||''} onChange={e=>set(d.key,e.target.value)}>
            <option value="">—</option>
            {d.values.map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>)}
        {ball
          ?<div><label>{L('Oyuncu Sayısı','Players')}</label>
            <input value={ex.players||''} onChange={e=>set('players',e.target.value)} placeholder={L('ör. 3v3, 5 oyuncu','e.g. 3v3, 5 players')}/></div>
          :PATTERNS_FOR[ex.type]?<div><label>{L('Hareket Örüntüsü','Movement Pattern')}</label>
            <select value={ex.pattern||''} onChange={e=>set('pattern',e.target.value)}>
              <option value="">—</option>
              {PATTERNS_FOR[ex.type].map(p=><option key={p} value={p}>{exLabel(p)}</option>)}
            </select></div>:null}
        <div><label>{L('Zorluk','Difficulty')}</label>
          <select value={ex.difficulty||''} onChange={e=>set('difficulty',e.target.value)}>
            <option value="">—</option>
            {DIFFICULTIES.map(d=><option key={d} value={d}>{exLabel(d)}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginTop:14}}>
        <label>{L('Amaç / Açıklama','Purpose / Description')}</label>
        <textarea ref={notesRef} className="ex-purpose" value={ex.purpose} onChange={e=>set('purpose',e.target.value)}
          placeholder={ball?L('Kurallar, ilerlemeler, koçluk noktaları, skorlama…','Rules, progressions, coaching points, scoring…')
                           :L('Hangi kaslar, hangi amaç? İpuçları, set/tekrar önerileri…','Which muscles, what goal? Cues, set/rep suggestions…')}
          style={notesH?{height:notesH,minHeight:120}:{minHeight:200}}/>
      </div>
      {!ball&&<div style={{marginTop:14}}><label>{L('Kas Grupları (çoklu)','Muscle Groups (multi)')}</label>
        <div className="mus-pick">
          {(ex.muscle||[]).map((m,i)=><span key={i} className="mus-chip on">{exLabel(m)}<button type="button" onClick={()=>set('muscle',(ex.muscle||[]).filter((_,j)=>j!==i))}>✕</button></span>)}
          <MusclePicker value={ex.muscle||[]} onAdd={v=>{const list=ex.muscle||[];if(!list.includes(v))set('muscle',[...list,v]);}}
            custom={customMuscles} onRemember={onRememberMuscle} onForget={onForgetMuscle}/>
        </div>
      </div>}
      {/* The pain regions this exercise is not given with — the same regions the athlete's
          pain and injury records use. Written into the library file for the AI project. */}
      {!ball&&<div style={{marginTop:14}}><label>{L('Kontrendikasyon — bu bölgede ağrı / sakatlık varsa verilmez','Contraindication — not given with pain or injury in this region')}</label>
        <div className="iv-chips">
          {CONSTRAINT_TAGS.map(tg=>{const cur=exContraOf(ex),on=cur.includes(tg.id);
            return<button key={tg.id} type="button" className={'iv-chip'+(on?' on':'')} aria-pressed={on}
              onClick={()=>set('contra',on?cur.filter(x=>x!==tg.id):[...cur,tg.id])}>{ctLabelIn(tg.id,REPORT_LANG==='tr')}</button>;})}
        </div>
      </div>}
    </div>
  );
  return(<div className="modal-bg" onClick={onClose}>
    <div className="modal ex-modal ex-modal-wide" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        {editing
          ?<input className="ex-title-in" value={ex.name} placeholder={L('Egzersiz adı…','Exercise name…')} onChange={e=>set('name',e.target.value)}/>
          :<div style={{flex:1,fontWeight:700,fontSize:17,color:'var(--text)',padding:'6px 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shownName||'—'}</div>
        }
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ex-modal-body ex-modal-grid">
        <div className="ex-modal-left">
          <div ref={playerRef} className={`ex-player-wrap${_vEmbed&&_vEmbed.ig?' ig':''}`}><VideoPlayer ex={ex}/></div>
          {editing&&<div className="row" style={{marginTop:12,gap:10,flexWrap:'wrap'}}>
            <label className="btn sec sm" style={{cursor:'pointer',margin:0}}>📹 {L('Video Yükle','Upload Video')}
              <input type="file" accept="video/*" style={{display:'none'}} onChange={e=>onVideoFile(e.target.files[0])}/>
            </label>
            {/* The exercise's picture — the library card's cover and the PDF's image. A
                copied picture is pasted and uploaded in one click; right-click picks a file. */}
            {/* A label, like Upload Video beside it, so the two read as one row of buttons. */}
            <label role="button" tabIndex={0} className="btn sec sm" style={{cursor:'pointer',margin:0}} onClick={pasteExImage}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pasteExImage();}}}
              onContextMenu={e=>{e.preventDefault();imgFileRef.current&&imgFileRef.current.click();}}
              title={L('Kopyalanan görseli yapıştır · Sağ tık: dosya seç','Paste the copied image · Right-click: choose a file')}>
              🖼 {L('Görsel / GIF Yapıştır','Paste Image / GIF')}</label>
            <input ref={imgFileRef} type="file" accept="image/*,.gif" style={{display:'none'}} onChange={e=>{onImageFile(e.target.files[0]);e.target.value='';}}/>
            {/* The pasted link is a third way of filling the same frame, so it stands with the
                two buttons that fill it rather than halfway down the other column. */}
            <input className="ex-vlink" value={ex.videoUrl} onChange={e=>set('videoUrl',e.target.value)}
              placeholder={L('…ya da link yapıştır (YouTube / Vimeo / mp4)','…or paste a link (YouTube / Vimeo / mp4)')}/>
            {ex.videoData&&<button className="btn ghost xs" onClick={()=>set('videoData','')}>{L('Videoyu kaldır','Remove video')}</button>}
          </div>}
          {/* The picture, small, only while editing — the open entry shows the clip. */}
          {editing&&(()=>{const pic=exPicture(ex);const has=hasMedia(pic);
            return<div className="ex-pic">
              <div className={`ex-pic-box${has?'':' empty'}`} tabIndex={0}
                onPaste={e=>{const f=imageFileFromPaste(e);if(f){e.preventDefault();onImageFile(f);}}}
                onClick={has?undefined:pasteExImage}
                title={L('Ctrl/Cmd+V ile de yapıştırabilirsin','You can also paste with Ctrl/Cmd+V')}>
                {has?<><img src={mediaSrc(pic)} alt=""/>
                  <button type="button" className="ex-pic-x" title={L('Görseli kaldır','Remove image')} onClick={clearExImage}>×</button></>
                  :L('Görsel yok — kopyaladığın görseli yapıştır','No image — paste a copied image')}
              </div>
              <div className="help" style={{margin:0}}>{L('Bu görsel kütüphane kartında ve PDF\'te görünür.','This image is shown on the library card and in the PDF.')}</div>
            </div>;})()}
          {upPct!=null&&<div className="help" style={{marginTop:6}}>{L('Yükleniyor… ','Uploading… ')}{upPct}%</div>}
        </div>
        {editing?editRight:viewRight}
        {/* The court's tools get their own full-width row above the floor, so the board
            below is nothing but board and the rail is read left to right instead of being
            folded into a column beside the clip. Only mounted while editing a drill —
            there is nothing to draw with otherwise. */}
        {editing&&ball&&<div className="ct-bar-slot">
          <span className="ct-bar-slot-lbl">{L('Çizim Araçları','Drawing Tools')}</span>
          <div ref={setCourtBar}/>
        </div>}
        {/* The floor gets the modal's whole width, under both columns. Sharing a column with
            the fields made a full court widen that column, and the clip on the left shrank
            to pay for it — the board is the one thing here whose width is not the coach's
            choice. Its rail stays over on the left, so this row is nothing but board. */}
        {editing&&ball&&<div className="ex-modal-court">
          <label>{L('Saha Çizimi','Court Diagram')}</label>
          <CourtEditor value={ex.court} onChange={sc=>set('court',sc)} barSlot={courtBar}/>
        </div>}
      </div>
      <div className="modal-foot">
        {editing
          ?<><button className="btn danger sm" onClick={onDelete}>{L('Sil','Delete')}</button><button className="btn sm" onClick={()=>setEditing(false)}>{L('Bitti','Done')}</button></>
          :<><button className="btn sec sm" onClick={()=>setEditing(true)}>✎ {L('Düzenle','Edit')}</button><button className="btn sm" onClick={onClose}>{L('Kapat','Close')}</button></>
        }
      </div>
    </div>
  </div>);
}

function ExerciseCardRaw({ex,onOpen,used=0}){
  const v=videoEmbed(ex.videoData||ex.videoUrl);
  const shownName=useExerciseText(ex.name);
  const[hov,setHov]=useState(false);
  const[igImg,setIgImg]=useState('');
  /* The card's picture is the one the coach put on the exercise — the same one the
     library PDF prints — and only without one does the video's auto-thumbnail (or an
     Instagram reel's og:image) stand in. Hovering still plays the clip. */
  const pic=exPicture(ex);
  const cover=(hasMedia(pic)?pic:'')||videoThumb(ex.videoData||ex.videoUrl)||igImg;
  // Instagram reels have no auto thumbnail → fetch the og:image once
  useEffect(()=>{
    if(!v||!v.ig){setIgImg('');return;}
    let alive=true;(async()=>{const img=await fetchOgImage(ex.videoData||ex.videoUrl);if(alive&&img)setIgImg(img);})();
    return()=>{alive=false;};
  },[ex.videoUrl,ex.videoData]);
  // Add autoplay+mute params to YouTube/Vimeo URLs so the preview plays silently on hover
  const previewSrc=v&&v.kind==='iframe'?(v.src+(v.src.indexOf('?')>=0?'&':'?')+'autoplay=1&mute=1&muted=1&controls=0&playsinline=1&loop=1&modestbranding=1'):null;
  return(<div className="ex-card" onClick={()=>onOpen(ex.id)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
    <div className="ex-thumb">
      {hov&&v?(v.kind==='file'
        ? <video className="ex-thumb-vid" src={v.src} autoPlay muted loop playsInline/>
        : <iframe className="ex-thumb-vid" src={previewSrc} title={L('önizleme','preview')} allow="autoplay; encrypted-media" frameBorder="0"/>
      ):(
        cover ? <img src={mediaSrc(cover)} alt="" onError={e=>{e.target.style.display='none';}}/>
        : (v&&v.kind==='file') ? <video className="ex-thumb-vid" src={v.src+'#t=0.1'} muted preload="metadata" playsInline/>
        /* A drill with no clip is recognised by its diagram, not by a placeholder — the
           court IS the thumbnail, which is how a coach picks one off a shelf. */
        : !sceneIsEmpty(ex.court) ? <CourtView scene={ex.court} className="bp-card-court"/>
        : <div className="ex-thumb-ph">{exLib(ex)==='ball'?'🏀':'🏋'}</div>
      )}
      {v&&!hov&&<span className="ex-vbadge">▶</span>}
      {used>0&&<span className="ex-used" title={L(`Sezon programında ${used} kez kullanıldı`,`Used ${used}× in the season program`)}>{L(`${used}× kullanıldı`,`${used}× used`)}</span>}
    </div>
    <div className="ex-cbody">
      <div className="ex-cname">{shownName||L('(isimsiz egzersiz)','(unnamed exercise)')}</div>
      {ex.difficulty&&<div className="diff-badge" style={{background:DIFF_COLOR[ex.difficulty],color:'#fff'}}>{exLabel(ex.difficulty)}</div>}
    </div>
  </div>);
}
/* A shelf holds hundreds of cards, and each one reads a video embed, resolves a picture and
   may draw a whole court diagram. Every keystroke in the open exercise's panel rewrites the
   state, which re-rendered all of them — the freeze felt while writing an exercise. Patching
   one entry leaves every other entry the same object, so the cards that did not change now
   stand still. `onOpen` takes the id rather than closing over it: a fresh closure per card
   per render would have made the comparison below always fail. */
const ExerciseCard=React.memo(ExerciseCardRaw);

/* Which shelf an entry sits on. Court work and weight-room work are catalogued by
   different things — a drill is filed by what it teaches, a lift by what it loads — so
   they get two shelves rather than one list with a filter on it. An entry saved before
   ball practice existed has no `lib` and is S&C, which is what it was. */
const exLib=e=>(e&&e.lib==='ball')?'ball':'sc';
/* One library filter as a dropdown: a compact button carrying the filter's name and the
   value picked, opening the values as a list. A row of these fits every filter of a
   category on one line, where a track of every value ran off the screen. */
function FilterDD({label,values,value,onChange}){
  const[open,setOpen]=useState(false);
  const[right,setRight]=useState(false);
  const ref=useRef(null),menuRef=useRef(null);
  useDDOutside([ref],open,()=>setOpen(false));
  /* A list opened near the right edge of the screen hangs leftward instead of off it. */
  useLayoutEffect(()=>{
    if(!open){setRight(false);return;}
    const m=menuRef.current;
    if(m&&m.getBoundingClientRect().right>window.innerWidth-8)setRight(true);
  },[open]);
  const pick=v=>{onChange(v);setOpen(false);};
  return(<div className={'exf'+(value?' on':'')+(open?' open':'')} ref={ref}>
    <button type="button" className="exf-btn" onClick={()=>setOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={open}>
      <span className="exf-k">{label}</span>
      <span className="exf-v">{value?exLabel(value):L('Tümü','All')}</span>
      <span className="exf-car" aria-hidden="true">▾</span>
    </button>
    {open&&<div className={'exf-menu'+(right?' right':'')} ref={menuRef} role="listbox" aria-label={label}>
      {['',...values].map(v=><button key={v||'__all'} type="button" role="option" aria-selected={value===v}
        className={'exf-opt'+(value===v?' on':'')} onClick={()=>pick(v)}>
        {v?exLabel(v):L('Tümü','All')}{value===v?<b>✓</b>:null}</button>)}
    </div>}
  </div>);
}
/* The level picker beside the filters: "All" and the three levels, each in its colour. */
function LevelSeg({value,onChange}){
  return(<div className="exf-lvl" role="radiogroup" aria-label={L('Seviye','Level')}>
    <span className="exf-lvl-k">{L('Seviye','Level')}</span>
    <button type="button" role="radio" aria-checked={!value} className={'all'+(!value?' on':'')} onClick={()=>onChange('')}>
      {L('Tümü','All')}</button>
    {DIFFICULTIES.map(d=><button key={d} type="button" role="radio" aria-checked={value===d}
      className={value===d?'on':''} style={{'--lc':DIFF_COLOR[d]}} onClick={()=>onChange(value===d?'':d)}
      title={exLabel(d)}><i/>{d.replace(/\D+/g,'')}</button>)}
  </div>);
}
/* The library's one download button: the format is picked from its menu, so the toolbar
   carries a single button rather than one per format. Closes on a pick, on a click
   outside it and on Escape. */
function LibDownloadMenu({disabled,busy,items}){
  const[open,setOpen]=useState(false);
  const boxRef=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const onDown=e=>{if(boxRef.current&&!boxRef.current.contains(e.target))setOpen(false);};
    const onKey=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',onDown);
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
  },[open]);
  return(<div className="lib-dl" ref={boxRef}>
    <button type="button" className="btn sm" disabled={disabled||busy} aria-haspopup="menu" aria-expanded={open}
      onClick={()=>setOpen(o=>!o)}>
      {busy?L('Hazırlanıyor…','Preparing…'):`⬇ ${L('İndir','Download')} ▾`}</button>
    {open&&<div className="lib-dl-menu" role="menu">
      {items.map(it=><button key={it.id} type="button" role="menuitem" className="lib-dl-it"
        onClick={()=>{setOpen(false);it.run();}}>
        {it.label}<small>{it.hint}</small></button>)}
    </div>}
  </div>);
}
