/* =========================================================
   MOVEMENT TAXONOMY — Kategori · Tür · Yön
   =========================================================
   ONE list of movement categories for the whole app: the chips of the pattern table (the
   calendar's block editor and the individualization brief alike), the Kategori / Tür / Yön
   boxes on every exercise row, the exercise picker's filter, the exercise library's shelves
   and filters, and the weekly load distribution all read this table.

   Every value is stored in English (`k`) — saved sessions, library cards and the load
   distribution key off these exact strings — and shown in the app's language through the
   labels beside it. A category without a direction list has no Yön box. `id` is the slug the
   individualization brief stores its rows under. */
const MV_DIR_GROUND=[['In Place','Yerinde','In place'],['Forward','Öne','Forward'],['Backward','Geriye','Backward'],
  ['Lateral','Yana','Lateral'],['Diagonal','Çapraz','Diagonal'],['Multi-Directional','Çok Yönlü','Multi-directional']];
const MV_DIR_ARM=[['Horizontal','Yatay','Horizontal'],['Vertical','Dikey','Vertical'],['Angled','Açılı','Angled']];
const MV_CATS=[
  {k:'Knee Dominant',id:'knee_dominant',tr:'Diz Dominant',en:'Knee Dominant',color:'#3987e5',
    types:[['Squat','Squat','Squat'],['Split Squat','Split Squat','Split Squat'],['Lunge','Lunge','Lunge'],
      ['Step-up','Step-up','Step-up'],['Step-down','Step-down','Step-down']],
    dirs:MV_DIR_GROUND},
  {k:'Hip Dominant',id:'hip_dominant',tr:'Kalça Dominant',en:'Hip Dominant',color:'#199e70',
    types:[['Deadlift','Deadlift','Deadlift'],['RDL','RDL','RDL'],['Good Morning','Good Morning','Good Morning'],
      ['Hip Thrust','Hip Thrust','Hip Thrust'],['Glute Bridge','Glute Bridge','Glute Bridge'],
      ['Pull-through','Pull-through','Pull-through'],['Swing','Swing','Swing']],
    dirs:[]},
  {k:'Upper Body Push',id:'upper_push',tr:'Üst Vücut İtiş',en:'Upper Body Push',color:'#d55181',
    types:[['Horizontal Push','Yatay İtiş','Horizontal Push'],['Vertical Push','Dikey İtiş','Vertical Push']],
    dirs:MV_DIR_ARM},
  {k:'Upper Body Pull',id:'upper_pull',tr:'Üst Vücut Çekiş',en:'Upper Body Pull',color:'#c98500',
    types:[['Horizontal Pull','Yatay Çekiş','Horizontal Pull'],['Vertical Pull','Dikey Çekiş','Vertical Pull']],
    dirs:MV_DIR_ARM},
  {k:'Core',id:'core',tr:'Core',en:'Core',color:'#8b5cf6',
    types:[['Anti-Extension','Anti-ekstansiyon','Anti-extension'],['Anti-Flexion','Anti-fleksiyon','Anti-flexion'],
      ['Anti-Rotation','Anti-rotasyon','Anti-rotation'],['Anti-Lateral Flexion','Anti-lateral fleksiyon','Anti-lateral flexion'],
      ['Flexion','Fleksiyon','Flexion'],['Extension','Ekstansiyon','Extension'],['Rotation','Rotasyon','Rotation'],
      ['Lateral Flexion','Lateral fleksiyon','Lateral flexion']],
    dirs:[]},
  {k:'Carry',id:'carry',tr:'Carry',en:'Carry',color:'#0ea5b7',
    types:[["Farmer's Carry","Farmer's Carry","Farmer's Carry"],['Suitcase Carry','Suitcase Carry','Suitcase Carry'],
      ['Front Rack Carry','Front Rack Carry','Front Rack Carry'],['Overhead Carry','Overhead Carry','Overhead Carry'],
      ['Zercher Carry','Zercher Carry','Zercher Carry']],
    dirs:[]},
  {k:'Olympic Lift',id:'olympic',tr:'Olimpik Kaldırış',en:'Olympic Lift',color:'#e5484d',
    types:[['Clean','Clean','Clean'],['Snatch','Snatch','Snatch'],['Jerk','Jerk','Jerk'],['Olympic Pull','Pull','Pull'],
      ['Technique / Assistance','Teknik / Yardımcı','Technique / Assistance']],
    dirs:[]},
  {k:'Plyometric',id:'plyometric',tr:'Pliometrik',en:'Plyometric',color:'#7cb518',
    types:[['Jump','Jump','Jump'],['Hop','Hop','Hop'],['Bound','Bound','Bound'],['Upper Body','Upper Body','Upper Body']],
    dirs:[['Vertical','Dikey','Vertical'],['Forward','İleriye','Forward'],['Backward','Geriye','Backward'],
      ['Lateral','Yanal','Lateral'],['Diagonal','Diyagonal','Diagonal'],['Multi-Directional','Çok Yönlü','Multi-directional']]},
  {k:'Medicine Ball',id:'med_ball',tr:'Med Ball',en:'Med Ball',color:'#f08c3c',
    types:[['Chest Pass','Chest Pass','Chest Pass'],['Overhead Throw','Overhead Throw','Overhead Throw'],
      ['Rotational Throw','Rotational Throw','Rotational Throw'],['Scoop Toss','Scoop Toss','Scoop Toss'],
      ['Slam','Slam','Slam'],['Shot Put Throw','Shot Put Throw','Shot Put Throw']],
    dirs:[['Forward','Öne','Forward'],['Backward','Geriye','Backward'],['Up','Yukarı','Up'],['Down','Aşağı','Down'],
      ['Lateral','Yana','Lateral'],['Rotational','Rotasyonel','Rotational'],['Diagonal','Diyagonal','Diagonal']]},
  {k:'Full Body',id:'full_body',tr:'Tüm Vücut',en:'Full Body',color:'#9c6644',
    types:[['Squat + Press','Squat + Press','Squat + Press'],['Lunge + Press','Lunge + Press','Lunge + Press'],
      ['Hinge + Pull','Hinge + Pull','Hinge + Pull'],['Hinge + Press','Hinge + Press','Hinge + Press'],
      ['Squat + Pull','Squat + Pull','Squat + Pull'],['Pull + Press','Pull + Press','Pull + Press'],
      ['Get-up','Get-up','Get-up'],['Ground to Standing','Ground to Standing','Ground to Standing'],
      ['Complex / Flow','Complex / Flow','Complex / Flow']],
    dirs:MV_DIR_GROUND},
  {k:'Accessory',id:'accessory',tr:'Aksesuar',en:'Accessory',color:'#5c8a99',
    types:[['Shoulder','Omuz','Shoulder'],['Arm','Kol','Arm'],['Forearm / Grip','Ön Kol / Kavrama','Forearm / Grip'],
      ['Calf','Baldır','Calf'],['Tibialis','Tibialis','Tibialis'],['Hip Isolation','Kalça İzolasyonu','Hip Isolation'],
      ['Knee Extension','Diz Ekstansiyonu','Knee Extension'],['Knee Flexion','Diz Fleksiyonu','Knee Flexion'],
      ['Neck','Boyun','Neck'],['Scapula','Skapula','Scapula'],['Rotator Cuff','Rotator Cuff','Rotator Cuff'],
      ['Adductor','Adduktor','Adductor'],['Abductor','Abduktor','Abductor']],
    dirs:[]},
];
const MV_KEYS=MV_CATS.map(c=>c.k);
const mvCat=k=>MV_CATS.find(c=>c.k===k)||null;
const mvCatById=id=>MV_CATS.find(c=>c.id===id)||null;
const mvCatLabel=k=>{const c=mvCat(k);return c?L(c.tr,c.en):String(k||'');};
const mvTypes=k=>{const c=mvCat(k);return c?c.types.map(t=>t[0]):[];};
const mvDirs=k=>{const c=mvCat(k);return c?c.dirs.map(t=>t[0]):[];};
/* A type or a direction of a category, in the app's language. The same English word can
   read differently under two categories ("Lateral" is Yana for a lunge and Yanal for a
   jump), so the category is part of the question. */
