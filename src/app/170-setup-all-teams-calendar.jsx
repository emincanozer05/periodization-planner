/* =========================================================
   DD/MM/YYYY DATE FIELD
   A native <input type="date"> renders in the browser's own locale, so a coach on a
   US-locale browser saw 08/16/2026 under a column headed DD/MM/YYYY. This types and
   shows the date the way the rest of the app writes it, keeps storing ISO, and hands
   the calendar picker off to a hidden native input so nothing is lost.
   ========================================================= */
/* `long` shows the date written out ("22 Mayıs 2026") and picks it from the calendar. */
function DateDMY({value,onChange,style,title,long}){
  const[txt,setTxt]=useState(()=>fd(value));
  const pick=useRef(null);
  useEffect(()=>{setTxt(fd(value));},[value]);
  const type=t=>{
    const d=t.replace(/\D/g,'').slice(0,8);
    let out=d.slice(0,2);
    if(d.length>2)out+='/'+d.slice(2,4);
    if(d.length>4)out+='/'+d.slice(4,8);
    setTxt(out);
    const iso=pdmy(out);if(iso)onChange(iso);
  };
  // A partial or impossible date snaps back to the stored one rather than clearing it.
  const blur=()=>{const iso=pdmy(txt);if(iso)onChange(iso);else setTxt(fd(value));};
  const open=()=>{const el=pick.current;if(!el)return;
    try{el.showPicker?el.showPicker():el.focus();}catch(e){el.focus();}};
  if(long)return(<div className="dmy" style={style}>
    <input className="dmy-t dmy-long" readOnly value={value?fdL(value):''} title={title} onClick={open}
      placeholder={L('Tarih seç','Pick a date')}/>
    <button type="button" className="dmy-btn" onClick={open} tabIndex={-1} aria-label={L('Takvimden seç','Pick from the calendar')}>🗓</button>
    <input ref={pick} className="dmy-p" type="date" tabIndex={-1} aria-hidden="true" value={value||''}
      onChange={e=>{if(e.target.value)onChange(e.target.value);}}/>
  </div>);
  return(<div className="dmy" style={style}>
    <input className="dmy-t" value={txt} title={title} placeholder={L('gg/aa/yyyy','dd/mm/yyyy')} inputMode="numeric" maxLength={10}
      onChange={e=>type(e.target.value)} onBlur={blur}/>
    <button type="button" className="dmy-btn" onClick={open} tabIndex={-1} aria-label={L('Takvimden seç','Pick from the calendar')}>🗓</button>
    <input ref={pick} className="dmy-p" type="date" tabIndex={-1} aria-hidden="true" value={value||''}
      onChange={e=>{if(e.target.value)onChange(e.target.value);}}/>
  </div>);
}

/* =========================================================
   SETUP
   ========================================================= */
/* Two letters to stand in for a picture that has not been uploaded. Words that do not
   START with a letter or a digit are skipped, or "Tofaş (2009)" initials to "T(" — the
   year in brackets is what tells two squads apart, so it is the bracket that has to go,
   not the year. Named apart from the dozen component-local `initials` helpers so it
   shadows none of them. */
const nameInitials=n=>(String(n||'').match(/[\p{L}\p{N}][\p{L}\p{N}]*/gu)||[])
  .slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('tr')||'?';
/* The masthead every tab opens with. Words only — the title, the line under it, the
   numbers that describe the screen, and whatever buttons the screen owns. */
function PageHero({title,sub,stats,children}){
  const list=(stats||[]).filter(Boolean);
  return(<div className="ph-hero">
    <div className="ph-hero-l">
      <div className="ph-ttl">{title}</div>
      {sub?<div className="ph-sub">{sub}</div>:null}
    </div>
    {(list.length>0||children)&&<div className="ph-hero-r">
      {list.map((st,i)=><div className="ph-stat" key={i}>
        <div className="ph-stat-v">{st.v}</div>
        <div className="ph-stat-l">{st.l}</div>
      </div>)}
      {children?<div className="ph-acts">{children}</div>:null}
    </div>}
  </div>);
}
/* =========================================================
   ALL-TEAMS CALENDAR — one week, every squad
   Every other calendar in the app is a view of the team in the sidebar picker, so a
   coach running three squads had to switch teams three times to answer "who is on the
   floor on Thursday at five?". This one reads EVERY team's days at once and lays the
   week out as seven columns, each session a card carrying the team, the time, the
   session and its length — sorted by the clock, so the day reads top to bottom in the
   order it happens. Two teams whose sessions overlap on the same day are marked, because
   that is the question the shared view exists to answer (one weight room, one coach).
   Read-only: a click opens that session's day in its own team's planner, where it is
   edited like any other.
   ========================================================= */
