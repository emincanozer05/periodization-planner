/* ═══════════════════════════════════════════════════════════════════════════
   SUNUCU TARAFI DOĞRULAMA — şema ve bütünlük (Madde 13'ün ilk yarısı)

   Sıra:  AI yanıtı → ŞEMA → BÜTÜNLÜK → KÜTÜPHANE → (istemcide) CoachOS Kural
          Denetleyicisi → yinelenen iş / iş geçerliliği → kayıt.

   Bu dosya ilk üç kapıyı tutar. CoachOS Kural Denetleyicisi (validateProgram —
   sakatlık kısıtları, ağrının kapattığı paternler, ekipman varlığı/adedi/yükü,
   kademe tavanı, temas sınırı, antrenörün sayısal sınırları) kodun TEK kopyası
   olarak uygulamada duruyor ve iş, istemcinin o denetleyiciden aldığı sonucu
   bekleyerek aynı döngüde ilerliyor (bkz. job.js). İkinci bir kopya yazılmadı:
   iki denetleyici bir gün farklı karar verirse hangisinin doğru olduğunu kimse
   bilemezdi.

   KÜTÜPHANE KAPISI: modelin "kaynak": "library" diye işaretlediği her egzersiz
   koçun Egzersiz Kütüphanesinde GERÇEKTEN bulunmak zorunda — kütüphaneden
   geliyormuş gibi yazılan uydurma bir kayıt reddedilir (Test 15). Kütüphane
   dışından AÇIKÇA "custom" diye yazılan egzersiz kabul edilir; bu, bilgi
   tabanının 29. kuralı ve mevcut CoachOS davranışıdır, değiştirilmedi.
   ═══════════════════════════════════════════════════════════════════════════ */

const PHASES = new Set(['hazirlik', 'ana', 'tamamlayici']);
const str = v => (v == null ? '' : String(v)).trim();
const has = v => { const s = str(v); return !!s && s !== 'null'; };
const norm = s => str(s).toLocaleLowerCase('tr').replace(/\s+/g, ' ');

/* Uygulamanın kendi ayrıştırıcısıyla aynı toleranslar: çit (```), baştaki/sondaki
   düzyazı. Yarıda kesilmiş JSON ONARILMAZ — eksik bir program eksiktir. */
function extractJson(text) {
  let s = str(text);
  if (!s) return { error: 'EMPTY_RESPONSE' };
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b <= a) return { error: 'INVALID_JSON' };
  try { return { obj: JSON.parse(s.slice(a, b + 1)) }; } catch (e) { return { error: 'INVALID_JSON' }; }
}

function validateStructure(text, ctx) {
  const c = ctx || {};
  const errors = [];
  const E = (stage, code, tr) => errors.push({ stage, code, text: tr });

  const ex = extractJson(text);
  if (ex.error) {
    E('schema', ex.error, ex.error === 'EMPTY_RESPONSE'
      ? 'Model boş yanıt döndürdü.'
      : 'Yanıt geçerli bir JSON değil (ya da yarıda kesilmiş).');
    return { status: 'fail', stage: 'schema', errors };
  }
  const obj = ex.obj;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    E('schema', 'NOT_OBJECT', 'Yanıtın kökü bir JSON nesnesi değil.');
    return { status: 'fail', stage: 'schema', errors };
  }
  const prog = obj.program;
  if (!prog || typeof prog !== 'object' || Array.isArray(prog)) {
    E('schema', 'NO_PROGRAM', '"program" nesnesi yok.');
    return { status: 'fail', stage: 'schema', errors };
  }
  if (!Array.isArray(prog.bloklar)) {
    E('schema', 'NO_BLOCKS', '"program.bloklar" listesi yok.');
    return { status: 'fail', stage: 'schema', errors };
  }
  ['flagged_conflicts', 'uyulan_kisitlar', 'antrenman_onceligi'].forEach(k => {
    if (obj[k] != null && !Array.isArray(obj[k])) E('schema', 'BAD_FIELD', `"${k}" bir liste olmalı.`);
  });

  // ── Bütünlük ──────────────────────────────────────────────────────────
  let total = 0;
  const libClaims = [];
  prog.bloklar.forEach((bl, bi) => {
    if (!bl || typeof bl !== 'object') { E('completeness', 'BAD_BLOCK', `${bi + 1}. blok bir nesne değil.`); return; }
    if (bl.faz != null && has(bl.faz) && !PHASES.has(str(bl.faz).toLowerCase()))
      E('schema', 'BAD_PHASE', `${bi + 1}. bloğun fazı tanınmıyor ("${str(bl.faz).slice(0, 40)}").`);
    if (!Array.isArray(bl.egzersizler)) { E('completeness', 'NO_EXERCISES', `${bi + 1}. blokta "egzersizler" listesi yok.`); return; }
    bl.egzersizler.forEach((e, ei) => {
      if (!e || typeof e !== 'object') { E('completeness', 'BAD_EXERCISE', `${bi + 1}.${ei + 1} egzersizi bir nesne değil.`); return; }
      if (!has(e.ad)) { E('completeness', 'NO_NAME', `${bi + 1}.${ei + 1} egzersizinin adı yok.`); return; }
      total++;
      if (!has(e.set) && !has(e.tekrar) && !has(e.sure) && !has(e.mesafe))
        E('completeness', 'NO_DOSE', `"${str(e.ad)}" için set, tekrar, süre ya da mesafe yazılmamış.`);
      if (str(e.kaynak).toLowerCase() === 'library') libClaims.push(str(e.ad));
    });
  });
  if (!total) E('completeness', 'EMPTY_PROGRAM', 'Programda egzersiz yok.');

  // ── Kütüphane ─────────────────────────────────────────────────────────
  const idx = Array.isArray(c.libraryIndex) ? c.libraryIndex : null;
  if (idx && idx.length) {
    const known = new Set(idx.map(norm));
    const ghosts = [...new Set(libClaims.filter(n => !known.has(norm(n))))];
    if (ghosts.length)
      E('library', 'UNKNOWN_LIBRARY_EXERCISE',
        `Kütüphaneden olduğu söylenen ama Egzersiz Kütüphanesinde bulunmayan egzersiz: ${ghosts.slice(0, 8).join(', ')}. `
        + 'Kütüphanedeki adı birebir kullan ya da kaynağı "custom" yaz.');
  }

  if (errors.length) return { status: 'fail', stage: errors[0].stage, errors, exerciseCount: total };
  return { status: 'pass', stage: 'structure', errors: [], exerciseCount: total, program: obj };
}

module.exports = { validateStructure, extractJson };
