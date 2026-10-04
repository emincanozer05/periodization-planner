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
function printTeamInsights(R){
  const w=window.open('','_blank','width=1300,height=900');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  /* Screen colours are picked for a dark panel; on white the mid greens and blues
     go washy, so each one is swapped for its ink-weight twin. The meaning — green
     on target, amber over, red well over, blue under — is unchanged. */
  const ink=c=>({'#2dd4a7':'#0f9d76','#5cb8ff':'#1d6fd0','#f59e0b':'#b45309','#f43f5e':'#be123c'}[c]||c);
  const dev=(pct,tol)=>pct==null?'#8b9099':ink(tibDevCol(pct,tol));
  const bar=(pctW,color)=>`<span class="mini"><i style="width:${Math.max(1,Math.min(100,pctW||0)).toFixed(1)}%;background:${color}"></i></span>`;

  const kpi=(v,u,k,sub)=>`<div class="kpi"><div class="kv">${esc(v)}${u?`<u>${esc(u)}</u>`:''}</div>
    <div class="kk">${esc(k)}</div>${sub?`<div class="ks">${esc(sub)}</div>`:''}</div>`;

  /* How many alert cards go across is a function of how many there are: a quiet week
     gets wide, readable cards, a loud one packs them tighter rather than pushing
     everything below it down the page. Fitting the sheet by columns first is what
     keeps the scale below from having to do the work. */
  const alCols=R.alerts.length<=4?Math.max(2,R.alerts.length):(R.alerts.length>12?6:5);
  const alerts=R.alerts.length
    ?`<div class="algrid" style="grid-template-columns:repeat(${alCols},1fr)">${R.alerts.map(a=>`<div class="al ${a.sev>1?'high':'mid'}">
        <div class="k">${esc(a.kind)}</div><div class="w">${esc(a.where)}</div><div class="t">${esc(a.text)}</div>
      </div>`).join('')}</div>`
    :`<div class="none">${L('✓ Bu hafta işaretlenecek bir şey yok — yük, toparlanma ve check-in’lerin hepsi kendi bandında.',
                           '✓ Nothing to flag this week — load, recovery and check-ins are all inside their bands.')}</div>`;

  const sesDist=R.sesDist.rows.length
    ?`<div class="sd">${R.sesDist.rows.map(r=>`<div class="sd-r">
        <span class="l"><i style="background:${esc(r.c)}"></i>${esc(TIB_FOCUS_LABEL(r))}</span>
        <span class="n">${r.n}</span>${bar(r.n/R.sesDist.max*100,r.c)}
        <span class="m">${r.min} ${L('dk','min')}</span></div>`).join('')}</div>`
    :`<div class="none">${L('Bu haftanın planında henüz antrenman yok.','No sessions on this week’s plan yet.')}</div>`;

  /* THE PAIN SUMMARY replaces the flag list on the printed sheet. The board on screen
     already lists who is flagged and why; what the sheet is carried into a staff meeting
     for is the other half of it — WHERE it hurts and HOW BADLY, read across the whole
     week rather than off the last check-in. One row per athlete, one chip per region,
     the chip coloured and worded by the worst grading the week saw and carrying the
     number of days the region came back.
     It is the one card with no ceiling, so on a week with many athletes on it it takes
     the second page in as many columns as the count wants, and page one keeps the shape
     of the week. A quiet week says so in one line and stays on page one — a whole sheet
     for a tick mark helps no one. */
  const pnChip=g=>`<span class="tag p${g.worst}">${esc(g.label)}${g.worst?` · ${esc(tibPainSevLabel(g.worst))}`:''}${g.days>1?`<b>${g.days}${L('g','d')}</b>`:''}</span>`;
  const pnPage=R.weekPain.length>8;
  /* Columns are chosen to keep the list TALL rather than to get it over with in four
     short rows: a sheet of its own is a sheet to fill, so a column takes about eight
     athletes before the next one is opened. Four rows spread down a whole page read as
     a mistake however evenly they are spaced. */
  const pnCols=Math.min(4,Math.max(2,Math.ceil(R.weekPain.length/8)));
  const pnRows=R.weekPain.map(f=>`<div class="fl-r${f.worst>2?' hot':''}">
      <div class="nm">${esc(f.a.name||'—')}<u>${esc(tibPosLabel(f.a.position)||'—')}</u></div>
      <div class="tg">${f.regions.map(pnChip).join('')}</div>
    </div>`).join('');
  /* The week counted by region, under the list: the line that says whether this is one
     problem or seven. Printed only where there is more than one region to compare. */
  const pnLegend=R.painTally.length>1
    ?`<div class="legend">${L('Bölge başına sporcu','Athletes per region')}: ${R.painTally.slice(0,6).map(t=>`${esc(t.label)} ${t.n}`).join(' · ')}${R.painTally.length>6?` +${R.painTally.length-6}`:''}</div>`
    :'';
  const painBody=cols=>R.roster===0
    ?`<div class="none">${L('Kadroda henüz sporcu yok.','No athletes on the roster yet.')}</div>`
    :R.weekPain.length===0
    ?`<div class="none">${L('✓ Bu hafta ağrı bildirilmedi — check-in’lerde hiçbir bölge işaretlenmedi.','✓ No pain reported this week — no region ticked on any check-in.')}</div>`
    :`<div class="fl${cols?' wide':''}"${cols?` style="grid-template-columns:repeat(${cols},1fr)"`:''}>${pnRows}</div>${pnLegend}`;
  const pnHead=`<span class="count${R.weekPain.length?' on':''}">${R.weekPain.length}</span>`;
  const pnTitle=L('Ağrı Özeti','Pain Summary');
  const pnSub=L('Hafta boyunca bildirilen bölgeler ve şiddetleri','Regions reported across the week, and how badly');

  const pva=R.pva.live.length===0
    ?`<div class="none">${L('Bu hafta için henüz plan ya da kayıt yok.','Nothing planned or logged on this week yet.')}</div>`
    :`<table class="tbl"><thead><tr><th>${L('Gün','Day')}</th><th class="r">${L('Planlanan','Planned')}</th>
        <th class="r">${L('Gerçekleşen','Actual')}</th><th class="r">Δ</th></tr></thead>
      <tbody>${R.pva.rows.filter(r=>r.planned>0||r.actual>0).map(r=>`<tr>
        <td class="d">${esc(r.label)}</td><td class="r">${r.planned?tibNum(r.planned):'—'}</td>
        <td class="r ac">${r.actual?tibNum(r.actual):'—'}</td>
        <td class="r" style="color:${dev(r.d)}">${tibPct(r.d)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td class="d">${L('Hafta','Week')}</td><td class="r">${tibNum(R.pva.pT)}</td>
        <td class="r ac">${R.pva.aT?tibNum(R.pva.aT):'—'}</td>
        <td class="r" style="color:${dev(R.pva.d)}">${tibPct(R.pva.d)}</td></tr></tfoot></table>`;

  const trend=R.trend.cols.every(c=>!c.v)
    ?`<div class="none">${L('Son dört haftada yük yok.','No load in the last four weeks.')}</div>`
    :`<div class="tr">${R.trend.cols.map((c,i)=>`<div class="c${i===3?' on':''}">
        <span class="bar"><i style="height:${Math.max(3,c.v/R.trend.max*100).toFixed(1)}%"></i></span>
        <span class="v">${c.v?tibNum(c.v):'—'}</span><span class="l">${esc(c.label)}</span>
        <span class="dd" style="color:${dev(c.d,10)}">${c.d==null?'':tibPct(c.d)}</span></div>`).join('')}</div>
      <div class="legend">${R.trend.change==null
        ?L('Geçen haftayla karşılaştırmak için yeterli geçmiş yok.','Not enough history to compare with last week.')
        :L(`Geçen haftaya göre %${Math.abs(R.trend.change)} ${R.trend.change>0?'arttı':'azaldı'}.`,
           `${R.trend.change>0?'Up':'Down'} ${Math.abs(R.trend.change)}% on last week.`)}</div>`;

  /* One athlete per row down a single column is the tallest thing on the sheet, and it
     grows with the squad. Past fourteen it runs in two columns side by side — the same
     ranking read down the left and continued on the right, the way a team sheet is
     read — so a 24-player squad costs the page the height of twelve. */
  const srRow=(r,i)=>`<tr><td class="rk">${i+1}</td><td class="d">${esc(r.a.name||'—')}</td>
    <td class="r ac">${r.load?tibNum(r.load):'—'}${bar(r.load/R.srpe.max*100,dev(r.d,15))}</td>
    <td class="r" style="color:${dev(r.d,15)}">${r.load?tibPct(r.d):L('yük yok','no load')}</td></tr>`;
  const srTable=rows=>`<table class="tbl"><thead><tr><th class="rk">#</th><th>${L('Sporcu','Athlete')}</th>
      <th class="r">sRPE</th><th class="r">Δ</th></tr></thead>
    <tbody>${rows.map(([r,i])=>srRow(r,i)).join('')}</tbody></table>`;
  const srAll=R.srpe.rows.map((r,i)=>[r,i]);
  const srSplit=srAll.length>14;
  const srHalf=Math.ceil(srAll.length/2);
  const srpe=R.srpe.n===0
    ?`<div class="none">${L('Bu hafta sıralanacak sporcu yükü yok.','No athlete load this week to rank.')}</div>`
    :`${srSplit?`<div class="srcols">${srTable(srAll.slice(0,srHalf))}${srTable(srAll.slice(srHalf))}</div>`:srTable(srAll)}
      <div class="legend">${L(`Takım ortalaması ${tibNum(R.srpe.mean)} AU · ${R.srpe.n} sporcu · AU = sRPE × dakika`,
        `Squad mean ${tibNum(R.srpe.mean)} AU · ${R.srpe.n} athletes · AU = sRPE × minutes`)}</div>`;

  /* A card's body is wrapped so it can be told to take the height the card was given:
     a stretched frame with its content pinned to the top would only move the white
     space from below the card to inside it. */
  const card=(t,sub,tag,body)=>`<div class="card"><div class="chead">
      <div><div class="ct">${esc(t)}</div><div class="cs">${esc(sub)}</div></div>${tag||''}</div>
    <div class="cbody">${body}</div></div>`;

  const html=`<!DOCTYPE html>
<html lang="${REPORT_LANG}"><head><meta charset="utf-8"><title>${L('Takım Analizi','Team Insights')} — ${esc(R.teamName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:8mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--bg2:#f7f8fa}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10px;line-height:1.4;background:#fff}
/* The sheet is laid out at the printed page's own width, on screen as well, so the
   height measured in the window is the height the printer will see. #fit is given that
   measured height once the sheet has been scaled into it — the document is then exactly
   one page tall and there is no second page for anything to spill onto. */
/* A page is a box the sheet inside it is scaled into. The box keeps the page's own
   width, so the only gutters are the @page margins and they are equal by definition;
   it is given the scaled height, so the document is exactly as many pages as there are
   boxes and nothing can spill past one. */
.pg{width:${TIR_PAGE_W}px;margin:0 auto;overflow:hidden}
.pg-in{width:${TIR_PAGE_W}px;transform-origin:top left}
/* A sheet whose one card is shorter than the paper: the card is given the page instead
   of leaving half a sheet of nothing under it. The page's own height is untouched — the
   card simply ends where the paper does. */
.pg-in.fill{min-height:${TIR_PAGE_H-4}px;display:flex;flex-direction:column}
.pg-in.fill>.card{flex:1 1 auto;margin-bottom:0}
.brk{break-before:page;page-break-before:always}
@media print{.scr-sp2{display:none}}
.hdr{display:flex;align-items:center;gap:14px;padding:10px 18px;background:linear-gradient(120deg,#0a0b0d 0%,#15171c 100%);color:#fff;border-radius:12px;margin-bottom:8px}
.hdr .lg{width:44px;height:44px;border-radius:12px;background:#1c2030;border:2px solid rgba(154,171,58,.55);display:grid;place-items:center;flex:none;overflow:hidden;padding:3px}
.hdr .lg img{width:100%;height:100%;object-fit:contain;display:block}
.hdr h1{font-size:19px;font-weight:700;letter-spacing:-.01em;line-height:1.05}
.hdr .date{display:inline-block;margin-top:5px;font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:4px 11px;border-radius:6px;letter-spacing:.06em}
.hdr .ttl{margin-left:auto;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:8px}
.kpi{border:1px solid var(--border);border-radius:10px;padding:8px 11px;background:var(--bg2)}
.kpi .kv{font-size:19px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.kpi .kv u{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;color:var(--dim);text-decoration:none;margin-left:4px;letter-spacing:.06em}
.kpi .kk{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.09em;margin-top:3px}
.kpi .ks{font-size:9px;color:var(--dim);margin-top:2px}
.card{border:1px solid var(--border);border-radius:11px;padding:10px 12px;background:#fff;margin-bottom:7px;display:flex;flex-direction:column}
/* WHAT IS IN THE CARD FOLLOWS THE CARD. A frame stretched to the foot of the sheet with
   its rows still bunched at the top has not filled anything — it has moved the white
   space inside the border. So the body takes the height the frame was given and each
   kind of body spends it the way that body should: table and list rows share it out
   between them, the trend's bars grow taller into it, and a legend or a footnote stays
   at the bottom edge where it belongs. Nothing is re-sized past what it needs on a busy
   week — these all grow from the height the content already asked for. */
.cbody{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.cbody>.tbl,.cbody>.srcols,.cbody>.sd,.cbody>.fl,.cbody>.tr{flex:1 1 auto}
.cbody>.none{flex:1 1 auto;display:grid;place-items:center}
.cbody>.tr{height:auto;min-height:84px}
.srcols{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;align-items:stretch}
.srcols .tbl{height:100%}
.fl.wide{display:grid;gap:0 16px;align-items:stretch;align-content:stretch}
.fl.wide .fl-r{border-bottom:1px solid #f1f2f4;padding:6px 0}
/* Half the width means the name column has to be bought back off the others: the rank
   and the inline bar give up what they can spare, so a name still sits on one line and
   a row stays one row high. */
.srcols .tbl td{padding:2px 3px}
.srcols .tbl th{padding:0 3px 4px}
.srcols .tbl .d{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:98px}
.srcols .tbl .rk{width:14px}
.srcols .tbl .ac .mini{width:22px;margin-left:4px}
.chead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-bottom:6px;margin-bottom:7px;border-bottom:1px solid var(--border)}
.ct{font-size:12px;font-weight:700;letter-spacing:-.01em}
.cs{font-size:9px;color:var(--dim);margin-top:2px}
.tot{font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;white-space:nowrap}
.tot u{font-size:8.5px;color:var(--dim);text-decoration:none;margin-left:3px;letter-spacing:.06em}
.count{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;min-width:22px;height:22px;padding:0 6px;border-radius:11px;display:grid;place-items:center;background:var(--bg2);color:var(--muted)}
.count.on{background:#fee2e2;color:#be123c}
/* The three columns end on ONE line at the foot of the sheet. A column is a flex
   column and its LAST card takes whatever height the column was given over and above
   what the cards above it needed, so a short middle column no longer leaves a band of
   white between the last card and the footer while the column beside it runs full
   height. The grid row is still as tall as the tallest column, so nothing about the
   page's own height changes — only where the white goes. */
.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;align-items:stretch}
.cols>div{display:flex;flex-direction:column;min-width:0}
.cols>div>.card:last-child{flex:1 1 auto;margin-bottom:0}
.none{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:var(--muted);padding:11px 4px;text-align:center}
.algrid{display:grid;gap:6px}
.al{border:1px solid var(--border);border-left:3px solid #b45309;border-radius:8px;padding:6px 8px;background:#fffdf7}
.al.high{border-left-color:#be123c;background:#fff7f8}
.al .k{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#b45309}
.al.high .k{color:#be123c}
.al .w{font-size:10px;font-weight:700;margin:2px 0 2px;letter-spacing:-.01em}
.al .t{font-size:8.5px;color:var(--text2);line-height:1.4}
.sd{display:flex;flex-direction:column}
.sd-r{display:grid;grid-template-columns:1fr auto 62px auto;align-items:center;gap:7px;padding:3px 0;border-bottom:1px solid #f1f2f4;flex:1 1 auto}
.sd-r:last-child{border-bottom:none}
.sd-r .l{font-size:10px;font-weight:500;display:flex;align-items:center;gap:6px;min-width:0}
.sd-r .l i{width:7px;height:7px;border-radius:2px;flex:none}
.sd-r .n{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600}
.sd-r .m{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);white-space:nowrap}
.mini{display:inline-block;width:100%;min-width:34px;height:5px;border-radius:3px;background:#eceef1;overflow:hidden;vertical-align:middle}
.mini i{display:block;height:100%;border-radius:3px}
.fl{display:flex;flex-direction:column}
.fl-r{padding:4px 0;border-bottom:1px solid #f1f2f4;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center}
.fl-r:last-child{border-bottom:none}
.fl-r.hot .nm{color:#be123c}
.fl-r .nm{font-size:10.5px;font-weight:700;letter-spacing:-.01em}
.fl-r .nm u{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:500;color:var(--dim);text-decoration:none;margin-left:6px;letter-spacing:.06em;text-transform:uppercase}
.fl-r .tg{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.tag{font-family:'IBM Plex Mono',monospace;font-size:8px;padding:2px 6px;border-radius:5px;background:var(--bg2);border:1px solid var(--border);color:var(--muted);letter-spacing:.03em}
/* A pain chip is graded by colour as well as by word — grey for a region that was
   ticked on a question that never asked how bad it is, then amber, orange, red. The
   small figure on the end is how many days of the week the region came back. */
.tag.p0{background:var(--bg2);border-color:var(--border);color:var(--muted)}
.tag.p1{background:#fffbeb;border-color:#fde68a;color:#b45309}
.tag.p2{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
.tag.p3{background:#fff1f2;border-color:#fecdd3;color:#be123c}
.tag b{font-weight:600;margin-left:5px;padding-left:5px;border-left:1px solid currentColor;opacity:.65}
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:8px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);text-align:left;padding:0 5px 5px;border-bottom:1px solid var(--border)}
.tbl td{font-family:'IBM Plex Mono',monospace;font-size:9.5px;padding:2.5px 5px;border-bottom:1px solid #f1f2f4;vertical-align:middle}
.tbl tbody tr:last-child td{border-bottom:none}
.tbl .r{text-align:right}
.tbl .rk{width:20px;color:var(--dim)}
.tbl .d{font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:500}
.tbl .ac{font-weight:600}
.tbl .ac .mini{width:42px;margin-left:6px}
.tbl tfoot td{border-top:1.5px solid var(--border);border-bottom:none;font-weight:700;padding-top:6px}
.tr{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end;height:84px;margin-bottom:6px}
.tr .c{display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end}
.tr .bar{width:100%;max-width:34px;height:100%;background:#f1f2f4;border-radius:5px;display:flex;align-items:flex-end;overflow:hidden}
.tr .bar i{display:block;width:100%;background:#c9cfd6;border-radius:5px}
.tr .c.on .bar i{background:var(--accent)}
.tr .v{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600}
.tr .l{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--dim);letter-spacing:.05em}
.tr .dd{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:600}
.legend{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--dim);letter-spacing:.03em;padding-top:6px;border-top:1px solid #f1f2f4;margin-top:6px}
.footer{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);margin-top:4px;padding-top:6px;border-top:1px solid var(--border);letter-spacing:.06em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
</style></head><body>
<div class="print-bar">📄 ${L('Takım Analizi raporu hazır','Team Insights report is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp" style="margin-top:50px"></div>
<div class="pg"><div class="pg-in">
<div class="hdr">
  ${hasMedia(R.logo)?`<div class="lg"><img src="${mediaSrc(R.logo)}"/></div>`:''}
  <div><h1>${esc(R.teamName)}</h1><div class="date">📊 ${esc(R.periodLabel)} · ${L('seçili hafta','selected week')}</div></div>
  <div class="ttl">${L('TAKIM<br>ANALİZİ','TEAM<br>INSIGHTS')}</div>
</div>
<div class="kpis">
  ${kpi(tibNum(R.srpe.total),'AU',L('Haftanın toplam yükü','Week total load'),`${R.srpe.n} ${L('sporcu kayıt girdi','athletes logged')}`)}
  ${kpi(tibNum(R.srpe.mean),'AU',L('Takım ortalaması','Squad mean'),L('sporcu başına 7 gün','per athlete, 7 days'))}
  ${kpi(R.sesDist.total,L('antrenman','sessions'),L('Planlanan antrenman','Sessions planned'),`${tibNum(R.sesMin)} ${L('dakika toplam','minutes total')}`)}
  ${kpi(tibPct(R.pva.d),'',L('Plan / gerçekleşen','Planned vs actual'),`${tibNum(R.pva.pT)} → ${tibNum(R.pva.aT)} AU`)}
  ${kpi(R.mono!=null?R.mono.toFixed(2):'—','',L('Haftalık monotoni','Weekly monotony'),R.mono>2?L('yüksek — hafif gün ekle','high — add an easy day'):L('kendi bandında','inside its band'))}
</div>
${card(L('Antrenör Uyarıları','Coach Alerts'),L('Doğrudan bu haftanın rakamlarından','Read straight off this week’s numbers'),
  `<span class="count${R.alerts.length?' on':''}">${R.alerts.length}</span>`,alerts)}
<div class="cols">
  <div>
    ${card(L('Antrenman Dağılımı','Session Distribution'),L('Hafta hangi antrenman odaklarını çalıştı','Which session focus the week trained'),
      `<span class="tot">${R.sesDist.total}<u>${L('antrenman','sessions')}</u></span>`,sesDist)}
    ${/* With the pain summary on its own page the left column would end short, so the
          load trend moves across to it: what the week trained, then how the load moved. */''}
    ${pnPage
      ?card(L('Yük Trendi','Load Trend'),L('Takım ortalaması 7 günlük yük, dört hafta','Squad mean 7-day load, four weeks'),
        R.trend.change!=null?`<span class="tot" style="color:${dev(Math.round(R.trend.change),10)}">${R.trend.change>0?'+':''}${R.trend.change}%</span>`:'',trend)
      :card(pnTitle,pnSub,pnHead,painBody(0))}
  </div>
  <div>
    ${card(L('Planlanan / Gerçekleşen','Planned vs Actual'),L('Hedef RPE × dakika, geri dönen yüke karşı','Target RPE × minutes, against the load that came back'),
      R.pva.d!=null?`<span class="tot" style="color:${dev(R.pva.d)}">${tibPct(R.pva.d)}</span>`:'',pva)}
    ${pnPage?'':card(L('Yük Trendi','Load Trend'),L('Takım ortalaması 7 günlük yük, dört hafta','Squad mean 7-day load, four weeks'),
      R.trend.change!=null?`<span class="tot" style="color:${dev(Math.round(R.trend.change),10)}">${R.trend.change>0?'+':''}${R.trend.change}%</span>`:'',trend)}
  </div>
  <div>
    ${card(L('Takım sRPE Tablosu','Team sRPE Table'),L('Haftanın toplam sRPE yükü, yüksekten aza','This week’s total sRPE load, highest to lowest'),
      `<span class="tot">${tibNum(R.srpe.total)}<u>AU</u></span>`,srpe)}
  </div>
</div>
<div class="footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${esc(R.teamName)} · CoachOS</div>
</div></div>
${pnPage?`
<div class="scr-sp2" style="height:26px"></div>
<div class="pg brk"><div class="pg-in fill">
<div class="hdr">
  ${hasMedia(R.logo)?`<div class="lg"><img src="${mediaSrc(R.logo)}"/></div>`:''}
  <div><h1>${esc(R.teamName)}</h1><div class="date">📊 ${esc(R.periodLabel)} · ${L('seçili hafta','selected week')}</div></div>
  <div class="ttl">${L('AĞRI<br>ÖZETİ','PAIN<br>SUMMARY')}</div>
</div>
${card(pnTitle,pnSub,pnHead,painBody(pnCols))}
<div class="footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${esc(R.teamName)} · CoachOS</div>
</div></div>`:''}
<script>
/* The columns above fit the usual week on the page by themselves. This is the guarantee
   for the week they do not: the sheet is measured and, if it is still too tall, scaled
   down as a whole until it is not. Scaling keeps every alert and every athlete on the
   page — the alternative, cutting the list off at the fold, would print a report that
   quietly disagrees with the board it came from.
   Re-measured when the fonts land and again just before the print dialog opens, because
   a metric font arriving late changes every line's height and the number taken at load
   would no longer be the one that matters. */
(function(){
  var PAGE_W=${TIR_PAGE_W},PAGE_H=${TIR_PAGE_H};
  /* A page that has to shrink is laid out WIDER by the same factor it will be shrunk by,
     so that once scaled it comes out exactly the width of the paper. Scaling a sheet
     that was laid out at page width would take the width down with the height and leave
     the sheet marooned in the middle of the page with a hand's width of nothing down
     each side. Widening first also buys height back — cards and cells get wider, text
     wraps less — so the scale ends up closer to 1 than it would otherwise be.
     Width and scale each depend on the other, so it is solved by going round a few
     times; it settles in two or three, and the last pass never leaves the page. */
  function fit(){
    var pg=document.querySelectorAll('.pg');
    for(var i=0;i<pg.length;i++){
      var f=pg[i],s=f.firstElementChild;
      if(!s)continue;
      f.style.width=PAGE_W+'px';f.style.height='auto';s.style.transform='none';
      var k=1,h=0;
      for(var n=0;n<8;n++){
        s.style.width=Math.round(PAGE_W/k)+'px';
        h=s.scrollHeight;if(!h)break;
        var want=Math.min(1,(PAGE_H-2)/h);
        if(Math.abs(want-k)<0.004){k=want;break;}
        k=want;
      }
      if(!h)continue;
      s.style.width=Math.round(PAGE_W/k)+'px';
      h=s.scrollHeight;
      if(h*k>PAGE_H-2)k=(PAGE_H-2)/h;
      s.style.transform='scale('+k+')';
      f.style.height=Math.ceil(h*k)+'px';
    }
  }
  window.addEventListener('load',fit);
  window.addEventListener('beforeprint',fit);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
  setTimeout(fit,300);setTimeout(fit,1200);
  fit();
})();
<\/script>
</body></html>`;
  w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();}catch(e){}},400);
}

function TeamInsights({days,athletes,refDate,setup}){
  /* Subscribing to the app language re-renders the whole board the instant the
     TR/EN switch flips; `lang` also sits in the dependency list of every memo
     that builds a sentence, so the cached text is rebuilt in the new language
     rather than staying behind in the old one. */
  const lang=useAppLang();
  const ref=refDate||fmt(today);
  const ws=sow(parseD(ref)),we=addD(ws,6);
  const wsK=fmt(ws),weK=fmt(we);
  const periodLabel=L(`${ws.getDate()} ${MN_S_TR[ws.getMonth()]} – ${we.getDate()} ${MN_S_TR[we.getMonth()]}`,
                      `${MN[ws.getMonth()]} ${ws.getDate()} – ${MN[we.getMonth()]} ${we.getDate()}`);
  const dayKeys=useMemo(()=>Array.from({length:7},(_,i)=>fmt(addD(ws,i))),[wsK]);
  const roster=useMemo(()=>(athletes||[]).filter(a=>(a.name||'').trim()),[athletes]);

  /* Bars are drawn at zero and grown to their value one frame later, so the board
     animates itself in instead of appearing already finished — and it does it again
     whenever the week changes, which is the moment the numbers are new. Two frames:
     the first paints the zero width, the second is what the transition runs from. */
  const[lit,setLit]=useState(false);
  useEffect(()=>{
    setLit(false);
    let r2=0;const r1=requestAnimationFrame(()=>{r2=requestAnimationFrame(()=>setLit(true));});
    return()=>{cancelAnimationFrame(r1);cancelAnimationFrame(r2);};
  },[wsK]);
  const grow=pct=>({width:lit?`${Math.max(0,Math.min(100,pct))}%`:'0%'});

  /* ---- What the week trained ------------------------------------------- */
  /* Counted by the session's own focus (sesFocus → the editor's "Session Focus" box),
     not by the inferred colour category. Session focus is a multi-select, so a session
     written as Strength + Power counts once under each — that is the honest answer to
     "how much of the week touched power". Its MINUTES are split evenly between them
     instead of being counted twice, so the minute column still adds up to the minutes
     that were actually on the plan. `total` stays the number of sessions in the week,
     which is why it is counted per session rather than summed off the rows. */
  const sesDist=useMemo(()=>{
    const by={};let total=0;
    dayKeys.forEach(k=>(((days||{})[k]||{}).sessions||[]).forEach(s=>{
      total++;
      const mins=Number(s.duration)||0;
      const fs=sesFocus(s).filter(f=>TIB_FOCUS_BY[f]);
      const keys=fs.length?fs:[TIB_FOCUS_NONE.id];
      keys.forEach(f=>{const b=by[f]||(by[f]={n:0,min:0});b.n++;b.min+=mins/keys.length;});
    }));
    const rows=Object.keys(by)
      .map(f=>({...(TIB_FOCUS_BY[f]||TIB_FOCUS_NONE),n:by[f].n,min:Math.round(by[f].min)}))
      .sort((a,b)=>b.n-a.n||b.min-a.min||a.label.localeCompare(b.label));
    return{rows,total,mins:rows.reduce((x,r)=>x+r.min,0),
      max:Math.max(1,...rows.map(r=>r.n))};
  },[days,wsK]);

  /* ---- Who needs attention ---------------------------------------------
     One row per athlete carrying at least one flag, worst first. The three the
     coach asked for — readiness under 2.5, a pain report, a load tier that had to
     be stepped down — plus the ACWR the Load Board already colours red, because an
     athlete in the high-risk zone is exactly what "action required" means. */
  const flagged=useMemo(()=>roster.map(a=>{
    const t=athLoadTier(a,ref);
    const pains=athPainReports(a,ref),note=athPainNote(a,ref);
    const z=acwrZoneOf(t.acwr);
    const tags=[];
    if(t.rd.score!=null&&t.rd.score<2.5)
      tags.push({k:'rd',sev:2,t:`${L('Hazır oluş','Readiness')} ${t.rd.score.toFixed(1)}/5${t.rd.src==='srpe'?L(' (tahmini)',' (est.)'):''}`});
    /* One chip PER painful region rather than one chip listing them all, because the
       chip is what carries the grading: the region is coloured by how bad the athlete
       said it was, so "Diz" reads red at Fazla and "Dirsek" amber at Orta. THE COLOUR IS
       THE WHOLE GRADING — the word is not repeated beside it, which is what turned a
       squad of five niggles into a wall of "· Orta, · Fazla" the eye had to read before
       it could find the region. The word is still on the chip's tooltip. A region the
       athlete ticked on a question with no severity axis takes the day's own "Ağrı
       düzeyin nedir?" score — the same fallback the check-in sync applies. */
    if(pains.length){
      const dsev=sevFromSoreness(athWellnessSnap(a,ref).soreness);
      pains.forEach(p=>{
        const ps=Math.max(0,Math.min(3,Number(p.sev)||dsev||0));
        tags.push({k:'pain',pain:ps,sev:ps===1?1:2,t:tibCtLabel(p.tag)});
      });
    }
    else if(note)tags.push({k:'pain',pain:0,sev:2,t:`${L('Ağrı','Pain')} · ${note.text}`});
    if(t.intent==='recovery')tags.push({k:'tier',sev:2,t:L('Kademe ↓ Toparlanma','Tier ↓ Recovery')});
    else if(t.intent==='maintain')tags.push({k:'tier',sev:1,t:L('Kademe ↓ Koruma','Tier ↓ Maintain')});
    if(t.acwr>1.5)tags.push({k:'acwr',sev:2,t:`ACWR ${t.acwr.toFixed(2)} · ${tibZoneLabel(z.t)}`});
    const sev=Math.max(0,...tags.map(x=>x.sev));
    return{a,tags,sev,rd:t.rd.score};
  }).filter(r=>r.tags.length)
    .sort((x,y)=>y.sev-x.sev||y.tags.length-x.tags.length||(x.a.name||'').localeCompare(y.a.name||'')),
  [roster,ref,lang]);

  /* ---- What hurt, and how badly -----------------------------------------
     The report's own read on the squad: one row per athlete who reported pain at any
     point in the week, each region with the worst grading given for it and the number
     of days it came back. Sorted the way a coach triages — worst grading first, then
     the athlete carrying the most regions, then the one who reported on the most days. */
  const weekPain=useMemo(()=>roster.map(a=>({a,...tibWeekPain(a,dayKeys)}))
    .filter(r=>r.regions.length)
    .sort((x,y)=>y.worst-x.worst||y.regions.length-x.regions.length||y.days-x.days
      ||(x.a.name||'').localeCompare(y.a.name||'')),
  [roster,dayKeys,lang]);
  /* The same week counted by region instead of by athlete — the one line that says
     whether the squad has a knee problem or seven unrelated niggles. */
  const painTally=useMemo(()=>{
    const by={};
    weekPain.forEach(r=>r.regions.forEach(g=>{
      const b=by[g.key]||(by[g.key]={key:g.key,label:g.label,n:0,worst:0});
      b.n++;b.worst=Math.max(b.worst,g.worst);}));
    return Object.keys(by).map(k=>by[k])
      .sort((x,y)=>y.n-x.n||y.worst-x.worst||x.label.localeCompare(y.label));
  },[weekPain]);

  /* ---- Did the week land on its targets ---------------------------------
     Actual comes from the shared daily-load map (the athletes' own logs where they
     have them, the rated team sessions otherwise) — the same number the calendar
     prints under each day column, by construction. A day with nothing rated yet has
     no actual, and shows a dash rather than a −100%. */
  const teamDaily=useMemo(()=>teamDailyLoadMap(days,roster),[days,roster]);
  const pva=useMemo(()=>{
    const rows=dayKeys.map((k,i)=>{
      const planned=Math.round(tibPlanDay((days||{})[k],roster)),actual=Math.round(teamDaily[k]||0);
      return{k,label:dnL(i),planned,actual,
        d:(planned>0&&actual>0)?Math.round((actual-planned)/planned*100):null};
    });
    const live=rows.filter(r=>r.planned>0||r.actual>0);
    const pT=live.reduce((s,r)=>s+r.planned,0),aT=live.reduce((s,r)=>s+r.actual,0);
    return{rows,live,max:Math.max(1,...rows.map(r=>Math.max(r.planned,r.actual))),
      pT,aT,d:(pT>0&&aT>0)?Math.round((aT-pT)/pT*100):null};
  },[days,teamDaily,roster,wsK,lang]);

  /* ---- The squad, split the way it is coached --------------------------- */
  const groups=useMemo(()=>{
    const by={};
    roster.forEach(a=>{const g=posGroupOf(a.position);(by[g]||(by[g]=[])).push(a.id);});
    return[...POS_GROUPS,{id:'other',label:'Other'}]
      .filter(g=>(by[g.id]||[]).length)
      .map(g=>({id:g.id,label:g.label,ids:new Set(by[g.id]),n:by[g.id].length}));
  },[roster]);

  /* Every session on the plan, in time order — the whole calendar, not just this
     week, because the session that ends a recovery window can sit in the next one. */
  const allSes=useMemo(()=>{
    const out=[];
    Object.entries(days||{}).forEach(([k,d])=>((d&&d.sessions)||[]).forEach(s=>
      out.push({s,date:k,st:tibStart(k,s),en:tibEnd(k,s)})));
    return out.sort((a,b)=>a.st-b.st);
  },[days]);

  /* ---- How much rest each unit gets ------------------------------------
     Measured end-of-session → start-of-next, which is the rest the players
     actually get. The board no longer draws a window per unit; what survives is
     the alert, because a turnaround under a day is a decision for today. A
     session with nobody assigned belongs to the whole squad, so it counts for
     every group. */
  const recovery=useMemo(()=>{
    const anchor=parseD(ref);anchor.setHours(23,59,59,999);
    return groups.map(g=>{
      const mine=allSes.filter(x=>{const as=(x.s.athletes||[]);return !as.length||as.some(id=>g.ids.has(id));});
      let last=null;mine.forEach(x=>{if(x.st<=anchor&&(!last||x.st>last.st))last=x;});
      const from=last?last.st:anchor;
      let next=null;mine.forEach(x=>{if(x.st>from&&(!next||x.st<next.st))next=x;});
      const gap=(last&&next)?Math.max(0,(next.st-last.en)/3600000):null;
      return{g,last,next,gap,band:tibBand(gap)};
    });
  },[groups,allSes,ref]);

  /* ---- The week's sRPE per athlete, biggest load first ------------------
     The table the coach reads down: every athlete on the roster with the total
     sRPE load (AU) they carried this week, sorted high → low. The Δ column is
     kept alongside because it is the same number without doing the subtraction —
     how far that athlete sits from the squad mean.

     The mean is taken over the athletes who actually have load in the week. An
     athlete with none is almost always one who has not logged rather than one who
     rested, and counting their zero would drag the mean down and then report
     everybody else as overloaded against it — so they are listed as "no load"
     instead of as −100%. */
  const srpe=useMemo(()=>{
    const rows=roster.map(a=>({a,load:athLoadSum(a,wsK,weK)}));
    const live=rows.filter(r=>r.load>0);
    const mean=live.length?live.reduce((s,r)=>s+r.load,0)/live.length:0;
    return{mean:Math.round(mean),n:live.length,total:Math.round(rows.reduce((s,r)=>s+r.load,0)),
      max:Math.max(1,...rows.map(r=>r.load)),
      rows:rows.map(r=>({...r,d:(mean>0&&r.load>0)?Math.round((r.load-mean)/mean*100):null}))
        .sort((x,y)=>y.load-x.load||(x.a.name||'').localeCompare(y.a.name||''))};
  },[roster,wsK]);

  /* ---- Four weeks of squad mean load ------------------------------------ */
  const trend=useMemo(()=>{
    const cols=[3,2,1,0].map(back=>{
      const s=fmt(addD(ws,-7*back)),e=fmt(addD(ws,-7*back+6));
      const vals=roster.map(a=>athLoadSum(a,s,e)).filter(v=>v>0);
      return{key:`w${back}`,label:back?L(`H-${back}`,`W-${back}`):L('Bu hafta','Current'),
        v:vals.length?Math.round(vals.reduce((x,y)=>x+y,0)/vals.length):0,n:vals.length};
    });
    cols.forEach((c,i)=>{const p=i?cols[i-1].v:0;
      c.d=(i&&p>0&&c.v>0)?Math.round((c.v-p)/p*100):null;});
    const prev=cols[2].v,cur=cols[3].v;
    return{cols,max:Math.max(1,...cols.map(c=>c.v)),
      change:(prev>0&&cur>0)?Math.round((cur-prev)/prev*1000)/10:null};
  },[roster,wsK,lang]);

  /* ---- Coach alerts -----------------------------------------------------
     Nothing here is a new measurement: every alert restates something already on
     the board, in the words of the decision it asks for. Written worst-first so
     the top of the list is the thing to deal with today. */
  const alerts=useMemo(()=>{
    const out=[];
    const add=(sev,kind,where,text)=>out.push({sev,kind,where,text,id:`${kind}|${where}`});
    // Two consecutive days both well above the week's own training-day average.
    const trained=pva.rows.filter(r=>r.actual>0);
    if(trained.length>=3){
      const mean=trained.reduce((s,r)=>s+r.actual,0)/trained.length;
      for(let i=0;i<pva.rows.length-1;i++){
        const a=pva.rows[i],b=pva.rows[i+1];
        if(a.actual>=mean*1.3&&b.actual>=mean*1.3)
          add(2,L('Yüksek yük yoğunluğu','High load density'),`${a.label} → ${b.label}`,
            L(`Üst üste iki gün ${tibNum(mean*1.3)} AU üzerinde (hafta ortalaması ${tibNum(mean)} AU).`,
              `Two consecutive days above ${tibNum(mean*1.3)} AU (week average ${tibNum(mean)} AU).`));
      }
    }
    // A day that did not land where it was planned to.
    pva.rows.forEach(r=>{if(r.d!=null&&Math.abs(r.d)>15)
      add(r.d>0?2:1,L('Yük sapması','Load deviation'),r.label,
        L(`Gerçekleşen ${tibNum(r.actual)} AU, ${tibNum(r.planned)} AU hedefin %${Math.abs(r.d)} ${r.d>0?'üzerinde':'altında'} kaldı.`,
          `Actual ${tibNum(r.actual)} AU ${r.d>0?'exceeded':'fell short of'} the ${tibNum(r.planned)} AU target by ${Math.abs(r.d)}%.`));});
    /* Units turning around in under a day. Groups that share a window share an
       alert — three identical cards saying the same Thursday→Friday turnaround is
       noise, and the point of the list is that each card is a different problem. */
    const shortW={};
    recovery.forEach(r=>{if(r.band&&r.band.id==='short'&&r.last&&r.next){
      const k=`${+r.last.en}|${+r.next.st}`;
      (shortW[k]||(shortW[k]={gap:r.gap,last:r.last,next:r.next,gs:[]})).gs.push(tibGroupLabel(r.g));}});
    Object.values(shortW).forEach(w=>add(2,L('Toparlanma penceresi','Recovery window'),
      `${w.gs.join(', ')} · ${tibDayName(w.last.st)} → ${tibDayName(w.next.st)}`,
      L(`Antrenmanlar arasında ${tibGapText(w.gap)} var — 24 saatlik kısa toparlanma sınırının altında.`,
        `${tibGapText(w.gap)} between sessions — under the 24h short-recovery line.`)));
    // Athletes off the squad mean in either direction.
    if(srpe.n>=3)srpe.rows.forEach(r=>{
      if(r.d!=null&&r.d<=-25)add(1,L('Düşük maruziyet','Low exposure'),r.a.name||'—',
        L(`7 günlük yük, takım ortalamasının %${Math.abs(r.d)} altında (${tibNum(r.load)} / ${tibNum(srpe.mean)} AU).`,
          `7-day load is ${Math.abs(r.d)}% below the squad mean (${tibNum(r.load)} vs ${tibNum(srpe.mean)} AU).`));
      if(r.d!=null&&r.d>=25)add(2,L('Yüksek maruziyet','High exposure'),r.a.name||'—',
        L(`7 günlük yük, takım ortalamasının %${r.d} üzerinde (${tibNum(r.load)} / ${tibNum(srpe.mean)} AU).`,
          `7-day load is ${r.d}% above the squad mean (${tibNum(r.load)} vs ${tibNum(srpe.mean)} AU).`));});
    // What the flag list found, as one line rather than one per athlete.
    if(flagged.length)add(2,L('Aksiyon gerekli','Action required'),
      L(`${flagged.length} sporcu`,`${flagged.length} athlete${flagged.length>1?'s':''}`),
      L(`${flagged.map(f=>f.a.name||'—').slice(0,4).join(', ')}${flagged.length>4?` +${flagged.length-4}`:''} — işaretli sporcular listesine bak.`,
        `${flagged.map(f=>f.a.name||'—').slice(0,4).join(', ')}${flagged.length>4?` +${flagged.length-4}`:''} — see the flag list.`));
    // Monotony: the same figure Load Monitoring reports for the week.
    const mono=teamWeekMono(days,roster,wsK).monotony;
    if(mono>2)add(mono>2.5?2:1,L('Antrenman monotonisi','Training monotony'),periodLabel,
      L(`Haftalık monotoni ${mono.toFixed(2)} — haftanın günleri birbirine fazla benziyor; gerçekten hafif bir gün ekle.`,
        `Weekly monotony ${mono.toFixed(2)} — the week's days look too alike; add a genuinely easy day.`));
    // The week as a whole against the one before it.
    if(trend.change!=null&&Math.abs(trend.change)>=20)
      add(trend.change>0?2:1,L('Haftalar arası değişim','Week-to-week jump'),
        trend.change>0?L('Yükseliş','Ramp up'):L('Düşüş','Drop off'),
        L(`Takım ortalama yükü geçen haftaya göre %${Math.abs(trend.change)} ${trend.change>0?'arttı':'azaldı'} (${tibNum(trend.cols[2].v)} → ${tibNum(trend.cols[3].v)} AU).`,
          `Squad mean load ${trend.change>0?'up':'down'} ${Math.abs(trend.change)}% on last week (${tibNum(trend.cols[2].v)} → ${tibNum(trend.cols[3].v)} AU).`));
    return out.sort((a,b)=>b.sev-a.sev);
  },[pva,recovery,srpe,flagged,trend,days,roster,wsK,periodLabel,lang]);

  const initials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const hasWeek=sesDist.total>0||pva.live.length>0;
  /* The report prints what is on screen, so it is handed the memos themselves rather
     than recomputing the week — a sheet that disagreed with the board it was printed
     from would be worse than no sheet. Monotony and total session minutes are the two
     figures the top strip adds, and both are read off what the board already holds. */
  const printBoard=()=>printTeamInsights({
    teamName:(setup&&setup.teamName)||L('Takım','Team'),logo:setup&&setup.logo,
    periodLabel,alerts,sesDist,weekPain,painTally,pva,trend,srpe,roster:roster.length,
    sesMin:sesDist.rows.reduce((t,r)=>t+(r.min||0),0),
    mono:teamWeekMono(days,roster,wsK).monotony,
  });
  let ci=0;const card=()=>({'--i':ci++});   // one stagger step per card, in render order

  return(<section className="tib">
    <div className="tib-head">
      <h2 className="tib-h1"><i/>{L('Takım Analizi','Team Insights')}</h2>
      <span className="tib-period">{periodLabel} · {L('seçili hafta','selected week')}</span>
      <button className="btn sec sm tib-print" onClick={printBoard}
        title={L('Takım analizi çıktısı (A4 yatay)','Team Insights export (A4 landscape)')}>⎙ {L('Çıktı al','Export')}</button>
    </div>

    {/* ---- Coach alerts: the board's headline, so it sits above the grid ---- */}
    <div className="tib-card" style={card()}>
      <div className="tib-chead">
        <div><div className="tib-ct">{L('Antrenör Uyarıları','Coach Alerts')}</div>
          <div className="tib-cs">{L('Doğrudan bu haftanın rakamlarından','Read straight off this week’s numbers')}</div></div>
        <span className={'tib-count'+(alerts.length?' on':'')}>{alerts.length}</span>
      </div>
      {alerts.length===0
        ?<div className="tib-none">{L('✓ Bu hafta işaretlenecek bir şey yok — yük, toparlanma ve check-in’lerin hepsi kendi bandında.',
                                      '✓ Nothing to flag this week — load, recovery and check-ins are all inside their bands.')}</div>
        :<div className="tib-al-grid">
          {alerts.map((al,i)=><div key={al.id+i} className={'tib-al '+(al.sev>1?'high':'mid')} style={{'--i':i}}>
            <span className="dot"/>
            <div className="tx">
              <div className="k">{al.kind}</div>
              <div className="w">{al.where}</div>
              <div className="t">{al.text}</div>
            </div>
          </div>)}
        </div>}
    </div>

    {/* Three explicit columns, so Load Trend and the sRPE table can be told to fill the
        height their column is given and the board ends on one line at the bottom. Which
        card sits in which column is fixed rather than balanced: they are grouped by what
        a coach reads together — the squad's shape on the left, the week's load in the
        middle, the athlete-by-athlete ranking on its own. Below ~1000px the columns wrap
        and the same grouping stacks. */}
    <div className="tib-grid">
      <div className="tib-col">
      {/* ---- Session distribution ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Antrenman Dağılımı','Session Distribution')}</div>
            <div className="tib-cs">{L('Hafta hangi antrenman odaklarını çalıştı','Which session focus the week trained')}</div></div>
          <span className="tib-tot">{sesDist.total}<u>{L('antrenman','sessions')}</u></span>
        </div>
        {sesDist.rows.length===0
          ?<div className="tib-none">{L('Bu haftanın planında henüz antrenman yok.','No sessions on this week’s plan yet.')}</div>
          :<div className="tib-sd">
            {sesDist.rows.map(r=><div key={r.id} className="tib-sd-r">
              <span className="l"><i style={{background:r.c}}/>{TIB_FOCUS_LABEL(r)}</span>
              <span className="n">{r.n}</span>
              <span className="tib-bar"><i style={{...grow(r.n/sesDist.max*100),background:r.c}}/></span>
              <span className="m">{r.min} {L('dk','min')}</span>
            </div>)}
          </div>}
      </div>

      {/* ---- Flagged athletes ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('İşaretli Sporcular','Flagged Athletes')}</div></div>
          <span className={'tib-count'+(flagged.length?' on':'')}>{flagged.length}</span>
        </div>
        {roster.length===0
          ?<div className="tib-none">{L('Kadroda henüz sporcu yok.','No athletes on the roster yet.')}</div>
          :flagged.length===0
          ?<div className="tib-none">{L('✓ İşaretli sporcu yok — herkes planlandığı gibi çalışabilir.','✓ Nobody flagged — every athlete is clear to train as planned.')}</div>
          :<div className="tib-fl">
            {flagged.map(f=><div key={f.a.id} className={'tib-fl-r'+(f.sev>1?' hot':'')}>
              <span className="av">{f.a.photo?<img src={mediaSrc(f.a.photo)} alt=""/>:initials(f.a.name)}</span>
              <div className="tx">
                <div className="nm">{f.a.name||'—'}<u>{tibPosLabel(f.a.position)||'—'}</u></div>
                <div className="tg">{f.tags.map((t,i)=>
                  <span key={i} className={'tib-tag '+(t.pain!=null?'p'+t.pain:'s'+t.sev)}
                    title={t.pain?`${L('Ağrı','Pain')} · ${tibPainSevLabel(t.pain)}`:undefined}>
                    {t.pain!=null&&<i className="pd"/>}{t.t}</span>)}</div>
              </div>
            </div>)}
          </div>}
      </div>

      </div>

      <div className="tib-col">
      {/* ---- Planned vs actual ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Planlanan / Gerçekleşen','Planned vs Actual')}</div>
            <div className="tib-cs">{L('Hedef RPE × dakika, geri dönen yüke karşı','Target RPE × minutes, against the load that came back')}</div></div>
          {pva.d!=null&&<span className="tib-d" style={{color:tibDevCol(pva.d)}}>{tibPct(pva.d)}</span>}
        </div>
        {pva.live.length===0
          ?<div className="tib-none">{L('Bu hafta için henüz plan ya da kayıt yok.','Nothing planned or logged on this week yet.')}</div>
          :<div className="tib-pv"><table className="tib-tbl">
            <thead><tr><th>{L('Gün','Day')}</th><th className="r">{L('Planlanan','Planned')}</th><th className="r">{L('Gerçekleşen','Actual')}</th><th className="r">Δ</th></tr></thead>
            <tbody>{pva.rows.map(r=>(r.planned>0||r.actual>0)&&<tr key={r.k}>
              <td className="d">{r.label}</td>
              <td className="r"><span className="pl">{r.planned?tibNum(r.planned):'—'}</span>
                <span className="tib-mini"><i className="p" style={grow(r.planned/pva.max*100)}/><i className="a" style={grow(r.actual/pva.max*100)}/></span></td>
              <td className="r ac">{r.actual?tibNum(r.actual):'—'}</td>
              <td className="r"><span className="tib-d" style={{color:tibDevCol(r.d)}}>{tibPct(r.d)}</span></td>
            </tr>)}</tbody>
            <tfoot><tr><td className="d">{L('Hafta','Week')}</td><td className="r">{tibNum(pva.pT)}</td>
              <td className="r ac">{pva.aT?tibNum(pva.aT):'—'}</td>
              <td className="r"><span className="tib-d" style={{color:tibDevCol(pva.d)}}>{tibPct(pva.d)}</span></td></tr></tfoot>
          </table></div>}
      </div>

      {/* ---- Week-to-week trend ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Yük Trendi','Load Trend')}</div>
            <div className="tib-cs">{L('Takım ortalaması 7 günlük yük, dört hafta','Squad mean 7-day load, four weeks')}</div></div>
          {trend.change!=null&&<span className="tib-d" style={{color:tibDevCol(Math.round(trend.change),10)}}>
            {trend.change>0?'+':''}{trend.change}%</span>}
        </div>
        {trend.cols.every(c=>!c.v)
          ?<div className="tib-none">{L('Son dört haftada yük yok.','No load in the last four weeks.')}</div>
          :<div className="tib-tr">
            <div className="cols">
              {trend.cols.map((c,i)=><div key={c.key} className={'c'+(i===3?' on':'')}>
                <span className="bar"><i style={{height:lit?`${Math.max(3,c.v/trend.max*100)}%`:'0%',transitionDelay:`${i*70}ms`}}/></span>
                <span className="v">{c.v?tibNum(c.v):'—'}</span>
                <span className="l">{c.label}</span>
                <span className="tib-d dd" style={{color:tibDevCol(c.d,10)}}>{c.d==null?'':tibPct(c.d)}</span>
              </div>)}
            </div>
            <div className="tib-legend">{trend.change==null
              ?L('Geçen haftayla karşılaştırmak için yeterli geçmiş yok.','Not enough history to compare with last week.')
              :L(`Geçen haftaya göre %${Math.abs(trend.change)} ${trend.change>0?'arttı':'azaldı'}.`,
                 `${trend.change>0?'Up':'Down'} ${Math.abs(trend.change)}% on last week.`)}</div>
          </div>}
      </div>

      </div>

      <div className="tib-col">
      {/* ---- Team sRPE table ---- */}
      <div className="tib-card" style={card()}>
        <div className="tib-chead">
          <div><div className="tib-ct">{L('Takım sRPE Tablosu','Team sRPE Table')}</div>
            <div className="tib-cs">{L('Haftanın toplam sRPE yükü, yüksekten aza','This week’s total sRPE load, highest to lowest')}</div></div>
          <span className="tib-tot">{tibNum(srpe.total)}<u>AU</u></span>
        </div>
        {srpe.n===0
          ?<div className="tib-none">{L('Bu hafta sıralanacak sporcu yükü yok.','No athlete load this week to rank.')}</div>
          :<>
            <div className="tib-sr">
            <table className="tib-tbl">
              <thead><tr><th className="rk">#</th><th>{L('Sporcu','Athlete')}</th>
                <th className="r">sRPE</th><th className="r">Δ</th></tr></thead>
              <tbody>{srpe.rows.map((r,i)=><tr key={r.a.id}>
                <td className="rk">{i+1}</td>
                <td className="d">{r.a.name||'—'}</td>
                <td className="r ac">{r.load?tibNum(r.load):'—'}
                  <span className="tib-mini"><i className="a" style={{...grow(r.load/srpe.max*100),background:tibDevCol(r.d,15)}}/></span></td>
                <td className="r"><span className="tib-d" style={{color:tibDevCol(r.d,15)}}>
                  {r.load?tibPct(r.d):L('yük yok','no load')}</span></td>
              </tr>)}</tbody>
            </table>
            </div>
            {/* Outside the scroller, so the reading of the table stays pinned to the
                bottom of the card instead of scrolling away with the last athlete. */}
            <div className="tib-legend">{L(`Takım ortalaması ${tibNum(srpe.mean)} AU · ${srpe.n} sporcu · AU = sRPE × dakika`,
              `Squad mean ${tibNum(srpe.mean)} AU · ${srpe.n} athletes · AU = sRPE × minutes`)}</div>
          </>}
      </div>
      </div>
    </div>
    {!hasWeek&&roster.length===0&&<div className="tib-none">
      {L('Kadroyu ekle ve haftayı planla — pano yukarıdaki takvimden kendini doldurur.',
         'Add the roster and plan a week — the board fills itself from the calendar above.')}</div>}
  </section>);
}

