/* ---------------------------------------------------------
   Test metadata for the picker: which drawer a test lives in,
   the one line that says what it measures, and the mark drawn
   on its tile. Purely presentational — the catalog above is
   still what a battery is built from.
   --------------------------------------------------------- */
const TEST_ICONS={
  ruler:['M4 3v18','M4 7.5h4','M4 12h5.5','M4 16.5h4','M14.5 21V9l4.5-5v17'],
  tape:['M12 3.2a8.8 8.8 0 1 0 .01 17.6A8.8 8.8 0 0 0 12 3.2z','M12 8.4a3.6 3.6 0 1 0 .01 7.2A3.6 3.6 0 0 0 12 8.4z'],
  stand:['M12 2.6a2 2 0 1 0 .01 4A2 2 0 0 0 12 2.6z','M12 7v7','M8.6 10.2L12 9l3.4 1.2','M9.6 21.4L12 14l2.4 7.4'],
  angle:['M4 19.5h16','M4 19.5L16.5 7','M9.6 19.5a7.4 7.4 0 0 0 1.7-4.6'],
  legraise:['M4.5 20.5h5.5','M7.2 20.5V9.4','M7.2 9.4l9.6-4.2','M6.4 5.2a1.8 1.8 0 1 0 .01 3.6A1.8 1.8 0 0 0 6.4 5.2z'],
  squat:['M12 2.6a1.9 1.9 0 1 0 .01 3.8A1.9 1.9 0 0 0 12 2.6z','M12 6.6v5.6','M7 4.2l5 2 5-2','M12 12.2L9 16v5.4','M12 12.2l3 3.8v5.4'],
  ybal:['M12 21.4V12','M12 12L5.4 5.6','M12 12l6.6-6.4','M12 21.4h0'],
  up:['M5 21h14','M12 17.4V4.2','M7.4 8.8L12 4.2l4.6 4.6'],
  wave:['M3.6 17.6c3.4 0 3.4-10 6.8-10s3.4 10 6.8 10','M3.6 21h16.8'],
  lateral:['M3.4 12h17.2','M8 7.6L3.4 12 8 16.4','M16 7.6L20.6 12 16 16.4'],
  hop:['M3.4 20h17.2','M5.4 16.4c3.6-8.6 9.6-8.6 13.2 0','M16.4 14.2l2.8 2.2-2.8 2.2'],
  down:['M12 3.2v10.6','M7.6 9.4L12 13.8l4.4-4.4','M5 20.4h14'],
  watch:['M12 21.2a8.2 8.2 0 1 0 0-16.4 8.2 8.2 0 0 0 0 16.4z','M12 8.6V13l3 1.8','M9.4 2.4h5.2'],
  cone:['M4 19.6h16','M9 19.6l3-12.6 3 12.6','M7.6 15.2h8.8'],
  uturn:['M7.2 20.6V10.4a4.8 4.8 0 0 1 9.6 0v10.2','M3.8 17.4l3.4 3.2 3.4-3.2'],
  shuttle:['M3.6 8.4h16.8','M3.6 15.6h16.8','M17 5.2l3.4 3.2-3.4 3.2','M7 12.4l-3.4 3.2L7 18.8'],
  beaker:['M9 3h6','M10 3v6.2l-5 8.8a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-8.8V3'],
  grid:['M4 4h7v7H4z','M13 4h7v7h-7z','M4 13h7v7H4z','M13 13h7v7h-7z'],
  user:['M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4z','M4.4 21c.9-3.9 4-6.4 7.6-6.4S18.7 17.1 19.6 21'],
  users:['M9.4 11.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z','M2.8 20.4c.8-3.4 3.5-5.6 6.6-5.6s5.8 2.2 6.6 5.6','M16.4 5a3.4 3.4 0 0 1 0 6.6','M18 14.9c2.2.7 3.7 2.7 4.2 5.5'],
  chart:['M4 20V9.6','M10 20V4.4','M16 20v-7.2','M22 20H2'],
  cal:['M5 5.2h14v15H5z','M5 9.6h14','M9 3v4','M15 3v4'],
  check:['M5 12.6l4.4 4.4L19 7.6'],
  list:['M8 6h13','M8 12h13','M8 18h13','M3.6 6h.01','M3.6 12h.01','M3.6 18h.01'],
  star:['M12 3.4l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9z'],
  card:['M3 6.4h18v11.2H3z','M3 10.4h18','M7 14.4h4'],
  search:['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M20.4 20.4l-4.4-4.4'],
  arrow:['M5 12h13','M13.4 6.4L19 12l-5.6 5.6'],
  target:['M12 20.8a8.8 8.8 0 1 0 0-17.6 8.8 8.8 0 0 0 0 17.6z','M12 16.4a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8z','M12 13.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z'],
  info:['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z','M12 11v5.4','M12 7.6h.01'],
  pencil:['M4 20h4.2L19 9.2a2.1 2.1 0 0 0-3-3L5.2 17V20z','M14.6 6.6l2.8 2.8'],
  trash:['M4.6 6.6h14.8','M9.4 6.6V4.4h5.2v2.2','M6.6 6.6l.9 13.2a1.6 1.6 0 0 0 1.6 1.4h5.8a1.6 1.6 0 0 0 1.6-1.4l.9-13.2','M10.4 10.6v6.6','M13.6 10.6v6.6'],
  box:['M12 2.8l8.2 4.4v9.6L12 21.2 3.8 16.8V7.2z','M3.8 7.2L12 11.6l8.2-4.4','M12 11.6v9.6'],
  camera:['M4.6 7.6h3l1.4-2.2h6l1.4 2.2h3a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4V9.2a1.6 1.6 0 0 1 1.6-1.6z','M12 16.6a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z'],
};
const TIc=({k,size})=>{const p=TEST_ICONS[k]||TEST_ICONS.beaker;const s=size||18;
  return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p.map((d,i)=><path key={i} d={d}/>)}</svg>);};
