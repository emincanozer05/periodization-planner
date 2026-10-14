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
   carried as ids so the answer is asked for one of these rather than for prose.
   `desc` (what the quality is) and `ex` (how it is typically trained) are only the
   hover box in the picker; the request still carries the label alone. */
const DI_PRIORITIES=[
  {group:['Kuvvet','Strength'],items:[
    {id:'foundational_strength',label:['Temel Kuvvet (Foundational Strength)','Foundational strength'],
     desc:['Temel hareket kalıplarında (squat, hinge, itme, çekme) teknik ve doku kapasitesi kurmak; diğer kuvvet niteliklerinin zemini.','Building technique and tissue capacity in the basic patterns (squat, hinge, push, pull) — the base the other strength qualities stand on.'],
     ex:['Örn. goblet squat, RDL, split squat · orta yük, kontrollü tempo','e.g. goblet squat, RDL, split squat · moderate load, controlled tempo']},
    {id:'max_strength',label:['Maksimal Kuvvet','Maximal strength'],
     desc:['Üretilebilecek en yüksek kuvveti artırmak: yüksek yük, düşük tekrar, uzun dinlenme.','Raising the most force the athlete can produce: heavy loads, low reps, long rests.'],
     ex:['Örn. %85+ 1RM, 1–5 tekrar, 3–5 dk dinlenme','e.g. 85%+ 1RM, 1–5 reps, 3–5 min rest']},
    {id:'rfd',         label:['Kuvvet Geliştirme Hızı (RFD)','Rate of force development'],
     desc:['Kuvveti kısa sürede üretebilme — ilk 50–250 ms\'de kuvvetin ne kadar hızlı yükseldiği.','Producing force quickly — how fast force rises in the first 50–250 ms.'],
     ex:['Örn. balistik kaldırışlar, hızlı izometrik itişler, kısa temaslı sıçramalar','e.g. ballistic lifts, rapid isometric pushes, short-contact jumps']},
    {id:'power',       label:['Güç (Power)','Power'],
     desc:['Kuvvet × hız: hafif-orta yükleri maksimum niyetle, olabildiğince hızlı hareket ettirmek.','Force × velocity: moving light-to-moderate loads with maximal intent, as fast as possible.'],
     ex:['Örn. jump squat, trap bar jump, med ball atışları, olimpik kaldırış türevleri','e.g. jump squat, trap bar jump, med-ball throws, Olympic lift derivatives']},
    {id:'reactive',    label:['Reaktif Kuvvet','Reactive strength'],
     desc:['Esneme-kısalma döngüsünü kullanarak kısa yer temasında yüksek kuvvet üretme (RSI).','Using the stretch-shortening cycle to produce high force in a short ground contact (RSI).'],
     ex:['Örn. pogo, drop jump, sekmeli sıçramalar','e.g. pogos, drop jumps, hops']},
    {id:'hypertrophy', label:['Hipertrofi','Hypertrophy'],
     desc:['Kas kesit alanını artırmak: orta yük, yüksek hacim, tükenişe yakın setler.','Increasing muscle size: moderate loads, high volume, sets taken close to failure.'],
     ex:['Örn. 6–12 tekrar, 3–5 set, RIR 1–3','e.g. 6–12 reps, 3–5 sets, RIR 1–3']},
    {id:'strength_endurance',label:['Kuvvet Dayanıklılığı','Strength endurance'],
     desc:['Nöromüsküler sistemin, yorgunluğa karşı koyarak belirli bir süre boyunca tekrarlı veya sürdürülebilir kuvvet üretme kapasitesidir.',
       'The capacity of the neuromuscular system to resist fatigue and produce repeated or sustained force over a given period.'],
     ex:['Örn. 12–20+ tekrar, kısa dinlenme, devre ya da süreli setler','e.g. 12–20+ reps, short rests, circuits or timed sets']}]},
  {group:['Hız ve Hareket','Speed & movement'],items:[
    {id:'accel',       label:['İvmelenme','Acceleration'],
     desc:['Duruştan ya da düşük hızdan hızlanma: ilk 0–20 m, öne eğik pozisyon ve güçlü itiş.','Speeding up from a standstill or low speed: the first 0–20 m, forward lean and a powerful push-off.'],
     ex:['Örn. 10–20 m sprintler, kızak çekişi, duvar drilleri','e.g. 10–20 m sprints, sled pulls, wall drills']},
    {id:'max_velocity',label:['Maksimum Hız','Maximum velocity'],
     desc:['Ulaşılabilen en yüksek koşu hızı ve dik koşu mekaniği.','The highest running speed reached, and upright sprint mechanics.'],
     ex:['Örn. uçan 10–30 m sprintler, tam dinlenmeyle','e.g. flying 10–30 m sprints with full rest']},
    {id:'decel',       label:['Yavaşlama','Deceleration'],
     desc:['Hızı güvenle ve çabucak kesme: eksantrik kuvvet ve frenleme mekaniği.','Bleeding off speed quickly and safely: eccentric strength and braking mechanics.'],
     ex:['Örn. sprint-dur, eksantrik vurgulu iniş ve frenleme drilleri','e.g. sprint-to-stop, eccentric-focused landing and braking drills']},
    {id:'cod',         label:['Yön Değiştirme (COD)','Change of direction'],
     desc:['Önceden bilinen bir yöne hızla dönme — planlı, tepkisel olmayan hareket.','Turning quickly in a known direction — planned, not reactive.'],
     ex:['Örn. 5-0-5, T-testi, kon dönüşleri','e.g. 5-0-5, T-test, cone cuts']},
    {id:'agility',     label:['Çeviklik','Agility'],
     desc:['Bir uyarana (rakip, top, sinyal) tepki olarak yön değiştirme: algı + karar + hareket.','Changing direction in response to a stimulus (opponent, ball, signal): perception + decision + movement.'],
     ex:['Örn. ayna drilleri, sinyalli/reaktif dönüşler, küçük alan oyunları','e.g. mirror drills, cued/reactive cuts, small-sided games']}]},
  {group:['Hareket Kalitesi','Movement quality'],items:[
    {id:'mobility',    label:['Mobilite','Mobility'],
     desc:['Eklemlerde aktif ve kontrollü hareket açıklığını artırmak.','Increasing active, controlled range of motion at the joints.'],
     ex:['Örn. kalça/torasik mobilite, dinamik esneme, CARs','e.g. hip/thoracic mobility, dynamic stretching, CARs']},
    {id:'stability',   label:['Stabilite','Stability'],
     desc:['Hareket altında gövdeyi ve eklemleri kontrol etme, pozisyonu koruma.','Controlling the trunk and joints under movement; holding position.'],
     ex:['Örn. anti-rotasyon, tek bacak denge, Pallof press','e.g. anti-rotation, single-leg balance, Pallof press']},
    {id:'landing',     label:['İniş / Kuvvet Absorpsiyonu','Landing / force absorption'],
     desc:['Sıçrama ve ani duruşlarda kuvveti güvenle karşılama: diz-kalça hizası, yumuşak iniş.','Absorbing force safely in landings and sudden stops: knee-hip alignment, soft landings.'],
     ex:['Örn. snap down, kutudan iniş (stick), tek bacak iniş','e.g. snap downs, box-drop sticks, single-leg landings']},
    {id:'corrective',  label:['Düzeltici','Corrective'],
     desc:['Testte görülen bir eksikliği, asimetriyi ya da kompansasyonu hedefleyen çalışma.','Work aimed at a deficit, asymmetry or compensation the tests showed.'],
     ex:['Örn. zayıf tarafa ek set, glute med aktivasyonu, skapular kontrol','e.g. extra sets for the weaker side, glute med activation, scapular control']}]},
  {group:['Enerji Sistemleri','Energy systems'],items:[
    {id:'aerobic',     label:['Aerobik Kapasite','Aerobic capacity'],
     desc:['Uzun süre orta yoğunlukta çalışabilme ve eforlar arası toparlanma kapasitesi.','Sustaining work at moderate intensity, and recovering between efforts.'],
     ex:['Örn. tempo koşuları, 20–40 dk sürekli çalışma, uzun intervaller','e.g. tempo runs, 20–40 min continuous work, long intervals']},
    {id:'anaerobic',   label:['Anaerobik Kapasite','Anaerobic capacity'],
     desc:['Kısa ve çok yoğun eforları (yaklaşık 20 sn – 2 dk) sürdürebilme, laktata tolerans.','Holding short, very hard efforts (about 20 s – 2 min) and tolerating lactate.'],
     ex:['Örn. 30–60 sn yüksek yoğunluklu intervaller, shuttle koşuları','e.g. 30–60 s high-intensity intervals, shuttle runs']},
    {id:'rsa',         label:['Tekrarlı Sprint Yeteneği','Repeated sprint ability'],
     desc:['Kısa dinlenmelerle art arda maksimale yakın sprint atabilme.','Repeating near-maximal sprints with short rests.'],
     ex:['Örn. 6–10 × 20–30 m sprint, 20–30 sn dinlenme','e.g. 6–10 × 20–30 m sprints, 20–30 s rest']}]},
  {group:['Koruma / Rehabilitasyon','Maintenance / rehab'],items:[
    {id:'strength_maint',label:['Kuvvet Koruma','Strength maintenance'],
     desc:['Yoğun dönemde (sezon içi) kazanılmış kuvveti düşük hacim, yüksek yoğunlukla korumak.','Holding on to strength in busy periods (in season) with low volume and high intensity.'],
     ex:['Örn. haftada 1–2 seans, ana kaldırışlarda 2–3 ağır set','e.g. 1–2 sessions a week, 2–3 heavy sets of the main lifts']},
    {id:'speed_maint',   label:['Hız / Güç Koruma','Speed / power maintenance'],
     desc:['Hız ve patlayıcılığı az hacimle, taze ve kaliteli tekrarlarla korumak.','Keeping speed and explosiveness on little volume — a few fresh, high-quality reps.'],
     ex:['Örn. birkaç maksimal sprint, kısa sıçrama/atış serileri','e.g. a few maximal sprints, short jump/throw series']},
    {id:'recondition',   label:['Reconditioning','Reconditioning'],
     desc:['Sakatlık sonrası rehabilitasyondan sahaya geçişte kapasiteyi kademeli geri kazandırmak.','Gradually rebuilding capacity on the way from rehab back to the field after an injury.'],
     ex:['Örn. kademeli koşu progresyonu, artan yük ve hacim','e.g. graded running progressions, rising load and volume']},
    {id:'rtp',           label:['Oyuna Dönüş (RTP)','Return to play'],
     desc:['Sakatlık sonrası sporun tam taleplerine dönüş: kriter bazlı, adım adım ilerleme.','Returning to the full demands of the sport after injury: criteria-based, step by step.'],
     ex:['Örn. spora özgü driller, test kriterleri karşılandıkça ilerleme','e.g. sport-specific drills, progressing as test criteria are met']}]},
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
/* Volume and intensity, the coach's own call for the day. Volume is a percentage on the
   session's normal dose; left on auto, the engine's readiness / game / pain adjustment
   (diLoadAdjust) stands. Set, the coach's figure REPLACES that adjustment everywhere it
   is read — the card, the JSON and the dose written to the calendar — and, unlike the
   engine, it may add volume as well as take it away. Intensity is a target-RPE band for
   the working sets; set, it is the session's RPE ceiling in place of the fatigue
   budget's. */
const DI_VOL_CHOICES=[-40,-25,-10,0,10,20];
const DI_VOL_MIN=-50,DI_VOL_MAX=30;
const DI_INTENSITY=[
  {id:'low',     label:['Düşük','Low'],     en:'Low',     rpe:[5,6]},
  {id:'moderate',label:['Orta','Moderate'], en:'Moderate',rpe:[7,7]},
  {id:'high',    label:['Yüksek','High'],   en:'High',    rpe:[8,9]},
];
const diIntensityRow=id=>DI_INTENSITY.find(x=>x.id===id)||null;
/* How the session is put together — the brief's training method. Always exactly one:
   the model never picks it, so an unset or unknown value reads as straight sets
   (DI_METHOD_DEFAULT). It shapes the set structure, not what is in it: the
   patterns, dose and ceilings above still bind. `ai` is what the JSON tells the model. */
const DI_METHODS=[
  {id:'straight', label:['Klasik set','Straight sets'],en:'Straight sets',
    ai:'Every exercise on its own: all its sets, with full rest, before the next exercise starts.'},
  {id:'superset', label:['Süperset','Superset'],en:'Superset',
    ai:'Pair exercises (A1/A2), ideally antagonist or non-competing patterns, done back to back with rest after the pair.'},
  {id:'triset',   label:['Triset','Tri-set'],en:'Tri-set',
    ai:'Group exercises in threes (A1/A2/A3) done back to back with rest after the group.'},
  {id:'circuit',  label:['Devre','Circuit'],en:'Circuit',
    ai:'Run the main work as a circuit: one set of each exercise in turn with minimal rest, rest at the end of each round.'},
  {id:'complex',  label:['Kompleks / kontrast','Complex / contrast'],en:'Complex / contrast',
    ai:'Pair a heavy strength exercise with a biomechanically similar explosive one (e.g. squat → jump) for post-activation performance enhancement.'},
  {id:'cluster',  label:['Cluster set','Cluster sets'],en:'Cluster sets',
    ai:'Split the main lifts\' sets into small clusters with 15–30 s intra-set rest to keep bar speed and quality high.'},
  {id:'emom',     label:['EMOM','EMOM'],en:'EMOM',
    ai:'Dose the main work every minute on the minute: the set starts at the top of each minute, the rest of the minute is rest.'},
  {id:'pyramid',  label:['Piramit','Pyramid'],en:'Pyramid',
    ai:'Load rises and reps fall set by set on the main lifts (ascending pyramid).'},
];
const diMethodRow=id=>DI_METHODS.find(x=>x.id===id)||null;
const DI_METHOD_DEFAULT='straight';
const diRpeBand=r=>r.rpe[0]===r.rpe[1]?`RPE ${r.rpe[0]}`:`RPE ${r.rpe[0]}–${r.rpe[1]}`;
/* The adjustment that is actually in force: the coach's volume when the brief sets one,
   otherwise the engine's. `auto` keeps the engine's figure so it can still be shown. */
function diVolumeAdj(adj,instr){
  const a=adj||{pct:0,raw:0,floored:false,floor:DI_ADJ_FLOOR,reasons:[]};
  const v=instr?instr.volume:null;
  if(v==null)return{...a,coach:false,auto:a.pct};
  return{...a,pct:v,coach:true,auto:a.pct,
    reasons:[{id:'coach',pct:v,label:L(`Antrenör ayarı (${v>0?'+':''}${v}%)`,`Set by the coach (${v>0?'+':''}${v}%)`)}]};
}

/* ---- Movement patterns the coach puts in the session -----------------------
   The brief's second field. A pattern ticked here is IN the session — not a wish the
   model may weigh — and each one carries its own filter box: what kind of exercise,
   which side or stance, which direction, which strength quality it is dosed for.
   Every facet is optional and takes ONE value: an empty one leaves that choice to the
   model, a filled one names exactly what that exercise is (a squat OR a split squat,
   never "either").

   `vocab` is how the check recognises the pattern in a written session: the
   movement_pattern values (IV_PATTERNS) an exercise of that pattern is filed under.
   The vocabulary has no horizontal / vertical split, so the answer also tags each
   exercise with the pattern id it fulfils (`coach_pattern`) and the check reads that
   tag first. */
const DI_STR_GOALS=[
  ['foundational','Temel kuvvet','Foundational strength'],
  ['maximal','Maksimal kuvvet','Maximal strength'],
  ['hypertrophy','Hipertrofi','Hypertrophy'],
  ['power','Patlayıcı kuvvet / Güç','Explosive strength / Power'],
  ['reactive','Reaktif kuvvet','Reactive strength'],
  ['endurance','Kuvvet dayanıklılığı','Strength endurance'],
];
const diStrGoals=(ids,rename)=>ids.map(id=>{const g=DI_STR_GOALS.find(x=>x[0]===id);
  return rename&&rename[id]?[id,...rename[id]]:g;});
/* The lower body names power plainly ("Güç"); the upper body keeps "Patlayıcı kuvvet / Güç".
   Reactive strength is a knee-dominant goal only (hops, bounds, drop jumps). */
const DI_POWER_PLAIN={power:['Güç','Power']};
const DI_STR_GOALS_KNEE=diStrGoals(['foundational','maximal','hypertrophy','power','reactive','endurance'],DI_POWER_PLAIN);
const DI_STR_GOALS_HIP=diStrGoals(['foundational','maximal','hypertrophy','power','endurance'],DI_POWER_PLAIN);
const DI_STR_GOALS_ARM=diStrGoals(['foundational','maximal','hypertrophy','power','endurance']);
const DI_STR_GOALS_BASIC=diStrGoals(['foundational','endurance']);
/* The muscle action the exercise emphasises — on every pattern, because it changes the
   exercise as much as its type does (a slow-lowering split squat and a split-squat hold are
   two sessions). Standard is an ordinary controlled tempo with no phase singled out. Carry
   and core have no eccentric choice: they are held, not lowered. */
const DI_ACTIONS=[
  ['standard','Standart','Standard'],
  ['eccentric','Eksantrik','Eccentric'],
  ['isometric','İzometrik','Isometric'],
];
const diActionFacet=ids=>({k:'contraction',ai:'muscle_action_emphasis',label:['Kas aksiyonu vurgusu','Muscle action emphasis'],
  opts:DI_ACTIONS.filter(a=>ids.includes(a[0]))});
const DI_ACTION_FACET=diActionFacet(['standard','eccentric','isometric']);
const DI_ACTION_FACET_HOLD=diActionFacet(['standard','isometric']);
const DI_ARM_SIDE=[['bilateral','Çift kol','Both arms'],['unilateral','Tek kol','Single arm'],['alternating','Alternatif','Alternating']];
const diArmPattern=(id,tr,en,vocab)=>({id,label:[tr,en],vocab,facets:[
  {k:'side',label:['Taraf / Destek','Side / support'],opts:DI_ARM_SIDE},
  {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_ARM},
  DI_ACTION_FACET,
]});
const DI_MOVE_PATTERNS=[
  {id:'knee_dominant',label:['Diz dominant','Knee dominant'],vocab:['Squat','Lunge / Unilateral'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['squat','Squat','Squat'],
      ['lunge','Lunge','Lunge'],['step_up','Step-up','Step-up'],['step_down','Step-down','Step-down']]},
    {k:'side',ai:'stance',label:['Duruş','Stance'],opts:[['bilateral','Bilateral','Bilateral'],
      ['unilateral','Unilateral','Unilateral'],['split','Split stance','Split stance']]},
    {k:'direction',label:['Yön','Direction'],opts:[['in_place','Yerinde','In place'],['forward','Öne','Forward'],
      ['backward','Geriye','Backward'],['lateral','Yana','Lateral'],['diagonal','Çapraz','Diagonal'],
      ['multi','Çok yönlü','Multi-directional']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_KNEE},
    DI_ACTION_FACET,
  ]},
  {id:'hip_dominant',label:['Kalça dominant','Hip dominant'],vocab:['Hinge'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['deadlift','Deadlift','Deadlift'],['rdl','RDL','RDL'],
      ['good_morning','Good morning','Good morning'],['hip_thrust','Hip thrust','Hip thrust'],
      ['glute_bridge','Glute bridge','Glute bridge'],['pull_through','Pull-through','Pull-through'],['swing','Swing','Swing']]},
    {k:'side',ai:'stance_support',label:['Stance / Destek','Stance / support'],opts:[['bilateral','Bilateral','Bilateral'],
      ['unilateral','Unilateral','Unilateral'],['b_stance','B-stance','B-stance']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_HIP},
    DI_ACTION_FACET,
  ]},
  diArmPattern('horizontal_push','Yatay itiş','Horizontal push',['Push']),
  diArmPattern('vertical_push','Dikey itiş','Vertical push',['Push']),
  diArmPattern('horizontal_pull','Yatay çekiş','Horizontal pull',['Pull']),
  diArmPattern('vertical_pull','Dikey çekiş','Vertical pull',['Pull']),
  {id:'carry',label:['Carry','Carry'],vocab:['Carry'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['side','Yanda taşıma','Side (suitcase / farmer) carry'],
      ['front_rack','Front rack taşıma','Front rack carry'],['overhead','Baş üstü taşıma','Overhead carry'],
      ['goblet','Goblet taşıma','Goblet carry'],['bear_hug','Bear-hug taşıma','Bear-hug carry'],['mixed','Karma taşıma','Mixed carry']]},
    {k:'side',ai:'load_distribution',label:['Yük dağılımı','Load distribution'],opts:[['unilateral','Tek taraflı yük','Unilateral load'],
      ['bilateral','Çift taraflı yük','Bilateral load'],['centred','Merkezde yük','Centred load']]},
    {k:'direction',label:['Yön / İlerleme','Direction / progression'],opts:[['forward','Öne','Forward'],
      ['backward','Geriye','Backward'],['lateral','Yana','Lateral'],['march','Yerinde march','March in place'],
      ['hold','Sabit tutuş','Static hold']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_BASIC},
    DI_ACTION_FACET_HOLD,
  ]},
  {id:'core',label:['Core','Core'],vocab:['Core / Brace','Rotation'],facets:[
    {k:'side',label:['Taraf / Destek','Side / support'],opts:[['symmetrical','Simetrik','Symmetrical'],
      ['asymmetrical','Tek taraflı / Asimetrik','Unilateral / asymmetrical'],
      ['contralateral','Çapraz','Contralateral (cross-body)']]},
    {k:'task',label:['Görev','Task'],opts:[['anti_extension','Antiekstansiyon','Anti-extension'],
      ['anti_flexion','Antifleksiyon','Anti-flexion'],['anti_rotation','Antirotasyon','Anti-rotation'],
      ['anti_lateral_flexion','Anti-lateral fleksiyon','Anti-lateral flexion'],['flexion','Fleksiyon','Flexion'],
      ['extension','Ekstansiyon','Extension'],['rotation','Rotasyon','Rotation'],
      ['lateral_flexion','Lateral fleksiyon','Lateral flexion']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_BASIC},
    DI_ACTION_FACET_HOLD,
  ]},
  /* Accessory work has no movement_pattern of its own — a curl, a calf raise, a neck
     isometric are filed under whatever pattern fits — so its vocabulary is empty: it is
     matched on its coach_pattern tag only, and picking it opens no pain-closed pattern. */
  {id:'accessory',label:['Aksesuar','Accessory'],vocab:[],facets:[
    {k:'type',label:['Tür','Type'],opts:[['shoulder','Omuz','Shoulder'],['arm','Kol','Arm'],
      ['forearm_grip','Ön kol / Kavrama','Forearm / Grip'],['calf','Baldır','Calf'],['tibialis','Tibialis','Tibialis'],
      ['hip_isolation','Kalça izolasyonu','Hip isolation'],['knee_isolation','Diz izolasyonu','Knee isolation'],
      ['neck','Boyun','Neck'],['scapula','Skapula','Scapula'],['rotator_cuff','Rotator cuff','Rotator cuff'],
      ['adductor','Adduktor','Adductor'],['abductor','Abduktor','Abductor']]},
    {k:'side',ai:'position',label:['Duruş','Position'],opts:[['standing','Ayakta','Standing'],['seated','Oturarak','Seated'],
      ['lying','Yatarak','Lying'],['kneeling','Diz üstü','Kneeling'],['half_kneeling','Tek diz üstü','Half-kneeling'],
      ['hanging','Asılı','Hanging'],['supported','Destekli','Supported']]},
    {k:'direction',label:['Yön','Direction'],opts:[['forward','Öne','Forward'],['backward','Arkaya','Backward'],
      ['lateral','Yana','Lateral'],['up','Yukarı','Up'],['down','Aşağı','Down'],['rotation','Rotasyon','Rotation'],
      ['multi','Çok yönlü','Multi-directional'],['na','Uygulanamaz','Not applicable']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_ARM},
    DI_ACTION_FACET,
  ]},
];
/* The table the picker draws: one column per facet kind, the same five for every
   pattern. A pattern's facet sits in the column of its kind (the core's task is its
   type, every side / stance / load-distribution facet is its stance); a pattern with
   no facet of a kind leaves that cell empty. */
const DI_MOVE_COLS=[
  {ks:['type','task'],label:['Tür','Type']},
  {ks:['side'],label:['Duruş','Stance']},
  {ks:['direction'],label:['Yön','Direction']},
  {ks:['goal'],label:['Kuvvet hedefi','Strength goal']},
  {ks:['contraction'],label:['Kas aksiyonu','Muscle action']},
];
const diMoveRow=id=>DI_MOVE_PATTERNS.find(p=>p.id===id)||null;
/* The extra filters, on every pattern alike: the kit the exercise is done with (any of
   the ticked items), its range of motion and its stability. All optional. */
const DI_MOVE_EXTRAS=[
  {k:'equip',ai:'equipment',multi:true,label:['Ekipman','Equipment'],
    opts:[...DI_EQUIPMENT.filter(e=>e.id!=='plyobox'&&e.id!=='sled').map(e=>[e.id,e.label[0],e.label[1]]),
      ['kettlebell','Kettlebell','Kettlebell'],['landmine','Landmine','Landmine']]},
  {k:'rom',ai:'range_of_motion',label:['ROM','ROM'],opts:[['full','Tam ROM','Full range'],['partial','Kısmi ROM','Partial range'],
    ['lengthened','Uzamış pozisyon','Lengthened position'],['shortened','Kısalmış pozisyon','Shortened position']]},
  {k:'stab',ai:'stability',label:['Stabilite','Stability'],opts:[['stable','Stabil','Stable'],
    ['semi','Yarı stabil','Semi-stable'],['unstable','İnstabil','Unstable']]},
];
/* One pattern can be asked for more than once: each item of the list is ONE exercise,
   so knee dominant ticked twice is two knee-dominant exercises (a squat and a lunge),
   each with its own filters. An item may also name the exercise itself — picked off the
   library or typed — and then that exercise is the one written. Never more than this
   many of one pattern. */
const DI_MOVE_MAX_SLOTS=6;
/* What the coach writes against each exercise of a pattern: the prescription. */
const DI_MOVE_DOSE=['sets','reps','duration','tempo','rpe','load','rest'];
/* How the calendar files each coach pattern: its movement pattern and the execution that
   goes with it. A carry is trunk work against a side load, which is how the calendar's own
   taxonomy reads it. */
const DI_PAT_EX={knee_dominant:['Knee Dominant',''],hip_dominant:['Hip Dominant',''],
  horizontal_push:['Upper Body Push','Horizontal'],vertical_push:['Upper Body Push','Vertical'],
  horizontal_pull:['Upper Body Pull','Horizontal'],vertical_pull:['Upper Body Pull','Vertical'],
  carry:['Core','Anti-Lateral Flexion'],core:['Core',''],accessory:['Accessory','']};
/* Which of the brief's patterns — and which type under it — a library exercise is filed as,
   read off the pair its card was tagged with (movement pattern + execution), falling back to
   the card's Exercise Type and then nothing: `{id,type}`, each '' when the library does not
   say. Rotational pressing and pulling, full-body lifts and untagged cards have no pattern
   of the brief's to land in. The type is the execution of a core row (anti-extension …) and,
   for squat / hinge rows, the lift read off the name. */
const DI_TYPE_WORDS={
  knee_dominant:[[/step[- ]?down/,'step_down'],[/step[- ]?up/,'step_up'],[/lunge|split squat|\bsplit\b/,'lunge'],[/squat|leg press/,'squat']],
  hip_dominant:[[/good ?morning/,'good_morning'],[/hip thrust/,'hip_thrust'],[/glute bridge|\bbridge\b/,'glute_bridge'],
    [/pull[- ]?through/,'pull_through'],[/\bswing\b/,'swing'],[/\brdl\b|romanian/,'rdl'],[/deadlift/,'deadlift']]};
function diPickTags(it,name){
  const t=exTagsFromLib(it,{})||{pattern:'',plane:''};
  const nm=String(name||(it&&it.name)||'').toLowerCase();
  let id='';
  if(t.pattern==='Knee Dominant')id='knee_dominant';
  else if(t.pattern==='Hip Dominant')id='hip_dominant';
  else if(t.pattern==='Core')id='core';
  else if(t.pattern==='Accessory')id='accessory';
  else if(t.pattern==='Upper Body Push'||t.pattern==='Upper Body Pull'){
    const arm=t.pattern==='Upper Body Push'?'push':'pull';
    id=t.plane==='Vertical'?`vertical_${arm}`:t.plane==='Horizontal'?`horizontal_${arm}`:'';
  }
  let type='';
  if(id==='core')type=String(t.plane||'').toLowerCase().replace(/[- ]/g,'_');
  else if(DI_TYPE_WORDS[id]){const hit=DI_TYPE_WORDS[id].find(([re])=>re.test(nm));type=hit?hit[1]:'';}
  const row=diMoveRow(id),tf=row&&row.facets.find(f=>f.k==='type'||f.k==='task');
  if(!tf||!tf.opts.some(op=>op[0]===type))type='';
  return{id,type};
}
/* A stored pattern pick, cleaned: an unknown pattern is dropped, an unknown or
   duplicate value inside a facet is dropped. A facet holds one value: a brief saved
   while several could be ticked keeps the first. The list keeps the order the coach wrote
   it in — the table is a running order, and ↑ / ↓ can put a core exercise between two
   squats — only the cap per pattern per phase is enforced. */
function diMovePatterns(v){
  const counts=new Map(),out=[];
  (Array.isArray(v)?v:[]).forEach(x=>{
    const id=typeof x==='string'?x:(x&&x.id);
    const row=diMoveRow(id);
    /* An exercise with no pattern yet ("Egzersiz Ekle") has the empty id; any other unknown
       id is dropped. */
    if(!row&&id!=='')return;
    const obj=x&&typeof x==='object'?x:{};
    /* One pattern may stand in several phases; the cap is per pattern per phase. */
    const phase=/^[\w-]{1,24}$/.test(String(obj.phase||''))?String(obj.phase):'';
    const gk=id+'|'+phase;
    if((counts.get(gk)||0)>=(id===''?12:DI_MOVE_MAX_SLOTS))return;
    counts.set(gk,(counts.get(gk)||0)+1);
    /* Text boxes are kept exactly as typed — trimming here would take the space off the end
       of "2-3 " the moment it is typed and the box would drop it; readers trim on use. */
    const txt=(val,max)=>String(val==null?'':val).slice(0,max);
    const o={id,phase,exercise:txt(obj.exercise,120)};
    const clean=(f,max)=>{
      const raw=Array.isArray(obj[f.k])?obj[f.k]:[];
      const ok=new Set(f.opts.map(op=>op[0]));
      return[...new Set(raw.map(String).filter(val=>ok.has(val)))].slice(0,max);
    };
    if(row)row.facets.forEach(f=>{o[f.k]=clean(f,1);});
    DI_MOVE_EXTRAS.forEach(f=>{o[f.k]=clean(f,f.multi?f.opts.length:1);});
    o.note=txt(obj.note,240);
    /* The dose the coach wrote for this exercise, its link, and its alternative — which has a
       dose of its own, since the swap may be done at other sets and reps. */
    DI_MOVE_DOSE.forEach(k=>{o[k]=txt(obj[k],40);});
    o.link=txt(obj.link,300);
    o.superset=/^[A-F]$/i.test(String(obj.superset||'').trim())?String(obj.superset).trim().toUpperCase():'';
    const ar=(obj.alt&&typeof obj.alt==='object')?obj.alt:{name:obj.alt};
    o.alt={name:txt(ar.name,120)};
    DI_MOVE_DOSE.forEach(k=>{o.alt[k]=txt(ar[k],40);});
    o.alt.link=txt(ar.link,300);
    out.push(o);
  });
  return out;
}
/* The movement_pattern values that count as this pick. A lower-body pattern dosed for
   power or reactive strength is usually trained as a jump (trap bar jump, drop jump),
   which the vocabulary files under Jump / Plyo — so for those goals that counts too. */
function diMoveVocab(pick){
  const row=diMoveRow(pick&&pick.id);
  if(!row)return[];
  const lower=row.id==='knee_dominant'||row.id==='hip_dominant';
  const fast=(pick.goal||[]).some(g=>g==='power'||g==='reactive');
  return lower&&fast?[...row.vocab,'Jump / Plyo']:[...row.vocab];
}
const diMoveLabel=id=>{const r=diMoveRow(id);return r?L(r.label[0],r.label[1]):String(id||'');};
/* The values of one facet of a pick, as words. */
function diMoveFacetText(pick,facet){
  const byId=new Map(facet.opts.map(op=>[op[0],op]));
  return(pick[facet.k]||[]).map(val=>{const op=byId.get(val);return op?L(op[1],op[2]):val;});
}
/* The coach's pattern picks for one athlete and day, one line per exercise asked for — "Diz
   dominant: Step-up · Tek bacak · Yerinde · Temel kuvvet" (type · side · direction · goal, as the
   form lists them, then the extra filters); a pattern asked for twice is numbered "Diz dominant 1", "… 2". The calendar shows it on hover; a day with no pick has no lines. When the day
   has been briefed from more than one source session, the most recently saved brief is read. */
function diPatternTipLines(team,athId,dateKey){
  const store=(team&&team.indiv&&team.indiv.ai)||{};
  let best=null;
  Object.keys(store).forEach(k=>{
    const bits=k.split('|');
    if(bits[0]!==dateKey||bits.slice(2).join('|')!==athId)return;
    const rec=store[k];
    if(!rec||!rec.instr||!Array.isArray(rec.instr.patterns)||!rec.instr.patterns.length)return;
    if(!best||String(rec.updated_at||'')>String(best.updated_at||''))best=rec;
  });
  if(!best)return[];
  const picks=diMovePatterns(best.instr.patterns);
  return picks.map((p,i)=>{
    const row=diMoveRow(p.id);
    const same=picks.filter(x=>x.id===p.id);
    return{id:`${p.id}:${i}`,name:(row?diMoveLabel(p.id):L('Patern yok','No pattern'))+(same.length>1?` ${same.indexOf(p)+1}`:''),
      parts:[...(p.exercise?[p.exercise]:[]),...(row?[...row.facets,...DI_MOVE_EXTRAS].flatMap(f=>diMoveFacetText(p,f)):[])]};
  });
}
/* The phases the coach opened on the movement-pattern table — each a section of the session
   with a name of its own. Items name theirs by id. */
/* Ready-made phases: the coach picks one instead of typing its name. The name is not stored
   — it is read in the app's language each time — until the coach types one over it. */
const DI_PHASE_PRESETS=[
  {id:'prep',label:['Hazırlık Bölümü','Preparation'],ph:'hazirlik'},
  {id:'main',label:['Ana Bölüm','Main Phase'],ph:'ana'},
  {id:'cool',label:['Soğuma','Cool Down'],ph:'tamamlayici'}];
const diPhasePreset=id=>DI_PHASE_PRESETS.find(p=>p.id===id)||null;
/* What a phase is called: the name the coach typed, else its ready-made name in this language. */
const diPhaseName=ph=>{const n=String(ph&&ph.name||'').trim();if(n)return n;
  const pr=diPhasePreset(ph&&ph.preset);return pr?L(pr.label[0],pr.label[1]):'';};
function diMovePhases(v){
  const seen=new Set();
  return(Array.isArray(v)?v:[]).map(x=>({id:String(x&&x.id||'').trim(),name:String(x&&x.name==null?'':x.name).slice(0,40),
      preset:diPhasePreset(x&&x.preset)?x.preset:''}))
    .filter(x=>/^[\w-]{1,24}$/.test(x.id)&&!seen.has(x.id)&&seen.add(x.id)).slice(0,6);
}
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
    patterns:diMovePatterns(r.patterns),
    phases:diMovePhases(r.phases),
    must:list(r.must),avoid:list(r.avoid),
    constraints:cons,
    constraintValues:cv,
    constraintNote:String(r.constraintNote||'').trim(),
    duration:dur,maxExercises:max,
    /* Carried through normalisation so a re-read of a stored brief still knows which
       of the two numbers is an instruction and which is a fallback. */
    durationSet:durSet,maxExercisesSet:maxSet,
    /* null = auto. A figure outside the range is read as not set, never clamped into it:
       a stored +80 is a typo, not an instruction. */
    volume:(()=>{const v=recNum(r.volume);return v!=null&&Number.isInteger(v)&&v>=DI_VOL_MIN&&v<=DI_VOL_MAX?v:null;})(),
    intensity:diIntensityRow(r.intensity)?r.intensity:null,
    method:diMethodRow(r.method)?r.method:DI_METHOD_DEFAULT,
    /* Kept as typed. The box writes through this on every keystroke and reads the
       result back: trimming here took the space off the end of "word " the moment it
       was typed, and the box, seeing a different value come back, jumped the caret. */
    notes:String(r.notes||''),
  };
}
/* The brief as the sheet reads it. "Ek kısıtlar" and "Mutlaka olsun" are no longer on
   the form (the movement-pattern field took the second one's place), so either one left
   on an older stored brief is not carried: nothing the coach can no longer see or clear
   may still steer the JSON or fail the check. The engine keeps reading both for any
   caller that passes them on purpose. */
