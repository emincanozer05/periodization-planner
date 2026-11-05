/* ═══════════════════════════════════════════════════════════════════════════
   SPORCU İZLEME — HESAP MOTORU (CoachOS revizyon talimatı v1.4)

   Sporcu Sağlığı, Yük ve Toparlanma İzleme. Sistem sakatlık olasılığı tahmin ETMEZ ve
   teşhis koymaz: sporcunun her göstergesini kendi geçmişiyle karşılaştırır, değeri,
   kişisel referansı, yöntem etiketini ve üç ayrı durumu (doluluk · hesaplanabilirlik ·
   ölçüm güvenilirliği) birlikte taşır. Bileşik bir puan, ortak bir renk ya da "risk"
   sınıfı hiçbir yerde üretilmez.

   Saf işlevler: React yok, ekrana yazmaz, ham kayda dokunmaz. Her işlev yapılandırmayı
   (`cfg`, bkz. 423 MON_CFG) parametre olarak alır; kodda gömülü eşik yoktur (yalnızca
   birim sabitleri: 24 sa, 60 dk, 100 %, 3600 sn, 365,25 gün, 864e5 ms — monitor-test.js
   bunu statik olarak tarar). Hesaplanan her değer türetilmiştir; ham veriden her an
   yeniden üretilir.

   Gün durumu (§3A.1), her veri akışı için:
     kayitli          değer girilmiş ve Sınıf G kurallarından geçiyor
     dogrulanmis_yok  kayıtsızlık doğrulanmış — yalnızca yük için: o geçmiş günde sporcunun
                      takviminde hiç seans yok ve sRPE kaydı da yok (kullanıcı onayıyla
                      doğrulama kaynağı takvim). Yük 0 AU ile bilinen gün olarak girer.
     gecersiz         kayıt var ama Sınıf G tarafından hariç tutulmuş (doğrulama bekliyor);
                      hesaplarda "bilinmiyor" gibi işlenir, sıfır DEĞİL
     bilinmiyor       kayıt yok ve doğrulama yok
   ═══════════════════════════════════════════════════════════════════════════ */

/* ---- Gün numarası: DST'den bağımsız tam sayı gün (UTC) ---- */
const MON_KEY_RE=/^\d{4}-\d{2}-\d{2}$/;
const monDN=k=>{const p=String(k).split('-').map(Number);return Math.round(Date.UTC(p[0],p[1]-1,p[2])/864e5);};
const monKey=n=>new Date(n*864e5).toISOString().split('T')[0];
const monHas=v=>!(v===''||v==null||(typeof v==='string'&&!v.trim()));
const monNum=v=>{if(!monHas(v)||typeof v==='boolean'||typeof v==='object')return null;const n=Number(v);return isFinite(n)?n:null;};
const monMean=a=>a.reduce((s,x)=>s+x,0)/a.length;
/* Örneklem SS (n−1): z-skor referanslarının SS'i. */
const monSdSample=a=>{if(a.length<2)return 0;const m=monMean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1));};
/* Popülasyon SS (n): monotoninin SS'i — mevcut uygulamanın (weekMono) tanımı korunur. */
const monSdPop=a=>{const m=monMean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length);};
const monSdOf=(a,cfg)=>cfg.SS_TANIMI==='populasyon'?monSdPop(a):monSdSample(a);
const MON_UNK=Object.freeze({st:'bilinmiyor',v:null});
const monKnown=d=>!!d&&(d.st==='kayitli'||d.st==='dogrulanmis_yok')&&d.v!=null;
function monStream(n0,n1){
  const a=new Array(Math.max(0,n1-n0+1)).fill(null);
  return{n0,n1,get:n=>(n<n0||n>n1)?MON_UNK:(a[n-n0]||MON_UNK),set:(n,s)=>{if(n>=n0&&n<=n1)a[n-n0]=s;}};
}
/* En küçük kareler eğimi (birim/gün); x takvim günü — indeks değil, boşluklar zaman-doğru kalır. */
function monOls(xs,ys){
  if(xs.length<2)return null;
  const mx=monMean(xs),my=monMean(ys);let sxy=0,sxx=0;
  xs.forEach((x,i)=>{sxy+=(x-mx)*(ys[i]-my);sxx+=(x-mx)*(x-mx);});
  return sxx>0?sxy/sxx:null;
}

/* ═══ 1 · HAM VERİDEN GÜN DURUMLARI (Sınıf G ile) ═══════════════════════════ */
const MON_W_FIELDS=[['sleepQ','sleep'],['mental','mentalFatigue'],['physical','physicalFatigue'],['soreness','soreness']];
const MON_SLOTS=[['tp','tpRPE','tpDuration','tpLoad'],['sc','scRPE','scDuration','scLoad'],['game','gameRPE','gameDuration','gameLoad']];
const MON_STREAMS=['sleepH','sleepQ','mental','physical','soreness','load','expTrain','expMatch','expTotal'];
/* Bir takvim gününün yükü. Sıra: sRPE kaydı (sporcunun bildirimi) → takvimdeki seansların
   AU'su (koçun puanı) → takvimde seans yoksa doğrulanmış dinlenme. Mevcut athDayLoad ile
   aynı kaynak önceliği; fark, eksik/geçersiz verinin sıfır sayılmaması. */
function monLoadDay(rows,sessions,cfg){
  const g=[];let srpeAny=false,srpeSum=0,trn=0,mch=0,expOk=true,game=false,dayMin=0;
  rows.forEach(e=>{
    let any=false,slotSum=0;
    MON_SLOTS.forEach(([id,rk,dk,lk])=>{
      const hR=monHas(e[rk]),hD=monHas(e[dk]),hL=monHas(e[lk]);
      if(!hR&&!hD&&!hL)return;
      any=true;
      const r=monNum(e[rk]),d=monNum(e[dk]),l=monNum(e[lk]);
      if(hR&&(r==null||r<cfg.RPE_OLCEK[0]||r>cfg.RPE_OLCEK[1]))g.push({alan:'srpe_'+id,deger:e[rk],kural:'G1'});
      if((hD&&(d==null||d<0))||(hL&&(l==null||l<0)))g.push({alan:'srpe_'+id,deger:hD?e[dk]:e[lk],kural:'G2'});
      if(d!=null&&d>cfg.G_MAX_SEANS_DK)g.push({alan:'srpe_'+id,deger:e[dk],kural:'G2'});
      if((d===0&&r!=null&&r>0)||(d!=null&&d>0&&!hR)||(r!=null&&r>0&&!hD&&!hL))
        g.push({alan:'srpe_'+id,deger:`RPE ${hR?e[rk]:'—'} · ${hD?e[dk]:'—'} dk`,kural:'G4'});
      const sl=l!=null?l:(r!=null&&d!=null?r*d:null);
      if(sl!=null)slotSum+=sl;
      if(d!=null){dayMin+=d;if(id==='game')mch+=d;else trn+=d;}else expOk=false;
      if(id==='game'&&((d||0)>0||(l||0)>0))game=true;
    });
    if(monHas(e.totalLoad)){any=true;const t=monNum(e.totalLoad);if(t==null||t<0)g.push({alan:'srpe_total',deger:e.totalLoad,kural:'G2'});}
    if(!any)return;
    srpeAny=true;
    const t=monNum(e.totalLoad);
    srpeSum+=(t!=null&&t>0)?t:slotSum;
  });
  if(dayMin>cfg.G_MAX_GUN_DK)g.push({alan:'srpe_gun',deger:dayMin+' dk',kural:'G2'});
  if(g.length)return{st:'gecersiz',v:null,g};
  let cal=0,calKnown=true,cTrn=0,cMch=0,cExp=true,cGame=false;
  sessions.forEach(s=>{
    let au=monNum(s.au);
    const dur=monNum(s.duration),r=monNum(s.sRPE);
    if(au==null&&r!=null&&dur!=null)au=r*dur;
    if(au==null)calKnown=false;else cal+=au;
    const isM=typeof sesKind==='function'&&sesKind(s)==='match';
    if(isM)cGame=true;
    if(dur==null)cExp=false;else if(isM)cMch+=dur;else cTrn+=dur;
  });
  const typ=(isG,v)=>isG?'mac':(v>0?'antrenman':'dinlenme');
  if(srpeAny&&srpeSum>0)return{st:'kayitli',v:srpeSum,src:'srpe',typ:typ(game,srpeSum),exp:expOk?{t:trn,m:mch}:null};
  if(sessions.length&&calKnown&&cal>0)return{st:'kayitli',v:cal,src:'takvim',typ:typ(cGame,cal),exp:cExp?{t:cTrn,m:cMch}:null};
  if(srpeAny)return{st:'kayitli',v:0,src:'srpe',typ:'dinlenme',exp:expOk?{t:trn,m:mch}:null};
  if(sessions.length)return calKnown?{st:'kayitli',v:0,src:'takvim',typ:'dinlenme',exp:cExp?{t:cTrn,m:cMch}:null}
    :{st:'bilinmiyor',v:null,neden:'SEANS_YUKU_YOK'};
  return{st:'dogrulanmis_yok',v:0,src:'takvim_seanssiz',typ:'dinlenme',exp:{t:0,m:0}};
}
/* Ağrı haritasının ham değeri → {bölge: 5'li ölçekte değer | 'unk'} ve Sınıf G1 bölgeleri.
   Formun 1-3'ü yalnızca burada, onaylı eşlemeyle 4-3-2'ye çevrilir; ham kayıt aynen kalır. */
