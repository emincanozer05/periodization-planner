/* The athlete's tabs, as line icons: a figure for the profile, a pulse for the athletic
   profile, a calendar, a ruler for the tape measure, a heart crossed by a pulse for the
   injuries and a heart for wellness. Drawn in currentColor, so a tab's icon takes the
   tab's own colour when it is on. */
const ATH_IC={
  profile:['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M4.5 20.5c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6'],
  training:['M2.8 12.6h3.8l2.4-6.2 4.8 11.6 2.6-5.4h4.8'],
  calendar:['M4.5 5.5h15v14.5h-15z','M4.5 9.6h15','M8.5 3.5v4','M15.5 3.5v4','M8.4 13.2h.01','M12 13.2h.01','M15.6 13.2h.01','M8.4 16.7h.01','M12 16.7h.01'],
  body:['M3.6 16.4L16.4 3.6l4 4L7.6 20.4z','M7.3 12.7l1.8 1.8','M9.8 10.2l1.3 1.3','M12.3 7.7l1.8 1.8','M14.8 5.2l1.3 1.3'],
  injuries:['M12 20.2s-7.6-4.6-7.6-10.3a4.3 4.3 0 0 1 7.6-2.8 4.3 4.3 0 0 1 7.6 2.8c0 5.7-7.6 10.3-7.6 10.3z','M6.6 12.4h2.8l1.4-2.4 2 4.2 1.5-1.8h3.1'],
  wellness:['M12 20.2s-7.6-4.6-7.6-10.3a4.3 4.3 0 0 1 7.6-2.8 4.3 4.3 0 0 1 7.6 2.8c0 5.7-7.6 10.3-7.6 10.3z'],
  shield:['M12 3.4l7 2.6v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6z'],
  pulse:['M2.8 12.6h3.8l2.4-6.2 4.8 11.6 2.6-5.4h4.8'],
  cal:['M4.5 5.5h15v14.5h-15z','M4.5 9.6h15','M8.5 3.5v4','M15.5 3.5v4'],
  camera:['M4.6 7.6h3l1.4-2.2h6l1.4 2.2h3a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4V9.2a1.6 1.6 0 0 1 1.6-1.6z','M12 16.6a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z'],
};
const AthIc=({k,size})=>{const s=size||18;
  return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(ATH_IC[k]||[]).map((d,i)=><path key={i} d={d}/>)}</svg>);};
