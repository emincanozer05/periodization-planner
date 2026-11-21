/* =========================================================
   TESTING & ASSESSMENT — dedicated section
   Player grid → pick which tests to administer (any test, any age) →
   "Take Test" creates a battery-scoped record → designed session view.
   ========================================================= */
/* =========================================================
   TRYOUTS (Seçmeler) — the pool of players who are not on the
   roster yet. A club that runs open tryouts collects the same
   sheet on every candidate — who they are, how to reach their
   family, what they measured, what the coach thought — and
   loses it in a notebook the week after. It lives here instead.
   The pool belongs to the workspace, not to any one squad: an
   11-year-old and an 18-year-old who turn up to different
   sessions are on the same screen, and the age filter is what
   cuts it down rather than a team boundary. The only way out
   is "Kadroya Aktar": the candidate becomes a real athlete on
   whichever team the coach picks there, carrying their details
   across, and nothing in that squad's own data is touched
   until someone presses it.
   ========================================================= */
const TRYOUT_STATUS=[
  {id:'new',  tr:'Aday',      en:'Candidate'},
  {id:'watch',tr:'İzleniyor', en:'Watching'},
  {id:'in',   tr:'Kabul',     en:'Accepted'},
  {id:'out',  tr:'Elendi',    en:'Declined'},
];
const tryoutStatus=id=>TRYOUT_STATUS.find(s=>s.id===id)||TRYOUT_STATUS[0];
/* Physical + performance boxes on the sheet. `u` is the unit printed inside the
   field; `st` marks the ones that are summarised at the top of the record. */
const TRYOUT_BODY=[
  {k:'height',    u:'cm', tr:'Boy',            en:'Height'},
  {k:'weight',    u:'kg', tr:'Kilo',           en:'Weight'},
  {k:'wingspan',  u:'cm', tr:'Kulaç',          en:'Wingspan'},
  /* Shoe size rather than standing reach: at a trial nobody is carrying a Vertec, but
     every candidate is wearing shoes — and in a youth squad the foot is the growth
     signal a coach can actually read on the day. */
  {k:'shoeSize',  u:'',   tr:'Ayakkabı No',    en:'Shoe Size'},
  {k:'bodyFat',   u:'%',  tr:'Vücut Yağı',     en:'Body Fat'},
];
/* The parents' own heights: the cheapest predictor of how tall a 12-year-old ends up,
   and the question a scout asks at every trial anyway. */
const TRYOUT_FAMILY=[
  {kName:'motherName',kH:'motherHeight',tr:'Anne',en:'Mother'},
  {kName:'fatherName',kH:'fatherHeight',tr:'Baba',en:'Father'},
];
/* THE TRYOUT SHEET DRAWS FROM THE CLUB'S OWN TEST CATALOG — the very list Testing &
   Assessment runs its batteries from, `TEST_CATALOG` plus the coach's own tests on
   `data.customTests`. It used to keep a second list of its own, so a test the club added
   for its squad simply did not exist on the trial sheet, and a test added on the trial
   sheet did not exist for the squad. One catalog means adding a test anywhere adds it
   everywhere, and a candidate who is promoted was measured on the same tests as the
   players they join.
   A trial sheet takes ONE number per test, so each entry carries the unit that number is
   written in; a test with nothing to write a unit for (a screen, a posture) takes a bare
   score. */
const TRYOUT_UNITS={anthro:'cm',circ:'cm',ankleDF:'°',aslr:'/3',ohs:'/3',fms:'/21',yBalance:'%',
  verticalJump:'cm',cmj:'cm',lateralCmj:'cm',squatJump:'cm',horizontalJump:'cm',dropJump:'',
  sprint:'sec',tTest:'sec',fiveZeroFive:'sec',laneAgility:'sec',shuttleRun:'sec',curvedRun:'sec',
  fms_deepSquat:'/3',fms_hurdleStep:'/3',fms_inlineLunge:'/3',fms_shoulderMobility:'/3',fms_aslr:'/3',fms_trunkPushup:'/3',fms_rotary:'/3',
  hipRot:'°',tSpine:'°',accel:'sec',benchPress:'kg',trapBarDL:'kg',backSquat:'kg',pullUp:'rep',copenhagen:'sec',sidePlank:'sec',ift3015:'km/h'};
/* Turkish names for the built-in battery. The catalog itself is written in English (it is
   read by the reports too), and a trial sheet is filled in on the court in Turkish. */
const TRYOUT_TR={anthro:'Antropometri',circ:'Çevre Ölçümü',posture:'Statik Postür',
  ankleDF:'Ayak Bileği DF',aslr:'ASLR',ohs:'Overhead Squat',fms:'FMS',yBalance:'Y Balance (kompozit)',
  verticalJump:'Dikey Sıçrama',cmj:'CMJ',lateralCmj:'Lateral CMJ',squatJump:'Skuat Sıçrama',
  horizontalJump:'Yatay Sıçrama',dropJump:'Drop Jump (RSI)',sprint:'20m Sprint',tTest:'T-Test',
  fiveZeroFive:'505 COD',laneAgility:'Lane Agility',shuttleRun:'Shuttle Run',curvedRun:'Kavisli Koşu',
  hipRot:'Kalça IR/ER',thomas:'Modifiye Thomas Testi',tSpine:'T-Spine Rotasyon',accel:'5-10m İvmelenme',
  pullUp:'Barfiks (Pull-Up)',copenhagen:'Copenhagen Plank',sidePlank:'Yan Plank',backSquat:'Barbell Squat'};
/* Tests a trial sheet cannot hold. Anthropometry is the Body Measurements section already;
   circumferences, the posture photos and the Thomas test's three readings per side are not
   a number a scout writes on the court. They stay out of the picker — a sheet that already
   carries a value for one keeps it, labelled, so nothing typed is lost. */
const TRYOUT_SKIP=['anthro','circ','posture','thomas'];
/* Most of the battery is one number. The bilateral tests are two — a single "ankle DF 38°"
   box hid which ankle, and the asymmetry is the very thing a youth screen is read for — and a
   few take their own parts. Each part may carry its own unit; otherwise the test's. */
const TRYOUT_LR=[{s:'r',tr:'Sağ',en:'Right'},{s:'l',tr:'Sol',en:'Left'}];
const TRYOUT_STR=[{s:'load',tr:'Yük',en:'Load',u:'kg'},{s:'reps',tr:'Tekrar',en:'Reps',u:'rep'}];
const TRYOUT_PARTS={
  ankleDF:TRYOUT_LR,lateralCmj:TRYOUT_LR,tSpine:TRYOUT_LR,copenhagen:TRYOUT_LR,sidePlank:TRYOUT_LR,
  fiveZeroFive:TRYOUT_LR,curvedRun:TRYOUT_LR,
  fms_hurdleStep:TRYOUT_LR,fms_inlineLunge:TRYOUT_LR,fms_shoulderMobility:TRYOUT_LR,fms_aslr:TRYOUT_LR,fms_rotary:TRYOUT_LR,
  hipRot:[{s:'irR',tr:'IR Sağ',en:'IR Right'},{s:'irL',tr:'IR Sol',en:'IR Left'},
          {s:'erR',tr:'ER Sağ',en:'ER Right'},{s:'erL',tr:'ER Sol',en:'ER Left'}],
  accel:[{s:'t5',tr:'0–5 m',en:'0–5 m'},{s:'t10',tr:'0–10 m',en:'0–10 m'}],
  benchPress:TRYOUT_STR,trapBarDL:TRYOUT_STR,backSquat:TRYOUT_STR,
};
// Time tests: the quicker side is the better one when the asymmetry is worked out.
const TRYOUT_LO=['fiveZeroFive','curvedRun'];
/* A test result is a string, or — for a test with parts — an object of them. */
const tryoutHas=v=>v&&typeof v==='object'
  ?Object.values(v).some(x=>String(x==null?'':x).trim()!=='')
  :String(v==null?'':v).trim()!=='';
/* The parts a stored value is drawn with. A number typed before the test took sides stays
   one box: which side it was is not ours to guess. */
const tryoutPartsOf=(k,v)=>(typeof v==='string'&&v.trim()!=='')?null:(TRYOUT_PARTS[k]||null);
/* The one line read off a result: the asymmetry of a bilateral test, the estimated 1RM of a
   lift, the 5–10 m split, the FMS movement's score (the lower side). `lvl` colours it. */
function tryoutReadout(k,v){
  const Lx=(tr,en)=>REPORT_LANG==='tr'?tr:en;
  if(!v||typeof v!=='object'||!TRYOUT_PARTS[k])return null;
  const pct=p=>Lx('%'+p,p+'%');
  if(STR_LIFTS.includes(k)){const e=strE1rm(tN(v.load),tN(v.reps));
    return e!=null?{l:Lx('Tahmini 1RM','Est. 1RM'),v:+e.toFixed(1)+' kg'}:null;}
  if(k==='accel'){const a=tN(v.t5),b=tN(v.t10);
    if(a==null||b==null)return null;
    return b>a?{l:'5–10 m',v:(b-a).toFixed(2)+' '+tryoutUnit('sec')}:{l:Lx('Kontrol et','Check'),v:Lx('10 m > 5 m olmalı','10 m must exceed 5 m'),lvl:'bad'};}
  if(k==='hipRot'){const ir=asymPct(v.irR,v.irL,'hi'),er=asymPct(v.erR,v.erL,'hi');
    if(ir==null&&er==null)return null;const worst=Math.max(ir||0,er||0);
    return{l:Lx('Asimetri','Asymmetry'),v:[ir!=null?'IR '+pct(ir):'',er!=null?'ER '+pct(er):''].filter(Boolean).join(' · '),lvl:asymLevel(worst)};}
  if(k.startsWith('fms_')){const r=tN(v.r),l=tN(v.l);if(r==null||l==null)return null;
    return{l:Lx('Puan (düşük taraf)','Score (lower side)'),v:Math.min(r,l)+'/3',lvl:r!==l?'warn':Math.min(r,l)<=1?'bad':'ok'};}
  const p=asymPct(v.r,v.l,TRYOUT_LO.includes(k)?'lo':'hi');
  return p!=null?{l:Lx('Asimetri','Asymmetry'),v:pct(p),lvl:asymLevel(p)}:null;
}
/* Tests the trial sheet carried before it shared the club's catalog. They are not offered
   any more, but a candidate measured on one still has the number on their sheet — so the
   key keeps its name and its unit, and the sheet can still label the box. */
