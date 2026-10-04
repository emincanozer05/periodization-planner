/* ═══════════════════════════════════════════════════════════════════════════
   AÇIK TEMA ÜRETİCİ — src/10-styles.css'ten src/15-theme-light.css'in otomatik bölümünü üretir

   Uygulamanın stilleri koyu tema için yazıldı. Çoğu renk tema değişkeninden geliyor (--bg,
   --panel, --text...) ve açık temada yalnızca o değişkenleri yeniden tanımlamak yetiyor.
   Ama ~300 bildirim sabit, koyu temaya özgü renk kullanıyor: yarı saydam beyaz katmanlar
   (rgba(255,255,255,.05)), beyaz yazı, koyu düz arka planlar, koyu kenarlıklar, ağır gölgeler.
   Bu betik onları bulup her biri için `:root[data-theme="light"] <seçici>` altında açık karşılığını
   yazıyor. Seçiciye öznitelik eklendiği için özgüllük artıyor; özgün bildirim !important ise
   karşılığı da !important.

   Kurallar:
     rgba(255,255,255,a)             → rgba(15,23,42,a)  (beyaz katman → koyu katman)
     koyu düz arka plan (#0x–#2x)     → var(--bg) / var(--panel) / var(--elevated)
     koyu kenarlık                    → var(--border)
     beyaz yazı                       → var(--text)  (aynı kural renkli bir arka plan vermiyorsa)
     koyu gölge rgba(0,0,0,a)         → alfa × 0.35

   Çalıştırma:  node tools/gen-light-theme.js   (src/15-theme-light.css'teki işaretler arası yenilenir,
   elle yazılmış bölüm korunur; ardından node assemble.js)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const css = fs.readFileSync(path.join(SRC, '10-styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// ── çok basit bir CSS ayrıştırıcı: { kurallar } ve @media / @supports / @container / @layer iç içe ──
function parse(text) {
  const out = [];
  let i = 0;
  function block(ctx) {
    while (i < text.length) {
      const open = text.indexOf('{', i), close = text.indexOf('}', i);
      if (close >= 0 && (open < 0 || close < open)) { i = close + 1; return; }
      if (open < 0) { i = text.length; return; }
      const head = text.slice(i, open).trim();
      i = open + 1;
      if (/^@(media|supports|container|layer)/.test(head)) { block([...ctx, head]); continue; }
      if (/^@(keyframes|-webkit-keyframes|font-face|page)/.test(head)) {   // içine girme
        let d = 1; while (i < text.length && d) { if (text[i] === '{') d++; else if (text[i] === '}') d--; i++; }
        continue;
      }
      const end = text.indexOf('}', i);
      out.push({ ctx, sel: head, body: text.slice(i, end) });
      i = end + 1;
    }
  }
  block([]);
  return out;
}

const hexLum = h => {
  h = h.replace('#', ''); if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const WHITE_TEXT = /^(#fff|#ffffff|#fafafa|#f9fafb|#f3f4f6|#f1f5f9|#eef2f7|#e5e7eb|white)(\s*!important)?$/i;
const COLORED_BG = /var\(--(accent|grad|red|green|orange|cyan|purple|pink|yellow|blue|low-t|med-t|high-t|peak-t|tryo)\b|#(0094ff|0080dc|2563eb|3b82f6|ef4444|10b981|f97316|8b5cf6|ec4899|f59e0b|06b6d4|22c55e|dc2626|16a34a)\b|rgba?\(\s*(0,\s*148|239,\s*68|16,\s*185|249,\s*115|139,\s*92|236,\s*72|245,\s*158|6,\s*182|34,\s*197|220,\s*38)/i;

function convert(prop, val, ruleBody) {
  const imp = /!important\s*$/.test(val);
  const v = val.replace(/\s*!important\s*$/, '');
  let nv = null;
  if (/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/.test(v)) {
    nv = v.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g, (_, a) => `rgba(15,23,42,${a})`);
  }
  if (/^(background|background-color)$/.test(prop) && /^#[0-2][0-9a-f]{2,5}$/i.test(v)) {
    const l = hexLum(v); nv = l < 0.035 ? 'var(--bg)' : l < 0.075 ? 'var(--panel)' : 'var(--elevated)';
  }
  if (/^border(-top|-bottom|-left|-right)?(-color)?$/.test(prop) && /#[1-3][0-9a-f]{2,5}\b/i.test(v) && !/gradient/.test(v)) {
    const m = v.match(/#[0-9a-f]{3,8}\b/i); if (m && hexLum(m[0]) < 0.25) nv = (nv || v).replace(m[0], 'var(--border)');
  }
  if (prop === 'color' && WHITE_TEXT.test(val.trim())) {
    const bg = (ruleBody.match(/background(-color)?\s*:\s*([^;]+)/i) || [])[2] || '';
    if (!COLORED_BG.test(bg)) nv = 'var(--text)';
  }
  if (prop === 'box-shadow' && /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/.test(nv || v)) {
    nv = (nv || v).replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g, (_, a) => `rgba(15,23,42,${Math.round(parseFloat(a) * 35) / 100})`);
  }
  return nv && nv !== v ? nv + (imp ? ' !important' : '') : null;
}

function prefix(sel) {
  return sel.split(',').map(s => {
    s = s.trim();
    if (/^:root\b/.test(s)) return s.replace(/^:root/, ':root[data-theme="light"]');
    if (/^html\b/.test(s)) return s.replace(/^html/, 'html[data-theme="light"]');
    return ':root[data-theme="light"] ' + s;
  }).join(',\n');
}

const rules = parse(css);
const lines = [];
let count = 0;
for (const r of rules) {
  if (/^:root/.test(r.sel) && /--/.test(r.body)) continue;          // değişken tanımları elle yazılıyor
  const decls = [];
  for (const d of r.body.split(';')) {
    const k = d.indexOf(':'); if (k < 0) continue;
    const prop = d.slice(0, k).trim().toLowerCase(), val = d.slice(k + 1).trim();
    if (!prop || prop.startsWith('--') && !/rgba\(\s*255/.test(val)) continue;
    const nv = convert(prop, val, r.body);
    if (nv) decls.push(`${prop}:${nv}`);
  }
  if (!decls.length) continue;
  count += decls.length;
  let rule = `${prefix(r.sel)}{${decls.join(';')}}`;
  for (const c of [...r.ctx].reverse()) rule = `${c}{${rule}}`;
  lines.push(rule);
}

const BEGIN = '/* === OTOMATİK: tools/gen-light-theme.js üretti, elle düzenleme === */';
const END = '/* === OTOMATİK SONU === */';
const file = path.join(SRC, '15-theme-light.css');
const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `${BEGIN}\n${END}\n`;
const a = prev.indexOf(BEGIN), b = prev.indexOf(END);
if (a < 0 || b < 0) throw new Error('15-theme-light.css içinde otomatik bölüm işaretleri yok');
fs.writeFileSync(file, prev.slice(0, a) + BEGIN + '\n' + lines.join('\n') + '\n' + prev.slice(b));
console.log(`${lines.length} kural, ${count} bildirim yazıldı → src/15-theme-light.css`);
