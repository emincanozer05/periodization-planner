/* =========================================================
   PERIODS & WEEKS
   ========================================================= */
function autoPeriods(s){
  if(!s.seasonStart||!s.seasonEnd)return[];
  const start=parseD(s.seasonStart),end=parseD(s.seasonEnd);
  const total=diffD(s.seasonStart,s.seasonEnd);
  const fc=s.competitions[0]?parseD(s.competitions[0].date):addD(start,Math.floor(total*.25));
  const lc=s.competitions.slice(-1)[0]?parseD(s.competitions.slice(-1)[0].date):addD(end,-14);
  const pre=diffD(s.seasonStart,fmt(fc));const gpEnd=addD(start,Math.floor(pre*.6));
  return[{id:'gp',name:'General Preparation',start:fmt(start),end:fmt(addD(gpEnd,-1))},
    {id:'sp',name:'Specific Preparation',start:fmt(gpEnd),end:fmt(addD(fc,-1))},
    {id:'comp',name:'Competition',start:fmt(fc),end:fmt(lc)},
    {id:'trans',name:'Transition',start:fmt(addD(lc,1)),end:fmt(end)}];
}
function getPeriods(s){
  if(s.periods&&Array.isArray(s.periods)&&s.periods.length===4)return s.periods;
  return autoPeriods(s);
}
/* Every week runs the periodization model of the season phase it falls in. */
function buildWeeks(setup,periods,ov){
  if(!periods.length)return[];const rows=[];let cur=sow(parseD(setup.seasonStart));const end=parseD(setup.seasonEnd);
  const ranges=seasonPhaseRanges(setup,periods);
  while(cur<=end){const k=fmt(cur);const p=periods.find(p=>k>=p.start&&k<=p.end)||periods[0];
    rows.push({k,p,ph:seasonPhaseAt(ranges,k,p.id)});cur=addD(cur,7);}
  return rows.map((r,i)=>{
    const d=defWeek(phaseModel(setup,r.ph),r.p,i,setup.competitions,r.k);
    return{...d,...(ov[r.k]||{}),week:r.k,period:r.p.id};});
}
function defWeek(model,period,idx,comps,ws){
  const nc=comps.map(c=>parseD(c.date)).filter(d=>d>=parseD(ws)&&diffD(ws,fmt(d))<=14).sort((a,b)=>a-b)[0];
  const dtc=nc?diffD(ws,fmt(nc)):null;
  let v=70,it=70,f='General',t=false;
  if(period.id==='gp'){v=85;it=55;f='Base + aerobic';}
  if(period.id==='sp'){v=75;it=75;f='Sport-specific';}
  if(period.id==='comp'){v=55;it=85;f='Maintain & peak';}
  if(period.id==='trans'){v=35;it=40;f='Active recovery';}
  /* Hybrid: blocks while preparing, undulating waves through the competition period. */
  if(model==='hybrid')model=(period.id==='gp'||period.id==='sp')?'block':period.id==='comp'?'undulating':'';
  if(model==='linear'){v=Math.max(30,v-(idx%16)*.7);it=Math.min(95,it+(idx%16)*.5);}
  if(model==='auto')f='Readiness-guided';
  if(model==='block'){const ph=idx%3;if(ph===0){v+=10;it-=10;f='Accumulation';}if(ph===1)f='Transmutation';if(ph===2){v-=15;it+=10;f='Realization';}}
  if(model==='undulating'){if(idx%2===0){v+=8;it-=5;f='Hi-volume wave';}else{v-=8;it+=5;f='Hi-intensity wave';}}
  if(dtc!=null&&period.id==='comp'){t=true;v=Math.round(v*(dtc<=7?.55:.75));it=Math.min(95,it+5);f=`Taper ${dtc}d`;}
  return{volume:Math.round(v),intensity:Math.round(it),focus:f,taper:t};
}

/* =========================================================
   MONOTONY / ACWR
   ========================================================= */
function dailyLoads(days,from,to){const o=[];let c=parseD(from);const e=parseD(to);while(c<=e){o.push({date:fmt(c),load:dLoad(days[fmt(c)])});c=addD(c,1);}return o;}
/* ---- Team daily load: ONE source of truth ----------------------------------------
   The calendar's monotony chip and the Load Monitoring card used to compute their own
   daily loads and could disagree. Both now go through these helpers.
   A planned day uses its team-plan session AU (exactly what the calendar cards show);
   a day with only athlete logs uses the per-athlete AVERAGE, so the number isn't
   skewed by how many athletes happened to log. */
function plannedDayLoadMap(days){const m={};
  Object.entries(days||{}).forEach(([d,day])=>{
    const v=((day&&day.sessions)||[]).reduce((t,s)=>t+(Number(s.au)||((s.sRPE!==''&&s.sRPE!=null)?Number(s.sRPE)*Number(s.duration||0):0)),0);
    if(v>0)m[d]=v;});
  return m;}
function teamDailyLoadMap(days,athletes){
  const m=plannedDayLoadMap(days);
  const byDate={};   // date -> { athleteId: that athlete's total AU for the day }
  (athletes||[]).forEach(a=>(a.srpeLog||[]).forEach(e=>{
    if(!e.date)return;
    const v=Number(e.totalLoad)||((Number(e.tpLoad)||0)+(Number(e.scLoad)||0)+(Number(e.gameLoad)||0));
    if(v>0){(byDate[e.date]||(byDate[e.date]={}));byDate[e.date][a.id]=(byDate[e.date][a.id]||0)+v;}}));
  Object.entries(byDate).forEach(([d,aths])=>{const vals=Object.values(aths);
    if(m[d]==null&&vals.length)m[d]=vals.reduce((x,y)=>x+y,0)/vals.length;});
  return m;}
/* ---- Team monotony for one Mon–Sun week ------------------------------------------
   Computed the standard way: each athlete's OWN weekly monotony first
   (their mean daily load ÷ the SD of their daily loads), then the plain average of
   those values across the squad. Collapsing the roster into one average load curve
   first and taking the monotony of that curve is a different — and wrong — number,
   because averaging smooths away exactly the day-to-day variation monotony measures.
   Athletes with no load logged in the week are skipped, so the mean isn't dragged
   down by players who simply didn't train or log. mean / sd / strain are averaged the
   same way, so the Load Monitoring card's mini stats stay per-athlete too.
   With no logs at all the week falls back to the planned team-plan daily loads, so a
   purely planned week still reads instead of showing "no data". */
function athWeekLoads(a,weekStartKey){
  return Array.from({length:7},(_,i)=>({load:athDayLoad(a,fmt(addD(parseD(weekStartKey),i)))}));}
