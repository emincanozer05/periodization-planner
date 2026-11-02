/* ═══════════════════════════════════════════════════════════════════════════
   POLAR ACCESSLINK — sabitler ve ayarlar

   Polar AccessLink v3. Neden v3: admin.polaraccesslink.com'da kayıtlı client bu
   sürüme bağlı ("Exercise / Daily activity / Physical information" veri türleri),
   Polar'ın resmî örnek istemcisi (polarofficial/accesslink-example-python) aynı
   adresleri kullanıyor ve uyku / Nightly Recharge / egzersiz verisi transaction'sız
   uç noktalardan gelebiliyor.

   Sırlar (Secret Manager, `firebase functions:secrets:set …`):
     POLAR_CLIENT_SECRET   token değişimi (Basic auth)
     POLAR_TOKEN_KEY       erişim token'larını şifreleyen AES-256 anahtarı (32 bayt, base64)
   Sır OLMAYAN iki değer (client id, redirect adresi) varsayılanıyla burada; ortam
   değişkeniyle ezilebilir. Client id gizli değil: tarayıcı her yetkilendirmede onu
   Polar'ın adres çubuğunda zaten gösteriyor.
   ═══════════════════════════════════════════════════════════════════════════ */

const POLAR = {
  AUTHORIZE_URL: 'https://flow.polar.com/oauth2/authorization',
  TOKEN_URL: 'https://polarremote.com/v2/oauth2/token',
  API_BASE: 'https://www.polaraccesslink.com/v3',
  SCOPE: 'accesslink.read_all',
};

const DEFAULTS = {
  CLIENT_ID: '0c81fbb3-68b7-4657-8774-43172293a8c6',
  REDIRECT_URI: 'https://periodization-planner-rust.vercel.app/api/polar/callback',
};

const SECRETS = ['POLAR_CLIENT_SECRET', 'POLAR_TOKEN_KEY'];

const COL = {
  LINKS: 'polar_links',          // sporcu başına bağlantı durumu — koç okur, sunucu yazar
  TOKENS: 'polar_tokens',        // şifreli erişim token'ı — istemciye tamamen kapalı
  USERS: 'polar_users',          // Polar kullanıcısı → tek sporcu (benzersizlik) — kapalı
  STATES: 'polar_oauth_states',  // tek kullanımlık OAuth state — kapalı
  TICKETS: 'polar_tickets',      // sporcuya giden davet linkleri — kapalı
  ROSTER: 'alert_roster',        // koçun uygulamasının yayımladığı kadro özeti (mevcut, yalnızca okunur)
};

const TICKET_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // davet linki: 7 gün
const STATE_TTL_MS = 10 * 60 * 1000;             // Polar'da izin verme süresi: 10 dk
const HTTP_TIMEOUT_MS = 15 * 1000;

/* Bağlama çerezi. Adı `__session`, çünkü Firebase Hosting önünden geçen isteklerde
   bu tek çerez adı function'a iletiliyor — ileride web.app adresi de redirect adresi
   olarak eklenirse aynı kod çalışsın. Yolu yalnızca Polar akışı. */
const COOKIE = { NAME: '__session', PATH: '/api/polar', MAX_AGE_S: STATE_TTL_MS / 1000 };

/* JSON uç noktalarını (davet / bağlantı kesme) doğrudan çağırabilecek uygulama adresleri. */
const ALLOWED_ORIGINS = [
  'https://periodization-planner-rust.vercel.app',
  'https://periodization-planner.web.app',
  'https://periodization-planner.firebaseapp.com',
];

function settings(env) {
  const e = env || process.env;
  const redirectUri = e.POLAR_REDIRECT_URI || DEFAULTS.REDIRECT_URI;
  return {
    clientId: e.POLAR_CLIENT_ID || DEFAULTS.CLIENT_ID,
    clientSecret: e.POLAR_CLIENT_SECRET || '',
    tokenKey: e.POLAR_TOKEN_KEY || '',
    redirectUri,
    // Davet linkinin açılacağı kök: redirect adresiyle aynı alan adı, aynı çerez.
    publicBase: new URL(redirectUri).origin,
  };
}

module.exports = {
  POLAR, DEFAULTS, SECRETS, COL, TICKET_TTL_MS, STATE_TTL_MS, HTTP_TIMEOUT_MS, COOKIE,
  ALLOWED_ORIGINS, settings,
};
