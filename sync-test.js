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
    rules: false,       // firestore.rules'taki manifest kuralı: `base` buluttaki rev'i tutmalı
    /* TAKILI BAĞLANTI. Ağ sağlam, ama SDK'nın sunucuyla açtığı bağlantı ölü: tablet uykudan
       döndüğünde, Wi-Fi el değiştirdiğinde olan bu. Hiçbir yazım onaylanmaz, sunucudan
       okuma dönmez, yeniden abone olmak da yalnızca önbelleği getirir — çünkü yeni dinleyici
       AYNI ölü bağlantıyı kullanır. Bunu yalnızca bağlantının kendisini kapatıp açmak
       (disableNetwork → enableNetwork) düzeltir; sayfayı yenilemek de düzeltir, ama o koçun
       elindeki işi siler.
       Takılıyken iki ayrı gerçek var: CİHAZIN gördüğü (docs: kendi kuyruğundaki yazımlar
       işlenmiş) ve SUNUCUNUN tuttuğu (server: başka cihazların yazımları buraya düşer).
       Bağlantı açılınca cihaz sunucunun gerçeğine döner ve kuyruğu SIRAYLA gönderir; her
       yazım o anki sunucu hâline göre kurala takılabilir — gerçeğinde olduğu gibi. */
    wedged: false,
    server: null,
    queue: [],
    kicks: 0,
    rejected: 0,
    commits: 0, listens: 0, hung: 0,
    now: () => ({ toMillis: () => Date.now() }),
    /* Ağ geri geldi. Gerçeğinde de olan bu: bekleyen yazımlar kuyruktan çıkıp onaylanır —
       cihaz yeni bir tur açmayı beklemek zorunda kalmaz. */
    recover() { api.ack = true; held.splice(0).forEach(r => r()); api.emit({}); },
    /* Sunucuya başka bir cihazdan yazım. Bağlantı takılıyken bu cihaza ulaşmaz: sunucuda
       bekler, bağlantı yeniden açılınca gelir. */
    serverSet(id, v) { (api.wedged ? api.server : docs).set(id, v); },
    wedge(kicksToHeal) { api.wedged = true; api.server = new Map(docs); api.kicksToHeal = kicksToHeal || 1; },
  };
  const never = () => new Promise(() => {});
  /* firestore.rules → syncHeadOk: manifest, buluttakinin rev'ini `base` olarak taşımıyorsa
     reddedilir. Batch atomiktir: hiçbir işlem uygulanmaz. */
  const ruleBlocks = (ops, store) => api.rules && ops.some(([kind, id, v]) => kind === 'set' && id === 'coach1' && v && v.base !== undefined
    && store.has(id) && store.get(id).rev !== undefined && store.get(id).rev !== v.base);
  const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const fromServerOpt = o => !!(o && o.source === 'server');
  const snapshotOf = (uid, opts) => {
    const rows = [...docs.entries()].filter(([, v]) => v.userId === uid);
    const changes = rows.map(([id, v]) => ({ type: 'added', doc: { id, data: () => v } }));
    return {
      metadata: { fromCache: !api.serverSnaps || api.wedged, hasPendingWrites: !!(opts && opts.pending) || api.queue.length > 0 },
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
    /* Bağlantıyı kapatıp aç. Takılı bağlantıyı yalnızca bu düzeltir: sunucuda bekleyen
       yazımlar gelir, kuyruktaki yazımlar onaylanır. Gerçek bir kesintide (ack=false) işe yaramaz. */
    disableNetwork: async () => {},
    enableNetwork: async () => {
      api.kicks++;
      if (!api.wedged) return;
      if (--api.kicksToHeal > 0) return;   // ağ hâlâ kötü: bu deneme de tutmadı
      api.wedged = false;
      docs.clear(); api.server.forEach((v, id) => docs.set(id, v)); api.server = null;
      for (const q of api.queue.splice(0)) {
        if (ruleBlocks(q.ops, docs)) { api.rejected++; q.rej(denied()); continue; }
        q.ops.forEach(([kind, id, v]) => kind === 'del' ? docs.delete(id) : docs.set(id, v));
        q.res();
      }
      emit({});
    },
    collection: () => ({
      doc: id => ({ __id: id,
        get: async o => { if (api.wedged && fromServerOpt(o)) return never(); return { exists: docs.has(id), data: () => docs.get(id) }; },
        set: async v => { docs.set(id, stamp(v)); emit({}); } }),
      where: (f, op, uid) => ({
        get: async o => { if (api.wedged && fromServerOpt(o)) return never(); return snapshotOf(uid, {}); },
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
          if (api.wedged) {
            // Cihazın kendi görüşüne işlenir, sunucuya gitmez: kuyrukta bekler.
            const st = ops.map(([kind, id, v]) => [kind, id, kind === 'del' ? v : stamp(v)]);
            st.forEach(([kind, id, v]) => kind === 'del' ? docs.delete(id) : docs.set(id, v));
            api.hung++;
            emit({ pending: true });
            return new Promise((res, rej) => api.queue.push({ ops: st, res, rej }));
          }
          if (ruleBlocks(ops, docs)) { api.rejected++; return Promise.reject(denied()); }
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
/* Masaüstünün yazdığı hâl: BAŞKA bir sporcu ekliyor ve Ali'ye dokunmuyor. Böylece
   birleştirmenin iki tarafı da sınanıyor — uzak ekleme geliyor mu, buradaki düzenleme
   duruyor mu — ve sonuç bir çakışma kuralına değil, gerçekten kayıpsız birleşmeye bağlı. */
const withSecond = (n, m) => ({ activeTeamId: 't0', teams: [{ id: 't0', setup: { teamName: 'Takım' }, days: {}, athletes: [{ id: 'a1', name: 'Ali', note: 'n' + n }, { id: 'a2', name: 'Veli', note: 'm' + m }] }], templates: [] });

/* BAŞKA BİR CİHAZIN YAZIMI. İkinci bir uygulama örneği kurmak yerine buluta doğrudan
   yazıyoruz: sınanan şey "iki cihaz aynı anda ne yapar" değil, BU cihazın bulutta olan
   bitenden haberdar olup olmadığı. Parçalar içerik adresli olduğu için birleştirme
   dokümanın ADINA değil içindeki `h` alanına bakar; tek parçalık bir set bu yüzden elle
   kurulabiliyor. emit YOK — bu, uyuyan/ölmüş bir dinleyicinin teslim etmediği yazım. */
function remoteWrite(w, state, rev, base) {
  const h = 'uzak' + rev;
  w.fake.serverSet('coach1_' + h, { userId: 'coach1', c: JSON.stringify(state), h, rev });
  const m = { userId: 'coach1', v: 2, n: 1, rev, ids: [h], st: w.fake.now() };
  if (base !== undefined) m.base = base;   // yazan cihazın dayandığı hâl (yeni sürüm bunu her yazımda koyar)
  w.fake.serverSet('coach1', m);
}
const cloudRev = w => (w.fake.docs.get('coach1') || {}).rev;

let BAG = null;
let pass = 0, fail = 0, failedHere = 0;
const check = (name, ok, detail) => {
  ok ? pass++ : (fail++, failedHere++);
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok || !detail ? '' : '\n         ' + detail));
};
/* Bir senaryo düştüğünde cihazın o an ne yaşadığını görmek gerekiyor — sarının
   sebebini ayıran şey tam olarak bu günlük. Geçen senaryoda basmıyoruz. */
const scene = name => { console.log('\n== ' + name + ''); failedHere = 0; };
const endScene = () => { if (failedHere || process.env.SYNCTEST_LOG) console.log('  --- senkron günlüğü ---\n' + BAG.slogText().replace(/^/gm, '  ')); };

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

/* "Masaüstünde değiştirdim, telefonda geç göründü"ün senaryosu.
   Telefon cebe girer, tarayıcı sekmeyi dondurur ve Firestore'un akışı sessizce ölür.
   Masaüstü bu sırada yazar. Telefon geri açıldığında ÖNEMLİ OLAN ŞU: dinleyici hâlâ ölü,
   yani ekrandaki hâli düzeltecek bir anlık görüntü GELMİYOR. Cihaz kendi başına sormazsa
   koç eski hâle bakmaya devam eder — ve gözcü de sormaz, çünkü cihaz "hazır ve temiz"
   görünür. Bu yüzden burada abonelik dönüşte geri konuluyor ama hiçbir şey teslim
   etmiyor: sınanan tam olarak cihazın KENDİ sorusu. */
async function scenarioPhoneWakesUp() {
  scene('telefon cebe girip geri açılınca: masaüstünün değişikliğini görüyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('telefon senkron', out.sync.status === 'synced', 'status=' + out.sync.status);

  w.document.visibilityState = 'hidden';                  // telefon cebe girdi
  (w.evts.visibilitychange || []).forEach(f => f());
  const sleeping = w.fake.subs.splice(0);                 // akış öldü: artık hiçbir şey teslim edilmiyor
  remoteWrite(w, realState(7), Date.now() + 5000);        // masaüstü yazdı
  await sleep(21000);                                     // HIDE_GAP_MS'ten uzun bir ara
  check('uyurken değişiklik gelmiyor (beklenen)', !JSON.stringify(out.data).includes('n7'));

  w.fake.subs.push(...sleeping);                          // abonelik geri kondu — ama ölü, teslim etmiyor
  w.document.visibilityState = 'visible';
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(3000);
  check('dönüşte masaüstünün değişikliği ekrana geldi', JSON.stringify(out.data).includes('n7'),
    'ekrandaki: ' + JSON.stringify(out.data).slice(0, 140));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* Dönüş sınavı BOŞ YERE iş çıkarmamalı: bulutta yeni bir şey yoksa ne çekim olur ne yazım.
   Aksi hâlde her cebe girip çıkışta koleksiyonun tamamı yeniden okunurdu. */
async function scenarioWakeUpCostsNothing() {
  scene('dönüşte bulut aynıysa: fazladan çekim de yazım da yok');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  const settled = w.fake.commits;
  w.document.visibilityState = 'hidden';
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(21000);
  w.document.visibilityState = 'visible';
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(2500);
  check('yeni commit açılmadı', w.fake.commits === settled, 'commit ' + settled + ' → ' + w.fake.commits);
  check('gösterge yeşil kaldı', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* "PC ile telefon senkron değil"in birinci hâli: telefonun KENDİ yazımı oturmamış.
   Firestore'un "bekleyen yazım var" damgası GÖRÜNTÜNÜN TAMAMI için konur — tek bir
   oturmamış doküman, içinde masaüstünün yepyeni manifesti duran görüntüyü de damgalar.
   Cihaz o damgayı "kendi yankım" diye okuyup görüntüyü atarsa, cebe girerken yarıda kalan
   tek bir yazım onu uzak değişikliklere sağır bırakır: masaüstünde yazılan antrenman
   telefonda HİÇ görünmez ve görüntüler gelmeye devam ettiği için kimse durumu fark etmez. */
async function scenarioPendingWriteBlindness() {
  scene('kendi yazımı oturmamışken: masaüstünün değişikliğini yine de görüyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('telefon senkron', out.sync.status === 'synced', 'status=' + out.sync.status);

  w.fake.ack = false;                                  // bundan sonra hiçbir onay gelmiyor
  out.setData(realState(2));                           // yazım kuyrukta kalıyor → bekleyen yazım
  await sleep(1200);
  check('telefonun yazımı yolda', out.sync.status === 'syncing', 'status=' + out.sync.status);

  remoteWrite(w, withSecond(1, 5), Date.now() + 5000); // masaüstü yazdı
  w.fake.emit({ pending: true });                      // dinleyici teslim etti — içinde bizim bekleyenimiz de var
  await sleep(1500);
  check('masaüstünün eklediği sporcu ekrana geldi', JSON.stringify(out.data).includes('m5'),
    'ekrandaki: ' + JSON.stringify(out.data).slice(0, 160));
  check('telefonun kendi düzenlemesi duruyor', JSON.stringify(out.data).includes('n2'),
    'ekrandaki: ' + JSON.stringify(out.data).slice(0, 160));
  check('gösterge sarı — yazımımız hâlâ yolda', out.sync.status === 'syncing', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* "PC ile telefon senkron değil"in ikinci hâli: telefon EKRANDA AÇIK duruyor ve akışı
   sessizce ölüyor. Dönüş sınavı yalnızca uygulamaya dönüldüğünde sorar; gözcünün dinleyiciyi
   tazeleyen dalı yalnızca cihaz bir şey beklerken çalışır. Açık, temiz ve "hazır" görünen
   bir telefon ikisine de girmez — masaüstündeki antrenman oraya hiç düşmez. */
async function scenarioSilentStream() {
  scene('telefon açıkken akış ölürse: sessizlik sınavı bulutu soruyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('telefon senkron', out.sync.status === 'synced', 'status=' + out.sync.status);

  w.fake.subs.splice(0);                                // akış öldü: artık hiçbir görüntü teslim edilmiyor
  remoteWrite(w, withSecond(1, 8), Date.now() + 5000);  // masaüstü yazdı
  await sleep(12000);
  check('ölü akış tek başına bir şey getirmiyor (beklenen)', !JSON.stringify(out.data).includes('m8'));
  await sleep(45000);                                   // sessizlik eşiği (30sn) + gözcü turu
  check('sessizlik sınavı uzak hâli getirdi', JSON.stringify(out.data).includes('m8'),
    'ekrandaki: ' + JSON.stringify(out.data).slice(0, 160));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* Sessizlik sınavının bedeli sınırlı kalmalı: bulutta yeni bir şey yoksa ne yazım açılır
   ne de ekrandaki hâl değişir. Aksi hâlde açık duran her cihaz boşuna tur atardı. */
async function scenarioSilenceCostsNothing() {
  scene('akış sağlamken sessizlik: fazladan yazım yok');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  const settled = w.fake.commits;
  await sleep(45000);                                   // sessizlik eşiğinin ötesi
  check('yeni commit açılmadı', w.fake.commits === settled, 'commit ' + settled + ' → ' + w.fake.commits);
  check('gösterge yeşil kaldı', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* Haftanın takım seansları böyle kayboldu: başka bir cihaz bulutu kendi ESKİ kopyasıyla
   onardı, bu cihaz o sırada düzenleme yapmıyordu ve gelen hâli olduğu gibi kabul etti —
   kayıp bütün cihazlara yayıldı. Gelen hâl birçok seansı birden düşürüyorsa bu bir silme
   değildir: seanslar ekranda kalmalı ve buluta geri yazılmalı. */
const withSessions = ids => ({ activeTeamId: 't0', teams: [{ id: 't0', setup: { teamName: 'Takım' },
  days: Object.fromEntries(ids.map((id, i) => ['2026-10-1' + (2 + i), { date: '2026-10-1' + (2 + i), sessions: [{ id, name: 'Antrenman ' + id }], dailyNotes: '' }])),
  athletes: [{ id: 'a1', name: 'Ali' }] }], templates: [] });
const cloudState = w => {
  const m = w.fake.docs.get('coach1');
  return m ? m.ids.map(h => (w.fake.docs.get('coach1_' + h) || {}).c || '').join('') : '';
};
async function scenarioStaleOverwrite() {
  scene('başka cihaz bulutu eski kopyayla ezerse: seanslar silinmiyor, buluta geri yazılıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(withSessions(['s1', 's2', 's3', 's4', 's5']));
  await sleep(1500);
  check('cihaz senkron', out.sync.status === 'synced', 'status=' + out.sync.status);

  remoteWrite(w, withSessions([]), Date.now() + 5000);   // eski kopya: bu haftanın seansları yok
  w.fake.emit({});
  await sleep(3000);
  const scr = JSON.stringify(out.data);
  check('seanslar ekranda duruyor', ['s1', 's2', 's3', 's4', 's5'].every(id => scr.includes('"' + id + '"')), 'ekrandaki: ' + scr.slice(0, 200));
  const cl = cloudState(w);
  check('seanslar buluta geri yazıldı', ['s1', 's2', 's3', 's4', 's5'].every(id => cl.includes('"' + id + '"')), 'buluttaki: ' + cl.slice(0, 200));
  check('kullanıcıya not düşüldü', /seans eksikti/.test(out.sync.syncNote || ''), 'not=' + out.sync.syncNote);
  endScene(); h.unmount();
}
/* Koruma koçun kendi silmesini engellememeli: başka cihazda TEK bir seans silmek eskisi
   gibi her yere geçer. */
async function scenarioSingleDeleteSyncs() {
  scene('başka cihazda tek seans silinince: silme buraya da geçiyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(withSessions(['s1', 's2', 's3']));
  await sleep(1500);
  remoteWrite(w, withSessions(['s1', 's2']), Date.now() + 5000);
  w.fake.emit({});
  await sleep(2500);
  const scr = JSON.stringify(out.data);
  check('silinen seans gitti', !scr.includes('"s3"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('diğerleri duruyor', scr.includes('"s1"') && scr.includes('"s2"'));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

/* ÇEVRİMDIŞI TABLETİN DÖNÜŞÜ. Bu cihaz önce n1'i yazdı (rev r0), sonra notu n2 yaptı ve onu da
   yazdı. Tablet r0'ı görmüş, sonra çevrimdışı kalmış ve kendi düzenlemesini (Veli'yi ekledi)
   kuyruğa yazmış; ağ dönünce o kayıt buluta gitti — bu cihazın n2'sini HİÇ görmeden. Eskiden bu
   cihaz, kendi tarafında yazılmamış bir şey olmadığı için gelen hâli olduğu gibi alıyordu: n2
   her yerden siliniyordu. Gelen manifest dayandığı hâli (`base`) söylüyor; o hâl bu cihazdan
   eski olduğuna göre birleştirilmeli. */
async function scenarioBlindWriteMerged() {
  scene('başka cihaz son hâli görmeden yazarsa: iki tarafın değişikliği de kalıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  const r0 = cloudRev(w);
  out.setData(realState(2));
  await sleep(1500);
  check('cihaz senkron', out.sync.status === 'synced' && cloudState(w).includes('n2'), 'status=' + out.sync.status);

  remoteWrite(w, withSecond(1, 5), Date.now() + 5000, r0);   // tablet: r0'ın üstüne, n2'yi görmeden
  w.fake.emit({});
  await sleep(3000);
  const scr = JSON.stringify(out.data), cl = cloudState(w);
  check('bu cihazın düzenlemesi (n2) ekranda duruyor', scr.includes('"n2"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('tabletin eklediği sporcu ekranda', scr.includes('"m5"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('ikisi de buluta yazıldı', cl.includes('"n2"') && cl.includes('"m5"'), 'buluttaki: ' + cl.slice(0, 200));
  check('kullanıcıya not düşüldü', /birleştirildi/.test(out.sync.syncNote || ''), 'not=' + out.sync.syncNote);
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}
/* Aynısı, ama tablet ÇOK eski bir hâlden yazmış: dayandığı hâl bu cihazda artık yok. Kesin
   birleştirme yapılamıyor; yine de hiçbir şey silinmemeli. */
async function scenarioBlindWriteNoAncestor() {
  scene('çok eski bir hâlden körlemesine yazılırsa: hiçbir şey silinmiyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(2));
  await sleep(1500);
  remoteWrite(w, withSecond(1, 6), Date.now() + 5000, 1);
  w.fake.emit({});
  await sleep(3000);
  const scr = JSON.stringify(out.data), cl = cloudState(w);
  check('bu cihazın düzenlemesi duruyor', scr.includes('"n2"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('tabletin eklediği sporcu geldi', scr.includes('"m6"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('ikisi de bulutta', cl.includes('"n2"') && cl.includes('"m6"'), 'buluttaki: ' + cl.slice(0, 200));
  endScene(); h.unmount();
}
/* AYNI ANDA YAZAN İKİ CİHAZ (kural yayında). Masaüstü yazdı; bu cihazın dinleyicisi onu henüz
   teslim etmedi ve bu cihaz da tam o sırada yazdı. Eskiden geç kalan yazım öncekini eziyordu.
   Kural `base`'i tutmayan manifesti reddediyor; cihaz buluttakini okuyup birleştirmeli. */
async function scenarioConcurrentWriteRejected() {
  scene('aynı anda iki cihaz yazınca: kural geç kalanı durduruyor, o da birleştirip yazıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.rules = true;
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  remoteWrite(w, withSecond(1, 7), Date.now() + 5000, cloudRev(w));   // masaüstü: emit YOK, henüz gelmedi
  out.setData(realState(3));
  await sleep(3000);
  const scr = JSON.stringify(out.data), cl = cloudState(w);
  check('bayat yazım reddedildi', w.fake.rejected > 0, 'reddedilen=' + w.fake.rejected);
  check('masaüstünün sporcusu bulutta kaldı', cl.includes('"m7"'), 'buluttaki: ' + cl.slice(0, 200));
  check('bu cihazın düzenlemesi de bulutta', cl.includes('"n3"'), 'buluttaki: ' + cl.slice(0, 200));
  check('ekranda ikisi de var', scr.includes('"m7"') && scr.includes('"n3"'), 'ekrandaki: ' + scr.slice(0, 200));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}
/* Manifestin gösterdiği bir parça buluttan silinmiş (başka bir cihazın çöp toplayıcısı). Öteki
   cihazlar bu manifesti okuyamaz ve bir süre sonra kendi hâllerini üstüne yazarlar. İçeriği
   elinde tutan cihaz eksik parçayı geri yüklemeli. */
async function scenarioMissingChunkRepaired() {
  scene('manifestin bir parçası silinmişse: içeriği bilen cihaz onu geri yüklüyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(4));
  await sleep(1500);
  const ids = w.fake.docs.get('coach1').ids;
  w.fake.docs.delete('coach1_' + ids[0]);
  w.fake.emit({});
  await sleep(1500);
  check('eksik parça geri yüklendi', ids.every(x => w.fake.docs.has('coach1_' + x)), 'eksik: ' + ids.filter(x => !w.fake.docs.has('coach1_' + x)).join(','));
  check('bulut yeniden okunabiliyor', cloudState(w).includes('"n4"'));
  endScene(); h.unmount();
}

/* "TABLETTE SARIDA KALIYOR" — TAKILI BAĞLANTI.
   Tablet bir süre kullanılmadı (ekran kapandı, Wi-Fi el değiştirdi). Ağ ayakta, ama Firestore'un
   sunucuyla açtığı bağlantı ölü: koç tablette bir şey yazıyor, yazım hiç onaylanmıyor. Önceki
   bütün önlemler (onay süresi, kilidi bırakma, yeniden abone olma) uygulamayı kilitlenmekten
   kurtarıyordu ama BAĞLANTIYI kurtarmıyordu — yeni dinleyici de aynı ölü bağlantıyı kullanıyor.
   Gösterge, sayfa yenilenene kadar sarıda kalıyordu. Bu arada masaüstü de yazmış olsun: cihaz
   kendine geldiğinde iki tarafın değişikliği de kalmalı. */
async function scenarioWedgedConnectionEdit() {
  scene('bağlantı takılınca (tablet): cihaz bağlantıyı kendisi yeniden açıyor, sayfa yenilenmeden yeşile dönüyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.rules = true;
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('tablet senkron', out.sync.status === 'synced', 'status=' + out.sync.status);
  const r1 = cloudRev(w);

  w.fake.wedge();                                          // bağlantı öldü
  out.setData(realState(2));                               // tablette düzenleme
  await sleep(1500);
  check('takılı bağlantıda sarı', out.sync.status === 'syncing', 'status=' + out.sync.status);
  remoteWrite(w, withSecond(1, 4), Date.now() + 5000, r1); // masaüstü yazdı: tabletin n2'sini görmeden

  await sleep(30000);
  const scr = JSON.stringify(out.data), cl = cloudState(w);
  check('bağlantı yeniden açıldı', w.fake.kicks > 0, 'kicks=' + w.fake.kicks);
  check('sayfa yenilenmedi', w.win.reloaded === 0, 'reloaded=' + w.win.reloaded);
  check('tabletin düzenlemesi (n2) ekranda ve bulutta', scr.includes('"n2"') && cl.includes('"n2"'), 'ekrandaki: ' + scr.slice(0, 160) + '\n         buluttaki: ' + cl.slice(0, 160));
  check('masaüstünün sporcusu ekranda ve bulutta', scr.includes('"m4"') && cl.includes('"m4"'), 'ekrandaki: ' + scr.slice(0, 160) + '\n         buluttaki: ' + cl.slice(0, 160));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}
/* Aynısı, tablet boşta: koç tableti açıyor, hiçbir şey yazmıyor, sadece bakıyor. Bağlantı ölü
   olduğu için masaüstünün değişikliği hiç gelmiyor; dönüş sınavının sunucu okuması da dönmüyor.
   Eskiden bunun karşılığı yeniden abone olmaktı — aynı ölü bağlantıya. */
async function scenarioWedgedOnWake() {
  scene('tablet uykudan dönünce bağlantı ölüyse: masaüstünün değişikliği yenilemeden geliyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.rules = true;
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  check('tablet senkron', out.sync.status === 'synced', 'status=' + out.sync.status);

  w.document.visibilityState = 'hidden';                   // ekran kapandı
  (w.evts.visibilitychange || []).forEach(f => f());
  w.fake.wedge();
  remoteWrite(w, withSecond(1, 6), Date.now() + 5000, cloudRev(w));
  await sleep(21000);
  w.document.visibilityState = 'visible';                  // koç tableti açtı
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(15000);
  const scr = JSON.stringify(out.data);
  check('bağlantı yeniden açıldı', w.fake.kicks > 0, 'kicks=' + w.fake.kicks);
  check('masaüstünün değişikliği geldi', scr.includes('"m6"'), 'ekrandaki: ' + scr.slice(0, 160));
  check('sayfa yenilenmedi', w.win.reloaded === 0, 'reloaded=' + w.win.reloaded);
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}
/* Aynısı, ama ağ bir süre daha kötü: ilk yeniden açma tutmuyor. Tabletin kuyruktaki kaydı
   (manifest) onay süresini çoktan aşmışken sunucuya varıyor ve — arada masaüstü yazdığı için —
   kurala takılıyor. Bu ret artık kimsenin beklemediği bir anda geliyor; cihaz yine de iki tarafın
   değişikliğini birleştirip yazmalı ve yeşile dönmeli. */
async function scenarioWedgedLong() {
  scene('bağlantı uzun süre takılırsa: geç gelen ret de birleştiriliyor, hiçbir şey kaybolmuyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  w.fake.rules = true;
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  const r1 = cloudRev(w);
  w.fake.wedge(3);                                         // ancak üçüncü yeniden açma tutuyor
  out.setData(realState(2));
  await sleep(1500);
  remoteWrite(w, withSecond(1, 9), Date.now() + 5000, r1);
  await sleep(90000);
  const scr = JSON.stringify(out.data), cl = cloudState(w);
  check('bağlantı birkaç kez yeniden açıldı', w.fake.kicks >= 3, 'kicks=' + w.fake.kicks);
  check('sayfa yenilenmedi', w.win.reloaded === 0, 'reloaded=' + w.win.reloaded);
  check('iki tarafın değişikliği de ekranda', scr.includes('"n2"') && scr.includes('"m9"'), 'ekrandaki: ' + scr.slice(0, 160));
  check('iki tarafın değişikliği de bulutta', cl.includes('"n2"') && cl.includes('"m9"'), 'buluttaki: ' + cl.slice(0, 160));
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}
/* Bağlantı sağlamken bağlantıyı yenilemek boşa iştir: hiçbir senaryoda kendiliğinden olmamalı. */
async function scenarioNoNeedlessKick() {
  scene('her şey yolundayken: bağlantı boşuna yeniden açılmıyor');
  const w = makeWorld(); BAG = loadSyncModule(w);
  const { out, h } = mountApp();
  await sleep(400);
  out.setData(realState(1));
  await sleep(1500);
  out.setData(realState(2));
  await sleep(1500);
  w.document.visibilityState = 'hidden';
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(21000);
  w.document.visibilityState = 'visible';
  (w.evts.visibilitychange || []).forEach(f => f());
  await sleep(40000);                                      // sessizlik sınavının da ötesi
  check('bağlantı yenilenmedi', w.fake.kicks === 0, 'kicks=' + w.fake.kicks);
  check('gösterge yeşil', out.sync.status === 'synced', 'status=' + out.sync.status);
  endScene(); h.unmount();
}

const COMMIT_WAIT = 17000;   // COMMIT_MS (15sn) + gözcü payı

(async () => {
  const all = [
    scenarioHappyPath, scenarioWedgedNetwork, scenarioListenerDies, scenarioDroppedEdit,
    scenarioNoWriteStorm, scenarioPhoneWakesUp, scenarioWakeUpCostsNothing,
    scenarioPendingWriteBlindness, scenarioSilentStream, scenarioSilenceCostsNothing,
    scenarioNeverReachesServer, scenarioStaleOverwrite, scenarioSingleDeleteSyncs,
    scenarioBlindWriteMerged, scenarioBlindWriteNoAncestor, scenarioConcurrentWriteRejected,
    scenarioMissingChunkRepaired, scenarioWedgedConnectionEdit, scenarioWedgedOnWake, scenarioWedgedLong,
    scenarioNoNeedlessKick,
  ];
  // Yalnızca bazılarını koşmak için:  SYNCTEST_ONLY=Wedged node sync-test.js
  const only = process.env.SYNCTEST_ONLY;
  for (const s of all) if (!only || s.name.includes(only)) await s();
  console.log('\n' + pass + ' geçti, ' + fail + ' kaldı');
  process.exit(fail ? 1 : 0);
})();