function monPainOf(raw,cfg){
  const regions={},g=[];
  if(raw==null||raw==='')return{regions,g};
  let src=raw;
  if(src&&typeof src==='object'&&!Array.isArray(src)){
    const keep={};
    Object.entries(src).forEach(([k,v])=>{
      if(!monHas(v))return;
      const n=monNum(v);
      const sev=typeof v==='boolean'?null:n!=null?n:painSevN(v);
      if(!cfg.AGRI_FORM_SIDDET.includes(sev)||sev===cfg.AGRI_FORM_SIDDET[0])g.push({alan:'pain',bolge:k,deger:v,kural:'G1'});
      else keep[k]=v;
    });
    src=keep;
  }
  const map=parsePainMap(src)||{};
  Object.entries(map).forEach(([r,s])=>{regions[r]=s>0?(cfg.AGRI_ESLEME[s]!=null?cfg.AGRI_ESLEME[s]:'unk'):'unk';});
  return{regions,g};
}
/* Sporcunun bütün kayıtlarından gün durumları. opts: {cfg, today:'YYYY-MM-DD',
   polarSleep:{tarih: uyuma saniyesi}} — Polar uykusu uyanılan sabahın tarihini taşır. */
function monBuild(ath,opts){
  const cfg=opts.cfg,tKey=opts.today,tN=monDN(tKey),queue=[];
  const q=(tarih,alan,deger,kural,extra)=>queue.push({tarih,alan,deger:deger==null?'':(typeof deger==='object'?JSON.stringify(deger):String(deger)),kural,...(extra||{})});
  const polar=opts.polarSleep||{};
  let n0=tN;
  const see=k=>{if(MON_KEY_RE.test(String(k||''))){const n=monDN(k);if(n<n0)n0=n;}};
  (ath.wellness||[]).forEach(w=>w&&see(w.date));
  (ath.srpeLog||[]).forEach(e=>e&&see(e.date));
  (ath.nightLog||[]).forEach(e=>e&&see(e.date));
  Object.keys(ath.days||{}).forEach(k=>{if((((ath.days||{})[k]||{}).sessions||[]).length)see(k);});
  Object.keys(polar).forEach(see);
  const S={};MON_STREAMS.forEach(id=>{S[id]=monStream(n0,tN);});
  const pain=new Map();
  let legacyFatigue=0;
  /* — Wellness: o tarihteki en son kayıt kazanır (Wellness takviminin kuralı). — */
  const byW={},byPain={};
  (ath.wellness||[]).forEach(w=>{if(!w||!MON_KEY_RE.test(String(w.date||'')))return;byW[w.date]=w;
    const pr=w.painMap&&typeof w.painMap==='object'&&Object.keys(w.painMap).length?w.painMap:(monHas(w.areaOfPain)?w.areaOfPain:null);
    if(pr!=null)byPain[w.date]=pr;});
  Object.entries(byW).forEach(([k,w])=>{
    const n=monDN(k),fut=n>tN;
    let any=false;
    MON_W_FIELDS.forEach(([sid,f])=>{
      if(!monHas(w[f]))return;
      any=true;
      if(fut){q(k,sid,w[f],'G5');return;}
      const v=monNum(w[f]);
      if(v==null||v<cfg.WELLNESS_OLCEK[0]||v>cfg.WELLNESS_OLCEK[1]){q(k,sid,w[f],'G1');S[sid].set(n,{st:'gecersiz',v:null,kural:'G1'});}
      else S[sid].set(n,{st:'kayitli',v,src:'oz_bildirim'});
    });
    if(!monHas(w.mentalFatigue)&&!monHas(w.physicalFatigue)&&monHas(w.fatigue)){legacyFatigue++;any=true;}
    if(monHas(w.readiness)||monHas(w.RHR))any=true;
    const pr=byPain[k];
    if(pr!=null)any=true;
    if(!any)return;
    if(fut){if(pr!=null)q(k,'pain',pr,'G5');return;}
    const P=monPainOf(pr,cfg);
    P.g.forEach(x=>q(k,'pain',x.deger,'G1',{bolge:x.bolge}));
    pain.set(n,{checkin:true,regions:P.regions,gRegions:P.g.map(x=>x.bolge),note:painFreeText(w.areaOfPain)});
  });
  /* — Uyku süresi: elle girilen gece kaydı önce, yoksa Polar (cihaz tahmini). — */
  const byN={};(ath.nightLog||[]).forEach(x=>{if(x&&MON_KEY_RE.test(String(x.date||'')))byN[x.date]=x;});
  Object.entries(byN).forEach(([k,x])=>{
    if(!monHas(x.bedTime)||!monHas(x.wakeTime))return;
    const n=monDN(k);
    if(n>tN){q(k,'sleepH',`${x.bedTime}–${x.wakeTime}`,'G5');return;}
    const b=hhmmMin(x.bedTime),w=hhmmMin(x.wakeTime);
    if(b==null||w==null){q(k,'sleepH',`${x.bedTime}–${x.wakeTime}`,'G3');S.sleepH.set(n,{st:'gecersiz',v:null,kural:'G3'});return;}
    let d=w-b;if(d<=0)d+=24*60;
    const h=d/60;
    if(h<cfg.G_UYKU_SA[0]||h>cfg.G_UYKU_SA[1]){q(k,'sleepH',h,'G3');S.sleepH.set(n,{st:'gecersiz',v:null,kural:'G3'});return;}
    S.sleepH.set(n,{st:'kayitli',v:h,src:'elle'});
  });
  Object.entries(polar).forEach(([k,sec])=>{
    if(!MON_KEY_RE.test(k))return;
    const n=monDN(k);if(n>tN||S.sleepH.get(n)!==MON_UNK)return;
    const s=monNum(sec);if(s==null)return;
    const h=s/3600;
    if(h<cfg.G_UYKU_SA[0]||h>cfg.G_UYKU_SA[1]){q(k,'sleepH',h.toFixed(2)+' sa','G3');S.sleepH.set(n,{st:'gecersiz',v:null,kural:'G3'});return;}
    S.sleepH.set(n,{st:'kayitli',v:h,src:'cihaz'});
  });
  /* — Yük ve maruziyet, her takvim günü. — */
  const rowsBy={};
  (ath.srpeLog||[]).forEach(e=>{if(!e||!MON_KEY_RE.test(String(e.date||'')))return;
    if(monDN(e.date)>tN){q(e.date,'srpe_gun',e.totalLoad,'G5');return;}
    (rowsBy[e.date]=rowsBy[e.date]||[]).push(e);});
  let loadStart=null,restInferred=0;
  const srpeRows=[];
  for(let n=n0;n<=tN;n++){
    const k=monKey(n);
    const rows=rowsBy[k]||[];
    rows.forEach(e=>srpeRows.push({tarih:k,at:e.submittedAt||null}));
    const ss=(((ath.days||{})[k]||{}).sessions)||[];
    const d=monLoadDay(rows,ss,cfg);
    if(d.st==='gecersiz')d.g.forEach(x=>q(k,x.alan,x.deger,x.kural));
    S.load.set(n,d);
    if(loadStart==null&&monKnown(d)&&d.v>0)loadStart=n;
    const ex=monKnown(d)&&d.exp?d.exp:null;
    const es=ex?{st:d.st,v:null}:{st:d.st==='gecersiz'?'gecersiz':'bilinmiyor',v:null};
    S.expTrain.set(n,ex?{...es,v:ex.t}:es);S.expMatch.set(n,ex?{...es,v:ex.m}:es);S.expTotal.set(n,ex?{...es,v:ex.t+ex.m}:es);
  }
  /* Akışın başından önceki günler veri değil: ilk yüklü günden önce takvimden "dinlenme"
     çıkarılmaz. Açıkça yazılmış kayıt (sRPE 0 ya da Sınıf G) olduğu gibi kalır. */
  for(let n=n0;n<=tN;n++){
    if(loadStart!=null&&n>=loadStart){if(S.load.get(n).st==='dogrulanmis_yok')restInferred++;continue;}
    const cur=S.load.get(n).st;
    if(cur==='kayitli'||cur==='gecersiz')continue;
    const pre={st:'bilinmiyor',v:null,pre:true};
    S.load.set(n,pre);S.expTrain.set(n,pre);S.expMatch.set(n,pre);S.expTotal.set(n,pre);
  }
  const growth=monGrowth(ath,cfg,tKey,q);
  return{cfg,tN,tKey,n0,S,pain,queue,loadStart,growth,srpeRows,notes:{legacyFatigue,restInferred},_c:{}};
}