const ATC_PALETTE=['#38bdf8','#f97316','#a78bfa','#22c55e','#f43f5e','#facc15','#2dd4bf','#e879f9','#94a3b8','#fb7185'];
const atcMins=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(t||''));return m?(+m[1])*60+(+m[2]):null;};
const atcHHMM=m=>`${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
/* Side-by-side lanes for sessions that share the clock: each overlapping run of the day
   is one cluster, and every session in it takes the first lane free at its start. */
function atcLanes(rows){
  const timed=rows.filter(r=>r.st!=null).sort((a,b)=>a.st-b.st||b.en-a.en);
  let cluster=[],clusterEnd=-1,lanes=[];
  const close=()=>{const n=lanes.length||1;cluster.forEach(r=>{r.lanes=n;});cluster=[];lanes=[];};
  timed.forEach(r=>{
    if(cluster.length&&r.st>=clusterEnd)close();
    let li=lanes.findIndex(end=>end<=r.st);
    if(li<0){li=lanes.length;lanes.push(r.en);}else lanes[li]=r.en;
    r.lane=li;cluster.push(r);clusterEnd=Math.max(clusterEnd,r.en);
  });
  close();
}
const ATC_VIEW_KEY='coachos_atc_view';
const ATC_HOUR_PX=52;
function AllTeamsCalendar({teams,activeTeamId,openDay}){
  const[ref,setRef]=useState(()=>sow(new Date()));
  const[hidden,setHidden]=useState({});
  /* Time grid or list. Remembered per device; a phone opens on the list, where seven
     columns of hours would not fit. */
  const[mode,setModeRaw]=useState(()=>{
    try{const v=localStorage.getItem(ATC_VIEW_KEY);if(v==='grid'||v==='list')return v;}catch(e){}
    try{return window.matchMedia&&window.matchMedia('(max-width:760px)').matches?'list':'grid';}catch(e){return'grid';}
  });
  const setMode=v=>{setModeRaw(v);try{localStorage.setItem(ATC_VIEW_KEY,v);}catch(e){}};
  /* The clock, for the "now" line. Ticks once a minute; only drawn on today's column. */
  const[nowM,setNowM]=useState(()=>{const d=new Date();return d.getHours()*60+d.getMinutes();});
  useEffect(()=>{const t=setInterval(()=>{const d=new Date();setNowM(d.getHours()*60+d.getMinutes());},60000);return()=>clearInterval(t);},[]);
  const list=Array.isArray(teams)?teams:[];
  const colorOf=useMemo(()=>{const m={};list.forEach((t,i)=>{m[t.id]=ATC_PALETTE[i%ATC_PALETTE.length];});return m;},[list]);
  const dayKeys=useMemo(()=>Array.from({length:7},(_,i)=>fmt(addD(ref,i))),[ref]);
  const todayK=fmt(new Date());
  const DNL=L('Pzt,Sal,Çar,Per,Cum,Cmt,Paz','Mon,Tue,Wed,Thu,Fri,Sat,Sun').split(',');
  const DNF=L('Pazartesi,Salı,Çarşamba,Perşembe,Cuma,Cumartesi,Pazar','Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday').split(',');
  const MNL=L('Oca,Şub,Mar,Nis,May,Haz,Tem,Ağu,Eyl,Eki,Kas,Ara','Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec').split(',');
  /* Every session of the week, each carrying its team and its minutes on the clock, and
     a flag for any other team's session it overlaps. A session with no time sorts last
     and is never counted as a clash — there is nothing to compare. */
  const week=useMemo(()=>dayKeys.map(k=>{
    const rows=[];
    list.forEach(t=>{
      if(hidden[t.id])return;
      const d=(t.days||{})[k];
      ((d&&d.sessions)||[]).forEach(se=>{
        const st=atcMins(se.time);const dur=Number(se.duration)||0;
        rows.push({team:t,se,st,en:st==null?null:Math.min(24*60,st+(dur||60)),dur,
          match:sesFocus(se).includes('Competition')});
      });
    });
    rows.sort((a,b)=>(a.st==null?1e9:a.st)-(b.st==null?1e9:b.st)||String(a.team.setup&&a.team.setup.teamName||'').localeCompare(String(b.team.setup&&b.team.setup.teamName||'')));
    rows.forEach(r=>{
      r.clash=r.st!=null&&rows.some(o=>o!==r&&o.team.id!==r.team.id&&o.st!=null&&o.st<r.en&&r.st<o.en);
    });
    atcLanes(rows);
    return{k,rows};
  }),[dayKeys,list,hidden]);
  const total=week.reduce((n,d)=>n+d.rows.length,0);
  const clashes=week.reduce((n,d)=>n+d.rows.filter(r=>r.clash).length,0);
  const perTeam=useMemo(()=>{const m={};dayKeys.forEach(k=>list.forEach(t=>{
    const d=(t.days||{})[k];m[t.id]=(m[t.id]||0)+(((d&&d.sessions)||[]).length);}));return m;},[dayKeys,list]);
  /* The hours the grid shows: the week's own, padded to whole hours, never narrower
     than 08:00–20:00 so an empty week still reads as a working day. */
  const timed=week.flatMap(d=>d.rows.filter(r=>r.st!=null));
  const h0=Math.max(0,Math.min(8,...timed.map(r=>Math.floor(r.st/60))));
  const h1=Math.min(24,Math.max(20,...timed.map(r=>Math.ceil(r.en/60))));
  const hours=Array.from({length:h1-h0},(_,i)=>h0+i);
  const untimed=week.some(d=>d.rows.some(r=>r.st==null));
  const end=addD(ref,6);
  const range=`${ref.getDate()} ${MNL[ref.getMonth()]} – ${end.getDate()} ${MNL[end.getMonth()]} ${end.getFullYear()}`;
  const isThisWeek=dayKeys.includes(todayK);
  const title=(r,nm)=>L(`${nm} · ${r.se.name||'Antrenman'} — günü bu takımın planlayıcısında aç`,`${nm} · ${r.se.name||'Session'} — open the day in this team's planner`);
  return(<div className="atc">
    <PageHero title={L('Ortak Takvim','Shared Calendar')}
      sub={L('Kayıtlı bütün takımların haftası tek ekranda — hangi takım, hangi gün, saat kaçta, ne yapıyor.',
        'Every team\'s week on one screen — which team, which day, what time, doing what.')}
      stats={[{v:list.length,l:L('Takım','Teams')},{v:total,l:L('Bu hafta seans','Sessions this week')},
        clashes?{v:clashes,l:L('Çakışan seans','Overlapping')}:null]}/>
    <div className="atc-bar">
      <div className="atc-nav">
        <div className="atc-seg">
          <button type="button" onClick={()=>setRef(r=>addD(r,-7))} aria-label={L('Önceki hafta','Previous week')}>‹</button>
          <button type="button" className={isThisWeek?'on':''} onClick={()=>setRef(sow(new Date()))}>{L('Bu hafta','This week')}</button>
          <button type="button" onClick={()=>setRef(r=>addD(r,7))} aria-label={L('Sonraki hafta','Next week')}>›</button>
        </div>
        <span className="atc-range">{range}</span>
      </div>
      <div className="atc-seg atc-mode" role="tablist">
        <button type="button" className={mode==='grid'?'on':''} onClick={()=>setMode('grid')} aria-selected={mode==='grid'}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M9 4v17M15 4v17"/></svg>
          {L('Zaman çizelgesi','Time grid')}</button>
        <button type="button" className={mode==='list'?'on':''} onClick={()=>setMode('list')} aria-selected={mode==='list'}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          {L('Liste','List')}</button>
      </div>
    </div>
    <div className="atc-teams">
      {list.map(t=>{const off=!!hidden[t.id];
        return<button key={t.id} type="button" className={'atc-tchip'+(off?' off':'')}
          style={{'--tc':colorOf[t.id]}} onClick={()=>setHidden(h=>({...h,[t.id]:!off}))}
          title={off?L('Bu takımı göster','Show this team'):L('Bu takımı gizle','Hide this team')}>
          <i/>{(t.setup&&t.setup.teamName)||L('Takım','Team')}<b>{perTeam[t.id]||0}</b></button>;})}
    </div>

    {mode==='grid'?<div className="atc-tg-wrap"><div className="atc-tg" style={{'--hpx':ATC_HOUR_PX+'px'}}>
      <div className="atc-tg-hd">
        <div className="atc-tg-corner"/>
        {week.map((d,i)=>{const dt=parseD(d.k);
          return<div key={d.k} className={'atc-tg-dh'+(d.k===todayK?' today':'')+(i>=5?' wkend':'')}>
            <span className="atc-tg-dn">{DNL[i]}</span>
            <span className="atc-tg-dd">{dt.getDate()}</span>
            <span className="atc-tg-dc">{d.rows.length?L(`${d.rows.length} seans`,`${d.rows.length} session${d.rows.length>1?'s':''}`):'—'}</span>
          </div>;})}
      </div>
      {untimed&&<div className="atc-tg-allday">
        <div className="atc-tg-corner sm">{L('saat yok','no time')}</div>
        {week.map((d,i)=><div key={d.k} className={'atc-tg-adcol'+(i>=5?' wkend':'')}>
          {d.rows.filter(r=>r.st==null).map(r=>{const nm=(r.team.setup&&r.team.setup.teamName)||'';
            return<button key={r.team.id+':'+r.se.id} type="button" className="atc-chip" style={{'--tc':colorOf[r.team.id]}}
              onClick={()=>openDay&&openDay(r.team.id,d.k)} title={title(r,nm)}>{nm} · {r.se.name||L('Antrenman','Session')}</button>;})}
        </div>)}
      </div>}
      <div className="atc-tg-body" style={{height:hours.length*ATC_HOUR_PX}}>
        <div className="atc-tg-axis">
          {hours.map(h=><div key={h} className="atc-tg-hr" style={{top:(h-h0)*ATC_HOUR_PX}}><span>{pad(h)}:00</span></div>)}
        </div>
        {week.map((d,i)=><div key={d.k} className={'atc-tg-col'+(d.k===todayK?' today':'')+(i>=5?' wkend':'')}>
          {hours.map(h=><div key={h} className="atc-tg-line" style={{top:(h-h0)*ATC_HOUR_PX}}/>)}
          {d.k===todayK&&nowM>=h0*60&&nowM<=h1*60&&<div className="atc-now" style={{top:(nowM-h0*60)/60*ATC_HOUR_PX}}><i/></div>}
          {d.rows.filter(r=>r.st!=null).map(r=>{
            const nm=(r.team.setup&&r.team.setup.teamName)||'';
            const top=(r.st-h0*60)/60*ATC_HOUR_PX;
            const hgt=Math.max(26,(r.en-r.st)/60*ATC_HOUR_PX-3);
            const w=100/(r.lanes||1);
            return<button key={r.team.id+':'+r.se.id} type="button"
              className={'atc-ev'+(r.clash?' clash':'')+(hgt<48?' short':'')+(r.team.id===activeTeamId?' mine':'')}
              style={{'--tc':colorOf[r.team.id],top,height:hgt,left:`calc(${r.lane*w}% + 3px)`,width:`calc(${w}% - 6px)`}}
              onClick={()=>openDay&&openDay(r.team.id,d.k)} title={title(r,nm)+`\n${atcHHMM(r.st)}–${atcHHMM(r.en)}`}>
              <span className="atc-ev-t">{atcHHMM(r.st)}–{atcHHMM(r.en)}{r.match?<em>{L('MAÇ','GAME')}</em>:null}{r.clash?<u title={L('Saat çakışıyor','Time overlap')}>!</u>:null}</span>
              <span className="atc-ev-tm">{nm}</span>
              <span className="atc-ev-nm">{r.se.name||L('Antrenman','Session')}</span>
            </button>;})}
        </div>)}
      </div>
    </div></div>

    :<div className="atc-grid">
      {week.map((d,i)=>{const dt=parseD(d.k);
        return<div key={d.k} className={'atc-day'+(d.k===todayK?' today':'')+(i>=5?' wkend':'')}>
          <div className="atc-dh"><div><b>{DNF[i]}</b><span>{dt.getDate()} {MNL[dt.getMonth()]}</span></div>
            {d.rows.length?<i>{d.rows.length}</i>:null}</div>
          <div className="atc-list">
            {d.rows.length?d.rows.map(r=>{
              const nm=(r.team.setup&&r.team.setup.teamName)||'';
              return<button key={r.team.id+':'+r.se.id} type="button" className={'atc-ses'+(r.clash?' clash':'')}
                style={{'--tc':colorOf[r.team.id]}} onClick={()=>openDay&&openDay(r.team.id,d.k)}
                title={title(r,nm)}>
                <span className="atc-time">{r.st!=null?`${atcHHMM(r.st)}–${atcHHMM(r.en)}`:L('saat yok','no time')}
                  {r.match?<em className="atc-match">{L('MAÇ','GAME')}</em>:null}</span>
                <span className="atc-tm">{nm}</span>
                <span className="atc-nm">{r.se.name||L('Antrenman','Session')}</span>
                <span className="atc-meta">{r.dur?L(`${r.dur} dk`,`${r.dur} min`):''}{r.team.id===activeTeamId?<em>{L('seçili takım','current team')}</em>:null}</span>
                {r.clash?<span className="atc-warn">{L('saat çakışıyor','time overlap')}</span>:null}
              </button>;})
              :<div className="atc-empty">{L('Seans yok','No sessions')}</div>}
          </div>
        </div>;})}
    </div>}
  </div>);
}

