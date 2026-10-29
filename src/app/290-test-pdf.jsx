/* =========================================================
   TEST PDF GENERATOR — A4 portrait single-test report
   Uses the browser's native print-to-PDF (window.open + window.print)
   instead of jsPDF. This guarantees full Unicode/Turkish character
   support and renders all photos at their native high resolution.
   User selects "Save as PDF" in the print dialog (or sends to printer).
   ========================================================= */
function printBodyComp(ath,setup){
  const w=window.open('','_blank','width=1100,height=900');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const sorted=[...(ath.measurements||[])].filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(sorted.length===0){alert(L('Ölçüm yok','No measurements'));w.close();return;}
  const cur=sorted[sorted.length-1],prev=sorted.length>1?sorted[sorted.length-2]:null;
  const d=(a,b,k)=>{const v1=Number(a?.[k]),v2=Number(b?.[k]);if(!a||!b||isNaN(v1)||isNaN(v2))return null;return+(v1-v2).toFixed(1);};
  const w_=cur?Number(cur.weight)||null:null,bf=cur?Number(cur.bodyFat)||null:null,ws=cur?Number(cur.wingspan)||null:null,h_=cur?Number(cur.height)||null:null;
  const dw=d(cur,prev,'weight'),dbf=d(cur,prev,'bodyFat'),dws=d(cur,prev,'wingspan'),dh=d(cur,prev,'height');
  const fmtD=v=>v==null?'—':(v>0?`+${v}`:`${v}`);
  // SVG line chart helper (area fill + points + labels)
  const lineChart=(field,color)=>{
    const data=sorted.map(m=>{const raw=m[field];if(raw===''||raw==null)return null;const v=Number(raw);return(isNaN(v)||v===0)?null:v;});
    const valid=data.map((v,i)=>({v,i})).filter(p=>p.v!=null);
    if(valid.length===0)return`<div class="empty">${L('Veri yok','No data')}</div>`;
    const cw=420,ch=160,padX=28,padT=38,padB=30;
    const mn=Math.min(...valid.map(p=>p.v)),mx=Math.max(...valid.map(p=>p.v));
    const range=mx-mn||1;const pad=range*.2;const yMin=mn-pad,yMax=mx+pad;
    const X=i=>padX+(i/Math.max(1,data.length-1))*(cw-2*padX);
    const Y=v=>padT+(1-(v-yMin)/(yMax-yMin))*(ch-padT-padB);
    const xs=valid.map(p=>X(p.i)),ys=valid.map(p=>Y(p.v));
    const pts=xs.map((x,i)=>`${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const baseY=ch-padB;
    const area=valid.length>1?`${xs[0].toFixed(1)},${baseY} ${pts} ${xs[xs.length-1].toFixed(1)},${baseY}`:'';
    const labels=sorted.map(m=>{const dt=parseD(m.date);return MN[dt.getMonth()];});
    const gid='g'+field;
    return`<svg viewBox="0 0 ${cw} ${ch}" style="width:100%;height:auto">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <line x1="${padX}" y1="${baseY}" x2="${cw-padX}" y2="${baseY}" stroke="#e5e7eb" stroke-width="1"/>
      ${area?`<polygon points="${area}" fill="url(#${gid})"/>`:''}
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${valid.map((p,i)=>`<circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"/><text x="${xs[i].toFixed(1)}" y="${(ys[i]-13).toFixed(1)}" text-anchor="middle" font-family="'Google Sans',Arial,sans-serif" font-size="17" font-weight="700" fill="${color}">${p.v}</text>`).join('')}
      ${data.map((_,i)=>`<text x="${X(i).toFixed(1)}" y="${ch-8}" text-anchor="middle" font-family="'Google Sans',Arial,sans-serif" font-size="13" fill="#9ca3af">${labels[i]}</text>`).join('')}
    </svg>`;
  };
  const period=`${fdL(sorted[0].date)} → ${fdL(sorted[sorted.length-1].date)}`;
  const rows=sorted.slice().reverse().slice(0,5).map(m=>`<tr><td>${fd(m.date)}</td><td>${m.height||'—'}</td><td>${m.weight||'—'}</td><td>${m.bodyFat||'—'}</td><td>${m.wingspan||'—'}</td></tr>`).join('');
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Body Composition — ${ath.name}</title>


<style>
@page{size:A4 landscape;margin:8mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--bg2:#f4f5f7}
html,body{height:auto}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--text);font-size:10px;line-height:1.4;background:#fff}
.hdr{display:flex;align-items:center;gap:18px;padding:16px 22px;background:linear-gradient(120deg,#0a0b0d 0%,#15171c 100%);color:#fff;border-radius:14px;margin-bottom:14px}
.hdr .av{width:62px;height:62px;border-radius:14px;background:#1c2030;border:2px solid rgba(154,171,58,.55);display:grid;place-items:center;font-weight:700;font-size:20px;color:var(--accent);letter-spacing:-.02em;flex:none;overflow:hidden;padding:2px}
.hdr .av img{width:100%;height:100%;object-fit:cover;border-radius:11px;display:block}
.hdr .info{min-width:0}
.hdr .info h1{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.05}
.hdr .info .meta{font-family:'Google Sans',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.65);margin-top:5px;letter-spacing:.04em}
.hdr .info .date{display:inline-block;margin-top:8px;font-family:'Google Sans',Arial,sans-serif;font-size:10px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:4px 11px;border-radius:6px;letter-spacing:.06em}
.hdr .ttl{margin-left:auto;text-align:right;font-family:'Google Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.mcards{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.mcard{background:#fff;border:1px solid var(--border);border-radius:13px;padding:15px 17px;box-shadow:0 1px 3px rgba(15,23,42,.05);display:flex;flex-direction:column}
.mcard .mc-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px;padding-bottom:9px;border-bottom:1px solid var(--border)}
.mcard .mc-t{font-size:15px;font-weight:700;letter-spacing:-.01em;color:var(--text)}
.mcard .mc-u{font-family:'Google Sans',Arial,sans-serif;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.mcard .mc-val{display:flex;align-items:baseline;gap:9px;margin-bottom:2px}
.mcard .mc-val .mv{font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1;font-family:'Google Sans',Arial,sans-serif}
.mcard .mc-val .mu{font-size:12px;font-weight:500;color:var(--dim);margin-left:-4px}
.mcard .mc-val .md{font-family:'Google Sans',Arial,sans-serif;font-size:12px;font-weight:600}
.mcard .mc-val .md.pos{color:#16a34a}.mcard .mc-val .md.neg{color:#dc2626}
.mcard .mc-chart{margin-top:6px}
.mcard .mc-chart svg{width:100%;height:auto;max-height:150px}
.mcard .empty{font-family:'Google Sans',Arial,sans-serif;font-size:10px;color:var(--dim);text-align:center;padding:40px 6px}
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border-radius:9px;overflow:hidden;border:1px solid var(--border);flex:none}
th{background:#0a0b0d;color:#fff;font-family:'Google Sans',Arial,sans-serif;font-weight:500;font-size:9px;padding:6px;text-align:center;letter-spacing:.08em;text-transform:uppercase;border:none}
td{padding:6px;text-align:center;font-family:'Google Sans',Arial,sans-serif;font-size:10px;color:var(--text);border:none;border-top:1px solid var(--border);background:#fff}
.section-h{position:relative;padding:0 0 6px 12px;font-family:'Google Sans',Arial,sans-serif;font-weight:500;font-size:10px;color:var(--text);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border);margin:8px 0 6px;flex:none}
.section-h::before{content:'';position:absolute;left:0;top:1px;width:3px;height:14px;background:var(--accent);border-radius:2px}
.footer{text-align:center;font-family:'Google Sans',Arial,sans-serif;font-size:8px;color:var(--dim);margin-top:6px;padding-top:6px;border-top:1px solid var(--border);letter-spacing:.06em;flex:none}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'Google Sans',Arial,sans-serif;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Google Sans',Arial,sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
.empty{font-family:'Google Sans',Arial,sans-serif;font-size:11px;color:var(--dim);text-align:center;padding:24px}
</style>
</head><body>
<div class="print-bar">📄 ${L('Vücut Kompozisyonu raporu hazır','Body Composition report is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp" style="margin-top:50px"></div>
<div class="hdr">
  ${ath.photo?`<img class="av" src="${mediaSrc(ath.photo)}"/>`:`<div class="av">${initials}</div>`}
  <div class="info">
    <h1>${ath.name||'—'}</h1>
    <div class="meta">${ath.number?'#'+ath.number+' · ':''}${posOf(ath.position)}${ath.height?' · '+ath.height+' cm':''}${ath.weight?' · '+ath.weight+' kg':''}</div>
    <div class="date">📊 ${period}</div>
  </div>
  <div class="ttl">${L('VÜCUT<br>KOMPOZİSYONU','BODY<br>COMPOSITION')}</div>
</div>
<div class="mcards">
  <div class="mcard">
    <div class="mc-h"><div class="mc-t">${L('Boy','Height')}</div><div class="mc-u">cm</div></div>
    <div class="mc-val"><span class="mv" style="color:#a855f7">${h_!=null?h_:'—'}</span>${dh!=null&&dh!==0?`<span class="md ${dh>0?'pos':'neg'}">${fmtD(dh)}</span>`:''}</div>
    <div class="mc-chart">${lineChart('height','#a855f7')}</div>
  </div>
  <div class="mcard">
    <div class="mc-h"><div class="mc-t">${L('Kilo','Weight')}</div><div class="mc-u">kg</div></div>
    <div class="mc-val"><span class="mv" style="color:#3b82f6">${w_!=null?w_:'—'}</span>${dw!=null&&dw!==0?`<span class="md ${dw>0?'neg':'pos'}">${fmtD(dw)}</span>`:''}</div>
    <div class="mc-chart">${lineChart('weight','#3b82f6')}</div>
  </div>
  <div class="mcard">
    <div class="mc-h"><div class="mc-t">${L('Yağ Oranı','Body Fat')}</div><div class="mc-u">%</div></div>
    <div class="mc-val"><span class="mv" style="color:#f97316">${bf!=null?bf:'—'}</span>${dbf!=null&&dbf!==0?`<span class="md ${dbf>0?'neg':'pos'}">${fmtD(dbf)}</span>`:''}</div>
    <div class="mc-chart">${lineChart('bodyFat','#f97316')}</div>
  </div>
  <div class="mcard">
    <div class="mc-h"><div class="mc-t">${L('Kulaç','Wingspan')}</div><div class="mc-u">cm</div></div>
    <div class="mc-val"><span class="mv" style="color:#10b981">${ws!=null?ws:'—'}</span>${dws!=null&&dws!==0?`<span class="md ${dws>0?'pos':'neg'}">${fmtD(dws)}</span>`:''}</div>
    <div class="mc-chart">${lineChart('wingspan','#10b981')}</div>
  </div>
</div>
<div class="section-h">${L('Ölçüm Geçmişi','Measurement History')}</div>
<table><thead><tr><th style="width:18%">${L('Tarih','Date')}</th><th>${L('Boy (cm)','Height (cm)')}</th><th>${L('Kilo (kg)','Weight (kg)')}</th><th>${L('Yağ (%)','Body Fat (%)')}</th><th>${L('Kulaç (cm)','Wingspan (cm)')}</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${setup.teamName}</div>
</body></html>`;
  w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();}catch(e){}},400);
}

