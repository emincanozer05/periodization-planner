/* =========================================================
   SESSION EDITOR
   ========================================================= */
/* Multi-select dropdown for session focus — shows selected values on the trigger,
   opens a checkbox list; closes on outside click.
   What is already selected is listed first so the coach can read the current choice at a
   glance. The order is snapshotted when the list opens (`pin`), not recomputed on every
   tick, so an option never jumps out from under the cursor mid-click. */
/* ---- Where a dropdown panel goes on screen --------------------------------
   A block is a rounded card with `overflow:hidden`, which is what gives it its clipped
   corners — and what used to cut every one of these panels off at the card's edge. So
   the panel is not laid out inside the field any more: it is measured against the
   trigger and rendered into a body portal at fixed coordinates, where no ancestor's
   overflow can reach it. It flips above the field when the space below is too tight,
   and never leaves the viewport sideways. Returns null while closed (nothing to
   measure), so the caller can guard on it. */
/* `ignore` (refs, optional) are the scrollers whose scrolling must NOT re-anchor the
   panel — the panel's own body, above all. The listener is capturing, so a wheel inside the
   dropdown reached it too and re-rendered the whole panel on every scroll frame. */
function useDDAnchor(ref,open,{width,minWidth=240,maxHeight=340,gap=5,ignore}={}){
  const[,bump]=useState(0);
  const ig=useRef(ignore);ig.current=ignore;
  useEffect(()=>{
    if(!open)return;
    const h=()=>bump(n=>n+1);
    const onScroll=e=>{
      const list=ig.current;
      if(list&&list.some(r=>r&&r.current&&(r.current===e.target||r.current.contains(e.target))))return;
      h();
    };
    window.addEventListener('resize',h);window.addEventListener('scroll',onScroll,true);
    return()=>{window.removeEventListener('resize',h);window.removeEventListener('scroll',onScroll,true);};
  },[open]);
  if(!open||!ref.current)return null;
  const r=ref.current.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight;
  const w=Math.min(Math.max(width||r.width,minWidth),vw-24);
  const left=Math.max(12,Math.min(r.left,vw-12-w));
  const below=vh-r.bottom-gap-8,above=r.top-gap-8;
  const up=below<Math.min(maxHeight,220)&&above>below;
  return up
    ?{position:'fixed',left,bottom:vh-r.top+gap,width:w,maxHeight:Math.min(maxHeight,above)}
    :{position:'fixed',left,top:r.bottom+gap,width:w,maxHeight:Math.min(maxHeight,below)};
}
/* Close the panel when the pointer goes down anywhere that is neither the field nor the
   portalled panel itself. Both have to be checked by hand: the panel is not a DOM
   descendant of the field any more, so `field.contains(target)` alone would shut it on
   its own options. */
function useDDOutside(refs,open,close){
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(!refs.some(r=>r.current&&r.current.contains(e.target)))close();};
    const k=e=>{if(e.key==='Escape')close();};
    document.addEventListener('mousedown',h);document.addEventListener('keydown',k);
    return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k);};
  },[open,close]);   // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---- Session focus, in two stages -----------------------------------------
   One control, two questions, asked in the order the answer is actually arrived at:

     1  Focus      what quality are we developing?
     2  Sub-Focus  which capacity inside it?

   It asked a third — how are we training it — and that was one question too many: the
   panel already sits directly above a Training Method field with its own, longer taxonomy,
   so the coach was being asked the same thing twice, in two vocabularies, and had to
   scroll past a wall of methods to reach Done. This control answers WHAT the session
   trains; the box below it answers HOW.

   Nothing is asked before it can be answered: stage 2 does not exist until a focus is
   ticked. Ticking the first focus slides it in underneath on a short height-and-fade
   transition rather than snapping, so the panel reads as one form growing a step at a time.

   Both stages are multi-select, and stage 2's options are the union of what the ticked
   focuses offer, kept under the heading of the focus they belong to. Unticking a focus
   takes its sub-focuses with it: a capacity left behind by the quality that justified it
   is not a record of anything. */
/* Both of these are declared HERE rather than inside FocusSelect. Declared in the render
   body they were a brand-new component type on every render, so React threw the whole
   panel away and built it again — and `fx-stage-in` replayed from clip-path:inset(0 0 100%)
   each time. Scrolling the panel re-anchors it, which renders it, which made the text blink
   out and back on every wheel notch. */
const FxOpt=({v,on,tog,c})=>(
  <label className={`focus-opt${on?' on':''}`} style={c?{'--fo-c':c}:undefined}>
    <input type="checkbox" checked={on} onChange={()=>tog(v)}/>
    <span>{exLabel(v)}</span>
  </label>);
/* A stage, with the heading that says which question it is answering. `n` drives the
   step badge and the stagger, so the panels arrive in reading order. */
const FxStage=({n,title,hint,children})=>(
  <div className="fx-stage" style={{'--fx-i':n}}>
    <div className="fx-stage-hd"><b>{n}</b><span>{title}</span><i>{hint}</i></div>
    {children}
  </div>);

