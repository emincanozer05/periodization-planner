/* =========================================================
   PROGRAM WRITER — writes a microcycle from scratch for ONE athlete.

   The Program Design Assistant above comments on an athlete and hands back six
   corrective exercises. This module does the other job: it writes the actual
   training days, and it writes them from four inputs only — position, the
   screening battery, today's reported pain, and the 7-14 day wellness / RPE
   trend.

   Every rule those five inputs are read against is a REFERENCE TABLE defined
   here and shipped to the model inside the request, because the model is
   forbidden from inventing any of them: the position → movement-pattern
   emphasis (PW_POS_PATTERNS), the structural-tier cut-offs
   (PW_SCREENS + PW_TIERS) and the pain → pattern map (the individualization
   screen's own PAIN_RULES). A reference the athlete has no data for is not
   guessed around: it lands in `eksik_veriler`, and the answer is expected to
   carry it into manuel_inceleme_nedeni.
   ========================================================= */
const PROGRAM_WRITER_SYSTEM=`Sen bir spor bilimi ve kuvvet-kondisyon (S&C) asistanısın. Görevin, bir
basketbol sporcusu için, verilen faktörlere dayanarak SIFIRDAN bir
antrenman programı yazmaktır.

GİRDİ FAKTÖRLERİ VE NASIL KULLANILACAKLARI:
1. Pozisyon → sağlanan pozisyon-hareket eşleştirme referansına göre
   hareket paterni vurgusunu belirle. Bu eşleştirmeyi uydurma, sadece
   sağlanan referansı kullan.
2. Test sonuçları (screening battery + performans testleri) → zayıf
   halka (weakest-link) kuralıyla yapısal kademeyi belirle; kademe,
   programın hacim/karmaşıklık taban çizgisini belirler.
3. Güncel ağrı durumu → ağrılı bölgeyi domine eden hareket paternlerini
   programdan çıkar veya hacmini azalt.
4. Son 7-14 günün wellness/RPE trendi → yüksek birikmiş yorgunluk
   gösteriyorsa başlangıç hacmini muhafazakar tut; tek günlük veriye
   göre karar verme, trende bak.

KESİN KURALLAR:
- Egzersiz kütüphanesinden seçim yapabilir veya serbest metin egzersiz
  önerebilirsin — kütüphaneyle sınırlı değilsin.
- Sağlanmayan hiçbir referans kuralı, ölçüm, tanı veya geçmiş veri
  UYDURMA. Bir girdi eksikse o kararı atla, manuel_inceleme_gerekli
  içine yaz.
- Her önemli seçim (kademe, ana hacim/yoğunluk kararı, hariç tutulan
  paternler) için kısa gerekçe ver — her tek egzersiz için değil.
- Sadece aşağıdaki JSON şemasına uygun çıktı ver.

ÇIKTI ŞEMASI:
{
  "sporcu_id": "string",
  "yapisal_kademe": "string",
  "kademe_gerekcesi": "string",
  "program_gunleri": [
    {
      "gun_etiketi": "string",
      "egzersizler": [
        {
          "ad": "string",
          "set_tekrar": "string",
          "yuk_siddet": "string",
          "hareket_pattern_tag": "string",
          "kisa_not": "string | null"
        }
      ]
    }
  ],
  "haric_tutulan_paternler": ["string"],
  "genel_ozet": "string",
  "manuel_inceleme_gerekli": "boolean",
  "manuel_inceleme_nedeni": "string | null"
}`;

/* ---- Reference 1: position → movement-pattern emphasis --------------------
   Keyed by the roster's own position grouping (POS_GROUPS). The regions each
   group is watched for are NOT repeated here — they are read straight off
   CA_POS_BIAS when the request is built, so the two screens cannot drift apart.
   `other` (any non-basketball roster) carries no emphasis on purpose: a sport
   the app has no mapping for must not be second-guessed, and the missing
   mapping is reported instead. */
