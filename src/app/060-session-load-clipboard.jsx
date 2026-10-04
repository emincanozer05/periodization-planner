/* =========================================================
   LOAD CALC — AU is the source of truth
   ========================================================= */
const sLoad=s=>Number(s?.au)||0;
const dLoad=d=>(d?.sessions||[]).reduce((a,s)=>a+sLoad(s),0);
const dSRPEMax=d=>Math.max(0,...(d?.sessions||[]).map(s=>Number(s.sRPE)||0));
const dSRPEAvg=d=>{const v=(d?.sessions||[]).map(s=>Number(s.sRPE)||0).filter(x=>x>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};

/* Session colour map — fluorescent / neon palette used in the week-view cards.
   Each session is classified into one of six categories based on its purpose,
   name (Turkish or English keywords), and loadType. */
const SESSION_COLORS={
  strength:{c:'#00ff7f',t:'rgba(0,255,127,0.10)',g:'rgba(0,255,127,0.45)'},  // fosfor yeşil
  practice:{c:'#ff7c00',t:'rgba(255,124,0,0.10)',g:'rgba(255,124,0,0.45)'},  // fosfor turuncu
  speed:   {c:'#c000ff',t:'rgba(192,0,255,0.10)',g:'rgba(192,0,255,0.45)'},  // fosfor mor
  recovery:{c:'#00bfff',t:'rgba(0,191,255,0.10)',g:'rgba(0,191,255,0.45)'},  // fosfor mavi
  match:   {c:'#ff0040',t:'rgba(255,0,64,0.12)',g:'rgba(255,0,64,0.45)'},    // fosfor kırmızı
  endurance:{c:'#00ffd5',t:'rgba(0,255,213,0.10)',g:'rgba(0,255,213,0.40)'},  // fosfor turkuaz
};
function sessionType(s){
  const n=(s?.name||'').toLowerCase(),lt=(s?.loadType||'').toLowerCase(),
    p=(((Array.isArray(s?.focus)?s.focus.join(' '):'')+' '+(s?.purpose||'')).trim()).toLowerCase();
  if(p.includes('recovery')||n.includes('recovery')||n.includes('toparlan')||n.includes('regener'))return'recovery';
  if(p.includes('competition')||n.includes('match')||n.includes('maç')||n.includes('match day'))return'match';
  if(p.includes('strength')||p.includes('hypertrophy')||p.includes('power')||p.includes('plyometric')||
     n.includes('kuvvet')||n.includes('strength')||n.includes('power')||lt.includes('mechanical'))return'strength';
  if(p.includes('speed')||p.includes('agility')||p.includes('celeration')||p.includes('change of direction')||lt.includes('neuromuscular')||
     n.includes('speed')||n.includes('agility')||n.includes('sürat')||n.includes('çeviklik')||n.includes('çabukluk'))return'speed';
  if(p.includes('aerobic')||p.includes('anaerobic')||p.includes('endurance')||p.includes('conditioning')||
     n.includes('endurance')||n.includes('conditioning')||n.includes('dayanıklılık'))return'endurance';
  return'practice'; // Ball Practice / Technical default
}
const sessionColor=s=>SESSION_COLORS[sessionType(s)];

/* Template clipboard — module-level bridge (same approach as _libAdd/_libItems above) so the
   Templates tab can copy and any Quick Add bar (calendar drawer / Planner) can paste without
   prop-threading. Stores a deep copy, so deleting the template later can't break a paste. */
let _templateClipboard=null;
function copyTemplateToClipboard(t){_templateClipboard=t?JSON.parse(JSON.stringify(t)):null;}
function getTemplateClipboard(){return _templateClipboard;}
/* Training clipboard — one whole session, copied from wherever it is being read (an athlete's
   own calendar, the team plan) and pasted onto any other day or any other athlete. Stored as a
   deep copy, so editing or deleting the original afterwards cannot reach into what was copied.
   Unlike the template clipboard this one is subscribed to: the paste buttons sit in a DIFFERENT
   athlete's card from the copy button, and they have to appear the moment something is copied. */
let _sessionClipboard=null;
const _sesClipSubs=new Set();
function copySessionToClipboard(s){
  _sessionClipboard=s?JSON.parse(JSON.stringify(s)):null;
  _sesClipSubs.forEach(f=>{try{f(_sessionClipboard);}catch{}});
}
function getSessionClipboard(){return _sessionClipboard;}
function useSessionClipboard(){
  const[v,setV]=useState(_sessionClipboard);
  useEffect(()=>{const f=x=>setV(x);_sesClipSubs.add(f);setV(_sessionClipboard);return()=>{_sesClipSubs.delete(f);};},[]);
  return v;
}
/* A fresh copy of the clipboard's training for a day. Everything that belonged to where it came
   from is left behind: new ids throughout, no participants, no link to a team session or to an
   individualization sheet, and none of the load feedback recorded against the original — what
   is pasted is the program, not somebody's record of doing it. */
function sessionFromClipboard(src){
  const s=JSON.parse(JSON.stringify(src||{}));
  delete s.indiv;
  return{...s,id:uid(),sRPE:'',au:'',auManual:false,srpeFromManual:false,notes:'',athletes:[],sourceId:null,
    blocks:(s.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))};
}
/* Exercise clipboard — one prescribed row (name, pattern/execution and the numbers),
   copied off the assistant coach's suggestion and pasted into a slot. Subscribed like the
   session clipboard: the ✕/paste button lives in a different component from the copy
   button, and it has to light up the moment something is copied. */
