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

