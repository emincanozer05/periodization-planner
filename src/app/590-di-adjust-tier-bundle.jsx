/* ---- Injury & RTP (§10) ---------------------------------------------------
   Reported, never interpreted. The system does not diagnose, does not stage an
   injury by itself and does not put a number on injury risk — the spec rules all
   three out, and the flag below escalates to the coach and the medical staff
   instead of deciding anything. */

const DI_RTP_STAGES=[
  {id:'rehab',   label:['Rehabilitasyon','Rehabilitation']},
  {id:'indiv',   label:['Bireysel fiziksel hazırlık','Individual physical preparation']},
  {id:'modified',label:['Modifiye antrenman','Modified training']},
  {id:'full',    label:['Tam antrenman','Full training']},
  {id:'comp',    label:['Müsabaka','Competition']},
];
const diRtpRow=id=>DI_RTP_STAGES.find(s=>s.id===id)||null;
/* An injury whose onset lies after the day being read did not exist on that day —
   a session written for last Tuesday is not written around Thursday's sprain. */
const diInjOnsetBy=(i,ref)=>{const d=i&&(i.date||i.firstInjuryDay);return!d||!ref||String(d)<=ref;};
function diInjury(ath,ref){
  const all=(ath.injuries||[]).filter(i=>i&&diInjOnsetBy(i,ref));
  const active=all.filter(i=>!i.actualReturn&&(!i.status||i.status!=='Recovered'));
  const fmtInj=i=>({type:i.type||null,region:i.location||i.area||null,side:i.side||null,
    diagnosis:i.diagnosis||i.tissueType||null,onset:i.date||null,status:i.status||null,
    grade:i.grade||null,restrictions:i.restrictions||null,
    rtp_stage:i.rtpStage?(diRtpRow(i.rtpStage)||{label:[i.rtpStage,i.rtpStage]}).label:null,
    expected_return:i.expectedReturn||null});
  /* Recurrence is a count of how often the same region has come back — history the
     longitudinal model (§34) is built on, and the one piece of injury history that
     changes what is sensible to prescribe today. */
  const byRegion={};
  all.forEach(i=>{const k=(i.location||i.area||'').toLowerCase();if(k)byRegion[k]=(byRegion[k]||0)+1;});
  return{active:active.map(fmtInj),
    history:all.filter(i=>i.actualReturn).slice(-6).map(fmtInj),
    recurrence:Object.entries(byRegion).filter(([,n])=>n>1).map(([k,n])=>({region:k,episodes:n})),
    any_active:active.length>0};
}

/* ---- Readiness-based load adjustment (§8, §27) ---------------------------
   The one place volume is allowed to move, and it moves by table. The readiness
   band sets the base cut; each additional stressor adds its own; the total is
   floored so no combination of bad mornings can cut a session to nothing. None of
   these numbers are negotiable by the model — it is handed the result and asked to
   explain it, which is the division of labour the whole module is built on. */
/* THE THRESHOLDS ARE THE KNOWLEDGE BASE'S, NOT THIS TABLE'S. Rule 28 states them —
   "readiness ≥ 3.5 runs at default values", "< 3.5 reduction comes into play",
   "< 2.5 also raises a manual-review flag", "no automatic reduction takes sets below
   1 or reps below 4-5" — and ends by saying the AI's explanation must not contradict
   what the system mechanically applies. It was the other way round: this table cut
   from 3.9 and floored sets at 2, so the model read 3.5 off the rule, wrote a
   rationale against it, and the code quietly cut a band the rule says is untouched.
   The rule is the coach's document and wins; the numbers below are read from it. */
const DI_RD_REDUCE=3.5;   // rule 28 — at or above this, nothing is cut
const DI_RD_REVIEW=2.5;   // rule 28 — below this, the coach is asked to look
const DI_ADJ_BANDS=[
  {max:DI_RD_REVIEW,pct:-40,label:['Hazır oluş çok düşük','Readiness very low']},
  {max:3.2,         pct:-25,label:['Hazır oluş düşük','Readiness low']},
  {max:DI_RD_REDUCE,pct:-10,label:['Hazır oluş sınırda','Readiness borderline']},
  {max:Infinity,    pct:0,  label:['Hazır oluş normal','Readiness normal']},
];
/* Volume is never cut past half, and never past the floors rule 28 names: one set,
   four reps. Below that the session stops being the session and becomes a different
   decision, which is the coach's to make and not a percentage's. */
