/* =========================================================
   DEFAULT DATA & MIGRATION
   ========================================================= */
function makeDefaultTeam(){
  const sid=uid();
  return{id:uid(),
    setup:{sport:'Basketball',teamName:'Example BC Senior Squad',athleteCount:14,
      seasonStart:'2026-08-03',seasonEnd:'2027-05-30',
      competitions:[{date:'2026-10-04',name:'Regular Season Opener'},{date:'2026-12-28',name:'Mid-Season Cup'},
        {date:'2027-04-12',name:'Playoffs R1'},{date:'2027-05-24',name:'Championship Final'}],
      model:'block',periods:null},
    days:{},weekOverrides:{},athletes:[],staff:[],
    /* One season to start with; the Season tab adds more. */
    seasons:[{id:sid}],activeSeasonId:sid,seasonData:{}};
}
function makeDefault(){const t=makeDefaultTeam();return{activeTeamId:t.id,teams:[t],templates:[]};}


/* WHICH TEAM IS ON SCREEN BELONGS TO THE DEVICE, NOT TO THE ACCOUNT.
   Everything else in the workspace is shared on purpose: one plan, the same on the
   laptop in the office and on the phone by the court. The team being *looked at* is
   not part of that plan. It rode along in the synced state, so two people working the
   same account at once kept dragging each other onto the other's squad — an assistant
   opening the U16s pulled the head coach off the senior team mid-session.
   So activeTeamId is kept out of the cloud payload entirely (see `ser`) and remembered
   per browser instead: each device picks its own team and stays on it. A remembered id
   whose team has since been deleted is simply ignored. */
const TEAM_KEY='coachos_active_team';
/* localStorage remembers the choice across reloads, but it is not always there to be read:
   a private window refuses it, an embedded frame can be denied it, and a browser that has
   sat unopened for a while gets it cleared out from under it. So the tab also keeps the
   team it is on in memory. Without that second hold a device that had simply never used
   the picker resolved its team afresh out of every incoming snapshot — and because the
   cloud copy carries no team at all, each edit made on the other device arrived here as a
   jump back to the first team, which is the same "my team changed by itself" from the
   coach's side as following the other device had been. */
let liveTeam=null;
const setDeviceTeam=id=>{if(!id)return;liveTeam=id;try{localStorage.setItem(TEAM_KEY,id);}catch(e){/* quota / private mode */}};
/* The team this device shows, in order of what should win: the one the coach last picked
   HERE, then the one this tab is already sitting on, then whatever the payload happened to
   carry, then the first team — each of them only while the account still holds it. A stored
   pick is never overwritten from here, only read: a browser signed into a second account
   resolves through `liveTeam` for that session and still finds its own team waiting when it
   goes back to the first account. */
const resolveTeam=(teams,carried)=>{
  const has=id=>!!id&&teams.some(t=>t.id===id);
  let stored=null;try{stored=localStorage.getItem(TEAM_KEY);}catch(e){}
  const id=has(stored)?stored:has(liveTeam)?liveTeam:has(carried)?carried:teams[0].id;
  liveTeam=id;
  return id;
};
/* The cloud copy carries no active team. Stripping it here rather than at each write
   keeps both sides of every comparison (lastSynced, ancestor, the merge base) free of
   it too, so a team switch never counts as a change worth writing — and never reaches
   the other device as one. */
const stripDeviceOnly=o=>{
  if(!o||typeof o!=='object'||Array.isArray(o)||!('activeTeamId'in o))return o;
  const{activeTeamId,...rest}=o;return rest;
};
/* Every switch goes through here, so the choice is written down exactly when the coach
   makes one — never on the placeholder workspace the app holds while the cloud answers,
   which would otherwise overwrite the remembered team on every reload. `rest` carries
   the other fields a switch brings with it (the new team, the shortened list). */
const withTeam=(data,id,rest)=>{setDeviceTeam(id);return{...data,...rest,activeTeamId:id};};

