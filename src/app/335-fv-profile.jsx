/* ---- KUVVET-HIZ (F-V) PROFİLİ ----------------------------------------------------------
   İki ayrı profil, ikisi de saha testinden:

   1) DİKEY (Samozino ve ark. 2008, 2010, 2012): vücut ağırlığı + en az bir YÜKLÜ squat jump
      (BW sıçraması + ek yükle sıçrama) + itiş mesafesi `hpo` (çömelme pozisyonunda ayak
      bileği-kalça-diz uzamasıyla cm cinsinden gövde yükselmesi).
        ortalama kuvvet  F = (m + yük)·g·(h/hpo + 1)
        ortalama hız     V = √(g·h/2)
      Yük arttıkça F-V noktaları doğrusal gider: F = F0 − |S|·V ; V0 = F0/|S| ; Pmax = F0·V0/4.
      Optimum profil: aynı Pmax, boy/kilo ve hpo ile sıçrama yüksekliğini en çok veren eğim
      (S_opt). Sporcunun eğimi S_opt'tan dik ise (kuvvet baskın) hız tarafı, yatay ise
      (hız baskın) kuvvet tarafı eksiktir. Tek yükte (yalnız BW) profil ÇIKMAZ: en az iki farklı
      yük gerekir; yük aralığı dar ise sonuç eksik tahmin edilir (uyarı verilir).

   2) SPRİNT (Samozino ve ark. 2016, yatay): kapı/ara zamanlarından v(t)=Vmax·(1−e^(−t/τ))
      modeli uydurulur. F0 = m·Vmax/τ (yatay net kuvvet), V0 = Vmax, Pmax = F0·V0/4.
      HAVA DİRENCİ dahil değil (yalnız 'net yatay' sürüm); kısa mesafede etkisi küçüktür ama
      sıfır değildir. En az iki ara zaman (örn. 10 ve 20 m) gerekir; üç-dört daha sağlamdır.

   Bunlar TAHMİNdir ve ölçüm kalitesine (hpo ölçümü, elle zamanlama, başlangıç tekniği)
   bağlıdır; ekranda hep böyle söylenir. Karar verici değil, antrenman önceliği için bir
   okumadır. */
const FV_G=9.81;
const fvN=v=>{if(v===''||v==null)return null;const n=Number(String(v).replace(',','.'));return isFinite(n)?n:null;};

/* En küçük kareler doğrusu y=a+bx ve R². */
function fvLine(xs,ys){
  const n=xs.length;if(n<2)return null;
  const mx=xs.reduce((s,v)=>s+v,0)/n,my=ys.reduce((s,v)=>s+v,0)/n;
  let sxx=0,sxy=0,syy=0;
  for(let i=0;i<n;i++){sxx+=(xs[i]-mx)**2;sxy+=(xs[i]-mx)*(ys[i]-my);syy+=(ys[i]-my)**2;}
  if(sxx<=1e-12)return null;
  const b=sxy/sxx,a=my-b*mx;
  return{a,b,r2:syy<=1e-12?1:(sxy*sxy)/(sxx*syy)};
}
/* Verilen |S| (N·s/m) ve Pmax (W) için kütle m ve itiş mesafesi hpo'da (ortalama-değer modeli)
   sıçrama yüksekliği (m). F0=2√(P|S|); sabit ivme: vto² = 2·hpo·((F0−|S|·vto/2)/m − g). */
