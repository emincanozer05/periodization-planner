/* =========================================================
   CONSTANTS
   ========================================================= */
const SPORTS=['Basketball','Football (Soccer)','Volleyball','Handball','Tennis','Track & Field','Swimming','Rugby','Other'];
/* Periodization models. Each carries its explanation in both languages — shown in a
   small box when the pointer rests on the model in the Periodization Model panel. The
   names follow the app's language (tr / name).
   The list was eleven models and is five. A season saved with one of the six retired
   models is read as the nearest one kept (MODEL_LEGACY) rather than dropped to Linear. */
const MODELS=[
  {id:'linear',name:'Traditional / Linear Periodization',tr:'Geleneksel / Doğrusal Periodizasyon',d:[
    'Antrenman yükünün uzun dönem içerisinde sistematik ve genellikle kademeli şekilde değiştirildiği modeldir. Çoğunlukla başlangıçta daha yüksek hacim ve daha düşük yoğunluk kullanılır; zaman ilerledikçe hacim azaltılır ve yoğunluk artırılır. Genel fiziksel hazırlıktan kuvvet, power ve performansa doğru ilerleyen klasik bir yapı oluşturur.',
    'The model in which training load is changed systematically, and usually gradually, over a long period. It mostly starts with higher volume and lower intensity; as time goes on, volume is reduced and intensity raised. It forms the classic progression from general physical preparation towards strength, power and performance.']},
  {id:'block',name:'Block Periodization',tr:'Blok Periodizasyon',d:[
    'Belirli adaptasyonların sınırlı bir zaman diliminde yüksek öncelikle geliştirildiği ardışık bloklardan oluşur. Klasik yapıda Accumulation → Transmutation → Realization şeklinde ilerler. Bir blokta geliştirilen kapasite sonraki blokta daha spesifik bir performans özelliğine dönüştürülür. Özellikle belirli bir performans hedefinin önceliklendirildiği dönemlerde kullanılabilir.',
    'Made of consecutive blocks in which specific adaptations are developed with high priority over a limited time. The classic structure runs Accumulation → Transmutation → Realization. The capacity built in one block is turned into a more specific performance quality in the next. It can be used especially in periods where a particular performance goal is prioritised.']},
  {id:'undulating',name:'Undulating Periodization',tr:'Dalgalı Periodizasyon',d:[
    'Antrenman hacmi, yoğunluğu veya egzersiz odağının daha kısa zaman aralıklarında değiştirildiği periodizasyon modelidir. Uzun süre tek bir fiziksel özelliğe odaklanmak yerine farklı özellikler günler veya haftalar içerisinde dönüşümlü olarak çalıştırılabilir. Takım sporlarında sezon boyunca değişen ihtiyaçlara uyum sağlamak için kullanılabilir.',
    'The periodization model in which training volume, intensity or exercise focus changes over shorter time spans. Instead of focusing on one physical quality for a long time, different qualities can be trained in rotation across days or weeks. In team sports it can be used to adapt to needs that change through the season.']},
  {id:'hybrid',name:'Hybrid Periodization',tr:'Hibrit Periodizasyon',d:[
    'Tek bir periodizasyon modeline bağlı kalmak yerine birden fazla modelin programın farklı dönemlerinde veya aynı program içerisinde birleştirilmesidir. Örneğin preseason\'da Block Periodization, in-season\'da Undulating Periodization kullanılabilir. Uzun ve karmaşık takım sporları sezonlarında oldukça esnek bir yapı sağlar.',
    'Instead of sticking to a single periodization model, several models are combined in different periods of the program or within the same program. For example Block Periodization can be used in the preseason and Undulating Periodization in-season. It gives long, complex team-sport seasons a very flexible structure.']},
  {id:'auto',name:'Autoregulated / Flexible Periodization',tr:'Otoregülasyonlu / Esnek Periodizasyon',d:[
    'Önceden belirlenen antrenman planının sporcunun gerçek zamanlı veya günlük durumuna göre değiştirilmesine dayanır. Readiness, RPE, wellness, HRV, performans testleri veya önceki antrenman yükleri gibi bilgiler kullanılarak hacim, yoğunluk veya egzersiz seçimi düzenlenebilir. Aslında diğer periodizasyon modellerinin yerine geçmek zorunda değildir; Linear, Block, Undulating veya Vertical Integration gibi modellerin üzerine uygulanabilen bir yük yönetimi yaklaşımıdır.',
    'Based on adjusting the pre-set training plan to the athlete\'s real-time or daily state. Volume, intensity or exercise selection can be adjusted using information such as readiness, RPE, wellness, HRV, performance tests or previous training loads. It does not have to replace the other periodization models; it is a load-management approach that can be laid over models such as Linear, Block, Undulating or Vertical Integration.']}
];
/* Season phases. Each reads its dates off the macrocycle: the off-season is General
   Preparation, the preseason Specific Preparation, the postseason Transition. Competition
   splits in two — the playoffs are its closing stretch (the last 15%, or from three weeks
   before a fixture named like a playoff game), the rest is in-season. A phase can run its
   own periodization model; one left unset follows the season's model. */
