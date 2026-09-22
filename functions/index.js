/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — sunucu tarafı

   Tek iş var: sporcu wellness formunu gönderip `checkins` koleksiyonuna doküman
   düştüğünde,
     1) o gönderim için BİR kayıt oluşturmak — kriteri aşsın aşmasın, çünkü koçun
        ekranı "bugün kim doldurdu" sorusunu da cevaplamak zorunda,
     2) kayıt uyarı kriterini aşıyorsa (`flagged`), o sporcuyla ilgili ekip
        üyelerinin telefonlarına push bildirimi göndermek.

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
const { tokensFor, groupForSend, eligibleStaff } = require('./recipients');
const { sendAlert } = require('./push');
const { rosterDocId, alertDocId, staffAlertLink } = require('./ids');
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

    /* ── Kriter: KAYDI DEĞİL, BİLDİRİMİ belirliyor ────────────────────────
       Burada eskiden kriteri karşılamayan gönderim hemen dönüyordu: ne kayıt
       yazılıyordu ne de bir iz kalıyordu. Sahadaki karşılığı şuydu — 17 sporcunun
       formu doldurduğu bir sabah koç ekranda 6 kişi görüyor, kalan 11'in forma hiç
       dokunup dokunmadığını hiçbir yerden bilemiyordu. Eksik kayıt "bildirim
       gelmedi" gibi okunuyordu, oysa gönderim gelmişti.

       Artık HER wellness gönderimi kaydediliyor; `flagged` alanı kriteri taşıyor.
       PUSH yalnızca flagged gönderimler için gidiyor: ekran günün tamamını
       gösteriyor, telefon yalnızca ilgilenilmesi gerekeni çalıyor. */
    const flagged = shouldAlert(sub.payload || {});

    /* ── Çift gönderim koruması (Madde 13, Test 14) ───────────────────────
       Gönderimden ÖNCE dokümanı bir işlem (transaction) içinde sahipleniyoruz.
       Aynı olay ikinci kez işlenirse damga zaten duruyor olacağı için ikinci
       çalışma hiç bildirim atmadan çıkar. Damgayı gönderimden sonra atmak, iki
       çalışmanın aynı anda gönderim yapmasına kapı bırakırdı.

       Damga artık kriteri karşılamayan gönderimlere de basılıyor: onlar da bir
       doküman yazıyor ve o yazımın da tek olması gerekiyor. */
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
    let rosterFound = false;
    try {
      const rs = await db().collection(ROSTER_COL).doc(rosterDocId(sub.coachUid, sub.teamId)).get();
      if (rs.exists) { roster = rs.data() || {}; rosterFound = true; }
    } catch (err) {
      functions.logger.error('wellness: kadro okunamadı', { checkinId, error: String(err) });
    }
    const staff = Array.isArray(roster.staff) ? roster.staff : [];
    /* Kadro dokümanı yoksa uyarı yine çıkıyor ama ekipten kimse bildirilemiyor ve
       bildirimin linki de kurulamıyor. Bu, bildirimin gelmemesinin sahada en sık
       görülen sebebiydi ve hiçbir yerde YAZMIYORDU: koç ekranda "0/0" görüyor,
       nedenini göremiyordu. Artık sebep uyarı kaydına giriyor (Madde 20). */
    if (!rosterFound) {
      functions.logger.warn('wellness: takımın kadro dokümanı yok — ekip bildirilemez', {
        checkinId, teamId: sub.teamId, rosterDoc: rosterDocId(sub.coachUid, sub.teamId),
      });
    }

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
      // Kriteri karşılamayan gönderimde gönderilecek bir bildirim yok; durum bunu
      // 'failed' ile karıştırılmayacak biçimde söylüyor.
      notificationStatus: flagged ? 'pending' : 'not_flagged',
      /* Aynı sporcunun aynı günkü İKİNCİ gönderimi bu dokümanın üstüne yazıyor
         (ad sporcu+tarihten türüyor). Sabah kriteri aşan bir gönderim yapıp
         öğleden sonra düzelten sporcunun kaydında, artık gönderilmeyen bir
         bildirimin alıcı listesi kalmasın: kriter düştüyse liste de düşüyor. */
      ...(flagged ? {} : { recipients: [], unreachable: [] }),
      // "Bildirim neden gelmedi" sorusunun uygulamadan okunabilir cevabı (Madde 21).
      rosterPublished: rosterFound,
      v: 1,
    });
    try {
      await alertRef.set(base, { merge: true });
    } catch (err) {
      functions.logger.error('wellness: uyarı kaydı yazılamadı', { checkinId, alertId, error: String(err) });
      // Kayıt yazılamasa da bildirim denenmeye devam ediyor: koçun sabah haberi
      // olması, kaydın arşivlenmesinden daha acil.
    }

    /* Kriteri karşılamayan gönderim burada bitiyor: kaydı yazıldı, ekranda görünecek,
       ama kimsenin telefonu çalmayacak. Cihaz listesi bile okunmuyor — okunacak bir
       sebep yok ve her sabah 17 gereksiz sorgu demek olurdu. */
    if (!flagged) {
      await ref.update({ alertSent: true, alertSentAt: now() }).catch(() => {});
      functions.logger.info('wellness: gönderim kaydedildi, kriter karşılanmadı — bildirim yok', {
        checkinId, alertId, athleteId: sub.athleteId, date: sub.date,
      });
      return null;
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

    /* Kapsamda olup CİHAZI OLMAYAN ekip üyeleri. Uyarının kime GİTMEDİĞİ, kime
       gittiği kadar önemli: "bildirim almadım" diyen kişinin telefonunu hiç
       eşleştirmemiş olması sahada en sık görülen sebep, ve koç bunu bugüne kadar
       hiçbir ekrandan göremiyordu (Madde 21). Bu liste zaten elimizdeki iki
       veriden çıkıyor — fazladan tek bir okuma yapmıyor. */
    const withDevice = new Set(targets.filter(t => t.staffId).map(t => t.staffId));
    const unreachable = eligibleStaff(staff, sub.athleteId)
      .filter(m => !withDevice.has(m.id))
      .map(m => ({
        staffId: m.id,
        name: ((m && m.name) || '').trim(),
        role: m.role || '',
        reason: 'no_device',
      }));

    if (!targets.length) {
      functions.logger.info('wellness: uyarı kaydedildi ama bildirilecek cihaz yok', {
        checkinId, alertId, athleteId: sub.athleteId,
        rosterPublished: rosterFound, eligible: unreachable.length,
      });
      await alertRef.set({
        recipients: [], unreachable, notificationStatus: 'no_recipients',
      }, { merge: true }).catch(() => {});
      await ref.update({ alertSent: true, alertSentAt: now() }).catch(() => {});
      return null;
    }

    /* ── Gönderim ─────────────────────────────────────────────────────────
       Bildirim metni kişinin diline göre kuruluyor; aynı dili paylaşan cihazlar
       tek istekte gidiyor. Tıklama adresi artık herkeste aynı. */
    const appUrl = roster.appUrl || process.env.APP_ORIGIN;
    /* TEK adres, herkes için: uyarı sayfası. Koçun bildirimi eskiden kendi
       uygulamasına, sporcunun Wellness ekranına açılıyordu; telefonda başka bir
       CoachOS sayfası (çoğu zaman check-in formu) açıkken o tıklama oraya
       düşebiliyordu. Uyarı sayfası hem herkeste aynı yere gidiyor hem de uyarıların
       tamamını, en ağırı üstte gösteriyor. */
    const link = staffAlertLink(appUrl);
    /* Linksiz bildirim GÖNDERİLİYOR ama tıklanınca hiçbir yere gitmiyor. Sebebi
       neredeyse her zaman kadro dokümanının hiç yayımlanmamış olması; o yüzden
       burada sessiz kalmıyor. */
    if (!link) {
      functions.logger.warn('wellness: uygulama adresi bilinmiyor — bildirim linksiz gidiyor', {
        checkinId, alertId, rosterPublished: rosterFound,
      });
    }
    const data = {
      alertId,
      athleteId: String(sub.athleteId),
      teamId: String(sub.teamId),
      date: String(sub.date || ''),
    };

    const byToken = new Map(targets.map(t => [t.token, t]));
    const results = [];
    const dead = [];
    for (const [, group] of groupForSend(targets)) {
      const text = buildNotification(sub, roster.teamName, group.lang);
      const r = await sendAlert(admin.messaging(), group.tokens.map(t => t.token), text, data, link);
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
        // Hangi cihaz: "telefonuma gelmiyor ama bilgisayarda geliyor" ayrımı
        // ancak bu alan kayıtta durursa yapılabiliyor (Madde 21).
        platform: t.platform || '',
        status: r.ok ? 'sent' : 'failed',
        error: r.ok ? null : String(r.error || ''),
      };
    });
    const status = okCount === 0 ? 'failed' : (okCount === results.length ? 'sent' : 'partial');

    await alertRef.set({
      recipients,
      unreachable,
      notificationStatus: status,
      notifiedAt: now(),
    }, { merge: true }).catch(err =>
      functions.logger.error('wellness: uyarı durumu yazılamadı', { alertId, error: String(err) }));

    /* Check-in kaydına ASLA dokunulmuyor, silinmiyor — sadece damga (Madde 14).
       Gönderim başarısız olsa bile sahiplenme damgası duruyor, aynı olay tekrar
       gelse ikinci bildirim atılmıyor. */
    await ref.update({ alertSent: true, alertSentAt: now() }).catch(() => {});

    /* Boru hattının son satırı (Madde 20). Skor, ağrı bölgesi ve isim BURAYA
       GİRMİYOR — bir uyarının neden ulaşmadığını anlamak için gerekmiyorlar ve
       sporcunun sağlık verisi log arşivinde yaşamamalı. Kalanı teşhis için yeterli:
       kaç cihaza gitti, kaç tanesi hangi hatayla döndü, linkli mi gitti. */
    functions.logger.info('wellness: uyarı gönderildi', {
      checkinId, alertId, athleteId: sub.athleteId, date: sub.date,
      sent: okCount, failed: results.length - okCount, dead: dead.length,
      unreachableStaff: unreachable.length,
      linked: !!link,
      errors: Array.from(new Set(results.filter(r => !r.ok).map(r => String(r.error || '')))),
    });
    return null;
  });