const PW_POS_PATTERNS={
  guard:{oyun_talebi:'Yüksek yön değiştirme ve ivmelenme/yavaşlama hacmi, top sürerken düşük duruş, sürekli tek bacak yüklenmesi.',
    vurgu:['Lunge / Unilateral','Sprint / Locomotion','Jump / Plyo','Rotation','Core / Brace'],
    koruma:['Squat','Hinge','Push','Pull']},
  wing:{oyun_talebi:'Her iki uçtan iş: hem perimetre yön değiştirme hem potaya girişte temas ve sıçrama.',
    vurgu:['Jump / Plyo','Lunge / Unilateral','Push','Pull','Sprint / Locomotion'],
    koruma:['Squat','Hinge','Rotation','Core / Brace']},
  post:{oyun_talebi:'Kısa alanda temas, pozisyon tutma, ribaunt için tekrarlı dikey sıçrama; uzun kolda omuz ve gövde yüklenmesi.',
    vurgu:['Hinge','Squat','Push','Pull','Carry'],
    koruma:['Lunge / Unilateral','Jump / Plyo','Core / Brace','Rotation']},
  other:{oyun_talebi:null,vurgu:[],koruma:[]},
};

// How the tier reads, said wherever the tier number reaches the model.
const DI_TIER_SCALE='1 = fails the screening, 2 = limited, 3 = passes; the lowest screen sets the tier, higher is better';
/* ---- Reference 2: structural tier (weakest link) --------------------------
   The screening battery, scored on cut-offs the app ALREADY uses: ankle
   dorsiflexion 35° and ASLR / overhead squat ≤1 out of 3 come from the
   assistant coach's own reading (caReadAthlete), the 4 cm per-direction Y
   Balance reach difference from the test sheet's return-to-sport note, and the
   10% bilateral difference from the same threshold the comparison table and the
   assistant coach report as a finding. Nothing here is a new rule: 3 = passes,
   2 = limited, 1 = fails. */
const PW_SCREENS=[
  {id:'ohs',label:'Overhead Squat (FMS 0-3)',unit:'/3',
    read:t=>recNum(t&&t.ohs&&t.ohs.score),
    grade:v=>v>=2?3:(v>=1?2:1),
    cut:'≥2 geçer · 1 kısıtlı · 0 başarısız'},
  {id:'aslr',label:'ASLR — zayıf taraf (FMS 0-3)',unit:'/3',
    read:t=>{const a=[recNum(t&&t.aslr&&t.aslr.right),recNum(t&&t.aslr&&t.aslr.left)].filter(x=>x!=null);return a.length?Math.min(...a):null;},
    grade:v=>v>=2?3:(v>=1?2:1),
    cut:'≥2 geçer · 1 kısıtlı · 0 başarısız'},
  {id:'ankle',label:'Ayak bileği dorsifleksiyon — zayıf taraf',unit:'°',
    read:t=>{const a=[recNum(t&&t.ankleDF&&t.ankleDF.right),recNum(t&&t.ankleDF&&t.ankleDF.left)].filter(x=>x!=null);return a.length?Math.min(...a):null;},
    grade:v=>v>=35?3:(v>=30?2:1),
    cut:'≥35° geçer · 30-35° kısıtlı · <30° başarısız'},
  {id:'ybal',label:'Y Balance — yön başına sağ/sol uzanma farkı (en büyüğü)',unit:' cm',
    read:t=>{const y=t?ybCalc(t.yBalance):{};const d=[y.dAnt,y.dPm,y.dPl].filter(x=>x!=null);return d.length?Math.max(...d):null;},
    grade:v=>v<4?3:(v<6?2:1),
    cut:'<4 cm geçer · 4-6 cm kısıtlı · ≥6 cm başarısız'},
  {id:'asym',label:'Bilateral fark — lateral CMJ / uyluk / baldır (en büyüğü)',pre:'%',unit:'',
    read:t=>{if(!t)return null;
      const y=ybCalc(t.yBalance);
      const p=[caAsym(t.lateralCmj&&t.lateralCmj.right,t.lateralCmj&&t.lateralCmj.left),
        caAsym(y.compR,y.compL),
        caAsym(t.circ&&t.circ.thighRight,t.circ&&t.circ.thighLeft),
        caAsym(t.circ&&t.circ.calfRight,t.circ&&t.circ.calfLeft)].filter(Boolean);
      return p.length?Math.max(...p.map(x=>x.pct)):null;},
    grade:v=>v<10?3:(v<15?2:1),
    cut:'<%10 geçer · %10-15 kısıtlı · ≥%15 başarısız'},
];
/* What the tier BUYS: the volume and complexity baseline the program starts from.
   The tier is the floor set by the weakest link, never the average — one failed
   screen holds the whole program at that level. */
