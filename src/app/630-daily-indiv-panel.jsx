function DailyIndivPanel({plan,bundle,team,updateTeam,srcKey,date,exercises,setup,libMap,writeOne,customTests,calSes,calendar}){
  const panelRef=useRef(null);
  const[err,setErr]=useState('');
  /* Whose load the table's "Haftalık Yük Dağılımı" opens — this athlete's, around this day. */
  const loadCtx=useMemo(()=>({days:(plan&&plan.ath&&plan.ath.days)||{},name:(plan&&plan.ath&&plan.ath.name)||'',date}),
    [plan&&plan.ath&&plan.ath.days,plan&&plan.ath&&plan.ath.name,date]);
  /* Open or folded. Remembered per device, so a coach who works with the panel folded
     away does not have to fold it again on every card. */
  const[open,setOpenRaw]=useState(()=>{try{return localStorage.getItem('coachos_di_open')!=='0';}catch(e){return true;}});
  const setOpen=v=>{setOpenRaw(v);try{localStorage.setItem('coachos_di_open',v?'1':'0');}catch(e){}};
  /* Which face of the panel is up: today and the brief, the programme, the athlete's
     calendar — the header's "Takvim", opened over the same area instead of under the
     card. (The weekly load distribution is the "Haftalık Yük Dağılımı" button on the
     brief's movement-pattern box, in a window of its own.) The turn is
     two halves — the face swings out, the other swings in — so the swap happens at the
     point where the card is edge-on and neither face is readable. */
  const[side,setSide]=useState('brief');
  const[flip,setFlip]=useState('');           // '' | 'out' | 'in' — the half of the turn under way
  const flipT=useRef([]);
  useEffect(()=>()=>flipT.current.forEach(clearTimeout),[]);
  const flipTo=next=>{
    if(next===side||flip)return;
    setFlip('out');
    flipT.current=[setTimeout(()=>{setSide(next);setFlip('in');},170),
      setTimeout(()=>setFlip(''),170+280)];
  };
  const review=diReadReview(team,srcKey,plan.ath.id,date);
  const program=diReviewProgram(review);
  const instr=useMemo(()=>diBrief(review&&review.instr,plan.meta),[review,plan.meta]);
  const saveInstr=next=>diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{instr:next});
  /* The adjustment in force: the coach's volume from the brief when set, else the engine's. */
  const adj=diVolumeAdj(bundle.adjustment,instr);
  const rowPct=program&&program.external?0:adj.pct;
  const rows=useMemo(()=>program?diProgramRows(program,rowPct):[],[program,rowPct]);
  const calEdited=!!(program&&review&&review.decision==='accept'&&calSes&&indivHandEdited(calSes));
  const calRows=useMemo(()=>calEdited?diSessionRows(calSes,program):null,[calEdited,calSes,program]);
  const deficits=useMemo(()=>diDeficits(plan.ath,date),[plan.ath,date]);
  /* Recomputed on every render rather than read back off the stored draft: the
     athlete's day moves under it, and what the coach is looking at has to be judged
     against what is true now. */
  const differentiators=useMemo(()=>diDifferentiators(plan.ath,bundle,deficits,date),
    [plan.ath,bundle,deficits,date]);
  const recent=useMemo(()=>diRecentPrograms(team,plan.ath.id,date),[team,plan.ath.id,date]);
  const peers=useMemo(()=>diPeerPrograms(team,date,plan.ath.id),[team,date,plan.ath.id]);
  const vr=useMemo(()=>program?validateProgram(program,{bundle,instr,setup,libMap,deficits,differentiators,recent,peers}):null,
    [program,bundle,instr,review,setup,libMap,deficits,differentiators,recent,peers]);
  const blocked=!!(vr&&vr.status==='fail');

  /* The handlers below read the panel's CURRENT props through this ref rather than the
     ones captured on an earlier render — a draft saved against a stale copy of the team
     would drop whatever else was written in between. */
  const live=useRef({});
  live.current={plan,bundle,team,updateTeam,srcKey,date,setup,libMap,deficits,differentiators,recent,peers,review};
  /* The Movement Pattern table gathered into a programme and put where the coach reads it —
     the same draft, the same checks and the same approval a written programme always had.
     There is no save button: "Programı Gör" builds it from whatever the table holds at that
     moment (until the programme is approved; after that the calendar's copy is the one).
     It reaches the calendar only through "Onayla ve takvime yaz". Returns the programme. */
  const buildProgram=()=>{
    const L0=live.current;
    const prog=diManualProgram(instr,L0.libMap,L0.plan.meta&&L0.plan.meta.name);
    const cur=L0.review&&L0.review.program;
    /* An empty table leaves what is there alone (a programme copied in from the history,
       say); the same programme as the stored one is not written again. */
    if(!prog)return cur||null;
    if(cur&&JSON.stringify(cur)===JSON.stringify(prog))return cur;
    let v;
    try{
      v=validateProgram(prog,{bundle:L0.bundle,instr,setup:L0.setup,libMap:L0.libMap,deficits:L0.deficits,
        differentiators:L0.differentiators,recent:L0.recent,peers:L0.peers});
    }catch(e){setErr((e.message||String(e))+' — '+L('program kontrol edilemedi.','the programme could not be checked.'));return cur||null;}
    diWriteReview(L0.team,L0.updateTeam,L0.srcKey,L0.plan.ath.id,L0.date,{
      athlete:L0.plan.ath.id,date:L0.date,src:L0.srcKey,program:prog,instr,
      differentiators:L0.differentiators,validation:v,
      engine:{readiness:L0.bundle.readiness,adjustment:L0.bundle.adjustment,flag:L0.bundle.flag,
        competition:L0.bundle.competition,season_phase:L0.bundle.season_phase,tier:L0.bundle.tier},
      model:'manual',created_at:new Date().toISOString(),
      decision:null,decided_at:null,jobId:null,pendingJob:null,generation:{source:'manual'}});
    setErr('');
    return prog;
  };
  /* Write is the approval: the coach read the session and said yes, so it is recorded
     as the decision AND put on the athlete's calendar in the same press. */
  const write=()=>{
    if(!program)return;
    /* THE APPROVAL IS NOT THE GATE. The coach saying yes is necessary and it is not
       sufficient: a session that breaks a hard rule is not written, and there is no
       button here that writes it anyway. That is the whole point of the split — the
       coach decides what is GOOD, the code decides what is ALLOWED, and neither
       overrules the other. Re-checked at the press rather than trusted from the
       stored verdict, because the athlete's day moves under a draft. */
    const v=validateProgram(program,{bundle,instr,setup,libMap,deficits,differentiators,recent,peers});
    if(v.status==='fail'){
      diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{validation:v});
      setErr(L(`Bu program ${v.hardViolations.length} sert kuralı ihlal ediyor ve takvime yazılamaz. Aşağıdaki maddeleri gider ya da tabloyu düzenleyip programı yeniden oluştur.`,
        `This session breaks ${v.hardViolations.length} hard rule${v.hardViolations.length>1?'s':''} and cannot be written to the calendar. Clear the items below, or edit the table and build the programme again.`));
      return;
    }
    diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,
      {decision:'accept',decided_at:new Date().toISOString(),validation:v});
    if(writeOne)writeOne(plan.ath.id,program);
  };
  /* Filing a written exercise into the shared library, through the same bridge the
     calendar's own exercise box uses — so a name filed here is filed exactly as one
     typed on a programme, and its movement pattern rides along. */
  const addLib=row=>{
    const nm=String(row&&row.name||'').trim();
    if(!nm)return;
    addExerciseToLibrary(nm);
    if(row.pattern)rememberExerciseTags(nm,row.pattern,'');
  };
  const undo=()=>diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{decision:null,decided_at:null});
  const discard=()=>{
    if(!confirm(L('Bu program silinsin mi? Talimatlar kalır.','Discard this session? The brief stays.')))return;
    diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{program:null,decision:null,decided_at:null});
  };

  const rd=bundle.readiness;
  const written=!!(review&&review.decision==='accept');
  /* Status roles, each one paired with the word beside it on the tile: readiness by the
     app's own band colours, ACWR by its own zone table, the game day by how close it is.
     Nothing here invents a threshold — they are the ones the rest of the app reads. */
  const rdTone=rd.score==null?null:(rd.score>=4?'good':rd.score>=3?'warn':'bad');
  const md=bundle.competition.md;
  const mdTone=md==='MD'?'bad':(md==='MD-1'||md==='MD+1')?'warn':null;
  const acwr=bundle.load.acwr;
  const zone=acwr?acwrZoneOf(acwr):null;
  const acwrTone=acwr==null?null:(acwr>1.5?'bad':(acwr>=0.8&&acwr<=1.3)?'good':'warn');
  const adjTone=adj.pct<=-25?'bad':adj.pct<0?'warn':'good';

  const progTitle=(calEdited&&String(calSes.name||'').trim())||(program&&program.session_name)||L('Önerilen program','Proposed session');
  const progRows=calRows||rows;
  const progAdj=(calRows||(program&&program.external))?{...adj,pct:0}:adj;
  const onProg=side==='prog';
  /* "Programı Gör": what is written in the table right now, on the programme face. */
  const viewProg=()=>{if(!written)buildProgram();flipTo('prog');};
  /* Print the programme with the exercises' pictures: the programme the card shows, or —
     before it is approved — whatever the table holds this moment. */
  const printProg=withImages=>{
    let rs=progRows,ttl=progTitle,pct=progAdj.pct;
    if(!written){
      const p=buildProgram();
      if(!p){setErr(L('Yazdırılacak egzersiz yok — antrenman tablosuna en az bir egzersiz yaz.',
        'There is nothing to print — write at least one exercise in the training table.'));return;}
      rs=diProgramRows(p,p.external?0:adj.pct);ttl=p.session_name||ttl;pct=p.external?0:adj.pct;
    }
    /* The session's own line — start, length, focus, target RPE — as the athlete has it:
       off the calendar once written, off the plan before that. */
    const m=(written&&calSes)||plan.meta||{};
    printDiProgram({ath:plan.ath,date,title:ttl,rows:rs,pct,withImages,
      time:m.time,duration:m.duration,focus:sesFocusLine(m),rpe:sesRpeTarget(m)});
  };
  return(<div className="di-panel" ref={panelRef}>
    <div className={'di-hd'+(open?'':' folded')}>
      <span className="di-title">{L('Günlük Bireyselleştirme','Daily individualization')}</span>
      <div className="di-hdacts">
        {open&&calendar&&<button type="button" className={'di-viewbtn'+(side==='cal'?' on':'')} aria-pressed={side==='cal'}
          onClick={()=>flipTo(side==='cal'?'brief':'cal')}
          title={side==='cal'?L('Bugünün tablosuna ve talimata dön','Back to today and the brief'):L('Kartı çevir, sporcunun takvimini göster','Turn the card over to the athlete\'s calendar')}>
          <i>▦</i><span>{L('Takvim','Calendar')}</span></button>}
        {open&&<button type="button" className={'di-flipbtn'+(onProg?' back':'')} aria-pressed={onProg}
          onClick={()=>onProg?flipTo('brief'):viewProg()}
          title={onProg?L('Bugünün tablosuna ve talimata dön','Back to today and the brief')
            :L('Kartı çevir, bu sporcunun programını göster','Turn the card over to this athlete\'s programme')}>
          <i>⟳</i><span>{onProg?L('Talimata Dön','Back to Brief'):L('Programı Gör','View Programme')}</span>
        </button>}
        {open&&onProg&&program&&<button type="button" className="di-printbtn" onClick={()=>printProg(false)}
          title={L('Programı yazdır ya da PDF olarak kaydet','Print the programme or save it as a PDF')}>
          <i>🖨</i><span>{L('Yazdır','Print')}</span></button>}
        {open&&<button type="button" className="di-printbtn" onClick={()=>printProg(true)}
          title={L('Programı egzersiz görselleriyle (küçük) yazdır ya da PDF olarak kaydet','Print the programme with the exercise pictures (small), or save it as a PDF')}>
          <i>🖨</i><span>{L('Yazdır (Görselli)','Print (with images)')}</span></button>}
        <button type="button" className={'di-fold'+(open?' open':'')} onClick={()=>setOpen(!open)}
          aria-expanded={open} title={open?L('Paneli kapat','Fold the panel'):L('Paneli aç','Open the panel')}>
          <span>{open?L('Kapat','Fold'):L('Aç','Open')}</span><i>▾</i>
        </button>
      </div>
    </div>
    {open&&<div className={'di-face'+(flip?' '+flip:'')}>
    {side==='brief'&&<>

    <DiSection n="1" title={date===fmt(today)?L('Bugünün tablosu','Today at a glance')
        :L(`${fd(date)} tablosu`,`${fd(date)} at a glance`)}
      meta={L('hesaplanan değerler — model bunları üretmez','computed — the model does not produce these')}>
      <div className="di-grid">
        <DiTile label={L('Hazır oluş','Readiness')}
          value={rd.score!=null?rd.score:'—'} unit="/5"
          fill={rd.score!=null?rd.score/5*100:null} tone={rdTone}
          sub={`${rd.status||'—'}${rd.source==='estimated from sRPE trend'?L(' · tahmini',' · estimated'):''}`}/>
        <DiTile label={L('Müsabaka günü','Competition day')} value={md||'—'} tone={mdTone}
          sub={(()=>{const cp=bundle.competition;
            /* The fixture the label is counted from, named, so an MD+n can be checked
               against the calendar at a glance. */
            if(cp.today)return L(`bugün: ${cp.today.name||'maç'}`,`today: ${cp.today.name||'game'}`);
            if(md&&/^MD\+/.test(md)&&cp.previous)
              return L(`son maç ${fd(cp.previous.date)}: ${cp.previous.name||'maç'}`,`last game ${fd(cp.previous.date)}: ${cp.previous.name||'game'}`);
            if(cp.next)return L(`${cp.next.days_until} gün sonra: ${cp.next.name||'maç'}`,`in ${cp.next.days_until} days: ${cp.next.name||'game'}`);
            return L('planlı maç yok','no fixture scheduled');})()}/>
        <DiTile label={L('Sezon fazı','Season phase')} value={bundle.season_phase.label||'—'} text
          sub={bundle.season_phase.focus.slice(0,3).join(' · ')||'—'}/>
        <DiTile label={L('İç yük','Internal load')} value={bundle.load.srpe7||0}
          unit={L(' AU / 7 gün',' AU / 7 days')} tone={acwrTone}
          sub={`ACWR ${acwr??'—'}${zone?` · ${zone.t}`:''}${bundle.load.rpe7!=null?` · RPE ${bundle.load.rpe7}`:''}`}/>
        {bundle.playing_time.last&&
          <DiTile label={L('Son maç süresi','Last game minutes')} value={bundle.playing_time.last.minutes}
            unit={L(' dk',' min')}
            sub={`${fd(bundle.playing_time.last.date)}${bundle.competition.back_to_back?L(' · arka arkaya',' · back-to-back'):''}`}/>}
        {/* The one number the model is not allowed to move, on the same row as the rest:
            whatever the session comes back as, this percentage comes off it. */}
        <DiTile label={L('Hacim ayarı','Volume adjustment')} text={!adj.pct}
          value={adj.pct?`${adj.pct>0?'+':''}${adj.pct}%`:L('yok','none')}
          fill={adj.pct?Math.min(100,Math.abs(adj.pct)/Math.abs(adj.floor)*100):0} tone={adjTone}
          title={adj.reasons.map(r=>`${r.label} → ${r.pct}%`).join('\n')}
          sub={adj.coach
            ?L(`antrenör ayarı · sistem önerisi ${adj.auto?`${adj.auto}%`:'yok'}`,`set by the coach · system ${adj.auto?`${adj.auto}%`:'none'}`)
            :adj.reasons.length
            ?adj.reasons.map(r=>r.label).join(' · ')
            :L('hazır oluş normal','readiness normal')}/>
      </div>
      </DiSection>

    <DiSection n="2" title={L('Antrenör talimatı','Coach brief')}
      meta={diInstrFilled(instr)?L('bu güne ve bu sporcuya ait','for this athlete, this day'):L('tamamı isteğe bağlı','every field optional')}>
      <PlanLoadCtx.Provider value={loadCtx}>
        <DiInstructionForm instr={instr} save={saveInstr} athId={plan.ath.id}/>
      </PlanLoadCtx.Provider>
    </DiSection>
    </>}

    {onProg&&program&&<DiSection n="3" title={progTitle}
      className="di-sec-prog"
      meta={written?(calEdited?L('takvimdeki güncel hali','as it stands on the calendar'):L('takvime yazıldı','on the calendar'))
        :L('senin yazdığın program — onaylanmadan sporcuya ulaşmaz','the session you wrote — it reaches nobody until you approve it')}>
      <div className="di-result">
        <div className="di-resacts">
          <button type="button" className="btn xs sec" onClick={discard}>
            {L('✕ Sil','✕ Discard')}</button>
        </div>
        {/* Once written and then edited on the athlete's calendar, the card shows the
            calendar's version — the one the athlete actually has — rather than the
            programme as it was loaded, so the two never disagree. */}
        <DiProgramView program={program} rows={progRows} adj={progAdj} libMap={libMap}
          onAddToLibrary={addLib} diffs={differentiators}/>

        {/* A hard violation stops the write, so it is still said here. The model's own
            notes on the programme — how it read the brief, its checks, its rationale and
            warnings — are not shown: the card is the programme and nothing else. */}
        {vr&&vr.hardViolations.length>0&&<div className="di-hardv">
          <div className="di-checkh">⛔ {L(`Sert kural ihlali — bu program takvime yazılamaz (${vr.hardViolations.length})`,
            `Hard rule violation — this session cannot be written (${vr.hardViolations.length})`)}</div>
          <ul className="di-sig">{vr.hardViolations.map((v,i)=><li key={i}>
            {v.rule?<i className="di-cfld">{L('Kural','Rule')} {v.rule}</i>:null} {v.text}</li>)}</ul>
        </div>}
        {program.truncated&&<div className="di-dim">{L('Yanıt token sınırında kesildi — kurtarılabilen kısım gösteriliyor.','The reply hit the token cap — the salvageable part is shown.')}</div>}

        {/* AI draft → coach review → final programme. Until this button is pressed the
            athlete's calendar is HELD: neither this session nor the plain copy of the
            team session is written for them. */}
        <div className="di-writebar">
          {written
            ?<><span className="di-wrote">✓ {L('Sporcunun takvimine yazıldı','Written to the athlete\'s calendar')}</span>
              <button type="button" className="btn xs sec" onClick={undo}>{L('geri al','undo')}</button></>
            :<><button type="button" className="di-write" onClick={write} disabled={blocked}
                title={blocked?L('Sert kural ihlali var — önce yukarıdaki maddeleri gider.',
                  'There is a hard rule violation — clear the items above first.'):''}>
                ✓ {L('Onayla ve takvime yaz','Approve and write to the calendar')}</button>
              <span className="di-dim">{blocked
                ?L('Sert kural ihlali giderilmeden yazılamaz. Tabloyu düzenleyip programı yeniden oluşturabilir ya da sporcunun kendi takviminden elle yazabilirsin.',
                   'It cannot be written until the hard violation is cleared. Edit the table and build the programme again, or write it by hand on the athlete\'s own calendar.')
                :L('Onaylayıp sporcunun kendi takvimine işler.','Approves it and puts it on the athlete\'s own calendar.')}</span></>}
        </div>
      </div>
    </DiSection>}

    {side==='cal'&&calendar&&React.cloneElement(calendar,{showCal:true,showLoad:false})}

    {onProg&&!program&&<div className="di-hold sm">
      {L('Bu sporcu için henüz bir program yok — antrenman tablosuna egzersiz yaz; "Programı Gör" onu burada gösterir. Ya da sporcunun takviminden elle yaz. Program onaylanıp takvime işlenene kadar sporcunun takvimine bu sayfadan bir şey yazılmaz.',
         'No programme for this athlete yet — write exercises in the training table and "View Programme" shows it here, or write it by hand on the athlete\'s calendar. Until one is approved, this page puts nothing on their calendar.')}
    </div>}
    </div>}
    {/* Outside the faces: an approval refused on the programme side and a snapshot that
        failed on the brief side both have to be seen whichever face is up. */}
    {open&&err&&<div className="di-err">{err}</div>}
  </div>);
}

