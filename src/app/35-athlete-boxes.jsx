/* =========================================================
   ATHLETES BOXES — main / secondary need classification
   ---------------------------------------------------------
   The question this answers is not "is this athlete good or bad", it is
   "which physical quality is limiting this athlete the most right now, and what
   should the individual week give priority to". So the output is never a score
   and never a label on the athlete — it is one MAIN NEED box, one SECONDARY
   NEED box, and the quality that has to be kept while those two are worked on.

   Three rules run through everything below:
   · A quality is read from the tests that actually measure it. Strength is only
     strength data — a low CMJ is not evidence of a low squat, so with no
     strength test on the record strength stays "not assessed" rather than
     guessed at.
   · The reading is a within-team percentile, not a raw number. A 34 cm CMJ
     means one thing in one squad and another in the next; the team the athlete
     trains in is the reference. Tests where lower is better (T-test, sprint,
     an asymmetry gap) are inverted before ranking.
   · Missing data is missing, never "fine". An athlete with two assessable
     qualities gets a verdict with the confidence that supports, and the boxes
     nobody could score are listed as unassessed.
   ========================================================= */
const AB_MIN_POOL=4;                              // below this a within-team percentile says nothing
const AB_Z_STRONG=60,AB_Z_WATCH=40,AB_Z_DEV=20;   // 🟢 ≥60 · 🟡 40-59 · 🟠 20-39 · 🔴 <20

/* The fixed boxes. Nothing outside this list is ever produced — no "general
   athleticism", no "needs to be more explosive". `n` is the number the box
   carries in the model, kept so the screen and a coach's notes agree. */
const AB_BOXES=[
  {id:'strength',n:1,tr:'TEMEL KUVVET',                 en:'FOUNDATIONAL STRENGTH',          c:'#00ff7f'},
  {id:'vert',    n:2,tr:'DİKEY GÜÇ',                    en:'VERTICAL POWER',                 c:'#0094ff'},
  {id:'reactive',n:3,tr:'REAKTİF KUVVET / ELASTİKİYET', en:'REACTIVE STRENGTH / ELASTICITY', c:'#c000ff'},
  {id:'horiz',   n:4,tr:'YATAY GÜÇ',                    en:'HORIZONTAL POWER',               c:'#ff7c00'},
  {id:'lateral', n:5,tr:'LATERAL / TEK BACAK KAPASİTESİ',en:'LATERAL / SINGLE-LEG CAPACITY', c:'#00ffd5'},
  {id:'cod',     n:6,tr:'HIZ / YÖN DEĞİŞTİRME',         en:'SPEED / CHANGE OF DIRECTION',    c:'#ff0040'},
  {id:'conv',    n:7,tr:'KUVVET + GÜÇ DÖNÜŞÜMÜ',        en:'STRENGTH → POWER TRANSFER',      c:'#ffd400'},
  {id:'none',    n:0,tr:'BELİRGİN AÇIK YOK',            en:'NO CLEAR DEFICIT',               c:'#7dd3fc'},
  {id:'nodata',  n:8,tr:'VERİ YETERSİZ',                en:'INSUFFICIENT DATA',              c:'#8b9099'},
];
/* The order a tie is broken in, and the order the boxes are drawn in. `conv`,
   `none` and `nodata` are outcomes rather than measured qualities, so they are
   not ranked — they are reached through the rules below. */
const AB_ORDER=['strength','vert','reactive','horiz','lateral','cod'];
const abBox=id=>AB_BOXES.find(b=>b.id===id)||null;
const abBoxName=id=>{const b=abBox(id);return b?L(b.tr,b.en):'—';};
const abBoxColor=id=>{const b=abBox(id);return b?b.c:'var(--border2)';};

/* Percentile rank inside the squad: the share of the team this value is better
   than, counting a tie as half. `dir:'lo'` is for tests where a smaller number
   is the better performance — a T-test time, an asymmetry gap — so that they
   rank the same way round as everything else. */
function abPct(v,pool,dir){
  if(v==null)return null;
  const vals=pool.filter(x=>x!=null);
  if(vals.length<AB_MIN_POOL)return null;
  const better=vals.filter(x=>dir==='lo'?x<v:x>v).length;
  const same=vals.filter(x=>x===v).length;
  const worse=vals.length-better-same;
  return Math.round(((worse+0.5*same)/vals.length)*100);
}
const abMean=a=>{const v=a.filter(x=>x!=null);return v.length?Math.round(v.reduce((x,y)=>x+y,0)/v.length):null;};
/* Inter-limb asymmetry as a percentage of the better limb — |R−L| / max × 100, the
   standard formula in the asymmetry literature (Bishop, Read & Turner). A gap in
   centimetres cannot be compared between athletes: 5 cm between two 140 cm lateral
   jumps is a different athlete from 5 cm between two 40 cm ones, and ranking the raw
   centimetres would put the bigger jumper in the worse box for the same imbalance. */
const abAsym=(a,b)=>{const x=cmpN(a),y=cmpN(b),m=Math.max(x,y);
  return(x==null||y==null||!(m>0))?null:+((Math.abs(x-y)/m)*100).toFixed(1);};
/* abMean averages percentiles, so it rounds. A composite reach score, a
   dorsiflexion angle or an ASLR grade must not be rounded on the way in — those go
   through abAvg, and abMax picks the widest of the three Y-Balance reach gaps. */
const abAvg=a=>{const v=a.filter(x=>x!=null);return v.length?+(v.reduce((x,y)=>x+y,0)/v.length).toFixed(2):null;};
const abMax=a=>{const v=a.filter(x=>x!=null);return v.length?Math.max(...v):null;};
/* A strength entry is already relative when its name says so. Anything else is a
   load, and a load only becomes relative strength once it is divided by body mass —
   with no body mass on the record it is left unassessed rather than ranked as if
   the kilograms were the athlete's own. */
const AB_REL_RE=/relative|göreceli|\/\s*kg|per\s*kg|\bbw\b|vücut\s*ağırlığı/i;
/* Around this level jump asymmetry starts tracking with slower sprint and COD times
   in youth athletes. It is a monitoring flag, not a cut-off and not a diagnosis. */
const AB_ASYM_FLAG=10;
/* Dynamic Strength Index bands: ≤0.60 the athlete expresses little of their maximal
   force ballistically (ballistic emphasis), 0.60–0.80 combined, ≥0.80 the ballistic
   output is already close to the isometric ceiling (maximal-strength emphasis). */
const AB_DSI_LO=0.60,AB_DSI_HI=0.80;
/* How far above the squad this athlete's body mass or stature sits, in SDs. Larger
   athletes carry more inertia through a turn and over 20 m, so this is context for
   the speed and horizontal boxes — never a reason to discount the reading. */
const abZ=(v,pool)=>{const vals=pool.filter(x=>x!=null);
  if(v==null||vals.length<AB_MIN_POOL)return null;
  const m=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length);
  return sd>0?+((v-m)/sd).toFixed(2):null;};
/* §4 — the four performance zones, and the deficit score the ranking runs on. */
const abZone=p=>p==null?'na':p>=AB_Z_STRONG?'grn':p>=AB_Z_WATCH?'yel':p>=AB_Z_DEV?'org':'red';
const abDeficit=p=>p==null?null:100-p;
const AB_ZONE_TXT={grn:['güçlü','strong'],yel:['geliştirilebilir','improvable'],
  org:['gelişim ihtiyacı','development need'],red:['öncelikli gelişim ihtiyacı','priority development need']};
const AB_ZONE_LOC={grn:['güçlü bölgede','in the strong zone'],yel:['izlem bölgesinde','in the watch zone'],
  org:['gelişim bölgesinde','in the development zone'],red:['öncelikli gelişim bölgesinde','in the priority development zone']};
const abZoneTxt=p=>{const z=AB_ZONE_TXT[abZone(p)];return z?L(z[0],z[1]):'—';};
const abZoneLoc=p=>{const z=AB_ZONE_LOC[abZone(p)];return z?L(z[0],z[1]):'';};

/* ---- The level table --------------------------------------------------------
   Nine physical qualities, one row per athlete, one of three levels in every cell.
   It answers a different question from the verdict underneath it: not "what is
   limiting this athlete the most" but "where does the whole squad stand, quality by
   quality", which is the view a coach reads across before writing a week.

   The levels are the same within-team percentile the verdict runs on, collapsed
   from four zones to three so a cell can be read at a glance:
     Good     P60+   the strong zone
     Average  P40-59 the watch zone
     Weak     <P40   development is a priority here
   A quality with no test behind it stays empty — it is never levelled as "average"
   just to fill the cell. Every cell can be overruled by the coach, because a
   percentile is a comparison and the person who ran the test saw the movement. */
const AB_METRICS=[
  {id:'movement',tr:'Hareket Kontrolü',      en:'Movement Control',   c:'#a78bfa'},
  {id:'mobility',tr:'Mobilite / ROM',        en:'Mobility / ROM',     c:'#f59e0b'},
  {id:'relstr',  tr:'Göreceli Kuvvet',       en:'Relative Strength',  c:'#00ff7f'},
  {id:'vert',    tr:'Dikey Güç',             en:'Vertical Power',     c:'#0094ff'},
  {id:'reactive',tr:'Reaktif Kuvvet',        en:'Reactive Strength',  c:'#c000ff'},
  {id:'horiz',   tr:'Yatay Güç',             en:'Horizontal Power',   c:'#ff7c00'},
  {id:'lateral', tr:'Lateral Güç',           en:'Lateral Power',      c:'#00ffd5'},
  {id:'cod',     tr:'Hız / Yön Değiştirme',  en:'Speed / COD',        c:'#ff0040'},
  {id:'work',    tr:'İş Kapasitesi',         en:'Work Capacity',      c:'#22d3ee'},
];
const abMetric=id=>AB_METRICS.find(m=>m.id===id)||null;
const abMetricName=id=>{const m=abMetric(id);return m?L(m.tr,m.en):'—';};
/* Three levels, in the order they are offered in the cell menu. */
const AB_LEVELS=[
  {id:'grn',tr:'İyi',     en:'Good'},
  {id:'yel',tr:'Ortalama',en:'Average'},
  {id:'red',tr:'Zayıf',   en:'Weak'},
];
const abLevelName=id=>{const l=AB_LEVELS.find(x=>x.id===id);return l?L(l.tr,l.en):'—';};
/* The same two cut-offs the zones use, so the table and the verdict never disagree
   about where an athlete stands. */
