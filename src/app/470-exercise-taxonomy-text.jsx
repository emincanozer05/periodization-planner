/* =========================================================
   EXERCISES LIBRARY
   ========================================================= */
const EX_TYPES=['Upper Body Push','Upper Body Pull','Hip Dominant','Knee Dominant','Core','Full Body','Multi Directional Speed','Plyometric','Medicine Ball','Mobility','Stability','Balance','Corrective','Accessory'];
const EX_MUSCLES=['Abs & Core','Chest','Upper Back','Lats','Shoulders','Biceps','Triceps','Quadriceps','Hamstrings','Glutes','Calves','Forearms','Hip Flexors','Adductors','Abductors','Full Body','Cardio'];
// Phosphor color for each category tile.
const TYPE_COLORS={
  'Warm-Up':'#fdba74',                   // peach
  'Upper Body Push':'#22d3ee',           // cyan
  'Upper Body Pull':'#fcd34d',           // amber
  'Hip Dominant':'#86efac',              // green
  'Knee Dominant':'#fb923c',             // orange
  'Core':'#c4b5fd',                      // purple
  'Full Body':'#f9a8d4',                 // pink
  'Multi Directional Speed':'#fca5a5',   // red
  'Plyometric':'#5eead4',                // teal
  'Medicine Ball':'#a78bfa',             // violet
  'Mobility':'#a7f3d0',                  // mint
  'Stability':'#93c5fd',                 // light blue
  'Balance':'#fde68a',                   // pale yellow
  'Corrective':'#f0abfc',                // orchid
  'Accessory':'#cbd5e1',                 // slate
};
const KNEE_PATTERNS=['Bilateral','Unilateral','Lunges','Step-Up'];
const HIP_PATTERNS=['Bilateral','Unilateral'];
const PATTERNS_FOR={'Knee Dominant':KNEE_PATTERNS,'Hip Dominant':HIP_PATTERNS};
/* Hip and Knee Dominant are described on two separate axes: WHICH contraction the
   exercise is built around (Contraction Focus — the sub-type) and WHICH way the load
   moves (Action). They used to share one list, "Push · Pull · Eccentric · Isometric",
   which forced a coach to choose between saying a Nordic is eccentric and saying it is
   a pull. `action` is its own field on the entry. */
const EX_ACTIONS=['Push','Pull'];
const ACTIONS_FOR={'Hip Dominant':EX_ACTIONS,'Knee Dominant':EX_ACTIONS};
const DIFFICULTIES=['Level 1','Level 2','Level 3'];
const DIFF_COLOR={'Level 1':'#10b981','Level 2':'#f59e0b','Level 3':'#ef4444'};
// Each Exercise Type has its own secondary filter dimension.
const SUB_TYPES={
  'Upper Body Push':{label:'Movement',values:['Horizontal','Vertical']},
  'Upper Body Pull':{label:'Movement',values:['Horizontal','Vertical']},
  'Hip Dominant':{label:'Contraction Focus',values:['Concentric','Eccentric','Isometric']},
  'Knee Dominant':{label:'Contraction Focus',values:['Concentric','Eccentric','Isometric']},
  'Core':{label:'Movement',values:['Anti-Flexion','Anti-Extension','Anti-Rotation','Anti-Lateral Flexion','Flexion','Extension','Rotation','Lateral Flexion']},
  'Full Body':{label:'Category',values:['Strength','Explosive','Olympic Lift']},
  'Multi Directional Speed':{label:'Skill',values:['Non-Reactive Agility','Reactive Agility','Acceleration','Deceleration','COD','Sprint Technique']},
  'Plyometric':{label:'Direction',values:['Vertical','Horizontal','Lateral','Rotational','Multi-Directional']},
  'Medicine Ball':{label:'Direction',values:['Vertical','Horizontal','Rotational','Multi-Directional']},
  /* The spine is one region: "Thoracic" entries were moved onto it (migrate). */
  'Mobility':{label:'Region',values:['Ankle','Hip','Spine','Shoulder','Wrist']},
  /* Stability is filed by the joint it is holding, top to bottom — the order a coach
     reads a body down, not alphabetical. The shoulder and the scapula hold together and
     are trained together, so they are one region rather than two. */
  'Stability':{label:'Region',values:['Shoulder Girdle','Core','Pelvis','Knee','Ankle']},
  /* Balance is filed by the demand it makes: holding still, holding while moving, holding
     on one leg, and recovering from a perturbation — the order balance work progresses in. */
  'Balance':{label:'Category',values:['Static Balance','Dynamic Balance','Unilateral Balance','Reactive Balance']},
  /* Corrective work is filed by what it restores, in the order a return runs: range
     first, then control of it, then the quality of the movement, then performance. The
     body region it targets is its own filter (EX_EXTRA_FILTERS). */
  'Corrective':{label:'Type',values:['Mobility','Stability','Movement Quality','Return to Performance']},
  /* Accessory work is filed by where it goes, with prehab as its own shelf: the
     injury-prevention pieces are what a coach looks for first when writing a warm-up. */
  'Accessory':{label:'Region',values:['Upper Body','Neck','Chest','Upper Back','Shoulder & Scapula','Arms','Forearm & Grip',
    'Core & Trunk','Lower Body','Hip & Hamstring','Glutes','Quadriceps','Adductors & Abductors','Calf & Ankle','Foot',
    'Prehab & Injury Prevention']},
};
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
const EX_POSITIONS=['Standing','Half-Kneeling','Tall-Kneeling','Seated','Supine','Prone','Quadruped'];
const EX_EXTRA_FILTERS={
  'Plyometric':[
    {key:'exKind',label:'Exercise Type',values:['Jump','Hop','Bound','Drop Jump','Landing']},
    {key:'technique',label:'Technique',values:['Bilateral','Unilateral']},
    {key:'equipment',label:'Equipment',values:EX_PLYO_EQUIPMENT,multi:true}],
  'Medicine Ball':[
    {key:'exKind',label:'Exercise Type',values:['Throw','Slam','Catch','Pass']}],
  'Core':[{key:'position',label:'Position',values:EX_POSITIONS}],
  'Mobility':[{key:'position',label:'Position',values:EX_POSITIONS}],
  /* Read top to bottom, foot to hand, with the whole-body pieces last. */
  'Corrective':[{key:'bodyRegion',label:'Region',values:['Foot & Ankle','Knee','Hip','Pelvis','Lumbar Spine',
    'Thoracic Spine','Shoulder','Elbow & Wrist','Full Body']}],
  'Upper Body Push':[{key:'equipment',label:'Equipment',values:EX_EQUIPMENT,multi:true}],
  'Upper Body Pull':[{key:'equipment',label:'Equipment',values:EX_EQUIPMENT,multi:true}],
  'Hip Dominant':[{key:'equipment',label:'Equipment',values:EX_EQUIPMENT,multi:true}],
  'Knee Dominant':[{key:'equipment',label:'Equipment',values:EX_EQUIPMENT,multi:true}],
};
/* Every category carries a Contraction Type and an Equipment box. Hip / Knee Dominant already
   file by contraction (their sub-type) and Plyometric has its own kit list, so those keep
   theirs; the rest take the shared lists. Equipment stays the last filter of a category. */
