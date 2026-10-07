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
  // ---- All-athletes weekly AU chart (per athlete = a segment) ----
  const allAthletesChart=useMemo(()=>{
    const{year,month}=selected;
    const ms=`${year}-${pad(month)}-01`;
    const me=fmt(new Date(year,month,0));
    const weekStarts=[];let c=sow(parseD(ms));
    while(c<=parseD(me)){weekStarts.push(fmt(c));c=addD(c,7);}
    const athletes=team.athletes||[];
    if(athletes.length===0||weekStarts.length===0)return null;
    const perAthlete=athletes.map(a=>{
      const data=weekStarts.map(ws=>{
        const we=fmt(addD(parseD(ws),6));
        let total=0;
        (a.srpeLog||[]).forEach(e=>{
          if(!e.date||e.date<ws||e.date>we)return;
          const tp=Number(e.tpLoad)||0,sc=Number(e.scLoad)||0,gm=Number(e.gameLoad)||0;
          total+=Number(e.totalLoad)||(tp+sc+gm);
        });
        return Math.round(total);
      });
      return{name:a.name,data};
    }).filter(a=>a.data.some(v=>v>0));
    if(perAthlete.length===0)return null;
    const totals=weekStarts.map((_,wi)=>perAthlete.reduce((s,a)=>s+(a.data[wi]||0),0));
    const teamDataset={label:'Team Total',data:totals,backgroundColor:'rgba(6,182,212,.75)',borderColor:'#22d3ee',borderWidth:1};
    return{labels:weekStarts.map(ws=>fd(ws).slice(0,5)),datasets:[teamDataset],perAthlete};
  },[team.athletes,selected]);
  const weekTotals=allAthletesChart?allAthletesChart.datasets[0].data:[];

  // ---- DAILY (7-day) team-load chart: one navigable week at a time ----
  const allLogDates=useMemo(()=>{
    const s=new Set();(team.athletes||[]).forEach(a=>(a.srpeLog||[]).forEach(e=>{if(e.date)s.add(e.date);}));
    return[...s].sort();
  },[team.athletes]);
  const[dailyWeek,setDailyWeek]=useState(()=>{
    const s=new Set();(team.athletes||[]).forEach(a=>(a.srpeLog||[]).forEach(e=>{if(e.date)s.add(e.date);}));
    const arr=[...s].sort();
    return fmt(sow(parseD(arr.length?arr[arr.length-1]:(selected.date||fmt(today)))));
  });
  // Week of currently-shown daily bars
  const dailyData=useMemo(()=>{
    const days7=Array.from({length:7},(_,i)=>fmt(addD(parseD(dailyWeek),i)));
    const labels=days7.map((d,i)=>`${DN[i]} ${fd(d).slice(0,5)}`);
    const perAthlete=(team.athletes||[]).map(a=>{
      const byDate={};
      (a.srpeLog||[]).forEach(e=>{
        if(!e.date)return;
        const tp=Number(e.tpLoad)||0,sc=Number(e.scLoad)||0,gm=Number(e.gameLoad)||0;
        byDate[e.date]=(byDate[e.date]||0)+(Number(e.totalLoad)||(tp+sc+gm));
      });
      return{name:a.name,data:days7.map(d=>Math.round(byDate[d]||0))};
    }).filter(a=>a.data.some(v=>v>0));
    const dayTotals=days7.map((d,i)=>{const t=perAthlete.reduce((s,a)=>s+(a.data[i]||0),0);return t>0?t:(plannedByDay[d]||0);});
    const weekTotal=dayTotals.reduce((a,b)=>a+b,0);
    return{days7,labels,perAthlete,dayTotals,weekTotal};
  },[team.athletes,dailyWeek,plannedByDay]);

  // ---- Weekly monotony (Foster) for the selected month, from team daily load ----
  // Same per-athlete-then-average monotony the gauge card and the calendar chip use.
  const mWeeks=useMemo(()=>{const o=[];let c=sow(parseD(ms));while(c<=parseD(me)){
    o.push({wkStart:fmt(c),wkEnd:fmt(addD(c,6)),...teamWeekMono(team.days,team.athletes,fmt(c))});c=addD(c,7);}
    return o;},[team.days,team.athletes,ms,me]);
  const monoW=mWeeks.filter(w=>w.monotony>0);
  const meanMono=monoW.length?monoW.reduce((a,b)=>a+b.monotony,0)/monoW.length:0;
  const monthTotal=mWeeks.reduce((a,b)=>a+b.total,0);

  // ---- ACWR: acute (7-day total) ÷ chronic (28-day weekly average), from team daily load,
  // at end of period. Only a record shorter than 28 days shortens the chronic side (loadWindows).
  const acwrAt=ref=>acwrFrom(dayLoad,ref,teamFirst);
  const refDate=me<=fmt(today)?me:fmt(today);   // end of selected month, capped at today
  const acwrVal=acwrAt(refDate);
  const acwrZone=acwrVal===0?{t:'No data',c:'#94a3b8'}:acwrVal>1.5?{t:'High risk',c:'#ef4444'}
    :(acwrVal>=0.8&&acwrVal<=1.3)?{t:'Optimal',c:'#10b981'}:acwrVal<0.8?{t:'Undertraining',c:'#f59e0b'}:{t:'Caution',c:'#f59e0b'};
  // Completed weeks use their own Sunday; the in-progress week uses today (its Sunday is
  // still ahead and would dilute the acute window); fully future weeks stay as-is ('—').
  const wkRefOf=w=>w.wkEnd<=fmt(today)?w.wkEnd:w.wkStart<=fmt(today)?fmt(today):w.wkEnd;
  const acwrWeekly=mWeeks.map(w=>({label:fd(w.wkStart).slice(0,5),acwr:+acwrAt(wkRefOf(w)).toFixed(2)}));
  // ---- Load Monitoring summary (acute/chronic means, monotony, strain) at the selected week's end ----
  const[lmWeek,setLmWeek]=useState(()=>fmt(sow(parseD(refDate))));   // Archivoy of the reference week
  const lmEnd=fmt(addD(parseD(lmWeek),6));                            // Sunday of that week
  // Metrics reference date: the selected week's Sunday, but never a future day. For the
  // in-progress week the Sunday hasn't happened yet, and using it pads the acute window
  // with empty future days (steady 500 AU/day reads ACWR 0.18 on Archivoy instead of 1.00).
  const lmRef=lmEnd<=fmt(today)?lmEnd:fmt(today);
  // Acute (7d) / chronic (28d) / ACWR averaged per athlete, like the monotony below.
  const lmLoad=teamLoadStats(team.athletes,dayAvg,lmRef,teamFirst);
  const lmAcwrZone=lmLoad.acwr===0?{c:'var(--text)'}:lmLoad.acwr>1.5?{c:'#ef4444'}
    :(lmLoad.acwr>=0.8&&lmLoad.acwr<=1.3)?{c:'#10b981'}:{c:'#f59e0b'};
  // Monotony / SD / strain come from the selected Mon–Sun week via the shared helper, so
  // this card and the calendar's chip report the identical number for the same week.
  const mWk=teamWeekMono(team.days,team.athletes,lmWeek);
  const lmMonoZone=monoZoneOf(mWk.monotony);   // gauge card shows monotony, not ACWR
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

  // ---- Training purpose distribution (planned sessions, by minutes) ----
  const pMix=useMemo(()=>{const t={};Object.values(team.days||{}).forEach(d=>{if(!d?.date||d.date<ms||d.date>me)return;
    (d.sessions||[]).forEach(s=>{const dur=+s.duration||0;t[s.purpose||'—']=(t[s.purpose||'—']||0)+dur;});});
    const tot=Object.values(t).reduce((a,b)=>a+b,0);
    return Object.entries(t).map(([k,v])=>({label:k,min:v,pct:tot?v/tot*100:0})).sort((a,b)=>b.pct-a.pct);},[team.days,ms,me]);

  // ---- Every day of the month (team total) for the printed daily section ----
  const monthDays=useMemo(()=>{const out=[];let c=parseD(ms),e=parseD(me);while(c<=e){const k=fmt(c);out.push({date:k,lab:fd(k).slice(0,5),val:dayLoad(k)});c=addD(c,1);}return out;},[teamDaily,ms,me]);

  const monthLabel=MN[month-1]+' '+year;
  const PCOL=['#06b6d4','#8b5cf6','#f97316','#ec4899','#10b981','#f59e0b','#ef4444','#22d3ee','#a855f7','#84cc16','#f43f5e'];
  const printMonthly=()=>printMonthlyReportTR({
    teamName:team.setup.teamName,monthLabel,acwr:acwrVal,acwrZone,
    meanMono,monthTotal,trainDays:monthDays.filter(d=>d.val>0).length,
    weekly:{colLabels:(allAthletesChart?allAthletesChart.labels:[]).map(l=>'Hf '+l),perAthlete:allAthletesChart?allAthletesChart.perAthlete:[]},
    monthDays,acwrWeekly,mWeeks,pMix});

  // Weekly report → uses the currently shown daily-chart week (dailyWeek state)
  const printWeekly=()=>{
    const wkS=dailyWeek,wkE=fmt(addD(parseD(wkS),6));
    const days7=Array.from({length:7},(_,i)=>fmt(addD(parseD(wkS),i)));
    const loads=days7.map(d=>({load:dayLoad(d)}));
    const wMono=weekMono(loads);
    const wAcwr=acwrAt(wkRefOf({wkStart:wkS,wkEnd:wkE}));
    const wZone=wAcwr===0?{t:'No data',c:'#94a3b8'}:wAcwr>1.5?{t:'High risk',c:'#ef4444'}:(wAcwr>=0.8&&wAcwr<=1.3)?{t:'Optimal',c:'#10b981'}:wAcwr<0.8?{t:'Undertraining',c:'#f59e0b'}:{t:'Caution',c:'#f59e0b'};
    // Week purpose mix
    const pT={};Object.values(team.days||{}).forEach(d=>{if(!d?.date||d.date<wkS||d.date>wkE)return;
      (d.sessions||[]).forEach(s=>{const dur=+s.duration||0;pT[s.purpose||'—']=(pT[s.purpose||'—']||0)+dur;});});
    const pTot=Object.values(pT).reduce((a,b)=>a+b,0);
    const wpMix=Object.entries(pT).map(([k,v])=>({label:k,min:v,pct:pTot?v/pTot*100:0})).sort((a,b)=>b.pct-a.pct);
    const daySessions=days7.map(d=>{const day=team.days?.[d];return(day?.sessions||[]).map(s=>({name:s.name||'',type:sessionType(s),duration:Number(s.duration)||0,au:Number(s.au)||0})).filter(s=>s.name);});
    printWeeklyReportTR({
      teamName:team.setup.teamName,
      weekLabel:fd(wkS)+' → '+fd(wkE),
      acwr:wAcwr,acwrZone:wZone,
      weekTotal:wMono.total,weekMean:wMono.mean,weekSD:wMono.sd,
      weekMono:wMono.monotony,weekStrain:wMono.strain,
      trainDays:days7.filter(d=>dayLoad(d)>0).length,
      dailyLabels:dailyData.labels,dayTotals:dailyData.dayTotals,daySessions,
      perAthlete:dailyData.perAthlete,pMix:wpMix
    });
  };

  const setYear=y=>setSelected({...selected,year:y,date:`${y}-${pad(month)}-01`});
  const setMonth=m=>setSelected({...selected,month:m,date:`${year}-${pad(m)}-01`});
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
    <div className="panel">
      <div className="row" style={{justifyContent:'space-between',flexWrap:'wrap',gap:10,alignItems:'flex-end'}}>
        <div className="row" style={{gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div><label>{L('Yıl','Year')}</label><input type="number" value={year} onChange={e=>setYear(+e.target.value)} style={{width:90}}/></div>
          <div><label>{L('Ay','Month')}</label><select value={month} onChange={e=>setMonth(+e.target.value)} style={{width:140}}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{MN[i]}</option>)}</select></div>
          <div style={{fontSize:12,color:'var(--muted)'}}>{L('Rapor ayı:','Report month:')} <strong style={{color:'var(--text)'}}>{monthLabel}</strong></div>
        </div>
      </div>
      <div className="help" style={{marginTop:8}}>{L(<>Yukarıdan bir ay seç. <b>Aylık Rapor</b> aşağıdaki her bölümü Türkçe basar; <b>Haftalık Rapor</b> yük kaydı olan en son hafta için tek sayfalık Türkçe bir rapor basar.</>,
        <>Pick a month above. <b>Monthly Report</b> prints every section below in Turkish; <b>Weekly Report</b> prints a Turkish single-page report for the most recent week with logged load.</>)}</div>
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
      <div className="lm-gauge-card">
        <div className="lac-head">
          <span className="lac-title">{L('Takım Monotonluğu','Team Monotony')}</span>
          <span className="lac-zone" style={{color:lmMonoZone.dot}}><span className="lac-zdot" style={{background:lmMonoZone.dot}}/>{exLabel(lmMonoZone.t||'').toUpperCase()}</span>
        </div>
        <div className="lac-sub">{L(`Foster · ${mWk.n||0} sporcu ortalaması`,`Foster · avg across ${mWk.n||0} athlete${(mWk.n||0)===1?'':'s'}`)}</div>
        <div className="lac-val" style={{color:lmMonoZone.c}}>{mWk.monotony?mWk.monotony.toFixed(2):'—'}</div>
        <div className="lac-vsub">{L('her sporcunun ortalaması ÷ SS, sonra ortalama','each athlete\'s mean ÷ SD, averaged')}</div>
        <MonoBar value={mWk.monotony}/>
        <div className="lm-mini">
          <div className="m"><span className="mi">⚡</span><div className="mc"><div className="k">{L('Akut · 7g','Acute · 7d')}</div><div className="v" style={{color:'#3b6ef5'}}>{Math.round(lmLoad.acute).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
          <div className="m"><span className="mi">▤</span><div className="mc"><div className="k">{L('Kronik · 28g','Chronic · 28d')}</div><div className="v">{Math.round(lmLoad.chronic).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
          <div className="m"><span className="mi">∿</span><div className="mc"><div className="k">{L('Ort. ACWR','Avg ACWR')}</div><div className="v" style={{color:lmAcwrZone.c}}>{lmLoad.acwr?lmLoad.acwr.toFixed(2):'—'}</div></div></div>
          <div className="m"><span className="mi">◍</span><div className="mc"><div className="k">{L('Zorlanma','Strain')}</div><div className="v">{Math.round(mWk.strain).toLocaleString('en-US').replace(/,/g,'.')}</div></div></div>
        </div>
      </div>
      <div className="lm-trend-card">
        <div className="lm-th">
          <div><h3 style={{display:'inline'}}>{L('Takım Yük Trendi','Team Load Trend')}</h3><span className="lm-th-sub">{L(`sporcu başına ort. AU · akut ve kronik · ${lmWin} gün · Pzt–Paz`,`avg AU / athlete · acute & chronic · ${lmWin} days · Mon–Sun`)}</span></div>
        </div>
        <div className="chart-box" style={{flex:1,minHeight:240}}>
          {/* One week fits weekday names; longer windows would crowd, so those stay dd/mm. */}
          <ChartC type="bar" chartData={{labels:lmTrend.map(d=>lmWin===7?DN[(parseD(d.k).getDay()+6)%7]:fd(d.k).slice(0,5)),datasets:[
            {type:'bar',label:L('Günlük','Daily'),data:lmTrend.map(d=>d.daily),backgroundColor:vGrad('rgba(99,140,255,.95)','rgba(59,110,245,.12)'),hoverBackgroundColor:vGrad('rgba(130,165,255,1)','rgba(59,110,245,.3)'),borderRadius:7,borderSkipped:false,order:3,categoryPercentage:.82,barPercentage:.9},
            {type:'line',label:L('Akut 7g','Acute 7d'),data:lmTrend.map(d=>d.acute),borderColor:'#f59e0b',backgroundColor:vGrad('rgba(245,158,11,.28)','rgba(245,158,11,0)'),tension:.4,borderWidth:2.5,pointRadius:0,pointHoverRadius:5,pointBackgroundColor:'#f59e0b',fill:true,order:1},
            {type:'line',label:L('Kronik 28g','Chronic 28d'),data:lmTrend.map(d=>d.chronic),borderColor:'#a78bfa',backgroundColor:'#a78bfa',borderDash:[6,5],tension:.4,borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:false,order:2}
          ]}}
            options={{responsive:true,maintainAspectRatio:false,...CHART_DARK,
              interaction:{mode:'index',intersect:false},hover:{mode:'index',intersect:false},
              scales:{x:{...CHART_DARK.scales.x,ticks:{...CHART_DARK.scales.x.ticks,maxTicksLimit:9,autoSkip:true,maxRotation:0}},y:{...CHART_DARK.scales.y}},
              plugins:{legend:{display:true,position:'top',align:'end',labels:{color:'#cdd3dc',font:{size:11,family:"'Archivo','IBM Plex Mono',monospace"},usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:14}},
                tooltip:{mode:'index',intersect:false,callbacks:{
                  title:items=>{const d=lmTrend[items[0].dataIndex];if(!d)return'';const dt=parseD(d.k);return `${MN[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;},
                  label:i=>i.parsed.y==null?'':`${i.dataset.label}: ${Math.round(i.parsed.y)}`}}}}}/>
        </div>
      </div>
    </div>

    <AthleteLoadBoard athletes={team.athletes} refDate={lmRef}/>

    <WellnessHeatmap athletes={team.athletes}/>

    {(()=>{
      const mv=mWeeks.filter(w=>w.monotony>0);
      const avgMono=mv.length?mv.reduce((s,w)=>s+w.monotony,0)/mv.length:0;
      const excessN=mWeeks.filter(w=>w.monotony>2).length;
      const last=mv.length?mv[mv.length-1]:null;
      const prev=mv.length>1?mv[mv.length-2]:null;
      const trend=last&&prev?last.monotony-prev.monotony:null;
      const maxStrain=Math.max(1,...mWeeks.map(w=>w.strain||0));
      const monoCol=m=>monoZoneOf(m).c;
      return <div className="panel">
      <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:6}}>
        <h2 style={{margin:0,fontSize:18}}>{L('Haftalık Monotonluk','Weekly Monotony')}</h2>
        <span style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",fontSize:11,color:'var(--dim)'}}>{L('Foster monotonluğu ve zorlanma','Foster monotony & strain')} · {monthLabel}</span>
      </div>
      <div className="help" style={{marginBottom:14}}>{L('Monotonluk = her sporcunun günlük yük ortalaması ÷ standart sapması (hafta içinde), kadro genelinde ortalanır. Bantlar: <1.0 düşük (yükler çok değişken) · 1.0–1.5 normal · 1.5–2.0 artıyor, izle · >2.0 yüksek — aşırı yüklenme ve hastalık/sakatlık riski artar. Zorlanma = Toplam × Monotonluk.',
        'Monotony = each athlete\'s mean daily load ÷ its standard deviation (within each week), averaged across the squad. Banding: <1.0 low (loads highly varied) · 1.0–1.5 normal · 1.5–2.0 rising, watch it · >2.0 high — overload and illness/injury risk climbs. Strain = Total × Monotony.')}</div>
      <div className="mono-sum">
        <div className="mono-chip"><div className="k">{L('Ort. Monotoni','Mean Monotony')}</div><div className="v" style={{color:monoCol(avgMono)}}>{avgMono?avgMono.toFixed(2):'—'}</div><div className="d">{L(`${mv.length} hafta`,`${mv.length} weeks`)}</div></div>
        <div className="mono-chip"><div className="k">{L('Riskli Hafta','Weeks at Risk')}</div><div className="v" style={{color:excessN>0?'#f43f5e':'var(--text)'}}>{excessN}</div><div className="d">{L('monotoni > 2.0','monotony > 2.0')}</div></div>
        <div className="mono-chip"><div className="k">{L('Geçen Hafta','Last Week')}</div><div className="v" style={{color:last?monoCol(last.monotony):'var(--text)'}}>{last?last.monotony.toFixed(2):'—'}</div><div className="d">{trend!=null?(trend>0?'▲ +':trend<0?'▼ −':'– ')+Math.abs(trend).toFixed(2):L('önceki haftaya göre','vs previous week')}</div></div>
      </div>
      {/* THE CHART READS AS THE SCALE IT IS MEASURED ON. The four Foster bands are painted
          behind the bars, so a week is judged by the colour it stands in rather than by
          tracing its height back to an axis tick; the squad's own average runs across as
          a dashed line, which is the comparison a coach actually makes ("is this week
          heavier than we usually are?"); and the axis stops at 2.4 unless a week goes
          past it, so the 2.0 line sits where the eye expects it week after week instead
          of sliding up and down with the tallest bar. */}
      <div className="mono-key">
        {[[L('Düşük','Low'),'#3b82f6','< 1.0'],[L('Normal','Normal'),'#2dd4a7','1.0 – 1.5'],
          [L('Artıyor','Rising'),'#f59e0b','1.5 – 2.0'],[L('Yüksek','High'),'#f43f5e','> 2.0']].map(([t,c,r])=>
          <span key={t} className="mono-key-i"><i style={{background:c}}/><b>{t}</b><em>{r}</em></span>)}
      </div>
      <div className="chart-box" style={{marginBottom:16,height:280}}>
        <ChartC type="bar" plugins={[monoZones]}
          chartData={{labels:mWeeks.map(w=>fd(w.wkStart).slice(0,5)),datasets:[
          {label:L('Monotonluk','Monotony'),data:mWeeks.map(w=>+w.monotony.toFixed(2)),order:3,
            backgroundColor:mWeeks.map(w=>w.monotony>0?monoZoneOf(w.monotony).dot+'d9':'rgba(46,51,60,.5)'),
            hoverBackgroundColor:mWeeks.map(w=>w.monotony>0?monoZoneOf(w.monotony).dot:'#2e333c'),
            borderColor:mWeeks.map(w=>w.monotony>0?monoZoneOf(w.monotony).dot:'#2e333c'),
            borderWidth:{top:2,right:0,bottom:0,left:0},borderRadius:7,borderSkipped:false,maxBarThickness:38,
            datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:2,
              color:ctx=>monoZoneOf(ctx.dataset.data[ctx.dataIndex]).c,
              font:{weight:'bold',size:11,family:"'Archivo','IBM Plex Mono',monospace"},formatter:v=>v>0?v.toFixed(2):''}},
          {type:'line',label:L('Risk eşiği (2.0)','Risk threshold (2.0)'),data:mWeeks.map(()=>2),order:1,
            borderColor:'rgba(244,63,94,.7)',borderWidth:1.5,borderDash:[5,4],pointRadius:0,pointHitRadius:0,fill:false,tension:0,datalabels:{display:false}},
          ...(avgMono?[{type:'line',label:L('Dönem ortalaması','Period average'),data:mWeeks.map(()=>+avgMono.toFixed(2)),order:2,
            borderColor:'rgba(205,211,220,.55)',borderWidth:1.5,borderDash:[2,3],pointRadius:0,pointHitRadius:0,fill:false,tension:0,datalabels:{display:false}}]:[])
        ]}}
          options={{responsive:true,maintainAspectRatio:false,layout:{padding:{top:26}},...CHART_DARK,
            scales:{x:{...CHART_DARK.scales.x,grid:{display:false}},
              y:{...CHART_DARK.scales.y,beginAtZero:true,
                suggestedMax:Math.max(2.4,...mWeeks.map(w=>(w.monotony||0)+.4)),
                grid:{color:'rgba(255,255,255,.05)'},
                ticks:{...(CHART_DARK.scales.y.ticks||{}),stepSize:.5,callback:v=>Number(v).toFixed(1)}}},
            plugins:{legend:{display:true,position:'top',align:'end',
                labels:{color:'#94a3b8',font:{size:10,family:"'Archivo','IBM Plex Mono',monospace"},usePointStyle:true,pointStyle:'line',boxWidth:18,
                  filter:i=>i.datasetIndex>0}},
              tooltip:{callbacks:{
                title:items=>{const w=mWeeks[items[0].dataIndex];return w?L(`${fd(w.wkStart)} haftası`,`Week of ${fd(w.wkStart)}`):'';},
                label:i=>i.dataset.type==='line'?`${i.dataset.label}: ${Number(i.parsed.y).toFixed(2)}`
                  :L('Monotonluk: ','Monotony: ')+i.parsed.y.toFixed(2),
                afterBody:items=>{const w=mWeeks[items[0].dataIndex];if(!w||!w.monotony)return'';
                  return[L('Bant: ','Band: ')+exLabel(monoZoneOf(w.monotony).t),
                    L('Toplam: ','Total: ')+Math.round(w.total)+' AU',
                    L('Zorlanma: ','Strain: ')+Math.round(w.strain)];}}}}}}/>
      </div>
      <div className="mono-tbl-wrap"><table className="mono-tbl">
        <thead><tr><th>{L('Hafta','Week')}</th><th>{L('Toplam','Total')}</th><th>{L('Ort.','Mean')}</th><th>{L('SS','SD')}</th><th>{L('Monotonluk','Monotony')}</th><th>{L('Zorlanma','Strain')}</th><th>{L('İşaret','Flag')}</th></tr></thead>
        <tbody>{mWeeks.map(w=><tr key={w.wkStart}>
          <td className="mono-wk">{fd(w.wkStart).slice(0,5)}</td><td>{Math.round(w.total)}</td><td>{w.mean.toFixed(0)}</td><td>{w.sd.toFixed(1)}</td>
          <td><span className="mono-val" style={{color:monoCol(w.monotony)}}>{w.monotony.toFixed(2)}</span></td>
          <td><div className="mono-strain"><span>{Math.round(w.strain)}</span><i style={{width:Math.min(100,(w.strain/maxStrain*100))+'%'}}/></div></td>
          <td>{w.monotony>0?<span className="pill" style={{color:monoZoneOf(w.monotony).c,borderColor:monoZoneOf(w.monotony).c+'55',background:monoZoneOf(w.monotony).c+'1f'}}>{exLabel(monoZoneOf(w.monotony).t)}</span>:'—'}</td></tr>)}</tbody>
      </table></div>
    </div>;})()}

    {/* Training Purpose Distribution is not on this screen any more. Minutes by purpose
        say what was PLANNED, not what the squad carried, and read beside monotony and
        ACWR — which are both built from what the athletes actually logged — it invited
        the two to be compared. The figure is still computed above and still printed on
        the weekly report, which is where it is read against the plan it belongs to. */}
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

