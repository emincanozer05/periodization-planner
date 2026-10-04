/* ---- Position emphasis (§4.3) --------------------------------------------
   What a role's game asks for most often. It is CONTEXT, never the programme: the
   spec is explicit that position alone must not decide anything, so this is handed
   over beside the test results, the load and the goals and weighed with them. */
const DI_POS_QUALITIES={
  guard:[['İvmelenme','Acceleration'],['Yavaşlama','Deceleration'],['Yön değiştirme','Change of direction'],
    ['Reaktif çeviklik','Reactive agility'],['Tekrarlı sprint','Repeated sprint ability'],['Yatay güç','Horizontal power']],
  wing:[['İvmelenme','Acceleration'],['Maksimal hız','Max velocity'],['Yön değiştirme','Change of direction'],
    ['Sıçrama','Jumping'],['Güç','Power'],['Yavaşlama','Deceleration']],
  post:[['Rölatif kuvvet','Relative strength'],['Sıçrama','Jumping'],['İniş','Landing'],
    ['Yavaşlama','Deceleration'],['Mobilite','Mobility'],['Dayanıklılık','Robustness']],
  other:[],
};

/* ---- What the game itself asks for (§4.3, beside position) ----------------
   DI_POS_QUALITIES above says what a ROLE does inside the game. This says what the
   GAME does to everyone who plays it: the distances, how often the efforts repeat,
   how take-offs and landings happen, which planes the work lives in. Like the
   position emphasis it is CONTEXT handed over beside the athlete's own numbers, never
   a prescription on its own — but a session written without it is a gym programme
   that happens to be handed to a basketball player, and the point of this module is
   the opposite of that.

   Basketball is written out in full because it is the game this app is built around.
   The other sports carry the two or three lines that actually change an exercise
   choice; a sport with no entry passes its name through and nothing else. */
