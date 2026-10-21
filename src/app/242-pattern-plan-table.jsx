/* =========================================================
   THE PATTERN TABLE — where a session is written
   =========================================================
   One table, two homes: the calendar's block editor and the individualization brief. "Egzersiz
   Ekle" opens a row and its Kategori box files it; every category is a group of the table: the
   exercise (with its superset tag and an alternative under it), how many exercises of that
   pattern, then the prescription — sets, reps, time, tempo, RPE, load, rest — and a note.

   PlanTable draws it and knows nothing about where the rows live. A host (CalPlanGrid below
   for a calendar block, DiPatternPlan in the brief) hands in plain `groups` of `slots` and
   gets every edit back through `handlers`, addressed by the slot's own `key`:
     onCount(gid,n)           the "how many" stepper of a group
     onSlot(key,patch)        fields of one slot changed (name, link, sets, reps, duration,
                              tempo, rpe, load, rest, note, superset; the alternative's own
                              under a_name, a_sets … a_link; {alt:null} deletes it)
     onPick(key,item,isAlt)   an exercise was picked off the library
     onNew(key,name)          a name the library did not have was typed (optional)
     onRemove(key)            one exercise removed
     onRemoveGroup(gid)       the whole pattern removed
     onRowCat(key,id)         an uncategorised row was given a category
     onGroupCat(gid,id)       the group's category box (Kategori) was changed — every row of the
                              group takes it; '' takes the category off (the rows stay, written as
                              uncategorised work that the load distribution does not count)
     onType(key,id)           the row's type box (Tür: Squat, Yatay İtiş, Anti-rotasyon …) was
                              changed; a slot brings its choices in `typeOpts` [[id,label]…] and the
                              current one in `typeVal` (no box when a slot has none)
     onDir(key,id)            the row's direction box (Yön), the same way: `dirOpts` / `dirVal`
     onMove(key,dir)          the ↑ / ↓ buttons of a row, dir -1 or +1; a slot says whether it can
                              go either way in `canUp` / `canDown` (optional — no buttons without it)
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
/* The row's type (Tür) or direction (Yön), as a small box under its category. Pressing it
   opens the list. */
