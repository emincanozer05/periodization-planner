/* Builds the exercise-library suggestion file that the Exercise Library's
   "Import suggestions" button reads.

   Every value below is a SUGGESTION written from the exercise's name (and, for an
   exercise already filed, from what the coach already entered): the app writes a
   suggested value only into a field that is empty on the exercise, never over one
   the coach filled, and marks every field it wrote as "awaiting review" on the card.

   Run:  node tools/exercise-suggestions/build.js
   Out:  tools/exercise-suggestions/exercise-suggestions.json
*/
const fs = require('fs');
const path = require('path');

const TYPE = {
  PUSH: 'Upper Body Push', PULL: 'Upper Body Pull', HIP: 'Hip Dominant', KNEE: 'Knee Dominant',
  CORE: 'Core', FB: 'Full Body', MDS: 'Multi Directional Speed', PLY: 'Plyometric', MB: 'Medicine Ball',
  MOB: 'Mobility', STAB: 'Stability', BAL: 'Balance', CORR: 'Corrective', ACC: 'Accessory',
};
const MUSCLE = {
  core: 'Abs & Core', chest: 'Chest', ub: 'Upper Back', lats: 'Lats', sh: 'Shoulders', bi: 'Biceps',
  tri: 'Triceps', quad: 'Quadriceps', ham: 'Hamstrings', glu: 'Glutes', calf: 'Calves', fa: 'Forearms',
  hf: 'Hip Flexors', add: 'Adductors', abd: 'Abductors', fb: 'Full Body', cardio: 'Cardio',
};
const PATTERN = {
  SQ: 'Squat', HI: 'Hinge', LU: 'Lunge / Unilateral', PU: 'Push', PL: 'Pull', CA: 'Carry', RO: 'Rotation',
  JP: 'Jump / Plyo', SP: 'Sprint / Locomotion', CB: 'Core / Brace', MO: 'Mobility',
};
// Contraindication ids are the app's own pain-region tags (CONSTRAINT_TAGS).
const CONTRA = ['knee', 'back', 'shoulder', 'ankle', 'hip', 'hamstring', 'neck', 'trunk', 'wrist'];

const rows = [];
/* X(name, type, fields)
   s subType · a action · p pattern (Hip/Knee) · k exKind · t technique · pos position
   eq equipment (comma list) · r bodyRegion · d difficulty 1-3 · m muscles · c contraindications
   mp movement_pattern */
function X(name, type, f) {
  const o = { name };
  if (type) o.type = TYPE[type];
  if (f.s) o.subType = f.s;
  if (f.a) o.action = f.a;
  if (f.p) o.pattern = f.p;
  if (f.k) o.exKind = f.k;
  if (f.t) o.technique = f.t;
  if (f.pos) o.position = f.pos;
  if (f.eq) o.equipment = f.eq.split(',').map(s => s.trim());
  if (f.r) o.bodyRegion = f.r;
  if (f.d) o.difficulty = 'Level ' + f.d;
  if (f.m) o.muscle = f.m.split(' ').map(k => { if (!MUSCLE[k]) throw new Error(`${name}: muscle ${k}`); return MUSCLE[k]; });
  if (f.c) o.contra = f.c.split(' ').map(k => { if (!CONTRA.includes(k)) throw new Error(`${name}: contra ${k}`); return k; });
  if (f.mp) { if (!PATTERN[f.mp]) throw new Error(`${name}: pattern ${f.mp}`); o.movePattern = PATTERN[f.mp]; }
  if (type && !TYPE[type]) throw new Error(`${name}: type ${type}`);
  rows.push(o);
}

/* ── Upper Body Push ─────────────────────────────────────────────── */
X('1Arm DB Chest Press', 'PUSH', { m: 'chest tri sh core', c: 'shoulder' });
X('Banded Plyometric Push Up', 'PUSH', { m: 'chest tri sh', c: 'shoulder wrist' });
X('Barbell Bench Press', 'PUSH', { eq: 'Barbell', m: 'chest tri sh', c: 'shoulder' });
X('DB Alternating Chest Press', 'PUSH', { eq: 'Dumbbell', m: 'chest tri sh', c: 'shoulder' });
X('DB Chest Press', 'PUSH', { eq: 'Dumbbell', c: 'shoulder' });
X('Feet Elevated Push Up', 'PUSH', { eq: 'Bodyweight', m: 'chest tri sh core', c: 'shoulder wrist' });
X('Half Kneeling 1Arm Shoulder Press', 'PUSH', { eq: 'Dumbbell', m: 'sh tri core', c: 'shoulder' });
X('Half Kneeling 2Arm DB Shoulder Press', 'PUSH', { c: 'shoulder' });
X('Military Press', 'PUSH', { eq: 'Barbell', c: 'shoulder back' });
X('Neutral-Grip Dumbbell Floor Press', 'PUSH', { c: 'shoulder' });
X('Supine Med Ball Chest Pass', 'PUSH', { eq: 'Medicine Ball', c: 'shoulder wrist' });
X('Hands Elevated Push-Ups', 'PUSH', { s: 'Horizontal', eq: 'Bodyweight', d: 1, m: 'chest tri sh', c: 'shoulder wrist' });
X('Push Up', 'PUSH', { s: 'Horizontal', eq: 'Bodyweight', d: 1, m: 'chest tri sh core', c: 'shoulder wrist' });
X('Tempo Push-Up (3-1-1)', 'PUSH', { s: 'Horizontal', eq: 'Bodyweight', d: 2, m: 'chest tri sh core', c: 'shoulder wrist' });
X('Swiss Ball DB Chest Press', 'PUSH', { s: 'Horizontal', eq: 'Dumbbell, Stability Ball', d: 2, m: 'chest tri core', c: 'shoulder' });
X('Split Stance 1Arm Cable Press', 'PUSH', { s: 'Horizontal', eq: 'Cable', d: 1, m: 'chest tri sh core', c: 'shoulder' });
X('Landmine Shoulder Press', 'PUSH', { s: 'Vertical', eq: 'Landmine', d: 1, m: 'sh tri chest', c: 'shoulder' });
X('Standing 1Arm Press', 'PUSH', { s: 'Vertical', eq: 'Dumbbell', d: 1, m: 'sh tri core', c: 'shoulder' });
X('Standing 2Arm DB Shoulder Press', 'PUSH', { s: 'Vertical', eq: 'Dumbbell', d: 1, m: 'sh tri', c: 'shoulder back' });
X('Standing DB Alternating Shoulder Press', 'PUSH', { s: 'Vertical', eq: 'Dumbbell', d: 2, m: 'sh tri core', c: 'shoulder' });
X('Tall Kneeling 2Arm DB Shoulder Press', 'PUSH', { s: 'Vertical', eq: 'Dumbbell', d: 1, m: 'sh tri core', c: 'shoulder' });

