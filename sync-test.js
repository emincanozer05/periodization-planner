/* ═══════════════════════════════════════════════════════════════════════════
   SENKRON DENETİMİ — bulut senkronunun kilitlenmediğini kanıtlar

   "Gösterge sarıda kalıyor" bu depoda defalarca geri geldi ve her seferinde
   sebebi başkaydı: bir keresinde dinleyici uyanmıyordu, bir keresinde yazım
   kilidi hiç açılmıyordu, bir keresinde taşıma katmanı o ağda geçmiyordu.
   Ortak yanları şu: HEPSİ ancak GERÇEK bir cihazda, gerçek bir ağın bozulduğu
   anda ortaya çıkıyor — yani kimsenin elinde tutup deneyemediği bir yerde.

   Bu betik o anı masaya getiriyor. index.html içindeki senkron modülünü OLDUĞU
   GİBİ (kopyalamadan, tek satırını değiştirmeden) alıp sahte bir Firestore'a
   bağlıyor, sonra bağlantıyı bilerek bozuyor: onay hiç gelmiyor, dinleyici
   ölüyor, sunucuya hiç ulaşılamıyor. Her senaryoda sorulan soru tek:
   CİHAZ KENDİNİ KURTARIYOR MU?

   Kurulum gerekmiyor — ne React ne başka bir paket. Modülün kullandığı üç hook
   (useState/useEffect/useRef) aşağıda birkaç satırda karşılanıyor; senkronun
   kendi kodu hiç taklit edilmiyor, asıl sınanan o.

   Çalıştırma:  node sync-test.js
   Başka bir sürümü sınamak için:  SYNCTEST_ROOT=/bir/klasör node sync-test.js
   (o klasördeki index.html okunur — bir düzeltmenin gerçekten bir şeyi
    değiştirdiğini, eski sürümü aynı senaryolardan geçirerek görmek için.)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

/* ─── minik hook çalıştırıcısı ────────────────────────────────────────────
   Senkron modülü yalnızca useState, useEffect ve useRef kullanıyor. React'in
   tamamını depoya indirmektense üçünü burada karşılıyoruz. Davranış React'le
   aynı: state değişince bileşen yeniden çalışır, efektler bağımlılıkları
   değiştiğinde (önce temizlik, sonra yenisi) yeniden kurulur. */
function mountHook(render) {
  const hooks = [];
  let i = 0, mounted = true, queued = false;
  const pass = () => {
    i = 0;
    const out = render();
    // Efektler render'dan SONRA koşar — React'teki sıra bu.
    for (const h of hooks) {
      if (h.kind !== 'effect' || !h.dirty) continue;
      h.dirty = false;
      if (h.cleanup) { try { h.cleanup(); } catch (e) {} h.cleanup = null; }
      const c = h.fn();
      h.cleanup = typeof c === 'function' ? c : null;
    }
    return out;
  };
  const schedule = () => {
    if (queued || !mounted) return;
    queued = true;
    setTimeout(() => { queued = false; if (mounted) pass(); }, 0);
  };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, k) => Object.is(v, b[k]));
  globalThis.useState = init => {
    const h = hooks[i++] || (hooks[i - 1] = { kind: 'state', v: typeof init === 'function' ? init() : init });
    const set = nv => {
      const next = typeof nv === 'function' ? nv(h.v) : nv;
      if (Object.is(next, h.v)) return;
      h.v = next; schedule();
    };
    return [h.v, set];
  };
  globalThis.useRef = init => hooks[i++] || (hooks[i - 1] = { kind: 'ref', current: init });
  globalThis.useEffect = (fn, deps) => {
    const h = hooks[i++] || (hooks[i - 1] = { kind: 'effect', deps: null, cleanup: null, first: true });
    if (h.first || !deps || !same(deps, h.deps)) { h.dirty = true; h.fn = fn; h.deps = deps; }
    h.first = false;
  };
  pass();
  return { rerender: pass, unmount() { mounted = false; for (const h of hooks) if (h.cleanup) { try { h.cleanup(); } catch (e) {} } } };
}

/* ─── sahte Firestore ─────────────────────────────────────────────────────
   Gerçeğinin bu senaryolar için önemli olan üç huyunu taşır:
     • yazım ÖNCE yerel kopyaya işlenir, sunucu onayı AYRI gelir (kalıcı önbellek),
     • her anlık görüntü kaynağını söyler (önbellek mi sunucu mu, bekleyen yazım var mı),
     • onay hiç gelmeyebilir — commit'in sözü sonsuza kadar sonuçlanmayabilir. */
