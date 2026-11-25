/* =========================================================
   PROGRAMLAR — kenar çubuğundaki "Programlar" sekmesi (eski Interval Zamanlayıcı'nın yeri)
   =========================================================
   Üç iş, tek ekranda:
     • PROGRAM YAZ — takvimin kendi seans düzenleyicisiyle (`SessEd`, 260): bloklar, fazlar,
       hareket paterni tablosu, antrenman özellikleri. Program bir tarihe bağlı değildir.
     • ŞABLON OLARAK SAKLA — programın kopyası, antrenman türüyle (Kuvvet, Güç, Kondisyon…)
       etiketlenir; şablon listesi türe göre süzülür. Şablondan tek tıkla yeni program açılır.
     • KOPYALA / ATA — program çoğaltılır ya da panoya (takvimin yapıştır düğmesi) kopyalanır;
       "Sporculara Ata" sekme değiştirmeden seçilen sporcuların kişisel takvimine, seçilen
       günlere (isteğe bağlı haftalık tekrarla) birer bağımsız seans olarak yazar. Son atama
       birkaç saniye içinde geri alınabilir.

   VERİ: `data.templates` — çalışma alanının belge-belge senkronlanan koleksiyonu (468,
   SM_WS_COLS). Her kayıt bir belge: {id, kind:'prog'|'tpl', type, name, note, created_at,
   updated_at, asg:[{at,dates,aths}], session:{…takvim seansı, id:'tpl_…', blocks:[…]}}.
   `kind`'ı olmayan eski kayıtlar (eski seans şablonları) şablon sayılır. Seansın kimliği
   `tpl_` ile başlar: SessEd onu şablon kipinde açar (saat, seans türü, sporcu seçici ve
   otomatik profil kaydı yok). Sporcuya atanan kopya `sessionFromClipboard` (060) ile yeni
   kimlikler alır ve `progId` ile programına bağlı kalır.
   ========================================================= */
const PG_TYPES=[
  {id:'strength',    tr:'Kuvvet',             en:'Strength',          c:'#3aa0e6'},
  {id:'power',       tr:'Güç & Patlayıcılık', en:'Power',             c:'#f97316'},
  {id:'hypertrophy', tr:'Hipertrofi',         en:'Hypertrophy',       c:'#a78bfa'},
  {id:'speed',       tr:'Hız & Çeviklik',     en:'Speed & Agility',   c:'#eab308'},
  {id:'conditioning',tr:'Kondisyon',          en:'Conditioning',      c:'#ef4444'},
  {id:'mobility',    tr:'Mobilite',           en:'Mobility',          c:'#14b8a6'},
  {id:'prevention',  tr:'Sakatlık Önleme',    en:'Injury Prevention', c:'#22c55e'},
  {id:'rehab',       tr:'Rehabilitasyon',     en:'Rehab',             c:'#ec4899'},
  {id:'recovery',    tr:'Toparlanma',         en:'Recovery',          c:'#06b6d4'},
  {id:'other',       tr:'Diğer',              en:'Other',             c:'#8b93a1'},
];
const PG_TYPE_BY=Object.fromEntries(PG_TYPES.map(t=>[t.id,t]));
const pgTypeLbl=id=>{const t=PG_TYPE_BY[id];return t?L(t.tr,t.en):L('Türsüz','Untyped');};
const pgTypeCol=id=>(PG_TYPE_BY[id]||{c:'#8b93a1'}).c;
const pgIsTpl=p=>!p||p.kind!=='prog';
const pgNow=()=>new Date().toISOString();
const pgJson=o=>o==null?o:JSON.parse(JSON.stringify(o));
const pgName=p=>String((p&&p.name)||(p&&p.session&&p.session.name)||'').trim();

/* Programın seansı, düzenleyicinin okuyacağı biçimde: kimlik `tpl_` ile başlar, blok listesi var. */
function pgSession(p){
  const s=(p&&p.session&&typeof p.session==='object')?p.session:{};
  const id=String(s.id||'').startsWith('tpl_')?s.id:'tpl_'+((p&&p.id)||uid());
  return{...SESS({name:pgName(p)}),...s,id,name:s.name||pgName(p),blocks:Array.isArray(s.blocks)?s.blocks:[]};
}
/* Kart ve özet şeridi için sayılar: blok, adı yazılmış egzersiz, toplam set, süre. */
function pgStats(p){
  const bl=(p&&p.session&&Array.isArray(p.session.blocks))?p.session.blocks:[];
  let ex=0,sets=0;const names=[];
  bl.forEach(b=>(b.exercises||[]).forEach(e=>{
    const n=String(e&&e.name||'').trim();if(!n)return;
    ex++;names.push(n);
    const s=parseFloat(String(e.sets||'').replace(',','.'));if(isFinite(s)&&s>0)sets+=s;
  }));
  return{blocks:bl.length,ex,sets:Math.round(sets),names,dur:Number(p&&p.session&&p.session.duration)||0};
}
function pgNew(kind,type,name){
  const id=uid(),now=pgNow(),nm=String(name||'');
  const s=SESS({name:nm});
  return{id,kind,type:type||'',name:nm,note:'',created_at:now,updated_at:now,asg:[],
    session:{...s,id:'tpl_'+id,name:nm,blocks:[BLK(nm,'sc')]}};
}
/* Bağımsız kopya: yeni kimlikler (program, seans, bloklar), atama geçmişi taşınmaz. */
function pgClone(p,over){
  const id=uid(),now=pgNow();
  const s=pgJson(pgSession(p));
  const c={...pgJson(p),id,created_at:now,updated_at:now,asg:[],...(over||{})};
  return{...c,session:{...s,id:'tpl_'+id,name:c.name||s.name||'',
    blocks:(s.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))}};
}
/* Haftalık tekrarla açılmış, sıralı ve tekrarsız tarih listesi. */
function pgExpandDates(dates,weeks){
  const out=new Set();
  (dates||[]).forEach(d=>{if(!d)return;for(let w=0;w<Math.max(1,weeks||1);w++)out.add(fmt(addD(parseD(d),7*w)));});
  return[...out].sort();
}
/* Sporcu takvimine yazılacak seanslar, önceden kurulur: güncelleyici iki kez çalışsa da
   aynı kimlikler yazılır (geri alma bu kimliklerle yapılır). */