function teamWeekMono(days,athletes,weekStartKey){
  const per=(athletes||[]).map(a=>weekMono(athWeekLoads(a,weekStartKey))).filter(r=>r.monotony>0);
  if(per.length){
    const avg=k=>per.reduce((s,r)=>s+r[k],0)/per.length;
    return{mean:avg('mean'),sd:avg('sd'),monotony:avg('monotony'),strain:avg('strain'),total:avg('total'),n:per.length};
  }
  const m=plannedDayLoadMap(days);
  return{...weekMono(Array.from({length:7},(_,i)=>({load:Math.round(m[fmt(addD(parseD(weekStartKey),i))]||0)}))),n:0};}
/* Squad acute / chronic / ACWR at a reference day, the same per-athlete way as the
   monotony above: each athlete's own 7-day mean, 28-day mean and ACWR first, then the
   plain average across the athletes who have any load in the 28-day window. Reading
   acute and chronic off the team-plan curve while monotony came from the athletes' own
   logs put two different data sources on one card (a 172 AU acute next to a monotony
   that implied a ~90 AU mean). With no athlete load at all it falls back to the team
   daily curve, so a purely planned squad still reads. */
function teamLoadStats(athletes,teamLoadAt,ref,teamFirst){
  const per=(athletes||[]).map(a=>{const w=athLoadWindows(a,ref);
    return w.ch>0?{acute:w.ac/7,chronic:w.ch/(w.weeks*7),acwr:w.ac/(w.ch/w.weeks)}:null;}).filter(Boolean);
  if(per.length){const avg=k=>per.reduce((s,r)=>s+r[k],0)/per.length;
    return{acute:avg('acute'),chronic:avg('chronic'),acwr:avg('acwr'),n:per.length};}
  const w=loadWindows(teamLoadAt,ref,teamFirst);
  return{acute:w.ac/7,chronic:w.ch/(w.weeks*7),acwr:w.ch>0?w.ac/(w.ch/w.weeks):0,n:0};}
function weekMono(loads){const a=loads.map(l=>l.load);const m=a.reduce((s,v)=>s+v,0)/a.length;if(m===0)return{mean:0,sd:0,monotony:0,strain:0,total:0};
  const sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length);const mono=sd===0?0:m/sd;const total=a.reduce((s,v)=>s+v,0);return{mean:m,sd,monotony:mono,strain:total*mono,total};}
/* ACWR = acute load (the last 7 days' total, ref included) ÷ chronic load (the last 28
   days' weekly average: the 28-day total ÷ 4). The same ratio as the 7-day daily mean
   over the 28-day daily mean.

   Rest days are load. A window whose first weeks are empty — a layoff, an injury, a
   break — still divides by four weeks, so the return reads as the spike it is. The
   only shortening is a true cold start: when the athlete's FIRST load ever (`first`,
   a date key) falls inside the window, the days before it are not rest, they are
   before the record began, so the chronic side averages over the days since `first`
   (min 1 week, max 4). Without that every new athlete would read 4.00 "High risk" in
   their first week. `first` is looked up over the whole record, never inside the
   window: reading it off the window took a three-week rest for a cold start and
   halved the ratio it should have flagged. */
function loadWindows(loadAt,ref,first){const r=parseD(ref);let ac=0,ch=0,inWin=0;
  for(let i=0;i<28;i++){const v=loadAt(fmt(addD(r,-i)))||0;ch+=v;if(v>0)inWin=i+1;if(i<7)ac+=v;}
  /* Days of record up to ref, capped at the window. Without a known first day, the
     oldest load inside the window stands in for it. */
  const since=first&&first<=ref?Math.round((r-parseD(first))/864e5)+1:inWin;
  const hist=Math.min(28,Math.max(since,inWin));
  return{ac,ch,hist,weeks:Math.min(4,Math.max(1,hist/7))};}
function acwrFrom(loadAt,ref,first){const w=loadWindows(loadAt,ref,first);const c=w.ch/w.weeks;return c===0?0:w.ac/c;}
/* The earliest date key carrying load in a {date: load} map (or a days map, via `val`). */
function firstLoadKey(map,val=v=>Number(v)||0){let m=null;
  Object.keys(map||{}).forEach(k=>{if(val(map[k])>0&&(m==null||k<m))m=k;});return m;}
function calcACWR(days,ref){return acwrFrom(k=>dLoad(days[k]),ref,firstLoadKey(days,dLoad));}

/* ---- Per-athlete inner-load + wellness metrics (from srpeLog / wellness) ---- */
/* Written out per code rather than through posOf, because the legacy five carry a
   label of their own here: a record saved as a PG is read back as the Guard it is. */
const POS_FULL={Guard:'Guard',Forward:'Forward',Center:'Center',
  PG:'Guard',SG:'Guard','SG/SF':'Forward',SF:'Forward','SF/PF':'Forward',PF:'Forward',C:'Center',GK:'Goalkeeper'};
/* Specific Preparation is yellow rather than the palette's amber --yellow: the
   macrocycle sits above the microcycle chart, whose intensity line is orange, and
   amber next to it reads as a second orange instead of its own phase. */
const PHASE_COL={gp:'#3b6ef5',sp:'#facc15',comp:'#f43f5e',trans:'#2dd4a7'};
const PHASE_NAME={gp:'General Preparation',sp:'Specific Preparation',comp:'Competition',trans:'Transition'};
/* Inner load for one day. The sRPE log (Tally / manual entry) is the primary source;
   when an athlete has no log row for a date, their OWN calendar is used instead — the
   AU of the sessions they were assigned to, which the coach rates per session. Without
   this fallback a squad that only logs session RPE on the team plan left ACWR, Zone and
   readiness reading "No data", so every downstream layer (Load Board, risk alerts,
   readiness-based load adjustment) had nothing to work with. Never double-counts: the
   calendar is consulted only for days the log doesn't cover. */
/* A log row that stored only RPE and minutes for a slot (older rows did) still carries
   that slot's load: RPE × minutes, the same product the rest of the app shows for it. */
const _slotLoad=(e,k)=>Number(e[k+'Load'])||((Number(e[k+'RPE'])||0)*(Number(e[k+'Duration'])||0));
function athDayLoad(a,dk){let v=0;(a.srpeLog||[]).forEach(e=>{if(e.date!==dk)return;
  v+=Number(e.totalLoad)||(_slotLoad(e,'tp')+_slotLoad(e,'sc')+_slotLoad(e,'game'));});
  if(v===0){const ss=(((a.days||{})[dk]||{}).sessions)||[];
    ss.forEach(s=>{v+=Number(s.au)||((s.sRPE!==''&&s.sRPE!=null)?Number(s.sRPE)*Number(s.duration||0):0);});}
  return Math.round(v);}