function fakeFirestore() {
  const docs = new Map();
  const subs = [];
  const held = [];      // onayı bekletilen commit'ler
  const api = {
    ack: true,          // commit sunucu onayı veriyor mu
    serverSnaps: true,  // anlık görüntüler sunucudan mı geliyor (false → hep önbellek)
    holdSnap: false,    // ilk anlık görüntüyü tut (cihaz henüz "hazır" olamasın)
    commits: 0, listens: 0, hung: 0,
    now: () => ({ toMillis: () => Date.now() }),
    /* Ağ geri geldi. Gerçeğinde de olan bu: bekleyen yazımlar kuyruktan çıkıp onaylanır —
       cihaz yeni bir tur açmayı beklemek zorunda kalmaz. */
    recover() { api.ack = true; held.splice(0).forEach(r => r()); api.emit({}); },
  };
  const snapshotOf = (uid, opts) => {
    const rows = [...docs.entries()].filter(([, v]) => v.userId === uid);
    const changes = rows.map(([id, v]) => ({ type: 'added', doc: { id, data: () => v } }));
    return {
      metadata: { fromCache: !api.serverSnaps, hasPendingWrites: !!(opts && opts.pending) },
      size: rows.length,
      forEach: cb => rows.forEach(([id, v]) => cb({ id, data: () => v })),
      docChanges: () => changes,
    };
  };
  const emit = opts => subs.forEach(s => { try { s.next(snapshotOf(s.uid, opts)); } catch (e) { console.log('  (snapshot threw) ' + e.message); } });
  const stamp = v => {
    const out = {};
    for (const k of Object.keys(v)) out[k] = (v[k] && v[k].__server) ? api.now() : v[k];
    return out;
  };
  const db = {
    collection: () => ({
      doc: id => ({ __id: id, get: async () => ({ exists: docs.has(id), data: () => docs.get(id) }), set: async v => { docs.set(id, stamp(v)); emit({}); } }),
      where: (f, op, uid) => ({
        get: async () => snapshotOf(uid, {}),
        onSnapshot: (o, next, err) => {
          api.listens++;
          const s = { uid, next, err };
          subs.push(s);
          const first = () => { if (!subs.includes(s)) return; if (api.holdSnap) return setTimeout(first, 50); next(snapshotOf(uid, {})); };
          setTimeout(first, 0);
          return () => { const k = subs.indexOf(s); if (k >= 0) subs.splice(k, 1); };
        },
      }),
    }),
    batch: () => {
      const ops = [];
      return {
        set: (ref, v) => ops.push(['set', ref.__id, v]),
        delete: ref => ops.push(['del', ref.__id]),
        commit: () => {
          api.commits++;
          // Yerel kopyaya HER HÂLDE işlenir — gerçeğinde de yazım önce diske gider.
          ops.forEach(([kind, id, v]) => kind === 'del' ? docs.delete(id) : docs.set(id, stamp(v)));
          if (api.ack) { emit({}); return Promise.resolve(); }
          api.hung++;
          emit({ pending: true });                       // bekleyen yazım: bulutta değil, cihazda
          return new Promise(res => held.push(res));     // onay ağ dönene kadar gelmiyor
        },
      };
    },
  };
  api.db = db; api.docs = docs; api.subs = subs; api.emit = emit;
  api.killListener = code => subs.slice().forEach(s => s.err && s.err({ code }));
  return api;
}

/* ─── sahne kurulumu ──────────────────────────────────────────────────── */
const USER = { uid: 'coach1', email: 'a@b.c', isAnonymous: false };

function makeWorld() {
  const fake = fakeFirestore();
  const store = {};
  const evts = {};
  const on = (t, f) => (evts[t] = evts[t] || []).push(f);
  const win = {
    addEventListener: on, removeEventListener: () => {},
    __fsTransport: 'auto', worked: 0, switched: 0, reloaded: 0,
    __fsTransportWorks() { win.worked++; },
    __fsSwitchTransport() { win.switched++; return true; },
  };
  return {
    fake, win, evts,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { visibilityState: 'visible', addEventListener: on, removeEventListener: () => {} },
    navigator: { onLine: true },
    location: { reload() { win.reloaded++; } },
    firebase: {
      apps: [{}],
      firestore: Object.assign(() => fake.db, { FieldValue: { serverTimestamp: () => ({ __server: 1 }) } }),
      auth: () => ({ getRedirectResult: () => Promise.resolve({}), onAuthStateChanged: cb => { setTimeout(() => cb(USER), 0); return () => {}; }, signOut: () => Promise.resolve() }),
    },
  };
}

