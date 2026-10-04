/* =========================================================
   STAFF — the other half of the roster
   One section per category, one card per person, and the card IS the form: a name
   and a phone number is the whole record, so putting it behind a modal would cost
   two clicks to change a digit. The country code sits in its own picker and is
   never empty — a bench number without one cannot be dialled from an away trip,
   which is the one trip where it matters.
   ========================================================= */
function StaffCard({m,role,upd,del,fresh,athletes,team}){
  /* Closed by default — a face and a name is all the roster needs to show at a glance.
     A card that was just added opens straight into edit mode (fresh), same as before;
     everyone else opens only on click, and collapses again on request, not on blur —
     a stray click outside shouldn't discard a half-typed edit. */
  const[editing,setEditing]=useState(!!fresh);
  const initials=(m.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const joined=fullPhone(m);
  const photoRef=useRef(null);
  const name=(m.name||'').trim();
  if(!editing){
    return(<div className="stf-c mini" role="button" tabIndex={0}
      onClick={()=>setEditing(true)}
      onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setEditing(true);}}}
      title={L('Düzenlemek için tıkla','Click to edit')}>
      <button className="stf-x" title={L('Ekipten çıkar','Remove from staff')} onClick={e=>{e.stopPropagation();del();}}>✕</button>
      <div className="stf-av sq" style={{color:role.c,borderColor:role.c,background:role.bg}}>
        {m.photo?<img src={mediaSrc(m.photo)} alt=""/>:initials}
      </div>
      <div className={`stf-mini-name${name?'':' empty'}`}>{name||L('İsimsiz','Unnamed')}</div>
      {/* A quiet dot, not a label: the collapsed card is a face and a name, and the one
          thing worth adding is whether this person has been sent their alert link. */}
      {m.alertToken&&<span className="stf-badge on" title={L('Bildirim linki oluşturuldu','Notification link created')}>●</span>}
    </div>);
  }
  return(<div className="stf-c">
    <button className="stf-x" title={L('Ekipten çıkar','Remove from staff')} onClick={del}>✕</button>
    <button className="stf-collapse" title={L('Daralt','Collapse')} onClick={()=>setEditing(false)}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
    </button>
    <div className="stf-top">
      <div className={`stf-av${m.photo?' has':''}`} style={{color:role.c,borderColor:role.c,background:role.bg}}
        onClick={()=>photoRef.current?.click()} title={L('Fotoğrafı değiştirmek için tıkla','Click to change photo')}>
        {m.photo?<img src={mediaSrc(m.photo)} alt=""/>:initials}
        <span className="cam">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </span>
        <input type="file" accept="image/*" ref={photoRef} className="hidden"
          onClick={e=>e.stopPropagation()}
          onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'staff',d=>upd({photo:d}));e.target.value='';}}/>
      </div>
      <div className="stf-f">
        <label>{L('Ad Soyad','Full name')}</label>
        <input className="stf-nm" value={m.name||''} placeholder={L('Ad Soyad','Full name')}
          autoFocus={fresh} onChange={e=>upd({name:e.target.value})}/>
      </div>
    </div>
    <div className="stf-f" style={{marginTop:12}}>
      <label>{L('Telefon','Phone')}</label>
      <div className="stf-ph">
        <select value={m.phoneCode||DEFAULT_DIAL} onChange={e=>upd({phoneCode:e.target.value})}
          title={L('Ülke kodu','Country code')}>
          {DIAL_CODES.map(c=><option key={c.c} value={c.d}>{c.d} · {c.c}</option>)}
        </select>
        <input type="tel" inputMode="tel" placeholder="532 123 45 67" value={m.phone||''}
          onChange={e=>upd({phone:cleanPhone(e.target.value)})}/>
      </div>
    </div>
    {role.id===INDIVIDUAL_ROLE&&<div className="stf-f" style={{marginTop:12}}>
      <label>{L('Takip ettiği sporcular','Athletes they follow')}</label>
      {/* An individual coach works athlete by athlete, so their alerts are scoped the
          same way: only the squad members picked here reach this person's phone. The
          other four roles cover the whole squad and have nothing to pick. */}
      {(athletes||[]).length===0
        ?<div className="stf-hint" style={{marginTop:6}}>{L('Kadroda henüz sporcu yok.','No athletes on the roster yet.')}</div>
        :<div className="stf-ath">{(athletes||[]).map(a=>{
          const on=(m.athleteIds||[]).includes(a.id);
          return<button key={a.id} type="button" className={on?'on':''}
            onClick={()=>upd({athleteIds:on?(m.athleteIds||[]).filter(x=>x!==a.id)
                                           :[...(m.athleteIds||[]),a.id]})}>
            {(a.name||'').trim()||L('İsimsiz','Unnamed')}</button>;})}</div>}
      {(m.athleteIds||[]).length===0&&(athletes||[]).length>0&&
        <div className="stf-warn">{L('Sporcu seçilmedi — bu kişiye hiçbir wellness uyarısı gitmez.',
                                      'No athletes selected — this person receives no wellness alerts.')}</div>}
    </div>}
    <StaffAlertLink m={m} upd={upd} team={team}/>
    <div className="stf-foot">
      {joined
        ?<a className="stf-tel" href={`tel:${joined.replace(/[^\d+]/g,'')}`}>☏ {joined}</a>
        :<span className="stf-hint">{L('Numarayı başındaki 0 olmadan yaz.','Number without the leading 0.')}</span>}
    </div>
  </div>);
}

