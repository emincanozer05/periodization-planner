/* Yüzsüz baş: manken vitrin mankeni gibi yüzsüz.

   Yüzün ortası (kaşların altından alt dudağın altına) ağdan çıkarılıyor — göz
   çukurları, burun delikleri ve ağzın içi de onunla birlikte (bunlar yüze
   bağlı kapalı ceplerdi). Kalan delik, eşit aralıklı yeni bir üçgen yamayla
   kapatılıyor: noktalar başın merkezinden bakan bir stereografik düzlemde
   altıgen ızgara, üçgenler Delaunay. Yamanın yüzeyi çevresindeki alından,
   şakaklardan, yanaklardan ve çeneden ince plaka eğrisiyle (TPS) sürüyor:
   pürüzsüz, hafif kubbeli bir yüz. Kulaklar ve kafanın biçimi yerinde. */
'use strict';

// Yüz bölgesi: göz hizasının biraz altında ortalanmış bir elips, yalnızca ön yarı.
const ZONE = { a: 0.062, b: 0.07, y0: 1.675 };
const CENTER = [0, 1.69, 0.02];          // başın ortası (yama bu noktadan bakılarak kuruluyor)
const H = 0.03;                          // ızgara aralığı (stereografik düzlemde, ~7 mm)

function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

// İnce plaka eğrisi (thin-plate spline): 2B noktalardaki değerlerden pürüzsüz bir yüzey.
function tps(pts, vals, lam) {
  const n = pts.length, N = n + 3, M = Array.from({ length: N }, () => new Float64Array(N + 1));
  const K = (a, b) => { const r2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; return r2 > 0 ? 0.5 * r2 * Math.log(r2) : 0; };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i][j] = K(pts[i], pts[j]) + (i === j ? lam : 0);
    M[i][n] = 1; M[i][n + 1] = pts[i][0]; M[i][n + 2] = pts[i][1];
    M[n][i] = 1; M[n + 1][i] = pts[i][0]; M[n + 2][i] = pts[i][1];
    M[i][N] = vals[i];
  }
  for (let c = 0; c < N; c++) {
    let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < N; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= N; k++) M[r][k] -= f * M[c][k]; }
  }
  const w = M.map((row, i) => row[N] / row[i]);
  return q => { let s = w[n] + w[n + 1] * q[0] + w[n + 2] * q[1]; for (let i = 0; i < n; i++) s += w[i] * K(q, pts[i]); return s; };
}

// Bowyer–Watson Delaunay üçgenlemesi (birkaç yüz nokta için yeterince hızlı).
function delaunay(pts) {
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const p of pts) { mnx = Math.min(mnx, p[0]); mny = Math.min(mny, p[1]); mxx = Math.max(mxx, p[0]); mxy = Math.max(mxy, p[1]); }
  const d = Math.max(mxx - mnx, mxy - mny) * 20, cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2, n = pts.length;
  const P = pts.concat([[cx - d, cy - d], [cx + d, cy - d], [cx, cy + d]]);
  function circ(t) {
    const [a, b, c] = t.map(i => P[i]);
    const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
    const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / D;
    const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / D;
    return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2];
  }
  let tris = [[n, n + 1, n + 2]].map(t => ({ t, c: circ(t) }));
  for (let i = 0; i < n; i++) {
    const p = P[i], bad = [], good = [];
    for (const T of tris) ((p[0] - T.c[0]) ** 2 + (p[1] - T.c[1]) ** 2 < T.c[2] ? bad : good).push(T);
    const cnt = new Map();
    for (const T of bad) for (let k = 0; k < 3; k++) {
      const a = T.t[k], b = T.t[(k + 1) % 3], key = Math.min(a, b) + ',' + Math.max(a, b);
      cnt.set(key, (cnt.get(key) || { n: 0, e: [a, b] })); cnt.get(key).n++;
    }
    tris = good;
    for (const { n: c, e } of cnt.values()) if (c === 1) { const t = [e[0], e[1], i]; tris.push({ t, c: circ(t) }); }
  }
  return tris.map(T => T.t).filter(t => t.every(i => i < n));
}

function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)));
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t);
}

/* m: posed() çıktısı ({ P, quads, W, J }). Yüz dörtgenlerini siler, yamayı
   m.tris'e (üçgenler) ve yeni köşeleri m.P'nin sonuna ekler; yeni köşeler deri
   ağırlığında tamamen "head" kemiğinde. */
