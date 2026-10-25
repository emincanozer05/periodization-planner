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
  fms_deepSquat:       {g:'move',ic:'squat',  tr:'Simetrik alt-üst vücut mobilitesi', en:'Symmetrical whole-body mobility'},
  fms_hurdleStep:      {g:'move',ic:'stand',  tr:'Adım mekaniği, tek bacak kontrolü', en:'Stepping mechanics, single-leg control'},
  fms_inlineLunge:     {g:'move',ic:'stand',  tr:'Dar tabanda denge ve kontrol',      en:'Balance and control on a narrow base'},
  fms_shoulderMobility:{g:'move',ic:'angle',  tr:'Omuz kuşağı mobilitesi',            en:'Shoulder girdle mobility'},
  fms_aslr:            {g:'move',ic:'legraise',tr:'Aktif kalça fleksiyonu',           en:'Active hip flexion'},
  fms_trunkPushup:     {g:'move',ic:'stand',  tr:'Refleksif gövde stabilitesi',       en:'Reflexive trunk stability'},
  fms_rotary:          {g:'move',ic:'stand',  tr:'Çok düzlemli gövde stabilitesi',    en:'Multiplanar trunk stability'},
  ankleDF:       {g:'move',    ic:'angle',   tr:'Ayak bileği mobilitesi',        en:'Ankle mobility'},
  aslr:          {g:'move',    ic:'legraise',tr:'Hamstring mobilitesi',          en:'Hamstring mobility'},
  ohs:           {g:'move',    ic:'squat',   tr:'Hareket kalitesi',              en:'Movement quality'},
  fms:           {g:'move',    ic:'squat',   tr:'Fonksiyonel hareket taraması',  en:'Functional movement screen'},
  hipRot:        {g:'move',    ic:'angle',   tr:'Kalça iç/dış rotasyon açısı',   en:'Hip internal/external rotation'},
  thomas:        {g:'move',    ic:'legraise',tr:'Kalça fleksör uzunluğu',        en:'Hip flexor length'},
  tSpine:        {g:'move',    ic:'angle',   tr:'Torasik rotasyon mobilitesi',   en:'Thoracic rotation mobility'},
  yBalance:      {g:'move',    ic:'ybal',    tr:'Denge',                         en:'Balance'},
  verticalJump:  {g:'jump',    ic:'up',      tr:'Dikey sıçrama',                 en:'Vertical jump'},
  cmj:           {g:'jump',    ic:'wave',    tr:'Patlayıcı kuvvet',              en:'Explosive power'},
  lateralCmj:    {g:'jump',    ic:'lateral', tr:'Lateral kuvvet',                en:'Lateral power'},
  squatJump:     {g:'jump',    ic:'squat',   tr:'Sıçrama performansı',           en:'Jump performance'},
  horizontalJump:{g:'jump',    ic:'hop',     tr:'Yatay sıçrama',                 en:'Horizontal jump'},
  dropJump:      {g:'jump',    ic:'down',    tr:'Reaktivite',                    en:'Reactive strength'},
  sprint:        {g:'speed',   ic:'watch',   tr:'Maksimum hız',                  en:'Maximum speed'},
  accel:         {g:'speed',   ic:'watch',   tr:'İlk adım ivmelenmesi',          en:'First-step acceleration'},
  tTest:         {g:'speed',   ic:'cone',    tr:'Çeviklik',                      en:'Agility'},
  fiveZeroFive:  {g:'speed',   ic:'uturn',   tr:'Yön değiştirme, sağ-sol asimetri',en:'Change of direction, R/L asymmetry'},
  benchPress:    {g:'str',     ic:'up',      tr:'Üst vücut itiş kuvveti (e1RM)', en:'Upper-body push strength (e1RM)'},
  trapBarDL:     {g:'str',     ic:'up',      tr:'Alt vücut maksimal kuvvet (e1RM)',en:'Lower-body maximal strength (e1RM)'},
  pullUp:        {g:'str',     ic:'up',      tr:'Üst vücut çekiş kuvveti',       en:'Upper-body pull strength'},
  copenhagen:    {g:'str',     ic:'lateral', tr:'Adduktor kuvvet-dayanıklılığı', en:'Adductor strength-endurance'},
  sidePlank:     {g:'str',     ic:'lateral', tr:'Lateral gövde dayanıklılığı',   en:'Lateral trunk endurance'},
  backSquat:     {g:'str',     ic:'squat',   tr:'Alt vücut kuvveti (e1RM)',      en:'Lower-body strength (e1RM)'},
  ift3015:       {g:'endur',   ic:'shuttle', tr:'Aralıklı koşu kapasitesi (VIFT)',en:'Intermittent running capacity (VIFT)'},
  shuttleRun:    {g:'endur',   ic:'shuttle', tr:'Çok yönlülük',                  en:'Shuttle endurance'},
};
const TEST_GROUPS=[
  {id:'all',   tr:'Tüm Testler',          en:'All Tests'},
  {id:'basic', tr:'Temel Ölçümler',       en:'Basic Measures'},
  {id:'move',  tr:'Hareket Taraması',     en:'Movement Screen'},
  {id:'jump',  tr:'Sıçrama & Reaktivite', en:'Jump & Reactivity'},
  {id:'speed', tr:'Hız & Çeviklik',       en:'Speed & Agility'},
  {id:'str',   tr:'Kuvvet',               en:'Strength'},
  {id:'endur', tr:'Dayanıklılık',         en:'Endurance'},
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
   Seven movements, each scored 0-3. Five are screened per side: the athlete
   is given the LOWER of the two sides for that movement, and a right/left
   difference is itself a finding, so both sides are kept on the record.
   Clearing tests are pain checks, 'pos' (pain) or 'neg' (none): shoulder
   impingement (per side), ankle pain (per side — it belongs to the inline lunge),
   spinal extension and spinal flexion. A positive one drops its movement to 0 no
   matter what was scored. Ankle mobility is a red / yellow / green call per side
   that is read, not scored. Total is the sum of the seven movement scores, out of 21.
   ========================================================= */
const FMS_ITEMS=[
  {id:'deepSquat',       bi:false, clear:null,          tr:'Deep Squat',                en:'Deep Squat'},
  {id:'hurdleStep',      bi:true,  clear:null,          tr:'Hurdle Step',               en:'Hurdle Step'},
  {id:'inlineLunge',     bi:true,  clear:'anklePain',   tr:'In-Line Lunge',             en:'In-Line Lunge',
    clearTr:'Ankle Clearing — Pain', clearEn:'Ankle Clearing — Pain'},
  {id:'shoulderMobility',bi:true,  clear:'shoulderClear',tr:'Shoulder Mobility',        en:'Shoulder Mobility',
    clearTr:'Shoulder Impingement Clearing', clearEn:'Shoulder Impingement Clearing'},
  {id:'aslr',            bi:true,  clear:null,          tr:'Active Straight-Leg Raise', en:'Active Straight-Leg Raise'},
  {id:'trunkPushup',     bi:false, clear:'pushupClear', tr:'Trunk Stability Push-Up',   en:'Trunk Stability Push-Up',
    clearTr:'Spinal Extension Clearing', clearEn:'Spinal Extension Clearing'},
  {id:'rotary',          bi:true,  clear:'rotaryClear', tr:'Rotary Stability',          en:'Rotary Stability',
    clearTr:'Spinal Flexion Clearing', clearEn:'Spinal Flexion Clearing'},
];
/* Movement and clearing-test names stay in English (the official FMS terms) in both languages,
   on screen and on paper; only the surrounding words (Test, Raw Score, …) follow the language setting. */
/* A clearing test as stored: one answer, or one per side. Either way the answer that
   matters is whether anything hurt — a positive on either side is a positive. A record
   saved before the sheet had sides holds a bare string, and still reads. */
const fmsClear=v=>{
  if(v&&typeof v==='object'){const a=[v.right,v.left];return a.includes('pos')?'pos':a.includes('neg')?'neg':'';}
  return v==='pos'||v==='neg'?v:'';
};
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
    const cleared=it.clear?fmsClear(o[it.clear]):'';
    let score=it.bi
      ?((right!=null&&left!=null)?Math.min(right,left):(right!=null?right:left))
      :single;
    // A painful clearing test zeroes its movement — that is the whole point of it.
    if(score!=null&&cleared==='pos')score=0;
    const asym=(it.bi&&right!=null&&left!=null&&right!==left)?Math.abs(right-left):null;
    return{...it,right,left,single,score,cleared,asym,filled:score!=null};
  });
  const scored=items.filter(i=>i.filled);
  const mob=o.ankleMob||{};
  const cm=o.comments||{};
  const pr=o.problems||{};
  return{items,n:scored.length,
    total:scored.length?scored.reduce((a,i)=>a+i.score,0):null,
    asym:items.some(i=>i.asym!=null),
    zeros:items.filter(i=>i.filled&&i.score===0).length,
    any:scored.length>0||items.some(i=>i.cleared)||!!(mob.right||mob.left)||!!o.observations||Object.keys(cm).some(k=>cm[k])||Object.keys(pr).some(k=>pr[k]&&pr[k].length)}
}
/* "Tespit Edilen Problemler": the findings a coach can tick against a movement, keyed by the
   movement's comment id (FMS_SHEET `cm.id`). Only these four movements have a list; the others
   keep a free-text comment. The record stores the option ids (`problems[id]=['heel',…]`), so a
   rewording here never orphans a saved screen. [id, tr, en] */
