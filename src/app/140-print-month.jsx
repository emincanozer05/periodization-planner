/* A session's colour on paper — the calendar's own rule: the card colour the coach
   picked wins, otherwise the load type's hue (the neuromuscular yellow a shade deeper so
   it still reads on white). Shared by the weekly and the monthly sheet. */
function printSesColor(s){
  if(s&&s.color)return cardCol(s.color);
  const t=((s&&s.loadType)||'').toLowerCase();
  if(t.includes('mechanical'))return'#0094ff';
  if(t.includes('metabolic'))return'#5b8cff';
  if(t.includes('neuromuscular'))return'#f59e0b';
  if(t.includes('cognitive'))return'#ff6b5b';
  return'#8b9099';
}

/* ═══ THE MONTH, BY QUALITY ═══
   Which qualities the month's sessions were written to train, week by week. A session
   counts once under every focus it carries (so a Strength + Power session is one
   Strength session and one Power session), and its minutes are shared out evenly among
   those focuses — so the minutes column adds up to the month's real training time
   while the session counts say how often each quality came round. Sub-focuses are
   tallied under the focus that owns them. A session with no recognised focus is kept
   in an "Other" row rather than dropped, so the table always accounts for every
   session on the calendar.
   Weeks are the calendar's own Monday–Sunday weeks, clipped to the month: the first
   and last may be short, and say so in their label. */
function monthFocusLoad(days,yr,mo){
  const first=new Date(yr,mo,1),dim=new Date(yr,mo+1,0).getDate();
  const weeks=[];
  for(let d=1;d<=dim;){
    const dt=new Date(yr,mo,d);const dow=(dt.getDay()+6)%7;
    const end=Math.min(dim,d+(6-dow));
    weeks.push({from:d,to:end});d=end+1;
  }
  const rowsBy={};const order=[...SESSION_FOCUS,'__other'];
  const row=id=>rowsBy[id]||(rowsBy[id]={id,weeks:weeks.map(()=>({n:0,min:0})),n:0,min:0,subs:{}});
  let sessions=0,minutes=0,trainDays=0;
  for(let d=1;d<=dim;d++){
    const ss=((days||{})[fmt(new Date(yr,mo,d))]||{}).sessions||[];
    if(ss.length)trainDays++;
    const wi=weeks.findIndex(w=>d>=w.from&&d<=w.to);
    ss.forEach(x=>{
      sessions++;
      const dur=Math.max(0,Number(x.duration)||0);minutes+=dur;
      const fs=sesFocus(x);const ids=fs.length?fs:['__other'];
      ids.forEach(id=>{const r=row(id);r.n++;r.min+=dur/ids.length;r.weeks[wi].n++;r.weeks[wi].min+=dur/ids.length;});
      sesSubFocus(x).forEach(sub=>{const own=SUBFOCUS_OWNER[sub];if(!own||!rowsBy[own])return;
        rowsBy[own].subs[sub]=(rowsBy[own].subs[sub]||0)+1;});
    });
  }
  const rows=order.filter(id=>rowsBy[id]).map(id=>{const r=rowsBy[id];return{
    ...r,min:Math.round(r.min),weeks:r.weeks.map(w=>({n:w.n,min:Math.round(w.min)})),
    share:minutes>0?r.min/minutes:(sessions>0?r.n/sessions:0),
    subs:Object.entries(r.subs).sort((a,b)=>b[1]-a[1])};});
  return{weeks,rows,sessions,minutes,trainDays,restDays:dim-trainDays,days:dim,first:fmt(first)};
}
const focusColor=id=>(FOCUS_BY[id]&&FOCUS_BY[id].c)||'#8b9099';
const focusName=id=>id==='__other'?L('Diğer / belirtilmemiş','Other / unspecified'):focusLabel(id);
/* Minutes as the coach says them: "4 sa 30 dk", "45 dk". */
const fmtMin=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;
  return h?`${h} ${L('sa','h')}${r?` ${r} ${L('dk','min')}`:''}`:`${r} ${L('dk','min')}`;};

