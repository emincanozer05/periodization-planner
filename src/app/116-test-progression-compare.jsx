/* =========================================================
   TEST PROGRESSION CHARTS
   ========================================================= */
function TestProgressionCharts({tests}){
  const sorted=useMemo(()=>[...tests].filter(t=>t.date).sort((a,b)=>(a.date||'').localeCompare(b.date||'')),[tests]);
  if(sorted.length<1)return null;
  const labels=sorted.map(t=>fd(t.date).slice(0,5)+' '+(TEST_PERIODS.find(p=>p.id===t.period)?.label.slice(0,3)||''));
  const ptStyle={pointRadius:5,pointHoverRadius:7};
  const baseOpt={responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},...CHART_DARK,
    plugins:{legend:{position:'bottom',labels:CHART_DARK.plugins.legend.labels}}};
  const labelOpt=(color)=>({display:true,align:'top',anchor:'end',color,backgroundColor:'rgba(15,20,36,.85)',borderRadius:4,padding:{top:2,bottom:2,left:5,right:5},font:{size:9,weight:'bold'},formatter:v=>v==null?'':Number(v).toFixed(1)});

  return(<div>
    <div className="panel"><h2>{L('📈 Antropometrik Gelişim','📈 Anthropometric Progression')}</h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('Boy (cm)','Height (cm)'),data:sorted.map(t=>Number(t.height)||null),borderColor:'#a855f7',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle,datalabels:labelOpt('#d8b4fe')},
          {label:L('Kilo (kg)','Weight (kg)'),data:sorted.map(t=>Number(t.weight)||null),borderColor:'#06b6d4',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle,datalabels:labelOpt('#67e8f9')},
          {label:L('Kulaç (cm)','Wingspan (cm)'),data:sorted.map(t=>Number(t.wingspan)||null),borderColor:'#22d3ee',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle,datalabels:labelOpt('#a5f3fc')},
          {label:L('Bacak Uzunluğu (cm)','Leg Length (cm)'),data:sorted.map(t=>Number(t.legLength)||null),borderColor:'#84cc16',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle,datalabels:labelOpt('#bef264')},
          {label:L('Oturma Yüksekliği (cm)','Sitting Height (cm)'),data:sorted.map(t=>Number(t.sittingHeight)||null),borderColor:'#eab308',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle,datalabels:labelOpt('#fde047')},
          {label:L('Yağ Oranı (%)','Body Fat (%)'),data:sorted.map(t=>Number(t.bodyFat)||null),borderColor:'#f97316',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y1',...ptStyle,datalabels:labelOpt('#fdba74')},
        ]}} options={{...baseOpt,
          scales:{x:CHART_DARK.scales.x,y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(15,23,42,.07)'},title:{display:true,text:'cm / kg',color:'#94a3b8'}},y1:{position:'right',ticks:{color:'#94a3b8'},grid:{drawOnChartArea:false},title:{display:true,text:L('Yağ Oranı (%)','Body Fat (%)'),color:'#94a3b8'}}}}}/>
      </div>
    </div>

    <div className="panel"><h2>{L('📏 Çevre Ölçümü Gelişimi — Üst Vücut (cm)','📏 Circumference Progression — Upper Body (cm)')}</h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('Omuz','Shoulder'),data:sorted.map(t=>Number(t.circ?.shoulder)||null),borderColor:'#06b6d4',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#67e8f9')},
          {label:L('Bel','Waist'),data:sorted.map(t=>Number(t.circ?.waist)||null),borderColor:'#f97316',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#fdba74')},
          {label:L('Kalça','Hip'),data:sorted.map(t=>Number(t.circ?.hip)||null),borderColor:'#8b5cf6',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#c4b5fd')},
        ]}} options={baseOpt}/>
      </div>
    </div>

    <div className="panel"><h2>{L('📏 Çevre Ölçümü Gelişimi — Alt Vücut (Sağ / Sol, cm)','📏 Circumference Progression — Lower Body (Right vs Left, cm)')}</h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('Uyluk Sağ','Thigh Right'),data:sorted.map(t=>Number(t.circ?.thighRight)||null),borderColor:'#ec4899',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#f9a8d4')},
          {label:L('Uyluk Sol','Thigh Left'),data:sorted.map(t=>Number(t.circ?.thighLeft)||null),borderColor:'#f472b6',borderDash:[6,4],tension:.3,spanGaps:true,borderWidth:2,...ptStyle},
          {label:L('Baldır Sağ','Calf Right'),data:sorted.map(t=>Number(t.circ?.calfRight)||null),borderColor:'#10b981',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#6ee7b7')},
          {label:L('Baldır Sol','Calf Left'),data:sorted.map(t=>Number(t.circ?.calfLeft)||null),borderColor:'#34d399',borderDash:[6,4],tension:.3,spanGaps:true,borderWidth:2,...ptStyle},
        ]}} options={baseOpt}/>
      </div>
    </div>

    <div className="panel"><h2>{L('🚀 Güç Testleri Gelişimi','🚀 Power Tests Progression')}</h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('Dikey Sıçrama (cm)','Vertical Jump (cm)'),data:sorted.map(t=>Number(t.verticalJump)||null),borderColor:'#06b6d4',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#67e8f9')},
          {label:L('CMJ (cm)','CMJ (cm)'),data:sorted.map(t=>Number(t.cmj)||null),borderColor:'#8b5cf6',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#c4b5fd')},
          {label:L('Lateral CMJ — Sağ (cm)','Lateral CMJ — R (cm)'),data:sorted.map(t=>Number(t.lateralCmj?.right)||null),borderColor:'#c084fc',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#e9d5ff')},
          {label:L('Lateral CMJ — Sol (cm)','Lateral CMJ — L (cm)'),data:sorted.map(t=>Number(t.lateralCmj?.left)||null),borderColor:'#c084fc',borderDash:[6,4],tension:.3,spanGaps:true,borderWidth:2,...ptStyle},
          {label:L('Drop Jump (RSI)','Drop Jump (RSI)'),data:sorted.map(t=>Number(t.dropJump)||null),borderColor:'#ec4899',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#f9a8d4')},
          {label:L('Yatay Sıçrama (cm)','Horizontal Jump (cm)'),data:sorted.map(t=>Number(t.horizontalJump)||null),borderColor:'#10b981',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#6ee7b7')},
        ]}} options={baseOpt}/>
      </div>
    </div>

    <div className="panel"><h2>{L('⚡ Sürat ve Çeviklik Gelişimi','⚡ Speed & Agility Progression')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('(düşük = daha iyi)','(lower = better)')}</span></h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('20m Sprint (sn)','20m Sprint (s)'),data:sorted.map(t=>Number(t.sprint20m?.time)||null),borderColor:'#ef4444',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#fca5a5')},
          {label:L('T-Testi (sn)','T-Test (s)'),data:sorted.map(t=>Number(t.tTest)||null),borderColor:'#f59e0b',tension:.3,spanGaps:true,borderWidth:2,...ptStyle,datalabels:labelOpt('#fcd34d')},
        ]}} options={baseOpt}/>
      </div>
    </div>

    <div className="panel"><h2>{L('🔁 Mekik Koşusu Gelişimi','🔁 Shuttle Run Progression')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('(düşük = daha iyi)','(lower = better)')}</span></h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('Mekik Koşusu (sn)','Shuttle Run (s)'),data:sorted.map(t=>Number(t.shuttleRun)||null),borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,.15)',tension:.3,spanGaps:true,borderWidth:2,fill:true,...ptStyle,datalabels:labelOpt('#a5f3fc')},
        ]}} options={baseOpt}/>
      </div>
    </div>

    <div className="panel"><h2>{L('🤸 Hareketlilik ve Hareket Skorları','🤸 Mobility & Movement Scores')}</h2>
      <div className="chart-box sm">
        <ChartC type="line" chartData={{labels,datasets:[
          {label:L('ASLR Sağ (FMS)','ASLR Right (FMS)'),data:sorted.map(t=>Number(t.aslr?.right)||null),borderColor:'#06b6d4',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle},
          {label:L('ASLR Sol (FMS)','ASLR Left (FMS)'),data:sorted.map(t=>Number(t.aslr?.left)||null),borderColor:'#22d3ee',borderDash:[5,5],tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle},
          {label:L('BÜS Skoru (FMS)','OHS Score (FMS)'),data:sorted.map(t=>Number(t.ohs?.score)||null),borderColor:'#10b981',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y',...ptStyle},
          {label:L('Ayak Bileği DF Sağ (°)','Ankle DF Right (°)'),data:sorted.map(t=>Number(t.ankleDF?.right)||null),borderColor:'#f97316',tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y1',...ptStyle},
          {label:L('Ayak Bileği DF Sol (°)','Ankle DF Left (°)'),data:sorted.map(t=>Number(t.ankleDF?.left)||null),borderColor:'#fb923c',borderDash:[5,5],tension:.3,spanGaps:true,borderWidth:2,yAxisID:'y1',...ptStyle},
        ]}} options={{...baseOpt,
          scales:{x:CHART_DARK.scales.x,y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(15,23,42,.07)'},title:{display:true,text:L('FMS Skoru','FMS Score'),color:'#94a3b8'},min:0,max:3},y1:{position:'right',ticks:{color:'#94a3b8'},grid:{drawOnChartArea:false},title:{display:true,text:L('Derece','Degrees'),color:'#94a3b8'}}}}}/>
      </div>
    </div>
  </div>);
}

/* =========================================================
   COMPARE ATHLETES — the printout. Landscape A4, and the same table the screen
   shows: the metrics across the top, the athletes down the left, in the order and
   the selection the coach left them in. Nothing is recomputed here — the values,
   the best/worst marks and the averages all arrive already worked out, so the
   paper cannot disagree with the screen.
   ========================================================= */
function printAthleteCompare({rows,metrics,bands,teamName,scopeLabel,avgs,edges}){
  const w=window.open('','_blank','width=1400,height=900');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // A wide battery has to fit the same sheet a narrow one does, so the type shrinks
  // with the column count rather than the table running off the page.
  const n=metrics.length;
  const fs=n<=10?10.5:n<=15?9:n<=21?7.8:n<=28?6.9:6.1;
  // The values are what the sheet is read for, so they are set larger and bolder than
  // the headers around them — eased off as the columns multiply, so a wide battery
  // still fits the same page.
  const vfs=+(fs*(n<=15?1.32:n<=21?1.24:n<=28?1.16:1.1)).toFixed(1);
  // The athlete column holds one line and only one — name, position and date run on
  // together — so it is given the width that line needs rather than a fixed slice of
  // the page. Under table-layout:fixed a cell cannot grow on its own, so the widest
  // row is measured here (bold name at ~.62em a character, quiet meta at ~.55em) and
  // the type in the column is eased down until the longest line fits its box.
  const nameW=n<=12?24:n<=20?19:15;
  const PAGE=1062;                              // A4 landscape less the 8mm margins, in px
  const nmBase=+(fs*1.15).toFixed(1), mtBase=+(fs*.85).toFixed(1);
  const metaOf=r=>[r.pos,fd(r.date)].filter(Boolean).join(' · ');
  const widest=rows.reduce((mx,r)=>Math.max(mx,
    String(r.name||'').length*nmBase*.62+(metaOf(r)?4+metaOf(r).length*mtBase*.55:0)),0);
  const room=PAGE*nameW/100-8;                  // less the cell's own padding
  const sc=widest>room?Math.max(.62,room/widest):1;
  const nmFs=+(nmBase*sc).toFixed(1), mtFs=+(mtBase*sc).toFixed(1);
  const logo=teamLogo();
  const lbl=n>18?cmpShort:cmpLabel;
  const head=metrics.map(m=>`<th><span class="l">${esc(lbl(m))}</span>${m.u?`<span class="u">${esc(m.u)}</span>`:''}</th>`).join('');
  const band=bands.map(b=>`<th class="grp" colspan="${b.n}">${esc(L(b.tr,b.en))}</th>`).join('');
  const body=rows.map(r=>`<tr>
    <td class="ath">
      <span class="who">
        <span class="nm">${esc(r.name)}</span>
        <span class="meta">${esc(metaOf(r))}</span>
      </span>
    </td>
    ${r.vals.map((v,i)=>{const e=edges[i];
      const cls=v==null?'na':(e.best!=null&&v===e.best?'best':(e.worst!=null&&v===e.worst?'worst':''));
      return`<td class="${cls}">${esc(cmpFmt(v))}</td>`;}).join('')}
  </tr>`).join('');
  const foot=`<tr><td class="ath avg">${esc(L('Takım ortalaması','Team average'))}</td>${avgs.map(v=>`<td>${esc(cmpFmt(v))}</td>`).join('')}</tr>`;
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(L('Sporcu Karşılaştırma','Athlete Comparison'))} — ${esc(teamName||'')}</title>
<style>
@page{size:A4 landscape;margin:8mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#0094ff;--border:#e5e7eb;--text:#0a0b0d;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Archivo',Arial,sans-serif;color:var(--text);background:#fff;font-size:${fs}px;line-height:1.35}
.hdr{display:flex;align-items:center;gap:14px;padding:11px 16px;background:#0a0b0d;color:#fff;border-radius:11px;margin-bottom:10px}
.hdr img{height:34px;width:auto;object-fit:contain}
.hdr h1{font-size:16px;font-weight:700;letter-spacing:-.01em}
.hdr .meta{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:3px;letter-spacing:.04em}
.hdr .ttl{margin-left:auto;text-align:right;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:.14em;text-transform:uppercase}
table{width:100%;border-collapse:collapse;table-layout:fixed}
/* A column header wraps between its words first and only splits a word when that
   word alone cannot fit — "Shoulder" over two lines reads as nothing at all. */
th,td{border:1px solid var(--border);padding:${fs<8?'2px 2px':'4px 3px'};text-align:center;word-break:normal;overflow-wrap:break-word;hyphens:none}
thead th{background:#f4f5f7;font-size:${(fs*.92).toFixed(1)}px;font-weight:700;line-height:1.2;vertical-align:bottom;text-transform:uppercase;letter-spacing:.02em}
thead th .u{display:block;font-size:${(fs*.8).toFixed(1)}px;font-weight:400;color:var(--muted);text-transform:none;letter-spacing:0}
thead th.grp{background:#0a0b0d;color:#fff;font-size:${(fs*.82).toFixed(1)}px;letter-spacing:.1em;padding:3px}
th.ath,td.ath{width:${nameW}%;text-align:left;overflow:hidden}
/* The name and its reading run on together, on a single line: name, surname,
   position and date. Nothing here wraps — a name broken over two lines, or a
   reading dropped under it, reads as a second athlete — so the column is sized
   and the type scaled above to hold the longest row on one line. */
td.ath .who{display:flex;align-items:baseline;gap:4px;white-space:nowrap}
td.ath .nm{flex:0 0 auto;white-space:nowrap;font-size:${nmFs}px;font-weight:700;line-height:1.25}
td.ath .meta{flex:0 0 auto;font-size:${mtFs}px;color:var(--muted);white-space:nowrap}
tbody tr:nth-child(even) td{background:#fafbfc}
tbody td{font-size:${vfs}px;font-weight:700;letter-spacing:-.01em}
tbody td.ath{font-size:${fs}px;font-weight:400;letter-spacing:0}
td.best{color:#0f7a3d;font-weight:700;background:rgba(22,163,74,.10)!important}
td.worst{color:#b3261e;font-weight:700;background:rgba(220,38,38,.08)!important}
td.na{color:var(--dim);font-weight:400}
tfoot td{background:#eef0f3;font-size:${vfs}px;font-weight:700}
tfoot td.avg{font-size:${(fs*.9).toFixed(1)}px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.legend{margin-top:7px;font-size:${(fs*.88).toFixed(1)}px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap}
.legend i{font-style:normal;font-weight:700}
.footer{margin-top:8px;padding-top:5px;border-top:1px solid var(--border);text-align:center;font-size:${(fs*.85).toFixed(1)}px;color:var(--dim);letter-spacing:.05em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:12px;font-weight:500;z-index:9999}
.print-bar button{background:var(--accent);color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}thead{display:table-header-group}tr{page-break-inside:avoid}}
</style></head><body>
<div class="print-bar">📄 ${esc(L('Karşılaştırma tablosu hazır','Comparison table is ready'))} · <button onclick="window.print()">${esc(L('Yazdır / PDF','Print / Save as PDF'))}</button> <button class="sec" onclick="window.close()">${esc(L('Kapat','Close'))}</button></div>
<div class="scr-sp" style="height:50px"></div>
<div class="hdr">
  ${logo?`<img src="${mediaSrc(logo)}" alt=""/>`:''}
  <div>
    <h1>${esc(teamName||'')}</h1>
    <div class="meta">${esc(scopeLabel)} · ${rows.length} ${esc(L('sporcu','athletes'))} · ${n} ${esc(L('metrik','metrics'))}</div>
  </div>
  <div class="ttl">${L('SPORCU<br>KARŞILAŞTIRMA','ATHLETE<br>COMPARISON')}</div>
</div>
<table>
  <thead>
    <tr><th class="ath grp"></th>${band}</tr>
    <tr><th class="ath">${esc(L('Sporcu','Athlete'))}</th>${head}</tr>
  </thead>
  <tbody>${body}</tbody>
  <tfoot>${foot}</tfoot>
</table>
<div class="legend"><span><i style="color:#0f7a3d">■</i> ${esc(L('grubun en iyisi','best in group'))}</span><span><i style="color:#b3261e">■</i> ${esc(L('grubun en zayıfı','weakest in group'))}</span><span>${esc(L('İşaretsiz sütunlarda "iyi" diye bir yön yok (boy, kilo, özel testler).','Unmarked columns have no better direction (height, weight, custom tests).'))}</span></div>
<div class="footer">${esc(L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today))))}</div>
</body></html>`;
  w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();}catch(e){}},400);
}

/* ---- Compare Athletes — the screen ---------------------------------------
   Metrics across the top, athletes down the left. The coach chooses which test each
   athlete is read from (their latest, or the latest of a season period), which metric
   groups are columns, and who is a row. Columns nobody has a number for are dropped by
   default, so a battery of six tests does not print thirty empty columns. */
function CompareAthletes({athletes,setup,customTests,Lx}){
  const[scope,setScope]=useState('latest');
  const[groups,setGroups]=useState(()=>new Set(CMP_GROUPS.map(g=>g.id)));
  const[hideEmpty,setHideEmpty]=useState(true);
  const withTests=useMemo(()=>athletes.filter(a=>(a.tests||[]).some(t=>t.date)),[athletes]);
  const[picked,setPicked]=useState(()=>new Set(withTests.map(a=>a.id)));
  const allMetrics=useMemo(()=>cmpMetrics(customTests),[customTests]);
  const toggleIn=(set,fn,id)=>{const n=new Set(set);n.has(id)?n.delete(id):n.add(id);fn(n);};
  /* One row per athlete who is both ticked and has a test in the chosen scope. Everything
     the table and the printout need is computed once, here. */
  const view=useMemo(()=>{
    const rows=withTests.filter(a=>picked.has(a.id))
      .map(a=>({a,t:cmpTestOf(a,scope)})).filter(r=>r.t)
      .sort((x,y)=>(x.a.name||'').localeCompare(y.a.name||''));
    let metrics=allMetrics.filter(m=>groups.has(m.g));
    const val=(m,t)=>{try{return m.get(t);}catch(e){return null;}};
    if(hideEmpty)metrics=metrics.filter(m=>rows.some(r=>val(m,r.t)!=null));
    const data=rows.map(r=>({
      id:r.a.id,name:r.a.name||'—',
      pos:posOf(r.a.position),
      date:r.t.date,period:(TEST_PERIODS.find(p=>p.id===r.t.period)||{}).label||'',
      vals:metrics.map(m=>val(m,r.t)),
    }));
    const edges=metrics.map((m,i)=>cmpEdges(data.map(d=>d.vals[i]),m.dir));
    const avgs=metrics.map((m,i)=>{const v=data.map(d=>d.vals[i]).filter(x=>x!=null);
      return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):null;});
    // Group band across the top: each run of columns from the same group, named once.
    const bands=[];metrics.forEach(m=>{const last=bands[bands.length-1];
      if(last&&last.id===m.g)last.n++;else{const g=CMP_GROUPS.find(x=>x.id===m.g);bands.push({id:m.g,tr:g.tr,en:g.en,n:1});}});
    return{rows:data,metrics,edges,avgs,bands};
  },[withTests,picked,scope,groups,hideEmpty,allMetrics]);
  const scopeLabel=scope==='latest'?Lx('Son test','Latest test')
    :Lx('Son ','Latest ')+((TEST_PERIODS.find(p=>p.id===scope)||{}).label||'');
  const cellCls=(v,e)=>'cmp-v'+(v==null?' na':(e.best!=null&&v===e.best?' best':(e.worst!=null&&v===e.worst?' worst':'')));
  const canPrint=view.rows.length>0&&view.metrics.length>0;
  return(<div className="panel">
    <div className="row" style={{justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:8}}>
      <h2 style={{margin:0}}>{Lx('Sporcu Karşılaştırma','Compare Athletes')}</h2>
      <button className="btn sm white" disabled={!canPrint}
        onClick={()=>printAthleteCompare({rows:view.rows,metrics:view.metrics,bands:view.bands,
          avgs:view.avgs,edges:view.edges,teamName:setup.teamName,scopeLabel})}>
        🖨 {Lx('Çıktı Al (A4 yatay)','Print (A4 landscape)')}
      </button>
    </div>
    <div className="help" style={{marginBottom:14}}>
      {Lx('Metrikler üstte yan yana, sporcular solda alt alta. Her sporcunun seçilen dönemdeki son testi okunur — çıktı bu tabloyu aynen yatay A4\'e basar.',
          'Metrics across the top, athletes down the left. Each athlete is read from their latest test in the chosen period — the printout puts this exact table on landscape A4.')}
    </div>
    <div className="cmp-bar">
      <div className="cmp-fld">
        <label>{Lx('Hangi test','Which test')}</label>
        <select value={scope} onChange={e=>setScope(e.target.value)} style={{width:170}}>
          <option value="latest">{Lx('Son test','Latest test')}</option>
          {TEST_PERIODS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="cmp-fld" style={{flex:'1 1 340px',minWidth:240}}>
        <label>{Lx('Metrik grupları','Metric groups')}</label>
        <div className="cmp-chips">
          {CMP_GROUPS.map(g=>{const has=allMetrics.some(m=>m.g===g.id);if(!has)return null;
            return(<button key={g.id} type="button" className={'cmp-chip grp'+(groups.has(g.id)?' on':'')}
              onClick={()=>toggleIn(groups,setGroups,g.id)}>{Lx(g.tr,g.en)}</button>);})}
          <button type="button" className={'cmp-chip grp'+(hideEmpty?' on':'')} onClick={()=>setHideEmpty(v=>!v)}
            title={Lx('Kimsede verisi olmayan sütunları gizle','Hide columns nobody has data for')}>
            {Lx('Boş sütunları gizle','Hide empty columns')}
          </button>
        </div>
      </div>
    </div>
    <div className="cmp-bar">
      <div className="cmp-fld" style={{flex:'1 1 100%'}}>
        <label>{Lx('Sporcular','Athletes')} ({view.rows.length}/{withTests.length})</label>
        <div className="cmp-chips">
          <button type="button" className="cmp-chip" onClick={()=>setPicked(new Set(withTests.map(a=>a.id)))}>{Lx('Tümü','All')}</button>
          <button type="button" className="cmp-chip" onClick={()=>setPicked(new Set())}>{Lx('Temizle','Clear')}</button>
          {withTests.map(a=><button key={a.id} type="button" className={'cmp-chip ath'+(picked.has(a.id)?' on':'')}
            onClick={()=>toggleIn(picked,setPicked,a.id)}>
            {a.number&&<span className="n">#{a.number}</span>}{a.name}
          </button>)}
        </div>
      </div>
    </div>
    {withTests.length===0&&<div className="empty-st">{Lx('Karşılaştırılacak test yok — önce bir sporcuya test uygula.','Nothing to compare yet — administer a test to an athlete first.')}</div>}
    {withTests.length>0&&view.rows.length===0&&<div className="empty-st">{Lx('Seçilen sporcuların bu dönemde testi yok — başka bir dönem seç ya da sporcu ekle.','No test in this period for the athletes you picked — choose another period or tick more athletes.')}</div>}
    {view.rows.length>0&&view.metrics.length===0&&<div className="empty-st">{Lx('Seçili gruplarda gösterilecek metrik yok.','No metric to show in the selected groups.')}</div>}
    {canPrint&&<>
      <div className="cmp-scroll">
        <table className="cmp-tbl">
          <thead>
            <tr className="bnd"><th className="ath-c"></th>{view.bands.map((b,i)=><th key={b.id+i} colSpan={b.n}>{Lx(b.tr,b.en)}</th>)}</tr>
            <tr className="hdr"><th className="ath-c">{Lx('Sporcu','Athlete')}</th>
              {view.metrics.map(m=><th key={m.id}>{cmpLabel(m)}{m.u&&<span className="u">{m.u}</span>}</th>)}</tr>
          </thead>
          <tbody>
            {view.rows.map(r=><tr key={r.id}>
              <td className="ath-c">
                <span className="cmp-who">
                  <span className="cmp-nm">{r.name}</span>
                  <span className="cmp-meta">{[r.pos,fd(r.date)].filter(Boolean).join(' · ')}</span>
                </span>
              </td>
              {r.vals.map((v,i)=><td key={view.metrics[i].id}><span className={cellCls(v,view.edges[i])}>{cmpFmt(v)}</span></td>)}
            </tr>)}
          </tbody>
          <tfoot>
            <tr><td className="ath-c">{Lx('Takım ort.','Team avg.')}</td>
              {view.avgs.map((v,i)=><td key={view.metrics[i].id}>{cmpFmt(v)}</td>)}</tr>
          </tfoot>
        </table>
      </div>
      <div className="cmp-legend">
        <span><b style={{color:'var(--accent)'}}>■</b> {Lx('grubun en iyisi','best in group')}</span>
        <span><b style={{color:'#f0836c'}}>■</b> {Lx('grubun en zayıfı','weakest in group')}</span>
        <span>{Lx('Yönü olmayan sütunlar (boy, kilo, özel testler) işaretlenmez.','Columns with no better direction (height, weight, custom tests) are left unmarked.')}</span>
      </div>
    </>}
  </div>);
}

/* ---- Athlete level table — the printout -----------------------------------
   The level table first, because that is what a coach pins up: the whole squad in
   one grid, quality by quality. The verdict table underneath carries the same
   readings one row per athlete, so the sheet answers both "where does the squad
   stand on this quality" and "what did this athlete get". Nothing is recomputed
   here — the screen worked it out, hand-set levels included. */
function printAthleteBoxes({matrix,rows,teamName,scopeLabel,pool,refLabel,refNorm}){
  const w=window.open('','_blank','width=1100,height=900');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const logo=teamLogo();
  const mxHead=(matrix.cols||[]).map(c=>`<th>${esc(c)}</th>`).join('');
  const keyRows=(matrix.key||[]).map(k=>`<div class="kr"><span class="kn">${esc(k.name)}</span><span class="kd">${esc(k.text)}</span></div>`).join('');
  const mxBody=(matrix.rows||[]).map(r=>`<tr>
    <td class="ath"><span class="who"><span class="nm">${esc(r.name)}</span><span class="sub">${esc(r.sub)}</span></span></td>
    ${r.cells.map(c=>`<td class="lv l-${c.lvl||'na'}"><span class="lt">${esc(c.label)}</span><span class="lp">${
      c.man?L('elle','by hand')
      :c.pct==null?'—'
      :'P'+c.pct+(c.sq?' '+L('· takım','· squad'):'')}</span></td>`).join('')}
  </tr>`).join('');
  const body=rows.map(r=>`<tr>
    <td class="ath"><span class="who"><span class="nm">${esc(r.name)}</span><span class="sub">${esc([r.pos,fd(r.date)].filter(Boolean).join(' · '))}</span></span></td>
    <td class="need">${esc(r.primary)}</td><td>${r.pPct==null?'—':'P'+r.pPct}</td>
    <td class="need">${esc(r.secondary||'—')}</td><td>${r.sPct==null?'—':'P'+r.sPct}</td>
    <td class="need">${esc(r.strong||'—')}</td><td>${r.gPct==null?'—':'P'+r.gPct}</td>
    <td>${esc(r.conf)}</td></tr>`).join('');
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(L('Sporcu Seviye Tablosu','Athlete Level Table'))} — ${esc(teamName||'')}</title>
<style>
@page{size:A4 portrait;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--border:#e5e7eb;--text:#0a0b0d;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Archivo',Arial,sans-serif;color:var(--text);background:#fff;font-size:9.5px;line-height:1.4}
.hdr{display:flex;align-items:center;gap:14px;padding:11px 16px;background:#0a0b0d;color:#fff;border-radius:11px;margin-bottom:11px}
.hdr img{height:34px;width:auto;object-fit:contain}
.hdr h1{font-size:16px;font-weight:700;letter-spacing:-.01em}
.hdr .meta{font-size:9.5px;color:rgba(255,255,255,.62);margin-top:3px;letter-spacing:.04em}
.hdr .ttl{margin-left:auto;text-align:right;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:.14em;text-transform:uppercase}
/* The level grid, in the same muted tones the screen uses — printed on white the
   three levels have to stay readable in greyscale too, so each carries its word. */
table.mx{margin-bottom:12px}
table.mx thead th{font-size:7.5px;line-height:1.2;color:#000}
/* Every quality column the same width on paper as well — table-layout:fixed is
   already set on every table here, so only the name column needs a width. */
table.mx th.ath,table.mx td.ath{width:17%}
/* What each column means, for the athlete reading their own row. Stacked one per
   line so it reads as a list rather than as a second table. */
.key{border:1px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:10px;page-break-inside:avoid}
.key h2{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.key .kr{display:flex;gap:8px;align-items:baseline;padding:2.5px 0;border-top:1px solid #f1f2f4}
.key .kr:first-of-type{border-top:none}
.key .kn{flex:0 0 27%;font-size:8.5px;font-weight:700;line-height:1.25;color:#000}
.key .kd{flex:1;font-size:8.5px;color:var(--muted);line-height:1.35}
/* The needs table is always its own page: it is a different reading of the squad,
   and a coach hands out the level grid and the verdict sheet separately. */
.pg2{page-break-before:always}
td.lv{padding:3px 2px;text-align:center}
td.lv .lt{display:block;font-size:8.5px;font-weight:700;line-height:1.2}
td.lv .lt i{font-style:normal;font-size:7.5px;opacity:.7}
td.lv .lp{display:block;font-size:7px;color:var(--muted);line-height:1.2}
/* Written to out-specify the verdict table's zebra rule further down, which would
   otherwise wash every second row of the level grid back to plain paper. */
table.mx tbody td.l-grn{background:#e6f2ea;color:#2f6b45}
table.mx tbody td.l-yel{background:#f7eeda;color:#7a6118}
table.mx tbody td.l-red{background:#f7e3e3;color:#8c3d3d}
table.mx tbody td.l-na{background:#f6f7f8;color:#9aa0a8}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid var(--border);padding:3px 4px;text-align:center;word-break:normal;overflow-wrap:break-word}
thead th{background:#f4f5f7;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
th.ath,td.ath{width:20%;text-align:left}
/* The reading beside the name, never under it: a long name wraps inside its own
   box and the position and date hold the row next to it. */
td.ath .who{display:flex;align-items:baseline;gap:4px}
td.ath .nm{flex:1 1 auto;min-width:0;overflow-wrap:break-word;font-size:10px;font-weight:700;line-height:1.15}
td.ath .sub{flex:0 0 auto;font-size:8px;color:var(--muted);white-space:nowrap}
td.need{text-align:left;font-weight:700;font-size:8.5px;color:#000}
tbody tr:nth-child(even) td{background:#fafbfc}
.note{margin-top:8px;font-size:8.5px;color:var(--muted);line-height:1.5}
.footer{margin-top:8px;padding-top:5px;border-top:1px solid var(--border);text-align:center;font-size:8.5px;color:var(--dim);letter-spacing:.05em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:12px;font-weight:500;z-index:9999}
.print-bar button{background:#0094ff;color:#fff;border:none;padding:8px 18px;border-radius:7px;font-weight:700;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}thead{display:table-header-group}tr{page-break-inside:avoid}}
</style></head><body>
<div class="print-bar">📄 ${esc(L('Tablo hazır','The table is ready'))} · <button onclick="window.print()">${esc(L('Yazdır / PDF','Print / Save as PDF'))}</button> <button class="sec" onclick="window.close()">${esc(L('Kapat','Close'))}</button></div>
<div class="scr-sp" style="height:50px"></div>
<div class="hdr">
  ${logo?`<img src="${mediaSrc(logo)}" alt=""/>`:''}
  <div><h1>${esc(teamName||'')}</h1>
    <div class="meta">${esc(scopeLabel)} · ${rows.length} ${esc(L('sporcu','athletes'))} · ${esc(refLabel||'')}${refNorm?'':` n=${pool}`}</div></div>
  <div class="ttl">${L('SPORCU<br>SEVİYE TABLOSU','ATHLETE<br>LEVEL TABLE')}</div>
</div>
<table class="mx">
  <thead><tr><th class="ath">${esc(L('Sporcu','Athlete'))}</th>${mxHead}</tr></thead>
  <tbody>${mxBody}</tbody>
</table>
<div class="key">
  <h2>${esc(L('Bu sütunlar ne anlama geliyor?','What each column means'))}</h2>
  ${keyRows}
</div>
<table class="pg2">
  <thead><tr>
    <th class="ath">${esc(L('Sporcu','Athlete'))}</th>
    <th>${esc(L('Ana ihtiyaç','Main need'))}</th><th>P</th>
    <th>${esc(L('İkincil ihtiyaç','Secondary need'))}</th><th>P</th>
    <th>${esc(L('En yüksek percentile','Highest percentile'))}</th><th>P</th>
    <th>${esc(L('Güven','Confidence'))}</th>
  </tr></thead>
  <tbody>${body}</tbody>
</table>
<div class="note">${esc(L(`Seviye eşikleri: P${AB_Z_STRONG} ve üzeri İYİ, P${AB_Z_WATCH}-${AB_Z_STRONG-1} ORTALAMA, P${AB_Z_WATCH} altı ZAYIF. Testi girilmemiş bir özellik boş bırakılır, "ortalama" sayılmaz; "elle" yazan hücreler antrenör tarafından elle ayarlanmıştır. `,
  `Level cut-offs: P${AB_Z_STRONG} and above is GOOD, P${AB_Z_WATCH}-${AB_Z_STRONG-1} AVERAGE, below P${AB_Z_WATCH} WEAK. A quality with no test entered is left empty rather than counted as average; cells reading "by hand" were set by the coach rather than computed. `))}${refNorm?esc(L('Seviyeler, sporcunun test günündeki yaşı ve pozisyonu için literatürden alınan referans değerlere göre okunmuştur. Karşılaştırma grubu her zaman antrenmanlı bir popülasyondur — mümkün olan yerde genç basketbolcular; okul popülasyonu verisi kullanılmamıştır. "· takım" ile işaretli hücrelerde antrenmanlı popülasyon referansı bulunmadığı için (yatay power, lateral power, ya da doğum tarihi girilmemiş sporcu) takım içi sıralama kullanılmıştır. Pozisyon düzeltmesi yalnızca literatürün tutarlı fark bildirdiği özelliklere (hız/yön değiştirme, iş kapasitesi, göreceli kuvvet) uygulanır. Göreceli kuvvet için yerleşmiş bir genç yaş normu yoktur; kullanılan satır yetişkin standartlarından ölçeklenmiş bir uygulama referansıdır. ',
  'Levels were read against reference values from the literature for the athlete\'s age on the day of the test and their playing position. The comparison group is always a trained population — youth basketball players where possible; school-population data is not used. Cells marked "· squad" had no trained-population reference (horizontal power, lateral power, or an athlete with no date of birth) and fall back to the within-team ranking. A position adjustment is applied only to the qualities where the literature reports a consistent difference (speed/change of direction, work capacity, relative strength). No youth norm is established for relative strength; the row used there is a practitioner reference scaled from adult standards. ')):''}${esc(L('Percentile takım içi sıralamadır; süre bazlı testlerde (T-test, sprint, sağ-sol asimetrisi) düşük değer iyi kabul edilerek ters çevrilmiştir. Sağ-sol farkı iyi bacağın yüzdesi olarak hesaplanır. "En yüksek percentile" sütunu, programda koruma dozuyla sürdürülecek özelliği gösterir — P60 ve üzeri güçlü bölgedir. Kuvvet testi girilmemişse temel kuvvet değerlendirilmemiştir. Asimetri verisi sakatlık teşhisi değildir. Genç yaş gruplarında maturasyon durumu bu testleri belirgin biçimde etkiler ve ölçülmemiştir; karşılaştırma tüm sporcuların aynı protokolle test edildiğini varsayar.',
  'Percentiles are within-team rankings; on time-based tests (T-test, sprint, left/right asymmetry) a lower value is the better one and the ranking is inverted. The left/right gap is a percentage of the better limb. The "highest percentile" column is the quality to keep on a maintenance dose — P60 and above is the strong zone. Foundational strength is left unassessed when no strength test has been entered. An asymmetry is not a diagnosis. In youth age groups maturity status has a marked effect on these tests and was not measured; the comparison assumes every athlete was tested on the same protocol.'))}</div>
<div class="footer">${esc(L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today))))}</div>
</body></html>`;
  w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();}catch(e){}},400);
}

/* Copy that still works where the async clipboard API is not available (an
   older in-app browser, a page served over plain http). */
function abCopy(txt,okMsg){
  const done=()=>alert(okMsg);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done,()=>abCopyFallback(txt,done));
  }else abCopyFallback(txt,done);
}
function abCopyFallback(txt,done){
  const ta=document.createElement('textarea');
  ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');done();}catch(e){alert(L('Kopyalanamadı.','Could not copy.'));}
  document.body.removeChild(ta);
}

/* ---- Athlete level table — the screen -------------------------------------
   Athletes down the left, nine physical qualities across the top, and one of three
   levels in every cell. Each level is worked out from the test data, and every one
   of them can be overruled by hand: the percentile is a comparison, the coach saw
   the movement. Clicking a name opens the same verdict panel as before — the tests,
   the percentiles, the priorities for the week and what the reading does not claim. */
function AthleteBoxes({athletes,setup,customTests,updAth,Lx}){
  const[scope,setScope]=useState('latest');
  const[selId,setSelId]=useState(null);
  const[json,setJson]=useState(false);
  const[menu,setMenu]=useState(null);   // {athId,metric} — the cell whose level menu is open
  const[ref,setRef]=useState(AB_REF_NORM); // which yardstick the levels are read against
  const[srcOpen,setSrcOpen]=useState(false);
  const board=useMemo(()=>abBoard(athletes,scope,customTests),[athletes,scope,customTests]);
  /* The squad reads by name, A → Z, as the roster does everywhere. A table sorted by
     one quality would quietly rank the athletes, which is what the levels are there
     to avoid. */
  const rowsView=useMemo(()=>[...board.profiles].sort((x,y)=>byAthleteName(x.a,y.a)),[board]);
  const sel=board.profiles.find(p=>p.id===selId)||null;
  const scopeLabel=scope==='latest'?Lx('Son test','Latest test')
    :Lx('Son ','Latest ')+((TEST_PERIODS.find(p=>p.id===scope)||{}).label||'');
  const canPrint=board.profiles.length>0;
  /* A hand-set level is stored against the test record it was made on, so the next
     test is read fresh rather than inheriting a correction made about older data.
     Picking "Auto" removes the override and gives the cell back to the test data. */
  const setLevel=(pf,metric,lvl)=>{
    setMenu(null);
    if(!updAth)return;
    const key=abOvKey(pf),all={...(pf.a.needLevels||{})},cell={...(all[key]||{})};
    if(lvl)cell[metric]=lvl;else delete cell[metric];
    if(Object.keys(cell).length)all[key]=cell;else delete all[key];
    updAth(pf.a.id,{needLevels:all});
  };
  const refLabel=ref===AB_REF_NORM
    ?Lx(`Yaş + pozisyon normu · ${AB_NORM_AGE0}-${AB_NORM_AGE0+6} yaş (literatür)`,
        `Age + position reference · ${AB_NORM_AGE0}-${AB_NORM_AGE0+6} yo (literature)`)
    :Lx('Takım içi percentile','Within-team percentile');
  const matrixOut=()=>rowsView.map(pf=>({
    name:pf.a.name||'—',
    sub:[pf.a.number?'#'+pf.a.number:'',POS_FULL[pf.a.position]||pf.a.position||'',
      pf.normAge!=null?pf.normAge+'y':''].filter(Boolean).join(' · '),
    cells:AB_METRICS.map(mt=>{const c=abCell(pf,mt.id,ref);
      return{lvl:c.level,label:c.level?abLevelName(c.level):'—',pct:c.pct,man:!!c.ov,
        sq:ref===AB_REF_NORM&&c.src==='team'};}),
  }));
  const doPrint=()=>printAthleteBoxes({
    pool:board.pool,teamName:setup.teamName,scopeLabel,refLabel,refNorm:ref===AB_REF_NORM,
    matrix:{cols:AB_METRICS.map(m=>abMetricName(m.id)),rows:matrixOut(),
      key:AB_METRICS.map(m=>({name:abMetricName(m.id),text:abMeaning(m.id)}))},
    rows:board.profiles.map(p=>({
      name:p.a.name||'—',pos:POS_FULL[p.a.position]||posOf(p.a.position),date:p.t?p.t.date:'',
      primary:abBoxName(p.primary.box),pPct:p.primary.pct,
      secondary:p.secondary?abBoxName(p.secondary.box):null,sPct:p.secondary?p.secondary.pct:null,
      strong:p.strong?abBoxName(p.strong.id):null,gPct:p.strong?p.strong.pct:null,
      conf:abConfTxt(p.conf)})),
  });
  /* The copied JSON carries the table as well as the verdict, and says of every
     level whether it was computed or set by hand. */
  const copyAll=()=>abCopy(JSON.stringify(board.profiles.map(p=>({...abJson(p,board),
    reference:refLabel,age:p.normAge,position_group:p.normPos,
    levels:AB_METRICS.reduce((o,mt)=>{const c=abCell(p,mt.id,ref);
      o[abMetricName(mt.id)]={level:c.level?abLevelName(c.level):null,percentile:c.pct,
        read_against:c.src==='norm'?Lx('yaş + pozisyon normu','age + position reference')
                    :c.src==='team'?Lx('takım içi','within-team'):null,
        set_by:c.ov?Lx('manuel','manual'):(c.auto?Lx('otomatik','automatic'):null),
        evidence:abUsedTxt(abCellUsed(p,mt.id,ref))||null};
      return o;},{}),
  })),null,2),Lx('Tüm sporcuların JSON çıktısı kopyalandı.','The JSON for every athlete has been copied.'));

  /* The level menu is rendered on <body> rather than inside the cell it belongs to.
     `.panel:hover` carries a transform, and a transformed ancestor makes a
     position:fixed child resolve against the panel instead of the viewport — which
     is what threw the menu across the screen, nowhere near the cell that opened it.
     Portalled out of the panel, the viewport coordinates taken from the cell's own
     rectangle mean what they say again. */
  /* A fixed menu does not travel with the cell it was opened from, so a scroll or a
     resize closes it instead of leaving it stranded over an unrelated row. */
  useEffect(()=>{
    if(!menu)return;
    const close=()=>setMenu(null);
    window.addEventListener('scroll',close,true);
    window.addEventListener('resize',close);
    return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);};
  },[menu]);
  const menuPf=menu?board.profiles.find(p=>p.id===menu.athId)||null:null;
  const menuCell=menuPf?abCell(menuPf,menu.metric,ref):null;
  /* Centred on the cell, but never past the edge of the window: the right-hand
     qualities sit close enough to the border that an unclamped menu would hang off
     the screen. */
  const menuPos=menu?(()=>{
    const pad=8;
    const left=Math.max(pad,Math.min(menu.cx-AB_MENU_W/2,window.innerWidth-AB_MENU_W-pad));
    return{left,top:menu.up?menu.top-4:menu.bottom+4,up:menu.up};
  })():null;

  return(<div className="panel">
    <div className="row" style={{justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:8}}>
      <h2 style={{margin:0}}>{Lx('Sporcu Seviye Tablosu','Athlete Level Table')}</h2>
      <div className="row" style={{gap:6}}>
        <button className="btn sm sec" disabled={!canPrint} onClick={copyAll}>⧉ {Lx('JSON kopyala','Copy JSON')}</button>
        <button className="btn sm white" disabled={!canPrint} onClick={doPrint}>🖨 {Lx('Çıktı Al (A4)','Print (A4)')}</button>
      </div>
    </div>
    <div className="help" style={{marginBottom:14}}>
      {Lx('Her sporcu dokuz fiziksel özelliğin her birinde bir seviyeye yerleşir: yeşil iyi, sarı ortalama, kırmızı zayıf. Seviye, sporcunun test tarihindeki yaşı ve pozisyonu için literatürden alınan referans değerlere göre üretilir — değer bir z skoruna çevrilir, pozisyonun beklenen farkı düşülür ve percentile olarak okunur. P60 ve üzeri iyi, P40-59 ortalama, P40 altı zayıf. Testi olmayan bir özellik boş kalır, "ortalama" sayılmaz. Bir hücreye tıklayarak seviyeyi elle değiştirebilirsin; elle verilen seviye kesik çerçeve ve ✎ ile işaretlenir. Bir isme tıklayınca o sporcunun gerekçeli değerlendirmesi açılır.',
          'Every athlete gets a level in each of the nine qualities: green good, yellow average, red weak. The level is read against reference values from the literature for the athlete\'s age on the day of the test and their playing position — the value becomes a z score, the position\'s expected difference is taken off, and the result is read back as a percentile. P60 and above is good, P40-59 average, below P40 weak. A quality with no test behind it stays empty rather than counting as average. Click a cell to set the level by hand; a hand-set cell is marked with a dashed border and a ✎. Click a name to open that athlete\'s reasoned assessment.')}
    </div>
    <div className="help" style={{marginBottom:14,opacity:.8}}>
      {Lx('Karşılaştırma grubu her zaman başka sporculardır: her satır antrenmanlı bir popülasyondan alınmıştır — mümkün olan yerde genç basketbolcular, olmayan yerde antrenmanlı genç sporcular. Okul popülasyonu fitness verisi bilerek kullanılmadı; sporcu olmayanlarla kıyaslanan bir takım her yerde "iyi" okur. Antrenmanlı referansı bulunmayan iki özellikte (yatay power ve lateral power) uydurma bir eğri kullanmak yerine takım içi okuma yapılır. Uygulamada cinsiyet alanı olmadığı için kız takımlarında bu mod sistematik olarak düşük okur — o takımlarda "takım içi" referansını seç. Protokol de referansla aynı olmalıdır: drop jump RSI (düşüş yüksekliği, temas süresi), shuttle run (VO2max tahmini) ve ayak bileği lunge testi.',
          'The comparison group is always other athletes: every row is drawn from a trained population — youth basketball players where such a study exists, other trained youth athletes where it does not. School-population fitness data is deliberately not used; a squad measured against non-athletes reads good everywhere. The two qualities with no trained reference — horizontal power and lateral power — are read within the squad rather than against an invented curve. There is no sex field in this app, so on a girls\' squad this mode reads systematically low — pick the within-team reference there. The protocol has to match the reference too: drop-jump RSI (drop height, how contact time is taken), shuttle run (as a VO2max estimate) and the ankle lunge test.')}
    </div>
    <div className="cmp-bar">
      <div className="cmp-fld">
        <label>{Lx('Hangi test','Which test')}</label>
        <select value={scope} onChange={e=>{setScope(e.target.value);setSelId(null);}} style={{width:170}}>
          <option value="latest">{Lx('Son test','Latest test')}</option>
          {TEST_PERIODS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="cmp-fld">
        <label>{Lx('Neye göre','Read against')}</label>
        <select value={ref} onChange={e=>{setRef(e.target.value);setMenu(null);}} style={{width:238}}>
          <option value={AB_REF_NORM}>{Lx(`Literatür normu · ${AB_NORM_AGE0}-${AB_NORM_AGE0+6} yaş`,`Literature reference · ${AB_NORM_AGE0}-${AB_NORM_AGE0+6} yo`)}</option>
          <option value={AB_REF_TEAM}>{Lx('Takım içi percentile','Within-team percentile')}</option>
        </select>
      </div>
      <div className="cmp-fld">
        <label>{Lx('Karşılaştırma havuzu','Comparison pool')}</label>
        <div className="abx-pool">{board.pool} {Lx('sporcu','athletes')}
          {board.pool<AB_MIN_POOL&&<span className="warn"> · {Lx('percentile için yetersiz','too few to rank')}</span>}
          {board.pool>=AB_MIN_POOL&&board.pool<8&&<span className="warn"> · {Lx('percentile kaba','coarse percentiles')}</span>}
        </div>
      </div>
      {!board.strengthNames.length&&<div className="cmp-fld" style={{flex:'1 1 260px',minWidth:220}}>
        <label>{Lx('Kuvvet verisi','Strength data')}</label>
        <div className="abx-pool">{Lx('Kuvvet testi yok — TEMEL KUVVET değerlendirilmedi','No strength test — FOUNDATIONAL STRENGTH not assessed')}</div>
      </div>}
    </div>

    {board.profiles.length===0&&<div className="empty-st">{Lx('Bu dönemde testi olan sporcu yok — başka bir dönem seç ya da test uygula.','No athlete has a test in this period — pick another period or administer a test.')}</div>}

    {board.profiles.length>0&&<>
      {menu&&menuPf&&menuCell&&ReactDOM.createPortal(<>
        <div className="abm-bd" onClick={()=>setMenu(null)}/>
        <div className="abm-menu" style={{left:menuPos.left,top:menuPos.top,
          transform:menuPos.up?'translateY(-100%)':'none'}}>
          <button type="button" className={menuCell.ov?'':'on'} onClick={()=>setLevel(menuPf,menu.metric,null)}>
            <span className="sw l-auto"/>{Lx('Otomatik','Auto')}
            {menuCell.auto?<span style={{marginLeft:'auto',opacity:.6,fontSize:10}}>{abLevelName(menuCell.auto)}</span>:null}
          </button>
          <div className="sep"/>
          {AB_LEVELS.map(l=><button key={l.id} type="button" className={menuCell.ov===l.id?'on':''}
            onClick={()=>setLevel(menuPf,menu.metric,l.id)}>
            <span className={'sw l-'+l.id}/>{abLevelName(l.id)}
          </button>)}
        </div>
      </>,document.body)}
      <div className="abm-wrap">
        <table className="abm">
          <thead><tr>
            <th className="abm-ath">{Lx('Sporcu','Athlete')}</th>
            {AB_METRICS.map(mt=><th key={mt.id}>{abMetricName(mt.id)}</th>)}
          </tr></thead>
          <tbody>
            {rowsView.map(pf=><tr key={pf.id} className={pf.id===selId?'on':''}>
              <th className="abm-ath">
                <button type="button" className="abm-nmb" onClick={()=>setSelId(pf.id===selId?null:pf.id)}>
                  <span className="nm">{pf.a.name||'—'}</span>
                  <span className="sub">{[pf.a.number?'#'+pf.a.number:'',POS_FULL[pf.a.position]||pf.a.position||'',
                    pf.t?'':Lx('test yok','no test')].filter(Boolean).join(' · ')}</span>
                </button>
              </th>
              {AB_METRICS.map(mt=>{
                const c=abCell(pf,mt.id,ref);
                const fell=ref===AB_REF_NORM&&c.src==='team';
                const open=menu&&menu.athId===pf.id&&menu.metric===mt.id;
                /* The tooltip names the yardstick as well as the numbers, because a
                   cell that fell back to the squad means something different from
                   one the reference could answer. */
                const why=c.pct==null
                  ?Lx('Bu özelliği ölçen test girilmemiş','No test on record measures this quality')
                  :[abUsedTxt(abCellUsed(pf,mt.id,ref)),
                    c.src==='norm'
                      ?Lx(`referans: ${pf.normAge==null?'':pf.normAge+' yaş'}${pf.normPos?' · '+(POS_FULL[pf.a.position]||''):''}`,
                          `reference: ${pf.normAge==null?'':pf.normAge+'y'}${pf.normPos?' · '+(POS_FULL[pf.a.position]||''):''}`)
                      :Lx(`referans: takım içi (${board.pool} sporcu)`,`reference: within-team (${board.pool} athletes)`)
                   ].filter(Boolean).join(' — ');
                return(<td key={mt.id} className={'abm-c'+(open?' menu-on':'')}>
                  <button type="button" className={'abm-lv l-'+(c.level||'na')+(c.ov?' man':'')}
                    title={why}
                    onClick={e=>{
                      if(open){setMenu(null);return;}
                      const r=e.currentTarget.getBoundingClientRect();
                      const up=r.bottom+AB_MENU_H>window.innerHeight&&r.top>AB_MENU_H;
                      setMenu({athId:pf.id,metric:mt.id,
                        cx:r.left+r.width/2,top:r.top,bottom:r.bottom,up});
                    }}>
                    <span className="t">{c.level?abLevelName(c.level):'—'}</span>
                    <span className="p">{c.pct==null?(c.ov?Lx('elle','by hand'):Lx('veri yok','no data'))
                      :'P'+c.pct+(fell?' · '+Lx('takım','squad'):'')}</span>
                  </button>
                </td>);
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="abm-legend">
        <span className="it"><span className="sw l-grn"/>{abLevelName('grn')} · P{AB_Z_STRONG}+</span>
        <span className="it"><span className="sw l-yel"/>{abLevelName('yel')} · P{AB_Z_WATCH}–{AB_Z_STRONG-1}</span>
        <span className="it"><span className="sw l-red"/>{abLevelName('red')} · &lt;P{AB_Z_WATCH}</span>
        <span className="it"><span className="sw l-na"/>{Lx('Test yok — değerlendirilmedi','No test — not assessed')}</span>
        <span className="it">✎ {Lx('elle ayarlandı','set by hand')}</span>
        {ref===AB_REF_NORM&&<span className="it">· {Lx('takım','squad')} — {Lx('bu hücrede yaş/pozisyon referansı yok, takım içi okundu','no age/position reference for this cell, read within the squad')}</span>}
      </div>
      <div className="abm-src">
        <button type="button" className="abm-src-t" onClick={()=>setSrcOpen(v=>!v)}>
          {srcOpen?'▾':'▸'} {Lx('Referans değerler nereden geliyor?','Where the reference values come from')}
        </button>
        {srcOpen&&<div className="abm-src-b">
          <p>{Lx('Referans, sporcunun test günündeki yaşı için bir ortalama ve standart sapmadan oluşur. Değer z skoruna çevrilir, süre bazlı testlerde yön ters çevrilir, pozisyonun beklenen farkı referans SD cinsinden düşülür ve sonuç percentile olarak okunur. Seviye eşikleri değişmez: P60+ iyi, P40-59 ortalama, P40 altı zayıf — değişen tek şey kiminle karşılaştırıldığıdır.',
                     'The reference is a mean and an SD for the athlete\'s age on the day of the test. The value becomes a z score, the direction is flipped on time-based tests, the position\'s expected difference is taken off in reference SDs, and the result is read back as a percentile. The level cut-offs do not move — P60+ good, P40-59 average, below P40 weak. The only thing that changes is who the athlete is being compared with.')}</p>
          <p>{Lx(`Referans satırları ${AB_NORM_AGE0}-${AB_NORM_AGE0+6} yaş için kurulmuştur, artı kıdemli için bir satır; bu aralığın dışındaki yaşlar en yakın satıra yuvarlanır. Her özelliğin yanındaki etiket, o satırın hangi yaşlarda gerçekten ÖLÇÜLDÜĞÜNÜ söyler — kalan yaşlar ölçüm değil, iki uç arasında uzatmadır. Kaynakların hepsi antrenmanlı popülasyondur.`,
                     `The reference rows are built for ages ${AB_NORM_AGE0}-${AB_NORM_AGE0+6}, plus one row for senior; ages outside that clamp to the nearest row. The label beside each quality says which ages that row was actually MEASURED at — the remaining ages are not measurements but an extrapolation between the ends. Every source is a trained population.`)}</p>
          <ul>
            {AB_SOURCES.map((x,i)=><li key={i}>
              <b>{Lx(x.tr,x.en)}</b> <span className="ag">{Lx(x.atr,x.aen)}</span> — {Lx(x.str,x.sen)}
            </li>)}
          </ul>
          <p className="warn">{Lx('Pozisyon farkı yalnızca literatürün tutarlı bir fark bildirdiği özelliklere uygulanır: hız/yön değiştirme, iş kapasitesi ve göreceli kuvvet. Dikey power, reaktif kuvvet, hareket kontrolü ve mobilitede pozisyon düzeltmesi yoktur — sıçrama yüksekliği pozisyonlar arasında yalnızca çok az değişir. Yatay ve lateral power\'da zaten antrenmanlı popülasyon referansı olmadığı için pozisyon düzeltmesinin tutunacağı bir şey yoktur. Uygulanan farklar bu çalışmaların bildirdiği küçük-orta etki büyüklükleridir, yayınlanmış pozisyon normları değildir.',
                     'A position difference is applied only to the qualities where the literature reports a consistent one: speed/change of direction, work capacity and relative strength. Vertical power, reactive strength, movement control and mobility carry no position adjustment, because jump height barely differs between positions. Horizontal and lateral power have no trained-population reference in the first place, so there is nothing for a position expectation to attach to. The magnitudes are the small-to-moderate effects those studies report, not published per-position norms.')}</p>
        </div>}
      </div>
    </>}

    {sel&&<AthleteBoxDetail pf={sel} board={board} json={json} setJson={setJson} Lx={Lx}/>}
  </div>);
}

/* One athlete's verdict, in the order §15 asks for it: the two needs and the
   quality to keep, then why, then the week's priorities, then every percentile
   the reading stands on and everything it could not read. */
function AthleteBoxDetail({pf,board,json,setJson,Lx}){
  const why=abWhy(pf),pri=abPriorities(pf),cau=abCaution(pf,board);
  const obj=abJson(pf,board);
  const age=(()=>{const d=pf.a.dateOfBirth;if(!d)return null;const b=parseD(d),t=new Date();
    let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})();
  /* The line under a box name reads the percentile the way that box earned it: a
     deficit score where there is a deficit, and the lowest quality's percentile
     where the verdict was that nothing is missing. */
  const card=(k,box,pct,fallback)=>(<div className="abx-vc" style={{'--vc':box?abBoxColor(box):'var(--dim)'}}>
    <div className="k">{k}</div>
    <div className="v">{box?abBoxName(box):fallback}</div>
    <div className="p">{pct==null?'—'
      :box==='none'?`${Lx('en düşük','lowest')} P${pct} · ${abZoneTxt(pct)}`
      :`P${pct} · ${abZoneTxt(pct)} · ${Lx('deficit','deficit')} ${abDeficit(pct)}`}</div>
  </div>);
  return(<div className="abx-dt">
    <div className="abx-dt-h">
      <div style={{flex:1,minWidth:200}}>
        <div className="abx-dt-nm">{pf.a.name||'—'}</div>
        <div className="abx-dt-sub">{[pf.a.number?'#'+pf.a.number:'',POS_FULL[pf.a.position]||pf.a.position||'',
          age!=null?age+'y':'',pf.t?fd(pf.t.date):Lx('bu dönemde test yok','no test in this period')].filter(Boolean).join(' · ')}</div>
      </div>
      <div className={'abx-conf c-'+pf.conf}>{Lx('Güven düzeyi','Confidence')}: {abConfTxt(pf.conf)}</div>
      <button className="btn xs sec" onClick={()=>setJson(v=>!v)}>{json?Lx('JSON gizle','Hide JSON'):Lx('JSON göster','Show JSON')}</button>
      <button className="btn xs sec" onClick={()=>abCopy(JSON.stringify(obj,null,2),Lx('JSON kopyalandı.','JSON copied.'))}>⧉</button>
    </div>

    <div className="abx-verd">
      {card(Lx('Ana ihtiyaç','Main need'),pf.primary.box,pf.primary.pct)}
      {card(Lx('İkincil ihtiyaç','Secondary need'),pf.secondary?pf.secondary.box:null,pf.secondary?pf.secondary.pct:null,
        Lx('Yok — P40 altında ikinci açık yok','None — no second deficit below P40'))}
      {card(pf.strong&&pf.strong.pct>=AB_Z_STRONG?Lx('Korunacak güçlü özellik','Strength to keep')
                                                 :Lx('En yüksek percentile','Highest percentile'),
        pf.strong?pf.strong.id:null,pf.strong?pf.strong.pct:null,Lx('Değerlendirilemedi','Not assessed'))}
    </div>

    <div className="abx-sec">
      <h4>{Lx('Neden?','Why?')}</h4>
      <p className="abx-why">{why.join(' ')}</p>
    </div>

    <div className="abx-sec">
      <h4>{Lx('Antrenman önceliği','Training priority')}</h4>
      <ol className="abx-pri">{pri.map((x,i)=><li key={i}>{x}</li>)}</ol>
    </div>

    {pf.rank.length>0&&<div className="abx-sec">
      <h4>{Lx('Okunan özellikler','What was read')}</h4>
      <div className="abx-rows">
        {pf.rank.map(r=><div key={r.id} className="abx-r">
          <span className="lb" style={{color:abBoxColor(r.id)}}>{abBoxName(r.id)}</span>
          <span className="tt">{abUsedTxt(pf.used[r.id])}</span>
          <span className="bar"><i className={'f zf-'+abZone(r.pct)} style={{width:Math.max(2,r.pct)+'%'}}/></span>
          <span className={'pc pz-'+abZone(r.pct)}>P{r.pct}</span>
        </div>)}
      </div>
    </div>}

    {pf.unassessed.length>0&&<div className="abx-sec">
      <h4>{Lx('Değerlendirilemedi','Not assessed')}</h4>
      <div className="abx-un">{pf.unassessed.map(id=><span key={id} className="abx-ut">{abBoxName(id)}</span>)}</div>
    </div>}

    <div className="abx-cau">{cau.map((c,i)=><div key={i}>{c}</div>)}</div>

    {json&&<pre className="abx-json">{JSON.stringify(obj,null,2)}</pre>}
  </div>);
}

