/* =========================================================
   PROGRAM DESIGN ASSISTANT — analyses the athlete's profile
   (anthropometrics, tests, movement screen, questionnaires)
   and returns prioritized, justified exercise suggestions
   as structured JSON. Lives in the Recommendations tab.
   ========================================================= */
const PROGRAM_DESIGN_SYSTEM=`CoachOS — Program Design Assistant

ROL
Sen CoachOS platformunda çalışan bir "Program Design Assistant" modülüsün. Görevin, bir sporcunun profil verilerini (antropometrik ölçümler, performans testleri, hareket taraması ve anket sonuçları) analiz ederek, o sporcunun kısıtlı veya zayıf yönlerini geliştirecek, gerekçelendirilmiş egzersiz önerileri sunmaktır. Sen bir antrenörün asistanısın, nihai kararı her zaman antrenör verir — bu yüzden önerilerini "kesin talimat" değil "gerekçeli öneri" olarak sun.

GİRDİ VERİSİ
Sana kullanıcı mesajında aşağıdaki formatta bir JSON objesi verilecek. Alanlardan bazıları boş/null olabilir — eksik veriyi "değerlendirilemedi" olarak işaretle, asla varsayımla doldurma. Şemada listelenmeyen ek alanlar da gelebilir (ör. ek_testler, wellness_detay) — bunları da değerlendirmeye kat.

{
  "sporcu_profili": {
    "isim": "string",
    "yas": "number",
    "pozisyon": "string (Guard/Forward/Center)",
    "takim_seviyesi": "youth | A takım",
    "sakatlik_gecmisi": ["string"]
  },
  "antropometrik_olcumler": {
    "boy_cm": "number",
    "kilo_kg": "number",
    "vucut_yag_yuzde": "number",
    "kol_acikligi_cm": "number",
    "bacak_uzunlugu_cm": "number",
    "cevre_olcumleri": { "uyluk": "number", "baldir": "number", "...": "number" }
  },
  "performans_testleri": {
    "dikey_sicrama_cm": "number",
    "sprint_10m_sn": "number",
    "sprint_20m_sn": "number",
    "pro_agility_sn": "number",
    "ohs_skoru": "string/number + gözlemlenen kompensasyon paternleri",
    "aslr_skoru": { "sag": "number", "sol": "number" },
    "ayak_bilegi_dorsifleksiyon_derece": { "sag": "number", "sol": "number" }
  },
  "anketler": {
    "wellness_skoru": "number",
    "readiness_skoru": "number",
    "sRPE_son_7_gun": "number",
    "acwr": "number",
    "agri_bolgesi_bildirimi": ["string"]
  }
}

VÜCUT TİPİ ÇERÇEVESİ (varsa egzersiz seçimi ve yükleme bununla uyumlu olsun)
- Cheetah: yağsız/elastik yapı, kısa yer temas süresi → hafif-orta yük + pliometrik ağırlıklı; aşırı ağır kaldırma hızını köreltebilir.
- Rhino: büyük çerçeve, yüksek kas kütlesi, uzun yer temas süresi → ağır kuvvet çalışmasına iyi yanıt verir.
- Horse: kas kütlesi + elastikiyet dengeli → hem kuvvet hem pliometrik çalışmaya yanıt verir; esnek programlama.
- Rabbit: düşük rölatif kuvvet, genellikle genç/erken antrenman yaşı → ağır yük veya yoğun pliometrik ÖNCESİ temel kuvvet ve teknik önceliği.

GÖREV SIRASI
1. Veri taraması: Tüm alanları oku. Eksik/null alanları not et, onlar hakkında öneri üretme.
2. Asimetri ve norm karşılaştırması: Sağ-sol farkları (ör. ASLR, dorsifleksiyon derecesi) %10 ve üzeri ise işaretle. Eğer normatif referans aralığı sağlanmamışsa, sporcunun yaş/pozisyon grubuna göre genel kabul görmüş kabaca aralıklarla kıyasla ve bunu "yaklaşık referans" olarak belirt — kesin klinik norm gibi sunma.
3. Önceliklendirme: Bulguları şu sırayla sırala:
   - Yüksek: yaralanma riski taşıyan asimetri/kompensasyon paterni veya ağrı bildirimi
   - Orta: performansı doğrudan sınırlayan zayıflık (ör. düşük dikey sıçrama + zayıf RFD göstergesi)
   - Düşük: gelişim potansiyeli olan ama acil olmayan alan
4. Egzersiz seçimi — SADECE İKİ KATEGORİ, TOPLAM 6 EGZERSİZ ("oneriler" dizisi):
   - mobilizasyon: TAM 3 egzersiz. Eklem hareket açıklığı / doku kısıtlılığına yönelik çalışmalar (ör. dorsifleksiyon kısıtı için yüklü ayak bileği mobilizasyonu).
   - stabilizasyon: TAM 3 egzersiz. Motor kontrol, denge ve eklem stabilitesine yönelik çalışmalar (ör. Y-Balance asimetrisi veya OHS kompensasyonları için).
   - Daha fazla veya daha az egzersiz verme; 3+3 sayısı kesindir. "oneriler" dizisine ASLA kuvvet kategorisinde bir egzersiz koyma — kuvvet 5. adımda yalnızca yorum olarak ele alınır.
   - Bu 6 yeri hak eden bölgeleri seç: en yüksek öncelikli bulgudan (ağrı, kompensasyon paterni, %10+ asimetri, belirgin ROM kısıtı) başlayarak aşağı doğru in. Sınırlı 6 slotu, sporcunun gerçek limitleyicilerine harca — herkese uyan genel bir liste yazma.
   - Mümkün olduğunca farklı eklem/bölgeleri kapsa (ayak bileği, diz, kalça, gövde/core, omuz); aynı bölgeye ikinci bir slot ancak bulgu gerçekten güçlüyse ayrılır.
   - Egzersiz seçiminde herhangi bir kütüphane veya listeyle sınırlı DEĞİLSİN — sporcunun ihtiyacına en uygun egzersizi serbestçe öner; seçim spesifik olsun (varyasyon, taraf, ekipman), genel kategori adı yazma.
   - Bulgusu olan bölgede önceliği bulguya göre belirle (yüksek/orta) ve önerini o veriye dayandır. Yeterli bulgu yoksa pozisyon/yaşa dayalı DÜŞÜK öncelikli bir seçim yap ve dayanak_veri alanına bunun genel profile dayandığını açıkça yaz. Test değeri uydurma.
5. Kuvvet görüşü — EGZERSİZ DEĞİL, YORUM ("kuvvet_gorusu" dizisi): Kuvvet için egzersiz reçetesi YAZMA. Bunun yerine 3-5 maddelik, bir spor bilimcinin antrenöre sunacağı türden gerekçeli bir değerlendirme yaz: hangi bölge/kalite neden geliştirilmeli, bu yargı hangi ölçüme dayanıyor, geliştirilirse performansa ve sakatlık riskine nasıl yansır.
   - Her maddeyi somut bir sayıya bağla (ör. "dikey sıçrama 41 cm, 20 m 3.21 sn — sıçrama düşükken sprintin görece iyi olması konsantrik kalça ekstansiyon kuvvetinden çok elastik dönüşüme yaslandığını düşündürüyor").
   - Mekanizmayı açıkla: kuvvet-hız eğrisinin neresi, hangi kas grubu / kasılma tipi, hangi kısıt (RFD, maksimal kuvvet, rölatif kuvvet, eksantrik kapasite, tek bacak kuvvet farkı) ve bunun sahadaki karşılığı ne.
   - programlama_yonu alanında yalnızca yükleme mantığını ver (vurgu, yoğunluk aralığı, kasılma tipi, haftalık sıklık, periyodizasyon içindeki yeri). Egzersiz ADI YAZMA — squat, RDL, bench press gibi hareket isimleri bu alanda geçmemeli.
   - Yedi hareket paternini tek tek doldurma zorunluluğun YOK; sporcunun verisinin işaret ettiği kaliteleri seç. Bir madde belirli bir paternle ilgiliyse hareket_paterni alanını doldur, değilse null bırak.
   - Veri zayıfsa bunu dürüstçe yaz ("bu yargıyı desteklemek için üst ekstremite kuvvet verisi yok — öncelikle şu ölçüm alınmalı") ve maddeyi düşük öncelikli tut.
6. Gerekçelendirme: Hem egzersiz önerilerinde hem kuvvet görüşünde hangi veri noktasına dayandığını, fizyolojik/biyomekanik mekanizmayı ve beklenen çıktıyı açıkça belirt. Genel geçer cümle kurma — her yargı bu sporcunun verisinden türemiş olmalı.

ÇIKTI FORMATI
Sadece aşağıdaki JSON formatında yanıt ver, başka metin ekleme (markdown kod bloğu da ekleme):

{
  "sporcu_ozeti": "1-2 cümlelik genel durum özeti",
  "kirmizi_bayrak": "varsa; persistan ağrı, >%20 asimetri gibi durumlarda fizyoterapiste yönlendirme notu, yoksa null",
  "oneriler": [
    {
      "oncelik": "yüksek | orta | düşük",
      "kategori": "mobilizasyon | stabilizasyon",
      "hedef_eklem": "ayak bileği | diz | kalça | gövde/core | omuz | genel",
      "tespit_edilen_kisitlilik": "string",
      "dayanak_veri": "hangi test/ölçüm sonucuna dayandığı — sayısal değeriyle birlikte",
      "onerilen_egzersiz": "spesifik egzersiz adı (varyasyon/taraf/ekipman dahil)",
      "gerekce": "neden bu egzersiz — mekanizma açıklaması",
      "set_tekrar_yuk_onerisi": "string",
      "notlar": "varsa uyarı, ilerleme kriteri"
    }
  ],
  "kuvvet_gorusu": [
    {
      "oncelik": "yüksek | orta | düşük",
      "hedef_bolge": "geliştirilmesi gereken bölge/kalite (ör. posterior zincir — kalça ekstansörleri)",
      "hareket_paterni": "ilgiliyse: yatay itiş | yatay çekiş | dikey itiş | dikey çekiş | diz dominant | kalça dominant | core — değilse null",
      "dayanak_veri": "hangi test/ölçüm/anket sonucuna dayandığı — sayısal değeriyle birlikte",
      "neden": "spor bilimci yorumu: bu bölge neden geliştirilmeli — fizyolojik/biyomekanik mekanizma ve bulguyla ilişkisi",
      "performansa_etkisi": "geliştirilirse hangi performans çıktısına ve sakatlık riskine nasıl yansır",
      "programlama_yonu": "yükleme mantığı: vurgu, yoğunluk aralığı, kasılma tipi, haftalık sıklık — EGZERSİZ ADI YOK"
    }
  ]
}

KISITLAR
- Tanı koyma; sadece antrenman/egzersiz odaklı öneri ver. Ağrı veya klinik bulgu varsa fizyoterapiste yönlendirme öner, tedavi önerme.
- Youth takım sporcularında yaşa uygun yük ve teknik/koordinasyon önceliğini gözet; A takım sporcularında performans limitleyici faktörlere daha fazla ağırlık ver.
- Sadece verilen veriye dayan — sağlanmayan bir test sonucunu varsayma veya uydurma. Veri olmayan bölge için verilen genel profil önerilerinde bunu dayanak_veri alanında açıkça belirt.
- "oneriler" dizisinde TAM 6 öğe olacak: 3 mobilizasyon + 3 stabilizasyon. Kuvvet kategorisinde egzersiz YOK.
- Kuvvet yalnızca "kuvvet_gorusu" dizisinde, 3-5 maddelik gerekçeli yorum olarak yer alır; bu maddelerde egzersiz adı, set/tekrar reçetesi verme.
- Egzersizler herhangi bir kütüphanede bulunmak zorunda değil — sporcunun ihtiyacına göre serbestçe seç.
- ACWR yüksekse (>1.5) veya readiness düşükse, yeni yük ekleyen önerilerde ve kuvvet görüşünde temkinli ol; bunu notlarda / programlama_yonu alanında belirt.
- Kanıta dayalı, spekülatif olmayan öneriler ver; seçim ve yorumları güncel S&C literatürüyle tutarlı tut. Kesinlik iddiası taşıyan cümlelerden kaçın; veri zayıfsa yargının sınırını belirt.
- Antrenörün sahada hızlıca okuyup uygulayabileceği net, profesyonel bir dil kullan — süslü ifade değil, ölçüme bağlı gerekçe.

TON
Antrenör diline uygun, teknik ama gösterişsiz. Akademik jargon yerine uygulanabilir, doğrudan ifadeler tercih et.`;