const abLevel=p=>p==null?null:p>=AB_Z_STRONG?'grn':p>=AB_Z_WATCH?'yel':'red';
/* Roughly what the four-option menu measures — enough to decide whether it opens
   below the cell or above it. */
const AB_MENU_H=168;
/* The menu is given a width of its own so it can be clamped inside the viewport by
   arithmetic rather than by hoping the browser wraps it somewhere sensible. */
const AB_MENU_W=172;
/* Overrides are stored against the test record they were made on, so a new test
   re-reads the squad rather than inheriting last season's hand corrections. */
const abOvKey=pf=>pf&&pf.t?pf.t.id:'_none';
const abOvOf=(pf,metric)=>{
  const all=pf&&pf.a&&pf.a.needLevels;const box=all&&all[abOvKey(pf)];
  const v=box&&box[metric];
  return(v==='grn'||v==='yel'||v==='red')?v:null;
};
/* What the cell actually shows: the coach's level where there is one, the computed
   level otherwise. Both are reported, so the screen can mark which is which. */
/* ---- The age-and-position reference -----------------------------------------
   A within-team percentile answers "who in this squad", which is the wrong question
   when the squad is small, when it is uniformly under-trained, or when the athlete
   is a 13-year-old being ranked against 17-year-olds. The reference below answers
   "how does this compare with players of this age, in this position" instead.

   Every quality is scored the same way: the athlete's value is turned into a z
   against a reference mean and SD for their age, the direction is corrected for
   tests where a lower number is the better one, the position expectation is taken
   off, and the z is read back as a percentile. The level cut-offs do not move — a
   quality is still good at P60+, average at P40-59, weak below P40. Only the
   comparison group changes.

   THE COMPARISON GROUP IS ALWAYS OTHER ATHLETES. Every row below is drawn from a
   trained population — youth basketball players wherever such a study exists, other
   trained youth athletes where one does not. School-population fitness data is
   deliberately not used, however tidy its percentile tables are: a squad measured
   against schoolchildren reads good everywhere and the table stops saying anything.
   Two qualities have no trained-population reference at all — horizontal power and
   lateral power — and rather than borrow a schoolchildren curve for them, they stay
   on the within-team reading in both modes and the cell says so.

   WHAT THE REFERENCE IS NOT. There is no sex field in this app, so a girls' squad is
   being read against boys' values and every reading will sit low — use the
   within-team reference for those teams. Ages outside 12-18 clamp to the nearest row,
   with the last row standing for senior. Where a study reports a median and
   percentiles rather than a mean and an SD, the SD is the one implied by the
   reported spread; where a row runs past the ages a study covered, it is an
   extrapolation and the source line says so.

   Sources, quality by quality (all athlete populations):
   · Vertical power — Ramos et al. 2021 (Front. Sports Act. Living), Portuguese
     regional basketball players 12-16: CMJ median 30.1 cm at peak height velocity.
     Cross-checked against U14 32.6 +/- 6.4 and U18 38.2 +/- 11.3 cm for male players.
   · Reactive strength — drop-jump RSI bands for athletes (>2.5 excellent, ~2.0 good,
     <1.5 needs development) anchored at senior and scaled down through the youth
     years, because published youth RSI norms are thin.
   · Speed and change of direction — Ramos et al. 2021 (20 m 3.34 s, T-test 10.31 s at
     PHV) carried out to a senior basketball standard, and the 5-0-5 athlete bands
     (<2.30 elite, 2.30-2.50 good, 2.50-2.70 average).
   · Movement control — Y-Balance lower quarter: composite below 94% of limb length
     and an anterior left/right difference of 4 cm or more are the Plisky et al. 2006
     thresholds, measured on 235 high-school basketball players.
   · Mobility — Trinidad-Fernandez et al. 2022, 693 non-injured youth federated
     basketball players U12-U17: weight-bearing lunge 10.68 +/- 2.44 cm, normal band
     8.44-13.11 cm. Converted to degrees at the usual 3.6 deg/cm, because this app
     records the lunge in degrees.
   · Work capacity — 20 m shuttle VO2max in well-trained young basketball players:
     48.9 +/- 4.1 ml/kg/min as the shuttle estimates it. The shuttle underestimates
     directly measured VO2max in this population (48.9 against 55.5), so the reference
     is the shuttle's own number, which is what this app records.
   · Relative strength — no youth 1RM/body-mass norm is established, and the NSCA
     youth resistance training position statement rejects the 1.5x body mass figure
     that circulates as one. The row is anchored on adolescent athletes rather than on
     general lifter standards (1RM squat 102.5 +/- 30.1 kg at 15.2 +/- 1.3 years,
     against 78.9 +/- 12.0 kg body mass in youth basketball at 15.5 years, so about
     1.3 x body mass), and the surrounding ages are extrapolated from it.
   · Horizontal power, lateral power — no trained-population reference, see above.
   ---------------------------------------------------------------------------- */
const AB_REF_TEAM='team',AB_REF_NORM='norm';
const AB_NORM_AGE0=12;   // first row; the last row stands for 19 and over
/* m = reference mean per age (12,13,14,15,16,17,18,19+), sd = its spread.
   `flat` is for the screening tests that are not read against age. */
const AB_NORMS={
  cmj:   {dir:'hi',m:[26.5,28.5,31.0,33.5,36.0,38.0,39.5,42.0],sd:[5.0,5.2,5.5,5.5,5.5,5.5,5.5,5.5]},
  sj:    {dir:'hi',m:[24.0,26.0,28.5,31.0,33.5,35.5,37.0,39.5],sd:[4.6,4.8,5.0,5.0,5.0,5.0,5.0,5.0]},
  vj:    {dir:'hi',m:[31.5,34.0,37.0,40.0,43.0,45.5,47.0,50.0],sd:[6.0,6.2,6.5,6.5,6.5,6.5,6.5,6.5]},
  rsi:   {dir:'hi',m:[1.10,1.20,1.30,1.42,1.55,1.65,1.72,1.85],sd:[0.28,0.28,0.30,0.30,0.30,0.30,0.30,0.30]},
  /* No hj row on purpose: the standing broad jump percentiles that exist are school
     populations, and lifting them to "about athlete level" would be a number this
     app invented. Horizontal power is read within the squad instead. */
  /* The T-test row is anchored on the 10.31 s median Ramos et al. report at peak
     height velocity and carried out to a senior basketball standard. The adult
     "9.5-10.5 = good" bands that circulate are a general team-sport scale, not a
     basketball one — against basketball players a 10.5 s senior is genuinely slow,
     and the row reads it that way on purpose. */
  tt:    {dir:'lo',m:[11.10,10.70,10.31,10.05,9.90,9.80,9.75,9.65],sd:[0.72,0.68,0.65,0.62,0.60,0.58,0.56,0.55]},
  f505:  {dir:'lo',m:[2.86,2.78,2.70,2.63,2.57,2.52,2.49,2.45],sd:[0.20,0.19,0.19,0.18,0.18,0.18,0.18,0.18]},
  sp20:  {dir:'lo',m:[3.85,3.62,3.42,3.28,3.18,3.10,3.04,2.95],sd:[0.28,0.25,0.22,0.20,0.19,0.18,0.17,0.16]},
  /* Anchored at 1.30 x body mass around 15 years from adolescent-athlete squat data,
     not from the general lifter standards that circulate as youth targets. */
  relStr:{dir:'hi',m:[0.90,1.05,1.18,1.30,1.42,1.52,1.60,1.80],sd:[0.28,0.29,0.30,0.30,0.30,0.30,0.30,0.32]},
  /* Anchored on the 48.9 +/- 4.1 ml/kg/min the 20 m shuttle estimates in well-trained
     young basketball players; the youth years run below it and senior above. */
  shut:  {dir:'hi',m:[44.5,46.0,47.5,48.9,50.0,51.0,51.5,52.5],sd:[4.1,4.1,4.1,4.1,4.2,4.2,4.2,4.2]},
  /* High-school basketball players — the population Plisky's 94% cut-off came from. */
  ybComp:{dir:'hi',flat:{m:97.5,sd:6.5}},
  ybGap: {dir:'lo',flat:{m:2.6,sd:1.8}},
  /* 693 youth federated basketball players: 10.68 +/- 2.44 cm on the weight-bearing
     lunge, converted at 3.6 deg/cm. The left/right gap has no equivalent study and is
     a practitioner value, labelled as one on screen. */
  adf:   {dir:'hi',flat:{m:38.4,sd:8.8}},
  adfGap:{dir:'lo',flat:{m:3.0,sd:2.5}},
};
/* An FMS-style 0-3 grade is a rating, not a measurement — there is no mean and SD to
   put it through, so the grade maps straight onto a percentile. A clean 3 is where
   the screen stops asking questions; a 1 or a 0 is what it was designed to find. */