/* ── Upper Body Pull ─────────────────────────────────────────────── */
X('1Arm DB Row', 'PULL', { c: 'shoulder' });
X('Band Assisted Chin Up', 'PULL', { c: 'shoulder' });
X('Band Assisted Pull Up', 'PULL', { eq: 'Band', m: 'lats bi ub', c: 'shoulder' });
X('Band Assisted Pull Up ISO Hold', 'PULL', { eq: 'Band', m: 'lats bi ub', c: 'shoulder' });
X('Banded Reverse Fly', 'PULL', { eq: 'Band', c: 'shoulder' });
X('Bench Supported 1Arm DB Row', 'PULL', { eq: 'Dumbbell', m: 'lats ub bi', c: 'shoulder' });
X('Bird Dog Cable/Banded Row', 'PULL', { eq: 'Cable, Band', m: 'lats core', c: 'shoulder wrist' });
X('Cable 1Arm Row (High to Low)', 'PULL', { eq: 'Cable', m: 'lats bi', c: 'shoulder' });
X('Chest-Supported 2DB Row', 'PULL', { c: 'shoulder' });
X('Close Grip Lat Pull Down', 'PULL', { eq: 'Cable', m: 'lats bi', c: 'shoulder' });
X('Half Kneeling 1Arm Cable Row', 'PULL', { eq: 'Cable', d: 1, c: 'shoulder' });
X('Half Kneeling 1Arm Cable Row (High to Low)', 'PULL', { eq: 'Cable', c: 'shoulder' });
X('Half Kneeling 1Arm Cable/Banded Row', 'PULL', { c: 'shoulder' });
X('Half Kneeling Cable Face Pull', 'PULL', { eq: 'Cable', c: 'shoulder' });
X('Prone IYT Raises', 'PULL', { eq: 'Bodyweight', d: 1 });
X('Single Arm DB Row (Bench Supported)', 'PULL', { c: 'shoulder' });
X('Split Stance 1Arm Cable Row', 'PULL', { eq: 'Cable', c: 'shoulder' });
X('Standing 1Arm Banded Row', 'PULL', { eq: 'Band', m: 'lats ub bi', c: 'shoulder' });
X('TRX Row', 'PULL', { c: 'shoulder' });
X('1Arm Inverted Row', 'PULL', { s: 'Horizontal', eq: 'Bodyweight', d: 3, m: 'lats ub bi core', c: 'shoulder' });
X('2Arm Banded Explosive Rotational Row', 'PULL', { s: 'Horizontal', eq: 'Band', d: 2, m: 'ub lats core', c: 'shoulder trunk' });
X('Cable Face Pull', 'PULL', { s: 'Horizontal', eq: 'Cable', d: 1, m: 'ub sh', c: 'shoulder' });
X('Dead Hang', 'PULL', { s: 'Vertical', eq: 'Bodyweight', d: 1, m: 'lats fa', c: 'shoulder' });
X('Feet Elevated Inverted Row', 'PULL', { s: 'Horizontal', eq: 'Bodyweight, Box', d: 2, m: 'lats ub bi', c: 'shoulder' });
X('Inverted Row', 'PULL', { s: 'Horizontal', eq: 'Bodyweight', d: 1, m: 'lats ub bi', c: 'shoulder' });
X('Landmine Row', 'PULL', { s: 'Horizontal', eq: 'Landmine', d: 1, m: 'lats ub bi', c: 'back' });
X('Standing 1Arm Cable Row', 'PULL', { s: 'Horizontal', eq: 'Cable', d: 1, m: 'lats ub bi', c: 'shoulder' });