const mvTerm=(k,v)=>{const c=mvCat(k);if(!c||!v)return'';
  const hit=c.types.find(t=>t[0]===v)||c.dirs.find(t=>t[0]===v);return hit?L(hit[1],hit[2]):'';};
const mvTermOr=(k,v)=>mvTerm(k,v)||(typeof exLabel==='function'?exLabel(v):v);

/* ---- Reading a type and a direction off an exercise's name -----------------
   A row whose exercise was picked or typed is filled in with what its name says, so the
   coach only answers what the name does not. Most specific first; every answer is one of
   the category's own values, and nothing is guessed where nothing matches. */
const MV_TYPE_WORDS={
  'Knee Dominant':[[/step[- ]?down/,'Step-down'],[/step[- ]?up/,'Step-up'],[/split ?squat|bulgarian|rfess|rear[- ]?foot/,'Split Squat'],
    [/lunge|hamle/,'Lunge'],[/squat|leg press|pistol|wall sit|\bsissy\b/,'Squat']],
  'Hip Dominant':[[/good ?morning/,'Good Morning'],[/hip thrust/,'Hip Thrust'],[/glute bridge|\bbridge\b/,'Glute Bridge'],
    [/pull[- ]?through/,'Pull-through'],[/\bswing\b/,'Swing'],[/\brdl\b|romanian|stiff[- ]?leg/,'RDL'],[/deadlift|\bdl\b/,'Deadlift']],
  'Upper Body Push':[[/overhead|shoulder press|military|\bohp\b|push press|\bjerk\b|z[- ]?press|arnold|handstand|pike/,'Vertical Push'],
    [/landmine/,'Vertical Push'],
    [/bench|push[- ]?up|chest|\bfly\b|floor press|incline|decline|\bdip\b|\bdb press\b/,'Horizontal Push']],
  'Upper Body Pull':[[/pull[- ]?up|chin[- ]?up|pulldown|pull ?down|\blat\b|pullover/,'Vertical Pull'],
    [/\brow\b|face ?pull|rear delt|inverted/,'Horizontal Pull']],
  'Core':[[/anti[- ]?rotation|pallof|bird ?dog|\bpress ?out\b/,'Anti-Rotation'],
    [/anti[- ]?lateral|side ?plank|copenhagen plank/,'Anti-Lateral Flexion'],
    [/anti[- ]?extension|\bplank\b|dead ?bug|ab ?wheel|roll ?out|body ?saw|\bhollow\b/,'Anti-Extension'],
    [/anti[- ]?flexion/,'Anti-Flexion'],[/side ?bend|lateral flexion/,'Lateral Flexion'],
    [/woodchop|\bchop\b|russian ?twist|\btwist\b|rotation/,'Rotation'],
    [/back ?extension|superman|reverse hyper|\bextension\b/,'Extension'],
    [/crunch|sit[- ]?up|leg raise|knee raise|\bv[- ]?up\b|toes ?to ?bar|\bflexion\b/,'Flexion']],
  'Carry':[[/farmer/,"Farmer's Carry"],[/suitcase/,'Suitcase Carry'],[/front ?rack|rack carry|goblet carry/,'Front Rack Carry'],
    [/overhead|waiter/,'Overhead Carry'],[/zercher/,'Zercher Carry']],
  'Olympic Lift':[[/\bpull\b/,'Olympic Pull'],[/snatch/,'Snatch'],[/\bjerk\b/,'Jerk'],[/clean/,'Clean'],
    [/drill|technique|teknik|complex|balance|muscle|tall|scarecrow/,'Technique / Assistance']],
  'Plyometric':[[/push[- ]?up|clap|upper|plyo push|med ?ball push/,'Upper Body'],[/bound/,'Bound'],[/\bhop|pogo|skip/,'Hop'],
    [/jump|cmj|\bdj\b|depth|drop/,'Jump']],
  'Medicine Ball':[[/scoop/,'Scoop Toss'],[/shot ?put/,'Shot Put Throw'],[/slam/,'Slam'],[/chest pass|chest throw|\bpass\b/,'Chest Pass'],
    [/rotational|side toss|\btwist\b|rotation/,'Rotational Throw'],[/overhead|backward throw|over the head/,'Overhead Throw']],
  'Full Body':[[/get[- ]?up|turkish/,'Get-up'],[/burpee|ground to stand|sprawl/,'Ground to Standing'],[/complex|flow/,'Complex / Flow'],
    [/thruster|squat.*press|wall ball/,'Squat + Press'],[/lunge.*press/,'Lunge + Press'],[/squat.*(row|pull)/,'Squat + Pull'],
    [/(deadlift|rdl|hinge|clean).*(press)/,'Hinge + Press'],[/(deadlift|rdl|hinge).*(row|pull)|renegade/,'Hinge + Pull'],
    [/(row|pull).*press|press.*(row|pull)/,'Pull + Press']],
  'Accessory':[[/external rotation|internal rotation|rotator|\bcuff\b|\ber\b/,'Rotator Cuff'],[/scap|y[- ]?t[- ]?w|\bytw\b|serratus/,'Scapula'],
    [/neck/,'Neck'],[/tibialis|tib raise|\btib\b/,'Tibialis'],[/calf|soleus/,'Calf'],[/leg extension|knee extension|tke/,'Knee Extension'],
    [/leg curl|hamstring curl|nordic|knee flexion/,'Knee Flexion'],[/adduct|copenhagen/,'Adductor'],
    [/abduct|clam|band walk|monster walk|lateral walk/,'Abductor'],[/grip|wrist|forearm|plate pinch/,'Forearm / Grip'],
    [/curl|bicep|tricep|skull|pushdown|kickback/,'Arm'],[/raise|delt|shoulder|\bfly\b/,'Shoulder'],
    [/glute|hip (ext|abd|flex)|kick ?back|fire hydrant/,'Hip Isolation']],
};
const MV_DIR_WORDS={
  'Knee Dominant':[[/lateral|side|cossack|skater/,'Lateral'],[/reverse|backward|rear(?![- ]?foot)/,'Backward'],[/curtsy|crossover|diagonal/,'Diagonal'],
    [/walking|forward/,'Forward'],[/clock|multi/,'Multi-Directional']],
  'Upper Body Push':[[/incline|decline|landmine/,'Angled']],
  'Upper Body Pull':[[/high row|low row|incline/,'Angled']],
  'Plyometric':[[/lateral|skater|side/,'Lateral'],[/backward|reverse/,'Backward'],[/diagonal|zig ?zag/,'Diagonal'],
    [/broad|forward|horizontal|\bbound/,'Forward'],[/multi/,'Multi-Directional'],[/box|tuck|vertical|cmj|squat jump|depth|drop|pogo/,'Vertical']],
  'Medicine Ball':[[/slam/,'Down'],[/scoop|backward|overhead back/,'Backward'],[/rotational|side|twist/,'Rotational'],
    [/vertical|up/,'Up'],[/chest|shot ?put|forward/,'Forward']],
  'Full Body':[[/lateral|side/,'Lateral'],[/reverse|backward/,'Backward'],[/walking|forward/,'Forward']],
};
/* What a direction follows from its type when the name says nothing else: a vertical push is
   pressed vertically. */
