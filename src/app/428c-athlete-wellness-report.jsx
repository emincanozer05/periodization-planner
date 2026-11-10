/* ═══════════════════════════════════════════════════════════════════════════
   SPORCU WELLNESS ÇIKTISI — haftalık ve aylık (A4 dikey), tek sporcu
   Wellness → sporcu sayfasının başlık bandındaki "Haftalık Çıktı Al" / "Aylık Çıktı Al".
   Takım çıktısının (428, printWellnessReport) rapor dili; içerik sporcuya göre:
     · sekiz gösterge: check-in uyumu, hazır oluş (önceki döneme göre fark), dört soru,
       Polar gece nabzı ve Polar uyku süresi
     · günlük hazır oluş çubukları (takımın o günkü ortalaması ince çizgiyle) + öne çıkanlar
     · check-in puanları: metrik × gün (hafta) ya da metrik × hafta (ay), dönem ortalaması,
       önceki dönem, fark ve takım ortalaması
     · Polar Loop — uyku ve toparlanma: uyku süresi, uyku skoru, HRV, gece nabzı, ANS, adım
     · antrenman yükü: sRPE (AU), Polar antrenman süresi / yükü / seans sayısı ve dönemin
       kalp atım bölgesi dağılımı
     · ağrı bildirimleri: bölge, en yüksek şiddet, kaç gün; gün gün liste ve notlar
   Değerler ekranla aynı yoldan: wvDay (günün son kaydı), Polar gece verisi uyanılan sabahın
   tarihiyle (pwNightHrMap'in kuralı). Henüz gelmemiş günler sayılmaz. Önceki dönem: haftada
   bir önceki hafta, ayda bir önceki takvim ayı. Polar verisi çıktı açılırken tek istekle
   (/team-data, önceki dönemin başı → dönemin sonu) alınır; sporcu Polar'a bağlı değilse ya da
   istek başarısızsa Polar bölümleri nedenini yazan tek satırla basılır.
   ═══════════════════════════════════════════════════════════════════════════ */
const AWR_CHECK=['readiness','sleep','mentalFatigue','physicalFatigue','soreness'];
const AWR_POLAR=['sleepH','sleepScore','hrv','nightHR','ans','steps'];
const AWR_LOAD=['srpe','exMin','exLoad','exN'];
const AWR_SUM={srpe:1,exMin:1,exLoad:1,exN:1};

/* Polar yanıtı → gün anahtarlı haritalar. Gece verisi (uyku, HRV, gece nabzı, ANS) uyanılan
   sabahın tarihine yazılır; adım ve antrenman kendi gününe. */
function awrPolarMaps(p){
  const o={nightHR:{},hrv:{},ans:{},sleepH:{},sleepScore:{},steps:{},ex:{}};
  if(!p)return o;
  const wake={};
  (p.sleep||[]).forEach(x=>{if(!x)return;const k=String(x.sleepEnd||'').slice(0,10)||x.date;if(!k)return;
    if(x.date)wake[x.date]=k;
    if(pwNum(x.asleepSec))o.sleepH[k]=x.asleepSec/3600;
    if(pwNum(x.sleepScore))o.sleepScore[k]=x.sleepScore;});
  (p.recharge||[]).forEach(r=>{if(!r||!r.date)return;const k=wake[r.date]||r.date;
    if(pwNum(r.hrAvg))o.nightHR[k]=r.hrAvg;
    if(pwNum(r.hrvMs))o.hrv[k]=r.hrvMs;
    if(pwNum(r.ansCharge))o.ans[k]=r.ansCharge;});
  (p.activity||[]).forEach(a=>{if(a&&a.date&&pwNum(a.steps))o.steps[a.date]=a.steps;});
  (p.exercises||[]).forEach(e=>{if(e&&e.date)(o.ex[e.date]||(o.ex[e.date]=[])).push(e);});
  return o;
}