// Builds the Program Design Assistant input JSON from the athlete's stored
// data, following the module's input schema. Missing values stay null so the
// model marks them "değerlendirilemedi" instead of guessing.
function buildProgramDesignInput(ath,setup){
  const n=recNum;
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  // Latest dated value for a field across measurements + tests, falling back to the static profile.
  const pull=k=>{
    const src=[...(ath.measurements||[]),...(ath.tests||[])].filter(x=>x.date&&n(x[k])!=null).sort((a,b)=>a.date.localeCompare(b.date));
    return src.length?n(src[src.length-1][k]):n(ath[k]);
  };
  const ts=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=ts.length?ts[ts.length-1]:null;
  const injuries=[...(ath.injuries||[])].sort((a,b)=>(a.date||'').localeCompare(b.date||''))
    .map(i=>{const parts=[i.date||'',i.location||i.type||'sakatlık',i.side?`(${i.side})`:'',i.tissueType||'',i.grade?`Grade ${i.grade}`:'',i.actualReturn?'— iyileşti':'— AKTİF'];return parts.filter(Boolean).join(' ');});
  const circ=(t&&t.circ)||{};
  const cevre={};
  [['thighRight','uyluk_sag'],['thighLeft','uyluk_sol'],['calfRight','baldir_sag'],['calfLeft','baldir_sol'],['shoulder','omuz'],['waist','bel'],['hip','kalca']]
    .forEach(([k,lbl])=>{const v=n(circ[k]);if(v!=null)cevre[lbl]=v;});
  const yb=t?ybCalc(t.yBalance):{};
  const ohsProblems=t?((t.ohs&&t.ohs.problems)||[]).filter(Boolean):[];
  const ohs=(t&&t.ohs&&t.ohs.score!==''&&t.ohs.score!=null)
    ?`${t.ohs.score}/3${ohsProblems.length?` — kompensasyonlar: ${ohsProblems.join('; ')}`:''}`:null;
  // Questionnaires — last 14 days of wellness check-ins around the athlete's latest data date.
  const ref=athLatestDate(ath);
  const recent=(ath.wellness||[]).filter(w=>w.date&&w.date>=fmt(addD(parseD(ref),-13))&&w.date<=ref).sort((a,b)=>a.date.localeCompare(b.date));
  const avg=f=>{const v=recent.map(w=>n(w[f])).filter(x=>x!=null);return v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):null;};
  const last=recent.length?recent[recent.length-1]:null;
  const pains=[];
  recent.forEach(w=>{const p=painSummary(w);if(p)pains.push(`${w.date}: ${p}`);});
  (ath.injuries||[]).filter(i=>!i.actualReturn).forEach(i=>{pains.push(`aktif sakatlık: ${i.location||i.type||'?'}${i.side?` (${i.side})`:''}`);});
  const acwr=athACWR(ath,ref);
  return{
    sporcu_profili:{
      isim:ath.name||null,
      yas:age,
      pozisyon:posOf(ath.position)||null,
      takim_seviyesi:age==null?null:(age<18?'youth':'A takım'),
      sakatlik_gecmisi:injuries,
    },
    antropometrik_olcumler:{
      boy_cm:pull('height'),
      kilo_kg:pull('weight'),
      vucut_yag_yuzde:pull('bodyFat'),
      kol_acikligi_cm:pull('wingspan'),
      bacak_uzunlugu_cm:n(t&&t.legLength)??n(t&&t.yBalance&&t.yBalance.limbLength),
      oturma_yuksekligi_cm:n(t&&t.sittingHeight),
      cevre_olcumleri:Object.keys(cevre).length?cevre:null,
    },
    performans_testleri:{
      test_tarihi:t?t.date:null,
      dikey_sicrama_cm:t?n(t.verticalJump):null,
      sprint_10m_sn:null,
      sprint_20m_sn:t?n(t.sprint20m&&t.sprint20m.time):null,
      pro_agility_sn:null,
      ohs_skoru:ohs,
      aslr_skoru:{sag:t?n(t.aslr&&t.aslr.right):null,sol:t?n(t.aslr&&t.aslr.left):null},
      ayak_bilegi_dorsifleksiyon_derece:{sag:t?n(t.ankleDF&&t.ankleDF.right):null,sol:t?n(t.ankleDF&&t.ankleDF.left):null},
      ek_testler:t?{
        cmj_cm:n(t.cmj),
        lateral_cmj_cm:{sag:n(t.lateralCmj&&t.lateralCmj.right),sol:n(t.lateralCmj&&t.lateralCmj.left)},
        squat_jump_cm:n(t.squatJump),
        drop_jump_rsi:n(t.dropJump),
        yatay_sicrama_cm:n(t.horizontalJump),
        t_test_ceviklik_sn:n(t.tTest),
        sprint_5_0_5_sn:n(t.fiveZeroFive),
        y_balance_kompozit_yuzde:{sag:yb.compR??null,sol:yb.compL??null},
        postur_notlari:(t.posture&&t.posture.observations)||null,
        ohs_notlari:(t.ohs&&t.ohs.observations)||null,
      }:null,
    },
    anketler:{
      wellness_skoru:avg('readiness'),
      readiness_skoru:last?n(last.readiness):null,
      sRPE_son_7_gun:athLoadSum(ath,fmt(addD(parseD(ref),-6)),ref)||null,
      acwr:acwr?+acwr.toFixed(2):null,
      agri_bolgesi_bildirimi:pains,
      wellness_detay:recent.length?{
        son_14_gun_checkin_sayisi:recent.length,
        ortalama_yorgunluk_5:avg('fatigue'),
        ortalama_zihinsel_yorgunluk_5:avg('mentalFatigue'),
        ortalama_fiziksel_yorgunluk_5:avg('physicalFatigue'),
        ortalama_agri_5:avg('soreness'),
        ortalama_uyku:avg('sleep'),
        ortalama_rhr_bpm:avg('RHR'),
        son_checkin_tarihi:last.date,
      }:null,
    },
  };
}
// Repairs JSON cut off mid-answer (model hit its token cap): drops the unfinished
// tail back to the last completed value and closes every bracket still open.
// Returns null when there is nothing complete enough to salvage.
function pdaRepair(src){
  let inStr=false,esc=false;const stack=[];let cut=-1,cutStack=null;
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue;}
    if(c==='"'){inStr=true;continue;}
    if(c==='{'||c==='[')stack.push(c==='{'?'}':']');
    else if(c==='}'||c===']'){stack.pop();cut=i+1;cutStack=stack.slice();}
  }
  if(cut===-1||!cutStack||!cutStack.length)return null;
  return src.slice(0,cut)+cutStack.reverse().join('');
}
// Extracts the JSON object from a model reply (tolerates ``` fences / stray text).
function pdaParse(text){
  let s=(text||'').trim();
  const fence=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(fence)s=fence[1].trim();
  const a=s.indexOf('{');
  if(a===-1)throw new Error('Model yanıtında JSON bulunamadı — tekrar dene.');
  const body=s.slice(a);
  const b=body.lastIndexOf('}');
  let obj=null,cut=false;
  if(b>0){try{obj=JSON.parse(body.slice(0,b+1));}catch(e){}}
  // The requested answer is long, so replies sometimes arrive truncated —
  // salvage the complete part rather than throwing the whole analysis away.
  if(!obj){const rep=pdaRepair(body);if(rep){try{obj=JSON.parse(rep);cut=true;}catch(e){}}}
  if(!obj)throw new Error('Model geçersiz JSON döndürdü — tekrar dene.');
  if(!Array.isArray(obj.oneriler))throw new Error('Yanıt beklenen formatta değil ("oneriler" listesi yok) — tekrar dene.');
  const items=obj.oneriler.filter(r=>r&&typeof r==='object'&&(r.onerilen_egzersiz||r.tespit_edilen_kisitlilik));
  const byPrio=a=>[...a].sort((x,y)=>pdaPrio(x.oncelik).rank-pdaPrio(y.oncelik).rank);
  const cap=id=>byPrio(items.filter(r=>(pdaCat(r.kategori)||{}).id===id)).slice(0,PDA_MAX_EX);
  // Exercises are mobilization + stabilization only, PDA_MAX_EX each. Strength is
  // delivered as reasoned commentary (kuvvet_gorusu), so any strength exercise the
  // model slips into the list is dropped; uncategorised items keep the "Diğer" fallback.
  obj.oneriler=[...cap('mob'),...cap('stab'),...byPrio(items.filter(r=>!pdaCat(r.kategori)))];
  obj.kuvvet_gorusu=(Array.isArray(obj.kuvvet_gorusu)?obj.kuvvet_gorusu:[])
    .filter(r=>r&&typeof r==='object'&&(r.hedef_bolge||r.neden));
  if(!obj.oneriler.length&&!obj.kuvvet_gorusu.length)
    throw new Error(cut?'Model yanıtı yarıda kesildi ve öneri üretemedi — tekrar dene.':'Yanıtta değerlendirilebilir öneri yok — tekrar dene.');
  if(cut)obj.kesildi=true;
  return obj;
}
function pdaPrio(p){
  const s=(p||'').toString().toLowerCase();
  if(/y[uü]ksek|high/.test(s))return{cls:'high',lbl:'YÜKSEK',rank:0};
  if(/d[uü][sş][uü]k|low/.test(s))return{cls:'low',lbl:'DÜŞÜK',rank:2};
  return{cls:'mid',lbl:'ORTA',rank:1};
}
// Exercise sections shown in the result. Strength is intentionally absent: it is
// reported as commentary, not exercises — the 'str' entry only classifies replies
// (so strength exercises can be filtered out) and renders older stored analyses.
const PDA_MAX_EX=3;
const PDA_CATS=[
  {id:'mob',ic:'🧘',lbl:'Mobilizasyon',desc:'Eklem hareket açıklığı / doku kısıtlılığı çalışmaları',re:/mobili|mobility|streç|stret|germe/},
  {id:'str',ic:'🏋️',lbl:'Kuvvet',desc:'Kuvvet çalışmaları (önceki analiz)',re:/kuvvet|strength|g[uü][cç]|power/},
  {id:'stab',ic:'⚖️',lbl:'Stabilizasyon',desc:'Motor kontrol, denge ve eklem stabilitesi çalışmaları',re:/stabili|denge|balance|motor/},
];
function pdaCat(c){
  const s=(c||'').toString().toLowerCase();
  return PDA_CATS.find(k=>k.re.test(s))||null;
}
// Strength movement patterns — canonical labels + display order for the Kuvvet section.
const PDA_PATTERNS=[
  {re:/yatay.*it|horizontal.*push/,lbl:'Yatay İtiş'},
  {re:/yatay.*[cç]ek|horizontal.*pull/,lbl:'Yatay Çekiş'},
  {re:/dikey.*it|vertical.*push/,lbl:'Dikey İtiş'},
  {re:/dikey.*[cç]ek|vertical.*pull/,lbl:'Dikey Çekiş'},
  {re:/diz|knee|quad/,lbl:'Diz Dominant'},
  {re:/kal[cç]a|hip|hinge/,lbl:'Kalça Dominant'},
  {re:/core|g[oö]vde/,lbl:'Core'},
];
function pdaPat(s){
  const t=(s||'').toString().toLowerCase();
  if(!t||t==='null')return null;
  const i=PDA_PATTERNS.findIndex(p=>p.re.test(t));
  return i===-1?{rank:PDA_PATTERNS.length,lbl:s}:{rank:i,lbl:PDA_PATTERNS[i].lbl};
}
// Minimal Markdown → HTML for rendering the recommendation nicely.
function recMd(src){
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  const lines=(src||'').replace(/\r/g,'').split('\n');let html='',list=null;
  const closeList=()=>{if(list){html+=`</${list}>`;list=null;}};
  for(const ln of lines){
    const t=ln.trim();
    if(!t){closeList();continue;}
    let m;
    if(m=t.match(/^#{1,3}\s+(.*)/)){closeList();html+=`<h3>${inline(m[1])}</h3>`;continue;}
    if(m=t.match(/^#{4,6}\s+(.*)/)){closeList();html+=`<h4>${inline(m[1])}</h4>`;continue;}
    if(m=t.match(/^[-*•]\s+(.*)/)){if(list!=='ul'){closeList();list='ul';html+='<ul>';}html+=`<li>${inline(m[1])}</li>`;continue;}
    if(m=t.match(/^\d+[.)]\s+(.*)/)){if(list!=='ol'){closeList();list='ol';html+='<ol>';}html+=`<li>${inline(m[1])}</li>`;continue;}
    closeList();html+=`<p>${inline(t)}</p>`;
  }
  closeList();return html;
}

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

/* Compact "Development" progression mini-charts (one per metric over time). */
function DevelopmentCharts({tests}){
  const ts=[...(tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(ts.length<1)return null;
  const labels=ts.map(t=>{const d=parseD(t.date);return MN[d.getMonth()];});
  const cards=[
    {t:'Vertical Jump',u:'cm',f:t=>Number(t.verticalJump),up:true,col:'#0080dc',dot:'#0094ff'},
    {t:'CMJ',u:'cm',f:t=>Number(t.cmj),up:true,col:'#f97316',dot:'#fb923c'},
    {t:'Lateral CMJ — R',u:'cm',f:t=>Number(t.lateralCmj?.right),up:true,col:'#a855f7',dot:'#c084fc'},
    {t:'Lateral CMJ — L',u:'cm',f:t=>Number(t.lateralCmj?.left),up:true,col:'#a855f7',dot:'#c084fc'},
    {t:'Squat Jump',u:'cm',f:t=>Number(t.squatJump),up:true,col:'#eab308',dot:'#facc15'},
    {t:'Horizontal Jump',u:'cm',f:t=>Number(t.horizontalJump),up:true,col:'#10b981',dot:'#34d399'},
    {t:'20m Sprint',u:'s',f:t=>Number(t.sprint20m?.time),up:false,col:'#7c3aed',dot:'#a78bfa'},
    {t:'T-Agility',u:'s',f:t=>Number(t.tTest),up:false,col:'#ec4899',dot:'#f472b6'},
    {t:'5-0-5',u:'s',f:t=>Number(t.fiveZeroFive),up:false,col:'#f43f5e',dot:'#fb7185'},
  ];
  const haveAny=cards.some(c=>ts.some(t=>{const v=c.f(t);return !isNaN(v)&&v>0;}));
  if(!haveAny)return null;
  const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',font:{size:9,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,formatter:v=>v==null?'':(+Number(v).toFixed(1))});
  return(<div className="panel"><h2 style={{marginTop:0,fontSize:17}}>📈 Development</h2><div className="rep-dev">
    {cards.map(c=>{const data=ts.map(t=>{const v=c.f(t);return isNaN(v)||v===0?null:v;});
      const valid=data.filter(v=>v!=null);if(valid.length===0)return null;
      const cur=valid[valid.length-1],first=valid[0];
      const imp=valid.length>1&&c.up!=null?+((c.up?cur-first:first-cur).toFixed(2)):null;
      const sign=imp==null?'':(imp>0?'+':'');
      return(<div key={c.t} className="metric-card dev-mini">
        <div className="mc-h"><div className="mc-t">{c.t}</div><div className="mc-u">{c.u}</div></div>
        <div className="mc-val"><span className="mv" style={{color:c.dot}}>{cur}</span>{imp!=null&&imp!==0&&<span className={`md ${imp>0?'pos':'neg'}`}>{sign}{imp}</span>}</div>
        <div className="mc-chart"><ChartC type="line" chartData={{labels,datasets:[
          {label:c.t,data,borderColor:c.col,backgroundColor:c.col,tension:.3,spanGaps:true,borderWidth:2,
            pointRadius:3,pointBackgroundColor:c.dot,pointBorderColor:c.dot,datalabels:dataLbl(c.dot)}
        ]}} options={{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18,bottom:4,left:6,right:6}},
          scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:9},autoSkip:true,maxRotation:0,maxTicksLimit:6},grid:{display:false},border:{display:false}},
            y:{display:false,grid:{display:false},beginAtZero:false}},
          plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
      </div>);})}
  </div></div>);
}

/* NOT MOUNTED ANYWHERE AT THE MOMENT — the athlete's tab bar carries Anthropometric
   (the tape measure) again, and test results are read on the Testing & Assessment
   screen beside the battery they were taken in. Kept whole, the way RecommendsTab and
   ProgramWriterTab are, so it can be put back on a tab without rebuilding it.

   THE ATHLETE'S PROGRESSION, ONE CARD PER MEASUREMENT — AND ONE PANEL PER FAMILY.
   Every number the Testing & Assessment screen collects, the built-in battery and the
   coach's own tests alike, drawn against the dates it was taken on. The card is the very
   card the body-composition charts are drawn in — same size, same two-up grid, same big
   current value with the change beside it, same month labels along the foot — because
   this tab now holds both and a tab made of two different-looking chart styles reads as
   two screens stitched together.
   The families are kept apart under their own headings (Antropometrik, Güç, Sürat…):
   thirty cards in one wall is a list to search through, five panels of four or five is a
   page to read. `cmpMetrics` is the single list the comparison table and the printouts
   already read, so a test added there turns up here without a second list to keep in
   step, and a coach's own test lands in the last panel. A metric nobody has a number for
   is not drawn: an empty card says nothing.
   Direction matters and is not guessed: a sprint that drops by 0.2s IMPROVED, and the
   list says so per metric (`dir:'lo'`). A coach's own test carries no direction, so its
   change is shown without a verdict. */
const PERF_GROUPS=[
  {g:'anthro',tr:'Antropometrik',en:'Anthropometric'},
  {g:'mob',   tr:'Mobilite ve Tarama',en:'Mobility & Screening'},
  {g:'pow',   tr:'Güç',en:'Power'},
  {g:'spd',   tr:'Sürat ve Çeviklik',en:'Speed & Agility'},
  {g:'cust',  tr:'Kulüp Testleri',en:'Club Tests'},
];
/* One colour per card rather than one per family: four charts of the same purple side by
   side stop being four charts. The cycle is the body-composition panel's own — purple,
   blue, orange, green — so the two panels read as one set. */
const PERF_COLS=[['#a855f7','#c084fc'],['#3b82f6','#60a5fa'],['#f97316','#fb923c'],['#10b981','#34d399'],
  ['#22d3ee','#67e8f9'],['#ec4899','#f472b6'],['#eab308','#facc15'],['#8b5cf6','#a78bfa']];
function PerfProgressCharts({tests,customTests}){
  const ts=useMemo(()=>[...(tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date)),[tests]);
  const series=useMemo(()=>cmpMetrics(customTests).map(m=>{
    const data=ts.map(t=>{const v=m.get(t);return(v==null||isNaN(v))?null:+Number(v).toFixed(2);});
    return{m,data,n:data.filter(v=>v!=null).length};
  }).filter(x=>x.n>0),[ts,customTests]);
  if(!ts.length||!series.length)return(<div className="panel">
    <h2 style={{marginTop:0}}>{L('Performans Gelişimi','Performance Progression')}</h2>
    <div className="empty-st">{L('Henüz test sonucu yok — Test ve Değerlendirme sekmesinden bir test al, sonuçlar buraya işlensin.',
      'No test results yet — take a test on the Testing & Assessment screen and the results are drawn here.')}</div>
  </div>);
  // The foot of every card, exactly as Body Composition writes it: the month the test
  // was taken in. A date reads as a date on one card and as noise across twenty.
  const labels=ts.map(t=>MN[parseD(t.date).getMonth()]);
  const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',
    font:{size:10,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,
    formatter:v=>v==null?'':(+Number(v).toFixed(1))});
  // A family the app does not know about (an older record, a hand-edited metric) still
  // gets a panel of its own rather than dropping off the page.
  const groups=[...PERF_GROUPS,...[...new Set(series.map(x=>x.m.g))]
    .filter(g=>!PERF_GROUPS.some(p=>p.g===g)).map(g=>({g,tr:g,en:g}))];
  const card=({m,data},i)=>{
    const[col,dot]=PERF_COLS[i%PERF_COLS.length];
    const valid=data.filter(v=>v!=null);
    const cur=valid[valid.length-1],first=valid[0];
    const diff=valid.length>1?+((cur-first).toFixed(2)):null;
    const fav=(diff==null||diff===0||!m.dir)?null:(m.dir==='lo'?diff<0:diff>0);
    return(<div key={m.id} className="metric-card">
      <div className="mc-h"><div className="mc-t">{cmpLabel(m)}</div><div className="mc-u">{m.u||''}</div></div>
      <div className="mc-val"><span className="mv" style={{color:dot}}>{cur}</span>
        {diff!=null&&diff!==0&&<span className={`md ${fav==null?'':(fav?'pos':'neg')}`}>{diff>0?'+':''}{diff}</span>}</div>
      <div className="mc-chart tall"><ChartC type="line" chartData={{labels,datasets:[
        {label:cmpLabel(m),data,borderColor:col,backgroundColor:col+'22',fill:'origin',tension:.35,spanGaps:true,borderWidth:2.5,
          pointRadius:4,pointHoverRadius:6,pointBackgroundColor:dot,pointBorderColor:'#0d0f13',pointBorderWidth:1.5,
          datalabels:dataLbl(dot)}
      ]}} options={{responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:24,bottom:6,left:8,right:8}},
        scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:10},autoSkip:true,maxRotation:0,maxTicksLimit:7},grid:{display:false},border:{display:false}},
          y:{display:false,grid:{display:false},beginAtZero:false}},
        plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
    </div>);
  };
  let firstPanel=true;
  return(<React.Fragment>
    {groups.map(gr=>{
      const rows=series.filter(x=>x.m.g===gr.g);
      if(!rows.length)return null;
      const lead=firstPanel;firstPanel=false;
      return(<div className="panel" key={gr.g}>
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L(gr.tr,gr.en)}</h2>
          <span style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",fontSize:11,color:'var(--dim)'}}>
            {L(`${rows.length} ölçüm · ${ts.length} test`,`${rows.length} measurement${rows.length>1?'s':''} · ${ts.length} test${ts.length>1?'s':''}`)}</span>
        </div>
        {lead&&<div className="help" style={{marginBottom:14}}>{L('Her kutu bir ölçümün ilk testten bugüne seyri. Köşedeki fark ilk sonuçla sonuncusu arasındaki değişimdir — düşmesi iyi olan testlerde (sprint, çeviklik) düşüş yeşil okunur.',
          'Each card is one measurement from the first test to today. The figure in the corner is the change between the first result and the latest — on a test where lower is better (sprints, agility) a drop reads as green.')}</div>}
        {/* Two up, two down — the same grid Body Composition uses, and for the same
            reason: across a full-width panel four cards leave each chart too narrow to
            read a trend off. */}
        <div className="metric-grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
          {rows.map(card)}
        </div>
      </div>);
    })}
  </React.Fragment>);
}

