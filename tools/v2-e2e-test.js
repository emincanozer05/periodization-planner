#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   YENİ SENKRON — UÇTAN UCA (senkron Faz 3/4 öncesi)

   GERÇEK uygulama (dist/), GERÇEK tarayıcı (Chromium), Firestore EMULATOR'ü ve gerçek
   firestore.rules ile bir hesabın eski düzenden yeni yapıya taşınmasını ve iki cihazın yeni
   yapıda birlikte çalışmasını sınar:

     1. Cihaz A eski düzende açılır, veri girer; eski senkron buluta yazar.
     2. A'da pilot taşıma (senkron tanı penceresi → "Yeni senkrona geç") çalışır:
        yedek → taşıma → doğrulama → eski yapının kilidi → işaret.
     3. A kendiliğinden yeni yapıya geçer; düzenleme yalnızca kendi belgesini yazar,
        eski yapıya hiçbir şey yazılmaz.
     4. Cihaz B açılır, A'nın düzenlemesini görür; B düzenler, A görür; ikisi AYNI ANDA farklı
        alanları düzenler → iki ekranda da ikisi.
     5. Taşınmış hesapta bütün sekmeler hatasız açılır.

   Çalıştırma (emulator'ü kendisi açıp kapatır):
     node build.js && cd rules-test && npx firebase emulators:exec --config ../firebase.json \
       --only firestore --project periodization-planner "node ../tools/v2-e2e-test.js"
   CI'da çalışmaz (Chromium + npm kütüphaneleri ister); senkronu değiştiren işlerde elle.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ROUTES, FAKE_AUTH, libFile, playwright } = require('./smoke-test.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const EMU = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [EH, EP] = EMU.split(':');
const UID = 'smoke-user';   // smoke-test.js'teki sahte oturumun kimliği
const RUT = require(path.join(ROOT, 'rules-test', 'node_modules', '@firebase', 'rules-unit-testing'));

let pass = 0, fail = 0;
const check = (name, ok, detail) => { if (ok) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 20000, step = 250) {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < ms) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await sleep(step); }
  return null;
}

