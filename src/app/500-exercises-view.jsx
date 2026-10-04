function ExercisesView({data,setData}){
  const[libTab,setLibTab]=useState('sc');       // 'sc' | 'ball' — which shelf is open
  const ball=libTab==='ball';
  const allEx=data.exercises||[];
  const exercises=useMemo(()=>allEx.filter(e=>exLib(e)===libTab),[allEx,libTab]);
  // Writes go back into the ONE list the app stores: the shelf is a view of it, never a
  // second copy, so nothing on the other shelf can be dropped by a write to this one.
  const setExercises=arr=>setData({...data,exercises:[...arr,...allEx.filter(e=>exLib(e)!==libTab)]});
  const[activeType,setActiveType]=useState(null);  // null => category grid; type name => exercises within
  const[q,setQ]=useState('');
  /* The category's filters, one value per field ({subType:'Vertical', equipment:'Band'});
     a field with no value is not filtered on. */
  const[filt,setFilt]=useState({});
  const[openId,setOpenId]=useState(null);
  const[mdBusy,setMdBusy]=useState(false);
  const openCard=useCallback(id=>setOpenId(id),[]);   // stable, so the memoised cards hold
  // The two shelves have different categories, so a filter set on one means nothing on
  // the other — switching shelves lands on that shelf's own landing page.
  const TYPES=ball?BALL_TYPES:EX_TYPES;
  const SUBS=ball?BALL_SUB_TYPES:SUB_TYPES;
  const switchLib=t=>{if(t===libTab)return;setLibTab(t);setActiveType(null);setFilt({});setQ('');setOpenId(null);};

  const patch=(id,p)=>setData(prev=>({...prev,exercises:(prev.exercises||[]).map(e=>e.id===id?{...e,...p}:e)}));
  /* Muscles the coach typed that the fixed list does not carry, kept on the account so
     they are offered on every exercise from then on. */
  const muscleProps={
    customMuscles:Array.isArray(data.customMuscles)?data.customMuscles:[],
    onRememberMuscle:m=>setData(prev=>{const cur=Array.isArray(prev.customMuscles)?prev.customMuscles:[];
      const v=String(m||'').trim();
      if(!v||cur.some(x=>x.toLowerCase()===v.toLowerCase())||EX_MUSCLES.some(x=>x.toLowerCase()===v.toLowerCase()))return prev;
      return{...prev,customMuscles:[...cur,v]};}),
    onForgetMuscle:m=>setData(prev=>({...prev,customMuscles:(Array.isArray(prev.customMuscles)?prev.customMuscles:[]).filter(x=>x!==m)})),
  };
  const remove=id=>{if(window.confirm(ball?L('Bu dril silinsin mi?','Delete this drill?'):L('Bu egzersiz silinsin mi?','Delete this exercise?'))){setExercises(exercises.filter(e=>e.id!==id));setOpenId(null);}};
  const addExercise=type=>{const t=type||activeType||'';
    const e={id:uid(),name:'',lib:libTab,type:t==='__uncat__'?'':t,subType:'',movePattern:'',contra:[],muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:'',
      ...(ball?{court:emptyScene(),players:''}:{})};
    setExercises([e,...exercises]);setOpenId(e.id);};
  const typeCounts=useMemo(()=>{const m={};TYPES.forEach(t=>m[t]=0);exercises.forEach(e=>{if(TYPES.includes(e.type))m[e.type]=(m[e.type]||0)+1;});return m;},[exercises,TYPES]);
  const open=exercises.find(e=>e.id===openId);
  const goBack=()=>{setActiveType(null);setFilt({});setQ('');};
  // How many times each exercise name is prescribed across the whole season program (all teams).
  const usageCounts=useMemo(()=>{const m={};
    (data.teams||[]).forEach(t=>Object.values(t.days||{}).forEach(day=>(day.sessions||[]).forEach(s=>(s.blocks||[]).forEach(b=>(b.exercises||[]).forEach(ex=>{
      const n=(ex.name||'').trim().toLowerCase();if(n)m[n]=(m[n]||0)+1;})))));
    return m;},[data.teams]);
  const usedOf=e=>usageCounts[(e.name||'').trim().toLowerCase()]||0;
  // Exercises with no/unknown category (e.g. auto-added from the program editor) live here
  // so the coach can find and categorise them later.
  const uncatCount=exercises.filter(e=>!TYPES.includes(e.type)).length;
  /* The open shelf as a designed PDF in the app's language — every exercise as a card,
     its picture on the left in a frame of one fixed size and its details on the right.
     The descriptions are translated and the pictures read first, which takes a moment, so
     the button says it is working. */
  const downloadLibPdf=async()=>{
    if(mdBusy)return;
    setMdBusy(true);
    try{await downloadExLibraryPDF(exercises,{ball,libTab});}
    catch(e){console.warn('library PDF failed',e);
      alert(L('PDF oluşturulamadı — bağlantını kontrol edip tekrar dene.','The PDF could not be created — check your connection and try again.'));}
    finally{setMdBusy(false);}};
  /* The same shelf as a .txt — the file an AI project is loaded with as reference. */
  const downloadLibTxt=async()=>{
    if(mdBusy)return;
    setMdBusy(true);
    try{await downloadExLibraryText(exercises,{ball,libTab});}
    catch(e){console.warn('library text failed',e);
      alert(L('Metin dosyası oluşturulamadı — tekrar dene.','The text file could not be created — try again.'));}
    finally{setMdBusy(false);}};
  const mdBtn=<LibDownloadMenu disabled={exercises.length===0} busy={mdBusy} items={[
    {id:'pdf',label:'PDF',run:downloadLibPdf,
      hint:L('Uygulamanın diliyle, egzersiz görselleriyle','In the app language, with the exercise images')},
    {id:'txt',label:L('Metin (.txt)','Text (.txt)'),run:downloadLibTxt,
      hint:L('AI projesine referans dosyası olarak yüklenir','The reference file an AI project is loaded with')},
  ]}/>;
  const scN=allEx.filter(e=>exLib(e)==='sc').length,ballN=allEx.length-scN;
  /* The two shelves, side by side at the head of the page — S&C and Ball Practice are
     both the coach's library, and which one is open should never be something to hunt
     for in a dropdown. */
  const libSplit=(
    <div className="lib-split">
      <button type="button" className={libTab==='sc'?'on':''} onClick={()=>switchLib('sc')}>
        🏋 {L('Kuvvet ve Kondisyon','Strength & Conditioning')} <b>{scN}</b></button>
      <button type="button" className={ball?'on ball':''} onClick={()=>switchLib('ball')}>
        🏀 {L('Top Çalışması','Ball Practice')} <b>{ballN}</b></button>
    </div>);
  // Top-right category dropdown (label → the active shelf's own category values).
  const CAT_OPTIONS=ball?BALL_TYPES.map(t=>[t,t])
    :[['Upper Body Push','Upper Body Push'],['Upper Body Pull','Upper Body Pull'],['Hip Dominant','Hip Dominant'],['Knee Dominant','Knee Dominant'],['Full Body','Full Body'],['Core','Core'],['Multidirectional Speed','Multi Directional Speed'],['Plyometric','Plyometric'],['Medicine Ball','Medicine Ball'],['Mobility','Mobility'],['Stability','Stability'],['Balance','Balance'],['Corrective','Corrective'],['Accessory','Accessory']];
  // Every option carries its exercise count in parentheses, so the coach sees how
  // full each category is without opening it.
  const catDropdown=(
    <select className="ex-cat-dd" value={activeType||''} onChange={e=>{const v=e.target.value;if(!v){goBack();}else{setActiveType(v);setFilt({});setQ('');}}}>
      <option value="">{L('Tüm kategoriler','All categories')} ({exercises.length})</option>
      {CAT_OPTIONS.map(([lbl,val])=><option key={val} value={val}>{exLabel(lbl)} ({typeCounts[val]||0})</option>)}
      {uncatCount>0&&<option value="__uncat__">{L('Kategorisiz','Uncategorized')} ({uncatCount})</option>}
    </select>);

  // ----- Library landing — ALL exercises mixed across categories -----
  if(!activeType){
    const ql0=q.trim().toLowerCase();
    // Stable pseudo-random order (seeded by id) so categories are intermixed but the
    // grid doesn't reshuffle on every render.
    const hashStr=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;};
    const mixed=[...exercises].sort((a,b)=>hashStr(String(a.id||a.name||''))-hashStr(String(b.id||b.name||'')));
    const flat=ql0?mixed.filter(e=>(e.name||'').toLowerCase().includes(ql0)):mixed;
    return(<div className="ex-wrap">
      <datalist id="ex-types">{EX_TYPES.map(t=><option key={t} value={t}/>)}</datalist>
      <datalist id="ex-muscles">{EX_MUSCLES.map(t=><option key={t} value={t}/>)}</datalist>
      <PageHero title={L('Egzersiz Kütüphanesi','Exercise Library')}
        sub={ball?L('Top antrenmanı drilleri · tüm kategoriler','Ball-practice drills · all categories')
                 :L('Kuvvet ve kondisyon egzersizleri · tüm kategoriler','Strength & conditioning exercises · all categories')}
        stats={[{v:exercises.length,l:ball?L('Dril','Drills'):L('Egzersiz','Exercises')},
                {v:allEx.length,l:L('Kütüphane toplamı','Library total')}]}/>
      <div className="ex-toolbar">
        {libSplit}
        {catDropdown}
        <div className="ex-search"><span aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg></span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={ball?L('Dril ara…','Search drills…'):L('Egzersiz ara…','Search exercises…')}/></div>
        <button className="btn sm white" onClick={()=>addExercise()}>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</button>
        {mdBtn}
      </div>
      {flat.length===0&&<div className="ex-empty">{exercises.length===0
        ?(ball?L('Henüz dril yok. ＋ Dril Ekle ile başla — ya da bir top çalışması bloğunda çizip oradan kaydet.','No drills yet. Start with ＋ Add Drill — or draw one in a ball practice block and save it from there.')
              :L('Henüz egzersiz yok. ＋ Egzersiz Ekle ile başla.','No exercises yet. Start with ＋ Add Exercise.'))
        :L('Aramanla eşleşen sonuç yok.','Nothing matches your search.')}</div>}
      <div className="ex-grid">{flat.map(e=><ExerciseCard key={e.id} ex={e} used={usedOf(e)} onOpen={openCard}/>)}</div>
      {open && <ExerciseModal ex={open} onChange={p=>patch(open.id,p)} onDelete={()=>remove(open.id)} onClose={()=>setOpenId(null)} {...muscleProps}/>}
    </div>);
  }

  // ----- Inside a category -----
  const isUncat=activeType==='__uncat__';
  const sub=isUncat?null:(SUBS[activeType]||null);
  /* Every filter this category carries, in the order they are read: the sub-type first,
     then Hip / Knee Dominant's Action and Movement Pattern, then the category's own
     extras (EX_EXTRA_FILTERS). Each one filters on the entry field named by `key`. */
  const lift=!ball&&!isUncat;
  const dims=[
    sub&&{key:'subType',label:sub.label,values:sub.values},
    lift&&ACTIONS_FOR[activeType]&&{key:'action',label:'Action',values:ACTIONS_FOR[activeType]},
    lift&&PATTERNS_FOR[activeType]&&{key:'pattern',label:'Movement Pattern',values:PATTERNS_FOR[activeType]},
    ...(lift?(EX_EXTRA_FILTERS[activeType]||[]):[]),
  ].filter(Boolean);
  const filtered=dims.some(d=>filt[d.key])||!!filt.difficulty;
  const ql=q.toLowerCase();
  const list=exercises.filter(e=>{
    if(isUncat){if(TYPES.includes(e.type))return false;}
    else if(e.type!==activeType)return false;
    if(q&&!(e.name||'').toLowerCase().includes(ql))return false;
    if(filt.difficulty&&e.difficulty!==filt.difficulty)return false;
    return dims.every(d=>!filt[d.key]||(d.multi?exMulti(e[d.key]).includes(filt[d.key]):e[d.key]===filt[d.key]));
  });

  return(<div className="ex-wrap">
    <datalist id="ex-types">{EX_TYPES.map(t=><option key={t} value={t}/>)}</datalist>
    <datalist id="ex-muscles">{EX_MUSCLES.map(t=><option key={t} value={t}/>)}</datalist>
    <div className="ex-top">
      <div>
        <button className="btn sec sm" onClick={goBack} style={{marginBottom:8}}>← {L('Kategoriler','Categories')}</button>
        <h1 className="ex-h1">{isUncat?L('Kategorisiz','Uncategorized'):exLabel(activeType)}</h1>
        {isUncat&&<div className="sub">{L('Programdan otomatik eklenen / kategorisi atanmamış egzersizler. Kart\'a tıklayıp kategori ata.','Exercises added automatically from the program / not yet assigned a category. Click a card to assign one.')}</div>}
        {dims.length>0&&<div className="sub">{L('Filtre:','Filter:')} <b>{dims.map(d=>exLabel(d.label)).join(' · ')}</b></div>}
      </div>
    </div>
    <div className="ex-toolbar">
      {libSplit}
      {catDropdown}
      <div className="ex-search"><span aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg></span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={L(`${exLabel(activeType)} ara…`,`Search ${exLabel(activeType)}…`)}/></div>
      <button className="btn sm white" onClick={()=>addExercise()}>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</button>
        {mdBtn}
    </div>
    <div className="exf-bar">
      {dims.map(d=><FilterDD key={activeType+':'+d.key} label={exLabel(d.label)} values={d.values}
        value={filt[d.key]||''} onChange={v=>setFilt(f=>({...f,[d.key]:v}))}/>)}
      {filtered&&<button type="button" className="exf-clear" onClick={()=>setFilt({})}>✕ {L('Temizle','Clear')}</button>}
      <LevelSeg value={filt.difficulty||''} onChange={v=>setFilt(f=>({...f,difficulty:v}))}/>
    </div>
    {list.length===0&&<div className="ex-empty">{(filtered||q)
      ?L('Bu kategoride filtrelerine uyan sonuç yok. ','Nothing in this category matches your filters. ')
      :(ball?L('Bu kategoride dril yok. ','No drills in this category. '):L('Bu kategoride egzersiz yok. ','No exercises in this category. '))}
      {L('Eklemek için','Add one with')} <b>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</b>{L('\'yı kullan.','.')}</div>}
    <div className="ex-grid">{list.map(e=><ExerciseCard key={e.id} ex={e} used={usedOf(e)} onOpen={openCard}/>)}</div>
    {open && <ExerciseModal ex={open} onChange={p=>patch(open.id,p)} onDelete={()=>remove(open.id)} onClose={()=>setOpenId(null)} {...muscleProps}/>}
  </div>);
}