const FMS_PROBLEMS={
  deepSquat:[
    ['depth','Yetersiz squat derinliği','Insufficient squat depth'],
    ['heels','Topukların kalkması','Heels lift off the floor'],
    ['valgus','Diz valgusu','Knee valgus'],
    ['trunkFlex','Gövdenin öne fleksiyonu','Forward trunk flexion'],
    ['armsDrop','Kolların öne düşmesi','Arms fall forward'],
    ['pelvisR','Pelvisin sağa kayması','Pelvis shifts to the right'],
    ['pelvisL','Pelvisin sola kayması','Pelvis shifts to the left']],
  hurdleStep:[
    ['balance','Denge kaybı','Loss of balance'],
    ['lumbar','Lomber omurgada hareket','Movement in the lumbar spine'],
    ['trunkSide','Gövdenin yana eğilmesi','Trunk leans sideways'],
    ['trunkFwd','Gövdenin öne eğilmesi','Trunk leans forward'],
    ['hurdleTouch','Engelle temas','Contact with the hurdle']],
  inlineLunge:[
    ['balance','Denge kaybı','Loss of balance'],
    ['noContact','Sopa teması sağlanmıyor','Dowel contact is not maintained'],
    ['notVertical','Sopa dikey değil','Dowel is not vertical'],
    ['sagittal','Sopa ve ayaklar sagital düzlemde kalmıyor','Dowel and feet do not stay in the sagittal plane'],
    ['kneeBoard','Diz tahtanın ortasına değmiyor','Knee does not touch the board behind the heel']],
  rotary:[
    ['balance','Denge kaybı','Loss of balance'],
    ['liftTogether','El ve diz aynı anda yerden ayrılmadı','Hand and knee did not leave the floor together'],
    ['noExtend','Diz ve dirsek tam uzanmıyor','Knee and elbow do not fully extend'],
    ['noTouch','Malleole dokunamadı','Could not touch the malleolus']],
};
/* The ticked findings of one movement, as words in the report language. */
const fmsProblemLabels=(f,id)=>{
  const sel=((f||{}).problems||{})[id];
  return(FMS_PROBLEMS[id]||[]).filter(o=>Array.isArray(sel)&&sel.includes(o[0])).map(o=>L(o[1],o[2]));
};
const FMS_HAS=t=>{const f=t&&t.fms;return fmsCalc(f).any||!!(f&&f.pdf);};

/* The sheet's own layout — one entry per line of the official score sheet, top to
   bottom. The same list draws the card on screen and the page on paper, so the two
   cannot drift apart.
     f    the field on the record      side  'right' | 'left' | '' (one answer)
     kind score 0-3 · clear +/− · ryg red / yellow / green
     lab  [tr,en] and ls: its row-span, on the first line of a group
     fin  the Final Score cell that starts here: {of: movement id | null, n: rows}
     cm   the Comments cell that starts here:    {id: key in `comments`, n: rows}
     sub  a clearing / mobility line under its movement (small red label)
     rh   the line's height in ordinary lines (default 1): a one-line movement whose comment
          would otherwise show a line and a half */
const FMS_SHEET=[
  {f:'deepSquat',side:'',kind:'score',lab:['DEEP SQUAT','DEEP SQUAT'],ls:1,fin:{of:'deepSquat',n:1},cm:{id:'deepSquat',n:1},rh:2},
  {f:'hurdleStep',side:'right',kind:'score',lab:['HURDLE STEP','HURDLE STEP'],ls:2,fin:{of:'hurdleStep',n:2},cm:{id:'hurdleStep',n:2}},
  {f:'hurdleStep',side:'left',kind:'score'},
  {f:'inlineLunge',side:'right',kind:'score',lab:['IN-LINE LUNGE','IN-LINE LUNGE'],ls:2,fin:{of:'inlineLunge',n:4},cm:{id:'inlineLunge',n:2}},
  {f:'inlineLunge',side:'left',kind:'score'},
  {f:'anklePain',side:'right',kind:'clear',sub:true,lab:['ANKLE CLEARING - PAIN','ANKLE CLEARING - PAIN'],ls:2,cm:{id:'ankle',n:4}},
  {f:'anklePain',side:'left',kind:'clear',sub:true},
  {f:'ankleMob',side:'right',kind:'ryg',sub:true,lab:['ANKLE CLEARING - MOBILITY','ANKLE CLEARING - MOBILITY'],ls:2,fin:{of:null,n:2}},
  {f:'ankleMob',side:'left',kind:'ryg',sub:true},
  {f:'shoulderMobility',side:'right',kind:'score',lab:['SHOULDER MOBILITY','SHOULDER MOBILITY'],ls:2,fin:{of:'shoulderMobility',n:4},cm:{id:'shoulderMobility',n:4}},
  {f:'shoulderMobility',side:'left',kind:'score'},
  {f:'shoulderClear',side:'right',kind:'clear',sub:true,lab:['SHOULDER CLEARING','SHOULDER CLEARING'],ls:2},
  {f:'shoulderClear',side:'left',kind:'clear',sub:true},
  {f:'aslr',side:'right',kind:'score',lab:['ACTIVE STRAIGHT-LEG RAISE','ACTIVE STRAIGHT-LEG RAISE'],ls:2,fin:{of:'aslr',n:2},cm:{id:'aslr',n:2}},
  {f:'aslr',side:'left',kind:'score'},
  {f:'trunkPushup',side:'',kind:'score',lab:['TRUNK STABILITY PUSH-UP','TRUNK STABILITY PUSH-UP'],ls:1,fin:{of:'trunkPushup',n:2},cm:{id:'trunkPushup',n:2}},
  {f:'pushupClear',side:'',kind:'clear',sub:true,lab:['EXTENSION CLEARING','EXTENSION CLEARING'],ls:1},
  {f:'rotary',side:'right',kind:'score',lab:['ROTARY STABILITY','ROTARY STABILITY'],ls:2,fin:{of:'rotary',n:3},cm:{id:'rotary',n:3}},
  {f:'rotary',side:'left',kind:'score'},
  {f:'rotaryClear',side:'',kind:'clear',sub:true,lab:['FLEXION CLEARING','FLEXION CLEARING'],ls:1},
];
/* What the record holds for one line of the sheet. */
const fmsCell=(f,r)=>{const v=(f||{})[r.f];return r.side?((v&&v[r.side])||''):(v==null?'':v);};
/* The seven movements as tests of their own (`fms_<movement>` in the catalog). Each card edits
   only its own lines of the sheet — the movement, and the clearing / mobility lines filed under
   it — in the shared `fms` record. */
