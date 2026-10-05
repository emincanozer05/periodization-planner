/* ---- The card panel -------------------------------------------------------
   Reads top to bottom the way a coach decides: what the athlete's day looks like
   (computed, and there whether or not an API key exists), what the coach wants from
   it, the session that comes back, and the button that puts it on the calendar. */
function DiSignals({items,limit}){
  if(!items||!items.length)return null;
  const show=limit?items.slice(0,limit):items;
  return(<ul className="di-sig">{show.map((s,i)=><li key={i}>{s}</li>)}
    {limit&&items.length>limit?<li className="di-dim">+{items.length-limit}</li>:null}</ul>);
}

/* A list the coach builds by typing — "must be in", "keep out". Enter, the ＋ button
   or leaving the box files what is in it; each entry is a chip with its own ✕. Free
   text on purpose: it is read by the model, not matched against the library, so
   "adduktör çalışması" is as valid an answer as a named exercise.

   The text is this component's own state until it becomes a chip, and that is where the
   module used to lose half of every brief: only Enter and ＋ committed, so a coach who
   typed "Trap Bar Jump" and went straight to the export button sent an EMPTY
   mutlaka_olsun with the request — the instruction never reached the prompt at all, and
   the session came back looking as though the model had ignored it. Three things close
   that hole: the text commits when the box loses focus (a click on any button blurs it
   first), `pending` hands whatever is still uncommitted to the parent so the generate
   press can fold it in before the request is built, and the box clears itself once its
   text has become a chip by any of those routes. */
function DiChipList({value,onChange,placeholder,tone,pending}){
  const[txt,setTxt]=useState('');
  const list=Array.isArray(value)?value:[];
  useEffect(()=>{if(pending)pending.current=txt;},[txt,pending]);
  useEffect(()=>()=>{if(pending)pending.current='';},[pending]);
  useEffect(()=>{const v=txt.trim();
    if(v&&list.some(x=>x.toLowerCase()===v.toLowerCase()))setTxt('');
    // eslint-disable-next-line
  },[value]);
  const add=()=>{const v=txt.trim();if(!v)return;
    if(!list.some(x=>x.toLowerCase()===v.toLowerCase()))onChange([...list,v]);
    setTxt('');};
  return(<div className="di-chiplist">
    <div className="di-chipin">
      <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder={placeholder}
        onBlur={add}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/>
      <button type="button" className="di-chipadd" onClick={add} disabled={!txt.trim()}
        aria-label={L('Ekle','Add')}>＋</button>
    </div>
    {list.length>0&&<div className="di-chips">
      {list.map((x,i)=><span key={i} className={'di-tag '+(tone||'')} title={x}><span>{x}</span>
        <button type="button" onClick={()=>onChange(list.filter((_,k)=>k!==i))} aria-label={L('Kaldır','Remove')}>✕</button></span>)}
    </div>}
  </div>);
}

/* Today's priorities. ONE box: pressing it opens a list that stays open while several
   qualities are ticked, grouped the way DI_PRIORITIES groups them. The old shape was one
   dropdown per quality plus "+ Ek öncelik ekle" for each further one — three priorities
   cost three separate opens and two extra presses. The order they are ticked in is still
   the order they are read, and each picked quality sits under the box as a chip with its
   own ✕. A click outside the list, or Escape, closes it.

   Hovering (or focusing) a quality shows a short box beside the list: what it is and
   how it is usually trained. The list scrolls, so a box drawn inside it would be cut
   off at its edge — it is drawn fixed-position into <body>, beside the list where
   there is room and under the row where there is not. */