/* ── Hip Dominant ────────────────────────────────────────────────── */
X('1Leg Elevated ISO Glute Bridge', 'HIP', { c: 'hamstring', mp: 'HI' });
X('45 Degree Back Extension', 'HIP', { s: 'Concentric', m: 'ham glu', c: 'back hamstring' });
X('B-Stance 2DB RDL', 'HIP', { eq: 'Dumbbell', c: 'back hamstring', mp: 'HI' });
X('Barbell Hip Thrust', 'HIP', { s: 'Concentric', eq: 'Barbell', c: 'hip' });
X('DB Hip Thrust', 'HIP', { c: 'hip' });
X('Feet Elevated Glute Bridge', 'HIP', { c: 'hamstring' });
X('Glute Bridge with Alternating Leg Lifts', 'HIP', { c: 'hamstring', mp: 'HI' });
X('Glute Bridge with Ball Squeeze', 'HIP', { c: 'hip' });
X('Kettlebell RDL', 'HIP', { eq: 'Kettlebell', c: 'back hamstring' });
X('Long-Lever Single Leg Bridge Iso Hold', 'HIP', { c: 'hamstring', mp: 'HI' });
X('Machine RDL', 'HIP', { eq: 'Machine', c: 'back hamstring' });
X('Single Arm Single Leg DB RDL', 'HIP', { c: 'back hamstring ankle', mp: 'HI' });
X('Single Leg DB Hip Thrust', 'HIP', { c: 'hip', mp: 'HI' });
X('Single Leg Elevated Glute Bridge', 'HIP', { c: 'hamstring', mp: 'HI' });
X('Single Leg Glute Bridge', 'HIP', { c: 'hamstring', mp: 'HI' });
X('Standing Banded Hip Adduction', 'HIP', { eq: 'Band', m: 'add', c: 'hip' });
X('Supine Banded Hip Flexor March', 'HIP', { c: 'hip', mp: 'CB' });
X('Trap Bar Deadlift', 'HIP', { c: 'back hamstring' });
X('1Leg 2Arm DB RDL', 'HIP', { a: 'Pull', p: 'Unilateral', eq: 'Dumbbell', d: 2, m: 'ham glu', c: 'back hamstring', mp: 'HI' });
X('1Leg 2DB RDL', 'HIP', { a: 'Pull', p: 'Unilateral', eq: 'Dumbbell', d: 2, m: 'ham glu', c: 'back hamstring', mp: 'HI' });
X('Single Leg 2Arm DB RDL', 'HIP', { a: 'Pull', p: 'Unilateral', eq: 'Dumbbell', d: 2, m: 'ham glu', c: 'back hamstring', mp: 'HI' });
X('1leg RDL with Stick', 'HIP', { a: 'Pull', p: 'Unilateral', eq: 'Bodyweight', d: 1, m: 'ham glu', mp: 'HI' });
X('RDL with Stick', 'HIP', { a: 'Pull', p: 'Bilateral', eq: 'Bodyweight', d: 1, m: 'ham glu' });
X('Back Extension Machine', 'HIP', { s: 'Concentric', a: 'Pull', p: 'Bilateral', eq: 'Machine', d: 1, m: 'ham glu', c: 'back' });
X('Barbell RDL', 'HIP', { a: 'Pull', p: 'Bilateral', eq: 'Barbell', d: 2, m: 'ham glu', c: 'back hamstring' });
X('DB RDL', 'HIP', { a: 'Pull', p: 'Bilateral', eq: 'Dumbbell', d: 1, m: 'ham glu', c: 'back hamstring' });
X('Kettlebell Swing', 'HIP', { s: 'Concentric', a: 'Pull', p: 'Bilateral', eq: 'Kettlebell', d: 2, m: 'glu ham core', c: 'back' });