const EX_CONTRACTIONS=['Concentric','Eccentric','Isometric','Plyometric'];
const EX_GENERAL_EQUIPMENT=[...EX_EQUIPMENT,'Foam Roller','Lacrosse Ball','Mini Band','Slider','Bench','Pull-Up Bar',
  'Wall','Ab Wheel','Balance Pad','Agility Ladder','Cone','Hurdle'];
EX_TYPES.forEach(t=>{
  const list=(EX_EXTRA_FILTERS[t]=(EX_EXTRA_FILTERS[t]||[]).slice());
  const eq=list.find(d=>d.key==='equipment');
  const rest=list.filter(d=>d.key!=='equipment');
  if(!(t in ACTIONS_FOR))rest.push({key:'contraction',label:'Contraction Type',values:EX_CONTRACTIONS,multi:true});
  EX_EXTRA_FILTERS[t]=[...rest,eq||{key:'equipment',label:'Equipment',values:EX_GENERAL_EQUIPMENT,multi:true}];
});
const EX_EXTRA_KEYS=['exKind','technique','position','equipment','bodyRegion','contraction'];
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
  'Warm-Up':'Isınma','Upper Body Push':'Üst Vücut İtme','Upper Body Pull':'Üst Vücut Çekme',
  'Hip Dominant':'Kalça Baskın','Knee Dominant':'Diz Baskın','Core':'Core','Full Body':'Tüm Vücut',
  'Multi Directional Speed':'Çok Yönlü Hız','Multidirectional Speed':'Çok Yönlü Hız','Plyometric':'Pliometrik',
  'Medicine Ball':'Sağlık Topu','Mobility':'Mobilite','Stability':'Stabilite',
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
  'Strength':'Kuvvet','Explosive':'Patlayıcı','Olympic Lift':'Olimpik Halter',
  'Non-Reactive Agility':'Reaktif Olmayan Çeviklik','Reactive Agility':'Reaktif Çeviklik',
  'Acceleration':'İvmelenme','Deceleration':'Yavaşlama','COD':'Yön Değiştirme','Sprint Technique':'Sprint Tekniği',
  'Lateral':'Lateral','Rotational':'Rotasyonel','Multi-Directional':'Çok Yönlü',
  'Thoracic':'Torasik','Shoulder':'Omuz','Hip':'Kalça','Ankle':'Ayak Bileği','Spine':'Omurga','Wrist':'El Bileği',
  'Exercise Type':'Egzersiz Tipi','Technique':'Teknik','Position':'Pozisyon','Equipment':'Ekipman',
  'Shoulder Girdle':'Omuz Kuşağı','Pelvis':'Pelvis','Knee':'Diz',
  'Type':'Tip','Return to Performance':'Performansa Dönüş',
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
  'Blood Flow Restriction':'Kan Akımı Kısıtlama','Cluster Sets':'Küme Setler','Olympic Lift':'Olimpik Halter',
  'Medicine Ball':'Sağlık Topu','French Contrast':'Fransız Kontrast','Sprint':'Sprint',
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