const TRYOUT_LEGACY=[
  {k:'sprint10m',     u:'sec', tr:'10m Sprint',       en:'10m Sprint'},
  {k:'sprint20m',     u:'sec', tr:'20m Sprint',       en:'20m Sprint'},
  {k:'sprint30m',     u:'sec', tr:'30m Sprint',       en:'30m Sprint'},
  {k:'illinois',      u:'sec', tr:'Illinois Çeviklik',en:'Illinois Agility'},
  {k:'yoyo',          u:'',    tr:'Yo-Yo (seviye)',   en:'Yo-Yo (level)'},
  {k:'plank',         u:'sec', tr:'Plank',            en:'Plank'},
  {k:'sitAndReach',   u:'cm',  tr:'Otur-Uzan',        en:'Sit & Reach'},
  {k:'medBallThrow',  u:'m',   tr:'Sağlık Topu Atışı',en:'Med Ball Throw'},
];
/* The tests a brand-new candidate starts with — the four a basketball trial runs by
   default. Everything else is one click away in the picker. */
const TRYOUT_TESTS_DEFAULT=['verticalJump','sprint','tTest','shuttleRun'];
/* The club's catalog as the trial sheet reads it: the built-in battery, then the coach's
   own tests (`data.customTests` — the same rows the Testing screen adds to), then any
   trial-only test left over from before the two lists were joined. */
const tryoutTestCatalog=custom=>{
  const own=Array.isArray(custom)?custom:[];
  return[
    ...TEST_CATALOG.filter(c=>!c.retired&&!TRYOUT_SKIP.includes(c.id))
      .map(c=>({k:c.id,u:TRYOUT_UNITS[c.id]||'',tr:TRYOUT_TR[c.id]||c.name,en:c.name,g:(TEST_META[c.id]||{}).g||'custom'})),
    ...own.map(c=>({k:c.id,u:c.u||'',tr:c.name,en:c.name,custom:true,g:'custom'})),
  ];
};
/* Everything a stored key can be looked up in, the retired and the sheet-less tests included,
   so a number written years ago still knows what it is called. */
const tryoutTestDefs=custom=>[...tryoutTestCatalog(custom),
  ...TEST_CATALOG.filter(c=>c.retired||TRYOUT_SKIP.includes(c.id)).map(c=>({k:c.id,u:TRYOUT_UNITS[c.id]||'',tr:TRYOUT_TR[c.id]||c.name,en:c.name,legacy:true,g:'old'})),
  ...TRYOUT_LEGACY.map(t=>({...t,legacy:true,g:'old'}))];
const tryoutTestDef=(k,custom)=>tryoutTestDefs(custom).find(t=>t.k===k)||{k,u:'',tr:k,en:k,legacy:true,g:'old'};
/* Which tests a sheet shows: the ones picked for it, plus any that already carry a
   result — a test whose pick was later removed must not take its number with it. A test the
   sheet can no longer hold (TRYOUT_SKIP) is shown only while it carries a number. */
const tryoutPicked=t=>{
  const tests=(t&&t.tests)||{};
  const picked=(Array.isArray(t&&t.picked)?t.picked:TRYOUT_TESTS_DEFAULT)
    .filter(k=>!TRYOUT_SKIP.includes(k)||tryoutHas(tests[k]));
  const filled=Object.keys(tests).filter(k=>tryoutHas(tests[k]));
  return[...picked,...filled.filter(k=>!picked.includes(k))];
};
// 'sec' and 'rep' are placeholders, not labels: written sn / tekrar in Turkish, s / reps in English.
const tryoutUnit=u=>u==='sec'?(REPORT_LANG==='tr'?'sn':'s'):u==='rep'?(REPORT_LANG==='tr'?'tekrar':'reps'):u;
/* A result as one line of text — the CSV, the printouts and the roster notes read it. */
function tryoutValText(k,v,def){
  const Lx=(tr,en)=>REPORT_LANG==='tr'?tr:en;
  if(!tryoutHas(v))return'';
  const parts=tryoutPartsOf(k,v);
  const u=def&&def.u?tryoutUnit(def.u):'';
  if(!parts)return String(v).trim()+(u?' '+u:'');
  return parts.filter(p=>String(v[p.s]==null?'':v[p.s]).trim()!=='')
    .map(p=>`${Lx(p.tr,p.en)} ${String(v[p.s]).trim()}${(p.u?tryoutUnit(p.u):u)?' '+(p.u?tryoutUnit(p.u):u):''}`).join(' · ');
}
/* THE CANDIDATE'S RESULTS AS THE SQUAD'S FIRST TEST RECORD. "Kadroya Aktar" used to carry the
   name, the phone and the height across and leave every number measured at the trial behind,
   so the promoted player's Testing & Assessment page started empty on the day they joined.
   The trial is now written into one record dated the trial day, in the shape the squad's own
   test cards read (makeTest), its battery the tests that carried a number. A value the record
   has no place for — a Y Balance composite, a side-less number on a bilateral test, a test the
   club deleted — comes back in `left` as a line of text, and goes into the athlete's notes. */
function tryoutTestRecord(cand,customIds){
  const t=cand||{};const tests=t.tests||{};
  const ids=customIds instanceof Set?customIds:new Set(customIds||[]);
  const rec=makeTest('pre');
  const day=t.date||fmt(today);
  rec.date=day;rec.year=parseD(day).getFullYear();
  const bat=[],left=[];
  const s=x=>String(x==null?'':x).trim();
  const num=x=>{const v=s(x);return v!==''&&isFinite(Number(v.replace(',','.')))?v.replace(',','.'):'';};
  // The body measurements are the Anthropometric Measurement test of the squad's catalog.
  ['height','weight','wingspan','bodyFat'].forEach(k=>{const v=num(t[k]);if(v){rec[k]=v;if(!bat.includes('anthro'))bat.push('anthro');}});
  const SINGLE=['verticalJump','cmj','squatJump','dropJump','horizontalJump','tTest','shuttleRun','laneAgility'];
  const LR={ankleDF:'ankleDF',lateralCmj:'lateralCmj',tSpine:'tSpine',copenhagen:'copenhagen',sidePlank:'sidePlank',curvedRun:'curvedRun',fiveZeroFive:'cod505'};
  const lr=v=>({right:num(v.r),left:num(v.l)});
  tryoutPicked(t).forEach(k=>{
    const v=tests[k];if(!tryoutHas(v))return;
    const obj=v&&typeof v==='object';
    let ok=false;
    if(!obj&&SINGLE.includes(k)&&num(v)){rec[k]=num(v);ok=true;}
    else if(!obj&&k==='sprint'&&num(v)){rec.sprint20m={...rec.sprint20m,time:num(v)};ok=true;}
    else if(!obj&&k==='ift3015'&&num(v)){rec.ift3015={vift:num(v)};ok=true;}
    else if(!obj&&k==='pullUp'&&num(v)){rec.pullUp={reps:num(v),load:''};ok=true;}
    else if(obj&&LR[k]){const o=lr(v);if(o.right||o.left){rec[LR[k]]=o;ok=true;
      if(k==='fiveZeroFive'){const b=cod505Calc({cod505:o}).best;rec.fiveZeroFive=b!=null?String(b):'';}}}
    else if(obj&&k==='hipRot'){const o={irR:num(v.irR),irL:num(v.irL),erR:num(v.erR),erL:num(v.erL)};
      if(Object.values(o).some(Boolean)){rec.hipRot=o;ok=true;}}
    else if(obj&&k==='accel'){const o={t5:num(v.t5),t10:num(v.t10)};if(o.t5||o.t10){rec.sprintSplits=o;ok=true;}}
    else if(obj&&STR_LIFTS.includes(k)){const o={load:num(v.load),reps:num(v.reps)};if(o.load){rec[k]=o;ok=true;}}
    else if(k.startsWith('fms_')&&FMS_PART_IDS.includes(k)){const item=k.slice(4);
      if(obj){const o=lr(v);if(o.right||o.left){rec.fms={...rec.fms,[item]:o};ok=true;}}
      else if(num(v)&&!TRYOUT_PARTS[k]){rec.fms={...rec.fms,[item]:num(v)};ok=true;}}
    else if(!obj&&ids.has(k)){rec.custom={...rec.custom,[k]:s(v)};ok=true;}
    if(ok)bat.push(k);
    else left.push(k);
  });
  return{rec:{...rec,battery:bat},taken:bat.length>0,left};
}
function makeTryout(){
  return{id:uid(),name:'',photo:null,dateOfBirth:'',position:'',dominantHand:'',
    phone:'',email:'',city:'',school:'',prevClub:'',guardian:'',guardianPhone:'',
    motherName:'',motherHeight:'',fatherName:'',fatherHeight:'',
    date:fmt(today),scout:'',status:'new',rating:0,
    strengths:'',weaknesses:'',notes:'',tests:{},picked:[...TRYOUT_TESTS_DEFAULT],createdAt:Date.now()};
}
/* The pool is not a squad, so it does not belong to one: candidates are held on the
   workspace and this screen reads all of them at once, whatever age they turn up at and
   whichever team a coach eventually moves them to. */