/* ═══ 2 · KİŞİSEL REFERANS, ETKİN ÖRNEKLEM, Z-SKOR (§3) ══════════════════════ */
/* n_eff = n·(1−ρ)/(1+ρ), ρ = min(max(ρ̂,0), RHO_MAX): negatif otokorelasyon n'i büyütmez. */
function monNeffDaily(n,rhoHat,cfg){const rho=Math.min(Math.max(rhoHat,0),cfg.RHO_MAX);return{rho,neff:n*(1-rho)/(1+rho)};}
/* SS tahmininin göreli standart hatası ≈ 1/√(2(n_eff−1)). */
const monSdRelSE=neff=>neff>1?1/Math.sqrt(2*(neff-1)):null;
/* Günlük referans: değerlendirilen günden önceki REFERANS_GUN takvim günündeki geçerli
   değerler (gün referansa girmez). ρ̂ yalnızca takvimde bitişik geçerli çiftlerden:
   ρ̂ = Σ(x_i − x̄)(x_i+1 − x̄) / Σ(x_i − x̄)². Hiç değişkenlik yoksa (payda 0) ρ̂ = 0. */
function monRefDaily(s,n,cfg,filter){
  const xs=[],ix=[];
  for(let j=n-cfg.REFERANS_GUN;j<n;j++){const d=s.get(j);if(monKnown(d)&&(!filter||filter(d))){xs.push(d.v);ix.push(j);}}
  const cnt=xs.length,ort=cnt?monMean(xs):null,ss=cnt?monSdSample(xs):null;
  let ciftler=0,num=0,den=0;
  xs.forEach(x=>{den+=(x-ort)*(x-ort);});
  for(let i=0;i+1<ix.length;i++)if(ix[i+1]===ix[i]+1){ciftler++;num+=(xs[i]-ort)*(xs[i+1]-ort);}
  let rhoHat=null,rho=null,neff=null;
  const nedenler=[];
  if(cnt<cfg.Z_MIN_GOZLEM_GUNLUK)nedenler.push('YETERSIZ_GOZLEM');
  if(ciftler<cfg.RHO_MIN_CIFT)nedenler.push('RHO_KESTIRILEMEDI');
  else{rhoHat=den>0?num/den:0;const r=monNeffDaily(cnt,rhoHat,cfg);rho=r.rho;neff=r.neff;
    if(neff<cfg.Z_MIN_NEFF_GUNLUK)nedenler.push('NEFF_DUSUK');}
  return{olcek:'gunluk',n:cnt,ciftler,rhoHat,rho,neff,ort,ss,yeterli:!nedenler.length,nedenler};
}
/* k-günlük pencerenin değeri. 'mean' kapsam kuralıyla (geçerli gün oranı ≥ PENCERE_MIN_KAPSAM,
   eksik gün sıfır sayılmaz); 'sum' / 'mono' / 'strain' pencerenin TAMAMI bilinmeli. */
function monWin(s,n,k,kind,cfg){
  const xs=[];let g=0;
  for(let j=n-k+1;j<=n;j++){const d=s.get(j);if(monKnown(d))xs.push(d.v);else if(d.st==='gecersiz')g++;}
  const olcek='pencere'+k,kap=xs.length/k;
  const bad=()=>({olcek,v:null,ok:false,neden:g?'DOGRULAMA_BEKLIYOR':'PENCERE_EKSIK',kap,g});
  if(kind==='mean')return kap<cfg.PENCERE_MIN_KAPSAM?bad():{olcek,v:monMean(xs),ok:true,kap,g};
  if(xs.length<k)return bad();
  const tot=xs.reduce((a,b)=>a+b,0);
  if(kind==='sum')return{olcek,v:tot,ok:true,kap,g};
  const m=tot/k,sd=monSdOf(xs,cfg);
  if(m===0||sd===0)return{olcek,v:null,ok:false,neden:m===0?'YUK_YOK':'SS_SIFIR',kap,g};
  const mono=m/sd;
  return{olcek,v:kind==='mono'?mono:tot*mono,ok:true,kap,g,mean:m,sd};
}
/* Pencere referansı: değerlendirilen pencereyle ÖRTÜŞMEYEN (son günü ≤ t−k) ve
   PENCERE_GERI_BAKIS_GUN içinde biten geçerli k-günlük pencereler.
   n_eff = min(n_pencere, D_ref/k), D_ref = pencerelerin kapsadığı farklı geçerli gün. */
