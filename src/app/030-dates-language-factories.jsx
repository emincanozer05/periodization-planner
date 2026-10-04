/* =========================================================
   DATE HELPERS
   Storage: YYYY-MM-DD (ISO). Display: DD/MM/YYYY (fd()).
   ========================================================= */
const pad=n=>String(n).padStart(2,'0');
const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fd=s=>{if(!s)return'';const[y,m,d]=s.split('-');return`${d}/${m}/${y}`;};
/* fd() in reverse: DD/MM/YYYY typed by a coach → the ISO string we store.
   Returns '' for anything that isn't a real calendar date, so a half-typed value
   never overwrites a good one. */
const pdmy=t=>{const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((t||'').trim());if(!m)return'';
  const d=+m[1],mo=+m[2],y=+m[3];if(mo<1||mo>12||d<1||d>31)return'';
  const dt=new Date(y,mo-1,d);
  return(dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d)?fmt(dt):'';};
const fdLong=s=>{if(!s)return'';const d=parseD(s);return`${DN[(d.getDay()+6)%7]}, ${d.getDate()} ${MN[d.getMonth()]} ${d.getFullYear()}`;};
const parseD=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const diffD=(a,b)=>Math.round((parseD(b)-parseD(a))/86400000);
const sow=d=>{const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x};
const wk=d=>fmt(sow(d));
const today=new Date();
/* `today` was fixed when the page loaded, so a tab or installed app left open past
   midnight kept working on the day before: a sheet opened on Friday read Saturday as
   Friday — the day after Thursday's game, MD+1, when it was already MD+2. The object is
   kept (the whole app holds a reference to it) and moved forward in place once the
   calendar day has changed. */
function rollToday(){const n=new Date();if(fmt(n)===fmt(today))return false;today.setTime(n.getTime());return true;}
/* A date picker that opened on today keeps following today: when the day turns over
   while the page is open (or the tab comes back the next morning), a picker still
   sitting on the old day moves with it. A day the coach picked by hand is left alone. */
function useFollowToday(setDate){
  const seen=useRef(fmt(today));
  useEffect(()=>{
    const tick=()=>{rollToday();const now=fmt(today),prev=seen.current;if(now===prev)return;
      seen.current=now;setDate(d=>d===prev?now:d);};
    const onVis=()=>{if(document.visibilityState==='visible')tick();};
    const id=setInterval(tick,60000);
    document.addEventListener('visibilitychange',onVis);window.addEventListener('focus',tick);
    return()=>{clearInterval(id);document.removeEventListener('visibilitychange',onVis);window.removeEventListener('focus',tick);};
  },[]);
}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ===== App language (global TR/EN switch — drives the whole UI and every print
   output). Persisted to localStorage and reactive: any component that calls
   useAppLang() re-renders the instant it changes, so switching language updates
   the page immediately with no reload. ===== */
const LANG_KEY='coachos_lang';
/* Kayıtlı bir tercih yoksa tarayıcının dili: Türkçe bir tarayıcıda giriş sayfası Türkçe açılır.
   Kayıtlı tercihi olan herkes için hiçbir şey değişmez. */
let REPORT_LANG=(()=>{try{const s=localStorage.getItem(LANG_KEY);if(s==='tr'||s==='en')return s;}catch(e){}
  try{if(/^tr\b/i.test(navigator.language||''))return'tr';}catch(e){}return'en';})();
const _langSubs=new Set();
/* Keep <html lang> on the active language: CSS text-transform:uppercase is
   locale-aware, and without this every uppercased Turkish label loses its dotted
   capital — "işaretli" comes back as "ISARETLI" instead of "İŞARETLİ". */
function _syncDocLang(){try{document.documentElement.lang=REPORT_LANG;}catch(e){}}
_syncDocLang();
function setReportLang(l){
  if(l!=='tr'&&l!=='en')return;
  if(l===REPORT_LANG)return;
  REPORT_LANG=l;
  try{localStorage.setItem(LANG_KEY,l);}catch(e){}
  _syncDocLang();
  _langSubs.forEach(fn=>{try{fn();}catch(e){}});
}
// Subscribe a component to language changes so the whole tree re-renders live.
/* Tema: koyu varsayılan, açık tema Ayarlar → Görünüm'den. Tercih bu cihazda saklanıyor ve
   <head>'deki küçük betik onu ilk çizimden önce uyguluyor (00-head.html). */
