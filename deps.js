/* ═══════════════════════════════════════════════════════════════════════════
   BAĞIMLILIK HARİTASI — src/app/ parçaları birbirine nasıl bağlı

   Parçalar tek betik olarak, aynı genel kapsamda çalışıyor: bir parça başka
   parçadaki bir ada `import` olmadan doğrudan başvuruyor. Bu betik her parçayı
   Babel'in kapsam çözümlemesiyle okuyup şunları çıkarıyor:
     - parçanın tanımladığı üst düzey adlar,
     - parçanın başka parçalardan kullandığı adlar (kapsamda bağlı olmayan her ad;
       tarayıcının kendi adları — window, Math, React... — hiçbir parçada
       tanımlı olmadığı için ayrı sayılıyor).

   Her başvuru iki türden biri:
     erken  — yükleme sırasında, bir işlevin DIŞINDA çalışıyor (üst düzey ifade,
              sınıf gövdesi...). Kullanılan ad, bu parçadan ÖNCE tanımlanmış olmalı.
     ertelen — bir işlevin İÇİNDE; ancak o işlev çağrılınca çalışıyor.

   CI'da (`node deps.js --check`) iki değişmez denetleniyor:
     1) hiçbir üst düzey ad iki parçada birden tanımlı değil (aynı adlı iki `function`
        sessizce birbirini ezer, `const` ise sözdizimi hatasıdır);
     2) hiçbir erken başvuru, kendinden SONRA gelen bir parçadaki adı kullanmıyor
        (yoksa o ad henüz tanımsızdır ya da TDZ hatası verir).
   İkincisi parça SIRASININ güvenli olduğunun kanıtı: yeni bir parça eklerken ya da
   sırayı değiştirirken bozulursa burada kırmızı olur, tarayıcıda beyaz sayfa değil.

   Çalıştırma:
     node deps.js            özet rapor
     node deps.js --check    değişmezleri denetle (CI)
     node deps.js --write    src/DEPENDENCIES.md'yi yeniden üret
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const { parser, traverse } = require('@babel/standalone').packages;
const trav = traverse.default || traverse;

const SRC = path.join(__dirname, 'src');

function load() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const parts = manifest.filter(p => p.startsWith('app/'));
  const chunks = parts.map(p => {
    const code = fs.readFileSync(path.join(SRC, p), 'utf8');
    const ast = parser.parse(code, { sourceType: 'script', plugins: ['jsx'] });
    const defs = new Set();
    const free = new Map();                       // ad -> {eager, deferred}
    trav(ast, {
      Program(pp) { Object.keys(pp.scope.bindings).forEach(n => defs.add(n)); },
      ReferencedIdentifier(pp) {
        const n = pp.node.name;
        if (pp.scope.getBinding(n)) return;       // yerel ya da bu parçanın üst düzey tanımı
        const e = free.get(n) || { eager: 0, deferred: 0 };
        if (pp.findParent(x => x.isFunction())) e.deferred++; else e.eager++;
        free.set(n, e);
      },
    });
    return { file: p, name: path.basename(p, '.jsx').replace(/^\d+-/, ''), defs, free };
  });

  const owner = new Map();
  const duplicates = [];
  chunks.forEach((c, i) => {
    for (const n of c.defs) {
      if (owner.has(n)) duplicates.push({ name: n, a: chunks[owner.get(n)].file, b: c.file });
      owner.set(n, i);
    }
  });

  const forwardEager = [];
  const externals = new Map();
  chunks.forEach((c, i) => {
    c.deps = new Map();                           // parça no -> adlar
    c.depsEager = new Set();
    for (const [n, e] of c.free) {
      if (!owner.has(n)) { externals.set(n, (externals.get(n) || 0) + e.eager + e.deferred); continue; }
      const o = owner.get(n);
      if (o === i) continue;
      if (!c.deps.has(o)) c.deps.set(o, []);
      c.deps.get(o).push(n);
      if (e.eager) {
        c.depsEager.add(o);
        if (o > i) forwardEager.push({ file: c.file, name: n, defined: chunks[o].file });
      }
    }
  });
  chunks.forEach(c => { c.fanIn = 0; });
  chunks.forEach(c => { for (const o of c.deps.keys()) chunks[o].fanIn++; });
  return { chunks, duplicates, forwardEager, externals };
}

// Güçlü bağlı bileşenler (Tarjan): birbirine döngüyle bağlı parça grupları.
function cycles(chunks) {
  let idx = 0; const st = []; const on = new Set(); const ix = new Map(); const low = new Map(); const out = [];
  const visit = v => {
    ix.set(v, idx); low.set(v, idx); idx++; st.push(v); on.add(v);
    for (const w of chunks[v].deps.keys()) {
      if (!ix.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), ix.get(w)));
    }
    if (low.get(v) === ix.get(v)) {
      const comp = []; let w;
      do { w = st.pop(); on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) out.push(comp.sort((a, b) => a - b));
    }
  };
  chunks.forEach((_, i) => { if (!ix.has(i)) visit(i); });
  return out;
}

function report(d) {
  const { chunks } = d;
  const cyc = cycles(chunks);
  const total = chunks.reduce((a, c) => a + c.defs.size, 0);
  const L = [];
  const nm = i => chunks[i].name;
  L.push('# src/app — bağımlılık haritası', '');
  L.push('> `node deps.js --write` ile üretildi. Anlık görüntü: parçalar arasındaki bağlar değiştikçe');
  L.push('> eskiyebilir; CI yalnızca aşağıdaki iki değişmezi denetliyor, bu belgenin güncelliğini değil.', '');
  L.push('## Değişmezler (CI denetliyor)', '');
  L.push(`- Üst düzey ad sayısı: **${total}**, yinelenen: **${d.duplicates.length}**`);
  L.push(`- Yükleme sırasında (erken) ileriye başvuru: **${d.forwardEager.length}**`, '');
  L.push('## Çekirdek parçalar (en çok bağlanılanlar)', '');
  L.push('Bunlara çok parça bağlı: ES modülüne ilk bunlar çevrilmeli, çünkü geri kalan her şey bunlara dayanıyor.', '');
  L.push('| Parça | Kaç parça ona bağlı | Kendisi kaç parçaya bağlı |', '|---|---:|---:|');
  [...chunks].sort((a, b) => b.fanIn - a.fanIn).slice(0, 10)
    .forEach(c => L.push(`| \`${c.name}\` | ${c.fanIn} | ${c.deps.size} |`));
  L.push('');
  const found = chunks.filter(c => [...c.deps.keys()].every(o => o <= 2) && c.deps.size <= 3 && c.fanIn <= 2 && c.defs.size > 0);
  L.push('## Bağımsız adaylar', '');
  L.push('Yalnızca çekirdek (ilk üç parça) ve en fazla 3 parçaya bağlı, kendisine en fazla 2 parça bağlı: modüle çevirmesi en kolay olanlar.', '');
  L.push(found.map(c => `\`${c.name}\``).join(', ') || '—', '');
  const fwd = [];
  chunks.forEach((c, i) => { for (const o of c.deps.keys()) if (o > i) fwd.push([i, o]); });
  L.push('## Geriye (ertelenmiş) bağlar ve döngüler', '');
  L.push('Parça, kendinden SONRA gelen bir parçadaki adı yalnızca bir işlevin içinde kullanıyorsa güvenli (işlev sonradan çağrılır) ama modüle çevirirken döngüsel `import` olur.', '');
  L.push(`- Geriye bağ sayısı: **${fwd.length}** / toplam bağ ${chunks.reduce((a, c) => a + c.deps.size, 0)}`);
  L.push(`- Döngüsel gruplar (karşılıklı bağlı parçalar): **${cyc.length}**` + (cyc.length ? ` — en büyüğü ${Math.max(...cyc.map(c => c.length))} parça` : ''), '');
  if (cyc.length) {
    cyc.forEach(g => L.push(`  - ${g.map(nm).map(x => '`' + x + '`').join(' ↔ ')}`));
    L.push('');
  }
  L.push('## Parça parça', '');
  L.push('| # | Parça | Tanım | Bağlı olduğu parçalar |', '|---:|---|---:|---|');
  chunks.forEach((c, i) => {
    const deps = [...c.deps.keys()].sort((a, b) => a - b)
      .map(o => '`' + nm(o) + '`' + (c.depsEager.has(o) ? '¹' : '') + (o > i ? '↑' : '')).join(', ');
    L.push(`| ${i + 1} | \`${c.name}\` | ${c.defs.size} | ${deps || '—'} |`);
  });
  L.push('', '¹ yükleme sırasında (erken) kullanıyor · ↑ kendinden sonra gelen parça (yalnızca işlev içinde kullanılıyor)', '');
  return L.join('\n');
}

function check(d) {
  let bad = 0;
  for (const x of d.duplicates) { console.error(`  HATA yinelenen üst düzey ad "${x.name}": ${x.a} ve ${x.b}`); bad++; }
  for (const x of d.forwardEager) {
    console.error(`  HATA ${x.file}: yükleme sırasında "${x.name}" kullanıyor ama o, kendinden SONRA gelen ${x.defined} içinde tanımlı`);
    bad++;
  }
  return bad === 0;
}

module.exports = { load, check, report, cycles };

if (require.main === module) {
  const d = load();
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(SRC, 'DEPENDENCIES.md'), report(d));
    console.log('src/DEPENDENCIES.md yazıldı');
  } else if (process.argv.includes('--check')) {
    if (!check(d)) { console.error('\nparça sırası ya da adlandırma değişmezleri bozuk (açıklama: deps.js başı)'); process.exit(1); }
    console.log(`  ok   ${d.chunks.length} parça: yinelenen ad yok, yükleme sırasında ileriye başvuru yok`);
  } else {
    console.log(report(d));
    check(d);
  }
}
