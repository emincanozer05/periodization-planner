/* =========================================================
   INTERVAL TIMER
   =========================================================
   The other half of the Tempo tab: a tempo runs one rep at a time, an interval runs
   the clock. Work, rest, round, set — and the answer to "what am I doing right now"
   is the colour of the screen rather than a word: green while the work is on, red on
   the rest, blue on the break between rounds/sets. Full screen makes that colour the
   whole display, so it reads from the far end of the gym. */
const IT_KINDS={
  prep: {label:'Get ready',  tr:'Hazırlan',   short:'PREP',hint:'starting in',         hintTr:'başlıyor',            color:'#f59e0b'},
  work: {label:'Work',       tr:'Çalışma',    short:'WORK',hint:'go',                  hintTr:'başla',               color:'#10b981'},
  rest: {label:'Rest',       tr:'Dinlenme',   short:'REST',hint:'recover',             hintTr:'toparlan',            color:'#ef4444'},
  brk:  {label:'Set break',  tr:'Set arası',  short:'SET', hint:'between rounds/sets', hintTr:'tur / set arası',     color:'#3b82f6'},
  done: {label:'Finished',   tr:'Bitti',      short:'DONE',hint:'session complete',    hintTr:'seans tamamlandı',    color:'#8b5cf6'},
};
const itKind=k=>{const z=IT_KINDS[k]||IT_KINDS.work;return{...z,label:L(z.tr,z.label),hint:L(z.hintTr,z.hint)};};
/* Written the way a conditioning block is written on a whiteboard: work / rest ×
   rounds, and how many times that block is repeated. */
const IT_PRESETS=[
  {name:'Tabata',      code:'20/10 ×8',  work:20,rest:10,rounds:8, sets:1,setRest:0},
  {name:'HIIT 30/30',  code:'30/30 ×10', work:30,rest:30,rounds:10,sets:1,setRest:0},
  {name:'40/20',       code:'40/20 ×8×2',work:40,rest:20,rounds:8, sets:2,setRest:120},
  {name:'Sprint reps', code:'15/45 ×6×3',work:15,rest:45,rounds:6, sets:3,setRest:180},
  {name:'RSA 6×30m',   code:'6/24 ×6×2', work:6, rest:24,rounds:6, sets:2,setRest:150},
];
const itNum=(v,d,lo,hi)=>{const n=Number(v);return Number.isFinite(n)?Math.max(lo,Math.min(hi,Math.round(n))):d;};
function defaultInterval(){
  return{name:'Interval',work:30,rest:30,rounds:8,sets:1,setRest:120,prep:10,sound:true,saved:[]};
}
function normIntervalOne(c,d){
  d=d||defaultInterval();
  if(!c||typeof c!=='object')return{...d,saved:undefined};
  return{name:c.name||d.name,
    work:itNum(c.work,d.work,1,3600),
    rest:itNum(c.rest,d.rest,0,3600),
    rounds:itNum(c.rounds,d.rounds,1,99),
    sets:itNum(c.sets,d.sets,1,99),
    setRest:itNum(c.setRest,d.setRest,0,3600),
    prep:itNum(c.prep,d.prep,0,60)};
}
function normInterval(c){
  const d=defaultInterval();const base=normIntervalOne(c,d);
  return{...base,sound:!c||c.sound!==false,
    saved:(c&&Array.isArray(c.saved)?c.saved:[]).map(s=>({id:s.id||uid(),...normIntervalOne(s,d)}))};
}
/* The whole session as a flat list of blocks. A round's rest is dropped after the last
   round of a set — what follows there is the set break, not another rest — and blocks
   set to zero seconds simply never appear. */