const SEASON_PHASES=[
  {id:'off',    period:'gp',   c:'#3b6ef5',name:'Transition / Off-Season',tr:'Geçiş / Sezon Dışı'},
  {id:'pre',    period:'sp',   c:'#facc15',name:'Preseason',tr:'Sezon Öncesi'},
  {id:'in',     period:'comp', c:'#f43f5e',name:'In-Season',tr:'Sezon İçi'},
  {id:'playoff',period:'comp', c:'#a855f7',name:'Playoffs',tr:'Playoff'},
  {id:'post',   period:'trans',c:'#2dd4a7',name:'Postseason',tr:'Sezon Sonrası'},
];
const SEASON_PLAYOFF_RE=/playoff|play-off|final|çeyrek|yarı ?final|elemin|elimination|conference/i;
function seasonPhaseRanges(setup,periods){
  const P=id=>(periods||[]).find(p=>p.id===id)||null;
  const gp=P('gp'),sp=P('sp'),comp=P('comp'),trans=P('trans');
  const r=p=>p?{start:p.start,end:p.end}:null;
  let inR=null,poR=null;
  if(comp){
    let st=fmt(addD(parseD(comp.start),Math.ceil(Math.max(0,diffD(comp.start,comp.end))*.85)));
    const po=((setup&&setup.competitions)||[]).filter(c=>c&&c.date&&c.date>=comp.start&&c.date<=comp.end&&SEASON_PLAYOFF_RE.test(c.name||''))
      .map(c=>c.date).sort()[0];
    if(po){const s2=fmt(addD(parseD(po),-21));if(s2<st)st=s2;}
    if(st<comp.start)st=comp.start;
    poR={start:st,end:comp.end};
    if(st>comp.start)inR={start:comp.start,end:fmt(addD(parseD(st),-1))};
  }
  return{off:r(gp),pre:r(sp),in:inR,playoff:poR,post:r(trans)};
}
/* The season phase a date falls in; outside every range, the one its period maps to. */
function seasonPhaseAt(ranges,ds,periodId){
  const hit=SEASON_PHASES.find(ph=>{const x=ranges[ph.id];return x&&ds>=x.start&&ds<=x.end;});
  if(hit)return hit.id;
  const byP=SEASON_PHASES.find(ph=>ph.period===periodId);
  return byP?byP.id:'in';
}
/* Retired model → the kept model closest to it: Reverse Linear is still a linear
   progression; daily and weekly undulation, Conjugate and Vertical Integration all rotate
   or run qualities in parallel over short spans (Undulating); Horizontal Integration
   develops qualities one after another, block by block. */
const MODEL_LEGACY={reverse:'linear',dup:'undulating',wup:'undulating',conjugate:'undulating',vertical:'undulating',horizontal:'block'};
const modelId=id=>MODELS.some(m=>m.id===id)?id:(MODEL_LEGACY[id]||null);
const modelOf=id=>MODELS.find(m=>m.id===modelId(id))||null;
const modelLabel=m=>m?L(m.tr||m.name,m.name):'';
const phaseLabel=ph=>ph?L(ph.tr||ph.name,ph.name):'';
function phaseModel(setup,ph){
  const pm=(setup&&setup.phaseModels)||{};
  return modelId(pm[ph])||modelId(setup&&setup.model)||'linear';
}
const LOAD_TYPES=['Mechanical load','Metabolic load','Neuromuscular load','Cognitive/perceptual load'];
/* ---------------------------------------------------------------------------
   SESSION FOCUS — two stages, asked in the order a coach actually decides.

     1. Focus      what quality are we developing?      (Strength, Speed, …)
     2. Sub-Focus  which capacity inside it?            (Max Strength, Acceleration, …)

   How the session is trained is deliberately not a third stage here: the Training Method
   field sits right below this one with its own, fuller taxonomy, and asking it twice in
   two vocabularies only made the coach choose which answer counted.

   Each stage is a multi-select, and stage 2 only opens once stage 1 has an answer — a
   sub-focus means nothing without the focus it belongs to. Its options are the union of
   what the picked focuses offer, kept grouped under the focus they came from so the list
   still reads as an answer to "which capacity, inside which quality".

   The stage-1 values are the canonical ones — the load distribution, the template
   categories and every saved session key off them, so they never change. `sub` widens a
   session's description without touching those keys. */
const FOCUS_TREE=[
  {id:'Strength', tr:'Kuvvet', c:'#00ff7f',
   sub:['Foundational Strength','Maximal Strength','Hypertrophy','Strength Endurance','Eccentric Strength','Isometric Strength','Unilateral Strength','Core Strength']},
  {id:'Power', tr:'Güç', c:'#a3e635',
   sub:['Strength-Speed','Speed-Strength','Explosive Strength','Reactive Strength','Rate of Force Development','Ballistic Power']},
  {id:'Speed', tr:'Hız', c:'#c000ff',
   sub:['Acceleration','Max Velocity','Deceleration','Change of Direction','Reactive Agility','Speed Endurance','Sprint Technique']},
  {id:'Conditioning', tr:'Kondisyon', c:'#00ffd5',
   sub:['Aerobic Capacity','Aerobic Power','Anaerobic Capacity','Anaerobic Power','Repeated Sprint Ability','Lactate Tolerance','Tempo / Extensive']},
  {id:'Movement', tr:'Hareket', c:'#38bdf8',
   sub:['Mobility','Stability','Motor Control','Movement Quality','Landing Mechanics','Injury Prevention','Tendon Health','Balance & Proprioception']},
  {id:'Technical / Tactical', tr:'Teknik / Taktik', c:'#ff7c00',
   sub:['Individual Skill','Team Offense','Team Defense','Set Plays','Transition','Small-Sided Game','Scrimmage']},
  {id:'Recovery', tr:'Toparlanma', c:'#00bfff',
   sub:['Active Recovery','Regeneration','Soft Tissue','Breathing / Parasympathetic','Mobility Flow']},
  {id:'Return to Play', tr:'Sahaya Dönüş', c:'#2dd4a7',
   sub:['Reconditioning','Load Reintroduction','Return to Run','Return to Train','Return to Perform','Criteria-Based Progression']},
  {id:'Testing', tr:'Test', c:'#94a3b8',
   sub:['Anthropometry','Strength Testing','Power / Jump Testing','Speed Testing','Aerobic Testing','Movement Screen','Asymmetry Profiling']},
  /* A match is not a capacity trained inside a practice — it is what the practices are
     for, it is the day the season is cut around, and it is the one session type the
     Season screen keeps a list of. So it is a focus of its own rather than a sub-focus
     buried under Technical / Tactical, and ticking it writes the day into the season's
     Competition Dates. */
  {id:'Competition', tr:'Müsabaka', c:'#ef4444',
   sub:['League Match','Cup Match','Tournament','Friendly','Practice Game']},
];
const SESSION_FOCUS=FOCUS_TREE.map(f=>f.id);
const FOCUS_BY=FOCUS_TREE.reduce((m,f)=>(m[f.id]=f,m),{});
/* Every sub-focus, mapped back to the focus it belongs to — so a session that carries a
   sub-focus whose focus was later unticked can still be read, and so the picker can group
   a flat stored list back under its headings. */
