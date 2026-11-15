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
/* =========================================================
   PROFİLİ DÜZENLE — sporcunun kimlik kartı (`AthEditProfile`)
   Ekranın neredeyse tamamını kaplayan pencere: solda kare, büyük fotoğraf ve sporcunun
   özeti; sağda başlıklara ayrılmış kartlar — Kişisel Bilgiler, Okul, Veli / Acil Durum,
   Kulüp ve Takım, Sağlık ve İzinler, Polar Bağlantısı, Notlar. Her alan yazıldığı anda
   kaydedilir; "Bitti" yalnızca kapatır.
   Ad ve soyad ayrı tutulur (`firstName`, `lastName`) ama uygulamanın her yerinin okuduğu
   `name` ikisinden yazılır; eski kayıtlarda yalnız `name` varsa son kelime soyad sayılır.
   Telefon kadronun kullandığı `phone` / `phoneCode` çifti; okul eski `school` alanı.
   ========================================================= */
const EP_SCHOOL_TYPES=[['Ortaokul','Middle school'],['Lise','High school'],['Üniversite','University']];
const EP_RELATIONS=[['Anne','Mother'],['Baba','Father'],['Yasal Vasi','Legal guardian']];
const EP_BLOOD=['0 Rh+','0 Rh−','A Rh+','A Rh−','B Rh+','B Rh−','AB Rh+','AB Rh−'];
const EP_AGE_CATS=['U10','U11','U12','U13','U14','U15','U16','U17','U18','U19','U20','U21','U23','Senior'];
const EP_CONSENT=[['yes','İzin verildi','Granted'],['internal','Yalnızca kulüp içi kullanım','Club internal use only'],['no','İzin verilmedi','Not granted']];
/* Ad / soyad: ayrı alanlar yoksa kayıtlı tam addan çıkarılır (son kelime soyad). */
const epNameParts=a=>{
  if(a.firstName!=null||a.lastName!=null)return[a.firstName||'',a.lastName||''];
  const w=String(a.name||'').trim().split(/\s+/).filter(Boolean);
  return w.length<2?[w[0]||'','']:[w.slice(0,-1).join(' '),w[w.length-1]];
};
/* Doğum yılına göre yaş kategorisi önerisi: sezonun bittiği yıl − doğum yılı, bir üst
   çift sayıya yuvarlanır (2026-27 sezonunda 2011 doğumlu → U16). Yalnızca öneri. */
