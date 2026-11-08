/* =========================================================
   GENERIC REPORTS RENDERER (used by team & athletes)
   ========================================================= */
function ReportsBody({days,weeks,selected,setSelected,ownerName,onExportPDF}){
  const{year,month}=selected;const ms=`${year}-${pad(month)}-01`;const me=fmt(new Date(year,month,0));
  const mWeeks=useMemo(()=>{const o=[];let c=sow(parseD(ms));while(c<=parseD(me)){const s=fmt(c),e=fmt(addD(c,6));
    o.push({wkStart:s,wkEnd:e,...weekMono(dailyLoads(days,s,e))});c=addD(c,7);}return o;},[days,ms,me]);
  const pMix=useMemo(()=>{const t={};Object.values(days).forEach(d=>{if(!d?.date||d.date<ms||d.date>me)return;
    (d.sessions||[]).forEach(s=>{const dur=+s.duration||0;t[s.purpose]=(t[s.purpose]||0)+dur;});});
    const tot=Object.values(t).reduce((a,b)=>a+b,0);
    return Object.entries(t).map(([k,v])=>({label:k,min:v,pct:tot?(v/tot*100):0})).sort((a,b)=>b.pct-a.pct);},[days,ms,me]);
  const acwrVal=useMemo(()=>calcACWR(days,fmt(today)),[days]);
  const acwrCls=acwrVal>1.5?'danger':acwrVal>=.8&&acwrVal<=1.3?'ok':'warn';
  const sLS=useMemo(()=>{if(!weeks?.length)return[];return weeks.map(w=>{const e=fmt(addD(parseD(w.week),6));
    const l=dailyLoads(days,w.week,e);return{week:w.week,load:l.reduce((a,b)=>a+b.load,0),target:w.volume*w.intensity/10};});},[weeks,days]);
  // daily sRPE chart for selected month
  const dailySRPE=useMemo(()=>{const out=[];let c=parseD(ms),e=parseD(me);while(c<=e){const k=fmt(c);out.push({date:k,sRPE:dSRPEAvg(days[k]),au:dLoad(days[k])});c=addD(c,1);}return out;},[days,ms,me]);

  return(<div>
    <div className="metrics">
      <div className={`metric ${acwrCls}`}><div className="ml">{L('ACWR (bugün)','ACWR (today)')}</div><div className="mv">{acwrVal.toFixed(2)}</div><div className="mh">{L('Güvenli 0.8-1.3 · Risk >1.5','Safe 0.8-1.3 · Risk >1.5')}</div></div>
      <div className="metric"><div className="ml">{L('Ay toplamı','Month total')}</div><div className="mv">{Math.round(mWeeks.reduce((a,b)=>a+b.total,0))}</div><div className="mh">{L('AU = sRPE × dk','AU = sRPE × min')}</div></div>
      <div className="metric"><div className="ml">{L('Ortalama monotonluk','Mean monotony')}</div><div className="mv">{(mWeeks.filter(w=>w.monotony>0).reduce((a,b)=>a+b.monotony,0)/Math.max(1,mWeeks.filter(w=>w.monotony>0).length)).toFixed(2)}</div><div className="mh">{L('>2 = aşırı','>2 = excessive')}</div></div>
      <div className="metric"><div className="ml">{L('Kaydedilen seanslar','Sessions logged')}</div><div className="mv">{Object.values(days).filter(d=>d?.date>=ms&&d?.date<=me).reduce((a,d)=>a+(d.sessions||[]).length,0)}</div><div className="mh">{L(`${exLabel(MN[month-1])} ${year} içinde`,`in ${MN[month-1]} ${year}`)}</div></div>
    </div>

    <div className="grid cols-2">
      <div className="panel"><h2>{L('Günlük sRPE','Daily sRPE')} — {MN[month-1]} {year}</h2><div className="chart-box sm">
        <ChartC type="line" chartData={{labels:dailySRPE.map(d=>fd(d.date).slice(0,5)),datasets:[
          {label:'sRPE (0-10)',data:dailySRPE.map(d=>+d.sRPE.toFixed(1)),borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,.15)',tension:.25,fill:true,borderWidth:2,yAxisID:'y'},
          {label:L('Günlük AU','Daily AU'),data:dailySRPE.map(d=>d.au),borderColor:'#f97316',tension:.25,borderWidth:2,yAxisID:'y1'}]}}
          options={{responsive:true,maintainAspectRatio:false,...CHART_DARK,scales:{x:CHART_DARK.scales.x,y:{...CHART_DARK.scales.y,position:'left',max:10,title:{display:true,text:'sRPE',color:'#94a3b8'}},y1:{position:'right',ticks:{color:'#94a3b8'},grid:{drawOnChartArea:false},beginAtZero:true,title:{display:true,text:'AU',color:'#94a3b8'}}},plugins:{legend:{position:'bottom',labels:CHART_DARK.plugins.legend.labels}}}}/>
      </div></div>
      <div className="panel"><h2>{L('Haftalık Monotonluk','Weekly Monotony')}</h2><div className="chart-box sm">
        <ChartC type="bar" chartData={{labels:mWeeks.map(w=>fd(w.wkStart).slice(0,5)),datasets:[{label:L('Monotonluk','Monotony'),data:mWeeks.map(w=>+w.monotony.toFixed(2)),
          backgroundColor:mWeeks.map(w=>w.monotony>0?monoZoneOf(w.monotony).dot:'#2e333c')}]}}
          options={{responsive:true,maintainAspectRatio:false,...CHART_DARK,plugins:{legend:{display:false}}}}/>
      </div></div>
    </div>

    <div className="grid cols-2">
      <div className="panel"><h2>{L('Antrenman Amacı Dağılımı','Training Purpose Distribution')}</h2><div className="chart-box sm">
        {pMix.length>0?<ChartC type="doughnut" chartData={{labels:pMix.map(p=>exLabel(p.label)),datasets:[{data:pMix.map(p=>+p.pct.toFixed(1)),
          backgroundColor:['#06b6d4','#8b5cf6','#f97316','#ec4899','#10b981','#f59e0b','#ef4444','#22d3ee','#a855f7','#84cc16','#f43f5e']}]}}
          options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#334155'}}}}}/>
        :<div className="empty-st">{L('Bu ay için veri yok','No data for this month')}</div>}
      </div></div>
      <div className="panel"><h2>{L('Haftalık Detay','Weekly Detail')}</h2>
        <table><thead><tr><th>{L('Hafta','Week')}</th><th>{L('Toplam','Total')}</th><th>{L('Ort.','Mean')}</th><th>SD</th><th>{L('Mono','Mono')}</th><th>{L('Zorlanma','Strain')}</th><th>{L('İşaret','Flag')}</th></tr></thead><tbody>
          {mWeeks.map(w=><tr key={w.wkStart}><td>{fd(w.wkStart).slice(0,5)}</td><td>{Math.round(w.total)}</td><td>{w.mean.toFixed(0)}</td><td>{w.sd.toFixed(1)}</td>
            <td>{w.monotony.toFixed(2)}</td><td>{Math.round(w.strain)}</td>
            <td>{w.monotony>0?<span className="pill" style={{color:monoZoneOf(w.monotony).c,borderColor:monoZoneOf(w.monotony).c+'55',background:monoZoneOf(w.monotony).c+'1f'}}>{exLabel(monoZoneOf(w.monotony).t)}</span>:'—'}</td></tr>)}</tbody></table>
      </div>
    </div>
  </div>);
}

