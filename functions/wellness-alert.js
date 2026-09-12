/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS UYARISI — karar ve bildirim metni (saf mantık, Firebase'den bağımsız)

   Buradaki her şey girdi→çıktı: tek bir `checkins` dokümanının payload'ından
   "uyarı çıkacak mı, çıkacaksa bildirimde ne yazacak" sorusunu cevaplıyor. Ağ,
   Firestore ve FCM işleri index.js/push.js'te; bu dosya testten doğrudan
   çağrılabilsin diye ayrı duruyor.

   Alan isimleri checkin.html'deki forma birebir bağlı (payload() → satır 749):
     sleep / fatigue / soreness  → 1-5, 1 kötü 5 iyi
     RHR                         → dinlenik nabız, opsiyonel
     painMap                     → { 'Bölge': 1|2|3 }, 1 hafif · 2 orta · 3 yüksek
                                   (bölge haritada yoksa o bölgede ağrı yok —
                                    formda "yok" diye bir değer yok, yokluk kendisi)
   ═══════════════════════════════════════════════════════════════════════════ */

// Uyarıyı açan iki eşik. İkisi de TEK BAŞINA yeterli; bir arada olmaları gerekmiyor.
const WELLNESS_THRESHOLD = 3.5;      // bunun ALTI tek başına uyarı sebebi (3.5 dahil DEĞİL)
// 1 (hafif) bilerek dışarıda: sporcuların çoğunda her sabah bir yerde hafif bir
// şey oluyor ve onu bildirmek listeyi okunmaz hale getiriyor.
const PAIN_MIN_SEVERITY = 2;         // orta (2) ve yüksek (3)

// Puan → renkli daire. Uygulamanın kendi wellness skalasıyla aynı yön: 1 kötü,
// 5 iyi; renkler de uygulamadaki SCORE_COLORS ile aynı sırada (kırmızı→mavi).
// Ondalıklı skor (ör. 3.2) en yakın tam basamağa yuvarlanıp renklenir.
const SCORE_DOTS = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '🔵' };

// Uyarı sebepleri KOD olarak taşınıyor, cümle olarak değil: alert kaydı bir kez
// yazılıyor ama iki dilde okunuyor (uygulama TR/EN), ve ileride SMS/e-posta aynı
// kaydı kendi diliyle okuyacak. Cümleyi kaydın içine gömmek bunu imkânsız kılardı.
const REASON_LOW_SCORE = 'low_score';
const REASON_PAIN = 'pain';

/* Bildirimin SEVİYESİ. Her gönderim bildiriliyor (koç, sporcu formu gönderdiği an
   haberdar olmak istiyor); kriter artık "bildirilsin mi" sorusunu değil, "bu bir
   uyarı mı yoksa rutin bir bildirim mi" sorusunu cevaplıyor. Telefonda ikisi
   başlığından ayrılıyor, uyarı kaydı ise yalnızca 'alert' için açılıyor. */
const LEVEL_ALERT = 'alert';
const LEVEL_INFO = 'info';

function num(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return null;
  return Number(v);
}

/* Formdaki skorun ortalaması — YUVARLANMAMIŞ hâli. Karar bu sayıya bakıyor.

   Neden iki ayrı fonksiyon: eşik KESİN KÜÇÜK ve tam 3.5'in hemen altındaki bir
   değer yuvarlanınca 3.5'e çıkıyor (3.49 → 3.5). Yuvarlanmış sayıyla karşılaştırmak
   kuralı sessizce tersine çeviriyordu: uyarı olması gereken 3.49, uyarı olmayan
   3.5 gibi okunuyordu. Ekranda gösterilen sayı yuvarlanmış olmalı (koç 3.3 görür),
   ama kararı veren sayı ham olmalı.

   Formdan gelen gerçek veride ikisi hiç ayrışmıyor — üç tam sayının ortalaması
   yalnızca x.0/x.3/x.7, ikisininki x.0/x.5 olabiliyor ve bunların hiçbiri
   [3.45, 3.5) aralığına düşmüyor. Yani bu ayrım bugünkü davranışı değiştirmiyor,
   sadece kuralı ifade edildiği gibi doğru kılıyor. */