function intervalSchedule(c){
  const steps=[];const rounds=Math.max(1,c.rounds|0),sets=Math.max(1,c.sets|0);
  for(let s=1;s<=sets;s++){
    for(let r=1;r<=rounds;r++){
      if(c.work>0)steps.push({kind:'work',sec:c.work,set:s,round:r});
      if(r<rounds&&c.rest>0)steps.push({kind:'rest',sec:c.rest,set:s,round:r});
    }
    if(s<sets&&c.setRest>0)steps.push({kind:'brk',sec:c.setRest,set:s,round:rounds});
  }
  return steps;
}
const itClock=s=>{const v=Math.max(0,Math.round(s));return `${Math.floor(v/60)}:${pad(v%60)}`;};
const itWorkSec=c=>Math.max(1,c.work)*Math.max(1,c.rounds|0)*Math.max(1,c.sets|0);

/* The ring the countdown sits in: the inner arc drains through the current block, the
   thin outer arc fills over the whole session. */
function ItRing({frac,total,color,children,pulse}){
  const R=112,C=2*Math.PI*R,R2=128,C2=2*Math.PI*R2;
  return(<div className={'it2-ring'+(pulse?' pulse':'')}>
    <svg viewBox="0 0 280 280" aria-hidden="true">
      <circle cx="140" cy="140" r={R2} className="it2-trk2"/>
      <circle cx="140" cy="140" r={R2} className="it2-arc2" style={{strokeDasharray:C2,strokeDashoffset:C2*(1-total)}}/>
      <circle cx="140" cy="140" r={R} className="it2-trk"/>
      <circle cx="140" cy="140" r={R} className="it2-arc" style={{stroke:color,strokeDasharray:C,strokeDashoffset:C*frac}}/>
    </svg>
    <div className="it2-ring-c">{children}</div>
  </div>);
}