function TryoutsView({data,setData,teams,activeTeamId}){
  const Lx=(tr,en)=>REPORT_LANG==='tr'?tr:en;
  const list=Array.isArray(data.tryouts)?data.tryouts:[];
  /* The coach's own tests, read from the SAME place the Testing & Assessment screen
     keeps them — add one there and it is offered here on the next render, and the other
     way round. `data.tryoutTests` is what the trial sheet used to keep its own tests in;
     those rows are folded in (under the shared {id,name} shape) so a club that added
     tests before the two lists were joined does not lose them. */
  const customTests=useMemo(()=>[
    ...(Array.isArray(data.customTests)?data.customTests:[]),
    ...(Array.isArray(data.tryoutTests)?data.tryoutTests:[])
      .map(c=>({id:c.k,name:c.name,u:c.u||'',fromTryouts:true})),
  ],[data.customTests,data.tryoutTests]);
  const catalog=tryoutTestCatalog(customTests);
  const[sel,setSel]=useState(list[0]?.id||null);
  const[q,setQ]=useState('');
  const[flt,setFlt]=useState('all');
  /* Age is the filter a tryout pool is actually read by: a club running a U14 session
     wants the 13s and 14s out of a list that also holds every 11-year-old who ever
     turned up. Blank ends mean "no bound", so one box alone still works. */
  const[ageMin,setAgeMin]=useState('');
  const[ageMax,setAgeMax]=useState('');
  const[picker,setPicker]=useState(false);      // the test-catalog drawer
  const[newTest,setNewTest]=useState({name:'',u:''});
  const[moveTo,setMoveTo]=useState(activeTeamId);
  const photoRef=useRef(null);
  const save=next=>setData({...data,tryouts:next});
  // Applied to the list as it is when the change lands — a candidate's photo arrives after
  // its upload, and writing the list (and `data`) captured at the click would undo
  // everything edited in between.
  const upd=(id,patch)=>setData(d=>({...d,tryouts:(Array.isArray(d.tryouts)?d.tryouts:[]).map(t=>t.id===id?{...t,...(typeof patch==='function'?patch(t):patch)}:t)}));
  const cur=list.find(t=>t.id===sel)||null;
  const updT=patch=>cur&&upd(cur.id,patch);
  const updTest=(k,v)=>cur&&upd(cur.id,t=>({tests:{...(t.tests||{}),[k]:v}}));
  // One part of a test with parts (a side, a load, a gate) — the other parts stay as they are.
  const updPart=(k,part,v)=>cur&&upd(cur.id,t=>{const tests=t.tests||{};const o=tests[k];
    return{tests:{...tests,[k]:{...(o&&typeof o==='object'?o:{}),[part]:v}}};});
  const add=()=>{const t=makeTryout();save([t,...list]);setSel(t.id);};
  const del=id=>{const t=list.find(x=>x.id===id);
    if(!confirm(Lx(`${t&&t.name?t.name:'Bu aday'} kaydı silinsin mi?`,`Delete ${t&&t.name?t.name:'this candidate'}?`)))return;
    save(list.filter(x=>x.id!==id));if(sel===id)setSel(null);};
  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const ageOf=t=>{if(!t.dateOfBirth)return null;const b=parseD(t.dateOfBirth);const n=new Date();
    let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;return y;};
  /* A candidate has no team, so the position list cannot come from one. The squad the
     coach is looking at names it, and a pool holding footballers and basketballers
     alike still accepts a typed position. */
  const moveTeam=teams.find(t=>t.id===moveTo)||teams[0];
  const positions=(moveTeam&&POSITIONS[moveTeam.setup.sport])||POSITIONS.default;
  const shown=tryoutPicked(cur);
  /* The picker offers the club's catalog — plus any retired test this sheet is still
     carrying, so a box left over from the old trial-only list can be ticked off rather
     than sitting empty on the sheet for good. */
  const pickerList=[...catalog,...shown.filter(k=>!catalog.some(f=>f.k===k))
    .map(k=>({...tryoutTestDef(k,customTests),legacy:true}))];
  /* The catalog's own groups, in its order (Hareket Taraması, Sıçrama…), then the coach's
     tests and the retired ones. Empty groups are left out. */
  const tryoutGroups=defs=>[...TEST_GROUPS.filter(g=>g.id!=='all'),{id:'old',tr:'Eski Testler',en:'Retired Tests'}]
    .map(g=>({...g,items:defs.filter(f=>(f.legacy?'old':f.custom?'custom':(f.g||(TEST_META[f.k]||{}).g||'custom'))===g.id)}))
    .filter(g=>g.items.length);

  /* --- the test catalog on this sheet --- */
  const togglePick=k=>{
    if(!cur)return;
    const picked=Array.isArray(cur.picked)?cur.picked:[...TRYOUT_TESTS_DEFAULT];
    if(picked.includes(k)){
      // Dropping a test that already holds a number would throw the number away.
      if(tryoutHas((cur.tests||{})[k])&&
         !confirm(Lx('Bu testin girilmiş sonucu var — kaldırılsın mı?','This test already has a result — remove it anyway?')))return;
      const tests={...(cur.tests||{})};delete tests[k];
      updT({picked:picked.filter(x=>x!==k),tests});
    }else updT({picked:[...picked,k]});
  };
  /* A test typed in here joins the CLUB's catalog, not a list of the trial screen's own:
     it is written to `data.customTests`, which is what Testing & Assessment offers when
     a battery is built for the squad. */
  const addCustomTest=()=>{
    const name=(newTest.name||'').trim();
    if(!name)return;
    const k='ct_'+uid();
    const u=(newTest.u||'').trim();
    setData({...data,customTests:[...(Array.isArray(data.customTests)?data.customTests:[]),
        u?{id:k,name,u}:{id:k,name}],
      tryouts:list.map(t=>t.id===(cur&&cur.id)
        ?{...t,picked:[...(Array.isArray(t.picked)?t.picked:[...TRYOUT_TESTS_DEFAULT]),k]}:t)});
    setNewTest({name:'',u:''});
  };
  const delCustomTest=k=>{
    if(!confirm(Lx('Bu test kulübün test katalogundan silinsin mi? Test ve Değerlendirme sekmesinden de kalkar, adaylardaki sonuçları silinir.',
                   'Delete this test from the club\'s catalog? It goes from the Testing & Assessment screen too, and the candidates\' results for it are dropped.')))return;
    setData({...data,
      customTests:(Array.isArray(data.customTests)?data.customTests:[]).filter(c=>c.id!==k),
      tryoutTests:(Array.isArray(data.tryoutTests)?data.tryoutTests:[]).filter(c=>c.k!==k),
      tryouts:list.map(t=>{const tests={...(t.tests||{})};delete tests[k];
        return{...t,tests,picked:(Array.isArray(t.picked)?t.picked:[]).filter(x=>x!==k)};})});
  };

  /* The one door into a squad. Everything the roster knows how to hold is carried over;
     the tryout record stays where it is, marked accepted, so the club keeps its own
     history of who was looked at and when. Which squad is the coach's to choose — the
     pool is not tied to one, and a 13-year-old rarely goes into the team whose page
     they were found from. */
  const promote=()=>{
    if(!cur)return;
    const nm=(cur.name||'').trim();
    if(!nm){alert(Lx('Önce adayın adını yaz.','Give the candidate a name first.'));return;}
    const dest=teams.find(t=>t.id===moveTo);
    if(!dest){alert(Lx('Önce bir takım seç.','Pick a team first.'));return;}
    if(!confirm(Lx(`${nm} "${dest.setup.teamName}" kadrosuna eklensin mi?`,`Add ${nm} to the "${dest.setup.teamName}" roster?`)))return;
    const parents=TRYOUT_FAMILY.map(f=>{
      const n=(cur[f.kName]||'').trim(),h=(cur[f.kH]||'').trim();
      if(!n&&!h)return'';
      return Lx(f.tr,f.en)+': '+[n,h?h+' cm':''].filter(Boolean).join(' · ');
    }).filter(Boolean).join('\n');
    /* The trial's numbers become the athlete's first test record (tryoutTestRecord); the
       ones a record has no place for are written into the notes rather than dropped. */
    const ownIds=new Set((Array.isArray(data.customTests)?data.customTests:[]).map(c=>c.id));
    const tr=tryoutTestRecord(cur,ownIds);
    const leftTxt=tr.left.map(k=>{const d=tryoutTestDef(k,customTests);return Lx(d.tr,d.en)+': '+tryoutValText(k,(cur.tests||{})[k],d);}).join('; ');
    const notes=[cur.notes,cur.strengths&&Lx('Güçlü yönler: ','Strengths: ')+cur.strengths,
      cur.weaknesses&&Lx('Gelişim alanları: ','To develop: ')+cur.weaknesses,parents,
      leftTxt&&Lx('Seçme testleri: ','Tryout tests: ')+leftTxt].filter(Boolean).join('\n');
    const tests=tr.taken?[tr.rec]:[];
    /* The body measurements are mirrored into the measurements list the way a test taken on
       the Testing screen is (EvaluationView.updTest), so Antropometri shows them too. */
    const r=tr.rec;
    const measurements=tr.taken&&r.battery.includes('anthro')
      ?[{id:uid(),srcTest:r.id,date:r.date,height:r.height||'',weight:r.weight||'',bodyFat:r.bodyFat||'',
         wingspan:r.wingspan||'',legLength:'',sittingHeight:'',notes:''}]:[];
    const a={id:uid(),name:nm,number:'',position:cur.position||positions[0],
      dateOfBirth:cur.dateOfBirth||'',height:cur.height||'',weight:cur.weight||'',
      phone:cur.phone||'',phoneCode:DEFAULT_DIAL,photo:cur.photo||null,school:cur.school||'',
      notes:notes+(notes?'\n':'')+Lx('Seçmelerden geldi','From tryouts')+(cur.date?` (${fd(cur.date)})`:''),
      trainingAge:'',somatotype:'',constraints:'',constraintTags:[],levelTag:'',
      injuries:[],measurements,wellness:[],srpeLog:[],tests,days:{}};
    /* The roster and the tryout list live in the same `data` object, so both edits go
       through ONE setData — two calls would each start from the same stale `data` and the
       second would throw the first away, which is exactly how the athlete went missing. */
    setData({...data,
      teams:data.teams.map(t=>t.id===dest.id?{...t,athletes:[...(t.athletes||[]),a]}:t),
      tryouts:list.map(t=>t.id===cur.id?{...t,status:'in',movedTo:dest.id}:t)});
    const nT=tr.rec.battery.filter(k=>k!=='anthro').length;
    alert(Lx(`${nm} kadroya eklendi.`,`${nm} was added to the roster.`)+(tr.taken
      ?' '+Lx(`Seçme ölçümleri ${fd(tr.rec.date)} tarihli ilk test kaydı olarak aktarıldı${nT?` (${nT} test)`:''}.`,
              `The tryout measurements were carried over as their first test record, dated ${fd(tr.rec.date)}${nT?` (${nT} tests)`:''}.`):''));
  };
  // One sheet per candidate, one row per sheet — the file a club actually passes around.
  const exportCsv=()=>{
    const cols=[['name',Lx('Ad Soyad','Name')],['dateOfBirth',Lx('Doğum Tarihi','Date of Birth')],
      ['position',Lx('Pozisyon','Position')],['phone',Lx('Telefon','Phone')],['email','E-mail'],
      ['city',Lx('Şehir','City')],['school',Lx('Okul','School')],['prevClub',Lx('Önceki Kulüp','Previous Club')],
      ['guardian',Lx('Veli','Guardian')],['guardianPhone',Lx('Veli Telefonu','Guardian Phone')],
      ['motherName',Lx('Anne Adı','Mother')],['motherHeight',Lx('Anne Boyu (cm)','Mother Height (cm)')],
      ['fatherName',Lx('Baba Adı','Father')],['fatherHeight',Lx('Baba Boyu (cm)','Father Height (cm)')],
      ['date',Lx('Seçme Tarihi','Tryout Date')],['scout',Lx('Değerlendiren','Evaluator')]];
    // Every test anyone has been given a box for, so no column is lost to a sheet that
    // simply did not run it.
    // Retired tests too: a candidate measured on one still has the number, and a CSV that
    // silently drops the column loses it.
    const testCols=tryoutTestDefs(customTests).filter(f=>list.some(t=>tryoutPicked(t).includes(f.k)))
      /* A test with parts is one column per part (Sağ / Sol, Yük / Tekrar…); a side-less
         number typed before the test took sides is written in the first one. */
      .flatMap(f=>{const parts=TRYOUT_PARTS[f.k];
        if(!parts)return[{...f,h:Lx(f.tr,f.en)+(f.u?` (${tryoutUnit(f.u)})`:''),get:v=>v&&typeof v==='object'?'':(v||'')}];
        return parts.map((p,i)=>{const u=p.u?tryoutUnit(p.u):f.u?tryoutUnit(f.u):'';
          return{...f,h:`${Lx(f.tr,f.en)} ${Lx(p.tr,p.en)}`+(u?` (${u})`:''),
            get:v=>v&&typeof v==='object'?(v[p.s]||''):(i===0?(v||''):'')};});});
    const head=[...cols.map(c=>c[1]),...TRYOUT_BODY.map(f=>Lx(f.tr,f.en)+(f.u?` (${f.u})`:'')),
      ...testCols.map(f=>f.h),Lx('Puan','Rating'),Lx('Durum','Status'),
      Lx('Güçlü Yönler','Strengths'),Lx('Gelişim Alanları','To Develop'),Lx('Notlar','Notes')];
    const esc=v=>{const s=String(v==null?'':v);return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    const rows=list.map(t=>[...cols.map(c=>t[c[0]]||''),...TRYOUT_BODY.map(f=>t[f.k]||''),
      ...testCols.map(f=>f.get((t.tests||{})[f.k])),t.rating||'',Lx(tryoutStatus(t.status).tr,tryoutStatus(t.status).en),
      t.strengths||'',t.weaknesses||'',t.notes||''].map(esc).join(';'));
    const blob=new Blob(['﻿'+[head.map(esc).join(';'),...rows].join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`tryouts_${fmt(today)}.csv`;document.body.appendChild(a);a.click();
    document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  };
  const filtered=list.filter(t=>{
    if(flt!=='all'&&(t.status||'new')!==flt)return false;
    const age=ageOf(t);
    // A candidate with no birthday has no age to judge, so an age filter hides them
    // rather than guessing one for them.
    if(ageMin!==''&&(age==null||age<Number(ageMin)))return false;
    if(ageMax!==''&&(age==null||age>Number(ageMax)))return false;
    if(!q.trim())return true;
    const s=q.trim().toLowerCase();
    return[t.name,t.position,t.school,t.prevClub,t.city,t.motherName,t.fatherName]
      .some(v=>String(v||'').toLowerCase().includes(s));
  /* Newest trial first. The id breaks the remaining ties: two candidates entered on the
     same day within the same millisecond would otherwise have no order at all, and the
     list would reshuffle itself under the coach on every keystroke. */
  }).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)
    ||String(a.id).localeCompare(String(b.id)));
  const counts=TRYOUT_STATUS.reduce((m,s)=>{m[s.id]=list.filter(t=>(t.status||'new')===s.id).length;return m;},{});
  const ages=list.map(ageOf).filter(a=>a!=null);
  const field=(label,val,on,extra)=>(<div className="tryo-f" {...(extra||{})}>
    <label>{label}</label><input value={val||''} onChange={e=>on(e.target.value)}/></div>);
  const filterOn=ageMin!==''||ageMax!==''||flt!=='all'||q.trim()!=='';
  // The filter in words, printed under the list's title.
  const listFilterTxt=()=>[flt!=='all'?Lx(tryoutStatus(flt).tr,tryoutStatus(flt).en):'',
    ageMin!==''||ageMax!==''?Lx('Yaş ','Age ')+(ageMin||'…')+'–'+(ageMax||'…'):'',
    q.trim()?`“${q.trim()}”`:''].filter(Boolean).join(' · ');

  return(<div className="tryo-page">
    <PageHero title={Lx('Seçmeler','Tryouts')}
      sub={Lx('Kadronun dışındaki havuz — denemeye gelen her sporcu, kararı verilene kadar burada durur.',
              'The pool outside the squad — every trialling athlete stays here until the call is made.')}
      stats={[{v:list.length,l:Lx('Aday','Candidates')},
              {v:counts.watch||0,l:Lx('İzleniyor','Watching')},
              {v:counts.in||0,l:Lx('Kabul','Accepted')},
              {v:ages.length?`${Math.min(...ages)}–${Math.max(...ages)}`:'—',l:Lx('Yaş','Age')}]}>
      <button className="btn sm sec" onClick={exportCsv} disabled={!list.length}>CSV</button>
      {/* The list as it is filtered on screen — a U14 session prints its own sheet. */}
      <button className="btn sm sec" onClick={()=>printTryoutList(filtered,{customTests,filterTxt:filterOn?listFilterTxt():''})}
        disabled={!filtered.length} title={Lx('Ekranda süzülen adayların A4 yatay listesi','An A4 landscape list of the candidates filtered on screen')}>{Lx('Liste Çıktısı','Print List')}</button>
      <button className="tryo-add" onClick={add}>{Lx('Aday Ekle','Add Candidate')}</button>
    </PageHero>
    <div className="tryo-body">
      <div className="tryo-side">
        <div className="tryo-side-top">
          <input placeholder={Lx('Aday ara…','Search candidates…')} value={q} onChange={e=>setQ(e.target.value)}/>
          <div className="tryo-agerow">
            <span className="tryo-agel">{Lx('Yaş','Age')}</span>
            <input type="number" min="4" max="60" inputMode="numeric" placeholder={Lx('en az','min')}
              value={ageMin} onChange={e=>setAgeMin(e.target.value)} aria-label={Lx('En küçük yaş','Minimum age')}/>
            <span className="tryo-agedash">–</span>
            <input type="number" min="4" max="60" inputMode="numeric" placeholder={Lx('en çok','max')}
              value={ageMax} onChange={e=>setAgeMax(e.target.value)} aria-label={Lx('En büyük yaş','Maximum age')}/>
            {(ageMin!==''||ageMax!=='')&&
              <button className="tryo-agex" onClick={()=>{setAgeMin('');setAgeMax('');}} title={Lx('Yaş filtresini temizle','Clear age filter')}>✕</button>}
          </div>
          <div className="tryo-filters">
            <button className={'tryo-fl'+(flt==='all'?' on':'')} onClick={()=>setFlt('all')}>{Lx('Tümü','All')} {list.length}</button>
            {TRYOUT_STATUS.map(s=><button key={s.id} className={'tryo-fl'+(flt===s.id?' on':'')} onClick={()=>setFlt(s.id)}>
              {Lx(s.tr,s.en)} {counts[s.id]||0}</button>)}
          </div>
          {filterOn&&<div className="tryo-hits">{filtered.length} / {list.length} {Lx('aday gösteriliyor','candidates shown')}</div>}
        </div>
        <div className="tryo-list">
          {filtered.length===0&&<div className="empty-st" style={{padding:'26px 12px'}}>
            {list.length?Lx('Bu filtreye uyan aday yok.','No candidate matches this filter.')
                        :Lx('Henüz aday yok — "Aday Ekle" ile başla.','No candidates yet — start with "Add Candidate".')}
          </div>}
          {filtered.map(t=>{const st=tryoutStatus(t.status);const age=ageOf(t);
            return(<div key={t.id} className={'tryo-item'+(t.id===sel?' on':'')} onClick={()=>setSel(t.id)}>
              <div className="tryo-av">{t.photo?<img src={mediaSrc(t.photo)} alt=""/>:initials(t.name)}</div>
              <div className="tryo-item-tx">
                <div className="tryo-item-n">{t.name||Lx('İsimsiz aday','Unnamed candidate')}</div>
                <div className="tryo-item-m">{[t.position,age!=null?age+Lx(' yaş',' y'):null,t.date?fd(t.date):null].filter(Boolean).join(' · ')||'—'}</div>
              </div>
              <span className={'tryo-st '+st.id}>{Lx(st.tr,st.en)}</span>
            </div>);})}
        </div>
      </div>
      <div className="tryo-detail">
        {!cur&&<div className="tryo-empty">
          <div className="tryo-empty-ic"><TIc k="card" size={26}/></div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text2)'}}>{Lx('Bir aday seç','Pick a candidate')}</div>
          <div style={{fontSize:12.5,maxWidth:340,lineHeight:1.6}}>
            {Lx('Denemeye gelen sporcuların kişisel bilgilerini, ölçümlerini ve test sonuçlarını burada tutarsın. Her yaştan aday aynı havuzda durur; beğendiğini tek tuşla istediğin takımın kadrosuna aktarabilirsin.',
                'Keep every trialling athlete’s details, measurements and test results here. Candidates of every age share one pool, and one button moves the ones you want onto any squad’s roster.')}
          </div>
          <button className="btn sm" onClick={add}>＋ {Lx('Aday Ekle','Add Candidate')}</button>
        </div>}
        {cur&&<>
          <div className="tryo-dhd">
            <div className="tryo-photo" onClick={()=>photoRef.current&&photoRef.current.click()}>
              {cur.photo?<img src={mediaSrc(cur.photo)} alt=""/>:initials(cur.name)}
              <div className="tryo-photo-h">{Lx('Fotoğraf','Photo')}</div>
            </div>
            <input type="file" accept="image/*" ref={photoRef} style={{display:'none'}}
              onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)handleImageUpload(f,'tryouts',d=>updT({photo:d}));e.target.value='';}}/>
            <div className="tryo-dhd-tx">
              <input className="tryo-name" placeholder={Lx('Ad Soyad','Full name')} value={cur.name||''} onChange={e=>updT({name:e.target.value})}/>
              <div className="tryo-rate">
                {[1,2,3,4,5].map(n=><button key={n} className={n<=(cur.rating||0)?'on':''}
                  onClick={()=>updT({rating:cur.rating===n?0:n})} title={Lx(n+' yıldız',n+' stars')}>★</button>)}
                <span className="tryo-rate-c">{cur.rating?`${cur.rating}/5`:Lx('puanlanmadı','not rated')}</span>
              </div>
            </div>
            {/* The pool belongs to no squad, so moving a candidate out of it asks which one. */}
            <div className="tryo-dhd-a">
              <div className="tryo-move">
                <select value={moveTo} onChange={e=>setMoveTo(e.target.value)} aria-label={Lx('Hedef takım','Destination team')}>
                  {teams.map(t=><option key={t.id} value={t.id}>{t.setup.teamName}</option>)}
                </select>
                <button className="btn sm white" onClick={promote}>{Lx('Kadroya Aktar','Move to Roster')} →</button>
              </div>
              <button className="btn sm sec" onClick={()=>printTryoutSheet(cur,{customTests,teamName:moveTeam&&moveTeam.setup.teamName})}
                title={Lx('Adayın A4 seçme formu','The candidate’s A4 tryout sheet')}>{Lx('Çıktı Al','Print')}</button>
              <button className="btn sm danger" onClick={()=>del(cur.id)} title={Lx('Adayı sil','Delete candidate')}>✕</button>
            </div>
          </div>

          <div className="tryo-sum">
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Yaş','Age')}</div>
              <div className="tryo-sum-v">{ageOf(cur)??'—'}</div></div>
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Boy','Height')}</div>
              <div className="tryo-sum-v">{cur.height||'—'}{cur.height&&<small>cm</small>}</div></div>
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Kilo','Weight')}</div>
              <div className="tryo-sum-v">{cur.weight||'—'}{cur.weight&&<small>kg</small>}</div></div>
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Ayakkabı No','Shoe Size')}</div>
              <div className="tryo-sum-v">{cur.shoeSize||'—'}</div></div>
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Pozisyon','Position')}</div>
              <div className="tryo-sum-v" style={{fontSize:15}}>{cur.position||'—'}</div></div>
            <div className="tryo-sum-c"><div className="tryo-sum-l">{Lx('Seçme','Tryout')}</div>
              <div className="tryo-sum-v" style={{fontSize:15}}>{cur.date?fd(cur.date):'—'}</div></div>
          </div>

          <div className="tryo-sec">
            <div className="tryo-sec-h"><span className="ic"><TIc k="user" size={17}/></span>{Lx('Kişisel Bilgiler','Personal Details')}</div>
            <div className="tryo-sec-b"><div className="tryo-fields">
              <div className="tryo-f"><label>{Lx('Doğum Tarihi','Date of Birth')}</label>
                <input type="date" value={cur.dateOfBirth||''} onChange={e=>updT({dateOfBirth:e.target.value})}/></div>
              <div className="tryo-f"><label>{Lx('Pozisyon','Position')}</label>
                <select value={cur.position||''} onChange={e=>updT({position:e.target.value})}>
                  {/* A position the destination squad's sport does not list (a candidate typed in
                      under another team, an old PG) still shows, rather than reading as blank. */}
                  <option value="">—</option>{[...positions,...(cur.position&&!positions.includes(cur.position)?[cur.position]:[])]
                    .map(p=><option key={p} value={p}>{POS_FULL[p]||p}</option>)}
                </select></div>
              <div className="tryo-f"><label>{Lx('Kullandığı El / Ayak','Dominant Side')}</label>
                <select value={cur.dominantHand||''} onChange={e=>updT({dominantHand:e.target.value})}>
                  <option value="">—</option>
                  <option value="R">{Lx('Sağ','Right')}</option>
                  <option value="L">{Lx('Sol','Left')}</option>
                  <option value="B">{Lx('Çift yönlü','Both')}</option>
                </select></div>
              {field(Lx('Telefon','Phone'),cur.phone,v=>updT({phone:v}))}
              {field('E-mail',cur.email,v=>updT({email:v}))}
              {field(Lx('Şehir','City'),cur.city,v=>updT({city:v}))}
              {field(Lx('Okul','School'),cur.school,v=>updT({school:v}))}
              {field(Lx('Önceki Kulüp','Previous Club'),cur.prevClub,v=>updT({prevClub:v}))}
            </div></div>
          </div>

          {/* Parents: the name, and the height that predicts where the child ends up. */}
          <div className="tryo-sec">
            <div className="tryo-sec-h"><span className="ic"><TIc k="users" size={17}/></span>{Lx('Aile Bilgileri','Family')}
              <span className="cnt">{(()=>{const h=TRYOUT_FAMILY.map(f=>Number(cur[f.kH])).filter(n=>n>0);
                return h.length===2?Lx(`orta ebeveyn boyu ${Math.round((h[0]+h[1])/2)} cm`,`mid-parent height ${Math.round((h[0]+h[1])/2)} cm`):'';})()}</span></div>
            <div className="tryo-sec-b"><div className="tryo-fields">
              {TRYOUT_FAMILY.map(f=><React.Fragment key={f.kName}>
                {field(Lx(f.tr+' Adı',f.en+'’s Name'),cur[f.kName],v=>updT({[f.kName]:v}))}
                <div className="tryo-f tryo-t">
                  <label>{Lx(f.tr+' Boyu',f.en+'’s Height')}</label>
                  <input inputMode="decimal" placeholder="—" value={cur[f.kH]||''} onChange={e=>updT({[f.kH]:e.target.value})}/>
                  <span className="tryo-t-u">cm</span>
                </div>
              </React.Fragment>)}
              {/* The one number that gets the family on the phone, beside the family it
                  belongs to rather than stranded at the foot of the personal details. */}
              {field(Lx('Veli Telefonu','Guardian Phone'),cur.guardianPhone,v=>updT({guardianPhone:v}))}
            </div></div>
          </div>

          <div className="tryo-sec">
            <div className="tryo-sec-h"><span className="ic"><TIc k="ruler" size={17}/></span>{Lx('Fiziksel Ölçümler','Body Measurements')}</div>
            <div className="tryo-sec-b"><div className="tryo-fields">
              {TRYOUT_BODY.map(f=><div key={f.k} className={'tryo-f'+(f.u?' tryo-t':'')}>
                <label>{Lx(f.tr,f.en)}</label>
                <input inputMode="decimal" placeholder="—" value={cur[f.k]||''} onChange={e=>updT({[f.k]:e.target.value})}/>
                {f.u&&<span className="tryo-t-u">{f.u}</span>}
              </div>)}
            </div></div>
          </div>

          {/* Only the tests this trial actually ran, grouped as the squad's catalog groups
              them. The drawer holds the rest. */}
          <div className="tryo-sec">
            <div className="tryo-sec-h"><span className="ic"><TIc k="chart" size={17}/></span>{Lx('Test Sonuçları','Test Results')}
              <span className="cnt">{shown.filter(k=>tryoutHas((cur.tests||{})[k])).length}/{shown.length} {Lx('girildi','entered')}</span>
              <button className={'tryo-pickbtn'+(picker?' on':'')} onClick={()=>setPicker(!picker)}>
                {picker?Lx('Bitti','Done'):Lx('Test Seç / Ekle','Choose / Add Tests')}</button>
            </div>
            {picker&&<div className="tryo-picker">
              <div className="tryo-picker-h">{Lx('Bu adayın sayfasında hangi testler dursun?','Which tests should this candidate’s sheet carry?')}
                <span>{Lx('Sağ/sol testler iki kutuyla gelir. Antropometri “Fiziksel Ölçümler”de; çevre, postür ve Thomas testi seçmelik değil.',
                          'Right/left tests come with two boxes. Anthropometry is under “Body Measurements”; circumferences, posture and the Thomas test are not trial tests.')}</span></div>
              {tryoutGroups(pickerList).map(g=><div key={g.id} className="tryo-pick-grp">
                <div className="tryo-pick-gh">{Lx(g.tr,g.en)}<span>{g.items.filter(f=>shown.includes(f.k)).length}/{g.items.length}</span></div>
                <div className="tryo-picker-g">
                  {g.items.map(f=>{const on=shown.includes(f.k);
                    return(<button key={f.k} className={'tryo-pick'+(on?' on':'')} onClick={()=>togglePick(f.k)}>
                      <span className="bx">{on?'✓':''}</span>
                      <span className="nm">{Lx(f.tr,f.en)}</span>
                      {TRYOUT_PARTS[f.k]===TRYOUT_LR&&<span className="u">{Lx('S/S','R/L')}</span>}
                      {f.u&&<span className="u">{tryoutUnit(f.u)}</span>}
                      {f.legacy&&<span className="u" title={Lx('Eski test — katalogda yok','A retired test — no longer in the catalog')}>{Lx('eski','old')}</span>}
                      {f.custom&&<span className="x" title={Lx('Testi kulübün katalogundan sil','Delete this test from the club\'s catalog')}
                        onClick={e=>{e.stopPropagation();delCustomTest(f.k);}}>✕</span>}
                    </button>);})}
                </div>
              </div>)}
              <div className="tryo-picker-add">
                <input placeholder={Lx('Kendi testin (ör. Serbest Atış %)','Your own test (e.g. Free-throw %)')}
                  value={newTest.name} onChange={e=>setNewTest({...newTest,name:e.target.value})}
                  onKeyDown={e=>{if(e.key==='Enter')addCustomTest();}}/>
                <input className="u" placeholder={Lx('birim','unit')} value={newTest.u}
                  onChange={e=>setNewTest({...newTest,u:e.target.value})}
                  onKeyDown={e=>{if(e.key==='Enter')addCustomTest();}}/>
                <button className="btn sm sec" onClick={addCustomTest} disabled={!newTest.name.trim()}>＋ {Lx('Ekle','Add')}</button>
              </div>
            </div>}
            <div className="tryo-sec-b">
              {shown.length===0&&<div className="empty-st" style={{padding:'18px 10px',margin:0}}>
                {Lx('Bu adaya henüz test seçilmedi — "Test Seç / Ekle" ile başla.','No tests chosen for this candidate yet — start with "Choose / Add Tests".')}</div>}
              {tryoutGroups(shown.map(k=>tryoutTestDef(k,customTests))).map(g=><div key={g.id} className="tryo-tgrp">
                <div className="tryo-tgrp-h">{Lx(g.tr,g.en)}</div>
                <div className="tryo-tcs">
                  {g.items.map(f=>{const k=f.k;const v=(cur.tests||{})[k];const parts=tryoutPartsOf(k,v);
                    const unit=f.u?tryoutUnit(f.u):'';const rd=tryoutReadout(k,v);
                    return(<div key={k} className={'tryo-tc'+(tryoutHas(v)?' done':'')+(parts&&parts.length>2?' wide':'')}>
                      <div className="tryo-tc-h"><span className="nm">{Lx(f.tr,f.en)}</span>
                        {/* The unit sits inside each box, and each side is labelled over its own. */}
                        {f.legacy&&<span className="u old">{Lx('eski','old')}</span>}</div>
                      {parts
                        ?<div className={'tryo-tc-in n'+parts.length}>
                          {parts.map(p=><label key={p.s} className="tryo-tc-f"><span>{Lx(p.tr,p.en)}</span>
                            <input inputMode="decimal" placeholder="—" value={(v&&typeof v==='object'?v[p.s]:'')||''}
                              onChange={e=>updPart(k,p.s,e.target.value)} aria-label={`${Lx(f.tr,f.en)} ${Lx(p.tr,p.en)}`}/>
                            {(p.u||f.u)&&<em>{tryoutUnit(p.u||f.u)}</em>}</label>)}
                        </div>
                        :<div className="tryo-tc-in n1"><label className="tryo-tc-f">
                          <input inputMode="decimal" placeholder="—" value={typeof v==='string'?v:''}
                            onChange={e=>updTest(k,e.target.value)} aria-label={Lx(f.tr,f.en)}/>
                          {unit&&<em>{unit}</em>}</label></div>}
                      {rd&&<div className={'tryo-tc-r '+(rd.lvl||'')}><span>{rd.l}</span><b>{rd.v}</b></div>}
                    </div>);})}
                </div>
              </div>)}
            </div>
          </div>

          {/* The verdict. Status is the decision, so it is drawn as the decision: four
              cards across the top of the section rather than a row of small buttons
              under two date boxes. */}
          <div className="tryo-sec tryo-eval">
            <div className="tryo-sec-h"><span className="ic"><TIc k="star" size={17}/></span>{Lx('Değerlendirme','Evaluation')}
              <span className={'tryo-st '+(cur.status||'new')} style={{marginLeft:'auto'}}>
                {Lx(tryoutStatus(cur.status).tr,tryoutStatus(cur.status).en)}</span></div>
            <div className="tryo-sec-b">
              <div className="tryo-statcards">
                {TRYOUT_STATUS.map(s=><button key={s.id}
                  className={'tryo-statcard '+s.id+((cur.status||'new')===s.id?' on':'')}
                  onClick={()=>updT({status:s.id})}>
                  <span className="dot"/>
                  <span className="t">{Lx(s.tr,s.en)}</span>
                  <span className="d">{Lx(
                    {new:'Yeni geldi, henüz karar yok',watch:'Bir daha bakılacak',in:'Kadroya alınıyor',out:'Bu sezon değil'}[s.id],
                    {new:'Just arrived, no call yet',watch:'Worth another look',in:'Taking them on',out:'Not this season'}[s.id])}</span>
                </button>)}
              </div>
              <div className="tryo-fields" style={{marginBottom:14}}>
                <div className="tryo-f"><label>{Lx('Seçme Tarihi','Tryout Date')}</label>
                  <input type="date" value={cur.date||''} onChange={e=>updT({date:e.target.value})}/></div>
                {field(Lx('Değerlendiren','Evaluated By'),cur.scout,v=>updT({scout:v}))}
              </div>
              <div className="tryo-fields tryo-verdict">
                <div className="tryo-f half"><label className="tryo-lbl good">{Lx('Güçlü Yönler','Strengths')}</label>
                  <textarea value={cur.strengths||''} onChange={e=>updT({strengths:e.target.value})}
                    placeholder={Lx('Örn. patlayıcı ilk adım, oyun okuması iyi…','e.g. explosive first step, reads the game well…')}/></div>
                <div className="tryo-f half"><label className="tryo-lbl work">{Lx('Gelişim Alanları','To Develop')}</label>
                  <textarea value={cur.weaknesses||''} onChange={e=>updT({weaknesses:e.target.value})}
                    placeholder={Lx('Örn. sol el bitiriciliği, gövde stabilitesi…','e.g. left-hand finishing, trunk stability…')}/></div>
                <div className="tryo-f wide"><label>{Lx('Notlar','Notes')}</label>
                  <textarea value={cur.notes||''} onChange={e=>updT({notes:e.target.value})}
                    placeholder={Lx('Antrenör gözlemleri, sakatlık geçmişi, aile görüşmesi…','Coach observations, injury history, family conversation…')}/></div>
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  </div>);
}