const DI_PRIO_TIP_W=290;
function DiPriorityPicker({value,onChange}){
  const list=(Array.isArray(value)?value:[]).filter(diPrioRow);
  const[open,setOpen]=useState(false);
  const[tip,setTip]=useState(null);   // hovered quality → {id,left,top|bottom}
  const wrap=useRef(null);
  const menu=useRef(null);
  const showTip=(e,id)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const m=menu.current?menu.current.getBoundingClientRect():r;
    const W=window.innerWidth,H=window.innerHeight,gap=10;
    let left,top=r.top-4,below=false;
    if(m.right+gap+DI_PRIO_TIP_W<=W-8)left=m.right+gap;
    else if(m.left-gap-DI_PRIO_TIP_W>=8)left=m.left-gap-DI_PRIO_TIP_W;
    else{left=Math.max(8,Math.min(W-DI_PRIO_TIP_W-8,r.left));top=r.bottom+6;below=true;}
    /* Near the foot of the window the box hangs upwards from the row instead. */
    const pos=(!below&&top>H-170)||(below&&top>H-150)
      ?{left,bottom:H-(below?r.top-6:r.bottom+4)}:{left,top};
    setTip({id,...pos});
  };
  useEffect(()=>{if(!open)setTip(null);},[open]);
  useEffect(()=>{
    if(!open)return;
    const away=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    const esc=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',away);
    document.addEventListener('keydown',esc);
    return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',esc);};
  },[open]);
  const toggle=id=>onChange(list.includes(id)?list.filter(x=>x!==id):[...list,id]);
  return(<div className="di-conwrap di-prio" ref={wrap}>
    <button type="button" className={'di-condrop'+(open?' on':'')} onClick={()=>setOpen(o=>!o)}
      aria-haspopup="listbox" aria-expanded={open}>
      <span>{list.length
        ?(list.length===1?diPrioLabel(list[0]):L(`${list.length} öncelik seçili`,`${list.length} priorities selected`))
        :L('— öncelik seç','— pick priorities')}</span>
      <i>{open?'▲':'▼'}</i>
    </button>
    {open&&<div className="di-conmenu" role="listbox" aria-multiselectable="true" ref={menu}
      onScroll={()=>setTip(null)}>
      {DI_PRIORITIES.map(g=><div key={g.group[0]} className="di-prio-grp">
        <div className="di-prio-gh">{L(g.group[0],g.group[1])}</div>
        {g.items.map(p=>{const on=list.includes(p.id);
          return<div key={p.id} className={'di-conitem'+(on?' on':'')} role="option" aria-selected={on}
            tabIndex={0} onClick={()=>toggle(p.id)}
            onMouseEnter={e=>showTip(e,p.id)} onMouseLeave={()=>setTip(null)}
            onFocus={e=>showTip(e,p.id)} onBlur={()=>setTip(null)}
            aria-describedby={tip&&tip.id===p.id?'di-prio-tip':undefined}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(p.id);}}}>
            <span className="di-conbox">{on?'✓':''}</span>
            <span className="di-connm">{L(p.label[0],p.label[1])}</span>
            {on&&list.length>1?<span className="di-prio-ord">{list.indexOf(p.id)+1}</span>:null}
          </div>;})}
      </div>)}
    </div>}
    {open&&tip&&(()=>{const p=diPrioRow(tip.id);if(!p||!p.desc)return null;
      return ReactDOM.createPortal(
        <div id="di-prio-tip" className="di-prio-tip" role="tooltip"
          style={{left:tip.left,top:tip.top,bottom:tip.bottom,width:DI_PRIO_TIP_W}}>
          <b>{L(p.label[0],p.label[1])}</b>
          <p>{L(p.desc[0],p.desc[1])}</p>
          {p.ex&&<p className="ex">{L(p.ex[0],p.ex[1])}</p>}
        </div>,document.body);})()}
    {list.length>0&&<div className="di-chips">
      {list.map((id,i)=><span key={id} className="di-tag prio" title={diPrioLabel(id)}>
        {list.length>1?<b className="di-prio-ord">{i+1}</b>:null}<span>{diPrioLabel(id)}</span>
        <button type="button" onClick={()=>toggle(id)} aria-label={L('Kaldır','Remove')}>✕</button></span>)}
    </div>}
  </div>);
}

/* The movement patterns the session must carry. Eight toggles across the top; a
   ticked pattern drops into the list below as its own filter box, and only one box is
   open at a time — the others fold to one line that says what was picked, so three
   patterns cost three lines rather than three panels. Inside a box each facet is a row
   of toggles: nothing ticked means the model chooses, several ticked mean any of them.
   A pattern today's pain or a standing restriction has closed is still selectable (the
   coach may know better), but it says so, and the answer is told to substitute and
   declare it. */
