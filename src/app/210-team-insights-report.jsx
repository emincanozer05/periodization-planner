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