const MV_DIR_FROM_TYPE={'Horizontal Push':'Horizontal','Vertical Push':'Vertical','Horizontal Pull':'Horizontal','Vertical Pull':'Vertical',
  'Slam':'Down','Chest Pass':'Forward','Rotational Throw':'Rotational','Scoop Toss':'Backward','Overhead Throw':'Backward','Shot Put Throw':'Rotational'};
function mvGuessType(k,name){
  const nm=String(name||'').toLowerCase();
  if(!nm)return'';
  const ok=mvTypes(k);
  const hit=(MV_TYPE_WORDS[k]||[]).find(([re,t])=>ok.includes(t)&&re.test(nm));
  return hit?hit[1]:'';
}
function mvGuessDir(k,name,type){
  const ok=mvDirs(k);if(!ok.length)return'';
  const nm=String(name||'').toLowerCase();
  const hit=nm&&(MV_DIR_WORDS[k]||[]).find(([re,d])=>ok.includes(d)&&re.test(nm));
  if(hit)return hit[1];
  const d=MV_DIR_FROM_TYPE[type];
  return d&&ok.includes(d)?d:'';
}
/* Words an older version of the app stored as a row's "execution", read into the type they
   now are. Anything else that is not one of the category's types is read off the name. */
const MV_TYPE_ALIAS={
  'Upper Body Push':{Horizontal:'Horizontal Push',Vertical:'Vertical Push'},
  'Upper Body Pull':{Horizontal:'Horizontal Pull',Vertical:'Vertical Pull'},
};
const MV_DIR_ALIAS={'Upper Body Push':{Horizontal:'Horizontal',Vertical:'Vertical'},'Upper Body Pull':{Horizontal:'Horizontal',Vertical:'Vertical'}};
function mvNormType(k,v,name){
  const ok=mvTypes(k);if(!ok.length)return'';
  const s=String(v||'').trim();
  if(ok.includes(s))return s;
  const al=(MV_TYPE_ALIAS[k]||{})[s];
  if(al)return al;
  return mvGuessType(k,name);
}
function mvNormDir(k,v,name,type,plane){
  const ok=mvDirs(k);if(!ok.length)return'';
  const s=String(v||'').trim();
  if(ok.includes(s))return s;
  const al=(MV_DIR_ALIAS[k]||{})[String(plane||'').trim()];
  if(al&&ok.includes(al))return al;
  return mvGuessDir(k,name,type);
}
/* A library card's category — the shelf it sits on, else the category a program row last
   tagged it with — and its type and direction under that category. */
