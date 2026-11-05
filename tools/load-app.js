/* ═══════════════════════════════════════════════════════════════════════════
   UYGULAMAYI NODE'DA YÜKLE — index.html'deki betiğin kendisi, kopyalanmadan

   validator-test.js'in yaklaşımı: betik @babel/standalone ile (tarayıcının kullandığı
   derleyicinin aynısıyla) derlenir, sahte bir tarayıcı yüzeyinde çalıştırılır ve istenen
   üst düzey adlar bir torbaya konur. Yani burada sınanan kod, koçun ekranındaki kodun
   kendisidir. monitor-test.js ve tools/gen-ewma-doc.js kullanır.

   loadApp(['monBuild', 'MON_CFG', …]) → { monBuild, MON_CFG, … }
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/standalone');

function loadApp(expose, opts) {
  const o = opts || {};
  const html = fs.readFileSync(path.join(__dirname, '..', o.dist ? 'dist/index.html' : 'index.html'), 'utf8');
  const open = o.dist ? html.indexOf('<script>\n', html.indexOf('id="root"')) : html.indexOf('<script type="text/babel"');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  let src = html.slice(start, end);
  const cut = o.dist ? src.lastIndexOf('lmPersist()') : src.indexOf('lmPersist();');
  if (cut < 0) throw new Error('betiğin sonu bulunamadı');
  src = src.slice(0, cut);
  const { code } = babel.transform(src, { presets: ['react'], filename: 'app.jsx', compact: false });

  const noop = () => {};
  const el = (t, p, ...c) => ({ type: t, props: p || {}, children: c });
  const React = {
    createElement: el, Fragment: 'Fragment',
    useState: i => [typeof i === 'function' ? i() : i, noop],
    useEffect: noop, useLayoutEffect: noop, useRef: i => ({ current: i }),
    useMemo: f => f(), useCallback: f => f,
    memo: c => c, forwardRef: c => c, createContext: () => ({ Provider: 'P', Consumer: 'C' }),
    useContext: () => null, useReducer: (r, i) => [i, noop], StrictMode: 'StrictMode',
  };
  const store = {};
  const storage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; },
    key: () => null, length: 0,
  };
  const doc = {
    visibilityState: 'visible', addEventListener: noop, removeEventListener: noop,
    getElementById: () => null, createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    documentElement: { style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop } },
    body: { appendChild: noop, removeChild: noop, classList: { add: noop, remove: noop } },
    querySelector: () => null, querySelectorAll: () => [],
  };
  const win = {
    addEventListener: noop, removeEventListener: noop, location: { search: '', hostname: 'localhost', href: '' },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    localStorage: storage, sessionStorage: storage, navigator: { onLine: true, userAgent: 'node' },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  const fakeFirebase = {
    apps: [{}],
    auth: () => ({ currentUser: null }),
    firestore: Object.assign(() => ({}), { FieldValue: { serverTimestamp: () => 'TS' } }),
  };
  const bag = {};
  const names = ['bag', 'React', 'ReactDOM', 'document', 'window', 'navigator', 'location',
    'localStorage', 'sessionStorage', 'firebase', 'fetch', 'alert', 'confirm', 'prompt',
    'IntersectionObserver', 'ResizeObserver', 'matchMedia', 'Worker', 'Blob', 'indexedDB',
    'requestAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback'];
  const tail = '\n;' + expose.map(n => `try{bag.${n}=${n};}catch(e){}`).join('') +
    'bag.setLang=l=>{REPORT_LANG=l;};\n';
  new Function(...names, code + tail)(
    bag, React, { createRoot: () => ({ render: noop }) }, doc, win, win.navigator, win.location,
    storage, storage, fakeFirebase, () => Promise.reject(new Error('ağ yok')), noop, () => true, () => null,
    function () { return { observe: noop, disconnect: noop, unobserve: noop }; },
    function () { return { observe: noop, disconnect: noop, unobserve: noop }; },
    win.matchMedia, undefined, undefined, undefined,
    f => setTimeout(f, 0), undefined, undefined);
  const missing = expose.filter(n => !(n in bag));
  if (missing.length) throw new Error('betikte bulunamayan adlar: ' + missing.join(', '));
  return bag;
}

module.exports = { loadApp };
