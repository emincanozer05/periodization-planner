/* ═══════════════════════════════════════════════════════════════════════════
   SENKRON DÖNGÜ SINAMASI — "kendiliğinden yazım" döngülerini ve bellek büyümesini yakalar

   Neden var: faz bankası iki cihaz arasında gidip gelen bir yazım döngüsüne girdi; her tur
   bütün durumu buluta yazdı ve sekme saatler sonra "Out of Memory" ile çöktü (#701). Böyle
   bir döngü tek cihazda görünmez, birim sınamasında da görünmez: ancak İKİ cihaz aynı anda
   açıkken, birinin yazdığını öbürü görüp yeniden yazınca ortaya çıkar. Bu betik o anı gerçek
   uygulamayla, gerçek Chromium'da canlandırır.

   Ne yapar (dist/ altındaki GERÇEK site, Firebase ağı kapalı, sahte oturum — smoke-test gibi):
     1. Tek cihaz   — gerçekçi veriyle (12 sporcu, 4 haftalık seanslar, wellness, sRPE, testler,
                      Bireyselleştirme kartları) her sekme açılır, kartlar açılır, sayfa boşta
                      bekletilir. Koç dokunmadan veri DEĞİŞMEMELİ.
     2. Bellek      — bütün sekmeler üç kez gezilir; çöp toplandıktan sonraki yığın büyümemeli.
     3. İki cihaz   — iki sayfa aynı sekmede; birinin durumu öbürüne "senkronla gelmiş gibi"
                      uygulanır, sonra tersi. Alan cihaz, gelen hâle karşılık kendiliğinden
                      YAZMAMALI (ilk tur hariç: ilk karşılaşmada türetilen bir yazım olabilir).
     4. #701        — aynı sporcu, aynı gün, iki ayrı seans iki cihazda açık (faz bankası
                      döngüsünün birebir senaryosu).

   Bulunan döngü "DÖNGÜ" diye, sekme adıyla basılır ve betik 1 ile çıkar. CI'da çalışmaz
   (Chromium ve npm erişimi ister); senkronu ya da veriyi kendiliğinden güncelleyen bir özelliği
   (useEffect içinden setData / updateTeam) değiştiren her PR'dan önce elle çalıştır:

     node build.js && node tools/sync-loop-test.js        [--dist klasör]  [--quick: 3. bölümü atla]

   Sınırı: gerçek Firestore yok. "Senkron" burada durumun bir sayfadan öbürüne olduğu gibi
   aktarılmasıdır (uzak hâlin uygulanması); Firestore SDK'nın kendi belleği ölçülmez.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ROUTES, FAKE_AUTH, libFile, playwright } = require('./smoke-test.js');

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DIST = path.resolve(opt('--dist') || path.join(__dirname, '..', 'dist'));
const IDLE_MS = 6000, SETTLE_MS = 2500, ROUNDS = 4, HEAP_GROWTH_MB = 15;

/* Gerçekçi bir takım: sayfada çalışır (uygulamanın kendi fmt/addD/makeDefaultTeam'i ile). */
const SEED = () => {
  const D = n => fmt(addD(today, n));
  const exs = ['Back Squat', 'RDL', 'Bench Press', 'Pull Up', 'Hip Airplane', 'Box Jump', 'Split Squat', 'Plank', 'Nordic Curl', 'Band Pull Apart', 'Copenhagen', 'Push Press'];
  const exercises = exs.map((n, i) => ({ id: 'e' + i, name: n, type: '', subType: '', pattern: '', movePattern: '', contra: [], difficulty: '', muscle: [], videoUrl: '', videoData: '', thumb: '', purpose: '' }));
  const athletes = [];
  for (let k = 0; k < 12; k++) {
    const a = { id: 'a' + k, name: 'Sporcu ' + k, dateOfBirth: '2004-0' + (1 + k % 9) + '-10', position: ['PG', 'SG', 'SF', 'PF', 'C'][k % 5], trainingAge: 4, levelTag: '', constraintTags: [],
      tests: [-60, -30, -2].map(o => ({ date: D(o), height: 190 + k, weight: 85 + k, cmj: 40 + k + o / 30, ohs: { score: 2, problems: [] }, aslr: { right: 2, left: 3 }, ankleDF: { right: 38, left: 40 }, yBalance: {}, circ: {}, posture: {} })),
      wellness: [], srpeLog: [], injuries: k % 4 === 0 ? [{ id: 'i' + k, location: 'knee', status: 'Active', date: D(-10), restrictions: '' }] : [], days: {}, goals: '', measurements: [] };
    for (let o = -21; o <= 0; o++) {
      a.wellness.push({ date: D(o), readiness: 3 + (k + o) % 3 * 0.5, sleep: 4, fatigue: 3, soreness: 3, stress: 4, mood: 4 });
      a.srpeLog.push({ id: 'r' + k + '_' + o, srcId: null, sessionId: null, date: D(o), tpRPE: '', tpDuration: '', tpLoad: '', scRPE: 6, scDuration: 60, scLoad: 360, gameRPE: '', gameDuration: '', gameLoad: '', totalLoad: 360 });
    }
    athletes.push(a);
  }
  const ids = n => athletes.slice(0, n).map(a => a.id);
  const days = {};
  for (let o = -14; o <= 14; o++) {
    const dk = D(o);
    days[dk] = { date: dk, dailyNotes: '', sessions: [
      { id: 'ts' + o, name: 'Kuvvet', time: '10:00', duration: '60', type: 'strength', athletes: ids(8), sRPE: '', au: '',
        blocks: [{ name: 'Ana', exercises: [{ name: 'Back Squat', sets: '4', reps: '5', load: '80' }, { name: 'RDL', sets: '3', reps: '8' }] }] },
      // Bugün aynı sporculara ikinci bir seans: #701'in (aynı sporcu, aynı gün, iki seans) zemini.
      ...(o === 0 ? [{ id: 'tp0', name: 'Kuvvet PM', time: '17:00', duration: '60', type: 'strength', athletes: ids(4), sRPE: '', au: '',
        blocks: [{ name: 'Ana', exercises: [{ name: 'Bench Press', sets: '3', reps: '6' }] }] }] : []),
      ...(o % 3 === 0 ? [{ id: 'tb' + o, name: 'Saha', time: '19:00', duration: '90', type: 'ball', athletes: [], blocks: [] }] : []) ] };
  }
  const t = makeDefaultTeam(); t.id = 'T1'; t.athletes = athletes; t.days = days;
  t.setup.competitions = [{ date: D(5), name: 'Maç 1' }, { date: D(12), name: 'Maç 2' }];
  const instr = rows => ({ phases: [{ id: 'p1', name: '', preset: 'prep' }, { id: 'p2', name: '', preset: 'main' }],
    patterns: rows.map((x, i) => ({ id: '', phase: i % 2 ? 'p2' : 'p1', exercise: x, sets: '3', reps: '8' })) });
  const ai = {};
  athletes.slice(0, 4).forEach(a => {
    ai[diReviewKey('team:' + D(0) + ':ts0', a.id, D(0))] = { instr: instr(['Hip Airplane', 'Back Squat']) };
    ai[diReviewKey('team:' + D(0) + ':tp0', a.id, D(0))] = { instr: instr(['Band Pull Apart', 'Bench Press']) };
  });
  t.indiv = { ai };
  return JSON.stringify({ activeTeamId: 'T1', teams: [t], templates: [], exercises });
};