function athLoadSum(a,from,to){let s=0,c=parseD(from);const e=parseD(to);while(c<=e){s+=athDayLoad(a,fmt(c));c=addD(c,1);}return s;}
function athTrend(a,ref,n){const r=parseD(ref),out=[];for(let i=n-1;i>=0;i--)out.push(athDayLoad(a,fmt(addD(r,-i))));return out;}
/* The athlete's first day with load — off the sRPE log or their own calendar, the two
   sources athDayLoad reads — over the whole record. */
function athFirstLoad(a){let m=null;const see=k=>{if(k&&(m==null||k<m))m=k;};
  (a.srpeLog||[]).forEach(e=>{if(e.date&&(Number(e.totalLoad)||(_slotLoad(e,'tp')+_slotLoad(e,'sc')+_slotLoad(e,'game')))>0)see(e.date);});
  Object.entries(a.days||{}).forEach(([k,d])=>{if(((d&&d.sessions)||[]).some(s=>(Number(s.au)||((s.sRPE!==''&&s.sRPE!=null)?Number(s.sRPE)*Number(s.duration||0):0))>0))see(k);});
  return m;}
function athLoadWindows(a,ref){return loadWindows(k=>athDayLoad(a,k),ref,athFirstLoad(a));}
function athACWR(a,ref){return acwrFrom(k=>athDayLoad(a,k),ref,athFirstLoad(a));}
/* The macrocycle window as set up in Season → Macrocycle Timeline: General
   Preparation's start through Transition's end. Follows the coach's custom
   period dates when there are any, otherwise the auto-generated ones. */
function macroWindow(setup){
  const ps=getPeriods(setup||{});
  if(!ps.length)return null;
  const gp=ps.find(p=>p.id==='gp')||ps[0];
  const tr=ps.find(p=>p.id==='trans')||ps[ps.length-1];
  return(gp&&tr&&gp.start&&tr.end)?{from:gp.start,to:tr.end}:null;
}
/* Attendance off the TEAM calendar, counted in TRAINING DAYS rather than sessions:
   every day carrying at least one session is one training day. The athlete
   attended it if they're assigned to any of that day's sessions — otherwise the
   whole day counts as missed, no matter how many sessions it held.
   Only the macrocycle counts: days before General Preparation starts or after
   Transition ends are ignored, as are days that haven't happened yet. */
function athTrainingDays(teamDays,athId,setup){
  const todayKey=fmt(today);const win=macroWindow(setup);
  const from=win?win.from:null;
  const to=(win&&win.to<todayKey)?win.to:todayKey;
  let attended=0,missed=0;
  for(const key of Object.keys(teamDays||{})){
    const sessions=(teamDays[key]||{}).sessions||[];
    if(!sessions.length||key>to||(from&&key<from))continue;
    if(sessions.some(s=>(s.athletes||[]).includes(athId)))attended++;else missed++;
  }
  return{attended,missed,from,to:win?win.to:null};
}
function athLatestDate(a){let m='';(a.srpeLog||[]).forEach(e=>{if(e.date&&e.date>m)m=e.date;});
  (a.wellness||[]).forEach(w=>{if(w.date&&w.date>m)m=w.date;});return m||fmt(today);}
function athWellnessVal(a,field,ref){const ws=(a.wellness||[]).filter(w=>w.date&&w[field]!==''&&w[field]!=null&&(!ref||w.date<=ref))
  .sort((x,y)=>x.date.localeCompare(y.date));return ws.length?Number(ws[ws.length-1][field]):null;}
/* `has` = the athlete has load in the 28-day window. Without it a 0 is read as "no data";
   with it, 0 is a real ACWR — nothing in the last 7 days after a loaded month — and Low. */
function acwrZoneOf(v,has=v!==0){return !has?{t:'No data',c:'var(--dim)',dot:'#5c626c'}
  :v>1.5?{t:'High risk',c:'#f43f5e',dot:'#f43f5e'}
  :(v>=0.8&&v<=1.3)?{t:'Optimal',c:'#2dd4a7',dot:'#2dd4a7'}
  :v<0.8?{t:'Low',c:'#f59e0b',dot:'#f59e0b'}
  :{t:'Caution',c:'#f59e0b',dot:'#f59e0b'};}
function readyColor(v){return v==null?'var(--dim)':v>=4?'#2dd4a7':v>=3?'#f59e0b':'#f43f5e';}
/* Automatic risk alerts — scans a team's athletes at a reference date and returns
   one record per at-risk athlete: {athleteId,name,reason,value,metric,severity}.
   Rules: ACWR>1.5, 7-day monotony>2, readiness<=2. Severity 'high' = ACWR>1.8 or monotony>2.5. */
function getAthleteRisks(team,ref=fmt(today)){
  const out=[];
  (team.athletes||[]).forEach(a=>{
    const acwr=athACWR(a,ref);
    const mono=weekMono(athTrend(a,ref,7).map(v=>({load:v}))).monotony;
    const rd=athWellnessVal(a,'readiness',ref);
    const cand=[];
    if(acwr>1.5)cand.push({reason:'Yüksek ACWR',value:acwr,metric:'acwr',severity:acwr>1.8?'high':'medium'});
    if(mono>2)cand.push({reason:'Yüksek monotoni',value:mono,metric:'mono',severity:mono>2.5?'high':'medium'});
    if(rd!=null&&rd<=2)cand.push({reason:'Düşük readiness',value:rd,metric:'readiness',severity:'medium'});
    if(!cand.length)return;
    cand.sort((x,y)=>(x.severity==='high'?0:1)-(y.severity==='high'?0:1));
    out.push({athleteId:a.id,name:a.name||'—',...cand[0]});
  });
  return out.sort((x,y)=>(x.severity==='high'?0:1)-(y.severity==='high'?0:1));
}
/* Day-level session RPE for an athlete: duration-weighted average across all of that
   day's srpeLog rows and sources (TP / S&C / Game). Falls back to a plain average when
   durations are missing. null = no RPE logged that day. */
/* The three things the post-training check-in asks about, in the athlete's own words:
   ball practice, strength & conditioning, and the match. Split out here because the
   calendar now reports a day per kind — one number for the whole day cannot say which
   session the squad found hard. */
const SRPE_KINDS={tp:['tpRPE','tpDuration'],sc:['scRPE','scDuration'],game:['gameRPE','gameDuration']};
/* One athlete's RPE for a day over the given kinds — duration-weighted when they reported
   minutes, a plain mean of the scores when they did not. `kinds` omitted = the whole day,
   which is what this has always returned. */
