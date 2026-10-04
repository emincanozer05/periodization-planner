/* ═══════════════════════════════════════════════════════════════════════════
   TEAM INSIGHTS — the widget board under the week calendar

   What replaced the Load Distribution treemap here. The treemap answered "which
   movement patterns did the week hit", which is a question about exercise
   selection; under a calendar the coach is reading a week of TRAINING, and the
   questions that actually come up are: what did we train, who needs attention,
   did the week land on its targets, where the week sits against the three before
   it, and who is carrying how much of the load.

   Everything on the board reads the SELECTED WEEK (Mon–Sun of the calendar's
   selected day) so the numbers under the calendar always belong to the week
   drawn above it — there is no second period control to keep in sync.

   Nothing here is a new source of truth: the load figures come from the same
   helpers Load Monitoring and the Athlete Load Board read (teamDailyLoadMap,
   athLoadSum, athACWR, athReadiness), so a number on this board and the same
   number elsewhere in the app cannot drift apart.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Session Distribution counts the week by SESSION FOCUS — the value the coach picks in
   the session editor's "Session Focus" box (SESSION_FOCUS, stored on the session as
   `focus: []`) — rather than by the six colour categories above. The categories are
   inferred; the focus is what the coach actually wrote down, and it is the finer answer
   to "what did the week train": a lift and a plyometric block are both `strength` as a
   category, but Strength and Plyometrics as a focus.
   One row per focus value, in the SESSION_FOCUS order, each with the colour it is drawn
   in. Hues follow the family the focus belongs to and the calendar's own category
   colours, so a strength focus is green, speed/agility work is purple, conditioning is
   turquoise, competition red and recovery blue — the same reading as the keyline on the
   session card above. */
/* One row per stage-1 focus, in FOCUS_TREE order and drawn in the colour that focus
   carries throughout the app. The finer answer — which capacity, trained how — lives in
   the session's sub-focus and method, not in this count. */
const TIB_FOCI=FOCUS_TREE.map(f=>({id:f.id,label:f.id,tr:f.tr,c:f.c}));
/* A session the coach has not given a focus to is still on the plan and still cost the
   week its minutes, so it is reported as its own row instead of being dropped — a bar
   the coach can see is a bar the coach can go and fill in. */
const TIB_FOCUS_NONE={id:'__none',label:'No focus set',tr:'Odak girilmemiş',c:'#64748b'};
const TIB_FOCUS_BY=TIB_FOCI.reduce((m,f)=>(m[f.id]=f,m),{});
/* The check-in's 1-3 pain grading, in the coach's words. 0 is a region that was ticked
   on a question with no severity axis at all — a report without a grade, not a mild one. */
const TIB_PAIN_SEV={1:{tr:'Hafif',en:'Mild'},2:{tr:'Orta',en:'Moderate'},3:{tr:'Fazla',en:'Severe'}};
const tibPainSevLabel=n=>{const z=TIB_PAIN_SEV[n];return z?L(z.tr,z.en):'';};
/* Severity as a colour, worst to mildest, with the ungraded report in grey — the
   chip is the grading, so the word and the colour have to say the same thing. */
const TIB_PAIN_COL={0:'#8b9099',1:'#b45309',2:'#c2410c',3:'#be123c'};
/* ---- THE WEEK'S PAIN, REGION BY REGION ---------------------------------
   The flag list answers "who do I have to look at". This answers the question the
   coach asks the moment he gets there: where did it hurt, how badly, and how many days
   did it keep coming back. Every check-in the athlete filed INSIDE the week is read —
   not just the latest one, the way the flag chips do — so a knee reported on Monday and
   again on Thursday is one region with two days behind it rather than something that
   vanished when Friday's check-in came back clean.
   A region is taken from the check-in's own grid (`painMap`, in the athlete's wording),
   falling back to the matched tag map and then to keyword-matching the free-text box, so
   the same summary comes out whichever way the check-in arrived. Wording that matches a
   known region is reported under that region's bilingual name — a "diz" and a "Knee" are
   one knee — and anything the tag list has no entry for is kept in the athlete's own
   words rather than dropped. A region ticked on a question with no severity axis borrows
   that day's "Ağrı düzeyin nedir?" score, the same fallback the flag chips use. */
