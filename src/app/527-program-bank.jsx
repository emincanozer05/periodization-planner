/* ---- PROGRAM BANKASI -------------------------------------------------------------
   Bir sporcu için yazılan program, sporcunun profilinde (sporcu detayı → Takvim sekmesi → Antrenman Programları)
   iki kaynaktan okunur:
     • kaydedilenler — `ath.programs[]`: sporcunun takviminde bir seans yazıldıkça kendiliğinden
       (`pbAutoSave`: seans başına tek kayıt, değiştikçe aynı kayıt güncellenir, içeriği birebir aynı
       olan ikinci kayıt açılmaz) ve koç "Profile kaydet" deyince adıyla.
       {id, name, note, created_at, from:{date,session,sessionId,auto}, blocks:[takvim bloğu…]}
     • takvim geçmişi — `ath.days`: sporcunun takvimine yazılmış her seans (elle yazılan,
       Bireyselleştirmeden onaylanan, takımdan gelen). Bunların kopyası tutulmaz; takvimden okunur.
   Programın biçimi takvimin kendi bloğudur, bu yüzden her yazım yerine aynen yapıştırılır:
   takvim çekmecesi ve Hafta/Gün planlayıcısı (yeni seans ya da mevcut seansa blok), ve
   Bireyselleştirme'nin Antrenman tablosu (bloktan tablo satırlarına çevrilir).

   Seçici (`ProgramPicker`) yapıştırılan yerin sporcusu belliyse YALNIZCA o sporcunun programlarını
   gösterir (seans onun takviminde ya da Bireyselleştirme'de onun kartında yazılıyorsa). Sporcu belli
   değilse (takım takvimi, Hafta/Gün planı) hangi sporcunun programı olduğunu seçtirir. Okunan liste
   `registerProgramBank` ile uygulamanın tepesinden verilir (kütüphane listesiyle aynı yol:
   setLibItems); yazma da aynı yoldan, `_pbWrite` ile, sporcunun güncel hâline uygulanır.
   Sporcunun Takvim sekmesindeki eski panel (Antrenman Programları) kaldırıldı; kayıtlar seçiciden okunur. */
let _pbTeams=[];
let _pbWrite=null;
function registerProgramBank(teams,write){_pbTeams=Array.isArray(teams)?teams:[];_pbWrite=write||null;}

const pbNamed=e=>!!String(e&&e.name||'').trim();
/* Yapıştırılabilir bir program yalnızca S&C bloklarından oluşur: top antrenmanı bloğu çizim ve
   video taşır (saklamak için ağır) ve bir antrenman programı sayılmaz. */
const pbBlocksOf=session=>((session&&session.blocks)||[]).filter(b=>blkKind(b)!=='ball'&&(b.exercises||[]).some(pbNamed));
/* Bir bloğun bağımsız kopyası: yeni kimlik; katılımcı listesi kaynağın seansına aittir, gelmez. */
function pbCloneBlock(b){
  const c=phClone(b);
  c.id=uid();
  delete c.athletes;
  c.exercises=(c.exercises||[]).map(e=>{const x={...e};delete x.id;return x;});
  return c;
}
const pbFreshBlocks=blocks=>(blocks||[]).map(pbCloneBlock);
/* İçeriğin imzası: aynı program iki kez kaydedilmesin. */
const pbSig=blocks=>JSON.stringify((blocks||[]).map(b=>(b.exercises||[]).filter(pbNamed).map(e=>
  [e.name,e.sets,e.reps,e.duration,e.load,e.rpe,e.tempo,e.rest,e.superset,e.phase])));
/* Kaydedilecek program ya da null (kaydedilecek egzersiz yok). */
function pbMakeProgram(name,blocks,from){
  const clean=(blocks||[]).filter(b=>blkKind(b)!=='ball').map(b=>{
    const c=pbCloneBlock(b);c.exercises=c.exercises.filter(pbNamed);return c;}).filter(b=>b.exercises.length);
  if(!clean.length)return null;
  const nm=String(name||'').trim()||String((clean[0]&&clean[0].name)||'').trim()||L('Program','Programme');
  return{id:uid(),name:nm,note:'',created_at:new Date().toISOString(),from:from||null,blocks:clean};
}
const pbHasSame=(programs,blocks)=>{const s=pbSig(blocks);return(programs||[]).some(p=>p&&pbSig(p.blocks)===s);};
/* Takvimdeki takım senkron kopyası bir programı değil takım seansını taşır; Bireyselleştirme'nin yazdığı
   seans (`indiv`) ise sporcuya özel yazılmıştır, o sayılır. */
