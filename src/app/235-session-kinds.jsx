/* =========================================================
   TRAINING BLOCK BAR · TEAM PRACTICE / MATCH / TEST WINDOWS
   ========================================================= */
/* The row of buttons a day is planned from. Each button adds one training block, and
   hovering it (or tabbing onto it) opens a small card saying what that block covers, in
   the language the app is showing. The card is portalled to <body> with fixed
   coordinates, so the scrolling drawer it sits in can never clip it. */
function BlockAddBar({onAdd,onPaste,athId,variant}){
  const[tip,setTip]=useState(null);
  const show=(p,e)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const below=r.bottom+130<window.innerHeight;
    setTip({p,x:Math.max(8,Math.min(r.left,window.innerWidth-300)),y:below?r.bottom+8:r.top-8,below});
  };
  const hide=()=>setTip(null);
  const lbl=L('Antrenman bloğu ekle','Add training block');
  const btns=SPRESETS.map(p=><button key={p.name} type="button"
    onClick={()=>{hide();onAdd(spData(p));}}
    onMouseEnter={e=>show(p,e)} onMouseLeave={hide} onFocus={e=>show(p,e)} onBlur={hide}
    aria-label={`${spLabel(p)} — ${spDesc(p)}`}>+ {spLabel(p)}</button>);
  /* A programme written before, pasted as a new session — from any athlete's profile or calendar. */
  const paste=onPaste&&<ProgramPickBtn athId={athId} cls="copy" label={L('Kayıtlı program','Saved programme')}
    title={L('Önceden yazılmış bir programı bul ve yeni seans olarak yapıştır','Find a programme written before and paste it as a new session')} onPick={onPaste}/>;
  const card=tip&&ReactDOM.createPortal(<div className={'qa-tip'+(tip.below?'':' up')} role="tooltip"
    style={{left:tip.x,top:tip.y}}>
    <b>{spLabel(tip.p)}</b>
    <p>{spDesc(tip.p)}</p>
  </div>,document.body);
  if(variant==='planner')return(<div className="pbar">
    <strong style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>{lbl}</strong>
    {btns}{paste}{card}
  </div>);
  return(<div className="dw-quickadd"><span className="qa-lbl">{lbl}</span>{btns}{paste}{card}</div>);
}

/* The kind's name, and the short line a week card shows for it in place of the goals —
   who the match is against and how it ended, how many tests the day held. */
const sesKindName=k=>k==='tp'?L('Takım Antrenmanı','Team Practice'):k==='match'?L('Müsabaka','Competition'):k==='test'?L('Test','Test'):'';
const sesKindLine=s=>{
  const k=sesKind(s);
  if(k==='match'){
    const m=(s&&s.match)||{};const opp=String(m.opponent||'').trim();
    const has=v=>v!==''&&v!=null;
    const sc=has(m.scoreFor)&&has(m.scoreAgainst)?` · ${m.scoreFor}–${m.scoreAgainst}`:'';
    return opp?`${m.venue==='away'?'@':'vs'} ${opp}${sc}`:'';
  }
  if(k==='test'){const n=((s&&s.tests)||[]).length+(String((s&&s.testsOther)||'').trim()?1:0);return n?L(`${n} test`,`${n} tests`):'';}
  return'';
};
/* Average heart-rate zone of a team practice, on the five-zone scale (% of HRmax) every
   HR monitor reports in. The colours are Polar Flow's zone colours (PW_ZONE_COL, 429) so
   the practice's zone reads the same here as on the Wellness and load screens. */
const HR_ZONES=[
  {v:'1',c:'#9ca3af',pct:'50–60',tr:'Çok hafif',en:'Very light'},
  {v:'2',c:'#3b82f6',pct:'60–70',tr:'Hafif',en:'Light'},
  {v:'3',c:'#22c55e',pct:'70–80',tr:'Orta',en:'Moderate'},
  {v:'4',c:'#eab308',pct:'80–90',tr:'Zor',en:'Hard'},
  {v:'5',c:'#ef4444',pct:'90–100',tr:'Maksimal',en:'Maximal'},
];
const hrZoneLbl=h=>L(`Z${h.v} · %${h.pct} · ${h.tr}`,`Z${h.v} · ${h.pct}% · ${h.en}`);
/* The practice's average HR zone, worked out from the participants' own Polar sessions.
   For each player taking part, the Polar sessions recorded on the practice's day that
   overlap its time window (start → start + duration, 30 minutes' slack either side, so a
   watch started early or stopped late still counts; a morning S&C session on the same day
   does not) — or, with no time set, every session that day. A player's zone seconds are
   summed over those sessions, the team figure is the mean of the players who have data
   (a player with no watch does not drag it to zero), and the zone is the minute-weighted
   average of that mean, rounded to 1…5. Returns null when nobody has zone data. */