function buildAthleteWellnessReport({ath,team,kind,from,to,label,polar,polarNote,pnhr}){
  const tk=fmt(today);
  const wk=kind==='week';
  const span=(a,b)=>{const o=[];for(let c=parseD(a);fmt(c)<=b;c=addD(c,1))o.push(fmt(c));return o;};
  const days=span(from,to);
  const done=days.filter(k=>k<=tk);
  const f0=parseD(from);
  const pFrom=wk?fmt(addD(f0,-7)):fmt(new Date(f0.getFullYear(),f0.getMonth()-1,1));
  const pTo=fmt(addD(f0,-1));
  const prev=span(pFrom,pTo);
  const cols=wk?days.map((k,i)=>({lab:DN[i],sub:fd(k).slice(0,5),days:[k]}))
    :(()=>{const o=[];for(let c=sow(f0);fmt(c)<=to;c=addD(c,7)){const ws=fmt(c),we=fmt(addD(c,6));
      o.push({lab:fd(ws<from?from:ws).slice(0,5),sub:'– '+fd(we>to?to:we).slice(0,5),days:days.filter(k=>k>=ws&&k<=we)});}return o;})();
  const P=awrPolarMaps(polar);
  const dc={};const dOf=k=>(k in dc)?dc[k]:(dc[k]=wvDay(ath,k));
  const srpe={};(ath.srpeLog||[]).forEach(e=>{const v=e&&Number(e.totalLoad);if(e&&e.date&&isFinite(v)&&v>0)srpe[e.date]=(srpe[e.date]||0)+v;});
  const exSum=(k,f)=>{const xs=(P.ex[k]||[]).map(f).filter(pwNum);return xs.length?xs.reduce((a,b)=>a+b,0):null;};
  const nn=v=>v==null?null:v;
  const get={
    srpe:k=>nn(srpe[k]),
    exMin:k=>{const v=exSum(k,e=>e.durationSec);return v==null?null:v/60;},
    exLoad:k=>exSum(k,e=>e.trainingLoad),
    exN:k=>(P.ex[k]||[]).length||null,
  };
  AWR_CHECK.forEach(id=>{get[id]=k=>nn((dOf(k)||{})[id]);});
  ['sleepH','sleepScore','hrv','nightHR','ans','steps'].forEach(id=>{get[id]=k=>nn(P[id][k]);});
  const agg=(id,ks)=>{const v=ks.map(get[id]).filter(x=>x!=null);if(!v.length)return null;
    const s=v.reduce((a,b)=>a+b,0);return AWR_SUM[id]?s:s/v.length;};
  const row=id=>{const cur=agg(id,done),pv=agg(id,prev);
    return{id,cells:cols.map(c=>agg(id,c.days.filter(k=>k<=tk))),avg:cur,prev:pv,delta:cur!=null&&pv!=null?cur-pv:null,
      n:done.filter(k=>get[id](k)!=null).length};};
  const rows={};[...AWR_CHECK,...AWR_POLAR,...AWR_LOAD].forEach(id=>{rows[id]=row(id);});
  /* Takım: her sporcunun dönem ortalamasının ortalaması (çok form dolduran ağır basmasın). */
  const mates=(team&&team.athletes)||[];
  const tm={};
  AWR_CHECK.forEach(id=>{tm[id]=wvMean(mates.map(a=>wvMean(done.map(k=>{const d=wvDay(a,k);return d?d[id]:null;}))));});
  tm.nightHR=pnhr?wvMean(mates.map(a=>{const m=pnhr[String(a.id)];return m?wvMean(done.map(k=>(typeof m[k]==='number'?m[k]:null))):null;})):null;
  const daily=days.map(k=>{const fut=k>tk;
    const tv=fut?[]:mates.map(a=>{const d=wvDay(a,k);return d&&d.readiness;}).filter(x=>x!=null);
    return{k,fut,v:fut?null:get.readiness(k),team:wvMean(tv)};});
  /* Ağrı: bölge başına en yüksek şiddet ve gün sayısı; ayrıca gün gün. */
  const pain={},painDays=[];const notes=[];
  done.forEach(k=>{const d=dOf(k);if(!d)return;
    if(d.pain&&d.pain.list.length){painDays.push({k,list:d.pain.list});
      d.pain.list.forEach(x=>{const o=pain[x.region]||(pain[x.region]={region:x.region,sev:0,n:0});o.sev=Math.max(o.sev,x.sev);o.n++;});}
    if(d.note)notes.push({k,t:d.note});});
  /* Dönemin kalp atım bölgeleri: bütün Polar antrenmanlarının bölge sürelerinin toplamı. */
  const zs=done.flatMap(k=>(P.ex[k]||[]).map(pwZoneSec).filter(Boolean));
  const zones=zs.length?[0,1,2,3,4].map(i=>zs.reduce((s,z)=>s+z[i],0)):null;
  const nCheck=done.filter(k=>get.readiness(k)!=null).length;
  const lowDays=done.filter(k=>{const v=get.readiness(k);return v!=null&&v<3;});
  const withR=done.map(k=>({k,v:get.readiness(k)})).filter(x=>x.v!=null);
  const minDay=withR.length?withR.reduce((a,b)=>b.v<a.v?b:a):null;
  const maxDay=withR.length?withR.reduce((a,b)=>b.v>a.v?b:a):null;
  return{kind,wk,label,from,to,ref:done.length?done[done.length-1]:from,partial:done.length<days.length,
    teamName:(team&&team.setup&&team.setup.teamName)||'',name:ath.name||'—',pos:posOf(ath.position)||'',number:ath.number||'',
    cols,rows,tm,daily,nDone:done.length,nCheck,lowDays,minDay,maxDay,
    pain:Object.values(pain).sort((x,y)=>(y.sev-x.sev)||(y.n-x.n)),painDays,notes,zones,
    hasPolar:!!polar,polarNote:polarNote||''};
}

