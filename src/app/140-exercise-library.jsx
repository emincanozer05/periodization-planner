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

function videoEmbed(src){
  if(!src)return null;
  // Video kept on this device (cloud upload failed / henüz giriş yok) → yerel kopyayı oynat.
  if(isLocalRef(src)){const d=mediaSrc(src);return d&&d!==LM_BLANK?{kind:'file',src:d}:null;}
  if(src.startsWith('data:'))return{kind:'file',src};
  let m;
  if((m=src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)))return{kind:'iframe',src:'https://www.youtube.com/embed/'+m[1]};
  if((m=src.match(/vimeo\.com\/(?:video\/)?(\d+)/)))return{kind:'iframe',src:'https://player.vimeo.com/video/'+m[1]};
  // Instagram reels / posts / IGTV → official embeddable endpoint (raw URL blocks iframing)
  if((m=src.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i))){const ty=m[1].toLowerCase()==='reels'?'reel':m[1].toLowerCase();return{kind:'iframe',ig:true,src:'https://www.instagram.com/'+ty+'/'+m[2]+'/embed/'};}
  // TikTok video → embed player
  if((m=src.match(/tiktok\.com\/(?:.*\/video\/|v\/)(\d+)/)))return{kind:'iframe',src:'https://www.tiktok.com/embed/v2/'+m[1]};
  if(/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(src))return{kind:'file',src};
  if(/^https?:\/\//i.test(src))return{kind:'iframe',src};
  return null;
}
// Derive a cover-image URL from a video link (YouTube / Vimeo). Returns '' if none.
function videoThumb(src){
  if(!src)return'';
  let m;
  if((m=src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)))return'https://img.youtube.com/vi/'+m[1]+'/hqdefault.jpg';
  if((m=src.match(/vimeo\.com\/(?:video\/)?(\d+)/)))return'https://vumbnail.com/'+m[1]+'.jpg';
  return'';
}
// Best-effort: fetch the og:image (cover) of an Instagram reel/post via CORS proxies.
async function fetchOgImage(url){
  if(!url||!/instagram\.com\//i.test(url))return'';
  const proxies=[u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),u=>'https://corsproxy.io/?url='+encodeURIComponent(u)];
  const fetchT=(u,ms=7000)=>{const c=new AbortController();const id=setTimeout(()=>c.abort(),ms);return fetch(u,{cache:'no-store',signal:c.signal}).finally(()=>clearTimeout(id));};
  for(const p of proxies){
    try{const res=await fetchT(p(url));if(!res.ok)continue;const html=await res.text();
      let m=html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)||html.match(/"display_url":"([^"]+)"/);
      if(m)return m[1].replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    }catch(e){/* next */}
  }
  return'';
}

