function App(){
  useAppLang();   // re-render the whole tree the instant the language changes
  const[data,setData]=useState(()=>makeDefault());   // veri buluttan (kullanici_verileri) yüklenir
  const sync=useCloudSync(data,setData);
  const[view,setView]=useState('season');
  const[menuOpen,setMenuOpen]=useState(false);
  /* Bir wellness uyarısına tıklandığında açılacak sporcu. Kadro ekranı bunu görüp
     o sporcuyu doğrudan açıyor; damga (at) aynı sporcuya ikinci kez tıklandığında
     da ekranın yeniden açılmasını sağlıyor. */
  const[athFocus,setAthFocus]=useState(null);
  const[selected,setSelected]=useState({year:today.getFullYear(),month:today.getMonth()+1,date:fmt(today)});
  const[dayKey,setDayKey]=useState(fmt(today));
  const team=useMemo(()=>rosterByName(data.teams.find(t=>t.id===data.activeTeamId)||data.teams[0]),[data]);
  const periods=useMemo(()=>getPeriods(team.setup),[team.setup]);
  const weeks=useMemo(()=>buildWeeks(team.setup,periods,team.weekOverrides),[team.setup,periods,team.weekOverrides]);
  // Let the program editor auto-add newly-typed exercise names to the shared library.
  useEffect(()=>{registerLibAdd(nm=>setData(prev=>{
    const exs=prev.exercises||[];
    if(exs.some(e=>(e.name||'').trim().toLowerCase()===nm.toLowerCase()))return prev;   // already in library
    return{...prev,exercises:[{id:uid(),name:nm,type:'',subType:'',pattern:'',movePattern:'',contra:[],difficulty:'',muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:''},...exs]};
  }));
  // Editing/clearing a name box: drop the old auto-added stub, add the new value.
  // Only bare stubs (no metadata) are removed, so real library entries are never lost.
  registerLibReplace((oldNm,newNm)=>setData(prev=>{
    const exs=prev.exercises||[];
    const isStub=e=>!e.type&&!e.subType&&!e.pattern&&!e.difficulty&&!(e.muscle&&e.muscle.length)&&!e.videoUrl&&!e.videoData&&!e.thumb&&!e.purpose;
    const lo=(oldNm||'').trim().toLowerCase();
    const nn=(newNm||'').trim();
    let next=lo?exs.filter(e=>!((e.name||'').trim().toLowerCase()===lo&&isStub(e))):exs;
    if(nn&&!next.some(e=>(e.name||'').trim().toLowerCase()===nn.toLowerCase()))
      next=[{id:uid(),name:nn,type:'',subType:'',pattern:'',movePattern:'',contra:[],difficulty:'',muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:''},...next];
    return next===exs?prev:{...prev,exercises:next};
  }));
  /* Tagging an exercise's pattern / execution on any program writes the pair onto the
     library entry, so writing that exercise into the next program fills both in. A name
     the library has never seen is added carrying the tags, exactly as typing it would. */
  registerLibTags((nm,pattern,plane)=>setData(prev=>{
    const exs=prev.exercises||[];
    const lo=nm.trim().toLowerCase();
    const i=exs.findIndex(e=>(e.name||'').trim().toLowerCase()===lo);
    if(i<0)return{...prev,exercises:[{id:uid(),name:nm.trim(),type:'',subType:'',pattern:'',movePattern:'',contra:[],difficulty:'',muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:'',exPattern:pattern,exPlane:plane},...exs]};
    const cur=exs[i];
    if((cur.exPattern||'')===pattern&&(cur.exPlane||'')===plane)return prev;
    const next=[...exs];next[i]={...cur,exPattern:pattern,exPlane:plane};
    return{...prev,exercises:next};
  }));
  /* Putting a picture on a program row writes it onto the library entry as its plan
     image, so the next program that names this exercise fills it in by itself. A name the
     library has never seen is added carrying the picture, exactly as typing it would. */
  registerLibImage((nm,url)=>setData(prev=>{
    const exs=prev.exercises||[];
    const lo=nm.trim().toLowerCase();
    const i=exs.findIndex(e=>(e.name||'').trim().toLowerCase()===lo);
    if(i<0){
      if(!url)return prev;
      return{...prev,exercises:[{id:uid(),name:nm.trim(),type:'',subType:'',pattern:'',movePattern:'',contra:[],difficulty:'',muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:'',planImage:url},...exs]};
    }
    const cur=exs[i];
    if((cur.planImage||'')===url)return prev;
    const next=[...exs];next[i]={...cur,planImage:url};
    return{...prev,exercises:next};
  }));
  return()=>{registerLibAdd(null);registerLibReplace(null);registerLibTags(null);registerLibImage(null);};},[setData]);
  // The AI connection the description translator uses (see descTranslate).
  DESC_AI_CFG=(data&&data.ai)||null;
  // Keep the exercise editor's picker in sync with the library (names + categories), and
  // carry each entry's program image and video link along: picking the exercise while
  // writing a program copies both onto the row, so the coach never hunts for the image
  // again. An entry that carries no picture of its own still hands one over — the video's
  // auto-derived YouTube/Vimeo thumbnail stands in.
  useEffect(()=>{
    const seen=new Set();const items=[];
    for(const e of (data.exercises||[])){
      if(exLib(e)==='ball')continue;   // court drills have their own picker, below
      const nm=(e.name||'').trim();if(!nm)continue;
      const k=nm.toLowerCase();if(seen.has(k))continue;seen.add(k);
      /* `subType` rides along on its own as well as inside `sub`: the picker shows
         `sub` as a caption, while the load distribution reads the type/sub-type pair
         to work out what an untagged session row trains and how. */
      items.push({name:nm,type:e.type||'',subType:e.subType||'',action:e.action||'',sub:[e.subType,e.action,e.pattern].filter(Boolean),
        /* The coach's own plan picture first: it was put on a program row for programs.
           The library cover (or the video's auto-thumbnail) still stands in when the
           exercise has never carried one. */
        image:e.planImage||e.thumb||videoThumb(e.videoData||e.videoUrl)||'',   // row picture → library's Program Image → video's own thumbnail
        link:safeURL(e.videoUrl),
        /* The pattern / execution pair the entry was last tagged with, on either program
           screen or on the library card itself — picking the exercise carries it over. */
        exPattern:e.exPattern||'',exPlane:e.exPlane||'',
        desc:(e.purpose||'').trim()});
    }
    setLibItems(items);
  },[data.exercises]);
  /* The ball-practice half of the library, mirrored the same way — a drill written on a
     session pulls its diagram, its clip and its coaching notes back off the shelf by
     name, exactly as an exercise pulls its picture and its tags. */
  useEffect(()=>{
    const seen=new Set();const items=[];
    for(const e of (data.exercises||[])){
      if(exLib(e)!=='ball')continue;
      const nm=(e.name||'').trim();if(!nm)continue;
      const k=nm.toLowerCase();if(seen.has(k))continue;seen.add(k);
      items.push({name:nm,type:e.type||'',subType:e.subType||'',court:e.court||null,
        videoUrl:e.videoUrl||'',videoData:e.videoData||'',players:e.players||'',
        purpose:(e.purpose||'').trim()});
    }
    setBallLibItems(items);
  },[data.exercises]);
  /* Filing a drill from a session: the diagram and the clip go onto the shelf under the
     drill's name. A drill already on the shelf is UPDATED rather than duplicated — a coach
     redrawing a drill mid-session means the drill has changed, not that there are now two
     of it — but only with what the session actually carries, so a redraw with no clip
     attached never wipes the clip the library already had. */
  useEffect(()=>{registerBallSave(d=>setData(prev=>{
    const exs=prev.exercises||[];
    const lo=(d.name||'').trim().toLowerCase();
    const i=exs.findIndex(e=>exLib(e)==='ball'&&(e.name||'').trim().toLowerCase()===lo);
    if(i<0)return{...prev,exercises:[{id:uid(),name:d.name,lib:'ball',type:'',subType:'',movePattern:'',contra:[],muscle:[],
      thumb:'',court:d.court||null,videoUrl:d.videoUrl||'',videoData:d.videoData||'',players:d.players||'',purpose:d.purpose||''},...exs]};
    const cur=exs[i],next=[...exs];
    next[i]={...cur,
      court:sceneIsEmpty(d.court)?cur.court:d.court,
      videoUrl:d.videoUrl||cur.videoUrl||'',videoData:d.videoData||cur.videoData||'',
      players:d.players||cur.players||'',purpose:d.purpose||cur.purpose||''};
    return{...prev,exercises:next};
  }));
  return()=>registerBallSave(null);},[setData]);
  // Brand every printout / shared PDF with the active team's logo.
  useEffect(()=>{registerTeamLogo((team&&team.setup&&team.setup.logo)||'');
    registerClubName((team&&team.setup&&(team.setup.clubName||team.setup.teamName))||'');},[team]);
  /* Competition Dates, written from the calendar. This sits at the top of the app rather
     than on the Season screen so a match ticked on Tuesday is already in the season's
     fixture list on Wednesday — without the coach having opened Season at all. It writes
     only when the list actually changes, so it cannot loop. */
  useEffect(()=>{
    if(!team||!team.setup)return;
    const cur=team.setup.competitions||[];
    /* Both directions in one pass: what the fixture knows fills the match window's blanks
       first, then the fixture follows the calendar. */
    const days=backfillMatchesFromComps(team.days,cur);
    const next=syncCompetitions(cur,days,team.setup.compHidden);
    const compSame=JSON.stringify(next)===JSON.stringify(cur);
    if(compSame&&days===team.days)return;
    setData(prev=>({...prev,teams:(prev.teams||[]).map(t=>t.id!==team.id?t
      :{...t,...(days!==team.days?{days}:{}),setup:{...t.setup,competitions:next}})}));
  },[team&&team.id,team&&team.days,team&&team.setup&&team.setup.competitions,team&&team.setup&&team.setup.compHidden]);
  /* The completions offered on every ball-practice row. Built once per library change
     rather than on every render: it was being filtered and rebuilt on each edit, and the
     shelf holds hundreds of drills. */
  const ballNameOptions=useMemo(()=>(data.exercises||[])
    .filter(e=>exLib(e)==='ball'&&(e.name||'').trim())
    .map(e=><option key={e.id} value={e.name}/>),[data.exercises]);
  /* Uyarı → sporcunun Wellness ekranı. Uyarı başka bir takımınsa önce o takıma
     geçiliyor: bildirime tıklayan koç hangi kadroya baktığını düşünmek zorunda
     kalmasın. */
  const openAlert=a=>{
    if(!a||!a.athleteId)return;
    if(a.teamId&&a.teamId!==data.activeTeamId&&data.teams.some(t=>t.id===a.teamId))
      setData(prev=>withTeam(prev,a.teamId));
    setAthFocus({athleteId:a.athleteId,tab:'wellness',at:Date.now()});
    setView('athletes');
  };
  /* Bildirime tıklanınca gelinen adres: index.html#alert=<id>.
     Bir kez çalışıyor ve adres çubuğunu temizliyor — yoksa sayfa her
     yenilendiğinde koç aynı sporcunun ekranına geri düşerdi. Bulut yüklemesi
     bitmeden çalışmıyor, çünkü takım listesi o ana kadar boş.

     BU HOOK'LAR AŞAĞIDAKİ KOŞULLU RETURN'LERDEN ÖNCE DURMAK ZORUNDA. Aşağıda
     dururken uygulama hiç açılmıyordu: ilk çizimde oturum daha yükleniyor,
     App erken dönüyor ve bu iki hook hiç çağrılmıyor; oturum gelince ikinci
     çizimde çağrılıyorlar ve React "önceki çizimden daha fazla hook" (#310)
     deyip ağacı komple düşürüyor — ekran bembeyaz kalıyor. */
  const alertRouted=useRef(false);
  useEffect(()=>{
    if(alertRouted.current||sync.status!=='synced'||!sync.user)return;
    const m=/[#&]alert=([^&]*)/.exec(location.hash||'');
    if(!m)return;
    alertRouted.current=true;
    const id=decodeURIComponent(m[1]||'');
    try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
    const fb=FB();
    if(!fb||!id)return;
    fb.firestore().collection(ALERTS_COL).doc(id).get()
      .then(d=>{if(d.exists)openAlert(d.data());})
      .catch(e=>console.warn('alert deep link',e));
  },[sync.status,sync.user]);
  // All hooks must be called before any conditional return
  if(sync.authLoading)return<LoadingScreen/>;
  if(!sync.user)return<LoginPage sync={sync}/>;
  /* Applied to the LATEST state, not to the `data` this render closed over: a press that
     updates two parts of the team in one tick (the review, then the athletes' calendars)
     used to lose the first update to the second. */
  const updateTeam=(id,upd)=>setData(d=>({...d,teams:d.teams.map(t=>t.id===id?{...t,...upd}:t)}));
  const goDayView=k=>{setDayKey(k);setView('program');};

  const exCount=(data.exercises||[]).length;
  const NAV_GROUPS=[
    {label:L('Çalışma Alanı','Workspace'),items:[
      {id:'season',label:L('Sezon','Season'),icon:NAV_ICONS.season},
      {id:'calendar',label:L('Takvim','Calendar'),icon:NAV_ICONS.calendar},
      {id:'athletes',label:L('Kadro','Roster'),icon:NAV_ICONS.athletes,count:(team.athletes||[]).length},
      {id:'evaluation',label:L('Test ve Değerlendirme','Testing & Assessment'),icon:NAV_ICONS.evaluation},
      {id:'reports',label:L('Yük Takibi','Load Monitoring'),icon:NAV_ICONS.reports},
      {id:'exercises',label:L('Egzersiz Kütüphanesi','Exercise Library'),icon:NAV_ICONS.exercises,count:exCount||null},
      {id:'individual',label:L('Bireyselleştirme','Individualization'),icon:NAV_ICONS.individual},
      {id:'tempo',label:L('Interval Zamanlayıcı','Interval Timer'),icon:NAV_ICONS.tempo},
      {id:'checkin',label:L('Check-in Formları','Check-in Forms'),icon:NAV_ICONS.checkin},
    ]},
    /* Tryouts is deliberately its own group rather than another Workspace row: every
       other tab on this sidebar is a view of the team in the picker above, and this one
       is not — it holds every candidate the club has ever looked at, of any age, whoever
       is selected. Its own heading is what says so without a sentence of explanation. */
    {label:L('Kulüp','Club'),items:[
      {id:'allcal',label:L('Ortak Takvim','Shared Calendar'),icon:NAV_ICONS.allcal,count:(data.teams||[]).length>1?(data.teams||[]).length:null},
      {id:'tryouts',label:L('Seçmeler','Tryouts'),icon:NAV_ICONS.tryouts,count:(data.tryouts||[]).length||null},
    ]},
    {label:L('Hesap','Account'),items:[
      {id:'setup',label:L('Ayarlar','Settings'),icon:NAV_ICONS.setup},
      {id:'backup',label:L('Yedekleme','Backup'),icon:NAV_ICONS.backup},
    ]},
  ];

  return(<div className={"app"+(menuOpen?' menu-open':'')}>
    <div className="mscrim" onClick={()=>setMenuOpen(false)}/>
    <aside className="sidebar">
      <button className="mclose" onClick={()=>setMenuOpen(false)} aria-label={L('Kapat','Close')}>✕</button>
      <div className="brand"><img className="brand-logo" src="logo.png" alt="CoachOS"/></div>
      <div className="brand-team">
        {/* The club the squad below belongs to. Only drawn when the Setup tab has been
            given one — a club that has not named itself should not push the team picker
            down the sidebar for an empty line. */}
        {String(team.setup.clubName||'').trim()&&
          <div className="bt-club">{team.setup.clubName.trim()}</div>}
        <div className="bt-row team-sel">
          <span className="bt-label">{L('Takım','Team')}</span>
          {/* The crest, immediately left of the name it belongs to. A native select cannot
              carry a picture, so it rides beside the box — which is enough: a coach working
              across two squads recognises the badge before they have read the word. */}
          {hasMedia(team.setup&&team.setup.logo)&&
            <img className="bt-teamlogo" src={mediaSrc(team.setup.logo)} alt=""/>}
          <select value={data.activeTeamId} onChange={e=>setData(withTeam(data,e.target.value))}>
            {data.teams.map(t=><option key={t.id} value={t.id}>{t.setup.teamName}</option>)}
          </select>
        </div>
        {sync.user&&<button className="btn sec xs" onClick={()=>sync.signOut()} style={{width:'100%',justifyContent:'center'}}>{L('Çıkış Yap','Sign Out')}</button>}
        <div className="bt-row" style={{width:'100%'}}><CloudBar sync={sync} onOpen={()=>{}}/></div>
      </div>
      <LanguageSelector inline/>
      <nav>
        {NAV_GROUPS.map(g=><div key={g.label} className="nav-group">
          <div className="nav-glabel">{g.label}</div>
          {g.items.map(it=><button key={it.id} className={`nav-item${view===it.id?' active':''}`} onClick={()=>{setView(it.id);setMenuOpen(false);}}>
            <span className="ni-ic">{it.icon}</span>
            <span className="ni-lbl">{it.label}</span>
            {it.count!=null&&<span className="ni-count">{it.count}</span>}
          </button>)}
        </div>)}
      </nav>
    </aside>
    <div className="content">
    <div className="mtopbar">
      <button className="mham" onClick={()=>setMenuOpen(true)} aria-label={L('Menü','Menu')}>☰</button>
      <img className="mtb-logo" src="logo-wordmark.png" alt="CoachOS"/>
      <span className="mtb-team">{team.setup.teamName}</span>
    </div>
    {/* The remount key carries the team so a tab redraws when the squad changes — except
        Tryouts, which is not a view of any squad and would only lose its selected
        candidate and filters to a team switch it has nothing to do with. */}
    <main key={view+(view==='tryouts'||view==='allcal'?'':team.id)}>
      {view==='setup'&&<Setup team={team} updateTeam={updateTeam} data={data} setData={setData}/>}
      {view==='season'&&<SeasonPlan team={team} updateTeam={updateTeam} periods={periods} weeks={weeks}/>}
      {view==='calendar'&&<><PageHero title={L('Takvim','Calendar')}
        sub={L(`Sezonun günleri · ${team.setup.teamName}`,`The season, day by day · ${team.setup.teamName}`)}
        stats={[{v:Object.values(team.days||{}).filter(d=>(d&&d.sessions||[]).length).length,l:L('Planlanan gün','Days planned')},
                {v:Object.values(team.days||{}).reduce((n,d)=>n+((d&&d.sessions||[]).length),0),l:L('Seans','Sessions')},
                {v:(team.athletes||[]).length,l:L('Sporcu','Athletes')}]}/>
        <CalendarView days={team.days} selected={selected} setSelected={setSelected} goDayView={goDayView} weeks={weeks}
        setup={team.setup} labelOwner={team.setup.teamName} athletes={team.athletes||[]} staff={team.staff||[]} exercises={data.exercises||[]}
        saveDays={d=>setData(prev=>({...prev,teams:prev.teams.map(t=>t.id===team.id?{...t,days:d}:t)}))}
        saveAthletes={a=>setData(prev=>({...prev,teams:prev.teams.map(t=>t.id===team.id?{...t,athletes:a}:t)}))}/>
        <TeamInsights days={team.days} athletes={team.athletes||[]} refDate={selected.date} setup={team.setup}/></>}
      {view==='program'&&<Planner days={team.days} setup={team.setup} dateKey={dayKey} setDateKey={setDayKey} labelOwner={team.setup.teamName}
        athletes={team.athletes||[]}
        saveDays={d=>setData(prev=>({...prev,teams:prev.teams.map(t=>t.id===team.id?{...t,days:d}:t)}))}
        saveAthletes={a=>setData(prev=>({...prev,teams:prev.teams.map(t=>t.id===team.id?{...t,athletes:a}:t)}))}/>}
      {view==='athletes'&&<Athletes team={team} updateTeam={updateTeam} weeks={weeks} ai={data.ai} exercises={data.exercises||[]} customTests={data.customTests||[]} focus={athFocus}/>}
      {view==='evaluation'&&<EvaluationView team={team} updateTeam={updateTeam} data={data} setData={setData}/>}
      {view==='exercises'&&<ExercisesView data={data} setData={setData}/>}
      {view==='individual'&&<IndividualizationView data={data} team={team} updateTeam={updateTeam} weeks={weeks}/>}
      {view==='tempo'&&<TempoView data={data} setData={setData}/>}
      {view==='reports'&&<TeamReports team={team} weeks={weeks} selected={selected} setSelected={setSelected}/>}
      {view==='checkin'&&<CheckinPanel key={team.id} data={data} setData={setData} team={team} sync={sync}/>}
      {/* No `team` prop and no `key` off the team: the pool is the same list whichever
          squad is selected, so switching teams must not remount or refilter it. */}
      {view==='allcal'&&<AllTeamsCalendar teams={data.teams} activeTeamId={data.activeTeamId}
        openDay={(tid,k)=>{if(tid!==data.activeTeamId)setData(prev=>withTeam(prev,tid));setDayKey(k);setView('program');}}/>}
      {view==='tryouts'&&<TryoutsView data={data} setData={setData} teams={data.teams} activeTeamId={data.activeTeamId}/>}
      {view==='backup'&&<Backup data={data} setData={setData} sync={sync}/>}
    </main>
    </div>
    {/* Every drill the coach has filed, offered as completions on any ball-practice row.
        One list for the whole app, so no two blocks can claim the same id. */}
    <datalist id="bp-lib-names">{ballNameOptions}</datalist>
    {/* Aynı sebeple burada: sporcuların check-in gönderimleri, koç hangi ekranda olursa
        olsun dinlenir ve günlüğe işlenir. */}
    <CheckinInbox sync={sync} setData={setData}/>
    {/* Aynı sebeple burada: sunucunun uyarıyı kime göndereceğini bildiği kadro
        özeti, koç hangi ekranda olursa olsun — ve HANGİ TAKIMA bakıyor olursa
        olsun — güncel tutulur. */}
    <AlertRosterSync teams={data.teams} sync={sync}/>
    {/* Cihaz kaydının tazeliği, uygulama açıkken gelen bildirim ve bildirime
        tıklayınca açılacak ekran — üçü de ekrandan bağımsız. */}
    <PushBridge sync={sync} openAlert={openAlert}/>
  </div>);
}