function pgPlan(prog,athIds,dates,time){
  const base=pgSession(prog);
  const nm=pgName(prog)||L('Program','Programme');
  const plan={};const ids=[];
  athIds.forEach(aid=>{plan[aid]={};dates.forEach(dk=>{
    const s=sessionFromClipboard(base);
    const ses={...s,name:nm,time:time||base.time||'17:00',progId:prog.id};
    plan[aid][dk]=ses;ids.push(ses.id);
  });});
  return{plan,ids};
}
function pgApplyPlan(athletes,plan){
  return(athletes||[]).map(a=>{
    const mine=plan[a.id];if(!mine)return a;
    const days={...(a.days||{})};
    Object.keys(mine).forEach(dk=>{
      const d=days[dk]||EDAY(dk);
      if((d.sessions||[]).some(s=>s&&s.id===mine[dk].id))return;
      days[dk]={...d,date:dk,sessions:[...(d.sessions||[]),mine[dk]]};
    });
    return{...a,days};
  });
}
function pgUndoPlan(athletes,ids,dates){
  const gone=new Set(ids);
  return(athletes||[]).map(a=>{
    if(!a.days)return a;
    let ch=false;const days={...a.days};
    dates.forEach(dk=>{const d=days[dk];if(!d||!d.sessions)return;
      const ss=d.sessions.filter(s=>!(s&&gone.has(s.id)));
      if(ss.length!==d.sessions.length){days[dk]={...d,sessions:ss};ch=true;}});
    return ch?{...a,days}:a;
  });
}
const pgAgo=iso=>{
  if(!iso)return'';
  const t=Date.parse(iso);if(!isFinite(t))return'';
  const m=Math.round((Date.now()-t)/60000);
  if(m<1)return L('az önce','just now');
  if(m<60)return L(`${m} dk önce`,`${m} min ago`);
  const h=Math.round(m/60);if(h<24)return L(`${h} sa önce`,`${h} h ago`);
  const d=Math.round(h/24);if(d<8)return L(`${d} gün önce`,`${d} d ago`);
  return fd(iso.slice(0,10));
};

/* ---- Simgeler (çizgi, currentColor) ---------------------------------------------- */
const PgIc=({d,size=15})=><svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const PG_IC={
  plus:<><path d="M12 5v14"/><path d="M5 12h14"/></>,
  send:<><path d="M4 12h12"/><path d="M12 6l6 6-6 6"/><path d="M20 5v14"/></>,
  copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></>,
  clip:<><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6"/><path d="M9 16h4"/></>,
  tpl:<><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M8 13h8"/><path d="M8 17h5"/></>,
  print:<><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v6H7z"/></>,
  trash:<><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>,
  search:<><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></>,
  cal:<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M9 3v4"/><path d="M15 3v4"/></>,
  users:<><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.3.2 3.9 1.8 4.5 4.8"/></>,
  check:<><path d="M5 12.5l4.5 4.5L19 7.5"/></>,
  x:<><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
  bolt:<><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/></>,
};