const DI_ADJ_FLOOR=-50;
const DI_SET_FLOOR=1;
const DI_REP_FLOOR=4;
function diLoadAdjust(b){
  const reasons=[];
  const score=b.readiness?b.readiness.score:null;
  let pct=0;
  if(score!=null){
    const band=DI_ADJ_BANDS.find(x=>score<x.max)||DI_ADJ_BANDS[DI_ADJ_BANDS.length-1];
    pct=band.pct;
    if(band.pct)reasons.push({id:'readiness',pct:band.pct,
      label:L(`${band.label[0]} (${score}/5)`,`${band.label[1]} (${score}/5)`)});
  }
  const add=(id,p,tr,en)=>{pct+=p;reasons.push({id,pct:p,label:L(tr,en)});};
  const load=b.load||{};
  if(load.acwr!=null&&load.acwr>1.5)add('acwr',-10,`ACWR ${load.acwr} — yüksek`,`ACWR ${load.acwr} — high`);
  else if(load.acwr!=null&&load.acwr>1.3)add('acwr',-5,`ACWR ${load.acwr} — dikkat`,`ACWR ${load.acwr} — watch`);
  const peak=b.pain?b.pain.peak_severity_0_5:null;
  if(peak!=null&&peak>=3)add('pain',-25,`Ağrı ${peak}/5`,`Pain ${peak}/5`);
  const md=b.competition?b.competition.md:null;
  if(md==='MD-1')add('md',-20,'Maça 1 gün','1 day to the game');
  else if(md==='MD+1'){
    /* The day after a game is not a flat -25: it depends on what the game cost. Minutes
       played set the base, the game's own RPE nudges it, and a game the athlete barely
       played in costs little or nothing. Without a minutes record we cut a modest
       amount rather than guess a full game. */
    const g=b.playing_time&&b.playing_time.last;
    if(g&&g.days_since<=1&&g.minutes!=null){
      const m=g.minutes;
      let p=m<10?0:m<20?-5:m<28?-10:m<35?-20:-25;
      if(g.rpe!=null&&p<0){
        if(g.rpe>=8)p-=5;
        else if(g.rpe<=4)p+=5;
      }
      if(p<0)add('md',p,`Maçtan 1 gün sonra — ${m} dk${g.rpe!=null?`, maç RPE ${g.rpe}`:''}`,
        `1 day after the game — ${m} min${g.rpe!=null?`, game RPE ${g.rpe}`:''}`);
    }else add('md',-10,'Maçtan 1 gün sonra (süre kaydı yok)','1 day after the game (no minutes recorded)');
  }
  else if(md==='MD')add('md',-40,'Maç günü','Game day');
  if(b.readiness&&b.readiness.wellness&&b.readiness.wellness.cluster)
    add('cluster',-10,`${b.readiness.wellness.signals.length} wellness sinyali bir arada`,
      `${b.readiness.wellness.signals.length} wellness signals together`);
  const raw=pct;
  const floored=pct<DI_ADJ_FLOOR;
  if(floored)pct=DI_ADJ_FLOOR;
  if(pct>0)pct=0;   // V1 reduces load; it never adds any (§8).
  return{pct:Math.round(pct),raw:Math.round(raw),floored,floor:DI_ADJ_FLOOR,reasons,
    band:score==null?null:(diStatusOf(score)||{}).label};
}
/* Apply an adjustment to one prescribed row. Sets carry the cut — 4×6 at -25%
   becomes 3×6, which is how a coach writes it down — and reps are only touched when
   there is no set count to cut (a timed hold, a contact count). The result never
   falls under DI_SET_FLOOR unless the prescription was already below it, so a
   two-set finisher is not adjusted into a one-set one. */
function diAdjustRow(row,pct){
  const out={sets:row.sets,reps:row.reps,duration:row.duration,changed:false,from:null};
  if(!pct)return out;
  const f=1+pct/100;
  const sets=recNum(row.sets);
  if(sets!=null&&sets>0){
    const floor=Math.min(sets,DI_SET_FLOOR);
    const next=Math.max(floor,Math.min(sets,Math.round(sets*f)));
    if(next!==sets){out.sets=String(next);out.changed=true;out.from={sets:String(sets)};}
    return out;
  }
  const reps=recNum(row.reps);
  if(reps!=null&&reps>0){
    /* Rule 28's other floor. Read the same way the set floor is: a prescription that
       was ALREADY under four reps (a heavy triple, a two-rep jump) is not raised to
       four by an adjustment whose only job is to take work away. */
    const floor=Math.min(reps,DI_REP_FLOOR);
    const next=Math.max(floor,Math.min(reps,Math.round(reps*f)));
    if(next!==reps){out.reps=String(next);out.changed=true;out.from={reps:String(reps)};}
    return out;
  }
  /* A row prescribed in time (a 30-second hold) is scaled the same way, to the
     nearest five seconds so the number is one a coach would actually call out. */
  const dm=String(row.duration||'').match(/^(\d+(?:[.,]\d+)?)\s*(sn|s|sec|dk|min)?$/i);
  if(dm){
    const v=Number(dm[1].replace(',','.'));
    const next=Math.max(5,Math.round(v*f/5)*5);
    if(next!==v){out.duration=`${next}${dm[2]||''}`;out.changed=true;out.from={duration:String(row.duration)};}
  }
  return out;
}