/* group → the rail entry a test is filed under; icon → its mark; tr/en → the caption. */
const TEST_META={
  anthro:        {g:'basic',   ic:'ruler',   tr:'Boy, kilo, vücut kompozisyonu', en:'Height, weight, composition'},
  circ:          {g:'basic',   ic:'tape',    tr:'Çevre ölçümleri',               en:'Circumference measures'},
  posture:       {g:'basic',   ic:'stand',   tr:'Postür analizi',                en:'Posture analysis'},
  ankleDF:       {g:'move',    ic:'angle',   tr:'Ayak bileği mobilitesi',        en:'Ankle mobility'},
  aslr:          {g:'move',    ic:'legraise',tr:'Hamstring mobilitesi',          en:'Hamstring mobility'},
  ohs:           {g:'move',    ic:'squat',   tr:'Hareket kalitesi',              en:'Movement quality'},
  fms:           {g:'move',    ic:'squat',   tr:'Fonksiyonel hareket taraması',  en:'Functional movement screen'},
  yBalance:      {g:'move',    ic:'ybal',    tr:'Denge',                         en:'Balance'},
  verticalJump:  {g:'jump',    ic:'up',      tr:'Dikey sıçrama',                 en:'Vertical jump'},
  cmj:           {g:'jump',    ic:'wave',    tr:'Patlayıcı kuvvet',              en:'Explosive power'},
  lateralCmj:    {g:'jump',    ic:'lateral', tr:'Lateral kuvvet',                en:'Lateral power'},
  squatJump:     {g:'jump',    ic:'squat',   tr:'Sıçrama performansı',           en:'Jump performance'},
  horizontalJump:{g:'jump',    ic:'hop',     tr:'Yatay sıçrama',                 en:'Horizontal jump'},
  dropJump:      {g:'jump',    ic:'down',    tr:'Reaktivite',                    en:'Reactive strength'},
  sprint:        {g:'speed',   ic:'watch',   tr:'Maksimum hız',                  en:'Maximum speed'},
  tTest:         {g:'speed',   ic:'cone',    tr:'Çeviklik',                      en:'Agility'},
  fiveZeroFive:  {g:'speed',   ic:'uturn',   tr:'Yön değiştirme',                en:'Change of direction'},
  shuttleRun:    {g:'speed',   ic:'shuttle', tr:'Çok yönlülük',                  en:'Shuttle endurance'},
};
const TEST_GROUPS=[
  {id:'all',   tr:'Tüm Testler',          en:'All Tests'},
  {id:'basic', tr:'Temel Ölçümler',       en:'Basic Measures'},
  {id:'move',  tr:'Hareket Kalitesi',     en:'Movement Quality'},
  {id:'jump',  tr:'Sıçrama & Reaktivite', en:'Jump & Reactivity'},
  {id:'speed', tr:'Hız & Çeviklik',       en:'Speed & Agility'},
  {id:'custom',tr:'Özel Testler',         en:'Custom Tests'},
];
const testGroupOf=c=>c.custom?'custom':((TEST_META[c.id]||{}).g||'custom');

// Legacy grouped battery ids → granular ids (keeps older test records working).
const BATTERY_ALIAS={
  mobility:['ankleDF','aslr'],
  power:['verticalJump','cmj','lateralCmj','squatJump','horizontalJump','dropJump'],
  agility:['tTest','fiveZeroFive'],
  endurance:['shuttleRun'],
};
function expandBattery(b){
  if(!Array.isArray(b))return b; // undefined → editor shows everything
  const out=new Set();
  b.forEach(id=>(BATTERY_ALIAS[id]||[id]).forEach(x=>out.add(x)));
  return[...out];
}

/* Y Balance Test scoring.
   Composite Score = (Anterior + Posteromedial + Posterolateral) / (3 × Leg Length) × 100
   R/L reach difference per direction should be < 4 cm (return-to-sport / screening cut-off). */
function ybCalc(yb){
  const num=v=>{const x=Number(v);return isFinite(x)&&x>0?x:null;};
  const limb=num(yb&&yb.limbLength);
  const side=s=>{const o=(yb&&yb[s])||{};return{ant:num(o.ant),pm:num(o.pm),pl:num(o.pl)};};
  const right=side('right'),left=side('left');
  const comp=s=>(limb!=null&&s.ant!=null&&s.pm!=null&&s.pl!=null)?+(((s.ant+s.pm+s.pl)/(3*limb))*100).toFixed(1):null;
  const diff=k=>(right[k]!=null&&left[k]!=null)?+Math.abs(right[k]-left[k]).toFixed(1):null;
  return{limb,right,left,compR:comp(right),compL:comp(left),dAnt:diff('ant'),dPm:diff('pm'),dPl:diff('pl')};
}

/* =========================================================
   FMS — Functional Movement Screen
   ---------------------------------------------------------
   Seven movements, each scored 0-3. Four are screened per side: the athlete
   is given the LOWER of the two sides for that movement, and a right/left
   difference is itself a finding, so both sides are kept on the record.
   Three movements carry a clearing test (shoulder impingement, spinal
   extension, spinal flexion): a positive — that is, painful — clearing drops
   its movement to 0 no matter what was scored.
   Total is the sum of the seven movement scores, out of 21.
   ========================================================= */