function PtSel({value,opts,onChange,label,ph}){
  if(!opts||!opts.length)return null;
  const known=opts.some(o=>o[0]===value);
  return(<label className={'pt-type'+(known?' on':'')} title={label}>
    <select value={known?value:''} aria-label={label} onChange={e=>onChange(e.target.value)}>
      <option value="">{ph}</option>
      {opts.map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </select>
  </label>);
}
/* The group's category (Kategori). It comes on its own — the exercise picked off the library
   brings its category — and can be changed, or taken off with ✕: a warm-up drill the library
   files under a category should not read as main work in the load distribution. */
function PtCat({value,color,options,onChange,label}){
  return(<span className={'pt-cat'+(value?' on':'')} style={{'--pat-c':color||'var(--border2)'}}>
    <label className="pt-catsel" title={value?L('Kategori — değiştirmek için seç','Category — pick to change it'):L('Kategori seç','Pick a category')}>
      <i className="pt-dot"/>
      <select value={value||''} aria-label={label} onChange={e=>onChange(e.target.value)}>
        <option value="">{value?L('— Kategorisiz','— No category'):L('Kategori seç…','Pick category…')}</option>
        {options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
    {value&&<button type="button" className="pt-catx" onClick={()=>onChange('')}
      aria-label={L('Kategoriyi kaldır','Remove the category')}
      title={L('Kategoriyi kaldır — egzersiz kalır, yük dağılımına girmez','Remove the category — the exercise stays and is left out of the load distribution')}>✕</button>}
  </span>);
}
/* The exercise's picture, on the left of its card: the one the library carries for that name
   (its cover, else the video's thumbnail), else the one put on the row itself. */
function PtImg({name,image}){
  const hit=exLibHit(name);
  const pic=(hit&&hit.image)||image||'';
  const[bad,setBad]=useState(false);
  useEffect(()=>{setBad(false);},[pic]);
  return(<div className={'pt-img'+(pic&&!bad?' has':'')}>
    {pic&&!bad
      ?<img src={mediaSrc(pic)} alt={name||''} loading="lazy" onError={()=>setBad(true)}/>
      :<span className="pt-img-ph" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>
        <em>{String(name||'').trim()?L('Görsel yok','No image'):L('Egzersiz seç','Pick an exercise')}</em></span>}
  </div>);
}
const ptSame=(a,b)=>{
  const ka=Object.keys(a),kb=Object.keys(b);
  /* `typeOpts` is a fresh array on every draw of the host; it counts as the same when it holds the same. */
  return ka.length===kb.length&&ka.every(k=>a[k]===b[k]||(Array.isArray(a[k])&&Array.isArray(b[k])&&JSON.stringify(a[k])===JSON.stringify(b[k])));
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
  return(<div className={'pt-item'+(first?' first':'')} style={style}>
    <PtImg name={slot.name} image={slot.image}/>
    <div className="pt-body">
    <div className={'pt-tr'+(first?' first':'')} role="row" style={style}>
      <div className="pt-pat" role="rowheader">
        {/* A category covers its whole group and is set on its first row; an uncategorised row is
            given one on its own. */}
        {(first||grp.pick)&&<PtCat value={grp.pick?'':grp.pat} color={grp.color} options={grp.options} label={L('Kategori','Category')}
          onChange={v=>grp.pick?cb.onRowCat(k,v):cb.onGroupCat(gid,v)}/>}
        {(slot.typeOpts&&slot.typeOpts.length>0||slot.dirOpts&&slot.dirOpts.length>0)&&<span className="pt-tdr">
          <PtSel value={slot.typeVal} opts={slot.typeOpts} label={lab(L(...mvTypeLab(grp.pat)))} ph={L(mvTypeLab(grp.pat)[0]+'…',mvTypeLab(grp.pat)[1]+'…')} onChange={v=>cb.onType(k,v)}/>
          <PtSel value={slot.dirVal} opts={slot.dirOpts} label={lab(L(...mvDirLab(grp.pat)))} ph={L(mvDirLab(grp.pat)[0]+'…',mvDirLab(grp.pat)[1]+'…')} onChange={v=>cb.onDir(k,v)}/>
        </span>}
      </div>
      <div className="pt-td pt-ex" role="cell">
        <span className="pt-cl">{L('Egzersiz','Exercise')}</span>
        <div className="pt-exmain">
          <PtTag tag={slot.tag} val={slot.tagVal} onChange={v=>f('superset',v)}/>
          <div className="pt-exname">
            <ExNameField value={slot.name} onChange={v=>f('name',v)} tags={{pattern:slot.tagP,plane:slot.tagS,dir:slot.tagD}}
              onNewName={cb.onNew?(nm=>cb.onNew(k,nm)):undefined}
              onPick={it=>cb.onPick(k,it,false)}/>
          </div>
          {hasDetail&&<button type="button" className={'pt-more'+(detailOpen?' on':'')} aria-expanded={detailOpen}
            onClick={()=>cb.toggleDetail(k)} title={L('Görsel, uygulama ve diğer ayrıntılar','Image, execution and other details')}>⋯</button>}
          {cb.hasMove&&<span className="pt-mv">
            <button type="button" className="up" disabled={!slot.canUp} onClick={()=>cb.onMove(k,-1)}
              aria-label={L('Yukarı taşı','Move up')} title={L('Yukarı taşı','Move up')}/>
            <button type="button" className="dn" disabled={!slot.canDown} onClick={()=>cb.onMove(k,1)}
              aria-label={L('Aşağı taşı','Move down')} title={L('Aşağı taşı','Move down')}/>
          </span>}
          {<button type="button" className="pt-x" onClick={()=>cb.onRemove(k)}
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
                <ExNameField value={slot.a_name||''} onChange={v=>f('a_name',v)} onPick={it=>cb.onPick(k,it,true)}
                  tags={{pattern:slot.tagP}}/>
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
    </div>
  </div>);
},(a,b)=>a.gid===b.gid&&a.first===b.first&&a.cb===b.cb&&a.ids===b.ids&&a.hasDetail===b.hasDetail&&a.detailOpen===b.detailOpen
  &&ptSame(a.slot,b.slot)&&a.grp.label===b.grp.label&&a.grp.color===b.grp.color&&a.grp.count===b.grp.count
  &&a.grp.max===b.grp.max&&a.grp.pick===b.grp.pick&&a.grp.options===b.grp.options&&a.grp.pat===b.grp.pat);

function PlanTable({groups,handlers,max,detail,hasDetail,empty,onAdd,addLabel,children}){
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
    onGroupCat:(g,v)=>live.current.onGroupCat&&live.current.onGroupCat(g,v),
    onRowCat:(k,v)=>live.current.onRowCat&&live.current.onRowCat(k,v),
    onLinkBlur:(k,alt,v)=>live.current.onLinkBlur&&live.current.onLinkBlur(k,alt,v),
    onType:(k,v)=>live.current.onType&&live.current.onType(k,v),
    onDir:(k,v)=>live.current.onDir&&live.current.onDir(k,v),
    onMove:(k,d)=>live.current.onMove&&live.current.onMove(k,d),
    hasMove:!!handlers.onMove,
    toggleDetail:k=>setOpenDet(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;}),
  // eslint-disable-next-line
  }),[!!handlers.onNew,!!handlers.onMove]);
  const rows=groups.filter(g=>g.slots.length);
  return(<div className="pt">
    {rows.length>0
      ?<div className="pt-scroll"><div className="pt-grid" role="table" aria-label={L('Antrenman tablosu','Training table')}>
        <datalist id={ids.tempo}>{sug.tempo.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.rpe}>{sug.rpe.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.load}>{sug.load.map(o=><option key={o} value={o}/>)}</datalist>
        <datalist id={ids.rest}>{sug.rest.map(o=><option key={o} value={o}/>)}</datalist>
        {rows.map(g=><div key={g.id} className="pt-grp" role="rowgroup">
          {g.slots.map((s,ix)=><React.Fragment key={s.key}>
            <PtRow gid={g.id} slot={s} grp={{label:g.label,color:g.color,count:g.slots.length,max:max||6,pick:!!g.pick,options:g.options,pat:g.pat||''}}
              first={ix===0} cb={cb} ids={ids} hasDetail={!!hasDetail} detailOpen={openDet.has(s.key)}/>
            {hasDetail&&openDet.has(s.key)&&<div className="pt-detail" role="row"><div role="cell">{detail(s.key)}</div></div>}
          </React.Fragment>)}
        </div>)}
      </div></div>
      :(onAdd
        ?<button type="button" className="pt-empty pt-emptybtn" onClick={onAdd}>+ {addLabel}</button>
        :<div className="pt-empty">{empty||L('Bir kategori seç ya da egzersiz ekle.','Pick a category or add an exercise.')}</div>)}
    {rows.length>0&&onAdd&&<button type="button" className="iv-addslot pt-add" onClick={onAdd}>+ {addLabel}</button>}
    {children}
  </div>);
}