const AB_ORD_PCT={0:3,1:18,2:50,3:85};
const abOrdPct=v=>{const n=Math.round(Number(v));return(isFinite(n)&&AB_ORD_PCT[n]!=null)?AB_ORD_PCT[n]:null;};
/* Positions group the way the literature compares them: guards, forwards, centres.
   A team on another sport has position codes this map does not carry, and then no
   position expectation is applied at all. */
const AB_POS_GRP={Guard:'G',Forward:'F',Center:'C'};
const abPosGrp=p=>AB_POS_GRP[posOf(p)];
/* How much better or worse a position is expected to be, in reference SDs, so a
   centre is not marked weak for being a centre and a guard is not flattered for
   being a guard. Only the qualities where the literature reports a consistent
   positional difference carry one:
   · guards and forwards out-sprint centres and beat them on the T-drill, and guards
     carry the higher VO2max — so speed/COD and work capacity are shifted;
   · centres and forwards are the stronger players in absolute terms, which is the
     same thing as saying their strength relative to body mass runs lower.
   Everything else carries NO shift. For vertical and reactive strength that is a
   finding — jump height differs only slightly between positions, and what does
   separate them there is force-time shape rather than the height this app records.
   For horizontal and lateral power it is moot: neither has a trained-population
   reference, so both are read within the squad and a position expectation would have
   nothing to attach to. The magnitudes are the small-to-moderate effects those
   studies report, not published per-position norms. */
const AB_POS_SHIFT={
  cod:   {G:0.30,F:0,C:-0.35},
  work:  {G:0.25,F:0,C:-0.30},
  relstr:{G:0.20,F:0,C:-0.25},
};
/* Standard normal CDF (Zelen & Severo / Abramowitz-Stegun 26.2.17), which is how a
   z becomes the percentile the level is read from. */
const abPhi=z=>{
  const t=1/(1+0.2316419*Math.abs(z)),d=0.3989422804014327*Math.exp(-z*z/2);
  const pr=d*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return z>0?1-pr:pr;
};
/* The same sources as the block comment above, in the form the screen shows them —
   one line per quality, so a coach can see what a level was measured against without
   leaving the table. */
const AB_SOURCES=[
  {tr:'Hareket Kontrolü',en:'Movement Control',atr:'ölçülen: ~14-18',aen:'measured: ~14-18',
   str:'Plisky ve ark. 2006, J Orthop Sports Phys Ther 36(12):911-919 — 235 lise basketbolcusu (ABD lisesi, yaklaşık 14-18; çalışma kesin yaş vermiyor). Y-Balance kompozit skorunun bacak uzunluğunun %94\'ünün altına inmesi ve anterior sağ-sol farkının 4 cm ve üzeri olması yükselmiş sakatlık riski eşikleridir. Overhead squat 0-3 derecelendirmesi bir ölçüm değil değerlendirmedir; hiçbir popülasyonla karşılaştırılmaz, doğrudan percentile\'a eşlenir, dolayısıyla yaştan bağımsızdır.',
   sen:'Plisky et al. 2006, J Orthop Sports Phys Ther 36(12):911-919 — 235 high-school basketball players (US high school, roughly 14-18; the paper does not state exact ages). A Y-Balance composite below 94% of limb length and an anterior left/right difference of 4 cm or more are the raised-injury-risk thresholds. The overhead squat 0-3 grade is a rating rather than a measurement; it is compared with no population at all and maps straight onto a percentile, so it does not depend on age.'},
  {tr:'Mobilite / ROM',en:'Mobility / ROM',atr:'ölçülen: U12-U17',aen:'measured: U12-U17',
   str:'Trinidad-Fernández ve ark. 2022, Int J Environ Res Public Health 19(18):11740 — 693 sakatlıksız genç lisanslı basketbolcu, U12-U17. Ağırlık taşıyan lunge 10.68 ± 2.44 cm, normal bant 8.44-13.11 cm. Uygulama dereceyle kaydettiği için 3.6°/cm oranıyla çevrildi. Sağ-sol farkının karşılığı bir çalışma yok; o satır uygulama değeridir. ASLR 0-3 derecelendirmesi yaştan bağımsız, doğrudan percentile\'a eşlenir.',
   sen:'Trinidad-Fernández et al. 2022, Int J Environ Res Public Health 19(18):11740 — 693 non-injured youth federated basketball players, U12-U17. Weight-bearing lunge 10.68 ± 2.44 cm, normal band 8.44-13.11 cm. Converted at the usual 3.6°/cm because this app records the lunge in degrees. There is no equivalent study for the left/right gap, so that row is a practitioner value. The ASLR 0-3 grade is age-independent and maps straight onto a percentile.'},
  {tr:'Göreceli Kuvvet',en:'Relative Strength',atr:'ölçülen: ~15 · gerisi uzatma',aen:'measured: ~15 · rest extrapolated',
   str:'Genç sporcular için yerleşmiş bir 1RM/vücut ağırlığı normu yoktur; NSCA genç direnç antrenmanı bildirisi (2009), norm gibi dolaşan 1.5 × vücut ağırlığı ölçütünün desteklenmediğini açıkça belirtir. Satır iki sporcu çalışmasından çıpalandı: 198 ergen sporcuda 1RM squat 102.5 ± 30.1 kg (15.2 ± 1.3 yaş, Eur J Sport Sci) ve 44 genç basketbolcuda vücut ağırlığı 78.9 ± 12.0 kg (15.5 ± 0.8 yaş, Front Physiol 13:979367) — yaklaşık 1.30 × vücut ağırlığı. Yalnızca 15 yaş civarı ölçülmüştür; diğer yaşlar bu tek çıpadan uzatılmıştır.',
   sen:'No 1RM/body-mass norm is established for youth athletes, and the NSCA youth resistance training position statement (2009) states plainly that the 1.5x body mass figure often used as one is not supported. The row is anchored on two athlete studies: a 1RM squat of 102.5 ± 30.1 kg in 198 adolescent athletes (15.2 ± 1.3 years, Eur J Sport Sci) and a body mass of 78.9 ± 12.0 kg in 44 youth basketball players (15.5 ± 0.8 years, Front Physiol 13:979367), so about 1.30 x body mass. Only the ages around 15 are measured; every other age is extrapolated from that single anchor.'},
  {tr:'Dikey Güç',en:'Vertical Power',atr:'ölçülen: 12-16 · CMJ · 17-18 uzatma',aen:'measured: 12-16 · CMJ · 17-18 extrapolated',
   str:'Ramos ve ark. 2021, Front Sports Act Living 3:629453 — 281 Portekizli erkek bölgesel basketbolcu, 12-16 yaş, P10/25/50/75/90 percentile\'ları. PHV\'de CMJ ortancası 30.1 cm, kollu CMJ 35.9 cm. 17-18 yaş satırları ölçülmedi, kıdemli değere doğru uzatıldı. DİKKAT: bu çalışma squat jump ölçmemiştir — SJ satırı CMJ satırından türetilmiştir (yaklaşık 2.5 cm altı) ve kendi kaynağı yoktur; yönü Kozinc ve ark. 2022 (Eur J Sport Sci, 770 katılımcı) destekler, büyüklüğü bu uygulamanın seçimidir.',
   sen:'Ramos et al. 2021, Front Sports Act Living 3:629453 — 281 Portuguese male regional basketball players aged 12-16, percentiles P10/25/50/75/90. CMJ median 30.1 cm at peak height velocity, 35.9 cm with arm swing. The 17-18 rows were not measured and are carried out toward the senior value. NOTE: that study did not measure the squat jump — the SJ row is derived from the CMJ row (about 2.5 cm below it) and has no source of its own; Kozinc et al. 2022 (Eur J Sport Sci, 770 participants) supports the direction, the magnitude is this app\'s choice.'},
  {tr:'Reaktif Kuvvet',en:'Reactive Strength',atr:'ölçülen: yetişkin · 12-18 uzatma',aen:'measured: adult · 12-18 extrapolated',
   str:'Sporcular için drop jump RSI bantları: 2.5 üzeri çok iyi, 2.0 civarı iyi, 1.5 altı gelişim gerektirir. Bu bantlar yetişkin sporculara aittir; yayınlanmış genç yaş RSI norm tablosu bulunamadı, genç yıllar bu çıpadan aşağı uzatıldı. Yani bu sütunun 12-18 aralığında ölçülmüş bir dayanağı yoktur. RSI tanımına da duyarlıdır: cihaz uçuş süresi ÷ temas süresi raporluyorsa değerler sıçrama yüksekliği ÷ temas süresine göre belirgin yüksek çıkar.',
   sen:'Drop-jump RSI bands for athletes: above 2.5 excellent, around 2.0 good, below 1.5 needs development. Those bands are adult athletes; no published youth RSI norm table was found, so the youth years are extrapolated down from that anchor. This column therefore has no measured basis anywhere in 12-18. It is also sensitive to the definition of RSI: a device reporting flight time ÷ contact time gives markedly higher values than jump height ÷ contact time.'},
  {tr:'Yatay Güç',en:'Horizontal Power',atr:'referans yok',aen:'no reference',
   str:'Antrenmanlı popülasyon referansı YOK. Durarak uzun atlama için mevcut percentile tabloları okul popülasyonlarına aittir; sporcu olmayanlarla kıyaslamamak için bu sütun her iki modda da takım içi okunur.',
   sen:'NO trained-population reference. The standing broad jump percentile tables that exist are school populations, so rather than compare athletes with non-athletes this column is read within the squad in both modes.'},
  {tr:'Lateral Güç',en:'Lateral Power',atr:'referans yok',aen:'no reference',
   str:'Antrenmanlı popülasyon referansı YOK — lateral countermovement jump için yayınlanmış bir referans değer yok, bu sütun her iki modda da takım içi okunur.',
   sen:'NO trained-population reference — nothing is published for a lateral countermovement jump, so this column is read within the squad in both modes.'},
  {tr:'Hız / Yön Değiştirme',en:'Speed / COD',atr:'ölçülen: 12-16 · 17-18 uzatma',aen:'measured: 12-16 · 17-18 extrapolated',
   str:'T-test ve 20 m: Ramos ve ark. 2021 (12-16 yaş; PHV\'de T-test 10.31 s, 20 m 3.34 s), 17-18 kıdemli basketbol standardına doğru uzatıldı. 5-0-5: Turner ve ark. 2022, Strength Cond J 44(4) — 50 çalışma, 11 spor, 300 erkek sporcudan derlenmiş normatif veri; yetişkin ağırlıklıdır, çalışmanın kendisi genç yaş verisinin yetersizliğini belirtir. Hangi test girildiyse referans satırı ona göre seçilir. Yaygın alıntılanan T-test bantları (Pauole ve ark. 2000, JSCR 14(4):443-450) 304 üniversite yaşındaki karma katılımcıdan gelir — sporcu popülasyonu olmadığı için referans olarak KULLANILMADI, o yüzden o "iyi" bandındaki bir süre burada düşük okunur.',
   sen:'T-test and 20 m: Ramos et al. 2021 (ages 12-16; T-test 10.31 s and 20 m 3.34 s at peak height velocity), with 17-18 carried out toward a senior basketball standard. 5-0-5: Turner et al. 2022, Strength Cond J 44(4) — normative data pooled from 50 studies, 11 sports and 300 male athletes; it is adult-weighted and the paper itself notes how thin the youth data is. The reference row follows whichever test was actually entered. The widely quoted T-test bands (Pauole et al. 2000, JSCR 14(4):443-450) come from 304 mixed college-aged participants — not an athlete population, so they are NOT used as the reference, which is why a time inside that "good" band reads low here.'},
  {tr:'İş Kapasitesi',en:'Work Capacity',atr:'ölçülen: 15.7 ± 1.2',aen:'measured: 15.7 ± 1.2',
   str:'Stojanović ve ark. 2016, Monten J Sports Sci Med 5(2) — 34 iyi antrenmanlı genç basketbolcu, 15.7 ± 1.2 yaş, 6.3 yıl antrenman geçmişi. 20 m shuttle run\'ın tahmin ettiği VO2max 48.9 ± 4.1 ml/kg/dk. Aynı çalışmada shuttle, doğrudan ölçülen VO2max\'i olduğundan düşük gösteriyor (48.9\'a karşı 55.5); uygulama shuttle\'ın kendi sayısını kaydettiği için referans da o sayıdır. Diğer yaşlar bu çıpadan uzatıldı. Okul popülasyonuna ait FITNESSGRAM sağlık bandı referans olarak kullanılmadı.',
   sen:'Stojanović et al. 2016, Monten J Sports Sci Med 5(2) — 34 well-trained young basketball players, 15.7 ± 1.2 years, 6.3 years of training. VO2max as the 20 m shuttle run estimates it: 48.9 ± 4.1 ml/kg/min. In the same study the shuttle underestimates directly measured VO2max (48.9 against 55.5), and since this app records the shuttle\'s own number that is what the reference is. The other ages are extrapolated from that anchor. The school-population FITNESSGRAM health band is not used as a reference.'},
];
/* One plain sentence per quality, written for the athlete rather than the coach —
   printed under the level table so a player reading their own row knows what the
   column was actually measuring. Deliberately not the test protocol: what it is
   for on a basketball court. */
