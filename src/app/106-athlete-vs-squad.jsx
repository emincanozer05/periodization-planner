/* =========================================================
   ATHLETE vs SQUAD — the comparison report
   ---------------------------------------------------------
   Print puts the athlete's own session on paper. This sheet answers the other
   question asked in front of the same screen: where does every one of these
   readings sit against the rest of the squad. One row per measurement — the
   athlete's number, the squad average, and a bar that runs to either side of
   that average, so the direction is read before the digits are.

   Two things are deliberate. A measurement with no better side (a height, a
   coach's own test) is drawn grey and kept out of the strengths and
   priorities: taller is not a score. And the axis is set by the data rather
   than fixed — the bulk of the sheet decides how far the bars reach — so a
   squad that sits close together prints readable differences instead of a page
   of flat lines.

   The sheet compares what the comparison table compares, which leaves the
   circumferences out: a waist or a thigh is a shape, not a score, and next to a
   team-mate's it invites a ranking the measurement does not support. They stay
   on the athlete's own record, where they are read against that athlete's
   earlier numbers.

   The squad average is read the same way the test cards read it: every
   team-mate's most recent record that actually carries that measurement. This
   athlete is not in it. An athlete who is in their own average drags the line
   they are being measured against towards themselves — bring in one athlete
   whose body fat sits well above the rest and the average climbs to meet them,
   so the gap the sheet exists to show shrinks by the very reading that caused
   it. The average is the squad the athlete is being held against; the athlete
   is the reading held against it. Rank is the exception and stays inclusive: a
   placing is a placing among everyone who took the test.
   ========================================================= */
const RPT_CMP_GROUPS=[
  {id:'anthro',tr:'Antropometri',       en:'Anthropometry'},
  {id:'pow',   tr:'Güç & Sıçrama',      en:'Power & Jump'},
  {id:'spd',   tr:'Sürat & Çeviklik',   en:'Speed & Agility'},
  {id:'cust',  tr:'Özel Testler',       en:'Custom Tests'},
];
/* Mobility is off this sheet. An ankle angle and an ASLR grade are a screen — a pass
   or a flag on the athlete's own joint — and a squad average of them ranks a clean
   3 against a clean 3. They stay on the test record and on the comparison table,
   where they are read as the screen they are rather than as a placing. */
const RPT_CMP_SKIP=new Set(['mob']);

