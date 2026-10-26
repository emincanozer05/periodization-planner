/* =========================================================
   ATLETİK GELİŞİM RAPORU — SAYFA. Test ve Değerlendirme'de sporcu kartındaki düğme bu
   sayfayı açar (sekmenin yerini alır, "Testlere dön" ile çıkılır). Koyu ışıklı başlık bandı
   (sporcu, gelişim halkası, dört sayı), test zaman çizgisi, en çok gelişen / takip edilmesi
   gereken ölçümler; Güç & Sıçrama ve Sürat & Çeviklik'te her ölçüm, dinlenik kalp atım hızı ve
   uyku süresi kendi büyük grafiğiyle, diğer kategoriler tablo; fotoğraflı testlerde tarih
   tarih ve önce/sonra kaydırmalı karşılaştırma. "Çıktı Al" aynı veriden A4 çıktıyı açar
   (printDevReport). Veri: devReportData (295).
   ========================================================= */
const DEV_GROUP_COL={anthro:'#a78bfa',circ:'#2dd4bf',fms:'#fbbf24',mob:'#38bdf8',pow:'#fb923c',spd:'#60a5fa',str:'#c084fc',end:'#f472b6',cust:'#94a3b8'};

function DevDelta({r}){
  if(r.d==null)return<span className="dr-pill neu">{L('tek ölçüm','one reading')}</span>;
  const u=r.m.u&&!r.m.u.startsWith('/')?' '+r.m.u:'';
  return(<span className={'dr-pill '+r.tone}>
    {r.d>0?'+':r.d<0?'−':''}{devFv(Math.abs(r.d))}{u}
    {r.pct!=null&&r.d!==0&&<i> {r.d>0?'+':'−'}{L('%'+Math.abs(r.pct),Math.abs(r.pct)+'%')}</i>}
  </span>);
}