const SUBFOCUS_OWNER=FOCUS_TREE.reduce((m,f)=>{f.sub.forEach(s=>{if(!m[s])m[s]=f.id;});return m;},{});
/* The focus list used to be one flat set of eighteen values; the tree's stage 1 is nine.
   Every retired value maps onto the focus that now owns it, plus — where the old value
   said something finer — the sub-focus it became, so nothing a coach wrote is lost.
   Read by sesFocus / sesSubFocus, never written: the editor only ever stores the new
   values. */
const FOCUS_L1_FROM_LEGACY={
  'Strength':'Strength','Hypertrophy':'Strength','Power':'Power','Plyometrics':'Power',
  'Speed':'Speed','Acceleration':'Speed','Deceleration':'Speed','Change of Direction':'Speed','Agility':'Speed',
  'Conditioning':'Conditioning','Mobility':'Movement','Stability':'Movement','Injury Prevention':'Movement',
  'Movement Quality':'Movement','COD / Agility':'Speed',
  'Technical':'Technical / Tactical','Tactical':'Technical / Tactical','Competition':'Competition',
  'Recovery':'Recovery','Assessment':'Testing','Return to Play':'Return to Play','Testing':'Testing',
};
const FOCUS_SUB_FROM_LEGACY={
  'Hypertrophy':'Hypertrophy','Plyometrics':'Reactive Strength','Acceleration':'Acceleration',
  'Deceleration':'Deceleration','Change of Direction':'Change of Direction','Agility':'Reactive Agility',
  'COD / Agility':'Change of Direction','Mobility':'Mobility','Stability':'Stability',
  'Injury Prevention':'Injury Prevention','Movement Quality':'Movement Quality',
  'Technical':'Individual Skill','Tactical':'Team Offense',
};
/* A match ticked in the session editor IS a fixture. The Season screen's Competition
   Dates list used to be typed a second time by hand, next to a calendar that already knew
   which days were matches; it is written from the calendar now. Every session whose focus
   is Competition owns one row, keyed by the session's id, so a match that is moved moves
   its row and a session that is deleted or re-focused takes its row with it. What the
   coach types INTO the row — venue, competition, score, a renamed event — survives every
   resync; only the date follows the session. */
const compRowsFromDays=days=>{
  const out=[];
  /* The day's KEY is where the calendar draws it, so that is the fixture's date. The copy
     of the date stored inside the day is only a fallback: a day object whose own `date`
     had drifted from its key put the game one day off from where the coach sees it, and
     every MD±n read off the fixture list was off with it. */
  Object.entries(days||{}).forEach(([k,d])=>{
    const date=/^\d{4}-\d{2}-\d{2}$/.test(k)?k:(d&&d.date);
    if(!d||!date)return;
    (d.sessions||[]).forEach(ses=>{
      if(!ses||!sesFocus(ses).includes('Competition'))return;
      out.push({srcId:String(ses.id||''),date,name:(ses.name||'').trim()||'Competition'});
    });
  });
  return out;
};
/* `hidden` lists the calendar rows the coach deleted from the fixture list: their session
   is still on the calendar, and without this the next resync would put them straight back. */
const syncCompetitions=(list,days,hidden)=>{
  const prev=Array.isArray(list)?list:[];
  const hide=new Set(Array.isArray(hidden)?hidden:[]);
  const byId={};prev.forEach(c=>{if(c&&c.srcId)byId[c.srcId]=c;});
  const auto=compRowsFromDays(days).filter(a=>a.srcId&&!hide.has(a.srcId)).map(a=>{
    const ex=byId[a.srcId];
    return ex?{...ex,date:a.date}:{...a};
  });
  return[...prev.filter(c=>c&&!c.srcId),...auto]
    .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
};
/* A team's name as a short tag — "Tofaş U18 A Maçı" → "TOF", "AE Spor Kulübü" → "AE",
   "FSA" → "FSA". A word already written in capitals is taken as the club's own tag;
   otherwise the first word that names the club gives its first three letters. Words that
   only say what the row is ("maçı", "spor", "kulübü", an age group) are skipped. */
const COMP_ABBR_SKIP=new Set(['maç','maçı','mac','maci','karşılaşması','spor','kulübü','kulubu','sk','jk','gsk','bk',
  'vs','vs.','-','–','ile','game','match','the','fc','club','u','a','b']);
