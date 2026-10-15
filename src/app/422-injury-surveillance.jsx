/* ---- SAKATLIK SÜRVEYANSI ----------------------------------------------------------
   Sporcu kayıtlarındaki sakatlıklar (ath.injuries) + takvimdeki maruziyetten türeyen
   BETİMLEYİCİ istatistik: kaç sakatlık, kaç saatlik antrenman/maçta, kaç gün kaybettirdi.

   Tanımlar (spor sakatlığı mutabakat bildirimlerindeki "time-loss" yaklaşımı):
     · Sayılan sakatlık = kadro dışı kalınan (sidelinedDate dolu) sakatlık. Kadro dışı
       tarihi boş kayıtlar "tıbbi müdahale" sayılır; insidansa girmez, ayrıca gösterilir.
     · Maruziyet = sporcunun kendi takviminde o pencerede yer alan seansların süresi
       (dakika); test seansları dışarıda, sakat olduğu (kadro dışı) günler düşülür.
       Antrenman ve maç ayrı toplanır.
     · İnsidans = sakatlık sayısı / maruziyet saati × 1000.
     · Yük (burden) = kaybedilen gün / maruziyet saati × 1000.
     · Şiddet sınıfı kaybedilen güne göre: 0-1 çok hafif, 2-3 minimal, 4-7 hafif,
       8-28 orta, >28 ağır.
     · Nüks = aynı bölgede, önceki kaydın dönüşünden sonraki 12 ay içinde yeni sakatlık.

   Sistem sakatlık RİSKİ tahmin etmez (bkz. 590 "Injury & RTP": raporlanır, yorumlanmaz).
   Sakatlık öncesi yük de yalnızca yan yana gösterilir; nedensellik iddia edilmez. */
