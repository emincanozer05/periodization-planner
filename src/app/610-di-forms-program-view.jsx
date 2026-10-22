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

/* The movement patterns of the session, written by hand. Chips across the top pick them;
   every picked pattern is a row of the table (PlanTable): the exercise — picked off the
   library or typed, a new name is filed into it — its alternative (with a dose of its own),
   how many exercises of the pattern, the prescription, a link and a note. "Egzersiz adedi"
   adds further rows of the same pattern. The rows are a running order: neighbours that share a
   pattern fold under one name, and ↑ / ↓ move an exercise past its neighbour, whatever pattern it
   is — the programme and the printout read in the order written here.
   The session can be cut into phases ("Faz Ekle"): each phase is a section with a table of
   its own and a name the coach types over; the first one opened takes in what is already
   written, and closing one puts its rows back as unplaced.
   A pattern that loads a region reported painful today is marked, and stays a full choice:
   the coach has seen the pain, so a picked pattern is never dropped for it. */
function DiPatternPlan({plan,onChange:emit}){
  const list=diMovePatterns(plan&&plan.patterns);
  const phases=diMovePhases(plan&&plan.phases);
  /* Every edit starts from the latest plan THIS table wrote, not from the one it last drew:
     the store takes a moment to hand a write back, and two edits in quick succession (a name
     typed, then a number in the next row) would otherwise each start from the same old plan
     and the second would wipe the first. The plan the store hands back replaces it. */
  const latest=useRef({list,phases});
  /* The plans this table wrote that the store has not handed back yet. When one comes back it
     is only an echo: if it is an older one than the last written, the newer edit is still on
     its way and must not be thrown away; anything the table did not write is taken as it is. */
  const sent=useRef([]);
  const sig=(l,ph)=>JSON.stringify([l,ph]);
  useEffect(()=>{
    const nl=diMovePatterns(plan&&plan.patterns),np=diMovePhases(plan&&plan.phases);
    const at=sent.current.indexOf(sig(nl,np));
    if(at>=0&&at<sent.current.length-1)return;                  // an older echo
    sent.current=[];
    latest.current={list:nl,phases:np};
  },[plan&&plan.patterns,plan&&plan.phases]);
  const commit=(l,ph)=>{
    const nl=diMovePatterns(l),np=diMovePhases(ph);
    latest.current={list:nl,phases:np};
    sent.current=[...sent.current.slice(-30),sig(nl,np)];
    emit({patterns:nl,phases:np});
  };
  /* Phase sections fold shut to a bar ("Hazırlık Bölümü · 6 egzersiz"); what is written in one is
     kept, only not drawn. Keyed by phase id, '_loose' for the unplaced tray. */
  const[folded,setFolded]=useState(()=>new Set());
  const toggleFold=id=>setFolded(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const known=ph=>latest.current.phases.some(x=>x.id===ph);
  const phOf=p=>(known(p.phase||'')?p.phase:'');
  /* Rows are addressed by their place in the phase's own running order: key `phase|n`. */
  const phIdx=ph=>{const o=[];latest.current.list.forEach((p,i)=>{if(phOf(p)===ph)o.push(i);});return o;};
  const itemsOf=(id,ph)=>latest.current.list.filter(p=>p.id===id&&phOf(p)===ph);
  const setList=l=>commit(l,latest.current.phases);
  const fresh=(id,ph)=>({...diMovePatterns([{id,phase:ph}])[0]});
  const named=p=>!!(String(p.exercise||'').trim()||String(p.sets||'').trim()||String(p.reps||'').trim());
  const confirmDrop=items=>!items.some(named)||confirm(L(`${items.length} egzersiz silinecek. Devam edilsin mi?`,
    `${items.length} exercise${items.length>1?'s':''} will be deleted. Continue?`));
  const parse=k=>{const[ph,n]=k.split('|');return[ph,Number(n)];};
  const gidx=k=>{const[ph,n]=parse(k);return phIdx(ph)[n];};
  const patch=(k,fn)=>{const gi=gidx(k);if(gi==null)return;
    setList(latest.current.list.map((p,i)=>i===gi?fn(p):p));};
  /* The consecutive rows of one pattern — a "run" — as global list positions. */
  const runsOf=ph=>{const out=[];phIdx(ph).forEach(gi=>{const p=latest.current.list[gi],last=out[out.length-1];
    if(last&&last.id===p.id)last.at.push(gi);else out.push({id:p.id,at:[gi]});});return out;};
  /* A new phase: a ready-made one (`preset`: preparation, main, cool-down — named in the app's
     language, no typing) or a custom one. Preparation goes first and cool-down last, the main
     phase before the cool-down. The first phase opened takes in everything already written —
     unless it is a preparation or a cool-down, which are not where the written work belongs. */
  const addPhase=preset=>{
    const cur=latest.current;
    const id='ph_'+Math.random().toString(36).slice(2,7);
    const n=cur.phases.length+1;
    const np={id,name:preset?'':L(`Faz ${n}`,`Phase ${n}`),preset:preset||''};
    let ph;
    if(preset==='prep')ph=[np,...cur.phases];
    else if(preset==='main'&&cur.phases.some(x=>x.preset==='cool')){
      const i=cur.phases.findIndex(x=>x.preset==='cool');ph=[...cur.phases.slice(0,i),np,...cur.phases.slice(i)];}
    else ph=[...cur.phases,np];
    const takes=!cur.phases.length&&preset!=='prep'&&preset!=='cool';
    commit(takes?cur.list.map(p=>({...p,phase:id})):cur.list,ph);
  };
  /* Typing the ready-made name back leaves the name unset, so it keeps following the language. */
  const renamePhase=(id,name)=>commit(latest.current.list,latest.current.phases.map(x=>{
    if(x.id!==id)return x;
    const pr=diPhasePreset(x.preset);
    return{...x,name:pr&&name===L(pr.label[0],pr.label[1])?'':name};}));
  const closePhase=id=>{
    const cur=latest.current;
    commit(cur.list.map(p=>p.phase===id?{...p,phase:''}:p),cur.phases.filter(x=>x.id!==id));
  };
  const section=(ph,loose)=>{
    /* A, B… with the place inside the letter: A1, A2, B1 — the same label the calendar gives; the
       rest are numbered 1, 2, 3 in running order. */
    const at=phIdx(ph);
    const tags={};
    {const cnt={};let plain=0;
      at.forEach((gi,n)=>{const ss=String(latest.current.list[gi].superset||'').toUpperCase();
        tags[`${ph}|${n}`]=ss?`${ss}${cnt[ss]=(cnt[ss]||0)+1}`:String(++plain);});}
    const patOpts=ptCatOpts(c=>c.id);
    const runs=runsOf(ph);
    let n0=0;
    const groups=runs.map((run,ri)=>{
      const row=diMoveRow(run.id);
      const g={id:`${ph}|${ri}`,pat:run.id,
        label:row?L(row.label[0],row.label[1]):L('Kategorisiz','No category'),
        color:row?(ML_PIE_COLS[row.k]||''):'',pick:run.id==='',options:patOpts,
        slots:run.at.map(gi=>{const p=latest.current.list[gi];const n=n0++;const k=`${ph}|${n}`;const a=p.alt||{};
          const ck=row?row.k:'';
          return{key:k,tag:tags[k],tagVal:p.superset||'',name:p.exercise,link:p.link,note:p.note,
            sets:p.sets,reps:p.reps,duration:p.duration,tempo:p.tempo,rpe:p.rpe,load:p.load,rest:p.rest,
            a_name:a.name,a_sets:a.sets,a_reps:a.reps,a_duration:a.duration,a_tempo:a.tempo,a_rpe:a.rpe,a_load:a.load,
            a_rest:a.rest,a_link:a.link,tagP:ck,tagS:(p.type||[])[0]||'',tagD:(p.direction||[])[0]||'',
            typeOpts:ptTypeOpts(ck),typeVal:(p.type||[])[0]||'',
            canUp:n>0,canDown:n<at.length-1};})};
      return g;
    });
    /* What a library exercise says about the row it lands on: its category, type and direction.
       `force` is a pick (the row's exercise is being replaced, so the new one brings its own);
       without it (a typed name) only an uncategorised row takes the category, and a type or a
       direction already set stays. */
    const withLib=(k,it,force)=>{
      const gi=gidx(k);if(gi==null||!it)return;
      const p=latest.current.list[gi];
      const t=diPickTags(it,p.exercise);
      if(!t.id)return;
      const nid=(force||p.id==='')?t.id:p.id;
      if(nid!==t.id)return;
      const nx={...p,id:nid};
      if(t.type&&(force||nid!==p.id||!(p.type||[])[0]))nx.type=[t.type];
      if(t.dir&&(force||nid!==p.id||!(p.direction||[])[0]))nx.direction=[t.dir];
      if(nid!==p.id){if(!t.type)nx.type=[];if(!t.dir)nx.direction=[];}
      if(JSON.stringify([nx.id,nx.type,nx.direction])===JSON.stringify([p.id,p.type,p.direction]))return;
      setList(latest.current.list.map((x,i)=>i===gi?nx:x));
    };
    /* A row put under a category keeps the type and direction it has where they are that
       category's, and reads the rest off its exercise's name; '' takes the category off. */
    const recat=(p,nid)=>{
      const c=mvCatById(nid);
      if(!c)return{...p,id:'',type:[],direction:[]};
      const keep=(v,ok)=>ok.includes(v)?v:'';
      const ty=(p.id===nid&&keep((p.type||[])[0],mvTypes(c.k)))||mvGuessType(c.k,p.exercise);
      const dr=(p.id===nid&&keep((p.direction||[])[0],mvDirs(c.k)))||mvGuessDir(c.k,p.exercise,ty);
      return{...p,id:nid,type:ty?[ty]:[],direction:dr?[dr]:[]};
    };
    const handlers={
      /* The stepper of a run adds or drops rows at its end. */
      onCount:(gid,n)=>{
        const run=runsOf(ph)[Number(gid.split('|')[1])];if(!run)return;
        const want=Math.max(1,Math.min(DI_MOVE_MAX_SLOTS,Math.round(n)||1));
        const cur=latest.current.list;
        if(want>run.at.length){
          const last=run.at[run.at.length-1];
          setList([...cur.slice(0,last+1),...Array.from({length:want-run.at.length},()=>fresh(run.id,ph)),...cur.slice(last+1)]);
        }else if(want<run.at.length){
          const drop=run.at.slice(want);
          if(confirmDrop(drop.map(gi=>cur[gi])))setList(cur.filter((_,i)=>!drop.includes(i)));
        }
      },
      onSlot:(k,pt)=>{
        patch(k,p=>{
          const nx={...p,alt:{...(p.alt||{})}};
          Object.keys(pt).forEach(f=>{
            const v=pt[f];
            if(f==='alt'){nx.alt={};}                                   // the alternative, deleted
            else if(f.startsWith('a_')){
              nx.alt[f.slice(2)]=v;
              /* A name the library knows brings its saved link, unless the box already has one. */
              if(f==='a_name'&&!String(nx.alt.link||'').trim()){const lk=libLinkOf(v);if(lk)nx.alt.link=lk;}
            }
            else if(f==='name'){
              nx.exercise=v;
              if(!String(nx.link||'').trim()){const lk=libLinkOf(v);if(lk)nx.link=lk;}
            }
            else nx[f]=f==='superset'?String(v||'').toUpperCase():v;
          });
          return nx;});
        /* A typed name the library has exactly: a row that already has its pattern takes the
           card's type if it has none yet (a row without one is filed when the box is left). */
        if('name' in pt){const gi=gidx(k);const p=gi!=null&&latest.current.list[gi];
          if(p&&p.id!=='')withLib(k,exLibHit(pt.name),false);}
      },
      /* Picking an exercise off the library brings its saved link, pattern and type along. */
      onPick:(k,it,isAlt)=>{
        if(isAlt){patch(k,p=>({...p,alt:{...(p.alt||{}),name:String(it&&it.name||'').slice(0,120),link:(it&&it.link)||(p.alt&&p.alt.link)||''}}));return;}
        patch(k,p=>({...p,exercise:String(it&&it.name||'').slice(0,120),link:(it&&it.link)||p.link||''}));
        withLib(k,it,true);
      },
      /* A name the library has never seen was typed and the box left: if a card by that name
         exists, an unpatterned row is filed the way the card is. */
      onNew:(k,nm)=>{const gi=gidx(k);const p=gi!=null&&latest.current.list[gi];
        if(p&&p.id==='')withLib(k,exLibHit(nm)||{name:nm},false);},
      onLinkBlur:(k,isAlt,v)=>{const gi=gidx(k);const p=gi!=null&&latest.current.list[gi];if(!p)return;
        rememberExerciseLink(isAlt?(p.alt&&p.alt.name):p.exercise,v);},
      onRemove:k=>{const gi=gidx(k);if(gi!=null)setList(latest.current.list.filter((_,i)=>i!==gi));},
      onRemoveGroup:gid=>{const run=runsOf(ph)[Number(gid.split('|')[1])];if(!run)return;
        if(confirmDrop(run.at.map(gi=>latest.current.list[gi])))setList(latest.current.list.filter((_,i)=>!run.at.includes(i)));},
      /* A row with no category was given one: it stays where it is and folds into its neighbours. */
      onRowCat:(k,nid)=>patch(k,p=>recat(p,nid)),
      /* The group's category box: every row of the run takes it ('' takes it off, rows stay). */
      onGroupCat:(gid,nid)=>{const run=runsOf(ph)[Number(gid.split('|')[1])];if(!run)return;
        setList(latest.current.list.map((p,i)=>run.at.includes(i)?recat(p,nid):p));},
      onType:(k,v)=>patch(k,p=>({...p,type:v?[v]:[]})),
      /* Up and down swap a row with the one beside it in the phase, whatever pattern that is. */
      onMove:(k,d)=>{const[h,n]=parse(k);const idx=phIdx(h);const a=idx[n],b=idx[n+d];
        if(a==null||b==null)return;
        const l=[...latest.current.list];[l[a],l[b]]=[l[b],l[a]];setList(l);},
    };
    const addBlank=()=>setList([...latest.current.list,fresh('',ph)]);
    return(<PlanTable groups={groups}
      handlers={handlers} max={DI_MOVE_MAX_SLOTS}
      onAdd={loose?undefined:addBlank} addLabel={L('Egzersiz Ekle','Add Exercise')}
      empty={L('Fazsız satır yok.','No unplaced rows.')}/>);
  };
  const unplaced=list.some(p=>!known(p.phase||''));
  return(<div className="di-pp">
    <PlanPhaseBar presets={DI_PHASE_PRESETS.filter(pr=>!phases.some(x=>x.preset===pr.id)).map(pr=>({id:pr.id,label:L(pr.label[0],pr.label[1])}))}
      onAdd={id=>addPhase(id)}/>
    {phases.length===0
      ?section('',false)
      :<>{phases.map((p,i)=><PlanPhase key={p.id} cls={'pc'+(i%PH_COLORS)} folded={folded.has(p.id)} onFold={()=>toggleFold(p.id)}
          name={diPhaseName(p)} onRename={v=>renamePhase(p.id,v)} count={list.filter(x=>x.phase===p.id).length}
          onClose={()=>closePhase(p.id)}>
          {section(p.id,false)}
        </PlanPhase>)}
        {unplaced&&<PlanPhase cls="loose" folded={folded.has('_loose')} onFold={()=>toggleFold('_loose')}
          name={L('Fazsız','Unplaced')} count={list.filter(x=>!known(x.phase||'')).length}
          note={L('Henüz bir faza konmadı — program bunları sona ekler','Not placed in a phase yet — the programme puts them last')}>
          {section('',true)}
        </PlanPhase>}</>}
  </div>);
}

/* The brief is the movement-pattern table: patterns across the top, an exercise and its dose
   in every row, phases if the session has them (priority, dose, length, ceiling, keep-out and
   notes left the form — the coach writes the session itself). It is stored per athlete PER
   DAY, beside the session it produced, so yesterday's table never silently drives today's. */
function DiInstructionForm({instr,save,athId}){
  const[pasted,setPasted]=useState('');
  /* The table keeps its own copy of the rows it last wrote and only takes a change from outside on
     its next render, so a paste redraws it from scratch (same batch as the write, so it opens on the new rows). */
  const[tableKey,setTableKey]=useState(0);
  /* A programme written before, poured into the table: its blocks become rows, after whatever is
     already written. The table caps each category per section, so the count says what fitted. */
  const pasteProgram=row=>{
    const r=pbToPatterns(row.blocks,instr);
    save({...instr,patterns:r.patterns,phases:r.phases});
    setTableKey(k=>k+1);
    const ex=n=>n===1?'exercise':'exercises';
    setPasted(r.added>=r.total?L(`${r.added} egzersiz tabloya eklendi.`,`${r.added} ${ex(r.added)} added to the table.`)
      :L(`${r.added} / ${r.total} egzersiz eklendi — kalanlar kategori başına üst sınıra takıldı.`,`${r.added} of ${r.total} exercises added — the rest hit the per-category limit.`));
    setTimeout(()=>setPasted(''),6000);
  };
  return(<div className="di-brief">
    <div className="di-fgrid">
      <div className="di-field wide">
        <div className="di-fhd">
          <label>{L('Antrenman tablosu','Training table')}</label>
          <ProgramPickBtn athId={athId} cls="btn xs sec" label={L('Kayıtlı programdan doldur','Fill from a saved programme')} onPick={pasteProgram}
            title={L('Önceden yazılmış bir programı bul; egzersizleri tabloya satır olarak eklenir','Find a programme written before; its exercises are added to the table as rows')}/>
          {pasted&&<span className="di-dim" role="status">{pasted}</span>}</div>
        <span className="di-fhint">{L('Seçilen her kategori için egzersizi, alternatifini, sayısını ve dozunu yaz. Kütüphaneden seç ya da yaz — yeni yazılan egzersiz kütüphaneye kaydedilir. Boş bıraktığın satır programa girmez.',
          'Write the exercise, its alternative, how many and the dose of every category picked. Pick from the library or type one — a new name is filed into the library. A row left empty stays out of the session.')}</span>
        <div className="di-fctl"><DiPatternPlan key={tableKey} plan={{patterns:instr.patterns,phases:instr.phases}}
          onChange={pl=>save({...instr,patterns:pl.patterns,phases:pl.phases})}/></div>
      </div>
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
/* An alternative's dose on one line: "3×8 · 60% 1RM · 3-0-1 · RPE 7 · dinlenme 90 sn". */
function diAltDose(a){
  if(!a)return'';
  const t=v=>String(v==null?'':v).trim();
  const sr=t(a.sets)&&t(a.reps)?`${t(a.sets)}×${t(a.reps)}`:(t(a.sets)?`${t(a.sets)} ${L('set','sets')}`:t(a.reps));
  return[sr,t(a.duration),t(a.load),t(a.tempo),t(a.rpe)?`RPE ${t(a.rpe)}`:'',t(a.rest)?`${L('dinlenme','rest')} ${t(a.rest)}`:'']
    .filter(Boolean).join(' · ');
}
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
        load:e.load||'',tempo:e.tempo||'',rpe:e.rpe||'',rest:e.rest||'',
        ...(e.alt&&typeof e.alt==='object'?{alt:e.alt}:{}),
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
   calendar's copy once it is written, the plan's before. `withImages` puts the library's
   picture of each exercise beside its name, as a small thumbnail. */
function printDiProgram({ath,date,title,rows,pct,time,duration,focus,rpe,withImages}){
  const w=window.open('','_blank','width=960,height=1000');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const a=ath||{};
  const img=nm=>{if(!withImages)return'';const src=rptExImage({name:nm});
    return src?`<div class="ex-imgwrap"><img class="ex-img" src="${esc(mediaSrc(src))}" alt="${esc(nm)}"></div>`:'';};
  const blocks=diGroupRows(rows).map(b=>{
    const bl=diBlockLabel(b);
    const trs=b.rows.map((r,k)=>{
      const d=r.changed
        ?`<s>${esc(diDose(r.prescribed))}</s> → <b>${esc(diDose(r.adjusted))}</b>`
        :`<b>${esc(diDose(r.adjusted))}</b>`;
      /* The alternative, as its own row under the exercise it stands in for, with the dose it
         is done at — the same row the calendar's printout draws. */
      const al=(r.alt&&typeof r.alt==='object')?r.alt:null;
      const alDose=al&&['sets','reps','duration','load','tempo','rpe','rest'].some(x=>String(al[x]||'').trim());
      const alRow=al&&(String(al.name||'').trim()||alDose)?`<tr class="ex-row alt-row">
        <td class="n"><span class="alt-of"><span class="alt-hook">↳</span><span class="ex-badge ghost">${k+1}</span></span></td>
        <td class="ex"><div class="ex-ex-wrap">${img(al.name)}<div class="ex-ex-txt"><div class="alt-for">${L('⇄ ALTERNATİF','⇄ ALTERNATIVE')}</div>
          <div class="ex-nm-wrap"><span class="alt-name">${esc(al.name)||L('(belirtilmedi)','(not named)')}</span></div></div></div></td>
        <td class="ds">${diDose({sets:al.sets,reps:al.reps,duration:al.duration})==='—'?'—':`<b>${esc(diDose({sets:al.sets,reps:al.reps,duration:al.duration}))}</b>`}</td>
        <td>${esc(al.load)||'—'}</td><td>${esc(al.tempo)||'—'}</td><td>${esc(al.rpe)||'—'}</td><td>${esc(al.rest)||'—'}</td></tr>`:'';
      return`<tr class="ex-row${alRow?' has-alt':''}"><td class="n">${k+1}</td>
        <td class="ex"><div class="ex-ex-wrap">${img(r.name)}<div class="ex-ex-txt">${rptPatHTML(r.name,r.pattern)}<div class="pc-nm">${esc(r.name)}</div>${r.why?`<div class="pc-why">${esc(r.why)}</div>`:''}</div></div></td>
        <td class="ds">${d}${r.distance?`<div class="pc-dd">${esc(r.distance)}</div>`:''}</td>
        <td>${esc(r.load)||'—'}</td><td>${esc(r.tempo)||'—'}</td><td>${esc(r.rpe)||'—'}</td><td>${esc(r.rest)||'—'}</td></tr>${alRow}`;
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
.ex-ex-wrap{display:flex;align-items:center;gap:8px;min-width:0}
.ex-ex-txt{min-width:0}
.ex-imgwrap{flex:none;line-height:0;width:16mm;height:12mm;border:1px solid #e2e8f0;border-radius:5px;background:#fff;overflow:hidden}
.ex-img{display:block;width:100%;height:100%;object-fit:contain}
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
          {r.alt&&(r.alt.name||diAltDose(r.alt))&&<div className="di-prow-why"><i className="di-basis">⇄</i>
            {L('Alternatif:','Alternative:')} <b>{r.alt.name||'—'}</b>{diAltDose(r.alt)?<span> · {diAltDose(r.alt)}</span>:null}</div>}
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
            {r.rpe?<span>RPE {r.rpe}</span>:null}
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