/* The month on paper: the calendar grid on the first A4 landscape page, the loading
   table on the second. The same header the weekly sheet wears — CoachOS on the left,
   the club on the right — so the two read as one set. */
function buildMonthHTMLDoc(title,yr,mo,days){
  const ML=REPORT_LANG==='tr'?MN_TR:MN_EN;
  const monthName=`${ML[mo]} ${yr}`;
  const F=monthFocusLoad(days,yr,mo);
  const first=new Date(yr,mo,1),off=(first.getDay()+6)%7;
  const cells=[];for(let i=0;i<off;i++)cells.push(null);
  for(let d=1;d<=F.days;d++)cells.push(d);
  while(cells.length%7)cells.push(null);
  const MAX_IN_CELL=4;
  const cellHTML=d=>{
    if(d==null)return`<td class="mc out"></td>`;
    const dt=new Date(yr,mo,d);const k=fmt(dt);const ss=((days||{})[k]||{}).sessions||[];
    const wk=(dt.getDay()+6)%7>=5;
    const items=ss.slice(0,MAX_IN_CELL).map(x=>`<div class="ms" style="border-color:${printSesColor(x)}">
      <span class="ms-n">${escHTML(x.name||L('Seans','Session'))}</span>
      <span class="ms-t">${escHTML(x.time||'')}${x.time&&Number(x.duration)?' · ':''}${Number(x.duration)?`${Number(x.duration)}′`:''}</span></div>`).join('');
    const more=ss.length>MAX_IN_CELL?`<div class="ms-more">+${ss.length-MAX_IN_CELL} ${L('seans daha','more')}</div>`:'';
    return`<td class="mc${wk?' wk':''}${ss.length?'':' rest'}"><div class="mc-d">${d}</div>${items}${more}${ss.length?'':`<div class="mc-rest">${L('DİNLENME','REST')}</div>`}</td>`;
  };
  const rowsHTML=[];for(let i=0;i<cells.length;i+=7)rowsHTML.push(`<tr>${cells.slice(i,i+7).map(cellHTML).join('')}</tr>`);
  const wkLbl=w=>w.from===w.to?`${w.from}`:`${w.from}–${w.to}`;
  const maxShare=Math.max(...F.rows.map(r=>r.share),0.0001);
  const tableRows=F.rows.map(r=>{const c=focusColor(r.id);return`<tr>
      <td class="q"><span class="qd" style="background:${c}"></span><b>${escHTML(focusName(r.id))}</b>
        ${r.subs.length?`<div class="subs">${r.subs.map(([n,k])=>`<span>${escHTML(n)}${k>1?` <i>×${k}</i>`:''}</span>`).join('')}</div>`:''}</td>
      ${r.weeks.map(w=>w.n?`<td class="wc on" style="background:${c}14"><b>${w.n}</b><small>${w.min?fmtMin(w.min):'—'}</small></td>`:`<td class="wc">·</td>`).join('')}
      <td class="tot"><b>${r.n}</b></td>
      <td class="tot">${fmtMin(r.min)}</td>
      <td class="shr"><div class="bar"><i style="width:${Math.round(r.share/maxShare*100)}%;background:${c}"></i></div><span>${Math.round(r.share*100)}%</span></td>
    </tr>`;}).join('');
  const wkTotals=F.weeks.map((w,i)=>{
    let n=0,min=0;for(let d=w.from;d<=w.to;d++){const ss=((days||{})[fmt(new Date(yr,mo,d))]||{}).sessions||[];n+=ss.length;ss.forEach(x=>{min+=Math.max(0,Number(x.duration)||0);});}
    return`<td class="wc"><b>${n}</b><small>${fmtMin(min)}</small></td>`;}).join('');
  const crest=hasMedia(teamLogo())?escHTML(mediaSrc(teamLogo())):'';
  const club=escHTML(clubNameNow());
  const hdr=sub=>`<div class="hdr">
  <div class="hdr-l"><img class="hdr-logo" src="${COACHOS_LOGO}" alt="CoachOS"><span class="hdr-div"></span>
    <div class="hdr-tx"><h1>${escHTML(title)}</h1><div class="sub">${sub}</div></div></div>
  <div class="hdr-r">
    <div class="hstat"><span class="hstat-l">${L('Seans','Sessions')}</span><span class="hstat-v">${F.sessions}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Antrenman günü','Training days')}</span><span class="hstat-v">${F.trainDays}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Süre','Time')}</span><span class="hstat-v">${fmtMin(F.minutes)}</span></div>
    ${club||crest?`<span class="hdr-div"></span><div class="hdr-club">${crest?`<img src="${crest}" alt="">`:''}${club?`<span>${club}</span>`:''}</div>`:''}
  </div></div>`;
  const dn=Array.from({length:7},(_,i)=>`<th>${dnL(i)}</th>`).join('');
  return`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHTML(title)} — ${monthName}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:6mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--accent:#9aab3a;--bg2:#f4f5f7;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;font-size:10px;color:var(--text);line-height:1.35;background:#fff;padding:14px 16px}
.pg{break-after:page;page-break-after:always}
.pg:last-child{break-after:auto;page-break-after:auto}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px;padding:12px 18px;background:#0a0b0d;color:#fff;border-radius:14px}
.hdr-l{min-width:0;display:flex;align-items:center;gap:14px}
.hdr-logo{height:18px;width:auto;flex:none;display:block}
.hdr h1{font-size:19px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.hdr .sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;opacity:.66;margin-top:4px}
.hdr-r{display:flex;align-items:center;gap:9px;flex:none}
.hstat{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:6px 11px}
.hstat-l{font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,.62);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase}
.hstat-v{background:var(--accent);color:#0a0b0d;padding:3px 9px;border-radius:7px;font-weight:700;font-size:11px;white-space:nowrap}
.hdr-div{width:1px;align-self:stretch;background:rgba(255,255,255,.18);margin:0 2px}
.hdr-club{display:flex;align-items:center;gap:10px;max-width:190px}
.hdr-club img{height:34px;width:34px;object-fit:contain}
.hdr-club span{font-size:12px;font-weight:700;letter-spacing:.02em;line-height:1.2;text-transform:uppercase}
/* The grid */
.cal{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed}
.cal th{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:left;padding:0 8px 2px}
.mc{vertical-align:top;border:1px solid var(--border);border-radius:10px;padding:6px 6px 7px;height:80px;background:#fff}
.mc.wk{background:#fafbfc}
.mc.out{border:none;background:none}
.mc-d{font-size:12px;font-weight:700;margin:0 2px 4px}
.ms{border:2px solid var(--border2);border-radius:7px;padding:3px 6px;margin-top:3px;background:var(--bg2)}
.ms-n{display:block;font-size:9.5px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-t{display:block;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted);margin-top:1px}
.ms-more{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);margin:3px 2px 0}
.mc-rest{font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.2em;color:var(--dim);text-align:center;margin-top:18px}
/* The loading table */
.lt-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:4px 2px 9px}
.lt-h h2{font-size:15px;font-weight:700;letter-spacing:-.01em}
.lt-h p{font-size:9.5px;color:var(--muted);max-width:560px;text-align:right}
.lt{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;table-layout:fixed}
.lt th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:8px 6px;text-align:center}
.lt th.q{text-align:left;padding-left:12px;width:30%}
.lt th small{display:block;opacity:.6;font-size:8px;letter-spacing:.02em;text-transform:none;margin-top:2px}
.lt td{border-top:1px solid var(--border);padding:7px 6px;text-align:center;vertical-align:middle}
.lt td.q{text-align:left;padding-left:12px}
.lt td.q b{font-size:11px}
.qd{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:0}
.subs{display:flex;flex-wrap:wrap;gap:3px 5px;margin:4px 0 0 16px}
.subs span{font-size:8.5px;color:var(--text2);background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:1px 5px}
.subs i{font-style:normal;color:var(--dim);font-family:'IBM Plex Mono',monospace}
.wc{color:var(--dim)}
.wc b{display:block;font-size:12px;color:var(--text)}
.wc small{display:block;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted)}
.tot{font-size:10.5px;white-space:nowrap}
.tot b{font-size:12px}
.shr{white-space:nowrap}
.shr .bar{display:inline-block;width:62%;height:7px;border-radius:4px;background:var(--bg2);border:1px solid var(--border);overflow:hidden;vertical-align:middle}
.shr .bar i{display:block;height:100%;border-radius:4px}
.shr span{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;margin-left:6px;vertical-align:middle}
.lt tr.sum td{background:var(--bg2);font-weight:600}
.lt-none{border:1px dashed var(--border2);border-radius:12px;padding:30px;text-align:center;color:var(--muted);font-size:11px}
.lt-foot{margin-top:8px;font-size:8.5px;color:var(--dim);line-height:1.5}
</style></head><body>
<section class="pg fit">
${hdr(`${monthName} · ${L('Aylık plan','Monthly plan')}`)}
<table class="cal"><thead><tr>${dn}</tr></thead><tbody>${rowsHTML.join('')}</tbody></table>
</section>
<section class="pg fit">
${hdr(`${monthName} · ${L('Özelliklere göre yüklenme','Loading by quality')}`)}
<div class="lt-h"><h2>${L('Ay boyunca yüklenilen özellikler','Qualities loaded across the month')}</h2>
  <p>${L('Her hücre: o hafta o özelliğe ayrılan seans sayısı ve süresi. Birden fazla hedefi olan seans her hedefte bir kez sayılır; süresi hedefler arasında eşit paylaştırılır.',
    'Each cell: sessions given to that quality that week, and their time. A session with several goals counts once under each; its time is split evenly between them.')}</p></div>
${F.rows.length?`<table class="lt"><thead><tr><th class="q">${L('Özellik','Quality')}</th>
  ${F.weeks.map((w,i)=>`<th>${L('Hafta','Week')} ${i+1}<small>${wkLbl(w)} ${ML[mo].slice(0,3)}</small></th>`).join('')}
  <th>${L('Seans','Sessions')}</th><th>${L('Süre','Time')}</th><th style="width:15%">${L('Pay','Share')}</th></tr></thead>
  <tbody>${tableRows}
  <tr class="sum"><td class="q"><b>${L('Toplam','Total')}</b></td>${wkTotals}<td class="tot"><b>${F.sessions}</b></td><td class="tot">${fmtMin(F.minutes)}</td><td class="shr"></td></tr>
  </tbody></table>`:`<div class="lt-none">${L('Bu ay takvimde seans yok.','No sessions on the calendar this month.')}</div>`}
<div class="lt-foot">${L(`Antrenman günü ${F.trainDays} · Dinlenme günü ${F.restDays} · Pay, süreye göre (süre girilmemişse seans sayısına göre) hesaplanır.`,
  `Training days ${F.trainDays} · Rest days ${F.restDays} · Share is by time (by session count when no time was entered).`)}</div>
</section>
</body></html>`;
}
/* Each page of the monthly sheet is fitted to the paper on its own — a busy month grows
   the grid, and it must shrink rather than spill onto the table's page. The body's own
   padding sits on the paper too, so it comes off the height a page may take, with a few
   pixels to spare for rounding. */
function fitPagesToPaper(w){
  const doc=w.document,body=doc.body,prevW=body.style.width;
  const cs=w.getComputedStyle(body);
  const maxH=RPT_WK_PAGE_H-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-6;
  body.style.width=RPT_WK_PAGE_W;
  try{doc.querySelectorAll('.fit').forEach(box=>{
    let k=1;
    for(let i=0;i<4;i++){
      const h=box.getBoundingClientRect().height;
      if(h<=maxH)break;
      k=Math.max(RPT_WK_FIT_MIN,k*(maxH/h));
      box.style.zoom=k;
      if(k<=RPT_WK_FIT_MIN)break;
    }});
  }finally{body.style.width=prevW;}
}
function printMonthA4Land(title,yr,mo,days){
  const w=window.open('','_blank','width=1300,height=900');if(!w)return;
  w.document.write(buildMonthHTMLDoc(title,yr,mo,days));w.document.close();
  printWhenImagesReady(w,{before:fitPagesToPaper});
}

