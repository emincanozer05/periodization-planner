/* =========================================================
   ATLETİK GELİŞİM RAPORU — SAYFA. Test ve Değerlendirme'de sporcu kartındaki düğme bu
   sayfayı açar (sekmenin yerini alır, "Testlere dön" ile çıkılır). Koyu ışıklı başlık bandı
   (sporcu, gelişim halkası, dört sayı), test zaman çizgisi, en çok gelişen / takip edilmesi
   gereken ölçümler, kategori kategori trend kartları ve tablolar, fotoğraflı testlerde tarih
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

/* A metric's trend as a small area chart: the line in its category's colour, the latest
   reading ringed, values on the first and latest point; hover a point for its date. */
function DevSpark({r,tests,col}){
  const W=280,H=92,pl=12,pr=12,pt=18,pb=18;
  const vs=r.pts.map(p=>p.v);let lo=Math.min(...vs),hi=Math.max(...vs);
  if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.2;lo-=pad;hi+=pad;
  const X=k=>pl+(r.pts.length>1?k/(r.pts.length-1):.5)*(W-pl-pr);
  const Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  const P=r.pts.map((p,k)=>[X(k),Y(p.v)]);
  const line=P.map((q,k)=>(k?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  const area=`${line} L${P[P.length-1][0].toFixed(1)} ${H-pb} L${P[0][0].toFixed(1)} ${H-pb} Z`;
  const gid='drg-'+r.m.id;
  const lastK=P.length-1;
  return(<svg className="dr-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={cmpLabel(r.m)}>
    <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".32"/><stop offset="1" stopColor={col} stopOpacity="0"/></linearGradient></defs>
    <line x1={pl} y1={H-pb} x2={W-pr} y2={H-pb} className="dr-spark-base"/>
    <path d={area} fill={`url(#${gid})`}/>
    <path d={line} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
    {P.map((q,k)=>{const t=tests[r.pts[k].i];const lbl=k===0||k===lastK||r.pts.length<=4;
      return(<g key={k}>
        <title>{`${fdL(t.date)} · ${devPer(t)}: ${devFv(r.pts[k].v)}${r.m.u?' '+r.m.u:''}`}</title>
        <circle cx={q[0]} cy={q[1]} r="11" fill="transparent"/>
        <circle cx={q[0]} cy={q[1]} r={k===lastK?5:3.5} fill={k===lastK?col:'var(--panel)'} stroke={k===lastK?'var(--panel)':col} strokeWidth={k===lastK?2.5:2}/>
        {lbl&&<text x={q[0]} y={q[1]-9} textAnchor="middle" className="dr-spark-v">{devFv(r.pts[k].v)}</text>}
      </g>);})}
    {P.map((q,k)=>(k===0||k===lastK)?<text key={'x'+k} x={q[0]} y={H-4} textAnchor={k===0&&P.length>1?'start':k===lastK&&P.length>1?'end':'middle'} className="dr-spark-x">{devShortD(tests[r.pts[k].i].date)}</text>:null)}
  </svg>);
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
  const{tests,n,first,last,rows,scored,upN,downN,sameN,topUp,topDown,spanTxt,groups,photoSets}=D;
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
      {groups.map(({g})=><button key={g.id} onClick={()=>go(g.id)}><i style={{background:DEV_GROUP_COL[g.id]}}/>{L(g.tr,g.en)}</button>)}
      {photoSets.length>0&&<button onClick={()=>go('photos')}><i style={{background:'var(--text2)'}}/>{L('Görsel Karşılaştırma','Visual Comparison')}</button>}
    </div>

    {/* ---- categories ---- */}
    {groups.map(({g,list},gi)=>{const col=DEV_GROUP_COL[g.id]||'var(--accent)';const charted=list.filter(r=>r.pts.length>1);
      const open=tblOpen[g.id]!==undefined?tblOpen[g.id]:charted.length===0;
      return(<section key={g.id} id={'dr-sec-'+g.id} className="dr-sec" style={{'--gc':col}}>
        <div className="dr-sec-h"><span className="dr-sec-n">{String(gi+1).padStart(2,'0')}</span><h2>{L(g.tr,g.en)}</h2>
          <small>{list.length} {L('ölçüm','measures')}</small>
          <button className="dr-btn ghost sm" onClick={()=>setTblOpen(o=>({...o,[g.id]:!open}))}>{open?L('Tabloyu gizle','Hide table'):L('Tabloyu göster','Show table')}</button></div>
        {charted.length>0&&<div className="dr-mcs">{charted.map(r=>(<div key={r.m.id} className="dr-mc">
          <div className="dr-mc-h"><span>{cmpLabel(r.m)}</span><DevDelta r={r}/></div>
          <div className="dr-mc-v">{devFv(r.b.v)}{r.m.u&&<small>{r.m.u}</small>}<em>{L('ilk','first')} {devFv(r.a.v)}</em></div>
          <DevSpark r={r} tests={tests} col={col}/>
        </div>))}</div>}
        {open&&<div className="dr-tbl"><table>
          <thead><tr><th className="l">{L('Ölçüm','Measure')}</th>{tests.map((t,i)=><th key={i}>{fd(t.date)}<span>{devPer(t)}</span></th>)}<th>{L('Değişim','Change')}</th></tr></thead>
          <tbody>{list.map(r=><tr key={r.m.id}><td className="l">{cmpLabel(r.m)}{r.m.u&&<small> {r.m.u}</small>}</td>
            {r.vals.map((v,i)=><td key={i} className={i===r.b.i?'cur':''}>{v!=null?devFv(v):<span className="na">·</span>}</td>)}
            <td><DevDelta r={r}/></td></tr>)}</tbody>
        </table></div>}
      </section>);})}

    {/* ---- photos ---- */}
    {ps&&<section id="dr-sec-photos" className="dr-sec" style={{'--gc':'var(--text2)'}}>
      <div className="dr-sec-h"><span className="dr-sec-n">{String(groups.length+1).padStart(2,'0')}</span><h2>{L('Görsel Karşılaştırma','Visual Comparison')}</h2><small>{L('tarihe göre','by date')}</small></div>
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
