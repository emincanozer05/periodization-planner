/* Bölge kuralları: mankenin her köşesi 72 bölgeden hangisine düşüyor.

   İki adım:
   1) Parça: MakeHuman'ın deri ağırlıkları köşenin hangi kemiğe bağlı olduğunu
      söylüyor (kol, el, parmak, bacak, ayak, parmak, baş, boyun, gövde).
      Ağırlıklar ağ üzerinde birkaç tur yumuşatılıyor ki parça sınırı
      zikzak yapmasın.
   2) Bölge: parçanın içinde geometriyle — gövdede yükseklik ve gövde eksenine göre
      açı (0° ön, 90° yan, 180° arka), kolda omuzdan bileğe olan mesafe, bacakta
      yükseklik ve bacak eksenine göre açı (dışa doğru pozitif). Eşikler eski
      tüp modelinin bölgeleriyle aynı anlamda; referans görselin düzenine göre
      (göğüs, kaburga, karın, omuz başı…) ayarlandı.

   Sonunda birkaç köşelik adacıklar (bir bölgenin ana parçasından kopmuş
   kırıntılar) komşu bölgeye veriliyor; her bölgenin en büyük parçası kalıyor.

   Koordinatlar metre, y yukarı, +z ön, +x sporcunun SOLU. */
'use strict';
const DEG = 180 / Math.PI;
function S(side, base) { return (side === 'R' ? 'Sağ ' : 'Sol ') + base; }

// Kemik → parça.
function boneGroup(b) {
  const s = /\.L$/.test(b) ? 'L' : (/\.R$/.test(b) ? 'R' : '');
  if (/^finger1-1/.test(b)) return 'thumbBase' + s;          // baş parmağın kökü avuçla birlikte
  if (/^finger/.test(b)) return 'finger' + s;
  if (/^(wrist|metacarpal)/.test(b)) return 'hand' + s;
  if (/^(upperarm|lowerarm)/.test(b)) return 'arm' + s;
  if (/^toe/.test(b)) return 'toe' + s;
  if (/^foot/.test(b)) return 'foot' + s;
  if (/^(upperleg|lowerleg)/.test(b)) return 'leg' + s;
  if (/^neck/.test(b)) return 'neck';
  if (/^(jaw|oris0[5-7]|tongue)/.test(b)) return 'jaw';
  if (/^(head|eye|oculi|orbicularis|oris|levator|risorius|temporalis|special0[1-6])/.test(b)) return 'head';
  if (/^shoulder01/.test(b)) return 'shoulder' + s;
  return 'torso';
}
function neighbors(nv, quads) {
  const nb = Array.from({ length: nv }, () => new Set());
  for (const q of quads) for (let k = 0; k < q.length; k++) { const a = q[k], b = q[(k + 1) % q.length]; nb[a].add(b); nb[b].add(a); }
  return nb.map(s => [...s]);
}
function segments(W, nb, used, iters) {
  const nv = nb.length, acc = {};
  for (const [b, list] of Object.entries(W)) {
    const g = boneGroup(b), f = acc[g] || (acc[g] = new Float64Array(nv));
    for (const [i, w] of list) f[i] += w;
  }
  const G = Object.keys(acc);
  let F = G.map(g => acc[g]);
  for (let it = 0; it < iters; it++) {
    F = F.map(f => {
      const o = new Float64Array(nv);
      for (let i = 0; i < nv; i++) {
        if (!used[i]) continue;
        let s = 0; for (const j of nb[i]) s += f[j];
        o[i] = nb[i].length ? 0.5 * f[i] + 0.5 * s / nb[i].length : f[i];
      }
      return o;
    });
  }
  const seg = new Array(nv);
  for (let i = 0; i < nv; i++) { let b = -1, bi = 0; for (let k = 0; k < G.length; k++) if (F[k][i] > b) { b = F[k][i]; bi = k; } seg[i] = G[bi]; }
  return seg;
}
// Kırık çizgi (omuz → dirsek → bilek → el) üzerinde en yakın nokta: yay boyu.
function onChain(chain, p) {
  let best = { d: 1e9, s: 0 }, acc = 0;
  for (let k = 0; k < chain.length - 1; k++) {
    const a = chain[k], b = chain[k + 1];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, L = Math.sqrt(L2);
    let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2;
    t = Math.max(k === 0 ? -1 : 0, Math.min(k === chain.length - 2 ? 2 : 1, t));
    const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < best.d) best = { d, s: acc + t * L };
    acc += L;
  }
  return best;
}
// Yatay dilimlerde köşelerin (x, z) ortalaması, yumuşatılmış: gövdenin/bacağın ekseni.
function sliceCenters(P, idx, lo, hi, step) {
  const n = Math.round((hi - lo) / step) + 1, sx = new Float64Array(n), sz = new Float64Array(n), c = new Float64Array(n);
  for (const i of idx) { const k = Math.round((P[i * 3 + 1] - lo) / step); if (k < 0 || k >= n) continue; sx[k] += P[i * 3]; sz[k] += P[i * 3 + 2]; c[k]++; }
  const cx = [], cz = [];
  for (let k = 0; k < n; k++) { cx.push(c[k] ? sx[k] / c[k] : NaN); cz.push(c[k] ? sz[k] / c[k] : NaN); }
  function fill(a) {
    for (let k = 0; k < n; k++) if (isNaN(a[k])) {
      let l = k - 1, r = k + 1; while (l >= 0 && isNaN(a[l])) l--; while (r < n && isNaN(a[r])) r++;
      a[k] = l < 0 ? a[r] : r >= n ? a[l] : a[l] + (a[r] - a[l]) * (k - l) / (r - l);
    }
    return a;
  }
  function smooth(a, w) { const o = a.slice(); for (let k = 0; k < n; k++) { let s = 0, m = 0; for (let j = -w; j <= w; j++) if (k + j >= 0 && k + j < n) { s += a[k + j]; m++; } o[k] = s / m; } return o; }
  const X = smooth(fill(cx), 3), Z = smooth(fill(cz), 3);
  return y => { const t = Math.max(0, Math.min(n - 1, (y - lo) / step)), k = Math.min(n - 2, Math.floor(t)), f = t - k; return [X[k] + (X[k + 1] - X[k]) * f, Z[k] + (Z[k + 1] - Z[k]) * f]; };
}

