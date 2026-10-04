/* Generic chip multi-select used for constraint tags everywhere. */
function TagChips({value,onChange,options,empty}){
  const sel=Array.isArray(value)?value:[];
  const toggle=id=>onChange(sel.includes(id)?sel.filter(x=>x!==id):[...sel,id]);
  return(<div className="iv-chips">
    {options.map(o=><button key={o.id} type="button" className={'iv-chip'+(sel.includes(o.id)?' on':'')}
      onClick={()=>toggle(o.id)}>{o.label}</button>)}
    {options.length===0&&<span className="iv-dim">{empty||'—'}</span>}
  </div>);
}

/* Sets, reps and RPE are picked from a list rather than typed — the same three
   numbers get written over and over, and a dropdown is faster than a keyboard.
   Whatever is already written stays selectable even when it is not on the list, so
   a template's rep RANGE ("8-10") or an odd strength-set count survives the coach
   opening the dropdown. */
const SLOT_SETS=['1','2','3','4','5','6','7','8','9','10'];
const SLOT_REPS=['1','2','3','4','5','6','8','10','12','15','20'];
const SLOT_RPES=['4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10'];
const SLOT_SS=['A','B','C','D','E','F'];
function SlotPick({value,options,onChange,title}){
  /* Picked, not typed, but the same rule applies: the box shows the new number on the
     next frame and the plan behind it is rebuilt as a transition. */
  const[v,set]=useLiveValue(String(value==null?'':value),onChange);
  const opts=(v&&!options.includes(v))?[v,...options]:options;
  return(<select value={v} onChange={e=>set(e.target.value)} title={title}>
    <option value="">—</option>
    {opts.map(o=><option key={o} value={o}>{o}</option>)}
  </select>);
}

/* ---- Assistant coach ------------------------------------------------------
   What THIS athlete should train today, in six slots — one per movement pattern.
   It is a reading of their own record, not a generic template and not a call to a
   model: the check-in (readiness, soreness, fatigue, reported pain), yesterday's RPE,
   the acute:chronic load, the latest test session (asymmetries, ankle dorsiflexion,
   ASLR, overhead squat, Y balance, jumps), the anthropometrics, the position group and
   the training level. Every pick names the number that produced it, so the coach can
   disagree with it on the spot — nothing is written anywhere until Copy → Paste. */
const CA_SLOTS=[
  {id:'hip', pattern:'Hip Dominant',    label:'Hip Dominant'},
  {id:'knee',pattern:'Knee Dominant',   label:'Knee Dominant'},
  {id:'push',pattern:'Upper Body Push', label:'Upper Body Push'},
  {id:'pull',pattern:'Upper Body Pull', label:'Upper Body Pull'},
  {id:'core',pattern:'Core',            label:'Core'},
  {id:'acc', pattern:'Accessory',       label:'Aksesuar'},
];
/* One candidate per line: the name, the execution it is filed under (must be one of the
   pattern's own executions), the level it suits, the traits the day's intent selects on,
   the pain regions it LOADS (reported ⇒ dropped), and the needs it answers. */