function FocusSelect({value,sub,onChange,onSubChange,placeholder}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null),ddRef=useRef(null);
  const close=useCallback(()=>setOpen(false),[]);
  useDDOutside([ref,ddRef],open,close);
  const box=useDDAnchor(ref,open,{width:420,minWidth:300,maxHeight:460,ignore:[ddRef]});

  const sel=Array.isArray(value)?value:[];
  const subSel=Array.isArray(sub)?sub:[];
  /* The focuses the panel is built from: what is ticked, in FOCUS_TREE order. A stored
     value the tree no longer knows is dropped here rather than drawn as an empty group. */
  const active=FOCUS_TREE.filter(f=>sel.includes(f.id));
  const stage=active.length===0?1:2;
  /* A stage that opens below the fold of a panel this tall has not really opened. When a
     new one arrives, the panel scrolls just far enough to show it — `nearest`, so a stage
     already in view is left exactly where it is. */
  const lastStage=useRef(1);
  useEffect(()=>{
    if(open&&stage>lastStage.current&&ddRef.current){
      const st=ddRef.current.querySelectorAll('.fx-stage');
      const last=st[st.length-1];
      if(last)last.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
    lastStage.current=open?stage:1;
  },[stage,open]);

  const toggleFocus=f=>{
    if(!sel.includes(f)){onChange([...sel,f]);return;}
    // Dropping a focus drops what hung off it — unless another ticked focus offers the
    // same sub-focus, in which case it is still justified and stays.
    const rest=sel.filter(x=>x!==f);
    onChange(rest);
    const keptSub=subSel.filter(s=>rest.includes(SUBFOCUS_OWNER[s]));
    if(keptSub.length!==subSel.length)onSubChange(keptSub);
  };
  const toggleSub=s=>onSubChange(subSel.includes(s)?subSel.filter(x=>x!==s):[...subSel,s]);

  const summary=[...sel,...subSel].map(exLabel);

  return(<div ref={ref} className="focus-sel">
    <button type="button" className={`focus-trig${open?' open':''}`} onClick={()=>setOpen(o=>!o)}
      title={summary.length?summary.join(' · '):undefined}>
      <span className={summary.length?'':'ph'}>{summary.length?summary.join(', '):(placeholder||L('Odak seç…','Select focus…'))}</span>
      <i>▾</i>
    </button>
    {open&&box&&ReactDOM.createPortal(
      <div ref={ddRef} className="focus-dd fx-dd" style={box}>
        <FxStage n={1} title={L('Seans Odağı','Session Focus')} hint={L('Neyi geliştiriyoruz?','What are we developing?')}>
          <div className="fx-grid">
            {FOCUS_TREE.map(f=><FxOpt key={f.id} v={f.id} c={f.c} on={sel.includes(f.id)} tog={toggleFocus}/>)}
          </div>
        </FxStage>
        {/* Stage 2 is mounted only once it has something to ask, and animates in from
            nothing — the height transition is what makes the panel read as one form
            unfolding rather than two that blink into place. */}
        {stage>=2&&<FxStage n={2} title={L('Alt Odak','Sub-Focus')} hint={L('Hangi kapasite?','Which capacity?')}>
          {active.map(f=><div key={f.id} className="fx-fam" style={{'--fo-c':f.c}}>
            <div className="fx-fam-hd">{exLabel(f.id)}</div>
            <div className="fx-grid">
              {f.sub.map(s=><FxOpt key={s} v={s} c={f.c} on={subSel.includes(s)} tog={toggleSub}/>)}
            </div>
          </div>)}
        </FxStage>}
        <div className="fx-foot">
          <span>{stage===1
            ?L('Bir odak seç — alt odak sorusu altında açılır.','Pick a focus — the sub-focus question opens under it.')
            :L(`${sel.length} odak · ${subSel.length} alt odak`,`${sel.length} focus · ${subSel.length} sub-focus`)}</span>
          {summary.length>0&&<button type="button" className="fx-clear"
            onClick={()=>{onChange([]);onSubChange([]);}}>{L('Temizle','Clear')}</button>}
          <button type="button" className="fx-done" onClick={close}>{L('Bitti','Done')}</button>
        </div>
      </div>,document.body)}
  </div>);
}

/* The goal picker that sits in the session panel's meta bar. Stage 1 of the focus tree and
   nothing else: which qualities is this session for. Multi-select, because a day is rarely
   one thing — a strength session that also does speed work says so with two goals.

   It shares FocusSelect's panel, options and dropdown mechanics rather than growing its
   own, so the two controls answer the same question in the same words; what it does not
   share is stage 2. The sub-focus question belongs in the editor, where the answer has
   room to be read; the bar has room for the heading.

   Each picked goal is drawn in its own quality's colour — the one the focus tree gives it
   everywhere else — which is the only colour in the card that moves: the border stays
   white so the bar reads as one row of boxes rather than a paint chart. */
