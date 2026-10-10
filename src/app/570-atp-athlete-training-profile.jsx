/* ---- Athlete Training Profile ----------------------------------------------
   The athlete as a trainee, in three parts: every physical quality on one template,
   each with how much the current period develops it (Priority) — the Athletic Profile; what training has to respect (Constraints); and
   what the athlete has actually been exposed to lately (Exercise Exposure).

   It DESCRIBES the athlete. Nothing in the app picks an exercise or writes a session
   from it; it is handed to the individualization JSON beside the rest of the athlete's
   data, as ground for whoever writes the session. The first two parts are the coach's,
   stored under `ath.trainingProfile`; the third is read off the athlete's own calendar
   every time it is shown, so it cannot go stale.

   The terms are STORED and SENT in English: they are the taxonomy the profile is
   defined in, and the same words reach the JSON on every device whatever language the
   coach reads the app in. On screen they follow the app language — atpT() below puts
   each term into Turkish at the moment it is drawn, and nothing else. */
const atpId=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const atpItems=list=>list.map(en=>({id:atpId(en),en}));
/* Every term of the tab, English → Turkish. One list for all three parts, keyed by the
   English word, so a term that appears in two places (Acceleration is a quality and a
   stimulus) cannot be translated two ways. */
const ATP_TR={
  /* titles */
  'Athlete Profile':'Sporcu Profili','Athletic Profile':'Atletik Profil',
  'Athletic Development Priorities':'Atletik Gelişim Öncelikleri',
  /* "Joint by Joint" is the approach's own name and is not translated. */
  'Constraints':'Kısıtlar','Exercise Exposure':'Egzersiz Maruziyeti',
  /* joint by joint: joints, sides, views, the need scale */
  'Neck':'Boyun','Low Back':'Bel (Lumbar)','Scapula':'Skapula','Shoulder':'Omuz','Elbow':'Dirsek',
  'Wrist':'El Bileği','Thoracic Spine':'Torasik Omurga',
  'Thoracic Extension':'Torasik Ekstansiyon','Thoracic Rotation':'Torasik Rotasyon','Hip':'Kalça','Knee':'Diz',
  'Ankle':'Ayak Bileği','Foot':'Ayak','Right':'Sağ','Left':'Sol','Front':'Önden','Back':'Arkadan',
  'Need':'İhtiyaç','Joint':'Eklem','Side':'Taraf','Note':'Not','Level':'Düzey',
  'Stable Joints':'Stabil Eklemler','Mobile Joints':'Mobil Eklemler',
  /* the template: groups and qualities */
  'Speed':'Sürat','Change of Direction':'Yön Değiştirme','Plyometric / Reactive':'Pliometrik / Reaktif',
  'Strength':'Kuvvet','Power':'Güç','Movement Quality':'Hareket Kalitesi','Conditioning':'Kondisyon',
  'Acceleration':'İvmelenme','Max Velocity':'Maksimal Hız','Sprint Mechanics':'Sprint Mekaniği',
  'Deceleration':'Yavaşlama','Lateral Movement':'Lateral Hareket',
  'Jumping':'Sıçrama','Landing':'İniş','Reactive Strength':'Reaktif Kuvvet','Hopping':'Sekme',
  'Squat':'Squat','Hinge':'Kalça Menteşesi','Unilateral':'Tek Taraflı',
  'Horizontal Push':'Yatay İtme','Horizontal Pull':'Yatay Çekme','Vertical Push':'Dikey İtme','Vertical Pull':'Dikey Çekme',
  'Lower-Body Strength':'Alt Vücut Kuvveti','Upper-Body Strength':'Üst Vücut Kuvveti','Unilateral Strength':'Tek Taraflı Kuvvet',
  'Lower-Body Power':'Alt Vücut Gücü','Upper-Body Power':'Üst Vücut Gücü','Rate of Force Development':'Kuvvet Gelişim Hızı',
  'Mobility':'Mobilite','Stability':'Stabilite','Coordination':'Koordinasyon','Balance':'Denge',
  'Aerobic Capacity':'Aerobik Kapasite','Anaerobic Capacity':'Anaerobik Kapasite','Repeat Sprint Ability':'Tekrarlı Sprint Yeteneği',
  /* the priority scale (Moderate is an exposure level) */
  'Priority':'Öncelik','Moderate':'Orta','High':'Yüksek','Medium':'Orta','Low':'Düşük',
  /* exposure patterns that are not template qualities */
  'Lunge':'Lunge','Knee Dominant':'Diz Baskın','Hip Dominant':'Kalça Baskın',
  'Anti-Extension':'Anti-Ekstansiyon','Anti-Rotation':'Anti-Rotasyon','Anti-Lateral Flexion':'Anti-Lateral Fleksiyon','Rotation':'Rotasyon',
  /* constraints */
  'Hard':'Kesin','Soft':'Esnek','Hard Constraints':'Kesin Kısıtlar','Soft Constraints':'Esnek Kısıtlar',
  'Load':'Yük','Volume':'Hacim','Movement':'Hareket','Intensity':'Şiddet','Impact':'Darbe','Equipment':'Ekipman','Contact':'Temas',
  'Maximum Load':'Maksimum Yük','Reduced Load':'Azaltılmış Yük','No Heavy Loading':'Ağır Yüklenme Yok',
  'No Bilateral Loading':'Çift Taraflı Yüklenme Yok','No Unilateral Loading':'Tek Taraflı Yüklenme Yok',
  'Prefer Unilateral':'Tek Taraflı Tercih Et','Maximum Volume':'Maksimum Hacim','Limited Sets':'Sınırlı Set',
  'Limited Repetitions':'Sınırlı Tekrar','Limit Eccentric Volume':'Eksantrik Hacmi Sınırla',
  'Limit Knee-Dominant Volume':'Diz Baskın Hacmi Sınırla','Limit Repeated Exposure':'Tekrarlı Maruziyeti Sınırla',
  'Maximum RPE':'Maksimum RPE','Maximum Intensity':'Maksimum Şiddet','Submaximal Only':'Yalnızca Submaksimal',
  'Prefer Low-Fatigue Work':'Düşük Yorgunluklu Çalışma Tercih Et','No Maximal Sprint':'Maksimal Sprint Yok',
  'Submaximal Sprint':'Submaksimal Sprint','Limited Acceleration':'Sınırlı İvmelenme','No Jumping':'Sıçrama Yok',
  'No High-Impact Jumping':'Yüksek Darbeli Sıçrama Yok','Limited Jumping':'Sınırlı Sıçrama','Low-Impact Only':'Yalnızca Düşük Darbe',
  'Limit High-Impact Work':'Yüksek Darbeli Çalışmayı Sınırla','Limited ROM':'Sınırlı Hareket Açıklığı (ROM)',
  'Limited Knee Flexion':'Sınırlı Diz Fleksiyonu','No Overhead Movement':'Baş Üstü Hareket Yok',
  'Limited Overhead Movement':'Sınırlı Baş Üstü Hareket','Limited Rotation':'Sınırlı Rotasyon',
  'Prefer Stable Exercises':'Stabil Egzersizleri Tercih Et','No Barbell':'Barbell Yok','No Machine':'Makine Yok',
  'No Cable':'Kablo Yok','Prefer Dumbbell':'Dambıl Tercih Et','No Contact':'Temas Yok','Limited Contact':'Sınırlı Temas',
  /* exposure: windows, levels, table, layers */
  'Last Session':'Son Seans','Last 7 Days':'Son 7 Gün','Last 14 Days':'Son 14 Gün','Last 28 Days':'Son 28 Gün',
  'None / Not Recent':'Yakın Dönemde Yok','None':'Yok',
  'Exercise Level':'Egzersiz Düzeyi','Exercise':'Egzersiz','Exercise Family':'Egzersiz Ailesi','Movement Pattern':'Hareket Paterni',
  'Stimulus · Loading':'Uyaran · Yüklenme','Last Used':'Son Kullanım','Frequency':'Sıklık','Recent Exposure':'Son Maruziyet',
  'Athletic Stimulus':'Atletik Uyaran','Loading Characteristic':'Yüklenme Karakteri',
  'Unilateral Knee Dominant':'Tek Taraflı Diz Baskın','Unilateral Hip Dominant':'Tek Taraflı Kalça Baskın',
  'Anti-Flexion':'Anti-Fleksiyon','Trunk Flexion / Extension':'Gövde Fleksiyon / Ekstansiyon','Full Body':'Tüm Vücut',
  'Carry':'Taşıma','Ankle / Calf':'Ayak Bileği / Baldır','Plyometric':'Pliometrik','Sprint / Locomotion':'Sprint / Lokomosyon',
  'Stability / Balance':'Stabilite / Denge',
  'Hopping / Bounding':'Sekme / Bounding','Reactive / Depth':'Reaktif / Derinlik','Throwing':'Fırlatma',
  'Heavy Loading':'Ağır Yüklenme','High-Velocity':'Yüksek Hız','Eccentric Loading':'Eksantrik Yüklenme','Isometric':'İzometrik',
  'Ballistic':'Balistik',
  'Olympic Lift Family':'Olimpik Halter Ailesi','Sprint Family':'Sprint Ailesi','Deceleration Family':'Yavaşlama Ailesi',
  'COD / Agility Family':'Yön Değiştirme / Çeviklik Ailesi','Landing Family':'İniş Ailesi',
  'Depth / Drop Jump Family':'Derinlik / Düşme Sıçraması Ailesi','Hop / Bound Family':'Sekme / Bounding Ailesi',
  'Jump Family':'Sıçrama Ailesi','Med Ball Throw Family':'Sağlık Topu Fırlatma Ailesi','Split Squat Family':'Split Squat Ailesi',
  'Lunge Family':'Lunge Ailesi','Step-Up Family':'Step-Up Ailesi','Squat Family':'Squat Ailesi',
  'Hip Thrust / Bridge Family':'Hip Thrust / Köprü Ailesi','Hamstring Curl Family':'Hamstring Curl Ailesi',
  'Hinge Family':'Kalça Menteşesi Ailesi','Calf / Ankle Family':'Baldır / Ayak Bileği Ailesi',
  'Vertical Pull Family':'Dikey Çekme Ailesi','Horizontal Pull Family':'Yatay Çekme Ailesi',
  'Vertical Press Family':'Dikey İtme Ailesi','Horizontal Press Family':'Yatay İtme Ailesi','Carry Family':'Taşıma Ailesi',
  'Anti-Rotation Family':'Anti-Rotasyon Ailesi','Anti-Lateral Flexion Family':'Anti-Lateral Fleksiyon Ailesi',
  'Anti-Extension Family':'Anti-Ekstansiyon Ailesi','Rotation Family':'Rotasyon Ailesi','Trunk Flexion Family':'Gövde Fleksiyon Ailesi',
  'Mobility Family':'Mobilite Ailesi','Knee Dominant (Other)':'Diz Baskın (Diğer)','Hip Dominant (Other)':'Kalça Baskın (Diğer)',
  'Upper Body Push (Other)':'Üst Vücut İtme (Diğer)','Upper Body Pull (Other)':'Üst Vücut Çekme (Diğer)','Core (Other)':'Core (Diğer)',
  'Full Body (Other)':'Tüm Vücut (Diğer)','Unclassified':'Sınıflandırılmamış',
};
/* A term in the app language. A family named after a library type ("Warm-Up Family")
   is not in the list; it is read as that type's own Turkish name plus "Ailesi". */