function DiPatternPicker({value,onChange,closed}){
  const list=diMovePatterns(value);
  const[open,setOpen]=useState(null);
  const shut=closed instanceof Set?closed:new Set();
  const isClosed=row=>row.vocab.every(v=>shut.has(v));
  const toggle=id=>{
    if(list.some(p=>p.id===id)){onChange(list.filter(p=>p.id!==id));if(open===id)setOpen(null);}
    else{onChange([...list,{id}]);setOpen(id);}
  };
  const flip=(id,k,val)=>onChange(list.map(p=>{
    if(p.id!==id)return p;
    const cur=p[k]||[];
    return{...p,[k]:cur.includes(val)?cur.filter(x=>x!==val):[...cur,val]};
  }));
  const summary=(pick,row)=>row.facets.map(f=>diMoveFacetText(pick,f).join(' / ')).filter(Boolean).join(' · ');
  return(<div className="di-mvp">
    <div className="di-mvp-pick" role="group" aria-label={L('Hareket paterni','Movement pattern')}>
      {DI_MOVE_PATTERNS.map(row=>{const on=list.some(p=>p.id===row.id);const cl=isClosed(row);
        return<button key={row.id} type="button" aria-pressed={on}
          className={'di-mvp-chip'+(on?' on':'')+(cl?' closed':'')}
          title={cl?L('Bugün ağrı/kısıt nedeniyle kapalı — seçilirse model güvenli bir alternatif yazıp bildirir.',
            'Closed today by pain / a restriction — if picked, the model writes a safe substitute and declares it.'):undefined}
          onClick={()=>toggle(row.id)}>{on?'✓ ':''}{L(row.label[0],row.label[1])}{cl?<i>!</i>:null}</button>;})}
    </div>
    {list.length>0&&<div className="di-mvp-list">
      {list.map(pick=>{const row=diMoveRow(pick.id);if(!row)return null;
        const isOpen=open===pick.id;const sum=summary(pick,row);
        return<div key={pick.id} className={'di-mvp-box'+(isOpen?' open':'')}>
          <div className="di-mvp-hd">
            <button type="button" className="di-mvp-tg" onClick={()=>setOpen(isOpen?null:pick.id)} aria-expanded={isOpen}>
              <b>{L(row.label[0],row.label[1])}</b>
              <span className={'di-mvp-sum'+(sum?'':' dim')}>{sum||L('filtre yok — model seçer','no filter — model chooses')}</span>
              <i>{isOpen?'▲':'▼'}</i>
            </button>
            <button type="button" className="di-mvp-x" onClick={()=>toggle(pick.id)} aria-label={L('Kaldır','Remove')}>✕</button>
          </div>
          {isOpen&&<div className="di-mvp-body">
            {row.facets.map(f=><div key={f.k} className="di-mvp-row">
              <span className="di-mvp-k">{L(f.label[0],f.label[1])}</span>
              <div className="di-mvp-opts">{f.opts.map(op=>{const on=(pick[f.k]||[]).includes(op[0]);
                return<button key={op[0]} type="button" aria-pressed={on} className={'di-mvp-opt'+(on?' on':'')}
                  onClick={()=>flip(pick.id,f.k,op[0])}>{L(op[1],op[2])}</button>;})}</div>
            </div>)}
          </div>}
        </div>;})}
    </div>}
  </div>);
}

/* A number with the answers a coach actually gives beside it. Typing is still allowed —
   the buttons are shortcuts, not the only way in. */
function DiNumberChoice({value,onChange,choices,unit,placeholder,min,max}){
  /* What is in the box while it is being typed in. Emptying the box used to hand
     `null` straight up, the brief fell back to the session's own figure and that figure
     came straight back into the box — so it could never be cleared to type a new
     number. Now an empty box stays empty while it has focus, every real number typed is
     saved as it is typed, and only leaving the box empty hands the field back to auto. */
  const[txt,setTxt]=useState(null);
  const shown=txt!=null?txt:(value==null?'':String(value));
  return(<div className="di-numc">
    <div className="di-numin">
      <input type="number" min={min||1} max={max||999} value={shown}
        onChange={e=>{const t=e.target.value;setTxt(t);
          if(t!==''){const n=Number(t);if(isFinite(n)&&n>0)onChange(n);}}}
        onBlur={()=>{if(txt==='')onChange(null);setTxt(null);}}
        placeholder={placeholder}/>
      <span>{unit}</span>
    </div>
    <div className="di-numbtns">
      {choices.map(c=><button key={c} type="button" className={'di-numb'+(Number(value)===c?' on':'')}
        onClick={()=>{setTxt(null);onChange(c);}}>{c}</button>)}
    </div>
  </div>);
}

