/* ═══════════════════════════════════════════════════════════════════════════
   BİLGİLERİ AL — the athlete on paper, for the people the coach reports to

   One A4 portrait document in five parts, in the order of the tabs it is drawn from:
   the Athlete Profile, the Head Coach's Observations, the Athletic Profile, the
   anthropometric measurements over time and the Injuries. The technical-tactical
   criteria close the first page; the mental, character and social skills open the second.
   The Athletic Profile prints every Movement Screen, Jump & Reactivity and Speed & Agility
   test the athlete has taken beside its (grey-scale) picture and what it measures — the
   movement screen as its latest result, jump and speed as a date-by-date table like the
   anthropometry's — then the latest static posture across the full width. Everything those
   tabs hold is on it, laid out to be read by someone who has never opened the app: numbers
   in boxes, judgements in words, every scale with its key. It opens in its own window and goes straight to the print dialog, where "Save as
   PDF" writes the file; the browser paginates it, and no block is cut across a page.
   ═══════════════════════════════════════════════════════════════════════════ */
/* The radar of a rated section, as markup for the printed sheet (light colours). */
function airRadarSvg(items,vals){
  const N=items.length,W=380,H=262,cx=W/2,cy=H/2+2,R=76;
  const ang=i=>-Math.PI/2+i*2*Math.PI/N;
  const at=(i,r)=>[cx+r*Math.cos(ang(i)),cy+r*Math.sin(ang(i))];
  const poly=r=>items.map((_,i)=>at(i,r).map(v=>v.toFixed(1)).join(',')).join(' ');
  const sc=items.map(it=>{const v=Number((vals[it.k]||{}).s);return v>=1&&v<=4?v:0;});
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const lines=t=>{if(t.length<=15)return[t];const amp=t.indexOf(' & ');if(amp>0)return[t.slice(0,amp)+' &',t.slice(amp+3)];
    const par=t.indexOf(' (');if(par>0)return[t.slice(0,par),t.slice(par+1)];
    const mid=t.length/2;let b=-1;for(let k=0;k<t.length;k++)if(t[k]===' '&&(b<0||Math.abs(k-mid)<Math.abs(b-mid)))b=k;
    return b>0?[t.slice(0,b),t.slice(b+1)]:[t];};
  let o=`<svg viewBox="0 0 ${W} ${H}" class="radar">`;
  [1,2,3,4].forEach(k=>{o+=`<polygon points="${poly(R*k/4)}" fill="none" stroke="${k===4?'#cfd4db':'#e2e5ea'}" stroke-width="1"/>`;});
  items.forEach((_,i)=>{const[x,y]=at(i,R);o+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e5ea"/>`;});
  [1,2,3].forEach(k=>{o+=`<text x="${cx+4}" y="${(cy-R*k/4+3).toFixed(1)}" font-size="8" fill="#9aa1ac">${k}</text>`;});
  if(sc.some(v=>v>0)){
    o+=`<polygon points="${sc.map((v,i)=>at(i,R*v/4).map(q=>q.toFixed(1)).join(',')).join(' ')}" fill="rgba(10,108,220,.16)" stroke="#0a6cdc" stroke-width="2" stroke-linejoin="round"/>`;
    sc.forEach((v,i)=>{if(!v)return;const[x,y]=at(i,R*v/4),[lx,ly]=at(i,v===4?R*v/4-15:R*v/4+14);
      o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${scColor(v)}" stroke="#fff" stroke-width="1.4"/>`+
        `<text x="${lx.toFixed(1)}" y="${(ly+3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f1720">${v.toFixed(1)}</text>`;});
  }
  items.forEach((it,i)=>{const c=Math.cos(ang(i)),s=Math.sin(ang(i));const[x,y]=at(i,R+20);
    const an=c>0.3?'start':c<-0.3?'end':'middle';const ls=lines(L(it.tr,it.en));
    const y0=y-(ls.length-1)*6+(s>0.5?8:s<-0.5?-3:4);
    o+=`<text x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${an}" font-size="10.2" font-weight="700" fill="#1f2731">${ls.map((l,j)=>`<tspan x="${x.toFixed(1)}" dy="${j?12:0}">${esc(l)}</tspan>`).join('')}</text>`;});
  return o+'</svg>';
}
function printAthleteInfo(ath,setup,exercises,teamDays){
  const w=window.open('','_blank','width=980,height=1200');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const txt=s=>{const t=String(s||'').trim();return t?`<div class="txt">${esc(t)}</div>`:`<div class="txt none">—</div>`;};
  const{age,h,w:wt,ws,bf}=athProfileBasics(ath);
  const scout=ath.scout||{},grp=g=>scout[g]||{};
  const pNow=scPos(scout.posNow),pPot=scPos(scout.posPot);
  const tech=scRead(SC_TECH,grp('tech')),mind=scRead(SC_MIND,grp('mind'));
  const verdict=grp('verdict');
  const goals=(ath.goals&&typeof ath.goals==='object')?ath.goals:{};
  const notes=athNotesList(ath);
  const tp=atpRead(ath);
  const injuries=(ath.injuries||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const num=(v,d=1)=>v==null?'—':String(+Number(v).toFixed(d));
  const kv=(k,v,u)=>`<div class="kv"><div class="k">${k}</div><div class="v">${v}${u&&v!=='—'?`<small>${u}</small>`:''}</div></div>`;
  const secH=(n,t,d)=>`<div class="sec-h"><span class="n">${n}</span><div><div class="t">${t}</div>${d?`<div class="d">${d}</div>`:''}</div></div>`;
  const subH=t=>`<div class="sub-h">${t}</div>`;
  /* A criterion's score as four cells, the scored ones filled in its colour. */
  const scoreCells=v=>`<span class="cells">${[1,2,3,4].map(i=>`<i style="${v>=i?`background:${scColor(v)};border-color:${scColor(v)}`:''}"></i>`).join('')}</span>`;
  const critTable=(items,vals)=>`<table class="crit"><colgroup><col style="width:34%"/><col style="width:22%"/><col/></colgroup>
    <tr><th>${L('Kriter','Criterion')}</th><th>${L('Puan','Score')}</th><th>${L('Not / Gözlem','Note / Observation')}</th></tr>
    ${items.map(it=>{const c=vals[it.k]||{};const v=Number(c.s);const ok=v>=1&&v<=4;
      return`<tr><td class="b">${esc(L(it.tr,it.en))}</td><td>${ok?`${scoreCells(v)}<b class="sv" style="color:${scColor(v)}">${v}</b> <span class="sw">${esc(L(SC_SCALE[v-1].tr,SC_SCALE[v-1].en))}</span>`:'<span class="sw">—</span>'}</td><td>${esc(c.n||'')||'<span class="sw">—</span>'}</td></tr>`;}).join('')}
  </table>`;
  const scaleKey=`<div class="key">${SC_SCALE.map(s=>`<span><i style="background:${s.c}"></i>${s.n} ${esc(L(s.tr,s.en))}</span>`).join('')}</div>`;
  const listOf=(arr,empty)=>arr.length?`<ul class="ls">${arr.map(r=>`<li><i style="background:${scColor(r.s)}"></i><span>${esc(L(r.it.tr,r.it.en))}${r.n?`<em>${esc(r.n)}</em>`:''}</span><b style="color:${scColor(r.s)}">${r.s}</b></li>`).join('')}</ul>`:`<div class="none">${empty}</div>`;
  const posCard=(lbl,p)=>`<div class="card pos"><div class="pk">${lbl}</div>${p?`<div class="pn"><b>${p.k}</b>${esc(L(p.tr,p.en))}</div><div class="pd">${esc(L(p.defTr,p.defEn))} <span class="pe">${L('Örnek oyuncular','Example players')}: ${esc(p.ex.join(', '))}</span></div>`:`<div class="pn none">—</div>`}</div>`;
  /* ── 1 · Athlete profile ── */
  const s1=`<section>
    ${secH(1,L('Sporcu Profili','Athlete Profile'),L('Temel ölçüler, deneyim, hedefler ve bireysel gözlemler','Key measures, experience, goals and individual observations'))}
    <div class="kvs">${kv(L('Yaş','Age'),age!=null?age:'—',L('yıl','yrs'))}${kv(L('Boy','Height'),h?num(h.v):'—','cm')}${kv(L('Kilo','Weight'),wt?num(wt.v):'—','kg')}${kv(L('Kulaç','Wingspan'),ws?num(ws.v):'—','cm')}${kv(L('Yağ Oranı','Body Fat'),bf?num(bf.v):'—','%')}</div>
    <div class="two">
      <div class="card blk">${subH(L('Kısa Vadeli Performans Hedefleri','Short-Term Performance Goals'))}${txt(goals.short)}</div>
      <div class="card blk">${subH(L('Uzun Vadeli Performans Hedefleri','Long-Term Performance Goals'))}${txt(goals.long)}</div>
    </div>
    <div class="card blk">${subH(L('Bireysel Gözlemler','Individual Observations'))}
      ${notes.length?`<div class="notes">${notes.map(n=>`<div class="note"><span class="nd">${n.date?fd(n.date):'—'}</span><div class="txt">${esc(n.text)}</div></div>`).join('')}</div>`:'<div class="txt none">—</div>'}</div>
  </section>`;
  /* ── 2 · Head coach's observations ── */
  const avgB=r=>r.avg==null?'—':r.avg.toFixed(1);
  const s2=`<section>
    ${secH(2,L('Baş Antrenör Gözlemleri','Head Coach Observations'),L('Modern pozisyon, teknik-taktik ve zihinsel değerlendirme, genel değerlendirme · ölçek 1–4','Modern position, technical-tactical and mental assessment, overall verdict · scale 1–4'))}
    <div class="blk">${subH(L('Modern Pozisyon','Modern Position'))}<div class="two">${posCard(L('Mevcut','Current'),pNow)}${posCard(L('Potansiyel','Potential'),pPot)}</div></div>
    <div class="blk">${subH(L('Teknik ve Taktik Değerlendirme','Technical & Tactical Assessment'))}
      <div class="tt">
        <div class="card rd">${airRadarSvg(SC_TECH,grp('tech'))}</div>
        <div class="tt-side">
          <div class="card avg"><div class="pk">${L('Genel Ortalama','Overall Average')}</div><div class="av"><b>${avgB(tech)}</b><span>/ 4</span></div><div class="bar"><i style="width:${tech.avg==null?0:tech.avg/4*100}%"></i></div></div>
          <div class="card"><div class="pk acc">${L('Güçlü Yönler','Strengths')}</div>${listOf(tech.strong,L('3–4 puanlı kriter yok','No criterion scored 3–4'))}</div>
          <div class="card"><div class="pk acc">${L('Geliştirilmesi Gereken Yönler','Areas to Develop')}</div>${listOf(tech.develop,L('1–2 puanlı kriter yok','No criterion scored 1–2'))}</div>
        </div>
      </div>
    </div>
    <div class="blk">${critTable(SC_TECH,grp('tech'))}</div>
    <div class="blk pg2">${subH(`${L('Zihinsel, Karakter ve Sosyal Beceriler','Mental, Character & Social Skills')} <span class="hv">${L('ortalama','average')} ${avgB(mind)} / 4</span>`)}${critTable(SC_MIND,grp('mind'))}${scaleKey}</div>
    <div class="card blk">${subH(L('Baş Antrenör Genel Değerlendirmesi','Head Coach’s Overall Assessment'))}${txt(verdict.summary)}
      <div class="sign"><span>${L('Baş Antrenör','Head Coach')}: <b>${esc(verdict.coach||'—')}</b></span><span>${L('Tarih','Date')}: <b>${esc(verdict.date||'—')}</b></span></div></div>
  </section>`;
  /* ── 3 · Athletic profile ── every Movement Screen, Jump & Reactivity and Speed & Agility
     test on the record, one card each: its picture (grey-scale, small), its name and what it
     measures, and its numbers. The movement screen shows the latest result (and its change
     from the one before); jump and speed show every date, like the anthropometric tables.
     The FMS Deep Squat card carries the athlete's own front and side photos instead of the
     stock picture, when they were taken. */
  const datedTests=[...(ath.tests||[])].filter(t=>t&&t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const fmsIt=(t,id)=>fmsCalc(t.fms).items.find(i=>i.id===id)||{};
  const RS=[L('Sağ','R'),L('Sol','L')];
  const fmsTest=it=>({g:'move',id:'fms_'+it.id,tr:'FMS '+it.en,en:'FMS '+it.en,u:'/3',dir:'hi',
    rows:it.bi?[[RS[0],t=>fmsIt(t,it.id).right],[RS[1],t=>fmsIt(t,it.id).left]]:[[L('Skor','Score'),t=>fmsIt(t,it.id).score]]});
  const lr=k=>[[RS[0],t=>cmpN(t[k]&&t[k].right)],[RS[1],t=>cmpN(t[k]&&t[k].left)]];
  const one=get=>[['',get]];
  const AIR_TESTS=[
    ...FMS_ITEMS.map(fmsTest),
    {g:'move',id:'ankleDF',tr:'Ayak Bileği Dorsifleksiyon',en:'Ankle Dorsiflexion',u:'°',dir:'hi',rows:lr('ankleDF')},
    {g:'move',id:'aslr',tr:'Aktif Düz Bacak Kaldırma (ASLR)',en:'Active Straight Leg Raise (ASLR)',u:'/3',dir:'hi',rows:lr('aslr')},
    {g:'move',id:'ohs',tr:'Overhead Squat',en:'Overhead Squat',u:'/3',dir:'hi',rows:one(t=>cmpN(t.ohs&&t.ohs.score))},
    {g:'move',id:'hipRot',tr:'Kalça İç/Dış Rotasyon',en:'Hip Internal/External Rotation',u:'°',dir:'hi',
      rows:[[`IR ${RS[0]}`,t=>hipRotCalc(t).irR],[`IR ${RS[1]}`,t=>hipRotCalc(t).irL],[`ER ${RS[0]}`,t=>hipRotCalc(t).erR],[`ER ${RS[1]}`,t=>hipRotCalc(t).erL]]},
    {g:'move',id:'thomas',tr:'Thomas Testi',en:'Thomas Test',u:'°',
      rows:[[`${L('Kalça','Hip')} ${RS[0]}`,t=>thomasCalc(t).right.hip],[`${L('Kalça','Hip')} ${RS[1]}`,t=>thomasCalc(t).left.hip],
        [`${L('Diz','Knee')} ${RS[0]}`,t=>thomasCalc(t).right.knee],[`${L('Diz','Knee')} ${RS[1]}`,t=>thomasCalc(t).left.knee]]},
    {g:'move',id:'tSpine',tr:'Torasik Rotasyon',en:'Thoracic Rotation',u:'°',dir:'hi',rows:[[RS[0],t=>tSpineCalc(t).r],[RS[1],t=>tSpineCalc(t).l]]},
    {g:'move',id:'yBalance',tr:'Y Denge Testi',en:'Y Balance Test',u:'%',dir:'hi',rows:[[RS[0],t=>ybCalc(t.yBalance).compR],[RS[1],t=>ybCalc(t.yBalance).compL]]},
    {g:'jump',id:'verticalJump',tr:'Dikey Sıçrama',en:'Vertical Jump',u:'cm',dir:'hi',rows:one(t=>cmpN(t.verticalJump))},
    {g:'jump',id:'cmj',tr:'CMJ (Countermovement Jump)',en:'CMJ (Countermovement Jump)',u:'cm',dir:'hi',rows:one(t=>cmpN(t.cmj))},
    {g:'jump',id:'squatJump',tr:'Squat Jump',en:'Squat Jump',u:'cm',dir:'hi',rows:one(t=>cmpN(t.squatJump))},
    {g:'jump',id:'dropJump',tr:'Drop Jump',en:'Drop Jump',u:'RSI',dir:'hi',rows:one(t=>cmpN(t.dropJump))},
    {g:'jump',id:'horizontalJump',tr:'Yatay Sıçrama',en:'Horizontal Jump',u:'cm',dir:'hi',rows:one(t=>cmpN(t.horizontalJump))},
    {g:'jump',id:'lateralCmj',tr:'Lateral CMJ',en:'Lateral CMJ',u:'cm',dir:'hi',rows:lr('lateralCmj')},
    {g:'speed',id:'sprint',tr:'20 m Sprint',en:'20 m Sprint',u:'s',dir:'lo',rows:one(t=>cmpN(t.sprint20m&&t.sprint20m.time))},
    {g:'speed',id:'accel',tr:'5-10 m İvmelenme',en:'5-10 m Acceleration',u:'s',dir:'lo',rows:[['5 m',t=>accelCalc(t).t5],['10 m',t=>accelCalc(t).t10]]},
    {g:'speed',id:'tTest',tr:'T-Çeviklik Testi',en:'T-Agility Test',u:'s',dir:'lo',rows:one(t=>cmpN(t.tTest))},
    {g:'speed',id:'fiveZeroFive',tr:'505 Yön Değiştirme',en:'505 Change of Direction',u:'s',dir:'lo',rows:[[RS[0],t=>cod505Calc(t).r],[RS[1],t=>cod505Calc(t).l]]},
  ];
  const safe=(f,t)=>{try{const v=f(t);return v==null||!isFinite(v)?null:+v;}catch(e){return null;}};
  /* A test's readings: the dates any of its rows was taken, and each row's value per date. */
  const airSeries=d=>{const pts=datedTests.map(t=>({date:t.date,t,vs:d.rows.map(r=>safe(r[1],t))})).filter(p=>p.vs.some(v=>v!=null));
    return pts.length?{...d,pts}:null;};
  /* The athlete's own Deep Squat photos (front and side), off the newest test that has them. */
  const dsPh=(()=>{for(let i=datedTests.length-1;i>=0;i--){const ph=(((datedTests[i].fms||{}).photos||{}).deepSquat)||{};
    if(hasMedia(ph.front)||hasMedia(ph.side))return ph;}return null;})();
  const abs=p=>`${location.origin}/${p}`;
  const tcImg=d=>{
    if(d.id==='fms_deepSquat'&&dsPh)return`<div class="tc-im ph">${['front','side'].filter(k=>hasMedia(dsPh[k])).map(k=>`<img src="${esc(mediaSrc(dsPh[k]))}" alt=""/>`).join('')}</div>`;
    return TEST_IMG[d.id]?`<div class="tc-im"><img src="${esc(abs(TEST_IMG[d.id]))}" alt=""/></div>`:'<div class="tc-im none"></div>';};
  /* What the test measures: its "used to assess" line; an FMS movement's is its scoring rule,
     so those say the quality the movement screens instead. */
  const tcWhat=d=>{if(/^fms_/.test(d.id)){const m=TEST_META[d.id];return m?L(m.tr,m.en):'';}
    const i=TEST_INFO[d.id];return i?L(i.tr,i.en).p:'';};
  const tcInfo=d=>{const w=tcWhat(d);
    return`<div class="tc-i"><div class="tc-n">${esc(L(d.tr,d.en))} <em>${esc(d.u)}</em></div>${w?`<div class="tc-w">${esc(w)}</div>`:''}</div>`;};
  const TC_PER_ROW=6;
  /* The readings as a slim table, dates along the top. `latest` keeps only the newest date,
     with its change from the reading before. */
  const tcTable=(d,latest)=>{
    const all=d.pts.map((p,i)=>({...p,i}));
    const cols=latest?all.slice(-1):all;
    const prevOf=(ri,i)=>{for(let j=i-1;j>=0;j--)if(all[j].vs[ri]!=null)return all[j].vs[ri];return null;};
    const tone=dv=>!d.dir||!dv?'':((d.dir==='hi')===(dv>0)?'up':'dn');
    const chunks=[];for(let i=0;i<cols.length;i+=TC_PER_ROW)chunks.push(cols.slice(i,i+TC_PER_ROW));
    const n=Math.min(cols.length,TC_PER_ROW);
    const hasLbl=d.rows.some(r=>r[0]);
    const pad=(c,tag)=>`<${tag}></${tag}>`.repeat(n-c.length);
    return`<table class="tc-t">${chunks.map(c=>`<tr class="an-d">${hasLbl?'<th class="rl"></th>':''}${c.map(p=>`<th>${fd(p.date)}</th>`).join('')}${pad(c,'th')}</tr>
      ${d.rows.map((r,ri)=>`<tr class="an-v">${hasLbl?`<td class="rl">${esc(r[0])}</td>`:''}${c.map(p=>{const v=p.vs[ri];if(v==null)return'<td><span class="sw">—</span></td>';
        const pv=prevOf(ri,p.i);const dv=pv!=null?+(v-pv).toFixed(2):0;
        return`<td><b>${athTestFmt(v)}</b>${dv?`<i class="${tone(dv)}">${dv>0?'+':''}${athTestFmt(dv)}</i>`:''}</td>`;}).join('')}${pad(c,'td')}</tr>`).join('')}`).join('')}</table>`;};
  const tcCard=(d,latest)=>`<div class="tc${latest?' sm':''}">${tcImg(d)}${tcInfo(d)}<div class="tc-d">${tcTable(d,latest)}</div></div>`;
  const airGroups=ATH_TEST_GROUPS.map(g=>({g,meta:TEST_GROUPS.find(x=>x.id===g),list:AIR_TESTS.filter(d=>d.g===g).map(airSeries).filter(Boolean)})).filter(x=>x.list.length);
  const lastFms=(()=>{for(let i=datedTests.length-1;i>=0;i--){const r=fmsCalc(datedTests[i].fms);if(r.n===FMS_ITEMS.length)return{r,date:datedTests[i].date};}return null;})();
  const grpHead=x=>`${esc(L(x.meta.tr,x.meta.en))}${x.g==='move'&&lastFms?` <span class="hv">FMS ${L('toplam','total')} ${lastFms.r.total} / 21 · ${fd(lastFms.date)}</span>`
    :x.g==='move'?` <span class="hv">${L('son sonuçlar','latest results')}</span>`:` <span class="hv">${L('gelişim','progress')}</span>`}`;
  const testSec=airGroups.length?airGroups.map(x=>`<div class="tgs">${subH(grpHead(x))}
      <div class="${x.g==='move'?'tcs2':'tcs'}">${x.list.map(d=>tcCard(d,x.g==='move')).join('')}</div></div>`).join('')
    :`<div class="none">${L('Hareket Taraması, Sıçrama & Reaktivite ya da Hız & Çeviklik testi yok.','No Movement Screen, Jump & Reactivity or Speed & Agility test.')}</div>`;
  const pri=ATP_PRIORITY.map(p=>{const its=ATP_QUALITIES.filter(it=>(tp.qualities[it.id]||{}).priority===p.id);
    return`<div class="card lane"><div class="pk" style="color:${{high:'#dc2626',medium:'#a16207',low:'#2f5fd0'}[p.id]}">${esc(atpT(p.en))} <span class="cnt">${its.length}</span></div>
      <div class="pd2">${esc(L(p.dTr,p.dEn))}</div>${its.length?`<ul class="ql">${its.map(it=>`<li>${esc(atpT(it.en))}<span>${esc(atpT(it.group))}</span></li>`).join('')}</ul>`:'<div class="none">—</div>'}</div>`;}).join('');
  /* The latest static posture across the full width: its three photos and the coach's words under them. */
  const newestT=f=>[...(ath.tests||[])].filter(t=>t&&t.date&&f(t)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  const pT=newestT(t=>{const p=t.posture||{};return!!(p.frontPhoto||p.sidePhoto||p.backPhoto||String(p.observations||'').trim());});
  const shot=(photo,lbl)=>`<figure class="sh">${photo?`<img src="${esc(mediaSrc(photo))}" alt=""/>`:'<div class="shx">—</div>'}<figcaption>${lbl}</figcaption></figure>`;
  const shots=o=>`<div class="shs">${shot(o.frontPhoto,L('Önden','Front'))}${shot(o.sidePhoto,L('Yandan','Side'))}${shot(o.backPhoto,L('Arkadan','Back'))}</div>`;
  const postureCard=`<div class="card pt wide">
      <div class="pk">${L('Statik Postür','Static Posture')}${pT?` <span class="ptd">${fd(pT.date)}</span>`:''}</div>
      ${pT?`${shots(pT.posture)}${txt(pT.posture.observations)}`:`<div class="none">${L('Statik postür testi yok.','No static posture test.')}</div>`}</div>`;
  const s3=`<section>
    ${secH(3,L('Atletik Profil','Athletic Profile'),L('Hareket taraması, sıçrama ve sürat testleri, statik postür ve gelişim öncelikleri','Movement screen, jump and speed tests, static posture and development priorities'))}
    <div class="tests">${testSec}</div>
    <div class="blk">${postureCard}</div>
    <div class="blk">${subH(L('Atletik Gelişim Öncelikleri','Athletic Development Priorities'))}<div class="three">${pri}</div></div>
  </section>`;
  /* ── 4 · Anthropometric tracking ── one slim table per measure: its dates along the top,
     the values straight underneath, each with its change from the reading before. A measure
     with more dates than fit a row continues on a second pair of rows. */
  const anthroSeries=k=>{const byDate={};
    [...(ath.tests||[]),...(ath.measurements||[])].forEach(x=>{const v=x&&x[k];if(!x||!x.date||v===''||v==null||isNaN(Number(v)))return;byDate[x.date]=Number(v);});
    return Object.keys(byDate).sort().map(d=>({date:d,v:byDate[d]}));};
  const ANTHRO=[{k:'height',tr:'Boy',en:'Height',u:'cm',c:'#0a6cdc'},{k:'weight',tr:'Kilo',en:'Weight',u:'kg',c:'#16a34a'},
    {k:'wingspan',tr:'Kulaç',en:'Wingspan',u:'cm',c:'#7c3aed'},{k:'bodyFat',tr:'Yağ Oranı',en:'Body Fat',u:'%',c:'#f97316'}];
  const anSer=ANTHRO.map(m=>({...m,pts:anthroSeries(m.k)}));
  const anDates=[...new Set(anSer.flatMap(m=>m.pts.map(p=>p.date)))].sort();
  const AN_PER_ROW=7;
  const anTable=m=>{const n=m.pts.length;if(!n)return'';
    const tot=n>1?+(m.pts[n-1].v-m.pts[0].v).toFixed(1):null;
    const chunks=[];for(let i=0;i<n;i+=AN_PER_ROW)chunks.push(m.pts.slice(i,i+AN_PER_ROW).map((p,j)=>({...p,i:i+j})));
    const cols=Math.min(n,AN_PER_ROW);
    const lbl=`<th class="an-l" rowspan="${chunks.length*2}" >${esc(L(m.tr,m.en))} <em>${m.u}</em>${tot!=null?`<span>${tot>0?'+':''}${tot} ${L('toplam','total')}</span>`:''}</th>`;
    const pad=c=>'<td></td>'.repeat(cols-c.length);
    const rows=chunks.map((c,ci)=>`<tr class="an-d">${ci?'':lbl}${c.map(p=>`<th>${fdL(p.date)}</th>`).join('')}${pad(c).replace(/td/g,'th')}</tr>
      <tr class="an-v">${c.map(p=>{const dv=p.i>0?+(p.v-m.pts[p.i-1].v).toFixed(1):0;
        return`<td><b>${num(p.v)}</b>${dv?`<i>${dv>0?'+':''}${dv}</i>`:''}</td>`;}).join('')}${pad(c)}</tr>`).join('');
    return`<table class="an-t">${rows}</table>`;};
  const s4=`<section>
    ${secH(4,L('Antropometrik Ölçüm Takibi','Anthropometric Tracking'),anDates.length
      ?L(`${anDates.length} ölçüm tarihi · ${fdL(anDates[0])} – ${fdL(anDates[anDates.length-1])}`,`${anDates.length} measurement dates · ${fdL(anDates[0])} – ${fdL(anDates[anDates.length-1])}`)
      :L('Boy, kilo, kulaç ve yağ oranı zaman içinde','Height, weight, wingspan and body fat over time'))}
    ${anDates.length?`<div class="blk an-w">${anSer.map(anTable).join('')}</div>`
      :`<div class="card none">${L('Kayıtlı antropometrik ölçüm yok.','No anthropometric measurements recorded.')}</div>`}
  </section>`;
  /* ── 5 · Injuries ── */
  const ctxTr={Training:L('Antrenman','Training'),Match:L('Maç','Match'),Other:L('Diğer','Other')};
  const sideTr={Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral'),'N/A':''};
  const tissueTr={Muscle:L('Kas','Muscle'),Ligament:L('Bağ','Ligament'),Tendon:'Tendon',Bone:L('Kemik','Bone'),Cartilage:L('Kıkırdak','Cartilage'),'Joint capsule':L('Eklem kapsülü','Joint capsule'),Nerve:L('Sinir','Nerve'),Other:L('Diğer','Other')};
  /* Missed sessions off the team calendar's tick lists (see injMissedSessions): the totals
     over the whole record, and each injury's own count while the athlete was out. */
  const missAll=injMissedSessions(ath.id,teamDays,null,null);
  let missD=0;
  const injRows=injuries.map(i=>{const m=injMissed(i,ath.id,teamDays);if(m.days)missD+=m.days;const act=!i.actualReturn;
    return`<tr><td>${i.date?fd(i.date):'—'}</td><td class="b">${esc([sideTr[i.side]||'',i.location||''].filter(Boolean).join(' ')||'—')}${i.type?`<div class="sw">${esc(i.type)}</div>`:''}</td>
      <td>${esc(tissueTr[i.tissueType]||i.tissueType||'—')}</td><td>${i.grade?esc(i.grade):'—'}</td><td>${esc(ctxTr[i.context]||'—')}${i.mechanism?`<div class="sw">${esc(i.mechanism)}</div>`:''}</td>
      <td>${i.sidelinedDate?fd(i.sidelinedDate):'—'} → ${i.actualReturn?fd(i.actualReturn):(i.estimatedReturn?`${fd(i.estimatedReturn)} <span class="sw">(${L('tahmini','est.')})</span>`:'—')}</td>
      <td class="r">${m.days!=null?m.days:'—'}</td>${INJ_MISS_KINDS.map(k=>`<td class="r">${m[k.id]!=null?m[k.id]:'—'}</td>`).join('')}
      <td><span class="pill ${act?'act':'ok'}">${act?L('Aktif','Active'):L('İyileşti','Recovered')}</span></td></tr>${i.notes?`<tr class="nr"><td></td><td colspan="10">${esc(i.notes)}</td></tr>`:''}`;}).join('');
  const s5=`<section>
    ${secH(5,L('Sakatlıklar','Injuries'),L('Sakatlık kaydı; takvimde işaretlenmediği takım antrenmanı, kuvvet & kondisyon ve müsabakalar','Injury record; the team practices, strength & conditioning sessions and competitions the athlete was not ticked on'))}
    <div class="kvs sm">${kv(L('Kayıt','Records'),injuries.length)}${kv(L('Aktif','Active'),injuries.filter(i=>!i.actualReturn).length)}${kv(L('Kadro dışı','Days out'),missD,L('gün','days'))}${INJ_MISS_KINDS.map(k=>kv(L(`Kaçırılan ${k.tr}`,`Missed ${k.en}`),missAll[k.id])).join('')}</div>
    ${injuries.length?`<table class="inj"><tr><th>${L('Tarih','Date')}</th><th>${L('Bölge / Tip','Region / Type')}</th><th>${L('Doku','Tissue')}</th><th>${L('Derece','Grade')}</th><th>${L('Bağlam','Context')}</th><th>${L('Kadro dışı → Dönüş','Sidelined → Return')}</th><th class="r">${L('Gün','Days')}</th><th class="r">${L('Tak. Ant.','Team Pr.')}</th><th class="r">K&amp;K</th><th class="r">${L('Maç','Match')}</th><th>${L('Durum','Status')}</th></tr>${injRows}</table>`
      :`<div class="card none">${L('Kayıtlı sakatlık yok.','No injuries recorded.')}</div>`}
  </section>`;
  const today_=fdL(fmt(today));
  /* The sheet opens the print dialog itself once its photo and fonts are in (or after a
     short wait — a font that never arrives must not hold the dialog back). Its closing
     script tag is written escaped below, or it would end the app's own script block. */
  const html=`<!DOCTYPE html><html lang="${REPORT_LANG==='tr'?'tr':'en'}"><head><meta charset="utf-8"><title>${esc(ath.name||'')} — ${L('Sporcu Bilgileri','Athlete Information')}</title>
<style>
@page{size:A4 portrait;margin:12mm 12mm 13mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
.sec-h{display:flex;gap:10px;align-items:center;padding-bottom:7px;border-bottom:1px solid var(--ln);margin-bottom:10px;break-after:avoid;page-break-after:avoid}
.sec-h .n{width:24px;height:24px;border-radius:7px;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px;flex:none}
.sec-h .t{font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.sec-h .d{font-size:9.5px;color:var(--mu)}
.sub-h{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--t2);margin:0 0 6px;break-after:avoid}
.sub-h .hv{font-weight:600;color:var(--acc);text-transform:none;letter-spacing:0;margin-left:6px}
.blk{margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
.card{border:1px solid var(--ln);border-radius:9px;padding:9px 11px;background:#fff;break-inside:avoid;page-break-inside:avoid}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}
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
.tt{display:grid;grid-template-columns:1.25fr 1fr;gap:8px;margin-bottom:0}
.tt-side{display:flex;flex-direction:column;gap:6px}
.tt-side .card{padding:6px 10px}
.rd{display:flex;align-items:center;justify-content:center}
.radar{width:100%;height:auto;max-height:178px}
.avg .av{display:flex;align-items:baseline;gap:5px}
.avg .av b{font-size:20px;color:var(--acc);line-height:1}
.avg .av span{font-size:12px;color:var(--mu)}
.avg .bar{height:5px;border-radius:999px;background:var(--ln);margin-top:5px;overflow:hidden}
.avg .bar i{display:block;height:100%;background:var(--acc);border-radius:999px}
.ls{list-style:none;display:flex;flex-direction:column;gap:2px}
.ls li{display:flex;align-items:flex-start;gap:7px;font-size:10px}
.ls li i{width:7px;height:7px;border-radius:2px;margin-top:3px;flex:none}
.ls li span{flex:1}
.ls li em{font-style:normal;color:var(--mu);font-size:8.5px;margin-left:5px}
.ls li b{font-size:10.5px}
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
.tcs2{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.tc{display:grid;grid-template-columns:30mm 46mm minmax(0,1fr);gap:8px;align-items:center;border:1px solid var(--ln);border-radius:8px;padding:5px 7px;break-inside:avoid;page-break-inside:avoid}
.tc.sm{grid-template-columns:24mm minmax(0,1fr) auto;gap:6px}
.tc-im{height:17mm;display:flex;gap:2px;border-radius:5px;overflow:hidden;background:var(--soft)}
.tc.sm .tc-im{height:14mm}
.tc-im img{flex:1;min-width:0;width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1)}
.tc-im.none{background:none}
.tc-im.ph img{object-fit:contain;background:var(--soft)}
.tc-n{font-size:8.8px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);line-height:1.25}
.tc-n em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--dim);font-weight:500}
.tc-w{font-size:7.8px;line-height:1.32;color:var(--t2);margin-top:2px}
.tc-t{table-layout:fixed;border:1px solid var(--ln);border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden}
.tc.sm .tc-t{width:auto;min-width:22mm}
.tc-t th,.tc-t td{padding:1.5px 4px;text-align:center;border-bottom:0;background:#fff}
.tc-t .an-d th{font-size:7px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);background:var(--soft);white-space:nowrap}
.tc-t .an-v td{font-size:9px;white-space:nowrap}
.tc-t .an-v b{font-size:10px;font-weight:700}
.tc-t .an-v i{font-style:normal;font-size:7px;font-weight:600;color:var(--mu);margin-left:2px}
.tc-t .an-v i.up{color:#16a34a}.tc-t .an-v i.dn{color:#dc2626}
.tc-t .rl{width:11mm;text-align:left;font-size:7.2px;font-weight:700;color:var(--mu);border-right:1px solid var(--ln)}
.tc-t th.rl{background:var(--soft)}
.tc.sm .tc-t .rl{width:auto}
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
.lane .cnt{color:var(--mu);font-weight:600}
.pd2{font-size:8.8px;color:var(--mu);margin-bottom:5px}
.ql{list-style:none;display:flex;flex-direction:column;gap:3px}
.ql li{font-size:10px;font-weight:600;display:flex;justify-content:space-between;gap:6px}
.ql li span{font-weight:400;font-size:8.5px;color:var(--dim)}
.inj td{font-size:9.3px}
.inj tr.nr td{border-top:0;color:var(--mu);font-size:9px;padding-top:0}
.pill{font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:5px;letter-spacing:.04em;white-space:nowrap}
.pill.act{color:#b91c1c;background:#fdecec}.pill.ok{color:#047857;background:#e6f6ef}
.ft{margin-top:16px;padding-top:7px;border-top:1px solid var(--ln);font-size:8.5px;color:var(--dim);display:flex;justify-content:space-between}
</style></head><body>
<div class="pbar">${L('Sporcu bilgileri hazır','Athlete information is ready')} · <button onclick="window.print()">${L('Yazdır / PDF olarak kaydet','Print / Save as PDF')}</button><button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="hd">
  ${ath.photo?`<img class="av" src="${esc(mediaSrc(ath.photo))}" alt=""/>`:`<div class="avp">${esc(initials)}</div>`}
  <div><h1>${esc(ath.name||L('Adsız Sporcu','Unnamed Athlete'))}${ath.number?`<span>#${esc(ath.number)}</span>`:''}</h1>
    <div class="meta">${[ath.position?esc(POS_FULL[ath.position]||ath.position):'',pNow?esc(`${pNow.k} · ${L(pNow.tr,pNow.en)}`):''].filter(Boolean).join(' · ')}</div></div>
  <div class="r">${hasMedia(setup.logo)||setup.teamName?`<div class="tm">${hasMedia(setup.logo)?`<img src="${esc(mediaSrc(setup.logo))}" alt=""/>`:''}${setup.teamName?`<span>${esc(setup.teamName)}</span>`:''}</div>`:''}<div class="t">${L('Sporcu Bilgi Formu','Athlete Information Sheet')}</div><div class="d">${today_}</div></div>
</div>
${s1}${s2}${s3}${s4}${s5}
<div class="ft"><span>${esc(setup.teamName||'')} · CoachOS</span><span>${L(`${today_} tarihinde oluşturuldu`,`Generated ${today_}`)}</span></div>
<script>
(function(){var go=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},350);};
var imgs=[].slice.call(document.images);var left=imgs.filter(function(i){return!i.complete;}).length;
var done=function(){if(--left<=0)ready();};var fired=false;
function ready(){if(fired)return;fired=true;var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
Promise.race([f,new Promise(function(r){setTimeout(r,1500);})]).then(go,go);}
if(!left)ready();else imgs.forEach(function(i){if(!i.complete){i.addEventListener('load',done);i.addEventListener('error',done);}});
setTimeout(ready,4000);})();
<\/script>
</body></html>`;
  w.document.open();w.document.write(html);w.document.close();
}