function GoalPicker({value,onChange,readOnly}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null),ddRef=useRef(null);
  const close=useCallback(()=>setOpen(false),[]);
  useDDOutside([ref,ddRef],open,close);
  const box=useDDAnchor(ref,open,{width:320,minWidth:250,maxHeight:360,ignore:[ddRef]});
  const sel=Array.isArray(value)?value:[];
  const toggle=f=>onChange(sel.includes(f)?sel.filter(x=>x!==f):[...sel,f]);
  const chips=sel.map(f=><span key={f} className="dm-goal-v" style={{color:FOCUS_BY[f]?.c}}>{focusLabel(f)}</span>);
  const tip=sel.length?sel.map(focusLabel).join(' · '):L('Antrenman hedefi seç','Pick the training goal');
  if(readOnly)return<div className="v goal">{sel.length?chips:'—'}</div>;
  return(<div ref={ref} className="dm-goal">
    <button type="button" className={'dm-goal-trig'+(open?' open':'')} onClick={()=>setOpen(o=>!o)} title={tip}>
      <span className="dm-goal-txt">{sel.length?chips:<i className="ph">{L('Seç…','Pick…')}</i>}</span>
      <i className="dm-goal-car">▾</i>
    </button>
    {open&&box&&ReactDOM.createPortal(
      <div ref={ddRef} className="focus-dd fx-dd" style={box}>
        <FxStage n={1} title={L('Antrenman Hedefi','Training Goal')} hint={L('Neyi geliştiriyoruz?','What are we developing?')}>
          <div className="fx-grid">
            {FOCUS_TREE.map(f=><FxOpt key={f.id} v={f.id} c={f.c} on={sel.includes(f.id)} tog={toggle}/>)}
          </div>
        </FxStage>
        <div className="fx-foot">
          <span>{L(`${sel.length} hedef`,`${sel.length} goal${sel.length===1?'':'s'}`)}</span>
          {sel.length>0&&<button type="button" className="fx-clear" onClick={()=>onChange([])}>{L('Temizle','Clear')}</button>}
          <button type="button" className="fx-done" onClick={close}>{L('Bitti','Done')}</button>
        </div>
      </div>,document.body)}
  </div>);
}

/* Training method picker — same dropdown mechanics as FocusSelect, but the options are
   grouped by method family and filterable (the list is long by design).
   `counts` (optional, method → n) turns it into a filter that also reports how often each
   method is used; only non-zero counts get a badge. */
function MethodSelect({value,onChange,placeholder,counts}){
  const[open,setOpen]=useState(false);
  const[q,setQ]=useState('');
  const[pin,setPin]=useState([]);   // selection snapshot taken when the list opens
  const ref=useRef(null),ddRef=useRef(null);
  const close=useCallback(()=>setOpen(false),[]);
  useDDOutside([ref,ddRef],open,close);
  const box=useDDAnchor(ref,open,{width:340,minWidth:260,maxHeight:400,ignore:[ddRef]});
  useEffect(()=>{if(!open)setQ('');},[open]);
  const sel=Array.isArray(value)?value:[];
  const toggle=m=>onChange(sel.includes(m)?sel.filter(x=>x!==m):[...sel,m]);
  const trig=()=>{if(open){setOpen(false);}else{setPin(sel);setOpen(true);}};
  const needle=q.trim().toLowerCase();
  const hit=m=>!needle||m.toLowerCase().includes(needle);
  // Already-picked methods get lifted out of their family into a "Seçilenler" group at the
  // top, so the current selection reads at a glance instead of hiding down the long list.
  const pinned=TRAINING_METHOD_LIST.filter(m=>pin.includes(m)&&hit(m));
  const groups=TRAINING_METHODS
    .map(([g,items])=>[g,items.filter(m=>!pin.includes(m)&&hit(m))])
    .filter(([,items])=>items.length);
  const opt=m=>{const n=counts?(counts[m]||0):0;
    return<label key={m} className={`focus-opt${sel.includes(m)?' on':''}`}>
      <input type="checkbox" checked={sel.includes(m)} onChange={()=>toggle(m)}/>
      <span>{m}</span>
      {n>0&&<b className="focus-cnt">{n}</b>}
    </label>;};
  return(<div ref={ref} className="focus-sel">
    <button type="button" className={`focus-trig${open?' open':''}`} onClick={trig}
      title={sel.length?sel.join(', '):undefined}>
      <span className={sel.length?'':'ph'}>{sel.length?sel.join(', '):(placeholder||'Select training method…')}</span>
      <i>▾</i>
    </button>
    {/* Portalled for the same reason the focus panel is: the block card it sits in clips
        anything that overflows its rounded edge. */}
    {open&&box&&ReactDOM.createPortal(<div ref={ddRef} className="focus-dd" style={box}>
      <input className="focus-search" value={q} autoFocus placeholder={L('Metot ara…','Search methods…')}
        onChange={e=>setQ(e.target.value)} onClick={e=>e.stopPropagation()}/>
      {pinned.length>0&&<div>
        <div className="focus-grp sel">✓ {L('Seçilenler','Selected')}</div>
        {pinned.map(opt)}
        <div className="focus-sep"/>
      </div>}
      {groups.map(([g,items])=><div key={g}>
        <div className="focus-grp">{g}</div>
        {items.map(opt)}
      </div>)}
      {!groups.length&&!pinned.length&&<div className="focus-grp">{L(`“${q}” ile eşleşen metot yok`,`No method matches “${q}”`)}</div>}
    </div>,document.body)}
  </div>);
}

/* Target RPE scale — a rail the coach drags a marker along to set the session's planned
   intensity. One number in, one number out (the centre), but the scale is read (and
   printed) as the two-point band around it — RPE 6-8, not "RPE 7" — which is how coaches
   actually talk about session intensity.

   The whole control is built around one problem the last two versions had: the marker
   trembled under the pointer. Three things caused it, and all three are gone here.
   1. The readout used to sit BESIDE the rail with an auto width, so every time the text
      changed length ("6-8" → "10-10", "HARD" → "MODERATE") the rail resized underneath the
      pointer and the marker jumped. The readout now sits ABOVE the rail, where its width
      cannot touch the rail's.
   2. The marker used to be drawn at the SNAPPED value with a position transition, so it
      spent the whole drag easing towards a point the pointer had already left — chasing and
      overshooting once per step. While dragging it is now drawn at the raw pointer
      position, with no transition at all: it sits exactly under the finger.
   3. The marker used to change SIZE on hover and again on drag (14 → 16 → 18px), which
      moved its edges every time the pointer crossed the box. One size now, scaled with a
      transform, which cannot reflow anything.
   The lit band follows that same raw position while dragging, so the colour glides with the
   marker rather than stepping behind it; only the numbers and the zone word snap, because
   those are what the coach is actually choosing. Letting go settles the marker onto the
   whole point over 140ms — the one intentional bit of motion in the control.

   The rail carries the four bands as tints (1-3 easy, 4-6 moderate, 7-9 hard, 10 max) with
   the ten points written under it, so the scale explains itself; the zone the target lands
   in colours the box, the band, the marker and the words. Pointer events cover mouse, pen
   and touch in one path — capture is taken on pointerdown, so the drag survives the pointer
   leaving the box — and arrow keys step whole points for anyone not using one. */