function tibWeekPain(a,dayKeys){
  const inWeek=new Set(dayKeys||[]);
  const by={};
  const bump=(key,label,sev,date)=>{
    const b=by[key]||(by[key]={key,label,worst:0,dates:new Set()});
    if(label&&!b.label)b.label=label;
    b.worst=Math.max(b.worst,Math.max(0,Math.min(3,Math.round(Number(sev)||0))));
    b.dates.add(date);
  };
  const tagOf=text=>{const t=' '+String(text==null?'':text).toLowerCase()+' ';
    return CONSTRAINT_TAGS.find(tg=>tg.kw.some(k=>t.includes(k)))||null;};
  ((a&&a.wellness)||[]).forEach(w=>{
    if(!w||!w.date||!inWeek.has(w.date))return;
    const dsev=sevFromSoreness(w.soreness);
    const seen=new Set();
    const map=parsePainMap(w.painMap&&typeof w.painMap==='object'?w.painMap:w.areaOfPain);
    if(map)painEntries(map).forEach(({region,sev})=>{
      const tg=region===PAIN_REGION_UNKNOWN?null:tagOf(region);
      const key=tg?tg.id:String(region).trim().toLowerCase();
      const label=tg?tibCtLabel(tg.id)
        :(region===PAIN_REGION_UNKNOWN?L('Bölge belirtilmemiş','Region not given'):String(region).trim());
      if(!key)return;
      seen.add(key);bump(key,label,sev||dsev,w.date);
    });
    const pm=(w.pain&&typeof w.pain==='object')?w.pain:null;
    if(pm)Object.keys(pm).forEach(id=>{
      if(seen.has(id)||!CONSTRAINT_TAGS.some(t=>t.id===id))return;
      seen.add(id);bump(id,tibCtLabel(id),Number(pm[id])||dsev,w.date);
    });
    // Whatever is left in the athlete's own sentence: the regions it names, or — when it
    // names none the tag list knows and nothing else was reported that day — the sentence.
    const note=painFreeText(w.areaOfPain);
    if(note){
      const t=' '+note.toLowerCase()+' ';
      let hit=false;
      CONSTRAINT_TAGS.forEach(tg=>{
        if(seen.has(tg.id)||!tg.kw.some(k=>t.includes(k)))return;
        seen.add(tg.id);hit=true;bump(tg.id,tibCtLabel(tg.id),dsev,w.date);});
      if(!hit&&!seen.size)bump('note:'+note.toLowerCase().slice(0,48),note,dsev,w.date);
    }
  });
  const regions=Object.keys(by).map(k=>({key:k,label:by[k].label,worst:by[k].worst,
      days:by[k].dates.size,dates:Array.from(by[k].dates).sort()}))
    .sort((x,y)=>y.worst-x.worst||y.days-x.days||x.label.localeCompare(y.label));
  const dates=new Set();regions.forEach(r=>r.dates.forEach(d=>dates.add(d)));
  return{regions,worst:Math.max(0,...regions.map(r=>r.worst)),days:dates.size};
}
/* Every word the board prints is written in both languages and picked with L() at
   render time, so the TR/EN switch changes the board in place — the component
   subscribes with useAppLang() and each memo that builds a sentence carries the
   language in its dependency list. */
const MN_S_TR=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const TIB_FOCUS_LABEL=f=>L(f.tr,f.label);
const TIB_GROUP_TR={guard:'Gard',wing:'Forvet',post:'Pivot',other:'Diğer'};
const tibGroupLabel=g=>L(TIB_GROUP_TR[g&&g.id]||(g&&g.label)||'',(g&&g.label)||'');
const TIB_POS_TR={Guard:'Gard',Forward:'Forvet',Center:'Pivot'};
const tibPosLabel=p=>{const en=posOf(p);return en?L(TIB_POS_TR[en]||en,en):'';};
const TIB_CT_TR={knee:'Diz',back:'Sırt / Bel',shoulder:'Omuz',ankle:'Ayak bileği',
  hip:'Kalça / Kasık',hamstring:'Hamstring',neck:'Baş / Boyun',trunk:'Göğüs / Kaburga / Karın',wrist:'El bileği / Dirsek'};
const tibCtLabel=id=>L(TIB_CT_TR[id]||ctLabel(id),ctLabel(id));
const TIB_ZONE_TR={'No data':'Veri yok','High risk':'Yüksek risk','Optimal':'Optimal','Low':'Düşük','Caution':'Dikkat'};
const tibZoneLabel=t=>L(TIB_ZONE_TR[t]||t,t);
/* PLANNED load — what the session was written to cost: the coach's target RPE
   (the "RPE 6-8" chip on the card, stored as its centre) × the planned minutes.
   Deliberately NOT the same thing as the app's `au`/`sRPE` figures, which are
   what the session turned out to cost once it was rated; those are the ACTUAL
   side of the comparison and come from teamDailyLoadMap. */