const epAgeCatHint=dob=>{
  if(!dob)return'';const b=parseD(dob);if(isNaN(b))return'';
  const t=new Date();const end=t.getMonth()>=6?t.getFullYear()+1:t.getFullYear();
  let n=end-b.getFullYear();if(n<10)return'U10';if(n>20)return n>23?'Senior':'U23';
  if(n%2)n++;return'U'+n;
};
const epYearsSince=iso=>{
  if(!iso)return null;const b=parseD(iso);if(isNaN(b))return null;
  const t=new Date();let y=t.getFullYear()-b.getFullYear();
  if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return Math.max(0,y);
};
const EpIc=({d,w})=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w||1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p,i)=><path key={i} d={p}/>)}</svg>;
const EP_IC={
  person:['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M4.5 20.5c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6'],
  school:['M2.5 9.5L12 5l9.5 4.5L12 14z','M6.5 11.5v4.3c1.6 1.4 3.4 2.1 5.5 2.1s3.9-.7 5.5-2.1v-4.3','M21.5 9.5v5'],
  family:['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M17 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z','M2.5 20c.8-3.4 3-5.3 5.5-5.3s4.7 1.9 5.5 5.3','M13.8 15.3c.9-.8 2-1.3 3.2-1.3 2.2 0 3.9 1.6 4.5 4.6'],
  club:['M12 3.4l7 2.6v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6z','M9 12l2 2 4-4'],
  health:['M12 3.5c3 3.6 6 7.1 6 10.4a6 6 0 0 1-12 0c0-3.3 3-6.8 6-10.4z','M9.5 14h5','M12 11.5v5'],
  watch:['M8 6.5V3h8v3.5','M8 17.5V21h8v-3.5','M7 6.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z','M12 10v2.5l1.5 1'],
  note:['M5 3.5h10l4 4v13H5z','M15 3.5v4h4','M8.5 12h7','M8.5 15.5h7'],
  camera:ATH_IC.camera,
};
function EpSec({ic,title,sub,cls,children}){
  return(<section className={'ep2-sec'+(cls?' '+cls:'')}>
    <div className="ep2-sec-h"><span className="ep2-sec-ic"><EpIc d={EP_IC[ic]} w={1.9}/></span>
      <div className="ep2-sec-tx"><b>{title}</b>{sub&&<span>{sub}</span>}</div></div>
    {children}
  </section>);
}
function EpF({label,span,id,help,children}){
  return(<div className={'ep-f s'+(span||1)}><label htmlFor={id}>{label}</label>{children}{help&&<div className="help">{help}</div>}</div>);
}
function AthEditProfile({ath,updAth,setup,teamId,positions,onClose}){
  const set=patch=>updAth(ath.id,patch);
  const fileRef=useRef(null);
  const[fn,ln]=epNameParts(ath);
  const setName=(f,l)=>set({firstName:f,lastName:l,name:[f.trim(),l.trim()].filter(Boolean).join(' ')});
  const age=epYearsSince(ath.dateOfBirth);
  const years=epYearsSince(ath.joinDate);
  const hint=epAgeCatHint(ath.dateOfBirth);
  const teamName=ath.team||setup.teamName||'';
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const consent=EP_CONSENT.find(c=>c[0]===ath.mediaConsent);
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[]);
  const txt=(k,ph,extra)=><input id={'ep-'+k} value={ath[k]||''} placeholder={ph||''} onChange={e=>set({[k]:e.target.value})} {...(extra||{})}/>;
  const sel=(k,opts,none)=><select id={'ep-'+k} value={ath[k]||''} onChange={e=>set({[k]:e.target.value})}>
    <option value="">{none||L('— seçilmemiş','— not set')}</option>{opts}</select>;
  const tel=(code,num)=><div className="ep2-ph">
    <select value={ath[code]||DEFAULT_DIAL} onChange={e=>set({[code]:e.target.value})} title={L('Ülke kodu','Country code')} aria-label={L('Ülke kodu','Country code')}>
      {DIAL_CODES.map(c=><option key={c.c} value={c.d}>{c.d} · {c.c}</option>)}</select>
    <input id={'ep-'+num} type="tel" inputMode="tel" placeholder="532 123 45 67" value={ath[num]||''} onChange={e=>set({[num]:cleanPhone(e.target.value)})}/>
  </div>;
  const fact=(k,v)=><div className="ep2-fact"><dt>{k}</dt><dd className={v?'':'na'}>{v||'—'}</dd></div>;
  return(<div className="modal-bg ep2-bg" onClick={onClose}>
    <div className="modal ep-modal ep2" role="dialog" aria-modal="true" aria-labelledby="ep-title" onClick={e=>e.stopPropagation()}>
      <div className="ep-head">
        <div className="ep-ttl">
          <h2 id="ep-title">{L('Profili Düzenle','Edit Profile')}</h2>
          <div className="ep-sub">{L('Sporcu kimlik kartı · değişiklikler yazdıkça kaydedilir','Athlete ID card · changes are saved as you type')}</div>
        </div>
        <button className="x-btn" onClick={onClose} aria-label={L('Kapat','Close')}>✕</button>
      </div>
      <div className="ep2-wrap">
        {/* ---- Sol: fotoğraf ve özet ---- */}
        <aside className="ep2-side">
          <button type="button" className="ep2-photo" onClick={()=>fileRef.current?.click()}
            title={L('Fotoğrafı değiştirmek için tıkla','Click to change the photo')}>
            {ath.photo?<img src={mediaSrc(ath.photo)} alt=""/>:<span className="ini">{initials}</span>}
            <span className="ep2-photo-cta"><EpIc d={EP_IC.camera}/>{ath.photo?L('Fotoğrafı değiştir','Change photo'):L('Fotoğraf yükle','Upload photo')}</span>
          </button>
          <input type="file" accept="image/*" ref={fileRef} className="hidden"
            onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'athletes',d=>set({photo:d}));e.target.value='';}}/>
          <div className="ep2-id">
            <div className="ep2-nm">{ath.name||L('Adsız Sporcu','Unnamed Athlete')}</div>
            <div className="ep2-chips">
              {ath.number!==''&&ath.number!=null&&<span className="ep2-chip num">#{ath.number}</span>}
              {ath.position&&<span className="ep2-chip">{POS_FULL[ath.position]||ath.position}</span>}
              {ath.ageCategory&&<span className="ep2-chip">{ath.ageCategory}</span>}
            </div>
          </div>
          <dl className="ep2-facts">
            {fact(L('Takım','Team'),teamName)}
            {fact(L('Yaş','Age'),age!=null?L(`${age} yaş`,`${age} yrs`):'')}
            {fact(L('Doğum tarihi','Date of birth'),ath.dateOfBirth?fd(ath.dateOfBirth):'')}
            {fact(L('Kulüpte','At the club'),ath.joinDate?(years>0?L(`${years} yıl · ${fd(ath.joinDate)}'den beri`,`${years} yr · since ${fd(ath.joinDate)}`):L(`${fd(ath.joinDate)}'den beri`,`since ${fd(ath.joinDate)}`)):'')}
            {fact(L('Kan grubu','Blood type'),ath.bloodType)}
            {fact(L('Veli','Parent'),ath.parentName?[ath.parentName,ath.parentRelation&&L(ath.parentRelation,(EP_RELATIONS.find(r=>r[0]===ath.parentRelation)||[])[1]||ath.parentRelation)].filter(Boolean).join(' · '):'')}
            <div className="ep2-fact"><dt>{L('Görsel izni','Media consent')}</dt>
              <dd className={'cons '+(consent?consent[0]:'na')}>{consent?L(consent[1],consent[2]):L('Girilmemiş','Not set')}</dd></div>
          </dl>
        </aside>
        {/* ---- Sağ: başlıklara ayrılmış form ---- */}
        <div className="ep-body ep2-main">
          <EpSec ic="person" title={L('Kişisel Bilgiler','Personal Details')} sub={L('Kimlik ve iletişim','Identity and contact')} cls="wide">
            <div className="ep-grid ep2-g4">
              <EpF label={L('Ad','First name')} id="ep-fn" span={1}><input id="ep-fn" value={fn} onChange={e=>setName(e.target.value,ln)}/></EpF>
              <EpF label={L('Soyad','Last name')} id="ep-ln" span={1}><input id="ep-ln" value={ln} onChange={e=>setName(fn,e.target.value)}/></EpF>
              <EpF label={L('Doğum tarihi','Date of birth')} span={1} help={age!=null?L(`gün / ay / yıl · ${age} yaş`,`day / month / year · ${age} yrs`):L('gün / ay / yıl','day / month / year')}>
                <DateDMY value={ath.dateOfBirth||''} onChange={v=>set({dateOfBirth:v})}/></EpF>
              <EpF label={L('Cinsiyet','Sex')} id="ep-sex" span={1}>{sel('sex',<><option value="M">{L('Erkek','Male')}</option><option value="F">{L('Kadın','Female')}</option></>,L('— girilmemiş','— not set'))}</EpF>
              <EpF label={L('Uyruk','Nationality')} id="ep-nationality" span={1}>{txt('nationality',L('ör. T.C.','e.g. Turkish'))}</EpF>
              <EpF label={L('Doğum yeri','Place of birth')} id="ep-birthPlace" span={1}>{txt('birthPlace',L('ör. İzmir','e.g. Izmir'))}</EpF>
              <EpF label={L('Sporcu telefon numarası','Athlete phone')} id="ep-phone" span={2}>{tel('phoneCode','phone')}</EpF>
            </div>
          </EpSec>
          <EpSec ic="school" title={L('Okul','School')} sub={L('Okul planlaması için','For school schedules')}>
            <div className="ep-grid ep2-g2">
              <EpF label={L('Okul adı','School name')} id="ep-school" span={2}>{txt('school',L('ör. Atatürk Anadolu Lisesi','e.g. Central High School'))}</EpF>
              <EpF label={L('Okul türü','School type')} id="ep-schoolType" span={2}>{sel('schoolType',EP_SCHOOL_TYPES.map(([tr,en])=><option key={tr} value={tr}>{L(tr,en)}</option>))}</EpF>
              <EpF label={L('İl','City')} id="ep-schoolCity" span={1}>{txt('schoolCity',L('ör. İzmir','e.g. Izmir'))}</EpF>
              <EpF label={L('İlçe','District')} id="ep-schoolDistrict" span={1}>{txt('schoolDistrict',L('ör. Karşıyaka','e.g. Karşıyaka'))}</EpF>
            </div>
          </EpSec>
          <EpSec ic="family" title={L('Veli / Acil Durum','Parent / Emergency')} sub={L('Ulaşılacak kişi','Who to contact')}>
            <div className="ep-grid ep2-g2">
              <EpF label={L('Veli adı soyadı','Parent full name')} id="ep-parentName" span={2}>{txt('parentName')}</EpF>
              <EpF label={L('Yakınlık derecesi','Relationship')} id="ep-parentRelation" span={2}>{sel('parentRelation',EP_RELATIONS.map(([tr,en])=><option key={tr} value={tr}>{L(tr,en)}</option>))}</EpF>
              <EpF label={L('Veli telefon numarası','Parent phone')} id="ep-parentPhone" span={2}>{tel('parentPhoneCode','parentPhone')}</EpF>
            </div>
          </EpSec>
          <EpSec ic="club" title={L('Kulüp ve Takım','Club and Team')} sub={L('Kadro bilgisi','Squad details')} cls="wide">
            <div className="ep-grid ep2-g4">
              <EpF label={L('Takım','Team')} id="ep-team" span={1}>{txt('team',setup.teamName||L('Takım adı','Team name'))}</EpF>
              <EpF label={L('Yaş kategorisi','Age category')} id="ep-ageCategory" span={1}
                help={hint&&hint!==ath.ageCategory?<button type="button" className="ep2-hint" onClick={()=>set({ageCategory:hint})}>{L(`Doğum yılına göre: ${hint} · uygula`,`By birth year: ${hint} · apply`)}</button>:null}>
                {sel('ageCategory',EP_AGE_CATS.map(c=><option key={c} value={c}>{c==='Senior'?L('Büyükler (A Takım)','Senior'):c}</option>))}</EpF>
              <EpF label={L('Forma numarası','Jersey number')} id="ep-number" span={1}>{txt('number','',{inputMode:'numeric'})}</EpF>
              <EpF label={L('Mevki / Pozisyon','Position')} id="ep-pos" span={1}>
                <select id="ep-pos" value={posOf(ath.position)} onChange={e=>set({position:e.target.value})}>{positions.map(p=><option key={p} value={p}>{POS_FULL[p]&&POS_FULL[p]!==p?`${p} · ${POS_FULL[p]}`:p}</option>)}</select></EpF>
              <EpF label={L('Kulübe katılım tarihi','Joined the club')} span={2}><DateDMY value={ath.joinDate||''} onChange={v=>set({joinDate:v})}/></EpF>
              <EpF label={L('Önceki kulüp','Previous club')} id="ep-prevClub" span={2}>{txt('prevClub',L('yoksa boş bırak','leave empty if none'))}</EpF>
            </div>
          </EpSec>
          <EpSec ic="health" title={L('Sağlık ve İzinler','Health and Consent')} sub={L('Kan grubu, görsel kullanım','Blood type, media use')}>
            <div className="ep-grid ep2-g2">
              <EpF label={L('Kan grubu','Blood type')} id="ep-bloodType" span={2}>{sel('bloodType',EP_BLOOD.map(b=><option key={b} value={b}>{b}</option>))}</EpF>
              <EpF label={L('Fotoğraf ve video kullanım izni','Photo and video consent')} id="ep-mediaConsent" span={2}>{sel('mediaConsent',EP_CONSENT.map(([v,tr,en])=><option key={v} value={v}>{L(tr,en)}</option>))}</EpF>
            </div>
          </EpSec>
          {/* Polar bağlantısı: durum, davet linki, senkron ve bağlantıyı kesme. Bileşenin kendi
              etiketi bölüm başlığıyla tekrar etmesin diye CSS'te gizli (.ep-polar). */}
          <EpSec ic="watch" title={L('Polar Bağlantısı','Polar Connection')} sub={L('Saat / göğüs bandı verisi','Watch / chest strap data')} cls="ep-polar">
            <PolarConnect ath={ath} teamId={teamId}/>
          </EpSec>
          <EpSec ic="note" title={L('Notlar','Notes')} sub={L('Özel durumlar, kısıtlar, aileyle ilgili bilgiler','Special considerations, restrictions, family notes')}>
            <textarea aria-label={L('Notlar','Notes')} rows={4} value={ath.notes||''} onChange={e=>set({notes:e.target.value})} placeholder={L('Özel durumlar…','Special considerations…')}/>
          </EpSec>
        </div>
      </div>
      <div className="ep-foot">
        <span>{L('Değişiklikler yazdıkça kaydedilir.','Changes are saved as you type.')}</span>
        <button className="btn" onClick={onClose}>{L('Bitti','Done')}</button>
      </div>
    </div>
  </div>);
}
const ATH_TAB_IDS=['profile','training','calendar','body','injuries'];
function AthleteDetail({ath,onBack,updAth,setup,teamDays,weeks,exercises,ai,customTests,initialTab,teamId}){
  const[tab,setTab]=useState(ATH_TAB_IDS.includes(initialTab)?initialTab:'profile');
  const[editProfileOpen,setEditProfileOpen]=useState(false);
  const[rpeOpen,setRpeOpen]=useState(false);
  /* Open at the top. The page scrolls as one, so without this the profile kept the
     scroll of the list it was opened from and hid its own header and tabs. The roster
     remounts this per athlete (key), so it runs once per athlete opened. */
  useLayoutEffect(()=>{window.scrollTo(0,0);},[ath.id]);
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
  const apAcwr=athACWR(ath,apRef);
  const apRd=athWellnessVal(ath,'readiness',apRef);
  const apEntries=(ath.srpeLog||[]).length;
  const apCheckins=(ath.wellness||[]).length;
  const apAge=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  // Same 7-day monotony the risk alerts read, at the same reference date as ACWR.
  const apMono=weekMono(athTrend(ath,apRef,7).map(v=>({load:v}))).monotony;
  const apRcls=apRd==null?'na':apRd>=4?'':apRd>=3?'warn':'bad';
  /* Five tabs. Wellness lives in the sidebar's own Wellness screen. Load has no tab of its own: the athlete's load is read where it is made —
     on their calendar, day by day, with the week's totals and monotony above it. */
  const ATH_TABS=[
    {id:'profile',l:L('Sporcu Profili','Athlete Profile')},
    {id:'training',l:L('Atletik Profil','Athletic Profile')},
    {id:'calendar',l:L('Takvim','Calendar')},
    {id:'body',l:L('Antropometri','Anthropometry')},
    {id:'injuries',l:L('Sakatlıklar','Injuries')},
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
        <div className="ap-stat"><div className="k">{L('Yaş','Age')}</div><div className="v">{apAge!=null?apAge:'—'}</div></div>
        <div className="ap-stat"><div className="k">Readiness</div><div className="v" style={{color:readyColor(apRd)}}>{apRd!=null?<CountUp value={apRd} decimals={1}/>:'—'}<small>/5</small></div></div>
        <div className="ap-stat"><div className="k">ACWR</div><div className="v" style={{color:acwrZoneOf(apAcwr).c}}>{apAcwr?<CountUp value={apAcwr} decimals={2}/>:'—'}</div></div>
        <div className="ap-stat"><div className="k">{L('Monotoni','Monotony')}</div><div className="v" style={{color:monoZoneOf(apMono).c}}>{apMono?<CountUp value={apMono} decimals={2}/>:'—'}</div></div>
      </div>
      {/* The athlete on paper, for the people the coach reports to: profile, the head
          coach's observations, the athletic profile and the injury record, A4 portrait. */}
      <button className="ap-info" onClick={()=>printAthleteInfo(ath,setup,exercises,teamDays,teamId)}
        title={L('Sporcu Profili, Baş Antrenör Gözlemleri, Atletik Profil ve Sakatlıklar — A4 dikey PDF','Athlete Profile, Head Coach Observations, Athletic Profile and Injuries — A4 portrait PDF')}>{L('Profil Çıktısı','Profile Printout')}</button>
      <button className="ap-edit" onClick={()=>setEditProfileOpen(true)} title={L('Profili düzenle','Edit profile')}>✎</button>
    </div>
    <div className="ath-tabs ath-tabs2" role="tablist">{ATH_TABS.map(t=><button key={t.id} role="tab" aria-selected={tab===t.id} className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}><AthIc k={t.id} size={19}/><span>{t.l}</span></button>)}</div>
    {tab==='profile'&&<ProfileTab ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='training'&&<TrainingProfileTab ath={ath} updAth={updAth} exercises={exercises}/>}

    {/* Profili Düzenle: ekranı neredeyse dolduran, bölümlere ayrılmış pencere (`AthEditProfile`). */}
    {editProfileOpen&&<AthEditProfile ath={ath} updAth={updAth} setup={setup} teamId={teamId}
      positions={positions} onClose={()=>setEditProfileOpen(false)}/>}
    {tab==='injuries'&&<AthInjuries ath={ath} updAth={updAth} setup={setup} teamDays={teamDays}/>}
    {tab==='body'&&<AthBody ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='calendar'&&<><CalendarView days={ath.days||{}} selected={athSel} setSelected={setAthSel}
      goDayView={()=>{}} weeks={weeks}
      saveDays={saveAthDays} setup={setup} labelOwner={ath.name} exercises={exercises} ownerAth={ath}/>
    <MuscleLoadDistribution days={ath.days||{}} refDate={athSel.date}
      footer={<button type="button" className="btn sm white" onClick={()=>setRpeOpen(true)}>RPE Scores</button>}/>
    {rpeOpen&&<AthRpeScores ath={ath} updAth={updAth} onClose={()=>setRpeOpen(false)}/>}</>}
  </div>);
}

