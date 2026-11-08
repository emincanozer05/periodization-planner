/* ═══════════════════════════════════════════════════════════════════════════
   SPORCU İZLEME — Wellness sporcu sayfasının en altındaki bölüm (eski "Uyku ve HRV"nin yeri)

   CoachOS revizyon talimatı v1.4'ün arayüzü; hesapların hepsi 424 (monBuild, monEval …),
   parametreler 423 (MON_CFG). Sayfanın seçili günü değerlendirme günüdür.

   Üç kategori birbirine TOPLANMAZ; tek skor, ortak renk ya da ortak sıralama yok:
     A  Sağlık uyarıları       yalnızca ağrı ve aktif sakatlık kaydından
     B  Yük ve performans      günlük / 7 günlük / 28 günlük yük, monotoni, strain, ACWR
                               (EWMA; standart ↔ uyarlanmış ayrımı), maruziyet — sağlık bulgusu değil
     C  Toparlanma             uyku süresi ve kalitesi, her wellness maddesi ayrı
   ve uyarı üretmeyen bir bağlam kartı (sakatlık geçmişi, büyüme). Her gösterge değeri,
   kişisel referansı, yöntem etiketini ve üç ayrı durumu (doluluk · hesaplanabilirlik ·
   güvenilirlik) birlikte taşır. Referansı yetersiz göstergede z, sapma vurgusu ve eğilim
   etiketi gösterilmez; yalnızca ham değişim. Renkler nötr: risk anlamlı yeşil-sarı-kırmızı yok.
   Gece verisi formu (uykuya dalış / uyanma, elle) eski bölümden buraya taşındı.
   ═══════════════════════════════════════════════════════════════════════════ */
const MON_CODE=()=>({
  KAYIT_YOK:L('Bu gün kayıt yok','No record on this day'),
  DOGRULAMA_BEKLIYOR:L('Doğrulama bekleyen kayıt','Record awaiting verification'),
  AKIS_ONCESI:L('Yük akışı başlamadan önce','Before the load stream began'),
  SEANS_YUKU_YOK:L('Takvimde seans var, RPE / AU yok','Session on the calendar, no RPE / AU'),
  PENCERE_EKSIK:L('Pencerede eksik gün','Missing days in the window'),
  REFERANS_YETERSIZ:L('Referans yetersiz','Reference insufficient'),
  YETERSIZ_GOZLEM:L('Yetersiz gözlem','Too few observations'),
  RHO_KESTIRILEMEDI:L('Otokorelasyon kestirilemedi (bitişik gün çifti az)','Autocorrelation not estimable (few adjacent days)'),
  NEFF_DUSUK:L('Etkin örneklem düşük','Effective sample too small'),
  DINLENME_GUNU:L('Dinlenme günü — günlük yük z-skoru hesaplanmaz','Rest day — no daily-load z-score'),
  YUK_YOK:L('Pencerede yük yok','No load in the window'),
  SS_SIFIR:L('SS sıfır — monotoni hesaplanamıyor','SD is zero — monotony not computable'),
  GOZLENMEMIS_AGIRLIK_YUKSEK:L('Gözlenmemiş ağırlık yüksek','Unobserved weight too high'),
  KRONIK_YUK_SIFIR:L('Kronik yük sıfıra yakın','Chronic load near zero'),
  YETERSIZ_HAFTA:L('Tam bilinen önceki hafta yetersiz','Too few fully known previous weeks'),
  ONCEKI_YUK_SIFIR:L('Önceki haftaların yükü sıfır','Previous weeks carry no load'),
  GEREKLI_ALAN_YOK:L('Gerekli alan yok','Required field missing'),
  YAS_ARALIGI_DISI:L('Yöntemin yaş aralığı dışında','Outside the method’s age range'),
  YETERSIZ_OLCUM:L('Yetersiz ölçüm','Too few measurements'),
  YETERSIZ_ARALIK:L('Ölçümler arası süre yetersiz','Measurements too close together'),
  UC_NOKTA_GECERSIZ:L('Uç noktalardan biri geçersiz','An end point is invalid'),
});
const monCode=c=>MON_CODE()[c]||c;
const MON_IND_LBL=()=>({
  sleepH:L('Uyku süresi','Sleep duration'),sleepQ:L('Uyku kalitesi','Sleep quality'),
  mental:L('Zihinsel yorgunluk / stres','Mental fatigue / stress'),physical:L('Fiziksel yorgunluk','Physical fatigue'),
  soreness:L('Kas ağrısı (wellness maddesi)','Muscle soreness (wellness item)'),
  load:L('Günlük yük','Daily load'),load7:L('7 günlük toplam yük','7-day total load'),mono:L('Monotoni','Monotony'),
  strain:'Strain',expo7:L('7 günlük maruziyet','7-day exposure'),acwr:'ACWR (EWMA)',
});
const MON_PAIN_SEV=()=>({5:L('hiç ağrı yok','no pain'),4:L('hafif','mild'),3:L('orta','moderate'),2:L('şiddetli','severe'),1:L('çok şiddetli','very severe'),unk:L('şiddet bilinmiyor','severity unknown')});
const MON_RULE=()=>({
  G1:L('G1 · ölçeğin tanımlı aralığı dışında','G1 · outside the scale'),G2:L('G2 · negatif ya da 1440 dk üstü süre/yük','G2 · negative or >1440 min duration/load'),
  G3:L('G3 · uyku süresi 0-24 sa dışında','G3 · sleep outside 0-24 h'),G4:L('G4 · süre ile RPE tutarsız','G4 · duration and RPE inconsistent'),
  G5:L('G5 · kayıt tarihi gelecekte','G5 · record dated in the future'),G6:L('G6 · boy/kilo mantıksal aralık dışında','G6 · height/mass outside logical range'),
});
const MON_FIELD=()=>({sleepQ:L('Uyku kalitesi','Sleep quality'),mental:L('Zihinsel yorgunluk','Mental fatigue'),physical:L('Fiziksel yorgunluk','Physical fatigue'),
  soreness:L('Kas ağrısı','Soreness'),sleepH:L('Uyku süresi','Sleep duration'),pain:L('Ağrı bölgesi','Pain region'),
  srpe_tp:L('sRPE · top antrenmanı','sRPE · team practice'),srpe_sc:L('sRPE · kuvvet & kondisyon','sRPE · S&C'),srpe_game:L('sRPE · müsabaka','sRPE · match'),
  srpe_total:L('sRPE · toplam yük','sRPE · total load'),srpe_gun:L('sRPE · gün toplamı','sRPE · day total'),height:L('Boy','Height'),weight:L('Kilo','Body mass')});
const MON_SRC=()=>({oz_bildirim:L('öz bildirim (check-in)','self-report (check-in)'),elle:L('elle gece kaydı','manual night log'),cihaz:L('cihaz tahmini (Polar)','device estimate (Polar)'),
  srpe:L('öz bildirim (sRPE)','self-report (sRPE)'),takvim:L('takvim AU (koç)','calendar AU (coach)'),takvim_seanssiz:L('takvimde seans yok → dinlenme','no session on calendar → rest')});
const MON_NOTE_B=()=>L('Bu bir yük/performans göstergesidir; tek başına sağlık bulgusu değildir.','This is a load/performance indicator; on its own it is not a health finding.');
const MON_DISCLAIMER=()=>L('Bu ekran sakatlık tahmini veya teşhis içermez. Kişisel geçmişe göre sapmaları, yük değişimlerini ve sağlık değerlendirmesi gerektirebilecek bildirimleri ayrı ayrı gösterir.',
  'This screen contains no injury prediction or diagnosis. It shows deviations from the athlete’s own history, load changes and reports that may call for a health assessment — each on its own.');
const MON_TREND_TIP=()=>L('Bu bir gösterim ayarıdır (yapılandırılabilir); sakatlık riski eşiği değildir.','This is a display setting (configurable); it is not an injury-risk threshold.');