function athleteWellnessReportHtml(R){
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const wk=R.wk;
  const f1=v=>v==null?'—':Number(v).toFixed(1);
  const f0=v=>v==null?'—':Math.round(v).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-GB');
  const hm=h=>{if(h==null)return'—';const m=Math.round(h*60);return L(`${Math.floor(m/60)} sa ${String(m%60).padStart(2,'0')} dk`,`${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`);};
  const hmS=h=>{if(h==null)return'—';const m=Math.round(h*60);return`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
  const sg=(v,d)=>v==null?'—':Math.abs(v)<(d?0.05:0.5)?(d?'0.0':'0'):(v>0?'+':'−')+(d?Math.abs(v).toFixed(d):Math.round(Math.abs(v)).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-GB'));
  /* Baskıda okunur renkler: formun 1-5 renkleri, sarı ve yeşil biraz koyulaştırılmış. */
  const PC=['#dc2626','#ea580c','#ca8a04','#16a34a','#0284c7'];
  const sc=v=>v==null?null:PC[Math.min(5,Math.max(1,Math.round(v)))-1];
  const prevLbl=wk?L('Önceki hafta','Prev. week'):L('Önceki ay','Prev. month');
  const M={readiness:L('Hazır oluş','Readiness'),sleep:L('Uyku kalitesi','Sleep quality'),mentalFatigue:L('Zihinsel yorgunluk','Mental fatigue'),
    physicalFatigue:L('Fiziksel yorgunluk','Physical fatigue'),soreness:L('Kas ağrısı','Muscle soreness'),
    sleepH:L('Uyku süresi (sa:dk)','Sleep time (h:mm)'),sleepScore:L('Uyku skoru','Sleep score'),hrv:'HRV (ms)',nightHR:L('Gece nabzı (bpm)','Night HR (bpm)'),
    ans:'ANS Charge',steps:L('Adım','Steps'),srpe:L('sRPE yükü (AU)','sRPE load (AU)'),exMin:L('Polar antrenman (dk)','Polar training (min)'),
    exLoad:L('Polar antrenman yükü','Polar training load'),exN:L('Polar seans sayısı','Polar sessions')};
  const FM={sleepH:hmS,sleepScore:f0,hrv:f0,nightHR:f0,ans:v=>v==null?'—':(v>0?'+':'')+v.toFixed(1),steps:f0,srpe:f0,exMin:f0,exLoad:f0,exN:f0};
  const DL={sleepH:d=>d==null?'—':Math.abs(d*60)<0.5?'0:00':(d>0?'+':'−')+hmS(Math.abs(d)),ans:d=>sg(d,1)};
  const title=wk?L('Haftalık Wellness Raporu','Weekly Wellness Report'):L('Aylık Wellness Raporu','Monthly Wellness Report');
  const r=R.rows;
  /* ── göstergeler ── */
  const dCol=(d,good)=>d==null||!good?'#5c626c':d*good>=0.3?'#16a34a':d*good<=-0.3?'#dc2626':'#5c626c';
  const tile=(k,v,sub,c)=>`<div class="kp"${c?` style="--kc:${c}"`:''}><div class="kk">${k}</div><div class="kv">${v}</div><div class="ks">${sub}</div></div>`;
  const five=id=>tile(M[id],f1(r[id].avg)+'<small>/5</small>',
    r[id].delta==null?`${prevLbl}: —`:`${prevLbl}: ${f1(r[id].prev)} <b style="color:${dCol(r[id].delta,1)}">(${sg(r[id].delta,1)})</b>`,sc(r[id].avg));
  const comp=R.nDone?R.nCheck/R.nDone*100:null;
  const kpis=[
    tile(L('Check-in uyumu','Check-in rate'),comp==null?'—':`${Math.round(comp)}<small>%</small>`,L(`${R.nCheck}/${R.nDone} gün`,`${R.nCheck}/${R.nDone} days`),comp==null?null:comp>=80?'#16a34a':comp>=60?'#ca8a04':'#dc2626'),
    five('readiness'),five('sleep'),five('mentalFatigue'),five('physicalFatigue'),five('soreness'),
    tile(L('Gece nabzı','Night HR'),f0(r.nightHR.avg)+'<small> bpm</small>',r.nightHR.delta==null?L('Polar · gece ortalaması','Polar · night mean'):`${prevLbl}: ${f0(r.nightHR.prev)} (${sg(r.nightHR.delta)})`),
    tile(L('Uyku süresi','Sleep time'),r.sleepH.avg==null?'—':hm(r.sleepH.avg),r.sleepH.delta==null?L('Polar · gece ortalaması','Polar · night mean'):`${prevLbl}: ${hm(r.sleepH.prev)}`),
  ].join('');
  /* ── günlük hazır oluş ── */
  const bars=R.daily.map((d,i)=>{const h=d.v==null?0:Math.max(4,(d.v-1)/4*100);const c=sc(d.v)||'#c3c7cd';const dt=parseD(d.k);
    const tl=d.team==null?'':`<i class="tl" style="bottom:${((d.team-1)/4*100).toFixed(1)}%"></i>`;
    return`<div class="bc${d.fut?' fut':''}${!wk&&[0,6].includes(dt.getDay())?' we':''}"><div class="bg">${tl}<div class="bv" style="color:${c}">${d.v==null?'':f1(d.v)}</div><div class="br" style="height:${h}%;background:${c}"></div></div>
      <div class="bl">${wk?`<b>${DN[i]}</b>${fd(d.k).slice(0,5)}`:dt.getDate()}</div></div>`;}).join('');
  const daySec=`<div class="sec"><div class="sh"><span class="st">${L('Günlük hazır oluş','Daily readiness')}</span><span class="ss"><i class="tk"></i>${L('takım ortalaması · 1–5','team mean · 1–5')}</span></div><div class="chart${wk?' wk':''}">${bars}</div></div>`;
  /* ── öne çıkanlar ── */
  const dn=k=>`${DN[(parseD(k).getDay()+6)%7]} ${fd(k).slice(0,5)}`;
  const hl=[];
  const rd=r.readiness;
  if(rd.avg!=null){
    hl.push([sc(rd.avg),L(`Hazır oluş ortalaması <b>${f1(rd.avg)}</b>`,`Mean readiness <b>${f1(rd.avg)}</b>`)+(rd.delta!=null?L(` · ${wk?'önceki haftaya':'önceki aya'} göre <b>${sg(rd.delta,1)}</b>`,` · <b>${sg(rd.delta,1)}</b> vs the previous ${wk?'week':'month'}`):'')]);
    if(R.tm.readiness!=null){const df=rd.avg-R.tm.readiness;
      hl.push(['#8b9099',Math.abs(df)<0.2?L(`Takım ortalamasıyla aynı düzeyde (${f1(R.tm.readiness)})`,`In line with the team mean (${f1(R.tm.readiness)})`)
        :L(`Takım ortalamasının (${f1(R.tm.readiness)}) <b>${Math.abs(df).toFixed(1)}</b> ${df>0?'üstünde':'altında'}`,`<b>${Math.abs(df).toFixed(1)}</b> ${df>0?'above':'below'} the team mean (${f1(R.tm.readiness)})`)]);}
    if(R.minDay&&R.maxDay&&R.minDay.k!==R.maxDay.k)hl.push([sc(R.minDay.v),L(`En düşük gün ${dn(R.minDay.k)} (<b>${f1(R.minDay.v)}</b>) · en yüksek ${dn(R.maxDay.k)} (<b>${f1(R.maxDay.v)}</b>)`,`Lowest day ${dn(R.minDay.k)} (<b>${f1(R.minDay.v)}</b>) · highest ${dn(R.maxDay.k)} (<b>${f1(R.maxDay.v)}</b>)`)]);
    if(R.lowDays.length)hl.push(['#dc2626',L(`<b>${R.lowDays.length}</b> gün hazır oluş 3'ün altında: ${R.lowDays.slice(0,6).map(dn).join(', ')}`,`Readiness below 3 on <b>${R.lowDays.length}</b> day(s): ${R.lowDays.slice(0,6).map(dn).join(', ')}`)]);
  }
  hl.push([R.nCheck===R.nDone?'#16a34a':'#ca8a04',L(`Check-in uyumu: ${R.nDone} günün <b>${R.nCheck}</b> günü`,`Check-in on <b>${R.nCheck}</b> of ${R.nDone} days`)]);
  if(R.painDays.length)hl.push(['#ea580c',L(`<b>${R.painDays.length}</b> gün ağrı bildirimi: ${esc(R.pain.slice(0,3).map(p=>p.region).join(', '))}`,`Pain reported on <b>${R.painDays.length}</b> day(s): ${esc(R.pain.slice(0,3).map(p=>p.region).join(', '))}`)]);
  if(r.sleepH.avg!=null)hl.push(['#1f7cc2',L(`Polar uyku ortalaması <b>${hm(r.sleepH.avg)}</b>`,`Polar mean sleep <b>${hm(r.sleepH.avg)}</b>`)+(r.sleepH.delta!=null?` (${DL.sleepH(r.sleepH.delta)})`:'')]);
  if(r.nightHR.avg!=null)hl.push(['#1f7cc2',L(`Gece nabzı ortalaması <b>${f0(r.nightHR.avg)} bpm</b>`,`Mean night HR <b>${f0(r.nightHR.avg)} bpm</b>`)+(r.nightHR.delta!=null?` (${sg(r.nightHR.delta)})`:'')
    +(R.tm.nightHR!=null?L(` · takım ${f0(R.tm.nightHR)}`,` · team ${f0(R.tm.nightHR)}`):'')]);
  const hlSec=`<div class="sec"><div class="sh"><span class="st">${L('Öne çıkanlar','Highlights')}</span></div><div class="wl">${hl.length?hl.slice(0,7).map(([c,t])=>`<div class="wr"><span class="wd" style="background:${c||'#c3c7cd'}"></span><span>${t}</span></div>`).join(''):`<div class="ok">${L('Bu dönemde veri yok.','No data in this period.')}</div>`}</div></div>`;
  /* ── tablolar ── */
  const cell5=v=>{if(v==null)return'<td class="c e">·</td>';const c=sc(v);return`<td class="c" style="background:${c}1f;color:${c}"><b>${f1(v)}</b></td>`;};
  const cellN=(v,id)=>v==null?'<td class="c e">·</td>':`<td class="c r">${FM[id](v)}</td>`;
  const colHead=R.cols.map(c=>`<th class="c">${c.lab}<i>${c.sub}</i></th>`).join('');
  const checkT=`<table class="tm"><thead><tr><th class="l">${L('Check-in','Check-in')}</th>${colHead}<th>${L('Ort.','Avg')}</th><th>${prevLbl}</th><th>Δ</th><th>${L('Takım','Team')}</th></tr></thead><tbody>
    ${AWR_CHECK.map(id=>`<tr${id==='readiness'?' class="hi"':''}><td class="l">${M[id]}</td>${r[id].cells.map(cell5).join('')}<td class="av" style="color:${sc(r[id].avg)||'#8b9099'}">${f1(r[id].avg)}</td><td>${f1(r[id].prev)}</td>
      <td class="dl" style="color:${dCol(r[id].delta,1)}">${sg(r[id].delta,1)}</td><td class="tmc">${f1(R.tm[id])}</td></tr>`).join('')}</tbody></table>`;
  const numT=(ids,head,sumLbl,withTeam)=>`<table class="tm"><thead><tr><th class="l">${head}</th>${colHead}<th>${sumLbl}</th><th>${prevLbl}</th><th>Δ</th>${withTeam?`<th>${L('Takım','Team')}</th>`:''}</tr></thead><tbody>
    ${ids.map(id=>{const x=r[id];const dl=DL[id]?DL[id](x.delta):AWR_SUM[id]?(x.delta==null||!x.prev?'—':(x.delta>0?'+':'−')+Math.round(Math.abs(x.delta)/x.prev*100)+'%'):sg(x.delta,id==='ans'?1:0);
      return`<tr><td class="l">${M[id]}</td>${x.cells.map(v=>cellN(v,id)).join('')}<td class="av">${FM[id](x.avg)}</td><td>${FM[id](x.prev)}</td><td class="dl">${dl}</td>${withTeam?`<td class="tmc">${id==='nightHR'?f0(R.tm.nightHR):'—'}</td>`:''}</tr>`;}).join('')}</tbody></table>`;
  const checkSec=`<div class="sec"><div class="sh"><span class="st">${L('Check-in puanları','Check-in scores')}</span><span class="ss">${wk?L('gün gün','day by day'):L('hafta hafta (ortalama)','week by week (mean)')} · ${L('1 kötü · 5 iyi','1 poor · 5 good')}</span></div>${checkT}</div>`;
  const anyPolar=AWR_POLAR.some(id=>r[id].avg!=null||r[id].prev!=null);
  const polarSec=`<div class="sec"><div class="sh"><span class="st">${L('Uyku ve toparlanma','Sleep and recovery')}</span><span class="ss">Polar Loop · ${L('gece verisi uyanılan sabahın tarihiyle','night data dated by the morning woken up')}</span></div>
    ${anyPolar?numT(AWR_POLAR,'Polar',L('Ort.','Avg'),true):`<div class="none">${esc(R.polarNote||L('Bu dönemde Polar verisi yok.','No Polar data in this period.'))}</div>`}</div>`;
  const anyLoad=AWR_LOAD.some(id=>r[id].avg!=null||r[id].prev!=null);
  const zt=R.zones?R.zones.reduce((a,b)=>a+b,0):0;
  const zoneBar=zt>0?`<div class="zn"><div class="zk">${L('Kalp atım bölgeleri · dönem toplamı','Heart rate zones · period total')} <b>${Math.round(zt/60)} ${L('dk','min')}</b></div>
    <div class="zb">${R.zones.map((v,i)=>v>0?`<i style="flex-grow:${v};background:${PW_ZONE_COL[i]}"></i>`:'').join('')}</div>
    <div class="zl">${R.zones.map((v,i)=>`<span><i style="background:${PW_ZONE_COL[i]}"></i>Z${i+1} <b>${Math.round(v/60)}</b> ${L('dk','min')} · %${Math.round(v/zt*100)}</span>`).join('')}</div></div>`:'';
  const loadSec=`<div class="sec"><div class="sh"><span class="st">${L('Antrenman yükü','Training load')}</span><span class="ss">${L('sRPE: check-in (RPE × dk) · antrenman: Polar','sRPE: check-in (RPE × min) · sessions: Polar')}</span></div>
    ${anyLoad?numT(AWR_LOAD,L('Yük','Load'),L('Toplam','Total'),false):`<div class="none">${L('Bu dönemde yük kaydı yok.','No load records in this period.')}</div>`}${zoneBar}</div>`;
  /* ── ağrı ── */
  const sevL=PAIN_SEV_LABEL();
  const painSec=`<div class="sec"><div class="sh"><span class="st">${L('Ağrı bildirimleri','Pain reports')}</span><span class="ss">${R.painDays.length?L(`${R.painDays.length} gün · en yüksek şiddet ve gün sayısı`,`${R.painDays.length} day(s) · peak severity and day count`):''}</span></div>
    ${R.pain.length?`<div class="pc">${R.pain.map(p=>`<i class="pg s${p.sev}">${esc(p.region)}${sevL[p.sev]?` · ${sevL[p.sev]}`:''}${p.n>1?` · ${p.n} ${L('gün','days')}`:''}</i>`).join('')}</div>
      <div class="pd${R.painDays.length>4?' two':''}">${R.painDays.map(d=>`<div><b>${dn(d.k)}</b>${d.list.map(x=>`<span class="pt s${x.sev}">${esc(x.region)}${sevL[x.sev]?` (${sevL[x.sev].toLocaleLowerCase('tr')})`:''}</span>`).join('')}</div>`).join('')}</div>`
      :`<div class="none">${L('Bu dönemde ağrı bildirimi yok.','No pain reported in this period.')}</div>`}
    ${R.notes.length?`<div class="pn">${R.notes.map(n=>`<div><b>${dn(n.k)}</b> ${esc(n.t)}</div>`).join('')}</div>`:''}</div>`;
  const gen=new Date().toLocaleDateString(REPORT_LANG==='tr'?'tr-TR':'en-GB');
  const who=[R.pos,R.number&&'#'+R.number,R.teamName].filter(Boolean).join(' · ');
  return`<!DOCTYPE html><html lang="${REPORT_LANG==='tr'?'tr':'en'}"><head><meta charset="utf-8"><title>${title} — ${esc(R.name)} — ${esc(R.label)}</title>
<style>
@page{size:A4 portrait;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ac:#1f7cc2;--ink:#0b0c0e;--bg2:#f5f6f8;--bd:#e3e5e8;--mut:#5c626c;--dim:#8b9099}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--ink);font-size:10px;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:#fff;padding:11px 16px;margin-bottom:9px}
.hd .l{display:flex;align-items:center;gap:14px;min-width:0}.hd img{height:13px;width:auto}
.hd .sep{width:1px;height:34px;background:rgba(255,255,255,.2)}
.hd .ey{font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.hd h1{font-size:18px;font-weight:700;letter-spacing:.01em;text-transform:uppercase;line-height:1.15;margin-top:2px}
.hd .tm{font-size:9.5px;color:rgba(255,255,255,.65);margin-top:2px}
.hd .r{text-align:right;flex:none}.hd .rng{display:inline-block;font-size:11px;font-weight:700;background:var(--ac);padding:5px 12px}
.hd .gd{font-size:8.5px;color:rgba(255,255,255,.55);margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:9px}
.kp{border:1px solid var(--bd);border-top:3px solid var(--kc,var(--ink));padding:7px 10px 8px}
.kk{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.kv{font-size:20px;font-weight:700;margin-top:4px;line-height:1;color:var(--kc,var(--ink))}
.kv small{font-size:10px;font-weight:600;color:var(--dim);margin-left:1px}
.ks{font-size:8.5px;color:var(--mut);margin-top:5px}.ks b{font-weight:700}
.g2{display:grid;grid-template-columns:1.25fr 1fr;gap:9px;margin-bottom:9px}
.sec{border:1px solid var(--bd);break-inside:avoid;page-break-inside:avoid;margin-bottom:9px}
.g2 .sec{margin-bottom:0}
.sh{display:flex;align-items:baseline;gap:10px;padding:7px 11px;border-bottom:1px solid var(--bd)}
.st{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ac)}
.ss{margin-left:auto;font-size:8.5px;color:var(--dim);display:inline-flex;align-items:center;gap:5px}
.ss .tk{display:inline-block;width:14px;height:0;border-top:1.5px solid var(--ink)}
.chart{display:flex;gap:2px;height:136px;padding:10px 10px 6px}
.chart.wk{gap:8px}
.bc{flex:1;display:flex;flex-direction:column;min-width:0}.bc.we .bg{background:var(--bg2)}.bc.fut .bl{opacity:.4}
.bg{position:relative;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.bv{font-size:8px;font-weight:700;margin-bottom:2px}.chart:not(.wk) .bv{font-size:6px}
.br{width:70%;max-width:40px}
.tl{position:absolute;left:8%;right:8%;height:0;border-top:1.5px solid var(--ink);z-index:2}
.bl{text-align:center;font-size:7.5px;color:var(--dim);margin-top:4px;line-height:1.25}
.bl b{display:block;color:var(--ink);font-size:8.5px}
.wl{padding:3px 11px}
.wr{display:flex;align-items:baseline;gap:8px;padding:5.5px 0;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mut);line-height:1.35}
.wr:last-child{border-bottom:none}.wr b{color:var(--ink);font-weight:700}
.wd{width:7px;height:7px;border-radius:50%;flex:none;transform:translateY(-1px)}
.ok,.none{padding:12px 11px;color:var(--mut);font-size:9px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{font-size:7.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--ink);padding:5px 3px;text-align:center}
th i{display:block;font-style:normal;font-weight:500;color:rgba(255,255,255,.6);letter-spacing:0;text-transform:none}
td{padding:4.5px 3px;border-top:1px solid var(--bd);text-align:center;font-variant-numeric:tabular-nums;font-size:9px}
th.l,td.l{text-align:left;padding-left:10px;width:25%}
td.l{font-size:8.8px;color:var(--mut)}tr.hi td.l{color:var(--ink);font-weight:700}
td.c b{font-weight:700}td.e{color:#c3c7cd}td.r{color:var(--ink)}
td.av{font-weight:700;background:var(--bg2)}td.dl{font-weight:700;color:var(--mut)}td.tmc{color:var(--mut)}
.zn{padding:8px 11px 9px;border-top:1px solid var(--bd)}
.zk{font-size:8.5px;color:var(--mut);margin-bottom:5px}.zk b{color:var(--ink)}
.zb{display:flex;gap:2px;height:9px}.zb i{display:block;height:100%}
.zl{display:flex;flex-wrap:wrap;gap:3px 14px;margin-top:5px;font-size:8.5px;color:var(--mut)}
.zl span{display:inline-flex;align-items:center;gap:4px}.zl i{width:7px;height:7px;display:inline-block}.zl b{color:var(--ink)}
.pc{display:flex;flex-wrap:wrap;gap:4px;padding:8px 11px 4px}
.pg{font-style:normal;font-size:8.5px;padding:2px 7px;border:1px solid}
.pg.s0,.pg.s3{color:#dc2626;border-color:#dc262666;background:#dc262612}
.pg.s2{color:#ea580c;border-color:#ea580c66;background:#ea580c12}
.pg.s1{color:#a16207;border-color:#ca8a0466;background:#ca8a0412}
.pd,.pn{padding:4px 11px 8px;font-size:8.8px;color:var(--mut)}
.pd.two{columns:2;column-gap:18px}
.pd div,.pn div{padding:2.5px 0;break-inside:avoid}.pd b,.pn b{color:var(--ink);margin-right:6px}
.pt{margin-right:8px}.pt.s3,.pt.s0{color:#dc2626}.pt.s2{color:#ea580c}.pt.s1{color:#a16207}
.pn{border-top:1px solid var(--bd);padding-top:6px}
.fo{display:flex;justify-content:space-between;gap:16px;font-size:7.8px;color:var(--dim);margin-top:2px;line-height:1.4}
</style></head><body>
<div class="hd"><div class="l"><img src="${COACHOS_LOGO}" alt="CoachOS"><span class="sep"></span><div><div class="ey">${title}</div><h1>${esc(R.name)}</h1><div class="tm">${esc(who)}</div></div></div>
  <div class="r"><div class="rng">${esc(R.label)}</div><div class="gd">${R.partial?L(`${fd(R.ref)} itibarıyla · `,`as of ${fd(R.ref)} · `):''}${L('Oluşturuldu','Generated')} ${gen}</div></div></div>
<div class="kpis">${kpis}</div>
<div class="g2">${daySec}${hlSec}</div>
${checkSec}
${polarSec}
${loadSec}
${painSec}
<div class="fo"><span>${L('Puanlar 1–5: 1 kötü · 5 iyi (check-in formunun renkleri). Δ: önceki döneme göre fark (yüklerde % değişim). Takım: sporcuların dönem ortalamalarının ortalaması. Polar gece verisi uyanılan sabahın tarihini taşır; "·": veri yok.','Scores 1–5: 1 poor · 5 good (check-in form colours). Δ: change vs the previous period (% for loads). Team: mean of the athletes\' period means. Polar night data carries the date of the morning woken up; "·": no data.')}</span><span style="white-space:nowrap">CoachOS · ${esc(R.name)}</span></div>
<script>(function(){var go=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},350);};
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go,go);else go();})();<\/script>
</body></html>`;
}

