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

/* Chart.js dolgusu: düz renk. Eskiden alttan üste bir gradyandı; tasarım gradyansız
   olduğundan yalnızca üst renk kullanılır (ikinci parametre geriye uyum için duruyor). */
function vGrad(topColor,bottomColor){
  return topColor;
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
/* Eskiden çubukların arkasında neon bir hale çiziyordu; düz tasarımda hale yok.
   Scoped: pass `plugins={[barGlow]}` to the chart that wants it. */
const barGlow={
  id:'barGlow',
  beforeDatasetDraw(chart,args){
    const ds=chart.data.datasets[args.index];if(!ds)return;
    const ctx=chart.ctx;ctx.save();
    const bc=ds.borderColor;
    // Düz tasarım: parlama yok (eklenti, onu isteyen grafiklerde zararsız bir no-op olarak kalır).
    ctx.shadowColor='transparent';ctx.shadowBlur=0;
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

/* =========================================================
   YÜK RAPORU ÇIKTISI — haftalık ve aylık (A4 yatay)
   =========================================================
   Veri buildLoadReport'tan (280) gelir; bu işlev yalnızca basar. Sayfa 1: başlık (küçük
   CoachOS logosu), yedi gösterge kutusu, günlük yük grafiği + haftalar tablosu (ACWR,
   monotoni, zorlanma), antrenman türü ve odağı dağılımı. Sayfa 2: sporcu tablosu (gün ya
   da hafta yükleri, toplam, ort. RPE, hazır oluş, monotoni, ACWR). Kinexon raporu dili:
   siyah başlık bandı, ince çizgili tablolar, renk yalnızca bant işaretlerinde. */
function printLoadReport(R){
  const w=window.open('','_blank','width=1280,height=920');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nf=v=>Math.round(Number(v)||0).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-GB');
  const f2=v=>v==null||!v?'—':Number(v).toFixed(2);
  const f1=v=>v==null?'—':Number(v).toFixed(1);
  const acC=v=>!v?'#8b9099':v>1.5?'#dc2626':(v>=0.8&&v<=1.3)?'#16a34a':'#d97706';
  const acT=v=>!v?L('Veri yok','No data'):v>1.5?L('Yüksek risk','High risk'):(v>=0.8&&v<=1.3)?'Optimal':v<0.8?L('Düşük yük','Low load'):L('Dikkat','Caution');
  const moC=v=>!v?'#8b9099':v>2?'#dc2626':v>=1.5?'#d97706':v>=1?'#16a34a':'#2563eb';
  const moT=v=>!v?'—':v>2?L('Yüksek','High'):v>=1.5?L('İzle','Watch'):v>=1?'Normal':L('Düşük','Low');
  const rdC=v=>v==null?'#8b9099':v>=4?'#16a34a':v>=3?'#d97706':'#dc2626';
  const K=R.kpi,wk=R.kind==='week';
  const title=wk?L('Haftalık Yük Raporu','Weekly Load Report'):L('Aylık Yük Raporu','Monthly Load Report');
  const tile=(k,v,sub,c)=>`<div class="kp"${c?` style="--kc:${c}"`:''}><div class="kk">${k}</div><div class="kv">${v}</div><div class="ks">${sub}</div></div>`;
  const kpis=[
    tile(L('Yük / sporcu','Load / athlete'),nf(K.load),L(`AU · ${K.nAth} sporcu`,`AU · ${K.nAth} athletes`)),
    tile(L('Antrenman','Training'),`${K.trainDays}<small>/${K.nDays} ${L('gün','d')}</small>`,L(`${K.nSes} seans · ${nf(K.mins)} dk`,`${K.nSes} sessions · ${nf(K.mins)} min`)),
    tile('ACWR',f2(K.acwr),acT(K.acwr)+' · 0.8–1.3',acC(K.acwr)),
    tile(wk?L('Monotoni','Monotony'):L('Ort. monotoni','Avg monotony'),f2(K.mono),moT(K.mono)+' · '+L('ort. ÷ SS','mean ÷ SD'),moC(K.mono)),
    tile(wk?L('Zorlanma','Strain'):L('Ort. zorlanma','Avg strain'),nf(K.strain),L('haftalık yük × monotoni','weekly load × monotony')),
    tile(L('Ort. sRPE','Avg sRPE'),f1(K.rpe),L('seans zorluğu (0–10)','session effort (0–10)')),
    tile(L('Hazır oluş','Readiness'),K.rd==null?'—':f1(K.rd)+'<small>/5</small>',L('wellness ortalaması','wellness average'),rdC(K.rd)),
  ].join('');
  /* Günlük yük grafiği. */
  const maxD=Math.max(1,...R.daily.map(d=>d.avg));
  const many=R.daily.length>10;
  const bars=R.daily.map((d,i)=>{const h=Math.round(d.avg/maxD*100);const dt=parseD(d.k);const we=[0,6].includes(dt.getDay());
    const chips=wk?d.ses.slice(0,3).map(s=>`<div class="ch" style="--sc:${RPT_TYPE_COL[s.type]||'#78716c'}"><b>${esc(s.name)}</b>${s.duration?`<span>${s.duration} ${L('dk','min')}</span>`:''}</div>`).join(''):'';
    return`<div class="bc${we&&many?' we':''}${d.fut?' fut':''}">${wk?`<div class="chs">${chips}</div>`:''}<div class="bg"><div class="bv">${d.avg?nf(d.avg):''}</div><div class="br" style="height:${Math.max(d.avg?2:0,h)}%"></div></div>
      <div class="bl">${wk?`<b>${DN[i]}</b>${fd(d.k).slice(0,5)}`:dt.getDate()}</div></div>`;}).join('');
  const dailySec=`<div class="sec"><div class="sh"><span class="st">${L('Günlük yük','Daily load')}</span><span class="ss">${L('sporcu başına ort. AU','avg AU per athlete')}</span></div>
    <div class="chart${wk?' wk':''}">${bars}</div></div>`;
  /* Haftalar. */
  const wRows=R.weeks.map(x=>`<tr${wk&&x.ws===R.from?' class="cur"':''}><td class="l">${fd(x.ws).slice(0,5)} – ${fd(x.we).slice(0,5)}</td>
    <td>${x.fut?'—':nf(x.load)}</td><td><b style="color:${acC(x.acwr)}">${x.fut?'—':f2(x.acwr)}</b></td>
    <td><b style="color:${moC(x.mono)}">${x.fut?'—':f2(x.mono)}</b><i class="tg" style="--tc:${moC(x.mono)}">${x.fut?'':moT(x.mono)}</i></td><td>${x.fut||!x.strain?'—':nf(x.strain)}</td></tr>`).join('');
  const weeksSec=`<div class="sec"><div class="sh"><span class="st">${wk?L('Son 4 hafta','Last 4 weeks'):L('Haftalar','Weeks')}</span><span class="ss">ACWR · ${L('monotoni','monotony')} · ${L('zorlanma','strain')}</span></div>
    <table class="tw"><thead><tr><th class="l">${L('Hafta','Week')}</th><th>${L('Yük/sporcu','Load/ath.')}</th><th>ACWR</th><th>${L('Monotoni','Monotony')}</th><th>${L('Zorlanma','Strain')}</th></tr></thead><tbody>${wRows}</tbody></table></div>`;
  /* Dağılımlar. */
  const distSec=(t,sub,list)=>{const tot=list.reduce((x,y)=>x+y.min,0);
    const stack=list.map(x=>x.min>0?`<i style="flex-grow:${x.min};background:${x.color}"></i>`:'').join('');
    const rows=list.length?list.map(x=>`<tr><td class="l"><span class="sw" style="background:${x.color}"></span>${esc(x.label)}</td><td>${nf(x.min)}</td><td>${x.n}</td>
      <td class="pc"><div class="pb"><i style="width:${x.pct.toFixed(1)}%;background:${x.color}"></i></div><b>${x.pct.toFixed(0)}%</b></td></tr>`).join('')
      :`<tr><td class="l" colspan="4">${L('Bu dönemde seans yok','No sessions in this period')}</td></tr>`;
    return`<div class="sec"><div class="sh"><span class="st">${t}</span><span class="ss">${sub} · ${nf(tot)} ${L('dk','min')}</span></div>
      ${tot?`<div class="stk">${stack}</div>`:''}
      <table class="td"><thead><tr><th class="l">${L('Kategori','Category')}</th><th>${L('Dakika','Minutes')}</th><th>${L('Seans','Sessions')}</th><th>${L('Pay','Share')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;};
  const typeSec=distSec(L('Antrenman türü dağılımı','Training type split'),L('seans türüne göre','by session type'),R.types);
  const focSec=distSec(L('Antrenman odağı dağılımı','Training focus split'),L('çok odaklı seansın süresi odaklarına bölünür','a multi-focus session is split across its foci'),R.focus);
  /* Sporcu tablosu. */
  const mx=Math.max(1,...R.rows.flatMap(r=>r.v));
  const aRows=R.rows.map((r,i)=>`<tr${r.total?'':' class="off"'}><td class="n">${i+1}</td><td class="l"><b>${esc(r.name)}</b>${r.pos?`<em>${esc(r.pos)}</em>`:''}</td>
    ${r.v.map(v=>`<td class="c"${v?` style="background:rgba(31,124,194,${(0.06+v/mx*0.34).toFixed(2)})"`:''}>${v?nf(v):'<span class="z">·</span>'}</td>`).join('')}
    <td class="t">${nf(r.total)}</td><td>${f1(r.rpe)}</td><td><b style="color:${rdC(r.rd)}">${r.rd==null?'—':f1(r.rd)}</b></td>
    <td><b style="color:${moC(r.mono)}">${f2(r.mono)}</b></td><td><b style="color:${acC(r.acwr)}">${r.acwr==null?'—':f2(r.acwr)}</b></td></tr>`).join('');
  const mean=a=>{const v=a.filter(x=>x!=null);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null;};
  const act=R.rows.filter(r=>r.total>0);
  const aFoot=`<tr class="ft"><td></td><td class="l">${L('TAKIM','TEAM')}<em>${L('toplam · ortalama','total · mean')}</em></td>${R.colTot.map(v=>`<td class="c">${v?nf(v):'·'}</td>`).join('')}
    <td class="t">${nf(R.colTot.reduce((x,y)=>x+y,0))}</td><td>${f1(mean(act.map(r=>r.rpe)))}</td><td>${f1(mean(R.rows.map(r=>r.rd)))}</td><td>${f2(mean(act.map(r=>r.mono)))}</td><td>${f2(R.kpi.acwr)}</td></tr>`;
  const athSec=`<div class="sec ath"><div class="sh"><span class="st">${L('Sporcular','Athletes')}</span><span class="ss">${wk?L('günlük yük (AU)','daily load (AU)'):L('haftalık yük (AU)','weekly load (AU)')} · ${L('toplam yüke göre sıralı','sorted by total load')}</span></div>
    <table class="ta"><thead><tr><th class="n">#</th><th class="l">${L('Sporcu','Athlete')}</th>${R.cols.map(c=>`<th class="c">${c.lab}</th>`).join('')}
      <th class="t">${L('Toplam','Total')}</th><th>sRPE</th><th>${L('Hazır','Ready')}</th><th>${L('Mono','Mono')}</th><th>ACWR</th></tr></thead>
    <tbody>${aRows||`<tr><td colspan="${R.cols.length+7}">${L('Kadroda sporcu yok','No athletes on the roster')}</td></tr>`}</tbody><tfoot>${aFoot}</tfoot></table></div>`;
  const gen=new Date().toLocaleDateString(REPORT_LANG==='tr'?'tr-TR':'en-GB');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${esc(R.teamName)} — ${esc(R.label)}</title>
<style>
@page{size:A4 landscape;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ac:#1f7cc2;--ink:#0b0c0e;--bg2:#f5f6f8;--bd:#e3e5e8;--mut:#5c626c;--dim:#8b9099}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--ink);font-size:10px;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:#fff;padding:11px 16px;margin-bottom:10px}
.hd .l{display:flex;align-items:center;gap:14px}
.hd img{height:13px;width:auto;opacity:.95}
.hd .sep{width:1px;height:26px;background:rgba(255,255,255,.2)}
.hd h1{font-size:16px;font-weight:700;letter-spacing:.01em;text-transform:uppercase;line-height:1.1}
.hd .tm{font-size:10px;color:rgba(255,255,255,.65);margin-top:3px;letter-spacing:.03em}
.hd .r{text-align:right}
.hd .rng{display:inline-block;font-size:11px;font-weight:700;background:var(--ac);padding:5px 12px;letter-spacing:.03em}
.hd .gd{font-size:8.5px;color:rgba(255,255,255,.55);margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px}
.kp{border:1px solid var(--bd);border-top:3px solid var(--kc,var(--ink));padding:8px 10px 9px}
.kk{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.kv{font-size:21px;font-weight:700;margin-top:4px;line-height:1;color:var(--kc,var(--ink));font-variant-numeric:tabular-nums}
.kv small{font-size:10px;font-weight:600;color:var(--dim);margin-left:2px}
.ks{font-size:8.5px;color:var(--mut);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g2{display:grid;grid-template-columns:1.35fr 1fr;gap:10px;margin-bottom:10px}
.g2b{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sec{border:1px solid var(--bd);break-inside:avoid;page-break-inside:avoid;background:#fff}
.sh{display:flex;align-items:baseline;gap:10px;padding:7px 11px;border-bottom:1px solid var(--bd)}
.st{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ac)}
.ss{margin-left:auto;font-size:8.5px;color:var(--dim)}
.chart{display:flex;gap:3px;height:150px;padding:10px 10px 6px;align-items:stretch}
.chart.wk{height:206px;gap:6px}
.bc{flex:1;display:flex;flex-direction:column;min-width:0}
.bc.we .bg{background:var(--bg2)}
.bc.fut .bl{opacity:.45}
.chs{display:flex;flex-direction:column;gap:3px;min-height:34px;margin-bottom:5px}
.ch{border-left:3px solid var(--sc);background:var(--bg2);padding:3px 5px;line-height:1.2}
.ch b{display:block;font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch span{font-size:7.5px;color:var(--mut)}
.bg{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.bv{font-size:8px;font-weight:700;margin-bottom:2px;white-space:nowrap;font-variant-numeric:tabular-nums}
.chart:not(.wk) .bv{font-size:6.5px}
.br{width:70%;max-width:44px;background:var(--ac)}
.bl{text-align:center;font-size:7.5px;color:var(--dim);margin-top:4px;line-height:1.25}
.bl b{display:block;color:var(--ink);font-size:8.5px}
table{width:100%;border-collapse:collapse}
th{font-size:7.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:var(--ink);padding:6px 5px;text-align:right}
td{padding:5px 5px;border-top:1px solid var(--bd);text-align:right;font-variant-numeric:tabular-nums;font-size:9.5px}
th.l,td.l{text-align:left;padding-left:10px}
tbody tr:nth-child(even) td{background:#fafbfc}
.tw tr.cur td{background:#eaf3fb!important;font-weight:700}
.tg{display:inline-block;font-style:normal;font-size:7px;font-weight:700;color:var(--tc);margin-left:5px;letter-spacing:.04em;text-transform:uppercase}
.stk{display:flex;height:10px;margin:9px 11px 4px;gap:1px}
.stk i{display:block}
.sw{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:middle}
.pc{width:34%}
.pc .pb{display:inline-block;width:calc(100% - 34px);height:6px;background:var(--bg2);vertical-align:middle;margin-right:6px}
.pc .pb i{display:block;height:100%}
.pc b{display:inline-block;width:28px;text-align:right}
.ath{break-before:page;page-break-before:always}
.ta{table-layout:fixed}
.ta th.n,.ta td.n{width:22px;text-align:center;color:var(--dim)}
.ta th.l,.ta td.l{width:${wk?'20%':'19%'}}
.ta td.l b{font-weight:700;text-transform:uppercase;font-size:9px}
.ta td.l em{font-style:normal;color:var(--dim);font-size:8px;margin-left:6px}
.ta th.c,.ta td.c{text-align:center}
.ta th.t,.ta td.t{font-weight:700;background:#eef4fa}
.ta th.t{background:var(--ac)}
.ta tr.off td{color:var(--dim)}
.ta tfoot td{background:var(--ink)!important;color:#fff;font-weight:700;border-top:2px solid var(--ac)}
.ta tfoot td.l em{color:rgba(255,255,255,.6)}
.ta tfoot td.t{background:var(--ac)!important}
.z{color:#c3c7cd}
.nt{margin-top:8px;font-size:8px;color:var(--mut);line-height:1.6;border-top:1px solid var(--bd);padding-top:6px}
.nt b{color:var(--ink)}
.fo{display:flex;justify-content:space-between;font-size:8px;color:var(--dim);margin-top:6px}
</style></head><body>
<div class="hd"><div class="l"><img src="${COACHOS_LOGO}" alt="CoachOS"><span class="sep"></span><div><h1>${title}</h1><div class="tm">${esc(R.teamName)}</div></div></div>
  <div class="r"><div class="rng">${esc(R.label)}</div><div class="gd">${R.partial?L(`${fd(R.ref)} itibarıyla · `,`as of ${fd(R.ref)} · `):''}${L('Oluşturuldu','Generated')} ${gen}</div></div></div>
<div class="kpis">${kpis}</div>
<div class="g2">${dailySec}${weeksSec}</div>
<div class="g2b">${typeSec}${focSec}</div>
<div class="nt">${L('<b>AU</b> = sRPE × dakika. <b>ACWR</b> = son 7 günün yükü ÷ son 28 günün haftalık ortalaması (güvenli 0.8–1.3, &gt;1.5 yüksek risk). <b>Monotoni</b> = haftalık günlük yük ortalaması ÷ standart sapması (&lt;1.0 düşük · 1.0–1.5 normal · 1.5–2.0 izle · &gt;2.0 yüksek). <b>Zorlanma</b> = haftalık yük × monotoni. Monotoni ve ACWR önce her sporcu için, sonra kadro ortalaması olarak hesaplanır — Yük Takibi ekranıyla aynı.','<b>AU</b> = sRPE × minutes. <b>ACWR</b> = last 7 days\' load ÷ the 28-day weekly average (safe 0.8–1.3, &gt;1.5 high risk). <b>Monotony</b> = weekly mean daily load ÷ its SD (&lt;1.0 low · 1.0–1.5 normal · 1.5–2.0 watch · &gt;2.0 high). <b>Strain</b> = weekly load × monotony. Monotony and ACWR are computed per athlete first, then averaged — the same as the Load Monitoring screen.')}</div>
${athSec}
<div class="fo"><span>CoachOS · ${esc(R.teamName)}</span><span>${esc(R.label)}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},500);
}