function printTestCompare(test,ath,setup,customTests,athletes){
  const roster=Array.isArray(athletes)?athletes:[];
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  /* One row per measurement this record actually carries. A blank field is not a
     zero, so it is simply not on the sheet. */
  const rows=[];
  cmpMetrics(customTests).forEach(m=>{
    if(RPT_CMP_SKIP.has(m.g))return;
    const v=m.get(test);
    if(v==null)return;
    /* The team-mates, and only the team-mates. This athlete is the thing being
       measured against the squad, so they are not part of what they are measured
       against — see the note on the sheet's average above. */
    const mates=[];
    roster.forEach(a=>{
      if(a.id===ath.id)return;
      const ts=[...(a.tests||[])].filter(t=>t.date&&m.get(t)!=null)
        .sort((x,y)=>String(x.date).localeCompare(String(y.date)));
      const last=ts[ts.length-1];
      if(last)mates.push({id:a.id,v:m.get(last)});
    });
    const vals=mates.map(p=>p.v);
    const n=vals.length;
    const avg=n?vals.reduce((s,x)=>s+x,0)/n:null;
    const pct=(avg!=null&&avg)?(v-avg)/Math.abs(avg)*100:0;
    const d=(m.dir&&avg!=null)?teamAvgDelta(v,avg,m.dir):null;
    /* Rank is the one column the athlete belongs in: a placing is a placing
       among everyone who took the test, this athlete included. */
    let rank=null;
    if(m.dir&&n){
      const sorted=[...mates,{id:ath.id,v}].sort((x,y)=>m.dir==='lo'?x.v-y.v:y.v-x.v);
      rank=sorted.findIndex(p=>p.id===ath.id)+1;
    }
    rows.push({m,v,avg,pct,rank,n,nAll:n+1,
      lvl:!m.dir?'flat':(d?d.level:'same'),
      min:n?Math.min(...vals):null,max:n?Math.max(...vals):null});
  });
  if(!rows.length){
    alert(L('Karşılaştırılacak veri yok — bu kayıtta henüz ölçüm girilmemiş.',
            'Nothing to compare yet — this record carries no measurement.'));
    return;
  }
  const w=window.open('','_blank','width=1000,height=1200');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}

  /* The axis. It is set by the body of the sheet rather than by its widest
     reading: the asymmetry gaps are differences between two small numbers, so
     one of them at +120% would push every other bar into a stub around the
     centre line. Four readings in five fall inside the axis; the fifth runs off
     the end and is marked with a caret, and the gap column still prints what it
     really was. Never tighter than ±10%, so a squad that sits together does not
     blow a 0.3% difference up into a full-width bar, and never wider than ±60%. */
  const gaps=rows.filter(r=>r.n>0).map(r=>Math.abs(r.pct)).sort((a,b)=>a-b);
  const q80=gaps.length?gaps[Math.min(gaps.length-1,Math.floor(gaps.length*0.8))]:10;
  const scale=Math.min(60,Math.max(10,Math.ceil(q80*1.25/5)*5));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const pos=p=>50+clamp(p,-scale,scale)/scale*50;
  const pctOf=(x,avg)=>avg?(x-avg)/Math.abs(avg)*100:0;
  const sign=p=>(p>0?'+':'')+p.toFixed(1)+'%';
  /* cmpFmt rounds to one decimal and drops a trailing zero, which is right for a
     jump in centimetres and wrong for a sprint: 3.04 s printed as "3" throws away
     the part of the number a coach is reading. Anything measured in seconds, and
     the RSI, keep two decimals. */
  const val=(v,m)=>v==null?'—':((m.u==='s'||m.id==='dj')?Number(v).toFixed(2):cmpFmt(v));

  const scored=rows.filter(r=>r.m.dir&&r.n>0);
  const above=scored.filter(r=>r.lvl==='good').length;
  const below=scored.filter(r=>r.lvl==='poor').length;
  const peers=Math.max(0,...rows.map(r=>r.n));
  const strengths=scored.filter(r=>r.lvl==='good').sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,5);
  const gapsList=scored.filter(r=>r.lvl==='poor').sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,5);

  const bar=r=>{
    if(!r.n)return`<div class="bar"><div class="mid"></div><span class="solo">${esc(L('takımda kıyas yok','no squad reading'))}</span></div>`;
    const p=pos(r.pct),lo=pos(pctOf(r.min,r.avg)),hi=pos(pctOf(r.max,r.avg));
    const a=Math.min(50,p),b=Math.max(50,p);
    const over=Math.abs(r.pct)>scale
      ?`<span class="over" style="${r.pct>0?'right:2px':'left:2px'}">${r.pct>0?'▸':'◂'}</span>`:'';
    return`<div class="bar">
      <div class="rng" style="left:${lo.toFixed(2)}%;width:${Math.max(0.6,hi-lo).toFixed(2)}%"></div>
      <div class="mid"></div>
      <div class="fill ${r.lvl}" style="left:${a.toFixed(2)}%;width:${Math.max(0,b-a).toFixed(2)}%"></div>
      <div class="dot ${r.lvl}" style="left:${p.toFixed(2)}%"></div>${over}
    </div>`;
  };
  const line=r=>`<tr class="mrow">
    <td class="lbl">${esc(cmpLabel(r.m))}${r.m.u?`<span class="u">${esc(r.m.u)}</span>`:''}</td>
    <td class="mine ${r.lvl}">${esc(val(r.v,r.m))}</td>
    <td class="barc">${bar(r)}</td>
    <td class="delta ${r.lvl}">${!r.n?'—':(r.lvl==='same'?esc(L('ort.','avg')):sign(r.pct))}</td>
    <td class="avg">${esc(val(r.avg,r.m))}${r.n?`<span class="nn">n=${r.n}</span>`:''}</td>
    <td class="rank">${r.rank?`<b>${r.rank}</b>/${r.nAll}`:'—'}</td>
  </tr>`;
  const section=g=>{
    const rs=rows.filter(r=>r.m.g===g.id);
    if(!rs.length)return'';
    return`<div class="grp">
      <div class="grp-h"><span>${esc(L(g.tr,g.en))}</span><span class="cnt">${rs.length} ${esc(rs.length===1?L('ölçüm','reading'):L('ölçüm','readings'))}</span></div>
      <table class="mt">
        <colgroup><col style="width:25%"/><col style="width:11%"/><col style="width:33%"/><col style="width:11%"/><col style="width:11%"/><col style="width:9%"/></colgroup>
        <thead><tr>
          <th class="l">${esc(L('Ölçüm','Measurement'))}</th>
          <th>${esc(L('Sporcu','Athlete'))}</th>
          <th>${esc(L('Takım ortalamasına göre','Against the squad average'))}</th>
          <th>${esc(L('Fark','Gap'))}</th>
          <th>${esc(L('Takım ort.','Squad avg'))}</th>
          <th>${esc(L('Sıra','Rank'))}</th>
        </tr></thead>
        <tbody>${rs.map(line).join('')}</tbody>
      </table>
    </div>`;
  };
  const pick=(list,cls,empty)=>list.length
    ?list.map(r=>`<div class="pk ${cls}"><span class="pkn">${esc(cmpLabel(r.m))}</span><span class="pkv">${esc(sign(r.pct))}</span></div>`).join('')
    :`<div class="pk none">${esc(empty)}</div>`;

  /* The tests behind the rows above, in catalog order and each explained once —
     a sheet that ranks an athlete against the squad is read by people who were
     not at the testing, so it says what every reading on it came from. */
  const infoIds=(()=>{const seen=new Set(rows.map(r=>CMP_METRIC_TEST[r.m.id]).filter(Boolean));
    return TEST_CATALOG.filter(c=>seen.has(c.id)&&TEST_INFO[c.id]).map(c=>c.id);})();
  const infoTable=testInfoTable(infoIds);

  const periodLabel=TEST_PERIODS.find(p=>p.id===test.period)?.label||test.period||'';
  const posLabel=POS_FULL[ath.position]||ath.position||'';
  const logo=teamLogo();
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const psrc=p=>String((typeof p==='string'&&p.indexOf('drive:')===0)?driveImg(p.slice(6)):mediaSrc(p)).replace(/&/g,'&amp;');

  const html=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(L('Takım Karşılaştırma','Squad Comparison'))} — ${esc(ath.name||'')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:11mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
:root{--accent:#9aab3a;--good:#16a34a;--poor:#c2410c;--flat:#94a3b8;--border:#e5e7eb;--bg2:#f4f5f7;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;color:var(--text);font-size:10.5px;line-height:1.45;background:#fff}
.mono{font-family:'IBM Plex Mono',monospace}

/* Header — the same dark card the test report opens with, so the two sheets
   read as one pack when they are printed together. */
.hdr{display:flex;gap:18px;align-items:center;padding:16px 20px;background:#0a0b0d;color:#fff;border-radius:14px;margin-bottom:12px}
.hdr .photo{width:74px;height:94px;border-radius:10px;border:1px solid rgba(154,171,58,.4);object-fit:cover;flex-shrink:0;background:#1c2030}
.hdr .photo-x{width:74px;height:94px;border-radius:10px;border:1px solid rgba(154,171,58,.4);background:#1c2030;color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;flex-shrink:0}
.hdr .who{flex:1}
.hdr h1{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.1;color:#fff}
.hdr .meta{font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,.7);margin-top:5px;letter-spacing:.02em}
.hdr .date{display:inline-block;margin-top:9px;font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:600;color:#0a0b0d;background:var(--accent);padding:4px 10px;border-radius:6px;letter-spacing:.05em}
.hdr .rb{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.hdr .rb img{height:30px;width:auto;object-fit:contain}
.hdr .ttl{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:rgba(255,255,255,.6);letter-spacing:.09em;text-transform:uppercase;line-height:1.35}

/* At a glance — the counts first, then the five widest gaps either way. A coach
   who reads nothing else on the sheet has read this. */
.glance{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:11px}
.tile{border:1px solid var(--border);border-radius:11px;padding:9px 11px;background:#fff}
.tile .n{font-size:21px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.tile .t{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-top:3px}
.tile.g .n{color:var(--good)} .tile.p .n{color:var(--poor)}
/* The two counts are out of the readings that have a better side, not out of all
   of them — a height is neither above nor below, so the denominator says so. */
.tile .of{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0}
.picks{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px;break-inside:avoid;page-break-inside:avoid}
.pcol{border:1px solid var(--border);border-radius:11px;padding:10px 12px;background:#fff}
.pcol.g{border-left:3px solid var(--good)} .pcol.p{border-left:3px solid var(--poor)}
.pcol h3{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:7px}
.pk{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:3px 0;border-top:1px solid var(--border)}
.pk:first-of-type{border-top:none}
.pkn{font-size:10.5px;font-weight:600;color:var(--text)}
.pkv{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600}
.pk.g .pkv{color:var(--good)} .pk.p .pkv{color:var(--poor)}
.pk.none{color:var(--dim);font-size:10px;border:none}

/* One block per group. The block is kept whole where the page allows it, so a
   heading never prints at the foot of a sheet with its rows overleaf. */
.grp{margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}
.grp-h{display:flex;justify-content:space-between;align-items:baseline;position:relative;padding:0 0 6px 13px;margin-bottom:4px;border-bottom:1px solid var(--border);font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;page-break-after:avoid;break-after:avoid-page}
.grp-h::before{content:'';position:absolute;left:0;top:1px;width:3px;height:14px;background:var(--accent);border-radius:2px}
.grp-h .cnt{font-weight:400;font-size:8.5px;color:var(--muted);letter-spacing:.05em}
table.mt{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
table.mt th{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:500;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;padding:3px 6px 5px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
table.mt th.l{text-align:left}
table.mt td{padding:5px 6px;border-top:1px solid var(--border);vertical-align:middle}
.mrow:nth-child(even) td{background:#fafbfc}
td.lbl{font-size:10.5px;font-weight:600;text-align:left;line-height:1.2}
td.lbl .u{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:400;color:var(--muted);margin-left:4px}
td.mine{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;text-align:center;letter-spacing:-.01em}
td.mine.good{color:var(--good)} td.mine.poor{color:var(--poor)} td.mine.flat,td.mine.same{color:var(--text)}
td.delta{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600;text-align:center}
td.delta.good{color:var(--good)} td.delta.poor{color:var(--poor)} td.delta.flat,td.delta.same{color:var(--muted)}
td.avg{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;color:var(--text);text-align:center}
td.avg .nn{display:block;font-size:7.5px;font-weight:400;color:var(--dim);letter-spacing:.04em}
td.rank{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:var(--muted);text-align:center}
td.rank b{font-size:12px;color:var(--text)}
td.barc{padding:5px 4px}

/* The bar. The pale band is the team-mates' spread on the same axis, the line is
   the average, the filled length is this athlete's distance from it.

   The average line is the thing every bar in the column is read against, so it
   is drawn as a solid full-strength rule rather than a hairline — at 1px and 55%
   opacity it was losing to the band behind it and to the athlete's own marker,
   which left the eye with nothing fixed to measure from. It sits above the band
   and the fill and below the athlete's marker, so a reading right on the average
   still shows both. */
.bar{position:relative;height:15px;border-radius:4px;background:var(--bg2);overflow:hidden}
.bar .rng{position:absolute;top:0;bottom:0;background:#dbe1e8;border-radius:3px;z-index:1}
.bar .mid{position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:#0a0b0d;opacity:1;z-index:3}
.bar .fill{position:absolute;top:3px;bottom:3px;border-radius:3px;opacity:.9;z-index:2}
.bar .fill.good{background:var(--good)} .bar .fill.poor{background:var(--poor)}
.bar .fill.flat,.bar .fill.same{background:var(--flat)}
.bar .dot{position:absolute;top:1px;width:3px;height:13px;margin-left:-1.5px;border-radius:2px;background:#0a0b0d;z-index:4;box-shadow:0 0 0 1px #fff}
.bar .dot.good{background:#0f7a37} .bar .dot.poor{background:#8f3009}
.bar .solo{position:absolute;left:0;right:0;top:0;line-height:15px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.05em}
/* A reading that runs past the end of the axis. The bar can only reach the edge,
   so the caret says the real gap is wider than it is drawn — the Gap column has
   the number. */
.bar .over{position:absolute;top:0;line-height:15px;font-size:9px;color:#0a0b0d;z-index:4}
.axis{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.05em;margin:0 0 10px;padding:5px 9px;border:1px dashed var(--border);border-radius:8px}
.legend{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--muted);letter-spacing:.04em;margin-bottom:12px}
.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.footer{text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:var(--dim);margin-top:14px;padding-top:9px;border-top:1px solid var(--border);letter-spacing:.05em;line-height:1.6}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;letter-spacing:.04em;z-index:9999;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:8px 18px;border-radius:7px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;margin:0 4px;font-size:13px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.spacer{display:none}}
${TINFO_CSS}
</style>
</head><body>

<div class="print-bar">
  📊 ${esc(L('Takım Karşılaştırma Raporu hazır','Squad Comparison report is ready'))} · <button onclick="window.print()">${esc(L('Yazdır / PDF','Print / Save as PDF'))}</button> · <button class="sec" onclick="window.close()">${esc(L('Kapat','Close'))}</button>
  <div style="font-size:11px;font-weight:400;margin-top:6px;opacity:.95">${L('İpucu: Yazdırma penceresinde tam renk için <strong>"Arka plan grafikleri"</strong> seçeneğini (Diğer ayarlar) açın.','Tip: In the print dialog, enable <strong>"Background graphics"</strong> (More settings) for full colours.')}</div>
</div>
<div class="spacer" style="height:78px"></div>

<div class="fit">
<div class="hdr">
  ${ath.photo?`<img class="photo" src="${psrc(ath.photo)}"/>`:`<div class="photo-x">${esc(initials)}</div>`}
  <div class="who">
    <h1>${esc(ath.name||'—')}</h1>
    <div class="meta">${esc([posLabel,fdL(test.date)].filter(Boolean).join(' · '))}</div>
    <div class="meta">${esc([setup&&setup.teamName,setup&&setup.sport].filter(Boolean).join(' · '))}</div>
    <div class="date">${esc(periodLabel)} ${esc(test.year||'')}</div>
  </div>
  <div class="rb">
    ${logo?`<img src="${esc(mediaSrc(logo))}"/>`:''}
    <div class="ttl">${esc(L('TAKIM','SQUAD'))}</div>
    <div class="ttl">${esc(L('KARŞILAŞTIRMA','COMPARISON'))}</div>
  </div>
</div>

<div class="glance">
  <div class="tile"><div class="n">${rows.length}</div><div class="t">${esc(L('kıyaslanan ölçüm','readings compared'))}</div></div>
  <div class="tile g"><div class="n">${above}<span class="of">/${scored.length}</span></div><div class="t">${esc(L('ortalamanın üstünde','above squad average'))}</div></div>
  <div class="tile p"><div class="n">${below}<span class="of">/${scored.length}</span></div><div class="t">${esc(L('ortalamanın altında','below squad average'))}</div></div>
  <div class="tile"><div class="n">${peers}</div><div class="t">${esc(L('kıyaslanan takım arkadaşı','team-mates compared'))}</div></div>
</div>

<div class="picks">
  <div class="pcol g">
    <h3>${esc(L('Öne çıkanlar','Standing out'))}</h3>
    ${pick(strengths,'g',L('Ortalamanın belirgin üstünde bir ölçüm yok.','No reading stands clear of the average.'))}
  </div>
  <div class="pcol p">
    <h3>${esc(L('Öncelikler','Priorities'))}</h3>
    ${pick(gapsList,'p',L('Ortalamanın belirgin altında bir ölçüm yok.','No reading sits clear below the average.'))}
  </div>
</div>

<div class="axis">
  <span>− ${scale}%</span>
  <span>${esc(L('TAKIM ORTALAMASI','SQUAD AVERAGE'))}</span>
  <span>+ ${scale}%</span>
</div>
<div class="legend">
  <span><i style="background:var(--good)"></i>${esc(L('ortalamadan iyi','better than average'))}</span>
  <span><i style="background:var(--poor)"></i>${esc(L('ortalamadan zayıf','weaker than average'))}</span>
  <span><i style="background:var(--flat)"></i>${esc(L('yönü olmayan ölçüm','no better side'))}</span>
  <span><i style="background:#dbe1e8"></i>${esc(L('takım arkadaşlarının en düşük–en yüksek aralığı','team-mates\' low–high range'))}</span>
  <span>▸ ${esc(L('eksenin dışında — gerçek fark, Fark sütununda','past the end of the axis — the real gap is in the Gap column'))}</span>
</div>

${RPT_CMP_GROUPS.map(section).join('')}
</div>

${infoTable?`<div class="grp tinfo-grp">
  <div class="grp-h"><span>${esc(L('TEST İÇERİĞİ','TEST CONTENT'))}</span><span class="cnt">${infoIds.length} ${esc(infoIds.length===1?'test':L('test','tests'))}</span></div>
  <div class="tinfo-h">${esc(L('Bu sayfadaki testler hakkında','About the tests on this sheet'))}</div>
  ${infoTable}
</div>`:''}

<div class="footer">
  ${esc(L('Takım ortalaması: her takım arkadaşının o ölçümü taşıyan en güncel kaydı. Bu sporcu kendi ortalamasına dahil edilmez — n, kıyaslanan takım arkadaşı sayısıdır. Sıra ise testi alan herkes arasında, bu sporcu dahil. Yönü olmayan ölçümler (boy, özel testler) iyi/zayıf olarak işaretlenmez. Çevre ölçümleri kıyaslanmaz — bel ya da uyluk bir puan değil, bir şekildir; sporcunun kendi kaydında kalır.',
          'Squad average: every team-mate\'s most recent record carrying that measurement. This athlete is left out of their own average — n is the number of team-mates compared. Rank does include them: it is a placing among everyone who took the test. Measurements with no better side (height, custom tests) are never marked better or weaker. Circumferences are not compared — a waist is a shape, not a score; they stay on the athlete\'s own record.'))}
  <br>${esc(L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today))))}${setup&&setup.teamName?' · '+esc(setup.teamName):''}
</div>

</body></html>`;

  w.document.write(html);
  w.document.close();
  /* Everything above the test-content block is one page's worth of sheet, so the
     block lands on page two. It only stays there if the measurements actually fit
     a page: a record carrying every reading runs about a page and a fifth, and
     the spill — often two or three lonely rows — pushed the block to page three
     with a near-empty page in front of it.

     So the sheet measures itself against the paper before printing and, only when
     it is over, shrinks the measurement part just enough to fit. A record that
     already fits is left alone. The floor is there because past it the sheet
     stops being readable across a desk; a record big enough to hit it (every
     built-in reading plus a pile of the coach's own tests) spills to page three
     as before, which is honest — that sheet does not fit on one page.

     Measuring has to happen at the paper's width, not the window's: the window is
     opened at 1000px and the page is 188mm wide, and text that wraps differently
     measures a different height. */
  printWhenImagesReady(w,{before:fitCompareToPage});
}
/* A4 portrait at the 11mm margin the sheet sets in @page, in CSS px. */
const RPT_CMP_PAGE_W='188mm';
const RPT_CMP_PAGE_H=275/25.4*96;
const RPT_CMP_FIT_MIN=0.74;
function fitCompareToPage(w){
  const doc=w.document,box=doc.querySelector('.fit');
  if(!box)return;
  const body=doc.body,prevW=body.style.width;
  body.style.width=RPT_CMP_PAGE_W;
  try{
    let k=1;
    /* Zoom reflows rather than just scaling pixels, so the height does not fall
       exactly in step with it — a couple of passes settle it. */
    for(let i=0;i<4;i++){
      const h=box.getBoundingClientRect().height;
      if(h<=RPT_CMP_PAGE_H)break;
      k=Math.max(RPT_CMP_FIT_MIN,k*(RPT_CMP_PAGE_H/h));
      box.style.zoom=k;
      if(k<=RPT_CMP_FIT_MIN)break;
    }
  }finally{body.style.width=prevW;}
}

