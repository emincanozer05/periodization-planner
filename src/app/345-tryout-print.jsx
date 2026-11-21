/* ═══════════════════════════════════════════════════════════════════════════
   SEÇMELER ÇIKTISI — the tryout pool on paper

   Two printouts, both in the house style of the other sheets (ATH_SHEET_CSS: black header
   band with the blue rule, numbered section heads, grey-ruled tables):
   · printTryoutSheet — one candidate on A4 portrait: the verdict first (status, rating,
     trial date, evaluator), then who they are, their family (with the mid-parent height),
     the body measurements, the tests grouped as the catalog groups them — each side in its
     own column with the asymmetry / estimated 1RM / split read off it — and the coach's words.
     It is the sheet handed to a head coach or a family, so nothing on it needs the app.
   · printTryoutList — the pool as filtered on screen, on A4 landscape: one row per candidate,
     their measurements and every test any of them carries, rating and status.
   Both open in their own window and go straight to the print dialog ("Save as PDF").
   ═══════════════════════════════════════════════════════════════════════════ */
const TRYOUT_ST_COL={new:'#64748b',watch:'#d97706',in:'#16a34a',out:'#dc2626'};
const TRY_SHEET_CSS=`
.hd .r .st{display:inline-block;margin-top:6px;padding:3px 9px;border-radius:2px;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff}
.vd{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;border:1px solid var(--ln);border-radius:2px;margin-bottom:4px;break-inside:avoid}
.vd>div{padding:8px 11px;border-left:1px solid var(--ln)}
.vd>div:first-child{border-left:0}
.vd .k{font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--mu);font-weight:600}
.vd .v{font-size:13px;font-weight:700;margin-top:3px;display:flex;align-items:center;gap:7px}
.vd .v .dot{width:9px;height:9px;border-radius:50%;flex:none}
.vd .v .stars{letter-spacing:1px;color:#d4d8de;font-size:13px}
.vd .v .stars b{color:#f59e0b;font-weight:400}
.vd .v small{font-size:9.5px;font-weight:600;color:var(--mu)}
.info{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}
.info .row{display:grid;grid-template-columns:34mm 1fr;gap:8px;padding:5px 2px;border-bottom:1px solid var(--ln);font-size:10px;break-inside:avoid}
.info .row .k{color:var(--mu);font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;padding-top:1px}
.info .row .v{font-weight:600}
.info .row .v.none{color:var(--dim);font-weight:400}
.kvs.six{grid-template-columns:repeat(6,1fr)}
.kv .x{font-size:8.5px;color:var(--mu);margin-top:2px;font-weight:500}
.tg{margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
.tt th.c,.tt td.c{text-align:center}
.tt td{vertical-align:middle}
.tt td.nm{font-weight:600;width:38%}
.tt td.val b{font-size:11.5px}
.tt td.val small{color:var(--mu);margin-left:2px;font-size:8.5px}
.tt td.empty{color:var(--dim)}
.tt td.rd{font-size:9px;color:var(--t2);white-space:nowrap}
.tt td.rd i{font-style:normal;display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:0}
.tt td.rd .ok{background:#16a34a}.tt td.rd .warn{background:#d97706}.tt td.rd .bad{background:#dc2626}
.key2{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:8.5px;color:var(--mu);margin-top:4px}
.key2 i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}
.vt{border:1px solid var(--ln);border-radius:2px;padding:8px 11px;break-inside:avoid;border-top-width:3px}
.vt.good{border-top-color:#16a34a}.vt.work{border-top-color:#d97706}.vt.nt{border-top-color:var(--ink);margin-top:9px}
.sign{justify-content:space-between}
.sign span{flex:1;border-top:1px solid var(--ln2);padding-top:5px;margin-top:22px}
/* the pool list */
body.ls{max-width:273mm;font-size:9px}
.ls .hd h1{font-size:20px}
.ls .sm{display:flex;gap:8px;margin-bottom:10px}
.ls .sm .kv{flex:1;padding:6px 9px}
.ls .sm .kv .v{font-size:15px}
.pl th{font-size:7.2px;letter-spacing:.05em;padding:5px 4px;vertical-align:bottom;line-height:1.25}
.pl th small{display:block;font-weight:500;letter-spacing:0;text-transform:none;color:var(--dim)}
.pl td{font-size:9px;padding:4px 4px;vertical-align:middle}
.pl td.n{white-space:nowrap}
.pl td.n b{font-size:10px}
.pl td.n span{display:block;color:var(--mu);font-size:8px}
.pl td.c,.pl th.c{text-align:center}
.pl td.t{font-weight:600;text-align:center;white-space:nowrap}
.pl td.t.e{color:#c4c9d0;font-weight:400}
.pl .grp th{background:#fff;border-bottom:0;padding-bottom:0;color:var(--acc);font-size:7px}
.pl .av{width:22px;height:22px;border-radius:2px;object-fit:cover;display:block}
.pl .avp{width:22px;height:22px;border-radius:2px;background:var(--soft);border:1px solid var(--ln);display:grid;place-items:center;font-size:8px;font-weight:700;color:var(--mu)}
.pl tr:nth-child(even) td{background:#fafbfc}
.pill2{display:inline-block;padding:2px 6px;border-radius:2px;font-size:7.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;white-space:nowrap}
.stars2{color:#d4d8de;letter-spacing:.5px;white-space:nowrap}.stars2 b{color:#f59e0b;font-weight:400}
`;
/* The shared frame: the window, the print bar, the script that opens the dialog once every
   picture has loaded (as printAthleteInfo does). */