const ISX_SEV=[
  {id:'slight',max:1,tr:'Çok hafif (0-1 g)',en:'Slight (0-1 d)',c:'#94a3b8'},
  {id:'minimal',max:3,tr:'Minimal (2-3 g)',en:'Minimal (2-3 d)',c:'#38bdf8'},
  {id:'mild',max:7,tr:'Hafif (4-7 g)',en:'Mild (4-7 d)',c:'#22c55e'},
  {id:'moderate',max:28,tr:'Orta (8-28 g)',en:'Moderate (8-28 d)',c:'#f97316'},
  {id:'severe',max:Infinity,tr:'Ağır (>28 g)',en:'Severe (>28 d)',c:'#ef4444'},
];
const isxSeverity=days=>days==null?null:ISX_SEV.find(s=>days<=s.max);
const isxLoc=i=>String((i&&(i.location||i.area))||'').trim().toLowerCase();
const isxIsMatch=i=>i&&i.context==='Match';
/* Bir kaydın kadro dışı günü: sidelinedDate'ten dönüşe (yoksa pencere sonu / bugün) kadar. */
function isxEnd(inj,cap){const e=inj.actualReturn||cap;return e>cap?cap:e;}
/* Pencere [from,to] ile kesişen kayıp gün sayısı. */
function isxDaysLost(inj,from,to){
  if(!inj||!inj.sidelinedDate)return 0;
  const s=inj.sidelinedDate>from?inj.sidelinedDate:from;
  const e=isxEnd(inj,to);
  return e<s?0:Math.max(0,diffD(s,e));
}
/* Sporcunun pencerede kadro dışı olduğu günlerin kümesi (maruziyetten düşmek için). */
function isxOutDays(ath,from,to){
  const out=new Set();
  (ath.injuries||[]).forEach(inj=>{
    if(!inj.sidelinedDate)return;
    const s=inj.sidelinedDate>from?inj.sidelinedDate:from;
    const e=isxEnd(inj,to);
    if(e<s)return;
    let c=parseD(s);const end=parseD(e);
    while(c<=end){out.add(fmt(c));c=addD(c,1);}
  });
  return out;
}
/* Maruziyet (dakika): antrenman / maç. */
function isxExposure(ath,from,to){
  const out=isxOutDays(ath,from,to);
  const r={train:0,match:0};
  Object.entries(ath.days||{}).forEach(([k,d])=>{
    if(k<from||k>to||out.has(k))return;
    ((d&&d.sessions)||[]).forEach(s=>{
      const kind=sesKind(s);
      if(kind==='test')return;
      const m=Number(s.duration)||0;
      if(m<=0)return;
      if(kind==='match')r.match+=m;else r.train+=m;
    });
  });
  return r;
}
/* Nüks: aynı bölge, bir önceki kaydın dönüşünden sonraki 12 ay içinde. */
function isxRecurrent(inj,all){
  const loc=isxLoc(inj);if(!loc||!inj.date)return false;
  return all.some(o=>o!==inj&&isxLoc(o)===loc&&o.actualReturn&&o.actualReturn<=inj.date&&diffD(o.actualReturn,inj.date)<=365);
}
/* Sakatlıktan önceki yük: önceki 4 haftanın haftalık AU'su + önceki gün ACWR + 7 günlük monotoni. */
function isxPreLoad(ath,inj){
  const d=inj.date||inj.sidelinedDate;if(!d)return null;
  const ref=fmt(addD(parseD(d),-1));
  const weeks=[0,1,2,3].map(w=>{
    const to=fmt(addD(parseD(ref),-7*w)),from=fmt(addD(parseD(to),-6));
    return athLoadSum(ath,from,to);
  }).reverse();
  if(!weeks.some(v=>v>0))return null;
  const acwr=athACWR(ath,ref);
  const mono=weekMono(athTrend(ath,ref,7).map(v=>({load:v}))).monotony;
  return{weeks,acwr:acwr||null,mono:mono||null};
}
/* Çekirdek: kadro + pencere → satırlar ve toplamlar. Saf işlev (test edilir). */
function isxAnalyse(athletes,from,to){
  const inWin=i=>{const d=i.date||i.sidelinedDate;return d&&d>=from&&d<=to;};
  const rows=[];let tTrain=0,tMatch=0;
  const byLoc={},bySev={},byTissue={},byCtx={train:0,match:0};
  let nTL=0,nMed=0,lost=0,nRec=0;
  const events=[];
  (athletes||[]).forEach(a=>{
    const ex=isxExposure(a,from,to);
    const all=a.injuries||[];
    const mine=all.filter(inWin);
    const tl=mine.filter(i=>i.sidelinedDate);
    const dl=tl.reduce((s,i)=>s+isxDaysLost(i,from,to),0);
    tTrain+=ex.train;tMatch+=ex.match;
    nTL+=tl.length;nMed+=mine.length-tl.length;lost+=dl;
    tl.forEach(i=>{
      const days=isxDaysLost(i,from,to);
      const sev=isxSeverity(days);
      const loc=isxLoc(i)||'—';
      byLoc[loc]=(byLoc[loc]||0)+1;
      if(sev)bySev[sev.id]=(bySev[sev.id]||0)+1;
      const ts=i.tissueType||'—';byTissue[ts]=(byTissue[ts]||0)+1;
      if(isxIsMatch(i))byCtx.match++;else byCtx.train++;
      const rec=isxRecurrent(i,all);if(rec)nRec++;
      events.push({ath:a,inj:i,days,sev,recurrent:rec,pre:isxPreLoad(a,i)});
    });
    rows.push({ath:a,n:tl.length,med:mine.length-tl.length,days:dl,trainH:ex.train/60,matchH:ex.match/60});
  });
  const hTrain=tTrain/60,hMatch=tMatch/60,hAll=hTrain+hMatch;
  const per=(n,h)=>h>0?+(n/h*1000).toFixed(1):null;
  const nMatch=byCtx.match,nTrain=byCtx.train;
  return{
    from,to,rows,events:events.sort((x,y)=>(y.inj.date||'').localeCompare(x.inj.date||'')),
    nTL,nMed,lost,nRec,hTrain,hMatch,hAll,
    incAll:per(nTL,hAll),incTrain:per(nTrain,hTrain),incMatch:per(nMatch,hMatch),
    burden:per(lost,hAll),
    byLoc,bySev,byTissue,byCtx,
    avgDays:nTL?+(lost/nTL).toFixed(1):null,
  };
}
const isxTop=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);