const compAbbr=name=>{
  const words=String(name||'').replace(/[()\[\],.]/g,' ').split(/\s+/).filter(Boolean);
  const sig=words.filter(w=>!COMP_ABBR_SKIP.has(w.toLocaleLowerCase('tr'))&&!/^u\d{1,2}$/i.test(w)&&!/^\d+$/.test(w));
  if(!sig.length)return'';
  const caps=sig.find(w=>w.length>=2&&w.length<=4&&w===w.toLocaleUpperCase('tr')&&/\p{L}/u.test(w));
  if(caps)return caps;
  return sig[0].slice(0,3).toLocaleUpperCase('tr');
};
/* The result, worked out from the score: W/L in English, G/M in Turkish, D/B on a draw. */
const compResult=c=>{
  const f=String(c&&c.scoreFor!=null?c.scoreFor:'').trim(),a=String(c&&c.scoreAgainst!=null?c.scoreAgainst:'').trim();
  if(f===''||a==='')return null;
  const nf=Number(f.replace(',','.')),na=Number(a.replace(',','.'));
  if(!isFinite(nf)||!isFinite(na))return null;
  if(nf>na)return{k:'w',t:L('G','W'),title:L('Galibiyet','Win')};
  if(nf<na)return{k:'l',t:L('M','L'),title:L('Mağlubiyet','Loss')};
  return{k:'d',t:L('B','D'),title:L('Beraberlik','Draw')};
};
/* Matches already played: a fixture whose day has passed, or one a score was written on.
   A season's fixture list holds what is still to come as well, and "how many did we play"
   is not the length of that list. */
const compPlayedCount=list=>{
  const tk=fmt(today);
  return(Array.isArray(list)?list:[]).filter(c=>c&&((c.date&&c.date<=tk)
    ||String(c.scoreFor||'').trim()!==''||String(c.scoreAgainst||'').trim()!=='')).length;
};
/* Old single-value "purpose" values → new multi-select session focus values */
const LEGACY_FOCUS_MAP={'Fundamental Strength':['Strength'],'Maximal Strength':['Strength'],'Hypertrophy':['Hypertrophy'],'Power':['Power'],'Speed & Agility':['Speed','Agility'],'Aerobic Endurance':['Conditioning'],'Anaerobic Capacity':['Conditioning'],'Technical':['Technical'],'Ball Practice':['Technical'],'Team Practice':['Technical'],'Game Day':['Competition'],'Recovery':['Recovery'],'Mobility':['Mobility']};
const uniq=a=>[...new Set(a)];
/* The raw focus list as it was stored — new values, retired values, or nothing at all
   (in which case the legacy single-value `purpose` string stands in for it). */
const sesFocusRaw=s=>{
  if(Array.isArray(s?.focus))return s.focus;
  const p=(s?.purpose||'').trim();if(!p)return[];
  if(LEGACY_FOCUS_MAP[p])return LEGACY_FOCUS_MAP[p];
  return p.split(',').map(x=>x.trim()).filter(Boolean);
};
/* Session focus (stage 1) for a session or template session — always canonical values,
   whatever vocabulary the session was written in. */
const sesFocus=s=>uniq(sesFocusRaw(s).map(f=>FOCUS_BY[f]?f:FOCUS_L1_FROM_LEGACY[f]).filter(Boolean));
/* A focus value in the coach's own language — the tree carries the Turkish for every
   stage-1 quality, so "Strength" reads "Kuvvet" on a Turkish screen and stays "Strength"
   on an English one. The stored value never changes; only what is shown does. */
const focusLabel=f=>L(FOCUS_BY[f]?.tr||f,f);
/* Sub-focus (stage 2). Stored on the session as `sub: []`; a session written before the
   tree existed derives one from whichever retired focus values named a capacity. */
const sesSubFocus=s=>{
  if(Array.isArray(s?.sub))return s.sub.filter(x=>SUBFOCUS_OWNER[x]);
  return uniq(sesFocusRaw(s).map(f=>FOCUS_SUB_FROM_LEGACY[f]).filter(Boolean));
};
/* What the whole answer reads as on one line — the printed sheet's focus line, and
   anywhere else a session has to say what it trains. Only the SESSION FOCUS itself: the
   sub-focuses are the fine print of the answer and turned the sheet's Purpose line into
   a five-item list that buried the one word the coach was reading it for. They stay in
   the editor's panel, where there is room to read them. HOW it is trained is not part of
   it either: that is the Training Method box further down the panel, its own field with
   its own taxonomy (`methods`). */
const sesFocusLine=s=>sesFocus(s).join(', ');
/* Just the goals, in the coach's language — what a calendar card has room to say. The
   sub-focuses are the fine print of the answer and turned a card into five lines of text;
   they stay in the panel and on the printed sheet, where there is room to read them. A
   session with no goal the tree recognises falls back to whatever its `purpose` says, so
   free text a coach typed is still shown rather than blanked. */
const sesGoalLine=s=>sesFocus(s).map(focusLabel).join(', ')||(s?.purpose||'');
/* Training methods — the means used to deliver the session focus. Grouped the way the
   S&C literature does (Zatsiorsky/Verkhoshansky strength means, Buchheit/Laursen
   conditioning formats, sprint & mobility means) so a coach can tag *how* a session was
   trained, not just what it targeted. Stored on the session as `methods: []`. */
