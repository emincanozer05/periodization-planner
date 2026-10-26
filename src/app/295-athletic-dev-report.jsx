/* =========================================================
   ATLETİK GELİŞİM RAPORU — sporcunun ilk testinden bugüne bütün kayıtları tek sayfada:
   özet, test takvimi, kategori kategori grafikler ve karşılaştırma tabloları, fotoğrafı
   olan testlerde tarih tarih görsel karşılaştırma. Ayrı bir pencerede (sayfa) açılır;
   üstteki "Çıktı Al" düğmesi A4 dikey yazdırır / PDF kaydeder.
   Metrik modeli Takım Verileri tablosununki (cmpMetrics); buna çevre ölçüleri ve FMS
   skorları eklenir — burada sporcu yalnızca kendi geçmişiyle karşılaştırılır.
   ========================================================= */
const DEV_GROUPS=[
  {id:'anthro',tr:'Antropometri',en:'Anthropometry'},
  {id:'circ',tr:'Çevre Ölçümleri',en:'Body Circumference'},
  {id:'fms',tr:'FMS — Fonksiyonel Hareket Taraması',en:'FMS — Functional Movement Screen'},
  {id:'mob',tr:'Mobilite & Hareket',en:'Mobility & Movement'},
  {id:'pow',tr:'Güç & Sıçrama',en:'Power & Jump'},
  {id:'spd',tr:'Sürat & Çeviklik',en:'Speed & Agility'},
  {id:'str',tr:'Kuvvet',en:'Strength'},
  {id:'end',tr:'Dayanıklılık',en:'Endurance'},
  {id:'cust',tr:'Özel Testler',en:'Custom Tests'},
];
function devMetrics(customTests){
  const circ=[['shoulder','Omuz','Shoulder'],['waist','Bel','Waist'],['hip','Kalça','Hip'],
    ['thighRight','Uyluk R','Thigh R','thigh'],['thighLeft','Uyluk L','Thigh L','thigh'],
    ['calfRight','Baldır R','Calf R','calf'],['calfLeft','Baldır L','Calf L','calf']]
    .map(([k,tr,en,old])=>({id:'circ_'+k,g:'circ',tr,en,u:'cm',
      get:t=>{const c=t.circ||{};return cmpN(c[k]!==''&&c[k]!=null?c[k]:(old?c[old]:null));}}));
  const fms=[...FMS_ITEMS.map(it=>({id:'fms_'+it.id,g:'fms',tr:it.en,en:it.en,u:'/3',dir:'hi',
      get:t=>{const c=fmsCalc(t.fms).items.find(i=>i.id===it.id);return c?c.score:null;}})),
    // The total only when all seven movements were scored: a partial sum is not out of 21.
    {id:'fmsTot',g:'fms',tr:'FMS Toplam',en:'FMS Total',u:'/21',dir:'hi',
      get:t=>{const r=fmsCalc(t.fms);return r.n===FMS_ITEMS.length?r.total:null;}}];
  return[...cmpMetrics(customTests),...circ,...fms];
}
/* Photo sets compared date by date: each a test's views, read off the record. */
function devPhotoSets(){
  return[
    {id:'posture',tr:'Statik Postür',en:'Static Posture',get:t=>t.posture||{},note:t=>(t.posture||{}).observations,
      views:[['frontPhoto','Önden','Front'],['sidePhoto','Yandan (R)','Side (R)'],['sideLPhoto','Yandan (L)','Side (L)'],['backPhoto','Arkadan','Back']]},
    {id:'ohs',tr:'Overhead Squat',en:'Overhead Squat',get:t=>t.ohs||{},note:t=>(t.ohs||{}).observations,
      views:[['frontPhoto','Önden','Front'],['sidePhoto','Yandan','Side'],['backPhoto','Arkadan','Back']]},
    ...FMS_ITEMS.map(it=>({id:'fms_'+it.id,tr:'FMS '+it.en,en:'FMS '+it.en,get:t=>((t.fms||{}).photos||{})[it.id]||{},
      views:[['front','Önden','Front'],['side','Yandan','Side']]})),
    {id:'sprint',tr:'20 m Sprint',en:'20 m Sprint',get:t=>t.sprint20m||{},
      views:[['sideStep1','1. adım','Step 1'],['sideStep2','2. adım','Step 2'],['sideStep3','3. adım','Step 3'],['frontRightFoot','Sağ ayak','Right foot'],['frontLeftFoot','Sol ayak','Left foot']]},
  ];
}