/* ---- Liste kartı ---------------------------------------------------------------- */
function PgCard({p,active,onOpen,onAssign,onDup}){
  const st=pgStats(p);
  const first=st.names.slice(0,3).join(' · ');
  return(<div className={'pg-card'+(active?' on':'')} style={{'--tc':pgTypeCol(p.type)}}>
    <button type="button" className="pg-card-b" onClick={onOpen} aria-pressed={active}>
      <span className="pg-card-top">
        <span className="pg-tdot" aria-hidden="true"/>
        <span className="pg-card-t">{pgTypeLbl(p.type)}</span>
        <span className="pg-card-ago">{pgAgo(p.updated_at||p.created_at)}</span>
      </span>
      <span className="pg-card-n">{pgName(p)||L('Adsız program','Untitled programme')}</span>
      <span className="pg-card-x">{first||L('Henüz egzersiz yok','No exercises yet')}{st.names.length>3?` +${st.names.length-3}`:''}</span>
      <span className="pg-card-m">
        <span><b>{st.blocks}</b> {L('blok','block'+(st.blocks===1?'':'s'))}</span>
        <span><b>{st.ex}</b> {L('egz.','ex.')}</span>
        {st.sets>0&&<span><b>{st.sets}</b> set</span>}
        {(p.asg||[]).length>0&&<span className="pg-card-asg" title={L('Bu programın yapılan atamaları','Times this programme was assigned')}>
          <PgIc d={PG_IC.send} size={11}/>{(p.asg||[]).length}</span>}
      </span>
    </button>
    <span className="pg-card-acts">
      <button type="button" className="pg-ib" onClick={onDup} title={L('Çoğalt','Duplicate')} aria-label={L('Çoğalt','Duplicate')}><PgIc d={PG_IC.copy} size={14}/></button>
      <button type="button" className="pg-ib pri" onClick={onAssign} title={L('Sporculara ata','Assign to athletes')} aria-label={L('Sporculara ata','Assign to athletes')}><PgIc d={PG_IC.send} size={14}/></button>
    </span>
  </div>);
}

/* ---- Tür seçici (çip satırı) ------------------------------------------------------ */
function PgTypePick({value,onChange,allowNone}){
  return(<div className="pg-types" role="radiogroup" aria-label={L('Antrenman türü','Training type')}>
    {allowNone&&<button type="button" role="radio" aria-checked={!value} className={'pg-tc'+(!value?' on':'')}
      style={{'--tc':'#8b93a1'}} onClick={()=>onChange('')}>{L('Türsüz','Untyped')}</button>}
    {PG_TYPES.map(t=><button key={t.id} type="button" role="radio" aria-checked={value===t.id}
      className={'pg-tc'+(value===t.id?' on':'')} style={{'--tc':t.c}} onClick={()=>onChange(t.id)}>
      <i aria-hidden="true"/>{L(t.tr,t.en)}</button>)}
  </div>);
}

/* ---- Şablon olarak kaydet penceresi -------------------------------------------------- */
function PgSaveTpl({prog,onClose,onSave}){
  const[name,setName]=useState(pgName(prog));
  const[type,setType]=useState(prog.type||'');
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[]);
  const ok=String(name).trim()&&type;
  return ReactDOM.createPortal(<div className="pg-scrim" onClick={onClose}>
    <div className="pg-dlg" role="dialog" aria-modal="true" aria-label={L('Şablon olarak kaydet','Save as template')} onClick={e=>e.stopPropagation()}>
      <div className="pg-dlg-h">
        <span className="pg-dlg-ic"><PgIc d={PG_IC.tpl} size={18}/></span>
        <div><b>{L('Şablon olarak kaydet','Save as template')}</b>
          <em>{L('Programın bir kopyası şablon kütüphanesine, seçtiğin türün altına girer.','A copy of the programme goes into the template library, under the type you pick.')}</em></div>
        <button type="button" className="pg-ib" onClick={onClose} aria-label={L('Kapat','Close')}><PgIc d={PG_IC.x}/></button>
      </div>
      <label className="pg-fl"><span>{L('Şablon adı','Template name')}</span>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder={L('Örn. Alt vücut kuvvet A','e.g. Lower body strength A')}
          onKeyDown={e=>{if(e.key==='Enter'&&ok)onSave(String(name).trim(),type);}}/></label>
      <div className="pg-fl"><span>{L('Antrenman türü','Training type')}</span>
        <PgTypePick value={type} onChange={setType}/></div>
      <div className="pg-dlg-f">
        <button type="button" className="btn sec sm" onClick={onClose}>{L('Vazgeç','Cancel')}</button>
        <button type="button" className="btn sm" disabled={!ok} onClick={()=>onSave(String(name).trim(),type)}>{L('Şablonu kaydet','Save template')}</button>
      </div>
    </div>
  </div>,document.body);
}

/* ---- Sporculara ata paneli ----------------------------------------------------------
   Sekmeden çıkmadan: iki haftalık gün şeridi (+ başka tarih), haftalık tekrar, saat, sporcu
   ızgarası (arama, pozisyona göre toplu seçim, o günlerde zaten seansı olanlar işaretli). */
