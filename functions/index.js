/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — sunucu tarafı

   Tek iş var: sporcu wellness formunu gönderip `checkins` koleksiyonuna doküman
   düştüğünde, gönderim uyarı kriterlerini karşılıyorsa
     1) o sporcuya ait BİR uyarı kaydı oluşturmak,
     2) kaydı, o sporcuyla ilgili ekip üyelerinin telefonlarına push bildirimi
        olarak göndermek.

   Neden burada, istemcide değil: uyarının kime gideceği kararı ve gönderimin
   kendisi koçun tarayıcısına bırakılamaz. Koç uygulamayı kapatmışsa uyarı hiç
   çıkmaz; açık olsa bile bir istemcinin başka kullanıcıların cihazlarına bildirim
   göndermesi güvenlik açısından verilemeyecek bir yetki (Madde 16). Sunucu bu işi
   sporcu formu gönderir göndermez, kimseye bağlı olmadan yapıyor.

   Neden 1. nesil (firebase-functions/v1): 2. nesil Firestore tetikleyicisi
   Eventarc üzerinden kuruluyor ve kurulumu ağırlaştırıyor; 1. nesil aynı işi
   daha az parça ile yapıyor.

   Mevcut akışa dokunmuyor: form aynı dokümanı aynı şekilde yazıyor, koçun
   tarayıcısı aynı dokümanı aynı şekilde işleyip siliyor. Buraya eklenen tek şey
   dokümanın üstündeki `alert*` damgaları — ve uyarının kendisi AYRI bir
   koleksiyona yazılıyor, çünkü `checkins` dokümanı işlendikten ~10 dakika sonra
   koçun tarayıcısı tarafından siliniyor; uyarının ondan uzun yaşaması gerekiyor.
   ═══════════════════════════════════════════════════════════════════════════ */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { shouldAlert, buildNotification, buildAlertRecord } = require('./wellness-alert');
const { tokensFor, groupByLang } = require('./recipients');
const { sendAlert } = require('./push');
const { rosterDocId, alertDocId, alertLink } = require('./ids');
const { claimForAlert } = require('./claim');

admin.initializeApp();

/* Function'ın çalışacağı bölge. Bu projenin Firestore'u eur3'te (Avrupa) duruyor,
   function ise us-central1'de: deploy her seferinde bunu uyarı olarak söylüyor ama
   tetikleme sahada sorunsuz çalışıyor, aradaki fark bir turluk ağ gecikmesi.
   Veritabanının yanına taşımak isteyen FUNCTION_REGION'ı europe-west1 yapar — ama
   bu YENİ bir function yaratır, eskisinin us-central1'den elle silinmesi gerekir.
   O yüzden varsayılan, halihazırda kurulu olan yer. */
const REGION = process.env.FUNCTION_REGION || 'us-central1';

const ROSTER_COL = 'alert_roster';       // takım başına: ad + ekip kadrosu + uygulama adresi
const TOKENS_COL = 'push_tokens';        // eşleştirilmiş cihazlar
const ALERTS_COL = 'wellness_alerts';    // uyarı kayıtları

const db = () => admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