/* ---- sayı biçimleri ---- */
const monLoc=()=>L('tr-TR','en-US');
const monN=(v,d)=>v==null||!isFinite(v)?'—':Number(v).toLocaleString(monLoc(),{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const monSigned=(v,d)=>v==null||!isFinite(v)?'—':(v>0?'+':v<0?'−':'')+monN(Math.abs(v),d);
const monHm=h=>{if(h==null||!isFinite(h))return'—';const m=Math.round(Math.abs(h)*60);return L(`${Math.floor(m/60)} sa ${String(m%60).padStart(2,'0')} dk`,`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} m`);};
/* Göstergenin kendi biriminde değer. */
function monVal(id,v,signed){
  if(v==null||!isFinite(v))return'—';
  const sg=signed&&v!==0?(v>0?'+':'−'):'';const a=signed?Math.abs(v):v;
  switch(id){
    case'sleepH':return sg+monHm(a);
    case'sleepQ':case'mental':case'physical':case'soreness':return sg+monN(a,Number.isInteger(a)?0:1);
    case'load':case'load7':case'strain':return sg+monN(a,0)+' AU';
    case'mono':return sg+monN(a,2);
    case'expo7':return sg+monHm(a/60);
    default:return sg+monN(a,2);
  }
}
/* Birimli fark (ham birim): uyku dakika, ölçek puan. */
function monDiff(id,v){
  if(v==null||!isFinite(v))return'—';
  if(id==='sleepH')return monSigned(v*60,0)+L(' dk',' min');
  if(['sleepQ','mental','physical','soreness'].includes(id))return monSigned(v,1)+L(' puan',' pt');
  if(id==='expo7')return monSigned(v,0)+L(' dk',' min');
  if(id==='mono')return monSigned(v,2);
  return monSigned(v,0)+' AU';
}
const monUnitPerDay=id=>id==='sleepH'?L('dk/gün','min/day'):['sleepQ','mental','physical','soreness'].includes(id)?L('puan/gün','pt/day'):L('AU/gün','AU/day');

/* ---- küçük parçalar ---- */
function MonChip({kind,children,title}){return<span className={'mon-chip'+(kind?' '+kind:'')} title={title}>{children}</span>;}
/* z'nin kişisel aralıktaki yeri: −3…+3 ekseninde nötr gölge (± gösterim eşiği) ve işaret. */
function MonZBar({z,thr}){
  const c=Math.max(-3,Math.min(3,z)),x=(c+3)/6*100,t=thr/6*100;
  return<div className="mon-zbar" role="img" aria-label={`z ${monN(z,2)}`}>
    <i className="band" style={{left:`${50-t}%`,width:`${2*t}%`}}/><i className="mid"/>
    <i className={'mk'+(Math.abs(z)>=thr?' out':'')} style={{left:`${x}%`}}/>
  </div>;
}
/* Ham modun mini grafiği: x ekseni takvim günü (boşluklar zaman-doğru kalır). */
function MonSpark({seri,h}){
  const ref=useRef(null);const W=useElW(ref,160);const H=h||34,p=4;
  if(!seri||seri.length<2)return<div ref={ref} className="mon-spark none"/>;
  const xs=seri.map(s=>monDN(s.tarih)),ys=seri.map(s=>s.v);
  const x0=Math.min(...xs),x1=Math.max(...xs);let y0=Math.min(...ys),y1=Math.max(...ys);if(y0===y1){y0-=1;y1+=1;}
  const X=x=>p+(x1===x0?0:(x-x0)/(x1-x0))*(W-2*p),Y=y=>p+(1-(y-y0)/(y1-y0))*(H-2*p);
  return<div ref={ref} className="mon-spark"><svg width={W} height={H} aria-hidden="true">
    <path d={seri.map((s,i)=>`${i?'L':'M'}${X(xs[i]).toFixed(1)} ${Y(ys[i]).toFixed(1)}`).join(' ')} className="ln"/>
    {seri.map((s,i)=><circle key={s.tarih} cx={X(xs[i])} cy={Y(ys[i])} r="2.2" className="pt"><title>{fd(s.tarih)}</title></circle>)}
  </svg></div>;
}
/* Üç ayrı durum satırı: doluluk · hesaplanabilirlik · ölçüm güvenilirliği (birleşik "güven" yok). */
function MonStatusLine({st}){
  const g=st.guvenilirlik;
  const rel=g.isaret.length?L('İşaret(ler) var: ','Flag(s): ')+g.isaret.map(x=>x.kod).join(', ')
    :L('Belirgin sorun saptanmadı','No clear issue found');
  const relTip=L('"Belirgin sorun saptanmadı", ölçümün doğrulanmış güvenilir olduğu anlamına gelmez.','"No clear issue found" does not mean the measurement is verified reliable.');
  return<div className="mon-st">
    <span title={L('Son 28 günde geçerli kayıt','Valid records in the last 28 days')}><em>{L('Doluluk','Completeness')}</em>{st.doluluk.gecerli}/{st.doluluk.toplam}{st.doluluk.bekleyen?L(` · doğrulama bekleyen: ${st.doluluk.bekleyen}`,` · awaiting verification: ${st.doluluk.bekleyen}`):''}</span>
    <span><em>{L('Hesaplanabilirlik','Computability')}</em>{st.hesaplanabilirlik.durum==='Hesaplanabilir'?L('Hesaplanabilir','Computable'):L('Hesaplanamıyor','Not computable')}
      {st.hesaplanabilirlik.kodlar.length>0&&<code>{st.hesaplanabilirlik.kodlar.join(' · ')}</code>}</span>
    <span title={relTip}><em>{L('Güvenilirlik','Reliability')}</em>{rel}{g.degerlendirilemiyor.length>0&&<small>{' · '+g.degerlendirilemiyor.join(', ')+L(' değerlendirilemiyor',' not assessable')}</small>}</span>
  </div>;
}
/* Bir gösterge satırı: değer, kişisel referans + z (yeterliyse) ya da ham değişim (yetersizse). */
function MonIndRow({M,r,cfg,i}){
  const lbl=MON_IND_LBL()[r.id],st=monStatus(M,r.id,r.olcek,r.n),ref=r.ref;
  const win=r.olcek!=='gunluk';
  const unitTag=win?L(`${cfg.Z_PENCERE_K} günlük`,`${cfg.Z_PENCERE_K}-day`):L('günlük','daily');
  const reasons=r.kodlar.filter(c=>c!=='REFERANS_YETERSIZ');
  return<div className="mon-ind" style={{animationDelay:(i||0)*40+'ms'}}>
    <div className="mon-ind-h">
      <div className="mon-ind-t"><b>{lbl}</b><span>{unitTag}{r.deger.typ&&r.id==='load'?` · ${r.deger.typ==='mac'?L('maç günü','match day'):r.deger.typ==='antrenman'?L('antrenman günü','training day'):L('dinlenme','rest')}`:''}</span></div>
      <div className="mon-ind-v">{r.deger.ok?monVal(r.id,r.deger.v):<span className="mon-na">{monCode(r.deger.neden)}</span>}</div>
    </div>
    {r.hesaplanabilir?<div className="mon-ref">
      <div className="mon-ref-l">
        <span>{L('Kişisel referans','Personal reference')} <b>{monVal(r.id,ref.ort)}</b> ± {monVal(r.id,Math.max(ref.ss,r.sigmaMin)).replace(/^\+/,'')}</span>
        <small>{win?L(`${ref.n} pencere · D_ref ${ref.dRef} gün`,`${ref.n} windows · D_ref ${ref.dRef} d`):L(`n ${ref.n} · ρ̂ ${monN(ref.rhoHat,2)}`,`n ${ref.n} · ρ̂ ${monN(ref.rhoHat,2)}`)} · n_eff {monN(ref.neff,1)} · {L('SS göreli hata ≈ ','SD rel. error ≈ ')}%{monN(r.ssGoreliHata*100,0)}{ref.ss<r.sigmaMin?L(' · σ_min kullanıldı',' · σ_min used'):''}</small>
      </div>
      <div className="mon-ref-z">
        <MonZBar z={r.z} thr={cfg.GOSTERIM_Z_ESIGI}/>
        <span className="mon-z" title={L('Kişisel sapma — olasılık ya da p-değeri değildir.','Personal deviation — not a probability or p-value.')}>z {monSigned(r.z,2)}</span>
      </div>
      <div className="mon-tags">
        {r.sapma&&<MonChip kind="dev" title={L(`Gösterim eşiği |z| ≥ ${monN(cfg.GOSTERIM_Z_ESIGI,1)} (yapılandırılabilir); risk eşiği değildir.`,`Display threshold |z| ≥ ${monN(cfg.GOSTERIM_Z_ESIGI,1)} (configurable); not a risk threshold.`)}>
          {r.sapma==='ustunde'?L('Kişisel aralığın üstünde','Above personal range'):L('Kişisel aralığın altında','Below personal range')}</MonChip>}
        {r.egilim&&r.egilim.etiket&&<MonChip kind="trend" title={MON_TREND_TIP()}>{L('Olumsuz eğilim (kişisel referansa göre)','Negative trend (vs personal reference)')}
          <em>{L(`${r.egilim.r} gün · ort. ${monN(r.egilim.ort,2)} SS · ${monDiff(r.id,r.egilim.hamFark)}/gün`,`${r.egilim.r} d · mean ${monN(r.egilim.ort,2)} SD · ${monDiff(r.id,r.egilim.hamFark)}/day`)}</em></MonChip>}
        {r.egilim&&!r.egilim.etiket&&r.egilim.r>0&&<MonChip kind="soft" title={MON_TREND_TIP()}>{L(`Gün sapması: ${r.egilim.r} gün, birikimli ${monN(r.egilim.C,2)} SS`,`Day deviation: ${r.egilim.r} d, cumulative ${monN(r.egilim.C,2)} SD`)}</MonChip>}
      </div>
    </div>:<div className="mon-raw">
      <div className="mon-raw-h"><MonChip kind="ins">{L('Referans yetersiz','Reference insufficient')}</MonChip>
        <span>{L('ham değişim; referans yetersiz','raw change; reference insufficient')}{reasons.length?' · '+reasons.map(monCode).join(' · '):''}</span></div>
      {r.ham&&r.ham.yeterli?(r.ham.ma?<div className="mon-raw-g">
        <div><em>{L('Son geçerli','Latest valid')}</em><b>{monVal(r.id,r.ham.son.v)}</b><small>{fd(r.ham.son.tarih)} · {L('öncekine göre','vs previous')} {monDiff(r.id,r.ham.fark)}</small></div>
        {cfg.PENCERE_K.map(k=>{const m=r.ham.ma[k];return<div key={k}><em>{L(`${k} gün ort.`,`${k}-day mean`)}</em><b>{m.v!=null?monVal(r.id,m.v):'—'}</b>
          <small>{m.v==null?monCode(m.neden):m.fark!=null?`${monDiff(r.id,m.fark)}${m.yuzde!=null?` · ${monSigned(m.yuzde,0)}%`:''}`:L('önceki pencere yok','no previous window')}</small></div>;})}
        <div><em>{L('Eğim','Slope')}</em><b>{r.ham.egim!=null?(r.id==='sleepH'?monSigned(r.ham.egim*60,1):monSigned(r.ham.egim,2)):'—'}</b><small>{r.ham.egim!=null?monUnitPerDay(r.id)+L(` · ${r.ham.egimNokta} geçerli gün`,` · ${r.ham.egimNokta} valid days`):L(`en az ${cfg.HAM_EGILIM_MIN_NOKTA} geçerli gün`,`at least ${cfg.HAM_EGILIM_MIN_NOKTA} valid days`)}</small></div>
        <MonSpark seri={r.ham.seri}/>
      </div>:<div className="mon-raw-g">
        <div><em>{L('Bu pencere','This window')}</em><b>{monVal(r.id,r.ham.son)}</b></div>
        <div><em>{L('Önceki pencere','Previous window')}</em><b>{monVal(r.id,r.ham.onceki)}</b><small>{r.ham.fark!=null?`${monDiff(r.id,r.ham.fark)}${r.ham.yuzde!=null?` · ${monSigned(r.ham.yuzde,0)}%`:''}`:'—'}</small></div>
      </div>):<div className="mon-raw-none">{L('Ham değişim için en az 2 geçerli gözlem gerekiyor.','Raw change needs at least 2 valid observations.')}</div>}
    </div>}
    <MonStatusLine st={st}/>
  </div>;
}

/* ---- A · Sağlık uyarıları ---- */
function MonPanelA({M,S,n,growth,cfg}){
  const sev=MON_PAIN_SEV(),P=S.pain;
  const tl=monPainTimeline(M,n,cfg.AGRI_ZAMAN_CIZELGESI_GUN);
  const apo=r=>growth&&growth.yas!=null&&growth.yas<=cfg.PHV_YAS[1]+1&&cfg.APOFIZ_BOLGE.some(k=>String(r).toLocaleLowerCase('tr').includes(k));
  const txt=b=>{switch(b.kod){
    case'AGRISIZ':return L('Ağrısız gün','Pain-free day');
    case'YENI_AGRI':return L('Yeni ağrı bildirimi (önceki kayıt: ağrısız)','New pain report (previous record: pain-free)');
    case'YENI_BILDIRILEN':return L('Yeni bildirilen ağrı (başlangıç zamanı bilinmiyor)','Newly reported pain (onset unknown)');
    case'ARTIS':return L(`Ağrıda artış (önceki: ${b.onceki} → bugün: ${b.bugun})`,`Pain increased (previous: ${b.onceki} → today: ${b.bugun})`);
    case'DEVAM':return L('Önceki kayıtla aynı şiddette ağrı','Pain at the same severity as the previous record');
    case'AZALMA':return L('Önceki kayda göre azalış','Lower than the previous record');
    case'AGRISIZLIGA_DONUS':return L('Ağrısız gün bildirildi','Pain-free day reported');
    case'DEVAM_SIDDET_BILINMIYOR':return L('Ağrı sürüyor (şiddet derecelendirilmemiş)','Pain continues (severity not graded)');
    default:return L('Kayıt yok','No record');}};
  const act=S.injuries.filter(i=>i.aktif);
  return<div className="panel mon-p mon-a">
    <div className="mon-ph"><div><h2>{L('Sağlık uyarıları','Health alerts')}</h2><span>{L('Kategori A · yalnızca ağrı ve aktif sakatlık kaydından','Category A · from pain and active injury records only')}</span></div>
      <span className="mon-cnt" data-on={S.A.length?'1':'0'}>{S.A.length}</span></div>
    {act.map(i=><div key={i.id||i.tarih} className="mon-alert">
      <i aria-hidden="true">!</i><div><b>{L('Aktif sakatlık / kısıt kaydı var; sağlık değerlendirmesi önerilir.','Active injury / restriction record; a health assessment is advised.')}</b>
        <span>{[i.taraf&&({Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral')}[i.taraf]||''),i.yer,i.tip].filter(Boolean).join(' · ')||L('bölge belirtilmemiş','region not given')}
          {i.tarih?L(` · ${fd(i.tarih)} tarihli kayıt`,` · recorded ${fd(i.tarih)}`):''}{i.derece?L(` · derece ${i.derece}`,` · grade ${i.derece}`):''}</span></div></div>)}
    {!P.kayit?<div className="mon-empty">{L('Bu gün check-in yok: ağrı durumu bilinmiyor (ağrısız sayılmaz).','No check-in on this day: pain status unknown (not counted as pain-free).')}</div>
    :P.bolgeler.length===0?<div className="mon-empty ok">{L('Ağrısız gün — check-in gönderildi, bölge işaretlenmedi (5 · hiç ağrı yok).','Pain-free day — check-in sent, no region marked (5 · no pain).')}</div>
    :<div className="mon-pain">{P.bolgeler.map(b=><div key={b.bolge} className={'mon-pr'+(b.uyari?' al':'')}>
      {b.uyari?<i className="mon-pr-i" aria-hidden="true">!</i>:<i className="mon-pr-i n" aria-hidden="true"/>}
      <div className="mon-pr-t"><b>{b.bolge===PAIN_REGION_UNKNOWN?L('Bölge adı gelmedi','Region not named'):painRegionShort(b.bolge)}</b>
        <span>{txt(b)}{b.bugun!==monPainFree(cfg)&&b.bugun!=null?` · ${L('bugün','today')} ${b.bugun==='unk'?sev.unk:`${b.bugun} (${sev[b.bugun]})`}`:''}</span>
        {b.sureGun!=null&&b.bugun!==monPainFree(cfg)&&<small>{L(`İlk bildirim ${fd(b.ilkBildirim)} · ${b.sureGun} gün`,`First reported ${fd(b.ilkBildirim)} · ${b.sureGun} d`)}</small>}
        {b.uyari&&<small className="mon-pr-adv">{L('Sağlık profesyoneli değerlendirmesi önerilir.','A health professional’s assessment is advised.')}{apo(b.bolge)?L(' Büyüme dönemiyle ilişkili olabilen bölge; sağlık profesyoneli değerlendirmesi önerilir.',' A region that can relate to growth; a health professional’s assessment is advised.'):''}</small>}
      </div>
      <span className="mon-pr-v">{b.bugun==null?'—':b.bugun==='unk'?'?':b.bugun}<small>/5</small></span>
    </div>)}</div>}
    {P.not&&<div className="mon-pnote">“{P.not}”</div>}
    {tl.satirlar.length>0&&<div className="mon-tl">
      <div className="mon-tl-k">{L(`Son ${cfg.AGRI_ZAMAN_CIZELGESI_GUN} gün · bölge zaman çizelgesi (5 hiç ağrı yok … 1 çok şiddetli; boş = kayıt yok)`,`Last ${cfg.AGRI_ZAMAN_CIZELGESI_GUN} days · region timeline (5 no pain … 1 very severe; blank = no record)`)}</div>
      <div className="mon-tl-w"><table className="mon-tl-t"><thead><tr><th/>{tl.gunler.map(k=><th key={k} className={k===monKey(n)?'on':''}>{parseD(k).getDate()}</th>)}</tr></thead>
        <tbody>{tl.satirlar.map(s=><tr key={s.bolge}><td className="rg">{painRegionShort(s.bolge)}</td>
          {s.degerler.map((v,j)=><td key={j} className={'c'+(v==null?' na':v===monPainFree(cfg)?' free':v==='G'?' g':' p'+(v==='unk'?'u':v))}
            title={`${fd(tl.gunler[j])} · ${v==null?L('kayıt yok','no record'):v==='G'?L('geçersiz (doğrulama bekliyor)','invalid (awaiting verification)'):v==='unk'?sev.unk:`${v} · ${sev[v]}`}`}>
            {v==null?'':v==='unk'?'?':v===monPainFree(cfg)?'·':v}</td>)}</tr>)}</tbody></table></div>
    </div>}
    <div className="mon-foot">{L('5 (ağrısız gün) tek başına uyarı üretmez; azalma ve ağrısızlığa dönüş bilgi düzeyindedir; kayıt yok uyarı üretmez. Gece/dinlenme ağrısı, ağrının süresi/hareketle davranışı ve "ağrı nedeniyle katılım değişti" için veri modelinde alan yok (GEREKLI_ALAN_YOK). Ağrı uyarısı yük, ACWR ya da wellness sapmasından tetiklenmez.',
      '5 (pain-free) alone raises no alert; a decrease and a return to pain-free are information only; no record raises no alert. Night/rest pain, pain duration/behaviour with movement and "participation changed due to pain" have no field in the data model (GEREKLI_ALAN_YOK). A pain alert is never triggered by load, ACWR or wellness deviation.')}</div>
  </div>;
}

/* ---- B · ACWR / EWMA grafiği: nötr renk, bölge boyaması yok, geçersiz günde çizgi kesik ---- */
function MonAcwrChart({LM,n,cfg}){
  const ref=useRef(null);const W=useElW(ref,640);
  const[hov,setHov]=useState(null);
  const days=cfg.ACWR_GRAFIK_GUN;
  const pts=[];for(let j=n-days+1;j<=n;j++){const i=LM.byN.get(j);pts.push(i==null?{n:j,tarih:monKey(j),none:true}:LM.points[i]);}
  const H1=150,H2=96,gap=16,pl=46,pr=12,pt=10,pb=22,H=H1+gap+H2+pb;
  const vals=[];pts.forEach(p=>{if(p.none)return;['akut','kronik'].forEach(f=>{if(p[f].gecerli)vals.push(p[f].deger);});});
  const rv=pts.filter(p=>!p.none&&p.acwr.gecerli).map(p=>p.acwr.deger);
  if(!vals.length&&!rv.length)return<div ref={ref} className="mon-chart-none">{L('Bu aralıkta geçerli EWMA noktası yok: akut için ilk geçerli gün akışın 9., kronik için 33. günü (eksik gün yokken).','No valid EWMA point in this range: the first valid acute day is day 9 of the stream, chronic day 33 (with no missing day).')}</div>;
  const nice=(lo,hi)=>{if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.12;return[Math.max(0,lo-pad),hi+pad];};
  const[a0,a1]=vals.length?nice(Math.min(...vals),Math.max(...vals)):[0,1];
  const[r0,r1]=rv.length?nice(Math.min(...rv),Math.max(...rv)):[0,2];
  const X=i=>pl+(pts.length<=1?0:i*(W-pl-pr)/(pts.length-1));
  const Y1=v=>pt+(1-(v-a0)/(a1-a0))*(H1-pt),Y2=v=>H1+gap+(1-(v-r0)/(r1-r0))*H2;
  /* Aynı yöntemli ardışık geçerli noktalar bir parça: standart düz, uyarlanmış kesikli. */
  const segs=(f,Y)=>{const out=[];let cur=null;
    pts.forEach((p,i)=>{const q=p.none?null:p[f];
      if(!q||!q.gecerli){cur=null;return;}
      if(!cur||cur.y!==q.yontem){cur={y:q.yontem,d:(cur&&cur.last!=null?`M${X(cur.last).toFixed(1)} ${Y(cur.lv).toFixed(1)} L`:'M')+`${X(i).toFixed(1)} ${Y(q.deger).toFixed(1)}`,last:i,lv:q.deger};out.push(cur);}
      else{cur.d+=` L${X(i).toFixed(1)} ${Y(q.deger).toFixed(1)}`;cur.last=i;cur.lv=q.deger;}});
    return out;};
  const trans=[...LM.gecisler.akut,...LM.gecisler.kronik,...LM.gecisler.acwr];
  const tByDate={};trans.forEach(t=>{(tByDate[t.tarih]=tByDate[t.tarih]||[]).push(t);});
  const every=Math.max(1,Math.ceil(pts.length/8));
  const tk=(lo,hi)=>[lo,(lo+hi)/2,hi];
  const hp=hov!=null?pts[hov]:null;
  const line=(f,Y,cls)=>segs(f,Y).map((s,k)=><path key={f+k} d={s.d} className={`mon-ln ${cls}${s.y==='UYARLANMIS'?' adj':''}`}/>);
  const ex=q=>q.gecerli?`${f2(q.deger)} · ${q.yontem==='STANDART'?L('standart','standard'):L('uyarlanmış','adjusted')}`:`— · ${monCode(q.neden)}`;
  const f2=v=>monN(v,v>=10?0:2);
  return<div ref={ref} className="mon-chart" onMouseLeave={()=>setHov(null)}>
    <svg width={W} height={H} role="img" aria-label={L('Akut ve kronik EWMA ile ACWR','Acute and chronic EWMA with ACWR')}>
      {tk(a0,a1).map((t,i)=><g key={'a'+i}><line x1={pl} x2={W-pr} y1={Y1(t)} y2={Y1(t)} className="mon-gl"/><text x={pl-6} y={Y1(t)+3.5} textAnchor="end" className="mon-ax">{monN(t,0)}</text></g>)}
      {tk(r0,r1).map((t,i)=><g key={'r'+i}><line x1={pl} x2={W-pr} y1={Y2(t)} y2={Y2(t)} className="mon-gl"/><text x={pl-6} y={Y2(t)+3.5} textAnchor="end" className="mon-ax">{monN(t,2)}</text></g>)}
      <text x={pl} y={H1+gap-4} className="mon-ax lbl">ACWR</text>
      <text x={pl} y={pt-1} className="mon-ax lbl">EWMA · AU</text>
      {pts.map((p,i)=>tByDate[p.tarih]?<g key={'t'+i} className="mon-tr">
        <line x1={X(i)} x2={X(i)} y1={pt} y2={H1+gap+H2}/>
        <title>{L('Hesaplama yöntemi değişti','Calculation method changed')+' ('+tByDate[p.tarih].map(t=>t.yon.replace('STANDART',L('Standart','Standard')).replace('UYARLANMIS',L('Uyarlanmış','Adjusted'))).filter((v,j,a)=>a.indexOf(v)===j).join(', ')+'). '+L('Bu noktadaki değişimin bir kısmı yöntemden kaynaklanabilir.','Part of the change at this point may come from the method.')}</title></g>:null)}
      {line('kronik',Y1,'chr')}{line('akut',Y1,'acu')}{line('acwr',Y2,'rat')}
      {pts.map((p,i)=>(i%every===0||i===pts.length-1)?<text key={'x'+i} x={X(i)} y={H-6} textAnchor="middle" className="mon-ax">{fd(p.tarih).slice(0,5)}</text>:null)}
      {hp&&<line x1={X(hov)} x2={X(hov)} y1={pt} y2={H1+gap+H2} className="mon-hov"/>}
      {pts.map((p,i)=><rect key={'h'+i} x={X(i)-(W-pl-pr)/pts.length/2} y={0} width={(W-pl-pr)/pts.length} height={H} fill="transparent" onMouseEnter={()=>setHov(i)} onClick={()=>setHov(i)}/>)}
    </svg>
    {hp&&<div className="mon-tip" style={{left:Math.min(Math.max(X(hov)-110,0),W-230)}}>
      <b>{fd(hp.tarih)}</b>
      {hp.none?<span>{L('Yük akışı başlamadan önce','Before the load stream began')}</span>:<>
        <span>{L('Akut','Acute')}: {ex(hp.akut)}</span><span>{L('Kronik','Chronic')}: {ex(hp.kronik)}</span><span>ACWR: {ex(hp.acwr)}</span>
        <small>{L('başlangıç payı','start share')} {monN(hp.kronik.baslangic_payi,3)} · {L('eksik payı','missing share')} {monN(hp.kronik.eksik_payi,3)} ({L('kronik','chronic')})</small>
        {tByDate[hp.tarih]&&tByDate[hp.tarih].map((t,j)=><small key={j} className="tr">{L('Yöntem değişti','Method changed')} · {t.yon} · {L('gösterilen','shown')} {monSigned(t.gosterilen,3)} = {L('tutarlı','consistent')} {monSigned(t.tutarli,3)} + {L('yapay','artificial')} {monSigned(t.yapay,3)}</small>)}
      </>}
    </div>}
    <div className="mon-leg">
      <span><i className="l acu"/>{L('Akut EWMA','Acute EWMA')}</span><span><i className="l chr"/>{L('Kronik EWMA','Chronic EWMA')}</span><span><i className="l rat"/>ACWR</span>
      <span><i className="l st"/>{L('standart','standard')}</span><span><i className="l ad"/>{L('uyarlanmış (eksik veri içeren dönem)','adjusted (period with missing data)')}</span>
      <span><i className="l tr"/>{L('yöntem değişti','method changed')}</span>
    </div>
  </div>;
}
function MonPanelB({M,S,n,cfg}){
  const LM=monLoadModel(M);
  const pi=LM.byN.get(n),p=pi!=null?LM.points[pi]:null;
  const back=cfg.HAFTA_GUN,pb=pi!=null&&pi-back>=0?pi-back:null;
  const ch=p&&pb!=null?monEwmaChange(LM.points.map(x=>x.acwr),pb,pi):null;
  const wk=monWeekly(M.S.load,n,cfg),w28=monWin(M.S.load,n,cfg.YUK_UZUN_GUN,'sum',cfg);
  const exT=monWin(M.S.expTrain,n,cfg.HAFTA_GUN,'sum',cfg),exM=monWin(M.S.expMatch,n,cfg.HAFTA_GUN,'sum',cfg),exW=monWeekly(M.S.expTotal,n,cfg);
  const tog=S.birlikteB;
  const cell=(k,v,sub,tip)=><div className="mon-tile" title={tip}><em>{k}</em><b>{v}</b>{sub&&<small>{sub}</small>}</div>;
  const ew=q=>q&&q.gecerli?monN(q.deger,q.deger>=10?0:2):'—';
  const meth=q=>!q?'':q.gecerli?(q.yontem==='STANDART'?L('STANDART','STANDARD'):L('UYARLANMIŞ','ADJUSTED')):monCode(q.neden);
  return<div className="panel mon-p mon-b">
    <div className="mon-ph"><div><h2>{L('Yük ve performans','Load and performance')}</h2><span>{L('Kategori B · antrenman yükü alanı (sRPE ve ACWR aynı yük verisinden)','Category B · training load (sRPE and ACWR come from the same load data)')}</span></div>
      <span className="mon-tog" title={L('Yeterli referanslı göstergelerden kaçı aynı anda kişisel aralığın dışında (betimleyici sayı; olasılık değil).','How many adequately referenced indicators are outside the personal range at once (descriptive count; not a probability).')}>
        {L('Birlikte sapma','Co-deviation')} <b>{tog.sapan}/{tog.yeterli}</b>{tog.degerlendirilemedi?<small>{L(` · ${tog.degerlendirilemedi} gösterge değerlendirilemedi`,` · ${tog.degerlendirilemedi} not assessed`)}</small>:null}</span></div>
    <div className="mon-noteB">{MON_NOTE_B()}</div>
    <div className="mon-tiles">
      {cell('ACWR',ew(p&&p.acwr),p?meth(p.acwr):monCode('AKIS_ONCESI'),L('Akut EWMA / kronik EWMA. Sabit sınıflandırma yok; yük değişiminin yardımcı göstergesi, sağlık bulgusu değil.','Acute EWMA / chronic EWMA. No fixed classification; an auxiliary indicator of load change, not a health finding.'))}
      {cell(L('Akut / kronik EWMA','Acute / chronic EWMA'),p?`${ew(p.akut)} / ${ew(p.kronik)}`:'—',p?`${L('başlangıç','start')} ${monN(p.kronik.baslangic_payi,3)} · ${L('eksik','missing')} ${monN(p.kronik.eksik_payi,3)}`:'')}
      {cell(L(`ACWR · ${back} gün önceye göre`,`ACWR · vs ${back} days ago`),ch&&ch.ok?monSigned(ch.degisim,2):'—',ch?(ch.ok?(ch.gecis?L('Bu dönemde hesaplama yöntemi değişti; yöntem-tutarlı değişim','Method changed in this period; method-consistent change'):L('yöntem-tutarlı seri','method-consistent series')):monCode(ch.neden)):'')}
      {cell(L('Haftalık yük değişimi','Weekly load change'),wk.ok?monSigned(wk.yuzde,0)+'%':'—',wk.ok?L(`${monN(wk.v,0)} AU / önceki ${wk.tam} haftanın ort. ${monN(wk.ort,0)} AU`,`${monN(wk.v,0)} AU / mean of previous ${wk.tam} weeks ${monN(wk.ort,0)} AU`):monCode(wk.neden),L('Yüzde gösterilir; %10 ya da %20 artış otomatik uyarı tetiklemez.','Shown as a percentage; a 10% or 20% rise triggers no automatic alert.'))}
      {cell(L(`${cfg.YUK_UZUN_GUN} günlük toplam`,`${cfg.YUK_UZUN_GUN}-day total`),w28.ok?monN(w28.v,0)+' AU':'—',w28.ok?'':monCode(w28.neden))}
      {cell(L('Haftalık maruziyet','Weekly exposure'),exT.ok&&exM.ok?monHm((exT.v+exM.v)/60):'—',exT.ok&&exM.ok?L(`antrenman ${monHm(exT.v/60)} · maç ${monHm(exM.v/60)}${exW.ok?` · ${monSigned(exW.yuzde,0)}%`:''}`,`training ${monHm(exT.v/60)} · match ${monHm(exM.v/60)}${exW.ok?` · ${monSigned(exW.yuzde,0)}%`:''}`):monCode(exT.ok?exM.neden:exT.neden),
        L('Katılım durumu (tam / kısıtlı) için veri modelinde alan yok: bilinmiyor.','No field for participation status (full / restricted): unknown.'))}
    </div>
    <MonAcwrChart LM={LM} n={n} cfg={cfg}/>
    <div className="mon-inds">{S.B.map((r,i)=><MonIndRow key={r.id} M={M} r={r} cfg={cfg} i={i}/>)}</div>
    <div className="mon-foot">{L(`Doğrulanmış dinlenme günü takvimden: takvimde seans olmayan geçmiş gün 0 AU sayılır (son ${cfg.REFERANS_GUN} gün: ${(()=>{let c=0;for(let j=n-cfg.REFERANS_GUN+1;j<=n;j++)if(M.S.load.get(j).st==='dogrulanmis_yok')c++;return c;})()} gün). Takvimin kullanılmadığı dönemde yük olduğundan düşük görünebilir; uyarlanmış EWMA eksik günleri bilinenlerle benzer varsayar (sistematik eksik veride yanlı olabilir). Monotoni ve strain tek başına sakatlık tahmininde kullanılmaz.`,
      `Rest days are confirmed from the calendar: a past day with no session counts as 0 AU (last ${cfg.REFERANS_GUN} days: ${(()=>{let c=0;for(let j=n-cfg.REFERANS_GUN+1;j<=n;j++)if(M.S.load.get(j).st==='dogrulanmis_yok')c++;return c;})()} d). In a period without calendar use, load can read lower than it was; adjusted EWMA assumes missing days resemble known ones (it can be biased when data are missing systematically). Monotony and strain are never used alone to predict injury.`)}</div>
  </div>;
}

/* ---- C · Toparlanma ---- */
function MonSleepChart({M,n,cfg,ath}){
  const ref=useRef(null);const W=useElW(ref,600);
  const days=cfg.GRAFIK_GUN,H=150,pl=34,pr=10,pt=10,pb=22;
  const pts=[];for(let j=n-days+1;j<=n;j++){const d=M.S.sleepH.get(j);pts.push({n:j,st:d.st,v:monKnown(d)?d.v:null,src:d.src});}
  const age=M.growth.yas;
  const rec=age==null?null:(cfg.UYKU_YAS_ONERI.find(r=>age>=r.yas[0]&&age<r.yas[1]+1)||null);
  const r=monEval(M,'sleepH','gunluk',n);
  const vs=pts.filter(p=>p.v!=null).map(p=>p.v);
  if(!vs.length)return<div ref={ref} className="mon-chart-none">{L(`Son ${days} günde uyku süresi yok. Polar Loop bağlıysa uyku buraya kendiliğinden gelir; değilse aşağıdaki "+ Gece verisi" ile uykuya dalış ve uyanma saatini gir.`,`No sleep duration in the last ${days} days. With Polar Loop linked it arrives here by itself; otherwise enter bedtime and wake time with "+ Night data" below.`)}</div>;
  let lo=Math.min(...vs,rec?rec.sa[0]:Infinity),hi=Math.max(...vs,rec?rec.sa[1]:-Infinity);lo=Math.max(0,Math.floor(lo-1));hi=Math.ceil(hi+.5);
  const bw=Math.max(3,Math.min(16,(W-pl-pr)/days*.62));
  const X=i=>pl+(i+.5)*(W-pl-pr)/days,Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  const ticks=[];for(let t=lo;t<=hi;t+=Math.max(1,Math.round((hi-lo)/4)))ticks.push(t);
  const every=Math.max(1,Math.ceil(days/8));
  return<div ref={ref} className="mon-chart">
    <svg width={W} height={H} role="img" aria-label={L('Uyku süresi','Sleep duration')}>
      {ticks.map(t=><g key={t}><line x1={pl} x2={W-pr} y1={Y(t)} y2={Y(t)} className="mon-gl"/><text x={pl-6} y={Y(t)+3.5} textAnchor="end" className="mon-ax">{t}</text></g>)}
      {r.hesaplanabilir&&<rect x={pl} width={W-pl-pr} y={Y(r.ref.ort+Math.max(r.ref.ss,r.sigmaMin))} height={Math.max(0,Y(r.ref.ort-Math.max(r.ref.ss,r.sigmaMin))-Y(r.ref.ort+Math.max(r.ref.ss,r.sigmaMin)))} className="mon-band"><title>{L('Kişisel aralık (referans ort. ± SS)','Personal range (reference mean ± SD)')}</title></rect>}
      {rec&&rec.sa.map(h=><line key={h} x1={pl} x2={W-pr} y1={Y(h)} y2={Y(h)} className="mon-age"><title>{L(`Yaşa uygun genel öneri ${rec.sa[0]}-${rec.sa[1]} sa (Paruthi 2016, AASM) — bilgilendirici referans çizgisi`,`General age-appropriate advice ${rec.sa[0]}-${rec.sa[1]} h (Paruthi 2016, AASM) — informative reference line`)}</title></line>)}
      {pts.map((p,i)=>p.v!=null?<rect key={p.n} x={X(i)-bw/2} y={Y(p.v)} width={bw} height={Math.max(1,Y(lo)-Y(p.v))} rx="1.5" className={'mon-bar'+(p.src==='cihaz'?' dev':'')+(p.n===n?' on':'')}>
        <title>{`${fd(monKey(p.n))} · ${monHm(p.v)} · ${MON_SRC()[p.src]||''}`}</title></rect>
        :p.st==='gecersiz'?<text key={p.n} x={X(i)} y={Y(lo)-4} textAnchor="middle" className="mon-ax g">G<title>{L('Geçersiz kayıt — doğrulama bekliyor','Invalid record — awaiting verification')}</title></text>:null)}
      {pts.map((p,i)=>(i%every===0||i===days-1)?<text key={'x'+i} x={X(i)} y={H-6} textAnchor="middle" className="mon-ax">{fd(monKey(p.n)).slice(0,5)}</text>:null)}
    </svg>
    <div className="mon-leg">
      <span><i className="b el"/>{L('elle gece kaydı','manual night log')}</span><span><i className="b dv"/>{L('cihaz tahmini (Polar)','device estimate (Polar)')}</span>
      {r.hesaplanabilir&&<span><i className="b bd"/>{L('kişisel aralık','personal range')}</span>}
      {rec&&<span><i className="l ag"/>{L(`yaşa uygun öneri ${rec.sa[0]}-${rec.sa[1]} sa (bilgilendirici)`,`age advice ${rec.sa[0]}-${rec.sa[1]} h (informative)`)}</span>}
    </div>
  </div>;
}
/* Gece verisi (elle): eski "Uyku ve HRV" bölümünün formu, olduğu gibi. Aynı sabaha ikinci
   giriş öncekinin üzerine yazar; kayıtlar ath.nightLog'da, check-in satırlarından ayrı. */
function MonNightLog({ath,updAth}){
  const log=ath.nightLog||[];
  const[formOpen,setFormOpen]=useState(false);
  const[listOpen,setListOpen]=useState(false);
  const blank=()=>({date:fmt(today),bedTime:'',wakeTime:'',hrv:'',sleepHR:''});
  const[draft,setDraft]=useState(blank);
  const saveNight=()=>{
    if(!draft.date)return;
    const i=log.findIndex(x=>x.date===draft.date);
    const rec={id:i>=0?log[i].id:uid(),date:draft.date,bedTime:draft.bedTime,wakeTime:draft.wakeTime,hrv:draft.hrv,sleepHR:draft.sleepHR};
    const next=i>=0?log.map((x,j)=>j===i?{...x,...rec}:x):[...log,rec];
    updAth(ath.id,{nightLog:next.sort((a,b)=>String(a.date).localeCompare(String(b.date)))});
    setDraft(blank());setFormOpen(false);
  };
  const upd=(id,k,v)=>updAth(ath.id,{nightLog:log.map(x=>x.id===id?{...x,[k]:v}:x)});
  const del=id=>updAth(ath.id,{nightLog:log.filter(x=>x.id!==id)});
  return<div className="mon-night">
    <div className="mon-night-h">
      <div><b>{L('Gece kayıtları (elle)','Night records (manual)')}</b><span>{L(`${log.length} kayıt · aynı sabahta Polar yerine bu kullanılır`,`${log.length} records · used instead of Polar on the same morning`)}</span></div>
      <div className="mon-night-b">
        <button className="btn sm sec" onClick={()=>setListOpen(o=>!o)} disabled={!log.length} aria-expanded={listOpen}>{listOpen?L('Gizle','Hide'):L('Göster','Show')}</button>
        <button className="btn sm" onClick={()=>{setFormOpen(o=>!o);setDraft(blank());}}>{formOpen?L('Kapat','Close'):L('+ Gece verisi','+ Night data')}</button>
      </div>
    </div>
    {formOpen&&<div className="ng-form">
      <label><span>{L('Sabah (tarih)','Morning (date)')}</span><input type="date" value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))}/></label>
      <label><span>{L('Uykuya dalış','Fell asleep')}</span><input type="time" value={draft.bedTime} onChange={e=>setDraft(d=>({...d,bedTime:e.target.value}))}/></label>
      <label><span>{L('Uyanma','Woke up')}</span><input type="time" value={draft.wakeTime} onChange={e=>setDraft(d=>({...d,wakeTime:e.target.value}))}/></label>
      <label><span>HRV · RMSSD (ms)</span><input type="number" min="1" step="0.1" inputMode="decimal" value={draft.hrv} onChange={e=>setDraft(d=>({...d,hrv:e.target.value}))}/></label>
      <label><span>{L('Uyku nabzı (bpm)','Sleeping HR (bpm)')}</span><input type="number" min="20" step="1" inputMode="numeric" value={draft.sleepHR} onChange={e=>setDraft(d=>({...d,sleepHR:e.target.value}))}/></label>
      <button className="btn sm" onClick={saveNight} disabled={!draft.date}>{L('Kaydet','Save')}</button>
      <div className="ng-help">{L('Aynı sabaha ikinci kez girilen veri öncekinin üzerine yazılır.','A second entry for the same morning replaces the first.')}</div>
    </div>}
    {listOpen&&log.length>0&&<div style={{overflowX:'auto'}}><table className="ng-tbl"><thead><tr>
      <th>{L('Sabah','Morning')}</th><th>{L('Dalış','Asleep')}</th><th>{L('Uyanma','Woke')}</th><th>{L('Süre','Duration')}</th><th>HRV</th><th>{L('Nabız','HR')}</th><th/>
    </tr></thead><tbody>
      {log.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,60).map(x=><tr key={x.id||x.date}>
        <td><input type="date" value={x.date||''} onChange={e=>upd(x.id,'date',e.target.value)} style={{width:128}}/></td>
        <td><input type="time" value={x.bedTime||''} onChange={e=>upd(x.id,'bedTime',e.target.value)}/></td>
        <td><input type="time" value={x.wakeTime||''} onChange={e=>upd(x.id,'wakeTime',e.target.value)}/></td>
        <td className="ng-dur">{fmtSleep(nightSleepMin(x))}</td>
        <td><input type="number" step="0.1" value={x.hrv??''} onChange={e=>upd(x.id,'hrv',e.target.value)} style={{width:64}}/></td>
        <td><input type="number" value={x.sleepHR??''} onChange={e=>upd(x.id,'sleepHR',e.target.value)} style={{width:58}}/></td>
        <td><button className="btn xs danger" onClick={()=>del(x.id)} aria-label={L('Kaydı sil','Delete record')}>✕</button></td>
      </tr>)}
    </tbody></table></div>}
  </div>;
}
function MonPanelC({M,S,n,cfg,ath,updAth,olcek,setOlcek}){
  const tog=S.birlikteC;
  return<div className="panel mon-p mon-c">
    <div className="mon-ph"><div><h2>{L('Toparlanma','Recovery')}</h2><span>{L('Kategori C · uyku ve her wellness maddesi ayrı (bileşik skor yok; türetilmiş hazır oluş analize girmez)','Category C · sleep and each wellness item separately (no composite; derived readiness is not analysed)')}</span></div>
      <div className="mon-ph-r">
        <div className="lb-seg" role="group" aria-label={L('Ölçek','Scale')}>
          {[['gunluk',L('Günlük','Daily')],['pencere',L(`${cfg.Z_PENCERE_K} günlük ort.`,`${cfg.Z_PENCERE_K}-day mean`)]].map(([id,t])=>
            <button key={id} className={olcek===id?'on':''} aria-pressed={olcek===id} onClick={()=>setOlcek(id)}>{t}</button>)}</div>
        <span className="mon-tog" title={L('Yeterli referanslı göstergelerden kaçı aynı anda kişisel aralığın dışında (betimleyici sayı; olasılık değil).','How many adequately referenced indicators are outside the personal range at once (descriptive count; not a probability).')}>
          {L('Birlikte sapma','Co-deviation')} <b>{tog.sapan}/{tog.yeterli}</b>{tog.degerlendirilemedi?<small>{L(` · ${tog.degerlendirilemedi} gösterge değerlendirilemedi`,` · ${tog.degerlendirilemedi} not assessed`)}</small>:null}</span>
      </div></div>
    <MonSleepChart M={M} n={n} cfg={cfg} ath={ath}/>
    <div className="mon-inds">{S.C.map((r,i)=><MonIndRow key={r.id+r.olcek} M={M} r={r} cfg={cfg} i={i}/>)}</div>
    <div className="mon-foot">{L(`Stres ayrı sorulmuyor: check-in'in "mental stres/yorgunluk" sorusu tek maddedir. Genel iyilik hâli için alan yok (GEREKLI_ALAN_YOK). Kas ağrısı maddesi sağlık uyarısı üretmez; ağrı modülünden ayrıdır. Uyku kalitesi yalnızca burada değerlendirilir; cihaz uyku evreleri (derin/REM) kullanılmaz.${M.notes.legacyFatigue?` Yorgunluk tek soruyken girilmiş ${M.notes.legacyFatigue} kayıt zihinsel/fiziksel maddelere aktarılmadı (aynı değişken iki kez puanlanmasın).`:''}`,
      `Stress is not asked on its own: the check-in's "mental stress/fatigue" is one item. There is no field for general well-being (GEREKLI_ALAN_YOK). The soreness item raises no health alert; it is separate from the pain module. Sleep quality is assessed here only; device sleep stages (deep/REM) are not used.${M.notes.legacyFatigue?` ${M.notes.legacyFatigue} records from when fatigue was a single question are not carried into the mental/physical items (so one variable is not scored twice).`:''}`)}</div>
    <MonNightLog ath={ath} updAth={updAth}/>
  </div>;
}

/* ---- Bağlam kartı: uyarı üretmeyen bilgi ---- */
function MonContext({S,growth,cfg}){
  const g=growth;
  const side={Right:L('Sağ','Right'),Left:L('Sol','Left'),Bilateral:L('Çift taraflı','Bilateral')};
  return<div className="panel mon-p mon-ctx">
    <div className="mon-ph"><div><h2>{L('Bağlam','Context')}</h2><span>{L('uyarı üretmeyen bilgi · sakatlık geçmişi ve büyüme','information that raises no alert · injury history and growth')}</span></div></div>
    <div className="mon-ctx-g">
      <div>
        <div className="mon-k">{L('Sakatlık geçmişi','Injury history')}</div>
        {S.injuries.length===0?<div className="mon-empty">{L('Kayıtlı sakatlık yok.','No injuries recorded.')}</div>
        :<div className="mon-inj">{S.injuries.map(i=><div key={i.id||i.tarih} className="mon-inj-r">
          <b>{[side[i.taraf],i.yer].filter(Boolean).join(' ')||L('bölge belirtilmemiş','region not given')}{i.tip?<em> · {i.tip}</em>:null}</b>
          <span>{i.tarih?fd(i.tarih):'—'}{i.derece?L(` · derece ${i.derece}`,` · grade ${i.derece}`):''} · {i.aktif?L('aktif','active'):L(`dönüşten bu yana ${i.donustenBeriGun} gün`,`${i.donustenBeriGun} d since return`)}
            {i.tekrarNo>1?L(` · aynı bölgede ${i.tekrarNo}. kayıt (geçmiş bağlamı)`,` · record no. ${i.tekrarNo} in this region (history context)`):''}</span>
        </div>)}</div>}
      </div>
      <div>
        <div className="mon-k">{L('Büyüme ve olgunlaşma','Growth and maturation')}</div>
        <div className="mon-gr">
          <div><em>{L('Boy uzama hızı','Height velocity')}</em><b>{g.hiz?monN(g.hiz.v,1)+L(' cm/yıl',' cm/y'):'—'}</b>
            <small>{g.hiz?L(`son ${g.hiz.hizlar.length} hızın kayan ortalaması · ${g.hiz.olcum} ölçüm (aralık ≥ ${cfg.BOY_MIN_ARALIK_GUN} gün); ölçüm hatası yıllıklandırmada büyür`,`moving average of the last ${g.hiz.hizlar.length} velocities · ${g.hiz.olcum} measurements (≥ ${cfg.BOY_MIN_ARALIK_GUN} d apart); measurement error grows when annualised`)
              :L(`Hesaplanamıyor (${monCode(g.hizNeden)}) · en az ${cfg.BOY_MIN_OLCUM} ölçüm, aralık ≥ ${cfg.BOY_MIN_ARALIK_GUN} gün`,`Not computable (${monCode(g.hizNeden)}) · at least ${cfg.BOY_MIN_OLCUM} measurements, ≥ ${cfg.BOY_MIN_ARALIK_GUN} d apart`)}</small></div>
          <div><em>{L('Tahmini olgunlaşma ofseti (Mirwald)','Estimated maturity offset (Mirwald)')}</em><b>{g.phv.ok?monSigned(g.phv.ofset,1)+L(' yıl',' y'):'—'}</b>
            <small>{g.phv.ok?L(`yöntem hatası yaklaşık ±0,5-1 yıl · ölçüm ${fd(g.phv.tarih)} · tahmini PHV yaşı ${monN(g.phv.phvYasi,1)}`,`method error about ±0.5-1 y · measured ${fd(g.phv.tarih)} · est. age at PHV ${monN(g.phv.phvYasi,1)}`)
              :L(`Hesaplanamıyor (${g.phv.neden})${g.phv.eksik.length?' · eksik: '+g.phv.eksik.map(x=>({cinsiyet:'cinsiyet',dogum:'doğum tarihi',olcum:'boy + kilo + oturma boyu aynı kayıtta'}[x])).join(', '):''}`,`Not computable (${g.phv.neden})${g.phv.eksik.length?' · missing: '+g.phv.eksik.map(x=>({cinsiyet:'sex',dogum:'date of birth',olcum:'height + mass + sitting height in one record'}[x])).join(', '):''}`)}</small></div>
        </div>
        {g.r5.length>0&&<div className="mon-r5">R5 · {g.r5.map(x=>`${fd(x.tarih)} ${x.tur==='azalma'?L('azalma','decrease'):L('fark ölçüm hatası aralığında','difference within error')} (${monSigned(x.fark,1)} cm)`).join(' · ')}</div>}
      </div>
    </div>
    <div className="mon-foot">{L('Sahaya dönüşten bu yana geçen süre gün olarak gösterilir; 28 ya da 90 gün gibi evrensel tehlike sınırı yoktur. Sakatlık geçmişinden ve büyümeden sayısal olasılık hesaplanmaz; sabit sınıflandırma yoktur.','Time since return to play is shown in days; there is no universal 28- or 90-day danger limit. No numeric probability is computed from injury history or growth; there is no fixed classification.')}</div>
  </div>;
}

/* ---- Veri durumu (3A) ve doğrulama kuyruğu (salt okunur) ---- */
function MonDataStatus({M,n,cfg}){
  const[open,setOpen]=useState(false);
  const lbl=MON_IND_LBL(),fld=MON_FIELD(),rule=MON_RULE(),src=MON_SRC();
  const rows=[...MON_C_IDS.flatMap(id=>[[id,'gunluk'],[id,'pencere']]),['load','gunluk'],['load7','pencere'],['mono','pencere'],['strain','pencere'],['expo7','pencere']];
  const Q=M.queue.slice().sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
  return<div className="panel mon-p mon-ds">
    <button className="mon-ds-h" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
      <div><h2>{L('Veri durumu','Data status')}</h2><span>{L('her gösterge için doluluk, hesaplanabilirlik ve ölçüm güvenilirliği ayrı; birleşik "güven" etiketi yok','completeness, computability and measurement reliability per indicator, separately; no combined "confidence" label')}</span></div>
      <span className="mon-ds-q">{Q.length?L(`${Q.length} kayıt doğrulama bekliyor ve hesaba katılmadı`,`${Q.length} records await verification and were left out`):L('Doğrulama bekleyen kayıt yok','No records awaiting verification')}</span>
      <i className="mon-car" aria-hidden="true">▾</i>
    </button>
    {open&&<>
      <div className="mon-ds-w"><table className="mon-ds-t"><thead><tr><th>{L('Gösterge','Indicator')}</th><th>{L('Ölçek','Scale')}</th><th>{L('Doluluk (28 g)','Completeness (28 d)')}</th><th>{L('Hesaplanabilirlik','Computability')}</th><th>{L('Güvenilirlik','Reliability')}</th><th>{L('Kaynak (R4, bilgi)','Source (R4, info)')}</th></tr></thead>
        <tbody>{rows.map(([id,o])=>{const st=monStatus(M,id,o,n),g=st.guvenilirlik;
          return<tr key={id+o}><td>{lbl[id]}</td><td>{o==='gunluk'?L('günlük','daily'):L(`${cfg.Z_PENCERE_K} gün`,`${cfg.Z_PENCERE_K} d`)}</td>
            <td className="num">{st.doluluk.gecerli}/{st.doluluk.toplam}{st.doluluk.bekleyen?<small> · {st.doluluk.bekleyen} {L('bekliyor','pending')}</small>:null}</td>
            <td>{st.hesaplanabilirlik.durum==='Hesaplanabilir'?L('Hesaplanabilir','Computable'):<>{L('Hesaplanamıyor','Not computable')} <code>{st.hesaplanabilirlik.kodlar.join(' · ')}</code></>}</td>
            <td>{g.isaret.length?L('İşaret(ler) var: ','Flag(s): ')+g.isaret.map(x=>`${x.kod}${x.sayi>1?` (${x.sayi})`:''}`).join(', '):L('Belirgin sorun saptanmadı','No clear issue found')}{g.degerlendirilemiyor.length?<small> · {g.degerlendirilemiyor.join(', ')} {L('değerlendirilemiyor','not assessable')}</small>:null}</td>
            <td>{Object.entries(g.kaynak).map(([k,v])=>`${src[k]||k} ${v}`).join(' · ')||'—'}</td></tr>;})}</tbody></table></div>
      <div className="mon-k" style={{marginTop:14}}>{L('Doğrulama kuyruğu (salt okunur) — Sınıf G kayıtları ham hâliyle duruyor, düzeltilene kadar bütün hesaplardan hariç','Verification queue (read-only) — Class G records stay as they are and are left out of every calculation until corrected')}</div>
      {Q.length===0?<div className="mon-empty">{L('Kuyruk boş.','The queue is empty.')}</div>
      :<div className="mon-ds-w"><table className="mon-ds-t"><thead><tr><th>{L('Tarih','Date')}</th><th>{L('Alan','Field')}</th><th>{L('Değer','Value')}</th><th>{L('Kural','Rule')}</th></tr></thead>
        <tbody>{Q.slice(0,80).map((x,i)=><tr key={i}><td className="num">{fd(x.tarih)}</td><td>{fld[x.alan]||x.alan}{x.bolge?` · ${x.bolge}`:''}</td><td className="num">{x.deger}</td><td>{rule[x.kural]||x.kural}</td></tr>)}</tbody></table></div>}
      <div className="mon-foot">{L('Doğrulama = kaydın mevcut düzenleme özelliğiyle düzeltilmesi (wellness: Wellness Eğrisi → Kayıtlar → Düzenle; uyku: Gece kayıtları; sRPE: Yük Takibi kayıtları; boy/kilo: Antropometri). Düzeltilen kayıt kurallardan geçerse hesaplara kendiliğinden girer. Bu bildirimler sağlık uyarısı değildir. Sıra dışı ama geçerli değerler (Sınıf S, R6) dışlanmaz; referans SS’ini büyütebilir — bilinçli tercih.',
        'Verification = correcting the record with the existing editor (wellness: Wellness Curve → Records → Edit; sleep: Night records; sRPE: Load Monitoring records; height/mass: Anthropometry). A corrected record that passes the rules enters the calculations by itself. These notices are not health alerts. Unusual but valid values (Class S, R6) are not excluded; they can widen the reference SD — a deliberate choice.')}</div>
    </>}
  </div>;
}
/* ---- Yöntem ve ayarlar (salt okunur: parametre değişikliği kullanıcının açık kararı, kodda) ---- */
function MonMethod({cfg}){
  const[open,setOpen]=useState(false);
  const show=v=>Array.isArray(v)?v.map(x=>typeof x==='object'?JSON.stringify(x):x).join(' – '):typeof v==='object'?Object.entries(v).map(([k,x])=>`${k}: ${x}`).join(' · '):typeof v==='boolean'?(v?L('açık','on'):L('kapalı','off')):String(v);
  return<div className="mon-method">
    <button className="mon-link" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>{open?L('Yöntem ve ayarları gizle','Hide method and settings'):L('Yöntem ve ayarlar','Method and settings')}</button>
    {open&&<div className="mon-ds-w"><table className="mon-ds-t"><thead><tr><th>{L('Parametre','Parameter')}</th><th>{L('Değer','Value')}</th><th>{L('Açıklama','Description')}</th></tr></thead>
      <tbody>{MON_CFG_DOC.map(([k,tr,en])=><tr key={k}><td><code>{k}</code></td><td className="num">{show(cfg[k])}</td><td>{L(tr,en)}</td></tr>)}</tbody></table>
      <div className="mon-foot">{L('Bunlar başlangıç mühendislik varsayılanlarıdır; literatürde doğrulanmış eşik ya da sakatlık riski eşiği değildir. Değişiklik yalnızca kullanıcının açık kararıyla, yapılandırmada görünür biçimde yapılır.','These are starting engineering defaults; they are not validated thresholds or injury-risk thresholds. A change is made only by the user’s explicit decision, visibly in the configuration.')}</div></div>}
  </div>;
}

/* ---- Bölümün kendisi ---- */
function AthMonitoring({ath,updAth,teamId,dayKey}){
  const cfg=MON_CFG;
  const tk=fmt(today);
  const evalKey=dayKey>tk?tk:dayKey;
  const[olcek,setOlcek]=useState('gunluk');
  const back=cfg.PENCERE_GERI_BAKIS_GUN+cfg.REFERANS_GUN+cfg.Z_PENCERE_K;
  const NH=usePolarNightHR(ath,teamId,fmt(addD(parseD(evalKey),-back)),evalKey);
  const sleepSig=Object.keys(NH.sleep||{}).length+':'+Object.values(NH.sleep||{}).reduce((a,b)=>a+(Number(b)||0),0);
  const M=useMemo(()=>monBuild(ath,{cfg,today:tk,polarSleep:NH.sleep}),
    [ath.wellness,ath.srpeLog,ath.nightLog,ath.days,ath.tests,ath.measurements,ath.sex,ath.dateOfBirth,sleepSig,tk]);
  const n=monDN(evalKey);
  const S=useMemo(()=>monSummary(M,ath,n,olcek),[M,ath.injuries,n,olcek]);
  return<section className="mon" aria-label={L('Sporcu İzleme','Athlete Monitoring')}>
    <div className="wv-sec-h">{L('Sporcu İzleme','Athlete Monitoring')}</div>
    <div className="mon-top">
      <div>
        <div className="mon-top-t">{L('Sağlık, yük ve toparlanma','Health, load and recovery')}<span>{L(`değerlendirme günü ${fd(evalKey)}`,`evaluated on ${fd(evalKey)}`)}</span></div>
        <p className="mon-disc">{MON_DISCLAIMER()}</p>
      </div>
      <MonMethod cfg={cfg}/>
    </div>
    <div className="mon-sum">
      <div className="mon-sc a" data-on={S.A.length?'1':'0'}><em>{L('A · Sağlık uyarıları','A · Health alerts')}</em><b>{S.A.length}</b>
        <small>{S.A.length?S.A.map(x=>x.tur==='agri'?painRegionShort(x.bolge):L('aktif sakatlık','active injury')).join(' · '):S.pain.kayit?L('ağrı ya da aktif sakatlık bildirimi yok','no pain or active injury report'):L('check-in yok — ağrı bilinmiyor','no check-in — pain unknown')}</small></div>
      <div className="mon-sc"><em>{L('B · Yük ve performans','B · Load and performance')}</em><b>{S.birlikteB.sapan}<span>/{S.birlikteB.yeterli}</span></b>
        <small>{L('kişisel aralığın dışında','outside personal range')}{S.birlikteB.degerlendirilemedi?L(` · ${S.birlikteB.degerlendirilemedi} değerlendirilemedi`,` · ${S.birlikteB.degerlendirilemedi} not assessed`):''}</small></div>
      <div className="mon-sc"><em>{L('C · Toparlanma','C · Recovery')}</em><b>{S.birlikteC.sapan}<span>/{S.birlikteC.yeterli}</span></b>
        <small>{L('kişisel aralığın dışında','outside personal range')}{S.birlikteC.degerlendirilemedi?L(` · ${S.birlikteC.degerlendirilemedi} değerlendirilemedi`,` · ${S.birlikteC.degerlendirilemedi} not assessed`):''}</small></div>
      <div className="mon-sc ctx"><em>{L('Bağlam','Context')}</em><b>{S.injuries.length}</b>
        <small>{L('sakatlık kaydı','injury records')}{M.growth.hiz?L(` · boy ${monN(M.growth.hiz.v,1)} cm/yıl`,` · height ${monN(M.growth.hiz.v,1)} cm/y`):''}</small></div>
    </div>
    <MonPanelA M={M} S={S} n={n} growth={M.growth} cfg={cfg}/>
    <div className="mon-two">
      <MonPanelB M={M} S={S} n={n} cfg={cfg}/>
      <MonPanelC M={M} S={S} n={n} cfg={cfg} ath={ath} updAth={updAth} olcek={olcek} setOlcek={setOlcek}/>
    </div>
    <MonContext S={S} growth={M.growth} cfg={cfg}/>
    <MonDataStatus M={M} n={n} cfg={cfg}/>
  </section>;
}

/* ═══ Veri yeterliliği (§3.6) — Wellness'ın takım görünümünde, yönetici/antrenör için ═══
   Z-skor modunun pilot veride gerçekten kullanılabilir olup olmadığını ölçer; salt okunur
   (ham veriye ve yapılandırmaya yazmaz). Yetersizlik bulgu olarak raporlanır, eşikler
   otomatik gevşetilmez. Rapor .md dosyası olarak indirilebilir. */
const MON_TEAM_SLEEP=new Map();
async function monTeamPolarSleep(teamId,from,to){
  const months=pwMonthsOf(from,to),out={};
  await Promise.all(months.map(async m=>{
    const k=teamId+'|'+m;
    let c=MON_TEAM_SLEEP.get(k);
    if(!c){const last=`${m}-${String(new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate()).padStart(2,'0')}`;
      const j=await polarCall('/team-data',{teamId,from:m+'-01',to:last>to?to:last});
      c={};(j.athletes||[]).forEach(a=>{const sl=c[a.athleteId]=c[a.athleteId]||{};
        (a.sleep||[]).forEach(x=>{const d=String((x&&x.sleepEnd)||'').slice(0,10)||(x&&x.date);if(d&&pwNum(x.asleepSec))sl[d]=x.asleepSec;});});
      MON_TEAM_SLEEP.set(k,c);}
    Object.entries(c).forEach(([id,sl])=>{out[id]={...(out[id]||{}),...sl};});
  }));
  return out;
}
function monReportMd(rep,cfg){
  const lbl=MON_IND_LBL(),pc=v=>v==null?'—':monN(v*100,0)+'%';
  const sc=o=>o==='gunluk'?L('günlük','daily'):o==='ewma'?'EWMA':L(`${cfg.Z_PENCERE_K} günlük`,`${cfg.Z_PENCERE_K}-day`);
  const nd=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(', ')||'—';
  const L1=[];
  L1.push(`# ${L('Veri Yeterliliği — Pilot Referans Raporu','Data Adequacy — Pilot Reference Report')}`,'');
  L1.push(L(`Dönem: ${fd(rep.donem.from)} – ${fd(rep.donem.to)} · ${rep.sporcular.length} sporcu · üretildi ${new Date().toLocaleString('tr-TR')}`,`Period: ${fd(rep.donem.from)} – ${fd(rep.donem.to)} · ${rep.sporcular.length} athletes · generated ${new Date().toLocaleString('en-US')}`),'');
  L1.push(L('Hesaplanabilirlik oranı = referansı yeterli olan değerlendirilebilir gün ÷ değerlendirilebilir gün. Rapor salt okunurdur; düşük oran bir bulgudur, eşikler otomatik gevşetilmez. Bu rapor sakatlık riski içermez.','Computability = evaluable days with an adequate reference ÷ evaluable days. The report is read-only; a low ratio is a finding, thresholds are never relaxed automatically. This report contains no injury risk.'),'');
  L1.push(`## ${L('Genel','Overall')}`,'',`| ${L('Gösterge','Indicator')} | ${L('Ölçek','Scale')} | ${L('Değerlendirilebilir','Evaluable')} | ${L('Yeterli','Adequate')} | ${L('Oran','Ratio')} | ${L('Neden dağılımı','Reasons')} |`,'|---|---|---:|---:|---:|---|');
  rep.genel.forEach(r=>L1.push(`| ${lbl[r.id]} | ${sc(r.olcek)} | ${r.degerlendirilebilir} | ${r.yeterli} | ${pc(r.oran)} | ${nd(r.neden)} |`));
  L1.push('',`## ${L(`En düşük ${cfg.RAPOR_EN_DUSUK_N} oran (sporcu × gösterge)`,`Lowest ${cfg.RAPOR_EN_DUSUK_N} ratios (athlete × indicator)`)}`,'');
  rep.enDusuk.forEach(x=>L1.push(`- ${x.ad} · ${lbl[x.id]}${x.olcek==='ewma'?'':` (${sc(x.olcek)})`}: ${pc(x.oran)}`));
  L1.push('',`## ${L('Kayıt uyumu ve hesaplanabilirlik','Compliance and computability')}`,'',`| ${L('Wellness uyum bandı','Wellness compliance band')} | ${L('Sporcu','Athletes')} | ${L('Ort. günlük oran','Mean daily ratio')} |`,'|---|---:|---:|');
  rep.bantlar.forEach(b=>L1.push(`| ${pc(b.lo)} – ${pc(b.hi)} | ${b.sporcu} | ${pc(b.gunlukOran)} |`));
  L1.push('',`## ${L('Sporcu başına','Per athlete')}`,'');
  rep.sporcular.forEach(p=>{L1.push(`### ${p.ad}`,'',L(`Wellness uyumu ${pc(p.uyum.wellness)} · yük bilinen gün ${pc(p.uyum.yuk)} · ${p.uyum.gun} gün`,`Wellness compliance ${pc(p.uyum.wellness)} · load-known days ${pc(p.uyum.yuk)} · ${p.uyum.gun} days`),'',
    `| ${L('Gösterge','Indicator')} | ${L('Ölçek','Scale')} | ${L('Oran','Ratio')} | ${L('Neden','Reasons')} |`,'|---|---|---:|---|');
    p.rows.forEach(r=>L1.push(`| ${lbl[r.id]} | ${sc(r.olcek)} | ${pc(r.oran)} (${r.yeterli}/${r.degerlendirilebilir}) | ${nd(r.neden)} |`));L1.push('');});
  L1.push(`## ${L('Önerilebilecekler (uygulanmadı)','Possible options (not applied)')}`,'',
    L('- Veri giriş uyumunu artırmak (günlük check-in, sRPE).\n- Gerçek dinlenme günü doğrulaması eklemek (şu an takvimde seans olmayan gün dinlenme sayılıyor).\n- Daha uzun referans penceresinin etkisini ayrıca göstermek.\n- Parametre değişikliği yalnızca kullanıcının açık kararıyla, yapılandırmada görünür biçimde ve bilimsel olarak doğrulanmadığı notuyla.',
      '- Raise data-entry compliance (daily check-in, sRPE).\n- Add a real rest-day confirmation (now a day with no calendar session counts as rest).\n- Show the effect of a longer reference window separately.\n- Any parameter change only by the user’s explicit decision, visible in the configuration, noted as not scientifically validated.'));
  return L1.join('\n');
}
function MonAdequacyPanel({team}){
  const cfg=MON_CFG;
  const[open,setOpen]=useState(false);
  const[rep,setRep]=useState(null);
  const[busy,setBusy]=useState(false);
  const[note,setNote]=useState('');
  const athletes=team.athletes||[];
  const run=async()=>{
    setBusy(true);setNote('');
    const tk=fmt(today),from=fmt(addD(today,-(cfg.RAPOR_GUN+cfg.PENCERE_GERI_BAKIS_GUN+cfg.REFERANS_GUN)));
    let polar={};
    const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
    if(u&&!u.isAnonymous){try{polar=await monTeamPolarSleep(team.id,from,tk);}catch(e){setNote(L('Polar uyku verisi alınamadı; uyku süresi yalnızca elle gece kayıtlarından.','Polar sleep could not be loaded; sleep duration from manual night logs only.'));}}
    else setNote(L('Polar uyku verisi için koç oturumu gerekiyor; uyku süresi yalnızca elle gece kayıtlarından.','Polar sleep needs a coach session; sleep duration from manual night logs only.'));
    /* Ağır hesap: arayüz donmasın diye bir sonraki kareye bırakılır. */
    await new Promise(r=>setTimeout(r,30));
    const items=athletes.map(a=>({ath:a,M:monBuild(a,{cfg,today:tk,polarSleep:polar[String(a.id)]||{}})}));
    setRep(monAdequacyReport(items,cfg,tk));setBusy(false);
  };
  const dl=()=>{if(!rep)return;const blob=new Blob([monReportMd(rep,cfg)],{type:'text/markdown;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`veri-yeterliligi-${fmt(today)}.md`;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);};
  const lbl=MON_IND_LBL(),pc=v=>v==null?'—':monN(v*100,0)+'%';
  const sc=o=>o==='gunluk'?L('günlük','daily'):o==='ewma'?'EWMA':L(`${cfg.Z_PENCERE_K} gün`,`${cfg.Z_PENCERE_K} d`);
  return<div className="panel mon-p mon-adq">
    <button className="mon-ds-h" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
      <div><h2>{L('Veri yeterliliği','Data adequacy')}</h2><span>{L(`pilot referans raporu · son ${cfg.RAPOR_GUN} gün · her gösterge × ölçek için z-skor referansının hesaplanabilirlik oranı`,`pilot reference report · last ${cfg.RAPOR_GUN} days · z-score reference computability per indicator × scale`)}</span></div>
      <i className="mon-car" aria-hidden="true">▾</i>
    </button>
    {open&&<>
      <div className="mon-adq-b">
        <button className="btn sm" onClick={run} disabled={busy||!athletes.length}>{busy?L('Hesaplanıyor…','Computing…'):rep?L('Yeniden hesapla','Recompute'):L('Raporu hesapla','Compute report')}</button>
        {rep&&<button className="btn sm sec" onClick={dl}>{L('Raporu indir (.md)','Download report (.md)')}</button>}
        {note&&<span className="mon-adq-n">{note}</span>}
      </div>
      {rep&&<>
        <div className="mon-ds-w"><table className="mon-ds-t"><thead><tr><th>{L('Gösterge','Indicator')}</th><th>{L('Ölçek','Scale')}</th><th className="num">{L('Değerlendirilebilir','Evaluable')}</th><th className="num">{L('Yeterli','Adequate')}</th><th className="num">{L('Oran','Ratio')}</th><th>{L('Neden dağılımı','Reasons')}</th></tr></thead>
          <tbody>{rep.genel.map(r=><tr key={r.id+r.olcek}><td>{lbl[r.id]}</td><td>{sc(r.olcek)}</td><td className="num">{r.degerlendirilebilir}</td><td className="num">{r.yeterli}</td>
            <td className="num"><span className="mon-bar-h"><i style={{width:r.oran==null?0:r.oran*100+'%'}}/></span>{pc(r.oran)}</td>
            <td>{Object.entries(r.neden).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(' · ')||'—'}</td></tr>)}</tbody></table></div>
        <div className="mon-adq-g">
          <div><div className="mon-k">{L(`En düşük ${cfg.RAPOR_EN_DUSUK_N} oran`,`Lowest ${cfg.RAPOR_EN_DUSUK_N} ratios`)}</div>
            {rep.enDusuk.map((x,i)=><div key={i} className="mon-adq-r"><span>{x.ad} · {lbl[x.id]}{x.olcek==='ewma'?'':` (${sc(x.olcek)})`}</span><b>{pc(x.oran)}</b></div>)}</div>
          <div><div className="mon-k">{L('Wellness kayıt uyumuna göre günlük oran','Daily ratio by wellness compliance')}</div>
            {rep.bantlar.map((b,i)=><div key={i} className="mon-adq-r"><span>{pc(b.lo)} – {pc(b.hi)} · {b.sporcu} {L('sporcu','athletes')}</span><b>{pc(b.gunlukOran)}</b></div>)}</div>
        </div>
        <div className="mon-foot">{L('Referansı yetersiz gün/göstergede sistem ham değişim ve eğilim gösterimini korur; z-skor, sapma vurgusu ve eğilim etiketi üretilmez. Eşikler hiçbir koşulda otomatik gevşetilmez; değişiklik yalnızca kullanıcının açık kararıyla.','Where the reference is insufficient the system keeps the raw change and trend; no z-score, deviation emphasis or trend label is produced. Thresholds are never relaxed automatically; a change only by the user’s explicit decision.')}</div>
      </>}
    </>}
  </div>;
}
