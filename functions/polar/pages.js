/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — sporcunun gördüğü sayfalar (davet ve sonuç)

   Sporcunun CoachOS hesabı yok; davet linkini telefonunda açıyor. Bu yüzden sayfalar
   uygulamanın içinde değil, function'ın kendisinden, düz HTML olarak dönüyor.
   Sade: tek renk, gradyan / emoji / simge yok. Kullanıcıdan gelen her metin kaçışlı.

   Davet sayfası düğmeyle (POST) ilerliyor, sayfa açılır açılmaz değil: WhatsApp gibi
   uygulamalar link önizlemesi için adresi GET ile çekiyor ve bu, akışı başlatmamalı.
   ═══════════════════════════════════════════════════════════════════════════ */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(ms) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(ms));
  } catch (e) { return new Date(ms).toISOString().slice(0, 10); }
}

function shell(title, body) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · CoachOS</title>
<style>
  :root{--bg:#f4f5f7;--card:#fff;--text:#14171c;--dim:#5b6472;--line:#dfe3e8;--accent:#1f4fd1;--bad:#b42318;--ok:#067647}
  @media (prefers-color-scheme: dark){:root{--bg:#121417;--card:#1b1e23;--text:#e8eaed;--dim:#9aa3ae;--line:#2c3138;--accent:#5b8cff;--bad:#f97066;--ok:#47cd89}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{max-width:480px;margin:0 auto;padding:32px 16px}
  .brand{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin-bottom:12px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:24px}
  h1{font-size:21px;margin:0 0 12px}
  p{margin:0 0 12px;color:var(--dim)}
  p b{color:var(--text)}
  ul{margin:0 0 16px;padding-left:20px;color:var(--dim)}
  button{width:100%;padding:13px 16px;border:0;border-radius:8px;background:var(--accent);color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  .small{font-size:13px;margin-top:16px}
  .ok{color:var(--ok)} .bad{color:var(--bad)}
</style></head>
<body><main><div class="brand">CoachOS · Polar</div><div class="card">${body}</div></main></body></html>`;
}

function invitePage({ athleteName, teamName, expiresAt, ticket }) {
  const who = athleteName ? `<b>${esc(athleteName)}</b>` : 'sizin';
  const team = teamName ? `<b>${esc(teamName)}</b> antrenör ekibi` : 'Antrenörünüz';
  return shell('Polar hesabını bağla', `
<h1>Polar hesabını bağla</h1>
<p>${team}, ${who} adına Polar hesabınızın CoachOS'a bağlanmasını istiyor.</p>
<p>Bağlandığınızda Polar Flow'daki şu veriler antrenörünüzün CoachOS paneline aktarılır:</p>
<ul><li>Antrenmanlar (süre, kalp atım hızı, bölgeler, enerji)</li><li>Uyku</li><li>Nightly Recharge (HRV, gece kalp atım hızı, solunum)</li><li>Günlük aktivite (adım)</li></ul>
<p>Polar'ın izin sayfasına yönlendirileceksiniz. İzni istediğiniz zaman Polar Flow ayarlarından kaldırabilirsiniz.</p>
<form method="post" action="">
  <input type="hidden" name="t" value="${esc(ticket)}">
  <button type="submit">Polar ile bağlan</button>
</form>
<p class="small">Bu link ${esc(fmtDate(expiresAt))} tarihine kadar geçerlidir. Bağlantıyı bu sayfayı açtığınız tarayıcıda tamamlayın.</p>`);
}

const MESSAGES = {
  OK: ['Bağlantı tamamlandı', 'Polar hesabınız CoachOS\'a bağlandı. Yeni verileriniz antrenörünüzün paneline aktarılacak. Bu sayfayı kapatabilirsiniz.', 'ok'],
  DENIED: ['İzin verilmedi', 'Polar verilerinize erişim izni vermediniz; hiçbir veri aktarılmadı. Fikrinizi değiştirirseniz aynı davet linkini yeniden açabilirsiniz.', 'bad'],
  INVALID_TICKET: ['Link geçersiz', 'Bu davet linki geçersiz ya da yerine yeni bir link gönderilmiş. Antrenörünüzden güncel linki isteyin.', 'bad'],
  TICKET_EXPIRED: ['Linkin süresi dolmuş', 'Bu davet linkinin süresi dolmuş. Antrenörünüzden yeni bir link isteyin.', 'bad'],
  ALREADY_LINKED: ['Zaten bağlı', 'Bu sporcu için Polar bağlantısı zaten kurulmuş. Bir şey yapmanıza gerek yok.', 'ok'],
  STATE: ['Oturum doğrulanamadı', 'Bağlantı isteği doğrulanamadı ya da süresi doldu. Davet linkini yeniden açıp işlemi aynı tarayıcıda tamamlayın.', 'bad'],
  COOKIE_MISSING: ['Tarayıcı değişti', 'İşlem başladığı tarayıcıda tamamlanmadı. Davet linkini yeniden açın ve Polar\'ın sayfası aynı tarayıcıda açıldığında izin verin.', 'bad'],
  INVALID_GRANT: ['Yetkilendirme süresi doldu', 'Polar\'dan gelen yetkilendirme kodu geçersiz ya da süresi dolmuş. Davet linkini yeniden açıp tekrar deneyin.', 'bad'],
  POLAR_USER_TAKEN: ['Bu Polar hesabı başka bir sporcuya bağlı', 'Bu Polar hesabı CoachOS\'ta başka bir sporcuya bağlı. Bir Polar hesabı yalnızca bir sporcuya bağlanabilir. Antrenörünüzle görüşün.', 'bad'],
  SERVER: ['Bağlantı kurulamadı', 'Şu anda Polar ile bağlantı kurulamadı. Birkaç dakika sonra davet linkini yeniden açıp tekrar deneyin. Sorun sürerse antrenörünüze bildirin.', 'bad'],
};

function resultPage(kind) {
  const [title, text, cls] = MESSAGES[kind] || MESSAGES.SERVER;
  return shell(title, `<h1 class="${cls}">${esc(title)}</h1><p>${esc(text)}</p>`);
}

module.exports = { invitePage, resultPage, MESSAGES, esc };
