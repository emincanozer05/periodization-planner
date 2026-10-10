/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE WORKER SINAMASI — firebase-messaging-sw.js'in önbellek davranışı

   Worker olduğu gibi (kopyalanmadan) sahte bir service worker yüzeyinde (self,
   caches, fetch) çalıştırılıyor ve fetch dinleyicisine gerçek istekler veriliyor.
   Sınanan şey, dosyanın başındaki sözün kendisi: ÖNCE AĞ, kopya yalnızca emniyet
   kemeri; sağlık verisinin geçtiği hiçbir istek önbelleğe girmiyor.

   Çalıştırma:  node sw-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const assert = require('assert');

let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ── sahte tarayıcı yüzeyi ─────────────────────────────────────────────── */
class Res {
  constructor(body, status = 200, type = 'basic') { this.body = body; this.status = status; this.type = type; this.ok = status >= 200 && status < 300; }
  clone() { return new Res(this.body, this.status, this.type); }
}
class Req {
  constructor(url, init = {}) { this.url = url; this.method = init.method || 'GET'; this.mode = init.mode || 'no-cors';
    this.headers = { has: k => !!(init.headers && init.headers[k]) }; }
}

function makeWorld({ online = true, netDelay = 0 } = {}) {
  const stores = {};
  const caches = {
    async open(name) {
      const m = stores[name] || (stores[name] = new Map());
      const key = r => (typeof r === 'string' ? r : r.url);
      const strip = u => u.split('?')[0];
      return {
        async match(r, o) {
          const k = key(r);
          if (m.has(k)) return m.get(k);
          if (o && o.ignoreSearch) for (const [kk, v] of m) if (strip(kk) === strip(k)) return v;
          return undefined;
        },
        async put(r, res) { m.set(key(r), res); },
        async keys() { return [...m.keys()].map(url => ({ url })); },
        async delete(r) { return m.delete(key(r)); },
      };
    },
    async keys() { return Object.keys(stores); },
    async delete(n) { delete stores[n]; return true; },
    stores,
  };
  const world = { online, netDelay, calls: [], routes: {}, caches, noCors: false };
  const fetchFn = async r => {
    const url = typeof r === 'string' ? r : r.url;
    world.calls.push({ url, mode: r.mode });
    if (world.netDelay) await new Promise(res => setTimeout(res, world.netDelay));
    if (!world.online) throw new TypeError('Failed to fetch');
    if (world.noCors && r.mode === 'cors') throw new TypeError('CORS');
    const route = world.routes[url.split('?')[0]];
    const body = route === undefined ? 'net:' + url : route.body, status = route ? route.status : 200;
    // Gerçek tarayıcıdaki kural: başka kaynağa CORS'suz (no-cors) istek OPAK yanıt döner (durum 0).
    if (r.mode === 'no-cors' && !url.startsWith('https://coachos.test/') && world.opaque !== false) return new Res(body, 0, 'opaque');
    return new Res(body, status, r.mode === 'cors' ? 'cors' : 'basic');
  };

  const handlers = {};
  const self = {
    location: { origin: 'https://coachos.test', href: 'https://coachos.test/firebase-messaging-sw.js', pathname: '/firebase-messaging-sw.js' },
    addEventListener: (t, f) => { handlers[t] = f; },
    clients: { claim: async () => {}, matchAll: async () => [] },
    skipWaiting: () => {},
  };
  self.self = self;
  const importScripts = () => { throw new Error('offline'); };       // SDK yüklenemese de worker ayakta kalmalı
  const src = fs.readFileSync(__dirname + '/firebase-messaging-sw.js', 'utf8');
  new Function('self', 'caches', 'fetch', 'importScripts', 'Request', 'URL', 'setTimeout', 'clearTimeout', src)(
    self, caches, fetchFn, importScripts, Req, URL, setTimeout, clearTimeout);

  /* fetch olayını tetikle: respondWith çağrıldıysa yanıtı, çağrılmadıysa null döner. */
  world.fetchEvent = async req => {
    let responded, waits = [];
    const event = { request: req, respondWith: p => { responded = Promise.resolve(p); }, waitUntil: p => waits.push(p) };
    handlers.fetch(event);
    const res = responded ? await responded : null;
    await Promise.all(waits);
    return res;
  };
  world.handlers = handlers;
  return world;
}

