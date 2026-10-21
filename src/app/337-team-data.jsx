/* =========================================================
   TAKIM VERİLERİ — Test ve Değerlendirme'deki "Takım Verileri" düğmesinin açtığı ekran
   ---------------------------------------------------------
   Sporcuların test kayıtlarından gelişimi okur: bir metrik seçilir (CMP_METRICS'in yönü
   olanları + FMS toplamı), ekranda üç grafik ve özet kutuları çıkar:
     1) Gelişim eğrisi — ay ay takım ortalaması (dolgulu kalın çizgi) ve her sporcunun
        ince çizgisi; seçilen sporcu öne çıkar.
     2) Gelişim sıralaması — her sporcunun ilk ve son testi arasındaki % değişim; yön
        düzeltilmiş (sprint süresinin düşmesi gelişmedir), yeşil iyi, kırmızı geri.
     3) Gelişim haritası — her metrikte iki testi olan sporculardan gelişenlerin oranı.
   Altında eski "Sporcuları Karşılaştır" tablosu (CompareAthletes) aynen durur. */
const TD_FMS={id:'fmsTotal',g:'mob',tr:'FMS Toplam',en:'FMS Total',u:'/21',dir:'hi',st:'FMS',se:'FMS',
  get:t=>{const f=fmsCalc(t.fms);return f.n?f.total:null;}};
const TD_COLORS=['#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#ef4444','#84cc16','#f97316','#14b8a6',
  '#a855f7','#eab308','#0ea5e9','#22c55e','#e11d48','#6366f1','#d946ef','#64748b'];