function monRefWin(s,n,k,kind,cfg){
  const vals=[],days=new Set();let bad=0;
  for(let e=n-cfg.PENCERE_GERI_BAKIS_GUN;e<=n-k;e++){
    const w=monWin(s,e,k,kind,cfg);
    if(!w.ok){bad++;continue;}
    vals.push(w.v);
    for(let j=e-k+1;j<=e;j++)if(monKnown(s.get(j)))days.add(j);
  }
  const cnt=vals.length,dRef=days.size,neff=Math.min(cnt,dRef/k);
  const nedenler=[];
  if(cnt<cfg.Z_MIN_GOZLEM_GUNLUK)nedenler.push('YETERSIZ_GOZLEM');
  if(neff<cfg.Z_MIN_NEFF_PENCERE)nedenler.push('NEFF_DUSUK');
  return{olcek:'pencere'+k,n:cnt,dRef,neff,ort:cnt?monMean(vals):null,ss:cnt?monSdSample(vals):null,
    yeterli:!nedenler.length,nedenler,yetersizPencere:bad};
}
/* z-skor yalnızca AYNI ölçekteki değer ile referans arasında. Ölçekler uyuşmazsa hata. */
function monZ(val,ref,sigmaMin){
  if(!val||!ref||val.olcek!==ref.olcek)throw new Error(`Ölçek uyuşmazlığı: ${val&&val.olcek} ≠ ${ref&&ref.olcek}`);
  return(val.v-ref.ort)/Math.max(ref.ss,sigmaMin);
}
/* Gösterge tanımları. dir: +1 yüksek değer iyi (olumsuz eğilim yönü için), 0 yön yok. */
const MON_IND=[
  {id:'sleepH',cat:'C',stream:'sleepH',dir:1,sig:'uykuSa',win:'mean'},
  {id:'sleepQ',cat:'C',stream:'sleepQ',dir:1,sig:'olcek5',win:'mean',subj:true},
  {id:'mental',cat:'C',stream:'mental',dir:1,sig:'olcek5',win:'mean',subj:true},
  {id:'physical',cat:'C',stream:'physical',dir:1,sig:'olcek5',win:'mean',subj:true},
  {id:'soreness',cat:'C',stream:'soreness',dir:1,sig:'olcek5',win:'mean',subj:true},
  {id:'load',cat:'B',stream:'load',dir:0,sig:'load',dayType:true},
  {id:'load7',cat:'B',stream:'load',dir:0,sig:'load',win:'sum',onlyWin:true},
  {id:'mono',cat:'B',stream:'load',dir:0,sig:'monotoni',win:'mono',onlyWin:true},
  {id:'strain',cat:'B',stream:'load',dir:0,sig:'strainAU',win:'strain',onlyWin:true},
  {id:'expo7',cat:'B',stream:'expTotal',dir:0,sig:'maruziyetDk',win:'sum',onlyWin:true},
];
const monInd=id=>MON_IND.find(x=>x.id===id);
function monSigmaMin(ind,ref,olcek,cfg){
  const S=cfg.SIGMA_MIN_GUNLUK;let g;
  if(ind.sig==='load'){const per=ref&&ref.ort!=null?(ind.win==='sum'?ref.ort/cfg.Z_PENCERE_K:ref.ort):0;g=Math.max(S.yukOran*Math.abs(per),S.yukMinAU);}
  else g=S[ind.sig];
  return olcek==='gunluk'?g:g*cfg.SIGMA_MIN_PENCERE_KAT;
}
/* Ham değişim ve eğilim (§3.5) — referans yetersizken gösterilen tek bilgi. Sapma
   sınıflandırması, "üstünde/altında" ya da eğilim etiketi YOK; yalnızca sayı ve grafik. */
function monRaw(s,n,cfg){
  const pts=[];
  for(let j=n-cfg.PENCERE_GERI_BAKIS_GUN;j<=n;j++){const d=s.get(j);if(monKnown(d))pts.push({n:j,v:d.v});}
  if(pts.length<cfg.HAM_MIN_GOZLEM)return{yeterli:false,nGozlem:pts.length};
  const son=pts[pts.length-1],onceki=pts[pts.length-2];
  const ma={};
  cfg.PENCERE_K.forEach(k=>{
    const w=monWin(s,n,k,'mean',cfg),p=monWin(s,n-k,k,'mean',cfg);
    ma[k]={v:w.ok?w.v:null,neden:w.ok?null:w.neden,onceki:p.ok?p.v:null,
      fark:w.ok&&p.ok?w.v-p.v:null,yuzde:w.ok&&p.ok&&p.v!==0?(w.v/p.v-1)*100:null};
  });
  const tail=pts.slice(-cfg.HAM_EGILIM_PENCERE_GUN);
  const egim=tail.length>=cfg.HAM_EGILIM_MIN_NOKTA?monOls(tail.map(p=>p.n),tail.map(p=>p.v)):null;
  return{yeterli:true,son:{tarih:monKey(son.n),v:son.v},onceki:{tarih:monKey(onceki.n),v:onceki.v},fark:son.v-onceki.v,
    ma,egim,egimNokta:tail.length,seri:tail.map(p=>({tarih:monKey(p.n),v:p.v}))};
}
/* Pencere göstergelerinin (toplam / monotoni / strain) ham hâli: bu pencere ve öncekine göre fark. */
function monRawWin(s,n,k,kind,cfg){
  const w=monWin(s,n,k,kind,cfg),p=monWin(s,n-k,k,kind,cfg);
  if(!w.ok&&!p.ok)return{yeterli:false};
  return{yeterli:true,son:w.ok?w.v:null,onceki:p.ok?p.v:null,fark:w.ok&&p.ok?w.v-p.v:null,yuzde:w.ok&&p.ok&&p.v!==0?(w.v/p.v-1)*100:null};
}
/* Olumsuz eğilim (§4.1), yön standardize: s_t = −z_t (daha kötü = pozitif). sArr kronolojik,
   son eleman bugün; null = bilinmeyen/geçersiz/referansı yetersiz gün (seriyi keser). */
function monTrendFromS(sArr,cfg){
  let r=0,C=0;
  for(let i=sArr.length-1;i>=0;i--){const s=sArr[i];if(s==null||s<cfg.EGILIM_GUN_ESIGI_SS)break;r++;C+=s;}
  return{r,C,ort:r?C/r:null,etiket:r>=cfg.EGILIM_MIN_ARDISIK_GUN&&C>=cfg.EGILIM_MIN_BIRIKIMLI};
}
function monDailyZAt(M,ind,n){
  const cfg=M.cfg,s=M.S[ind.stream],d=s.get(n);
  if(!monKnown(d))return null;
  if(ind.dayType&&cfg.GUN_TIPI_AYRIMI&&d.typ==='dinlenme')return null;
  const ref=monRefDaily(s,n,cfg,ind.dayType&&cfg.GUN_TIPI_AYRIMI?(x=>x.typ===d.typ):null);
  if(!ref.yeterli)return{ref,v:d.v,z:null};
  return{ref,v:d.v,z:monZ({olcek:'gunluk',v:d.v},ref,monSigmaMin(ind,ref,'gunluk',cfg))};
}
function monTrendAt(M,ind,n){
  const cfg=M.cfg,sArr=[],raw=[];
  for(let j=n-cfg.REFERANS_GUN;j<=n;j++){const x=monDailyZAt(M,ind,j);
    sArr.push(x&&x.z!=null?-ind.dir*x.z:null);raw.push(x&&x.z!=null?x.v-x.ref.ort:null);}
  const t=monTrendFromS(sArr,cfg);
  const run=raw.slice(raw.length-t.r);
  return{...t,hamFark:t.r?monMean(run):null};
}
/* Bir göstergenin bir gündeki tam değerlendirmesi: değer, kişisel referans, z (yalnızca
   yeterli referansta), ham değişim (yetersizde), eğilim (Kategori C, günlük ölçek). */