const PW_TIERS=[
  {k:1,label:'Kademe 1 — Yapısal Temel',
    hacim:'Haftada 2 salon günü · günde 4-5 hareket · 2-3 set',
    siddet:'RPE 5-6.5 · %50-65 1RM · izometrik ve tempo (eksantrik kontrollü) çalışma ağırlıklı',
    karmasiklik:'Destekli / makine / bilateral varyasyonlar, tam ROM içinde kalınır; teknik ve hareket açıklığı yükten önce gelir',
    sok:'Pliometrik hacim ≤40 temas/hafta, düşük yükseklik ve iniş kontrolü çalışmaları',
    kural:'En zayıf tarama maddesi BAŞARISIZ seviyede'},
  {k:2,label:'Kademe 2 — Gelişim',
    hacim:'Haftada 3 salon günü · günde 5-6 hareket · 3-4 set',
    siddet:'RPE 6.5-7.5 · %65-80 1RM · tek taraflı iş belirgin şekilde programda',
    karmasiklik:'Serbest ağırlık ana kaldırışlar + tek taraflı varyasyonlar; asimetri olan tarafta ek set',
    sok:'Pliometrik hacim 60-80 temas/hafta, çift → tek bacak geçişi kontrollü',
    kural:'En zayıf tarama maddesi KISITLI seviyede'},
  {k:3,label:'Kademe 3 — Performans',
    hacim:'Haftada 3-4 salon günü · günde 5-6 hareket · 4-5 set',
    siddet:'RPE 7-8.5 · %75-90 1RM · maksimal kuvvet ve güç blokları birlikte',
    karmasiklik:'İleri varyasyonlar, reaktif ve balistik çalışma, kompleks/kontrast setler kullanılabilir',
    sok:'Pliometrik hacim 80-120 temas/hafta, reaktif ve tek bacak temaslar dahil',
    kural:'Tüm ölçülen tarama maddeleri GEÇER seviyede'},
];
const pwTierRow=k=>PW_TIERS.find(t=>t.k===k)||null;
/* Weakest link: the tier is the lowest grade across the screens that HAVE a
   value. A battery with nothing in it returns null — the tier decision is then
   skipped rather than assumed, exactly like any other missing input. */
function pwTier(t){
  const items=PW_SCREENS.map(s=>{
    const v=s.read(t);
    return{id:s.id,madde:s.label,deger:v==null?null:(s.pre||'')+v+s.unit,esik:s.cut,seviye:v==null?null:s.grade(v),skor:v};
  });
  const scored=items.filter(x=>x.seviye!=null);
  if(!scored.length)return{kademe:null,items,zayif_halka:null,olculen:0};
  const low=Math.min(...scored.map(x=>x.seviye));
  // At the top tier nothing is a weak link — every measured item passed, and listing
  // them all under that name would read as five findings instead of none.
  const weak=low<3?scored.filter(x=>x.seviye===low).map(x=>`${x.madde}: ${x.deger}`):null;
  return{kademe:low,items,zayif_halka:weak,olculen:scored.length};
}

/* ---- Reference 4 + input 4: today's pain --------------------------------
   The regions the athlete reported on their latest check-in and the tags the
   coach is managing them for, each carried together with the patterns PAIN_RULES
   says that region loads (to drop or cut) and the ones work is redirected to. */
function pwPain(ath,ref){
  const out=[];
  const add=(tag,extra)=>{
    const r=PAIN_RULES[tag]||{};
    out.push({bolge:ctLabel(tag),...extra,
      yukleyen_paternler:r.hit||[],yonlendirilen_paternler:r.prefer||[]});
  };
  const reports=athPainReports(ath,ref);
  reports.forEach(p=>add(p.tag,{
    siddet:p.sev?`${diPain5(p.sev)}/5`:null,tarih:p.date,
    kaynak:p.src==='text'?'check-in serbest metni':'check-in ağrı bölgesi'}));
  const reported=new Set(reports.map(p=>p.tag));
  (ath.constraintTags||[]).filter(Boolean).forEach(tag=>{
    if(reported.has(tag))return;
    add(tag,{siddet:null,tarih:null,kaynak:'antrenörün takip ettiği kısıt etiketi'});
  });
  const note=athPainNote(ath,ref);
  return{bolgeler:out,
    sporcunun_ifadesi:note?`${note.date}: ${note.text}`:null,
    aktif_sakatliklar:(ath.injuries||[]).filter(i=>!i.actualReturn)
      .map(i=>[i.date||'',i.location||i.type||'sakatlık',i.side?`(${i.side})`:'',i.grade?`Grade ${i.grade}`:''].filter(Boolean).join(' ')),
  };
}

