/* =========================================================
   AI LAYER — the coach briefs it, it writes the session.

   V1 of this module asked the model for judgement only: the day's session already
   existed, and all it could do was swap an exercise or take one out. That is not what
   a coach standing in front of one athlete needs. Here the coach writes the brief —
   today's priority, what must be in, what to avoid, which constraints apply, how long
   there is and how many exercises — and the model writes the session against it.

   What did NOT move is the arithmetic. Readiness, the volume adjustment, the days to
   the next game, the recent exposure and the baseline deviations are still computed in
   code and handed over finished; the model may quote them and may not recompute them.
   The readiness-driven cut is still applied BY CODE, after the answer arrives: the
   model writes the session a normal day would carry, `diAdjustRow` takes the
   percentage off it, and the sheet shows "4×6 → 3×6" beside the exercise. So the one
   number that decides how hard today is stays where it has always been.

   Nothing is written to anyone from here. The programme is shown, the coach reads it,
   and it reaches the athlete's calendar when they press the button — the same
   AI draft → coach review → final programme order §30 asks for.
   ========================================================= */

/* ---- What the coach can ask for (the brief, field 1) ----------------------
   Grouped the way a coach thinks about qualities rather than alphabetically, and
   carried as ids so the answer is asked for one of these rather than for prose. */
const DI_PRIORITIES=[
  {group:['Kuvvet','Strength'],items:[
    {id:'foundational_strength',label:['Temel Kuvvet (Foundational Strength)','Foundational strength']},
    {id:'max_strength',label:['Maksimal Kuvvet','Maximal strength']},
    {id:'rfd',         label:['Kuvvet Geliştirme Hızı (RFD)','Rate of force development']},
    {id:'power',       label:['Güç (Power)','Power']},
    {id:'reactive',    label:['Reaktif Kuvvet','Reactive strength']},
    {id:'hypertrophy', label:['Hipertrofi','Hypertrophy']}]},
  {group:['Hız ve Hareket','Speed & movement'],items:[
    {id:'accel',       label:['İvmelenme','Acceleration']},
    {id:'max_velocity',label:['Maksimum Hız','Maximum velocity']},
    {id:'decel',       label:['Yavaşlama','Deceleration']},
    {id:'cod',         label:['Yön Değiştirme (COD)','Change of direction']},
    {id:'agility',     label:['Çeviklik','Agility']}]},
  {group:['Hareket Kalitesi','Movement quality'],items:[
    {id:'mobility',    label:['Mobilite','Mobility']},
    {id:'stability',   label:['Stabilite','Stability']},
    {id:'landing',     label:['İniş / Kuvvet Absorpsiyonu','Landing / force absorption']},
    {id:'corrective',  label:['Düzeltici','Corrective']}]},
  {group:['Enerji Sistemleri','Energy systems'],items:[
    {id:'aerobic',     label:['Aerobik Kapasite','Aerobic capacity']},
    {id:'anaerobic',   label:['Anaerobik Kapasite','Anaerobic capacity']},
    {id:'rsa',         label:['Tekrarlı Sprint Yeteneği','Repeated sprint ability']}]},
  {group:['Koruma / Rehabilitasyon','Maintenance / rehab'],items:[
    {id:'strength_maint',label:['Kuvvet Koruma','Strength maintenance']},
    {id:'speed_maint',   label:['Hız / Güç Koruma','Speed / power maintenance']},
    {id:'recondition',   label:['Reconditioning','Reconditioning']},
    {id:'rtp',           label:['Oyuna Dönüş (RTP)','Return to play']}]},
];
const DI_PRIORITY_ALL=DI_PRIORITIES.reduce((a,g)=>a.concat(g.items),[]);
const diPrioRow=id=>DI_PRIORITY_ALL.find(p=>p.id===id)||null;
const diPrioLabel=id=>{const p=diPrioRow(id);return p?L(p.label[0],p.label[1]):String(id||'');};

/* ---- Constraints the coach can put on today (the brief, field 4) ----------
   Each one is a CEILING with a stated programming consequence: `what` is what the
   constraint means, `ex` is how a coach says it out loud, and `ai` is what the answer
   is required to do about it. Only the selected ones are shipped, each with its `ai`
   line, so the instruction the model is given is the same sentence the coach read when
   they ticked it — there is no second, hidden reading of a constraint. */
const DI_CONSTRAINT_TYPES=[
  {id:'load',label:['Yük Sınırı','Load limit'],
   what:['Kullanılabilecek dış yükü (kg, %1RM, RPE) sınırlar.','Caps the external load (kg, %1RM, RPE) that may be used.'],
   ex:['"Maksimum %60 1RM" · "RPE 7\'yi geçme" · "En fazla 40 kg"','"Max 60% 1RM" · "Stay under RPE 7" · "No more than 40 kg"'],
   ai:['Önerilen egzersizlerdeki yük belirtilen sınırı aşmamalı; daha düşük yükle benzer uyarıcıyı veren varyasyonlar tercih edilmeli.',
       'No exercise may exceed the stated load; prefer variations that give a similar stimulus at a lower load.'],
   deger:{kind:'load',ph:['ör. %60 · 40 kg · RPE 7','e.g. 60% · 40 kg · RPE 7']}},
  {id:'volume',label:['Hacim Sınırı','Volume limit'],
   what:['Set, tekrar, mesafe, süre veya toplam çalışma miktarını sınırlar.','Caps sets, reps, distance, time or total work.'],
   ex:['"Toplam set sayısını azalt" · "En fazla 60 tekrar" · "Metrajı düşük tut"','"Fewer total sets" · "60 reps at most" · "Keep the metreage low"'],
   ai:['Toplam hacim sınır içinde tutulmalı; gerekirse daha düşük set/tekrar/mesafe ile benzer uyarıcı sağlanmalı.',
       'Keep total volume inside the limit; deliver a similar stimulus with fewer sets, reps or metres if needed.'],
   deger:{kind:'sets',ph:['toplam set, ör. 12','total sets, e.g. 12']}},
  {id:'time',label:['Zaman Sınırı','Time limit'],
   what:['Seansın toplam süresini sınırlar.','Caps the total length of the session.'],
   ex:['"En fazla 45 dakika" · "30 dakikada bitsin"','"45 minutes at most" · "Done inside 30 minutes"'],
   ai:['Egzersiz seçimi ve set/tekrar yapısı seansı verilen sürede bitirecek şekilde kurulmalı; uzun hazırlık ve kompleks yapılardan kaçınılmalı.',
       'Pick exercises and a set structure that finish inside the time; avoid long build-ups and complex set structures.'],
   deger:{kind:'min',ph:['dakika, ör. 45','minutes, e.g. 45']}},
  {id:'intensity',label:['Yoğunluk Sınırı','Intensity limit'],
   what:['Çalışma yoğunluğunu (hız, RPE, %1RM, velocity) sınırlar.','Caps working intensity (speed, RPE, %1RM, velocity).'],
   ex:['"RPE 6\'yı geçme" · "%70 1RM üstü yok" · "Maksimum sub-maksimal"','"Stay under RPE 6" · "Nothing above 70% 1RM" · "Sub-maximal only"'],
   ai:['Belirtilen yoğunluk seviyesi aşılmamalı; daha düşük yoğunlukta uygun egzersiz varyasyonları seçilmeli.',
       'Do not exceed the stated intensity; choose variations that work at a lower one.'],
   deger:{kind:'load',ph:['ör. RPE 6 · %70','e.g. RPE 6 · 70%']}},
  {id:'impact',label:['Darbe / Sıçrama Sınırı','Impact / jump limit'],
   what:['Pliometrik sıçrama, iniş ve toplam zemin teması miktarını sınırlar.','Caps jumps, landings and total ground contacts.'],
   ex:['"En fazla 30 sıçrama" · "Pliometrik hacmi düşük tut" · "Drop jump yok"','"30 jumps at most" · "Keep plyo volume low" · "No drop jumps"'],
   ai:['Zemin teması, sıçrama ve pliometrik hacim sınırlandırılmalı; gerekirse izometrik veya med ball gibi alternatif güç uyarıcıları önerilmeli.',
       'Limit contacts, jumps and plyometric volume; offer isometric or med-ball power work instead where needed.'],
   deger:{kind:'contacts',ph:['toplam temas, ör. 30','total contacts, e.g. 30']}},
  {id:'speed',label:['Hız Sınırı','Speed limit'],
   what:['Sprint, yüksek hızlı koşu veya hareket hızını sınırlar.','Caps sprinting, high-speed running or movement velocity.'],
   ex:['"%70 hızın üzerinde yok" · "Max velocity yok" · "Yüksek hızlı koşuyu sınırla"','"Nothing above 70% speed" · "No max velocity" · "Limit high-speed running"'],
   ai:['Yüksek hızlı sprint ve maksimum hız maruziyeti sınırlandırılmalı; daha düşük hızda teknik ve kapasite odaklı çalışmalar önerilmeli.',
       'Limit high-speed sprinting and max-velocity exposure; work on technique and capacity at lower speeds instead.']},
  {id:'rom',label:['Hareket Açıklığı Sınırı','Range-of-motion limit'],
   what:['Belirli eklemlerde kullanılabilecek hareket açıklığını (ROM) sınırlar.','Caps the range of motion available at a joint.'],
   ex:['"Derin squat yok" · "90° diz fleksiyonu ile sınırla" · "Ağrısız ROM kullan"','"No deep squat" · "Stop at 90° knee flexion" · "Pain-free range only"'],
   ai:['Belirtilen ROM sınırına uygun egzersiz ve varyasyonlar seçilmeli; hareket açıklığı ağrı oluşturmayacak şekilde kontrollü tutulmalı.',
       'Choose exercises that fit the stated range; keep the range controlled and pain-free.']},
  {id:'direction',label:['Yön / Hareket Kısıtı','Direction / pattern limit'],
   what:['Belirli hareket yönlerini veya paternleri kısıtlar.','Rules out certain directions or movement patterns.'],
   ex:['"Lateral hareket yok" · "Rotasyon yok" · "COD yok" · "Sadece sagittal düzlem"','"No lateral work" · "No rotation" · "No COD" · "Sagittal plane only"'],
   ai:['Belirtilen hareket yönlerini içeren egzersizlerden kaçınılmalı; izin verilen düzlemde benzer uyarıcı sağlayan alternatifler önerilmeli.',
       'Avoid exercises in the named directions; find the same stimulus in a plane that is allowed.']},
  {id:'region',label:['Bölgesel Kısıt','Regional limit'],
   what:['Belirli bir vücut bölgesine yüklemeyi sınırlar.','Limits loading of one body region.'],
   ex:['"Sadece üst vücut" · "Bel/dize yük bindirme" · "Sağ bacak hacmini azalt"','"Upper body only" · "Nothing loading the low back or knee" · "Less volume on the right leg"'],
   ai:['Belirtilen bölgeye yük bindiren egzersizler sınırlandırılmalı veya tamamen çıkarılmalı; çalışma alternatif bölgelere kaydırılmalı.',
       'Cut back or drop the exercises that load that region and move the work elsewhere.']},
  {id:'contact',label:['Temas Yok','No contact'],
   what:['Fiziksel temas içeren aktiviteler kullanılmamalıdır.','No activity involving physical contact.'],
   ex:['"Temas içeren egzersiz yok" · "İkili mücadele yok" · "Takım teması yok"','"No contact drills" · "No one-on-one duels" · "No team contact"'],
   ai:['Temas riski taşıyan bütün egzersizlerden kaçınılmalı; bireysel ve temassız alternatifler önerilmeli.',
       'Avoid every exercise carrying contact risk; prescribe individual, non-contact alternatives.']},
  {id:'unilateral',label:['Tek Taraflı Çalışma','Unilateral work'],
   what:['Egzersizler tek taraflı (unilateral) olmalıdır.','The work should be unilateral.'],
   ex:['"Sadece unilateral egzersizler" · "Tek bacak odaklı çalış"','"Unilateral only" · "Single-leg focus"'],
   ai:['Bilateral varyasyonlar yerine unilateral olanlar seçilmeli; gerekirse denge ve stabilite çalışmaları eklenmeli.',
       'Choose unilateral variations over bilateral ones, adding balance and stability work where it fits.']},
  {id:'other',label:['Diğer','Other'],
   what:['Yukarıdakiler dışında özel bir kısıt.','Any constraint the list above does not cover.'],
   ex:['"Spesifik teknik kısıt" · "Belirli bir egzersiz varyasyonu" · "Koç talimatı"','"A specific technical limit" · "One particular variation" · "A coaching instruction"'],
   ai:['Girilen talimat bağlama uygun şekilde yorumlanmalı ve programa işlenmeli; talimat belirsizse program bu belirsizliği koç uyarısında söylemeli.',
       'Read the instruction in context and build it in; if it is ambiguous, say so in the coach warning rather than guessing.']},
];
const diConRow=id=>DI_CONSTRAINT_TYPES.find(c=>c.id===id)||null;

/* ---- The brief, normalised ------------------------------------------------
   Every field is optional and an empty one is not a constraint — the note under the
   form says so, and this is where it is true. Duration and the exercise ceiling fall
   back to the source session's own length and the same minutes-per-exercise rule the
   module has always used, so a coach who fills in nothing still gets a session that
   fits the slot on the calendar. */
