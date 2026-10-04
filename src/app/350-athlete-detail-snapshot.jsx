/* =========================================================
   ATHLETE DETAIL (Profile · Calendar · Week · Reports · Tests)
   ========================================================= */
/* =========================================================
   ATHLETE SNAPSHOT — compact text summary of an athlete's body
   composition, fatigue/wellness, load and test results, fed to the
   "Ask AI Coach" chatbox. Uses the same provider/API key the coach
   already set for the AI Coach assistant (data.ai).
   ========================================================= */
function recNum(v){return v!==''&&v!=null&&!isNaN(Number(v))?Number(v):null;}
function buildAthleteSnapshot(ath,setup,exercises){
  const out=[];
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  out.push(`SPORCU: ${ath.name||'—'}${ath.number?` (#${ath.number})`:''}`);
  out.push(`Pozisyon: ${POS_FULL[ath.position]||ath.position||'—'} | Yaş: ${age??'—'} | Spor: ${setup.sport||'—'}`);
  out.push(`Bugün: ${fmt(today)}`);
  // Body composition (latest + change vs previous)
  const ms=[...(ath.measurements||[])].filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
  out.push('\n=== VÜCUT KOMPOZİSYONU ===');
  if(ms.length){
    const cur=ms[ms.length-1],prev=ms[ms.length-2];
    const line=(k,lbl,u)=>{const c=recNum(cur[k]);if(c==null)return null;const p=prev?recNum(prev[k]):null;const d=p!=null?` (Δ ${(c-p>=0?'+':'')+(c-p).toFixed(1)})`:'';return `${lbl}: ${c}${u||''}${d}`;};
    const parts=[line('height','Boy','cm'),line('weight','Kilo','kg'),line('bodyFat','Yağ','%'),line('wingspan','Kulaç','cm')].filter(Boolean);
    out.push(`Son ölçüm (${cur.date}): ${parts.join(' | ')||'—'}`);
    const h=recNum(cur.height),w=recNum(cur.weight);if(h&&w)out.push(`BMI: ${(w/((h/100)**2)).toFixed(1)}`);
    if(ms.length>1)out.push(`Toplam ${ms.length} ölçüm var (ilk: ${ms[0].date}).`);
  } else out.push('Vücut kompozisyonu verisi yok.');
  // Wellness / fatigue (last 14 days averages + latest)
  out.push('\n=== YORGUNLUK / HAZIR BULUNUŞLUK (son 14 gün) ===');
  const ref=athLatestDate(ath);
  const recent=(ath.wellness||[]).filter(w=>w.date&&w.date>=fmt(addD(parseD(ref),-13))&&w.date<=ref);
  if(recent.length){
    const avg=f=>{const v=recent.map(w=>recNum(w[f])).filter(x=>x!=null);return v.length?(v.reduce((a,b)=>a+b,0)/v.length):null;};
    const fmtA=(f,u)=>{const a=avg(f);return a!=null?a.toFixed(1)+(u||''):'—';};
    out.push(`Ortalama → Hazır bulunuşluk: ${fmtA('readiness','/5')} | Zihinsel yorgunluk: ${fmtA('mentalFatigue','/5')} | Fiziksel yorgunluk: ${fmtA('physicalFatigue','/5')} | Yorgunluk (genel): ${fmtA('fatigue','/5')} | Kas ağrısı: ${fmtA('soreness','/5')} | Uyku: ${fmtA('sleep')} | RHR: ${fmtA('RHR','bpm')}`);
    const last=[...recent].sort((a,b)=>a.date.localeCompare(b.date)).pop();
    out.push(`Son check-in (${last.date}): Hazırlık ${last.readiness??'—'}/5, Zihinsel yorgunluk ${recNum(last.mentalFatigue)??'—'}/5, Fiziksel yorgunluk ${recNum(last.physicalFatigue)??'—'}/5, Yorgunluk (genel) ${last.fatigue??'—'}/5, Kas ağrısı ${last.soreness??'—'}/5${painSummary(last)?`, Ağrı bölgesi: ${painSummary(last)}`:''} (${recent.length} check-in)`);
  } else out.push('Son 14 günde wellness verisi yok.');
  // Load / ACWR
  out.push('\n=== YÜK / ACWR ===');
  const l7=athLoadSum(ath,fmt(addD(parseD(ref),-6)),ref);const acwr=athACWR(ath,ref);const z=acwrZoneOf(acwr);
  out.push(`Son 7 gün yük: ${l7} AU | ACWR: ${acwr?acwr.toFixed(2):'—'} (${z.t})`);
  // Injuries
  const inj=(ath.injuries||[]).filter(i=>i.status&&i.status!=='Recovered');
  out.push('\n=== SAKATLIK ===');
  out.push(inj.length?inj.map(i=>`- ${i.type||i.area||'Sakatlık'}${i.area&&i.type?` (${i.area})`:''} — durum: ${i.status}${i.date?`, ${i.date}`:''}`).join('\n'):'Aktif sakatlık yok.');
  // Latest test
  out.push('\n=== SON TEST SONUÇLARI ===');
  const ts=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(ts.length){
    const t=ts[ts.length-1];
    out.push(`Tarih: ${t.date}${t.period?` (${(TEST_PERIODS.find(p=>p.id===t.period)||{}).label||t.period})`:''}`);
    const add=(lbl,v,u)=>{const n=recNum(v);if(n!=null)out.push(`- ${lbl}: ${n}${u||''}`);};
    add('Dikey sıçrama',t.verticalJump,' cm');add('CMJ',t.cmj,' cm');add('Drop Jump (RSI)',t.dropJump);add('Yatay sıçrama',t.horizontalJump,' cm');
    const lcjR=recNum(t.lateralCmj&&t.lateralCmj.right),lcjL=recNum(t.lateralCmj&&t.lateralCmj.left);
    if(lcjR!=null||lcjL!=null)out.push(`- Lateral CMJ (yana sıçrama): R ${lcjR??'—'} cm / L ${lcjL??'—'} cm${(lcjR!=null&&lcjL!=null)?` (fark ${Math.abs(lcjR-lcjL).toFixed(1)} cm)`:''}`);
    add('20m sprint',t.sprint20m&&t.sprint20m.time,' s');add('T-Test çeviklik',t.tTest,' s');add('Shuttle/dayanıklılık',t.shuttleRun,' s');
    add('Boy',t.height,' cm');add('Kilo',t.weight,' kg');add('Yağ',t.bodyFat,' %');add('Kulaç',t.wingspan,' cm');
    add('Bacak uzunluğu (ASIS–medial malleol)',t.legLength,' cm');add('Oturma yüksekliği',t.sittingHeight,' cm');
    const adfR=recNum(t.ankleDF&&t.ankleDF.right),adfL=recNum(t.ankleDF&&t.ankleDF.left);
    if(adfR!=null||adfL!=null){const diff=(adfR!=null&&adfL!=null)?Math.abs(adfR-adfL).toFixed(1):'—';out.push(`- Ayak bileği dorsifleksiyon: R ${adfR??'—'}° / L ${adfL??'—'}° (fark ${diff}°)`);}
    const asR=recNum(t.aslr&&t.aslr.right),asL=recNum(t.aslr&&t.aslr.left);
    if(asR!=null||asL!=null)out.push(`- ASLR (FMS 0-3): R ${asR??'—'} / L ${asL??'—'}`);
    const ybAI=ybCalc(t.yBalance);
    if(ybAI.compR!=null||ybAI.compL!=null)out.push(`- Y Balance kompozit skor: R ${ybAI.compR??'—'}% / L ${ybAI.compL??'—'}% (bacak uzunluğu ${ybAI.limb??'—'} cm)`);
    if(t.ohs&&t.ohs.score!==''&&t.ohs.score!=null)out.push(`- Overhead Squat (FMS 0-3): ${t.ohs.score}${(t.ohs.problems||[]).filter(Boolean).length?` — sorunlar: ${(t.ohs.problems||[]).filter(Boolean).join('; ')}`:''}`);
    const circ=t.circ||{};const ca=[];const cl=(k,lbl)=>{const n=recNum(circ[k]);if(n!=null)ca.push(`${lbl} ${n}`);};
    cl('shoulder','Omuz');cl('waist','Bel');cl('hip','Kalça');cl('thighRight','Uyluk R');cl('thighLeft','Uyluk L');cl('calfRight','Baldır R');cl('calfLeft','Baldır L');
    if(ca.length)out.push(`- Çevre ölçümleri (cm): ${ca.join(', ')}`);
    if(t.posture&&t.posture.observations)out.push(`- Postür notları: ${t.posture.observations}`);
    if(t.ohs&&t.ohs.observations)out.push(`- OHS notları: ${t.ohs.observations}`);
    if(t.notes)out.push(`- Genel notlar: ${t.notes}`);
    if(ts.length>1)out.push(`(Toplam ${ts.length} test; bir önceki: ${ts[ts.length-2].date})`);
  } else out.push('Test verisi yok.');
  // Exercise library so the model can recommend the coach's own exercises
  const exs=exercises||[];
  if(exs.length){
    out.push('\n=== EGZERSİZ KÜTÜPHANESİ (öneriler buradan seçilebilir) ===');
    const byType={};exs.forEach(e=>{const ty=e.type||'Diğer';(byType[ty]=byType[ty]||[]).push((e.name||'?')+(e.difficulty?` (${e.difficulty})`:''));});
    Object.entries(byType).forEach(([ty,n])=>{const sh=n.slice(0,30);out.push(`- ${ty}: ${sh.join(', ')}${n.length>sh.length?' …':''}`);});
  }
  let txt=out.join('\n');if(txt.length>28000)txt=txt.slice(0,28000)+'\n…(kısaltıldı)';return txt;
}