/* The brief. Six fields, none of them required, and the line under the heading says
   what an empty one means. Each field is its own small card: the columns of a
   three-across grid have very different heights (a priority list against a number),
   and without a card edge they read as one ragged block of controls. The pattern card
   is the tall one, so it takes two columns and two rows on the right while priority
   and keep-out stack beside it; the three short answers share the last row. It is
   stored per athlete PER DAY, beside the session it produced, so yesterday's
   instruction never silently drives today's. */
function DiInstructionForm({instr,save,onSnapshot,onImport,closed}){
  const set=(k,v)=>save({...instr,[k]:v});
  /* Whatever is typed in the keep-out box but not yet turned into a chip. Blur commits
     it on its own, but blur and click land in the same tick and the generate handler
     reads the brief from THIS render — so the pending text is folded in here as well,
     and the request is built from the merged brief rather than from whichever of the two
     updates happened to win. */
  const avoidPend=useRef('');
  const withPending=()=>{
    const v=String(avoidPend.current||'').trim();
    const l=Array.isArray(instr.avoid)?instr.avoid:[];
    if(!v||l.some(x=>x.toLowerCase()===v.toLowerCase()))return instr;
    return{...instr,avoid:[...l,v]};
  };
  /* The merged brief, so a chip still being typed is in the copy too. Read-only: it writes nothing but that fold-in. */
  const snapshot=()=>{
    const merged=withPending();
    if(merged!==instr)save(merged);
    if(onSnapshot)onSnapshot(merged);
  };
  const field=(n,title,hint,control,area)=>(
    <div className={'di-field'+(area?' '+area:'')}>
      <div className="di-fhd"><i className="di-num">{n}</i>
        <label>{title}</label></div>
      <span className="di-fhint">{hint}</span>
      <div className="di-fctl">{control}</div>
    </div>);
  return(<div className="di-brief">
    <div className="di-fgrid">
      {field(1,L('Bugünün önceliği','Today\'s priority'),
        L('Bugün en çok hangi fiziksel kaliteye odaklanılsın?','Which physical quality should today build?'),
        <DiPriorityPicker value={instr.priorities} onChange={v=>set('priorities',v)}/>,'a1')}
      {field(2,L('Hareket paterni','Movement pattern'),
        L('Seçilen her patern programa kesinlikle eklenir. Filtre boşsa seçimi model yapar.',
          'Every pattern picked is in the session. An empty filter is the model\'s choice.'),
        <DiPatternPicker value={instr.patterns} onChange={v=>set('patterns',v)} closed={closed}/>,'a2')}
      {field(3,L('Kaçınılacak','Keep out'),
        L('Bugün yapılmasın.','What must not appear today.'),
        <DiChipList value={instr.avoid} onChange={v=>set('avoid',v)} tone="avoid"
          pending={avoidPend}
          placeholder={L('ör. derin squat','e.g. deep squat')}/>,'a3')}
      {field(4,L('Seans süresi','Session length'),
        L('Bugünkü S&C seansı için hedef süre.','Target length for today\'s session.'),
        <DiNumberChoice value={instr.duration}
          onChange={v=>save({...instr,duration:v,durationSet:v!=null})} choices={DI_DUR_CHOICES}
          unit={L('dk','min')} placeholder={L('seanstan','auto')} min={10} max={240}/>,'a4')}
      {field(5,L('Maks. egzersiz','Exercise ceiling'),
        L('Seansta toplam en fazla kaç egzersiz olsun? (tüm fazlar dahil)','How many exercises in the whole session at most? (all phases)'),
        <DiNumberChoice value={instr.maxExercises}
          onChange={v=>save({...instr,maxExercises:v,maxExercisesSet:v!=null})} choices={DI_EX_CHOICES}
          unit={L('adet','items')} placeholder={L('süreden','auto')} min={1} max={14}/>,'a5')}
      {field(6,L('Notlar','Notes'),
        L('Bu sporcu için ek not veya talimat.','Anything else the model should know.'),
        <LiveInput className="di-notes" value={instr.notes} onChange={v=>set('notes',v)}
          placeholder={L('ör. bugün maç var, seans hazırlık niteliğinde olsun',
            'e.g. game today, keep it to priming')}/>,'a6')}
    </div>

    <div className="di-genbar">
      {onSnapshot&&<button type="button" className="di-snapbtn" onClick={snapshot}
        title={L('Sporcunun o anki bütün güncel verisini ve bu talimatı tek bir JSON olarak verir.',
          'The athlete\'s current data and this brief, as one JSON document.')}>
        <span className="di-gen-t">{L('Sporcu Bilgilerini Al','Get athlete data')}</span>
        <span className="di-gen-s">{L('Güncel veriler + talimat · JSON','Current data + brief · JSON')}</span>
      </button>}
      {onImport&&<button type="button" className="di-snapbtn" onClick={onImport}
        title={L('Başka bir yapay zekânın yazdığı program JSON\'unu yapıştır; program olarak okunur, onayından sonra takvime yazılır.',
          'Paste a programme JSON written by another model; it is read as a session and written to the calendar once you approve it.')}>
        <span className="di-gen-t">{L('AI Programını Yükle','Load AI programme')}</span>
        <span className="di-gen-s">{L('JSON yapıştır · onayla · takvime yaz','Paste JSON · approve · write')}</span>
      </button>}
    </div>
  </div>);
}