const FMS_ITEMS=[
  {id:'deepSquat',       bi:false, clear:null,          tr:'Derin Çömelme',                  en:'Deep Squat'},
  {id:'hurdleStep',      bi:true,  clear:null,          tr:'Yüksek Adımlama',                en:'Hurdle Step'},
  {id:'inlineLunge',     bi:true,  clear:null,          tr:'Tek Çizgi Üzerinde Lunge',       en:'Inline Lunge'},
  {id:'shoulderMobility',bi:true,  clear:'shoulderClear',tr:'Omuz Mobilitesi',               en:'Shoulder Mobility',
    clearTr:'Omuz Sıkışma Temizleme Testi', clearEn:'Shoulder Impingement Clearing'},
  {id:'aslr',            bi:true,  clear:null,          tr:'Aktif Düz Bacak Kaldırma',       en:'Active Straight-Leg Raise'},
  {id:'trunkPushup',     bi:false, clear:'pushupClear', tr:'Gövde Stabilitesi Şınavı',       en:'Trunk Stability Push-Up',
    clearTr:'Omurga Ekstansiyon Temizleme Testi', clearEn:'Spinal Extension Clearing'},
  {id:'rotary',          bi:true,  clear:'rotaryClear', tr:'Rotasyon Stabilitesi',           en:'Rotary Stability',
    clearTr:'Omurga Fleksiyon Temizleme Testi', clearEn:'Spinal Flexion Clearing'},
];
/* Read one FMS record: the raw entries, the score that counts per movement,
   the asymmetries, and the total. `n` is how many of the seven were scored —
   a partially filled screen still reports, it just says so. */
function fmsCalc(f){
  const o=f||{};
  const num=v=>{const x=Number(v);return v!==''&&v!=null&&isFinite(x)?x:null;};
  const items=FMS_ITEMS.map(it=>{
    const raw=o[it.id];
    const right=it.bi?num(raw&&raw.right):null;
    const left =it.bi?num(raw&&raw.left ):null;
    const single=it.bi?null:num(raw);
    const cleared=it.clear?(o[it.clear]||''):'';
    let score=it.bi
      ?((right!=null&&left!=null)?Math.min(right,left):(right!=null?right:left))
      :single;
    // A painful clearing test zeroes its movement — that is the whole point of it.
    if(score!=null&&cleared==='pos')score=0;
    const asym=(it.bi&&right!=null&&left!=null&&right!==left)?Math.abs(right-left):null;
    return{...it,right,left,single,score,cleared,asym,filled:score!=null};
  });
  const scored=items.filter(i=>i.filled);
  return{items,n:scored.length,
    total:scored.length?scored.reduce((a,i)=>a+i.score,0):null,
    asym:items.some(i=>i.asym!=null),
    zeros:items.filter(i=>i.filled&&i.score===0).length,
    any:scored.length>0||items.some(i=>i.cleared)||!!o.observations};
}
const FMS_HAS=t=>{const f=t&&t.fms;return fmsCalc(f).any||!!(f&&f.pdf);};

/* Read an uploaded FMS score-sheet PDF into something a report can print.
   A PDF cannot be printed from inside the report window — browsers will not
   paginate an embedded one — so every page is rasterised here, once, at upload
   time, and it is those pictures that go on the sheet. The original file is
   kept alongside them so the coach can still open the PDF itself.
   Returns {name,size,at,pages:[dataURL],data} or throws with a readable reason. */
const FMS_PDF_MAX=12*1024*1024;     // refuse anything past this — it is synced, not just held
const FMS_PDF_KEEP=6*1024*1024;     // above this only the pages are kept, not the original
async function fmsReadPdf(file){
  if(!file)throw new Error('No file.');
  const isPdf=/\.pdf$/i.test(file.name||'')||file.type==='application/pdf';
  if(!isPdf)throw new Error(L('Bu bir PDF değil.','That is not a PDF.'));
  if(file.size>FMS_PDF_MAX)throw new Error(L('PDF çok büyük (en fazla 12 MB).','That PDF is too large (12 MB max).'));
  try{await needLibs('pdfjs');}catch(e){/* aşağıdaki mesaj söylüyor */}
  const lib=window.pdfjsLib;
  if(!lib)throw new Error(L('PDF okuyucu yüklenemedi — bağlantını kontrol et.','The PDF reader did not load — check your connection.'));
  if(lib.GlobalWorkerOptions&&!lib.GlobalWorkerOptions.workerSrc)
    lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const buf=await file.arrayBuffer();
  // The buffer is handed to pdf.js, which takes ownership of it, so the copy
  // kept for the data-URI is made first.
  const dataUrl=file.size<=FMS_PDF_KEEP?await new Promise((res,rej)=>{
    const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read the file.'));
    r.readAsDataURL(file);}):null;
  const doc=await lib.getDocument({data:new Uint8Array(buf)}).promise;
  const pages=[];
  for(let i=1;i<=Math.min(doc.numPages,6);i++){
    const pg=await doc.getPage(i);
    const base=pg.getViewport({scale:1});
    // ~1500px on the long edge: sharp on an A4 print, small enough to sync.
    const scale=Math.min(2.5,1500/Math.max(base.width,base.height));
    const vp=pg.getViewport({scale});
    const cv=document.createElement('canvas');
    cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);   // a PDF page has no background of its own
    await pg.render({canvasContext:ctx,viewport:vp}).promise;
    pages.push(cv.toDataURL('image/jpeg',0.82));
  }
  if(!pages.length)throw new Error(L('PDF boş görünüyor.','That PDF appears to be empty.'));
  return{name:file.name||'FMS.pdf',size:file.size,at:new Date().toISOString(),pages,data:dataUrl};
}