const ATH_TAB_IDS=['profile','training','calendar','body','injuries','wellness'];
function AthleteDetail({ath,onBack,updAth,setup,weeks,exercises,ai,customTests,initialTab}){
  /* Normally the profile, but a wellness notification opens straight onto the tab it
     is about — the coach tapped a line about last night's sleep, not a biography. */
  const[tab,setTab]=useState(ATH_TAB_IDS.includes(initialTab)?initialTab:'profile');
  const[editProfileOpen,setEditProfileOpen]=useState(false);
  const[dobText,setDobText]=useState('');
  useEffect(()=>{setDobText(fd(ath.dateOfBirth));},[ath.dateOfBirth,editProfileOpen]);
  // Find the most recent date that has any data (sessions/wellness/measurements)
  // so the calendar opens on a week with actual data instead of an empty one.
  const recentDate=useMemo(()=>{
    const all=new Set();
    Object.values(ath.days||{}).forEach(d=>{if(d?.sessions?.length)all.add(d.date);});
    (ath.wellness||[]).forEach(w=>{if(w.date)all.add(w.date);});
    (ath.measurements||[]).forEach(m=>{if(m.date)all.add(m.date);});
    const arr=[...all].sort();return arr.length?arr[arr.length-1]:fmt(today);
  },[ath.id]); // only recompute when switching athletes
  const recentParsed=parseD(recentDate);
  const[athSel,setAthSel]=useState({year:recentParsed.getFullYear(),month:recentParsed.getMonth()+1,date:recentDate});
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

  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  // Header snapshot metrics — at the athlete's most recent logged date
  const apRef=athLatestDate(ath);
  const apL7=athLoadSum(ath,fmt(addD(parseD(apRef),-6)),apRef);
  const apAcwr=athACWR(ath,apRef);
  const apRd=athWellnessVal(ath,'readiness',apRef);
  const apRhr=athWellnessVal(ath,'RHR',apRef);
  const apEntries=(ath.srpeLog||[]).length;
  const apCheckins=(ath.wellness||[]).length;
  const apRcls=apRd==null?'na':apRd>=4?'':apRd>=3?'warn':'bad';
  /* Six tabs. Load has no tab of its own: the athlete's load is read where it is made —
     on their calendar, day by day, with the week's totals and monotony above it. */
  const ATH_TABS=[
    {id:'profile',l:L('Sporcu Profili','Athlete Profile')},
    {id:'training',l:L('Atletik Profil','Athletic Profile')},
    {id:'calendar',l:L('Takvim','Calendar')},
    {id:'body',l:L('Antropometri','Anthropometry')},
    {id:'injuries',l:L('Sakatlıklar','Injuries')},
    {id:'wellness',l:'Wellness'},
  ];
  const pickPhoto=()=>photoRef.current?.click();
  return(<div>
    <button className="back" onClick={onBack} style={{marginBottom:14}}>‹ {L('Sporcular','Athletes')}</button>
    <div className="ap-head">
      <div className="ap-av-wrap">
        <div className={`ap-av ${apRcls}`} onClick={pickPhoto} title={L('Fotoğrafı değiştirmek için tıkla (ya da kopyaladığın fotoğrafı Ctrl/⌘+V ile yapıştır)','Click to change photo (or paste a copied photo with Ctrl/⌘+V)')}>
          {ath.photo?<img src={mediaSrc(ath.photo)} alt=""/>:initials}
          <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'athletes',d=>updAth(ath.id,{photo:d}));e.target.value='';}}/>
        </div>
        <button className="ap-paste" title={L('Fotoğraf seç','Choose a photo')} aria-label={L('Fotoğraf seç','Choose a photo')}
          onClick={e=>{e.stopPropagation();pickPhoto();}}><AthIc k="camera" size={13}/></button>
      </div>
      <div className="ap-id">
        <h1>{ath.name||L('Adsız Sporcu','Unnamed Athlete')}{ath.number&&<span className="ap-num">#{ath.number}</span>}</h1>
        <div className="ap-meta">
          {ath.position&&<span><AthIc k="shield" size={14}/>{POS_FULL[ath.position]||ath.position}</span>}
          <span><AthIc k="pulse" size={14}/>{L(`${apEntries} yük kaydı`,`${apEntries} load entries`)}</span>
          <span><AthIc k="cal" size={14}/>{L(`${apCheckins} check-in`,`${apCheckins} check-ins`)}</span>
        </div>
      </div>
      <div className="ap-stats">
        <div className="ap-stat"><div className="k">{L('Hazır Oluş','Readiness')}</div><div className="v" style={{color:readyColor(apRd)}}>{apRd!=null?<CountUp value={apRd} decimals={1}/>:'—'}<small>/5</small></div></div>
        <div className="ap-stat"><div className="k">RHR</div><div className="v">{apRhr!=null?<CountUp value={apRhr} decimals={0}/>:'—'}<small>bpm</small></div></div>
        <div className="ap-stat"><div className="k">{L('7g yük','7d load')}</div><div className="v" style={{color:'#3b6ef5'}}>{apL7?<CountUp value={apL7} format={x=>Math.round(x).toLocaleString('en-US').replace(/,/g,'.')}/>:'—'}<small>AU</small></div></div>
        <div className="ap-stat"><div className="k">ACWR</div><div className="v" style={{color:acwrZoneOf(apAcwr).c}}>{apAcwr?<CountUp value={apAcwr} decimals={2}/>:'—'}</div></div>
      </div>
      {/* The athlete on paper, for the people the coach reports to: profile, the head
          coach's observations, the athletic profile and the injury record, A4 portrait. */}
      <button className="ap-info" onClick={()=>printAthleteInfo(ath,setup,exercises)}
        title={L('Sporcu Profili, Baş Antrenör Gözlemleri, Atletik Profil ve Sakatlıklar — A4 dikey PDF','Athlete Profile, Head Coach Observations, Athletic Profile and Injuries — A4 portrait PDF')}>{L('Bilgileri Al','Get Info')}</button>
      <button className="ap-edit" onClick={()=>setEditProfileOpen(true)} title={L('Profili düzenle','Edit profile')}>✎</button>
    </div>
    <div className="ath-tabs ath-tabs2" role="tablist">{ATH_TABS.map(t=><button key={t.id} role="tab" aria-selected={tab===t.id} className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}><AthIc k={t.id} size={19}/><span>{t.l}</span></button>)}</div>
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
          <div style={{marginTop:12}}><label>{L('Notlar','Notes')}</label><textarea value={ath.notes} onChange={e=>updAth(ath.id,{notes:e.target.value})} placeholder={L('Özel durumlar…','Special considerations…')}/></div>
          <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}><button className="btn sm" onClick={()=>setEditProfileOpen(false)}>{L('Bitti','Done')}</button></div>
        </div>
      </div>
    </div>}
    {tab==='injuries'&&<AthInjuries ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='body'&&<AthBody ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='wellness'&&<AthWellness ath={ath} updAth={updAth}/>}
    {tab==='calendar'&&<><CalendarView days={ath.days||{}} selected={athSel} setSelected={setAthSel}
      goDayView={()=>{}} weeks={weeks}
      saveDays={saveAthDays} setup={setup} labelOwner={ath.name} exercises={exercises} ownerAth={ath}/>
    <MuscleLoadDistribution days={ath.days||{}} refDate={athSel.date}/></>}
  </div>);
}