const skHm=t=>{const m=/(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;};
function skPolarHr(session,dateKey,ids,polar){
  const s=session||{};
  const t0=skHm(s.time),dur=Number(s.duration)||90;
  const byId=new Map((polar||[]).map(p=>[String(p.athleteId),p]));
  const per=[],hrs=[];
  ids.forEach(id=>{
    const p=byId.get(String(id));if(!p)return;
    const ex=(p.exercises||[]).filter(e=>{
      if(!e||e.date!==dateKey)return false;
      if(t0==null)return true;
      const es=skHm(String(e.startTime||'').split('T')[1]);if(es==null)return true;
      const ee=es+(Number(e.durationSec)||0)/60;
      return es<t0+dur+30&&ee>t0-30;
    }).map(e=>({e,z:pwZoneSec(e)})).filter(x=>x.z);
    if(!ex.length)return;
    per.push([0,1,2,3,4].map(i=>ex.reduce((a,x)=>a+x.z[i],0)));
    const w=ex.filter(x=>pwNum(x.e.hrAvg));
    const wt=w.reduce((a,x)=>a+(Number(x.e.durationSec)||1),0);
    if(wt)hrs.push(w.reduce((a,x)=>a+x.e.hrAvg*(Number(x.e.durationSec)||1),0)/wt);
  });
  if(!per.length)return null;
  const z=pwZoneMean(per);const avg=pwZAvg(z);if(!avg)return null;
  return{z,avg,zone:String(Math.max(1,Math.min(5,Math.round(avg)))),n:per.length,of:ids.length,
    hr:hrs.length?Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length):null,
    min:Math.round(pwZTot(z)/60)};
}
/* The HR zone box of a team practice. With Polar data for the day it fills itself — the
   zone, a Z1→Z5 strip of where the minutes went, the average heart rate and how many of
   the players it comes from — and stays in step with the watches: a later sync changes it.
   It is worked out each time it is shown, never stored, so two devices cannot argue over
   it. Before the practice it says it will fill in; with no Polar (signed out, nobody
   linked, nothing recorded) it falls back to the hand-picked zone it always had. */
function SkHrZone({session,dateKey,ids,teamOk,readOnly,onPatch}){
  const s=session||{};
  const todayK=fmt(new Date());
  const future=!dateKey||dateKey>todayK;
  const teamId=teamOk&&typeof liveTeam==='string'?liveTeam:'';
  const R=usePolarTeamRange(teamId,dateKey,dateKey,['exercises']);
  /* Polar can answer at all: a team, a signed-in coach. (`R.off` is also true for a date
     still to come, which is not the same as having no Polar.) */
  const fb=FB();const usr=fb&&fb.auth&&fb.auth().currentUser;
  const polar=!!teamId&&!!usr&&!usr.isAnonymous;
  const res=polar&&!future?skPolarHr(s,dateKey,ids,R.athletes):null;
  const manual=HR_ZONES.find(h=>h.v===String(s.hrZone||''));
  const hz=res?HR_ZONES[+res.zone-1]:manual;
  const ac=hz?hz.c:'#ef4444';
  let body,sub;
  if(res){
    body=<div className="sk-st-v sk-hz-v"><b style={{color:ac}}>Z{res.zone}</b><span>{L(hz.tr,hz.en)}</span></div>;
    sub=<>
      <span className="sk-hz-bar" role="img" aria-label={res.z.map((v,i)=>`Z${i+1} ${Math.round(v/60)} ${L('dk','min')}`).join(', ')}>
        {res.z.map((v,i)=>v>0?<i key={i} style={{flexGrow:v,background:HR_ZONES[i].c}} title={`Z${i+1} · ${Math.round(v/60)} ${L('dk','min')} · %${Math.round(v/(res.min*60||1)*100)}`}/>:null)}</span>
      <span className="sk-st-sub" title={L('Katılan oyuncuların Polar antrenmanlarından, antrenman saatiyle örtüşen kayıtlar','From the participants\' Polar sessions that overlap the practice time')}>
        {L(`ort. ${res.avg.toFixed(1)}`,`avg ${res.avg.toFixed(1)}`)}{res.hr?` · ${res.hr} bpm`:''} · {L(`${res.n}/${res.of} oyuncu`,`${res.n}/${res.of} players`)}<em className="sk-auto">Polar</em></span>
    </>;
  }else{
    const loading=polar&&!future&&!R.loaded;
    body=readOnly||(polar&&future)||loading
      ?<div className="sk-st-v sk-hz-v">{hz?<><b style={{color:ac}}>Z{hz.v}</b><span>{L(hz.tr,hz.en)}</span></>:<b className="dim">—</b>}</div>
      :<select className="dw-inp dw-sel sk-hz-sel" value={String(s.hrZone||'')} onChange={e=>onPatch({hrZone:e.target.value})}
          title={L('Polar verisi yokken elle seçilir','Picked by hand while there is no Polar data')}>
          <option value="">—</option>
          {HR_ZONES.map(h=><option key={h.v} value={h.v}>{hrZoneLbl(h)}</option>)}
        </select>;
    sub=<span className="sk-st-sub">{!polar?L('elle seçilir','picked by hand')
      :future?<>{L('antrenmandan sonra dolar','fills in after the practice')}<em className="sk-auto">Polar</em></>
      :loading?L('Polar okunuyor…','reading Polar…')
      :R.err?L('Polar okunamadı · elle seç','Polar unavailable · pick by hand')
      :L('Polar kaydı yok · elle seç','no Polar data · pick by hand')}</span>;
  }
  return<SkStat k={L('Ort. HR Zone','Avg HR Zone')} ac={ac} ic={<SkIcHeart/>} sub={sub}>{body}</SkStat>;
}
/* One cell of the session's stat strip: label and icon on top, the value, and a line under
   it (a hint, a scale, a split). `ac` colours the cell's top edge and its icon. */