function athDayRPEOf(a,dk,kinds){let rw=0,dw=0;const rs=[];
  const ks=(kinds&&kinds.length?kinds:Object.keys(SRPE_KINDS)).map(k=>SRPE_KINDS[k]).filter(Boolean);
  (((a||{}).srpeLog)||[]).forEach(e=>{if(e.date!==dk)return;
    ks.forEach(([rk,du])=>{
      const r=(e[rk]===''||e[rk]==null)?NaN:Number(e[rk]);if(isNaN(r))return;
      const d=Number(e[du])||0;rs.push(r);if(d>0){rw+=r*d;dw+=d;}});});
  if(dw>0)return rw/dw;
  return rs.length?rs.reduce((x,y)=>x+y,0)/rs.length:null;}
function athDayRPE(a,dk){return athDayRPEOf(a,dk,null);}
/* RPE traffic light: 3–4 blue · 5–6 green · 7–8 orange · 9–10 red. Half-points fall into
   the band below the next whole number (4.5 is still blue, 6.9 still green). */
function rpeColor(v){return v==null?null:v<5?'#3b82f6':v<7?'#22c55e':v<9?'#f97316':'#ef4444';}
/* Team averages for a single calendar day.
   RPE     = mean of every athlete's duration-weighted day RPE (athDayRPE).
   Readiness = mean of the wellness check-ins actually dated on that day (not the
   "latest known value", so an empty day stays empty instead of echoing last week). */
function teamDayRPE(athletes,dk,kinds){
  const vs=(athletes||[]).map(a=>athDayRPEOf(a,dk,kinds)).filter(v=>v!=null&&!isNaN(v));
  return vs.length?vs.reduce((x,y)=>x+y,0)/vs.length:null;}
function teamDayReadiness(athletes,dk){
  const vs=[];
  (athletes||[]).forEach(a=>(a.wellness||[]).forEach(w=>{
    if(w.date!==dk||w.readiness===''||w.readiness==null)return;
    const v=Number(w.readiness);if(!isNaN(v))vs.push(v);}));
  return vs.length?vs.reduce((x,y)=>x+y,0)/vs.length:null;}
/* What one athlete's own calendar says they did on a day: the AU on the sessions in their
   profile, added up. A session with no AU box filled falls back to its sRPE × duration,
   the same arithmetic the AU box does for itself. Their srpeLog is not read here — this is
   the load that was PLANNED and written for them, not what a form later reported. */
function athDayCalAU(a,dk){
  return (((((a||{}).days)||{})[dk]||{}).sessions||[]).reduce((t,s)=>{
    const au=Number(s.au);
    if(!isNaN(au)&&au)return t+au;
    const r=Number(s.sRPE),d=Number(s.duration);
    return t+((s.sRPE!==''&&s.sRPE!=null&&!isNaN(r)&&!isNaN(d))?r*d:0);
  },0);
}
/* The squad's average daily load for a date, read off the athletes' own calendars. Only
   athletes who have something on that day count towards it: a rest day for half the squad
   would otherwise halve the number and read like an easy day for everyone. */
function teamDayAvgAU(athletes,dk){
  const vs=[];
  (athletes||[]).forEach(a=>{
    const ss=((((a||{}).days)||{})[dk]||{}).sessions||[];
    if(!ss.length)return;
    vs.push(athDayCalAU(a,dk));
  });
  return vs.length?{avg:vs.reduce((x,y)=>x+y,0)/vs.length,n:vs.length}:null;
}
/* Monotony traffic light (Foster) — used everywhere monotony is shown:
   <1.0 low, loads highly varied · 1.0–1.5 normal · 1.5–2.0 rising, watch it
   · >2.0 high, overload and illness/injury risk climbs. */
function monoZoneOf(v){return!v?{t:'No data',c:'var(--dim)',dot:'#5c626c'}
  :v>2?{t:'High',c:'#f43f5e',dot:'#f43f5e'}
  :v>=1.5?{t:'Watch',c:'#f59e0b',dot:'#f59e0b'}
  :v>=1?{t:'Normal',c:'#2dd4a7',dot:'#2dd4a7'}
  :{t:'Low',c:'#3b82f6',dot:'#3b82f6'};}
/* Mon–Sun RPE strip for a load-board row: one small square per day tinted by that day's
   RPE. Hovering a square shows the session title(s) from the athlete's own calendar for
   that day in a floating box.
   The box is portalled to <body> on purpose: hovering a square also hovers the
   surrounding panel, and `.panel:hover` applies a transform — a transformed ancestor
   becomes the containing block for position:fixed children, so a tooltip rendered in
   place was pushed right by the panel's own offset (the sidebar width, ~275px) and
   landed over the ACWR/Zone columns instead of the square it describes. */