/* =========================================================
   YÜK RAPORU VERİSİ — haftalık ve aylık çıktının ortak kurucusu
   =========================================================
   Her sayı ekrandakiyle aynı yoldan: sporcunun günlük yükü athDayLoad, haftalık monotoni
   teamWeekMono (sporcu başına, sonra ortalama), ACWR teamLoadStats (sporcu başına, sonra
   ortalama). Yük "sporcu başına ortalama AU" olarak verilir (o gün/hafta yük kaydı olan
   sporcuların ortalaması); takım toplamı sporcu tablosunun alt satırında.
   Antrenman türü: sessionType (Kuvvet, Takım antrenmanı, Hız…). Antrenman odağı: seansın
   odak listesi (sesFocus) — çok odaklı bir seansın süresi odaklarına EŞİT bölünür; böylece
   dağılımın toplamı gerçek antrenman dakikasına eşit kalır. (Eski çıktı `purpose` metnini
   olduğu gibi grupluyordu: "Strength, Power, …" gibi her birleşim ayrı bir satır oluyordu.) */
const RPT_TYPE_LBL={strength:['Kuvvet & Güç','Strength & Power'],practice:['Takım antrenmanı','Team practice'],speed:['Hız & Çeviklik','Speed & Agility'],
  recovery:['Toparlanma','Recovery'],match:['Maç','Match'],endurance:['Kondisyon','Conditioning']};
const RPT_TYPE_COL={strength:'#16a34a',practice:'#f97316',speed:'#9333ea',recovery:'#0d9488',match:'#dc2626',endurance:'#0891b2'};
const RPT_PAL=['#1f7cc2','#16a34a','#9333ea','#f97316','#0891b2','#db2777','#ca8a04','#dc2626','#4f46e5','#65a30d','#0d9488','#78716c'];
function buildLoadReport({team,kind,from,to,label,dayLoad,teamFirst,plannedByDay}){
  const tk=fmt(today);
  const ref=to<=tk?to:(from<=tk?tk:to);
  const ath=(team.athletes||[]);
  const days=[];for(let c=parseD(from);fmt(c)<=to;c=addD(c,1))days.push(fmt(c));
  const weekStarts=[];for(let c=sow(parseD(from));fmt(c)<=to;c=addD(c,7))weekStarts.push(fmt(c));
  const mean=a=>{const v=a.filter(x=>x!=null&&!isNaN(x));return v.length?v.reduce((x,y)=>x+y,0)/v.length:null;};
  /* Henüz gelmemiş günler sayılmaz: ayın ortasında basılan aylık rapor, planlanmış ama
     yapılmamış seansları "yapılmış" gibi göstermesin (yük, gün, seans, dağılım, haftalar). */
  const done=days.filter(k=>k<=tk);
  /* Günlük: yük kaydı olan sporcuların ortalaması; kayıt yoksa (geçmiş günde) takımın planı. */
  const daily=days.map(k=>{const v=ath.map(a=>athDayLoad(a,k)).filter(x=>x>0);
    const ses=(((team.days||{})[k]||{}).sessions||[]).map(s=>({name:s.name||'',type:sessionType(s),duration:Number(s.duration)||0}));
    return{k,fut:k>tk,avg:v.length?v.reduce((x,y)=>x+y,0)/v.length:(k<=tk?(plannedByDay[k]||0):0),n:v.length,ses};});
  /* Seanslar: tür ve odak dağılımı (dakika). */
  const typeM={},focM={};let nSes=0,mins=0;
  done.forEach(k=>(((team.days||{})[k]||{}).sessions||[]).forEach(s=>{const d=Number(s.duration)||0;nSes++;mins+=d;if(!d)return;
    const t=sessionType(s);(typeM[t]||(typeM[t]={min:0,n:0}));typeM[t].min+=d;typeM[t].n++;
    const fs=sesFocus(s);const keys=fs.length?fs:['—'];keys.forEach(f=>{(focM[f]||(focM[f]={min:0,n:0}));focM[f].min+=d/keys.length;focM[f].n++;});}));
  const dist=(m,lab,col)=>{const tot=Object.values(m).reduce((x,y)=>x+y.min,0);
    return Object.entries(m).map(([k,v],i)=>({key:k,label:lab(k),color:col(k,i),min:Math.round(v.min),n:v.n,pct:tot?v.min/tot*100:0})).sort((x,y)=>y.min-x.min);};
  const types=dist(typeM,k=>L(...(RPT_TYPE_LBL[k]||[k,k])),k=>RPT_TYPE_COL[k]||'#78716c');
  const focus=dist(focM,k=>k==='—'?L('Belirtilmemiş','Not set'):focusLabel(k),(k,i)=>k==='—'?'#a8a29e':RPT_PAL[i%RPT_PAL.length]);
  focus.forEach((f,i)=>{if(f.key!=='—')f.color=RPT_PAL[i%RPT_PAL.length];});
  /* Haftalar: ay için ayın haftaları; hafta için o hafta ve önceki üç hafta (bağlam). */
  const wks=(kind==='week'?[-3,-2,-1,0].map(o=>fmt(addD(parseD(from),o*7))):weekStarts).map(ws=>{
    const we=fmt(addD(parseD(ws),6));const wr=we<=tk?we:(ws<=tk?tk:we);
    const m=teamWeekMono(team.days,ath,ws);
    const loads=ath.map(a=>athLoadSum(a,ws,we)).filter(x=>x>0);
    return{ws,we,fut:ws>tk,load:loads.length?loads.reduce((x,y)=>x+y,0)/loads.length:m.total,mono:m.monotony,strain:m.strain,
      acwr:ws>tk?0:teamLoadStats(ath,dayLoad,wr,teamFirst).acwr};});
  /* Sporcular. */
  const cols=kind==='week'?days.map((k,i)=>({k,lab:DN[i]})):weekStarts.map(ws=>({k:ws,lab:fd(ws).slice(0,5)}));
  const rows=ath.map(a=>{
    const v=kind==='week'?days.map(k=>athDayLoad(a,k)):weekStarts.map(ws=>athLoadSum(a,ws<from?from:ws,fmt(addD(parseD(ws),6))>to?to:fmt(addD(parseD(ws),6))));
    const total=v.reduce((x,y)=>x+y,0);
    const monos=weekStarts.map(ws=>weekMono(athWeekLoads(a,ws)).monotony).filter(x=>x>0);
    const w=athLoadWindows(a,ref);
    const rpe=mean(days.map(k=>athDayRPE(a,k)));
    const rd=mean((a.wellness||[]).filter(x=>x.date>=from&&x.date<=to&&x.readiness!==''&&x.readiness!=null).map(x=>Number(x.readiness)));
    return{name:a.name||'—',pos:posOf(a.position)||'',v,total,acwr:w.ch>0?athACWR(a,ref):null,mono:mean(monos),rpe,rd};
  }).sort((x,y)=>y.total-x.total);
  const active=rows.filter(r=>r.total>0);
  const tm=kind==='week'?teamWeekMono(team.days,ath,from):null;
  const past=wks.filter(w=>!w.fut&&(kind==='week'||w.we>=from));
  const monoAvg=kind==='week'?tm.monotony:mean(past.map(w=>w.mono).filter(x=>x>0));
  const strainAvg=kind==='week'?tm.strain:mean(past.map(w=>w.strain).filter(x=>x>0));
  const acwr=teamLoadStats(ath,dayLoad,ref,teamFirst).acwr;
  const wl=ath.flatMap(a=>(a.wellness||[]).filter(x=>x.date>=from&&x.date<=to));
  const rdAll=mean(wl.map(x=>x.readiness===''||x.readiness==null?null:Number(x.readiness)));
  return{kind,label,teamName:(team.setup&&team.setup.teamName)||'',from,to,ref,
    partial:done.length<days.length,
    kpi:{load:mean(active.map(r=>r.total))||0,nAth:active.length,trainDays:daily.filter(d=>d.avg>0).length,nDays:done.length,
      nSes,mins,mono:monoAvg||0,strain:strainAvg||0,acwr,rd:rdAll,rpe:mean(rows.map(r=>r.rpe))},
    daily,weeks:wks,types,focus,cols,rows,colTot:cols.map((_,i)=>rows.reduce((x,r)=>x+(r.v[i]||0),0))};
}