/* ═══════════════════════════════════════════════════════════════════════════
   YAPAY ZEKÂ — program üretim işi ve Gemini proxy'si

   Gemini API anahtarı yalnızca burada, Secret Manager'dan gelir:
       firebase functions:secrets:set GEMINI_API_KEY
   Tarayıcıda, depoda, localStorage'da ya da senkronlanan veride durmaz.
   Ayrıntı: functions/ai/*.js ve AI_RELIABILITY.md.
   ═══════════════════════════════════════════════════════════════════════════ */
const aiJob = require('./ai/job');
const aiProxy = require('./ai/proxy');
const gemini = require('./ai/gemini');
const AI_SECRET = 'GEMINI_API_KEY';

/* Yapılandırılmış log satırı. Anahtar ve sporcunun sağlık verisi buraya girmez;
   iş kimliği, sporcu/seans kimliği, model, deneme, hata türü, HTTP durumu,
   geçen süre, fallback ve doğrulama sonucu girer (Madde 20). */
const aiLog = (level, event, fields) => {
  const fn = functions.logger[level] || functions.logger.info;
  fn('ai: ' + event, Object.assign({ event }, fields || {}));
};

exports.aiGenerationJob = functions
  .region(REGION)
  .runWith({
    secrets: [AI_SECRET],
    // İşin kendisi 120 sn'de biter; kalan pay kilit bırakma ve son yazım için.
    timeoutSeconds: 180,
    memory: '512MB',
    // Otomatik yeniden deneme YOK: aynı iş ikinci kez çalışırsa sahiplenme onu
    // zaten durduruyor, ama platformun kendi retry'ı 6 çağrılık bütçeyi aşmanın
    // ikinci bir yolu olurdu.
    failurePolicy: false,
  })
  .firestore.document(aiJob.COL_JOBS + '/{jobId}')
  .onCreate(async snap => {
    await aiJob.processJob({
      db: db(),
      ref: snap.ref,
      gemini,
      apiKey: process.env[AI_SECRET] || '',
      log: aiLog,
    });
    return null;
  });

exports.geminiProxy = functions
  .region(REGION)
  .runWith({ secrets: [AI_SECRET], timeoutSeconds: 120, memory: '256MB' })
  .https.onCall(async (data, context) => {
    try {
      return await aiProxy.handle(data, context.auth, {
        db: db(), gemini, apiKey: process.env[AI_SECRET] || '', log: aiLog,
      });
    } catch (e) {
      if (e instanceof aiProxy.ProxyError) {
        throw new functions.https.HttpsError(e.httpsCode, e.message, { code: e.code });
      }
      aiLog('error', 'ai_proxy_internal', { error: String((e && e.message) || e).slice(0, 300) });
      throw new functions.https.HttpsError('internal', aiProxy.USER_MSG.DEFAULT, { code: 'INTERNAL' });
    }
  });