function EvaluationView({team,updateTeam,data,setData}){
  const setup=team.setup;const athletes=team.athletes||[];
  const lang=REPORT_LANG;const Lx=(tr,en)=>lang==='en'?en:tr;
  const customTests=Array.isArray(data?.customTests)?data.customTests:[];
  // Full pickable catalog = built-in tests + this coach's own custom tests.
  const fullCatalog=[...TEST_CATALOG.filter(c=>!c.retired).map(c=>({id:c.id,name:c.name,custom:false})),
                     ...customTests.map(c=>({id:c.id,name:c.name,custom:true}))];
  const catName=id=>{const c=fullCatalog.find(x=>x.id===id);return c?c.name:id;};
  const[selId,setSelId]=useState(athletes[0]?.id||null);
  const[editingId,setEditingId]=useState(null);
  const[compare,setCompare]=useState(false);    // the whole-roster comparison table
  const[devId,setDevId]=useState(null);         // athlete whose development report page is open
  const[addBatId,setAddBatId]=useState(null);   // test whose battery is being extended
  const[pick,setPick]=useState(()=>new Set(['anthro','circ']));
  const[date,setDate]=useState(fmt(today));
  const[period,setPeriod]=useState('pre');
  // Applied to the athlete as they are when the change lands (see updateTeam): a test photo
  // is written seconds after it was picked, and by then the closed-over list is stale.
  const updAth=(id,upd)=>updateTeam(team.id,t=>({athletes:(t.athletes||[]).map(a=>a.id===id?{...a,...(typeof upd==='function'?upd(a):upd)}:a)}));
  const ath=athletes.find(a=>a.id===selId)||null;
  const tests=ath?.tests||[];
  const editing=editingId?tests.find(t=>t.id===editingId):null;
  const initials=name=>(name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const ageOf=a=>{if(!a?.dateOfBirth)return null;const b=parseD(a.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;};
  const toggle=id=>setPick(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const delCustom=id=>{
    if(!confirm(Lx('Bu özel testi listeden kaldır?','Remove this custom test from the list?')))return;
    setData({...data,customTests:customTests.filter(c=>c.id!==id)});
    setPick(p=>{const n=new Set(p);n.delete(id);return n;});
  };
  const takeTest=()=>{
    if(!ath){alert(Lx('Önce bir sporcu seç.','Select an athlete first.'));return;}
    if(pick.size===0){alert(Lx('En az bir test seç.','Pick at least one test.'));return;}
    const ids=fullCatalog.filter(c=>pick.has(c.id)).map(c=>c.id);
    const t={...makeTest(period),date,year:parseD(date).getFullYear(),battery:ids};
    updAth(ath.id,a=>({tests:[...(a.tests||[]),t]}));
    setEditingId(t.id);
  };
  /* `upd` is a patch or a function of the test as it is when the change lands — an upload
     finishing after another one must not put back the photo slots the first one filled. */
  const updTest=(id,upd)=>updAth(ath.id,a=>{
    const nextTests=(a.tests||[]).map(t=>t.id===id?{...t,...(typeof upd==='function'?upd(t):upd)}:t);
    const patch={tests:nextTests};
    // Keep the Body Comp section in sync: mirror this test's Anthropometric
    // Measurement (height/weight/wingspan/body fat/leg length + its date) into ath.measurements.
    const tt=nextTests.find(t=>t.id===id);
    if(tt){
      const ANTHRO=['height','weight','wingspan','bodyFat','legLength','sittingHeight'];
      const has=k=>tt[k]!==''&&tt[k]!=null&&!isNaN(Number(tt[k]));
      const hasAnthro=ANTHRO.some(has);
      const ms=a.measurements||[];
      const exIdx=ms.findIndex(m=>m.srcTest===id);
      if(hasAnthro&&tt.date){
        const rec={id:exIdx>=0?ms[exIdx].id:uid(),srcTest:id,date:tt.date,
          height:tt.height||'',weight:tt.weight||'',bodyFat:tt.bodyFat||'',wingspan:tt.wingspan||'',legLength:tt.legLength||'',sittingHeight:tt.sittingHeight||'',
          notes:exIdx>=0?(ms[exIdx].notes||''):''};
        patch.measurements=exIdx>=0?ms.map((m,i)=>i===exIdx?{...m,...rec}:m):[...ms,rec];
      }else if(exIdx>=0){
        // Anthropometric data cleared (or date removed) — drop the mirrored row.
        patch.measurements=ms.filter((_,i)=>i!==exIdx);
      }
    }
    return patch;
  });
  // Battery of an already-taken test (legacy records without `battery` cover everything).
  const batOf=t=>Array.isArray(t.battery)?t.battery:fullCatalog.map(c=>c.id);
  /* A coach's own measurement, created straight from the picker: it joins the catalog
     and is ticked on the spot, so the battery being built keeps its momentum. */
  const addCustomTest=()=>{
    const name=(prompt(Lx('Yeni testin adı:','Name of the new test:'))||'').trim();
    if(!name)return;
    const c={id:'ct_'+uid(),name};
    setData({...data,customTests:[...customTests,c]});
    setPick(p=>new Set([...p,c.id]));
  };
  // Create a custom test AND drop it into an existing record's battery. customTests and
  // the team live in the same `data` object, so both edits must go through one setData.
  const addCustomToTest=t=>{
    const name=(prompt(Lx('Yeni testin adı:','Name of the new test:'))||'').trim();
    if(!name)return;
    const c={id:'ct_'+uid(),name};
    const nextTests=tests.map(x=>x.id===t.id?{...x,battery:[...batOf(t),c.id]}:x);
    setData({...data,customTests:[...customTests,c],
      teams:data.teams.map(tm=>tm.id===team.id
        ?{...tm,athletes:athletes.map(a=>a.id===ath.id?{...a,tests:nextTests}:a)}
        :tm)});
    setPick(p=>new Set([...p,c.id]));
  };
  // Add / remove a test from an existing record's battery. Removing only hides the
  // section — the values stay on the record and come back if it is re-added.
  const toggleBattery=(t,cid)=>{
    const bat=batOf(t);
    if(!bat.includes(cid)){updTest(t.id,{battery:[...bat,cid]});return;}
    if(bat.length===1){alert(Lx('Bir testte en az bir ölçüm kalmalı.','A test record must keep at least one measurement.'));return;}
    if(!confirm(Lx('Bu ölçümü kayıttan çıkar? (girilen değerler silinmez)','Remove this measurement from the record? (entered values are kept)')))return;
    updTest(t.id,{battery:bat.filter(x=>x!==cid)});
  };
  const delTest=id=>{if(!confirm(Lx('Bu testi sil?','Delete this test?')))return;updAth(ath.id,{tests:tests.filter(t=>t.id!==id),measurements:(ath.measurements||[]).filter(m=>m.srcTest!==id)});if(editingId===id)setEditingId(null);};

  /* ---- the console's own state: how the roster is filtered/sorted on screen and
     which drawer of the test catalog is open ---- */
  const[posFilter,setPosFilter]=useState('all');
  const[q,setQ]=useState('');
  const[sortBy,setSortBy]=useState('name');
  const[listView,setListView]=useState(false);
  const[cat,setCat]=useState('all');
  const templates=Array.isArray(data?.testTemplates)?data.testTemplates:[];
  /* A battery a coach builds twice is a battery they build every week. Saving it keeps
     the picker's selection under a name; applying one replaces the selection wholesale. */
  const saveTemplate=()=>{
    if(pick.size===0){alert(Lx('Önce test seç.','Pick some tests first.'));return;}
    const name=(prompt(Lx('Şablon adı:','Template name:'))||'').trim();
    if(!name)return;
    setData({...data,testTemplates:[...templates,{id:uid(),name,tests:[...pick]}]});
  };
  /* A template saved before the FMS was split names the whole sheet: it comes out as its seven
     movements. An old ASLR becomes the FMS one, so applying it never starts a test the picker
     no longer offers. */
  const tplIds=t=>{
    const known=new Set(fullCatalog.map(c=>c.id));
    return[...new Set((t.tests||[]).flatMap(id=>id==='fms'?FMS_PART_IDS:id==='aslr'?['fms_aslr']:[id]))].filter(id=>known.has(id));
  };
  const delTemplate=id=>{
    if(!confirm(Lx('Bu şablon silinsin mi?','Delete this template?')))return;
    setData({...data,testTemplates:templates.filter(t=>t.id!==id)});
  };
  const posOfAth=a=>posOf(a.position)||a.position||'';
  const posGroups=[...new Set(athletes.map(posOfAth).filter(Boolean))];
  const roster=athletes.filter(a=>{
    if(posFilter!=='all'&&posOfAth(a)!==posFilter)return false;
    if(!q.trim())return true;
    const s=q.trim().toLowerCase();
    return(a.name||'').toLowerCase().includes(s)||String(a.number||'').includes(s)||posOfAth(a).toLowerCase().includes(s);
  }).sort((a,b)=>{
    if(sortBy==='name')return byAthleteName(a,b);
    if(sortBy==='tests')return((b.tests||[]).length-(a.tests||[]).length)||(a.name||'').localeCompare(b.name||'');
    const na=Number(a.number),nb=Number(b.number);
    const va=isFinite(na)?na:9999,vb=isFinite(nb)?nb:9999;
    return va-vb||(a.name||'').localeCompare(b.name||'');
  });
  const totalTests=athletes.reduce((s,a)=>s+(a.tests||[]).length,0);
  const catCount=g=>g==='all'?fullCatalog.length:fullCatalog.filter(c=>testGroupOf(c)===g).length;
  const catalogShown=cat==='all'?fullCatalog:fullCatalog.filter(c=>testGroupOf(c)===cat);
  const seasonLabel=seasonYears(setup)||String(new Date().getFullYear());
  /* The athlete's two ways in, on their card: their test records (selects them and scrolls to
     the list) and the development report, which opens as its own page in place of the tab
     (DevReportPage); its printout is a button on that page. */
  const openResults=id=>{setSelId(id);setEditingId(null);
    setTimeout(()=>{const el=document.getElementById('ev2-results');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},80);};
  const athActs=(a,cls)=>{const dated=(a.tests||[]).some(t=>t.date);
    return(<div className={cls} onClick={e=>e.stopPropagation()}>
      <button className="btn xs sec" onClick={()=>openResults(a.id)}>{Lx('Test Sonuçları','Test Results')}</button>
      <button className="btn xs" disabled={!dated} onClick={()=>setDevId(a.id)}
        title={dated?Lx('İlk testten bugüne karşılaştırmalı rapor (ayrı sayfada açılır)','Comparative report from the first test to today (opens on its own page)'):Lx('Bu sporcunun henüz test kaydı yok','No test records for this athlete yet')}>{Lx('Atletik Gelişim Raporu','Athletic Development Report')}</button>
    </div>);};

  const devAth=devId?athletes.find(a=>a.id===devId):null;
  if(devAth)return(<DevReportPage ath={devAth} setup={setup} customTests={customTests} onBack={()=>{setSelId(devAth.id);setDevId(null);}}/>);

  return(<div>
    <PageHero title={Lx('Test ve Değerlendirme','Testing & Assessment')}
      sub={`${Lx('İzle. Değerlendir. Geliştir.','Monitor. Assess. Develop.')} · ${setup.teamName}`}
      stats={[{v:seasonLabel,l:Lx('Sezon','Season')},
              {v:athletes.length,l:Lx('Sporcu','Athletes')},
              {v:totalTests,l:Lx('Tamamlanan Test','Tests Recorded')}]}>
      {athletes.length>0&&<button className={'btn sm'+(compare?'':' white')} onClick={()=>setCompare(v=>!v)}>
        {compare?Lx('Testlere dön','Back to tests'):Lx('Takım Verileri','Team Data')}
      </button>}
    </PageHero>

    {athletes.length===0&&<div className="empty-st">{Lx('Henüz sporcu yok — Kadro sekmesinden ekle.','No athletes yet — add them in the Roster tab.')}</div>}

    {/* Takım Verileri is a mode, not a panel: it reads the whole roster at once (development
        charts, and the comparison table under them), so it takes the screen while it is open. */}
    {compare&&athletes.length>0&&<TeamData athletes={athletes} setup={setup} customTests={customTests} Lx={Lx}/>}

    {!compare&&athletes.length>0&&<>
    {/* ---- filter bar: position, search, order, and how the roster is drawn ---- */}
    <div className="ev2-bar">
      <div className="ev2-tabs">
        <button className={'ev2-tab'+(posFilter==='all'?' on':'')} onClick={()=>setPosFilter('all')}>
          {Lx('Tüm Sporcular','All Athletes')}<span className="ev2-tab-n">({athletes.length})</span>
        </button>
        {posGroups.map(p=><button key={p} className={'ev2-tab'+(posFilter===p?' on':'')} onClick={()=>setPosFilter(p)}>
          {POS_FULL[p]||p}<span className="ev2-tab-n">({athletes.filter(a=>posOfAth(a)===p).length})</span>
        </button>)}
      </div>
      <div className="ev2-bar-sp"/>
      <div className="ev2-search">
        <input placeholder={Lx('Sporcu ara…','Search athlete…')} value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      <select className="ev2-sort" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
        <option value="name">{Lx('İsme Göre (A–Z)','Name (A–Z)')}</option>
        <option value="num">{Lx('Forma No (Küçükten Büyüğe)','Jersey No (ascending)')}</option>
        <option value="tests">{Lx('Test Sayısı (Çoktan Aza)','Test Count (most first)')}</option>
      </select>
      <div className="ev2-vt">
        <button className={listView?'':'on'} onClick={()=>setListView(false)} title={Lx('Kart görünümü','Card view')}>{Lx('Kart','Cards')}</button>
        <button className={listView?'on':''} onClick={()=>setListView(true)} title={Lx('Liste görünümü','List view')}>{Lx('Liste','List')}</button>
      </div>
    </div>

    {roster.length===0&&<div className="empty-st">{Lx('Bu filtreye uyan sporcu yok.','No athlete matches this filter.')}</div>}

    {!listView&&roster.length>0&&<div className="ev2-grid">{roster.map(a=>{
      const age=ageOf(a);const n=(a.tests||[]).length;const on=a.id===selId;
      return(<div key={a.id} className={'ev2-card'+(on?' on':'')} onClick={()=>{setSelId(on?null:a.id);setEditingId(null);}}>
        {a.number!==''&&a.number!=null&&<div className="ev2-card-n">{a.number}</div>}
        {n>0&&<div className="ev2-card-b">{n} {Lx('test',n===1?'test':'tests')}</div>}
        <div className="ev2-card-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials(a.name)}</div>
        <div className="ev2-card-nm">{a.name}</div>
        <div className="ev2-card-mt">{(POS_FULL[a.position]||a.position||'—')}{age!=null?` · ${age}y`:''}</div>
        {athActs(a,'ev2-card-acts')}
      </div>);
    })}</div>}

    {listView&&roster.length>0&&<div className="ev2-rows">{roster.map(a=>{
      const age=ageOf(a);const n=(a.tests||[]).length;const on=a.id===selId;
      return(<div key={a.id} className={'ev2-lrow'+(on?' on':'')} onClick={()=>{setSelId(on?null:a.id);setEditingId(null);}}>
        <div className="ev2-lrow-n">{a.number||'—'}</div>
        <div className="ev2-lrow-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials(a.name)}</div>
        <div className="ev2-lrow-nm">{a.name}</div>
        <div className="ev2-lrow-mt">{(POS_FULL[a.position]||a.position||'—')}{age!=null?` · ${age}y`:''}</div>
        <div className="ev2-lrow-mt" style={{flex:'0 0 86px'}}>{n} {Lx('test',n===1?'test':'tests')}</div>
        {athActs(a,'ev2-lrow-acts')}
      </div>);
    })}</div>}

    {ath&&<>
      {/* ---- step 1 — build the battery ---- */}
      <div className="ev2-step">
        <div className="ev2-step-hd">
          <div className="ev2-step-n">1</div>
          <div className="ev2-step-tx">
            <div className="ev2-step-t">{Lx('Test Seçimi','Test Selection')} — <span className="ev2-step-who">{ath.name}</span></div>
            <div className="ev2-step-s">{Lx('Bu sporcu için uygulamak istediğin testleri seç. Yaş sınırı yok, kendin için bir test bataryası oluşturabilirsin.','Pick the tests you want for this athlete — no age limit, build any battery you like.')}</div>
          </div>
          <div className="ev2-step-a">
            <button className="btn xs sec" onClick={()=>setPick(new Set(fullCatalog.map(c=>c.id)))}>{Lx('Tümünü Seç','Select All')}</button>
            <button className="btn xs sec" onClick={()=>setPick(new Set())}>{Lx('Temizle','Clear')}</button>
            <button className="btn xs sec" onClick={saveTemplate}>{Lx('Şablon Kaydet','Save Template')}</button>
          </div>
        </div>
        <div className="ev2-step-bd">
          {templates.length>0&&<div className="ev2-tpls">
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.07em'}}>
              {Lx('Şablonlar','Templates')}
            </span>
            {templates.map(t=><span key={t.id} className="ev2-tpl" onClick={()=>setPick(new Set(tplIds(t)))}>
              {t.name}<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,opacity:.6}}>{tplIds(t).length}</span>
              <button className="ev2-tpl-x" onClick={e=>{e.stopPropagation();delTemplate(t.id);}} title={Lx('Şablonu sil','Delete template')}>{Lx('Sil','Delete')}</button>
            </span>)}
          </div>}
          <div className="ev2-pick">
            <div className="ev2-cats">
              {TEST_GROUPS.map(g=><button key={g.id} className={'ev2-cat'+(cat===g.id?' on':'')} onClick={()=>setCat(g.id)}>
                {Lx(g.tr,g.en)}
                <span className="ev2-cat-n">{catCount(g.id)}</span>
              </button>)}
            </div>
            <div className="ev2-tiles">
              {catalogShown.map(c=>{const on=pick.has(c.id);const m=TEST_META[c.id]||{};
                const cat0=(TEST_CATALOG.find(x=>x.id===c.id)||{});
                const fmsP=FMS_PART_IDS.includes(c.id);
                return(<div key={c.id} className={'ev2-tile g-'+testGroupOf(c)+(on?' on':'')+(fmsP?' fmsp-tile':'')}
                  onClick={()=>toggle(c.id)} title={c.name}>
                  {fmsP&&<img className="ev2-tile-fms" src={FMS_LOGO_SQ} alt="FMS"/>}
                  <div className="ev2-tile-tx">
                    {!fmsP&&<div className="ev2-tile-k">{c.custom?Lx('Özel','Custom'):(cat0.short||'')}</div>}
                    <div className="ev2-tile-t">{fmsP?c.name.replace(/^FMS /,''):c.name}</div>
                    <div className="ev2-tile-s">{m.tr?Lx(m.tr,m.en):Lx('Özel test','Custom test')}</div>
                  </div>
                  <div className="ev2-tile-chk"/>
                  {c.custom&&<button className="ev2-tile-x" title={Lx('Özel testi sil','Remove custom test')} onClick={e=>{e.stopPropagation();delCustom(c.id);}}>{Lx('Sil','Remove')}</button>}
                </div>);})}
              {(cat==='all'||cat==='custom')&&<div className="ev2-tile add" onClick={addCustomTest}>
                <div className="ev2-tile-tx"><div className="ev2-tile-t" style={{color:'var(--accent2)'}}>{Lx('Özel Test Ekle','Add Custom Test')}</div>
                  <div className="ev2-tile-s">{Lx('Kendi ölçümünü ekle','Add your own measure')}</div></div>
              </div>}
            </div>
          </div>
          <div className="ev2-foot">
            <div className="ev2-foot-f"><label>{Lx('Test Tarihi','Test Date')}</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div className="ev2-foot-f"><label>{Lx('Dönem','Period')}</label>
              <select value={period} onChange={e=>setPeriod(e.target.value)}>
                {TEST_PERIODS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </select></div>
            <button className="btn ev2-go" disabled={pick.size===0} onClick={takeTest}>
              {Lx('Testi Başlat','Start Test')} <span className="ev2-go-n">{pick.size}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---- step 2 — what has already been recorded ---- */}
      <div className="ev2-step" id="ev2-results" style={{scrollMarginTop:72}}>
        <div className="ev2-step-hd">
          <div className="ev2-step-n">2</div>
          <div className="ev2-step-tx">
            <div className="ev2-step-t">{Lx('Test Sonuçları','Test Results')} <span style={{fontSize:13,color:'var(--muted)',fontWeight:400}}>({tests.length})</span></div>
            <div className="ev2-step-s">{Lx('Kayda tıklayarak değerleri gir, düzenle ve çıktısını al.','Click a record to enter, edit and print its values.')}</div>
          </div>
        </div>
        <div className="ev2-step-bd">
          {tests.length===0&&<div className="empty-st">{Lx('Bu sporcu için henüz test yok. Yukarıdan test seçip "Testi Başlat"a bas.','No tests yet. Pick tests above and press "Start Test".')}</div>}
          {tests.length>0&&<div className="ev2-res">
            {[...tests].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(t=>{
              const isEd=editingId===t.id;const bat=batOf(t);
              const isAdding=addBatId===t.id;
              const per=TEST_PERIODS.find(p=>p.id===t.period);
              const d=t.date?parseD(t.date):null;
              return(<div key={t.id} className={'ev2-res-row'+(isEd?' open':'')} onClick={()=>setEditingId(t.id)}
                title={Lx('Testi açmak için tıkla','Click to open the test')}>
                <div className="ev2-res-d">
                  <div className="ev2-res-dd">{d?pad(d.getDate()):'—'}</div>
                  <div className="ev2-res-dm">{d?`${MN[d.getMonth()]} ${d.getFullYear()}`:''}</div>
                </div>
                <div className="ev2-res-mid">
                  {per&&<span className="test-period-pill">{per.label}</span>}
                  <div className="ev2-res-sub">{t.year} · {expandBattery(bat).length} {Lx('test',expandBattery(bat).length===1?'test':'tests')}</div>
                </div>
                <div className="ev2-res-tags">
                  {expandBattery(bat).map(id=>{const c=TEST_CATALOG.find(x=>x.id===id)||customTests.find(x=>x.id===id);
                    return c?<span key={id} className="bat-tag" title={c.name}>{c.short||c.name}</span>:null;})}
                </div>
                <div className="ev2-res-a">
                  <button className="btn xs sec" style={isAdding?{background:'var(--accent)',color:'#0a0b0d',borderColor:'var(--accent)'}:{}}
                    onClick={e=>{e.stopPropagation();setAddBatId(isAdding?null:t.id);}}
                    title={Lx('Bu kayda yeni test ekle','Add more tests to this record')}>{Lx('Test Ekle','Add Tests')}</button>
                  {/* The row itself opens the record, so it has no separate "open" button. A bare ✕
                      reads as "close", not "delete for good": it says what it does, and it is the
                      only red thing on the row. */}
                  <button className="btn xs danger" onClick={e=>{e.stopPropagation();delTest(t.id);}}
                    title={Lx('Bu test kaydını sil','Delete this test record')}>{Lx('Testi Sil','Delete Test')}</button>
                </div>
                {isAdding&&<div className="bat-add ev2-res-bat" onClick={e=>e.stopPropagation()}>
                  <div className="help" style={{marginBottom:10}}>{Lx('Bu teste eklemek istediğin ölçümleri seç — seçtiklerin hemen kaydın bataryasına girer.','Pick the measurements to add to this record — they join its battery right away.')}</div>
                  <div className="tpick">
                    {fullCatalog.map(c=>{const onB=bat.includes(c.id);
                      return(<div key={c.id} className={'tpc'+(onB?' on':'')} onClick={()=>toggleBattery(t,c.id)}>
                        {c.custom&&<div className="tpc-tag">{Lx('özel','custom')}</div>}
                        <div className="tpc-t">{c.name}</div>
                        <div className="tpc-chk"/>
                      </div>);})}
                    <div className="tpc add" onClick={()=>addCustomToTest(t)}>
                      <div className="tpc-t">{Lx('Özel Test Ekle','Add Custom Test')}</div>
                    </div>
                  </div>
                </div>}
              </div>);})}
          </div>}
        </div>
      </div>

      {editing&&<TestSession test={editing} ath={ath} setup={setup} customTests={customTests} athletes={athletes} onUpdate={u=>updTest(editing.id,u)} onClose={()=>setEditingId(null)}/>}
    </>}
    </>}
  </div>);
}