/* Senkron modülünü index.html'den OLDUĞU GİBİ al. Kopyalamak, sınanan şeyin
   yayına giden şey olmaktan çıkması demek olurdu.

   Tarayıcı yüzeyi (firebase, window, document…) küresel değişken olarak DEĞİL, bu
   fonksiyonun parametresi olarak veriliyor: her senaryo kendi dünyasına kilitleniyor.
   Aksi hâlde bir senaryodan artakalan zamanlayıcı — mesela 15 saniye sonra dönen takılı
   bir commit — bir sonraki senaryonun bulutuna yazıyor ve ortada olmayan bir hata
   görünüyordu. */
function loadSyncModule(world) {
  const html = fs.readFileSync((process.env.SYNCTEST_ROOT||__dirname) + '/index.html', 'utf8');
  const a = html.indexOf('const FB=()=>(typeof firebase');
  const b = html.indexOf('function LoadingScreen(){');
  if (a < 0 || b < 0) throw new Error('senkron modülü index.html içinde bulunamadı');
  const src = html.slice(a, b);
  const stub = `
    let _n=0; const uid=()=>'id'+(++_n);
    const migrate=x=>x;
    const makeDefault=()=>({activeTeamId:'t0',teams:[{id:'t0',setup:{teamName:'Örnek'},days:{},athletes:[]}],templates:[]});
    const stripDeviceOnly=o=>{if(!o||typeof o!=='object')return o;const{activeTeamId,...r}=o;return r;};
    const restoredLocalMedia=c=>c; const hasPendingMedia=()=>false;
    const liftLocalMedia=async()=>false; const liftPaused=()=>true;
    const _lmCache=new Map(); const lmSweep=()=>{}; const mediaReport=()=>'';
  `;
  const args = ['bag', 'firebase', 'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'Worker', 'Blob', 'requestIdleCallback', 'cancelIdleCallback'];
  const bag = {};
  new Function(...args, stub + src + '\n;bag.useCloudSync=useCloudSync;bag.slogText=slogText;')(
    bag, world.firebase, world.win, world.document, world.navigator, world.location,
    world.localStorage, world.sessionStorage,
    undefined, undefined, undefined, undefined);   // Worker/Blob yok → parçalama ana iş parçacığında
  return bag;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function mountApp() {
  const out = { sync: null, data: null, setData: null };
  const h = mountHook(() => {
    const [data, setData] = useState(makeDefaultState());
    out.data = data; out.setData = setData;
    out.sync = BAG.useCloudSync(data, setData);
    return null;
  });
  return { out, h };
}
const makeDefaultState = () => ({ activeTeamId: 't0', teams: [{ id: 't0', setup: { teamName: 'Örnek' }, days: {}, athletes: [] }], templates: [] });
const realState = n => ({ activeTeamId: 't0', teams: [{ id: 't0', setup: { teamName: 'Takım' }, days: {}, athletes: [{ id: 'a1', name: 'Ali', note: 'n' + n }] }], templates: [] });

let BAG = null;
let pass = 0, fail = 0, failedHere = 0;
const check = (name, ok, detail) => {
  ok ? pass++ : (fail++, failedHere++);
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok || !detail ? '' : '\n         ' + detail));
};
/* Bir senaryo düştüğünde cihazın o an ne yaşadığını görmek gerekiyor — sarının
   sebebini ayıran şey tam olarak bu günlük. Geçen senaryoda basmıyoruz. */
const scene = name => { console.log('\n== ' + name + ''); failedHere = 0; };
const endScene = () => { if (failedHere) console.log('  --- senkron günlüğü ---\n' + BAG.slogText().replace(/^/gm, '  ')); };

/* ─── senaryolar ──────────────────────────────────────────────────────── */

async function scenarioHappyPath() {
  scene('bağlantı sağlamken: düzenleme buluta gider, gösterge yeşile döner');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  check('manifest bulutta', w.fake.docs.has('coach1'), 'dokümanlar: ' + [...w.fake.docs.keys()].length);
  check('parçalar bulutta', [...w.fake.docs.keys()].some(k => k !== 'coach1'));
  endScene(); h.unmount();
}