/* ---- Input 5: the 7-14 day wellness / RPE trend --------------------------
   Two seven-day windows side by side, so the answer can read a DIRECTION rather
   than a single morning. `birikmis_yorgunluk_isaretleri` lists only the signals
   that crossed a threshold the app already uses elsewhere (the readiness band
   table, the ACWR zones, the assistant coach's RPE 8.5); how many signals it
   takes to hold the volume back is the answer's call, not this function's. */
function pwTrend(ath,ref){
  const n=recNum;
  const days=(from,to)=>(ath.wellness||[]).filter(w=>w.date&&w.date>=from&&w.date<=to);
  const d=k=>fmt(addD(parseD(ref),k));
  const last7=days(d(-6),ref),prior7=days(d(-13),d(-7));
  const avg=(arr,f)=>{const v=arr.map(x=>n(x[f])).filter(x=>x!=null);return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2):null;};
  const win=arr=>({checkin_sayisi:arr.length,hazir_bulunusluk_5:avg(arr,'readiness'),
    yorgunluk_5:avg(arr,'fatigue'),zihinsel_yorgunluk_5:avg(arr,'mentalFatigue'),fiziksel_yorgunluk_5:avg(arr,'physicalFatigue'),agri_5:avg(arr,'soreness'),uyku:avg(arr,'sleep'),rhr_bpm:avg(arr,'RHR')});
  const w1=win(last7),w0=win(prior7);
  const load7=athLoadSum(ath,d(-6),ref),load0=athLoadSum(ath,d(-13),d(-7));
  const acwr=athACWR(ath,ref);
  const gunluk=[];
  for(let i=13;i>=0;i--){
    const k=d(-i),rpe=athDayRPE(ath,k),au=athDayLoad(ath,k);
    if(rpe==null&&!au)continue;
    gunluk.push({tarih:k,rpe:rpe==null||isNaN(rpe)?null:Math.round(rpe*10)/10,yuk_au:au});
  }
  const sig=[];
  if(acwr>1.3)sig.push(`ACWR ${acwr.toFixed(2)} — ${acwrZoneOf(acwr).t}`);
  if(w1.hazir_bulunusluk_5!=null&&w1.hazir_bulunusluk_5<3.2)
    sig.push(`Son 7 gün hazır bulunuşluk ortalaması ${w1.hazir_bulunusluk_5}/5 (bant: ${(rdBand(w1.hazir_bulunusluk_5)||{}).label})`);
  if(w1.hazir_bulunusluk_5!=null&&w0.hazir_bulunusluk_5!=null&&w0.hazir_bulunusluk_5-w1.hazir_bulunusluk_5>=0.5)
    sig.push(`Hazır bulunuşluk düşüyor: ${w0.hazir_bulunusluk_5} → ${w1.hazir_bulunusluk_5} /5`);
  if(w1.yorgunluk_5!=null&&w1.yorgunluk_5<=2.5)sig.push(`Son 7 gün yorgunluk ortalaması ${w1.yorgunluk_5}/5 (5 iyi uç)`);
  if(w1.agri_5!=null&&w1.agri_5<=2.5)sig.push(`Son 7 gün ağrı ortalaması ${w1.agri_5}/5 (5 iyi uç)`);
  const hard=gunluk.filter(x=>x.tarih>=d(-6)&&x.rpe!=null&&x.rpe>=8.5).length;
  if(hard>=2)sig.push(`Son 7 günde ${hard} antrenman RPE ≥8.5`);
  if(load0>0&&load7>load0*1.3)sig.push(`Haftalık yük ${load0} → ${load7} AU (%${Math.round((load7/load0-1)*100)} artış)`);
  return{son_7_gun:{...w1,toplam_yuk_au:load7},onceki_7_gun:{...w0,toplam_yuk_au:load0},
    acwr:acwr?+acwr.toFixed(2):null,acwr_bolgesi:acwr?acwrZoneOf(acwr).t:null,
    gunluk_rpe_yuk:gunluk,
    birikmis_yorgunluk_isaretleri:sig,
    trend_okunabilir:(w1.checkin_sayisi+w0.checkin_sayisi)>=4||gunluk.length>=4};
}

/* The request the model answers: the athlete's five inputs and the reference
   tables each one is read against, and nothing else. */
