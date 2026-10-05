/* ---- "Sporcu Bilgilerini Al" — the athlete as one JSON document ------------
   Everything a coach would paste into an outside model to have a session written for
   this athlete: the profile, this morning's check-in, the RPE log, every current test
   result with the coach's own comments on it, pain and injury, the gym's kit, this
   week's calendar and today's brief.

   BUILT AT THE PRESS, NEVER CACHED. The caller hands in the athlete record as it
   stands on this render and the brief with whatever is still sitting in a chip box,
   and nothing here is memoised — so a check-in that landed a minute ago, a test typed
   in another tab or a chip added just now is in the next copy.

   "Current" means current per field, not per record: the latest test may carry only a
   weigh-in while the FMS was screened a month earlier, and both are this athlete's
   current numbers. So every value is the most recent one on record up to the day,
   with the date it was taken beside it. Empty fields are dropped rather than sent as
   blanks; what the app holds nothing for is listed under `missing_data`. */
const SNAP_DAYS_EN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SNAP_SEX={M:['Erkek','Male'],F:['Kadın','Female']};
const snapSexLabel=v=>SNAP_SEX[v]?L(SNAP_SEX[v][0],SNAP_SEX[v][1]):null;
/* Drops '', null, undefined, empty arrays and empty objects, all the way down. */
function snapClean(v){
  if(Array.isArray(v)){const a=v.map(snapClean).filter(x=>x!==undefined);return a.length?a:undefined;}
  if(v&&typeof v==='object'){
    const o={};
    Object.keys(v).forEach(k=>{const x=snapClean(v[k]);if(x!==undefined)o[k]=x;});
    return Object.keys(o).length?o:undefined;
  }
  if(v==null)return undefined;
  if(typeof v==='string'){const t=v.trim();return t?t:undefined;}
  if(typeof v==='number'&&!isFinite(v))return undefined;
  return v;
}
/* Saves a JSON text as a file named after what it holds. */
function snapDownloadText(text,base,date){
  const safe=String(base||'sporcu').trim().replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_+|_+$/g,'')||'sporcu';
  const blob=new Blob([text],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safe}_${date}.json`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
/* The JSON on screen: one athlete's from the brief, or the whole sheet's from the bar. */
function DiJsonModal({title,date,snap,setSnap,fileBase}){
  if(!snap)return null;
  return ReactDOM.createPortal(<div className="modal-bg" onClick={()=>setSnap(null)}>
    <div className="modal di-snap" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-head">
        <h2 style={{margin:0,fontSize:16,flex:1}}>{title}
          <span className="di-dim" style={{fontSize:12,fontWeight:500,marginLeft:8}}>{L('program günü','session day')}: {fd(date)}</span></h2>
        <button className="x-btn" onClick={()=>setSnap(null)} aria-label={L('Kapat','Close')}>✕</button>
      </div>
      <div className="di-snap-bar">
        <span className="di-dim">{snap.copied===true?L('Panoya kopyalandı. ','Copied to the clipboard. ')
          :snap.copied===false?L('Otomatik kopyalanamadı — Kopyala\'ya bas. ','Could not copy automatically — press Copy. '):''}
          {snap.note?snap.note+' ':''}
          {L('Butona her bastığında o anki güncel verilerden yeniden oluşturulur.','Rebuilt from the current data on every press.')}</span>
        <button type="button" className="btn xs" onClick={()=>snapCopy(snap.text).then(ok=>setSnap(x=>x?{...x,copied:ok}:x))}>
          {L('Kopyala','Copy')}</button>
        <button type="button" className="btn xs sec" onClick={()=>snapDownloadText(snap.text,fileBase,date)}>{L('İndir (.json)','Download (.json)')}</button>
      </div>
      <pre className="di-snap-pre">{snap.text}</pre>
    </div>
  </div>,document.body);
}
/* Resolves true when the text reached the clipboard. The async API first; the old
   textarea route where it is missing or refused (plain http, an in-app browser). */
function snapCopy(text){
  const fallback=()=>{
    try{
      const ta=document.createElement('textarea');
      ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');document.body.removeChild(ta);return!!ok;
    }catch(e){return false;}
  };
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(()=>true,()=>fallback());
  }catch(e){}
  return Promise.resolve(fallback());
}
function diAthleteSnapshot({ath,setup,date,instr,customTests,now,session,libMap,recent}){
  return diInEnglish(()=>{
  const a=ath||{},s=setup||{};
  const ref=date||fmt(today);
  const byDate=(x,y)=>String(x.date).localeCompare(String(y.date));
  const upTo=list=>[...(list||[])].filter(r=>r&&r.date&&r.date<=ref).sort(byDate);
  /* Built here rather than taken from the caller: every label the bundle carries is
     read in the language it is built in, and the export is English whatever the page
     is showing. */
  const b=diBundle(a,s,ref,{libMap:libMap||undefined});
  const age=b.athlete&&b.athlete.age!=null?b.athlete.age:null;

  /* Measured data — tests and body readings — is always the NEWEST on record, whatever
     day the session is for: a test taken after the picked day is still this athlete's
     current number, and a JSON that held the latest test back read as if it had never
     been entered. Older tests only fill in a measure the newest one did not take. */
  const allDated=list=>[...(list||[])].filter(r=>r&&r.date).sort(byDate);
  /* Body: the latest reading of each measure across the body-composition log and the
     test sheets (a weigh-in is often only on one of them), falling back to the card. */
  const bodyRows=allDated([...(a.measurements||[]),...(a.tests||[])]);
  const latestBody=(k,card)=>{
    for(let i=bodyRows.length-1;i>=0;i--){const v=recNum(bodyRows[i][k]);if(v!=null)return{value:v,date:bodyRows[i].date};}
    const c=recNum(card);return c!=null?{value:c,date:null,source:'athlete card'}:null;
  };
  const height=latestBody('height',a.height),weight=latestBody('weight',a.weight),fat=latestBody('bodyFat',null);

  /* The check-in. The latest one on record, however old, with how old it is — a
     four-day-old morning is still information, as long as it says it is four days old. */
  const ws=upTo(a.wellness);
  const lastW=ws[ws.length-1]||null;
  const wAge=lastW?diffD(lastW.date,ref):null;
  const wFrom=fmt(addD(parseD(ref),-6));
  const week=ws.filter(w=>w.date>=wFrom);
  /* The engine keeps a baseline for its own fields; mental and physical fatigue are
     not among them, so theirs is read here the same way. */
  const base=id=>{
    const x=((b.wellness&&b.wellness.baselines)||[]).find(y=>y.field===id);
    if(x)return x;
    const d=diBaseline(a,id,ref);
    return d.baseline!=null?{baseline:d.baseline,deviation_pct:d.deviation}:null;
  };
  const scale='1-5 (5 = best)';
  /* One field against the athlete's own average. Its day-by-day values are in
     wellness.last_7_days and not repeated here; a field never answered is left out
     whole rather than sent as a name with nothing under it. */
  const wField=(id,name)=>{
    const last=[...ws].reverse().find(w=>recNum(w[id])!=null)||null;
    if(!last)return null;
    const bl=base(id);
    const v=recNum(last[id]),avg=bl?recNum(bl.baseline):null;
    return{
      name,
      latest_value:v,
      date:last.date,
      days_ago:diffD(last.date,ref),
      scale:id==='RHR'?'bpm (above the personal average is worse)':null,
      personal_average:avg,
      /* Of the value printed beside it. The engine's own deviation is of the mean of the
         last three days, and written next to latest_value it read as that value's
         deviation — a 4.5 against an average of 4.13 went out as +1.1 %. */
      deviation_from_average_pct:(v!=null&&avg)?Math.round((v-avg)/avg*1000)/10:null,
    };
  };
  const painRegions=((b.pain&&b.pain.regions)||[]);
  const painGraded=r=>!r.standing&&Number(r.severity_0_3)>0;

  /* RPE: the athlete's own log, per slot, for the last seven days — plus the load
     figures the rest of the app reads off it. */
  const srpe=upTo(a.srpeLog).filter(e=>e.date>=wFrom);
  const KIND={tp:'Team practice',sc:'Strength & conditioning',game:'Game'};
  const slot=(e,k)=>{
    const r=recNum(e[k+'RPE']),d=recNum(e[k+'Duration']);
    return(r==null&&d==null)?null:{type:KIND[k],rpe:r,duration_min:d,load_au:(r!=null&&d!=null)?Math.round(r*d):null};
  };
  const ld=b.load||{};

  /* Tests: every metric the comparison table knows (the coach's own tests included),
     each at its most recent value. */
  const tests=allDated(a.tests);
  const newest=(get)=>{for(let i=tests.length-1;i>=0;i--){let v=null;try{v=get(tests[i]);}catch(e){}if(v!=null)return{v,t:tests[i]};}return null;};
  const groups={};
  cmpMetrics(customTests||[]).forEach(m=>{
    const hit=newest(m.get);
    if(!hit)return;
    const g=CMP_GROUPS.find(x=>x.id===m.g);
    const gk=g?g.en:m.g;
    /* Height, weight and body fat are on the athlete block already, newest reading
       and date included. */
    if(gk==='Anthropometry'&&/^(height|weight|body fat)$/i.test(cmpLabel(m)))return;
    (groups[gk]=groups[gk]||[]).push({test:cmpLabel(m),value:hit.v,unit:m.u||null,date:hit.t.date});
  });
  const fmsHit=newest(t=>{const r=fmsCalc(t.fms);return r.n?r:null;});
  const fms=fmsHit?{
    /* The ceiling of what was actually scored (3 per movement), not the full 21: a
       two-movement screen totalling 4 is 4 of 6, not a poor FMS. */
    date:fmsHit.t.date,total:fmsHit.v.total,movements_scored:fmsHit.v.n,max:fmsHit.v.n*3,
    complete:fmsHit.v.n>=7,
    note:fmsHit.v.n<7?`Only ${fmsHit.v.n} of the 7 FMS movements were scored; total and max cover those movements only.`:null,
    movements:fmsHit.v.items.filter(i=>i.filled).map(i=>({movement:i.en,score:i.score,
      right:i.right,left:i.left,asymmetry:i.asym,
      clearing_test:(i.clear&&i.cleared)?(i.cleared==='pos'?'positive (painful)':'negative'):null}))}:null;
  const circHit=newest(t=>{const c=t.circ||{};return Object.keys(c).some(k=>recNum(c[k])!=null)?c:null;});
  const CIRC=[['shoulder','Shoulder'],['waist','Waist'],['hip','Hip'],['thighRight','Thigh R'],
    ['thighLeft','Thigh L'],['calfRight','Calf R'],['calfLeft','Calf L']];
  /* The coach's comments: each comment box at its most recent non-empty entry, word
     for word, with the date of the sheet it was written on. */
  const notes=[],seenNote=new Set();
  for(let i=tests.length-1;i>=0;i--){
    diObservations(tests[i]).sources.forEach(o=>{
      if(seenNote.has(o.alan))return;
      seenNote.add(o.alan);notes.push({field:o.alan,comment:o.metin,date:tests[i].date});
    });
  }
  const lastTest=tests[tests.length-1]||null;

  /* Injury records, whole — the coach's notes on them included. */
  const injRow=i=>({type:i.type,location:i.location||i.area,side:i.side,tissue:i.tissueType||i.diagnosis,grade:i.grade,
    mechanism:i.mechanism,context:i.context,date:i.date||i.firstInjuryDay,status:i.status,
    rtp_stage:i.rtpStage?((diRtpRow(i.rtpStage)||{label:[i.rtpStage,i.rtpStage]}).label[1]):null,
    restrictions:i.restrictions,estimated_return:i.estimatedReturn||i.expectedReturn,actual_return:i.actualReturn,notes:i.notes});
  const allInj=(a.injuries||[]).filter(i=>i&&diInjOnsetBy(i,ref));
  const activeInj=allInj.filter(i=>!i.actualReturn&&(!i.status||i.status!=='Recovered'));
  const pastInj=allInj.filter(i=>!activeInj.includes(i));

  /* The week the day sits in, Monday to Sunday, as the athlete's own calendar holds it
     (team sessions are mirrored onto it, so this is what the athlete actually has). */
  const mon=sow(parseD(ref));
  const comps=(s.competitions||[]).filter(c=>c&&c.date);
  const exRow=(e,bl)=>({name:e.name,phase:blkPhases(bl).includes(exPhase(e))?(blkPhaseLbl(exPhase(e),bl)||null):null,sets:e.sets,reps:e.reps,duration:e.duration,
    tempo:e.tempo,rpe:e.rpe,load:e.load,rest:e.rest,notes:e.notes});
  const calendar=[];
  for(let k=0;k<7;k++){
    const dk=fmt(addD(mon,k));
    const day=(a.days||{})[dk]||{};
    const comp=comps.filter(c=>c.date===dk).map(c=>c.name||'Game');
    calendar.push({date:dk,weekday:SNAP_DAYS_EN[k],is_session_day:dk===ref||null,
      games:comp.length?comp:null,
      sessions:(day.sessions||[]).map(x=>({name:x.name,time:x.time,duration_min:recNum(x.duration),load_type:x.loadType,
        purpose:x.purpose,focus:x.focus,sub_focus:x.sub,region:x.region,team_session:x.sourceId?true:null,
        srpe:recNum(x.sRPE),notes:x.notes,plan_note:x.planNote,
        blocks:(x.blocks||[]).filter(bl=>bl&&!bl.removed).map(bl=>({name:bl.name,
          exercises:(bl.exercises||[]).filter(e=>String(e.name||'').trim()).map(e=>exRow(e,bl))}))})),
      daily_notes:day.dailyNotes});
  }
  const eq=eqAvailable(s);
  /* THE DAY THE SESSION IS FOR — first, because every number below is read against
     it. It is the date picked on the page, which need not be today: a coach writing
     Thursday's session on Tuesday gets Thursday here, and how far off it is. */
  const nowD=new Date(now||Date.now());
  const todayKey=fmt(new Date(nowD.getFullYear(),nowD.getMonth(),nowD.getDate()));
  const offset=diffD(todayKey,ref);
  const wd=(parseD(ref).getDay()+6)%7;
  const cp=b.competition||{};
  const ses=session||null;
  const target={
    date:ref,
    weekday:SNAP_DAYS_EN[wd],
    relative_to_today:offset===0?'today':offset===1?'tomorrow':offset===-1?'yesterday'
      :offset>0?`in ${offset} days`:`${-offset} days ago`,
    match_day_label:cp.md,
    game_on_the_day:cp.today?(cp.today.name||'Game'):null,
    next_game:cp.next?{date:cp.next.date,name:cp.next.name,days_until:cp.next.days_until}:null,
    previous_game:cp.previous?{date:cp.previous.date,name:cp.previous.name,days_since:cp.previous.days_since}:null,
    season_phase:b.season_phase&&b.season_phase.label,
    season_phase_focus:b.season_phase&&b.season_phase.focus,
    source_session:ses?{name:ses.name,time:ses.time,duration_min:recNum(ses.duration),focus:ses.focus,region:ses.region}:null,
  };

  /* What an outside model needs in order to write a session CoachOS will accept: the
     same differentiators and code-checked limits the in-app writer is given, and the
     answer's shape. The validator reads the answer against exactly these on import. */
  const brief=instr||diInstr(null,null);
  const deficitsX=diDeficits(a,ref);
  const diffsX=diDifferentiators(a,b,deficitsX,ref);
  const blockedX=diBlockedPatterns(b,brief);
  const blockedSetX=diBlockedSet(blockedX);
  const restrX=diRestrictions(b,brief);
  const plyoX=diPlyoCeiling(b);
  const capsX=diTierCaps(b.tier&&b.tier.gecerli);
  /* The engine's own records carry Turkish source tags the validator compares
     against; they are translated on the way out, never at the source. */
  const SRC_EN={'check-in ağrı bildirimi':'check-in pain report','koç kısıt etiketi':'coach constraint tag',
    'sakatlık kaydı':'injury record','antrenör talimatı':'coach brief','ölçüm':'measurement'};
  const PRIO_EN={'yüksek':'High','orta':'Medium','düşük':'Low'};
  const limits={
    blocked_patterns:blockedX.map(x=>({region:x.bolge,severity_0_5:x.siddet_0_5,source:SRC_EN[x.kaynak]||x.kaynak,
      standing:x.kalici,blocked_patterns:x.yasak_paternler,
      opened_for_coach_patterns:x.acilan_paternler&&x.acilan_paternler.length?x.acilan_paternler:null,
      redirect_to_patterns:x.yonlendirilecek_paternler})),
    blocked_patterns_note:blockedX.some(x=>(x.acilan_paternler||[]).length)
      ?'opened_for_coach_patterns: this region\'s pain would close these patterns, but the coach requires them today (coach_brief.movement_patterns). They are open: write them as pain-free, modified variations and say so in the rationale and coach_warning.':null,
    /* A pattern whose own name is a hard-restriction term ("squat" → Squat) is not
       offered as open: every exercise in it that says so in its name is blocked. */
    available_patterns:IV_PATTERNS.filter(p=>!blockedSetX.has(p)&&
      !restrX.some(r=>diExName(p).split(' ').some(w=>(r.terimler||[]).includes(w)))),
    available_patterns_note:'Open as far as pain, injury and the coach\'s restrictions allow. hard_restrictions still apply by exercise name inside every pattern.',
    hard_restrictions:restrX.map(r=>({source:SRC_EN[r.kaynak]||r.kaynak,region:r.bolge,rtp_stage:r.rtp,text:r.metin,match_terms:r.terimler})),
    /* How the check reads a restriction — word by word, not as a phrase — said here so
       "deep squat" is not taken to leave every other squat open. */
    hard_restriction_matching_rule:restrX.length?'An exercise violates a restriction when ANY ONE of the words in match_terms appears in its name as a whole word '+
      '(or the whole text does). E.g. a "deep squat" restriction covers every exercise with "squat" in its name.':null,
    tier_caps:capsX?{current_tier:b.tier.gecerli,tier_scale:DI_TIER_SCALE,max_sets_per_exercise:capsX.max_sets,max_main_phase_exercises:capsX.max_main,
      plyometric_note:plyoX?(capsX.plyo_note_en||capsX.plyo_note):null,
      note:'max_sets_per_exercise is the set ceiling of a single exercise row; max_main_phase_exercises is the ceiling on the number of exercises in the main phase.'}:null,
    plyometric_contact_limit:plyoX?{min:plyoX.min,max:plyoX.max,group:plyoX.grup,
      note:'Total ground contacts (sets × reps, only rows in the Jump / Plyo pattern) may not exceed this ceiling.'}:null,
    session_duration_min:brief.duration,
    minutes_per_exercise:DI_MIN_PER_EX,
    minutes_per_exercise_note:brief.duration==null?null:'Session length is computed as the number of exercises × minutes_per_exercise (all phases included) and compared with session_duration_min.',
    session_max_exercises:brief.maxExercises,
    volume_adjustment_pct:b.adjustment?b.adjustment.pct:null,
    volume_adjustment_reasons:b.adjustment?b.adjustment.reasons.map(r=>`${r.label} (${r.pct}%)`):null,
  };

  /* The Athlete Training Profile — the coach's priorities, movement profile and
     constraints, and the exposure the calendar shows — as the ground the session is
     written on. It describes the athlete; the model reads it, nothing here acts on it. */
  const atp=atpSnapshot(a,ref,libMap||null,s);
  const out={
    session_day:target,
    task:DI_EXT_TASK,
    generated_at:nowD.toISOString(),
    athlete:{
      id:a.id,name:a.name,jersey_number:a.number,
      age,date_of_birth:a.dateOfBirth,
      sex:snapSexLabel(a.sex),
      height_cm:height,body_weight_kg:weight,body_fat_pct:fat,
      position:b.athlete&&b.athlete.position,position_group:b.athlete&&b.athlete.position_group,
      training_age_years:b.athlete&&b.athlete.training_age_years,
      level:b.athlete&&b.athlete.level,body_type:b.athlete&&b.athlete.vucut_tipi,
      sport:s.sport,
      /* Context for the role, not a prescription from it (§4.3). */
      position_emphasis:b.athlete&&b.athlete.position_qualities,
    },
    training_profile:atp.out,
    wellness:{
      latest_checkin:lastW?{date:lastW.date,days_ago:wAge,
        readiness:recNum(lastW.readiness),sleep:recNum(lastW.sleep),fatigue:recNum(lastW.fatigue),
        mental_fatigue:recNum(lastW.mentalFatigue),physical_fatigue:recNum(lastW.physicalFatigue),
        muscle_soreness:recNum(lastW.soreness),stress:recNum(lastW.stress),mood:recNum(lastW.mood),
        resting_hr_bpm:recNum(lastW.RHR),pain_area_note:painFreeText(lastW.areaOfPain)}:null,
      scale,
      readiness:b.readiness?{score:b.readiness.score,status:b.readiness.status,source:b.readiness.source,
        date:b.readiness.checkin_date,signals:b.readiness.signals}:null,
      last_7_days:week.map(w=>({date:w.date,readiness:recNum(w.readiness),sleep:recNum(w.sleep),
        fatigue:recNum(w.fatigue),mental_fatigue:recNum(w.mentalFatigue),physical_fatigue:recNum(w.physicalFatigue),
        muscle_soreness:recNum(w.soreness),resting_hr_bpm:recNum(w.RHR)})),
    },
    rpe:{
      /* The last entry is already the last day of last_7_days when it falls in that
         week; it is written out only when it is older than that. */
      latest_entry:(ld.last&&!srpe.some(e=>e.date===ld.last.date))?{date:ld.last.date,type:KIND[ld.last.kind]||ld.last.kind,rpe:ld.last.rpe,duration_min:ld.last.duration,srpe_au:ld.last.srpe}:null,
      avg_rpe_3_days:ld.rpe3,avg_rpe_7_days:ld.rpe7,avg_rpe_previous_7_days:ld.rpe_prev7,trend:ld.trend,
      srpe_7_days_au:ld.srpe7,srpe_previous_7_days_au:ld.srpe_prev7,load_change_pct:ld.load_change_pct,
      acwr:ld.acwr,acwr_zone:ld.acwr_zone,
      /* The chronic side is averaged over the history the 28-day window actually holds,
         so with a week or less of it the ratio is acute over itself — 1.0, "optimal",
         whatever the load was. Said, so it is not read as a measured balance. */
      acwr_note:(()=>{const h=loadWindows(k=>athDayLoad(a,k),ref).hist;
        return ld.acwr!=null&&h<=7?`Only ${h} day(s) of load history in the 28-day window: acute and chronic cover the same days, so ACWR is 1.0 by construction and says nothing yet.`:null;})(),
      monotony:ld.monotony,hard_days_7:ld.hard_days_7,
      last_7_days:srpe.map(e=>({date:e.date,
        sessions:[slot(e,'tp'),slot(e,'sc'),slot(e,'game')].filter(Boolean),
        total_load_au:recNum(e.totalLoad)})),
    },
    sleep:wField('sleep','Sleep'),
    fatigue:wField('fatigue','Fatigue (mean of mental + physical)'),
    mental_fatigue:wField('mentalFatigue','Mental fatigue / stress'),
    physical_fatigue:wField('physicalFatigue','Physical fatigue'),
    muscle_soreness:wField('soreness','Muscle soreness'),
    resting_heart_rate:wField('RHR','Resting heart rate'),
    tests:{
      latest_test_date:lastTest?lastTest.date:null,
      test_record_count:tests.length,
      results:groups,
      fms:fms,
      circumferences_cm:circHit?{date:circHit.t.date,
        measurements:CIRC.map(([k,n])=>recNum(circHit.v[k])!=null?{site:n,value:recNum(circHit.v[k])}:null).filter(Boolean)}:null,
      overhead_squat_compensations:(()=>{const h=newest(t=>((t.ohs&&t.ohs.problems)||[]).filter(x=>String(x||'').trim()).length
        ?t.ohs.problems.filter(x=>String(x||'').trim()):null);return h?{date:h.t.date,list:h.v}:null;})(),
      comments:notes,
      deviations_from_personal_average:DI_TEST_METRICS.map(m=>diTestBaseline(a,m,null)).filter(x=>x&&x.baseline!=null)
        .map(x=>({test:L(x.label[0],x.label[1]),current:x.current,personal_average:x.baseline,
          deviation_pct:x.deviation,unit:x.unit.trim()||null,date:x.date,readings:x.n})),
    },
    pain_and_injury:{
      /* A region ticked without a grade (the multi-select question) or named only in
         the free-text box is a REPORT whose severity was never asked. The engine keeps
         it as 0, but in the JSON a 0 reads as "no pain" — so it goes out with no number
         and says it is ungraded, and the peak is taken over the graded reports only. */
      current_pain:painRegions.map(r=>{const g=painGraded(r);
        return{region:r.label,severity_0_5:g?r.severity_0_5:null,severity_0_3:g?r.severity_0_3:null,
          severity_graded:r.standing||g?null:false,
          date:r.date,source:r.source,standing_constraint:r.standing||null,trend:((b.pain.trend||[]).find(t=>t.region===r.label)||{}).status};}),
      /* The 3D body map as the athlete marked it — exact region, side and grade —
         because the tags above are coarse and some regions (neck, chest, abdomen…)
         have no tag at all. Today's check-in, plus yesterday's regions still carrying. */
      pain_map:(()=>{
        const{today:tw,yesterday:yw}=painCheckinsFor(a,ref);
        const SEV=PAIN_SEV_LABEL(),out=[],seen=new Set();
        const add=(w,carry)=>{if(!w||!w.painMap||typeof w.painMap!=='object')return;
          painEntries(w.painMap).forEach(({region,sev})=>{
            if(seen.has(region)||(carry&&!painCarries(sev)))return;seen.add(region);
            const side=/^Sağ /.test(region)?'right':/^Sol /.test(region)?'left':null;
            out.push({region:painRegionEn(region),side,severity_0_3:sev||null,severity:SEV[sev]||null,
              severity_graded:sev?null:false,date:w.date,today:w===tw||null});});};
        add(tw,false);add(yw,true);
        return out;})(),
      peak_pain_0_5:painRegions.some(painGraded)?b.pain.peak_severity_0_5:null,
      athlete_words:b.pain&&b.pain.athlete_words,
      patterns_to_unload:b.pain&&b.pain.patterns_to_unload,
      /* Only patterns the limits leave open: a pattern the coach's brief or a hard
         restriction closes (squat, under "no deep squat") is not offered here as the
         one to steer towards. Nor is one another painful region asks to unload: a mild
         neck takes Push off without blocking it, and a knee redirecting to Push must
         not put it back in the list it was just taken out of. */
      preferred_patterns:b.pain&&(b.pain.patterns_preferred||[]).filter(p=>limits.available_patterns.includes(p)
        &&!(b.pain.patterns_to_unload||[]).includes(p)),
      standing_constraint_note:a.constraints,
      active_injuries:activeInj.map(injRow),
      past_injuries:pastInj.slice(-6).map(injRow),
      recurring_regions:((b.injury&&b.injury.recurrence)||[]).map(r=>({region:r.region,episodes:r.episodes})),
    },
    equipment:diEquipmentForAI(s),
    weekly_calendar:{
      week:`${fmt(mon)} – ${fmt(addD(mon,6))}`,
      days:calendar,
    },
    coach_brief:diBriefForAI(brief),
    differentiators:diffsX.map(d=>({id:d.id,type:d.kind,description:d.text})),
    measured_deficits:((deficitsX&&deficitsX.findings)||[]).map(f=>({area:f.bolge,finding:f.bulgu,
      required_work:f.gereken_calisma,priority:PRIO_EN[f.oncelik]||f.oncelik,measurement:f.olcum,source:SRC_EN[f.kaynak]||f.kaynak})),
    code_checked_limits:limits,
    /* What this athlete was written on the last days this module wrote for them — so
       the answer does not hand them the same session again (rule 23). */
    recent_programs:recent&&recent.length?recent.map(p=>({date:p.tarih,exercises:p.egzersizler,differentiators:p.ayirt_ediciler})):null,
    sport_context:diSportContext(s),
    movement_pattern_vocabulary:[...IV_PATTERNS],
    movement_families:diFamiliesForAI(),
    exercise_library:diLibraryForAI(libMap,s),
    output_format:DI_EXT_SCHEMA,
  };
  const missing=[];
  if(age==null)missing.push('age (no date of birth)');
  if(!snapSexLabel(a.sex))missing.push('sex (not set on the athlete card)');
  if(!height)missing.push('height');
  if(!weight)missing.push('body weight');
  if(!fat)missing.push('body fat');
  if(!out.athlete.position)missing.push('position');
  if(out.athlete.training_age_years==null)missing.push('training age (not set on the athlete card)');
  if(b.tier&&b.tier.yapisal==null)missing.push('structural tier (no screening results — no tier assumed)');
  if(!lastW)missing.push('wellness check-in');
  if(!srpe.length)missing.push('RPE in the last 7 days');
  if(!tests.length)missing.push('test record');
  if(!eq.length)missing.push('equipment inventory');
  if(!atp.filled)missing.push('training profile (no athletic profile or constraints entered)');
  if(!cp.next&&!cp.previous&&!cp.today)missing.push('game schedule (no games on the season calendar — next_game and the game-proximity volume adjustment cannot be computed; a game mentioned only in coach_brief.additional_notes is not in volume_adjustment_pct)');
  const res=snapClean(out)||{};
  if(missing.length)res.missing_data=missing;
  return res;
  });
}

