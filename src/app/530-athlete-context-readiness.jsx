const LEVEL_LABEL={'Level 1':'Beginner','Level 2':'Intermediate','Level 3':'Advanced'};

/* Position → grouping axis. Non-basketball rosters fall into `other`, which
   carries a neutral profile so nothing changes for them. */
const POS_GROUPS=[
  {id:'guard',label:'Guard',  pos:['Guard']},
  {id:'wing', label:'Forward',pos:['Forward']},
  {id:'post', label:'Center', pos:['Center']},
];
const posGroupOf=p=>((POS_GROUPS.find(g=>g.pos.includes(posOf(p)))||{}).id)||'other';
const posGroupLabel=id=>((POS_GROUPS.find(g=>g.id===id)||{}).label)||'Other';

/* Readiness band table — display only. It gives the score on the card a colour and
   a word; it does not move a single number on the program sheet. */
const RD_BANDS=[
  {id:'low',  min:0,   label:'Very low',  color:'#f43f5e'},
  {id:'below',min:2.5, label:'Low',       color:'#f59e0b'},
  {id:'mid',  min:3.2, label:'Moderate',  color:'#eab308'},
  {id:'good', min:3.9, label:'Good',      color:'#2dd4a7'},
  {id:'high', min:4.5, label:'Very good', color:'#38bdf8'},
];
/* How far back a check-in still counts as "today's" for the card. */
const IV_CHECKIN_WINDOW=2;

/* ---- Readiness ------------------------------------------------------------
   Primary source is the wellness check-in (the same field the Load Board reads).
   When an athlete has no recent check-in the score is ESTIMATED from their own
   sRPE trend (3-day acute load against the 28-day daily mean) so the card still
   has something to show — the estimate is labelled as such wherever it appears. */
function dayGap(a,b){return Math.round((parseD(b)-parseD(a))/86400000);}
function athReadiness(a,ref){
  const ws=(a.wellness||[]).filter(w=>w.date&&w.date<=ref&&w.readiness!==''&&w.readiness!=null&&!isNaN(Number(w.readiness)))
    .sort((x,y)=>x.date.localeCompare(y.date));
  const last=ws[ws.length-1];
  if(last&&dayGap(last.date,ref)<=7)return{score:Number(last.readiness),src:'wellness',date:last.date,age:dayGap(last.date,ref)};
  let ac=0,ch=0,nd=0;
  for(let i=0;i<28;i++){const v=athDayLoad(a,fmt(addD(parseD(ref),-i)))||0;ch+=v;if(v>0)nd++;if(i<3)ac+=v;}
  if(nd>=4&&ch>0){
    const r=(ac/3)/(ch/28);
    const sc=r<=0.7?4.5:r<=1?4:r<=1.3?3.5:r<=1.6?3:2.5;
    return{score:sc,src:'srpe',date:ref,age:0,ratio:r};
  }
  if(last)return{score:Number(last.readiness),src:'wellness',date:last.date,age:dayGap(last.date,ref),stale:true};
  return{score:null,src:null,date:null};
}
function rdBand(score){
  if(score==null)return null;
  let out=RD_BANDS[0];
  for(const b of RD_BANDS)if(score>=Number(b.min))out=b;
  return out;
}
/* Soreness and fatigue as the athlete rated them on their latest check-in, on the
   survey's own 1-5 scale where 5 is the good end. Shown next to readiness so the
   coach sees what the single score is made of. */
function athWellnessSnap(a,ref){
  const ws=(a.wellness||[]).filter(w=>w.date&&w.date<=ref).sort((x,y)=>x.date.localeCompare(y.date));
  const w=ws[ws.length-1];
  if(!w||dayGap(w.date,ref)>IV_CHECKIN_WINDOW)return{soreness:null,fatigue:null,date:null};
  const n=v=>{const x=Number(v);return (v===''||v==null||isNaN(x))?null:x;};
  return{soreness:n(w.soreness),fatigue:n(w.fatigue),date:w.date};
}

/* ---- Daily survey → reported pain ----------------------------------------
   How long a reported pain stays on screen is set by how bad it was. A region graded
   Fazla (the red chip) is shown on the day it was reported AND the day after, whether
   or not the next check-in ticks it again — a severe report is still worth seeing the
   morning after. Anything milder (Hafif / Orta), anything ungraded and anything only
   written in the free-text box is shown on its own day only: a hamstring rated Orta
   yesterday and not ticked today is gone today, and so is one reported yesterday by an
   athlete who has not checked in yet. When both days report a region, today's grading
   is the one shown. */
const PAIN_CARRY_SEV=3;
const painCarries=sev=>painSevKey(sev)>=PAIN_CARRY_SEV;
/* The two check-ins the rule reads: the latest one ON the day, and the latest one on
   the day before (only its red regions are kept). */
function painCheckinsFor(a,ref){
  const lastOn=d=>{const ws=(a.wellness||[]).filter(w=>w&&w.date===d);return ws[ws.length-1]||null;};
  return{today:lastOn(ref),yesterday:lastOn(fmt(addD(parseD(ref),-1)))};
}
/* One record per painful region, for display and for the engine. Two shapes are
   understood: the structured `pain` map written by the wellness survey ({knee:2}),
   and the free-text "Area of Pain" field that arrives from Tally, matched against the
   same region keywords. */