function overallWellnessExact(payload) {
  const vals = ['sleep', 'fatigue', 'soreness'].map(k => num(payload && payload[k])).filter(v => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/* Gösterim için: checkin.html'deki readinessScore() ve index.html'deki
   mergeCheckins() ile AYNI formül — doldurulan skorların ortalaması, tek ondalık.
   Zorunlu olan uyku ve yorgunluk; kas ağrısı boş bırakılmışsa ortalamaya girmiyor.

   Formül burada YENİDEN TANIMLANMIYOR, kopyalanıyor: uygulamanın ekranda gösterdiği
   "Antrenmana Hazır Oluşluk" ile uyarıda yazan sayı aynı olmak zorunda, yoksa koç
   ekranda 3.6 görüp neden uyarı geldiğini soruyor. */
function overallWellness(payload) {
  const raw = overallWellnessExact(payload);
  if (raw == null) return null;
  return Math.round(raw * 10) / 10;
}

/* Şiddetine göre ayrılmış ağrı bölgeleri. Hafif (1) hiç dönmüyor: ne kararda ne
   bildirimde yeri var. */
function painBySeverity(payload) {
  const pm = (payload && typeof payload.painMap === 'object' && payload.painMap) || {};
  const out = { 3: [], 2: [] };
  for (const raw of Object.keys(pm)) {
    const region = String(raw || '').trim();
    const sev = Math.round(num(pm[raw]) || 0);
    if (!region || !out[sev]) continue;
    out[sev].push(region);
  }
  return out;
}

/* Orta ya da yüksek şiddette en az bir ağrı var mı. */
function hasReportablePain(payload) {
  const pain = painBySeverity(payload);
  return pain[3].length > 0 || pain[2].length > 0;
}

/* Skor tek başına uyarı sebebi mi. KESİN KÜÇÜK: 3.5 uyarı değil, 3.49 uyarı.
   Ayrı bir fonksiyon olmasının sebebi testin eşiği gerçek forma ulaşılamayan
   değerlerle de (3.49 gibi) sınayabilmesi — aşağıdaki nota bak. */
function isLowScore(score) {
  return score != null && score < WELLNESS_THRESHOLD;
}

/* Uyarı kriteri — İKİ BAĞIMSIZ SEBEP, biri yetiyor:
     1) Overall Wellness < 3.5
     2) en az bir bölgede orta (2) ya da yüksek (3) ağrı

   İkisini birden şart koşmak her iki yönde de yanlış sporcuyu susturuyordu:
   ağrısı olmadan berbat uyumuş sporcu da, iyi dinlenmiş ama dizi ağrıyan sporcu
   da ekibin sabah görmesi gereken kişiler. Biri düşük skoru, öteki ağrıyı
   anlatıyor; ikisi ayrı bilgi, ayrı sebep. */
function shouldAlert(payload) {
  return isLowScore(overallWellnessExact(payload)) || hasReportablePain(payload);
}

/* Gönderimin seviyesi: kriter karşılanıyorsa uyarı, karşılanmıyorsa rutin. */
function alertLevel(payload) {
  return shouldAlert(payload) ? LEVEL_ALERT : LEVEL_INFO;
}

/* Uyarının hangi sebeple açıldığı. İkisi birden doğruysa ikisi birden dönüyor —
   koç ekranda "düşük skor + ağrı" ile "sadece ağrı"yı ayırt edebilsin diye. */
function alertReasons(payload) {
  const out = [];
  if (isLowScore(overallWellnessExact(payload))) out.push(REASON_LOW_SCORE);
  if (hasReportablePain(payload)) out.push(REASON_PAIN);
  return out;
}

function dot(v) {
  const n = num(v);
  if (n == null) return '';
  const step = Math.min(5, Math.max(1, Math.round(n)));
  return SCORE_DOTS[step];
}
// 3 → "3", 3.2 → "3.2" — tam sayıda gereksiz ".0" durmasın.
function fmtNum(v) {
  const n = num(v);
  if (n == null) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/* Bildirim gövdesinde ağrı bölgeleri. Telefonun bildirim satırı kısa: ikiden fazla
   bölge varsa ilk ikisi yazılıp gerisi sayıyla toplanıyor, yoksa tek bir sporcunun
   bildirimi ekranı kaplıyor. Tamamı alert kaydında zaten duruyor. */
function joinRegions(list, lang) {
  if (!list.length) return '';
  if (list.length <= 2) return list.join(', ');
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
}

const TXT = {
  tr: {
    title: 'CoachOS Wellness Uyarısı',
    titleInfo: 'CoachOS Wellness',
    wellness: 'Wellness',
    high: 'Yüksek ağrı',
    moderate: 'Orta ağrı',
    noName: 'İsimsiz sporcu',
  },
  en: {
    title: 'CoachOS Wellness Alert',
    titleInfo: 'CoachOS Wellness',
    wellness: 'Wellness',
    high: 'High pain',
    moderate: 'Moderate pain',
    noName: 'Unnamed athlete',
  },
};

/* Telefonda tek bakışta okunacak bildirim. Örnek:
     CoachOS Wellness Uyarısı
     Emir Papur — U16 | Wellness: 3.2/5 | Yüksek ağrı: Quadriceps

   Renk YOK: bildirim metninde font rengi kullanılamıyor, o yüzden şiddet
   kelimeyle ("Yüksek ağrı") anlatılıyor. Renkli daireler uygulamanın kendi
   uyarı ekranında; orada gerçek renk zaten var.

   Takım adı gövdeye giriyor çünkü bir koç birden çok takıma bakıyor olabilir ve
   "Emir Papur" tek başına hangi kadronun sabahını anlatmıyor. */
function buildNotification(sub, teamName, lang, level) {
  const t = TXT[lang === 'en' ? 'en' : 'tr'];
  const p = (sub && sub.payload) || {};
  /* Başlık seviyeyi söylüyor: "Uyarı" kelimesi her sabah her sporcu için çıkarsa
     hiçbir şey anlatmaz olur. Seviye verilmemişse payload'dan hesaplanıyor —
     çağıranın ikisini ayrı ayrı hesaplamak zorunda kalmaması için. */
  const lvl = level || alertLevel(p);
  const score = overallWellness(p);
  const pain = painBySeverity(p);

  const who = ((sub && sub.athleteName) || '').trim() || t.noName;
  const team = String(teamName || '').trim();

  const parts = [team ? `${who} — ${team}` : who];
  const s = fmtNum(score);
  if (s) parts.push(`${t.wellness}: ${s}/5`);
  if (pain[3].length) parts.push(`${t.high}: ${joinRegions(pain[3], lang)}`);
  else if (pain[2].length) parts.push(`${t.moderate}: ${joinRegions(pain[2], lang)}`);

  return { title: lvl === LEVEL_ALERT ? t.title : t.titleInfo, body: parts.join(' | ') };
}

/* Uyarı kaydının gövdesi — alert dokümanına yazılan her şey (Madde 11).
   Bildirimin kendisi bundan türetiliyor ama kayıt çok daha fazlasını taşıyor:
   bildirim silinince de koç uyarıyı ekranda bulabilmeli, ve Notification Center /
   analitik / filtreleme gibi ileride gelecek şeylerin dayanacağı yer burası. */
function buildAlertRecord(sub, teamName) {
  const p = (sub && sub.payload) || {};
  const pain = painBySeverity(p);
  return {
    athleteId: (sub && sub.athleteId) || '',
    athleteName: ((sub && sub.athleteName) || '').trim(),
    teamId: (sub && sub.teamId) || '',
    teamName: String(teamName || '').trim(),
    date: (sub && sub.date) || '',
    overall: overallWellness(p),
    scores: {
      sleep: num(p.sleep),
      fatigue: num(p.fatigue),
      soreness: num(p.soreness),
      RHR: num(p.RHR),
    },
    painHigh: pain[3],
    painModerate: pain[2],
    reasons: alertReasons(p),
    level: alertLevel(p),
  };
}

module.exports = {
  WELLNESS_THRESHOLD, PAIN_MIN_SEVERITY, REASON_LOW_SCORE, REASON_PAIN, SCORE_DOTS,
  LEVEL_ALERT, LEVEL_INFO, alertLevel,
  overallWellness, overallWellnessExact, painBySeverity, hasReportablePain, isLowScore, shouldAlert, alertReasons,
  buildNotification, buildAlertRecord, dot,
};