const CA_POOL={
  hip:[
    {n:'Romanian Deadlift',           ex:'Pull',     lv:2, t:[], base:1,    hits:['back','hamstring'], fix:['ham']},
    {n:'Trap Bar Deadlift',           ex:'Pull',     lv:2, t:[],            hits:['back'],             fix:['power']},
    {n:'Barbell Hip Thrust',          ex:'Push',     lv:1, t:['sup'],       hits:[],                   fix:['glute']},
    {n:'Single-Leg RDL',              ex:'Pull',     lv:2, t:['uni'],       hits:['hamstring'],        fix:['asym','balance']},
    {n:'45° Back Extension',          ex:'Pull',     lv:1, t:['bw'],        hits:['back'],             fix:['ham']},
    {n:'Nordic Hamstring Curl',       ex:'Eccentric',lv:3, t:['ecc'],tp:'4-0-1',hits:['hamstring'],    fix:['ham']},
    {n:'Glute Bridge ISO Hold',       ex:'ISO',      lv:1, t:['iso','bw'],  hits:[],                   fix:['glute']},
    {n:'Kettlebell Swing',            ex:'Pull',     lv:2, t:['exp'],       hits:['back'],             fix:['power']},
  ],
  knee:[
    {n:'Back Squat',                  ex:'Push',     lv:3, t:[], base:1,    hits:['knee','back'],      fix:[]},
    {n:'Goblet Squat',                ex:'Push',     lv:1, t:['sup'],       hits:['knee'],             fix:['tech']},
    {n:'Front Squat',                 ex:'Push',     lv:3, t:[],            hits:['knee','back','wrist'],fix:['tech']},
    {n:'Bulgarian Split Squat',       ex:'Push',     lv:2, t:['uni'],       hits:['knee'],             fix:['asym','balance']},
    {n:'Split Squat ISO Hold',        ex:'ISO',      lv:1, t:['iso','uni'], hits:[],                   fix:['asym','tech']},
    {n:'Leg Press',                   ex:'Push',     lv:1, t:['sup'],       hits:[],                   fix:[]},
    {n:'Tempo Box Squat (3-1-1)',     ex:'Eccentric',lv:2, t:['ecc'],tp:'3-1-1',hits:['knee'],         fix:['tech']},
    {n:'Step-Up',                     ex:'Push',     lv:1, t:['uni'],       hits:[],                   fix:['asym','balance']},
    {n:'Wall Sit',                    ex:'ISO',      lv:1, t:['iso','bw'],  hits:[],                   fix:[]},
  ],
  push:[
    {n:'Barbell Bench Press',         ex:'Horizontal',lv:2, t:[], base:1,   hits:['shoulder','wrist'], fix:[]},
    {n:'Neutral-Grip DB Bench Press', ex:'Horizontal',lv:1, t:[],           hits:[],                   fix:['shoulder-health']},
    {n:'Overhead Press',              ex:'Vertical',  lv:3, t:[],           hits:['shoulder','back'],  fix:[]},
    {n:'Landmine Press',              ex:'Vertical',  lv:1, t:[],           hits:[],                   fix:['shoulder-health','tspine']},
    {n:'Incline DB Press',            ex:'Horizontal',lv:2, t:[],           hits:['shoulder'],         fix:[]},
    {n:'Half-Kneeling 1-Arm DB Press',ex:'Vertical',  lv:2, t:['uni'],      hits:['shoulder'],         fix:['asym','core-brace']},
    {n:'Tempo Push-Up (3-1-1)',       ex:'Horizontal',lv:1, t:['bw','ecc'],tp:'3-1-1',hits:['wrist'],  fix:['tech']},
    {n:'Med Ball Chest Pass',         ex:'Horizontal',lv:2, t:['exp'],      hits:[],                   fix:['power']},
  ],
  pull:[
    {n:'Pull-Up',                     ex:'Vertical',  lv:3, t:['bw'],       hits:['shoulder','wrist'], fix:[]},
    {n:'Lat Pulldown',                ex:'Vertical',  lv:1, t:['sup'],base:1,hits:[],                  fix:[]},
    {n:'Barbell Row',                 ex:'Horizontal',lv:3, t:[],           hits:['back'],             fix:[]},
    {n:'Chest-Supported DB Row',      ex:'Horizontal',lv:1, t:['sup'],      hits:[],                   fix:['posture']},
    {n:'1-Arm DB Row',                ex:'Horizontal',lv:2, t:['uni','sup'],hits:[],                   fix:['asym']},
    {n:'Inverted Row',                ex:'Horizontal',lv:1, t:['bw'],       hits:['wrist'],            fix:['tech']},
    {n:'Face Pull',                   ex:'Horizontal',lv:1, t:[],           hits:[],                   fix:['shoulder-health','posture']},
    {n:'Seated Cable Row (neutral)',  ex:'Horizontal',lv:1, t:['sup'],      hits:[],                   fix:['posture']},
  ],
  core:[
    {n:'Front Plank',                 ex:'Anti-Extension',      lv:1, t:['iso','bw'], base:1, hits:[],fix:['core-brace']},
    {n:'Dead Bug',                    ex:'Anti-Extension',      lv:1, t:['bw'],       hits:[],       fix:['core-brace','tech']},
    {n:'Pallof Press',                ex:'Anti-Rotation',       lv:1, t:[],           hits:[],       fix:['core-brace','rot']},
    {n:'Side Plank',                  ex:'Anti-Lateral Flexion',lv:1, t:['iso','bw'], hits:[],       fix:['asym']},
    {n:'Suitcase Carry',              ex:'Anti-Lateral Flexion',lv:2, t:[],           hits:['back','wrist'], fix:['grip','asym']},
    {n:'Cable Woodchop',              ex:'Rotation',            lv:2, t:[],           hits:['back'], fix:['rot']},
    {n:'Hollow Body Hold',            ex:'Flexion',             lv:2, t:['iso','bw'], hits:[],       fix:['core-brace']},
    {n:'Bird Dog',                    ex:'Anti-Rotation',       lv:1, t:['bw'],       hits:[],       fix:['core-brace','posture']},
  ],
  acc:[
    {n:'Eccentric Calf Raise',        ex:'Eccentric',lv:1, t:['ecc'],tp:'4-0-1',hits:['ankle'], fix:['calf','ankle']},
    {n:'Ankle Dorsiflexion Mobilisation',ex:'ISO',   lv:1, t:['iso'],      hits:[],        fix:['ankle']},
    {n:'Tibialis Raise',              ex:'Pull',     lv:1, t:[],           hits:[],        fix:['ankle','calf']},
    {n:'Copenhagen Adduction (ISO)',  ex:'ISO',      lv:2, t:['iso','uni'],hits:['hip'],   fix:['groin','asym']},
    {n:'Hamstring Slider Curl',       ex:'Eccentric',lv:2, t:['ecc'],tp:'4-0-1',hits:['hamstring'], fix:['ham']},
    {n:'Band External Rotation',      ex:'Pull',     lv:1, t:[], base:1,   hits:[],        fix:['shoulder-health']},
    {n:'Y-T-W Scapular Series',       ex:'Pull',     lv:1, t:['bw'],       hits:[],        fix:['posture','shoulder-health','tspine']},
    {n:"Farmer's Carry",              ex:'Pull',     lv:1, t:[],           hits:['back','wrist'], fix:['grip']},
    {n:'Neck Isometrics',             ex:'ISO',      lv:1, t:['iso'],      hits:[],        fix:[]},
  ],
};
/* Position bias — what that group's game asks for most often. It biases CONTENT only:
   an asymmetry is something a test measures, never something a position implies. `other`
   (any non-basketball roster) gets nothing, so a sport the app knows nothing about is not
   second-guessed. */
