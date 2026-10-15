/* =========================================================
   EXERCISES LIBRARY
   ========================================================= */
/* The library's shelves are the eleven categories of the MOVEMENT TAXONOMY (185): the same
   Kategori the training table writes, filtered by the same Tür and Yön. A card filed under a
   shelf an older version had (Mobility, Stability …) keeps its value and is listed under
   "Kategorisiz" until it is given one of these. */
const EX_TYPES=MV_KEYS.slice();
const EX_MUSCLES=['Abs & Core','Chest','Upper Back','Lats','Shoulders','Biceps','Triceps','Quadriceps','Hamstrings','Glutes','Calves','Forearms','Hip Flexors','Adductors','Abductors','Full Body','Cardio'];
const TYPE_COLORS=Object.fromEntries(MV_CATS.map(c=>[c.k,c.color]));
/* Retired with the old shelves: Hip / Knee Dominant no longer carry an Action or a Movement
   Pattern box — the type (Squat, Lunge, RDL …) says what they used to. Kept empty so the old
   readers find nothing to ask. */
const PATTERNS_FOR={};
const EX_ACTIONS=['Push','Pull'];
const ACTIONS_FOR={};
const DIFFICULTIES=['Level 1','Level 2','Level 3'];
const DIFF_COLOR={'Level 1':'#10b981','Level 2':'#f59e0b','Level 3':'#ef4444'};
// Each category is filtered by its own types (Tür).
const SUB_TYPES=Object.fromEntries(MV_CATS.map(c=>[c.k,{label:'Type',values:c.types.map(t=>t[0])}]));
/* The filters a category carries beyond its sub-type (and, for Hip / Knee Dominant, the
   Action and Movement Pattern above): each is its own field on the library entry, set
   on the exercise card and filtered on in the library. */
/* One equipment list for every category that is filed by it — the same choices, in the
   same order, whether the lift is a push, a pull, a hinge or a squat. */
const EX_EQUIPMENT=['Barbell','Trap Bar','Dumbbell','Kettlebell','Machine','Cable','Band','TRX','Landmine','Sled',
  'Battle Rope','Stability Ball','BOSU','Medicine Ball','Box','Bodyweight'];
/* Jumps are set up with their own kit — what the athlete jumps onto, over or through,
   what loads or resists the jump, and what measures it — so Plyometric has its own list. */
const EX_PLYO_EQUIPMENT=['No Equipment','Box','Resistance Band','Hurdle','Mini Hurdle','Agility Ladder','Cone','Jump Rope',
  'Medicine Ball','Dumbbell','Trap Bar','TRX','Weight Vest','Barbell','VertiMax','Force Plate'];
/* Beyond its type, a category is filtered by its direction (Yön, where it has one) and by the
   kit it is done with. */
const EX_GENERAL_EQUIPMENT=[...EX_EQUIPMENT,'Foam Roller','Lacrosse Ball','Mini Band','Slider','Bench','Pull-Up Bar',
  'Wall','Ab Wheel','Balance Pad','Agility Ladder','Cone','Hurdle'];
const EX_EXTRA_FILTERS=Object.fromEntries(MV_CATS.map(c=>[c.k,[
  ...(c.dirs.length?[{key:'dir',label:'Direction',values:c.dirs.map(d=>d[0])}]:[]),
  {key:'equipment',label:'Equipment',values:c.k==='Plyometric'?EX_PLYO_EQUIPMENT:EX_GENERAL_EQUIPMENT,multi:true}]]));
const EX_CONTRACTIONS=['Concentric','Eccentric','Isometric','Plyometric'];
const EX_EXTRA_KEYS=['exKind','technique','position','equipment','bodyRegion','contraction','dir'];
/* A `multi` filter (Equipment) holds a list — a step-up takes dumbbells AND a box. Entries
   saved before it became a list hold one string; both read the same through exMulti. */
const exMulti=v=>Array.isArray(v)?v.filter(Boolean):(v?[v]:[]);
const exEquipText=v=>exMulti(v).join(', ');
/* Every fixed taxonomy term across the app (exercise type/muscle/difficulty,
   session focus, periodization model, load type, …) is stored in English as
   the canonical value — filtering, saved data, and the report generator key
   off these exact strings, so they never change. This map only supplies the
   Turkish word shown on screen; exLabel() picks it (or falls back to the
   English original) by the active app language — used well beyond the
   exercise library despite the name. */
