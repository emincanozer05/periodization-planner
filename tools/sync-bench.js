#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   SENKRON ÖLÇÜMÜ — tek bir düzenlemenin yeni yapıda (v2) ne kadar iş tuttuğu (senkron hız planı R0/R1)

   Gerçekçi bir hesapta (tools/sync-fixture.js) temsilî düzenlemeler yapar ve denetleyicinin
   (468 → smController) her düzenlemede yaptığı işi adım adım ölçer:
     gönderim  = smToDocs(veri, önceki) + smDiff(önceki, sonraki)       (flush)
     yankı     = smFromDocs(belgeler) + iki kez smCanon(veri)            (onDocs; migrate hariç)
   İki tür sayı basar:
     • süre (ms, 5 tekrarın ortancası) — makineye göre değişir, karşılaştırma aynı makinede yapılır
     • İŞ SAYISI: düzenleme başına smCanon çağrısı ve metne çevrilen karakter — her makinede aynı.
       R3'ün CI bütçesi bu sayıya bağlanacak (hedef: değişen belge kadar, hesap kadar değil).

   Kullanım:
     node tools/sync-bench.js                     büyük hesap (~6 MB), tablo
     node tools/sync-bench.js --size small
     node tools/sync-bench.js --save once.json    sonucu kaydet
     node tools/sync-bench.js --compare once.json kayıtlıyla karşılaştır (aynı makinede)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const { makeFixture } = require('./sync-fixture.js');

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const SIZE = opt('--size') || 'large';

/* <store-map>'i olduğu gibi al; smCanon'a sayaç ekle (yalnızca bu ölçüm kopyasında). */
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '468-store-map.jsx'), 'utf8');
let body = src.slice(src.indexOf('/* <store-map>'), src.indexOf('/* </store-map> */'));
const CANON = 'function smCanon(v){';
if (body.indexOf(CANON) < 0) throw new Error('smCanon bulunamadı');
body = body.replace(CANON, CANON + '__C.n++;');
const C = { n: 0 };
// eslint-disable-next-line no-new-func
const SM = new Function('__C', body + '; return { smToDocs, smFromDocs, smDiff, smCanon };')(C);

const clone = o => JSON.parse(JSON.stringify(o));
const base = clone(makeFixture(SIZE, 1)); delete base.activeTeamId;
const docs0 = SM.smToDocs(base);
const EDITS = [
  ['test değeri', d => { d.teams[0].athletes[3].tests[1].cmj = 44; }],
  ['seans adı', d => { const k = Object.keys(d.teams[0].days)[5]; d.teams[0].days[k].sessions[0].name = 'Yeni ad'; }],
  ['wellness ekle', d => { d.teams[0].athletes[2].wellness.push({ id: 'wNew', date: '2026-03-03', sleep: 4 }); }],
  ['kütüphanenin başına egzersiz', d => { d.exercises.unshift({ id: 'eNew', name: 'Yeni', type: 'Core', muscle: [], contra: [] }); }],
  ['sezon ayarı (müsabaka)', d => { d.teams[0].setup.competitions.push({ id: 'cNew', date: '2026-06-01', name: 'Final' }); }],
];
/* Yapısal paylaşım (ekranlardaki gibi): değişmeyen alt ağaç eski nesne kalır — ezberli eşleme bunu kullanır. */
function share(oldV, newV) {
  if (oldV === newV) return oldV;
  if (!oldV || !newV || typeof oldV !== 'object' || typeof newV !== 'object' || Array.isArray(oldV) !== Array.isArray(newV)) return newV;
  if (JSON.stringify(oldV) === JSON.stringify(newV)) return oldV;
  if (Array.isArray(newV)) return newV.map((x, i) => share(oldV[i], x));
  const r = {}; for (const k of Object.keys(newV)) r[k] = share(oldV[k], newV[k]); return r;
}
const memo0 = {}; const cdocs0 = SM.smToDocs(base, null, memo0);
const median = xs => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
const time = (f, k = 5) => { f(); const t = []; for (let i = 0; i < k; i++) { const s = process.hrtime.bigint(); f(); t.push(Number(process.hrtime.bigint() - s) / 1e6); } return median(t); };
const count = f => { C.n = 0; f(); return C.n; };