function fvJumpHeight(absS,P,m,hpo){
  const F0=2*Math.sqrt(P*absS);
  const net=F0/m-FV_G;
  if(net<=0)return 0;
  const b=hpo*absS/m,c=8*hpo*net;
  const vto=(-b+Math.sqrt(b*b+c))/2;
  return vto>0?vto*vto/(2*FV_G):0;
}
/* Optimum eğim: log uzayında altın bölüme ile h(|S|)'yi en büyükleyen |S|. */
function fvOptSlope(P,m,hpo){
  let lo=Math.log(0.2*m),hi=Math.log(200*m);
  const gr=(Math.sqrt(5)-1)/2;
  const f=x=>fvJumpHeight(Math.exp(x),P,m,hpo);
  let c=hi-gr*(hi-lo),d=lo+gr*(hi-lo),fc=f(c),fd=f(d);
  for(let i=0;i<80;i++){
    if(fc>fd){hi=d;d=c;fd=fc;c=hi-gr*(hi-lo);fc=f(c);}
    else{lo=c;c=d;fc=fd;d=lo+gr*(hi-lo);fd=f(d);}
  }
  const x=(lo+hi)/2;
  return{absS:Math.exp(x),h:f(x)};
}
/* DİKEY. mass kg; hpo cm; points [{load kg, h cm}] (BW noktası load=0). */
function fvVertical(mass,hpoCm,points){
  const m=fvN(mass),hpo=fvN(hpoCm)!=null?fvN(hpoCm)/100:null;
  if(!(m>0))return{ok:false,why:'mass'};
  if(!(hpo>0.1&&hpo<1))return{ok:false,why:'hpo'};
  const pts=(points||[]).map(p=>({load:fvN(p.load),h:fvN(p.h)})).filter(p=>p.load!=null&&p.load>=0&&p.h!=null&&p.h>0);
  const byLoad=[];pts.forEach(p=>{if(!byLoad.some(q=>q.load===p.load))byLoad.push(p);});
  if(byLoad.length<2)return{ok:false,why:'points',n:byLoad.length};
  const rows=byLoad.map(p=>{const hm=p.h/100,mt=m+p.load;
    return{load:p.load,h:p.h,F:mt*FV_G*(hm/hpo+1),V:Math.sqrt(FV_G*hm/2)};}).sort((a,b)=>a.load-b.load);
  const ln=fvLine(rows.map(r=>r.V),rows.map(r=>r.F));
  if(!ln)return{ok:false,why:'flat'};
  if(!(ln.b<0)||!(ln.a>0))return{ok:false,why:'slope',slope:ln.b};
  const F0=ln.a,absS=-ln.b,V0=F0/absS,Pmax=F0*V0/4;
  const opt=fvOptSlope(Pmax,m,hpo);
  const hAct=fvJumpHeight(absS,Pmax,m,hpo);
  const imb=+(100*(absS/opt.absS-1)).toFixed(1);                 // + = kuvvet baskın (eğim dik)
  const warn=[];
  const span=rows[rows.length-1].load-rows[0].load;
  if(span<20)warn.push('span');
  if(rows.length>=3&&ln.r2<0.9)warn.push('r2');
  if(hpo<0.2||hpo>0.6)warn.push('hpoRange');
  const orientation=Math.abs(imb)<10?'balanced':(imb>0?'force':'velocity');
  return{ok:true,rows,F0,V0,Pmax,S:-absS,r2:ln.r2,n:rows.length,
    F0rel:F0/m,Pmaxrel:Pmax/m,SOpt:-opt.absS,imbalance:imb,orientation,
    gain:hAct>0?+(100*(opt.h/hAct-1)).toFixed(1):null,warn};
}
/* SPRİNT. mass kg; splits [{d m, t s}] (0 m, 0 s dışındaki ara zamanlar). */
function fvSprint(mass,splits){
  const m=fvN(mass);
  if(!(m>0))return{ok:false,why:'mass'};
  const pts=(splits||[]).map(s=>({d:fvN(s.d),t:fvN(s.t)})).filter(s=>s.d>0&&s.t>0).sort((a,b)=>a.d-b.d);
  for(let i=1;i<pts.length;i++)if(pts[i].t<=pts[i-1].t)return{ok:false,why:'order'};
  if(pts.length<2)return{ok:false,why:'points',n:pts.length};
  const fit=tau=>{
    const g=pts.map(p=>p.t+tau*(Math.exp(-p.t/tau)-1));
    const num=pts.reduce((s,p,i)=>s+p.d*g[i],0),den=g.reduce((s,v)=>s+v*v,0);
    const vmax=num/den;
    const sse=pts.reduce((s,p,i)=>s+(p.d-vmax*g[i])**2,0);
    return{vmax,sse};
  };
  let best={tau:0.3,sse:Infinity};
  for(let tau=0.2;tau<=3.5;tau+=0.01){const r=fit(tau);if(r.sse<best.sse)best={tau,sse:r.sse,vmax:r.vmax};}
  for(let tau=Math.max(0.05,best.tau-0.01);tau<=best.tau+0.01;tau+=0.0005){const r=fit(tau);if(r.sse<best.sse)best={tau,sse:r.sse,vmax:r.vmax};}
  const{tau,vmax}=best;
  if(!(vmax>0)||vmax>14||tau>=3.4)return{ok:false,why:'fit'};
  const a0=vmax/tau,F0=m*a0,Pmax=F0*vmax/4;
  return{ok:true,tau:+tau.toFixed(3),Vmax:+vmax.toFixed(2),V0:+vmax.toFixed(2),a0:+a0.toFixed(2),F0:Math.round(F0),F0rel:+a0.toFixed(2),
    Pmax:Math.round(Pmax),Pmaxrel:+(Pmax/m).toFixed(1),rmse:+Math.sqrt(best.sse/pts.length).toFixed(3),n:pts.length};
}
/* Testin sprint noktaları: 20 m süresi (mevcut alan) + isteğe bağlı 5/10/30 m ara zamanları. */
function fvSprintPoints(test){
  const sp=test.sprintSplits||{};
  return[{d:5,t:sp.t5},{d:10,t:sp.t10},{d:20,t:test.sprint20m&&test.sprint20m.time},{d:30,t:sp.t30}];
}
/* Dikey noktalar: BW = squatJump kutusu, ardından yüklü satırlar. */
function fvVerticalPoints(test){
  const pts=[];
  if(fvN(test.squatJump)>0)pts.push({load:0,h:test.squatJump});
  (test.sjLoaded||[]).forEach(r=>pts.push({load:r.load,h:r.h}));
  return pts;
}
/* Vücut ağırlığı: testin kendisinde yoksa sporcunun en son kaydından. */
function fvBodyMass(test,ath){
  const w=fvN(test&&test.weight);if(w>0)return w;
  const recs=ath?phvRecords(ath).filter(r=>r.weight!=null):[];
  return recs.length?recs[recs.length-1].weight:null;
}
/* Sonuç → "kuvvet mi hız mı" cümlesi. */
function fvVerdictText(v){
  if(!v||!v.ok)return null;
  if(v.orientation==='balanced')return L(`Profil optimuma yakın (sapma %${v.imbalance>0?'+':''}${v.imbalance}): belirgin bir kuvvet ya da hız açığı yok; güç (Pmax) artırmak birincil hedef.`,`Profile is close to optimal (deviation ${v.imbalance>0?'+':''}${v.imbalance}%): no clear force or velocity deficit; raising Pmax is the main goal.`);
  return v.orientation==='force'
    ?L(`Kuvvet baskın (eğim optimumdan %${v.imbalance} dik): HIZ tarafı eksik. Öncelik: hafif-orta yükte patlayıcı/balistik iş, sprint, pliometri. Modele göre optimum profilde sıçrama ≈ %${v.gain} daha yüksek olurdu.`,`Force-dominant (slope ${v.imbalance}% steeper than optimal): the VELOCITY side is lacking. Priority: ballistic/explosive work at light-moderate loads, sprinting, plyometrics. The model puts jump height ≈ ${v.gain}% higher at the optimal profile.`)
    :L(`Hız baskın (eğim optimumdan %${Math.abs(v.imbalance)} yatay): KUVVET tarafı eksik. Öncelik: maksimal ve hızlı kuvvet (ağır squat/deadlift, kontrast). Modele göre optimum profilde sıçrama ≈ %${v.gain} daha yüksek olurdu.`,`Velocity-dominant (slope ${Math.abs(v.imbalance)}% flatter than optimal): the FORCE side is lacking. Priority: maximal and fast strength (heavy squat/deadlift, contrast work). The model puts jump height ≈ ${v.gain}% higher at the optimal profile.`);
}
const fvWarnText=(w)=>({
  span:L('Yük aralığı dar (<20 kg): F0 ve V0 uzaklaştırılarak tahmin ediliyor, güvenilirliği düşük. Daha ağır bir yükle de sıçrat.','Load range is narrow (<20 kg): F0 and V0 are extrapolated and less reliable. Add a heavier load.'),
  r2:L('Noktalar doğrusal değil (R²<0.90): ölçüm hatası ya da yorgunluk olabilir, tekrar ölç.','The points are not linear (R²<0.90): measurement error or fatigue; re-test.'),
  hpoRange:L('İtiş mesafesi alışılmış aralığın (20-60 cm) dışında: ölçümü kontrol et.','Push-off distance is outside the usual 20-60 cm range: check the measurement.'),
}[w]);
const fvWhyText=(why)=>({
  mass:L('Vücut ağırlığı yok — Antropometri testine ya da Ölçüm kayıtlarına kilo gir.','No body mass — enter weight in the Anthropometry test or Measurements.'),
  hpo:L('İtiş mesafesi (hpo) gir (cm; çömelme pozisyonunda ayak bileği-kalça-diz tam uzadığında gövdenin yükselmesi).','Enter push-off distance (hpo, cm: how far the body rises from the squat start position to full extension).'),
  points:L('En az iki farklı yükle sıçrama gerekli (BW + bir ek yük).','At least two different loads are needed (bodyweight + one added load).'),
  flat:L('Yükler farklı sonuç vermedi: noktalar aynı hızda.','The loads did not change velocity.'),
  slope:L('Yük arttıkça hız düşmedi (eğim fizyolojik değil): veriyi kontrol et.','Velocity did not fall as load rose (non-physiological slope): check the data.'),
  order:L('Ara zamanlar mesafe arttıkça artmalı.','Split times must increase with distance.'),
  fit:L('Model bu zamanlara uymuyor: zamanları kontrol et.','The model does not fit these times: check the splits.'),
}[why]||'');