const AB_MEANINGS={
  movement:['Temel hareket kalitesi ve denge — vücudunu kontrollü kullanabiliyor musun.',
            'Basic movement quality and balance — whether you can control your body under load.'],
  mobility:['Eklemlerinin hareket genişliği — ayak bileği ve kalça yeterince açılıyor mu.',
            'How far your joints move — whether the ankles and hips open up enough.'],
  relstr:  ['Kendi vücut ağırlığına göre ne kadar kuvvetlisin.',
            'How strong you are for your own body weight.'],
  vert:    ['Yukarı doğru sıçrama gücün — ribaund, blok ve şut.',
            'How much force you send upward — rebounding, blocking and shooting.'],
  reactive:['Yere değdiğin anda ne kadar hızlı geri sıçrayabildiğin — kısa temas süresi.',
            'How quickly you leave the ground again after landing — short contact time.'],
  horiz:   ['İleri doğru itme gücün — ilk adım ve ivmelenme.',
            'How much force you send forward — first step and acceleration.'],
  lateral: ['Yana doğru güç ve tek bacak kapasiten — savunma kaymaları ve tek ayak inişleri.',
            'Sideways power and single-leg capacity — defensive slides and one-footed landings.'],
  cod:     ['Düz koşu hızın, ve yön değiştirirken frenleyip yeniden hızlanman.',
            'Straight-line speed, and braking then re-accelerating when you turn.'],
  work:    ['Maçın sonuna kadar tempoyu koruyabilmen — kondisyon.',
            'Holding the tempo to the end of the game — conditioning.'],
};
const abMeaning=id=>{const m=AB_MEANINGS[id];return m?L(m[0],m[1]):'';};
const abPosShift=(metric,pos)=>{
  const t=AB_POS_SHIFT[metric],g=abPosGrp(pos);
  return(t&&g&&t[g]!=null)?t[g]:0;
};
/* One value against the reference. Returns null — not a middling percentile —
   whenever the reference cannot speak: no norm for this test, no age on the
   athlete, or nothing entered. */
function abNormPct(v,key,age,shift){
  const n=AB_NORMS[key];
  if(v==null||!n)return null;
  let mean,sd;
  if(n.flat){mean=n.flat.m;sd=n.flat.sd;}
  else{
    if(age==null)return null;
    const i=Math.max(0,Math.min(n.m.length-1,Math.round(age)-AB_NORM_AGE0));
    mean=n.m[i];sd=n.sd[i];
  }
  if(!(sd>0))return null;
  let z=(v-mean)/sd;
  if(n.dir==='lo')z=-z;
  z-=(shift||0);
  return Math.max(1,Math.min(99,Math.round(abPhi(z)*100)));
}
/* The reference reading of one quality, built from the same test entries the
   within-team reading used — same values, same weighting, different yardstick. */
function abNormMetric(entries,metric,age,pos){
  const sh=abPosShift(metric,pos);
  const out=(entries||[]).map(e=>{
    const pct=e.n==='ord'?abOrdPct(e.v):abNormPct(e.v,e.n,age,sh);
    return pct==null?null:{...e,p:pct};
  }).filter(Boolean);
  if(!out.length)return null;
  return{pct:abMean(out.map(x=>x.p)),used:out};
}

/* What the cell shows. In reference mode the age-and-position reading is used where
   it exists and the squad reading stands in where it does not — a lateral jump, an
   athlete with no date of birth — and `src` says which one answered, so the screen
   never passes off one reference as the other. */
const abCell=(pf,metric,ref)=>{
  const team=pf.m?(pf.m[metric]==null?null:pf.m[metric]):null;
  const norm=pf.mn?(pf.mn[metric]==null?null:pf.mn[metric]):null;
  const useNorm=ref!==AB_REF_TEAM&&norm!=null;
  const pct=useNorm?norm:team;
  const src=pct==null?null:(useNorm?'norm':'team');
  const auto=abLevel(pct),ov=abOvOf(pf,metric);
  return{pct,auto,ov,src,level:ov||auto,team,norm};
};
/* The evidence line behind a cell, in whichever reference answered it. */
const abCellUsed=(pf,metric,ref)=>{
  const c=abCell(pf,metric,ref);
  return(c.src==='norm'?pf.mnu&&pf.mnu[metric]:pf.mu&&pf.mu[metric])||[];
};

/* A coach's own test only counts as strength data when its name says it is a
   strength test. "Squat Jump" is not a squat, so anything naming a jump, a hop
   or a throw is excluded even when the rest of the name matches. */
const AB_STR_RE=/(\b1\s*rm\b|1rm|\brm\b|imtp|isometric|izometrik|mid[\s-]?thigh|deadlift|dead\s*lift|trap[\s-]?bar|hex[\s-]?bar|back\s*squat|front\s*squat|split\s*squat|bulgarian|bench\s*press|leg\s*press|maksimal\s*kuvvet|max(imal)?\s*strength|relative\s*strength|göreceli\s*kuvvet)/i;
const AB_STR_NOT_RE=/(jump|sıçra|sicra|\bhop\b|throw|atış|atis|sprint|plyo|pliyo)/i;
const abStrengthTests=cts=>(cts||[]).filter(c=>AB_STR_RE.test(c.name||'')&&!AB_STR_NOT_RE.test(c.name||''));
/* §9 — DSI = CMJ peak force / IMTP peak force, when the coach has logged both as
   custom tests. It describes the strength↔power relationship and nothing else,
   so it only ever supports a verdict the jump and strength data already point at. */
const AB_DSI_CMJ_RE=/cmj[\s\S]*force|cmj\s*pf/i;
const AB_DSI_IMTP_RE=/(imtp|isometric\s*(mid|squat))/i;
const abFindTest=(cts,re)=>(cts||[]).find(c=>re.test(c.name||''))||null;

/* Everything one athlete's row needs, pulled off the test record chosen for the
   board. Values only — the ranking happens once the whole squad has been read. */