/* A step on a readable axis: 1, 2, 2.5 or 5 times a power of ten. */
const devNiceStep=x=>{const p=Math.pow(10,Math.floor(Math.log10(x)));const m=x/p;return(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;};
/* The big chart: one measure over time, on a real axis. Gridlines with their values, the
   series as a glowing line over a gradient (or as bars), every point's value while they fit,
   the best reading ringed and named, the average as a dashed line and an optional target. The
   line draws itself in; hover a point for its date. pts: [{v, x: axis label, t: hover title}]
   Drawn at the box's own pixel width (useElW), so its text is the same small size on every
   screen instead of growing with the card. */
function DevBigChart({pts,col,dir,fmtV,unit,bars,target,targetLbl,id,H=210}){
  const boxRef=useRef(null);
  const W=useElW(boxRef,480);
  const pl=40,pr=14,pt=24,pb=26;
  const fv=fmtV||devFv;
  const vs=pts.map(p=>p.v);
  let lo=Math.min(...vs),hi=Math.max(...vs);
  if(target!=null){lo=Math.min(lo,target);hi=Math.max(hi,target);}
  if(lo===hi){lo-=1;hi+=1;}
  const pad=(hi-lo)*.12;if(!bars)lo-=pad;hi+=pad;
  const step=devNiceStep((hi-lo)/4);
  lo=bars?0:Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
  const ticks=[];for(let v=lo;v<=hi+step*1e-6;v+=step)ticks.push(+v.toFixed(6));
  const n=pts.length,band=(W-pl-pr)/n;
  const X=k=>bars?pl+band*(k+.5):pl+(n>1?k/(n-1):.5)*(W-pl-pr);
  const Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  const P=pts.map((p,k)=>[X(k),Y(p.v)]);
  const line=P.map((q,k)=>(k?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  const area=`${line} L${P[n-1][0].toFixed(1)} ${H-pb} L${P[0][0].toFixed(1)} ${H-pb} Z`;
  const bestK=dir?vs.indexOf(dir==='hi'?Math.max(...vs):Math.min(...vs)):-1;
  const avg=vs.reduce((s,x)=>s+x,0)/n;
  const labelAll=n<=Math.max(4,Math.floor((W-pl-pr)/46)),xEvery=Math.max(1,Math.ceil(n/Math.max(2,Math.floor((W-pl-pr)/64))));
  const gid='dbg-'+id,bw=Math.min(30,band*.62);
  return(<div ref={boxRef} className="dr-big-box"><svg className="dr-big" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img">
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".38"/><stop offset="1" stopColor={col} stopOpacity="0"/></linearGradient>
    </defs>
    {ticks.map(v=><g key={v}><line x1={pl} x2={W-pr} y1={Y(v)} y2={Y(v)} className="dr-big-grid"/>
      <text x={pl-7} y={Y(v)+3.5} textAnchor="end" className="dr-big-tick">{devFv(v)}</text></g>)}
    {/* the average's name sits at the left end, clear of the latest value at the right; with a
        target beside it, the target's name goes under its line */}
    {n>1&&<g><line x1={pl} x2={W-pr} y1={Y(avg)} y2={Y(avg)} className="dr-big-avg"/>
      <text x={pl+6} y={Y(avg)-6} className="dr-big-avgt">{L('ort.','avg')} {fv(avg)}</text></g>}
    {target!=null&&<g><line x1={pl} x2={W-pr} y1={Y(target)} y2={Y(target)} className="dr-big-target"/>
      <text x={pl+6} y={Y(target)+(n>1?13:-5)} className="dr-big-tgtt">{targetLbl}</text></g>}
    {bars?pts.map((p,k)=>{const y=Y(p.v),ok=target==null||p.v>=target;
      return(<g key={k}><title>{p.t}</title>
        <rect x={P[k][0]-bw/2} y={y} width={bw} height={Math.max(0,H-pb-y)} rx="5" fill={col} opacity={ok?1:.42} className="dr-big-bar" style={{animationDelay:Math.min(k*25,600)+'ms'}}/>
        {(labelAll||k===n-1||k===bestK)&&<text x={P[k][0]} y={y-7} textAnchor="middle" className="dr-big-v">{fv(p.v)}</text>}
      </g>);})
    :<>
      <path d={area} fill={`url(#${gid})`} className="dr-big-area"/>
      <path d={line} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" pathLength="1" className="dr-big-line" style={{'--gc':col}}/>
      {P.map((q,k)=>{const best=k===bestK&&n>1,lastP=k===n-1;
        return(<g key={k}><title>{pts[k].t}</title>
          <circle cx={q[0]} cy={q[1]} r="14" fill="transparent"/>
          {best&&<circle cx={q[0]} cy={q[1]} r="9" fill="none" stroke={col} strokeOpacity=".45" strokeWidth="2" className="dr-big-pulse"/>}
          <circle cx={q[0]} cy={q[1]} r={lastP||best?5:3.8} fill={lastP?col:'var(--panel)'} stroke={lastP?'var(--panel)':col} strokeWidth={lastP?2.5:2}/>
          {(labelAll||lastP||best)&&<text x={q[0]} y={q[1]-10} textAnchor="middle" className="dr-big-v">{fv(pts[k].v)}</text>}
          {best&&<text x={q[0]} y={q[1]+19} textAnchor="middle" className="dr-big-best" fill={col}>{L('EN İYİ','BEST')}</text>}
        </g>);})}
    </>}
    {pts.map((p,k)=>(n-1-k)%xEvery===0?<text key={'x'+k} x={P[k][0]} y={H-8} textAnchor="middle" className="dr-big-x">{p.x}</text>:null)}
    {unit&&<text x={pl-8} y={pt-12} textAnchor="end" className="dr-big-tick">{unit}</text>}
  </svg></div>);
}

/* One measure of a charted group: its name and which way is better, four numbers (latest,
   first, best, change) and the big chart over its tests. */
function DevMetricChart({r,tests,col}){
  const vs=r.pts.map(p=>p.v);
  const best=r.m.dir?(r.m.dir==='hi'?Math.max(...vs):Math.min(...vs)):null;
  const one=r.pts.length<2;
  const u=r.m.u||'';
  return(<div className="dr-fc" style={{'--gc':col}}>
    <div className="dr-fc-h"><div><b>{cmpLabel(r.m)}</b><span>{r.m.dir==='hi'?L('yüksek daha iyi','higher is better'):r.m.dir==='lo'?L('düşük daha iyi','lower is better'):''}</span></div>{one?null:<DevDelta r={r}/>}</div>
    <div className="dr-fc-s">
      <div><span>{one?fdL(tests[r.b.i].date):L('Son','Latest')}</span><b>{devFv(r.b.v)}<small>{u}</small></b></div>
      {!one&&<div><span>{L('İlk','First')}</span><b>{devFv(r.a.v)}<small>{u}</small></b></div>}
      {!one&&best!=null&&<div><span>{L('En iyi','Best')}</span><b>{devFv(best)}<small>{u}</small></b></div>}
      {!one&&<div><span>{L('Ölçüm','Readings')}</span><b>{r.pts.length}</b></div>}
    </div>
    {one&&<div className="dr-fc-note">{L('Tek ölçüm — bir sonraki testle gelişim eğrisi burada oluşur.','One reading — the next test draws the development curve here.')}</div>}
    <DevBigChart id={r.m.id} col={col} dir={r.m.dir} unit={u} H={one?120:210}
      pts={r.pts.map(p=>{const t=tests[p.i];return{v:p.v,x:devShortD(t.date),t:`${fdL(t.date)} · ${devPer(t)}: ${devFv(p.v)}${u?' '+u:''}`};})}/>
  </div>);
}

/* Resting heart rate / sleep: four numbers and the big chart, daily or weekly. */
function DevRecovery({S,id,title,sub,col,unit,fmtV,bars,target,targetLbl}){
  const dTxt=S.d==null?'—':`${S.d>0?'+':S.d<0?'−':''}${fmtV(Math.abs(S.d))} ${unit}`;
  return(<div className="dr-fc dr-rc" style={{'--gc':col}}>
    <div className="dr-fc-h"><div><b>{title}</b><span>{sub} · {S.weekly?L('haftalık ortalama','weekly mean'):L('günlük','daily')} · {fdL(S.from)} → {fdL(S.to)}</span></div>
      <span className={'dr-pill '+S.tone}>{dTxt}</span></div>
    <div className="dr-fc-s">
      <div><span>{L('Son','Latest')}</span><b>{fmtV(S.b.v)}<small>{unit}</small></b></div>
      <div><span>{L('Ortalama','Average')}</span><b>{fmtV(S.avg)}<small>{unit}</small></b></div>
      <div><span>{L('En düşük','Lowest')}</span><b>{fmtV(S.min)}<small>{unit}</small></b></div>
      <div><span>{L('En yüksek','Highest')}</span><b>{fmtV(S.max)}<small>{unit}</small></b></div>
      <div><span>{L('Kayıt','Entries')}</span><b>{S.n}<small>{L('gün','days')}</small></b></div>
    </div>
    <DevBigChart id={id} col={col} dir={S.dir} unit={unit} fmtV={fmtV} bars={bars} target={target} targetLbl={targetLbl} H={240}
      pts={S.pts.map(p=>({v:p.v,x:devShortD(p.date).replace(/ \d+$/,'')+' '+parseD(p.date).getDate(),
        t:`${S.weekly?L('Hafta: ','Week of '):''}${fdL(p.date)}: ${fmtV(p.v)} ${unit}${p.n?` (${p.n} ${L('gün','days')})`:''}`}))}/>
  </div>);
}

/* Before / after: the earliest and the latest photo of one view laid over each other, a
   handle to wipe between them. */
function DevBeforeAfter({a,b,la,lb}){
  const[x,setX]=useState(50);
  return(<div className="dr-ba">
    <div className="dr-ba-stage">
      <img src={mediaSrc(b)} alt=""/>
      <div className="dr-ba-top" style={{clipPath:`inset(0 ${100-x}% 0 0)`}}><img src={mediaSrc(a)} alt=""/></div>
      <div className="dr-ba-line" style={{left:x+'%'}}><span/></div>
      <div className="dr-ba-tag l">{la}</div><div className="dr-ba-tag r">{lb}</div>
    </div>
    <input type="range" min="0" max="100" value={x} onChange={e=>setX(+e.target.value)} aria-label={L('Önce / sonra kaydırıcısı','Before / after slider')}/>
  </div>);
}

function DevReportPage({ath,setup,customTests,onBack}){
  const D=useMemo(()=>devReportData(ath,customTests),[ath,customTests]);
  const rootRef=useRef(null);
  const[psIdx,setPsIdx]=useState(0);
  const[baView,setBaView]=useState(null);
  const[tblOpen,setTblOpen]=useState({});
  useEffect(()=>{try{rootRef.current&&rootRef.current.scrollIntoView({block:'start'});}catch(e){}},[ath&&ath.id]);
  const back=<button className="dr-btn ghost" onClick={onBack}>← {L('Testlere dön','Back to tests')}</button>;
  if(!D)return(<div className="dr" ref={rootRef}><div className="dr-bar">{back}</div><div className="empty-st">{L('Bu sporcunun henüz tarihli test kaydı yok.','This athlete has no dated test records yet.')}</div></div>);
  const{tests,n,first,last,rows,scored,upN,downN,sameN,topUp,topDown,spanTxt,groups,photoSets,rhr,sleep}=D;
  /* Sections in reading order: Power & Jump and Speed & Agility as one big chart per measure,
     resting heart rate and sleep, then every other group as its table. */
  const grpSec=(x,chart)=>({kind:'group',id:x.g.id,g:x.g,list:x.list,chart,title:L(x.g.tr,x.g.en),sub:`${x.list.length} ${L('ölçüm','measures')}`,col:DEV_GROUP_COL[x.g.id]||'var(--accent)'});
  const secs=[
    ...DEV_CHART_GROUPS.map(id=>groups.find(x=>x.g.id===id)).filter(Boolean).map(x=>grpSec(x,true)),
    ...(rhr?[{kind:'rhr',id:'rhr',title:L('Dinlenik Kalp Atım Hızı','Resting Heart Rate'),sub:`${rhr.n} ${L('gün','days')}`,col:'#f472b6'}]:[]),
    ...(sleep?[{kind:'sleep',id:'sleep',title:L('Uyku Süresi','Sleep Duration'),sub:`${sleep.n} ${L('gece','nights')}`,col:'#818cf8'}]:[]),
    ...groups.filter(x=>!DEV_CHART_GROUPS.includes(x.g.id)).map(x=>grpSec(x,false)),
  ];
  const age=(()=>{if(!ath.dateOfBirth)return null;const b=parseD(ath.dateOfBirth),t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})();
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const rate=scored.length?Math.round(upN/scored.length*100):null;
  const R=46,C=2*Math.PI*R;
  const go=id=>{const el=document.getElementById('dr-sec-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};
  const ps=photoSets[Math.min(psIdx,photoSets.length-1)];
  const maxPct=Math.max(1,...[...topUp,...topDown].map(r=>Math.abs(r.pct)));
  const hlList=(list,tone)=>list.length?list.map(r=>(<div key={r.m.id} className="dr-hl-r">
      <div className="dr-hl-n">{cmpLabel(r.m)}<span>{devFv(r.a.v)} → <b>{devFv(r.b.v)}</b>{r.m.u?' '+r.m.u:''}</span></div>
      <DevDelta r={r}/>
      <div className="dr-hl-bar"><i className={tone} style={{width:Math.max(6,Math.abs(r.pct)/maxPct*100)+'%'}}/></div>
    </div>))
    :<div className="dr-hl-x">{tone==='up'?L('Gelişen ölçüm yok.','No measure improved.'):L('Gerileyen ölçüm yok.','No measure declined.')}</div>;

  return(<div className="dr" ref={rootRef}>
    {/* ---- hero ---- */}
    <div className="dr-hero">
      <div className="dr-hero-glow" aria-hidden="true"/>
      <div className="dr-bar">
        {back}
        <button className="dr-btn primary" onClick={()=>printDevReport(ath,setup,customTests)}>{L('Çıktı Al','Print')}</button>
      </div>
      <div className="dr-id">
        <div className="dr-av">{ath.photo?<img src={mediaSrc(ath.photo)} alt=""/>:<span>{initials}</span>}</div>
        <div className="dr-id-tx">
          <div className="dr-eyebrow">{L('Atletik Gelişim Raporu','Athletic Development Report')}</div>
          <h1 className="dr-name">{ath.name}</h1>
          <div className="dr-tags">
            {ath.number!==''&&ath.number!=null&&<span>#{ath.number}</span>}
            {ath.position&&<span>{POS_FULL[ath.position]||posOf(ath.position)}</span>}
            {age!=null&&<span>{age} {L('yaş','y')}</span>}
            <span>{setup.teamName}</span>
            <span className="dr-tag-date">{fdL(first.date)}{n>1?` → ${fdL(last.date)}`:''}</span>
          </div>
        </div>
        <div className="dr-ring" title={L('İlk teste göre gelişen ölçümlerin oranı','Share of measures improved since the first test')}>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r={R} className="dr-ring-bg"/>
            <circle cx="60" cy="60" r={R} className="dr-ring-fg" strokeDasharray={`${C*(rate||0)/100} ${C}`} transform="rotate(-90 60 60)"/></svg>
          <div className="dr-ring-tx"><b>{rate!=null?L('%'+rate,rate+'%'):'—'}</b><span>{L('gelişim','improved')}</span></div>
        </div>
      </div>
      <div className="dr-kpis">
        <div className="dr-kpi"><b>{n}</b><span>{L('Test kaydı','Test records')}</span></div>
        <div className="dr-kpi"><b>{spanTxt}</b><span>{L('Takip süresi','Tracked for')} · {rows.length} {L('ölçüm','measures')}</span></div>
        <div className="dr-kpi up"><b>{upN}</b><span>{L('Gelişen ölçüm','Improved')}</span></div>
        <div className="dr-kpi down"><b>{downN}</b><span>{L('Gerileyen ölçüm','Declined')}{sameN?` · ${sameN} ${L('aynı','same')}`:''}</span></div>
      </div>
    </div>

    {/* ---- timeline ---- */}
    <div className="dr-card">
      <div className="dr-card-h"><span>{L('Test Yolculuğu','Testing Journey')}</span><small>{n} {L('kayıt','records')}</small></div>
      <div className="dr-tl">{tests.map((t,i)=>{const b=expandBattery(t.battery);const k=Array.isArray(b)?b.length:null;
        return(<div key={t.id||i} className={'dr-tl-i'+(i===n-1?' cur':'')}>
          <div className="dr-tl-dot"/>
          <div className="dr-tl-d">{fdL(t.date)}</div>
          <div className="dr-tl-s">{devPer(t)}{k?` · ${k} ${L('test',k===1?'test':'tests')}`:''}</div>
        </div>);})}</div>
    </div>

    {/* ---- highlights ---- */}
    {n>1?<div className="dr-hl">
      <div className="dr-card"><div className="dr-card-h"><span className="up">{L('En çok gelişen','Most improved')}</span></div>{hlList(topUp,'up')}</div>
      <div className="dr-card"><div className="dr-card-h"><span className="down">{L('Takip edilmesi gereken','To keep an eye on')}</span></div>{hlList(topDown,'down')}</div>
    </div>:<div className="dr-note">{L('Karşılaştırma için en az iki test kaydı gerekir; şimdilik tek testin değerleri gösteriliyor.','A comparison needs at least two test records; for now the single test’s values are shown.')}</div>}

    {/* ---- category nav ---- */}
    <div className="dr-nav">
      {secs.map(x=><button key={x.id} onClick={()=>go(x.id)}><i style={{background:x.col}}/>{x.title}</button>)}
      {photoSets.length>0&&<button onClick={()=>go('photos')}><i style={{background:'var(--text2)'}}/>{L('Görsel Karşılaştırma','Visual Comparison')}</button>}
    </div>

    {/* ---- sections: the charted ones first, then the tables ---- */}
    {secs.map((x,si)=>{
      const head=(extra)=>(<div className="dr-sec-h"><span className="dr-sec-n">{String(si+1).padStart(2,'0')}</span><h2>{x.title}</h2>
        {x.sub&&<small>{x.sub}</small>}{extra}</div>);
      if(x.kind==='rhr')return(<section key={x.id} id={'dr-sec-'+x.id} className="dr-sec" style={{'--gc':x.col}}>{head()}
        <DevRecovery S={rhr} id="rhr" title={L('Dinlenik Kalp Atım Hızı','Resting Heart Rate')} sub={L('sabah check-in, düşük daha iyi','morning check-in, lower is better')}
          col={x.col} unit="bpm" fmtV={v=>String(Math.round(v))}/></section>);
      if(x.kind==='sleep')return(<section key={x.id} id={'dr-sec-'+x.id} className="dr-sec" style={{'--gc':x.col}}>{head()}
        <DevRecovery S={sleep} id="sleep" title={L('Uyku Süresi','Sleep Duration')} sub={L('gece kaydı, hedef 8 saat','night log, 8-hour target')}
          col={x.col} unit={L('sa','h')} fmtV={v=>(Math.round(v*10)/10).toFixed(1)} bars target={8} targetLbl={L('hedef 8 sa','target 8 h')}/></section>);
      const{g,list}=x;const charted=x.chart?list:[];
      // only the tests that hold a value in this group get a column
      const cols=tests.map((t,i)=>i).filter(i=>list.some(r=>r.vals[i]!=null));
      const open=!charted.length||!!tblOpen[g.id];
      return(<section key={x.id} id={'dr-sec-'+x.id} className="dr-sec" style={{'--gc':x.col}}>
        {head(charted.length>0&&<button className="dr-btn ghost sm" onClick={()=>setTblOpen(o=>({...o,[g.id]:!open}))}>{open?L('Tabloyu gizle','Hide table'):L('Tabloyu göster','Show table')}</button>)}
        {charted.length>0&&<div className="dr-fcs">{charted.map(r=><DevMetricChart key={r.m.id} r={r} tests={tests} col={x.col}/>)}</div>}
        {open&&<div className="dr-tbl"><table>
          <thead><tr><th className="l">{L('Ölçüm','Measure')}</th>{cols.map(i=><th key={i}>{fd(tests[i].date)}<span>{devPer(tests[i])}</span></th>)}<th>{L('Değişim','Change')}</th></tr></thead>
          <tbody>{list.map(r=><tr key={r.m.id}><td className="l">{cmpLabel(r.m)}{r.m.u&&<small> {r.m.u}</small>}</td>
            {cols.map(i=><td key={i} className={i===r.b.i&&cols.length>1?'cur':''}>{r.vals[i]!=null?devFv(r.vals[i]):<span className="na">·</span>}</td>)}
            <td><DevDelta r={r}/></td></tr>)}</tbody>
        </table></div>}
      </section>);})}

    {/* ---- photos ---- */}
    {ps&&<section id="dr-sec-photos" className="dr-sec" style={{'--gc':'var(--text2)'}}>
      <div className="dr-sec-h"><span className="dr-sec-n">{String(secs.length+1).padStart(2,'0')}</span><h2>{L('Görsel Karşılaştırma','Visual Comparison')}</h2><small>{L('tarihe göre','by date')}</small></div>
      {photoSets.length>1&&<div className="dr-tabs">{photoSets.map((p,i)=><button key={p.s.id} className={p===ps?'on':''} onClick={()=>{setPsIdx(i);setBaView(null);}}>{L(p.s.tr,p.s.en)}</button>)}</div>}
      {(()=>{const{s,dated,views,has}=ps;
        const pair=dated.length>1?[dated[0],dated[dated.length-1]]:null;
        const baOpts=pair?views.filter(([k])=>has(pair[0],k)&&has(pair[1],k)):[];
        const bv=baOpts.find(([k])=>k===baView)||baOpts[0];
        return(<>
          {bv&&<div className="dr-card dr-ba-wrap">
            <div className="dr-card-h"><span>{L('Önce / Sonra','Before / After')}</span>
              <div className="dr-tabs sm">{baOpts.map(([k,tr,en])=><button key={k} className={bv[0]===k?'on':''} onClick={()=>setBaView(k)}>{L(tr,en)}</button>)}</div></div>
            <DevBeforeAfter key={s.id+bv[0]} a={s.get(pair[0])[bv[0]]} b={s.get(pair[1])[bv[0]]} la={fd(pair[0].date)} lb={fd(pair[1].date)}/>
          </div>}
          <div className="dr-card">
            <div className="dr-pg" style={{gridTemplateColumns:`92px repeat(${views.length},minmax(0,1fr))`}}>
              <div/>{views.map(([k,tr,en])=><div key={k} className="dr-pg-vh">{L(tr,en)}</div>)}
              {dated.map(t=>{const note=s.note&&s.note(t);return(<React.Fragment key={t.id}>
                <div className="dr-pg-d"><b>{fd(t.date)}</b><span>{devPer(t)}</span></div>
                {views.map(([k])=>{const v=s.get(t)[k];return<div key={k} className="dr-pg-ph">{v&&hasMedia(v)?<img src={mediaSrc(v)} alt="" loading="lazy"/>:<span>—</span>}</div>;})}
                {note&&String(note).trim()&&<><div/><div className="dr-pg-n" style={{gridColumn:`span ${views.length}`}}>{note}</div></>}
              </React.Fragment>);})}
            </div>
          </div>
        </>);})()}
    </section>}

    <div className="dr-foot">{L('Değişim, her ölçümün ilk ve son değeri arasındadır; yeşil gelişmeyi, kırmızı gerilemeyi gösterir. Yönü olmayan ölçümler (boy, çevre) nötr gösterilir.','Change is between each measure’s first and latest reading; green is an improvement, red a decline. Measures with no direction (height, circumferences) are shown neutral.')}</div>
  </div>);
}