function IntervalPlayer({cfg,onSound}){
  const steps=useMemo(()=>intervalSchedule(cfg),[cfg]);
  const totalSec=useMemo(()=>steps.reduce((a,p)=>a+p.sec,0),[steps]);
  const prep=cfg.prep,sound=cfg.sound;
  /* When each block starts on the session clock (the get-ready count included), so a
     skip or a click on the timeline is one assignment to the clock. */
  const starts=useMemo(()=>{const a=[];let acc=prep;steps.forEach(s=>{a.push(acc);acc+=s.sec;});return a;},[steps,prep]);
  const[run,setRun]=useState(false);
  const[t,setT]=useState(0);            // seconds since Start, the get-ready count included
  const[fs,setFs]=useState(false);      // full screen — the colour and nothing else
  const raf=useRef(0),last=useRef(0),ac=useRef(null),lock=useRef(null);
  const wrap=useRef(null),native=useRef(false);
  const total=prep+totalSec;

  /* Full screen asks the browser first; where that is refused — Safari on iOS won't
     give a plain <div> the Fullscreen API — the same class still covers the viewport,
     so the button does what it says on every device. */
  const enterFs=()=>{
    setFs(true);
    const el=wrap.current;if(!el)return;
    const req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(!req)return;
    try{const r=req.call(el);native.current=true;if(r&&r.catch)r.catch(()=>{native.current=false;});}
    catch(e){native.current=false;}
  };
  const exitFs=()=>{
    setFs(false);
    if(!native.current)return;
    native.current=false;
    try{
      const ex=document.exitFullscreen||document.webkitExitFullscreen;
      if(ex&&(document.fullscreenElement||document.webkitFullscreenElement))ex.call(document);
    }catch(e){}
  };
  useEffect(()=>{
    const onCh=()=>{if(native.current&&!(document.fullscreenElement||document.webkitFullscreenElement)){
      native.current=false;setFs(false);}};
    document.addEventListener('fullscreenchange',onCh);
    document.addEventListener('webkitfullscreenchange',onCh);
    return()=>{
      document.removeEventListener('fullscreenchange',onCh);
      document.removeEventListener('webkitfullscreenchange',onCh);
      try{
        const ex=document.exitFullscreen||document.webkitExitFullscreen;
        if(native.current&&ex&&(document.fullscreenElement||document.webkitFullscreenElement))ex.call(document);
      }catch(e){}
    };
  },[]);
  useEffect(()=>{
    if(!fs)return;
    const prev=document.body.style.overflow;document.body.style.overflow='hidden';
    document.body.classList.add('it2-fs-on');
    return()=>{document.body.style.overflow=prev;document.body.classList.remove('it2-fs-on');};
  },[fs]);

  const beep=(freq,dur,vol)=>{
    if(!sound)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!ac.current)ac.current=new AC();
      const c=ac.current;if(c.state==='suspended')c.resume();
      const o=c.createOscillator(),g=c.createGain(),now=c.currentTime;
      o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(c.destination);
      g.gain.setValueAtTime(vol||.16,now);g.gain.exponentialRampToValueAtTime(.0001,now+(dur||.09));
      o.start(now);o.stop(now+(dur||.09)+.02);
    }catch(e){/* no audio device / blocked autoplay — the colour carries on */}
  };
  const buzz=ms=>{try{if(navigator.vibrate)navigator.vibrate(ms);}catch(e){}};

  useEffect(()=>{
    if(!run)return;
    last.current=performance.now();
    const loop=now=>{const d=(now-last.current)/1000;last.current=now;
      setT(p=>p+d);raf.current=requestAnimationFrame(loop);};
    raf.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf.current);
  },[run]);

  // Keep the phone awake while the session is running; released as soon as it stops.
  useEffect(()=>{
    if(!run)return;
    let released=false;
    try{
      if(navigator.wakeLock&&navigator.wakeLock.request)
        navigator.wakeLock.request('screen').then(s=>{if(released)s.release();else lock.current=s;}).catch(()=>{});
    }catch(e){}
    return()=>{released=true;try{lock.current&&lock.current.release();}catch(e){}lock.current=null;};
  },[run]);

  const el=Math.min(t,total);
  const inPrep=el<prep;
  const done=totalSec>0&&t>=total;
  let idx=-1,phEl=0;
  if(!inPrep&&steps.length){
    for(let i=0;i<steps.length;i++){
      if(el<starts[i]+steps[i].sec||i===steps.length-1){idx=i;phEl=Math.min(el-starts[i],steps[i].sec);break;}
    }
  }
  const step=idx>=0?steps[idx]:null;
  const kindKey=done?'done':(inPrep?'prep':(step?step.kind:'work'));
  const k=itKind(kindKey);
  const frac=done?1:inPrep?(prep?el/prep:1):(step&&step.sec>0?Math.min(1,Math.max(0,phEl/step.sec)):0);
  const remain=done?0:(inPrep?prep-el:(step?step.sec-phEl:0));
  const nextStep=done?null:(inPrep?steps[0]:steps[idx+1]||null);

  /* One tone per block change, pitched by kind, plus a tick on each of the last three
     seconds so the athlete hears the change coming without looking up. */
  const marker=useRef(null);
  useEffect(()=>{
    if(!run)return;
    const key=done?'done':(inPrep?'prep':'s'+idx)+'|'+Math.ceil(Math.max(0,remain));
    if(marker.current===key)return;
    const prevKey=marker.current;marker.current=key;
    if(prevKey===null)return;
    const block=key.split('|')[0];
    if(done){beep(880,.5,.2);buzz([200,80,200]);return;}
    if(prevKey.split('|')[0]!==block){beep(kindKey==='work'?880:kindKey==='rest'?440:620,.16,.18);buzz(120);}
    else if(remain<=3.05)beep(660,.06,.11);
  });

  useEffect(()=>{if(run&&done){setRun(false);setT(total);}},[run,done,total]);

  const start=()=>{if(!steps.length)return;if(done||t>=total){setT(0);marker.current=null;}
    beep(660,.08,.14);setRun(true);};
  const pause=()=>setRun(false);
  const reset=()=>{setRun(false);setT(0);marker.current=null;};
  const jumpTo=i=>{marker.current=null;if(i<0){setT(0);return;}if(i>=steps.length){setT(total);return;}setT(starts[i]+0.001);};
  const next=()=>jumpTo(inPrep?0:idx+1);
  const prev=()=>{if(inPrep){setT(0);return;}if(phEl>2)jumpTo(idx);else jumpTo(idx-1);};

  // Space starts and stops the session, ← → skip a block, F fills the screen, Esc comes back.
  const act=useRef(null);
  act.current={space:()=>run?pause():start(),f:()=>fs?exitFs():enterFs(),esc:()=>{if(fs)exitFs();},next,prev};
  useEffect(()=>{
    const onKey=e=>{
      const tag=(e.target&&e.target.tagName)||'';
      if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(tag)||(e.target&&e.target.isContentEditable))return;
      if(e.code==='Space'){e.preventDefault();act.current.space();}
      else if(e.code==='KeyF'){e.preventDefault();act.current.f();}
      else if(e.code==='ArrowRight'){e.preventDefault();act.current.next();}
      else if(e.code==='ArrowLeft'){e.preventDefault();act.current.prev();}
      else if(e.code==='Escape')act.current.esc();
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const roundNo=step?step.round:(done?cfg.rounds:1);
  const setNo=step?step.set:(done?cfg.sets:1);
  const secs=Math.ceil(remain-.0001)||0;
  const big=done?itClock(totalSec):(secs>=60?itClock(secs):String(secs));
  const title=done?L('Bitti','Finished'):k.label;
  const sub=done?L(`${cfg.rounds*cfg.sets} tur · ${itClock(totalSec)}`,`${cfg.rounds*cfg.sets} round${cfg.rounds*cfg.sets===1?'':'s'} · ${itClock(totalSec)}`)
    :k.hint;
  const idle=!run&&t===0;

  if(!steps.length)return(<div className="empty-st">
    {L('Aşağıda çalışma aralığına bir süre ver ki sayacın çalıştıracak bir şeyi olsun.',
       'Give the work interval a duration below and the timer has something to run.')}
  </div>);

  return(<div className={`it2${fs?' fs':''}${run?' running':''}`} ref={wrap} style={{'--it-c':k.color}}>
    {fs&&<button className="it2-fsx" onClick={exitFs} title="Esc">✕ {L('Tam ekrandan çık','Exit full screen')}</button>}
    <div className="it2-stage">
      <div className="it2-side l">
        <div className="it2-kpi"><u>{L('Tur','Round')}</u><b>{roundNo}<i>/{cfg.rounds}</i></b>
          <div className="it2-dots">{Array.from({length:Math.min(cfg.rounds,20)},(_,i)=>
            <span key={i} className={(i+1<roundNo||done)?'d':(i+1===roundNo&&!inPrep&&!idle)?'c':''}/>)}</div></div>
        {cfg.sets>1&&<div className="it2-kpi"><u>{L('Set','Set')}</u><b>{setNo}<i>/{cfg.sets}</i></b></div>}
      </div>
      <ItRing frac={frac} total={total?el/total:0} color={k.color} pulse={run&&!done&&secs<=3&&secs>0}>
        <span className="it2-ph">{title}</span>
        <span className="it2-big">{big}</span>
        <span className="it2-sub">{sub}</span>
      </ItRing>
      <div className="it2-side r">
        <div className="it2-kpi"><u>{L('Kalan süre','Time left')}</u><b>{itClock(total-el)}</b></div>
        <div className={'it2-next'+(nextStep?'':' none')} style={nextStep?{'--nc':itKind(nextStep.kind).color}:null}>
          <u>{L('Sıradaki','Up next')}</u>
          {nextStep?<b><span/>{itKind(nextStep.kind).label} · {nextStep.sec}{L(' sn',' s')}</b>:<b>{done?'—':L('Bitiş','Finish')}</b>}
        </div>
      </div>
    </div>
    <div className="it2-ctrl">
      <button className="it2-cb" onClick={prev} title={L('Önceki blok (←)','Previous block (←)')} aria-label={L('Önceki','Previous')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg></button>
      {run
        ?<button className="it2-play on" onClick={pause} title={L('Duraklat (boşluk)','Pause (space)')} aria-label={L('Duraklat','Pause')}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button>
        :<button className="it2-play" onClick={start} title={L('Başlat (boşluk)','Start (space)')} aria-label={L('Başlat','Start')}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg></button>}
      <button className="it2-cb" onClick={next} title={L('Sonraki blok (→)','Next block (→)')} aria-label={L('Sonraki','Next')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg></button>
      <span className="it2-sep"/>
      <button className="it2-cb" onClick={reset} disabled={!t} title={L('Sıfırla','Reset')} aria-label={L('Sıfırla','Reset')}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v5h5"/></svg></button>
      <button className={'it2-cb'+(sound?' act':'')} onClick={onSound} title={sound?L('Ses açık','Sound on'):L('Ses kapalı','Sound off')} aria-label={L('Ses','Sound')}>
        {sound?<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>
          :<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>}</button>
      <button className="it2-cb" onClick={()=>fs?exitFs():enterFs()} title={L('Tam ekran (F)','Full screen (F)')} aria-label={L('Tam ekran','Full screen')}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
    </div>
    {/* The whole session, block by block. A click jumps the clock to that block. */}
    <div className="it2-tl">
      {steps.map((p,i)=>{const cur=idx===i&&!done;const past=idx>i||done;
        return(<button key={i} type="button" className={`it2-tseg${cur?' on':''}${past?' done':''}${i>0&&steps[i-1].set!==p.set?' nset':''}`}
          style={{flex:`${p.sec} 1 0`,'--sc':itKind(p.kind).color}} onClick={()=>jumpTo(i)}
          title={`${itKind(p.kind).label} · ${p.sec}${L(' sn',' s')} · ${L('Set','Set')} ${p.set} · ${L('Tur','Round')} ${p.round}`}>
          <b style={{transform:`scaleX(${cur?frac.toFixed(4):(past?1:0)})`}}/>
        </button>);})}
    </div>
    <div className="it2-legend">
      {['work','rest','brk'].map(kk=><span key={kk} style={{'--sc':itKind(kk).color}}><i/>{itKind(kk).label}</span>)}
      <em>{L('Boşluk: başlat/durdur · ← →: blok atla · F: tam ekran','Space: start/stop · ← →: skip block · F: full screen')}</em>
    </div>
  </div>);
}

/* A number with − / + either side, in the unit it is written in. */
/* The box keeps what is being TYPED as its own text, and hands the parent a number only
   when that text is one: clamping every keystroke turned an emptied box straight back
   into the minimum, so "5" could never become "45" — clearing it left "1", and the 4
   landed in front of it. A value in range applies as it is typed; anything else (an
   empty box, a number past the limit) is settled when the box is left or Enter is hit. */
function ItNum({label,hint,value,onChange,lo,hi,step,accent}){
  const st=step||1;
  const set=v=>onChange(itNum(v,lo,lo,hi));
  const[draft,setDraft]=useState(null);   // null = not being edited: show the value
  const type=raw=>{
    const t=String(raw).replace(/[^0-9]/g,'').slice(0,String(hi).length);
    setDraft(t);
    const n=Number(t);
    if(t!==''&&n>=lo&&n<=hi&&n!==value)onChange(n);
  };
  const commit=()=>{if(draft==null)return;if(draft!=='')set(draft);setDraft(null);};
  return(<div className="it2-f" style={accent?{'--fc':accent}:null}>
    <span className="it2-fl">{accent&&<i/>}{label}</span>
    <div className="it2-fin">
      <button type="button" onClick={()=>set(value-st)} disabled={value<=lo} aria-label="−">−</button>
      <input type="text" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" aria-label={label}
        value={draft!=null?draft:String(value)}
        onFocus={e=>{setDraft(String(value));const el=e.target;setTimeout(()=>{try{el.setSelectionRange(0,el.value.length);}catch(_){}},0);}}
        onChange={e=>type(e.target.value)} onBlur={commit}
        onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}}/>
      <button type="button" onClick={()=>set(value+st)} disabled={value>=hi} aria-label="+">+</button>
    </div>
    <span className="it2-fh">{hint}</span>
  </div>);
}

function IntervalTimerPanels({data,setData}){
  const c=useMemo(()=>normInterval(data.interval),[data.interval]);
  const patch=upd=>setData(prev=>({...prev,interval:{...normInterval(prev.interval),...upd}}));
  const[saveName,setSaveName]=useState('');
  const steps=useMemo(()=>intervalSchedule(c),[c]);
  const totalSec=steps.reduce((a,p)=>a+p.sec,0);
  const usePreset=p=>patch({name:p.name,work:p.work,rest:p.rest,rounds:p.rounds,sets:p.sets,setRest:p.setRest});
  const saveCurrent=()=>{const nm=(saveName||c.name||'Interval').trim();
    patch({name:nm,saved:[{id:uid(),name:nm,work:c.work,rest:c.rest,rounds:c.rounds,sets:c.sets,
      setRest:c.setRest,prep:c.prep},...c.saved]});
    setSaveName('');};
  const loadSaved=s=>patch({name:s.name,work:s.work,rest:s.rest,rounds:s.rounds,sets:s.sets,
    setRest:s.setRest,prep:s.prep});
  const delSaved=id=>patch({saved:c.saved.filter(s=>s.id!==id)});
  const isCur=p=>p.work===c.work&&p.rest===c.rest&&p.rounds===c.rounds&&p.sets===c.sets&&p.setRest===c.setRest;
  const ratio=c.rest>0?`1 : ${+(c.rest/c.work).toFixed(2)}`:L('aralıksız','no rest');
  const workShare=totalSec?Math.round(itWorkSec(c)/totalSec*100):0;
  const sec=L('saniye','seconds');
  /* A small picture of a block: work and rest bars for one set, to scale. */
  const mini=p=>{const st=intervalSchedule({...p,sets:1}).slice(0,24);const tot=st.reduce((a,x)=>a+x.sec,0)||1;
    return<div className="it2-mini">{st.map((x,i)=><i key={i} style={{flex:`${x.sec} 1 0`,background:itKind(x.kind).color}}/>)}</div>;};

  return(<>
    <PageHero title={L('Interval Zamanlayıcı','Interval Timer')}
      sub={L('Çalışma / dinlenme, turlar ve setler — durumu ekranın rengi taşır.',
             'Work / rest over rounds and sets — the screen\'s colour carries the state.')}
      stats={[{v:`${c.work}/${c.rest}`,l:L('Çalışma / dinlenme (sn)','Work / rest (s)')},
              {v:`${c.rounds}×${c.sets}`,l:L('Tur × set','Rounds × sets')},
              {v:itClock(c.prep+totalSec),l:L('Tüm seans','Whole session')}]}/>

    <div className="panel it2-panel">
      <IntervalPlayer cfg={c} onSound={()=>patch({sound:!c.sound})}/>
    </div>

    <div className="it2-cols">
      <div className="panel it2-setup">
        <div className="it-head">
          <div className="it-head-t">
            <b>{L('Aralık ayarı','Interval setup')}</b>
            <span>{L('Blok kaç tur sürüyorsa çalışma / dinlenme o kadar tekrarlanır, setler boyunca.',
                     'Work / rest for as many rounds as the block asks for, repeated over sets.')}</span>
          </div>
        </div>
        <div className="it2-grid">
          <ItNum label={L('Çalışma','Work')} hint={sec} value={c.work} lo={1} hi={3600} step={5} accent={IT_KINDS.work.color} onChange={v=>patch({work:v})}/>
          <ItNum label={L('Dinlenme','Rest')} hint={sec} value={c.rest} lo={0} hi={3600} step={5} accent={IT_KINDS.rest.color} onChange={v=>patch({rest:v})}/>
          <ItNum label={L('Tur','Rounds')} hint={L('set başına','per set')} value={c.rounds} lo={1} hi={99} onChange={v=>patch({rounds:v})}/>
          <ItNum label={L('Set','Sets')} hint={L('tekrar','repeats')} value={c.sets} lo={1} hi={99} onChange={v=>patch({sets:v})}/>
          <ItNum label={L('Set arası','Set break')} hint={sec} value={c.setRest} lo={0} hi={3600} step={15} accent={IT_KINDS.brk.color} onChange={v=>patch({setRest:v})}/>
          <ItNum label={L('Hazırlık','Get ready')} hint={sec} value={c.prep} lo={0} hi={60} step={5} accent={IT_KINDS.prep.color} onChange={v=>patch({prep:v})}/>
        </div>
        <div className="it2-sum">
          <div><u>{L('Set başına','Per set')}</u><strong>{itClock(c.work*c.rounds+c.rest*Math.max(0,c.rounds-1))}</strong></div>
          <div><u>{L('Toplam çalışma','Total work')}</u><strong>{itClock(itWorkSec(c))}</strong></div>
          <div><u>{L('Çalışma : dinlenme','Work : rest')}</u><strong>{ratio}</strong></div>
          <div><u>{L('Tüm seans','Whole session')}</u><strong>{itClock(c.prep+totalSec)}</strong></div>
          <div className="wide"><u>{L('Çalışma payı','Work share')}</u>
            <div className="it2-share"><i style={{width:workShare+'%'}}/></div><strong>{workShare}%</strong></div>
        </div>
      </div>

      <div className="it2-rcol">
        <div className="panel">
          <div className="it-head"><div className="it-head-t">
            <b>{L('Hazır protokoller','Ready protocols')}</b>
            <span>{L('Tek tıkla alanlara yükle.','Load one into the fields with a click.')}</span>
          </div></div>
          <div className="it2-presets">
            {IT_PRESETS.map(p=><button key={p.name} type="button" className={'it2-pre'+(isCur(p)?' on':'')} onClick={()=>usePreset(p)}>
              <b>{p.name}</b><span>{p.code}</span>{mini(p)}</button>)}
          </div>
        </div>
        <div className="panel">
          <div className="it-head"><div className="it-head-t">
            <b>{L('Kayıtlı aralıklar','Saved intervals')}</b>
            <span>{L('Geçerli aralığı adlandır ve başka bir günde tek tıkla geri yükle.',
                     'Name the current interval and load it back with one click on another day.')}</span>
          </div></div>
          <div className="it-save">
            <input value={saveName} placeholder={c.name} onChange={e=>setSaveName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')saveCurrent();}} aria-label={L('Ad','Name')}/>
            <button className="btn sm" onClick={saveCurrent}>{L('Kaydet','Save')}</button>
          </div>
          {c.saved.length===0
            ?<div className="empty-st">{L('Henüz kayıt yok — bir aralık kur ve kaydet.','Nothing saved yet — set an interval up and save it.')}</div>
            :<div className="it2-saved">
              {c.saved.map(s=><div key={s.id} className={'it2-sv'+(isCur(s)&&s.prep===c.prep?' on':'')}>
                <div className="it2-sv-t">
                  <b>{s.name}</b>
                  <i>{s.work}/{s.rest} × {s.rounds}{s.sets>1?` × ${s.sets}`:''} · {itClock(s.prep+intervalSchedule(s).reduce((a,p)=>a+p.sec,0))}</i>
                  {mini(s)}
                </div>
                <div className="it-sv-a">
                  <button className="btn xs" onClick={()=>loadSaved(s)}>{L('Yükle','Load')}</button>
                  <button className="btn xs danger" onClick={()=>delSaved(s.id)} aria-label={L('Sil','Delete')}>✕</button>
                </div>
              </div>)}
            </div>}
        </div>
      </div>
    </div>
  </>);
}

/* The tab is the interval timer and nothing else. The tempo player that used to share
   it was a second clock with its own keyboard shortcuts and its own tone, and a coach
   standing on the floor only ever ran one of them. */
function TempoView({data,setData}){
  return<IntervalTimerPanels data={data} setData={setData}/>;
}