const pbOwn=s=>!!s&&(!s.sourceId||!!s.indiv);
/* Elle kayıt: 'ok' | 'dup' | 'empty'. Aynı seans zaten kendiliğinden kaydedilmişse o kayıt adlandırılır. */
function pbSave(athId,name,blocks,from){
  const prog=pbMakeProgram(name,blocks,from);
  if(!prog)return'empty';
  const sid=from&&from.sessionId;
  let dup=false;
  _pbTeams.forEach(t=>(t.athletes||[]).forEach(a=>{
    if(a.id!==athId)return;
    if(sid&&(a.programs||[]).some(p=>p&&p.from&&p.from.sessionId===sid))return;
    if(pbHasSame(a.programs,prog.blocks))dup=true;
  }));
  if(dup)return'dup';
  if(!_pbWrite)return'empty';
  _pbWrite(athId,a=>{
    const list=a.programs||[];
    const i=sid?list.findIndex(p=>p&&p.from&&p.from.sessionId===sid):-1;
    if(i>=0)return{programs:list.map((p,j)=>j===i?{...p,name:prog.name,blocks:prog.blocks,from:{...prog.from}}:p)};
    return pbHasSame(list,prog.blocks)?{}:{programs:[prog,...list]};
  });
  return'ok';
}
/* Otomatik kayıt: sporcunun takviminde yazılan seans, profilinde kayıtlı program olarak durur. Seans
   başına tek kayıt (`from.sessionId`): seans değiştikçe aynı kayıt güncellenir, adı korunur. Egzersizleri
   sonradan silinse bile kayıt kalır. Başka bir kayıtla içeriği birebir aynıysa yenisi açılmaz. */
function pbAutoSave(athId,session,date){
  if(!_pbWrite||!athId||!pbOwn(session))return;
  const blocks=pbBlocksOf(session);
  if(!blocks.length)return;
  _pbWrite(athId,a=>{
    const list=a.programs||[];
    const i=list.findIndex(p=>p&&p.from&&p.from.sessionId===session.id);
    const from={date:date||'',session:session.name||'',sessionId:session.id,auto:i>=0?!!(list[i].from&&list[i].from.auto):true};
    const prog=pbMakeProgram(i>=0?list[i].name:(session.name||''),blocks,from);
    if(!prog)return{};
    if(i>=0){
      if(pbSig(list[i].blocks)===pbSig(prog.blocks))return{};
      return{programs:list.map((p,j)=>j===i?{...p,blocks:prog.blocks,from}:p)};
    }
    return pbHasSame(list,prog.blocks)?{}:{programs:[prog,...list]};
  });
}

/* Seçicinin ve profilin okuduğu satırlar: bir sporcunun kayıtlı programları, sonra takvimi. */
function pbRowsOf(ath,teamName){
  const out=[];
  const row=(base,blocks)=>{
    const names=[];blocks.forEach(b=>(b.exercises||[]).forEach(e=>{if(pbNamed(e))names.push(e.name);}));
    out.push({...base,athId:ath.id,athName:ath.name||L('(adsız)','(unnamed)'),teamName:teamName||'',blocks,exNames:names,exCount:names.length,
      text:phNorm([base.name,ath.name,base.date||'',base.note||'',...blocks.map(b=>b.name),...names].join(' '))});
  };
  (ath.programs||[]).forEach(p=>{
    if(!p||!Array.isArray(p.blocks))return;
    const blocks=p.blocks.filter(b=>(b.exercises||[]).some(pbNamed));
    if(!blocks.length)return;
    row({key:`saved:${ath.id}:${p.id}`,kind:'saved',id:p.id,name:p.name||'',date:(p.from&&p.from.date)||'',at:p.created_at||'',note:p.note||'',auto:!!(p.from&&p.from.auto)},blocks);
  });
  const days=ath.days||{};
  Object.keys(days).forEach(dk=>{
    const d=days[dk];
    ((d&&d.sessions)||[]).forEach(s=>{
      if(!pbOwn(s))return;
      const blocks=pbBlocksOf(s);
      if(!blocks.length)return;
      row({key:`day:${ath.id}:${dk}:${s.id}`,kind:'day',id:s.id,name:s.name||'',date:dk,at:dk},blocks);
    });
  });
  return out.sort((a,b)=>(a.kind===b.kind?0:a.kind==='saved'?-1:1)||String(b.at).localeCompare(String(a.at)));
}
function pbAllRows(){
  const out=[];
  _pbTeams.forEach(t=>(t.athletes||[]).forEach(a=>pbRowsOf(a,(t.setup&&t.setup.teamName)||'').forEach(r=>out.push(r))));
  return out.sort((a,b)=>(a.kind===b.kind?0:a.kind==='saved'?-1:1)||String(b.at).localeCompare(String(a.at)));
}
function pbFilter(rows,f){
  const terms=phNorm(f.q).split(/\s+/).filter(Boolean);
  return rows.filter(r=>{
    if(f.ath&&r.athId!==f.ath)return false;
    if(f.src&&r.kind!==f.src)return false;
    return !terms.length||terms.every(t=>r.text.includes(t));
  });
}

