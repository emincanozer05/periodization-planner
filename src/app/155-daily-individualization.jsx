/* ---- One athlete's card: their readiness at a glance, their calendar underneath -- */

/* =========================================================
   DAILY INDIVIDUALIZATION ENGINE — V1

   The question this answers is not "write this athlete a programme". It is the
   narrower one a coach actually asks at 9am: GIVEN today's plan, which version of
   it does THIS athlete do today? Everything below computes that answer from data
   the app already holds — the wellness check-in, the sRPE log, the pain report,
   the athlete's own calendar, the fixture list and the macrocycle.

   The split is the whole point, and it is enforced here rather than asked for in a
   prompt: EVERY NUMBER ON THIS PAGE IS COMPUTED BY CODE. Readiness, the volume cut,
   the set count, the days to the next game, the recent exposure, the baseline
   deviation — all of it lands in one bundle (`diBundle`) and the model is handed
   that bundle already finished. What the model is asked for is the part arithmetic
   cannot do: which exercise, which substitution, and why. It is told, in the system
   prompt, that inventing any of these numbers is out of scope, and the answer is
   parsed against a schema that has nowhere to put one.

   Nothing here decides anything on its own either. The bundle and the draft are
   shown on the athlete's card; the coach accepts, modifies or rejects, and that
   decision is what gets written (§30 — and what a later version's feedback loop
   would learn from).
   ========================================================= */

/* How far back a personal baseline is averaged, how many readings it takes before
   there is a baseline worth comparing against, and how many days of "now" are
   weighed against it. A baseline off one morning is not a baseline, which is why
   DI_BASE_MIN exists at all. */
const DI_BASE_WIN=28;
const DI_BASE_MIN=4;
const DI_CUR_WIN=3;
/* A deviation from the athlete's own normal worth putting in front of the coach. */
const DI_DEV_FLAG=10;

/* The wellness fields the check-in carries, with the direction that counts as good
   and the absolute level that is low whatever the athlete's baseline says. Fatigue
   and soreness are rated 1-5 with 5 as the GOOD end (the survey's own wording), so
   every field here except RHR reads high-is-better. */
const DI_WELL_FIELDS=[
  {id:'sleep',    label:['Uyku','Sleep'],            dir:'hi', low:3,   unit:''},
  {id:'fatigue',  label:['Yorgunluk','Fatigue'],     dir:'hi', low:2.5, unit:'/5'},
  {id:'soreness', label:['Kas ağrısı','Soreness'],   dir:'hi', low:2.5, unit:'/5'},
  {id:'readiness',label:['Hazır oluş','Readiness'],  dir:'hi', low:3.2, unit:'/5'},
  {id:'RHR',      label:['Dinlenik nabız','Resting HR'],dir:'lo',low:null,unit:' bpm'},
];
const diWellField=id=>DI_WELL_FIELDS.find(f=>f.id===id)||null;

/* ---- Individual baseline & deviation (§17) --------------------------------
   The athlete's own normal, from their own history — never a squad average and
   never a single reading. `current` is the last DI_CUR_WIN days; `baseline` is the
   window BEFORE those days, so today is not averaged into the thing today is being
   judged against. When the history behind the current window is too thin to stand
   on its own the whole window is used instead and `overlap` says so, because a
   slightly self-referential baseline still beats showing the coach nothing. */
function diBaseline(ath,field,ref,opts){
  const o=opts||{};
  const win=o.win||DI_BASE_WIN,curWin=o.cur||DI_CUR_WIN;
  const from=fmt(addD(parseD(ref),-(win-1)));
  const rows=(ath.wellness||[]).filter(w=>w.date&&w.date>=from&&w.date<=ref&&recNum(w[field])!=null)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const out={field,baseline:null,current:null,deviation:null,n:rows.length,window:win,overlap:false};
  if(rows.length<DI_BASE_MIN)return out;
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  const curFrom=fmt(addD(parseD(ref),-(curWin-1)));
  const now=rows.filter(w=>w.date>=curFrom).map(w=>recNum(w[field]));
  const hist=rows.filter(w=>w.date<curFrom).map(w=>recNum(w[field]));
  const base=hist.length>=DI_BASE_MIN?mean(hist):(out.overlap=true,mean(rows.map(w=>recNum(w[field]))));
  out.baseline=+base.toFixed(2);
  out.current=now.length?+mean(now).toFixed(2):null;
  if(out.current!=null&&base>0)out.deviation=Math.round((out.current-base)/base*1000)/10;
  return out;
}

/* Test metrics a baseline can be drawn for, and which way round better is. Kept to
   what CoachOS measures without force plates — V1 is explicitly not allowed to
   depend on hardware the coach does not own (§13.4, §37). */
const DI_TEST_METRICS=[
  {id:'cmj',    label:['CMJ','CMJ'],                 read:t=>recNum(t.cmj),                 dir:'hi',unit:' cm'},
  {id:'vert',   label:['Dikey sıçrama','Vertical jump'],read:t=>recNum(t.verticalJump),     dir:'hi',unit:' cm'},
  {id:'sj',     label:['Squat Jump','Squat jump'],   read:t=>recNum(t.squatJump),           dir:'hi',unit:' cm'},
  {id:'rsi',    label:['Drop Jump RSI','Drop jump RSI'],read:t=>recNum(t.dropJump),         dir:'hi',unit:''},
  {id:'horiz',  label:['Yatay sıçrama','Horizontal jump'],read:t=>recNum(t.horizontalJump), dir:'hi',unit:' cm'},
  {id:'sprint20',label:['20 m sprint','20 m sprint'],read:t=>recNum(t.sprint20m&&t.sprint20m.time),dir:'lo',unit:' sn'},
  {id:'ttest',  label:['T-Test','T-Test'],           read:t=>recNum(t.tTest),               dir:'lo',unit:' sn'},
  {id:'cod505', label:['5-0-5','5-0-5'],             read:t=>recNum(t.fiveZeroFive),        dir:'lo',unit:' sn'},
];
/* A test baseline is the mean of the readings BEFORE the latest one (up to four of
   them), and the deviation is where the latest sits against it. One test is a
   reading, not a baseline, so a single result reports `baseline:null` rather than
   comparing the athlete to themselves. */
function diTestBaseline(ath,metric,ref){
  const m=typeof metric==='string'?DI_TEST_METRICS.find(x=>x.id===metric):metric;
  if(!m)return null;
  const ts=[...(ath.tests||[])].filter(t=>t.date&&(!ref||t.date<=ref)&&m.read(t)!=null)
    .sort((a,b)=>a.date.localeCompare(b.date));
  if(!ts.length)return null;
  const cur=m.read(ts[ts.length-1]);
  const hist=ts.slice(Math.max(0,ts.length-5),ts.length-1).map(m.read);
  const out={id:m.id,label:m.label,unit:m.unit,dir:m.dir,current:cur,date:ts[ts.length-1].date,
    baseline:null,deviation:null,n:ts.length};
  if(!hist.length)return out;
  const base=hist.reduce((s,v)=>s+v,0)/hist.length;
  out.baseline=+base.toFixed(2);
  if(base>0){
    const raw=(cur-base)/base*100;
    // A time gets faster by going DOWN, so the sign is flipped for those: a negative
    // deviation always means "worse than this athlete's own normal", whatever the unit.
    out.deviation=Math.round((m.dir==='lo'?-raw:raw)*10)/10;
  }
  return out;
}

/* ---- Wellness signals (§6) -----------------------------------------------
   One bad morning is not a verdict (§6.5). Each field can raise a signal two ways —
   it is low in absolute terms, or it has moved away from this athlete's own baseline
   by more than DI_DEV_FLAG — and the signals are counted rather than acted on
   individually. Three at once is the cluster the spec asks to be read as a stronger
   fatigue signal than any single low score. */
const DI_CLUSTER=3;
function diWellnessSignals(ath,ref){
  const out=[];
  DI_WELL_FIELDS.forEach(f=>{
    const b=diBaseline(ath,f.id,ref);
    const v=b.current;
    if(v==null)return;
    const worseLow=f.dir==='hi'?(f.low!=null&&v<f.low):(f.low!=null&&v>f.low);
    // For a low-is-better field (RHR) a rise is the bad direction, so the deviation is
    // read against the field's own direction rather than by its sign alone.
    const drift=b.deviation==null?null:(f.dir==='hi'?b.deviation:-b.deviation);
    const worseDrift=drift!=null&&drift<=-DI_DEV_FLAG;
    if(!worseLow&&!worseDrift)return;
    /* The reading first, then what it is being compared against, then the move —
       signed the way the number itself moved. Printing the direction-corrected figure
       instead said a resting heart rate eight beats ABOVE baseline had gone down. */
    const parts=[`${v}${f.unit}`];
    if(b.baseline!=null)parts.push(L(`taban ${b.baseline}${f.unit}`,`baseline ${b.baseline}${f.unit}`));
    if(worseDrift&&b.deviation!=null)parts.push(`${b.deviation>0?'+':''}${b.deviation.toFixed(1)}%`);
    out.push({id:f.id,label:f.label,value:v,baseline:b.baseline,deviation:b.deviation,
      severity:(worseLow&&worseDrift)?2:1,
      text:L(`${f.label[0]} ${parts.join(' · ')}`,`${f.label[1]} ${parts.join(' · ')}`)});
  });
  return{signals:out,cluster:out.length>=DI_CLUSTER,
    weight:out.reduce((s,x)=>s+x.severity,0)};
}

/* ---- Internal load (§5.2) -------------------------------------------------
   sRPE = RPE × session duration, and it is computed HERE — the sRPE log already
   carries the product per slot (team practice / S&C / game), so the windows below
   are sums and means over what the athlete actually reported. Heart rate is
   deliberately absent: it belongs in this same structure when the straps exist
   (§37), and nothing in V1 is built around hardware the coach does not have. */
function diInternalLoad(ath,ref){
  const d=k=>fmt(addD(parseD(ref),k));
  const rpeMean=(from,to)=>{
    const v=[];let c=parseD(from);const e=parseD(to);
    while(c<=e){const r=athDayRPE(ath,fmt(c));if(r!=null&&!isNaN(r))v.push(r);c=addD(c,1);}
    return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):null;
  };
  const rows=[...(ath.srpeLog||[])].filter(e=>e.date&&e.date<=ref).sort((a,b)=>a.date.localeCompare(b.date));
  const lastRow=rows[rows.length-1]||null;
  const slot=lastRow?['game','sc','tp'].find(k=>recNum(lastRow[k+'RPE'])!=null):null;
  const last=lastRow&&slot?{
    date:lastRow.date,kind:slot,
    rpe:recNum(lastRow[slot+'RPE']),
    duration:recNum(lastRow[slot+'Duration']),
    /* Recomputed rather than read back, so the number the model sees is the product
       of the two numbers beside it even where an older row stored them apart. */
    srpe:Math.round((recNum(lastRow[slot+'RPE'])||0)*(recNum(lastRow[slot+'Duration'])||0)),
  }:null;
  const load=(a,b)=>athLoadSum(ath,d(a),d(b));
  const srpe7=load(-6,0),srpePrev7=load(-13,-7);
  const acwr=athACWR(ath,ref);
  const daily=[];for(let i=6;i>=0;i--)daily.push({load:athDayLoad(ath,d(-i))});
  const mono=weekMono(daily);
  const rpe7=rpeMean(d(-6),ref),rpePrev7=rpeMean(d(-13),d(-7));
  let hard=0;for(let i=0;i<7;i++){const r=athDayRPE(ath,d(-i));if(r!=null&&r>=8.5)hard++;}
  return{last,
    rpe_last:last?last.rpe:null,
    rpe3:rpeMean(d(-2),ref),rpe7,rpe14:rpeMean(d(-13),ref),rpe_prev7:rpePrev7,
    srpe3:load(-2,0),srpe7,srpe14:load(-13,0),srpe_prev7:srpePrev7,
    /* Direction, not a single morning: half an RPE point between two weeks is the
       smallest move worth calling a trend on a 10-point scale. */
    trend:(rpe7==null||rpePrev7==null)?null:(rpe7-rpePrev7>=0.5?'rising':(rpePrev7-rpe7>=0.5?'falling':'steady')),
    load_change_pct:srpePrev7>0?Math.round((srpe7/srpePrev7-1)*100):null,
    acwr:acwr?+acwr.toFixed(2):null,acwr_zone:acwr?acwrZoneOf(acwr).t:null,
    monotony:mono.monotony?+mono.monotony.toFixed(2):null,
    hard_days_7:hard};
}

/* ---- Daily readiness (§5, §7) --------------------------------------------
   The score itself is the one the rest of the app already reads (`athReadiness`:
   the check-in, or an estimate off the sRPE trend when there is no check-in), so a
   number on this card and the same number on the Load Board cannot disagree. What
   this adds is the reading around it — the band it falls in, the wellness signals
   it is made of, and the load context — and it hands all of that over as text the
   model can quote but not recompute. */
const DI_STATUS=[
  {id:'low',     min:0,   label:['Düşük','Low']},
  {id:'reduced', min:2.5, label:['Azalmış','Reduced']},
  {id:'moderate',min:3.2, label:['Orta','Moderate']},
  {id:'normal',  min:3.9, label:['Normal','Normal']},
  {id:'high',    min:4.5, label:['Yüksek','High']},
];
function diStatusOf(score){
  if(score==null)return null;
  let out=DI_STATUS[0];
  for(const s of DI_STATUS)if(score>=s.min)out=s;
  return out;
}
function diReadiness(ath,ref,pre){
  const p=pre||{};
  const rd=p.rd||athReadiness(ath,ref);
  const well=diWellnessSignals(ath,ref);
  const load=p.load||diInternalLoad(ath,ref);
  const band=rdBand(rd.score);
  const status=diStatusOf(rd.score);
  const signals=well.signals.map(s=>s.text);
  if(load.acwr!=null&&load.acwr>1.3)
    signals.push(L(`Yüksek akut yük — ACWR ${load.acwr} (${load.acwr_zone})`,`High acute load — ACWR ${load.acwr} (${load.acwr_zone})`));
  if(load.hard_days_7>=2)
    signals.push(L(`Son 7 günde ${load.hard_days_7} seans RPE ≥8.5`,`${load.hard_days_7} sessions at RPE ≥8.5 in the last 7 days`));
  if(load.load_change_pct!=null&&load.load_change_pct>=30)
    signals.push(L(`Haftalık sRPE %${load.load_change_pct} arttı (${load.srpe_prev7} → ${load.srpe7} AU)`,
                   `Weekly sRPE up ${load.load_change_pct}% (${load.srpe_prev7} → ${load.srpe7} AU)`));
  if(well.cluster)
    signals.push(L(`${well.signals.length} wellness sinyali aynı anda — tek bir düşük skordan güçlü`,
                   `${well.signals.length} wellness signals at once — stronger than any single low score`));
  return{score:rd.score==null?null:+Number(rd.score).toFixed(1),
    src:rd.src,date:rd.date,stale:!!rd.stale,estimated:rd.src==='srpe',
    status,band,signals,wellness:well,load};
}

/* ---- Competition context (§18) -------------------------------------------
   The competition-relative day is arithmetic on the fixture list, so it is done
   here and handed over as a label. A game inside the last DI_MD_BACK days reads as
   MD+n (the recovery side is what matters right after one); otherwise the next
   fixture inside DI_MD_FWD days reads as MD-n. */
const DI_MD_BACK=2;
const DI_MD_FWD=7;
function diCompetition(setup,ref){
  const comps=[...(((setup||{}).competitions)||[])].filter(c=>c&&c.date)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const onDay=comps.find(c=>c.date===ref)||null;
  const next=comps.find(c=>c.date>ref)||null;
  const prev=[...comps].reverse().find(c=>c.date<ref)||null;
  const until=next?diffD(ref,next.date):null;
  const since=prev?diffD(prev.date,ref):null;
  const label=onDay?'MD':(since!=null&&since<=DI_MD_BACK?`MD+${since}`
    :(until!=null&&until<=DI_MD_FWD?`MD-${until}`:null));
  const inDays=n=>comps.filter(c=>c.date>ref&&diffD(ref,c.date)<=n).length;
  const next7=inDays(7);
  /* Back-to-back means two fixtures on consecutive days anywhere in the window that
     decides today — the day before and the week ahead — because either side of one
     changes what today can be. */
  const b2b=comps.some((c,i)=>{
    const n=comps[i+1];
    if(!n||diffD(c.date,n.date)!==1)return false;
    return Math.abs(diffD(ref,c.date))<=7||Math.abs(diffD(ref,n.date))<=7;
  });
  return{today:onDay?{date:onDay.date,name:onDay.name||''}:null,
    next:next?{date:next.date,name:next.name||'',days_until:until}:null,
    previous:prev?{date:prev.date,name:prev.name||'',days_since:since}:null,
    md:label,games_next_7:next7,games_next_14:inDays(14),back_to_back:b2b,
    density:next7>=2?'high':(next7===1?'normal':'low')};
}

