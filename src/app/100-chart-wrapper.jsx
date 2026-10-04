/* =========================================================
   CHART WRAPPER
   ========================================================= */
// Register datalabels plugin globally with display:false default —
// individual charts opt-in via plugins.datalabels.display = true
if(window.Chart&&window.ChartDataLabels){
  try{
    window.Chart.register(window.ChartDataLabels);
    window.Chart.defaults.set('plugins.datalabels',{display:false});
    // Match the site typeface for all canvas-drawn chart text (axes, labels, legend).
    window.Chart.defaults.font.family="'Archivo','Space Grotesk','Inter','Segoe UI',system-ui,sans-serif";
    window.Chart.defaults.font.style='normal';
  }catch(e){console.warn('datalabels register failed:',e);}
}
/* Açık tema: grafik seçenekleri koyu tema için yazıldı (eksen/legend yazısı açık gri,
   ızgara yarı saydam beyaz). Her grafiği tek tek değiştirmek yerine burada, yalnızca açık
   temada, `color` anahtarlarındaki açık renkler koyu karşılığına çevrilir. Veri renkleri ve
   datalabels (renkli çubuk üstündeki beyaz yazı) dokunulmaz; koyu temada seçenekler aynen geçer. */
function chartLightColor(v){
  if(typeof v!=='string')return v;
  const w=v.match(/^rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if(w)return w[1]!=null?`rgba(15,23,42,${w[1]})`:'#334155';
  const h=v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if(h){let x=h[1];if(x.length===3)x=x.split('').map(c=>c+c).join('');
    const[r,g,b]=[0,2,4].map(k=>parseInt(x.slice(k,k+2),16)/255);
    if(0.2126*r+0.7152*g+0.0722*b>0.78)return'#334155';}
  if(/^white$/i.test(v))return'#334155';
  return v;
}
function chartLightOpts(o,key){
  if(Array.isArray(o))return o.map(x=>chartLightOpts(x));
  if(!o||typeof o!=='object'||Object.getPrototypeOf(o)!==Object.prototype)return key==='color'?chartLightColor(o):o;
  const out={};
  for(const k in o)out[k]=k==='datalabels'?o[k]:chartLightOpts(o[k],k);
  return out;
}
function ChartC({type,chartData,options,plugins}){
  const ref=useRef(null),inst=useRef(null);
  const theme=useAppTheme();
  useEffect(()=>{try{if(inst.current)inst.current.destroy();if(!ref.current||!window.Chart)return;
    const opts=theme==='light'&&options?chartLightOpts(options):options;
    inst.current=new window.Chart(ref.current,{type,data:chartData,options:opts,plugins:plugins||[]});}catch(e){console.error(e);}
    // A canvas can be created while its container is still 0-sized (tab switch,
    // panel remount, a section that was just shown) → Chart.js renders blank until
    // the next window resize. Nudge a resize on the next frames AND observe the
    // container so the chart always draws at the real size.
    const fix=()=>{try{inst.current&&inst.current.resize();}catch{}};
    requestAnimationFrame(fix);const t1=setTimeout(fix,120),t2=setTimeout(fix,400);
    let ro;const host=ref.current&&ref.current.parentNode;
    if(host&&window.ResizeObserver){ro=new ResizeObserver(fix);try{ro.observe(host);}catch{}}
    return()=>{clearTimeout(t1);clearTimeout(t2);try{ro&&ro.disconnect();}catch{}try{inst.current?.destroy();}catch{}};
  },[type,theme,JSON.stringify(chartData),JSON.stringify(options)]);
  return <canvas ref={ref}/>;
}

/* Scriptable vertical gradient for Chart.js fills (bottom→top). Returns a solid
   fallback until the chart area exists. Makes bars/areas feel less flat. */
function vGrad(topColor,bottomColor){
  return ctx=>{const ch=ctx.chart,a=ch.chartArea;if(!a)return topColor;
    const g=ch.ctx.createLinearGradient(0,a.bottom,0,a.top);
    g.addColorStop(0,bottomColor);g.addColorStop(1,topColor);return g;};
}
/* Frosted-glass bar fill: translucent top→bottom gradient of an rgb colour, so the
   dark background shows through for an iOS-glass look. `boost` brightens on hover. */
/* Frosted-glass vertical gradient fill for chart bars: a bright glassy top fading to a
   translucent base so the ambient background shows through. `boost` brightens on hover. */
function glassBar(r,g,b,boost=0){
  // Flat translucent fill (no top→bottom gradient) so each bar reads as a single
  // clean colour. `boost` brightens slightly on hover.
  const a=Math.min(1,.34+boost);
  return`rgba(${r},${g},${b},${a})`;
}
/* THE FOSTER BANDS, DRAWN RATHER THAN DESCRIBED. Monotony is read against four fixed
   zones — under 1.0 varied, 1.0–1.5 normal, 1.5–2.0 rising, over 2.0 high — and a bar
   chart with no bands makes the coach carry those numbers in their head and compare them
   to a y-axis tick. Painted behind the bars, a week's zone is the colour it stands in.
   Scoped: pass `plugins={[monoZones]}` to the chart that wants it. */
const monoZones={
  id:'monoZones',
  beforeDatasetsDraw(chart){
    const a=chart.chartArea,y=chart.scales&&chart.scales.y;
    if(!a||!y)return;
    const bands=[[0,1,'rgba(59,130,246,.11)'],[1,1.5,'rgba(45,212,167,.11)'],
      [1.5,2,'rgba(245,158,11,.11)'],[2,1e6,'rgba(244,63,94,.13)']];
    const ctx=chart.ctx;ctx.save();
    bands.forEach(([lo,hi,col])=>{
      const top=y.getPixelForValue(Math.min(hi,y.max)),bot=y.getPixelForValue(Math.max(lo,y.min));
      if(!(bot>top))return;
      ctx.fillStyle=col;ctx.fillRect(a.left,top,a.right-a.left,bot-top);
    });
    ctx.restore();
  }
};
/* Soft neon halo behind each glass bar — gives depth & a stylish frosted glow.
   Scoped: pass `plugins={[barGlow]}` to the chart that wants it. */
const barGlow={
  id:'barGlow',
  beforeDatasetDraw(chart,args){
    const ds=chart.data.datasets[args.index];if(!ds)return;
    const ctx=chart.ctx;ctx.save();
    const bc=ds.borderColor;
    ctx.shadowColor=(typeof bc==='string'&&bc!=='transparent')?bc:(typeof ds.backgroundColor==='string'?ds.backgroundColor:'rgba(34,211,238,.6)');
    ctx.shadowBlur=12;ctx.shadowOffsetX=0;ctx.shadowOffsetY=2;
  },
  afterDatasetDraw(chart){chart.ctx.restore();}
};
/* Fully-rounded, gapped stacked bars — Chart.js won't round the inner corners of
   stacked segments, so we draw the bars ourselves. Datasets keep a transparent fill
   (Chart.js still computes geometry for labels/tooltips) and a `solidColor` we paint.
   Runs in beforeDatasetsDraw so the value labels still render on top. */
function roundRectPath(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
const roundBars={
  id:'roundBars',
  beforeDatasetsDraw(chart){
    const ctx=chart.ctx;const GAP=4,R=9;
    chart.data.datasets.forEach((ds,di)=>{
      const meta=chart.getDatasetMeta(di);
      if(!meta||meta.hidden||!ds.solidColor)return;
      const active=new Set((chart.getActiveElements()||[]).filter(a=>a.datasetIndex===di).map(a=>a.index));
      (meta.data||[]).forEach((bar,i)=>{
        const v=Number(ds.data[i])||0;if(v<=0)return;
        const p=bar.getProps(['x','y','base','width'],true);
        const w=p.width;const x=p.x-w/2;
        let top=Math.min(p.y,p.base);const bot=Math.max(p.y,p.base);
        top+=GAP;const h=bot-top;if(h<=1)return;
        ctx.save();
        ctx.fillStyle=active.has(i)&&ds.hoverSolidColor?ds.hoverSolidColor:ds.solidColor;
        roundRectPath(ctx,x,top,w,h,R);
        ctx.fill();
        ctx.restore();
      });
    });
  }
};

/* Dependency-free weekly chart (inline SVG). Measures its own container and
   draws at exact pixel size, so unlike the Chart.js canvas it can never end up
   blank from a 0-size/timing race. Used by the Wellness History card. */
function WeekChartSVG({data,avg,color,dot,unit,labels}){
  const wrapRef=useRef(null);
  const[sz,setSz]=useState({w:640,h:240});
  useEffect(()=>{const el=wrapRef.current;if(!el)return;
    const m=()=>setSz({w:Math.max(120,el.clientWidth),h:Math.max(120,el.clientHeight)});
    m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);try{ro.observe(el);}catch{}}
    window.addEventListener('resize',m);
    return()=>{window.removeEventListener('resize',m);try{ro&&ro.disconnect();}catch{}};
  },[]);
  const{w,h}=sz;
  const has=data.some(v=>v!=null);
  const padL=34,padR=16,padT=16,padB=24;
  const plotW=Math.max(1,w-padL-padR),plotH=Math.max(1,h-padT-padB),n=data.length;
  const xOf=i=>padL+(n<=1?plotW/2:i*(plotW/(n-1)));
  const five=unit==='/5';
  const vals=data.filter(v=>v!=null);
  let lo,hi;
  if(five){lo=1;hi=5;}
  else if(vals.length){const mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max(1,Math.round((mx-mn)*0.15));lo=Math.floor(mn-pad);hi=Math.ceil(mx+pad);if(lo>=hi){lo-=1;hi+=1;}}
  else{lo=0;hi=1;}
  const yOf=v=>padT+(1-(v-lo)/((hi-lo)||1))*plotH;
  const ticks=five?[1,2,3,4,5]:[...new Set(Array.from({length:5},(_,k)=>Math.round(lo+((hi-lo)/4)*k)))];
  const pts=data.map((v,i)=>v==null?null:{x:xOf(i),y:yOf(v),v,i}).filter(Boolean);
  const line=pts.map((p,k)=>(k?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  const base=(h-padB).toFixed(1);
  const area=pts.length>1?`M${pts[0].x.toFixed(1)} ${base} `+pts.map(p=>'L'+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')+` L${pts[pts.length-1].x.toFixed(1)} ${base} Z`:'';
  return <div ref={wrapRef} style={{width:'100%',height:'100%'}}>
    {!has
      ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--dim)',fontSize:13}}>{L('Bu hafta için veri yok','No data for this week')}</div>
      :<svg width={w} height={h} style={{display:'block'}}>
        {ticks.map((t,k)=><g key={'t'+k}>
          <line x1={padL} y1={yOf(t)} x2={w-padR} y2={yOf(t)} stroke="rgba(255,255,255,.05)"/>
          <text x={padL-8} y={yOf(t)+3} textAnchor="end" fill="#74808f" fontFamily="IBM Plex Mono" fontSize="10">{t}</text>
        </g>)}
        {labels.map((lb,i)=><text key={'x'+i} x={xOf(i)} y={h-8} textAnchor="middle" fill="#74808f" fontFamily="IBM Plex Mono" fontSize="10">{lb}</text>)}
        {area&&<path d={area} fill={color} opacity="0.15"/>}
        {avg!=null&&<line x1={padL} y1={yOf(avg)} x2={w-padR} y2={yOf(avg)} stroke={dot} strokeWidth="1.5" strokeDasharray="5 4"/>}
        {line&&<path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
        {pts.map((p,k)=>{
          const vt=five?(Number.isInteger(p.v)?String(p.v):p.v.toFixed(1)):String(Math.round(p.v));
          const ly=p.y-10<padT+4?p.y+17:p.y-10; // flip below the point when too close to the top
          return<g key={'p'+k}>
            <circle cx={p.x} cy={p.y} r="4" fill={dot} stroke="#0d0f13" strokeWidth="1.5"><title>{(labels[p.i]||'')+': '+p.v+(five?'/5':' '+unit)}</title></circle>
            <text x={p.x} y={ly} textAnchor="middle" fill="#e6e9ee" fontFamily="IBM Plex Mono" fontSize="11" fontWeight="bold">{vt}</text>
          </g>;
        })}
      </svg>}
  </div>;
}

/* Compact wellness sparkline (inline SVG). Plots one metric across all check-ins
   with an area fill, a faint dashed average line, an emphasised latest point and
   a value label above every point. Measures its own width so it never goes blank. */
function SparkSVG({id,data,color,avg,unit,showValues,valueColor}){
  const wrapRef=useRef(null);
  const[w,setW]=useState(600);
  useEffect(()=>{const el=wrapRef.current;if(!el)return;
    const m=()=>setW(Math.max(80,el.clientWidth));m();
    let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);try{ro.observe(el);}catch{}}
    window.addEventListener('resize',m);
    return()=>{window.removeEventListener('resize',m);try{ro&&ro.disconnect();}catch{}};
  },[]);
  const h=62,padX=12,padT=18,padB=10,five=unit==='/5';
  const fmt=v=>five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v));
  const present=data.map((v,i)=>({v,i})).filter(p=>p.v!=null);
  if(!present.length)return <div ref={wrapRef} style={{width:'100%',height:h,display:'flex',alignItems:'center',color:'var(--dim)',fontSize:12}}>—</div>;
  const vals=present.map(p=>p.v);
  let lo=Math.min(...vals),hi=Math.max(...vals);
  if(lo===hi){lo-=1;hi+=1;}else{const pd=(hi-lo)*0.3;lo-=pd;hi+=pd;}
  const n=data.length;
  const xOf=i=>padX+(n<=1?(w-2*padX)/2:i*((w-2*padX)/(n-1)));
  const yOf=v=>padT+(1-(v-lo)/((hi-lo)||1))*(h-padT-padB);
  const P=present.map(p=>({x:xOf(p.i),y:yOf(p.v),v:p.v}));
  const line=P.map((p,k)=>(k?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  const base=(h-padB).toFixed(1);
  const area=P.length>1?`M${P[0].x.toFixed(1)} ${base} `+P.map(p=>'L'+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')+` L${P[P.length-1].x.toFixed(1)} ${base} Z`:'';
  return <div ref={wrapRef} style={{width:'100%',height:h}}>
    <svg width={w} height={h} style={{display:'block'}}>
      <defs><linearGradient id={'wlg-'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.33"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {avg!=null&&<line x1={padX} y1={yOf(avg)} x2={w-padX} y2={yOf(avg)} stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 4"/>}
      {area&&<path d={area} fill={'url(#wlg-'+id+')'}/>}
      {line&&<path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
      {P.map((p,k)=><circle key={k} cx={p.x} cy={p.y} r={k===P.length-1?3.4:2} fill={valueColor?valueColor(p.v):color}/>)}
      {showValues&&P.map((p,k)=>{const ly=p.y-7<padT-4?p.y+13:p.y-7;return<text key={'v'+k} x={p.x} y={ly} textAnchor="middle" fill={valueColor?valueColor(p.v):'#cdd3dc'} fontFamily="IBM Plex Mono" fontSize="9.5" fontWeight="700">{fmt(p.v)}</text>;})}
    </svg>
  </div>;
}

/* Build one report section (compact CSS bar chart of column team totals +
   athlete x column matrix with per-athlete totals, column totals and grand
   total). Returns an HTML string. `perAthlete` = [{name,data:[...]}]. */
function _loadSectionHTML(title,subtitle,colLabels,perAthlete,accent){
  const nf=v=>Number(v||0).toLocaleString('tr-TR');
  const sorted=[...(perAthlete||[])].map(a=>({name:a.name,data:a.data||[],total:(a.data||[]).reduce((x,y)=>x+(y||0),0)})).sort((a,b)=>b.total-a.total);
  const colTotals=colLabels.map((_,i)=>sorted.reduce((s,a)=>s+(a.data[i]||0),0));
  const grand=colTotals.reduce((a,b)=>a+b,0);
  const maxCol=Math.max(1,...colTotals);
  const bars=colLabels.map((lab,i)=>{
    const h=Math.round((colTotals[i]/maxCol)*88);
    return `<div class="bc"><div class="bgraph"><div class="bv">${colTotals[i]?nf(colTotals[i]):''}</div><div class="bar" style="height:${Math.max(2,h)}px"></div></div><div class="bl">${lab}</div></div>`;
  }).join('');
  const head=`<tr><th class="ath"># ${L('Sporcu','Athlete')}</th>${colLabels.map(l=>`<th>${l}</th>`).join('')}<th class="tot">${L('Top','Tot')}</th></tr>`;
  const rows=sorted.length?sorted.map((a,ri)=>`<tr><td class="ath">${ri+1}. ${a.name}</td>${a.data.map(v=>`<td>${v?nf(v):'<span class=z>·</span>'}</td>`).join('')}<td class="tot">${nf(a.total)}</td></tr>`).join('')
    :`<tr><td class="ath">—</td>${colLabels.map(()=>'<td>·</td>').join('')}<td class="tot">0</td></tr>`;
  const foot=`<tr class="tr2"><td class="ath">${L('TAKIM TOPLAMI','TEAM TOTAL')}</td>${colTotals.map(v=>`<td>${nf(v)}</td>`).join('')}<td class="tot grand">${nf(grand)}</td></tr>`;
  return `<div class="sec">
    <div class="sh"><span class="dot"></span><span class="st">${title}</span><span class="ssub">${subtitle}</span></div>
    <div class="chart">${bars}</div>
    <table><thead>${head}</thead><tbody>${rows}${foot}</tbody></table>
  </div>`;
}
/* Build a Turkish monthly team report (A4 landscape, multi-section):
   summary metrics + Weekly Load Distribution + Daily Team Load + ACWR +
   Weekly Monotony + Training Purpose Distribution. */
/* Turkish single-week team report (A4 landscape) — mirrors monthly but
   scoped to one Archivoy-anchored week (per-day team load + athlete x day
   matrix + week ACWR/monotony/strain + week purpose distribution). */
function printWeeklyReportTR(R){
  const w=window.open('','_blank','width=1280,height=920');
  if(!w){alert('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.');return;}
  const nf=v=>Number(v||0).toLocaleString('tr-TR');
  const PCOL=['#06b6d4','#8b5cf6','#f97316','#ec4899','#10b981','#f59e0b','#ef4444','#22d3ee','#a855f7','#84cc16','#f43f5e'];
  const acwrTR=REPORT_LANG==='tr'?({'High risk':'Yüksek risk','Optimal':'Optimal','Undertraining':'Düşük yük','Caution':'Dikkat','No data':'Veri yok'}[R.acwrZone.t]||R.acwrZone.t):R.acwrZone.t;
  const monoTR=m=>!m?'—':m>2?L('Yüksek','High'):m>=1.5?L('İzle','Watch'):m>=1?L('Normal','Normal'):L('Düşük','Low');
  // Daily team-load chart — colored session pills on top, value, bar, day label
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const SC={
    strength:{c:'#9aab3a',g:'rgba(154,171,58,.4)'},
    practice:{c:'#5b8cff',g:'rgba(91,140,255,.4)'},
    speed:{c:'#a855f7',g:'rgba(168,85,247,.4)'},
    recovery:{c:'#46d6a0',g:'rgba(70,214,160,.4)'},
    match:{c:'#ff6b5b',g:'rgba(255,107,91,.4)'},
    endurance:{c:'#22d3ee',g:'rgba(34,211,238,.4)'},
  };
  const maxDay=Math.max(1,...R.dayTotals);
  const dailyBars=R.dailyLabels.map((lab,i)=>{
    const h=Math.round((R.dayTotals[i]/maxDay)*64);
    const wks=(R.daySessions&&R.daySessions[i])||[];
    const wkHtml=wks.slice(0,3).map(s=>{
      const col=SC[s.type]||SC.practice;
      const meta=[s.duration?s.duration+'min':null,s.au?nf(s.au)+' AU':null].filter(Boolean).join(' · ');
      return `<div class="wkchip" style="border-left-color:${col.c};background:${col.c}14"><div class="wn">${esc(s.name)}</div>${meta?`<div class="wm">${esc(meta)}</div>`:''}</div>`;
    }).join('');
    return `<div class="bc"><div class="bworks-top">${wkHtml}</div><div class="bgraph"><div class="bv">${R.dayTotals[i]?nf(R.dayTotals[i]):''}</div><div class="bar" style="height:${Math.max(2,h)}px"></div></div><div class="bl">${lab}</div></div>`;
  }).join('');
  const dailySec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Günlük Takım Yükü (AU)','Daily Team Load (AU)')}</span><span class="ssub">${R.weekLabel}</span></div><div class="chart tall">${dailyBars}</div></div>`;
  // Per-athlete x day matrix (allows in-page break)
  const matrixSec=_loadSectionHTML(L('Sporcu × Gün Yük Dağılımı (AU)','Athlete × Day Load (AU)'),L('Yüke göre sıralı','Sorted by load'),R.dailyLabels,R.perAthlete,'#9aab3a').replace('class="sec"','class="sec matrix-sec"');
  // Week ACWR / Monotony summary card
  const summary=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Haftalık Özet','Weekly Summary')}</span><span class="ssub">${R.weekLabel}</span></div>
    <table><thead><tr><th class="ath">${L('Gösterge','Metric')}</th><th>${L('Değer','Value')}</th><th>${L('Durum / Açıklama','Status / Note')}</th></tr></thead><tbody>
      <tr><td class="ath">${L('ACWR (hafta sonu)','ACWR (week end)')}</td><td>${R.acwr?R.acwr.toFixed(2):'—'}</td><td>${acwrTR} · ${L('Güvenli aralık','Safe band')} 0.8–1.3</td></tr>
      <tr><td class="ath">${L('Haftalık Toplam Yük','Weekly Total Load')}</td><td>${nf(Math.round(R.weekTotal))}</td><td>${L('AU (takım)','AU (team)')}</td></tr>
      <tr><td class="ath">${L('Ortalama Günlük Yük','Mean Daily Load')}</td><td>${nf(Math.round(R.weekMean))}</td><td>AU</td></tr>
      <tr><td class="ath">${L('Standart Sapma','Standard Deviation')}</td><td>${R.weekSD.toFixed(1)}</td><td>${L('Günler arası dağılım','Day-to-day spread')}</td></tr>
      <tr><td class="ath">${L('Monotoni','Monotony')}</td><td>${R.weekMono.toFixed(2)}</td><td>${monoTR(R.weekMono)} ${L('(Ortalama ÷ SS)','(Mean ÷ SD)')}</td></tr>
      <tr><td class="ath">${L('Zorlanma','Strain')}</td><td>${nf(Math.round(R.weekStrain))}</td><td>${L('Toplam × Monotoni','Total × Monotony')}</td></tr>
      <tr><td class="ath">${L('Antrenman Günü','Training Days')}</td><td>${R.trainDays}</td><td>${L('yük > 0 olan günler','days with load > 0')}</td></tr>
    </tbody></table>
    <div class="note">${L('<b>ACWR</b> = son 7 günün toplam takım yükü ÷ son 28 günün haftalık ortalaması. Güvenli aralık 0.8–1.3, &gt;1.5 yüksek yaralanma riski. <b>Monotoni</b>: hafta içi yük çeşitliliği — 1.0–1.5 normal, &gt;2.0 yüksek.','<b>ACWR</b> = total team load of the last 7 days ÷ the weekly average of the last 28 days. Safe band 0.8–1.3, &gt;1.5 high injury risk. <b>Monotony</b>: within-week load variety — 1.0–1.5 normal, &gt;2.0 high.')}</div></div>`;
  // Purpose mix
  const pRows=R.pMix.length?R.pMix.map((p,i)=>`<tr><td class="ath"><span class="sw" style="background:${PCOL[i%PCOL.length]}"></span>${p.label}</td><td>${nf(p.min)}</td><td>${p.pct.toFixed(1)}%</td><td><div class="pbar"><div style="width:${Math.round(p.pct)}%;background:${PCOL[i%PCOL.length]}"></div></div></td></tr>`).join(''):`<tr><td class="ath">${L('Veri yok','No data')}</td><td>0</td><td>0%</td><td></td></tr>`;
  const purposeSec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Antrenman Türü Dağılımı','Training Purpose Distribution')}</span><span class="ssub">${L('Dakika bazında','By minutes')}</span></div>
    <table class="pt"><thead><tr><th class="ath">${L('Tür','Purpose')}</th><th>${L('Dakika','Minutes')}</th><th>%</th><th>${L('Dağılım','Distribution')}</th></tr></thead><tbody>${pRows}</tbody></table></div>`;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L('Haftalık Antrenman Raporu','Weekly Training Report')} — ${R.teamName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--ac:#9aab3a;--accent:#9aab3a;--ink:#0a0b0d;--bg2:#f4f5f7;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10px;background:#fff}
.mono{font-family:'IBM Plex Mono',monospace}
.hd{display:flex;justify-content:space-between;align-items:center;background:#0a0b0d;color:#fff;border-radius:12px;padding:14px 18px;margin-bottom:14px}
.hd .hd-l{display:flex;align-items:center;gap:14px;min-width:0}
.hd .hd-logo{height:26px;width:auto;flex:none}
.hd h1{font-size:20px;font-weight:700;line-height:1.05;letter-spacing:-.01em}
.hd .tm{font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,.7);font-weight:500;margin-top:4px;letter-spacing:.04em}
.hd .rng{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:5px 14px;border-radius:7px;white-space:nowrap;letter-spacing:.04em}
.sec{border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-bottom:12px;page-break-inside:avoid;break-inside:avoid;background:#fff}
.matrix-sec.sec{page-break-before:always;break-before:page;page-break-inside:auto;break-inside:auto}
.matrix-sec tbody tr{page-break-inside:avoid;break-inside:avoid}
.matrix-sec thead{display:table-header-group}
.sh{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--bg2);border-bottom:1px solid var(--border)}
.sh .dot{width:3px;height:15px;border-radius:2px;background:var(--accent)}
.sh .st{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:var(--text);text-transform:uppercase;letter-spacing:.06em}
.sh .ssub{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);background:transparent;border:1px solid var(--border);padding:3px 10px;border-radius:6px;font-weight:500;white-space:nowrap;letter-spacing:.04em}
.chart{display:flex;align-items:stretch;gap:5px;height:108px;padding:10px 10px 0}
.chart.tall{height:220px;align-items:stretch}
.bc{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;min-width:0}
.bworks-top{flex:0 0 auto;display:flex;flex-direction:column;gap:4px;align-self:stretch;padding:0 1px;margin-bottom:6px;min-height:30px}
.wkchip{background:#fff;border:1px solid var(--border);border-left-width:3px;border-radius:7px;padding:5px 8px;color:var(--text);text-align:left;font-weight:600;word-break:break-word;hyphens:auto;-webkit-hyphens:auto;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.wkchip .wn{font-size:9px;font-weight:600;color:var(--text);line-height:1.25}
.wkchip .wm{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:500;color:var(--muted);line-height:1.2;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bgraph{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;align-self:stretch;min-height:30px}
.bar{width:74%;max-width:46px;border-radius:4px 4px 0 0;background:var(--accent)}
.bv{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;margin-bottom:3px;color:var(--text);white-space:nowrap}
.bl{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--dim);margin-top:6px;text-align:center;font-weight:500;line-height:1.1;flex:0 0 auto}
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;padding:8px 4px;text-transform:uppercase;letter-spacing:.06em;text-align:center}
th.ath,td.ath{text-align:left;width:34%;padding-left:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{padding:7px 4px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;border-top:1px solid var(--border);font-weight:500;color:var(--text)}
td.ath{font-family:'Space Grotesk',Arial,sans-serif;font-weight:600}
tbody tr:nth-child(even) td{background:var(--bg2)}
td.tot,th.tot{font-weight:600;color:var(--text);background:rgba(154,171,58,.12)}
.z{color:var(--dim)}
.tr2 td{background:#0a0b0d!important;color:#fff;font-weight:600;border-top:2px solid var(--accent)}
.tr2 td.grand{background:var(--accent)!important;color:#0a0b0d}
.note{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);padding:9px 13px;background:var(--bg2);border-top:1px solid var(--border);line-height:1.6}
.note b{color:var(--text);font-weight:600}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:middle}
.pt td.ath{width:42%}
.pbar{height:10px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;overflow:hidden}
.pbar>div{height:100%;border-radius:5px}
.ft{margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;letter-spacing:.04em}
.grid2{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;margin-bottom:12px;align-items:stretch}
.grid2.top2{grid-template-columns:1.15fr .85fr;page-break-after:avoid;break-after:avoid}
.grid2>.sec{margin-bottom:0;display:flex;flex-direction:column}
.grid2>.sec>table,.grid2>.sec>.note{flex:0 0 auto}
.grid2>.sec>.chart{flex:1 1 auto;min-height:130px;padding-bottom:14px;align-items:flex-end}
</style></head><body>
<div class="hd"><div class="hd-l"><img class="hd-logo" src="${COACHOS_LOGO}" alt="CoachOS"><div><h1>${L('Haftalık Antrenman Raporu','Weekly Training Report')}</h1><div class="tm">${R.teamName}</div></div></div><div class="rng">${R.weekLabel}</div></div>
<div class="grid2 top2">${dailySec}${summary}</div>
${purposeSec}
${matrixSec}
<div class="ft"><span>${L('AU = sRPE × dakika · Sporcular toplam yüke göre sıralıdır.','AU = sRPE × minutes · Athletes sorted by total load.')}</span><span>CoachOS · ${new Date().toLocaleDateString(REPORT_LANG==='tr'?'tr-TR':'en-GB')}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400);
}
function printMonthlyReportTR(R){
  const w=window.open('','_blank','width=1280,height=920');
  if(!w){alert('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.');return;}
  const nf=v=>Number(v||0).toLocaleString('tr-TR');
  const PCOL=['#06b6d4','#8b5cf6','#f97316','#ec4899','#10b981','#f59e0b','#ef4444','#22d3ee','#a855f7','#84cc16','#f43f5e'];
  const acwrTR=REPORT_LANG==='tr'?({'High risk':'Yüksek risk','Optimal':'Optimal','Undertraining':'Düşük yük','Caution':'Dikkat','No data':'Veri yok'}[R.acwrZone.t]||R.acwrZone.t):R.acwrZone.t;
  const zoneTR=v=>!v?'—':v>1.5?L('Yüksek risk','High risk'):(v>=0.8&&v<=1.3)?'Optimal':v<0.8?L('Düşük','Low'):L('Dikkat','Caution');
  const monoTR=m=>!m?'—':m>2?L('Yüksek','High'):m>=1.5?L('İzle','Watch'):m>=1?L('Normal','Normal'):L('Düşük','Low');

  const weeklySec=_loadSectionHTML(L('Haftalık Yük Dağılımı (AU)','Weekly Load Distribution (AU)'),L('Sporcu × Hafta · yüke göre sıralı','Athlete × Week · sorted by load'),R.weekly.colLabels,R.weekly.perAthlete,'#0891b2');

  const maxDay=Math.max(1,...R.monthDays.map(d=>d.val));
  const dailyBars=R.monthDays.map(d=>{const h=Math.round((d.val/maxDay)*118);return `<div class="bc"><div class="bv">${d.val?nf(d.val):''}</div><div class="bar" style="height:${Math.max(2,h)}px"></div><div class="bl">${d.lab}</div></div>`;}).join('');
  const dailySec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Günlük Takım Yükü (AU)','Daily Team Load (AU)')}</span><span class="ssub">${R.monthLabel}</span></div><div class="chart tall">${dailyBars}</div></div>`;

  const acwrRows=R.acwrWeekly.map(x=>`<tr><td class="ath">${x.label}</td><td>${x.acwr?x.acwr.toFixed(2):'—'}</td><td>${zoneTR(x.acwr)}</td></tr>`).join('')||`<tr><td class="ath">—</td><td>—</td><td>—</td></tr>`;
  const acwrSec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('ACWR — Akut:Kronik Yük Oranı','ACWR — Acute:Chronic Workload Ratio')}</span><span class="ssub">${R.acwr?R.acwr.toFixed(2):'—'} (${acwrTR})</span></div>
    <table><thead><tr><th class="ath">${L('Hafta','Week')}</th><th>ACWR</th><th>${L('Bölge','Zone')}</th></tr></thead><tbody>${acwrRows}</tbody></table>
    <div class="note">${L('<b>Akut</b> = son 7 günün toplam takım yükü · <b>Kronik</b> = son 28 günün haftalık ortalaması · <b>ACWR</b> = Akut ÷ Kronik. Güvenli aralık 0.8–1.3, &gt;1.5 yüksek yaralanma riski. Değerler her haftanın sonunda, takımın kayıtlı (sRPE) yükünden hesaplanır.','<b>Acute</b> = total team load of the last 7 days · <b>Chronic</b> = weekly average over the last 28 days · <b>ACWR</b> = Acute ÷ Chronic. Safe band 0.8–1.3, &gt;1.5 high injury risk. Computed at each week end from the logged (sRPE) team load.')}</div></div>`;

  const monoRows=R.mWeeks.map(w2=>`<tr><td class="ath">${fd(w2.wkStart).slice(0,5)}</td><td>${nf(Math.round(w2.total))}</td><td>${w2.mean.toFixed(0)}</td><td>${w2.sd.toFixed(1)}</td><td>${w2.monotony.toFixed(2)}</td><td>${nf(Math.round(w2.strain))}</td><td>${monoTR(w2.monotony)}</td></tr>`).join('');
  const monoSec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Haftalık Monotoni','Weekly Monotony')}</span><span class="ssub">${L('Ort.','Avg')} ${R.meanMono?R.meanMono.toFixed(2):'—'}</span></div>
    <table><thead><tr><th class="ath">${L('Hafta','Week')}</th><th>${L('Toplam','Total')}</th><th>${L('Ort.','Mean')}</th><th>${L('SS','SD')}</th><th>${L('Monotoni','Monotony')}</th><th>${L('Zorlanma','Strain')}</th><th>${L('Durum','Status')}</th></tr></thead><tbody>${monoRows}</tbody></table>
    <div class="note">${L('<b>Monotoni</b> = her sporcunun günlük yük ortalaması ÷ standart sapması (hafta içi), takım geneline göre ortalaması. Bantlar: 1.0 altı düşük (yükler oldukça değişken), 1.0–1.5 normal, 1.5–2.0 artmaya başlayan monotoni, 2.0 üstü yüksek — aşırı yüklenme ve hastalık/sakatlık riski artabilir. <b>Zorlanma</b> = Toplam × Monotoni.','<b>Monotony</b> = per-athlete mean daily load ÷ standard deviation (within the week), averaged across the squad. Bands: below 1.0 low (loads highly varied), 1.0–1.5 normal, 1.5–2.0 rising monotony, above 2.0 high — overload and illness/injury risk climbs. <b>Strain</b> = Total × Monotony.')}</div></div>`;

  const pRows=R.pMix.length?R.pMix.map((p,i)=>`<tr><td class="ath"><span class="sw" style="background:${PCOL[i%PCOL.length]}"></span>${p.label}</td><td>${nf(p.min)}</td><td>${p.pct.toFixed(1)}%</td><td><div class="pbar"><div style="width:${Math.round(p.pct)}%;background:${PCOL[i%PCOL.length]}"></div></div></td></tr>`).join(''):`<tr><td class="ath">${L('Veri yok','No data')}</td><td>0</td><td>0%</td><td></td></tr>`;
  const purposeSec=`<div class="sec"><div class="sh"><span class="dot"></span><span class="st">${L('Antrenman Türü Dağılımı','Training Purpose Distribution')}</span><span class="ssub">${L('Dakika bazında','By minutes')}</span></div>
    <table class="pt"><thead><tr><th class="ath">${L('Tür','Purpose')}</th><th>${L('Dakika','Minutes')}</th><th>%</th><th>${L('Dağılım','Distribution')}</th></tr></thead><tbody>${pRows}</tbody></table></div>`;

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L('Aylık Antrenman Raporu','Monthly Training Report')} — ${R.teamName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--ac:#9aab3a;--accent:#9aab3a;--bg2:#f4f5f7;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10px;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:center;background:#0a0b0d;color:#fff;border-radius:12px;padding:14px 18px;margin-bottom:14px}
.hd .hd-l{display:flex;align-items:center;gap:14px;min-width:0}
.hd .hd-logo{height:26px;width:auto;flex:none}
.hd h1{font-size:20px;font-weight:700;line-height:1.05;letter-spacing:-.01em}
.hd .tm{font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,.7);font-weight:500;margin-top:4px;letter-spacing:.04em}
.hd .rng{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:5px 14px;border-radius:7px;white-space:nowrap;letter-spacing:.04em}
.mt{display:flex;gap:10px;margin-bottom:16px}
.mc{flex:1;border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:10px;padding:11px 14px;background:#fff}
.mk{font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--dim);font-weight:500;letter-spacing:.06em}
.mv{font-size:23px;font-weight:700;color:var(--text);line-height:1.15;letter-spacing:-.01em}
.mh{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);font-weight:500}
.sec{border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid;background:#fff}
.sh{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--bg2);border-bottom:1px solid var(--border)}
.sh .dot{width:3px;height:15px;border-radius:2px;background:var(--accent)}
.sh .st{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:var(--text);text-transform:uppercase;letter-spacing:.06em}
.sh .ssub{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);background:transparent;border:1px solid var(--border);padding:3px 10px;border-radius:6px;font-weight:500;white-space:nowrap;letter-spacing:.04em}
.chart{display:flex;align-items:flex-end;gap:5px;height:128px;padding:10px 10px 0}
.chart.tall{height:158px}
.bc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.bar{width:72%;max-width:42px;border-radius:4px 4px 0 0;background:var(--accent)}
.bv{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;margin-bottom:2px;white-space:nowrap;color:var(--text)}
.bl{font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:var(--dim);margin-top:5px;text-align:center;font-weight:500;line-height:1.1}
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;padding:8px 4px;text-transform:uppercase;letter-spacing:.06em;text-align:center}
th.ath,td.ath{text-align:left;width:34%;padding-left:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{padding:7px 4px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;border-top:1px solid var(--border);font-weight:500;color:var(--text)}
td.ath{font-family:'Space Grotesk',Arial,sans-serif;font-weight:600}
tbody tr:nth-child(even) td{background:var(--bg2)}
td.tot,th.tot{font-weight:600;color:var(--text);background:rgba(154,171,58,.12)}
.z{color:var(--dim)}
.tr2 td{background:#0a0b0d!important;color:#fff;font-weight:600;border-top:2px solid var(--accent)}
.tr2 td.grand{background:var(--accent)!important;color:#0a0b0d}
.note{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);padding:9px 13px;background:var(--bg2);border-top:1px solid var(--border);line-height:1.6}
.note b{color:var(--text);font-weight:600}
.grid2{display:flex;gap:14px}
.grid2>.sec{flex:1;margin-bottom:0}
.gwrap{margin-bottom:14px}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:middle}
.pt td.ath{width:42%}
.pbar{height:10px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;overflow:hidden}
.pbar>div{height:100%;border-radius:5px}
.ft{margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;letter-spacing:.04em}
</style></head><body>
<div class="hd"><div><h1>${L('Aylık Antrenman Raporu','Monthly Training Report')}</h1><div class="tm">${R.teamName}</div></div><div class="rng">${R.monthLabel}</div></div>
${weeklySec}
${dailySec}
<div class="gwrap"><div class="grid2">${acwrSec}${monoSec}</div></div>
${purposeSec}
<div class="ft"><span>${L('AU = sRPE × dakika · Sporcular toplam yüke göre sıralıdır.','AU = sRPE × minutes · Athletes sorted by total load.')}</span><span>CoachOS · ${new Date().toLocaleDateString(REPORT_LANG==='tr'?'tr-TR':'en-GB')}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400);
}