const TRAINING_METHODS=[
  ['Strength & Resistance',['Maximal Effort Method','Repeated Effort Method','Dynamic Effort Method','Velocity-Based Training','Cluster Sets','Eccentric Overload','Accentuated Eccentric Loading','Isometric Training','Accommodating Resistance (Bands / Chains)','Flywheel / Isoinertial Training','Blood Flow Restriction','Circuit Training','Supersets / Paired Sets','Drop Sets','Tempo / Time Under Tension','Unilateral Training','Machine-Based Resistance']],
  ['Power & Explosive',['Olympic Lifting Derivatives','Ballistic Training','Plyometric Training','Shock Method (Depth Jumps)','Medicine Ball Throws','Complex Training','Contrast Training','French Contrast','Post-Activation Potentiation (PAP/PAPE)','Jump Squats / Loaded Jumps']],
  ['Speed & Agility',['Acceleration Sprints','Maximal Velocity Sprints','Flying Sprints','Resisted Sprints (Sled / Band)','Assisted (Overspeed) Sprints','Change-of-Direction Drills','Reactive / Open-Skill Agility','Deceleration & Landing Mechanics','Sprint Technique Drills','Speed Endurance']],
  ['Conditioning & Energy System',['Continuous Steady-State','Long Slow Distance','Fartlek','Extensive Intervals','Intensive Intervals','High-Intensity Interval Training (HIIT)','Sprint Interval Training (SIT)','Repeated Sprint Ability (RSA)','Repeated High-Intensity Efforts','Tempo Runs','Threshold / Lactate Training','30-15 Intermittent Fitness','Small-Sided Games','Game-Based Conditioning']],
  ['Neuromuscular & Prehab',['Core / Anti-Movement Training','Balance & Proprioception Training','Nordic / Eccentric Hamstring','Copenhagen Adduction','Tendon Loading (Heavy Slow Resistance)','Movement Skill / Motor Learning','Coordination & Rhythm Drills']],
  ['Mobility & Recovery',['Dynamic Stretching','Static Stretching','PNF Stretching','Joint Mobility / CARs','Self-Myofascial Release','Active Recovery','Pool / Hydrotherapy Recovery','Breathing & Parasympathetic Work']],
];
const TRAINING_METHOD_LIST=TRAINING_METHODS.reduce((a,g)=>a.concat(g[1]),[]);
const sesMethods=s=>Array.isArray(s?.methods)?s.methods:[];
/* Which part of the body a strength & power session trains — plus Corrective for the
   remedial work that isn't aimed at a region. Single value, stored on the session as
   `region`. */
const SESSION_REGIONS=['Upper Body Strength&Power','Lower Body Strength&Power','Full Body Strength&Power','Corrective'];
/* Strength and Power used to be a separate pick per region (six options); they are one
   option per region now, so old sessions map onto the new value instead of losing it. */
const LEGACY_REGION_MAP={'Upper Body Strength':'Upper Body Strength&Power','Upper Body Power':'Upper Body Strength&Power',
  'Lower Body Strength':'Lower Body Strength&Power','Lower Body Power':'Lower Body Strength&Power',
  'Full Body Strength':'Full Body Strength&Power','Full Body Power':'Full Body Strength&Power'};
const sesRegion=s=>{const r=(s?.region||'').trim();return SESSION_REGIONS.includes(r)?r:(LEGACY_REGION_MAP[r]||'');};
/* The intensity target the coach is planning FOR the session — distinct from `sRPE`,
   which is the actual/logged load used everywhere else for AU and monitoring. Stored as
   one center value (a whole 1-10 point); the scale always shows a two-point band around it
   (center±1) since coaches speak of session intensity as a range ("RPE 6-8"), not a single
   number. Defaults to 7 (⇒ 6-8) so the gauge — and the printed program — always has a
   sensible target even before the coach has touched it. Whole points only: the zone bands
   below break on whole numbers (1-3 / 4-6 / 7-9 / 10), so a stored 7.5 from the half-step
   era rounds onto the scale rather than sitting between two zones. */
const sesRpeTarget=s=>{const v=Math.round(Number(s?.rpeTarget));return(v>=1&&v<=10)?v:7;};
const sesRpeRange=s=>{const v=sesRpeTarget(s);return[Math.max(1,v-1),Math.min(10,v+1)];};
/* Position along the 1-10 scale as a percentage, shared by the editor's draggable gauge
   and the static one drawn onto the printed program, so a coach never sees two different
   scales for the same number. */
const rpePct=v=>((Math.max(1,Math.min(10,Number(v)||1))-1)/9)*100;
/* What a target FEELS like, in four bands, with the colour that stands for each. One
   table drives the editor's gauge and the printed program, so a session that reads
   "hard, orange" on screen reads hard and orange on the page. `soft`/`ring` are the same
   hue at chip and halo strength, written out rather than mixed at runtime so the print
   sheet — which gets plain inline styles — can use them too; `pc` is the print twin of
   `c`, darkened because a colour picked to carry on a near-black panel goes weak on
   white paper. */
const RPE_ZONES=[
  {max:3, c:'#4ade80',pc:'#16a34a',soft:'rgba(74,222,128,.13)',ring:'rgba(74,222,128,.30)',tr:'Kolay',en:'Easy'},
  {max:6, c:'#eab308',pc:'#e0a106',soft:'rgba(234,179,8,.13)', ring:'rgba(234,179,8,.30)', tr:'Orta', en:'Moderate'},
  {max:9, c:'#fb923c',pc:'#ea580c',soft:'rgba(251,146,60,.13)',ring:'rgba(251,146,60,.30)',tr:'Zor',  en:'Hard'},
  {max:10, c:'#f05252',pc:'#dc2626',soft:'rgba(240,82,82,.13)', ring:'rgba(240,82,82,.30)', tr:'Maks', en:'Max'}];
const rpeZone=v=>RPE_ZONES.find(z=>(Number(v)||0)<=z.max)||RPE_ZONES[RPE_ZONES.length-1];
/* The same four bands as stretches of the rail, so the gauge can tint the scale it is
   dragged along instead of only naming the band after the fact. A band owns the rail from
   half a point below its first number to half a point above its last, which is where the
   colour would flip anyway — so 4-6 "Orta" starts at 3.5 and ends at 6.5 — and the two
   ends are pinned flush to 1 and 10 so the tint reaches the rail's caps. */
