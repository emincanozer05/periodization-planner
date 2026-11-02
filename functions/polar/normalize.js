/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — gelen kaydı CoachOS alanlarına çevirme (saf fonksiyonlar)

   Kural: yalnızca Polar'ın GERÇEKTEN gönderdiği alanlar. Gelmeyen alan `null`
   kalıyor ve `missing` listesine yazılıyor; tahminle doldurulan hiçbir şey yok.
   Başka alanlardan HESAPLANAN tek değerler `derived` listesinde adıyla duruyor
   (örn. uyku süresi = evrelerin toplamı) — ölçülmüş gibi görünmesinler.

   Ham kayıt (`raw`) her dokümanda olduğu gibi saklanıyor: alan eşlemesi ileride
   değişirse veri yeniden çekilmeden yeniden yorumlanabilsin.
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : null));
const str = v => (v == null || v === '' ? null : String(v));
const dateOf = v => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || '')); return m ? m[1] : null; };

/* ISO 8601 süre ("PT1H2M3.5S") → saniye. Tanınmazsa null. */
function isoDurationSec(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(v).trim());
  if (!m || m[0] === 'P' || m[0] === 'PT') return null;
  const [, d, h, mi, s] = m.map(x => (x == null ? 0 : +x));
  return Math.round((d * 86400 + h * 3600 + mi * 60 + s) * 1000) / 1000;
}

/* Anahtar sırasından bağımsız JSON → aynı içerik aynı özeti verir (gereksiz yazımı önler). */
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const hashOf = v => crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 32);

function finish(fields, expected, derived) {
  const missing = expected.filter(k => fields[k] == null);
  return Object.assign(fields, { missing, derived: derived || [] });
}

/* ── Uyku (/v3/users/sleep) ─────────────────────────────────────────────── */
const SLEEP_EXPECTED = ['sleepStart', 'sleepEnd', 'lightSec', 'deepSec', 'remSec', 'sleepScore', 'continuity', 'interruptionSec', 'sleepCharge'];
function sleep(r) {
  const f = {
    date: dateOf(r.date),
    sleepStart: str(r.sleep_start_time),
    sleepEnd: str(r.sleep_end_time),
    lightSec: num(r.light_sleep),
    deepSec: num(r.deep_sleep),
    remSec: num(r.rem_sleep),
    unrecognizedSec: num(r.unrecognized_sleep_stage),
    interruptionSec: num(r.total_interruption_duration),
    sleepScore: num(r.sleep_score),
    continuity: num(r.continuity),
    continuityClass: num(r.continuity_class),
    sleepCharge: num(r.sleep_charge),
    sleepRating: num(r.sleep_rating),
    sleepGoalSec: num(r.sleep_goal),
    sleepCycles: num(r.sleep_cycles),
    deviceId: str(r.device_id),
  };
  // Toplam uyku: Polar ayrı bir alan göndermiyor; evrelerin toplamı. Evrelerden
  // biri bile yoksa toplam da yok (eksik toplam, tam ölçüm gibi görünmesin).
  const parts = [f.lightSec, f.deepSec, f.remSec];
  f.asleepSec = parts.every(v => v != null) ? parts.reduce((s, v) => s + v, 0) + (f.unrecognizedSec || 0) : null;
  return finish(f, SLEEP_EXPECTED, f.asleepSec != null ? ['asleepSec'] : []);
}

/* ── Nightly Recharge (/v3/users/nightly-recharge) ─────────────────────── */
const RECHARGE_EXPECTED = ['hrvMs', 'hrAvg', 'beatToBeatMs', 'breathingRate', 'ansCharge', 'nightlyRechargeStatus'];
function recharge(r) {
  return finish({
    date: dateOf(r.date),
    hrvMs: num(r.heart_rate_variability_avg),          // RMSSD ortalaması (ms)
    hrAvg: num(r.heart_rate_avg),                      // gece kalp atım hızı (bpm)
    beatToBeatMs: num(r.beat_to_beat_avg),             // ortalama R-R aralığı (ms)
    breathingRate: num(r.breathing_rate_avg),          // solunum / dk
    ansCharge: num(r.ans_charge),
    ansChargeStatus: num(r.ans_charge_status),
    nightlyRechargeStatus: num(r.nightly_recharge_status),
  }, RECHARGE_EXPECTED);
}

/* ── Antrenman (/v3/exercises?zones=true) ──────────────────────────────── */
const EXERCISE_EXPECTED = ['startTime', 'durationSec', 'hrAvg', 'hrMax', 'calories', 'zones'];
function exercise(r) {
  const hr = r.heart_rate || {};
  const tlp = r.training_load_pro || {};
  const zonesRaw = Array.isArray(r.heart_rate_zones) ? r.heart_rate_zones : null;
  const zones = zonesRaw && zonesRaw.length ? zonesRaw.map(z => ({
    index: num(z.index),
    lowerBpm: num(z['lower-limit'] != null ? z['lower-limit'] : z.lower_limit),
    upperBpm: num(z['upper-limit'] != null ? z['upper-limit'] : z.upper_limit),
    inZoneSec: isoDurationSec(z['in-zone'] != null ? z['in-zone'] : z.in_zone),
  })) : null;
  return finish({
    exerciseId: str(r.id),
    date: dateOf(r.start_time),
    startTime: str(r.start_time),
    utcOffsetMin: num(r.start_time_utc_offset),
    durationSec: isoDurationSec(r.duration),
    calories: num(r.calories),
    distanceM: num(r.distance),
    hrAvg: num(hr.average),
    hrMax: num(hr.maximum),
    sport: str(r.sport),
    detailedSport: str(r.detailed_sport_info),
    trainingLoad: num(r.training_load),
    cardioLoad: num(tlp['cardio-load']),
    muscleLoad: num(tlp['muscle-load']),
    perceivedLoad: num(tlp['perceived-load']),
    zones,
    device: str(r.device),
  }, EXERCISE_EXPECTED);
}

/* ── Günlük aktivite (activity-transactions → özet) ────────────────────── */
const ACTIVITY_EXPECTED = ['steps', 'calories', 'activeCalories', 'durationSec'];
function activity(r) {
  return finish({
    date: dateOf(r.date),
    steps: num(r['active-steps'] != null ? r['active-steps'] : r.active_steps),
    calories: num(r.calories),
    activeCalories: num(r['active-calories'] != null ? r['active-calories'] : r.active_calories),
    durationSec: isoDurationSec(r.duration),
    created: str(r.created),
  }, ACTIVITY_EXPECTED);
}

/* ── Kardiyo yükü (/v3/users/cardio-load) — cihaz destekliyorsa ─────────── */
const CARDIO_EXPECTED = ['cardioLoad', 'strain', 'tolerance'];
function cardioLoad(r) {
  return finish({
    date: dateOf(r.date),
    cardioLoad: num(r.cardio_load),
    strain: num(r.strain),
    tolerance: num(r.tolerance),
    ratio: num(r.cardio_load_ratio),
    status: str(r.cardio_load_status),
  }, CARDIO_EXPECTED);
}

/* Liste yanıtının biçimi uç noktaya göre değişiyor (dizi ya da {nights:[…]} gibi). */
function listOf(j, keys) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  for (const k of keys) if (Array.isArray(j[k])) return j[k];
  const arr = Object.values(j).find(Array.isArray);
  return arr || [];
}

module.exports = { isoDurationSec, stable, hashOf, listOf, sleep, recharge, exercise, activity, cardioLoad };