/* ---- Playing time (§19) ---------------------------------------------------
   Minutes played is the duration the athlete recorded against the GAME slot of
   their own sRPE log — the one place CoachOS already knows how long a player was
   actually on court, as opposed to how long the game lasted. */
function diPlayingTime(ath,ref){
  const rows=[...(ath.srpeLog||[])].filter(e=>e.date&&e.date<=ref&&recNum(e.gameDuration)!=null)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const last=rows[rows.length-1]||null;
  const from=fmt(addD(parseD(ref),-6));
  const week=rows.filter(e=>e.date>=from);
  const mins=week.reduce((s,e)=>s+(recNum(e.gameDuration)||0),0);
  return{last:last?{date:last.date,minutes:recNum(last.gameDuration),
      rpe:recNum(last.gameRPE),load:Math.round((recNum(last.gameRPE)||0)*(recNum(last.gameDuration)||0)),
      days_since:diffD(last.date,ref)}:null,
    minutes_7:mins||null,games_7:week.length,
    recorded:rows.length>0};
}

/* ---- Season phase (§20) ---------------------------------------------------
   Read off the macrocycle the coach already set up rather than asked for a second
   time: General Preparation is the off-season's work, Specific Preparation the
   preseason's, Competition the in-season. Playoffs is the one phase the period list
   has no row for, so it is inferred — a fixture named like one inside three weeks,
   or the closing stretch of the competition period. */
const DI_PHASES=[
  {id:'off',    period:'gp',   label:['Sezon dışı','Off-season'],
    focus:[['Kuvvet','Strength'],['Hipertrofi','Hypertrophy'],['Mobilite','Mobility'],['Hareket kalitesi','Movement quality'],['Kapasite','Capacity'],['Sürat','Speed']]},
  {id:'pre',    period:'sp',   label:['Sezon öncesi','Preseason'],
    focus:[['Özel hazırlık','Specific preparation'],['Kuvvet → Güç geçişi','Strength → power transition'],['Sürat','Speed'],['Yön değiştirme','COD'],['Kondisyon','Conditioning'],['Basketbola özgü yüklenme','Basketball-specific exposure']]},
  {id:'in',     period:'comp', label:['Sezon içi','In-season'],
    focus:[['Kuvvet koruma','Strength maintenance'],['Güç koruma','Power maintenance'],['Toparlanma','Recovery'],['Yorgunluk yönetimi','Fatigue management']]},
  {id:'playoff',period:'comp', label:['Play-off','Playoffs'],
    focus:[['Performans koruma','Performance preservation'],['Toparlanma','Recovery'],['Yüksek kaliteli antrenman','High-quality training'],['Gereksiz hacmin azaltılması','Unnecessary volume reduction']]},
  {id:'trans',  period:'trans',label:['Geçiş','Transition'],
    focus:[['Toparlanma','Recovery'],['Genel hazırlık','General preparation']]},
];
const DI_PLAYOFF_RE=/playoff|play-off|final|çeyrek|yarı ?final|elemin|elimination|conference/i;
function diSeasonPhase(setup,ref){
  const s=setup||{};
  const periods=getPeriods(s)||[];
  const p=periods.find(x=>ref>=x.start&&ref<=x.end)||null;
  const comps=[...((s.competitions)||[])].filter(c=>c&&c.date).sort((a,b)=>a.date.localeCompare(b.date));
  let id=p?((DI_PHASES.find(x=>x.period===p.id)||{}).id||'in'):null;
  if(id==='in'){
    const near=comps.find(c=>c.date>=ref&&diffD(ref,c.date)<=21&&DI_PLAYOFF_RE.test(c.name||''));
    const comp=periods.find(x=>x.id==='comp');
    const tail=comp&&diffD(comp.start,comp.end)>0
      &&diffD(comp.start,ref)/diffD(comp.start,comp.end)>=0.85;
    if(near||tail)id='playoff';
  }
  const row=DI_PHASES.find(x=>x.id===id)||null;
  return{id,label:row?row.label:null,
    focus:row?row.focus:[],
    period:p?{id:p.id,name:p.name,start:p.start,end:p.end}:null,
    in_season_window:!!p};
}

/* ---- Training exposure (§16) ---------------------------------------------
   Derived from the Unified Training Log (§15) — the athlete's own calendar — rather
   than from a second load-monitoring system built beside it. One pass over the
   sessions in the window, every exercise classified by the movement pattern the row
   carries (or the library's, or its name), and counted in sets. */
const DI_EXPOSURE_CATS=[
  {id:'lower', label:['Alt vücut kuvvet','Lower-body strength'],pat:['Squat','Hinge','Lunge / Unilateral']},
  {id:'squat', label:['Squat','Squat'],                        pat:['Squat']},
  {id:'hinge', label:['Hinge','Hinge'],                        pat:['Hinge']},
  {id:'uni',   label:['Tek taraflı','Unilateral'],             pat:['Lunge / Unilateral']},
  {id:'jump',  label:['Sıçrama','Jumping'],                    pat:['Jump / Plyo']},
  {id:'sprint',label:['Sprint','Sprint'],                      pat:['Sprint / Locomotion'],kw:['sprint','hız koşu','flying','accel','ivmelen']},
  {id:'decel', label:['Yavaşlama','Deceleration'],             pat:[],kw:['decel','yavaşla','fren','landing','iniş','stop','absorb','braking']},
  {id:'cod',   label:['Yön değiştirme','Change of direction'], pat:[],kw:['cod','yön değiş','cutting','shuffle','agility','çeviklik','5-0-5','505','zig','t-test','lane agility','pro agility']},
  {id:'push',  label:['Üst vücut itiş','Upper push'],          pat:['Push']},
  {id:'pull',  label:['Üst vücut çekiş','Upper pull'],         pat:['Pull']},
];
/* Sets per day that read as low / moderate / high. Scaled by the window so a
   3-day and a 7-day read mean the same thing about how hard a quality has been hit. */
const DI_EXP_LEVELS=[
  {id:'none',    per:0,   label:['Yok','None']},
  {id:'low',     per:0.34,label:['Düşük','Low']},
  {id:'moderate',per:2,   label:['Orta','Moderate']},
  {id:'high',    per:4,   label:['Yüksek','High']},
];
function diExpLevel(sets,days){
  let out=DI_EXP_LEVELS[0];
  DI_EXP_LEVELS.forEach(l=>{if(sets>=l.per*days)out=l;});
  return out;
}
/* One exercise row → the exposure categories it counts towards. The pattern the row
   carries wins (it is what the coach tagged it with on the sheet), then the
   library's, then the name. A row that matches nothing is not forced into a
   category — an uncategorised lift is better than a wrong one. */
function diRowCats(row,libMap){
  const name=String(row.name||'').trim();
  if(!name)return[];
  const lib=libMap?libMap[name.toLowerCase()]:null;
  const pat=String(row.pattern||'').trim()||(lib?exPatternOf(lib):'')||'';
  const low=name.toLowerCase();
  const out=[];
  DI_EXPOSURE_CATS.forEach(c=>{
    if(pat&&(c.pat||[]).includes(pat)){out.push(c.id);return;}
    if((c.kw||[]).some(k=>low.includes(k)))out.push(c.id);
  });
  return out;
}
/* Every exercise row the athlete has on their own calendar in a date range, with
   the session it came from. This is the single read the exposure summary, the
   per-exercise history and the tolerance read all go through — §15's point is that
   there is one log, not two. */
function diLogRows(ath,from,to){
  const out=[];
  let c=parseD(from);const e=parseD(to);
  while(c<=e){
    const dk=fmt(c);
    (((ath.days||{})[dk]||{}).sessions||[]).forEach(s=>{
      (s.blocks||[]).forEach(b=>(b.exercises||[]).forEach(x=>{
        if(!x||!String(x.name||'').trim())return;
        out.push({date:dk,session:s.name||'',block:b.name||'',row:x,
          sets:recNum(x.sets)||0,reps:x.reps,load:x.load,rpe:recNum(x.rpe),
          tempo:x.tempo,rest:x.rest,duration:x.duration});
      }));
    });
    c=addD(c,1);
  }
  return out;
}
function diExposure(ath,ref,opts){
  const o=opts||{};
  const days=o.days||3;
  const libMap=o.libMap||null;
  // The window ENDS yesterday: today's programme is what is being decided, so counting
  // it as exposure would have the sheet justify itself with its own contents.
  const to=fmt(addD(parseD(ref),-1)),from=fmt(addD(parseD(ref),-days));
  const rows=diLogRows(ath,from,to);
  const tally={};DI_EXPOSURE_CATS.forEach(c=>tally[c.id]={sets:0,names:new Set()});
  rows.forEach(r=>{
    const sets=r.sets||1;
    diRowCats(r.row,libMap).forEach(id=>{tally[id].sets+=sets;tally[id].names.add(String(r.row.name).trim());});
  });
  const sessions=new Set(rows.map(r=>r.date+'|'+r.session)).size;
  return{window_days:days,from,to,sessions,logged_rows:rows.length,
    categories:DI_EXPOSURE_CATS.map(c=>{
      const t=tally[c.id];const lv=diExpLevel(t.sets,days);
      return{id:c.id,label:c.label,sets:t.sets,level:lv.id,level_label:lv.label,
        exercises:[...t.names].slice(0,6)};
    })};
}

/* ---- Exercise history & tolerance (§15, §39.7) ---------------------------
   "How did this athlete do Bulgarian Split Squat over the last four weeks?" is
   answered from the same log as "what was their exposure this week" — no separate
   exercise-history model (§15). Tolerance is the honest V1 version of §35: what the
   athlete reported the MORNING AFTER each exposure, next to what they reported the
   morning before it. It is an observation, not a claim about cause. */
const diExName=s=>String(s||'').toLowerCase().replace(/[^a-zçğıöşü0-9]+/g,' ').trim();
function diExerciseHistory(ath,name,ref,days){
  const key=diExName(name);
  if(!key)return null;
  const win=days||28;
  const rows=diLogRows(ath,fmt(addD(parseD(ref),-win)),fmt(addD(parseD(ref),-1)))
    .filter(r=>{const n=diExName(r.row.name);return n===key||n.includes(key)||key.includes(n);});
  if(!rows.length)return null;
  return{exercise:name,window_days:win,exposures:rows.length,
    last:rows[rows.length-1].date,
    sessions:rows.slice(-6).map(r=>({date:r.date,sets:r.sets||null,reps:r.row.reps||null,
      load:r.row.load||null,rpe:r.rpe==null?null:r.rpe}))};
}
function diTolerance(ath,name,ref,days){
  const h=diExerciseHistory(ath,name,ref,days||42);
  if(!h)return null;
  const wl=(ath.wellness||[]).filter(w=>w.date).sort((a,b)=>a.date.localeCompare(b.date));
  const at=dk=>wl.filter(w=>w.date<=dk).pop()||null;
  const on=dk=>wl.find(w=>w.date===dk)||null;
  const deltas=[];
  h.sessions.forEach(s=>{
    const before=at(s.date),after=on(fmt(addD(parseD(s.date),1)));
    const b=before?recNum(before.soreness):null,a=after?recNum(after.soreness):null;
    if(b!=null&&a!=null)deltas.push(+(a-b).toFixed(1));
  });
  if(!deltas.length)return{exercise:name,exposures:h.exposures,next_day_soreness:null,
    note:L('Sonraki gün check-in eşleşmesi yok','No next-day check-in to pair with')};
  const mean=+(deltas.reduce((x,y)=>x+y,0)/deltas.length).toFixed(1);
  return{exercise:name,exposures:h.exposures,paired_days:deltas.length,
    /* Soreness is rated with 5 as the good end, so a NEGATIVE mean is soreness getting
       worse the morning after. Named in words here so nothing has to remember that. */
    next_day_soreness:mean,
    reading:mean<=-0.5?L('sonraki gün kas ağrısı artıyor','soreness up the next day')
      :(mean>=0.5?L('sonraki gün kas ağrısı azalıyor','soreness down the next day')
        :L('sonraki gün belirgin değişiklik yok','no clear next-day change'))};
}

/* ---- Athlete Training Profile ----------------------------------------------
   The athlete as a trainee, in three parts: every physical quality on one template,
   each with how much the current period develops it (Priority) — the Athletic Profile; what training has to respect (Constraints); and
   what the athlete has actually been exposed to lately (Exercise Exposure).

   It DESCRIBES the athlete. Nothing in the app picks an exercise or writes a session
   from it; it is handed to the individualization JSON beside the rest of the athlete's
   data, as ground for whoever writes the session. The first two parts are the coach's,
   stored under `ath.trainingProfile`; the third is read off the athlete's own calendar
   every time it is shown, so it cannot go stale.

   The terms are STORED and SENT in English: they are the taxonomy the profile is
   defined in, and the same words reach the JSON on every device whatever language the
   coach reads the app in. On screen they follow the app language — atpT() below puts
   each term into Turkish at the moment it is drawn, and nothing else. */
const atpId=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const atpItems=list=>list.map(en=>({id:atpId(en),en}));
/* Every term of the tab, English → Turkish. One list for all three parts, keyed by the
   English word, so a term that appears in two places (Acceleration is a quality and a
   stimulus) cannot be translated two ways. */