const diBrief=(raw,src)=>({...diInstr(raw,src),must:[],constraints:[],constraintValues:{},constraintNote:'',
  /* The brief is the movement-pattern table now: what an older stored brief holds in the
     fields that left the form (priorities, dose, length, ceiling, keep-out, notes) is no
     longer carried. */
  priorities:[],avoid:[],volume:null,intensity:null,durationSet:false,maxExercisesSet:false,notes:''});
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
const diInstrFilled=i=>!!(i&&(i.priorities.length||(i.patterns||[]).length||i.must.length||i.avoid.length
  ||i.constraints.length||i.constraintNote||String(i.notes||'').trim()||i.volume!=null||i.intensity||(i.method&&i.method!==DI_METHOD_DEFAULT)));

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
   area:['Üst sırt / omuz duruşu','Upper back / shoulder posture'],
   work:['Torakal ekstansiyon ve rotasyon mobilitesi, skapular kontrol',
         'Thoracic extension and rotation mobility, scapular control'],
   cover:['torakal','thoracic','t spine','tspine','ekstansiyon mobilite','foam roll','skapula','scapula','open book','kedi deve','cat cow']},
  {id:'obs_valgus',oncelik:'yüksek',
   kw:['valgus','diz içe','diz ice','dizler içe','knee cave','knees in','medial kollaps','medial collapse'],
   area:['Diz hizası','Knee alignment'],
   work:['Kalça abdüktör ve dış rotatör kuvveti, iniş mekaniği, tek bacak kontrol',
         'Hip abductor and external-rotator strength, landing mechanics, single-leg control'],
   cover:['abdüktör','abduktor','abduct','gluteus','glute med','dış rotat','dis rotat','external rotat','band walk','monster walk','iniş','inis','landing','tek bacak','single leg','lateral band']},
  {id:'obs_heel',oncelik:'yüksek',
   kw:['topuk kalk','topuk yüksel','topuk yuksel','heel rise','heels lift','heel lift','topukları kalk'],
   area:['Topuk (çömelmede)','Heel (in the squat)'],
   work:['Ayak bileği dorsifleksiyon mobilitesi ve yüklü mobilizasyon',
         'Ankle dorsiflexion mobility and loaded mobilisation'],
   cover:['ayak bile','ankle','dorsifleks','dorsiflex','soleus','gastro','calf']},
  {id:'obs_lean',oncelik:'orta',
   kw:['öne eğil','one egil','gövde öne','govde one','forward lean','torso lean','excessive lean','öne yaslan'],
   area:['Gövde açısı (çömelmede)','Torso angle (in the squat)'],
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
    add('thoracic',['Omuz mobilitesi (FMS)','Shoulder mobility (FMS)'],
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
/* The movement_pattern values the coach's own pattern picks stand for. The coach has
   seen today's pain on the card and still put these patterns in the session, so pain
   no longer closes them: they are written as a modified, pain-free variation instead
   of being dropped. Only the base vocabulary counts — a power goal does not open
   Jump / Plyo on a painful joint. Injury-record restrictions and the keep-out list
   are names, not patterns, and stay closed whatever is picked here. */
function diCoachOpenSet(instr){
  const s=new Set();
  ((instr&&instr.patterns)||[]).forEach(p=>{const row=diMoveRow(p&&p.id);if(row)row.vocab.forEach(v=>s.add(v));});
  return s;
}
function diBlockedPatterns(bundle,instr){
  const open=diCoachOpenSet(instr);
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
      yasak_paternler:(r.loads_patterns||[]).filter(p=>!open.has(p)),
      acilan_paternler:(r.loads_patterns||[]).filter(p=>open.has(p)),
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


/* Extraction and validation. Rebuilt field by field rather than handed back as it
   arrived: anything the schema has no place for — an injury-risk figure, a confidence
   rating, a readiness score of its own — never leaves this function. */
/* Which coach pattern an answer's tag names. The id is asked for; a model that wrote
   the pattern's name instead ("Knee dominant", "Diz dominant") is read the same way. */
function diMoveIdOf(v){
  const k=diExName(v==null?'':String(v)).replace(/[\s_\-()]+/g,'');
  if(!k||k==='null')return null;
  const hit=DI_MOVE_PATTERNS.find(p=>[p.id,p.label[0],p.label[1]]
    .some(x=>diExName(x).replace(/[\s_\-()]+/g,'')===k));
  return hit?hit.id:null;
}
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
          coachPattern:diMoveIdOf(e.koc_paterni),
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

/* The programme the coach wrote in the pattern table, in the shape the card, the validator
   and the calendar write all read. Only rows with an exercise name go in; it is the coach's
   own, so it is written as typed — no readiness cut on its sets and reps — and what the
   rules would have stopped is listed as a warning to read (validateProgram, `external`). */
function diManualProgram(instr,libMap,sessionName){
  const items=diMovePatterns(instr&&instr.patterns).filter(p=>String(p.exercise||'').trim());
  if(!items.length)return null;
  const t=v=>{const x=String(v==null?'':v).trim();return x?x:null;};
  const lib=libMap||{};
  const phases=diMovePhases(instr&&instr.phases);
  /* The calendar's own phase names, read for the validator's three phases: preparation,
     main work, complementary. A name that says neither is main work. */
  const phaseOf=nm=>/ısınma|isinma|hazırlık|hazirlik|warm|prep|aktivasyon|activation/i.test(nm)?'hazirlik'
    :/soğuma|soguma|cool|tamamlayıcı|tamamlayici|complement|finish/i.test(nm)?'tamamlayici':'ana';
  const exOf=(p,bi,i,ph)=>{
    const row=diMoveRow(p.id);
    const[exPat,exPlane0]=DI_PAT_EX[p.id]||['',''];
    /* A core row's task (anti-extension, rotation …) is the calendar's execution for it. */
    const taskPlane=p.id==='core'&&p.task&&p.task[0]
      ?exStylesFor('Core').find(x=>x.toLowerCase().replace(/[- ]/g,'')===String(p.task[0]).replace(/_/g,'')):'';
    const exPlane=taskPlane||exPlane0;
    const nm=String(p.exercise).trim();
    const al=p.alt||{};
    const altName=String(al.name||'').trim();
    return{key:`man:${bi}:${i}`,phase:ph,name:nm,source:lib[nm.toLowerCase()]?'library':'custom',
      sets:t(p.sets),reps:t(p.reps),duration:t(p.duration),distance:null,load:t(p.load),tempo:t(p.tempo),
      rest:t(p.rest),rpe:t(p.rpe),equipment:null,pattern:(row&&row.vocab[0])||'',coachPattern:p.id,
      why:t(p.note),basis:[],exPattern:exPat,exPlane:exPlane,superset:p.superset||'',link:t(p.link),
      ...(altName?{alt:{name:altName,pattern:exPat,plane:exPlane,
        sets:String(al.sets||'').trim(),reps:String(al.reps||'').trim(),duration:String(al.duration||'').trim(),
        tempo:String(al.tempo||'').trim(),rpe:String(al.rpe||'').trim(),load:String(al.load||'').trim(),
        rest:String(al.rest||'').trim(),link:String(al.link||'').trim()}}:{})};
  };
  /* Phases in their own order; whatever is not placed in one closes the session. */
  const order=[...phases,{id:'',name:''}];
  const blocks=order.map((ph,bi)=>{
    const mine=items.filter(p=>(p.phase||'')===ph.id||(ph.id===''&&!phases.some(x=>x.id===p.phase)));
    const name=ph.id?diPhaseName(ph):'';
    const kind=diPhasePreset(ph.preset)?diPhasePreset(ph.preset).ph:phaseOf(name);
    return{key:`man:${bi}`,name,phase:kind,exercises:mine.map((p,i)=>exOf(p,bi,i,kind))};
  }).filter(b=>b.exercises.length);
  return{session_name:t(sessionName),blocks,summary:null,priorities:[],
    respected:[],conflicts:[],rationale:null,warning:null,truncated:false,external:true,manual:true};
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
  const blocked=diBlockedPatterns(bundle,i);
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

  /* ---- HARD (rule 22): the movement patterns the coach put in -------------
     A ticked pattern is an instruction, not a hint: each one needs an exercise. The
     answer's own tag (coach_pattern) is read first; an answer without tags is matched
     on movement_pattern, one exercise per pattern, so one Push row cannot stand in for
     both horizontal and vertical push. A pattern may be missing only for safety — when
     today's pain has closed it, or when the answer declared why in flagged_conflicts —
     and then it is a warning to read, not a failure. */
  const pats=i.patterns||[];
  if(pats.length){
    const said=((program.conflicts)||[]).map(x=>diExName(`${x.talimat||''} ${x.alan||''} ${x.rule||''} ${x.alt||''}`));
    const taken=new Set();
    /* A pattern asked for N times needs N exercises; the misses are counted per pattern
       and said once, with the numbers. */
    const miss=new Map();
    pats.forEach(p=>{
      const row=diMoveRow(p.id);
      if(!row)return;
      const tr=row.label[0],en=row.label[1];
      const vocab=diMoveVocab(p);
      let hit=rows.find(r=>r.coachPattern===p.id&&!taken.has(r));
      if(hit){
        taken.add(hit);
        const pat=patOf(hit);
        if(pat&&vocab.length&&!vocab.includes(pat))
          S(22,`"${hit.name}" ${tr} paterni için yazılmış ama hareket paterni ${pat} — beklenen: ${vocab.join(' / ')}.`,
            `"${hit.name}" is written for the ${en} pattern but filed as ${pat} — expected ${vocab.join(' / ')}.`);
        return;
      }
      hit=rows.find(r=>!taken.has(r)&&!r.coachPattern&&vocab.includes(patOf(r)));
      if(hit){taken.add(hit);return;}
      miss.set(p.id,(miss.get(p.id)||0)+1);
    });
    miss.forEach((n,id)=>{
      const row=diMoveRow(id);
      const tr=row.label[0],en=row.label[1];
      const want=pats.filter(p=>p.id===id).length,got=want-n;
      /* Pain does not excuse it — the coach's pick opens the pattern for today (diCoachOpenSet)
         — so a missing pattern fails the brief even where the answer declared a reason. */
      const keys=[tr,en,id].map(diExName).filter(Boolean);
      const flagged=said.some(d=>keys.some(k=>d.includes(k)));
      if(got>0){
        H(22,`Antrenör ${tr} paterninden ${want} egzersiz istedi ama programda ${got} tane var${flagged?' — program bir çatışma bildirmiş, ancak antrenörün istediği egzersiz sayısı zorunludur':''}.`,
          `The coach asked for ${want} ${en} exercises and the session has ${got}${flagged?' — it declared a conflict, but the coach\'s count is mandatory':''}.`);
        return;
      }
      H(22,flagged
        ?`Antrenör ${tr} paterninin programda olmasını istedi ama bu paternde egzersiz yok — program bir çatışma bildirmiş, ancak antrenörün seçtiği patern zorunludur.`
        :`Antrenör ${tr} paterninin programda olmasını istedi ama bu paternde egzersiz yok (ve bir çatışma da bildirilmemiş).`,
        flagged
        ?`The coach asked for the ${en} pattern and the session has no exercise in it — it declared a conflict, but the coach's patterns are mandatory.`
        :`The coach asked for the ${en} pattern and the session has no exercise in it (nor a declared conflict).`);
    });
    /* An exercise the coach named (picked off the library or typed) is an instruction
       too: it has to be in the session under that name. */
    const named=new Set();
    pats.forEach(p=>{
      const nm=String(p.exercise||'').trim();
      const k=diExName(nm);
      if(!k||named.has(k))return;
      named.add(k);
      if(rows.some(r=>diExName(r.name)===k))return;
      const row=diMoveRow(p.id);
      H(22,`Antrenör ${row?row.label[0]+' paterni için ':''}"${nm}" egzersizini seçti ama programda yok.`,
        `The coach picked "${nm}"${row?` for the ${row.label[1]} pattern`:''} and the session does not have it.`);
    });
  }

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

  /* The day's fatigue budget (game distance, same-day team practice): volume cut or
     not, a near-game session should not carry the work that takes days to clear. */
  const fb=diFatigueBudget(bundle);
  if(fb.budget!=='normal'){
    const why=fb.md&&fb.same_day_practice?`${fb.md} + ${L('aynı gün takım antrenmanı','same-day team practice')}`
      :fb.md||L('aynı gün takım antrenmanı','same-day team practice');
    const costly=rows.filter(r=>DI_FATIGUE_RE.test(`${r.name||''} ${r.tempo||''} ${r.reps||''}`));
    if(costly.length&&(fb.budget!=='moderate'||costly.length>1))
      S(null,`Yorgunluk bütçesi ${fb.budget} (${why}), ama programda toparlanması pahalı iş var: ${costly.map(r=>r.name).join(', ')}.`,
        `The fatigue budget is ${fb.budget} (${why}), yet the session carries work that is costly to recover from: ${costly.map(r=>r.name).join(', ')}.`);
    /* The coach's intensity, when set, is the ceiling instead (checked below). */
    const rpeHi=(fb.max_rpe==null||diIntensityRow(i.intensity))?[]:rows.filter(r=>{
      const n=String(r.rpe==null?'':r.rpe).match(/\d+(\.\d+)?/g);
      return n&&Math.max(...n.map(Number))>fb.max_rpe;});
    if(rpeHi.length)
      S(null,`Yorgunluk bütçesi ${fb.budget} (${why}) hedef RPE'yi ${fb.max_rpe} ile sınırlıyor; aşan satırlar: ${rpeHi.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`,
        `The ${fb.budget} fatigue budget (${why}) caps target RPE at ${fb.max_rpe}; rows above it: ${rpeHi.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`);
  }

  /* The coach's intensity: no row's target RPE above the band. A warning, like the
     budget's ceiling it replaces — RPE is the model's prescription, not a measured load. */
  const intR=diIntensityRow(i.intensity);
  if(intR){
    const over=rows.filter(r=>{const n=String(r.rpe==null?'':r.rpe).match(/\d+(\.\d+)?/g);
      return n&&Math.max(...n.map(Number))>intR.rpe[1];});
    if(over.length)
      S(null,`Antrenörün yoğunluk ayarı ${L(intR.label[0],intR.label[1])} (${diRpeBand(intR)}); aşan satırlar: ${over.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`,
        `The coach set intensity to ${intR.en} (${diRpeBand(intR)}); rows above it: ${over.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`);
  }

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
      S(null,`Bu sporcunun ${diffs.length} ayırt edici özelliği hesaplandı ama hiçbir egzersizin dayanağı bunlardan birine dayanmıyor — program bu sporcuya özel yazılmamış olabilir.`,
        `${diffs.length} differentiators were computed for this athlete and no exercise's basis rests on any of them — the session may not be about this athlete at all.`);
    else if(used.length<Math.min(2,diffs.length))
      S(null,`Hesaplanan ${diffs.length} ayırt ediciden yalnızca ${used.length} tanesi programda karşılık buldu.`,
        `Only ${used.length} of the ${diffs.length} computed differentiators is answered anywhere in the session.`);
  }
  const noWhy=rows.filter(r=>!String(r.why||'').trim());
  if(noWhy.length)
    S(null,`${noWhy.length} egzersizde açıklama yok (${noWhy.map(r=>r.name).join(', ')}).`,
      `${noWhy.length} exercise${noWhy.length>1?'s carry':' carries'} no description (${noWhy.map(r=>r.name).join(', ')}).`);

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
    if(!hit)S(22,`Günün önceliği "${lbl}" programda adıyla karşılık bulmuyor — egzersizleri kontrol et.`,
      `Today's priority "${lbl}" is not named anywhere in the session — check the exercises.`);
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

  /* A pattern the pain would close, opened because the coach requires it today: it is
     in the session on purpose, and the coach should see that it loads a painful region. */
  blocked.forEach(b=>(b.acilan_paternler||[]).forEach(pat=>rows.forEach(r=>{
    if(patOf(r)!==pat)return;
    S(17,`"${r.name}" ${pat} paterninde ve ${b.bolge} ${b.kalici?'kalıcı kısıtlı':`ağrılı (${b.siddet_0_5}/5)`} — antrenörün zorunlu paterni olduğu için yazıldı; ağrısız, modifiye bir varyasyon olduğunu kontrol et.`,
      `"${r.name}" is a ${pat} movement and ${b.bolge} is ${b.kalici?'under a standing restriction':`painful (${b.siddet_0_5}/5)`} — written because the coach requires this pattern; check it is a pain-free, modified variation.`);
  })));

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
      ?`Hazır oluş ${bundle.readiness.score}/5 — ${DI_RD_REVIEW} altında. Elle yazılan programa otomatik azaltma uygulanmaz: set ve tekrarı yazmadan önce gözden geçir.`
      :`Hazır oluş ${bundle.readiness.score}/5 — ${DI_RD_REVIEW} altında. Otomatik azaltma uygulandı ama son karar antrenörün: bu programı yazmadan önce gözden geçir.`,
      program.external
      ?`Readiness is ${bundle.readiness.score}/5, under ${DI_RD_REVIEW}. No automatic reduction is applied to a programme you wrote — review the sets and reps before writing it.`
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
      superset:e.superset||'',pattern:e.exPattern||e.pattern||'',plane:e.exPlane||'',link:e.link||'',
      description:why,image:'',changedName:false,
      ...(e.alt?{alt:e.alt}:{}),
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