function monEval(M,id,olcek,n){
  const key=id+'|'+olcek+'|'+n;
  if(M._c[key])return M._c[key];
  const cfg=M.cfg,ind=monInd(id),s=M.S[ind.stream];
  let deger,ref,rest=false;
  if(olcek==='gunluk'){
    const d=s.get(n);
    deger=monKnown(d)?{olcek,v:d.v,ok:true,typ:d.typ,src:d.src}
      :{olcek,v:null,ok:false,neden:d.st==='gecersiz'?'DOGRULAMA_BEKLIYOR':d.pre?'AKIS_ONCESI':(d.neden||'KAYIT_YOK')};
    rest=!!(ind.dayType&&cfg.GUN_TIPI_AYRIMI&&deger.ok&&d.typ==='dinlenme');
    ref=monRefDaily(s,n,cfg,ind.dayType&&cfg.GUN_TIPI_AYRIMI&&deger.ok?(x=>x.typ===d.typ):null);
  }else{
    const k=cfg.Z_PENCERE_K;
    deger=monWin(s,n,k,ind.win,cfg);
    ref=monRefWin(s,n,k,ind.win,cfg);
  }
  const sigmaMin=monSigmaMin(ind,ref,olcek,cfg);
  const kodlar=[];
  if(!deger.ok)kodlar.push(deger.neden);
  if(rest)kodlar.push('DINLENME_GUNU');
  if(!ref.yeterli)kodlar.push('REFERANS_YETERSIZ',...ref.nedenler);
  const hesaplanabilir=deger.ok&&!rest&&ref.yeterli;
  const z=hesaplanabilir?monZ(deger,ref,sigmaMin):null;
  const thr=cfg.GOSTERIM_Z_ESIGI;
  const sapma=z==null?null:z>=thr?'ustunde':z<=-thr?'altinda':null;
  const ham=ref.yeterli?null:(olcek==='gunluk'||ind.win==='mean'?monRaw(s,n,cfg):monRawWin(s,n,cfg.Z_PENCERE_K,ind.win,cfg));
  const egilim=ind.cat==='C'&&olcek==='gunluk'&&hesaplanabilir?monTrendAt(M,ind,n):null;
  const out={id,olcek,n,tarih:monKey(n),deger,ref,sigmaMin,z,sapma,hesaplanabilir,kodlar,ham,egilim,
    ssGoreliHata:ref.yeterli?monSdRelSE(ref.neff):null,dinlenme:rest};
  M._c[key]=out;
  return out;
}

/* ═══ 3 · ANTRENMAN YÜKÜ, MONOTONİ, HAFTALIK DEĞİŞİM, MARUZİYET (§5, §9) ════ */
function monWeekly(s,n,cfg){
  const k=cfg.HAFTA_GUN,cur=monWin(s,n,k,'sum',cfg);
  if(!cur.ok)return{ok:false,neden:cur.neden};
  const prev=[];
  for(let w=1;w<=cfg.HAFTALIK_KARSILASTIRMA_HAFTA;w++){const p=monWin(s,n-w*k,k,'sum',cfg);if(p.ok)prev.push(p.v);}
  if(prev.length<cfg.HAFTALIK_MIN_HAFTA)return{ok:false,neden:'YETERSIZ_HAFTA',tam:prev.length,v:cur.v};
  const m=monMean(prev);
  if(m===0)return{ok:false,neden:'ONCEKI_YUK_SIFIR',tam:prev.length,v:cur.v};
  return{ok:true,v:cur.v,ort:m,oran:cur.v/m,yuzde:(cur.v/m-1)*100,tam:prev.length};
}

/* ═══ 4 · EWMA — STANDART ve UYARLANMIŞ AYRI İŞLEVLER (§6) ══════════════════ */
/* Standart: E₀ = seed; E_t = λ·x_t + (1−λ)·E_(t−1). xs akışın başından itibaren TAMAMEN
   bilinen günler. T güncellemeden sonra seed'in payı (1−λ)^T. */
function monEwmaStandard(xs,lam,seed){
  const out=[];let e=seed,tail=1;
  for(let i=0;i<xs.length;i++){e=lam*xs[i]+(1-lam)*e;tail*=(1-lam);out.push({v:e,baslangic:tail});}
  return out;
}
/* Uyarlanmış: Ê_t = Σ_bilinen w_k·x_(t−k) / Σ_bilinen w_k, w_k = λ(1−λ)^k. Bilinmeyen gün
   (null) ne değer ne ağırlık katar; ağırlıklar takvim uzaklığına bağlı kalır. Yinelemeli
   EWMA DEĞİL, bilinen günlerin takvim ağırlıklı ortalaması. Seed yok; başlangıç etkisi
   kesilmiş kuyruk ağırlığı (1−λ)^T, eksik payı bilinmeyen günlerin ağırlık toplamı. */
function monEwmaAdjusted(xs,lam){
  const out=[];let num=0,den=0,eks=0,tail=1;
  for(let i=0;i<xs.length;i++){
    const x=xs[i],k=x!=null;
    num=(1-lam)*num+(k?lam*x:0);den=(1-lam)*den+(k?lam:0);eks=(1-lam)*eks+(k?0:lam);tail*=(1-lam);
    out.push({v:den>0?num/den:null,baslangic:tail,eksik:eks});
  }
  return out;
}
const monLam=n=>2/(n+1);
/* Standart EWMA'nın seed'i (E₀). Kural yapılandırmada: ilk N günün ortalaması (varsayılan),
   sıfır ya da ilk günün değeri. Seed'in payı (1−λ)^T olarak her noktada görünür. */
function monSeed(xs,cfg){
  if(cfg.EWMA_SEED==='sifir')return 0;
  const known=xs.filter(x=>x!=null);
  if(!known.length)return 0;
  if(cfg.EWMA_SEED==='ilk_gun')return known[0];
  const first=xs.slice(0,cfg.EWMA_SEED_N).filter(x=>x!=null);
  return first.length?monMean(first):known[0];
}
/* Bir EWMA'nın her günü: yöntem seçimi (seri baştan tam biliniyorsa STANDART, yoksa
   UYARLANMIS), U_t = başlangıç payı + eksik payı ≤ EWMA_U_MAX geçerlilik kuralı ve
   denetim modunda (arayüzde gösterilmeyen) iki yöntemin farkı. */
function monEwmaPoints(xs,lam,seed,cfg){
  const fu=xs.findIndex(x=>x==null);
  const pre=fu<0?xs:xs.slice(0,fu);
  const std=monEwmaStandard(pre,lam,seed),adj=monEwmaAdjusted(xs,lam);
  return xs.map((x,i)=>{
    const hasStd=i<std.length,a=adj[i];
    const yontem=hasStd?'STANDART':'UYARLANMIS';
    const deger=hasStd?std[i].v:a.v;
    const baslangic_payi=hasStd?std[i].baslangic:a.baslangic,eksik_payi=hasStd?0:a.eksik;
    const U=baslangic_payi+eksik_payi;
    const gecerli=deger!=null&&U<=cfg.EWMA_U_MAX;
    return{yontem,deger,uyarlanmis:a.v,standart:hasStd?std[i].v:null,baslangic_payi,eksik_payi,U,gecerli,
      neden:gecerli?null:'GOZLENMEMIS_AGIRLIK_YUKSEK',denetim_fark:hasStd&&a.v!=null?std[i].v-a.v:null};
  });
}
/* ACWR = akut / kronik. İki bileşen de geçerli olmalı; birinden biri uyarlanmışsa İKİSİ de
   uyarlanmış formülle (pay ve payda aynı yöntem ailesinden) ve etiket UYARLANMIS. */
