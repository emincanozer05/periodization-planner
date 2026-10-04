/* Open the print dialog for a freshly written popup, but only once its images
   have settled. Photos live in cloud storage (Firebase / Drive), so right after
   document.close() they are still downloading — printing on a fixed delay leaves
   blank boxes in the output. `settle` lets the document lay out first, `safety`
   caps the wait so one stalled photo can never withhold the dialog. */
/* `before` runs once, in the opened window, after its images have settled and
   immediately before the print dialog — the only moment a sheet can measure
   itself against the paper it is about to go onto. It must never stop the
   print: a sheet that prints unfitted still prints. */
function printWhenImagesReady(w,{settle=350,safety=5000,before}={}){
  let printed=false;
  const go=()=>{if(printed)return;printed=true;
    if(before){try{before(w);}catch(e){console.warn('fit failed',e);}}
    try{w.focus();w.print();}catch(e){console.warn('print failed',e);}};
  setTimeout(()=>{
    const pending=[...w.document.images].filter(i=>!i.complete);
    if(!pending.length){go();return;}
    let left=pending.length;const one=()=>{if(--left<=0)go();};
    pending.forEach(i=>{i.addEventListener('load',one);i.addEventListener('error',one);});
    setTimeout(go,safety);
  },settle);
}

function printDayA4(title,subtitle,sessions,opts){
  const w=window.open('','_blank','width=900,height=1100');if(!w)return;
  w.document.write(buildSessionHTMLDoc(title,subtitle,sessions,opts));
  w.document.close();
  printWhenImagesReady(w);
}

/* THE WEEK AS A MESSAGE. The A4 printout is a page to hand over in person; what a coach
   actually sends the staff on a Sunday night is a few lines they can read on a phone
   without opening anything. Same week, same numbers, written as text: a day per line,
   its sessions under it with the time, the title and how long, and the week's totals at
   the foot. A rest day says so rather than going missing — "no line for Wednesday" and
   "nothing on Wednesday" have to be different things to read. */
function weekShareText(title,weekStart,days,athletes){
  const dates=Array.from({length:7},(_,i)=>fmt(addD(parseD(weekStart),i)));
  const teamDaily=teamDailyLoadMap(days,athletes);
  const out=[];
  const range=`${fd(dates[0])} – ${fd(dates[6])}`;
  out.push(`${title||''} · ${range}`.trim());
  out.push('');
  let nSes=0;
  dates.forEach((d,i)=>{
    const ses=(days[d]&&days[d].sessions)||[];
    const au=Math.round(Number(teamDaily[d])||0);
    const head=`${dnL(i)} ${fd(d).slice(0,5)}`;
    if(!ses.length){out.push(`${head} — ${L('dinlenme','rest')}`);return;}
    nSes+=ses.length;
    out.push(`${head}${au>0?` · ${au} AU`:''}`);
    ses.forEach(x=>{
      const blocks=[...new Set((x.blocks||[]).map(b=>blkSesName(x,b)).filter(Boolean))]
        .filter(n=>n!==(x.name||''));
      const dur=Number(x.duration)||0;
      out.push(`  • ${x.time||''} ${x.name||L('Antrenman','Session')}${dur?` (${dur}${L('dk','min')})`:''}`
        +(blocks.length?` — ${blocks.join(', ')}`:''));
    });
  });
  const wk=teamWeekMono(days,athletes,weekStart);
  const total=dates.reduce((a,d)=>a+(Number(teamDaily[d])||0),0);
  out.push('');
  out.push(`${L('Toplam','Total')}: ${nSes} ${L('antrenman','sessions')} · ${Math.round(total)} AU`
    +(wk&&wk.monotony?` · ${L('monotonluk','monotony')} ${wk.monotony.toFixed(2)}`:''));
  return out.join('\n');
}
/* The weekly sheet as a document, apart from the window it is printed in. The printout
   and the image the Share panel shows are the SAME page by construction: one builder,
   one layout, and nothing to drift out of step the next time the sheet is edited. */