function atpT(en){
  if(REPORT_LANG!=='tr'||!en)return en;
  if(ATP_TR[en])return ATP_TR[en];
  const f=/^(.+) Family$/.exec(en);
  return f?`${exLabel(f[1])} Ailesi`:en;
}
/* The short form a level carries on its button. */
const atpAb=l=>REPORT_LANG==='tr'?l.abTr:l.ab;
/* The one template the profile is written on: seven groups, every quality in them rated
   on the same scale — Priority (how much the current period develops it). The ids are the English words, so a quality keeps its id
   whatever the screen is read in. Only physical qualities are on it: how the work is
   spread over movement patterns (squat, hinge, push, pull…) is read off the calendar by
   Exercise Exposure, so it is not rated here a second time. */
const ATP_GROUPS=[
  {id:'speed',       en:'Speed',                items:atpItems(['Acceleration','Max Velocity'])},
  {id:'cod',         en:'Change of Direction',  items:atpItems(['Deceleration','Change of Direction'])},
  {id:'plyo',        en:'Plyometric / Reactive',items:atpItems(['Jumping','Landing','Reactive Strength'])},
  {id:'strength',    en:'Strength',             items:atpItems(['Lower-Body Strength','Upper-Body Strength','Unilateral Strength'])},
  {id:'power',       en:'Power',                items:atpItems(['Lower-Body Power','Upper-Body Power','Rate of Force Development'])},
  {id:'movement',    en:'Movement Quality',     items:atpItems(['Mobility','Stability','Coordination'])},
  {id:'conditioning',en:'Conditioning',         items:atpItems(['Aerobic Capacity','Anaerobic Capacity','Repeat Sprint Ability'])},
];
const ATP_QUALITIES=ATP_GROUPS.flatMap(g=>g.items.map(it=>({...it,group:g.en})));
/* At most this many qualities may be High at once. High is what the session is built
   around; past a handful it stops saying what matters most, so the profile refuses a
   sixth rather than letting the emphasis thin out. */
const ATP_HIGH_MAX=5;
const ATP_PRIORITY=[
  {id:'high',  en:'High',  ab:'HIGH',abTr:'YÜKSEK',bars:3,dTr:'Bu dönemin ana gelişim alanı.',dEn:'A main development area this period.'},
  {id:'medium',en:'Medium',ab:'MED', abTr:'ORTA',  bars:2,dTr:'Geliştirilecek, ama High\'dan sonra.',dEn:'To develop, but after High.'},
  {id:'low',   en:'Low',   ab:'LOW', abTr:'DÜŞÜK', bars:1,dTr:'Korunur; gelişim önceliği yok.',dEn:'Kept as it is; no development priority.'},
];
/* The profile used to be two sections — Training Priorities (Primary / Secondary /
   Maintain on 31 qualities) and a Movement Profile (Status + Priority on 29 movements).
   A profile saved that way is read into the one template: a quality takes the
   priority its movement row had, and a priority level stands in for a missing
   priority (Primary → High, Secondary → Medium, Maintain → Low). The old names that
   are the same quality under another word are read as it. Ratings with no place in the
   template are left behind. */
const ATP_LEGACY_LEVEL={primary:'high',secondary:'medium',maintain:'low'};
/* The ids a quality is also read from: the old names of the same quality, and the items
   the template once had and has since folded into it (Sprint Mechanics into
   Acceleration, Lateral Movement into Change of Direction, Hopping into Jumping, the
   seven movement patterns into Lower-Body / Upper-Body / Unilateral Strength, Balance
   into Stability). A quality takes the highest priority any of its ids carries, so
   folding never lowers one; the next save keeps only the template's own ids. */
const ATP_LEGACY_ALIAS={
  acceleration:['sprint_mechanics'],
  change_of_direction:['lateral_movement'],
  jumping:['hopping','jump_ability'],landing:['landing_ability'],
  lower_body_strength:['squat','hinge'],
  upper_body_strength:['horizontal_push','horizontal_pull','vertical_push','vertical_pull'],
  unilateral_strength:['unilateral'],
  stability:['balance'],
};
const ATP_CON_CATS=[
  {id:'load',en:'Load'},{id:'volume',en:'Volume'},{id:'intensity',en:'Intensity'},
  {id:'speed',en:'Speed'},{id:'impact',en:'Impact'},{id:'movement',en:'Movement'},
  {id:'equipment',en:'Equipment'},{id:'contact',en:'Contact'},
];
/* `kind` is the list a constraint may sit on. A "No …" is a rule by its own wording and
   only goes on Hard; a "Prefer …" / "Limit …" is a lean and only goes on Soft; a cap, a
   reduction or a limited range is whichever the coach says it is. `ph` marks the ones
   that carry their own number — the cap itself — and hints at how it is written. */