const DI_DUR_CHOICES=[30,45,60,75,90];
const DI_EX_CHOICES=[4,6,8,10];
function diInstr(raw,src){
  const r=raw||{};
  const list=v=>(Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(Boolean);
  const dur=recNum(r.duration)!=null?recNum(r.duration):recNum(src&&src.duration);
  const max=recNum(r.maxExercises)!=null?recNum(r.maxExercises)
    :(dur?Math.max(3,Math.min(10,Math.round(dur/DI_MIN_PER_EX))):null);
  /* WHO PUT THE NUMBER THERE MATTERS, and it was not knowable from the number.
     The two boxes above fall back to the source session's own length when the coach
     leaves them blank, and the form then SAVES the normalised brief — so a derived
     60 came back on the next read looking exactly like a 60 somebody typed. That is
     fine while both are advice; it is not fine now that a coach-set ceiling fails
     the session outright. A blunt heuristic ("about six minutes an exercise") must
     never block a save, and an instruction must.

     So the form states it, and a brief that predates this field is read as NOT
     coach-set: the ceiling stays a warning until the coach next touches the box,
     which is the safe direction to be wrong in. */
  const durSet=r.durationSet!=null?!!r.durationSet:false;
  const maxSet=r.maxExercisesSet!=null?!!r.maxExercisesSet:false;
  const cons=list(r.constraints).filter(id=>diConRow(id));
  /* A constraint used to be a TYPE and nothing else: "load limit" with no limit in it.
     That is why rule 22 sat in the prompt-only pile — "no exercise may exceed the
     stated load" cannot be checked when nothing states the load. The value is
     optional and a blank one changes nothing: the constraint still goes to the model
     as prose, exactly as it always did. A filled one becomes a number code can hold
     the session to. Old stored briefs have no `constraintValues` at all and read
     exactly as they did before. */
  const cv={};
  const rawVals=(r.constraintValues&&typeof r.constraintValues==='object')?r.constraintValues:{};
  cons.forEach(id=>{
    const row=diConRow(id);
    if(!row||!row.deger)return;
    const v=String(rawVals[id]==null?'':rawVals[id]).trim();
    if(v)cv[id]=v;
  });
  return{
    priorities:list(r.priorities).filter(id=>diPrioRow(id)),
    must:list(r.must),avoid:list(r.avoid),
    constraints:cons,
    constraintValues:cv,
    constraintNote:String(r.constraintNote||'').trim(),
    duration:dur,maxExercises:max,
    /* Carried through normalisation so a re-read of a stored brief still knows which
       of the two numbers is an instruction and which is a fallback. */
    durationSet:durSet,maxExercisesSet:maxSet,
    /* Kept as typed. The box writes through this on every keystroke and reads the
       result back: trimming here took the space off the end of "word " the moment it
       was typed, and the box, seeing a different value come back, jumped the caret. */
    notes:String(r.notes||''),
  };
}
/* The brief as the sheet reads it. "Ek kısıtlar" is no longer on the form, so a
   constraint left on an older stored brief is not carried: nothing the coach can no
   longer see or clear may still steer the JSON or fail the check. The engine keeps
   reading constraints for any caller that passes them on purpose. */
const diBrief=(raw,src)=>({...diInstr(raw,src),constraints:[],constraintValues:{},constraintNote:''});
/* A constraint value the coach typed, as a number a check can use. Deliberately
   forgiving about how it is written ("%60", "60 %", "RPE 7", "40kg", "12") and
   deliberately unforgiving about what it means: a figure whose unit cannot be told
   apart is returned as unreadable rather than assumed to be whichever unit would
   make the check pass. */
function diConValue(kind,txt){
  const s=String(txt||'').trim();
  if(!s)return null;
  const num=v=>{const m=String(v).match(/-?\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):null;};
  const n=num(s);
  if(n==null)return{unit:null,value:null,raw:s,readable:false};
  if(kind==='load'){
    if(/rpe/i.test(s))return{unit:'rpe',value:n,raw:s,readable:true};
    if(/rir/i.test(s))return{unit:'rir',value:n,raw:s,readable:true};
    if(/%|1rm|yuzde|yüzde/i.test(s))return{unit:'pct1rm',value:n,raw:s,readable:true};
    if(/kg/i.test(s))return{unit:'kg',value:n,raw:s,readable:true};
    /* A bare number in a load box is ambiguous — 7 could be RPE and 70 could be a
       percentage. The app does not guess; the prompt still carries the coach's words. */
    return{unit:null,value:n,raw:s,readable:false};
  }
  return{unit:kind,value:n,raw:s,readable:true};
}
/* Whether the coach has actually said anything. Used only to tell an untouched form
   from a deliberately empty one on screen. */
const diInstrFilled=i=>!!(i&&(i.priorities.length||i.must.length||i.avoid.length
  ||i.constraints.length||i.constraintNote||String(i.notes||'').trim()));

/* ---- The coach's own words on the test sheet ------------------------------
   The battery is not only numbers. The posture box, the overhead-squat box and the
   five compensation slots beside it are where the coach writes what they SAW, and a
   session that ignores them is a session written with its eyes shut. Two things
   happen with that text:

   · it is shipped verbatim to the model (`test_gozlemleri` in the request), because a
     note reads better whole than as a keyword, and
   · the compensations a coach writes most often are matched here, so each one becomes
     a finding with the kind of work it calls for — the same shape the measured
     findings have, checked the same way.

   The table is a floor, not a ceiling: a note that matches nothing still reaches the
   model whole, and the prompt asks for it to be answered. */
const DI_OBS_RULES=[
  {id:'obs_thoracic',oncelik:'yüksek',
   kw:['torakal','thoracic','kifoz','kyphos','yuvarlak omuz','round shoulder','rounded shoulder','üst sırt','ust sirt','t spine','tspine'],
   area:['Torakal omurga','Thoracic spine'],
   work:['Torakal ekstansiyon ve rotasyon mobilitesi, skapular kontrol',
         'Thoracic extension and rotation mobility, scapular control'],
   cover:['torakal','thoracic','t spine','tspine','ekstansiyon mobilite','foam roll','skapula','scapula','open book','kedi deve','cat cow']},
  {id:'obs_valgus',oncelik:'yüksek',
   kw:['valgus','diz içe','diz ice','dizler içe','knee cave','knees in','medial kollaps','medial collapse'],
   area:['Diz / kalça kontrolü','Knee / hip control'],
   work:['Kalça abdüktör ve dış rotatör kuvveti, iniş mekaniği, tek bacak kontrol',
         'Hip abductor and external-rotator strength, landing mechanics, single-leg control'],
   cover:['abdüktör','abduktor','abduct','gluteus','glute med','dış rotat','dis rotat','external rotat','band walk','monster walk','iniş','inis','landing','tek bacak','single leg','lateral band']},
  {id:'obs_heel',oncelik:'yüksek',
   kw:['topuk kalk','topuk yüksel','topuk yuksel','heel rise','heels lift','heel lift','topukları kalk'],
   area:['Ayak bileği','Ankle'],
   work:['Ayak bileği dorsifleksiyon mobilitesi ve yüklü mobilizasyon',
         'Ankle dorsiflexion mobility and loaded mobilisation'],
   cover:['ayak bile','ankle','dorsifleks','dorsiflex','soleus','gastro','calf']},
  {id:'obs_lean',oncelik:'orta',
   kw:['öne eğil','one egil','gövde öne','govde one','forward lean','torso lean','excessive lean','öne yaslan'],
   area:['Gövde / kalça','Torso / hip'],
   work:['Kalça ve ayak bileği mobilitesi + gövde diklik kontrolü (karşı ağırlıklı çömelme progresyonu)',
         'Hip and ankle mobility plus upright-torso control (a counterbalanced squat progression)'],
   cover:['goblet','counterbalance','karşı ağırlık','karsi agirlik','kalça mobilite','hip mobility','ayak bile','ankle','gövde diklik','govde diklik','front rack']},
  {id:'obs_apt',oncelik:'yüksek',
   kw:['lordoz','lordosis','anterior pelvik','anterior pelvic','apt','bel çukur','bel cukur','pelvis öne','pelvis one'],
   area:['Lumbopelvik kontrol','Lumbopelvic control'],
   work:['Anterior core kontrolü, kalça fleksör esnekliği, posterior tilt kontrolü',
         'Anterior core control, hip-flexor length, posterior-tilt control'],
   cover:['core','dead bug','deadbug','anti ekstansiyon','anti-ekstansiyon','anti extension','kalça fleksör','kalca fleksor','hip flexor','posterior tilt','plank','glute bridge','kalça köprü','kalca kopru']},
  {id:'obs_buttwink',oncelik:'yüksek',
   kw:['butt wink','bel yuvarlan','lomber fleksiyon','lumbar flexion','posterior tilt','kuyruk sokumu'],
   area:['Kalça / lomber','Hip / lumbar'],
   work:['Kalça fleksiyon mobilitesi ve lomber nötr kontrol; derinlik kademeli artırılır',
         'Hip flexion mobility and neutral-lumbar control; depth progressed gradually'],
   cover:['kalça mobilite','kalca mobilite','hip mobility','90 90','nötr omurga','notr omurga','neutral spine','core','kutu squat','box squat','derinlik']},
  {id:'obs_shift',oncelik:'yüksek',
   kw:['kayma','shift','ağırlık kay','agirlik kay','ağırlık aktar','agirlik aktar','weight shift',
     'asimetrik çömel','asimetrik comel','tek tarafa yükle'],
   area:['Asimetri','Asymmetry'],
   work:['Tek taraflı kuvvet ve kontrol, zayıf tarafa öncelik ve ek set',
         'Unilateral strength and control, the weaker side first and with an extra set'],
   cover:['tek taraflı','tek tarafli','unilateral','tek bacak','single leg','split squat','step up','bulgarian','zayıf taraf','zayif taraf']},
  {id:'obs_scap',oncelik:'orta',
   kw:['skapula','scapula','kanatlan','winging','kürek kemiği','kurek kemigi','serratus'],
   area:['Skapula / omuz','Scapula / shoulder'],
   work:['Skapular kontrol; serratus ve alt trapez kuvveti',
         'Scapular control; serratus and lower-trapezius strength'],
   cover:['skapula','scapula','serratus','trapez','trapezius','y raise','face pull','wall slide','duvar kaydırma','duvar kaydirma','protraksiyon']},
  {id:'obs_arms',oncelik:'orta',
   kw:['kol öne','kol one','kollar öne','kollar one','arms fall','arm fall','bar öne','bar one','overhead pozisyon'],
   area:['Latissimus / torakal','Lat / thoracic'],
   work:['Latissimus ve torakal mobilite, overhead pozisyon kontrolü',
         'Latissimus and thoracic mobility, overhead position control'],
   cover:['lat','latissimus','overhead','torakal','thoracic','wall slide','duvar kaydırma','duvar kaydirma','omuz mobilite','shoulder mobility']},
  {id:'obs_foot',oncelik:'orta',
   kw:['pronasyon','pronation','düz taban','duz taban','pes planus','ayak içe','ayak ice','flat foot','çökük ayak'],
   area:['Ayak','Foot'],
   work:['Ayak içi kas kontrolü ve ayak bileği stabilitesi (short foot, tek bacak denge)',
         'Intrinsic foot control and ankle stability (short foot, single-leg balance)'],
   cover:['short foot','ayak içi','ayak ici','intrinsic','tek bacak denge','single leg balance','ayak bileği stabil','ankle stability','kavis']},
  {id:'obs_asym_shoulder',oncelik:'orta',
   kw:['omuz asimetri','omuz yüksek','omuz yuksek','omuz düşük','omuz dusuk','shoulder drop',
     'shoulder asymmetry','omuz seviye','shoulder height','yan eğim','lateral tilt','kalça yüksek','kalca yuksek'],
   area:['Postür asimetrisi','Postural asymmetry'],
   work:['Asimetriye yönelik tek taraflı mobilite ve kuvvet çalışması',
         'Unilateral mobility and strength work aimed at the asymmetry'],
   cover:['tek taraflı','tek tarafli','unilateral','asimetri','asymmetry','yan','lateral','side plank','yan plank','carry']},
  {id:'obs_head',oncelik:'düşük',
   kw:['baş öne','bas one','forward head','boyun öne','boyun one','neck forward'],
   area:['Servikal / üst sırt','Cervical / upper back'],
   work:['Derin boyun fleksör kontrolü ve torakal ekstansiyon',
         'Deep neck-flexor control and thoracic extension'],
   cover:['boyun','neck','chin tuck','torakal','thoracic','derin fleksör','derin fleksor']},
];
/* Every free-text box on the test sheet, as one blob and as named sources. The blob is
   what the rules are matched against; the sources are what the model is shown, so a
   note is read the way the coach wrote it rather than as a list of matched words. */
function diObservations(t){
  if(!t)return{sources:[],blob:''};
  const pick=(label,value)=>{
    const v=String(value==null?'':value).trim();
    return v?{alan:L(label[0],label[1]),metin:v}:null;
  };
  const problems=((t.ohs&&t.ohs.problems)||[]).filter(x=>String(x||'').trim());
  const sources=[
    pick(['Postür gözlemi','Posture observation'],t.posture&&t.posture.observations),
    pick(['Overhead squat gözlemi','Overhead squat observation'],t.ohs&&t.ohs.observations),
    problems.length?{alan:L('Overhead squat kompensasyonları','Overhead squat compensations'),
      metin:problems.join(' · ')}:null,
    pick(['FMS gözlemi','FMS observation'],t.fms&&t.fms.observations),
    pick(['Test notu','Test note'],t.notes),
  ].filter(Boolean);
  return{sources,blob:sources.map(s=>s.metin).join(' · ')};
}
/* The rules, matched against what the coach wrote. A rule fires once however many of
   its words appear, and carries its own coverage keywords so "this observation was
   answered" is checked on the work it asks for, not on the words of the note. */
const diObsHit=(hay,kw)=>diExName(kw).split(' ').filter(Boolean).every(w=>hay.includes(w));
function diObsFindings(blob){
  const hay=diExName(blob||'');
  if(!hay)return[];
  return DI_OBS_RULES.filter(r=>r.kw.some(k=>diObsHit(hay,k))).map(r=>({
    id:r.id,bolge:L(r.area[0],r.area[1]),
    bulgu:L(`Gözlem notu: ${r.kw.find(k=>diObsHit(hay,k))}`,
      `Observation: ${r.kw.find(k=>diObsHit(hay,k))}`),
    gereken_calisma:L(r.work[0],r.work[1]),
    oncelik:r.oncelik,olcum:null,kaynak:'gözlem',kw:r.cover,
  }));
}

/* ---- What the screen says is missing (the test battery, read by code) -------
   "Look at the test results" cannot be left to a sentence in a prompt: a model that
   is handed twenty raw numbers will quote the two it likes. So the battery is READ
   here, against the thresholds the app already uses elsewhere (the Program Writer's
   screening cut-offs, the test sheet's return-to-sport note, the comparison table's
   10% bilateral rule), and what comes out is a list of findings with the KIND of work
   each one calls for. The session is then checked against that list.

   `work` is deliberately a quality, never an exercise: which exercise serves it is the
   answer's job and depends on the equipment, the athlete and the day. */
const DI_DEFICIT_KW={
  ankle_df:['ayak bile','ankle','dorsifleks','dorsiflex','soleus','gastro'],
  ankle_asym:['ayak bile','ankle','dorsifleks','dorsiflex'],
  aslr:['aslr','düz bacak','duz bacak','straight leg','hamstring','kalça fleks','hip flex'],
  ohs:['overhead','ohs','squat pattern','çömelme paterni'],
  ohs_comp:['overhead','ohs','valgus','kompensasyon','compensation'],
  thoracic:['torakal','thoracic','t-spine','tspine','skapula','scapula','üst sırt','ust sirt'],
  ybalance:['tek bacak','single leg','single-leg','denge','balance','y balance'],
  asym:['tek taraflı','tek tarafli','unilateral','tek bacak','single leg','single-leg'],
  rsi:['pliometr','plyo','sıçrama','sicrama','jump','iniş','inis','landing','hop'],
};
const DI_ASYM_PCT=10;        // bilateral difference the comparison table already flags
const DI_YB_DIFF=4;          // cm per-direction Y Balance difference, from the test sheet
function diDeficits(ath,ref){
  const tests=[...(ath.tests||[])].filter(t=>t.date&&(!ref||t.date<=ref))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const t=tests[tests.length-1]||null;
  if(!t)return{test_date:null,measured:0,findings:[],
    note:L('Kayıtlı test yok — eksik analizi yapılamadı.','No test on record — nothing to read.')};
  const n=recNum;
  const out=[];
  const add=(id,area,finding,work,priority,value)=>out.push({id,kaynak:'ölçüm',
    bolge:L(area[0],area[1]),bulgu:L(finding[0],finding[1]),
    gereken_calisma:L(work[0],work[1]),oncelik:priority,olcum:value==null?null:value,
    /* What an exercise has to SAY for this finding to count as answered. Kept per
       finding rather than derived from its wording: the words of a description are
       too easy to hit by accident. */
    kw:DI_DEFICIT_KW[id]||[]});
  /* Ankle dorsiflexion: the app reads 35° as the pass mark and 30° as a failure. */
  const dfR=n(t.ankleDF&&t.ankleDF.right),dfL=n(t.ankleDF&&t.ankleDF.left);
  const df=[dfR,dfL].filter(x=>x!=null);
  if(df.length){
    const low=Math.min(...df);
    const side=dfR!=null&&dfL!=null?(dfR<dfL?L('sağ','right'):L('sol','left')):null;
    if(low<35)add('ankle_df',['Ayak bileği','Ankle'],
      [`Dorsifleksiyon ${low}°${side?` (${side} taraf)`:''} — eşik 35°`,
       `Dorsiflexion ${low}°${side?` (${side} side)`:''} against a 35° threshold`],
      ['Ayak bileği dorsifleksiyon mobilitesi (yüklü mobilizasyon, soleus/gastroknemius)',
       'Ankle dorsiflexion mobility (loaded mobilisation, soleus/gastrocnemius)'],
      low<30?'yüksek':'orta',low);
    if(dfR!=null&&dfL!=null&&Math.abs(dfR-dfL)>=5)add('ankle_asym',['Ayak bileği','Ankle'],
      [`Sağ/sol dorsifleksiyon farkı ${Math.abs(dfR-dfL)}°`,`${Math.abs(dfR-dfL)}° side-to-side dorsiflexion difference`],
      ['Zayıf tarafa ek mobilite ve tek taraflı yüklenme','Extra mobility and unilateral loading on the limited side'],
      'orta',Math.abs(dfR-dfL));
  }
  /* ASLR and the overhead squat: the FMS 0-3 scores the app already stores. */
  const aslr=[n(t.aslr&&t.aslr.right),n(t.aslr&&t.aslr.left)].filter(x=>x!=null);
  if(aslr.length&&Math.min(...aslr)<=1)add('aslr',['Kalça / hamstring','Hip / hamstring'],
    [`ASLR ${Math.min(...aslr)}/3`,`ASLR ${Math.min(...aslr)}/3`],
    ['Kalça fleksiyon açıklığı ve posterior zincir esnekliği, aktif düz bacak kaldırma progresyonu',
     'Hip flexion range and posterior-chain flexibility, an active straight-leg-raise progression'],
    'yüksek',Math.min(...aslr));
  const ohs=n(t.ohs&&t.ohs.score);
  const ohsProblems=((t.ohs&&t.ohs.problems)||[]).filter(Boolean);
  if(ohs!=null&&ohs<=1)add('ohs',['Bütünsel hareket','Whole-body movement'],
    [`Overhead squat ${ohs}/3${ohsProblems.length?` — ${ohsProblems.join('; ')}`:''}`,
     `Overhead squat ${ohs}/3${ohsProblems.length?` — ${ohsProblems.join('; ')}`:''}`],
    ['Kompensasyon paternine göre mobilite + motor kontrol; yük eklemeden önce teknik',
     'Mobility plus motor control for the compensation seen; technique before load'],
    'yüksek',ohs);
  else if(ohsProblems.length)add('ohs_comp',['Bütünsel hareket','Whole-body movement'],
    [`Overhead squat kompensasyonları: ${ohsProblems.join('; ')}`,
     `Overhead squat compensations: ${ohsProblems.join('; ')}`],
    ['Gözlenen kompensasyona yönelik düzeltici çalışma','Corrective work for the compensation seen'],
    'orta',null);
  /* Shoulder mobility on the FMS is the app's closest reading of thoracic extension;
     a posture note naming the thoracic spine counts for the same finding. */
  const sm=[n(t.fms&&t.fms.shoulderMobility&&t.fms.shoulderMobility.right),
    n(t.fms&&t.fms.shoulderMobility&&t.fms.shoulderMobility.left)].filter(x=>x!=null);

  if(sm.length&&Math.min(...sm)<=1)
    add('thoracic',['Torakal omurga / omuz','Thoracic spine / shoulder'],
      [`Omuz mobilitesi ${Math.min(...sm)}/3`,`Shoulder mobility ${Math.min(...sm)}/3`],
      ['Torakal ekstansiyon ve rotasyon mobilitesi, skapular kontrol',
       'Thoracic extension and rotation mobility, scapular control'],
      'yüksek',Math.min(...sm));
  /* Y Balance: the per-direction reach difference the test sheet flags at 4 cm. */
  const yb=ybCalc(t.yBalance)||{};
  const ybd=[yb.dAnt,yb.dPm,yb.dPl].filter(x=>x!=null);
  if(ybd.length&&Math.max(...ybd)>=DI_YB_DIFF)add('ybalance',['Tek bacak kontrol','Single-leg control'],
    [`Y Balance yön farkı ${Math.max(...ybd)} cm (eşik ${DI_YB_DIFF} cm)`,
     `${Math.max(...ybd)} cm Y Balance reach difference (threshold ${DI_YB_DIFF} cm)`],
    ['Tek bacak denge ve kalça/diz stabilitesi, zayıf tarafa ek set',
     'Single-leg balance and hip/knee stability, an extra set on the weaker side'],
    'orta',Math.max(...ybd));
  /* Bilateral difference across the measures the comparison table already reads. */
  const pairs=[caAsym(t.lateralCmj&&t.lateralCmj.right,t.lateralCmj&&t.lateralCmj.left),
    caAsym(t.circ&&t.circ.thighRight,t.circ&&t.circ.thighLeft),
    caAsym(t.circ&&t.circ.calfRight,t.circ&&t.circ.calfLeft)].filter(Boolean);
  const asym=pairs.length?Math.max(...pairs.map(p=>p.pct)):null;
  if(asym!=null&&asym>=DI_ASYM_PCT)add('asym',['Bilateral fark','Bilateral difference'],
    [`Sağ/sol fark %${asym.toFixed?asym.toFixed(0):asym} (eşik %${DI_ASYM_PCT})`,
     `${asym.toFixed?asym.toFixed(0):asym}% side-to-side difference (threshold ${DI_ASYM_PCT}%)`],
    ['Tek taraflı kuvvet çalışması, zayıf tarafa öncelik','Unilateral strength work, the weaker side first'],
    'orta',asym);
  /* Reactive strength: a drop-jump RSI under 1.5 is the usual floor for reactive work
     in a jumping sport; reported as a finding, not as a verdict on the athlete. */
  const rsi=n(t.dropJump);
  if(rsi!=null&&rsi<1.5)add('rsi',['Reaktif kuvvet','Reactive strength'],
    [`Drop jump RSI ${rsi}`,`Drop jump RSI ${rsi}`],
    ['Kısa temas süreli pliometrik ve iniş mekaniği (ağrı/RTP izin veriyorsa)',
     'Short-contact plyometrics and landing mechanics (where pain and RTP allow)'],
    'düşük',rsi);
  /* What the coach wrote on the sheet, read the same way. Where a note says what a
     number already said (a thoracic note beside a 1/3 shoulder-mobility score), the
     measured finding stands and the note is not listed twice. */
  const obs=diObservations(t);
  const seen=new Set(out.map(f=>f.id));
  const fromNotes=diObsFindings(obs.blob).filter(f=>{
    if(f.id==='obs_thoracic'&&seen.has('thoracic'))return false;
    if(f.id==='obs_heel'&&seen.has('ankle_df'))return false;
    if(f.id==='obs_shift'&&seen.has('asym'))return false;
    return !seen.has(f.id);
  });
  const all=[...out,...fromNotes];
  const order={'yüksek':0,'orta':1,'düşük':2};
  all.sort((a,b)=>order[a.oncelik]-order[b.oncelik]);
  return{test_date:t.date,measured:out.length,from_notes:fromNotes.length,
    findings:all,observations:obs.sources};
}

/* ---- Patterns today's pain takes off the table ----------------------------
   The daily layer has always REDUCED work on a painful region. A region reported at
   moderate severity or worse is different: the movement patterns that load it are out
   of the session entirely, and the check below treats a breach as an error rather than
   a note. The regions and their patterns come from PAIN_RULES — the same table the
   rest of the app reads — so "knee at 3/5 means no knee-dominant work" is one rule
   here, not a special case. */
const DI_PAIN_BLOCK=3;   // severity 0-5; the check-in's 0-3 grid maps 1/2/3 to 2/3/5
function diBlockedPatterns(bundle){
  const out=[];
  ((bundle&&bundle.pain&&bundle.pain.regions)||[]).forEach(r=>{
    const sev=r.severity_0_5;
    /* Two ways a region closes its patterns: pain reported at or over the threshold
       this morning, or a standing constraint the coach ticked on the athlete's card.
       The second one has no severity to compare — it is a statement, not a reading. */
    if(!r.standing&&(sev==null||sev<DI_PAIN_BLOCK))return;
    out.push({bolge:r.label,siddet_0_5:sev,
      kaynak:r.standing?'koç kısıt etiketi':'check-in ağrı bildirimi',
      kalici:!!r.standing,
      yasak_paternler:r.loads_patterns||[],
      yonlendirilecek_paternler:r.redirect_patterns||[]});
  });
  return out;
}
/* The explicit avoid-list: what the coach wrote on the injury record, plus what they
   ruled out in today's brief. Both are restrictions in the spec's sense — they block
   an exercise outright, whatever the readiness, the tier or the model's reasoning. */
function diRestrictions(bundle,instr){
  const out=[];
  ((bundle&&bundle.injury&&bundle.injury.active)||[]).forEach(inj=>{
    const txt=String(inj.restrictions||'').trim();
    if(!txt)return;
    out.push({kaynak:'sakatlık kaydı',
      bolge:inj.region||null,rtp:inj.rtp_stage?L(inj.rtp_stage[0],inj.rtp_stage[1]):null,
      metin:txt,terimler:diRestrictionTerms(txt)});
  });
  ((instr&&instr.avoid)||[]).forEach(av=>{
    const t=String(av||'').trim();
    if(!t)return;
    out.push({kaynak:'antrenör talimatı',bolge:null,rtp:null,metin:t,terimler:diRestrictionTerms(t)});
  });
  return out;
}
/* A restriction is prose ("derin squat yok", "nothing loaded overhead"). What can be
   matched honestly is its content words. Two rules keep this from firing on nothing:
   a term must be at least four letters, and it must appear in the exercise name as a
   WHOLE word. So "squat" catches "Goblet Squat" (which is the case the prompt itself
   names) and "bar" catches nothing at all — a three-letter fragment shared by half a
   gym is not evidence, and this list is a hard block, so a false positive costs the
   coach a session they cannot save. */
const DI_STOP=new Set(['ve','ile','veya','için','yok','yapma','yapmasın','olmasın','yapılmasın',
  'kullanma','kullanılmasın','not','avoid','any','the','and','or','with','without','from','only',
  'sadece','ama','bir','bu','şu','çok','daha','ise','gibi','olan','hiç','asla','never','should',
  'must','exercise','egzersiz','hareket','movement']);
const DI_TERM_MIN=4;
function diRestrictionTerms(txt){
  return[...new Set(diExName(txt).split(' ')
    .filter(w=>w.length>=DI_TERM_MIN&&!DI_STOP.has(w)))];
}
/* Which of a restriction's terms an exercise name carries, plus the whole-phrase read
   the module has always done (either string containing the other). Returns what
   matched, so the violation says WHY rather than only that it fired. */
function diRestrictionHits(name,restriction){
  const hay=diExName(name);
  if(!hay)return[];
  const words=new Set(hay.split(' '));
  const hits=(restriction.terimler||[]).filter(t=>words.has(t));
  const whole=diExName(restriction.metin||'');
  if(whole&&(hay.includes(whole)||whole.includes(hay))&&!hits.includes(whole))hits.push(whole);
  return hits;
}
const diBlockedSet=blocked=>{
  const s=new Set();
  (blocked||[]).forEach(b=>(b.yasak_paternler||[]).forEach(p=>s.add(p)));
  return s;
};


/* The request. Everything computed is already decided; the brief is the coach's; the
   equipment is the gym's. The answer's only job is the session itself. */
/* The coach's brief as the model reads it — one shape, used by the request the job
   sends and by the "Sporcu Bilgilerini Al" export, so what the coach copies out is
   exactly what the programme writer would have been told. */
function diBriefForAI(i){
  return{
    priorities:i.priorities.map(diPrioLabel),
    must_include:i.must,
    avoid:i.avoid,
    constraints:i.constraints.map(id=>{const c=diConRow(id);
      const raw=(i.constraintValues||{})[id]||null;
      const v=c.deger?diConValue(c.deger.kind,raw):null;
      return{constraint:L(c.label[0],c.label[1]),what_it_is:L(c.what[0],c.what[1]),
        programming_behaviour:L(c.ai[0],c.ai[1]),
        /* A bounded constraint says its bound. Where the coach filled the box AND
           the unit is unambiguous, it is also a hard check — the answer is told so
           here, because a limit that will reject the session is a limit worth
           writing to rather than discovering afterwards. */
        limit:raw,
        limit_checked_by_code:!!(v&&v.readable),
        limit_unit:v&&v.readable?v.unit:null};}),
    constraint_details:i.constraintNote||null,
    session_duration_min:i.duration,
    /* The ceiling binds the WHOLE session: preparation, main and complementary rows
       all count, so the number the coach picks is the number the athlete sees. */
    session_max_exercises:i.maxExercises,
    additional_notes:String(i.notes||'').trim()||null,
  };
}
/* Extraction and validation. Rebuilt field by field rather than handed back as it
   arrived: anything the schema has no place for — an injury-risk figure, a confidence
   rating, a readiness score of its own — never leaves this function. */
function diParseProgram(text){
  let s=(text||'').trim();
  const fence=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(fence)s=fence[1].trim();
  const a=s.indexOf('{');
  if(a===-1)throw new Error(L('Model yanıtında JSON bulunamadı — tekrar dene.','No JSON in the model reply — try again.'));
  const body=s.slice(a);
  const b=body.lastIndexOf('}');
  let obj=null,cut=false;
  if(b>0){try{obj=JSON.parse(body.slice(0,b+1));}catch(e){}}
  if(!obj){const rep=pdaRepair(body);if(rep){try{obj=JSON.parse(rep);cut=true;}catch(e){}}}
  if(!obj)throw new Error(L('Model geçersiz JSON döndürdü — tekrar dene.','The model returned invalid JSON — try again.'));
  const t=v=>{const x=String(v==null?'':v).trim();return x&&x!=='null'?x:null;};
  const prog=(obj.program&&typeof obj.program==='object')?obj.program:{};
  const blocks=(Array.isArray(prog.bloklar)?prog.bloklar:[])
    .filter(x=>x&&typeof x==='object')
    .map((bl,bi)=>({
      key:`ai:${bi}`,
      name:t(bl.ad)||'',
      phase:(()=>{const p=String(bl.faz||'').trim().toLowerCase();
        return ['hazirlik','ana','tamamlayici'].includes(p)?p:null;})(),
      exercises:(Array.isArray(bl.egzersizler)?bl.egzersizler:[])
        .filter(e=>e&&typeof e==='object'&&t(e.ad))
        .map((e,ei)=>({
          key:`ai:${bi}:${ei}`,
          phase:(()=>{const p=String(bl.faz||'').trim().toLowerCase();
            return ['hazirlik','ana','tamamlayici'].includes(p)?p:null;})(),
          name:t(e.ad),
          source:String(e.kaynak||'').toLowerCase()==='library'?'library':'custom',
          sets:t(e.set),reps:t(e.tekrar),duration:t(e.sure),distance:t(e.mesafe),
          load:t(e.yuk),tempo:t(e.tempo),rest:t(e.dinlenme),rpe:t(e.rpe),
          equipment:t(e.ekipman),
          pattern:(()=>{const p=t(e.hareket_paterni);return p&&IV_PATTERNS.includes(p)?p:(p||'');})(),
          why:t(e.gerekce),
          /* Which of the injected differentiators this exercise answers, by id. Kept
             as ids rather than as prose precisely so it can be checked: a sentence
             about "individual needs" reads like an answer and proves nothing, an id
             either matches a line the code computed or it does not. Ids the request
             never carried are dropped here rather than trusted. */
          basis:(()=>{
            const raw=Array.isArray(e.dayanak)?e.dayanak:(e.dayanak?[e.dayanak]:[]);
            return[...new Set(raw.map(v=>String(v==null?'':v).trim().toUpperCase())
              .filter(v=>/^D\d+$/.test(v)))];
          })(),
        })),
    }))
    .filter(bl=>bl.exercises.length);
  const out={
    session_name:t(prog.seans_adi),
    blocks,
    summary:t(obj.durum_ozeti),
    priorities:(Array.isArray(obj.antrenman_onceligi)?obj.antrenman_onceligi:[])
      .filter(x=>x&&typeof x==='object'&&t(x.oncelik))
      .map(x=>({oncelik:t(x.oncelik),gerekce:t(x.gerekce)})),
    respected:(Array.isArray(obj.uyulan_kisitlar)?obj.uyulan_kisitlar:[])
      .map(x=>t(x)).filter(Boolean),
    /* What the brief asked for and the rules would not allow. Kept as its own field
       rather than folded into the warning: a coach needs to see WHICH instruction did
       not survive and WHICH rule stopped it, and the check below reads it to tell a
       declared conflict from an instruction that was simply dropped. */
    conflicts:(Array.isArray(obj.flagged_conflicts)?obj.flagged_conflicts:[])
      .map(x=>{
        if(!x)return null;
        if(typeof x==='string')return{talimat:t(x),alan:null,rule:null,decision:null,alt:null};
        if(typeof x!=='object')return null;
        const o={talimat:t(x.talimat),alan:t(x.alan),rule:t(x.cakisan_kural),
          decision:t(x.karar),alt:t(x.alternatif)};
        return(o.talimat||o.rule)?o:null;
      }).filter(Boolean),
    rationale:t(obj.genel_gerekce),
    warning:t(obj.koc_uyarisi),
    truncated:cut,
  };
  if(!out.blocks.length)
    throw new Error(cut
      ?L('Model yanıtı yarıda kesildi ve tam bir program üretemedi — tekrar dene.','The reply was cut off before a full programme — try again.')
      :L('Yanıtta egzersiz içeren bir program yok — tekrar dene.','No programme with exercises in the reply — try again.'));
  return out;
}

/* ---- A programme written by an outside model, read back in ------------------
   The coach copies "Sporcu Bilgilerini Al" into a model of their choice and pastes
   the answer here. That answer is asked for in the shape below (the export carries
   it as `output_format`), which is the shape the in-app writer answers in — so it
   lands in the same parser, the same validator and the same review card, and reaches
   the calendar the same way: only when the coach approves it.

   A model given a schema still drifts from it — English keys, the blocks at the top
   level instead of under `program`, "Warm-up" for a phase, a number where a string was
   asked for. So the answer is first mapped onto the schema, key by key, and only then
   handed to diParseProgram. Nothing is invented on the way: a field the answer did not
   give stays empty, and an answer with no exercise in it is refused. */
const DI_EXT_SCHEMA={
  status_summary:'1-2 sentences: the athlete\'s state today',
  training_priorities:[{priority:'the main goal of the day',rationale:'which data / which instruction it rests on'}],
  program:{
    session_name:'short title',
    blocks:[{
      name:'block name',
      phase:'preparation | main | complementary',
      exercises:[{
        name:'exercise name',sets:'3',reps:"6 (or '4-6')",duration:'only if needed (e.g. 30 s), otherwise leave empty',
        distance:'only if needed, otherwise leave empty',load:'e.g. 70% 1RM, 60 kg, bodyweight',rpe:"target RPE 1-10 (e.g. '7' or '6-7'); leave empty for mobility / activation",tempo:'only if needed',
        rest:'e.g. 90 s',equipment:"one item of the gym's equipment, or 'bodyweight'",
        movement_pattern:'one of movement_pattern_vocabulary, written exactly as listed',
        rationale:'why this exercise for this athlete — which data / finding / instruction',
        basis:['D1'],
      }],
    }],
  },
  constraints_respected:['which coach instruction was followed, and how'],
  flagged_conflicts:[{instruction:'the instruction that could not be applied',field:'must_include | avoid | constraints | session_duration_min | session_max_exercises',
    rule:'which rule / pain / limit prevented it',decision:'what was done',alternative:'what was written instead'}],
  rationale:'short paragraph: the priority of the day and why these exercises were chosen',
  coach_warning:'one sentence, if there is something the coach should look at',
};
/* The task, in English like everything else in the export: the model is asked to
   write to field names it can read, and the answer comes back in the same language. */
const DI_EXT_TASK=[
  'Write ONE training session for the athlete in this JSON, for the date in session_day.',
  'Reply with ONLY valid JSON in the structure given in output_format. Add no prose; do not rename any key.',
  'coach_brief is binding: must_include is in the session, avoid is not (nor any variation of it), and neither session_duration_min nor session_max_exercises is exceeded (session_max_exercises is the TOTAL number of exercises in the session: preparation, main and complementary phases included). Put any instruction you could not apply in flagged_conflicts, with the reason.',
  'Respect the limits in code_checked_limits. When the programme is loaded into CoachOS these limits are measured by code, and every limit exceeded is shown to the coach as a warning.',
  'Split the session into phases: each block\'s phase is preparation, main or complementary. Write every exercise\'s movement_pattern as one of the values in movement_pattern_vocabulary, exactly as listed (the plyometric contact check reads "Jump / Plyo" by that exact name), and fill in its equipment.',
  'In each exercise\'s basis, list the ids of the differentiators items it answers (e.g. ["D1","D3"]). Do not write an id that is not in the list.',
  'The sets, reps and durations you write go onto the athlete\'s calendar EXACTLY as written; no reduction is applied after loading. code_checked_limits.volume_adjustment_pct is the volume adjustment recommended for this day — the sum of reasons such as readiness, pain and days to the game, each listed with its share in volume_adjustment_reasons. Take it into account yourself when you write the dose.',
  'Do not put more than one exercise from the same movement family (movement_families — e.g. Squat and Lunge / Unilateral are one family) in the main phase. Do not give the athlete the same session again as one in recent_programs. Rely on exercise_library as little as possible: it is only a list of names the coach has on file, not the pool the session is built from. Choose every exercise for what this athlete needs today and write it by its common name — an exercise outside the library is fully accepted. Use a library name only where that exact exercise is clearly the best choice, and then write it exactly as listed.',
  'sport_context says what the game asks of everyone who plays it, athlete.position_emphasis the qualities the position asks for most often: this is context, it does not decide the exercise selection on its own — weigh it with the athlete\'s own data.',
  'Read the test results and the test comments; address measured deficits in the preparation or complementary phase. Where there is pain or an active injury, do not load that region.',
  'Safety comes first: when a coach_brief instruction (must_include included) would load a painful or injured region, or break a hard restriction or code_checked_limits, do not write it — write a safe alternative and record it in flagged_conflicts.',
  'training_profile is the athlete\'s training profile; build the session on it. athletic_profile gives each physical quality\'s development priority for this period (High > Medium > Low): build the emphasis of the day from the High priorities, develop Medium priorities after High, and keep Low-priority and not_rated qualities at a maintenance dose; exercise_exposure shows what the athlete was exposed to, and how much, in the last session and over the last 7-14-28 days (including strength_movement_profile — how the strength work was spread over bilateral / unilateral, movement plane, push / pull action and contraction focus — and the equipment used). constraints.hard are strict rules: no exercise violates them. constraints.soft are preferences: follow them as far as possible.',
  'Aim for a multi-directional, varied programme over the week, not only within this one session, and in EVERY exercise category, not only strength: read exercise_exposure.category_coverage — for each category the athlete has trained (core, plyometric, medicine ball, mobility, upper-body push / pull, speed, hip / knee dominant, full body, stability, balance, corrective, accessory) it lists every facet the library files that category by (movement, direction, exercise type, position, technique, contraction focus, action, implement) with what was done (done) and what was not (not_done_last_7_days, not_done_last_28_days) — and read strength_movement_profile for the movement plane (sagittal / frontal / transverse), push / pull, contraction focus and bilateral / unilateral spread of the strength work. Do not keep writing the same value of a facet (for example anti-extension every time for core, vertical every time for jumps, one implement every time): when a category is in the session, prefer a value of its facets that was not done this week or in the last 28 days, provided it serves this athlete\'s priorities and needs today. Variety is a means, not a goal in itself: do not add exercises only for variety, do not repeat the same movement family twice in the main phase, and safety, constraints and code_checked_limits come first.',
  'Do not invent data; do not decide on anything listed under missing_data, do not diagnose, and do not write an injury-risk percentage.',
  'As the system principles state explicitly, do not invent any deficit or constraint that is not in the dataset: every deficit you address and every constraint you respect must come from this JSON.',
];
/* The same task for a whole squad in one request: one session per athlete, returned
   together, each tagged with the athlete it is for — so the one answer can be pasted
   into every athlete's "AI Programını Yükle" box and each box takes its own. */
const DI_EXT_TASK_SQUAD=[
  'For EVERY athlete in the athletes list, write a SEPARATE training session for the date in session_day. Do not copy athletes onto each other: each programme must rest on that athlete\'s own data, differentiators and coach brief.',
  'Reply with ONLY valid JSON in the structure given in output_format: one item per athlete in the programs array, with athlete_id and athlete_name exactly as they appear in the athletes list. Add no prose; do not rename any key.',
  /* Per-athlete fields are named as such, phrase by phrase, so each sentence still
     reads correctly once rewritten. */
  ...DI_EXT_TASK.slice(2).map(x=>x
    .replace('coach_brief is binding','Each athlete\'s own coach_brief is binding')
    .replace('Respect the limits in code_checked_limits','Respect the limits in each athlete\'s own code_checked_limits')
    .replace('code_checked_limits.volume_adjustment_pct is the volume adjustment recommended for this day','Each athlete\'s code_checked_limits.volume_adjustment_pct is the volume adjustment recommended for that athlete on this day')
    .replace('as one in recent_programs','as one in that athlete\'s recent_programs')
    .replace('ids of the differentiators items','ids of that athlete\'s differentiators items')),
];
/* The coach's S&C shelf by movement pattern — a reference, not the pool the session is
   built from: the task tells the model to lean on it as little as possible, and an
   exercise outside it is accepted (rule 29 only notes it). Cut to
   the gym's kit where an inventory exists, and to a readable length per pattern. */
const DI_LIB_PER_PATTERN=40;
function diLibraryForAI(libMap,setup){
  const eqIds=new Set(eqAvailable(setup||{}).map(e=>e.id));
  const lib={},seen=new Set();
  Object.values(libMap||{}).forEach(e=>{
    const name=String((e&&e.name)||'').trim();
    if(!name||exLib(e)!=='sc'||seen.has(name.toLowerCase()))return;
    seen.add(name.toLowerCase());
    if(eqIds.size){const need=eqNeedOf(e,name);if(need&&!eqIds.has(need))return;}
    const p=exPatternOf(e)||'Untagged';
    (lib[p]=lib[p]||[]).push(name);
  });
  const out={};
  [...IV_PATTERNS,...Object.keys(lib).filter(k=>!IV_PATTERNS.includes(k))].forEach(k=>{
    if(lib[k])out[k]=lib[k].slice(0,DI_LIB_PER_PATTERN);});
  return out;
}
/* The gym's kit for the export. A known item is named in English whatever label the
   setup stored; a custom item keeps the coach's own name. */
function diEquipmentForAI(setup){
  const eq=eqAvailable(setup||{});
  return{type_count:new Set(eq.map(e=>e.id)).size,
    items:eq.map(e=>{const k=DI_EQUIPMENT.find(x=>x.id===e.id);
      return{equipment:k?k.label[1]:e.label,quantity:e.qty==null?'not given':e.qty,weight_kg:e.kg};})};
}
/* The families the variety rule (26) is written against: two patterns, one family. */
const diFamiliesForAI=()=>IV_PATTERNS.map(p=>{const f=diFamilyOf(p);return{pattern:p,family:f?diFamilyLabel(f):null};});
/* Every athlete on the sheet, built at the press like the single one is. The parts that
   are the same for everyone — the task, the answer's shape, the pattern dictionary and
   the gym's kit — are said once at the top instead of once per athlete. */
function diSquadSnapshot({items,setup,date,customTests,now,libMap}){
  return diInEnglish(()=>{
  const shared=['task','output_format','movement_pattern_vocabulary','movement_families','exercise_library','sport_context','equipment'];
  const list=(items||[]).map(it=>{
    const one=diAthleteSnapshot({ath:it.ath,setup,date,instr:it.instr,customTests,now,session:it.session,libMap,
      recent:it.recent});
    const out={};
    Object.keys(one).forEach(k=>{if(!shared.includes(k))out[k]=one[k];});
    return out;
  });
  const first=list[0]||{};
  const day=first.session_day;
  return snapClean({
    session_day:day?{date:day.date,weekday:day.weekday,relative_to_today:day.relative_to_today,match_day_label:day.match_day_label,
      next_game:day.next_game,season_phase:day.season_phase,season_phase_focus:day.season_phase_focus}:{date},
    task:DI_EXT_TASK_SQUAD,
    generated_at:new Date(now||Date.now()).toISOString(),
    athlete_count:list.length,
    equipment:diEquipmentForAI(setup),
    sport_context:diSportContext(setup),
    movement_pattern_vocabulary:[...IV_PATTERNS],
    movement_families:diFamiliesForAI(),
    exercise_library:diLibraryForAI(libMap,setup),
    athletes:list,
    output_format:{programs:[{athlete_id:'athletes[].athlete.id',athlete_name:'athletes[].athlete.name',...DI_EXT_SCHEMA}]},
  })||{};
  });
}
function diExtPhase(v){
  const s=diExName(v||'').replace(/\s+/g,'').replace(/[çğıöşü]/g,c=>({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'})[c]);
  if(!s)return null;
  if(/^(hazirlik|isinma|warmup|warm|prep|preparation|activation|aktivasyon|mobilite|mobility|duzeltici|corrective)/.test(s))return'hazirlik';
  if(/^(tamamlayici|accessory|complementary|supplementary|yardimci|cooldown|soguma|finisher|bitiris)/.test(s))return'tamamlayici';
  if(/^(ana|main|primary|strength|kuvvet|power|guc)/.test(s))return'ana';
  return null;
}
function diExtNormalize(obj){
  const pick=(o,keys)=>{if(!o||typeof o!=='object')return undefined;
    for(const k of keys)if(o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return undefined;};
  const str=v=>v==null?v:(typeof v==='object'?v:String(v));
  const arr=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
  const root=Array.isArray(obj)?{bloklar:obj}:(obj||{});
  let prog=pick(root,['program','session','seans','antrenman','workout','plan']);
  if(Array.isArray(prog))prog={bloklar:prog};
  if(!prog||typeof prog!='object')prog=root;
  const rawBlocks=arr(pick(prog,['bloklar','blocks','fazlar','phases','sections','bolumler']));
  const exOf=e=>{
    if(typeof e==='string')return{ad:e};
    if(!e||typeof e!=='object')return null;
    const basis=pick(e,['dayanak','basis','references','refs','ayirt_ediciler']);
    return{
      ad:str(pick(e,['ad','name','egzersiz','exercise','hareket','title'])),
      kaynak:str(pick(e,['kaynak','source'])),
      set:str(pick(e,['set','sets','seri'])),
      tekrar:str(pick(e,['tekrar','reps','repetitions','rep'])),
      sure:str(pick(e,['sure','süre','duration','time'])),
      mesafe:str(pick(e,['mesafe','distance'])),
      yuk:str(pick(e,['yuk','yük','load','weight','intensity','siddet','şiddet','agirlik','ağırlık'])),
      tempo:str(pick(e,['tempo'])),
      rpe:str(pick(e,['rpe','target_rpe'])),
      dinlenme:str(pick(e,['dinlenme','rest','recovery'])),
      ekipman:str(pick(e,['ekipman','equipment'])),
      hareket_paterni:str(pick(e,['hareket_paterni','pattern','movement_pattern','patern','movementPattern'])),
      gerekce:str(pick(e,['gerekce','gerekçe','rationale','reason','why','notlar','notes','not','aciklama','açıklama'])),
      dayanak:basis==null?[]:(Array.isArray(basis)?basis:String(basis).split(/[\s,;]+/)),
    };
  };
  /* A reply with no blocks but a flat exercise list is one block, of no phase. */
  const flat=rawBlocks.length?null:arr(pick(prog,['egzersizler','exercises']));
  const blocks=(flat&&flat.length?[{egzersizler:flat}]:rawBlocks).map(bl=>{
    if(!bl||typeof bl!=='object')return null;
    const name=str(pick(bl,['ad','name','title','baslik','başlık','blok']));
    const phaseRaw=pick(bl,['faz','phase','type','tur','tür']);
    return{ad:name||'',faz:diExtPhase(phaseRaw)||diExtPhase(name)||'',
      egzersizler:arr(pick(bl,['egzersizler','exercises','items','hareketler','rows'])).map(exOf).filter(Boolean)};
  }).filter(Boolean);
  const conflicts=arr(pick(root,['flagged_conflicts','catismalar','çatışmalar','conflicts'])).map(c=>{
    if(!c||typeof c!=='object')return c;
    return{talimat:str(pick(c,['talimat','instruction'])),alan:str(pick(c,['alan','field'])),
      cakisan_kural:str(pick(c,['cakisan_kural','rule','kural'])),karar:str(pick(c,['karar','decision'])),
      alternatif:str(pick(c,['alternatif','alternative']))};
  });
  const prios=arr(pick(root,['training_priorities','antrenman_onceligi','oncelikler','priorities','priority'])).map(p=>
    typeof p==='string'?{oncelik:p}:{oncelik:str(pick(p,['oncelik','öncelik','priority','hedef','goal'])),
      gerekce:str(pick(p,['gerekce','gerekçe','rationale','reason']))});
  const resp=pick(root,['uyulan_kisitlar','respected','constraints_respected']);
  return{
    durum_ozeti:str(pick(root,['status_summary','durum_ozeti','ozet','özet','summary'])),
    antrenman_onceligi:prios,
    program:{seans_adi:str(pick(prog,['seans_adi','session_name','name','ad','title'])||pick(root,['seans_adi','session_name'])),bloklar:blocks},
    uyulan_kisitlar:resp==null?[]:(Array.isArray(resp)?resp:[resp]).map(str),
    flagged_conflicts:conflicts,
    genel_gerekce:str(pick(root,['genel_gerekce','gerekce','rationale'])),
    koc_uyarisi:str(pick(root,['koc_uyarisi','uyari','uyarı','warning','coach_warning'])),
  };
}
/* A squad answer carries one programme per athlete. The one for this athlete is found
   by id first and by name second; an answer that has nobody by either is refused rather
   than handing this athlete somebody else's session. */
function diExtPickAthlete(obj,who){
  const listOf=o=>{
    if(Array.isArray(o)&&o.some(x=>x&&typeof x==='object'&&(x.sporcu_id||x.athlete_id||x.sporcu_adi||x.athlete)))return o;
    if(o&&typeof o==='object'){
      for(const k of['programlar','programs','sporcular','athletes'])if(Array.isArray(o[k]))return o[k];
    }
    return null;
  };
  const list=listOf(obj);
  if(!list)return obj;
  const w=who||{};
  const isObj=v=>!!(v&&typeof v==='object');
  const idOf=x=>String((x&&(x.sporcu_id||x.athlete_id||x.id||(x.sporcu&&x.sporcu.id)||(isObj(x.athlete)&&x.athlete.id)))||'').trim();
  const nameOf=x=>diExName((x&&(x.sporcu_adi||x.athlete_name||(typeof x.athlete==='string'?x.athlete:null)||x.ad_soyad||
    (x.sporcu&&(x.sporcu.ad||x.sporcu.name))||(isObj(x.athlete)&&x.athlete.name)))||'');
  let hit=w.id?list.find(x=>idOf(x)===String(w.id)):null;
  if(!hit&&w.name)hit=list.find(x=>nameOf(x)&&nameOf(x)===diExName(w.name));
  /* A lone programme is taken only when it names nobody: one tagged with another
     athlete's id or name is that athlete's, not a fallback for this one. */
  if(!hit&&list.length===1&&!idOf(list[0])&&!nameOf(list[0]))hit=list[0];
  if(!hit)throw new Error(L(`Yapıştırılan yanıtta ${w.name||'bu sporcu'} için bir program yok (${list.length} programdan hiçbiri bu sporcuya ait değil).`,
    `The pasted answer has no programme for ${w.name||'this athlete'} (none of its ${list.length} programmes is theirs).`));
  return hit;
}
function diParseExternalProgram(text,libMap,who){
  /* Chat models leave their source markers ("[cite: 1, 4]") inside the text; they mean
     nothing on an athlete's programme. */
  let s=String(text||'').replace(/\s*\[cite(?::[^\]]*)?\]/gi,'').trim();
  if(!s)throw new Error(L('Yapıştırılan metin boş.','Nothing was pasted.'));
  const fence=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(fence)s=fence[1].trim();
  const a=s.search(/[\[{]/);
  if(a===-1)throw new Error(L('Metinde JSON bulunamadı.','No JSON found in the text.'));
  const body=s.slice(a);
  const close=body[0]==='['?']':'}';
  const b=body.lastIndexOf(close);
  let obj=null;
  if(b>0){try{obj=JSON.parse(body.slice(0,b+1));}catch(e){}}
  if(!obj){const rep=pdaRepair(body);if(rep){try{obj=JSON.parse(rep);}catch(e){}}}
  if(!obj)throw new Error(L('JSON okunamadı — metnin tamamını kopyaladığından emin ol.','The JSON could not be read — make sure the whole reply was copied.'));
  const norm=diExtNormalize(diExtPickAthlete(obj,who));
  if(!norm.program.bloklar.some(bl=>bl.egzersizler.some(e=>e&&String(e.ad||'').trim())))
    throw new Error(L('JSON\'da egzersiz içeren bir program bulunamadı — yapay zekâdan output_format\'taki yapıda yanıt istediğinden emin ol.',
      'No programme with exercises in the JSON — make sure the model answered in the output_format shape.'));
  /* An exercise the coach's library already knows is marked as such, so the card
     links it and its movement pattern is read off the entry. */
  const lm=libMap||{};
  norm.program.bloklar.forEach(bl=>bl.egzersizler.forEach(e=>{
    if(!e.kaynak&&e.ad&&lm[String(e.ad).trim().toLowerCase()])e.kaynak='library';
  }));
  const prog=diParseProgram(JSON.stringify(norm));
  prog.truncated=false;
  /* A loaded programme is written AS LOADED: no readiness cut on its sets and reps, and
     no rule that stops the write. The coach brought it in from outside and approves it
     as it stands; the rules are still read against it, as information. */
  prog.external=true;
  return prog;
}
/* The stored draft's programme, flagged as loaded where the draft says so — drafts
   loaded before the flag was carried on the programme itself are read the same way. */
function diReviewProgram(r){
  const p=r&&r.program;
  if(!p)return null;
  return(r.model==='external'&&!p.external)?{...p,external:true}:p;
}

/* Every exercise of a generated programme, with the readiness cut applied by code
   (rule 2 of the prompt). `prescribed` is what the model wrote, `adjusted` is what
   will be written to the calendar — the card shows both wherever they differ. */
function diProgramRows(program,pct){
  const out=[];
  ((program&&program.blocks)||[]).forEach(bl=>bl.exercises.forEach(e=>{
    const adj=diAdjustRow({sets:e.sets,reps:e.reps,duration:e.duration},pct||0);
    out.push({...e,block:bl.name,
      prescribed:{sets:e.sets,reps:e.reps,duration:e.duration},
      adjusted:{sets:adj.sets,reps:adj.reps,duration:adj.duration},
      changed:adj.changed});
  }));
  return out;
}
/* ---- The deterministic validator -----------------------------------------
   AI proposes, code decides. This is the only place that decides, it runs on the
   normalised schema rather than on whatever a provider returned, and it never asks a
   model whether a limit was respected — every answer below is arithmetic over the
   session and the athlete's own record.

   TWO TIERS, AND THEY DO NOT LEAK INTO EACH OTHER.

   A HARD VIOLATION BLOCKS THE SAVE. It is reserved for the things a coach would call
   a mistake rather than a preference: an exercise the athlete is explicitly restricted
   from, a pattern today's pain has closed, kit the gym does not own, a ceiling the
   coach wrote down, and the two numeric limits the knowledge base states outright
   (rule 27's contacts, rule 28's tier caps). There is no override. A session that
   trips one of these is not written, and the way past it is to fix the session —
   which is a regenerate, or the coach writing it by hand on the athlete's own
   calendar, where every other programme in this app is written.

   A SOFT WARNING NEVER BLOCKS ANYTHING. It is a prompt to look: the session repeats
   what this athlete did last week, or reads like the one next to it, or never cites
   what made this athlete different. These are judgements about quality, and a
   judgement about quality is the coach's. They are never escalated to hard — a
   warning that can fail a save is a hard rule wearing a disguise.

   Every finding names the knowledge-base rule it comes from, so a coach who disagrees
   knows which rule to go and edit. */
function validateProgram(program,ctx){
  const c=ctx||{};
  const bundle=c.bundle||{};
  const i=c.instr||diInstr(null,null);
  const setup=c.setup||{};
  const libMap=c.libMap||{};
  const deficits=c.deficits||null;
  const diffs=c.differentiators||[];
  const hard=[],soft=[];
  const H=(rule,tr,en)=>hard.push({rule,text:L(tr,en)});
  const S=(rule,tr,en)=>soft.push({rule,text:L(tr,en)});
  /* Checked before anything is read off the programme: a session addressed to
     somebody else is not this athlete's session, whatever it contains. */
  if(c.athleteId&&c.expectedAthleteId&&c.athleteId!==c.expectedAthleteId)
    H(null,`Program başka bir sporcuya ait (${c.athleteId}).`,
      `This programme belongs to a different athlete (${c.athleteId}).`);
  if(!program||!((program.blocks)||[]).length){
    H(null,'Program boş — yazılacak egzersiz yok.','The programme is empty — there is nothing to write.');
    return{status:'fail',hardViolations:hard,softWarnings:soft,checked_at:new Date().toISOString()};
  }
  const rows=diProgramRows(program,0);
  const patOf=r=>r.pattern||((libMap&&libMap[String(r.name||'').toLowerCase()])
    ?exPatternOf(libMap[String(r.name||'').toLowerCase()]):'');
  const main=rows.filter(r=>(r.phase||'ana')==='ana');

  /* ---- HARD 1 (rule 17, 22): the explicit avoid-list ---------------------
     What the coach wrote on the injury record, and what they ruled out this morning.
     Held against exercise names. Nothing downstream may soften this — the spec calls
     it out by name and it is the one check that has to hold when everything else
     about the day argues for training. */
  const restrictions=diRestrictions(bundle,i);
  restrictions.forEach(r=>{
    rows.forEach(row=>{
      const hits=diRestrictionHits(row.name,r);
      if(!hits.length)return;
      H(r.kaynak==='sakatlık kaydı'?17:22,
        `"${row.name}" ${r.kaynak==='sakatlık kaydı'?'sakatlık kısıtlamasına':'antrenörün kaçınılacak listesine'} takılıyor ("${r.metin}" — eşleşen: ${hits.join(', ')}). Programdan çıkmalı.`,
        `"${row.name}" hits ${r.kaynak==='sakatlık kaydı'?'an injury restriction':"the coach's keep-out list"} ("${r.metin}" — matched: ${hits.join(', ')}). It cannot be in the session.`);
    });
  });

  /* ---- HARD 2 (rule 17): patterns today's pain has closed ---------------- */
  const blocked=diBlockedPatterns(bundle);
  const blockedSet=diBlockedSet(blocked);
  if(blockedSet.size)rows.forEach(r=>{
    const pat=patOf(r);
    if(!pat||!blockedSet.has(pat))return;
    const src=blocked.find(b=>(b.yasak_paternler||[]).includes(pat));
    const why=src?(src.kalici
      ?L(`${src.bolge} için koçun kalıcı kısıt etiketi`,`a standing coach restriction on ${src.bolge}`)
      :L(`${src.bolge} ağrısı (${src.siddet_0_5}/5)`,`${src.bolge} pain at ${src.siddet_0_5}/5`)):'';
    H(17,`"${r.name}" ${pat} paterninde ve ${why} bu paterni bugün kapatıyor — programdan çıkmalı.`,
      `"${r.name}" is a ${pat} movement, and ${why} rules that pattern out today — it cannot be in the session.`);
  });

  /* ---- HARD 3-5 (rule 20): the gym's kit -------------------------------- */
  const eq=eqAvailable(setup);
  if(eq.length){
    const ids=new Set(eq.map(e=>e.id));
    /* The heaviest of each item the gym actually owns. Only consulted for kit where
       the prescribed load IS the implement — a dumbbell or a medicine ball. A barbell,
       trap bar, cable or machine is loaded with plates or a stack this inventory does
       not count, so its own weight says nothing about the ceiling. */
    const EQ_SELF_LOADED=['dumbbell','medball'];
    const maxKg={},qty={};
    eq.forEach(e=>{
      if(e.kg!=null&&(maxKg[e.id]==null||e.kg>maxKg[e.id]))maxKg[e.id]=e.kg;
      /* One unknown count makes the whole item uncountable: a shelf that says "some
         dumbbells" cannot be short of anything a check could name. */
      if(qty[e.id]===false)return;
      qty[e.id]=e.qty==null?false:(qty[e.id]||0)+e.qty;
    });
    rows.forEach(r=>{
      const need=eqNeedOf(libMap?libMap[String(r.name||'').toLowerCase()]:null,`${r.name} ${r.equipment||''}`);
      if(need&&!ids.has(need)){
        H(20,`"${r.name}" ${L(diEqLabel(need)[0],diEqLabel(need)[1])} gerektiriyor — salon envanterinde yok.`,
          `"${r.name}" needs ${L(diEqLabel(need)[0],diEqLabel(need)[1])}, which is not in the gym inventory.`);
        return;
      }
      if(!need)return;
      // Quantity, with the shortage said out loud (rule 20's own example, read for one athlete).
      const have=qty[need];
      if(have!==false&&have!=null){
        const want=diRowUnits(r);
        if(want>have)
          H(20,`"${r.name}" ${want} adet ${L(diEqLabel(need)[0],diEqLabel(need)[1])} gerektiriyor; envanterde ${have} var — ${want-have} eksik.`,
            `"${r.name}" needs ${want} × ${L(diEqLabel(need)[0],diEqLabel(need)[1])} and the inventory holds ${have} — ${want-have} short.`);
      }
      if(!EQ_SELF_LOADED.includes(need)||maxKg[need]==null)return;
      /* A load line reads "24 kg", "2×22.5 kg", "%75 1RM"; only an absolute kilo
         figure can be compared with a rack, so a percentage or an RPE is left alone. */
      const txt=String(r.load||'');
      if(/%|1rm|rpe|rir/i.test(txt))return;
      const asked=(txt.match(/(\d+(?:[.,]\d+)?)\s*kg/gi)||[])
        .map(x=>Number(String(x).replace(/\s*kg/i,'').replace(',','.')))
        .filter(n=>isFinite(n));
      const top=asked.length?Math.max(...asked):null;
      if(top!=null&&top>maxKg[need])
        H(20,`"${r.name}" ${top} kg istiyor — envanterdeki en ağır ${L(diEqLabel(need)[0],diEqLabel(need)[1])} ${maxKg[need]} kg.`,
          `"${r.name}" asks for ${top} kg — the heaviest ${L(diEqLabel(need)[0],diEqLabel(need)[1])} in the inventory is ${maxKg[need]} kg.`);
    });
  }

  /* ---- HARD 6-7 (rule 21, 22): what the coach wrote down ----------------
     Only where the coach actually filled the field in. The module derives a ceiling
     from the session length when they did not, and a derived number is a hint, not an
     instruction — it never fails a session. */
  /* `diInstr` marks which of the two numbers the coach actually typed; one it derived
     from the session length is a hint and never fails anything. */
  const setByCoach=k=>!!i[k+'Set'];
  if(i.maxExercises&&setByCoach('maxExercises')&&rows.length>i.maxExercises)
    H(22,`Seansta toplam ${rows.length} egzersiz var, antrenörün sınırı ${i.maxExercises}. (Hazırlık, ana ve tamamlayıcı fazlar dahil.)`,
      `The session carries ${rows.length} exercises against the coach's ceiling of ${i.maxExercises}. (Preparation, main and complementary work all count.)`);
  else if(i.maxExercises&&rows.length>i.maxExercises)
    S(22,`Seansta toplam ${rows.length} egzersiz var; seans süresinden türetilen tavan ${i.maxExercises}. (Antrenör bir sayı girmedi.)`,
      `The session carries ${rows.length} exercises against a ceiling of ${i.maxExercises} derived from the session length. (The coach set no number.)`);
  const est=rows.length*DI_MIN_PER_EX;
  if(i.duration&&setByCoach('duration')&&est>i.duration)
    H(21,`Program ${rows.length} egzersiz taşıyor — yaklaşık ${est} dk, antrenörün verdiği süre ${i.duration} dk. (Egzersiz başına ~${DI_MIN_PER_EX} dk, bütün fazlar dahil.)`,
      `The session carries ${rows.length} exercises — roughly ${est} min against the coach's ${i.duration} min. (About ${DI_MIN_PER_EX} min per exercise, all phases included.)`);
  else if(i.duration&&est>i.duration)
    S(21,`Program yaklaşık ${est} dk sürer; kaynak seansın süresi ${i.duration} dk. (Antrenör bir süre girmedi.)`,
      `The session runs to roughly ${est} min against the source session's ${i.duration} min. (The coach set no length.)`);

  /* ---- HARD 8 (rule 28): the tier the session is held to ----------------- */
  const tier=bundle.tier||{};
  const caps=diTierCaps(tier.gecerli);
  if(caps){
    const worst=rows.reduce((m,r)=>{const n=recNum(r.sets);return n!=null&&n>m?n:m;},0);
    if(worst>caps.max_sets)
      H(28,`Kademe ${tier.gecerli}${tier.gecici_dusus?' (geçici düşüş uygulandı)':''} en fazla ${caps.max_sets} set taşır; programda ${worst} setlik bir satır var.`,
        `Tier ${tier.gecerli}${tier.gecici_dusus?' (temporary downgrade applied)':''} carries at most ${caps.max_sets} sets; the session has a row of ${worst}.`);
    if(main.length>caps.max_main)
      H(28,`Kademe ${tier.gecerli} ana fazda en fazla ${caps.max_main} egzersiz taşır; programda ${main.length} var.`,
        `Tier ${tier.gecerli} carries at most ${caps.max_main} main-phase exercises; the session has ${main.length}.`);
  }

  /* ---- HARD 9 (rule 27): ground contacts -------------------------------- */
  const plyo=diPlyoCeiling(bundle);
  const contacts=rows.reduce((t,r)=>{const n=diRowContacts(r,patOf);return n==null?t:t+n;},0);
  if(plyo&&contacts>plyo.max)
    H(27,`Pliometrik temas sayısı ${contacts}; ${plyo.grup} için oturum başına üst sınır ${plyo.max}.`,
      `The session asks for ${contacts} ground contacts; the ceiling for ${plyo.grup} is ${plyo.max} per session.`);

  /* ---- HARD 10 (rule 22): a constraint the coach put a number on --------- */
  (i.constraints||[]).forEach(id=>{
    const row=diConRow(id);
    if(!row||!row.deger)return;
    const v=diConValue(row.deger.kind,(i.constraintValues||{})[id]);
    if(!v||!v.readable||v.value==null){
      if(v&&!v.readable)
        S(22,`"${L(row.label[0],row.label[1])}" için girilen sınır ("${v.raw}") birimi okunamadığı için kodla denetlenemedi — modele metin olarak gitti.`,
          `The limit typed for "${L(row.label[0],row.label[1])}" ("${v.raw}") carries no readable unit, so it could not be checked in code — it went to the model as prose.`);
      return;
    }
    const lbl=L(row.label[0],row.label[1]);
    if(v.unit==='sets'){
      const total=rows.reduce((t,r)=>{const n=recNum(r.sets);return n==null?t:t+n;},0);
      if(total>v.value)H(22,`${lbl}: toplam ${total} set, sınır ${v.value}.`,`${lbl}: ${total} sets in total against a limit of ${v.value}.`);
    }else if(v.unit==='min'){
      if(est>v.value)H(22,`${lbl}: program yaklaşık ${est} dk, sınır ${v.value} dk.`,`${lbl}: the session runs to roughly ${est} min against a limit of ${v.value}.`);
    }else if(v.unit==='contacts'){
      if(contacts>v.value)H(22,`${lbl}: ${contacts} temas, sınır ${v.value}.`,`${lbl}: ${contacts} contacts against a limit of ${v.value}.`);
    }else{
      rows.forEach(r=>{
        const got=diReadLoad(r.load,v.unit);
        if(got!=null&&got>v.value)
          H(22,`${lbl}: "${r.name}" ${diLoadLabel(v.unit,got)} istiyor, sınır ${diLoadLabel(v.unit,v.value)}.`,
            `${lbl}: "${r.name}" asks for ${diLoadLabel(v.unit,got)} against a limit of ${diLoadLabel(v.unit,v.value)}.`);
      });
    }
  });

  /* ================= SOFT — none of these stops a save ==================== */

  /* Free text is always allowed (rule 29, and the spec says so twice). Recorded so
     the coach can see what was written outside their library and file it if they
     want to; never counted against the session. */
  const custom=rows.filter(r=>!libMap[String(r.name||'').toLowerCase()]);
  if(custom.length)
    S(29,`${custom.length} egzersiz kütüphane dışından yazıldı (${custom.map(r=>r.name).join(', ')}) — kabul edildi, istersen kütüphaneye ekle.`,
      `${custom.length} exercise${custom.length>1?'s were':' was'} written outside the library (${custom.map(r=>r.name).join(', ')}) — accepted; file them if you want them.`);

  /* Did the session actually use what made this athlete different? */
  if(diffs.length){
    const cited=new Set(rows.flatMap(r=>r.basis||[]));
    const known=new Set(diffs.map(d=>d.id));
    const used=[...cited].filter(x=>known.has(x));
    if(!used.length)
      S(null,`Bu sporcunun ${diffs.length} ayırt edici özelliği hesaplandı ama hiçbir egzersizin gerekçesi bunlardan birine dayanmıyor — program bu sporcuya özel yazılmamış olabilir.`,
        `${diffs.length} differentiators were computed for this athlete and no exercise's rationale rests on any of them — the session may not be about this athlete at all.`);
    else if(used.length<Math.min(2,diffs.length))
      S(null,`Hesaplanan ${diffs.length} ayırt ediciden yalnızca ${used.length} tanesi programda karşılık buldu.`,
        `Only ${used.length} of the ${diffs.length} computed differentiators is answered anywhere in the session.`);
  }
  const noWhy=rows.filter(r=>!String(r.why||'').trim());
  if(noWhy.length)
    S(null,`${noWhy.length} egzersizde gerekçe yok (${noWhy.map(r=>r.name).join(', ')}).`,
      `${noWhy.length} exercise${noWhy.length>1?'s carry':' carries'} no rationale (${noWhy.map(r=>r.name).join(', ')}).`);

  /* Repetition over time — the athlete against their own recent sessions. */
  const names=diProgramNames(program);
  (c.recent||[]).forEach(p=>{
    const sim=diJaccard(names,p.egzersizler);
    if(sim>=DI_SIM_SELF)
      S(23,`${p.tarih} tarihli programla %${Math.round(sim*100)} aynı egzersizler — bu sporcu aynı seansı tekrar alıyor.`,
        `${Math.round(sim*100)}% of the exercises are the same as the session on ${p.tarih} — this athlete is getting the same work again.`);
  });
  /* Sameness across athletes, but only where the athletes themselves read differently.
     Two players with the same findings are allowed the same session (rule 24); this
     fires where the inputs differ and the output did not. */
  const myDiff=new Set(diffs.map(d=>d.text));
  (c.peers||[]).forEach(p=>{
    const sim=diJaccard(names,p.names);
    if(sim<DI_SIM_PEER)return;
    const theirs=new Set(p.diff||[]);
    const same=myDiff.size===theirs.size&&[...myDiff].every(x=>theirs.has(x));
    if(same)return;   // genuinely alike athletes — not a finding
    S(26,`Ayırt edicileri farklı olan başka bir sporcuyla %${Math.round(sim*100)} aynı program yazılmış.`,
      `${Math.round(sim*100)}% of this session matches another athlete whose differentiators are different.`);
  });

  /* Today's stated priority, and whether anything in the session serves it. */
  (i.priorities||[]).forEach(id=>{
    const lbl=diPrioLabel(id);
    const words=diExName(lbl).split(' ').filter(w=>w.length>=DI_TERM_MIN);
    if(!words.length)return;
    const hit=rows.some(r=>{const hay=diExName(`${r.name} ${r.why||''}`);return words.some(w=>hay.includes(w));});
    if(!hit)S(22,`Günün önceliği "${lbl}" programda adıyla karşılık bulmuyor — gerekçeleri kontrol et.`,
      `Today's priority "${lbl}" is not named anywhere in the session — check the rationales.`);
  });

  /* Two exercises of one movement family in the MAIN phase. A quality point, not a
     safety one: the coach decides whether a session that hits the same family twice
     is wrong for this athlete today. */
  const fams=new Map();
  main.forEach(r=>{
    const f=diFamilyOf(patOf(r));
    if(!f)return;
    fams.set(f,(fams.get(f)||[]).concat(String(r.name||'').trim()));
  });
  fams.forEach((nm,f)=>{
    if(nm.length<2)return;
    S(26,`Ana fazda ${nm.length} ${diFamilyLabel(f)} egzersizi var (${nm.join(', ')}) — aynı iş iki kez yapılmış.`,
      `The main phase carries ${nm.length} ${diFamilyLabel(f)} exercises (${nm.join(', ')}) — the same work twice.`);
  });

  /* Pain below the blocking threshold is still worth a look where the session loads it. */
  ((bundle.pain&&bundle.pain.regions)||[]).forEach(p=>{
    if(p.standing)return;                                        // already hard above
    if(p.severity_0_5!=null&&p.severity_0_5>=DI_PAIN_BLOCK)return;   // already hard above
    rows.forEach(r=>{
      const pat=patOf(r);
      if(pat&&(p.loads_patterns||[]).includes(pat))
        S(17,`${p.label} bildirilmiş ve "${r.name}" bu bölgeyi yükleyen ${pat} paterninde.`,
          `${p.label} was reported and "${r.name}" is a ${pat} movement, which loads it.`);
    });
  });

  /* The other half of the brief. "Must be in" cannot be enforced — a rule may
     legitimately have stopped it — so it is reported, with the answer's own account
     of why beside it where there is one. */
  const declared=((program.conflicts)||[]).map(x=>diExName(`${x.talimat||''} ${x.alt||''}`)).filter(Boolean);
  (i.must||[]).forEach(mu=>{
    const needle=diExName(mu);
    if(!needle)return;
    const inSession=rows.some(r=>{const n=diExName(r.name);return n&&(n.includes(needle)||needle.includes(n));});
    if(inSession)return;
    const flagged=declared.some(d=>d.includes(needle)||needle.includes(d));
    S(22,flagged
      ?`Antrenör "${mu}" istemişti; program bunu bir kurala aykırı bulup çıkarmış ve gerekçesini çatışma olarak bildirmiş — gerekçeyi oku.`
      :`Antrenör "${mu}" istemişti ama programda yok ve bir çatışma da bildirilmemiş.`,
      flagged
      ?`The coach asked for "${mu}"; the session ruled it out against a rule and declared the reason as a conflict — read it.`
      :`The coach asked for "${mu}", and it is neither in the session nor declared as a conflict.`);
  });

  /* A high-priority finding from the battery with nothing in the session that names
     it. Matched on the words of the finding, which is as far as a string can honestly
     go — it is a prompt to look, not a verdict. */
  ((deficits&&deficits.findings)||[]).filter(f=>f.oncelik==='yüksek').forEach(f=>{
    const words=(f.kw||[]).map(diExName).filter(Boolean);
    const hit=!words.length||rows.some(r=>{
      const hay=diExName(`${r.name} ${r.why||''}`);
      return words.some(w=>hay.includes(w));
    });
    if(!hit)S(25,`Yüksek öncelikli bulgu programda karşılanmamış görünüyor: ${f.bolge} — ${f.bulgu}.`,
      `A high-priority finding looks unanswered in the session: ${f.bolge} — ${f.bulgu}.`);
  });

  /* Rule 17's other half: a reading the system must not decide on by itself. */
  if(bundle.readiness&&bundle.readiness.score!=null&&bundle.readiness.score<DI_RD_REVIEW)
    S(28,program.external
      ?`Hazır oluş ${bundle.readiness.score}/5 — ${DI_RD_REVIEW} altında. Yüklenen programa otomatik azaltma uygulanmaz: set ve tekrarı yazmadan önce gözden geçir.`
      :`Hazır oluş ${bundle.readiness.score}/5 — ${DI_RD_REVIEW} altında. Otomatik azaltma uygulandı ama son karar antrenörün: bu programı yazmadan önce gözden geçir.`,
      program.external
      ?`Readiness is ${bundle.readiness.score}/5, under ${DI_RD_REVIEW}. No automatic reduction is applied to a loaded programme — review the sets and reps before writing it.`
      :`Readiness is ${bundle.readiness.score}/5, under ${DI_RD_REVIEW}. The automatic reduction was applied, but the call is the coach's — review this before writing it.`);

  const uniq=list=>{const seen=new Set();return list.filter(v=>{const k=v.rule+'|'+v.text;
    if(seen.has(k))return false;seen.add(k);return true;});};
  let H2=uniq(hard),S2=uniq(soft);
  /* A LOADED PROGRAMME IS NEVER BLOCKED. What would stop an in-app draft is still
     listed — first, where the coach reads it — but it is information: the coach chose
     to bring this session in from outside and it is written as they approve it. */
  if(program.external&&H2.length){S2=[...H2.map(h=>({...h,was_hard:true})),...S2];H2=[];}
  return{status:H2.length?'fail':'pass',hardViolations:H2,softWarnings:S2,
    checked_at:new Date().toISOString()};
}
/* Reading a prescribed load line for one unit. Returns null where the line says
   nothing about that unit — "RPE 7" carries no kilos and must not be read as seven of
   them. */
function diReadLoad(txt,unit){
  const s=String(txt||'');
  if(!s.trim())return null;
  const pick=re=>{const m=s.match(re);return m?Number(String(m[1]).replace(',','.')):null;};
  if(unit==='rpe')return pick(/rpe\s*(\d+(?:[.,]\d+)?)/i);
  if(unit==='rir')return pick(/rir\s*(\d+(?:[.,]\d+)?)/i);
  if(unit==='pct1rm'){
    const a=pick(/%\s*(\d+(?:[.,]\d+)?)/);
    return a!=null?a:pick(/(\d+(?:[.,]\d+)?)\s*%/);
  }
  if(unit==='kg'){
    if(/%|1rm|rpe|rir/i.test(s))return null;
    const all=(s.match(/(\d+(?:[.,]\d+)?)\s*kg/gi)||[])
      .map(x=>Number(String(x).replace(/\s*kg/i,'').replace(',','.'))).filter(n=>isFinite(n));
    return all.length?Math.max(...all):null;
  }
  return null;
}
const diLoadLabel=(unit,v)=>unit==='pct1rm'?`%${v} 1RM`:(unit==='kg'?`${v} kg`:`${String(unit).toUpperCase()} ${v}`);

/* A generated programme, laid onto the plan so the existing write path takes it from
   here unchanged: `planToSession` turns a plan into the athlete's session, and this is
   a plan whose blocks are the model's rather than the source session's. The readiness
   cut is baked in here, so what is written is what the card showed. */
function diProgramPlan(plan,program,pct){
  const cut=(program&&program.external)?0:(pct||0);   // a loaded programme is written as loaded
  const mkRow=(e)=>{
    const adj=diAdjustRow({sets:e.sets,reps:e.reps,duration:e.duration},cut);
    const why=String(e.why||'').trim();
    /* aiDesc: the description is the model's, so the calendar shows it in whichever
       language the app is in (descI18n, below) rather than the one it was written in. */
    return{key:e.key,base:{description:why,notes:'',name:'',aiDesc:!!why},
      name:e.name,added:true,addId:e.key,
      sets:adj.sets||'',reps:adj.reps||'',duration:adj.duration||'',
      tempo:e.tempo||'',rpe:e.rpe||'',load:e.load||'',rest:e.rest||'',
      superset:'',pattern:e.pattern||'',plane:'',link:'',
      description:why,image:'',changedName:false,
      note:e.distance?String(e.distance):''};
  };
  const name=String((program&&program.session_name)||'').trim();
  /* ONE BLOCK, ITS SECTIONS THE PROGRAMME'S OWN. A loaded programme arrives in parts —
     preparation, the main work, whatever closes it — and each part is a PHASE of the
     session, not a block of its own: it is written as a single block whose phases carry
     the part's name, so it reads on the calendar exactly as a phased block written by
     hand does. A programme of one part is one plain block. */
  const src=((program&&program.blocks)||[]).filter(bl=>bl&&(bl.exercises||[]).length);
  let blocks;
  if(src.length<=1){
    blocks=src.map(bl=>({key:bl.key,name:bl.name||name||'',baseName:'',added:true,addId:bl.key,
      removed:false,renamed:false,rows:bl.exercises.map(mkRow)}));
  }else{
    const phases=[],phaseNames={},used={};
    const rows=[];
    src.forEach((bl,i)=>{
      const id='ph_'+(i+1);
      let nm=String(bl.name||'').trim()||(DI_PHASES_LBL[bl.phase]?L(DI_PHASES_LBL[bl.phase][0],DI_PHASES_LBL[bl.phase][1]):L(`Faz ${i+1}`,`Phase ${i+1}`));
      const lo=nm.toLowerCase();used[lo]=(used[lo]||0)+1;
      if(used[lo]>1)nm=`${nm} (${used[lo]})`;
      phases.push(id);phaseNames[id]=nm;
      bl.exercises.forEach(e=>rows.push({...mkRow(e),phase:id}));
    });
    const k0=src[0].key;
    blocks=[{key:k0,name:name||'',baseName:'',added:true,addId:k0,removed:false,renamed:false,
      phases,phaseNames,rows}];
  }
  return{...plan,blocks,
    meta:{...plan.meta,name:name||plan.meta.name}};
}

/* ---- Coach review (§30) ---------------------------------------------------
   AI Draft → Coach Review → Final Program. The draft is never the programme: it is
   stored beside the engine reading that produced it and waits for a decision. What
   gets kept is the whole chain — what was recommended, what the coach did with it
   and why — because that record is the only thing a later feedback loop (§36) could
   ever learn from, and it cannot be reconstructed afterwards. */
const diReviewKey=(srcKey,athId,dateKey)=>`${dateKey}|${srcKey}|${athId}`;
/* Read and write go through these two so the shape of the store is decided in one
   place; `team.indiv.ai` is a plain map keyed by day + source + athlete. */
function diReadReview(team,srcKey,athId,dateKey){
  return(((team&&team.indiv&&team.indiv.ai)||{})[diReviewKey(srcKey,athId,dateKey)])||null;
}
/* Several athletes' reviews in ONE write: each diWriteReview rebuilds the store from the
   team it was handed, so a loop of them in one tick keeps only the last athlete's. */
function diWriteReviews(team,updateTeam,srcKey,dateKey,patches){
  const store=(team.indiv&&team.indiv.ai)||{};
  const ai={...store};
  const now=new Date().toISOString();
  Object.keys(patches||{}).forEach(athId=>{
    const key=diReviewKey(srcKey,athId,dateKey);
    ai[key]={...(store[key]||{}),...patches[athId],updated_at:now};
  });
  updateTeam(team.id,{indiv:{...(team.indiv||{}),ai}});
}
function diWriteReview(team,updateTeam,srcKey,athId,dateKey,patch){
  const store=(team.indiv&&team.indiv.ai)||{};
  const key=diReviewKey(srcKey,athId,dateKey);
  const prev=store[key]||{};
  const next=patch==null?null:{...prev,...patch,updated_at:new Date().toISOString()};
  const ai={...store};
  if(next)ai[key]=next;else delete ai[key];
  updateTeam(team.id,{indiv:{...(team.indiv||{}),ai}});
  return next;
}


/* ---- What the sheet may write, per athlete ------------------------------
   A programme that exists and has not been approved HOLDS the athlete's calendar:
   nothing is written, not by the automatic pass and not by the button in the bar,
   until the coach has read it and pressed Write. That is the point of the review — a
   programme the coach has not seen must not reach the athlete's phone first.

   The other two cases are writes: no programme in play at all (the page behaves
   exactly as it did before this module existed, copying the source session), and an
   approved one (the approved programme is what goes). */
function diWriteGate(review){
  if(!review||!review.program)return{write:true,approved:false,waiting:false};
  if(review.decision!=='accept')return{write:false,approved:false,waiting:true};
  return{write:true,approved:true,waiting:false};
}

/* ---- The card panel -------------------------------------------------------
   Reads top to bottom the way a coach decides: what the athlete's day looks like
   (computed, and there whether or not an API key exists), what the coach wants from
   it, the session that comes back, and the button that puts it on the calendar. */
function DiSignals({items,limit}){
  if(!items||!items.length)return null;
  const show=limit?items.slice(0,limit):items;
  return(<ul className="di-sig">{show.map((s,i)=><li key={i}>{s}</li>)}
    {limit&&items.length>limit?<li className="di-dim">+{items.length-limit}</li>:null}</ul>);
}

/* A list the coach builds by typing — "must be in", "keep out". Enter, the ＋ button
   or leaving the box files what is in it; each entry is a chip with its own ✕. Free
   text on purpose: it is read by the model, not matched against the library, so
   "adduktör çalışması" is as valid an answer as a named exercise.

   The text is this component's own state until it becomes a chip, and that is where the
   module used to lose half of every brief: only Enter and ＋ committed, so a coach who
   typed "Trap Bar Jump" and went straight to the export button sent an EMPTY
   mutlaka_olsun with the request — the instruction never reached the prompt at all, and
   the session came back looking as though the model had ignored it. Three things close
   that hole: the text commits when the box loses focus (a click on any button blurs it
   first), `pending` hands whatever is still uncommitted to the parent so the generate
   press can fold it in before the request is built, and the box clears itself once its
   text has become a chip by any of those routes. */
function DiChipList({value,onChange,placeholder,tone,pending}){
  const[txt,setTxt]=useState('');
  const list=Array.isArray(value)?value:[];
  useEffect(()=>{if(pending)pending.current=txt;},[txt,pending]);
  useEffect(()=>()=>{if(pending)pending.current='';},[pending]);
  useEffect(()=>{const v=txt.trim();
    if(v&&list.some(x=>x.toLowerCase()===v.toLowerCase()))setTxt('');
    // eslint-disable-next-line
  },[value]);
  const add=()=>{const v=txt.trim();if(!v)return;
    if(!list.some(x=>x.toLowerCase()===v.toLowerCase()))onChange([...list,v]);
    setTxt('');};
  return(<div className="di-chiplist">
    <div className="di-chipin">
      <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder={placeholder}
        onBlur={add}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/>
      <button type="button" className="di-chipadd" onClick={add} disabled={!txt.trim()}
        aria-label={L('Ekle','Add')}>＋</button>
    </div>
    {list.length>0&&<div className="di-chips">
      {list.map((x,i)=><span key={i} className={'di-tag '+(tone||'')} title={x}><span>{x}</span>
        <button type="button" onClick={()=>onChange(list.filter((_,k)=>k!==i))} aria-label={L('Kaldır','Remove')}>✕</button></span>)}
    </div>}
  </div>);
}

/* Today's priorities. ONE box: pressing it opens a list that stays open while several
   qualities are ticked, grouped the way DI_PRIORITIES groups them. The old shape was one
   dropdown per quality plus "+ Ek öncelik ekle" for each further one — three priorities
   cost three separate opens and two extra presses. The order they are ticked in is still
   the order they are read, and each picked quality sits under the box as a chip with its
   own ✕. A click outside the list, or Escape, closes it. */
function DiPriorityPicker({value,onChange}){
  const list=(Array.isArray(value)?value:[]).filter(diPrioRow);
  const[open,setOpen]=useState(false);
  const wrap=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const away=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    const esc=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',away);
    document.addEventListener('keydown',esc);
    return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',esc);};
  },[open]);
  const toggle=id=>onChange(list.includes(id)?list.filter(x=>x!==id):[...list,id]);
  return(<div className="di-conwrap di-prio" ref={wrap}>
    <button type="button" className={'di-condrop'+(open?' on':'')} onClick={()=>setOpen(o=>!o)}
      aria-haspopup="listbox" aria-expanded={open}>
      <span>{list.length
        ?(list.length===1?diPrioLabel(list[0]):L(`${list.length} öncelik seçili`,`${list.length} priorities selected`))
        :L('— öncelik seç','— pick priorities')}</span>
      <i>{open?'▲':'▼'}</i>
    </button>
    {open&&<div className="di-conmenu" role="listbox" aria-multiselectable="true">
      {DI_PRIORITIES.map(g=><div key={g.group[0]} className="di-prio-grp">
        <div className="di-prio-gh">{L(g.group[0],g.group[1])}</div>
        {g.items.map(p=>{const on=list.includes(p.id);
          return<div key={p.id} className={'di-conitem'+(on?' on':'')} role="option" aria-selected={on}
            tabIndex={0} onClick={()=>toggle(p.id)}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(p.id);}}}>
            <span className="di-conbox">{on?'✓':''}</span>
            <span className="di-connm">{L(p.label[0],p.label[1])}</span>
            {on&&list.length>1?<span className="di-prio-ord">{list.indexOf(p.id)+1}</span>:null}
          </div>;})}
      </div>)}
    </div>}
    {list.length>0&&<div className="di-chips">
      {list.map((id,i)=><span key={id} className="di-tag prio" title={diPrioLabel(id)}>
        {list.length>1?<b className="di-prio-ord">{i+1}</b>:null}<span>{diPrioLabel(id)}</span>
        <button type="button" onClick={()=>toggle(id)} aria-label={L('Kaldır','Remove')}>✕</button></span>)}
    </div>}
  </div>);
}

/* A number with the answers a coach actually gives beside it. Typing is still allowed —
   the buttons are shortcuts, not the only way in. */
function DiNumberChoice({value,onChange,choices,unit,placeholder,min,max}){
  /* What is in the box while it is being typed in. Emptying the box used to hand
     `null` straight up, the brief fell back to the session's own figure and that figure
     came straight back into the box — so it could never be cleared to type a new
     number. Now an empty box stays empty while it has focus, every real number typed is
     saved as it is typed, and only leaving the box empty hands the field back to auto. */
  const[txt,setTxt]=useState(null);
  const shown=txt!=null?txt:(value==null?'':String(value));
  return(<div className="di-numc">
    <div className="di-numin">
      <input type="number" min={min||1} max={max||999} value={shown}
        onChange={e=>{const t=e.target.value;setTxt(t);
          if(t!==''){const n=Number(t);if(isFinite(n)&&n>0)onChange(n);}}}
        onBlur={()=>{if(txt==='')onChange(null);setTxt(null);}}
        placeholder={placeholder}/>
      <span>{unit}</span>
    </div>
    <div className="di-numbtns">
      {choices.map(c=><button key={c} type="button" className={'di-numb'+(Number(value)===c?' on':'')}
        onClick={()=>{setTxt(null);onChange(c);}}>{c}</button>)}
    </div>
  </div>);
}

/* The brief. Six fields, none of them required, and the line under the heading says
   what an empty one means. Each field is its own small card: the columns of a
   three-across grid have very different heights (a priority list against a number),
   and without a card edge they read as one ragged block of controls. It is stored per
   athlete PER DAY, beside the session it produced, so yesterday's instruction never
   silently drives today's. */
function DiInstructionForm({instr,save,onSnapshot,onImport}){
  const set=(k,v)=>save({...instr,[k]:v});
  /* Whatever is typed in the two chip boxes but not yet turned into a chip. Blur commits
     it on its own, but blur and click land in the same tick and the generate handler
     reads the brief from THIS render — so the pending text is folded in here as well,
     and the request is built from the merged brief rather than from whichever of the two
     updates happened to win. */
  const mustPend=useRef('');
  const avoidPend=useRef('');
  const withPending=()=>{
    const add=(arr,ref)=>{
      const v=String((ref&&ref.current)||'').trim();
      const l=Array.isArray(arr)?arr:[];
      if(!v||l.some(x=>x.toLowerCase()===v.toLowerCase()))return l;
      return[...l,v];
    };
    return{...instr,must:add(instr.must,mustPend),avoid:add(instr.avoid,avoidPend)};
  };
  /* The merged brief, so a chip still being typed is in the copy too. Read-only: it writes nothing but that fold-in. */
  const snapshot=()=>{
    const merged=withPending();
    if(merged.must!==instr.must||merged.avoid!==instr.avoid)save(merged);
    if(onSnapshot)onSnapshot(merged);
  };
  const field=(n,title,hint,control,wide)=>(
    <div className={'di-field'+(wide?' wide':'')}>
      <div className="di-fhd"><i className="di-num">{n}</i>
        <label>{title}</label></div>
      <span className="di-fhint">{hint}</span>
      <div className="di-fctl">{control}</div>
    </div>);
  return(<div className="di-brief">
    <div className="di-fgrid">
      {field(1,L('Bugünün önceliği','Today\'s priority'),
        L('Bugün en çok hangi fiziksel kaliteye odaklanılsın?','Which physical quality should today build?'),
        <DiPriorityPicker value={instr.priorities} onChange={v=>set('priorities',v)}/>)}
      {field(2,L('Mutlaka olsun','Must be in'),
        L('Programda mutlaka yer alsın.','What the session has to carry.'),
        <DiChipList value={instr.must} onChange={v=>set('must',v)} tone="must"
          pending={mustPend}
          placeholder={L('ör. Trap Bar Jump','e.g. trap bar jump')}/>)}
      {field(3,L('Kaçınılacak','Keep out'),
        L('Bugün yapılmasın.','What must not appear today.'),
        <DiChipList value={instr.avoid} onChange={v=>set('avoid',v)} tone="avoid"
          pending={avoidPend}
          placeholder={L('ör. derin squat','e.g. deep squat')}/>)}
      {field(4,L('Seans süresi','Session length'),
        L('Bugünkü S&C seansı için hedef süre.','Target length for today\'s session.'),
        <DiNumberChoice value={instr.duration}
          onChange={v=>save({...instr,duration:v,durationSet:v!=null})} choices={DI_DUR_CHOICES}
          unit={L('dk','min')} placeholder={L('seanstan','auto')} min={10} max={240}/>)}
      {field(5,L('Maks. egzersiz','Exercise ceiling'),
        L('Seansta toplam en fazla kaç egzersiz olsun? (tüm fazlar dahil)','How many exercises in the whole session at most? (all phases)'),
        <DiNumberChoice value={instr.maxExercises}
          onChange={v=>save({...instr,maxExercises:v,maxExercisesSet:v!=null})} choices={DI_EX_CHOICES}
          unit={L('adet','items')} placeholder={L('süreden','auto')} min={1} max={14}/>)}
      {field(6,L('Ek notlar','Notes'),
        L('Bu sporcu için ek not veya talimat.','Anything else the model should know.'),
        <LiveInput className="di-notes" value={instr.notes} onChange={v=>set('notes',v)}
          placeholder={L('ör. bugün maç var, seans hazırlık niteliğinde olsun',
            'e.g. game today, keep it to priming')}/>)}
    </div>

    <div className="di-genbar">
      {onSnapshot&&<button type="button" className="di-snapbtn" onClick={snapshot}
        title={L('Sporcunun o anki bütün güncel verisini ve bu talimatı tek bir JSON olarak verir.',
          'The athlete\'s current data and this brief, as one JSON document.')}>
        <span className="di-gen-t">{L('Sporcu Bilgilerini Al','Get athlete data')}</span>
        <span className="di-gen-s">{L('Güncel veriler + talimat · JSON','Current data + brief · JSON')}</span>
      </button>}
      {onImport&&<button type="button" className="di-snapbtn" onClick={onImport}
        title={L('Başka bir yapay zekânın yazdığı program JSON\'unu yapıştır; program olarak okunur, onayından sonra takvime yazılır.',
          'Paste a programme JSON written by another model; it is read as a session and written to the calendar once you approve it.')}>
        <span className="di-gen-t">{L('AI Programını Yükle','Load AI programme')}</span>
        <span className="di-gen-s">{L('JSON yapıştır · onayla · takvime yaz','Paste JSON · approve · write')}</span>
      </button>}
    </div>
  </div>);
}

/* The session that came back. Read-only on purpose: what is on screen is exactly what
   Write puts on the athlete's calendar, and it is edited there — on the athlete's own
   card, where every other programme in this app is edited.

   Each exercise is numbered inside its block, because a coach reads a session out
   loud ("üçüncü hareket"), and the dose sits in one pill beside the name rather than
   at the far end of a wide card. Where the readiness cut moved a row, the pill carries
   both numbers with an arrow between them. */
const DI_PHASES_LBL={hazirlik:['Hazırlık','Preparation'],ana:['Ana iş','Main work'],
  tamamlayici:['Tamamlayıcı','Complementary']};
/* The athlete's written session, read back off their calendar into the rows the
   programme card draws. What the calendar does not carry (the D-ids an exercise
   answers, its kit, the kind of section) is taken from the loaded programme wherever
   the exercise or section is still the same one. */
function diSessionRows(ses,program){
  const lo=x=>String(x||'').trim().toLowerCase();
  const byName={},kindOf={};
  diProgramRows(program,0).forEach(r=>{
    if(!byName[lo(r.name)])byName[lo(r.name)]=r;
    if(r.block&&r.phase&&!kindOf[lo(r.block)])kindOf[lo(r.block)]=r.phase;
  });
  const out=[];
  ((ses&&ses.blocks)||[]).forEach((b,bi)=>{
    const phases=blkPhases(b);
    const exs=phases.length?sortExsByPhase(b.exercises||[],phases):(b.exercises||[]);
    exs.forEach((e,i)=>{
      if(!String(e.name||'').trim())return;
      const ph=exPhase(e);
      const block=phases.length?(ph?blkPhaseLbl(ph,b):L('Fazsız','Unplaced')):String(b.name||'');
      const src=byName[lo(e.name)]||null;
      const dose={sets:e.sets||'',reps:e.reps||'',duration:e.duration||''};
      out.push({key:e.id||`c${bi}-${i}`,name:e.name,block,phase:kindOf[lo(block)]||undefined,
        pattern:e.pattern||(src&&src.pattern)||'',equipment:exEquipText(src&&src.equipment),
        why:exDesc(e),basis:(src&&src.basis)||[],
        load:e.load||'',tempo:e.tempo||'',rest:e.rest||'',
        prescribed:dose,adjusted:dose,changed:false});
    });
  });
  return out;
}
/* Consecutive rows of the same block and phase, as one block — the way both the card
   and its printout draw a session. */
function diGroupRows(rows){
  const blocks=[];
  (rows||[]).forEach(r=>{
    const last=blocks[blocks.length-1];
    if(last&&last.name===r.block&&last.phase===r.phase)last.rows.push(r);
    else blocks.push({name:r.block,phase:r.phase,rows:[r]});
  });
  return blocks;
}
/* A block's title and, where it says something the title does not, its phase tag. */
function diBlockLabel(b){
  const lbl=b.phase&&DI_PHASES_LBL[b.phase]?L(DI_PHASES_LBL[b.phase][0],DI_PHASES_LBL[b.phase][1]):'';
  if(!b.name)return{title:lbl,tag:''};
  /* "Ana İş" under a block already called Ana İş is a label twice, not a label.
     Spaces come out of the key as well: lowercasing a Turkish İ leaves a
     combining dot behind, which the normaliser turns into a space. */
  const key=x=>diExName(x).replace(/\s+/g,'');
  return{title:b.name,tag:lbl&&key(lbl)!==key(b.name)?lbl:''};
}
const diDose=d=>{
  const reps=d.reps||d.duration||'';
  return d.sets?(reps?`${d.sets}×${reps}`:`${d.sets}×`):(reps||'—');
};
/* The programme on paper: the rows the card draws — the calendar's version once it has
   been edited there — laid out for the gym floor, one exercise to a line, and handed
   straight to the browser's print dialog (which also saves it as a PDF). It is drawn
   out of the same masthead, session banner and phase cards as the calendar's printout
   (rptDocHead · rptSessBanner · rptPhaseCard), so the two sheets are one design.
   `time`, `duration`, `focus` and `rpe` (its target RPE) are the session's own line: the
   calendar's copy once it is written, the plan's before. */
function printDiProgram({ath,date,title,rows,pct,time,duration,focus,rpe}){
  const w=window.open('','_blank','width=960,height=1000');
  if(!w){alert(L('Pop-up engellendi — bu site için pop-up izni ver.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const a=ath||{};
  const blocks=diGroupRows(rows).map(b=>{
    const bl=diBlockLabel(b);
    const trs=b.rows.map((r,k)=>{
      const d=r.changed
        ?`<s>${esc(diDose(r.prescribed))}</s> → <b>${esc(diDose(r.adjusted))}</b>`
        :`<b>${esc(diDose(r.adjusted))}</b>`;
      return`<tr><td class="n">${k+1}</td>
        <td class="ex"><div class="pc-nm">${esc(r.name)}</div>${r.why?`<div class="pc-why">${esc(r.why)}</div>`:''}</td>
        <td class="ds">${d}${r.distance?`<div class="pc-dd">${esc(r.distance)}</div>`:''}</td>
        <td>${esc(r.load)||'—'}</td><td>${esc(r.tempo)||'—'}</td><td>${esc(r.rest)||'—'}</td></tr>`;
    }).join('');
    return rptPhaseCard(bl.title,bl.tag,trs);
  }).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(a.name||'')}</title>
<style>
@page{size:A4 portrait;margin:10mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--accent:#9aab3a;--border:#e5e7eb;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099;--bg2:#f4f5f7}
body{color:var(--text);font-size:11px;line-height:1.4;background:#fff;padding:0 2px}
${RPT_HEAD_CSS}
${RPT_PHASE_CSS}
.bs{padding:10px 16px}
.bs .pc-card:last-child{margin-bottom:0}
.adj{font-size:9.5px;color:var(--muted);margin:0 2px 10px}
.ft{margin-top:6px;font-size:9px;color:var(--dim);display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px}
.print-bar{position:fixed;top:0;left:0;right:0;background:#0a0b0d;color:#fff;padding:12px;text-align:center;font-size:12px;z-index:9999}
.print-bar button{background:var(--accent);color:#0a0b0d;border:none;padding:7px 16px;border-radius:7px;font-weight:600;cursor:pointer;margin:0 4px;font-size:12.5px}
.print-bar button.sec{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}
@media print{.print-bar,.scr-sp{display:none}}
</style></head><body>
<div class="print-bar">${L('Program hazır','The programme is ready')} · <button onclick="window.print()">${L('Yazdır / PDF','Print / Save as PDF')}</button> <button class="sec" onclick="window.close()">${L('Kapat','Close')}</button></div>
<div class="scr-sp" style="height:66px"></div>
${rptDocHead(esc(a.name||'—'),fdLong(date),
  rptHeadStats(rptVolStats((rows||[]).map(r=>({name:r.name,sets:r.adjusted&&r.adjusted.sets,reps:r.adjusted&&r.adjusted.reps,load:r.load}))),
    ...sesRpeRange({rpeTarget:rpe})),teamLogo())}
<div class="sess">
${rptSessBanner({no:1,nameHTML:esc(title),time,duration,purpose:focus,
  meta:[{lbl:L('Pozisyon','Position'),val:a.position?posOf(a.position):''}]})}
<div class="bs">
${pct?`<div class="adj">${L(`Hazır oluşa göre hacim ayarı %${Math.abs(pct)} uygulandı — üstü çizili değer modelin yazdığı, kalın olan uygulanacak olan.`,
  `The readiness adjustment of ${Math.abs(pct)}% has been applied — the struck value is what the model wrote, the bold one is what is done.`)}</div>`:''}
${blocks||`<div class="adj">${L('Programda egzersiz yok.','The programme has no exercises.')}</div>`}
</div>
</div>
<div class="ft"><span>${esc(title)}</span><span>CoachOS · ${esc(fdL(date))}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},400);
}
function DiProgramView({program,rows,adj,libMap,onAddToLibrary,diffs}){
  const blocks=diGroupRows(rows);
  const dose=diDose;
  /* The D-ids an exercise cites, spelled out on hover — the card no longer lists them. */
  const diffText=id=>{const d=(diffs||[]).find(x=>x.id===id);return d?d.text:undefined;};
  return(<div className="di-prog">
    {blocks.map((b,i)=>{const bl=diBlockLabel(b);return <div key={i} className="di-progblk">
      {bl.title&&<div className="di-blkh">
        <span>{bl.title}</span>
        {bl.tag?<i className={'di-phase '+b.phase}>{bl.tag}</i>:null}
      </div>}
      {b.rows.map((r,k)=><div key={r.key} className="di-prow">
        <span className="di-pnum">{k+1}</span>
        <div className="di-prow-main">
          <div className="di-prow-nm">
            <b>{r.name}</b>
            {(() => {
              /* "In the library" is read off the library as it is NOW, not off what the
                 answer claimed: an exercise filed from this row a second ago is in it. */
              const inLib=!!(libMap&&libMap[String(r.name||'').trim().toLowerCase()]);
              return inLib
                ?<i className="di-src library">{L('kütüphane','library')}</i>
                :<><i className="di-src custom">custom</i>
                  {onAddToLibrary&&<button type="button" className="di-addlib"
                    onClick={()=>onAddToLibrary(r)}
                    title={L('Bu egzersizi egzersiz kütüphanesine ekler; hareket paterni de kaydedilir.',
                      'Files this exercise in the library, with its movement pattern.')}>
                    ＋ {L('kütüphaneye ekle','add to library')}</button>}</>;
            })()}
            {r.pattern?<i className="di-pat">{r.pattern}</i>:null}
            {r.equipment?<i className="di-eqt">{r.equipment}</i>:null}
          </div>
          {/* The ids this exercise says it answers, beside the reason it gives. Two
              lines that disagree are the useful case: a rationale about ankle mobility
              citing the differentiator about a painful knee is visible here and
              nowhere else. */}
          {(r.why||(r.basis||[]).length>0)&&<div className="di-prow-why">
            {(r.basis||[]).map(b=><i key={b} className="di-basis" title={diffText(b)}>{b}</i>)}
            {r.why||''}</div>}
        </div>
        <div className="di-prow-right">
          <span className={'di-dose'+(r.changed?' cut':'')}>
            {r.changed
              ?<><s>{dose(r.prescribed)}</s><em>→</em><b>{dose(r.adjusted)}</b></>
              :<b>{dose(r.adjusted)}</b>}
          </span>
          <div className="di-pmeta">
            {r.distance?<span>{r.distance}</span>:null}
            {r.load?<span>{r.load}</span>:null}
            {r.tempo?<span>{r.tempo}</span>:null}
            {r.rest?<span>{L('dinlenme','rest')} {r.rest}</span>:null}
          </div>
        </div>
      </div>)}
    </div>;})}
    {adj&&adj.pct?<div className="di-progadj">
      {L(`Hazır oluşa göre hacim ayarı %${Math.abs(adj.pct)} uygulandı — üstü çizili değer modelin yazdığı, kalın olan takvime yazılacak olan.`,
        `The readiness adjustment of ${Math.abs(adj.pct)}% has been applied — the struck value is what the model wrote, the bold one is what gets written.`)}
    </div>:null}
  </div>);
}

/* One computed tile. Label, value, an optional meter where the number is a ratio
   against a known limit, and a sub-line that carries the word for the state — a tile
   never leaves its meaning to colour alone, so the band, the zone and the reason are
   spelled out beside the dot. `tone` is the status role, not a hue chosen per tile. */
function DiTile({label,value,unit,sub,tone,fill,title,text}){
  return(<div className={'di-box'+(tone?' t-'+tone:'')} title={title||undefined}>
    <div className="di-k">{label}</div>
    <div className={'di-v'+(text?' txt':'')}>{value}{unit?<small>{unit}</small>:null}</div>
    {fill!=null&&<div className="di-meter"><span style={{width:`${Math.max(0,Math.min(100,fill))}%`}}/></div>}
    {sub?<div className="di-sub">{tone?<i className="di-dot"/>:null}{sub}</div>:null}
  </div>);
}
/* A section of the card: the three acts a coach reads in order — what today looks
   like, what they are asking for, and what came back. */
function DiSection({n,title,meta,children,className}){
  return(<section className={'di-sec'+(className?' '+className:'')}>
    <header className="di-sech">
      <span className="di-secn">{n}</span>
      <h4>{title}</h4>
      {meta?<span className="di-secmeta">{meta}</span>:null}
    </header>
    {children}
  </section>);
}

/* ---- "Sporcu Bilgilerini Al" — the athlete as one JSON document ------------
   Everything a coach would paste into an outside model to have a session written for
   this athlete: the profile, this morning's check-in, the RPE log, every current test
   result with the coach's own comments on it, pain and injury, the gym's kit, this
   week's calendar and today's brief.

   BUILT AT THE PRESS, NEVER CACHED. The caller hands in the athlete record as it
   stands on this render and the brief with whatever is still sitting in a chip box,
   and nothing here is memoised — so a check-in that landed a minute ago, a test typed
   in another tab or a chip added just now is in the next copy.

   "Current" means current per field, not per record: the latest test may carry only a
   weigh-in while the FMS was screened a month earlier, and both are this athlete's
   current numbers. So every value is the most recent one on record up to the day,
   with the date it was taken beside it. Empty fields are dropped rather than sent as
   blanks; what the app holds nothing for is listed under `missing_data`. */
const SNAP_DAYS_EN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SNAP_SEX={M:['Erkek','Male'],F:['Kadın','Female']};
const snapSexLabel=v=>SNAP_SEX[v]?L(SNAP_SEX[v][0],SNAP_SEX[v][1]):null;
/* Drops '', null, undefined, empty arrays and empty objects, all the way down. */
function snapClean(v){
  if(Array.isArray(v)){const a=v.map(snapClean).filter(x=>x!==undefined);return a.length?a:undefined;}
  if(v&&typeof v==='object'){
    const o={};
    Object.keys(v).forEach(k=>{const x=snapClean(v[k]);if(x!==undefined)o[k]=x;});
    return Object.keys(o).length?o:undefined;
  }
  if(v==null)return undefined;
  if(typeof v==='string'){const t=v.trim();return t?t:undefined;}
  if(typeof v==='number'&&!isFinite(v))return undefined;
  return v;
}
/* Saves a JSON text as a file named after what it holds. */
function snapDownloadText(text,base,date){
  const safe=String(base||'sporcu').trim().replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_+|_+$/g,'')||'sporcu';
  const blob=new Blob([text],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safe}_${date}.json`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
/* The JSON on screen: one athlete's from the brief, or the whole sheet's from the bar. */
function DiJsonModal({title,date,snap,setSnap,fileBase}){
  if(!snap)return null;
  return ReactDOM.createPortal(<div className="modal-bg" onClick={()=>setSnap(null)}>
    <div className="modal di-snap" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="modal-head">
        <h2 style={{margin:0,fontSize:16,flex:1}}>{title}
          <span className="di-dim" style={{fontSize:12,fontWeight:500,marginLeft:8}}>{L('program günü','session day')}: {fd(date)}</span></h2>
        <button className="x-btn" onClick={()=>setSnap(null)} aria-label={L('Kapat','Close')}>✕</button>
      </div>
      <div className="di-snap-bar">
        <span className="di-dim">{snap.copied===true?L('Panoya kopyalandı. ','Copied to the clipboard. ')
          :snap.copied===false?L('Otomatik kopyalanamadı — Kopyala\'ya bas. ','Could not copy automatically — press Copy. '):''}
          {snap.note?snap.note+' ':''}
          {L('Butona her bastığında o anki güncel verilerden yeniden oluşturulur.','Rebuilt from the current data on every press.')}</span>
        <button type="button" className="btn xs" onClick={()=>snapCopy(snap.text).then(ok=>setSnap(x=>x?{...x,copied:ok}:x))}>
          {L('Kopyala','Copy')}</button>
        <button type="button" className="btn xs sec" onClick={()=>snapDownloadText(snap.text,fileBase,date)}>{L('İndir (.json)','Download (.json)')}</button>
      </div>
      <pre className="di-snap-pre">{snap.text}</pre>
    </div>
  </div>,document.body);
}
/* Resolves true when the text reached the clipboard. The async API first; the old
   textarea route where it is missing or refused (plain http, an in-app browser). */
function snapCopy(text){
  const fallback=()=>{
    try{
      const ta=document.createElement('textarea');
      ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');document.body.removeChild(ta);return!!ok;
    }catch(e){return false;}
  };
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(()=>true,()=>fallback());
  }catch(e){}
  return Promise.resolve(fallback());
}
function diAthleteSnapshot({ath,setup,date,instr,customTests,now,session,libMap,recent}){
  return diInEnglish(()=>{
  const a=ath||{},s=setup||{};
  const ref=date||fmt(today);
  const byDate=(x,y)=>String(x.date).localeCompare(String(y.date));
  const upTo=list=>[...(list||[])].filter(r=>r&&r.date&&r.date<=ref).sort(byDate);
  /* Built here rather than taken from the caller: every label the bundle carries is
     read in the language it is built in, and the export is English whatever the page
     is showing. */
  const b=diBundle(a,s,ref,{libMap:libMap||undefined});
  const age=b.athlete&&b.athlete.age!=null?b.athlete.age:null;

  /* Measured data — tests and body readings — is always the NEWEST on record, whatever
     day the session is for: a test taken after the picked day is still this athlete's
     current number, and a JSON that held the latest test back read as if it had never
     been entered. Older tests only fill in a measure the newest one did not take. */
  const allDated=list=>[...(list||[])].filter(r=>r&&r.date).sort(byDate);
  /* Body: the latest reading of each measure across the body-composition log and the
     test sheets (a weigh-in is often only on one of them), falling back to the card. */
  const bodyRows=allDated([...(a.measurements||[]),...(a.tests||[])]);
  const latestBody=(k,card)=>{
    for(let i=bodyRows.length-1;i>=0;i--){const v=recNum(bodyRows[i][k]);if(v!=null)return{value:v,date:bodyRows[i].date};}
    const c=recNum(card);return c!=null?{value:c,date:null,source:'athlete card'}:null;
  };
  const height=latestBody('height',a.height),weight=latestBody('weight',a.weight),fat=latestBody('bodyFat',null);

  /* The check-in. The latest one on record, however old, with how old it is — a
     four-day-old morning is still information, as long as it says it is four days old. */
  const ws=upTo(a.wellness);
  const lastW=ws[ws.length-1]||null;
  const wAge=lastW?diffD(lastW.date,ref):null;
  const wFrom=fmt(addD(parseD(ref),-6));
  const week=ws.filter(w=>w.date>=wFrom);
  /* The engine keeps a baseline for its own fields; mental and physical fatigue are
     not among them, so theirs is read here the same way. */
  const base=id=>{
    const x=((b.wellness&&b.wellness.baselines)||[]).find(y=>y.field===id);
    if(x)return x;
    const d=diBaseline(a,id,ref);
    return d.baseline!=null?{baseline:d.baseline,deviation_pct:d.deviation}:null;
  };
  const scale='1-5 (5 = best)';
  /* One field against the athlete's own average. Its day-by-day values are in
     wellness.last_7_days and not repeated here; a field never answered is left out
     whole rather than sent as a name with nothing under it. */
  const wField=(id,name)=>{
    const last=[...ws].reverse().find(w=>recNum(w[id])!=null)||null;
    if(!last)return null;
    const bl=base(id);
    const v=recNum(last[id]),avg=bl?recNum(bl.baseline):null;
    return{
      name,
      latest_value:v,
      date:last.date,
      days_ago:diffD(last.date,ref),
      scale:id==='RHR'?'bpm (above the personal average is worse)':null,
      personal_average:avg,
      /* Of the value printed beside it. The engine's own deviation is of the mean of the
         last three days, and written next to latest_value it read as that value's
         deviation — a 4.5 against an average of 4.13 went out as +1.1 %. */
      deviation_from_average_pct:(v!=null&&avg)?Math.round((v-avg)/avg*1000)/10:null,
    };
  };
  const painRegions=((b.pain&&b.pain.regions)||[]);

  /* RPE: the athlete's own log, per slot, for the last seven days — plus the load
     figures the rest of the app reads off it. */
  const srpe=upTo(a.srpeLog).filter(e=>e.date>=wFrom);
  const KIND={tp:'Team practice',sc:'Strength & conditioning',game:'Game'};
  const slot=(e,k)=>{
    const r=recNum(e[k+'RPE']),d=recNum(e[k+'Duration']);
    return(r==null&&d==null)?null:{type:KIND[k],rpe:r,duration_min:d,load_au:(r!=null&&d!=null)?Math.round(r*d):null};
  };
  const ld=b.load||{};

  /* Tests: every metric the comparison table knows (the coach's own tests included),
     each at its most recent value. */
  const tests=allDated(a.tests);
  const newest=(get)=>{for(let i=tests.length-1;i>=0;i--){let v=null;try{v=get(tests[i]);}catch(e){}if(v!=null)return{v,t:tests[i]};}return null;};
  const groups={};
  cmpMetrics(customTests||[]).forEach(m=>{
    const hit=newest(m.get);
    if(!hit)return;
    const g=CMP_GROUPS.find(x=>x.id===m.g);
    const gk=g?g.en:m.g;
    /* Height, weight and body fat are on the athlete block already, newest reading
       and date included. */
    if(gk==='Anthropometry'&&/^(height|weight|body fat)$/i.test(cmpLabel(m)))return;
    (groups[gk]=groups[gk]||[]).push({test:cmpLabel(m),value:hit.v,unit:m.u||null,date:hit.t.date});
  });
  const fmsHit=newest(t=>{const r=fmsCalc(t.fms);return r.n?r:null;});
  const fms=fmsHit?{
    /* The ceiling of what was actually scored (3 per movement), not the full 21: a
       two-movement screen totalling 4 is 4 of 6, not a poor FMS. */
    date:fmsHit.t.date,total:fmsHit.v.total,movements_scored:fmsHit.v.n,max:fmsHit.v.n*3,
    complete:fmsHit.v.n>=7,
    note:fmsHit.v.n<7?`Only ${fmsHit.v.n} of the 7 FMS movements were scored; total and max cover those movements only.`:null,
    movements:fmsHit.v.items.filter(i=>i.filled).map(i=>({movement:i.en,score:i.score,
      right:i.right,left:i.left,asymmetry:i.asym,
      clearing_test:(i.clear&&i.cleared)?(i.cleared==='pos'?'positive (painful)':'negative'):null}))}:null;
  const circHit=newest(t=>{const c=t.circ||{};return Object.keys(c).some(k=>recNum(c[k])!=null)?c:null;});
  const CIRC=[['shoulder','Shoulder'],['waist','Waist'],['hip','Hip'],['thighRight','Thigh R'],
    ['thighLeft','Thigh L'],['calfRight','Calf R'],['calfLeft','Calf L']];
  /* The coach's comments: each comment box at its most recent non-empty entry, word
     for word, with the date of the sheet it was written on. */
  const notes=[],seenNote=new Set();
  for(let i=tests.length-1;i>=0;i--){
    diObservations(tests[i]).sources.forEach(o=>{
      if(seenNote.has(o.alan))return;
      seenNote.add(o.alan);notes.push({field:o.alan,comment:o.metin,date:tests[i].date});
    });
  }
  const lastTest=tests[tests.length-1]||null;

  /* Injury records, whole — the coach's notes on them included. */
  const injRow=i=>({type:i.type,location:i.location||i.area,side:i.side,tissue:i.tissueType||i.diagnosis,grade:i.grade,
    mechanism:i.mechanism,context:i.context,date:i.date||i.firstInjuryDay,status:i.status,
    rtp_stage:i.rtpStage?((diRtpRow(i.rtpStage)||{label:[i.rtpStage,i.rtpStage]}).label[1]):null,
    restrictions:i.restrictions,estimated_return:i.estimatedReturn||i.expectedReturn,actual_return:i.actualReturn,notes:i.notes});
  const allInj=(a.injuries||[]).filter(i=>i&&diInjOnsetBy(i,ref));
  const activeInj=allInj.filter(i=>!i.actualReturn&&(!i.status||i.status!=='Recovered'));
  const pastInj=allInj.filter(i=>!activeInj.includes(i));

  /* The week the day sits in, Monday to Sunday, as the athlete's own calendar holds it
     (team sessions are mirrored onto it, so this is what the athlete actually has). */
  const mon=sow(parseD(ref));
  const comps=(s.competitions||[]).filter(c=>c&&c.date);
  const exRow=(e,bl)=>({name:e.name,phase:blkPhases(bl).includes(exPhase(e))?(blkPhaseLbl(exPhase(e),bl)||null):null,sets:e.sets,reps:e.reps,duration:e.duration,
    tempo:e.tempo,rpe:e.rpe,load:e.load,rest:e.rest,notes:e.notes});
  const calendar=[];
  for(let k=0;k<7;k++){
    const dk=fmt(addD(mon,k));
    const day=(a.days||{})[dk]||{};
    const comp=comps.filter(c=>c.date===dk).map(c=>c.name||'Game');
    calendar.push({date:dk,weekday:SNAP_DAYS_EN[k],is_session_day:dk===ref||null,
      games:comp.length?comp:null,
      sessions:(day.sessions||[]).map(x=>({name:x.name,time:x.time,duration_min:recNum(x.duration),load_type:x.loadType,
        purpose:x.purpose,focus:x.focus,sub_focus:x.sub,region:x.region,team_session:x.sourceId?true:null,
        srpe:recNum(x.sRPE),notes:x.notes,plan_note:x.planNote,
        blocks:(x.blocks||[]).filter(bl=>bl&&!bl.removed).map(bl=>({name:bl.name,
          exercises:(bl.exercises||[]).filter(e=>String(e.name||'').trim()).map(e=>exRow(e,bl))}))})),
      daily_notes:day.dailyNotes});
  }
  const eq=eqAvailable(s);
  /* THE DAY THE SESSION IS FOR — first, because every number below is read against
     it. It is the date picked on the page, which need not be today: a coach writing
     Thursday's session on Tuesday gets Thursday here, and how far off it is. */
  const nowD=new Date(now||Date.now());
  const todayKey=fmt(new Date(nowD.getFullYear(),nowD.getMonth(),nowD.getDate()));
  const offset=diffD(todayKey,ref);
  const wd=(parseD(ref).getDay()+6)%7;
  const cp=b.competition||{};
  const ses=session||null;
  const target={
    date:ref,
    weekday:SNAP_DAYS_EN[wd],
    relative_to_today:offset===0?'today':offset===1?'tomorrow':offset===-1?'yesterday'
      :offset>0?`in ${offset} days`:`${-offset} days ago`,
    match_day_label:cp.md,
    game_on_the_day:cp.today?(cp.today.name||'Game'):null,
    next_game:cp.next?{date:cp.next.date,name:cp.next.name,days_until:cp.next.days_until}:null,
    previous_game:cp.previous?{date:cp.previous.date,name:cp.previous.name,days_since:cp.previous.days_since}:null,
    season_phase:b.season_phase&&b.season_phase.label,
    season_phase_focus:b.season_phase&&b.season_phase.focus,
    source_session:ses?{name:ses.name,time:ses.time,duration_min:recNum(ses.duration),focus:ses.focus,region:ses.region}:null,
  };

  /* What an outside model needs in order to write a session CoachOS will accept: the
     same differentiators and code-checked limits the in-app writer is given, and the
     answer's shape. The validator reads the answer against exactly these on import. */
  const brief=instr||diInstr(null,null);
  const deficitsX=diDeficits(a,ref);
  const diffsX=diDifferentiators(a,b,deficitsX,ref);
  const blockedX=diBlockedPatterns(b);
  const blockedSetX=diBlockedSet(blockedX);
  const restrX=diRestrictions(b,brief);
  const plyoX=diPlyoCeiling(b);
  const capsX=diTierCaps(b.tier&&b.tier.gecerli);
  /* The engine's own records carry Turkish source tags the validator compares
     against; they are translated on the way out, never at the source. */
  const SRC_EN={'check-in ağrı bildirimi':'check-in pain report','koç kısıt etiketi':'coach constraint tag',
    'sakatlık kaydı':'injury record','antrenör talimatı':'coach brief','ölçüm':'measurement'};
  const PRIO_EN={'yüksek':'High','orta':'Medium','düşük':'Low'};
  const limits={
    blocked_patterns:blockedX.map(x=>({region:x.bolge,severity_0_5:x.siddet_0_5,source:SRC_EN[x.kaynak]||x.kaynak,
      standing:x.kalici,blocked_patterns:x.yasak_paternler,redirect_to_patterns:x.yonlendirilecek_paternler})),
    /* A pattern whose own name is a hard-restriction term ("squat" → Squat) is not
       offered as open: every exercise in it that says so in its name is blocked. */
    available_patterns:IV_PATTERNS.filter(p=>!blockedSetX.has(p)&&
      !restrX.some(r=>diExName(p).split(' ').some(w=>(r.terimler||[]).includes(w)))),
    available_patterns_note:'Open as far as pain, injury and the coach\'s restrictions allow. hard_restrictions still apply by exercise name inside every pattern.',
    hard_restrictions:restrX.map(r=>({source:SRC_EN[r.kaynak]||r.kaynak,region:r.bolge,rtp_stage:r.rtp,text:r.metin,match_terms:r.terimler})),
    /* How the check reads a restriction — word by word, not as a phrase — said here so
       "deep squat" is not taken to leave every other squat open. */
    hard_restriction_matching_rule:restrX.length?'An exercise violates a restriction when ANY ONE of the words in match_terms appears in its name as a whole word '+
      '(or the whole text does). E.g. a "deep squat" restriction covers every exercise with "squat" in its name.':null,
    tier_caps:capsX?{current_tier:b.tier.gecerli,tier_scale:DI_TIER_SCALE,max_sets_per_exercise:capsX.max_sets,max_main_phase_exercises:capsX.max_main,
      plyometric_note:plyoX?(capsX.plyo_note_en||capsX.plyo_note):null,
      note:'max_sets_per_exercise is the set ceiling of a single exercise row; max_main_phase_exercises is the ceiling on the number of exercises in the main phase.'}:null,
    plyometric_contact_limit:plyoX?{min:plyoX.min,max:plyoX.max,group:plyoX.grup,
      note:'Total ground contacts (sets × reps, only rows in the Jump / Plyo pattern) may not exceed this ceiling.'}:null,
    session_duration_min:brief.duration,
    minutes_per_exercise:DI_MIN_PER_EX,
    minutes_per_exercise_note:brief.duration==null?null:'Session length is computed as the number of exercises × minutes_per_exercise (all phases included) and compared with session_duration_min.',
    session_max_exercises:brief.maxExercises,
    volume_adjustment_pct:b.adjustment?b.adjustment.pct:null,
    volume_adjustment_reasons:b.adjustment?b.adjustment.reasons.map(r=>`${r.label} (${r.pct}%)`):null,
  };

  /* The Athlete Training Profile — the coach's priorities, movement profile and
     constraints, and the exposure the calendar shows — as the ground the session is
     written on. It describes the athlete; the model reads it, nothing here acts on it. */
  const atp=atpSnapshot(a,ref,libMap||null,s);
  const out={
    session_day:target,
    task:DI_EXT_TASK,
    generated_at:nowD.toISOString(),
    athlete:{
      id:a.id,name:a.name,jersey_number:a.number,
      age,date_of_birth:a.dateOfBirth,
      sex:snapSexLabel(a.sex),
      height_cm:height,body_weight_kg:weight,body_fat_pct:fat,
      position:b.athlete&&b.athlete.position,position_group:b.athlete&&b.athlete.position_group,
      training_age_years:b.athlete&&b.athlete.training_age_years,
      level:b.athlete&&b.athlete.level,body_type:b.athlete&&b.athlete.vucut_tipi,
      sport:s.sport,
      /* Context for the role, not a prescription from it (§4.3). */
      position_emphasis:b.athlete&&b.athlete.position_qualities,
    },
    training_profile:atp.out,
    wellness:{
      latest_checkin:lastW?{date:lastW.date,days_ago:wAge,
        readiness:recNum(lastW.readiness),sleep:recNum(lastW.sleep),fatigue:recNum(lastW.fatigue),
        mental_fatigue:recNum(lastW.mentalFatigue),physical_fatigue:recNum(lastW.physicalFatigue),
        muscle_soreness:recNum(lastW.soreness),stress:recNum(lastW.stress),mood:recNum(lastW.mood),
        resting_hr_bpm:recNum(lastW.RHR),pain_area_note:painFreeText(lastW.areaOfPain)}:null,
      scale,
      readiness:b.readiness?{score:b.readiness.score,status:b.readiness.status,source:b.readiness.source,
        date:b.readiness.checkin_date,signals:b.readiness.signals}:null,
      last_7_days:week.map(w=>({date:w.date,readiness:recNum(w.readiness),sleep:recNum(w.sleep),
        fatigue:recNum(w.fatigue),mental_fatigue:recNum(w.mentalFatigue),physical_fatigue:recNum(w.physicalFatigue),
        muscle_soreness:recNum(w.soreness),resting_hr_bpm:recNum(w.RHR)})),
    },
    rpe:{
      /* The last entry is already the last day of last_7_days when it falls in that
         week; it is written out only when it is older than that. */
      latest_entry:(ld.last&&!srpe.some(e=>e.date===ld.last.date))?{date:ld.last.date,type:KIND[ld.last.kind]||ld.last.kind,rpe:ld.last.rpe,duration_min:ld.last.duration,srpe_au:ld.last.srpe}:null,
      avg_rpe_3_days:ld.rpe3,avg_rpe_7_days:ld.rpe7,avg_rpe_previous_7_days:ld.rpe_prev7,trend:ld.trend,
      srpe_7_days_au:ld.srpe7,srpe_previous_7_days_au:ld.srpe_prev7,load_change_pct:ld.load_change_pct,
      acwr:ld.acwr,acwr_zone:ld.acwr_zone,
      /* The chronic side is averaged over the history the 28-day window actually holds,
         so with a week or less of it the ratio is acute over itself — 1.0, "optimal",
         whatever the load was. Said, so it is not read as a measured balance. */
      acwr_note:(()=>{const h=loadWindows(k=>athDayLoad(a,k),ref).hist;
        return ld.acwr!=null&&h<=7?`Only ${h} day(s) of load history in the 28-day window: acute and chronic cover the same days, so ACWR is 1.0 by construction and says nothing yet.`:null;})(),
      monotony:ld.monotony,hard_days_7:ld.hard_days_7,
      last_7_days:srpe.map(e=>({date:e.date,
        sessions:[slot(e,'tp'),slot(e,'sc'),slot(e,'game')].filter(Boolean),
        total_load_au:recNum(e.totalLoad)})),
    },
    sleep:wField('sleep','Sleep'),
    fatigue:wField('fatigue','Fatigue (mean of mental + physical)'),
    mental_fatigue:wField('mentalFatigue','Mental fatigue / stress'),
    physical_fatigue:wField('physicalFatigue','Physical fatigue'),
    muscle_soreness:wField('soreness','Muscle soreness'),
    resting_heart_rate:wField('RHR','Resting heart rate'),
    tests:{
      latest_test_date:lastTest?lastTest.date:null,
      test_record_count:tests.length,
      results:groups,
      fms:fms,
      circumferences_cm:circHit?{date:circHit.t.date,
        measurements:CIRC.map(([k,n])=>recNum(circHit.v[k])!=null?{site:n,value:recNum(circHit.v[k])}:null).filter(Boolean)}:null,
      overhead_squat_compensations:(()=>{const h=newest(t=>((t.ohs&&t.ohs.problems)||[]).filter(x=>String(x||'').trim()).length
        ?t.ohs.problems.filter(x=>String(x||'').trim()):null);return h?{date:h.t.date,list:h.v}:null;})(),
      comments:notes,
      deviations_from_personal_average:DI_TEST_METRICS.map(m=>diTestBaseline(a,m,null)).filter(x=>x&&x.baseline!=null)
        .map(x=>({test:L(x.label[0],x.label[1]),current:x.current,personal_average:x.baseline,
          deviation_pct:x.deviation,unit:x.unit.trim()||null,date:x.date,readings:x.n})),
    },
    pain_and_injury:{
      current_pain:painRegions.map(r=>({region:r.label,severity_0_5:r.severity_0_5,severity_0_3:r.severity_0_3,
        date:r.date,source:r.source,standing_constraint:r.standing||null,trend:((b.pain.trend||[]).find(t=>t.region===r.label)||{}).status})),
      /* The 3D body map as the athlete marked it — exact region, side and grade —
         because the tags above are coarse and some regions (neck, chest, abdomen…)
         have no tag at all. Today's check-in, plus yesterday's regions still carrying. */
      pain_map:(()=>{
        const{today:tw,yesterday:yw}=painCheckinsFor(a,ref);
        const SEV=PAIN_SEV_LABEL(),out=[],seen=new Set();
        const add=(w,carry)=>{if(!w||!w.painMap||typeof w.painMap!=='object')return;
          painEntries(w.painMap).forEach(({region,sev})=>{
            if(seen.has(region)||(carry&&!painCarries(sev)))return;seen.add(region);
            const side=/^Sağ /.test(region)?'right':/^Sol /.test(region)?'left':null;
            out.push({region:painRegionEn(region),side,severity_0_3:sev||null,severity:SEV[sev]||null,date:w.date,
              today:w===tw||null});});};
        add(tw,false);add(yw,true);
        return out;})(),
      peak_pain_0_5:b.pain&&b.pain.peak_severity_0_5,
      athlete_words:b.pain&&b.pain.athlete_words,
      patterns_to_unload:b.pain&&b.pain.patterns_to_unload,
      /* Only patterns the limits leave open: a pattern the coach's brief or a hard
         restriction closes (squat, under "no deep squat") is not offered here as the
         one to steer towards. */
      preferred_patterns:b.pain&&(b.pain.patterns_preferred||[]).filter(p=>limits.available_patterns.includes(p)),
      standing_constraint_note:a.constraints,
      active_injuries:activeInj.map(injRow),
      past_injuries:pastInj.slice(-6).map(injRow),
      recurring_regions:((b.injury&&b.injury.recurrence)||[]).map(r=>({region:r.region,episodes:r.episodes})),
    },
    equipment:diEquipmentForAI(s),
    weekly_calendar:{
      week:`${fmt(mon)} – ${fmt(addD(mon,6))}`,
      days:calendar,
    },
    coach_brief:diBriefForAI(brief),
    differentiators:diffsX.map(d=>({id:d.id,type:d.kind,description:d.text})),
    measured_deficits:((deficitsX&&deficitsX.findings)||[]).map(f=>({area:f.bolge,finding:f.bulgu,
      required_work:f.gereken_calisma,priority:PRIO_EN[f.oncelik]||f.oncelik,measurement:f.olcum,source:SRC_EN[f.kaynak]||f.kaynak})),
    code_checked_limits:limits,
    /* What this athlete was written on the last days this module wrote for them — so
       the answer does not hand them the same session again (rule 23). */
    recent_programs:recent&&recent.length?recent.map(p=>({date:p.tarih,exercises:p.egzersizler,differentiators:p.ayirt_ediciler})):null,
    sport_context:diSportContext(s),
    movement_pattern_vocabulary:[...IV_PATTERNS],
    movement_families:diFamiliesForAI(),
    exercise_library:diLibraryForAI(libMap,s),
    output_format:DI_EXT_SCHEMA,
  };
  const missing=[];
  if(age==null)missing.push('age (no date of birth)');
  if(!snapSexLabel(a.sex))missing.push('sex (not set on the athlete card)');
  if(!height)missing.push('height');
  if(!weight)missing.push('body weight');
  if(!fat)missing.push('body fat');
  if(!out.athlete.position)missing.push('position');
  if(out.athlete.training_age_years==null)missing.push('training age (not set on the athlete card)');
  if(b.tier&&b.tier.yapisal==null)missing.push('structural tier (no screening results — no tier assumed)');
  if(!lastW)missing.push('wellness check-in');
  if(!srpe.length)missing.push('RPE in the last 7 days');
  if(!tests.length)missing.push('test record');
  if(!eq.length)missing.push('equipment inventory');
  if(!atp.filled)missing.push('training profile (no athletic profile or constraints entered)');
  if(!cp.next&&!cp.previous&&!cp.today)missing.push('game schedule (no games on the season calendar — next_game and the game-proximity volume adjustment cannot be computed; a game mentioned only in coach_brief.additional_notes is not in volume_adjustment_pct)');
  const res=snapClean(out)||{};
  if(missing.length)res.missing_data=missing;
  return res;
  });
}

function DailyIndivPanel({plan,bundle,team,updateTeam,srcKey,date,exercises,setup,libMap,writeOne,customTests,calSes}){
  const[snap,setSnap]=useState(null);         // {text, copied} — the athlete-data JSON on screen
  const[imp,setImp]=useState(null);           // {text, err} — the paste box for an outside model's answer
  const panelRef=useRef(null);
  const[err,setErr]=useState('');
  /* Open or folded. Remembered per device, so a coach who works with the panel folded
     away does not have to fold it again on every card. */
  const[open,setOpenRaw]=useState(()=>{try{return localStorage.getItem('coachos_di_open')!=='0';}catch(e){return true;}});
  const setOpen=v=>{setOpenRaw(v);try{localStorage.setItem('coachos_di_open',v?'1':'0');}catch(e){}};
  /* Which face of the panel is up: today and the brief, or the programme. The turn is
     two halves — the face swings out, the other swings in — so the swap happens at the
     point where the card is edge-on and neither face is readable. */
  const[side,setSide]=useState('brief');
  const[flip,setFlip]=useState('');           // '' | 'out' | 'in' — the half of the turn under way
  const flipT=useRef([]);
  useEffect(()=>()=>flipT.current.forEach(clearTimeout),[]);
  const flipTo=next=>{
    if(next===side||flip)return;
    setFlip('out');
    flipT.current=[setTimeout(()=>{setSide(next);setFlip('in');},170),
      setTimeout(()=>setFlip(''),170+280)];
  };
  const review=diReadReview(team,srcKey,plan.ath.id,date);
  const program=diReviewProgram(review);
  const instr=useMemo(()=>diBrief(review&&review.instr,plan.meta),[review,plan.meta]);
  const saveInstr=next=>diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{instr:next});
  const adj=bundle.adjustment;
  const rowPct=program&&program.external?0:adj.pct;
  const rows=useMemo(()=>program?diProgramRows(program,rowPct):[],[program,rowPct]);
  const calEdited=!!(program&&review&&review.decision==='accept'&&calSes&&indivHandEdited(calSes));
  const calRows=useMemo(()=>calEdited?diSessionRows(calSes,program):null,[calEdited,calSes,program]);
  const deficits=useMemo(()=>diDeficits(plan.ath,date),[plan.ath,date]);
  /* Recomputed on every render rather than read back off the stored draft: the
     athlete's day moves under it, and what the coach is looking at has to be judged
     against what is true now. */
  const differentiators=useMemo(()=>diDifferentiators(plan.ath,bundle,deficits,date),
    [plan.ath,bundle,deficits,date]);
  const recent=useMemo(()=>diRecentPrograms(team,plan.ath.id,date),[team,plan.ath.id,date]);
  const peers=useMemo(()=>diPeerPrograms(team,date,plan.ath.id),[team,date,plan.ath.id]);
  const vr=useMemo(()=>program?validateProgram(program,{bundle,instr,setup,libMap,deficits,differentiators,recent,peers}):null,
    [program,bundle,instr,review,setup,libMap,deficits,differentiators,recent,peers]);
  const blocked=!!(vr&&vr.status==='fail');

  /* The handlers below read the panel's CURRENT props through this ref rather than the
     ones captured on an earlier render — a draft saved against a stale copy of the team
     would drop whatever else was written in between. */
  const live=useRef({});
  live.current={plan,bundle,team,updateTeam,srcKey,date,setup,libMap,deficits,differentiators,recent,peers,review};
  /* "Sporcu Bilgilerini Al": rebuilt from the live state on every press — the athlete
     as the team holds them right now, not the copy this card was drawn from — and put
     on the clipboard in the same press, so one click is enough to paste it anywhere. */
  const takeSnapshot=brief=>{
    const L0=live.current;
    const ath=((L0.team&&L0.team.athletes)||[]).find(x=>x.id===L0.plan.ath.id)||L0.plan.ath;
    let text;
    try{
      text=JSON.stringify(diAthleteSnapshot({ath,setup:L0.setup||{},date:L0.date,
        instr:diBrief(brief||instr,L0.plan.meta),customTests,session:L0.plan.meta,libMap:L0.libMap,recent:L0.recent}));
    }catch(e){setErr((e.message||String(e))+' — '+L('sporcu bilgileri okunamadı.','the athlete data could not be read.'));return;}
    setSnap({text,copied:null});
    snapCopy(text).then(ok=>setSnap(x=>x&&x.text===text?{...x,copied:ok}:x));
  };
  /* An outside model's answer, pasted in. Read into the same draft the in-app writer
     produces and checked by the same validator — so it shows in section 3 exactly as a
     generated session does, and reaches the calendar only through "Onayla ve takvime
     yaz", which re-checks it against the athlete's day as it stands at that moment. */
  const importProgram=()=>{
    if(!imp)return;
    const L0=live.current;
    let obj,v;
    try{
      obj=diParseExternalProgram(imp.text,L0.libMap,{id:L0.plan.ath.id,name:L0.plan.ath.name});
      v=validateProgram(obj,{bundle:L0.bundle,instr,setup:L0.setup,libMap:L0.libMap,deficits:L0.deficits,
        differentiators:L0.differentiators,recent:L0.recent,peers:L0.peers});
    }catch(e){setImp(x=>x&&{...x,err:e.message||String(e)});return;}
    const cur=L0.review&&L0.review.program;
    if(cur&&!confirm(L('Bu sporcu için bu güne ait bir program taslağı zaten var. Yapıştırdığın programla değiştirilsin mi?',
      'There is already a draft for this athlete on this day. Replace it with the pasted programme?')))return;
    diWriteReview(L0.team,L0.updateTeam,L0.srcKey,L0.plan.ath.id,L0.date,{
      athlete:L0.plan.ath.id,date:L0.date,src:L0.srcKey,program:obj,instr,
      differentiators:L0.differentiators,validation:v,
      engine:{readiness:L0.bundle.readiness,adjustment:L0.bundle.adjustment,flag:L0.bundle.flag,
        competition:L0.bundle.competition,season_phase:L0.bundle.season_phase,tier:L0.bundle.tier},
      model:'external',created_at:new Date().toISOString(),
      decision:null,decided_at:null,jobId:null,pendingJob:null,
      generation:{source:'external-json'}});
    setImp(null);setErr('');
    /* What was just pasted is what the coach wants to read next: turn the card over to it. */
    flipTo('prog');
    setTimeout(()=>{try{if(panelRef.current)panelRef.current.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},60);
  };
  /* Write is the approval: the coach read the session and said yes, so it is recorded
     as the decision AND put on the athlete's calendar in the same press. */
  const write=()=>{
    if(!program)return;
    /* THE APPROVAL IS NOT THE GATE. The coach saying yes is necessary and it is not
       sufficient: a session that breaks a hard rule is not written, and there is no
       button here that writes it anyway. That is the whole point of the split — the
       coach decides what is GOOD, the code decides what is ALLOWED, and neither
       overrules the other. Re-checked at the press rather than trusted from the
       stored verdict, because the athlete's day moves under a draft. */
    const v=validateProgram(program,{bundle,instr,setup,libMap,deficits,differentiators,recent,peers});
    if(v.status==='fail'){
      diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{validation:v});
      setErr(L(`Bu program ${v.hardViolations.length} sert kuralı ihlal ediyor ve takvime yazılamaz. Aşağıdaki maddeleri gider ya da programı yeniden yükle.`,
        `This session breaks ${v.hardViolations.length} hard rule${v.hardViolations.length>1?'s':''} and cannot be written to the calendar. Clear the items below, or load the programme again.`));
      return;
    }
    diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,
      {decision:'accept',decided_at:new Date().toISOString(),validation:v});
    if(writeOne)writeOne(plan.ath.id,program);
  };
  /* Filing a written exercise into the shared library, through the same bridge the
     calendar's own exercise box uses — so a name filed here is filed exactly as one
     typed on a programme, and its movement pattern rides along. */
  const addLib=row=>{
    const nm=String(row&&row.name||'').trim();
    if(!nm)return;
    addExerciseToLibrary(nm);
    if(row.pattern)rememberExerciseTags(nm,row.pattern,'');
  };
  const undo=()=>diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{decision:null,decided_at:null});
  const discard=()=>{
    if(!confirm(L('Bu program silinsin mi? Talimatlar kalır.','Discard this session? The brief stays.')))return;
    diWriteReview(team,updateTeam,srcKey,plan.ath.id,date,{program:null,decision:null,decided_at:null});
  };

  const rd=bundle.readiness;
  const written=!!(review&&review.decision==='accept');
  /* Status roles, each one paired with the word beside it on the tile: readiness by the
     app's own band colours, ACWR by its own zone table, the game day by how close it is.
     Nothing here invents a threshold — they are the ones the rest of the app reads. */
  const rdTone=rd.score==null?null:(rd.score>=4?'good':rd.score>=3?'warn':'bad');
  const md=bundle.competition.md;
  const mdTone=md==='MD'?'bad':(md==='MD-1'||md==='MD+1')?'warn':null;
  const acwr=bundle.load.acwr;
  const zone=acwr?acwrZoneOf(acwr):null;
  const acwrTone=acwr==null?null:(acwr>1.5?'bad':(acwr>=0.8&&acwr<=1.3)?'good':'warn');
  const adjTone=adj.pct<=-25?'bad':adj.pct<0?'warn':'good';

  const external=!!(review&&review.model==='external');
  const progTitle=(calEdited&&String(calSes.name||'').trim())||(program&&program.session_name)||L('Önerilen program','Proposed session');
  const progRows=calRows||rows;
  const progAdj=(calRows||(program&&program.external))?{...adj,pct:0}:adj;
  const onProg=side==='prog';
  return(<div className="di-panel" ref={panelRef}>
    <div className={'di-hd'+(open?'':' folded')}>
      <span className="di-title">{L('Günlük Bireyselleştirme','Daily individualization')}</span>
      <div className="di-hdacts">
        {open&&<button type="button" className={'di-flipbtn'+(onProg?' back':'')} aria-pressed={onProg}
          onClick={()=>flipTo(onProg?'brief':'prog')}
          title={onProg?L('Bugünün tablosuna ve talimata dön','Back to today and the brief')
            :L('Kartı çevir, bu sporcunun programını göster','Turn the card over to this athlete\'s programme')}>
          <i>⟳</i><span>{onProg?L('Talimata Dön','Back to Brief'):L('Programı Gör','View Programme')}</span>
        </button>}
        {open&&onProg&&program&&<button type="button" className="di-printbtn"
          onClick={()=>{
            /* The session's own line — start, length, focus, target RPE — as the athlete
               has it: off the calendar once written, off the plan before that. */
            const m=(written&&calSes)||plan.meta||{};
            printDiProgram({ath:plan.ath,date,title:progTitle,rows:progRows,pct:progAdj.pct,
              time:m.time,duration:m.duration,focus:sesFocusLine(m),rpe:sesRpeTarget(m)});
          }}
          title={L('Programı yazdır ya da PDF olarak kaydet','Print the programme or save it as a PDF')}>
          <i>🖨</i><span>{L('Yazdır','Print')}</span></button>}
        <button type="button" className={'di-fold'+(open?' open':'')} onClick={()=>setOpen(!open)}
          aria-expanded={open} title={open?L('Paneli kapat','Fold the panel'):L('Paneli aç','Open the panel')}>
          <span>{open?L('Kapat','Fold'):L('Aç','Open')}</span><i>▾</i>
        </button>
      </div>
    </div>
    {open&&<div className={'di-face'+(flip?' '+flip:'')}>
    {!onProg&&<>

    <DiSection n="1" title={date===fmt(today)?L('Bugünün tablosu','Today at a glance')
        :L(`${fd(date)} tablosu`,`${fd(date)} at a glance`)}
      meta={L('hesaplanan değerler — model bunları üretmez','computed — the model does not produce these')}>
      <div className="di-grid">
        <DiTile label={L('Hazır oluş','Readiness')}
          value={rd.score!=null?rd.score:'—'} unit="/5"
          fill={rd.score!=null?rd.score/5*100:null} tone={rdTone}
          sub={`${rd.status||'—'}${rd.source==='estimated from sRPE trend'?L(' · tahmini',' · estimated'):''}`}/>
        <DiTile label={L('Müsabaka günü','Competition day')} value={md||'—'} tone={mdTone}
          sub={(()=>{const cp=bundle.competition;
            /* The fixture the label is counted from, named, so an MD+n can be checked
               against the calendar at a glance. */
            if(cp.today)return L(`bugün: ${cp.today.name||'maç'}`,`today: ${cp.today.name||'game'}`);
            if(md&&/^MD\+/.test(md)&&cp.previous)
              return L(`son maç ${fd(cp.previous.date)}: ${cp.previous.name||'maç'}`,`last game ${fd(cp.previous.date)}: ${cp.previous.name||'game'}`);
            if(cp.next)return L(`${cp.next.days_until} gün sonra: ${cp.next.name||'maç'}`,`in ${cp.next.days_until} days: ${cp.next.name||'game'}`);
            return L('planlı maç yok','no fixture scheduled');})()}/>
        <DiTile label={L('Sezon fazı','Season phase')} value={bundle.season_phase.label||'—'} text
          sub={bundle.season_phase.focus.slice(0,3).join(' · ')||'—'}/>
        <DiTile label={L('İç yük','Internal load')} value={bundle.load.srpe7||0}
          unit={L(' AU / 7 gün',' AU / 7 days')} tone={acwrTone}
          sub={`ACWR ${acwr??'—'}${zone?` · ${zone.t}`:''}${bundle.load.rpe7!=null?` · RPE ${bundle.load.rpe7}`:''}`}/>
        {bundle.playing_time.last&&
          <DiTile label={L('Son maç süresi','Last game minutes')} value={bundle.playing_time.last.minutes}
            unit={L(' dk',' min')}
            sub={`${fd(bundle.playing_time.last.date)}${bundle.competition.back_to_back?L(' · arka arkaya',' · back-to-back'):''}`}/>}
        {/* The one number the model is not allowed to move, on the same row as the rest:
            whatever the session comes back as, this percentage comes off it. */}
        <DiTile label={L('Hacim ayarı','Volume adjustment')} text={!adj.pct}
          value={adj.pct?`${adj.pct}%`:L('yok','none')}
          fill={adj.pct?Math.abs(adj.pct)/Math.abs(adj.floor)*100:0} tone={adjTone}
          title={adj.reasons.map(r=>`${r.label} → ${r.pct}%`).join('\n')}
          sub={adj.reasons.length
            ?adj.reasons.map(r=>r.label).join(' · ')
            :L('hazır oluş normal','readiness normal')}/>
      </div>
      </DiSection>

    <DiSection n="2" title={L('Antrenör talimatı','Coach brief')}
      meta={diInstrFilled(instr)?L('bu güne ve bu sporcuya ait','for this athlete, this day'):L('tamamı isteğe bağlı','every field optional')}>
      <DiInstructionForm instr={instr} save={saveInstr} onSnapshot={takeSnapshot}
        onImport={()=>setImp({text:'',err:''})}/>
      <DiJsonModal title={L('Sporcu Bilgileri','Athlete data')+' — '+(plan.ath.name||'—')} date={date}
        snap={snap} setSnap={setSnap} fileBase={plan.ath.name||'sporcu'}/>
      {imp&&ReactDOM.createPortal(<div className="modal-bg" onClick={()=>setImp(null)}>
        <div className="modal di-snap" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="modal-head">
            <h2 style={{margin:0,fontSize:16,flex:1}}>{L('AI Programını Yükle','Load AI programme')} — {plan.ath.name||'—'}
              <span className="di-dim" style={{fontSize:12,fontWeight:500,marginLeft:8}}>{L('program günü','session day')}: {fd(date)}</span></h2>
            <button className="x-btn" onClick={()=>setImp(null)} aria-label={L('Kapat','Close')}>✕</button>
          </div>
          <div className="di-snap-bar">
            <span className="di-dim">{L('Yapay zekânın verdiği JSON\'u olduğu gibi yapıştır. Tüm sporcular için tek yanıt aldıysan onu da yapıştırabilirsin — bu sporcunun programı içinden seçilir. Program kurallarla denetlenir; takvime ancak sen "Onayla ve takvime yaz"a bastığında işlenir.',
              'Paste the model\'s JSON as it came. A single answer for the whole squad works too — this athlete\'s programme is picked out of it. It is checked against the rules and reaches the calendar only when you press "Approve and write".')}</span>
          </div>
          <textarea className="di-imp-ta" autoFocus value={imp.text} spellCheck={false}
            onChange={e=>setImp({text:e.target.value,err:''})}
            placeholder={'{\n  "program": {\n    "seans_adi": "…",\n    "bloklar": [ … ]\n  }\n}'}/>
          {imp.err&&<div className="di-imp-err" role="alert">⛔ {imp.err}</div>}
          <div className="di-snap-bar" style={{justifyContent:'flex-end',borderBottom:0,borderTop:'1px solid var(--border)'}}>
            <button type="button" className="btn xs sec" onClick={()=>setImp(null)}>{L('Vazgeç','Cancel')}</button>
            <button type="button" className="btn xs" onClick={importProgram} disabled={!imp.text.trim()}>
              {L('Programa dönüştür','Read as programme')}</button>
          </div>
        </div>
      </div>,document.body)}
    </DiSection>
    </>}

    {onProg&&program&&<DiSection n="3" title={progTitle}
      className="di-sec-prog"
      meta={written?(calEdited?L('takvimdeki güncel hali','as it stands on the calendar'):L('takvime yazıldı','on the calendar'))
        :external?L('yüklenen AI programı — onaylanmadan sporcuya ulaşmaz','loaded AI programme — it reaches nobody until you approve it')
        :L('AI taslağı — yazılmadan sporcuya ulaşmaz','AI draft — it reaches nobody until it is written')}>
      <div className="di-result">
        <div className="di-resacts">
          <button type="button" className="btn xs sec" onClick={discard}>
            {L('✕ Sil','✕ Discard')}</button>
        </div>
        {/* Once written and then edited on the athlete's calendar, the card shows the
            calendar's version — the one the athlete actually has — rather than the
            programme as it was loaded, so the two never disagree. */}
        <DiProgramView program={program} rows={progRows} adj={progAdj} libMap={libMap}
          onAddToLibrary={addLib} diffs={differentiators}/>

        {/* A hard violation stops the write, so it is still said here. The model's own
            notes on the programme — how it read the brief, its checks, its rationale and
            warnings — are not shown: the card is the programme and nothing else. */}
        {vr&&vr.hardViolations.length>0&&<div className="di-hardv">
          <div className="di-checkh">⛔ {L(`Sert kural ihlali — bu program takvime yazılamaz (${vr.hardViolations.length})`,
            `Hard rule violation — this session cannot be written (${vr.hardViolations.length})`)}</div>
          <ul className="di-sig">{vr.hardViolations.map((v,i)=><li key={i}>
            {v.rule?<i className="di-cfld">{L('Kural','Rule')} {v.rule}</i>:null} {v.text}</li>)}</ul>
        </div>}
        {program.truncated&&<div className="di-dim">{L('Yanıt token sınırında kesildi — kurtarılabilen kısım gösteriliyor.','The reply hit the token cap — the salvageable part is shown.')}</div>}

        {/* AI draft → coach review → final programme. Until this button is pressed the
            athlete's calendar is HELD: neither this session nor the plain copy of the
            team session is written for them. */}
        <div className="di-writebar">
          {written
            ?<><span className="di-wrote">✓ {L('Sporcunun takvimine yazıldı','Written to the athlete\'s calendar')}</span>
              <button type="button" className="btn xs sec" onClick={undo}>{L('geri al','undo')}</button></>
            :<><button type="button" className="di-write" onClick={write} disabled={blocked}
                title={blocked?L('Sert kural ihlali var — önce yukarıdaki maddeleri gider.',
                  'There is a hard rule violation — clear the items above first.'):''}>
                ✓ {L('Onayla ve takvime yaz','Approve and write to the calendar')}</button>
              <span className="di-dim">{blocked
                ?L('Sert kural ihlali giderilmeden yazılamaz. Programı yeniden yükleyebilir ya da sporcunun kendi takviminden elle yazabilirsin.',
                   'It cannot be written until the hard violation is cleared. Load the programme again, or write it by hand on the athlete\'s own calendar.')
                :L('Onaylayıp sporcunun kendi takvimine işler.','Approves it and puts it on the athlete\'s own calendar.')}</span></>}
        </div>
      </div>
    </DiSection>}

    {onProg&&!program&&<div className="di-hold sm">
      {L('Bu sporcu için henüz bir program yüklenmedi — "Sporcu Bilgilerini Al" ile veriyi al, yapay zekânın yazdığı programı "AI Programını Yükle" ile yapıştır. Program onaylanıp takvime işlenene kadar sporcunun takvimine bu sayfadan bir şey yazılmaz.',
         'No programme has been loaded for this athlete yet — take the data with "Get athlete data" and paste the model\'s programme with "Load AI programme". Until one is approved, this page puts nothing on their calendar.')}
    </div>}
    </div>}
    {/* Outside the faces: an approval refused on the programme side and a snapshot that
        failed on the brief side both have to be seen whichever face is up. */}
    {open&&err&&<div className="di-err">{err}</div>}
  </div>);
}

function IndivAthleteCard({plan,calendar,panel,open,setOpen}){
  const a=plan.ath;
  const initials=(a.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const rdCol=plan.band?plan.band.color:'var(--dim)';
  /* Soreness and fatigue are rated 1-5 with 5 as the good end, so the colour scale
     runs the same way round as readiness: low is the one to look at. */
  const wCol=v=>v==null?'var(--dim)':v<2.5?'#f43f5e':v<3.5?'#f59e0b':v<4.5?'#eab308':'#2dd4a7';
  const sevTxt=sev=>painSevWord(sev)?` · ${painSevWord(sev)}`:'';
  const painChips=[
    ...(plan.painNote&&plan.painNote.quoted?[{key:'note',note:true,text:`“${plan.painNote.text}”`,
      title:L(`Ağrı bildirimi · ${fd(plan.painNote.date)}`,`Pain report · ${fd(plan.painNote.date)}`)}]:[]),
    ...(plan.painNote?(plan.painNote.regions||[]).map(g=>({key:'g'+g.region,text:g.region,style:painChipStyle(g.sev),
      title:L(`Ağrı bildirimi · ${fd(g.date||plan.painNote.date)}${sevTxt(g.sev)}`,`Pain report · ${fd(g.date||plan.painNote.date)}${sevTxt(g.sev)}`)})):[]),
    ...(plan.pains||[]).filter(p=>!painNoteCovers(plan.painNote,p.tag)).map(p=>({key:'p'+p.tag,text:ctLabel(p.tag),style:painChipStyle(p.sev),
      title:L(`Günlük check-in · ${fd(p.date)}${sevTxt(p.sev)}`,`Daily check-in · ${fd(p.date)}${sevTxt(p.sev)}`)})),
  ];
  return(<div className={'iv-card'+(open?' open':'')}>
    <div className="iv-card-hd" onClick={()=>setOpen(!open)}>
      <div className="iv-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:initials}</div>
      <div className="iv-id">
        <div className="iv-nm">{a.name||'—'}</div>
        <div className="iv-meta">
          {a.position?<span>{posOf(a.position)} · {posGroupLabel(plan.posGroup)}</span>:<span className="iv-dim">{L('mevki yok','no position')}</span>}
          {(a.constraintTags||[]).map(t=><span key={t} className="iv-warnchip">{ctLabel(t)}</span>)}
        </div>
      </div>
      {/* What the athlete told us, next to what is about to be prescribed. Their own
          words about what hurts lead — it is the one thing here that is not a
          number, and the thing most likely to change what the coach writes. */}
      <div className="iv-daybar">
        {painChips.length>0&&<div className="iv-pains">
          {painChips.map(c=><span key={c.key} className={'iv-painchip'+(c.note?' note':'')} style={c.style} title={c.title}>{c.text}</span>)}
        </div>}
        <span className="iv-dchip" title={L(`Dünkü seans RPE'si (${fd(plan.prev.date)}) — sporcunun kendi puanı`,`Yesterday's session RPE (${fd(plan.prev.date)}) — the athlete's own rating`)}>
          <i>{L('dün rpe','yest. rpe')}</i><b style={{color:rpeColor(plan.prev.rpe)||'var(--dim)'}}>{plan.prev.rpe!=null?plan.prev.rpe:'—'}</b>
        </span>
        <span className="iv-dchip" title={L(`Dünkü iç yük (${fd(plan.prev.date)}) — sRPE × süre`,`Yesterday's internal load (${fd(plan.prev.date)}) — sRPE × duration`)}>
          <i>{L('dün srpe','yest. srpe')}</i><b>{plan.prev.load>0?`${plan.prev.load} AU`:'—'}</b>
        </span>
        <span className="iv-dchip" title={plan.well.date?L(`${fd(plan.well.date)} check-in'indeki kas ağrısı — 1 çok fazla, 5 hiç`,`Muscle soreness on the check-in of ${fd(plan.well.date)} — 1 very severe, 5 none`):L('Son 2 günde check-in yok','No check-in in the last 2 days')}>
          <i>{L('kas ağrısı','soreness')}</i><b style={{color:wCol(plan.well.soreness)}}>{plan.well.soreness!=null?`${plan.well.soreness}/5`:'—'}</b>
        </span>
        <span className="iv-dchip" title={plan.well.date?L(`${fd(plan.well.date)} check-in'indeki yorgunluk — 1 çok yorgun, 5 dinç`,`Fatigue on the check-in of ${fd(plan.well.date)} — 1 very tired, 5 fresh`):L('Son 2 günde check-in yok','No check-in in the last 2 days')}>
          <i>{L('yorgunluk','fatigue')}</i><b style={{color:wCol(plan.well.fatigue)}}>{plan.well.fatigue!=null?`${plan.well.fatigue}/5`:'—'}</b>
        </span>
      </div>
      <div className="iv-rd" style={{borderColor:rdCol,color:rdCol}}>
        <b>{plan.rd.score!=null?plan.rd.score:'—'}</b><span>{L('hazır oluş','readiness')}</span>
        {plan.rd.src==='srpe'&&<i title={L('Wellness kaydı yok — sRPE trendinden kestirildi','No wellness record — estimated from the sRPE trend')}>{L('tahmin','estimate')}</i>}
      </div>
      {plan.changed>0&&<div className="iv-adj sub">{L(`${plan.changed} değişti`,`${plan.changed} changed`)}</div>}
      <span className="iv-ch">{open?'▼':'▶'}</span>
    </div>
    {plan.notes.length>0&&<div className="iv-notes" title={L('Antrenör notları — karar verirken bakılır, hiçbir şey bunları otomatik okumaz','Coach notes — reference while deciding, nothing reads them automatically')}>
      <span className="h">📝 {L('Not','Note')}</span>
      <span className="t">{plan.notes[0].date?`${fd(plan.notes[0].date)} — `:''}{plan.notes[0].text}</span>
      {plan.notes.length>1&&<span className="iv-dim">+{plan.notes.length-1} {L('tane daha','more')}</span>}
    </div>}
    {/* The card opens straight onto this athlete's own calendar: the program is written
        and edited there, on the session itself, so there is one place it lives. */}
    {open&&<div className="iv-card-body iv-calbody">{panel}{calendar}</div>}
  </div>);
}

/* ---- The Individualization workspace -------------------------------------
   Pick a day, pick a source session, pick the athletes; the program lands on each
   athlete's own calendar and is edited there, on their card. There is no rule
   configuration because there are no rules. */
/* The athlete's own calendar — the same component the Athletes tab shows, with the same
   editing, except that opening a session and editing it happens INSIDE the card rather
   than in a modal over the page. It keeps its own week cursor, starting on the day
   being individualized. */
function IndivAthleteCalendar({ath,setup,weeks,exercises,saveDays,date}){
  const[sel,setSel]=useState(()=>{const d=parseD(date||fmt(today));
    return{year:d.getFullYear(),month:d.getMonth()+1,date:date||fmt(today)};});
  return<CalendarView days={ath.days||{}} selected={sel} setSelected={setSel} goDayView={()=>{}}
    weeks={weeks||[]} saveDays={saveDays} setup={setup} labelOwner={ath.name} exercises={exercises} inline
    coachAthlete={ath}/>;
}

function IndividualizationView({data,team,updateTeam,weeks}){
  const athletes=team.athletes||[];
  const store=team.indiv||{};
  const[date,setDate]=useState(fmt(today));
  useFollowToday(setDate);
  const[srcKey,setSrcKey]=useState('');
  const[sel,setSel]=useState(null);           // null = auto (assigned / all)
  const[open,setOpen]=useState({});
  const[toast,setToast]=useState('');
  // Edits made from the calendar on a card go straight onto that athlete.
  const saveAthDays=(athId,days)=>updateTeam(team.id,{athletes:athletes.map(a=>a.id===athId?{...a,days}:a)});

  const daySessions=((team.days||{})[date]||{}).sessions||[];
  const sources=useMemo(()=>[
    ...daySessions.map(s=>({key:`team:${date}:${s.id}`,group:'Team plan',label:`${s.name||'Session'} · ${s.time||''}`,session:s,team:s})),
  ],[daySessions,date]);
  /* THE SOURCE THE SHEET OPENS ON IS THE DAY'S OWN PLAN — NEVER A TEMPLATE.
     The pick used to fall through to `sources[0]`, and on a date with no team session
     that first source is whatever template happens to sit at the top of the library. The
     box then read like the day's program while holding something that belongs to no day
     at all, and one press of "Write to selected" put that template onto every athlete's
     calendar for a day the team plan reads as rest — a session the coach could not find
     anywhere on the team calendar, written again on every press. So the fall-back is the
     date's own team session and nothing else: with none, no source is selected, the write
     button is dead, and a template reaches a calendar only once the coach has picked it
     here by name. */
  const teamSrc=sources.find(s=>s.group==='Team plan')||null;
  const src=sources.find(s=>s.key===srcKey)||teamSrc;
  const activeKey=src?src.key:'';
  const ovrAll=(store.ovr||{})[activeKey]||{};

  /* Who this source may be written to at all. A team session that names its athletes has
     been assigned, and the sheet is bound by that assignment: the program it builds is
     that session's program, so it goes to the athletes it was given to and to nobody
     else — a block written for the guards must not land on a forward's calendar because
     the sheet was left on "All". A session with nobody ticked, and a template (which
     belongs to no day), carry no assignment to honour: there the whole roster stands, as
     it always has. `null` means exactly that — no assignment. */
  const srcRoster=useMemo(()=>{
    const ids=(src&&src.team&&src.team.athletes)||[];
    // Ticked names that have since left the squad drop out, but the assignment itself
    // stands: a session given to five players who are all gone reaches nobody, it does
    // not fall back to the whole roster.
    return ids.length?ids.filter(id=>athletes.some(a=>a.id===id)):null;
  },[src,athletes]);
  // The roster the sheet works over — the assigned athletes, or everyone when unassigned.
  const roster=useMemo(()=>srcRoster?athletes.filter(a=>srcRoster.includes(a.id)):athletes,[srcRoster,athletes]);
  const autoIds=useMemo(()=>roster.map(a=>a.id),[roster]);
  /* A hand-picked selection is filtered through the assignment too, so un-assigning an
     athlete on the team session takes them off this sheet as well instead of leaving the
     old pick to write to them again. */
  const chosen=useMemo(()=>{
    const c=sel||autoIds;
    return srcRoster?c.filter(id=>srcRoster.includes(id)):c;
  },[sel,autoIds,srcRoster]);
  const toggleAth=id=>{const c=chosen.includes(id)?chosen.filter(x=>x!==id):[...chosen,id];setSel(c);};

  const plans=useMemo(()=>{
    if(!src)return[];
    return athletes.filter(a=>chosen.includes(a.id))
      .map(a=>buildIndivPlan(src.session,a,{ref:date,ovr:ovrAll[a.id]||{}}));
  },[src,athletes,chosen,date,ovrAll]);

  /* ---- The daily individualization engine (§40) ---------------------------
     One bundle per athlete on the sheet: readiness, load, pain, exposure, the
     competition day, the season phase and the volume adjustment, all computed here
     so the card draws numbers rather than asking a model for them. The coach's own
     line for the day sits above the whole thing as a constraint (§22) and is stored
     against the source session rather than the template, so today's instruction does
     not follow it into next week. */
  const exercises=data.exercises||[];
  const libMap=useMemo(()=>{const m={};
    exercises.forEach(e=>{const n=String(e.name||'').trim().toLowerCase();if(n&&!m[n])m[n]=e;});
    return m;},[exercises]);
  const bundles=useMemo(()=>{
    const out={};
    plans.forEach(p=>{
      try{out[p.ath.id]=diBundle(p.ath,team.setup||{},date,{libMap});}
      /* One athlete with data the engine cannot read must not take the whole sheet
         down with them — the card simply renders without its panel. */
      catch(e){out[p.ath.id]=null;}
    });
    return out;
  },[plans,team.setup,date,libMap]);
  /* "Tüm Sporcuların Bilgilerini Al": every selected athlete, from the team as it stands
     at the press. Each carries their own brief for this day and source; an athlete whose
     record the engine cannot read is named rather than silently left out. */
  const[squadSnap,setSquadSnap]=useState(null);
  const takeSquadSnapshot=()=>{
    const setup=team.setup||{};
    const items=[],skipped=[];
    athletes.filter(a=>chosen.includes(a.id)).forEach(a=>{
      const p=plans.find(x=>x.ath.id===a.id)||null;
      try{
        const review=activeKey?diReadReview(team,activeKey,a.id,date):null;
        items.push({ath:a,
          instr:diBrief(review&&review.instr,p?p.meta:null),session:p?p.meta:null,recent:diRecentPrograms(team,a.id,date)});
      }catch(e){skipped.push(a.name||a.id);}
    });
    if(!items.length){setToast(L('Seçili sporcuların verisi okunamadı.','The selected athletes\' data could not be read.'));return;}
    let text;
    try{text=JSON.stringify(diSquadSnapshot({items,setup,date,customTests:data.customTests,libMap}));}
    catch(e){setToast((e.message||String(e))+' — '+L('sporcu bilgileri okunamadı.','the athlete data could not be read.'));return;}
    const note=L(`${items.length} sporcu.`,`${items.length} athletes.`)+(skipped.length
      ?' '+L(`Verisi okunamayan: ${skipped.join(', ')}.`,`Could not read: ${skipped.join(', ')}.`):'');
    setSquadSnap({text,copied:null,note});
    snapCopy(text).then(ok=>setSquadSnap(x=>x&&x.text===text?{...x,copied:ok}:x));
  };

  /* The review standing against each athlete on this source and day, and — from it —
     the plan the sheet is allowed to write for them. A draft still waiting on the coach
     returns no plan at all: that athlete's calendar is held until they decide. Both the
     automatic pass and the button go through here, so there is exactly one answer to
     "what reaches the athlete", and it is the coach's. */
  const reviewOf=p=>diReadReview(team,activeKey,p.ath.id,date);
  const pctFor=p=>{const b=bundles[p.ath.id];return(b&&b.adjustment&&b.adjustment.pct)||0;};
  /* THE LAST GATE, AND THE ONE THAT ACTUALLY GUARDS THE DATABASE.
     Everything above it is a screen the coach reads; this is the check that runs on
     the exact programme about to be written, with the athlete's data as it stands at
     the moment of the write. It matters that it is here and not only on the card: the
     automatic pass writes without anybody pressing anything, a draft approved this
     morning can be carried into an afternoon where a check-in has closed a pattern,
     and a programme that reaches this function by any other route still has to get
     past it. A programme with nothing to validate (no AI draft — the plain copy of the
     team session) passes: it is the coach's own plan, not a generated one. */
  const validateFor=(p,prog)=>{
    const b=bundles[p.ath.id];
    if(!prog||!b)return null;
    const r=diReadReview(team,activeKey,p.ath.id,date);
    const deficits=diDeficits(p.ath,date);
    return validateProgram(prog,{
      bundle:b,instr:diBrief(r&&r.instr,p.meta),
      setup:team.setup||{},libMap,deficits,
      differentiators:diDifferentiators(p.ath,b,deficits,date),
      recent:diRecentPrograms(team,p.ath.id,date),
      peers:diPeerPrograms(team,date,p.ath.id)});
  };
  /* `force` is the programme the coach has just pressed Write on. Its approval is in
     the same React tick as this call, so the store still reads "waiting" — passing the
     programme itself is what keeps one press from needing two. */
  const planToWrite=(p,force)=>{
    if(force)return diProgramPlan(p,force,pctFor(p));
    const r=reviewOf(p);
    const gate=diWriteGate(r);
    if(!gate.write)return null;
    return gate.approved?diProgramPlan(p,diReviewProgram(r),pctFor(p)):p;
  };

  /* What is already on each athlete's own calendar for this source and date, keyed by
     athlete. This is what makes the button a one-time action: the sheet can see that a
     program was written, when, and whether it still matches what the sheet says. */
  const written=useMemo(()=>{
    const out={};
    if(!activeKey)return out;
    athletes.forEach(a=>{
      const ses=((((a.days||{})[date])||{}).sessions||[]).find(s=>s.indiv&&s.indiv.srcKey===activeKey);
      if(ses)out[a.id]=ses;
    });
    return out;
  },[athletes,date,activeKey]);

  /* Writing is scoped to a list of athletes so the same path serves the squad
     button in the bar and the per-athlete button on each card. */
  const applyTo=(ids,opts={})=>{
    if(!src)return;
    let targets=plans.filter(p=>ids.includes(p.ath.id));
    /* An athlete with an undecided draft is not written to, however the write was asked
       for. Pressing the button does not overrule the review — it is the review that says
       what this athlete does today, and it is not finished. They are named in the toast
       rather than silently dropped, so the button never looks broken. */
    const forceId=(opts.force&&opts.force.id)||null;
    /* One programme per athlete, handed in by the press itself (a squad JSON pasted into
       the bar): these athletes are written with it, whatever their stored draft says. */
    const forceMap=opts.forceMap||{};
    const forcedOf=id=>forceMap[id]||(forceId===id&&opts.force?opts.force.program:null);
    const held=targets.filter(p=>!forcedOf(p.ath.id)&&diWriteGate(reviewOf(p)).waiting);
    if(held.length){
      const skip=new Set(held.map(p=>p.ath.id));
      targets=targets.filter(p=>!skip.has(p.ath.id));
      if(!opts.auto)setTimeout(()=>setToast(L(
        `${held.length} sporcu AI taslağı onayı bekliyor — kartı açıp onayla`,
        `${held.length} athlete${held.length>1?'s':''} waiting on draft approval — open the card and approve`)),0);
    }
    if(targets.length===0)return;
    /* Final validation, on the exact programme each athlete is about to be given. A
       failure takes that athlete out of the write — not the whole pass, because one
       athlete whose knee closed a pattern at lunchtime must not hold up the fourteen
       whose sessions are fine. The verdict is stored on their review so the card shows
       the same reason the toast names. */
    const failed=[];
    targets=targets.filter(p=>{
      const prog=forcedOf(p.ath.id)
        ||(()=>{const r=reviewOf(p);const g=diWriteGate(r);return(g.approved&&r)?diReviewProgram(r):null;})();
      if(!prog)return true;                       // no generated session — the coach's own plan
      const v=validateFor(p,prog);
      if(!v||v.status!=='fail')return true;
      failed.push({p,v});
      return false;
    });
    if(failed.length){
      /* THE VERDICT IS ONLY WRITTEN WHEN IT CHANGED, and this is not tidiness — it is
         what keeps the automatic pass from chasing its own tail. That pass re-runs on
         `team.indiv`, `diWriteReview` stamps a fresh `updated_at` on every call, and an
         athlete whose session fails stays due on the next round: storing the same
         verdict again would move `team.indiv`, wake the effect, store it again, for as
         long as the page is open. */
      const sameVerdict=(a,b)=>!!a&&!!b&&a.status===b.status
        &&JSON.stringify((a.hardViolations||[]).map(x=>x.text))
         ===JSON.stringify((b.hardViolations||[]).map(x=>x.text));
      failed.forEach(({p,v})=>{
        const prev=diReadReview(team,activeKey,p.ath.id,date);
        if(sameVerdict(prev&&prev.validation,v))return;
        diWriteReview(team,updateTeam,activeKey,p.ath.id,date,{validation:v});
      });
      /* The card already carries the red box, recomputed live. A toast on the automatic
         pass would repeat it on every render of a page nobody pressed anything on. */
      if(!opts.auto){
        const names=failed.map(f=>f.p.ath.name||'—').join(', ');
        setTimeout(()=>setToast(L(
          `${names} — program sert kural ihlali taşıyor, takvime yazılmadı. Kartı açıp gerekçeyi oku.`,
          `${names} — the session breaks a hard rule and was not written. Open the card to read why.`)),0);
      }
    }
    if(targets.length===0)return;
    /* A program the coach has since written by hand on the athlete's own calendar — from
       the calendar this card opens, or from the Athletes tab — is not the sheet's to
       overwrite. Writing replaces the session outright, so exercises typed there would
       simply vanish. The automatic pass leaves those athletes alone; a deliberate press
       asks first, per athlete, and skips the ones the coach declines. */
    const edited=targets.filter(p=>indivHandEdited(written[p.ath.id]));
    if(edited.length){
      if(opts.auto){
        const skip=new Set(edited.map(p=>p.ath.id));
        targets=targets.filter(p=>!skip.has(p.ath.id));
      }else{
        const names=edited.map(p=>p.ath.name||'—').join(', ');
        if(!confirm(`${names} — takviminde elle yazılmış/düzenlenmiş bir program var. Bu sayfadaki program onun yerine yazılsın mı?\n\n(İptal edersen o sporcunun takvimi olduğu gibi kalır.)`)){
          const skip=new Set(edited.map(p=>p.ath.id));
          targets=targets.filter(p=>!skip.has(p.ath.id));
        }
      }
      if(!targets.length)return;
    }
    const teamSrcId=src.team?src.team.id:null;
    const next=athletes.map(a=>{
      const plan=targets.find(p=>p.ath.id===a.id);
      if(!plan)return a;
      const days={...(a.days||{})};
      const day=days[date]||{date,sessions:[],dailyNotes:''};
      let sessions=[...(day.sessions||[])];
      // An approved draft is written as the coach signed it off; everything else writes
      // the plan as the sheet built it, exactly as before.
      const ses=planToSession(
        planToWrite(plan,forcedOf(a.id))||plan,
        src.session,date,activeKey);
      // When it reached the athlete, so the card can say so instead of the coach having
      // to press the button again to find out. Deliberately outside the fingerprint.
      ses.indiv.writtenAt=new Date().toISOString();
      if(teamSrcId){
        // Replace the athlete's mirror of this team session in place — no duplicate row.
        ses.sourceId=teamSrcId;
        const i=sessions.findIndex(s=>s.sourceId===teamSrcId);
        // The athlete's own post-session feedback is theirs, not the sheet's — it rides
        // across a rewrite the same way it rides across a team re-sync.
        if(i>=0){ses.id=sessions[i].id;ses.sRPE=sessions[i].sRPE||'';ses.au=sessions[i].au||'';ses.notes=sessions[i].notes||'';sessions[i]=ses;}
        else sessions.push(ses);
      } else {
        const i=sessions.findIndex(s=>s.indiv&&s.indiv.srcKey===activeKey&&s.indiv.date===date);
        if(i>=0){ses.id=sessions[i].id;ses.sRPE=sessions[i].sRPE||'';ses.au=sessions[i].au||'';ses.notes=sessions[i].notes||'';sessions[i]=ses;}
        else sessions.push(ses);
      }
      days[date]={...day,sessions};
      return{...a,days};
    });
    updateTeam(team.id,{athletes:next});
    const doneMsg=opts.auto
      ?(targets.length===1
        ?`${targets[0].ath.name||'Athlete'} · takvimine işlendi ✓`
        :`${targets.length} sporcunun takvimine işlendi ✓`)
      :(targets.length===1
        ?`${targets[0].ath.name||'Athlete'} · written to the ${fd(date)} calendar ✓`
        :`Written to ${targets.length} athletes' ${fd(date)} calendars ✓`);
    setToast(doneMsg);
    // Clears its own message only — a later press's message is not cut short by this one.
    setTimeout(()=>setToast(t=>t===doneMsg?'':t),opts.auto?2000:3500);
  };
  /* The counterpart to the write: what this sheet put on a calendar, it can take back
     off it. Without it a program written onto the wrong day had to be deleted athlete by
     athlete, seventeen times over. Only what this sheet wrote for THIS source and THIS
     date goes — a session the coach built by hand carries no `indiv` stamp of this source
     and is never touched. Offered for a template only: an athlete's copy of a TEAM
     session belongs to the day's plan, and the sheet would simply write it back on the
     next pass (see `autoFirstWrite`) — that one is removed by removing the team session. */
  const removable=useMemo(()=>(src&&!src.team)
    ?athletes.filter(a=>chosen.includes(a.id)&&written[a.id]):[],[src,athletes,chosen,written]);
  const removeFrom=()=>{
    const ids=new Set(removable.map(a=>a.id));
    if(!ids.size)return;
    if(!confirm(L(`${ids.size} sporcunun ${fd(date)} takviminden bu program silinsin mi?\n\n(Yalnızca bu sayfanın yazdığı antrenman kaldırılır; elle eklediklerin yerinde kalır.)`,
      `Remove this program from ${ids.size} athlete${ids.size>1?'s':''}' ${fd(date)} calendar?\n\n(Only the session this page wrote is removed; anything added by hand stays.)`)))return;
    const next=athletes.map(a=>{
      if(!ids.has(a.id))return a;
      const day=(a.days||{})[date];
      if(!day)return a;
      const days={...(a.days||{})};
      days[date]={...day,sessions:(day.sessions||[]).filter(s=>!(s.indiv&&s.indiv.srcKey===activeKey))};
      return{...a,days};
    });
    updateTeam(team.id,{athletes:next});
    setToast(L(`${ids.size} sporcunun takviminden kaldırıldı ✓`,
      `Removed from ${ids.size} athlete${ids.size>1?'s':''}' calendars ✓`));
    setTimeout(()=>setToast(''),3500);
  };
  /* Who this page may write to unasked: the athletes the DATE'S OWN TEAM SESSION was
     given to. That is the same list the team→athlete sync copies the session by, so the
     sheet's individual version lands exactly where the plain copy would have, and nowhere
     else. A template source has no day and no assignment, and a team session with nobody
     ticked reaches nobody's calendar through the sync either — both write by hand only. */
  const autoFirstWrite=useMemo(()=>new Set(
    (src&&src.team&&Array.isArray(srcRoster))?srcRoster:[]),[src,srcRoster]);

  /* Once a program has been written for an athlete, the sheet keeps their calendar in
     step with it — the coach edits the sheet and the athlete's copy follows, instead of
     the coach having to remember the button on every visit. A written program is
     rewritten only when its fingerprint differs, so this settles after one pass instead
     of looping; an athlete with nothing written yet is first written only where the day's
     own team plan already puts them in that session (see `autoFirstWrite`). */
  useEffect(()=>{
    if(!src)return;
    const due=plans.filter(p=>{
      const w=written[p.ath.id];
      // Hand-edited on the athlete's calendar: theirs, not the sheet's. Never overwritten
      // on the sheet's own initiative — only when the coach asks for it from the card.
      if(w&&indivHandEdited(w))return false;
      /* A draft waiting on the coach holds this athlete's calendar. Nothing is written —
         not the AI's version, and not the plain plan underneath it either: the coach is
         mid-decision about what today should be, and the athlete's phone must not be
         shown an answer before they have given one. */
      const toWrite=planToWrite(p);
      if(!toWrite)return false;
      const ses=planToSession(toWrite,src.session,date,activeKey);
      /* A FIRST WRITE FOLLOWS THE DAY'S PLAN, NEVER THE PAGE BEING OPEN.
         The page picks a source by itself, and with no team session on the date that
         source is a template — which belongs to no day and to no assignment. Writing it
         on sight put training on every athlete's calendar for a day the team plan reads
         as rest, and the athlete could not get rid of it: deleting the session took
         `written` away, the sheet read that as "never written" and wrote it straight
         back. So a program appears on somebody's calendar on its own only where the
         day's own plan says they do it — a team session of that date with them ticked on
         it. Everything else (a template, a session nobody is ticked on, an athlete the
         session was not given to) waits for the button in the bar. */
      if(!w)return autoFirstWrite.has(p.ath.id)&&liveBlocks(toWrite).some(b=>(b.rows||[]).some(liveSlot));
      return (w.indiv&&w.indiv.sig)!==ses.indiv.sig;
    }).map(p=>p.ath.id);
    if(!due.length)return;
    const t=setTimeout(()=>applyTo(due,{auto:true}),600);
    return()=>clearTimeout(t);
    // eslint-disable-next-line
  },[plans,written,src,date,activeKey,autoFirstWrite,team.indiv,bundles]);
  return(<div className="iv-wrap">
    <PageHero title={L('Bireyselleştirme','Individualization')}
      sub={L('Her sporcuya tek bir kaynak seans, kendi takvimine yazılır.','One source session per athlete, written onto their own calendar.')}
      stats={[{v:athletes.length,l:L('Sporcu','Athletes')},
              {v:fd(date),l:L('Tarih','Date')}]}/>
    <div className="panel iv-bar">
      {/* Moving to another day drops the source pick with it: the program belongs to the
          day, and a template chosen for Monday must not still be sitting in the box —
          ready for the button — when the coach steps onto a Tuesday that has no plan. */}
      <div className="iv-f"><label>{L('Tarih','Date')}</label><input type="date" value={date} onChange={e=>{setDate(e.target.value);setSrcKey('');setSel(null);}}/></div>
      <div className="iv-f grow"><label>{L('Kaynak program','Source program')}</label>
        <select value={activeKey} onChange={e=>{setSrcKey(e.target.value);setSel(null);}}>
          {/* With a team session on the date the box holds it and needs no placeholder.
              Without one it stays empty and says so, rather than showing the name of a
              template the coach never chose. */}
          {!teamSrc&&<option value="">{L('— bu tarihte takım seansı yok','— no team session on this date')}</option>}
          {sources.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div className="iv-f"><label>{L('Sporcular','Athletes')}</label>
        <div className="iv-static">{L(`${roster.length} sporcudan ${chosen.length} tanesi`,`${chosen.length} / ${roster.length} selected`)}</div>
      </div>
      <div className="iv-actions">
        {/* Only where there is something of this sheet's to take back, so the bar does not
            carry a dead button on a day nothing was written. */}
        {removable.length>0&&<button className="btn sec sm" onClick={removeFrom}
          title={L('Bu programı seçili sporcuların takviminden kaldırır.','Removes this program from the selected athletes\' calendars.')}>
          ✕ {L('Takvimden kaldır','Remove from calendars')}</button>}
        {/* Everyone selected above, in one JSON, rebuilt at the press — for one request to
            an outside model instead of one per athlete. */}
        <button className="btn sec sm" onClick={takeSquadSnapshot} disabled={!chosen.length}
          title={L('Seçili sporcuların o anki bütün güncel verisini ve talimatlarını tek bir JSON olarak verir.',
            'The current data and brief of every selected athlete, as one JSON document.')}>
          {'{ }'} {L(`Tüm Sporcuların Bilgilerini Al (${chosen.length})`,`Get all athletes' data (${chosen.length})`)}</button>
      </div>
      {toast&&<div className="iv-toast">{toast}</div>}
      <div className="help" style={{width:'100%',margin:0}}>
        {src&&src.team?L('Bu bir takım seansı: bireysel program sporcunun o seanstaki kopyasının yerini alır (ikinci bir satır oluşmaz) ve takım seansını sonradan düzenlemek artık onun üzerine yazmaz. ',
          'This is a team session: the individual program replaces the athlete\'s copy of it (no duplicate row is created), and editing the team session afterwards no longer overwrites it. '):''}
        {srcRoster&&srcRoster.length?L(`Bu seans ${srcRoster.length} sporcuya atanmış — program yalnızca onların takvimine işlenir. Başka bir sporcuya gitmesi için önce seansın katılımcı listesine eklenmeli. `,
                     `This session is assigned to ${srcRoster.length} athlete${srcRoster.length>1?'s':''} — the program is written to their calendars only. To reach anyone else, tick them on the session itself first. `):''}
        {L(<>Bu program, o günün takım seansına <strong>işaretlediğin</strong> sporcuların takvimine kendiliğinden işlenir; başka kimseye gitmez. Seansta kimse işaretli değilse takvime kendiliğinden hiçbir şey yazılmaz — sporcunun kartından <em>AI Programını Yükle</em> ile programını yükleyip onayla. Sporcunun kartını aç, takviminden antrenmanı seç ve <em>✎ Düzenle</em> ile aynı kartın içinde düzenle; elle düzenlediğin bir gün bu sayfa tarafından bir daha üzerine yazılmaz.</>,
          <>This program is written by itself onto the calendars of the athletes <strong>ticked on that day's team session</strong>, and reaches nobody else. With a session nobody is ticked on, nothing is written on its own — load and approve a programme from the athlete's card with <em>Load AI programme</em>. Open an athlete's card, pick the session on their calendar and edit it in place with <em>✎ Edit</em>; a day you edit by hand is never overwritten from this page again.</>)}
      </div>
    </div>
    {/* Only the athletes this source may reach are offered: "All" over an assigned session
        means all of the athletes it was assigned to, not the whole squad. */}
    {roster.length>0&&<div className="panel iv-athbar">
      <button className="btn xs sec" onClick={()=>setSel(roster.map(a=>a.id))}>{L('Tümü','All')}</button>
      <button className="btn xs sec" onClick={()=>setSel([])}>{L('Hiçbiri','None')}</button>
      <button className="btn xs sec" onClick={()=>setSel(null)}>{L('Oto','Auto')}</button>
      {roster.map(a=><button key={a.id} className={'iv-athchip'+(chosen.includes(a.id)?' on':'')} onClick={()=>toggleAth(a.id)}>
        {a.name||'—'}{a.levelTag?<i>{LEVEL_LABEL[a.levelTag]||a.levelTag}</i>:null}
      </button>)}
    </div>}
    {!src&&<div className="ex-empty">{sources.length===0
      ?L('Bu tarihte takım seansı yok — takvime bir antrenman planla.','There is no team session on this date — plan a session on the calendar.')
      :L('Bu tarihte takım seansı yok — bu gün kimsenin takvimine bir şey yazılmaz.','There is no team session on this date — nothing is written to anyone for this day.')}</div>}
    {src&&plans.map(p=>{const b=bundles[p.ath.id];return(<IndivAthleteCard key={p.ath.id} plan={p}
      open={!!open[p.ath.id]} setOpen={v=>setOpen(o=>({...o,[p.ath.id]:v}))}
      panel={b?<DailyIndivPanel plan={p} bundle={b}
        team={team} updateTeam={updateTeam} srcKey={activeKey} date={date}
        exercises={exercises} setup={team.setup||{}} libMap={libMap}
        customTests={data.customTests}
        writeOne={(id,program)=>applyTo([id],{force:{id,program}})}
        calSes={written[p.ath.id]||null}/>:null}
      calendar={<IndivAthleteCalendar ath={p.ath} setup={team.setup} weeks={weeks}
        exercises={exercises} date={date}
        saveDays={d=>saveAthDays(p.ath.id,d)}/>}/>);})}
    <DiJsonModal title={L('Tüm Sporcuların Bilgileri','All athletes\' data')} date={date}
      snap={squadSnap} setSnap={setSquadSnap} fileBase={L('tum_sporcular','all_athletes')}/>
    {src&&plans.length===0&&<div className="ex-empty">{srcRoster&&!srcRoster.length
      ?L('Bu seans yalnızca kadroda olmayan sporculara atanmış — seansın katılımcı listesini takvimden güncelle.',
         'This session is assigned only to athletes who have left the roster — update its participant list on the session itself.')
      :'No athlete selected — pick one above.'}</div>}
  </div>);
}

/* Global "Language" control — switching it takes effect instantly, everywhere:
   UI text and every generated report/PDF share this one setting. On the
   marketing/login page and the loading screen (no sidebar to dock into) it
   floats fixed to the bottom-left corner; inside the app it renders `inline`
   instead — a normal, non-floating row docked in the sidebar, between the
   team/account block and the nav groups, so it never overlaps other content. */
/* The flag beside the language is DRAWN, not typed. The 🇬🇧 / 🇹🇷 emoji are pairs of
   regional-indicator letters that the font is asked to fuse into a flag, and Windows
   ships no flag glyphs at all — it renders the letters, so the control said "GB English"
   on exactly the machines most coaches use. Two small SVGs say it everywhere. */
const LANG_FLAGS={
  en:(<svg viewBox="0 0 60 40" aria-hidden="true">
    <clipPath id="lf-uk"><path d="M30 20h30v20zv20H0zH0V0zV0h30z"/></clipPath>
    <rect width="60" height="40" fill="#012169"/>
    <path d="M0 0l60 40m0-40L0 40" stroke="#fff" strokeWidth="8"/>
    <path d="M0 0l60 40m0-40L0 40" stroke="#c8102e" strokeWidth="5" clipPath="url(#lf-uk)"/>
    <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13"/>
    <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8"/>
  </svg>),
  tr:(<svg viewBox="0 0 60 40" aria-hidden="true">
    <rect width="60" height="40" fill="#e30a17"/>
    <circle cx="25" cy="20" r="10" fill="#fff"/>
    <circle cx="28.5" cy="20" r="8" fill="#e30a17"/>
    <polygon fill="#fff" points="40.50,14.80 41.70,18.34 45.45,18.39 42.45,20.63 43.56,24.21 40.50,22.05 37.44,24.21 38.55,20.63 35.55,18.39 39.30,18.34"/>
  </svg>),
};
function LanguageSelector({inline}){
  useAppLang();
  /* The flag shows the language that is SELECTED — an <option> cannot hold a picture,
     so the row wears the current one rather than the list wearing all of them. */
  const flag=<span className="lang-flag">{LANG_FLAGS[REPORT_LANG]||LANG_FLAGS.en}</span>;
  const sel=(<select className={inline?'lang-inline-sel':'lang-fixed-sel'} value={REPORT_LANG} onChange={e=>setReportLang(e.target.value)}
      aria-label={L('Dil seçimi','Language selector')}>
      <option value="en">English</option>
      <option value="tr">Türkçe</option>
    </select>);
  if(inline)return(<div className="lang-inline">
    <span className="bt-label">{L('Dil','Language')}</span>
    {flag}
    {sel}
  </div>);
  return(<div className="lang-fixed">
    <span className="lang-fixed-ic" aria-hidden="true">🌐</span>
    {flag}
    {sel}
  </div>);
}
// Sidebar nav icons — simple stroke glyphs that inherit the lime accent via
// currentColor, each chosen to match its section's meaning.
const NIc=({children})=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const NAV_ICONS={
  season:<NIc><path d="M4 6h13"/><path d="M4 12h16"/><path d="M4 18h9"/></NIc>,
  calendar:<NIc><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/></NIc>,
  allcal:<NIc><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M7 13.5h4"/><path d="M13 13.5h4"/><path d="M7 17h4"/></NIc>,
  athletes:<NIc><circle cx="9" cy="8" r="3"/><path d="M3.6 19.4c.6-3 2.8-4.7 5.4-4.7s4.8 1.7 5.4 4.7"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.6 14.9c1.9.5 3.3 2.1 3.7 4.5"/></NIc>,
  reports:<NIc><path d="M4 20h16"/><path d="M7 20v-6"/><path d="M12 20V8"/><path d="M17 20v-9"/></NIc>,
  exercises:<NIc><path d="M6 8v8"/><path d="M9 6v12"/><path d="M15 6v12"/><path d="M18 8v8"/><path d="M9 12h6"/></NIc>,
  templates:<NIc><rect x="8" y="8" width="12.5" height="12.5" rx="2"/><path d="M4.5 15.5V5.5a2 2 0 0 1 2-2h9"/></NIc>,
  individual:<NIc><circle cx="7" cy="7.5" r="2.6"/><circle cx="7" cy="16.5" r="2.6"/><path d="M12 7.5h4.5"/><path d="M12 16.5h7.5"/><path d="M16.5 7.5v4.5h3"/></NIc>,
  evaluation:<NIc><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 11.5l2 2 4-4.5"/></NIc>,
  setup:<NIc><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/></NIc>,
  backup:<NIc><path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19.5h14"/></NIc>,
  tempo:<NIc><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></NIc>,
  checkin:<NIc><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8.5 9.5h7"/><path d="M8.5 13.5h4.5"/><path d="M14.5 17.5l1.8 1.8 3.2-3.6"/></NIc>,
  tryouts:<NIc><circle cx="10.5" cy="8" r="3.2"/><path d="M4.5 19.6c.7-3.2 3-5 6-5s5.3 1.8 6 5"/><path d="M17.5 4.5v6"/><path d="M14.5 7.5h6"/></NIc>,
};