function RpeWeekStrip({athlete,refDate}){
  const[tip,setTip]=useState(null);
  const days7=Array.from({length:7},(_,i)=>fmt(addD(sow(parseD(refDate)),i)));
  const fmtRPE=v=>v==null?'·':(v%1===0?String(v):v.toFixed(1));
  const show=(ev,dk)=>{const r=ev.currentTarget.getBoundingClientRect();
    const names=(((athlete.days||{})[dk]||{}).sessions||[]).map(s=>s.name).filter(Boolean);
    // Keep the box on screen without letting it drift off the square it belongs to.
    const half=134,vw=window.innerWidth||0;
    const cx=Math.min(Math.max(r.left+r.width/2,half),Math.max(half,vw-half));
    setTip({x:cx,y:r.top,dk,names});};
  return(<div className="lb-rpe-row">
    {days7.map(dk=>{const rpe=athDayRPE(athlete,dk);const c=rpeColor(rpe);
      return<span key={dk} className={'lb-rpe-cell'+(rpe==null?' empty':'')}
        /* The day's colour reaches the cell as one variable; 19-profile-tests-load.css draws
           it as the value's colour and a 2px line under the cell, on a plain card. */
        style={c?{'--rc':c}:null}
        onMouseEnter={ev=>show(ev,dk)} onMouseLeave={()=>setTip(null)}>{fmtRPE(rpe)}</span>;})}
    {tip&&ReactDOM.createPortal(
      <div className="lb-rpe-tip" style={{left:tip.x,top:tip.y}}>
        <div className="d">{DN[(parseD(tip.dk).getDay()+6)%7]} · {fd(tip.dk)}</div>
        {tip.names.length?tip.names.map((n,i)=><span key={i} className="s">{n}</span>)
          :<span className="none">{L('Takvimde antrenman yok','No session on the calendar')}</span>}
      </div>, document.body)}
  </div>);
}
/* Semicircular ACWR gauge (0–2 scale) with risk-zone arcs + needle */
function AcwrBar({value}){
  // Horizontal segmented ACWR scale (0–2) with a marker at the value.
  const pos=Math.max(2.5,Math.min(97.5,(value||0)/2*100));
  const z=acwrZoneOf(value);
  const ticks=[[0,'0'],[0.8,'0.8'],[1,'1'],[1.3,'1.3'],[1.5,'1.5'],[2,'2']];
  return(<div className="acwr-bar">
    <div className="ab-track">
      <span className="ab-seg" style={{flexGrow:0.8,background:'#b9842f'}}/>
      <span className="ab-seg" style={{flexGrow:0.5,background:'#2dd4a7'}}/>
      <span className="ab-seg" style={{flexGrow:0.2,background:'#b9842f'}}/>
      <span className="ab-seg" style={{flexGrow:0.5,background:'#cf4338'}}/>
      <span className="ab-marker" style={{left:`${pos}%`,borderColor:z.dot}}/>
    </div>
    <div className="ab-ticks">{ticks.map((t,i)=>{const p=t[0]/2*100;const tx=p<=0?'0':p>=100?'-100%':'-50%';return<span key={i} style={{left:`${p}%`,transform:`translateX(${tx})`}}>{t[1]}</span>;})}</div>
    <div className="ab-zones">
      <span style={{flexGrow:0.8,color:'#e0a23a'}}>{L('DÜŞÜK','LOW')}</span>
      <span style={{flexGrow:0.5,color:'#2dd4a7'}}>{L('İDEAL','OPT')}</span>
      <span style={{flexGrow:0.2,color:'#e0a23a'}}>{L('DİKKAT','CAUT')}</span>
      <span style={{flexGrow:0.5,color:'#f43f5e'}}>{L('YÜKSEK','HIGH')}</span>
    </div>
  </div>);
}

/* Segmented monotony scale (0–3) with a marker at the value — same visual language as
   AcwrBar. Band widths mirror monoZoneOf: <1 low, 1–1.5 normal, 1.5–2 watch, >2 high. */
function MonoBar({value}){
  const pos=Math.max(2.5,Math.min(97.5,(value||0)/3*100));
  const z=monoZoneOf(value);
  const ticks=[[0,'0'],[1,'1'],[1.5,'1.5'],[2,'2'],[2.5,'2.5'],[3,'3']];
  return(<div className="acwr-bar">
    <div className="ab-track">
      <span className="ab-seg" style={{flexGrow:1,background:'#2f5fbe'}}/>
      <span className="ab-seg" style={{flexGrow:0.5,background:'#2dd4a7'}}/>
      <span className="ab-seg" style={{flexGrow:0.5,background:'#b9842f'}}/>
      <span className="ab-seg" style={{flexGrow:1,background:'#cf4338'}}/>
      <span className="ab-marker" style={{left:`${pos}%`,borderColor:z.dot}}/>
    </div>
    <div className="ab-ticks">{ticks.map((t,i)=>{const p=t[0]/3*100;const tx=p<=0?'0':p>=100?'-100%':'-50%';return<span key={i} style={{left:`${p}%`,transform:`translateX(${tx})`}}>{t[1]}</span>;})}</div>
    <div className="ab-zones">
      <span style={{flexGrow:1,color:'#5b8cff'}}>{L('DÜŞÜK','LOW')}</span>
      <span style={{flexGrow:0.5,color:'#2dd4a7'}}>{L('NORMAL','NORM')}</span>
      <span style={{flexGrow:0.5,color:'#e0a23a'}}>{L('İZLE','WATCH')}</span>
      <span style={{flexGrow:1,color:'#f43f5e'}}>{L('YÜKSEK','HIGH')}</span>
    </div>
  </div>);
}

/* Athlete Load Board — per-athlete 7-day load, Mon–Sun RPE strip, zone, readiness & ACWR.
   The ACWR is athACWR at the board's reference day — the same number the zone, the risk
   alerts and the individualization snapshot read — shown to two decimals, "—" with no
   load in the 28-day window. */
function AthleteLoadBoard({athletes,refDate}){
  const[lbSort,setLbSort]=useState('load');
  const ref=refDate||fmt(today);
  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const rows=(athletes||[]).map(a=>{
    const l7=athLoadSum(a,fmt(addD(parseD(ref),-6)),ref);
    const w=athLoadWindows(a,ref);
    return{a,name:a.name||'—',pos:posOf(a.position),l7,acwr:athACWR(a,ref),has:w.ch>0,
      rd:athWellnessVal(a,'readiness',ref)};
  });
  const maxL7=Math.max(1,...rows.map(r=>r.l7));
  const sorted=[...rows].sort((x,y)=>lbSort==='az'?x.name.localeCompare(y.name):y.l7-x.l7);
  return(<div className="panel lb-wrap">
    <div className="lb-head">
      <div className="lb-title">{L('Sporcu Yük Panosu','Athlete Load Board')}<span className="lb-sub">{L('7 günlük yük · haftalık RPE','7-day load · weekly RPE')}</span></div>
      <div className="lb-seg">
        <button className={lbSort==='load'?'on':''} onClick={()=>setLbSort('load')}>{L('Yüke göre','By load')}</button>
        <button className={lbSort==='az'?'on':''} onClick={()=>setLbSort('az')}>A–Z</button>
      </div>
    </div>
    {sorted.length===0&&<div className="empty-st">{L('Kadroda sporcu yok','No athletes on the roster')}</div>}
    {sorted.length>0&&<div style={{overflowX:'auto'}}>
      <table className="lb-tbl">
        <thead><tr>
          <th>{L('Sporcu','Athlete')}</th><th>{L('Mevki','Pos')}</th><th>{L('7 günlük yük','7-day load')}</th>
          {/* Day initials sit under the column label, on the same 27px grid as the
              squares below, so a coach can read which weekday a value belongs to. */}
          <th><div className="lb-rpe-hd">{L('7 günlük RPE','7-day RPE')}
            <div className="lb-rpe-days">{DN.map((d,i)=><span key={i}>{d[0]}</span>)}</div>
          </div></th>
          <th>{L('Bölge','Zone')}</th><th className="r">{L('Hazır Oluş','Readiness')}</th><th className="r" title={L('Akut:kronik iş yükü oranı — son 7 gün / 28 günün haftalık ortalaması','Acute:chronic workload ratio — last 7 days / 28-day weekly mean')}>ACWR</th>
        </tr></thead>
        <tbody>{sorted.map((r,ri)=>{const z=acwrZoneOf(r.acwr,r.has);return(<tr key={ri}>
          <td><div className="lb-ath"><div className="lb-av">{r.a.photo?<img src={mediaSrc(r.a.photo)} alt=""/>:initials(r.name)}</div><span className="lb-name">{r.name}</span></div></td>
          <td>{r.pos?<span className="lb-pos">{r.pos}</span>:'—'}</td>
          <td><div className="lb-load"><span className="v">{r.l7?r.l7.toLocaleString('en-US').replace(/,/g,'.'):'·'}</span><span className="lb-bar"><i style={{width:`${Math.min(100,r.l7/maxL7*100)}%`}}/></span></div></td>
          <td><RpeWeekStrip athlete={r.a} refDate={ref}/></td>
          <td><span className="lb-zone"><span className="lb-zdot" style={{background:z.dot}}/>{exLabel(z.t)}</span></td>
          <td className="r"><span className="lb-rd" style={{color:readyColor(r.rd)}}>{r.rd!=null?r.rd.toFixed(1)+'/5':'—'}</span></td>
          <td className="r"><span className="lb-acwr" style={{color:r.has?z.c:undefined}}>{r.has?r.acwr.toFixed(2):'—'}</span></td>
        </tr>);})}</tbody>
      </table>
    </div>}
  </div>);
}