function buildProgramWriterInput(ath,setup,exercises){
  const n=recNum;
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  const ts=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=ts.length?ts[ts.length-1]:null;
  const ref=athLatestDate(ath);
  const pg=posGroupOf(ath.position);
  const posRef=PW_POS_PATTERNS[pg]||PW_POS_PATTERNS.other;
  const tier=pwTier(t);
  const pain=pwPain(ath,ref);
  const trend=pwTrend(ath,ref);
  const yb=t?ybCalc(t.yBalance):{};
  // Library names by movement pattern — the same pattern vocabulary the reference
  // tables and the program sheet use, so a pick can be tagged with one directly.
  const lib={};
  (exercises||[]).forEach(e=>{
    const p=exPatternOf(e)||'Etiketsiz';
    (lib[p]=lib[p]||[]).push((e.name||'?')+(e.difficulty?` (${e.difficulty})`:''));
  });
  Object.keys(lib).forEach(k=>{if(lib[k].length>40)lib[k]=lib[k].slice(0,40).concat('…');});
  // Every input the program would otherwise have to be guessed for. The answer is
  // told to carry these into manuel_inceleme_nedeni rather than program around them.
  const missing=[];
  if(!ath.position)missing.push('Pozisyon girilmemiş — pozisyon-hareket vurgusu belirlenemez.');
  else if(pg==='other')missing.push(`Pozisyon "${posOf(ath.position)}" için pozisyon-hareket eşleştirme referansı yok (referans yalnızca basketbol pozisyon gruplarını kapsıyor) — vurgu belirlenemez.`);
  if(!t)missing.push('Kayıtlı test yok — yapısal kademe belirlenemez.');
  else{
    if(!tier.kademe)missing.push('Tarama bataryasının hiçbir maddesi ölçülmemiş — yapısal kademe belirlenemez.');
    else if(tier.olculen<PW_SCREENS.length)missing.push(`Tarama bataryasının ${PW_SCREENS.length-tier.olculen} maddesi ölçülmemiş: ${tier.items.filter(x=>x.seviye==null).map(x=>x.madde).join('; ')} — kademe yalnızca ölçülen maddelere göre belirlendi.`);
  }
  if(!trend.trend_okunabilir)missing.push('Son 14 günde trend okumaya yetecek wellness/RPE kaydı yok — başlangıç hacmi trende göre ayarlanamaz.');
  return{
    sporcu_id:ath.id,
    sporcu_profili:{
      isim:ath.name||null,yas:age,spor:setup.sport||null,
      pozisyon:ath.position?(POS_FULL[ath.position]||ath.position):null,
      pozisyon_grubu:ath.position?posGroupLabel(pg):null,
      takim_seviyesi:age==null?null:(age<18?'youth':'A takım'),
      antrenman_yasi_yil:n(ath.trainingAge),
      seviye_etiketi:ath.levelTag?(LEVEL_LABEL[ath.levelTag]||ath.levelTag):null,
      boy_cm:n(t&&t.height)??n(ath.height),kilo_kg:n(t&&t.weight)??n(ath.weight),
      vucut_yag_yuzde:n(t&&t.bodyFat),kol_acikligi_cm:n(t&&t.wingspan),
    },
    referanslar:{
      hareket_pattern_sozlugu:IV_PATTERNS,
      pozisyon_hareket_eslesmesi:{pozisyon_grubu:ath.position?posGroupLabel(pg):null,
        oyun_talebi:posRef.oyun_talebi,vurgulanacak_paternler:posRef.vurgu,
        koruma_seviyesinde_tutulacak_paternler:posRef.koruma,
        pozisyonun_izlenen_bolgeleri:CA_POS_BIAS[pg]||[]},
      yapisal_kademe_kurallari:{yontem:'Zayıf halka (weakest-link): kademe, ölçülen tarama maddelerinin EN DÜŞÜĞÜ tarafından belirlenir; ortalama alınmaz.',
        tarama_esikleri:PW_SCREENS.map(s=>({madde:s.label,esik:s.cut})),
        kademeler:PW_TIERS.map(x=>({kademe:x.k,etiket:x.label,kural:x.kural,hacim:x.hacim,siddet:x.siddet,karmasiklik:x.karmasiklik,pliometrik_sok:x.sok}))},
      agri_pattern_kurallari:Object.keys(PAIN_RULES).map(k=>({bolge:ctLabel(k),
        yukleyen_paternler:PAIN_RULES[k].hit,yonlendirilen_paternler:PAIN_RULES[k].prefer})),
    },
    tarama_bataryasi:{test_tarihi:t?t.date:null,maddeler:tier.items},
    hesaplanan_kademe:tier.kademe?(()=>{const r=pwTierRow(tier.kademe)||{};
      return{kademe:tier.kademe,etiket:r.label,zayif_halka:tier.zayif_halka,olculen_madde:tier.olculen,
        taban_cizgisi:{hacim:r.hacim,siddet:r.siddet,karmasiklik:r.karmasiklik,pliometrik_sok:r.sok}};})():null,
    performans_testleri:t?{
      test_tarihi:t.date,
      dikey_sicrama_cm:n(t.verticalJump),cmj_cm:n(t.cmj),squat_jump_cm:n(t.squatJump),
      drop_jump_rsi:n(t.dropJump),yatay_sicrama_cm:n(t.horizontalJump),
      lateral_cmj_cm:{sag:n(t.lateralCmj&&t.lateralCmj.right),sol:n(t.lateralCmj&&t.lateralCmj.left)},
      sprint_20m_sn:n(t.sprint20m&&t.sprint20m.time),t_test_sn:n(t.tTest),sprint_5_0_5_sn:n(t.fiveZeroFive),
      shuttle_sn:n(t.shuttleRun),
      y_balance_kompozit_yuzde:{sag:yb.compR??null,sol:yb.compL??null},
      ohs_kompensasyonlari:((t.ohs&&t.ohs.problems)||[]).filter(Boolean),
      postur_notlari:(t.posture&&t.posture.observations)||null,
      test_notlari:t.notes||null,
    }:null,
    agri_durumu:pain,
    wellness_rpe_trendi:trend,
    egzersiz_kutuphanesi:Object.keys(lib).length?lib:null,
    eksik_veriler:missing,
  };
}

