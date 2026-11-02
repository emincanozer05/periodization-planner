/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — şifreleme ve rastgele değerler (yalnızca Node'un yerleşik `crypto`'su)

   Erişim token'ı Firestore'a AES-256-GCM ile şifrelenmiş yazılıyor. Anahtar
   (POLAR_TOKEN_KEY) Secret Manager'da; Firestore'da yalnızca şifreli metin, IV ve
   doğrulama etiketi duruyor. Ek doğrulanmış veri (AAD) olarak Polar kullanıcı
   kimliği bağlanıyor: bir kullanıcının şifreli token'ı başka bir kullanıcının
   dokümanına kopyalanırsa çözülmüyor.

   Neden uygulama seviyesinde şifreleme: AccessLink v3 token'ı fiilen süresiz ve
   sporcunun sağlık verisine açılıyor. Firestore dışa aktarımı, yedek ya da ileride
   yanlış yazılmış bir kural tek başına token sızdırmasın.
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a == null ? '' : a));
  const y = Buffer.from(String(b == null ? '' : b));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function parseKey(b64) {
  const k = Buffer.from(String(b64 || '').trim(), 'base64');
  if (k.length !== 32) {
    const e = new Error('POLAR_TOKEN_KEY 32 baytlık base64 bir anahtar olmalı.');
    e.code = 'TOKEN_KEY_INVALID';
    throw e;
  }
  return k;
}

function encrypt(plain, keyB64, aad) {
  const key = parseKey(keyB64);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad != null) c.setAAD(Buffer.from(String(aad)));
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return { v: 1, alg: 'A256GCM', iv: iv.toString('base64'), ct: ct.toString('base64'), tag: c.getAuthTag().toString('base64') };
}

function decrypt(box, keyB64, aad) {
  if (!box || box.v !== 1 || box.alg !== 'A256GCM') throw new Error('Tanınmayan şifreli token biçimi.');
  const key = parseKey(keyB64);
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  if (aad != null) d.setAAD(Buffer.from(String(aad)));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(box.ct, 'base64')), d.final()]).toString('utf8');
}

module.exports = { randomToken, sha256, safeEqual, parseKey, encrypt, decrypt };