/* =========================================================
   TEST INFO — what each test is, and why it is taken
   ---------------------------------------------------------
   A test sheet leaves the club: it is read by the athlete, by a parent, by a
   physio who was not on the court that day. "DJ 1.84" says nothing to any of
   them. So every sheet carries, under the coach's own observations, one line
   per test that was actually taken: what the athlete did, and what the number
   is read for.

   This lives in the print-out only. The editor keeps its notes field exactly as
   it was — the coach types observations there, not a description of the test
   they just ran.
   ========================================================= */
const TEST_INFO={
  anthro:{n:'Anthropometric Measurement',
    tr:{w:'Sporcunun boy, kilo, kulaç, bacak uzunluğu, oturma yüksekliği ve vücut yağ oranı gibi temel vücut ölçüleri alınır.',p:'Vücut yapısını, büyüme-gelişim seyrini ve vücut kompozisyonundaki değişimi takip etmek için kullanılır.'},
    en:{w:'The athlete’s basic body measurements are taken: height, weight, wingspan, leg length, sitting height and body fat.',p:'Used to follow body structure, growth and maturation, and changes in body composition.'}},
  circ:{n:'Body Circumference',
    tr:{w:'Omuz, bel, kalça, uyluk ve baldır çevreleri mezura ile ölçülür.',p:'Kas kütlesi dağılımını, sağ-sol farklarını ve vücut kompozisyonundaki değişimi izlemek için kullanılır.'},
    en:{w:'Shoulder, waist, hip, thigh and calf circumferences are measured with a tape.',p:'Used to follow the distribution of muscle mass, right–left differences and changes in body composition.'}},
  posture:{n:'Static Posture',
    tr:{w:'Sporcu rahat duruşta önden, yandan ve arkadan gözlemlenir ve fotoğraflanır.',p:'Duruş bozukluklarını, dizilim sorunlarını ve bunlara bağlı olası yüklenme risklerini belirlemek için kullanılır.'},
    en:{w:'The athlete is observed and photographed at rest from the front, the side and the back.',p:'Used to spot postural deviations, alignment problems and the loading risks that follow from them.'}},
  ankleDF:{n:'Ankle Dorsiflexion Degree',
    tr:{w:'Diz öne doğru ilerlerken ayak bileğinin ne kadar dorsifleksiyon yapabildiği ölçülür.',p:'Ayak bileği hareket açıklığını ve özellikle squat, iniş, koşu ve yön değiştirme gibi hareketleri etkileyebilecek kısıtlılıkları belirlemek için kullanılır.'},
    en:{w:'How far the ankle can dorsiflex while the knee travels forward is measured.',p:'Used to establish ankle range of motion and the restrictions that can affect squatting, landing, running and changing direction.'}},
  aslr:{n:'Active Straight Leg Raise (ASLR)',
    tr:{w:'Sporcu sırtüstü yatarken bir bacağını dizini bükmeden aktif olarak yukarı kaldırır.',p:'Hamstring esnekliği, kalça hareket açıklığı ve alt ekstremite hareketliliğini değerlendirmek için kullanılır.'},
    en:{w:'Lying on their back, the athlete actively raises one leg without bending the knee.',p:'Used to assess hamstring flexibility, hip range of motion and lower-limb mobility.'}},
  ohs:{n:'Overhead Squat',
    tr:{w:'Sporcu kollarını baş üstünde tutarak squat hareketi yapar.',p:'Mobilite, stabilite, postüral kontrol ve temel hareket kalitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete squats while holding the arms overhead.',p:'Used to assess mobility, stability, postural control and basic movement quality.'}},
  fms:{n:'FMS — Functional Movement Screen',
    tr:{w:'Sporcuya yedi temel hareket kalıbı uygulanır: derin çömelme, yüksek adımlama, tek çizgi üzerinde lunge, omuz mobilitesi, aktif düz bacak kaldırma, gövde stabilitesi şınavı ve rotasyon stabilitesi. Her hareket 0-3 arasında puanlanır; çift taraflı hareketlerde sağ ve sol ayrı ayrı puanlanır ve düşük olan taraf geçerlidir.',p:'Temel hareket kalitesini, mobilite-stabilite dengesini, sağ-sol asimetrilerini ve ağrı yaratan hareketleri tek bir tarama ile ortaya koymak için kullanılır. Toplam skor 21 üzerindendir.'},
    en:{w:'The athlete is taken through seven basic movement patterns: deep squat, hurdle step, inline lunge, shoulder mobility, active straight-leg raise, trunk stability push-up and rotary stability. Each is scored 0-3; the bilateral movements are scored per side and the lower side is the one that counts.',p:'Used to establish basic movement quality, the balance between mobility and stability, right-left asymmetry and any movement that provokes pain, in a single screen. The total is out of 21.'}},
  yBalance:{n:'Y Balance Test',
    tr:{w:'Sporcu tek ayak üzerinde dururken diğer bacağıyla üç yönde (anterior, posteromedial, posterolateral) mümkün olduğunca uzağa uzanır.',p:'Dinamik dengeyi, tek bacak stabilitesini ve sağ-sol farkına bağlı yaralanma riskini değerlendirmek için kullanılır.'},
    en:{w:'Standing on one leg, the athlete reaches as far as possible with the other leg in three directions (anterior, posteromedial, posterolateral).',p:'Used to assess dynamic balance, single-leg stability and the injury risk carried by a right–left difference.'}},
  verticalJump:{n:'Vertical Jump',
    tr:{w:'Sporcu yerinde, mümkün olduğunca yükseğe dikey sıçrama yapar.',p:'Alt ekstremite patlayıcı gücünü ve genel sıçrama kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete jumps vertically, as high as possible, from a standing position.',p:'Used to assess lower-limb explosive power and overall jumping capacity.'}},
  cmj:{n:'CMJ (Countermovement Jump)',
    tr:{w:'Sporcu hızlı bir çömelme hareketinin ardından mümkün olduğunca yukarı sıçrar.',p:'Patlayıcı kuvveti ve alt ekstremite güç üretme kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete jumps as high as possible immediately after a fast dip into a squat.',p:'Used to assess explosive strength and the lower limbs’ capacity to produce power.'}},
  lateralCmj:{n:'Lateral CMJ',
    tr:{w:'Sporcu yana doğru karşı hareketli bir sıçrama gerçekleştirir.',p:'Tek taraflı/lateral patlayıcı kuvveti ve sağ-sol taraflar arasındaki performans farkını değerlendirmek için kullanılır.'},
    en:{w:'The athlete performs a countermovement jump to the side.',p:'Used to assess unilateral/lateral explosive strength and the performance difference between the right and left sides.'}},
  squatJump:{n:'Squat Jump',
    tr:{w:'Sporcu statik squat pozisyonundan, aşağı doğru yaylanma yapmadan yukarı sıçrar.',p:'Konsantrik kuvvet ve patlayıcı kuvvet kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'From a held squat position, the athlete jumps up without any countermovement.',p:'Used to assess concentric strength and explosive strength capacity.'}},
  horizontalJump:{n:'Horizontal Jump',
    tr:{w:'Sporcu mümkün olduğunca uzağa doğru yatay sıçrama yapar.',p:'Yatay kuvvet üretme ve patlayıcı güç kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete jumps horizontally, as far as possible.',p:'Used to assess horizontal force production and explosive power capacity.'}},
  dropJump:{n:'Drop Jump (RSI)',
    tr:{w:'Sporcu belirli bir yükseklikten düşer ve yere temas ettikten hemen sonra mümkün olduğunca hızlı ve yüksek sıçrar.',p:'Reaktif kuvveti, gerilme-kısalma döngüsünü ve yere temas sonrası hızlı kuvvet üretimini değerlendirmek için kullanılır.'},
    en:{w:'The athlete drops from a set height and, the moment the feet touch the ground, jumps again as fast and as high as possible.',p:'Used to assess reactive strength, the stretch-shortening cycle and how quickly force is produced after ground contact.'}},
  sprint:{n:'20m Sprint',
    tr:{w:'Sporcu 20 metrelik mesafeyi duruştan başlayarak mümkün olduğunca hızlı koşar.',p:'Hızlanma ve maksimum sürat kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'From a standing start, the athlete runs 20 metres as fast as possible.',p:'Used to assess acceleration and maximum speed capacity.'}},
  tTest:{n:'T-Agility Test',
    tr:{w:'Sporcu ileri sprint, lateral hareket ve geri koşudan oluşan T şeklindeki bir parkuru mümkün olduğunca hızlı tamamlar.',p:'Hızlanma, yavaşlama, yön değiştirme ve lateral hareket becerisini değerlendirmek için kullanılır.'},
    en:{w:'The athlete completes a T-shaped course of forward sprint, lateral shuffle and backpedal as fast as possible.',p:'Used to assess acceleration, deceleration, change of direction and lateral movement ability.'}},
  fiveZeroFive:{n:'5-0-5',
    tr:{w:'Sporcu hızlandıktan sonra 5 metrede 180° dönerek 5 metre geri sprint yapar.',p:'Yön değiştirme hızını, yavaşlama ve yeniden hızlanma becerisini değerlendirmek için kullanılır.'},
    en:{w:'After a run-up, the athlete sprints 5 metres, turns 180° and sprints 5 metres back.',p:'Used to assess change-of-direction speed and the ability to decelerate and re-accelerate.'}},
  shuttleRun:{n:'Shuttle Run',
    tr:{w:'Sporcu belirlenen mesafeler arasında gidiş-dönüş koşuları yapar.',p:'Dayanıklılığı ve tekrarlı koşu kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete runs back and forth between set markers.',p:'Used to assess endurance and repeated-running capacity.'}},
};
/* Which tests a record actually covers. A record saved with a battery says so
   itself; an older one without one is read from its own readings, so a sheet
   never explains a test that was never taken. */
const TI_HAS={
  anthro:t=>['height','weight','wingspan','bodyFat','legLength','sittingHeight'].some(k=>tiNum(t[k])),
  circ:t=>Object.keys(t.circ||{}).some(k=>tiNum(t.circ[k])),
  posture:t=>!!(t.posture&&(t.posture.frontPhoto||t.posture.sidePhoto||t.posture.backPhoto||t.posture.observations)),
  ankleDF:t=>tiNum(t.ankleDF&&t.ankleDF.right)||tiNum(t.ankleDF&&t.ankleDF.left),
  aslr:t=>tiNum(t.aslr&&t.aslr.right)||tiNum(t.aslr&&t.aslr.left),
  ohs:t=>!!(t.ohs&&(tiNum(t.ohs.score)||t.ohs.observations||t.ohs.frontPhoto||t.ohs.sidePhoto||t.ohs.backPhoto)),
  fms:t=>FMS_HAS(t),
  yBalance:t=>{const y=ybCalc(t.yBalance);return y.limb!=null||['ant','pm','pl'].some(k=>y.right[k]!=null||y.left[k]!=null);},
  verticalJump:t=>tiNum(t.verticalJump),
  cmj:t=>tiNum(t.cmj),
  lateralCmj:t=>tiNum(t.lateralCmj&&t.lateralCmj.right)||tiNum(t.lateralCmj&&t.lateralCmj.left),
  squatJump:t=>tiNum(t.squatJump),
  horizontalJump:t=>tiNum(t.horizontalJump),
  dropJump:t=>tiNum(t.dropJump),
  sprint:t=>!!(t.sprint20m&&(tiNum(t.sprint20m.time)||t.sprint20m.sideStep1||t.sprint20m.sideStep2||t.sprint20m.sideStep3||t.sprint20m.frontRightFoot||t.sprint20m.frontLeftFoot)),
  tTest:t=>tiNum(t.tTest),
  fiveZeroFive:t=>tiNum(t.fiveZeroFive),
  shuttleRun:t=>tiNum(t.shuttleRun),
};
const tiNum=v=>v!==''&&v!=null&&!isNaN(Number(v));
function testInfoIds(test){
  const t=test||{};
  const bat=expandBattery(t.battery);
  const keep=Array.isArray(bat)?(id=>bat.includes(id)):(id=>{try{return!!(TI_HAS[id]&&TI_HAS[id](t));}catch(e){return false;}});
  return TEST_CATALOG.filter(c=>TEST_INFO[c.id]&&keep(c.id)).map(c=>c.id);
}
/* Which test a comparison column is read from, so the squad sheet explains the
   tests it actually printed rows for and no others. */
const CMP_METRIC_TEST={height:'anthro',weight:'anthro',bodyFat:'anthro',wingspan:'anthro',legLen:'anthro',sitHt:'anthro',
  adfR:'ankleDF',adfL:'ankleDF',adfD:'ankleDF',aslrR:'aslr',aslrL:'aslr',ohs:'ohs',ybR:'yBalance',ybL:'yBalance',ybD:'yBalance',
  vj:'verticalJump',cmj:'cmj',sj:'squatJump',dj:'dropJump',hj:'horizontalJump',
  lcjR:'lateralCmj',lcjL:'lateralCmj',lcjD:'lateralCmj',
  sp20:'sprint',tTest:'tTest',f505:'fiveZeroFive',shut:'shuttleRun'};
/* The block itself — one row per test, in catalog order, in the report language. */
function testInfoTable(ids){
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rows=(ids||[]).map(id=>{
    const i=TEST_INFO[id];if(!i)return'';
    const o=L(i.tr,i.en);
    return`<tr><td class="tin">${esc(i.n)}</td><td>${esc(o.w)}</td><td>${esc(o.p)}</td></tr>`;
  }).join('');
  if(!rows)return'';
  return`<table class="tinfo">
    <colgroup><col style="width:24%"/><col style="width:38%"/><col style="width:38%"/></colgroup>
    <tr><th>Test</th><th>${esc(L('Nedir?','What is it?'))}</th><th>${esc(L('Ne amaçla alınır?','Why is it taken?'))}</th></tr>
    ${rows}
  </table>`;
}
/* The CSS the block needs. Both sheets already set --border / --text2, so the
   table lands in the sheet it is printed on rather than beside it. */
const TINFO_CSS=`
.tinfo{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-top:8px;page-break-inside:auto;break-inside:auto}
.tinfo th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:7px 9px;border:none;white-space:normal}
.tinfo td{font-family:'Space Grotesk',Arial,sans-serif;font-size:9.5px;line-height:1.45;color:var(--text2);text-align:left;padding:8px 9px;border:none;border-top:1px solid var(--border);background:#fff;vertical-align:top;font-weight:400}
.tinfo tr{page-break-inside:avoid;break-inside:avoid}
.tinfo td.tin{font-weight:700;color:var(--text)}
.tinfo-h{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:12px;page-break-after:avoid;break-after:avoid-page}
/* The heading used to land at the foot of a sheet with the table it introduces
   starting on the next one, which reads as a block torn in half. So the whole
   block opens its own sheet: the heading, the sub-heading and the first rows
   arrive together. Seventeen tests explained still will not fit on one page, so
   once it is there it may break between rows. */
.tinfo-grp{break-before:page;page-break-before:always;break-inside:auto;page-break-inside:auto;margin-top:0}
.tinfo-grp .tinfo-h{margin-top:0}
`;

/* =========================================================
   COMPARE ATHLETES — the metric model behind the comparison table.
   One entry per column: where the number is read from on a test record, the unit it
   is in, and which way is better (`dir`). A metric with no `dir` is descriptive —
   height, a circumference — and is never marked best or worst, because taller is not
   a score. Both the on-screen table and the printout are built from this one list, so
   the paper is the screen.
   ========================================================= */
const cmpN=v=>{const n=Number(v);return(v===''||v==null||isNaN(n))?null:n;};
const cmpGap=(a,b)=>{const x=cmpN(a),y=cmpN(b);return(x==null||y==null)?null:+Math.abs(x-y).toFixed(1);};
const CMP_GROUPS=[
  {id:'anthro',tr:'Antropometri',      en:'Anthropometry'},
  /* Circumferences are deliberately not a comparison group. A waist or a thigh is a
     shape, not a score: laid out next to a team-mate's it invites a ranking that the
     measurement does not support. They stay on the athlete's own test record, where a
     coach reads them against that athlete's earlier numbers. */
  {id:'mob',   tr:'Mobilite & Hareket',en:'Mobility & Movement'},
  {id:'pow',   tr:'Güç & Sıçrama',     en:'Power & Jump'},
  {id:'spd',   tr:'Sürat & Çeviklik',  en:'Speed & Agility'},
  {id:'cust',  tr:'Özel Testler',      en:'Custom Tests'},
];
const CMP_METRICS=[
  {id:'height',  g:'anthro',tr:'Boy',        en:'Height',      u:'cm',st:'Boy',se:'Ht',get:t=>cmpN(t.height)},
  {id:'weight',  g:'anthro',tr:'Kilo',       en:'Weight',      u:'kg',st:'Kilo',se:'Wt',get:t=>cmpN(t.weight)},
  /* BMI is not a comparison column. It is height and weight already side by side in the
     table, restated as one number that says nothing about an athlete those two do not —
     and next to a team-mate's it invites a ranking a ratio of mass to height does not
     support. The athlete's own record still carries it. */
  {id:'bodyFat', g:'anthro',tr:'Yağ Oranı',  en:'Body Fat',    u:'%', dir:'lo',st:'Yağ',se:'Fat',get:t=>cmpN(t.bodyFat)},
  {id:'wingspan',g:'anthro',tr:'Kulaç',      en:'Wingspan',    u:'cm',st:'Kulaç',se:'Wing',get:t=>cmpN(t.wingspan)},
  {id:'legLen',  g:'anthro',tr:'Bacak Uz.',  en:'Leg Length',  u:'cm',st:'Bacak',se:'Leg',get:t=>cmpN(t.legLength)},
  {id:'sitHt',   g:'anthro',tr:'Oturma Yük.',en:'Sitting Ht.', u:'cm',st:'Oturma',se:'Sit Ht',get:t=>cmpN(t.sittingHeight)},
  {id:'adfR', g:'mob',tr:'Ayak Bileği DF R',en:'Ankle DF R',u:'°',dir:'hi',st:'ADF R',se:'ADF R',get:t=>cmpN(t.ankleDF&&t.ankleDF.right)},
  {id:'adfL', g:'mob',tr:'Ayak Bileği DF L',en:'Ankle DF L',u:'°',dir:'hi',st:'ADF L',se:'ADF L',get:t=>cmpN(t.ankleDF&&t.ankleDF.left)},
  {id:'adfD', g:'mob',tr:'Ayak Bileği Fark',en:'Ankle DF Gap',u:'°',dir:'lo',st:'ADF Δ',se:'ADF Δ',get:t=>cmpGap(t.ankleDF&&t.ankleDF.right,t.ankleDF&&t.ankleDF.left)},
  {id:'aslrR',g:'mob',tr:'ASLR R',en:'ASLR R',u:'/3',dir:'hi',st:'ASLR R',se:'ASLR R',get:t=>cmpN(t.aslr&&t.aslr.right)},
  {id:'aslrL',g:'mob',tr:'ASLR L',en:'ASLR L',u:'/3',dir:'hi',st:'ASLR L',se:'ASLR L',get:t=>cmpN(t.aslr&&t.aslr.left)},
  {id:'ohs',  g:'mob',tr:'Overhead Squat',en:'Overhead Squat',u:'/3',dir:'hi',st:'OHS',se:'OHS',get:t=>cmpN(t.ohs&&t.ohs.score)},
  {id:'ybR',  g:'mob',tr:'Y Balance R',en:'Y Balance R',u:'%',dir:'hi',st:'YBT R',se:'YBT R',get:t=>ybCalc(t.yBalance).compR},
  {id:'ybL',  g:'mob',tr:'Y Balance L',en:'Y Balance L',u:'%',dir:'hi',st:'YBT L',se:'YBT L',get:t=>ybCalc(t.yBalance).compL},
  {id:'ybD',  g:'mob',tr:'Y Balance Fark',en:'Y Balance Gap',u:'%',dir:'lo',st:'YBT Δ',se:'YBT Δ',get:t=>{const y=ybCalc(t.yBalance);return cmpGap(y.compR,y.compL);}},
  {id:'vj',   g:'pow',tr:'Dikey Sıçrama',  en:'Vertical Jump',  u:'cm',dir:'hi',st:'Dikey',se:'VJ',get:t=>cmpN(t.verticalJump)},
  {id:'cmj',  g:'pow',tr:'CMJ',            en:'CMJ',            u:'cm',dir:'hi',st:'CMJ',se:'CMJ',get:t=>cmpN(t.cmj)},
  {id:'sj',   g:'pow',tr:'Squat Jump',     en:'Squat Jump',     u:'cm',dir:'hi',st:'SJ',se:'SJ',get:t=>cmpN(t.squatJump)},
  {id:'dj',   g:'pow',tr:'Drop Jump (RSI)',en:'Drop Jump (RSI)',u:'',  dir:'hi',st:'DJ RSI',se:'DJ RSI',get:t=>cmpN(t.dropJump)},
  {id:'hj',   g:'pow',tr:'Yatay Sıçrama',  en:'Horizontal Jump',u:'cm',dir:'hi',st:'Yatay',se:'HJ',get:t=>cmpN(t.horizontalJump)},
  {id:'lcjR', g:'pow',tr:'Lateral CMJ R',  en:'Lateral CMJ R',  u:'cm',dir:'hi',st:'LCMJ R',se:'LCMJ R',get:t=>cmpN(t.lateralCmj&&t.lateralCmj.right)},
  {id:'lcjL', g:'pow',tr:'Lateral CMJ L',  en:'Lateral CMJ L',  u:'cm',dir:'hi',st:'LCMJ L',se:'LCMJ L',get:t=>cmpN(t.lateralCmj&&t.lateralCmj.left)},
  {id:'lcjD', g:'pow',tr:'Lateral CMJ Fark',en:'Lateral CMJ Gap',u:'cm',dir:'lo',st:'LCMJ Δ',se:'LCMJ Δ',get:t=>cmpGap(t.lateralCmj&&t.lateralCmj.right,t.lateralCmj&&t.lateralCmj.left)},
  {id:'sp20', g:'spd',tr:'20m Sprint',en:'20m Sprint',u:'s',dir:'lo',st:'20m',se:'20m',get:t=>cmpN(t.sprint20m&&t.sprint20m.time)},
  {id:'tTest',g:'spd',tr:'T-Test',    en:'T-Test',    u:'s',dir:'lo',st:'T-Test',se:'T-Test',get:t=>cmpN(t.tTest)},
  {id:'f505', g:'spd',tr:'5-0-5',     en:'5-0-5',     u:'s',dir:'lo',st:'5-0-5',se:'5-0-5',get:t=>cmpN(t.fiveZeroFive)},
  {id:'shut', g:'spd',tr:'Shuttle Run',en:'Shuttle Run',u:'s',dir:'lo',st:'Shuttle',se:'Shuttle',get:t=>cmpN(t.shuttleRun)},
];
/* The coach's own tests join the table as columns too. Nothing says which way is
   better for a test the app has never seen, so they carry no direction. */
function cmpMetrics(customTests){
  return[...CMP_METRICS,...(customTests||[]).map(c=>({id:'ct_'+c.id,g:'cust',tr:c.name,en:c.name,u:'',
    get:t=>cmpN(t.custom&&t.custom[c.id])}))];
}
const cmpLabel=m=>L(m.tr,m.en);
/* The header a crowded sheet gets. Thirty-five columns on one A4 leave a header about
   eight characters wide, and "Overhead Squat" broken across three lines says less than
   "OHS" does — so past a threshold the print switches to the short form. A coach's own
   test has no short form and keeps its name. */
const cmpShort=m=>L(m.st||m.tr,m.se||m.en);
// One decimal at most, and no trailing ".0" — a 42 is a 42, not a 42.0.
const cmpFmt=v=>v==null?'—':String(+(Math.round(v*10)/10));
/* The test each athlete is compared on: their most recent one, or the most recent of a
   given season period. Records without a date can't be ordered, so they sit this out. */
function cmpTestOf(ath,scope){
  const ts=[...(ath.tests||[])].filter(t=>t.date&&(scope==='latest'||t.period===scope))
    .sort((a,b)=>a.date.localeCompare(b.date));
  return ts[ts.length-1]||null;
}
/* Best and worst of a column, for the metrics where those words mean something. A
   column where everybody scored the same has neither. */
function cmpEdges(vals,dir){
  if(!dir)return{best:null,worst:null};
  const nums=vals.filter(v=>v!=null);
  if(nums.length<2)return{best:null,worst:null};
  const hi=Math.max(...nums),lo=Math.min(...nums);
  if(hi===lo)return{best:null,worst:null};
  return dir==='hi'?{best:hi,worst:lo}:{best:lo,worst:hi};
}

/* =========================================================
   CURRENT TEAM AVERAGE — for the plain single-score tests
   ---------------------------------------------------------
   CMJ, squat jump, drop jump, horizontal jump and the T-test are each one
   number, so the question a coach asks while typing it in is always the same:
   where does this sit against the rest of the squad right now. "Right now" is
   every team-mate's most recent record that actually carries that measurement —
   an athlete who has never done the test does not enter the average, and an old
   record is only used when it is the newest one that test has.

   The athlete being read is left out of their own average (`excludeId`). With
   them in it, a reading pulls the line it is being measured against towards
   itself: test one athlete whose body fat is well above everyone else's and the
   average rises to meet them, which is exactly the comparison a coach was trying
   to make disappearing as it is made. The bar is the rest of the squad; the
   athlete is what is being held up against it.

   The direction only colours the reading. Above is not better everywhere: on the
   T-test a higher number is a slower athlete, so the wording stays literal
   ("above" / "below") and green/amber follows dir instead.
   ========================================================= */
const TEAM_AVG_TESTS={
  cmj:            {u:'cm',dir:'hi',dec:1},
  squatJump:      {u:'cm',dir:'hi',dec:1},
  dropJump:       {u:'',  dir:'hi',dec:2},
  horizontalJump: {u:'cm',dir:'hi',dec:1},
  tTest:          {u:'s', dir:'lo',dec:2},
};
function teamAvgOf(athletes,id,excludeId){
  if(!TEAM_AVG_TESTS[id])return null;
  const vals=[];
  (athletes||[]).forEach(a=>{
    if(excludeId!=null&&a.id===excludeId)return;
    const ts=[...(a.tests||[])].filter(t=>t.date&&cmpN(t[id])!=null)
      .sort((x,y)=>String(x.date).localeCompare(String(y.date)));
    const last=ts[ts.length-1];
    if(last)vals.push(cmpN(last[id]));
  });
  if(!vals.length)return null;
  return{avg:vals.reduce((s,v)=>s+v,0)/vals.length,n:vals.length};
}
/* How far this reading sits from that average, in per cent of it. A gap under a
   tenth of a per cent is the same number twice over, so it reads as "on the
   average" rather than as a +0.0%. */
function teamAvgDelta(v,avg,dir){
  if(v==null||avg==null||!avg)return null;
  const pct=(v-avg)/Math.abs(avg)*100;
  if(Math.abs(pct)<0.05)return{pct:0,level:'same'};
  return{pct,level:(dir==='lo'?pct<0:pct>0)?'good':'poor'};
}
const teamAvgFmt=(v,id)=>Number(v).toFixed((TEAM_AVG_TESTS[id]||{}).dec||1);