const get = (u, init) => new Req(u, init);
const APP = 'https://coachos.test/';

/* ── sınamalar ─────────────────────────────────────────────────────────── */
test('worker, SDK yüklenemese de ayağa kalkıyor ve fetch dinliyor', async () => {
  const w = makeWorld();
  assert.ok(w.handlers.fetch && w.handlers.install && w.handlers.activate);
});

test('çevrimiçiyken uygulama sayfası SUNUCUDAN geliyor ve kopyası saklanıyor', async () => {
  const w = makeWorld();
  w.routes[APP + 'index.html'] = { body: 'v2' };
  const res = await w.fetchEvent(get(APP + 'index.html'));
  assert.strictEqual(res.body, 'v2');
  const hit = await (await w.caches.open('coachos-app-v1')).match(APP + 'index.html');
  assert.strictEqual(hit.body, 'v2');
});

test('çevrimiçiyken ESKİ kopya asla yeni sürümün önüne geçmiyor', async () => {
  const w = makeWorld();
  (await w.caches.open('coachos-app-v1')).put(APP + 'index.html', new Res('v1'));
  w.routes[APP + 'index.html'] = { body: 'v2' };
  const res = await w.fetchEvent(get(APP + 'index.html'));
  assert.strictEqual(res.body, 'v2');
});

test('ağ yokken kopya veriliyor (kök adres dâhil)', async () => {
  const w = makeWorld();
  w.routes[APP] = { body: 'shell' };
  await w.fetchEvent(get(APP));
  w.online = false;
  const res = await w.fetchEvent(get(APP));
  assert.strictEqual(res.body, 'shell');
});

test('ağ yokken ve kopya da yokken hata, olduğu gibi yukarı çıkıyor', async () => {
  const w = makeWorld({ online: false });
  await assert.rejects(() => w.fetchEvent(get(APP + 'index.html')), /Failed to fetch/);
});

test('ağ 5 saniyeden yavaşsa kopya veriliyor, kopya yoksa ağ bekleniyor', async () => {
  const w = makeWorld({ netDelay: 5200 });
  const cache = await w.caches.open('coachos-app-v1');
  await cache.put(APP + 'index.html', new Res('old'));
  const t0 = Date.now();
  const res = await w.fetchEvent(get(APP + 'index.html'));
  // fetchEvent waitUntil'i de bekliyor; yanıtın kendisi zaman aşımında dönmüş olmalı.
  assert.strictEqual(res.body, 'old');
  assert.ok(Date.now() - t0 >= 5000);
}, 15000);

test('hata yanıtları (404/500) kopya olarak SAKLANMIYOR', async () => {
  const w = makeWorld();
  w.routes[APP + 'index.html'] = { body: 'oops', status: 500 };
  await w.fetchEvent(get(APP + 'index.html'));
  const hit = await (await w.caches.open('coachos-app-v1')).match(APP + 'index.html');
  assert.strictEqual(hit, undefined);
});

test('Firestore, Auth, Cloud Function ve check-in istekleri DOKUNULMADAN ağa gidiyor', async () => {
  const w = makeWorld();
  for (const u of [
    'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?x=1',
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
    'https://us-central1-periodization-planner.cloudfunctions.net/x',
    'https://securetoken.googleapis.com/v1/token',
    APP + 'checkin.html', APP + 'wellness.html', APP + 'rpe.html', APP + 'api/crest',
  ]) {
    assert.strictEqual(await w.fetchEvent(get(u)), null, u);
  }
  assert.deepStrictEqual(Object.keys(w.caches.stores).length, 0);
});

test('POST ve Range istekleri dokunulmuyor', async () => {
  const w = makeWorld();
  assert.strictEqual(await w.fetchEvent(get(APP + 'index.html', { method: 'POST' })), null);
  assert.strictEqual(await w.fetchEvent(get(APP + 'index.html', { headers: { range: 'bytes=0-9' } })), null);
});

