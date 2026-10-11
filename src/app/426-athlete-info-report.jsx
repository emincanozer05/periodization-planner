/* ═══════════════════════════════════════════════════════════════════════════
   BİLGİLERİ AL — the athlete on paper, for the people the coach reports to

   One A4 portrait document in five parts, in the order of the tabs it is drawn from:
   the Athlete Profile, the Head Coach's Observations, the Athletic Profile, the
   anthropometric measurements over time and the Injuries. The technical-tactical
   criteria close the first page; the mental, character and social skills open the second,
   which ends on the latest static posture and overhead squat photographs; Joint by Joint
   opens the third. Everything those tabs hold is on it, laid out to be read by someone who
   has never opened the app: numbers in boxes, judgements in words, every scale with its
   key. It opens in its own window and goes straight to the print dialog, where "Save as
   PDF" writes the file; the browser paginates it, and no block is cut across a page.
   ═══════════════════════════════════════════════════════════════════════════ */
const AIR_LV_C={low:'#16a34a',medium:'#ca8a04',high:'#dc2626'};
const AIR_NEED_C={mobility:'#2f7fe0',stability:'#e08a0b'};
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
/* The joint map with every rated joint coloured, as markup for the printed sheet. */
function airJointFigure(joints){
  let o=`<div class="jbf"><img src="${location.origin}/${ATP_JB_IMG.src}" alt=""/><svg viewBox="0 0 ${ATP_JB_IMG.w} ${ATP_JB_IMG.h}">`;
  ATP_JB_MARKS.forEach(m=>{
    const need=atpJbRow(m.keys[0]).joint.need;
    const lv=Math.max(0,...m.keys.map(k=>atpJointLv((joints[k]||{}).level)));
    const id=lv?ATP_JOINT_LEVELS[lv-1].id:null;
    const[x,y]=m.at,R=m.r;
    o+=`<g transform="translate(${x} ${y})"><circle r="${R-1.5}" fill="${id?AIR_LV_C[id]:'#1d232c'}"/>`+
      `<circle r="${R-2.5}" fill="none" stroke="${AIR_NEED_C[need]}" stroke-width="5"/>`+
      (id?`<text text-anchor="middle" dy="7" font-size="20" font-weight="700" fill="#fff">${atpJbLetter(id)}</text>`:`<circle r="5.5" fill="${AIR_NEED_C[need]}"/>`)+`</g>`;
  });
  return o+`</svg><span class="cap" style="left:25%">${atpT('Front')}</span><span class="cap" style="left:75%">${atpT('Back')}</span></div>`;
}
function printAthleteInfo(ath,setup,exercises){
  const w=window.open('','_blank','width=980,height=1200');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const txt=s=>{const t=String(s||'').trim();return t?`<div class="txt">${esc(t)}</div>`:`<div class="txt none">—</div>`;};
  const{age,h,w:wt,ws,bf,sc:scYears}=athProfileBasics(ath);
  const scout=ath.scout||{},grp=g=>scout[g]||{};
  const pNow=scPos(scout.posNow),pPot=scPos(scout.posPot);
  const tech=scRead(SC_TECH,grp('tech')),mind=scRead(SC_MIND,grp('mind'));
  const verdict=grp('verdict');
  const goals=(ath.goals&&typeof ath.goals==='object')?ath.goals:{};
  const notes=athNotesList(ath);
  const tp=atpRead(ath);
  const tests=athLatestTests(ath);
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
    <div class="kvs">${kv(L('Yaş','Age'),age!=null?age:'—',L('yıl','yrs'))}${kv(L('Boy','Height'),h?num(h.v):'—','cm')}${kv(L('Kilo','Weight'),wt?num(wt.v):'—','kg')}${kv(L('Kulaç','Wingspan'),ws?num(ws.v):'—','cm')}${kv(L('Yağ Oranı','Body Fat'),bf?num(bf.v):'—','%')}${kv(L('S&C Deneyimi','S&C Experience'),scYears!=null?num(scYears):'—',L('yıl','yrs'))}</div>
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
  /* ── 3 · Athletic profile ── */
  const testGroups=ATH_TEST_GROUPS.map(g=>({meta:TEST_GROUPS.find(x=>x.id===g),items:tests.filter(b=>b.g===g)})).filter(x=>x.items.length);
  const testBox=b=>`<div class="tb"><div class="tn">${esc(L(b.tr,b.en))}<em>${esc(b.u)}</em></div>${b.bi
    ?`<div class="tv bi"><span><small>${L('Sağ','R')}</small>${athTestFmt(b.v[0])}</span><span><small>${L('Sol','L')}</small>${athTestFmt(b.v[1])}</span></div>`
    :`<div class="tv">${athTestFmt(b.v)}${b.delta!=null&&b.delta!==0?`<i class="${b.good==null?'':b.good?'up':'dn'}">${b.delta>0?'+':''}${athTestFmt(b.delta)}</i>`:''}</div>`}
    <div class="td">${fd(b.date)}</div></div>`;
  const jbRows=ATP_JOINTS.map(j=>{const rs=ATP_JOINT_ROWS.filter(r=>r.joint.id===j.id);
    const cell=r=>{const v=(tp.joints[r.key]||{});const id=v.level;
      return`${id?`<span class="lv" style="color:${AIR_LV_C[id]}"><i style="background:${AIR_LV_C[id]}"></i>${esc(atpT(ATP_JOINT_LEVELS[atpJointLv(id)-1].en))}</span>`:'<span class="sw">—</span>'}${v.note?`<div class="jn">${esc(v.note)}</div>`:''}`;};
    return`<tr><td class="b">${esc(atpT(j.en))}</td><td><span class="need" style="color:${AIR_NEED_C[j.need]}">${esc(atpT(j.need==='mobility'?'Mobility':'Stability'))}</span></td>${j.bi?`<td>${cell(rs[0])}</td><td>${cell(rs[1])}</td>`:`<td colspan="2" class="mid">${cell(rs[0])}</td>`}</tr>`;}).join('');
  const pri=ATP_PRIORITY.map(p=>{const its=ATP_QUALITIES.filter(it=>(tp.qualities[it.id]||{}).priority===p.id);
    return`<div class="card lane"><div class="pk" style="color:${{high:'#dc2626',medium:'#a16207',low:'#2f5fd0'}[p.id]}">${esc(atpT(p.en))} <span class="cnt">${its.length}</span></div>
      <div class="pd2">${esc(L(p.dTr,p.dEn))}</div>${its.length?`<ul class="ql">${its.map(it=>`<li>${esc(atpT(it.en))}<span>${esc(atpT(it.group))}</span></li>`).join('')}</ul>`:'<div class="none">—</div>'}</div>`;}).join('');
  /* The latest static posture and overhead squat, side by side: each its three photos
     (small, so the pair still closes the second page) and the coach's words under them. */
  const newestT=f=>[...(ath.tests||[])].filter(t=>t&&t.date&&f(t)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
  const pT=newestT(t=>{const p=t.posture||{};return!!(p.frontPhoto||p.sidePhoto||p.backPhoto||String(p.observations||'').trim());});
  const oT=newestT(t=>{const o=t.ohs||{};return!!(o.frontPhoto||o.sidePhoto||o.backPhoto||String(o.observations||'').trim()
    ||(o.score!==''&&o.score!=null)||(o.problems||[]).some(x=>String(x||'').trim()));});
  const shot=(photo,lbl)=>`<figure class="sh">${photo?`<img src="${esc(mediaSrc(photo))}" alt=""/>`:'<div class="shx">—</div>'}<figcaption>${lbl}</figcaption></figure>`;
  const shots=o=>`<div class="shs">${shot(o.frontPhoto,L('Önden','Front'))}${shot(o.sidePhoto,L('Yandan','Side'))}${shot(o.backPhoto,L('Arkadan','Back'))}</div>`;
  const postureCard=`<div class="card pt">
      <div class="pk">${L('Statik Postür','Static Posture')}${pT?` <span class="ptd">${fd(pT.date)}</span>`:''}</div>
      ${pT?`${shots(pT.posture)}${txt(pT.posture.observations)}`:`<div class="none">${L('Statik postür testi yok.','No static posture test.')}</div>`}</div>`;
  const ohsProb=oT?((oT.ohs.problems||[]).map(x=>String(x||'').trim()).filter(Boolean)):[];
  const ohsCard=`<div class="card pt">
      <div class="pk">Overhead Squat${oT?`${oT.ohs.score!==''&&oT.ohs.score!=null?` <span class="pts">${esc(oT.ohs.score)} / 3</span>`:''} <span class="ptd">${fd(oT.date)}</span>`:''}</div>
      ${oT?`${shots(oT.ohs)}${ohsProb.length?`<ul class="pp">${ohsProb.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${String(oT.ohs.observations||'').trim()||!ohsProb.length?txt(oT.ohs.observations):''}`
        :`<div class="none">${L('Overhead squat testi yok.','No overhead squat test.')}</div>`}</div>`;
  const s3=`<section>
    ${secH(3,L('Atletik Profil','Athletic Profile'),L('Son test sonuçları, Joint by Joint ve gelişim öncelikleri','Latest test results, Joint by Joint and development priorities'))}
    <div class="blk">${subH(L('Son Test Sonuçları','Latest Test Results'))}
      ${testGroups.length?testGroups.map(g=>`<div class="tg"><div class="tgh">${esc(L(g.meta.tr,g.meta.en))}</div><div class="tbs">${g.items.map(testBox).join('')}</div></div>`).join('')
        :`<div class="none">${L('Hareket Kalitesi, Sıçrama & Reaktivite ya da Hız & Çeviklik testi yok.','No Movement Quality, Jump & Reactivity or Speed & Agility test.')}</div>`}</div>
    <div class="blk"><div class="two">${postureCard}${ohsCard}</div></div>
    <div class="blk pg2">${subH('<span lang="en">Joint by Joint</span>')}
      <div class="jb">${airJointFigure(tp.joints)}
        <div class="jb-r"><table class="jbt"><tr><th>${esc(atpT('Joint'))}</th><th>${esc(atpT('Need'))}</th><th>${esc(atpT('Right'))}</th><th>${esc(atpT('Left'))}</th></tr>${jbRows}</table>
          <div class="key"><span><i style="background:${AIR_NEED_C.mobility}"></i>${esc(atpT('Mobile Joints'))}</span><span><i style="background:${AIR_NEED_C.stability}"></i>${esc(atpT('Stable Joints'))}</span>${ATP_JOINT_LEVELS.map(l=>`<span><i style="background:${AIR_LV_C[l.id]}"></i>${esc(atpT(l.en))}</span>`).join('')}</div></div>
      </div></div>
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
  const AN_PER_ROW=10;
  const anTable=m=>{const n=m.pts.length;if(!n)return'';
    const tot=n>1?+(m.pts[n-1].v-m.pts[0].v).toFixed(1):null;
    const chunks=[];for(let i=0;i<n;i+=AN_PER_ROW)chunks.push(m.pts.slice(i,i+AN_PER_ROW).map((p,j)=>({...p,i:i+j})));
    const cols=Math.min(n,AN_PER_ROW);
    const lbl=`<th class="an-l" rowspan="${chunks.length*2}" style="border-left-color:${m.c}">${esc(L(m.tr,m.en))} <em>${m.u}</em>${tot!=null?`<span>${tot>0?'+':''}${tot} ${L('toplam','total')}</span>`:''}</th>`;
    const pad=c=>'<td></td>'.repeat(cols-c.length);
    const rows=chunks.map((c,ci)=>`<tr class="an-d">${ci?'':lbl}${c.map(p=>`<th>${p.date.slice(8)}.${p.date.slice(5,7)}.${p.date.slice(2,4)}</th>`).join('')}${pad(c).replace(/td/g,'th')}</tr>
      <tr class="an-v">${c.map(p=>{const dv=p.i>0?+(p.v-m.pts[p.i-1].v).toFixed(1):0;
        return`<td><b>${num(p.v)}</b>${dv?`<i>${dv>0?'+':''}${dv}</i>`:''}</td>`;}).join('')}${pad(c)}</tr>`).join('');
    return`<table class="an-t">${rows}</table>`;};
  const s4=`<section>
    ${secH(4,L('Antropometrik Ölçüm Takibi','Anthropometric Tracking'),anDates.length
      ?L(`${anDates.length} ölçüm tarihi · ${fd(anDates[0])} – ${fd(anDates[anDates.length-1])}`,`${anDates.length} measurement dates · ${fd(anDates[0])} – ${fd(anDates[anDates.length-1])}`)
      :L('Boy, kilo, kulaç ve yağ oranı zaman içinde','Height, weight, wingspan and body fat over time'))}
    ${anDates.length?`<div class="blk an-w">${anSer.map(anTable).join('')}</div>`
      :`<div class="card none">${L('Kayıtlı antropometrik ölçüm yok.','No anthropometric measurements recorded.')}</div>`}
  </section>`;
  /* ── 5 · Injuries ── */
  const ctxTr={Training:L('Antrenman','Training'),Match:L('Maç','Match'),Other:L('Diğer','Other')};
  const sideTr={Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral'),'N/A':''};
  const tissueTr={Muscle:L('Kas','Muscle'),Ligament:L('Bağ','Ligament'),Tendon:'Tendon',Bone:L('Kemik','Bone'),Cartilage:L('Kıkırdak','Cartilage'),'Joint capsule':L('Eklem kapsülü','Joint capsule'),Nerve:L('Sinir','Nerve'),Other:L('Diğer','Other')};
  let missD=0,missM=0;
  const injRows=injuries.map(i=>{const m=injMissed(i,setup);if(m.days)missD+=m.days;if(m.matches)missM+=m.matches;const act=!i.actualReturn;
    return`<tr><td>${i.date?fd(i.date):'—'}</td><td class="b">${esc([sideTr[i.side]||'',i.location||''].filter(Boolean).join(' ')||'—')}${i.type?`<div class="sw">${esc(i.type)}</div>`:''}</td>
      <td>${esc(tissueTr[i.tissueType]||i.tissueType||'—')}</td><td>${i.grade?esc(i.grade):'—'}</td><td>${esc(ctxTr[i.context]||'—')}${i.mechanism?`<div class="sw">${esc(i.mechanism)}</div>`:''}</td>
      <td>${i.sidelinedDate?fd(i.sidelinedDate):'—'} → ${i.actualReturn?fd(i.actualReturn):(i.estimatedReturn?`${fd(i.estimatedReturn)} <span class="sw">(${L('tahmini','est.')})</span>`:'—')}</td>
      <td class="r">${m.days!=null?m.days:'—'}</td><td class="r">${m.matches!=null?m.matches:'—'}</td>
      <td><span class="pill ${act?'act':'ok'}">${act?L('Aktif','Active'):L('İyileşti','Recovered')}</span></td></tr>${i.notes?`<tr class="nr"><td></td><td colspan="8">${esc(i.notes)}</td></tr>`:''}`;}).join('');
  const s5=`<section>
    ${secH(5,L('Sakatlıklar','Injuries'),L('Sakatlık kaydı, kaçırılan antrenman ve maçlar','Injury record, missed training and matches'))}
    <div class="kvs sm">${kv(L('Kayıt','Records'),injuries.length)}${kv(L('Aktif','Active'),injuries.filter(i=>!i.actualReturn).length)}${kv(L('Kaçırılan antrenman','Missed training'),missD,L('gün','days'))}${kv(L('Kaçırılan maç','Missed matches'),missM)}</div>
    ${injuries.length?`<table class="inj"><tr><th>${L('Tarih','Date')}</th><th>${L('Bölge / Tip','Region / Type')}</th><th>${L('Doku','Tissue')}</th><th>${L('Derece','Grade')}</th><th>${L('Bağlam','Context')}</th><th>${L('Kadro dışı → Dönüş','Sidelined → Return')}</th><th class="r">${L('Gün','Days')}</th><th class="r">${L('Maç','Matches')}</th><th>${L('Durum','Status')}</th></tr>${injRows}</table>`
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
.hd .r{margin-left:auto;text-align:right}
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
.an-t .an-d th{font-size:8px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);background:var(--soft);padding-top:3px}
.an-t .an-v td{font-size:10px;padding-bottom:4px}
.an-t .an-v b{font-size:11.5px;font-weight:700}
.an-t .an-v i{font-style:normal;font-size:7.5px;font-weight:600;color:var(--mu);margin-left:3px}
.an-t th.an-l{width:25mm;text-align:left;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);background:#fff;border-left:4px solid;border-right:1px solid var(--ln);padding:4px 7px;vertical-align:middle}
.an-t th.an-l em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--dim);font-weight:500}
.an-t th.an-l span{display:block;font-size:7.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu);margin-top:2px}
.txt{white-space:pre-wrap;font-size:10.5px;color:var(--ink)}
.none,.txt.none{color:var(--dim);font-size:10px}
.kvs{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:10px}
.kvs.sm{grid-template-columns:repeat(4,1fr)}
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
.tg{margin-bottom:7px}
.tgh{font-size:9px;font-weight:700;color:var(--t2);margin-bottom:4px}
.tbs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.tb{border:1px solid var(--ln);border-radius:8px;padding:6px 8px;break-inside:avoid}
.tn{font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--t2);display:flex;justify-content:space-between;gap:4px}
.tn em{font-style:normal;color:var(--dim);font-weight:500;text-transform:none}
.tv{font-size:16px;font-weight:700;margin-top:2px;display:flex;align-items:baseline;gap:5px}
.tv i{font-style:normal;font-size:9px;font-weight:600;color:var(--mu)}
.tv i.up{color:#16a34a}.tv i.dn{color:#dc2626}
.tv.bi{gap:10px;font-size:14px}
.tv.bi small{font-size:8px;color:var(--mu);font-weight:600;margin-right:3px}
.td{font-size:8.5px;color:var(--dim)}
.card.pt{padding:7px 9px}
.pt .pk{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
.pt .ptd{margin-left:auto;font-weight:600;letter-spacing:0;text-transform:none;color:var(--dim)}
.pt .pts{font-weight:700;letter-spacing:0;color:var(--acc)}
.shs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px}
.sh{text-align:center}
.sh img,.shx{width:100%;height:40mm;object-fit:contain;background:var(--soft);border:1px solid var(--ln);border-radius:6px;display:block}
.shx{display:grid;place-items:center;color:var(--dim);font-size:12px}
.sh figcaption{font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);font-weight:600;margin-top:2px}
.pt .txt{font-size:9px;line-height:1.38}
.pp{margin:0 0 3px 13px;font-size:9px;line-height:1.35}
.jb{display:grid;grid-template-columns:54mm 1fr;gap:10px;align-items:start}
.jbf{position:relative;border-radius:9px;overflow:hidden;background:#11151b;line-height:0}
.jbf img{width:100%;height:auto;display:block}
.jbf svg{position:absolute;inset:0;width:100%;height:100%}
.jbf .cap{position:absolute;bottom:6px;transform:translateX(-50%);font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#cfd4db;line-height:1}
.jbt td,.jbt th{padding:1.5px 4px;line-height:1.25}
.jbt td{font-size:8.5px}
.jbt th{font-size:7.5px}
.jbt td.mid{text-align:left}
.lv{display:inline-flex;align-items:center;gap:3px;font-weight:700;font-size:8.5px}
.lv i{width:6px;height:6px;border-radius:50%}
.need{font-size:8.5px;font-weight:600}
.jn{font-size:7.5px;color:var(--mu)}
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
    <div class="meta">${[ath.position?esc(POS_FULL[ath.position]||ath.position):'',pNow?esc(`${pNow.k} · ${L(pNow.tr,pNow.en)}`):'',esc(setup.teamName||'')].filter(Boolean).join(' · ')}</div></div>
  <div class="r"><div class="t">${L('Sporcu Bilgi Formu','Athlete Information Sheet')}</div><div class="d">${today_}</div></div>
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