/* ---- Injuries: one row per record, opened to edit ----
   A record is a single line until it is opened — status, where, the grade, when it
   happened and how long it kept the athlete out — so a long history stays one screen
   tall. A record just added opens itself; it is waiting to be filled in. */
function injMissed(inj,setup){
  const sd=inj.sidelinedDate,ar=inj.actualReturn;
  if(!sd)return{days:null,matches:null};
  const endDate=ar||fmt(today);
  if(endDate<sd)return{days:null,matches:null};
  return{days:Math.max(0,diffD(sd,endDate)),matches:(setup.competitions||[]).filter(c=>c.date>=sd&&c.date<=endDate).length};
}
function AthInjuries({ath,updAth,setup}){
  const[open,setOpen]=useState(null);
  const list=ath.injuries||[];
  const order=list.map((inj,idx)=>({inj,idx})).sort((a,b)=>(b.inj.date||'').localeCompare(a.inj.date||''));
  const nActive=list.filter(i=>!i.actualReturn).length;
  const add=()=>{const inj={id:uid(),date:fmt(today),context:'Training',mechanism:'',side:'',location:'',tissueType:'',type:'',grade:'1',firstInjuryDay:fmt(today),sidelinedDate:fmt(today),estimatedReturn:'',actualReturn:'',status:'Active',notes:''};
    updAth(ath.id,{injuries:[...list,inj]});setOpen(inj.id);};
  const sideTr={Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral'),'N/A':''};
  return(<div>
    <div className="row" style={{justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h2 className="ath-h2">{L('Sporcu Sakatlık Kaydı','Athlete Injury Record')} <span>{list.length} {L('kayıt','records')}{nActive?` · ${nActive} ${L('aktif','active')}`:''}</span></h2>
      <button className="btn sm" onClick={add}>+ {L('Sakatlık Ekle','Add Injury')}</button>
    </div>
    {list.length===0&&<div className="empty-st">{L('Kayıtlı sakatlık yok','No injuries recorded')}</div>}
    <div className="inj-list">{order.map(({inj,idx})=>{
      const ui=(k,v)=>{const a=[...ath.injuries];a[idx]={...a[idx],[k]:v};updAth(ath.id,{injuries:a});};
      const miss=injMissed(inj,setup);
      const isActive=!inj.actualReturn;
      const key=inj.id||idx;
      const isOpen=open===key;
      const where=[sideTr[inj.side]||'',inj.location||''].filter(Boolean).join(' ');
      return(<div key={key} className={`inj-row${isOpen?' open':''}${isActive?' act':''}`}>
        <button className="inj-sum" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:key)}>
          <span className={`inj-pill ${isActive?'inj':'ok'}`}>{isActive?L('AKTİF','ACTIVE'):L('İYİLEŞTİ','RECOVERED')}</span>
          <span className="inj-t">{where||inj.type||L('(belirtilmemiş sakatlık)','(unspecified injury)')}{inj.type&&where?<em> · {inj.type}</em>:null}</span>
          <span className="inj-m">{inj.grade?`${L('Derece','Grade')} ${inj.grade}`:''}</span>
          <span className="inj-m">{inj.date?fd(inj.date):'—'}{inj.actualReturn?` → ${fd(inj.actualReturn)}`:''}</span>
          <span className="inj-m inj-days">{miss.days!=null?L(`${miss.days} gün`,`${miss.days} d`):'—'}</span>
          <span className="inj-car" aria-hidden="true">▾</span>
        </button>
        {isOpen&&<div className="inj-body">
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
          <div style={{marginBottom:10}}><label>{L('Notlar','Notes')}</label><textarea value={inj.notes||''} onChange={e=>ui('notes',e.target.value)} rows={2} placeholder={L('Tedavi, rehabilitasyon, dönüş kriterleri…','Treatment, rehabilitation, return criteria…')}/></div>
          <div className="inj-foot">
            <div className="inj-stat"><div className="k">{L('Kaçırılan Antrenman','Missed Training')}</div><div className="v">{miss.days!=null?miss.days:'—'}<span className="u">{L('gün','days')}</span></div></div>
            <div className="inj-stat"><div className="k">{L('Kaçırılan Maç','Missed Matches')}</div><div className="v">{miss.matches!=null?miss.matches:'—'}</div></div>
            <button className="btn xs danger" onClick={()=>{if(confirm(L('Bu sakatlık kaydı silinsin mi?','Delete this injury record?'))){updAth(ath.id,{injuries:ath.injuries.filter((_,j)=>j!==idx)});setOpen(null);}}}>✕ {L('Sil','Delete')}</button>
          </div>
        </div>}
      </div>);
    })}</div>
  </div>);
}

/* ---- Anthropometry ----
   Six measures, two to a row and kept short, so the trend of each is read without
   scrolling: height, weight, body fat, wingspan, leg length and trunk length. */
const BODY_FIELDS=[
  {k:'height',tr:'Boy',en:'Height',u:'cm',c:'#a855f7',good:null},
  {k:'weight',tr:'Kilo',en:'Weight',u:'kg',c:'#3b82f6',good:null},
  {k:'bodyFat',tr:'Yağ Oranı',en:'Body Fat',u:'%',c:'#f97316',good:false},
  {k:'wingspan',tr:'Kulaç',en:'Wingspan',u:'cm',c:'#10b981',good:null},
  {k:'legLength',tr:'Bacak Uzunluğu',en:'Leg Length',u:'cm',c:'#0ea5e9',good:null},
  {k:'trunkLength',tr:'Gövde Uzunluğu',en:'Trunk Length',u:'cm',c:'#e11d48',good:null},
];
function AthBody({ath,updAth,setup}){
  const[tableOpen,setTableOpen]=useState(false);
  const[mLimit,setMLimit]=useState(10);
  const ms=ath.measurements||[];
  const sorted=ms.filter(m=>m.date).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const cur=sorted[sorted.length-1],prev=sorted[sorted.length-2];
  const d=(a,b,k,dp=1)=>{const v1=Number(a?.[k]),v2=Number(b?.[k]);if(!a||!b||isNaN(v1)||isNaN(v2)||a[k]===''||b[k]==='')return null;return+(v1-v2).toFixed(dp);};
  const w=cur?Number(cur.weight)||null:null,bf=cur?Number(cur.bodyFat)||null:null,ws=cur?Number(cur.wingspan)||null:null;
  const dw=d(cur,prev,'weight'),dbf=d(cur,prev,'bodyFat'),dws=d(cur,prev,'wingspan');
  const fmtD=(v,u)=>v==null?null:(v>0?`+${v}${u}`:`${v}${u}`);
  const labels=sorted.map(m=>{const dt=parseD(m.date);return MN[dt.getMonth()];});
  const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',font:{size:10,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,formatter:v=>v==null?'':(+Number(v).toFixed(1))});
  const card=f=>{
    const data=sorted.map(m=>{const raw=m[f.k];if(raw===''||raw==null)return null;const v=Number(raw);return(isNaN(v)||v===0)?null:v;});
    const valid=data.filter(v=>v!=null);
    const last=valid.length?valid[valid.length-1]:null,first=valid.length?valid[0]:null;
    const imp=valid.length>1?+((last-first).toFixed(1)):null;
    const fav=(imp==null||f.good==null)?null:(f.good?imp>0:imp<0);
    return(<div key={f.k} className="metric-card body-card">
      <div className="mc-h"><div className="mc-t">{L(f.tr,f.en)}</div><div className="mc-u">{f.u}</div></div>
      <div className="mc-val"><span className="mv" style={{color:f.c}}>{last!=null?last:'—'}</span>{imp!=null&&imp!==0&&<span className={`md ${fav==null?'':(fav?'pos':'neg')}`}>{imp>0?'+':''}{imp}</span>}</div>
      <div className="mc-chart">{valid.length?<ChartC type="line" chartData={{labels,datasets:[
        {label:L(f.tr,f.en),data,borderColor:f.c,backgroundColor:f.c+'1f',fill:'origin',tension:.35,spanGaps:true,borderWidth:2.2,
          pointRadius:3.5,pointHoverRadius:5.5,pointBackgroundColor:f.c,pointBorderColor:'#0d0f13',pointBorderWidth:1.2,
          datalabels:dataLbl(f.c)}
      ]}} options={{responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:20,bottom:4,left:8,right:8}},
        scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:10},autoSkip:true,maxRotation:0,maxTicksLimit:7},grid:{display:false},border:{display:false}},
          y:{display:false,grid:{display:false},beginAtZero:false}},
        plugins:{legend:{display:false},tooltip:{enabled:true}}}}/>
        :<div className="body-none">{L('Henüz ölçüm yok','No measurement yet')}</div>}</div>
    </div>);
  };
  return(<div>
    <div className="ath-stat-row body-stats" style={{gridTemplateColumns:`repeat(${dws!=null?6:5},minmax(0,1fr))`}}>
      <div className="ath-stat"><div className="k">{L('Güncel Kilo','Current Wt')}</div><div className="v">{w!=null?w:'—'}<span className="u">kg</span></div></div>
      <div className="ath-stat"><div className="k">{L('Değişim','Change')}</div><div className="v">{fmtD(dw,'')||'—'}<span className="u">kg</span></div>{dw!=null&&<div className={`d ${dw>0?'pos':'neg'}`}>{dw>0?L('arttı','gain'):L('azaldı','loss')}</div>}</div>
      <div className="ath-stat"><div className="k">{L('Yağ Oranı','Body Fat')}</div><div className="v">{bf!=null?bf:'—'}<span className="u">%</span></div></div>
      <div className="ath-stat"><div className="k">{L('Yağ Değişimi','BF Change')}</div><div className="v">{fmtD(dbf,'')||'—'}<span className="u">%</span></div>{dbf!=null&&<div className={`d ${dbf<0?'pos':'neg'}`}>{dbf<0?L('daha iyi','better'):L('daha yüksek','higher')}</div>}</div>
      <div className="ath-stat"><div className="k">{L('Kulaç','Wingspan')}</div><div className="v">{ws!=null?ws:'—'}<span className="u">cm</span></div></div>
      {dws!=null&&<div className="ath-stat"><div className="k">{L('Kulaç Değişimi','WS Change')}</div><div className="v">{fmtD(dws,'')}<span className="u">cm</span></div><div className={`d ${dws>0?'pos':'neg'}`}>{dws>0?L('arttı','gain'):L('azaldı','loss')}</div></div>}
    </div>
    <div className="panel">
      <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h2 style={{margin:0}}>{L('Vücut Kompozisyonu Takibi','Body Composition Tracking')}</h2>
        <div className="row" style={{gap:6}}>
          <button className="btn sec sm" disabled={ms.length===0} onClick={()=>printBodyComp(ath,setup)} title={L('Vücut Kompozisyonu raporu (A4 çıktı)','Body Composition report (A4 print)')}>⎙ {L('Çıktı al','Print')}</button>
          {/* A new row is an empty row waiting to be typed into, so open the table with it
              — otherwise the button looks like it did nothing. */}
          <button className="btn sm" onClick={()=>{const m={id:uid(),date:fmt(today),height:'',weight:'',bodyFat:'',wingspan:'',legLength:'',trunkLength:'',notes:''};updAth(ath.id,{measurements:[...ms,m]});setTableOpen(true);}}>+ {L('Ölçüm Ekle','Add Measurement')}</button>
        </div>
      </div>
      {ms.length>0&&<div>
        <div className="metric-grid body-grid">{BODY_FIELDS.map(card)}</div>
        {/* Collapsible paginated table (10 rows by default, expand in 10s) */}
        <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:tableOpen?10:0}}>
          <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ölçüm kayıtları','Measurement records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ms.length} {L('satır','rows')})</span></strong>
          <button className="btn sec sm" onClick={()=>setTableOpen(o=>!o)}>{tableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
        </div>
        {tableOpen&&(()=>{const rev=ms.map((m,i)=>({m,i})).sort((a,b)=>(b.m.date||'').localeCompare(a.m.date||''));const vis=rev.slice(0,mLimit);const hasMore=rev.length>mLimit;
          return<div style={{overflowX:'auto'}}><table><thead><tr><th>{L('Tarih','Date')}</th><th>{L('Boy (cm)','Height (cm)')}</th><th>{L('Kilo (kg)','Weight (kg)')}</th><th>{L('Yağ (%)','Body Fat (%)')}</th><th>{L('Kulaç (cm)','Wingspan (cm)')}</th><th>{L('Bacak (cm)','Leg (cm)')}</th><th>{L('Gövde (cm)','Trunk (cm)')}</th><th>{L('Notlar','Notes')}</th><th style={{width:50}}></th></tr></thead><tbody>
            {vis.map(({m,i:realIdx},idx)=>{
              const um=(k,v)=>{const a=[...ath.measurements];a[realIdx]={...a[realIdx],[k]:v};updAth(ath.id,{measurements:a});};
              // Rows mirrored from an Anthropometric Measurement test are read-only here —
              // edit them from the Testing tab so the source and Body Comp stay in sync.
              const synced=!!m.srcTest;
              const num=(k,ph,wd)=><td><input type="number" step="0.1" value={m[k]??''} onChange={e=>um(k,e.target.value)} placeholder={ph} style={{width:wd}} disabled={synced}/></td>;
              return<tr key={m.id||idx} style={synced?{opacity:.92}:undefined}>
                <td><input type="date" value={m.date} onChange={e=>um('date',e.target.value)} style={{width:130}} disabled={synced}/><div className="help">{fd(m.date)}</div></td>
                {num('height','cm',76)}{num('weight','kg',76)}{num('bodyFat','%',66)}{num('wingspan','cm',76)}{num('legLength','cm',76)}{num('trunkLength','cm',76)}
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
      {ms.length===0&&<div className="empty-st">{L('Henüz ölçüm yok','No measurements yet')}</div>}
    </div>
  </div>);
}