function ThemePicker(){
  const t=useAppTheme();
  return(<div className="th-seg" role="radiogroup" aria-label={L('Tema','Theme')}>
    {[['dark',L('Koyu','Dark'),'☾'],['light',L('Açık','Light'),'☀']].map(([k,lbl,ic])=>
      <button key={k} type="button" role="radio" aria-checked={t===k} className={t===k?'on':''} onClick={()=>setTheme(k)}>
        <span aria-hidden="true">{ic}</span>{lbl}</button>)}
  </div>);
}
function Setup({team,updateTeam,data,setData}){
  const s=team.setup;const u=(k,v)=>updateTeam(team.id,{setup:{...s,[k]:v}});
  /* Several setup keys in ONE write. Two `u` calls in a row would each build their
     patch from the same `s`, so the second would drop the first — and the equipment
     inventory writes two keys at once (the shelf and the flat list read from it). */
  const uAll=patch=>updateTeam(team.id,{setup:{...s,...patch}});
  /* The season and the macrocycle are the same window: it opens with General Preparation
     and closes with Transition. Auto periods already follow the season dates; custom ones
     are moved by hand here so the two ends stay the same dates. */
  const uSeason=(k,v)=>{if(!v)return;
    if(!s.periods){u(k,v);return;}
    const np=s.periods.map((p,i)=>
      (k==='seasonStart'&&i===0)?{...p,start:v}:
      (k==='seasonEnd'&&i===s.periods.length-1)?{...p,end:v}:p);
    updateTeam(team.id,{setup:{...s,[k]:v,periods:np}});};
  const seasons=team.seasons||[];
  /* Teams / age groups. Every squad the club runs, each with its own season, roster and
     plan; the one in bold is the one the rest of the app is looking at. */
  const teamList=(data&&data.teams)||[];
  const addTeam=()=>{const t=makeDefaultTeam();t.setup.teamName=L('Yeni Takım','New Team');
    setData(withTeam(data,t.id,{teams:[...teamList,t]}));};
  const delTeam=id=>{
    if(teamList.length<=1){alert(L('En az bir takım kalmalı','Keep at least one team'));return;}
    if(!confirm(L('Bu takım ve TÜM verileri kalıcı olarak silinsin mi?','Delete this team and ALL its data permanently?')))return;
    const teams=teamList.filter(t=>t.id!==id);setData(withTeam(data,teams[0].id,{teams}));};
  const patchTeamSetup=(id,upd)=>setData(prev=>({...prev,
    teams:prev.teams.map(t=>t.id===id?{...t,setup:{...t.setup,...upd}}:t)}));
  /* Any picture on this screen, opened full-size. One piece of state for the whole tab:
     only one can be open at a time and Esc closes whichever it is. */
  const[zoom,setZoom]=useState(null);
  useEffect(()=>{
    if(!zoom)return;
    const esc=e=>{if(e.key==='Escape')setZoom(null);};
    window.addEventListener('keydown',esc);
    return()=>window.removeEventListener('keydown',esc);
  },[zoom]);
  const crestRef=useRef(null);
  const clubName=String(s.clubName||'').trim()||s.teamName||L('Kulüp','Club');
  const crest=hasMedia(s.logo)?mediaSrc(s.logo):'';
  const totalAthletes=teamList.reduce((n,t)=>n+((t.athletes||[]).length),0);
  const activeSeason=seasons.find(sn=>sn.id===team.activeSeasonId);
  return(<div className="su">
    <PageHero title={L('Ayarlar','Settings')}
      sub={L('Kulüp, takımlar, sezon penceresi ve salonun ekipmanı — uygulamanın geri kalanı bunları okur.',
             'The club, the teams, the season window and the gym\'s kit — the rest of the app reads these.')}
      stats={[{v:teamList.length,l:L('Takım','Teams')},
              {v:totalAthletes,l:L('Sporcu','Athletes')}]}/>
    {/* The club as it reads everywhere else in the app — crest, name, and the three facts
        that identify it — so the screen opens with what it is about rather than with a
        form field. */}
    <div className="su-hero">
      <div className="su-hero-crest" onClick={()=>crest&&setZoom({src:crest,alt:clubName})}
        title={crest?L('Büyüt','Enlarge'):''} style={{cursor:crest?'zoom-in':'default'}}>
        {crest?<img src={crest} alt=""/>:<span>{nameInitials(clubName)}</span>}
        {/* The crest is also where it is changed: no second copy of it further down the
            form, so there is one logo on this screen and it is the one being edited. */}
        <div className="su-crest-edit" onClick={e=>e.stopPropagation()}>
          <button type="button" title={L('Logoyu değiştir','Replace logo')} onClick={()=>crestRef.current&&crestRef.current.click()}>{L('Değiştir','Replace')}</button>
          {crest&&<button type="button" title={L('Logoyu kaldır','Remove logo')} onClick={()=>u('logo','')}>✕</button>}
        </div>
        <input type="file" accept="image/*" ref={crestRef} style={{display:'none'}} onChange={e=>{
          const f=e.target.files&&e.target.files[0];e.target.value='';
          if(f)handleImageUpload(f,'logos',v=>u('logo',v));
        }}/>
      </div>
      <div className="su-hero-tx">
        <div className="su-hero-k">{L('Kulüp','Club')}</div>
        <h1>{clubName}</h1>
        <div className="su-hero-meta">
          <span className="su-chip">{s.sport}</span>
          {activeSeason&&<span className="su-chip">{seasonName(team,activeSeason)}</span>}
          <span className="su-chip">{L(`${teamList.length} takım`,`${teamList.length} teams`)}</span>
          <span className="su-chip">{L(`${totalAthletes} sporcu`,`${totalAthletes} athletes`)}</span>
          {String(s.trainingLocation||'').trim()&&<span className="su-chip loc">{s.trainingLocation.trim()}</span>}
        </div>
      </div>
    </div>

    <div className="su-cols">
      <div className="panel su-panel"><h2>{L('Kulüp Bilgileri','Club Information')}</h2>
        <div className="help su-lead">{L('Sitenin her yerinde kulübü temsil eden bilgiler — başlıklarda, yazdırılan programlarda ve sporcuya giden formlarda bunlar görünür.',
                                         'What represents the club everywhere on the site — in headers, on printed programs and on the forms athletes fill in.')}</div>
        <div className="su-rows">
          <div className="su-f"><label>{L('Kulüp adı','Club name')}</label>
            <input value={s.clubName||''} placeholder={s.teamName||''} onChange={e=>u('clubName',e.target.value)}/></div>
          <div className="grid cols-2">
            <div className="su-f"><label>{L('Spor','Sport')}</label>
              <select value={s.sport} onChange={e=>u('sport',e.target.value)}>{SPORTS.map(x=><option key={x}>{x}</option>)}</select></div>
            <div className="su-f"><label>{L('Sezon','Season')}</label>
              <select value={team.activeSeasonId||''} onChange={e=>switchTeamSeason(team,updateTeam,e.target.value)}>
                {seasons.map(sn=><option key={sn.id} value={sn.id}>{seasonName(team,sn)}</option>)}
              </select></div>
          </div>
          <div className="grid cols-2">
            <div className="su-f"><label>{L('Sezon başlangıcı','Season start')}</label>
              <DateDMY value={s.seasonStart} onChange={v=>uSeason('seasonStart',v)}/>
              <div className="help">{L('Genel Hazırlık başlangıcı','General Preparation start')}</div></div>
            <div className="su-f"><label>{L('Sezon sonu','Season end')}</label>
              <DateDMY value={s.seasonEnd} onChange={v=>uSeason('seasonEnd',v)}/>
              <div className="help">{L('Geçiş dönemi sonu','Transition end')}</div></div>
          </div>
        </div>
      </div>

      <div className="panel su-panel"><h2>{L('Antrenman Lokasyonu','Training Location')}</h2>
        <div className="help su-lead">{L('Takımın çalıştığı tesis ve bir fotoğrafı.','The facility the team works in, and a photograph of it.')}</div>
        <div className="su-rows">
          <div className="su-f"><label>{L('Lokasyon','Location')}</label>
            <input value={s.trainingLocation||''} placeholder={L('Tesis / salon adı, şehir','Facility / gym name, city')}
              onChange={e=>u('trainingLocation',e.target.value)}/></div>
          <SetupImage label={L('Tesis görseli','Facility photo')} value={s.facilityPhoto} onChange={v=>u('facilityPhoto',v)}
            folder="facility" wide onZoom={setZoom}
            hint={L('16:9 · tıklayınca tam boy açılır.','16:9 · click it to open full size.')}/>
        </div>
      </div>
    </div>

    <div className="panel su-panel">
      <div className="su-head">
        <div>
          <h2 style={{margin:0}}>{L('Takımlar / Yaş Grupları','Teams / Age Groups')}</h2>
          <div className="help su-lead" style={{margin:'6px 0 0'}}>{L('Her takımın kendi sezonu, kadrosu ve planı vardır. Bir karta tıklayarak ya da kenar çubuğundaki seçiciden takım değiştirebilirsin.',
                                           'Each team has its own season, roster and plan. Click a card, or use the sidebar picker, to switch team.')}</div>
        </div>
        <button className="btn sec sm" onClick={addTeam}>+ {L('Takım ekle','Add team')}</button>
      </div>
      <div className="tp-grid">
        {teamList.map(t=>{
          const isActive=t.id===data.activeTeamId;
          const ts=t.setup||{};
          const logo=hasMedia(ts.logo)?mediaSrc(ts.logo):'';
          const nAth=(t.athletes||[]).length,nStaff=(t.staff||[]).length;
          /* How far into its season the team is — the one thing a list of dates does not say at a glance. */
          const a=ts.seasonStart?parseD(ts.seasonStart):null,b=ts.seasonEnd?parseD(ts.seasonEnd):null;
          const span=a&&b?Math.max(1,(b-a)/86400000):0;
          const done=span?Math.max(0,Math.min(1,(today-a)/86400000/span)):0;
          const left=b?Math.ceil((b-today)/86400000/7):null;
          const state=!span?'':today<a?L('Sezon başlamadı','Not started'):today>b?L('Sezon bitti','Season over'):
            L(`${Math.max(0,left)} hafta kaldı`,`${Math.max(0,left)} weeks left`);
          const nextComp=(ts.competitions||[]).filter(c=>c&&c.date&&c.date>=fmt(today)).sort((x,y)=>x.date.localeCompare(y.date))[0];
          return(<div key={t.id} className={'tp-card2'+(isActive?' on':'')}
            onClick={e=>{if(!isActive&&!e.target.closest('input,button,label'))setData(withTeam(data,t.id));}}>
            <div className="tp2-top">
              <label className="tp2-logo" title={L('Takım logosu yükle','Upload team logo')} onClick={e=>e.stopPropagation()}>
                {logo?<img src={logo} alt=""/>:<span>{nameInitials(ts.teamName||'T')}</span>}
                <i>{L('Değiştir','Change')}</i>
                <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                  const f=e.target.files&&e.target.files[0];e.target.value='';
                  if(f)handleImageUpload(f,'logos',v=>patchTeamSetup(t.id,{logo:v}));
                }}/>
              </label>
              <div className="tp2-id">
                <input className="tp2-name" value={ts.teamName||''} onChange={e=>patchTeamSetup(t.id,{teamName:e.target.value})} placeholder={L('Takım adı','Team name')}/>
                <div className="tp2-sub">
                  <span className="tp-sport">{ts.sport}</span>
                  {isActive?<span className="tp2-badge">● {L('Aktif','Active')}</span>:null}
                </div>
              </div>
              <button type="button" className="tp2-del" onClick={e=>{e.stopPropagation();delTeam(t.id);}} title={L('Takımı sil','Delete team')} aria-label={L('Takımı sil','Delete team')}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
            <div className="tp2-stats">
              <div><b>{nAth}</b><span>{L('Sporcu','Athletes')}</span></div>
              <div><b>{nStaff}</b><span>{L('Ekip','Staff')}</span></div>
              <div><b>{(ts.competitions||[]).length}</b><span>{L('Maç','Games')}</span></div>
            </div>
            <div className="tp2-season">
              <div className="tp2-srow"><span>{fd(ts.seasonStart)} → {fd(ts.seasonEnd)}</span><em>{state}</em></div>
              <div className="tp2-bar"><i style={{width:(done*100).toFixed(1)+'%'}}/></div>
              {nextComp&&<div className="tp2-next">{L('Sıradaki maç','Next game')}: <b>{nextComp.name||L('Maç','Game')}</b> · {fd(nextComp.date)}</div>}
            </div>
            {!isActive&&<button type="button" className="tp2-sel" onClick={e=>{e.stopPropagation();setData(withTeam(data,t.id));}}>{L('Bu takıma geç','Switch to this team')} →</button>}
          </div>);
        })}
        <button type="button" className="tp-card2 tp2-add" onClick={addTeam}>
          <span>＋</span><b>{L('Yeni takım / yaş grubu','New team / age group')}</b>
          <em>{L('Kendi sezonu, kadrosu ve planıyla','With its own season, roster and plan')}</em>
        </button>
      </div>
    </div>

    {/* Wellness notifications. This used to live on a screen of its own, which meant the
        one control that decides whether a coach hears about a hurt athlete at all sat
        behind a tab most of them never opened. It belongs with the rest of the things
        you switch on once and forget. */}
    <div className="panel su-panel"><h2>{L('Bildirimler','Notifications')}</h2>
      <PushCard/>
    </div>

    <div className="panel su-panel"><h2>{L('Görünüm','Appearance')}</h2>
      <p className="su-lead">{L('Tema bu cihaz için saklanır.','The theme is saved for this device.')}</p>
      <ThemePicker/>
    </div>

    <div className="panel su-panel"><h2>{L('Gizlilik ve KVKK','Privacy')}</h2>
      <p className="su-lead">{L('Hangi verilerin işlendiği, nereye aktarıldığı ve haklarınla ilgili bilgi.','What data is processed, where it is transferred, and your rights.')}</p>
      <PrivacyLink className="btn sec"/>
      <p className="su-lead" style={{marginTop:12,marginBottom:0}}>© {new Date().getFullYear()} CoachOS · {L('Tüm hakları saklıdır.','All rights reserved.')}</p>
    </div>

    {zoom&&<div className="su-lb" onClick={()=>setZoom(null)}>
      <img src={zoom.src} alt={zoom.alt||''} onClick={e=>e.stopPropagation()}/>
      <button type="button" className="su-lbx" onClick={()=>setZoom(null)} aria-label={L('Kapat','Close')}>✕</button>
    </div>}
  </div>);
}