/* Düğmenin işi: pencere tıklamanın içinde açılır (pop-up engeline takılmasın), Polar verisi
   beklenirken "hazırlanıyor" yazar, sonra rapor yazılır. `anchor`: haftası / ayı basılacak gün. */
async function openAthleteWellnessReport({ath,team,kind,anchor,pnhr}){
  const w=window.open('','_blank','width=980,height=1200');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.','Pop-up blocked — allow pop-ups for this site.'));return;}
  try{w.document.open();w.document.write(`<!DOCTYPE html><meta charset="utf-8"><title>${L('Hazırlanıyor…','Preparing…')}</title><body style="font:14px system-ui,sans-serif;color:#3a4350;padding:32px">${L('Wellness raporu hazırlanıyor…','Preparing the wellness report…')}</body>`);w.document.close();}catch(e){}
  const d=parseD(anchor);let from,to,label;
  if(kind==='week'){from=fmt(sow(d));to=fmt(addD(sow(d),6));label=`${fd(from)} – ${fd(to)}`;}
  else{from=fmt(new Date(d.getFullYear(),d.getMonth(),1));to=fmt(new Date(d.getFullYear(),d.getMonth()+1,0));label=`${MN[d.getMonth()]} ${d.getFullYear()}`;}
  const pFrom=kind==='week'?fmt(addD(parseD(from),-7)):fmt(new Date(d.getFullYear(),d.getMonth()-1,1));
  const tk=fmt(today);
  let polar=null,polarNote='';
  const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
  if(!team||!team.id||!u||u.isAnonymous)polarNote=L('Polar verisi için koç hesabıyla oturum açılmalı.','Sign in with the coach account for Polar data.');
  else if(pFrom>tk)polarNote=L('Bu dönem henüz başlamadı.','This period has not started yet.');
  else{
    try{
      const j=await Promise.race([polarCall('/team-data',{teamId:team.id,athleteId:String(ath.id),from:pFrom,to:to>tk?tk:to}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error(L('Polar servisi zamanında yanıt vermedi.','The Polar service did not answer in time.'))),20000))]);
      polar=(j.athletes||[])[0]||null;
      if(!polar)polarNote=L('Sporcu Polar\'a bağlı değil.','The athlete is not connected to Polar.');
    }catch(e){polarNote=L('Polar verisi alınamadı: ','Polar data could not be loaded: ')+(e.message||String(e));}
  }
  const R=buildAthleteWellnessReport({ath,team,kind,from,to,label,polar,polarNote,pnhr});
  try{w.document.open();w.document.write(athleteWellnessReportHtml(R));w.document.close();}catch(e){}
}