/* ── Tetikleyici ─────────────────────────────────────────────────────────── */
exports.wellnessAlert = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: 120,
    memory: '256MB',
    // Platform aynı olayı ikinci kez getirirse aşağıdaki "sahiplenme" işlemi ikinci
    // gönderimi engelliyor; ayrıca otomatik yeniden denemeyi de açmıyoruz.
    failurePolicy: false,
  })
  .firestore.document('checkins/{checkinId}')
  .onCreate(async (snap, context) => {
    const sub = snap.data() || {};
    const checkinId = context.params.checkinId;

    if (sub.kind !== 'wellness') return null;                   // sRPE bu işin dışında
    if (!sub.coachUid || !sub.teamId || !sub.athleteId) {
      functions.logger.warn('wellness: eksik kimlik alanları, uyarı atlandı', { checkinId });
      return null;
    }
    if (!shouldAlert(sub.payload || {})) {
      functions.logger.info('wellness: kriter karşılanmadı, uyarı yok', { checkinId });
      return null;
    }

    /* ── Çift gönderim koruması (Madde 13, Test 14) ───────────────────────
       Gönderimden ÖNCE dokümanı bir işlem (transaction) içinde sahipleniyoruz.
       Aynı olay ikinci kez işlenirse damga zaten duruyor olacağı için ikinci
       çalışma hiç bildirim atmadan çıkar. Damgayı gönderimden sonra atmak, iki
       çalışmanın aynı anda gönderim yapmasına kapı bırakırdı. */
    const ref = snap.ref;
    const claimed = await claimForAlert(db(), ref, now);
    if (!claimed) {
      functions.logger.info('wellness: bu gönderim zaten işlenmiş, ikinci bildirim yok', { checkinId });
      return null;
    }

    /* ── Takım kadrosu ────────────────────────────────────────────────────
       Takım adı ve ekip listesi buradan geliyor. Doküman yoksa (koç henüz bu
       sürümü açmamış) uyarı yine de KAYDEDİLİYOR — sadece alıcısı kalmıyor.
       Uyarının kaybolmaması, bildirimin gitmesinden önce gelir. */
    let roster = {};
    try {
      const rs = await db().collection(ROSTER_COL).doc(rosterDocId(sub.coachUid, sub.teamId)).get();
      if (rs.exists) roster = rs.data() || {};
    } catch (err) {
      functions.logger.error('wellness: kadro okunamadı', { checkinId, error: String(err) });
    }
    const staff = Array.isArray(roster.staff) ? roster.staff : [];

    /* ── Uyarı kaydı — bildirimden ÖNCE (Madde 14) ────────────────────────
       Push patlasa bile uyarı ekranda duruyor. Sıra tersine olsaydı, bildirim
       gönderilemeyen bir sabahın uyarısı hiçbir yerde kalmazdı. */
    const alertId = alertDocId(sub.coachUid, sub.athleteId, sub.date);
    const alertRef = db().collection(ALERTS_COL).doc(alertId);
    const record = buildAlertRecord(sub, roster.teamName);

    const base = Object.assign({}, record, {
      coachUid: sub.coachUid,
      checkinId,
      submittedAt: sub.at || null,
      createdAt: now(),
      notificationStatus: 'pending',
      v: 1,
    });
    try {
      await alertRef.set(base, { merge: true });
    } catch (err) {
      functions.logger.error('wellness: uyarı kaydı yazılamadı', { checkinId, alertId, error: String(err) });
      // Kayıt yazılamasa da bildirim denenmeye devam ediyor: koçun sabah haberi
      // olması, kaydın arşivlenmesinden daha acil.
    }

    /* ── Alıcılar ─────────────────────────────────────────────────────────
       Hesabın tüm cihazları tek sorguda geliyor, kapsam kararı recipients.js'te
       veriliyor. Takım sayısı da ekip sayısı da küçük; sorguyu bölmek yerine
       filtrelemek hem daha az okuma hem daha az kod. */
    let tokenRows = [];
    try {
      const ts = await db().collection(TOKENS_COL).where('coachUid', '==', sub.coachUid).get();
      tokenRows = ts.docs.map(d => Object.assign({ token: d.id }, d.data()));
    } catch (err) {
      functions.logger.error('wellness: cihaz listesi okunamadı', { checkinId, error: String(err) });
    }
    const targets = tokensFor(tokenRows, {
      coachUid: sub.coachUid,
      teamId: sub.teamId,
      athleteId: sub.athleteId,
      staff,
    });

    if (!targets.length) {
      functions.logger.info('wellness: uyarı kaydedildi ama bildirilecek cihaz yok', {
        checkinId, alertId, athleteId: sub.athleteId,
      });
      await alertRef.set({ recipients: [], notificationStatus: 'no_recipients' }, { merge: true }).catch(() => {});
      await ref.update({ alertSent: true, alertSentAt: now() }).catch(() => {});
      return null;
    }

    /* ── Gönderim ─────────────────────────────────────────────────────────
       Bildirim metni kişinin diline göre kuruluyor, aynı dili konuşan cihazlar
       tek istekte gidiyor. */
    const link = alertLink(roster.appUrl || process.env.APP_ORIGIN, alertId);
    const data = {
      alertId,
      athleteId: String(sub.athleteId),
      teamId: String(sub.teamId),
      date: String(sub.date || ''),
    };

    const byToken = new Map(targets.map(t => [t.token, t]));
    const results = [];
    const dead = [];
    for (const [lang, group] of groupByLang(targets)) {
      const text = buildNotification(sub, roster.teamName, lang);
      const r = await sendAlert(admin.messaging(), group.map(t => t.token), text, data, link);
      results.push(...r.results);
      dead.push(...r.dead);
    }

    /* Ölü token'ları temizle: silinmiş uygulama, kapatılmış bildirim ya da dönmüş
       token her sabah yeniden denenip her sabah yeniden hata üretmesin. */
    if (dead.length) {
      const batch = db().batch();
      dead.forEach(t => batch.delete(db().collection(TOKENS_COL).doc(t)));
      await batch.commit().catch(err =>
        functions.logger.warn('wellness: ölü token temizliği başarısız', { error: String(err) }));
    }

    /* Kimin aldığı, kimin alamadığı (Madde 11 ve 15). Token'ın kendisi kayda
       YAZILMIYOR — bir cihaz adresi, uyarı geçmişinde durmasına gerek olmayan
       bir sırdır; kim olduğu staffId ve isimle zaten belli. */
    const okCount = results.filter(r => r.ok).length;
    const recipients = results.map(r => {
      const t = byToken.get(r.token) || {};
      return {
        staffId: t.staffId || null,
        name: t.name || '',
        role: t.role || (t.kind === 'coach' ? 'coach' : ''),
        kind: t.kind || 'staff',
        status: r.ok ? 'sent' : 'failed',
        error: r.ok ? null : String(r.error || ''),
      };
    });
    const status = okCount === 0 ? 'failed' : (okCount === results.length ? 'sent' : 'partial');

    await alertRef.set({
      recipients,
      notificationStatus: status,
      notifiedAt: now(),
    }, { merge: true }).catch(err =>
      functions.logger.error('wellness: uyarı durumu yazılamadı', { alertId, error: String(err) }));

    /* Check-in kaydına ASLA dokunulmuyor, silinmiyor — sadece damga (Madde 14).
       Gönderim başarısız olsa bile sahiplenme damgası duruyor, aynı olay tekrar
       gelse ikinci bildirim atılmıyor. */
    await ref.update({ alertSent: true, alertSentAt: now() }).catch(() => {});

    functions.logger.info('wellness: uyarı gönderildi', {
      checkinId, alertId, athleteId: sub.athleteId, date: sub.date,
      sent: okCount, failed: results.length - okCount, dead: dead.length,
    });
    return null;
  });