function abRaw(t,strTests){
  const lr=cmpN(t.lateralCmj&&t.lateralCmj.right),ll=cmpN(t.lateralCmj&&t.lateralCmj.left);
  /* Movement control and mobility read the screening side of the battery: the
     overhead squat grade, the Y-Balance composite and its widest left/right reach
     gap, ankle dorsiflexion and the active straight-leg raise. */
  const yb=ybCalc(t.yBalance);
  const adfR=cmpN(t.ankleDF&&t.ankleDF.right),adfL=cmpN(t.ankleDF&&t.ankleDF.left);
  const aslrR=cmpN(t.aslr&&t.aslr.right),aslrL=cmpN(t.aslr&&t.aslr.left);
  const w=cmpN(t.weight);
  const str=strTests.map(c=>cmpN(t.custom&&t.custom[c.id]));
  return{
    cmj:cmpN(t.cmj),sj:cmpN(t.squatJump),vj:cmpN(t.verticalJump),
    rsi:cmpN(t.dropJump),hj:cmpN(t.horizontalJump),
    lcjR:lr,lcjL:ll,lcjGap:cmpGap(lr,ll),lcjAsym:abAsym(lr,ll),
    tt:cmpN(t.tTest),f505:cmpN(t.fiveZeroFive),sp20:cmpN(t.sprint20m&&t.sprint20m.time),
    str,
    /* Relative strength: a load already entered per kilogram stands as it is, a load
       in kilograms is divided by body mass, and without body mass there is nothing
       to divide by — so that athlete is simply not ranked on this quality. */
    relStr:strTests.map((c,i)=>{const val=str[i];
      if(val==null)return null;
      if(AB_REL_RE.test(c.name||''))return val;
      return(w!=null&&w>0)?+(val/w).toFixed(3):null;}),
    ohs:cmpN(t.ohs&&t.ohs.score),
    ybComp:abAvg([yb.compR,yb.compL]),ybGap:abMax([yb.dAnt,yb.dPm,yb.dPl]),
    adfR,adfL,adf:abAvg([adfR,adfL]),adfGap:cmpGap(adfR,adfL),
    aslrR,aslrL,aslr:abAvg([aslrR,aslrL]),
    shut:cmpN(t.shuttleRun),
    height:cmpN(t.height),weight:w,
  };
}

/* Reads the whole squad at once, because a percentile only exists relative to
   the others. Returns one profile per athlete plus the pool it was ranked in,
   so the screen can say how many team-mates a reading was drawn from. */
function abBoard(athletes,scope,customTests){
  const strTests=abStrengthTests(customTests);
  const dsiCmj=abFindTest(customTests,AB_DSI_CMJ_RE),dsiImtp=abFindTest(customTests,AB_DSI_IMTP_RE);
  const all=(athletes||[]).map(a=>({a,t:cmpTestOf(a,scope)}));
  const rows=all.filter(r=>r.t).map(r=>({...r,v:abRaw(r.t,strTests)}));
  const col=k=>rows.map(r=>r.v[k]);
  const strCols=strTests.map((c,i)=>rows.map(r=>r.v.str[i]));
  const relCols=strTests.map((c,i)=>rows.map(r=>r.v.relStr[i]));
  const pools={cmj:col('cmj'),sj:col('sj'),vj:col('vj'),rsi:col('rsi'),hj:col('hj'),
    lcjR:col('lcjR'),lcjL:col('lcjL'),lcjAsym:col('lcjAsym'),tt:col('tt'),f505:col('f505'),sp20:col('sp20'),
    ohs:col('ohs'),ybComp:col('ybComp'),ybGap:col('ybGap'),
    adf:col('adf'),adfGap:col('adfGap'),aslr:col('aslr'),shut:col('shut'),
    height:col('height'),weight:col('weight')};
  /* Ages of the squad this board ranks inside. Biological maturity is what actually
     drives jump, sprint and agility numbers at this age and the app does not measure
     it, but knowing an athlete is a year younger than the squad's middle still tells
     a coach who they are being ranked against. */
  const ageOfA=a=>{if(!a||!a.dateOfBirth)return null;const b=parseD(a.dateOfBirth),n=new Date();
    let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;return y;};
  /* The age a reference row should be picked with is the age on the day of the test.
     Reading a record taken two years ago against today's age would mark an athlete
     down for having had a birthday. */
  const ageAt=(a,d)=>{if(!a||!a.dateOfBirth)return null;if(!d)return ageOfA(a);
    const b=parseD(a.dateOfBirth),n=parseD(d);if(!n||isNaN(n))return ageOfA(a);
    let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;
    return(y>=0&&y<60)?y:null;};
  const ages=rows.map(r=>ageOfA(r.a)).filter(x=>x!=null).sort((a,b)=>a-b);
  const medAge=ages.length?ages[Math.floor(ages.length/2)]:null;
  const youth=ages.length>0&&ages[0]<18;

  const profiles=rows.map(r=>{
    const v=r.v,p={},used={},notes={};
    /* B. DİKEY POWER — CMJ first, SJ next, both when both are there. The plain
       vertical jump is only read when neither of the two is, and it is named as
       the source so nobody mistakes it for a CMJ. */
    const pc=abPct(v.cmj,pools.cmj,'hi'),ps=abPct(v.sj,pools.sj,'hi');
    if(pc!=null||ps!=null){
      p.vert=abMean([pc,ps]);
      used.vert=[pc!=null?{k:'CMJ',v:v.cmj,u:' cm',p:pc,n:'cmj'}:null,
                 ps!=null?{k:'SJ',v:v.sj,u:' cm',p:ps,n:'sj'}:null].filter(Boolean);
    }else{
      const pv=abPct(v.vj,pools.vj,'hi');
      if(pv!=null){
        p.vert=pv;used.vert=[{k:L('Dikey Sıçrama','Vertical Jump'),v:v.vj,u:' cm',p:pv,n:'vj'}];
        notes.vert=L('CMJ/SJ yok — dikey sıçrama üzerinden okundu.','No CMJ/SJ — read from the plain vertical jump.');
      }
    }
    /* C. REAKTİF KUVVET / ELASTİKİYET — drop jump RSI, and nothing else. No RSI,
       no verdict: reactive strength is not inferred from a countermovement jump. */
    const pr=abPct(v.rsi,pools.rsi,'hi');
    if(pr!=null){p.reactive=pr;used.reactive=[{k:'DJ RSI',v:v.rsi,u:'',p:pr,n:'rsi'}];}
    /* D. YATAY POWER — horizontal jump. */
    const ph=abPct(v.hj,pools.hj,'hi');
    if(ph!=null){p.horiz=ph;used.horiz=[{k:L('Yatay Sıçrama','Horizontal Jump'),v:v.hj,u:' cm',p:ph,n:'hj'}];}
    /* E. LATERAL / TEK BACAK — the level of each side first, then the imbalance
       between them, ranked as a percentage of the better limb rather than as raw
       centimetres. Both matter and neither is the whole answer, so the level carries
       60% and the asymmetry 40%; whichever exists alone carries it all. */
    const plr=abPct(v.lcjR,pools.lcjR,'hi'),pll=abPct(v.lcjL,pools.lcjL,'hi'),
      pg=abPct(v.lcjAsym,pools.lcjAsym,'lo'),lvl=abMean([plr,pll]);
    if(lvl!=null||pg!=null){
      p.lateral=(lvl!=null&&pg!=null)?Math.round(lvl*0.6+pg*0.4):(lvl!=null?lvl:pg);
      used.lateral=[plr!=null?{k:'Lateral CMJ R',v:v.lcjR,u:' cm',p:plr}:null,
                    pll!=null?{k:'Lateral CMJ L',v:v.lcjL,u:' cm',p:pll}:null,
                    pg!=null?{k:L('Sağ-sol asimetri','R-L asymmetry'),v:v.lcjAsym,u:'%',p:pg}:null].filter(Boolean);
      /* Two separate readings, because they answer different questions: the ranking
         says how this imbalance compares with the squad's, the percentage says
         whether it is large enough to be worth watching at all. */
      if(v.lcjAsym!=null&&v.lcjAsym>=AB_ASYM_FLAG)
        notes.lateral=L(`Sağ-sol asimetrisi %${abFmt(v.lcjAsym)} — izlem eşiğinin (%${AB_ASYM_FLAG}) üzerinde.`,
                        `The left/right asymmetry is ${abFmt(v.lcjAsym)}% — above the ${AB_ASYM_FLAG}% monitoring level.`);
      else if(pg!=null&&pg<AB_Z_DEV)
        notes.lateral=L('Sağ-sol asimetrisi takımın en geniş %20\'sinde (mutlak değeri küçük olsa da).',
                        'The left/right asymmetry sits in the team\'s widest 20%, small though it is in absolute terms.');
    }
    /* F. HIZ / YÖN DEĞİŞTİRME — T-test, inverted. With no T-test the 5-0-5 and
       then the 20 m sprint stand in, named each time: a 5-0-5 is one turn and a
       20 m is a straight line, and the sentence written about them says so. */
    let pcod=abPct(v.tt,pools.tt,'lo'),cv=v.tt,ck='T-Test',cn='tt';
    if(pcod==null){
      pcod=abPct(v.f505,pools.f505,'lo');cv=v.f505;ck='5-0-5';cn='f505';
      if(pcod!=null)notes.cod=L('T-test yok — 5-0-5 üzerinden okundu.','No T-test — read from the 5-0-5.');
    }
    if(pcod==null){
      pcod=abPct(v.sp20,pools.sp20,'lo');cv=v.sp20;ck='20m Sprint';cn='sp20';
      if(pcod!=null)notes.cod=L('T-test/5-0-5 yok — 20m sprint üzerinden okundu; bu düz hızdır, yön değiştirme değil.',
                                'No T-test/5-0-5 — read from the 20m sprint, which is straight-line speed, not change of direction.');
    }
    /* The reference row follows whichever test actually stood in — a 5-0-5 is not
       read against a T-test's numbers. */
    if(pcod!=null){p.cod=pcod;used.cod=[{k:ck,v:cv,u:' s',p:pcod,n:cn}];}
    /* A. TEMEL KUVVET — only ever from a real strength test. */
    const strP=strTests.map((c,i)=>({c,v:v.str[i],p:abPct(v.str[i],strCols[i],'hi')})).filter(x=>x.p!=null);
    if(strP.length){
      p.strength=abMean(strP.map(x=>x.p));
      used.strength=strP.map(x=>({k:x.c.name,v:x.v,u:'',p:x.p}));
    }
    let dsi=null;
    if(dsiCmj&&dsiImtp){
      const a=cmpN(r.t.custom&&r.t.custom[dsiCmj.id]),b=cmpN(r.t.custom&&r.t.custom[dsiImtp.id]);
      if(a!=null&&b!=null&&b>0)dsi=+(a/b).toFixed(2);
    }
    /* Context the verdict is read against but never decided by: how this athlete's
       straight-line speed compares (a slow turn is mostly a slow run-in), how far
       their body mass and stature sit from the squad's, and how old they are inside
       an age group where a year is a great deal of development. */
    const ctx={
      sprintPct:abPct(v.sp20,pools.sp20,'lo'),codSrc:pcod==null?null:ck,
      zW:abZ(v.weight,pools.weight),zH:abZ(v.height,pools.height),
      age:ageOfA(r.a),medAge,youth,
      strengthAbs:strP.some(x=>!/relative|göreceli|\/\s*kg|per\s*kg|\bbw\b|vücut\s*ağırlığı/i.test(x.c.name||'')),
    };
    /* ---- the nine-column level table ------------------------------------
       Five of the nine are the qualities the verdict already ranked, taken
       across unchanged so the table and the box can never contradict each
       other. The other four — movement control, mobility, relative strength
       and work capacity — are read here, from the screening and conditioning
       side of the battery that the deficit boxes do not cover. */
    const m={},mu={};
    const setM=(k,pct,used)=>{const u=(used||[]).filter(Boolean);
      if(pct!=null&&u.length){m[k]=pct;mu[k]=u;}};
    const pOhs=abPct(v.ohs,pools.ohs,'hi'),
          pYb=abPct(v.ybComp,pools.ybComp,'hi'),
          pYbG=abPct(v.ybGap,pools.ybGap,'lo');
    setM('movement',abMean([pOhs,pYb,pYbG]),[
      pOhs!=null?{k:L('Overhead Squat','Overhead Squat'),v:v.ohs,u:'/3',p:pOhs,n:'ord'}:null,
      pYb!=null?{k:L('YBT kompozit','YBT composite'),v:v.ybComp,u:'%',p:pYb,n:'ybComp'}:null,
      pYbG!=null?{k:L('YBT sağ-sol farkı','YBT R-L gap'),v:v.ybGap,u:' cm',p:pYbG,n:'ybGap'}:null]);
    const pAdf=abPct(v.adf,pools.adf,'hi'),
          pAdfG=abPct(v.adfGap,pools.adfGap,'lo'),
          pAslr=abPct(v.aslr,pools.aslr,'hi');
    setM('mobility',abMean([pAdf,pAdfG,pAslr]),[
      pAdf!=null?{k:L('Ayak bileği DF','Ankle DF'),v:v.adf,u:'°',p:pAdf,n:'adf'}:null,
      pAdfG!=null?{k:L('Ayak bileği farkı','Ankle DF gap'),v:v.adfGap,u:'°',p:pAdfG,n:'adfGap'}:null,
      pAslr!=null?{k:'ASLR',v:v.aslr,u:'/3',p:pAslr,n:'ord'}:null]);
    const relP=strTests.map((c,i)=>({c,v:v.relStr[i],p:abPct(v.relStr[i],relCols[i],'hi')}))
      .filter(x=>x.p!=null);
    setM('relstr',abMean(relP.map(x=>x.p)),
      relP.map(x=>({k:x.c.name,v:x.v,u:AB_REL_RE.test(x.c.name||'')?'':L(' × VA',' × BM'),p:x.p,n:'relStr'})));
    ['vert','reactive','horiz','lateral','cod'].forEach(k=>setM(k,p[k],used[k]));
    /* Shuttle Run is entered as a VO2max estimate, so a higher number is the
       better one — the same field read as a time would rank the squad backwards. */
    const pShut=abPct(v.shut,pools.shut,'hi');
    setM('work',pShut,[pShut!=null?{k:'Shuttle Run',v:v.shut,u:'',p:pShut,n:'shut'}:null]);
    /* ---- the same nine qualities, read against age and position -----------
       Same values and same weighting as above; only the yardstick changes. A
       quality whose tests have no published reference — the lateral jump — and an
       athlete with no date of birth simply produce nothing here, and the table
       falls back to the squad reading for that cell. Age is taken at the date of
       the test, not today, so an old record is not read against the age the
       athlete has since grown into. */
    const nAge=ageAt(r.a,r.t&&r.t.date),nPos=r.a.position;
    const mn={},mnu={};
    AB_METRICS.forEach(mt=>{
      const nr=abNormMetric(mu[mt.id],mt.id,nAge,nPos);
      if(nr&&nr.pct!=null){mn[mt.id]=nr.pct;mnu[mt.id]=nr.used;}
    });
    return{id:r.a.id,a:r.a,t:r.t,v,p,used,notes,dsi,ctx,m,mu,mn,mnu,
      normAge:nAge,normPos:abPosGrp(nPos)||null,...abVerdict(p,dsi)};
  });
  /* An athlete with no test in this period is not an athlete with no needs —
     they stand in the VERİ YETERSİZ box, which is the honest answer. */
  const untested=all.filter(r=>!r.t).map(r=>({id:r.a.id,a:r.a,t:null,v:null,p:{},used:{},notes:{},dsi:null,
    ctx:{age:ageOfA(r.a),medAge,youth},m:{},mu:{},mn:{},mnu:{},
    normAge:ageOfA(r.a),normPos:abPosGrp(r.a.position)||null,...abVerdict({},null)}));
  return{profiles:[...profiles,...untested],pool:rows.length,strengthNames:strTests.map(c=>c.name)};
}