/* ---- Phases and the load window: one look for both homes ------------------
   The calendar's block editor and the individualization brief cut a session into phases the
   same way, so they draw them with the same three pieces: the bar that adds a phase (only the
   ready-made phases not open yet, then a phase named by hand) with the weekly load
   distribution at its right, the header of each phase (fold, name typed over, how many
   exercises, ✕), and the tray of rows not placed in a phase. */
/* Whose weekly load distribution the bar's button opens: the calendar (team or athlete) and the
   brief provide it; without a provider there is no button. */
const PlanLoadCtx=React.createContext(null);
function LoadDistButton(){
  const ctx=React.useContext(PlanLoadCtx);
  const[open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const esc=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('keydown',esc);
    return()=>document.removeEventListener('keydown',esc);
  },[open]);
  if(!ctx)return null;
  return(<>
    <button type="button" className={'pp-load'+(open?' on':'')} aria-pressed={open} onClick={()=>setOpen(o=>!o)}
      title={L('Haftalık yük dağılımını bir pencerede göster — kategori ve türe göre','Show the weekly load distribution in a window — by category and type')}>
      <i aria-hidden="true">◔</i><span>{L('Haftalık Yük Dağılımı','Weekly Load Distribution')}</span></button>
    {/* A small window at the side of the screen — no backdrop, the page behind stays usable. */}
    {open&&ReactDOM.createPortal(<aside className="di-loadwin" role="dialog" aria-label={L('Haftalık Yük Dağılımı','Weekly Load Distribution')}>
      <div className="di-loadwin-hd">
        <b>{L('Haftalık Yük Dağılımı','Weekly Load Distribution')}{ctx.name?` — ${ctx.name}`:''}</b>
        <button type="button" className="x-btn" onClick={()=>setOpen(false)} aria-label={L('Kapat','Close')}>✕</button>
      </div>
      <div className="di-loadwin-body">
        <MuscleLoadDistribution days={ctx.days||{}} refDate={ctx.date} title={L('Yük Dağılımı','Load Distribution')}/>
      </div>
    </aside>,document.body)}
  </>);
}
/* `presets` are the ready-made phases not open yet ({id,label}); `onAdd(id)` opens one, '' a
   phase named by hand. */
