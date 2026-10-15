/* ---- PHV — biyolojik olgunlaşma (maturity offset) ---------------------------------
   Mirwald ve ark. 2002 (Med Sci Sports Exerc 34:689): boy, oturma boyu, kilo ve yaştan
   "tepe boy büyüme hızı (PHV) yaşına kaç yıl var" tahmini. Negatif sayı PHV'ye henüz
   gelinmediğini, pozitif sayı geçildiğini söyler.

     bacak boyu = boy − oturma boyu   (Mirwald'ın tanımı; testteki ASIS→malleol "Bacak
                                       Uzunluğu" alanı BU DEĞİL, o yüzden kullanılmıyor)
     erkek: −9.236 + 0.0002708·(BB·OB) − 0.001663·(Y·BB) + 0.007216·(Y·OB) + 0.02292·(K/B·100)
     kız:   −9.376 + 0.0001882·(BB·OB) + 0.0022·(Y·BB) + 0.005841·(Y·OB) − 0.002658·(Y·K)
                   + 0.07693·(K/B·100)
     (BB bacak boyu cm, OB oturma boyu cm, Y yaş, K kilo kg, B boy cm)

   Bir TAHMİNDİR: tipik hata yaklaşık ±1 yıl, çok erken ve çok geç gelişenlerde daha fazla.
   Bu yüzden ekranda hep "tahmin" olarak ve hata payıyla gösterilir; tek başına karar aracı
   değildir. Yöntem 8-18 yaş için geliştirildi; dışında sonuç verilmez. */
const PHV_AGE_MIN=8,PHV_AGE_MAX=18;
const phvNum=v=>{if(v===''||v==null)return null;const n=Number(v);return isFinite(n)&&n>0?n:null;};
/* Ondalık yaş: doğum günü ile ölçüm günü arasındaki gün sayısı / 365.25. */
function phvAgeAt(dob,date){
  if(!dob||!date)return null;
  const a=parseD(dob),b=parseD(date);
  if(isNaN(a)||isNaN(b))return null;
  const y=(b-a)/(365.25*86400000);
  return y>0&&y<100?y:null;
}
/* Mirwald denklemi — saf işlev. sex: 'M' | 'F'. Girdi eksikse null. */
function phvOffset(sex,age,height,weight,sitting){
  if(sex!=='M'&&sex!=='F')return null;
  if(![age,height,weight,sitting].every(v=>v!=null&&isFinite(v)&&v>0))return null;
  const leg=height-sitting;
  if(leg<=0||sitting>=height)return null;
  const wh=weight/height*100;
  return sex==='M'
    ?-9.236+0.0002708*(leg*sitting)-0.001663*(age*leg)+0.007216*(age*sitting)+0.02292*wh
    :-9.376+0.0001882*(leg*sitting)+0.0022*(age*leg)+0.005841*(age*sitting)-0.002658*(age*weight)+0.07693*wh;
}
/* offset → grup. ±1 yıl: tahminin kendi hata payı kadar, "PHV civarı". */
function phvStatus(off){
  if(off==null)return null;
  if(off<-1)return{id:'pre',tr:'PHV öncesi',en:'Pre-PHV',c:'#3b82f6'};
  if(off<=1)return{id:'circa',tr:'PHV civarı',en:'Circa-PHV',c:'#f97316'};
  return{id:'post',tr:'PHV sonrası',en:'Post-PHV',c:'#10b981'};
}
/* Sporcunun ölçümlerini tek listede topla: Antropometri testleri + Ölçüm kayıtları.
   Aynı gün iki kaynakta varsa dolu olan alanlar birleşir. En yeni sonda. */
function phvRecords(ath){
  const byDate={};
  const add=r=>{
    if(!r||!r.date)return;
    const d=byDate[r.date]||(byDate[r.date]={date:r.date,height:null,weight:null,sit:null});
    const h=phvNum(r.height),w=phvNum(r.weight),s=phvNum(r.sittingHeight);
    if(h!=null)d.height=h;if(w!=null)d.weight=w;if(s!=null)d.sit=s;
  };
  (ath.tests||[]).forEach(add);
  (ath.measurements||[]).forEach(add);
  return Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
}
/* Büyüme hızı (cm/yıl): boyu olan en son kayıt ile ondan en az 90 gün önceki en yakın kayıt.
   Aralık kısaysa yıllıklandırmak gürültüyü büyütür, o yüzden hiç hesaplanmaz. */
function phvGrowthVelocity(recs){
  const hs=recs.filter(r=>r.height!=null);
  if(hs.length<2)return null;
  const last=hs[hs.length-1];
  for(let i=hs.length-2;i>=0;i--){
    const days=diffD(hs[i].date,last.date);
    if(days>=90){
      return{cmPerYear:+((last.height-hs[i].height)/(days/365.25)).toFixed(1),days,from:hs[i].date,to:last.date};
    }
  }
  return null;
}
/* Sporcu için tam sonuç. {ok:false, why} → neden hesaplanamadığı. */
function phvCompute(ath){
  if(!ath)return{ok:false,why:'noAth'};
  if(ath.sex!=='M'&&ath.sex!=='F')return{ok:false,why:'sex'};
  if(!ath.dateOfBirth)return{ok:false,why:'dob'};
  const recs=phvRecords(ath);
  const usable=recs.filter(r=>r.height!=null&&r.weight!=null&&r.sit!=null);
  const vel=phvGrowthVelocity(recs);
  if(!usable.length)return{ok:false,why:'data',vel};
  const r=usable[usable.length-1];
  const age=phvAgeAt(ath.dateOfBirth,r.date);
  if(age==null)return{ok:false,why:'dob',vel};
  if(age<PHV_AGE_MIN||age>PHV_AGE_MAX)return{ok:false,why:'age',age,vel};
  const off=phvOffset(ath.sex,age,r.height,r.weight,r.sit);
  if(off==null)return{ok:false,why:'data',vel};
  return{ok:true,date:r.date,age:+age.toFixed(2),offset:+off.toFixed(2),aphv:+(age-off).toFixed(1),
    status:phvStatus(off),vel,rec:r};
}
/* Tek satır özet — başka ekranlar (test sıralaması vb.) için. */
function phvLabel(ath){
  const p=phvCompute(ath);
  return p.ok?{status:p.status,offset:p.offset,aphv:p.aphv}:null;
}

