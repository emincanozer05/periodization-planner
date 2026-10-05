/* Build one athlete's version of a source session. Pure, and deliberately dumb:
   every slot starts as the template wrote it and is then overwritten by whatever
   the coach typed on this athlete's card. No layer sits in between. The athlete's
   reported numbers ride along on the plan so the card can show them, but they are
   read by the UI, never applied to the sheet. */
function buildIndivPlan(src,ath,ctx){
  const{ref,ovr}=ctx;
  const rd=athReadiness(ath,ref);
  const band=rdBand(rd.score);
  const pgId=posGroupOf(ath.position);
  const slotOvr=(ovr&&ovr.slots)||{};
  /* One row on the sheet, built the same way whether the template wrote it or the
     coach added it: `ex` is whatever the template put in the slot, and an ADDED
     exercise simply has an empty one behind it — so every box on it is the
     override, and the code below does not need to know the difference. */
  const mkRow=(key,ex,addId)=>{
    const o=slotOvr[key]||{};
    const base={...ex};
    /* A template that predates the RPE column carries it inside the load text; it
       is moved into the RPE field and dropped from the load so the same number is
       not written twice. */
    const legacyRPE=rpeInText(base.load);
    const baseRPE=String(base.rpe==null?'':base.rpe).trim()||(legacyRPE!=null?String(legacyRPE):'');
    const baseLoad=(legacyRPE!=null?stripRPEText(base.load):String(base.load||'')).trim();
    /* A field the coach has touched is HIS, empty included: the presence of the key
       decides, never the value. Falling back on an empty value would refill the box
       from the template the moment it was cleared — the field could not be emptied
       at all, and a name could not be typed either, since every space is a trailing
       space until the next letter arrives. ↺ Reset is what goes back to the
       template; it drops the whole slot override. Values are stored exactly as
       typed and trimmed only where they are read. */
    const pick=(k,fallback)=>o[k]!==undefined&&o[k]!==null?o[k]:fallback;
    const name=String(pick('name',base.name||''));
    /* "Changed" means the coach put a different exercise where the template had
       one. An added exercise replaced nothing, so it is never a change — counting
       it would inflate the card's "n changed" badge with work that was simply
       extra, and make the sheet read as if the template had been rewritten. */
    const changedName=!addId&&name.trim().toLowerCase()!==(base.name||'').trim().toLowerCase();
    return{key,base,name,added:!!addId,addId:addId||null,
      sets:pick('sets',base.sets),
      reps:pick('reps',base.reps),
      duration:pick('duration',base.duration),
      tempo:pick('tempo',base.tempo),
      rpe:pick('rpe',baseRPE),
      load:pick('load',baseLoad),
      rest:pick('rest',base.rest),
      superset:(o.superset!=null?o.superset:(base.superset||'')),
      /* What the exercise trains and how it is executed — the pair the calendar's
         load distribution reads. Defaults to whatever the template row carries. */
      pattern:pick('pattern',base.pattern||''),
      plane:pick('plane',base.plane||''),
      /* The reference link is the coach's to set per athlete, like every other box on
         the row: it starts from whatever the template attached and is overridden the
         same way, so one athlete can be pointed at a different clip without the
         template — or anyone else's sheet — moving. */
      link:pick('link',base.link||''),
      // Which phase of the session the row belongs to — the source block's answer.
      phase:exPhase(base),
      description:base.description,image:base.image,
      changedName,
      note:o.note||''};
  };
  /* Exercises the coach ADDED to a block. They are stored as a flat list of
     {id,bi} rather than spliced into the template's own slots so the template
     numbering never shifts under an override: slot "1:2" always means the same
     row of the same block, whatever was added around it. */
  const addedAll=(ovr&&Array.isArray(ovr.added)?ovr.added:[]).filter(a=>a&&a.id!=null);
  /* Blocks the coach ADDED for this athlete, and the per-block edits (a renamed or
     removed heading) laid over the source session's own. Both are keyed the same way
     slots are: a template block by its index, an added one by its id — so a rename
     survives whatever is added around it. */
  const addedBlocks=(ovr&&Array.isArray(ovr.addedBlocks)?ovr.addedBlocks:[]).filter(b=>b&&b.id!=null);
  const blockOvr=(ovr&&ovr.blockOvr)||{};
  const mkBlock=(key,baseName,exercises,addId,phases,phaseNames)=>{
    const o=blockOvr[key]||{};
    // Same rule as a slot field: the presence of the key decides, so a heading can be
    // cleared and typed into freely. ✕ Remove is what takes the block off the sheet.
    const name=String(o.name!==undefined&&o.name!==null?o.name:(baseName||''));
    return{key,name,baseName:baseName||'',added:!!addId,addId:addId||null,
      /* The phases the source block was written in. The sheet does not edit them — an
         athlete's copy is the coach's session, laid out the way the coach laid it out —
         but they ride across so the program written from here keeps its sections. */
      phases:Array.isArray(phases)?phases:[],
      phaseNames:(phaseNames&&typeof phaseNames==='object')?phaseNames:{},
      removed:!addId&&!!o.removed,
      renamed:!addId&&name.trim()!==(baseName||'').trim(),
      rows:[
        ...(exercises||[]).map((ex,ei)=>mkRow(`${key}:${ei}`,ex,null)),
        // Added slots sit after the template's own, in the order they were added.
        ...addedAll.filter(a=>String(a.bi)===key).map(a=>mkRow(`add:${a.id}`,{},a.id)),
      ]};
  };
  /* ONLY THE BLOCKS THIS ATHLETE ACTUALLY DOES. One strength session is routinely split
     into a guards' block, a forwards' block and a pivots' block, each ticked to the
     players who do it — the team→athlete sync has always copied a session that way, and
     the sheet must read it the same. Without this the sheet built every block for every
     athlete, so all three landed on all three groups' calendars.
     A block that names nobody is the session's own work and belongs to everyone, exactly
     as `blockCoversAthlete` reads it; the block's list is what narrows it, never the
     session's roster, so writing to an athlete the session was never given to (the button
     in the bar, over a template) still builds them a full sheet. If the split leaves this
     athlete with nothing — stale data, ticks that no longer name anyone here — the whole
     session stands rather than an empty program. Blocks keep their SOURCE index as their
     key so every override the coach typed stays on the row it was typed on. */
  const srcBlocks=(src.blocks||[]).map((b,bi)=>({b,bi}));
  const ownIds=b=>(Array.isArray(b&&b.athletes)?b.athletes:[]);
  const myBlocks=srcBlocks.filter(({b})=>{const ids=ownIds(b);return !ids.length||ids.includes(ath.id);});
  const useBlocks=myBlocks.length?myBlocks:srcBlocks;
  const blocks=[
    ...useBlocks.map(({b,bi})=>mkBlock(String(bi),b.name||'',b.exercises||[],null,blkPhases(b),b.phaseNames)),
    // Added blocks sit after the source session's own, in the order they were added.
    ...addedBlocks.map(b=>mkBlock(`add:${b.id}`,'',[],b.id)),
  ];
  /* An exercise inside a block the coach removed is not prescribed, so it is not a
     change either — counting it would leave the badge claiming edits the athlete
     never sees on their sheet. */
  const changed=blocks.filter(b=>!b.removed).reduce((n,b)=>n+b.rows.filter(r=>r.changedName).length,0);
  /* The session's own line, per athlete — the same six fields the calendar's session
     editor carries, so what a session IS reads identically on both screens: its title,
     when it runs, how long, and what it trains. Each starts from the source session and
     is overridden exactly like a slot field, the key's presence deciding. */
  const mOvr=(ovr&&ovr.meta)||{};
  const has=k=>mOvr[k]!==undefined&&mOvr[k]!==null;
  const mPick=(k,fallback)=>has(k)?String(mOvr[k]):String(fallback||'');
  const mList=(k,fallback)=>Array.isArray(mOvr[k])?mOvr[k]:(fallback||[]);
  const baseFocus=sesFocus(src),baseMethods=sesMethods(src),baseRegion=sesRegion(src);
  /* The title the athlete sees is the title of the block they do: a session split by
     position gives each group its own heading, and the plain copy the sync writes is
     already named that way. One title among their blocks is theirs; blocks that disagree
     fall back to the session's own name — the same rule `syncSessionsToAthletes` uses. */
  const myTitles=[...new Set(useBlocks.map(({b})=>blkSesName(src,b)).filter(Boolean))];
  const baseSesName=myTitles.length===1?myTitles[0]:(src.name||'');
  const meta={
    name:mPick('name',baseSesName),time:mPick('time',src.time||''),
    duration:mPick('duration',src.duration==null?'':src.duration),
    focus:mList('focus',baseFocus),region:mPick('region',baseRegion),methods:mList('methods',baseMethods),
    baseName:baseSesName,baseTime:src.time||'',baseDuration:src.duration==null?'':String(src.duration),
    baseFocus,baseRegion,baseMethods,
    edited:{name:has('name'),time:has('time'),duration:has('duration'),
      focus:Array.isArray(mOvr.focus),region:has('region'),methods:Array.isArray(mOvr.methods)},
  };
  return{ath,rd,band,posGroup:pgId,blocks,changed,meta,
    prev:athPrevDay(ath,ref),pains:athPainReports(ath,ref),painNote:athPainNote(ath,ref),
    well:athWellnessSnap(ath,ref),notes:athNotesList(ath)};
}
/* Blocks that are actually prescribed — a removed one keeps its row on the card so
   it can be put back, exactly like an emptied slot, but never leaves the screen. */