function mvLibCat(it){
  if(!it)return'';
  if(MV_KEYS.includes(it.type))return it.type;
  if(MV_KEYS.includes(it.exPattern))return it.exPattern;
  return'';
}
function mvLibType(it,k){
  if(!it||!k)return'';
  const ok=mvTypes(k);
  if(ok.includes(it.subType))return it.subType;
  if(it.exPattern===k&&ok.includes(it.exPlane))return it.exPlane;
  return mvNormType(k,it.exPattern===k?it.exPlane:'',it.name);
}
function mvLibDir(it,k,type){
  if(!it||!k)return'';
  const ok=mvDirs(k);
  if(ok.includes(it.dir))return it.dir;
  return mvGuessDir(k,it.name,type||mvLibType(it,k));
}
/* A library card saved under the shelves an older version had, read into this taxonomy once
   (data migration). Only a sub-type that is set and is not one of its category's types is
   touched — a card the coach left blank stays blank — so running it again changes nothing.
   What the old value said is kept where it still means something: a Horizontal press is a
   horizontal push pressed horizontally, a plyometric filed "Lateral" jumps sideways, an
   eccentric squat keeps its contraction on the contraction field. */
const MV_OLD_DIR={'Plyometric':{Vertical:'Vertical',Horizontal:'Forward',Lateral:'Lateral','Multi-Directional':'Multi-Directional'},
  'Medicine Ball':{Vertical:'Up',Horizontal:'Forward',Rotational:'Rotational'}};