function monAcwrCombine(a,c,cfg){
  if(!a.gecerli||!c.gecerli)return{gecerli:false,neden:!a.gecerli?a.neden:c.neden,yontem:a.yontem==='UYARLANMIS'||c.yontem==='UYARLANMIS'?'UYARLANMIS':'STANDART'};
  const adj=a.yontem==='UYARLANMIS'||c.yontem==='UYARLANMIS';
  const num=adj?a.uyarlanmis:a.standart,den=adj?c.uyarlanmis:c.standart;
  const yontem=adj?'UYARLANMIS':'STANDART';
  if(den==null||den<cfg.KRONIK_SIFIR_EPS)return{gecerli:false,neden:'KRONIK_YUK_SIFIR',yontem};
  const ua=c.uyarlanmis!=null&&c.uyarlanmis>=cfg.KRONIK_SIFIR_EPS?a.uyarlanmis/c.uyarlanmis:null;
  const us=a.standart!=null&&c.standart!=null&&c.standart>=cfg.KRONIK_SIFIR_EPS?a.standart/c.standart:null;
  return{gecerli:true,yontem,deger:num/den,uyarlanmis:ua,standart:us,
    baslangic_payi:Math.max(a.baslangic_payi,c.baslangic_payi),eksik_payi:Math.max(a.eksik_payi,c.eksik_payi),
    akut:a,kronik:c};
}
/* Yöntem geçişi ve yapay değişim (§6.8): ardışık iki GEÇERLİ nokta arasında yöntem
   değişirse gosterilen = tutarli + yapay ayrıştırılır. Eşik yok; her geçiş kaydedilir. */
function monTransitions(pts){
  const out=[];let prev=null,gap=false;
  pts.forEach(p=>{
    if(!p.gecerli){if(prev)gap=true;return;}
    if(prev&&prev.yontem!==p.yontem){
      const gosterilen=p.deger-prev.deger,tutarli=p.uyarlanmis-prev.uyarlanmis;
      out.push({tarih:p.tarih,onceki:prev.tarih,yon:prev.yontem+'→'+p.yontem,kesinti:gap,gosterilen,tutarli,yapay:gosterilen-tutarli});
    }
    prev=p;gap=false;
  });
  return out;
}
/* Yöntem-tutarlı değişim: aralıkta geçiş varsa uyarlanmış seriden (tüm noktalarda var);
   yoksa gösterilen seriden (iki hesap aynı). Uçlardan biri geçersizse hesaplanamaz. */
function monEwmaChange(pts,i,j){
  const a=pts[i],b=pts[j];
  if(!a||!b||!a.gecerli||!b.gecerli)return{ok:false,neden:'UC_NOKTA_GECERSIZ'};
  let gecis=false;
  for(let k=i;k<=j;k++)if(pts[k].gecerli&&pts[k].yontem!==a.yontem){gecis=true;break;}
  return gecis?{ok:true,gecis:true,degisim:b.uyarlanmis-a.uyarlanmis,karisik:b.deger-a.deger}
    :{ok:true,gecis:false,degisim:b.deger-a.deger};
}
/* Sporcunun yük akışından akut, kronik ve ACWR serileri (akışın ilk yüklü gününden bugüne). */
function monLoadModel(M){
  if(M._c.ewma)return M._c.ewma;
  const cfg=M.cfg,s=M.S.load;
  if(M.loadStart==null)return(M._c.ewma={var:false,points:[],gecisler:{akut:[],kronik:[],acwr:[]},byN:new Map()});
  const xs=[],keys=[];
  for(let n=M.loadStart;n<=M.tN;n++){const d=s.get(n);xs.push(monKnown(d)?d.v:null);keys.push(n);}
  const seed=monSeed(xs,cfg);
  const A=monEwmaPoints(xs,monLam(cfg.EWMA_AKUT_GUN),seed,cfg),C=monEwmaPoints(xs,monLam(cfg.EWMA_KRONIK_GUN),seed,cfg);
  const points=keys.map((n,i)=>{const t=monKey(n);
    const a={...A[i],tarih:t},c={...C[i],tarih:t},r={...monAcwrCombine(a,c,cfg),tarih:t};
    return{n,tarih:t,akut:a,kronik:c,acwr:r};});
  const byN=new Map(points.map((p,i)=>[p.n,i]));
  const gecisler={akut:monTransitions(points.map(p=>p.akut)),kronik:monTransitions(points.map(p=>p.kronik)),acwr:monTransitions(points.map(p=>p.acwr))};
  return(M._c.ewma={var:true,seed,points,gecisler,byN});
}

/* ═══ 5 · AĞRI (§8) — sıralı kategorik veri; istatistik yok, yalnızca durum ════ */
const monPainFree=cfg=>cfg.AGRI_YON==='dusuk_kotu'?cfg.AGRI_OLCEK[1]:cfg.AGRI_OLCEK[0];
const monPainWorse=(a,b,cfg)=>cfg.AGRI_YON==='dusuk_kotu'?a<b:a>b;
/* prev: geri bakıştaki önceki kayıt (null = yok); cur: bugünün değeri (null = kayıt yok).
   'unk' = ağrı var, şiddeti derecelendirilmemiş. */
function monPainStatus(prev,cur,cfg){
  const free=monPainFree(cfg);
  if(cur==null)return{kod:'BILINMIYOR',uyari:false};
  if(cur===free)return prev!=null&&prev!==free?{kod:'AGRISIZLIGA_DONUS',uyari:false}:{kod:'AGRISIZ',uyari:false};
  if(prev==null)return{kod:'YENI_BILDIRILEN',uyari:true};
  if(prev===free)return{kod:'YENI_AGRI',uyari:true};
  if(cur==='unk'||prev==='unk')return{kod:'DEVAM_SIDDET_BILINMIYOR',uyari:false};
  if(monPainWorse(cur,prev,cfg))return{kod:'ARTIS',uyari:true};
  if(cur===prev)return{kod:'DEVAM',uyari:false};
  return{kod:'AZALMA',uyari:false,bilgi:true};
}
/* Bir günün bir bölgesi: check-in varsa bölgenin değeri, bölge yoksa bölgesiz ağrısız (5);
   check-in yoksa bilinmiyor (asla 5 değil); Sınıf G1 bölge ne ağrısız ne ağrı (undefined). */