/* Takvime: yeni bir seans olarak ya da mevcut seansın sonuna bloklar olarak. */
function pbToSession(row){
  const s=SESS({name:row.name||(row.blocks[0]&&row.blocks[0].name)||L('Program','Programme')});
  return{...s,blocks:pbFreshBlocks(row.blocks)};
}
const pbBlankBlock=b=>!String(b.name||'').trim()&&!(b.exercises||[]).some(e=>pbNamed(e)||String(e.sets||e.reps||e.duration||'').trim())&&!((b.athletes||[]).length);
/* Seansın boş, ilk açılan bloğu yapıştırılan programın yerini alır; dolu bloklar yerinde kalır. */
const pbAppendBlocks=(blocks,row)=>[...(blocks||[]).filter(b=>!pbBlankBlock(b)),...pbFreshBlocks(row.blocks)];

/* Bireyselleştirme'nin Antrenman tablosuna: bloklar satırlara çevrilir. Kategorisi olan egzersiz kendi
   kategorisinin satırına, olmayan "Kategorisiz"e düşer; bölümler (Hazırlık / Ana / Soğuma ve koçun
   adlandırdıkları) tablonun fazlarına eşlenir. Var olan satırlar korunur, yenileri sona eklenir. */
function pbToPatterns(blocks,instr){
  const phases=[...diMovePhases(instr&&instr.phases)];
  const before=diMovePatterns(instr&&instr.patterns);
  const preMap={hazirlik:'prep',ana:'main',soguma:'cool'};
  const addPhase=np=>{
    if(np.preset==='prep')phases.unshift(np);
    else if(np.preset==='main'&&phases.some(x=>x.preset==='cool'))phases.splice(phases.findIndex(x=>x.preset==='cool'),0,np);
    else phases.push(np);
  };
  const phaseOf=(b,pid)=>{
    if(!pid)return'';
    const pre=preMap[pid];
    let hit=pre?phases.find(p=>p.preset===pre):phases.find(p=>!p.preset&&p.name&&p.name===String((b.phaseNames||{})[pid]||''));
    if(!hit){
      if(phases.length>=6)return'';
      hit={id:'ph_'+Math.random().toString(36).slice(2,7),name:pre?'':String((b.phaseNames||{})[pid]||'').slice(0,40)||L(`Faz ${phases.length+1}`,`Phase ${phases.length+1}`),preset:pre||''};
      addPhase(hit);
    }
    return hit.id;
  };
  const rows=[];
  (blocks||[]).forEach(b=>{
    const open=blkPhases(b);
    (b.exercises||[]).filter(pbNamed).forEach(ex=>{
      const cat=(!ex.noPat&&MV_KEYS.includes(ex.pattern))?mvCat(ex.pattern):null;
      const al=(ex.alt&&typeof ex.alt==='object')?ex.alt:{};
      const ph=exPhase(ex);
      rows.push({id:cat?cat.id:'',phase:open.includes(ph)?phaseOf(b,ph):'',exercise:ex.name,
        type:cat&&ex.plane?[ex.plane]:[],direction:cat&&ex.dir?[ex.dir]:[],
        sets:ex.sets||'',reps:ex.reps||'',duration:ex.duration||'',tempo:ex.tempo||'',rpe:ex.rpe||'',load:ex.load||'',rest:ex.rest||'',
        link:ex.link||'',superset:ex.superset||'',note:exDesc(ex)||'',
        alt:{name:al.name||'',sets:al.sets||'',reps:al.reps||'',duration:al.duration||'',tempo:al.tempo||'',rpe:al.rpe||'',load:al.load||'',rest:al.rest||'',link:al.link||''}});
    });
  });
  const patterns=diMovePatterns([...before,...rows]);
  return{patterns,phases:diMovePhases(phases),added:patterns.length-before.length,total:rows.length};
}