/* =========================================================
   SEASONS
   A team plans more than one season, and each one carries its own dates,
   phases, week plan and sessions. The season being worked on stays exactly
   where it has always lived — team.setup / team.days / team.weekOverrides —
   so every other view reads it without knowing seasons exist; the ones not
   in view are parked in team.seasonData and swapped in when selected.
   ========================================================= */
function seasonYears(s){
  if(!s||!s.seasonStart)return'';
  const a=parseD(s.seasonStart).getFullYear();
  const b=s.seasonEnd?parseD(s.seasonEnd).getFullYear():a;
  return b>a?a+'-'+b:String(a);
}
/* The label a season shows: whatever it was renamed to, otherwise the years it spans. */
function seasonName(team,sn){
  if(!sn)return'';
  if(sn.name)return sn.name;
  const st=sn.id===team.activeSeasonId?team.setup:((team.seasonData||{})[sn.id]||{}).setup;
  return seasonYears(st)||'Season';
}
/* Everything that belongs to one season, lifted out of the team. */
function seasonSlice(team){return{setup:team.setup,days:team.days||{},weekOverrides:team.weekOverrides||{}};}
/* Move the team onto another season: park the one on screen in seasonData and lift the
   target's slice into its place. One write, and every other view follows along. Shared,
   because two screens offer the switch — the Season plan and the Setup tab's club card —
   and a season half-parked by one of them would lose a plan. */
function switchTeamSeason(team,updateTeam,id){
  if(!team||!id||id===team.activeSeasonId)return;
  const store={...(team.seasonData||{})};
  store[team.activeSeasonId]=seasonSlice(team);
  const nx=store[id];if(!nx)return;
  delete store[id];
  updateTeam(team.id,{seasonData:store,activeSeasonId:id,
    setup:nx.setup,days:nx.days||{},weekOverrides:nx.weekOverrides||{}});
}

/* The roster always reads by name, A → Z, on every screen. The team every view is handed
   carries its athletes in that order; the sorted list is kept per stored list, so a
   change elsewhere in the data does not hand the views a new roster array. */
const rosterSortCache=new WeakMap();
const byAthleteName=(a,b)=>String((a&&a.name)||'').trim().localeCompare(String((b&&b.name)||'').trim(),'tr',{sensitivity:'base'});
function rosterByName(t){
  const list=t&&t.athletes;
  if(!Array.isArray(list)||list.length<2)return t;
  let sorted=rosterSortCache.get(list);
  if(!sorted){
    const nx=[...list].sort(byAthleteName);
    sorted=nx.every((a,i)=>a===list[i])?list:nx;
    rosterSortCache.set(list,sorted);
  }
  return sorted===list?t:{...t,athletes:sorted};
}