/* Same extraction the Program Design Assistant uses (fences, stray prose, a reply
   truncated at the token cap), validated against THIS module's schema. */
function pwParse(text){
  let s=(text||'').trim();
  const fence=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(fence)s=fence[1].trim();
  const a=s.indexOf('{');
  if(a===-1)throw new Error('Model yanıtında JSON bulunamadı — tekrar dene.');
  const body=s.slice(a);
  const b=body.lastIndexOf('}');
  let obj=null,cut=false;
  if(b>0){try{obj=JSON.parse(body.slice(0,b+1));}catch(e){}}
  if(!obj){const rep=pdaRepair(body);if(rep){try{obj=JSON.parse(rep);cut=true;}catch(e){}}}
  if(!obj)throw new Error('Model geçersiz JSON döndürdü — tekrar dene.');
  if(!Array.isArray(obj.program_gunleri))throw new Error('Yanıt beklenen formatta değil ("program_gunleri" listesi yok) — tekrar dene.');
  obj.program_gunleri=obj.program_gunleri
    .filter(d=>d&&typeof d==='object')
    .map(d=>({...d,egzersizler:(Array.isArray(d.egzersizler)?d.egzersizler:[])
      .filter(e=>e&&typeof e==='object'&&String(e.ad||'').trim())}))
    .filter(d=>d.egzersizler.length);
  if(!obj.program_gunleri.length)
    throw new Error(cut?'Model yanıtı yarıda kesildi ve tam bir gün üretemedi — tekrar dene.':'Yanıtta egzersiz içeren bir program günü yok — tekrar dene.');
  obj.haric_tutulan_paternler=(Array.isArray(obj.haric_tutulan_paternler)?obj.haric_tutulan_paternler:[])
    .filter(x=>x&&String(x).trim()&&String(x)!=='null').map(String);
  obj.manuel_inceleme_gerekli=!!obj.manuel_inceleme_gerekli;
  if(cut)obj.kesildi=true;
  return obj;
}

/* The Program tab. Not mounted anywhere at the moment — the athlete's tab bar carries
   Performance Data in its place, and a programme is written on the Individualization
   screen, onto the athlete's own calendar, rather than read off a tab. Kept whole, the
   way RecommendsTab below is, so it can be put back on a tab without rebuilding it.
   Like the assistant coach, nothing here writes to a calendar: the microcycle is stored
   on the athlete and read on screen. */