const ATP_CONSTRAINTS=[
  {id:'max_load',           cat:'load',     en:'Maximum Load',              kind:'any', ph:['ör. 60 kg / %70 1RM','e.g. 60 kg / 70% 1RM']},
  {id:'reduced_load',       cat:'load',     en:'Reduced Load',              kind:'any', ph:['ör. %20 azalt','e.g. −20%']},
  {id:'no_heavy_load',      cat:'load',     en:'No Heavy Loading',          kind:'hard'},
  {id:'no_bilateral_load',  cat:'load',     en:'No Bilateral Loading',      kind:'hard'},
  {id:'no_unilateral_load', cat:'load',     en:'No Unilateral Loading',     kind:'hard'},
  {id:'prefer_unilateral',  cat:'load',     en:'Prefer Unilateral',         kind:'soft'},
  {id:'max_volume',         cat:'volume',   en:'Maximum Volume',            kind:'any', ph:['ör. seans başına 12 set','e.g. 12 sets per session']},
  {id:'limited_sets',       cat:'volume',   en:'Limited Sets',              kind:'any', ph:['ör. egzersiz başına maks 3','e.g. max 3 per exercise']},
  {id:'limited_reps',       cat:'volume',   en:'Limited Repetitions',       kind:'any', ph:['ör. set başına maks 6','e.g. max 6 per set']},
  {id:'limit_ecc_volume',   cat:'volume',   en:'Limit Eccentric Volume',    kind:'soft'},
  {id:'limit_knee_volume',  cat:'volume',   en:'Limit Knee-Dominant Volume',kind:'soft'},
  {id:'limit_repeated',     cat:'volume',   en:'Limit Repeated Exposure',   kind:'soft'},
  {id:'max_rpe',            cat:'intensity',en:'Maximum RPE',               kind:'any', ph:['ör. RPE 7','e.g. RPE 7']},
  {id:'max_intensity',      cat:'intensity',en:'Maximum Intensity',         kind:'any', ph:['ör. %75 1RM','e.g. 75% 1RM']},
  {id:'submaximal_only',    cat:'intensity',en:'Submaximal Only',           kind:'any'},
  {id:'prefer_low_fatigue', cat:'intensity',en:'Prefer Low-Fatigue Work',   kind:'soft'},
  {id:'no_max_sprint',      cat:'speed',    en:'No Maximal Sprint',         kind:'hard'},
  {id:'submax_sprint',      cat:'speed',    en:'Submaximal Sprint',         kind:'any', ph:['ör. maks %80 hız','e.g. max 80% speed']},
  {id:'limited_accel',      cat:'speed',    en:'Limited Acceleration',      kind:'any'},
  {id:'no_jumping',         cat:'impact',   en:'No Jumping',                kind:'hard'},
  {id:'no_high_impact_jump',cat:'impact',   en:'No High-Impact Jumping',    kind:'hard'},
  {id:'limited_jumping',    cat:'impact',   en:'Limited Jumping',           kind:'any', ph:['ör. maks 40 temas','e.g. max 40 contacts']},
  {id:'low_impact_only',    cat:'impact',   en:'Low-Impact Only',           kind:'any'},
  {id:'limit_high_impact',  cat:'impact',   en:'Limit High-Impact Work',    kind:'soft'},
  {id:'limited_rom',        cat:'movement', en:'Limited ROM',               kind:'any', ph:['ör. sol omuz, 90° üstü yok','e.g. left shoulder, nothing above 90°']},
  {id:'limited_knee_flex',  cat:'movement', en:'Limited Knee Flexion',      kind:'any', ph:['ör. maks 90°','e.g. max 90°']},
  {id:'no_overhead',        cat:'movement', en:'No Overhead Movement',      kind:'hard'},
  {id:'limited_overhead',   cat:'movement', en:'Limited Overhead Movement', kind:'any'},
  {id:'limited_rotation',   cat:'movement', en:'Limited Rotation',          kind:'any'},
  {id:'prefer_stable',      cat:'movement', en:'Prefer Stable Exercises',   kind:'soft'},
  {id:'no_barbell',         cat:'equipment',en:'No Barbell',                kind:'hard'},
  {id:'no_machine',         cat:'equipment',en:'No Machine',                kind:'hard'},
  {id:'no_cable',           cat:'equipment',en:'No Cable',                  kind:'hard'},
  {id:'prefer_dumbbell',    cat:'equipment',en:'Prefer Dumbbell',           kind:'soft'},
  {id:'no_contact',         cat:'contact',  en:'No Contact',                kind:'hard'},
  {id:'limited_contact',    cat:'contact',  en:'Limited Contact',           kind:'any'},
];
/* The examples each list was specified with — offered first, one tap each. */
const ATP_CON_SUGGEST={
  hard:['no_max_sprint','no_high_impact_jump','no_heavy_load','no_bilateral_load','no_unilateral_load','no_overhead',
    'no_contact','no_barbell','limited_rom','limited_knee_flex','limited_rotation'],
  soft:['prefer_unilateral','prefer_dumbbell','limit_ecc_volume','limit_knee_volume','prefer_low_fatigue',
    'limit_high_impact','prefer_stable','limit_repeated'],
};
const atpConDef=id=>ATP_CONSTRAINTS.find(c=>c.id===id)||null;
const atpConFits=(def,kind)=>!def||def.kind==='any'||def.kind===kind;
const atpConLabel=c=>{const d=atpConDef(c&&c.id);return d?d.en:String((c&&c.label)||'').trim();};
const atpConCat=c=>{const d=atpConDef(c&&c.id);return(d?d.cat:(c&&c.cat))||'';};
const atpCatLabel=id=>((ATP_CON_CATS.find(x=>x.id===id)||{}).en)||'';
/* ---- Joint by Joint -----------------------------------------------------------
   Boyle & Cook's Joint-by-Joint approach: up the body the joints alternate between
   stable and mobile — the foot stable, the ankle mobile, the knee stable, the hip
   mobile, the low back stable, the thoracic spine mobile, the scapula stable, the
   shoulder mobile, the elbow stable, the wrist mobile, the neck mobile. A joint has ONE
   need and it is fixed by the approach: a knee is trained for stability, never for
   more range. What the coach rates is how much of that need the athlete has, per joint
   and per side, on three steps. `view` is the mannequin the joint is drawn on — the
   back carries the spine and the shoulder blades, the front everything else. Listed
   head to foot, as the table reads. */
const ATP_JOINTS=[
  {id:'cervical',en:'Neck',          need:'mobility', bi:false,view:'back'},
  {id:'scapula', en:'Scapula',       need:'stability',bi:true, view:'back'},
  {id:'shoulder',en:'Shoulder',      need:'mobility', bi:true, view:'front'},
  {id:'elbow',   en:'Elbow',         need:'stability',bi:true, view:'front'},
  {id:'wrist',   en:'Wrist',         need:'mobility', bi:true, view:'front'},
  {id:'thoracic_ext',en:'Thoracic Extension',need:'mobility',bi:false,view:'back',mk:'E'},
  {id:'thoracic_rot',en:'Thoracic Rotation', need:'mobility',bi:false,view:'back',mk:'R'},
  {id:'lumbar',  en:'Low Back',      need:'stability',bi:false,view:'back'},
  {id:'hip',     en:'Hip',           need:'mobility', bi:true, view:'front'},
  {id:'knee',    en:'Knee',          need:'stability',bi:true, view:'front'},
  {id:'ankle',   en:'Ankle',         need:'mobility', bi:true, view:'front'},
  {id:'foot',    en:'Foot',          need:'stability',bi:true, view:'front'},
];
const ATP_JOINT_NEEDS=[{id:'mobility',en:'Mobility'},{id:'stability',en:'Stability'}];
/* How much of its need a joint has. The ids are the priority scale's, so the same
   colours and meters read "how much" across the tab; the words say what the dose is. */
const ATP_JOINT_LEVELS=[
  {id:'low',   en:'Low',   ab:'LOW', abTr:'DÜŞÜK', bars:1,dTr:'Hafif ihtiyaç — ısınmada kısa bir bakım dozu.',
    dEn:'A slight need: a short maintenance dose in the warm-up.'},
  {id:'medium',en:'Medium',ab:'MED', abTr:'ORTA',  bars:2,dTr:'Belirgin ihtiyaç — hazırlık bloğunda düzenli, hedefli çalışma.',
    dEn:'A clear need: regular, targeted work in the preparation block.'},
  {id:'high',  en:'High',  ab:'HIGH',abTr:'YÜKSEK',bars:3,dTr:'Öncelikli ihtiyaç — her seansta hedefli çalışma; düzeltici / rehabilitasyon önceliği.',
    dEn:'A priority need: targeted work every session; a corrective / rehabilitation priority.'},
];
/* One row per joint and side: `knee_r`, `knee_l`; a midline joint is its own id. */
const ATP_JOINT_ROWS=ATP_JOINTS.flatMap(j=>j.bi
  ?[{key:j.id+'_r',joint:j,side:'Right'},{key:j.id+'_l',joint:j,side:'Left'}]
  :[{key:j.id,joint:j,side:null}]);
const atpJointLv=id=>Math.max(0,ATP_JOINT_LEVELS.findIndex(l=>l.id===id)+1);
/* The colour the mannequin draws a level in — the word the JSON carries beside it, so
   "red zones first" is said in the data as well as in the instructions. */
const ATP_JOINT_ZONE={high:'red',medium:'yellow',low:'green'};
const atpJointZone=id=>ATP_JOINT_ZONE[id]||null;
/* The joint's name with its side, in English — the word the JSON carries. */
const atpJointName=r=>r.side?`${r.side} ${r.joint.en}`:r.joint.en;
/* The stored profile, read defensively. Hard and Soft are two lists and stay two: a
   constraint that somehow sits on both is kept where it is strictest, on Hard. A
   profile written before the template was one (see ATP_LEGACY_LEVEL) is read into it;
   once the coach changes anything it is saved in the new shape. */