function PlanPhaseBar({presets,onAdd}){
  return(<div className="pp-bar">
    <span className="pp-bar-l">{L('Fazlar','Phases')}</span>
    <div className="pp-bar-add">
      {presets.map(p=><button key={p.id} type="button" className="pp-add" onClick={()=>onAdd(p.id)}
        title={L('Hazır faz — adı yazmana gerek yok','A ready-made phase — no name to type')}>+ {p.label}</button>)}
      <button type="button" className="pp-add custom" onClick={()=>onAdd('')}
        title={L('Adını kendin yazacağın bir faz ekle','Add a phase you name yourself')}>+ {L('Özel Faz','Custom Phase')}</button>
    </div>
    <LoadDistButton/>
  </div>);
}
/* One phase: `cls` is its colour (pc0…pc5, or 'loose' for the tray), `name` its name with
   `onRename` to type over it (none for the tray), `count` how many exercises it holds. */
function PlanPhase({cls,name,onRename,count,unit,folded,onFold,onClose,acts,note,children}){
  return(<section className={'pp-sec '+cls+(folded?' folded':'')}>
    <header className="pp-h">
      <button type="button" className="pp-ch" aria-expanded={!folded} onClick={onFold}
        title={folded?L('Bu bölümü aç','Expand this section'):L('Bu bölümü daralt','Collapse this section')}>{folded?'▶':'▼'}</button>
      <i className="pp-dot"/>
      {onRename
        ?<PhaseNameInput className="pp-nm" value={name} onChange={onRename} title={L('Faz adı — değiştirmek için yaz','Phase name — type to change it')}/>
        :<span className="pp-nm static">{name}</span>}
      <span className="pp-n">{count} {unit||L('egzersiz','exercises')}</span>
      {note?<span className="pp-note">{note}</span>:null}
      <span className="pp-acts">{acts}
        {onClose&&<button type="button" className="pp-x" onClick={onClose}
          title={L('Bu fazı kapat — egzersizleri silinmez, fazsıza döner','Close this phase — its exercises are not deleted, they go back to unplaced')}
          aria-label={L('Fazı kapat','Close the phase')}>✕</button>}</span>
    </header>
    {!folded&&<div className="pp-body">{children}</div>}
  </section>);
}

/* ---- The calendar's version ----------------------------------------------
   A block's exercises are an ordered list; the table reads it as it is, in running order,
   and only folds neighbours that share a category into one group — so the sheet, the printout
   and the athlete's copy keep the order the session is run in. A chip adds a category at the
   end of the section; the stepper adds or drops an exercise at the end of its group. Every
   edit is written straight back onto the exercise: its category in `pattern` (with `noPat`
   when the coach took it off), its type in `plane`, its direction in `dir`. */