function buildWeekHTMLDoc(title,weekStart,days,athletes,opts){
  const dates=Array.from({length:7},(_,i)=>fmt(addD(parseD(weekStart),i)));
  /* Per-day AU loads (Mon..Sun) — through teamDailyLoadMap, the same helper the
     calendar and Load Monitoring read. A day whose sessions carry no session-level
     sRPE (typical when several blocks share a day and the athletes log their own
     RPE instead) used to print "Toplam: 0 AU"; the helper falls back to the
     athletes' logged load for exactly those days. */
  const teamDaily=teamDailyLoadMap(days,athletes);
  const dayLoads=dates.map(d=>Number(teamDaily[d])||0);
  const totalLoad=dayLoads.reduce((a,b)=>a+b,0);
  const totalSessions=dates.reduce((a,d)=>a+(days[d]?.sessions||[]).length,0);
  // Daily team load = SUM of that day's session AU boxes — exactly what the calendar shows and
  // the on-screen Training Load tab now uses (e.g. 420 + 455 = 875), not a per-athlete average.
  const rDay=dayLoads.map(v=>Math.round(v||0));
  const rTotal=rDay.reduce((a,b)=>a+b,0);
  /* Foster monotony — from teamWeekMono, the same helper the calendar's chip and the
     Load Monitoring card read, so all three report one number for a week. This used to
     recompute mean/SD over the TEAM's daily totals, which is a different statistic:
     collapsing the roster into one curve first smooths away the very day-to-day
     variation monotony measures, and it printed 1.51 where the calendar said 1.29.
     mean/SD/strain come from the helper too, so the printed "Mean / SD" still divides
     out to the printed monotony. */
  const wkMono=teamWeekMono(days,athletes,weekStart);
  const meanLoad=wkMono.mean,sd=wkMono.sd,monotony=wkMono.monotony,strain=wkMono.strain;
  // The bar chart plots the TEAM's daily totals, so its mean line stays a team mean.
  const chartMean=rTotal/7;
  const maxLoad=Math.max(...rDay,1);
  // Build SVG bar chart
  /* The chart reads like a chart rather than seven floating blocks: a left gutter with a
     scale on it, gridlines the bars are measured against, and the squad mean as a labelled
     line across them. The scale tops out at a round number above the heaviest day, so the
     ticks are numbers a coach recognises (300, 600, 900) rather than the day's own total. */
  const cBarW=58,cGap=10,cPad=26,cBottomLbl=20,cGut=40,cH=178;
  const cUsableH=cH-cPad-cBottomLbl;
  const cPlotW=7*cBarW+6*cGap;
  const cTotalW=cGut+cPlotW;
  const niceStep=v=>{const raw=v/4;const p10=Math.pow(10,Math.floor(Math.log10(Math.max(1,raw))));
    const n=raw/p10;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p10;};
  const step=niceStep(maxLoad);
  const axMax=Math.max(step,Math.ceil(maxLoad/step)*step);
  const yOf=v=>cPad+cUsableH-(axMax>0?(v/axMax)*cUsableH:0);
  const ticks=[];for(let v=0;v<=axMax+.001;v+=step)ticks.push(v);
  const grid=ticks.map(v=>`<line x1="${cGut}" y1="${yOf(v)}" x2="${cTotalW}" y2="${yOf(v)}" stroke="#e5e7eb" stroke-width="1"/><text x="${cGut-8}" y="${yOf(v)+3.5}" text-anchor="end" font-size="9" fill="#8b9099" font-family="'IBM Plex Mono',monospace">${Math.round(v)}</text>`).join('');
  const bars=rDay.map((load,i)=>{
    const h=Math.max(yOf(0)-yOf(load),0);
    const x=cGut+i*(cBarW+cGap);const y=yOf(load);
    return`<rect x="${x}" y="${y}" width="${cBarW}" height="${h||0}" fill="#9aab3a" rx="4" ry="4"/><text x="${x+cBarW/2}" y="${y-6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0a0b0d">${Math.round(load)}</text><text x="${x+cBarW/2}" y="${cH-4}" text-anchor="middle" font-size="10" font-weight="600" fill="#5c626c" font-family="'IBM Plex Mono',monospace">${dnL(i)}</text>`;
  }).join('');
  const meanY=chartMean>0?yOf(chartMean):0;
  const meanTx=`${L('Ort.','Mean')} ${Math.round(chartMean)} AU`;
  const meanW=meanTx.length*5.6+14;
  const meanLine=chartMean>0?`<line x1="${cGut}" y1="${meanY}" x2="${cTotalW}" y2="${meanY}" stroke="#334155" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.8"/><rect x="${cTotalW-meanW}" y="${meanY-9.5}" width="${meanW}" height="17" rx="5" fill="#f4f5f7" stroke="#cbd5e1" stroke-width="1"/><text x="${cTotalW-meanW/2}" y="${meanY+2.5}" text-anchor="middle" font-size="9" fill="#3b4252" font-weight="700" font-family="'IBM Plex Mono',monospace">${meanTx}</text>`:'';
  const chartSvg=`<svg viewBox="0 0 ${cTotalW} ${cH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-height:190px">${grid}${bars}${meanLine}</svg>`;
  // Monotony flag
  const mF=!monotony?{c:'#8b9099',t:'—'}:monotony>2?{c:'#ff6b5b',t:L('YÜKSEK','HIGH')}:monotony>=1.5?{c:'#f59e0b',t:L('İZLE','WATCH')}:monotony>=1?{c:'#9aab3a',t:L('NORMAL','NORMAL')}:{c:'#5b8cff',t:L('DÜŞÜK','LOW')};
  const monoSay=!monotony?L('Bu hafta için yük verisi yok.','No load recorded for this week.')
    :monotony>2?L('Günler birbirine fazla benziyor — aşırı yüklenme riski.','The days look too alike — overtraining risk.')
    :monotony>=1.5?L('Varyasyon daralıyor — haftayı yakından izle.','Variation is narrowing — watch the week closely.')
    :L('Antrenman yükü bu hafta sağlıklı varyasyon gösteriyor.','Training load shows healthy variation this week.');
  const monotonyBlock=rTotal>0?`<div class="mono-row">
    <div class="mono-chart">
      <div class="mono-h">${L('Haftalık Yük Dağılımı','Weekly Load Distribution')} <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--dim)">· ${L('gerçekleşen yük','realized load')} (AU)</span></div>
      ${chartSvg}
    </div>
    <div class="mono-side">
      <div class="mono-stats">
        <div class="stat"><div class="stat-l">${L('Toplam Yük','Total Load')}</div><div class="stat-v">${Math.round(rTotal)}<span class="stat-u">AU</span></div></div>
        <div class="stat"><div class="stat-l">${L('Ort./sporcu','Mean/ath.')}</div><div class="stat-v">${Math.round(meanLoad)}<span class="stat-u">AU</span></div></div>
        <div class="stat"><div class="stat-l">${L('SS/sporcu','SD/ath.')}</div><div class="stat-v">${sd.toFixed(1)}</div></div>
      </div>
      <div class="mono-big" style="border-color:${mF.c}55;background:${mF.c}12">
        <div class="mono-big-in">
          <div class="mono-big-l">${L('MONOTONİ','MONOTONY')}</div>
          <div class="mono-big-v" style="color:${mF.c}">${monotony.toFixed(2)}</div>
          <span class="mono-big-t" style="background:${mF.c}">${mF.t}</span>
        </div>
        <div class="mono-big-s">${monoSay}<br><span>${L('Zorlanma','Strain')}: <strong>${Math.round(strain)}</strong></span></div>
      </div>
      <div class="mono-help">
        <div class="mono-help-h">${L('Foster Monotonisi = Ortalama / SS','Foster Monotony = Mean / SD')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#10b981"></span><strong>&lt; 1.5</strong> — ${L('Sağlıklı varyasyon','Healthy variation')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#f59e0b"></span><strong>1.5–2.0</strong> — ${L('Yakın takip','Monitor closely')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#ef4444"></span><strong>&gt; 2.0</strong> — ${L('Aşırı (aşırı yüklenme riski)','Excessive (overtraining risk)')}</div>
        <div class="mono-help-line tr-note">${L('Her sporcunun kendi haftası hesaplanıp takım geneline ortalanır — takvimde görünen değerin aynısı.','Each athlete\'s own week, averaged across the squad — the same value the calendar shows.')}</div>
      </div>
    </div>
  </div>`:'';
  // Athletes table (only when athletes provided and have data this week)
  let athleteBlock='';
  if(Array.isArray(athletes)&&athletes.length>0){
    const wkStart=dates[0],wkEnd=dates[6];
    const rows=athletes.map(a=>{
      let aLoad=0,aSess=0,rSum=0,rCnt=0;
      // Pull from athlete's personal srpeLog (Notion-synced or manual entries on profile)
      (a.srpeLog||[]).forEach(e=>{
        if(!e.date||e.date<wkStart||e.date>wkEnd)return;
        // Total AU = sum of TP + S&C + Game session loads for that day
        const tp=Number(e.tpLoad)||0,sc=Number(e.scLoad)||0,gm=Number(e.gameLoad)||0;
        aLoad+=(Number(e.totalLoad)||(tp+sc+gm));
        // Count each non-empty sub-session as one
        [e.tpRPE,e.scRPE,e.gameRPE].forEach(r=>{const n=Number(r);if(n>0){rSum+=n;rCnt++;aSess++;}});
      });
      return{name:a.name,total:aLoad,sess:aSess,meanRPE:rCnt?(rSum/rCnt):0,number:a.number};
    }).filter(r=>r.sess>0).sort((a,b)=>b.total-a.total);
    if(rows.length>0){
      const maxAthLoad=Math.max(...rows.map(r=>r.total),1);
      athleteBlock=`<div class="ath-tbl-wrap">
        <div class="ath-tbl-h">${L('Sporcu Bazında Haftalık sRPE ve Yük','Athlete Weekly sRPE & Load Totals')}</div>
        <table class="ath-tbl"><thead><tr><th style="text-align:left;padding-left:10px">Athlete</th><th>#</th><th>Sessions</th><th>Mean sRPE</th><th>Total Load (AU)</th><th style="width:25%">Distribution</th></tr></thead><tbody>
          ${rows.map(r=>`<tr>
            <td style="text-align:left;font-weight:700;padding-left:10px">${r.name}</td>
            <td>${r.number||'—'}</td>
            <td>${r.sess}</td>
            <td><span class="srpe-cell">${r.meanRPE.toFixed(1)}</span></td>
            <td><strong style="color:#6f7d29">${Math.round(r.total)}</strong></td>
            <td><div class="load-bar-wrap"><div class="load-bar" style="width:${Math.round(r.total/maxAthLoad*100)}%"></div></div></td>
          </tr>`).join('')}
        </tbody></table>
      </div>`;
    }
  }
  // Color per session purpose — the frame round the whole session card, as on the calendar
  const colorOf=printSesColor;
  const labelsFor=exs=>{const c={};return exs.map(ex=>{
    const ss=(ex.superset||'').toString().toUpperCase().trim();
    if(ss){c[ss]=(c[ss]||0)+1;return{tag:ss+c[ss],ss};}
    c._=(c._||0)+1;return{tag:c._+'.',ss:''};});};
  const renderEx=(e,lab)=>`<div class="ex"><span class="ex-no${lab.ss?' ss':''}">${lab.tag}</span><span class="exn">${e.name||''}</span>${(e.sets||e.reps)?`<span class="exr">${e.sets||''}×${e.reps||''}</span>`:''}${e.rpe?`<span class="exl">RPE ${e.rpe}</span>`:''}${e.load?`<span class="exl">@${e.load}</span>`:''}${e.duration?`<span class="exd">${e.duration}</span>`:''}${e.tempo?`<span class="ext">t:${e.tempo}</span>`:''}${e.rest?`<span class="exrr">r:${e.rest}</span>`:''}${exDesc(e)?`<div class="exdesc">${exDesc(e)}</div>`:''}</div>`;
  const renderDay=(date,i)=>{const day=days[date];const ss=day?.sessions||[];const isWeekend=i>=5;
    const dayLoad=rDay[i];   // realized team load for the day (matches chart + monotony)
    return`<td class="day-cell${isWeekend?' weekend':''}">
      <div class="day-head">
        <div class="day-name">${dnL(i)}</div>
        <div class="day-date">${fd(date).slice(0,5)}</div>
      </div>
      ${ss.length===0?`<div class="rest-box">
          <div class="rest-tag">${L('DİNLENME','REST')}</div>
        </div>`:
        /* Only what, when and how long — no RPE (target or logged sRPE) and no goal line. */
        ss.map(s=>{const c=colorOf(s);
          return`<div class="sess" style="border-color:${c}">
          <div class="sess-h"><span class="sess-name">${s.name}</span></div>
          <div class="sess-meta"><span class="sess-time">${s.time}</span><span class="sess-sep"></span><span class="sess-dur">${Number(s.duration)||0} ${L('dk','min')}</span></div>
        </div>`;}).join('')}
      ${ss.length>0?`<div class="day-total"><u>${L('Toplam Yük','Total Load')}</u><b>${Math.round(dayLoad)} AU</b></div>`:''}
      ${day?.dailyNotes?`<div class="day-notes"><em>${day.dailyNotes}</em></div>`:''}
    </td>`;};
  /* The club signs the sheet: a plan that leaves the app on WhatsApp is read next to
     four other clubs' plans, and a crest is how it is told apart at a glance. */
  // The caller may hand in its own crest (the PNG builder passes one it has made drawable).
  const rawCrest=(opts&&opts.logo!==undefined)?opts.logo:teamLogo();
  const crest=hasMedia(rawCrest)?escHTML(mediaSrc(rawCrest)):'';
  const club=escHTML(clubNameNow());
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${L('Haftalık Plan','Weekly Plan')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:6mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{height:100%}
:root{--accent:#9aab3a;--bg:#ffffff;--bg2:#f4f5f7;--panel:#ffffff;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
/* The sheet is a picture as often as it is a page, and a picture that runs edge to edge
   reads as a screenshot of something cut off. The page padding is the white frame around
   it — the same on all four sides — and it is what the shared PNG is captured with. */
body{font-family:'Space Grotesk',Arial,sans-serif;font-size:10px;color:var(--text);line-height:1.4;background:#fff;display:flex;flex-direction:column;padding:16px 18px}
.fit{display:flex;flex-direction:column}
.mono{font-family:'IBM Plex Mono',monospace}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:11px;padding:13px 18px;background:#0a0b0d;color:#fff;border-radius:14px;flex:none}
.hdr-l{min-width:0;display:flex;align-items:center;gap:14px}
/* The app's own mark, small, before the team's title — the crest on the right is the club's. */
.hdr-logo{height:18px;width:auto;flex:none;display:block}
.hdr-tx{min-width:0}
.hdr h1{font-size:20px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.hdr .sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;opacity:.66;margin-top:4px;letter-spacing:.02em}
.hdr-r{display:flex;align-items:center;gap:10px;flex:none}
.hstat{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:7px 12px}
.hstat-l{font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,.62);font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.hstat-v{background:var(--accent);color:#0a0b0d;padding:3px 10px;border-radius:7px;font-weight:700;font-size:11.5px;white-space:nowrap}
.hdr-div{width:1px;align-self:stretch;background:rgba(255,255,255,.18);margin:0 2px}
.hdr-club{display:flex;align-items:center;gap:10px;max-width:190px}
.hdr-club img{height:34px;width:auto;max-width:56px;object-fit:contain}
.hdr-club span{font-size:12px;font-weight:700;letter-spacing:.02em;line-height:1.2;text-transform:uppercase}
table{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed}
.day-cell{vertical-align:top;background:#fff;border:1px solid var(--border);border-radius:12px;padding:0;width:14.28%;overflow:hidden}
.day-head{padding:9px 11px 5px;display:flex;justify-content:space-between;align-items:baseline}
.day-name{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)}
.day-date{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);font-weight:500}
/* A rest day is not an empty cell: it says what it is. */
.rest-box{padding:26px 10px 30px;text-align:center}
.rest-tag{color:var(--dim);font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.24em}
.sess{background:var(--bg2);border:3px solid var(--border2);border-radius:11px;padding:8px 10px;margin:5px;overflow:hidden}
.sess-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:5px}
.sess-name{font-weight:600;font-size:12.5px;color:var(--text);line-height:1.2;flex:1;word-wrap:break-word;letter-spacing:-.01em}
.sess-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)}
.sess-sep{width:1px;height:11px;background:var(--border2);flex:none}
.sess-time{font-size:13px;font-weight:700;color:var(--text);letter-spacing:.01em}
.sess-dur{font-size:10px;font-weight:600;color:var(--text2)}
.au-pill{background:var(--accent);color:#0a0b0d;padding:1px 7px;border-radius:4px;font-weight:600}
.blk{margin-top:6px}
.blk-h{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:9.5px;letter-spacing:.06em;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid var(--border)}
.ex{margin-bottom:3px;font-size:9.5px;line-height:1.4;padding-left:2px;color:var(--text)}
.exn{font-weight:500;color:var(--text)}
.ex-no{display:inline-block;min-width:20px;padding:1px 5px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;text-align:center;margin-right:5px;background:var(--bg2);color:var(--muted)}
.ex-no.ss{background:var(--accent);color:#0a0b0d}
.exr{margin-left:5px;color:var(--text);font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:9.5px}
.exl{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-weight:500}
.exd{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
.ext{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:8.5px}
.exrr{margin-left:4px;color:var(--dim);font-family:'IBM Plex Mono',monospace;font-size:8.5px}
.exdesc{font-size:8.5px;color:var(--dim);line-height:1.35;margin-top:2px;padding-left:4px}
.day-total{margin:5px;padding:7px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;text-align:left}
.day-total u{display:block;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}
.day-total b{display:block;font-size:13px;font-weight:700;color:var(--text);letter-spacing:-.01em;margin-top:2px}
.day-notes{margin:0 4px 4px;padding:4px 6px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;font-size:7px;color:var(--text2);line-height:1.3}
/* Monotony block */
.mono-row{display:flex;gap:12px;margin-top:11px;padding:15px;background:#fff;border:1px solid var(--border);border-radius:14px;page-break-inside:avoid;break-inside:avoid}
.mono-chart{flex:2.2;min-width:0}
.mono-h{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)}
.mono-side{flex:1.6;display:flex;flex-direction:column;gap:8px;min-width:0}
.mono-stats{display:flex;gap:7px}
.stat{flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:10px 11px;text-align:left}
.stat-l{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);text-transform:uppercase;letter-spacing:.09em;font-weight:500}
.stat-v{font-size:19px;font-weight:700;color:var(--text);margin-top:3px;line-height:1;letter-spacing:-.015em}
.stat-u{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);font-weight:500;margin-left:3px}
/* The verdict beside the number that produced it, tinted by the zone it lands in. */
.mono-big{display:flex;align-items:center;gap:14px;border:1px solid var(--border2);border-radius:11px;padding:11px 13px}
.mono-big-in{flex:none;text-align:center;min-width:76px}
.mono-big-l{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);font-weight:500;letter-spacing:.09em;text-transform:uppercase}
.mono-big-v{font-size:30px;font-weight:700;line-height:1;margin:2px 0 4px;color:var(--text);letter-spacing:-.02em}
.mono-big-t{display:inline-block;color:#0a0b0d;font-family:'IBM Plex Mono',monospace;font-size:8px;padding:3px 10px;border-radius:7px;font-weight:600;letter-spacing:.06em;background:var(--accent)}
.mono-big-s{font-size:10px;color:var(--text2);line-height:1.5}
.mono-big-s span{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)}
.mono-help{background:var(--bg2);border:1px solid var(--border);padding:8px 10px;border-radius:8px;font-size:9px;line-height:1.6;color:var(--text2)}
.mono-help-h{font-family:'IBM Plex Mono',monospace;font-weight:500;color:var(--text);margin-bottom:4px;font-size:9px;letter-spacing:.04em}
.mono-help-line{display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap}
.mono-help-line .dot{display:inline-block;width:8px;height:8px;border-radius:2px;flex-shrink:0}
.mono-help-line .tr{color:var(--dim);font-size:8px;margin-left:2px}
.mono-help-line.tr-note{display:block;color:var(--dim);font-size:8px;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid var(--border)}
/* Athletes table */
.ath-tbl-wrap{margin-top:12px;page-break-inside:avoid;break-inside:avoid}
.ath-tbl-h{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding-left:10px;border-left:3px solid var(--accent);line-height:1.5}
.ath-tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;table-layout:fixed}
.ath-tbl th{background:#0a0b0d;color:#fff;padding:7px 8px;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.08em;text-align:center;text-transform:uppercase}
.ath-tbl td{padding:6px 8px;font-size:10px;border-top:1px solid var(--border);background:#fff;text-align:center;color:var(--text)}
.ath-tbl tr:nth-child(even) td{background:var(--bg2)}
.srpe-cell{display:inline-block;background:#0a0b0d;color:#fff;padding:1px 8px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:9px}
.load-bar-wrap{background:var(--bg2);border:1px solid var(--border);height:10px;border-radius:5px;overflow:hidden;position:relative}
.load-bar{height:100%;background:var(--accent);border-radius:5px}
.footer{margin-top:10px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.06em}
</style></head><body>
<div class="fit">
<div class="hdr">
  <div class="hdr-l">
    <img class="hdr-logo" src="${COACHOS_LOGO}" alt="CoachOS">
    <span class="hdr-div"></span>
    <div class="hdr-tx">
      <h1>${title}</h1>
      <div class="sub">${L('Hafta','Week of')} ${fdL(weekStart)} — ${fdL(dates[6])}</div>
    </div>
  </div>
  <div class="hdr-r">
    <div class="hstat"><span class="hstat-l">${L('Seans','Sessions')}</span><span class="hstat-v">${totalSessions}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Toplam Yük','Total Load')}</span><span class="hstat-v">${Math.round(rTotal)} AU</span></div>
    ${club?`<span class="hdr-div"></span><div class="hdr-club">${crest?`<img src="${crest}" alt="">`:''}<span>${club}</span></div>`
      :(crest?`<span class="hdr-div"></span><div class="hdr-club"><img src="${crest}" alt=""></div>`:'')}
  </div>
</div>
<table>${dates.map(renderDay).join('')}</table>
${monotonyBlock}
</div>
</body></html>`;
  return html;
}
function printWeekA4Land(title,weekStart,days,athletes){
  const w=window.open('','_blank','width=1300,height=900');if(!w)return;
  w.document.write(buildWeekHTMLDoc(title,weekStart,days,athletes));w.document.close();
  printWhenImagesReady(w,{before:fitWeekToPage});
}

