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
     ex:['Örn. 6–12 tekrar, 3–5 set, RIR 1–3','e.g. 6–12 reps, 3–5 sets, RIR 1–3']}]},
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

/* ---- Movement patterns the coach puts in the session -----------------------
   The brief's second field. A pattern ticked here is IN the session — not a wish the
   model may weigh — and each one carries its own filter box: what kind of exercise,
   which side or stance, which direction, which strength quality it is dosed for.
   Every facet is optional; an empty one leaves that choice to the model, and two or
   more values in one facet mean "any of these".

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
const DI_STR_GOALS_BASIC=DI_STR_GOALS.filter(g=>g[0]==='foundational'||g[0]==='endurance');
const DI_ARM_SIDE=[['bilateral','Çift kol','Both arms'],['unilateral','Tek kol','Single arm'],['alternating','Alternatif','Alternating']];
const diArmPattern=(id,tr,en,vocab)=>({id,label:[tr,en],vocab,facets:[
  {k:'side',label:['Taraf / Destek','Side / support'],opts:DI_ARM_SIDE},
  {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS},
]});
const DI_MOVE_PATTERNS=[
  {id:'knee_dominant',label:['Diz dominant','Knee dominant'],vocab:['Squat','Lunge / Unilateral'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['squat','Squat','Squat'],['split_squat','Split squat','Split squat'],
      ['lunge','Lunge','Lunge'],['step_up','Step-up','Step-up'],['step_down','Step-down','Step-down']]},
    {k:'side',label:['Taraf / Destek','Side / support'],opts:[['bilateral','Çift bacak','Double leg'],
      ['unilateral','Tek bacak','Single leg'],['split','Split duruş','Split stance']]},
    {k:'direction',label:['Yön','Direction'],opts:[['in_place','Yerinde','In place'],['forward','Öne','Forward'],
      ['backward','Geriye','Backward'],['lateral','Yana','Lateral'],['diagonal','Çapraz','Diagonal'],
      ['multi','Çok yönlü','Multi-directional']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS},
  ]},
  {id:'hip_dominant',label:['Kalça dominant','Hip dominant'],vocab:['Hinge'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['deadlift','Deadlift','Deadlift'],['rdl','RDL','RDL'],
      ['good_morning','Good morning','Good morning'],['hip_thrust','Hip thrust','Hip thrust'],
      ['glute_bridge','Glute bridge','Glute bridge'],['pull_through','Pull-through','Pull-through'],['swing','Swing','Swing']]},
    {k:'side',label:['Taraf / Destek','Side / support'],opts:[['bilateral','Çift bacak','Double leg'],
      ['unilateral','Tek bacak','Single leg'],['b_stance','B-stance','B-stance']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS},
  ]},
  diArmPattern('horizontal_push','Yatay itiş','Horizontal push',['Push']),
  diArmPattern('vertical_push','Dikey itiş','Vertical push',['Push']),
  diArmPattern('horizontal_pull','Yatay çekiş','Horizontal pull',['Pull']),
  diArmPattern('vertical_pull','Dikey çekiş','Vertical pull',['Pull']),
  {id:'carry',label:['Taşıma (carry)','Carry'],vocab:['Carry'],facets:[
    {k:'type',label:['Tür','Type'],opts:[['side','Yanda taşıma','Side (suitcase / farmer) carry'],
      ['front_rack','Front rack taşıma','Front rack carry'],['overhead','Baş üstü taşıma','Overhead carry'],
      ['goblet','Goblet taşıma','Goblet carry'],['bear_hug','Bear-hug taşıma','Bear-hug carry'],['mixed','Karma taşıma','Mixed carry']]},
    {k:'side',label:['Taraf / Destek','Side / support'],opts:[['unilateral','Tek taraflı yük','Unilateral load'],
      ['bilateral','Çift taraflı yük','Bilateral load'],['centred','Merkezde yük','Centred load']]},
    {k:'direction',label:['Yön / İlerleme','Direction / progression'],opts:[['forward','Öne','Forward'],
      ['backward','Geriye','Backward'],['lateral','Yana','Lateral'],['march','Yerinde march','March in place'],
      ['hold','Sabit tutuş','Static hold']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_BASIC},
  ]},
  {id:'core',label:['Core','Core'],vocab:['Core / Brace','Rotation'],facets:[
    {k:'side',label:['Taraf / Destek','Side / support'],opts:[['symmetrical','Simetrik','Symmetrical'],
      ['asymmetrical','Tek taraflı / Asimetrik','Unilateral / asymmetrical'],['alternating','Dönüşümlü','Alternating'],
      ['contralateral','Çapraz kol-bacak','Contralateral arm-leg']]},
    {k:'task',label:['Görev','Task'],opts:[['anti_extension','Antiekstansiyon','Anti-extension'],
      ['anti_flexion','Antifleksiyon','Anti-flexion'],['anti_rotation','Antirotasyon','Anti-rotation'],
      ['anti_lateral_flexion','Anti-lateral fleksiyon','Anti-lateral flexion'],['flexion','Fleksiyon','Flexion'],
      ['extension','Ekstansiyon','Extension'],['rotation','Rotasyon','Rotation'],
      ['lateral_flexion','Lateral fleksiyon','Lateral flexion'],['combined','Çapraz / Birleşik','Diagonal / combined']]},
    {k:'goal',label:['Kuvvet hedefi','Strength goal'],opts:DI_STR_GOALS_BASIC},
  ]},
];
const diMoveRow=id=>DI_MOVE_PATTERNS.find(p=>p.id===id)||null;
/* A stored pattern pick, cleaned: an unknown pattern is dropped, an unknown or
   duplicate value inside a facet is dropped, a pattern ticked twice counts once. */