const FMS_PART_IDS=FMS_ITEMS.map(i=>'fms_'+i.id);
const fmsPartItem=id=>FMS_ITEMS.find(i=>'fms_'+i.id===id)||null;
const FMS_ROW_OF={anklePain:'inlineLunge',ankleMob:'inlineLunge',shoulderClear:'shoulderMobility',pushupClear:'trunkPushup',rotaryClear:'rotary'};
const fmsRowsOf=mid=>FMS_SHEET.filter(r=>(FMS_ROW_OF[r.f]||r.f)===mid);
/* The comment cells a movement owns on the sheet (the in-line lunge also owns the ankle one). */
const fmsCommentsOf=mid=>fmsRowsOf(mid).filter(r=>r.cm).map(r=>r.cm.id);
/* Does a battery carry any of the FMS: the whole sheet (older records) or one of its movements. */
const fmsInBattery=bat=>Array.isArray(bat)&&bat.some(id=>id==='fms'||FMS_PART_IDS.includes(id));
/* The movements a record shows: every one for the whole-sheet test, else the ones picked. */
const fmsMovesIn=bat=>!Array.isArray(bat)||bat.includes('fms')?FMS_ITEMS.map(i=>i.id):FMS_ITEMS.filter(i=>bat.includes('fms_'+i.id)).map(i=>i.id);
/* The line's words for the footer of the sheet, in the report language. */
const FMS_LEGEND=()=>[
  L('Ham Skor: Bu skor sağ ve sol tarafın ayrı puanlanması için kullanılır. Yedi testin beşinde sağ ve sol taraf puanlanır ve ikisi de bu alana kaydedilir.',
    'Raw Score: This score is used to denote right and left side scoring. The right and left sides are scored in five of the seven tests and both are documented in this space.'),
  L('Nihai Skor: Bu skor testin genel puanını gösterir. Ham skorların (her iki taraf) en düşüğü testin nihai skoru olarak alınır. Sağda üç, solda iki puan alan bir kişinin nihai skoru ikidir. Nihai skorlar toplanarak toplam skoru verir.',
    'Final Score: This score is used to denote the overall score for the test. The lowest score for the raw score (each side) is carried over to give a final score for the test. A person who scores a three on the right and a two on the left would receive a final score of two. The final score is then summarized and used as a total score.'),
  L('Temizleme Testi: Pozitif ağrıyı, negatif ağrı olmadığını gösterir. Ağrı varsa (+) o testin skoru 0 olur.',
    'Clearing Test: A positive indicates pain. A negative indicates no pain. If pain is present (+), the score for that test would result in a 0.'),
];
const fmsAgeAt=(dob,date)=>{
  if(!dob||!date)return null;
  const b=parseD(dob),n=parseD(date);if(isNaN(b)||isNaN(n))return null;
  let y=n.getFullYear()-b.getFullYear();
  if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;
  return y>=0?y:null;
};
/* The identity strip across the top of the sheet. Name, date, birth date, age and sex come
   from the athlete and the test; the two measurements are typed once and carried forward
   from the athlete's last screen until this one has its own. */
function fmsHeader(test,ath){
  const t=test||{},f=t.fms||{},a=ath||{};
  const carried=k=>{
    const prev=(a.tests||[]).filter(x=>x&&x.id!==t.id&&x.date&&(!t.date||x.date<=t.date)&&x.fms&&x.fms[k]!=null&&x.fms[k]!=='')
      .sort((p,q)=>q.date.localeCompare(p.date));
    return prev.length?prev[0].fms[k]:'';
  };
  const own=k=>f[k]!=null?f[k]:carried(k);
  return{name:a.name||'',date:t.date||'',dob:a.dateOfBirth||'',age:fmsAgeAt(a.dateOfBirth,t.date),
    sex:a.sex==='M'?L('Erkek','Male'):a.sex==='F'?L('Kadın','Female'):'',
    tibia:own('tibia'),hand:own('hand')};
}
const fmsTotalTone=t=>t==null?'':t>=17?'#16a34a':t>=14?'#d99a00':'#dc2626';

/* ---- The sheet on paper: one A4 portrait page, drawn after the official score sheet. ---- */
const FMS_RED='#ec1c24';
const FMS_SHEET_CSS=`
.fmsx{width:100%;color:#1b1b1b;font-family:'Google Sans',Arial,sans-serif;break-inside:avoid;page-break-inside:avoid}
.fmsx *{box-sizing:border-box}
.fmsx-head{display:flex;height:21mm;margin-bottom:5mm}
.fmsx-head .lg{flex:none;width:21mm;background:${FMS_RED}}
.fmsx-head .lg img{display:block;width:100%;height:100%;object-fit:cover}
.fmsx-head .tt{flex:1;margin-left:1.6mm;background:${FMS_RED};color:#fff;display:flex;align-items:center;padding:0 6mm;font-size:19pt;line-height:1.1;letter-spacing:.04em;font-weight:700}
.fmsx-id{margin-bottom:5mm}
.fmsx-id .rw{display:flex;gap:0;border-bottom:.3mm solid #666;margin-bottom:3.4mm;font-size:8pt;letter-spacing:.03em;text-transform:uppercase}
.fmsx-id .rw:last-child{margin-bottom:0}
.fmsx-id .fd{display:flex;gap:1.6mm;align-items:baseline;min-width:0;padding-right:3mm}
.fmsx-id .fd b{font-weight:500;color:#333;white-space:nowrap}
.fmsx-id .fd span{font-weight:600;text-transform:none;letter-spacing:0;font-size:9pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fmsx table{width:100%;border-collapse:collapse;table-layout:fixed;border:.3mm solid #777;margin:0;border-radius:0;overflow:visible}
.fmsx td,.fmsx th{font-family:'Google Sans',Arial,sans-serif}
.fmsx th{background:${FMS_RED};color:#fff;font-weight:400;font-size:9.5pt;letter-spacing:.05em;height:8.4mm;text-align:center;padding:0;border:none;text-transform:uppercase;border-left:.3mm solid #fff}
.fmsx th:first-child{border-left:none}
.fmsx td{border:.3mm solid #777;padding:0 2mm;height:7.6mm;font-size:9pt;vertical-align:middle;background:#fff;overflow:hidden}
.fmsx td.lab{font-size:9pt;letter-spacing:.03em;text-transform:uppercase;text-align:left}
.fmsx td.lab.sub{color:${FMS_RED};font-size:7.6pt;text-align:right;padding-right:2mm;border-top:.3mm dashed #777}
.fmsx td.sd{width:100%;text-align:center;color:${FMS_RED};font-size:8.5pt;padding:0}
.fmsx td.raw,.fmsx td.fin{text-align:center;font-size:12pt;font-weight:700;padding:0}
.fmsx td.cm{font-size:8pt;line-height:1.25;vertical-align:top;padding:1.1mm 2mm;overflow:hidden}
.fmsx td.cm div{overflow:hidden;white-space:pre-wrap;word-break:break-word}
.fmsx .pos{color:#dc2626}.fmsx .neg{color:#16a34a}
.fmsx .ryg{display:flex;height:7.5mm}
.fmsx .ryg span{flex:1;display:flex;align-items:center;justify-content:center;font-size:8.5pt;font-weight:400;border-left:.3mm solid #777}
.fmsx .ryg span:first-child{border-left:none}
.fmsx .ryg .r{color:#dc2626}.fmsx .ryg .y{color:#d99a00}.fmsx .ryg .g{color:#16a34a}
.fmsx .ryg .r.on{background:#dc2626;color:#fff}.fmsx .ryg .y.on{background:#f2c200;color:#1b1b1b}.fmsx .ryg .g.on{background:#16a34a;color:#fff}
.fmsx tr.tot td{height:8.4mm;background:#fff;font-size:10pt}
.fmsx tr.tot td.red{background:${FMS_RED};color:#fff;font-size:9.5pt;letter-spacing:.04em;text-transform:uppercase;border-color:${FMS_RED}}
.fmsx tr.tot td.v{font-size:13pt;font-weight:700;text-align:left;padding-left:4mm}
.fmsx-obs{margin-top:2.4mm;font-size:8pt;line-height:1.3;max-height:12mm;overflow:hidden;color:#333}
.fmsx-obs b{font-weight:600}
.fmsx-foot{display:flex;gap:1.6mm;margin-top:5mm;align-items:stretch}
.fmsx-foot .lg{flex:none;width:24mm;background:${FMS_RED}}
.fmsx-foot .lg img{display:block;width:100%;height:100%;object-fit:cover}
.fmsx-foot .tx{flex:1;background:#444;color:#e9e9e9;padding:3.2mm 4.4mm;font-size:6.6pt;line-height:1.38}
.fmsx-foot .tx p+p{margin-top:2.2mm}
.fmsx-gen{margin-top:3mm;text-align:center;font-size:7pt;letter-spacing:.05em;color:#8b9099}
`;
function fmsSheetHtml(test,ath,opts){
  const o=opts||{};
  const f=(test&&test.fms)||{};
  const c=fmsCalc(f);
  const hd=fmsHeader(test,ath);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const logo=location.origin+'/fms-logo.png';
  const byId={};c.items.forEach(i=>{byId[i.id]=i;});
  const tone=v=>v==null||v===''?'':(Number(v)<=1?'#dc2626':Number(v)===2?'#d99a00':'#16a34a');
  const cm=f.comments||{};
  const RH=7.6;
  const field=(lbl,val,w)=>`<div class="fd" style="${w?`flex:0 0 ${w}`:'flex:1'}"><b>${lbl}:</b><span>${esc(val)}</span></div>`;
  const rows=FMS_SHEET.map((r,i)=>{
    let td='';
    if(r.lab)td+=`<td class="lab${r.sub?' sub':''}" rowspan="${r.ls}" colspan="${r.side?1:2}">${esc(L(r.lab[0],r.lab[1]))}</td>`;
    if(r.side)td+=`<td class="sd">${r.side==='right'?'R':'L'}</td>`;
    const v=fmsCell(f,r);
    if(r.kind==='score')td+=`<td class="raw"${v!==''?` style="color:${tone(v)}"`:''}>${esc(v)}</td>`;
    else if(r.kind==='clear')td+=`<td class="raw">${v==='pos'?'<span class="pos">+</span>':v==='neg'?'<span class="neg">&minus;</span>':''}</td>`;
    else td+=`<td class="raw" style="padding:0"><div class="ryg">${['r','y','g'].map(k=>`<span class="${k}${v===k?' on':''}">${k.toUpperCase()}</span>`).join('')}</div></td>`;
    if(r.fin){
      const it=r.fin.of?byId[r.fin.of]:null;
      td+=`<td class="fin" rowspan="${r.fin.n}"${it&&it.score!=null?` style="color:${tone(it.score)}"`:''}>${it&&it.score!=null?it.score:''}</td>`;
    }
    if(r.cm){
      const h=FMS_SHEET.slice(i,i+r.cm.n).reduce((a,x)=>a+(x.rh||1)*RH,0);
      // A movement with a findings list prints what was ticked (and a comment typed before the list existed).
      const txt=FMS_PROBLEMS[r.cm.id]?[fmsProblemLabels(f,r.cm.id).join(' · '),cm[r.cm.id]].filter(Boolean).join(' · '):(cm[r.cm.id]||'');
      td+=`<td class="cm" rowspan="${r.cm.n}"><div style="max-height:${h-2}mm">${esc(txt)}</div></td>`;
    }
    return`<tr${r.rh?` style="height:${r.rh*RH}mm"`:''}>${td}</tr>`;
  }).join('');
  const obs=[f.observations,o.note].filter(x=>x&&String(x).trim());
  return`<div class="fmsx">
  <div class="fmsx-head"><div class="lg"><img src="${logo}" alt="FMS"/></div><div class="tt"><div>${L('FONKSİYONEL HAREKET<br>TARAMASI PUAN KÂĞIDI','FUNCTIONAL MOVEMENT<br>SCREEN SCORE SHEET')}</div></div></div>
  <div class="fmsx-id">
    <div class="rw">${field(L('Ad','Name'),hd.name)}${field(L('Tarih','Date'),fd(hd.date),'46mm')}${field(L('Doğum','DOB'),fd(hd.dob),'40mm')}</div>
    <div class="rw">${field(L('Tibia Boyu','Tibia Height'),hd.tibia===''?'':hd.tibia+' cm','46mm')}${field(L('El Uzunluğu','Hand Length'),hd.hand===''?'':hd.hand+' cm','46mm')}${field(L('Yaş','Age'),hd.age==null?'':hd.age,'30mm')}${field(L('Cinsiyet','Gender'),hd.sex)}</div>
  </div>
  <table>
    <colgroup><col style="width:27.5%"/><col style="width:6.5%"/><col style="width:16%"/><col style="width:15%"/><col style="width:35%"/></colgroup>
    <tr><th colspan="2">${L('Test','Screen')}</th><th>${L('Ham Skor','Raw Score')}</th><th>${L('Nihai Skor','Final Score')}</th><th>${L('Tespit Edilen Problemler','Identified Problems')}</th></tr>
    ${rows}
    <tr class="tot"><td class="red" colspan="2">${L('Toplam Tarama Skoru','Total Screen Score')}</td><td class="v" colspan="3"${c.total!=null?` style="color:${fmsTotalTone(c.total)}"`:''}>${c.total!=null?c.total+' / 21':''}</td></tr>
  </table>
  ${obs.length?`<div class="fmsx-obs"><b>${L('Gözlemler:','Observations:')}</b> ${esc(obs.join(' · '))}</div>`:''}
  <div class="fmsx-foot"><div class="tx">${FMS_LEGEND().map(p=>`<p>${esc(p)}</p>`).join('')}</div><div class="lg"><img src="${logo}" alt="FMS"/></div></div>
  ${o.foot?`<div class="fmsx-gen">${o.foot}</div>`:''}
</div>`;
}
/* ---- The page that follows the score sheet: what each of the seven movements is for. ----
   One A4 portrait page, a picture on the left and the words beside it. The pictures live in tests/
   and fms/ (shrunk for print). Only the movements the record screened are listed. The movement names are the English FMS terms in both
   languages; the explanations follow the language setting. */
