/* ═══════════════════════════════════════════════════════════════════════════
   UYARI ALICILARI — kim bildirim alacak (saf mantık, Firebase'den bağımsız)

   Soru şu: bir sporcunun wellness uyarısı, hangi ekip üyelerinin telefonuna
   gidecek? Cevap tamamen mevcut CoachOS veri yapısından çıkıyor:

       Sporcu → Takım → team.staff[]  →  eşleştirilmiş cihaz(lar)

   Hiçbir kulüp/takım/kişi kimliği koda gömülü değil (Madde 7). Kod yalnızca
   "bu gönderim hangi takımdan geldi" bilgisini kullanıyor; takım da kulüp de
   değişse aynı kod çalışıyor.

   ── Roller ───────────────────────────────────────────────────────────────
   index.html'deki STAFF_ROLES ile birebir aynı beş rol:
     head · assistant · performance · physio · individual

   Dördü TAKIM düzeyinde çalışıyor: takımın her sporcusunun uyarısını alırlar.
   'individual' (Bireysel Antrenör) ise doğası gereği tek tek sporcuya bakıyor,
   bu yüzden yalnızca KENDİNE ATANMIŞ sporcuların uyarısını alır — staff
   kaydındaki `athleteIds` bunu söylüyor. Ataması olmayan bireysel antrenöre
   uyarı gitmez; uygulamadaki kartı bunu ayrıca yazıyor, yoksa sessiz kalan bir
   bildirim ayarı "bozuk" gibi görünürdü.
   ═══════════════════════════════════════════════════════════════════════════ */

// Takımın tamamını takip eden roller. 'individual' bilerek dışarıda.
const TEAM_WIDE_ROLES = ['head', 'assistant', 'performance', 'physio'];
const INDIVIDUAL_ROLE = 'individual';
const ALL_ROLES = TEAM_WIDE_ROLES.concat([INDIVIDUAL_ROLE]);

/* Bu ekip üyesi, BU sporcunun uyarısını almalı mı? */
function staffCovers(member, athleteId) {
  if (!member || !member.id) return false;
  const role = member.role;
  if (TEAM_WIDE_ROLES.indexOf(role) >= 0) return true;
  if (role !== INDIVIDUAL_ROLE) return false;          // tanımadığımız rol → kapsam yok
  const ids = Array.isArray(member.athleteIds) ? member.athleteIds : [];
  return ids.indexOf(athleteId) >= 0;
}

/* Takım kadrosundan, bu sporcunun uyarısını alması gereken ekip üyeleri. */
function eligibleStaff(staff, athleteId) {
  return (Array.isArray(staff) ? staff : []).filter(m => staffCovers(m, athleteId));
}

/* ── Cihazlar ──────────────────────────────────────────────────────────────
   Ekip üyesi ≠ cihaz. Bir kişinin telefonu ve tableti olabilir (iki token), ya da
   hiç eşleştirmemiş olabilir (sıfır token). Uyarı KİŞİYE değil CİHAZA gidiyor.

   `tokens` → push_tokens koleksiyonundan gelen kayıtlar:
       { token, kind:'coach'|'staff', coachUid, teamId, staffId, role, lang }

   Koçun kendi cihazı (kind:'coach') takımdan bağımsız: hesabın sahibi tüm
   takımlarının uyarısını alır, bu yüzden teamId taşımıyor. Bir takıma
   kilitlenmiş koç cihazı da desteklensin diye teamId varsa yine de kontrol
   ediliyor — ileride "sadece şu takımı bildir" ayarı eklenirse kod hazır.

   Eşleşmeyen / tokensiz kişi sessizce atlanıyor (Test 12 ve 13): uyarı geri
   kalan herkese gitmeye devam ediyor, hata üretmiyor. */
function tokensFor(tokens, opts) {
  const { coachUid, teamId, athleteId, staff } = opts || {};
  const covered = new Set(eligibleStaff(staff, athleteId).map(m => m.id));
  const seen = new Set();
  const out = [];
  for (const t of (Array.isArray(tokens) ? tokens : [])) {
    if (!t || !t.token) continue;
    if (t.coachUid !== coachUid) continue;             // başka hesabın cihazı — asla
    if (seen.has(t.token)) continue;                   // aynı cihaz iki kez yazılmış
    if (t.kind === 'coach') {
      // Hesap sahibi: takım kısıtı yoksa hepsini, varsa yalnızca o takımı alır.
      if (t.teamId && t.teamId !== teamId) continue;
    } else {
      if (t.teamId !== teamId) continue;               // ekip üyesi kendi takımını alır
      if (!t.staffId || !covered.has(t.staffId)) continue;
    }
    seen.add(t.token);
    out.push(t);
  }
  return out;
}

/* Bildirim metni kişinin diline göre kuruluyor; aynı dili paylaşan cihazlar tek
   bir FCM isteğinde gidebilsin diye burada gruplanıyor. Dil eşleştirme sırasında
   kaydediliyor, bilinmiyorsa Türkçe — uygulamanın ve formun varsayılanı o. */
function groupByLang(tokens) {
  const out = new Map();
  for (const t of tokens) {
    const lang = t.lang === 'en' ? 'en' : 'tr';
    if (!out.has(lang)) out.set(lang, []);
    out.get(lang).push(t);
  }
  return out;
}

/* Tek istekte gidebilecek cihazlar. Aynı dili konuşmak artık yetmiyor: bildirimin
   açtığı adres KİŞİYE ÖZEL (herkes kendi uyarı sayfasına düşüyor), ve FCM'de adres
   mesajın kendisinde duruyor. O yüzden grup anahtarı dil + adres.

   Dönen: Map(anahtar → { lang, link, tokens }) */
function groupByDelivery(tokens) {
  const out = new Map();
  for (const t of (Array.isArray(tokens) ? tokens : [])) {
    const lang = t.lang === 'en' ? 'en' : 'tr';
    const link = t.link || '';
    const key = `${lang}\n${link}`;
    if (!out.has(key)) out.set(key, { lang, link, tokens: [] });
    out.get(key).tokens.push(t);
  }
  return out;
}

module.exports = {
  TEAM_WIDE_ROLES, INDIVIDUAL_ROLE, ALL_ROLES,
  staffCovers, eligibleStaff, tokensFor, groupByLang, groupByDelivery,
};