const CA_POS_BIAS={guard:['ankle','calf','rot'],wing:['ankle','shoulder-health'],post:['shoulder-health','posture','groin','tspine'],other:[]};
/* Which slots a need is allowed to speak for. A leg asymmetry is a reason to press one arm
   at a time in nobody's book, and that is exactly what an unscoped need would do — it fed
   every slot the same +3 and turned all six picks unilateral. */
const CA_NEED_SLOTS={asym:['hip','knee','core','acc'],ankle:['acc','knee'],calf:['acc'],ham:['hip','acc'],
  groin:['acc','hip'],'shoulder-health':['push','pull','acc'],posture:['pull','acc','core'],tspine:['push','pull','acc'],
  'core-brace':['core','push','knee'],rot:['core'],grip:['core','acc'],power:['hip','knee','push'],balance:['knee','hip']};
/* The day's intent: how hard, and which kind of variation the pool should lean on. Only the
   ends of the range state a preference — a normal training day has no business overriding
   the staple lift of a slot with a variation nobody asked for. */
const CA_INTENT={
  recovery:{label:'Toparlanma',  want:['iso','sup','bw'],  dose:{main:{sets:'2',reps:'8', rpe:'5',  rest:'90sn'},hold:{sets:'2',duration:'30sn',rpe:'5',rest:'45sn'},exp:{sets:'2',reps:'3',rpe:'5',rest:'90sn'},acc:{sets:'2',reps:'12',rpe:'5',rest:'45sn'}}},
  maintain:{label:'Koruma',      want:['sup'],             dose:{main:{sets:'3',reps:'6', rpe:'6.5',rest:'2dk'}, hold:{sets:'3',duration:'30sn',rpe:'6',rest:'45sn'},exp:{sets:'3',reps:'3',rpe:'6',rest:'2dk'},  acc:{sets:'2',reps:'12',rpe:'6',rest:'60sn'}}},
  develop: {label:'Geliştirme',  want:[],                  dose:{main:{sets:'4',reps:'5', rpe:'7.5',rest:'2-3dk'},hold:{sets:'3',duration:'40sn',rpe:'7',rest:'60sn'},exp:{sets:'4',reps:'3',rpe:'7',rest:'2dk'},  acc:{sets:'3',reps:'12',rpe:'7',rest:'60sn'}}},
  load:    {label:'Yüklenme',    want:['exp'],             dose:{main:{sets:'5',reps:'3', rpe:'8.5',rest:'3dk'}, hold:{sets:'3',duration:'40sn',rpe:'7',rest:'60sn'},exp:{sets:'5',reps:'3',rpe:'8',rest:'3dk'},  acc:{sets:'3',reps:'10',rpe:'7',rest:'60sn'}}},
};
const caNum=v=>{const n=Number(v);return (v===''||v==null||isNaN(n))?null:n;};
/* Two sides of the same test as a percentage difference of the bigger one. Under 3% is
   measurement noise on any of these, so it is not reported as anything. */