/* §5-§8 — the verdict. Deficit score is 100 − percentile, so the smallest
   percentile is the largest deficit and the main need is simply the lowest
   assessable quality. Above P40 nothing is forced into a box. */
function abVerdict(p,dsi){
  const rank=AB_ORDER.filter(id=>p[id]!=null).map(id=>({id,pct:p[id],def:abDeficit(p[id])}))
    .sort((x,y)=>x.pct-y.pct||AB_ORDER.indexOf(x.id)-AB_ORDER.indexOf(y.id));
  const unassessed=AB_ORDER.filter(id=>p[id]==null);
  if(!rank.length)
    return{primary:{box:'nodata',pct:null},secondary:null,strong:null,conf:'nodata',rank,unassessed,transfer:false};
  /* §14 — the verdict is only ever as good as the number of qualities behind it. */
  const conf=rank.length>=4?'high':rank.length>=2?'mid':'low';
  const lowest=rank[0];
  /* §6 — Kural 1-3 put the lowest quality in the main box whenever it is under
     P40; Kural 4 keeps an athlete with nothing under P40 out of the deficit
     boxes altogether rather than inventing a weakness. */
  let primary=lowest.pct<AB_Z_WATCH?{box:lowest.id,pct:lowest.pct}
    :{box:'none',pct:lowest.pct,low:lowest.id};
  /* §7 — the second need is the next largest deficit, and only when it is one:
     at P40 and above there is no second box to fill. */
  const second=rank[1];
  let secondary=(primary.box!=='none'&&second&&second.pct<AB_Z_WATCH)?{box:second.id,pct:second.pct}:null;
  /* §8 — strength that is not coming out as fast force. An athlete who can
     produce force but is not turning it into a ballistic output has a different
     problem from one who has no force, and it gets its own box. A DSI at or below
     0.60 says the same thing from the force side: little of the isometric ceiling
     is reaching the jump, which is the band the literature puts under ballistic
     emphasis. A DSI at or above 0.80 points the other way — the jump is already
     close to the ceiling, so the ceiling is what has to rise — and it must not
     relabel a vertical-power deficit as a transfer problem. */
  const dsiBallistic=dsi!=null&&dsi<=AB_DSI_LO,dsiStrength=dsi!=null&&dsi>=AB_DSI_HI;
  const transfer=!dsiStrength&&(
       (p.strength!=null&&p.vert!=null&&p.strength>=AB_Z_STRONG&&p.vert<50&&p.strength-p.vert>=25)
    ||(dsiBallistic&&p.vert!=null&&p.vert<50));
  if(transfer){
    if(primary.box==='vert')primary={...primary,box:'conv'};
    else if(primary.box==='none'&&p.vert!=null&&p.vert<50)primary={box:'conv',pct:p.vert};
    else if(secondary&&secondary.box==='vert')secondary={...secondary,box:'conv'};
  }
  return{primary,secondary,strong:rank[rank.length-1],conf,rank,unassessed,transfer,dsiBallistic,dsiStrength};
}