test('kütüphane: ilk istek CORS kipinde alınıp saklanıyor, sonrakinde kopya hemen veriliyor', async () => {
  const w = makeWorld();
  const u = 'https://unpkg.com/react@18/umd/react.production.min.js';
  w.routes[u] = { body: 'react1' };
  assert.strictEqual((await w.fetchEvent(get(u))).body, 'react1');
  assert.strictEqual(w.calls[0].mode, 'cors');                        // opak yanıt (kota) değil
  w.routes[u] = { body: 'react2' };
  assert.strictEqual((await w.fetchEvent(get(u))).body, 'react1');    // kopya hemen
  assert.strictEqual((await w.fetchEvent(get(u))).body, 'react2');    // arkada tazelenmişti
});

test('kütüphane çevrimdışıyken kopyadan açılıyor', async () => {
  const w = makeWorld();
  const u = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
  await w.fetchEvent(get(u));
  w.online = false;
  assert.ok((await w.fetchEvent(get(u))).body.startsWith('net:'));
});

test('liste dışı CDN adresleri ve gstatic\'in firebasejs dışı yolları dokunulmuyor', async () => {
  const w = makeWorld();
  assert.strictEqual(await w.fetchEvent(get('https://evil.example/x.js')), null);
  assert.strictEqual(await w.fetchEvent(get('https://www.gstatic.com/other/x.js')), null);
});

test('yazı tipi dosyaları (fonts/) uygulama kopyasına giriyor', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(APP + 'fonts/Archivo.woff2'));
  assert.ok(await (await w.caches.open('coachos-app-v1')).match(APP + 'fonts/Archivo.woff2'));
});

test('uyarı sayfası kendi kopyasına, uygulama ondan ayrı kopyaya gidiyor', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(APP + 'alerts.html'));
  assert.ok(await (await w.caches.open('coachos-alerts-v1')).match(APP + 'alerts.html'));
  assert.strictEqual(w.caches.stores['coachos-app-v1'], undefined);
});

test('activate: eski sürüm kopyaları siliniyor, güncel olanlar kalıyor', async () => {
  const w = makeWorld();
  for (const n of ['coachos-alerts-v0', 'coachos-app-v0', 'coachos-app-v1', 'coachos-libs-v1', 'baska-uygulama']) await w.caches.open(n);
  let p; w.handlers.activate({ waitUntil: x => { p = x; } });
  await p;
  assert.deepStrictEqual(Object.keys(w.caches.stores).sort(), ['baska-uygulama', 'coachos-app-v1', 'coachos-libs-v1']);
});

const MEDIA_URL = 'https://firebasestorage.googleapis.com/v0/b/periodization-planner.firebasestorage.app/o/users%2Fu1%2Fphotos%2F1_ab.jpg?alt=media&token=t1';

test('<img> medyası (Storage alt=media, CORS\'suz) aynen istenip OPAK olarak saklanıyor, çevrimdışıyken kopyadan geliyor', async () => {
  const w = makeWorld();
  const res = await w.fetchEvent(get(MEDIA_URL));              // sayfa ne istediyse: no-cors
  assert.strictEqual(res.type, 'opaque');
  assert.deepStrictEqual(w.calls.map(c => c.mode), ['no-cors']);   // CORS denemesi YOK: konsolda kırmızı hata çıkmaz
  w.online = false;
  const off = await w.fetchEvent(get(MEDIA_URL));
  assert.strictEqual(off.type, 'opaque');
});

test('medya kopyası varsa ağa hiç gidilmiyor (adres değişmez, eskimez)', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(MEDIA_URL));
  const n = w.calls.length;
  await w.fetchEvent(get(MEDIA_URL));
  assert.strictEqual(w.calls.length, n);
});

test('sayfa kodunun kendi CORS isteğine opak kopya VERİLMİYOR (reddedilirdi), ağdan gidiliyor', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(MEDIA_URL));                           // opak kopya var
  const n = w.calls.length;
  const res = await w.fetchEvent(get(MEDIA_URL, { mode: 'cors' }));
  assert.strictEqual(w.calls.length, n + 1);
  assert.strictEqual(res.type, 'cors');
});