const rows = [];
for (const [name, fn] of EDITS) {
  const ed = clone(base); fn(ed); const next = share(base, ed);
  let nd = null, ops = null;
  const tTo = time(() => { nd = SM.smToDocs(next, docs0); });
  const tDiff = time(() => { ops = SM.smDiff(docs0, nd); });
  const tFrom = time(() => SM.smFromDocs(nd));
  const back = SM.smFromDocs(nd);
  const tCanon = time(() => { SM.smCanon(back); SM.smCanon(next); });
  const canonFlush = count(() => SM.smDiff(docs0, SM.smToDocs(next, docs0)));
  const canonEcho = count(() => { const r = SM.smFromDocs(nd); SM.smCanon(r); SM.smCanon(next); });
  const written = ops.reduce((s, o) => s + JSON.stringify(o).length, 0);
  // R3 adayı: ezberli eşleme + kimlikle kısa devre yapan fark (kendi önceki çıktısı ve ezberiyle)
  const memo = Object.assign({}, memo0);
  let cops = null;
  const tInc = time(() => { const cn = SM.smToDocs(next, cdocs0, memo); cops = SM.smDiff(cdocs0, cn); });
  const canonInc = count(() => { const cn = SM.smToDocs(next, cdocs0, memo); SM.smDiff(cdocs0, cn); });
  const sameOps = JSON.stringify(cops.map(o => SM.smCanon(o)).sort()) === JSON.stringify(ops.map(o => SM.smCanon(o)).sort());
  rows.push({ name, docs: Object.keys(nd).length, ops: ops.length, writtenB: written,
    flushMs: +(tTo + tDiff).toFixed(1), echoMs: +(tFrom + tCanon).toFixed(1), canonFlush, canonEcho,
    incMs: +tInc.toFixed(1), canonInc, incSame: sameOps });
}

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
console.log(`\nSenkron ölçümü · boyut=${SIZE} · ${(JSON.stringify(base).length / 1e6).toFixed(2)} MB · ${Object.keys(docs0).length} belge · node ${process.version}\n`);
console.log(pad('düzenleme', 30) + lpad('yazım', 6) + lpad('bayt', 8) + lpad('gönderim ms', 13) + lpad('yankı ms', 10) + lpad('canon/gönd.', 13) + lpad('canon/yankı', 13) + lpad('R3 gönd. ms', 13) + lpad('R3 canon', 10) + lpad('R3=ref', 8));
for (const r of rows) console.log(pad(r.name, 30) + lpad(r.ops, 6) + lpad(r.writtenB, 8) + lpad(r.flushMs, 13) + lpad(r.echoMs, 10) + lpad(r.canonFlush, 13) + lpad(r.canonEcho, 13) + lpad(r.incMs, 13) + lpad(r.canonInc, 10) + lpad(r.incSame ? 'evet' : 'HAYIR', 8));
console.log('\n"yazım/bayt": Firestore\'a giden (değişenle orantılı olmalı) · "canon": düzenleme başına metne çevirme sayısı (bugün hesapla orantılı)');

const save = opt('--save'), cmp = opt('--compare');
const out = { size: SIZE, at: new Date().toISOString(), node: process.version, docs: Object.keys(docs0).length, rows };
if (save) { fs.writeFileSync(save, JSON.stringify(out, null, 2)); console.log('kaydedildi: ' + save); }
if (cmp) {
  const old = JSON.parse(fs.readFileSync(cmp, 'utf8'));
  console.log('\nkarşılaştırma (' + cmp + ', ' + old.at + '):');
  for (const r of rows) {
    const o = (old.rows || []).find(x => x.name === r.name); if (!o) continue;
    const pct = (a, b) => b ? (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + '%' : '—';
    console.log('  ' + pad(r.name, 30) + 'gönderim ' + pct(r.flushMs, o.flushMs) + ' · yankı ' + pct(r.echoMs, o.echoMs) +
      ' · canon ' + o.canonFlush + '→' + r.canonFlush + ' / ' + o.canonEcho + '→' + r.canonEcho);
  }
}