function CalSlotDetail({ex,onChange}){
  const f=(k,v)=>onChange({...ex,[k]:v});
  const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:null;
  const exClip=useExerciseClipboard();
  const pasteEx=()=>{if(!exClip)return;onChange(slotFromExClipboard(ex,exClip));
    rememberExerciseTags(exClip.name,exClip.pattern||'',exClip.plane||'');};
  return(<div className="pt-det">
    <label className="pt-dl">{L('Görsel','Image')}
      <ExImgBtn image={ex.image||''} onChange={url=>{f('image',url||'');rememberExerciseImage(ex.name,url||'');}}/></label>
    {(alt&&String(alt.name||'').trim())&&<label className="pt-dl wide">{L('Alternatif neden?','Why this alternative?')}
      <LiveInput value={alt.reason||''} onChange={v=>onChange({...ex,alt:{...alt,reason:v}})}
        placeholder={L('ör. Omuz ağrısı nedeniyle nötr tutuş — aynı örüntü, ağrısız açı.','e.g. Shoulder pain, so a neutral grip — same pattern, pain-free angle.')}/></label>}
    <span className="pt-dacts">
      <button type="button" className="btn xs sec" disabled={!exClip} onClick={pasteEx}
        title={exClip?L(`Yapıştır: ${exClip.name||'egzersiz'}`,`Paste: ${exClip.name||'exercise'}`):L('Panoda egzersiz yok — Ass. Coach kutusundan Copy\'ye bas','Nothing on the clipboard — click Copy in the Assistant Coach box')}>⇩ {L('Yapıştır','Paste')}</button>
    </span>
  </div>);
}
/* The category options of the Kategori box, one list for both homes (`id` is what the host stores). */
const ptCatOpts=(idOf)=>MV_CATS.map(c=>({id:idOf(c),label:L(c.tr,c.en)}));
const ptTypeOpts=k=>{const c=mvCat(k);return c?c.types.map(t=>[t[0],L(t[1],t[2])]):[];};
const ptDirOpts=k=>{const c=mvCat(k);return c?c.dirs.map(t=>[t[0],L(t[1],t[2])]):[];};
function CalPlanGrid({rows,labels,fns,phase,loose,onAdd,onRemoveIdx}){
  const byI=useMemo(()=>{const m={};rows.forEach(r=>{m[r.i]=r.ex;});return m;},[rows]);
  const rowsRef=useRef(rows);rowsRef.current=rows;
  const fnsRef=useRef(fns);fnsRef.current=fns;
  /* A row's category as the table reads it: what is written on it, else — unless the coach
     took it off — nothing (the library fills it in when the exercise is picked). */
  const catOf=ex=>ex.noPat?'':(MV_KEYS.includes(ex.pattern)?ex.pattern:'');
  /* Neighbours sharing a category fold into one group; a row with no category yet gathers
     with its uncategorised neighbours and asks for one. */
  const runs=useMemo(()=>{
    const out=[];
    rows.forEach(r=>{
      const p=catOf(r.ex);const last=out[out.length-1];
      if(last&&last.pat===p)last.rows.push(r);else out.push({pat:p,rows:[r]});
    });
    return out;
  },[rows]);
  const patOpts=useMemo(()=>ptCatOpts(c=>c.k),[REPORT_LANG]);
  const posOf=useMemo(()=>{const m={};rows.forEach((r,ix)=>{m[r.i]=ix;});return m;},[rows]);
  const groups=runs.map((run,gi)=>({
    id:`${gi}:${run.pat}`,pat:run.pat,
    label:run.pat?mvCatLabel(run.pat):L('Kategorisiz','No category'),
    color:run.pat?ML_PIE_COLS[run.pat]:'',pick:!run.pat,options:patOpts,
    slots:run.rows.map(r=>{const ex=r.ex;const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:null;
      const tg=String(labels[r.i]||'');
      const a=alt||{};
      const ty=run.pat?mvNormType(run.pat,ex.plane,ex.name):'';
      return{key:r.i,tag:tg.replace(/\.$/,''),tagVal:String(ex.superset||'').toUpperCase(),
        name:ex.name||'',image:ex.image||'',link:ex.link||'',sets:ex.sets||'',reps:ex.reps||'',duration:ex.duration||'',
        tempo:ex.tempo||'',rpe:ex.rpe||'',load:ex.load||'',rest:ex.rest||'',note:exDesc(ex),
        a_name:a.name||'',a_sets:a.sets||'',a_reps:a.reps||'',a_duration:a.duration||'',a_tempo:a.tempo||'',
        a_rpe:a.rpe||'',a_load:a.load||'',a_rest:a.rest||'',a_link:a.link||'',
        typeOpts:ptTypeOpts(run.pat),typeVal:ty,
        dirOpts:ptDirOpts(run.pat),dirVal:run.pat?mvNormDir(run.pat,ex.dir,ex.name,ty):'',
        canUp:posOf[r.i]>0,canDown:posOf[r.i]<rows.length-1,
        tagP:run.pat,tagS:ty,tagD:ex.dir||''};})}));
  const named=ex=>!!(String(ex.name||'').trim()||String(ex.sets||'').trim()||String(ex.reps||'').trim());
  const confirmDrop=list=>!list.some(r=>named(r.ex))||confirm(L(
    `${list.length} egzersiz silinecek. Devam edilsin mi?`,`${list.length} exercise${list.length>1?'s':''} will be deleted. Continue?`));
  const rowsOfGroup=id=>{const run=runs[parseInt(id,10)];return run?run.rows:[];};
  const edit=(k,fn)=>{const f=fnsRef.current[k];if(f)f.update(fn);};
  /* A row given a category keeps the type and direction it has where they are the category's,
     and reads the rest off its name. '' takes the category off: the row stays, uncounted. */
  const setPattern=(ex,v)=>{
    if(!v){const{pattern,plane,dir,...rest}=ex;return{...rest,pattern:'',plane:'',dir:'',noPat:true};}
    const plane=mvNormType(v,ex.pattern===v?ex.plane:'',ex.name);
    const dir=mvNormDir(v,ex.pattern===v?ex.dir:'',ex.name,plane,'');
    rememberExerciseTags(ex.name,v,plane,dir);
    const{noPat,...rest}=ex;
    return{...rest,pattern:v,plane,dir};
  };
  const handlers={
    onCount:(gid,n)=>{
      const rs=rowsOfGroup(gid);if(!rs.length)return;
      const want=Math.max(1,Math.min(12,Math.round(n)||1));
      if(want>rs.length)onAdd(phase,catOf(rs[0].ex),rs[rs.length-1].i,want-rs.length);
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
    /* Picking an exercise off the library brings its category, type and direction with it — the
       category comes on its own, and the coach can still take it off. */
    onPick:(k,it,isAlt)=>edit(k,ex=>{
      if(isAlt){const alt=(ex.alt&&typeof ex.alt==='object')?ex.alt:{};
        return{...ex,alt:{...alt,name:it.name,link:it.link||alt.link||'',description:it.desc||alt.description||''}};}
      const t=exTagsFromLib(it,{});
      const nx={...ex,name:it.name,image:it.image||ex.image||'',link:it.link||ex.link||'',description:it.desc||ex.description||''};
      if(t&&t.pattern){delete nx.noPat;nx.pattern=t.pattern;nx.plane=t.plane||'';nx.dir=t.dir||'';}
      return nx;
    }),
    /* A typed name: a row with no category takes the one the library (or the name) gives it —
       unless the coach took it off — and a categorised row with no type yet takes its type. */
    onNew:(k,nm)=>edit(k,ex=>{
      if(ex.noPat)return ex;
      const hit=exLibHit(nm),lt=hit?exTagsFromLib(hit,ex):null;
      if(!ex.pattern){
        const t=lt||exResolveTags(nm,'','');
        if(!t.pattern)return ex;
        const dir=t.dir||mvGuessDir(t.pattern,nm,t.plane);
        rememberExerciseTags(nm,t.pattern,t.plane,dir);
        return{...ex,name:nm,pattern:t.pattern,plane:t.plane||'',dir};
      }
      if(mvTypes(ex.pattern).includes(ex.plane))return ex;
      const plane=mvNormType(ex.pattern,'',nm);
      return plane?{...ex,plane,dir:ex.dir||mvGuessDir(ex.pattern,nm,plane)}:ex;
    }),
    onRemove:k=>{if(fnsRef.current[k])fnsRef.current[k].onRemove();},
    onGroupCat:(gid,v)=>{const rs=rowsOfGroup(gid);rs.forEach(r=>edit(r.i,ex=>setPattern(ex,v)));},
    onRowCat:(k,v)=>edit(k,ex=>setPattern(ex,v)),
    onType:(k,v)=>{const ex=byI[k];if(!ex)return;
      const dir=ex.dir||mvGuessDir(ex.pattern,ex.name,v);
      rememberExerciseTags(ex.name,ex.pattern,v,dir);edit(k,x=>({...x,plane:v,dir}));},
    onDir:(k,v)=>{const ex=byI[k];if(!ex)return;rememberExerciseTags(ex.name,ex.pattern,ex.plane,v);edit(k,x=>({...x,dir:v}));},
    onMove:(k,d)=>{const f=fnsRef.current[k];if(f)f.onMove(d);},
    onLinkBlur:(k,isAlt,v)=>{const ex=byI[k];if(!ex)return;
      rememberExerciseLink(isAlt?(ex.alt&&ex.alt.name):ex.name,v);},
  };
  return(<div className="pt-host">
    <PlanTable groups={groups} handlers={handlers}
      max={12} hasDetail detail={k=>{const ex=byI[k];
        return ex?<CalSlotDetail ex={ex} onChange={fns[k].onChange}/>:null;}}
      onAdd={loose?undefined:()=>onAdd(phase,'',null)} addLabel={L('Egzersiz Ekle','Add Exercise')}
      empty={L('Fazsız satır yok.','No unplaced rows.')}/>
  </div>);
}