const MV_OLD_KIND={'Plyometric':{Jump:'Jump','Drop Jump':'Jump',Hop:'Hop',Bound:'Bound'},'Medicine Ball':{Slam:'Slam',Pass:'Chest Pass'}};
const MV_OLD_ACC={'Shoulder & Scapula':'Shoulder','Arms':'Arm','Forearm & Grip':'Forearm / Grip','Calf & Ankle':'Calf','Neck':'Neck',
  'Glutes':'Hip Isolation','Quadriceps':'Knee Extension','Adductors & Abductors':'Adductor'};
function mvMigrateLibCard(e){
  if(!e||typeof e!=='object')return e;
  let type=e.type;
  const sub=String(e.subType||'').trim();
  if(sub==='Olympic Lift'&&type==='Full Body')type='Olympic Lift';
  if(!MV_KEYS.includes(type))return type===e.type?e:{...e,type};
  const ok=mvTypes(type);
  if(!sub||ok.includes(sub))return type===e.type?e:{...e,type};
  const out={...e,type};
  const nm=String(e.name||'');
  const oldDir=(MV_OLD_DIR[type]||{})[sub]||(MV_DIR_ALIAS[type]||{})[sub]||'';
  if(oldDir&&!e.dir&&mvDirs(type).includes(oldDir))out.dir=oldDir;
  if(['Concentric','Eccentric','Isometric'].includes(sub)){
    const cur=Array.isArray(e.contraction)?e.contraction:(e.contraction?[e.contraction]:[]);
    if(!cur.includes(sub))out.contraction=[...cur,sub];
  }
  out.subType=(MV_TYPE_ALIAS[type]||{})[sub]||(MV_OLD_KIND[type]||{})[e.exKind]
    ||(type==='Knee Dominant'&&({'Step-Up':'Step-up',Lunges:'Lunge'})[e.pattern])
    ||mvGuessType(type,nm)||(type==='Accessory'&&MV_OLD_ACC[sub])||'';
  return out;
}