const ATP_TR={
  /* titles */
  'Athlete Training Profile':'Sporcu Antrenman Profili','Athletic Profile':'Atletik Profil',
  'Constraints':'Kısıtlar','Exercise Exposure':'Egzersiz Maruziyeti',
  /* the template: groups and qualities */
  'Speed':'Sürat','Change of Direction':'Yön Değiştirme','Plyometric / Reactive':'Pliometrik / Reaktif',
  'Strength':'Kuvvet','Power':'Güç','Movement Quality':'Hareket Kalitesi','Conditioning':'Kondisyon',
  'Acceleration':'İvmelenme','Max Velocity':'Maksimal Hız','Sprint Mechanics':'Sprint Mekaniği',
  'Deceleration':'Yavaşlama','Lateral Movement':'Lateral Hareket',
  'Jumping':'Sıçrama','Landing':'İniş','Hopping':'Sekme',
  'Squat':'Squat','Hinge':'Kalça Menteşesi','Unilateral':'Tek Taraflı',
  'Horizontal Push':'Yatay İtme','Horizontal Pull':'Yatay Çekme','Vertical Push':'Dikey İtme','Vertical Pull':'Dikey Çekme',
  'Lower-Body Strength':'Alt Vücut Kuvveti','Upper-Body Strength':'Üst Vücut Kuvveti','Unilateral Strength':'Tek Taraflı Kuvvet',
  'Lower-Body Power':'Alt Vücut Gücü','Upper-Body Power':'Üst Vücut Gücü','Rate of Force Development':'Kuvvet Gelişim Hızı',
  'Mobility':'Hareketlilik','Stability':'Stabilite','Coordination':'Koordinasyon','Balance':'Denge',
  'Aerobic Capacity':'Aerobik Kapasite','Anaerobic Capacity':'Anaerobik Kapasite','Repeat Sprint Ability':'Tekrarlı Sprint Yeteneği',
  /* the priority scale (Moderate is an exposure level) */
  'Priority':'Öncelik','Moderate':'Orta','High':'Yüksek','Medium':'Orta','Low':'Düşük',
  /* exposure patterns that are not template qualities */
  'Lunge':'Lunge','Knee Dominant':'Diz Baskın','Hip Dominant':'Kalça Baskın',
  'Anti-Extension':'Anti-Ekstansiyon','Anti-Rotation':'Anti-Rotasyon','Anti-Lateral Flexion':'Anti-Lateral Fleksiyon','Rotation':'Rotasyon',
  /* constraints */
  'Hard':'Kesin','Soft':'Esnek','Hard Constraints':'Kesin Kısıtlar','Soft Constraints':'Esnek Kısıtlar',
  'Load':'Yük','Volume':'Hacim','Movement':'Hareket','Intensity':'Şiddet','Impact':'Darbe','Equipment':'Ekipman','Contact':'Temas',
  'Maximum Load':'Maksimum Yük','Reduced Load':'Azaltılmış Yük','No Heavy Loading':'Ağır Yüklenme Yok',
  'No Bilateral Loading':'Çift Taraflı Yüklenme Yok','No Unilateral Loading':'Tek Taraflı Yüklenme Yok',
  'Prefer Unilateral':'Tek Taraflı Tercih Et','Maximum Volume':'Maksimum Hacim','Limited Sets':'Sınırlı Set',
  'Limited Repetitions':'Sınırlı Tekrar','Limit Eccentric Volume':'Eksantrik Hacmi Sınırla',
  'Limit Knee-Dominant Volume':'Diz Baskın Hacmi Sınırla','Limit Repeated Exposure':'Tekrarlı Maruziyeti Sınırla',
  'Maximum RPE':'Maksimum RPE','Maximum Intensity':'Maksimum Şiddet','Submaximal Only':'Yalnızca Submaksimal',
  'Prefer Low-Fatigue Work':'Düşük Yorgunluklu Çalışma Tercih Et','No Maximal Sprint':'Maksimal Sprint Yok',
  'Submaximal Sprint':'Submaksimal Sprint','Limited Acceleration':'Sınırlı İvmelenme','No Jumping':'Sıçrama Yok',
  'No High-Impact Jumping':'Yüksek Darbeli Sıçrama Yok','Limited Jumping':'Sınırlı Sıçrama','Low-Impact Only':'Yalnızca Düşük Darbe',
  'Limit High-Impact Work':'Yüksek Darbeli Çalışmayı Sınırla','Limited ROM':'Sınırlı Hareket Açıklığı (ROM)',
  'Limited Knee Flexion':'Sınırlı Diz Fleksiyonu','No Overhead Movement':'Baş Üstü Hareket Yok',
  'Limited Overhead Movement':'Sınırlı Baş Üstü Hareket','Limited Rotation':'Sınırlı Rotasyon',
  'Prefer Stable Exercises':'Stabil Egzersizleri Tercih Et','No Barbell':'Barbell Yok','No Machine':'Makine Yok',
  'No Cable':'Kablo Yok','Prefer Dumbbell':'Dambıl Tercih Et','No Contact':'Temas Yok','Limited Contact':'Sınırlı Temas',
  /* exposure: windows, levels, table, layers */
  'Last Session':'Son Seans','Last 7 Days':'Son 7 Gün','Last 14 Days':'Son 14 Gün','Last 28 Days':'Son 28 Gün',
  'None / Not Recent':'Yakın Dönemde Yok','None':'Yok',
  'Exercise Level':'Egzersiz Düzeyi','Exercise':'Egzersiz','Exercise Family':'Egzersiz Ailesi','Movement Pattern':'Hareket Paterni',
  'Stimulus · Loading':'Uyaran · Yüklenme','Last Used':'Son Kullanım','Frequency':'Sıklık','Recent Exposure':'Son Maruziyet',
  'Athletic Stimulus':'Atletik Uyaran','Loading Characteristic':'Yüklenme Karakteri',
  'Unilateral Knee Dominant':'Tek Taraflı Diz Baskın','Unilateral Hip Dominant':'Tek Taraflı Kalça Baskın',
  'Anti-Flexion':'Anti-Fleksiyon','Trunk Flexion / Extension':'Gövde Fleksiyon / Ekstansiyon','Full Body':'Tüm Vücut',
  'Carry':'Taşıma','Ankle / Calf':'Ayak Bileği / Baldır','Plyometric':'Pliometrik','Sprint / Locomotion':'Sprint / Lokomosyon',
  'Stability / Balance':'Stabilite / Denge',
  'Hopping / Bounding':'Sekme / Bounding','Reactive / Depth':'Reaktif / Derinlik','Throwing':'Fırlatma',
  'Heavy Loading':'Ağır Yüklenme','High-Velocity':'Yüksek Hız','Eccentric Loading':'Eksantrik Yüklenme','Isometric':'İzometrik',
  'Ballistic':'Balistik',
  'Olympic Lift Family':'Olimpik Halter Ailesi','Sprint Family':'Sprint Ailesi','Deceleration Family':'Yavaşlama Ailesi',
  'COD / Agility Family':'Yön Değiştirme / Çeviklik Ailesi','Landing Family':'İniş Ailesi',
  'Depth / Drop Jump Family':'Derinlik / Düşme Sıçraması Ailesi','Hop / Bound Family':'Sekme / Bounding Ailesi',
  'Jump Family':'Sıçrama Ailesi','Med Ball Throw Family':'Sağlık Topu Fırlatma Ailesi','Split Squat Family':'Split Squat Ailesi',
  'Lunge Family':'Lunge Ailesi','Step-Up Family':'Step-Up Ailesi','Squat Family':'Squat Ailesi',
  'Hip Thrust / Bridge Family':'Hip Thrust / Köprü Ailesi','Hamstring Curl Family':'Hamstring Curl Ailesi',
  'Hinge Family':'Kalça Menteşesi Ailesi','Calf / Ankle Family':'Baldır / Ayak Bileği Ailesi',
  'Vertical Pull Family':'Dikey Çekme Ailesi','Horizontal Pull Family':'Yatay Çekme Ailesi',
  'Vertical Press Family':'Dikey İtme Ailesi','Horizontal Press Family':'Yatay İtme Ailesi','Carry Family':'Taşıma Ailesi',
  'Anti-Rotation Family':'Anti-Rotasyon Ailesi','Anti-Lateral Flexion Family':'Anti-Lateral Fleksiyon Ailesi',
  'Anti-Extension Family':'Anti-Ekstansiyon Ailesi','Rotation Family':'Rotasyon Ailesi','Trunk Flexion Family':'Gövde Fleksiyon Ailesi',
  'Mobility Family':'Hareketlilik Ailesi','Knee Dominant (Other)':'Diz Baskın (Diğer)','Hip Dominant (Other)':'Kalça Baskın (Diğer)',
  'Upper Body Push (Other)':'Üst Vücut İtme (Diğer)','Upper Body Pull (Other)':'Üst Vücut Çekme (Diğer)','Core (Other)':'Core (Diğer)',
  'Full Body (Other)':'Tüm Vücut (Diğer)','Unclassified':'Sınıflandırılmamış',
};
/* A term in the app language. A family named after a library type ("Warm-Up Family")
   is not in the list; it is read as that type's own Turkish name plus "Ailesi". */
function atpT(en){
  if(REPORT_LANG!=='tr'||!en)return en;
  if(ATP_TR[en])return ATP_TR[en];
  const f=/^(.+) Family$/.exec(en);
  return f?`${exLabel(f[1])} Ailesi`:en;
}
/* The short form a level carries on its button. */
const atpAb=l=>REPORT_LANG==='tr'?l.abTr:l.ab;
/* The one template the profile is written on: seven groups, every quality in them rated
   on the same scale — Priority (how much the current period develops it). The ids are the English words, so a quality keeps its id
   whatever the screen is read in. Only physical qualities are on it: how the work is
   spread over movement patterns (squat, hinge, push, pull…) is read off the calendar by
   Exercise Exposure, so it is not rated here a second time. */
const ATP_GROUPS=[
  {id:'speed',       en:'Speed',                items:atpItems(['Acceleration','Max Velocity'])},
  {id:'cod',         en:'Change of Direction',  items:atpItems(['Deceleration','Change of Direction'])},
  {id:'plyo',        en:'Plyometric / Reactive',items:atpItems(['Jumping','Landing'])},
  {id:'strength',    en:'Strength',             items:atpItems(['Lower-Body Strength','Upper-Body Strength','Unilateral Strength'])},
  {id:'power',       en:'Power',                items:atpItems(['Lower-Body Power','Upper-Body Power','Rate of Force Development'])},
  {id:'movement',    en:'Movement Quality',     items:atpItems(['Mobility','Stability','Coordination'])},
  {id:'conditioning',en:'Conditioning',         items:atpItems(['Aerobic Capacity','Anaerobic Capacity','Repeat Sprint Ability'])},
];
const ATP_QUALITIES=ATP_GROUPS.flatMap(g=>g.items.map(it=>({...it,group:g.en})));
const ATP_PRIORITY=[
  {id:'high',  en:'High',  ab:'HIGH',abTr:'YÜKSEK',bars:3,dTr:'Bu dönemin ana gelişim alanı.',dEn:'A main development area this period.'},
  {id:'medium',en:'Medium',ab:'MED', abTr:'ORTA',  bars:2,dTr:'Geliştirilecek, ama High\'dan sonra.',dEn:'To develop, but after High.'},
  {id:'low',   en:'Low',   ab:'LOW', abTr:'DÜŞÜK', bars:1,dTr:'Korunur; gelişim önceliği yok.',dEn:'Kept as it is; no development priority.'},
];
/* The profile used to be two sections — Training Priorities (Primary / Secondary /
   Maintain on 31 qualities) and a Movement Profile (Status + Priority on 29 movements).
   A profile saved that way is read into the one template: a quality takes the
   priority its movement row had, and a priority level stands in for a missing
   priority (Primary → High, Secondary → Medium, Maintain → Low). The old names that
   are the same quality under another word are read as it. Ratings with no place in the
   template are left behind. */
const ATP_LEGACY_LEVEL={primary:'high',secondary:'medium',maintain:'low'};
/* The ids a quality is also read from: the old names of the same quality, and the items
   the template once had and has since folded into it (Sprint Mechanics into
   Acceleration, Lateral Movement into Change of Direction, Hopping into Jumping, the
   seven movement patterns into Lower-Body / Upper-Body / Unilateral Strength, Balance
   into Stability). A quality takes the highest priority any of its ids carries, so
   folding never lowers one; the next save keeps only the template's own ids. */
const ATP_LEGACY_ALIAS={
  acceleration:['sprint_mechanics'],
  change_of_direction:['lateral_movement'],
  jumping:['hopping','jump_ability'],landing:['landing_ability'],
  lower_body_strength:['squat','hinge'],
  upper_body_strength:['horizontal_push','horizontal_pull','vertical_push','vertical_pull'],
  unilateral_strength:['unilateral'],
  stability:['balance'],
};
const ATP_CON_CATS=[
  {id:'load',en:'Load'},{id:'volume',en:'Volume'},{id:'intensity',en:'Intensity'},
  {id:'speed',en:'Speed'},{id:'impact',en:'Impact'},{id:'movement',en:'Movement'},
  {id:'equipment',en:'Equipment'},{id:'contact',en:'Contact'},
];
/* `kind` is the list a constraint may sit on. A "No …" is a rule by its own wording and
   only goes on Hard; a "Prefer …" / "Limit …" is a lean and only goes on Soft; a cap, a
   reduction or a limited range is whichever the coach says it is. `ph` marks the ones
   that carry their own number — the cap itself — and hints at how it is written. */
const ATP_CONSTRAINTS=[
  {id:'max_load',           cat:'load',     en:'Maximum Load',              kind:'any', ph:['ör. 60 kg / %70 1RM','e.g. 60 kg / 70% 1RM']},
  {id:'reduced_load',       cat:'load',     en:'Reduced Load',              kind:'any', ph:['ör. %20 azalt','e.g. −20%']},
  {id:'no_heavy_load',      cat:'load',     en:'No Heavy Loading',          kind:'hard'},
  {id:'no_bilateral_load',  cat:'load',     en:'No Bilateral Loading',      kind:'hard'},
  {id:'no_unilateral_load', cat:'load',     en:'No Unilateral Loading',     kind:'hard'},
  {id:'prefer_unilateral',  cat:'load',     en:'Prefer Unilateral',         kind:'soft'},
  {id:'max_volume',         cat:'volume',   en:'Maximum Volume',            kind:'any', ph:['ör. seans başına 12 set','e.g. 12 sets per session']},
  {id:'limited_sets',       cat:'volume',   en:'Limited Sets',              kind:'any', ph:['ör. egzersiz başına maks 3','e.g. max 3 per exercise']},
  {id:'limited_reps',       cat:'volume',   en:'Limited Repetitions',       kind:'any', ph:['ör. set başına maks 6','e.g. max 6 per set']},
  {id:'limit_ecc_volume',   cat:'volume',   en:'Limit Eccentric Volume',    kind:'soft'},
  {id:'limit_knee_volume',  cat:'volume',   en:'Limit Knee-Dominant Volume',kind:'soft'},
  {id:'limit_repeated',     cat:'volume',   en:'Limit Repeated Exposure',   kind:'soft'},
  {id:'max_rpe',            cat:'intensity',en:'Maximum RPE',               kind:'any', ph:['ör. RPE 7','e.g. RPE 7']},
  {id:'max_intensity',      cat:'intensity',en:'Maximum Intensity',         kind:'any', ph:['ör. %75 1RM','e.g. 75% 1RM']},
  {id:'submaximal_only',    cat:'intensity',en:'Submaximal Only',           kind:'any'},
  {id:'prefer_low_fatigue', cat:'intensity',en:'Prefer Low-Fatigue Work',   kind:'soft'},
  {id:'no_max_sprint',      cat:'speed',    en:'No Maximal Sprint',         kind:'hard'},
  {id:'submax_sprint',      cat:'speed',    en:'Submaximal Sprint',         kind:'any', ph:['ör. maks %80 hız','e.g. max 80% speed']},
  {id:'limited_accel',      cat:'speed',    en:'Limited Acceleration',      kind:'any'},
  {id:'no_jumping',         cat:'impact',   en:'No Jumping',                kind:'hard'},
  {id:'no_high_impact_jump',cat:'impact',   en:'No High-Impact Jumping',    kind:'hard'},
  {id:'limited_jumping',    cat:'impact',   en:'Limited Jumping',           kind:'any', ph:['ör. maks 40 temas','e.g. max 40 contacts']},
  {id:'low_impact_only',    cat:'impact',   en:'Low-Impact Only',           kind:'any'},
  {id:'limit_high_impact',  cat:'impact',   en:'Limit High-Impact Work',    kind:'soft'},
  {id:'limited_rom',        cat:'movement', en:'Limited ROM',               kind:'any', ph:['ör. sol omuz, 90° üstü yok','e.g. left shoulder, nothing above 90°']},
  {id:'limited_knee_flex',  cat:'movement', en:'Limited Knee Flexion',      kind:'any', ph:['ör. maks 90°','e.g. max 90°']},
  {id:'no_overhead',        cat:'movement', en:'No Overhead Movement',      kind:'hard'},
  {id:'limited_overhead',   cat:'movement', en:'Limited Overhead Movement', kind:'any'},
  {id:'limited_rotation',   cat:'movement', en:'Limited Rotation',          kind:'any'},
  {id:'prefer_stable',      cat:'movement', en:'Prefer Stable Exercises',   kind:'soft'},
  {id:'no_barbell',         cat:'equipment',en:'No Barbell',                kind:'hard'},
  {id:'no_machine',         cat:'equipment',en:'No Machine',                kind:'hard'},
  {id:'no_cable',           cat:'equipment',en:'No Cable',                  kind:'hard'},
  {id:'prefer_dumbbell',    cat:'equipment',en:'Prefer Dumbbell',           kind:'soft'},
  {id:'no_contact',         cat:'contact',  en:'No Contact',                kind:'hard'},
  {id:'limited_contact',    cat:'contact',  en:'Limited Contact',           kind:'any'},
];
/* The examples each list was specified with — offered first, one tap each. */
const ATP_CON_SUGGEST={
  hard:['no_max_sprint','no_high_impact_jump','no_heavy_load','no_bilateral_load','no_unilateral_load','no_overhead',
    'no_contact','no_barbell','limited_rom','limited_knee_flex','limited_rotation'],
  soft:['prefer_unilateral','prefer_dumbbell','limit_ecc_volume','limit_knee_volume','prefer_low_fatigue',
    'limit_high_impact','prefer_stable','limit_repeated'],
};
const atpConDef=id=>ATP_CONSTRAINTS.find(c=>c.id===id)||null;
const atpConFits=(def,kind)=>!def||def.kind==='any'||def.kind===kind;
const atpConLabel=c=>{const d=atpConDef(c&&c.id);return d?d.en:String((c&&c.label)||'').trim();};
const atpConCat=c=>{const d=atpConDef(c&&c.id);return(d?d.cat:(c&&c.cat))||'';};
const atpCatLabel=id=>((ATP_CON_CATS.find(x=>x.id===id)||{}).en)||'';
/* The stored profile, read defensively. Hard and Soft are two lists and stay two: a
   constraint that somehow sits on both is kept where it is strictest, on Hard. A
   profile written before the template was one (see ATP_LEGACY_LEVEL) is read into it;
   once the coach changes anything it is saved in the new shape. */