function atpRead(ath){
  const tp=(ath&&ath.trainingProfile&&typeof ath.trainingProfile==='object')?ath.trainingProfile:{};
  const obj=v=>(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
  const okP=v=>ATP_PRIORITY.some(x=>x.id===v)?v:null;
  const qualities={};
  /* Only the priority is kept — a Status saved before it was dropped is left behind.
     Of several candidates (a quality and the ids folded into it) the highest wins. */
  const top=list=>{const ok=list.map(okP).filter(Boolean);
    return ok.length?ok.reduce((a,b)=>ATP_PRIORITY.findIndex(p=>p.id===b)<ATP_PRIORITY.findIndex(p=>p.id===a)?b:a):null;};
  const put=(id,pr)=>{if(pr)qualities[id]={priority:pr};};
  const idsOf=it=>[it.id,...(ATP_LEGACY_ALIAS[it.id]||[])];
  if(tp.qualities&&typeof tp.qualities==='object'){
    const q=obj(tp.qualities);
    ATP_QUALITIES.forEach(it=>put(it.id,top(idsOf(it).map(k=>obj(q[k]).priority))));
  }else{
    const mv=obj(tp.movement),pri=obj(tp.priorities);
    ATP_QUALITIES.forEach(it=>{
      const ids=idsOf(it);
      put(it.id,top([...ids.map(k=>obj(mv[k]).priority),...ids.map(k=>ATP_LEGACY_LEVEL[pri[k]])]));
    });
  }
  /* Joint needs: only the template's joints and sides, only a level on the scale; a
     joint with neither a level nor a note is not kept. A level once stored under the
     need's own name ({mobility:'high'}) is read as the level of the joint's one need. */
  const jt=obj(tp.joints),joints={};
  /* A rating made when the thoracic spine was one joint stands for both of its motions. */
  const legacyT=obj(jt.thoracic);
  const okL=v=>ATP_JOINT_LEVELS.some(x=>x.id===v)?v:null;
  ATP_JOINT_ROWS.forEach(r=>{
    const j=(r.joint.id.startsWith('thoracic_')&&!(r.key in jt))?legacyT:obj(jt[r.key]),o={};
    const lv=okL(j.level)||okL(j[r.joint.need]);
    if(lv)o.level=lv;
    if(typeof j.note==='string'&&j.note.trim())o.note=j.note;
    if(Object.keys(o).length)joints[r.key]=o;
  });
  const con=obj(tp.constraints);
  const list=v=>(Array.isArray(v)?v:[]).filter(c=>c&&c.id&&atpConLabel(c));
  const hard=list(con.hard),hardIds=new Set(hard.map(c=>c.id));
  return{qualities,joints,
    constraints:{hard,soft:list(con.soft).filter(c=>!hardIds.has(c.id))},updated:tp.updated||null};
}

/* ---- Exercise Exposure ------------------------------------------------------
   Read off the athlete's own calendar — the one training log (§15) — never typed in.
   Every exercise row is filed on five layers at once: the exercise itself, the family
   it belongs to, the movement pattern(s) it trains, the athletic stimulus it delivers
   and how it loads the body; every layer is counted in sets over four windows. */
const ATP_EXP_WINDOWS=[
  {id:'last',en:'Last Session',days:0},
  {id:'d7',  en:'Last 7 Days', days:7},
  {id:'d14', en:'Last 14 Days',days:14},
  {id:'d28', en:'Last 28 Days',days:28},
];
const ATP_EXP_LEVELS=[
  {id:'none',    en:'None / Not Recent',ab:'None',    abTr:'Yok',   dTr:'Yakın dönemde maruziyet bulunmuyor.',dEn:'No recent exposure.'},
  {id:'low',     en:'Low',              ab:'Low',     abTr:'Düşük', dTr:'Düşük düzeyde maruziyet.',dEn:'Low exposure.'},
  {id:'moderate',en:'Moderate',         ab:'Moderate',abTr:'Orta',  dTr:'Orta düzeyde maruziyet.',dEn:'Moderate exposure.'},
  {id:'high',    en:'High',             ab:'High',    abTr:'Yüksek',dTr:'Yakın dönemde yüksek maruziyet.',dEn:'High recent exposure.'},
];
/* Sets that read as Moderate / High. A day window is read per week (sets × 7 / days),
   so a 7-day and a 28-day read mean the same thing; the last session is read as it
   stands. One exercise needs fewer sets than a whole pattern to count as "a lot". */
const ATP_EXP_CUT={
  exercise:{week:[3,6],session:[2,4]},
  group:   {week:[6,12],session:[4,8]},
};
function atpExpLevel(sets,kind,days){
  if(!(sets>0))return'none';
  const c=ATP_EXP_CUT[kind]||ATP_EXP_CUT.group;
  const[m,h]=days?c.week:c.session;
  const v=days?sets*7/days:sets;
  return v>=h?'high':v>=m?'moderate':'low';
}
const ATP_EXP_PATTERNS=['Knee Dominant','Hip Dominant','Squat','Hinge','Lunge','Unilateral Knee Dominant','Unilateral Hip Dominant',
  'Horizontal Push','Horizontal Pull','Vertical Push','Vertical Pull','Anti-Extension','Anti-Rotation','Anti-Lateral Flexion',
  'Anti-Flexion','Rotation','Trunk Flexion / Extension','Full Body','Carry','Ankle / Calf','Plyometric','Sprint / Locomotion',
  'Mobility','Stability / Balance'];
const ATP_EXP_STIMULI=['Acceleration','Max Velocity','Deceleration','Change of Direction','Lateral Movement','Jumping',
  'Landing','Hopping / Bounding','Reactive / Depth','Throwing'];
const ATP_EXP_LOADING=['Heavy Loading','High-Velocity','Eccentric Loading','Isometric','Ballistic'];
/* Strength rows (knee, hip, push, pull and core work — never a jump or a run) are also
   told apart by the four things a coach varies week to week: bilateral or unilateral,
   the plane the movement happens in, whether the load is pushed or pulled, and which
   contraction the exercise is built around. Each is read from the library entry's own
   tag when there is one and from the exercise name when the name says it; a row where
   neither says is left out of that list instead of guessed into it. */
const ATP_EXP_LATERALITY=['Bilateral','Unilateral'];
const ATP_EXP_PLANES=['Sagittal','Frontal','Transverse'];
const ATP_EXP_ACTIONS=['Push','Pull'];
const ATP_EXP_FOCUS=['Concentric','Eccentric','Isometric'];
/* The implement a row was done with, most specific first. Read only where the row, the
   library entry or the name SAYS the implement: "Romanian Deadlift" alone does not say
   barbell or dumbbell, so it is left without one rather than guessed into either. */
const ATP_EQUIP_RE=[
  ['TRX',           /\btrx\b|suspension/],
  ['Trap Bar',      /trap[- ]?bar|hex[- ]?bar/],
  ['Landmine',      /land ?mine/],
  ['Battle Rope',   /battle ?ropes?|savaş halatı/],
  ['BOSU',          /\bbosu\b/],
  ['Stability Ball',/stability ?ball|swiss ?ball|fitball|physio ?ball|pilates topu|denge topu/],
  ['Kettlebell',    /kettle ?bell|\bkb\b/],
  ['Dumbbell',      /dumbbell|dambıl|\bdbs?\b|\b2 ?db\b/],
  ['Cable',         /cable|kablo|pulldown|pull-down/],
  ['Band',          /\bbands?\b|banded|lastik/],
  ['Medicine Ball', /med(icine)?[- ]?ball|sağlık topu/],
  ['Sled',          /\bsled\b|kızak|prowler/],
  ['Machine',       /machine|makine|leg press|leg curl|leg extension|smith|hack squat/],
  ['Barbell',       /barbell|halter|\bbb\b/],
];
/* The library's own filing, as data: every category with the facets an exercise is filed by
   (its sub-type, Action and Movement Pattern for hip / knee, and the extra filters). Built
   from the same tables the library screen uses, so the coverage read below speaks the
   coach's vocabulary and cannot drift from it. */
const ATP_TAXONOMY=Object.keys(SUB_TYPES).map(type=>{
  const s=SUB_TYPES[type];
  const facets=[{label:s.label,values:s.values}];
  if(ACTIONS_FOR[type])facets.push({label:'Action',values:ACTIONS_FOR[type]});
  if(PATTERNS_FOR[type])facets.push({label:'Movement Pattern',values:PATTERNS_FOR[type]});
  (EX_EXTRA_FILTERS[type]||[]).forEach(x=>facets.push({label:x.label,values:x.values}));
  return{type,facets};
});
const atpFacetValues=(type,label)=>{
  const t=ATP_TAXONOMY.find(x=>x.type===type);
  const f=t&&t.facets.find(x=>x.label===label);
  return f?f.values:[];
};
function atpEquipmentOf(row,lib){
  const find=t=>{
    const s=String(t==null?'':t).toLowerCase();
    if(!s.trim())return'';
    if(/bodyweight|body weight|vücut ağırlığı|\bbw\b/.test(s))return'Bodyweight';
    const h=ATP_EQUIP_RE.find(([,re])=>re.test(s));
    return h?h[0]:'';
  };
  return find(exEquipText(row&&row.equipment))||find(exEquipText(lib&&lib.equipment))||find(row&&row.name)||'';
}
/* Families, read off the exercise's name, most specific first: a "Split Squat Jump" is
   a jump before it is a split squat, a "Nordic Hamstring Curl" a curl whatever else. */
const ATP_FAMILIES=[
  ['Olympic Lift Family',        /\b(clean|snatch|jerk)\b|high pull|olimpik/],
  ['Sprint Family',              /sprint|accel|ivmelen|flying|wicket|\b[ab][- ]?skip|hız koşu|resisted run|sled (push|pull|drag)|build[- ]?up|max velocity|top speed/],
  ['Deceleration Family',        /decel|yavaşla|braking|fren/],
  ['COD / Agility Family',       /\bcod\b|change of direction|yön değiş|agility|çeviklik|shuffle|cutting|5-0-5|\b505\b|zig ?zag|t-test|pro agility|lane agility|mirror drill|carioca|defensive slide/],
  ['Landing Family',             /landing|iniş|snap ?down|\bstick\b/],
  ['Depth / Drop Jump Family',   /depth|drop jump|altitude|rebound jump/],
  ['Hop / Bound Family',         /\bhops?\b|hopping|bound|pogo|sekme/],
  ['Jump Family',                /jump|sıçra|\bcmj\b|tuck/],
  ['Med Ball Throw Family',      /med ?ball|medicine ball|sağlık topu|throw|slam|scoop|shot ?put|chest pass|fırlat/],
  ['Split Squat Family',         /split squat|bulgarian|rfess|rear[- ]?foot/],
  ['Lunge Family',               /lunge|hamle/],
  ['Step-Up Family',             /step[- ]?(up|down)/],
  ['Squat Family',               /squat|çömel|wall sit|leg press|hack|pistol/],
  ['Hip Thrust / Bridge Family', /thrust|bridge|köprü/],
  ['Hamstring Curl Family',      /nordic|leg curl|hamstring curl|glute[- ]?ham|\bghr\b|slider curl|ball curl|razor curl/],
  ['Hinge Family',               /deadlift|\b(sldl|rdl)\b|romanian|good ?morning|hinge|swing|pull[- ]?through|back extension|hyperextension|stiff/],
  ['Calf / Ankle Family',        /calf|heel raise|tibialis|toe raise|ankle|baldır|ayak bileği/],
  ['Vertical Pull Family',       /pull[- ]?ups?\b|chin[- ]?ups?\b|pull ?down|\blat\b|barfiks/],
  ['Horizontal Pull Family',     /\brows?\b|rowing|face ?pull|rear delt|inverted|kürek|reverse fly|pull[- ]?apart/],
  ['Vertical Press Family',      /overhead|shoulder press|military|\bohp\b|push press|landmine press|arnold|z[- ]?press|handstand|pike push|\bdips?\b/],
  ['Horizontal Press Family',    /bench|push[- ]?ups?\b|şınav|floor press|chest press|incline|decline|\bfly\b|\bflyes?\b/],
  ['Carry Family',               /carry|farmer|suitcase|waiter|taşı/],
  ['Anti-Rotation Family',       /pallof|anti[- ]?rotation|bird ?dog|press ?out/],
  ['Anti-Lateral Flexion Family',/side ?plank|copenhagen|anti[- ]?lateral/],
  ['Anti-Extension Family',      /plank|dead ?bug|roll ?out|ab wheel|body ?saw|hollow|stir the pot|anti[- ]?extension/],
  ['Rotation Family',            /chop|twist|rotation|rotasyon|rotational/],
  ['Trunk Flexion Family',       /crunch|sit[- ]?up|leg raise|knee raise|\bv[- ]?ups?\b|toes ?to ?bar|mekik/],
  ['Mobility Family',            /mobility|mobilit|mobiliz|stretch|esneme|\bcars\b|90\/90|greatest|foam roll/],
];
const ATP_FAMILY_AXIS={'Split Squat Family':'knee','Lunge Family':'knee','Step-Up Family':'knee','Squat Family':'knee',
  'Hip Thrust / Bridge Family':'hip','Hamstring Curl Family':'hip','Hinge Family':'hip',
  'Vertical Pull Family':'pull','Horizontal Pull Family':'pull','Vertical Press Family':'push','Horizontal Press Family':'push',
  'Anti-Rotation Family':'core','Anti-Lateral Flexion Family':'core','Anti-Extension Family':'core','Rotation Family':'core',
  'Trunk Flexion Family':'core','Carry Family':'carry','Olympic Lift Family':'full','Calf / Ankle Family':'ankle'};
/* The coach's tag on the row (and the library's) names the axis before the name does. */
const ATP_AXIS_OF={'Knee Dominant':'knee','Hip Dominant':'hip','Upper Body Push':'push','Upper Body Pull':'pull','Core':'core',
  'Full Body':'full','Squat':'knee','Lunge / Unilateral':'knee','Hinge':'hip','Push':'push','Pull':'pull','Core / Brace':'core',
  'Rotation':'core','Carry':'carry'};
const ATP_AXIS_FAMILY={knee:'Knee Dominant (Other)',hip:'Hip Dominant (Other)',push:'Upper Body Push (Other)',
  pull:'Upper Body Pull (Other)',core:'Core (Other)',full:'Full Body (Other)',carry:'Carry Family',ankle:'Calf / Ankle Family'};
function atpLibMap(exercises){
  const m={};
  (exercises||[]).forEach(e=>{const n=String((e&&e.name)||'').trim().toLowerCase();if(n&&!m[n])m[n]=e;});
  return m;
}
/* One exercise row → its family, patterns, stimuli and loading characteristics. What
   cannot be told is left out rather than guessed into a category. */
function atpClassify(row,libMap){
  const n=String((row&&row.name)||'').trim().toLowerCase();
  const lib=(libMap&&libMap[n])||{};
  const tagP=String(row.pattern||'').trim();
  const P=tagP||String(lib.exPattern||'').trim()||(EX_PATTERNS.includes(lib.type)?lib.type:'');
  const S=String(row.plane||'').trim()||String(lib.exPlane||'').trim()||String(lib.subType||'').trim();
  const type=String(lib.type||'').trim(),sub=String(lib.subType||'').trim();
  const mp=String(lib.movePattern||'').trim()||(['Unilateral','Lunges','Step-Up'].includes(lib.pattern)?'Lunge / Unilateral':'');
  const fam0=(ATP_FAMILIES.find(([,re])=>re.test(n))||[])[0]||null;
  const plyo=type==='Plyometric'||mp==='Jump / Plyo'||['Jump Family','Hop / Bound Family','Depth / Drop Jump Family','Landing Family'].includes(fam0);
  const run=type==='Multi Directional Speed'||mp==='Sprint / Locomotion'||['Sprint Family','Deceleration Family','COD / Agility Family'].includes(fam0);
  const throwing=type==='Medicine Ball'||fam0==='Med Ball Throw Family';
  let axis=ATP_AXIS_OF[P]||ATP_AXIS_OF[mp]||null;
  if(!axis&&!plyo&&!run&&!throwing)axis=ATP_FAMILY_AXIS[fam0]||null;
  const uni=/single[- ]?leg|one[- ]?leg|\bsl\b|tek bacak|unilateral|split|lunge|step[- ]?(up|down)|bulgarian|pistol|skater|rfess|hamle|b[- ]?stance|kickstand|staggered|rear[- ]?foot/.test(n)
    ||['Unilateral','Lunges','Step-Up'].includes(lib.pattern)||mp==='Lunge / Unilateral';
  /* A jump's knee bend is not a squat set: the strength sub-patterns are only read on
     rows that are not jumps or runs. The axis itself still counts when it was tagged. */
  const lift=!plyo&&!run;
  const pats=new Set();
  if(axis==='knee'){pats.add('Knee Dominant');
    if(lift){
      if(uni){pats.add('Unilateral Knee Dominant');
        if(/lunge|split|hamle|bulgarian|rfess|rear[- ]?foot/.test(n)||lib.pattern==='Lunges')pats.add('Lunge');}
      else if(fam0==='Squat Family'||mp==='Squat'||/squat|leg press|hack/.test(n))pats.add('Squat');}}
  if(axis==='hip'){pats.add('Hip Dominant');
    if(lift){
      if(fam0==='Hinge Family'||mp==='Hinge'||/deadlift|\brdl\b|romanian|hinge|good ?morning|swing/.test(n))pats.add('Hinge');
      if(uni)pats.add('Unilateral Hip Dominant');}}
  if(axis==='push'||axis==='pull'){
    const dir=(S==='Vertical'||S==='Horizontal'||S==='Rotational')?S:(/Vertical/.test(fam0||'')?'Vertical':'Horizontal');
    pats.add(dir==='Rotational'?'Rotation':`${dir} ${axis==='push'?'Push':'Pull'}`);
  }
  if(axis==='core'){
    const q=CORE_QUALITIES.has(S)?S:({'Anti-Rotation Family':'Anti-Rotation','Anti-Lateral Flexion Family':'Anti-Lateral Flexion',
      'Anti-Extension Family':'Anti-Extension','Rotation Family':'Rotation','Trunk Flexion Family':'Flexion'})[fam0]
      ||(mp==='Rotation'?'Rotation':EX_STYLE_DEFAULT.Core);
    pats.add(['Flexion','Extension','Lateral Flexion'].includes(q)?'Trunk Flexion / Extension':q);
  }
  if(axis==='full')pats.add('Full Body');
  if(axis==='carry')pats.add('Carry');
  if(axis==='ankle'||fam0==='Calf / Ankle Family')pats.add('Ankle / Calf');
  if(plyo)pats.add('Plyometric');
  if(run)pats.add('Sprint / Locomotion');
  if(type==='Mobility'||mp==='Mobility'||fam0==='Mobility Family'||(type==='Warm-Up'&&/Mobilisation|Dynamic Stretching/.test(sub)))pats.add('Mobility');
  if(type==='Stability'||type==='Balance'||/balance|denge|stability|stabilite/.test(n))pats.add('Stability / Balance');

  const st=new Set();
  const maxV=/flying|max(imal)? velocity|top speed|maks(imum)? hız|wicket|\b(30|35|40|50|60) ?m\b|fly[- ]?in/.test(n);
  if(run){
    if(maxV)st.add('Max Velocity');
    if(sub==='Acceleration'||/accel|ivmelen|start|sled|resisted|drive/.test(n)
      ||(fam0==='Sprint Family'&&!maxV&&!/\b[ab][- ]?skip|mechanic|technique|teknik/.test(n)))st.add('Acceleration');
    if(sub==='Deceleration'||fam0==='Deceleration Family'||/\bstop\b|5-0-5|\b505\b/.test(n))st.add('Deceleration');
    if(['COD','Non-Reactive Agility','Reactive Agility'].includes(sub)||fam0==='COD / Agility Family')st.add('Change of Direction');
  }
  if((run||plyo)&&(/lateral|shuffle|carioca|skater|side ?step|slide|crossover|yanal/.test(n)||(type==='Plyometric'&&sub==='Lateral')))st.add('Lateral Movement');
  if(plyo){
    if(fam0==='Jump Family'||fam0==='Depth / Drop Jump Family'||(!fam0&&type==='Plyometric'))st.add('Jumping');
    if(fam0==='Landing Family'||/landing|iniş|\bstick\b/.test(n))st.add('Landing');
    if(fam0==='Hop / Bound Family')st.add('Hopping / Bounding');
    if(fam0==='Depth / Drop Jump Family'||/reactive|reaktif|pogo|rebound|continuous|repeated/.test(n))st.add('Reactive / Depth');
  }
  if(throwing)st.add('Throwing');

  const ld=new Set();
  const loadTxt=String(row.load||'').toLowerCase();
  const pm=loadTxt.match(/(\d{2,3})\s*%|%\s*(\d{2,3})/);
  const pct=pm?Number(pm[1]||pm[2]):null;
  const rm=loadTxt.match(/rpe\s*(\d+(?:[.,]\d)?)/);
  const rpe=recNum(row.rpe)!=null?recNum(row.rpe):(rm?Number(rm[1].replace(',','.')):null);
  const rn=String(row.reps||'').match(/\d+/g);
  const reps=rn?Math.max(...rn.map(Number)):null;
  const loaded=!!loadTxt.trim()&&!/\bbw\b|body ?weight|vücut ağırlığı/.test(loadTxt);
  const strength=lift&&!throwing&&['knee','hip','push','pull','full'].includes(axis);
  if(strength&&((pct!=null&&pct>=80)||(rpe!=null&&rpe>=8&&reps!=null&&reps<=6)||(reps!=null&&reps<=5&&loaded)
    ||/heavy|ağır|\b[1-5] ?rm\b/.test(n)))ld.add('Heavy Loading');
  const tm=String(row.tempo||'').trim().match(/^(\d)/);
  if(S==='Eccentric'||sub==='Eccentric'||/eccentric|eksantrik|nordic|negative|slow lower/.test(n)||(tm&&Number(tm[1])>=3))ld.add('Eccentric Loading');
  if(S==='ISO'||sub==='Isometric'||/\biso\b|isometric|izometrik|\bhold\b|wall sit|plank|copenhagen|pin press|overcoming|yielding/.test(n))ld.add('Isometric');
  const bal=(plyo&&fam0!=='Landing Family')||throwing||/swing|ballistic|balistik|slam|throw/.test(n);
  if(run||bal||fam0==='Olympic Lift Family'||['Explosive','Olympic Lift'].includes(S)||['Explosive','Olympic Lift'].includes(sub)
    ||/speed|velocity|explosive|patlayıcı|dynamic effort/.test(n))ld.add('High-Velocity');
  if(bal)ld.add('Ballistic');

  const family=fam0||ATP_AXIS_FAMILY[axis]||(type?`${type} Family`:'Unclassified');
  /* The four strength attributes, on strength rows only (never a jump, a run or a throw).
     Bilateral or unilateral: a lower-body row is unilateral when the name or the library
     says so; an upper-body row only when the name says single-arm / one-arm / alternating,
     since a press or a row is a two-hand lift unless it says otherwise. */
  const strengthRow=lift&&!throwing&&['knee','hip','push','pull','core'].includes(axis);
  const armUni=/single[- ]?arm|one[- ]?arm|\bsa\b|tek kol|alternating|unilateral/.test(n)||['Unilateral','Lunges','Step-Up'].includes(lib.pattern);
  const laterality=(lift&&(axis==='knee'||axis==='hip'))?(uni?'Unilateral':'Bilateral')
    :(lift&&(axis==='push'||axis==='pull'))?(armUni?'Unilateral':'Bilateral'):'';
  /* Plane: transverse for rotation and anti-rotation work, frontal for lateral / side work,
     sagittal for every other strength lift — squats, hinges, lunges, presses, rows and
     the flexion and extension core work all happen in it unless the name or tag says
     otherwise. */
  const rotCue=S==='Rotational'||/rotational|rotation|rotasyon|transverse|wood ?chop|\bchops?\b|twist|windmill/.test(n)
    ||pats.has('Rotation')||pats.has('Anti-Rotation');
  const latCue=S==='Lateral Flexion'||/lateral|side ?(lunge|step|squat|plank|bend)|cossack|skater|curtsy|yan ?(hamle|adım)|frontal|copenhagen/.test(n)
    ||pats.has('Anti-Lateral Flexion');
  const plane=strengthRow?(rotCue?'Transverse':latCue?'Frontal':'Sagittal'):'';
  /* Action: an upper-body push or pull is its axis; a hip or knee row takes the library's
     own Action tag and nothing else, because "push" and "pull" mean different things at
     the hip and the knee and a name does not settle which. */
  const libAction=String(lib.action||'').trim();
  const action=strengthRow?(axis==='push'?'Push':axis==='pull'?'Pull':(ATP_EXP_ACTIONS.includes(libAction)?libAction:'')):'';
  /* Contraction focus: the library's tag, else what the name or the tempo shows. Concentric
     is only ever the library's word — no name says "concentric". */
  const focus=strengthRow?(ATP_EXP_FOCUS.includes(sub)?sub:ld.has('Eccentric Loading')?'Eccentric':ld.has('Isometric')?'Isometric':''):'';
  const equipment=atpEquipmentOf(row,lib);
  /* The library category the row belongs to and the facets it is filed by there, in the
     library's own words. The library's tag on the entry wins; where the entry has none, a
     value is read off the name only when the name says it. What neither says is left out —
     the coverage below would otherwise count a guess as work done. */
  const pick=(v,list)=>{const s=String(v==null?'':v).trim();return list.includes(s)?s:'';};
  const CORE_FAM_Q={'Anti-Rotation Family':'Anti-Rotation','Anti-Lateral Flexion Family':'Anti-Lateral Flexion',
    'Anti-Extension Family':'Anti-Extension','Rotation Family':'Rotation','Trunk Flexion Family':'Flexion'};
  const coreQ=axis==='core'?(CORE_QUALITIES.has(S)?S:(CORE_FAM_Q[fam0]||(mp==='Rotation'?'Rotation':''))):'';
  const cat=ATP_TAXONOMY.some(x=>x.type===type)?type
    :plyo?'Plyometric':run?'Multi Directional Speed':throwing?'Medicine Ball'
    :({knee:'Knee Dominant',hip:'Hip Dominant',push:'Upper Body Push',pull:'Upper Body Pull',core:'Core',full:'Full Body'})[axis]
    ||(pats.has('Mobility')?'Mobility':'');
  const facets={};
  const put=(label,v)=>{if(v)facets[label]=v;};
  const V=label=>atpFacetValues(cat,label);
  const eqIn=label=>{const e=equipment;return V(label).includes(e)?e:'';};
  if(cat==='Knee Dominant'||cat==='Hip Dominant'){
    const knee=cat==='Knee Dominant';
    put('Contraction Focus',focus);
    put('Action',action);
    put('Movement Pattern',pick(lib.pattern,V('Movement Pattern'))||(lift
      ?(knee&&fam0==='Step-Up Family'?'Step-Up':knee&&(fam0==='Lunge Family'||fam0==='Split Squat Family')?'Lunges':uni?'Unilateral':'Bilateral'):''));
    put('Equipment',eqIn('Equipment'));
  }else if(cat==='Upper Body Push'||cat==='Upper Body Pull'){
    put('Movement',pick(S,V('Movement'))||(/Horizontal/.test(fam0||'')?'Horizontal':/Vertical/.test(fam0||'')?'Vertical':''));
    put('Equipment',eqIn('Equipment'));
  }else if(cat==='Core'){
    put('Movement',coreQ);
    put('Position',pick(lib.position,V('Position')));
  }else if(cat==='Full Body'){
    put('Category',pick(sub,V('Category'))||(fam0==='Olympic Lift Family'?'Olympic Lift':''));
  }else if(cat==='Multi Directional Speed'){
    put('Skill',pick(sub,V('Skill'))||(st.has('Change of Direction')?'COD':st.has('Deceleration')?'Deceleration':st.has('Acceleration')?'Acceleration':''));
  }else if(cat==='Plyometric'){
    put('Direction',pick(sub,V('Direction'))||(/rotational|rotation|twist/.test(n)?'Rotational'
      :/lateral|skater|side ?(hop|jump|bound)|\byan\b/.test(n)?'Lateral'
      :/broad jump|horizontal|bounds?\b|standing long|hurdle hop/.test(n)?'Horizontal'
      :/box jump|vertical|cmj|counter ?movement|squat jump|jump squat|tuck|drop jump|depth jump|pogo|ankle hop/.test(n)?'Vertical':''));
    const kind=pick(lib.exKind,V('Exercise Type'))||(fam0==='Depth / Drop Jump Family'?'Drop Jump':fam0==='Landing Family'?'Landing'
      :fam0==='Hop / Bound Family'?(/bound/.test(n)?'Bound':'Hop'):fam0==='Jump Family'?'Jump':'');
    put('Exercise Type',kind);
    put('Technique',pick(lib.technique,V('Technique'))
      ||(/single[- ]?leg|one[- ]?leg|\bsl\b|tek bacak|unilateral|skater|alternating/.test(n)?'Unilateral':(kind==='Hop'||kind==='Bound'||!kind)?'':'Bilateral'));
    put('Equipment',exMulti(lib.equipment).find(x=>V('Equipment').includes(x))||eqIn('Equipment')||(equipment==='Bodyweight'?'No Equipment':''));
  }else if(cat==='Medicine Ball'){
    put('Direction',pick(sub,V('Direction'))||(/rotational|rotation|twist|russian|side (toss|throw)|lateral/.test(n)?'Rotational'
      :/overhead|slam|vertical|scoop/.test(n)?'Vertical':/chest pass|horizontal|push pass|wall throw/.test(n)?'Horizontal':''));
    put('Exercise Type',pick(lib.exKind,V('Exercise Type'))||(/slam/.test(n)?'Slam':/catch/.test(n)?'Catch':/pass/.test(n)?'Pass'
      :/throw|toss|shot ?put|scoop/.test(n)?'Throw':''));
  }else if(cat==='Mobility'){
    put('Region',pick(sub,V('Region'))||(/ankle|dorsiflexion|calf/.test(n)?'Ankle':/hip|90\/90|pigeon|adductor|groin/.test(n)?'Hip'
      :/thoracic|spine|t-spine|cat[- ]?cow|open book|thread the needle/.test(n)?'Spine':/shoulder|scap|wall slide/.test(n)?'Shoulder':/wrist|forearm/.test(n)?'Wrist':''));
    put('Position',pick(lib.position,V('Position')));
  }else if(cat==='Warm-Up'||cat==='Balance'){
    put('Category',pick(sub,V('Category')));
  }else if(cat==='Stability'||cat==='Accessory'){
    put('Region',pick(sub,V('Region')));
  }else if(cat==='Corrective'){
    put('Type',pick(sub,V('Type')));
    put('Region',pick(lib.bodyRegion,V('Region')));
  }
  return{family,patterns:[...pats],stimuli:[...st],loading:[...ld],laterality,plane,action,focus,equipment,cat,facets};
}
/* Every session on the athlete's calendar up to `to` that has at least one exercise
   row, oldest first; sessions of one day in the order they were run. A block or row the
   individualization sheet marked removed was never trained, so it is not exposure. */
function atpSessions(ath,from,to){
  const days=(ath&&ath.days)||{};
  const out=[];
  Object.keys(days).filter(dk=>/^\d{4}-\d{2}-\d{2}$/.test(dk)&&(!from||dk>=from)&&dk<=to).sort().forEach(dk=>{
    ((days[dk]||{}).sessions||[]).map((s,i)=>({s,i})).filter(x=>x.s)
      .sort((a,b)=>String(a.s.time||'').localeCompare(String(b.s.time||''))||a.i-b.i)
      .forEach(({s,i})=>{
        const rows=[];
        (s.blocks||[]).forEach(b=>{if(!b||b.removed)return;
          (b.exercises||[]).forEach(x=>{if(x&&!x.removed&&String(x.name||'').trim())rows.push(x);});});
        if(rows.length)out.push({date:dk,key:dk+'|'+i,name:s.name||'',time:s.time||'',rows});
      });
  });
  return out;
}
/* The exposure read, with `end` as the last day counted. The Last Session window is
   the newest session on or before it, however old — it says its own date. */
function atpExposure(ath,end,opts){
  const libMap=(opts&&opts.libMap)||null;
  const from={d7:fmt(addD(parseD(end),-6)),d14:fmt(addD(parseD(end),-13)),d28:fmt(addD(parseD(end),-27))};
  const all=atpSessions(ath,null,end);
  const last=all[all.length-1]||null;
  const use=all.filter(s=>s.date>=from.d28);
  if(last&&!use.includes(last))use.push(last);
  const W=['last','d7','d14','d28'];
  const sessions={d7:0,d14:0,d28:0},rows={last:0,d7:0,d14:0,d28:0};
  const layers={exercise:{},family:{},pattern:{},stimulus:{},loading:{},laterality:{},plane:{},action:{},focus:{},equipment:{},category:{},facet:{}};
  const bump=(layer,key,label,wins,sets,sess,date)=>{
    const t=layers[layer][key]||(layers[layer][key]={key,label,sets:{last:0,d7:0,d14:0,d28:0},sess:new Set(),lastUsed:null});
    wins.forEach(w=>{t.sets[w]+=sets;});
    if(wins.includes('d28'))t.sess.add(sess);
    if(!t.lastUsed||date>=t.lastUsed){t.lastUsed=date;t.label=label;}
    return t;
  };
  use.forEach(s=>{
    const wins=W.filter(w=>w==='last'?s===last:s.date>=from[w]);
    wins.forEach(w=>{if(w!=='last')sessions[w]++;rows[w]+=s.rows.length;});
    s.rows.forEach(r=>{
      const name=String(r.name).trim();
      const sets=recNum(r.sets)||1;
      const c=atpClassify(r,libMap);
      const t=bump('exercise',diExName(name)||name.toLowerCase(),name,wins,sets,s.key,s.date);
      t.family=c.family;
      ['patterns','stimuli','loading'].forEach(k=>{t[k]=[...new Set([...(t[k]||[]),...c[k]])];});
      ['laterality','plane','action','focus','equipment'].forEach(k=>{if(c[k])t[k]=c[k];});
      bump('family',c.family,c.family,wins,sets,s.key,s.date);
      ['laterality','plane','action','focus','equipment'].forEach(k=>{
        if(c[k])bump(k,c[k],c[k],wins,sets,s.key,s.date);});
      if(c.cat){
        bump('category',c.cat,c.cat,wins,sets,s.key,s.date);
        Object.keys(c.facets).forEach(f=>{
          const ft=bump('facet',`${c.cat}|${f}|${c.facets[f]}`,c.facets[f],wins,sets,s.key,s.date);
          ft.type=c.cat;ft.facet=f;});
      }
      c.patterns.forEach(p=>bump('pattern',p,p,wins,sets,s.key,s.date));
      c.stimuli.forEach(p=>bump('stimulus',p,p,wins,sets,s.key,s.date));
      c.loading.forEach(p=>bump('loading',p,p,wins,sets,s.key,s.date));
    });
  });
  const fin=(t,kind)=>{
    const level={};W.forEach(w=>{level[w]=atpExpLevel(t.sets[w],kind,w==='last'?0:Number(w.slice(1)));});
    const{sess,...rest}=t;
    return{...rest,freq28:sess.size,level};
  };
  const empty=label=>({key:label,label,sets:{last:0,d7:0,d14:0,d28:0},sess:new Set(),lastUsed:null});
  const fixed=(layer,list)=>list.map(l=>fin(layers[layer][l]||empty(l),'group'));
  const bySets=(a,b)=>(b.sets.d28-a.sets.d28)||(b.sets.last-a.sets.last)||String(b.lastUsed).localeCompare(String(a.lastUsed));
  return{end,from,
    last:last?{date:last.date,name:last.name,time:last.time,rows:last.rows.length,
      names:[...new Set(last.rows.map(r=>String(r.name).trim()))]}:null,
    sessions,rows,
    exercises:Object.values(layers.exercise).map(t=>fin(t,'exercise')).sort(bySets),
    families:Object.values(layers.family).map(t=>fin(t,'group')).sort(bySets),
    patterns:fixed('pattern',ATP_EXP_PATTERNS),
    stimuli:fixed('stimulus',ATP_EXP_STIMULI),
    loading:fixed('loading',ATP_EXP_LOADING),
    laterality:fixed('laterality',ATP_EXP_LATERALITY),
    planes:fixed('plane',ATP_EXP_PLANES),
    actions:fixed('action',ATP_EXP_ACTIONS),
    focus:fixed('focus',ATP_EXP_FOCUS),
    /* Per library category the athlete trained: every facet the category is filed by, with
       every value the library offers — done or not. A facet is listed only when at least one
       recorded row of the category carries it (a facet nobody tagged is unknown, not
       missing); categories with no recorded row at all are named apart. */
    coverage:ATP_TAXONOMY.map(tx=>{
      const cat=layers.category[tx.type];
      if(!cat)return null;
      const facets=tx.facets.map(fc=>{
        const any=Object.values(layers.facet).some(t=>t.type===tx.type&&t.facet===fc.label);
        if(!any)return null;
        return{label:fc.label,
          values:fc.values.map(v=>fin(layers.facet[`${tx.type}|${fc.label}|${v}`]||empty(v),'group'))};
      }).filter(Boolean);
      return{type:tx.type,cat:fin(cat,'group'),facets};
    }).filter(Boolean),
    coverageMissing:ATP_TAXONOMY.filter(tx=>!layers.category[tx.type]).map(tx=>tx.type),
    equipment:Object.values(layers.equipment).map(t=>fin(t,'group')).sort(bySets)};
}
/* The profile as the individualization JSON carries it. The day being programmed is
   not exposure yet, so the window ends the day before it — the same rule the daily
   engine's own exposure read keeps. `filled` says whether the coach has written any of
   the first three parts; an empty profile is named in missing_data rather than read
   as "no priorities, no constraints". */
function atpSnapshot(ath,ref,libMap,setup){
  const tp=atpRead(ath);
  const en=(list,id)=>((list.find(x=>x.id===id)||{}).en)||null;
  /* Every rated quality with its group and priority, High first — the order the
     session is to be written in — and within one priority in the template's own order.
     The three priority lists repeat the names alone, so the emphasis reads at a glance. */
  const rank=x=>Math.max(0,ATP_PRIORITY.findIndex(p=>p.id===x.r.priority))+(x.r.priority?0:ATP_PRIORITY.length);
  const rated=ATP_QUALITIES.filter(it=>tp.qualities[it.id]).map(it=>({it,r:tp.qualities[it.id]}));
  const ordered=rated.map((x,i)=>({...x,i})).sort((a,b)=>(rank(a)-rank(b))||(a.i-b.i));
  const byPri=id=>rated.filter(x=>x.r.priority===id).map(x=>x.it.en);
  const unrated=ATP_QUALITIES.filter(it=>!tp.qualities[it.id]).map(it=>it.en);
  const con=list=>list.map(c=>({constraint:atpConLabel(c),category:atpCatLabel(atpConCat(c))||null,value:c.value,note:c.note}));
  const end=fmt(addD(parseD(ref),-1));
  const ex=atpExposure(ath,end,{libMap});
  /* Every record is one name with its sets over the last 7 and 28 days — the two
     windows the session is written against — and the day it was last done. The last
     session is named by its exercises once, at the top, instead of as a third column
     beside every record; the 14-day window sat between the two and said nothing they
     did not. */
  const item=t=>({name:t.label,last_used:t.lastUsed,sets_7_days:t.sets.d7,sets_28_days:t.sets.d28});
  const fixed=list=>({records:list.filter(t=>t.lastUsed).map(item),
    no_exposure_last_28_days:list.filter(t=>!t.lastUsed).map(t=>t.label)});
  /* An implement the gym does not have is not a gap to fill: with an inventory on the
     Settings tab, an Equipment facet's "not done" lists name only the kit that is there
     (bodyweight is always there). No inventory, no cut. */
  const eqHave=eqAvailable(setup||{});
  const eqIds=new Set(eqHave.map(e=>e.id)),eqNames=new Set(eqHave.map(e=>diExName(e.label)));
  const ATP_EQ_ID={'Barbell':'barbell','Trap Bar':'trapbar','Dumbbell':'dumbbell','Cable':'cable','Medicine Ball':'medball',
    'Box':'plyobox','Band':'bands','Resistance Band':'bands','Sled':'sled','Machine':'machine'};
  const inGym=v=>!eqIds.size||v==='Bodyweight'||v==='No Equipment'||
    (ATP_EQ_ID[v]?eqIds.has(ATP_EQ_ID[v]):(eqIds.has(EQ_CUSTOM+diExName(v))||eqNames.has(diExName(v))));
  const gapOf=f=>f.label==='Equipment'?(t=>inGym(t.label)):(()=>true);
  const cut=ATP_EXP_CUT;
  /* Joints with a rated need, the strongest first, head to foot within one level. A
     note alone is not a need and is not sent. */
  const jRows=ATP_JOINT_ROWS.map((r,i)=>({r,i,j:tp.joints[r.key]||{}})).filter(x=>x.j.level)
    .sort((a,b)=>(atpJointLv(b.j.level)-atpJointLv(a.j.level))||(a.i-b.i));
  const jointNeeds=jRows.length?{
    description:'Joint-by-Joint approach (Boyle & Cook): up the body the joints alternate between stable and mobile. '+
      'Stable joints — foot, knee, low back (lumbar spine), scapula, elbow — need stability; mobile joints — ankle, hip, thoracic spine (rated separately for extension and for rotation), neck, shoulder, wrist — need mobility. '+
      'Each joint has that one need only (a knee is trained for stability, never for more range). level is how much of it THIS athlete has, '+
      'rated by the coach from screening and assessment per joint and side: High > Medium > Low. A joint not listed has no rated need. '+
      'High is the red zone: the joints are listed by priority_order, red (High) joints first, and the programme is written in that order.',
    level_scale:Object.fromEntries(ATP_JOINT_LEVELS.map(l=>[l.en,l.dEn])),
    use:'Joint-by-Joint priority: write the programme red zones first — every High (red) joint is addressed before any Medium or Low joint, '+
      'in priority_order, and none of the Medium / Low work may crowd a High joint out of the session. '+
      'Build the preparation phase (warm-up, mobilisation, activation) and any corrective / rehabilitation work on these needs: '+
      'every High need gets targeted work in the session, Medium needs regular work in the preparation block, Low needs a short maintenance dose. '+
      'Mobility need: give the joint its range (mobilisation, dynamic stretching, end-range control) before it is loaded. '+
      'Stability need: train the joint for control (isometrics, anti-movement, balance, slow eccentrics) — no mobilisation for more range, '+
      'and do not load it at an end range it cannot control. A joint need is not a diagnosis: pain is for the medical staff.',
    /* Red (High) first: the order the programme is to be written in. */
    priority_order:jRows.map((x,i)=>({rank:i+1,joint:atpJointName(x.r),level:en(ATP_JOINT_LEVELS,x.j.level),zone:atpJointZone(x.j.level)})),
    joints:jRows.map(({r,j})=>({joint:atpJointName(r),...(r.side?{side:r.side}:{}),
      need:en(ATP_JOINT_NEEDS,r.joint.need),level:en(ATP_JOINT_LEVELS,j.level),zone:atpJointZone(j.level),
      ...(j.note&&j.note.trim()?{note:j.note.trim()}:{})})),
    /* The same, by need and level, the names alone; an empty level or need is left out. */
    by_need:Object.fromEntries(ATP_JOINT_NEEDS.map(n=>[n.id,Object.fromEntries([...ATP_JOINT_LEVELS].reverse()
      .map(l=>[l.id,jRows.filter(x=>x.r.joint.need===n.id&&x.j.level===l.id).map(x=>atpJointName(x.r))]).filter(([,v])=>v.length))])
      .filter(([,v])=>Object.keys(v).length)),
  }:null;
  const filled=rated.length+tp.constraints.hard.length+tp.constraints.soft.length+jRows.length>0;
  /* With no S&C session on the calendar in 28 days every list below would only say
     "none" at length, so the block is cut to the count and the scope that explains it. */
  const anyEx=ex.sessions.d28>0;
  return{filled,out:{
    definition:'The athlete\'s training profile. athletic_profile, constraints and joint_needs are entered by the coach; '+
      'exercise_exposure is computed automatically from the training sessions on the calendar. The profile describes the athlete — it is not an exercise selection on its own.',
    last_updated:tp.updated,
    athletic_profile:rated.length?{
      description:`Priority of each physical quality — how much it is to be developed in this period: High (main development area, at most ${ATP_HIGH_MAX} qualities) > Medium (to be developed, after High) > Low (maintained, no development priority). `+
        'not_rated lists the qualities the coach set no priority for: keep them at a maintenance dose, the same as Low.',
      groups:ATP_GROUPS.map(g=>g.en),
      priority:{high:byPri('high'),medium:byPri('medium'),low:byPri('low')},
      ...(unrated.length?{not_rated:unrated}:{}),
      qualities:ordered.map(({it,r})=>({quality:it.en,group:it.group,priority:en(ATP_PRIORITY,r.priority)})),
    }:null,
    /* No constraint entered, no block: a description with nothing under it reads as
       data that is missing rather than as "none". */
    constraints:(tp.constraints.hard.length||tp.constraints.soft.length)?{
      description:'hard: constraints that must be respected without exception · soft: not strict prohibitions, but preferences or situations to limit',
      hard:con(tp.constraints.hard),soft:con(tp.constraints.soft)}:null,
    /* No joint rated, no block: the key is left out rather than sent as null. */
    ...(jointNeeds?{joint_needs:jointNeeds}:{}),
    exercise_exposure:!anyEx?{
      scope:'Counts only the S&C exercises written on the athlete\'s calendar. Team practice and games are not in it — their load is in rpe; zero sessions here does not mean the athlete did not train.',
      window_end:end,
      session_count:{last_7_days:0,last_28_days:0},
    }:{
      scope:'Counts only the S&C exercises written on the athlete\'s calendar. Team practice and games are not in it — their load is in rpe; zero sessions here does not mean the athlete did not train.',
      window_end:end,
      /* Each fact once: an exercise's classification is not repeated beside it — the
         lists below are those classifications, summed. */
      format:'Every record: name, last_used, sets_7_days, sets_28_days. '+
        `Read as a weekly load: a single exercise ≥${cut.exercise.week[1]} sets/week is high, ≥${cut.exercise.week[0]} moderate; `+
        `a movement class, stimulus, loading character or axis ≥${cut.group.week[1]} sets/week high, ≥${cut.group.week[0]} moderate (the 28-day figure is four weeks).`,
      session_count:{last_7_days:ex.sessions.d7,last_28_days:ex.sessions.d28},
      last_session:ex.last?{date:ex.last.date,session:ex.last.name,time:ex.last.time,exercises:ex.last.names}:null,
      exercises:ex.exercises.slice(0,30).map(t=>({exercise:t.label,family:t.family,
        last_used:t.lastUsed,sets_7_days:t.sets.d7,sets_28_days:t.sets.d28})),
      /* The profile's own classification, finer than the session's pattern vocabulary
         and named apart from it so the two lists are never mistaken for each other. */
      movement_class_note:'movement_class is the training profile\'s detailed classification (e.g. Hip Dominant, Horizontal Push); '+
        'these names are never written into a programme\'s movement_pattern field — that field is chosen only from movement_pattern_vocabulary.',
      movement_class:fixed(ex.patterns),
      athletic_stimulus:fixed(ex.stimuli),
      loading_character:fixed(ex.loading),
      strength_movement_profile:{
        note:'How the strength work (knee-, hip-, push-, pull- and core-work; not jumps, runs or throws) was spread, in sets, over four axes: '+
          'laterality (bilateral / unilateral), movement_plane (sagittal / frontal / transverse), action (push / pull) and contraction_focus (concentric / eccentric / isometric). '+
          'A row whose value cannot be told is not counted on that axis; no_exposure means no such row was recorded, not that the athlete avoided it.',
        laterality:fixed(ex.laterality),
        movement_plane:fixed(ex.planes),
        action:fixed(ex.actions),
        contraction_focus:fixed(ex.focus),
      },
      category_coverage:{
        note:'The gaps only — what was done is already in exercises. For every exercise category the athlete has trained, every facet the library files it by '+
          '(movement, direction, type, position, technique, contraction focus, action, implement…) with the values that had no set: '+
          'not_done_last_7_days (this week\'s gaps; it includes not_done_last_28_days) and not_done_last_28_days. For Equipment, only the kit in the gym\'s inventory is listed. '+
          'A facet is listed only when at least one recorded exercise of the category carries it; a value that cannot be told is not counted.',
        categories:ex.coverage.map(c=>({category:c.type,sets_7_days:c.cat.sets.d7,sets_28_days:c.cat.sets.d28,
          facets:c.facets.map(f=>{const gap=gapOf(f);return{facet:f.label,
            not_done_last_7_days:f.values.filter(t=>!(t.sets.d7>0)&&(t.sets.d28>0||gap(t))).map(t=>t.label),
            not_done_last_28_days:f.values.filter(t=>!(t.sets.d28>0)&&gap(t)).map(t=>t.label)};})
            .filter(f=>f.not_done_last_7_days.length||f.not_done_last_28_days.length)})),
        categories_without_recorded_work:ex.coverageMissing,
      },
      equipment_used:ex.equipment.filter(t=>t.lastUsed).map(item),
    },
  }};
}