/* The session that came back. Read-only on purpose: what is on screen is exactly what
   Write puts on the athlete's calendar, and it is edited there — on the athlete's own
   card, where every other programme in this app is edited.

   Each exercise is numbered inside its block, because a coach reads a session out
   loud ("üçüncü hareket"), and the dose sits in one pill beside the name rather than
   at the far end of a wide card. Where the readiness cut moved a row, the pill carries
   both numbers with an arrow between them. */
const DI_PHASES_LBL={hazirlik:['Hazırlık','Preparation'],ana:['Ana iş','Main work'],
  tamamlayici:['Tamamlayıcı','Complementary']};
/* The athlete's written session, read back off their calendar into the rows the
   programme card draws. What the calendar does not carry (the D-ids an exercise
   answers, its kit, the kind of section) is taken from the loaded programme wherever
   the exercise or section is still the same one. */
function diSessionRows(ses,program){
  const lo=x=>String(x||'').trim().toLowerCase();
  const byName={},kindOf={};
  diProgramRows(program,0).forEach(r=>{
    if(!byName[lo(r.name)])byName[lo(r.name)]=r;
    if(r.block&&r.phase&&!kindOf[lo(r.block)])kindOf[lo(r.block)]=r.phase;
  });
  const out=[];
  ((ses&&ses.blocks)||[]).forEach((b,bi)=>{
    const phases=blkPhases(b);
    const exs=phases.length?sortExsByPhase(b.exercises||[],phases):(b.exercises||[]);
    exs.forEach((e,i)=>{
      if(!String(e.name||'').trim())return;
      const ph=exPhase(e);
      const block=phases.length?(ph?blkPhaseLbl(ph,b):L('Fazsız','Unplaced')):String(b.name||'');
      const src=byName[lo(e.name)]||null;
      const dose={sets:e.sets||'',reps:e.reps||'',duration:e.duration||''};
      out.push({key:e.id||`c${bi}-${i}`,name:e.name,block,phase:kindOf[lo(block)]||undefined,
        pattern:e.pattern||(src&&src.pattern)||'',coachPattern:(src&&src.coachPattern)||null,equipment:exEquipText(src&&src.equipment),
        why:exDesc(e),basis:(src&&src.basis)||[],
        load:e.load||'',tempo:e.tempo||'',rest:e.rest||'',
        prescribed:dose,adjusted:dose,changed:false});
    });
  });
  return out;
}
/* Consecutive rows of the same block and phase, as one block — the way both the card
   and its printout draw a session. */
function diGroupRows(rows){
  const blocks=[];
  (rows||[]).forEach(r=>{
    const last=blocks[blocks.length-1];
    if(last&&last.name===r.block&&last.phase===r.phase)last.rows.push(r);
    else blocks.push({name:r.block,phase:r.phase,rows:[r]});
  });
  return blocks;
}
/* A block's title and, where it says something the title does not, its phase tag. */
function diBlockLabel(b){
  const lbl=b.phase&&DI_PHASES_LBL[b.phase]?L(DI_PHASES_LBL[b.phase][0],DI_PHASES_LBL[b.phase][1]):'';
  if(!b.name)return{title:lbl,tag:''};
  /* "Ana İş" under a block already called Ana İş is a label twice, not a label.
     Spaces come out of the key as well: lowercasing a Turkish İ leaves a
     combining dot behind, which the normaliser turns into a space. */
  const key=x=>diExName(x).replace(/\s+/g,'');
  return{title:b.name,tag:lbl&&key(lbl)!==key(b.name)?lbl:''};
}
const diDose=d=>{
  const reps=d.reps||d.duration||'';
  return d.sets?(reps?`${d.sets}×${reps}`:`${d.sets}×`):(reps||'—');
};
/* The programme on paper: the rows the card draws — the calendar's version once it has
   been edited there — laid out for the gym floor, one exercise to a line, and handed
   straight to the browser's print dialog (which also saves it as a PDF). It is drawn
   out of the same masthead, session banner and phase cards as the calendar's printout
   (rptDocHead · rptSessBanner · rptPhaseCard), so the two sheets are one design.
   `time`, `duration`, `focus` and `rpe` (its target RPE) are the session's own line: the
   calendar's copy once it is written, the plan's before. */