function ProgramWriterTab({ath,updAth,setup,ai,exercises}){
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const pw=ath.programWriter||null;
  const provider=aiProviderOf(ai);
  const apiKey=aiKeyOf(ai);
  const model=aiModelOf(ai);
  const write=async()=>{
    if(busy||!apiKey)return;setErr('');setBusy(true);
    try{
      const input=buildProgramWriterInput(ath,setup,exercises);
      const msgs=[{role:'user',content:'Aşağıdaki sporcu verisi ve referans tabloları için sıfırdan bir haftalık antrenman programı yaz. Referans kurallarını yalnızca aşağıdan al, hiçbirini uydurma. "eksik_veriler" içindeki her maddeyi manuel_inceleme_nedeni alanına taşı ve o kararı atla. SADECE istenen JSON şemasında yanıt ver.\n\n'+JSON.stringify(input,null,2)}];
      const ask=()=>provider==='anthropic'
        ?askCoach(apiKey,model,PROGRAM_WRITER_SYSTEM,msgs,{maxTokens:16000})
        :askGemini(apiKey,model,PROGRAM_WRITER_SYSTEM,msgs,{maxTokens:16000,json:true,thinkingBudget:0,temperature:0.4});
      // A formatting slip is retried once; an API error (401/429) propagates as is.
      const ans=await ask();
      let data;
      try{data=pwParse(ans);}
      catch(e){data=pwParse(await ask());}
      updAth(ath.id,{programWriter:{data,input,at:Date.now(),provider,model}});
    }catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);}
  };
  if(!apiKey)return(<div className="rec-empty">
    <div className="rec-empty-ic">◫</div>
    <h3>{L('Program Yazıcı için API anahtarı gerekiyor','The Program Writer needs an API key')}</h3>
    <p>{L(<>Bu sekme sporcunun <b>pozisyonu, tarama bataryası, güncel ağrı bildirimi ve son 7-14 günün wellness/RPE trendini</b> okuyup sıfırdan bir haftalık program yazar. Kullanmak için sağ alttaki <b>✨ AI Coach Assistant</b>'ı açıp bir API anahtarı gir — <b>Gemini ücretsizdir</b>. Anahtar hesabınla senkronlanır.</>,
      <>This tab reads the athlete's <b>position, screening battery, current pain report and the last 7-14 days of wellness / RPE trend</b> and writes a week's programme from scratch. To use it, open the <b>✨ AI Coach Assistant</b> at the bottom right and enter an API key — <b>Gemini is free</b>. The key syncs with your account.</>)}</p>
  </div>);
  const d=pw&&pw.data;
  const tierCls=d?(/1/.test(String(d.yapisal_kademe))?'k1':/2/.test(String(d.yapisal_kademe))?'k2':/3/.test(String(d.yapisal_kademe))?'k3':'na'):'na';
  return(<div className="rec-wrap">
    <div className="rec-bar">
      <div className="rec-bar-l">
        <div className="rec-bar-t">◫ {L('Program Yazıcı','Program Writer')}</div>
        <div className="rec-bar-s">{pw?L(`Yazıldı: ${new Date(pw.at).toLocaleString('tr-TR')} · ${pw.model}`,`Written: ${new Date(pw.at).toLocaleString('en-GB')} · ${pw.model}`)
          :L('Pozisyon · tarama bataryası · ağrı · 7-14 gün trendi → sıfırdan haftalık program','Position · screening battery · pain · 7-14 day trend → a week’s programme from scratch')}</div>
      </div>
      <button className="btn sm" disabled={busy} onClick={write}>{busy?L('Yazılıyor…','Writing…'):(pw?L('↻ Yeniden yaz','↻ Rewrite'):L('◫ Program yaz','◫ Write programme'))}</button>
    </div>
    {err&&<div className="rec-err">⚠ {err}</div>}
    {busy&&!pw&&<div className="rec-loading"><div className="rec-spin"/><div>{L('Tarama bataryası okunuyor, kademe belirleniyor, paternler eşleştiriliyor…','Reading the screening battery, setting the tier, matching the patterns…')}</div></div>}
    {d&&<div className={'pda-card'+(busy?' dim':'')}>
      {d.kesildi&&<div className="rec-err">⚠ {L(<>Model yanıtı token sınırında kesildi — aşağıda yalnızca tamamlanan günler var. Tam program için <b>↻ Yeniden yaz</b> deneyin.</>,
        <>The model's answer was cut off at the token limit — only the days it finished are below. Try <b>↻ Rewrite</b> for the full programme.</>)}</div>}
      {d.manuel_inceleme_gerekli&&<div className="pda-flag"><span className="ic">🚩</span><div><b>{L('Manuel inceleme gerekli:','Manual review required:')}</b> {d.manuel_inceleme_nedeni||L('Gerekçe belirtilmedi.','No reason given.')}</div></div>}
      <div className={'pw-tier '+tierCls}>
        <div className="pw-tier-b">{d.yapisal_kademe||L('kademe belirlenemedi','tier not determined')}</div>
        <div className="pw-tier-w"><b>{L('Kademe gerekçesi:','Why this tier:')}</b> {d.kademe_gerekcesi||'—'}</div>
      </div>
      {d.genel_ozet&&<div className="pda-summary"><b>{L('Özet:','Summary:')}</b> {d.genel_ozet}</div>}
      <div className="pw-days">
        {d.program_gunleri.map((day,i)=>(<div key={i} className="pw-day">
          <div className="pw-day-h">
            <span className="pw-day-t">{day.gun_etiketi||L(`Gün ${i+1}`,`Day ${i+1}`)}</span>
            <span className="pw-day-n">{day.egzersizler.length} {L('egzersiz','exercises')}</span>
          </div>
          {day.egzersizler.map((e,j)=>(<div key={j} className="pw-row">
            <div className="pw-row-i">{j+1}.</div>
            <div className="pw-row-m">
              <div className="pw-row-n">{e.ad}</div>
              <div className="pw-row-d">
                {e.set_tekrar&&<span className="pw-dose">{e.set_tekrar}</span>}
                {e.yuk_siddet&&<span className="pw-dose">{e.yuk_siddet}</span>}
                {e.hareket_pattern_tag&&<span className="pw-tag">🎯 {e.hareket_pattern_tag}</span>}
              </div>
              {e.kisa_not&&e.kisa_not!=='null'&&<div className="pw-note">{e.kisa_not}</div>}
            </div>
          </div>))}
        </div>))}
      </div>
      {d.haric_tutulan_paternler.length>0&&<div className="pw-excl">
        <b>{L('Hariç tutulan / hacmi azaltılan paternler:','Patterns excluded or cut back:')}</b>
        {d.haric_tutulan_paternler.map((p,i)=><span key={i} className="pw-chip">{p}</span>)}
      </div>}
      {pw.input&&<details className="pda-details"><summary>📄 {L('Programda kullanılan veri ve referanslar (JSON)','The data and reference tables the programme was written from (JSON)')}</summary><pre>{JSON.stringify(pw.input,null,2)}</pre></details>}
      <div className="rec-foot">{L('Bu program gerekçeli bir öneridir, kesin talimat değildir — nihai karar antrenöre aittir. Ağrı veya klinik bulguda fizyoterapiste yönlendirin.','This programme is a reasoned suggestion, not an instruction — the final call is the coach\'s. Refer pain or any clinical finding to a physiotherapist.')}</div>
    </div>}
    {!pw&&!busy&&<div className="rec-hint">{L(
      <>Henüz program yazılmadı. Yukarıdaki <b>◫ Program yaz</b> düğmesi sporcunun dört girdisini okur: <b>pozisyonu</b> (hareket paterni vurgusu), <b>tarama bataryası + performans testleri</b> (zayıf halka kuralıyla yapısal kademe — hacim ve karmaşıklık taban çizgisi), <b>güncel ağrı bildirimi</b> (bölgeyi yükleyen paternler çıkarılır) ve <b>son 7-14 günün wellness/RPE trendi</b> (birikmiş yorgunlukta başlangıç hacmi muhafazakâr tutulur). Kurallar uydurulmaz: pozisyon eşleştirmesi, kademe eşikleri ve ağrı-patern haritası referans tablo olarak gönderilir; eksik girdi programlanmaz, <b>manuel inceleme</b> notuna düşer. Egzersizler kütüphanenle sınırlı değildir.</>,
      <>No programme written yet. The <b>◫ Write programme</b> button above reads four inputs: the athlete's <b>position</b> (which movement patterns to emphasise), the <b>screening battery + performance tests</b> (the structural tier by the weakest-link rule — the volume and complexity baseline), the <b>current pain report</b> (patterns that load the painful region are taken out) and the <b>last 7-14 days of wellness / RPE trend</b> (a conservative starting volume when fatigue has accumulated). No rule is invented: the position mapping, the tier cut-offs and the pain-to-pattern map are sent as reference tables, and a missing input is not programmed around — it lands in the <b>manual review</b> note. Exercises are not limited to your library.</>)}</div>}
  </div>);
}