function SkStat({k,ac,ic,sub,children}){
  return(<div className="sk-st" style={{'--dm-ac':ac}}>
    <div className="sk-st-k"><span className="sk-st-ic">{ic}</span>{k}</div>
    {children}
    {sub!=null&&<div className="sk-st-ft">{sub}</div>}
  </div>);
}
/* Target intensity as a ten-step scale: the steps up to the target are lit in its band's
   colour, and a click on a step sets it. */
function SkRpeScale({value,onPick,readOnly}){
  const v=Number(value)||0;
  return(<span className="sk-scale" role={readOnly?'img':'group'} aria-label={L(`Hedef RPE ${v}/10`,`Target RPE ${v}/10`)}>
    {[1,2,3,4,5,6,7,8,9,10].map(n=>{const on=n<=v;const c=rpeZone(n).c;
      return readOnly?<i key={n} className={on?'on':''} style={on?{background:c}:null}/>
        :<button key={n} type="button" className={on?'on':''} style={on?{background:c}:null}
          title={`${n}/10 · ${L(rpeZone(n).tr,rpeZone(n).en)}`} aria-pressed={n===v} onClick={()=>onPick(n)}/>;})}
  </span>);
}
const skInit=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
const SkIcClock=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/></svg>;
const SkIcTimer=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5h4"/><path d="M12 13l2.6-2.6"/><circle cx="12" cy="14" r="7.5"/></svg>;
const SkIcGauge=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3.5 18a9 9 0 1 1 17 0"/><path d="M12 14.5 16 9.5"/></svg>;
const SkIcHeart=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>;
const SkIcPin=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>;
const SkIcCal=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;

/* Players as a grid of chips — who took part in a practice, who made the match squad —
   each with the player's photo (or initials), name and number. With `max` (the match's
   twelve) a bar under the count fills as the squad does. */