function atpRead(ath){
  const tp=(ath&&ath.trainingProfile&&typeof ath.trainingProfile==='object')?ath.trainingProfile:{};
  const obj=v=>(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
  const okP=v=>ATP_PRIORITY.some(x=>x.id===v)?v:null;
  const qualities={};
  /* Only the priority is kept — a Status saved before it was dropped is left behind.
     Of several candidates (a quality and the ids folded into it) the highest wins. */
  const top=list=>{const ok=list.map(okP).filter(Boolean);
    return ok.length?ok.reduce((a,b)=>ATP_PRIORITY.findIndex(p=>p.id===b)<ATP_PRIORITY.findIndex(p=>p.id===a)?b:a):null;};
  const put=(id,pr)=>{if(pr)qualities[id]={priority:pr};};
  const idsOf=it=>[it.id,...(ATP_LEGACY_ALIAS[it.id]||[])];
  if(tp.qualities&&typeof tp.qualities==='object'){
    const q=obj(tp.qualities);
    ATP_QUALITIES.forEach(it=>put(it.id,top(idsOf(it).map(k=>obj(q[k]).priority))));
  }else{
    const mv=obj(tp.movement),pri=obj(tp.priorities);
    ATP_QUALITIES.forEach(it=>{
      const ids=idsOf(it);
      put(it.id,top([...ids.map(k=>obj(mv[k]).priority),...ids.map(k=>ATP_LEGACY_LEVEL[pri[k]])]));
    });
  }
  const con=obj(tp.constraints);
  const list=v=>(Array.isArray(v)?v:[]).filter(c=>c&&c.id&&atpConLabel(c));
  const hard=list(con.hard),hardIds=new Set(hard.map(c=>c.id));
  return{qualities,
    constraints:{hard,soft:list(con.soft).filter(c=>!hardIds.has(c.id))},updated:tp.updated||null};
}

/* ---- Exercise Exposure ------------------------------------------------------
   Read off the athlete's own calendar — the one training log (§15) — never typed in.
   Every exercise row is filed on five layers at once: the exercise itself, the family
   it belongs to, the movement pattern(s) it trains, the athletic stimulus it delivers
   and how it loads the body; every layer is counted in sets over four windows. */
const ATP_EXP_WINDOWS=[
  {id:'last',en:'Last Session',days:0},
  {id:'d7',  en:'Last 7 Days', days:7},
  {id:'d14', en:'Last 14 Days',days:14},
  {id:'d28', en:'Last 28 Days',days:28},
];
const ATP_EXP_LEVELS=[
  {id:'none',    en:'None / Not Recent',ab:'None',    abTr:'Yok',   dTr:'Yakın dönemde maruziyet bulunmuyor.',dEn:'No recent exposure.'},
  {id:'low',     en:'Low',              ab:'Low',     abTr:'Düşük', dTr:'Düşük düzeyde maruziyet.',dEn:'Low exposure.'},
  {id:'moderate',en:'Moderate',         ab:'Moderate',abTr:'Orta',  dTr:'Orta düzeyde maruziyet.',dEn:'Moderate exposure.'},
  {id:'high',    en:'High',             ab:'High',    abTr:'Yüksek',dTr:'Yakın dönemde yüksek maruziyet.',dEn:'High recent exposure.'},
];
/* Sets that read as Moderate / High. A day window is read per week (sets × 7 / days),
   so a 7-day and a 28-day read mean the same thing; the last session is read as it
   stands. One exercise needs fewer sets than a whole pattern to count as "a lot". */
const ATP_EXP_CUT={
  exercise:{week:[3,6],session:[2,4]},
  group:   {week:[6,12],session:[4,8]},
};
function atpExpLevel(sets,kind,days){
  if(!(sets>0))return'none';
  const c=ATP_EXP_CUT[kind]||ATP_EXP_CUT.group;
  const[m,h]=days?c.week:c.session;
  const v=days?sets*7/days:sets;
  return v>=h?'high':v>=m?'moderate':'low';
}
const ATP_EXP_PATTERNS=['Knee Dominant','Hip Dominant','Squat','Hinge','Lunge','Unilateral Knee Dominant','Unilateral Hip Dominant',
  'Horizontal Push','Horizontal Pull','Vertical Push','Vertical Pull','Anti-Extension','Anti-Rotation','Anti-Lateral Flexion',
  'Anti-Flexion','Rotation','Trunk Flexion / Extension','Full Body','Carry','Ankle / Calf','Plyometric','Sprint / Locomotion',
  'Mobility','Stability / Balance'];
const ATP_EXP_STIMULI=['Acceleration','Max Velocity','Deceleration','Change of Direction','Lateral Movement','Jumping',
  'Landing','Hopping / Bounding','Reactive / Depth','Throwing'];
const ATP_EXP_LOADING=['Heavy Loading','High-Velocity','Eccentric Loading','Isometric','Ballistic'];
/* Strength rows (knee, hip, push, pull and core work — never a jump or a run) are also
   told apart by the four things a coach varies week to week: bilateral or unilateral,
   the plane the movement happens in, whether the load is pushed or pulled, and which
   contraction the exercise is built around. Each is read from the library entry's own
   tag when there is one and from the exercise name when the name says it; a row where
   neither says is left out of that list instead of guessed into it. */
const ATP_EXP_LATERALITY=['Bilateral','Unilateral'];
const ATP_EXP_PLANES=['Sagittal','Frontal','Transverse'];
const ATP_EXP_ACTIONS=['Push','Pull'];
const ATP_EXP_FOCUS=['Concentric','Eccentric','Isometric'];
/* The implement a row was done with, most specific first. Read only where the row, the
   library entry or the name SAYS the implement: "Romanian Deadlift" alone does not say
   barbell or dumbbell, so it is left without one rather than guessed into either. */
const ATP_EQUIP_RE=[
  ['TRX',           /\btrx\b|suspension/],
  ['Trap Bar',      /trap[- ]?bar|hex[- ]?bar/],
  ['Landmine',      /land ?mine/],
  ['Battle Rope',   /battle ?ropes?|savaş halatı/],
  ['BOSU',          /\bbosu\b/],
  ['Stability Ball',/stability ?ball|swiss ?ball|fitball|physio ?ball|pilates topu|denge topu/],
  ['Kettlebell',    /kettle ?bell|\bkb\b/],
  ['Dumbbell',      /dumbbell|dambıl|\bdbs?\b|\b2 ?db\b/],
  ['Cable',         /cable|kablo|pulldown|pull-down/],
  ['Band',          /\bbands?\b|banded|lastik/],
  ['Medicine Ball', /med(icine)?[- ]?ball|sağlık topu/],
  ['Sled',          /\bsled\b|kızak|prowler/],
  ['Machine',       /machine|makine|leg press|leg curl|leg extension|smith|hack squat/],
  ['Barbell',       /barbell|halter|\bbb\b/],
];
/* The library's own filing, as data: every category with the facets an exercise is filed by
   (its sub-type, Action and Movement Pattern for hip / knee, and the extra filters). Built
   from the same tables the library screen uses, so the coverage read below speaks the
   coach's vocabulary and cannot drift from it. */
const ATP_TAXONOMY=Object.keys(SUB_TYPES).map(type=>{
  const s=SUB_TYPES[type];
  const facets=[{label:s.label,values:s.values}];
  if(ACTIONS_FOR[type])facets.push({label:'Action',values:ACTIONS_FOR[type]});
  if(PATTERNS_FOR[type])facets.push({label:'Movement Pattern',values:PATTERNS_FOR[type]});
  (EX_EXTRA_FILTERS[type]||[]).forEach(x=>facets.push({label:x.label,values:x.values}));
  return{type,facets};
});
const atpFacetValues=(type,label)=>{
  const t=ATP_TAXONOMY.find(x=>x.type===type);
  const f=t&&t.facets.find(x=>x.label===label);
  return f?f.values:[];
};
function atpEquipmentOf(row,lib){
  const find=t=>{
    const s=String(t==null?'':t).toLowerCase();
    if(!s.trim())return'';
    if(/bodyweight|body weight|vücut ağırlığı|\bbw\b/.test(s))return'Bodyweight';
    const h=ATP_EQUIP_RE.find(([,re])=>re.test(s));
    return h?h[0]:'';
  };
  return find(exEquipText(row&&row.equipment))||find(exEquipText(lib&&lib.equipment))||find(row&&row.name)||'';
}
/* Families, read off the exercise's name, most specific first: a "Split Squat Jump" is
   a jump before it is a split squat, a "Nordic Hamstring Curl" a curl whatever else. */
const ATP_FAMILIES=[
  ['Olympic Lift Family',        /\b(clean|snatch|jerk)\b|high pull|olimpik/],
  ['Sprint Family',              /sprint|accel|ivmelen|flying|wicket|\b[ab][- ]?skip|hız koşu|resisted run|sled (push|pull|drag)|build[- ]?up|max velocity|top speed/],
  ['Deceleration Family',        /decel|yavaşla|braking|fren/],
  ['COD / Agility Family',       /\bcod\b|change of direction|yön değiş|agility|çeviklik|shuffle|cutting|5-0-5|\b505\b|zig ?zag|t-test|pro agility|lane agility|mirror drill|carioca|defensive slide/],
  ['Landing Family',             /landing|iniş|snap ?down|\bstick\b/],
  ['Depth / Drop Jump Family',   /depth|drop jump|altitude|rebound jump/],
  ['Hop / Bound Family',         /\bhops?\b|hopping|bound|pogo|sekme/],
  ['Jump Family',                /jump|sıçra|\bcmj\b|tuck/],
  ['Med Ball Throw Family',      /med ?ball|medicine ball|sağlık topu|throw|slam|scoop|shot ?put|chest pass|fırlat/],
  ['Split Squat Family',         /split squat|bulgarian|rfess|rear[- ]?foot/],
  ['Lunge Family',               /lunge|hamle/],
  ['Step-Up Family',             /step[- ]?(up|down)/],
  ['Squat Family',               /squat|çömel|wall sit|leg press|hack|pistol/],
  ['Hip Thrust / Bridge Family', /thrust|bridge|köprü/],
  ['Hamstring Curl Family',      /nordic|leg curl|hamstring curl|glute[- ]?ham|\bghr\b|slider curl|ball curl|razor curl/],
  ['Hinge Family',               /deadlift|\b(sldl|rdl)\b|romanian|good ?morning|hinge|swing|pull[- ]?through|back extension|hyperextension|stiff/],
  ['Calf / Ankle Family',        /calf|heel raise|tibialis|toe raise|ankle|baldır|ayak bileği/],
  ['Vertical Pull Family',       /pull[- ]?ups?\b|chin[- ]?ups?\b|pull ?down|\blat\b|barfiks/],
  ['Horizontal Pull Family',     /\brows?\b|rowing|face ?pull|rear delt|inverted|kürek|reverse fly|pull[- ]?apart/],
  ['Vertical Press Family',      /overhead|shoulder press|military|\bohp\b|push press|landmine press|arnold|z[- ]?press|handstand|pike push|\bdips?\b/],
  ['Horizontal Press Family',    /bench|push[- ]?ups?\b|şınav|floor press|chest press|incline|decline|\bfly\b|\bflyes?\b/],
  ['Carry Family',               /carry|farmer|suitcase|waiter|taşı/],
  ['Anti-Rotation Family',       /pallof|anti[- ]?rotation|bird ?dog|press ?out/],
  ['Anti-Lateral Flexion Family',/side ?plank|copenhagen|anti[- ]?lateral/],
  ['Anti-Extension Family',      /plank|dead ?bug|roll ?out|ab wheel|body ?saw|hollow|stir the pot|anti[- ]?extension/],
  ['Rotation Family',            /chop|twist|rotation|rotasyon|rotational/],
  ['Trunk Flexion Family',       /crunch|sit[- ]?up|leg raise|knee raise|\bv[- ]?ups?\b|toes ?to ?bar|mekik/],
  ['Mobility Family',            /mobility|mobilit|mobiliz|stretch|esneme|\bcars\b|90\/90|greatest|foam roll/],
];
const ATP_FAMILY_AXIS={'Split Squat Family':'knee','Lunge Family':'knee','Step-Up Family':'knee','Squat Family':'knee',
  'Hip Thrust / Bridge Family':'hip','Hamstring Curl Family':'hip','Hinge Family':'hip',
  'Vertical Pull Family':'pull','Horizontal Pull Family':'pull','Vertical Press Family':'push','Horizontal Press Family':'push',
  'Anti-Rotation Family':'core','Anti-Lateral Flexion Family':'core','Anti-Extension Family':'core','Rotation Family':'core',
  'Trunk Flexion Family':'core','Carry Family':'carry','Olympic Lift Family':'full','Calf / Ankle Family':'ankle'};
/* The coach's tag on the row (and the library's) names the axis before the name does. */
const ATP_AXIS_OF={'Knee Dominant':'knee','Hip Dominant':'hip','Upper Body Push':'push','Upper Body Pull':'pull','Core':'core',
  'Full Body':'full','Squat':'knee','Lunge / Unilateral':'knee','Hinge':'hip','Push':'push','Pull':'pull','Core / Brace':'core',
  'Rotation':'core','Carry':'carry'};
const ATP_AXIS_FAMILY={knee:'Knee Dominant (Other)',hip:'Hip Dominant (Other)',push:'Upper Body Push (Other)',
  pull:'Upper Body Pull (Other)',core:'Core (Other)',full:'Full Body (Other)',carry:'Carry Family',ankle:'Calf / Ankle Family'};
function atpLibMap(exercises){
  const m={};
  (exercises||[]).forEach(e=>{const n=String((e&&e.name)||'').trim().toLowerCase();if(n&&!m[n])m[n]=e;});
  return m;
}
/* One exercise row → its family, patterns, stimuli and loading characteristics. What
   cannot be told is left out rather than guessed into a category. */
function atpClassify(row,libMap){
  const n=String((row&&row.name)||'').trim().toLowerCase();
  const lib=(libMap&&libMap[n])||{};
  const tagP=String(row.pattern||'').trim();
  const P=tagP||String(lib.exPattern||'').trim()||(EX_PATTERNS.includes(lib.type)?lib.type:'');
  const S=String(row.plane||'').trim()||String(lib.exPlane||'').trim()||String(lib.subType||'').trim();
  const type=String(lib.type||'').trim(),sub=String(lib.subType||'').trim();
  const mp=String(lib.movePattern||'').trim()||(['Unilateral','Lunges','Step-Up'].includes(lib.pattern)?'Lunge / Unilateral':'');
  const fam0=(ATP_FAMILIES.find(([,re])=>re.test(n))||[])[0]||null;
  const plyo=type==='Plyometric'||mp==='Jump / Plyo'||['Jump Family','Hop / Bound Family','Depth / Drop Jump Family','Landing Family'].includes(fam0);
  const run=type==='Multi Directional Speed'||mp==='Sprint / Locomotion'||['Sprint Family','Deceleration Family','COD / Agility Family'].includes(fam0);
  const throwing=type==='Medicine Ball'||fam0==='Med Ball Throw Family';
  let axis=ATP_AXIS_OF[P]||ATP_AXIS_OF[mp]||null;
  if(!axis&&!plyo&&!run&&!throwing)axis=ATP_FAMILY_AXIS[fam0]||null;
  const uni=/single[- ]?leg|one[- ]?leg|\bsl\b|tek bacak|unilateral|split|lunge|step[- ]?(up|down)|bulgarian|pistol|skater|rfess|hamle|b[- ]?stance|kickstand|staggered|rear[- ]?foot/.test(n)
    ||['Unilateral','Lunges','Step-Up'].includes(lib.pattern)||mp==='Lunge / Unilateral';
  /* A jump's knee bend is not a squat set: the strength sub-patterns are only read on
     rows that are not jumps or runs. The axis itself still counts when it was tagged. */
  const lift=!plyo&&!run;
  const pats=new Set();
  if(axis==='knee'){pats.add('Knee Dominant');
    if(lift){
      if(uni){pats.add('Unilateral Knee Dominant');
        if(/lunge|split|hamle|bulgarian|rfess|rear[- ]?foot/.test(n)||lib.pattern==='Lunges')pats.add('Lunge');}
      else if(fam0==='Squat Family'||mp==='Squat'||/squat|leg press|hack/.test(n))pats.add('Squat');}}
  if(axis==='hip'){pats.add('Hip Dominant');
    if(lift){
      if(fam0==='Hinge Family'||mp==='Hinge'||/deadlift|\brdl\b|romanian|hinge|good ?morning|swing/.test(n))pats.add('Hinge');
      if(uni)pats.add('Unilateral Hip Dominant');}}
  if(axis==='push'||axis==='pull'){
    const dir=(S==='Vertical'||S==='Horizontal'||S==='Rotational')?S:(/Vertical/.test(fam0||'')?'Vertical':'Horizontal');
    pats.add(dir==='Rotational'?'Rotation':`${dir} ${axis==='push'?'Push':'Pull'}`);
  }
  if(axis==='core'){
    const q=CORE_QUALITIES.has(S)?S:({'Anti-Rotation Family':'Anti-Rotation','Anti-Lateral Flexion Family':'Anti-Lateral Flexion',
      'Anti-Extension Family':'Anti-Extension','Rotation Family':'Rotation','Trunk Flexion Family':'Flexion'})[fam0]
      ||(mp==='Rotation'?'Rotation':EX_STYLE_DEFAULT.Core);
    pats.add(['Flexion','Extension','Lateral Flexion'].includes(q)?'Trunk Flexion / Extension':q);
  }
  if(axis==='full')pats.add('Full Body');
  if(axis==='carry')pats.add('Carry');
  if(axis==='ankle'||fam0==='Calf / Ankle Family')pats.add('Ankle / Calf');
  if(plyo)pats.add('Plyometric');
  if(run)pats.add('Sprint / Locomotion');
  if(type==='Mobility'||mp==='Mobility'||fam0==='Mobility Family'||(type==='Warm-Up'&&/Mobilisation|Dynamic Stretching/.test(sub)))pats.add('Mobility');
  if(type==='Stability'||type==='Balance'||/balance|denge|stability|stabilite/.test(n))pats.add('Stability / Balance');

  const st=new Set();
  const maxV=/flying|max(imal)? velocity|top speed|maks(imum)? hız|wicket|\b(30|35|40|50|60) ?m\b|fly[- ]?in/.test(n);
  if(run){
    if(maxV)st.add('Max Velocity');
    if(sub==='Acceleration'||/accel|ivmelen|start|sled|resisted|drive/.test(n)
      ||(fam0==='Sprint Family'&&!maxV&&!/\b[ab][- ]?skip|mechanic|technique|teknik/.test(n)))st.add('Acceleration');
    if(sub==='Deceleration'||fam0==='Deceleration Family'||/\bstop\b|5-0-5|\b505\b/.test(n))st.add('Deceleration');
    if(['COD','Non-Reactive Agility','Reactive Agility'].includes(sub)||fam0==='COD / Agility Family')st.add('Change of Direction');
  }
  if((run||plyo)&&(/lateral|shuffle|carioca|skater|side ?step|slide|crossover|yanal/.test(n)||(type==='Plyometric'&&sub==='Lateral')))st.add('Lateral Movement');
  if(plyo){
    if(fam0==='Jump Family'||fam0==='Depth / Drop Jump Family'||(!fam0&&type==='Plyometric'))st.add('Jumping');
    if(fam0==='Landing Family'||/landing|iniş|\bstick\b/.test(n))st.add('Landing');
    if(fam0==='Hop / Bound Family')st.add('Hopping / Bounding');
    if(fam0==='Depth / Drop Jump Family'||/reactive|reaktif|pogo|rebound|continuous|repeated/.test(n))st.add('Reactive / Depth');
  }
  if(throwing)st.add('Throwing');

  const ld=new Set();
  const loadTxt=String(row.load||'').toLowerCase();
  const pm=loadTxt.match(/(\d{2,3})\s*%|%\s*(\d{2,3})/);
  const pct=pm?Number(pm[1]||pm[2]):null;
  const rm=loadTxt.match(/rpe\s*(\d+(?:[.,]\d)?)/);
  const rpe=recNum(row.rpe)!=null?recNum(row.rpe):(rm?Number(rm[1].replace(',','.')):null);
  const rn=String(row.reps||'').match(/\d+/g);
  const reps=rn?Math.max(...rn.map(Number)):null;
  const loaded=!!loadTxt.trim()&&!/\bbw\b|body ?weight|vücut ağırlığı/.test(loadTxt);
  const strength=lift&&!throwing&&['knee','hip','push','pull','full'].includes(axis);
  if(strength&&((pct!=null&&pct>=80)||(rpe!=null&&rpe>=8&&reps!=null&&reps<=6)||(reps!=null&&reps<=5&&loaded)
    ||/heavy|ağır|\b[1-5] ?rm\b/.test(n)))ld.add('Heavy Loading');
  const tm=String(row.tempo||'').trim().match(/^(\d)/);
  if(S==='Eccentric'||sub==='Eccentric'||/eccentric|eksantrik|nordic|negative|slow lower/.test(n)||(tm&&Number(tm[1])>=3))ld.add('Eccentric Loading');
  if(S==='ISO'||sub==='Isometric'||/\biso\b|isometric|izometrik|\bhold\b|wall sit|plank|copenhagen|pin press|overcoming|yielding/.test(n))ld.add('Isometric');
  const bal=(plyo&&fam0!=='Landing Family')||throwing||/swing|ballistic|balistik|slam|throw/.test(n);
  if(run||bal||fam0==='Olympic Lift Family'||['Explosive','Olympic Lift'].includes(S)||['Explosive','Olympic Lift'].includes(sub)
    ||/speed|velocity|explosive|patlayıcı|dynamic effort/.test(n))ld.add('High-Velocity');
  if(bal)ld.add('Ballistic');

  const family=fam0||ATP_AXIS_FAMILY[axis]||(type?`${type} Family`:'Unclassified');
  /* The four strength attributes, on strength rows only (never a jump, a run or a throw).
     Bilateral or unilateral: a lower-body row is unilateral when the name or the library
     says so; an upper-body row only when the name says single-arm / one-arm / alternating,
     since a press or a row is a two-hand lift unless it says otherwise. */
  const strengthRow=lift&&!throwing&&['knee','hip','push','pull','core'].includes(axis);
  const armUni=/single[- ]?arm|one[- ]?arm|\bsa\b|tek kol|alternating|unilateral/.test(n)||['Unilateral','Lunges','Step-Up'].includes(lib.pattern);
  const laterality=(lift&&(axis==='knee'||axis==='hip'))?(uni?'Unilateral':'Bilateral')
    :(lift&&(axis==='push'||axis==='pull'))?(armUni?'Unilateral':'Bilateral'):'';
  /* Plane: transverse for rotation and anti-rotation work, frontal for lateral / side work,
     sagittal for every other strength lift — squats, hinges, lunges, presses, rows and
     the flexion and extension core work all happen in it unless the name or tag says
     otherwise. */
  const rotCue=S==='Rotational'||/rotational|rotation|rotasyon|transverse|wood ?chop|\bchops?\b|twist|windmill/.test(n)
    ||pats.has('Rotation')||pats.has('Anti-Rotation');
  const latCue=S==='Lateral Flexion'||/lateral|side ?(lunge|step|squat|plank|bend)|cossack|skater|curtsy|yan ?(hamle|adım)|frontal|copenhagen/.test(n)
    ||pats.has('Anti-Lateral Flexion');
  const plane=strengthRow?(rotCue?'Transverse':latCue?'Frontal':'Sagittal'):'';
  /* Action: an upper-body push or pull is its axis; a hip or knee row takes the library's
     own Action tag and nothing else, because "push" and "pull" mean different things at
     the hip and the knee and a name does not settle which. */
  const libAction=String(lib.action||'').trim();
  const action=strengthRow?(axis==='push'?'Push':axis==='pull'?'Pull':(ATP_EXP_ACTIONS.includes(libAction)?libAction:'')):'';
  /* Contraction focus: the library's tag, else what the name or the tempo shows. Concentric
     is only ever the library's word — no name says "concentric". */
  const focus=strengthRow?(ATP_EXP_FOCUS.includes(sub)?sub:ld.has('Eccentric Loading')?'Eccentric':ld.has('Isometric')?'Isometric':''):'';
  const equipment=atpEquipmentOf(row,lib);
  /* The library category the row belongs to and the facets it is filed by there, in the
     library's own words. The library's tag on the entry wins; where the entry has none, a
     value is read off the name only when the name says it. What neither says is left out —
     the coverage below would otherwise count a guess as work done. */
  const pick=(v,list)=>{const s=String(v==null?'':v).trim();return list.includes(s)?s:'';};
  const CORE_FAM_Q={'Anti-Rotation Family':'Anti-Rotation','Anti-Lateral Flexion Family':'Anti-Lateral Flexion',
    'Anti-Extension Family':'Anti-Extension','Rotation Family':'Rotation','Trunk Flexion Family':'Flexion'};
  const coreQ=axis==='core'?(CORE_QUALITIES.has(S)?S:(CORE_FAM_Q[fam0]||(mp==='Rotation'?'Rotation':''))):'';
  const cat=ATP_TAXONOMY.some(x=>x.type===type)?type
    :plyo?'Plyometric':run?'Multi Directional Speed':throwing?'Medicine Ball'
    :({knee:'Knee Dominant',hip:'Hip Dominant',push:'Upper Body Push',pull:'Upper Body Pull',core:'Core',full:'Full Body'})[axis]
    ||(pats.has('Mobility')?'Mobility':'');
  const facets={};
  const put=(label,v)=>{if(v)facets[label]=v;};
  const V=label=>atpFacetValues(cat,label);
  const eqIn=label=>{const e=equipment;return V(label).includes(e)?e:'';};
  if(cat==='Knee Dominant'||cat==='Hip Dominant'){
    const knee=cat==='Knee Dominant';
    put('Contraction Focus',focus);
    put('Action',action);
    put('Movement Pattern',pick(lib.pattern,V('Movement Pattern'))||(lift
      ?(knee&&fam0==='Step-Up Family'?'Step-Up':knee&&(fam0==='Lunge Family'||fam0==='Split Squat Family')?'Lunges':uni?'Unilateral':'Bilateral'):''));
    put('Equipment',eqIn('Equipment'));
  }else if(cat==='Upper Body Push'||cat==='Upper Body Pull'){
    put('Movement',pick(S,V('Movement'))||(/Horizontal/.test(fam0||'')?'Horizontal':/Vertical/.test(fam0||'')?'Vertical':''));
    put('Equipment',eqIn('Equipment'));
  }else if(cat==='Core'){
    put('Movement',coreQ);
    put('Position',pick(lib.position,V('Position')));
  }else if(cat==='Full Body'){
    put('Category',pick(sub,V('Category'))||(fam0==='Olympic Lift Family'?'Olympic Lift':''));
  }else if(cat==='Multi Directional Speed'){
    put('Skill',pick(sub,V('Skill'))||(st.has('Change of Direction')?'COD':st.has('Deceleration')?'Deceleration':st.has('Acceleration')?'Acceleration':''));
  }else if(cat==='Plyometric'){
    put('Direction',pick(sub,V('Direction'))||(/rotational|rotation|twist/.test(n)?'Rotational'
      :/lateral|skater|side ?(hop|jump|bound)|\byan\b/.test(n)?'Lateral'
      :/broad jump|horizontal|bounds?\b|standing long|hurdle hop/.test(n)?'Horizontal'
      :/box jump|vertical|cmj|counter ?movement|squat jump|jump squat|tuck|drop jump|depth jump|pogo|ankle hop/.test(n)?'Vertical':''));
    const kind=pick(lib.exKind,V('Exercise Type'))||(fam0==='Depth / Drop Jump Family'?'Drop Jump':fam0==='Landing Family'?'Landing'
      :fam0==='Hop / Bound Family'?(/bound/.test(n)?'Bound':'Hop'):fam0==='Jump Family'?'Jump':'');
    put('Exercise Type',kind);
    put('Technique',pick(lib.technique,V('Technique'))
      ||(/single[- ]?leg|one[- ]?leg|\bsl\b|tek bacak|unilateral|skater|alternating/.test(n)?'Unilateral':(kind==='Hop'||kind==='Bound'||!kind)?'':'Bilateral'));
    put('Equipment',exMulti(lib.equipment).find(x=>V('Equipment').includes(x))||eqIn('Equipment')||(equipment==='Bodyweight'?'No Equipment':''));
  }else if(cat==='Medicine Ball'){
    put('Direction',pick(sub,V('Direction'))||(/rotational|rotation|twist|russian|side (toss|throw)|lateral/.test(n)?'Rotational'
      :/overhead|slam|vertical|scoop/.test(n)?'Vertical':/chest pass|horizontal|push pass|wall throw/.test(n)?'Horizontal':''));
    put('Exercise Type',pick(lib.exKind,V('Exercise Type'))||(/slam/.test(n)?'Slam':/catch/.test(n)?'Catch':/pass/.test(n)?'Pass'
      :/throw|toss|shot ?put|scoop/.test(n)?'Throw':''));
  }else if(cat==='Mobility'){
    put('Region',pick(sub,V('Region'))||(/ankle|dorsiflexion|calf/.test(n)?'Ankle':/hip|90\/90|pigeon|adductor|groin/.test(n)?'Hip'
      :/thoracic|spine|t-spine|cat[- ]?cow|open book|thread the needle/.test(n)?'Spine':/shoulder|scap|wall slide/.test(n)?'Shoulder':/wrist|forearm/.test(n)?'Wrist':''));
    put('Position',pick(lib.position,V('Position')));
  }else if(cat==='Warm-Up'||cat==='Balance'){
    put('Category',pick(sub,V('Category')));
  }else if(cat==='Stability'||cat==='Accessory'){
    put('Region',pick(sub,V('Region')));
  }else if(cat==='Corrective'){
    put('Type',pick(sub,V('Type')));
    put('Region',pick(lib.bodyRegion,V('Region')));
  }
  return{family,patterns:[...pats],stimuli:[...st],loading:[...ld],laterality,plane,action,focus,equipment,cat,facets};
}
/* Every session on the athlete's calendar up to `to` that has at least one exercise
   row, oldest first; sessions of one day in the order they were run. A block or row the
   individualization sheet marked removed was never trained, so it is not exposure. */
function atpSessions(ath,from,to){
  const days=(ath&&ath.days)||{};
  const out=[];
  Object.keys(days).filter(dk=>/^\d{4}-\d{2}-\d{2}$/.test(dk)&&(!from||dk>=from)&&dk<=to).sort().forEach(dk=>{
    ((days[dk]||{}).sessions||[]).map((s,i)=>({s,i})).filter(x=>x.s)
      .sort((a,b)=>String(a.s.time||'').localeCompare(String(b.s.time||''))||a.i-b.i)
      .forEach(({s,i})=>{
        const rows=[];
        (s.blocks||[]).forEach(b=>{if(!b||b.removed)return;
          (b.exercises||[]).forEach(x=>{if(x&&!x.removed&&String(x.name||'').trim())rows.push(x);});});
        if(rows.length)out.push({date:dk,key:dk+'|'+i,name:s.name||'',time:s.time||'',rows});
      });
  });
  return out;
}
/* The exposure read, with `end` as the last day counted. The Last Session window is
   the newest session on or before it, however old — it says its own date. */
function atpExposure(ath,end,opts){
  const libMap=(opts&&opts.libMap)||null;
  const from={d7:fmt(addD(parseD(end),-6)),d14:fmt(addD(parseD(end),-13)),d28:fmt(addD(parseD(end),-27))};
  const all=atpSessions(ath,null,end);
  const last=all[all.length-1]||null;
  const use=all.filter(s=>s.date>=from.d28);
  if(last&&!use.includes(last))use.push(last);
  const W=['last','d7','d14','d28'];
  const sessions={d7:0,d14:0,d28:0},rows={last:0,d7:0,d14:0,d28:0};
  const layers={exercise:{},family:{},pattern:{},stimulus:{},loading:{},laterality:{},plane:{},action:{},focus:{},equipment:{},category:{},facet:{}};
  const bump=(layer,key,label,wins,sets,sess,date)=>{
    const t=layers[layer][key]||(layers[layer][key]={key,label,sets:{last:0,d7:0,d14:0,d28:0},sess:new Set(),lastUsed:null});
    wins.forEach(w=>{t.sets[w]+=sets;});
    if(wins.includes('d28'))t.sess.add(sess);
    if(!t.lastUsed||date>=t.lastUsed){t.lastUsed=date;t.label=label;}
    return t;
  };
  use.forEach(s=>{
    const wins=W.filter(w=>w==='last'?s===last:s.date>=from[w]);
    wins.forEach(w=>{if(w!=='last')sessions[w]++;rows[w]+=s.rows.length;});
    s.rows.forEach(r=>{
      const name=String(r.name).trim();
      const sets=recNum(r.sets)||1;
      const c=atpClassify(r,libMap);
      const t=bump('exercise',diExName(name)||name.toLowerCase(),name,wins,sets,s.key,s.date);
      t.family=c.family;
      ['patterns','stimuli','loading'].forEach(k=>{t[k]=[...new Set([...(t[k]||[]),...c[k]])];});
      ['laterality','plane','action','focus','equipment'].forEach(k=>{if(c[k])t[k]=c[k];});
      bump('family',c.family,c.family,wins,sets,s.key,s.date);
      ['laterality','plane','action','focus','equipment'].forEach(k=>{
        if(c[k])bump(k,c[k],c[k],wins,sets,s.key,s.date);});
      if(c.cat){
        bump('category',c.cat,c.cat,wins,sets,s.key,s.date);
        Object.keys(c.facets).forEach(f=>{
          const ft=bump('facet',`${c.cat}|${f}|${c.facets[f]}`,c.facets[f],wins,sets,s.key,s.date);
          ft.type=c.cat;ft.facet=f;});
      }
      c.patterns.forEach(p=>bump('pattern',p,p,wins,sets,s.key,s.date));
      c.stimuli.forEach(p=>bump('stimulus',p,p,wins,sets,s.key,s.date));
      c.loading.forEach(p=>bump('loading',p,p,wins,sets,s.key,s.date));
    });
  });
  const fin=(t,kind)=>{
    const level={};W.forEach(w=>{level[w]=atpExpLevel(t.sets[w],kind,w==='last'?0:Number(w.slice(1)));});
    const{sess,...rest}=t;
    return{...rest,freq28:sess.size,level};
  };
  const empty=label=>({key:label,label,sets:{last:0,d7:0,d14:0,d28:0},sess:new Set(),lastUsed:null});
  const fixed=(layer,list)=>list.map(l=>fin(layers[layer][l]||empty(l),'group'));
  const bySets=(a,b)=>(b.sets.d28-a.sets.d28)||(b.sets.last-a.sets.last)||String(b.lastUsed).localeCompare(String(a.lastUsed));
  return{end,from,
    last:last?{date:last.date,name:last.name,time:last.time,rows:last.rows.length}:null,
    sessions,rows,
    exercises:Object.values(layers.exercise).map(t=>fin(t,'exercise')).sort(bySets),
    families:Object.values(layers.family).map(t=>fin(t,'group')).sort(bySets),
    patterns:fixed('pattern',ATP_EXP_PATTERNS),
    stimuli:fixed('stimulus',ATP_EXP_STIMULI),
    loading:fixed('loading',ATP_EXP_LOADING),
    laterality:fixed('laterality',ATP_EXP_LATERALITY),
    planes:fixed('plane',ATP_EXP_PLANES),
    actions:fixed('action',ATP_EXP_ACTIONS),
    focus:fixed('focus',ATP_EXP_FOCUS),
    /* Per library category the athlete trained: every facet the category is filed by, with
       every value the library offers — done or not. A facet is listed only when at least one
       recorded row of the category carries it (a facet nobody tagged is unknown, not
       missing); categories with no recorded row at all are named apart. */
    coverage:ATP_TAXONOMY.map(tx=>{
      const cat=layers.category[tx.type];
      if(!cat)return null;
      const facets=tx.facets.map(fc=>{
        const any=Object.values(layers.facet).some(t=>t.type===tx.type&&t.facet===fc.label);
        if(!any)return null;
        return{label:fc.label,
          values:fc.values.map(v=>fin(layers.facet[`${tx.type}|${fc.label}|${v}`]||empty(v),'group'))};
      }).filter(Boolean);
      return{type:tx.type,cat:fin(cat,'group'),facets};
    }).filter(Boolean),
    coverageMissing:ATP_TAXONOMY.filter(tx=>!layers.category[tx.type]).map(tx=>tx.type),
    equipment:Object.values(layers.equipment).map(t=>fin(t,'group')).sort(bySets)};
}
/* The profile as the individualization JSON carries it. The day being programmed is
   not exposure yet, so the window ends the day before it — the same rule the daily
   engine's own exposure read keeps. `filled` says whether the coach has written any of
   the first three parts; an empty profile is named in missing_data rather than read
   as "no priorities, no constraints". */
function atpSnapshot(ath,ref,libMap,setup){
  const tp=atpRead(ath);
  const en=(list,id)=>((list.find(x=>x.id===id)||{}).en)||null;
  /* Every rated quality with its group and priority, High first — the order the
     session is to be written in — and within one priority in the template's own order.
     The three priority lists repeat the names alone, so the emphasis reads at a glance. */
  const rank=x=>Math.max(0,ATP_PRIORITY.findIndex(p=>p.id===x.r.priority))+(x.r.priority?0:ATP_PRIORITY.length);
  const rated=ATP_QUALITIES.filter(it=>tp.qualities[it.id]).map(it=>({it,r:tp.qualities[it.id]}));
  const ordered=rated.map((x,i)=>({...x,i})).sort((a,b)=>(rank(a)-rank(b))||(a.i-b.i));
  const byPri=id=>rated.filter(x=>x.r.priority===id).map(x=>x.it.en);
  const unrated=ATP_QUALITIES.filter(it=>!tp.qualities[it.id]).map(it=>it.en);
  const con=list=>list.map(c=>({constraint:atpConLabel(c),category:atpCatLabel(atpConCat(c))||null,value:c.value,note:c.note}));
  const end=fmt(addD(parseD(ref),-1));
  const ex=atpExposure(ath,end,{libMap});
  const WK={last:'last_session',d7:'last_7_days',d14:'last_14_days',d28:'last_28_days'};
  const per=(t,f)=>{const o={};Object.keys(WK).forEach(w=>{o[WK[w]]=f(t,w);});return o;};
  /* Sets per window only: the High / Moderate / Low level is read off them by
     level_scale, so it is not written out a second time beside every record. */
  const item=t=>({name:t.label,last_used:t.lastUsed,frequency_28_days:t.freq28,sets:per(t,(x,w)=>x.sets[w])});
  const fixed=list=>({records:list.filter(t=>t.lastUsed).map(item),
    no_exposure_last_28_days:list.filter(t=>!t.lastUsed).map(t=>t.label)});
  /* An implement the gym does not have is not a gap to fill: with an inventory on the
     Settings tab, an Equipment facet's "not done" lists name only the kit that is there
     (bodyweight is always there). No inventory, no cut. */
  const eqHave=eqAvailable(setup||{});
  const eqIds=new Set(eqHave.map(e=>e.id)),eqNames=new Set(eqHave.map(e=>diExName(e.label)));
  const ATP_EQ_ID={'Barbell':'barbell','Trap Bar':'trapbar','Dumbbell':'dumbbell','Cable':'cable','Medicine Ball':'medball',
    'Box':'plyobox','Band':'bands','Resistance Band':'bands','Sled':'sled','Machine':'machine'};
  const inGym=v=>!eqIds.size||v==='Bodyweight'||v==='No Equipment'||
    (ATP_EQ_ID[v]?eqIds.has(ATP_EQ_ID[v]):(eqIds.has(EQ_CUSTOM+diExName(v))||eqNames.has(diExName(v))));
  const gapOf=f=>f.label==='Equipment'?(t=>inGym(t.label)):(()=>true);
  const cut=ATP_EXP_CUT;
  const filled=rated.length+tp.constraints.hard.length+tp.constraints.soft.length>0;
  /* With no S&C session on the calendar in 28 days every list below would only say
     "none" at length, so the block is cut to the count and the scope that explains it. */
  const anyEx=ex.sessions.d28>0;
  return{filled,out:{
    definition:'The athlete\'s training profile. athletic_profile and constraints are entered by the coach; '+
      'exercise_exposure is computed automatically from the training sessions on the calendar. The profile describes the athlete — it is not an exercise selection on its own.',
    last_updated:tp.updated,
    athletic_profile:rated.length?{
      description:'Priority of each physical quality — how much it is to be developed in this period: High (main development area) > Medium (to be developed, after High) > Low (maintained, no development priority). '+
        'not_rated lists the qualities the coach set no priority for: keep them at a maintenance dose, the same as Low.',
      groups:ATP_GROUPS.map(g=>g.en),
      priority:{high:byPri('high'),medium:byPri('medium'),low:byPri('low')},
      ...(unrated.length?{not_rated:unrated}:{}),
      qualities:ordered.map(({it,r})=>({quality:it.en,group:it.group,priority:en(ATP_PRIORITY,r.priority)})),
    }:null,
    /* No constraint entered, no block: a description with nothing under it reads as
       data that is missing rather than as "none". */
    constraints:(tp.constraints.hard.length||tp.constraints.soft.length)?{
      description:'hard: constraints that must be respected without exception · soft: not strict prohibitions, but preferences or situations to limit',
      hard:con(tp.constraints.hard),soft:con(tp.constraints.soft)}:null,
    exercise_exposure:!anyEx?{
      scope:'Counts only the S&C exercises written on the athlete\'s calendar. Team practice and games are not in it — their load is in rpe; zero sessions here does not mean the athlete did not train.',
      window_end:end,
      session_count:{last_7_days:0,last_14_days:0,last_28_days:0},
    }:{
      scope:'Counts only the S&C exercises written on the athlete\'s calendar. Team practice and games are not in it — their load is in rpe; zero sessions here does not mean the athlete did not train.',
      window_end:end,
      /* The profile's own classification, finer than the session's pattern vocabulary
         and named apart from it so the two lists are never mistaken for each other. */
      movement_class_note:'movement_class is the training profile\'s detailed classification (e.g. Hip Dominant, Horizontal Push); '+
        'these names are never written into a programme\'s movement_pattern field — that field is chosen only from movement_pattern_vocabulary.',
      level_scale:`The exposure level of a record, read off its sets: High / Moderate / Low / None. The 7-14-28 day windows are read as a weekly average: `+
        `a single exercise ≥${cut.exercise.week[1]} sets/week High, ≥${cut.exercise.week[0]} Moderate; family, pattern, stimulus and loading `+
        `≥${cut.group.week[1]} sets/week High, ≥${cut.group.week[0]} Moderate. Last session: a single exercise ≥${cut.exercise.session[1]} sets High, `+
        `≥${cut.exercise.session[0]} Moderate; the others ≥${cut.group.session[1]} High, ≥${cut.group.session[0]} Moderate. 0 sets = None / Not Recent.`,
      last_session:ex.last?{date:ex.last.date,session:ex.last.name,time:ex.last.time,exercise_count:ex.last.rows}:null,
      session_count:{last_7_days:ex.sessions.d7,last_14_days:ex.sessions.d14,last_28_days:ex.sessions.d28},
      exercises:ex.exercises.slice(0,30).map(t=>({exercise:t.label,family:t.family,movement_class:t.patterns,stimulus:t.stimuli,
        loading_character:t.loading,...(t.laterality?{laterality:t.laterality}:{}),...(t.plane?{movement_plane:t.plane}:{}),
        ...(t.action?{action:t.action}:{}),...(t.focus?{contraction_focus:t.focus}:{}),...(t.equipment?{equipment:t.equipment}:{}),
        last_used:t.lastUsed,frequency_28_days:t.freq28,sets:per(t,(x,w)=>x.sets[w])})),
      exercise_families:ex.families.map(item),
      movement_class:fixed(ex.patterns),
      athletic_stimulus:fixed(ex.stimuli),
      loading_character:fixed(ex.loading),
      strength_movement_profile:{
        note:'How the strength work (knee-, hip-, push-, pull- and core-work; not jumps, runs or throws) was spread, in sets, over four axes. '+
          'laterality: bilateral or unilateral (an upper-body row is unilateral only when its name says single-arm / one-arm / alternating). '+
          'movement_plane: Sagittal (squats, hinges, lunges, presses, rows, flexion / extension core work) unless the name or tag says lateral (Frontal) or rotational / anti-rotational (Transverse). '+
          'action: Push or Pull — for hip and knee work only where the library entry says. '+
          'contraction_focus: the library tag, or Eccentric / Isometric where the name or tempo shows it; Concentric only from a library tag. '+
          'A row whose value cannot be told is not counted on that axis, and None means no such row was recorded, not that the athlete avoided it.',
        laterality:fixed(ex.laterality),
        movement_plane:fixed(ex.planes),
        action:fixed(ex.actions),
        contraction_focus:fixed(ex.focus),
      },
      category_coverage:{
        note:'For every exercise category the athlete has trained (the library\'s own categories: core, plyometric, medicine ball, mobility, upper-body push / pull, speed, hip / knee dominant, full body, stability, balance, accessory), '+
          'every facet the category is filed by (movement, direction, type, position, technique, contraction focus, action, implement…) with what was done and what was not. '+
          'done: the values that were recorded, in sets, over the last session and the last 7 / 14 / 28 days. '+
          'not_done_last_7_days: the values with no set in the last 7 days (this week\'s gaps — it includes the values of not_done_last_28_days). not_done_last_28_days: the values with no set in the last 28 days. '+
          'Prefer not_done_last_28_days first, then the rest of not_done_last_7_days. For Equipment, only the kit in the gym\'s inventory is listed as not done. '+
          'A facet is listed only when at least one recorded exercise of the category carries it, so a value missing from the list of a listed facet means it was not recorded, not that it was avoided; a row whose value cannot be told is not counted.',
        categories:ex.coverage.map(c=>({category:c.type,sets:per(c.cat,(x,w)=>x.sets[w]),
          facets:c.facets.map(f=>{const gap=gapOf(f);return{facet:f.label,
            done:f.values.filter(t=>t.lastUsed).map(item),
            not_done_last_7_days:f.values.filter(t=>!(t.sets.d7>0)&&(t.sets.d28>0||gap(t))).map(t=>t.label),
            not_done_last_28_days:f.values.filter(t=>!(t.sets.d28>0)&&gap(t)).map(t=>t.label)};})})),
        categories_without_recorded_work:ex.coverageMissing,
      },
      equipment_used_note:'equipment_used lists the implement each exercise row was done with, read from the row\'s equipment field, the library entry or the exercise name, in sets. '+
        'An exercise whose implement cannot be told is not counted, and an implement that is not listed was not recorded — it does not mean it was not used.',
      equipment_used:{records:ex.equipment.filter(t=>t.lastUsed).map(item)},
    },
  }};
}

/* ---- Position emphasis (§4.3) --------------------------------------------
   What a role's game asks for most often. It is CONTEXT, never the programme: the
   spec is explicit that position alone must not decide anything, so this is handed
   over beside the test results, the load and the goals and weighed with them. */
const DI_POS_QUALITIES={
  guard:[['İvmelenme','Acceleration'],['Yavaşlama','Deceleration'],['Yön değiştirme','Change of direction'],
    ['Reaktif çeviklik','Reactive agility'],['Tekrarlı sprint','Repeated sprint ability'],['Yatay güç','Horizontal power']],
  wing:[['İvmelenme','Acceleration'],['Maksimal hız','Max velocity'],['Yön değiştirme','Change of direction'],
    ['Sıçrama','Jumping'],['Güç','Power'],['Yavaşlama','Deceleration']],
  post:[['Rölatif kuvvet','Relative strength'],['Sıçrama','Jumping'],['İniş','Landing'],
    ['Yavaşlama','Deceleration'],['Mobilite','Mobility'],['Dayanıklılık','Robustness']],
  other:[],
};

/* ---- What the game itself asks for (§4.3, beside position) ----------------
   DI_POS_QUALITIES above says what a ROLE does inside the game. This says what the
   GAME does to everyone who plays it: the distances, how often the efforts repeat,
   how take-offs and landings happen, which planes the work lives in. Like the
   position emphasis it is CONTEXT handed over beside the athlete's own numbers, never
   a prescription on its own — but a session written without it is a gym programme
   that happens to be handed to a basketball player, and the point of this module is
   the opposite of that.

   Basketball is written out in full because it is the game this app is built around.
   The other sports carry the two or three lines that actually change an exercise
   choice; a sport with no entry passes its name through and nothing else. */
const DI_SPORT_DEMANDS={
  'Basketball':{label:['Basketbol','Basketball'],
    game:[
      ['Oyun 10-25 saniyelik hücum/savunma tekrarlarından oluşur; tekrarlar arası toparlanma kısmidir, tam değildir.',
       'The game is a string of 10-25 s possessions, with partial and never full recovery between them.'],
      ['Sprintlerin büyük kısmı 10 metrenin altındadır: belirleyici olan maksimum hız değil, ilk adım ve ivmelenmedir.',
       'Most sprints are under 10 m, so the first step and acceleration decide more than top speed does.'],
      ['Sıçramaların çoğu tek adımlı ve tek bacak kalkışlıdır; inişler dengesiz, temaslı ve önceden planlanmamıştır.',
       'Most jumps go up off a single step and one leg, and landings are unbalanced, contested and unplanned.'],
      ['Ani duruş ve yön değiştirme her pozisyonda tekrarlanır; eksantrik yavaşlama kapasitesi ivmelenme kadar belirleyicidir.',
       'Hard stops and direction changes repeat in every position, so eccentric deceleration matters as much as acceleration.'],
      ['Savunma duruşu ve kayma frontal düzlemde çalışır; ribaund, perdeleme ve post mücadelesi temas altında gövde stabilitesi ister.',
       'Defensive stance and sliding live in the frontal plane, and rebounds, screens and post play ask for trunk stability under contact.'],
    ],
    qualities:[['Yatay güç ve ivmelenme','Horizontal power and acceleration'],
      ['Dikey sıçrama ve tek bacak kalkış','Vertical jump and single-leg take-off'],
      ['Eksantrik yavaşlama ve iniş kontrolü','Eccentric deceleration and landing control'],
      ['Yön değiştirme ve reaktif çeviklik','Change of direction and reactive agility'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability'],
      ['Tek bacak kuvveti ve sağ-sol simetrisi','Single-leg strength and left/right symmetry'],
      ['Ayak bileği dorsifleksiyonu ve kalça mobilitesi','Ankle dorsiflexion and hip mobility'],
      ['Temas altında gövde stabilitesi','Trunk stability under contact']]},
  'Football (Soccer)':{label:['Futbol','Football (soccer)'],
    game:[
      ['Yüksek toplam lokomosyon hacmi içinde tekrarlı sprintler; sprint mesafeleri basketboldan uzundur, maksimum hız belirleyicidir.',
       'Repeated sprints inside a high total locomotion volume, over longer distances than basketball, where top speed does decide.'],
      ['Şut, ikili mücadele ve yön değiştirme tek bacak üzerinde gerçekleşir; hamstring eksantrik talebi yüksektir.',
       'Striking, duels and direction changes happen on one leg, and the eccentric hamstring demand is high.'],
    ],
    qualities:[['Maksimum hız','Maximum velocity'],['Tekrarlı sprint yeteneği','Repeated sprint ability'],
      ['Eksantrik hamstring kuvveti','Eccentric hamstring strength'],['Yön değiştirme','Change of direction'],
      ['Aerobik kapasite','Aerobic capacity']]},
  'Volleyball':{label:['Voleybol','Volleyball'],
    game:[
      ['Bir maç boyunca tekrarlanan maksimal sıçrama ve iniş; toplam sıçrama sayısı yüklemenin kendisidir.',
       'Maximal jumps and landings repeated across a match, where the jump count is itself the load.'],
      ['Smaç ve servis omuzu baş üstü, yüksek hızlı rotasyona sokar; hareket kısa mesafeli ve yanaldır.',
       'Spiking and serving take the shoulder overhead into high-speed rotation, and movement is short and lateral.'],
    ],
    qualities:[['Tekrarlı sıçrama kapasitesi','Repeated jump capacity'],['İniş / kuvvet absorpsiyonu','Landing and force absorption'],
      ['Omuz kuşağı kuvveti ve kontrolü','Shoulder-girdle strength and control'],['Yanal hareket','Lateral movement'],
      ['Reaktif kuvvet','Reactive strength']]},
  'Handball':{label:['Hentbol','Handball'],
    game:[
      ['Kısa sprintler, temas altında sıçrama ve iniş, sık yön değiştirme.',
       'Short sprints, jumps and landings under contact, and frequent direction changes.'],
      ['Baş üstü atış omuzu tekrarlı yüksek hızlı rotasyona sokar.',
       'Overhead throwing takes the shoulder into repeated high-speed rotation.'],
    ],
    qualities:[['İvmelenme','Acceleration'],['Temas altında sıçrama','Jumping under contact'],
      ['Omuz kuşağı kontrolü','Shoulder-girdle control'],['Gövde rotasyon kuvveti','Rotational trunk strength'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability']]},
  'Tennis':{label:['Tenis','Tennis'],
    game:[
      ['Açık beceri: yanal çıkış, ani duruş ve toparlanma adımları saatlerce tekrarlanır.',
       'An open skill: lateral pushes, hard stops and recovery steps repeated for hours.'],
      ['Servis ve vuruşlar alt gövdeden omuza uzanan bir rotasyon zinciri üzerinden üretilir.',
       'The serve and groundstrokes are produced through a rotational chain running from the legs to the shoulder.'],
    ],
    qualities:[['Yanal ivmelenme ve yavaşlama','Lateral acceleration and deceleration'],
      ['Gövde rotasyon gücü','Rotational trunk power'],['Omuz kuşağı dayanıklılığı','Shoulder-girdle endurance'],
      ['Tekrarlı efor kapasitesi','Repeated-effort capacity']]},
  'Rugby':{label:['Ragbi','Rugby'],
    game:[
      ['Tekrarlı ivmelenmeler, çarpışma ve yerdeki mücadele; yüklenmenin büyük kısmı temas altındadır.',
       'Repeated accelerations, collisions and ground contests, with much of the load taken under contact.'],
      ['Mutlak kuvvet ve kütle, oyunun kendisi tarafından talep edilir.',
       'Absolute strength and mass are asked for by the game itself.'],
    ],
    qualities:[['Maksimal kuvvet','Maximal strength'],['İvmelenme','Acceleration'],
      ['Temas dayanıklılığı ve gövde stabilitesi','Contact robustness and trunk stability'],
      ['Boyun ve omuz kuşağı kuvveti','Neck and shoulder-girdle strength'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability']]},
  'Track & Field':{label:['Atletizm','Track & field'],
    game:[
      ['Talep branşa göre değişir: sprint ve atlamalarda tek bir maksimal efor, dayanıklılık branşlarında sürdürülen efor belirleyicidir.',
       'The demand follows the event: one maximal effort in the sprints and jumps, sustained output in the endurance events.'],
    ],
    qualities:[['Branşa özgü kuvvet-hız profili','Event-specific force-velocity profile'],
      ['Reaktif kuvvet','Reactive strength'],['Teknik tekrarlanabilirlik','Technical repeatability']]},
  'Swimming':{label:['Yüzme','Swimming'],
    game:[
      ['Yer tepki kuvveti yoktur; itki suda, baş üstü omuz hareketi ve gövde üzerinden üretilir.',
       'There is no ground reaction force: propulsion comes through overhead shoulder action and the trunk.'],
      ['Çıkış ve dönüşler, karadaki tek maksimal güç ifadeleridir.',
       'Starts and turns are the only maximal power expressions taken on dry land.'],
    ],
    qualities:[['Omuz kuşağı kuvveti ve kontrolü','Shoulder-girdle strength and control'],
      ['Gövde stabilitesi','Trunk stability'],['Çıkış ve dönüş gücü','Start and turn power'],
      ['Skapular mobilite','Scapular mobility']]},
};
function diSportContext(setup){
  const sport=String((setup&&setup.sport)||'').trim();
  if(!sport)return null;
  /* Matched without regard to case: an imported or hand-edited setup may say
     "basketball" where the picker writes "Basketball". */
  const key=Object.keys(DI_SPORT_DEMANDS).find(k=>k.toLowerCase()===sport.toLowerCase());
  const d=key?DI_SPORT_DEMANDS[key]:null;
  if(!d)return{sport};
  return{sport:L(d.label[0],d.label[1]),
    nature_of_the_game:d.game.map(g=>L(g[0],g[1])),
    key_qualities:d.qualities.map(q=>L(q[0],q[1]))};
}

/* ---- Movement families (the variety rule) ---------------------------------
   The pattern vocabulary the library is tagged in is finer than the question a coach
   asks when they look at a session and say "this is twice the same thing". Squat and
   Lunge / Unilateral are two different patterns and one FAMILY: both are knee-
   dominant, both spend the same tissue on the same quality, and a main phase carrying
   one of each has used two of its slots once. A pattern-by-pattern check waves exactly
   that case through, which is why the variety rule is written against families.
   Patterns are untouched everywhere else. */
const DI_PATTERN_FAMILY={
  'Squat':'knee','Lunge / Unilateral':'knee','Hinge':'hip',
  'Push':'push','Pull':'pull','Carry':'carry',
  'Rotation':'trunk','Core / Brace':'trunk',
  'Jump / Plyo':'plyo','Sprint / Locomotion':'locomotion','Mobility':'mobility',
};
const DI_FAMILY_LABEL={
  knee:['diz dominant (Squat / Lunge)','knee-dominant (squat / lunge)'],
  hip:['kalça dominant (Hinge)','hip-dominant (hinge)'],
  push:['üst vücut itiş','upper-body push'],
  pull:['üst vücut çekiş','upper-body pull'],
  carry:['taşıma','loaded carry'],
  trunk:['gövde / rotasyon','trunk / rotation'],
  plyo:['sıçrama / pliometri','jump / plyometric'],
  locomotion:['sprint / lokomosyon','sprint / locomotion'],
  mobility:['mobilite','mobility'],
};
const diFamilyOf=p=>DI_PATTERN_FAMILY[p]||null;
const diFamilyLabel=f=>{const x=DI_FAMILY_LABEL[f];return x?L(x[0],x[1]):String(f||'');};

/* ---- The gym's kit, and what one exercise costs in minutes ---------------
   The equipment list is the vocabulary the Setup tab's inventory is written in; the
   minutes-per-exercise figure is what turns a session length into an exercise ceiling
   when the coach has not set one. Deliberately blunt: it exists so a 35-minute slot
   cannot come back with twelve exercises in it, not to predict how long anything
   really takes. */
const DI_EQUIPMENT=[
  {id:'barbell', label:['Barbell','Barbell']},
  {id:'dumbbell',label:['Dumbbell','Dumbbell']},
  {id:'cable',   label:['Cable','Cable']},
  {id:'trapbar', label:['Trap Bar','Trap bar']},
  {id:'medball', label:['Sağlık topu','Medicine ball']},
  {id:'plyobox', label:['Pliometrik kutu','Plyo box']},
  {id:'bands',   label:['Lastik','Bands']},
  {id:'sled',    label:['Kızak','Sled']},
  {id:'machine', label:['Makine','Machine']},
  {id:'bodyweight',label:['Vücut ağırlığı','Bodyweight']},
];
const diEqLabel=id=>{const e=DI_EQUIPMENT.find(x=>x.id===id);return e?e.label:[id,id];};
/* ---- The gym's kit, with counts and weights (Settings tab) -----------------
   Equipment used to be ticked per session on the individualization screen, which asked
   the same question every day about a gym that does not change. It is set once on the
   Settings tab now, and it carries a COUNT: six barbells and one trap bar is a different
   session from one barbell and six trap bars, and a programme written for a squad has
   to know which it is.

   It carries a WEIGHT too, because a count on its own does not say what can be loaded:
   a rack of six dumbbells that top out at 12 kg cannot hold a senior's heavy day, and a
   session that prescribes 40 kg into it is unwritable however many of them there are.
   So a line is an item AT a weight, and a gym holds as many lines of one item as it has
   weights worth naming — 6 × 10 kg dumbbells and 4 × 22.5 kg dumbbells are two lines of
   the same kit. `rid` is what lets the second line exist: a line the coach added has
   one, the ten default items do not, and that is the only difference between them.

   An item with no count is available with an unstated number; an item at zero is not
   available at all. An empty inventory means no equipment constraint — the same thing
   an empty list has always meant here. */
const EQ_CUSTOM='custom:';
function eqRows(setup){
  const raw=Array.isArray(setup&&setup.equipment)?setup.equipment:[];
  return raw.filter(r=>r&&(r.id||String(r.label||'').trim())).map(r=>{
    const id=String(r.id||'').trim()||`${EQ_CUSTOM}${diExName(r.label)}`;
    const known=DI_EQUIPMENT.find(x=>x.id===id);
    const qty=recNum(r.qty);
    const kg=recNum(r.kg);
    const rid=String(r.rid||'').trim();
    return{rid:rid||id,extra:!!rid||!known,id,custom:!known,
      label:String(r.label||'').trim()||(known?L(known.label[0],known.label[1]):id),
      qty:qty==null?null:Math.max(0,Math.round(qty)),
      kg:kg==null?null:Math.max(0,Math.round(kg*10)/10)};
  });
}
const eqAvailable=setup=>eqRows(setup).filter(r=>r.qty==null||r.qty>0);
/* One line of the inventory as a coach would say it out loud — "Dumbbell 22.5 kg × 4".
   Used wherever the kit is shown back rather than edited. */
const eqLine=r=>`${r.label}${r.kg!=null?` ${r.kg} kg`:''}${r.qty!=null?` × ${r.qty}`:''}`;
/* ---- The inventory as a shelf: one CARD per piece of kit ------------------
   The flat list above is what the assistant reads, and it stays exactly that. What the
   coach edits is a card per item — the picture they recognise it by, the name, the one
   line that says which barbell this is, and underneath it the weights the gym actually
   holds of it. The cards are stored in `setup.equipmentCards`; `setup.equipment` is
   written from them on every edit and remains the single thing every reader downstream
   (the prompt, the checks, the exercise filter) looks at, so nothing outside this screen
   has to know the shelf exists.

   NOT EVERYTHING IS COUNTED IN KILOS. A plyo box is a height, a band is a level, a rack
   is a name — a card says which of the four its lines are measured in and its table's
   heading follows. Only a kilo line reaches the flat list as a weight, which is what
   keeps "the heaviest dumbbell in this gym" an honest answer.

   A card with no lines is NOT in the inventory: it is the item's name waiting for an
   answer, and the assistant is told nothing about it. That is the same rule the blank
   lines of the old list followed, and it is what keeps an untouched inventory
   unconstrained. */
const EQ_CATS=[
  {id:'free',   label:['Serbest Ağırlık','Free weight']},
  {id:'machine',label:['Makine','Machine']},
  {id:'access', label:['Aksesuar','Accessory']},
  {id:'func',   label:['Fonksiyonel','Functional']},
  {id:'other',  label:['Diğer','Other']},
];
const eqCatLabel=id=>{const c=EQ_CATS.find(x=>x.id===id);return c?L(c.label[0],c.label[1]):L('Diğer','Other');};
/* What one line of a card measures. The heading is the table's left column; `add` is
   what the button under the table offers to put there. */
const EQ_UNITS=[
  {id:'kg',   head:['Ağırlık (kg)','Weight (kg)'],  add:['Ağırlık Ekle','Add weight']},
  {id:'cm',   head:['Yükseklik (cm)','Height (cm)'],add:['Yükseklik Ekle','Add height']},
  {id:'level',head:['Seviye','Level'],              add:['Seviye Ekle','Add level']},
  {id:'text', head:['Açıklama','Description'],      add:['Kalem Ekle','Add item']},
];
const eqUnit=id=>EQ_UNITS.find(u=>u.id===id)||EQ_UNITS[0];
/* The dots down the left of a level table. A band the coach names in the usual words
   gets the colour those words already mean — light is green, heavy is red — and
   anything else is coloured by its place in the list, so a fifth band nobody has a
   word for is still drawn. */
const EQ_DOTS=['#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
const EQ_LEVEL_DOTS=[
  {kw:['ekstra','extra','x-heavy'],c:'#8b5cf6'},
  {kw:['sert','heavy','ağır','agir'],c:'#ef4444'},
  {kw:['orta','medium','med'],       c:'#f59e0b'},
  {kw:['hafif','light'],             c:'#10b981'},
];
function eqDot(label,i){
  const s=String(label||'').trim().toLowerCase();
  const hit=s?EQ_LEVEL_DOTS.find(d=>d.kw.some(k=>s.includes(k))):null;
  return hit?hit.c:EQ_DOTS[i%EQ_DOTS.length];
}
/* How the ten items of the vocabulary arrive on the shelf when nobody has said
   otherwise: what they are, which drawer they are filed in, and what their lines
   measure. Everything here is editable on the card afterwards. */
const EQ_SEED={
  barbell:   {desc:['Olimpik bar','Olympic bar'],                  cat:'free',   unit:'kg'},
  dumbbell:  {desc:['Dambıl seti','Dumbbell set'],                 cat:'free',   unit:'kg'},
  cable:     {desc:['Kablo istasyonu','Cable station'],            cat:'machine',unit:'kg'},
  trapbar:   {desc:['Hex bar','Hex bar'],                          cat:'free',   unit:'kg'},
  medball:   {desc:['Med ball','Med ball'],                        cat:'access', unit:'kg'},
  plyobox:   {desc:['Plyo box','Plyo box'],                        cat:'func',   unit:'cm'},
  bands:     {desc:['Direnç lastiği','Resistance band'],           cat:'access', unit:'level'},
  sled:      {desc:['Kızak / prowler','Sled / prowler'],           cat:'func',   unit:'kg'},
  machine:   {desc:['Smith / Rack / Diğer','Smith / rack / other'],cat:'machine',unit:'text'},
  bodyweight:{desc:['Alet gerektirmez','No implement needed'],     cat:'func',   unit:'text'},
};
/* What picking a type fills the form in with. A coach who picks "Dumbbell" and types
   nothing else gets a card that is already right. */
function eqTypeFill(id){
  const known=DI_EQUIPMENT.find(x=>x.id===id);
  const seed=EQ_SEED[id]||null;
  return{name:known?L(known.label[0],known.label[1]):'',
    desc:seed?L(seed.desc[0],seed.desc[1]):'',
    cat:seed?seed.cat:'other',unit:seed?seed.unit:'kg'};
}
function eqCard(raw,i){
  if(!raw)return null;
  const id=String(raw.id||'').trim()||`${EQ_CUSTOM}${diExName(raw.name)}`;
  const known=DI_EQUIPMENT.find(x=>x.id===id);
  const seed=EQ_SEED[id]||null;
  const name=String(raw.name||'').trim()
    ||(known?L(known.label[0],known.label[1]):String(id).replace(EQ_CUSTOM,'').trim());
  if(!name)return null;
  const n=(v,dec)=>{const x=recNum(v);return x==null?null:Math.max(0,dec?Math.round(x*10)/10:Math.round(x));};
  return{
    cid:String(raw.cid||'').trim()||`eq_${id}_${i}`,
    id,name,
    desc:raw.desc==null?(seed?L(seed.desc[0],seed.desc[1]):''):String(raw.desc).trim(),
    cat:EQ_CATS.some(c=>c.id===raw.cat)?raw.cat:(seed?seed.cat:'other'),
    unit:EQ_UNITS.some(u=>u.id===raw.unit)?raw.unit:(seed?seed.unit:'kg'),
    photo:typeof raw.photo==='string'?raw.photo:'',
    rows:(Array.isArray(raw.rows)?raw.rows:[]).map((r,j)=>({
      rid:String((r&&r.rid)||'').trim()||`${i}_${j}_${uid()}`,
      v:n(r&&r.v,true),
      label:String((r&&r.label)||'').trim(),
      qty:n(r&&r.qty,false),
    })),
  };
}
/* The shelf a gym that has never seen this screen starts from: the ten items of the
   vocabulary, each holding whatever the old flat list already said about it. A card
   whose lines carry kilos is measured in kilos whatever its seed says — a height that
   was typed as a weight is not silently re-read as centimetres. */
function eqSeedCards(setup){
  const byId={};
  eqRows(setup).forEach(r=>{(byId[r.id]=byId[r.id]||[]).push(r);});
  const ids=DI_EQUIPMENT.map(x=>x.id)
    .concat(Object.keys(byId).filter(id=>!DI_EQUIPMENT.some(x=>x.id===id)));
  return ids.map((id,i)=>{
    const old=byId[id]||[];
    const known=DI_EQUIPMENT.find(x=>x.id===id);
    const seed=EQ_SEED[id]||null;
    const unit=seed?seed.unit:'kg';
    return eqCard({cid:`eq_${id}`,id,
      name:known?L(known.label[0],known.label[1]):(old[0]&&old[0].label)||String(id).replace(EQ_CUSTOM,''),
      cat:seed?seed.cat:'other',
      unit:(unit!=='kg'&&old.some(r=>r.kg!=null))?'kg':unit,
      rows:old.map(r=>({rid:r.rid,v:r.kg,label:'',qty:r.qty}))},i);
  }).filter(Boolean);
}
const eqCards=setup=>Array.isArray(setup&&setup.equipmentCards)
  ?setup.equipmentCards.map(eqCard).filter(Boolean)
  :eqSeedCards(setup);
/* What a card puts back into storage — the normalized shape, nothing else. */
const eqStoreCard=c=>({cid:c.cid,id:c.id,name:c.name,desc:c.desc,cat:c.cat,unit:c.unit,
  photo:c.photo||'',rows:(c.rows||[]).map(r=>({rid:r.rid,v:r.v,label:r.label,qty:r.qty}))});
/* How a line reads once it is off the card: "45 cm" for a box, "Sert" for a band, the
   card's own name for a kilo line, which already carries its weight in the kg field. */
const eqRowText=(c,r)=>c.unit==='cm'?(r.v!=null?`${r.v} cm`:''):(c.unit==='kg'?'':String(r.label||'').trim());
/* The flat list every reader downstream sees, written from the shelf. A card with no
   lines contributes nothing, which is what keeps it out of the inventory. */
const eqMirror=cards=>cards.reduce((out,c)=>out.concat((c.rows||[]).map(r=>{
  const tail=eqRowText(c,r);
  return{rid:r.rid,id:c.id,label:(c.name+(tail?` — ${tail}`:'')).trim(),
    qty:r.qty,kg:c.unit==='kg'?r.v:null};
})),[]);
const eqCardQty=c=>(c.rows||[]).reduce((t,r)=>t+(r.qty==null?0:r.qty),0);
/* What a piece of work NEEDS, read off the exercise's own tags when the library has
   them and off its name when it does not. Deliberately narrow: it exists to catch a
   barbell lift written for a gym with no barbell, not to classify exercises. */
const EQ_KEYWORDS=[
  {id:'trapbar', kw:['trap bar','hex bar','trap-bar']},
  {id:'barbell', kw:['barbell','back squat','front squat','bench press','deadlift','romanian','rdl','hip thrust','power clean','hang clean','snatch','push press','halter','barfiks yok']},
  {id:'dumbbell',kw:['dumbbell','dambıl','db ']},
  {id:'cable',   kw:['cable','kablo','pulldown','pull-down']},
  {id:'medball', kw:['med ball','medicine ball','sağlık topu','med-ball','medball']},
  {id:'plyobox', kw:['box jump','drop jump','depth jump','plyo box','pliometrik kutu','step-up box']},
  {id:'bands',   kw:['band','lastik']},
  {id:'sled',    kw:['sled','kızak','prowler']},
  {id:'machine', kw:['machine','makine','leg press','leg curl','leg extension','smith']},
];
function eqNeedOf(libItem,text){
  const tagged=[...exMulti(libItem&&libItem.equipment),...((libItem&&Array.isArray(libItem.equipmentTags))?libItem.equipmentTags:[])]
    .filter(Boolean).map(x=>String(x).toLowerCase());
  for(const e of EQ_KEYWORDS)if(tagged.some(t=>t.includes(e.id)))return e.id;
  const s=String(text==null?'':text).toLowerCase();
  if(!s.trim())return null;
  const hit=EQ_KEYWORDS.find(e=>e.kw.some(k=>s.includes(k)));
  return hit?hit.id:null;
}
/* Minutes of session time one exercise is assumed to take, used only to derive a
   ceiling when the coach has not set one. Deliberately blunt: it exists so the
   answer cannot return a twelve-exercise session into a 35-minute slot, not to
   predict how long anything really takes. */
const DI_MIN_PER_EX=6;

/* ---- Pain (§9) ------------------------------------------------------------
   The reported regions, the coach's standing constraint tags, and — for each — the
   movement patterns that region loads and the ones work is usually redirected to.
   The severity the check-in collects is 0-3 on the survey's grid; it is reported on
   the 0-5 scale the athletes are asked on as well, converted once here so nothing
   downstream has to guess which scale it is looking at. */
const diPain5=sev=>(sev==null||sev==='')?null:Math.round(Math.max(0,Math.min(3,Number(sev)))/3*5);
function diPain(ath,ref){
  const reports=athPainReports(ath,ref);
  const note=athPainNote(ath,ref);
  const tags=(ath.constraintTags||[]).filter(Boolean);
  const reported=new Set(reports.map(r=>r.tag));
  const mk=(tag,extra)=>{
    const r=PAIN_RULES[tag]||{};
    return{region:tag,label:ctLabel(tag),...extra,
      loads_patterns:r.hit||[],redirect_patterns:r.prefer||[]};
  };
  const regions=[
    ...reports.map(p=>mk(p.tag,{severity_0_3:p.sev==null?null:p.sev,severity_0_5:diPain5(p.sev),
      date:p.date,source:p.src==='text'?'check-in free text':'check-in region grid'})),
    /* A STANDING CONSTRAINT TAG IS A RESTRICTION, NOT A MISSING PAIN SCORE.
       These rode along with a null severity, and every reader downstream that asked
       "is this severe enough to close the pattern?" answered no — so a knee the coach
       had ticked as managed all season closed nothing, and the one thing a coach can
       state outright about an athlete was the one thing the session could ignore. It
       carries no number because nobody reported one this morning; it still binds. */
    ...tags.filter(t=>!reported.has(t)).map(t=>mk(t,{severity_0_3:null,severity_0_5:null,date:null,
      standing:true,source:'coach constraint tag'})),
  ];
  const peak=regions.reduce((m,r)=>Math.max(m,r.severity_0_5==null?0:r.severity_0_5),0);
  /* Yesterday's report beside today's, so a region can be read as settling or building
     rather than as a number on its own (§9.3). */
  const prev=athPainReports(ath,fmt(addD(parseD(ref),-1))).map(p=>p.tag);
  return{regions,
    peak_severity_0_5:regions.length?peak:null,
    athlete_words:note&&note.quoted?{text:note.text,date:note.date}:null,
    trend:regions.length?regions.map(r=>({region:r.label,
      yesterday:prev.includes(r.region),status:prev.includes(r.region)?'ongoing':'new'})):[],
    /* Every pattern today's pain says to take load off, collapsed once so the answer
       gets one list instead of the same pattern from three regions. */
    patterns_to_unload:[...new Set(regions.flatMap(r=>r.loads_patterns))],
    patterns_preferred:[...new Set(regions.flatMap(r=>r.redirect_patterns))]};
}

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
function diDifferentiators(ath,bundle,deficits,ref){
  const out=[];
  const add=(kind,tr,en)=>{if(out.length<DI_DIFF_MAX)out.push({kind,text:L(tr,en)});};

  // 1. An active injury — the hardest fact about this athlete today.
  ((bundle.injury&&bundle.injury.active)||[]).slice(0,2).forEach(inj=>{
    const bits=[inj.region,inj.side,inj.rtp_stage?L(inj.rtp_stage[0],inj.rtp_stage[1]):null]
      .filter(Boolean).join(' · ');
    add('injury',`aktif sakatlık: ${bits||inj.type||'kayıtlı'}`,`active injury: ${bits||inj.type||'on record'}`);
  });

  // 2. Pain, with how long it has been going on — a three-day knee is not a bad morning.
  ((bundle.pain&&bundle.pain.regions)||[])
    .filter(r=>r.standing||(r.severity_0_5!=null&&r.severity_0_5>=DI_PAIN_BLOCK))
    .slice(0,2).forEach(r=>{
      if(r.standing)
        return add('pain',`${r.label} — koçun kalıcı kısıt etiketi`,`${r.label} — standing coach restriction`);
      const n=diPainDays(ath,r.region,ref);
      add('pain',`${r.label} ağrısı ${r.severity_0_5}/5, ${n} gündür bildiriliyor`,
        `${r.label} pain at ${r.severity_0_5}/5, reported ${n} day${n>1?'s':''} running`);
    });

  // 3. The structural tier and the screen that set it (weakest link, rule 28).
  const t=bundle.tier||{};
  if(t.yapisal!=null){
    const weak=(t.zayif_halka||[])[0]||null;
    add('tier',`yapısal kademe ${t.yapisal}${weak?` (en zayıf halka: ${weak})`:''}`,
      `structural tier ${t.yapisal} of 3 — ${DI_TIER_SCALE}${weak?` (weakest link: ${weak})`:''}`);
    if(t.gecici_dusus)
      add('tier',`geçici kademe düşüşü — ${(t.gecici_dusus_gerekcesi||[])[0]||'çok günlük trend'}`,
        `temporary tier downgrade — ${(t.gecici_dusus_gerekcesi||[])[0]||'multi-day trend'}`);
  }

  // 4. The battery's own high-priority findings, as the code read them.
  ((deficits&&deficits.findings)||[]).filter(f=>f.oncelik==='yüksek').slice(0,2)
    .forEach(f=>add('finding',`bulgu: ${f.bolge} — ${f.bulgu}`,`finding: ${f.bolge} — ${f.bulgu}`));

  // 5. A performance test that has moved against the athlete's OWN baseline. Stated as
  //    that and nothing more — the app holds no squad percentiles to rank them in.
  (bundle.test_baselines||[])
    .filter(x=>x.deviation_pct!=null&&x.deviation_pct<=-DI_DIFF_TEST_DEV)
    .sort((a,b)=>a.deviation_pct-b.deviation_pct).slice(0,1)
    .forEach(x=>add('test',`${x.metric} kendi baseline'ının %${Math.abs(x.deviation_pct)} altında`,
      `${x.metric} is ${Math.abs(x.deviation_pct)}% below their own baseline`));

  // 6. Today's readiness, only where it is actually low enough to change anything.
  const rd=bundle.readiness||{};
  if(rd.score!=null&&rd.score<DI_RD_REDUCE)
    add('readiness',`hazır oluş ${rd.score}/5 (${rd.status||'—'})`,`readiness ${rd.score}/5 (${rd.status||'—'})`);

  // 7. Acute load standing clearly outside its zone.
  const acwr=bundle.load&&bundle.load.acwr;
  if(acwr!=null&&(acwr>1.5||acwr<0.8))
    add('load',`ACWR ${acwr} — ${acwr>1.5?'yüksek':'düşük'}`,`ACWR ${acwr} — ${acwr>1.5?'high':'low'}`);

  // 8. The role, last: it is a starting point (rule 9), not the athlete.
  const pos=bundle.athlete&&bundle.athlete.position;
  /* The group is named only where it says something the position does not
     ("Guard (Guard)" read as a typo rather than as information). */
  const pgl=bundle.athlete&&bundle.athlete.position_group;
  const posTxt=pos?`${pos}${pgl&&pgl!==pos?` (${pgl})`:''}`:'';
  if(pos)add('position',posTxt,posTxt);

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
   Read verbatim; the UPPER bound is the ceiling a session is held to, and the lower
   bound is carried so the prompt can aim inside the band rather than at its edge. */
const DI_PLYO_BANDS=[
  {under:13,min:20,max:40, label:['U9-U12','U9-U12']},
  {under:15,min:40,max:60, label:['U13-U14','U13-U14']},
  {under:19,min:60,max:100,label:['U15-U18','U15-U18']},
];
function diPlyoCeiling(bundle){
  const age=bundle&&bundle.athlete&&bundle.athlete.age;
  if(age==null)return null;               // no birth date → no band, and nothing is assumed
  const band=DI_PLYO_BANDS.find(b=>age<b.under);
  if(band)return{min:band.min,max:band.max,grup:L(band.label[0],band.label[1])};
  /* Senior. The rule splits by season half rather than by age: in-season 30-60,
     off-season 60-100. A phase the app cannot read leaves this unset rather than
     guessed — an unbounded check is better than a bound nobody stated. */
  const ph=(bundle.season_phase&&bundle.season_phase.id)||null;
  if(ph==='in'||ph==='playoff')return{min:30,max:60,grup:L('A takım, sezon içi','Senior, in-season')};
  if(ph==='off'||ph==='pre'||ph==='trans')return{min:60,max:100,grup:L('A takım, sezon dışı','Senior, off-season')};
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