function monPainVal(day,r,cfg){
  if(!day||!day.checkin)return null;
  if(day.gRegions.includes(r))return undefined;
  return r in day.regions?day.regions[r]:monPainFree(cfg);
}
function monPainAt(M,n){
  const cfg=M.cfg,today=M.pain.get(n);
  if(!today||!today.checkin)return{kayit:false,bolgeler:[],uyarilar:[]};
  const free=monPainFree(cfg),regs=new Set(Object.keys(today.regions));
  for(let j=1;j<=cfg.AGRI_GERI_BAKIS_GUN;j++){const d=M.pain.get(n-j);if(d&&d.checkin)Object.keys(d.regions).forEach(r=>regs.add(r));}
  const bolgeler=[];
  regs.forEach(r=>{
    const cur=monPainVal(today,r,cfg);
    if(cur===undefined)return;
    let prev=null,prevTarih=null;
    for(let j=1;j<=cfg.AGRI_GERI_BAKIS_GUN;j++){const v=monPainVal(M.pain.get(n-j),r,cfg);if(v!=null){prev=v;prevTarih=monKey(n-j);break;}}
    const st=monPainStatus(prev,cur,cfg);
    /* Ağrının süresi (gün): kesintisiz ağrılı kayıtların başı; ağrısız kayıt ya da geri bakışı
       aşan boşluk dönemi böler. */
    let bas=null;
    if(cur!==free){let last=n;bas=n;
      for(let j=n-1;j>=n-cfg.REFERANS_GUN&&last-j<=cfg.AGRI_GERI_BAKIS_GUN;j--){const v=monPainVal(M.pain.get(j),r,cfg);
        if(v==null||v===undefined)continue;if(v===free)break;bas=j;last=j;}}
    bolgeler.push({bolge:r,bugun:cur,onceki:prev,oncekiTarih:prevTarih,...st,ilkBildirim:bas!=null?monKey(bas):null,sureGun:bas!=null?n-bas+1:null});
  });
  bolgeler.sort((a,b)=>(b.uyari-a.uyari)||String(a.bolge).localeCompare(String(b.bolge),'tr'));
  return{kayit:true,bolgeler,uyarilar:bolgeler.filter(b=>b.uyari),not:today.note||''};
}
/* Son N günün bölge × gün tablosu (zaman çizelgesi): ağrı serisine istatistik uygulanmaz. */
function monPainTimeline(M,n,days){
  const cfg=M.cfg,regs=new Set();
  for(let j=n-days+1;j<=n;j++){const d=M.pain.get(j);if(d&&d.checkin)Object.keys(d.regions).forEach(r=>regs.add(r));}
  const cols=[];for(let j=n-days+1;j<=n;j++)cols.push(j);
  return{gunler:cols.map(monKey),satirlar:[...regs].sort((a,b)=>String(a).localeCompare(String(b),'tr')).map(r=>({bolge:r,
    degerler:cols.map(j=>{const v=monPainVal(M.pain.get(j),r,cfg);return v===undefined?'G':v;})}))};
}

/* ═══ 6 · BÜYÜME VE OLGUNLAŞMA (§10) — bağlam bilgisi, sabit sınıflandırma yok ══ */
function monGrowth(ath,cfg,tKey,q){
  const recs=phvRecords(ath);
  const inR=(v,r)=>v==null||(v>=r[0]&&v<=r[1]);
  const ok=[];
  recs.forEach(r=>{
    const hOk=inR(r.height,cfg.BOY_MANTIKSAL_ARALIK_CM),wOk=inR(r.weight,cfg.KILO_MANTIKSAL_ARALIK_KG);
    if(!hOk)q(r.date,'height',r.height,'G6');
    if(!wOk)q(r.date,'weight',r.weight,'G6');
    ok.push({...r,height:hOk?r.height:null,weight:wOk?r.weight:null});
  });
  const hs=ok.filter(r=>r.height!=null);
  /* R5: ardışık ölçümde azalma (ölçüm hatası ötesinde) ya da fark hata aralığında. Hariç tutma yok. */
  const r5=[];
  for(let i=1;i<hs.length;i++){const d=hs[i].height-hs[i-1].height;
    if(d<-cfg.BOY_OLCUM_HATASI_CM)r5.push({tarih:hs[i].date,tur:'azalma',fark:d});
    else if(Math.abs(d)<=cfg.BOY_OLCUM_HATASI_CM)r5.push({tarih:hs[i].date,tur:'hata_araliginda',fark:d});}
  /* Büyüme hızı: aralığı ≥ BOY_MIN_ARALIK_GUN olan ardışık ölçümlerden cm/yıl, son
     BOY_KAYAN_N hızın kayan ortalaması (en az BOY_MIN_OLCUM ölçüm). */
  const chain=[];
  hs.forEach(r=>{if(!chain.length||diffD(chain[chain.length-1].date,r.date)>=cfg.BOY_MIN_ARALIK_GUN)chain.push(r);});
  const vels=[];
  for(let i=1;i<chain.length;i++){const days=diffD(chain[i-1].date,chain[i].date);vels.push({from:chain[i-1].date,to:chain[i].date,days,v:(chain[i].height-chain[i-1].height)/(days/365.25)});}
  const hiz=chain.length>=cfg.BOY_MIN_OLCUM?{v:monMean(vels.slice(-cfg.BOY_KAYAN_N).map(x=>x.v)),hizlar:vels.slice(-cfg.BOY_KAYAN_N),olcum:chain.length}:null;
  /* Tahmini olgunlaşma ofseti (Mirwald 2002): yalnızca gerekli ölçümler varsa. */
  let phv={ok:false,neden:'GEREKLI_ALAN_YOK',eksik:[]};
  if(ath.sex!=='M'&&ath.sex!=='F')phv.eksik.push('cinsiyet');
  if(!ath.dateOfBirth)phv.eksik.push('dogum');
  const full=ok.filter(r=>r.height!=null&&r.weight!=null&&r.sit!=null);
  if(!full.length)phv.eksik.push('olcum');
  if(!phv.eksik.length){const r=full[full.length-1],age=phvAgeAt(ath.dateOfBirth,r.date);
    if(age==null)phv.eksik.push('dogum');
    else if(age<cfg.PHV_YAS[0]||age>cfg.PHV_YAS[1])phv={ok:false,neden:'YAS_ARALIGI_DISI',yas:age,eksik:[]};
    else{const off=phvOffset(ath.sex,age,r.height,r.weight,r.sit);
      phv=off==null?{ok:false,neden:'GEREKLI_ALAN_YOK',eksik:['olcum']}:{ok:true,ofset:off,yas:age,tarih:r.date,phvYasi:age-off};}}
  const yas=ath.dateOfBirth?phvAgeAt(ath.dateOfBirth,tKey):null;
  return{hiz,hizNeden:hiz?null:(hs.length<cfg.BOY_MIN_OLCUM?'YETERSIZ_OLCUM':'YETERSIZ_ARALIK'),r5,phv,yas,olcumSayisi:hs.length};
}

/* ═══ 7 · SAKATLIK GEÇMİŞİ (§7) — bağlam; olasılık hesaplanmaz ════════════════ */
function monInjuries(ath,tKey){
  const list=(ath.injuries||[]).filter(Boolean).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const seen={};
  return list.map(i=>{
    const loc=String(i.location||i.area||'').trim().toLowerCase();
    const tekrar=loc?(seen[loc]=(seen[loc]||0)+1):null;
    const aktif=!i.actualReturn;
    return{id:i.id,tarih:i.date||'',yer:i.location||'',taraf:i.side||'',tip:i.type||'',derece:i.grade||'',doku:i.tissueType||'',
      aktif,donus:i.actualReturn||'',donustenBeriGun:aktif?null:Math.max(0,diffD(i.actualReturn,tKey)),tekrarNo:tekrar,
      kadroDisi:i.sidelinedDate||''};
  }).reverse();
}

