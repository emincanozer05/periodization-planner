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

