/* =========================================================
   RHR MONITOR — resting heart rate, week over week
   The heatmap next door answers "what did this morning look like"; this answers
   "which way is it going". One point per week, Monday to Sunday, and the point is
   the mean of the days that were actually measured: the week's readings added up
   and divided by the number of days carrying one, never by seven. An athlete who
   checked in twice that week has an average of two mornings — dividing that by the
   calendar would read as a resting pulse in the teens and put a cliff in the line
   where there is only a quiet week.

   A week nobody reported has no point at all. The line breaks across it and a
   dashed connector spans the gap, so the chart never walks through a value that
   was never taken.
   ========================================================= */
/* Eight categorical series steps, in this order, on this panel's surface: the
   adjacent CVD separation and the normal-vision floor were both checked against
   #14171c before they were written down. The order is the safety mechanism, so
   slots are handed out from the front and a ninth line is refused rather than
   given a colour already on the chart. */
const RHR_LINE=['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9','#e66767'];
const RHR_TEAM='#8b9099';   /* the squad reference — grey, so it never reads as an athlete */
const RHR_WEEKS=12;         /* three months of weeks on screen at a time */

/* One athlete's week → {avg,days}, or null when the week carries no reading.
   Two check-ins on the same day count as one day, the later one winning, exactly
   as the heatmap's cell resolves them — a double entry can't weigh a week twice. */
function rhrWeekAvg(ath,wkStart,wkEnd){
  const byDay=new Map();
  (ath.wellness||[]).forEach(e=>{
    if(!e||!e.date||e.date<wkStart||e.date>wkEnd)return;
    if(e.RHR===''||e.RHR==null)return;
    const v=Number(e.RHR);
    if(!isFinite(v)||v<=0)return;
    byDay.set(e.date,v);
  });
  const vals=[...byDay.values()];
  if(!vals.length)return null;
  return{avg:vals.reduce((a,b)=>a+b,0)/vals.length,days:vals.length};
}

/* The n weeks ending with the one that contains `endKey`, oldest first. A week is
   filed under the month its Thursday falls in — the ISO rule — so a week straddling
   two months belongs to exactly one of them, and "Week 1…5" under a month header
   counts the calendar's weeks rather than the window's. */
function rhrWeeks(endKey,n){
  const endMon=sow(parseD(endKey));
  return Array.from({length:n},(_,i)=>{
    const s=addD(endMon,(i-(n-1))*7),thu=addD(s,3);
    return{start:fmt(s),end:fmt(addD(s,6)),m:thu.getMonth(),y:thu.getFullYear(),
      wom:Math.floor((thu.getDate()-1)/7)+1};
  });
}