function caAsym(r,l){
  const a=caNum(r),b=caNum(l);
  if(a==null||b==null||a<=0||b<=0)return null;
  const d=Math.abs(a-b)/Math.max(a,b)*100;
  return d<3?null:{pct:Math.round(d),strong:a>=b?'R':'L',weak:a>=b?'L':'R'};
}
/* ---- How hard today can be, for one athlete --------------------------------
   Each signal that says "not today" adds to the same counter, so one bad number
   nudges the day and three of them change it outright. Four rungs, worst first:
   recovery → maintain → develop → load — CA_INTENT carries their words and their
   doses. Read both by the assistant coach's exercise picker and by the Team
   Insights flag list, which is what makes "tier stepped down" mean the same thing
   in the box that writes the session and in the board that flags the athlete.
   `pre` lets a caller that has already read the athlete hand the inputs in rather
   than paying for them a second time. */
function athLoadTier(ath,ref,pre){
  const p=pre||{};
  const rd=p.rd||athReadiness(ath,ref);
  const well=p.well||athWellnessSnap(ath,ref);
  const prev=p.prev||athPrevDay(ath,ref);
  const acwr=p.acwr!=null?p.acwr:athACWR(ath,ref);
  const flags=p.flags||[...new Set([...athPainReports(ath,ref).map(x=>x.tag),
    ...(((ath&&ath.constraintTags)||[]).filter(Boolean))])];
  let stress=0;
  if(rd.score!=null&&rd.score<2.5)stress+=2;else if(rd.score!=null&&rd.score<3.2)stress+=1;
  if(acwr>1.5)stress+=2;else if(acwr>1.3)stress+=1;
  if(prev.rpe!=null&&prev.rpe>=8.5)stress+=1;
  if(well.soreness!=null&&well.soreness<=2)stress+=1;
  if(well.fatigue!=null&&well.fatigue<=2)stress+=1;
  if(flags.length)stress+=1;
  const intent=stress>=4?'recovery':stress>=2?'maintain'
    :(acwr>0&&acwr<0.8&&rd.score!=null&&rd.score>=3.9)?'load':'develop';
  return{intent,stress,rd,well,prev,acwr,flags};
}
/* Everything the six picks are made of, read once. Kept separate from the picking so the
   box can show the coach the same evidence the choice was made on. */
