/* ---- PROGRAM GEÇMİŞİ ---------------------------------------------------------------
   Bireyselleştirmede yazılan her program (tablodan "Programı Kaydet", AI taslağı ya da
   dış kaynak) `team.indiv.ai[tarih|kaynak|sporcu]` altında bir "review" olarak durur.
   Geçmiş sekmesi bu kayıtları aranabilir bir liste yapar; yeni bir veri alanı açmaz.

   Şablon kütüphanesi ayrı: `team.indiv.lib[id]`. Geçmişten "Şablon olarak sakla" bir
   programın (ve hareket paterni tablosunun) kopyasını burada tutar; geçmiş kaydı silinse
   ya da eski taslaklar budansa da şablon durur.

   Kopyalama bir TASLAK yazar (karar: bekliyor): hedef sporcunun takvimine kendiliğinden
   hiçbir şey gitmez. Taslak o günün kartında canlı doğrulanır, koç "Onayla ve takvime yaz"
   demeden uygulanmaz — kopyanın kuralı da elle yazılan programınki ile aynı. */
const phNorm=s=>String(s==null?'':s).toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const phClone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const phExercises=prog=>((prog&&prog.blocks)||[]).flatMap(b=>(b.exercises||[]).map(x=>({...x,block:b.name||''})));
/* Anahtar: `${tarih}|${kaynak}|${sporcu}` — kaynak anahtarı `|` içermez. */
function phParseKey(key){
  const p=String(key).split('|');
  return{date:p[0]||'',athId:p[p.length-1]||'',srcKey:p.slice(1,-1).join('|')};
}
/* Geçmiş satırları: programı olan her review. En yeni üstte. */
function phEntries(team){
  const ai=(team&&team.indiv&&team.indiv.ai)||{};
  const aths={};((team&&team.athletes)||[]).forEach(a=>{aths[a.id]=a;});
  const out=[];
  Object.entries(ai).forEach(([key,e])=>{
    if(!e||!e.program||!Array.isArray(e.program.blocks))return;
    const k=phParseKey(key);
    const athId=e.athlete||k.athId,date=e.date||k.date;
    const ex=phExercises(e.program);
    if(!ex.length)return;
    const ath=aths[athId];
    const status=e.decision==='accept'?'approved':'draft';
    const row={kind:'hist',key,date,athId,athName:ath?ath.name:(L('(kadrodan çıkmış)','(left the squad)')),srcKey:e.src||k.srcKey,
      name:e.program.session_name||'',program:e.program,instr:e.instr||null,status,model:e.model||'',
      at:e.decided_at||e.updated_at||e.created_at||'',ex};
    row.text=phNorm([row.name,row.athName,date,...ex.map(x=>x.name),...ex.map(x=>x.coachPattern||x.exPattern||''),
      ...ex.map(x=>x.why||''),...(e.program.blocks||[]).map(b=>b.name)].join(' '));
    out.push(row);
  });
  return out.sort((a,b)=>(b.date.localeCompare(a.date))||String(b.at).localeCompare(String(a.at)));
}
function phTemplates(team){
  const lib=(team&&team.indiv&&team.indiv.lib)||{};
  return Object.values(lib).filter(t=>t&&t.program).map(t=>{
    const ex=phExercises(t.program);
    return{kind:'tpl',key:t.id,id:t.id,name:t.name||'',tags:t.tags||[],program:t.program,instr:t.instr||null,
      fromAth:t.fromAthlete||'',fromDate:t.fromDate||'',at:t.created_at||'',ex,
      text:phNorm([t.name,...(t.tags||[]),...ex.map(x=>x.name),...ex.map(x=>x.coachPattern||x.exPattern||'')].join(' '))};
  }).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
/* Filtre: saf işlev. q boşluklarla bölünür, HEPSİ geçmeli (ve). */
function phFilter(rows,f){
  const terms=phNorm(f.q).split(/\s+/).filter(Boolean);
  return rows.filter(r=>{
    if(terms.length&&!terms.every(t=>r.text.includes(t)))return false;
    if(r.kind==='hist'){
      if(f.ath&&r.athId!==f.ath)return false;
      if(f.status&&r.status!==f.status)return false;
      if(f.from&&r.date<f.from)return false;
      if(f.to&&r.date>f.to)return false;
    }
    return true;
  });
}
const phLine=x=>{
  const sr=[x.sets&&x.reps?`${x.sets}×${x.reps}`:(x.sets?`${x.sets} set`:(x.reps||'')),x.duration||'',x.load||'',x.rpe?`RPE ${x.rpe}`:'',x.tempo||'',x.rest?`${L('din.','rest')} ${x.rest}`:''].filter(Boolean).join(' · ');
  return sr;
};

function ProgramView({prog}){
  return(<div className="ph-prog">
    {(prog.blocks||[]).map((b,bi)=><div key={bi} className="ph-blk">
      {b.name&&<div className="ph-blk-h">{b.name}</div>}
      {(b.exercises||[]).map((x,i)=><div key={i} className="ph-ex">
        <span className="ph-ex-n">{x.superset?x.superset+' ':''}{x.name}</span>
        <span className="ph-ex-p">{x.coachPattern||x.exPattern||''}</span>
        <span className="ph-ex-d">{phLine(x)}</span>
      </div>)}
    </div>)}
  </div>);
}

function ProgramHistory({team,updateTeam}){
  const[scope,setScope]=useState('hist');
  const[f,setF]=useState({q:'',ath:'',status:'',from:'',to:''});
  const[open,setOpen]=useState(null);
  const[limit,setLimit]=useState(30);
  const[tplName,setTplName]=useState('');
  const[tplFor,setTplFor]=useState(null);       // şablon adı soran satırın anahtarı
  const[copyFor,setCopyFor]=useState(null);     // kopyalama panelinin açık olduğu satırın anahtarı
  const[cp,setCp]=useState({date:fmt(today),srcKey:'',ids:[]});
  const[msg,setMsg]=useState('');
  const hist=useMemo(()=>phEntries(team),[team.indiv,team.athletes]);
  const tpls=useMemo(()=>phTemplates(team),[team.indiv]);
  const rows=useMemo(()=>phFilter(scope==='hist'?hist:tpls,f),[scope,hist,tpls,f]);
  const athletes=team.athletes||[];
  const set=(k,v)=>{setF(o=>({...o,[k]:v}));setLimit(30);};
  const store=team.indiv||{};
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(''),5000);};

  const saveTemplate=r=>{
    const name=tplName.trim()||r.name||L('Şablon','Template');
    const id=uid();
    const lib={...(store.lib||{}),[id]:{id,name,tags:[],program:phClone({...r.program,session_name:name}),instr:phClone(r.instr),
      fromAthlete:r.athName||'',fromDate:r.date||'',created_at:new Date().toISOString()}};
    updateTeam(team.id,{indiv:{...store,lib}});
    setTplFor(null);setTplName('');
    flash(L(`"${name}" şablon olarak saklandı.`,`"${name}" saved as a template.`));
  };
  const delTemplate=r=>{
    if(!confirm(L('Bu şablon silinsin mi?','Delete this template?')))return;
    const lib={...(store.lib||{})};delete lib[r.id];
    updateTeam(team.id,{indiv:{...store,lib}});setOpen(null);
  };
  const renameTemplate=r=>{
    const n=prompt(L('Şablon adı','Template name'),r.name);
    if(n==null||!n.trim())return;
    const lib={...(store.lib||{}),[r.id]:{...(store.lib||{})[r.id],name:n.trim()}};
    updateTeam(team.id,{indiv:{...store,lib}});
  };
  const delDraft=r=>{
    if(r.status==='approved')return;
    if(!confirm(L('Bu taslak geçmişten silinsin mi?','Delete this draft from the history?')))return;
    diWriteReview(team,updateTeam,r.srcKey,r.athId,r.date,null);setOpen(null);
  };
  /* Hedef gün: takvimde o güne ait takım seansları kaynak olabilir (kart oradan okunur). */
  const daySes=d=>(((team.days||{})[d]||{}).sessions)||[];
  const openCopy=r=>{
    const d=fmt(today);const ss=daySes(d);
    setCp({date:d,srcKey:ss[0]?`team:${d}:${ss[0].id}`:'',ids:[]});
    setCopyFor(copyFor===r.key?null:r.key);
  };
  const doCopy=r=>{
    if(!cp.srcKey||!cp.ids.length)return;
    const patches={};let skipped=0;
    cp.ids.forEach(id=>{
      const ex=diReadReview(team,cp.srcKey,id,cp.date);
      if(ex&&ex.program){skipped++;return;}                 // o gün/kaynakta zaten programı var: ezme
      patches[id]={athlete:id,date:cp.date,src:cp.srcKey,program:phClone(r.program),instr:phClone(r.instr)||undefined,
        model:r.model==='external'?'external':'manual',created_at:new Date().toISOString(),decision:null,decided_at:null,
        jobId:null,pendingJob:null,generation:{source:'copy',from:{date:r.date||null,athlete:r.athName||null,template:r.kind==='tpl'?r.name:null}}};
    });
    const n=Object.keys(patches).length;
    if(n)diWriteReviews(team,updateTeam,cp.srcKey,cp.date,patches);
    setCopyFor(null);
    flash(n?L(`${n} sporcu için ${fd(cp.date)} tarihine taslak yazıldı — Bireyselleştirme'de o günü açıp onayla.`,`Draft written for ${n} athlete(s) on ${fd(cp.date)} — open that day in Individualization to approve.`)
      +(skipped?L(` ${skipped} sporcuda o gün zaten program var, atlandı.`,` ${skipped} already had a programme that day and were skipped.`):'')
      :L('Hiçbir şey yazılmadı: seçilen sporcuların o gün zaten programı var.','Nothing written: the chosen athletes already have a programme that day.'));
  };
  const copyPanel=r=>{
    const ss=daySes(cp.date);
    return(<div className="ph-copy">
      <div className="iv-f"><label>{L('Hedef gün','Target day')}</label>
        <input type="date" value={cp.date} onChange={e=>{const d=e.target.value;const s2=daySes(d);setCp(o=>({...o,date:d,srcKey:s2[0]?`team:${d}:${s2[0].id}`:''}));}}/></div>
      <div className="iv-f grow"><label>{L('O günün takım seansı (kaynak)','Team session that day (source)')}</label>
        <select value={cp.srcKey} onChange={e=>setCp(o=>({...o,srcKey:e.target.value}))}>
          {!ss.length&&<option value="">{L('— bu günde takım seansı yok','— no team session that day')}</option>}
          {ss.map(s=><option key={s.id} value={`team:${cp.date}:${s.id}`}>{`${s.name||'Session'} · ${s.time||''}`}</option>)}
        </select></div>
      <div style={{width:'100%'}}>
        <div className="row" style={{gap:6,flexWrap:'wrap'}}>
          <button className="btn xs sec" onClick={()=>setCp(o=>({...o,ids:athletes.map(a=>a.id)}))}>{L('Tümü','All')}</button>
          <button className="btn xs sec" onClick={()=>setCp(o=>({...o,ids:[]}))}>{L('Hiçbiri','None')}</button>
          {athletes.map(a=><button key={a.id} className={'iv-athchip'+(cp.ids.includes(a.id)?' on':'')}
            onClick={()=>setCp(o=>({...o,ids:o.ids.includes(a.id)?o.ids.filter(x=>x!==a.id):[...o.ids,a.id]}))}>{a.name||'—'}</button>)}
        </div>
      </div>
      <div className="help" style={{width:'100%'}}>{L('Kopya bir TASLAK olarak yazılır; sporcunun takvimine ancak o günü Bireyselleştirme\'de açıp "Onayla ve takvime yaz" dediğinde gider. O gün zaten programı olan sporcunun programı ezilmez.','The copy is written as a DRAFT; it reaches the athlete\'s calendar only when you open that day in Individualization and press "Approve and write to calendar". An athlete who already has a programme that day is not overwritten.')}</div>
      <button className="btn sm" disabled={!cp.srcKey||!cp.ids.length} onClick={()=>doCopy(r)}>{L(`Taslak yaz (${cp.ids.length})`,`Write draft (${cp.ids.length})`)}</button>
    </div>);
  };
  const statusPill=s=><span className={'inj-pill '+(s==='approved'?'ok':'')}>{s==='approved'?L('ONAYLI','APPROVED'):L('TASLAK','DRAFT')}</span>;
  const modelTag=m=>m==='manual'?L('elle','manual'):m==='external'?L('dış kaynak','external'):m?'AI':'';

  return(<div className="ph-wrap">
    <div className="panel">
      <div className="row" style={{gap:6,marginBottom:12,flexWrap:'wrap'}}>
        <button className={'btn sm'+(scope==='hist'?'':' sec')} onClick={()=>{setScope('hist');setOpen(null);}}>{L('Geçmiş','History')} ({hist.length})</button>
        <button className={'btn sm'+(scope==='tpl'?'':' sec')} onClick={()=>{setScope('tpl');setOpen(null);}}>{L('Şablonlar','Templates')} ({tpls.length})</button>
      </div>
      <div className="ph-filters">
        <input type="search" placeholder={L('Ara: egzersiz, patern, sporcu, not, tarih…','Search: exercise, pattern, athlete, note, date…')} value={f.q} onChange={e=>set('q',e.target.value)} aria-label={L('Ara','Search')}/>
        {scope==='hist'&&<>
          <select value={f.ath} onChange={e=>set('ath',e.target.value)} aria-label={L('Sporcu','Athlete')}>
            <option value="">{L('Tüm sporcular','All athletes')}</option>
            {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={f.status} onChange={e=>set('status',e.target.value)} aria-label={L('Durum','Status')}>
            <option value="">{L('Tüm durumlar','All statuses')}</option>
            <option value="approved">{L('Onaylı','Approved')}</option>
            <option value="draft">{L('Taslak','Draft')}</option>
          </select>
          <input type="date" value={f.from} onChange={e=>set('from',e.target.value)} aria-label={L('Başlangıç','From')}/>
          <input type="date" value={f.to} onChange={e=>set('to',e.target.value)} aria-label={L('Bitiş','To')}/>
        </>}
      </div>
      {msg&&<div className="iv-toast" style={{marginTop:10}}>{msg}</div>}
    </div>
    {rows.length===0&&<div className="ex-empty">{(scope==='hist'?hist:tpls).length===0
      ?(scope==='hist'
        ?L('Henüz kayıtlı program yok. Bireyselleştirmede Hareket Paterni tablosunu doldurup "Programı Kaydet"e bastığında burada görünür.','No programmes yet. They appear here once you fill the Movement Pattern table in Individualization and press "Save Programme".')
        :L('Henüz şablon yok. Geçmişten bir programı "Şablon olarak sakla" ile ekleyebilirsin.','No templates yet. Save a programme from the history with "Save as template".'))
      :L('Bu aramaya uyan program yok.','No programme matches this search.')}</div>}
    {rows.slice(0,limit).map(r=>{
      const isOpen=open===r.key;
      return(<div key={r.key} className={'panel ph-row'+(isOpen?' open':'')}>
        <button className="ph-sum" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:r.key)}>
          {r.kind==='hist'?<>
            <span className="ph-date">{fd(r.date)}</span>
            <span className="ph-ath">{r.athName}</span>
            <span className="ph-name">{r.name||r.ex.slice(0,3).map(x=>x.name).join(', ')}</span>
            <span className="ph-meta">{r.ex.length} {L('egz.','ex.')}{modelTag(r.model)?` · ${modelTag(r.model)}`:''}</span>
            {statusPill(r.status)}
          </>:<>
            <span className="ph-name ph-tname">{r.name}</span>
            <span className="ph-meta">{r.fromAth?`${r.fromAth} · `:''}{r.fromDate?fd(r.fromDate):''}</span>
            <span className="ph-meta">{r.ex.length} {L('egz.','ex.')}</span>
          </>}
          <span className="inj-car" aria-hidden="true">▾</span>
        </button>
        {isOpen&&<div className="ph-body">
          <ProgramView prog={r.program}/>
          <div className="row" style={{gap:6,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn sm" onClick={()=>openCopy(r)}>{r.kind==='tpl'?L('Uygula…','Apply…'):L('Başka sporcuya / güne kopyala…','Copy to athlete / day…')}</button>
            {r.kind==='hist'&&<button className="btn sm sec" onClick={()=>{setTplFor(tplFor===r.key?null:r.key);setTplName(r.name||'');}}>{L('Şablon olarak sakla','Save as template')}</button>}
            {r.kind==='hist'&&r.status!=='approved'&&<button className="btn xs danger" onClick={()=>delDraft(r)}>✕ {L('Taslağı sil','Delete draft')}</button>}
            {r.kind==='tpl'&&<button className="btn sm sec" onClick={()=>renameTemplate(r)}>{L('Yeniden adlandır','Rename')}</button>}
            {r.kind==='tpl'&&<button className="btn xs danger" onClick={()=>delTemplate(r)}>✕ {L('Sil','Delete')}</button>}
          </div>
          {tplFor===r.key&&<div className="row" style={{gap:6,marginTop:10}}>
            <input style={{flex:1}} value={tplName} onChange={e=>setTplName(e.target.value)} placeholder={L('Şablon adı','Template name')} onKeyDown={e=>{if(e.key==='Enter')saveTemplate(r);}}/>
            <button className="btn sm" onClick={()=>saveTemplate(r)}>{L('Sakla','Save')}</button>
          </div>}
          {copyFor===r.key&&copyPanel(r)}
        </div>}
      </div>);
    })}
    {rows.length>limit&&<div className="row" style={{justifyContent:'center',marginTop:10}}>
      <button className="btn sm sec" onClick={()=>setLimit(n=>n+30)}>{L(`30 tane daha (${rows.length-limit} kaldı)`,`Show 30 more (${rows.length-limit} left)`)}</button>
    </div>}
  </div>);
}