/* Sayfaya, uygulamanın veri durumunu okuyup yazan kancalar kurar: __cur() güncel hâli,
   __setData uygulamanın kendi setData'sını, __cnt durumun kaç kez değiştiğini verir. */
const HOOKS = () => {
  const root = document.getElementById('root');
  const k = Object.keys(root).find(k => k.startsWith('__reactContainer'));
  const fr = root[k].stateNode;
  const walk = f => { for (; f; f = f.sibling) { if (f.type && f.type.name === 'App') return f; const r = walk(f.child); if (r) return r; } return null; };
  window.__cur = () => { const app = walk(fr.current.child); for (let h = app && app.memoizedState; h; h = h.next) if (h.memoizedState && h.memoizedState.teams) return h; return null; };
  window.__setData = __cur().queue.dispatch;
  // Ağ kapalı: "sunucuya hiç ulaşılamadı → sayfayı yenile" koruması sınamayı bölmesin.
  window.__fsSwitchTransport = () => false;
  window.__cnt = 0; let last = null;
  setInterval(() => { const h = __cur(); const st = h && h.memoizedState; if (st && st !== last) { last = st; window.__cnt++; } }, 5);
};

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error(DIST + '/index.html yok: önce `node build.js`');
  const { chromium } = playwright();
  const cache = {};
  const body = key => cache[key] || (cache[key] = Buffer.concat([fs.readFileSync(libFile(key)), Buffer.from(key === 'fbauth' ? FAKE_AUTH : '')]));
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(DIST, u);
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('content-type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream');
    r.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(0, r));
  const origin = 'http://localhost:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--js-flags=--expose-gc'] });
  const errors = [];
  const open = async name => {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' })).newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message.slice(0, 200)));
    page.on('dialog', d => d.accept());
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      for (const [re, key] of ROUTES) if (re.test(url)) return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: body(key) });
      return route.abort();
    });
    await page.goto(origin + '/index.html', { waitUntil: 'load' });
    await page.waitForSelector('.nav-item', { timeout: 45000 });
    await page.waitForTimeout(1000);
    await page.evaluate(HOOKS);
    return page;
  };
  /* "Senkronla gelen hâl": uzak durum olduğu gibi uygulanır (cihaza özgü seçili takım korunur). */
  const apply = (pg, json) => pg.evaluate(js => { const o = JSON.parse(js); window.__setData(prev => migrate({ ...o, activeTeamId: prev.activeTeamId || o.activeTeamId })); }, json);
  const state = pg => pg.evaluate(() => JSON.stringify(__cur().memoizedState));
  const count = pg => pg.evaluate(() => window.__cnt);
  const openCards = async pg => {
    const cards = pg.locator('.iv-card:not(.open) .iv-card-hd');
    const n = Math.min(await cards.count(), 4);
    for (let c = 0; c < n; c++) await cards.first().click().catch(() => {});
  };
  let bad = 0;

  const A = await open('A');
  const seed = await A.evaluate(`(${SEED.toString()})()`);
  await apply(A, seed); await A.waitForTimeout(1500);
  const navs = await A.$$eval('.nav-item', els => els.map(e => e.innerText.trim().split('\n')[0]));
  const cdp = await A.context().newCDPSession(A);
  const heap = async () => { await A.evaluate(() => window.gc && window.gc()); return (await cdp.send('Runtime.getHeapUsage')).usedSize / 1e6; };

  console.log(`\n== 1. tek cihaz: her sekme açılıp ${IDLE_MS / 1000} sn boşta bekletilir — koç dokunmadan veri değişmemeli`);
  for (let i = 0; i < navs.length; i++) {
    await A.locator('.nav-item').nth(i).click();
    await A.waitForTimeout(SETTLE_MS); await openCards(A); await A.waitForTimeout(SETTLE_MS);
    const c0 = await count(A); await A.waitForTimeout(IDLE_MS); const n = await count(A) - c0;
    if (n) bad++;
    console.log(`  ${n ? 'DÖNGÜ' : 'ok   '} ${navs[i].padEnd(24)} boşta değişim=${n}`);
  }

  console.log('\n== 2. bellek: bütün sekmeler üç kez gezilir — yığın büyümemeli');
  const h0 = await heap(); let h = h0;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < navs.length; i++) { await A.locator('.nav-item').nth(i).click(); await A.waitForTimeout(400); }
    h = await heap();
    console.log(`  tur ${r + 1}: ${h.toFixed(1)} MB (başlangıç ${h0.toFixed(1)} MB)`);
  }
  if (h - h0 > HEAP_GROWTH_MB) { bad++; console.log(`  BÜYÜME ${(h - h0).toFixed(1)} MB > ${HEAP_GROWTH_MB} MB`); }

  /* İki sayfa arasında ROUNDS tur gidip gelme; alanın, gelen hâlin uygulanması (1 değişim)
     dışında kendiliğinden kaç kez yazdığı sayılır. İlk tur türetilen bir yazıma izin verir. */
  const exchange = async (P, Q) => {
    const extra = []; let from = P, to = Q;
    for (let r = 0; r < ROUNDS; r++) {
      const s = await state(from); const c0 = await count(to);
      await apply(to, s); await to.waitForTimeout(SETTLE_MS);
      extra.push(await count(to) - c0 - 1);
      [from, to] = [to, from];
    }
    return extra;
  };
  const B = await open('B');
  await apply(B, await state(A)); await B.waitForTimeout(1000);

  if (!argv.includes('--quick')) {
    console.log(`\n== 3. iki cihaz: her sekmede durum ${ROUNDS} tur karşılıklı aktarılır — alan cihaz kendiliğinden yazmamalı`);
    for (let i = 0; i < navs.length; i++) {
      for (const pg of [A, B]) await pg.locator('.nav-item').nth(i).click();
      await A.waitForTimeout(SETTLE_MS);
      for (const pg of [A, B]) await openCards(pg);
      await A.waitForTimeout(SETTLE_MS);
      const extra = await exchange(A, B);
      const loop = extra.slice(1).some(x => x > 0);
      if (loop) bad++;
      console.log(`  ${loop ? 'DÖNGÜ' : 'ok   '} ${navs[i].padEnd(24)} tur başına ek yazım=${extra.join(',')}`);
    }
  }

  console.log('\n== 4. #701: aynı sporcu, aynı gün, iki seans iki cihazda açık (Bireyselleştirme)');
  const iv = navs.findIndex(n => /INDIVIDUAL|BİREYSEL/i.test(n));
  for (const [pg, sesId] of [[A, 'ts0'], [B, 'tp0']]) {
    await pg.locator('.nav-item').nth(iv).click(); await pg.waitForTimeout(800);
    await pg.evaluate(id => { const s = document.querySelector('.iv-wrap select'); const o = [...s.options].find(o => o.value.endsWith(':' + id));
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true })); }, sesId);
    await pg.waitForTimeout(800); await openCards(pg);
  }
  await A.waitForTimeout(SETTLE_MS);
  const src = await Promise.all([A, B].map(pg => pg.evaluate(() => document.querySelector('.iv-wrap select').value.split(':').pop())));
  const extra = await exchange(A, B);
  const loop = extra.slice(1).some(x => x > 0);
  if (loop) bad++;
  console.log(`  ${loop ? 'DÖNGÜ' : 'ok   '} A=${src[0]} B=${src[1]}  tur başına ek yazım=${extra.join(',')}`);
  if (src[0] === src[1]) { bad++; console.log('  HATA iki cihaz aynı seansta kaldı — senaryo kurulamadı'); }

  errors.forEach(e => { console.log('  HATA ' + e); bad++; });
  await browser.close(); srv.close();
  console.log(bad ? `\n${bad} sorun` : '\nhepsi temiz');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