function RpeGauge({value,onChange,hideZone}){
  const railRef=useRef(null);
  const dragging=useRef(false);
  /* Raw, unrounded position (1-10) while a drag is live; null the rest of the time, which
     is also what tells the rail to go back to animating between whole points. */
  const[raw,setRaw]=useState(null);
  const sent=useRef(null);   // the last point handed upward, so a drag never sends one twice
  const v=sesRpeTarget({rpeTarget:value});
  const[lo,hi]=sesRpeRange({rpeTarget:value});
  const z=rpeZone(v);
  /* Measured off the RAIL, not the padded box around it, so the point under the pointer is
     the point the marker is drawn at — the two used to be a few pixels apart. */
  const posFrom=cx=>{
    const el=railRef.current;if(!el)return null;
    const r=el.getBoundingClientRect();if(!r.width)return null;
    return 1+Math.max(0,Math.min(1,(cx-r.left)/r.width))*9;
  };
  const apply=cx=>{
    const p=posFrom(cx);if(p==null)return;
    setRaw(p);
    const nv=Math.round(p);
    /* The marker follows the finger on its own state; writing the new point into the plan
       is handed over as a transition, so a whole-app rebuild never lands between two
       moves of the same drag. */
    if(nv!==v&&nv!==sent.current){sent.current=nv;_liveT(()=>onChange(nv));}
  };
  /* The press must not also start a text selection or pick up the one already on the page.
     Chrome answers a press on selected content with a native drag-and-drop, and the
     dragstart CANCELS the pointer — capture is dropped mid-gesture and the marker stops
     following the pointer until the coach lets go and starts the drag over. That is the
     scale "sometimes not letting you slide". preventDefault on the press kills the
     selection and the drag at their source, so the focus the browser would have given the
     track is taken explicitly instead. */
  const down=e=>{
    if(e.button!=null&&e.button!==0)return;
    e.preventDefault();
    const el=e.currentTarget;
    dragging.current=true;
    el.setPointerCapture&&el.setPointerCapture(e.pointerId);
    el.focus&&el.focus({preventScroll:true});
    apply(e.clientX);
  };
  const move=e=>{if(dragging.current)apply(e.clientX);};
  /* Ends the drag on release, on a cancelled pointer and on any other way the capture can
     be lost — whatever happens, the gauge is never left believing a finger is still down. */
  const up=()=>{if(dragging.current){dragging.current=false;setRaw(null);sent.current=null;}};
  const key=e=>{
    const d=(e.key==='ArrowLeft'||e.key==='ArrowDown')?-1:(e.key==='ArrowRight'||e.key==='ArrowUp')?1:0;
    if(!d)return;
    e.preventDefault();
    const nv=Math.max(1,Math.min(10,v+d));
    if(nv!==v)onChange(nv);
  };
  /* While dragging, everything that moves reads off `raw`; at rest it reads off the whole
     point, so the band is exactly the range the readout names. */
  const at=raw==null?v:raw;
  const bLo=Math.max(1,at-1),bHi=Math.min(10,at+1);
  return(<div className={`rpe-gauge${raw==null?'':' drag'}`} style={{'--rpe-c':z.c,'--rpe-soft':z.soft,'--rpe-ring':z.ring}}>
    <div className="rpe-gauge-read">
      <span className="rpe-gauge-val">{`${lo} - ${hi}`}<span className="rpe-gauge-val-max">/10</span></span>
      {/* The band's name is dropped here when the card around the gauge already carries
          it in its heading — saying it twice, a centimetre apart, said it neither time. */}
      {!hideZone&&<span className="rpe-gauge-zone">{L(z.tr,z.en)}</span>}
    </div>
    {/* The drag surface is the full height of this strip, not the 8px rail inside it: a
        marker this size is easy to miss by a few pixels vertically, and missing it should
        not mean nothing happens. */}
    <div className="rpe-gauge-track" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onLostPointerCapture={up} onDragStart={e=>e.preventDefault()} draggable={false}
      onKeyDown={key} tabIndex={0} role="slider" aria-label={L('Hedeflenen RPE','Target RPE')}
      aria-valuemin={1} aria-valuemax={10} aria-valuenow={v} aria-valuetext={`RPE ${lo}-${hi} — ${L(z.tr,z.en)}`}>
      <div className="rpe-gauge-rail" ref={railRef}>
        {RPE_ZONE_SPANS.map((sp,i)=><div key={i} className="rpe-gauge-zn"
          style={{left:sp.a+'%',width:(sp.b-sp.a)+'%',background:sp.c}}/>)}
        {/* Where one band ends and the next begins, cut once. Without these the four tints
            bleed into a single green-to-red ramp, which is a picture of a gradient rather
            than of four named bands. */}
        {RPE_ZONE_SPANS.slice(1).map((sp,i)=><div key={'d'+i} className="rpe-gauge-div" style={{left:sp.a+'%'}}/>)}
        <div className="rpe-gauge-band" style={{left:rpePct(bLo)+'%',width:(rpePct(bHi)-rpePct(bLo))+'%'}}/>
        <div className="rpe-gauge-thumb" style={{left:rpePct(at)+'%'}}/>
      </div>
    </div>
    {/* The ten points, written under the rail rather than left to be counted off ticks.
        The three the band covers are lit in the zone's colour, so the numbers and the band
        say the same thing. */}
    <div className="rpe-gauge-scale" aria-hidden="true">
      {[1,2,3,4,5,6,7,8,9,10].map(n=><span key={n} className={n>=lo&&n<=hi?'on':''}
        style={{left:rpePct(n)+'%'}}>{n}</span>)}
    </div>
  </div>);
}