function diMovePatterns(v){
  const seen=new Set(),out=[];
  (Array.isArray(v)?v:[]).forEach(x=>{
    const id=typeof x==='string'?x:(x&&x.id);
    const row=diMoveRow(id);
    if(!row||seen.has(id))return;
    seen.add(id);
    const o={id};
    row.facets.forEach(f=>{
      const raw=x&&typeof x==='object'&&Array.isArray(x[f.k])?x[f.k]:[];
      const ok=new Set(f.opts.map(op=>op[0]));
      o[f.k]=[...new Set(raw.map(String))].filter(val=>ok.has(val));
    });
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
/* The brief as the sheet reads it. "Ek kısıtlar" and "Mutlaka olsun" are no longer on
   the form (the movement-pattern field took the second one's place), so either one left
   on an older stored brief is not carried: nothing the coach can no longer see or clear
   may still steer the JSON or fail the check. The engine keeps reading both for any
   caller that passes them on purpose. */
const diBrief=(raw,src)=>({...diInstr(raw,src),must:[],constraints:[],constraintValues:{},constraintNote:''});
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


/* The request. Everything computed is already decided; the brief is the coach's; the
   equipment is the gym's. The answer's only job is the session itself. */
/* The coach's brief as the model reads it — one shape, used by the request the job
   sends and by the "Sporcu Bilgilerini Al" export, so what the coach copies out is
   exactly what the programme writer would have been told. */
/* The JSON key each facet of a pattern pick is written under. */
const DI_MOVE_FACET_KEY={type:'type',side:'side_support',direction:'direction',goal:'strength_goal',task:'task'};
function diMovePatternsForAI(list){
  return(list||[]).map(p=>{
    const row=diMoveRow(p.id);
    if(!row)return null;
    const o={id:p.id,pattern:L(row.label[0],row.label[1]),movement_pattern_values:diMoveVocab(p)};
    row.facets.forEach(f=>{const v=diMoveFacetText(p,f);if(v.length)o[DI_MOVE_FACET_KEY[f.k]||f.k]=v;});
    return o;
  }).filter(Boolean);
}
function diBriefForAI(i){
  const pats=diMovePatternsForAI(i.patterns);
  return{
    priorities:i.priorities.map(diPrioLabel),
    movement_patterns:pats,
    movement_patterns_rule:pats.length?'Every pattern listed here MUST be in the session, with at least one exercise each. '+
      'Write that exercise\'s coach_pattern as the pattern\'s id and its movement_pattern as one of the pattern\'s movement_pattern_values. '+
      'Each filter given (type, side_support, direction, strength_goal, task) binds that exercise: choose only from the listed values '+
      '(more than one value means any of them). A filter that is not given is your choice. strength_goal sets how the exercise is dosed '+
      '(sets, reps, load, tempo, rest). PAIN NEVER REMOVES A PATTERN LISTED HERE: the coach has seen today\'s pain and still requires it, '+
      'and these patterns are already left out of code_checked_limits.blocked_patterns (see opened_for_coach_patterns). When a listed pattern '+
      'loads a painful region, write it as a pain-free, modified variation (reduced load and range of motion, controlled tempo, supported, '+
      'isometric or unilateral on the pain-free side, no impact) and write the modification into its description. Only an injury-record '+
      'restriction (code_checked_limits.hard_restrictions) or the avoid list can keep a listed pattern out; then write the closest allowed '+
      'variation of the same pattern and record it in flagged_conflicts with field "movement_patterns".':null,
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
        coach_pattern:'the id of the coach_brief.movement_patterns item this exercise fulfils (e.g. knee_dominant); null if it fulfils none',
        description:'how to perform it: setup, execution and coaching cue, 1-2 short sentences — no justification, no commentary',
        basis:['D1'],
      }],
    }],
  },
  flagged_conflicts:[{instruction:'the instruction that could not be applied',field:'movement_patterns | avoid | session_duration_min | session_max_exercises',
    rule:'which rule / pain / limit prevented it',decision:'what was done',alternative:'what was written instead'}],
};
/* The order a conflict between two inputs is settled in. Said once, as data, so the
   answer has one rule to fall back on rather than weighing thirty sentences anew. */