const RPE_ZONE_SPANS=RPE_ZONES.map((z,i)=>({
  c:z.c,
  a:rpePct(i?RPE_ZONES[i-1].max+.5:1),
  b:rpePct(i===RPE_ZONES.length-1?10:z.max+.5)}));
const WEEK_FOCUS=['General','Base + aerobic','Sport-specific','Maintain & peak','Active recovery','Accumulation','Transmutation','Realization','Hi-volume wave','Hi-intensity wave','Max-effort','Dynamic-effort','Deload','Peak',
  'Intensity-first','Mixed daily focus','Integrated','Readiness-guided','Aerobic emphasis','Strength emphasis','Power emphasis','Speed emphasis'];
/* Every week focus carries its own load profile. Weekly Load Targets sets volume and
   intensity from this table when the focus changes, so the focus dropdown is the only
   control a coach needs. Values follow the per-period/per-model defaults in defWeek().
   A focus outside this table (e.g. an auto-generated "Taper 5d") keeps its own numbers. */
const FOCUS_LOAD={
  'General':{v:70,i:70},'Base + aerobic':{v:85,i:55},'Sport-specific':{v:75,i:75},
  'Maintain & peak':{v:55,i:85},'Active recovery':{v:35,i:40},'Accumulation':{v:88,i:58},
  'Transmutation':{v:75,i:72},'Realization':{v:60,i:88},'Hi-volume wave':{v:85,i:60},
  'Hi-intensity wave':{v:62,i:85},'Max-effort':{v:70,i:88},'Dynamic-effort':{v:70,i:78},
  'Deload':{v:45,i:50},'Peak':{v:50,i:92},
  'Intensity-first':{v:60,i:85},'Mixed daily focus':{v:68,i:78},'Integrated':{v:67,i:77},'Readiness-guided':{v:70,i:70},
  'Aerobic emphasis':{v:85,i:55},'Strength emphasis':{v:75,i:75},'Power emphasis':{v:65,i:82},'Speed emphasis':{v:58,i:88}};
const BLOCK_NAMES=['Preparation','Strength & Power','Speed','Agility','Endurance','Core','Mobility & Flexibility','Coordination & Balance','Cool-Down'];
/* International dialling codes for the athlete's mobile number. Turkey leads because that
   is where the roster is, then the countries a youth team actually travels to and the ones
   the diaspora calls home; the rest is alphabetical. The number is stored as the code and
   the local part separately (`phoneCode` + `phone`) and read back joined, so a coach who
   already typed a bare local number keeps it and simply gains a +90 in front. */
const DIAL_CODES=[
  {c:'TR',d:'+90',n:'Türkiye'},{c:'DE',d:'+49',n:'Deutschland'},{c:'NL',d:'+31',n:'Nederland'},
  {c:'GB',d:'+44',n:'United Kingdom'},{c:'US',d:'+1',n:'USA / Canada'},{c:'FR',d:'+33',n:'France'},
  {c:'ES',d:'+34',n:'España'},{c:'IT',d:'+39',n:'Italia'},{c:'GR',d:'+30',n:'Ελλάδα'},
  {c:'RS',d:'+381',n:'Srbija'},{c:'BA',d:'+387',n:'Bosna i Hercegovina'},{c:'HR',d:'+385',n:'Hrvatska'},
  {c:'SI',d:'+386',n:'Slovenija'},{c:'ME',d:'+382',n:'Crna Gora'},{c:'MK',d:'+389',n:'Severna Makedonija'},
  {c:'BG',d:'+359',n:'България'},{c:'RO',d:'+40',n:'România'},{c:'AL',d:'+355',n:'Shqipëri'},
  {c:'AT',d:'+43',n:'Österreich'},{c:'BE',d:'+32',n:'Belgique'},{c:'CH',d:'+41',n:'Schweiz'},
  {c:'CZ',d:'+420',n:'Česko'},{c:'DK',d:'+45',n:'Danmark'},{c:'FI',d:'+358',n:'Suomi'},
  {c:'HU',d:'+36',n:'Magyarország'},{c:'IE',d:'+353',n:'Ireland'},{c:'IL',d:'+972',n:'ישראל'},
  {c:'LT',d:'+370',n:'Lietuva'},{c:'LV',d:'+371',n:'Latvija'},{c:'EE',d:'+372',n:'Eesti'},
  {c:'NO',d:'+47',n:'Norge'},{c:'PL',d:'+48',n:'Polska'},{c:'PT',d:'+351',n:'Portugal'},
  {c:'SE',d:'+46',n:'Sverige'},{c:'SK',d:'+421',n:'Slovensko'},{c:'UA',d:'+380',n:'Україна'},
  {c:'RU',d:'+7',n:'Россия'},{c:'GE',d:'+995',n:'საქართველო'},{c:'AZ',d:'+994',n:'Azərbaycan'},
  {c:'AU',d:'+61',n:'Australia'},{c:'BR',d:'+55',n:'Brasil'},{c:'AR',d:'+54',n:'Argentina'},
  {c:'CN',d:'+86',n:'中国'},{c:'JP',d:'+81',n:'日本'},{c:'KR',d:'+82',n:'대한민국'},
  {c:'IN',d:'+91',n:'India'},{c:'AE',d:'+971',n:'الإمارات'},{c:'SA',d:'+966',n:'السعودية'},
  {c:'QA',d:'+974',n:'قطر'},{c:'EG',d:'+20',n:'مصر'},{c:'MA',d:'+212',n:'المغرب'},
  {c:'TN',d:'+216',n:'تونس'},{c:'ZA',d:'+27',n:'South Africa'},{c:'NG',d:'+234',n:'Nigeria'},
  {c:'SN',d:'+221',n:'Sénégal'},{c:'MX',d:'+52',n:'México'},{c:'CL',d:'+56',n:'Chile'},
  {c:'NZ',d:'+64',n:'New Zealand'},
];
const DEFAULT_DIAL='+90';
// Whatever is in the two fields, joined for display/export. Empty local part → empty string,
// because "+90" on its own is not a phone number anyone can call.
const fullPhone=a=>{const n=String((a&&a.phone)||'').trim();return n?`${(a&&a.phoneCode)||DEFAULT_DIAL} ${n}`:'';};
// Keep only what a dial pad can send: digits, and the spaces/dashes people type as grouping.
const cleanPhone=v=>String(v||'').replace(/[^\d\s\-()]/g,'').replace(/\s{2,}/g,' ').slice(0,24);
/* ---- The bench, as a club organises it -----------------------------------
   Five categories, in the order a team sheet lists them: the head coach, the coaches
   who work to their plan, the performance staff who own the physical side, the medical
   staff, and the individual coaches who take one athlete at a time. Each carries the
   singular of its own name, because the button in the section says "+ Add a physio",
   not "+ Add staff" — and its own colour, so five sections down a page stay apart at a
   glance. Nothing is capped: a club with two head coaches is a club that has two. */