const DI_SPORT_DEMANDS={
  'Basketball':{label:['Basketbol','Basketball'],
    game:[
      ['Oyun 10-25 saniyelik hücum/savunma tekrarlarından oluşur; tekrarlar arası toparlanma kısmidir, tam değildir.',
       'The game is a string of 10-25 s possessions, with partial and never full recovery between them.'],
      ['Sprintlerin büyük kısmı 10 metrenin altındadır: belirleyici olan maksimum hız değil, ilk adım ve ivmelenmedir.',
       'Most sprints are under 10 m, so the first step and acceleration decide more than top speed does.'],
      ['Sıçramaların çoğu tek adımlı ve tek bacak kalkışlıdır; inişler dengesiz, temaslı ve önceden planlanmamıştır.',
       'Most jumps go up off a single step and one leg, and landings are unbalanced, contested and unplanned.'],
      ['Ani duruş ve yön değiştirme her pozisyonda tekrarlanır; eksantrik yavaşlama kapasitesi ivmelenme kadar belirleyicidir.',
       'Hard stops and direction changes repeat in every position, so eccentric deceleration matters as much as acceleration.'],
      ['Savunma duruşu ve kayma frontal düzlemde çalışır; ribaund, perdeleme ve post mücadelesi temas altında gövde stabilitesi ister.',
       'Defensive stance and sliding live in the frontal plane, and rebounds, screens and post play ask for trunk stability under contact.'],
    ],
    qualities:[['Yatay güç ve ivmelenme','Horizontal power and acceleration'],
      ['Dikey sıçrama ve tek bacak kalkış','Vertical jump and single-leg take-off'],
      ['Eksantrik yavaşlama ve iniş kontrolü','Eccentric deceleration and landing control'],
      ['Yön değiştirme ve reaktif çeviklik','Change of direction and reactive agility'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability'],
      ['Tek bacak kuvveti ve sağ-sol simetrisi','Single-leg strength and left/right symmetry'],
      ['Ayak bileği dorsifleksiyonu ve kalça mobilitesi','Ankle dorsiflexion and hip mobility'],
      ['Temas altında gövde stabilitesi','Trunk stability under contact']]},
  'Football (Soccer)':{label:['Futbol','Football (soccer)'],
    game:[
      ['Yüksek toplam lokomosyon hacmi içinde tekrarlı sprintler; sprint mesafeleri basketboldan uzundur, maksimum hız belirleyicidir.',
       'Repeated sprints inside a high total locomotion volume, over longer distances than basketball, where top speed does decide.'],
      ['Şut, ikili mücadele ve yön değiştirme tek bacak üzerinde gerçekleşir; hamstring eksantrik talebi yüksektir.',
       'Striking, duels and direction changes happen on one leg, and the eccentric hamstring demand is high.'],
    ],
    qualities:[['Maksimum hız','Maximum velocity'],['Tekrarlı sprint yeteneği','Repeated sprint ability'],
      ['Eksantrik hamstring kuvveti','Eccentric hamstring strength'],['Yön değiştirme','Change of direction'],
      ['Aerobik kapasite','Aerobic capacity']]},
  'Volleyball':{label:['Voleybol','Volleyball'],
    game:[
      ['Bir maç boyunca tekrarlanan maksimal sıçrama ve iniş; toplam sıçrama sayısı yüklemenin kendisidir.',
       'Maximal jumps and landings repeated across a match, where the jump count is itself the load.'],
      ['Smaç ve servis omuzu baş üstü, yüksek hızlı rotasyona sokar; hareket kısa mesafeli ve yanaldır.',
       'Spiking and serving take the shoulder overhead into high-speed rotation, and movement is short and lateral.'],
    ],
    qualities:[['Tekrarlı sıçrama kapasitesi','Repeated jump capacity'],['İniş / kuvvet absorpsiyonu','Landing and force absorption'],
      ['Omuz kuşağı kuvveti ve kontrolü','Shoulder-girdle strength and control'],['Yanal hareket','Lateral movement'],
      ['Reaktif kuvvet','Reactive strength']]},
  'Handball':{label:['Hentbol','Handball'],
    game:[
      ['Kısa sprintler, temas altında sıçrama ve iniş, sık yön değiştirme.',
       'Short sprints, jumps and landings under contact, and frequent direction changes.'],
      ['Baş üstü atış omuzu tekrarlı yüksek hızlı rotasyona sokar.',
       'Overhead throwing takes the shoulder into repeated high-speed rotation.'],
    ],
    qualities:[['İvmelenme','Acceleration'],['Temas altında sıçrama','Jumping under contact'],
      ['Omuz kuşağı kontrolü','Shoulder-girdle control'],['Gövde rotasyon kuvveti','Rotational trunk strength'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability']]},
  'Tennis':{label:['Tenis','Tennis'],
    game:[
      ['Açık beceri: yanal çıkış, ani duruş ve toparlanma adımları saatlerce tekrarlanır.',
       'An open skill: lateral pushes, hard stops and recovery steps repeated for hours.'],
      ['Servis ve vuruşlar alt gövdeden omuza uzanan bir rotasyon zinciri üzerinden üretilir.',
       'The serve and groundstrokes are produced through a rotational chain running from the legs to the shoulder.'],
    ],
    qualities:[['Yanal ivmelenme ve yavaşlama','Lateral acceleration and deceleration'],
      ['Gövde rotasyon gücü','Rotational trunk power'],['Omuz kuşağı dayanıklılığı','Shoulder-girdle endurance'],
      ['Tekrarlı efor kapasitesi','Repeated-effort capacity']]},
  'Rugby':{label:['Ragbi','Rugby'],
    game:[
      ['Tekrarlı ivmelenmeler, çarpışma ve yerdeki mücadele; yüklenmenin büyük kısmı temas altındadır.',
       'Repeated accelerations, collisions and ground contests, with much of the load taken under contact.'],
      ['Mutlak kuvvet ve kütle, oyunun kendisi tarafından talep edilir.',
       'Absolute strength and mass are asked for by the game itself.'],
    ],
    qualities:[['Maksimal kuvvet','Maximal strength'],['İvmelenme','Acceleration'],
      ['Temas dayanıklılığı ve gövde stabilitesi','Contact robustness and trunk stability'],
      ['Boyun ve omuz kuşağı kuvveti','Neck and shoulder-girdle strength'],
      ['Tekrarlı sprint yeteneği','Repeated sprint ability']]},
  'Track & Field':{label:['Atletizm','Track & field'],
    game:[
      ['Talep branşa göre değişir: sprint ve atlamalarda tek bir maksimal efor, dayanıklılık branşlarında sürdürülen efor belirleyicidir.',
       'The demand follows the event: one maximal effort in the sprints and jumps, sustained output in the endurance events.'],
    ],
    qualities:[['Branşa özgü kuvvet-hız profili','Event-specific force-velocity profile'],
      ['Reaktif kuvvet','Reactive strength'],['Teknik tekrarlanabilirlik','Technical repeatability']]},
  'Swimming':{label:['Yüzme','Swimming'],
    game:[
      ['Yer tepki kuvveti yoktur; itki suda, baş üstü omuz hareketi ve gövde üzerinden üretilir.',
       'There is no ground reaction force: propulsion comes through overhead shoulder action and the trunk.'],
      ['Çıkış ve dönüşler, karadaki tek maksimal güç ifadeleridir.',
       'Starts and turns are the only maximal power expressions taken on dry land.'],
    ],
    qualities:[['Omuz kuşağı kuvveti ve kontrolü','Shoulder-girdle strength and control'],
      ['Gövde stabilitesi','Trunk stability'],['Çıkış ve dönüş gücü','Start and turn power'],
      ['Skapular mobilite','Scapular mobility']]},
};
function diSportContext(setup){
  const sport=String((setup&&setup.sport)||'').trim();
  if(!sport)return null;
  /* Matched without regard to case: an imported or hand-edited setup may say
     "basketball" where the picker writes "Basketball". */
  const key=Object.keys(DI_SPORT_DEMANDS).find(k=>k.toLowerCase()===sport.toLowerCase());
  const d=key?DI_SPORT_DEMANDS[key]:null;
  if(!d)return{sport};
  return{sport:L(d.label[0],d.label[1]),
    nature_of_the_game:d.game.map(g=>L(g[0],g[1])),
    key_qualities:d.qualities.map(q=>L(q[0],q[1]))};
}

/* ---- Movement families (the variety rule) ---------------------------------
   The pattern vocabulary the library is tagged in is finer than the question a coach
   asks when they look at a session and say "this is twice the same thing". Squat and
   Lunge / Unilateral are two different patterns and one FAMILY: both are knee-
   dominant, both spend the same tissue on the same quality, and a main phase carrying
   one of each has used two of its slots once. A pattern-by-pattern check waves exactly
   that case through, which is why the variety rule is written against families.
   Patterns are untouched everywhere else. */
const DI_PATTERN_FAMILY={
  'Squat':'knee','Lunge / Unilateral':'knee','Hinge':'hip',
  'Push':'push','Pull':'pull','Carry':'carry',
  'Rotation':'trunk','Core / Brace':'trunk',
  'Jump / Plyo':'plyo','Sprint / Locomotion':'locomotion','Mobility':'mobility',
};
const DI_FAMILY_LABEL={
  knee:['diz dominant (Squat / Lunge)','knee-dominant (squat / lunge)'],
  hip:['kalça dominant (Hinge)','hip-dominant (hinge)'],
  push:['üst vücut itiş','upper-body push'],
  pull:['üst vücut çekiş','upper-body pull'],
  carry:['taşıma','loaded carry'],
  trunk:['gövde / rotasyon','trunk / rotation'],
  plyo:['sıçrama / pliometri','jump / plyometric'],
  locomotion:['sprint / lokomosyon','sprint / locomotion'],
  mobility:['mobilite','mobility'],
};
const diFamilyOf=p=>DI_PATTERN_FAMILY[p]||null;
const diFamilyLabel=f=>{const x=DI_FAMILY_LABEL[f];return x?L(x[0],x[1]):String(f||'');};

/* ---- The gym's kit, and what one exercise costs in minutes ---------------
   The equipment list is the vocabulary the Setup tab's inventory is written in; the
   minutes-per-exercise figure is what turns a session length into an exercise ceiling
   when the coach has not set one. Deliberately blunt: it exists so a 35-minute slot
   cannot come back with twelve exercises in it, not to predict how long anything
   really takes. */
const DI_EQUIPMENT=[
  {id:'barbell', label:['Barbell','Barbell']},
  {id:'dumbbell',label:['Dumbbell','Dumbbell']},
  {id:'cable',   label:['Cable','Cable']},
  {id:'trapbar', label:['Trap Bar','Trap bar']},
  {id:'medball', label:['Sağlık topu','Medicine ball']},
  {id:'plyobox', label:['Pliometrik kutu','Plyo box']},
  {id:'bands',   label:['Lastik','Bands']},
  {id:'sled',    label:['Kızak','Sled']},
  {id:'machine', label:['Makine','Machine']},
  {id:'bodyweight',label:['Vücut ağırlığı','Bodyweight']},
];
const diEqLabel=id=>{const e=DI_EQUIPMENT.find(x=>x.id===id);return e?e.label:[id,id];};
/* ---- The gym's kit, with counts and weights (Settings tab) -----------------
   Equipment used to be ticked per session on the individualization screen, which asked
   the same question every day about a gym that does not change. It is set once on the
   Settings tab now, and it carries a COUNT: six barbells and one trap bar is a different
   session from one barbell and six trap bars, and a programme written for a squad has
   to know which it is.

   It carries a WEIGHT too, because a count on its own does not say what can be loaded:
   a rack of six dumbbells that top out at 12 kg cannot hold a senior's heavy day, and a
   session that prescribes 40 kg into it is unwritable however many of them there are.
   So a line is an item AT a weight, and a gym holds as many lines of one item as it has
   weights worth naming — 6 × 10 kg dumbbells and 4 × 22.5 kg dumbbells are two lines of
   the same kit. `rid` is what lets the second line exist: a line the coach added has
   one, the ten default items do not, and that is the only difference between them.

   An item with no count is available with an unstated number; an item at zero is not
   available at all. An empty inventory means no equipment constraint — the same thing
   an empty list has always meant here. */
const EQ_CUSTOM='custom:';
function eqRows(setup){
  const raw=Array.isArray(setup&&setup.equipment)?setup.equipment:[];
  return raw.filter(r=>r&&(r.id||String(r.label||'').trim())).map(r=>{
    const id=String(r.id||'').trim()||`${EQ_CUSTOM}${diExName(r.label)}`;
    const known=DI_EQUIPMENT.find(x=>x.id===id);
    const qty=recNum(r.qty);
    const kg=recNum(r.kg);
    const rid=String(r.rid||'').trim();
    return{rid:rid||id,extra:!!rid||!known,id,custom:!known,
      label:String(r.label||'').trim()||(known?L(known.label[0],known.label[1]):id),
      qty:qty==null?null:Math.max(0,Math.round(qty)),
      kg:kg==null?null:Math.max(0,Math.round(kg*10)/10)};
  });
}
const eqAvailable=setup=>eqRows(setup).filter(r=>r.qty==null||r.qty>0);
/* One line of the inventory as a coach would say it out loud — "Dumbbell 22.5 kg × 4".
   Used wherever the kit is shown back rather than edited. */
const eqLine=r=>`${r.label}${r.kg!=null?` ${r.kg} kg`:''}${r.qty!=null?` × ${r.qty}`:''}`;
/* ---- The inventory as a shelf: one CARD per piece of kit ------------------
   The flat list above is what the assistant reads, and it stays exactly that. What the
   coach edits is a card per item — the picture they recognise it by, the name, the one
   line that says which barbell this is, and underneath it the weights the gym actually
   holds of it. The cards are stored in `setup.equipmentCards`; `setup.equipment` is
   written from them on every edit and remains the single thing every reader downstream
   (the prompt, the checks, the exercise filter) looks at, so nothing outside this screen
   has to know the shelf exists.

   NOT EVERYTHING IS COUNTED IN KILOS. A plyo box is a height, a band is a level, a rack
   is a name — a card says which of the four its lines are measured in and its table's
   heading follows. Only a kilo line reaches the flat list as a weight, which is what
   keeps "the heaviest dumbbell in this gym" an honest answer.

   A card with no lines is NOT in the inventory: it is the item's name waiting for an
   answer, and the assistant is told nothing about it. That is the same rule the blank
   lines of the old list followed, and it is what keeps an untouched inventory
   unconstrained. */
const EQ_CATS=[
  {id:'free',   label:['Serbest Ağırlık','Free weight']},
  {id:'machine',label:['Makine','Machine']},
  {id:'access', label:['Aksesuar','Accessory']},
  {id:'func',   label:['Fonksiyonel','Functional']},
  {id:'other',  label:['Diğer','Other']},
];
const eqCatLabel=id=>{const c=EQ_CATS.find(x=>x.id===id);return c?L(c.label[0],c.label[1]):L('Diğer','Other');};
/* What one line of a card measures. The heading is the table's left column; `add` is
   what the button under the table offers to put there. */
const EQ_UNITS=[
  {id:'kg',   head:['Ağırlık (kg)','Weight (kg)'],  add:['Ağırlık Ekle','Add weight']},
  {id:'cm',   head:['Yükseklik (cm)','Height (cm)'],add:['Yükseklik Ekle','Add height']},
  {id:'level',head:['Seviye','Level'],              add:['Seviye Ekle','Add level']},
  {id:'text', head:['Açıklama','Description'],      add:['Kalem Ekle','Add item']},
];
const eqUnit=id=>EQ_UNITS.find(u=>u.id===id)||EQ_UNITS[0];
/* The dots down the left of a level table. A band the coach names in the usual words
   gets the colour those words already mean — light is green, heavy is red — and
   anything else is coloured by its place in the list, so a fifth band nobody has a
   word for is still drawn. */
const EQ_DOTS=['#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
const EQ_LEVEL_DOTS=[
  {kw:['ekstra','extra','x-heavy'],c:'#8b5cf6'},
  {kw:['sert','heavy','ağır','agir'],c:'#ef4444'},
  {kw:['orta','medium','med'],       c:'#f59e0b'},
  {kw:['hafif','light'],             c:'#10b981'},
];
function eqDot(label,i){
  const s=String(label||'').trim().toLowerCase();
  const hit=s?EQ_LEVEL_DOTS.find(d=>d.kw.some(k=>s.includes(k))):null;
  return hit?hit.c:EQ_DOTS[i%EQ_DOTS.length];
}
/* How the ten items of the vocabulary arrive on the shelf when nobody has said
   otherwise: what they are, which drawer they are filed in, and what their lines
   measure. Everything here is editable on the card afterwards. */
const EQ_SEED={
  barbell:   {desc:['Olimpik bar','Olympic bar'],                  cat:'free',   unit:'kg'},
  dumbbell:  {desc:['Dambıl seti','Dumbbell set'],                 cat:'free',   unit:'kg'},
  cable:     {desc:['Kablo istasyonu','Cable station'],            cat:'machine',unit:'kg'},
  trapbar:   {desc:['Hex bar','Hex bar'],                          cat:'free',   unit:'kg'},
  medball:   {desc:['Med ball','Med ball'],                        cat:'access', unit:'kg'},
  plyobox:   {desc:['Plyo box','Plyo box'],                        cat:'func',   unit:'cm'},
  bands:     {desc:['Direnç lastiği','Resistance band'],           cat:'access', unit:'level'},
  sled:      {desc:['Kızak / prowler','Sled / prowler'],           cat:'func',   unit:'kg'},
  machine:   {desc:['Smith / Rack / Diğer','Smith / rack / other'],cat:'machine',unit:'text'},
  bodyweight:{desc:['Alet gerektirmez','No implement needed'],     cat:'func',   unit:'text'},
};
/* What picking a type fills the form in with. A coach who picks "Dumbbell" and types
   nothing else gets a card that is already right. */
function eqTypeFill(id){
  const known=DI_EQUIPMENT.find(x=>x.id===id);
  const seed=EQ_SEED[id]||null;
  return{name:known?L(known.label[0],known.label[1]):'',
    desc:seed?L(seed.desc[0],seed.desc[1]):'',
    cat:seed?seed.cat:'other',unit:seed?seed.unit:'kg'};
}
function eqCard(raw,i){
  if(!raw)return null;
  const id=String(raw.id||'').trim()||`${EQ_CUSTOM}${diExName(raw.name)}`;
  const known=DI_EQUIPMENT.find(x=>x.id===id);
  const seed=EQ_SEED[id]||null;
  const name=String(raw.name||'').trim()
    ||(known?L(known.label[0],known.label[1]):String(id).replace(EQ_CUSTOM,'').trim());
  if(!name)return null;
  const n=(v,dec)=>{const x=recNum(v);return x==null?null:Math.max(0,dec?Math.round(x*10)/10:Math.round(x));};
  return{
    cid:String(raw.cid||'').trim()||`eq_${id}_${i}`,
    id,name,
    desc:raw.desc==null?(seed?L(seed.desc[0],seed.desc[1]):''):String(raw.desc).trim(),
    cat:EQ_CATS.some(c=>c.id===raw.cat)?raw.cat:(seed?seed.cat:'other'),
    unit:EQ_UNITS.some(u=>u.id===raw.unit)?raw.unit:(seed?seed.unit:'kg'),
    photo:typeof raw.photo==='string'?raw.photo:'',
    rows:(Array.isArray(raw.rows)?raw.rows:[]).map((r,j)=>({
      rid:String((r&&r.rid)||'').trim()||`${i}_${j}_${uid()}`,
      v:n(r&&r.v,true),
      label:String((r&&r.label)||'').trim(),
      qty:n(r&&r.qty,false),
    })),
  };
}
/* The shelf a gym that has never seen this screen starts from: the ten items of the
   vocabulary, each holding whatever the old flat list already said about it. A card
   whose lines carry kilos is measured in kilos whatever its seed says — a height that
   was typed as a weight is not silently re-read as centimetres. */
function eqSeedCards(setup){
  const byId={};
  eqRows(setup).forEach(r=>{(byId[r.id]=byId[r.id]||[]).push(r);});
  const ids=DI_EQUIPMENT.map(x=>x.id)
    .concat(Object.keys(byId).filter(id=>!DI_EQUIPMENT.some(x=>x.id===id)));
  return ids.map((id,i)=>{
    const old=byId[id]||[];
    const known=DI_EQUIPMENT.find(x=>x.id===id);
    const seed=EQ_SEED[id]||null;
    const unit=seed?seed.unit:'kg';
    return eqCard({cid:`eq_${id}`,id,
      name:known?L(known.label[0],known.label[1]):(old[0]&&old[0].label)||String(id).replace(EQ_CUSTOM,''),
      cat:seed?seed.cat:'other',
      unit:(unit!=='kg'&&old.some(r=>r.kg!=null))?'kg':unit,
      rows:old.map(r=>({rid:r.rid,v:r.kg,label:'',qty:r.qty}))},i);
  }).filter(Boolean);
}
const eqCards=setup=>Array.isArray(setup&&setup.equipmentCards)
  ?setup.equipmentCards.map(eqCard).filter(Boolean)
  :eqSeedCards(setup);
/* What a card puts back into storage — the normalized shape, nothing else. */
const eqStoreCard=c=>({cid:c.cid,id:c.id,name:c.name,desc:c.desc,cat:c.cat,unit:c.unit,
  photo:c.photo||'',rows:(c.rows||[]).map(r=>({rid:r.rid,v:r.v,label:r.label,qty:r.qty}))});
/* How a line reads once it is off the card: "45 cm" for a box, "Sert" for a band, the
   card's own name for a kilo line, which already carries its weight in the kg field. */
const eqRowText=(c,r)=>c.unit==='cm'?(r.v!=null?`${r.v} cm`:''):(c.unit==='kg'?'':String(r.label||'').trim());
/* The flat list every reader downstream sees, written from the shelf. A card with no
   lines contributes nothing, which is what keeps it out of the inventory. */
const eqMirror=cards=>cards.reduce((out,c)=>out.concat((c.rows||[]).map(r=>{
  const tail=eqRowText(c,r);
  return{rid:r.rid,id:c.id,label:(c.name+(tail?` — ${tail}`:'')).trim(),
    qty:r.qty,kg:c.unit==='kg'?r.v:null};
})),[]);
const eqCardQty=c=>(c.rows||[]).reduce((t,r)=>t+(r.qty==null?0:r.qty),0);
/* What a piece of work NEEDS, read off the exercise's own tags when the library has
   them and off its name when it does not. Deliberately narrow: it exists to catch a
   barbell lift written for a gym with no barbell, not to classify exercises. */
const EQ_KEYWORDS=[
  {id:'trapbar', kw:['trap bar','hex bar','trap-bar']},
  {id:'barbell', kw:['barbell','back squat','front squat','bench press','deadlift','romanian','rdl','hip thrust','power clean','hang clean','snatch','push press','halter','barfiks yok']},
  {id:'dumbbell',kw:['dumbbell','dambıl','db ']},
  {id:'cable',   kw:['cable','kablo','pulldown','pull-down']},
  {id:'medball', kw:['med ball','medicine ball','sağlık topu','med-ball','medball']},
  {id:'plyobox', kw:['box jump','drop jump','depth jump','plyo box','pliometrik kutu','step-up box']},
  {id:'bands',   kw:['band','lastik']},
  {id:'sled',    kw:['sled','kızak','prowler']},
  {id:'machine', kw:['machine','makine','leg press','leg curl','leg extension','smith']},
];
function eqNeedOf(libItem,text){
  const tagged=[...exMulti(libItem&&libItem.equipment),...((libItem&&Array.isArray(libItem.equipmentTags))?libItem.equipmentTags:[])]
    .filter(Boolean).map(x=>String(x).toLowerCase());
  for(const e of EQ_KEYWORDS)if(tagged.some(t=>t.includes(e.id)))return e.id;
  const s=String(text==null?'':text).toLowerCase();
  if(!s.trim())return null;
  const hit=EQ_KEYWORDS.find(e=>e.kw.some(k=>s.includes(k)));
  return hit?hit.id:null;
}
/* Minutes of session time one exercise is assumed to take, used only to derive a
   ceiling when the coach has not set one. Deliberately blunt: it exists so the
   answer cannot return a twelve-exercise session into a 35-minute slot, not to
   predict how long anything really takes. */
const DI_MIN_PER_EX=6;

/* ---- Pain (§9) ------------------------------------------------------------
   The reported regions, the coach's standing constraint tags, and — for each — the
   movement patterns that region loads and the ones work is usually redirected to.
   The severity the check-in collects is 0-3 on the survey's grid; it is reported on
   the 0-5 scale the athletes are asked on as well, converted once here so nothing
   downstream has to guess which scale it is looking at. */
const diPain5=sev=>(sev==null||sev==='')?null:Math.round(Math.max(0,Math.min(3,Number(sev)))/3*5);
function diPain(ath,ref){
  const reports=athPainReports(ath,ref);
  const note=athPainNote(ath,ref);
  const tags=(ath.constraintTags||[]).filter(Boolean);
  const reported=new Set(reports.map(r=>r.tag));
  const mk=(tag,extra)=>{
    const r=PAIN_RULES[tag]||{};
    return{region:tag,label:ctLabel(tag),...extra,
      loads_patterns:r.hit||[],redirect_patterns:r.prefer||[]};
  };
  const regions=[
    ...reports.map(p=>mk(p.tag,{severity_0_3:p.sev==null?null:p.sev,severity_0_5:diPain5(p.sev),
      date:p.date,source:p.src==='text'?'check-in free text':'check-in region grid'})),
    /* A STANDING CONSTRAINT TAG IS A RESTRICTION, NOT A MISSING PAIN SCORE.
       These rode along with a null severity, and every reader downstream that asked
       "is this severe enough to close the pattern?" answered no — so a knee the coach
       had ticked as managed all season closed nothing, and the one thing a coach can
       state outright about an athlete was the one thing the session could ignore. It
       carries no number because nobody reported one this morning; it still binds. */
    ...tags.filter(t=>!reported.has(t)).map(t=>mk(t,{severity_0_3:null,severity_0_5:null,date:null,
      standing:true,source:'coach constraint tag'})),
  ];
  const peak=regions.reduce((m,r)=>Math.max(m,r.severity_0_5==null?0:r.severity_0_5),0);
  /* Yesterday's report beside today's, so a region can be read as settling or building
     rather than as a number on its own (§9.3). */
  const prev=athPainReports(ath,fmt(addD(parseD(ref),-1))).map(p=>p.tag);
  return{regions,
    peak_severity_0_5:regions.length?peak:null,
    athlete_words:note&&note.quoted?{text:note.text,date:note.date}:null,
    trend:regions.length?regions.map(r=>({region:r.label,
      yesterday:prev.includes(r.region),status:prev.includes(r.region)?'ongoing':'new'})):[],
    /* Every pattern today's pain says to take load off, collapsed once so the answer
       gets one list instead of the same pattern from three regions. */
    patterns_to_unload:[...new Set(regions.flatMap(r=>r.loads_patterns))],
    patterns_preferred:[...new Set(regions.flatMap(r=>r.redirect_patterns))]};
}