function SessEd({session,index,total,onUpdate,onRemove,onDuplicate,onMove,printContext,athletes,coach}){
  const u=upd=>onUpdate({...session,...upd});
  const isTemplate=String(session.id||'').startsWith('tpl_'); // hide "Save to Templates" inside the Templates editor
  const[dragB,setDragB]=useState(null);
  /* ONE NAME FOR THE SESSION. The title typed at the head of the first block is the name
     the calendar card, the day plan and the fixture list show — so a new block list is
     written together with the name its first heading now gives the session — but only
     when that heading changed (typed, or another block moved to the top), so editing an
     exercise never renames anything. A heading left empty keeps the session's name. */
  const withName=blocks=>{
    const o=(session.blocks||[])[0],n=blocks[0];
    if(!n||(o&&o.id===n.id&&o.name===n.name))return{blocks};
    const t=String(n.name||'').trim();
    return(t&&t!==session.name)?{blocks,name:t}:{blocks};
  };
  const moveBlk=(from,to)=>{if(from==null||to==null||from===to)return;const a=[...session.blocks];const[m]=a.splice(from,1);a.splice(to,0,m);u(withName(a));};
  const updBlk=(bid,nb)=>u(withName(session.blocks.map(b=>b.id===bid?nb:b)));
  const delBlk=bid=>u(withName(session.blocks.filter(b=>b.id!==bid)));
  const dupBlk=bid=>{const o=session.blocks.find(b=>b.id===bid);const i=session.blocks.indexOf(o);
    const nb={...o,id:uid(),exercises:o.exercises.map(e=>({...e}))};const a=[...session.blocks];a.splice(i+1,0,nb);u({blocks:a});};
  /* The first block of a session is headed with the session's own name, so the heading
     and the calendar card start out saying the same thing. */
  const addBlk=(n,kind)=>u({blocks:[...session.blocks,BLK(n||(session.blocks.length?'':(session.soloName||session.name||'')),kind)]});
  const[noteOpen,setNoteOpen]=useState(!!(session.planNote||'').trim());
  const fromTeam=!!session.sourceId;
  const showPicker=Array.isArray(athletes)&&!fromTeam; // only team-mode sessions get the picker
  /* Writing THIS block's participant list. The other blocks keep whoever they had — a
     block that never had a list of its own gets the session's, written out once here, so
     ticking a player on one block cannot silently change who the rest are for. The
     session's own list is then the union of the blocks: that is what the calendar, the
     sRPE roster and the sync all read. */
  const setBlkAthletes=(bid,ids)=>{
    const blocks=(session.blocks||[]).map(b=>({...b,athletes:b.id===bid?ids:blkAthIds(session,b)}));
    u({blocks,athletes:unionBlockAthletes(session,blocks)});
  };
  /* A block's card colour. It is also written as the session's, since the session is the
     one card the calendar draws — the last colour picked on any of its blocks is the one
     the calendar wears. */
  const setBlkColor=(bid,c)=>u({color:c,blocks:(session.blocks||[]).map(b=>b.id===bid?{...b,color:c}:b)});
  const soloTint=blkTint(session.color||'');

  /* The session's own controls. The bar that used to head the card — number, title,
     time, the team badge, ↑ ↓ and Delete — is gone: the title it showed is the block's
     heading again a few lines down (and printed twice on the sheet), so the card now
     opens straight on its blocks. The number rides at the head of each block, the
     two moves and the delete ride with the blocks' own actions. */
  const delSess=()=>{if(confirm(fromTeam?L('Bu takım-senkronlu seans yalnızca bu sporcudan silinsin mi? (Takım planı değişmez)','Delete this team-synced session from this athlete only? (The team plan is unchanged)'):L('Seans silinsin mi? Bu, atandığı tüm sporculardan da kaldırılacak.','Delete session? This will also remove it from any athletes it was assigned to.')))onRemove();};
  const nBlk=(session.blocks||[]).length;
  const sesCtl={no:index+1,total,index,onMove,remove:delSess,multi:nBlk>1};
  const moveBtns=total>1&&<>
    <button type="button" className="btn xs sec" onClick={()=>onMove(-1)} disabled={index===0}
      title={L('Seansı yukarı taşı','Move the session up')}>↑</button>
    <button type="button" className="btn xs sec" onClick={()=>onMove(1)} disabled={index===total-1}
      title={L('Seansı aşağı taşı','Move the session down')}>↓</button></>;

  return(<div className="sess-ed">
    <div className="sbody">
      {/* The strip that used to stand here — what the session trains, and the card colour —
          rides inside each block now, directly above the exercises it is read from. */}
      {/* The details live in the blocks — so a session that has none yet still needs
          somewhere to be named, timed and assigned from. This card stands in until the
          first block is added and takes them over. */}
      {session.blocks.length===0&&<div className={'iv-block cal-block'+soloTint.cls} style={soloTint.style}>
        <div className="iv-block-hd">
          {/* TWO TITLES, TWO FIELDS. The bar above names the SESSION — the line the day
              plan, the athletes' calendars and every printout carry. This heading names
              the WORK, exactly as a block's heading does once blocks exist ("Kuvvet",
              "Yarı Saha 5v5"), and a session that has not been split yet deserves the
              same. They were the same field, so naming the work renamed the session and
              a coach could not have both. Left empty it still reads "Training Details". */}
          <span className="blk-sn" title={L('Seans numarası','Session number')}>{index+1}</span>
          <LiveInput className="iv-block-nm" value={session.soloName||session.name||''}
            placeholder={L('Antrenman Özellikleri','Training Details')}
            title={L('Blok başlığı — takvimdeki kartta da bu ad görünür','Block title — the calendar card shows this name too')}
            onChange={v=>{const t=String(v||'').trim();u(t?{soloName:v,name:t}:{soloName:v});}}/>
          <span className="iv-blockacts">
            {!isTemplate&&<CardColorPick value={session.color||''} onPick={c=>u({color:c})}/>}
            {moveBtns}
            <button type="button" className="btn xs sec iv-rmb" onClick={delSess}
              title={L('Bu seansı sil','Delete this session')}>✕ {L('Kaldır','Remove')}</button>
          </span>
        </div>
        <SessionDetails session={session} u={u} athletes={athletes}
          showPicker={showPicker} isTemplate={isTemplate} coach={coach}/>
      </div>}
      {session.blocks.map((b,bi)=><BlockEd key={b.id} block={b} index={bi} onUpdate={nb=>updBlk(b.id,nb)} onRemove={()=>delBlk(b.id)} onDuplicate={()=>dupBlk(b.id)}
        session={session} printContext={printContext} isTemplate={isTemplate}
        sessionUpd={u} athletes={athletes} showPicker={showPicker} coach={coach}
        athUpd={ids=>setBlkAthletes(b.id,ids)} setColor={c=>setBlkColor(b.id,c)}
        dragB={dragB} setDragB={setDragB} onDropBlk={()=>{moveBlk(dragB,bi);setDragB(null);}}
        ses={sesCtl} sesMoves={bi===0?moveBtns:null}/>)}
      <div className="add-blk">
        <button className="ab-sc" onClick={()=>addBlk('','sc')}
          title={L('Bu seansa yeni bir blok ekle','Add a new block to this session')}>+ {L('Blok Ekle','Add Block')}</button>
        <button className="ab-note" onClick={()=>setNoteOpen(o=>!o)} title={L('Bu seansa serbest metin notu ekle','Add a free-text note to this session')}>{noteOpen?L('− Notları Gizle','− Hide Notes'):L('+ Not Ekle','+ Add Notes')}</button>
      </div>
      {noteOpen&&<div className="ses-note">
        <textarea value={session.planNote||''} onChange={e=>u({planNote:e.target.value})} placeholder={L('Bu seans için bir not yaz…','Write a note for this session…')}/>
      </div>}
      {/* The logged RPE, the session load and the observations box used to close the
          card here. They are gone: the session is planned in the blocks above, and the
          numbers that describe how it actually went are collected from the athletes
          themselves rather than typed onto the plan. */}
    </div>
  </div>);
}