function faceless(m) {
  const P = m.P, nv0 = P.length / 3;
  const used = new Uint8Array(nv0); m.quads.forEach(q => q.forEach(i => { used[i] = 1; }));
  const nb = Array.from({ length: nv0 }, () => new Set());
  m.quads.forEach(q => { for (let k = 0; k < q.length; k++) { const a = q[k], b = q[(k + 1) % q.length]; nb[a].add(b); nb[b].add(a); } });
  const inZone = i => {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    return z > 0 && (x / ZONE.a) ** 2 + ((y - ZONE.y0) / ZONE.b) ** 2 < 1;
  };
  // Burnun ucundan (en öndeki köşe) başlayarak bölgeye yayıl.
  let seed = -1, bz = -9;
  for (let i = 0; i < nv0; i++) if (used[i] && P[i * 3 + 1] > 1.6 && P[i * 3 + 2] > bz) { bz = P[i * 3 + 2]; seed = i; }
  const Z = new Uint8Array(nv0), st = [seed]; Z[seed] = 1;
  while (st.length) { const v = st.pop(); for (const w of nb[v]) if (!Z[w] && used[w] && inZone(w)) { Z[w] = 1; st.push(w); } }
  // Bölgenin çevrelediği ama elipse girmeyen cep dipleri (ağzın içinin altı gibi) de bölgeye.
  const comp = new Int32Array(nv0).fill(-1), sizes = [];
  for (let s0 = 0; s0 < nv0; s0++) {
    if (!used[s0] || Z[s0] || comp[s0] >= 0) continue;
    const stk = [s0]; comp[s0] = sizes.length; let n = 0;
    while (stk.length) { const v = stk.pop(); n++; for (const w of nb[v]) if (used[w] && !Z[w] && comp[w] < 0) { comp[w] = sizes.length; stk.push(w); } }
    sizes.push(n);
  }
  let big = 0; sizes.forEach((n, k) => { if (n > sizes[big]) big = k; });
  for (let i = 0; i < nv0; i++) if (comp[i] >= 0 && comp[i] !== big) Z[i] = 1;

  const keep = m.quads.filter(q => !q.some(i => Z[i]));
  // Deliğin kenarı: kalan dörtgenlerde tersi olmayan yönlü kenarlar → tek halka.
  const dir = new Set(); keep.forEach(q => { for (let k = 0; k < 4; k++) dir.add(q[k] * 1e6 + q[(k + 1) % 4]); });
  const nxt = new Map();
  keep.forEach(q => { for (let k = 0; k < 4; k++) { const a = q[k], b = q[(k + 1) % 4]; if (!dir.has(b * 1e6 + a)) { if (nxt.has(b)) throw new Error('face: delik kenarı basit değil'); nxt.set(b, a); } } });
  const loop = []; { let v = nxt.keys().next().value; do { loop.push(v); v = nxt.get(v); } while (v !== loop[0] && loop.length <= nxt.size); }
  if (loop.length !== nxt.size) throw new Error('face: delik birden çok halka');

  // Stereografik düzlem: başın ortasından yüze bakan yön c0 etrafında.
  const C = CENTER, c0 = norm([0, -0.1, 1]), e1 = norm(cross([0, 1, 0], c0)), e2 = cross(c0, e1);
  const toUV = i => {
    const d = norm([P[i * 3] - C[0], P[i * 3 + 1] - C[1], P[i * 3 + 2] - C[2]]);
    const k = 1 + d[0] * c0[0] + d[1] * c0[1] + d[2] * c0[2];
    return [(d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2]) / k, (d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]) / k];
  };
  const radius = i => Math.hypot(P[i * 3] - C[0], P[i * 3 + 1] - C[1], P[i * 3 + 2] - C[2]);
  const fromUV = (u, v, r) => {
    const s = u * u + v * v, d = [0, 1, 2].map(k => (2 * u * e1[k] + 2 * v * e2[k] + (1 - s) * c0[k]) / (1 + s));
    return [C[0] + r * d[0], C[1] + r * d[1], C[2] + r * d[2]];
  };

  // Yarıçap: deliğin çevresindeki üç halkadan ince plaka eğrisi.
  const ring = new Int32Array(nv0).fill(0), samples = []; let front = [];
  loop.forEach(v => { ring[v] = 1; front.push(v); samples.push(v); });
  for (let d = 2; d <= 3; d++) {
    const nf = [];
    front.forEach(v => nb[v].forEach(w => { if (used[w] && !Z[w] && !ring[w]) { ring[w] = d; nf.push(w); samples.push(w); } }));
    front = nf;
  }
  const rOf = tps(samples.map(toUV), samples.map(radius), 1e-8);

  // İç noktalar: altıgen ızgara, kenardan en az 0,6 aralık içeride; sonra birkaç tur gevşetme.
  const poly = loop.map(toUV);
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  poly.forEach(p => { mnx = Math.min(mnx, p[0]); mny = Math.min(mny, p[1]); mxx = Math.max(mxx, p[0]); mxy = Math.max(mxy, p[1]); });
  const inner = [];
  for (let row = 0, y = mny; y <= mxy; row++, y += H * Math.sqrt(3) / 2) {
    for (let x = mnx + (row % 2 ? H / 2 : 0); x <= mxx; x += H) {
      const p = [x, y];
      if (!inPoly(p, poly)) continue;
      let dm = 1e9; for (let k = 0; k < poly.length; k++) dm = Math.min(dm, segDist(p, poly[k], poly[(k + 1) % poly.length]));
      if (dm > 0.6 * H) inner.push(p);
    }
  }
  const pts = poly.concat(inner), nl = poly.length;
  let T = delaunay(pts).filter(t => inPoly([(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3], poly));
  // Kenarın her parçası üçgenlemede olmalı (yoksa yama delikle örtüşmez).
  const tE = new Set(); T.forEach(t => { for (let k = 0; k < 3; k++) tE.add(Math.min(t[k], t[(k + 1) % 3]) + ',' + Math.max(t[k], t[(k + 1) % 3])); });
  for (let k = 0; k < nl; k++) if (!tE.has(Math.min(k, (k + 1) % nl) + ',' + Math.max(k, (k + 1) % nl))) throw new Error('face: kenar parçası üçgenlemede yok');
  // Gevşetme: iç noktalar komşularının ortasına (yalnızca üçgen ters dönmüyorsa).
  const tn = Array.from({ length: pts.length }, () => new Set());
  T.forEach(t => { for (let k = 0; k < 3; k++) { tn[t[k]].add(t[(k + 1) % 3]); tn[t[k]].add(t[(k + 2) % 3]); } });
  const area2 = t => (pts[t[1]][0] - pts[t[0]][0]) * (pts[t[2]][1] - pts[t[0]][1]) - (pts[t[1]][1] - pts[t[0]][1]) * (pts[t[2]][0] - pts[t[0]][0]);
  const sgn = Math.sign(T.reduce((s, t) => s + area2(t), 0));
  const ofV = Array.from({ length: pts.length }, () => []); T.forEach((t, k) => t.forEach(i => ofV[i].push(k)));
  for (let it = 0; it < 30; it++) for (let i = nl; i < pts.length; i++) {
    let sx = 0, sy = 0; tn[i].forEach(j => { sx += pts[j][0]; sy += pts[j][1]; });
    const old = pts[i]; pts[i] = [sx / tn[i].size, sy / tn[i].size];
    if (ofV[i].some(k => Math.sign(area2(T[k])) !== sgn)) pts[i] = old;
  }

  // Yeni köşeler m.P'nin sonuna; üçgenler dışa bakacak şekilde.
  const base = nv0, NP = new Float64Array((nv0 + inner.length) * 3); NP.set(P);
  for (let i = nl; i < pts.length; i++) { const q = fromUV(pts[i][0], pts[i][1], rOf(pts[i])); NP.set(q, (base + i - nl) * 3); }
  const vid = i => (i < nl ? loop[i] : base + i - nl);
  const tris = T.map(t => {
    const [a, b, c] = t.map(vid), pa = NP.subarray(a * 3, a * 3 + 3), pb = NP.subarray(b * 3, b * 3 + 3), pc = NP.subarray(c * 3, c * 3 + 3);
    const n = cross([pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]);
    const o = [(pa[0] + pb[0] + pc[0]) / 3 - C[0], (pa[1] + pb[1] + pc[1]) / 3 - C[1], (pa[2] + pb[2] + pc[2]) / 3 - C[2]];
    return n[0] * o[0] + n[1] * o[1] + n[2] * o[2] >= 0 ? [a, b, c] : [a, c, b];
  });
  // Yeni köşelerin deri ağırlığı: baş kemiği.
  const W = m.W.head || (m.W.head = []);
  for (let i = 0; i < inner.length; i++) W.push([base + i, 1]);
  const removed = m.quads.length - keep.length;
  m.P = NP; m.quads = keep; m.tris = tris;
  return { removed, added: inner.length, tris: tris.length };
}

module.exports = { faceless };