const DI_DECISION_HIERARCHY=[
  '1. Safety / hard constraints — pain, active injury, code_checked_limits (hard_restrictions, blocked_patterns, plyometric_contact_limit, tier_caps), training_profile.constraints.hard.',
  '2. Coach brief — coach_brief (movement_patterns, avoid, priorities, session_duration_min, session_max_exercises, constraints, additional_notes).',
  '3. Match context — session_day.match_day_label and next / previous game, session_day.same_day_team_practice, code_checked_limits.session_fatigue_budget and volume_adjustment_pct.',
  '4. Individual needs — training_profile (athletic_profile priorities, joint_needs, constraints.soft), differentiators, wellness and readiness, measured_deficits.',
  '5. Recent load / exposure — rpe, training_profile.exercise_exposure, recent_programs.',
  '6. Variety — exercise_exposure.category_coverage and strength_movement_profile.',
  'A higher level always wins over a lower one; a lower level only chooses between options the higher levels leave open.',
];
/* The task, in English like everything else in the export: the model is asked to
   write to field names it can read, and the answer comes back in the same language. */
const DI_EXT_TASK=[
  'Write ONE training session for the athlete in this JSON, for the date in session_day.',
  'Reply with ONLY valid JSON in the structure given in output_format. Add no prose; do not rename any key.',
  'Write the programme only: for every exercise its name, sets, reps (or duration / distance), load, target RPE, tempo, rest, equipment, movement_pattern, coach_pattern, basis and a short description of how to perform it. Write NO commentary anywhere — no status summary, no rationale or justification, no priorities paragraph, no notes to the coach. The only free text besides description is flagged_conflicts, and only when an instruction could not be applied.',
  'Settle every conflict between inputs by decision_hierarchy, top to bottom: safety / hard constraints, then the coach brief, then the match context, then individual needs, then recent load / exposure, then variety.',
  'coach_brief is binding: EVERY pattern in coach_brief.movement_patterns is in the session with at least one exercise, tagged with coach_pattern and written to the filters it carries (movement_patterns_rule says how) — a session missing one of them fails the code check; pain does not remove them, avoid is not (nor any variation of it), and neither session_duration_min nor session_max_exercises is exceeded (session_max_exercises is the TOTAL number of exercises in the session: preparation, main and complementary phases included). Put any instruction you could not apply in flagged_conflicts, with the reason.',
  'Respect the limits in code_checked_limits. When the programme is loaded into CoachOS these limits are measured by code, and every limit exceeded is shown to the coach as a warning.',
  'Split the session into phases: each block\'s phase is preparation, main or complementary. Write every exercise\'s movement_pattern as one of the values in movement_pattern_vocabulary, exactly as listed (the plyometric contact check reads "Jump / Plyo" by that exact name), and fill in its equipment.',
  'In each exercise\'s basis, list the ids of the differentiators items it answers (e.g. ["D1","D3"]). Do not write an id that is not in the list. differentiators are listed most decisive first: the game, current pain, a same-day team practice and the development priorities change today\'s session the most.',
  'The sets, reps and durations you write go onto the athlete\'s calendar EXACTLY as written; no reduction is applied after loading. code_checked_limits.volume_adjustment_pct is the volume adjustment recommended for this day — the sum of reasons such as readiness, pain and days to the game, each listed with its share in volume_adjustment_reasons. Take it into account yourself when you write the dose. Volume is not the whole cost: keep the session\'s TOTAL fatigue cost inside code_checked_limits.session_fatigue_budget (no work near failure or above max_target_rpe, no heavy eccentric, depth / high-impact plyometric or maximal-sprint work on a minimal or low budget; on a day with a team practice, its load counts too).',
  'Do not put more than one exercise from the same movement family (movement_families — e.g. Squat and Lunge / Unilateral are one family) in the main phase. Do not give the athlete the same session again as one in recent_programs. Rely on exercise_library as little as possible: it is only a list of names the coach has on file, not the pool the session is built from. Choose every exercise for what this athlete needs today and write it by its common name — an exercise outside the library is fully accepted. Use a library name only where that exact exercise is clearly the best choice, and then write it exactly as listed.',
  'sport_context says what the game asks of everyone who plays it, athlete.position_emphasis the qualities the position asks for most often: this is context, it does not decide the exercise selection on its own — weigh it with the athlete\'s own data.',
  'measured_deficits and the test comments are observations, not diagnoses: do not infer a cause from them and do not turn them into exercises automatically (no "finding → assumed cause → corrective exercise" chain). Weigh them with everything above them in decision_hierarchy and address one only where it fits today\'s session. Where there is pain or an active injury, do not load that region — except with the coach\'s required movement_patterns, which are written as pain-free modified variations instead (movement_patterns_rule).',
  'Safety comes first: when a coach_brief instruction would break a hard restriction or code_checked_limits, do not write it — write a safe alternative and record it in flagged_conflicts. The coach\'s movement_patterns are not dropped for pain: the coach has opened them for today, so write each one as a pain-free, modified variation of the same pattern.',
  'training_profile is the athlete\'s training profile; build the session on it. athletic_profile gives each physical quality\'s development priority for this period (High > Medium > Low): build the emphasis of the day from the High priorities, develop Medium priorities after High, and keep Low-priority and not_rated qualities at a maintenance dose; exercise_exposure shows what the athlete was exposed to, and how much, over the last 7 and 28 days, and what the last session held (including strength_movement_profile — how the strength work was spread over bilateral / unilateral, movement plane, push / pull action and contraction focus — and the equipment used). constraints.hard are strict rules: no exercise violates them. constraints.soft are preferences: follow them as far as possible.',
  'training_profile.joint_needs, where present, is the coach\'s Joint-by-Joint reading of the athlete: which joint, on which side, needs its Joint-by-Joint need (mobile joints mobility, stable joints stability — one need per joint) and how much (High > Medium > Low). Joint-by-Joint priority: red zones first — joint_needs.priority_order lists the joints with High (red) first, and the programme is written in that order, so every High joint is addressed before any Medium or Low one. Build the preparation phase from it — every High need gets targeted work today, Medium needs regular work in the preparation block, Low needs a short maintenance dose — and any corrective or rehabilitation work; a stable joint (knee, low back, foot, scapula, elbow) gets control work, never mobilisation for more range, and is not loaded at an end range it cannot control. It is not a diagnosis.',
  'Aim for a multi-directional, varied programme over the week, not only within this one session, and in EVERY exercise category, not only strength: read exercise_exposure.category_coverage — for each category the athlete has trained (core, plyometric, medicine ball, mobility, upper-body push / pull, speed, hip / knee dominant, full body, stability, balance, corrective, accessory) it lists, for every facet the library files that category by (movement, direction, exercise type, position, technique, contraction focus, action, implement), the values that were not done (not_done_last_7_days, not_done_last_28_days); what was done is in exercise_exposure.exercises — and read strength_movement_profile for the movement plane (sagittal / frontal / transverse), push / pull, contraction focus and bilateral / unilateral spread of the strength work. Do not keep writing the same value of a facet (for example anti-extension every time for core, vertical every time for jumps, one implement every time): when a category is in the session, prefer a value of its facets that was not done this week or in the last 28 days, provided it serves this athlete\'s priorities and needs today. Variety is a means, not a goal in itself: do not add exercises only for variety, do not repeat the same movement family twice in the main phase, and safety, constraints and code_checked_limits come first.',
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
    .replace('ids of the differentiators items','ids of that athlete\'s differentiators items')
    .replace('inside code_checked_limits.session_fatigue_budget','inside that athlete\'s own code_checked_limits.session_fatigue_budget')),
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
  const shared=['task','decision_hierarchy','output_format','movement_pattern_vocabulary','movement_families','exercise_library','sport_context','equipment'];
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
    decision_hierarchy:DI_DECISION_HIERARCHY,
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
      koc_paterni:str(pick(e,['koc_paterni','coach_pattern','coachPattern','brief_pattern','required_pattern'])),
      gerekce:str(pick(e,['description','aciklama','açıklama','cue','coaching_cue','gerekce','gerekçe','rationale','reason','why','notlar','notes','not'])),
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
    pats.forEach(p=>{
      const row=diMoveRow(p.id);
      if(!row)return;
      const tr=row.label[0],en=row.label[1];
      const vocab=diMoveVocab(p);
      let hit=rows.find(r=>r.coachPattern===p.id&&!taken.has(r));
      if(hit){
        taken.add(hit);
        const pat=patOf(hit);
        if(pat&&!vocab.includes(pat))
          S(22,`"${hit.name}" ${tr} paterni için yazılmış ama hareket paterni ${pat} — beklenen: ${vocab.join(' / ')}.`,
            `"${hit.name}" is written for the ${en} pattern but filed as ${pat} — expected ${vocab.join(' / ')}.`);
        return;
      }
      hit=rows.find(r=>!taken.has(r)&&!r.coachPattern&&vocab.includes(patOf(r)));
      if(hit){taken.add(hit);return;}
      /* Pain does not excuse it — the coach's pick opens the pattern for today (diCoachOpenSet)
         — so a missing pattern fails the brief even where the answer declared a reason. */
      const keys=[tr,en,p.id].map(diExName).filter(Boolean);
      const flagged=said.some(d=>keys.some(k=>d.includes(k)));
      H(22,flagged
        ?`Antrenör ${tr} paterninin programda olmasını istedi ama bu paternde egzersiz yok — program bir çatışma bildirmiş, ancak antrenörün seçtiği patern zorunludur.`
        :`Antrenör ${tr} paterninin programda olmasını istedi ama bu paternde egzersiz yok (ve bir çatışma da bildirilmemiş).`,
        flagged
        ?`The coach asked for the ${en} pattern and the session has no exercise in it — it declared a conflict, but the coach's patterns are mandatory.`
        :`The coach asked for the ${en} pattern and the session has no exercise in it (nor a declared conflict).`);
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
    const rpeHi=fb.max_rpe==null?[]:rows.filter(r=>{
      const n=String(r.rpe==null?'':r.rpe).match(/\d+(\.\d+)?/g);
      return n&&Math.max(...n.map(Number))>fb.max_rpe;});
    if(rpeHi.length)
      S(null,`Yorgunluk bütçesi ${fb.budget} (${why}) hedef RPE'yi ${fb.max_rpe} ile sınırlıyor; aşan satırlar: ${rpeHi.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`,
        `The ${fb.budget} fatigue budget (${why}) caps target RPE at ${fb.max_rpe}; rows above it: ${rpeHi.map(r=>`${r.name} (RPE ${r.rpe})`).join(', ')}.`);
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