/* Team Body Composition — landscape A4 report of all athletes' latest measurements */
function printTeamBodyComp(athletes,setup){
  const w=window.open('','_blank','width=1300,height=900');
  if(!w){alert('Pop-up engellendi — bu site için pop-up izni ver.');return;}
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const initials=s=>(s||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const n=(o,k)=>{if(!o)return null;const v=Number(o[k]);return(o[k]===''||o[k]==null||isNaN(v))?null:v;};
  const groups=(athletes||[]).map(a=>({a,ms:[...(a.measurements||[])].filter(m=>m.date).sort((x,y)=>x.date.localeCompare(y.date))}))
    .filter(g=>g.ms.length>0).sort((x,y)=>(x.a.name||'').localeCompare(y.a.name||''));
  if(groups.length===0){alert('No body composition data');w.close();return;}
  const total=groups.reduce((s,g)=>s+g.ms.length,0);
  const latest=groups.map(g=>g.ms[g.ms.length-1]);
  const avg=k=>{const vs=latest.map(m=>n(m,k)).filter(v=>v!=null);return vs.length?+(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(1):null;};
  const av=(v,u)=>v==null?'—':`${v}<span class="u">${u}</span>`;
  const dcell=(v,good)=>v==null?'<span class="dim">·</span>':`<span class="${good==null?'':(good?'pos':'neg')}">${v>0?'+'+v:v}</span>`;
  const tr=groups.map(g=>g.ms.map((m,mi)=>{
    const prev=mi>0?g.ms[mi-1]:null;
    const dl=k=>{const c=n(m,k),p=n(prev,k);return(c!=null&&p!=null)?+(c-p).toFixed(1):null;};
    const dbf=dl('bodyFat'),dws=dl('wingspan');
    return`<tr class="${mi===0?'grp':''}">
      <td class="l">${mi===0?`<span class="ath-cell">${g.a.photo?`<img class="av" src="${mediaSrc(g.a.photo)}"/>`:`<span class="av ph">${esc(initials(g.a.name))}</span>`}<span class="ath-nm">${g.a.number?`<span class="jn">#${esc(String(g.a.number))}</span>`:''}${esc(g.a.name||'—')}</span></span>`:'<span class="subm">↳</span>'}</td>
      <td class="mono">${fdL(m.date)}</td>
      <td class="b">${n(m,'height')!=null?n(m,'height'):'—'}</td>
      <td class="b">${n(m,'weight')!=null?n(m,'weight'):'—'}</td>
      <td>${dcell(dl('weight'),null)}</td>
      <td class="b">${n(m,'bodyFat')!=null?n(m,'bodyFat'):'—'}</td>
      <td>${dcell(dbf,dbf==null?null:dbf<0)}</td>
      <td class="b">${n(m,'wingspan')!=null?n(m,'wingspan'):'—'}</td>
      <td>${dcell(dws,dws==null?null:dws>0)}</td>
    </tr>`;
  }).join('')).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Team Body Composition — ${esc(setup.teamName)}</title>


<style>
@page{size:A4 portrait;margin:11mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#9aa0a8;--bg2:#f4f5f7}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--text);font-size:10px;line-height:1.4;background:#fff}
.ath-cell{display:flex;align-items:center;gap:9px}
.av{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex:none}
.av.ph{display:inline-flex;align-items:center;justify-content:center;background:#0a0b0d;color:var(--accent);font-family:'Google Sans',Arial,sans-serif;font-size:10px;font-weight:700}
.ath-nm{font-weight:600;line-height:1.2}
.subm{padding-left:37px;color:var(--dim);font-family:'Google Sans',Arial,sans-serif}
.hdr{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(120deg,#0a0b0d,#15171c);color:#fff;border-radius:14px;padding:16px 22px;margin-bottom:14px}
.hdr h1{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.05}
.hdr .sub{font-family:'Google Sans',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.65);margin-top:5px;letter-spacing:.04em}
.hdr .ttl{text-align:right;font-family:'Google Sans',Arial,sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.stat{background:#fff;border:1px solid var(--border);border-radius:11px;padding:11px 15px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.stat .k{font-family:'Google Sans',Arial,sans-serif;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.stat .v{font-size:24px;font-weight:700;letter-spacing:-.01em;margin-top:4px}
.stat .v .u{font-size:11px;font-weight:500;color:var(--dim);margin-left:3px}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:11px;overflow:hidden}
th{background:#0a0b0d;color:#fff;font-family:'Google Sans',Arial,sans-serif;font-size:9px;font-weight:500;padding:9px 8px;text-transform:uppercase;letter-spacing:.06em;text-align:center}
th.l,td.l{text-align:left;padding-left:14px}
td{padding:8px;text-align:center;font-size:11px;border-top:1px solid var(--border);color:var(--text)}
td.l{font-weight:600}
td.b{font-weight:700}
td.mono,td .jn,.dim,.pos,.neg{font-family:'Google Sans',Arial,sans-serif}
td.mono{font-size:10px;color:var(--muted)}
.jn{font-size:9px;color:var(--dim);margin-right:7px}
.pos{color:#16a34a;font-weight:600}.neg{color:#dc2626;font-weight:600}.dim{color:#c2c6cc}
tbody tr.grp td{border-top:2px solid #cbd5e1}
tbody tr.grp:first-child td{border-top:none}
.footer{text-align:center;font-family:'Google Sans',Arial,sans-serif;font-size:8px;color:var(--dim);margin-top:10px;letter-spacing:.06em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'Google Sans',Arial,sans-serif;font-size:12px;font-weight:500;z-index:9999}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Google Sans',Arial,sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
</style></head><body>
<div class="print-bar">📄 ${L('Takım Vücut Kompozisyonu hazır','Team Body Composition is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp" style="margin-top:50px"></div>
<div class="hdr">
  <div><h1>${esc(setup.teamName)}</h1><div class="sub">📊 ${L('Vücut Kompozisyonu','Body Composition')} · ${groups.length} ${L('sporcu','athletes')} · ${total} ${L('ölçüm','measurements')} · ${fdL(fmt(today))}</div></div>
  <div class="ttl">${L('VÜCUT<br>KOMPOZİSYONU','BODY<br>COMPOSITION')}</div>
</div>
<div class="stats">
  <div class="stat"><div class="k">${L('Ort. Boy','Avg Height')}</div><div class="v">${av(avg('height'),'cm')}</div></div>
  <div class="stat"><div class="k">${L('Ort. Kilo','Avg Weight')}</div><div class="v">${av(avg('weight'),'kg')}</div></div>
  <div class="stat"><div class="k">${L('Ort. Yağ','Avg Body Fat')}</div><div class="v">${av(avg('bodyFat'),'%')}</div></div>
  <div class="stat"><div class="k">${L('Ort. Kulaç','Avg Wingspan')}</div><div class="v">${av(avg('wingspan'),'cm')}</div></div>
</div>
<table><thead><tr><th class="l">${L('Sporcu','Athlete')}</th><th>${L('Tarih','Date')}</th><th>${L('Boy (cm)','Height (cm)')}</th><th>${L('Kilo (kg)','Weight (kg)')}</th><th>Δ</th><th>${L('Yağ (%)','Body Fat (%)')}</th><th>Δ</th><th>${L('Kulaç (cm)','Wingspan (cm)')}</th><th>Δ</th></tr></thead><tbody>${tr}</tbody></table>
<div class="footer">${L('Δ = bir önceki ölçüme göre değişim','Δ = change vs previous measurement')} · ${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${esc(setup.teamName)}</div>
</body></html>`;
  w.document.write(html);w.document.close();
  setTimeout(()=>{try{w.focus();}catch(e){}},400);
}

/* =========================================================
   THE ATHLETE SHEET LOOK — one design for the two A4 portrait sheets a coach hands out: the
   Profile Printout (426, printAthleteInfo) and a single test record's report (generateTestPDF
   below). The header, the numbered section headings, the test cards (grey-scale picture beside
   the test's name and what it measures, the readings under them) and the tables are this CSS.
   ========================================================= */
const ATH_SHEET_CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ink:#0f1720;--t2:#3a4350;--mu:#5e6774;--dim:#8b939e;--ln:#e2e5ea;--ln2:#cfd4db;--soft:#f6f7f9;--acc:#0a6cdc}
html,body{background:#fff}
body{color:var(--ink);font-size:10px;line-height:1.45;max-width:186mm;margin:0 auto}
.pbar{position:sticky;top:0;z-index:9;background:#0f1720;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;font-size:12px;margin-bottom:14px}
.pbar button{background:#0a6cdc;color:#fff;border:0;border-radius:6px;padding:7px 14px;font-weight:600;cursor:pointer;font-size:12px}
.pbar button.sec{background:transparent;border:1px solid rgba(255,255,255,.3)}
@media print{.pbar{display:none}}
.hd{display:flex;align-items:center;gap:16px;padding:0 0 10px;border-bottom:2px solid var(--ink);margin-bottom:8px}
.hd .av{width:64px;height:64px;border-radius:12px;object-fit:cover;flex:none;border:1px solid var(--ln)}
.hd .avp{width:64px;height:64px;border-radius:12px;display:grid;place-items:center;background:var(--soft);border:1px solid var(--ln);font-size:20px;font-weight:700;color:var(--t2);flex:none}
.hd h1{font-size:23px;line-height:1.1;letter-spacing:-.01em}
.hd h1 span{font-size:14px;color:var(--dim);font-weight:600;margin-left:6px}
.hd .meta{color:var(--mu);font-size:11px;margin-top:4px}
.hd .r{margin-left:auto;text-align:right;display:flex;flex-direction:column;align-items:flex-end}
.hd .r .tm{display:flex;align-items:center;gap:6px;margin-bottom:5px}
.hd .r .tm img{height:22px;width:auto;max-width:40px;object-fit:contain}
.hd .r .tm span{font-size:10px;font-weight:700;color:var(--ink)}
.hd .r .t{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu);font-weight:600}
.hd .r .d{font-size:11px;font-weight:600;margin-top:3px}
section{margin-top:12px}
/* The Athletic Profile always starts a new page, however much room the page before has left. */
section.pg-new{break-before:page;page-break-before:always;margin-top:0}
.sec-h{display:flex;gap:10px;align-items:center;padding-bottom:7px;border-bottom:1px solid var(--ln);margin-bottom:10px;break-after:avoid;page-break-after:avoid}
.sec-h .n{width:24px;height:24px;border-radius:7px;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px;flex:none}
.sec-h .t{font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.sec-h .d{font-size:9.5px;color:var(--mu)}
.sub-h{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--t2);margin:0 0 6px;break-after:avoid}
.sub-h .hv{font-weight:600;color:var(--acc);text-transform:none;letter-spacing:0;margin-left:6px}
.blk{margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
.card{border:1px solid var(--ln);border-radius:9px;padding:9px 11px;background:#fff;break-inside:avoid;page-break-inside:avoid}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.an-w{display:flex;flex-direction:column;gap:6px}
.an-t{table-layout:fixed;border:1px solid var(--ln);border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.an-t th,.an-t td{padding:2px 4px;text-align:center;border-bottom:0;background:#fff}
.an-t .an-d th{font-size:7.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);background:var(--soft);padding-top:3px;white-space:nowrap}
.an-t .an-v td{font-size:10px;padding-bottom:4px}
.an-t .an-v b{font-size:11.5px;font-weight:700}
.an-t .an-v i{font-style:normal;font-size:7.5px;font-weight:600;color:var(--mu);margin-left:3px}
.an-t th.an-l{width:25mm;text-align:left;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);background:#fff;border-right:1px solid var(--ln);padding:4px 7px;vertical-align:middle}
.an-t th.an-l em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--dim);font-weight:500}
.an-t th.an-l span{display:block;font-size:7.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);margin-top:2px}
.txt{white-space:pre-wrap;font-size:10.5px;color:var(--ink)}
.none,.txt.none{color:var(--dim);font-size:10px}
.kvs{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:10px}
.kvs.sm{grid-template-columns:repeat(6,1fr)}
.kvs.sm .kv .k{font-size:7.6px;letter-spacing:.06em;line-height:1.25}
.kv{border:1px solid var(--ln);border-radius:9px;padding:8px 10px;background:var(--soft)}
.kv .k{font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--mu);font-weight:600}
.kv .v{font-size:18px;font-weight:700;margin-top:2px;line-height:1.1}
.kv .v small{font-size:9.5px;font-weight:500;color:var(--mu);margin-left:3px}
.notes{display:flex;flex-direction:column;gap:6px}
.note{display:grid;grid-template-columns:62px 1fr;gap:8px;padding-top:6px;border-top:1px solid var(--ln)}
.note:first-child{border-top:0;padding-top:0}
.nd{font-size:9.5px;color:var(--mu);font-weight:600}
.pk{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--mu);font-weight:700;margin-bottom:5px}
.pk.acc{color:var(--acc)}
.pos .pn{font-size:12.5px;font-weight:700;display:flex;gap:7px;align-items:center}
.pos .pn b{font-size:9.5px;padding:2px 6px;border-radius:5px;background:var(--ink);color:#fff;letter-spacing:.05em}
.card.pos{padding:7px 10px}
.pos .pk{margin-bottom:3px}
.pos .pn{font-size:11.5px}
.pos .pd{font-size:8.6px;line-height:1.35;color:var(--t2);margin-top:3px}
.pos .pe{color:var(--mu);font-style:italic}
table{width:100%;border-collapse:collapse}
th{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);text-align:left;font-weight:700;padding:5px 6px;border-bottom:1px solid var(--ln2);background:var(--soft)}
td{font-size:9.8px;padding:5px 6px;border-bottom:1px solid var(--ln);vertical-align:top}
tr{break-inside:avoid;page-break-inside:avoid}
td.b{font-weight:600}
td.r,th.r{text-align:right}
.sw{color:var(--mu);font-size:9px}
.cells{display:inline-flex;gap:2px;vertical-align:middle;margin-right:5px}
.cells i{width:11px;height:8px;border-radius:2px;border:1px solid var(--ln2)}
.sv{font-size:10.5px;margin-right:3px}
.crit{margin-bottom:4px}
.crit td{padding:4px 6px}
.key{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:9px;color:var(--mu);margin-top:6px}
.key span{display:inline-flex;align-items:center;gap:5px}
.key i{width:8px;height:8px;border-radius:2px}
.sign{display:flex;gap:24px;margin-top:9px;padding-top:7px;border-top:1px dashed var(--ln2);font-size:10px;color:var(--mu)}
.sign b{color:var(--ink)}
.tgs{margin-bottom:8px}
.tcs{display:flex;flex-direction:column;gap:5px}
.tcs.pair{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.tc.ds.half{grid-template-columns:50mm minmax(0,1fr);row-gap:6px;column-gap:8px}
.tc.ds.half .ds-r{gap:4px}
.tc.ds.half .tc-d{grid-column:1/-1}
.tc{display:grid;border:1px solid var(--ln);border-radius:8px;padding:5px 7px;break-inside:avoid;page-break-inside:avoid}
.tc-im{display:flex;gap:2px;border-radius:5px;overflow:hidden;background:var(--soft)}
.tc-im img{flex:1;min-width:0;width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1)}
.tc-im.none{background:none}
.tc-im.ph img{object-fit:contain;background:var(--soft)}
.tc.ds{grid-template-columns:50mm minmax(0,1fr);align-items:stretch;gap:10px}
.tc.ds.ph{grid-template-columns:62mm minmax(0,1fr)}
.tc.ds:not(.ph) .tc-im{height:auto;aspect-ratio:16/9;align-self:center}
.ds-r{display:flex;flex-direction:column;gap:7px;min-width:0;padding:2px 0}
.ds-r>.tc-d{margin-top:auto}
.ds-h .tc-n{display:flex;align-items:center;gap:5px;font-size:10px}
.fms-lg{height:16px;width:16px;border-radius:2px;flex:none;display:block}
.ds-dt{margin-left:auto;font-size:8px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--dim)}
.ds-w{font-size:8.6px;line-height:1.45;color:var(--t2);margin-top:4px}
.ds-s{display:flex;align-items:center;gap:12px;border:1px solid var(--ln);border-radius:8px;background:var(--soft);padding:8px 11px;margin-top:auto}
.ds-v{font-size:26px;font-weight:700;line-height:1;white-space:nowrap}
.ds-v small{font-size:10px;font-weight:500;color:var(--mu)}
.ds-lr{display:flex;gap:7px;font-size:8px;font-weight:600;color:var(--mu);margin-top:4px}
.ds-lr b{color:var(--ink);font-size:9px}
.ds-m{font-size:10px;font-weight:700}
.ds-x{font-size:8.6px;line-height:1.4;color:var(--t2);margin-top:2px}
.tc.ds.ph .tc-im{height:auto;gap:4px;background:none;overflow:visible}
.tc.ds figure{flex:1;min-width:0;text-align:center}
.tc.ds figure img,.tc.ds figure .shx{width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;filter:none;border-radius:5px;border:1px solid var(--ln);display:block}
.tc.ds figcaption{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);font-weight:600;margin-top:2px}
.tc-n{font-size:8.8px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);line-height:1.25}
.tc-t{width:auto;border:1px solid var(--ln);border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden}
.tc-t th,.tc-t td{padding:2px 6px;text-align:center;border-bottom:0;background:#fff}
.tc-t .an-d th{width:18mm;font-size:7.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);background:var(--soft);white-space:nowrap}
.tc-t .an-v td{font-size:9px;white-space:nowrap;padding-bottom:3px}
.tc-t .an-v b{font-size:11.5px;font-weight:700}
.tc-t .an-v b small{font-size:8px;font-weight:600;color:var(--mu);margin-left:2px}
.tc-t .an-v b small.g{margin-left:0}
.tc-t .an-v i{font-style:normal;font-size:7px;font-weight:600;color:var(--mu);margin-left:3px}
.tc-t .an-v i.up{color:#16a34a}.tc-t .an-v i.dn{color:#dc2626}
.tc-t .rl{width:11mm;text-align:left;font-size:7.5px;font-weight:700;color:var(--mu);border-right:1px solid var(--ln)}
.tc-t th.rl{width:11mm;background:var(--soft)}
.card.pt{padding:7px 9px}
.pt .pk{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
.pt .ptd{margin-left:auto;font-weight:600;letter-spacing:0;text-transform:none;color:var(--dim)}
.pt .pts{font-weight:700;letter-spacing:0;color:var(--acc)}
.shs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px}
.sh{text-align:center}
.sh img,.shx{width:100%;height:40mm;object-fit:contain;background:var(--soft);border:1px solid var(--ln);border-radius:6px;display:block}
.shx{display:grid;place-items:center;color:var(--dim);font-size:12px}
.pt.wide .sh img,.pt.wide .shx{height:88mm}
.pt.wide .txt{font-size:9.6px;line-height:1.45}
.sh figcaption{font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);font-weight:600;margin-top:2px}
.pt .txt{font-size:9px;line-height:1.38}
.pp{margin:0 0 3px 13px;font-size:9px;line-height:1.35}
.inj td{font-size:9.3px}
.inj tr.nr td{border-top:0;color:var(--mu);font-size:9px;padding-top:0}
.pill{font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:5px;letter-spacing:.04em;white-space:nowrap}
.pill.act{color:#b91c1c;background:#fdecec}.pill.ok{color:#047857;background:#e6f6ef}
.ft{margin-top:16px;padding-top:7px;border-top:1px solid var(--ln);font-size:8.5px;color:var(--dim);display:flex;justify-content:space-between}`;
/* The FMS scale, worded for the reader of a sheet: what each score means and what was seen. */
const FMS_SCORE_SCALE=[
  {tr:'Ağrılı hareket',en:'Painful movement',dTr:'Sporcu test sırasında veya ilgili ağrı kontrolünde ağrı bildirir.',dEn:'The athlete reports pain during the test or in the related clearing test.'},
  {tr:'Disfonksiyonel hareket',en:'Dysfunctional movement',dTr:'Sporcu hareketi testin minimum tamamlama kriterlerine uygun şekilde gerçekleştiremez.',dEn:'The athlete cannot perform the movement to the test’s minimum completion criteria.'},
  {tr:'Fonksiyonel ancak kompansasyonlu hareket',en:'Functional movement with compensation',dTr:'Sporcu hareketi tamamlar ancak bazı hareket kısıtlılıkları veya kompansasyonlar gözlenir.',dEn:'The athlete completes the movement, but some restrictions or compensations are seen.'},
  {tr:'Fonksiyonel hareket',en:'Functional movement',dTr:'Sporcu hareketi belirlenen kriterlere uygun, kompansasyon olmadan tamamlar.',dEn:'The athlete completes the movement to the set criteria, without compensation.'},
];

function generateTestPDF(test,ath,setup,customTests,athletes){
  const w=window.open('','_blank','width=980,height=1200');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site in the browser.'));return;}
  const periodLabel=TEST_PERIODS.find(p=>p.id===test.period)?.label||test.period;
  /* The report prints ONLY the tests this record took (its battery). An older record without a
     battery prints the tests it actually holds readings for. */
  const bat=expandBattery(test.battery);
  const taken=id=>Array.isArray(bat)?bat.includes(id):(()=>{try{return!!(TI_HAS[id]&&TI_HAS[id](test));}catch(e){return false;}})();
  const ids=TEST_CATALOG.map(c=>c.id).filter(taken);
  const cList=Array.isArray(customTests)?customTests:[];
  const customSel=cList.filter(c=>Array.isArray(bat)?bat.includes(c.id):((test.custom||{})[c.id]||'')!=='');
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const dash=v=>v==null||v===''?'—':esc(v);
  const bw=fvBodyMass(test,ath);
  // Photos are stored either as a plain URL / data-URI or tagged `drive:<fileId>`.
  const psrc=p=>esc((typeof p==='string'&&p.indexOf('drive:')===0)?driveImg(p.slice(6)):mediaSrc(p));
  /* An athlete's own photo in a portrait frame; an empty slot keeps the frame. */
  const shot=(photo,lbl)=>`<figure class="sh">${photo?`<img src="${psrc(photo)}" alt=""/>`:'<div class="shx">—</div>'}<figcaption>${lbl}</figcaption></figure>`;
  const shots=list=>`<div class="shs" style="grid-template-columns:repeat(${list.length},1fr)">${list.map(([p,l])=>shot(p,l)).join('')}</div>`;
  /* The squad's current average beside a one-number score, read from the same records the
     on-screen card reads, this athlete left out of it on both. */
  const tavg=id=>{
    const m=TEAM_AVG_TESTS[id];if(!m)return'';
    const ta=teamAvgOf(athletes,id,ath&&ath.id);if(!ta)return'';
    const d=teamAvgDelta(cmpN(test[id]),ta.avg,m.dir);
    const head=`${teamAvgFmt(ta.avg,id)}${m.u?` <small>${m.u}</small>`:''}`;
    if(!d)return head;
    const col=d.level==='good'?'#16a34a':d.level==='poor'?'#b45309':'#5e6774';
    const txt=d.level==='same'?L('ortalamada','on the average'):`${L('%'+Math.abs(d.pct).toFixed(1),Math.abs(d.pct).toFixed(1)+'%')} ${d.pct>0?L('üstünde','above'):L('altında','below')}`;
    return`${head}<span class="avd" style="color:${col}">${txt}</span>`;
  };
  const colAsym=p=>p==null?'':` style="color:${ASYM_COL[asymLevel(p)]}"`;
  const pct=p=>p==null?'—':L('%'+p,p+'%');
  const R=L('Sağ','Right'),Lf=L('Sol','Left');
  /* A row of headings over a row of values. Each cell is [heading, value html, attrs]. */
  const kv=cells=>`<table class="rt"><tr>${cells.map(c=>`<th>${c[0]}</th>`).join('')}</tr><tr>${cells.map(c=>`<td${c[2]||''}>${c[1]}</td>`).join('')}</tr></table>`;
  /* A table with a label column: rows of [label, ...cells]. */
  const grid=(head,rows)=>`<table class="rt lab"><tr>${head.map((h,i)=>`<th${i?'':' class="l"'}>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>i?`<td${c&&c.a?c.a:''}>${c&&c.v!=null?c.v:c}</td>`:`<td class="l">${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const foot=s=>`<div class="tb-avg">${s}</div>`;
  const obsOf=id=>id==='posture'?(test.posture||{}).observations:id==='ohs'?(test.ohs||{}).observations:(test.obs||{})[id];
  const tName=id=>{const info=TEST_INFO[id];return(info&&info.n)||MK_TITLE[id]||TEST_CAT_LABEL(id);};
  const noteHtml=n=>n&&String(n).trim()?`<div class="tb-note"><b>${L('Gözlem','Observation')}:</b> ${esc(n)}</div>`:'';
  /* The stock pictures print from their small grey-scale copies carried in the page (TEST_THUMB),
     like the Profile Printout's: no fetch, so no broken boxes on a weak connection. */
  const absSm=p=>{const q=String(p).replace(/^(tests|fms)\//,'$1/sm/');try{return new URL(q,location.href).href;}catch(e){return q;}};
  const stockImg=id=>{const p=TEST_IMG[id];return p?`<div class="tc-im"><img src="${esc(TEST_THUMB[p]||absSm(p))}" alt=""/></div>`:'';};
  /* What the test measures: its "used to assess" line. */
  const tcWhat=id=>{const i=TEST_INFO[id];return i?L(i.tr,i.en).p:'';};
  const tcInfo=(id,right)=>{const n=tName(id),w_=tcWhat(id);
    return`<div class="ds-h"><div class="tc-n" lang="en">${esc(n)}${right?`<span class="ds-dt">${right}</span>`:''}</div>${w_?`<div class="ds-w">${esc(w_)}</div>`:''}</div>`;};
  /* Every test is one card, as on the Profile Printout: its picture (when it has one), its name
     and what it measures, and under them its readings and the coach's note. `half` cards stand
     two side by side (jump and speed), their readings across the card under the picture. A test
     on the battery with no reading at all gets no card: its name joins one line at the foot of
     its section. */
  const card=(id,res,o={})=>{
    const note=obsOf(id);
    let empty=false;try{empty=!!(TI_HAS[id]&&!TI_HAS[id](test))&&!(note&&String(note).trim());}catch(e){}
    if(empty)return{empty:true,name:tName(id)};
    const img=o.img!=null?o.img:stockImg(id);
    const body=`<div class="tc-d">${res||''}${noteHtml(note)}</div>`;
    const cls=`tc ds${o.half?' half':''}${img?'':' noimg'}${o.cls?' '+o.cls:''}`;
    return o.half?`<div class="${cls}">${img}<div class="ds-r">${tcInfo(id,o.right)}</div>${body}</div>`
      :`<div class="${cls}">${img}<div class="ds-r">${tcInfo(id,o.right)}${body}</div></div>`;
  };
  const fmsR=fmsCalc(test.fms);
  const fmsOn=Array.isArray(bat)?fmsInBattery(bat):fmsR.any;
  const fmsMoves=fmsMovesIn(bat);
  const fmsPdf=test.fms&&test.fms.pdf;
  const fmsPages=(fmsPdf&&Array.isArray(fmsPdf.pages))?fmsPdf.pages:[];
  const fmsPageH=fmsPages.length>1?120:185;
  const fmsTone=v=>v==null||v===''?'':Number(v)<=1?'#dc2626':Number(v)===2?'#b88400':'#16a34a';
  const yb=ybCalc(test.yBalance);
  const t=test;
  const B={
    anthro:()=>card('anthro',kv([[L('Boy','Height'),dash(t.height)+' <small>cm</small>'],[L('Kilo','Weight'),dash(t.weight)+' <small>kg</small>'],[L('Kulaç','Wingspan'),dash(t.wingspan)+' <small>cm</small>'],
      [L('Yağ','Body fat'),dash(t.bodyFat)+' <small>%</small>'],[L('Tahmini bacak uz.','Est. leg length'),dash(estLegLen(t))+' <small>cm</small>'],[L('Oturma yük.','Sitting ht.'),dash(t.sittingHeight)+' <small>cm</small>']])),
    circ:()=>{const c=t.circ||{};const cm=v=>dash(v)+(v?' <small>cm</small>':'');return card('circ',kv([[L('Omuz','Shoulder'),cm(c.shoulder)],[L('Bel','Waist'),cm(c.waist)],[L('Kalça','Hip'),cm(c.hip)],
      [L('Uyluk R','Thigh R'),cm(c.thighRight||c.thigh)],[L('Uyluk L','Thigh L'),cm(c.thighLeft||c.thigh)],[L('Baldır R','Calf R'),cm(c.calfRight||c.calf)],[L('Baldır L','Calf L'),cm(c.calfLeft||c.calf)]]));},
    /* The posture across the full width: its photos, each the same frame, and the note under them. */
    posture:()=>{const p=t.posture||{};if(!(p.frontPhoto||p.sidePhoto||p.backPhoto||p.sideLPhoto||p.observations))return{empty:true,name:tName('posture')};
      const list=[[p.frontPhoto,L('Önden','Front')],[p.sidePhoto,L('Yandan (R)','Side (R)')],...(p.sideLPhoto?[[p.sideLPhoto,L('Yandan (L)','Side (L)')]]:[]),[p.backPhoto,L('Arkadan','Back')]];
      return card('posture',list.some(x=>x[0])?shots(list):'',{img:'',cls:'pt-c'});},
    ohs:()=>{const o=t.ohs||{};return card('ohs',kv([[L('Skor','Score'),`${dash(o.score)} <small>/ 3</small>`,o.score!==''&&o.score!=null?` style="color:${fmsTone(o.score)}"`:'']])
      +((o.frontPhoto||o.sidePhoto)?shots([[o.frontPhoto,L('Önden','Front')],[o.sidePhoto,L('Yandan','Side')]]):''));},
    ankleDF:()=>{const a=t.ankleDF||{};const r=tN(a.right),l=tN(a.left);const d=r!=null&&l!=null?+Math.abs(r-l).toFixed(1):null;
      return card('ankleDF',kv([[R,r!=null?r+'°':'—'],[Lf,l!=null?l+'°':'—'],[L('Fark','Gap'),d!=null?d+'°':'—',d!=null?` style="color:${d<5?'#16a34a':d<10?'#b88400':'#dc2626'}"`:'']]));},
    aslr:()=>{const a=t.aslr||{};return card('aslr',kv([[R,`${dash(a.right)} <small>/ 3</small>`,a.right?` style="color:${fmsTone(a.right)}"`:''],[Lf,`${dash(a.left)} <small>/ 3</small>`,a.left?` style="color:${fmsTone(a.left)}"`:'']]));},
    hipRot:()=>{const h=hipRotCalc(t);const g=v=>v!=null?v+'°':'—';
      return card('hipRot',grid(['',R,Lf,L('Fark','Gap')],[[L('İç rotasyon (IR)','Internal rotation (IR)'),g(h.irR),g(h.irL),g(h.dIr)],[L('Dış rotasyon (ER)','External rotation (ER)'),g(h.erR),g(h.erL),g(h.dEr)],
        [`<b>${L('Toplam ark','Total arc')}</b>`,{v:`<b>${g(h.totR)}</b>`},{v:`<b>${g(h.totL)}</b>`},{v:h.dTot!=null?`${h.dTot}° (${pct(h.pTot)})`:'—',a:colAsym(h.pTot)}]]));},
    thomas:()=>{const th=thomasCalc(t);const g=v=>v!=null?v+'°':'—';
      const call=v=>v==='pos'?{v:L('Pozitif','Positive'),a:' style="color:#dc2626"'}:v==='neg'?{v:L('Negatif','Negative'),a:' style="color:#16a34a"'}:'—';
      return card('thomas',grid(['',R,Lf],[[L('Uyluk açısı (yataya göre)','Thigh angle (vs horizontal)'),g(th.right.hip),g(th.left.hip)],[L('Diz fleksiyonu','Knee flexion'),g(th.right.knee),g(th.left.knee)],
        ...THOMAS_FIND.map(([k,nm])=>[nm,call(th.right.res[k]),call(th.left.res[k])])]));},
    tSpine:()=>{const x=tSpineCalc(t);return card('tSpine',kv([[R,x.r!=null?x.r+'°':'—'],[Lf,x.l!=null?x.l+'°':'—'],[L('Fark','Gap'),x.diff!=null?x.diff+'°':'—'],[L('Asimetri','Asymmetry'),pct(x.pct),colAsym(x.pct)]]));},
    yBalance:()=>{const d=v=>v==null?{v:'—'}:{v:v.toFixed(1)+' cm',a:` style="color:${v<4?'#16a34a':'#dc2626'}"`};const n=v=>v!=null?v:'—';
      return card('yBalance',`<div class="tb-sub">${L('Bacak uzunluğu (SİAS – medial malleol)','Leg length (ASIS – medial malleolus)')}: <b>${yb.limb!=null?yb.limb+' cm':'—'}</b></div>`
        +grid([L('Uzanma (cm)','Reach (cm)'),R,Lf,L('Fark (< 4 cm)','Gap (< 4 cm)')],[['Anterior',n(yb.right.ant),n(yb.left.ant),d(yb.dAnt)],['Posteromedial',n(yb.right.pm),n(yb.left.pm),d(yb.dPm)],['Posterolateral',n(yb.right.pl),n(yb.left.pl),d(yb.dPl)],
          [`<b>${L('Bileşik skor','Composite score')}</b>`,{v:`<b>${yb.compR!=null?yb.compR+'%':'—'}</b>`},{v:`<b>${yb.compL!=null?yb.compL+'%':'—'}</b>`},{v:yb.compR!=null&&yb.compL!=null?Math.abs(yb.compR-yb.compL).toFixed(1)+'%':'—'}]])
        +foot(L('Bileşik = (ANT + PM + PL) / (3 × bacak uzunluğu) × 100','Composite = (ANT + PM + PL) / (3 × leg length) × 100')));},
    lateralCmj:()=>{const a=t.lateralCmj||{};const p=asymPct(a.right,a.left,'hi');
      return card('lateralCmj',kv([[R,dash(a.right)+' <small>cm</small>'],[Lf,dash(a.left)+' <small>cm</small>'],[L('Asimetri','Asymmetry'),pct(p),colAsym(p)]])
        +foot(L('Sağ-sol farkı %10’un altında olmalı; %15 ve üzeri belirgin asimetri.','The right–left gap should stay under 10%; 15% and above is a clear asymmetry.')),{half:true});},
    /* The three gates and the average speed over each (distance / time), then the F-V profile. */
    sprint:()=>{const gs=sprintGates(t);const fv=fvSprint(bw,fvSprintPoints(t));
      return card('sprint',grid(['',...gs.map(g=>`0–${g.d} m`)],[[L('Süre','Time'),...gs.map(g=>g.t!=null?(g.main?`<b>${g.t}</b>`:g.t)+' <small>s</small>':'—')],
          [L('Ort. hız','Avg speed'),...gs.map(g=>g.v!=null?`${g.v} <small>m/s</small>`:'—')]])
        +(fv.ok?grid(['','F0','V0','Pmax','τ'],[[L('F-V profili','F-V profile'),fv.F0rel.toFixed(2)+' <small>N/kg</small>',fv.V0.toFixed(2)+' <small>m/s</small>',fv.Pmaxrel.toFixed(1)+' <small>W/kg</small>',fv.tau.toFixed(2)+' <small>s</small>']]):'')
        +foot(L('Ortalama hız = mesafe / süre.','Average speed = distance / time.')+(fv.ok?' '+L('Sprint kuvvet-hız profili (Samozino), hava direnci dahil değil.','Sprint force-velocity profile (Samozino), air drag not included.'):'')),{half:true});},
    accel:()=>{const a=accelCalc(t);const s=v=>v!=null?v+' <small>s</small>':'—';const ms=v=>v!=null?v+' <small>m/s</small>':'—';
      return card('accel',grid(['','0–5 m','0–10 m',L('5–10 m ara','5–10 m split')],[[L('Süre','Time'),s(a.t5),s(a.t10),s(a.split)],[L('Hız','Speed'),ms(a.v5),ms(a.v10),ms(a.v510)]]),{half:true});},
    fiveZeroFive:()=>{const c=cod505Calc(t);const s=v=>v!=null?v+' <small>s</small>':'—';
      return card('fiveZeroFive',kv([[L('Sağ dönüş','Right turn'),s(c.r)],[L('Sol dönüş','Left turn'),s(c.l)],[L('En iyi','Best'),`<b>${s(c.best)}</b>`],[L('Asimetri','Asymmetry'),pct(c.pct),colAsym(c.pct)]])
        +foot(L('Asimetri = |sağ − sol| / hızlı taraf × 100. %10 altı dengeli, %10-15 izlenmeli, %15 ve üzeri belirgin.','Asymmetry = |right − left| / quicker side × 100. Under 10% balanced, 10-15% watch, 15% and above clear.')),{half:true});},
    ift3015:()=>{const c=iftCalc(t,ath,bw);
      return card('ift3015',kv([['VIFT',c.vift!=null?`<b>${c.vift}</b> <small>km/h</small>`:'—'],['VIFT (m/s)',c.ms!=null?c.ms:'—'],[L('Tahmini VO2max','Est. VO2max'),c.vo2!=null?c.vo2+` <small>${L('ml/kg/dk','ml/kg/min')}</small>`:'—']])
        +foot(L('VO2max tahmini Buchheit (2008): yaş, cinsiyet, kilo ve VIFT’ten.','VO2max estimate after Buchheit (2008): from age, sex, body mass and VIFT.')));},
    pullUp:()=>{const p=t.pullUp||{};return card('pullUp',kv([[L('Tam tekrar','Full reps'),`<b>${dash(p.reps)}</b>`],[L('Ek yük','Added load'),tN(p.load)!=null?p.load+' <small>kg</small>':'—']]));},
  };
  /* One-number tests: the result, and beside it the squad's current average where there is one. */
  const SOLO={verticalJump:'cm',cmj:'cm',squatJump:'cm',horizontalJump:'cm',dropJump:'RSI',tTest:'s',laneAgility:'s',shuttleRun:'s'};
  Object.keys(SOLO).forEach(id=>{B[id]=()=>{const a=tavg(id);
    return card(id,kv([[L('Sonuç','Result'),tN(t[id])!=null?`<b>${esc(t[id])}</b> <small>${SOLO[id]}</small>`:'—'],...(a?[[L('Takım ort.','Team avg'),`<span class="avgv">${a}</span>`]]:[])]),
      {half:(TEST_META[id]||{}).g==='jump'||(TEST_META[id]||{}).g==='speed'});};});
  STR_LIFTS.forEach(id=>{B[id]=()=>{const c=strCalc(t,id,bw);
    return card(id,kv([[L('Yük','Load'),c.load!=null?c.load+' <small>kg</small>':'—'],[L('Tekrar','Reps'),dash(c.reps)],['e1RM',c.e1!=null?`<b>${c.e1}</b> <small>kg</small>`:'—'],[L('Göreli','Relative'),c.rel!=null?c.rel+' <small>× BW</small>':'—']])
      +foot(L('e1RM: Epley tahmini (tek tekrarda yükün kendisi, en fazla 12 tekrar).','e1RM: Epley estimate (a single is the load itself, at most 12 reps).')));};});
  ['copenhagen','sidePlank'].forEach(id=>{B[id]=()=>{const h=holdCalc(t,id);
    return card(id,kv([[R,h.r!=null?h.r+' <small>s</small>':'—'],[Lf,h.l!=null?h.l+' <small>s</small>':'—'],[L('Asimetri','Asymmetry'),pct(h.pct),colAsym(h.pct)]]));};});
  /* An FMS movement as the Profile Printout draws it: its picture (for a movement photographed,
     the athlete's own front and side photos), the FMS badge, its name and what it screens, the
     score with its meaning on the FMS scale, then the problems ticked against it. An uploaded
     score sheet (PDF) still prints as its pages. */
  const fmsF=test.fms||{};
  const fmsMove=mid=>{
    const it=fmsR.items.find(i=>i.id===mid);if(!it)return'';
    const id='fms_'+mid;
    let has=false;try{has=TI_HAS[id](test);}catch(e){}
    if(!has)return{empty:true,name:it.en};
    const pp=(fmsF.photos||{})[mid]||{};
    const cms=fmsCommentsOf(mid);
    const probs=cms.flatMap(k=>fmsProblemLabels(fmsF,k));
    const notes=cms.map(k=>String((fmsF.comments||{})[k]||'').trim()).filter(Boolean);
    if(it.clear&&it.cleared==='pos')probs.push(`${it.clearEn}: ${L('Pozitif (ağrı)','Positive (pain)')}`);
    if(mid==='inlineLunge'){const m=fmsF.ankleMob||{};const g=x=>({r:L('Kırmızı','Red'),y:L('Sarı','Yellow'),g:L('Yeşil','Green')})[x];
      if(m.right||m.left)probs.push(`${L('Ayak bileği mobilitesi','Ankle mobility')}: ${L('Sağ','Right')} ${g(m.right)||'—'} / ${L('Sol','Left')} ${g(m.left)||'—'}`);}
    notes.forEach(n=>probs.push(n));
    const own=FMS_PHOTO_MOVES.includes(mid)&&(hasMedia(pp.front)||hasMedia(pp.side));
    const img=own?`<div class="tc-im ph">${[['front',L('Önden','Front')],['side',L('Yandan','Side')]].map(([k,l])=>
      `<figure>${hasMedia(pp[k])?`<img src="${psrc(pp[k])}" alt=""/>`:'<div class="shx">—</div>'}<figcaption>${l}</figcaption></figure>`).join('')}</div>`:stockImg(id);
    const v=it.score!=null?it.score:null;const m=v!=null&&FMS_SCORE_SCALE[v];
    const info=FMS_INFO.find(x=>x.id===mid);
    const sides=it.bi?`<div class="ds-lr"><span>${L('Sağ','R')} <b>${it.right!=null?it.right:'—'}</b></span><span>${L('Sol','L')} <b>${it.left!=null?it.left:'—'}</b></span></div>`:'';
    return`<div class="tc ds${own?' ph':''}${img?'':' noimg'}">${img}<div class="ds-r">
      <div class="ds-h"><div class="tc-n" lang="en"><img class="fms-lg" src="${FMS_LOGO_SQ}" alt="FMS"/>${esc(it.en)}</div>
        <div class="ds-w">${esc(info?L(info.tr,info.en):'')}</div></div>
      <div class="ds-s"><div class="ds-v"${m?` style="color:${fmsTone(v)}"`:''}>${v!=null?v:'—'}<small> / 3</small>${sides}</div>
        ${m?`<div><div class="ds-m" style="color:${fmsTone(v)}">${esc(L(m.tr,m.en))}</div><div class="ds-x">${esc(L(m.dTr,m.dEn))}${it.bi&&it.right!=null&&it.left!=null&&it.right!==it.left?` ${L('Düşük taraf skoru geçerlidir.','The lower side is the score.')}`:''}</div></div>`:''}</div>
      <div class="fm-pr"><div class="fm-k">${L('Tespit edilen problemler','Identified problems')}</div>
        ${probs.length?`<ul>${probs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<div class="fm-none">${L('Problem seçilmedi.','No problems selected.')}</div>`}</div>
    </div></div>`;
  };
  const fmsPdfBlk=()=>`<div class="tc ds noimg"><div class="ds-r">
      <div class="ds-h"><div class="tc-n">${L('FMS — Fonksiyonel Hareket Taraması','FMS — Functional Movement Screen')}${fmsR.total!=null?`<span class="ds-dt">${L('Toplam','Total')} ${fmsR.total} / 21</span>`:''}</div></div>
      <div class="fms-pages" style="--fms-ph:${fmsPageH}mm">${fmsPages.map((src,i)=>`<div class="fms-pg"><img src="${esc(mediaSrc(src))}" alt=""/>${fmsPages.length>1?`<div class="fms-pgn">${L('Sayfa','Page')} ${i+1}</div>`:''}</div>`).join('')}</div>
      <div class="fms-src">${L('Yüklenen FMS test sonucu','Uploaded FMS test result')}: ${esc(fmsPdf.name||'PDF')}</div></div></div>`;
  /* One numbered section per test group, in catalog order, as the Profile Printout numbers its parts.
     Jump and speed cards stand two to a row. */
  let secN=0;
  const secH=(title,d)=>`<div class="sec-h"><span class="n">${++secN}</span><div><div class="t">${title}</div>${d?`<div class="d">${d}</div>`:''}</div></div>`;
  const groups=TEST_GROUPS.filter(g=>g.id!=='all'&&g.id!=='custom').map(g=>{
    const mine=ids.filter(id=>(TEST_META[id]||{}).g===g.id&&!FMS_PART_IDS.includes(id)&&id!=='fms');
    const parts=[];
    if(g.id==='move'&&fmsOn){
      if(fmsPages.length)parts.push(fmsPdfBlk());
      else fmsMoves.forEach(m=>parts.push(fmsMove(m)));
    }
    mine.forEach(id=>{const f=B[id];if(f)parts.push(f());});
    const body=[],empties=[];
    parts.filter(Boolean).forEach(p=>{if(p.empty)empties.push(p.name);else body.push(p);});
    if(!body.length&&!empties.length)return'';
    const pair=g.id==='jump'||g.id==='speed';
    const full=body.filter(h=>!/^<div class="tc ds half/.test(h)),half=body.filter(h=>/^<div class="tc ds half/.test(h));
    const fmsHead=g.id==='move'&&fmsOn&&fmsR.total!=null&&fmsR.n===FMS_ITEMS.length?`FMS ${L('toplam','total')} ${fmsR.total} / 21`:'';
    return`<section>${secH(esc(L(g.tr,g.en)),[L(`${body.length} test`,`${body.length} test${body.length===1?'':'s'}`),fmsHead].filter(Boolean).join(' · '))}
      ${full.length?`<div class="tcs">${full.join('')}</div>`:''}
      ${half.length?`<div class="tcs${pair?' pair':''}"${full.length?' style="margin-top:5px"':''}>${half.join('')}</div>`:''}
      ${empties.length?`<div class="tb-miss">${L('Değer girilmeyen testler','Tests with no values')}: ${empties.map(esc).join(' · ')}</div>`:''}</section>`;
  }).join('');
  const custom=customSel.length?`<section>${secH(L('Özel Testler','Custom Tests'))}
    <div class="card">${grid(['Test',L('Sonuç','Result')],customSel.map(c=>[esc(c.name),{v:`<b>${dash((test.custom||{})[c.id])}</b>`}]))}</div></section>`:'';
  const notes=String(test.notes||'').trim()?`<section>${secH(L('Gözlemler ve Yorumlar','Observations &amp; Comments'))}<div class="card"><div class="txt">${esc(test.notes)}</div></div></section>`:'';
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const today_=fdL(fmt(today));
  const html=`<!DOCTYPE html><html lang="${REPORT_LANG==='tr'?'tr':'en'}"><head><meta charset="utf-8"><title>${esc(ath.name||'')} — ${L('Test Raporu','Test Report')}</title>
<style>
@page{size:A4 portrait;margin:12mm 12mm 13mm}
${RPT_FONT}
${ATH_SHEET_CSS}
.hd .r .c{font-size:8.5px;color:var(--mu);margin-top:3px}
.tcs+.tcs{margin-top:5px}
.tc.ds.noimg{grid-template-columns:minmax(0,1fr)}
.tc.ds.half.noimg .tc-d{grid-column:1}
.tc-d{display:flex;flex-direction:column;gap:5px;min-width:0}
.ds-r>.tc-d{margin-top:auto}
table.rt{width:100%;table-layout:fixed;border:1px solid var(--ln);border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden}
.rt th{padding:3px 4px;text-align:center;font-size:7.3px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mu);background:var(--soft);border-bottom:0;line-height:1.25;vertical-align:bottom}
.rt td{padding:3px 4px 4px;text-align:center;font-size:11px;font-weight:700;color:var(--ink);border-bottom:0;border-top:1px solid var(--ln);font-variant-numeric:tabular-nums;vertical-align:top;white-space:nowrap}
.rt td small{font-size:7.5px;font-weight:600;color:var(--mu)}
.rt td .avgv{font-size:11px}
.rt td .avd{display:block;font-size:7.5px;font-weight:600;margin-top:1px}
.rt.lab th.l,.rt.lab td.l{text-align:left;width:26%}
.rt.lab td.l{font-size:8px;font-weight:600;color:var(--mu);white-space:normal}
.tb-sub{font-size:8.6px;color:var(--t2)}
.tb-avg{font-size:7.6px;color:var(--mu);line-height:1.35}
.tb-note{font-size:8.6px;color:var(--t2);line-height:1.45;padding-top:4px;border-top:1px dashed var(--ln2)}
.tb-note b{color:var(--ink);font-weight:600}
.tb-miss{font-size:8.5px;color:var(--dim);margin:6px 0 0}
.tc.pt-c .shs{margin-bottom:0}
.tc.pt-c .sh img,.tc.pt-c .shx{height:80mm}
.tc .shs .sh img,.tc .shs .shx{object-fit:contain}
.fm-k{font-size:7.4px;font-weight:600;color:var(--mu);letter-spacing:.08em;text-transform:uppercase;padding-bottom:3px;border-bottom:1px solid var(--ln)}
.fm-pr ul{margin:4px 0 0;padding-left:13px;font-size:8.8px;line-height:1.5;color:var(--ink)}
.fm-none{margin-top:4px;font-size:8.6px;color:var(--dim)}
.fms-pages{display:flex;gap:6px;justify-content:center;align-items:flex-start;margin-top:4px}
.fms-pg{flex:1 1 0;min-width:0;text-align:center}
.fms-pg img{display:block;margin:0 auto;max-height:var(--fms-ph,185mm);max-width:100%;border:1px solid var(--ln);border-radius:4px;background:#fff}
.fms-pgn{font-size:8.5px;color:var(--mu);margin-top:3px}
.fms-src{font-size:8.5px;color:var(--mu);text-align:right}
</style></head><body>
<div class="pbar">${L('Test raporu hazır','Test report is ready')} · <button onclick="window.print()">${L('Yazdır / PDF olarak kaydet','Print / Save as PDF')}</button><button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="hd">
  ${ath.photo?`<img class="av" src="${psrc(ath.photo)}" alt=""/>`:`<div class="avp">${esc(initials)}</div>`}
  <div><h1>${esc(ath.name||L('Adsız Sporcu','Unnamed Athlete'))}${ath.number?`<span>#${esc(ath.number)}</span>`:''}</h1>
    <div class="meta">${[ath.position?esc(POS_FULL[ath.position]||ath.position):'',esc(periodLabel||''),test.year?esc(test.year):''].filter(Boolean).join(' · ')}</div></div>
  <div class="r">${hasMedia(setup.logo)||setup.teamName?`<div class="tm">${hasMedia(setup.logo)?`<img src="${esc(mediaSrc(setup.logo))}" alt=""/>`:''}${setup.teamName?`<span>${esc(setup.teamName)}</span>`:''}</div>`:''}<div class="t">${L('Test ve Değerlendirme','Test &amp; Assessment')}</div><div class="d">${fdL(test.date)}</div>
    <div class="c">${L('Testi Alan Antrenör: Emincan Özer','Test Administered by: Emincan Özer')}</div></div>
</div>
${groups}
${custom}
${notes}
<div class="ft"><span>${esc(setup.teamName||'')} · CoachOS</span><span>${L(`${today_} tarihinde oluşturuldu`,`Generated ${today_}`)}</span></div>
</body></html>`;
  w.document.open();w.document.write(html);w.document.close();
  // The athlete's own photos (posture, OHS, FMS) are full-size and remote, so give them a longer
  // cap before the dialog opens regardless.
  printWhenImagesReady(w,{safety:15000});
}