/* ---- The sentences under the verdict -------------------------------------
   Written from the numbers that produced it — the test, the value, the
   percentile — so a coach can check the reasoning rather than take it. Never a
   label on the athlete, always a quality. */
const AB_POS_CTX={
  Guard:  ['ilk adım ve ivmelenme','first step and acceleration'],
  Forward:['transition ve ileri yönlü uzun mesafe hareketleri','transition and long forward actions'],
  Center: ['ilk adım ve pozisyon değişimi','first step and repositioning'],
};
/* Two decimals rather than the comparison table's one: an RSI of 1.02 and an RSI
   of 1.05 are different jumps, and rounding both to "1" would hide the number the
   percentile was drawn from. Trailing zeros are still dropped. */
const abFmt=v=>v==null?'—':String(+(Math.round(v*100)/100));
/* Turkish puts the sign in front of the number, English behind it. */
const abPctVal=v=>L(`%${abFmt(v)}`,`${abFmt(v)}%`);
const abUsedTxt=u=>(u||[]).map(x=>`${x.k} ${x.u==='%'?abPctVal(x.v):abFmt(x.v)+(x.u||'')} · P${x.p}`).join(', ');
/* `conv` is read off the vertical-power tests — the box is about what the jump
   numbers are not showing, so that is where its evidence comes from. */
const abSrc=(pf,box)=>pf.used[box==='conv'?'vert':box]||[];
function abReasonP(pf){
  const pr=pf.primary;
  if(pr.box==='nodata')
    return L('Bu dönemde takım içi percentile üretecek yeterli test verisi yok.',
             'There is not enough test data in this period to produce a within-team percentile.');
  if(pr.box==='none')
    return L(`Değerlendirilebilir tüm özellikler P${AB_Z_WATCH} ve üzerinde — en düşüğü ${abBoxName(pr.low)} (P${pr.pct}). Zorlama bir eksiklik kutusu atanmadı.`,
             `Every assessable quality is at P${AB_Z_WATCH} or above — the lowest is ${abBoxName(pr.low)} (P${pr.pct}). No deficit box was forced.`);
  let s=L(`${abBoxName(pr.box)} takım içinde P${pr.pct} ile ${abZoneLoc(pr.pct)} (${abUsedTxt(abSrc(pf,pr.box))}).`,
          `${abBoxName(pr.box)} sits at P${pr.pct} within the squad, ${abZoneLoc(pr.pct)} (${abUsedTxt(abSrc(pf,pr.box))}).`);
  if(pr.box==='conv')
    s+=' '+L(`Kuvvet üretme kapasitesi mevcut (${abBoxName('strength')} P${pf.p.strength==null?'—':pf.p.strength}${pf.dsi!=null?`, DSI ${pf.dsi}`:''}) ancak balistik çıktıya aynı ölçüde aktarılmıyor.`,
             `The force is there (${abBoxName('strength')} P${pf.p.strength==null?'—':pf.p.strength}${pf.dsi!=null?`, DSI ${pf.dsi}`:''}) but it is not coming out as ballistic output at the same level.`);
  return s;
}
function abReasonS(pf){
  const sc=pf.secondary;
  if(pf.primary.box==='nodata')
    return L('Ana ihtiyaç belirlenemediği için ikincil ihtiyaç da atanmadı.',
             'With no main need established, no secondary need was assigned either.');
  if(!sc)
    return L(`Değerlendirilebilir diğer özelliklerde P${AB_Z_WATCH} altına inen ikinci bir açık yok.`,
             `No other assessable quality drops below P${AB_Z_WATCH}.`);
  return L(`İkinci en büyük açık ${abBoxName(sc.box)} (P${sc.pct} — ${abUsedTxt(abSrc(pf,sc.box))}).`,
           `The next largest deficit is ${abBoxName(sc.box)} (P${sc.pct} — ${abUsedTxt(abSrc(pf,sc.box))}).`);
}
function abWhy(pf){
  const out=[abReasonP(pf),abReasonS(pf)];
  /* The quality to protect — but only called a strength when it reached the strong
     zone. A squad's best number can still sit in the development zone, and saying
     "keep this" about a P19 would invent a strength the data does not show. */
  if(pf.strong)
    out.push(pf.strong.pct>=AB_Z_STRONG
      ?L(`En yüksek percentile ${abBoxName(pf.strong.id)} (P${pf.strong.pct}) — koruma dozuyla sürdürülmeli.`,
         `The highest percentile is ${abBoxName(pf.strong.id)} (P${pf.strong.pct}) — keep it on a maintenance dose.`)
      :L(`Hiçbir özellik güçlü bölgeye (P${AB_Z_STRONG}+) ulaşmıyor; en yüksek percentile ${abBoxName(pf.strong.id)} (P${pf.strong.pct}).`,
         `No quality reaches the strong zone (P${AB_Z_STRONG}+); the highest percentile is ${abBoxName(pf.strong.id)} (P${pf.strong.pct}).`));
  /* §11 — position colours what the gap costs on the floor; it never excuses it. */
  const pos=AB_POS_CTX[posOf(pf.a.position)];
  if(pos&&(pf.primary.box==='horiz'||pf.primary.box==='cod'))
    out.push(L(`${POS_FULL[pf.a.position]} olarak bu açık en çok ${pos[0]} tarafında karşılık buluyor.`,
               `As a ${POS_FULL[pf.a.position]} this gap shows up mostly in ${pos[1]}.`));
  /* Whichever "this came from a stand-in test" note belongs to a box in the verdict. */
  const boxes=[pf.primary.box==='conv'?'vert':pf.primary.box,
               pf.secondary?(pf.secondary.box==='conv'?'vert':pf.secondary.box):null];
  Object.keys(pf.notes||{}).forEach(k=>{if(boxes.includes(k))out.push(pf.notes[k]);});
  return out;
}

/* §18 — at most three priorities. The strong quality is never dropped from the
   week, only reduced to a maintenance dose, so it does not appear here. */
const AB_PRIORITIES={
  strength:[['Bilateral temel kuvvet progresyonu (squat / hinge)','Bilateral foundational strength progression (squat / hinge)'],
            ['Tek bacak kuvvet: split squat, step-up, RDL','Single-leg strength: split squat, step-up, RDL'],
            ['Teknik kalite ve kademeli yükleme','Technical quality and progressive loading']],
  vert:    [['Dikey güç üretimi: CMJ/SJ odaklı sıçrama çalışması','Vertical power output: CMJ/SJ-focused jump work'],
            ['Relative strength altyapısını geliştirme','Building the relative-strength base underneath it'],
            ['Dikey gücün basketbola özgü sıçramalara aktarılması','Transferring vertical power into basketball-specific jumps']],
  reactive:[['Kısa temas süreli plyometrik: pogo, hurdle hop, low-box','Short-contact plyometrics: pogo, hurdle hop, low box'],
            ['Ayak bileği–aşil sertliği ve iniş kontrolü','Ankle–achilles stiffness and landing control'],
            ['Temas süresi geri bildirimiyle sıçrama kalitesi','Jump quality with contact-time feedback']],
  horiz:   [['Yatay kuvvet üretimi: sled push/march, ivmelenme koşuları','Horizontal force production: sled push/march, acceleration runs'],
            ['Broad jump ve bounding progresyonu','Broad jump and bounding progression'],
            ['İlk adım mekaniği ve ileri yönlü patlayıcılık','First-step mechanics and forward explosiveness']],
  lateral: [['Tek bacak kuvvet ve lateral sıçrama kapasitesi','Single-leg strength and lateral jump capacity'],
            ['İniş kontrolü ve frontal düzlem stabilitesi','Landing control and frontal-plane stability'],
            ['Sağ-sol hacminin eşitlenmesi ve farkın izlenmesi','Evening out left/right volume and monitoring the gap']],
  cod:     [['Frenleme (deceleration) kapasitesi','Braking / deceleration capacity'],
            ['Yön değiştirme mekaniği ve kesme açıları','Change-of-direction mechanics and cutting angles'],
            ['Kısa mesafe ivmelenme ve reaktif çeviklik','Short-distance acceleration and reactive agility']],
  conv:    [['Balistik antrenman: loaded jump, olimpik kaldırış türevleri','Ballistic training: loaded jumps, Olympic-lift derivatives'],
            ['Medicine-ball atışları ve patlayıcı niyet','Medicine-ball throws and explosive intent'],
            ['Mevcut kuvvetin sıçrama ve sprinte aktarımı','Transferring the existing strength into jumping and sprinting']],
  none:    [['Mevcut kapasitenin geliştirilmesi ve genel atletik gelişim','Developing the capacity already there, and general athletic development'],
            ['Tüm özelliklerde koruma dozunun sürdürülmesi','Keeping a maintenance dose across every quality'],
            ['Teknik kalite ve yük yönetimi','Technical quality and load management']],
  nodata:  [['Test bataryasının tamamlanması: CMJ/SJ, drop jump, yatay sıçrama','Completing the battery: CMJ/SJ, drop jump, horizontal jump'],
            ['T-test ile yön değiştirme kapasitesinin ölçülmesi','Measuring change of direction with a T-test'],
            ['Kuvvet testi eklenmesi (relative 1RM / IMTP)','Adding a strength test (relative 1RM / IMTP)']],
};
function abPriorities(pf){
  const list=(AB_PRIORITIES[pf.primary.box]||AB_PRIORITIES.none).map(x=>L(x[0],x[1]));
  /* The second box earns a line of its own, in place of the third generic one. */
  if(pf.secondary){
    const s=(AB_PRIORITIES[pf.secondary.box]||[])[0];
    if(s)return[list[0],list[1],L(s[0],s[1])];
  }
  return list.slice(0,3);
}