function IndivAthleteCard({plan,calendar,panel,open,setOpen}){
  const a=plan.ath;
  const initials=(a.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const rdCol=plan.band?plan.band.color:'var(--dim)';
  /* Soreness and fatigue are rated 1-5 with 5 as the good end, so the colour scale
     runs the same way round as readiness: low is the one to look at. */
  const wCol=v=>v==null?'var(--dim)':v<2.5?'#f43f5e':v<3.5?'#f59e0b':v<4.5?'#eab308':'#2dd4a7';
  const sevTxt=sev=>painSevWord(sev)?` · ${painSevWord(sev)}`:'';
  const painChips=[
    ...(plan.painNote&&plan.painNote.quoted?[{key:'note',note:true,text:`“${plan.painNote.text}”`,
      title:L(`Ağrı bildirimi · ${fd(plan.painNote.date)}`,`Pain report · ${fd(plan.painNote.date)}`)}]:[]),
    ...(plan.painNote?(plan.painNote.regions||[]).map(g=>({key:'g'+g.region,text:g.region,style:painChipStyle(g.sev),
      title:L(`Ağrı bildirimi · ${fd(g.date||plan.painNote.date)}${sevTxt(g.sev)}`,`Pain report · ${fd(g.date||plan.painNote.date)}${sevTxt(g.sev)}`)})):[]),
    ...(plan.pains||[]).filter(p=>!painNoteCovers(plan.painNote,p.tag)).map(p=>({key:'p'+p.tag,text:ctLabel(p.tag),style:painChipStyle(p.sev),
      title:L(`Günlük check-in · ${fd(p.date)}${sevTxt(p.sev)}`,`Daily check-in · ${fd(p.date)}${sevTxt(p.sev)}`)})),
  ];
  return(<div className={'iv-card'+(open?' open':'')}>
    <div className="iv-card-hd" onClick={()=>setOpen(!open)}>
      <div className="iv-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials}</div>
      <div className="iv-id">
        <div className="iv-nm">{a.name||'—'}</div>
        <div className="iv-meta">
          {a.position?<span>{posOf(a.position)} · {posGroupLabel(plan.posGroup)}</span>:<span className="iv-dim">{L('mevki yok','no position')}</span>}
          {(a.constraintTags||[]).map(t=><span key={t} className="iv-warnchip">{ctLabel(t)}</span>)}
        </div>
      </div>
      {/* What the athlete told us, next to what is about to be prescribed. Their own
          words about what hurts lead — it is the one thing here that is not a
          number, and the thing most likely to change what the coach writes. */}
      <div className="iv-daybar">
        {painChips.length>0&&<div className="iv-pains">
          {painChips.map(c=><span key={c.key} className={'iv-painchip'+(c.note?' note':'')} style={c.style} title={c.title}>{c.text}</span>)}
        </div>}
        <span className="iv-dchip" title={L(`Dünkü seans RPE'si (${fd(plan.prev.date)}) — sporcunun kendi puanı`,`Yesterday's session RPE (${fd(plan.prev.date)}) — the athlete's own rating`)}>
          <i>{L('dün rpe','yest. rpe')}</i><b style={{color:rpeColor(plan.prev.rpe)||'var(--dim)'}}>{plan.prev.rpe!=null?plan.prev.rpe:'—'}</b>
        </span>
        <span className="iv-dchip" title={L(`Dünkü iç yük (${fd(plan.prev.date)}) — sRPE × süre`,`Yesterday's internal load (${fd(plan.prev.date)}) — sRPE × duration`)}>
          <i>{L('dün srpe','yest. srpe')}</i><b>{plan.prev.load>0?`${plan.prev.load} AU`:'—'}</b>
        </span>
        <span className="iv-dchip" title={plan.well.date?L(`${fd(plan.well.date)} check-in'indeki kas ağrısı — 1 çok fazla, 5 hiç`,`Muscle soreness on the check-in of ${fd(plan.well.date)} — 1 very severe, 5 none`):L('Son 2 günde check-in yok','No check-in in the last 2 days')}>
          <i>{L('kas ağrısı','soreness')}</i><b style={{color:wCol(plan.well.soreness)}}>{plan.well.soreness!=null?`${plan.well.soreness}/5`:'—'}</b>
        </span>
        <span className="iv-dchip" title={plan.well.date?L(`${fd(plan.well.date)} check-in'indeki yorgunluk — 1 çok yorgun, 5 dinç`,`Fatigue on the check-in of ${fd(plan.well.date)} — 1 very tired, 5 fresh`):L('Son 2 günde check-in yok','No check-in in the last 2 days')}>
          <i>{L('yorgunluk','fatigue')}</i><b style={{color:wCol(plan.well.fatigue)}}>{plan.well.fatigue!=null?`${plan.well.fatigue}/5`:'—'}</b>
        </span>
      </div>
      <div className="iv-rd" style={{borderColor:rdCol,color:rdCol}}>
        <b>{plan.rd.score!=null?plan.rd.score:'—'}</b><span>{L('hazır oluş','readiness')}</span>
        {plan.rd.src==='srpe'&&<i title={L('Wellness kaydı yok — sRPE trendinden kestirildi','No wellness record — estimated from the sRPE trend')}>{L('tahmin','estimate')}</i>}
      </div>
      {plan.changed>0&&<div className="iv-adj sub">{L(`${plan.changed} değişti`,`${plan.changed} changed`)}</div>}
      <span className="iv-ch">{open?'▼':'▶'}</span>
    </div>
    {plan.notes.length>0&&<div className="iv-notes" title={L('Antrenör notları — karar verirken bakılır, hiçbir şey bunları otomatik okumaz','Coach notes — reference while deciding, nothing reads them automatically')}>
      <span className="h">📝 {L('Not','Note')}</span>
      <span className="t">{plan.notes[0].date?`${fd(plan.notes[0].date)} — `:''}{plan.notes[0].text}</span>
      {plan.notes.length>1&&<span className="iv-dim">+{plan.notes.length-1} {L('tane daha','more')}</span>}
    </div>}
    {/* The program is written and edited on this athlete's own calendar, on the session
        itself, so there is one place it lives. With the panel, that calendar and its load
        distribution are two more faces of the panel's card (header buttons); without one
        there is nothing to turn, so the calendar is simply shown. */}
    {open&&<div className="iv-card-body iv-calbody">
      {panel?React.cloneElement(panel,{calendar}):calendar}</div>}
  </div>);
}

/* ---- The Individualization workspace -------------------------------------
   Pick a day, pick a source session, pick the athletes; the program lands on each
   athlete's own calendar and is edited there, on their card. There is no rule
   configuration because there are no rules. */
/* The athlete's own calendar — the same component the Athletes tab shows, with the same
   athlete summary, the same editing and the same load distribution under it, except that opening a session and editing it happens INSIDE the card rather
   than in a modal over the page. It keeps its own week cursor, starting on the day
   being individualized. */
function IndivAthleteCalendar({ath,team,setup,weeks,exercises,saveDays,date,showCal=true,showLoad=true}){
  const[sel,setSel]=useState(()=>{const d=parseD(date||fmt(today));
    return{year:d.getFullYear(),month:d.getMonth()+1,date:date||fmt(today)};});
  /* Each part is drawn only when its header button is on; the week cursor lives here, so
     it survives the calendar being hidden and shown again. */
  return<>{showCal&&<CalendarView days={ath.days||{}} selected={sel} setSelected={setSel} goDayView={()=>{}}
    weeks={weeks||[]} saveDays={saveDays} setup={setup} labelOwner={ath.name} exercises={exercises} inline
    coachAthlete={ath} ownerAth={ath} sesTip/>}
    {showLoad&&<MuscleLoadDistribution days={ath.days||{}} refDate={sel.date}/>}</>;
}