function migrateTeam(t){
  if(!t.id)t.id=uid();
  if(!t.setup)t.setup=makeDefaultTeam().setup;
  if(!('periods'in t.setup))t.setup.periods=null;
  if(!t.days)t.days={};if(!t.weekOverrides)t.weekOverrides={};if(!t.athletes)t.athletes=[];
  /* Teams saved before the roster had a bench keep one: an empty staff list. */
  t.staff=Array.isArray(t.staff)?t.staff.map(normStaff):[];
  /* Teams saved before seasons existed hold exactly one season — the one in t.setup. */
  if(!t.seasonData)t.seasonData={};
  if(!Array.isArray(t.seasons)||!t.seasons.length)t.seasons=[{id:uid()}];
  if(!t.seasons.some(sn=>sn.id===t.activeSeasonId))t.activeSeasonId=t.seasons[0].id;
  delete t.seasonData[t.activeSeasonId];
  // Per-team form-sync config (each team connects its own Tally forms via a Worker).
  if(!t.tallySync){
    // migrate from the old Notion config if present, otherwise start fresh
    t.tallySync=t.notionSync?{...t.notionSync}:{workerUrl:'',autoSync:false,intervalMin:5,lastSyncedAt:null,lastStats:null};
  }
  delete t.notionSync;
  // Days migration (sections→blocks, etc.)
  for(const k of Object.keys(t.days)){
    const d=t.days[k];if(!d)continue;
    if(d.sections&&!d.sessions){
      const blocks=[];
      if(d.sections.warmup?.length)blocks.push({id:uid(),name:'Warm-up',exercises:d.sections.warmup});
      if(d.sections.main?.length)blocks.push({id:uid(),name:'Main Phase',exercises:d.sections.main});
      if(d.sections.cooldown?.length)blocks.push({id:uid(),name:'Cool-down',exercises:d.sections.cooldown});
      t.days[k]={date:k,sessions:[{id:uid(),name:d.loadType||'Workout',time:d.time||'17:00',loadType:'Mechanical load',
        purpose:d.purpose||'Technical',duration:d.duration||60,sRPE:d.sRPE||'',au:'',blocks,notes:d.notes||''}],dailyNotes:''};
    } else if(d.sessions){
      d.sessions=d.sessions.map(s=>{
        if(s.sections&&!s.blocks){
          const blocks=[];
          if(s.sections.warmup?.length)blocks.push({id:uid(),name:'Warm-up',exercises:s.sections.warmup});
          if(s.sections.main?.length)blocks.push({id:uid(),name:'Main Phase',exercises:s.sections.main});
          if(s.sections.cooldown?.length)blocks.push({id:uid(),name:'Cool-down',exercises:s.sections.cooldown});
          s={...s,blocks};
        }
        if(!s.blocks)s.blocks=[];
        if(!s.name)s.name=s.loadType||'Workout';
        if(s.purpose==='Team Practice')s.purpose='Ball Practice';
        if(!Array.isArray(s.focus))s.focus=sesFocus(s);
        /* The title is no longer renamed: "Team Practice" is the Quick Add preset's
           English title again, and renaming it here would undo it on every load. */
        if(s.au===undefined)s.au='';
        if(!Array.isArray(s.athletes))s.athletes=[];
        if(s.sourceId===undefined)s.sourceId=null;
        // ensure description field on exercises
        s.blocks=s.blocks.map(b=>({...b,exercises:(b.exercises||[]).map(e=>({description:'',superset:'',image:'',link:'',...e}))}));
        return s;
      });
    } else{t.days[k]={date:k,sessions:[],dailyNotes:''};}
  }
  // Athletes migration
  t.athletes=t.athletes.map(a=>{
    const tests=(a.tests||[]).map(tt=>{
      if(tt.circ){
        // Backfill new bilateral fields from legacy single thigh/calf
        if(tt.circ.thigh&&!tt.circ.thighRight)tt.circ.thighRight=tt.circ.thigh;
        if(tt.circ.thigh&&!tt.circ.thighLeft)tt.circ.thighLeft=tt.circ.thigh;
        if(tt.circ.calf&&!tt.circ.calfRight)tt.circ.calfRight=tt.circ.calf;
        if(tt.circ.calf&&!tt.circ.calfLeft)tt.circ.calfLeft=tt.circ.calf;
      }
      if(tt.ohs&&!Array.isArray(tt.ohs.problems))tt.ohs.problems=['','','','',''];
      return tt;
    });
    // Sync Anthropometric Measurement tests into the Body Comp measurements list.
    // Any test carrying height/weight/wingspan/bodyFat/leg length with a date is mirrored as a
    // measurement row linked via srcTest, so past tests populate Body Comp too.
    let measurements=(a.measurements||[]).slice();
    tests.forEach(tt=>{
      const hasAnthro=['height','weight','wingspan','bodyFat','legLength'].some(k=>tt[k]!==''&&tt[k]!=null&&!isNaN(Number(tt[k])));
      const exIdx=measurements.findIndex(m=>m.srcTest===tt.id);
      if(hasAnthro&&tt.date){
        const rec={id:exIdx>=0?measurements[exIdx].id:uid(),srcTest:tt.id,date:tt.date,
          height:tt.height||'',weight:tt.weight||'',bodyFat:tt.bodyFat||'',wingspan:tt.wingspan||'',legLength:tt.legLength||'',
          notes:exIdx>=0?(measurements[exIdx].notes||''):''};
        if(exIdx>=0)measurements[exIdx]={...measurements[exIdx],...rec};else measurements.push(rec);
      }else if(exIdx>=0){measurements.splice(exIdx,1);}
    });
    /* `deletedSrpeSrcIds` are the Tally submissions the coach deleted from the Load tab.
       They are kept as ids (not rows) so a later sync knows not to bring them back. */
    return{...a,phone:a.phone||'',phoneCode:a.phoneCode||DEFAULT_DIAL,days:a.days||{},injuries:a.injuries||[],measurements,wellness:a.wellness||[],srpeLog:a.srpeLog||[],deletedSrpeSrcIds:a.deletedSrpeSrcIds||[],tests};
  });
  // One-time cleanup: remove sessions previously created by Notion sync.
  // (We now keep sRPE as srpeLog only, not as sessions on the calendar.)
  t.athletes.forEach(a=>{
    for(const d of Object.keys(a.days||{})){
      const day=a.days[d];if(!day?.sessions)continue;
      const filtered=day.sessions.filter(s=>!s.notionId||!String(s.notionId).startsWith('notion-'));
      if(filtered.length===0&&!day.dailyNotes)delete a.days[d];
      else if(filtered.length!==day.sessions.length)a.days[d]={...day,sessions:filtered};
    }
  });
  /* ONE-TIME: take back the programs the Individualization page wrote on its own from a
     TEMPLATE. That page picks a source by itself, and on a date with no team session the
     source it picks is a template — which belongs to no day and to no assignment — so
     simply opening the page put a full training session on every athlete's calendar for a
     day the team plan reads as rest, and re-wrote it the moment the athlete deleted it.
     The page no longer does that (a template now waits for the button), but the sessions
     it already wrote are still standing, and no coach ever asked for them: until the fix
     there was no button, so every template-sourced program in the data came from that
     automatic pass. A program the coach has since edited by hand is their work and stays,
     as does anything written from a team session. Runs once per team. */
  if(!t.tplIndivAutoCleanup){
    t.tplIndivAutoCleanup=true;
    t.athletes.forEach(a=>{
      for(const k of Object.keys(a.days||{})){
        const day=a.days[k];if(!day?.sessions?.length)continue;
        const kept=day.sessions.filter(s=>!(s.indiv&&String(s.indiv.srcKey||'').startsWith('tpl:')
          &&!s.sourceId&&!indivHandEdited(s)));
        if(kept.length===day.sessions.length)continue;
        if(kept.length===0&&!day.dailyNotes)delete a.days[k];
        else a.days[k]={...day,sessions:kept};
      }
    });
  }
  /* A session on an athlete's calendar that carries `sourceId` is a mirror of a team
     session on the same day — syncSessionsToAthletes writes it, and takes it away again
     when the team session goes. But it only takes it away through the edit path that
     holds both sides at once, so a team session that disappeared any other way (deleted
     on another device against a stale roster, dropped by an older build) left mirrors
     standing that no team plan backs any more: the team's day reads "rest" while the
     athlete still has training on it.

     Every load reconciles the two, dropping the mirrors the team plan no longer backs:
     the ones whose source has gone from the team's day, and the ones sitting on an
     athlete the source is not assigned to — a session written to the guards has no
     business on a forward's calendar, however it got there (an older build that assigned
     every session to the whole squad, the individualization sheet writing past the tick
     list). A session the athlete's own calendar owns carries no `sourceId` at all and is
     never touched — nor is an individualized copy, which keeps its link to the team
     session precisely so it travels with it. */
  t.athletes.forEach(a=>{
    for(const k of Object.keys(a.days||{})){
      const day=a.days[k];if(!day?.sessions?.length)continue;
      const teamSes=new Map(((((t.days||{})[k])||{}).sessions||[]).map(s=>[s.id,s]));
      const kept=day.sessions.filter(s=>!s.sourceId||teamSessionCovers(teamSes.get(s.sourceId),a.id));
      if(kept.length===day.sessions.length)continue;
      if(kept.length===0&&!day.dailyNotes)delete a.days[k];
      else a.days[k]={...day,sessions:kept};
    }
  });
  // Athlete days migration too
  t.athletes.forEach(a=>{
    for(const k of Object.keys(a.days||{})){
      const d=a.days[k];if(!d?.sessions)continue;
      d.sessions=d.sessions.map(s=>({...s,
        purpose:s.purpose==='Team Practice'?'Ball Practice':s.purpose,
        focus:Array.isArray(s.focus)?s.focus:sesFocus({...s,purpose:s.purpose==='Team Practice'?'Ball Practice':s.purpose}),
        blocks:(s.blocks||[]).map(b=>({...b,exercises:(b.exercises||[]).map(e=>({description:'',superset:'',image:'',link:'',...e}))}))}));
    }
  });
  return t;
}
function migrate(data){
  if(!data)return makeDefault();
  // Old single-team root structure → multi-team
  if(data.setup&&!data.teams){
    const t={id:uid(),setup:data.setup,days:data.days||{},weekOverrides:data.weekOverrides||{},athletes:data.athletes||[]};
    data={activeTeamId:t.id,teams:[t]};
  }
  if(!Array.isArray(data.teams)||data.teams.length===0)data.teams=[makeDefaultTeam()];
  data.teams=data.teams.map(migrateTeam);
  /* The team on screen comes from this browser, not from the cloud. Every state that
     reaches the screen passes through here — the first cloud read, the local safety copy,
     each snapshot the other device writes and the merge base behind it — so resolving it in
     this one place is what keeps an incoming write from moving the team out from under
     whoever is reading it. */
  data.activeTeamId=resolveTeam(data.teams,data.activeTeamId);
  delete data.notionSync;
  if(!Array.isArray(data.customTests))data.customTests=[];
  /* Tryout candidates and saved test batteries ride in the workspace like everything
     else, so a sheet filled in at the gym is on the coach's laptop that evening. */
  if(!Array.isArray(data.tryouts))data.tryouts=[];
  /* Candidate sheets predate the picked-test list, the parents' details and the switch
     from standing reach to shoe size, so each one is brought up to the current shape on
     read. A sheet written before the picker keeps exactly the tests it already answered
     (falling back to the default four when it answered none), so nothing a coach typed
     at a trial disappears behind a picker it never knew about. */
  data.tryouts=data.tryouts.map(t=>{
    const tests={...(t.tests||{})};
    let picked=Array.isArray(t.picked)?t.picked:null;
    if(!picked){
      const filled=Object.keys(tests).filter(k=>String(tests[k]||'').trim()!=='');
      picked=filled.length?filled:[...TRYOUT_TESTS_DEFAULT];
    }
    /* `reach` (standing reach, replaced by shoe size) and `camp` (the group/camp box)
       are no longer drawn anywhere, but they are left on the record rather than deleted:
       a number a coach measured at a trial is not ours to throw away on an upgrade, and
       an unread key costs nothing. */
    return{...t,motherName:t.motherName||'',motherHeight:t.motherHeight||'',
      fatherName:t.fatherName||'',fatherHeight:t.fatherHeight||'',
      shoeSize:t.shoeSize||'',tests,picked};
  });
  /* A club's own tryout test lives beside the candidates rather than on any one of
     them, so it is offered on every sheet in the pool. */
  if(!Array.isArray(data.tryoutTests))data.tryoutTests=[];
  if(!Array.isArray(data.testTemplates))data.testTemplates=[];
  /* The assistant knowledge database is gone; a workspace that still carries it drops it. */
  delete data.knowledge;
  if(!Array.isArray(data.researches))data.researches=[];
  data.researches=data.researches.map(r=>({id:r.id||uid(),title:r.title||'',url:r.url||'',doi:r.doi||'',
    authors:Array.isArray(r.authors)?r.authors:[],authorsText:r.authorsText||'',year:r.year||'',date:r.date||'',
    journal:r.journal||'',apa:r.apa||'',summary:r.summary||'',tags:r.tags||'',addedAt:r.addedAt||Date.now()}));
  if(!Array.isArray(data.savedResearch))data.savedResearch=[];
  if(!Array.isArray(data.templates))data.templates=[];
  data.templates=data.templates.map(t=>{const s=t.session||{};
    return{...t,session:{...s,focus:Array.isArray(s.focus)?s.focus:sesFocus(s)}};});
  if(!Array.isArray(data.exercises))data.exercises=[];
  // The Interval Timer's work/rest block, its saved intervals and the player's settings
  // ride along with the rest of the workspace, so an interval set up on the laptop is
  // there on the phone.
  data.interval=normInterval(data.interval);
  const _typeRemap={'Agility':'Multi Directional Speed','COD':'Multi Directional Speed','Sprint':'Multi Directional Speed','Isolation':'','Compound':'','Olympic':'Full Body','Cardio':'','Stretching':'','Üst Vücut İtiş':'Upper Body Push','Üst Vücut Çekiş':'Upper Body Pull','Kalça Dominant':'Hip Dominant','Diz Dominant':'Knee Dominant','Power':'Medicine Ball'};
  const _diffRemap={Easy:'Level 1',Moderate:'Level 2',Hard:'Level 3'};
  /* Spread the entry first so the fields this normaliser does not name survive a reload —
     the pattern / execution an exercise was tagged with and the plan picture put on a
     program row are written onto the library entry, and rebuilding it from a whitelist
     threw both away the next time the workspace was opened. */
  data.exercises=data.exercises.map(e=>({...e,id:e.id||uid(),name:e.name||'',type:(_typeRemap[e.type]!=null?_typeRemap[e.type]:e.type)||'',subType:e.subType||(e.type==='COD'?'COD':e.type==='Sprint'?'Sprint Technique':e.type==='Olympic'?'Olympic Lift':''),pattern:e.pattern||'',difficulty:(_diffRemap[e.difficulty]||e.difficulty||''),muscle:Array.isArray(e.muscle)?e.muscle:(e.muscle?[e.muscle]:[]),
    videoUrl:e.videoUrl||'',videoData:e.videoData||'',thumb:e.thumb||'',purpose:e.purpose||''}))
    /* Hip / Knee Dominant: the old single "Contraction Type" list carried Push and Pull
       beside Eccentric and Isometric. Push / Pull are the direction of the load and now
       live in `action`; the contraction box keeps only what is a contraction. Nothing is
       lost — an entry filed "Pull" reads Action: Pull, Contraction Focus: not set. */
    .map(e=>(ACTIONS_FOR[e.type]&&EX_ACTIONS.includes(e.subType))
      ?{...e,action:e.action||e.subType,subType:''}:e)
    /* Mobility's regions became Ankle · Hip · Spine · Shoulder · Wrist; the thoracic
       spine is part of the spine, so an entry filed "Thoracic" reads Spine. */
    .map(e=>(e.type==='Mobility'&&e.subType==='Thoracic')?{...e,subType:'Spine'}:e)
    /* "Step-up" is spelled "Step-Up" now, as the rest of the pattern list is cased. */
    .map(e=>e.pattern==='Step-up'?{...e,pattern:'Step-Up'}:e)
    /* The one-off suggestion import marked every field it filled as "awaiting review".
       The import and the marks are gone. The values it filled stay, except the
       movement_pattern: that one is dropped again, so the pattern reads off the category
       as before. A movement_pattern the entry carried before the import was never marked,
       so it stays. */
    .map(e=>{
      if(!('review'in e))return e;
      const{review,...rest}=e;
      if(Array.isArray(review)&&review.includes('movePattern'))rest.movePattern='';
      return rest;
    });
  /* The Gemini key used to ride in the synced workspace (and so in this browser's
     cache of it). It lives on the server now, so an old copy is dropped here rather
     than left sitting in the browser. The Gemini-vs-Claude choice and the model stay. */
  if(data.ai&&typeof data.ai==='object'&&Object.prototype.hasOwnProperty.call(data.ai,'gkey')){
    const{gkey,...rest}=data.ai;data.ai=rest;
  }
  return data;
}