/* =========================================================
   TEAM REPORTS
   ========================================================= */
function TeamReports({team,weeks,selected,setSelected}){
  const{year,month}=selected;
  const ms=`${year}-${pad(month)}-01`;
  const me=fmt(new Date(year,month,0));
  // Planned team load (AU) by date = sum of that day's team-plan session AU (the
  // value shown in the calendar). Used as a fallback so a day that is planned but
  // has no athlete sRPE log still registers its load in the trend & reports.
  const plannedByDay=useMemo(()=>plannedDayLoadMap(team.days),[team.days]);
  // Team daily load (AU) by date — the shared map the calendar's monotony chip also
  // reads, so the two screens agree by construction. Drives the trend chart, monotony
  // & strain here.
  const teamDaily=useMemo(()=>teamDailyLoadMap(team.days,team.athletes),[team.days,team.athletes]);
  const dayLoad=d=>Math.round(teamDaily[d]||0);
  // Load Monitoring uses the same calendar-matching session-AU sum everywhere (trend, ACWR, monotony).
  const dayAvg=dayLoad;
  /* The squad's first day with load, so the team curve's chronic side divides by four
     weeks once its record is that long (see loadWindows). */
  const teamFirst=useMemo(()=>firstLoadKey(teamDaily),[teamDaily]);


  const refDate=me<=fmt(today)?me:fmt(today);   // end of selected month, capped at today
  // ---- Load Monitoring summary (acute/chronic means, monotony, strain) at the selected week's end ----
  const[lmWeek,setLmWeek]=useState(()=>fmt(sow(parseD(refDate))));   // Archivoy of the reference week
  const lmEnd=fmt(addD(parseD(lmWeek),6));                            // Sunday of that week
  // Metrics reference date: the selected week's Sunday, but never a future day. For the
  // in-progress week the Sunday hasn't happened yet, and using it pads the acute window
  // with empty future days (steady 500 AU/day reads ACWR 0.18 on Archivoy instead of 1.00).
  const lmRef=lmEnd<=fmt(today)?lmEnd:fmt(today);
  // Acute (7d) / chronic (28d) / ACWR averaged per athlete, like the monotony below.
  const lmLoad=teamLoadStats(team.athletes,dayAvg,lmRef,teamFirst);
  // Monotony / SD / strain come from the selected Mon–Sun week via the shared helper, so
  // this card and the calendar's chip report the identical number for the same week.
  const mWk=teamWeekMono(team.days,team.athletes,lmWeek);
  const lmMonoZone=monoZoneOf(mWk.monotony);   // monotony sits in a small tile under the ACWR
  const lmAcwrZ=acwrZoneOf(lmLoad.acwr,lmLoad.acwr>0);
  const[lmWin,setLmWin]=useState(7);
  // Per-day daily load + rolling acute(7d)/chronic(28d) means, over the trend window.
  // The window always ENDS on the selected week's Sunday (not on `lmRef`, which is clamped
  // to today) — every window length is a multiple of 7, so the chart always reads
  // Archivoy → Sunday. Days still ahead simply plot as 0.
  const lmTrend=useMemo(()=>{const out=[];const tk=fmt(today);
    for(let i=lmWin-1;i>=0;i--){
      const k=fmt(addD(parseD(lmEnd),-i));const daily=dayAvg(k);
      // Rolling means are left blank past today: their windows would be padded with days
      // that simply haven't happened yet and the lines would nosedive at the week's end.
      if(k>tk){out.push({k,daily,acute:null,chronic:null});continue;}
      const w=loadWindows(dayAvg,k,teamFirst);const a=w.ac/7,c=w.ch/(w.weeks*7);
      out.push({k,daily,acute:Math.round(a),chronic:Math.round(c)});}
    return out;},[teamDaily,teamFirst,lmEnd,lmWin]);
  // Aynı günlerin takım ortalaması HR bölgeleri (Polar) — günün yük çubuğunun içinde, bölge payına göre (429).
  const lmZ=useTeamHrZones(team.id,lmTrend.map(d=>d.k));
  const lmDaily=lmTrend.map(d=>d.daily);
  const lmZs=pwZoneDatasets(lmZ,lmDaily);
  const lmZOn=lmDaily.map((_,i)=>lmZs.length>0&&!!pwZoneDay(lmZ,lmDaily,i));

  const monthLabel=MN[month-1]+' '+year;
  /* Haftalık ve aylık rapor aynı kurucudan (buildLoadReport): ekrandaki kartla, takvimle ve
     panoyla aynı hesaplar (sporcu başına monotoni ve ACWR, sonra ortalama). */
  const rptBase={team,dayLoad,teamFirst,plannedByDay};
  const printMonthly=()=>printLoadReport(buildLoadReport({...rptBase,kind:'month',from:ms,to:me,label:monthLabel}));
  // Haftalık rapor: Yük Takibi'nde seçili hafta (Haftalık Görünüm'ün hafta seçicisi).
  const printWeekly=()=>{const wkS=lmWeek,wkE=fmt(addD(parseD(wkS),6));
    printLoadReport(buildLoadReport({...rptBase,kind:'week',from:wkS,to:wkE,label:fd(wkS)+' – '+fd(wkE)}));};

  const stepMonth=n=>{const d=new Date(year,month-1+n,1);const y=d.getFullYear(),m=d.getMonth()+1;
    setSelected({...selected,year:y,month:m,date:`${y}-${pad(m)}-01`});};
  const fwd=ds=>{const d=parseD(ds);return d.getDate()+' '+MN[d.getMonth()];};

  return(<div>
    <PageHero title={L('Yük Takibi','Load Monitoring')}
      sub={L(`Haftalık ve aylık yük, monotoni ve ACWR · ${team.setup.teamName}`,
             `Weekly and monthly load, monotony and ACWR · ${team.setup.teamName}`)}
      stats={[{v:monthLabel,l:L('Rapor ayı','Report month')},
              {v:(team.athletes||[]).length,l:L('Sporcu','Athletes')}]}>
      <button className="btn sec sm" onClick={printWeekly}>{L('Haftalık Rapor','Weekly Report')}</button>
      <button className="btn sm" onClick={printMonthly}>{L('Aylık Rapor','Monthly Report')}</button>
    </PageHero>
    {/* Rapor seçici: ay ve hafta ‹ › ile, her birinin yanında kendi çıktısı. Haftalık rapor
        aşağıdaki Haftalık Görünüm'le aynı haftayı basar (ikisi aynı seçimi paylaşır). */}
    <div className="panel rp-bar">
      <div className="rp-grp">
        <span className="rp-k">{L('Aylık rapor','Monthly report')}</span>
        <div className="rp-step">
          <button onClick={()=>stepMonth(-1)} title={L('Önceki ay','Previous month')}>‹</button>
          <b>{monthLabel}</b>
          <button onClick={()=>stepMonth(1)} title={L('Sonraki ay','Next month')}>›</button>
        </div>
        <button className="btn sm" onClick={printMonthly}>{L('Aylık Rapor Al','Print Monthly')}</button>
      </div>
      <div className="rp-grp">
        <span className="rp-k">{L('Haftalık rapor','Weekly report')}</span>
        <div className="rp-step">
          <button onClick={()=>setLmWeek(fmt(addD(parseD(lmWeek),-7)))} title={L('Önceki hafta','Previous week')}>‹</button>
          <b>{fwd(lmWeek)} – {fwd(lmEnd)}</b>
          <button onClick={()=>setLmWeek(fmt(addD(parseD(lmWeek),7)))} title={L('Sonraki hafta','Next week')}>›</button>
        </div>
        <button className="btn sec sm" onClick={printWeekly}>{L('Haftalık Rapor Al','Print Weekly')}</button>
      </div>
      <div className="rp-note">{L('Raporlar A4 yatay basılır: göstergeler, günlük yük, ACWR ve monotoni, antrenman türü ve odağı dağılımı, sporcu tablosu.','Reports print on A4 landscape: key metrics, daily load, ACWR and monotony, training type and focus split, athlete table.')}</div>
    </div>

    <div className="lm-head" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:16}}>
      <div>
        <div className="lm-title">{L('Haftalık Görünüm','Week View')}</div>
        <div className="lm-sub">{L('Akut:kronik iş yükü, antrenman monotonluğu ve wellness trendleri','Acute:chronic workload, training monotony & wellness trends')}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div className="lm-wksel">
          <button onClick={()=>setLmWeek(fmt(addD(parseD(lmWeek),-7)))} title={L('Önceki hafta','Previous week')}>‹</button>
          <span className="lm-wklbl"><span className="lm-wkk">{L('Hafta','Week of')}</span>{fwd(lmWeek)} – {fwd(lmEnd)}</span>
          <button onClick={()=>setLmWeek(fmt(addD(parseD(lmWeek),7)))} title={L('Sonraki hafta','Next week')}>›</button>
          <button className="lm-wknow" onClick={()=>setLmWeek(fmt(sow(today)))} title={L('Bu haftaya git','Jump to current week')}>{L('Şimdi','Now')}</button>
        </div>
        <div className="lb-seg">
          {[7,14,21].map(n=><button key={n} className={lmWin===n?'on':''} onClick={()=>setLmWin(n)}>{n}d</button>)}
        </div>
      </div>
    </div>

    <div className="lm-grid" style={{marginBottom:16}}>
      {/* Büyük sayı takımın ortalama ACWR'ı (her sporcunun akut ÷ kronik oranı, sonra ortalama);
          haftanın monotonisi alttaki küçük kutulardan birinde. */}
      <div className="lm-gauge-card">
        <div className="lac-head">
          <span className="lac-title">{L('Ort. ACWR','Avg ACWR')}</span>
          <span className="lac-zone" style={{color:lmAcwrZ.dot}}><span className="lac-zdot" style={{background:lmAcwrZ.dot}}/>{exLabel(lmAcwrZ.t||'').toUpperCase()}</span>
        </div>
        <div className="lac-sub">{L(`Akut:kronik · ${lmLoad.n||0} sporcu ortalaması`,`Acute:chronic · avg across ${lmLoad.n||0} athlete${(lmLoad.n||0)===1?'':'s'}`)}</div>
        <div className="lac-val" style={{color:lmAcwrZ.c}}>{lmLoad.acwr?lmLoad.acwr.toFixed(2):'—'}</div>
        <div className="lac-vsub">{L('her sporcunun akut ÷ kronik oranı, sonra ortalama','each athlete\'s acute ÷ chronic, averaged')}</div>
        <AcwrBar value={lmLoad.acwr}/>
        <div className="lm-mini">
          <div className="m"><span className="mi">⚡</span><div className="mc"><div className="k">{L('Akut · 7g','Acute · 7d')}</div><div className="v" style={{color:'#3b6ef5'}}>{Math.round(lmLoad.acute).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
          <div className="m"><span className="mi">▤</span><div className="mc"><div className="k">{L('Kronik · 28g','Chronic · 28d')}</div><div className="v">{Math.round(lmLoad.chronic).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
          <div className="m" title={L(`Foster · ${mWk.n||0} sporcu ortalaması · ${exLabel(lmMonoZone.t||'')}`,`Foster · avg across ${mWk.n||0} athletes · ${lmMonoZone.t||''}`)}><span className="mi">∿</span><div className="mc"><div className="k">{L('Monotoni','Monotony')}</div><div className="v" style={{color:lmMonoZone.c}}>{mWk.monotony?mWk.monotony.toFixed(2):'—'}</div></div></div>
          <div className="m"><span className="mi">◍</span><div className="mc"><div className="k">{L('Zorlanma','Strain')}</div><div className="v">{Math.round(mWk.strain).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
        </div>
      </div>
      <div className="lm-trend-card">
        <div className="lm-th">
          <div><h3 style={{display:'inline'}}>{L('Takım Yük Trendi','Team Load Trend')}</h3><span className="lm-th-sub">{L(`sporcu başına ort. AU · akut ve kronik${lmZs.length?' · HR Zone dağılımı çubuk içinde':''} · ${lmWin} gün · Pzt–Paz`,`avg AU / athlete · acute & chronic${lmZs.length?' · HR zone split inside the bar':''} · ${lmWin} days · Mon–Sun`)}</span></div>
        </div>
        <div className="chart-box" style={{flex:1,minHeight:240}}>
          {/* One week fits weekday names; longer windows would crowd, so those stay dd/mm. */}
          <ChartC type="bar" chartData={{labels:lmTrend.map(d=>lmWin===7?DN[(parseD(d.k).getDay()+6)%7]:fd(d.k).slice(0,5)),datasets:[
            {type:'bar',label:L('Günlük','Daily'),data:lmTrend.map((d,i)=>lmZOn[i]?null:d.daily),stack:'load',yAxisID:'y',backgroundColor:vGrad('rgba(99,140,255,.95)','rgba(59,110,245,.12)'),hoverBackgroundColor:vGrad('rgba(130,165,255,1)','rgba(59,110,245,.3)'),borderRadius:7,borderSkipped:false,order:3,categoryPercentage:.82,barPercentage:.9},
            {type:'line',label:L('Akut 7g','Acute 7d'),data:lmTrend.map(d=>d.acute),borderColor:'#f59e0b',backgroundColor:vGrad('rgba(245,158,11,.28)','rgba(245,158,11,0)'),tension:.4,borderWidth:2.5,pointRadius:0,pointHoverRadius:5,pointBackgroundColor:'#f59e0b',fill:true,order:1,stack:'acute'},
            {type:'line',label:L('Kronik 28g','Chronic 28d'),data:lmTrend.map(d=>d.chronic),borderColor:'#a78bfa',backgroundColor:'#a78bfa',borderDash:[6,5],tension:.4,borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:false,order:2,stack:'chronic'},
            ...lmZs
          ]}}
            options={{responsive:true,maintainAspectRatio:false,...CHART_DARK,
              interaction:{mode:'index',intersect:false},hover:{mode:'index',intersect:false},
              // Bölgeler günün yük çubuğunun dilimleri: yük ve bölgeler aynı `load` yığınında, tek
              // çubuk. Eksen yığınlı; akut ve kronik çizgiler kendi yığınlarında, toplanmazlar.
              scales:{x:{...CHART_DARK.scales.x,stacked:true,ticks:{...CHART_DARK.scales.x.ticks,maxTicksLimit:9,autoSkip:true,maxRotation:0}},y:{...CHART_DARK.scales.y,stacked:true}},
              plugins:{legend:{display:true,position:'top',align:'end',labels:{color:'#cdd3dc',font:{size:11,family:"'Archivo','IBM Plex Mono',monospace"},usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:14,sort:(a,b)=>a.datasetIndex-b.datasetIndex}},
                tooltip:{mode:'index',intersect:false,filter:i=>i.raw!=null,callbacks:{
                  title:items=>{const d=lmTrend[items[0].dataIndex];if(!d)return'';const dt=parseD(d.k);return `${MN[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;},
                  // Bölgeye bölünen günde "Günlük" dilimlerin toplamı olarak başta yazılır.
                  beforeBody:items=>{const ix=items[0]&&items[0].dataIndex;return lmZOn[ix]?`${L('Günlük','Daily')}: ${Math.round(lmDaily[ix])}`:'';},
                  label:i=>i.dataset.zmin?`${i.dataset.label}: ${i.dataset.zmin[i.dataIndex]} ${L('dk','min')} · ${pwPct(i.dataset.zpct[i.dataIndex])}`:`${i.dataset.label}: ${Math.round(i.parsed.y)}`,
                  // Yükü olmayan günde bölge dilimi çizilemez: dakikalar burada yazılır.
                  footer:items=>{const ix=items[0]&&items[0].dataIndex;const p=lmZ.per[ix];if(!p||!p.n)return'';
                    const head=L(`HR Zone: ${p.n} sporcunun ortalaması`,`HR zones: mean of ${p.n} athletes`);
                    return lmZOn[ix]?head:[head,p.avg.map((v,z)=>`Z${z+1} ${Math.round(v/6)/10}`).join(' · ')+' '+L('dk','min')];}}}}}}/>
        </div>
        <TeamHrZoneSummary Z={lmZ}/>
      </div>
    </div>

    <AthleteLoadBoard athletes={team.athletes} refDate={lmRef} teamId={team.id}/>

    <MonotonyPanel team={team} refWeek={lmWeek}/>

    {/* Training Purpose Distribution is not on this screen any more. Minutes by purpose
        say what was PLANNED, not what the squad carried, and read beside monotony and
        ACWR — which are both built from what the athletes actually logged — it invited
        the two to be compared. The figure is still computed above and still printed on
        the weekly report, which is where it is read against the plan it belongs to. */}
  </div>);
}

/* =========================================================
   HAFTALIK MONOTONLUK — seçilebilir haftalar
   =========================================================
   Üstte on haftalık şerit: her hafta bir kutu (tarih, takımın monotonluğu, bant rengi);
   tıklanan hafta seçilir, ‹ › şeridi dört hafta kaydırır. Grafik aynı on haftayı Foster
   bantlarının üstünde gösterir (seçili hafta tam renk, öbürleri soluk; çubuğa tıklamak da
   seçer). Sağdaki kart seçili haftanın özeti: monotonluk ve bandı, geçen haftaya göre fark,
   ölçek, toplam / günlük ortalama / SS / zorlanma. Altta haftanın NEDENİ: Pzt–Paz takımın
   günlük ortalama yükü, ortalama çizgisi ve ±SS bandıyla (çubuklar birbirine ne kadar
   benzerse monotonluk o kadar yüksek) ve sporcu sporcu monotonluk, yükseğinden düşüğüne.
   Hesap kartla ve takvimle aynı: teamWeekMono (sporcu başına, sonra ortalama). */
function MonotonyPanel({team,refWeek}){
  const curWk=fmt(sow(today));
  const start=refWeek&&refWeek<=curWk?refWeek:curWk;
  const[endWk,setEndWk]=useState(start);
  const[sel,setSel]=useState(start);
  useEffect(()=>{if(refWeek&&refWeek<=curWk){setSel(refWeek);
    setEndWk(e=>refWeek>e||refWeek<fmt(addD(parseD(e),-63))?refWeek:e);}},[refWeek]);
  const NW=10;
  const weeks=useMemo(()=>Array.from({length:NW},(_,i)=>{const ws=fmt(addD(parseD(endWk),-(NW-1-i)*7));
    return{ws,we:fmt(addD(parseD(ws),6)),fut:ws>curWk,...teamWeekMono(team.days,team.athletes,ws)};}),[team.days,team.athletes,endWk]);
  const wRef=useRef(weeks);wRef.current=weeks;
  const selW=useMemo(()=>({ws:sel,...teamWeekMono(team.days,team.athletes,sel)}),[team.days,team.athletes,sel]);
  const prevW=useMemo(()=>teamWeekMono(team.days,team.athletes,fmt(addD(parseD(sel),-7))),[team.days,team.athletes,sel]);
  const per=useMemo(()=>(team.athletes||[]).map(a=>{const l=athWeekLoads(a,sel);
    return{a,loads:l.map(x=>x.load),...weekMono(l)};}).filter(r=>r.total>0)
    .sort((x,y)=>(y.monotony-x.monotony)||(y.total-x.total)),[team.athletes,sel]);
  /* Takımın günlük ortalaması: o hafta yük kaydı olan sporcuların günlük yükünün ortalaması
     (kayıt yoksa takımın planlanan yükü). */
  const daily=useMemo(()=>{if(per.length)return Array.from({length:7},(_,i)=>per.reduce((s,r)=>s+r.loads[i],0)/per.length);
    const m=plannedDayLoadMap(team.days);return Array.from({length:7},(_,i)=>m[fmt(addD(parseD(sel),i))]||0);},[per,team.days,sel]);
  const dMean=daily.reduce((a,b)=>a+b,0)/7;
  const dSd=Math.sqrt(daily.reduce((s,v)=>s+(v-dMean)**2,0)/7);
  const mv=weeks.filter(w=>w.monotony>0);
  const avgMono=mv.length?mv.reduce((s,w)=>s+w.monotony,0)/mv.length:0;
  const z=monoZoneOf(selW.monotony);
  const delta=selW.monotony&&prevW.monotony?selW.monotony-prevW.monotony:null;
  const fwd=k=>{const d=parseD(k);return`${d.getDate()} ${MN[d.getMonth()]}`;};
  const rng=ws=>{const a=parseD(ws),b=addD(a,6);return a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${MN[b.getMonth()]}`:`${a.getDate()} ${MN[a.getMonth()]} – ${b.getDate()} ${MN[b.getMonth()]}`;};
  const shift=n=>{const e=fmt(addD(parseD(endWk),n*7));setEndWk(e>curWk?curWk:e);};
  const n0=v=>Math.round(v||0).toLocaleString('en-US').replace(/,/g,'.');
  const maxL=Math.max(1,...per.flatMap(r=>r.loads));
  const pick=ws=>{if(ws<=curWk)setSel(ws);};
  const selIx=weeks.findIndex(w=>w.ws===sel);
  return(<div className="panel mn">
    <div className="mn-head">
      <div>
        <div className="mn-title">{L('Haftalık Monotonluk','Weekly Monotony')}<span className="mn-sub">{L('Foster monotonluğu ve zorlanma · bir haftayı seç','Foster monotony & strain · pick a week')}</span></div>
        <div className="mn-help" title={L('Monotonluk = her sporcunun haftalık günlük yük ortalaması ÷ standart sapması, kadro genelinde ortalanır. Zorlanma = haftalık toplam × monotonluk.','Monotony = each athlete\'s mean daily load ÷ SD within the week, averaged across the squad. Strain = weekly total × monotony.')}>
          {L('Ort. ÷ SS · <1.0 düşük · 1.0–1.5 normal · 1.5–2.0 izle · >2.0 yüksek','Mean ÷ SD · <1.0 low · 1.0–1.5 normal · 1.5–2.0 watch · >2.0 high')}</div>
      </div>
      <div className="mn-nav">
        <button onClick={()=>shift(-4)} title={L('Önceki haftalar','Earlier weeks')}>‹</button>
        <span>{fwd(weeks[0].ws)} – {fwd(weeks[NW-1].we)}</span>
        <button onClick={()=>shift(4)} disabled={endWk>=curWk} title={L('Sonraki haftalar','Later weeks')}>›</button>
        <button className="now" onClick={()=>{setEndWk(curWk);setSel(curWk);}}>{L('Bu hafta','This week')}</button>
      </div>
    </div>

    <div className="mn-strip" role="tablist">
      {weeks.map(w=>{const wz=monoZoneOf(w.monotony);
        return<button key={w.ws} role="tab" aria-selected={w.ws===sel} disabled={w.fut}
          className={'mn-wk'+(w.ws===sel?' on':'')+(w.monotony>0?'':' none')} style={{'--wz':wz.dot}} onClick={()=>pick(w.ws)}>
          <span className="d">{fwd(w.ws)}</span>
          <b>{w.monotony>0?w.monotony.toFixed(2):'—'}</b>
          <span className="bar"><i style={{width:`${Math.min(100,(w.monotony||0)/3*100)}%`}}/></span>
        </button>;})}
    </div>

    <div className="mn-grid">
      <div className="mn-chart">
        <div className="mn-k">{L('Son 10 hafta','Last 10 weeks')}{avgMono>0&&<em>{L('ort.','avg')} {avgMono.toFixed(2)}</em>}</div>
        <div className="chart-box" style={{height:250}}>
          <ChartC type="bar" plugins={[monoZones]}
            chartData={{labels:weeks.map(w=>fd(w.ws).slice(0,5)),datasets:[
              {label:L('Monotonluk','Monotony'),data:weeks.map(w=>+(w.monotony||0).toFixed(2)),order:3,
                backgroundColor:weeks.map((w,i)=>w.monotony>0?monoZoneOf(w.monotony).dot+(i===selIx?'':'59'):'rgba(46,51,60,.5)'),
                borderColor:weeks.map((w,i)=>i===selIx?'#ffffff':'transparent'),borderWidth:weeks.map((w,i)=>i===selIx?1.5:0),
                borderRadius:5,borderSkipped:false,maxBarThickness:34,
                datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:2,
                  color:ctx=>ctx.dataIndex===selIx?monoZoneOf(ctx.dataset.data[ctx.dataIndex]).c:'#8a8f98',
                  font:ctx=>({weight:ctx.dataIndex===selIx?'bold':'normal',size:10.5}),formatter:v=>v>0?v.toFixed(2):''}},
              {type:'line',label:L('Risk eşiği (2.0)','Risk threshold (2.0)'),data:weeks.map(()=>2),order:1,
                borderColor:'rgba(244,63,94,.7)',borderWidth:1.5,borderDash:[5,4],pointRadius:0,pointHitRadius:0,fill:false,datalabels:{display:false}},
              ...(avgMono?[{type:'line',label:L('10 hafta ortalaması','10-week average'),data:weeks.map(()=>+avgMono.toFixed(2)),order:2,
                borderColor:'rgba(205,211,220,.55)',borderWidth:1.5,borderDash:[2,3],pointRadius:0,pointHitRadius:0,fill:false,datalabels:{display:false}}]:[])]}}
            options={{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},...CHART_DARK,
              onClick:(_,els)=>{const e=els&&els[0];const w=e&&wRef.current[e.index];if(w)pick(w.ws);},
              onHover:(ev,els)=>{const t=ev&&ev.native&&ev.native.target;if(t)t.style.cursor=els&&els.length?'pointer':'default';},
              scales:{x:{...CHART_DARK.scales.x,grid:{display:false}},
                y:{...CHART_DARK.scales.y,beginAtZero:true,suggestedMax:Math.max(2.4,...weeks.map(w=>(w.monotony||0)+.4)),
                  grid:{color:'rgba(255,255,255,.05)'},ticks:{...(CHART_DARK.scales.y.ticks||{}),stepSize:.5,callback:v=>Number(v).toFixed(1)}}},
              plugins:{legend:{display:true,position:'top',align:'end',labels:{color:'#94a3b8',font:{size:10},usePointStyle:true,pointStyle:'line',boxWidth:18,filter:i=>i.datasetIndex>0}},
                tooltip:{callbacks:{title:it=>{const w=wRef.current[it[0].dataIndex];return w?rng(w.ws):'';},
                  label:i=>i.dataset.type==='line'?`${i.dataset.label}: ${Number(i.parsed.y).toFixed(2)}`:L('Monotonluk: ','Monotony: ')+i.parsed.y.toFixed(2),
                  afterBody:it=>{const w=wRef.current[it[0].dataIndex];if(!w||!w.monotony)return'';
                    return[L('Bant: ','Band: ')+exLabel(monoZoneOf(w.monotony).t),L('Zorlanma: ','Strain: ')+n0(w.strain)];}}}}}}/>
        </div>
      </div>

      <div className="mn-card" style={{'--wz':z.dot}}>
        <div className="mn-card-h"><span>{rng(sel)}</span>
          <span className="mn-zone"><i/>{exLabel(z.t).toUpperCase()}</span></div>
        <div className="mn-big" style={{color:z.c}}>{selW.monotony?selW.monotony.toFixed(2):'—'}</div>
        <div className="mn-delta">{delta==null?L('önceki haftayla karşılaştırma yok','no previous week to compare')
          :<><b style={{color:delta>0.05?'#f59e0b':delta<-0.05?'#2dd4a7':'var(--dim)'}}>{delta>0?'▲ +':delta<0?'▼ −':'– '}{Math.abs(delta).toFixed(2)}</b> {L('geçen haftaya göre','vs last week')}</>}</div>
        <MonoBar value={selW.monotony}/>
        <div className="mn-stats">
          <div><span>{L('Haftalık yük','Weekly load')}</span><b>{n0(selW.total)}</b><em>{L('AU / sporcu','AU / athlete')}</em></div>
          <div><span>{L('Günlük ort.','Daily mean')}</span><b>{n0(selW.mean)}</b><em>AU</em></div>
          <div><span>{L('Standart sapma','Std. dev.')}</span><b>{n0(selW.sd)}</b><em>AU</em></div>
          <div><span>{L('Zorlanma','Strain')}</span><b>{n0(selW.strain)}</b><em>{L('toplam × mono','total × mono')}</em></div>
        </div>
        <div className="mn-n">{selW.n?L(`${selW.n} sporcunun ortalaması`,`mean of ${selW.n} athletes`):L('sporcu kaydı yok · takım planı','no athlete logs · team plan')}</div>
      </div>
    </div>

    <div className="mn-detail">
      <div className="mn-days">
        <div className="mn-k">{L('Günlük yük dağılımı','Daily load spread')}<em>{L('sporcu başına ort. AU · çubuklar birbirine ne kadar benzerse monotonluk o kadar yüksek','avg AU per athlete · the more alike the bars, the higher the monotony')}</em></div>
        <div className="chart-box" style={{height:210}}>
          <ChartC type="bar" chartData={{labels:DN,datasets:[
            {label:L('Günlük yük','Daily load'),data:daily.map(v=>Math.round(v)),backgroundColor:daily.map(v=>v>0?z.dot+'bf':'rgba(46,51,60,.6)'),borderRadius:5,borderSkipped:false,maxBarThickness:40,order:3,
              datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:1,color:'#cdd3dc',font:{size:10},formatter:v=>v>0?v:''}},
            {type:'line',label:L('Ortalama','Mean'),data:daily.map(()=>Math.round(dMean)),borderColor:'rgba(205,211,220,.8)',borderWidth:1.5,pointRadius:0,fill:false,order:1,datalabels:{display:false}},
            {type:'line',label:'+1 SS',data:daily.map(()=>Math.round(dMean+dSd)),borderColor:'rgba(205,211,220,.35)',borderWidth:1,borderDash:[3,3],pointRadius:0,fill:false,order:2,datalabels:{display:false}},
            {type:'line',label:'−1 SS',data:daily.map(()=>Math.max(0,Math.round(dMean-dSd))),borderColor:'rgba(205,211,220,.35)',borderWidth:1,borderDash:[3,3],pointRadius:0,fill:'-1',backgroundColor:'rgba(205,211,220,.06)',order:2,datalabels:{display:false}}]}}
            options={{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},...CHART_DARK,
              scales:{x:{...CHART_DARK.scales.x,grid:{display:false}},y:{...CHART_DARK.scales.y,beginAtZero:true,grid:{color:'rgba(255,255,255,.05)'}}},
              plugins:{legend:{display:true,position:'top',align:'end',labels:{color:'#94a3b8',font:{size:10},usePointStyle:true,pointStyle:'line',boxWidth:16,filter:i=>i.datasetIndex===1||i.datasetIndex===2}},
                tooltip:{filter:i=>i.datasetIndex===0,callbacks:{title:it=>{const d=addD(parseD(sel),it[0].dataIndex);return`${DN[it[0].dataIndex]} · ${fd(fmt(d))}`;},
                  label:i=>`${L('Yük','Load')}: ${n0(i.parsed.y)} AU`}}}}}/>
        </div>
      </div>
      <div className="mn-aths">
        <div className="mn-k">{L('Sporcu monotonluğu','Athlete monotony')}<em>{L(`${per.length} sporcu · yüksekten düşüğe`,`${per.length} athletes · high to low`)}</em></div>
        {per.length===0?<div className="empty-st">{L('Bu hafta sporcu yük kaydı yok','No athlete load logged this week')}</div>
        :<div className="mn-list">{per.map(r=>{const az=monoZoneOf(r.monotony);
          return<div key={r.a.id||r.a.name} className="mn-row">
            <span className="nm">{r.a.name||'—'}</span>
            <span className="sp" title={DN.map((d,i)=>`${d} ${n0(r.loads[i])}`).join(' · ')}>{r.loads.map((v,i)=><i key={i} style={{height:`${v>0?Math.max(8,v/maxL*100):0}%`,background:v>0?az.dot:'transparent'}}/>)}</span>
            <span className="mv" style={{color:az.c}}>{r.monotony?r.monotony.toFixed(2):'—'}</span>
            <span className="st">{n0(r.strain)}</span>
          </div>;})}</div>}
      </div>
    </div>
  </div>);
}

/* =========================================================
   PHOTO CELL — small reusable photo uploader (auto-resize)
   Used in the Test panel for posture / OHS / sprint step photos.
   ========================================================= */
function PhotoCell({photo,onChange,label,size=68}){
  const ref=useRef(null);
  return(<div style={{textAlign:'center',display:'inline-block'}}>
    <div onClick={()=>ref.current?.click()}
      style={{width:size,height:size,borderRadius:8,background:'var(--elevated)',border:hasMedia(photo)?'1px solid var(--accent)':'1px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',transition:'border-color .15s'}}>
      {hasMedia(photo)?<img src={mediaSrc(photo)} alt={label} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'var(--dim)',fontSize:22}}>📷</span>}
    </div>
    <div style={{fontSize:10,color:'var(--muted)',marginTop:4,fontWeight:500}}>{label}</div>
    {hasMedia(photo)&&<button onClick={()=>onChange(null)} style={{marginTop:1,background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:10,padding:0}}>{L('Kaldır','Remove')}</button>}
    <input ref={ref} type="file" accept="image/*" style={{display:'none'}}
      onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'tests',d=>onChange(d));e.target.value='';}}/>
  </div>);
}