/* ---- Monitoring flags (§32) ----------------------------------------------
   Four words, and none of them is a diagnosis, a risk percentage or a medical
   decision — Review means "a person should look at this", which is exactly as far
   as V1 goes. Deliberately NOT a confidence score: §31 rules those out until there
   is enough longitudinal outcome data to mean anything by one. */
const DI_FLAGS=[
  {id:'normal',   label:['Normal','Normal'],      color:'#2dd4a7'},
  {id:'attention',label:['Dikkat','Attention'],   color:'#eab308'},
  {id:'modify',   label:['Değişiklik','Modify'],  color:'#f59e0b'},
  {id:'review',   label:['İnceleme','Review'],    color:'#f43f5e'},
];
const diFlagRow=id=>DI_FLAGS.find(f=>f.id===id)||DI_FLAGS[0];
function diFlag(b){
  const reasons=[];
  const peak=b.pain?b.pain.peak_severity_0_5:null;
  if(peak!=null&&peak>=3)reasons.push({level:'review',text:L(`Ağrı ${peak}/5 bildirildi`,`Pain reported at ${peak}/5`)});
  if(b.injury&&b.injury.any_active)reasons.push({level:'review',text:L('Aktif sakatlık kaydı var','An injury is recorded as active')});
  const sc=b.readiness?b.readiness.score:null;
  if(sc!=null&&sc<DI_RD_REVIEW)reasons.push({level:'review',text:L(`Hazır oluş ${sc}/5 — olağandışı düşük`,`Readiness ${sc}/5 — unusually low`)});
  if(b.adjustment&&b.adjustment.pct)reasons.push({level:'modify',
    text:L(`Hacim %${Math.abs(b.adjustment.pct)} azaltılıyor`,`Volume reduced by ${Math.abs(b.adjustment.pct)}%`)});
  (b.readiness&&b.readiness.signals||[]).forEach(s=>reasons.push({level:'attention',text:s}));
  const id=reasons.some(r=>r.level==='review')?'review'
    :(reasons.some(r=>r.level==='modify')?'modify'
      :(reasons.length?'attention':'normal'));
  const row=diFlagRow(id);
  return{id,label:row.label,color:row.color,
    reasons:reasons.filter(r=>r.level===id).map(r=>r.text),
    all_reasons:reasons};
}

/* ---- Tier (rule 28) -------------------------------------------------------
   Rule 28 names two tiers and the daily engine read neither. The structural one was
   already written — `pwTier`, the weakest-link read of the screening battery — but it
   hung off a tab nothing mounts, so the session that actually reaches an athlete was
   written without it. The temporary one did not exist at all: `athLoadTier` is a
   single-day stress read, and rule 28 is explicit that a temporary drop comes from a
   MULTI-DAY trend, "not a single bad day".

   A temporary drop lowers the tier the session is HELD TO. It does not touch the
   structural tier, and it does not add a second percentage on top of the readiness
   cut — that cut already carries today's fatigue, and taking it twice would be the
   "cumulative" clause of rule 28 read as "counted twice". */
const DI_TMP_WIN=4;   // days of history the trend is read over
const DI_TMP_MIN=2;   // days that must carry the signal before it is a trend
function diTempDowngrade(ath,ref){
  const days=[];
  for(let i=0;i<DI_TMP_WIN;i++){
    const d=fmt(addD(parseD(ref),-i));
    let score=null;
    try{score=athReadiness(ath,d).score;}catch(e){}
    const hurt=athPainReports(ath,d).some(p=>{const s=diPain5(p.sev);return s!=null&&s>=DI_PAIN_BLOCK;});
    days.push({date:d,readiness:score,low:score!=null&&score<DI_RD_REDUCE,pain:hurt});
  }
  const lowDays=days.filter(d=>d.low);
  const painDays=days.filter(d=>d.pain);
  const reasons=[];
  if(lowDays.length>=DI_TMP_MIN)
    reasons.push(L(`${DI_TMP_WIN} günün ${lowDays.length}'inde hazır oluş ${DI_RD_REDUCE} altında`,
      `Readiness under ${DI_RD_REDUCE} on ${lowDays.length} of the last ${DI_TMP_WIN} days`));
  if(painDays.length>=DI_TMP_MIN)
    reasons.push(L(`${DI_TMP_WIN} günün ${painDays.length}'inde ${DI_PAIN_BLOCK}/5 ve üzeri ağrı bildirildi`,
      `Pain at ${DI_PAIN_BLOCK}/5 or more on ${painDays.length} of the last ${DI_TMP_WIN} days`));
  return{active:reasons.length>0,reasons,window_days:DI_TMP_WIN,min_days:DI_TMP_MIN,days};
}
/* The two tiers together, in the shape the prompt and the validator both read. The
   structural tier is null when the battery has nothing in it — the tier decision is
   then skipped rather than assumed, exactly like every other missing input. */
