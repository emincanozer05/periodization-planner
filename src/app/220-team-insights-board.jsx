function TeamInsights({days,athletes,refDate,setup}){
  /* Subscribing to the app language re-renders the whole board the instant the
     TR/EN switch flips; `lang` also sits in the dependency list of every memo
     that builds a sentence, so the cached text is rebuilt in the new language
     rather than staying behind in the old one. */
  const lang=useAppLang();
  const ref=refDate||fmt(today);
  const ws=sow(parseD(ref)),we=addD(ws,6);
  const wsK=fmt(ws),weK=fmt(we);
  const periodLabel=L(`${ws.getDate()} ${MN_S_TR[ws.getMonth()]} – ${we.getDate()} ${MN_S_TR[we.getMonth()]}`,
                      `${MN[ws.getMonth()]} ${ws.getDate()} – ${MN[we.getMonth()]} ${we.getDate()}`);
  const dayKeys=useMemo(()=>Array.from({length:7},(_,i)=>fmt(addD(ws,i))),[wsK]);
  const roster=useMemo(()=>(athletes||[]).filter(a=>(a.name||'').trim()),[athletes]);

  /* Bars are drawn at zero and grown to their value one frame later, so the board
     animates itself in instead of appearing already finished — and it does it again
     whenever the week changes, which is the moment the numbers are new. Two frames:
     the first paints the zero width, the second is what the transition runs from. */
  const[lit,setLit]=useState(false);
  useEffect(()=>{
    setLit(false);
    let r2=0;const r1=requestAnimationFrame(()=>{r2=requestAnimationFrame(()=>setLit(true));});
    return()=>{cancelAnimationFrame(r1);cancelAnimationFrame(r2);};
  },[wsK]);
  const grow=pct=>({width:lit?`${Math.max(0,Math.min(100,pct))}%`:'0%'});

  /* ---- What the week trained ------------------------------------------- */
  /* Counted by the session's own focus (sesFocus → the editor's "Session Focus" box),
     not by the inferred colour category. Session focus is a multi-select, so a session
     written as Strength + Power counts once under each — that is the honest answer to
     "how much of the week touched power". Its MINUTES are split evenly between them
     instead of being counted twice, so the minute column still adds up to the minutes
     that were actually on the plan. `total` stays the number of sessions in the week,
     which is why it is counted per session rather than summed off the rows. */
  const sesDist=useMemo(()=>{
    const by={};let total=0;
    dayKeys.forEach(k=>(((days||{})[k]||{}).sessions||[]).forEach(s=>{
      total++;
      const mins=Number(s.duration)||0;
      const fs=sesFocus(s).filter(f=>TIB_FOCUS_BY[f]);
      const keys=fs.length?fs:[TIB_FOCUS_NONE.id];
      keys.forEach(f=>{const b=by[f]||(by[f]={n:0,min:0});b.n++;b.min+=mins/keys.length;});
    }));
    const rows=Object.keys(by)
      .map(f=>({...(TIB_FOCUS_BY[f]||TIB_FOCUS_NONE),n:by[f].n,min:Math.round(by[f].min)}))
      .sort((a,b)=>b.n-a.n||b.min-a.min||a.label.localeCompare(b.label));
    return{rows,total,mins:rows.reduce((x,r)=>x+r.min,0),
      max:Math.max(1,...rows.map(r=>r.n))};
  },[days,wsK]);

  /* ---- Who needs attention ---------------------------------------------
     One row per athlete carrying at least one flag, worst first. The three the
     coach asked for — readiness under 2.5, a pain report, a load tier that had to
     be stepped down — plus the ACWR the Load Board already colours red, because an
     athlete in the high-risk zone is exactly what "action required" means. */
  const flagged=useMemo(()=>roster.map(a=>{
    const t=athLoadTier(a,ref);
    const pains=athPainReports(a,ref),note=athPainNote(a,ref);
    const z=acwrZoneOf(t.acwr);
    const tags=[];
    if(t.rd.score!=null&&t.rd.score<2.5)
      tags.push({k:'rd',sev:2,t:`${L('Hazır oluş','Readiness')} ${t.rd.score.toFixed(1)}/5${t.rd.src==='srpe'?L(' (tahmini)',' (est.)'):''}`});
    /* One chip PER painful region rather than one chip listing them all, because the
       chip is what carries the grading: the region is coloured by how bad the athlete
       said it was, so "Diz" reads red at Fazla and "Dirsek" amber at Orta. THE COLOUR IS
       THE WHOLE GRADING — the word is not repeated beside it, which is what turned a
       squad of five niggles into a wall of "· Orta, · Fazla" the eye had to read before
       it could find the region. The word is still on the chip's tooltip. A region the
       athlete ticked on a question with no severity axis takes the day's own "Ağrı
       düzeyin nedir?" score — the same fallback the check-in sync applies. */
    if(pains.length){
      const dsev=sevFromSoreness(athWellnessSnap(a,ref).soreness);
      pains.forEach(p=>{
        const ps=Math.max(0,Math.min(3,Number(p.sev)||dsev||0));
        tags.push({k:'pain',pain:ps,sev:ps===1?1:2,t:tibCtLabel(p.tag)});
      });
    }
    else if(note)tags.push({k:'pain',pain:0,sev:2,t:`${L('Ağrı','Pain')} · ${note.text}`});
    if(t.intent==='recovery')tags.push({k:'tier',sev:2,t:L('Kademe ↓ Toparlanma','Tier ↓ Recovery')});
    else if(t.intent==='maintain')tags.push({k:'tier',sev:1,t:L('Kademe ↓ Koruma','Tier ↓ Maintain')});
    if(t.acwr>1.5)tags.push({k:'acwr',sev:2,t:`ACWR ${t.acwr.toFixed(2)} · ${tibZoneLabel(z.t)}`});
    const sev=Math.max(0,...tags.map(x=>x.sev));
    return{a,tags,sev,rd:t.rd.score};
  }).filter(r=>r.tags.length)
    .sort((x,y)=>y.sev-x.sev||y.tags.length-x.tags.length||(x.a.name||'').localeCompare(y.a.name||'')),
  [roster,ref,lang]);

  /* ---- What hurt, and how badly -----------------------------------------
     The report's own read on the squad: one row per athlete who reported pain at any
     point in the week, each region with the worst grading given for it and the number
     of days it came back. Sorted the way a coach triages — worst grading first, then
     the athlete carrying the most regions, then the one who reported on the most days. */
  const weekPain=useMemo(()=>roster.map(a=>({a,...tibWeekPain(a,dayKeys)}))
    .filter(r=>r.regions.length)
    .sort((x,y)=>y.worst-x.worst||y.regions.length-x.regions.length||y.days-x.days
      ||(x.a.name||'').localeCompare(y.a.name||'')),
  [roster,dayKeys,lang]);
  /* The same week counted by region instead of by athlete — the one line that says
     whether the squad has a knee problem or seven unrelated niggles. */
  const painTally=useMemo(()=>{
    const by={};
    weekPain.forEach(r=>r.regions.forEach(g=>{
      const b=by[g.key]||(by[g.key]={key:g.key,label:g.label,n:0,worst:0});
      b.n++;b.worst=Math.max(b.worst,g.worst);}));
    return Object.keys(by).map(k=>by[k])
      .sort((x,y)=>y.n-x.n||y.worst-x.worst||x.label.localeCompare(y.label));
  },[weekPain]);

  /* ---- Did the week land on its targets ---------------------------------
     Actual comes from the shared daily-load map (the athletes' own logs where they
     have them, the rated team sessions otherwise) — the same number the calendar
     prints under each day column, by construction. A day with nothing rated yet has
     no actual, and shows a dash rather than a −100%. */
  const teamDaily=useMemo(()=>teamDailyLoadMap(days,roster),[days,roster]);
  const pva=useMemo(()=>{
    const rows=dayKeys.map((k,i)=>{
      const planned=Math.round(tibPlanDay((days||{})[k],roster)),actual=Math.round(teamDaily[k]||0);
      return{k,label:dnL(i),planned,actual,
        d:(planned>0&&actual>0)?Math.round((actual-planned)/planned*100):null};
    });
    const live=rows.filter(r=>r.planned>0||r.actual>0);
    const pT=live.reduce((s,r)=>s+r.planned,0),aT=live.reduce((s,r)=>s+r.actual,0);
    return{rows,live,max:Math.max(1,...rows.map(r=>Math.max(r.planned,r.actual))),
      pT,aT,d:(pT>0&&aT>0)?Math.round((aT-pT)/pT*100):null};
  },[days,teamDaily,roster,wsK,lang]);

  /* ---- The squad, split the way it is coached --------------------------- */
  const groups=useMemo(()=>{
    const by={};
    roster.forEach(a=>{const g=posGroupOf(a.position);(by[g]||(by[g]=[])).push(a.id);});
    return[...POS_GROUPS,{id:'other',label:'Other'}]
      .filter(g=>(by[g.id]||[]).length)
      .map(g=>({id:g.id,label:g.label,ids:new Set(by[g.id]),n:by[g.id].length}));
  },[roster]);

  /* Every session on the plan, in time order — the whole calendar, not just this
     week, because the session that ends a recovery window can sit in the next one. */
  const allSes=useMemo(()=>{
    const out=[];
    Object.entries(days||{}).forEach(([k,d])=>((d&&d.sessions)||[]).forEach(s=>
      out.push({s,date:k,st:tibStart(k,s),en:tibEnd(k,s)})));
    return out.sort((a,b)=>a.st-b.st);
  },[days]);

  /* ---- How much rest each unit gets ------------------------------------
     Measured end-of-session → start-of-next, which is the rest the players
     actually get. The board no longer draws a window per unit; what survives is
     the alert, because a turnaround under a day is a decision for today. A
     session with nobody assigned belongs to the whole squad, so it counts for
     every group. */
  const recovery=useMemo(()=>{
    const anchor=parseD(ref);anchor.setHours(23,59,59,999);
    return groups.map(g=>{
      const mine=allSes.filter(x=>{const as=(x.s.athletes||[]);return !as.length||as.some(id=>g.ids.has(id));});
      let last=null;mine.forEach(x=>{if(x.st<=anchor&&(!last||x.st>last.st))last=x;});
      const from=last?last.st:anchor;
      let next=null;mine.forEach(x=>{if(x.st>from&&(!next||x.st<next.st))next=x;});
      const gap=(last&&next)?Math.max(0,(next.st-last.en)/3600000):null;
      return{g,last,next,gap,band:tibBand(gap)};
    });
  },[groups,allSes,ref]);

  /* ---- The week's sRPE per athlete, biggest load first ------------------
     The table the coach reads down: every athlete on the roster with the total
     sRPE load (AU) they carried this week, sorted high → low. The Δ column is
     kept alongside because it is the same number without doing the subtraction —
     how far that athlete sits from the squad mean.

     The mean is taken over the athletes who actually have load in the week. An
     athlete with none is almost always one who has not logged rather than one who
     rested, and counting their zero would drag the mean down and then report
     everybody else as overloaded against it — so they are listed as "no load"
     instead of as −100%. */
  const srpe=useMemo(()=>{
    const rows=roster.map(a=>({a,load:athLoadSum(a,wsK,weK)}));
    const live=rows.filter(r=>r.load>0);
    const mean=live.length?live.reduce((s,r)=>s+r.load,0)/live.length:0;
    return{mean:Math.round(mean),n:live.length,total:Math.round(rows.reduce((s,r)=>s+r.load,0)),
      max:Math.max(1,...rows.map(r=>r.load)),
      rows:rows.map(r=>({...r,d:(mean>0&&r.load>0)?Math.round((r.load-mean)/mean*100):null}))
        .sort((x,y)=>y.load-x.load||(x.a.name||'').localeCompare(y.a.name||''))};
  },[roster,wsK]);

  /* ---- Four weeks of squad mean load ------------------------------------ */
  const trend=useMemo(()=>{
    const cols=[3,2,1,0].map(back=>{
      const s=fmt(addD(ws,-7*back)),e=fmt(addD(ws,-7*back+6));
      const vals=roster.map(a=>athLoadSum(a,s,e)).filter(v=>v>0);
      return{key:`w${back}`,label:back?L(`H-${back}`,`W-${back}`):L('Bu hafta','Current'),
        v:vals.length?Math.round(vals.reduce((x,y)=>x+y,0)/vals.length):0,n:vals.length};
    });
    cols.forEach((c,i)=>{const p=i?cols[i-1].v:0;
      c.d=(i&&p>0&&c.v>0)?Math.round((c.v-p)/p*100):null;});
    const prev=cols[2].v,cur=cols[3].v;
    return{cols,max:Math.max(1,...cols.map(c=>c.v)),
      change:(prev>0&&cur>0)?Math.round((cur-prev)/prev*1000)/10:null};
  },[roster,wsK,lang]);

  /* ---- Coach alerts -----------------------------------------------------
     Nothing here is a new measurement: every alert restates something already on
     the board, in the words of the decision it asks for. Written worst-first so
     the top of the list is the thing to deal with today. */
  const alerts=useMemo(()=>{
    const out=[];
    const add=(sev,kind,where,text)=>out.push({sev,kind,where,text,id:`${kind}|${where}`});
    // Two consecutive days both well above the week's own training-day average.
    const trained=pva.rows.filter(r=>r.actual>0);
    if(trained.length>=3){
      const mean=trained.reduce((s,r)=>s+r.actual,0)/trained.length;
      for(let i=0;i<pva.rows.length-1;i++){
        const a=pva.rows[i],b=pva.rows[i+1];
        if(a.actual>=mean*1.3&&b.actual>=mean*1.3)
          add(2,L('Yüksek yük yoğunluğu','High load density'),`${a.label} → ${b.label}`,
            L(`Üst üste iki gün ${tibNum(mean*1.3)} AU üzerinde (hafta ortalaması ${tibNum(mean)} AU).`,
              `Two consecutive days above ${tibNum(mean*1.3)} AU (week average ${tibNum(mean)} AU).`));
      }
    }
    // A day that did not land where it was planned to.
    pva.rows.forEach(r=>{if(r.d!=null&&Math.abs(r.d)>15)
      add(r.d>0?2:1,L('Yük sapması','Load deviation'),r.label,
        L(`Gerçekleşen ${tibNum(r.actual)} AU, ${tibNum(r.planned)} AU hedefin %${Math.abs(r.d)} ${r.d>0?'üzerinde':'altında'} kaldı.`,
          `Actual ${tibNum(r.actual)} AU ${r.d>0?'exceeded':'fell short of'} the ${tibNum(r.planned)} AU target by ${Math.abs(r.d)}%.`));});
    /* Units turning around in under a day. Groups that share a window share an
       alert — three identical cards saying the same Thursday→Friday turnaround is
       noise, and the point of the list is that each card is a different problem. */
    const shortW={};
    recovery.forEach(r=>{if(r.band&&r.band.id==='short'&&r.last&&r.next){
      const k=`${+r.last.en}|${+r.next.st}`;
      (shortW[k]||(shortW[k]={gap:r.gap,last:r.last,next:r.next,gs:[]})).gs.push(tibGroupLabel(r.g));}});
    Object.values(shortW).forEach(w=>add(2,L('Toparlanma penceresi','Recovery window'),
      `${w.gs.join(', ')} · ${tibDayName(w.last.st)} → ${tibDayName(w.next.st)}`,
      L(`Antrenmanlar arasında ${tibGapText(w.gap)} var — 24 saatlik kısa toparlanma sınırının altında.`,
        `${tibGapText(w.gap)} between sessions — under the 24h short-recovery line.`)));
    // Athletes off the squad mean in either direction.
    if(srpe.n>=3)srpe.rows.forEach(r=>{
      if(r.d!=null&&r.d<=-25)add(1,L('Düşük maruziyet','Low exposure'),r.a.name||'—',
        L(`7 günlük yük, takım ortalamasının %${Math.abs(r.d)} altında (${tibNum(r.load)} / ${tibNum(srpe.mean)} AU).`,
          `7-day load is ${Math.abs(r.d)}% below the squad mean (${tibNum(r.load)} vs ${tibNum(srpe.mean)} AU).`));
      if(r.d!=null&&r.d>=25)add(2,L('Yüksek maruziyet','High exposure'),r.a.name||'—',
        L(`7 günlük yük, takım ortalamasının %${r.d} üzerinde (${tibNum(r.load)} / ${tibNum(srpe.mean)} AU).`,
          `7-day load is ${r.d}% above the squad mean (${tibNum(r.load)} vs ${tibNum(srpe.mean)} AU).`));});
    // What the flag list found, as one line rather than one per athlete.
    if(flagged.length)add(2,L('Aksiyon gerekli','Action required'),
      L(`${flagged.length} sporcu`,`${flagged.length} athlete${flagged.length>1?'s':''}`),
      L(`${flagged.map(f=>f.a.name||'—').slice(0,4).join(', ')}${flagged.length>4?` +${flagged.length-4}`:''} — işaretli sporcular listesine bak.`,
        `${flagged.map(f=>f.a.name||'—').slice(0,4).join(', ')}${flagged.length>4?` +${flagged.length-4}`:''} — see the flag list.`));
    // Monotony: the same figure Load Monitoring reports for the week.
    const mono=teamWeekMono(days,roster,wsK).monotony;
    if(mono>2)add(mono>2.5?2:1,L('Antrenman monotonisi','Training monotony'),periodLabel,
      L(`Haftalık monotoni ${mono.toFixed(2)} — haftanın günleri birbirine fazla benziyor; gerçekten hafif bir gün ekle.`,
        `Weekly monotony ${mono.toFixed(2)} — the week's days look too alike; add a genuinely easy day.`));
    // The week as a whole against the one before it.
    if(trend.change!=null&&Math.abs(trend.change)>=20)
      add(trend.change>0?2:1,L('Haftalar arası değişim','Week-to-week jump'),
        trend.change>0?L('Yükseliş','Ramp up'):L('Düşüş','Drop off'),
        L(`Takım ortalama yükü geçen haftaya göre %${Math.abs(trend.change)} ${trend.change>0?'arttı':'azaldı'} (${tibNum(trend.cols[2].v)} → ${tibNum(trend.cols[3].v)} AU).`,
          `Squad mean load ${trend.change>0?'up':'down'} ${Math.abs(trend.change)}% on last week (${tibNum(trend.cols[2].v)} → ${tibNum(trend.cols[3].v)} AU).`));
    return out.sort((a,b)=>b.sev-a.sev);
  },[pva,recovery,srpe,flagged,trend,days,roster,wsK,periodLabel,lang]);

  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const hasWeek=sesDist.total>0||pva.live.length>0;
  /* The report prints what is on screen, so it is handed the memos themselves rather
     than recomputing the week — a sheet that disagreed with the board it was printed
     from would be worse than no sheet. Monotony and total session minutes are the two
     figures the top strip adds, and both are read off what the board already holds. */
  const printBoard=()=>printTeamInsights({
    teamName:(setup&&setup.teamName)||L('Takım','Team'),logo:setup&&setup.logo,
    periodLabel,alerts,sesDist,weekPain,painTally,pva,trend,srpe,roster:roster.length,
    sesMin:sesDist.rows.reduce((t,r)=>t+(r.min||0),0),
    mono:teamWeekMono(days,roster,wsK).monotony,
  });
  let ci=0;const card=()=>({'--i':ci++});   // one stagger step per card, in render order

  return(<section className="tib">
    <div className="tib-head">
      <h2 className="tib-h1"><i/>{L('Takım Analizi','Team Insights')}</h2>
      <span className="tib-period">{periodLabel} · {L('seçili hafta','selected week')}</span>
      <button className="btn sec sm tib-print" onClick={printBoard}
        title={L('Takım analizi çıktısı (A4 yatay)','Team Insights export (A4 landscape)')}>⎙ {L('Çıktı al','Export')}</button>
    </div>

    {/* ---- Coach alerts: the board's headline, so it sits above the grid ---- */}
    <div className="tib-card" style={card()}>
      <div className="tib-chead">
        <div><div className="tib-ct">{L('Antrenör Uyarıları','Coach Alerts')}</div>
          <div className="tib-cs">{L('Doğrudan bu haftanın rakamlarından','Read straight off this week’s numbers')}</div></div>
        <span className={'tib-count'+(alerts.length?' on':'')}>{alerts.length}</span>
      </div>
      {alerts.length===0
        ?<div className="tib-none">{L('✓ Bu hafta işaretlenecek bir şey yok — yük, toparlanma ve check-in’lerin hepsi kendi bandında.',
                                      '✓ Nothing to flag this week — load, recovery and check-ins are all inside their bands.')}</div>
        :<div className="tib-al-grid">
          {alerts.map((al,i)=><div key={al.id+i} className={'tib-al '+(al.sev>1?'high':'mid')} style={{'--i':i}}>
            <span className="dot"/>
            <div className="tx">
              <div className="k">{al.kind}</div>
              <div className="w">{al.where}</div>
              <div className="t">{al.text}</div>
            </div>
          </div>)}
        </div>}
    </div>

    {/* Three explicit columns, so Load Trend and the sRPE table can be told to fill the
        height their column is given and the board ends on one line at the bottom. Which
        card sits in which column is fixed rather than balanced: they are grouped by what
        a coach reads together — the squad's shape on the left, the week's load in the
        middle, the athlete-by-athlete ranking on its own. Below ~1000px the columns wrap
        and the same grouping stacks. */}
    <div className="tib-grid">
      <div className="tib-col">
      {/* ---- Session distribution ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Antrenman Dağılımı','Session Distribution')}</div>
            <div className="tib-cs">{L('Hafta hangi antrenman odaklarını çalıştı','Which session focus the week trained')}</div></div>
          <span className="tib-tot">{sesDist.total}<u>{L('antrenman','sessions')}</u></span>
        </div>
        {sesDist.rows.length===0
          ?<div className="tib-none">{L('Bu haftanın planında henüz antrenman yok.','No sessions on this week’s plan yet.')}</div>
          :<div className="tib-sd">
            {sesDist.rows.map(r=><div key={r.id} className="tib-sd-r">
              <span className="l"><i style={{background:r.c}}/>{TIB_FOCUS_LABEL(r)}</span>
              <span className="n">{r.n}</span>
              <span className="tib-bar"><i style={{...grow(r.n/sesDist.max*100),background:r.c}}/></span>
              <span className="m">{r.min} {L('dk','min')}</span>
            </div>)}
          </div>}
      </div>

      {/* ---- Flagged athletes ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('İşaretli Sporcular','Flagged Athletes')}</div></div>
          <span className={'tib-count'+(flagged.length?' on':'')}>{flagged.length}</span>
        </div>
        {roster.length===0
          ?<div className="tib-none">{L('Kadroda henüz sporcu yok.','No athletes on the roster yet.')}</div>
          :flagged.length===0
          ?<div className="tib-none">{L('✓ İşaretli sporcu yok — herkes planlandığı gibi çalışabilir.','✓ Nobody flagged — every athlete is clear to train as planned.')}</div>
          :<div className="tib-fl">
            {flagged.map(f=><div key={f.a.id} className={'tib-fl-r'+(f.sev>1?' hot':'')}>
              <span className="av">{f.a.photo?<img src={mediaSrc(f.a.photo)} alt=""/>:initials(f.a.name)}</span>
              <div className="tx">
                <div className="nm">{f.a.name||'—'}<u>{tibPosLabel(f.a.position)||'—'}</u></div>
                <div className="tg">{f.tags.map((t,i)=>
                  <span key={i} className={'tib-tag '+(t.pain!=null?'p'+t.pain:'s'+t.sev)}
                    title={t.pain?`${L('Ağrı','Pain')} · ${tibPainSevLabel(t.pain)}`:undefined}>
                    {t.pain!=null&&<i className="pd"/>}{t.t}</span>)}</div>
              </div>
            </div>)}
          </div>}
      </div>

      </div>

      <div className="tib-col">
      {/* ---- Planned vs actual ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Planlanan / Gerçekleşen','Planned vs Actual')}</div>
            <div className="tib-cs">{L('Hedef RPE × dakika, geri dönen yüke karşı','Target RPE × minutes, against the load that came back')}</div></div>
          {pva.d!=null&&<span className="tib-d" style={{color:tibDevCol(pva.d)}}>{tibPct(pva.d)}</span>}
        </div>
        {pva.live.length===0
          ?<div className="tib-none">{L('Bu hafta için henüz plan ya da kayıt yok.','Nothing planned or logged on this week yet.')}</div>
          :<div className="tib-pv"><table className="tib-tbl">
            <thead><tr><th>{L('Gün','Day')}</th><th className="r">{L('Planlanan','Planned')}</th><th className="r">{L('Gerçekleşen','Actual')}</th><th className="r">Δ</th></tr></thead>
            <tbody>{pva.rows.map(r=>(r.planned>0||r.actual>0)&&<tr key={r.k}>
              <td className="d">{r.label}</td>
              <td className="r"><span className="pl">{r.planned?tibNum(r.planned):'—'}</span>
                <span className="tib-mini"><i className="p" style={grow(r.planned/pva.max*100)}/><i className="a" style={grow(r.actual/pva.max*100)}/></span></td>
              <td className="r ac">{r.actual?tibNum(r.actual):'—'}</td>
              <td className="r"><span className="tib-d" style={{color:tibDevCol(r.d)}}>{tibPct(r.d)}</span></td>
            </tr>)}</tbody>
            <tfoot><tr><td className="d">{L('Hafta','Week')}</td><td className="r">{tibNum(pva.pT)}</td>
              <td className="r ac">{pva.aT?tibNum(pva.aT):'—'}</td>
              <td className="r"><span className="tib-d" style={{color:tibDevCol(pva.d)}}>{tibPct(pva.d)}</span></td></tr></tfoot>
          </table></div>}
      </div>

      {/* ---- Week-to-week trend ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Yük Trendi','Load Trend')}</div>
            <div className="tib-cs">{L('Takım ortalaması 7 günlük yük, dört hafta','Squad mean 7-day load, four weeks')}</div></div>
          {trend.change!=null&&<span className="tib-d" style={{color:tibDevCol(Math.round(trend.change),10)}}>
            {trend.change>0?'+':''}{trend.change}%</span>}
        </div>
        {trend.cols.every(c=>!c.v)
          ?<div className="tib-none">{L('Son dört haftada yük yok.','No load in the last four weeks.')}</div>
          :<div className="tib-tr">
            <div className="cols">
              {trend.cols.map((c,i)=><div key={c.key} className={'c'+(i===3?' on':'')}>
                <span className="bar"><i style={{height:lit?`${Math.max(3,c.v/trend.max*100)}%`:'0%',transitionDelay:`${i*70}ms`}}/></span>
                <span className="v">{c.v?tibNum(c.v):'—'}</span>
                <span className="l">{c.label}</span>
                <span className="tib-d dd" style={{color:tibDevCol(c.d,10)}}>{c.d==null?'':tibPct(c.d)}</span>
              </div>)}
            </div>
            <div className="tib-legend">{trend.change==null
              ?L('Geçen haftayla karşılaştırmak için yeterli geçmiş yok.','Not enough history to compare with last week.')
              :L(`Geçen haftaya göre %${Math.abs(trend.change)} ${trend.change>0?'arttı':'azaldı'}.`,
                 `${trend.change>0?'Up':'Down'} ${Math.abs(trend.change)}% on last week.`)}</div>
          </div>}
      </div>

      </div>

      <div className="tib-col">
      {/* ---- Team sRPE table ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Takım sRPE Tablosu','Team sRPE Table')}</div>
            <div className="tib-cs">{L('Haftanın toplam sRPE yükü, yüksekten aza','This week’s total sRPE load, highest to lowest')}</div></div>
          <span className="tib-tot">{tibNum(srpe.total)}<u>AU</u></span>
        </div>
        {srpe.n===0
          ?<div className="tib-none">{L('Bu hafta sıralanacak sporcu yükü yok.','No athlete load this week to rank.')}</div>
          :<>
            <div className="tib-sr">
            <table className="tib-tbl">
              <thead><tr><th className="rk">#</th><th>{L('Sporcu','Athlete')}</th>
                <th className="r">sRPE</th><th className="r">Δ</th></tr></thead>
              <tbody>{srpe.rows.map((r,i)=><tr key={r.a.id}>
                <td className="rk">{i+1}</td>
                <td className="d">{r.a.name||'—'}</td>
                <td className="r ac">{r.load?tibNum(r.load):'—'}
                  <span className="tib-mini"><i className="a" style={{...grow(r.load/srpe.max*100),background:tibDevCol(r.d,15)}}/></span></td>
                <td className="r"><span className="tib-d" style={{color:tibDevCol(r.d,15)}}>
                  {r.load?tibPct(r.d):L('yük yok','no load')}</span></td>
              </tr>)}</tbody>
            </table>
            </div>
            {/* Outside the scroller, so the reading of the table stays pinned to the
                bottom of the card instead of scrolling away with the last athlete. */}
            <div className="tib-legend">{L(`Takım ortalaması ${tibNum(srpe.mean)} AU · ${srpe.n} sporcu · AU = sRPE × dakika`,
              `Squad mean ${tibNum(srpe.mean)} AU · ${srpe.n} athletes · AU = sRPE × minutes`)}</div>
          </>}
      </div>
      </div>
    </div>
    {!hasWeek&&roster.length===0&&<div className="tib-none">
      {L('Kadroyu ekle ve haftayı planla — pano yukarıdaki takvimden kendini doldurur.',
         'Add the roster and plan a week — the board fills itself from the calendar above.')}</div>}
  </section>);
}