function classify(m) {
  const { P, J, W, quads } = m, nv = P.length / 3;
  const used = new Uint8Array(nv); quads.forEach(q => q.forEach(i => { used[i] = 1; }));
  const nb = neighbors(nv, quads), seg = segments(W, nb, used, 24);
  const j = n => J[n].head, jt = n => J[n].tail;
  const EYE = j('eye.L')[1], KNEE = j('lowerleg01.L')[1], ANKLE = j('foot.L')[1];
  const VN = new Float64Array(nv * 3);
  for (const q of quads) for (let k = 0; k < q.length; k++) {
    const a = q[k], b = q[(k + 1) % q.length], c = q[(k + q.length - 1) % q.length];
    const u = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
    const w = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    VN[a * 3] += u[1] * w[2] - u[2] * w[1]; VN[a * 3 + 1] += u[2] * w[0] - u[0] * w[2]; VN[a * 3 + 2] += u[0] * w[1] - u[1] * w[0];
  }
  for (let i = 0; i < nv; i++) { const l = Math.hypot(VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]) || 1; VN[i * 3] /= l; VN[i * 3 + 1] /= l; VN[i * 3 + 2] /= l; }
  const all = []; for (let i = 0; i < nv; i++) if (used[i]) all.push(i);
  // Gövde ekseni: orta çizgideki ön ve arka yüzeyin ortası.
  const mid = all.filter(i => /^(torso|shoulder)/.test(seg[i]) && Math.abs(P[i * 3]) < 0.04);
  const zFront = sliceCenters(P, mid.filter(i => P[i * 3 + 2] > 0), 0.75, 1.6, 0.01);
  const zBack = sliceCenters(P, mid.filter(i => P[i * 3 + 2] <= 0), 0.75, 1.6, 0.01);
  const legC = { L: sliceCenters(P, all.filter(i => seg[i] === 'legL'), 0.05, 1.0, 0.01),
                 R: sliceCenters(P, all.filter(i => seg[i] === 'legR'), 0.05, 1.0, 0.01) };
  const armChain = s => [j('upperarm01.' + s), j('lowerarm01.' + s), j('wrist.' + s), jt('metacarpal3.' + s)];
  const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const sElbow = s => dist3(j('lowerarm01.' + s), j('upperarm01.' + s));
  const sWrist = s => sElbow(s) + dist3(j('wrist.' + s), j('lowerarm01.' + s));

  // Omuz başı (deltoid): hafif yukarı alınmış omuz ekleminin çevresinde bir küre; altındaki koltuk altı hariç.
  function omuz(x, y, z, side) {
    const S0 = j('upperarm01.' + side), sx = side === 'L' ? 1 : -1;
    const d = Math.hypot(x - (S0[0] + sx * 0.006), y - (S0[1] + 0.022), z - (S0[2] - 0.004));
    if (S0[1] - y > 0.035 && (S0[0] - x) * sx > 0.035) return null;
    return d < 0.098 ? S(side, 'omuz') : null;
  }
  function headRegion(x, y, z, g, n) {
    const th = Math.abs(Math.atan2(x, z - 0.02) * DEG);   // baş ekseni etrafında açı
    if (g === 'neck') return th < 100 ? 'Boyun' : 'Ense';
    if (th >= 118 && y < EYE - 0.055) return 'Ense';      // kafanın arkasının altı
    const mouthY = EYE - 0.068;
    // Çene hattının altı (çene ucunun alt yüzü → çene köşesi) boyna ait.
    const jawY = 1.584 + 0.034 * Math.max(0, Math.min(1, (0.125 - z) / 0.1));
    if (y < jawY && n[1] < -0.2 && th < 95) return 'Boyun';
    // Ağzın içi (dudakların arkası, ağız tabanı) başla kalıyor: dudakta dikiş görünmesin.
    if (Math.abs(x) < 0.032 && y > 1.605 && y < 1.645 && z > 0.12 && n[2] < -0.2) return 'Baş';
    if (Math.abs(x) < 0.036 && y > 1.585 && y < 1.63 && z < 0.15 && z > 0.03 && n[1] > 0.25) return 'Baş';
    // Çene: alt dudağın altındaki kıvrımdan aşağısı, kulağın önü.
    if (y < mouthY - 0.019 - 0.012 * Math.max(0, (th - 20) / 60) && th < 80 && z > -0.01) return 'Çene';
    return 'Baş';
  }
  function torsoRegion(x, y, phi, side) {
    const ab = Math.abs(phi), ax = Math.abs(x);
    const PEC = 1.262, RIB = 1.085, CREST = 0.995;        // göğüs altı, kaburga altı, leğen kemiği
    if (y >= 1.325) {                                      // koltuk altlarının üstü: göğüs | üst sırt
      if (ab < 90) return y >= PEC ? 'Göğüs' : S(side, 'kaburga');
      return 'Üst sırt';
    }
    if (ab >= 122) {                                       // sırt
      if (y >= 1.262) return 'Üst sırt';
      if (y >= RIB) return 'Orta sırt';
      if (y >= CREST) return 'Alt sırt / bel';
      if (ab >= 157 && y >= 0.87) return 'Sakrum / kuyruk sokumu';
      return S(side, 'kalça');
    }
    if (ab >= 90) return y >= CREST ? S(side, 'yan gövde') : S(side, 'kalça');   // yan
    if (y >= PEC) return y >= 1.30 || ax < 0.16 ? 'Göğüs' : S(side, 'yan gövde');
    // Karnın üst yarısı, orta çizgiden ikiye (referans görseldeki "Kaburga").
    if (y >= RIB) return S(side, 'kaburga');
    if (y >= 0.93) return ab < 72 || y >= CREST ? 'Karın' : S(side, 'kalça');
    return ab < 72 ? S(side, 'kasık') : S(side, 'kalça');
  }
  function legRegion(side, y, phi) {
    if (y >= 0.835) {                                      // uyluğun kökü
      if (phi >= -125 && phi < -25) return S(side, 'kasık');
      if (phi >= -25 && phi < 55) return S(side, 'ön uyluk (Quadriceps)');
      return S(side, 'kalça');
    }
    if (y >= KNEE + 0.07) {
      if (phi >= -50 && phi < 50) return S(side, 'ön uyluk (Quadriceps)');
      if (phi >= 50 && phi < 118) return S(side, 'dış uyluk');
      if (phi >= -118 && phi < -50) return S(side, 'iç uyluk (Adductor)');
      return S(side, 'arka uyluk (Hamstring)');
    }
    if (y >= KNEE - 0.06) {
      if (phi >= -45 && phi < 45) return S(side, 'diz önü');
      if (phi >= 45 && phi < 135) return S(side, 'diz dışı');
      if (phi >= -135 && phi < -45) return S(side, 'diz içi');
      return S(side, 'diz arkası');
    }
    if (y >= ANKLE + 0.055) {
      if (phi >= -38 && phi < 42) return S(side, 'ön bacak (Tibialis anterior)');
      if (phi >= 42 && phi < 128) return S(side, 'baldır dışı');
      if (phi >= -128 && phi < -38) return S(side, 'baldır içi');
      return y >= ANKLE + 0.125 ? S(side, 'baldır') : S(side, 'Aşil');
    }
    if (phi >= -55 && phi < 55) return S(side, 'ayak bileği önü');
    if (phi >= 55 && phi < 135) return S(side, 'ayak bileği dışı');
    if (phi >= -135 && phi < -55) return S(side, 'ayak bileği içi');
    return S(side, 'Aşil');
  }
  function footRegion(side, x, y, z) {
    const a = j('foot.' + side), dz = z - a[2];
    if (dz < -0.03 && y < 0.07) return S(side, 'topuk');
    if (y < 0.018) return S(side, 'ayak tabanı');
    if (dz < 0.03) {
      const phi = Math.atan2((x - a[0]) * (side === 'L' ? 1 : -1), dz) * DEG;
      if (Math.abs(phi) < 45) return S(side, 'ayak bileği önü');
      if (Math.abs(phi) > 135) return S(side, 'Aşil');
      return phi > 0 ? S(side, 'ayak bileği dışı') : S(side, 'ayak bileği içi');
    }
    return S(side, 'ayak üstü');
  }

  const reg = new Array(nv).fill(null);
  for (const i of all) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], n = [VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]];
    const side = x > 0 ? 'L' : 'R';
    let g = seg[i];
    // Boyun kemikleri trapezin üstünü de çekiyor; boyun bir silindir olarak kalsın.
    if (g === 'neck' && Math.abs(x) > 0.064 && y < 1.56) g = 'torso';
    if (g === 'head' || g === 'jaw' || g === 'neck') reg[i] = headRegion(x, y, z, g, n);
    else if (/^(torso|shoulder)/.test(g)) {
      const phi = Math.atan2(x, z - (zFront(y)[1] + zBack(y)[1]) / 2) * DEG;
      reg[i] = omuz(x, y, z, side) || torsoRegion(x, y, phi, side);
    } else if (/^(arm|hand|thumbBase)/.test(g)) {
      const s = g.slice(-1), c = onChain(armChain(s), [x, y, z]), se = sElbow(s), sw = sWrist(s);
      if ((c.s < 0.11 && omuz(x, y, z, s)) || c.s < 0.06) reg[i] = S(s, 'omuz');
      else if (c.s < se - 0.04) reg[i] = S(s, 'üst kol');
      else if (c.s < se + 0.04) reg[i] = S(s, 'dirsek');
      else if (c.s < sw - 0.035) reg[i] = S(s, 'ön kol');
      else if (c.s < sw + 0.022) reg[i] = S(s, 'el bileği');
      else reg[i] = S(s, 'el');
    } else if (/^finger/.test(g)) reg[i] = S(g.slice(-1), 'parmaklar');
    else if (/^leg/.test(g)) {
      const s = g.slice(-1), c = legC[s](y);
      reg[i] = legRegion(s, y, Math.atan2((x - c[0]) * (s === 'L' ? 1 : -1), z - c[1]) * DEG);
    } else if (/^foot/.test(g)) reg[i] = footRegion(g.slice(-1), x, y, z);
    else if (/^toe/.test(g)) reg[i] = S(g.slice(-1), 'ayak parmakları');
  }

  // Adacıklar: bir bölgenin ana parçasından kopmuş 30 köşeden küçük kırıntılar komşuya.
  for (let pass = 0; pass < 4; pass++) {
    const comp = new Int32Array(nv).fill(-1), comps = [];
    for (const s0 of all) {
      if (comp[s0] >= 0) continue;
      const stack = [s0], list = []; comp[s0] = comps.length;
      while (stack.length) {
        const v = stack.pop(); list.push(v);
        for (const w of nb[v]) if (comp[w] < 0 && reg[w] === reg[v]) { comp[w] = comps.length; stack.push(w); }
      }
      comps.push(list);
    }
    const biggest = {};
    comps.forEach((list, c) => { const r = reg[list[0]]; if (biggest[r] == null || list.length > comps[biggest[r]].length) biggest[r] = c; });
    let changed = 0;
    comps.forEach((list, c) => {
      const r = reg[list[0]];
      if (biggest[r] === c || list.length >= 30) return;
      const cnt = {};
      for (const v of list) for (const w of nb[v]) if (reg[w] !== r) cnt[reg[w]] = (cnt[reg[w]] || 0) + 1;
      let best = null, bc = 0; for (const [k, c2] of Object.entries(cnt)) if (c2 > bc) { bc = c2; best = k; }
      if (best) { for (const v of list) reg[v] = best; changed++; }
    });
    if (!changed) break;
  }
  return { reg, seg, used };
}

module.exports = { classify };