/* ---- Görünüm -------------------------------------------------------------------- */
const pbLine=x=>{
  const sr=x.sets&&x.reps?`${x.sets}×${x.reps}`:(x.sets?`${x.sets} ${L('set','sets')}`:(x.reps||''));
  return[sr,x.duration||'',x.load||'',x.rpe?`RPE ${x.rpe}`:'',x.tempo||'',x.rest?`${L('din.','rest')} ${x.rest}`:''].filter(Boolean).join(' · ');
};
function PbBlocks({blocks}){
  return(<div className="ph-prog">
    {(blocks||[]).map((b,bi)=><div key={bi} className="ph-blk">
      {b.name&&<div className="ph-blk-h">{b.name}</div>}
      {(b.exercises||[]).filter(pbNamed).map((x,i)=><div key={i} className="ph-ex">
        <span className="ph-ex-n">{x.superset?x.superset+' ':''}{x.name}</span>
        <span className="ph-ex-p">{MV_KEYS.includes(x.pattern)?mvCatLabel(x.pattern):''}</span>
        <span className="ph-ex-d">{pbLine(x)}</span>
      </div>)}
    </div>)}
  </div>);
}
/* Bir program satırı: özet çubuğu (açılır) + istenen düğmeler. */
function PbRow({r,open,onToggle,showAth,children}){
  const first=r.exNames.slice(0,3).join(', ')+(r.exNames.length>3?'…':'');
  return(<div className={'panel pbk-row'+(open?' open':'')}>
    <div className="pbk-top">
      <button type="button" className="pbk-sum" aria-expanded={open} onClick={onToggle}>
        <span className={'inj-pill pbk-kind'+(r.kind==='saved'?' ok':'')}>{r.kind==='saved'?L('KAYITLI','SAVED'):L('TAKVİM','CALENDAR')}</span>
        <span className="pbk-name">{r.name||first||'—'}</span>
        <span className="pbk-meta">{showAth?`${r.athName} · `:''}{r.date?fd(r.date)+' · ':''}{r.exCount} {L('egz.','ex.')}{r.auto?' · '+L('otomatik','auto'):''}</span>
        <span className="pbk-first">{first}</span>
        <span className="inj-car" aria-hidden="true">▾</span>
      </button>
      {children&&<div className="pbk-acts">{children}</div>}
    </div>
    {open&&<div className="pbk-body"><PbBlocks blocks={r.blocks}/>{r.note&&<div className="help" style={{marginTop:8}}>{r.note}</div>}</div>}
  </div>);
}