/* ---- RPE Scores: every RPE the athlete has given, newest first, editable ----
   One row per score on the athlete's sRPE log (`srpeLog`): an entry from a check-in can carry
   a ball-practice, an S&C and a match score at once, and each is its own row. Changing the
   score or the minutes rewrites that slot's load and the entry's total; deleting the last
   score of an entry drops the entry — one that came from a form is remembered as deleted
   (`deletedSrpeSrcIds`) so the next sync does not bring it back. The date is editable too: it
   moves the whole entry (a check-in's scores were given for one day), and a check-in is matched
   back by its `srcId`, not its date, so a sync does not undo the move. */
const RPE_SLOT_LAB={tp:['Top Antrenmanı','Ball Practice'],sc:['S&C','S&C'],game:['Maç','Match']};
function AthRpeScores({ath,updAth,onClose}){
  const log=ath.srpeLog||[];
  const has=v=>v!==''&&v!=null&&!isNaN(Number(v));
  const rows=[];
  log.forEach(e=>Object.keys(SRPE_KINDS).forEach(k=>{const[rk,du]=SRPE_KINDS[k];
    if(has(e[rk]))rows.push({e,k,rpe:Number(e[rk]),dur:Number(e[du])||0});}));
  rows.sort((a,b)=>String(b.e.date||'').localeCompare(String(a.e.date||''))||a.k.localeCompare(b.k));
  const sesName=(e,k)=>{const s=(((ath.days||{})[e.date]||{}).sessions||[]).find(x=>x.id===e.sessionId);
    return s&&s.name?s.name:'';};
  const total=e=>Object.keys(SRPE_KINDS).reduce((t,k)=>{const[rk,du]=SRPE_KINDS[k];
    return t+(has(e[rk])?Math.round(Number(e[rk])*(Number(e[du])||0)):0);},0);
  const setSlot=(id,k,patch)=>{
    const[rk,du]=SRPE_KINDS[k];
    updAth(ath.id,{srpeLog:log.map(e=>{if(e.id!==id)return e;
      const n={...e};
      if('rpe' in patch)n[rk]=patch.rpe===''?'':Math.max(0,Math.min(10,Number(patch.rpe)));
      if('dur' in patch)n[du]=patch.dur===''?'':Math.max(0,Number(patch.dur));
      n[k+'Load']=has(n[rk])&&Number(n[du])?Math.round(Number(n[rk])*Number(n[du])):'';
      n.totalLoad=total(n)||'';
      return n;})});
  };
  const setDate=(id,date)=>{if(!date)return;updAth(ath.id,{srpeLog:log.map(e=>e.id===id?{...e,date}:e)});};
  const delSlot=(id,k)=>{
    if(!confirm(L('Bu RPE puanı silinsin mi?','Delete this RPE score?')))return;
    const[rk,du]=SRPE_KINDS[k];
    const e0=log.find(e=>e.id===id);if(!e0)return;
    const n={...e0,[rk]:'',[du]:'',[k+'Load']:''};n.totalLoad=total(n)||'';
    const empty=!Object.values(SRPE_KINDS).some(([r])=>has(n[r]));
    const patch={srpeLog:empty?log.filter(e=>e.id!==id):log.map(e=>e.id===id?n:e)};
    if(empty&&e0.srcId)patch.deletedSrpeSrcIds=[...(ath.deletedSrpeSrcIds||[]),e0.srcId];
    updAth(ath.id,patch);
  };
  const[nd,setNd]=useState({date:fmt(today),k:'sc',rpe:'',dur:''});
  const add=()=>{
    if(!has(nd.rpe)||nd.rpe===''){alert(L('RPE puanını yaz (0–10).','Enter the RPE score (0–10).'));return;}
    const rpe=Math.max(0,Math.min(10,Number(nd.rpe))),dur=Number(nd.dur)||0,load=dur?Math.round(rpe*dur):'';
    const e={id:uid(),srcId:null,sessionId:null,date:nd.date,tpRPE:'',tpDuration:'',tpLoad:'',scRPE:'',scDuration:'',scLoad:'',
      gameRPE:'',gameDuration:'',gameLoad:'',totalLoad:load};
    e[nd.k+'RPE']=rpe;e[nd.k+'Duration']=dur||'';e[nd.k+'Load']=load;
    updAth(ath.id,{srpeLog:[...log,e]});
    setNd(x=>({...x,rpe:'',dur:''}));
  };
  const avg=rows.length?rows.reduce((t,r)=>t+r.rpe,0)/rows.length:null;
  return(<div className="modal-bg" onClick={onClose}>
    <div className="modal rpes" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div><h2 style={{margin:0,fontSize:18}}>RPE Scores — {ath.name}</h2>
          <div className="rpes-sub">{rows.length} {L('puan','scores')}{avg!=null?` · ${L('ortalama','average')} ${avg.toFixed(1)}`:''}</div></div>
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="rpes-b">
        <div className="rpes-add">
          <input type="date" value={nd.date} onChange={e=>setNd(x=>({...x,date:e.target.value}))}/>
          <select value={nd.k} onChange={e=>setNd(x=>({...x,k:e.target.value}))}>
            {Object.keys(RPE_SLOT_LAB).map(k=><option key={k} value={k}>{L(RPE_SLOT_LAB[k][0],RPE_SLOT_LAB[k][1])}</option>)}
          </select>
          <input type="number" min="0" max="10" step="0.5" placeholder="RPE" value={nd.rpe} onChange={e=>setNd(x=>({...x,rpe:e.target.value}))}/>
          <input type="number" min="0" placeholder={L('dk','min')} value={nd.dur} onChange={e=>setNd(x=>({...x,dur:e.target.value}))}/>
          <button type="button" className="btn sm" onClick={add}>＋ {L('Ekle','Add')}</button>
        </div>
        {rows.length===0
          ?<div className="empty-st">{L('Bu sporcunun henüz RPE puanı yok.','This athlete has no RPE scores yet.')}</div>
          :<table className="rpes-t">
            <thead><tr><th>{L('Tarih','Date')}</th><th>{L('Seans','Session')}</th><th>RPE</th><th>{L('Süre (dk)','Minutes')}</th><th>{L('Yük','Load')}</th><th/></tr></thead>
            <tbody>{rows.map(r=>
              <tr key={r.e.id+r.k}>
                <td className="d"><input type="date" value={r.e.date||''} aria-label={L('Tarih','Date')}
                  onChange={e=>setDate(r.e.id,e.target.value)}/></td>
                <td><span className={'rpes-k k-'+r.k}>{L(RPE_SLOT_LAB[r.k][0],RPE_SLOT_LAB[r.k][1])}</span> {sesName(r.e,r.k)}</td>
                <td><input type="number" min="0" max="10" step="0.5" value={r.e[SRPE_KINDS[r.k][0]]}
                  style={{color:rpeColor(r.rpe)||undefined}} onChange={e=>setSlot(r.e.id,r.k,{rpe:e.target.value})}/></td>
                <td><input type="number" min="0" value={r.e[SRPE_KINDS[r.k][1]]??''} onChange={e=>setSlot(r.e.id,r.k,{dur:e.target.value})}/></td>
                <td className="l">{r.dur?`${Math.round(r.rpe*r.dur)} AU`:'—'}</td>
                <td><button type="button" className="x-btn" title={L('Sil','Delete')} onClick={()=>delSlot(r.e.id,r.k)}>✕</button></td>
              </tr>)}</tbody>
          </table>}
      </div>
    </div>
  </div>);
}