function printDiProgram({ath,date,title,rows,pct,time,duration,focus,rpe}){
  const w=window.open('','_blank','width=960,height=1000');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const a=ath||{};
  const blocks=diGroupRows(rows).map(b=>{
    const bl=diBlockLabel(b);
    const trs=b.rows.map((r,k)=>{
      const d=r.changed
        ?`<s>${esc(diDose(r.prescribed))}</s> → <b>${esc(diDose(r.adjusted))}</b>`
        :`<b>${esc(diDose(r.adjusted))}</b>`;
      return`<tr><td class="n">${k+1}</td>
        <td class="ex"><div class="pc-nm">${esc(r.name)}</div>${r.why?`<div class="pc-why">${esc(r.why)}</div>`:''}</td>
        <td class="ds">${d}${r.distance?`<div class="pc-dd">${esc(r.distance)}</div>`:''}</td>
        <td>${esc(r.load)||'—'}</td><td>${esc(r.tempo)||'—'}</td><td>${esc(r.rest)||'—'}</td></tr>`;
    }).join('');
    return rptPhaseCard(bl.title,bl.tag,trs);
  }).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(a.name||'')}</title>
<style>
@page{size:A4 portrait;margin:10mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--bg2:#f4f5f7}
body{color:var(--text);font-size:11px;line-height:1.4;background:#fff;padding:0 2px}
${RPT_HEAD_CSS}
${RPT_PHASE_CSS}
.bs{padding:10px 16px}
.bs .pc-card:last-child{margin-bottom:0}
.adj{font-size:9.5px;color:var(--muted);margin:0 2px 10px}
.ft{margin-top:6px;font-size:9px;color:var(--dim);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:12px;z-index:9999}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:7px 16px;border-radius:7px;font-weight:600;cursor:pointer;margin:0 4px;font-size:12.5px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
</style></head><body>
<div class="print-bar">${L('Program hazır','The programme is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp" style="height:66px"></div>
${rptDocHead(esc(a.name||'—'),fdLong(date),
  rptHeadStats(rptVolStats((rows||[]).map(r=>({name:r.name,sets:r.adjusted&&r.adjusted.sets,reps:r.adjusted&&r.adjusted.reps,load:r.load}))),
    ...sesRpeRange({rpeTarget:rpe})),teamLogo())}
<div class="sess">
${rptSessBanner({no:1,nameHTML:esc(title),time,duration,purpose:focus,
  meta:[{lbl:L('Pozisyon','Position'),val:a.position?posOf(a.position):''}]})}
<div class="bs">
${pct?`<div class="adj">${L(`Hazır oluşa göre hacim ayarı %${Math.abs(pct)} uygulandı — üstü çizili değer modelin yazdığı, kalın olan uygulanacak olan.`,
  `The readiness adjustment of ${Math.abs(pct)}% has been applied — the struck value is what the model wrote, the bold one is what is done.`)}</div>`:''}
${blocks||`<div class="adj">${L('Programda egzersiz yok.','The programme has no exercises.')}</div>`}
</div>
</div>
<div class="ft"><span>${esc(title)}</span><span>CoachOS · ${esc(fdL(date))}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400);
}
function DiProgramView({program,rows,adj,libMap,onAddToLibrary,diffs}){
  const blocks=diGroupRows(rows);
  const dose=diDose;
  /* The D-ids an exercise cites, spelled out on hover — the card no longer lists them. */
  const diffText=id=>{const d=(diffs||[]).find(x=>x.id===id);return d?d.text:undefined;};
  return(<div className="di-prog">
    {blocks.map((b,i)=>{const bl=diBlockLabel(b);return <div key={i} className="di-progblk">
      {bl.title&&<div className="di-blkh">
        <span>{bl.title}</span>
        {bl.tag?<i className={'di-phase '+b.phase}>{bl.tag}</i>:null}
      </div>}
      {b.rows.map((r,k)=><div key={r.key} className="di-prow">
        <span className="di-pnum">{k+1}</span>
        <div className="di-prow-main">
          <div className="di-prow-nm">
            <b>{r.name}</b>
            {(() => {
              /* "In the library" is read off the library as it is NOW, not off what the
                 answer claimed: an exercise filed from this row a second ago is in it. */
              const inLib=!!(libMap&&libMap[String(r.name||'').trim().toLowerCase()]);
              return inLib
                ?<i className="di-src library">{L('kütüphane','library')}</i>
                :<><i className="di-src custom">custom</i>
                  {onAddToLibrary&&<button type="button" className="di-addlib"
                    onClick={()=>onAddToLibrary(r)}
                    title={L('Bu egzersizi egzersiz kütüphanesine ekler; hareket paterni de kaydedilir.',
                      'Files this exercise in the library, with its movement pattern.')}>
                    ＋ {L('kütüphaneye ekle','add to library')}</button>}</>;
            })()}
            {r.pattern?<i className="di-pat">{r.pattern}</i>:null}
            {r.equipment?<i className="di-eqt">{r.equipment}</i>:null}
          </div>
          {/* The ids this exercise says it answers, beside the reason it gives. Two
              lines that disagree are the useful case: a rationale about ankle mobility
              citing the differentiator about a painful knee is visible here and
              nowhere else. */}
          {(r.why||(r.basis||[]).length>0)&&<div className="di-prow-why">
            {(r.basis||[]).map(b=><i key={b} className="di-basis" title={diffText(b)}>{b}</i>)}
            {r.why||''}</div>}
        </div>
        <div className="di-prow-right">
          <span className={'di-dose'+(r.changed?' cut':'')}>
            {r.changed
              ?<><s>{dose(r.prescribed)}</s><em>→</em><b>{dose(r.adjusted)}</b></>
              :<b>{dose(r.adjusted)}</b>}
          </span>
          <div className="di-pmeta">
            {r.distance?<span>{r.distance}</span>:null}
            {r.load?<span>{r.load}</span>:null}
            {r.tempo?<span>{r.tempo}</span>:null}
            {r.rest?<span>{L('dinlenme','rest')} {r.rest}</span>:null}
          </div>
        </div>
      </div>)}
    </div>;})}
    {adj&&adj.pct?<div className="di-progadj">
      {L(`Hazır oluşa göre hacim ayarı %${Math.abs(adj.pct)} uygulandı — üstü çizili değer modelin yazdığı, kalın olan takvime yazılacak olan.`,
        `The readiness adjustment of ${Math.abs(adj.pct)}% has been applied — the struck value is what the model wrote, the bold one is what gets written.`)}
    </div>:null}
  </div>);
}

/* One computed tile. Label, value, an optional meter where the number is a ratio
   against a known limit, and a sub-line that carries the word for the state — a tile
   never leaves its meaning to colour alone, so the band, the zone and the reason are
   spelled out beside the dot. `tone` is the status role, not a hue chosen per tile. */
function DiTile({label,value,unit,sub,tone,fill,title,text}){
  return(<div className={'di-box'+(tone?' t-'+tone:'')} title={title||undefined}>
    <div className="di-k">{label}</div>
    <div className={'di-v'+(text?' txt':'')}>{value}{unit?<small>{unit}</small>:null}</div>
    {fill!=null&&<div className="di-meter"><span style={{width:`${Math.max(0,Math.min(100,fill))}%`}}/></div>}
    {sub?<div className="di-sub">{tone?<i className="di-dot"/>:null}{sub}</div>:null}
  </div>);
}
/* A section of the card: the three acts a coach reads in order — what today looks
   like, what they are asking for, and what came back. */
function DiSection({n,title,meta,children,className}){
  return(<section className={'di-sec'+(className?' '+className:'')}>
    <header className="di-sech">
      <span className="di-secn">{n}</span>
      <h4>{title}</h4>
      {meta?<span className="di-secmeta">{meta}</span>:null}
    </header>
    {children}
  </section>);
}