function diTier(ath,ref){
  const tests=[...(ath.tests||[])].filter(t=>t.date&&t.date<=ref).sort((a,b)=>a.date.localeCompare(b.date));
  const last=tests[tests.length-1]||null;
  const st=last?pwTier(last):{kademe:null,items:[],zayif_halka:null,olculen:0};
  const tmp=diTempDowngrade(ath,ref);
  const structural=st.kademe;
  const effective=(structural!=null&&tmp.active)?Math.max(1,structural-1):structural;
  const row=k=>{const r=pwTierRow(k);return r?{kademe:k,etiket:r.label,hacim:r.hacim,siddet:r.siddet,
    karmasiklik:r.karmasiklik,pliometrik_sok:r.sok}:null;};
  return{
    yapisal:structural,
    yapisal_detay:row(structural),
    zayif_halka:st.zayif_halka,
    olculen_madde:st.olculen,
    test_tarihi:last?last.date:null,
    tarama_maddeleri:st.items,
    gecici_dusus:tmp.active,
    gecici_dusus_gerekcesi:tmp.reasons,
    gecerli:effective,
    gecerli_detay:row(effective),
    yontem:'Zayıf halka: yapısal kademe, ölçülen tarama maddelerinin EN DÜŞÜĞÜDÜR; ortalama alınmaz. Geçici düşüş çok günlük trendden gelir ve yapısal kademeyi değiştirmez.',
  };
}
/* What the effective tier CAPS, as numbers a check can be run against. Read straight
   off PW_TIERS' own wording so this adds no threshold CoachOS had not already stated:
   tier 1 is "2-3 set", tier 2 "3-4", tier 3 "4-5", and the per-session exercise counts
   sit in the same sentence. Plyometric volume is stated per WEEK in that table, so it
   is not turned into a per-session contact ceiling here — rule 27 states that one, and
   that is the one `diPlyoCeiling` reads. */
const DI_TIER_CAPS={
  1:{max_sets:3,max_main:5,plyo_note:'düşük yükseklik, iniş kontrolü',plyo_note_en:'low box height, landing control'},
  2:{max_sets:4,max_main:6,plyo_note:'çift → tek bacak geçişi kontrollü',plyo_note_en:'controlled double- to single-leg progression'},
  3:{max_sets:5,max_main:6,plyo_note:'reaktif ve tek bacak temaslar dahil',plyo_note_en:'reactive and single-leg contacts included'},
};
const diTierCaps=k=>DI_TIER_CAPS[k]||null;

/* ---- The bundle -----------------------------------------------------------
   Everything the decision rests on, computed once, in the order §40 sets out:
   profile → current data → readiness → recent exposure → competition → season
   phase → injury/restriction → adjustment → flag. This object is what the card
   draws and what the model is given. There is no second path to the model: if a
   number is not in here, the answer does not get to use one. */