function PgAssign({prog,athletes,onClose,onAssign}){
  const todayK=fmt(new Date());
  const[dates,setDates]=useState([todayK]);
  const[weeks,setWeeks]=useState(1);
  const[time,setTime]=useState((prog.session&&prog.session.time)||'17:00');
  const[sel,setSel]=useState([]);
  const[q,setQ]=useState('');
  const[other,setOther]=useState('');
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',k);return()=>document.removeEventListener('keydown',k);},[]);
  /* Bu haftanın pazartesisinden başlayan 14 gün. */
  const strip=useMemo(()=>{const n=new Date();const mon=addD(n,-((n.getDay()+6)%7));
    return Array.from({length:14},(_,i)=>{const d=addD(mon,i);return{k:fmt(d),dn:(d.getDay()+6)%7,n:d.getDate(),m:d.getMonth()};});},[]);
  const togDate=k=>setDates(ds=>ds.includes(k)?ds.filter(x=>x!==k):[...ds,k].sort());
  const allDates=useMemo(()=>pgExpandDates(dates,weeks),[dates,weeks]);
  const extra=dates.filter(k=>!strip.some(s=>s.k===k));
  const list=athletes||[];
  const qn=phNorm(q);
  const shown=list.filter(a=>!qn||phNorm([a.name,a.position,a.number].join(' ')).includes(qn));
  const selSet=new Set(sel);
  const positions=useMemo(()=>{const m=new Map();list.forEach(a=>{const p=String(a.position||'').trim();if(p)m.set(p,(m.get(p)||[]).concat(a.id));});
    return[...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],'tr'));},[list]);
  const busy=a=>allDates.reduce((n,dk)=>n+(((a.days||{})[dk]||{}).sessions||[]).length,0);
  const tog=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const addMany=ids=>setSel(s=>{const allOn=ids.every(i=>s.includes(i));return allOn?s.filter(x=>!ids.includes(x)):[...new Set([...s,...ids])];});
  const total=sel.length*allDates.length;
  const st=pgStats(prog);
  const MN_S=L('Oca Şub Mar Nis May Haz Tem Ağu Eyl Eki Kas Ara','Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec').split(' ');
  return ReactDOM.createPortal(<div className="pg-scrim pg-scrim-r" onClick={onClose}>
    <aside className="pg-asg" role="dialog" aria-modal="true" aria-label={L('Sporculara ata','Assign to athletes')} onClick={e=>e.stopPropagation()}
      style={{'--tc':pgTypeCol(prog.type)}}>
      <div className="pg-asg-h">
        <div className="pg-asg-ht">
          <span className="pg-asg-k">{L('Takvime ata','Assign to calendar')}</span>
          <b>{pgName(prog)||L('Adsız program','Untitled programme')}</b>
          <em><span className="pg-tdot" aria-hidden="true"/>{pgTypeLbl(prog.type)} · {st.blocks} {L('blok','block(s)')} · {st.ex} {L('egzersiz','exercise(s)')}</em>
        </div>
        <button type="button" className="pg-ib" onClick={onClose} aria-label={L('Kapat','Close')}><PgIc d={PG_IC.x}/></button>
      </div>
      <div className="pg-asg-b">
        <section className="pg-step">
          <div className="pg-step-h"><span className="pg-step-n">1</span><b>{L('Günler','Days')}</b>
            <em>{L('Birden fazla gün seçebilirsin','Pick as many days as you like')}</em></div>
          <div className="pg-strip">
            {strip.map((d,i)=>{const on=dates.includes(d.k);
              return<button key={d.k} type="button" aria-pressed={on}
                className={'pg-day'+(on?' on':'')+(d.k===todayK?' today':'')+(d.k<todayK?' past':'')+(i===7?' wk2':'')}
                onClick={()=>togDate(d.k)} title={fdLong(d.k)}>
                <span className="pg-day-dn">{dnL(d.dn)}</span><span className="pg-day-n">{d.n}</span>
                <span className="pg-day-m">{MN_S[d.m]}</span></button>;})}
          </div>
          <div className="pg-dates-x">
            {extra.map(k=><span key={k} className="pg-chip">{fd(k)}<button type="button" onClick={()=>togDate(k)} aria-label={L('Kaldır','Remove')}>×</button></span>)}
            <span className="pg-other">
              <DateDMY value={other} onChange={v=>{setOther(v);if(v&&!dates.includes(v))setDates(ds=>[...ds,v].sort());}} title={L('Başka bir tarih ekle','Add another date')}/>
            </span>
          </div>
          <div className="pg-row2">
            <label className="pg-fl sm"><span>{L('Haftalık tekrar','Repeat weekly')}</span>
              <select value={weeks} onChange={e=>setWeeks(Number(e.target.value)||1)}>
                {[1,2,3,4,5,6,8,10,12].map(n=><option key={n} value={n}>{n===1?L('Tekrar yok','No repeat'):L(`${n} hafta`,`${n} weeks`)}</option>)}
              </select></label>
            <label className="pg-fl sm"><span>{L('Saat','Time')}</span>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
          </div>
          {allDates.length>0&&<div className="pg-sumdates">
            <PgIc d={PG_IC.cal} size={13}/>
            <span>{allDates.length>6
              ?L(`${allDates.length} gün · ${fd(allDates[0])} → ${fd(allDates[allDates.length-1])}`,`${allDates.length} days · ${fd(allDates[0])} → ${fd(allDates[allDates.length-1])}`)
              :allDates.map(fd).join(' · ')}</span></div>}
        </section>
        <section className="pg-step">
          <div className="pg-step-h"><span className="pg-step-n">2</span><b>{L('Sporcular','Athletes')}</b>
            <em>{sel.length} / {list.length}</em>
            <span className="pg-step-acts">
              <button type="button" className="btn xs sec" onClick={()=>setSel(list.map(a=>a.id))}>{L('Tümü','All')}</button>
              <button type="button" className="btn xs sec" onClick={()=>setSel([])} disabled={!sel.length}>{L('Temizle','Clear')}</button>
            </span></div>
          {list.length===0?<div className="empty-st">{L('Kadroda sporcu yok — Kadro sekmesinden ekle.','No athletes on the roster — add them in the Roster tab.')}</div>:<>
            <div className="pg-search sm"><PgIc d={PG_IC.search} size={14}/>
              <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={L('Sporcu ara…','Search athletes…')} aria-label={L('Sporcu ara','Search athletes')}/></div>
            {positions.length>1&&<div className="pg-pos">
              {positions.map(([p,ids])=>{const on=ids.every(i=>selSet.has(i));
                return<button key={p} type="button" className={'pg-posb'+(on?' on':'')} onClick={()=>addMany(ids)}
                  title={L(`${p} pozisyonundakilerin hepsini seç / bırak`,`Select / clear everyone playing ${p}`)}>{p}<i>{ids.length}</i></button>;})}
            </div>}
            <div className="pg-aths">
              {shown.map(a=>{const on=selSet.has(a.id);const b=busy(a);
                return<button key={a.id} type="button" className={'pg-ath'+(on?' on':'')} aria-pressed={on} onClick={()=>tog(a.id)}>
                  <span className="pg-ath-av">{hasMedia(a.photo)?<img src={mediaSrc(a.photo)} alt="" loading="lazy"/>:skInit(a.name)}</span>
                  <span className="pg-ath-t"><span className="pg-ath-n">{a.name||L('(adsız)','(unnamed)')}</span>
                    <span className="pg-ath-s">{[a.number?`#${a.number}`:'',a.position||''].filter(Boolean).join(' · ')||' '}</span></span>
                  {b>0&&<span className="pg-ath-busy" title={L('Seçili günlerde takviminde zaten bu kadar seans var; yeni seans yanına eklenir','Sessions already on their calendar on the chosen days; the new one is added alongside')}>{b}</span>}
                  <span className="pg-ath-ck" aria-hidden="true"><PgIc d={PG_IC.check} size={12}/></span>
                </button>;})}
              {shown.length===0&&<div className="pg-none">{L('Aramaya uyan sporcu yok.','No athlete matches.')}</div>}
            </div>
          </>}
        </section>
      </div>
      <div className="pg-asg-f">
        <div className="pg-asg-tot">
          <b>{total}</b>
          <span>{total?L(`seans · ${sel.length} sporcu × ${allDates.length} gün`,`session${total===1?'':'s'} · ${sel.length} athlete${sel.length===1?'':'s'} × ${allDates.length} day${allDates.length===1?'':'s'}`)
            :L('Gün ve sporcu seç','Pick days and athletes')}</span>
        </div>
        <button type="button" className="btn sec sm" onClick={onClose}>{L('Vazgeç','Cancel')}</button>
        <button type="button" className="btn pg-go" disabled={!total} onClick={()=>onAssign(sel,allDates,time)}>
          <PgIc d={PG_IC.send}/>{L('Takvimlere yaz','Write to calendars')}</button>
      </div>
    </aside>
  </div>,document.body);
}