function SkPlayerPick({athletes,selected,onChange,max,readOnly}){
  const sel=new Set(selected||[]);
  const n=(selected||[]).length;
  const toggle=id=>{
    if(readOnly)return;
    if(sel.has(id))onChange((selected||[]).filter(x=>x!==id));
    else{if(max&&n>=max)return;onChange([...(selected||[]),id]);}
  };
  if(!athletes||!athletes.length)return<div className="dw-empty">{L('Kadroda sporcu yok — Sporcular sekmesinden ekle.','No athletes on the roster — add them in the Athletes tab.')}</div>;
  return(<div className="sk-pick">
    <div className="sk-pick-h">
      <span className={'sk-pick-n'+(max&&n>=max?' full':'')}>{n}{max?` / ${max}`:` / ${athletes.length}`}
        <span className="sk-pick-bar" aria-hidden="true"><i style={{width:`${Math.min(100,n/(max||athletes.length||1)*100)}%`}}/></span></span>
      {!readOnly&&<>
        {!max&&<button type="button" className="btn xs sec" onClick={()=>onChange(athletes.map(a=>a.id))}>{L('Tümünü seç','Select all')}</button>}
        <button type="button" className="btn xs sec" onClick={()=>onChange([])}>{L('Temizle','Clear')}</button>
      </>}
    </div>
    <div className="sk-pp-grid">
      {athletes.map(a=>{const on=sel.has(a.id);const off=!on&&max&&n>=max;
        return(<label key={a.id} className={`sk-pp${on?' on':''}${off?' off':''}${readOnly?' ro':''}`}>
          <input type="checkbox" checked={on} disabled={readOnly||off} onChange={()=>toggle(a.id)}/>
          <span className="sk-pp-av">{a.photo?<img src={mediaSrc(a.photo)} alt="" loading="lazy"/>:skInit(a.name)}</span>
          <span className="sk-pp-nm">{a.name}</span>
          {a.number?<span className="sk-pp-num">#{a.number}</span>:null}
          <span className="sk-pp-ck" aria-hidden="true"/>
        </label>);})}
    </div>
  </div>);
}

/* Each player's RPE and the sRPE (AU) it makes. The RPE is the one the player submitted
   on the day's check-in form when there is one — marked "form" — and the coach can type
   over it. `rpe` is supplied by the calendar, which owns the athletes' logs.
   With `minutes` (a match) there is a minutes column: the minutes the player reported on
   the form fill it, and a number the coach types there wins. The sRPE is then the form's
   own load, or RPE × those minutes. A summary row closes the table. */
const skLoadTone=v=>{const n=Number(v)||0;return n>=500?'hi':n>=300?'mid':n>0?'lo':'';};
function SkRpeTable({list,rpe,minutes,onMinutes,readOnly}){
  if(!list.length)return<div className="dw-empty">{L('Listede oyuncu yok.','No players listed.')}</div>;
  const withMin=!!minutes;
  const rows=list.map(a=>{
    const v=rpe?rpe.get(a):{rpe:'',load:'',fromAthlete:false};
    const typed=withMin?minutes[a.id]:'';
    const hasTyped=typed!==''&&typed!=null;
    const formMin=v.dur!==''&&v.dur!=null?Number(v.dur):'';
    const min=hasTyped?Number(typed):formMin;
    const hasR=v.rpe!==''&&v.rpe!=null&&!isNaN(Number(v.rpe));
    let load;
    if(!withMin)load=v.load;
    else if(!hasTyped&&v.fromAthlete&&v.formLoad!==''&&v.formLoad!=null)load=v.formLoad;
    else if(hasR&&min!=='')load=Math.round(Number(v.rpe)*Number(min));
    else load=hasR&&!v.fromAthlete?v.load:'';
    return{a,v,min,hasTyped,formMin,hasR,load};
  });
  const rs=rows.filter(r=>r.hasR).map(r=>Number(r.v.rpe));
  const ls=rows.map(r=>Number(r.load)).filter(x=>x>0);
  const ms=rows.map(r=>Number(r.min)).filter(x=>x>0);
  const nForm=rows.filter(r=>r.v.fromAthlete).length;
  const avg=xs=>xs.length?xs.reduce((x,y)=>x+y,0)/xs.length:null;
  return(<div className={'sk-tbl'+(withMin?' min':'')}>
    <div className="sk-tr sk-th">
      <span>{L('Oyuncu','Player')}</span>
      {withMin&&<span>{L('Süre','Minutes')}</span>}
      <span>RPE</span><span>sRPE</span>
    </div>
    {rows.map(({a,v,min,hasTyped,formMin,hasR,load})=>(<div key={a.id} className={'sk-tr'+(hasR?'':' empty')}>
      <span className="sk-pl">
        <span className="dw-rpe-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:skInit(a.name)}</span>
        <span className="sk-pl-nm">{a.name}</span>
        {v.fromAthlete&&<span className="sk-src" title={L('Sporcunun check-in formundan geldi — üzerine yazabilirsin.','From the athlete\'s check-in form — you can overwrite it.')}>{L('form','form')}</span>}
      </span>
      {withMin&&<span className="sk-cell">{readOnly?<b className="sk-val">{min!==''?min:'—'}</b>
        :<input type="number" min="0" max="300" inputMode="numeric" className={'sk-num'+(!hasTyped&&formMin!==''?' auto':'')}
          placeholder="—" value={min} title={!hasTyped&&formMin!==''?L('Sporcunun formda verdiği süre','Minutes the athlete reported on the form'):''}
          onChange={e=>onMinutes(a.id,e.target.value)}/>}<em>{L('dk','min')}</em></span>}
      <span className="sk-cell">{(readOnly||!rpe||!rpe.set)?<b className="sk-val">{hasR?v.rpe:'—'}</b>
        :<input type="number" min="0" max="10" step="0.5" inputMode="decimal" className={'sk-num'+(v.fromAthlete?' auto':'')} placeholder="—"
          value={v.rpe} onChange={e=>rpe.set(a.id,e.target.value,withMin&&min!==''?min:undefined)}/>}</span>
      <span className="sk-cell"><span className={'sk-au '+skLoadTone(load)}>{load!==''&&load!=null?load:'—'}</span></span>
    </div>))}
    <div className="sk-tr sk-tf">
      <span>{L(`${nForm}/${rows.length} oyuncu formu doldurdu`,`${nForm}/${rows.length} players filled in the form`)}</span>
      {withMin&&<span className="sk-cell"><b>{ms.length?ms.reduce((x,y)=>x+y,0):'—'}</b><em>{L('top.','total')}</em></span>}
      <span className="sk-cell"><b>{rs.length?avg(rs).toFixed(1):'—'}</b><em>{L('ort.','avg')}</em></span>
      <span className="sk-cell"><b>{ls.length?Math.round(avg(ls)):'—'}</b><em>{L('ort.','avg')}</em></span>
    </div>
  </div>);
}

function SkSec({title,sub,children}){
  return(<section className="sk-sec">
    <div className="sk-sec-h"><span>{title}</span>{sub&&<em>{sub}</em>}</div>
    {children}
  </section>);
}

/* THE WINDOW A NON-S&C SESSION OPENS IN. A team practice, a match and a test day are not
   written as exercises — that is the S&C coach's work, and these three are not — so
   instead of blocks each gets the handful of fields that describe it:
     tp     who took part, time, duration, content, target intensity, average HR zone,
            each player's RPE / sRPE, notes
     match  opponent, the score, location, time, home or away, the 12-man squad, who
            was left out, each player's minutes and RPE / sRPE, notes
     test   the day, the time and which tests were taken
   `onPatch` merges into the session. `roster` is the team's athletes (absent on a
   personal calendar); `rpe` reads and writes their ratings (absent in the day editor,
   where the ratings are not collected). */
/* "13:30" — when a practice that starts at `time` and runs `duration` minutes ends. */
const skEnd=s=>{const t=skHm(s&&s.time),d=Number(s&&s.duration)||0;if(t==null||!d)return'';
  const m=(t+d)%1440;return`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;};
const skHrs=m=>{const h=Math.floor(m/60),r=m%60;return h?L(`${h} sa${r?` ${r} dk`:''}`,`${h} h${r?` ${r} min`:''}`):L(`${r} dk`,`${r} min`);};
function SesKindForm({session,dateKey,onPatch,readOnly,roster,rpe,teamName}){
  const kind=sesKind(session);
  const s=session||{};
  const u=onPatch;
  const team=Array.isArray(roster);
  const fromTeam=!!s.sourceId;
  const timeTile=<SkStat k={L('Saat','Time')} ac="#22d3ee" ic={<SkIcClock/>}
    sub={kind==='tp'?<span className="sk-st-sub">{skEnd(s)?L(`bitiş ${skEnd(s)}`,`ends ${skEnd(s)}`):L('başlangıç saati','start time')}</span>:null}>
    {readOnly?<div className="sk-st-v">{s.time||'—'}</div>
      :<input type="time" className="dw-inp sk-st-in" value={s.time||''} onChange={e=>u({time:e.target.value})}/>}
  </SkStat>;
  const setDur=raw0=>{
    const raw=String(raw0).replace(/^0+(?=\d)/,'');const d=raw===''?'':Math.max(0,Number(raw));
    const patch={duration:d};
    if(!s.auManual&&s.sRPE!==''&&s.sRPE!=null)patch.au=Math.round(Number(s.sRPE)*(Number(d)||0));
    u(patch);
  };
  const durTile=<SkStat k={L('Süre','Duration')} ac="#a78bfa" ic={<SkIcTimer/>}
    sub={<span className="sk-st-sub">{Number(s.duration)>0?skHrs(Number(s.duration)):L('dakika','minutes')}</span>}>
    {readOnly?<div className="sk-st-v">{Number(s.duration)||0}<span className="dw-unit"> {L('dk','min')}</span></div>
      :<div className="sk-st-v"><input type="number" min="0" inputMode="numeric" className="dw-inp sk-st-in sk-st-num" value={s.duration??''}
          onChange={e=>setDur(e.target.value)} aria-label={L('Süre (dk)','Duration (min)')}/><span className="dw-unit">{L('dk','min')}</span></div>}
  </SkStat>;
  const notes=<SkSec title={L('Notlar','Notes')}>
    {readOnly?<div className="plan-note-view">{s.planNote||'—'}</div>
      :<LiveTextarea className="sk-ta" value={s.planNote||''} onChange={v=>u({planNote:v})} placeholder={L('Notlar…','Notes…')}/>}
  </SkSec>;

  if(kind==='tp'){
    const rT=sesRpeTarget(s);const z=rpeZone(rT);
    const parts=team?((s.athletes||[]).map(id=>roster.find(a=>a.id===id)).filter(Boolean)):[];
    const rpeList=parts.length?parts:(roster||[]);
    const hrIds=team?rpeList.map(a=>a.id):[];
    return(<div className="sk">
      <div className="sk-stats">
        {timeTile}{durTile}
        <SkStat k={L('Hedef Yoğunluk','Target Intensity')} ac={z.c} ic={<SkIcGauge/>}
          sub={<SkRpeScale value={rT} readOnly={readOnly} onPick={n=>u({rpeTarget:n})}/>}>
          <div className="sk-st-v"><b style={{color:z.c}}>{rT}</b><span className="dw-unit">/10</span><span className="sk-st-tag" style={{color:z.c}}>{L(z.tr,z.en)}</span></div>
        </SkStat>
        <SkHrZone session={s} dateKey={dateKey} ids={hrIds} teamOk={team} readOnly={readOnly} onPatch={u}/>
      </div>
      {team&&!fromTeam&&<SkSec title={L('Katılan Oyuncular','Participants')}
        sub={L('Seçilenlerin kişisel takvimine eklenir','Added to the chosen players\' own calendars')}>
        <SkPlayerPick athletes={roster} selected={s.athletes||[]} onChange={ids=>u({athletes:ids})} readOnly={readOnly}/>
      </SkSec>}
      <SkSec title={L('İçerik','Content')}>
        {readOnly?<div className="plan-note-view">{s.content||'—'}</div>
          :<LiveTextarea className="sk-ta" value={s.content||''} onChange={v=>u({content:v})}
            placeholder={L('Antrenmanın içeriği — hücum setleri, savunma, 5v5…','What the practice covers — offensive sets, defence, 5v5…')}/>}
      </SkSec>
      {team&&rpe&&<SkSec title={L('Süre · RPE · sRPE','Minutes · RPE · sRPE')}
        sub={L('Süre, RPE ve sRPE sporcuların check-in formundan otomatik dolar','Minutes, RPE and sRPE fill in automatically from the athletes\' check-in form')}>
        <SkRpeTable list={rpeList} rpe={rpe} readOnly={readOnly} minutes={s.minutes||{}}
          onMinutes={(id,v)=>u({minutes:{...(s.minutes||{}),[id]:v===''?'':Math.max(0,Number(v))}})}/>
      </SkSec>}
      {notes}
    </div>);
  }

  if(kind==='match'){
    const m=s.match||{};
    const um=x=>u({match:{...m,...x}});
    const res=compResult({scoreFor:m.scoreFor,scoreAgainst:m.scoreAgainst});
    const squad=team?((s.athletes||[]).map(id=>roster.find(a=>a.id===id)).filter(Boolean)):[];
    const out=team&&squad.length?roster.filter(a=>!(s.athletes||[]).includes(a.id)):[];
    const minutes=m.minutes||{};
    const outNotes=m.outNotes||{};
    const scoreIn=(k)=>readOnly?<span className="sk-score-n">{m[k]!==''&&m[k]!=null?m[k]:'–'}</span>
      :<input type="number" min="0" inputMode="numeric" className="sk-score-n" placeholder="–" value={m[k]??''}
        onChange={e=>um({[k]:e.target.value})}/>;
    const home=m.venue!=='away';
    const usAb=compAbbr(teamName)||L('BİZ','US'),themAb=compAbbr(m.opponent)||L('RAK','OPP');
    const field=(k,ph,cls)=>readOnly?<span className={'sk-mf-v '+(cls||'')}>{m[k]||'—'}</span>
      :<LiveInput className={'sk-mf-in '+(cls||'')} value={m[k]||''} onChange={v=>um({[k]:v})} placeholder={ph}/>;
    /* The game at a glance on the left: the two sides and the score across the middle,
       where it was played and what it counted for above, when below. Every field here is
       also the fixture's on the Season screen — typed in either place, it shows in both.
       The squad is picked beside it, on the right (under it on a narrow window). */
    const pickSquad=team&&!fromTeam;
    return(<div className="sk">
      <div className={'sk-mgrid'+(pickSquad?'':' one')}>
      <div className={'sk-match'+(res?' '+res.k:'')}>
        <div className="sk-mh">
          <span className="sk-mh-comp"><SkIcCal/>{field('comp',L('Lig / turnuva','League / tournament'))}</span>
          <div className="sk-seg sk-venue">
            <button type="button" className={home?'on':''} disabled={readOnly} onClick={()=>um({venue:'home'})}>{L('Ev sahibi','Home')}</button>
            <button type="button" className={!home?'on':''} disabled={readOnly} onClick={()=>um({venue:'away'})}>{L('Deplasman','Away')}</button>
          </div>
        </div>
        <div className="sk-score">
          <div className="sk-side">
            <span className="sk-crest us">{usAb}</span>
            <span className="sk-side-nm">{teamName||L('Biz','Us')}</span>
            {scoreIn('scoreFor')}
          </div>
          <div className="sk-score-mid">
            <span className={'sk-res'+(res?' '+res.k:'')}>{res?res.title:L('Sonuç','Result')}</span>
            <span className="sk-score-dash">:</span>
          </div>
          <div className="sk-side">
            <span className="sk-crest them">{themAb}</span>
            {field('opponent',L('Rakip takım','Opponent'),'sk-side-in')}
            {scoreIn('scoreAgainst')}
          </div>
        </div>
        <div className="sk-mf">
          <label className="sk-mf-i"><SkIcClock/>
            {readOnly?<span className="sk-mf-v">{s.time||'—'}</span>
              :<input type="time" className="sk-mf-in sk-mf-time" value={s.time||''} onChange={e=>u({time:e.target.value})}/>}</label>
          <label className="sk-mf-i grow"><SkIcPin/>{field('location',L('Salon / şehir','Venue / city'))}</label>
          {dateKey&&<span className="sk-mf-i sk-mf-date">{fdLong(dateKey)}</span>}
        </div>
      </div>
      {pickSquad&&<section className="sk-squad">
        <div className="sk-sec-h"><span>{L('Maç Kadrosu · İlk 12','Match Squad · 12')}</span>
          <em>{L('Seçilenlerin kişisel takvimine eklenir','Added to their own calendars')}</em></div>
        <SkPlayerPick athletes={roster} selected={s.athletes||[]} onChange={ids=>u({athletes:ids})} max={12} readOnly={readOnly}/>
      </section>}
      </div>
      {pickSquad&&<SkSec title={L('Kadro Dışı','Left Out')}
        sub={squad.length?L(`${out.length} oyuncu`,`${out.length} players`):L('Önce ilk 12\'yi seç','Pick the squad first')}>
        {squad.length===0?<div className="dw-empty">{L('İlk 12 seçilince kadro dışı kalanlar burada listelenir.','Once the twelve are picked, everyone left out is listed here.')}</div>
          :out.length===0?<div className="dw-empty">{L('Kadro dışı oyuncu yok.','Nobody left out.')}</div>
          :<div className="sk-out">{out.map(a=><div key={a.id} className="sk-out-row">
              <span className="dw-rpe-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:skInit(a.name)}</span>
              <span className="dw-rpe-nm">{a.name}</span>
              {readOnly?<span className="sk-out-why">{outNotes[a.id]||''}</span>
                :<LiveInput className="sk-out-in" value={outNotes[a.id]||''} placeholder={L('Sebep (sakat, teknik karar…)','Reason (injured, coach\'s decision…)')}
                  onChange={v=>um({outNotes:{...outNotes,[a.id]:v}})}/>}
            </div>)}</div>}
      </SkSec>}
      {team&&<SkSec title={L('Süre · RPE · sRPE','Minutes · RPE · sRPE')}
        sub={L('RPE ve sRPE sporcuların check-in formundan otomatik dolar','RPE and sRPE fill in automatically from the athletes\' check-in form')}>
        <SkRpeTable list={squad.length?squad:(roster||[])} rpe={rpe} minutes={minutes} readOnly={readOnly}
          onMinutes={(id,v)=>um({minutes:{...minutes,[id]:v===''?'':Math.max(0,Number(v))}})}/>
      </SkSec>}
      {notes}
    </div>);
  }

  if(kind==='test'){
    const picked=Array.isArray(s.tests)?s.tests:[];
    const set=new Set(picked);
    const nm=c=>L(TRYOUT_TR[c.id]||c.name,c.name);
    const toggle=id=>u({tests:set.has(id)?picked.filter(x=>x!==id):[...picked,id]});
    const list=TEST_CATALOG.filter(c=>!c.retired||set.has(c.id));
    return(<div className="sk">
      <div className="sk-stats">
        <SkStat k={L('Test Günü','Test Day')} ac="#94a3b8" ic={<SkIcCal/>}><div className="sk-st-v sk-st-txt">{dateKey?fdLong(dateKey):'—'}</div></SkStat>
        {timeTile}
      </div>
      <SkSec title={L('Alınan Testler','Tests Taken')} sub={L(`${picked.length} test`,`${picked.length} tests`)}>
        <div className="sk-tests">
          {list.filter(c=>!readOnly||set.has(c.id)).map(c=><button key={c.id} type="button" disabled={readOnly}
            className={'sk-test'+(set.has(c.id)?' on':'')} onClick={()=>toggle(c.id)}>{set.has(c.id)?'✓ ':''}{nm(c)}</button>)}
        </div>
        {readOnly?(s.testsOther?<div className="plan-note-view" style={{marginTop:10}}>{s.testsOther}</div>:null)
          :<LiveInput className="dw-inp sk-txt sk-other" value={s.testsOther||''} onChange={v=>u({testsOther:v})}
            placeholder={L('Diğer testler (virgülle ayır)','Other tests (comma-separated)')}/>}
      </SkSec>
    </div>);
  }
  return null;
}

/* The card a team practice, match or test day gets in the day editor — the same fields
   as its window, under the editor's own header (number, title, moves, remove), and no
   block / exercise list under them. */
function SesKindCard({session,index,total,onUpdate,onRemove,onMove,athletes,dateKey,teamName}){
  const u=upd=>onUpdate({...session,...upd});
  const fromTeam=!!session.sourceId;
  const kind=sesKind(session);
  const tag=sesKindName(kind);
  /* The practice at a glance beside its name: when it runs and how many take part. */
  const nP=(session.athletes||[]).length;
  const sum=[session.time?(skEnd(session)?`${session.time}–${skEnd(session)}`:session.time):'',
    Array.isArray(athletes)&&nP?L(`${nP} oyuncu`,`${nP} players`):''].filter(Boolean).join(' · ');
  const del=()=>{if(confirm(fromTeam?L('Bu takım-senkronlu seans yalnızca bu sporcudan silinsin mi? (Takım planı değişmez)','Delete this team-synced session from this athlete only? (The team plan is unchanged)'):L('Seans silinsin mi? Bu, atandığı tüm sporculardan da kaldırılacak.','Delete session? This will also remove it from any athletes it was assigned to.')))onRemove();};
  return(<div className="sess-ed"><div className="sbody">
    <div className="iv-block cal-block sk-card">
      <div className="iv-block-hd">
        <span className="blk-sn" title={L('Seans numarası','Session number')}>{index+1}</span>
        <LiveInput className="iv-block-nm" value={session.name||''} placeholder={tag}
          title={L('Seans adı','Session name')} onChange={v=>u({name:v})}/>
        <span className="sk-kind">{tag}</span>
        {kind==='tp'&&sum&&<span className="sk-hd-sum">{sum}</span>}
        <span className="iv-blockacts">
          {total>1&&<>
            <button type="button" className="btn xs sec" onClick={()=>onMove(-1)} disabled={index===0} title={L('Seansı yukarı taşı','Move the session up')}>↑</button>
            <button type="button" className="btn xs sec" onClick={()=>onMove(1)} disabled={index===total-1} title={L('Seansı aşağı taşı','Move the session down')}>↓</button></>}
          <button type="button" className="btn xs sec iv-rmb" onClick={del} title={L('Bu seansı sil','Delete this session')}>✕ {L('Kaldır','Remove')}</button>
        </span>
      </div>
      <div className="sk-card-b">
        <SesKindForm session={session} dateKey={dateKey} onPatch={u} roster={athletes} teamName={teamName}/>
      </div>
    </div>
  </div></div>);
}