const liveBlocks=plan=>(plan.blocks||[]).filter(b=>!b.removed);

/* Clearing a slot's exercise name is how an exercise is deleted from one athlete's
   sheet: the row stays on the card so it can be filled back in (or Reset to the
   template), but it is not part of the program that gets written or exported. */
const liveSlot=r=>!!String(r.name||'').trim();


/* A written program's fingerprint: everything on it a coach can see, and nothing a
   rewrite invents anew. Row and block ids are regenerated on every build, so two
   identical programs never compare equal as objects — the fingerprint is what lets the
   sheet tell whether what sits on the athlete's calendar is still what the sheet says.
   `indiv` is left out on purpose: it carries the fingerprint itself and the readiness of
   the day, and a fresh check-in is not a change to the program. */
/* The session-level fields that are filled in AFTER the fingerprint is taken — the link
   to the team session and the athlete's own post-session feedback. Leaving them out is
   what lets a stored session be fingerprinted again later and compared with the one that
   was written, which is how a program edited by hand on the calendar is recognised. */
const INDIV_SIG_SKIP=new Set(['id','indiv','sourceId','sRPE','au','athletes','notes']);
function indivSig(ses){
  const walk=(v,d)=>{
    if(Array.isArray(v))return v.map(x=>walk(x,d+1));
    if(v&&typeof v==='object')return Object.keys(v)
      .filter(k=>k!=='id'&&k!=='descI18n'&&!(d===0&&INDIV_SIG_SKIP.has(k))).sort()
      .reduce((o,k)=>{o[k]=walk(v[k],d+1);return o;},{});
    return v==null?'':v;
  };
  return JSON.stringify(walk(ses,0));
}
/* A written program the coach has since edited on the athlete's own calendar. Its content
   no longer matches the fingerprint taken when it was written, so rewriting the sheet
   over it would throw those edits away — the sheet must ask first, and must never do it
   on its own. Sessions written before fingerprints existed report false: there is nothing
   to compare them against, and guessing would block writing for good. */