const PHV_WHY=()=>({
  sex:L('Cinsiyet girilmemiş — Profili Düzenle bölümünden seç.','Sex is not set — choose it in Edit Profile.'),
  dob:L('Doğum tarihi girilmemiş.','Date of birth is not set.'),
  data:L('Boy, kilo ve oturma boyu aynı kayıtta gerekli. Ölçüm Ekle ile gir ya da Antropometri testinde Oturma Yüksekliğini doldur.','Height, weight and sitting height are needed in one record. Add a measurement, or fill Sitting Height in the Anthropometry test.'),
  age:L(`Yöntem ${PHV_AGE_MIN}-${PHV_AGE_MAX} yaş için geliştirildi; bu yaş aralığının dışında sonuç verilmez.`,`The method was built for ages ${PHV_AGE_MIN}-${PHV_AGE_MAX}; outside that range no result is given.`),
  noAth:'',
});
function PhvCard({ath}){
  const p=useMemo(()=>phvCompute(ath),[ath.sex,ath.dateOfBirth,ath.tests,ath.measurements]);
  const why=PHV_WHY();
  const vel=p.vel;
  /* Youth ekranı: yetişkin sporcuda (yaş > 18) kart hiç görünmez, ekranı kalabalıklaştırmasın. */
  const age=phvAgeAt(ath.dateOfBirth,fmt(today));
  if(age!=null&&age>PHV_AGE_MAX+1&&!p.ok)return null;
  return(<div className="panel phv-card">
    <div className="row" style={{justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
      <h2 style={{margin:0}}>{L('Biyolojik Olgunlaşma (PHV)','Biological Maturation (PHV)')}</h2>
      {p.ok&&<span className="phv-badge" style={{color:p.status.c,borderColor:p.status.c}}>{L(p.status.tr,p.status.en)}</span>}
    </div>
    {p.ok?<>
      <div className="ath-stat-row" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}>
        <div className="ath-stat"><div className="k">{L('Olgunluk farkı','Maturity offset')}</div><div className="v" style={{color:p.status.c}}>{p.offset>0?'+':''}{p.offset}<span className="u">{L('yıl','y')}</span></div></div>
        <div className="ath-stat"><div className="k">{L('Tahmini PHV yaşı','Est. age at PHV')}</div><div className="v">{p.aphv}<span className="u">{L('yaş','y')}</span></div></div>
        <div className="ath-stat"><div className="k">{L('Ölçüm yaşı','Age at measure')}</div><div className="v">{p.age.toFixed(1)}<span className="u">{L('yaş','y')}</span></div></div>
        <div className="ath-stat"><div className="k">{L('Büyüme hızı','Growth velocity')}</div><div className="v">{vel?vel.cmPerYear:'—'}<span className="u">cm/{L('yıl','y')}</span></div></div>
      </div>
      <div className="help" style={{marginTop:8}}>
        {L(`Ölçüm: ${fd(p.date)} (boy ${p.rec.height} cm · kilo ${p.rec.weight} kg · oturma boyu ${p.rec.sit} cm). `,`Measured ${fd(p.date)} (height ${p.rec.height} cm · mass ${p.rec.weight} kg · sitting height ${p.rec.sit} cm). `)}
        {vel&&L(`Büyüme hızı ${fd(vel.from)} → ${fd(vel.to)} arasındaki boydan. `,`Growth velocity from height ${fd(vel.from)} → ${fd(vel.to)}. `)}
      </div>
      <div className="help phv-note">{L('Bu bir tahmindir (Mirwald 2002): tipik hata yaklaşık ±1 yıl, çok erken ve çok geç gelişenlerde daha fazla. PHV civarındaki sporcuda 6-12 ayda bir yeniden ölç; tek bir sayıyla yük, seçme ya da yarışma kararı verme.','This is an estimate (Mirwald 2002): typical error is about ±1 year and larger in very early and very late maturers. Re-measure every 6-12 months around PHV; do not decide load, selection or competition from a single number.')}</div>
      {p.status.id==='circa'&&<div className="help phv-note" style={{color:'var(--warn,#f97316)'}}>{L('PHV civarında kemik büyümesi kas-tendon uyumunu geçebilir: apofiz bölgeleri (diz önü, topuk) için ağrıyı yakından izle, ani sıçrama/sprint hacim artışlarından kaçın ve esneklik/mobiliteyi sık kontrol et.','Around PHV bone growth can outrun muscle-tendon adaptation: watch apophyseal sites (anterior knee, heel) closely, avoid sudden jump/sprint volume jumps and re-check flexibility often.')}</div>}
    </>:<div className="empty-st" style={{margin:0}}>
      {why[p.why]||''}
      {vel&&<div className="help" style={{marginTop:6}}>{L(`Büyüme hızı: ${vel.cmPerYear} cm/yıl (${fd(vel.from)} → ${fd(vel.to)})`,`Growth velocity: ${vel.cmPerYear} cm/y (${fd(vel.from)} → ${fd(vel.to)})`)}</div>}
    </div>}
  </div>);
}