/* Ask AI Coach — inline chatbox that evaluates THIS athlete's test results. */
function AskAICoachBox({ath,setup,ai,exercises}){
  const provider=aiProviderOf(ai);
  const apiKey=aiKeyOf(ai);
  const model=aiModelOf(ai);
  const[msgs,setMsgs]=useState([]);
  const[input,setInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const scrollRef=useRef(null);
  const snap=useMemo(()=>{try{return buildAthleteSnapshot(ath,setup||{},exercises||[]);}catch(e){return '';}},[ath,setup,exercises]);
  const system='You are an elite strength & conditioning assistant coach. Evaluate THIS athlete\'s TEST RESULTS and answer the coach\'s questions concisely and concretely. Base everything ONLY on the provided data — never invent test numbers; if data is missing, say so. Prefer short bullet points, give actual set×rep / %1RM / RPE when suggesting work. Reply in the SAME language as the coach\'s message.\n\n=== ATHLETE DATA ===\n'+snap;
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,busy]);
  const send=async(text)=>{
    const q=(text!=null?text:input).trim();
    if(!q||busy||!apiKey)return;
    setErr('');const next=[...msgs,{role:'user',content:q}];setMsgs(next);setInput('');setBusy(true);
    try{
      const ans=provider==='anthropic'?await askCoach(apiKey,model,system,next):await askGemini(apiKey,model,system,next);
      setMsgs(m=>[...m,{role:'assistant',content:ans||'(empty response)'}]);
    }catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);}
  };
  return(<div className="aicb">
    <div className="aicb-h">🤖 Ask AI Coach <span>· evaluates test results</span></div>
    {!apiKey
      ?<div className="aicb-empty">Add an API key in the <b>✨ AI Coach</b> panel (bottom-right) to chat about <b>{ath.name}</b>'s results. <b>Gemini is free.</b></div>
      :<React.Fragment>
        <div className="aicb-msgs" ref={scrollRef}>
          {msgs.length===0&&<div className="aicb-hint">Ask anything about {ath.name}'s test results — or tap a suggestion below.</div>}
          {msgs.map((m,i)=><div key={i} className={'aicb-msg '+m.role}><div className="aicb-bub" dangerouslySetInnerHTML={{__html:recMd(m.content)}}/></div>)}
          {busy&&<div className="aicb-msg assistant"><div className="aicb-bub aicb-typing">● ● ●</div></div>}
        </div>
        {err&&<div className="aicb-err">⚠ {err}</div>}
        {msgs.length===0&&<div className="aicb-sugg">
          {['Evaluate these test results','Biggest weakness?','What to train next?'].map(s=><button key={s} disabled={busy} onClick={()=>send(s)}>{s}</button>)}
        </div>}
        <form className="aicb-in" onSubmit={e=>{e.preventDefault();send();}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about the results…" disabled={busy}/>
          <button type="submit" disabled={busy||!input.trim()} title="Send">➤</button>
        </form>
      </React.Fragment>}
  </div>);
}

/* Simple, readable test-results report for an athlete (latest session + history). */
function TestReportsTab({ath,setup,ai,exercises}){
  const num=v=>(v!==''&&v!=null&&!isNaN(Number(v)))?Number(v):null;
  const tests=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=tests.length?tests[tests.length-1]:null;
  const Tile=({k,v,u,raw})=>{const n=raw!==undefined?raw:num(v);if(n==null)return null;return(<div className="rep-tile"><div className="k">{k}</div><div className="v">{n}{u&&<small>{u}</small>}</div></div>);};
  if(!t)return(<div className="empty-st">No test sessions recorded yet. Add results in the <b>Testing &amp; Assessment</b> tab, then come back here.</div>);
  const period=(TEST_PERIODS.find(p=>p.id===t.period)||{}).label||t.period||'';
  const h=num(t.height),w=num(t.weight);const bmi=(h&&w)?(w/((h/100)**2)):null;
  const anthro=[['Height',t.height,'cm'],['Weight',t.weight,'kg'],['Body Fat',t.bodyFat,'%'],['Wingspan',t.wingspan,'cm'],
    ['Leg Length',t.legLength,'cm'],['Sitting Height',t.sittingHeight,'cm']];
  const power=[['Vertical Jump',t.verticalJump,'cm'],['CMJ',t.cmj,'cm'],
    ['Lateral CMJ — R',t.lateralCmj&&t.lateralCmj.right,'cm'],['Lateral CMJ — L',t.lateralCmj&&t.lateralCmj.left,'cm'],
    ['Squat Jump',t.squatJump,'cm'],['Drop Jump',t.dropJump,'RSI'],['Horizontal Jump',t.horizontalJump,'cm']];
  const speed=[['20m Sprint',t.sprint20m&&t.sprint20m.time,'s'],['T-Test',t.tTest,'s'],['5-0-5',t.fiveZeroFive,'s'],['Shuttle Run',t.shuttleRun,'']];
  const circ=t.circ||{};
  const circList=[['Shoulder',circ.shoulder],['Waist',circ.waist],['Hip',circ.hip],['Thigh R',circ.thighRight],['Thigh L',circ.thighLeft],['Calf R',circ.calfRight],['Calf L',circ.calfLeft]];
  const adfR=num(t.ankleDF&&t.ankleDF.right),adfL=num(t.ankleDF&&t.ankleDF.left);
  const asR=num(t.aslr&&t.aslr.right),asL=num(t.aslr&&t.aslr.left);
  const ohs=(t.ohs&&t.ohs.score!==''&&t.ohs.score!=null)?t.ohs.score:null;
  const ybt=ybCalc(t.yBalance);
  const hasAny=arr=>arr.some(([,v])=>num(v)!=null);
  const hasMobility=adfR!=null||adfL!=null||asR!=null||asL!=null||ohs!=null||ybt.compR!=null||ybt.compL!=null;
  return(<div>
    <div className="rep-cols">
      <div className="panel">
        <div className="rep-head"><h2 style={{margin:0,fontSize:17}}>📋 Latest Test Report</h2><div className="rep-date">{fd(t.date)}{period?` · ${period}`:''}</div></div>
        {tests.length>1&&<div className="rep-hist">{tests.slice(0,-1).slice(-6).map((x,i)=><span key={i}>{fd(x.date)}</span>)}</div>}
        {hasAny(anthro)&&<><div className="rep-sec-t">Anthropometrics</div><div className="rep-grid">{anthro.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}{bmi!=null&&<Tile k="BMI" raw={bmi.toFixed(1)}/>}</div></>}
        {hasAny(power)&&<><div className="rep-sec-t">Power / Jumps</div><div className="rep-grid">{power.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}</div></>}
        {hasAny(speed)&&<><div className="rep-sec-t">Speed / Agility</div><div className="rep-grid">{speed.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}</div></>}
        {hasMobility&&<><div className="rep-sec-t">Mobility / Movement</div><div className="rep-grid">
          {adfR!=null&&<Tile k="Ankle DF — R" v={adfR} u="°"/>}
          {adfL!=null&&<Tile k="Ankle DF — L" v={adfL} u="°"/>}
          {asR!=null&&<Tile k="ASLR — R" raw={asR+' /3'}/>}
          {asL!=null&&<Tile k="ASLR — L" raw={asL+' /3'}/>}
          {ohs!=null&&<Tile k="Overhead Squat" raw={ohs+' /3'}/>}
          {ybt.compR!=null&&<Tile k="Y Balance — R" raw={ybt.compR+' %'}/>}
          {ybt.compL!=null&&<Tile k="Y Balance — L" raw={ybt.compL+' %'}/>}
        </div></>}
        {hasAny(circList)&&<><div className="rep-sec-t">Body Circumference (cm)</div><div className="rep-grid">{circList.map(([k,v])=><Tile key={k} k={k} v={v} u="cm"/>)}</div></>}
        {t.posture&&t.posture.observations&&<><div className="rep-sec-t">Posture Notes</div><div className="rep-note">{t.posture.observations}</div></>}
        {t.ohs&&t.ohs.observations&&<><div className="rep-sec-t">Overhead Squat Notes</div><div className="rep-note">{t.ohs.observations}</div></>}
        {t.notes&&<><div className="rep-sec-t">Observations &amp; Comments</div><div className="rep-note">{t.notes}</div></>}
      </div>
      <AskAICoachBox ath={ath} setup={setup} ai={ai} exercises={exercises}/>
    </div>
    <DevelopmentCharts tests={ath.tests}/>
  </div>);
}

/* Program Design Assistant. Not mounted anywhere at the moment — the athlete profile's
   Recommendations tab was taken off the tab bar — but kept whole, together with the
   PROGRAM_DESIGN_SYSTEM prompt and PDA_CATS it reads, so it can be put back on a tab
   without rebuilding it. */
function RecommendsTab({ath,updAth,setup,ai,exercises,autoGen,onAutoDone}){
  const[pdBusy,setPdBusy]=useState(false);
  const[pdErr,setPdErr]=useState('');
  const pd=ath.programDesign||null;
  const provider=aiProviderOf(ai);
  const apiKey=aiKeyOf(ai);
  const model=aiModelOf(ai);
  const genPD=async()=>{
    if(pdBusy||!apiKey)return;setPdErr('');setPdBusy(true);
    try{
      const input=buildProgramDesignInput(ath,setup);
      const msgs=[{role:'user',content:'Aşağıdaki sporcu verisini analiz et ve SADECE istenen JSON formatında yanıt ver.\n\n'+JSON.stringify(input,null,2)}];
      // This answer is a long JSON document, so it needs a much larger output
      // budget than the chat calls — and on Gemini the thinking step has to be
      // capped, otherwise it eats the budget and the JSON arrives truncated.
      const ask=()=>provider==='anthropic'
        ?askCoach(apiKey,model,PROGRAM_DESIGN_SYSTEM,msgs,{maxTokens:16000})
        :askGemini(apiKey,model,PROGRAM_DESIGN_SYSTEM,msgs,{maxTokens:16000,json:true,thinkingBudget:0,temperature:0.4});
      // Retry only a parse failure (transient formatting slip) — an API error
      // such as 401/429 propagates as is instead of burning a second call.
      const ans=await ask();
      let data;
      try{data=pdaParse(ans);}
      catch(e){data=pdaParse(await ask());}
      updAth(ath.id,{programDesign:{data,input,at:Date.now(),provider,model}});
    }catch(e){setPdErr(e.message||String(e));}
    finally{setPdBusy(false);}
  };
  // "Ask AI" shortcut: auto-run the analysis once when arriving with no result yet.
  useEffect(()=>{
    if(!autoGen)return;
    if(!pd&&apiKey&&!pdBusy)genPD();
    onAutoDone&&onAutoDone();
  },[autoGen]);
  if(!apiKey)return(<div className="rec-empty">
    <div className="rec-empty-ic">🧩</div>
    <h3>An API key is required for the Program Design Assistant</h3>
    <p>This tab analyzes the athlete's <b>anthropometrics, test results, movement screen and questionnaires</b> and produces joint-by-joint, justified exercise suggestions. To use it, open the <b>✨ AI Coach Assistant</b> at the bottom right and enter an API key — <b>Gemini is free</b>. The key is stored with your account across all devices.</p>
  </div>);
  return(<div className="rec-wrap">
    <div className="rec-bar">
      <div className="rec-bar-l">
        <div className="rec-bar-t">🧩 Program Design Assistant</div>
        <div className="rec-bar-s">{pd?`Analyzed: ${new Date(pd.at).toLocaleString('en-GB')} · ${pd.model}`:'Joint-by-joint constraint analysis — 3 mobilization + 3 stabilization exercises, plus a reasoned strength assessment.'}</div>
      </div>
      <button className="btn sm" disabled={pdBusy} onClick={genPD}>{pdBusy?'Analyzing…':(pd?'↻ Re-analyze':'🧩 Analyze Athlete')}</button>
    </div>
    {pdErr&&<div className="rec-err">⚠ {pdErr}</div>}
    {pdBusy&&!pd&&<div className="rec-loading"><div className="rec-spin"/><div>Scanning data, checking asymmetries, matching exercises…</div></div>}
    {pd&&pd.data&&<div className={'pda-card'+(pdBusy?' dim':'')}>
      {pd.data.kesildi&&<div className="rec-err">⚠ Model yanıtı token sınırında kesildi — aşağıda yalnızca tamamlanan öneriler var. Tam liste için <b>↻ Re-analyze</b> deneyin.</div>}
      {pd.data.kirmizi_bayrak&&pd.data.kirmizi_bayrak!=='null'&&<div className="pda-flag"><span className="ic">🚩</span><div><b>Kırmızı bayrak:</b> {pd.data.kirmizi_bayrak}</div></div>}
      {pd.data.sporcu_ozeti&&<div className="pda-summary"><b>Özet:</b> {pd.data.sporcu_ozeti}</div>}
      {(()=>{
        const byPrio=a=>[...a].sort((x,y)=>pdaPrio(x.oncelik).rank-pdaPrio(y.oncelik).rank);
        // Kuvvet reads in movement-pattern order (yatay itiş → … → core), others by priority.
        const byPat=a=>[...a].sort((x,y)=>{const rx=(pdaPat(x.hareket_paterni)||{rank:99}).rank,ry=(pdaPat(y.hareket_paterni)||{rank:99}).rank;return rx-ry||pdaPrio(x.oncelik).rank-pdaPrio(y.oncelik).rank;});
        const groups=PDA_CATS.map(c=>{const items=pd.data.oneriler.filter(r=>(pdaCat(r.kategori)||{}).id===c.id);return{...c,items:c.id==='str'?byPat(items):byPrio(items)};});
        const rest=byPrio(pd.data.oneriler.filter(r=>!pdaCat(r.kategori)));
        if(rest.length)groups.push({id:'other',ic:'📌',lbl:'Diğer',desc:'',items:rest});
        const card=(r,i)=>{const p=pdaPrio(r.oncelik);const pat=pdaPat(r.hareket_paterni);return(
          <div key={i} className={'pda-item '+p.cls}>
            <div className="pda-item-h">
              <span className={'pda-pill '+p.cls}>{p.lbl}</span>
              {pat&&<span className="pda-pattern">🎯 {pat.lbl}</span>}
              {r.hedef_eklem&&<span className="pda-joint">🦴 {r.hedef_eklem}</span>}
              <span className="pda-cons">{r.tespit_edilen_kisitlilik||'—'}</span>
            </div>
            <div className="pda-ex">🏋️ {r.onerilen_egzersiz||'—'}</div>
            {r.set_tekrar_yuk_onerisi&&<div className="pda-dose">{r.set_tekrar_yuk_onerisi}</div>}
            {r.dayanak_veri&&<div className="pda-kv"><span className="k">Dayanak</span><span className="v">{r.dayanak_veri}</span></div>}
            {r.gerekce&&<div className="pda-kv"><span className="k">Gerekçe</span><span className="v">{r.gerekce}</span></div>}
            {r.notlar&&r.notlar!=='null'&&<div className="pda-kv warn"><span className="k">Not</span><span className="v">{r.notlar}</span></div>}
          </div>);};
        // Strength is an assessment, not a prescription — region, evidence and mechanism.
        const kg=byPrio(pd.data.kuvvet_gorusu||[]);
        const view=(r,i)=>{const p=pdaPrio(r.oncelik);const pat=pdaPat(r.hareket_paterni);return(
          <div key={i} className={'pda-item '+p.cls}>
            <div className="pda-item-h">
              <span className={'pda-pill '+p.cls}>{p.lbl}</span>
              {pat&&<span className="pda-pattern">🎯 {pat.lbl}</span>}
              <span className="pda-cons">{r.hedef_bolge||'—'}</span>
            </div>
            {r.dayanak_veri&&<div className="pda-kv"><span className="k">Dayanak</span><span className="v">{r.dayanak_veri}</span></div>}
            {r.neden&&<div className="pda-kv"><span className="k">Neden</span><span className="v">{r.neden}</span></div>}
            {r.performansa_etkisi&&<div className="pda-kv"><span className="k">Etki</span><span className="v">{r.performansa_etkisi}</span></div>}
            {r.programlama_yonu&&r.programlama_yonu!=='null'&&<div className="pda-kv"><span className="k">Yön</span><span className="v">{r.programlama_yonu}</span></div>}
          </div>);};
        return(<React.Fragment>
          {groups.filter(g=>g.items.length).map(g=>(
            <div key={g.id} className="pda-sec">
              <div className="pda-sec-h">
                <span className="pda-sec-t">{g.ic} {g.lbl}</span>
                <span className="pda-sec-n">{g.items.length} egzersiz</span>
              </div>
              {g.desc&&<div className="pda-sec-d">{g.desc}</div>}
              <div className="pda-list">{g.items.map(card)}</div>
            </div>))}
          {kg.length>0&&<div className="pda-sec">
            <div className="pda-sec-h">
              <span className="pda-sec-t">🏋️ Kuvvet Görüşü</span>
              <span className="pda-sec-n">{kg.length} değerlendirme</span>
            </div>
            <div className="pda-sec-d">Egzersiz reçetesi değil — hangi bölgenin neden geliştirilmesi gerektiğine dair veriye dayalı değerlendirme</div>
            <div className="pda-list">{kg.map(view)}</div>
          </div>}
          {pd.data.oneriler.length===0&&kg.length===0&&<div className="rec-hint">Analiz tamamlandı ancak öneri üretilecek yeterli veri bulunamadı — Body Comp, Testing ve Wellness sekmelerine veri girip tekrar deneyin.</div>}
        </React.Fragment>);
      })()}
      {pd.input&&<details className="pda-details"><summary>📄 Analizde kullanılan veri (JSON)</summary><pre>{JSON.stringify(pd.input,null,2)}</pre></details>}
      <div className="rec-foot">Bu çıktı gerekçeli bir öneridir, kesin talimat değildir — nihai karar antrenöre aittir. Ağrı veya klinik bulguda fizyoterapiste yönlendirin.</div>
    </div>}
    {!pd&&!pdBusy&&<div className="rec-hint">No analysis yet. Press <b>🧩 Analyze Athlete</b> above — it scans the athlete's profile data, flags right-left asymmetries (≥10%) and weaknesses, and prioritizes them by injury risk. You get exactly <b>3 🧘 mobilization</b> and <b>3 ⚖️ stabilization</b> exercises, each tied to the measurement behind it. Strength is <b>not</b> prescribed as exercises: the <b>🏋️ strength assessment</b> reads like a sport scientist's note — which region needs developing, which test result says so, the mechanism involved, and what it should change on court. Exercises are chosen freely for the athlete's needs — not limited to your library.</div>}
  </div>);
}

// Animated number that eases from 0 → value on mount/change (cubic ease-out).
function CountUp({value,decimals=0,dur=850,format}){
  const[v,setV]=useState(0);
  const raf=useRef(0);
  useEffect(()=>{
    const target=Number(value)||0;let start=0;
    const tick=ts=>{if(!start)start=ts;const p=Math.min(1,(ts-start)/dur);const e=1-Math.pow(1-p,3);setV(target*e);if(p<1)raf.current=requestAnimationFrame(tick);};
    raf.current=requestAnimationFrame(tick);
    // Fallback: guarantee the final value lands even if rAF is paused (bg tab).
    const done=setTimeout(()=>setV(target),dur+80);
    return()=>{cancelAnimationFrame(raf.current);clearTimeout(done);};
  },[value,dur]);
  return<span className="countup">{format?format(v):v.toFixed(decimals)}</span>;
}