function RHRMonitor({athletes,weeks}){
  const wrapRef=useRef(null);
  const[w,setW]=useState(900);
  useEffect(()=>{const el=wrapRef.current;if(!el)return;
    const m=()=>setW(Math.max(420,el.clientWidth));m();
    let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);try{ro.observe(el);}catch{}}
    window.addEventListener('resize',m);
    return()=>{window.removeEventListener('resize',m);try{ro&&ro.disconnect();}catch{}};
  },[]);
  const[hov,setHov]=useState(null);      // hovered week index → crosshair + card
  const[sel,setSel]=useState([]);        // [{id,slot}] — the slot IS the colour
  const rows=useMemo(()=>(athletes||[]).map(a=>{
    const pts=weeks.map(wk=>rhrWeekAvg(a,wk.start,wk.end));
    const got=pts.filter(Boolean);
    return{a,pts,n:got.length,
      avg:got.length?got.reduce((s,p)=>s+p.avg,0)/got.length:null,
      last:got.length?got[got.length-1].avg:null,
      prev:got.length>1?got[got.length-2].avg:null};
  }).filter(r=>r.n>0).sort((x,y)=>(x.a.name||'').localeCompare(y.a.name||'','tr')),[athletes,weeks]);
  /* The chart opens on the first few athletes rather than empty or on all of them —
     twenty lines through one 300px band is not a trend anyone can read. After that
     the selection is the coach's: navigating weeks only drops athletes who left the
     board, and a chart deliberately emptied stays empty. */
  const seeded=useRef(false);
  useEffect(()=>{
    if(!rows.length)return;
    if(seeded.current){setSel(s=>{const keep=s.filter(x=>rows.some(r=>r.a.id===x.id));return keep.length===s.length?s:keep;});return;}
    seeded.current=true;
    setSel(rows.slice(0,3).map((r,i)=>({id:r.a.id,slot:i})));
  },[rows]);
  /* Colour follows the athlete, not their rank: a slot is held for as long as the
     line is on the chart, so removing one line never repaints the others. */
  const toggle=id=>setSel(s=>{
    if(s.some(x=>x.id===id))return s.filter(x=>x.id!==id);
    const used=new Set(s.map(x=>x.slot));
    let slot=0;while(used.has(slot))slot++;
    if(slot>=RHR_LINE.length)return s;
    return[...s,{id,slot}];
  });
  const colOf=id=>{const e=sel.find(x=>x.id===id);return e?RHR_LINE[e.slot]:null;};
  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const first=n=>{const p=(n||'').trim().split(/\s+/)[0]||'';return p.length>9?p.slice(0,8)+'…':p;};
  /* Months across the top: consecutive weeks filed under the same month, banded. */
  const groups=[];weeks.forEach((wk,i)=>{const g=groups[groups.length-1];
    if(g&&g.m===wk.m&&g.y===wk.y)g.to=i;else groups.push({m:wk.m,y:wk.y,from:i,to:i});});
  /* "JUL 26" reads as a date; the year is only worth printing where it changes anyway. */
  const gLbl=(g,gi)=>MN[g.m].toUpperCase()+((gi===0||groups[gi-1].y!==g.y)?' '+g.y:'');
  /* The squad's week, drawn behind the athletes as a dashed reference. It averages
     the athletes' weekly averages, so a squad of one heavy reporter and nine quiet
     ones is still ten athletes' worth of line. */
  const team=weeks.map((_,i)=>{const vs=rows.map(r=>r.pts[i]).filter(Boolean).map(p=>p.avg);
    return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;});
  const shown=rows.filter(r=>sel.some(x=>x.id===r.a.id));
  const named=shown.length>0&&shown.length<=4;   /* ≤4 lines are also labelled where they end */
  const H=312,padL=48,padT=44,padB=50,padR=named?108:24;
  const plotW=Math.max(300,w-padL-padR),bw=plotW/Math.max(1,weeks.length);
  const xOf=i=>padL+(i+0.5)*bw;
  const vals=[];
  shown.forEach(r=>r.pts.forEach(p=>{if(p)vals.push(p.avg);}));
  team.forEach(v=>{if(v!=null)vals.push(v);});
  const rawLo=vals.length?Math.min(...vals):50,rawHi=vals.length?Math.max(...vals):60;
  const step=Math.max(2,Math.ceil(((rawHi-rawLo)||4)/8)*2);
  const lo=Math.floor((rawLo-step*0.4)/step)*step,hi=Math.ceil((rawHi+step*0.4)/step)*step;
  const ticks=[];for(let v=lo;v<=hi+1e-6;v+=step)ticks.push(v);
  const yOf=v=>padT+(1-(v-lo)/((hi-lo)||1))*(H-padT-padB);
  /* A series as the runs of weeks it was actually measured in. */
  const segsOf=pts=>{const out=[];let cur=[];
    pts.forEach((p,i)=>{if(p)cur.push({x:xOf(i),y:yOf(p.avg),i});else if(cur.length){out.push(cur);cur=[];}});
    if(cur.length)out.push(cur);return out;};
  /* End-of-line labels, pushed apart so two athletes finishing on the same pulse
     don't print over each other. */
  const endLabels=(()=>{
    if(!named)return[];
    const ls=shown.map(r=>{const got=r.pts.map((p,i)=>({p,i})).filter(x=>x.p);
      if(!got.length)return null;const e=got[got.length-1];
      return{id:r.a.id,c:colOf(r.a.id),y:yOf(e.p.avg),px:xOf(e.i),py:yOf(e.p.avg),t:first(r.a.name)+' '+Math.round(e.p.avg)};})
      .filter(Boolean).sort((a,b)=>a.y-b.y);
    for(let i=1;i<ls.length;i++)if(ls[i].y-ls[i-1].y<14)ls[i].y=ls[i-1].y+14;
    const over=ls.length?ls[ls.length-1].y-(H-padB):0;
    if(over>0)ls.forEach(l=>{l.y-=over;});
    return ls;
  })();
  const trend=r=>{if(r.last==null||r.prev==null)return null;const d=r.last-r.prev;
    return{d,cls:Math.abs(d)<0.5?'fl':(d>0?'up':'dn'),s:(Math.abs(d)<0.5?'→ ':(d>0?'↑ ':'↓ '))+Math.abs(d).toFixed(1)};};
  if(!rows.length)return<div className="empty-st">{L('Bu aralıkta dinlenik nabız ölçümü yok.','No resting-HR readings in this range.')}</div>;
  return(<div className="rm-wrap">
    <div className="rm-legend">
      <span className="rm-lg" style={{'--rm-c':RHR_TEAM}}><i/>{L('takım ort.','team avg')}</span>
      {shown.map(r=><button key={r.a.id} className="rm-chip" style={{'--rm-c':colOf(r.a.id)}} onClick={()=>toggle(r.a.id)}
        title={L('Grafikten çıkar','Remove from chart')}><i/>{r.a.name}<b>×</b></button>)}
      <span className="rm-hint">{!shown.length?L('grafiğe eklemek için tablodan bir sporcuya tıkla','click an athlete below to plot them')
        :sel.length>=RHR_LINE.length?L('en fazla 8 çizgi','8 lines max')
        :L('sporcu eklemek/çıkarmak için tabloya tıkla','click the table to add or remove athletes')}</span>
    </div>
    <div className="rm-chart" ref={wrapRef}>
      <svg width={w} height={H} onMouseLeave={()=>setHov(null)}>
        {/* Alternating month bands — the calendar behind the line, quiet enough to
            stay behind it. The month's name rides on top of its own band. */}
        {groups.map((g,gi)=><g key={'g'+gi}>
          {gi%2===1&&<rect x={padL+g.from*bw} y={padT-18} width={(g.to-g.from+1)*bw} height={H-padT-padB+18} fill="rgba(255,255,255,.022)"/>}
          {gi>0&&<line x1={padL+g.from*bw} y1={padT-18} x2={padL+g.from*bw} y2={H-padB} style={{stroke:'var(--border2)'}} strokeWidth="1"/>}
          <text x={padL+g.from*bw+((g.to-g.from+1)*bw)/2} y={padT-26} textAnchor="middle" style={{fill:'var(--accent2)'}}
            fontFamily="IBM Plex Mono" fontSize="10" fontWeight="700" letterSpacing="1.2">{gLbl(g,gi)}</text>
        </g>)}
        {/* Scale: gridlines and the bpm the chart is counting in. */}
        {ticks.map(t=><g key={'t'+t}>
          <line x1={padL} y1={yOf(t)} x2={padL+plotW} y2={yOf(t)} stroke="rgba(255,255,255,.055)" strokeWidth="1"/>
          <text x={padL-9} y={yOf(t)+3.5} textAnchor="end" style={{fill:'var(--dim)'}} fontFamily="IBM Plex Mono" fontSize="9.5">{t}</text>
        </g>)}
        <text x={padL-9} y={padT-26} textAnchor="end" style={{fill:'var(--dim)'}} fontFamily="IBM Plex Mono" fontSize="9" letterSpacing=".5">bpm</text>
        {hov!=null&&<line x1={xOf(hov)} y1={padT-18} x2={xOf(hov)} y2={H-padB} stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="3 3"/>}
        {/* The squad line first, so the athletes' own lines sit over it. */}
        {(()=>{const segs=segsOf(team.map(v=>v==null?null:{avg:v}));
          return segs.map((sg,k)=>sg.length>1?<path key={'tm'+k} d={sg.map((p,j)=>(j?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')}
            fill="none" stroke={RHR_TEAM} strokeWidth="1.5" strokeOpacity=".75" strokeDasharray="5 4" strokeLinecap="round"/>:null);})()}
        {shown.map(r=>{const c=colOf(r.a.id),segs=segsOf(r.pts);
          return<g key={r.a.id}>
            {segs.slice(1).map((sg,k)=>{const a=segs[k][segs[k].length-1],b=sg[0];
              return<line key={'gap'+k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeOpacity=".3" strokeWidth="1.5" strokeDasharray="2 4"/>;})}
            {segs.map((sg,k)=>sg.length>1?<path key={'s'+k} d={sg.map((p,j)=>(j?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')}
              fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>:null)}
            {segs.map(sg=>sg.map(p=><circle key={'p'+p.i} cx={p.x} cy={p.y} r={hov===p.i?5:3.6} fill={c} strokeWidth="2" style={{stroke:'var(--panel)'}}/>))}
          </g>;})}
        {/* Whose line is whose, said twice: a swatch out at the end of each line, and
            the legend above. Never colour alone, and never a number on every point. */}
        {endLabels.map(l=><g key={'l'+l.id}>
          {/* A line that stopped weeks ago still gets its name at the edge — the leader
              says which point out there the name belongs to. */}
          {(Math.abs(l.y-l.py)>2||l.px<padL+plotW-bw*0.6)&&
            <line x1={l.px+5} y1={l.py} x2={padL+plotW+6} y2={l.y} stroke={l.c} strokeOpacity=".3" strokeWidth="1" strokeDasharray="2 3"/>}
          <rect x={padL+plotW+7} y={l.y-1.5} width={9} height={3} rx={1.5} fill={l.c}/>
          <text x={padL+plotW+21} y={l.y+3.5} style={{fill:'var(--text2)'}} fontFamily="IBM Plex Mono" fontSize="10.5" fontWeight="600">{l.t}</text>
        </g>)}
        {/* Weeks along the bottom, under the month they belong to. On a narrow screen
            the column is too tight for the word and the date, so the label drops to
            "W3" before two of them can print over each other. */}
        {weeks.map((wk,i)=><g key={'x'+wk.start}>
          <text x={xOf(i)} y={H-padB+19} textAnchor="middle" style={{fill:hov===i?'var(--text)':'var(--text2)'}}
            fontFamily="IBM Plex Mono" fontSize="10" fontWeight="600">{bw<52?L('H','W')+wk.wom:L('Hafta','Week')+' '+wk.wom}</text>
          {bw>=38&&<text x={xOf(i)} y={H-padB+32} textAnchor="middle" style={{fill:'var(--dim)'}} fontFamily="IBM Plex Mono" fontSize="9">{fd(wk.start).slice(0,5)}</text>}
          <rect className="rm-hit" x={padL+i*bw} y={padT-18} width={bw} height={H-padT-padB+18} onMouseEnter={()=>setHov(i)}/>
        </g>)}
      </svg>
      {hov!=null&&(()=>{const wk=weeks[hov];
        const right=xOf(hov)<w*0.6;   /* beside the crosshair, flipping before it runs off the edge */
        return<div className="rm-tip" style={{left:xOf(hov)+(right?14:-14),top:padT+4,transform:right?'none':'translate(-100%,0)'}}>
          <div className="rm-tip-h"><b>{L('Hafta','Week')} {wk.wom} · {MN[wk.m]}</b><span>{fd(wk.start).slice(0,5)} – {fd(wk.end).slice(0,5)}</span></div>
          {shown.map(r=>{const p=r.pts[hov];
            return<div key={r.a.id} className="rm-tip-r"><i style={{background:colOf(r.a.id)}}/>
              <span className="rm-tip-n">{r.a.name}</span><strong>{p?Math.round(p.avg):'—'}</strong>
              <em>{p?p.days+L(' gün',' d'):''}</em></div>;})}
          {!shown.length&&<div className="rm-tip-r"><span className="rm-tip-n">{L('sporcu seçili değil','no athlete plotted')}</span></div>}
          {team[hov]!=null&&<div className="rm-tip-r"><i style={{background:RHR_TEAM}}/>
            <span className="rm-tip-n">{L('takım ort.','team avg')}</span><strong>{Math.round(team[hov])}</strong><em/></div>}
        </div>;})()}
    </div>
    {/* The same weeks as numbers, for every athlete on the board — the chart shows the
        shape, this says what it was. A row is also the chart's switch. */}
    <div className="wh-scroll">
      <table className="rm-tb">
        <thead>
          <tr>
            <th className="rm-ath-h wh-frozen" rowSpan="2">{L('Sporcu','Athlete')}</th>
            {groups.map((g,gi)=><th key={'h'+gi} className="rm-mon-h" colSpan={g.to-g.from+1}>{gLbl(g,gi)}</th>)}
            <th className="rm-avg-h" rowSpan="2">{L('Ort.','Avg')}</th>
          </tr>
          <tr>{weeks.map(wk=><th key={wk.start} className="rm-wk-h">
            <div className="rm-wk-n">{L('Hafta','Week')} {wk.wom}</div><div className="rm-wk-d">{fd(wk.start).slice(0,5)}</div></th>)}</tr>
        </thead>
        <tbody>{rows.map((r,ri)=>{const c=colOf(r.a.id),tr=trend(r);
          return<tr key={r.a.id} className={'rm-row'+(c?' on':'')} style={{animationDelay:(ri*40)+'ms',...(c?{'--rm-c':c}:{})}}
            onClick={()=>toggle(r.a.id)}
            title={c?L('Grafikten çıkar','Remove from chart'):L('Grafiğe ekle','Add to chart')}>
            <td className="rm-ath wh-frozen"><div className="rm-ath-in">
              <span className="rm-dot"/>
              <div className="rm-av">{r.a.photo?<img src={mediaSrc(r.a.photo)} alt=""/>:initials(r.a.name)}</div>
              <span className="rm-nm">{r.a.name}</span>
              {r.a.position&&<span className="rm-pos">{posOf(r.a.position)}</span>}
            </div></td>
            {r.pts.map((p,i)=><td key={i} className={'rm-cel'+(hov===i?' hv':'')}
              title={p?`${r.a.name}\n${fd(weeks[i].start).slice(0,5)} – ${fd(weeks[i].end).slice(0,5)}\n${L('Ortalama','Average')}: ${p.avg.toFixed(1)} bpm · ${p.days} ${L('ölçüm günü','measured days')}`:undefined}>
              {p?<span className="rm-v">{Math.round(p.avg)}<i>{p.days}</i></span>:<span className="rm-na">·</span>}</td>)}
            <td className="rm-avg"><span className="rm-avg-in">
              <span className="rm-avg-v">{r.avg!=null?Math.round(r.avg):'—'}</span>
              {tr&&<span className={'rm-trd '+tr.cls} title={L('son iki ölçülen haftanın farkı','change across the last two measured weeks')}>{tr.s}</span>}
            </span></td>
          </tr>;})}</tbody>
      </table>
    </div>
  </div>);
}

/* The morning check-in asks four scored questions — sleep, mental fatigue, physical
   fatigue, muscle soreness — each 1-5 with 5 the good end. Fatigue used to be one
   question; a record written before the split carries only `fatigue`, and one written
   after carries both halves plus `fatigue` as their mean (for the readers that still
   want one fatigue number: individualization, the AI export). */
function wellFatigue(w){
  const v=[recNum(w&&w.mentalFatigue),recNum(w&&w.physicalFatigue)].filter(x=>x!=null);
  if(v.length)return +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1);
  return recNum(w&&w.fatigue);
}
/* Readiness = the mean of the scored questions the athlete answered, one decimal —
   the same formula as the check-in form and the server's alert rule
   (functions/wellness-alert.js). On a split record the two fatigue halves count as
   two questions and the derived `fatigue` is left out, or it would count twice. */
function wellReadiness(w){
  if(!w)return null;
  const split=recNum(w.mentalFatigue)!=null||recNum(w.physicalFatigue)!=null;
  const keys=split?['sleep','mentalFatigue','physicalFatigue','soreness']:['sleep','fatigue','soreness'];
  const v=keys.map(k=>recNum(w[k])).filter(x=>x!=null);
  return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):null;
}
/* The 1-5 colours of the check-in form's own buttons (checkin.html SCORE_COLORS) and of
   the staff phone page: 1 red · 2 orange · 3 yellow · 4 green · 5 blue. The heatmap
   paints a score in the colour the athlete tapped, so the two never disagree. */
const SCORE5_COLORS=['#ef4444','#f97316','#fcd34d','#46d6a0','#0094ff'];
const score5Color=v=>{if(v==null||isNaN(Number(v)))return null;return SCORE5_COLORS[Math.min(5,Math.max(1,Math.round(Number(v))))-1];};

/* Wellness Heatmap — athletes × dates grid of a chosen wellness metric, sorted by average */
function WellnessHeatmap({athletes}){
  /* One button per question on the morning check-in, in the form's order, so what the
     athlete answered and what the coach reads are the same list. Readiness is their
     mean; RHR is the form's optional first box. The pain map rides on every metric as
     the ring and pip on the day's cell. */
  const METRICS=[
    {id:'readiness',label:L('Hazır Oluş','Readiness'),hi:true,scale:5},
    {id:'sleep',label:L('Uyku','Sleep'),hi:true,scale:5},
    {id:'mentalFatigue',label:L('Zihinsel Yorgunluk','Mental Fatigue'),hi:true,scale:5},
    {id:'physicalFatigue',label:L('Fiziksel Yorgunluk','Physical Fatigue'),hi:true,scale:5},
    {id:'soreness',label:L('Kas Ağrısı','Muscle Soreness'),hi:true,scale:5},
    {id:'RHR',label:'RHR',hi:false,scale:null},
  ];
  /* The segment's last button is not a fifth metric — it swaps the grid for the RHR
     Monitor: the same athletes, but week by week instead of day by day. It rides here
     rather than in a panel of its own because it answers the question the RHR column
     raises ("is this morning's 54 a drift or a day?") and the coach should not have to
     go looking for the answer somewhere else. */
  const[metric,setMetric]=useState('readiness');
  const mon=metric==='mon';
  const M=METRICS.find(m=>m.id===metric)||METRICS[0];
  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  // Two-week (14-day) window ending at `winEnd`; navigate by week from the header.
  const[winEnd,setWinEnd]=useState(()=>fmt(today));
  const dates=useMemo(()=>Array.from({length:14},(_,i)=>fmt(addD(parseD(winEnd),-13+i))),[winEnd]);
  const shiftWk=d=>setWinEnd(w=>fmt(addD(parseD(w),d*7)));
  /* The monitor spans twelve weeks, so its stepper moves a month at a time — a
     one-week nudge across a quarter-long chart is a lot of clicking for one point. */
  const monWeeks=useMemo(()=>rhrWeeks(winEnd,RHR_WEEKS),[winEnd]);
  const step=mon?4:1;
  const rangeLabel=mon
    ?fd(monWeeks[0].start).slice(0,5)+' – '+fd(monWeeks[monWeeks.length-1].end).slice(0,5)
    :fd(dates[0]).slice(0,5)+' – '+fd(dates[13]).slice(0,5);
  const valOf=(a,dk)=>{const e=(a.wellness||[]).filter(w=>w.date===dk&&w[M.id]!==''&&w[M.id]!=null&&!isNaN(Number(w[M.id])));return e.length?Number(e[e.length-1][M.id]):null;};
  // Free-text the athlete typed into the check-in's "Area of Pain" box ("dizlerim ağrıyor"…).
  // Independent of the selected metric — it flags the day, whichever metric is on screen.
  const noteOf=(a,dk)=>{const e=(a.wellness||[]).filter(w=>w.date===dk&&painFreeText(w.areaOfPain));
    return e.length?painFreeText(e[e.length-1].areaOfPain):'';};
  /* The pain grid the athlete ticked that day. Like the note it is independent of the
     selected metric — a marked region flags the day whichever metric is on screen.
     A check-in written before the grid existed still parses out of its free-text box,
     so an old "Bel: Fazla" is not lost just because it arrived under the old key. */
  const painOf=(a,dk)=>{
    const e=(a.wellness||[]).filter(w=>w.date===dk);
    for(let i=e.length-1;i>=0;i--){
      // Stored maps go back through the parser too: one written before the ids were
      // resolved keeps them as its keys, and only the parser knows to fold those away.
      const m=parsePainMap(e[i].painMap&&typeof e[i].painMap==='object'?e[i].painMap:e[i].areaOfPain);
      const list=painEntries(m);
      if(list.length)return{list,max:list[0].sev};
    }
    return null;
  };
  const[tip,setTip]=useState(null);   // hovered note cell → {x,y,name,date,note,val,pain}
  // The heatmap sits inside a horizontally scrolling wrapper, so the bubble is rendered
  // fixed-position into <body> instead of absolutely inside the cell (which would clip).
  const showTip=(e,p)=>{const r=e.currentTarget.getBoundingClientRect();
    setTip({...p,x:Math.max(120,Math.min(window.innerWidth-120,r.left+r.width/2)),y:r.top});};
  // Normalised quality 0 (kötü) → 1 (iyi), then a smooth red→amber→green colour ramp.
  const goodT=v=>{if(v==null)return null;
    if(M.id==='RHR')return Math.max(0,Math.min(1,1-(v-48)/24));
    return Math.max(0,Math.min(1,(v-1)/4));};
  const mix=(a,b,t)=>a.map((x,i)=>Math.round(x+(b[i]-x)*t));
  const RED=[244,63,94],AMB=[245,158,11],GRN=[45,212,167];
  const scaleRGB=t=>t==null?null:(t<0.5?mix(RED,AMB,t/0.5):mix(AMB,GRN,(t-0.5)/0.5));
  // Every 1-5 score is painted in the check-in form's own colours (1 red … 5 blue);
  // only RHR, a heart rate with no fixed scale, keeps the continuous ramp.
  const isDiscrete=M.scale===5;
  const cellBg=v=>{if(isDiscrete)return score5Color(v);const c=scaleRGB(goodT(v));return c?`rgb(${c[0]},${c[1]},${c[2]})`:null;};
  const dotCol=v=>{if(isDiscrete)return score5Color(v)||'var(--dim)';const t=goodT(v);return t==null?'var(--dim)':t>=0.66?'#2dd4a7':t>=0.33?'#f59e0b':'#f43f5e';};
  const rows=(athletes||[]).map(a=>{
    const cells=dates.map(dk=>valOf(a,dk));
    const notes=dates.map(dk=>noteOf(a,dk));
    const pains=dates.map(dk=>painOf(a,dk));
    const vals=cells.filter(v=>v!=null);
    const avg=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null;
    return{a,cells,notes,pains,avg};
  /* An athlete who only reported pain, with no scores behind it, still belongs on the
     grid — dropping the row would hide the one thing on it worth seeing. Rows without
     an average sort to the bottom, since there is no average to rank them by. */
  }).filter(r=>r.avg!=null||r.pains.some(Boolean))
    .sort((x,y)=>(x.avg==null)-(y.avg==null)||(x.avg==null?0:(M.hi?(y.avg-x.avg):(x.avg-y.avg))));
  const fmtV=v=>v==null?'':(M.id==='RHR'?Math.round(v):(+v.toFixed(1)));
  const teamAvg=rows.length?rows.reduce((s,r)=>s+r.avg,0)/rows.length:null;
  return(<div className="panel lb-wrap">
    {/* The board's own head and week selector are the ones this tab already uses —
        the Athlete Load Board's title block above it, and the Load Monitoring
        header's week stepper — so the three read as one page rather than three. */}
    <div className="lb-head">
      <div className="lb-title">{mon?L('RHR Takibi','RHR Monitor'):L('Wellness Isı Haritası','Wellness Heatmap')}<span className="lb-sub">{mon?L('haftalık ortalama dinlenik nabız · Pzt–Paz','weekly average resting HR · Mon–Sun'):L('son 2 hafta · ortalamaya göre sıralı','last 2 weeks · sorted by average')}</span></div>
      <div className="wh-hm-tools">
        <div className="lm-wksel">
          <button onClick={()=>shiftWk(-step)} title={mon?L('Önceki 4 hafta','Back 4 weeks'):L('Önceki hafta','Previous week')}>‹</button>
          <span className="lm-wklbl">{rangeLabel}</span>
          <button onClick={()=>shiftWk(step)} title={mon?L('Sonraki 4 hafta','Forward 4 weeks'):L('Sonraki hafta','Next week')}>›</button>
          <button className="lm-wknow" onClick={()=>setWinEnd(fmt(today))} title={L('Bugüne git','Jump to today')}>{L('Bugün','Today')}</button>
        </div>
        <div className="lb-seg">
          {METRICS.map(m=><button key={m.id} className={metric===m.id?'on':''} onClick={()=>setMetric(m.id)}>{m.label}</button>)}
          {/* Hairline before the last button: it changes the view, not the metric. */}
          <span className="lb-seg-sep"/>
          <button className={mon?'on':''} onClick={()=>setMetric('mon')}
            title={L('Haftalık dinlenik nabız trendi','Weekly resting-HR trend')}>RHR Monitor</button>
        </div>
      </div>
    </div>
    {mon?<RHRMonitor athletes={athletes} weeks={monWeeks}/>
    :rows.length===0?<div className="empty-st">{L('Bu 2 haftalık aralıkta wellness verisi yok.','No wellness data in this 2-week range.')}</div>:<>
      <div className="wh-legend">
        <span className="wh-leg-cap">{M.id==='RHR'?L('yüksek','high'):L('düşük','low')}</span>
        {isDiscrete
          ?<span className="wh-leg-steps">{SCORE5_COLORS.map((c,i)=><i key={i} style={{background:c}}>{i+1}</i>)}</span>
          :<span className="wh-leg-bar"/>}
        <span className="wh-leg-cap">{M.id==='RHR'?L('düşük','low'):L('yüksek','high')}</span>
        {teamAvg!=null&&<span className="wh-leg-team"><span className="wh-adot" style={{background:dotCol(teamAvg)}}/>{L('takım ort.','team avg')} <b>{fmtV(teamAvg)}</b></span>}
      </div>
      <div className="wh-scroll">
        <table className="wh-hm">
          <thead><tr>
            <th className="wh-ath-h wh-frozen">{L('Sporcu','Athlete')}</th>
            {dates.map((d,i)=>{const dt=parseD(d);const prev=i>0?parseD(dates[i-1]):null;const showMonth=!prev||prev.getMonth()!==dt.getMonth();
              return<th key={d} className="wh-day"><div className="wh-mon">{showMonth?MN[dt.getMonth()]:''}</div><div className="wh-wd">{DN[(dt.getDay()+6)%7][0]}</div><div className="wh-dd">{dt.getDate()}</div></th>;})}
            <th className="wh-avg-h">{L('Ort.','Avg')}</th>
          </tr></thead>
          <tbody>{rows.map((r,ri)=><tr key={ri} className="wh-row" style={{animationDelay:(ri*45)+'ms'}}>
            <td className="wh-ath wh-frozen"><div className="wh-ath-in"><span className="wh-rank">{ri+1}</span><div className="wh-av">{r.a.photo?<img src={mediaSrc(r.a.photo)} alt=""/>:initials(r.a.name)}</div><span className="wh-nm">{r.a.name}</span>{r.a.position&&<span className="wh-pos">{posOf(r.a.position)}</span>}</div></td>
            {r.cells.map((v,ci)=>{
              const note=r.notes[ci];
              const pain=r.pains[ci];
              const dl=(()=>{const dt=parseD(dates[ci]);return MN[dt.getMonth()]+' '+dt.getDate()+', '+dt.getFullYear();})();
              const vl=v!=null?`${M.label}: ${fmtV(v)}${M.scale?'/5':''}`:L('Veri yok','No data');
              /* A day carrying a complaint — a ticked region or a written one — gets a
                 ring in the worst reported severity's colour, and the regions themselves
                 ride in the hover bubble, so the native title tooltip is dropped there
                 (it would double up). */
              const flag=!!(note||pain);
              const ringC=pain?PAIN_SEV_COL[pain.max]:'#f43f5e';
              const hov=flag?{onMouseEnter:e=>showTip(e,{name:r.a.name,date:dl,val:vl,note,pain}),onMouseLeave:()=>setTip(null)}:{};
              /* The marker sits INSIDE the day's own box: a pip in the worst severity's
                 colour, carrying how many regions were ticked when it was more than one. */
              const pip=pain?<i className="wh-pain" style={{background:PAIN_SEV_COL[pain.max]}}>{pain.list.length>1?pain.list.length:''}</i>:null;
              return<td key={ci} className="wh-cell">{v!=null
                ?<span className={'wh-box'+(flag?' wh-alert':'')} style={{background:cellBg(v),'--wh-ring':ringC}} title={flag?undefined:`${r.a.name}\n${dl}\n${vl}`} {...hov}>{fmtV(v)}{pip}</span>
                :<span className={'wh-empty'+(flag?' wh-alert':'')} style={{'--wh-ring':ringC}} title={flag?undefined:`${r.a.name}\n${dl}\nNo data`} {...hov}>{flag?(pain?'':'!'):'·'}{pip}</span>}</td>;})}
            <td className="wh-avg"><div className="wh-avg-in"><span className="wh-aval" style={{color:dotCol(r.avg)}}>{fmtV(r.avg)}</span><span className="wh-abar"><i style={{width:Math.round((goodT(r.avg)||0)*100)+'%',background:cellBg(r.avg)}}/></span></div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    {tip&&ReactDOM.createPortal(
      <div className="wh-note-tip" style={{left:tip.x,top:tip.y,'--wh-ring':tip.pain?PAIN_SEV_COL[tip.pain.max]:'#f43f5e'}}>
        <div className="wh-nt-h"><b>{tip.name}</b><span>{tip.date}</span></div>
        <div className="wh-nt-v">{tip.val}</div>
        {/* Every region the athlete ticked, worst first, each with its own severity —
            the grid's whole answer, not just that something hurt. */}
        {tip.pain&&<div className="wh-nt-p">
          {tip.pain.list.map(p=><span key={p.region} className="wh-nt-pr">
            <i style={{background:PAIN_SEV_COL[p.sev]}}/>{p.region}
            <b style={{color:PAIN_SEV_COL[p.sev]}}>{PAIN_SEV_LABEL()[p.sev]}</b>
          </span>)}
        </div>}
        {tip.note&&<div className="wh-nt-n"><span className="wh-nt-ic">⚠</span>{tip.note}</div>}
      </div>,document.body)}
  </div>);
}

/* =========================================================
   TEAM → ATHLETE SESSION SYNC
   Propagates team sessions to selected athletes' personal calendars.
   - Each session has `athletes: [ids]` and a copy lives in each athlete's days.
   - The copy stores `sourceId` pointing to the team session.
   - Updates to the team session re-sync the copies; an athlete's personal
     sRPE / AU / notes are preserved across updates.
   - A copy the coach has individualized (it carries `indiv`) is left alone: it is
     rewritten from the Individualization sheet, never from the team session.
   ========================================================= */
/* Whether a team session reaches a given athlete: the athletes ticked on it are the
   assignment, and it reaches nobody else. A session with nobody ticked has no assignment
   to contradict — it reads as the whole squad, which is what the drawer's "assign to the
   team" button and the sRPE roster already take it to mean.

   This is the rule the load-time reconcile above deletes by, so it deliberately answers
   "yes" for the unassigned session: reconciling removes a coach's work, and does it only
   where an explicit tick list says the athlete was never meant to have it. Writing is the
   stricter side — syncSessionsToAthletes copies a session only to the athletes actually
   ticked, never to the squad by default. */
function teamSessionCovers(teamSes,athId){
  if(!teamSes)return false;
  const ids=Array.isArray(teamSes.athletes)?teamSes.athletes:[];
  return ids.length===0||ids.includes(athId);
}
/* A BLOCK IS ITS OWN PIECE OF WORK.
   A session used to hold one title and one participant list, and every block of it showed
   the same two — so naming the guards' block or ticking the forwards on it rewrote them
   for the whole session. Both now live on the block:
     · `block.sesName`  — this block's own title. Absent means "use the session's".
     · `block.athletes` — who does THIS block. Absent means "whoever the session is for",
                          which is what every session written before this carried.
   `session.athletes` stays as the union of the blocks, because everything outside the
   editor — the assignment badge, the sRPE roster, the reconcile at load — asks the session
   who it is for, not the blocks. */
function blkSesName(session,block){
  /* The block's own title. Sessions written while the details card carried a second
     title box still hold it in `sesName`, and it wins; everything since is titled by the
     heading at the head of the block — the one box a coach types "Gardlar" into — and
     falls back to the session's name for a block left unnamed. */
  const n=(block&&block.sesName!=null)?String(block.sesName).trim():'';
  const h=(block&&block.name!=null)?String(block.name).trim():'';
  return n||h||((session&&session.name)||'');
}
function blkAthIds(session,block){
  return Array.isArray(block&&block.athletes)?block.athletes:((session&&session.athletes)||[]);
}
/* Nobody ticked on a block reads as "everyone the session is for" — the same rule the
   session itself uses, so an untouched block never quietly drops out of anyone's copy. */
function blockCoversAthlete(session,block,athId){
  const ids=blkAthIds(session,block);
  return ids.length===0||ids.includes(athId);
}
/* The participants of a session, read off its blocks: what `session.athletes` is kept at. */
function unionBlockAthletes(session,blocks){
  const out=[],seen=new Set();
  (blocks||[]).forEach(b=>blkAthIds(session,b).forEach(id=>{if(!seen.has(id)){seen.add(id);out.push(id);}}));
  return out;
}
/* Structural comparison that stops at the first difference. The sync below runs on every
   edit of a team session — every keystroke, every added exercise — and it is what tells
   an athlete whose copy did not actually change from one whose did. */
function sameData(a,b){
  if(a===b)return true;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  const ka=Object.keys(a),kb=Object.keys(b);
  if(ka.length!==kb.length)return false;
  for(const k of ka){
    if(!Object.prototype.hasOwnProperty.call(b,k))return false;
    if(!sameData(a[k],b[k]))return false;
  }
  return true;
}
/* Returns the roster UNTOUCHED when the edit changed nothing on it, and keeps every
   athlete whose day is unchanged as the very same object. Both matter well beyond
   tidiness: the state is saved by content-defined chunking, so an athlete rebuilt into an
   equal-but-new object still had to be re-serialised and re-uploaded, and React had to
   re-render them. Editing one team session used to rewrite all of it on every keystroke. */
function syncSessionsToAthletes(athletes,dateKey,oldSessions,newSessions){
  const newIds=new Set(newSessions.map(s=>s.id));
  const removedIds=oldSessions.filter(s=>!newIds.has(s.id)).map(s=>s.id);
  let touched=false;
  const out=athletes.map(ath=>{
    const days={...(ath.days||{})};
    const day=days[dateKey]||{date:dateKey,sessions:[],dailyNotes:''};
    let sessions=[...(day.sessions||[])];
    // remove copies whose team source was deleted
    if(removedIds.length)sessions=sessions.filter(s=>!s.sourceId||!removedIds.includes(s.sourceId));
    // upsert / remove per current team session
    for(const ts of newSessions){
      /* Only the blocks this athlete is ticked on travel to them: a session whose guard
         block and forward block carry different names reaches each of them as the block
         they actually do, under that block's own title. A session with no block left for
         them is not their session at all. */
      const myBlocks=(ts.blocks||[]).filter(b=>blockCoversAthlete(ts,b,ath.id));
      const includes=(ts.athletes||[]).includes(ath.id)&&(!(ts.blocks||[]).length||myBlocks.length>0);
      const eidx=sessions.findIndex(s=>s.sourceId===ts.id);
      const existing=eidx>=0?sessions[eidx]:null;
      if(includes){
        /* An individual program written from the Individualization sheet is the coach's
           own work, not a mirror of the team session: re-syncing it would throw away the
           per-athlete exercises and numbers they set, which is what made the sheet ask to
           be written again on every visit. It keeps its link to the team session — so
           deleting the session or un-assigning the athlete still removes it — but its
           content stays exactly as written until the coach writes it again. */
        if(existing&&existing.indiv){
          if(existing.sourceId!==ts.id)sessions[eidx]={...existing,sourceId:ts.id};
          continue;
        }
        /* The copy keeps the block ids it already had. Minting fresh ones on every sync
           made an unchanged copy read as changed — which is what turned one keystroke on
           a team session into a rewrite of the whole roster. */
        const prevBlocks=(existing&&existing.blocks)||[];
        /* The copy is titled by the blocks it actually carries: one title among them (the
           usual case — one block, or several sharing the session's) is the athlete's title
           for it; blocks that disagree fall back to the session's own name. */
        const blkNames=[...new Set(myBlocks.map(b=>blkSesName(ts,b)).filter(Boolean))];
        const copy={
          ...ts,
          id:existing?.id||uid(),
          name:blkNames.length===1?blkNames[0]:ts.name,
          sourceId:ts.id,
          // preserve athlete's personal post-session feedback
          sRPE:(existing?.sRPE!==undefined&&existing.sRPE!=='')?existing.sRPE:'',
          au:(existing?.au!==undefined&&existing.au!=='')?existing.au:'',
          notes:existing?.notes||'',
          /* Matched by the block they came from rather than by position: the athlete's
             copy holds only some of the session's blocks now, so an index no longer says
             which block a previous copy was. `srcId` does, and keeping the id is what
             stops an unchanged copy reading as changed. */
          blocks:myBlocks.map(b=>{
            const prev=prevBlocks.find(p=>p.srcId===b.id)||null;
            const{athletes:_ba,...rest}=b;
            return{...rest,id:(prev&&prev.id)||uid(),srcId:b.id,
              exercises:(b.exercises||[]).map(e=>({...e}))};
          }),
        };
        delete copy.athletes; // athlete-side copy doesn't need the participant list
        if(eidx>=0)sessions[eidx]=sameData(existing,copy)?existing:copy;else sessions.push(copy);
      } else if(eidx>=0){
        sessions.splice(eidx,1);
      }
    }
    if(sessions.length===0&&!day.dailyNotes)delete days[dateKey];
    else days[dateKey]={...day,sessions};
    const was=(ath.days||{})[dateKey],now=days[dateKey];
    if(was===now||(was&&now&&sameData(was,now)))return ath;
    touched=true;
    return{...ath,days};
  });
  return touched?out:athletes;
}

/* =========================================================
   ATHLETE PICKER (checkbox grid for session participants)
   ========================================================= */
function AthletePicker({athletes,selected,onChange}){
  if(!athletes||athletes.length===0)return(
    <div className="ath-pick"><div className="help">{L('Kadroda henüz sporcu yok — antrenmanlara atayabilmek için Sporcular sekmesinden ekle.','No athletes on roster yet — add them in the Athletes tab to assign them to sessions.')}</div></div>
  );
  const sel=new Set(selected||[]);
  const toggle=id=>{const a=sel.has(id)?(selected||[]).filter(x=>x!==id):[...(selected||[]),id];onChange(a);};
  return(<div className="ath-pick">
    <div className="ath-pick-head">
      <strong className="ath-pick-t">{L('Katılan Sporcular','Participating Athletes')}</strong>
      <span className="ath-pick-n">{(selected||[]).length} / {athletes.length}</span>
      <span style={{flex:1}}/>
      <button className="btn xs sec" onClick={()=>onChange(athletes.map(a=>a.id))}>{L('Tümünü seç','Select all')}</button>
      <button className="btn xs sec" onClick={()=>onChange([])}>{L('Temizle','Clear')}</button>
    </div>
    <div className="ath-pick-grid">
      {athletes.map(a=>(
        <label key={a.id} className={`ath-chip${sel.has(a.id)?' on':''}`}>
          <input type="checkbox" checked={sel.has(a.id)} onChange={()=>toggle(a.id)}/>
          <span>{a.name}</span>{a.number?<span className="num">#{a.number}</span>:null}
        </label>
      ))}
    </div>
    <div className="help" style={{marginTop:8}}>{L(
      'Seçilen sporcular bu bloğun kişisel takvimlerine otomatik olarak eklenir. Her blok bağımsız olarak işaretlenir, bu sayede gardlar ve forvetlere aynı gün farklı çalışmalar verilebilir. Sporcuların kişisel sRPE ve AU değerleri düzenlemeler boyunca korunur.',
      'Checked athletes get this block copied to their personal calendar automatically — each block of a session is ticked on its own, so the guards and the forwards can be given different work on the same day. Their personal sRPE & AU are preserved across edits.')}</div>
  </div>);
}