// Instagram reel/post → fetch the real MP4 (og:video) via a CORS proxy and play
// it inline as a <video>. Falls back to the official embed card if extraction fails.
function InstagramVideo({url,embedSrc}){
  const[st,setSt]=useState({loading:true,mp4:'',failed:false});
  useEffect(()=>{
    let alive=true;setSt({loading:true,mp4:'',failed:false});
    const proxies=[
      u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
      u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
      u=>'https://r.jina.ai/'+u,
    ];
    const extract=html=>{
      let m=html.match(/property=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/i)
        ||html.match(/content=["']([^"']+)["']\s+property=["']og:video(?::secure_url)?["']/i)
        ||html.match(/"video_url":"([^"]+)"/)
        ||html.match(/"video_versions":\[\{[^}]*?"url":"([^"]+)"/);
      if(!m)return'';
      return m[1].replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    };
    const fetchT=(u,ms=7000)=>{const c=new AbortController();const id=setTimeout(()=>c.abort(),ms);
      return fetch(u,{cache:'no-store',signal:c.signal}).finally(()=>clearTimeout(id));};
    (async()=>{
      for(const p of proxies){
        try{
          const res=await fetchT(p(url));
          if(!res.ok)continue;
          const html=await res.text();
          const v=extract(html);
          if(v&&alive){setSt({loading:false,mp4:v,failed:false});return;}
        }catch(e){/* try next proxy */}
      }
      if(alive)setSt({loading:false,mp4:'',failed:true});
    })();
    return()=>{alive=false;};
  },[url]);
  if(st.loading)return<div className="ex-novid">Instagram videosu yükleniyor…</div>;
  if(st.mp4)return<video className="ex-video" src={st.mp4} controls playsInline preload="metadata"/>;
  // Extraction failed → official embed card (plays inside the card; may need a tap)
  return<iframe className="ex-video" src={embedSrc} title={L('egzersiz videosu','exercise video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0"/>;
}
function VideoPlayer({ex}){
  const v=videoEmbed(ex.videoData||ex.videoUrl);
  /* Only the video plays here. The exercise's picture is the library card's cover and the
     PDF's image; on the open entry it is shown only while editing, small, under its own
     Paste button. */
  if(!v)return<div className="ex-novid">{L('Henüz video yok — düzenleyip video yükle veya link yapıştır.','No video yet — edit to upload a video or paste a link.')}</div>;
  if(v.kind==='file')return<video className="ex-video" src={v.src} controls/>;
  if(v.ig)return<InstagramVideo url={ex.videoData||ex.videoUrl} embedSrc={v.src}/>;
  return<iframe className="ex-video" src={v.src} title={L('egzersiz videosu','exercise video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0"/>;
}

/* ---- Muscle groups: pick one, or type one the list does not have -------------
   The box used to be a native dropdown with a fixed seventeen names. A muscle the list
   did not carry — rotator cuff, tibialis, serratus — could not be added at all, and a
   coach reported the picker as "does not add". Now it is a text box with the list under
   it: typing filters the list, a click or Enter adds the highlighted name, and a name
   that is not on the list at all is added as it was typed AND remembered on the account
   (`data.customMuscles`, synced like everything else), so it is on the list for every
   exercise from then on. A remembered name can be taken off the list with its own ✕ —
   that forgets the suggestion only; exercises already tagged with it keep the tag. */
function MusclePicker({value,onAdd,custom,onRemember,onForget}){
  const[q,setQ]=useState('');
  const[open,setOpen]=useState(false);
  const[hi,setHi]=useState(0);
  const wrap=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const away=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',away);
    return()=>document.removeEventListener('mousedown',away);
  },[open]);
  const have=new Set((value||[]).map(v=>String(v).toLowerCase()));
  const customList=(Array.isArray(custom)?custom:[]).filter(m=>String(m||'').trim());
  const all=[...EX_MUSCLES,...customList.filter(c=>!EX_MUSCLES.some(m=>m.toLowerCase()===c.toLowerCase()))];
  const norm=x=>String(x||'').toLocaleLowerCase('tr');
  const t=q.trim();
  const opts=all.filter(m=>!have.has(m.toLowerCase()))
    .filter(m=>!t||norm(m).includes(norm(t))||norm(exLabel(m)).includes(norm(t)));
  /* The typed text itself, offered as a new muscle when it matches nothing on the list
     under either language — "Glutes" typed on a Turkish screen is still Glutes. */
  const exact=all.find(m=>norm(m)===norm(t)||norm(exLabel(m))===norm(t));
  const isNew=!!t&&!exact&&!have.has(t.toLowerCase());
  const rows=[...opts.map(m=>({m,isCustom:customList.includes(m)})),...(isNew?[{m:t,isNew:true}]:[])];
  const pick=r=>{
    if(!r)return;
    const v=r.isNew?t:r.m;
    if(r.isNew&&onRemember)onRemember(v);
    onAdd(v);
    setQ('');setHi(0);
  };
  return(<div className="mus-add" ref={wrap}>
    <input value={q} placeholder={L('+ Kas ekle… (listeden seç ya da yaz)','+ Add muscle… (pick or type)')}
      onFocus={()=>setOpen(true)}
      onChange={e=>{setQ(e.target.value);setOpen(true);setHi(0);}}
      onKeyDown={e=>{
        if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setHi(h=>Math.min(h+1,rows.length-1));}
        else if(e.key==='ArrowUp'){e.preventDefault();setHi(h=>Math.max(h-1,0));}
        else if(e.key==='Enter'){e.preventDefault();
          if(exact&&!have.has(exact.toLowerCase()))pick({m:exact});else pick(rows[hi]);}
        else if(e.key==='Escape'){setOpen(false);}
      }}/>
    {open&&rows.length>0&&<div className="mus-menu" role="listbox">
      {rows.map((r,i)=><div key={(r.isNew?'+':'')+r.m} role="option" aria-selected={i===hi}
        className={'mus-opt'+(i===hi?' hi':'')+(r.isNew?' new':'')}
        onMouseEnter={()=>setHi(i)} onMouseDown={e=>{e.preventDefault();pick(r);}}>
        {r.isNew
          ?<span>＋ {L(`"${r.m}" yeni kas olarak ekle`,`Add "${r.m}" as a new muscle`)}</span>
          :<span>{exLabel(r.m)}</span>}
        {r.isCustom&&<i className="mus-own">{L('eklediğin','yours')}</i>}
        {r.isCustom&&onForget&&<button type="button" className="mus-forget"
          title={L('Bu kası listeden kaldır (etiketli egzersizler etkilenmez)','Remove this muscle from the list (tagged exercises keep it)')}
          onMouseDown={e=>{e.preventDefault();e.stopPropagation();onForget(r.m);}}>✕</button>}
      </div>)}
    </div>}
  </div>);
}

function ExerciseModal({ex,onChange,onDelete,onClose,customMuscles,onRememberMuscle,onForgetMuscle}){
  const set=(k,v)=>onChange({[k]:v});
  /* A court drill and a lift are catalogued by different things, so the card asks
     different questions: the drill wants its diagram, how many players it is run with and
     what it teaches; the lift wants its pattern, its muscles and its difficulty. */
  const ball=exLib(ex)==='ball';
  const TYPES=ball?BALL_TYPES:EX_TYPES;
  const SUBS=ball?BALL_SUB_TYPES:SUB_TYPES;
  const[upPct,setUpPct]=useState(null);
  const[editing,setEditing]=useState(!ex.name);
  /* The court's tool rail belongs beside the clip, not on top of the floor it draws on:
     the left column holds the slot, the board keeps the right. State rather than a plain
     ref, so mounting the slot re-renders the editor that paints into it. */
  const[courtBar,setCourtBar]=useState(null);
  /* The notes box ends level with the bottom of the clip beside it. Measured rather than
     guessed: the clip is 16:9 of a column whose width is the modal's, so no fixed height
     lines the two up at every width. Falls back to its own minimum if nothing is there
     to measure against. */
  const playerRef=useRef(null);
  const notesRef=useRef(null);
  const[notesH,setNotesH]=useState(0);
  useLayoutEffect(()=>{
    const measure=()=>{
      const pl=playerRef.current,ta=notesRef.current;
      if(!pl||!ta){setNotesH(0);return;}
      const h=Math.round(pl.getBoundingClientRect().bottom-ta.getBoundingClientRect().top);
      // Stacked into one column (narrow screens), the clip ends above the notes start and
      // there is nothing to line up with: the box keeps its own height there.
      if(h<160){setNotesH(0);return;}
      // Same height back means nothing to do — writing it again would have the observer
      // wake this up for ever.
      setNotesH(o=>Math.abs(o-h)<=1?o:h);
    };
    measure();
    const pl=playerRef.current;
    const ro=(typeof ResizeObserver==='function'&&pl)?new ResizeObserver(measure):null;
    if(ro)ro.observe(pl);
    window.addEventListener('resize',measure);
    return()=>{ro&&ro.disconnect();window.removeEventListener('resize',measure);};
  },[editing,ball,ex.type,ex.image,ex.videoData,ex.videoUrl]);
  const shownName=useExerciseText(ex.name);
  const shownPurpose=useExerciseText(ex.purpose);
  const _vEmbed=videoEmbed(ex.videoData||ex.videoUrl);
  const onVideoFile=async file=>{
    if(!file)return;
    const mb=file.size/1048576;
    const fb=(typeof FB==='function')?FB():null;
    const loggedIn=fb&&fb.auth&&fb.auth().currentUser;
    if(loggedIn){
      if(mb>200){alert(L('Video çok büyük ('+mb.toFixed(0)+' MB). 200 MB altı bir dosya seç ya da YouTube linki kullan.','Video is too large ('+mb.toFixed(0)+' MB). Pick a file under 200 MB or use a YouTube link.'));return;}
      try{setUpPct(0);const url=await uploadMedia(file,'videos',p=>setUpPct(p),file.name);onChange({videoUrl:url,videoData:''});}
      catch(e){alert(L('Video yüklenemedi: ','Video upload failed: ')+(e.message||e));}
      finally{setUpPct(null);}
      return;
    }
    if(mb>25){alert(L('Bulut yüklemesi için giriş yap. Çevrimdışı sınır: 25 MB. Daha büyük videoda YouTube linki kullan.','Sign in for cloud upload. Offline limit: 25 MB. Use a YouTube link for a larger video.'));return;}
    if(mb>5&&!window.confirm(L('Video ~'+mb.toFixed(1)+' MB. Giriş yapmadan yüklersen cihaz hafızasını zorlar; giriş yapıp buluta yüklemen önerilir. Yine de yüklensin mi?','Video is ~'+mb.toFixed(1)+' MB. Uploading without signing in strains device storage; signing in and uploading to the cloud is recommended. Upload anyway?')))return;
    /* Cihazda saklanır ve duruma sadece tutamağı yazılır — bir video base64 olarak
       senkronlanan JSON'a girseydi her düzenlemede baştan gönderilirdi. */
    const r=new FileReader();
    r.onload=async e=>{
      try{set('videoData',await saveLocalMedia(e.target.result));}
      catch(err){console.warn('local media store unavailable → inline fallback',err);set('videoData',e.target.result);}
    };
    r.readAsDataURL(file);
  };
  /* A still or a GIF, for the exercises that are demonstrated by a loop rather than a clip.
     A GIF is uploaded byte for byte — the resize path draws it onto a canvas, which would
     hand back a single frame and quietly kill the animation. */
  const onImageFile=async file=>{
    if(!file)return;
    const isGif=/gif/i.test(file.type)||/\.gif$/i.test(file.name||'');
    if(!isGif){handleImageUpload(file,'eximg',url=>set('image',url),p=>setUpPct(p));return;}
    const mb=file.size/1048576;
    if(mb>25){alert(L('GIF çok büyük ('+mb.toFixed(0)+' MB). 25 MB altı bir dosya seç.','GIF is too large ('+mb.toFixed(0)+' MB). Pick a file under 25 MB.'));return;}
    const fb=(typeof FB==='function')?FB():null;
    if(fb&&fb.auth&&fb.auth().currentUser){
      try{setUpPct(0);const url=await uploadMedia(file,'eximg',pc=>setUpPct(pc),file.name);set('image',url);return;}
      catch(e){warnStorageFailure(e);}
      finally{setUpPct(null);}
    }
    const r=new FileReader();
    r.onload=async e=>{
      try{set('image',await saveLocalMedia(e.target.result));}
      catch(err){console.warn('local media store unavailable → inline fallback',err);set('image',e.target.result);}
    };
    r.readAsDataURL(file);
  };
  /* Paste Image / GIF: whatever image is on the clipboard is uploaded at once, through the
     same path as a picked file. Right-click on the button still opens the file picker. */
  const imgFileRef=useRef(null);
  const pasteExImage=async()=>{
    if(!navigator.clipboard||!navigator.clipboard.read){
      alert(L('Bu tarayıcı panodan okumaya izin vermiyor. Görseli kopyala, aşağıdaki kutuya tıkla ve Ctrl/Cmd+V yap.','This browser does not allow reading the clipboard. Copy the image, click the box below and press Ctrl/Cmd+V.'));return;}
    try{
      const items=await navigator.clipboard.read();
      for(const it of items){
        const type=it.types.find(t=>t.startsWith('image/'));
        if(!type)continue;
        const blob=await it.getType(type);
        const ext=(type.split('/')[1]||'png').replace(/[^a-z0-9]/gi,'')||'png';
        onImageFile(new File([blob],'pasted.'+ext,{type}));
        return;
      }
      alert(L('Panoda görsel yok. Önce bir görsel kopyala, sonra Yapıştır\'a bas.','No image on the clipboard. Copy an image first, then press Paste.'));
    }catch(e){
      alert(L('Pano okunamadı. Bu site için pano iznini aç ya da görseli kopyalayıp aşağıdaki kutuda Ctrl/Cmd+V yap.','The clipboard could not be read. Allow clipboard access for this site, or copy the image and press Ctrl/Cmd+V over the box below.'));
    }
  };
  // Removing the picture removes it everywhere it lives on the entry (see exPicture).
  const clearExImage=()=>onChange({image:'',planImage:'',thumb:''});
  const metaLbl={fontSize:10,fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4,display:'block'};
  const metaBox=(label,value,extra)=>value?(<div style={{background:'var(--elevated)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 13px'}}>
    <span style={metaLbl}>{label}</span>
    <div style={{fontSize:13,fontWeight:600,color:'var(--text)',display:'flex',alignItems:'center',gap:6}}>{value}{extra}</div>
  </div>):null;
  /* The program-row picture had a paste slot here. A picture written onto a program row
     is chosen on the row, where the coach can see the box it lands in, so the slot on this
     page was a second place to set the same thing — `thumb`/`planImage` are still read
     when the exercise is written into a session. */
  const viewRight=(
    <div className="ex-modal-right">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {/* At a glance the coach needs what to set up and how hard it is; the filing
            (type, sub-type, action, pattern…) is on the edit side. A drill keeps its
            type and player count, which is how a drill is read. */}
        {ball&&metaBox(L('Dril Tipi','Drill Type'),exLabel(ex.type))}
        {ball&&SUBS[ex.type]&&metaBox(exLabel(SUBS[ex.type].label),ex.subType?exLabel(ex.subType):'—')}
        {ball&&metaBox(L('Oyuncu','Players'),ex.players)}
        {!ball&&(EX_EXTRA_FILTERS[ex.type]||[]).some(d=>d.key==='equipment')
          &&metaBox(exLabel('Equipment'),exMulti(ex.equipment).map(exLabel).join(', ')||'—')}
        {metaBox(L('Zorluk','Difficulty'),exLabel(ex.difficulty),ex.difficulty&&<span style={{width:8,height:8,borderRadius:'50%',background:DIFF_COLOR[ex.difficulty]||'var(--dim)',display:'inline-block'}}/>)}
      </div>
      {ball&&!sceneIsEmpty(ex.court)&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Saha Çizimi','Court Diagram')}</span>
        <div className="bp-modal-court"><CourtView scene={ex.court}/></div>
      </div>}
      {exContraOf(ex).length>0&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Kontrendikasyon Uyarısı','Contraindication Warning')}
          <span className="info-tip" tabIndex={0} aria-label={L('Kontrendikasyon nedir?','What is a contraindication?')}>?
            <span className="info-tip-box" role="tooltip">{L('Bu egzersizin, belirtilen bölgede sakatlığı veya ağrısı olan sporcular için uygun olmayabileceğini gösterir. Sporcuda bu sorun varsa egzersizi yapmaması ya da değiştirmesi önerilir.','Indicates this exercise may be unsuitable for athletes with an injury or pain in the listed area. If the athlete has this issue, skip or modify the exercise.')}</span>
          </span>
        </span>
        <div className="iv-chips">{exContraOf(ex).map(id=><span key={id} className="iv-chip on">{ctLabelIn(id,REPORT_LANG==='tr')}</span>)}</div>
      </div>}
      {(ex.muscle||[]).length>0&&<div style={{marginBottom:14}}>
        <span style={metaLbl}>{L('Kas Grupları','Muscle Groups')}</span>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {(ex.muscle||[]).map((m,i)=><span key={i} className="mus-chip">{exLabel(m)}</span>)}
        </div>
      </div>}
      {ex.purpose&&<div>
        <span style={metaLbl}>{L('Amaç / Açıklama','Purpose / Description')}</span>
        <div className="ex-purpose-view" style={{color:'var(--text2)',whiteSpace:'pre-wrap'}}>{shownPurpose}</div>
      </div>}
      {!ex.type&&!ex.purpose&&!(ex.muscle||[]).length&&<div className="empty-st" style={{padding:'24px 0'}}>{L('Henüz detay yok — egzersiz bilgisi eklemek için Düzenle\'ye tıkla.','No details yet — click Edit to add exercise info.')}</div>}
    </div>
  );
  const editRight=(
    <div className="ex-modal-right">
      {/* One grid for every field, so an optional field that is absent (no action, no
          movement pattern) closes up instead of leaving an empty cell in the middle. */}
      <div className="grid cols-2">
        <div><label>{ball?L('Dril Tipi','Drill Type'):L('Egzersiz Tipi','Exercise Type')}</label>
          <select value={ex.type||''} onChange={e=>{const v=e.target.value;
            /* The category's own extra fields go with it: an Equipment set on a push is
               not carried onto a Core entry, where there is no filter to find it by. */
            const keep=new Set((EX_EXTRA_FILTERS[v]||[]).map(d=>d.key));
            const drop={};EX_EXTRA_KEYS.forEach(k=>{if(!keep.has(k)&&ex[k])drop[k]='';});
            onChange({type:v,subType:'',...(ACTIONS_FOR[v]?{}:{action:''}),...drop});}}>
            <option value="">—</option>
            {TYPES.map(t=><option key={t} value={t}>{exLabel(t)}</option>)}
          </select>
        </div>
        <div><label>{SUBS[ex.type]?exLabel(SUBS[ex.type].label):L('Alt Tip','Sub Type')}</label>
          <select value={ex.subType||''} onChange={e=>set('subType',e.target.value)} disabled={!SUBS[ex.type]}>
            <option value="">{SUBS[ex.type]?'—':L('Önce tip seç','Select type first')}</option>
            {(SUBS[ex.type]?.values||[]).map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>
        {!ball&&ACTIONS_FOR[ex.type]&&<div><label>{exLabel('Action')}</label>
          <select value={ex.action||''} onChange={e=>set('action',e.target.value)}>
            <option value="">—</option>
            {ACTIONS_FOR[ex.type].map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>}
        {!ball&&(EX_EXTRA_FILTERS[ex.type]||[]).map(d=>d.multi?<div key={d.key}><label>{exLabel(d.label)}</label>
          <div className="mus-pick">
            {exMulti(ex[d.key]).map(v=><span key={v} className="mus-chip on">{exLabel(v)}<button type="button" onClick={()=>set(d.key,exMulti(ex[d.key]).filter(x=>x!==v))}>✕</button></span>)}
            <select value="" onChange={e=>{const v=e.target.value;const list=exMulti(ex[d.key]);if(v&&!list.includes(v))set(d.key,[...list,v]);}}>
              <option value="">{exMulti(ex[d.key]).length?L('+ Ekle…','+ Add…'):'—'}</option>
              {d.values.filter(v=>!exMulti(ex[d.key]).includes(v)).map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
            </select>
          </div>
        </div>:<div key={d.key}><label>{exLabel(d.label)}</label>
          <select value={ex[d.key]||''} onChange={e=>set(d.key,e.target.value)}>
            <option value="">—</option>
            {d.values.map(v=><option key={v} value={v}>{exLabel(v)}</option>)}
          </select>
        </div>)}
        {ball
          ?<div><label>{L('Oyuncu Sayısı','Players')}</label>
            <input value={ex.players||''} onChange={e=>set('players',e.target.value)} placeholder={L('ör. 3v3, 5 oyuncu','e.g. 3v3, 5 players')}/></div>
          :PATTERNS_FOR[ex.type]?<div><label>{L('Hareket Örüntüsü','Movement Pattern')}</label>
            <select value={ex.pattern||''} onChange={e=>set('pattern',e.target.value)}>
              <option value="">—</option>
              {PATTERNS_FOR[ex.type].map(p=><option key={p} value={p}>{exLabel(p)}</option>)}
            </select></div>:null}
        <div><label>{L('Zorluk','Difficulty')}</label>
          <select value={ex.difficulty||''} onChange={e=>set('difficulty',e.target.value)}>
            <option value="">—</option>
            {DIFFICULTIES.map(d=><option key={d} value={d}>{exLabel(d)}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginTop:14}}>
        <label>{L('Amaç / Açıklama','Purpose / Description')}</label>
        <textarea ref={notesRef} className="ex-purpose" value={ex.purpose} onChange={e=>set('purpose',e.target.value)}
          placeholder={ball?L('Kurallar, ilerlemeler, koçluk noktaları, skorlama…','Rules, progressions, coaching points, scoring…')
                           :L('Hangi kaslar, hangi amaç? İpuçları, set/tekrar önerileri…','Which muscles, what goal? Cues, set/rep suggestions…')}
          style={notesH?{height:notesH,minHeight:120}:{minHeight:200}}/>
      </div>
      {!ball&&<div style={{marginTop:14}}><label>{L('Kas Grupları (çoklu)','Muscle Groups (multi)')}</label>
        <div className="mus-pick">
          {(ex.muscle||[]).map((m,i)=><span key={i} className="mus-chip on">{exLabel(m)}<button type="button" onClick={()=>set('muscle',(ex.muscle||[]).filter((_,j)=>j!==i))}>✕</button></span>)}
          <MusclePicker value={ex.muscle||[]} onAdd={v=>{const list=ex.muscle||[];if(!list.includes(v))set('muscle',[...list,v]);}}
            custom={customMuscles} onRemember={onRememberMuscle} onForget={onForgetMuscle}/>
        </div>
      </div>}
      {/* The pain regions this exercise is not given with — the same regions the athlete's
          pain and injury records use. Written into the library file for the AI project. */}
      {!ball&&<div style={{marginTop:14}}><label>{L('Kontrendikasyon — bu bölgede ağrı / sakatlık varsa verilmez','Contraindication — not given with pain or injury in this region')}</label>
        <div className="iv-chips">
          {CONSTRAINT_TAGS.map(tg=>{const cur=exContraOf(ex),on=cur.includes(tg.id);
            return<button key={tg.id} type="button" className={'iv-chip'+(on?' on':'')} aria-pressed={on}
              onClick={()=>set('contra',on?cur.filter(x=>x!==tg.id):[...cur,tg.id])}>{ctLabelIn(tg.id,REPORT_LANG==='tr')}</button>;})}
        </div>
      </div>}
    </div>
  );
  return(<div className="modal-bg" onClick={onClose}>
    <div className="modal ex-modal ex-modal-wide" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        {editing
          ?<input className="ex-title-in" value={ex.name} placeholder={L('Egzersiz adı…','Exercise name…')} onChange={e=>set('name',e.target.value)}/>
          :<div style={{flex:1,fontWeight:700,fontSize:17,color:'var(--text)',padding:'6px 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shownName||'—'}</div>
        }
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ex-modal-body ex-modal-grid">
        <div className="ex-modal-left">
          <div ref={playerRef} className={`ex-player-wrap${_vEmbed&&_vEmbed.ig?' ig':''}`}><VideoPlayer ex={ex}/></div>
          {editing&&<div className="row" style={{marginTop:12,gap:10,flexWrap:'wrap'}}>
            <label className="btn sec sm" style={{cursor:'pointer',margin:0}}>📹 {L('Video Yükle','Upload Video')}
              <input type="file" accept="video/*" style={{display:'none'}} onChange={e=>onVideoFile(e.target.files[0])}/>
            </label>
            {/* The exercise's picture — the library card's cover and the PDF's image. A
                copied picture is pasted and uploaded in one click; right-click picks a file. */}
            {/* A label, like Upload Video beside it, so the two read as one row of buttons. */}
            <label role="button" tabIndex={0} className="btn sec sm" style={{cursor:'pointer',margin:0}} onClick={pasteExImage}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pasteExImage();}}}
              onContextMenu={e=>{e.preventDefault();imgFileRef.current&&imgFileRef.current.click();}}
              title={L('Kopyalanan görseli yapıştır · Sağ tık: dosya seç','Paste the copied image · Right-click: choose a file')}>
              🖼 {L('Görsel / GIF Yapıştır','Paste Image / GIF')}</label>
            <input ref={imgFileRef} type="file" accept="image/*,.gif" style={{display:'none'}} onChange={e=>{onImageFile(e.target.files[0]);e.target.value='';}}/>
            {/* The pasted link is a third way of filling the same frame, so it stands with the
                two buttons that fill it rather than halfway down the other column. */}
            <input className="ex-vlink" value={ex.videoUrl} onChange={e=>set('videoUrl',e.target.value)}
              placeholder={L('…ya da link yapıştır (YouTube / Vimeo / mp4)','…or paste a link (YouTube / Vimeo / mp4)')}/>
            {ex.videoData&&<button className="btn ghost xs" onClick={()=>set('videoData','')}>{L('Videoyu kaldır','Remove video')}</button>}
          </div>}
          {/* The picture, small, only while editing — the open entry shows the clip. */}
          {editing&&(()=>{const pic=exPicture(ex);const has=hasMedia(pic);
            return<div className="ex-pic">
              <div className={`ex-pic-box${has?'':' empty'}`} tabIndex={0}
                onPaste={e=>{const f=imageFileFromPaste(e);if(f){e.preventDefault();onImageFile(f);}}}
                onClick={has?undefined:pasteExImage}
                title={L('Ctrl/Cmd+V ile de yapıştırabilirsin','You can also paste with Ctrl/Cmd+V')}>
                {has?<><img src={mediaSrc(pic)} alt=""/>
                  <button type="button" className="ex-pic-x" title={L('Görseli kaldır','Remove image')} onClick={clearExImage}>×</button></>
                  :L('Görsel yok — kopyaladığın görseli yapıştır','No image — paste a copied image')}
              </div>
              <div className="help" style={{margin:0}}>{L('Bu görsel kütüphane kartında ve PDF\'te görünür.','This image is shown on the library card and in the PDF.')}</div>
            </div>;})()}
          {upPct!=null&&<div className="help" style={{marginTop:6}}>{L('Yükleniyor… ','Uploading… ')}{upPct}%</div>}
        </div>
        {editing?editRight:viewRight}
        {/* The court's tools get their own full-width row above the floor, so the board
            below is nothing but board and the rail is read left to right instead of being
            folded into a column beside the clip. Only mounted while editing a drill —
            there is nothing to draw with otherwise. */}
        {editing&&ball&&<div className="ct-bar-slot">
          <span className="ct-bar-slot-lbl">{L('Çizim Araçları','Drawing Tools')}</span>
          <div ref={setCourtBar}/>
        </div>}
        {/* The floor gets the modal's whole width, under both columns. Sharing a column with
            the fields made a full court widen that column, and the clip on the left shrank
            to pay for it — the board is the one thing here whose width is not the coach's
            choice. Its rail stays over on the left, so this row is nothing but board. */}
        {editing&&ball&&<div className="ex-modal-court">
          <label>{L('Saha Çizimi','Court Diagram')}</label>
          <CourtEditor value={ex.court} onChange={sc=>set('court',sc)} barSlot={courtBar}/>
        </div>}
      </div>
      <div className="modal-foot">
        {editing
          ?<><button className="btn danger sm" onClick={onDelete}>{L('Sil','Delete')}</button><button className="btn sm" onClick={()=>setEditing(false)}>{L('Bitti','Done')}</button></>
          :<><button className="btn sec sm" onClick={()=>setEditing(true)}>✎ {L('Düzenle','Edit')}</button><button className="btn sm" onClick={onClose}>{L('Kapat','Close')}</button></>
        }
      </div>
    </div>
  </div>);
}

function ExerciseCardRaw({ex,onOpen,used=0}){
  const v=videoEmbed(ex.videoData||ex.videoUrl);
  const shownName=useExerciseText(ex.name);
  const[hov,setHov]=useState(false);
  const[igImg,setIgImg]=useState('');
  /* The card's picture is the one the coach put on the exercise — the same one the
     library PDF prints — and only without one does the video's auto-thumbnail (or an
     Instagram reel's og:image) stand in. Hovering still plays the clip. */
  const pic=exPicture(ex);
  const cover=(hasMedia(pic)?pic:'')||videoThumb(ex.videoData||ex.videoUrl)||igImg;
  // Instagram reels have no auto thumbnail → fetch the og:image once
  useEffect(()=>{
    if(!v||!v.ig){setIgImg('');return;}
    let alive=true;(async()=>{const img=await fetchOgImage(ex.videoData||ex.videoUrl);if(alive&&img)setIgImg(img);})();
    return()=>{alive=false;};
  },[ex.videoUrl,ex.videoData]);
  // Add autoplay+mute params to YouTube/Vimeo URLs so the preview plays silently on hover
  const previewSrc=v&&v.kind==='iframe'?(v.src+(v.src.indexOf('?')>=0?'&':'?')+'autoplay=1&mute=1&muted=1&controls=0&playsinline=1&loop=1&modestbranding=1'):null;
  return(<div className="ex-card" onClick={()=>onOpen(ex.id)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
    <div className="ex-thumb">
      {hov&&v?(v.kind==='file'
        ? <video className="ex-thumb-vid" src={v.src} autoPlay muted loop playsInline/>
        : <iframe className="ex-thumb-vid" src={previewSrc} title={L('önizleme','preview')} allow="autoplay; encrypted-media" frameBorder="0"/>
      ):(
        cover ? <img src={mediaSrc(cover)} alt="" onError={e=>{e.target.style.display='none';}}/>
        : (v&&v.kind==='file') ? <video className="ex-thumb-vid" src={v.src+'#t=0.1'} muted preload="metadata" playsInline/>
        /* A drill with no clip is recognised by its diagram, not by a placeholder — the
           court IS the thumbnail, which is how a coach picks one off a shelf. */
        : !sceneIsEmpty(ex.court) ? <CourtView scene={ex.court} className="bp-card-court"/>
        : <div className="ex-thumb-ph">{exLib(ex)==='ball'?'🏀':'🏋'}</div>
      )}
      {v&&!hov&&<span className="ex-vbadge">▶</span>}
      {used>0&&<span className="ex-used" title={L(`Sezon programında ${used} kez kullanıldı`,`Used ${used}× in the season program`)}>{L(`${used}× kullanıldı`,`${used}× used`)}</span>}
    </div>
    <div className="ex-cbody">
      <div className="ex-cname">{shownName||L('(isimsiz egzersiz)','(unnamed exercise)')}</div>
      {ex.difficulty&&<div className="diff-badge" style={{background:DIFF_COLOR[ex.difficulty],color:'#fff'}}>{exLabel(ex.difficulty)}</div>}
    </div>
  </div>);
}
/* A shelf holds hundreds of cards, and each one reads a video embed, resolves a picture and
   may draw a whole court diagram. Every keystroke in the open exercise's panel rewrites the
   state, which re-rendered all of them — the freeze felt while writing an exercise. Patching
   one entry leaves every other entry the same object, so the cards that did not change now
   stand still. `onOpen` takes the id rather than closing over it: a fresh closure per card
   per render would have made the comparison below always fail. */
const ExerciseCard=React.memo(ExerciseCardRaw);

/* Which shelf an entry sits on. Court work and weight-room work are catalogued by
   different things — a drill is filed by what it teaches, a lift by what it loads — so
   they get two shelves rather than one list with a filter on it. An entry saved before
   ball practice existed has no `lib` and is S&C, which is what it was. */
const exLib=e=>(e&&e.lib==='ball')?'ball':'sc';
/* One library filter as a dropdown: a compact button carrying the filter's name and the
   value picked, opening the values as a list. A row of these fits every filter of a
   category on one line, where a track of every value ran off the screen. */
function FilterDD({label,values,value,onChange}){
  const[open,setOpen]=useState(false);
  const[right,setRight]=useState(false);
  const ref=useRef(null),menuRef=useRef(null);
  useDDOutside([ref],open,()=>setOpen(false));
  /* A list opened near the right edge of the screen hangs leftward instead of off it. */
  useLayoutEffect(()=>{
    if(!open){setRight(false);return;}
    const m=menuRef.current;
    if(m&&m.getBoundingClientRect().right>window.innerWidth-8)setRight(true);
  },[open]);
  const pick=v=>{onChange(v);setOpen(false);};
  return(<div className={'exf'+(value?' on':'')+(open?' open':'')} ref={ref}>
    <button type="button" className="exf-btn" onClick={()=>setOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={open}>
      <span className="exf-k">{label}</span>
      <span className="exf-v">{value?exLabel(value):L('Tümü','All')}</span>
      <span className="exf-car" aria-hidden="true">▾</span>
    </button>
    {open&&<div className={'exf-menu'+(right?' right':'')} ref={menuRef} role="listbox" aria-label={label}>
      {['',...values].map(v=><button key={v||'__all'} type="button" role="option" aria-selected={value===v}
        className={'exf-opt'+(value===v?' on':'')} onClick={()=>pick(v)}>
        {v?exLabel(v):L('Tümü','All')}{value===v?<b>✓</b>:null}</button>)}
    </div>}
  </div>);
}
/* The level picker beside the filters: "All" and the three levels, each in its colour. */
function LevelSeg({value,onChange}){
  return(<div className="exf-lvl" role="radiogroup" aria-label={L('Seviye','Level')}>
    <span className="exf-lvl-k">{L('Seviye','Level')}</span>
    <button type="button" role="radio" aria-checked={!value} className={'all'+(!value?' on':'')} onClick={()=>onChange('')}>
      {L('Tümü','All')}</button>
    {DIFFICULTIES.map(d=><button key={d} type="button" role="radio" aria-checked={value===d}
      className={value===d?'on':''} style={{'--lc':DIFF_COLOR[d]}} onClick={()=>onChange(value===d?'':d)}
      title={exLabel(d)}><i/>{d.replace(/\D+/g,'')}</button>)}
  </div>);
}
/* The library's one download button: the format is picked from its menu, so the toolbar
   carries a single button rather than one per format. Closes on a pick, on a click
   outside it and on Escape. */
function LibDownloadMenu({disabled,busy,items}){
  const[open,setOpen]=useState(false);
  const boxRef=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const onDown=e=>{if(boxRef.current&&!boxRef.current.contains(e.target))setOpen(false);};
    const onKey=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',onDown);
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
  },[open]);
  return(<div className="lib-dl" ref={boxRef}>
    <button type="button" className="btn sm" disabled={disabled||busy} aria-haspopup="menu" aria-expanded={open}
      onClick={()=>setOpen(o=>!o)}>
      {busy?L('Hazırlanıyor…','Preparing…'):`⬇ ${L('İndir','Download')} ▾`}</button>
    {open&&<div className="lib-dl-menu" role="menu">
      {items.map(it=><button key={it.id} type="button" role="menuitem" className="lib-dl-it"
        onClick={()=>{setOpen(false);it.run();}}>
        {it.label}<small>{it.hint}</small></button>)}
    </div>}
  </div>);
}
function ExercisesView({data,setData}){
  const[libTab,setLibTab]=useState('sc');       // 'sc' | 'ball' — which shelf is open
  const ball=libTab==='ball';
  const allEx=data.exercises||[];
  const exercises=useMemo(()=>allEx.filter(e=>exLib(e)===libTab),[allEx,libTab]);
  // Writes go back into the ONE list the app stores: the shelf is a view of it, never a
  // second copy, so nothing on the other shelf can be dropped by a write to this one.
  const setExercises=arr=>setData({...data,exercises:[...arr,...allEx.filter(e=>exLib(e)!==libTab)]});
  const[activeType,setActiveType]=useState(null);  // null => category grid; type name => exercises within
  const[q,setQ]=useState('');
  /* The category's filters, one value per field ({subType:'Vertical', equipment:'Band'});
     a field with no value is not filtered on. */
  const[filt,setFilt]=useState({});
  const[openId,setOpenId]=useState(null);
  const[mdBusy,setMdBusy]=useState(false);
  const openCard=useCallback(id=>setOpenId(id),[]);   // stable, so the memoised cards hold
  // The two shelves have different categories, so a filter set on one means nothing on
  // the other — switching shelves lands on that shelf's own landing page.
  const TYPES=ball?BALL_TYPES:EX_TYPES;
  const SUBS=ball?BALL_SUB_TYPES:SUB_TYPES;
  const switchLib=t=>{if(t===libTab)return;setLibTab(t);setActiveType(null);setFilt({});setQ('');setOpenId(null);};

  const patch=(id,p)=>setData(prev=>({...prev,exercises:(prev.exercises||[]).map(e=>e.id===id?{...e,...p}:e)}));
  /* Muscles the coach typed that the fixed list does not carry, kept on the account so
     they are offered on every exercise from then on. */
  const muscleProps={
    customMuscles:Array.isArray(data.customMuscles)?data.customMuscles:[],
    onRememberMuscle:m=>setData(prev=>{const cur=Array.isArray(prev.customMuscles)?prev.customMuscles:[];
      const v=String(m||'').trim();
      if(!v||cur.some(x=>x.toLowerCase()===v.toLowerCase())||EX_MUSCLES.some(x=>x.toLowerCase()===v.toLowerCase()))return prev;
      return{...prev,customMuscles:[...cur,v]};}),
    onForgetMuscle:m=>setData(prev=>({...prev,customMuscles:(Array.isArray(prev.customMuscles)?prev.customMuscles:[]).filter(x=>x!==m)})),
  };
  const remove=id=>{if(window.confirm(ball?L('Bu dril silinsin mi?','Delete this drill?'):L('Bu egzersiz silinsin mi?','Delete this exercise?'))){setExercises(exercises.filter(e=>e.id!==id));setOpenId(null);}};
  const addExercise=type=>{const t=type||activeType||'';
    const e={id:uid(),name:'',lib:libTab,type:t==='__uncat__'?'':t,subType:'',movePattern:'',contra:[],muscle:[],videoUrl:'',videoData:'',thumb:'',purpose:'',
      ...(ball?{court:emptyScene(),players:''}:{})};
    setExercises([e,...exercises]);setOpenId(e.id);};
  const typeCounts=useMemo(()=>{const m={};TYPES.forEach(t=>m[t]=0);exercises.forEach(e=>{if(TYPES.includes(e.type))m[e.type]=(m[e.type]||0)+1;});return m;},[exercises,TYPES]);
  const open=exercises.find(e=>e.id===openId);
  const goBack=()=>{setActiveType(null);setFilt({});setQ('');};
  // How many times each exercise name is prescribed across the whole season program (all teams).
  const usageCounts=useMemo(()=>{const m={};
    (data.teams||[]).forEach(t=>Object.values(t.days||{}).forEach(day=>(day.sessions||[]).forEach(s=>(s.blocks||[]).forEach(b=>(b.exercises||[]).forEach(ex=>{
      const n=(ex.name||'').trim().toLowerCase();if(n)m[n]=(m[n]||0)+1;})))));
    return m;},[data.teams]);
  const usedOf=e=>usageCounts[(e.name||'').trim().toLowerCase()]||0;
  // Exercises with no/unknown category (e.g. auto-added from the program editor) live here
  // so the coach can find and categorise them later.
  const uncatCount=exercises.filter(e=>!TYPES.includes(e.type)).length;
  /* The open shelf as a designed PDF in the app's language — every exercise as a card,
     its picture on the left in a frame of one fixed size and its details on the right.
     The descriptions are translated and the pictures read first, which takes a moment, so
     the button says it is working. */
  const downloadLibPdf=async()=>{
    if(mdBusy)return;
    setMdBusy(true);
    try{await downloadExLibraryPDF(exercises,{ball,libTab});}
    catch(e){console.warn('library PDF failed',e);
      alert(L('PDF oluşturulamadı — bağlantını kontrol edip tekrar dene.','The PDF could not be created — check your connection and try again.'));}
    finally{setMdBusy(false);}};
  /* The same shelf as a .txt — the file an AI project is loaded with as reference. */
  const downloadLibTxt=async()=>{
    if(mdBusy)return;
    setMdBusy(true);
    try{await downloadExLibraryText(exercises,{ball,libTab});}
    catch(e){console.warn('library text failed',e);
      alert(L('Metin dosyası oluşturulamadı — tekrar dene.','The text file could not be created — try again.'));}
    finally{setMdBusy(false);}};
  const mdBtn=<LibDownloadMenu disabled={exercises.length===0} busy={mdBusy} items={[
    {id:'pdf',label:'PDF',run:downloadLibPdf,
      hint:L('Uygulamanın diliyle, egzersiz görselleriyle','In the app language, with the exercise images')},
    {id:'txt',label:L('Metin (.txt)','Text (.txt)'),run:downloadLibTxt,
      hint:L('AI projesine referans dosyası olarak yüklenir','The reference file an AI project is loaded with')},
  ]}/>;
  const scN=allEx.filter(e=>exLib(e)==='sc').length,ballN=allEx.length-scN;
  /* The two shelves, side by side at the head of the page — S&C and Ball Practice are
     both the coach's library, and which one is open should never be something to hunt
     for in a dropdown. */
  const libSplit=(
    <div className="lib-split">
      <button type="button" className={libTab==='sc'?'on':''} onClick={()=>switchLib('sc')}>
        🏋 {L('Kuvvet ve Kondisyon','Strength & Conditioning')} <b>{scN}</b></button>
      <button type="button" className={ball?'on ball':''} onClick={()=>switchLib('ball')}>
        🏀 {L('Top Çalışması','Ball Practice')} <b>{ballN}</b></button>
    </div>);
  // Top-right category dropdown (label → the active shelf's own category values).
  const CAT_OPTIONS=ball?BALL_TYPES.map(t=>[t,t])
    :[['Upper Body Push','Upper Body Push'],['Upper Body Pull','Upper Body Pull'],['Hip Dominant','Hip Dominant'],['Knee Dominant','Knee Dominant'],['Full Body','Full Body'],['Core','Core'],['Multidirectional Speed','Multi Directional Speed'],['Plyometric','Plyometric'],['Medicine Ball','Medicine Ball'],['Mobility','Mobility'],['Stability','Stability'],['Balance','Balance'],['Corrective','Corrective'],['Accessory','Accessory']];
  // Every option carries its exercise count in parentheses, so the coach sees how
  // full each category is without opening it.
  const catDropdown=(
    <select className="ex-cat-dd" value={activeType||''} onChange={e=>{const v=e.target.value;if(!v){goBack();}else{setActiveType(v);setFilt({});setQ('');}}}>
      <option value="">{L('Tüm kategoriler','All categories')} ({exercises.length})</option>
      {CAT_OPTIONS.map(([lbl,val])=><option key={val} value={val}>{exLabel(lbl)} ({typeCounts[val]||0})</option>)}
      {uncatCount>0&&<option value="__uncat__">{L('Kategorisiz','Uncategorized')} ({uncatCount})</option>}
    </select>);

  // ----- Library landing — ALL exercises mixed across categories -----
  if(!activeType){
    const ql0=q.trim().toLowerCase();
    // Stable pseudo-random order (seeded by id) so categories are intermixed but the
    // grid doesn't reshuffle on every render.
    const hashStr=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;};
    const mixed=[...exercises].sort((a,b)=>hashStr(String(a.id||a.name||''))-hashStr(String(b.id||b.name||'')));
    const flat=ql0?mixed.filter(e=>(e.name||'').toLowerCase().includes(ql0)):mixed;
    return(<div className="ex-wrap">
      <datalist id="ex-types">{EX_TYPES.map(t=><option key={t} value={t}/>)}</datalist>
      <datalist id="ex-muscles">{EX_MUSCLES.map(t=><option key={t} value={t}/>)}</datalist>
      <PageHero title={L('Egzersiz Kütüphanesi','Exercise Library')}
        sub={ball?L('Top antrenmanı drilleri · tüm kategoriler','Ball-practice drills · all categories')
                 :L('Kuvvet ve kondisyon egzersizleri · tüm kategoriler','Strength & conditioning exercises · all categories')}
        stats={[{v:exercises.length,l:ball?L('Dril','Drills'):L('Egzersiz','Exercises')},
                {v:allEx.length,l:L('Kütüphane toplamı','Library total')}]}/>
      <div className="ex-toolbar">
        {libSplit}
        {catDropdown}
        <div className="ex-search"><span aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg></span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={ball?L('Dril ara…','Search drills…'):L('Egzersiz ara…','Search exercises…')}/></div>
        <button className="btn sm white" onClick={()=>addExercise()}>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</button>
        {mdBtn}
      </div>
      {flat.length===0&&<div className="ex-empty">{exercises.length===0
        ?(ball?L('Henüz dril yok. ＋ Dril Ekle ile başla — ya da bir top çalışması bloğunda çizip oradan kaydet.','No drills yet. Start with ＋ Add Drill — or draw one in a ball practice block and save it from there.')
              :L('Henüz egzersiz yok. ＋ Egzersiz Ekle ile başla.','No exercises yet. Start with ＋ Add Exercise.'))
        :L('Aramanla eşleşen sonuç yok.','Nothing matches your search.')}</div>}
      <div className="ex-grid">{flat.map(e=><ExerciseCard key={e.id} ex={e} used={usedOf(e)} onOpen={openCard}/>)}</div>
      {open && <ExerciseModal ex={open} onChange={p=>patch(open.id,p)} onDelete={()=>remove(open.id)} onClose={()=>setOpenId(null)} {...muscleProps}/>}
    </div>);
  }

  // ----- Inside a category -----
  const isUncat=activeType==='__uncat__';
  const sub=isUncat?null:(SUBS[activeType]||null);
  /* Every filter this category carries, in the order they are read: the sub-type first,
     then Hip / Knee Dominant's Action and Movement Pattern, then the category's own
     extras (EX_EXTRA_FILTERS). Each one filters on the entry field named by `key`. */
  const lift=!ball&&!isUncat;
  const dims=[
    sub&&{key:'subType',label:sub.label,values:sub.values},
    lift&&ACTIONS_FOR[activeType]&&{key:'action',label:'Action',values:ACTIONS_FOR[activeType]},
    lift&&PATTERNS_FOR[activeType]&&{key:'pattern',label:'Movement Pattern',values:PATTERNS_FOR[activeType]},
    ...(lift?(EX_EXTRA_FILTERS[activeType]||[]):[]),
  ].filter(Boolean);
  const filtered=dims.some(d=>filt[d.key])||!!filt.difficulty;
  const ql=q.toLowerCase();
  const list=exercises.filter(e=>{
    if(isUncat){if(TYPES.includes(e.type))return false;}
    else if(e.type!==activeType)return false;
    if(q&&!(e.name||'').toLowerCase().includes(ql))return false;
    if(filt.difficulty&&e.difficulty!==filt.difficulty)return false;
    return dims.every(d=>!filt[d.key]||(d.multi?exMulti(e[d.key]).includes(filt[d.key]):e[d.key]===filt[d.key]));
  });

  return(<div className="ex-wrap">
    <datalist id="ex-types">{EX_TYPES.map(t=><option key={t} value={t}/>)}</datalist>
    <datalist id="ex-muscles">{EX_MUSCLES.map(t=><option key={t} value={t}/>)}</datalist>
    <div className="ex-top">
      <div>
        <button className="btn sec sm" onClick={goBack} style={{marginBottom:8}}>← {L('Kategoriler','Categories')}</button>
        <h1 className="ex-h1">{isUncat?L('Kategorisiz','Uncategorized'):exLabel(activeType)}</h1>
        {isUncat&&<div className="sub">{L('Programdan otomatik eklenen / kategorisi atanmamış egzersizler. Kart\'a tıklayıp kategori ata.','Exercises added automatically from the program / not yet assigned a category. Click a card to assign one.')}</div>}
        {dims.length>0&&<div className="sub">{L('Filtre:','Filter:')} <b>{dims.map(d=>exLabel(d.label)).join(' · ')}</b></div>}
      </div>
    </div>
    <div className="ex-toolbar">
      {libSplit}
      {catDropdown}
      <div className="ex-search"><span aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg></span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={L(`${exLabel(activeType)} ara…`,`Search ${exLabel(activeType)}…`)}/></div>
      <button className="btn sm white" onClick={()=>addExercise()}>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</button>
        {mdBtn}
    </div>
    <div className="exf-bar">
      {dims.map(d=><FilterDD key={activeType+':'+d.key} label={exLabel(d.label)} values={d.values}
        value={filt[d.key]||''} onChange={v=>setFilt(f=>({...f,[d.key]:v}))}/>)}
      {filtered&&<button type="button" className="exf-clear" onClick={()=>setFilt({})}>✕ {L('Temizle','Clear')}</button>}
      <LevelSeg value={filt.difficulty||''} onChange={v=>setFilt(f=>({...f,difficulty:v}))}/>
    </div>
    {list.length===0&&<div className="ex-empty">{(filtered||q)
      ?L('Bu kategoride filtrelerine uyan sonuç yok. ','Nothing in this category matches your filters. ')
      :(ball?L('Bu kategoride dril yok. ','No drills in this category. '):L('Bu kategoride egzersiz yok. ','No exercises in this category. '))}
      {L('Eklemek için','Add one with')} <b>＋ {ball?L('Dril Ekle','Add Drill'):L('Egzersiz Ekle','Add Exercise')}</b>{L('\'yı kullan.','.')}</div>}
    <div className="ex-grid">{list.map(e=><ExerciseCard key={e.id} ex={e} used={usedOf(e)} onOpen={openCard}/>)}</div>
    {open && <ExerciseModal ex={open} onChange={p=>patch(open.id,p)} onDelete={()=>remove(open.id)} onClose={()=>setOpenId(null)} {...muscleProps}/>}
  </div>);
}