const FMS_INFO=[
  {id:'deepSquat',img:'tests/deep-squat.jpg',name:'Deep Squat',
    tr:'Tüm vücut mekaniğini ve nöromüsküler kontrolü test eder. Kalça, diz ve ayak bileğinin simetrik mobilite ve stabilitesini ölçer. Başın üstündeki çubuk omuzlar ve sırtın da simetrik hareket edebildiğini gösterir. Günlük hayatta ya da sporda tam derinliğe nadiren inilir. Yine de bu kalıba erişebilmek, her seferinde maksimum hareket açıklığının sınırına dayanmamanı sağlayan bir tampon alan yaratır.',
    en:'Tests whole-body mechanics and neuromuscular control. Measures the symmetrical mobility and stability of the hips, knees and ankles. The dowel held overhead shows that the shoulders and back can also move symmetrically. Full depth is rarely reached in daily life or in sport. Still, being able to access this pattern creates a buffer zone, so you are not up against the limit of your maximum range of motion every time.'},
  {id:'hurdleStep',img:'tests/hurdle-step.jpg',name:'Hurdle Step',
    tr:'Yürüme ve ivmelenmenin temel parçası olan adım ve koşu mekaniğini, tek bacak üzerinde denge ve kontrolle birlikte test eder. Bir bacak üzerinde dururken diğer bacağın ayak bileği, diz ve kalçasını kontrollü şekilde bükerek adım atabilme becerisine bakar.',
    en:'Tests the stepping and running mechanics that underlie walking and acceleration, together with balance and control on one leg. Looks at the ability to step by bending the ankle, knee and hip of one leg in a controlled way while standing on the other.'},
  {id:'inlineLunge',img:'fms/inline-lunge.jpg',name:'In-Line Lunge',
    tr:'Hurdle Step koşu ve yürümeyi incelerken, In-Line Lunge yavaşlama ve yön değiştirme hareketlerini yansıtır. Alt vücudu ince bir tabanda, ayaklar arka arkaya konumda yük altına sokar. Böylece denge, kalça-diz-ayak bileği kontrolü ve sağ-sol farkı görülür.',
    en:'While the Hurdle Step examines running and walking, the In-Line Lunge reflects deceleration and change of direction. It loads the lower body on a narrow base, with the feet one behind the other. This shows balance, hip-knee-ankle control and right-left differences.'},
  {id:'shoulderMobility',img:'tests/shoulder-mobility.jpg',name:'Shoulder Mobility',
    tr:'Omuz kuşağı, göğüs kafesi (torasik omurga) ve kolların birbiriyle uyumlu çalışma ritmini gösterir. İki elin sırtta birbirine ne kadar yaklaşabildiğine bakılır. Bu hareket şut, pas ve baş üstü hareketler için önemlidir.',
    en:'Shows how well the shoulder girdle, the rib cage (thoracic spine) and the arms work together. Looks at how close the two hands can get to each other behind the back. This movement matters for shooting, passing and overhead movements.'},
  {id:'aslr',img:'tests/aslr.jpg',name:'Active Straight-Leg Raise',
    tr:'Bükülen kalçanın aktif mobilitesini ortaya çıkarır. Bir bacak havadayken diğer bacak ve gövde stabil kalabiliyor mu, ona bakar. Ayrıca arka bacak kaslarının esnekliği ve pelvis kontrolü görülür.',
    en:'Reveals the active mobility of the flexing hip. Looks at whether the other leg and the trunk stay stable while one leg is in the air. It also shows hamstring flexibility and pelvic control.'},
  {id:'trunkPushup',img:'fms/trunk-pushup.jpg',name:'Trunk Stability Push-Up',
    tr:'Refleksif core stabilizasyonunun temel gözlemidir. Kollar şınav kalıbında çalışırken omurga ve kalçada hareket olmaması beklenir. Şınava yerden “ölü başlangıçla” başlandığı için, ana kasların çalışmasına karşı sagittal düzlemde stabilite ve lumbopelvik kontrol test edilir.',
    en:'The basic observation of reflexive core stabilization. While the arms work in a push-up pattern, no movement is expected in the spine and hips. Because the push-up starts from the floor with a “dead start”, stability in the sagittal plane against the work of the prime movers, and lumbopelvic control, are tested.'},
  {id:'rotary',img:'fms/rotary-stability.jpg',name:'Rotary Stability',
    tr:'Karmaşık bir kalıptır. Doğru nöromüsküler koordinasyon ve tırmanma gibi temel kalıplardaki mobilite ve stabilite uyumunu gerektirir. Dört ayak pozisyonunda kol ve bacak birlikte hareket ederken gövdenin kontrolünü korumaya bakar. Bu, güç aktarımı ve çok düzlemli gövde stabilitesi açısından önemlidir.',
    en:'A complex pattern. It requires proper neuromuscular coordination and the combined mobility and stability of basic patterns such as crawling. In the quadruped position, it looks at whether control of the trunk is kept while the arm and leg move together. This matters for force transfer and multiplanar trunk stability.'},
];
/* Fixed height, so the page cannot spill onto a second sheet: the rows share what is left under the
   band, and anything that still does not fit is clipped rather than pushed over. 266mm sits under both
   print pages' usable height (A4 less 12mm margins in the report, 10mm in the lone sheet). */