function diBundle(ath,setup,ref,opts){
  const o=opts||{};
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=parseD(ref);let y=t.getFullYear()-b.getFullYear();
    if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  const tests=[...(ath.tests||[])].filter(t=>t.date&&t.date<=ref).sort((a,b)=>a.date.localeCompare(b.date));
  const lastTest=tests[tests.length-1]||null;
  const pg=posGroupOf(ath.position);
  const load=diInternalLoad(ath,ref);
  const readiness=diReadiness(ath,ref,{load});
  const b={
    date:ref,
    athlete:{
      id:ath.id,name:ath.name||null,age,
      /* Set on the athlete's profile. Absent on every athlete entered before the field
         existed, and then listed as missing rather than guessed. */
      sex:ath.sex==='M'?'male':ath.sex==='F'?'female':null,
      position:ath.position?(POS_FULL[ath.position]||ath.position):null,
      position_group:ath.position?posGroupLabel(pg):null,
      /* Context for the role, not a prescription from it (§4.3). */
      position_qualities:(DI_POS_QUALITIES[pg]||[]).map(q=>L(q[0],q[1])),
      training_age_years:recNum(ath.trainingAge),
      /* The body type the coach recorded on the athlete's card. It was on the athlete
         and reached nothing — rule 30 reads position as a starting point and the
         individual's own make-up as worth more, and this is half of that. */
      vucut_tipi:String(ath.somatotype||'').trim()||null,
      level:ath.levelTag?(LEVEL_LABEL[ath.levelTag]||ath.levelTag):null,
      height_cm:recNum(lastTest&&lastTest.height)??recNum(ath.height),
      weight_kg:recNum(lastTest&&lastTest.weight)??recNum(ath.weight),
      wingspan_cm:recNum(lastTest&&lastTest.wingspan),
      leg_length_cm:recNum(lastTest&&lastTest.legLength),
    },
    readiness:{score:readiness.score,status:readiness.status?L(readiness.status.label[0],readiness.status.label[1]):null,
      status_id:readiness.status?readiness.status.id:null,
      source:readiness.estimated?'estimated from sRPE trend':'wellness check-in',
      checkin_date:readiness.date,stale:readiness.stale,signals:readiness.signals},
    wellness:{signals:readiness.wellness.signals.map(s=>({field:s.id,label:L(s.label[0],s.label[1]),
        value:s.value,baseline:s.baseline,deviation_pct:s.deviation})),
      cluster:readiness.wellness.cluster,
      baselines:DI_WELL_FIELDS.map(f=>{const x=diBaseline(ath,f.id,ref);
        return{field:f.id,label:L(f.label[0],f.label[1]),current:x.current,baseline:x.baseline,
          deviation_pct:x.deviation,readings:x.n};}).filter(x=>x.current!=null||x.baseline!=null)},
    load,
    /* Rule 28's tier system, read here rather than on the tab nobody mounts. */
    tier:diTier(ath,ref),
    pain:diPain(ath,ref),
    injury:diInjury(ath,ref),
    exposure:diExposure(ath,ref,{days:3,libMap:o.libMap}),
    exposure_7:diExposure(ath,ref,{days:7,libMap:o.libMap}),
    competition:diCompetition(setup,ref),
    same_day_practice:diSameDayPractice(ath,ref),
    playing_time:diPlayingTime(ath,ref),
    season_phase:(()=>{const p=diSeasonPhase(setup,ref);
      return{id:p.id,label:p.label?L(p.label[0],p.label[1]):null,
        focus:p.focus.map(f=>L(f[0],f[1])),period:p.period};})(),
    test_baselines:DI_TEST_METRICS.map(m=>diTestBaseline(ath,m,ref)).filter(Boolean)
      .map(x=>({metric:L(x.label[0],x.label[1]),current:x.current,baseline:x.baseline,
        deviation_pct:x.deviation,unit:x.unit.trim()||null,date:x.date,readings:x.n})),
  };
  b.adjustment=diLoadAdjust(b);
  b.flag=(()=>{const f=diFlag(b);return{id:f.id,label:L(f.label[0],f.label[1]),color:f.color,
    reasons:f.reasons,all_reasons:f.all_reasons.map(r=>r.text)};})();
  return b;
}

/* ---- What makes THIS athlete's session different, computed -----------------
   The module's oldest complaint is that every athlete came back with roughly the
   same session. The reflex fix is to tell the model to read the rules harder, and it
   does not work: thirty general rules are satisfied generically, and a long list is
   the easiest thing in a prompt to answer in the abstract. Nothing downstream can
   repair that either — a validator can say a session broke a limit, it cannot say a
   session failed to be about this particular athlete.

   So the differentiation is computed here, before the call, and handed over as a
   short numbered list the answer is REQUIRED to cite per exercise. Four specific
   sentences about one athlete are harder to write around than thirty general rules,
   and because each one carries an id, whether the answer actually used them is a
   thing code can check rather than a thing a reader has to judge.

   Deliberately short and deliberately concrete. Nothing generic goes in — "is a
   basketball player" differentiates nobody — and nothing is invented: every line
   below is a reading the app already holds. */
const DI_DIFF_MAX=6;
const DI_DIFF_PAIN_WIN=14;      // how far back a pain region's day count is read
const DI_DIFF_TEST_DEV=8;       // % below the athlete's own baseline worth naming
/* How many of the last N days this region was reported on. A region reported once is
   today's news; a region reported five days running is a different athlete. */
function diPainDays(ath,region,ref){
  let n=0;
  for(let i=0;i<DI_DIFF_PAIN_WIN;i++){
    const d=fmt(addD(parseD(ref),-i));
    if(athPainReports(ath,d).some(p=>p.tag===region))n++;
  }
  return n;
}
/* A team practice on the day being programmed: the session the athlete already has
   that day, from their own calendar (team sessions are mirrored onto it) or from the
   team-practice slot of their RPE log. The S&C session is written on top of it, so
   what it may cost depends on it. */
