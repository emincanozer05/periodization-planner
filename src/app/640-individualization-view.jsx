function IndividualizationView({data,team,updateTeam,weeks}){
  const athletes=team.athletes||[];
  const store=team.indiv||{};
  const[date,setDate]=useState(fmt(today));
  useFollowToday(setDate);
  const[srcKey,setSrcKey]=useState('');
  const[sel,setSel]=useState(null);           // null = auto (assigned / all)
  const[open,setOpen]=useState({});
  const[toast,setToast]=useState('');
  // Edits made from the calendar on a card go straight onto that athlete.
  const saveAthDays=(athId,days)=>updateTeam(team.id,{athletes:athletes.map(a=>a.id===athId?{...a,days}:a)});

  const daySessions=((team.days||{})[date]||{}).sessions||[];
  const sources=useMemo(()=>[
    ...daySessions.map(s=>({key:`team:${date}:${s.id}`,group:'Team plan',label:`${s.name||'Session'} · ${s.time||''}`,session:s,team:s})),
  ],[daySessions,date]);
  /* THE SOURCE THE SHEET OPENS ON IS THE DAY'S OWN PLAN — NEVER A TEMPLATE.
     The pick used to fall through to `sources[0]`, and on a date with no team session
     that first source is whatever template happens to sit at the top of the library. The
     box then read like the day's program while holding something that belongs to no day
     at all, and one press of "Write to selected" put that template onto every athlete's
     calendar for a day the team plan reads as rest — a session the coach could not find
     anywhere on the team calendar, written again on every press. So the fall-back is the
     date's own team session and nothing else: with none, no source is selected, the write
     button is dead, and a template reaches a calendar only once the coach has picked it
     here by name. */
  const teamSrc=sources.find(s=>s.group==='Team plan')||null;
  const src=sources.find(s=>s.key===srcKey)||teamSrc;
  const activeKey=src?src.key:'';
  const ovrAll=(store.ovr||{})[activeKey]||{};

  /* Who this source may be written to at all. A team session that names its athletes has
     been assigned, and the sheet is bound by that assignment: the program it builds is
     that session's program, so it goes to the athletes it was given to and to nobody
     else — a block written for the guards must not land on a forward's calendar because
     the sheet was left on "All". A session with nobody ticked, and a template (which
     belongs to no day), carry no assignment to honour: there the whole roster stands, as
     it always has. `null` means exactly that — no assignment. */
  const srcRoster=useMemo(()=>{
    const ids=(src&&src.team&&src.team.athletes)||[];
    // Ticked names that have since left the squad drop out, but the assignment itself
    // stands: a session given to five players who are all gone reaches nobody, it does
    // not fall back to the whole roster.
    return ids.length?ids.filter(id=>athletes.some(a=>a.id===id)):null;
  },[src,athletes]);
  // The roster the sheet works over — the assigned athletes, or everyone when unassigned.
  const roster=useMemo(()=>srcRoster?athletes.filter(a=>srcRoster.includes(a.id)):athletes,[srcRoster,athletes]);
  const autoIds=useMemo(()=>roster.map(a=>a.id),[roster]);
  /* A hand-picked selection is filtered through the assignment too, so un-assigning an
     athlete on the team session takes them off this sheet as well instead of leaving the
     old pick to write to them again. */
  const chosen=useMemo(()=>{
    const c=sel||autoIds;
    return srcRoster?c.filter(id=>srcRoster.includes(id)):c;
  },[sel,autoIds,srcRoster]);
  const toggleAth=id=>{const c=chosen.includes(id)?chosen.filter(x=>x!==id):[...chosen,id];setSel(c);};

  const plans=useMemo(()=>{
    if(!src)return[];
    return athletes.filter(a=>chosen.includes(a.id))
      .map(a=>buildIndivPlan(src.session,a,{ref:date,ovr:ovrAll[a.id]||{}}));
  },[src,athletes,chosen,date,ovrAll]);

  /* ---- The daily individualization engine (§40) ---------------------------
     One bundle per athlete on the sheet: readiness, load, pain, exposure, the
     competition day, the season phase and the volume adjustment, all computed here
     so the card draws numbers rather than asking a model for them. The coach's own
     line for the day sits above the whole thing as a constraint (§22) and is stored
     against the source session rather than the template, so today's instruction does
     not follow it into next week. */
  const exercises=data.exercises||[];
  const libMap=useMemo(()=>{const m={};
    exercises.forEach(e=>{const n=String(e.name||'').trim().toLowerCase();if(n&&!m[n])m[n]=e;});
    return m;},[exercises]);
  const bundles=useMemo(()=>{
    const out={};
    plans.forEach(p=>{
      try{out[p.ath.id]=diBundle(p.ath,team.setup||{},date,{libMap});}
      /* One athlete with data the engine cannot read must not take the whole sheet
         down with them — the card simply renders without its panel. */
      catch(e){out[p.ath.id]=null;}
    });
    return out;
  },[plans,team.setup,date,libMap]);
  /* "Tüm Sporcuların Bilgilerini Al": every selected athlete, from the team as it stands
     at the press. Each carries their own brief for this day and source; an athlete whose
     record the engine cannot read is named rather than silently left out. */
  const[squadSnap,setSquadSnap]=useState(null);
  const takeSquadSnapshot=()=>{
    const setup=team.setup||{};
    const items=[],skipped=[];
    athletes.filter(a=>chosen.includes(a.id)).forEach(a=>{
      const p=plans.find(x=>x.ath.id===a.id)||null;
      try{
        const review=activeKey?diReadReview(team,activeKey,a.id,date):null;
        items.push({ath:a,
          instr:diBrief(review&&review.instr,p?p.meta:null),session:p?p.meta:null,recent:diRecentPrograms(team,a.id,date)});
      }catch(e){skipped.push(a.name||a.id);}
    });
    if(!items.length){setToast(L('Seçili sporcuların verisi okunamadı.','The selected athletes\' data could not be read.'));return;}
    let text;
    try{text=JSON.stringify(diSquadSnapshot({items,setup,date,customTests:data.customTests,libMap}));}
    catch(e){setToast((e.message||String(e))+' — '+L('sporcu bilgileri okunamadı.','the athlete data could not be read.'));return;}
    const note=L(`${items.length} sporcu.`,`${items.length} athletes.`)+(skipped.length
      ?' '+L(`Verisi okunamayan: ${skipped.join(', ')}.`,`Could not read: ${skipped.join(', ')}.`):'');
    setSquadSnap({text,copied:null,note});
    snapCopy(text).then(ok=>setSquadSnap(x=>x&&x.text===text?{...x,copied:ok}:x));
  };

  /* The review standing against each athlete on this source and day, and — from it —
     the plan the sheet is allowed to write for them. A draft still waiting on the coach
     returns no plan at all: that athlete's calendar is held until they decide. Both the
     automatic pass and the button go through here, so there is exactly one answer to
     "what reaches the athlete", and it is the coach's. */
  const reviewOf=p=>diReadReview(team,activeKey,p.ath.id,date);
  const pctFor=p=>{const b=bundles[p.ath.id];return(b&&b.adjustment&&b.adjustment.pct)||0;};
  /* THE LAST GATE, AND THE ONE THAT ACTUALLY GUARDS THE DATABASE.
     Everything above it is a screen the coach reads; this is the check that runs on
     the exact programme about to be written, with the athlete's data as it stands at
     the moment of the write. It matters that it is here and not only on the card: the
     automatic pass writes without anybody pressing anything, a draft approved this
     morning can be carried into an afternoon where a check-in has closed a pattern,
     and a programme that reaches this function by any other route still has to get
     past it. A programme with nothing to validate (no AI draft — the plain copy of the
     team session) passes: it is the coach's own plan, not a generated one. */
  const validateFor=(p,prog)=>{
    const b=bundles[p.ath.id];
    if(!prog||!b)return null;
    const r=diReadReview(team,activeKey,p.ath.id,date);
    const deficits=diDeficits(p.ath,date);
    return validateProgram(prog,{
      bundle:b,instr:diBrief(r&&r.instr,p.meta),
      setup:team.setup||{},libMap,deficits,
      differentiators:diDifferentiators(p.ath,b,deficits,date),
      recent:diRecentPrograms(team,p.ath.id,date),
      peers:diPeerPrograms(team,date,p.ath.id)});
  };
  /* `force` is the programme the coach has just pressed Write on. Its approval is in
     the same React tick as this call, so the store still reads "waiting" — passing the
     programme itself is what keeps one press from needing two. */
  const planToWrite=(p,force)=>{
    if(force)return diProgramPlan(p,force,pctFor(p));
    const r=reviewOf(p);
    const gate=diWriteGate(r);
    if(!gate.write)return null;
    return gate.approved?diProgramPlan(p,diReviewProgram(r),pctFor(p)):p;
  };

  /* What is already on each athlete's own calendar for this source and date, keyed by
     athlete. This is what makes the button a one-time action: the sheet can see that a
     program was written, when, and whether it still matches what the sheet says. */
  const written=useMemo(()=>{
    const out={};
    if(!activeKey)return out;
    athletes.forEach(a=>{
      const ses=((((a.days||{})[date])||{}).sessions||[]).find(s=>s.indiv&&s.indiv.srcKey===activeKey);
      if(ses)out[a.id]=ses;
    });
    return out;
  },[athletes,date,activeKey]);

  /* Writing is scoped to a list of athletes so the same path serves the squad
     button in the bar and the per-athlete button on each card. */
  const applyTo=(ids,opts={})=>{
    if(!src)return;
    let targets=plans.filter(p=>ids.includes(p.ath.id));
    /* An athlete with an undecided draft is not written to, however the write was asked
       for. Pressing the button does not overrule the review — it is the review that says
       what this athlete does today, and it is not finished. They are named in the toast
       rather than silently dropped, so the button never looks broken. */
    const forceId=(opts.force&&opts.force.id)||null;
    /* One programme per athlete, handed in by the press itself (a squad JSON pasted into
       the bar): these athletes are written with it, whatever their stored draft says. */
    const forceMap=opts.forceMap||{};
    const forcedOf=id=>forceMap[id]||(forceId===id&&opts.force?opts.force.program:null);
    const held=targets.filter(p=>!forcedOf(p.ath.id)&&diWriteGate(reviewOf(p)).waiting);
    if(held.length){
      const skip=new Set(held.map(p=>p.ath.id));
      targets=targets.filter(p=>!skip.has(p.ath.id));
      if(!opts.auto)setTimeout(()=>setToast(L(
        `${held.length} sporcu AI taslağı onayı bekliyor — kartı açıp onayla`,
        `${held.length} athlete${held.length>1?'s':''} waiting on draft approval — open the card and approve`)),0);
    }
    if(targets.length===0)return;
    /* Final validation, on the exact programme each athlete is about to be given. A
       failure takes that athlete out of the write — not the whole pass, because one
       athlete whose knee closed a pattern at lunchtime must not hold up the fourteen
       whose sessions are fine. The verdict is stored on their review so the card shows
       the same reason the toast names. */
    const failed=[];
    targets=targets.filter(p=>{
      const prog=forcedOf(p.ath.id)
        ||(()=>{const r=reviewOf(p);const g=diWriteGate(r);return(g.approved&&r)?diReviewProgram(r):null;})();
      if(!prog)return true;                       // no generated session — the coach's own plan
      const v=validateFor(p,prog);
      if(!v||v.status!=='fail')return true;
      failed.push({p,v});
      return false;
    });
    if(failed.length){
      /* THE VERDICT IS ONLY WRITTEN WHEN IT CHANGED, and this is not tidiness — it is
         what keeps the automatic pass from chasing its own tail. That pass re-runs on
         `team.indiv`, `diWriteReview` stamps a fresh `updated_at` on every call, and an
         athlete whose session fails stays due on the next round: storing the same
         verdict again would move `team.indiv`, wake the effect, store it again, for as
         long as the page is open. */
      const sameVerdict=(a,b)=>!!a&&!!b&&a.status===b.status
        &&JSON.stringify((a.hardViolations||[]).map(x=>x.text))
         ===JSON.stringify((b.hardViolations||[]).map(x=>x.text));
      failed.forEach(({p,v})=>{
        const prev=diReadReview(team,activeKey,p.ath.id,date);
        if(sameVerdict(prev&&prev.validation,v))return;
        diWriteReview(team,updateTeam,activeKey,p.ath.id,date,{validation:v});
      });
      /* The card already carries the red box, recomputed live. A toast on the automatic
         pass would repeat it on every render of a page nobody pressed anything on. */
      if(!opts.auto){
        const names=failed.map(f=>f.p.ath.name||'—').join(', ');
        setTimeout(()=>setToast(L(
          `${names} — program sert kural ihlali taşıyor, takvime yazılmadı. Kartı açıp gerekçeyi oku.`,
          `${names} — the session breaks a hard rule and was not written. Open the card to read why.`)),0);
      }
    }
    if(targets.length===0)return;
    /* A program the coach has since written by hand on the athlete's own calendar — from
       the calendar this card opens, or from the Athletes tab — is not the sheet's to
       overwrite. Writing replaces the session outright, so exercises typed there would
       simply vanish. The automatic pass leaves those athletes alone; a deliberate press
       asks first, per athlete, and skips the ones the coach declines. */
    const edited=targets.filter(p=>indivHandEdited(written[p.ath.id]));
    if(edited.length){
      if(opts.auto){
        const skip=new Set(edited.map(p=>p.ath.id));
        targets=targets.filter(p=>!skip.has(p.ath.id));
      }else{
        const names=edited.map(p=>p.ath.name||'—').join(', ');
        if(!confirm(`${names} — takviminde elle yazılmış/düzenlenmiş bir program var. Bu sayfadaki program onun yerine yazılsın mı?\n\n(İptal edersen o sporcunun takvimi olduğu gibi kalır.)`)){
          const skip=new Set(edited.map(p=>p.ath.id));
          targets=targets.filter(p=>!skip.has(p.ath.id));
        }
      }
      if(!targets.length)return;
    }
    const teamSrcId=src.team?src.team.id:null;
    const next=athletes.map(a=>{
      const plan=targets.find(p=>p.ath.id===a.id);
      if(!plan)return a;
      const days={...(a.days||{})};
      const day=days[date]||{date,sessions:[],dailyNotes:''};
      let sessions=[...(day.sessions||[])];
      // An approved draft is written as the coach signed it off; everything else writes
      // the plan as the sheet built it, exactly as before.
      const ses=planToSession(
        planToWrite(plan,forcedOf(a.id))||plan,
        src.session,date,activeKey);
      // When it reached the athlete, so the card can say so instead of the coach having
      // to press the button again to find out. Deliberately outside the fingerprint.
      ses.indiv.writtenAt=new Date().toISOString();
      if(teamSrcId){
        // Replace the athlete's mirror of this team session in place — no duplicate row.
        ses.sourceId=teamSrcId;
        const i=sessions.findIndex(s=>s.sourceId===teamSrcId);
        // The athlete's own post-session feedback is theirs, not the sheet's — it rides
        // across a rewrite the same way it rides across a team re-sync.
        if(i>=0){ses.id=sessions[i].id;ses.sRPE=sessions[i].sRPE||'';ses.au=sessions[i].au||'';ses.notes=sessions[i].notes||'';sessions[i]=ses;}
        else sessions.push(ses);
      } else {
        const i=sessions.findIndex(s=>s.indiv&&s.indiv.srcKey===activeKey&&s.indiv.date===date);
        if(i>=0){ses.id=sessions[i].id;ses.sRPE=sessions[i].sRPE||'';ses.au=sessions[i].au||'';ses.notes=sessions[i].notes||'';sessions[i]=ses;}
        else sessions.push(ses);
      }
      days[date]={...day,sessions};
      return{...a,days};
    });
    updateTeam(team.id,{athletes:next});
    const doneMsg=opts.auto
      ?(targets.length===1
        ?`${targets[0].ath.name||'Athlete'} · takvimine işlendi ✓`
        :`${targets.length} sporcunun takvimine işlendi ✓`)
      :(targets.length===1
        ?`${targets[0].ath.name||'Athlete'} · written to the ${fd(date)} calendar ✓`
        :`Written to ${targets.length} athletes' ${fd(date)} calendars ✓`);
    setToast(doneMsg);
    // Clears its own message only — a later press's message is not cut short by this one.
    setTimeout(()=>setToast(t=>t===doneMsg?'':t),opts.auto?2000:3500);
  };
  /* The counterpart to the write: what this sheet put on a calendar, it can take back
     off it. Without it a program written onto the wrong day had to be deleted athlete by
     athlete, seventeen times over. Only what this sheet wrote for THIS source and THIS
     date goes — a session the coach built by hand carries no `indiv` stamp of this source
     and is never touched. Offered for a template only: an athlete's copy of a TEAM
     session belongs to the day's plan, and the sheet would simply write it back on the
     next pass (see `autoFirstWrite`) — that one is removed by removing the team session. */
  const removable=useMemo(()=>(src&&!src.team)
    ?athletes.filter(a=>chosen.includes(a.id)&&written[a.id]):[],[src,athletes,chosen,written]);
  const removeFrom=()=>{
    const ids=new Set(removable.map(a=>a.id));
    if(!ids.size)return;
    if(!confirm(L(`${ids.size} sporcunun ${fd(date)} takviminden bu program silinsin mi?\n\n(Yalnızca bu sayfanın yazdığı antrenman kaldırılır; elle eklediklerin yerinde kalır.)`,
      `Remove this program from ${ids.size} athlete${ids.size>1?'s':''}' ${fd(date)} calendar?\n\n(Only the session this page wrote is removed; anything added by hand stays.)`)))return;
    const next=athletes.map(a=>{
      if(!ids.has(a.id))return a;
      const day=(a.days||{})[date];
      if(!day)return a;
      const days={...(a.days||{})};
      days[date]={...day,sessions:(day.sessions||[]).filter(s=>!(s.indiv&&s.indiv.srcKey===activeKey))};
      return{...a,days};
    });
    updateTeam(team.id,{athletes:next});
    setToast(L(`${ids.size} sporcunun takviminden kaldırıldı ✓`,
      `Removed from ${ids.size} athlete${ids.size>1?'s':''}' calendars ✓`));
    setTimeout(()=>setToast(''),3500);
  };
  /* Who this page may write to unasked: the athletes the DATE'S OWN TEAM SESSION was
     given to. That is the same list the team→athlete sync copies the session by, so the
     sheet's individual version lands exactly where the plain copy would have, and nowhere
     else. A template source has no day and no assignment, and a team session with nobody
     ticked reaches nobody's calendar through the sync either — both write by hand only. */
  const autoFirstWrite=useMemo(()=>new Set(
    (src&&src.team&&Array.isArray(srcRoster))?srcRoster:[]),[src,srcRoster]);

  /* Once a program has been written for an athlete, the sheet keeps their calendar in
     step with it — the coach edits the sheet and the athlete's copy follows, instead of
     the coach having to remember the button on every visit. A written program is
     rewritten only when its fingerprint differs, so this settles after one pass instead
     of looping; an athlete with nothing written yet is first written only where the day's
     own team plan already puts them in that session (see `autoFirstWrite`). */
  useEffect(()=>{
    if(!src)return;
    const due=plans.filter(p=>{
      const w=written[p.ath.id];
      // Hand-edited on the athlete's calendar: theirs, not the sheet's. Never overwritten
      // on the sheet's own initiative — only when the coach asks for it from the card.
      if(w&&indivHandEdited(w))return false;
      /* A draft waiting on the coach holds this athlete's calendar. Nothing is written —
         not the AI's version, and not the plain plan underneath it either: the coach is
         mid-decision about what today should be, and the athlete's phone must not be
         shown an answer before they have given one. */
      const toWrite=planToWrite(p);
      if(!toWrite)return false;
      const ses=planToSession(toWrite,src.session,date,activeKey);
      /* A FIRST WRITE FOLLOWS THE DAY'S PLAN, NEVER THE PAGE BEING OPEN.
         The page picks a source by itself, and with no team session on the date that
         source is a template — which belongs to no day and to no assignment. Writing it
         on sight put training on every athlete's calendar for a day the team plan reads
         as rest, and the athlete could not get rid of it: deleting the session took
         `written` away, the sheet read that as "never written" and wrote it straight
         back. So a program appears on somebody's calendar on its own only where the
         day's own plan says they do it — a team session of that date with them ticked on
         it. Everything else (a template, a session nobody is ticked on, an athlete the
         session was not given to) waits for the button in the bar. */
      if(!w)return autoFirstWrite.has(p.ath.id)&&liveBlocks(toWrite).some(b=>(b.rows||[]).some(liveSlot));
      return (w.indiv&&w.indiv.sig)!==ses.indiv.sig;
    }).map(p=>p.ath.id);
    if(!due.length)return;
    const t=setTimeout(()=>applyTo(due,{auto:true}),600);
    return()=>clearTimeout(t);
    // eslint-disable-next-line
  },[plans,written,src,date,activeKey,autoFirstWrite,team.indiv,bundles]);
  return(<div className="iv-wrap">
    <PageHero title={L('Bireyselleştirme','Individualization')}
      sub={L('Her sporcuya tek bir kaynak seans, kendi takvimine yazılır.','One source session per athlete, written onto their own calendar.')}
      stats={[{v:athletes.length,l:L('Sporcu','Athletes')},
              {v:fd(date),l:L('Tarih','Date')}]}/>
    <div className="panel iv-bar">
      {/* Moving to another day drops the source pick with it: the program belongs to the
          day, and a template chosen for Monday must not still be sitting in the box —
          ready for the button — when the coach steps onto a Tuesday that has no plan. */}
      <div className="iv-f"><label>{L('Tarih','Date')}</label><input type="date" value={date} onChange={e=>{setDate(e.target.value);setSrcKey('');setSel(null);}}/></div>
      <div className="iv-f grow"><label>{L('Kaynak program','Source program')}</label>
        <select value={activeKey} onChange={e=>{setSrcKey(e.target.value);setSel(null);}}>
          {/* With a team session on the date the box holds it and needs no placeholder.
              Without one it stays empty and says so, rather than showing the name of a
              template the coach never chose. */}
          {!teamSrc&&<option value="">{L('— bu tarihte takım seansı yok','— no team session on this date')}</option>}
          {sources.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div className="iv-f"><label>{L('Sporcular','Athletes')}</label>
        <div className="iv-static">{L(`${roster.length} sporcudan ${chosen.length} tanesi`,`${chosen.length} / ${roster.length} selected`)}</div>
      </div>
      <div className="iv-actions">
        {/* Only where there is something of this sheet's to take back, so the bar does not
            carry a dead button on a day nothing was written. */}
        {removable.length>0&&<button className="btn sec sm" onClick={removeFrom}
          title={L('Bu programı seçili sporcuların takviminden kaldırır.','Removes this program from the selected athletes\' calendars.')}>
          ✕ {L('Takvimden kaldır','Remove from calendars')}</button>}
        {/* Everyone selected above, in one JSON, rebuilt at the press — for one request to
            an outside model instead of one per athlete. */}
        <button className="btn sec sm" onClick={takeSquadSnapshot} disabled={!chosen.length}
          title={L('Seçili sporcuların o anki bütün güncel verisini ve talimatlarını tek bir JSON olarak verir.',
            'The current data and brief of every selected athlete, as one JSON document.')}>
          {'{ }'} {L(`Tüm Sporcuların Bilgilerini Al (${chosen.length})`,`Get all athletes' data (${chosen.length})`)}</button>
      </div>
      {toast&&<div className="iv-toast">{toast}</div>}
      <div className="help" style={{width:'100%',margin:0}}>
        {src&&src.team?L('Bu bir takım seansı: bireysel program sporcunun o seanstaki kopyasının yerini alır (ikinci bir satır oluşmaz) ve takım seansını sonradan düzenlemek artık onun üzerine yazmaz. ',
          'This is a team session: the individual program replaces the athlete\'s copy of it (no duplicate row is created), and editing the team session afterwards no longer overwrites it. '):''}
        {srcRoster&&srcRoster.length?L(`Bu seans ${srcRoster.length} sporcuya atanmış — program yalnızca onların takvimine işlenir. Başka bir sporcuya gitmesi için önce seansın katılımcı listesine eklenmeli. `,
                     `This session is assigned to ${srcRoster.length} athlete${srcRoster.length>1?'s':''} — the program is written to their calendars only. To reach anyone else, tick them on the session itself first. `):''}
        {L(<>Bu program, o günün takım seansına <strong>işaretlediğin</strong> sporcuların takvimine kendiliğinden işlenir; başka kimseye gitmez. Seansta kimse işaretli değilse takvime kendiliğinden hiçbir şey yazılmaz — sporcunun kartından <em>AI Programını Yükle</em> ile programını yükleyip onayla. Sporcunun kartını aç, takviminden antrenmanı seç ve <em>✎ Düzenle</em> ile aynı kartın içinde düzenle; elle düzenlediğin bir gün bu sayfa tarafından bir daha üzerine yazılmaz.</>,
          <>This program is written by itself onto the calendars of the athletes <strong>ticked on that day's team session</strong>, and reaches nobody else. With a session nobody is ticked on, nothing is written on its own — load and approve a programme from the athlete's card with <em>Load AI programme</em>. Open an athlete's card, pick the session on their calendar and edit it in place with <em>✎ Edit</em>; a day you edit by hand is never overwritten from this page again.</>)}
      </div>
    </div>
    {/* Only the athletes this source may reach are offered: "All" over an assigned session
        means all of the athletes it was assigned to, not the whole squad. */}
    {roster.length>0&&<div className="panel iv-athbar">
      <button className="btn xs sec" onClick={()=>setSel(roster.map(a=>a.id))}>{L('Tümü','All')}</button>
      <button className="btn xs sec" onClick={()=>setSel([])}>{L('Hiçbiri','None')}</button>
      <button className="btn xs sec" onClick={()=>setSel(null)}>{L('Oto','Auto')}</button>
      {roster.map(a=><button key={a.id} className={'iv-athchip'+(chosen.includes(a.id)?' on':'')} onClick={()=>toggleAth(a.id)}>
        {a.name||'—'}{a.levelTag?<i>{LEVEL_LABEL[a.levelTag]||a.levelTag}</i>:null}
      </button>)}
    </div>}
    {!src&&<div className="ex-empty">{sources.length===0
      ?L('Bu tarihte takım seansı yok — takvime bir antrenman planla.','There is no team session on this date — plan a session on the calendar.')
      :L('Bu tarihte takım seansı yok — bu gün kimsenin takvimine bir şey yazılmaz.','There is no team session on this date — nothing is written to anyone for this day.')}</div>}
    {src&&plans.map(p=>{const b=bundles[p.ath.id];return(<IndivAthleteCard key={p.ath.id} plan={p}
      open={!!open[p.ath.id]} setOpen={v=>setOpen(o=>({...o,[p.ath.id]:v}))}
      panel={b?<DailyIndivPanel plan={p} bundle={b}
        team={team} updateTeam={updateTeam} srcKey={activeKey} date={date}
        exercises={exercises} setup={team.setup||{}} libMap={libMap}
        customTests={data.customTests}
        writeOne={(id,program)=>applyTo([id],{force:{id,program}})}
        calSes={written[p.ath.id]||null}/>:null}
      calendar={<IndivAthleteCalendar ath={p.ath} team={team} setup={team.setup} weeks={weeks}
        exercises={exercises} date={date}
        saveDays={d=>saveAthDays(p.ath.id,d)}/>}/>);})}
    <DiJsonModal title={L('Tüm Sporcuların Bilgileri','All athletes\' data')} date={date}
      snap={squadSnap} setSnap={setSquadSnap} fileBase={L('tum_sporcular','all_athletes')}/>
    {src&&plans.length===0&&<div className="ex-empty">{srcRoster&&!srcRoster.length
      ?L('Bu seans yalnızca kadroda olmayan sporculara atanmış — seansın katılımcı listesini takvimden güncelle.',
         'This session is assigned only to athletes who have left the roster — update its participant list on the session itself.')
      :'No athlete selected — pick one above.'}</div>}
  </div>);
}