function caReadAthlete(ath,ref){
  const rd=athReadiness(ath,ref),well=athWellnessSnap(ath,ref),prev=athPrevDay(ath,ref);
  const pains=athPainReports(ath,ref).map(p=>p.tag);
  const note=athPainNote(ath,ref);
  const acwr=athACWR(ath,ref);
  const tests=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=tests[tests.length-1]||null;
  const needs={},drivers=[];
  const need=(k,why)=>{if(!needs[k])needs[k]=why;};
  /* Long-standing tags the coach ticked on the card count alongside what the athlete
     reported this morning: a knee that is being managed is a knee to work around. */
  const flags=[...new Set([...pains,...((ath.constraintTags||[]).filter(Boolean))])];
  flags.forEach(f=>{
    drivers.push(`${ctLabel(f)} ağrısı — bölgeyi yükleyen seçenekler elendi`);
    if(f==='ankle')need('ankle','ayak bileği şikâyeti');
    if(f==='hamstring')need('ham','hamstring şikâyeti');
    if(f==='shoulder')need('shoulder-health','omuz şikâyeti');
    if(f==='back')need('core-brace','bel şikâyeti');
    if(f==='hip')need('groin','kalça/kasık şikâyeti');
  });
  let asym=null;
  if(t){
    const pairs=[
      ['Lateral CMJ',caAsym(t.lateralCmj&&t.lateralCmj.right,t.lateralCmj&&t.lateralCmj.left)],
      ['Y Balance',  caAsym(ybCalc(t.yBalance).compR,ybCalc(t.yBalance).compL)],
      ['Uyluk çevresi',caAsym(t.circ&&t.circ.thighRight,t.circ&&t.circ.thighLeft)],
      ['Baldır çevresi',caAsym(t.circ&&t.circ.calfRight,t.circ&&t.circ.calfLeft)],
    ].filter(([,v])=>v&&v.pct>=10);
    if(pairs.length){
      const[nm,v]=pairs.sort((a,b)=>b[1].pct-a[1].pct)[0];
      asym={test:nm,...v};
      need('asym',`${nm} sağ/sol farkı %${v.pct}`);
      drivers.push(`${nm} sağ/sol farkı %${v.pct} (zayıf taraf: ${v.weak==='L'?'sol':'sağ'}) — tek taraflı çalışma`);
    }
    const df=[caNum(t.ankleDF&&t.ankleDF.right),caNum(t.ankleDF&&t.ankleDF.left)].filter(v=>v!=null);
    if(df.length&&Math.min(...df)<35){need('ankle',`ayak bileği dorsifleksiyon ${Math.min(...df)}°`);
      drivers.push(`Ayak bileği dorsifleksiyonu ${Math.min(...df)}° (<35°) — mobilite/baldır işi`);}
    const as=[caNum(t.aslr&&t.aslr.right),caNum(t.aslr&&t.aslr.left)].filter(v=>v!=null);
    if(as.length&&Math.min(...as)<=1){need('ham',`ASLR ${Math.min(...as)}/3`);
      drivers.push(`ASLR ${Math.min(...as)}/3 — arka zincir uzunluğu/kontrolü`);}
    const ohs=caNum(t.ohs&&t.ohs.score);
    if(ohs!=null&&ohs<=1){need('core-brace',`overhead squat ${ohs}/3`);need('tspine',`overhead squat ${ohs}/3`);
      need('tech',`overhead squat ${ohs}/3`);
      drivers.push(`Overhead squat ${ohs}/3 — destekli/teknik varyasyon, gövde kontrolü`);}
    const h=caNum(t.height),w=caNum(t.weight),bf=caNum(t.bodyFat);
    if(bf!=null&&bf>=20){need('bw',`vücut yağı %${bf}`);drivers.push(`Vücut yağı %${bf} — eklem yükü düşük varyasyonlar`);}
    if(h&&w){const bmi=w/((h/100)**2);if(bmi>=27)drivers.push(`BMI ${bmi.toFixed(1)} — sıçrama hacmi düşük tutuldu`);}
  }else drivers.push('Test kaydı yok — seçim check-in, yük ve pozisyona göre yapıldı');
  CA_POS_BIAS[posGroupOf(ath.position)].forEach(k=>need(k,`pozisyon: ${posGroupLabel(posGroupOf(ath.position))}`));
  // How hard today can be — the shared ladder, so this box and the Team Insights
  // flag list step an athlete down for exactly the same reasons.
  const{intent}=athLoadTier(ath,ref,{rd,well,prev,acwr,flags});
  if(rd.score!=null)drivers.unshift(`Hazırlık ${rd.score}/5${rd.src==='srpe'?' (sRPE tahmini)':''}`);
  else drivers.unshift('Check-in yok — hazırlık okunamadı');
  if(acwr>0)drivers.push(`ACWR ${acwr.toFixed(2)} — ${acwrZoneOf(acwr).t}`);
  if(prev.rpe!=null)drivers.push(`Dün RPE ${prev.rpe}${prev.load>0?` · ${prev.load} AU`:''}`);
  if(!needs.power&&intent==='load')need('power','ACWR düşük, hazırlık iyi');
  const lv=Number(String(ath.levelTag||'').replace(/\D/g,''))||(caNum(ath.trainingAge)>=3?3:caNum(ath.trainingAge)>=1?2:2);
  return{rd,well,prev,acwr,flags,note,needs,drivers,intent,asym,level:lv,test:t,
    pos:posGroupOf(ath.position)};
}
/* The pick itself: drop what the reported pain loads, then score what is left on the needs
   it answers and how well it fits the day. Deterministic — same athlete, same day, same
   `round`, same six exercises, so the coach can go back to the box and find it saying what
   it said.

   `round` is what the refresh button turns. The candidates are ranked once and the round
   walks down that ranking, so pressing refresh does not re-roll the pick at random — it
   hands over the next best exercise for THIS athlete, still filtered by the pain that was
   reported and still scored on the needs their tests showed. Past the end of the ranking
   it wraps around to the first, so refresh never runs out. */