const tdVal=(m,t)=>{try{const v=m.get(t);return v==null||!isFinite(v)?null:v;}catch(e){return null;}};
/* Bir sporcunun bu metrikteki tarihli değerleri, eskiden yeniye. */
function tdSeries(ath,m){
  return(ath.tests||[]).filter(t=>t.date).map(t=>({d:t.date,v:tdVal(m,t)})).filter(x=>x.v!=null)
    .sort((a,b)=>a.d.localeCompare(b.d));
}
/* İlk → son % değişim, yön düzeltilmiş: pozitif her zaman gelişme. */
function tdGain(s,dir){
  if(s.length<2)return null;
  const a=s[0].v,b=s[s.length-1].v;
  if(!a)return null;
  const pct=(b-a)/Math.abs(a)*100;
  return+(dir==='lo'?-pct:pct).toFixed(1);
}
function TeamData({athletes,setup,customTests,Lx}){
  const metrics=useMemo(()=>[TD_FMS,...CMP_METRICS.filter(m=>m.dir&&m.g!=='anthro')]
    .filter(m=>athletes.some(a=>tdSeries(a,m).length)),[athletes]);
  const[mid,setMid]=useState(null);
  const[focus,setFocus]=useState(null);
  const[showCmp,setShowCmp]=useState(false);
  /* Varsayılan metrik: en çok sporcunun iki ölçümü olan. */
  const best=useMemo(()=>{
    let top=null,n=-1;
    metrics.forEach(m=>{const k=athletes.filter(a=>tdSeries(a,m).length>1).length;if(k>n){n=k;top=m;}});
    return top;},[metrics,athletes]);
  const m=metrics.find(x=>x.id===mid)||best;
  const colorOf=useMemo(()=>{const map={};[...athletes].sort(byAthleteName).forEach((a,i)=>{map[a.id]=TD_COLORS[i%TD_COLORS.length];});
    return id=>map[id]||'#94a3b8';},[athletes]);

  const view=useMemo(()=>{
    if(!m)return null;
    const rows=athletes.map(a=>({a,s:tdSeries(a,m)})).filter(r=>r.s.length);
    const months=[...new Set(rows.flatMap(r=>r.s.map(x=>x.d.slice(0,7))))].sort();
    // Bir sporcunun o aydaki değeri: o ayın son testi.
    const at=(r,mo)=>{const h=r.s.filter(x=>x.d.slice(0,7)===mo);return h.length?h[h.length-1].v:null;};
    const avg=months.map(mo=>{const v=rows.map(r=>at(r,mo)).filter(x=>x!=null);
      return v.length?+(v.reduce((s,x)=>s+x,0)/v.length).toFixed(2):null;});
    const gains=rows.map(r=>({a:r.a,g:tdGain(r.s,m.dir),first:r.s[0],last:r.s[r.s.length-1]}))
      .filter(x=>x.g!=null).sort((x,y)=>y.g-x.g);
    return{rows,months,at,avg,gains};
  },[athletes,m]);

  /* Her metrikte gelişen sporcuların oranı (en az iki ölçümü olanlar arasında). */
  const radar=useMemo(()=>metrics.map(x=>{
    const gs=athletes.map(a=>tdGain(tdSeries(a,x),x.dir)).filter(g=>g!=null);
    return{m:x,n:gs.length,pct:gs.length?Math.round(gs.filter(g=>g>0).length/gs.length*100):null};
  }).filter(r=>r.n>0),[metrics,athletes]);

  const totalTests=athletes.reduce((s,a)=>s+(a.tests||[]).filter(t=>t.date).length,0);
  const multi=athletes.filter(a=>(a.tests||[]).filter(t=>t.date).length>1).length;
  const unit=m&&m.u?` ${m.u}`:'';
  const monLbl=mo=>{const[y,mm]=mo.split('-');return`${MN[Number(mm)-1]} ${y.slice(2)}`;};
  const avgGain=view&&view.gains.length?+(view.gains.reduce((s,x)=>s+x.g,0)/view.gains.length).toFixed(1):null;
  const top=view&&view.gains[0];
  const sign=v=>v==null?'—':`${v>0?'+':''}${v}%`;

  const theme=useAppTheme();
  const grid='rgba(255,255,255,.07)',tick='rgba(255,255,255,.55)';
  // datalabels are drawn as given in both themes (ChartC leaves them alone), so they pick their own colour.
  const dlC=theme==='light'?'#334155':'rgba(255,255,255,.8)';
  const lineData=view&&{labels:view.months.map(monLbl),datasets:[
    {label:Lx('Takım ortalaması','Team average'),data:view.avg,borderColor:'#38bdf8',borderWidth:3.5,pointRadius:4,
      pointBackgroundColor:'#38bdf8',pointBorderColor:'#0b1220',pointBorderWidth:2,tension:.35,spanGaps:true,fill:true,
      backgroundColor:vGrad('rgba(56,189,248,.32)','rgba(56,189,248,0)'),order:0},
    ...view.rows.map(r=>{const on=focus===r.a.id,dim=focus&&!on;const c=colorOf(r.a.id);
      return{label:r.a.name||'—',data:view.months.map(mo=>view.at(r,mo)),borderColor:dim?c+'26':(on?c:c+'8c'),
        borderWidth:on?3:1.4,pointRadius:on?4:2,pointBackgroundColor:c,tension:.3,spanGaps:true,fill:false,order:on?-1:1};})]};
  const lineOpts={responsive:true,maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},
    animation:{duration:900,easing:'easeOutQuart'},
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y}${unit}`}}},
    scales:{x:{grid:{color:grid},ticks:{color:tick}},
      y:{reverse:false,grid:{color:grid},ticks:{color:tick},title:{display:true,text:`${cmpLabel(m||TD_FMS)}${unit}`,color:tick}}}};
  const barData=view&&{labels:view.gains.map(x=>x.a.name||'—'),datasets:[{data:view.gains.map(x=>x.g),
    backgroundColor:view.gains.map(x=>x.a.id===focus?(x.g>=0?'#34d399':'#f87171'):(x.g>=0?'rgba(52,211,153,.55)':'rgba(248,113,113,.55)')),
    borderColor:view.gains.map(x=>x.g>=0?'#34d399':'#f87171'),borderWidth:1,borderRadius:6,barThickness:16}]};
  const barOpts={indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:{duration:900,easing:'easeOutQuart'},
    onClick:(e,els)=>{if(els&&els[0]&&view){const a=view.gains[els[0].index].a;setFocus(f=>f===a.id?null:a.id);}},
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const x=view.gains[c.dataIndex];
      return`${sign(x.g)} · ${cmpFmt(x.first.v)} → ${cmpFmt(x.last.v)}${unit}`;}}},
      datalabels:{display:true,anchor:'end',align:c=>c.dataset.data[c.dataIndex]>=0?'right':'left',color:dlC,
        font:{weight:'700',size:11},formatter:v=>sign(v)}},
    layout:{padding:{right:46,left:8}},
    scales:{x:{grid:{color:grid},ticks:{color:tick,callback:v=>v+'%'}},y:{grid:{display:false},ticks:{color:'rgba(255,255,255,.8)'}}}};
  const radarData={labels:radar.map(r=>cmpShort(r.m)),datasets:[{label:Lx('Gelişen sporcu oranı','Share improving'),
    data:radar.map(r=>r.pct),backgroundColor:'rgba(167,139,250,.25)',borderColor:'#a78bfa',borderWidth:2,
    pointBackgroundColor:radar.map(r=>m&&r.m.id===m.id?'#f472b6':'#a78bfa'),pointRadius:radar.map(r=>m&&r.m.id===m.id?6:3)}]};
  const radarOpts={responsive:true,maintainAspectRatio:false,animation:{duration:900},
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const r=radar[c.dataIndex];return`%${r.pct} · ${r.n} ${Lx('sporcu','athletes')}`;}}}},
    scales:{r:{min:0,max:100,angleLines:{color:grid},grid:{color:grid},pointLabels:{color:'rgba(255,255,255,.75)',font:{size:11}},
      ticks:{display:false,stepSize:25}}}};

  return(<div className="td-wrap">
    <div className="td-hero">
      <div className="td-hero-glow" aria-hidden="true"/>
      <div className="td-hero-tx">
        <div className="td-eyebrow">{Lx('Takım Verileri','Team Data')} · {setup.teamName}</div>
        <div className="td-hero-t">{Lx('Sporcuların gelişimi, test test','How the squad is developing, test by test')}</div>
      </div>
      <div className="td-kpis">
        <div className="td-kpi"><div className="td-kpi-v">{totalTests}</div><div className="td-kpi-l">{Lx('Test kaydı','Test records')}</div></div>
        <div className="td-kpi"><div className="td-kpi-v">{multi}</div><div className="td-kpi-l">{Lx('2+ testi olan sporcu','Athletes with 2+ tests')}</div></div>
        <div className="td-kpi"><div className={'td-kpi-v'+(avgGain>0?' up':avgGain<0?' dn':'')}>{sign(avgGain)}</div><div className="td-kpi-l">{Lx('Ort. gelişim','Avg. change')}{m?` · ${cmpShort(m)}`:''}</div></div>
        <div className="td-kpi"><div className="td-kpi-v sm">{top&&top.g>0?top.a.name:'—'}</div><div className="td-kpi-l">{Lx('En çok gelişen','Most improved')}{top&&top.g>0?` · ${sign(top.g)}`:''}</div></div>
      </div>
    </div>

    {metrics.length===0&&<div className="empty-st">{Lx('Grafik için tarihli test sonucu yok. Bir sporcuya test girince burada görünür.','No dated test results to chart yet. They show here once tests are entered.')}</div>}

    {m&&view&&<>
      <div className="td-chips">
        {metrics.map(x=><button key={x.id} type="button" className={'td-chip'+(x.id===m.id?' on':'')} onClick={()=>setMid(x.id)}>
          {cmpLabel(x)}</button>)}
      </div>

      <div className="td-grid">
        <div className="td-card td-span2">
          <div className="td-card-hd"><span className="td-card-t">{Lx('Gelişim eğrisi','Development curve')}</span>
            <span className="td-card-s">{cmpLabel(m)}{unit} · {m.dir==='lo'?Lx('düşük daha iyi','lower is better'):Lx('yüksek daha iyi','higher is better')}</span></div>
          <div className="td-chart tall">{view.months.length>0&&<ChartC type="line" chartData={lineData} options={lineOpts}/>}</div>
          <div className="td-ath">
            {view.rows.map(r=><button key={r.a.id} type="button" className={'td-ath-b'+(focus===r.a.id?' on':'')}
              onClick={()=>setFocus(f=>f===r.a.id?null:r.a.id)}>
              <i style={{background:colorOf(r.a.id)}}/>{r.a.name||'—'}</button>)}
          </div>
        </div>
        <div className="td-card">
          <div className="td-card-hd"><span className="td-card-t">{Lx('Gelişim sıralaması','Improvement ranking')}</span>
            <span className="td-card-s">{Lx('ilk → son test','first → latest test')}</span></div>
          {view.gains.length===0
            ?<div className="td-empty">{Lx('Bu metrikte iki testi olan sporcu yok.','No athlete has two tests in this metric.')}</div>
            :<div className="td-chart" style={{height:Math.max(220,view.gains.length*30+40)}}><ChartC type="bar" chartData={barData} options={barOpts}/></div>}
        </div>
        <div className="td-card">
          <div className="td-card-hd"><span className="td-card-t">{Lx('Gelişim haritası','Development map')}</span>
            <span className="td-card-s">{Lx('her metrikte gelişen sporcuların oranı','share of athletes improving per metric')}</span></div>
          {radar.length<3
            ?<div className="td-empty">{Lx('Harita için en az üç metrikte iki test gerekir.','The map needs two tests in at least three metrics.')}</div>
            :<div className="td-chart" style={{height:320}}><ChartC type="radar" chartData={radarData} options={radarOpts}/></div>}
        </div>
      </div>
    </>}

    <div className="td-cmp">
      <button type="button" className="td-cmp-tg" onClick={()=>setShowCmp(v=>!v)}>
        {showCmp?'▾':'▸'} {Lx('Sporcuları karşılaştır (tablo)','Compare athletes (table)')}</button>
      {showCmp&&<CompareAthletes athletes={athletes} setup={setup} customTests={customTests} Lx={Lx}/>}
    </div>
  </div>);
}
