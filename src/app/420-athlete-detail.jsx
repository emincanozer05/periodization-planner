function AthleteDetail({ath,onBack,updAth,setup,weeks,exercises,ai,customTests,initialTab}){
  /* Normally the profile, but a wellness notification opens straight onto the tab it
     is about — the coach tapped a line about last night's sleep, not a biography. */
  const[tab,setTab]=useState(initialTab||'profile');
  const[editProfileOpen,setEditProfileOpen]=useState(false);
  const[dobText,setDobText]=useState('');
  useEffect(()=>{setDobText(fd(ath.dateOfBirth));},[ath.dateOfBirth,editProfileOpen]);
  const[srpeTableOpen,setSrpeTableOpen]=useState(false);
  const[wellnessTableOpen,setWellnessTableOpen]=useState(false);
  const[bodyTableOpen,setBodyTableOpen]=useState(false);
  // Find the most recent date that has any data (sessions/wellness/measurements)
  // so charts open on a month with actual data instead of an empty current month.
  const recentDate=useMemo(()=>{
    const all=new Set();
    Object.values(ath.days||{}).forEach(d=>{if(d?.sessions?.length)all.add(d.date);});
    (ath.wellness||[]).forEach(w=>{if(w.date)all.add(w.date);});
    (ath.measurements||[]).forEach(m=>{if(m.date)all.add(m.date);});
    const arr=[...all].sort();return arr.length?arr[arr.length-1]:fmt(today);
  },[ath.id]); // only recompute when switching athletes
  const recentParsed=parseD(recentDate);
  const[athDayKey,setAthDayKey]=useState(recentDate);
  const[athSel,setAthSel]=useState({year:recentParsed.getFullYear(),month:recentParsed.getMonth()+1,date:recentDate});
  // Week selectors for the per-panel charts (Wellness / sRPE) — Archivoy-anchored.
  const _mostRecent=(arr)=>{const ds=arr.map(x=>x.date).filter(Boolean).sort();return ds.length?wk(parseD(ds[ds.length-1])):wk(today);};
  const[wellnessWeek,setWellnessWeek]=useState(()=>_mostRecent(ath.wellness||[]));
  const[wellMetric,setWellMetric]=useState('readiness');
  const[srpeWeek,setSrpeWeek]=useState(()=>_mostRecent(ath.srpeLog||[]));
  // Wellness Log 2-week window (end date); defaults to the latest wellness entry.
  const[wlWeekEnd,setWlWeekEnd]=useState(()=>{const ds=(ath.wellness||[]).map(w=>w.date).filter(Boolean).sort();return ds.length?ds[ds.length-1]:fmt(today);});
  // Table pagination — show 10 by default, extendable in 10s.
  const[wlLimit,setWlLimit]=useState(10);
  const[srLimit,setSrLimit]=useState(10);
  const[mLimit,setMLimit]=useState(10);
  const[injLimit,setInjLimit]=useState(10);
  const photoRef=useRef(null);
  // Let a copied image be pasted straight onto the athlete photo with Ctrl/Cmd+V.
  // Only images are consumed, so pasting text into inputs is unaffected.
  useEffect(()=>{
    const onPaste=e=>{
      const el=document.activeElement;
      if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable))return;
      const f=imageFileFromPaste(e);
      if(f){e.preventDefault();handleImageUpload(f,'athletes',d=>updAth(ath.id,{photo:d}));}
    };
    document.addEventListener('paste',onPaste);
    return()=>document.removeEventListener('paste',onPaste);
  },[ath.id]);
  const positions=POSITIONS[setup.sport]||POSITIONS.default;
  const saveAthDays=nd=>updAth(ath.id,{days:nd});

  const exportPDF=async(period,extra)=>{
    const label=period==='weekly'?`Week of ${fd(wk(parseD(athSel.date)))}`:`${MN[athSel.month-1]} ${athSel.year}`;
    let mw=extra.mWeeks;
    if(period==='weekly'){const wkS=wk(parseD(athSel.date));const wkE=fmt(addD(parseD(wkS),6));mw=[{wkStart:wkS,wkEnd:wkE,...weekMono(dailyLoads(ath.days||{},wkS,wkE))}];}
    await generateCoachReport(`${ath.name} (${setup.teamName})`,label,ath.days||{},weeks,mw,extra.pMix,extra.acwrVal);
  };

  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  const dobLong=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);return`b. ${String(b.getDate()).padStart(2,'0')} ${MN[b.getMonth()]} ${b.getFullYear()}`;})():null;
  // Header snapshot metrics — at the athlete's most recent logged date
  const apRef=athLatestDate(ath);
  const apL7=athLoadSum(ath,fmt(addD(parseD(apRef),-6)),apRef);
  const apAcwr=athACWR(ath,apRef);
  const apRd=athWellnessVal(ath,'readiness',apRef);
  const apRhr=athWellnessVal(ath,'RHR',apRef);
  const apEntries=(ath.srpeLog||[]).length;
  const apCheckins=(ath.wellness||[]).length;
  const apRcls=apRd==null?'na':apRd>=4?'':apRd>=3?'warn':'bad';
  const ATH_TABS=[
    {id:'profile',ic:'◈',l:L('Profil','Profile')},
    /* The athlete as a trainee — priorities, movement profile, constraints, exposure. */
    {id:'training',ic:'◎',l:atpT('Athlete Training Profile')},
    {id:'load',ic:'▤',l:L('Yük','Load')},
    {id:'calendar',ic:'▣',l:L('Takvim','Calendar')},
    /* The tape measure, and only the tape measure. Test results are read on the Testing
       & Assessment screen, next to the battery they were taken in; putting them here as
       well made one tab answer two questions. */
    {id:'body',ic:'⌇',l:L('Antropometrik Ölçüm','Anthropometric')},
    {id:'injuries',ic:'⊘',l:L('Sakatlıklar','Injuries')},
    {id:'wellness',ic:'♡',l:'Wellness'},
  ];
  return(<div>
    <button className="back" onClick={onBack} style={{marginBottom:14}}>‹ {L('Sporcular','Athletes')}</button>
    <div className="ap-head">
      <div className="ap-av-wrap">
        <div className={`ap-av ${apRcls}`} onClick={()=>photoRef.current?.click()} title={L('Fotoğrafı değiştirmek için tıkla','Click to change photo')}>
          {ath.photo?<img src={mediaSrc(ath.photo)} alt=""/>:initials}
          <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'athletes',d=>updAth(ath.id,{photo:d}));e.target.value='';}}/>
        </div>
        <button className="ap-paste" title={L('Kopyalanan fotoğrafı yapıştır','Paste copied photo')} onClick={e=>{e.stopPropagation();pasteImageFromClipboard('athletes',d=>updAth(ath.id,{photo:d}));}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
        </button>
      </div>
      <div className="ap-id">
        <h1>{ath.name||L('Adsız Sporcu','Unnamed Athlete')}{ath.number&&<span className="ap-num">#{ath.number}</span>}</h1>
        <div className="ap-meta">
          {ath.position&&<span>◉ {POS_FULL[ath.position]||ath.position}</span>}
          <span>〰 {L(`${apEntries} yük kaydı`,`${apEntries} load entries`)}</span>
          <span>♡ {L(`${apCheckins} check-in`,`${apCheckins} check-ins`)}</span>
        </div>
      </div>
      <div className="ap-stats">
        <div className="ap-stat"><div className="k">{L('Hazır Oluş','Readiness')}</div><div className="v" style={{color:readyColor(apRd)}}>{apRd!=null?<CountUp value={apRd} decimals={1}/>:'—'}<small>/5</small></div></div>
        <div className="ap-stat"><div className="k">RHR</div><div className="v">{apRhr!=null?<CountUp value={apRhr} decimals={0}/>:'—'}<small>bpm</small></div></div>
        <div className="ap-stat"><div className="k">{L('7g yük','7d load')}</div><div className="v" style={{color:'#3b6ef5'}}>{apL7?<CountUp value={apL7} format={x=>Math.round(x).toLocaleString('en-US').replace(/,/g,'.')}/>:'—'}<small>AU</small></div></div>
        <div className="ap-stat"><div className="k">ACWR</div><div className="v" style={{color:acwrZoneOf(apAcwr).c}}>{apAcwr?<CountUp value={apAcwr} decimals={2}/>:'—'}</div></div>
      </div>
      <button className="ap-edit" onClick={()=>setEditProfileOpen(true)} title={L('Profili düzenle','Edit profile')}>✎</button>
    </div>
    <div className="ath-tabs">{ATH_TABS.map(t=><button key={t.id} className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}><span className="ic">{t.ic}</span>{t.l}</button>)}</div>
    {tab==='profile'&&<ProfileTab ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='training'&&<TrainingProfileTab ath={ath} updAth={updAth} exercises={exercises}/>}

    {editProfileOpen&&<div className="modal-bg" onClick={()=>setEditProfileOpen(false)}>
      <div className="modal" style={{maxWidth:680,width:'95vw',background:'#15181e',backdropFilter:'none',WebkitBackdropFilter:'none'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2 style={{margin:0,fontSize:18}}>{L('Profili Düzenle','Edit Profile')}</h2><button className="x-btn" onClick={()=>setEditProfileOpen(false)}>✕</button></div>
        <div style={{padding:'18px 22px'}}>
          <div className="grid cols-3">
            <div><label>{L('Ad Soyad','Full name')}</label><input value={ath.name} onChange={e=>updAth(ath.id,{name:e.target.value})}/></div>
            <div><label>{L('Forma No','Jersey #')}</label><input value={ath.number} onChange={e=>updAth(ath.id,{number:e.target.value})}/></div>
            <div><label>{L('Mevki','Position')}</label><select value={posOf(ath.position)} onChange={e=>updAth(ath.id,{position:e.target.value})}>{positions.map(p=><option key={p}>{p}</option>)}</select></div>
          </div>
          <div className="grid cols-3" style={{marginTop:12}}>
            <div><label>{L('Doğum tarihi','Date of birth')}</label><input type="text" inputMode="numeric" placeholder={L('gg/aa/yyyy','dd/mm/yyyy')} value={dobText} onChange={e=>{const v=e.target.value;setDobText(v);const m=v.trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);if(m){const d=+m[1],mo=+m[2];if(d>=1&&d<=31&&mo>=1&&mo<=12)updAth(ath.id,{dateOfBirth:`${m[3]}-${pad(mo)}-${pad(d)}`});}}}/><div className="help">{L('gün / ay / yıl','day / month / year')}</div></div>
            {/* Cep telefonu: ülke kodu ayrı bir kutuda, numara ayrı. Numaranın uluslararası
                biçimde durması gerekiyor, ve bir koç +90'ı numaranın içine yazmayı hep
                unutuyor — o yüzden seçtiriyoruz. */}
            <div style={{gridColumn:'span 2'}}><label>{L('Cep telefonu','Mobile phone')}</label>
              <div style={{display:'flex',gap:8}}>
                <select style={{flex:'0 0 130px'}} value={ath.phoneCode||DEFAULT_DIAL} onChange={e=>updAth(ath.id,{phoneCode:e.target.value})}>
                  {DIAL_CODES.map(c=><option key={c.c} value={c.d}>{c.d} · {c.c}</option>)}
                </select>
                <input style={{flex:1}} type="tel" inputMode="tel" placeholder="532 123 45 67"
                  value={ath.phone||''} onChange={e=>updAth(ath.id,{phone:cleanPhone(e.target.value)})}/>
              </div>
              <div className="help">{fullPhone(ath)||L('Ülke kodunu seç, numarayı başındaki 0 olmadan yaz.','Pick the country code, and write the number without a leading 0.')}</div></div>
          </div>
          <div className="grid cols-3" style={{marginTop:12}}>
            <div><label>{L('Cinsiyet','Sex')}</label><select value={ath.sex||''} onChange={e=>updAth(ath.id,{sex:e.target.value})}>
              <option value="">{L('— girilmemiş','— not set')}</option>
              <option value="M">{L('Erkek','Male')}</option>
              <option value="F">{L('Kadın','Female')}</option>
            </select></div>
          </div>
          <div style={{marginTop:12}}><label>{L('Notlar','Notes')}</label><textarea value={ath.notes} onChange={e=>updAth(ath.id,{notes:e.target.value})} placeholder={L('Hedefler, özel durumlar…','Goals, special considerations…')}/></div>
          <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}><button className="btn sm" onClick={()=>setEditProfileOpen(false)}>{L('Bitti','Done')}</button></div>
        </div>
      </div>
    </div>}
    {tab==='injuries'&&<div>
      <div className="row" style={{justifyContent:'space-between',marginBottom:14}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:600,color:'var(--text)'}}>{L('Sporcu Sakatlık Kaydı','Athlete Injury Record')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>({(ath.injuries||[]).length})</span></h2>
        <button className="btn sm" onClick={()=>{const inj={id:uid(),date:fmt(today),context:'Training',mechanism:'',side:'',location:'',tissueType:'',type:'',grade:'1',firstInjuryDay:fmt(today),sidelinedDate:fmt(today),estimatedReturn:'',actualReturn:'',status:'Active',notes:''};updAth(ath.id,{injuries:[...(ath.injuries||[]),inj]});}}>+ {L('Sakatlık Ekle','Add Injury')}</button>
      </div>
      {(!ath.injuries||ath.injuries.length===0)&&<div className="empty-st">{L('Kayıtlı sakatlık yok','No injuries recorded')}</div>}
      {(ath.injuries||[]).map((inj,idx)=>{
        const ui=(k,v)=>{const a=[...ath.injuries];a[idx]={...a[idx],[k]:v};updAth(ath.id,{injuries:a});};
        const sd=inj.sidelinedDate,ar=inj.actualReturn;
        let missedTraining=null,missedMatches=null;
        if(sd){const endDate=ar||fmt(today);if(endDate>=sd){missedTraining=Math.max(0,diffD(sd,endDate));missedMatches=(setup.competitions||[]).filter(c=>c.date>=sd&&c.date<=endDate).length;}}
        const isActive=!ar;
        return(<div key={inj.id||idx} className="panel inj-card">
          <div className="inj-h">
            <div className="inj-h-l">
              <span className={`inj-pill ${isActive?'inj':'ok'}`}>{isActive?L('AKTİF','ACTIVE'):L('İYİLEŞTİ','RECOVERED')}</span>
              <strong style={{fontSize:14,color:'var(--text)'}}>{inj.location||inj.type||L('(belirtilmemiş sakatlık)','(unspecified injury)')}</strong>
              {inj.grade&&<span className="inj-grade">{L('Derece','Grade')} {inj.grade}</span>}
            </div>
            <button className="btn xs danger" onClick={()=>{if(confirm(L('Bu sakatlık kaydı silinsin mi?','Delete this injury record?')))updAth(ath.id,{injuries:ath.injuries.filter((_,j)=>j!==idx)});}}>✕ {L('Sil','Delete')}</button>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('Sakatlık Tarihi','Injury Date')}</label><input type="date" value={inj.date||''} onChange={e=>ui('date',e.target.value)}/></div>
            <div><label>{L('Bağlam','Context')}</label><select value={inj.context||'Training'} onChange={e=>ui('context',e.target.value)}><option value="Training">{L('Antrenman','Training')}</option><option value="Match">{L('Maç','Match')}</option><option value="Other">{L('Diğer','Other')}</option></select></div>
            <div><label>{L('Taraf','Side')}</label><select value={inj.side||''} onChange={e=>ui('side',e.target.value)}><option value="">—</option><option value="Right">{L('Sağ','Right')}</option><option value="Left">{L('Sol','Left')}</option><option value="Bilateral">{L('Çift taraflı','Bilateral')}</option><option value="N/A">{L('Yok','N/A')}</option></select></div>
            <div><label>{L('Şiddet Derecesi','Severity Grade')}</label><select value={inj.grade||'1'} onChange={e=>ui('grade',e.target.value)}><option value="1">{L('Derece 1','Grade 1')}</option><option value="2">{L('Derece 2','Grade 2')}</option><option value="3">{L('Derece 3','Grade 3')}</option><option value="4">{L('Derece 4','Grade 4')}</option></select></div>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('Anatomik Bölge','Anatomical Location')}</label><input value={inj.location||''} onChange={e=>ui('location',e.target.value)} placeholder={L('Diz, Ayak bileği…','Knee, Ankle…')}/></div>
            <div><label>{L('Doku Tipi','Tissue Type')}</label><select value={inj.tissueType||''} onChange={e=>ui('tissueType',e.target.value)}><option value="">—</option><option value="Muscle">{L('Kas','Muscle')}</option><option value="Ligament">{L('Bağ','Ligament')}</option><option value="Tendon">{L('Tendon','Tendon')}</option><option value="Bone">{L('Kemik','Bone')}</option><option value="Cartilage">{L('Kıkırdak','Cartilage')}</option><option value="Joint capsule">{L('Eklem kapsülü','Joint capsule')}</option><option value="Nerve">{L('Sinir','Nerve')}</option><option value="Other">{L('Diğer','Other')}</option></select></div>
            <div><label>{L('Sakatlık Tipi','Injury Type')}</label><input value={inj.type||''} onChange={e=>ui('type',e.target.value)} placeholder={L('ÖÇB burkulması…','ACL sprain…')}/></div>
            <div><label>{L('Sakatlanma Mekanizması','Injury Mechanism')}</label><input value={inj.mechanism||''} onChange={e=>ui('mechanism',e.target.value)} placeholder={L('Temassız dönüş…','Non-contact pivot…')}/></div>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('İlk Sakatlık Günü','First Injury Day')}</label><input type="date" value={inj.firstInjuryDay||''} onChange={e=>ui('firstInjuryDay',e.target.value)}/></div>
            <div><label>{L('Kadro Dışı Tarihi','Sidelined Date')}</label><input type="date" value={inj.sidelinedDate||''} onChange={e=>ui('sidelinedDate',e.target.value)}/></div>
            <div><label>{L('Tahmini Dönüş','Estimated Return')}</label><input type="date" value={inj.estimatedReturn||''} onChange={e=>ui('estimatedReturn',e.target.value)}/></div>
            <div><label>{L('Gerçekleşen Dönüş','Actual Return')}</label><input type="date" value={inj.actualReturn||''} onChange={e=>ui('actualReturn',e.target.value)}/></div>
          </div>
          <div className="inj-stats">
            <div className="inj-stat"><div className="k">{L('Kaçırılan Antrenman','Missed Training')}</div><div className="v">{missedTraining!=null?missedTraining:'—'}<span className="u">{L('gün','days')}</span></div></div>
            <div className="inj-stat"><div className="k">{L('Kaçırılan Maç','Missed Matches')}</div><div className="v">{missedMatches!=null?missedMatches:'—'}</div></div>
          </div>
        </div>);
      })}
    </div>}
    {tab==='body'&&<div>
      {(()=>{const m=(ath.measurements||[]).filter(x=>x.date).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));const cur=m[m.length-1];const prev=m[m.length-2];
        const d=(a,b,k,dp=1)=>{const v1=Number(a?.[k]),v2=Number(b?.[k]);if(!a||!b||isNaN(v1)||isNaN(v2))return null;return+(v1-v2).toFixed(dp);};
        const w=cur?Number(cur.weight)||null:null,bf=cur?Number(cur.bodyFat)||null:null,ws=cur?Number(cur.wingspan)||null:null;
        const dw=d(cur,prev,'weight'),dbf=d(cur,prev,'bodyFat'),dws=d(cur,prev,'wingspan');
        const fmtD=(v,u)=>v==null?null:(v>0?`+${v}${u}`:`${v}${u}`);
        return(<div className="ath-stat-row" style={{gridTemplateColumns:`repeat(${dws!=null?6:5},minmax(0,1fr))`}}>
          <div className="ath-stat"><div className="k">{L('Güncel Kilo','Current Wt')}</div><div className="v">{w!=null?w:'—'}<span className="u">kg</span></div></div>
          <div className="ath-stat"><div className="k">{L('Değişim','Change')}</div><div className="v">{fmtD(dw,'')||'—'}<span className="u">kg</span></div>{dw!=null&&<div className={`d ${dw>0?'pos':'neg'}`}>{dw>0?L('arttı','gain'):L('azaldı','loss')}</div>}</div>
          <div className="ath-stat"><div className="k">{L('Yağ Oranı','Body Fat')}</div><div className="v">{bf!=null?bf:'—'}<span className="u">%</span></div></div>
          <div className="ath-stat"><div className="k">{L('Yağ Değişimi','BF Change')}</div><div className="v">{fmtD(dbf,'')||'—'}<span className="u">%</span></div>{dbf!=null&&<div className={`d ${dbf<0?'pos':'neg'}`}>{dbf<0?L('daha iyi','better'):L('daha yüksek','higher')}</div>}</div>
          <div className="ath-stat"><div className="k">{L('Kulaç','Wingspan')}</div><div className="v">{ws!=null?ws:'—'}<span className="u">cm</span></div></div>
          {dws!=null&&<div className="ath-stat"><div className="k">{L('Kulaç Değişimi','WS Change')}</div><div className="v">{fmtD(dws,'')}<span className="u">cm</span></div><div className={`d ${dws>0?'pos':'neg'}`}>{dws>0?L('arttı','gain'):L('azaldı','loss')}</div></div>}
        </div>);})()}
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L('Vücut Kompozisyonu Takibi','Body Composition Tracking')}</h2>
          <div className="row" style={{gap:6}}>
            <button className="btn sec sm" disabled={(ath.measurements||[]).length===0} onClick={()=>printBodyComp(ath,setup)} title={L('Vücut Kompozisyonu raporu (A4 çıktı)','Body Composition report (A4 print)')}>⎙ {L('Çıktı al','Print')}</button>
            {/* A new row is an empty row waiting to be typed into, so open the table with it
                — otherwise the button looks like it did nothing. */}
            <button className="btn sm" onClick={()=>{const m={id:uid(),date:fmt(today),height:'',weight:'',bodyFat:'',wingspan:'',notes:''};updAth(ath.id,{measurements:[...(ath.measurements||[]),m]});setBodyTableOpen(true);}}>+ {L('Ölçüm Ekle','Add Measurement')}</button>
          </div>
        </div>
        {(ath.measurements||[]).length>0&&<div>
          {(()=>{const sorted=[...ath.measurements].filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
            const labels=sorted.map(m=>{const d=parseD(m.date);return MN[d.getMonth()];});
            const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',font:{size:10,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,formatter:v=>v==null?'':(+Number(v).toFixed(1))});
            const mkChart=(title,unit,field,color,dotColor,goodUp)=>{const data=sorted.map(m=>{const raw=m[field];if(raw===''||raw==null)return null;const v=Number(raw);return(isNaN(v)||v===0)?null:v;});
              const valid=data.filter(v=>v!=null);
              const cur=valid.length?valid[valid.length-1]:null,first=valid.length?valid[0]:null;
              const imp=valid.length>1?+((cur-first).toFixed(1)):null;
              const fav=(imp==null||goodUp==null)?null:(goodUp?imp>0:imp<0);
              return(<div className="metric-card">
                <div className="mc-h"><div className="mc-t">{title}</div><div className="mc-u">{unit}</div></div>
                <div className="mc-val"><span className="mv" style={{color:dotColor||color}}>{cur!=null?cur:'—'}</span>{imp!=null&&imp!==0&&<span className={`md ${fav==null?'':(fav?'pos':'neg')}`}>{imp>0?'+':''}{imp}</span>}</div>
                <div className="mc-chart tall"><ChartC type="line" chartData={{labels,datasets:[
                  {label:title,data,borderColor:color,backgroundColor:color+'22',fill:'origin',tension:.35,spanGaps:true,borderWidth:2.5,
                    pointRadius:4,pointHoverRadius:6,pointBackgroundColor:dotColor||color,pointBorderColor:'#0d0f13',pointBorderWidth:1.5,
                    datalabels:dataLbl(dotColor||color)}
                ]}} options={{responsive:true,maintainAspectRatio:false,
                  layout:{padding:{top:24,bottom:6,left:8,right:8}},
                  scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:10},autoSkip:true,maxRotation:0,maxTicksLimit:7},grid:{display:false},border:{display:false}},
                    y:{display:false,grid:{display:false},beginAtZero:false}},
                  plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
              </div>);};
            /* Two up, two down: across a full-width panel four cards left each chart too
               narrow to read a trend off, and the row of tiny plots read as a strip of
               sparklines rather than four charts worth looking at. */
            return(<div className="metric-grid" style={{marginBottom:18,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
              {mkChart(L('Boy','Height'),'cm','height','#a855f7','#c084fc',null)}
              {mkChart(L('Kilo','Weight'),'kg','weight','#3b82f6','#60a5fa',null)}
              {mkChart(L('Yağ Oranı','Body Fat'),'%','bodyFat','#f97316','#fb923c',false)}
              {mkChart(L('Kulaç','Wingspan'),'cm','wingspan','#10b981','#34d399',null)}
            </div>);})()}
          {/* Collapsible paginated table (10 rows by default, expand in 10s) */}
          <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:bodyTableOpen?10:0}}>
            <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ölçüm kayıtları','Measurement records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.measurements.length} {L('satır','rows')})</span></strong>
            <button className="btn sec sm" onClick={()=>setBodyTableOpen(o=>!o)}>{bodyTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
          </div>
          {bodyTableOpen&&(()=>{const rev=ath.measurements.map((m,i)=>({m,i})).sort((a,b)=>(b.m.date||'').localeCompare(a.m.date||''));const vis=rev.slice(0,mLimit);const hasMore=rev.length>mLimit;
            return<div style={{overflowX:'auto'}}><table><thead><tr><th>{L('Tarih','Date')}</th><th>{L('Boy (cm)','Height (cm)')}</th><th>{L('Kilo (kg)','Weight (kg)')}</th><th>{L('Yağ (%)','Body Fat (%)')}</th><th>{L('Kulaç (cm)','Wingspan (cm)')}</th><th>{L('Notlar','Notes')}</th><th style={{width:50}}></th></tr></thead><tbody>
              {vis.map(({m,i:realIdx},idx)=>{
                const um=(k,v)=>{const a=[...ath.measurements];a[realIdx]={...a[realIdx],[k]:v};updAth(ath.id,{measurements:a});};
                // Rows mirrored from an Anthropometric Measurement test are read-only here —
                // edit them from the Testing tab so the source and Body Comp stay in sync.
                const synced=!!m.srcTest;
                return<tr key={m.id||idx} style={synced?{opacity:.92}:undefined}>
                  <td><input type="date" value={m.date} onChange={e=>um('date',e.target.value)} style={{width:130}} disabled={synced}/><div className="help">{fd(m.date)}</div></td>
                  <td><input type="number" step="0.1" value={m.height||''} onChange={e=>um('height',e.target.value)} placeholder="cm" style={{width:80}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.weight} onChange={e=>um('weight',e.target.value)} placeholder="kg" style={{width:80}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.bodyFat} onChange={e=>um('bodyFat',e.target.value)} placeholder="%" style={{width:70}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.wingspan||''} onChange={e=>um('wingspan',e.target.value)} placeholder="cm" style={{width:80}} disabled={synced}/></td>
                  <td><input value={m.notes||''} onChange={e=>um('notes',e.target.value)} placeholder={L('Notlar…','Notes…')}/></td>
                  <td>{synced?<span className="help" title={L('Test sekmesinden yönetiliyor','Managed by the Testing tab')} style={{fontSize:16}}>🔗</span>:<button className="btn xs danger" onClick={()=>updAth(ath.id,{measurements:ath.measurements.filter((_,j)=>j!==realIdx)})}>✕</button>}</td>
                </tr>;})}
            </tbody></table>
            <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
              {hasMore&&<button className="btn sm sec" onClick={()=>setMLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-mLimit} kaldı)`,`Show 10 more (${rev.length-mLimit} remaining)`)}</button>}
              {mLimit>10&&<button className="btn sm sec" onClick={()=>setMLimit(10)}>{L('Daralt','Collapse')}</button>}
              <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
            </div></div>;})()}
        </div>}
        {(!ath.measurements||ath.measurements.length===0)&&<div className="empty-st">{L('Henüz ölçüm yok','No measurements yet')}</div>}
      </div>
    </div>}
    {tab==='wellness'&&<div>
      {/* ---- Wellness Log (from Notion sync or manual) ---- */}
      <div className="panel">
      <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:600,color:'var(--text)'}}>{L('Wellness Kaydı','Wellness Log')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('son 2 hafta · sabah check-in soruları','last 2 weeks · morning check-in questions')}</span></h2>
        <div className="row" style={{gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <button className="btn sm sec" onClick={()=>setWlWeekEnd(w=>fmt(addD(parseD(w),-7)))} title={L('Önceki hafta','Previous week')}>‹</button>
          <strong style={{fontSize:12,minWidth:118,textAlign:'center',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:'var(--text2)'}}>{fd(fmt(addD(parseD(wlWeekEnd),-13))).slice(0,5)} – {fd(wlWeekEnd).slice(0,5)}</strong>
          <button className="btn sm sec" onClick={()=>setWlWeekEnd(w=>fmt(addD(parseD(w),7)))} title={L('Sonraki hafta','Next week')}>›</button>
          <button className="btn sm sec" onClick={()=>{const ds=(ath.wellness||[]).map(x=>x.date).filter(Boolean).sort();setWlWeekEnd(ds.length?ds[ds.length-1]:fmt(today));}}>{L('En son','Latest')}</button>
          <button className="btn sm sec" onClick={()=>{const w={id:uid(),srcId:null,date:fmt(today),RHR:'',sleep:'',mentalFatigue:'',physicalFatigue:'',fatigue:'',soreness:'',areaOfPain:'',readiness:''};updAth(ath.id,{wellness:[...(ath.wellness||[]),w]});}}>+ {L('Elle','Manual')}</button>
        </div>
      </div>
      {(ath.wellness||[]).length===0&&<div className="empty-st">{L('Wellness verisi yok — Tally’den senkronla ya da elle ekle','No wellness data — sync from Tally or add manually')}</div>}
      {(ath.wellness||[]).length>0&&(()=>{
        const METRICS=[
          {id:'readiness',label:L('Hazır Oluş','Readiness'),color:'#10b981',dot:'#34d399',unit:'/5',hi:true},
          {id:'sleep',label:L('Uyku','Sleep'),color:'#3b82f6',dot:'#60a5fa',unit:'/5',hi:true},
          // The check-in's questions in the form's order — the same list as the heatmap.
          {id:'mentalFatigue',label:L('Zihinsel Yorgunluk','Mental Fatigue'),color:'#a78bfa',dot:'#c4b5fd',unit:'/5',hi:true},
          {id:'physicalFatigue',label:L('Fiziksel Yorgunluk','Physical Fatigue'),color:'#f97316',dot:'#fb923c',unit:'/5',hi:true},
          {id:'soreness',label:L('Kas Ağrısı','Muscle Soreness'),color:'#f43f5e',dot:'#fb7185',unit:'/5',hi:true},
          {id:'RHR',label:L('İstirahat Nabzı','Resting HR'),color:'#22d3ee',dot:'#67e8f9',unit:'bpm',hi:false},
        ];
        const valColor='#2dd4a7';
        // 1-5 scores in the check-in form's own colours: 1 red … 5 blue.
        const score5Col=v=>score5Color(v)||'var(--dim)';
        const fmtN=(v,five)=>v==null?'—':(five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v)));
        const _wStart=fmt(addD(parseD(wlWeekEnd),-13));
        const logsAll=[...ath.wellness].filter(w=>w.date&&w.date>=_wStart&&w.date<=wlWeekEnd).sort((a,b)=>a.date.localeCompare(b.date));
        return(<div>
          <div className="wl-card" style={{border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',marginBottom:14,background:'rgba(255,255,255,.015)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>{L('Wellness Kaydı','Wellness Log')} <span style={{fontSize:11,fontWeight:400,color:'var(--muted)'}}>· {METRICS.length} {L('metrik · check-in başına','metrics · per check-in')}</span></div>
            {METRICS.map(m=>{
              const five=m.unit==='/5';
              const series=logsAll.map(w=>w[m.id]!==''&&w[m.id]!=null?Number(w[m.id]):null);
              const present=series.filter(v=>v!=null);
              const count=present.length;
              const latest=count?present[count-1]:null;
              const prev=count>1?present[count-2]:null;
              const avg=count?present.reduce((a,b)=>a+b,0)/count:null;
              const delta=(latest!=null&&prev!=null)?latest-prev:null;
              const good=delta==null?true:(m.hi?delta>=0:delta<=0);
              return<div key={m.id} style={{display:'flex',alignItems:'center',gap:16,padding:'11px 0',borderTop:'1px solid var(--border)'}}>
                <div style={{width:150,flex:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,fontSize:13,fontWeight:600,color:'var(--text)'}}><span style={{width:9,height:9,borderRadius:2,background:m.color,flex:'none'}}/>{m.label}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:4}}>
                    <span style={{fontSize:26,fontWeight:700,lineHeight:1,color:latest==null?'var(--dim)':(five?score5Col(latest):valColor)}}>{fmtN(latest,five)}</span>
                    <span style={{fontSize:11,color:'var(--dim)'}}>{m.unit}</span>
                    {delta!=null&&delta!==0&&<span style={{fontSize:12,fontWeight:700,color:good?'#2dd4a7':'#f43f5e'}}>{delta>0?'↑':'↓'}{fmtN(Math.abs(delta),five)}</span>}
                  </div>
                  <div style={{fontSize:10.5,color:'var(--dim)',marginTop:3,letterSpacing:.3}}>{L('ort.','avg')} {fmtN(avg,five)} · {count} {L('kayıt','logs')}</div>
                </div>
                <div style={{flex:1,minWidth:0}}><SparkSVG id={m.id} data={series} color={m.color} avg={avg} unit={m.unit} showValues valueColor={five?score5Col:null}/></div>
              </div>;
            })}
          </div>
            {/* Collapsible paginated table */}
            <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:wellnessTableOpen?10:0}}>
              <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ayrıntılı kayıtlar','Detailed records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.wellness.length} {L('satır','rows')})</span></strong>
              <button className="btn sec sm" onClick={()=>setWellnessTableOpen(o=>!o)}>{wellnessTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
            </div>
            {wellnessTableOpen&&(()=>{const rev=[...ath.wellness].reverse();const vis=rev.slice(0,wlLimit);const hasMore=rev.length>wlLimit;
              return<div style={{overflowX:'auto'}}><table><thead><tr>
                <th>{L('Tarih','Date')}</th><th>RHR</th><th>{L('Uyku','Sleep')}</th><th>{L('Zihinsel Yorg.','Mental Fat.')}</th><th>{L('Fiziksel Yorg.','Physical Fat.')}</th><th>{L('Kas Ağrısı','Soreness')}</th><th>{L('Hazır Oluş','Readiness')}</th><th style={{width:50}}></th>
              </tr></thead><tbody>
                {vis.map((w,idx)=>{const realIdx=ath.wellness.length-1-idx;
                  /* A value the coach types here is theirs: the field is stamped on the
                     record so the next Tally sync writes around it instead of over it. */
                  const uw=(k,v)=>{const a=[...ath.wellness];const cur=a[realIdx];
                    const next={...cur,[k]:v,manualEdits:[...new Set([...(cur.manualEdits||[]),k])]};
                    // The single fatigue number other screens read follows its two halves.
                    if(k==='mentalFatigue'||k==='physicalFatigue')next.fatigue=wellFatigue(next)??'';
                    a[realIdx]=next;
                    updAth(ath.id,{wellness:a});};
                  /* A row written before fatigue was split has one fatigue score and no
                     halves; it shows in both boxes, greyed, until the coach types over it. */
                  const oldFat=recNum(w.mentalFatigue)==null&&recNum(w.physicalFatigue)==null&&recNum(w.fatigue)!=null?String(w.fatigue):undefined;
                  return<tr key={w.id||idx}>
                    <td><input type="date" value={w.date} onChange={e=>uw('date',e.target.value)} style={{width:130}}/><div className="help">{fd(w.date)}</div></td>
                    <td><input type="number" value={w.RHR??''} onChange={e=>uw('RHR',e.target.value)} style={{width:60}}/></td>
                    <td><input type="number" step="0.5" value={w.sleep??''} onChange={e=>uw('sleep',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" step="0.5" value={w.mentalFatigue??''} placeholder={oldFat} onChange={e=>uw('mentalFatigue',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" step="0.5" value={w.physicalFatigue??''} placeholder={oldFat} onChange={e=>uw('physicalFatigue',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" step="0.5" value={w.soreness??''} onChange={e=>uw('soreness',e.target.value)} style={{width:55}}/></td>
                    {/* Area of Pain and Source have no column here. Both stay on the record
                        and keep doing their job — the pain report and the wellness heatmap
                        read areaOfPain, and srcId still decides what the next Tally sync is
                        allowed to overwrite. Pain is shown where it is acted on (the flag
                        list, the heatmap, the athlete's day), and where a row came from is
                        not a number to correct. */}
                    <td><input type="number" step="0.1" value={w.readiness??''} onChange={e=>uw('readiness',e.target.value)} style={{width:60}}/></td>
                    <td><button className="btn xs danger" onClick={()=>updAth(ath.id,{wellness:ath.wellness.filter((_,j)=>j!==realIdx)})}>✕</button></td>
                  </tr>;})}
              </tbody></table>
              <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
                {hasMore&&<button className="btn sm sec" onClick={()=>setWlLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-wlLimit} kaldı)`,`Show 10 more (${rev.length-wlLimit} remaining)`)}</button>}
                {wlLimit>10&&<button className="btn sm sec" onClick={()=>setWlLimit(10)}>{L('Daralt','Collapse')}</button>}
                <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
              </div></div>;
            })()}
          </div>);
        })()}
      </div>

    </div>}

    {tab==='load'&&<div>
      {/* ---- sRPE Log (Inner Load — synced from Notion form) ---- */}
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L('sRPE Kaydı','sRPE Log')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('kaynağa göre seans-RPE · her çubuğun üstünde sRPE yükü (AU)','session-RPE by source · sRPE load (AU) above each bar')}</span></h2>
          <div className="row" style={{gap:6}}>
            <button className="btn sec sm" onClick={()=>setSrpeWeek(fmt(addD(parseD(srpeWeek),-7)))}>‹ {L('Hafta','Week')}</button>
            <strong style={{fontSize:13,minWidth:170,textAlign:'center'}}>{fd(srpeWeek)} → {fd(fmt(addD(parseD(srpeWeek),6)))}</strong>
            <button className="btn sec sm" onClick={()=>setSrpeWeek(fmt(addD(parseD(srpeWeek),7)))}>{L('Hafta','Week')} ›</button>
            <button className="btn sm sec" onClick={()=>setSrpeWeek(_mostRecent(ath.srpeLog||[]))}>{L('En son','Latest')}</button>
            <button className="btn sm sec" onClick={()=>{const s={id:uid(),notionId:null,date:fmt(today),tpRPE:'',tpDuration:'',tpLoad:'',scRPE:'',scDuration:'',scLoad:'',gameRPE:'',gameDuration:'',gameLoad:'',totalLoad:''};updAth(ath.id,{srpeLog:[...(ath.srpeLog||[]),s]});}}>+ {L('Elle','Manual')}</button>
          </div>
        </div>
        {(ath.srpeLog||[]).length===0&&<div className="empty-st">{L('Henüz sRPE verisi yok — Tally’den senkronla ya da elle ekle','No sRPE data yet — sync from Tally or add manually')}</div>}
        {(ath.srpeLog||[]).length>0&&(()=>{
          const days7=Array.from({length:7},(_,i)=>fmt(addD(parseD(srpeWeek),i)));
          // Aggregate ALL entries per date. A single day can hold several sessions (e.g. an
          // S&C session AND a Ball Practice session), each its own srpeLog row. The old
          // Object.fromEntries(date→entry) kept only the LAST row per date, so a second
          // same-day session (the S&C manual RPE) silently disappeared from the chart.
          const agg={};
          (ath.srpeLog||[]).forEach(s=>{
            if(!s||!s.date)return;
            const a=agg[s.date]||(agg[s.date]={tpLoad:0,scLoad:0,gmLoad:0,tpRW:0,tpDW:0,scRW:0,scDW:0,gmRW:0,gmDW:0});
            const add=(P,load,rpe,dur)=>{a[P+'Load']+=Number(load)||0;const r=(rpe===''||rpe==null)?null:Number(rpe);const du=Number(dur)||0;if(r!=null&&!isNaN(r)&&du>0){a[P+'RW']+=r*du;a[P+'DW']+=du;}};
            add('tp',s.tpLoad,s.tpRPE,s.tpDuration);
            add('sc',s.scLoad,s.scRPE,s.scDuration);
            add('gm',s.gameLoad,s.gameRPE,s.gameDuration);
          });
          const labels=days7.map((d,i)=>`${DN[i]} ${fd(d).slice(0,5)}`);
          const tpVals=days7.map(d=>agg[d]?.tpLoad||0);
          const scVals=days7.map(d=>agg[d]?.scLoad||0);
          const gmVals=days7.map(d=>agg[d]?.gmLoad||0);
          // Segment RPE = duration-weighted average across that day's sessions in that category
          // (for a single session this is exactly its own RPE).
          const wAvg=(d,P)=>agg[d]&&agg[d][P+'DW']>0?agg[d][P+'RW']/agg[d][P+'DW']:null;
          const tpRPEs=days7.map(d=>wAvg(d,'tp'));
          const scRPEs=days7.map(d=>wAvg(d,'sc'));
          const gmRPEs=days7.map(d=>wAvg(d,'gm'));
          const weekTotal=tpVals.reduce((a,b)=>a+b,0)+scVals.reduce((a,b)=>a+b,0)+gmVals.reduce((a,b)=>a+b,0);
          const dailyTotals=days7.map((d,i)=>tpVals[i]+scVals[i]+gmVals[i]);
          const activeDays=dailyTotals.filter(v=>v>0).length;
          const cumAU=Math.round(weekTotal);
          const avgAU=activeDays?Math.round(weekTotal/activeDays):0;
          const peakAU=Math.round(Math.max(0,...tpVals,...scVals,...gmVals));
          const rpeByDs=[tpRPEs,scRPEs,gmRPEs];
          const SRC_LABELS=[L('Top Çalışması','Team Practice'),'S&C',L('Maç','Game')];
          const fmtRPE=x=>x==null?'':(Number(x)%1===0?String(Number(x)):Number(x).toFixed(1));
          // Real session titles for the hover tooltip — matched from the athlete's calendar
          // by date + source category (tp / sc / gm), so a bar segment shows the actual
          // session name(s) (e.g. "Temel Kuvvet & Güç", "Recovery Session"). Falls back to
          // the source label when no calendar session is found (e.g. Notion-only data).
          const sesCat=s=>{const lt=(s.loadType||'').toLowerCase(),p=(s.purpose||'').toLowerCase(),n=(s.name||'').toLowerCase();
            if(s.rpeCat==='game'||p.includes('game')||p.includes('match')||n.includes('maç')||n.includes('match')||n.includes('game'))return'gm';
            if(s.rpeCat==='sc'||lt.includes('mechanical')||lt.includes('neuromuscular'))return'sc';
            return'tp';};
          const namesByDay={};
          days7.forEach(d=>{const o={tp:[],sc:[],gm:[]};((ath.days&&ath.days[d]&&ath.days[d].sessions)||[]).forEach(s=>{if(s.name)o[sesCat(s)].push(s.name);});namesByDay[d]=o;});
          const namesFor=(dsIdx,dayIdx)=>{const cat=['tp','sc','gm'][dsIdx];return(namesByDay[days7[dayIdx]]&&namesByDay[days7[dayIdx]][cat])||[];};
          // Middle-of-segment label = that segment's RPE (plain number). Top label = total AU.
          const rpeMid=arr=>({display:ctx=>ctx.dataset.data[ctx.dataIndex]>=50&&arr[ctx.dataIndex]!=null,anchor:'center',align:'center',color:'#fff',font:{weight:'600',size:13},formatter:(v,ctx)=>fmtRPE(arr[ctx.dataIndex])});
          const totalLbl={display:true,align:'end',anchor:'end',color:'#eef1f5',font:{weight:'700',size:12},formatter:(v,ctx)=>{const i=ctx.dataIndex;const t=ctx.chart.data.datasets.reduce((s,ds)=>s+(ds.data[i]||0),0);return t>0?Math.round(t).toLocaleString():'';}};
          return(<div>
            <div className="srpe-stats">
              <div className="srpe-stat"><div className="v" style={{color:'#5b9bff'}}>{avgAU.toLocaleString()}</div><div className="k">{L('Ort. sRPE · AU','Avg sRPE · AU')}</div></div>
              <div className="srpe-stat"><div className="v">{peakAU.toLocaleString()}</div><div className="k">{L('En yüksek seans','Peak session')}</div></div>
              <div className="srpe-stat"><div className="v">{cumAU.toLocaleString()}</div><div className="k">{L('Toplam','Cumulative')}</div></div>
            </div>
            <div className="chart-box" style={{marginBottom:12,height:380}}>
              {weekTotal>0?<ChartC type="bar" chartData={{labels,datasets:[
                {label:SRC_LABELS[0],data:tpVals,backgroundColor:'transparent',solidColor:'rgb(245,147,40)',hoverSolidColor:'rgb(255,166,74)',stack:'load',maxBarThickness:74,datalabels:rpeMid(tpRPEs)},
                {label:'S&C',data:scVals,backgroundColor:'transparent',solidColor:'rgb(26,168,95)',hoverSolidColor:'rgb(38,190,114)',stack:'load',maxBarThickness:74,datalabels:rpeMid(scRPEs)},
                {label:SRC_LABELS[2],data:gmVals,backgroundColor:'transparent',solidColor:'rgb(239,68,68)',hoverSolidColor:'rgb(248,100,100)',stack:'load',maxBarThickness:74,datalabels:{labels:{total:totalLbl,rpe:rpeMid(gmRPEs)}}},
              ]}} plugins={[roundBars]} options={{responsive:true,maintainAspectRatio:false,
                layout:{padding:{top:28}},
                scales:{x:{...CHART_DARK.scales.x,stacked:true,ticks:{...CHART_DARK.scales.x.ticks,color:'#eef1f5',font:{size:12,weight:'500'}}},y:{...CHART_DARK.scales.y,stacked:true,title:{display:true,text:L('Günlük Yük (AU = RPE × dk)','Daily Load (AU = RPE × min)'),color:'#94a3b8'}}},
                plugins:{legend:{position:'top',align:'end',labels:{...CHART_DARK.plugins.legend.labels,color:'#eef1f5',usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:16,font:{size:12,weight:'500'},generateLabels:chart=>chart.data.datasets.map((ds,i)=>({text:ds.label,fillStyle:ds.solidColor,strokeStyle:ds.solidColor,fontColor:'#ffffff',lineWidth:0,pointStyle:'circle',hidden:!chart.isDatasetVisible(i),datasetIndex:i}))}},
                  tooltip:{enabled:true,mode:'nearest',intersect:true,backgroundColor:'rgba(18,20,25,.94)',borderColor:'rgba(255,255,255,.14)',borderWidth:1,cornerRadius:10,padding:{top:9,bottom:9,left:12,right:12},displayColors:true,boxPadding:5,caretSize:6,titleColor:'#eef1f5',bodyColor:'#cdd3dc',footerColor:'#8b94a3',titleFont:{family:"'Archivo','Space Grotesk',sans-serif",size:13,weight:'700'},bodyFont:{family:"'Archivo','IBM Plex Mono',monospace",size:12},footerFont:{family:"'Archivo','IBM Plex Mono',monospace",size:10,weight:'400'},
                    callbacks:{labelColor:ctx=>({backgroundColor:ctx.dataset.solidColor,borderColor:ctx.dataset.solidColor,borderWidth:0,borderRadius:3}),
                      title:items=>{const it=items[0];if(!it)return'';const nm=namesFor(it.datasetIndex,it.dataIndex);return nm.length?nm.join(' · '):(SRC_LABELS[it.datasetIndex]||it.dataset.label);},
                      label:ctx=>{const r=rpeByDs[ctx.datasetIndex]&&rpeByDs[ctx.datasetIndex][ctx.dataIndex];const au=Math.round(ctx.parsed.y);return '  '+(SRC_LABELS[ctx.datasetIndex]||'')+' · '+au.toLocaleString()+' AU'+(r!=null?' · RPE '+fmtRPE(r):'');},
                      footer:items=>{const it=items[0];return it?labels[it.dataIndex]:'';}}}}}}/>:
              <div className="empty-st">{L('Bu hafta sRPE kaydı yok — ‹ Hafta / Hafta › ile gezin ya da En son’a bas.','No sRPE entries this week — try ‹ Week / Week › or click Latest.')}</div>}
            </div>
            <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:srpeTableOpen?10:0}}>
              <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ayrıntılı kayıtlar','Detailed records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.srpeLog.length} {L('satır','rows')})</span></strong>
              <button className="btn sec sm" onClick={()=>setSrpeTableOpen(o=>!o)}>{srpeTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
            </div>
            {srpeTableOpen&&(()=>{const rev=[...ath.srpeLog].reverse();const vis=rev.slice(0,srLimit);const hasMore=rev.length>srLimit;
              return<div style={{overflowX:'auto'}}><table><thead><tr>
                <th>{L('Tarih','Date')}</th><th>TP RPE</th><th>{L('TP dk','TP min')}</th><th>TP AU</th><th>S&C RPE</th><th>{L('S&C dk','S&C min')}</th><th>S&C AU</th><th>{L('Maç RPE','Game RPE')}</th><th>{L('Maç dk','Game min')}</th><th>{L('Maç AU','Game AU')}</th><th>{L('Toplam AU','Total AU')}</th><th>{L('Kaynak','Source')}</th><th style={{width:50}}></th>
              </tr></thead><tbody>
                {vis.map((s,idx)=>{const realIdx=ath.srpeLog.length-1-idx;
                  const us=(k,v)=>{const a=[...ath.srpeLog];a[realIdx]={...a[realIdx],[k]:v};
                    const r=a[realIdx];
                    const tp=(Number(r.tpRPE)||0)*(Number(r.tpDuration)||0);const sc=(Number(r.scRPE)||0)*(Number(r.scDuration)||0);const gm=(Number(r.gameRPE)||0)*(Number(r.gameDuration)||0);
                    a[realIdx]={...r,tpLoad:tp||'',scLoad:sc||'',gameLoad:gm||'',totalLoad:(tp+sc+gm)||''};
                    updAth(ath.id,{srpeLog:a});};
                  return<tr key={s.id||idx}>
                    <td><input type="date" value={s.date} onChange={e=>us('date',e.target.value)} style={{width:130}}/><div className="help">{fd(s.date)}</div></td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.tpRPE??''} onChange={e=>us('tpRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.tpDuration??''} onChange={e=>us('tpDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.tpLoad||'—'}</td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.scRPE??''} onChange={e=>us('scRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.scDuration??''} onChange={e=>us('scDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.scLoad||'—'}</td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.gameRPE??''} onChange={e=>us('gameRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.gameDuration??''} onChange={e=>us('gameDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.gameLoad||'—'}</td>
                    <td style={{color:'var(--accent)',fontWeight:700}}>{s.totalLoad||'—'}</td>
                    <td>{(s.srcId||s.notionId)?<span className="team-badge">TALLY</span>:<span className="tag" style={{background:'var(--elevated)',color:'var(--muted)'}}>{L('ELLE','MANUAL')}</span>}</td>
                    {/* Deleting a Tally-sourced row also tombstones its submission id.
                        Without that the next Tally Sync finds no entry carrying the id and
                        adds it straight back — the coach deletes the same day forever. */}
                    <td><button className="btn xs danger" onClick={()=>{
                      const row=ath.srpeLog[realIdx];
                      const src=row&&(row.srcId||row.notionId);
                      const upd={srpeLog:ath.srpeLog.filter((_,j)=>j!==realIdx)};
                      if(src)upd.deletedSrpeSrcIds=[...new Set([...(ath.deletedSrpeSrcIds||[]),src])];
                      updAth(ath.id,upd);
                    }}>✕</button></td>
                  </tr>;})}
              </tbody></table>
              <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
                {hasMore&&<button className="btn sm sec" onClick={()=>setSrLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-srLimit} kaldı)`,`Show 10 more (${rev.length-srLimit} remaining)`)}</button>}
                {srLimit>10&&<button className="btn sm sec" onClick={()=>setSrLimit(10)}>{L('Daralt','Collapse')}</button>}
                <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
              </div></div>;
            })()}
          </div>);
        })()}
      </div>
    </div>}

    {tab==='calendar'&&<><CalendarView days={ath.days||{}} selected={athSel} setSelected={setAthSel}
      goDayView={k=>{setAthDayKey(k);}} weeks={weeks}
      saveDays={saveAthDays} setup={setup} labelOwner={ath.name} exercises={exercises}/>
    <MuscleLoadDistribution days={ath.days||{}} refDate={athSel.date}/></>}

    {tab==='report'&&(()=>{
      // Stat-row summaries on top of the existing ReportsBody (mockup design)
      const wkS=wk(parseD(athSel.date));const wkE=fmt(addD(parseD(wkS),6));
      const prevS=fmt(addD(parseD(wkS),-7));const prevE=fmt(addD(parseD(wkS),-1));
      const sumLoad=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).reduce((x,ses)=>x+(Number(ses.au)||0),0),0);
      const sumDur=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).reduce((x,ses)=>x+(Number(ses.duration)||0),0),0);
      const avgRPE=(s,e)=>{const rs=Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).flatMap(([,d])=>(d.sessions||[]).map(x=>Number(x.sRPE)).filter(n=>!isNaN(n)&&n>0));return rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length):null;};
      const sessCount=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).length,0);
      const wkLoad=Math.round(sumLoad(wkS,wkE));const prevLoad=Math.round(sumLoad(prevS,prevE));const loadDelta=wkLoad-prevLoad;
      const wkRPE=avgRPE(wkS,wkE);const wkDur=sumDur(wkS,wkE);
      const recentReadiness=(ath.wellness||[]).filter(w=>w.date>=wkS&&w.date<=wkE&&w.readiness!==''&&w.readiness!=null).map(w=>Number(w.readiness));
      const wkReadiness=recentReadiness.length?recentReadiness.reduce((a,b)=>a+b,0)/recentReadiness.length:null;
      // Monthly = last 4 weeks
      const m4start=fmt(addD(parseD(wkS),-21));const m4end=wkE;
      const mLoad=sumLoad(m4start,m4end);const avgWkLoad=Math.round(mLoad/4);const totalSess=sessCount(m4start,m4end);
      const mReady=(ath.wellness||[]).filter(w=>w.date>=m4start&&w.date<=m4end&&w.readiness!==''&&w.readiness!=null).map(w=>Number(w.readiness));
      const avgReady=mReady.length?(mReady.reduce((a,b)=>a+b,0)/mReady.length):null;
      const mRHR=(ath.wellness||[]).filter(w=>w.date>=m4start&&w.date<=m4end&&w.RHR!==''&&w.RHR!=null).map(w=>Number(w.RHR));
      const avgRHR=mRHR.length?(mRHR.reduce((a,b)=>a+b,0)/mRHR.length):null;
      return(<div>
        <div className="panel">
          <div className="ath-section-h"><div className="t">{L('Haftalık Rapor','Weekly Report')}</div><div className="s">{L('bu hafta','current week')} · {fd(wkS).slice(0,5)} → {fd(wkE).slice(0,5)}</div></div>
          <div className="ath-stat-row" style={{marginBottom:0}}>
            <div className="ath-stat"><div className="k">{L('Bu hafta yük','This week load')}</div><div className="v">{wkLoad.toLocaleString('en-US').replace(/,/g,'.')}<span className="u">AU</span></div>{prevLoad>0&&<div className={`d ${loadDelta>=0?'pos':'neg'}`}>{loadDelta>=0?'+':''}{loadDelta} {L('geçen haftaya göre','vs prev wk')}</div>}</div>
            <div className="ath-stat"><div className="k">{L('Ort. sRPE','Avg sRPE')}</div><div className="v">{wkRPE!=null?wkRPE.toFixed(1):'—'}</div><div className="sub">{L('seans şiddeti','session intensity')}</div></div>
            <div className="ath-stat"><div className="k">{L('Hacim','Volume')}</div><div className="v">{wkDur}<span className="u">{L('dk','min')}</span></div><div className="sub">{L('toplam seans süresi','total session time')}</div></div>
            <div className="ath-stat"><div className="k">{L('Hazır Oluş','Readiness')}</div><div className="v">{wkReadiness!=null?wkReadiness.toFixed(1):'—'}</div><div className="sub">/ 10</div></div>
          </div>
        </div>
        <div className="panel">
          <div className="ath-section-h"><div className="t">{L('Aylık Rapor','Monthly Report')}</div><div className="s">{L('son 4 hafta','last 4 weeks')}</div></div>
          <div className="ath-stat-row" style={{marginBottom:0}}>
            <div className="ath-stat"><div className="k">{L('Ort. haftalık yük','Avg weekly load')}</div><div className="v">{avgWkLoad.toLocaleString('en-US').replace(/,/g,'.')}<span className="u">AU</span></div></div>
            <div className="ath-stat"><div className="k">{L('Toplam seans','Total sessions')}</div><div className="v">{totalSess}</div></div>
            <div className="ath-stat"><div className="k">{L('Ort. hazır oluş','Avg readiness')}</div><div className="v">{avgReady!=null?avgReady.toFixed(1):'—'}</div></div>
            <div className="ath-stat"><div className="k">{L('Ort. RHR','Avg RHR')}</div><div className="v">{avgRHR!=null?Math.round(avgRHR):'—'}<span className="u">bpm</span></div></div>
          </div>
        </div>
        <ReportsBody days={ath.days||{}} weeks={weeks} selected={athSel} setSelected={setAthSel} ownerName={ath.name} onExportPDF={exportPDF}/>
      </div>);
    })()}

  </div>);
}