/* ---- The check-in's pain grid --------------------------------------------
   The wellness form asks "Ağrın hangi bölgede ve şiddette?" as a matrix: one row
   per body region, one column per severity. It arrives as "Boyun: Orta, Bel: Fazla"
   and is stored on the check-in as `painMap` — {region: 1|2|3}, the region label
   kept exactly as the athlete's form words it so a region the app has no tag for
   (Boyun, Göğüs, Karın…) is still reported rather than silently dropped. */
/* Severity 0 = the athlete named the region but was never asked how bad it is — a
   multi-select "Ağrın hangi bölgede?" has no severity axis. It is a real report, so it is
   drawn like one; it just carries no word, and the day's own pain score fills it in where
   the check-in has one. */
/* The check-in is filled in Turkish, so the stored severity is a number and the word
   is put back at render time in whichever language the app is in. */
const PAIN_SEV_LABEL=()=>({0:'',1:L('Hafif','Mild'),2:L('Orta','Moderate'),3:L('Fazla','Severe')});
const PAIN_SEV_COL={0:'#f43f5e',1:'#eab308',2:'#f97316',3:'#ef4444'};
const painSevKey=v=>Math.max(0,Math.min(3,Math.round(Number(v)||0)));
const painSevWord=v=>PAIN_SEV_LABEL()[painSevKey(v)]||'';
/* A pain chip says WHICH region hurts; how badly is the colour it says it in. Spelling
   the grading out beside the region as well ("Diz · Orta") doubled the length of every
   chip and buried the region among words that repeat on every other chip — so the word
   moves to the chip's tooltip and the colour carries it on screen. The eight-digit hex
   is the same colour at fill and border opacity, which keeps a chip legible on the dark
   card without a second palette to maintain. */
const painChipStyle=v=>{const c=PAIN_SEV_COL[painSevKey(v)];
  return{color:c,background:c+'26',borderColor:c+'80'};};
/* Is this constraint tag already on screen as one of the grid's own regions? The tag list
   and the check-in's grid name the same body in two vocabularies ("Ayak bileği" / "Ankle"),
   and a card that drew both put every region up twice, side by side. The grid's own words
   win: they are what the athlete actually ticked. */
const painNoteCovers=(note,tag)=>!!(note&&(note.covered||[]).indexOf(tag)>=0);
/* The check-in's own "Ağrı düzeyin nedir?" (1 çok fazla … 5 çok az) as a 1-3 severity.
   Same athlete, same day, same question about pain — so a region ticked without a
   severity is shown at the level they reported for the day rather than colourless. */
function sevFromSoreness(v){
  const n=Number(v);
  if(isNaN(n)||n<=0)return 0;
  return n<=2?3:(n<=3.5?2:1);
}
/* Severity is matched worst-first: a column written "Çok Fazla" must not be read as
   the "az" inside it. Numbers pass straight through, so a form that sends 1/2/3
   works without any wording at all. */
const PAIN_SEV_WORDS=[
  {n:3,kw:['fazla','şiddet','siddet','severe','high']},
  {n:2,kw:['orta','moderate','medium']},
  {n:1,kw:['hafif','mild','light','low']},
];
function painSevN(v){
  if(v==null)return 0;
  // A grid cell can arrive as the list of columns ticked on that row (["Hafif"]) or as
  // the column object itself — the worst of them is the severity for that region.
  if(Array.isArray(v))return v.reduce((m,x)=>Math.max(m,painSevN(x)),0);
  if(typeof v==='object')return painSevN(v.text??v.label??v.value??v.title);
  const n=Number(v);
  if(!isNaN(n)&&n>=1&&n<=3)return Math.round(n);
  const t=String(v).toLowerCase();
  for(const s of PAIN_SEV_WORDS)if(s.kw.some(k=>t.includes(k)))return s.n;
  return 0;
}
/* Tally keys the grid by its own row ids, so a check-in that reached the app before the
   Worker could resolve them carries ids where the body region should be — either as an
   object or, when the whole answer fell through as text, as raw JSON:
   {"eeb7ce0e-f7f4-4254-8722-fb402c45e8c7":["Hafif"]}. A coach cannot read an id, so
   every region that is one is reported under a single unnamed region instead of being
   printed verbatim. Old check-ins already stored that way are normalised on read, so
   nothing has to be re-synced for the grid to make sense. */
const PAIN_ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* The athlete DID tick a region — it is the sync that could not put a name to it, so the
   label says that rather than blaming the check-in for being incomplete. When every
   check-in shows this, the Worker on Cloudflare is the one to fix; the Tally Sync screen
   says so after a sync. */
const PAIN_REGION_UNKNOWN='Bölge adı gelmedi';
/* What that bucket used to be called. Check-ins already stored under the old wording read
   as the new one without waiting for a re-sync. */
