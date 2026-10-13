/* =========================================================
   THE PATTERN TABLE — where a session is written
   =========================================================
   One table, two homes: the calendar's block editor and the individualization brief. A row
   of chips picks the movement patterns; every picked pattern is a row of the table: the
   exercise (with its superset tag and an alternative under it), how many exercises of that
   pattern, then the prescription — sets, reps, time, tempo, RPE, load, rest — and a note.

   PlanTable draws it and knows nothing about where the rows live. A host (CalPlanGrid below
   for a calendar block, DiPatternPlan in the brief) hands in plain `groups` of `slots` and
   gets every edit back through `handlers`, addressed by the slot's own `key`:
     onChip(id)               a pattern chip was pressed
     onCount(gid,n)           the "how many" stepper of a group
     onSlot(key,patch)        fields of one slot changed (name, link, sets, reps, duration,
                              tempo, rpe, load, rest, note, superset; the alternative's own
                              under a_name, a_sets … a_link; {alt:null} deletes it)
     onPick(key,item,isAlt)   an exercise was picked off the library
     onNew(key,name)          a name the library did not have was typed (optional)
     onRemove(key)            one exercise removed
     onRemoveGroup(gid)       the whole pattern removed
     onPattern(key,id)        a row without a pattern was given one (optional)
     onLinkBlur(key,isAlt,v)  a link box was left — the host files it in the library
     renderDetail(key)        what the row's "more" button opens (optional) */
let PT_UID=0;
/* The suggestions behind the dropdown arrows. Any text is still accepted: a rep RANGE, a
   tempo the list does not have and a rest of "90 sn + 30 sn" are all valid answers. */
const ptSuggest=()=>({
  tempo:['2-0-1','3-0-1','3-1-1','2-1-1','4-0-1','1-0-1','X-0-X'],
  rpe:['4','5','6','6.5','7','7.5','8','8.5','9','10'],
  load:[L('Vücut ağırlığı','Bodyweight'),'50% 1RM','60% 1RM','65% 1RM','70% 1RM','75% 1RM','80% 1RM','85% 1RM','90% 1RM'],
  rest:[L('30 sn','30 sec'),L('45 sn','45 sec'),L('60 sn','60 sec'),L('90 sn','90 sec'),L('2 dk','2 min'),
    L('2-3 dk','2-3 min'),L('3 dk','3 min'),L('3-5 dk','3-5 min')],
});

/* A number with a small up / down pair beside it. Text, not a number input, so "8-10" is
   a legal rep count; the arrows step a plain number and replace anything else. */
function PtStep({value,onChange,label,min=1,max=99}){
  const[v,set]=useLiveValue(String(value==null?'':value),onChange);
  const bump=d=>{
    const n=parseInt(v,10);
    if(isNaN(n)){set(d>0?String(min):'');return;}
    set(String(Math.max(min,Math.min(max,n+d))));
  };
  return(<span className={'pt-step'+(v?' on':'')}>
    <input value={v} inputMode="numeric" aria-label={label} placeholder="—" onChange={e=>set(e.target.value.slice(0,12))}/>
    <span className="pt-spin">
      <button type="button" tabIndex={-1} aria-label={L('Artır','Increase')} onClick={()=>bump(1)}/>
      <button type="button" tabIndex={-1} aria-label={L('Azalt','Decrease')} onClick={()=>bump(-1)}/>
    </span>
  </span>);
}
/* A box with a dropdown of suggestions (a native datalist) — type anything, or open the
   arrow and pick. */