/* ---- Dikey profilin sonucu (Atletik Profil özeti). Squat Jump kartındaki yüklü sıçrama girişi
   kaldırıldı; daha önce girilmiş `sjLoaded` / `sjHpo` verisi olan kayıtlar burada okunmaya devam eder. ---- */
function FvVerticalResult({res}){
  if(!res.ok){
    /* Henüz veri girilmemişken uyarı gösterme; sadece neden eksik olduğunu sakin söyle. */
    return<div className="help" style={{marginTop:8}}>{fvWhyText(res.why)}</div>;
  }
  const cell=(k,v,u)=><div className="ath-stat"><div className="k">{k}</div><div className="v">{v}<span className="u">{u}</span></div></div>;
  return(<div className="fv-res">
    <div className="ath-stat-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))'}}>
      {cell('F0',res.F0rel.toFixed(1),'N/kg')}
      {cell('V0',res.V0.toFixed(2),'m/s')}
      {cell('Pmax',res.Pmaxrel.toFixed(1),'W/kg')}
      {cell(L('Eğim','Slope'),(res.S/1).toFixed(0),'N·s/m')}
      {cell(L('Optimuma sapma','vs optimal'),(res.imbalance>0?'+':'')+res.imbalance,'%')}
    </div>
    <div className={`fv-verdict fv-or-${res.orientation}`}>{fvVerdictText(res)}</div>
    {res.warn.map(w=><div key={w} className="help" style={{color:'var(--warn,#f97316)'}}>⚠ {fvWarnText(w)}</div>)}
    <div className="help">{L(`${res.n} nokta · R² ${res.r2.toFixed(2)}. Samozino yöntemi, tahmindir; ölçüm kalitesine bağlıdır.`,`${res.n} points · R² ${res.r2.toFixed(2)}. Samozino method; an estimate that depends on measurement quality.`)}</div>
  </div>);
}
/* ---- Sprint kartı içi: ara zamanlar + sonuç ---- */
function FvSprintInput({test,onUpdate,ath}){
  const sp=test.sprintSplits||{};
  const mass=fvBodyMass(test,ath);
  const res=useMemo(()=>fvSprint(mass,fvSprintPoints(test)),[mass,test.sprint20m,test.sprintSplits]);
  const set=(k,v)=>onUpdate(t=>({sprintSplits:{...(t.sprintSplits||{}),[k]:v}}));
  const cell=(k,v,u)=><div className="ath-stat"><div className="k">{k}</div><div className="v">{v}<span className="u">{u}</span></div></div>;
  return(<div className="fv-box">
    <div className="fv-h">{L('Sprint F-V profili (ara zamanlar)','Sprint F-V profile (split times)')}</div>
    <div className="help" style={{marginBottom:8}}>{L('20 m süresi yukarıdaki kutudan gelir. En az bir ara zaman daha gir (kapı/foto-hücre ile; elle zamanlama güvenilir değildir).','The 20 m time comes from the box above. Add at least one more split (timing gates / photocells; hand timing is unreliable).')}</div>
    <div className="row" style={{gap:10,flexWrap:'wrap'}}>
      {[['t5','5 m'],['t10','10 m'],['t30','30 m']].map(([k,l])=><div key={k} className="mk-field" style={{margin:0}}>
        <div className="mk-flbl">{l}</div><MkInput value={sp[k]} onChange={v=>set(k,v)} unit="s" step="0.01"/></div>)}
    </div>
    {res.ok?<div className="fv-res">
      <div className="ath-stat-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))'}}>
        {cell('F0',res.F0rel.toFixed(2),'N/kg')}
        {cell('V0 (Vmax)',res.V0.toFixed(2),'m/s')}
        {cell('Pmax',res.Pmaxrel.toFixed(1),'W/kg')}
        {cell('τ',res.tau.toFixed(2),'s')}
      </div>
      <div className="help">{L(`${res.n} nokta · model hatası ${res.rmse} m. Yatay net kuvvet, hava direnci dahil değil. F0 ivmelenme (kuvvet) tarafını, V0 maksimum hız tarafını gösterir.`,`${res.n} points · model error ${res.rmse} m. Net horizontal force, air drag not included. F0 reflects the acceleration (force) side, V0 the top-speed side.`)}</div>
    </div>:<div className="help" style={{marginTop:8}}>{fvWhyText(res.why)}</div>}
  </div>);
}

