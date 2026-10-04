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
      ${valid.map((p,i)=>`<circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"/><text x="${xs[i].toFixed(1)}" y="${(ys[i]-13).toFixed(1)}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="17" font-weight="700" fill="${color}">${p.v}</text>`).join('')}
      ${data.map((_,i)=>`<text x="${X(i).toFixed(1)}" y="${ch-8}" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="13" fill="#9ca3af">${labels[i]}</text>`).join('')}
    </svg>`;
  };
  const period=`${fdL(sorted[0].date)} → ${fdL(sorted[sorted.length-1].date)}`;
  const rows=sorted.slice().reverse().slice(0,5).map(m=>`<tr><td>${fd(m.date)}</td><td>${m.height||'—'}</td><td>${m.weight||'—'}</td><td>${m.bodyFat||'—'}</td><td>${m.wingspan||'—'}</td></tr>`).join('');
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Body Composition — ${ath.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:8mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--bg2:#f4f5f7}
html,body{height:auto}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10px;line-height:1.4;background:#fff}
.hdr{display:flex;align-items:center;gap:18px;padding:16px 22px;background:linear-gradient(120deg,#0a0b0d 0%,#15171c 100%);color:#fff;border-radius:14px;margin-bottom:14px}
.hdr .av{width:62px;height:62px;border-radius:14px;background:#1c2030;border:2px solid rgba(154,171,58,.55);display:grid;place-items:center;font-weight:700;font-size:20px;color:var(--accent);letter-spacing:-.02em;flex:none;overflow:hidden;padding:2px}
.hdr .av img{width:100%;height:100%;object-fit:cover;border-radius:11px;display:block}
.hdr .info{min-width:0}
.hdr .info h1{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.05}
.hdr .info .meta{font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,.65);margin-top:5px;letter-spacing:.04em}
.hdr .info .date{display:inline-block;margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:4px 11px;border-radius:6px;letter-spacing:.06em}
.hdr .ttl{margin-left:auto;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.mcards{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.mcard{background:#fff;border:1px solid var(--border);border-radius:13px;padding:15px 17px;box-shadow:0 1px 3px rgba(15,23,42,.05);display:flex;flex-direction:column}
.mcard .mc-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px;padding-bottom:9px;border-bottom:1px solid var(--border)}
.mcard .mc-t{font-size:15px;font-weight:700;letter-spacing:-.01em;color:var(--text)}
.mcard .mc-u{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.mcard .mc-val{display:flex;align-items:baseline;gap:9px;margin-bottom:2px}
.mcard .mc-val .mv{font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1;font-family:'Space Grotesk',sans-serif}
.mcard .mc-val .mu{font-size:12px;font-weight:500;color:var(--dim);margin-left:-4px}
.mcard .mc-val .md{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600}
.mcard .mc-val .md.pos{color:#16a34a}.mcard .mc-val .md.neg{color:#dc2626}
.mcard .mc-chart{margin-top:6px}
.mcard .mc-chart svg{width:100%;height:auto;max-height:150px}
.mcard .empty{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);text-align:center;padding:40px 6px}
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border-radius:9px;overflow:hidden;border:1px solid var(--border);flex:none}
th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:9px;padding:6px;text-align:center;letter-spacing:.08em;text-transform:uppercase;border:none}
td{padding:6px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text);border:none;border-top:1px solid var(--border);background:#fff}
.section-h{position:relative;padding:0 0 6px 12px;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:10px;color:var(--text);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border);margin:8px 0 6px;flex:none}
.section-h::before{content:'';position:absolute;left:0;top:1px;width:3px;height:14px;background:var(--accent);border-radius:2px}
.footer{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);margin-top:6px;padding-top:6px;border-top:1px solid var(--border);letter-spacing:.06em;flex:none}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
.empty{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--dim);text-align:center;padding:24px}
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
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:11mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#9aa0a8;--bg2:#f4f5f7}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10px;line-height:1.4;background:#fff}
.ath-cell{display:flex;align-items:center;gap:9px}
.av{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex:none}
.av.ph{display:inline-flex;align-items:center;justify-content:center;background:#0a0b0d;color:var(--accent);font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700}
.ath-nm{font-weight:600;line-height:1.2}
.subm{padding-left:37px;color:var(--dim);font-family:'IBM Plex Mono',monospace}
.hdr{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(120deg,#0a0b0d,#15171c);color:#fff;border-radius:14px;padding:16px 22px;margin-bottom:14px}
.hdr h1{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.05}
.hdr .sub{font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(255,255,255,.65);margin-top:5px;letter-spacing:.04em}
.hdr .ttl{text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.stat{background:#fff;border:1px solid var(--border);border-radius:11px;padding:11px 15px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.stat .k{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.stat .v{font-size:24px;font-weight:700;letter-spacing:-.01em;margin-top:4px}
.stat .v .u{font-size:11px;font-weight:500;color:var(--dim);margin-left:3px}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:11px;overflow:hidden}
th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;padding:9px 8px;text-transform:uppercase;letter-spacing:.06em;text-align:center}
th.l,td.l{text-align:left;padding-left:14px}
td{padding:8px;text-align:center;font-size:11px;border-top:1px solid var(--border);color:var(--text)}
td.l{font-weight:600}
td.b{font-weight:700}
td.mono,td .jn,.dim,.pos,.neg{font-family:'IBM Plex Mono',monospace}
td.mono{font-size:10px;color:var(--muted)}
.jn{font-size:9px;color:var(--dim);margin-right:7px}
.pos{color:#16a34a;font-weight:600}.neg{color:#dc2626;font-weight:600}.dim{color:#c2c6cc}
tbody tr.grp td{border-top:2px solid #cbd5e1}
tbody tr.grp:first-child td{border-top:none}
.footer{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);margin-top:10px;letter-spacing:.06em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;z-index:9999}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
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
  const w=window.open('','_blank','width=900,height=1200');
  if(!w){alert('Pop-up engellendi — tarayıcıdan bu site için pop-up izni ver.');return;}
  const periodLabel=TEST_PERIODS.find(p=>p.id===test.period)?.label||test.period;
  // Raporda SADECE bu kayıtta alınan (bataryada seçili) testler gösterilir.
  // Eski kayıtlarda battery alanı yok → eskisi gibi tüm bölümler basılır.
  const bat=expandBattery(test.battery);
  const has=id=>!Array.isArray(bat)||bat.includes(id);
  const cList=Array.isArray(customTests)?customTests:[];
  const customSel=cList.filter(c=>Array.isArray(bat)?bat.includes(c.id):((test.custom||{})[c.id]||'')!=='');
  const esc=s=>String(s).replace(/</g,'&lt;');
  const powerSel=[['verticalJump',L('Dikey Sıçrama (cm)','Vertical Jump (cm)')],['cmj','CMJ (cm)'],['squatJump','Squat Jump (cm)'],['dropJump','Drop Jump (RSI)'],['horizontalJump',L('Yatay Sıçrama (cm)','Horizontal Jump (cm)')]].filter(([id])=>has(id));
  const soloBlocks=[];
  if(has('tTest'))soloBlocks.push({id:'tTest',h:L('ÇEVİKLİK — T-TEST','AGILITY — T-TEST'),th:L('Çeviklik T-Testi (sn)','Agility T-Test (s)'),v:test.tTest});
  if(has('fiveZeroFive'))soloBlocks.push({id:'fiveZeroFive',h:L('ÇEVİKLİK — 5-0-5','AGILITY — 5-0-5'),th:L('5-0-5 (sn)','5-0-5 (s)'),v:test.fiveZeroFive});
  if(has('shuttleRun'))soloBlocks.push({id:'shuttleRun',h:L('DAYANIKLILIK / KONDİSYON','ENDURANCE / CONDITIONING'),th:L('Mekik Koşusu (sn)','Shuttle Run (s)'),v:test.shuttleRun});
  /* The squad's current average printed under the score it belongs to, worked out
     from the same records the on-screen card reads — this athlete left out of it
     on both, so print and screen cannot disagree. A test nobody else on the roster
     has taken prints nothing at all. */
  const tavgCell=id=>{
    const m=TEAM_AVG_TESTS[id];if(!m)return'';
    const ta=teamAvgOf(athletes,id,ath&&ath.id);if(!ta)return'';
    const d=teamAvgDelta(cmpN(test[id]),ta.avg,m.dir);
    /* The two halves each stay on one line — a narrow column may break between
       them, but never inside "31.2 cm" or "7.7% above". */
    const head=`<span>${L('Takım ort.','Team avg')} ${teamAvgFmt(ta.avg,id)}${m.u?' '+m.u:''}</span>`;
    if(!d)return head;
    const col=d.level==='good'?'#16a34a':d.level==='poor'?'#b45309':'#5c626c';
    const txt=d.level==='same'
      ?L('ortalamada','on the average')
      :`${Math.abs(d.pct).toFixed(1)}% ${d.pct>0?L('üstünde','above'):L('altında','below')}`;
    return`${head} <span style="color:${col};font-weight:600">${txt}</span>`;
  };
  const anyTavg=ids=>ids.some(id=>tavgCell(id)!=='');
  // asymmetries
  const adR=Number(test.ankleDF?.right)||0,adL=Number(test.ankleDF?.left)||0;
  const adD=Math.abs(adR-adL),adMx=Math.max(adR,adL),adPct=adMx?(adD/adMx*100).toFixed(1):'0';
  const slR=Number(test.aslr?.right)||0,slL=Number(test.aslr?.left)||0;
  const slAsym=Math.abs(slR-slL);
  // Lateral CMJ — jump distance per side; asymmetry <10% ok, 10-15% watch, ≥15% flag
  const lcR=Number(test.lateralCmj?.right)||0,lcL=Number(test.lateralCmj?.left)||0;
  const lcD=Math.abs(lcR-lcL),lcMx=Math.max(lcR,lcL);
  const lcPct=(lcR&&lcL)?(lcD/lcMx*100):null;
  const lcColor=lcPct==null?'':lcPct<10?'#16a34a':lcPct<15?'#eab308':'#dc2626';
  // Colour helpers: FMS score 1=red / 2=yellow / 3=green; ankle DF asymmetry 0-5°=green / 5-9°=yellow / ≥10°=red
  const fmsColor=v=>{const n=Number(v);return n===1?'#dc2626':n===2?'#eab308':n===3?'#16a34a':'';};
  const ankleAsymColor=d=>{const n=Math.abs(Number(d)||0);return n<5?'#16a34a':n<10?'#eab308':'#dc2626';};
  /* FMS — only the movements that were actually scored (or whose clearing test
     was run) go on the sheet; a movement left blank is left off entirely. */
  const fmsR=fmsCalc(test.fms);
  const fmsRows=fmsR.items.filter(i=>i.filled||i.cleared);
  /* The uploaded FMS score sheet, rasterised on the way in. It shares its page
     with the scores when both are on the record, so the pages are sized against
     what is left of the page rather than a fixed box. */
  const fmsPdf=test.fms&&test.fms.pdf;
  const fmsPages=(fmsPdf&&Array.isArray(fmsPdf.pages))?fmsPdf.pages:[];
  /* An attached sheet is the result — it already carries the seven movements and
     their scores. Printing the hand-entered table beside it would put the same
     rows on the page twice and cost the section its single page, so the sheet
     replaces the table and only the total stays, on the section's own line. */
  const fmsShowTable=fmsRows.length&&!fmsPages.length;
  const fmsPageH=fmsPages.length>1?120:185;
  const fmsTotalColor=t=>t==null?'':t>=17?'#16a34a':t>=14?'#eab308':'#dc2626';
  // fmsColor leaves 0 uncoloured (it is the "not entered" case elsewhere); on the
  // FMS sheet a 0 is a real, and the worst, score — it prints red like a 1.
  const fmsSc=v=>v===0?'#dc2626':fmsColor(v);
  // Y Balance Test
  const yb=ybCalc(test.yBalance);
  const hasYB=yb.limb!=null||['ant','pm','pl'].some(k=>yb.right[k]!=null||yb.left[k]!=null);
  // Photos are stored either as a plain URL / data-URI or tagged `drive:<fileId>`;
  // the tagged form is not a real URL, so it has to be mapped to Drive's image
  // endpoint the same way the on-screen cards do it.
  const psrc=p=>String((typeof p==='string'&&p.indexOf('drive:')===0)?driveImg(p.slice(6)):mediaSrc(p)).replace(/&/g,'&amp;');
  // A photo that cannot be downloaded (removed from storage, Drive link not
  // shared) would collapse to a 1px line in the print-out — swap in the same
  // placeholder the report uses for a missing photo so the gap is readable.
  const phFail=(w,h)=>`onerror="this.outerHTML='&lt;div class=&quot;phx&quot; style=&quot;width:${w}px;height:${h}px&quot;&gt;—&lt;/div&gt;'"`;
  // photo helper — preserves original aspect ratio.
  // `w` = display width (px), `maxH` = max height before scaling kicks in.
  // Empty/missing photo shows a placeholder with the same target size.
  const ph=(photo,label,w=160,maxH=240)=>photo
    ?`<div class="ph"><img src="${psrc(photo)}" ${phFail(w,Math.round(w*1.2))} style="width:${w}px;height:auto;max-height:${maxH}px;object-fit:contain;background:#f8fafc"/><div class="phl">${label}</div></div>`
    :`<div class="ph"><div class="phx" style="width:${w}px;height:${Math.round(w*1.2)}px">—</div><div class="phl" style="color:#aaa">${label}</div></div>`;
  const ohsBox=`&lt;div style=&quot;width:100%;height:170px;background:#eee;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:24px;border-radius:4px&quot;&gt;—&lt;/div&gt;`;
  /* What each test on this sheet is and why it was taken — the sheet leaves the
     club, so the number goes out with the test in plain words beside it. */
  const infoTable=testInfoTable(testInfoIds(test));
  const ohsPh=(photo)=>photo
    ?`<img src="${psrc(photo)}" onerror="this.outerHTML='${ohsBox}'" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:4px"/>`
    :`<div style="width:100%;height:170px;background:#eee;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:24px;border-radius:4px">—</div>`;

  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${L('Test Raporu','Test Report')} — ${ath.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:12mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--bg:#ffffff;--bg2:#f4f5f7;--panel:#ffffff;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:11px;line-height:1.5;background:#fff}
.mono{font-family:'IBM Plex Mono',monospace}
/* Tables — rounded, single dark header */
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border-radius:10px;overflow:hidden;border:1px solid var(--border);margin-top:6px}
th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:10px;padding:9px 7px;text-align:center;letter-spacing:.08em;text-transform:uppercase;border:none}
td{padding:11px 7px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text);border:none;border-top:1px solid var(--border);background:#fff;font-weight:500}
.kv td{font-size:15px;font-weight:600;padding:14px 7px;color:var(--text);font-family:'Space Grotesk',Arial,sans-serif;letter-spacing:-.01em}
/* Team average under the score it belongs to — a footnote to the number, not a number of its own */
.kv tr.tavg td{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;color:var(--muted);padding:0 6px 10px;border-top:none;letter-spacing:0;line-height:1.35}
.kv tr.tavg td span{white-space:nowrap}
/* Athlete header — dark card matching app theme */
.athlete-header{display:flex;gap:20px;align-items:center;padding:18px 22px;margin-bottom:18px;background:#0a0b0d;color:#fff;border-radius:14px}
.athlete-photo{width:90px;height:115px;border-radius:10px;border:1px solid rgba(154,171,58,.4);object-fit:cover;flex-shrink:0}
.athlete-photo-x{width:90px;height:115px;border-radius:10px;border:1px solid rgba(154,171,58,.4);background:#1c2030;color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;flex-shrink:0;letter-spacing:-.02em}
.athlete-info{flex:1}
.athlete-info h1{font-size:24px;margin-bottom:6px;color:#fff;font-weight:700;letter-spacing:-.01em;line-height:1.1}
.athlete-info .meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(255,255,255,.7);line-height:1.6;letter-spacing:.02em}
.athlete-info .date{display:inline-block;margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:4px 11px;border-radius:6px;letter-spacing:.06em}
.right-block{text-align:right}
.right-block .ttl{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;color:rgba(255,255,255,.6);letter-spacing:.08em;line-height:1.4;text-transform:uppercase}
.right-block .coach-line{margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:rgba(255,255,255,.75);letter-spacing:.03em;line-height:1.4}
/* Section header — single lime accent bar, mono uppercase */
.section-h{position:relative;padding:0 0 9px 14px;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:11px;color:var(--text);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border);margin:0 0 6px 0;page-break-after:avoid;break-after:avoid-page}
.section-h::before{content:'';position:absolute;left:0;top:1px;width:3px;height:16px;background:var(--accent);border-radius:2px}
table,.athlete-header,.ph,.obs-box{page-break-inside:avoid;break-inside:avoid}
${TINFO_CSS}
.posture-photos,.ohs-wrap,.ohs-photos,.ohs-problems{break-inside:auto;page-break-inside:auto}
.section{margin-top:18px;break-inside:auto;page-break-inside:auto}
/* Agility and endurance are one number apiece, but at the full section spacing the
   block still claimed about 37mm of page — more than a report usually has left at
   the foot of a sheet, so a single score kept getting pushed onto a page of its own
   with everything above it left blank. Tightened up it needs about 28mm and drops
   into that gap instead. The heading stays glued to its table either way. */
.solo-grid{margin-top:10px}
.solo-grid .section-h{padding-bottom:5px;margin-bottom:3px}
.solo-grid th{padding:6px 7px;line-height:1.25}
.solo-grid .kv td{font-size:14px;padding:6px 7px;line-height:1.25}
.solo-grid .kv tr.tavg td{padding:0 6px 6px}
.solo-grid table{margin-top:3px}
.ph{text-align:center;display:inline-block;margin:0 4px}
.ph img{border-radius:8px;border:1px solid var(--border);display:block}
.phx{background:var(--bg2);border:1px dashed var(--border);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--dim);font-size:24px}
.phl{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;margin-top:6px;color:var(--muted);letter-spacing:.04em}
/* The FMS sheet is read as one thing — the scores and the uploaded score sheet
   together — so it is kept whole on a single page and its pages are sized
   against what is left of that page, never split across two. */