/* Bir ekip üyesinin bildirim linki.

   CoachOS'ta ekip üyelerinin hesabı yok — kadroda birer kayıtlar. Telefonlarını
   uyarılara bağlamanın yolu, uygulamanın check-in formlarında zaten kullandığı ve
   sahada çalışan desen: kişiye özel, tahmin edilemez bir adres. Yeni bir kimlik
   sistemi, şifre ya da davet e-postası gerekmiyor.

   Linki bilen kişi o kaydın sahibi sayılıyor, bu yüzden grup sohbetine değil
   kişiye gönderilmeli — kutunun altındaki uyarı bunu söylüyor. */
function StaffAlertLink({m,upd,team}){
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const[copied,setCopied]=useState(false);
  const url=m.alertToken?staffAlertUrl(m.alertToken):'';

  const create=async(regenerate)=>{
    setErr('');setBusy(true);
    try{
      const fb=FB();
      const user=fb&&fb.auth&&fb.auth().currentUser;
      if(!user)throw new Error(L('Önce hesabınla giriş yap.','Sign in with your account first.'));
      if(regenerate&&m.alertToken)await revokeStaffLink(m.alertToken).catch(()=>{});
      const token=newCheckinToken();
      await publishStaffLink(user.uid,team,m,token);
      upd({alertToken:token});
    }catch(e){setErr((e&&e.message)||String(e));}
    setBusy(false);
  };
  const revoke=async()=>{
    if(!confirm(L('Bu link geçersiz kılınsın mı? Kişi yeni link alana kadar bildirim almaz.',
                  'Revoke this link? They stop receiving alerts until you send a new one.')))return;
    setErr('');setBusy(true);
    try{await revokeStaffLink(m.alertToken);upd({alertToken:''});}
    catch(e){setErr((e&&e.message)||String(e));}
    setBusy(false);
  };
  const copy=()=>{
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1800);},
      ()=>setErr(L('Kopyalanamadı — adresi elle seçip kopyala.','Could not copy — select the address and copy it.')));
  };
  // Telefonda yerel paylaşım sayfası (WhatsApp, Mesajlar…) — linki kişiye göndermenin en kısa yolu.
  const share=()=>{
    const name=(m.name||'').trim();
    navigator.share({title:'CoachOS',text:L(`${name} — CoachOS wellness uyarı bildirimlerin:`,
                                            `${name} — your CoachOS wellness alerts:`),url}).catch(()=>{});
  };

  return(<div className="stf-lnk">
    <div className="lbl">{L('Bildirim linki','Notification link')}</div>
    {!url&&<>
      <div className="stf-hint">{L('Bu kişiye özel bir adres oluştur; açtığı telefon uyarıları almaya başlar.',
                                   'Create a private address for this person; the phone that opens it starts receiving alerts.')}</div>
      <button className="btn sec sm" style={{marginTop:7}} disabled={busy} onClick={()=>create(false)}>
        {busy?L('Oluşturuluyor…','Creating…'):L('+ Bildirim linki oluştur','+ Create notification link')}</button>
    </>}
    {url&&<>
      <div className="url">{url}</div>
      <div className="row">
        <button className="btn sec sm" onClick={copy}>{copied?L('Kopyalandı ✓','Copied ✓'):L('Kopyala','Copy')}</button>
        {typeof navigator.share==='function'&&
          <button className="btn sec sm" onClick={share}>{L('Gönder','Send')}</button>}
        <button className="btn sec sm" disabled={busy} onClick={()=>create(true)}>{L('Yenile','Regenerate')}</button>
        <button className="btn sec sm" disabled={busy} onClick={revoke}>{L('Geçersiz kıl','Revoke')}</button>
      </div>
      <div className="stf-warn">{L('Kişiye özel gönder — gruba atma. Linki açan herkes bu takımın uyarılarını görür.',
                                   'Send it to this person only — not to a group. Anyone who opens it sees this team\'s alerts.')}</div>
    </>}
    {err&&<div className="stf-warn" style={{color:'var(--red)'}}>{err}</div>}
  </div>);
}
function StaffPanel({staff,save,athletes,team}){
  /* The card that was just added opens with the cursor in its name field — the button
     was pressed to type a name, so nobody should have to click the box as well. */
  const[fresh,setFresh]=useState(null);
  const add=role=>{const m=normStaff({role});setFresh(m.id);save([...staff,m]);};
  const upd=(id,u)=>save(staff.map(m=>m.id===id?{...m,...u}:m));
  const del=id=>{
    const m=staff.find(x=>x.id===id),who=((m&&m.name)||'').trim();
    if(!confirm(who?L(`${who} ekipten çıkarılsın mı?`,`Remove ${who} from the staff?`)
                   :L('Bu kayıt silinsin mi?','Delete this entry?')))return;
    /* Kadrodan çıkan kişinin bildirim linki de geçersiz kılınıyor. Kayıt silinince
       o kişi zaten kapsam dışı kalıp uyarı almayı kesiyor, ama adres arkada açık
       kalırsa takımın uyarı listesi okunmaya devam ederdi. */
    if(m&&m.alertToken)revokeStaffLink(m.alertToken).catch(()=>{});
    save(staff.filter(x=>x.id!==id));};
  return(<div className="stf-wrap">
    {STAFF_ROLES.map(r=>{
      const list=staff.filter(m=>m.role===r.id);
      return(<section key={r.id} className="stf-sec" style={{borderLeftColor:r.c}}>
        <div className="stf-h">
          <div className="stf-hd">
            <div className="stf-t">{L(r.tr,r.en)}</div>
            <div className="stf-s">{list.length
              ?L(`${list.length} kişi`,`${list.length} ${list.length>1?'people':'person'}`)
              :L('Henüz kimse yok','Nobody yet')}</div>
          </div>
          <button className="btn sec sm" onClick={()=>add(r.id)}>+ {L(`${capTR(r.str)} ekle`,`Add ${r.sen}`)}</button>
        </div>
        {list.length===0
          ?<div className="stf-none">{L(`Bu kategoride kimse yok — "+ ${capTR(r.str)} ekle" ile başla.`,
                                        `Nobody in this category yet — start with "+ Add ${r.sen}".`)}</div>
          :<div className="stf-grid">{list.map(m=>
            <StaffCard key={m.id} m={m} role={r} fresh={m.id===fresh} athletes={athletes} team={team}
              upd={u=>upd(m.id,u)} del={()=>del(m.id)}/>)}</div>}
      </section>);
    })}
  </div>);
}