const PAIN_REGION_LEGACY='Bölge belirtilmemiş';
/* JSON text is a grid the app must decode, never a sentence the athlete wrote. */
const looksLikeJSON=v=>/^\s*[{[]/.test(String(v==null?'':v));

/* ---- "Bel, Diz" — the multi-select form of the pain question -----------------
   The region question can be asked as a matrix (region × severity) or as a multi-select
   that lists the regions and leaves the severity to the separate "Ağrı düzeyin nedir?"
   score. The second shape arrives as a plain comma list, which reads exactly like a
   sentence the athlete typed — and the two must not be confused: a list is drawn on the
   heatmap as regions, a sentence is shown as their own words.
   The test is vocabulary, not punctuation. Every part has to be made of body-region words
   (plus side words like "sağ"), so "Bel, Diz" is a list while "belim tutuldu" and
   "sol diz ağrıyor" stay notes. */
const PAIN_REGION_WORDS=new Set([
  // Tally's own option list, then the words a coach is likely to add to it
  'boyun','omuz','sirt','gogus','karin','dirsek','bilek','bilegi','el','bel','kalca','kasik',
  'hamstring','hamstrings','quadriceps','kuadriseps','quad','quads','diz','kalf','baldir',
  'asil','ayak','topuk','uyluk','kaburga','trapez','omurga','adduktor','aduktor','abduktor',
  'incik','tibia','parmak','kol','bacak','pazi','kalcalar','basparmak',
  'ayak bilegi','bilek el','asil tendonu','alt sirt','ust sirt','el bilegi','ayak parmagi',
  // English, for a form written in either language
  'neck','shoulder','back','chest','abdomen','core','elbow','wrist','hand','hip','groin',
  'knee','calf','ankle','foot','achilles','thigh','shin','rib','spine','lower back','upper back',
]);
/* Words that qualify a region without being one. They may appear beside a region word,
   never alone. */
const PAIN_SIDE_WORDS=new Set(['sag','sol','her','iki','ikisi','ve','ust','alt','on','arka',
  'bolgesi','bolge','tarafi','taraf','kismi','right','left','both','and','upper','lower','low','mid','area']);
/* ---- "…şiddette? (opsiyonel) [Sırt]" → "Sırt" -------------------------------
   Tally can send the pain matrix as one question PER ROW, and it titles each of those
   questions "<the whole question> [<the row>]". The row id then resolves to that title,
   so the heatmap bubble read the question back at the coach — four rows, four copies of
   "💥 Ağrın hangi bölgede ve şiddette? (opsiyonel)" — with the body part buried at the
   end of each. The region is the part in brackets; everything before it is the question
   every row repeats. The leading emoji goes too, so "💥 Sırt" reads as "Sırt".
   Applied wherever a region name is read rather than at sync time only, so check-ins
   already stored under the long name come out right without re-syncing anything. */
const REGION_ROW_RE=/\[([^\][]{1,40})\]\s*$/;
function cleanRegionLabel(raw){
  const s0=String(raw==null?'':raw).trim();
  let s=s0;
  const m=REGION_ROW_RE.exec(s);
  if(m&&m[1].trim())s=m[1].trim();
  s=s.replace(/^[^\p{L}\p{N}]+/u,'').replace(/[\s:;,.\-–—]+$/,'').trim();
  // Never turn a name into nothing: a label made entirely of punctuation keeps whatever
  // it had, so an odd form loses tidiness rather than the region.
  return s||s0;
}
const normPainWord=s=>String(s==null?'':s).toLowerCase()
  .replace(/i̇/g,'i').replace(/ı/g,'i').replace(/İ/g,'i')
  .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')
  .replace(/[^a-z0-9]+/g,' ').trim();
function isPainRegionName(part){
  const s=String(part==null?'':part).trim();
  if(!s||s.length>28)return false;
  const n=normPainWord(s);
  if(!n)return false;
  if(PAIN_REGION_WORDS.has(n))return true;
  const words=n.split(' ');
  if(words.length>4)return false;
  let hit=false;
  for(const w of words){
    if(PAIN_REGION_WORDS.has(w)){hit=true;continue;}
    if(PAIN_SIDE_WORDS.has(w))continue;
    return false;   // a word that is not a region and not a qualifier ⇒ this is prose
  }
  return hit;
}
/* "Bel, Diz" → {Bel:0, Diz:0}. Severity 0 because the question did not ask. Returns null
   the moment a part is not a region, so free text is left to `areaOfPain`. */
function parsePainRegionList(raw,dict,seen){
  const parts=String(raw==null?'':raw).split(/\s*[,;|\n•]+\s*/).map(s=>s.trim()).filter(Boolean);
  if(!parts.length)return null;
  const out={};
  for(const part of parts){
    let p=part.replace(/^[\s{"']+/,'').replace(/[\s{}"',]+$/,'').trim();
    p=cleanRegionLabel(p).replace(/^[\s[\]]+/,'').replace(/[\s[\]]+$/,'').trim();
    if(!p)continue;
    if(PAIN_ID_RE.test(p)){
      // An option id the sync could not name — same escape hatch the grid has.
      const named=dict&&String(dict[p]||'').trim();
      if(named){const nc=cleanRegionLabel(named);out[nc]=out[nc]||0;continue;}
      if(seen&&seen.indexOf(p)<0)seen.push(p);
      out[PAIN_REGION_UNKNOWN]=out[PAIN_REGION_UNKNOWN]||0;
      continue;
    }
    if(!isPainRegionName(p))return null;
    out[p]=out[p]||0;
  }
  return Object.keys(out).length?out:null;
}
/* "Boyun: Orta, Bel: Fazla" → {Boyun:2, Bel:3}. An object — or the JSON of one — is
   decoded too, so a worker that has not resolved the grid's ids is still readable.
   Anything that yields no region/severity pair at all returns null: free text the
   athlete typed ("belim tutuldu") is not a grid and stays in `areaOfPain`. */
/* `opts.map` is the coach's own id → region dictionary (Tally Sync screen). Tally keys
   the grid by row ids and only its form definition names them; when neither the Worker
   nor the API can produce that definition, the ids are all anyone has, and a coach who
   names one once should not have to name it again. `opts.seen` collects the ids that
   stayed unnamed, so the sync can offer exactly those to be named. */
function parsePainMap(raw,opts){
  const dict=(opts&&opts.map)||null;
  const seen=(opts&&opts.seen)||null;
  const out={};
  const put=(region,sev)=>{
    const n=painSevN(sev);
    if(!n)return;
    // Braces and quotes survive on the keys when a JSON payload had to be split by hand.
    let r=String(region==null?'':region).replace(/^[\s{"']+/,'').replace(/[\s{}"',]+$/,'').trim();
    // A per-row question title carries the row in brackets, so the brackets are read
    // before they are stripped — trimming them first would have thrown the region away
    // and left the question behind.
    r=cleanRegionLabel(r).replace(/^[\s[\]]+/,'').replace(/[\s[\]]+$/,'').trim();
    if(PAIN_ID_RE.test(r)){
      const named=dict&&String(dict[r]||'').trim();
      if(named)r=cleanRegionLabel(named);
      else{if(seen&&seen.indexOf(r)<0)seen.push(r);r=PAIN_REGION_UNKNOWN;}
    }
    if(!r||r===PAIN_REGION_LEGACY)r=PAIN_REGION_UNKNOWN;
    out[r]=Math.max(out[r]||0,n);
  };
  let src=raw;
  if(typeof src==='string'&&looksLikeJSON(src)){try{src=JSON.parse(src);}catch(e){}}
  if(Array.isArray(src))src=src.join(', ');
  if(src&&typeof src==='object')Object.entries(src).forEach(([k,v])=>put(k,v));
  else String(src==null?'':src).split(/\s*,\s*/).forEach(part=>{
    const i=part.indexOf(':');
    if(i>0)put(part.slice(0,i),part.slice(i+1));
  });
  if(Object.keys(out).length)return out;
  // No region/severity pair anywhere. The multi-select form of the question answers with
  // the regions alone, so that is tried before giving up and calling it free text.
  return parsePainRegionList(typeof src==='object'?'':src,dict,seen);
}
/* The check-in's pain box in the athlete's own words. A value that is really the grid —
   JSON the Worker could not resolve, or "Bel: Fazla" pairs — is already drawn region by
   region, so it is not repeated as a hand-written note. */
function painFreeText(raw){
  const t=String(raw==null?'':raw).trim();
  if(!t||looksLikeJSON(t))return'';
  return parsePainMap(t)?'':t;
}
/* A grid whose rows arrived as ids collapses into one nameless bucket. When the same
   check-in also answered the free-text "Ağrın hangi bölgede?" question, that answer IS
   the region the athlete meant, so it names the bucket instead of the placeholder — the
   coach reads "bel: Orta" instead of nothing. Long answers are left alone: a sentence is
   a note, not a region name, and it is already shown as one. */
const PAIN_NOTE_AS_REGION_MAX=40;
function namePainRegions(map,note){
  const n=String(note==null?'':note).trim();
  if(!map||!map[PAIN_REGION_UNKNOWN]||!n||n.length>PAIN_NOTE_AS_REGION_MAX)return map;
  const out={};
  Object.entries(map).forEach(([r,sev])=>{
    const k=r===PAIN_REGION_UNKNOWN?n:r;
    out[k]=Math.max(out[k]||0,sev);
  });
  return out;
}
/* The body map's regions in English. The check-in stores the Turkish name as the key
   (pain-body.js's catalog, where each region carries its English name too); this is
   that catalog's name list, for the places that must be English — validator-test.js
   checks every catalog region against it so the two cannot drift apart. */
/* 'Göğüs' and 'Üst sırt' are no longer in the catalog (both are split into Sağ / Sol now) but
   stay here: older check-ins still carry them. */
const PAIN_REGION_EN_ONE={'Baş':'Head','Çene':'Jaw','Boyun':'Neck','Ense':'Back of neck','Göğüs':'Chest','Üst sırt':'Upper back',
  'Orta sırt':'Mid back','Alt sırt / bel':'Lower back','Karın':'Abdomen','Sakrum / kuyruk sokumu':'Sacrum / tailbone'};
const PAIN_REGION_EN_SIDE={'omuz':'shoulder','üst kol':'upper arm','dirsek':'elbow','ön kol':'forearm','el bileği':'wrist','el':'hand',
  'parmaklar':'fingers','göğüs':'chest','üst sırt':'upper back','kaburga':'ribs','yan gövde':'flank','kalça':'hip','kasık':'groin','ön uyluk (Quadriceps)':'front thigh (Quadriceps)',
  'arka uyluk (Hamstring)':'back thigh (Hamstring)','iç uyluk (Adductor)':'inner thigh (Adductor)','dış uyluk':'outer thigh',
  'diz önü':'front of knee','diz arkası':'back of knee','diz içi':'inner knee','diz dışı':'outer knee',
  'ön bacak (Tibialis anterior)':'shin (Tibialis anterior)','baldır':'calf','baldır içi':'inner calf','baldır dışı':'outer calf',
  'ayak bileği önü':'front of ankle','ayak bileği içi':'inner ankle','ayak bileği dışı':'outer ankle','Aşil':'Achilles','topuk':'heel',
  'ayak tabanı':'sole','ayak üstü':'top of foot','ayak parmakları':'toes'};
function painRegionEn(k){
  const r=String(k||'');
  if(PAIN_REGION_EN_ONE[r])return PAIN_REGION_EN_ONE[r];
  const m=r.match(/^(Sağ|Sol) (.+)$/);
  if(m&&PAIN_REGION_EN_SIDE[m[2]])return`${m[1]==='Sağ'?'Right':'Left'} ${PAIN_REGION_EN_SIDE[m[2]]}`;
  if(r===PAIN_REGION_UNKNOWN)return'Region not given';
  return r;   // a name outside the catalog is passed through as the athlete sent it
}
/* The grid as a list to show — worst first, then alphabetical so equal severities
   keep a stable order instead of following object insertion. */
function painEntries(map){
  return Object.entries(map||{}).map(([region,sev])=>({region,sev:Number(sev)||0}))
    // Severity 0 stays: the region was reported, only its grading was never asked. It
    // sorts last, after everything that carries one.
    .sort((a,b)=>b.sev-a.sev||a.region.localeCompare(b.region));
}
/* The check-in's pain as one line: every region of the grid with its severity, then
   whatever the athlete typed on top of it. For the places pain has to be written into
   prose — the AI briefings, the Individualization note — rather than drawn. */
function painSummary(w){
  const map=parsePainMap(w&&w.painMap&&typeof w.painMap==='object'?w.painMap:(w&&w.areaOfPain));
  const SEV=PAIN_SEV_LABEL();
  const parts=painEntries(map).map(p=>p.sev?`${p.region}: ${SEV[p.sev]}`:p.region);
  const note=painFreeText(w&&w.areaOfPain);
  if(note)parts.push(note);
  return parts.join(', ');
}
/* Best-effort bridge to the constraint tags the Individualization card reads: a
   region is matched by the same keywords the free-text box is matched by, keeping
   the worst severity reported for it. Regions the tag list has no entry for simply
   produce no tag — they are still in `painMap`, which is what the heatmap draws. */
function painTagsFromMap(map){
  const out={};
  painEntries(map).forEach(({region,sev})=>{
    const t=(region+' ').toLowerCase();
    CONSTRAINT_TAGS.forEach(tag=>{
      if(tag.kw.some(k=>t.includes(k)))out[tag.id]=Math.max(out[tag.id]||0,sev);
    });
  });
  return Object.keys(out).length?out:null;
}