const THEME_KEY='coachos_theme';
function getTheme(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';}
function setTheme(t){
  const light=t==='light';
  if(light)document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');
  try{localStorage.setItem(THEME_KEY,light?'light':'dark');}catch(e){}
  try{document.querySelector('meta[name="theme-color"]').setAttribute('content',light?'#f4f6f9':'#0a0b0d');}catch(e){}
  try{window.dispatchEvent(new Event('coachos-theme'));}catch(e){}
}
function useAppTheme(){
  const[t,setT]=useState(getTheme);
  useEffect(()=>{const f=()=>setT(getTheme());window.addEventListener('coachos-theme',f);return()=>window.removeEventListener('coachos-theme',f);},[]);
  return t;
}
function useAppLang(){
  const[,force]=useState(0);
  useEffect(()=>{const fn=()=>force(x=>x+1);_langSubs.add(fn);return()=>_langSubs.delete(fn);},[]);
  return REPORT_LANG;
}
const MN_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MN_TR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DN_EN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DN_TR=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
// Long date in the active report language: "7 June 2026" / "7 Haziran 2026"
function fdL(ds){if(!ds)return'';const d=parseD(ds);const M=REPORT_LANG==='tr'?MN_TR:MN_EN;return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;}
function dnL(i){return (REPORT_LANG==='tr'?DN_TR:DN_EN)[i];}
// Pick a value by language: tr(...) helper returns the right string of a {tr,en} pair
function L(tr,en){return REPORT_LANG==='tr'?tr:en;}
/* Runs fn with every L() reading English, whatever the page is showing — for output
   that is always English (the individualization JSON handed to an outside model).
   Synchronous only: the language is restored before anything else can run. */
function diInEnglish(fn){
  const prev=REPORT_LANG;REPORT_LANG='en';
  try{return fn();}finally{REPORT_LANG=prev;}
}

/* =========================================================
   FACTORIES
   ========================================================= */
const EX=()=>({name:'',sets:'',reps:'',duration:'',tempo:'',rpe:'',load:'',rest:'',description:'',notes:'',superset:'',phase:'',pattern:'',plane:'',image:'',link:''});
/* Only http(s) links are ever stored/rendered — keeps `javascript:` and friends out of the
   printed document's href, and quotes out of the attribute. Returns '' for anything else. */
const safeURL=u=>{const s=String(u==null?'':u).trim();
  return/^https?:\/\//i.test(s)?s.replace(/"/g,'%22').replace(/'/g,'%27').replace(/</g,'%3C').replace(/>/g,'%3E'):'';};
// "https://www.youtube.com/watch?v=x" → "youtube.com", for a compact link label on the sheet.
const linkLabel=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(_){return'link';}};
/* Library auto-add bridge — the App registers a setter so the program editor can push a
   newly-typed exercise name into the shared library (data.exercises) without prop-threading. */
let _libAdd=null;
function registerLibAdd(fn){_libAdd=fn;}
function addExerciseToLibrary(name){const nm=(name||'').trim();if(nm&&_libAdd)_libAdd(nm);}
/* CoachOS wordmark, inlined as a data URI. Every printout and PDF is written into a fresh
   about:blank window: a relative "logo.png" has no base URL to resolve against there, and a
   network fetch would race window.print(). A quantized 520px PNG (~5 KB) keeps it cheap. */
const COACHOS_LOGO='data:image/png;base64,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';
/* Active team's logo (data URL, uploaded in the Teams tab), mirrored here so the print and
   PDF builders can brand their header. Same reason as the bridge above: a printout is fired
   from several places (day view, session editor, templates) and none of them should have to
   carry the team down as a prop. Empty string when the team has no logo — the header then
   renders exactly as before. */
let _teamLogo='';
let _clubName='';
function registerTeamLogo(src){_teamLogo=typeof src==='string'?src:'';}
function teamLogo(){return _teamLogo;}
/* The club the crest belongs to, so a printed or shared sheet can sign itself the way
   the sidebar does rather than with a picture and no name. */
function registerClubName(n){_clubName=typeof n==='string'?n.trim():'';}
function clubNameNow(){return _clubName;}
/* Shared library entries (name + type + movement pattern + cover image + video link),
   mirrored here so the deeply-nested exercise editor can drive its picker without
   prop-threading: the left pane lists exercises, the right pane the categories they belong
   to, and picking a row copies the library's cover/link onto the program's exercise. */
let _libItems=[];
function setLibItems(a){_libItems=Array.isArray(a)?a:[];}
function getLibItems(){return _libItems;}
/* Replace a previously auto-added exercise name with the box's latest value, so
   editing/clearing a field doesn't leave the old (or partial) name in the library. */
let _libReplace=null;
function registerLibReplace(fn){_libReplace=fn;}
function replaceExerciseInLibrary(oldName,newName){if(_libReplace)_libReplace(oldName,newName);}
/* Movement pattern + execution, remembered against the exercise ITSELF rather than
   against the row it was typed on. The pair is tagged once on any program — the
   calendar's session editor or an athlete's individualization sheet — stored on the
   library entry, and handed back the next time that exercise is written anywhere, so
   the same exercise is never re-tagged sheet after sheet.

   Only a real pattern is written back: clearing the pair on one program leaves the
   library alone, because a row emptied on one sheet is not a statement about the
   exercise everywhere else. The library card is where the pair is cleared for good. */
let _libTags=null;
function registerLibTags(fn){_libTags=fn;}
function rememberExerciseTags(name,pattern,plane){
  const nm=(name||'').trim();
  if(nm&&String(pattern||'').trim()&&_libTags)_libTags(nm,pattern,plane||'');
}
/* The picture the coach puts on a program row, remembered against the exercise ITSELF
   the same way its pattern / execution are — write the exercise into the next program
   and the picture comes back, instead of being pasted again sheet after sheet.

   It rides along as `planImage`, beside the `thumb` the library page sets from its own
   Program Image control: both are this same picture, `planImage` is the one a program row
   wrote, and the picker reads it first. Neither is a cover — the library card is left to
   the exercise's video.

   Clearing the picture on a row clears the remembered one too — unlike a cleared tag,
   removing a picture is a statement about the picture, not about one sheet's copy. */
let _libImage=null;
function registerLibImage(fn){_libImage=fn;}
function rememberExerciseImage(name,url){
  const nm=(name||'').trim();
  if(nm&&_libImage)_libImage(nm,typeof url==='string'?url:'');
}
/* A block is either strength & conditioning work (`kind:'sc'` — the exercise grid this app
   has always had) or ball practice (`kind:'ball'` — the same grid, but each row is a court
   drill carrying a diagram and a clip instead of a barbell prescription). Both keep their
   rows in `exercises`, so everything that already walks a session — the printout, the day
   drawer, the volume stats, the library's usage counts, the template saver — reads a ball
   block without knowing it is one. A block saved before ball practice existed has no
   `kind` at all and is S&C, which is what it was. */
const BLK=(n,kind)=>({id:uid(),name:n,kind:kind==='ball'?'ball':'sc',exercises:[kind==='ball'?BALL_EX():EX()]});
const blkKind=b=>(b&&b.kind==='ball')?'ball':'sc';
/* ---- The phases of a session, inside one block ----------------------------
   A practice is written in phases — the warm-up that prepares it, the work it exists
   for, and the cool-down that closes it. Saying so used to cost three separate blocks,
   each repeating the whole session's details and each assigned on its own. A block
   carries the phases itself now: `block.phases` lists the sections open on it, and
   every exercise says which one it belongs to (`ex.phase`).

   A block with no section open is the flat list it has always been, so every session
   written before this reads and prints exactly as it did. Closing a section never
   deletes work either: its exercises stay in the block and go back to being unplaced. */
/* The three sections older sessions were written in. They are still read — a block
   that carries them keeps its names — but a new phase is the coach's own: "+ Faz Ekle"
   opens a section with a name of the coach's choosing, and a programme loaded from JSON
   opens one per block it brings. */
const BLK_PHASES=['hazirlik','ana','soguma'];
const BLK_PHASE_LBL={hazirlik:['Hazırlık','Preparation'],ana:['Ana Faz','Main Phase'],soguma:['Soğuma','Cool Down']};
const BLK_PHASE_NOTE={hazirlik:['ısınma · aktivasyon · hareketlilik','warm-up · activation · mobility'],
  ana:['seansın asıl işi','the work the session exists for'],
  soguma:['toparlanma · esneme · nefes','recovery · stretching · breathing']};
/* A phase id as stored: the three legacy keys in their canonical spelling, anything
   else (a phase the coach opened) as written. */
const phKey=v=>{const t=String(v==null?'':v).trim();if(!t)return'';const lo=t.toLowerCase();return BLK_PHASES.includes(lo)?lo:t;};
/* A phase's name: the one the coach gave it on this block, else the legacy section's. */
const blkPhaseLbl=(p,b)=>{const n=b&&b.phaseNames&&b.phaseNames[p];
  if(n&&String(n).trim())return String(n).trim();
  return BLK_PHASE_LBL[p]?L(BLK_PHASE_LBL[p][0],BLK_PHASE_LBL[p][1]):'';};
const blkPhaseNote=(p,b)=>{if(b&&b.phaseNames&&String(b.phaseNames[p]||'').trim())return'';
  return BLK_PHASE_NOTE[p]?L(BLK_PHASE_NOTE[p][0],BLK_PHASE_NOTE[p][1]):'';};
/* The sections open on a block, in the order the coach opened them (the running order). */
const blkPhases=b=>{const a=Array.isArray(b&&b.phases)?b.phases:[];const out=[];
  a.forEach(p=>{const k=phKey(p);if(k&&!out.includes(k))out.push(k);});return out;};
/* The section an exercise sits in; '' for one that has not been placed in any. */
const exPhase=e=>phKey(e&&e.phase);
/* A section's colour follows its place in the block — first, second, third… — so any
   number of named phases each read apart from their neighbours. */
const PH_COLORS=6;
const phCls=(p,list)=>{const i=(list||[]).indexOf(p);return i<0?'p-loose':'pc'+(i%PH_COLORS);};
const newPhaseId=()=>'ph_'+Math.random().toString(36).slice(2,9);
/* The rows of a block, ordered by the section they belong to. Stable — two rows of the
   same section keep the order the coach put them in, so typing never moves a row — and
   anything unplaced collects at the end, where it reads as work still to be placed.
   The ARRAY is kept in this order rather than only the screen: the printed sheet, the
   athlete's copy, the volume figures and everything else read a block as it comes, so
   the running order has to live in the data and not in the editor. */
function sortExsByPhase(exs,phases){
  const rank=p=>{const i=phases.indexOf(p);return i<0?phases.length:i;};
  return exs.map((e,i)=>({e,i}))
    .sort((a,b)=>(rank(exPhase(a.e))-rank(exPhase(b.e)))||(a.i-b.i))
    .map(x=>x.e);
}
/* A ball-practice row. It is an exercise — same name / sets / reps / duration / rpe /
   rest / description fields, so the sheet and the drawer print it unchanged — plus the
   three things a court drill needs and a lift does not: the diagram the coach draws
   (`court`, a scene object — see the court editor below), the clip that shows it
   (`videoUrl` / `videoData`, the same pair the exercise library stores), and how many
   players it is run with. */
const BALL_EX=()=>({...EX(),ball:true,court:null,videoUrl:'',videoData:'',players:'',intensity:''});
const isBallEx=e=>!!(e&&(e.ball||e.court));
const SESS=(p={})=>{const bl=(p.bl||[]).map(n=>BLK(n));
  return{id:uid(),name:p.name||'New Workout',time:p.time||'17:00',loadType:p.loadType||'Mechanical load',
    purpose:p.purpose||'',focus:Array.isArray(p.focus)?p.focus:(p.purpose?sesFocus({purpose:p.purpose}):[]),
    sub:Array.isArray(p.sub)?p.sub:[],
    methods:Array.isArray(p.methods)?p.methods:[],region:p.region||'',duration:p.duration||60,sRPE:'',au:'',color:'',blocks:bl,notes:'',planNote:'',athletes:[],sourceId:null,
    ...(p.kind?{kind:p.kind}:{}),...(p.rpeCat?{rpeCat:p.rpeCat}:{})};};
const EDAY=date=>({date,sessions:[],dailyNotes:''});
const makeTest=(period='pre')=>({
  id:uid(),date:fmt(today),period,year:today.getFullYear(),
  // Anthropometrics — legLength = ASIS → medial malleolus (cm), sittingHeight = seated stature (cm)
  height:'',weight:'',wingspan:'',bodyFat:'',legLength:'',sittingHeight:'',
  // Circumferences (cm) — bilateral for thigh & calf
  circ:{shoulder:'',waist:'',hip:'',thighRight:'',thighLeft:'',calfRight:'',calfLeft:''},
  // Static posture
  posture:{frontPhoto:null,sidePhoto:null,backPhoto:null,observations:''},
  // Mobility & Movement
  aslr:{right:'',left:''},        // FMS 0-3
  ankleDF:{right:'',left:''},     // degrees
  ohs:{score:'',frontPhoto:null,sidePhoto:null,backPhoto:null,observations:'',problems:['','','','','']},
  /* FMS — Functional Movement Screen. Seven movements, each scored 0-3; the
     bilateral ones are scored per side and the lower side is the one that
     counts. Three of them carry a clearing test: a positive (painful) clearing
     drops that movement to 0. Total is out of 21. */
  fms:{deepSquat:'',
    hurdleStep:{right:'',left:''},
    inlineLunge:{right:'',left:''},
    shoulderMobility:{right:'',left:''},shoulderClear:'',
    aslr:{right:'',left:''},
    trunkPushup:'',pushupClear:'',
    rotary:{right:'',left:''},rotaryClear:'',
    /* The screen is often run on the official FMS sheet and comes back as a PDF.
       That PDF is attached here: {name,size,at,pages:[dataURL],data} — `pages`
       are the rasterised pages the report prints, `data` the original file. */
    pdf:null,
    observations:''},
  // Y Balance Test — leg length (ASIS–medial malleolus, cm) + 3 reach directions per foot (cm)
  yBalance:{limbLength:'',right:{ant:'',pm:'',pl:''},left:{ant:'',pm:'',pl:''}},
  // Sprint — side-view of 3 first steps + front-view of right/left foot
  sprint20m:{time:'',
    sideStep1:null,sideStep2:null,sideStep3:null,
    frontRightFoot:null,frontLeftFoot:null},
  // Power
  verticalJump:'',cmj:'',squatJump:'',dropJump:'',horizontalJump:'',
  // Lateral CMJ — sideways counter-movement jump distance per side (cm)
  lateralCmj:{right:'',left:''},
  // Agility / Conditioning
  tTest:'',fiveZeroFive:'',shuttleRun:'',
  // Coach-defined custom tests: { [customTestId]: value }
  custom:{},
  notes:'',
});

/* Test battery catalog — individual tests the coach can pick & choose freely
   for ANY athlete (no age gating). Each id maps to a field/section the
   TestEditor renders; `battery` on a test record holds the selected ids. */
const TEST_CATALOG=[
  {id:'anthro',        name:'Anthropometric Measurement', short:'Anthro'},
  {id:'circ',          name:'Body Circumference',         short:'Circumf.'},
  {id:'posture',       name:'Static Posture',             short:'Posture'},
  {id:'ankleDF',       name:'Ankle Dorsiflexion Degree',  short:'Ankle DF'},
  {id:'aslr',          name:'Active Straight Leg Raise',  short:'ASLR'},
  {id:'ohs',           name:'Overhead Squat Test',        short:'OHS'},
  /* Retired from the picker: no new battery offers it. Kept here so a record that was
     screened with it still reads, prints and charts as before. */
  {id:'fms',           name:'FMS',                        short:'FMS',retired:true},
  {id:'yBalance',      name:'Y Balance Test',             short:'YBT'},
  {id:'verticalJump',  name:'Vertical Jump',              short:'VJ'},
  {id:'cmj',           name:'Counter-Movement Jump',      short:'CMJ'},
  {id:'lateralCmj',    name:'Lateral CMJ',                short:'Lat. CMJ'},
  {id:'squatJump',     name:'Squat Jump',                 short:'SJ'},
  {id:'horizontalJump',name:'Horizontal Jump',            short:'HJ'},
  {id:'dropJump',      name:'Drop Jump (RSI)',            short:'DJ'},
  {id:'sprint',        name:'20m Sprint',                 short:'20m'},
  {id:'tTest',         name:'T-Agility',                  short:'T-Test'},
  {id:'fiveZeroFive',  name:'5-0-5',                      short:'5-0-5'},
  {id:'shuttleRun',    name:'Shuttle Run',                short:'Shuttle'},
];
const TEST_CAT_LABEL=id=>{const c=TEST_CATALOG.find(x=>x.id===id);return c?c.name:id;};