function diSameDayPractice(ath,ref){
  const ses=(((ath&&ath.days)||{})[ref]||{}).sessions||[];
  const tp=ses.find(x=>x&&sesKind(x)==='tp');
  if(tp)return{name:tp.name||null,time:tp.time||null,duration_min:recNum(tp.duration)};
  const log=((ath&&ath.srpeLog)||[]).find(e=>e&&e.date===ref&&(recNum(e.tpDuration)!=null||recNum(e.tpRPE)!=null));
  return log?{name:null,time:null,duration_min:recNum(log.tpDuration),rpe:recNum(log.tpRPE)}:null;
}
/* ---- How much fatigue the session may cost, by its distance from the game -------
   The volume cut (diLoadAdjust) says how MUCH; this says what KIND of work the day can
   afford. A session at 80 % volume can still be the wrong session on MD-1 if what is
   left is a set of Nordics and depth jumps: the fatigue a session leaves — eccentric
   and impact damage, work near failure, maximal efforts — is what the game pays for.
   The budget steps down near the game, and one more step when a team practice shares
   the day. NOT A KNOWLEDGE-BASE NUMBER: the RPE caps are this module's own, they feed
   soft warnings only and never block a save. */
const DI_FATIGUE_LEVELS=['minimal','low','moderate','normal'];
const DI_MD_FATIGUE={
  'MD':  {budget:'minimal',focus:['Yalnızca aktivasyon / hazırlık — kuvvet veya kondisyon yükü yok','Activation / priming only — no strength or conditioning load']},
  'MD-1':{budget:'low',    focus:['Kısa, düşük hacimli aktivasyon; hız/güç düşük hacimde, tam toparlanmayla','Short, low-volume priming; speed / power at low volume with full recovery']},
  'MD+1':{budget:'low',    focus:['Toparlanma: düşük darbe, mobilite, hafif aerobik','Recovery: low impact, mobility, light aerobic work']},
  'MD-2':{budget:'moderate',focus:['Orta yük; yüksek eksantrik ve yüksek darbe sınırlı','Moderate load; heavy eccentric and high-impact work limited']},
  'MD+2':{budget:'moderate',focus:['Orta yük; maçın yorgunluğu henüz geçmemiş olabilir','Moderate load; the game may not have cleared yet']},
};
const DI_FATIGUE_RPE={minimal:5,low:6,moderate:7,normal:null};
/* What makes a row costly to recover from: read off its name and dose. Eccentric
   overload, high-impact plyometrics, maximal sprinting, and work at or near failure. */