/* =========================================================
   ATHLETES ROSTER
   ========================================================= */
function Athletes({team,updateTeam,weeks,ai,exercises,customTests,focus}){
  const[sel,setSel]=useState(null);const athletes=team.athletes||[];
  const[q,setQ]=useState('');const[filter,setFilter]=useState('all');
  /* How the squad is ordered and how it is drawn. A coach reading the board before a
     session wants shirt numbers; one chasing a wellness dip wants the worst readiness
     at the top — so the order is a control rather than a decision made for them. */
  const[sort,setSort]=useState('name');
  const[mode,setMode]=useState('grid');
  const searchRef=useRef(null);
  /* Which half of the roster is being read. The athletes' own tools — search, position
     filter, add — belong to their list alone, so they travel with the tab rather than
     sitting over a page of coaches they cannot filter. */
  const[tab,setTab]=useState('athletes');
  /* A wellness notification lands here: it names an athlete and the screen it is about,
     so the roster opens that athlete directly rather than leaving the coach to find the
     name in a list they were not looking at. The tab is remembered separately so going
     Back and opening the same athlete again behaves normally. */
  const[focusTab,setFocusTab]=useState(null);
  useEffect(()=>{
    if(!focus||!focus.athleteId)return;
    if(!(team.athletes||[]).some(a=>a.id===focus.athleteId))return;   // başka takımın sporcusu
    setTab('athletes');setSel(focus.athleteId);setFocusTab(focus.tab||'wellness');
  },[focus,team.id]);
  /* ⌘K / Ctrl-K jumps to the search box — the roster is the one screen in the app
     long enough that finding a name by scrolling is the slow way. */
  useEffect(()=>{
    const onKey=e=>{
      if((e.metaKey||e.ctrlKey)&&(e.key==='k'||e.key==='K')){
        e.preventDefault();setTab('athletes');
        if(searchRef.current)searchRef.current.focus();
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);
  const staff=team.staff||[];
  const save=a=>updateTeam(team.id,{athletes:a});
  const saveStaff=st=>updateTeam(team.id,{staff:st});
  const addAth=()=>{const a={id:uid(),name:'New Athlete',number:'',position:(POSITIONS[team.setup.sport]||POSITIONS.default)[0],
    dateOfBirth:'',height:'',weight:'',phone:'',phoneCode:DEFAULT_DIAL,photo:null,notes:'',trainingAge:'',somatotype:'',constraints:'',
    constraintTags:[],levelTag:'',
    injuries:[],measurements:[],wellness:[],srpeLog:[],tests:[],days:{}};save([...athletes,a]);setSel(a.id);};
  const updAth=(id,upd)=>save(athletes.map(a=>a.id===id?{...a,...upd}:a));
  const delAth=id=>{if(!confirm(L('Bu sporcu ve tüm verileri silinsin mi?','Delete this athlete and all their data?')))return;save(athletes.filter(a=>a.id!==id));if(sel===id)setSel(null);};
  const ageOf=a=>{if(!a.dateOfBirth)return null;const b=parseD(a.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;};
  const totalAU=a=>Object.values(a.days||{}).reduce((s,d)=>s+(d.sessions||[]).reduce((x,ses)=>x+Number(ses.au||0),0),0);
  const isInjured=a=>(a.injuries||[]).some(i=>i.status!=='Recovered');
  const initials=name=>(name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const positions=POSITIONS[team.setup.sport]||POSITIONS.default;
  const filtered=athletes.filter(a=>{
    if(filter!=='all'&&posOf(a.position)!==filter)return false;
    if(!q)return true;
    const s=q.toLowerCase();
    return(a.name||'').toLowerCase().includes(s)||posOf(a.position).toLowerCase().includes(s)||String(a.number||'').includes(s);
  });
  /* Everything a card shows, worked out once per athlete: the cards, the rows, the sort
     and the bars all read the same numbers, so an athlete cannot appear ninth by
     readiness and show a different readiness in their own card. */
  const rows=filtered.map(a=>{
    const ref=athLatestDate(a);
    const l7=athLoadSum(a,fmt(addD(parseD(ref),-6)),ref);
    return{a,age:ageOf(a),l7,rd:athWellnessVal(a,'readiness',ref),
      acwr:athACWR(a,ref),td:athTrainingDays(team.days,a.id,team.setup),inj:isInjured(a)};
  });
  const SORTS=[
    {id:'name',  label:L('İsim (A → Z)','Name (A → Z)')},
    {id:'number',label:L('Forma No (Küçükten Büyüğe)','Shirt No (low to high)')},
    {id:'ready', label:L('Hazır Oluş (Düşükten Yükseğe)','Readiness (low to high)')},
    {id:'load',  label:L('7 Günlük Yük (Yüksekten Düşüğe)','7-day load (high to low)')},
    {id:'pos',   label:L('Pozisyon','Position')},
  ];
  // A missing shirt number sorts last rather than as zero — an unnumbered trialist is
  // not the squad's number one.
  const numOf=a=>{const n=parseInt(a.number,10);return isNaN(n)?1e9:n;};
  const byName=(x,y)=>byAthleteName(x.a,y.a);
  const sorted=[...rows].sort((x,y)=>{
    if(sort==='name')return byName(x,y);
    if(sort==='pos')return (posOf(x.a.position)||'').localeCompare(posOf(y.a.position)||'')||byName(x,y);
    if(sort==='ready')return (x.rd==null?99:x.rd)-(y.rd==null?99:y.rd)||byName(x,y);
    if(sort==='load')return (y.l7||0)-(x.l7||0)||byName(x,y);
    return numOf(x.a)-numOf(y.a)||byName(x,y);
  });
  // The 7-day bar has no natural ceiling, so the squad's own heaviest week is the one
  // it is drawn against: the bars then compare athletes to each other, which is the
  // only comparison that means anything here.
  const maxL7=Math.max(1,...rows.map(r=>r.l7||0));
  /* The whole squad on one screen. A roster is read as a group — who is fit, who is
     loaded, who has not checked in — and a page break through the middle of it hid half
     the answer behind a button. */
  const list=sorted;
  const fmtLoad=v=>v?v.toLocaleString('en-US').replace(/,/g,'.'):'—';
  if(sel){const ath=athletes.find(a=>a.id===sel);
    if(!ath)return<div className="panel"><button className="btn sec" onClick={()=>setSel(null)}>← {L('Geri','Back')}</button><p>{L('Sporcu bulunamadı','Athlete not found')}</p></div>;
    return<AthleteDetail key={ath.id+':'+(focusTab||'')} ath={ath} onBack={()=>{setSel(null);setFocusTab(null);}} updAth={updAth} setup={team.setup} weeks={weeks} exercises={exercises} ai={ai} customTests={customTests} initialTab={focusTab}/>;}
  return(<div>
    <PageHero title={L('Kadro','Roster')}
      sub={L(`Sezonun yazıldığı kadro · ${team.setup.teamName}`,`The squad the season is written for · ${team.setup.teamName}`)}
      stats={[{v:athletes.length,l:L('Sporcu','Athletes')},
              {v:staff.length,l:L('Teknik Ekip','Staff')},
              {v:sorted.length,l:L('Listelenen','Listed')}]}>
      {tab==='athletes'&&<button className="rost-add" onClick={addAth}>{L('Sporcu Ekle','Add Athlete')}</button>}
    </PageHero>
    <div className="rost-head">
      {tab==='athletes'&&<div className="rost-tools">
        <div className="ath-search"><span className="ic">⌕</span>
          <input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} placeholder={L('Sporcu ara…','Search athlete…')}/>
          <span className="kbd">{IS_MAC?'⌘K':'Ctrl K'}</span></div>
        <div className="ath-seg">
          <button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>{L('Tümü','All')}</button>
          {positions.map(p=><button key={p} className={filter===p?'on':''} onClick={()=>setFilter(p)}>{p}</button>)}
        </div>
      </div>}
    </div>
    <div className="rost-subbar">
      <div className="rost-tabs" style={{marginBottom:0}}>
        <button className={tab==='athletes'?'on':''} onClick={()=>setTab('athletes')}>
          {L('Sporcular','Athletes')}<i>{athletes.length}</i></button>
        <button className={tab==='staff'?'on':''} onClick={()=>setTab('staff')}>
          {L('Teknik Ekip','Staff')}<i>{staff.length}</i></button>
      </div>
      {tab==='athletes'&&<>
        <div className="sp"/>
        <div className="rost-sort">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M7 4v16"/><path d="M4 16.5l3 3.5 3-3.5"/><path d="M17 20V4"/><path d="M14 7.5L17 4l3 3.5"/></svg>
          <select value={sort} onChange={e=>setSort(e.target.value)} aria-label={L('Sıralama','Sort')}>
            {SORTS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="rost-view">
          <button className={mode==='grid'?'on':''} onClick={()=>setMode('grid')} title={L('Kart görünümü','Card view')} aria-label={L('Kart görünümü','Card view')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>
          </button>
          <button className={mode==='list'?'on':''} onClick={()=>setMode('list')} title={L('Liste görünümü','List view')} aria-label={L('Liste görünümü','List view')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/></svg>
          </button>
        </div>
      </>}
    </div>
    {tab==='staff'&&<StaffPanel staff={staff} save={saveStaff} athletes={athletes} team={team}/>}
    {tab==='athletes'&&<>
    {athletes.length===0&&<div className="empty-st">{L('Henüz sporcu yok — başlamak için "Sporcu Ekle"ye tıkla.','No athletes yet — click "Add Athlete" to start.')}</div>}
    {athletes.length>0&&sorted.length===0&&<div className="empty-st">{L('Eşleşme yok.','No matches.')}</div>}
    {mode==='grid'&&<div className="rost-grid">{list.map(r=>{
      const a=r.a;
      const rcls=r.rd==null?'na':r.rd>=4?'':r.rd>=3?'warn':'bad';
      const posFull=POS_FULL[a.position]||a.position||'—';
      const tdTot=r.td.attended+r.td.missed;
      return(<div key={a.id} className="rc" onClick={()=>setSel(a.id)}>
        <button className="rc-del" title={L('Sporcuyu sil','Delete athlete')} onClick={e=>{e.stopPropagation();delAth(a.id);}}>✕</button>
        <div className="rc-num">{a.number||''}</div>
        <div className="rc-top">
          <div className={`rc-av ${rcls}`}>{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials(a.name)}</div>
          <div className="rc-id">
            <div className="rc-name">{a.name}</div>
            <div className="rc-pos">{posFull}{r.age!=null?L(` · ${r.age} yaş`,` · ${r.age} yrs`):''}</div>
          </div>
        </div>
        <div className="rc-stats">
          <div className="rc-st">
            <span className="k">{L('Hazır Oluş','Readiness')}</span>
            <span className="v" style={{color:readyColor(r.rd)}}>{r.rd!=null?r.rd.toFixed(1):'—'}<small>/5</small></span>
            <span className="bar"><i style={{width:`${r.rd!=null?Math.min(100,r.rd/5*100):0}%`,background:readyColor(r.rd)}}/></span>
          </div>
          <div className="rc-st">
            <span className="k">{L('7g yük','7d load')}</span>
            <span className="v" style={{color:'#3b6ef5'}}>{fmtLoad(r.l7)}</span>
            <span className="bar"><i style={{width:`${Math.min(100,(r.l7||0)/maxL7*100)}%`,background:'#3b6ef5'}}/></span>
          </div>
          <div className="rc-st">
            <span className="k">{L('Antrenman günü','Training days')}</span>
            <span className="v" title={L(`${r.td.attended} antrenman günü katıldı · ${r.td.missed} kaçırdı${r.td.from?` — mezosiklüs ${fd(r.td.from)} → ${fd(r.td.to)}`:''}`,`${r.td.attended} training days attended · ${r.td.missed} missed${r.td.from?` — macrocycle ${fd(r.td.from)} → ${fd(r.td.to)}`:''}`)}>
              <span style={{color:'var(--green)'}}>{r.td.attended}</span>
              <span style={{color:'var(--dim)',fontWeight:500,margin:'0 3px'}}>/</span>
              <span style={{color:r.td.missed>0?'#f43f5e':'var(--dim)'}}>{r.td.missed}</span>
            </span>
            <span className="bar split">
              <i style={{width:`${tdTot?r.td.attended/tdTot*100:0}%`}}/>
              <i style={{width:`${tdTot?r.td.missed/tdTot*100:0}%`}}/>
            </span>
          </div>
          <button className="rc-go" aria-label={L('Sporcuyu aç','Open athlete')} onClick={e=>{e.stopPropagation();setSel(a.id);}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>);
    })}</div>}
    {mode==='list'&&<div className="rost-rows">{list.map(r=>{
      const a=r.a;
      const rcls=r.rd==null?'na':r.rd>=4?'':r.rd>=3?'warn':'bad';
      const posFull=POS_FULL[a.position]||a.position||'—';
      return(<div key={a.id} className="rr" onClick={()=>setSel(a.id)}>
        <div className="rr-num">{a.number||'—'}</div>
        <div className={`rr-av ${rcls}`}>{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials(a.name)}</div>
        <div style={{minWidth:0}}>
          <div className="rr-n">{a.name}</div>
          <div className="rr-p">{posFull}{r.age!=null?L(` · ${r.age} yaş`,` · ${r.age} yrs`):''}</div>
        </div>
        <div className="rr-m"><div className="k">{L('Hazır Oluş','Readiness')}</div>
          <div className="v" style={{color:readyColor(r.rd)}}>{r.rd!=null?r.rd.toFixed(1):'—'}<small>/5</small></div></div>
        <div className="rr-m"><div className="k">{L('7g yük','7d load')}</div>
          <div className="v" style={{color:'#3b6ef5'}}>{fmtLoad(r.l7)}</div></div>
        <div className="rr-m"><div className="k">{L('Antrenman günü','Training days')}</div>
          <div className="v"><span style={{color:'var(--green)'}}>{r.td.attended}</span>
            <span style={{color:'var(--dim)',fontWeight:500,margin:'0 2px'}}>/</span>
            <span style={{color:r.td.missed>0?'#f43f5e':'var(--dim)'}}>{r.td.missed}</span></div></div>
        <button className="rc-go" style={{gridRow:'auto',gridColumn:'auto'}} aria-label={L('Sporcuyu aç','Open athlete')} onClick={e=>{e.stopPropagation();setSel(a.id);}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>);
    })}</div>}
    {sorted.length>0&&<div className="rost-foot">
      <div className="rost-foot-c">{L(`${sorted.length} sporcu listeleniyor`,`Showing ${sorted.length} athletes`)}</div>
    </div>}
    </>}
  </div>);
}

/* =========================================================
   ROSTER NAME MATCHING
   All that is left of the retired Tally / Cloudflare-Worker sync: the name key the
   check-in inbox still matches submissions to the roster with.
   ========================================================= */
// Name key used to match a form submission to a roster athlete. Plain
// toUpperCase() is not enough for Turkish names: "i"→"I" but "İ"→"İ", so a
// roster "İsmail" never matched a form "ismail", and "Bakırcı"/"Bakirci" or
// "Öztürk"/"Ozturk" typed with an English keyboard fell apart the same way.
// Folding the Turkish letters to their ASCII base makes the match stable —
// which is what keeps half the squad's RPE from disappearing after a sync.
const NORM=s=>(s||'').toString()
  .replace(/[İIı]/g,'i').replace(/Ş/g,'ş').replace(/Ğ/g,'ğ')
  .replace(/Ü/g,'ü').replace(/Ö/g,'ö').replace(/Ç/g,'ç')
  .toLowerCase()
  .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
  .replace(/ö/g,'o').replace(/ç/g,'c').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .trim().replace(/\s+/g,' ').toUpperCase();

/* =========================================================
   BACKUP
   ========================================================= */
function Backup({data,setData,sync}){
  const fRef=useRef(null);
  const mRef=useRef(null);
  const[msg,setMsg]=useState('');
  const rep=useMemo(()=>mediaReport(data),[data]);
  const missingMedia=rep.lost;
  // Cihazda duran görselleri elle durumun içine geri yaz (açılışta da otomatik yapılır).
  const restoreNow=()=>{
    const clone=JSON.parse(JSON.stringify(data));
    const{restored,missing}=restoreLocalMedia(clone);
    if(restored)setData(clone);
    setMsg(restored?L(`${restored} görsel bu cihazdan geri alındı.`,`${restored} image(s) restored from this device.`):L(`Bu cihazda geri alınacak görsel yok${missing?` (${missing} görsel başka bir cihazda kalmış)`:''}.`,`No images to restore on this device${missing?` (${missing} image(s) are on another device)`:''}.`));
  };
  // Yedek dosyasından SADECE görselleri al — plan, program, testler olduğu gibi kalır.
  const impMedia=e=>{
    const f=e.target.files?.[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const bak=JSON.parse(ev.target.result);
        const clone=JSON.parse(JSON.stringify(data));
        const n=mergeMediaFrom(clone,bak);
        if(n)setData(clone);
        setMsg(n?L(`${n} görsel yedekten geri alındı.`,`${n} image(s) restored from the backup.`):L('Bu yedekte, şu an eksik olan görsellerden hiçbiri yok.','This backup contains none of the currently missing images.'));
      }catch(err){setMsg(L('Yedek okunamadı: ','Could not read backup: ')+(err.message||err));}
    };
    r.readAsText(f);e.target.value='';
  };
  const exp=()=>{const b=new Blob([JSON.stringify(inlineLocalMedia(data),null,2)],{type:'application/json'});const a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=`periodization_backup_${fmt(today)}.json`;a.click();URL.revokeObjectURL(a.href);};
  const imp=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();
    r.onload=ev=>{try{const p=JSON.parse(ev.target.result);if(!p.teams&&!p.setup){alert(L('Geçersiz dosya','Invalid file'));return;}if(confirm(L('Tüm veriler değiştirilsin mi?','Replace all data?')))setData(migrate(p));}catch{alert(L('Okuma hatası','Read error'));}};
    r.readAsText(f);e.target.value='';};
  return(<div>
    <PageHero title={L('Yedekleme','Backup')}
      sub={L('Her takımı tek dosyada dışa aktar, geri yükle ve medyayı denetle.',
             'Export every team as one file, restore it, and audit the media.')}
      stats={[{v:(data.teams||[]).length,l:L('Takım','Teams')},
              {v:(data.teams||[]).reduce((n,t)=>n+((t.athletes||[]).length),0),l:L('Sporcu','Athletes')}]}/>
    <div className="panel"><h2>{L('Tüm Takımlar Özeti','All Teams Summary')}</h2>
      <table><thead><tr><th>{L('Takım','Team')}</th><th>{L('Spor','Sport')}</th><th>{L('Sezon','Season')}</th><th>{L('Planlanan gün','Days planned')}</th><th>{L('Sporcular','Athletes')}</th></tr></thead><tbody>
        {data.teams.map(t=><tr key={t.id}><td><strong>{t.setup.teamName}</strong>{t.id===data.activeTeamId&&<span className="tag" style={{marginLeft:8}}>{L('AKTİF','ACTIVE')}</span>}</td>
          <td>{t.setup.sport}</td><td style={{fontSize:12}}>{fd(t.setup.seasonStart)} → {fd(t.setup.seasonEnd)}</td>
          <td>{Object.values(t.days||{}).filter(d=>d.sessions?.length).length}</td>
          <td>{(t.athletes||[]).length}</td></tr>)}
      </tbody></table>
    </div>
    <div className="panel"><h2>{L('Yedekleme ve Geri Yükleme','Backup & Restore')}</h2>
      <div className="help" style={{marginBottom:12}}>{L('Dışa aktarma TÜM takımları kaydeder (tek .json dosyası). İçe aktarma şu an kayıtlı olan her şeyin yerine geçer — önce yedekle!','Export saves ALL teams (one .json file). Import replaces everything currently stored — back up first!')}</div>
      <div className="row">
        <button className="btn" onClick={exp}>📦 {L('Tam Yedeği İndir','Download Full Backup')}</button>
        <button className="btn sec" onClick={()=>fRef.current.click()}>📂 {L('Yedek Yükle','Load Backup')}</button>
        <input type="file" accept=".json" ref={fRef} onChange={imp} className="hidden"/>
      </div>
    </div>
    <div className="panel"><h2>{L('Görseller','Images')}</h2>
      <div className="help" style={{marginBottom:10}}>
        {L('Durumdaki görseller:','Images in the data:')} <b>{rep.inline}</b> {L('verinin içinde','inline')} · <b>{rep.cloud}</b> {L('bulutta','in the cloud')} ·
        <b> {rep.device}</b> {L('bu cihazda','on this device')} · <b>{rep.drive}</b> Drive ·
        <b style={{color:rep.lost?'var(--yellow)':'inherit'}}> {rep.lost}</b> {L('bulunamıyor','not found')}
      </div>
      {rep.lost>0&&<div className="help" style={{marginBottom:10,color:'var(--yellow)'}}>
        {L(`${rep.lost} görselin dosyası bu tarayıcıda yok. Bir önceki sürüm onları cihaz deposuna taşımıştı: o görselleri yükleyen tarayıcıda uygulamayı bir kez açmak yeterli — açılışta kendiliğinden veriye geri yazılır ve tüm cihazlara gider. O tarayıcıya erişemiyorsan, görselleri içeren bir yedek dosyasından aşağıdaki düğmeyle sadece görselleri geri alabilirsin.`,
        `${rep.lost} image(s) have no file in this browser. An earlier version moved them into device storage: opening the app once in the browser that uploaded them is enough — they write themselves back into the data on load and reach every device. If you can't access that browser, you can restore just the images from a backup file that contains them using the button below.`)}
      </div>}
      <div className="row" style={{gap:8}}>
        <button className="btn sec" onClick={restoreNow}>🖼 {L('Bu cihazdaki görselleri geri yükle','Restore images on this device')}</button>
        <button className="btn sec" onClick={()=>mRef.current.click()}>📂 {L('Yedekten sadece görselleri al','Load images only from backup')}</button>
        <input type="file" accept=".json" ref={mRef} onChange={impMedia} className="hidden"/>
      </div>
      {msg&&<div className="help" style={{marginTop:10}}>{msg}</div>}
      <div className="help" style={{marginTop:10}}>
        {L('"Yedekten sadece görselleri al" planı, programı ve test verilerini değiştirmez; yalnızca şu an eksik olan görselleri yedekteki karşılıklarıyla doldurur.','"Load images only from backup" does not change the plan, program, or test data; it only fills in currently missing images with their counterparts from the backup.')}
      </div>
    </div>
  </div>);
}