.fms-sheet{page-break-inside:avoid;break-inside:avoid}
.fms-pages{display:flex;gap:6px;justify-content:center;align-items:flex-start;margin-top:8px}
.fms-pg{flex:1 1 0;min-width:0;text-align:center}
/* Height and width are both capped and neither is set: the page keeps its own
   proportions and lands at its true size on the paper, rather than being
   letterboxed inside a box the column width happened to make. */
.fms-pg img{display:block;margin:0 auto;max-height:var(--fms-ph,195mm);max-width:100%;border:1px solid var(--border);border-radius:4px;background:#fff}
.fms-pgn{font-size:9px;color:var(--muted);margin-top:3px}
.fms-src{font-size:9px;color:var(--muted);margin-top:5px;text-align:right}
.posture-photos{display:flex;justify-content:space-around;align-items:flex-start;gap:18px;padding:18px 12px;background:#fff;border:1px solid var(--border);border-radius:10px;margin-top:4px}
.obs-box{background:var(--bg2);padding:11px 14px;font-size:11px;border:1px solid var(--border);border-radius:9px;border-left:3px solid var(--accent);margin-top:8px;color:var(--text2);line-height:1.55}
.obs-box strong{color:var(--text);font-weight:600}
.ohs-wrap{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:4px}
.ohs-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ohs-col{display:flex;align-items:stretch;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:10px;min-height:210px}
.ohs-label{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:11px;color:var(--muted);padding:4px 2px;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;justify-content:center}
.ohs-photo-box{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ohs-problems{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.ohs-problem-h{background:#0a0b0d;color:#fff;padding:6px 8px;font-family:'IBM Plex Mono',monospace;font-weight:500;text-align:center;font-size:10px;letter-spacing:.06em;border-radius:6px 6px 0 0;text-transform:uppercase}
.ohs-problem-c{background:#fff;min-height:50px;padding:8px 10px;font-size:10px;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;white-space:pre-wrap;color:var(--text2);line-height:1.5}
.sprint-panel{display:flex;align-items:stretch;background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:4px;gap:8px}
.sprint-col{display:flex;flex-direction:column}
.sprint-col-h{text-align:center;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:10px;letter-spacing:.08em;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border);color:var(--muted);text-transform:uppercase}
.sprint-row{display:flex;justify-content:space-around;align-items:flex-start;gap:8px;flex:1}
.sprint-sep{width:1px;background:var(--border);margin:8px 4px}
.sprint-section{page-break-inside:avoid;break-inside:avoid}
.footer{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--dim);margin-top:22px;padding-top:10px;border-top:1px solid var(--border);letter-spacing:.06em}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
.print-bar button:hover{filter:brightness(1.07)}
@media print{.print-bar{display:none}}
</style>
</head><body>

<div class="print-bar">
  📄 ${L('Test Raporu hazır','Test Report is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> · <button onclick="window.close()">${L('Kapat','Close')}</button>
  <div style="font-size:11px;font-weight:400;margin-top:6px;opacity:.95">${L('İpucu: Yazdırma penceresinde tam renk için <strong>"Arka plan grafikleri"</strong> seçeneğini (Diğer ayarlar) açın.','Tip: In the print dialog, enable <strong>"Background graphics"</strong> (More settings) for full colors.')}</div>
</div>

<div style="margin-top:50px"></div>

<div class="athlete-header">
  ${ath.photo?`<img class="athlete-photo" src="${psrc(ath.photo)}"/>`:`<div class="athlete-photo-x">👤</div>`}
  <div class="athlete-info">
    <h1>${ath.name}</h1>
    <div class="meta">${ath.number?'#'+ath.number+' · ':''}${posOf(ath.position)}</div>
    <div class="meta">${setup.teamName} · ${setup.sport}</div>
    <div class="date">${fdL(test.date)} · ${periodLabel} ${test.year}</div>
  </div>
  <div class="right-block">
    <div class="ttl">${L('ÖLÇÜM &','TEST &')}</div>
    <div class="ttl">${L('DEĞERLENDİRME','ASSESSMENT')}</div>
    <div class="coach-line">${L('Testi Alan Antrenör: Emincan Özer','Test Administered by: Emincan Özer')}</div>
  </div>
</div>

${has('anthro')?`
<div class="section">
  <div class="section-h" >${L('ANTROPOMETRİ','ANTHROPOMETRICS')}</div>
  <table class="kv">
    <tr><th>${L('Boy (cm)','Height (cm)')}</th><th>${L('Kilo (kg)','Weight (kg)')}</th><th>${L('Kulaç (cm)','Wingspan (cm)')}</th><th>${L('Yağ Oranı (%)','Body Fat (%)')}</th><th>${L('Bacak Uzunluğu (cm)','Leg Length (cm)')}</th><th>${L('Oturma Yüksekliği (cm)','Sitting Height (cm)')}</th></tr>
    <tr><td>${test.height||'—'}</td><td>${test.weight||'—'}</td><td>${test.wingspan||'—'}</td><td>${test.bodyFat||'—'}</td><td>${test.legLength||'—'}</td><td>${test.sittingHeight||'—'}</td></tr>
  </table>
</div>`:''}

${has('circ')?`
<div class="section">
  <div class="section-h" >${L('ÇEVRE ÖLÇÜMLERİ (cm)','CIRCUMFERENCE MEASUREMENTS (cm)')}</div>
  <table class="kv">
    <tr>
      <th>${L('Omuz','Shoulder')}</th>
      <th>${L('Bel','Waist')}</th>
      <th>${L('Kalça','Hip')}</th>
      <th>${L('Uyluk Sağ','Thigh R')}</th>
      <th>${L('Uyluk Sol','Thigh L')}</th>
      <th>${L('Baldır Sağ','Calf R')}</th>
      <th>${L('Baldır Sol','Calf L')}</th>
    </tr>
    <tr>
      <td>${test.circ?.shoulder||'—'}</td>
      <td>${test.circ?.waist||'—'}</td>
      <td>${test.circ?.hip||'—'}</td>
      <td>${test.circ?.thighRight||test.circ?.thigh||'—'}</td>
      <td>${test.circ?.thighLeft||test.circ?.thigh||'—'}</td>
      <td>${test.circ?.calfRight||test.circ?.calf||'—'}</td>
      <td>${test.circ?.calfLeft||test.circ?.calf||'—'}</td>
    </tr>
  </table>
</div>`:''}

${has('posture')&&(test.posture?.frontPhoto||test.posture?.sidePhoto||test.posture?.backPhoto||test.posture?.observations)?`
<div class="section">
  <div class="section-h" >${L('STATİK POSTÜR DEĞERLENDİRMESİ','STATIC POSTURE ASSESSMENT')}</div>
  <div class="posture-photos">
    ${ph(test.posture.frontPhoto,L('Önden','Front'),180,300)}
    ${ph(test.posture.sidePhoto,L('Yandan','Side'),180,300)}
    ${ph(test.posture.backPhoto,L('Arkadan','Back'),180,300)}
  </div>
  ${test.posture.observations?`<div class="obs-box"><strong>${L('Gözlemler:','Observations:')}</strong> ${test.posture.observations.replace(/</g,'&lt;')}</div>`:''}
</div>`:''}

${(has('aslr')||has('ankleDF'))?`
<div class="section">
  <div class="section-h" >${L('MOBİLİTE','MOBILITY')}</div>
  <table>
    <colgroup><col style="width:42%"/><col style="width:16%"/><col style="width:16%"/><col style="width:26%"/></colgroup>
    <tr><th>Test</th><th>${L('Sağ','Right')}</th><th>${L('Sol','Left')}</th><th>${L('Asimetri','Asymmetry')}</th></tr>
    ${has('aslr')?`<tr><td style="text-align:left;font-weight:600">${L('Aktif Düz Bacak Kaldırma (FMS)','Active Straight Leg Raise (FMS)')}<div style="font-weight:400;font-size:9px;color:var(--muted);margin-top:2px">${L('Hamstring esnekliği ve lumbopelvik kontrol','Hamstring flexibility and lumbopelvic control')}</div></td><td${test.aslr?.right?` style="color:${fmsColor(test.aslr.right)};font-weight:600"`:''}>${test.aslr?.right||'—'}</td><td${test.aslr?.left?` style="color:${fmsColor(test.aslr.left)};font-weight:600"`:''}>${test.aslr?.left||'—'}</td><td>${(slR||slL)?slAsym+' pt':'—'}</td></tr>`:''}
    ${has('ankleDF')?`<tr><td style="text-align:left;font-weight:600">${L('Ayak Bileği Dorsifleksiyon (°)','Ankle Dorsiflexion (°)')}<div style="font-weight:400;font-size:9px;color:var(--muted);margin-top:2px">${L('Ayak bileği mobilitesi','Ankle mobility')}</div></td><td>${test.ankleDF?.right||'—'}</td><td>${test.ankleDF?.left||'—'}</td><td${adD?` style="color:${ankleAsymColor(adD)};font-weight:600"`:''}>${adD?`${adD.toFixed(1)}° (${adPct}%)`:'—'}</td></tr>`:''}
  </table>
</div>`:''}

${(Array.isArray(bat)?has('yBalance'):hasYB)?`
<div class="section">
  <div class="section-h">${L('Y BALANCE TESTİ','Y BALANCE TEST')} — ${L('Bacak Uzunluğu','Leg Length')} (ASIS–${L('Medial Malleol','Medial Malleolus')}): ${yb.limb!=null?yb.limb+' cm':'—'}</div>
  <table>
    <colgroup><col style="width:34%"/><col style="width:17%"/><col style="width:17%"/><col style="width:32%"/></colgroup>
    <tr><th>${L('Uzanma Yönü','Reach Direction')}</th><th>${L('Sağ (cm)','Right (cm)')}</th><th>${L('Sol (cm)','Left (cm)')}</th><th>${L('Fark','Difference')}</th></tr>
    ${[['Anterior',yb.right.ant,yb.left.ant,yb.dAnt],['Posteromedial',yb.right.pm,yb.left.pm,yb.dPm],['Posterolateral',yb.right.pl,yb.left.pl,yb.dPl]].map(([lbl,r,l,d])=>`<tr><td style="text-align:left;font-weight:600">${lbl}</td><td>${r!=null?r:'—'}</td><td>${l!=null?l:'—'}</td><td${d!=null?` style="color:${d<4?'#16a34a':'#dc2626'};font-weight:600"`:''}>${d==null?'—':d.toFixed(1)+' cm '+(d<4?'✓':'⚠')}</td></tr>`).join('')}
  </table>
  <table class="kv" style="margin-top:8px">
    <tr><th>${L('Kompozit Skor — Sağ','Composite Score — Right')} (%)</th><th>${L('Kompozit Skor — Sol','Composite Score — Left')} (%)</th></tr>
    <tr><td>${yb.compR!=null?yb.compR:'—'}</td><td>${yb.compL!=null?yb.compL:'—'}</td></tr>
  </table>
  <div class="obs-box">${L('Kompozit Skor = (Anterior + Posteromedial + Posterolateral) / (3 × Bacak Uzunluğu) × 100 — sağ/sol uzanma farkı 4 cm’den az olmalıdır.','Composite Score = (Anterior + Posteromedial + Posterolateral) / (3 × Leg Length) × 100 — R/L reach difference should be less than 4 cm.')}</div>
</div>`:''}

${has('ohs')?`
<div class="section">
  <div class="section-h" >${L('OVERHEAD SQUAT DEĞERLENDİRMESİ','OVERHEAD SQUAT ASSESSMENT')} — ${L('Skor','Score')}: ${test.ohs?.score||'—'} / 3</div>
  <div class="ohs-wrap">
    <div class="ohs-photos">
      <div class="ohs-col"><div class="ohs-label">${L('Önden','Front View')}</div><div class="ohs-photo-box">${ohsPh(test.ohs?.frontPhoto)}</div></div>
      <div class="ohs-col"><div class="ohs-label">${L('Yandan','Side View')}</div><div class="ohs-photo-box">${ohsPh(test.ohs?.sidePhoto)}</div></div>
      <div class="ohs-col"><div class="ohs-label">${L('Arkadan','Back View')}</div><div class="ohs-photo-box">${ohsPh(test.ohs?.backPhoto)}</div></div>
    </div>
    ${test.ohs?.observations?`<div class="obs-box" style="margin-top:8px"><strong>${L('Gözlemler:','Observations:')}</strong> ${test.ohs.observations.replace(/</g,'&lt;')}</div>`:''}
  </div>
</div>`:''}

${(Array.isArray(bat)?has('fms'):fmsR.any)&&(fmsShowTable||fmsPages.length)?`
<div class="section fms-sheet">
  <div class="section-h">${L('FMS — FONKSİYONEL HAREKET TARAMASI','FMS — FUNCTIONAL MOVEMENT SCREEN')}${fmsR.total!=null?` — ${L('Toplam','Total')}: <span style="color:${fmsTotalColor(fmsR.total)}">${fmsR.total} / 21</span>`:''}${fmsR.n>0&&fmsR.n<7?` <span style="font-weight:400">(${fmsR.n}/7 ${L('hareket','movements')})</span>`:''}</div>
  ${fmsShowTable?`<table>
    <colgroup><col style="width:40%"/><col style="width:13%"/><col style="width:13%"/><col style="width:13%"/><col style="width:21%"/></colgroup>
    <tr><th>${L('Hareket','Movement')}</th><th>${L('Sağ','Right')}</th><th>${L('Sol','Left')}</th><th>${L('Skor','Score')}</th><th>${L('Not','Note')}</th></tr>
    ${fmsRows.map(i=>{
      const nm=L(i.tr,i.en);
      const clr=i.cleared?`<div style="font-weight:400;font-size:9px;color:${i.cleared==='pos'?'#dc2626':'var(--muted)'};margin-top:2px">${L(i.clearTr,i.clearEn)}: ${i.cleared==='pos'?L('Pozitif (ağrı)','Positive (pain)'):L('Negatif','Negative')}</div>`:'';
      const note=i.cleared==='pos'?L('Temizleme testi pozitif → 0','Clearing test positive → 0')
        :i.asym!=null?`${L('Asimetri','Asymmetry')} ${i.asym} pt`
        :i.score===0?L('Ağrı / yapılamadı','Pain / unable'):'—';
      const noteCol=i.cleared==='pos'||i.score===0?'#dc2626':i.asym!=null?'#eab308':'';
      return`<tr><td style="text-align:left;font-weight:600">${nm}${clr}</td>`
        +`<td${i.right!=null?` style="color:${fmsSc(i.right)};font-weight:600"`:''}>${i.bi?(i.right!=null?i.right:'—'):'—'}</td>`
        +`<td${i.left!=null?` style="color:${fmsSc(i.left)};font-weight:600"`:''}>${i.bi?(i.left!=null?i.left:'—'):'—'}</td>`
        +`<td${i.score!=null?` style="color:${fmsSc(i.score)};font-weight:700"`:''}>${i.score!=null?i.score+' / 3':'—'}</td>`
        +`<td${noteCol?` style="color:${noteCol};font-weight:600"`:''}>${note}</td></tr>`;
    }).join('')}
  </table>
  <div class="obs-box">${L('Her hareket 0-3 arasında puanlanır; çift taraflı hareketlerde düşük olan taraf geçerlidir. Temizleme testinin pozitif (ağrılı) çıkması ilgili hareketi 0 yapar. Toplam skor 21 üzerindendir; 14 ve altı yaralanma riski açısından dikkat gerektirir.','Each movement is scored 0-3; on the bilateral movements the lower side is the one that counts. A positive (painful) clearing test drops its movement to 0. The total is out of 21; 14 or below warrants attention on injury risk.')}</div>`:''}
  ${fmsPages.length?`<div class="fms-pages" style="--fms-ph:${fmsPageH}mm">
    ${fmsPages.map((src,i)=>`<div class="fms-pg"><img src="${String(mediaSrc(src)).replace(/&/g,'&amp;')}" alt=""/>${fmsPages.length>1?`<div class="fms-pgn">${L('Sayfa','Page')} ${i+1}</div>`:''}</div>`).join('')}
  </div>
  <div class="fms-src">${L('Yüklenen FMS test sonucu','Uploaded FMS test result')}: ${esc(fmsPdf.name||'PDF')}</div>`:''}
  ${test.fms?.observations?`<div class="obs-box"><strong>${L('Gözlemler:','Observations:')}</strong> ${test.fms.observations.replace(/</g,'&lt;')}</div>`:''}
</div>`:''}

${has('sprint')?`
<div class="section sprint-section">
  <div class="section-h" >${L('20M SPRINT ANALİZİ','20M SPRINT ANALYSIS')}${test.sprint20m?.time?' — '+test.sprint20m.time+L(' sn',' s'):''}</div>
  <div class="sprint-panel">
    <div class="sprint-col" style="flex:3">
      <div class="sprint-col-h" >${L('YANDAN','SIDE VIEW')}</div>
      <div class="sprint-row">
        ${ph(test.sprint20m?.sideStep1,L('1. Adım','Step 1'),105,150)}
        ${ph(test.sprint20m?.sideStep2,L('2. Adım','Step 2'),105,150)}
        ${ph(test.sprint20m?.sideStep3,L('3. Adım','Step 3'),105,150)}
      </div>
    </div>
    <div class="sprint-sep"></div>
    <div class="sprint-col" style="flex:2">
      <div class="sprint-col-h" >${L('ÖNDEN','FRONT VIEW')}</div>
      <div class="sprint-row">
        ${ph(test.sprint20m?.frontRightFoot,L('Sağ Ayak','Right Foot'),120,165)}
        ${ph(test.sprint20m?.frontLeftFoot,L('Sol Ayak','Left Foot'),120,165)}
      </div>
    </div>
  </div>
</div>`:''}

${powerSel.length?`
<div class="section">
  <div class="section-h" >${L('GÜÇ TESTLERİ','POWER TESTS')}</div>
  <table class="kv">
    <tr>${powerSel.map(([,lbl])=>`<th>${lbl}</th>`).join('')}</tr>
    <tr>${powerSel.map(([id])=>`<td>${test[id]||'—'}</td>`).join('')}</tr>
    ${anyTavg(powerSel.map(([id])=>id))?`<tr class="tavg">${powerSel.map(([id])=>`<td>${tavgCell(id)}</td>`).join('')}</tr>`:''}
  </table>
</div>`:''}

${has('lateralCmj')?`
<div class="section">
  <div class="section-h" >${L('LATERAL CMJ — YANA SIÇRAMA','LATERAL CMJ')}</div>
  <table>
    <colgroup><col style="width:34%"/><col style="width:33%"/><col style="width:33%"/></colgroup>
    <tr><th>${L('Sağ (cm)','Right (cm)')}</th><th>${L('Sol (cm)','Left (cm)')}</th><th>${L('Asimetri','Asymmetry')}</th></tr>
    <tr>
      <td>${test.lateralCmj?.right||'—'}</td>
      <td>${test.lateralCmj?.left||'—'}</td>
      <td${lcPct!=null?` style="color:${lcColor};font-weight:600"`:''}>${lcPct!=null?`${lcD.toFixed(1)} cm (${lcPct.toFixed(1)}%) ${lcPct<10?'✓':'⚠'}`:'—'}</td>
    </tr>
  </table>
  <div class="obs-box">${L('Sağ/sol yana sıçrama farkı %10’un altında olmalıdır; %15 ve üzeri belirgin asimetri işaretidir.','R/L lateral jump difference should stay below 10%; 15% and above marks a clear asymmetry.')}</div>
</div>`:''}

${soloBlocks.length?`
<div class="section solo-grid" style="display:grid;grid-template-columns:repeat(${Math.min(soloBlocks.length,3)},1fr);gap:12px">
  ${soloBlocks.map(b=>`<div>
    <div class="section-h" >${b.h}</div>
    <table class="kv">
      <tr><th>${b.th}</th></tr>
      <tr><td>${b.v||'—'}</td></tr>
      ${tavgCell(b.id)?`<tr class="tavg"><td>${tavgCell(b.id)}</td></tr>`:''}
    </table>
  </div>`).join('')}
</div>`:''}

${customSel.length?`
<div class="section">
  <div class="section-h" >${L('ÖZEL TESTLER','CUSTOM TESTS')}</div>
  <table>
    <colgroup><col style="width:60%"/><col style="width:40%"/></colgroup>
    <tr><th>Test</th><th>${L('Sonuç','Result')}</th></tr>
    ${customSel.map(c=>`<tr><td style="text-align:left;font-weight:600">${esc(c.name)}</td><td>${esc((test.custom||{})[c.id]||'—')}</td></tr>`).join('')}
  </table>
</div>`:''}

${(test.notes||infoTable)?`
<div class="section">
  <div class="section-h" >${L('GÖZLEMLER VE YORUMLAR','OBSERVATIONS &amp; COMMENTS')}</div>
  ${test.notes?`<div class="obs-box">${test.notes.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>`:''}
  ${infoTable?`<div class="tinfo-h">${L('Bu kayıttaki testler hakkında','About the tests on this record')}</div>${infoTable}`:''}
</div>`:''}

<div class="footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${setup.teamName}</div>

</body></html>`;

  w.document.write(html);
  w.document.close();
  // Posture / OHS / sprint photos are full-size and remote, so give them a longer
  // cap than the session sheets before the dialog opens regardless.
  printWhenImagesReady(w,{safety:15000});
}