const DI_FATIGUE_RE=/nordic|eccentric|eksantrik|negatif|depth jump|drop jump|derinlik|bound|flying|max(imal)? (velocity|sprint|speed)|to failure|tükeniş|amrap|repeated sprint|rsa\b/i;
function diFatigueBudget(bundle,practiceIn){
  const practice=practiceIn!==undefined?practiceIn:((bundle&&bundle.same_day_practice)||null);
  const md=bundle&&bundle.competition?bundle.competition.md:null;
  const row=md?DI_MD_FATIGUE[md]:null;
  let lv=DI_FATIGUE_LEVELS.indexOf(row?row.budget:'normal');
  if(practice&&lv>0)lv--;
  const budget=DI_FATIGUE_LEVELS[lv];
  return{md,budget,max_rpe:DI_FATIGUE_RPE[budget],
    focus:row?L(row.focus[0],row.focus[1]):null,same_day_practice:practice||null};
}
function diDifferentiators(ath,bundle,deficits,ref){
  const out=[];
  const add=(kind,tr,en)=>{if(out.length<DI_DIFF_MAX)out.push({kind,text:L(tr,en)});};

  /* The order is what changes today's programme most, first. A list capped at six is
     read top-down, and a position or a tier is a property of the athlete every day;
     a game tomorrow, a sore knee or a team practice at 17:00 is what makes TODAY's
     session this athlete's and not last week's. */

  // 1. The game: distance to it decides what kind of work the day can afford.
  const md=bundle.competition&&bundle.competition.md;
  if(md&&DI_MD_FATIGUE[md]){
    const r=DI_MD_FATIGUE[md];
    add('match',`${md} — ${r.focus[0]}`,`${md} — ${r.focus[1]}`);
  }

  // 2. An active injury — the hardest fact about this athlete today.
  ((bundle.injury&&bundle.injury.active)||[]).slice(0,2).forEach(inj=>{
    const bits=[inj.region,inj.side,inj.rtp_stage?L(inj.rtp_stage[0],inj.rtp_stage[1]):null]
      .filter(Boolean).join(' · ');
    add('injury',`aktif sakatlık: ${bits||inj.type||'kayıtlı'}`,`active injury: ${bits||inj.type||'on record'}`);
  });

  // 3. Current pain, any graded report, with how long it has been going on — a
  //    three-day knee is not a bad morning. Worst first.
  ((bundle.pain&&bundle.pain.regions)||[])
    .filter(r=>r.standing||(r.severity_0_5!=null&&r.severity_0_5>0))
    .sort((a,b)=>(b.severity_0_5||0)-(a.severity_0_5||0))
    .slice(0,2).forEach(r=>{
      if(r.standing)
        return add('pain',`${r.label} — koçun kalıcı kısıt etiketi`,`${r.label} — standing coach restriction`);
      const n=diPainDays(ath,r.region,ref);
      add('pain',`${r.label} ağrısı ${r.severity_0_5}/5, ${n} gündür bildiriliyor`,
        `${r.label} pain at ${r.severity_0_5}/5, reported ${n} day${n>1?'s':''} running`);
    });

  // 4. A team practice the same day: the session is written on top of it.
  const tp=bundle.same_day_practice!==undefined?bundle.same_day_practice:diSameDayPractice(ath,ref);
  if(tp){
    const when=[tp.time,tp.duration_min!=null?`${tp.duration_min} dk`:null].filter(Boolean).join(', ');
    const whenEn=[tp.time,tp.duration_min!=null?`${tp.duration_min} min`:null].filter(Boolean).join(', ');
    add('team_practice',`aynı gün takım antrenmanı${when?` (${when})`:''} — günün toplam yorgunluğu birlikte hesaplanır`,
      `team practice the same day${whenEn?` (${whenEn})`:''} — the day's total fatigue counts both`);
  }

  // 5. The development priorities the coach set for this period (High only).
  const tq=atpRead(ath).qualities;
  const high=ATP_QUALITIES.filter(it=>tq[it.id]&&tq[it.id].priority==='high').map(it=>it.en);
  if(high.length)add('priority',`gelişim öncelikleri (Yüksek): ${high.map(atpT).join(', ')}`,
    `development priorities (High): ${high.join(', ')}`);

  // 6. Today's readiness, only where it is actually low enough to change anything.
  const rd=bundle.readiness||{};
  if(rd.score!=null&&rd.score<DI_RD_REDUCE)
    add('readiness',`hazır oluş ${rd.score}/5 (${rd.status||'—'})`,`readiness ${rd.score}/5 (${rd.status||'—'})`);

  // 7. Acute load standing clearly outside its zone.
  const acwr=bundle.load&&bundle.load.acwr;
  if(acwr!=null&&(acwr>1.5||acwr<0.8))
    add('load',`ACWR ${acwr} — ${acwr>1.5?'yüksek':'düşük'}`,`ACWR ${acwr} — ${acwr>1.5?'high':'low'}`);

  // 8. The structural tier and the screen that set it (weakest link, rule 28).
  const t=bundle.tier||{};
  if(t.yapisal!=null){
    const weak=(t.zayif_halka||[])[0]||null;
    add('tier',`yapısal kademe ${t.yapisal}${weak?` (en zayıf halka: ${weak})`:''}`,
      `structural tier ${t.yapisal} of 3 — ${DI_TIER_SCALE}${weak?` (weakest link: ${weak})`:''}`);
    if(t.gecici_dusus)
      add('tier',`geçici kademe düşüşü — ${(t.gecici_dusus_gerekcesi||[])[0]||'çok günlük trend'}`,
        `temporary tier downgrade — ${(t.gecici_dusus_gerekcesi||[])[0]||'multi-day trend'}`);
  }

  // 9. The battery's own high-priority findings, as measured — the observation only.
  ((deficits&&deficits.findings)||[]).filter(f=>f.oncelik==='yüksek').slice(0,1)
    .forEach(f=>add('finding',`ölçüm: ${f.bolge} — ${f.bulgu}`,`measured: ${f.bolge} — ${f.bulgu}`));

  // 10. A performance test that has moved against the athlete's OWN baseline.
  (bundle.test_baselines||[])
    .filter(x=>x.deviation_pct!=null&&x.deviation_pct<=-DI_DIFF_TEST_DEV)
    .sort((a,b)=>a.deviation_pct-b.deviation_pct).slice(0,1)
    .forEach(x=>add('test',`${x.metric} kendi baseline'ının %${Math.abs(x.deviation_pct)} altında`,
      `${x.metric} is ${Math.abs(x.deviation_pct)}% below their own baseline`));

  return out.map((d,i)=>({id:`D${i+1}`,...d}));
}

/* ---- What this athlete was given before ----------------------------------
   The repetition the module is judged on is repetition OVER TIME for one athlete, and
   sameness ACROSS athletes whose situations differ. Both are read from the review
   store, which has been keeping every draft beside the reading that produced it since
   the module shipped — so this needs no new storage, only a reader. */
function diReviewEntries(team){
  const store=(team&&team.indiv&&team.indiv.ai)||{};
  return Object.keys(store).map(k=>{
    const bits=k.split('|');
    return{key:k,date:bits[0]||'',srcKey:bits[1]||'',athId:bits.slice(2).join('|'),rec:store[k]};
  }).filter(e=>e.rec&&e.rec.program);
}
const diProgramNames=p=>[...new Set(((p&&p.blocks)||[])
  .flatMap(b=>(b.exercises||[]).map(e=>diExName(e.name))).filter(Boolean))];