function PtCombo({value,onChange,listId,label}){
  const[v,set]=useLiveValue(String(value==null?'':value),onChange);
  return(<span className={'pt-combo'+(listId?' dd':'')+(v?' on':'')}>
    <input value={v} list={listId||undefined} aria-label={label} placeholder="—" onChange={e=>set(e.target.value.slice(0,40))}/>
  </span>);
}
/* "A1" — the superset letter and the place in it. Pressing it opens the letter list. */
function PtTag({tag,val,onChange}){
  return(<label className={'pt-tag'+(val?' on':'')}
    title={L('Süperset grubu — aynı harfi paylaşan egzersizler süpersettir','Superset group — exercises that share a letter are a superset')}>
    <span>{tag}</span>
    <select value={val||''} aria-label={L('Süperset grubu','Superset group')} onChange={e=>onChange(e.target.value)}>
      <option value="">—</option>
      {SLOT_SS.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </label>);
}
const ptSame=(a,b)=>{
  const ka=Object.keys(a),kb=Object.keys(b);
  return ka.length===kb.length&&ka.every(k=>a[k]===b[k]);
};
const PT_ALT_KEYS=['sets','reps','duration','tempo','rpe','load','rest','link'];
/* One exercise: up to three grid rows under its pattern — the exercise itself with its dose
   and link; its alternative, written like an exercise with a dose of its own (a swap may be
   done at other sets, reps and load); and the note, in the open space beside them.
   Memoised on what it draws: a table of twenty rows is two hundred inputs, and a keystroke
   in one of them must not rebuild the other nineteen. */
const PtRow=React.memo(function PtRow({gid,slot,grp,first,cb,ids,hasDetail,detailOpen}){
  const k=slot.key;
  const[altOn,setAltOn]=useState(false);
  const hasAlt=!!(slot.a_name||PT_ALT_KEYS.some(f=>slot['a_'+f]));
  const showAlt=hasAlt||altOn;
  const f=(name,v)=>cb.onSlot(k,{[name]:v});
  const lab=n=>`${grp.label} · ${n}`;
  const alab=n=>`${grp.label} · ${L('Alternatif','Alternative')} · ${n}`;
  const dose=(pre,labf)=>[
    <div key="sets" className="pt-td" role="cell"><span className="pt-cl">{L('Set','Sets')}</span>
      <PtStep value={slot[pre+'sets']} onChange={v=>f(pre+'sets',v)} label={labf(L('Set','Sets'))} max={20}/></div>,
    <div key="reps" className="pt-td" role="cell"><span className="pt-cl">{L('Tekrar','Reps')}</span>
      <PtStep value={slot[pre+'reps']} onChange={v=>f(pre+'reps',v)} label={labf(L('Tekrar','Reps'))} max={100}/></div>,
    <div key="duration" className="pt-td" role="cell"><span className="pt-cl">{L('Süre','Time')}</span>
      <PtCombo value={slot[pre+'duration']} onChange={v=>f(pre+'duration',v)} label={labf(L('Süre (ör. 30s)','Time (e.g. 30s)'))}/></div>,
    <div key="tempo" className="pt-td" role="cell"><span className="pt-cl">Tempo</span>
      <PtCombo value={slot[pre+'tempo']} onChange={v=>f(pre+'tempo',v)} listId={ids.tempo} label={labf('Tempo')}/></div>,
    <div key="rpe" className="pt-td" role="cell"><span className="pt-cl">RPE</span>
      <PtCombo value={slot[pre+'rpe']} onChange={v=>f(pre+'rpe',v)} listId={ids.rpe} label={labf('RPE')}/></div>,
    <div key="load" className="pt-td" role="cell"><span className="pt-cl">{L('Yük','Load')}</span>
      <PtCombo value={slot[pre+'load']} onChange={v=>f(pre+'load',v)} listId={ids.load} label={labf(L('Yük','Load'))}/></div>,
    <div key="rest" className="pt-td" role="cell"><span className="pt-cl">{L('Dinlenme','Rest')}</span>
      <PtCombo value={slot[pre+'rest']} onChange={v=>f(pre+'rest',v)} listId={ids.rest} label={labf(L('Dinlenme','Rest'))}/></div>,
    <div key="link" className="pt-td pt-link" role="cell"><span className="pt-cl">Link</span>
      <LiveInput className="pt-noteinp" value={slot[pre+'link']} maxLength={300} onChange={v=>f(pre+'link',v)}
        onBlur={e=>cb.onLinkBlur&&cb.onLinkBlur(k,pre==='a_',e.target.value)}
        placeholder={L('Link ekle...','Add a link...')} aria-label={labf('Link')}/></div>];
  const style={'--pat-c':grp.color||'var(--border2)'};
  const noteBox=<div className="pt-td pt-note" role="cell"><span className="pt-cl">{L('Not','Note')}</span>
    <LiveInput className="pt-noteinp" value={slot.note} maxLength={240} onChange={v=>f('note',v)}
      placeholder={L('Not ekle...','Add a note...')} aria-label={lab(L('Not','Note'))}/></div>;
  return(<>
    <div className={'pt-tr'+(first?' first':'')} role="row" style={style}>
      <div className="pt-pat" role="rowheader">
        {first&&(grp.pick
          ?<label className="pt-patpick"><span className="pt-cl">{L('Patern','Pattern')}</span>
            <select value="" aria-label={L('Patern seç','Pick a pattern')} onChange={e=>{if(e.target.value)cb.onPattern(k,e.target.value);}}>
              <option value="">{L('Patern seç…','Pick pattern…')}</option>
              {grp.options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
            </select></label>
          :<><span className="pt-patn"><i className="pt-dot"/><b>{grp.label}</b></span>
            <button type="button" className="pt-x" onClick={()=>cb.onRemoveGroup(gid)}
              aria-label={L('Paterni kaldır','Remove the pattern')} title={L('Paterni ve egzersizlerini kaldır','Remove the pattern and its exercises')}>✕</button></>)}
        {slot.sub&&<span className="pt-sub" title={L('Uygulama','Execution')}>{slot.sub}</span>}
      </div>
      <div className="pt-td pt-ex" role="cell">
        <span className="pt-cl">{L('Egzersiz','Exercise')}</span>
        <div className="pt-exmain">
          <PtTag tag={slot.tag} val={slot.tagVal} onChange={v=>f('superset',v)}/>
          <div className="pt-exname">
            <ExNameField value={slot.name} onChange={v=>f('name',v)} tags={{pattern:slot.tagP,plane:slot.tagS}}
              onNewName={cb.onNew?(nm=>cb.onNew(k,nm)):undefined}
              onPick={it=>cb.onPick(k,it,false)}/>
          </div>
          {hasDetail&&<button type="button" className={'pt-more'+(detailOpen?' on':'')} aria-expanded={detailOpen}
            onClick={()=>cb.toggleDetail(k)} title={L('Görsel, uygulama ve diğer ayrıntılar','Image, execution and other details')}>⋯</button>}
          {grp.count>1&&<button type="button" className="pt-x" onClick={()=>cb.onRemove(k)}
            aria-label={L('Egzersizi kaldır','Remove exercise')} title={L('Bu egzersizi kaldır','Remove this exercise')}>✕</button>}
        </div>
      </div>
      <div className="pt-td pt-cnt" role="cell">
        {first&&!grp.pick&&<><span className="pt-cl">{L('Egzersiz Adedi','Exercises')}</span><span className="pt-step cnt on">
          <input type="number" min={1} max={grp.max} value={grp.count} aria-label={lab(L('Egzersiz adedi','Exercises'))}
            onChange={e=>{if(e.target.value!=='')cb.onCount(gid,Number(e.target.value));}}/>
          <span className="pt-spin">
            <button type="button" tabIndex={-1} disabled={grp.count>=grp.max} aria-label={L('Bir egzersiz ekle','One more exercise')}
              onClick={()=>cb.onCount(gid,grp.count+1)}/>
            <button type="button" tabIndex={-1} disabled={grp.count<=1} aria-label={L('Bir egzersiz çıkar','One exercise fewer')}
              onClick={()=>cb.onCount(gid,grp.count-1)}/>
          </span></span></>}
      </div>
      {dose('',lab)}
    </div>
    <div className={'pt-tr pt-sec'+(showAlt?' alt':'')} role="row" style={style}>
      <div className="pt-pat" role="rowheader"/>
      <div className="pt-td pt-ex" role="cell">
        <div className="pt-alt">
          {showAlt
            ?<><span className="pt-altk" title={L('Bu egzersiz yapılamazsa yerine yapılacak egzersiz','What is done if this exercise cannot be')}>⇄</span>
              <div className="pt-exname alt">
                <ExNameField value={slot.a_name||''} onChange={v=>f('a_name',v)} onPick={it=>cb.onPick(k,it,true)}/>
              </div>
              <button type="button" className="pt-altx" onClick={()=>{setAltOn(false);cb.onSlot(k,{alt:null});}}
                aria-label={L('Alternatifi sil','Delete the alternative')} title={L('Alternatifi sil','Delete the alternative')}>✕</button></>
            :<button type="button" className="pt-altadd" onClick={()=>setAltOn(true)}
              title={L('Bu egzersiz yapılamazsa yerine ne yapılacağını yaz','Write what is done instead of this exercise')}>
              {L('Alternatif Ekle','Add Alternative')}</button>}
        </div>
      </div>
      {showAlt
        ?<><div className="pt-td pt-cnt" role="cell"/>{dose('a_',alab)}</>
        :noteBox}
    </div>
    {showAlt&&<div className="pt-tr pt-sec note" role="row" style={style}>
      <div className="pt-pat" role="rowheader"/><div className="pt-td pt-ex" role="cell"/>{noteBox}
    </div>}
  </>);
},(a,b)=>a.gid===b.gid&&a.first===b.first&&a.cb===b.cb&&a.ids===b.ids&&a.hasDetail===b.hasDetail&&a.detailOpen===b.detailOpen
  &&ptSame(a.slot,b.slot)&&a.grp.label===b.grp.label&&a.grp.color===b.grp.color&&a.grp.count===b.grp.count
  &&a.grp.max===b.grp.max&&a.grp.pick===b.grp.pick&&a.grp.options===b.grp.options);

function PlanTable({chips,groups,selected,total,handlers,max,detail,hasDetail,empty,children}){
  const uid=useRef(0);if(!uid.current)uid.current=++PT_UID;
  const ids=useMemo(()=>({tempo:`pt-tempo-${uid.current}`,rpe:`pt-rpe-${uid.current}`,load:`pt-load-${uid.current}`,rest:`pt-rest-${uid.current}`}),[]);
  const sug=ptSuggest();
  const[openDet,setOpenDet]=useState(()=>new Set());
  /* The handlers a row holds on to have to keep their identity, or the memo never holds. */
  const live=useRef(handlers);live.current=handlers;
  const cb=useMemo(()=>({
    onSlot:(k,p)=>live.current.onSlot(k,p),
    onPick:(k,it,alt)=>live.current.onPick(k,it,alt),
    onNew:handlers.onNew?((k,nm)=>live.current.onNew&&live.current.onNew(k,nm)):null,
    onRemove:k=>live.current.onRemove(k),
    onRemoveGroup:g=>live.current.onRemoveGroup(g),
    onCount:(g,n)=>live.current.onCount(g,n),
    onPattern:(k,p)=>live.current.onPattern&&live.current.onPattern(k,p),
    onLinkBlur:(k,alt,v)=>live.current.onLinkBlur&&live.current.onLinkBlur(k,alt,v),
    toggleDetail:k=>setOpenDet(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;}),
  // eslint-disable-next-line
  }),[!!handlers.onNew]);
  const rows=groups.filter(g=>g.slots.length);
  return(<div className="pt">
    <div className="pt-top">
      <div className="pt-chips" role="group" aria-label={L('Hareket paterni','Movement pattern')}>
        {chips.map(c=><button key={c.id} type="button" aria-pressed={!!c.on}
          className={'pt-chip'+(c.on?' on':'')+(c.warn?' warn':'')} title={c.title||undefined}
          onClick={()=>handlers.onChip(c.id)}>{c.label}{c.warn?<i>!</i>:null}</button>)}
      </div>
      {total!=null&&<span className={'pt-n'+(selected?' on':'')}>
        <b>{L(`${selected} seçili`,`${selected} selected`)}</b> / {L(`${total} patern`,`${total} patterns`)}</span>}
    </div>
    {rows.length>0
      ?<div className="pt-scroll"><div className="pt-grid" role="table" aria-label={L('Antrenman tablosu','Training table')}>
        <datalist id={ids.tempo}>{sug.tempo.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.rpe}>{sug.rpe.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.load}>{sug.load.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.rest}>{sug.rest.map(o=><option key={o} value={o}/>)}</datalist>
        <div className="pt-tr pt-th" role="row">
          {[L('Patern','Pattern'),L('Egzersiz','Exercise'),L('Egzersiz Adedi','Exercises'),L('Set','Sets'),L('Tekrar','Reps'),
            L('Süre','Time'),'Tempo','RPE',L('Yük','Load'),L('Dinlenme','Rest'),'Link']
            .map((h,i)=><span key={i} role="columnheader">{h}</span>)}
        </div>
        {rows.map(g=><div key={g.id} className="pt-grp" role="rowgroup">
          {g.slots.map((s,ix)=><React.Fragment key={s.key}>
            <PtRow gid={g.id} slot={s} grp={{label:g.label,color:g.color,count:g.slots.length,max:max||6,pick:!!g.pick,options:g.options}}
              first={ix===0} cb={cb} ids={ids} hasDetail={!!hasDetail} detailOpen={openDet.has(s.key)}/>
            {hasDetail&&openDet.has(s.key)&&<div className="pt-detail" role="row"><div role="cell">{detail(s.key)}</div></div>}
          </React.Fragment>)}
        </div>)}
      </div></div>
      :<div className="pt-empty">{empty||L('Paterni seçince egzersizleri burada açılır.','Pick a pattern to write its exercises here.')}</div>}
    {children}
  </div>);
}

/* ---- The calendar's version ----------------------------------------------
   A block's exercises are an ordered list; the table reads it as it is, in running order,
   and only folds neighbours that share a pattern into one group — so the sheet, the printout
   and the athlete's copy keep the order the session is run in. A chip adds a pattern at the
   end of the section; the stepper adds or drops an exercise at the end of its group. Every
   edit is written straight back onto the exercise, with the same tagging rules the old
   one-card-per-exercise editor had (pattern ↔ execution ↔ library). */
function CalSlotDetail({ex,onChange,onMove,first,last}){
  const f=(k,v)=>onChange({...ex,[k]:v});
  const styles=exStylesFor(ex.pattern);
  const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:null;
  const exClip=useExerciseClipboard();
  const pasteEx=()=>{if(!exClip)return;onChange(slotFromExClipboard(ex,exClip));
    rememberExerciseTags(exClip.name,exClip.pattern||'',exClip.plane||'');};
  return(<div className="pt-det">
    <label className="pt-dl">{L('Uygulama','Execution')}
      <select value={ex.plane||''} disabled={!styles.length}
        title={styles.length?L('Örüntünün nasıl uygulandığı','How the pattern is executed'):L('Önce bir hareket örüntüsü seç','Pick a movement pattern first')}
        onChange={e=>{onChange({...ex,plane:e.target.value});rememberExerciseTags(ex.name,ex.pattern,e.target.value);}}>
        <option value="">{styles.length?L('— seçilmedi','— not set'):'—'}</option>
        {styles.map(o=><option key={o} value={o}>{exLabel(o)}</option>)}
      </select>
    </label>
    <label className="pt-dl">{L('Görsel','Image')}
      <ExImgBtn image={ex.image||''} onChange={url=>{f('image',url||'');rememberExerciseImage(ex.name,url||'');}}/></label>
    {(alt&&String(alt.name||'').trim())&&<label className="pt-dl wide">{L('Alternatif neden?','Why this alternative?')}
      <LiveInput value={alt.reason||''} onChange={v=>onChange({...ex,alt:{...alt,reason:v}})}
        placeholder={L('ör. Omuz ağrısı nedeniyle nötr tutuş — aynı örüntü, ağrısız açı.','e.g. Shoulder pain, so a neutral grip — same pattern, pain-free angle.')}/></label>}
    <span className="pt-dacts">
      <button type="button" className="btn xs sec" onClick={()=>onMove(-1)} disabled={first} title={L('Yukarı taşı','Move up')}>↑</button>
      <button type="button" className="btn xs sec" onClick={()=>onMove(1)} disabled={last} title={L('Aşağı taşı','Move down')}>↓</button>
      <button type="button" className="btn xs sec" disabled={!exClip} onClick={pasteEx}
        title={exClip?L(`Yapıştır: ${exClip.name||'egzersiz'}`,`Paste: ${exClip.name||'exercise'}`):L('Panoda egzersiz yok — Ass. Coach kutusundan Copy\'ye bas','Nothing on the clipboard — click Copy in the Assistant Coach box')}>⇩ {L('Yapıştır','Paste')}</button>
    </span>
  </div>);
}
function CalPlanGrid({rows,labels,fns,phase,loose,onAdd,onRemoveIdx}){
  const byI=useMemo(()=>{const m={};rows.forEach(r=>{m[r.i]=r.ex;});return m;},[rows]);
  const rowsRef=useRef(rows);rowsRef.current=rows;
  const fnsRef=useRef(fns);fnsRef.current=fns;
  /* Neighbours sharing a pattern fold into one group; a row with no pattern yet gathers
     with its unpatterned neighbours and asks for one. */
  const runs=useMemo(()=>{
    const out=[];
    rows.forEach(r=>{
      const p=r.ex.pattern||'';const last=out[out.length-1];
      if(last&&last.pat===p)last.rows.push(r);else out.push({pat:p,rows:[r]});
    });
    return out;
  },[rows]);
  const patOpts=useMemo(()=>EX_PATTERNS.map(p=>({id:p,label:exLabel(p)})),[]);
  const groups=runs.map((run,gi)=>({
    id:`${gi}:${run.pat}`,pat:run.pat,
    label:run.pat?exLabel(run.pat):L('Patern seçilmedi','No pattern'),
    color:run.pat?ML_PIE_COLS[run.pat]:'',pick:!run.pat,options:patOpts,
    slots:run.rows.map(r=>{const ex=r.ex;const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:null;
      const tg=String(labels[r.i]||'');
      const a=alt||{};
      return{key:r.i,tag:tg.replace(/\.$/,''),tagVal:String(ex.superset||'').toUpperCase(),
        name:ex.name||'',link:ex.link||'',sets:ex.sets||'',reps:ex.reps||'',duration:ex.duration||'',
        tempo:ex.tempo||'',rpe:ex.rpe||'',load:ex.load||'',rest:ex.rest||'',note:exDesc(ex),
        a_name:a.name||'',a_sets:a.sets||'',a_reps:a.reps||'',a_duration:a.duration||'',a_tempo:a.tempo||'',
        a_rpe:a.rpe||'',a_load:a.load||'',a_rest:a.rest||'',a_link:a.link||'',
        sub:ex.plane?exLabel(ex.plane):'',tagP:ex.pattern||'',tagS:ex.plane||''};})}));
  const chips=EX_PATTERNS.map(p=>({id:p,label:exLabel(p),on:rows.some(r=>r.ex.pattern===p)}));
  const selected=chips.filter(c=>c.on).length;
  const named=ex=>!!(String(ex.name||'').trim()||String(ex.sets||'').trim()||String(ex.reps||'').trim());
  const confirmDrop=list=>!list.some(r=>named(r.ex))||confirm(L(
    `${list.length} egzersiz silinecek. Devam edilsin mi?`,`${list.length} exercise${list.length>1?'s':''} will be deleted. Continue?`));
  const groupById=id=>groups.find(g=>g.id===id);
  const rowsOfGroup=id=>{const run=runs[parseInt(id,10)];return run?run.rows:[];};
  const edit=(k,fn)=>{const f=fnsRef.current[k];if(f)f.update(fn);};
  const setPattern=(ex,v)=>{
    const keep=exStylesFor(v).includes(ex.plane)?ex.plane:'';
    const plane=keep||exGuessStyle(ex.name,v);
    rememberExerciseTags(ex.name,v,plane);
    return{...ex,pattern:v,plane};
  };
  const handlers={
    onChip:p=>{
      const hit=rowsRef.current.filter(r=>r.ex.pattern===p);
      if(!hit.length){
        /* A block opens with one blank row: the first pattern picked takes it over rather
           than leaving it behind as an orphan above the real rows. */
        const blank=rowsRef.current.find(r=>!r.ex.pattern&&!named(r.ex)&&!String(r.ex.description||'').trim());
        if(blank){edit(blank.i,ex=>setPattern(ex,p));return;}
        onAdd(phase,p,null);return;
      }
      if(confirmDrop(hit))onRemoveIdx(hit.map(r=>r.i));
    },
    onCount:(gid,n)=>{
      const rs=rowsOfGroup(gid);if(!rs.length)return;
      const want=Math.max(1,Math.min(12,Math.round(n)||1));
      if(want>rs.length)onAdd(phase,rs[0].ex.pattern||'',rs[rs.length-1].i,want-rs.length);
      else if(want<rs.length){const drop=rs.slice(want);if(confirmDrop(drop))onRemoveIdx(drop.map(r=>r.i));}
    },
    onSlot:(k,patch)=>edit(k,ex=>{
      const nx={...ex};
      Object.keys(patch).forEach(key=>{
        const v=patch[key];
        if(key==='name'){
          /* Typing a name the library knows brings its picture across, but a picture the
             coach put on THIS row is never replaced. */
          const cur=String(ex.image||'').trim();
          nx.name=v;
          if(!cur){const lo=String(v||'').trim().toLowerCase();
            const hit=lo?getLibItems().find(it=>(it.name||'').trim().toLowerCase()===lo):null;
            if(hit&&hit.image)nx.image=hit.image;}
          /* A name the library knows brings its saved link, unless the row already has one. */
          if(!String(ex.link||'').trim()){const lk=libLinkOf(v);if(lk)nx.link=lk;}
        }
        else if(key==='note')nx.description=v;
        else if(key==='alt'){delete nx.alt;}                       // the alternative, deleted
        else if(key.startsWith('a_')){
          const al={...((ex.alt&&typeof ex.alt==='object')?ex.alt:{}),[key.slice(2)]:v};
          if(key==='a_name'&&!String(al.link||'').trim()){const lk=libLinkOf(v);if(lk)al.link=lk;}
          nx.alt=al;
        }
        else nx[key]=v;
      });
      /* An alternative with nothing left in it is no alternative. */
      if(nx.alt&&!['name','sets','reps','duration','tempo','rpe','load','rest','link','reason'].some(f=>String(nx.alt[f]||'').trim()))delete nx.alt;
      return nx;
    }),
    onPick:(k,it,isAlt)=>edit(k,ex=>{
      if(isAlt){const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:{};
        return{...ex,alt:{...alt,name:it.name,link:it.link||alt.link||'',description:it.desc||alt.description||'',...(exTagsFromLib(it,alt)||{})}};}
      return{...ex,name:it.name,image:it.image||ex.image||'',link:it.link||ex.link||'',
        description:it.desc||ex.description||'',...(exTagsFromLib(it,ex)||{})};
    }),
    onNew:(k,nm)=>edit(k,ex=>{
      if(ex.plane)return ex;
      const t=ex.pattern?{pattern:ex.pattern,plane:exGuessStyle(nm,ex.pattern)}:exResolveTags(nm,'','');
      if(!t.pattern||!t.plane)return ex;
      rememberExerciseTags(nm,t.pattern,t.plane);
      return{...ex,name:nm,pattern:t.pattern,plane:t.plane};
    }),
    onRemove:k=>{if(fnsRef.current[k])fnsRef.current[k].onRemove();},
    onRemoveGroup:gid=>{const rs=rowsOfGroup(gid);if(rs.length&&confirmDrop(rs))onRemoveIdx(rs.map(r=>r.i));},
    onPattern:(k,p)=>edit(k,ex=>setPattern(ex,p)),
    onLinkBlur:(k,isAlt,v)=>{const ex=byI[k];if(!ex)return;
      rememberExerciseLink(isAlt?(ex.alt&&ex.alt.name):ex.name,v);},
  };
  return(<div className="pt-host">
    <PlanTable chips={loose?[]:chips} groups={groups} selected={selected} total={loose?null:chips.length} handlers={handlers}
      max={12} hasDetail detail={k=>{const ex=byI[k];const pos=rows.findIndex(r=>r.i===k);
        return ex?<CalSlotDetail ex={ex} onChange={fns[k].onChange} onMove={fns[k].onMove} first={pos===0} last={pos===rows.length-1}/>:null;}}
      empty={L('Bir patern seç ya da "+ Egzersiz ekle" ile başla.','Pick a pattern, or start with "+ Add exercise".')}>
      {!loose&&<button type="button" className="iv-addslot pt-add" onClick={()=>onAdd(phase,'',null)}
        title={L('Paternsiz bir egzersiz satırı ekler','Adds an exercise row with no pattern yet')}>
        + {L('Egzersiz ekle','Add exercise')}</button>}
    </PlanTable>
  </div>);
}
