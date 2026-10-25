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

function generateTestPDF(test,ath,setup,customTests,athletes){
  /* A record that is only the FMS — the whole sheet or its movements — prints as the score sheet
     itself: one page laid out like the official sheet, and the movement page behind it. */
  const only=expandBattery(test.battery);
  if(Array.isArray(only)&&only.length&&only.every(id=>id==='fms'||FMS_PART_IDS.includes(id))&&!(test.fms&&test.fms.pdf)){
    printFmsSheet(test,ath,{note:test.notes});return;
  }
  const w=window.open('','_blank','width=900,height=1200');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site in the browser.'));return;}
  const periodLabel=TEST_PERIODS.find(p=>p.id===test.period)?.label||test.period;
  /* The report prints ONLY the tests this record took (its battery). An older record without a
     battery prints the tests it actually holds readings for. */
  const bat=expandBattery(test.battery);
  const taken=id=>Array.isArray(bat)?bat.includes(id):(()=>{try{return!!(TI_HAS[id]&&TI_HAS[id](test));}catch(e){return false;}})();
  const ids=TEST_CATALOG.map(c=>c.id).filter(taken);
  const cList=Array.isArray(customTests)?customTests:[];
  const customSel=cList.filter(c=>Array.isArray(bat)?bat.includes(c.id):((test.custom||{})[c.id]||'')!=='');
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const dash=v=>v==null||v===''?'—':esc(v);
  const abs=p=>{try{return new URL(p,location.href).href;}catch(e){return p;}};
  const bw=fvBodyMass(test,ath);
  // Photos are stored either as a plain URL / data-URI or tagged `drive:<fileId>`.
  const psrc=p=>String((typeof p==='string'&&p.indexOf('drive:')===0)?driveImg(p.slice(6)):mediaSrc(p)).replace(/&/g,'&amp;');
  const phFail=(w,h)=>`onerror="this.outerHTML='&lt;div class=&quot;phx&quot; style=&quot;width:${w}px;height:${h}px&quot;&gt;—&lt;/div&gt;'"`;
  const ph=(photo,label,w=150,maxH=200)=>photo
    ?`<div class="ph"><img src="${psrc(photo)}" ${phFail(w,Math.round(w*1.2))} style="width:${w}px;height:auto;max-height:${maxH}px;object-fit:contain;background:#f8fafc"/><div class="phl">${label}</div></div>`
    :`<div class="ph"><div class="phx" style="width:${w}px;height:${Math.round(w*0.9)}px">—</div><div class="phl" style="color:#aaa">${label}</div></div>`;
  /* The squad's current average under the score it belongs to, read from the same records the
     on-screen card reads, this athlete left out of it on both. */
  const tavg=id=>{
    const m=TEAM_AVG_TESTS[id];if(!m)return'';
    const ta=teamAvgOf(athletes,id,ath&&ath.id);if(!ta)return'';
    const d=teamAvgDelta(cmpN(test[id]),ta.avg,m.dir);
    const head=`<span>${L('Takım ort.','Team avg')} ${teamAvgFmt(ta.avg,id)}${m.u?' '+m.u:''}</span>`;
    if(!d)return`<div class="tb-avg">${head}</div>`;
    const col=d.level==='good'?'#16a34a':d.level==='poor'?'#b45309':'#5c626c';
    const txt=d.level==='same'?L('ortalamada','on the average'):`${Math.abs(d.pct).toFixed(1)}% ${d.pct>0?L('üstünde','above'):L('altında','below')}`;
    return`<div class="tb-avg">${head} <span style="color:${col};font-weight:600">${txt}</span></div>`;
  };
  const colAsym=p=>p==null?'':` style="color:${ASYM_COL[asymLevel(p)]}"`;
  const pct=p=>p==null?'—':L('%'+p,p+'%');
  const R=L('Sağ','Right'),Lf=L('Sol','Left');
  /* A row of headings over a row of values. Each cell is [heading, value html, attrs]. */
  const kv=cells=>`<table class="rt"><tr>${cells.map(c=>`<th>${c[0]}</th>`).join('')}</tr><tr>${cells.map(c=>`<td${c[2]||''}>${c[1]}</td>`).join('')}</tr></table>`;
  /* A table with a label column: rows of [label, ...cells]. */
  const grid=(head,rows)=>`<table class="rt lab"><tr>${head.map((h,i)=>`<th${i?'':' class="l"'}>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>i?`<td${c&&c.a?c.a:''}>${c&&c.v!=null?c.v:c}</td>`:`<td class="l">${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const obsOf=id=>id==='posture'?(test.posture||{}).observations:id==='ohs'?(test.ohs||{}).observations:(test.obs||{})[id];
  const tName=id=>{const info=TEST_INFO[id];return(info&&info.n)||MK_TITLE[id]||TEST_CAT_LABEL(id);};
  /* One test in the body: its name, its numbers and the coach's note — only the athlete's own
     readings and photos. What the test is, with its picture, is explained once at the end. */
  const shown=[];
  const blk=(id,res,extra)=>{
    shown.push(id);
    const note=obsOf(id);
    return`<div class="tb">
      <div class="tb-bd">
        <div class="tb-t">${esc(tName(id))}</div>
        ${res||''}
        ${note&&String(note).trim()?`<div class="tb-note"><b>${L('Gözlem','Observation')}:</b> ${esc(note)}</div>`:''}
      </div>
    </div>${extra||''}`;
  };
  /* The closing section: every test on the record, its picture, what it is and why it is taken —
     for the athlete, a parent or a physio reading the sheet away from the court. The FMS movements
     have their own page after the score sheet. */
  const infoSec=()=>{
    const list=shown.filter((id,i)=>shown.indexOf(id)===i&&TEST_INFO[id]);
    if(!list.length)return'';
    const card=id=>{const o=L(TEST_INFO[id].tr,TEST_INFO[id].en);const img=TEST_IMG[id];
      return`<div class="ti">${img?`<div class="ti-img"><img src="${esc(abs(img))}" alt=""/></div>`:''}<div class="ti-n">${esc(tName(id))}</div><div class="ti-w">${esc(o.w)}</div><div class="ti-p">${esc(o.p)}</div></div>`;};
    // Pictured tests in an even grid; the ones without a picture as a text list under it.
    const pic=list.filter(id=>TEST_IMG[id]),txt=list.filter(id=>!TEST_IMG[id]);
    return`<div class="ti-sec"><div class="grp-h">${L('Testler Hakkında','About the Tests')}</div>
      ${pic.length?`<div class="ti-grid">${pic.map(card).join('')}</div>`:''}
      ${txt.length?`<div class="ti-list">${txt.map(card).join('')}</div>`:''}</div>`;
  };
  const fmsR=fmsCalc(test.fms);
  const fmsOn=Array.isArray(bat)?fmsInBattery(bat):fmsR.any;
  const fmsMoves=fmsMovesIn(bat);
  const fmsPdf=test.fms&&test.fms.pdf;
  const fmsPages=(fmsPdf&&Array.isArray(fmsPdf.pages))?fmsPdf.pages:[];
  const fmsPageH=fmsPages.length>1?120:185;
  const fmsTone=v=>v==null?'':Number(v)<=1?'#dc2626':Number(v)===2?'#b88400':'#16a34a';
  const yb=ybCalc(test.yBalance);
  const t=test;
  const B={
    anthro:()=>blk('anthro',kv([[L('Boy','Height'),dash(t.height)+' <small>cm</small>'],[L('Kilo','Weight'),dash(t.weight)+' <small>kg</small>'],[L('Kulaç','Wingspan'),dash(t.wingspan)+' <small>cm</small>'],
      [L('Yağ','Body fat'),dash(t.bodyFat)+' <small>%</small>'],[L('Bacak uz.','Leg length'),dash(t.legLength)+' <small>cm</small>'],[L('Oturma yük.','Sitting ht.'),dash(t.sittingHeight)+' <small>cm</small>']])),
    circ:()=>{const c=t.circ||{};const cm=v=>dash(v)+(v?' <small>cm</small>':'');return blk('circ',kv([[L('Omuz','Shoulder'),cm(c.shoulder)],[L('Bel','Waist'),cm(c.waist)],[L('Kalça','Hip'),cm(c.hip)],
      [L('Uyluk R','Thigh R'),cm(c.thighRight||c.thigh)],[L('Uyluk L','Thigh L'),cm(c.thighLeft||c.thigh)],[L('Baldır R','Calf R'),cm(c.calfRight||c.calf)],[L('Baldır L','Calf L'),cm(c.calfLeft||c.calf)]]));},
    posture:()=>{const p=t.posture||{};if(!(p.frontPhoto||p.sidePhoto||p.backPhoto||p.sideLPhoto||p.observations))return'';
      return blk('posture',`<div class="photos">${ph(p.frontPhoto,L('Önden','Front'),132,190)}${ph(p.sidePhoto,L('Yandan (R)','Side (R)'),132,190)}${p.sideLPhoto?ph(p.sideLPhoto,L('Yandan (L)','Side (L)'),132,190):''}${ph(p.backPhoto,L('Arkadan','Back'),132,190)}</div>`);},
    ohs:()=>{const o=t.ohs||{};return blk('ohs',kv([[L('Skor','Score'),`${dash(o.score)} <small>/ 3</small>`,o.score!==''&&o.score!=null?` style="color:${fmsTone(o.score)}"`:'']])
      +((o.frontPhoto||o.sidePhoto)?`<div class="photos">${ph(o.frontPhoto,L('Önden','Front'),150,200)}${ph(o.sidePhoto,L('Yandan','Side'),150,200)}</div>`:''));},
    ankleDF:()=>{const a=t.ankleDF||{};const r=tN(a.right),l=tN(a.left);const d=r!=null&&l!=null?+Math.abs(r-l).toFixed(1):null;
      return blk('ankleDF',kv([[R,r!=null?r+'°':'—'],[Lf,l!=null?l+'°':'—'],[L('Fark','Gap'),d!=null?d+'°':'—',d!=null?` style="color:${d<5?'#16a34a':d<10?'#b88400':'#dc2626'}"`:'']]));},
    aslr:()=>{const a=t.aslr||{};return blk('aslr',kv([[R,`${dash(a.right)} <small>/ 3</small>`,a.right?` style="color:${fmsTone(a.right)}"`:''],[Lf,`${dash(a.left)} <small>/ 3</small>`,a.left?` style="color:${fmsTone(a.left)}"`:'']]));},
    hipRot:()=>{const h=hipRotCalc(t);const g=v=>v!=null?v+'°':'—';
      return blk('hipRot',grid(['',R,Lf,L('Fark','Gap')],[[L('İç rotasyon (IR)','Internal rotation (IR)'),g(h.irR),g(h.irL),g(h.dIr)],[L('Dış rotasyon (ER)','External rotation (ER)'),g(h.erR),g(h.erL),g(h.dEr)],
        [`<b>${L('Toplam ark','Total arc')}</b>`,{v:`<b>${g(h.totR)}</b>`},{v:`<b>${g(h.totL)}</b>`},{v:h.dTot!=null?`${h.dTot}° (${pct(h.pTot)})`:'—',a:colAsym(h.pTot)}]]));},
    thomas:()=>{const th=thomasCalc(t);const g=v=>v!=null?v+'°':'—';
      const call=v=>v==='pos'?{v:L('Pozitif','Positive'),a:' style="color:#dc2626"'}:v==='neg'?{v:L('Negatif','Negative'),a:' style="color:#16a34a"'}:'—';
      return blk('thomas',grid(['',R,Lf],[[L('Uyluk açısı (yataya göre)','Thigh angle (vs horizontal)'),g(th.right.hip),g(th.left.hip)],[L('Diz fleksiyonu','Knee flexion'),g(th.right.knee),g(th.left.knee)],
        ...THOMAS_FIND.map(([k,nm])=>[nm,call(th.right.res[k]),call(th.left.res[k])])]));},
    tSpine:()=>{const x=tSpineCalc(t);return blk('tSpine',kv([[R,x.r!=null?x.r+'°':'—'],[Lf,x.l!=null?x.l+'°':'—'],[L('Fark','Gap'),x.diff!=null?x.diff+'°':'—'],[L('Asimetri','Asymmetry'),pct(x.pct),colAsym(x.pct)]]));},
    yBalance:()=>{const d=v=>v==null?{v:'—'}:{v:v.toFixed(1)+' cm',a:` style="color:${v<4?'#16a34a':'#dc2626'}"`};const n=v=>v!=null?v:'—';
      return blk('yBalance',`<div class="tb-sub">${L('Bacak uzunluğu (SİAS – medial malleol)','Leg length (ASIS – medial malleolus)')}: <b>${yb.limb!=null?yb.limb+' cm':'—'}</b></div>`
        +grid([L('Uzanma (cm)','Reach (cm)'),R,Lf,L('Fark (< 4 cm)','Gap (< 4 cm)')],[['Anterior',n(yb.right.ant),n(yb.left.ant),d(yb.dAnt)],['Posteromedial',n(yb.right.pm),n(yb.left.pm),d(yb.dPm)],['Posterolateral',n(yb.right.pl),n(yb.left.pl),d(yb.dPl)],
          [`<b>${L('Bileşik skor','Composite score')}</b>`,{v:`<b>${yb.compR!=null?yb.compR+'%':'—'}</b>`},{v:`<b>${yb.compL!=null?yb.compL+'%':'—'}</b>`},{v:yb.compR!=null&&yb.compL!=null?Math.abs(yb.compR-yb.compL).toFixed(1)+'%':'—'}]])
        +`<div class="tb-avg">${L('Bileşik = (ANT + PM + PL) / (3 × bacak uzunluğu) × 100','Composite = (ANT + PM + PL) / (3 × leg length) × 100')}</div>`);},
    lateralCmj:()=>{const a=t.lateralCmj||{};const p=asymPct(a.right,a.left,'hi');
      return blk('lateralCmj',kv([[R,dash(a.right)+' <small>cm</small>'],[Lf,dash(a.left)+' <small>cm</small>'],[L('Asimetri','Asymmetry'),pct(p),colAsym(p)]])
        +`<div class="tb-avg">${L('Sağ-sol farkı %10’un altında olmalı; %15 ve üzeri belirgin asimetri.','The right–left gap should stay under 10%; 15% and above is a clear asymmetry.')}</div>`);},
    sprint:()=>{const sp=t.sprintSplits||{},s20=t.sprint20m||{};
      const gates=[[5,sp.t5],[10,sp.t10],[20,s20.time],[30,sp.t30]].map(([d,v])=>({d,t:tN(v)}));
      let prev={d:0,t:0};const segs=gates.map(g=>{if(!(g.t>0))return'—';const o=g.t>prev.t?`${+((g.d-prev.d)/(g.t-prev.t)).toFixed(2)} m/s`:'—';prev={d:g.d,t:g.t};return o;});
      const fv=fvSprint(bw,fvSprintPoints(t));
      const photos=s20.sideStep1||s20.sideStep2||s20.sideStep3||s20.frontRightFoot||s20.frontLeftFoot;
      return blk('sprint',grid(['',...gates.map(g=>g.d+' m'+(g.d===20?' *':''))],[[L('Süre','Time'),...gates.map(g=>g.t!=null?(g.d===20?`<b>${g.t} s</b>`:g.t+' s'):'—')],[L('Bölüm hızı','Segment speed'),...segs]])
        +(fv.ok?kv([['F0',fv.F0rel.toFixed(2)+' <small>N/kg</small>'],['V0 (Vmax)',fv.V0.toFixed(2)+' <small>m/s</small>'],['Pmax',fv.Pmaxrel.toFixed(1)+' <small>W/kg</small>'],['τ',fv.tau.toFixed(2)+' <small>s</small>']]):'')
        +`<div class="tb-avg">* ${L('ana süre','main time')}${fv.ok?' · '+L('Sprint kuvvet-hız profili (Samozino), hava direnci dahil değil.','Sprint force-velocity profile (Samozino), air drag not included.'):''}</div>`
        +(photos?`<div class="photos">${ph(s20.sideStep1,L('1. adım','Step 1'),92,130)}${ph(s20.sideStep2,L('2. adım','Step 2'),92,130)}${ph(s20.sideStep3,L('3. adım','Step 3'),92,130)}${ph(s20.frontRightFoot,L('Sağ ayak','Right foot'),92,130)}${ph(s20.frontLeftFoot,L('Sol ayak','Left foot'),92,130)}</div>`:''));},
    accel:()=>{const a=accelCalc(t);const s=v=>v!=null?v+' <small>s</small>':'—';const ms=v=>v!=null?v+' <small>m/s</small>':'—';
      return blk('accel',kv([['0–5 m',s(a.t5)],['0–10 m',s(a.t10)],[L('5–10 m ara','5–10 m split'),s(a.split)],[L('0–5 m hız','0–5 m speed'),ms(a.v5)],[L('5–10 m hız','5–10 m speed'),ms(a.v510)]]));},
    fiveZeroFive:()=>{const c=cod505Calc(t);const s=v=>v!=null?v+' <small>s</small>':'—';
      return blk('fiveZeroFive',kv([[L('Sağ ayak dönüş','Right-foot turn'),s(c.r)],[L('Sol ayak dönüş','Left-foot turn'),s(c.l)],[L('En iyi','Best'),`<b>${s(c.best)}</b>`],[L('Asimetri','Asymmetry'),pct(c.pct),colAsym(c.pct)]])
        +`<div class="tb-avg">${L('Asimetri = |sağ − sol| / hızlı taraf × 100. %10 altı dengeli, %10-15 izlenmeli, %15 ve üzeri belirgin.','Asymmetry = |right − left| / quicker side × 100. Under 10% balanced, 10-15% watch, 15% and above clear.')}</div>`);},
    ift3015:()=>{const c=iftCalc(t,ath,bw);
      return blk('ift3015',kv([['VIFT',c.vift!=null?`<b>${c.vift}</b> <small>km/h</small>`:'—'],['VIFT (m/s)',c.ms!=null?c.ms:'—'],[L('Tahmini VO2max','Est. VO2max'),c.vo2!=null?c.vo2+` <small>${L('ml/kg/dk','ml/kg/min')}</small>`:'—']])
        +`<div class="tb-avg">${L('VO2max tahmini Buchheit (2008): yaş, cinsiyet, kilo ve VIFT’ten.','VO2max estimate after Buchheit (2008): from age, sex, body mass and VIFT.')}</div>`);},
    pullUp:()=>{const p=t.pullUp||{};return blk('pullUp',kv([[L('Tam tekrar','Full reps'),`<b>${dash(p.reps)}</b>`],[L('Ek yük','Added load'),tN(p.load)!=null?p.load+' <small>kg</small>':'—']]));},
  };
  ['verticalJump','cmj','squatJump','horizontalJump','dropJump','tTest','shuttleRun'].forEach(id=>{
    const u={verticalJump:'cm',cmj:'cm',squatJump:'cm',horizontalJump:'cm',dropJump:'RSI',tTest:'s',shuttleRun:'s'}[id];
    /* One number: a small card, laid side by side with its neighbours (see `groups`). */
    B[id]=()=>{shown.push(id);const note=obsOf(id);
      return{mini:true,html:`<div class="mc"><div class="mc-t">${esc(tName(id))}</div><div class="mc-v">${tN(t[id])!=null?`${esc(t[id])} <small>${u}</small>`:'—'}</div>${tavg(id)}${note&&String(note).trim()?`<div class="tb-note">${esc(note)}</div>`:''}</div>`};};
  });
  STR_LIFTS.forEach(id=>{B[id]=()=>{const c=strCalc(t,id,bw);
    return blk(id,kv([[L('Yük','Load'),c.load!=null?c.load+' <small>kg</small>':'—'],[L('Tekrar','Reps'),dash(c.reps)],['e1RM',c.e1!=null?`<b>${c.e1}</b> <small>kg</small>`:'—'],[L('Göreli','Relative'),c.rel!=null?c.rel+' <small>× BW</small>':'—']])
      +`<div class="tb-avg">${L('e1RM: Epley tahmini (tek tekrarda yükün kendisi, en fazla 12 tekrar).','e1RM: Epley estimate (a single is the load itself, at most 12 reps).')}</div>`);};});
  ['copenhagen','sidePlank'].forEach(id=>{B[id]=()=>{const h=holdCalc(t,id);
    return blk(id,kv([[R,h.r!=null?h.r+' <small>s</small>':'—'],[Lf,h.l!=null?h.l+' <small>s</small>':'—'],[L('Asimetri','Asymmetry'),pct(h.pct),colAsym(h.pct)]]));};});
  /* The FMS in the body of the report is one line: the final score of each movement screened and
     the total. The sheet itself and what each movement is for follow on pages of their own. */
  const fmsBlk=()=>{
    if(fmsPages.length)return`<div class="tb fms-sheet noimg"><div class="tb-bd">
      <div class="tb-t"><span>${L('FMS — Fonksiyonel Hareket Taraması','FMS — Functional Movement Screen')}</span>${fmsR.total!=null?`<span class="k">${L('Toplam','Total')} ${fmsR.total} / 21</span>`:''}</div>
      <div class="fms-pages" style="--fms-ph:${fmsPageH}mm">${fmsPages.map((src,i)=>`<div class="fms-pg"><img src="${String(mediaSrc(src)).replace(/&/g,'&amp;')}" alt=""/>${fmsPages.length>1?`<div class="fms-pgn">${L('Sayfa','Page')} ${i+1}</div>`:''}</div>`).join('')}</div>
      <div class="fms-src">${L('Yüklenen FMS test sonucu','Uploaded FMS test result')}: ${esc(fmsPdf.name||'PDF')}</div></div></div>`;
    if(!fmsR.any)return'';
    const its=fmsR.items.filter(i=>fmsMoves.includes(i.id));
    return`<div class="tb noimg"><div class="tb-bd">
      <div class="tb-t"><span>FMS — Functional Movement Screen</span><span class="k">${L('Toplam','Total')} ${fmsR.total!=null?fmsR.total+' / 21':'—'}</span></div>
      <table class="rt"><tr>${its.map(i=>`<th>${esc(i.en)}</th>`).join('')}</tr><tr>${its.map(i=>`<td${i.score!=null?` style="color:${fmsTone(i.score)}"`:''}>${i.score!=null?i.score:'—'}${i.cleared==='pos'?' <small>'+L('ağrı','pain')+'</small>':''}${i.asym!=null&&i.cleared!=='pos'?' <small>'+L('asim.','asym.')+'</small>':''}</td>`).join('')}</tr></table>
      <div class="tb-avg">${L('Puan kâğıdı ve hareket açıklamaları (görselli) ayrı sayfalarda.','The score sheet and the movement descriptions (with pictures) are on pages of their own.')}</div>
    </div></div>`;
  };
  const groups=TEST_GROUPS.filter(g=>g.id!=='all'&&g.id!=='custom').map(g=>{
    const mine=ids.filter(id=>(TEST_META[id]||{}).g===g.id&&!FMS_PART_IDS.includes(id)&&id!=='fms');
    const parts=[];
    if(g.id==='move'&&fmsOn)parts.push(fmsBlk());
    mine.forEach(id=>{const f=B[id];if(f)parts.push(f());});
    /* The group's one-number tests share one row of small cards, where the first of them stands,
       instead of a full-width block each. */
    const body=[];let row=null;
    parts.filter(Boolean).forEach(p=>{
      if(p.mini){if(!row){row={minis:[]};body.push(row);}row.minis.push(p.html);}
      else body.push(p);
    });
    for(let i=0;i<body.length;i++)if(body[i].minis)body[i]=`<div class="mc-row">${body[i].minis.join('')}</div>`;
    return body.length?`<div class="grp-h">${L(g.tr,g.en)}</div>${body.join('')}`:'';
  }).join('');
  const custom=customSel.length?`<div class="grp-h">${L('Özel Testler','Custom Tests')}</div>
    <div class="tb noimg"><div class="tb-bd">${grid(['Test',L('Sonuç','Result')],customSel.map(c=>[esc(c.name),{v:`<b>${dash((test.custom||{})[c.id])}</b>`}]))}</div></div>`:'';
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'—';
  const gen=L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)));

  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${L('Test Raporu','Test Report')} — ${esc(ath.name)}</title>
<style>
@page{size:A4 portrait;margin:12mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--bg2:#f4f5f7;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--text);font-size:11px;line-height:1.45;background:#fff}
/* Athlete header — one flat dark band */
.athlete-header{display:flex;gap:16px;align-items:center;padding:14px 18px;margin-bottom:6px;background:#0a0b0d;color:#fff;border-radius:10px;break-inside:avoid}
.athlete-photo,.athlete-photo-x{width:64px;height:80px;border-radius:7px;object-fit:cover;flex-shrink:0;border:1px solid #2a2d33}
.athlete-photo-x{display:flex;align-items:center;justify-content:center;background:#1c1f24;color:var(--accent);font-size:22px;font-weight:700}
.athlete-info{flex:1;min-width:0}
.athlete-info h1{font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.1;margin-bottom:4px}
.athlete-info .meta{font-size:10px;color:rgba(255,255,255,.7);line-height:1.55}
.athlete-info .date{display:inline-block;margin-top:7px;font-size:9.5px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:3px 9px;border-radius:5px;letter-spacing:.05em}
.right-block{text-align:right}
.right-block .ttl{font-size:11px;font-weight:600;color:rgba(255,255,255,.6);letter-spacing:.12em;line-height:1.4;text-transform:uppercase}
.right-block .coach-line{margin-top:10px;font-size:9.5px;color:rgba(255,255,255,.75)}
/* Category heading, then one block per test */
.grp-h{margin-top:14px;padding:0 0 5px;border-bottom:1.5px solid #0a0b0d;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;break-after:avoid;page-break-after:avoid}
.tb{padding:10px 0 11px;border-bottom:1px solid var(--border);break-inside:avoid;page-break-inside:avoid}
.tb-bd{min-width:0;display:flex;flex-direction:column;gap:6px}
.tb-t{display:flex;align-items:baseline;gap:8px;font-size:12.5px;font-weight:700;line-height:1.2}
.tb-t .k{margin-left:auto;font-size:9.5px;font-weight:700;color:var(--text)}
.tb-sub{font-size:9px;color:var(--text2)}
.tb-avg{font-size:8.2px;color:var(--muted);line-height:1.35}
.tb-avg span{white-space:nowrap}
.tb-note{font-size:9px;color:var(--text2);line-height:1.45;padding:5px 8px;background:var(--bg2);border-left:2px solid var(--accent);border-radius:0 5px 5px 0}
.tb-note b{color:var(--text);font-weight:600}
/* Results: light heading row, the number large */
table.rt{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.rt th{background:var(--bg2);color:var(--muted);font-weight:600;font-size:7.6px;letter-spacing:.07em;text-transform:uppercase;padding:4px 5px;text-align:center;border-bottom:1px solid var(--border);line-height:1.25}
.rt td{padding:5px 5px;text-align:center;font-size:12px;font-weight:600;color:var(--text);border-top:1px solid var(--border);font-variant-numeric:tabular-nums}
.rt tr:nth-child(2) td{border-top:none}
.rt td small{font-size:8px;font-weight:500;color:var(--muted)}
.rt.lab th.l,.rt.lab td.l{text-align:left;width:34%}
.rt.lab td{font-size:10.5px}
.rt.lab td.l{font-size:9.5px;font-weight:500;color:var(--text2)}
.photos{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:4px 0 2px}
.ph{text-align:center;display:inline-block}
.ph img{border-radius:6px;border:1px solid var(--border);display:block}
.phx{background:var(--bg2);border:1px dashed var(--border);border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--dim);font-size:18px}
.phl{font-size:8.5px;font-weight:500;margin-top:4px;color:var(--muted);letter-spacing:.04em}
.notes-h{margin-top:14px}
/* Testler hakkında: kendi sayfasında başlar, üç sütun; görsel üstte, ad ve açıklama altında */
.ti-sec{break-before:page;page-break-before:always}
.ti-sec .grp-h{margin-top:0}
.ti-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px;margin-top:10px}
.ti{break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;gap:3px}
.ti-img{width:100%;aspect-ratio:16/9;border-radius:5px;overflow:hidden;background:var(--bg2);border:1px solid var(--border);margin-bottom:3px}
.ti-img img{display:block;width:100%;height:100%;object-fit:cover}
.ti-n{font-size:10px;font-weight:700;line-height:1.25}
.ti-w,.ti-p{font-size:8px;line-height:1.4;color:var(--text2)}
.ti-p{color:var(--muted)}
.ti-list{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-top:14px;padding-top:10px;border-top:1px solid var(--border)}
/* tek değerli testler: yan yana küçük kartlar */
.mc-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 0 11px;border-bottom:1px solid var(--border);break-inside:avoid;page-break-inside:avoid}
.mc{border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;break-inside:avoid}
.mc-t{font-size:10.5px;font-weight:700;line-height:1.25}
.mc-v{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.mc-v small{font-size:9px;font-weight:500;color:var(--muted)}
.mc .tb-note{font-size:8.5px;padding:4px 6px}
.obs-box{background:var(--bg2);padding:9px 12px;font-size:10.5px;border-radius:6px;border-left:3px solid var(--accent);margin-top:7px;color:var(--text2);line-height:1.55;break-inside:avoid}
/* A scanned FMS sheet is kept whole on one page; the live sheet is its own page, after everything else. */
.fmsx-page{break-before:page;page-break-before:always}
${FMS_SHEET_CSS}
${FMS_INFO_CSS}
.fms-pages{display:flex;gap:6px;justify-content:center;align-items:flex-start;margin-top:4px}
.fms-pg{flex:1 1 0;min-width:0;text-align:center}
.fms-pg img{display:block;margin:0 auto;max-height:var(--fms-ph,195mm);max-width:100%;border:1px solid var(--border);border-radius:4px;background:#fff}
.fms-pgn{font-size:9px;color:var(--muted);margin-top:3px}
.fms-src{font-size:9px;color:var(--muted);text-align:right}
.footer{text-align:center;font-size:8.5px;color:var(--dim);margin-top:18px;padding-top:8px;border-top:1px solid var(--border);letter-spacing:.06em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
.scr-sp{height:62px}
@media print{.print-bar,.scr-sp{display:none}}
</style>
</head><body>
<div class="print-bar">${L('Test raporu hazır','Test report is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button>
  <div style="font-size:11px;font-weight:400;margin-top:6px;opacity:.9">${L('Yazdırma penceresinde tam renk için "Arka plan grafikleri" seçeneğini (Diğer ayarlar) açın.','In the print dialog, enable "Background graphics" (More settings) for full colours.')}</div>
</div>
<div class="scr-sp"></div>
<div class="athlete-header">
  ${ath.photo?`<img class="athlete-photo" src="${psrc(ath.photo)}"/>`:`<div class="athlete-photo-x">${esc(initials)}</div>`}
  <div class="athlete-info">
    <h1>${esc(ath.name)}</h1>
    <div class="meta">${ath.number?'#'+esc(ath.number)+' · ':''}${esc(posOf(ath.position))}</div>
    <div class="meta">${esc(setup.teamName)} · ${esc(setup.sport)}</div>
    <div class="date">${fdL(test.date)} · ${esc(periodLabel)} ${esc(test.year)}</div>
  </div>
  <div class="right-block">
    <div class="ttl">${L('ÖLÇÜM &amp;','TEST &amp;')}</div>
    <div class="ttl">${L('DEĞERLENDİRME','ASSESSMENT')}</div>
    <div class="coach-line">${L('Testi Alan Antrenör: Emincan Özer','Test Administered by: Emincan Özer')}</div>
  </div>
</div>
${groups}
${custom}
${test.notes?`<div class="grp-h notes-h">${L('Gözlemler ve Yorumlar','Observations &amp; Comments')}</div><div class="obs-box">${esc(test.notes).replace(/\n/g,'<br>')}</div>`:''}
${fmsOn&&fmsR.any&&!fmsPages.length
  /* The score sheet is page 2. It is written last, with the "generated" line at its foot, which is
     right when the report fits on page 1; when it does not, fmsToPage2 moves it in front of the
     first block that would spill over, and the report's own footer goes back at the end. */
  ?`<div class="fmsx-page">${fmsSheetHtml(test,ath,{foot:gen+' · '+esc(setup.teamName)})}</div>
${fmsInfoHtml(fmsMoves)}
<div class="footer" style="display:none">${gen} · ${esc(setup.teamName)}</div>`
  :`<div class="footer">${gen} · ${esc(setup.teamName)}</div>`}
${infoSec()}
</body></html>`;

  w.document.write(html);
  w.document.close();
  // Posture / OHS / sprint photos are full-size and remote, so give them a longer
  // cap than the session sheets before the dialog opens regardless.
  printWhenImagesReady(w,{safety:15000,before:fmsToPage2});
}
/* Puts the FMS score sheet on page 2 of the report (the movement-pattern page follows it as page 3). The page is laid out at the printed width
   (A4 less the 12mm margins) and the blocks after the athlete card are measured against one page
   height: the sheet goes in front of the first block that does not end on page 1, and that block
   follows on page 3. Images are loaded by now, so their heights are real. */