function indivHandEdited(ses){
  const sig=ses&&ses.indiv&&ses.indiv.sig;
  return !!sig&&indivSig(ses)!==sig;
}

/* ---- AI-written exercise descriptions, in the app's language ---------------------
   The programme JSON is English end to end and says nothing about language; the model
   answers in whatever language it likes. What it wrote as an exercise's description is
   kept with the row as `descI18n` ({en, tr}, keyed by the language it is in), and the
   calendar and the printed sheet read it through exDesc() — so switching the app's
   language switches the description too. The missing language is filled in by the
   coach's own AI connection the first time the row is shown in it (descTranslate), and
   stored on the row, so it is asked for once. A description the coach has typed over is
   the coach's: it no longer matches any stored version and is shown exactly as typed. */
function descLangOf(t){
  const x=String(t||'');
  return /[çğıöşüÇĞİÖŞÜ]/.test(x)||/\b(ve|için|ile|bir|bu|daha|olarak|sporcu)\b/i.test(x)?'tr':'en';
}
function descI18nFor(isAI,text){
  const t=String(text||'').trim();
  return isAI&&t?{descI18n:{[descLangOf(t)]:t}}:{};
}
// The row's description is still one the model wrote (not typed over by the coach).
function descUnedited(ex){
  const m=ex&&ex.descI18n,d=String((ex&&ex.description)||'');
  return !!(m&&typeof m==='object'&&d&&Object.keys(m).some(k=>m[k]===d));
}
function exDesc(ex){
  const d=String((ex&&ex.description)||'');
  if(!descUnedited(ex))return d;
  return ex.descI18n[REPORT_LANG]||d;
}
/* The AI settings the translator uses — registered by the App, like the library bridge. */
let DESC_AI_CFG=null;
const DESC_TR_KEY='coachos_desc_tr_v1';
const descTrCache=(()=>{try{const o=JSON.parse(localStorage.getItem(DESC_TR_KEY)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return{};}})();
const descTrWait={},descTrFailed=new Set();
let descTrQ=[],descTrTimer=0;
/* One translation, answered from the cache or batched with the others the screen asks
   for in the same moment — a phased session asks for a dozen rows at once. Resolves to
   null when there is no AI connection or the call fails; the row then keeps the
   language it was written in, and a failed text is not asked for again this visit. */
function descTranslate(text,to){
  const k=to+'|'+text;
  if(descTrCache[k])return Promise.resolve(descTrCache[k]);
  if(descTrFailed.has(k))return Promise.resolve(null);
  return new Promise(res=>{
    const w=descTrWait[k]||(descTrWait[k]=[]);
    w.push(res);
    if(w.length===1)descTrQ.push({k,text,to});
    clearTimeout(descTrTimer);descTrTimer=setTimeout(descTrFlush,150);
  });
}
async function descTrFlush(){
  const batch=descTrQ.splice(0,30);
  if(descTrQ.length)descTrTimer=setTimeout(descTrFlush,150);
  const done=(k,v)=>{const w=descTrWait[k]||[];delete descTrWait[k];w.forEach(r=>r(v));};
  const byTo={};batch.forEach(b=>(byTo[b.to]=byTo[b.to]||[]).push(b));
  for(const to of Object.keys(byTo)){
    const list=byTo[to];
    try{
      const ai=DESC_AI_CFG||{};
      const provider=aiProviderOf(ai),key=aiKeyOf(ai),model=aiModelOf(ai);
      if(!key)throw new Error('no ai');
      const sys=`Translate each strength-and-conditioning exercise note into ${to==='tr'?'Turkish':'English'}. `+
        'Keep exercise names, numbers, units and abbreviations (RPE, 1RM, RFD, DB, KB) as they are; add nothing. '+
        'Reply with ONLY a JSON array of strings: one translation per input, in the same order.';
      const msgs=[{role:'user',content:JSON.stringify(list.map(b=>b.text))}];
      const txt=provider==='anthropic'
        ?await askCoach(key,model,sys,msgs,{maxTokens:4000,effort:'low'})
        :await askGemini(key,model,sys,msgs,{maxTokens:4000,json:true,thinkingBudget:0,temperature:0.2});
      const arr=JSON.parse(txt.slice(txt.indexOf('['),txt.lastIndexOf(']')+1));
      list.forEach((b,i)=>{
        const v=String((Array.isArray(arr)&&arr[i]!=null)?arr[i]:'').trim();
        if(v)descTrCache[b.k]=v;else descTrFailed.add(b.k);
        done(b.k,v||null);
      });
    }catch(e){
      try{console.warn('[CoachOS] description translation failed:',(e&&e.message)||e);}catch(_){}
      list.forEach(b=>{descTrFailed.add(b.k);done(b.k,null);});
    }
  }
  try{
    const ks=Object.keys(descTrCache);
    ks.slice(0,Math.max(0,ks.length-600)).forEach(k=>{delete descTrCache[k];});
    localStorage.setItem(DESC_TR_KEY,JSON.stringify(descTrCache));
  }catch(e){}
}
/* A row editor shows its description in the app's language. The row's own versions
   (descI18n) are used when the description is still one of them; otherwise the
   description as it stands is taken as the original — a programme written before
   descI18n existed, one edited on the calendar, or one typed in — and, when it is in the
   other language, the missing version is asked for and stored beside it. The text the
   coach wrote is never replaced: `description` stays as it is, descI18n only adds the
   other language for display. */
function useDescI18n(ex,onChange){
  // The rows are memoised: subscribing is what re-renders one when the language changes.
  const lang=useAppLang();
  const exRef=useRef(ex);exRef.current=ex;
  const cbRef=useRef(onChange);cbRef.current=onChange;
  const d=String((ex&&ex.description)||'').trim();
  const kept=descUnedited(ex);
  const src=!d?null:(kept?(ex.descI18n[lang]?null:d):(descLangOf(d)===lang?null:d));
  useEffect(()=>{
    if(!src)return;
    let live=true;
    descTranslate(src,lang).then(t=>{
      const cur=exRef.current;
      if(!live||!t||String((cur&&cur.description)||'').trim()!==src)return;
      const base=descUnedited(cur)?cur.descI18n:{[descLangOf(src)]:String(cur.description)};
      if(base[lang])return;
      cbRef.current({...cur,descI18n:{...base,[lang]:t}});
    });
    return()=>{live=false;};
  },[src,lang]);
}
/* Turn a built sheet into a session object for the athlete's own calendar. Which exercise
   the source session had asked for rides along on every changed slot, so the card can still
   say what was swapped; it prints nowhere. */
function planToSession(plan,src,dateKey,srcKey){
  const t=v=>String(v==null?'':v).trim();
  const rows=b=>b.rows.filter(liveSlot).map(r=>{
    const note=t(r.note);
    return{name:t(r.name),sets:t(r.sets),reps:t(r.reps),duration:t(r.duration),
      tempo:t(r.tempo),rpe:t(r.rpe),load:t(r.load),rest:t(r.rest),
      description:[r.base.description||'',note].filter(Boolean).join(r.base.description&&note?' · ':''),
      ...descI18nFor(r.base.aiDesc,[r.base.description||'',note].filter(Boolean).join(r.base.description&&note?' · ':'')),
      notes:r.base.notes||'',superset:t(r.superset),image:r.image||'',link:r.link||'',
      phase:exPhase(r),
      ...exResolveTags(t(r.name),t(r.pattern),t(r.plane)),
      /* The alternative rides across with the exercise it stands in for. Without this
         an alternative written on a template was dropped the moment the session was
         individualized, and an approved substitution had nowhere to record the option
         the coach kept beside it. */
      ...(r.alt&&typeof r.alt==='object'?{alt:r.alt}:{}),
      changed:!!r.changedName,fromName:r.base.name||''};});
  /* The session's own line comes off the athlete's sheet — the coach may have rewritten
     any of the six fields for this athlete — and falls back to the source session's
     wherever one was never touched. `purpose` is the focus list written out, the same
     way the session editor keeps the two in step. */
  const m=plan.meta||{};
  const focus=Array.isArray(m.focus)?m.focus:sesFocus(src);
  const dur=Number(t(m.duration));
  const ses={id:uid(),name:t(m.name)||src.name||'Individual Program',time:t(m.time)||src.time||'17:00',
    loadType:src.loadType||'Mechanical load',
    /* The capacity the source session named rides along with its focus: an athlete's copy
       of a session should say what it trains in both stages the team's does, not just the
       first of them. */
    sub:sesSubFocus(src),
    purpose:[...focus,...sesSubFocus(src)].join(', '),focus,
    methods:Array.isArray(m.methods)?m.methods:sesMethods(src),
    region:m.region!=null?t(m.region):sesRegion(src),
    duration:(dur>0?dur:(src.duration||60)),
    sRPE:'',au:'',color:src.color||'',
    /* What the source session says it trains — the muscles and the movement patterns the
       coach ticked on it — rides onto the athlete's copy, so their session opens with the
       same Movements & Patterns panel and the same summary strip the team session has. */
    selMuscles:Array.isArray(src.selMuscles)?[...src.selMuscles]:[],
    selPatterns:Array.isArray(src.selPatterns)?[...src.selPatterns]:[],
    selPlanes:(src.selPlanes&&!Array.isArray(src.selPlanes))?JSON.parse(JSON.stringify(src.selPlanes)):{},
    blocks:liveBlocks(plan).map(b=>({id:uid(),name:b.name,
      ...(blkPhases(b).length?{phases:blkPhases(b)}:{}),
      ...(blkPhases(b).length&&b.phaseNames&&Object.keys(b.phaseNames).length?{phaseNames:{...b.phaseNames}}:{}),
      exercises:rows(b)})),
    notes:'',planNote:src.planNote||'',
    athletes:[],sourceId:null,
    indiv:{srcKey,date:dateKey,readiness:plan.rd.score,band:plan.band?plan.band.label:'',
      pos:plan.posGroup,changed:plan.changed}};
  ses.indiv.sig=indivSig(ses);
  return ses;
}

function indivSessionsFor(ath,dateKey){
  return (((ath.days||{})[dateKey]||{}).sessions)||[];
}
/* Every session the athlete has in the Mon-Sun week containing `dateKey`, tagged
   with the day it falls on so a week's worth reads in order on one document. */
function indivWeekSessions(ath,dateKey){
  const start=sow(parseD(dateKey));const out=[];
  for(let i=0;i<7;i++){
    const dk=fmt(addD(start,i));
    indivSessionsFor(ath,dk).forEach(s=>out.push({...s,_day:dk,_dayIdx:i}));
  }
  return out;
}