function caPick(slotId,rx,round){
  const pool=CA_POOL[slotId]||[];
  const want=CA_INTENT[rx.intent].want;
  const safe=pool.filter(c=>!c.hits.some(h=>rx.flags.includes(h)));
  const list=safe.length?safe:pool;   // everything hurts: fall back rather than show nothing
  // A need only counts for the slots it is about (see CA_NEED_SLOTS); one with no entry
  // there — technique, body weight, glute work — speaks everywhere.
  const asks=k=>{const sc=CA_NEED_SLOTS[k];return rx.needs[k]&&(!sc||sc.includes(slotId))?rx.needs[k]:null;};
  const ranked=list.map((c,i)=>{
    let s=c.base?2.5:0;               // the slot's staple lift, when nothing else is asked for
    const why=[];
    c.fix.forEach(f=>{const w=asks(f);if(w){s+=3;why.push(w);}});
    c.t.forEach(tr=>{if(want.includes(tr))s+=2;const w=asks(tr);if(w){s+=2;why.push(w);}});
    if(c.t.includes('uni')&&rx.asym&&(CA_NEED_SLOTS.asym.includes(slotId)))s+=2;
    s-=Math.abs(c.lv-rx.level)*(c.lv>rx.level?2:1);
    s-=i*0.01;                        // stable order, never a coin toss
    return{c,s,why};
  }).sort((a,b)=>b.s-a.s);
  if(!ranked.length)return null;
  const n=ranked.length;
  const at=((Number(round)||0)%n+n)%n;
  const{c:best,why}=ranked[at];
  const bestWhy=[...why];
  if(!bestWhy.length){
    bestWhy.push(safe.length<pool.length
      ?`${rx.flags.map(ctLabel).join(', ')} bölgesini yüklemiyor`
      :`${CA_INTENT[rx.intent].label} günü için uygun yüklenme`);
  }
  const dose=CA_INTENT[rx.intent].dose;
  /* A hold is prescribed in seconds and a throw in a handful of crisp reps — neither is
     the main lift's set×rep, so each gets its own line of the dose table. */
  const d=c=>c.t.includes('iso')?dose.hold:c.t.includes('exp')?dose.exp:(slotId==='acc'||slotId==='core')?dose.acc:dose.main;
  return{slot:slotId,name:best.n,pattern:(CA_SLOTS.find(s=>s.id===slotId)||{}).pattern,plane:best.ex,
    ...{sets:'',reps:'',duration:'',rpe:'',rest:'',tempo:'',load:''},...d(best),...(best.tp?{tempo:best.tp}:{}),
    why:[...new Set(bestWhy)].slice(0,2).join(' · '),alts:n};
}
function caSuggest(ath,ref,round){
  const rx=caReadAthlete(ath,ref);
  return{...rx,round:Number(round)||0,items:CA_SLOTS.map(s=>caPick(s.id,rx,round)).filter(Boolean)};
}