/* =========================================================
   PLANNER (week view + day detail; reusable for team/athlete)
   ========================================================= */
function Planner({days,saveDays,setup,dateKey,setDateKey,labelOwner,athletes,saveAthletes}){
  // When `athletes` is provided, this Planner is in TEAM mode: it shows the
  // participant picker on each session and propagates changes to the
  // athletes' personal calendars via `saveAthletes`.
  const teamMode=Array.isArray(athletes)&&typeof saveAthletes==='function';
  const[selDay,setSelDay]=useState(dateKey);
  useEffect(()=>setSelDay(dateKey),[dateKey]);
  const ws=fmt(sow(parseD(selDay)));
  const weekDays=useMemo(()=>Array.from({length:7},(_,i)=>fmt(addD(parseD(ws),i))),[ws]);
  const goWeek=d=>{const n=fmt(addD(parseD(ws),d*7));setSelDay(n);setDateKey(n);};
  const day=days[selDay]||EDAY(selDay);
  // Single save point — when in team mode, also sync to athletes in same commit.
  const sv=upd=>{
    const oldSessions=day.sessions||[];
    const newDay={...day,...upd,date:selDay};
    const newSessions=newDay.sessions||[];
    const nd={...days,[selDay]:newDay};
    if(teamMode&&newSessions!==oldSessions){
      const newAthletes=syncSessionsToAthletes(athletes,selDay,oldSessions,newSessions);
      // commit both days + athletes; parent merges them via the provided callbacks
      saveDays(nd);saveAthletes(newAthletes);
    } else saveDays(nd);
  };
  const updS=(sid,ns)=>sv({sessions:day.sessions.map(s=>s.id===sid?ns:s)});
  const delS=sid=>sv({sessions:day.sessions.filter(s=>s.id!==sid)});
  const dupS=sid=>{const o=day.sessions.find(s=>s.id===sid);sv({sessions:[...day.sessions,{...o,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,blocks:o.blocks.map(b=>({...b,id:uid(),athletes:[],exercises:b.exercises.map(e=>({...e}))}))}]});};
  const mvS=(sid,d)=>{const a=[...day.sessions];const i=a.findIndex(s=>s.id===sid);const j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];sv({sessions:a});};
  const addS=p=>sv({sessions:[...day.sessions,SESS(p)]});
  const cpY=()=>{const yk=fmt(addD(parseD(selDay),-1));const y=days[yk];if(!y?.sessions?.length){alert(L('Dün seans yok','No sessions yesterday'));return;}
    sv({sessions:y.sessions.map(s=>({...s,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,blocks:s.blocks.map(b=>({...b,id:uid(),athletes:[],exercises:b.exercises.map(e=>({...e}))}))}))});};
  // ---- Drag-drop & quick-duplicate across days ----
  const[dragInfo,setDragInfo]=useState(null);
  const[dragOverDate,setDragOverDate]=useState(null);
  // Move (or copy) a session from one day to another. Keeps team↔athlete sync coherent.
  const moveOrCopySession=(fromDate,sessionId,toDate,copy)=>{
    if(fromDate===toDate&&!copy)return;
    const fromDay=days[fromDate];if(!fromDay?.sessions)return;
    const session=fromDay.sessions.find(s=>s.id===sessionId);if(!session)return;
    const oldFromSessions=fromDay.sessions;
    let newFromSessions=oldFromSessions;
    let newDays={...days};
    if(!copy){
      newFromSessions=oldFromSessions.filter(s=>s.id!==sessionId);
      newDays[fromDate]={...fromDay,sessions:newFromSessions,date:fromDate};
    }
    const newSession=copy
      ?{...session,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,
         blocks:(session.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))}
      :session;
    const toDay=newDays[toDate]||{date:toDate,sessions:[],dailyNotes:''};
    const oldToSessions=toDay.sessions||[];
    const newToSessions=[...oldToSessions,newSession];
    newDays[toDate]={...toDay,sessions:newToSessions,date:toDate};
    if(teamMode&&Array.isArray(athletes)){
      let newAths=athletes;
      if(!copy&&fromDate!==toDate)newAths=syncSessionsToAthletes(newAths,fromDate,oldFromSessions,newFromSessions);
      newAths=syncSessionsToAthletes(newAths,toDate,oldToSessions,newToSessions);
      saveDays(newDays);saveAthletes(newAths);
    } else saveDays(newDays);
  };
  // Quick duplicate inside the same day
  const dupSessionInDay=(date,sessionId)=>moveOrCopySession(date,sessionId,date,true);
  const wn=useMemo(()=>{const s=parseD(setup.seasonStart||fmt(today));return Math.max(1,Math.floor(diffD(fmt(s),ws)/7)+1);},[ws,setup.seasonStart]);
  const tw=useMemo(()=>{if(!setup.seasonStart||!setup.seasonEnd)return'?';return Math.ceil(diffD(setup.seasonStart,setup.seasonEnd)/7);},[setup]);
  const dayLabel=fdLong(selDay);
  const printDay=()=>{if(!day.sessions.length){alert(L('Yazdırılacak seans yok','No sessions to print'));return;}printDayA4(labelOwner||setup.teamName,dayLabel,day.sessions);};
  const printWeek=()=>{printWeekA4Land(labelOwner||setup.teamName,ws,days,athletes);};

  return(<div>
    <div className="panel" style={{paddingBottom:14}}>
      <div className="wv-bar">
        <div className="row"><button className="btn sec sm" onClick={()=>goWeek(-1)}>‹ {L('Hafta','Week')}</button>
          <strong style={{fontSize:16,fontFamily:'Space Grotesk'}}>{L(`${tw} haftanın ${wn}.`,`Week ${wn} of ${tw}`)}</strong>
          <button className="btn sec sm" onClick={()=>goWeek(1)}>{L('Hafta','Week')} ›</button></div>
        <div className="row"><span style={{color:'var(--muted)',fontSize:13}}>{fd(weekDays[0])} — {fd(weekDays[6])}</span>
          <button className="btn sm" onClick={printWeek}>📄 {L('Haftayı Yazdır (A4 Yatay)','Print Week (A4 Landscape)')}</button></div>
      </div>
      <div className="help" style={{marginBottom:6,fontSize:11}}>💡 {L(<>İpucu: bir seansı başka güne <strong>sürükleyerek</strong> <strong>taşı</strong> · bırakırken <strong>Ctrl/⌥</strong>'ye bas → <strong>kopyala</strong> · aynı günde çoğaltmak için <strong>⎘</strong>'e tıkla.</>,<>Tip: <strong>Drag</strong> a session to another day to <strong>move</strong> it · hold <strong>Ctrl/⌥</strong> while dropping to <strong>copy</strong> · click <strong>⎘</strong> on a session to duplicate it on the same day.</>)}</div>
      <div className="wv-grid">{weekDays.map((dk,i)=>{const d=days[dk];const ss=d?.sessions||[];const isSel=dk===selDay;
        const isDropTarget=dragInfo&&dragOverDate===dk&&dragInfo.fromDate!==dk;
        return<div key={dk} className={`wv-day${isSel?' sel':''}${isDropTarget?' drop-target':''}`}
          onClick={()=>{setSelDay(dk);setDateKey(dk);}}
          onDragOver={e=>{if(dragInfo){e.preventDefault();e.dataTransfer.dropEffect=(e.ctrlKey||e.metaKey||e.altKey)?'copy':'move';setDragOverDate(dk);}}}
          onDragLeave={()=>{if(dragOverDate===dk)setDragOverDate(null);}}
          onDrop={e=>{e.preventDefault();if(dragInfo){moveOrCopySession(dragInfo.fromDate,dragInfo.sessionId,dk,e.ctrlKey||e.metaKey||e.altKey);}setDragInfo(null);setDragOverDate(null);}}>
          <div className="wdn">{DN[i]}</div><div className="wdd">{fd(dk).slice(0,5)}</div>
          {ss.length>0?ss.map((s,j)=>{const col=sessionColor(s);return<div key={s.id}
            className={`ws${dragInfo?.sessionId===s.id?' dragging':''}`}
            draggable
            title={L(`${sessionType(s).toUpperCase()} · Taşımak için sürükle · kopyalamak için Ctrl/⌥'ye bas`,`${sessionType(s).toUpperCase()} · Drag to move · hold Ctrl/⌥ to copy`)}
            style={{border:`1px solid ${col.c}`,borderLeft:`4px solid ${col.c}`,background:'transparent',boxShadow:`0 0 6px ${col.g}, inset 0 0 4px ${col.g}`}}
            onDragStart={e=>{e.stopPropagation();e.dataTransfer.effectAllowed='copyMove';try{e.dataTransfer.setData('text/plain',s.id);}catch{}setDragInfo({fromDate:dk,sessionId:s.id});}}
            onDragEnd={()=>{setDragInfo(null);setDragOverDate(null);}}>
            <div className="ws-actions" onClick={e=>e.stopPropagation()}>
              <button onClick={e=>{e.stopPropagation();dupSessionInDay(dk,s.id);}} title={L('Aynı günde çoğalt','Duplicate in same day')}>⎘</button>
            </div>
            <div className="wst" style={{color:col.c,textShadow:`0 0 8px ${col.g}`}}>{s.name}</div>
            <div style={{color:'#ffffff',fontSize:11,fontWeight:600,marginTop:2}}>{(()=>{const dur=Number(s.duration)||0;return L(`${dur}dk`,`${dur}min`);})()}{s.au?` · ${Math.round(Number(s.au))} AU`:''}</div>
          </div>;}):<div className="wa">—</div>}
          {dLoad(d)>0&&<div className="wl">{Math.round(dLoad(d))} AU</div>}
        </div>;})}</div>
    </div>
    <div className="panel">
      <div className="row" style={{justifyContent:'space-between',marginBottom:14,flexWrap:'wrap'}}>
        <div className="row"><button className="btn sec sm" onClick={()=>{const n=fmt(addD(parseD(selDay),-1));setSelDay(n);setDateKey(n);}}>‹</button>
          <strong style={{fontSize:16,fontFamily:'Space Grotesk'}}>{dayLabel}</strong>
          <button className="btn sec sm" onClick={()=>{const n=fmt(addD(parseD(selDay),1));setSelDay(n);setDateKey(n);}}>›</button></div>
        <div className="row"><span className="tag">{Math.round(dLoad(day))} AU</span>
          <button className="btn sm" onClick={printDay}>📄 {L('Günü Yazdır (A4)','Print Day (A4)')}</button>
          <button className="btn sm" style={{background:'var(--purple)',color:'#fff'}}
            onClick={()=>{if(!day.sessions.length){alert(L('Gönderilecek seans yok','No sessions to send'));return;}
              shareTrainingPDF({title:labelOwner||setup.teamName,subtitle:dayLabel,sessions:day.sessions,athleteName:labelOwner});}}
            title={L('Herhangi bir yüklü uygulama üzerinden PDF paylaş (WhatsApp, Mail, Telegram vb.)','Share PDF via any installed app (WhatsApp, Mail, Telegram, etc.)')}>
            <ShareIcon/> {L('Paylaş','Share')}</button>
        </div>
      </div>
      <BlockAddBar variant="planner" onAdd={addS}/>
      {day.sessions.length===0&&<div className="empty-st">{L('Planlanmış seans yok — yukarıdan bir antrenman bloğu ekle','No sessions planned — add a training block above')}</div>}
      {day.sessions.map((s,i)=>sesKind(s)
        ?<SesKindCard key={s.id} session={s} index={i} total={day.sessions.length}
          onUpdate={ns=>updS(s.id,ns)} onRemove={()=>delS(s.id)} onMove={d=>mvS(s.id,d)}
          athletes={teamMode?athletes:undefined} dateKey={selDay} teamName={labelOwner||setup.teamName||''}/>
        :<SessEd key={s.id} session={s} index={i} total={day.sessions.length}
        onUpdate={ns=>updS(s.id,ns)} onRemove={()=>delS(s.id)} onDuplicate={()=>dupS(s.id)} onMove={d=>mvS(s.id,d)}
        printContext={{title:labelOwner||setup.teamName,subtitle:dayLabel}}
        athletes={teamMode?athletes:undefined}/>)}
      <div className="hr"/><label>{L('Günlük notlar','Daily notes')}</label>
      <textarea value={day.dailyNotes||''} onChange={e=>sv({dailyNotes:e.target.value})} placeholder={L('Wellness, uyku, kas ağrısı…','Wellness, sleep, soreness…')}/>
    </div>
  </div>);
}