const FMS_INFO_CSS=`
.fmsi{width:100%;height:266mm;display:flex;flex-direction:column;color:#1b1b1b;break-inside:avoid;page-break-inside:avoid;overflow:hidden;
  break-before:page;page-break-before:always}
.fmsi *{box-sizing:border-box}
.fmsi-head{flex:none;display:flex;height:15mm;margin-bottom:3mm}
.fmsi-head .lg{flex:none;width:15mm;background:${FMS_RED}}
.fmsi-head .lg img{display:block;width:100%;height:100%;object-fit:cover}
.fmsi-head .tt{flex:1;margin-left:1.6mm;background:${FMS_RED};color:#fff;display:flex;align-items:center;padding:0 5mm;font-size:15pt;letter-spacing:.04em;font-weight:700}
.fmsi-list{flex:1;min-height:0;display:flex;flex-direction:column}
.fmsi-row{flex:1 1 0;min-height:0;max-height:40mm;display:flex;align-items:center;gap:4.5mm;border-top:.25mm solid #cfcfcf;padding:1mm 0}
.fmsi-row:first-child{border-top:none}
.fmsi-img{flex:none;width:52mm;height:29.25mm;background:#eee;overflow:hidden}
.fmsi-img img{display:block;width:100%;height:100%;object-fit:cover}
.fmsi-tx{flex:1;min-width:0}
.fmsi-tx h3{display:flex;align-items:baseline;gap:2.2mm;margin:0 0 1.2mm;font-size:14pt;line-height:1.15;font-weight:700;letter-spacing:.01em;color:#111}
.fmsi-tx h3 i{font-style:normal;color:${FMS_RED};font-weight:700}
.fmsi-tx p{margin:0;font-size:9pt;line-height:1.36;color:#2b2b2b}
`;
function fmsInfoHtml(moves){
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const base=location.origin;
  const list=Array.isArray(moves)&&moves.length?FMS_INFO.filter(m=>moves.includes(m.id)):FMS_INFO;
  return`<div class="fmsi">
  <div class="fmsi-head"><div class="lg"><img src="${base}/fms-logo.png" alt="FMS"/></div><div class="tt">${L('FMS HAREKET KALIPLARI','FMS MOVEMENT PATTERNS')}</div></div>
  <div class="fmsi-list">${list.map((m,i)=>`<div class="fmsi-row"><div class="fmsi-img"><img src="${base}/${m.img}" alt="${esc(m.name)}"/></div><div class="fmsi-tx"><h3><i>${i+1}</i><span>${esc(m.name)}</span></h3><p>${esc(L(m.tr,m.en))}</p></div></div>`).join('')}</div>
</div>`;
}
/* The sheet alone, as its own document — what the card's own print button opens. */
function printFmsSheet(test,ath,opts){
  const w=window.open('','_blank','width=900,height=1200');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site in the browser.'));return;}
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FMS — ${String((ath&&ath.name)||'').replace(/</g,'&lt;')}</title>
<style>
${RPT_FONT}
@page{size:A4 portrait;margin:10mm}
*{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#fff;font-family:'Google Sans',Arial,sans-serif}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:13px;z-index:9999}
.print-bar button{background:#ec1c24;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.scr-sp{height:56px}
.pg{max-width:190mm;margin:0 auto;padding:0 0 10mm}
@media print{.print-bar,.scr-sp{display:none}.pg{max-width:none;padding:0}}
${FMS_SHEET_CSS}
${FMS_INFO_CSS}
</style></head><body>
<div class="print-bar">${L('FMS puan kâğıdı hazır','FMS score sheet is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp"></div>
<div class="pg">${fmsSheetHtml(test,ath,opts)}${fmsInfoHtml(fmsMovesIn(test&&test.battery))}</div>
</body></html>`;
  w.document.write(html);w.document.close();
  printWhenImagesReady(w,{safety:8000});
}

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
   READINGS OF THE NEWER TESTS — one place that turns the raw entries into the numbers a
   card shows and a report prints, so the two cannot disagree.
   ========================================================= */
const tN=v=>{const n=Number(v);return(v===''||v==null||!isFinite(n))?null:n;};
/* Right/left asymmetry in per cent of the better side: the longer reach or hold (`hi`), the
   quicker time (`lo`). Under 10% reads as balanced, 10-15% is worth watching, 15%+ is a flag. */
function asymPct(a,b,dir){
  const x=tN(a),y=tN(b);if(x==null||y==null||x<=0||y<=0)return null;
  const best=dir==='lo'?Math.min(x,y):Math.max(x,y);
  return+(Math.abs(x-y)/best*100).toFixed(1);
}
const asymLevel=p=>p==null?'':p<10?'ok':p<15?'warn':'bad';
const ASYM_COL={ok:'#16a34a',warn:'#b88400',bad:'#dc2626'};
/* 505 COD: a time per turning side; the better one is the athlete's 505. A record from before
   the sides existed carries only `fiveZeroFive`, and still reads as that. */
function cod505Calc(t){
  const o=(t&&t.cod505)||{};const r=tN(o.right),l=tN(o.left);
  const best=r!=null&&l!=null?Math.min(r,l):(r!=null?r:l!=null?l:tN(t&&t.fiveZeroFive));
  return{r,l,best,pct:asymPct(r,l,'lo'),slow:r!=null&&l!=null&&r!==l?(r>l?'right':'left'):null};
}
/* 5-10 m acceleration: the 5 m and 10 m gates (shared with the sprint's split times, so a run
   timed once feeds both the acceleration test and the sprint F-V profile). */
function accelCalc(t){
  const sp=(t&&t.sprintSplits)||{};const t5=tN(sp.t5),t10=tN(sp.t10);
  const split=t5!=null&&t10!=null&&t10>t5?+(t10-t5).toFixed(2):null;
  return{t5,t10,split,v5:t5>0?+(5/t5).toFixed(2):null,v510:split>0?+(5/split).toFixed(2):null,v10:t10>0?+(10/t10).toFixed(2):null};
}
/* Active hip IR / ER, seated (°): each side's two rotations and their total arc. */
function hipRotCalc(t){
  const o=(t&&t.hipRot)||{};const irR=tN(o.irR),irL=tN(o.irL),erR=tN(o.erR),erL=tN(o.erL);
  const totR=irR!=null&&erR!=null?irR+erR:null,totL=irL!=null&&erL!=null?irL+erL:null;
  const d=(a,b)=>a!=null&&b!=null?+Math.abs(a-b).toFixed(1):null;
  return{irR,irL,erR,erL,totR,totL,dIr:d(irR,irL),dEr:d(erR,erL),dTot:d(totR,totL),pTot:asymPct(totR,totL,'hi')};
}
/* Thomas test, per side. Three findings, each a −/+ call; the two angles, when measured, make the
   call themselves where the coach has not: the thigh resting above the horizontal (hip angle > 0°)
   reads as short hip flexors (iliopsoas), knee flexion under 80° as a short rectus femoris. */
/* [key, name, what a positive looks like as [tr,en]] — read with L() where it is drawn. */
const THOMAS_FIND=[
  ['psoas','Iliopsoas',['Uyluk masaya inmiyor','Thigh does not reach the table']],
  ['rf','Rectus femoris',['Diz fleksiyonu < 80°','Knee flexion < 80°']],
  ['itb','TFL / ITB',['Uyluk abdüksiyona kayıyor','Thigh drifts into abduction']],
];
function thomasCalc(t){
  const side=s=>{
    const o=((t&&t.thomas)||{})[s]||{};const hip=tN(o.hip),knee=tN(o.knee);
    const auto={psoas:hip!=null?(hip>0?'pos':'neg'):'',rf:knee!=null?(knee<80?'pos':'neg'):'',itb:''};
    const res={};THOMAS_FIND.forEach(([k])=>{res[k]=o[k]==='pos'||o[k]==='neg'?o[k]:auto[k];});
    return{hip,knee,res,pos:THOMAS_FIND.filter(([k])=>res[k]==='pos').map(([k])=>k),any:hip!=null||knee!=null||THOMAS_FIND.some(([k])=>res[k])};
  };
  const right=side('right'),left=side('left');
  return{right,left,any:right.any||left.any};
}
/* Active T-spine rotation (°) per side. */
function tSpineCalc(t){
  const o=(t&&t.tSpine)||{};const r=tN(o.right),l=tN(o.left);
  return{r,l,diff:r!=null&&l!=null?+Math.abs(r-l).toFixed(1):null,pct:asymPct(r,l,'hi')};
}
/* Strength. Bench press, trap bar deadlift and barbell squat take a load and the reps done with
   it; the estimated 1RM is Epley's (the load itself on a single, capped at 12 reps where the
   estimate stops being worth much), and relative strength is that over body mass. */
const STR_LIFTS=['benchPress','trapBarDL','backSquat'];
const strE1rm=(kg,reps)=>{if(!(kg>0)||!(reps>0))return null;return reps===1?kg:kg*(1+Math.min(reps,12)/30);};
function strCalc(t,id,bw){
  const o=(t&&t[id])||{};const load=tN(o.load),reps=tN(o.reps);
  const e1=strE1rm(load,reps);const m=tN(bw);
  return{load,reps,e1:e1!=null?+e1.toFixed(1):null,rel:e1!=null&&m>0?+(e1/m).toFixed(2):null};
}
/* Plank holds (s) per side: Copenhagen (short lever) and side plank. */
function holdCalc(t,id){
  const o=(t&&t[id])||{};const r=tN(o.right),l=tN(o.left);
  return{r,l,pct:asymPct(r,l,'hi'),weak:r!=null&&l!=null&&r!==l?(r<l?'right':'left'):null};
}
/* 30-15 IFT. VIFT is the speed of the last stage completed (km/h). VO2max is Buchheit's (2008)
   estimate: 28.3 − 2.15·G − 0.741·A − 0.0357·W + 0.0586·A·VIFT + 1.03·VIFT, G 1 = male / 2 = female,
   A age (years), W body mass (kg). It needs all four; without one it says which is missing. */
function iftCalc(t,ath,bw){
  const v=tN(t&&t.ift3015&&t.ift3015.vift);const a=ath||{};
  const G=a.sex==='M'?1:a.sex==='F'?2:null;
  const A=fmsAgeAt(a.dateOfBirth,t&&t.date);const W=tN(bw);
  const missing=[G==null&&L('cinsiyet','sex'),A==null&&L('doğum tarihi','date of birth'),!(W>0)&&L('kilo','body mass')].filter(Boolean);
  const vo2=v>0&&!missing.length?+(28.3-2.15*G-0.741*A-0.0357*W+0.0586*A*v+1.03*v).toFixed(1):null;
  return{vift:v,vo2,missing,ms:v>0?+(v/3.6).toFixed(2):null};
}
/* The picture printed beside each test — what the athlete, a parent or a physio sees to know what
   was done. Tests without one print without it. */
const TEST_IMG={
  fms_deepSquat:'tests/deep-squat.jpg',fms_hurdleStep:'tests/hurdle-step.jpg',fms_inlineLunge:'fms/inline-lunge.jpg',
  fms_shoulderMobility:'tests/shoulder-mobility.jpg',fms_aslr:'tests/aslr.jpg',fms_trunkPushup:'fms/trunk-pushup.jpg',fms_rotary:'fms/rotary-stability.jpg',
  ohs:'tests/deep-squat.jpg',ankleDF:'tests/ankle-df.jpg',aslr:'tests/aslr.jpg',hipRot:'tests/hip-rotation.jpg',thomas:'tests/thomas.jpg',tSpine:'tests/t-spine-rotation.jpg',
  cmj:'tests/cmj.jpg',lateralCmj:'tests/lateral-cmj.jpg',squatJump:'tests/squat-jump.jpg',horizontalJump:'tests/broad-jump.jpg',dropJump:'tests/drop-jump.jpg',
  accel:'tests/accel-5-10.jpg',tTest:'tests/t-test.jpg',fiveZeroFive:'tests/cod-505.jpg',
};

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
    tr:{w:'Sporcuya yedi temel hareket kalıbı uygulanır: Deep Squat, Hurdle Step, In-Line Lunge, Shoulder Mobility, Active Straight-Leg Raise, Trunk Stability Push-Up ve Rotary Stability. Her hareket 0-3 arasında puanlanır; çift taraflı hareketlerde sağ ve sol ayrı ayrı puanlanır ve düşük olan taraf geçerlidir.',p:'Temel hareket kalitesini, mobilite-stabilite dengesini, sağ-sol asimetrilerini ve ağrı yaratan hareketleri tek bir tarama ile ortaya koymak için kullanılır. Toplam skor 21 üzerindendir.'},
    en:{w:'The athlete is taken through seven basic movement patterns: Deep Squat, Hurdle Step, In-Line Lunge, Shoulder Mobility, Active Straight-Leg Raise, Trunk Stability Push-Up and Rotary Stability. Each is scored 0-3; the bilateral movements are scored per side and the lower side is the one that counts.',p:'Used to establish basic movement quality, the balance between mobility and stability, right-left asymmetry and any movement that provokes pain, in a single screen. The total is out of 21.'}},
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
  fiveZeroFive:{n:'505 COD',
    tr:{w:'Sporcu 10 metre hızlanarak gelir, kapıdan 5 metre sonra çizgide 180° döner ve 5 metre geri sprint eder. Dönüş her iki ayakla ayrı ayrı yapılır.',p:'Yön değiştirme hızını, yavaşlama ve yeniden hızlanma becerisini ve sağ-sol dönüş farkını (asimetri %) değerlendirmek için kullanılır.'},
    en:{w:'The athlete runs in over 10 metres, turns 180° on the line 5 metres past the gate and sprints 5 metres back, turning off each foot in turn.',p:'Used to assess change-of-direction speed, the ability to decelerate and re-accelerate, and the right–left turning difference (asymmetry %).'}},
  accel:{n:'5-10m Acceleration',
    tr:{w:'Sporcu duruştan çıkış yapar; 5 m ve 10 m kapılarından geçiş süreleri alınır.',p:'İlk adım ivmelenmesini ve 5-10 m arasındaki hız kazanımını değerlendirmek için kullanılır.'},
    en:{w:'From a standing start, the athlete sprints through gates at 5 m and 10 m.',p:'Used to assess first-step acceleration and the speed gained between 5 and 10 m.'}},
  hipRot:{n:'Active Hip IR/ER (Seated)',
    tr:{w:'Sporcu masanın kenarında oturur; kalça ve diz 90° fleksiyondayken bacağını aktif olarak içe ve dışa döndürür, açı gonyometre ya da inklinometre ile ölçülür.',p:'Kalça iç-dış rotasyon hareket açıklığını, toplam rotasyon arkını ve sağ-sol farkını değerlendirmek için kullanılır.'},
    en:{w:'Seated on the edge of a table with hip and knee at 90°, the athlete actively rotates the leg inwards and outwards; the angle is measured with a goniometer or inclinometer.',p:'Used to assess hip internal and external rotation range, the total rotation arc and the right–left difference.'}},
  thomas:{n:'Thomas Test',
    tr:{w:'Sporcu masanın ucunda sırtüstü yatar, bir dizini göğsüne çeker; diğer bacağın uyluk ve diz konumu gözlenir ve açılar ölçülür.',p:'İliopsoas, rectus femoris ve TFL/ITB uzunluğunu, yani kalça fleksörlerindeki kısalığı değerlendirmek için kullanılır.'},
    en:{w:'Lying back on the end of a table, the athlete hugs one knee to the chest; the position of the other thigh and knee is observed and the angles measured.',p:'Used to assess the length of the iliopsoas, rectus femoris and TFL/ITB — tightness in the hip flexors.'}},
  tSpine:{n:'Active T-Spine Rotation',
    tr:{w:'Sporcu oturur, kalça sabitken sopayı omuzlarında tutarak gövdesini aktif olarak iki yana döndürür; rotasyon açısı ölçülür.',p:'Torasik omurga rotasyon mobilitesini ve sağ-sol farkını değerlendirmek için kullanılır.'},
    en:{w:'Seated with the pelvis fixed and a dowel across the shoulders, the athlete actively rotates the trunk to each side; the rotation angle is measured.',p:'Used to assess thoracic rotation mobility and the right–left difference.'}},
  benchPress:{n:'Bench Press',
    tr:{w:'Sporcu bench press’te belirlenen yükle teknik bozulmadan yapabildiği kadar tekrar yapar (ya da 1RM denemesi).',p:'Üst vücut itiş kuvvetini tahmini 1RM (Epley) ve vücut ağırlığına göre göreli kuvvet olarak değerlendirmek için kullanılır.'},
    en:{w:'The athlete performs as many clean reps as possible with a set load on the bench press (or a 1RM attempt).',p:'Used to assess upper-body pushing strength as an estimated 1RM (Epley) and relative to body mass.'}},
  trapBarDL:{n:'Trap Bar Deadlift',
    tr:{w:'Sporcu trap bar ile belirlenen yükü teknik bozulmadan kaldırabildiği kadar tekrar yapar (ya da 1RM denemesi).',p:'Alt vücut maksimal kuvvetini tahmini 1RM ve göreli kuvvet olarak değerlendirmek için kullanılır.'},
    en:{w:'The athlete lifts a set load with the trap bar for as many clean reps as possible (or a 1RM attempt).',p:'Used to assess lower-body maximal strength as an estimated 1RM and relative strength.'}},
  pullUp:{n:'Pull-Up',
    tr:{w:'Sporcu tam asılı pozisyondan çenesi barın üstüne çıkana kadar çekiş yapar; tam tekrar sayısı (gerekirse ek yükle) kaydedilir.',p:'Üst vücut çekiş kuvvetini ve kuvvet-dayanıklılığını değerlendirmek için kullanılır.'},
    en:{w:'From a dead hang, the athlete pulls until the chin clears the bar; full reps are counted (with added load if needed).',p:'Used to assess upper-body pulling strength and strength-endurance.'}},
  copenhagen:{n:'Short Lever Copenhagen Plank',
    tr:{w:'Sporcu yan plank pozisyonunda üstteki bacağın dizini sehpaya dayar (kısa kol) ve pozisyonu koruyabildiği süre her iki taraf için ölçülür.',p:'Adduktor kas grubunun kuvvet-dayanıklılığını ve sağ-sol farkını değerlendirmek; kasık sakatlığı riskini izlemek için kullanılır.'},
    en:{w:'In a side plank, the athlete rests the top knee on a bench (short lever) and holds; the time is taken for each side.',p:'Used to assess adductor strength-endurance and the right–left difference, and to monitor groin injury risk.'}},
  sidePlank:{n:'Side Plank',
    tr:{w:'Sporcu dirsek üzerinde yan plank pozisyonunu bozulmadan koruyabildiği süre boyunca tutar; her iki taraf ölçülür.',p:'Lateral gövde kaslarının dayanıklılığını ve sağ-sol farkını değerlendirmek için kullanılır.'},
    en:{w:'The athlete holds a side plank on the elbow for as long as the position stays clean; both sides are timed.',p:'Used to assess lateral trunk endurance and the right–left difference.'}},
  backSquat:{n:'Barbell Squat',
    tr:{w:'Sporcu barbell back squat’ta belirlenen yükle teknik bozulmadan yapabildiği kadar tekrar yapar (ya da 1RM denemesi).',p:'Alt vücut kuvvetini tahmini 1RM ve vücut ağırlığına göre göreli kuvvet olarak değerlendirmek için kullanılır.'},
    en:{w:'The athlete performs as many clean reps as possible with a set load on the barbell back squat (or a 1RM attempt).',p:'Used to assess lower-body strength as an estimated 1RM and relative to body mass.'}},
  ift3015:{n:'30-15 Intermittent Fitness Test',
    tr:{w:'Sporcu 40 m mekikte 30 sn koşu, 15 sn aktif dinlenme şeklinde, her kademede 0,5 km/sa artan hızla koşar; tamamlanan son kademenin hızı (VIFT) kaydedilir.',p:'Aralıklı, yön değiştirmeli koşu kapasitesini değerlendirmek, VO2max’ı tahmin etmek ve antrenman koşu hızlarını bireyselleştirmek için kullanılır.'},
    en:{w:'Over a 40 m shuttle, the athlete runs 30 s and recovers actively for 15 s, with the speed rising 0.5 km/h each stage; the speed of the last stage completed (VIFT) is recorded.',p:'Used to assess intermittent, change-of-direction running capacity, estimate VO2max and individualise training running speeds.'}},
  shuttleRun:{n:'Shuttle Run',
    tr:{w:'Sporcu belirlenen mesafeler arasında gidiş-dönüş koşuları yapar.',p:'Dayanıklılığı ve tekrarlı koşu kapasitesini değerlendirmek için kullanılır.'},
    en:{w:'The athlete runs back and forth between set markers.',p:'Used to assess endurance and repeated-running capacity.'}},
};
/* The seven FMS movements explain themselves with the words of the movement-pattern page. */
FMS_INFO.forEach(m=>{TEST_INFO['fms_'+m.id]={n:'FMS '+m.name,
  tr:{w:m.tr,p:'0-3 arasında puanlanır; çift taraflı hareketlerde düşük taraf geçerlidir. Ağrı varsa skor 0 olur.'},
  en:{w:m.en,p:'Scored 0-3; on a bilateral movement the lower side counts. Pain makes the score 0.'}};});
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
  ...Object.fromEntries(FMS_ITEMS.map(it=>['fms_'+it.id,t=>{const f=t.fms||{};const c=fmsCalc(f).items.find(i=>i.id===it.id);
    return!!(c&&(c.filled||c.cleared))||fmsCommentsOf(it.id).some(k=>(f.comments||{})[k]||((f.problems||{})[k]||[]).length);}])),
  hipRot:t=>{const h=hipRotCalc(t);return[h.irR,h.irL,h.erR,h.erL].some(v=>v!=null);},
  thomas:t=>thomasCalc(t).any,
  tSpine:t=>{const x=tSpineCalc(t);return x.r!=null||x.l!=null;},
  yBalance:t=>{const y=ybCalc(t.yBalance);return y.limb!=null||['ant','pm','pl'].some(k=>y.right[k]!=null||y.left[k]!=null);},
  verticalJump:t=>tiNum(t.verticalJump),
  cmj:t=>tiNum(t.cmj),
  lateralCmj:t=>tiNum(t.lateralCmj&&t.lateralCmj.right)||tiNum(t.lateralCmj&&t.lateralCmj.left),
  squatJump:t=>tiNum(t.squatJump),
  horizontalJump:t=>tiNum(t.horizontalJump),
  dropJump:t=>tiNum(t.dropJump),
  accel:t=>{const a=accelCalc(t);return a.t5!=null||a.t10!=null;},
  sprint:t=>!!(t.sprint20m&&(tiNum(t.sprint20m.time)||t.sprint20m.sideStep1||t.sprint20m.sideStep2||t.sprint20m.sideStep3||t.sprint20m.frontRightFoot||t.sprint20m.frontLeftFoot)),
  tTest:t=>tiNum(t.tTest),
  fiveZeroFive:t=>cod505Calc(t).best!=null,
  shuttleRun:t=>tiNum(t.shuttleRun),
  ...Object.fromEntries(STR_LIFTS.map(id=>[id,t=>!!(t[id]&&(tiNum(t[id].load)||tiNum(t[id].reps)))])),
  pullUp:t=>!!(t.pullUp&&(tiNum(t.pullUp.reps)||tiNum(t.pullUp.load))),
  copenhagen:t=>{const h=holdCalc(t,'copenhagen');return h.r!=null||h.l!=null;},
  sidePlank:t=>{const h=holdCalc(t,'sidePlank');return h.r!=null||h.l!=null;},
  ift3015:t=>tiNum(t.ift3015&&t.ift3015.vift),
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
  sp20:'sprint',tTest:'tTest',f505:'fiveZeroFive',shut:'shuttleRun',
  hirR:'hipRot',hirL:'hipRot',herR:'hipRot',herL:'hipRot',htD:'hipRot',tspR:'tSpine',tspL:'tSpine',tspD:'tSpine',
  acc5:'accel',acc10:'accel',f505R:'fiveZeroFive',f505L:'fiveZeroFive',f505D:'fiveZeroFive',
  bp:'benchPress',tbdl:'trapBarDL',sq:'backSquat',bpRel:'benchPress',tbdlRel:'trapBarDL',sqRel:'backSquat',pu:'pullUp',
  cphR:'copenhagen',cphL:'copenhagen',cphD:'copenhagen',spkR:'sidePlank',spkL:'sidePlank',spkD:'sidePlank',vift:'ift3015'};
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
.tinfo th{background:#0a0b0d;color:#fff;font-family:'Google Sans',Arial,sans-serif;font-weight:500;font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:7px 9px;border:none;white-space:normal}
.tinfo td{font-family:'Google Sans',Arial,sans-serif;font-size:9.5px;line-height:1.45;color:var(--text2);text-align:left;padding:8px 9px;border:none;border-top:1px solid var(--border);background:#fff;vertical-align:top;font-weight:400}
.tinfo tr{page-break-inside:avoid;break-inside:avoid}
.tinfo td.tin{font-weight:700;color:var(--text)}
.tinfo-h{font-family:'Google Sans',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:12px;page-break-after:avoid;break-after:avoid-page}
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
  {id:'str',   tr:'Kuvvet',            en:'Strength'},
  {id:'end',   tr:'Dayanıklılık',      en:'Endurance'},
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
  {id:'hirR', g:'mob',tr:'Kalça IR Sağ',en:'Hip IR R',u:'°',dir:'hi',st:'IR R',se:'IR R',get:t=>hipRotCalc(t).irR},
  {id:'hirL', g:'mob',tr:'Kalça IR Sol',en:'Hip IR L',u:'°',dir:'hi',st:'IR L',se:'IR L',get:t=>hipRotCalc(t).irL},
  {id:'herR', g:'mob',tr:'Kalça ER Sağ',en:'Hip ER R',u:'°',dir:'hi',st:'ER R',se:'ER R',get:t=>hipRotCalc(t).erR},
  {id:'herL', g:'mob',tr:'Kalça ER Sol',en:'Hip ER L',u:'°',dir:'hi',st:'ER L',se:'ER L',get:t=>hipRotCalc(t).erL},
  {id:'htD',  g:'mob',tr:'Kalça Toplam Rot. Fark',en:'Hip Total Rot. Gap',u:'°',dir:'lo',st:'Kalça Δ',se:'Hip Δ',get:t=>hipRotCalc(t).dTot},
  {id:'tspR', g:'mob',tr:'T-Spine Rot. Sağ',en:'T-Spine Rot. R',u:'°',dir:'hi',st:'TSR R',se:'TSR R',get:t=>tSpineCalc(t).r},
  {id:'tspL', g:'mob',tr:'T-Spine Rot. Sol',en:'T-Spine Rot. L',u:'°',dir:'hi',st:'TSR L',se:'TSR L',get:t=>tSpineCalc(t).l},
  {id:'tspD', g:'mob',tr:'T-Spine Rot. Fark',en:'T-Spine Rot. Gap',u:'°',dir:'lo',st:'TSR Δ',se:'TSR Δ',get:t=>tSpineCalc(t).diff},
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
  {id:'acc5', g:'spd',tr:'5m İvmelenme',en:'5m Acceleration',u:'s',dir:'lo',st:'5m',se:'5m',get:t=>accelCalc(t).t5},
  {id:'acc10',g:'spd',tr:'10m İvmelenme',en:'10m Acceleration',u:'s',dir:'lo',st:'10m',se:'10m',get:t=>accelCalc(t).t10},
  {id:'f505', g:'spd',tr:'505 COD',   en:'505 COD',   u:'s',dir:'lo',st:'505',se:'505',get:t=>cod505Calc(t).best},
  {id:'f505R',g:'spd',tr:'505 Sağ',   en:'505 R',     u:'s',dir:'lo',st:'505 R',se:'505 R',get:t=>cod505Calc(t).r},
  {id:'f505L',g:'spd',tr:'505 Sol',   en:'505 L',     u:'s',dir:'lo',st:'505 L',se:'505 L',get:t=>cod505Calc(t).l},
  {id:'f505D',g:'spd',tr:'505 Asimetri',en:'505 Asymmetry',u:'%',dir:'lo',st:'505 Δ',se:'505 Δ',get:t=>cod505Calc(t).pct},
  {id:'bp',   g:'str',tr:'Bench Press e1RM',en:'Bench Press e1RM',u:'kg',dir:'hi',st:'BP',se:'BP',get:t=>strCalc(t,'benchPress').e1},
  {id:'tbdl', g:'str',tr:'Trap Bar DL e1RM',en:'Trap Bar DL e1RM',u:'kg',dir:'hi',st:'TBDL',se:'TBDL',get:t=>strCalc(t,'trapBarDL').e1},
  {id:'sq',   g:'str',tr:'Squat e1RM',en:'Squat e1RM',u:'kg',dir:'hi',st:'Squat',se:'Squat',get:t=>strCalc(t,'backSquat').e1},
  {id:'pu',   g:'str',tr:'Pull-Up',en:'Pull-Up',u:'tk',dir:'hi',st:'Pull-Up',se:'Pull-Up',get:t=>cmpN(t.pullUp&&t.pullUp.reps)},
  {id:'cphR', g:'str',tr:'Copenhagen Sağ',en:'Copenhagen R',u:'s',dir:'hi',st:'CPH R',se:'CPH R',get:t=>holdCalc(t,'copenhagen').r},
  {id:'cphL', g:'str',tr:'Copenhagen Sol',en:'Copenhagen L',u:'s',dir:'hi',st:'CPH L',se:'CPH L',get:t=>holdCalc(t,'copenhagen').l},
  {id:'cphD', g:'str',tr:'Copenhagen Asimetri',en:'Copenhagen Asymmetry',u:'%',dir:'lo',st:'CPH Δ',se:'CPH Δ',get:t=>holdCalc(t,'copenhagen').pct},
  {id:'spkR', g:'str',tr:'Side Plank Sağ',en:'Side Plank R',u:'s',dir:'hi',st:'SPK R',se:'SPK R',get:t=>holdCalc(t,'sidePlank').r},
  {id:'spkL', g:'str',tr:'Side Plank Sol',en:'Side Plank L',u:'s',dir:'hi',st:'SPK L',se:'SPK L',get:t=>holdCalc(t,'sidePlank').l},
  {id:'spkD', g:'str',tr:'Side Plank Asimetri',en:'Side Plank Asymmetry',u:'%',dir:'lo',st:'SPK Δ',se:'SPK Δ',get:t=>holdCalc(t,'sidePlank').pct},
  {id:'vift', g:'end',tr:'30-15 IFT (VIFT)',en:'30-15 IFT (VIFT)',u:'km/h',dir:'hi',st:'VIFT',se:'VIFT',get:t=>cmpN(t.ift3015&&t.ift3015.vift)},
  {id:'shut', g:'end',tr:'Shuttle Run',en:'Shuttle Run',u:'s',dir:'lo',st:'Shuttle',se:'Shuttle',get:t=>cmpN(t.shuttleRun)},
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