/* ---- Injuries: one row per record, opened to edit ----
   A record is a single line until it is opened — status, where, the grade, when it
   happened and how long it kept the athlete out — so a long history stays one screen
   tall. A record just added opens itself; it is waiting to be filled in. */
/* Missed work, counted off the team calendar: a team session the athlete is not ticked on
   (its "Katılan Sporcular" list names others, not them) is one they missed. Sessions are
   sorted into team practice, strength & conditioning (the Strength & Power and On-Court
   Performance blocks, read off their focus) and matches; conditioning, recovery and test
   sessions are not counted. Only days up to today count — a plan is not yet a miss. */
const INJ_MISS_KINDS=[{id:'tp',tr:'Basketbol',en:'Team Practice'},
  {id:'sc',tr:'Kuvvet & Kondisyon',en:'Strength & Conditioning'},{id:'match',tr:'Müsabaka',en:'Competition'}];
function injSesKind(s){
  const k=sesKind(s);
  if(k==='tp'||k==='match')return k;
  if(k==='test')return null;
  return sesFocus(s).some(f=>f==='Strength'||f==='Power'||f==='Speed')?'sc':null;
}
function injMissedSessions(athId,teamDays,from,to){
  const end=to&&to<fmt(today)?to:fmt(today);
  return injMissedOn(athId,teamDays,k=>!(from&&k<from)&&k<=end);
}
/* The sessions missed on the days `inDay` accepts (none after today). */
function injMissedOn(athId,teamDays,inDay){
  const r={tp:0,sc:0,match:0},tod=fmt(today);
  Object.entries(teamDays||{}).forEach(([k,d])=>{
    if(k>tod||!inDay(k))return;
    ((d&&d.sessions)||[]).forEach(s=>{
      const kind=injSesKind(s);if(!kind)return;
      const on=teamSessionCovers(s,athId)||(s.blocks||[]).some(b=>Array.isArray(b.athletes)&&b.athletes.includes(athId));
      if(!on)r[kind]++;
    });
  });
  return r;
}
/* An injury's days out and the sessions missed while out (sidelined → return, or today). */
function injMissed(inj,athId,teamDays){
  const sd=inj.sidelinedDate,ar=inj.actualReturn;
  if(!sd)return{days:null,tp:null,sc:null,match:null};
  const endDate=ar||fmt(today);
  if(endDate<sd)return{days:null,tp:null,sc:null,match:null};
  return{days:Math.max(0,diffD(sd,endDate)),...injMissedSessions(athId,teamDays,sd,endDate)};
}
/* The sessions missed while injured, over the whole record: only the days inside some injury's
   sidelined → return window (or today, while it is still open) count, each day once however many
   injuries overlap it. A missed session outside every injury is not an injury's. */