/* ---- Sporcu Profili → Atletik Profil sekmesi: son F-V sonucu ---- */
function FvSummaryCard({ath}){
  const tests=(ath.tests||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const vt=tests.find(t=>fvVertical(fvBodyMass(t,ath),t.sjHpo,fvVerticalPoints(t)).ok);
  const st=tests.find(t=>fvSprint(fvBodyMass(t,ath),fvSprintPoints(t)).ok);
  if(!vt&&!st)return null;
  const v=vt?fvVertical(fvBodyMass(vt,ath),vt.sjHpo,fvVerticalPoints(vt)):null;
  const s=st?fvSprint(fvBodyMass(st,ath),fvSprintPoints(st)):null;
  return(<div className="panel fv-card">
    <h2 style={{marginTop:0}}>{L('Kuvvet-Hız Profili','Force-Velocity Profile')}</h2>
    {v&&<div style={{marginBottom:s?14:0}}>
      <div className="help" style={{marginBottom:6}}>{L('Dikey (yüklü sıçrama)','Vertical (loaded jump)')} · {fd(vt.date)}</div>
      <FvVerticalResult res={v}/>
    </div>}
    {s&&<div>
      <div className="help" style={{marginBottom:6}}>{L('Sprint','Sprint')} · {fd(st.date)}</div>
      <div className="ath-stat-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))'}}>
        <div className="ath-stat"><div className="k">F0</div><div className="v">{s.F0rel.toFixed(2)}<span className="u">N/kg</span></div></div>
        <div className="ath-stat"><div className="k">V0</div><div className="v">{s.V0.toFixed(2)}<span className="u">m/s</span></div></div>
        <div className="ath-stat"><div className="k">Pmax</div><div className="v">{s.Pmaxrel.toFixed(1)}<span className="u">W/kg</span></div></div>
        <div className="ath-stat"><div className="k">τ</div><div className="v">{s.tau.toFixed(2)}<span className="u">s</span></div></div>
      </div>
    </div>}
  </div>);
}