const tibPlanSes=s=>sesRpeTarget(s)*(Number(s&&s.duration)||0);
/* A day's planned load PER ATHLETE, because the actual it is compared against is
   per athlete too (teamDailyLoadMap averages the squad's logs). Summing every
   session on the day instead would count a morning that runs guards, forwards and
   pivots through their own lift as three lifts, and then report the week as
   massively under target against a number no single player was ever meant to do.
   So: each athlete's own assigned sessions, averaged over the squad; a session
   with nobody assigned belongs to everyone and counts for each of them. A plan
   with no assignments anywhere has no per-athlete reading to give and falls back
   to the day's team-plan total — the same branch teamDailyLoadMap falls back to. */
function tibPlanDay(day,athletes){
  const ss=((day&&day.sessions)||[]);
  if(!ss.length)return 0;
  const per={};let assigned=false,shared=0;
  ss.forEach(s=>{
    const ids=(s.athletes||[]).filter(Boolean);
    if(ids.length){assigned=true;ids.forEach(id=>{per[id]=(per[id]||0)+tibPlanSes(s);});}
    else shared+=tibPlanSes(s);
  });
  if(!assigned)return shared;
  const ids=(athletes||[]).length?(athletes||[]).map(a=>a.id):Object.keys(per);
  const vals=ids.map(id=>(per[id]||0)+shared).filter(v=>v>0);
  return vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:0;
}
// "17:00" → minutes past midnight. Anything unparseable is treated as no time at all.
const tibMins=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(t||''));if(!m)return null;
  const h=+m[1],mm=+m[2];return (h>=0&&h<24&&mm>=0&&mm<60)?h*60+mm:null;};
// A session's start as a real moment, so two sessions on different days can be subtracted.
const tibStart=(dateK,s)=>{const d=parseD(dateK);const mm=tibMins(s&&s.time);if(mm!=null)d.setMinutes(mm);return d;};
const tibEnd=(dateK,s)=>new Date(tibStart(dateK,s).getTime()+(Number(s&&s.duration)||0)*60000);
const tibDayName=d=>dnL((d.getDay()+6)%7);
const tibNum=v=>Math.round(v||0).toLocaleString(L('tr-TR','en-US'));
// A gap in hours as the coach says it out loud: "23h 30m", "2d 4h".
function tibGapText(h){
  if(h==null)return '—';
  const mins=Math.max(0,Math.round(h*60));
  if(mins>=48*60)return L(`${Math.floor(mins/1440)}g ${Math.floor((mins%1440)/60)}s`,
                          `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`);
  return L(`${Math.floor(mins/60)}s ${pad(mins%60)}dk`,`${Math.floor(mins/60)}h ${pad(mins%60)}m`);
}
/* The three recovery bands the coach asked for, straight off the gap. */
const TIB_BANDS=[{max:24,id:'short',label:'Short',c:'#f43f5e'},
                 {max:48,id:'moderate',label:'Moderate',c:'#f59e0b'},
                 {max:Infinity,id:'long',label:'Long',c:'#2dd4a7'}];
const tibBand=h=>h==null?null:TIB_BANDS.find(b=>h<b.max)||TIB_BANDS[TIB_BANDS.length-1];
/* Deviation colour: on target is green, over is amber (or red past 25%), under is
   blue. Same reading in every widget that shows a Δ, so the colour means one thing
   across the whole board. */
function tibDevCol(pct,tol){
  if(pct==null)return 'var(--dim)';
  const t=tol==null?5:tol;
  if(Math.abs(pct)<=t)return '#2dd4a7';
  if(pct>25)return '#f43f5e';
  return pct>0?'#f59e0b':'#5cb8ff';
}
const tibPct=v=>v==null?'—':`${v>0?'+':''}${v}%`;

/* =========================================================
   TEAM INSIGHTS REPORT — the board as one A4 landscape sheet.

   The board is read on screen in three columns and it prints in the same three,
   because a coach who has been reading it for a season should not have to look
   for anything twice. What the page adds is a strip of the week's headline
   figures across the top: on screen those live inside their own cards and are
   read one at a time; on paper they are what somebody scanning the sheet at a
   staff meeting sees first.

   Colour survives the trip — the severity of an alert and the direction of a Δ
   are the reading, not decoration — but the dark board becomes ink on white,
   which is what a printer is for. Every card is kept whole across a page break;
   the sheet runs onto a second page rather than cutting a card in half.
   ========================================================= */
/* THE SHEET IS ONE PAGE. A4 landscape less the 8mm @page margins, in CSS px at the
   96dpi Chrome prints at: 281mm × 194mm. The sheet is laid out at exactly that width
   on screen too, so what is measured in the window is what the printer gets. */
const TIR_PAGE_W=1062, TIR_PAGE_H=733;