/* Everything the report shows, computed once for both the page and its printout: the dated
   tests in order, every metric read off every test (change = first → latest reading), the
   summary counts and highlights, the category groups and the photo sets to compare. */
function devReportData(ath,customTests){
  const tests=[...((ath&&ath.tests)||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(!tests.length)return null;
  const n=tests.length,first=tests[0],last=tests[n-1];
  const rows=devMetrics(customTests).map(m=>{
    const vals=tests.map(t=>{try{const v=m.get(t);return v==null||!isFinite(v)?null:+v;}catch(e){return null;}});
    const pts=vals.map((v,i)=>({v,i})).filter(p=>p.v!=null);
    if(!pts.length)return null;
    const a=pts[0],b=pts[pts.length-1];
    const d=pts.length>1?+(b.v-a.v).toFixed(2):null;
    const pct=(d!=null&&a.v)?+((d/Math.abs(a.v))*100).toFixed(1):null;
    const tone=(d==null||d===0||!m.dir)?'neu':((m.dir==='hi')===(d>0)?'up':'down');
    return{m,vals,pts,a,b,d,pct,tone};
  }).filter(Boolean);
  const scored=rows.filter(r=>r.m.dir&&r.d!=null);
  const upN=scored.filter(r=>r.tone==='up').length,downN=scored.filter(r=>r.tone==='down').length,sameN=scored.length-upN-downN;
  // Highlights leave out the side-to-side gaps: a 2° gap halving reads as "−50%", which says more than it means.
  const hl=scored.filter(r=>r.pct!=null&&!/D$/.test(r.m.id));
  const topUp=hl.filter(r=>r.tone==='up').sort((x,y)=>Math.abs(y.pct)-Math.abs(x.pct)).slice(0,4);
  const topDown=hl.filter(r=>r.tone==='down').sort((x,y)=>Math.abs(y.pct)-Math.abs(x.pct)).slice(0,4);
  const days=Math.round((parseD(last.date)-parseD(first.date))/864e5);
  const spanTxt=days<1?L('Tek gün','One day'):days<60?`${days} ${L('gün','days')}`:`${Math.round(days/30.44)} ${L('ay','months')}`;
  const groups=DEV_GROUPS.map(g=>({g,list:rows.filter(r=>r.m.g===g.id)})).filter(x=>x.list.length);
  /* Photos side by side, a row per test date (the first and the latest three past four). */
  const photoSets=devPhotoSets().map(s=>{
    const has=(t,k)=>{const v=s.get(t)[k];return!!(v&&hasMedia(v));};
    let dated=tests.filter(t=>s.views.some(([k])=>has(t,k)));
    if(!dated.length)return null;
    if(dated.length>4)dated=[dated[0],...dated.slice(-3)];
    return{s,dated,views:s.views.filter(([k])=>dated.some(t=>has(t,k))),has};
  }).filter(Boolean);
  return{tests,n,first,last,rows,scored,upN,downN,sameN,topUp,topDown,days,spanTxt,groups,photoSets};
}
// Two decimals at most: a sprint's 3.31 s is not 3.3 s, and a change of 0.07 s is not 0.1 s.
const devFv=v=>v==null?'—':String(+(Math.round(v*100)/100));
const devPer=t=>(TEST_PERIODS.find(p=>p.id===t.period)||{}).label||t.period||'';
const devShortD=ds=>{const d=parseD(ds);return`${MN[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;};

/* The printout: the same report as an A4 portrait sheet in its own window, printed as soon as
   its photos have loaded. */
function printDevReport(ath,setup,customTests){
  const D=devReportData(ath,customTests);
  if(!D){alert(L('Bu sporcunun henüz tarihli test kaydı yok.','This athlete has no dated test records yet.'));return;}
  const w=window.open('','_blank','width=1100,height=1200');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site in the browser.'));return;}
  const{tests,n,first,last,rows,upN,downN,sameN,topUp,topDown,spanTxt}=D;
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const psrc=p=>esc(mediaSrc(p));
  const fv=devFv,shortD=devShortD,per=devPer;
  const pctTxt=p=>p==null?'':L('%'+Math.abs(p),Math.abs(p)+'%');

  const chip=r=>{if(r.d==null)return'<span class="chip neu">—</span>';
    const s=`${r.d>0?'+':r.d<0?'−':''}${fv(Math.abs(r.d))}${r.m.u&&!r.m.u.startsWith('/')?' '+esc(r.m.u):''}`;
    return`<span class="chip ${r.tone}">${s}${r.pct!=null&&r.d!==0?` <i>(${r.d>0?'+':'−'}${pctTxt(r.pct)})</i>`:''}</span>`;};
  const unit=m=>m.u?` <small>${esc(m.u)}</small>`:'';

  /* A metric's trend: one ink line over the tests it was measured in, the latest reading
     marked in the accent colour; values written on the points while there is room for them. */
  const chart=r=>{
    const W=300,H=112,pl=14,pr=14,pt=20,pb=20;
    const vs=r.pts.map(p=>p.v);let lo=Math.min(...vs),hi=Math.max(...vs);
    if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.18;lo-=pad;hi+=pad;
    const xs=r.pts.map((_,k)=>pl+(r.pts.length>1?k/(r.pts.length-1):.5)*(W-pl-pr));
    const Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
    const P=r.pts.map((p,k)=>[xs[k],Y(p.v)]);
    const line=P.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
    const base=H-pb;
    const area=`${P[0][0].toFixed(1)},${base} ${line} ${P[P.length-1][0].toFixed(1)},${base}`;
    const many=r.pts.length>6;
    const showLbl=k=>!many||k===0||k===r.pts.length-1;
    const showX=k=>!many||k===0||k===r.pts.length-1||k%Math.ceil(r.pts.length/5)===0;
    return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cmpLabel(r.m))}">
      <line x1="${pl}" y1="${base}" x2="${W-pr}" y2="${base}" stroke="#e5e7eb"/>
      <polygon points="${area}" fill="rgba(15,23,42,.05)"/>
      <polyline points="${line}" fill="none" stroke="#1f2937" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${P.map((q,k)=>{const isLast=k===P.length-1;const t=tests[r.pts[k].i];
        return`<g><title>${esc(fdL(t.date))}: ${fv(r.pts[k].v)}${r.m.u?' '+esc(r.m.u):''}</title>
        <circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="10" fill="transparent"/>
        <circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${isLast?5:4}" fill="${isLast?'#9aab3a':'#fff'}" stroke="${isLast?'#fff':'#1f2937'}" stroke-width="${isLast?2:1.6}"/>
        ${showLbl(k)?`<text x="${q[0].toFixed(1)}" y="${(q[1]-9).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0a0b0d">${fv(r.pts[k].v)}</text>`:''}</g>`;}).join('')}
      ${P.map((q,k)=>showX(k)?`<text x="${q[0].toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="9" fill="#8b9099">${esc(shortD(tests[r.pts[k].i].date))}</text>`:'').join('')}
    </svg>`;
  };
  const card=r=>`<div class="mc">
    <div class="mc-h"><span class="mc-t">${esc(cmpLabel(r.m))}</span>${chip(r)}</div>
    <div class="mc-v">${fv(r.b.v)}${unit(r.m)}<span class="mc-f">${L('ilk','first')} ${fv(r.a.v)}</span></div>
    ${chart(r)}</div>`;

  /* The table shows every test while they fit; past seven, the first and the latest six. */
  const colIdx=n<=7?tests.map((_,i)=>i):[0,...tests.map((_,i)=>i).slice(-6)];
  const table=list=>`<div class="ct-wrap"><table class="ct"><thead><tr><th class="l">${L('Ölçüm','Measure')}</th>
      ${colIdx.map((i,k)=>`${n>7&&k===1?'<th class="gap">…</th>':''}<th>${esc(fd(tests[i].date))}<span>${esc(per(tests[i]))}</span></th>`).join('')}
      <th>${L('Değişim','Change')}<span>${L('ilk → son','first → latest')}</span></th></tr></thead>
    <tbody>${list.map(r=>`<tr><td class="l">${esc(cmpLabel(r.m))}${r.m.u?` <small>${esc(r.m.u)}</small>`:''}</td>
      ${colIdx.map((i,k)=>`${n>7&&k===1?'<td class="gap"></td>':''}<td${i===r.b.i?' class="cur"':''}>${r.vals[i]!=null?fv(r.vals[i]):'<span class="na">·</span>'}</td>`).join('')}
      <td>${chip(r)}</td></tr>`).join('')}</tbody></table></div>`;

  let secN=0;
  const sh=(title,sub)=>`<div class="sh"><span class="sh-n">${String(++secN).padStart(2,'0')}</span><span>${title}</span>${sub?`<span class="sh-s">${sub}</span>`:''}</div>`;

  const summary=`${sh(L('Özet','Summary'))}
    <div class="kpis">
      <div class="kpi"><div class="k">${L('Test kaydı','Test records')}</div><div class="v">${n}</div><div class="s">${esc(fdL(first.date))}${n>1?' → '+esc(fdL(last.date)):''}</div></div>
      <div class="kpi"><div class="k">${L('Takip süresi','Tracked for')}</div><div class="v">${esc(spanTxt)}</div><div class="s">${rows.length} ${L('farklı ölçüm','measures')}</div></div>
      <div class="kpi up"><div class="k">${L('Gelişen','Improved')}</div><div class="v">${upN}</div><div class="s">${L('ilk teste göre','vs the first test')}</div></div>
      <div class="kpi down"><div class="k">${L('Gerileyen','Declined')}</div><div class="v">${downN}</div><div class="s">${sameN?`${sameN} ${L('ölçüm aynı','unchanged')}`:L('ilk teste göre','vs the first test')}</div></div>
    </div>
    ${n<2?`<div class="note">${L('Karşılaştırma için en az iki test kaydı gerekir; bu rapor şimdilik tek testin değerlerini gösteriyor.','A comparison needs at least two test records; for now this report shows the single test’s values.')}</div>`
    :(topUp.length||topDown.length)?`<div class="hl">
      <div class="hl-c"><div class="hl-t up">${L('En çok gelişen','Most improved')}</div>
        ${topUp.length?topUp.map(r=>`<div class="hl-r"><span>${esc(cmpLabel(r.m))}</span><span class="hl-v">${fv(r.a.v)} → <b>${fv(r.b.v)}</b>${unit(r.m)}</span>${chip(r)}</div>`).join(''):`<div class="hl-x">—</div>`}</div>
      <div class="hl-c"><div class="hl-t down">${L('Takip edilmesi gereken','To keep an eye on')}</div>
        ${topDown.length?topDown.map(r=>`<div class="hl-r"><span>${esc(cmpLabel(r.m))}</span><span class="hl-v">${fv(r.a.v)} → <b>${fv(r.b.v)}</b>${unit(r.m)}</span>${chip(r)}</div>`).join(''):`<div class="hl-x">${L('Gerileyen ölçüm yok.','No measure declined.')}</div>`}</div>
    </div>`:''}
    <div class="tl">${tests.map((t,i)=>{const b=expandBattery(t.battery);const k=Array.isArray(b)?b.length:null;
      return`<div class="tl-i${i===n-1?' cur':''}"><div class="tl-d"></div><div class="tl-t">${esc(fdL(t.date))}</div><div class="tl-s">${esc(per(t))}${k?` · ${k} ${L('test',k===1?'test':'tests')}`:''}</div></div>`;}).join('')}</div>`;

  const groups=D.groups.map(({g,list})=>{
    const charted=list.filter(r=>r.pts.length>1);
    return`<section class="grp">${sh(L(g.tr,g.en),`${list.length} ${L('ölçüm','measures')}`)}
      ${charted.length?`<div class="mcs">${charted.map(card).join('')}</div>`:''}
      ${table(list)}</section>`;
  }).join('');

  /* Photos side by side, a row per test date, each picture whole (never cropped). */
  const photos=D.photoSets.map(({s,dated,views})=>{
    const h=views.length<=2?78:views.length===3?64:views.length===4?54:44;
    return`<div class="pc">
      <div class="pc-h"><span>${esc(L(s.tr,s.en))}</span><span class="k">${dated.length>1?L(dated.length+' test karşılaştırması',dated.length+' tests compared'):L('Tek kayıt','Single record')}</span></div>
      <div class="pc-g" style="grid-template-columns:74px repeat(${views.length},1fr)">
        <div></div>${views.map(([,tr,en])=>`<div class="pc-vh">${esc(L(tr,en))}</div>`).join('')}
        ${dated.map(t=>{const note=s.note&&s.note(t);
          return`<div class="pc-d"><b>${esc(fd(t.date))}</b><span>${esc(per(t))}</span></div>
          ${views.map(([k])=>{const v=s.get(t)[k];return`<div class="pc-ph" style="height:${h}mm">${v&&hasMedia(v)?`<img src="${psrc(v)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'—'}))"/>`:'<span>—</span>'}</div>`;}).join('')}
          ${note&&String(note).trim()?`<div></div><div class="pc-n" style="grid-column:span ${views.length}">${esc(note)}</div>`:''}`;}).join('')}
      </div></div>`;
  });
  const photoSec=photos.length?`<section class="grp">${sh(L('Görsel Karşılaştırma','Visual Comparison'),L('tarihe göre','by date'))}${photos.join('')}</section>`:'';

  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'—';
  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${L('Atletik Gelişim Raporu','Athletic Development Report')} — ${esc(ath.name)}</title>
<style>
@page{size:A4 portrait;margin:12mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--accent:#9aab3a;--bg2:#f4f5f7;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--up:#15803d;--upb:#dcfce7;--down:#b91c1c;--downb:#fee2e2}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--text);font-size:11px;line-height:1.45;background:#fff}
.bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap;background:#0a0b0d;color:#fff;padding:11px 16px;font-size:12.5px;font-weight:500}
.bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-weight:700;cursor:pointer;font-size:13px}
.bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);font-weight:500}
.bar .hint{flex-basis:100%;text-align:center;font-size:10.5px;opacity:.75;font-weight:400}
.sheet{background:#fff}
@media screen{body{background:#eceef1}.sheet{max-width:200mm;margin:22px auto 40px;padding:14mm 13mm;border-radius:6px;box-shadow:0 2px 18px rgba(15,23,42,.1)}}
@media screen and (max-width:640px){.sheet{margin:0;padding:18px 14px;border-radius:0}.kpis{grid-template-columns:1fr 1fr!important}.mcs{grid-template-columns:1fr!important}.hl{grid-template-columns:1fr!important}.ct-wrap{overflow-x:auto}}
@media print{.bar{display:none}}
/* header */
.hd{display:flex;gap:16px;align-items:flex-end;padding-bottom:12px;border-bottom:2.5px solid var(--text)}
.hd .ph,.hd .phx{width:60px;height:74px;border-radius:4px;object-fit:cover;flex:none;border:1px solid var(--border)}
.hd .phx{display:flex;align-items:center;justify-content:center;background:var(--bg2);font-size:20px;font-weight:700;color:var(--text2)}
.hd .in{flex:1;min-width:0}
.hd h1{font-size:25px;font-weight:700;letter-spacing:-.015em;line-height:1.05;margin-bottom:5px;text-transform:uppercase}
.hd .meta{font-size:9.5px;color:var(--muted)}
.hd .date{display:inline-block;margin-top:6px;font-size:9.5px;font-weight:700;padding-left:8px;border-left:3px solid var(--accent)}
.hd .rt{text-align:right;align-self:stretch;display:flex;flex-direction:column;justify-content:space-between}
.hd .ttl{font-size:10px;font-weight:700;letter-spacing:.16em;line-height:1.45;text-transform:uppercase}
.hd .coach{font-size:8.5px;color:var(--muted)}
/* sections */
.sh{display:flex;align-items:baseline;gap:9px;margin:18px 0 9px;padding-bottom:5px;border-bottom:1.5px solid var(--text);font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;break-after:avoid;page-break-after:avoid}
.sh-n{font-size:9px;font-weight:600;color:var(--dim)}
.sh-s{margin-left:auto;font-size:8.5px;font-weight:500;color:var(--dim);letter-spacing:.06em}
.grp{break-inside:auto}
/* summary */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{border:1px solid var(--border2);border-radius:6px;padding:9px 11px;break-inside:avoid}
.kpi .k{font-size:7.6px;font-weight:600;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
.kpi .v{font-size:22px;font-weight:700;line-height:1.15;margin-top:3px;font-variant-numeric:tabular-nums}
.kpi .s{font-size:8.5px;color:var(--dim);margin-top:2px}
.kpi.up{border-top:3px solid var(--up)}.kpi.down{border-top:3px solid var(--down)}
.note{margin-top:8px;padding:8px 10px;border:1px dashed var(--border2);border-radius:6px;font-size:9.5px;color:var(--text2)}
.hl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.hl-c{border:1px solid var(--border2);border-radius:6px;padding:8px 11px;break-inside:avoid}
.hl-t{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.hl-t.up{color:var(--up)}.hl-t.down{color:var(--down)}
.hl-r{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid var(--border);font-size:9.5px}
.hl-r:first-of-type{border-top:none}
.hl-v{color:var(--text2);font-variant-numeric:tabular-nums}
.hl-v small{color:var(--dim)}
.hl-x{font-size:9px;color:var(--dim);padding:4px 0}
.chip{display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
.chip i{font-style:normal;font-weight:500;opacity:.85}
.chip.up{color:var(--up);background:var(--upb)}.chip.down{color:var(--down);background:var(--downb)}.chip.neu{color:var(--text2);background:var(--bg2)}
/* timeline */
.tl{display:flex;flex-wrap:wrap;margin-top:12px;border-top:1px solid var(--border2);padding-top:0}
.tl-i{position:relative;flex:1 1 90px;min-width:90px;max-width:150px;padding:10px 6px 0 0}
.tl-d{position:absolute;top:-5px;left:0;width:9px;height:9px;border-radius:50%;background:#fff;border:2px solid var(--text)}
.tl-i.cur .tl-d{background:var(--accent);border-color:var(--accent)}
.tl-t{font-size:9.5px;font-weight:700}
.tl-s{font-size:8.5px;color:var(--muted)}
/* metric cards */
.mcs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:9px}
.mc{border:1px solid var(--border2);border-radius:6px;padding:8px 9px 4px;break-inside:avoid;page-break-inside:avoid;min-width:0}
.mc-h{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.mc-t{font-size:9.5px;font-weight:700;line-height:1.25;min-width:0}
.mc-v{font-size:19px;font-weight:700;line-height:1.1;margin-top:3px;font-variant-numeric:tabular-nums}
.mc-v small{font-size:9px;font-weight:500;color:var(--muted)}
.mc-f{margin-left:8px;font-size:8.5px;font-weight:500;color:var(--dim)}
.mc svg{display:block;width:100%;height:auto;margin-top:2px;font-family:'Google Sans',Arial,sans-serif}
/* comparison table */
table.ct{width:100%;border-collapse:collapse;table-layout:auto;margin-bottom:6px}
.ct th{font-size:7.6px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:center;padding:0 5px 5px;border-bottom:1.5px solid var(--text);vertical-align:bottom;white-space:nowrap}
.ct th span{display:block;font-size:7px;font-weight:500;color:var(--dim);letter-spacing:.04em}
.ct th.l,.ct td.l{text-align:left}
.ct td{padding:4px 5px;border-bottom:1px solid var(--border);text-align:center;font-size:10px;font-variant-numeric:tabular-nums}
.ct td.l{font-weight:600;font-size:9.5px}
.ct td.l small{font-weight:400;color:var(--dim);font-size:8px}
.ct td.cur{font-weight:700}
.ct .gap{color:var(--dim);width:14px}
.ct .na{color:#c2c6cc}
.ct tr{break-inside:avoid;page-break-inside:avoid}
/* photo comparison */
.pc{border:1px solid var(--border2);border-radius:6px;margin-bottom:9px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.pc-h{display:flex;justify-content:space-between;align-items:baseline;padding:5px 10px;background:var(--bg2);border-bottom:1px solid var(--border2);font-size:10.5px;font-weight:700}
.pc-h .k{font-size:9px;color:var(--text2)}
.pc-g{display:grid;gap:7px;padding:8px 10px 10px;align-items:center}
.pc-vh{font-size:7.6px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:center}
.pc-d{font-size:9.5px;line-height:1.3}.pc-d span{display:block;font-size:8px;color:var(--muted)}
.pc-ph{display:flex;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--border);border-radius:5px;overflow:hidden;color:var(--dim);min-width:0}
.pc-ph img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.pc-n{font-size:8.5px;color:var(--text2);line-height:1.4;margin-top:-3px}
.foot{text-align:center;font-size:8.5px;color:var(--dim);margin-top:18px;padding-top:8px;border-top:1px solid var(--border);letter-spacing:.06em}
</style></head><body>
<div class="bar">${L('Atletik Gelişim Raporu','Athletic Development Report')} · ${esc(ath.name)}
  <button onclick="window.print()">${L('Çıktı Al / PDF','Print / Save as PDF')}</button><button class="sec" onclick="window.close()">${L('Kapat','Close')}</button>
  <div class="hint">${L('Yazdırma penceresinde tam renk için "Arka plan grafikleri" seçeneğini (Diğer ayarlar) açın.','In the print dialog, enable "Background graphics" (More settings) for full colours.')}</div></div>
<div class="sheet">
<div class="hd">
  ${ath.photo?`<img class="ph" src="${psrc(ath.photo)}" alt=""/>`:`<div class="phx">${esc(initials)}</div>`}
  <div class="in"><h1>${esc(ath.name)}</h1>
    <div class="meta">${ath.number?'#'+esc(ath.number)+' · ':''}${esc(posOf(ath.position))}</div>
    <div class="meta">${esc(setup.teamName)}${setup.sport?' · '+esc(setup.sport):''}</div>
    <div class="date">${esc(fdL(first.date))}${n>1?' → '+esc(fdL(last.date)):''} · ${n} ${L('test kaydı',n===1?'test record':'test records')}</div></div>
  <div class="rt"><div class="ttl">${L('Atletik<br>Gelişim Raporu','Athletic<br>Development Report')}</div>
    <div class="coach">${L('Hazırlayan Antrenör: Emincan Özer','Prepared by: Emincan Özer')}</div></div>
</div>
${summary}
${groups}
${photoSec}
<div class="foot">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · ${esc(setup.teamName)} · ${L('Değişim, her ölçümün ilk ve son değeri arasındadır; yeşil gelişmeyi, kırmızı gerilemeyi gösterir.','Change is between each measure’s first and latest reading; green is an improvement, red a decline.')}</div>
</div>
</body></html>`;
  w.document.write(html);
  w.document.close();
  printWhenImagesReady(w,{safety:15000});
}