const STAFF_ROLES=[
  {id:'head',       tr:'Baş Antrenör',            en:'Head Coach',
   str:'baş antrenör',      sen:'head coach',        c:'#f59e0b', bg:'rgba(245,158,11,.12)'},
  {id:'assistant',  tr:'Yardımcı Antrenörler',    en:'Assistant Coaches',
   str:'yardımcı antrenör', sen:'assistant coach',   c:'#0094ff', bg:'rgba(0,148,255,.12)'},
  {id:'performance',tr:'Performans Antrenörleri', en:'Performance Coaches',
   str:'performans antrenörü',sen:'performance coach',c:'#10b981', bg:'rgba(16,185,129,.12)'},
  {id:'physio',     tr:'Fizyoterapistler',        en:'Physiotherapists',
   str:'fizyoterapist',     sen:'physiotherapist',   c:'#ec4899', bg:'rgba(236,72,153,.12)'},
  {id:'individual', tr:'Bireysel Antrenörler',    en:'Individual Coaches',
   str:'bireysel antrenör', sen:'individual coach',  c:'#8b5cf6', bg:'rgba(139,92,246,.12)'},
];
const STAFF_ROLE_BY=STAFF_ROLES.reduce((m,r)=>(m[r.id]=r,m),{});
/* The singulars are stored lower-case because they read mid-sentence as often as they
   head a button; a Turkish locale upper-case is what puts one at the front of a label
   ("fizyoterapist ekle" → "Fizyoterapist ekle") without turning an i into an I. */
const capTR=x=>x?x.charAt(0).toLocaleUpperCase('tr-TR')+x.slice(1):x;
/* A staff row, whatever shape it arrived in: an unknown role falls back to the first
   category rather than disappearing off a page that only draws the five it knows.

   `athleteIds` only means anything for an individual coach — the other four roles work
   across the whole squad, so who they cover is the roster itself and the field stays
   empty for them. It decides one thing: which athletes' wellness alerts reach that
   person's phone. Rows saved before alerts existed simply carry an empty list.

   `alertToken` is the address of this person's notification link, once the coach has
   made one. It is kept on the row rather than looked up, so the roster can show at a
   glance who has been sent a link and who hasn't. */
const normStaff=m=>{
  const out={id:(m&&m.id)||uid(),role:(m&&STAFF_ROLE_BY[m.role])?m.role:STAFF_ROLES[0].id,
    name:(m&&m.name)||'',phone:(m&&m.phone)||'',phoneCode:(m&&m.phoneCode)||DEFAULT_DIAL,
    photo:(m&&m.photo)||null};
  /* BOŞ OLAN HİÇ YAZILMIYOR — ve bu bir süsleme değil, senkronizasyonun şartı.

     Bu iki alan kadroya sonradan eklendi. Her satıra boş birer varsayılan koyulduğunda
     şu oluyor: henüz güncellenmemiş bir cihazdaki eski kod bu alanları TANIMIYOR ve
     durumu yeniden kurarken atıyor, güncel cihaz ise her yüklemede geri ekliyor. İki
     taraf da karşıdakinin yazdığını "değişmiş" görüp üstüne yazıyor; kayıt turu hiç
     bitmiyor ve senkron göstergesi iki cihazda da sarıda kalıyor.

     Alan yalnızca gerçekten bir değer taşıdığında yazılınca, dokunulmamış bir kadro
     satırı eski ve yeni kodda BAYT BAYT aynı çıkıyor: yazılacak bir fark yok, tur
     hiç başlamıyor. Okuyan her yer zaten yokluğa dayanıklı (`m.athleteIds||[]`). */
  const ids=Array.isArray(m&&m.athleteIds)?m.athleteIds.filter(x=>typeof x==='string'):[];
  if(ids.length)out.athleteIds=ids;
  const tok=(m&&m.alertToken)||'';
  if(tok)out.alertToken=tok;
  return out;
};
/* The one role whose alerts are scoped athlete by athlete. Named here rather than
   compared inline, because the same rule has to hold in three places: the card that
   assigns athletes, the roster published for the server, and the server's own copy in
   functions/recipients.js. */