function athPainReports(a,ref){
  const{today,yesterday}=painCheckinsFor(a,ref);
  const out=[],seen=new Set();
  const known=new Set(CONSTRAINT_TAGS.map(t=>t.id));
  const read=(w,carry)=>{
    /* The stored tags, plus the ones the 3D map's regions read to today — so a check-in
       taken before a region's keyword existed still closes what it should. */
    const fromMap=painTagsFromMap(w.painMap&&typeof w.painMap==='object'?w.painMap:null)||{};
    const stored=(w.pain&&typeof w.pain==='object')?w.pain:{};
    const pm={...fromMap};Object.keys(stored).forEach(k=>{pm[k]=Math.max(Number(pm[k])||0,Number(stored[k])||0);});
    // A tag with severity 0 is still a report — the region was ticked on a question that
    // never asked how bad it is — so it counts as one and simply shows no grade.
    if(pm)Object.keys(pm).forEach(tag=>{
      const sev=Number(pm[tag])||0;
      if(carry&&!painCarries(sev))return;
      if(sev>=0&&known.has(tag)&&!seen.has(tag)){seen.add(tag);out.push({tag,sev,date:w.date,src:'survey'});}});
    // Free text carries no grading, so it never outlives its own day.
    if(carry)return;
    const raw=painFreeText(w.areaOfPain),txt=raw.toLowerCase();
    if(txt)CONSTRAINT_TAGS.forEach(t=>{
      if(!seen.has(t.id)&&t.kw.some(k=>txt.includes(k))){
        seen.add(t.id);out.push({tag:t.id,date:w.date,src:'text',raw});}});
  };
  if(today)read(today,false);
  if(yesterday)read(yesterday,true);
  return out;
}
/* Whatever the athlete reported in the check-in's pain box, in their own words.
   athPainReports only returns regions it could match to a known tag, so a note
   that matches nothing ("belim tutuldu") — or a ticked region the tag list has no
   entry for — would otherwise disappear before the coach ever sees it. Read from
   the same two check-ins under the same rule.

   `text` is the one-line prose the AI briefings and the trigger summaries want —
   the athlete's own words when they wrote some (`quoted`), else the grid.
   `regions` is the grid as a list, for the places that DRAW it: a chip per region,
   coloured by severity, each with the date it was reported. `covered` names the
   constraint tags these regions already account for, so the card can drop the tag
   chips that would otherwise repeat the same regions in a second vocabulary. */
function athPainNote(a,ref){
  const{today,yesterday}=painCheckinsFor(a,ref);
  const gridOf=w=>w?painEntries(parsePainMap(w.painMap&&typeof w.painMap==='object'?w.painMap:w.areaOfPain))
    .map(g=>({...g,date:w.date})):[];
  const note=today?painFreeText(today.areaOfPain):'';
  /* A check-in with words in the pain box shows the words, as it always has; the grid
     of that same morning is left to the tag chips. */
  const regions=note?[]:gridOf(today);
  const have=new Set(regions.map(g=>g.region));
  gridOf(yesterday).forEach(g=>{if(painCarries(g.sev)&&!have.has(g.region)){have.add(g.region);regions.push(g);}});
  if(!note&&!regions.length)return null;
  const map={};regions.forEach(g=>{map[g.region]=g.sev;});
  const covered=Object.keys(painTagsFromMap(map)||{});
  if(note)return{text:note,date:today.date,quoted:true,regions,covered};
  const SEV=PAIN_SEV_LABEL();
  const text=regions.map(g=>(g.sev?`${g.region}: ${SEV[g.sev]}`:g.region)
    +(today&&g.date!==today.date?` (${g.date})`:'')).join(', ');
  return{text,regions,covered,date:today&&regions.some(g=>g.date===today.date)?today.date:regions[0].date,
    quoted:false};
}
/* Yesterday, as the athlete reported it: the session RPE they rated and the load
   (sRPE × duration) it worked out to — context for the coach's own edits, so he
   does not have to leave the card to see it. */
function athPrevDay(a,ref){
  const date=fmt(addD(parseD(ref),-1));
  const r=athDayRPE(a,date);
  return{date,rpe:(r==null||isNaN(r))?null:Math.round(r*10)/10,load:athDayLoad(a,date)};
}
/* Coach notes, newest first — shown next to the athlete on the build screen.
   Free text, never parsed by the substitution engine (Feature 4a). */
function athNotesList(a){
  const stored=Array.isArray(a.constraintNotes)?a.constraintNotes:null;
  const list=stored||((a.constraints||'').trim()?[{id:'seed',date:'',text:a.constraints}]:[]);
  return list.filter(x=>(x.text||'').trim()).slice().reverse();
}
/* Keyword hits inside the notes — offered as tag SUGGESTIONS the coach ticks. */
function noteTagSuggestions(a){
  const txt=athNotesList(a).map(x=>x.text).join(' \n ').toLowerCase();
  if(!txt.trim())return[];
  const have=new Set(a.constraintTags||[]);
  return CONSTRAINT_TAGS.filter(t=>!have.has(t.id)&&t.kw.some(k=>txt.includes(k))).map(t=>t.id);
}

/* Templates written before RPE had its own column still carry it inside the load
   text as "@RPE 7". These two lift it out so it lands in the RPE field and is not
   prescribed twice. */
const rpeInText=t=>{const m=String(t||'').match(/rpe\s*([0-9]+(?:[.,][0-9])?)/i);return m?Number(m[1].replace(',','.')):null;};
/* Takes an "@RPE 7" out of a load text and tidies up the separators it leaves
   behind, so "%75 · @RPE 7" becomes "%75" and a bare "@RPE 7" becomes "". */
const stripRPEText=t=>String(t||'').split('·').map(s=>s.trim())
  .filter(s=>s&&!/^@?\s*rpe\s*[0-9]/i.test(s)).join(' · ').trim();