/* Overlap of two exercise lists, 0 to 1. Jaccard rather than a raw count so a short
   session and a long one are compared on what they share, not on how long they are. */
function diJaccard(a,b){
  const A=new Set(a||[]),B=new Set(b||[]);
  if(!A.size||!B.size)return 0;
  let inter=0;A.forEach(x=>{if(B.has(x))inter++;});
  return +(inter/(A.size+B.size-inter)).toFixed(2);
}
const DI_RECENT_N=3;
function diRecentPrograms(team,athId,date,n){
  return diReviewEntries(team).filter(e=>e.athId===athId&&e.date<date)
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,n||DI_RECENT_N)
    .map(e=>({tarih:e.date,egzersizler:diProgramNames(e.rec.program),
      ayirt_ediciler:((e.rec.differentiators)||[]).map(d=>d.text)}));
}
/* The other athletes written on the same day. Used for one comparison only: two
   athletes whose differentiator lists DIFFER should not come back with the same
   session. Two athletes who genuinely read alike are allowed to — rule 24 says
   individualization is not total differentiation, and forcing variety on similar
   inputs would be inventing a difference the data does not carry. */
function diPeerPrograms(team,date,athId){
  return diReviewEntries(team).filter(e=>e.date===date&&e.athId!==athId)
    .map(e=>({athId:e.athId,names:diProgramNames(e.rec.program),
      diff:((e.rec.differentiators)||[]).map(d=>d.text)}));
}
/* NOT A COACHOS NUMBER. CoachOS defines no similarity threshold — these two are this
   module's own, they drive WARNINGS ONLY and never block a save, and they are named
   here so they can be argued with in one place. */
const DI_SIM_SELF=0.7;
const DI_SIM_PEER=0.8;

/* ---- Rule 27: plyometric contacts per session -----------------------------
   The rule states a band per age group and, for the senior team, per season half.
   Only its UPPER bound is carried: it is the ceiling a session is held to. There is
   no floor — a session writes plyometrics when the day calls for them, and a minimum
   contact count would push jumps into a session (MD-1, a sore knee, a day after team
   practice) that should have none. */
const DI_PLYO_BANDS=[
  {under:13,max:40, label:['U9-U12','U9-U12']},
  {under:15,max:60, label:['U13-U14','U13-U14']},
  {under:19,max:100,label:['U15-U18','U15-U18']},
];
function diPlyoCeiling(bundle){
  const age=bundle&&bundle.athlete&&bundle.athlete.age;
  if(age==null)return null;               // no birth date → no band, and nothing is assumed
  const band=DI_PLYO_BANDS.find(b=>age<b.under);
  if(band)return{max:band.max,grup:L(band.label[0],band.label[1])};
  /* Senior. The rule splits by season half rather than by age: in-season up to 60,
     off-season up to 100. A phase the app cannot read leaves this unset rather than
     guessed — an unbounded check is better than a bound nobody stated. */
  const ph=(bundle.season_phase&&bundle.season_phase.id)||null;
  if(ph==='in'||ph==='playoff')return{max:60,grup:L('A takım, sezon içi','Senior, in-season')};
  if(ph==='off'||ph==='pre'||ph==='trans')return{max:100,grup:L('A takım, sezon dışı','Senior, off-season')};
  return null;
}
/* Ground contacts a written row asks for. Only a row that is plyometric by pattern
   counts, and only where both numbers are readable — a "3 × max" row contributes
   what can be counted and says so by contributing nothing rather than a guess. */
function diRowContacts(row,patOf){
  const pat=patOf?patOf(row):(row.pattern||'');
  if(pat!=='Jump / Plyo')return null;
  const sets=recNum(row.sets),reps=recNum(row.reps);
  if(sets==null||reps==null)return null;
  return Math.round(sets*reps);
}

/* ---- Rule 20: how many of a piece of kit one row asks for -----------------
   "2DB Bulgarian Split Squat" needs two dumbbells; a barbell row needs one bar. The
   count is read off the name the way a coach writes it, and anything unreadable
   counts as one — the check exists to catch a prescription the gym cannot lay out,
   not to argue about grammar. */
const DI_PAIR_RE=/(^|\s)(2\s*db|2db|çift|cift|double|pair|a\s*pair\s*of|iki\s+adet)(\s|$)/i;
function diRowUnits(row){
  const txt=`${row.name||''} ${row.equipment||''}`;
  const m=txt.match(/(^|[^\d])(\d{1,2})\s*(x|×|adet|pcs)\s/i);
  if(m){const n=Number(m[2]);if(n>=1&&n<=12)return n;}
  return DI_PAIR_RE.test(txt)?2:1;
}