const EX_TERM_TR={
  'No Equipment':'Ekipmansız',
  'Warm-Up':'Isınma','Upper Body Push':'Üst Vücut İtiş','Upper Body Pull':'Üst Vücut Çekiş',
  'Hip Dominant':'Kalça Dominant','Knee Dominant':'Diz Dominant','Carry':'Carry','Core':'Core','Full Body':'Tüm Vücut',
  'Multi Directional Speed':'Çok Yönlü Hız','Multidirectional Speed':'Çok Yönlü Hız','Plyometric':'Pliometrik',
  'Medicine Ball':'Med Ball','Mobility':'Mobilite','Stability':'Stabilite',
  'Balance':'Denge','Static Balance':'Statik Denge','Dynamic Balance':'Dinamik Denge',
  'Unilateral Balance':'Tek Taraflı Denge','Reactive Balance':'Reaktif Denge',
  'Upper Body':'Üst Vücut','Lower Body':'Alt Vücut','Shoulder & Scapula':'Omuz & Skapula',
  'Hip & Hamstring':'Kalça & Hamstring','Prehab & Injury Prevention':'Prehab & Sakatlık Önleme',
  'Neck':'Boyun','Arms':'Kollar','Forearm & Grip':'Önkol & Kavrama','Core & Trunk':'Core & Gövde',
  'Adductors & Abductors':'Adduktör & Abduktör','Calf & Ankle':'Baldır & Ayak Bileği','Foot':'Ayak',
  'Foam Roller':'Foam Roller','Lacrosse Ball':'Lacrosse Topu','Mini Band':'Mini Bant','Slider':'Slider',
  'Bench':'Bench','Pull-Up Bar':'Barfiks Barı','Wall':'Duvar','Ab Wheel':'Ab Wheel','Balance Pad':'Denge Pedi',
  'Agility Ladder':'Çeviklik Merdiveni','Cone':'Koni','Hurdle':'Engel',
  'Contraction Focus':'Kasılma Odağı','Action':'Aksiyon',
  'Abs & Core':'Karın ve Core','Chest':'Göğüs','Upper Back':'Üst Sırt','Lats':'Lat','Shoulders':'Omuz',
  'Biceps':'Biceps','Triceps':'Triceps','Quadriceps':'Kuadriseps','Hamstrings':'Hamstring','Glutes':'Kalça (Gluteus)',
  'Calves':'Baldır','Forearms':'Önkol','Hip Flexors':'Kalça Fleksörleri','Adductors':'Adduktör','Abductors':'Abduktör',
  'Cardio':'Kardiyo',
  'Bilateral':'Bilateral','Unilateral':'Unilateral','Lunges':'Lunge',
  'Level 1':'Seviye 1','Level 2':'Seviye 2','Level 3':'Seviye 3',
  'Category':'Kategori','Plane of Motion':'Hareket Düzlemi','Contraction Type':'Kasılma Tipi',
  'Movement Pattern':'Hareket Örüntüsü','Skill':'Beceri','Direction':'Yön','Region':'Bölge',
  'General':'Genel','Specific':'Özel','Activation':'Aktivasyon','Mobilisation':'Mobilizasyon',
  'Dynamic Stretching':'Dinamik Germe','Neural Priming':'Nöral Hazırlık',
  'Horizontal':'Yatay','Vertical':'Dikey',
  'Push':'İtme','Pull':'Çekme','Eccentric':'Eksantrik','Isometric':'İzometrik',
  'Anti-Flexion':'Anti-Fleksiyon','Anti-Extension':'Anti-Ekstansiyon','Anti-Rotation':'Anti-Rotasyon',
  'Anti-Lateral Flexion':'Anti-Lateral Fleksiyon','Flexion':'Fleksiyon','Extension':'Ekstansiyon',
  'Rotation':'Rotasyon','Lateral Flexion':'Lateral Fleksiyon',
  'Strength':'Kuvvet','Explosive':'Patlayıcı','Olympic Lift':'Olimpik Kaldırış',
  'Non-Reactive Agility':'Reaktif Olmayan Çeviklik','Reactive Agility':'Reaktif Çeviklik',
  'Acceleration':'İvmelenme','Deceleration':'Yavaşlama','COD':'Yön Değiştirme','Sprint Technique':'Sprint Tekniği',
  'Lateral':'Lateral','Rotational':'Rotasyonel','Multi-Directional':'Çok Yönlü',
  'Thoracic':'Torasik','Shoulder':'Omuz','Hip':'Kalça','Ankle':'Ayak Bileği','Spine':'Omurga','Wrist':'El Bileği',
  'Exercise Type':'Egzersiz Tipi','Technique':'Teknik','Position':'Pozisyon','Equipment':'Ekipman',
  'Shoulder Girdle':'Omuz Kuşağı','Pelvis':'Pelvis','Knee':'Diz',
  'Type':'Tür','Return to Performance':'Performansa Dönüş',
  'Foot & Ankle':'Ayak & Ayak Bileği','Lumbar Spine':'Lomber Omurga','Thoracic Spine':'Torakal Omurga',
  'Elbow & Wrist':'Dirsek & El Bileği',
  'All categories':'Tüm kategoriler','Kategorisiz':'Kategorisiz',
  'Linear':'Doğrusal','Block':'Blok','Undulating':'Dalgalı','Conjugate':'Konjuge',
  'General':'Genel','Specific':'Özel','Competition':'Müsabaka','Transition':'Geçiş',
  'General Preparation':'Genel Hazırlık','Specific Preparation':'Özel Hazırlık',
  'Base + aerobic':'Temel + aerobik','Sport-specific':'Spora özgü','Maintain & peak':'Koruma ve zirve',
  'Active recovery':'Aktif toparlanma','Accumulation':'Birikim','Transmutation':'Dönüşüm','Realization':'Gerçekleştirme',
  'Hi-volume wave':'Yüksek hacim dalgası','Hi-intensity wave':'Yüksek şiddet dalgası',
  'Max-effort':'Maksimal-efor','Dynamic-effort':'Dinamik-efor','Deload':'Yük azaltma','Peak':'Zirve',
  'Intensity-first':'Önce şiddet','Mixed daily focus':'Günlük değişen odak','Integrated':'Entegre',
  'Readiness-guided':'Hazır oluşa göre','Aerobic emphasis':'Aerobik vurgu','Strength emphasis':'Kuvvet vurgusu',
  'Power emphasis':'Güç vurgusu','Speed emphasis':'Sürat vurgusu',
  'Eccentric':'Eksantrik','Isometric hold':'İzometrik bekleme','Concentric':'Konsantrik','Pause':'Duraklama',
  'No data':'Veri yok','High':'Yüksek','Watch':'İzle','Normal':'Normal','Low':'Düşük',
  'High risk':'Yüksek risk','Optimal':'Optimal','Caution':'Dikkat','Undertraining':'Düşük yük',
  'Upper Body Strength&Power':'Üst Vücut Kuvvet ve Güç','Lower Body Strength&Power':'Alt Vücut Kuvvet ve Güç',
  'Full Body Strength&Power':'Tüm Vücut Kuvvet ve Güç','Corrective':'Düzeltici','Accessory':'Aksesuar',
  'Strength & Power':'Kuvvet ve Güç','Multi-Directional Speed':'Çok Yönlü Hız','Conditioning':'Kondisyon',
  'Movement Quality':'Hareket Kalitesi','Other':'Diğer',
  'Hypertrophy':'Hipertrofi','Speed':'Hız','Acceleration':'İvmelenme','Deceleration':'Yavaşlama',
  'Change of Direction':'Yön Değiştirme','Agility':'Çeviklik','Plyometrics':'Pliometrik','Mobility':'Mobilite',
  'Stability':'Stabilite','Injury Prevention':'Sakatlık Önleme','Technical':'Teknik','Tactical':'Taktik',
  'Competition':'Müsabaka','Assessment':'Değerlendirme','Recovery':'Toparlanma',
  /* --- Session focus tree, stage 1 --- */
  'Movement':'Hareket','Technical / Tactical':'Teknik / Taktik','Return to Play':'Sahaya Dönüş','Testing':'Test',
  /* --- stage 2, sub-focus --- */
  'Maximal Strength':'Maksimal Kuvvet','Strength Endurance':'Kuvvette Devamlılık','Eccentric Strength':'Eksantrik Kuvvet',
  'Isometric Strength':'İzometrik Kuvvet','Unilateral Strength':'Tek Taraflı Kuvvet','Core Strength':'Core Kuvveti',
  'Strength-Speed':'Kuvvet-Sürat','Speed-Strength':'Sürat-Kuvvet','Explosive Strength':'Patlayıcı Kuvvet',
  'Reactive Strength':'Reaktif Kuvvet','Rate of Force Development':'Kuvvet Gelişim Hızı','Ballistic Power':'Balistik Güç',
  'Max Velocity':'Maksimal Hız','Reactive Agility':'Reaktif Çeviklik','Speed Endurance':'Sürat Devamlılığı',
  'Aerobic Capacity':'Aerobik Kapasite','Aerobic Power':'Aerobik Güç','Anaerobic Capacity':'Anaerobik Kapasite',
  'Anaerobic Power':'Anaerobik Güç','Repeated Sprint Ability':'Tekrarlı Sprint Yeteneği','Lactate Tolerance':'Laktat Toleransı',
  'Tempo / Extensive':'Tempo / Ekstensif','Motor Control':'Motor Kontrol','Landing Mechanics':'İniş Mekaniği',
  'Tendon Health':'Tendon Sağlığı','Balance & Proprioception':'Denge ve Propriosepsiyon',
  'Individual Skill':'Bireysel Beceri','Team Offense':'Takım Hücumu','Team Defense':'Takım Savunması',
  'Set Plays':'Sistem Oyunları','Transition':'Geçiş','Small-Sided Game':'Küçük Alan Oyunu','Scrimmage':'Çift Kale',
  'League Match':'Lig Maçı','Cup Match':'Kupa Maçı','Tournament':'Turnuva','Friendly':'Hazırlık Maçı',
  'Practice Game':'Antrenman Maçı',
  'Active Recovery':'Aktif Toparlanma','Regeneration':'Rejenerasyon','Soft Tissue':'Yumuşak Doku',
  'Breathing / Parasympathetic':'Nefes / Parasempatik','Mobility Flow':'Hareketlilik Akışı',
  'Reconditioning':'Yeniden Kondisyon','Load Reintroduction':'Yükün Yeniden Verilmesi','Return to Run':'Koşuya Dönüş',
  'Return to Train':'Antrenmana Dönüş','Return to Perform':'Performansa Dönüş','Criteria-Based Progression':'Kriter Temelli İlerleme',
  'Anthropometry':'Antropometri','Strength Testing':'Kuvvet Testi','Power / Jump Testing':'Güç / Sıçrama Testi',
  'Speed Testing':'Sürat Testi','Aerobic Testing':'Aerobik Test','Movement Screen':'Hareket Taraması',
  'Asymmetry Profiling':'Asimetri Profillemesi',
  /* Terms that arrived with the retired third stage of the focus picker and are still
     spoken by other lists — exercise types, ball-practice categories, training means.
     The rest of that vocabulary went with the stage. */
  'Accommodating Resistance (Bands / Chains)':'Değişken Direnç (Lastik / Zincir)',
  'Blood Flow Restriction':'Kan Akımı Kısıtlama','Cluster Sets':'Küme Setler','Olympic Lift':'Olimpik Kaldırış',
  'Medicine Ball':'Med Ball','French Contrast':'Fransız Kontrast','Sprint':'Sprint',
  'Shuttle Run':'Mekik Koşusu','Dynamic Stretching':'Dinamik Germe','Static Stretching':'Statik Germe',
  'Joint Mobility / CARs':'Eklem Hareketliliği / CARs',
  'Self-Myofascial Release':'Kendi Kendine Miyofasyal Gevşetme','1v1':'1v1','5v5':'5v5',
  /* --- Ball practice library --- */
  'Ball Practice':'Top Çalışması','Strength & Conditioning':'Kuvvet ve Kondisyon',
  'Ball Handling':'Top Hakimiyeti','Shooting':'Şut','Finishing':'Bitiriş','Passing':'Pas',
  'Individual Defense':'Bireysel Savunma','Team Offense Concepts':'Takım Hücum Prensipleri',
  'Team Defense Concepts':'Takım Savunma Prensipleri','Transition / Fast Break':'Geçiş / Hızlı Hücum',
  'Rebounding':'Ribaund','Small-Sided Games':'Küçük Alan Oyunları','Ball Warm-Up':'Toplu Isınma',
  'Half Court':'Yarı Saha','Full Court':'Tam Saha',
};
const exLabel=s=>(REPORT_LANG==='tr'?(EX_TERM_TR[s]||s):s);
/* Free text the coach types (exercise name, purpose/description) is assumed
   Turkish — every piece of evidence in this codebase (comments, dialogs,
   confirms) points that way, same assumption the research-feed translator
   above already makes in the other direction. mtToEn() best-effort-machine-
   translates it to English via the same free, key-less Google endpoint used
   by rsTranslate, with the same in-memory cache and silent fallback to the
   original text if the call fails or is slow. */
let MT_CACHE={};
async function mtToEn(text){
  if(!text)return'';
  if(MT_CACHE[text])return MT_CACHE[text];
  try{
    const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),6000);
    const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=en&dt=t&q='+encodeURIComponent(text),{signal:ctrl.signal});
    clearTimeout(to);if(!r.ok)return text;
    const j=await r.json();
    const out=(j&&Array.isArray(j[0]))?j[0].map(s=>s&&s[0]).filter(Boolean).join(''):'';
    if(out)MT_CACHE[text]=out;
    return out||text;
  }catch(e){return text;}
}
// For read-only display only (never for an editable field — the coach must always
// see/edit what is actually stored). Shows the original text immediately, then
// swaps in the English machine translation once fetched, only while the app
// language is English.
function useExerciseText(text){
  const lang=useAppLang();
  const[out,setOut]=useState(text||'');
  useEffect(()=>{
    let alive=true;
    if(lang!=='en'||!text||!text.trim()){setOut(text||'');return;}
    if(MT_CACHE[text]){setOut(MT_CACHE[text]);return;}
    setOut(text);
    mtToEn(text).then(t=>{if(alive)setOut(t);});
    return()=>{alive=false;};
  },[text,lang]);
  return out;
}