/* The button beside Training Method, and the box it opens. Nothing here writes to the
   session: Copy puts one row on the clipboard and the slot's paste button is what puts it
   into the program. */
function CoachAssistant({ath,date}){
  const[open,setOpen]=useState(false);
  const[copied,setCopied]=useState('');
  /* Which round of suggestions is on screen. 0 is the assistant's first answer; every
     press of the refresh button steps it on and every slot hands over its next-best
     exercise for this athlete. A different athlete or a different day is a different
     question, so the count starts over. */
  const[round,setRound]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[open]);
  const day=date||fmt(today);
  useEffect(()=>{setRound(0);},[ath&&ath.id,day]);
  const s=useMemo(()=>open?caSuggest(ath,day,round):null,[open,ath,day,round]);
  const copy=it=>{copyExerciseToClipboard(it);setCopied(it.slot);setTimeout(()=>setCopied(''),1600);};
  const dose=it=>[it.sets&&it.duration?`${it.sets} × ${it.duration}`:(it.sets&&it.reps?`${it.sets} × ${it.reps}`:(it.duration||it.reps||'')),
    it.rpe?`RPE ${it.rpe}`:'',it.rest?L(`dinlenme ${it.rest}`,`rest ${it.rest}`):''].filter(Boolean).join(' · ');
  return(<div className="ca-wrap" ref={ref}>
    <button type="button" className={'ca-btn'+(open?' on':'')} onClick={()=>setOpen(o=>!o)}
      title={L(`${ath.name||'Sporcu'} bugün ne çalışmalı — test, antropometri, pozisyon, ağrı, wellness ve RPE verisinden`,
        `What ${ath.name||'this athlete'} should train today — off their test, anthropometric, position, pain, wellness and RPE data`)}>{L('Yrd. Antrenör','Ass. Coach')}</button>
    {open&&s&&<div className="ca-pop">
      <div className="ca-hd">
        <b>{ath.name||L('Sporcu','Athlete')} · {fd(day)}</b>
        {/* Refresh: the same reading of the athlete, the next set of exercises off it.
            The intent, the evidence and the pain filter do not move — only which
            exercise each slot is answered with. */}
        <button type="button" className="ca-rf" onClick={()=>setRound(r=>r+1)}
          title={L('Yenile — aynı okumadan, bu sporcuya uygun yeni egzersizler','Refresh — the same reading, the next set of exercises that suit this athlete')}>↻ {L('Yenile','Refresh')}</button>
        <span className={'ca-intent i-'+s.intent}>{CA_INTENT[s.intent].label}</span>
      </div>
      <div className="ca-why">{s.drivers.slice(0,4).join(' · ')}</div>
      {s.round>0&&<div className="ca-alt">{L(`${s.round+1}. öneri seti — aynı gerekçeler, sıradaki uygun egzersizler.`,`Suggestion set ${s.round+1} — the same reasoning, the next exercises that fit.`)}</div>}
      {s.note&&<div className="ca-pain">{s.note.quoted?`“${s.note.text}”`:s.note.text}</div>}
      <div className="ca-list">
        {s.items.map(it=><div key={it.slot} className="ca-it">
          <div className="ca-it-l">
            <span className="ca-slot">{(CA_SLOTS.find(x=>x.id===it.slot)||{}).label}</span>
            <span className="ca-nm">{it.name}</span>
            <span className="ca-dose">{dose(it)}{it.plane?` · ${it.plane}`:''}</span>
            <span className="ca-r">{it.why}</span>
          </div>
          <button type="button" className={'ca-cp'+(copied===it.slot?' ok':'')} onClick={()=>copy(it)}
            title={L('Bu egzersizi kopyala — sonra bir slotun yapıştır düğmesine bas','Copy this exercise — then press paste on a slot')}>{copied===it.slot?'Copied':'Copy'}</button>
        </div>)}
      </div>
      <div className="ca-ft">Öneri — hiçbir şey programa kendiliğinden yazılmaz. Copy'ye bas, sonra egzersiz satırındaki yapıştır düğmesini kullan.</div>
    </div>}
  </div>);
}