/* ---- Sekme ---------------------------------------------------------------------- */
function ProgramsView({data,setData,team,updateTeam}){
  const all=useMemo(()=>(Array.isArray(data.templates)?data.templates:[]).filter(p=>p&&p.id),[data.templates]);
  const progs=useMemo(()=>all.filter(p=>!pgIsTpl(p)).sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))),[all]);
  const tpls=useMemo(()=>all.filter(pgIsTpl).sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''))),[all]);
  const[tab,setTab]=useState(()=>progs.length||!tpls.length?'prog':'tpl');
  const[q,setQ]=useState('');
  const[ft,setFt]=useState('');
  const[selId,setSelId]=useState(()=>(progs[0]||tpls[0]||{}).id||null);
  const[asgId,setAsgId]=useState(null);
  const[tplOpen,setTplOpen]=useState(false);
  const[toast,setToast]=useState(null);
  const toastT=useRef(null);
  const say=(msg,undo)=>{clearTimeout(toastT.current);setToast({msg,undo,k:Date.now()});toastT.current=setTimeout(()=>setToast(null),undo?9000:4000);};
  useEffect(()=>()=>clearTimeout(toastT.current),[]);

  const write=fn=>setData(prev=>({...prev,templates:fn(Array.isArray(prev.templates)?prev.templates:[])}));
  const patch=(id,upd)=>write(list=>list.map(p=>p&&p.id===id?{...p,...(typeof upd==='function'?upd(p):upd),updated_at:pgNow()}:p));
  /* Dar ekranda kütüphane düzenleyicinin üstünde durur: seçilen program açılınca ona kaydırılır. */
  const mainRef=useRef(null);
  const jumpRef=useRef(false);
  const open=id=>{setSelId(id);jumpRef.current=true;};
  useEffect(()=>{
    if(!jumpRef.current)return;jumpRef.current=false;
    const el=mainRef.current;
    if(el&&window.matchMedia&&window.matchMedia('(max-width:1100px)').matches)
      el.scrollIntoView({behavior:'smooth',block:'start'});
  },[selId]);
  const add=(p,go=true)=>{write(list=>[p,...list]);if(go){open(p.id);setTab(pgIsTpl(p)?'tpl':'prog');}};

  const sel=all.find(p=>p.id===selId)||null;
  const selSes=useMemo(()=>sel?pgSession(sel):null,[sel&&sel.session,sel&&sel.id]);
  const asgProg=asgId?all.find(p=>p.id===asgId):null;
  const athletes=(team&&team.athletes)||[];

  const listAll=tab==='prog'?progs:tpls;
  const typeCount=useMemo(()=>{const m={};listAll.forEach(p=>{const k=p.type||'';m[k]=(m[k]||0)+1;});return m;},[listAll]);
  const qn=phNorm(q).split(/\s+/).filter(Boolean);
  const shown=listAll.filter(p=>(!ft||(p.type||'')===(ft==='_none'?'':ft))&&
    (!qn.length||(()=>{const t=phNorm([pgName(p),pgTypeLbl(p.type),p.note||'',...pgStats(p).names].join(' '));return qn.every(x=>t.includes(x));})()));

  const newProg=(type)=>add(pgNew('prog',type||'',''));
  const fromTpl=t=>{const c=pgClone(t,{kind:'prog',name:pgName(t)});add(c);say(L(`"${pgName(t)}" şablonundan yeni program açıldı`,`New programme opened from "${pgName(t)}"`));};
  const dup=p=>{const c=pgClone(p,{name:`${pgName(p)||L('Program','Programme')} ${L('(kopya)','(copy)')}`});add(c);say(L('Program çoğaltıldı','Programme duplicated'));};
  const del=p=>{if(!confirm(L(`"${pgName(p)||'Adsız program'}" silinsin mi? Sporcuların takvimine daha önce yazılan kopyalar kalır.`,`Delete "${pgName(p)||'Untitled programme'}"? Copies already written to athletes' calendars stay.`)))return;
    write(list=>list.filter(x=>x&&x.id!==p.id));if(selId===p.id)setSelId(null);say(L('Silindi','Deleted'));};
  const saveAsTpl=(name,type)=>{const c=pgClone(sel,{kind:'tpl',name,type});write(list=>[c,...list]);setTplOpen(false);
    say(L(`Şablon kaydedildi · ${pgTypeLbl(type)}`,`Template saved · ${pgTypeLbl(type)}`));};
  const toClip=p=>{copySessionToClipboard({...pgSession(p),name:pgName(p)||L('Program','Programme')});
    say(L('Panoya kopyalandı — takvimde istediğin güne "Yapıştır" ile ekleyebilirsin','Copied — paste it onto any day in a calendar'));};
  const printIt=p=>printDayA4((team&&team.setup&&team.setup.teamName)||'',pgName(p),[{...pgSession(p),name:pgName(p)||L('Program','Programme')}]);
  const doAssign=(athIds,dates,time)=>{
    const prog=asgProg;if(!prog||!team)return;
    const{plan,ids}=pgPlan(prog,athIds,dates,time);
    updateTeam(team.id,t=>({athletes:pgApplyPlan(t.athletes,plan)}));
    const rec={at:pgNow(),dates,aths:athIds};
    write(list=>list.map(p=>p&&p.id===prog.id?{...p,asg:[rec,...(p.asg||[])].slice(0,12)}:p));
    setAsgId(null);
    const n=ids.length;
    say(L(`${n} seans ${athIds.length} sporcunun takvimine yazıldı`,`${n} session${n===1?'':'s'} written to ${athIds.length} athlete${athIds.length===1?'':'s'}' calendars`),
      ()=>{updateTeam(team.id,t=>({athletes:pgUndoPlan(t.athletes,ids,dates)}));
        write(list=>list.map(p=>p&&p.id===prog.id?{...p,asg:(p.asg||[]).filter(r=>r.at!==rec.at)}:p));
        say(L('Atama geri alındı','Assignment undone'));});
  };
  const athName=id=>{const a=athletes.find(x=>x.id===id);return a?a.name:'';};

  const st=sel?pgStats(sel):null;
  const isTpl=sel&&pgIsTpl(sel);
  return(<div className="pg">
    <PageHero title={L('Programlar','Programs')}
      sub={L('Program yaz, türüne göre şablon olarak sakla, sporcuların takvimine tek seferde ata.','Write programmes, keep them as templates by type, assign them to athletes’ calendars in one go.')}
      stats={[{v:progs.length,l:L('Program','Programmes')},{v:tpls.length,l:L('Şablon','Templates')},
        {v:all.reduce((n,p)=>n+(p.asg||[]).reduce((m,r)=>m+(r.aths||[]).length*(r.dates||[]).length,0),0),l:L('Atanan seans','Sessions assigned')}]}>
      <button type="button" className="btn pg-new" onClick={()=>newProg(ft&&ft!=='_none'?ft:'')}><PgIc d={PG_IC.plus}/>{L('Yeni Program','New Programme')}</button>
    </PageHero>
    <div className="pg-grid">
      {/* ---- Kütüphane ---- */}
      <aside className="pg-lib">
        <div className="pg-seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab==='prog'} className={tab==='prog'?'on':''} onClick={()=>{setTab('prog');setFt('');}}>
            {L('Programlarım','My Programmes')}<i>{progs.length}</i></button>
          <button type="button" role="tab" aria-selected={tab==='tpl'} className={tab==='tpl'?'on':''} onClick={()=>{setTab('tpl');setFt('');}}>
            {L('Şablonlar','Templates')}<i>{tpls.length}</i></button>
        </div>
        <div className="pg-search"><PgIc d={PG_IC.search} size={14}/>
          <input type="search" value={q} onChange={e=>setQ(e.target.value)} aria-label={L('Ara','Search')}
            placeholder={tab==='prog'?L('Program ya da egzersiz ara…','Search programmes or exercises…'):L('Şablon ya da egzersiz ara…','Search templates or exercises…')}/></div>
        {listAll.length>0&&<div className="pg-filt">
          <button type="button" className={'pg-fc'+(!ft?' on':'')} onClick={()=>setFt('')}>{L('Tümü','All')}<i>{listAll.length}</i></button>
          {PG_TYPES.filter(t=>typeCount[t.id]).map(t=><button key={t.id} type="button" className={'pg-fc'+(ft===t.id?' on':'')}
            style={{'--tc':t.c}} onClick={()=>setFt(ft===t.id?'':t.id)}><span className="pg-tdot" aria-hidden="true"/>{L(t.tr,t.en)}<i>{typeCount[t.id]}</i></button>)}
          {typeCount['']>0&&<button type="button" className={'pg-fc'+(ft==='_none'?' on':'')} onClick={()=>setFt(ft==='_none'?'':'_none')}>{L('Türsüz','Untyped')}<i>{typeCount['']}</i></button>}
        </div>}
        <div className="pg-list">
          {shown.map(p=><PgCard key={p.id} p={p} active={p.id===selId} onOpen={()=>open(p.id)}
            onAssign={()=>setAsgId(p.id)} onDup={()=>dup(p)}/>)}
          {listAll.length===0&&<div className="pg-lib-empty">
            <PgIc d={tab==='prog'?PG_IC.clip:PG_IC.tpl} size={22}/>
            <b>{tab==='prog'?L('Henüz program yok','No programmes yet'):L('Henüz şablon yok','No templates yet')}</b>
            <span>{tab==='prog'?L('"Yeni Program" ile başla ya da bir şablondan aç.','Start with "New Programme", or open one from a template.')
              :L('Bir programı açıp "Şablon olarak kaydet" de; türüne göre burada listelenir.','Open a programme and choose "Save as template"; it is listed here by type.')}</span>
            {tab==='prog'&&<button type="button" className="btn sm" onClick={()=>newProg('')}><PgIc d={PG_IC.plus} size={13}/>{L('Yeni Program','New Programme')}</button>}
          </div>}
          {listAll.length>0&&shown.length===0&&<div className="pg-none">{L('Bu süzgece uyan kayıt yok.','Nothing matches this filter.')}</div>}
        </div>
      </aside>

      {/* ---- Düzenleyici ---- */}
      <section className="pg-main" ref={mainRef}>
        {!sel?<div className="pg-start">
          <div className="pg-start-h">
            <b>{L('Bir programla başla','Start with a programme')}</b>
            <span>{L('Boş bir program aç ya da türüne göre kayıtlı bir şablondan kopyasını oluştur.','Open a blank programme, or make a copy of a saved template by type.')}</span>
          </div>
          <div className="pg-start-g">
            <button type="button" className="pg-blank" onClick={()=>newProg('')}>
              <span className="pg-blank-ic"><PgIc d={PG_IC.plus} size={22}/></span>
              <b>{L('Boş program','Blank programme')}</b><em>{L('Bloklar, fazlar, egzersizler','Blocks, phases, exercises')}</em></button>
            {tpls.slice(0,7).map(t=>{const s=pgStats(t);return<button key={t.id} type="button" className="pg-tplc" style={{'--tc':pgTypeCol(t.type)}} onClick={()=>fromTpl(t)}>
              <span className="pg-card-top"><span className="pg-tdot" aria-hidden="true"/><span className="pg-card-t">{pgTypeLbl(t.type)}</span></span>
              <b>{pgName(t)||L('Adsız şablon','Untitled template')}</b>
              <em>{s.ex} {L('egzersiz','exercises')} · {s.blocks} {L('blok','blocks')}</em>
              <span className="pg-tplc-go">{L('Bu şablondan başla','Start from this')} →</span></button>;})}
          </div>
        </div>
        :<div className="pg-ed" style={{'--tc':pgTypeCol(sel.type)}} key={sel.id}>
          <div className="pg-head">
            <div className="pg-head-top">
              <span className={'pg-kind'+(isTpl?' tpl':'')}>{isTpl?L('ŞABLON','TEMPLATE'):L('PROGRAM','PROGRAMME')}</span>
              <span className="pg-head-ago">{L('Güncellendi','Updated')} {pgAgo(sel.updated_at||sel.created_at)}</span>
              <span className="pg-head-sp"/>
              <button type="button" className="pg-ib danger" onClick={()=>del(sel)} title={L('Sil','Delete')} aria-label={L('Sil','Delete')}><PgIc d={PG_IC.trash}/></button>
            </div>
            <LiveInput className="pg-name" value={sel.name||''} placeholder={isTpl?L('Şablonun adı','Template name'):L('Programın adı — örn. Alt Vücut Kuvvet A','Programme name — e.g. Lower Body Strength A')}
              onChange={v=>patch(sel.id,p=>({name:v,session:{...pgSession(p),name:String(v||'').trim()}}))} aria-label={L('Ad','Name')}/>
            <PgTypePick value={sel.type||''} allowNone onChange={v=>patch(sel.id,{type:v})}/>
            <LiveTextarea className="pg-note" value={sel.note||''} rows={1}
              placeholder={L('Kısa not: hedef, sezon dönemi, kime uygun…','Short note: aim, season phase, who it suits…')}
              onChange={v=>patch(sel.id,{note:v})}/>
            <div className="pg-bar">
              <button type="button" className="btn pg-go" onClick={()=>setAsgId(sel.id)}><PgIc d={PG_IC.users}/>{L('Sporculara Ata','Assign to Athletes')}</button>
              {isTpl
                ?<button type="button" className="btn sec sm" onClick={()=>fromTpl(sel)}><PgIc d={PG_IC.bolt} size={14}/>{L('Bu şablondan program aç','New programme from this')}</button>
                :<button type="button" className="btn sec sm" onClick={()=>setTplOpen(true)}><PgIc d={PG_IC.tpl} size={14}/>{L('Şablon olarak kaydet','Save as template')}</button>}
              <button type="button" className="btn sec sm" onClick={()=>dup(sel)}><PgIc d={PG_IC.copy} size={14}/>{L('Çoğalt','Duplicate')}</button>
              <button type="button" className="btn sec sm" onClick={()=>toClip(sel)} title={L('Takvimin yapıştır düğmesiyle istediğin güne eklemek için','To paste onto any day with the calendar’s paste button')}>
                <PgIc d={PG_IC.clip} size={14}/>{L('Panoya kopyala','Copy')}</button>
              <button type="button" className="btn sec sm" onClick={()=>printIt(sel)}><PgIc d={PG_IC.print} size={14}/>{L('Yazdır','Print')}</button>
            </div>
          </div>
          <div className="pg-stats">
            <div><b>{st.blocks}</b><span>{L('Blok','Blocks')}</span></div>
            <div><b>{st.ex}</b><span>{L('Egzersiz','Exercises')}</span></div>
            <div><b>{st.sets||'—'}</b><span>{L('Toplam set','Total sets')}</span></div>
            <div><b>{st.dur?st.dur:'—'}</b><span>{L('Süre (dk)','Duration (min)')}</span></div>
            <div className="pg-stats-asg">{(sel.asg||[]).length
              ?<><b>{(sel.asg||[]).reduce((m,r)=>m+(r.aths||[]).length*(r.dates||[]).length,0)}</b>
                <span title={(sel.asg||[]).slice(0,6).map(r=>`${fd(String(r.at).slice(0,10))}: ${(r.aths||[]).map(athName).filter(Boolean).join(', ')} → ${(r.dates||[]).map(fd).join(', ')}`).join('\n')}>
                  {L('Atanan seans','Assigned')} · {L('son','last')} {pgAgo(sel.asg[0].at)}</span></>
              :<><b>0</b><span>{L('Henüz atanmadı','Not assigned yet')}</span></>}</div>
          </div>
          <div className="pg-editor">
            <SessEd session={selSes} index={0} total={1}
              onUpdate={ns=>patch(sel.id,{session:ns})}
              onRemove={()=>patch(sel.id,p=>({session:{...pgSession(p),blocks:[]}}))}
              onDuplicate={()=>dup(sel)} onMove={()=>{}}
              printContext={{title:(team&&team.setup&&team.setup.teamName)||'',subtitle:pgName(sel)}}/>
          </div>
        </div>}
      </section>
    </div>
    {tplOpen&&sel&&<PgSaveTpl prog={sel} onClose={()=>setTplOpen(false)} onSave={saveAsTpl}/>}
    {asgProg&&<PgAssign prog={asgProg} athletes={athletes} onClose={()=>setAsgId(null)} onAssign={doAssign}/>}
    {toast&&ReactDOM.createPortal(<div className="pg-toast" key={toast.k} role="status">
      <PgIc d={PG_IC.check}/><span>{toast.msg}</span>
      {toast.undo&&<button type="button" onClick={()=>{const u=toast.undo;setToast(null);u();}}>{L('Geri al','Undo')}</button>}
      <button type="button" className="pg-toast-x" onClick={()=>setToast(null)} aria-label={L('Kapat','Close')}><PgIc d={PG_IC.x} size={13}/></button>
    </div>,document.body)}
  </div>);
}