/* ═══ 8 · ÜÇ AYRI DURUM: DOLULUK · HESAPLANABİLİRLİK · GÜVENİLİRLİK (§3A) ══════ */
function monReliability(M,ind,olcek,n){
  const cfg=M.cfg,s=M.S[ind.stream],from=n-cfg.REFERANS_GUN+1;
  const isaret=[],degerlendirilemiyor=[];
  let g=0;for(let j=from;j<=n;j++)if(s.get(j).st==='gecersiz')g++;
  if(g)isaret.push({kod:'R1',sayi:g});
  if(ind.subj){let run=1,best=0,prev=null,pn=null;
    for(let j=from;j<=n;j++){const d=s.get(j);if(!monKnown(d)){prev=null;continue;}
      run=(prev!=null&&d.v===prev&&pn===j-1)?run+1:1;prev=d.v;pn=j;if(run>best)best=run;}
    if(best>=cfg.R2_TEKRAR_GUN)isaret.push({kod:'R2',sayi:best});}
  if(ind.stream==='load'){
    const rows=M.srpeRows.filter(r=>monDN(r.tarih)>=from&&monDN(r.tarih)<=n);
    const stamped=rows.filter(r=>r.at&&isFinite(Date.parse(r.at)));
    if(!stamped.length)degerlendirilemiyor.push('R3');
    else{const late=stamped.filter(r=>(Date.parse(r.at)-Date.parse(r.tarih+'T00:00:00'))/864e5*24>24+cfg.R3_GECIKME_SAAT).length;
      if(late)isaret.push({kod:'R3',sayi:late});}
  }
  const kaynak={};for(let j=from;j<=n;j++){const d=s.get(j);if(monKnown(d)&&d.src)kaynak[d.src]=(kaynak[d.src]||0)+1;}
  if(olcek==='gunluk'){let ev=0,hit=0;
    for(let j=from;j<=n;j++){const x=monDailyZAt(M,ind,j);if(x&&x.z!=null){ev++;if(Math.abs(x.z)>=cfg.R6_Z_ESIGI)hit++;}}
    if(!ev)degerlendirilemiyor.push('R6');else if(hit)isaret.push({kod:'R6',sayi:hit});}
  return{isaret,degerlendirilemiyor,kaynak,etiket:isaret.length?'ISARET_VAR':'BELIRGIN_SORUN_YOK'};
}
function monStatus(M,id,olcek,n){
  const cfg=M.cfg,ind=monInd(id),s=M.S[ind.stream],res=monEval(M,id,olcek,n);
  let gecerli=0,bekleyen=0;
  for(let j=n-cfg.REFERANS_GUN+1;j<=n;j++){const d=s.get(j);if(monKnown(d))gecerli++;else if(d.st==='gecersiz')bekleyen++;}
  return{doluluk:{gecerli,toplam:cfg.REFERANS_GUN,bekleyen},
    hesaplanabilirlik:{durum:res.hesaplanabilir?'Hesaplanabilir':'Hesaplanamıyor',kodlar:res.kodlar},
    guvenilirlik:monReliability(M,ind,olcek,n)};
}

/* ═══ 9 · DURUM ÖZETİ — ÜÇ AYRI KATEGORİ (§11) ═══════════════════════════════ */
const MON_B_IDS=['load','load7','mono','strain','expo7'];
const MON_C_IDS=['sleepH','sleepQ','mental','physical','soreness'];
/* Birlikte sapma: kategori içinde, YETERLİ referanslı göstergelerden kaçının aynı anda
   kişisel aralığın dışında olduğu (betimleyici sayı). Kategoriler arası toplanmaz. */
function monTogether(rows){
  const ok=rows.filter(r=>r.hesaplanabilir);
  return{sapan:ok.filter(r=>r.sapma).length,yeterli:ok.length,degerlendirilemedi:rows.length-ok.length};
}
function monSummary(M,ath,n,olcekC){
  const injuries=monInjuries(ath||{},monKey(n));
  const pain=monPainAt(M,n);
  const A=[];
  pain.uyarilar.forEach(p=>A.push({tur:'agri',...p}));
  injuries.filter(i=>i.aktif).forEach(i=>A.push({tur:'sakatlik',...i}));
  const B=MON_B_IDS.map(id=>monEval(M,id,monInd(id).onlyWin?'pencere':'gunluk',n));
  const C=MON_C_IDS.map(id=>monEval(M,id,olcekC||'gunluk',n));
  return{A,pain,injuries,B,C,birlikteB:monTogether(B),birlikteC:monTogether(C)};
}

/* ═══ 10 · PİLOT REFERANS YETERLİLİK RAPORU (§3.6) — salt okunur ═══════════════ */
const MON_REPORT_ROWS=[
  ...MON_C_IDS.flatMap(id=>[[id,'gunluk'],[id,'pencere']]),
  ['load','gunluk'],['load7','pencere'],['mono','pencere'],['strain','pencere'],['expo7','pencere'],['acwr','ewma'],
];
function monAdequacyAthlete(M,from,to){
  const rows=MON_REPORT_ROWS.map(([id,olcek])=>{
    let ev=0,ok=0;const neden={};
    for(let n=from;n<=to;n++){
      if(id==='acwr'){const L0=monLoadModel(M);if(!L0.var||n<M.loadStart)continue;ev++;
        const p=L0.points[L0.byN.get(n)];if(p&&p.acwr.gecerli)ok++;else{const c=(p&&p.acwr.neden)||'GOZLENMEMIS_AGIRLIK_YUKSEK';neden[c]=(neden[c]||0)+1;}continue;}
      const r=monEval(M,id,olcek,n);
      if(!r.deger.ok||r.dinlenme)continue;
      ev++;
      if(r.ref.yeterli)ok++;else r.ref.nedenler.forEach(c=>{neden[c]=(neden[c]||0)+1;});
    }
    return{id,olcek,degerlendirilebilir:ev,yeterli:ok,oran:ev?ok/ev:null,neden};
  });
  let wDays=0,lDays=0;
  for(let n=from;n<=to;n++){if((M.pain.get(n)||{}).checkin)wDays++;if(monKnown(M.S.load.get(n)))lDays++;}
  const span=to-from+1;
  return{rows,uyum:{wellness:wDays/span,yuk:lDays/span,gun:span}};
}
/* athletes: [{ath, M}] — M = monBuild(ath,…). Yapılandırmaya yazmaz; ham veriye dokunmaz. */
function monAdequacyReport(items,cfg,toKey){
  const to=monDN(toKey),from=to-cfg.RAPOR_GUN+1;
  const per=items.map(({ath,M})=>({id:ath.id,ad:ath.name||'—',...monAdequacyAthlete(M,Math.max(from,M.n0),to)}));
  const genel=MON_REPORT_ROWS.map(([id,olcek],i)=>{
    let ev=0,ok=0;const neden={};
    per.forEach(p=>{const r=p.rows[i];ev+=r.degerlendirilebilir;ok+=r.yeterli;Object.entries(r.neden).forEach(([c,v])=>{neden[c]=(neden[c]||0)+v;});});
    return{id,olcek,degerlendirilebilir:ev,yeterli:ok,oran:ev?ok/ev:null,neden};
  });
  const enDusuk=per.flatMap(p=>p.rows.filter(r=>r.oran!=null).map(r=>({ad:p.ad,id:r.id,olcek:r.olcek,oran:r.oran})))
    .sort((a,b)=>a.oran-b.oran).slice(0,cfg.RAPOR_EN_DUSUK_N);
  const B=cfg.RAPOR_UYUM_BANTLARI;
  const bantlar=B.slice(0,-1).map((lo,i)=>{const hi=B[i+1];
    const ps=per.filter(p=>p.uyum.wellness>=lo&&(i===B.length-2?p.uyum.wellness<=hi:p.uyum.wellness<hi));
    const dr=ps.map(p=>{const rs=p.rows.filter(r=>r.olcek==='gunluk'&&r.degerlendirilebilir);const e=rs.reduce((a,r)=>a+r.degerlendirilebilir,0),o=rs.reduce((a,r)=>a+r.yeterli,0);return e?o/e:null;}).filter(x=>x!=null);
    return{lo,hi,sporcu:ps.length,gunlukOran:dr.length?monMean(dr):null};});
  return{donem:{from:monKey(Math.max(from,Math.min(...items.map(x=>x.M.n0).concat([to])))),to:toKey},genel,sporcular:per,enDusuk,bantlar};
}