/* §13 / §17 — what the verdict does not say. Every line here exists because
   leaving it out would let a reader take the box further than the data goes. */
function abCaution(pf,board){
  const c=[];
  if(pf.p.strength==null)
    c.push(L('Kuvvet testi bulunmadığı için temel kuvvet değerlendirilemedi — kuvvet hakkında hüküm verilmemiştir.',
             'With no strength test on the record, foundational strength was not assessed — no judgement is made about it.'));
  if(pf.primary.box==='lateral'||(pf.secondary&&pf.secondary.box==='lateral')||pf.notes.lateral)
    c.push(L('Asimetri verisi sakatlık teşhisi değildir; sağ-sol farkı yalnızca antrenman önceliği olarak okunmalıdır.',
             'An asymmetry is not a diagnosis; the left/right gap is read as a training priority and nothing more.'));
  if(board.pool<10)
    c.push(L(`Takım içi karşılaştırma ${board.pool} sporcu üzerinden yapıldı — percentile değerleri kabadır ve tek bir sporcunun eklenmesi sıralamayı belirgin biçimde değiştirebilir.`,
             `The within-team comparison is drawn from ${board.pool} athletes — the percentiles are coarse, and one more athlete can move the ranking noticeably.`));
  if(pf.conf==='low')
    c.push(L('Yalnızca tek bir fiziksel özellik değerlendirilebildi; batarya genişletilmeden bu verdiğe göre program kurulmamalı.',
             'Only one quality could be assessed; do not build the programme on this verdict before widening the battery.'));
  /* The transfer gap can be real without being one of the two largest deficits.
     It is said once here rather than pushed into a box it did not win. */
  if(pf.transfer&&pf.primary.box!=='conv'&&!(pf.secondary&&pf.secondary.box==='conv')){
    const ev=[pf.p.strength!=null?`${abBoxName('strength')} P${pf.p.strength}`:null,
              pf.p.vert!=null?`${abBoxName('vert')} P${pf.p.vert}`:null,
              pf.dsi!=null?`DSI ${pf.dsi}`:null].filter(Boolean).join(' · ');
    c.push(L(`Kuvvet ile dikey power arasında dönüşüm açığı da görülüyor (${ev}) — ana veya ikincil ihtiyaç değil, ancak programda patlayıcı niyetle desteklenebilir.`,
             `There is also a strength-to-power transfer gap (${ev}) — not the main or the secondary need, but worth supporting with explosive intent in the programme.`));
  }
  /* §9 — where both peak forces exist, the DSI band says which side of the
     force-velocity problem the athlete is on, and the ratio only means that if the
     two tests were measured on the same equipment in the same units. */
  if(pf.dsi!=null)
    c.push(pf.dsiStrength
      ?L(`DSI ${pf.dsi} — balistik çıktı izometrik tavana yakın (≥${AB_DSI_HI}); vurgu maksimal kuvvet tarafındadır. Oran, iki testin aynı protokol ve birimlerle ölçülmüş olmasını gerektirir.`,
         `DSI ${pf.dsi} — the ballistic output is already close to the isometric ceiling (≥${AB_DSI_HI}); the emphasis belongs on maximal strength. The ratio only holds if both tests were measured with the same protocol and units.`)
      :pf.dsiBallistic
      ?L(`DSI ${pf.dsi} — maksimal kuvvetin küçük bir kısmı sıçramaya aktarılıyor (≤${AB_DSI_LO}); vurgu balistik çalışmadadır. Oran, iki testin aynı protokol ve birimlerle ölçülmüş olmasını gerektirir.`,
         `DSI ${pf.dsi} — only a small share of the maximal force is reaching the jump (≤${AB_DSI_LO}); the emphasis belongs on ballistic work. The ratio only holds if both tests were measured with the same protocol and units.`)
      :L(`DSI ${pf.dsi} — ${AB_DSI_LO}–${AB_DSI_HI} aralığında: kuvvet ve balistik çalışma birlikte yürür.`,
         `DSI ${pf.dsi} — inside the ${AB_DSI_LO}–${AB_DSI_HI} band: strength and ballistic work run together.`));
  const x=pf.ctx||{};
  /* A T-test or a 5-0-5 is mostly a run-in: only about a third of the time is the
     turn itself, so a slow total time can be a slow athlete rather than a poor
     direction change. Where the sprint says the same thing, the sentence says so
     instead of letting the box claim more than the test can carry. */
  if((pf.primary.box==='cod'||(pf.secondary&&pf.secondary.box==='cod'))&&x.sprintPct!=null&&x.codSrc!=='20m Sprint'){
    c.push(x.sprintPct<AB_Z_WATCH
      ?L(`Toplam ${x.codSrc} süresinin büyük kısmı düz koşudur ve 20m sprint de P${x.sprintPct} — sınırlayan öncelikle ivmelenme olabilir, yön değiştirme mekaniği tek başına değil.`,
         `Most of the ${x.codSrc} time is straight-line running and the 20m sprint is also at P${x.sprintPct} — the limiter may be acceleration first, not the direction change on its own.`)
      :L(`20m sprint P${x.sprintPct} olduğu için düşük ${x.codSrc} süresi düz hızdan değil, yön değiştirme/frenleme tarafından geliyor gibi görünüyor.`,
         `With the 20m sprint at P${x.sprintPct}, the ${x.codSrc} time looks like it comes from the turn and the braking rather than from straight-line speed.`));
  }
  /* Larger athletes carry more inertia into a turn and over 20 m. That is context
     for the reading, not a discount on it — the lever is relative strength. */
  const big=Math.max(x.zW==null?-9:x.zW,x.zH==null?-9:x.zH);
  if(big>=1&&['cod','horiz'].some(k=>k===pf.primary.box||(pf.secondary&&k===pf.secondary.box)))
    c.push(L(`Vücut ölçüleri takım ortalamasının belirgin üzerinde (${[x.zH!=null?`boy z=${x.zH}`:null,x.zW!=null?`kilo z=${x.zW}`:null].filter(Boolean).join(', ')}) — bu testlerde daha büyük sporcular sistematik olarak dezavantajlıdır. Açığı geçersiz kılmaz; kaldıraç göreceli kuvvettir.`,
             `Body size sits clearly above the squad mean (${[x.zH!=null?`height z=${x.zH}`:null,x.zW!=null?`mass z=${x.zW}`:null].filter(Boolean).join(', ')}) — larger athletes are systematically penalised on these tests. That does not void the gap; the lever is relative strength.`));
  /* A squat ranked in kilograms ranks body mass with it. */
  if(x.strengthAbs&&pf.p.strength!=null)
    c.push(L('Kuvvet testi girildiği haliyle sıralandı; sıçrama ve yön değiştirmeyle ilişkili olan göreceli kuvvettir (1RM/vücut ağırlığı) — test mutlak yükse sıralama vücut ağırlığını da sıralar.',
             'The strength test was ranked as entered; the measure that relates to jumping and change of direction is relative strength (1RM/body mass) — if the entry is an absolute load, the ranking ranks body mass with it.'));
  /* Biological maturity, not birth date, is what drives these numbers at this age,
     and the app does not measure it. Saying so is the honest limit of the board. */
  if(x.youth)
    c.push(x.age!=null&&x.medAge!=null&&x.age<=x.medAge-1
      ?L(`Maturasyon durumu ölçülmedi ve bu yaşta sıçrama, sprint ve çeviklik sonuçlarını belirgin biçimde etkiler; bu sporcu ${x.age} yaşında, takım ortancası ${x.medAge} — kendisinden büyük takım arkadaşlarıyla sıralanıyor.`,
         `Maturity status was not measured and it drives jump, sprint and agility results heavily at this age; this athlete is ${x.age} against a squad median of ${x.medAge}, so the ranking is against older team-mates.`)
      :L('Maturasyon durumu ölçülmedi; genç yaş gruplarında biyolojik olgunluk bu testlerin sonucunu belirgin biçimde etkiler.',
         'Maturity status was not measured; in youth age groups biological maturity has a marked effect on these tests.'));
  c.push(L('Antropometri ve pozisyon yalnızca bağlam olarak kullanıldı — kutu ataması test verisine dayanır.',
           'Anthropometry and position were used as context only — the box assignment rests on the test data.'));
  return c;
}
const AB_CONF_TXT={high:['Yüksek','High'],mid:['Orta','Medium'],low:['Düşük','Low'],nodata:['Veri yetersiz','Insufficient data']};
const abConfTxt=k=>{const t=AB_CONF_TXT[k];return t?L(t[0],t[1]):'—';};

/* §20 — the structured output, one object per athlete, using only the fields the
   model defines. Exactly one main need and one secondary need, never two. */
function abJson(pf,board){
  return{
    athlete:pf.a.name||'',
    position:POS_FULL[pf.a.position]||pf.a.position||'',
    primary_need:{category:abBoxName(pf.primary.box),percentile:pf.primary.pct==null?null:pf.primary.pct,reason:abReasonP(pf)},
    secondary_need:pf.secondary
      ?{category:abBoxName(pf.secondary.box),percentile:pf.secondary.pct,reason:abReasonS(pf)}
      :{category:null,percentile:null,reason:abReasonS(pf)},
    strength:pf.strong?{category:abBoxName(pf.strong.id),percentile:pf.strong.pct}:{category:null,percentile:null},
    confidence:abConfTxt(pf.conf),
    assessed_categories:pf.rank.map(r=>abBoxName(r.id)),
    unassessed_categories:pf.unassessed.map(abBoxName),
    training_priorities:abPriorities(pf),
    caution:abCaution(pf,board).join(' '),
  };
}