function injMissedAll(injuries,athId,teamDays){
  const tod=fmt(today);
  const wins=(injuries||[]).map(i=>[i&&i.sidelinedDate,(i&&i.actualReturn)||tod]).filter(([a,b])=>a&&b>=a);
  if(!wins.length)return{tp:0,sc:0,match:0};
  return injMissedOn(athId,teamDays,k=>wins.some(([a,b])=>k>=a&&k<=b));
}
/* The three missed-session boxes, under one heading. */
function InjMissStats({m,title}){
  return(<div className="inj-miss">
    {title&&<div className="inj-miss-h">{title}</div>}
    <div className="inj-miss-g">{INJ_MISS_KINDS.map(k=><div key={k.id} className={`inj-stat inj-k-${k.id}`}>
      <div className="k">{L(k.tr,k.en)}</div><div className="v">{m[k.id]!=null?m[k.id]:'—'}</div></div>)}</div>
  </div>);
}
function AthInjuries({ath,updAth,setup,teamDays}){
  const[open,setOpen]=useState(null);
  const oneAth=useMemo(()=>[ath],[ath]);
  const list=ath.injuries||[];
  const order=list.map((inj,idx)=>({inj,idx})).sort((a,b)=>(b.inj.date||'').localeCompare(a.inj.date||''));
  const nActive=list.filter(i=>!i.actualReturn).length;
  const missAll=useMemo(()=>injMissedAll(list,ath.id,teamDays),[list,ath.id,teamDays]);
  const add=()=>{const inj={id:uid(),date:fmt(today),context:'Training',mechanism:'',side:'',location:'',tissueType:'',type:'',grade:'1',firstInjuryDay:fmt(today),sidelinedDate:fmt(today),estimatedReturn:'',actualReturn:'',status:'Active',notes:''};
    updAth(ath.id,{injuries:[...list,inj]});setOpen(inj.id);};
  const sideTr={Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral'),'N/A':''};
  return(<div>
    <div className="row" style={{justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h2 className="ath-h2">{L('Sporcu Sakatlık Kaydı','Athlete Injury Record')} <span>{list.length} {L('kayıt','records')}{nActive?` · ${nActive} ${L('aktif','active')}`:''}</span></h2>
      <button className="btn sm" onClick={add}>+ {L('Sakatlık Ekle','Add Injury')}</button>
    </div>
    <InjMissStats m={missAll} title={L('Kaçırılan Antrenman ve Müsabakalar','Missed Training and Competitions')}/>
    {list.length===0&&<div className="empty-st">{L('Kayıtlı sakatlık yok','No injuries recorded')}</div>}
    <InjurySurveillance athletes={oneAth} setup={setup} compact title={L('Bu sporcunun sürveyansı','Athlete surveillance')}/>
    <div className="inj-list">{order.map(({inj,idx})=>{
      const ui=(k,v)=>{const a=[...ath.injuries];a[idx]={...a[idx],[k]:v};updAth(ath.id,{injuries:a});};
      const miss=injMissed(inj,ath.id,teamDays);
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
            <div className="inj-stat"><div className="k">{L('Kadro Dışı','Days Out')}</div><div className="v">{miss.days!=null?miss.days:'—'}<span className="u">{L('gün','days')}</span></div></div>
            {INJ_MISS_KINDS.map(k=><div key={k.id} className={`inj-stat inj-k-${k.id}`}><div className="k">{L(`Kaçırılan ${k.tr}`,`Missed ${k.en}`)}</div><div className="v">{miss[k.id]!=null?miss[k.id]:'—'}</div></div>)}
            <button className="btn xs danger" onClick={()=>{if(confirm(L('Bu sakatlık kaydı silinsin mi?','Delete this injury record?'))){updAth(ath.id,{injuries:ath.injuries.filter((_,j)=>j!==idx)});setOpen(null);}}}>✕ {L('Sil','Delete')}</button>
          </div>
        </div>}
      </div>);
    })}</div>
  </div>);
}

/* ---- Anthropometry ----
   Six measures, two to a row and kept short, so the trend of each is read without
   scrolling: height, weight, body fat, wingspan, estimated leg length (height − sitting
   height, `get`) and sitting height. The old "trunk length" (Gövde) was the same measure
   as sitting height and is gone: a record that only has it is read as its sitting height. */
const athSitHt=m=>m?(m.sittingHeight!==''&&m.sittingHeight!=null?m.sittingHeight:(m.trunkLength!==''&&m.trunkLength!=null?m.trunkLength:'')):'';
const BODY_FIELDS=[
  {k:'height',tr:'Boy',en:'Height',u:'cm',c:'#a855f7',good:null},
  {k:'weight',tr:'Kilo',en:'Weight',u:'kg',c:'#3b82f6',good:null},
  {k:'bodyFat',tr:'Yağ Oranı',en:'Body Fat',u:'%',c:'#f97316',good:false},
  {k:'wingspan',tr:'Kulaç',en:'Wingspan',u:'cm',c:'#10b981',good:null},
  {k:'legLength',tr:'Tahmini Bacak Uzunluğu',en:'Est. Leg Length',u:'cm',c:'#0ea5e9',good:null,get:m=>estLegLen({...m,sittingHeight:athSitHt(m)})},
  {k:'sittingHeight',tr:'Oturma Yüksekliği',en:'Sitting Height',u:'cm',c:'#e11d48',good:null,get:athSitHt},
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
    const data=sorted.map(m=>{const raw=f.get?f.get(m):m[f.k];if(raw===''||raw==null)return null;const v=Number(raw);return(isNaN(v)||v===0)?null:v;});
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
    <PhvCard ath={ath}/>
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
          <button className="btn sm" onClick={()=>{const m={id:uid(),date:fmt(today),height:'',weight:'',bodyFat:'',wingspan:'',legLength:'',sittingHeight:'',notes:''};updAth(ath.id,{measurements:[...ms,m]});setTableOpen(true);}}>+ {L('Ölçüm Ekle','Add Measurement')}</button>
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
          return<div style={{overflowX:'auto'}}><table><thead><tr><th>{L('Tarih','Date')}</th><th>{L('Boy (cm)','Height (cm)')}</th><th>{L('Kilo (kg)','Weight (kg)')}</th><th>{L('Yağ (%)','Body Fat (%)')}</th><th>{L('Kulaç (cm)','Wingspan (cm)')}</th><th>{L('Oturma Yüksekliği (cm)','Sitting Height (cm)')}</th><th>{L('Tahmini Bacak (cm)','Est. Leg (cm)')}</th><th>{L('Notlar','Notes')}</th><th style={{width:50}}></th></tr></thead><tbody>
            {vis.map(({m,i:realIdx},idx)=>{
              const um=(k,v)=>{const a=[...ath.measurements];a[realIdx]={...a[realIdx],[k]:v};updAth(ath.id,{measurements:a});};
              // Rows mirrored from an Anthropometric Measurement test are read-only here —
              // edit them from the Testing tab so the source and Body Comp stay in sync.
              const synced=!!m.srcTest;
              const num=(k,ph,wd,val)=><td><input type="number" step="0.1" value={val!==undefined?val:(m[k]??'')} onChange={e=>um(k,e.target.value)} placeholder={ph} style={{width:wd}} disabled={synced}/></td>;
              return<tr key={m.id||idx} style={synced?{opacity:.92}:undefined}>
                <td><input type="date" value={m.date} onChange={e=>um('date',e.target.value)} style={{width:130}} disabled={synced}/><div className="help">{fd(m.date)}</div></td>
                {num('height','cm',76)}{num('weight','kg',76)}{num('bodyFat','%',66)}{num('wingspan','cm',76)}{num('sittingHeight','cm',76,athSitHt(m))}
                <td style={{textAlign:'center',color:'var(--text2)'}} title={L('Boy − Oturma Yüksekliği','Height − Sitting Height')}>{estLegLen({...m,sittingHeight:athSitHt(m)})??'—'}</td>
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