/* Sayfadaki uygulamanın durumuna kanca (sync-loop-test.js ile aynı yöntem). */
const HOOKS = () => {
  const root = document.getElementById('root');
  const k = Object.keys(root).find(k => k.startsWith('__reactContainer'));
  const fr = root[k].stateNode;
  const walk = f => { for (; f; f = f.sibling) { if (f.type && f.type.name === 'App') return f; const r = walk(f.child); if (r) return r; } return null; };
  window.__cur = () => { const app = walk(fr.current.child); for (let h = app && app.memoizedState; h; h = h.next) if (h.memoizedState && h.memoizedState.teams) return h; return null; };
  window.__setData = __cur().queue.dispatch;
  window.__data = () => __cur().memoizedState;
};
const SEED = () => {
  const t = makeDefaultTeam(); t.id = 'T1'; t.setup.teamName = 'E2E Takım';
  t.athletes = [0, 1, 2].map(k => ({ id: 'a' + k, name: 'Sporcu ' + k, position: 'PG', tests: [{ id: 't' + k, date: '2026-11-01', cmj: 40 + k }],
    injuries: [], measurements: [], wellness: [{ date: '2026-11-10', sleep: 4 }], srpeLog: [], days: {} }));
  const d = '2026-11-12';
  t.days[d] = { date: d, dailyNotes: '', sessions: [{ id: 's1', name: 'Kuvvet', time: '10:00', duration: 60, athletes: [], blocks: [] }] };
  __setData(prev => migrate({ ...prev, teams: [t], activeTeamId: 'T1', exercises: [{ id: 'e1', name: 'Squat' }] }));
};

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html yok: önce `node build.js`');
  const env = await RUT.initializeTestEnvironment({ projectId: 'periodization-planner',
    firestore: { host: EH, port: Number(EP), rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') } });
  await env.clearFirestore();
  const admin = async fn => { let r; await env.withSecurityRulesDisabled(async c => { r = await fn(c.firestore()); }); return r; };
  const get = p => admin(db => db.doc(p).get().then(s => s.exists ? s.data() : null));

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
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const errors = [];
  const open = async name => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(([h, p, uid]) => { window.__COACHOS_EMU = { host: h, port: Number(p), mockUserToken: { sub: uid, user_id: uid } }; }, [EH, EP, UID]);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message.slice(0, 200)));
    page.on('dialog', d => d.accept());
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin) || url.includes(EH + ':' + EP) || url.includes('localhost:' + EP)) return route.continue();
      for (const [re, key] of ROUTES) if (re.test(url)) return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: body(key) });
      return route.abort();
    });
    await page.goto(origin + '/index.html?v2pilot=1', { waitUntil: 'load' });
    await page.waitForSelector('.nav-item', { timeout: 45000 });
    await page.waitForTimeout(800);
    await page.evaluate(HOOKS);
    return page;
  };
  const data = pg => pg.evaluate(() => JSON.parse(JSON.stringify(__data())));
  const ath = (d, id) => d.teams[0].athletes.find(a => a.id === id);
  const logHas = (pg, re) => pg.evaluate(s => new RegExp(s).test(slogText()), re.source);
  const edit = (pg, fnSrc) => pg.evaluate(src => { __setData(prev => { const d = JSON.parse(JSON.stringify(prev)); (new Function('d', src))(d); return d; }); }, fnSrc);

  try {
    console.log('\n== 1. eski düzen: A veri girer, eski senkron yazar');
    const A = await open('A');
    await A.evaluate(`(${SEED.toString()})()`);
    const m0 = await until(async () => { const m = await get('kullanici_verileri/' + UID); return m && m.rev >= 1 && m; }, 30000);
    check('eski manifest yazıldı', !!m0, 'manifest yok');
    check('A eski düzende (yeni yapı etkin değil)', !(await logHas(A, /v2: yeni yapı etkin/)));
    await until(() => A.evaluate(() => /Synced|Senkronize/.test(document.querySelector('.sync-txt b')?.innerText || '')), 20000);

    console.log('\n== 2. pilot taşıma (tanı penceresi → Yeni senkrona geç)');
    await A.locator('.sync-chip').first().click();
    await A.getByRole('button', { name: /Switch to new sync|Yeni senkrona geç/ }).click();
    const done = await until(() => A.evaluate(() => [...document.querySelectorAll('pre')].map(p => p.innerText).find(t => /DONE|TAMAMLANDI|not completed|tamamlanmadı/.test(t))), 30000);
    check('taşıma tamamlandı', !!done && /DONE|TAMAMLANDI/.test(done), done || 'sonuç yok');
    const ws = await get('workspaces/' + UID);
    check('çalışma alanı: migrated=true, schemaVersion=2, sahip', ws && ws.migrated === true && ws.schemaVersion === 2 && ws.ownerUid === UID, JSON.stringify(ws));
    const m1 = await get('kullanici_verileri/' + UID);
    check('eski manifest kilitli (migratedTo)', m1 && m1.migratedTo === 'workspaces/' + UID, JSON.stringify(m1 && { rev: m1.rev, migratedTo: m1.migratedTo }));
    const onV2 = await until(() => logHas(A, /v2: yeni yapı etkin/), 15000);
    check('A kendiliğinden yeni yapıya geçti', !!onV2);
    await A.keyboard.press('Escape').catch(() => {});

    console.log('\n== 3. yeni yapıda düzenleme: yalnızca kendi belgesi, eski yapıya yazım yok');
    const revBefore = (await get('kullanici_verileri/' + UID)).rev;
    await edit(A, "d.teams[0].athletes.find(a=>a.id==='a1').position='C';");
    const doc1 = await until(async () => { const x = await get(`workspaces/${UID}/teams/T1/athletes/a1`); return x && x.position === 'C' && x; });
    check('A\'nın düzenlemesi sporcunun belgesine yazıldı', !!doc1);
    check('yazanın kimliği belgede (_by)', doc1 && doc1._by === UID, doc1 && doc1._by);
    await sleep(1500);
    check('eski manifest değişmedi (eski senkron durdu)', (await get('kullanici_verileri/' + UID)).rev === revBefore);

    console.log('\n== 4. iki cihaz');
    const B = await open('B');
    const bSaw = await until(async () => { const d = await data(B); return d.teams && ath(d, 'a1') && ath(d, 'a1').position === 'C'; }, 20000);
    check('B açılınca A\'nın düzenlemesini görüyor', !!bSaw);
    check('B de yeni yapıda', await logHas(B, /v2: yeni yapı etkin/));
    await edit(B, "d.teams[0].athletes.find(a=>a.id==='a2').name='B yazdı';");
    check('B\'nin düzenlemesi A\'ya geldi', !!(await until(async () => ath(await data(A), 'a2').name === 'B yazdı')));
    await Promise.all([
      edit(A, "d.teams[0].athletes.find(a=>a.id==='a0').name='A adı'; d.exercises[0].name='Squat A';"),
      edit(B, "d.teams[0].athletes.find(a=>a.id==='a0').position='SF'; d.teams[0].days['2026-11-12'].sessions[0].duration=90;"),
    ]);
    const both = d => ath(d, 'a0').name === 'A adı' && ath(d, 'a0').position === 'SF' && d.exercises[0].name === 'Squat A' && d.teams[0].days['2026-11-12'].sessions[0].duration === 90;
    check('AYNI ANDA iki cihaz → A\'da ikisi de var', !!(await until(async () => both(await data(A)))));
    check('AYNI ANDA iki cihaz → B\'de ikisi de var', !!(await until(async () => both(await data(B)))));
    {
      const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
      const diff = (x, y, p = '') => { if (canon(x) === canon(y)) return null; if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return p + ': ' + canon(x).slice(0, 120) + ' ≠ ' + canon(y).slice(0, 120);
        for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) { const r = diff(x[k], y[k], p + '.' + k); if (r) return r; } return p + ' (sıra)'; };
      const da = await data(A), db = await data(B);
      const d1 = diff(da.teams, db.teams);
      check('iki ekran birebir aynı (alan sırasından bağımsız)', !d1, d1);
    }

    console.log('\n== 5. taşınmış hesapta bütün sekmeler');
    // Tanı penceresi A'da açık kaldı; sekmeler B'de gezilir (o da taşınmış hesapta).
    const navs = await B.$$eval('.nav-item', els => els.map(e => e.innerText.trim().split('\n')[0]));
    for (let i = 0; i < navs.length; i++) { await B.locator('.nav-item').nth(i).click(); await B.waitForTimeout(500); }
    check(navs.length + ' sekme gezildi, sayfa hatası yok', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) {
    fail++; console.log('  FAIL beklenmeyen hata: ' + (e && e.stack || e));
  } finally {
    await browser.close(); srv.close(); await env.cleanup();
  }
  console.log('\n' + '─'.repeat(64) + '\n  ' + pass + ' geçti, ' + fail + ' kaldı');
  process.exit(fail ? 1 : 0);
})();