const INDIVIDUAL_ROLE='individual';
const POSITIONS={Basketball:['Guard','Forward','Center'],'Football (Soccer)':['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'],Volleyball:['Setter','Outside','Middle','Opposite','Libero'],default:['Player']};
/* Basketball rosters are kept on the three positions a coach actually programmes for.
   Records written before that carry the five-code set, so every read of a position —
   a label on a card, a group on a report, a filter on the roster — goes through
   posOf() first and an old PG reads as a Guard everywhere. */
const POS_ALIAS={PG:'Guard',SG:'Guard','SG/SF':'Forward',SF:'Forward','SF/PF':'Forward',PF:'Forward',C:'Center'};
const posOf=p=>POS_ALIAS[p]||p||'';
/* Which modifier the shortcut hint should name. Read once: it cannot change under a
   running tab, and a browser that hides the platform simply gets the Ctrl spelling. */
const IS_MAC=(()=>{try{return /Mac|iPhone|iPad|iPod/.test((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||'');}catch(e){return false;}})();
/* Written in the focus tree's own vocabulary — focus, then the capacity inside it — so a
   preset drops into the session editor with stages 1 and 2 already answered and the
   method question open, rather than as a value the editor has to translate on read. */
/* `tr` is the button's Turkish label and `trName` the Turkish title the new session gets;
   the focus/sub/purpose values stay in the focus tree's own (English) vocabulary. */
const SPRESETS=[
  {name:'Strength & Power',tr:'Kuvvet & Güç',trName:'Kuvvet & Güç',d:{name:'Strength & Power',time:'09:00',loadType:'Mechanical load',purpose:'Strength, Power, Maximal Strength, Explosive Strength',focus:['Strength','Power'],sub:['Maximal Strength','Explosive Strength'],duration:75,bl:[]}},
  {name:'Speed & Agility',tr:'Sürat & Çeviklik',trName:'Sürat & Çeviklik',d:{name:'Speed & Agility',time:'08:30',loadType:'Neuromuscular load',purpose:'Speed, Acceleration, Change of Direction, Reactive Agility',focus:['Speed'],sub:['Acceleration','Change of Direction','Reactive Agility'],duration:45,bl:[]}},
  {name:'Conditioning',tr:'Kondisyon',trName:'Kondisyon',d:{name:'Conditioning',time:'08:00',loadType:'Metabolic load',purpose:'Conditioning, Aerobic Capacity',focus:['Conditioning'],sub:['Aerobic Capacity'],duration:45,bl:[]}},
  {name:'Recovery',tr:'Toparlanma',trName:'Toparlanma Seansı',d:{name:'Recovery Session',time:'10:00',loadType:'Metabolic load',purpose:'Recovery, Active Recovery',focus:['Recovery'],sub:['Active Recovery'],duration:30,bl:[]}},
  {name:'Team Practice',tr:'Takım Antrenmanı',trName:'Takım Antrenmanı',d:{name:'Team Practice',time:'17:00',loadType:'Cognitive/perceptual load',purpose:'Technical / Tactical, Team Offense, Team Defense',focus:['Technical / Tactical'],sub:['Team Offense','Team Defense'],duration:90,bl:[]}},
  {name:'Match',tr:'Maç',trName:'Maç Günü',d:{name:'Match Day',time:'19:00',loadType:'Cognitive/perceptual load',purpose:'Competition, League Match',focus:['Competition'],sub:['League Match'],duration:90,bl:[]}},
  {name:'Testing',tr:'Test',trName:'Test',d:{name:'Testing',time:'09:00',loadType:'Neuromuscular load',purpose:'Testing',focus:['Testing'],sub:[],duration:60,bl:[]}},
];
/* A preset's label and the session it adds, in the language the app is showing. */
const spLabel=p=>L(p.tr||p.name,p.name);
const spData=p=>({...p.d,name:L(p.trName||p.d.name,p.d.name)});
/* Short weekday and month names, read in the language the app is showing at the moment
   they are read — not frozen in English when the script loads. Every calendar header,
   tooltip and printout that indexes DN[i] / MN[m] follows the TR/EN switch through this,
   and output that must stay English (the athlete JSON) already runs inside diInEnglish. */
const _DN_EN_S=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],_DN_TR_S=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const _MN_EN_S=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  _MN_TR_S=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const _langList=(en,tr)=>new Proxy(en,{get:(t,k)=>{
  let tr0=false;try{tr0=REPORT_LANG==='tr';}catch(e){}
  return Reflect.get(tr0?tr:t,k);}});
const DN=_langList(_DN_EN_S,_DN_TR_S);
const TEST_PERIODS=[{id:'pre',label:'Pre-Season',short:'Sezon Öncesi'},{id:'in',label:'In-Season',short:'Sezon İçi'},{id:'post',label:'Post-Season',short:'Sezon Sonu'}];
const MN=_langList(_MN_EN_S,_MN_TR_S);
const CHART_DARK={
  // Impactful entrance: bars/points cascade in left→right, easing out smoothly.
  // Only on the initial 'default' draw (not hover/resize), and the per-item delay
  // is capped so long series don't take forever.
  animation:{duration:950,easing:'easeOutQuart',
    delay:ctx=>(ctx.type==='data'&&ctx.mode==='default')?Math.min((ctx.dataIndex||0)*28,640):0},
  animations:{y:{from:ctx=>{const s=ctx.chart&&ctx.chart.scales&&ctx.chart.scales.y;return s?s.getPixelForValue(0):undefined;}}},
  scales:{x:{ticks:{color:'#475569'},grid:{color:'rgba(15,23,42,.08)'}},y:{ticks:{color:'#475569'},grid:{color:'rgba(15,23,42,.07)'},beginAtZero:true}},
  plugins:{legend:{labels:{color:'#334155',font:{family:"'Archivo','Space Grotesk',sans-serif"}}}}
};