async function scenarioWedgedNetwork() {
  scene('ağ "açık görünüp" veri geçirmiyorken: cihaz donmuyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(800);
  const firstCommits = w.fake.commits;
  check('ilk yazım geçti', firstCommits > 0, 'commit=' + firstCommits);

  w.fake.ack = false;                       // onay bundan sonra gelmeyecek
  out.setData(realState(2));
  await sleep(1000);
  check('takılan yazım için sarı yanıyor', out.sync.status === 'syncing', 'status=' + out.sync.status);
  check('düzenleme yine de yola çıktı', w.fake.hung > 0, 'bekleyen commit=' + w.fake.hung);

  /* ASIL SORU. Eskiden yazım kilidi commit'in sözünü beklerdi; o söz hiç sonuçlanmayınca
     kilit bir daha açılmaz ve cihaz BİR DAHA HİÇ yazamazdı — "sarıda kalıyor" buydu.
     Onay artık süreye bağlı olduğuna göre sonraki düzenleme yine de yola çıkmalı. */
  const before = w.fake.commits;
  out.setData(realState(3));
  await sleep(COMMIT_WAIT);
  check('takılı commit sonraki düzenlemeyi kilitlemiyor', w.fake.commits > before,
    'commit ' + before + ' → ' + w.fake.commits);

  w.fake.recover();                         // ağ geri geldi, bekleyenler onaylandı
  await sleep(3000);
  check('ağ dönünce yeşile geçiyor', out.sync.status === 'synced', 'status=' + out.sync.status);
  check('son düzenleme bulutta', JSON.stringify([...w.fake.docs.values()]).includes('n3'));
  endScene(); h.unmount();
}

async function scenarioListenerDies() {
  scene('dinleyici ölünce: kendi kendine yeniden abone oluyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  const listensBefore = w.fake.listens;
  w.fake.killListener('unavailable');
  await sleep(300);
  check('geçici hata kırmızı yakmıyor', out.sync.status !== 'error', 'status=' + out.sync.status);
  await sleep(3000);
  check('yeni dinleyici kuruldu', w.fake.listens > listensBefore, 'abone ' + listensBefore + ' → ' + w.fake.listens);

  // İzin hatası gerçekten kalıcıdır: onu tekrar denemek yanlış olurdu.
  w.fake.killListener('permission-denied');
  await sleep(300);
  check('izin hatası kırmızı yakıyor', out.sync.status === 'error', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

async function scenarioNeverReachesServer() {
  scene('sunucuya hiç ulaşılamıyorken: taşıma değiştirilip bir kez yenileniyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.serverSnaps = false;               // her anlık görüntü ÖNBELLEKTEN
  const { out, h } = mountApp();
  await sleep(1000);
  check('sunucuya ulaşılamadığı görülüyor', out.sync.diag().sawServer === false);
  await sleep(28000);                       // STALL_MS + gözcü turu
  check('taşıma bir kez değiştirildi', w.win.switched === 1, 'switched=' + w.win.switched);
  check('sayfa bir kez yenilendi', w.win.reloaded === 1, 'reloaded=' + w.win.reloaded);
  endScene(); h.unmount();
}

async function scenarioDroppedEdit() {
  scene('hazır olmadan yapılan düzenleme: gözcü onu buluyor ve yazıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.holdSnap = true;                   // dinleyici daha konuşmuyor → ready hiç olmuyor
  const { out, h } = mountApp();
  await sleep(300);
  out.setData(realState(9));                // debounce turu ready olmadığı için bu düzenlemeyi DÜŞÜRÜR
  await sleep(800);
  check('hazır değilken düzenleme buluta gitmiyor', !w.fake.docs.has('coach1'));
  check('gösterge sarıda', out.sync.status === 'syncing', 'status=' + out.sync.status);
  w.fake.holdSnap = false;                  // dinleyici konuştu, ama düşen düzenlemeyi kimse hatırlatmıyor
  await sleep(5000);                        // gözcü iki saniyede bir bakıyor
  check('gözcü düşmüş düzenlemeyi yazdı', w.fake.docs.has('coach1'), 'dok=' + [...w.fake.docs.keys()].length);
  check('gösterge yeşile döndü', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

async function scenarioNoWriteStorm() {
  scene('her şey senkronken: gözcü boş yere yazmıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  const settled = w.fake.commits;
  await sleep(7000);                        // üç-dört gözcü turu
  check('yeni commit açılmadı', w.fake.commits === settled, 'commit ' + settled + ' → ' + w.fake.commits);
  check('gösterge yeşil kaldı', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

const COMMIT_WAIT = 17000;   // COMMIT_MS (15sn) + gözcü payı

(async () => {
  await scenarioHappyPath();
  await scenarioWedgedNetwork();
  await scenarioListenerDies();
  await scenarioDroppedEdit();
  await scenarioNoWriteStorm();
  await scenarioNeverReachesServer();
  console.log('\n' + pass + ' geçti, ' + fail + ' kaldı');
  process.exit(fail ? 1 : 0);
})();