test('kova ileride CORS verirse: sayfanın CORS yanıtı varsa o veriliyor', async () => {
  const w = makeWorld();
  const c = await w.caches.open('coachos-media-v1');
  await c.put(MEDIA_URL, new Res('cors-kopya', 200, 'cors'));
  const n = w.calls.length;
  assert.strictEqual((await w.fetchEvent(get(MEDIA_URL, { mode: 'cors' }))).body, 'cors-kopya');
  assert.strictEqual(w.calls.length, n);
});

test('Storage\'ın alt=media olmayan istekleri ve başka Storage adresleri dokunulmuyor', async () => {
  const w = makeWorld();
  const base = 'https://firebasestorage.googleapis.com/v0/b/b/o/x';
  assert.strictEqual(await w.fetchEvent(get(base)), null);                         // yükleme / meta veri
  assert.strictEqual(await w.fetchEvent(get(base + '?alt=json')), null);
  assert.strictEqual(await w.fetchEvent(get('https://storage.googleapis.com/b/x?alt=media')), null);
  assert.strictEqual(await w.fetchEvent(get('https://drive.google.com/thumbnail?id=1')), null);
  assert.strictEqual(w.caches.stores['coachos-media-v1'], undefined);
});

test('hata yanıtı (404) saklanmıyor', async () => {
  const w = makeWorld();
  w.opaque = false;                                             // bu kova yanıtı okunabilir bir 404 döndürüyor
  w.routes[MEDIA_URL.split('?')[0]] = { body: 'yok', status: 404 };
  await w.fetchEvent(get(MEDIA_URL));
  assert.strictEqual(w.caches.stores['coachos-media-v1'] && (await (await w.caches.open('coachos-media-v1')).keys()).length, 0);
});

test('medya kopyası 150 ile sınırlı: en eskiler atılıyor', async () => {
  const w = makeWorld();
  for (let i = 0; i < 153; i++) await w.fetchEvent(get(MEDIA_URL.replace('1_ab', 'p' + i)));
  const keys = await (await w.caches.open('coachos-media-v1')).keys();
  assert.strictEqual(keys.length, 150);
  assert.ok(!keys.some(k => k.url.includes('%2Fp0.jpg')) && keys.some(k => k.url.includes('%2Fp152.jpg')));
});

test('çıkışta (clear-media mesajı) saklanan sporcu fotoğrafları siliniyor, başkası değil', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(MEDIA_URL));
  await w.fetchEvent(get(APP + 'index.html'));
  let p; w.handlers.message({ data: { coachos: 'clear-media' }, waitUntil: x => { p = x; } });
  await p;
  assert.strictEqual(w.caches.stores['coachos-media-v1'], undefined);
  assert.ok(w.caches.stores['coachos-app-v1']);
  w.handlers.message({ data: { baska: 1 }, waitUntil: () => { throw new Error('dokunmamalıydı'); } });   // başka mesajlar
});

test('drop-media: bozuk kopya siliniyor ve sayfaya bildiriliyor; Storage dışı adres dokunulmuyor', async () => {
  const w = makeWorld();
  await w.fetchEvent(get(MEDIA_URL));
  await w.fetchEvent(get(APP + 'index.html'));
  const ask = async url => {
    let p, got; const port = { postMessage: m => { got = m; } };
    w.handlers.message({ data: { coachos: 'drop-media', url }, ports: [port], waitUntil: x => { p = x; } });
    if (p) await p;
    return got;
  };
  assert.deepStrictEqual(await ask(MEDIA_URL), { dropped: true });
  assert.strictEqual((await (await w.caches.open('coachos-media-v1')).keys()).length, 0);
  assert.deepStrictEqual(await ask(MEDIA_URL), { dropped: false });             // kopya yok: yeniden deneme yok
  assert.deepStrictEqual(await ask(APP + 'index.html'), { dropped: false });    // uygulama dosyası değil medya
  assert.ok((await (await w.caches.open('coachos-app-v1')).keys()).length);
  assert.deepStrictEqual(await ask('kotu adres'), { dropped: false });
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); passed++; console.log('  ok   ' + name); }
    catch (e) { failed++; console.error('  HATA ' + name + '\n       ' + (e && e.message)); }
  }
  console.log(`\n${passed} geçti, ${failed} kaldı`);
  process.exit(failed ? 1 : 0);
})();