/* One picture on the Setup tab — the club crest, the facility. An EMPTY slot is a drop
   zone: clicking it opens the file picker. A FILLED one is the picture, and clicking it
   opens it full size — replacing and removing move to the two buttons underneath, because
   a coach looks at this photo far more often than they change it. Uploads run through the
   same resize/Storage path as every other picture in the app, so a 6 MB phone photo does
   not end up inside the synced JSON. */
function SetupImage({label,value,onChange,folder,hint,shape,wide,onZoom}){
  const ref=useRef(null);
  const has=hasMedia(value);
  const src=has?mediaSrc(value):'';
  const pick=()=>ref.current&&ref.current.click();
  return(<div className={'su-img'+(wide?' wide':'')}>
    <label>{label}</label>
    <div className={'su-img-box'+(shape==='round'?' round':'')+(wide?' wide':'')+(has?' has':'')}
      onClick={()=>has?(onZoom&&onZoom({src,alt:label})):pick()}
      title={has?L('Büyüt','Enlarge'):L('Görsel yükle','Upload image')}>
      {has?<><img src={src} alt=""/><span className="su-img-zo">⤢</span></>
          :<span className="su-img-ph">＋</span>}
    </div>
    <input type="file" accept="image/*" ref={ref} style={{display:'none'}} onChange={e=>{
      const f=e.target.files&&e.target.files[0];e.target.value='';
      if(f)handleImageUpload(f,folder,v=>onChange(v));
    }}/>
    <div className="su-img-act">
      <button className="btn xs sec" onClick={pick}>{has?L('Değiştir','Replace'):L('Yükle','Upload')}</button>
      {has&&<button className="btn xs danger" onClick={()=>onChange('')}>{L('Kaldır','Remove')}</button>}
      {hint&&<span className="help su-img-hint">{hint}</span>}
    </div>
  </div>);
}