/* Yapıştırılacak programı seçtiren pencere. `onPick(row)` çağrılır, pencere kapanır. */
function ProgramPicker({onClose,onPick,athId,title}){
  /* Yazılan yerin sporcusu belliyse yalnızca onun programları; başkasının programı hiç gelmez. */
  const rows=useMemo(()=>pbAllRows().filter(r=>!athId||r.athId===athId),[]);
  const[f,setF]=useState(()=>({q:'',ath:athId||'',
    /* Kayıtlı programlar önde: takvim geçmişi kalabalık olur. Hiç kayıtlı yoksa boş liste açılmasın. */
    src:rows.some(r=>r.kind==='saved')?'saved':''}));
  const[open,setOpen]=useState(null);
  const[limit,setLimit]=useState(30);
  const set=(k,v)=>{setF(o=>({...o,[k]:v}));setLimit(30);};
  useEffect(()=>{
    const onKey=e=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[]);
  const aths=useMemo(()=>{const m=new Map();rows.forEach(r=>{if(!m.has(r.athId))m.set(r.athId,r.athName);});return[...m.entries()].sort((a,b)=>a[1].localeCompare(b[1],'tr'));},[rows]);
  const shown=useMemo(()=>pbFilter(rows,f),[rows,f]);
  const nSaved=rows.filter(r=>r.kind==='saved').length;
  const athName=useMemo(()=>{let n='';_pbTeams.forEach(t=>(t.athletes||[]).forEach(a=>{if(a.id===athId)n=a.name||'';}));return n;},[]);
  return ReactDOM.createPortal(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal pbk-modal" role="dialog" aria-modal="true" aria-label={title||L('Kayıtlı program','Saved programme')} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2 style={{margin:0,fontSize:17,flex:1}}>{title||L('Kayıtlı programdan yapıştır','Paste a saved programme')}{athName&&<small className="pbk-for"> · {athName}</small>}</h2>
          <button className="x-btn" onClick={onClose} aria-label={L('Kapat','Close')}>✕</button></div>
        <div className={'pbk-filters'+(athId?' one':'')}>
          <input type="search" autoFocus placeholder={L('Ara: egzersiz, program adı, sporcu, tarih…','Search: exercise, programme, athlete, date…')}
            value={f.q} onChange={e=>set('q',e.target.value)} aria-label={L('Ara','Search')}/>
          {!athId&&<select value={f.ath} onChange={e=>set('ath',e.target.value)} aria-label={L('Sporcu','Athlete')}>
            <option value="">{L('Tüm sporcular','All athletes')}</option>
            {aths.map(([id,nm])=><option key={id} value={id}>{nm}</option>)}
          </select>}
          <select value={f.src} onChange={e=>set('src',e.target.value)} aria-label={L('Kaynak','Source')}>
            <option value="saved">{L(`Kayıtlı programlar (${nSaved})`,`Saved programmes (${nSaved})`)}</option>
            <option value="">{L('Kayıtlı + takvim geçmişi','Saved + calendar history')}</option>
            <option value="day">{L('Yalnız takvim geçmişi','Calendar history only')}</option>
          </select>
        </div>
        <div className="pbk-list">
          {shown.length===0&&<div className="ex-empty">{rows.length===0
            ?(athId?L('Bu sporcu için henüz program yazılmamış. Takvimine bir antrenman yazdıkça burada görünür.','Nothing has been written for this athlete yet. Sessions you write on their calendar show up here.')
              :L('Henüz program yok. Bir sporcunun takvimine program yaz.','No programmes yet. Write one on an athlete\'s calendar.'))
            :L('Bu aramaya uyan program yok.','No programme matches this search.')}</div>}
          {shown.slice(0,limit).map(r=><PbRow key={r.key} r={r} showAth={!athId} open={open===r.key} onToggle={()=>setOpen(open===r.key?null:r.key)}>
            <button type="button" className="btn sm" onClick={()=>{onPick(r);onClose();}}>{L('Yapıştır','Paste')}</button>
          </PbRow>)}
          {shown.length===0&&f.src==='saved'&&pbFilter(rows,{...f,src:''}).length>0&&<button type="button" className="btn sm sec"
            onClick={()=>set('src','')}>{L(`Takvim geçmişinde ${pbFilter(rows,{...f,src:''}).length} eşleşme var — göster`,`${pbFilter(rows,{...f,src:''}).length} match(es) in the calendar history — show`)}</button>}
          {shown.length>limit&&<button type="button" className="btn sm sec" onClick={()=>setLimit(n=>n+30)}>{L(`Daha göster (${shown.length-limit})`,`Show more (${shown.length-limit})`)}</button>}
        </div>
      </div>
    </div>,document.body);
}
/* Düğme + seçici: hangi sekmede olursa olsun aynı yapıştırma yolu. */
function ProgramPickBtn({onPick,athId,label,title,cls}){
  const[open,setOpen]=useState(false);
  return(<>
    <button type="button" className={cls||'btn xs sec'} onClick={()=>setOpen(true)}
      title={title||L('Önceden yazılmış bir programı bul ve yapıştır','Find a programme written before and paste it')}>📋 {label||L('Kayıtlı program','Saved programme')}</button>
    {open&&<ProgramPicker athId={athId} onClose={()=>setOpen(false)} onPick={onPick}/>}
  </>);
}