function isxRange(key,setup){
  const to=fmt(today);
  if(key==='d90')return{from:fmt(addD(today,-90)),to};
  if(key==='d365')return{from:fmt(addD(today,-365)),to};
  if(key==='season'){const w=macroWindow(setup);if(w)return{from:w.from,to:w.to<to?w.to:to};}
  return{from:'2000-01-01',to};
}
function isxCsv(res){
  const esc=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const head=['Sporcu','Tarih','Bağlam','Bölge','Taraf','Doku','Tip','Mekanizma','Derece','Kadro dışı','Dönüş','Kaybedilen gün','Şiddet','Nüks','Yük H-4','H-3','H-2','H-1','ACWR','Monotoni'];
  const rows=res.events.map(e=>{const i=e.inj,p=e.pre||{};const w=p.weeks||[];
    return[e.ath.name,i.date,i.context||'',i.location||'',i.side||'',i.tissueType||'',i.type||'',i.mechanism||'',i.grade||'',i.sidelinedDate||'',i.actualReturn||'',e.days,e.sev?e.sev.en:'',e.recurrent?'1':'0',w[0]??'',w[1]??'',w[2]??'',w[3]??'',p.acwr?p.acwr.toFixed(2):'',p.mono?p.mono.toFixed(2):''];});
  const blob=new Blob(['﻿'+[head,...rows].map(r=>r.map(esc).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sakatlik_surveyansi_${fmt(today)}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/* Takım görünümü: Yük Takibi'nin altında. `athletes` verilirse yalnızca onlar (tek sporcu). */
function InjurySurveillance({athletes,setup,title,compact}){
  const[range,setRange]=useState('season');
  const[open,setOpen]=useState(null);
  const{from,to}=useMemo(()=>isxRange(range,setup),[range,setup]);
  const res=useMemo(()=>isxAnalyse(athletes,from,to),[athletes,from,to]);
  const small=res.nTL<5;
  const f1=v=>v==null?'—':v;
  const stat=(k,v,u,hint)=><div className="ath-stat" title={hint||''}><div className="k">{k}</div><div className="v">{v}{u&&<span className="u">{u}</span>}</div></div>;
  const maxLoc=isxTop(res.byLoc,6);
  return(<div className="panel isx">
    <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
      <h2 style={{margin:0}}>{title||L('Sakatlık Sürveyansı','Injury Surveillance')}</h2>
      <div className="row" style={{gap:6}}>
        <select value={range} onChange={e=>setRange(e.target.value)} aria-label={L('Dönem','Period')}>
          <option value="season">{L('Sezon','Season')}</option>
          <option value="d90">{L('Son 90 gün','Last 90 days')}</option>
          <option value="d365">{L('Son 365 gün','Last 365 days')}</option>
          <option value="all">{L('Tüm kayıt','All records')}</option>
        </select>
        <button className="btn sec sm" disabled={!res.events.length} onClick={()=>isxCsv(res)}>CSV</button>
      </div>
    </div>
    <div className="ath-stat-row isx-stats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}>
      {stat(L('Sakatlık (kadro dışı)','Time-loss injuries'),res.nTL,'',L('Kadro dışı tarihi dolu kayıtlar','Records with a sidelined date'))}
      {stat(L('İnsidans / 1000 sa','Incidence / 1000 h'),f1(res.incAll),'',L('Sakatlık sayısı ÷ maruziyet saati × 1000','Injuries ÷ exposure hours × 1000'))}
      {stat(L('Antrenman','Training'),f1(res.incTrain),L('/1000 sa','/1000 h'))}
      {stat(L('Maç','Match'),f1(res.incMatch),L('/1000 sa','/1000 h'))}
      {stat(L('Yük (burden)','Burden'),f1(res.burden),L('gün/1000 sa','d/1000 h'),L('Kaybedilen gün ÷ maruziyet saati × 1000','Days lost ÷ exposure hours × 1000'))}
      {stat(L('Kaybedilen gün','Days lost'),res.lost,'')}
      {stat(L('Ort. gün / sakatlık','Mean days / injury'),f1(res.avgDays),'')}
      {stat(L('Nüks','Recurrent'),res.nRec,'')}
    </div>
    <div className="help" style={{marginTop:8}}>
      {L(`Maruziyet: ${res.hTrain.toFixed(0)} sa antrenman + ${res.hMatch.toFixed(0)} sa maç (takvimdeki seans süreleri; test seansları ve sporcunun kadro dışı olduğu günler hariç).`,`Exposure: ${res.hTrain.toFixed(0)} h training + ${res.hMatch.toFixed(0)} h match (calendar session durations; test sessions and days the athlete was sidelined excluded).`)}
      {res.nMed>0&&L(` ${res.nMed} kayıt kadro dışı tarihi olmadığı için "tıbbi müdahale" sayıldı ve insidansa girmedi.`,` ${res.nMed} record(s) without a sidelined date were treated as medical-attention and left out of incidence.`)}
    </div>
    {res.hAll===0&&<div className="help" style={{color:'var(--warn,#f97316)'}}>{L('Bu dönemde takvimde süreli seans yok: insidans hesaplanamaz. Seanslara süre (dk) gir.','No timed sessions on the calendar in this period, so incidence cannot be computed. Give sessions a duration (min).')}</div>}
    {small&&res.nTL>0&&<div className="help" style={{color:'var(--warn,#f97316)'}}>{L(`n=${res.nTL}: örneklem küçük, oranlar kabadır — tek bir sakatlık değeri belirgin değiştirir. Eğilim olarak oku, sonuç çıkarma.`,`n=${res.nTL}: small sample, the rates are coarse and one injury moves them a lot. Read as a trend, not a conclusion.`)}</div>}
    {res.nTL===0&&<div className="empty-st">{L('Bu dönemde kadro dışı kalınan sakatlık yok.','No time-loss injuries in this period.')}</div>}
    {res.nTL>0&&<>
      <div className="isx-cols">
        <div><h3 className="isx-h">{L('Şiddet','Severity')}</h3>
          {ISX_SEV.map(s=>{const n=res.bySev[s.id]||0;return<div key={s.id} className="isx-bar"><span>{L(s.tr,s.en)}</span><i style={{width:`${n/res.nTL*100}%`,background:s.c}}/><b>{n}</b></div>;})}</div>
        <div><h3 className="isx-h">{L('Bölge','Location')}</h3>
          {maxLoc.map(([k,n])=><div key={k} className="isx-bar"><span>{k}</span><i style={{width:`${n/res.nTL*100}%`}}/><b>{n}</b></div>)}</div>
        <div><h3 className="isx-h">{L('Bağlam','Context')}</h3>
          <div className="isx-bar"><span>{L('Antrenman','Training')}</span><i style={{width:`${res.byCtx.train/res.nTL*100}%`}}/><b>{res.byCtx.train}</b></div>
          <div className="isx-bar"><span>{L('Maç','Match')}</span><i style={{width:`${res.byCtx.match/res.nTL*100}%`}}/><b>{res.byCtx.match}</b></div>
          <h3 className="isx-h" style={{marginTop:10}}>{L('Doku','Tissue')}</h3>
          {isxTop(res.byTissue,4).map(([k,n])=><div key={k} className="isx-bar"><span>{k}</span><i style={{width:`${n/res.nTL*100}%`}}/><b>{n}</b></div>)}</div>
      </div>
      {!compact&&<div style={{overflowX:'auto',marginTop:12}}>
        <table className="isx-tbl"><thead><tr>
          <th>{L('Sporcu','Athlete')}</th><th>{L('Tarih','Date')}</th><th>{L('Bölge','Location')}</th><th>{L('Bağlam','Context')}</th><th>{L('Gün','Days')}</th><th>{L('Şiddet','Severity')}</th><th>{L('Nüks','Rec.')}</th><th>{L('Önceki 4 hafta yük (AU)','Prior 4 wk load (AU)')}</th>
        </tr></thead><tbody>
          {res.events.map((e,idx)=>{const k=e.ath.id+':'+(e.inj.id||idx);const p=e.pre;
            return<React.Fragment key={k}>
              <tr className="isx-r" onClick={()=>setOpen(open===k?null:k)}>
                <td>{e.ath.name}</td><td>{fd(e.inj.date)}</td>
                <td>{[e.inj.side&&e.inj.side!=='N/A'?e.inj.side:'',e.inj.location||''].filter(Boolean).join(' ')||'—'}</td>
                <td>{isxIsMatch(e.inj)?L('Maç','Match'):L('Antr.','Trn.')}</td>
                <td>{e.days}</td>
                <td>{e.sev&&<span className="isx-dot" style={{background:e.sev.c}}/>}{e.sev?L(e.sev.tr.split(' (')[0],e.sev.en.split(' (')[0]):'—'}</td>
                <td>{e.recurrent?'●':''}</td>
                <td>{p?p.weeks.join(' · '):'—'}</td>
              </tr>
              {open===k&&<tr className="isx-d"><td colSpan={8}>
                <div className="help">
                  {p?L(`Sakatlıktan önceki gün ACWR ${p.acwr?p.acwr.toFixed(2):'—'}, 7 günlük monotoni ${p.mono?p.mono.toFixed(2):'—'}. Haftalık yük (en eski → en yeni): ${p.weeks.join(' → ')} AU.`,`ACWR the day before: ${p.acwr?p.acwr.toFixed(2):'—'}, 7-day monotony ${p.mono?p.mono.toFixed(2):'—'}. Weekly load (oldest → newest): ${p.weeks.join(' → ')} AU.`):L('Sakatlık öncesi yük kaydı yok.','No load record before this injury.')}
                  {e.inj.mechanism&&<> {L('Mekanizma','Mechanism')}: {e.inj.mechanism}.</>}
                  {' '}{L('Bu bilgi betimleyicidir; yük ile sakatlık arasında neden-sonuç iddia edilmez.','This is descriptive; no cause-and-effect between load and injury is implied.')}
                </div>
              </td></tr>}
            </React.Fragment>;})}
        </tbody></table>
      </div>}
    </>}
  </div>);
}