/* ── Knee Dominant ───────────────────────────────────────────────── */
// A lunge or a step-up is single-leg work; filed under Knee Dominant without an explicit
// movement_pattern it would read as "Squat".
X('1DB Lateral Lunge with Knee Drive', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee hip', mp: 'LU' });
X('1Leg Wall Sit', 'KNEE', { eq: 'Bodyweight', m: 'quad glu', c: 'knee' });
X('2 DB Split Squat', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee' });
X('2DB Box Step Up with Knee Drive', 'KNEE', { s: 'Concentric', eq: 'Dumbbell, Box', c: 'knee', mp: 'LU' });
X('2DB Bulgarian Split Squat', 'KNEE', { m: 'quad glu', c: 'knee' });
X('2DB Front Squat', 'KNEE', { c: 'knee back' });
X('2DB ISO Split Squat', 'KNEE', { a: 'Push', eq: 'Dumbbell', c: 'knee' });
X('2DB Reverse Lunge', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', m: 'quad glu', c: 'knee', mp: 'LU' });
X('2DB Step Up', 'KNEE', { c: 'knee', mp: 'LU' });
X('Barbell Alternating Forward Lunges', 'KNEE', { s: 'Concentric', eq: 'Barbell', c: 'knee back', mp: 'LU' });
X('Barbell Alternating Reverse Lunge', 'KNEE', { s: 'Concentric', eq: 'Barbell', c: 'knee back', mp: 'LU' });
X('Barbell Back Squat', 'KNEE', { s: 'Concentric', eq: 'Barbell', c: 'knee back' });
X('Barbell Front Squat', 'KNEE', { s: 'Concentric', eq: 'Barbell', c: 'knee back wrist' });
X('Barbell Split Squat ISO Hold', 'KNEE', { a: 'Push', eq: 'Barbell', c: 'knee' });
X('DB Alternating Forward Lunge', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee', mp: 'LU' });
X('DB Alternating Reverse Lunge', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee', mp: 'LU' });
X('DB Goblet Reverse Lunge', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee', mp: 'LU' });
X('DB Goblet Split Squat', 'KNEE', { c: 'knee' });
X('DB Goblet Squat', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee' });
X('DB Reverse Lunge', 'KNEE', { m: 'quad glu', c: 'knee', mp: 'LU' });
X('DB Reverse Lunge to Knee Drive', 'KNEE', { s: 'Concentric', eq: 'Dumbbell', c: 'knee', mp: 'LU' });
X('DB RNT Split Squat ISO Hold', 'KNEE', { a: 'Push', eq: 'Dumbbell, Band', m: 'quad glu', c: 'knee' });
X('Forward Lunge with Ball Rotation', 'KNEE', { s: 'Concentric', eq: 'Medicine Ball', c: 'knee', mp: 'LU' });
X('Front Foot Elevated DB Split Squat ISO Hold', 'KNEE', { a: 'Push', eq: 'Dumbbell', m: 'quad glu', c: 'knee' });
X('Glider Lateral Lunge', 'KNEE', { s: 'Concentric', eq: 'Bodyweight', c: 'knee hip', mp: 'LU' });
X('Goblet Squat', 'KNEE', { s: 'Concentric', eq: 'Dumbbell, Kettlebell', c: 'knee' });
X('Hack Squat Calf Raise', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Bilateral', eq: 'Machine', d: 1, m: 'quad glu calf', c: 'knee ankle' });
X('Nordic Hamstring Curl', 'KNEE', { a: 'Pull', eq: 'Bodyweight', c: 'hamstring knee', mp: 'HI' });
X('Shrimp Squat', 'KNEE', { s: 'Concentric', eq: 'Bodyweight', m: 'quad glu', c: 'knee' });
X('Single Leg Box Squat', 'KNEE', { s: 'Concentric', eq: 'Box', c: 'knee' });
X('Sumo Squat ISO Hold', 'KNEE', { a: 'Push', c: 'knee hip' });
X('Trap Bar Squat', 'KNEE', { s: 'Concentric', eq: 'Trap Bar', c: 'knee back' });
X('TRX Single Leg Squat', 'KNEE', { s: 'Concentric', eq: 'TRX', c: 'knee' });
X('1Arm DB Side Lunge', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Lunges', eq: 'Dumbbell', d: 2, m: 'quad glu add', c: 'knee hip', mp: 'LU' });
X('1Leg Box Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Unilateral', eq: 'Box', d: 2, m: 'quad glu', c: 'knee' });
X('1Leg Box Squat (kollar göğüste, tutuş yok)', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Unilateral', eq: 'Box', d: 3, m: 'quad glu', c: 'knee' });
X('2DB Split Squat ISO Hold', 'KNEE', { s: 'Isometric', a: 'Push', p: 'Unilateral', eq: 'Dumbbell', d: 1, m: 'quad glu', c: 'knee' });
X('DB Split Squat ISO Hold', 'KNEE', { s: 'Isometric', a: 'Push', p: 'Unilateral', eq: 'Dumbbell', d: 1, m: 'quad glu', c: 'knee' });
X('Barbell Front Squat (Crossover Grip)', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Bilateral', eq: 'Barbell', d: 3, m: 'quad glu core', c: 'knee back' });
X('Box Step Down', 'KNEE', { s: 'Eccentric', a: 'Push', p: 'Step-Up', eq: 'Box', d: 1, m: 'quad glu', c: 'knee', mp: 'LU' });
X('Counterbalance Skater Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Unilateral', eq: 'Dumbbell', d: 2, m: 'quad glu', c: 'knee' });
X('Counterbalance Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Bilateral', eq: 'Dumbbell', d: 1, m: 'quad glu', c: 'knee' });
X('DB Goblet Lateral Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Lunges', eq: 'Dumbbell', d: 2, m: 'quad glu add', c: 'knee hip', mp: 'LU' });
X('Goblet Lateral Box Step Up', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Step-Up', eq: 'Dumbbell, Box', d: 2, m: 'quad glu', c: 'knee', mp: 'LU' });
X('Hand Supported Step Up', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Step-Up', eq: 'Box', d: 1, m: 'quad glu', c: 'knee', mp: 'LU' });
X('Lateral Split Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Lunges', eq: 'Bodyweight', d: 1, m: 'quad glu add', c: 'knee hip', mp: 'LU' });
X('Mini Band Goblet Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Bilateral', eq: 'Dumbbell, Band', d: 1, m: 'quad glu abd', c: 'knee' });
X('Slider Goblet Lateral Lunge', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Lunges', eq: 'Dumbbell', d: 2, m: 'quad glu add', c: 'knee hip', mp: 'LU' });
X('Slider Reverse Lunge', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Lunges', eq: 'Bodyweight', d: 2, m: 'quad glu', c: 'knee', mp: 'LU' });
// Used in patellar-tendon work; no knee contraindication on purpose.
X('Spanish Squat Isometric', 'KNEE', { s: 'Isometric', a: 'Push', p: 'Bilateral', eq: 'Band', d: 1, m: 'quad' });
X('Wall Sit ISO Hold', 'KNEE', { s: 'Isometric', a: 'Push', p: 'Bilateral', eq: 'Bodyweight', d: 1, m: 'quad glu', c: 'knee' });
X('Zombie Squat', 'KNEE', { s: 'Concentric', a: 'Push', p: 'Bilateral', eq: 'Barbell', d: 2, m: 'quad core', c: 'knee' });

/* ── Core ────────────────────────────────────────────────────────── */
X('Ab Wheel', 'CORE', { pos: 'Tall-Kneeling', c: 'back shoulder' });
X('Adductor Side Plank', 'CORE', { c: 'hip shoulder' });
X('Alternating Superman', 'CORE', { pos: 'Prone', c: 'back' });
X('Body Saw Plank', 'CORE', { pos: 'Prone', m: 'core sh', c: 'back shoulder' });
X('Body Saw Plank w/ Glider', 'CORE', { pos: 'Prone', m: 'core sh', c: 'back shoulder' });
X('Cable Jab Step', 'CORE', { pos: 'Standing', c: 'trunk', mp: 'RO' });
X('Cable/Banded Dead Bug', 'CORE', { pos: 'Supine', m: 'core' });
X('Dead Bug Pallof Press', 'CORE', { pos: 'Supine', m: 'core' });
X('Dynamic Copenhagen Plank', 'CORE', { c: 'hip' });
X('Half Kneeling Cable Pallof Press', 'CORE', { pos: 'Half-Kneeling' });
X('High Plank Bird Dog', 'CORE', { pos: 'Prone', m: 'core sh glu', c: 'shoulder wrist' });
X('Plank', 'CORE', { pos: 'Prone', c: 'back' });
X('Russian Twist', 'CORE', { pos: 'Seated', c: 'back' });
X('Side Plank', 'CORE', { m: 'core abd', c: 'shoulder' });
X('Side Plank w/ Leg Raises', 'CORE', { c: 'shoulder hip' });
X('Stability Ball Dead Bug', 'CORE', { pos: 'Supine' });
X('Stability Ball Plank', 'CORE', { pos: 'Prone', c: 'shoulder' });
X('Standing Cable Pallof Press with Rope', 'CORE', { pos: 'Standing', m: 'core' });
X('Standing Pallof Press ISO Hold', 'CORE', { pos: 'Standing' });
X('Tall Kneeling Cable/Banded Pallof Press', 'CORE', { pos: 'Tall-Kneeling', m: 'core' });
X('Tall-Kneeling Cable Anti-Rotation Hold', 'CORE', { m: 'core' });
X('1Arm Overhead DB March', 'CORE', { s: 'Anti-Lateral Flexion', pos: 'Standing', d: 2, m: 'core sh hf', c: 'shoulder', mp: 'CA' });
X('Unilateral Kettlebell March', 'CORE', { s: 'Anti-Lateral Flexion', pos: 'Standing', d: 1, m: 'core hf', mp: 'CA' });
X('Bear Plank Shoulder Taps', 'CORE', { s: 'Anti-Rotation', pos: 'Quadruped', d: 1, m: 'core sh', c: 'wrist shoulder' });
X('Bent Knee Dynamic Copenhagen Plank', 'CORE', { s: 'Anti-Lateral Flexion', d: 1, m: 'add core', c: 'hip' });
X('Copenhagen Plank', 'CORE', { s: 'Anti-Lateral Flexion', d: 2, m: 'add core', c: 'hip' });
X('Bird Dog', 'CORE', { s: 'Anti-Rotation', pos: 'Quadruped', d: 1, m: 'core glu' });
X('Bird Dog Plank Row', 'CORE', { s: 'Anti-Rotation', pos: 'Prone', d: 2, m: 'core lats', c: 'shoulder wrist' });
X('Cable Overhead Pallof Press', 'CORE', { s: 'Anti-Rotation', pos: 'Standing', d: 2, m: 'core sh', c: 'shoulder' });
X('Contralateral Superman', 'CORE', { s: 'Extension', pos: 'Prone', d: 1, m: 'core glu ub', c: 'back' });
X('Dead Bug', 'CORE', { s: 'Anti-Extension', pos: 'Supine', d: 1, m: 'core' });
X('ISO Dead Bug', 'CORE', { s: 'Anti-Extension', pos: 'Supine', d: 1, m: 'core' });
X('Half Kneeling Banded Pallof Press', 'CORE', { s: 'Anti-Rotation', pos: 'Half-Kneeling', d: 1, m: 'core' });
X('Half Kneeling Banded/Cable Pallof Press ISO', 'CORE', { s: 'Anti-Rotation', pos: 'Half-Kneeling', d: 1, m: 'core' });
X('Half Kneeling Cable Chop (High to Low)', 'CORE', { s: 'Rotation', pos: 'Half-Kneeling', d: 2, m: 'core sh', c: 'trunk back', mp: 'RO' });
X('Half Kneeling Cable Lateral Flexion', 'CORE', { s: 'Lateral Flexion', pos: 'Half-Kneeling', d: 1, m: 'core', c: 'back' });
X('Half Kneeling Cable Rotations', 'CORE', { s: 'Rotation', pos: 'Half-Kneeling', d: 1, m: 'core', c: 'trunk', mp: 'RO' });
X('Hollow Body Hold', 'CORE', { s: 'Anti-Extension', pos: 'Supine', d: 2, m: 'core hf', c: 'back' });
X('Lying Leg Raises', 'CORE', { s: 'Flexion', pos: 'Supine', d: 1, m: 'core hf', c: 'back' });
X('Plank Knee-to-Elbow', 'CORE', { s: 'Anti-Extension', pos: 'Prone', d: 2, m: 'core hf', c: 'shoulder wrist' });
X('Side Plank with Banded/Cable Row', 'CORE', { s: 'Anti-Lateral Flexion', d: 2, m: 'core lats', c: 'shoulder' });
X('Single Leg Bench Crunch', 'CORE', { s: 'Flexion', pos: 'Supine', d: 1, m: 'core hf', c: 'back' });
X('Swiss Ball Leg Raises', 'CORE', { s: 'Flexion', pos: 'Supine', d: 1, m: 'core hf', c: 'back' });
X('Swiss Ball Rollout', 'CORE', { s: 'Anti-Extension', pos: 'Tall-Kneeling', d: 2, m: 'core sh', c: 'back shoulder' });
X('Tall Kneeling Landmine Rotation', 'CORE', { s: 'Rotation', pos: 'Tall-Kneeling', d: 2, m: 'core sh', c: 'trunk back', mp: 'RO' });
X('The V-Up', 'CORE', { s: 'Flexion', pos: 'Supine', d: 2, m: 'core hf', c: 'back' });

/* ── Full Body ───────────────────────────────────────────────────── */
// Full Body reads as "Squat" unless the entry says otherwise.
X('1Leg RDL with 1Arm Cable Row', 'FB', { s: 'Strength', d: 2, m: 'ham glu lats', c: 'back hamstring', mp: 'HI' });
X('Barbell High Pull', 'FB', { c: 'back shoulder wrist', mp: 'HI' });
X('Split Squat with 1Arm Shoulder Press', 'FB', { c: 'knee shoulder', mp: 'LU' });
X('1Arm Dumbbell Split Jerk', 'FB', { s: 'Olympic Lift', d: 3, m: 'sh tri quad glu', c: 'shoulder knee wrist', mp: 'PU' });

/* ── Multi Directional Speed ─────────────────────────────────────── */
X('Ball Drop Acceleration', 'MDS', { c: 'hamstring ankle' });
X('Band Resisted Shuffle', 'MDS', { c: 'ankle knee hip' });
X('Band Resisted Sprint', 'MDS', { c: 'hamstring' });
X('Double Hip Switch', 'MDS', { c: 'hip' });
X('Fun Based Agility - 1', 'MDS', { c: 'ankle knee' });
X('Hip Switch', 'MDS', { c: 'hip' });
X('Lateral Shuffle Cone Stack Game', 'MDS', { c: 'ankle' });
X('Lateral Skips on Hurdles', 'MDS', { c: 'ankle' });
X('Push-Up Start Chase Sprint', 'MDS', { c: 'hamstring ankle' });
X('Quickness Drills - 1', 'MDS', { c: 'ankle' });
X('Reactive Lateral Agility', 'MDS', { c: 'ankle knee' });
X('Sprint to Deceleration', 'MDS', { c: 'knee hamstring ankle' });
X('Wall Switches', 'MDS', { c: 'hamstring hip' });
X('A Skips with Ball', 'MDS', { s: 'Sprint Technique', d: 1, m: 'hf calf', c: 'ankle', mp: 'SP' });
X('Lateral A Skips', 'MDS', { s: 'Sprint Technique', d: 1, m: 'hf calf', c: 'ankle' });
X('Banded Deceleration', 'MDS', { s: 'Deceleration', d: 2, m: 'quad glu ham', c: 'knee ankle hamstring' });
X('Banded Hip Switches', 'MDS', { s: 'Sprint Technique', d: 1, m: 'hf', c: 'hip' });
X('Butt Kicks', 'MDS', { s: 'Sprint Technique', d: 1, m: 'ham', c: 'hamstring' });
X('Cone Circle Drill', 'MDS', { s: 'Non-Reactive Agility', d: 1, c: 'ankle knee' });
X('Free Sprint', 'MDS', { s: 'Acceleration', d: 1, m: 'ham glu calf', c: 'hamstring ankle' });
X('Lateral Hops + Sprint + Slide', 'MDS', { s: 'COD', d: 2, c: 'ankle knee' });
X('Lateral Hurdle Shuffle', 'MDS', { s: 'Non-Reactive Agility', d: 1, c: 'ankle' });
X('Partner Mirror Chaos Drill', 'MDS', { s: 'Reactive Agility', d: 2, c: 'ankle knee' });
X('Pivot Move with Med Ball', 'MDS', { s: 'COD', d: 1, c: 'ankle knee' });
X('Scissors to Run', 'MDS', { s: 'Acceleration', d: 1, c: 'hamstring ankle' });
X('Sprint-Lateral Hurdle Shuffle-Back Pedal', 'MDS', { s: 'COD', d: 2, c: 'ankle hamstring knee' });
X('Tempo', 'MDS', { d: 1, m: 'cardio', c: 'hamstring' });
X('Wicked Runs', 'MDS', { s: 'Sprint Technique', d: 1, m: 'hf ham', c: 'hamstring' });
X('Wicket Runs', 'MDS', { s: 'Sprint Technique', d: 1, m: 'hf ham', c: 'hamstring' });

/* ── Plyometric ──────────────────────────────────────────────────── */
const plyo = 'knee ankle';
X('Banded Linear & Lateral Hops', 'PLY', { eq: 'Resistance Band', m: 'calf quad', c: plyo });
X('Box Drop Landing (2 Leg)', 'PLY', { m: 'quad glu', c: plyo });
X('Box Drop to Triple Broad Jump', 'PLY', { m: 'quad glu calf', c: plyo });
X('Box Jump', 'PLY', { s: 'Vertical', k: 'Jump', t: 'Bilateral', eq: 'Box', d: 1, m: 'quad glu calf', c: plyo });
X('Box Jump with Step Off Landing', 'PLY', { m: 'quad glu calf', c: plyo });
X('Countermovement Jump to Stick', 'PLY', { m: 'quad glu calf', c: plyo });
X('Hurdle Pogo Jumps', 'PLY', { m: 'calf', c: 'ankle' });
X('Lateral Box Jump', 'PLY', { m: 'quad glu calf', c: plyo });
X('Lateral Drop to 1Leg Vertical Jump', 'PLY', { eq: 'No Equipment', m: 'quad glu calf', c: plyo });
X('Lateral Hurdle Pogo Jumps', 'PLY', { m: 'calf', c: 'ankle' });
X('Med Ball Slam with Broad Jump', 'PLY', { m: 'quad glu core', c: plyo });
X('Non-Continuous Broad Jump', 'PLY', { eq: 'No Equipment', m: 'quad glu calf', c: plyo });
X('Partner-Directed Single Leg Hops', 'PLY', { s: 'Multi-Directional', m: 'calf quad', c: plyo });
X('Pogo Jumps', 'PLY', { m: 'calf', c: 'ankle' });
X('Repeated Box Jump', 'PLY', { m: 'quad glu calf', c: plyo });
X('Single Leg Box Jumps', 'PLY', { m: 'quad glu calf', c: plyo });
X('Single Leg Hurdle Hop Continuous', 'PLY', { m: 'calf quad', c: plyo });
X('Single Leg Hurdle Hop Stick', 'PLY', { m: 'calf quad', c: plyo });
X('Single Leg Hurdle Hop to Lateral Bound', 'PLY', { m: 'calf quad glu', c: plyo });
X('Single Leg Hurdle Lateral Hops', 'PLY', { m: 'calf quad', c: plyo });
X('Single Leg Lateral Pogo Hops', 'PLY', { m: 'calf', c: 'ankle' });
X('Single Leg Medial/Lateral High Hurdle Hop with Stick', 'PLY', { m: 'calf quad', c: plyo });
X('Single Leg Pogo Jumps', 'PLY', { m: 'calf', c: 'ankle' });
X('Squat Jump to Stick', 'PLY', { m: 'quad glu calf', c: plyo });
X('Triple Lateral Hurdle Jump to Box Jump', 'PLY', { m: 'quad glu calf', c: plyo });
X('1Leg Jumping Rope (3-3)', 'PLY', { s: 'Vertical', k: 'Hop', t: 'Unilateral', eq: 'Jump Rope', d: 1, m: 'calf', c: 'ankle' });
X('1Leg Landing', 'PLY', { s: 'Vertical', k: 'Landing', t: 'Unilateral', eq: 'No Equipment', d: 1, m: 'quad glu', c: plyo });
X('1Leg lateral Plate Hops', 'PLY', { s: 'Lateral', k: 'Hop', t: 'Unilateral', d: 2, m: 'calf quad', c: plyo });
X('Broad Jump Stick', 'PLY', { s: 'Horizontal', k: 'Jump', t: 'Bilateral', eq: 'No Equipment', d: 1, m: 'quad glu calf', c: plyo });
X('DB Squat Jump', 'PLY', { s: 'Vertical', k: 'Jump', t: 'Bilateral', eq: 'Dumbbell', d: 2, m: 'quad glu calf', c: plyo });
X('Depth Drop to Triple Hurdle Hop to Box Jump', 'PLY', { s: 'Multi-Directional', k: 'Drop Jump', t: 'Bilateral', eq: 'Box, Mini Hurdle', d: 3, m: 'quad glu calf', c: plyo });
X('Drop to Box Jump', 'PLY', { s: 'Vertical', k: 'Drop Jump', t: 'Bilateral', eq: 'Box', d: 2, m: 'quad glu calf', c: plyo });
X('Hurdle Bounds', 'PLY', { s: 'Horizontal', k: 'Bound', t: 'Unilateral', eq: 'Hurdle', d: 3, m: 'quad glu calf', c: plyo });
X('Hurdle Jump with Stick', 'PLY', { s: 'Vertical', k: 'Jump', t: 'Bilateral', eq: 'Hurdle', d: 1, m: 'quad glu calf', c: plyo });
X('Jumping Rope', 'PLY', { s: 'Vertical', k: 'Hop', t: 'Bilateral', eq: 'Jump Rope', d: 1, m: 'calf', c: 'ankle' });
X('Lateral Hurdle Jumps with Med Ball', 'PLY', { s: 'Lateral', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle, Medicine Ball', d: 2, m: 'quad glu calf', c: plyo });
X('Lateral Pogo Hurdle Jumps (2F-1B)', 'PLY', { s: 'Lateral', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle', d: 1, m: 'calf', c: 'ankle' });
X('Linear Hurdle Jumps with Med Ball', 'PLY', { s: 'Horizontal', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle, Medicine Ball', d: 2, m: 'quad glu calf', c: plyo });
X('Linear Pogo Hurdle Jumps (2F-1B)', 'PLY', { s: 'Horizontal', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle', d: 1, m: 'calf', c: 'ankle' });
X('Med Ball Vertical Jump', 'PLY', { s: 'Vertical', k: 'Jump', t: 'Bilateral', eq: 'Medicine Ball', d: 1, m: 'quad glu calf', c: plyo });
X('Repeated Hurdle Lateral Jumps', 'PLY', { s: 'Lateral', k: 'Jump', t: 'Bilateral', eq: 'Hurdle', d: 2, m: 'quad glu calf', c: plyo });
X('Skater Jumps', 'PLY', { s: 'Lateral', k: 'Bound', t: 'Unilateral', eq: 'No Equipment', d: 2, m: 'quad glu add', c: plyo });
X('Straight Leg Bound', 'PLY', { s: 'Horizontal', k: 'Bound', t: 'Unilateral', eq: 'No Equipment', d: 2, m: 'ham glu calf', c: 'hamstring ankle' });
X('Triple Broad Jump', 'PLY', { s: 'Horizontal', k: 'Jump', t: 'Bilateral', eq: 'No Equipment', d: 2, m: 'quad glu calf', c: plyo });
X('Triple Hurdle Jump to Sprint', 'PLY', { s: 'Horizontal', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle', d: 2, m: 'quad glu calf', c: 'knee ankle hamstring' });
X('Triple Lateral Hurdle Jump to Slide', 'PLY', { s: 'Lateral', k: 'Jump', t: 'Bilateral', eq: 'Mini Hurdle', d: 2, m: 'quad glu calf', c: plyo });
X('Weighted Vertical Jump with Stick', 'PLY', { s: 'Vertical', k: 'Jump', t: 'Bilateral', eq: 'Dumbbell', d: 2, m: 'quad glu calf', c: plyo });

/* ── Medicine Ball ───────────────────────────────────────────────── */
// Medicine Ball reads as "Rotation" unless the entry says otherwise; a chest pass is a push.
X('Half Kneeling Med Ball Rainbow Slam', 'MB', { k: 'Slam', m: 'core sh', c: 'shoulder back' });
X('Med Ball Back Throw', 'MB', { k: 'Throw', m: 'glu ham core sh', c: 'back', mp: 'HI' });
X('Med Ball Chest Pass', 'MB', { k: 'Pass', c: 'shoulder wrist', mp: 'PU' });
X('Med Ball Chest Throw w/ Broad Jump', 'MB', { k: 'Throw', c: 'knee shoulder', mp: 'JP' });
X('Med Ball Overhead Throw', 'MB', { k: 'Throw', c: 'shoulder', mp: 'PU' });
X('Med Ball Tall Kneeling Chest Pass with Hip Hinge', 'MB', { k: 'Pass', d: 1, m: 'chest tri glu', c: 'shoulder', mp: 'PU' });
X('Med Ball Chest Throw w/ Jump', 'MB', { s: 'Vertical', k: 'Throw', d: 2, m: 'chest sh quad', c: 'shoulder knee', mp: 'JP' });
X('Med Ball Pivot Slam', 'MB', { s: 'Rotational', k: 'Slam', d: 2, m: 'core sh', c: 'shoulder back' });
X('Med Ball Rotational Chest Pass', 'MB', { s: 'Rotational', k: 'Pass', d: 1, m: 'core chest', c: 'trunk shoulder' });
X('MedBall Rotational Chest Pass', 'MB', { s: 'Rotational', k: 'Pass', d: 1, m: 'core chest', c: 'trunk shoulder' });
X('Med Ball Rotational Slam', 'MB', { s: 'Rotational', k: 'Slam', d: 2, m: 'core sh', c: 'back shoulder' });
X('Med Ball Scoop Toss', 'MB', { s: 'Rotational', k: 'Throw', d: 1, m: 'core glu', c: 'back' });
X('Med Ball Slam', 'MB', { s: 'Vertical', k: 'Slam', d: 1, m: 'core sh lats', c: 'shoulder back', mp: 'CB' });
X('Med Ball Slam to Broad Jump', 'MB', { s: 'Horizontal', k: 'Slam', d: 2, m: 'core quad glu', c: 'knee shoulder', mp: 'JP' });
X('MedBall Chest Pass with Hip Hinge', 'MB', { s: 'Horizontal', k: 'Pass', d: 1, m: 'chest tri glu', c: 'shoulder', mp: 'PU' });
X('MedBall Overhead Throw', 'MB', { s: 'Horizontal', k: 'Throw', d: 1, m: 'core sh', c: 'shoulder', mp: 'PU' });
X('Step Behind Rotational Med Ball Throw', 'MB', { s: 'Rotational', k: 'Throw', d: 2, m: 'core glu sh', c: 'trunk back' });
X('Tall Kneeling Med Ball Overhead Throw', 'MB', { s: 'Horizontal', k: 'Throw', d: 1, m: 'core sh', c: 'shoulder', mp: 'PU' });
X('Tall Kneeling Med Ball Slam', 'MB', { s: 'Vertical', k: 'Slam', d: 1, m: 'core sh', c: 'shoulder', mp: 'CB' });

/* ── Mobility ────────────────────────────────────────────────────── */
X('90/90 Heel Clicks', 'MOB', { m: 'glu hf' });
X('90/90 Hip Stretch', 'MOB', {});
X('Ankle Dorsiflexion Mobilization', 'MOB', { m: 'calf' });
X('Banded Ankle Mobility', 'MOB', { m: 'calf' });
X('Banded/Cable Thoracic Rotation', 'MOB', { m: 'ub' });
X('Pigeon Stretch', 'MOB', { m: 'glu hf' });
X('Prone Floor Cobra w/ External Rotation', 'MOB', { m: 'ub core' });
X('PVC ER Stretch', 'MOB', { d: 1, m: 'sh' });
X('Quadruped Thoracic Rotation', 'MOB', { m: 'ub' });
X('90/90 Banded Hip Stretch with Thoracic Rotation', 'MOB', { s: 'Hip', pos: 'Seated', d: 1, m: 'glu hf' });
X('90/90 Lift Off ISO Hold', 'MOB', { s: 'Hip', pos: 'Seated', d: 2, m: 'hf glu' });
X('Banded Adductor Rock Back', 'MOB', { s: 'Hip', pos: 'Quadruped', d: 1, m: 'add' });
X('Half Kneeling Groin Stretch', 'MOB', { s: 'Hip', pos: 'Half-Kneeling', d: 1, m: 'add' });
X('Half Kneeling Hip Flexor Stretch', 'MOB', { s: 'Hip', pos: 'Half-Kneeling', d: 1, m: 'hf' });
X('Half Kneeling Thoracic Rotation with Med Ball', 'MOB', { s: 'Spine', pos: 'Half-Kneeling', d: 1, m: 'ub core' });
X('Open Books', 'MOB', { s: 'Spine', d: 1, m: 'ub' });
X('Standing Banded Hip Cars', 'MOB', { s: 'Hip', pos: 'Standing', d: 1, m: 'hf glu' });
X('Tall Kneeling Hip CARs', 'MOB', { s: 'Hip', pos: 'Tall-Kneeling', d: 1, m: 'hf glu' });
X("World's Greatest Stretch", 'MOB', { s: 'Hip', d: 1, m: 'hf ham ub' });

/* ── Stability / Balance / Corrective / Accessory ────────────────── */
// These categories carry no movement_pattern of their own, so one is suggested where
// the exercise has a clear one.
X('Prone External Rotation to Overhead Press', 'STAB', { mp: 'PL' });
X('Scapular Push-Up', 'STAB', { c: 'wrist', mp: 'PU' });
X('Supported Hip Airplane', 'STAB', { c: 'hip', mp: 'LU' });
X('Wall Slide + Lift-Off', 'STAB', { m: 'sh ub', mp: 'MO' });
X('Y Balance', 'BAL', { m: 'glu quad', c: 'knee ankle', mp: 'LU' });
X('One-Leg, One-Handed Pass', 'BAL', { s: 'Reactive Balance', d: 2, m: 'glu calf core', c: 'ankle knee', mp: 'LU' });
X('One-Legged Balance (Eyes Closed)', 'BAL', { s: 'Unilateral Balance', d: 2, m: 'calf glu', c: 'ankle', mp: 'LU' });
X('Single-Leg Balance (Eyes Closed)', 'BAL', { s: 'Unilateral Balance', d: 2, m: 'calf glu', c: 'ankle', mp: 'LU' });
X('SL Dribbling', 'BAL', { s: 'Unilateral Balance', d: 1, m: 'calf glu', c: 'ankle', mp: 'LU' });
X('SL Dribbling In&Out', 'BAL', { s: 'Dynamic Balance', d: 2, m: 'calf glu', c: 'ankle', mp: 'LU' });
X('Banded Active Straight Leg Raises', 'CORR', { s: 'Mobility', r: 'Hip', d: 1, m: 'ham hf', mp: 'MO' });
X('Diaphragmatic Breathing Exercise', 'CORR', { s: 'Movement Quality', r: 'Full Body', d: 1, m: 'core', mp: 'CB' });
X('Supine Band Resisted Hip IR', 'CORR', { s: 'Mobility', r: 'Hip', d: 1, m: 'glu', mp: 'MO' });
X('1Leg Calf Raise', 'ACC', { c: 'ankle' });
X('1Leg ISO Calf Raise', 'ACC', { m: 'calf', c: 'ankle' });
X('Calf Raise with Ball Squeeze', 'ACC', { c: 'ankle' });
X('Calf Raises on Airex Pad', 'ACC', { m: 'calf', c: 'ankle' });
X('Banded Clamshell', 'ACC', { s: 'Prehab & Injury Prevention', d: 1, m: 'abd glu' });
X('Clamshell', 'ACC', { s: 'Prehab & Injury Prevention', d: 1, m: 'abd glu' });
X('Yatarak Kalça / Gluteus Medius Aktivasyonu', 'ACC', { s: 'Prehab & Injury Prevention', d: 1, m: 'abd glu' });
X('Supine Mini Banded Hip Flexion', 'ACC', { s: 'Hip & Hamstring', d: 1, m: 'hf', mp: 'CB' });
X('Cable Shoulder External Rotation (90/90)', 'ACC', { s: 'Shoulder & Scapula', d: 1, m: 'sh', mp: 'PL' });
X('Incline Y Raises', 'ACC', { s: 'Shoulder & Scapula', d: 1, m: 'sh ub', mp: 'PL' });
X('Prone Y-T-W', 'ACC', { s: 'Shoulder & Scapula', d: 1, m: 'sh ub', mp: 'PL' });
X('Y-T-W Scapular Series', 'ACC', { s: 'Shoulder & Scapula', d: 1, m: 'sh ub', mp: 'PL' });

const seen = new Set();
rows.forEach(r => {
  const k = r.name.toLowerCase();
  if (seen.has(k)) throw new Error('duplicate suggestion: ' + r.name);
  seen.add(k);
});

const out = {
  format: 'coachos-exercise-suggestions',
  version: 1,
  generated: '2026-10-03',
  note: 'Suggestions only. The app fills a field only where the exercise has it empty and marks every field it filled as awaiting review.',
  exercises: rows,
};
const file = path.join(__dirname, 'exercise-suggestions.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log(`${rows.length} suggestions → ${path.relative(process.cwd(), file)}`);