function fmsToPage2(w){
  const d=w.document,sheet=d.querySelector('.fmsx-page');if(!sheet)return;
  const b=d.body,prevW=b.style.width;
  b.style.width='186mm';
  try{
    const probe=d.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;height:273mm';
    b.appendChild(probe);const pageH=probe.offsetHeight*0.97;probe.remove();
    const top=d.documentElement.getBoundingClientRect().top;
    const head=d.querySelector('.athlete-header');
    let el=head&&head.nextElementSibling,cut=null;
    for(;el&&el!==sheet;el=el.nextElementSibling){
      if(el.getBoundingClientRect().bottom-top>pageH){cut=el;break;}
    }
    if(!cut)return;
    // A category heading never stays behind at the foot of page 1 without its first test.
    const pv=cut.previousElementSibling;if(pv&&pv.classList.contains('grp-h'))cut=pv;
    const info=d.querySelector('.fmsi');
    b.insertBefore(sheet,cut);
    sheet.style.breakAfter='page';sheet.style.pageBreakAfter='always';
    if(info){b.insertBefore(info,cut);info.style.breakAfter='page';info.style.pageBreakAfter='always';}   // page 3: what the movements are for
    const gen=sheet.querySelector('.fmsx-gen');if(gen)gen.remove();
    const foot=d.querySelector('body > .footer');if(foot)foot.style.display='';
  }finally{b.style.width=prevW;}
}