function tryoutPrintWindow(title,body,opts){
  const w=window.open('','_blank',opts&&opts.landscape?'width=1300,height=900':'width=980,height=1200');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="${REPORT_LANG==='tr'?'tr':'en'}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page{size:A4 ${opts&&opts.landscape?'landscape':'portrait'};margin:12mm 12mm 13mm}
${RPT_FONT}
${ATH_SHEET_CSS}
${TRY_SHEET_CSS}
</style></head><body${opts&&opts.landscape?' class="ls"':''}>
<div class="pbar">${esc(title)} · <button onclick="window.print()">${L('Yazdır / PDF olarak kaydet','Print / Save as PDF')}</button><button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
${body}
<script>
(function(){var go=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},350);};
var imgs=[].slice.call(document.images);var left=imgs.filter(function(i){return!i.complete;}).length;
var done=function(){if(--left<=0)ready();};var fired=false;
function ready(){if(fired)return;fired=true;var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
Promise.race([f,new Promise(function(r){setTimeout(r,3000);})]).then(go,go);}
if(!left)ready();else imgs.forEach(function(i){if(!i.complete){i.addEventListener('load',done);i.addEventListener('error',done);}});
setTimeout(ready,20000);})();
<\/script>
</body></html>`);
  w.document.close();
}
const tryoutAge=t=>{if(!t||!t.dateOfBirth)return null;const b=parseD(t.dateOfBirth);const n=new Date();
  let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;return y;};
const tryoutInitials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
const tryoutStars=(n,cls)=>{const r=Math.max(0,Math.min(5,Number(n)||0));
  return`<span class="${cls}"><b>${'★'.repeat(r)}</b>${'★'.repeat(5-r)}</span>`;};
const tryoutGroupList=defs=>[...TEST_GROUPS.filter(g=>g.id!=='all'),{id:'old',tr:'Eski Testler',en:'Retired Tests'}]
  .map(g=>({...g,items:defs.filter(f=>(f.legacy?'old':f.custom?'custom':(f.g||(TEST_META[f.k]||{}).g||'custom'))===g.id)}))
  .filter(g=>g.items.length);

function printTryoutSheet(cand,opts){
  const t=cand||{};const o=opts||{};
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const st=tryoutStatus(t.status);const stC=TRYOUT_ST_COL[st.id]||TRYOUT_ST_COL.new;
  const age=tryoutAge(t);const today_=fdL(fmt(today));
  const n=v=>{const x=String(v==null?'':v).trim();return x;};
  const row=(k,v)=>`<div class="row"><div class="k">${k}</div><div class="v${n(v)?'':' none'}">${n(v)?esc(v):'—'}</div></div>`;
  const kv=(k,v,u,x)=>`<div class="kv"><div class="k">${k}</div><div class="v">${n(v)?esc(v):'—'}${u&&n(v)?`<small>${u}</small>`:''}</div>${x?`<div class="x">${x}</div>`:''}</div>`;
  const secH=(i,tt,d)=>`<div class="sec-h"><span class="n">${i}</span><div><div class="t">${tt}</div>${d?`<div class="d">${d}</div>`:''}</div></div>`;
  const side={R:L('Sağ','Right'),L:L('Sol','Left'),B:L('Çift yönlü','Both')}[t.dominantHand]||'';
  /* ── verdict strip ── */
  const verdict=`<div class="vd">
    <div><div class="k">${L('Durum','Status')}</div><div class="v"><span class="dot" style="background:${stC}"></span>${esc(L(st.tr,st.en))}</div></div>
    <div><div class="k">${L('Puan','Rating')}</div><div class="v">${tryoutStars(t.rating,'stars')}<small>${t.rating?t.rating+'/5':L('puanlanmadı','not rated')}</small></div></div>
    <div><div class="k">${L('Seçme Tarihi','Tryout Date')}</div><div class="v">${t.date?fdL(t.date):'—'}</div></div>
    <div><div class="k">${L('Değerlendiren','Evaluated By')}</div><div class="v">${n(t.scout)?esc(t.scout):'—'}</div></div>
  </div>`;
  /* ── 1 · personal + family ── */
  const ph=TRYOUT_FAMILY.map(f=>Number(t[f.kH])).filter(x=>x>0);
  const mid=ph.length===2?Math.round((ph[0]+ph[1])/2):null;
  const parent=f=>[n(t[f.kName]),n(t[f.kH])?n(t[f.kH])+' cm':''].filter(Boolean).join(' · ');
  const s1=`<section>${secH(1,L('Kişisel ve Aile Bilgileri','Personal & Family Details'))}
    <div class="info">
      <div>${row(L('Doğum Tarihi','Date of Birth'),t.dateOfBirth?fdL(t.dateOfBirth)+(age!=null?` (${age} ${L('yaş','y')})`:''):'')}
        ${row(L('Pozisyon','Position'),t.position?(POS_FULL[t.position]||t.position):'')}
        ${row(L('Kullandığı Taraf','Dominant Side'),side)}
        ${row(L('Şehir','City'),t.city)}${row(L('Okul','School'),t.school)}${row(L('Önceki Kulüp','Previous Club'),t.prevClub)}</div>
      <div>${row(L('Telefon','Phone'),t.phone)}${row('E-mail',t.email)}
        ${TRYOUT_FAMILY.map(f=>row(L(f.tr,f.en),parent(f))).join('')}
        ${row(L('Veli Telefonu','Guardian Phone'),t.guardianPhone)}
        ${row(L('Orta Ebeveyn Boyu','Mid-Parent Height'),mid!=null?mid+' cm':'')}</div>
    </div></section>`;
  /* ── 2 · body ── wingspan over height is the one ratio a scout reads off these boxes */
  const h=Number(t.height),ws=Number(t.wingspan);
  const ape=h>0&&ws>0?Math.round(ws-h):null;
  const s2=`<section>${secH(2,L('Fiziksel Ölçümler','Body Measurements'))}
    <div class="kvs six">${kv(L('Yaş','Age'),age!=null?String(age):'',L('yıl','yrs'))}${kv(L('Boy','Height'),t.height,'cm')}${kv(L('Kilo','Weight'),t.weight,'kg')}
      ${kv(L('Kulaç','Wingspan'),t.wingspan,'cm',ape!=null?L('kulaç − boy: ','wingspan − height: ')+(ape>0?'+':'')+ape+' cm':'')}
      ${kv(L('Ayakkabı No','Shoe Size'),t.shoeSize,'')}${kv(L('Vücut Yağı','Body Fat'),t.bodyFat,'%')}</div></section>`;
  /* ── 3 · tests ── one table per catalog group; a test with parts gets a column per part */
  const defs=tryoutPicked(t).map(k=>tryoutTestDef(k,o.customTests));
  const groups=tryoutGroupList(defs);
  let anyRd=false;
  const testRow=f=>{const v=(t.tests||{})[f.k];const parts=tryoutPartsOf(f.k,v);
    const unit=f.u?tryoutUnit(f.u):'';
    const cell=(x,u)=>n(x)?`<b>${esc(x)}</b>${u?`<small>${esc(u)}</small>`:''}`:'—';
    let vals;
    if(parts&&parts.length<=2)vals=parts.map(p=>`<td class="c val${n(v&&v[p.s])?'':' empty'}"><div class="sw">${esc(L(p.tr,p.en))}</div>${cell(v&&v[p.s],p.u?tryoutUnit(p.u):unit)}</td>`).join('');
    else if(parts)vals=tryoutHas(v)?`<td class="val" colspan="2">${esc(tryoutValText(f.k,v,f))}</td>`:`<td class="c val empty" colspan="2">—</td>`;
    else vals=`<td class="c val${n(v)?'':' empty'}" colspan="2">${cell(typeof v==='string'?v:'',unit)}</td>`;
    const rd=tryoutReadout(f.k,v);if(rd)anyRd=true;
    return`<tr><td class="nm">${esc(L(f.tr,f.en))}</td>${vals}<td class="rd">${rd?`${rd.lvl?`<i class="${rd.lvl}"></i>`:''}${esc(rd.l)}: <b>${esc(rd.v)}</b>`:''}</td></tr>`;};
  const testsHtml=groups.length?groups.map(g=>`<div class="tg"><div class="sub-h">${esc(L(g.tr,g.en))}</div>
      <table class="tt"><colgroup><col style="width:36%"/><col style="width:16%"/><col style="width:16%"/><col/></colgroup>
      ${g.items.map(testRow).join('')}</table></div>`).join('')
    :`<div class="card none">${L('Bu adaya test seçilmedi.','No tests chosen for this candidate.')}</div>`;
  const filled=defs.filter(f=>tryoutHas((t.tests||{})[f.k])).length;
  const s3=`<section>${secH(3,L('Test Sonuçları','Test Results'),defs.length?L(`${defs.length} testten ${filled} tanesi girildi`,`${filled} of ${defs.length} tests entered`):'')}
    ${testsHtml}
    ${anyRd?`<div class="key2"><span><i style="background:#16a34a"></i>${L('dengeli (asimetri < %10)','balanced (asymmetry < 10%)')}</span><span><i style="background:#d97706"></i>${L('izlenmeli (%10–15) · FMS: taraflar farklı','watch (10–15%) · FMS: sides differ')}</span><span><i style="background:#dc2626"></i>${L('belirgin (≥ %15) · FMS: 1 ya da 0','marked (≥ 15%) · FMS: 1 or 0')}</span></div>`:''}
  </section>`;
  /* ── 4 · the coach's words ── */
  const txt=s=>n(s)?`<div class="txt">${esc(s)}</div>`:`<div class="txt none">—</div>`;
  const s4=`<section>${secH(4,L('Değerlendirme','Evaluation'))}
    <div class="two"><div class="vt good"><div class="pk">${L('Güçlü Yönler','Strengths')}</div>${txt(t.strengths)}</div>
      <div class="vt work"><div class="pk">${L('Gelişim Alanları','To Develop')}</div>${txt(t.weaknesses)}</div></div>
    <div class="vt nt"><div class="pk">${L('Notlar','Notes')}</div>${txt(t.notes)}</div>
    <div class="sign"><span>${L('Değerlendiren','Evaluated by')}${n(t.scout)?': <b>'+esc(t.scout)+'</b>':''}</span><span style="margin-left:24px">${L('İmza','Signature')}</span></div>
  </section>`;
  const body=`<div class="hd">
    ${t.photo?`<img class="av" src="${esc(mediaSrc(t.photo))}" alt=""/>`:`<div class="avp">${esc(tryoutInitials(t.name))}</div>`}
    <div><h1>${esc(n(t.name)||L('İsimsiz Aday','Unnamed Candidate'))}</h1>
      <div class="meta">${[t.position?esc(POS_FULL[t.position]||t.position):'',age!=null?age+' '+L('yaş','y'):'',n(t.city)?esc(t.city):'',n(t.prevClub)?esc(t.prevClub):''].filter(Boolean).join(' · ')}</div></div>
    <div class="r">${o.teamName?`<div class="tm"><span>${esc(o.teamName)}</span></div>`:''}<div class="t">${L('Seçme Formu','Tryout Sheet')}</div><div class="d">${today_}</div>
      <span class="st" style="background:${stC}">${esc(L(st.tr,st.en))}</span></div>
  </div>
  ${verdict}${s1}${s2}${s3}${s4}
  <div class="ft"><span>CoachOS · ${L('Seçmeler','Tryouts')}</span><span>${L(`${today_} tarihinde oluşturuldu`,`Generated ${today_}`)}</span></div>`;
  tryoutPrintWindow(`${n(t.name)||L('Aday','Candidate')} — ${L('Seçme Formu','Tryout Sheet')}`,body);
}

function printTryoutList(list,opts){
  const o=opts||{};const rows=Array.isArray(list)?list:[];
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const n=v=>String(v==null?'':v).trim();
  const today_=fdL(fmt(today));
  /* Every test any listed candidate carries a number for, grouped as the catalog groups
     them; a test with parts prints its parts in one cell (S 38 · L 35). */
  const keys=[...new Set(rows.flatMap(t=>tryoutPicked(t).filter(k=>tryoutHas((t.tests||{})[k]))))];
  const defs=keys.map(k=>tryoutTestDef(k,o.customTests));
  const groups=tryoutGroupList(defs);
  const cols=groups.flatMap(g=>g.items.map((f,i)=>({...f,gid:g.id,gl:i===0?L(g.tr,g.en):'',gn:g.items.length})));
  const short=f=>{const v=f;return L(v.tr,v.en);};
  const cellOf=(t,f)=>{const v=(t.tests||{})[f.k];if(!tryoutHas(v))return`<td class="t e">—</td>`;
    const parts=tryoutPartsOf(f.k,v);
    if(!parts)return`<td class="t">${esc(n(v))}</td>`;
    // Every part in its fixed place (sağ / sol, IR S / IR L…), a missing one as a dash, so the
    // column header names each position once.
    return`<td class="t">${parts.map(p=>n(v[p.s])?esc(n(v[p.s])):'<span class="sw">–</span>').join(' / ')}</td>`;};
  const sorted=rows.slice().sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0)||String(a.name||'').localeCompare(String(b.name||''),'tr'));
  const cnt=id=>rows.filter(t=>(t.status||'new')===id).length;
  const ages=rows.map(tryoutAge).filter(a=>a!=null);
  const grpRow=cols.length?`<tr class="grp"><th colspan="7"></th>${groups.map(g=>`<th class="c" colspan="${g.items.length}">${esc(L(g.tr,g.en))}</th>`).join('')}<th colspan="2"></th></tr>`:'';
  const unitOf=f=>{const p=TRYOUT_PARTS[f.k];const u=f.u?tryoutUnit(f.u):'';
    if(p===TRYOUT_LR)return L('sağ / sol','R / L')+(u?' · '+u:'');
    if(p)return p.map(x=>L(x.tr,x.en)+(x.u?' '+tryoutUnit(x.u):'')).join(' / ')+(p.every(x=>x.u)||!u?'':' · '+u);
    return u;};
  const table=`<table class="pl">${grpRow}<tr><th></th><th>${L('Aday','Candidate')}</th><th class="c">${L('Yaş','Age')}</th><th class="c">${L('Poz.','Pos.')}</th>
      <th class="c">${L('Boy','Height')}<small>cm</small></th><th class="c">${L('Kilo','Weight')}<small>kg</small></th><th class="c">${L('Kulaç','Wingspan')}<small>cm</small></th>
      ${cols.map(f=>`<th class="c">${esc(short(f))}${unitOf(f)?`<small>${esc(unitOf(f))}</small>`:''}</th>`).join('')}
      <th class="c">${L('Puan','Rating')}</th><th class="c">${L('Durum','Status')}</th></tr>
    ${sorted.map(t=>{const st=tryoutStatus(t.status);const age=tryoutAge(t);
      return`<tr><td>${t.photo?`<img class="av" src="${esc(mediaSrc(t.photo))}" alt=""/>`:`<div class="avp">${esc(tryoutInitials(t.name))}</div>`}</td>
        <td class="n"><b>${esc(n(t.name)||L('İsimsiz aday','Unnamed candidate'))}</b><span>${[t.date?fd(t.date):'',n(t.prevClub)?esc(t.prevClub):''].filter(Boolean).join(' · ')}</span></td>
        <td class="t">${age!=null?age:'—'}</td><td class="c">${t.position?esc(posOf(t.position)||t.position):'—'}</td>
        <td class="t${n(t.height)?'':' e'}">${esc(n(t.height))||'—'}</td><td class="t${n(t.weight)?'':' e'}">${esc(n(t.weight))||'—'}</td><td class="t${n(t.wingspan)?'':' e'}">${esc(n(t.wingspan))||'—'}</td>
        ${cols.map(f=>cellOf(t,f)).join('')}
        <td class="c">${tryoutStars(t.rating,'stars2')}</td>
        <td class="c"><span class="pill2" style="background:${TRYOUT_ST_COL[st.id]||TRYOUT_ST_COL.new}">${esc(L(st.tr,st.en))}</span></td></tr>`;}).join('')}
  </table>`;
  const kv=(k,v)=>`<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const body=`<div class="hd">
    <div><h1>${L('Seçmeler — Aday Listesi','Tryouts — Candidate List')}</h1>
      <div class="meta">${o.filterTxt?esc(L('Süzgeç: ','Filter: ')+o.filterTxt):L('Tüm adaylar','All candidates')} · ${L('puana göre sıralı','sorted by rating')}</div></div>
    <div class="r"><div class="t">${L('Aday Listesi','Candidate List')}</div><div class="d">${today_}</div></div>
  </div>
  <div class="sm">${kv(L('Toplam','Total'),rows.length)}${TRYOUT_STATUS.map(s=>kv(`<span style="color:${TRYOUT_ST_COL[s.id]}">●</span> ${esc(L(s.tr,s.en))}`,cnt(s.id))).join('')}
    ${kv(L('Yaş Aralığı','Age Range'),ages.length?`${Math.min(...ages)}–${Math.max(...ages)}`:'—')}</div>
  ${table}
  <div class="ft"><span>CoachOS · ${L('Seçmeler','Tryouts')}</span><span>${L(`${today_} tarihinde oluşturuldu`,`Generated ${today_}`)}</span></div>`;
  tryoutPrintWindow(L('Seçmeler — Aday Listesi','Tryouts — Candidate List'),body,{landscape:true});
}