let _exClipboard=null;
const _exClipSubs=new Set();
function copyExerciseToClipboard(e){
  _exClipboard=e?JSON.parse(JSON.stringify(e)):null;
  _exClipSubs.forEach(f=>{try{f(_exClipboard);}catch{}});
}
function useExerciseClipboard(){
  const[v,setV]=useState(_exClipboard);
  useEffect(()=>{const f=x=>setV(x);_exClipSubs.add(f);setV(_exClipboard);return()=>{_exClipSubs.delete(f);};},[]);
  return v;
}
/* What a paste writes onto a slot: the prescription and nothing else. The row's image,
   reference link and the coach's own description stay as they are — the suggestion is an
   exercise with a dose, not a whole row. Empty fields are written too, so pasting over a
   filled slot leaves no number behind from the exercise that used to be there. */
function slotFromExClipboard(ex,c){
  return{...ex,name:c.name||'',pattern:c.pattern||'',plane:c.plane||'',
    sets:c.sets||'',reps:c.reps||'',duration:c.duration||'',tempo:c.tempo||'',
    rpe:c.rpe||'',load:c.load||'',rest:c.rest||''};
}
/* Set by <App/> so any session editor can save its session to Templates without
   prop-threading (mirrors the clipboard pattern above). Returns true on success. */
/* Fresh SESS clone of a template's stored session (same cloning pattern as dupS/edDup):
   new session/block ids, sRPE/au/athletes/sourceId reset. */
function sessionFromTemplate(t){const s=(t&&t.session)||{};
  return{id:uid(),name:t.name||'Workout',time:s.time||'17:00',loadType:s.loadType||'Mechanical load',
    purpose:s.purpose||'',focus:sesFocus(s),sub:sesSubFocus(s),
    methods:sesMethods(s),region:sesRegion(s),duration:s.duration||60,sRPE:'',au:'',color:s.color||'',
    /* `kind` rides along with the block, so a ball-practice block saved as a template
       comes back as one instead of turning into an S&C grid on the way out. */
    blocks:(s.blocks||[]).map(b=>({...b,id:uid(),athletes:[],kind:blkKind(b),exercises:(b.exercises||[]).map(e=>({...e}))})),
    notes:s.notes||'',planNote:s.planNote||'',athletes:[],sourceId:null};}

