/* ═══════════════════════════════════════════════════════════════════════════
   DOKÜMAN ADLARI — uyarı ve kadro kayıtlarının adresi

   Adlar TÜRETİLİYOR, üretilmiyor. Sebebi tek ve önemli: aynı olay ikinci kez
   işlenirse aynı adı hesaplayıp aynı dokümanın üstüne yazsın, yeni bir kayıt
   açmasın (Madde 13). Rastgele bir kimlik bunu imkânsız kılardı.

   Ayrı dosyada olmasının sebebi testten çağrılabilmesi: index.js yüklenirken
   admin.initializeApp() çalıştığı için kimlik bilgisi olmadan require edilemiyor.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Doküman adlarında yalnızca güvenli karakterler dursun. Sporcu/takım kimlikleri
   uygulamanın kendi uid() üretecinden geliyor ve zaten alfanümerik; bu, dışarıdan
   gelmiş ya da bir yedekten içeri aktarılmış tuhaf bir kimliğe karşı emniyet.
   Firestore doküman adında '/' kabul etmiyor ve '.' / '..' adlarını reddediyor. */
const safe = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 200) || '-';

/* Takımın kadro dokümanı. Koçun uygulaması burayı yayımlıyor (ekip ya da sporcu
   değişince), function yalnızca okuyor. */
const rosterDocId = (coachUid, teamId) => `${safe(coachUid)}__${safe(teamId)}`;

/* Uyarı kaydının adı SPORCU + TARİH'ten türüyor.

   Böylece aynı sporcunun aynı günkü ikinci gönderimi YENİ bir uyarı açmıyor,
   mevcut kaydın üstüne yazıyor — `checkinSrcId` ile aynı mantık, uygulamanın
   check-in birleştirmesinde zaten kullandığı desen. Beş sporcu aynı sabah uyarı
   verirse beş AYRI kayıt oluşuyor (Madde 8, Test 15): ad sporcuyu taşıdığı için
   birleşmeleri mümkün değil.

   coachUid de adın içinde: sporcu kimlikleri hesap içinde benzersiz ama bir yedek
   başka bir hesaba aktarıldığında iki hesapta aynı kimlik bulunabiliyor. */
const alertDocId = (coachUid, athleteId, date) =>
  `${safe(coachUid)}__${safe(athleteId)}__${safe(date)}`;

/* Bildirime tıklanınca açılacak adres. Uygulamanın nerede yayınlandığını KOÇUN
   UYGULAMASI biliyor ve kadro dokümanına yazıyor — burada sabit bir alan adı
   durmuyor (Madde 7: kulüp/kurulum bağımsız). Adres yoksa boş dönüyor ve bildirim
   linksiz gidiyor; tıklanınca hiçbir şey açılmaması, yanlış yere açılmasından iyi.

   Gelen adres hem klasör ("https://x.com/app/") hem dosya ("…/app/index.html")
   biçiminde olabiliyor — tarayıcıda location.href neyse o. Sondaki dosya adı
   atılıp klasöre iniliyor, yoksa ".../index.html/index.html" gibi çalışmayan bir
   adres çıkıyordu. */
function alertLink(appUrl, alertId) {
  const raw = String(appUrl || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';
  let u;
  try { u = new URL(raw); } catch (e) { return ''; }
  /* Yalnızca YOLUN son parçasına bakılıyor. Adresi düz metin olarak kırpmak,
     "https://example.com" gibi yolu olmayan bir adreste alan adının noktasını
     dosya adı sanıp adresi "https:/index.html" hâline getiriyordu. */
  const dir = u.pathname
    .replace(/[^/]*\.[^/]*$/, '')  // sondaki dosya adı (index.html vb.) → klasör
    .replace(/\/+$/, '');          // kapanış eğik çizgisi
  return `${u.origin}${dir}/index.html#alert=${encodeURIComponent(alertId)}`;
}

module.exports = { safe, rosterDocId, alertDocId, alertLink };
