/* ═══════════════════════════════════════════════════════════════════════════
   AĞRI HARİTASI — 3D vücut modeli (Wellness formu)

   Sporcu ağrıyan bölgeyi bir tablodan değil, çevirebildiği bir 3D manken
   üzerinden seçiyor. Bu dosya iki şey taşıyor:

     1) BÖLGE KATALOĞU (PainBody.REGIONS). Her bölgenin anahtarı Türkçe adı —
        gönderime o ad gidiyor (`painMap: {'Sağ diz önü': 2}`), çünkü koçun
        uygulamasındaki ısı haritası, bireyselleştirme etiketleri ve uyarı
        bildirimi bölgeyi adıyla okuyor. İngilizce yalnızca ekrandaki karşılığı.

     2) MODELİN KENDİSİ (PainBody.create). Hazır bir 3D dosya indirilmiyor; manken
        birkaç pürüzsüz "tüp"ten burada kuruluyor: baştan kasığa tek bir gövde,
        iki bacak, iki kol, eller, ayaklar, parmaklar. Her tüp yükseklik × çevre
        açısıyla tarif ediliyor ve bir bölge o düzlemde bir dikdörtgen: "sol
        bacakta, 0.445–0.575 m arası, iç taraf" = Sol diz içi. Izgaranın çizgileri
        bölge sınırlarından geçecek şekilde örneklendiği için her üçgen tam olarak
        bir bölgeye düşüyor; dokunulan üçgen de doğrudan bölgeyi söylüyor.

   Koordinatlar metre; sporcu +z yönüne (ekrana) bakıyor, y yukarı. Sporcunun
   SAĞI -x tarafında — karşıdan bakan kişinin solunda. Modelin yanındaki SAĞ / SOL
   etiketleri bu yüzden var: öndeyken sporcunun sağ kolu ekranın solunda durur.

   Three.js yalnızca Wellness formu açılınca, CDN'den modül olarak yükleniyor.
   Yüklenemezse (eski tarayıcı, WebGL yok, ağ yok) form bölgeyi listeden seçtiriyor;
   katalog bu dosyada olduğu için liste her durumda çalışıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

  /* ── Bölge kataloğu ───────────────────────────────────────────────────────
     Sıra, formdaki listenin ve seçim açılır kutusunun sırası. `g` bölge grubu
     (listede başlık), `s` taraf (R sağ / L sol / yok). */
  var GROUPS = [
    { id: 'head',  tr: 'Baş ve boyun',   en: 'Head & neck' },
    { id: 'arm',   tr: 'Omuz ve kollar', en: 'Shoulders & arms' },
    { id: 'trunk', tr: 'Gövde',          en: 'Trunk' },
    { id: 'hip',   tr: 'Kalça ve kasık', en: 'Hips & groin' },
    { id: 'thigh', tr: 'Uyluk',          en: 'Thigh' },
    { id: 'knee',  tr: 'Diz',            en: 'Knee' },
    { id: 'lower', tr: 'Alt bacak',      en: 'Lower leg' },
    { id: 'ankle', tr: 'Ayak bileği',    en: 'Ankle' },
    { id: 'foot',  tr: 'Ayak',           en: 'Foot' }
  ];
  var REGIONS = [];
  function one(tr, en, g) { REGIONS.push({ k: tr, en: en, g: g, s: null }); }
  function two(tr, en, g) {
    REGIONS.push({ k: 'Sağ ' + tr, en: 'Right ' + en, g: g, s: 'R' });
    REGIONS.push({ k: 'Sol ' + tr, en: 'Left ' + en, g: g, s: 'L' });
  }
  one('Baş', 'Head', 'head');
  one('Çene', 'Jaw', 'head');
  one('Boyun', 'Neck', 'head');
  one('Ense', 'Back of neck', 'head');
  two('omuz', 'shoulder', 'arm');
  two('üst kol', 'upper arm', 'arm');
  two('dirsek', 'elbow', 'arm');
  two('ön kol', 'forearm', 'arm');
  two('el bileği', 'wrist', 'arm');
  two('el', 'hand', 'arm');
  two('parmaklar', 'fingers', 'arm');
  one('Göğüs', 'Chest', 'trunk');
  two('kaburga', 'ribs', 'trunk');
  one('Üst sırt', 'Upper back', 'trunk');
  one('Orta sırt', 'Mid back', 'trunk');
  one('Alt sırt / bel', 'Lower back', 'trunk');
  two('yan gövde', 'flank', 'trunk');
  one('Karın', 'Abdomen', 'trunk');
  two('kalça', 'hip', 'hip');
  two('kasık', 'groin', 'hip');
  one('Sakrum / kuyruk sokumu', 'Sacrum / tailbone', 'hip');
  two('ön uyluk (Quadriceps)', 'front thigh (Quadriceps)', 'thigh');
  two('arka uyluk (Hamstring)', 'back thigh (Hamstring)', 'thigh');
  two('iç uyluk (Adductor)', 'inner thigh (Adductor)', 'thigh');
  two('dış uyluk', 'outer thigh', 'thigh');
  two('diz önü', 'front of knee', 'knee');
  two('diz arkası', 'back of knee', 'knee');
  two('diz içi', 'inner knee', 'knee');
  two('diz dışı', 'outer knee', 'knee');
  two('ön bacak (Tibialis anterior)', 'shin (Tibialis anterior)', 'lower');
  two('baldır', 'calf', 'lower');
  two('baldır içi', 'inner calf', 'lower');
  two('baldır dışı', 'outer calf', 'lower');
  two('ayak bileği önü', 'front of ankle', 'ankle');
  two('ayak bileği içi', 'inner ankle', 'ankle');
  two('ayak bileği dışı', 'outer ankle', 'ankle');
  two('Aşil', 'Achilles', 'ankle');
  two('topuk', 'heel', 'foot');
  two('ayak tabanı', 'sole', 'foot');
  two('ayak üstü', 'top of foot', 'foot');
  two('ayak parmakları', 'toes', 'foot');

  var BY_KEY = {}, INDEX = {};
  REGIONS.forEach(function (r, i) { BY_KEY[r.k] = r; INDEX[r.k] = i; });
  // Taraflı bölgenin anahtarı: S('R', 'diz önü') → 'Sağ diz önü'.
  function S(side, base) { return (side === 'R' ? 'Sağ ' : 'Sol ') + base; }

  /* ── Yardımcı matematik ─────────────────────────────────────────────────── */
  var DEG = Math.PI / 180;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function wrapPi(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }
  function spow(v, p) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), p); }

  /* Taşmayan kübik ara değerleme (Fritsch–Carlson). Anahtar noktalar arasında
     yarıçap yumuşak geçsin ama iki nokta arasında olmayan bir şişkinlik ya da
     çukur üretmesin — sıradan bir spline dizin altında kasıntı yapabiliyordu. */
  function monotone(xs, ys) {
    var n = xs.length, d = [], m = new Array(n), i;
    if (n === 1) return function () { return ys[0]; };
    for (i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { var t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      var lo = 0, hi = n - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] > x) hi = mid; else lo = mid; }
      var h = xs[hi] - xs[lo], t = (x - xs[lo]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] +
             (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * m[hi];
    };
  }

  /* ── Tüp tarifi → ızgara ───────────────────────────────────────────────────
     Bir tüp, bir eksen boyunca (a: dikey parçalarda y, ayakta z) dizilmiş anahtar
     kesitlerden oluşuyor. Her kesit:
       [a, o1, o2, rl, rm, rf, rb, e]
         o1, o2  kesit merkezinin diğer iki koordinatı (dikeyde x,z · ayakta x,y);
                 x, SOL taraf için yazılıyor, sağ taraf aynalanıyor
         rl, rm  dış (lateral) ve iç (medial) yarıçap — baldırın iç kası dıştan dolgun
         rf, rb  ön ve arka yarıçap (ayakta üst ve alt)
         e       kesitin köşeliliği: 2 elips, büyüdükçe gövde gibi kare-yumuşak
     Kesitin açısı θ: 0 önde (ayakta üstte), +90° +x tarafında. φ ise "dışa doğru
     pozitif" açı: sol uzuvda φ=θ, sağda φ=-θ — böylece bir bölge tarifi (ör. dış
     uyluk 50°–118°) iki tarafta da aynı yazılıyor. Gövdede φ=θ, yani φ>0 sporcunun
     solu. */
  function tubeGrid(spec) {
    var side = spec.side || null, sg = side === 'R' ? -1 : 1;
    var keys = spec.keys.slice().sort(function (p, q) { return p[0] - q[0]; });
    var A = keys.map(function (k) { return k[0]; });
    function col(i, def) { return keys.map(function (k) { return k[i] == null ? def : k[i]; }); }
    var fo1 = monotone(A, col(1, 0).map(function (v) { return v * sg; }));
    var fo2 = monotone(A, col(2, 0));
    var frl = monotone(A, col(3, 0)), frm = monotone(A, col(4, 0));
    var frf = monotone(A, col(5, 0)), frb = monotone(A, col(6, 0));
    var fe = monotone(A, col(7, 2));
    var axisZ = spec.axis === 'z';
    // Yol yönü: dikey tüpler yukarıdan aşağı (a azalıyor), ayak topuktan parmağa.
    var aStart = axisZ ? A[0] : A[A.length - 1], aEnd = axisZ ? A[A.length - 1] : A[0];
    var dir = aEnd > aStart ? 1 : -1;
    function center(a) {
      return axisZ ? [fo1(a), fo2(a), a] : [fo1(a), a, fo2(a)];
    }
    function rmax(a) { return Math.max(frl(a), frm(a), frf(a), frb(a)); }

    // Satırlar: yüzey boyunca (yarıçap değişimi de sayılarak) eşit aralıklı, üstüne
    // bölge sınırları. Uçlardaki kapaklar böylece düz kesilmiş gibi görünmüyor.
    var FINE = 600, cum = [0], as = [aStart], prevC = center(aStart), prevR = rmax(aStart), i;
    for (i = 1; i <= FINE; i++) {
      var a = aStart + (aEnd - aStart) * i / FINE, c = center(a), r = rmax(a);
      var dx = c[0] - prevC[0], dy = c[1] - prevC[1], dz = c[2] - prevC[2], dr = r - prevR;
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz + dr * dr));
      as.push(a); prevC = c; prevR = r;
    }
    var total = cum[FINE], nRows = spec.rows || 60, rows = [], k = 0;
    for (i = 0; i <= nRows; i++) {
      var target = total * i / nRows;
      while (k < FINE && cum[k + 1] < target) k++;
      var seg = cum[k + 1] - cum[k], f = seg > 0 ? (target - cum[k]) / seg : 0;
      rows.push(as[k] + (as[Math.min(FINE, k + 1)] - as[k]) * f);
    }
    (spec.aBreaks || []).forEach(function (b) {
      if ((b - aStart) * dir > 0 && (aEnd - b) * dir > 0) rows.push(b);
    });
    rows.sort(function (p, q) { return (p - q) * dir; });
    rows = rows.filter(function (v, j) { return j === 0 || Math.abs(v - rows[j - 1]) > 0.0005; });

    // Sütunlar: çevre boyunca eşit aralık + bölge sınırlarının açıları.
    var nCols = spec.cols || 40, cols = [];
    for (i = 0; i < nCols; i++) cols.push(-Math.PI + 2 * Math.PI * i / nCols);
    (spec.thBreaks || []).forEach(function (deg) { cols.push(wrapPi(deg * DEG * sg)); });
    cols.sort(function (p, q) { return p - q; });
    cols = cols.filter(function (v, j) { return j === 0 || v - cols[j - 1] > 0.004; });
    if (cols[cols.length - 1] - cols[0] > 2 * Math.PI - 0.004) cols.pop();

    var nr = rows.length, nc = cols.length;
    var pos = new Float32Array(nr * nc * 3);
    var ref = spec.ref || (axisZ ? [0, 1, 0] : [0, 0, 1]);
    for (i = 0; i < nr; i++) {
      var a0 = rows[i], C = center(a0);
      var h = 0.0008 * dir, C1 = center(a0 + h), C0 = center(a0 - h);
      var T = [C1[0] - C0[0], C1[1] - C0[1], C1[2] - C0[2]];
      var tl = Math.hypot(T[0], T[1], T[2]) || 1; T = [T[0] / tl, T[1] / tl, T[2] / tl];
      var rd = ref[0] * T[0] + ref[1] * T[1] + ref[2] * T[2];
      var F = [ref[0] - T[0] * rd, ref[1] - T[1] * rd, ref[2] - T[2] * rd];
      var fl = Math.hypot(F[0], F[1], F[2]) || 1; F = [F[0] / fl, F[1] / fl, F[2] / fl];
      var Sx = [F[1] * T[2] - F[2] * T[1], F[2] * T[0] - F[0] * T[2], F[0] * T[1] - F[1] * T[0]];
      var rl = frl(a0), rm = frm(a0), rf = frf(a0), rb = frb(a0), e = fe(a0);
      // +x tarafının yarıçapı: sol uzuvda dış, sağ uzuvda iç.
      var rPos = side === 'R' ? rm : rl, rNeg = side === 'R' ? rl : rm;
      for (var j = 0; j < nc; j++) {
        var th = cols[j], s = Math.sin(th), c = Math.cos(th);
        var rx = rNeg + (rPos - rNeg) * (1 + s) / 2;
        var rz = rb + (rf - rb) * (1 + c) / 2;
        var X = rx * spow(s, 2 / e), Z = rz * spow(c, 2 / e);
        var o = (i * nc + j) * 3;
        pos[o] = C[0] + Sx[0] * X + F[0] * Z;
        pos[o + 1] = C[1] + Sx[1] * X + F[1] * Z;
        pos[o + 2] = C[2] + Sx[2] * X + F[2] * Z;
      }
    }
    // Her dörtgenin bölgesi, merkezinin (a, φ) değerinden.
    var quad = new Int16Array((nr - 1) * nc);
    for (i = 0; i < nr - 1; i++) {
      var am = (rows[i] + rows[i + 1]) / 2;
      for (j = 0; j < nc; j++) {
        var t0 = cols[j], t1 = j + 1 < nc ? cols[j + 1] : cols[0] + 2 * Math.PI;
        var phi = wrapPi((t0 + t1) / 2) * sg / DEG;
        var key = spec.region(am, phi);
        var idx = INDEX[key];
        if (idx == null) throw new Error('PainBody: bilinmeyen bölge ' + key);
        quad[i * nc + j] = idx;
      }
    }
    return { pos: pos, nr: nr, nc: nc, quad: quad };
  }

  /* Uçları yuvarlak küçük tüp (parmak, burun, kulak, diz kapağı…). `path(t)` 0→1
     boyunca [a, o1, o2], `rad(t)` [rl, rm, rf, rb]; uçlar kendiliğinden kapanıyor. */
  function capsule(n, path, rad, cap0, cap1) {
    var keys = [], p0 = path(0), p1 = path(1);
    var len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    for (var k = 0; k < n; k++) {
      var t = (1 - Math.cos(Math.PI * k / (n - 1))) / 2;
      var p = path(t), r = rad(t);
      var u0 = (t * len) / cap0, u1 = ((1 - t) * len) / cap1;
      var f = Math.min(u0 >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - u0) * (1 - u0))),
                       u1 >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - u1) * (1 - u1))));
      f = Math.max(f, 0.06);
      keys.push([p[0], p[1], p[2], r[0] * f, r[1] * f, r[2] * f, r[3] * f, 2]);
    }
    return keys;
  }
  // Eksene hizalı elipsoit: merkez (dikeyde x,y,z), yarı eksenler.
  function blobKeys(cx, cy, cz, rx, ry, rz) {
    return capsule(15, function (t) { return [cy + ry - 2 * ry * t, cx, cz]; },
      function () { return [rx, rx, rz, rz]; }, ry, ry);
  }

  /* ── Mankenin ölçüleri ──────────────────────────────────────────────────── */
  // Baştan kasığa tek parça: baş, yüz, boyun, omuz kuşağı, göğüs, bel, kalça.
  var TORSO = [
    // y      x  z       rl    rm    rf    rb    e
    [1.805, 0, 0.004, 0.004, 0.004, 0.004, 0.004, 2],
    [1.797, 0, 0.004, 0.034, 0.034, 0.042, 0.044, 2],
    [1.778, 0, 0.004, 0.057, 0.057, 0.070, 0.073, 2],
    [1.748, 0, 0.004, 0.071, 0.071, 0.087, 0.091, 2],
    [1.712, 0, 0.004, 0.078, 0.078, 0.094, 0.098, 2],
    [1.672, 0, 0.005, 0.077, 0.077, 0.096, 0.096, 2.2],
    [1.636, 0, 0.009, 0.071, 0.071, 0.094, 0.084, 2.3],
    [1.606, 0, 0.013, 0.062, 0.062, 0.088, 0.064, 2.2],
    [1.588, 0, 0.012, 0.050, 0.050, 0.079, 0.056, 2.1],
    [1.572, 0, -0.006, 0.050, 0.050, 0.052, 0.058, 2],
    [1.540, 0, -0.012, 0.054, 0.054, 0.050, 0.058, 2],
    [1.502, 0, -0.016, 0.060, 0.060, 0.052, 0.062, 2],
    [1.477, 0, -0.016, 0.090, 0.090, 0.060, 0.070, 2.2],
    [1.452, 0, -0.012, 0.138, 0.138, 0.076, 0.080, 2.4],
    [1.422, 0, -0.008, 0.162, 0.162, 0.095, 0.090, 2.5],
    [1.380, 0, -0.004, 0.166, 0.166, 0.110, 0.098, 2.5],
    [1.300, 0, 0.000, 0.158, 0.158, 0.121, 0.102, 2.45],
    [1.220, 0, 0.000, 0.148, 0.148, 0.116, 0.099, 2.4],
    [1.140, 0, 0.000, 0.136, 0.136, 0.104, 0.093, 2.35],
    [1.060, 0, 0.002, 0.127, 0.127, 0.094, 0.086, 2.3],
    [1.000, 0, 0.002, 0.131, 0.131, 0.093, 0.090, 2.3],
    [0.950, 0, -0.002, 0.150, 0.150, 0.096, 0.106, 2.35],
    [0.900, 0, -0.006, 0.166, 0.166, 0.093, 0.124, 2.35],
    [0.860, 0, -0.008, 0.163, 0.163, 0.083, 0.122, 2.3],
    [0.820, 0, -0.012, 0.135, 0.135, 0.060, 0.098, 2.2],
    [0.790, 0, -0.010, 0.080, 0.080, 0.035, 0.050, 2],
    [0.772, 0, -0.010, 0.006, 0.006, 0.006, 0.006, 2]
  ];
  var TORSO_A = [1.628, 1.572, 1.482, 1.38, 1.26, 1.22, 1.15, 1.06, 0.975, 0.985, 0.925, 0.865];
  var TORSO_T = [0, 20, -20, 22, -22, 45, -45, 48, -48, 60, -60, 70, -70, 80, -80, 88, -88,
                 105, -105, 112, -112, 120, -120, 128, -128, 160, -160];
  function torsoRegion(y, phi) {
    var ab = Math.abs(phi), side = phi > 0 ? 'L' : 'R';
    if (y >= 1.628) return 'Baş';
    if (y >= 1.572) return ab < 80 ? 'Çene' : 'Baş';
    if (y >= 1.482) return ab < 105 ? 'Boyun' : 'Ense';
    if (y >= 1.38) return ab < 48 ? 'Göğüs' : (ab < 128 ? S(side, 'omuz') : 'Üst sırt');
    if (y >= 1.26) return ab < 60 ? 'Göğüs' : (ab < 120 ? S(side, 'yan gövde') : 'Üst sırt');
    if (y >= 1.06) {
      if (ab >= 120) return y >= 1.26 ? 'Üst sırt' : 'Orta sırt';
      if (ab >= 88) return S(side, 'yan gövde');
      if (y >= 1.22) return ab < 60 ? 'Göğüs' : S(side, 'yan gövde');
      if (ab < 20) return y >= 1.15 ? 'Göğüs' : 'Karın';
      return S(side, 'kaburga');
    }
    if (y >= 0.975) {
      if (ab >= 160 && y < 0.985) return 'Sakrum / kuyruk sokumu';
      return ab < 88 ? 'Karın' : (ab < 120 ? S(side, 'yan gövde') : 'Alt sırt / bel');
    }
    // Leğen kuşağı.
    if (ab >= 160 && y >= 0.865) return 'Sakrum / kuyruk sokumu';
    if (ab >= 70) return S(side, 'kalça');
    if (ab < 45 && y >= 0.925) return 'Karın';
    return S(side, 'kasık');
  }

  // Bacak: kalça ekleminden ayak bileğine tek parça (sol taraf; sağ aynalanıyor).
  var LEG = [
    // y      x      z       rl     rm     rf     rb
    [0.975, 0.096, 0.000, 0.012, 0.012, 0.012, 0.012],
    [0.962, 0.097, 0.000, 0.045, 0.052, 0.052, 0.045],
    [0.935, 0.098, 0.000, 0.058, 0.078, 0.080, 0.064],
    [0.895, 0.100, 0.000, 0.068, 0.088, 0.092, 0.080],
    [0.840, 0.102, 0.000, 0.086, 0.088, 0.096, 0.094],
    [0.760, 0.105, 0.004, 0.087, 0.082, 0.089, 0.083],
    [0.660, 0.108, 0.005, 0.074, 0.074, 0.077, 0.070],
    [0.580, 0.111, 0.004, 0.059, 0.063, 0.061, 0.056],
    [0.520, 0.113, 0.004, 0.052, 0.054, 0.052, 0.050],
    [0.470, 0.114, 0.001, 0.049, 0.051, 0.046, 0.051],
    [0.420, 0.116, -0.004, 0.050, 0.056, 0.042, 0.062],
    [0.360, 0.118, -0.006, 0.050, 0.058, 0.040, 0.066],
    [0.280, 0.120, -0.005, 0.043, 0.047, 0.036, 0.050],
    [0.200, 0.122, -0.006, 0.035, 0.037, 0.031, 0.036],
    [0.130, 0.123, -0.008, 0.030, 0.031, 0.028, 0.029],
    [0.085, 0.124, -0.008, 0.031, 0.031, 0.030, 0.030],
    [0.060, 0.124, -0.008, 0.028, 0.028, 0.026, 0.026],
    [0.044, 0.124, -0.008, 0.008, 0.008, 0.008, 0.008]
  ];
  var LEG_A = [0.835, 0.575, 0.445, 0.21, 0.14];
  var LEG_T = [-25, 55, 125, -125, -50, 50, 118, -118, -45, 45, 135, -135,
               -38, 42, 128, -128, -55];
  function legRegion(side) {
    return function (y, phi) {
      if (y >= 0.835) {
        if (phi >= -125 && phi < -25) return S(side, 'kasık');
        if (phi >= -25 && phi < 55) return S(side, 'ön uyluk (Quadriceps)');
        return S(side, 'kalça');
      }
      if (y >= 0.575) {
        if (phi >= -50 && phi < 50) return S(side, 'ön uyluk (Quadriceps)');
        if (phi >= 50 && phi < 118) return S(side, 'dış uyluk');
        if (phi >= -118 && phi < -50) return S(side, 'iç uyluk (Adductor)');
        return S(side, 'arka uyluk (Hamstring)');
      }
      if (y >= 0.445) {
        if (phi >= -45 && phi < 45) return S(side, 'diz önü');
        if (phi >= 45 && phi < 135) return S(side, 'diz dışı');
        if (phi >= -135 && phi < -45) return S(side, 'diz içi');
        return S(side, 'diz arkası');
      }
      if (y >= 0.14) {
        if (phi >= -38 && phi < 42) return S(side, 'ön bacak (Tibialis anterior)');
        if (phi >= 42 && phi < 128) return S(side, 'baldır dışı');
        if (phi >= -128 && phi < -38) return S(side, 'baldır içi');
        return y >= 0.21 ? S(side, 'baldır') : S(side, 'Aşil');
      }
      if (phi >= -55 && phi < 55) return S(side, 'ayak bileği önü');
      if (phi >= 55 && phi < 135) return S(side, 'ayak bileği dışı');
      if (phi >= -135 && phi < -55) return S(side, 'ayak bileği içi');
      return S(side, 'Aşil');
    };
  }

  // Kol: omuz başından bileğe; hafif açık duruş, avuç içi gövdeye bakıyor.
  var ARM = [
    // y      x      z       rl     rm     rf     rb
    [1.474, 0.170, -0.004, 0.008, 0.008, 0.008, 0.008],
    [1.463, 0.176, -0.004, 0.038, 0.032, 0.038, 0.038],
    [1.432, 0.184, -0.004, 0.054, 0.044, 0.053, 0.053],
    [1.392, 0.191, -0.004, 0.054, 0.044, 0.051, 0.052],
    [1.340, 0.202, -0.004, 0.048, 0.042, 0.046, 0.047],
    [1.250, 0.223, -0.004, 0.042, 0.040, 0.045, 0.044],
    [1.170, 0.236, -0.004, 0.036, 0.035, 0.036, 0.038],
    [1.120, 0.245, -0.006, 0.036, 0.036, 0.034, 0.040],
    [1.070, 0.253, -0.004, 0.040, 0.038, 0.040, 0.036],
    [0.990, 0.266, 0.000, 0.036, 0.034, 0.034, 0.032],
    [0.910, 0.279, 0.002, 0.026, 0.024, 0.028, 0.026],
    [0.870, 0.286, 0.002, 0.020, 0.019, 0.027, 0.024],
    [0.852, 0.289, 0.002, 0.018, 0.018, 0.024, 0.022],
    [0.838, 0.290, 0.002, 0.006, 0.006, 0.006, 0.006]
  ];
  var ARM_A = [1.345, 1.155, 1.075, 0.905];
  function armRegion(side) {
    return function (y) {
      if (y >= 1.345) return S(side, 'omuz');
      if (y >= 1.155) return S(side, 'üst kol');
      if (y >= 1.075) return S(side, 'dirsek');
      if (y >= 0.905) return S(side, 'ön kol');
      return S(side, 'el bileği');
    };
  }
  // Avuç: ince (x) ve geniş (z) bir yaprak; baş parmak önde.
  var PALM = [
    [0.872, 0.289, 0.004, 0.006, 0.006, 0.006, 0.006],
    [0.862, 0.290, 0.004, 0.016, 0.016, 0.026, 0.024],
    [0.842, 0.292, 0.004, 0.017, 0.017, 0.036, 0.034],
    [0.810, 0.294, 0.004, 0.016, 0.016, 0.042, 0.040],
    [0.780, 0.296, 0.004, 0.015, 0.015, 0.043, 0.041],
    [0.764, 0.297, 0.004, 0.013, 0.013, 0.038, 0.037],
    [0.752, 0.297, 0.004, 0.005, 0.005, 0.010, 0.010]
  ];
  // Parmaklar: [z, uzunluk, yarıçap]; işaret parmağı önde, serçe arkada.
  var FINGERS = [[0.028, 0.074, 0.0088], [0.009, 0.082, 0.0092], [-0.010, 0.077, 0.0088], [-0.028, 0.061, 0.0078]];

  // Ayak: topuktan parmak köküne (a = z). o1 = x, o2 = y; rf üst, rb alt yarıçap.
  var FOOT = [
    // z       x      y      rl     rm     rf     rb
    [-0.068, 0.124, 0.042, 0.006, 0.006, 0.006, 0.006],
    [-0.058, 0.124, 0.043, 0.025, 0.025, 0.028, 0.034],
    [-0.035, 0.124, 0.047, 0.032, 0.032, 0.040, 0.042],
    [0.010, 0.125, 0.054, 0.036, 0.037, 0.046, 0.049],
    [0.060, 0.128, 0.046, 0.042, 0.042, 0.036, 0.041],
    [0.110, 0.132, 0.031, 0.047, 0.047, 0.024, 0.026],
    [0.140, 0.134, 0.025, 0.044, 0.045, 0.018, 0.020],
    [0.156, 0.135, 0.024, 0.012, 0.012, 0.008, 0.008]
  ];
  var FOOT_A = [-0.012, 0.03];
  var FOOT_T = [45, -45, 112, -112];
  function footRegion(side) {
    return function (z, phi) {
      var ab = Math.abs(phi);
      if (z < -0.012) return S(side, 'topuk');
      if (ab >= 112) return S(side, 'ayak tabanı');
      if (z < 0.03) {
        if (ab < 45) return S(side, 'ayak bileği önü');
        return phi > 0 ? S(side, 'ayak bileği dışı') : S(side, 'ayak bileği içi');
      }
      return S(side, 'ayak üstü');
    };
  }
  // Ayak parmakları: [dışa kayma, uç z, yarıçap]; baş parmak içte.
  var TOES = [[-0.026, 0.192, 0.0132], [-0.004, 0.184, 0.0092], [0.011, 0.177, 0.0086],
              [0.024, 0.170, 0.0080], [0.036, 0.161, 0.0074]];

  /* Bütün parçaların tarifleri. `side` verilen parçada x aynalanıyor. */
  function bodySpecs() {
    var out = [];
    out.push({ name: 'torso', keys: TORSO, rows: 150, cols: 88, aBreaks: TORSO_A, thBreaks: TORSO_T, region: torsoRegion });
    // Yüzü belli eden iki işaret: burun ve kulaklar. Öndeyken hangi yöne bakıldığı
    // ilk bakışta anlaşılsın diye.
    out.push({ name: 'nose', keys: capsule(13, function (t) { return [1.668 - 0.036 * t, 0, 0.097 + 0.012 * t]; },
      function () { return [0.012, 0.012, 0.014, 0.010]; }, 0.012, 0.011), rows: 16, cols: 18, region: function () { return 'Baş'; } });
    ['L', 'R'].forEach(function (side) {
      out.push({ name: 'ear' + side, side: side, keys: blobKeys(0.076, 1.662, -0.004, 0.011, 0.029, 0.017),
        rows: 16, cols: 16, region: function () { return 'Baş'; } });
      out.push({ name: 'leg' + side, side: side, keys: LEG, rows: 120, cols: 56, aBreaks: LEG_A, thBreaks: LEG_T, region: legRegion(side) });
      // Diz kapağı ve ayak bileği kemik çıkıntıları: bölgelerin yerini gösteren işaretler.
      out.push({ name: 'patella' + side, side: side, keys: blobKeys(0.113, 0.505, 0.044, 0.030, 0.036, 0.016),
        rows: 16, cols: 18, region: function () { return S(side, 'diz önü'); } });
      out.push({ name: 'malL' + side, side: side, keys: blobKeys(0.124 + 0.026, 0.082, -0.012, 0.011, 0.015, 0.013),
        rows: 12, cols: 14, region: function () { return S(side, 'ayak bileği dışı'); } });
      out.push({ name: 'malM' + side, side: side, keys: blobKeys(0.124 - 0.026, 0.09, -0.004, 0.011, 0.015, 0.013),
        rows: 12, cols: 14, region: function () { return S(side, 'ayak bileği içi'); } });
      out.push({ name: 'arm' + side, side: side, keys: ARM, rows: 100, cols: 40, aBreaks: ARM_A, region: armRegion(side) });
      out.push({ name: 'palm' + side, side: side, keys: PALM, rows: 24, cols: 32, aBreaks: [0.842],
        region: function (y) { return y >= 0.842 ? S(side, 'el bileği') : S(side, 'el'); } });
      FINGERS.forEach(function (f, n) {
        var z0 = f[0], len = f[1], r = f[2];
        out.push({ name: 'finger' + side + n, side: side, rows: 18, cols: 14,
          keys: capsule(11, function (t) {
            // Hafif kıvrık: uca doğru avuç içine (içe) ve biraz öne.
            return [0.768 - len * t, 0.296 - 0.010 * t * t, z0 + 0.004 * t];
          }, function (t) { var q = r * (1 - 0.18 * t); return [q, q, q, q]; }, r, r * 0.9),
          region: function () { return S(side, 'parmaklar'); } });
      });
      out.push({ name: 'thumb' + side, side: side, rows: 18, cols: 14,
        keys: capsule(11, function (t) { return [0.846 - 0.07 * t, 0.286 - 0.010 * t, 0.030 + 0.030 * t]; },
          function (t) { var q = 0.0115 * (1 - 0.2 * t); return [q, q, q, q]; }, 0.011, 0.009),
        region: function () { return S(side, 'parmaklar'); } });
      out.push({ name: 'foot' + side, side: side, axis: 'z', keys: FOOT, rows: 60, cols: 40, aBreaks: FOOT_A, thBreaks: FOOT_T,
        region: footRegion(side) });
      TOES.forEach(function (tt, n) {
        var dx = tt[0], zt = tt[1], r = tt[2];
        out.push({ name: 'toe' + side + n, side: side, axis: 'z', rows: 14, cols: 14,
          keys: capsule(9, function (t) {
            var z = 0.12 + (zt - 0.12) * t;
            // Ayak hafif dışa açık: parmakların x'i ileri gittikçe dışa kayıyor.
            return [z, 0.135 + dx + 0.10 * (z - 0.12), 0.018 - 0.004 * t];
          }, function (t) { var q = r * (1 - 0.1 * t); return [q, q, q * 0.9, q * 0.85]; }, 0.02, r),
          region: function () { return S(side, 'ayak parmakları'); } });
      });
    });
    return out;
  }

  /* ── Görüntüleyici ──────────────────────────────────────────────────────── */
  var COL = {
    base: '#6e7889', hover: '#95a1b4', active: '#2f9dff',
    sev: { 1: '#46d6a0', 2: '#fcd34d', 3: '#ff6b5b' }
  };

  function glAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(global.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  var loading = null;
  // Three.js'i bir kez yükle. Takılan bir CDN formu kilitlemesin diye süre sınırı var.
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (!glAvailable()) { reject(new Error('webgl')); return; }
      var timer = setTimeout(function () { reject(new Error('timeout')); }, 20000);
      var imp;
      try { imp = import(THREE_URL); } catch (e) { clearTimeout(timer); reject(e); return; }
      imp.then(function (m) { clearTimeout(timer); resolve(m); },
               function (e) { clearTimeout(timer); reject(e); });
    });
    // Başarısız bir deneme kalıcı olmasın: bir sonraki çağrı yeniden denesin.
    loading.catch(function () { loading = null; });
    return loading;
  }

  function create(THREE, opts) {
    opts = opts || {};
    var canvas = document.createElement('canvas');
    canvas.className = 'pb-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, global.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var FOV = 26;
    var camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);
    scene.add(camera);

    // Işıklar kameraya bağlı: model hangi yöne çevrilirse çevrilsin bakılan taraf
    // aynı şekilde aydınlanıyor, arka görünüm karanlıkta kalmıyor.
    var lightTarget = new THREE.Object3D(); lightTarget.position.set(0, 0, -4); camera.add(lightTarget);
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1d24, 1.25));
    var key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(1.6, 2.4, 1.2); key.target = lightTarget; camera.add(key);
    var fill = new THREE.DirectionalLight(0xbcd2ff, 0.55); fill.position.set(-2.2, 0.4, 0.6); fill.target = lightTarget; camera.add(fill);
    // Arkadan gelen mavi kenar ışığı: siluet koyu zeminde kaybolmasın.
    var rim = new THREE.DirectionalLight(0x5cb8ff, 2.2); rim.position.set(0.3, 1.6, -9); rim.target = lightTarget; camera.add(rim);

    var body = new THREE.Group();
    scene.add(body);
    var material = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.58, metalness: 0.06,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    var seamMat = new THREE.LineBasicMaterial({ color: 0x0a0c10, transparent: true, opacity: 0.42 });

    /* Parçaları kur. Her parçanın üçgenleri ayrı köşe taşıyor (indekssiz), böylece
       bir bölgenin rengi komşusuna sızmıyor; normaller ise paylaşılan ızgaradan
       hesaplandığı için yüzey yine pürüzsüz görünüyor. */
    var meshes = [], faceRegion = [], stats = REGIONS.map(function () {
      return { area: 0, c: [0, 0, 0], n: [0, 0, 0], min: [9, 9, 9], max: [-9, -9, -9] };
    });
    bodySpecs().forEach(function (spec) {
      var g = tubeGrid(spec), nr = g.nr, nc = g.nc, P = g.pos, i, j;
      var N = new Float32Array(P.length);
      function vi(r, c) { return r * nc + ((c % nc) + nc) % nc; }
      var tris = [];
      for (i = 0; i < nr - 1; i++) for (j = 0; j < nc; j++) {
        var a = vi(i, j), b = vi(i + 1, j), c = vi(i, j + 1), d = vi(i + 1, j + 1), q = g.quad[i * nc + j];
        tris.push(a, b, c, q, b, d, c, q);
      }
      var nt = tris.length / 4, t, k;
      for (t = 0; t < nt; t++) {
        var i0 = tris[t * 4] * 3, i1 = tris[t * 4 + 1] * 3, i2 = tris[t * 4 + 2] * 3;
        var ux = P[i1] - P[i0], uy = P[i1 + 1] - P[i0 + 1], uz = P[i1 + 2] - P[i0 + 2];
        var wx = P[i2] - P[i0], wy = P[i2 + 1] - P[i0 + 1], wz = P[i2 + 2] - P[i0 + 2];
        var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        for (k = 0; k < 3; k++) { var o = tris[t * 4 + k] * 3; N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; }
      }
      for (i = 0; i < N.length; i += 3) {
        var l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l;
      }
      var pos = new Float32Array(nt * 9), nor = new Float32Array(nt * 9), colr = new Float32Array(nt * 9);
      var fr = new Int16Array(nt);
      for (t = 0; t < nt; t++) {
        var reg = tris[t * 4 + 3]; fr[t] = reg;
        var st = stats[reg];
        for (k = 0; k < 3; k++) {
          var src = tris[t * 4 + k] * 3, dst = t * 9 + k * 3;
          pos[dst] = P[src]; pos[dst + 1] = P[src + 1]; pos[dst + 2] = P[src + 2];
          nor[dst] = N[src]; nor[dst + 1] = N[src + 1]; nor[dst + 2] = N[src + 2];
          for (var ax = 0; ax < 3; ax++) {
            if (P[src + ax] < st.min[ax]) st.min[ax] = P[src + ax];
            if (P[src + ax] > st.max[ax]) st.max[ax] = P[src + ax];
          }
        }
        // Bölgenin ağırlık merkezi ve baktığı yön (alanla ağırlıklı) — odaklanırken
        // kameranın nereye döneceği buradan çıkıyor.
        var p0 = t * 9;
        var ex = pos[p0 + 3] - pos[p0], ey = pos[p0 + 4] - pos[p0 + 1], ez = pos[p0 + 5] - pos[p0 + 2];
        var fx = pos[p0 + 6] - pos[p0], fy = pos[p0 + 7] - pos[p0 + 1], fz = pos[p0 + 8] - pos[p0 + 2];
        var cx = ey * fz - ez * fy, cy = ez * fx - ex * fz, cz = ex * fy - ey * fx;
        var ar = Math.hypot(cx, cy, cz) / 2;
        st.area += ar;
        st.c[0] += ar * (pos[p0] + pos[p0 + 3] + pos[p0 + 6]) / 3;
        st.c[1] += ar * (pos[p0 + 1] + pos[p0 + 4] + pos[p0 + 7]) / 3;
        st.c[2] += ar * (pos[p0 + 2] + pos[p0 + 5] + pos[p0 + 8]) / 3;
        st.n[0] += cx / 2; st.n[1] += cy / 2; st.n[2] += cz / 2;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
      geo.computeBoundingSphere();
      var mesh = new THREE.Mesh(geo, material);
      mesh.userData.fr = fr;
      body.add(mesh);
      meshes.push(mesh);
      faceRegion.push(fr);

      /* Bölge sınırları: iki komşu dörtgenin bölgesi farklıysa aradaki kenar ince
         koyu bir dikiş olarak çiziliyor. Sporcu dokunmadan önce bölgelerin nerede
         başlayıp bittiğini görüyor. */
      var seg = [];
      function edge(p, q2) {
        var o1 = p * 3, o2 = q2 * 3, off = 0.0011;
        seg.push(P[o1] + N[o1] * off, P[o1 + 1] + N[o1 + 1] * off, P[o1 + 2] + N[o1 + 2] * off,
                 P[o2] + N[o2] * off, P[o2 + 1] + N[o2 + 1] * off, P[o2 + 2] + N[o2 + 2] * off);
      }
      for (i = 0; i < nr - 1; i++) for (j = 0; j < nc; j++) {
        var here = g.quad[i * nc + j];
        if (g.quad[i * nc + (j + 1) % nc] !== here) edge(vi(i, j + 1), vi(i + 1, j + 1));
        if (i + 1 < nr - 1 && g.quad[(i + 1) * nc + j] !== here) edge(vi(i + 1, j), vi(i + 1, j + 1));
      }
      if (seg.length) {
        var lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3));
        body.add(new THREE.LineSegments(lg, seamMat));
      }
    });
    stats.forEach(function (st) {
      if (!st.area) return;
      st.c = st.c.map(function (v) { return v / st.area; });
      var l = Math.hypot(st.n[0], st.n[1], st.n[2]);
      st.dir = l / st.area; // 1'e yakınsa bölge tek bir yöne bakıyor, 0'a yakınsa sarıyor
      st.n = l ? st.n.map(function (v) { return v / l; }) : [0, 0, 1];
    });

    /* Zemin: modelin altında yumuşak bir ışık halkası ve gölge. */
    function radialTex(stops) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    }
    function flat(r, tex, y, opacity) {
      var m = new THREE.Mesh(new THREE.CircleGeometry(r, 64),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opacity == null ? 1 : opacity }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
    }
    var floor = new THREE.Group();
    floor.add(flat(0.62, radialTex([[0, 'rgba(0,148,255,0.20)'], [0.55, 'rgba(0,148,255,0.07)'], [1, 'rgba(0,148,255,0)']]), 0.0005));
    floor.add(flat(0.36, radialTex([[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]), 0.001));
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.47, 0.475, 96),
      new THREE.MeshBasicMaterial({ color: 0x0094ff, transparent: true, opacity: 0.35, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.0015; floor.add(ring);
    scene.add(floor);

    /* SAĞ / SOL etiketleri: modelle birlikte dönen, her zaman kameraya bakan iki
       yazı. Sporcunun sağı karşıdan bakınca solda kaldığı için bu olmadan "sağ
       diz" ile "sol diz" kolayca karışıyordu. */
    var sideSprites = {};
    function labelSprite(text) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 96;
      var x = c.getContext('2d');
      x.font = '600 40px "Space Grotesk", "Inter", "Segoe UI", system-ui, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      var w = Math.min(240, x.measureText(text).width + 44);
      x.fillStyle = 'rgba(20,23,28,0.85)'; x.strokeStyle = 'rgba(92,184,255,0.45)'; x.lineWidth = 3;
      var rx0 = 128 - w / 2, ry0 = 18, rw = w, rh = 60, rr = 30;
      x.beginPath();
      x.moveTo(rx0 + rr, ry0); x.lineTo(rx0 + rw - rr, ry0); x.arc(rx0 + rw - rr, ry0 + rr, rr, -Math.PI / 2, Math.PI / 2);
      x.lineTo(rx0 + rr, ry0 + rh); x.arc(rx0 + rr, ry0 + rr, rr, Math.PI / 2, Math.PI * 1.5); x.closePath();
      x.fill(); x.stroke();
      x.fillStyle = '#b5bac4'; x.fillText(text, 128, 49);
      var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
      sp.scale.set(0.2, 0.075, 1);
      return sp;
    }
    function setLabels(right, left) {
      ['R', 'L'].forEach(function (s) {
        if (sideSprites[s]) { scene.remove(sideSprites[s]); sideSprites[s].material.map.dispose(); sideSprites[s].material.dispose(); }
        var sp = labelSprite(s === 'R' ? right : left);
        sp.position.set(s === 'R' ? -0.36 : 0.36, 0.06, 0.02);
        scene.add(sp); sideSprites[s] = sp;
      });
      requestRender();
    }

    /* ── Renk durumu ── */
    var state = { map: {}, active: null, hover: null };
    var cBase = new THREE.Color(COL.base), cHover = new THREE.Color(COL.hover), cActive = new THREE.Color(COL.active);
    var cSev = { 1: new THREE.Color(COL.sev[1]), 2: new THREE.Color(COL.sev[2]), 3: new THREE.Color(COL.sev[3]) };
    var cWhite = new THREE.Color(0xffffff);
    var regionRGB = new Float32Array(REGIONS.length * 3);
    function recolor() {
      var tmp = new THREE.Color();
      REGIONS.forEach(function (r, i) {
        var sev = state.map[r.k];
        if (sev && cSev[sev]) {
          // Şiddetin rengi; o an panelde açık olan bölge bir tık parlak, diğerleri
          // bir tık tok — renk tonu değişmeden hangisinin seçili olduğu belli oluyor.
          tmp.copy(cSev[sev]);
          if (r.k === state.active) tmp.lerp(cWhite, 0.1);
          else if (r.k === state.hover) tmp.lerp(cWhite, 0.06);
          else if (state.active) tmp.lerp(cBase, 0.3);
        } else if (r.k === state.active) tmp.copy(cActive);
        else if (r.k === state.hover) tmp.copy(cHover);
        else tmp.copy(cBase);
        regionRGB[i * 3] = tmp.r; regionRGB[i * 3 + 1] = tmp.g; regionRGB[i * 3 + 2] = tmp.b;
      });
      meshes.forEach(function (m) {
        var fr = m.userData.fr, arr = m.geometry.attributes.color.array;
        for (var t = 0; t < fr.length; t++) {
          var s = fr[t] * 3, o = t * 9;
          arr[o] = arr[o + 3] = arr[o + 6] = regionRGB[s];
          arr[o + 1] = arr[o + 4] = arr[o + 7] = regionRGB[s + 1];
          arr[o + 2] = arr[o + 5] = arr[o + 8] = regionRGB[s + 2];
        }
        m.geometry.attributes.color.needsUpdate = true;
      });
      requestRender();
    }

    /* ── Kamera ──
       Hedef noktanın etrafında dönen bir yörünge: yaw (sağa-sola), pitch (yukarı-
       aşağı), uzaklık. Her kare, o anki değer hedef değere yumuşakça yaklaşıyor. */
    var HOME = { x: 0, y: 0.93, z: 0 };
    var cur = { yaw: 0.85, pitch: 0.16, dist: 5, x: HOME.x, y: HOME.y, z: HOME.z };
    var goal = { yaw: 0, pitch: 0.06, dist: 5, x: HOME.x, y: HOME.y, z: HOME.z };
    var fitDist = 5, width = 1, height = 1;
    var PITCH_MIN = -0.8, PITCH_MAX = 1.05, MIN_DIST = 0.55;
    var reduced = false;
    try { reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) { cur.yaw = goal.yaw; cur.pitch = goal.pitch; }

    function computeFit() {
      var tv = Math.tan(FOV * DEG / 2), aspect = width / Math.max(1, height);
      var dV = (0.5 * 1.98) / tv, dH = (0.5 * 0.95) / (tv * aspect);
      return Math.max(dV, dH) + 0.25;
    }
    function maxDist() { return fitDist * 1.12; }
    function clampGoal() {
      goal.pitch = clamp(goal.pitch, PITCH_MIN, PITCH_MAX);
      goal.dist = clamp(goal.dist, MIN_DIST, maxDist());
      goal.x = clamp(goal.x, -0.45, 0.45); goal.z = clamp(goal.z, -0.3, 0.3);
      goal.y = clamp(goal.y, 0.02, 1.82);
      // Tamamen uzaklaşınca model yeniden ortalanıyor: kaybolan bir manken kalmasın.
      if (goal.dist >= fitDist * 0.97) { goal.x = HOME.x; goal.y = HOME.y; goal.z = HOME.z; }
    }
    function applyCamera() {
      var cp = Math.cos(cur.pitch);
      camera.position.set(cur.x + cur.dist * cp * Math.sin(cur.yaw), cur.y + cur.dist * Math.sin(cur.pitch),
        cur.z + cur.dist * cp * Math.cos(cur.yaw));
      camera.lookAt(cur.x, cur.y, cur.z);
    }

    var raf = 0, dirty = true, lastT = 0, inertia = 0, dragging = false, disposed = false, lastView = null;
    function requestRender() { dirty = true; if (!raf && !disposed) raf = global.requestAnimationFrame(frame); }
    function frame(now) {
      raf = 0;
      var dt = lastT ? Math.min(64, now - lastT) : 16; lastT = now;
      if (!dragging && Math.abs(inertia) > 0.00002) {
        goal.yaw -= inertia * dt; inertia *= Math.pow(0.9, dt / 16);
      } else if (!dragging) inertia = 0;
      var k = dragging ? 1 : 1 - Math.pow(1 - (reduced ? 0.5 : 0.14), dt / 16);
      var moving = false;
      ['yaw', 'pitch', 'dist', 'x', 'y', 'z'].forEach(function (p) {
        var d = goal[p] - cur[p];
        if (Math.abs(d) > 0.0004) { cur[p] += d * k; moving = true; } else cur[p] = goal[p];
      });
      applyCamera();
      // Modelin arkasında kalan SAĞ/SOL yazısı soluyor: yandan bakınca iki etiket
      // üst üste binip okunmaz hale gelmesin.
      ['R', 'L'].forEach(function (s) {
        var sp = sideSprites[s]; if (!sp) return;
        var px = camera.position.x - cur.x, pz = camera.position.z - cur.z, pl = Math.hypot(px, pz) || 1;
        var d = (px * sp.position.x + pz * sp.position.z) / (pl * Math.hypot(sp.position.x, sp.position.z));
        sp.material.opacity = clamp((d + 0.85) / 0.6, 0, 1);
      });
      renderer.render(scene, camera);
      dirty = false;
      // Hangi yüzden bakıldığı (ön / arka / sağ / sol): arayüz o düğmeyi yakıyor.
      var q = Math.round(wrapPi(cur.yaw) / (Math.PI / 2));
      var v = q === 0 ? 'front' : (q === 2 || q === -2 ? 'back' : (q === 1 ? 'left' : 'right'));
      if (v !== lastView) { lastView = v; if (opts.onView) opts.onView(v); }
      if (moving || dirty || Math.abs(inertia) > 0.00002) raf = global.requestAnimationFrame(frame);
      else lastT = 0;
    }

    /* ── Boyut ── */
    var host = null, ro = null;
    function resize() {
      if (!host) return;
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var oldFit = fitDist;
      width = w; height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      fitDist = computeFit();
      var ratioC = cur.dist / oldFit, ratioG = goal.dist / oldFit;
      cur.dist = ratioC * fitDist; goal.dist = ratioG * fitDist;
      clampGoal();
      requestRender();
    }
    function attach(el) {
      host = el;
      // Tuvalin üstündeki düğmeler ve yazılar görünür kalsın: tuval hep en altta.
      el.insertBefore(canvas, el.firstChild);
      if (ro) ro.disconnect();
      if (global.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(el); }
      else global.addEventListener('resize', resize);
      resize();
    }

    /* ── Seçim (ışın) ── */
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      applyCamera(); camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      var hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit || hit.faceIndex == null) return null;
      var reg = hit.object.userData.fr[hit.faceIndex];
      return { key: REGIONS[reg].k, point: hit.point };
    }

    /* ── Dokunma ve fare ──
       Satır içinde (formun ortasında) tek parmakla YATAY kaydırma modeli çeviriyor;
       dikey kaydırma sayfayı kaydırmaya devam ediyor (touch-action: pan-y) —
       yoksa sporcu parmağı modelin üstüne denk geldiğinde formda aşağı inemezdi.
       Tam ekranda bütün hareketler modelin: iki eksende çevirme, iki parmakla
       yakınlaştırma ve kaydırma. Farede sürüklemek her iki eksende çeviriyor. */
    var full = false, pointers = {}, npt = 0, gesture = null, lastTap = null, hoverKey = null;
    function ptList() { return Object.keys(pointers).map(function (k) { return pointers[k]; }); }
    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY, type: e.pointerType };
      npt = Object.keys(pointers).length;
      inertia = 0;
      if (npt === 1) {
        gesture = { kind: 'one', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(),
          moved: false, multi: false, type: e.pointerType, vx: 0, lt: performance.now() };
      } else if (npt === 2) {
        var p = ptList();
        if (gesture) gesture.multi = true;
        gesture = { kind: 'two', multi: true, d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1,
          dist0: goal.dist, mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2 };
      }
      setHover(null);
    }
    function onMove(e) {
      var p = pointers[e.pointerId];
      if (!p) {
        if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (!gesture) return;
      if (gesture.kind === 'one') {
        var dx = e.clientX - gesture.lx, dy = e.clientY - gesture.ly;
        if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 6) gesture.moved = true;
        gesture.lx = e.clientX; gesture.ly = e.clientY;
        if (!gesture.moved) return;
        dragging = true;
        var sp = 5.2 / Math.max(260, width);
        goal.yaw -= dx * sp;
        if (full || gesture.type === 'mouse') goal.pitch = clamp(goal.pitch + dy * sp * 0.8, PITCH_MIN, PITCH_MAX);
        var now = performance.now(), dtm = Math.max(1, now - gesture.lt);
        gesture.vx = 0.7 * gesture.vx + 0.3 * (dx * sp / dtm); gesture.lt = now;
        requestRender();
      } else if (gesture.kind === 'two' && npt >= 2) {
        var q = ptList();
        var d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1;
        goal.dist = gesture.dist0 * gesture.d0 / d;
        var mx = (q[0].x + q[1].x) / 2, my = (q[0].y + q[1].y) / 2;
        panBy(mx - gesture.mx, my - gesture.my);
        gesture.mx = mx; gesture.my = my;
        clampGoal();
        requestRender();
      }
    }
    function panBy(dxp, dyp) {
      var upp = 2 * cur.dist * Math.tan(FOV * DEG / 2) / Math.max(1, height);
      var cy = Math.cos(cur.yaw), sy = Math.sin(cur.yaw);
      goal.x -= dxp * upp * cy; goal.z += dxp * upp * sy;
      goal.y += dyp * upp;
    }
    function onUp(e) {
      var had = pointers[e.pointerId];
      delete pointers[e.pointerId];
      npt = Object.keys(pointers).length;
      if (!had || !gesture) { if (!npt) { gesture = null; dragging = false; } return; }
      if (gesture.kind === 'one' && npt === 0) {
        if (gesture.moved) {
          dragging = false;
          if (performance.now() - gesture.lt < 80) inertia = clamp(gesture.vx, -0.012, 0.012);
          requestRender();
        } else if (!gesture.multi && performance.now() - gesture.t < 650) {
          tap(e.clientX, e.clientY);
        }
        gesture = null;
      } else if (npt === 0) { gesture = null; dragging = false; }
      else if (npt === 1) {
        // İki parmaktan biri kalktı: kalan parmak yeni bir çevirme başlatmasın diye
        // hareket "bitti" sayılıyor ama dokunma olarak da okunmuyor.
        var rest = ptList()[0];
        gesture = { kind: 'one', sx: rest.x, sy: rest.y, lx: rest.x, ly: rest.y, t: 0, moved: true, multi: true,
          type: rest.type, vx: 0, lt: performance.now() };
      }
    }
    function onCancel(e) {
      delete pointers[e.pointerId];
      npt = Object.keys(pointers).length;
      if (!npt) { gesture = null; dragging = false; requestRender(); }
    }
    function tap(x, y) {
      var hit = pick(x, y), now = performance.now();
      var dbl = lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30;
      lastTap = dbl ? null : { t: now, x: x, y: y };
      if (hit) {
        // Yakınlaşmışken dokunulan nokta ortaya geliyor; çift dokunuş oraya yaklaşıyor.
        if (dbl) { goal.dist = Math.max(MIN_DIST + 0.1, Math.min(goal.dist, fitDist) * 0.5); }
        if (dbl || goal.dist < fitDist * 0.8) { goal.x = hit.point.x; goal.y = hit.point.y; goal.z = hit.point.z * 0.5; }
        clampGoal();
        requestRender();
        if (opts.onPick) opts.onPick(hit.key);
      } else {
        if (dbl) reset();
        if (opts.onPick) opts.onPick(null);
      }
    }
    function onWheel(e) {
      if (!full && !e.ctrlKey) return;
      e.preventDefault();
      goal.dist *= Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      clampGoal(); requestRender();
    }
    function hoverAt(x, y) {
      var hit = pick(x, y);
      setHover(hit ? hit.key : null, x, y);
    }
    function setHover(k, x, y) {
      if (k !== hoverKey) { hoverKey = k; state.hover = k; recolor(); canvas.style.cursor = k ? 'pointer' : ''; }
      if (opts.onHover) opts.onHover(k, x, y);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !pointers[e.pointerId]) setHover(null); });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    // Uzun basışta açılan sistem menüsü (resmi kaydet…) modelin üstünde anlamsız.
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ── Dışarıya açılan işlemler ── */
    function nearYaw(y) { return cur.yaw + wrapPi(y - cur.yaw); }
    function view(name) {
      var y = { front: 0, back: Math.PI, right: -Math.PI / 2, left: Math.PI / 2 }[name];
      if (y == null) return;
      goal.yaw = nearYaw(y); goal.pitch = 0.06; goal.dist = fitDist;
      goal.x = HOME.x; goal.y = HOME.y; goal.z = HOME.z; inertia = 0;
      requestRender();
    }
    function reset() { view('front'); }
    function zoom(f) { goal.dist *= f; clampGoal(); requestRender(); }
    /* Bir bölgeye dön: kamera bölgenin baktığı yöne geçip ona yaklaşıyor. Kendi
       etrafını saran bölgelerde (el, parmaklar) ortalama yön anlamsız olduğundan
       gövdenin ekseninden bölgeye doğru olan yön kullanılıyor. */
    function focus(k) {
      var i = INDEX[k]; if (i == null) return;
      var st = stats[i]; if (!st.area) return;
      var n = st.n.slice();
      if (st.dir < 0.25) {
        n = [st.c[0], 0, st.c[2] + 0.02];
        var l = Math.hypot(n[0], n[2]) || 1; n = [n[0] / l, 0, n[2] / l];
      }
      /* İç bacak (iç uyluk, diz içi, baldır içi…) karşı bacağa, yan gövde kola bakıyor:
         tam o yönden bakan kamera bölgeyi değil önündeki uzvu gösterirdi. Bu
         bölgelerde bakış önden (ya da arkadan) çapraza çekiliyor. */
      var r = REGIONS[i], medial = r.s && st.c[1] < 1.0 && n[0] * (r.s === 'L' ? 1 : -1) < -0.3;
      if (medial || /yan gövde|kaburga/.test(k)) {
        var fz = n[2] < -0.2 ? -1 : 1;
        n = [n[0] * 0.55, n[1], n[2] + 0.85 * fz];
        var nl = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl];
      }
      var h = Math.hypot(n[0], n[2]);
      if (h > 0.3) goal.yaw = nearYaw(Math.atan2(n[0], n[2]));
      goal.pitch = clamp(Math.atan2(n[1], Math.max(0.0001, h)), -0.75, 0.9);
      var ext = Math.max(st.max[0] - st.min[0], st.max[1] - st.min[1], st.max[2] - st.min[2]);
      goal.dist = clamp(ext * 3.6 + 0.75, MIN_DIST + 0.2, fitDist);
      goal.x = st.c[0]; goal.y = st.c[1]; goal.z = st.c[2] * 0.5;
      inertia = 0;
      clampGoal();
      // Uzaklık en uzakta kaldıysa clampGoal hedefi merkeze aldı; bakış yönü yine de doğru.
      requestRender();
    }
    function update(s) {
      state.map = (s && s.map) || {};
      state.active = (s && s.active) || null;
      recolor();
    }
    function setExpanded(v) {
      full = !!v;
      canvas.style.touchAction = full ? 'none' : 'pan-y';
      setTimeout(resize, 0);
    }
    function dispose() {
      disposed = true;
      if (raf) global.cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    canvas.style.touchAction = 'pan-y';
    setLabels(opts.right || 'SAĞ', opts.left || 'SOL');
    recolor();
    return {
      canvas: canvas, attach: attach, update: update, focus: focus, view: view, reset: reset, zoom: zoom,
      setLabels: setLabels, setExpanded: setExpanded, resize: resize, dispose: dispose,
      // Test ve hata ayıklama için: bir bölgenin ekrandaki yaklaşık konumu.
      project: function (k) {
        var i = INDEX[k]; if (i == null || !stats[i].area) return null;
        applyCamera(); camera.updateMatrixWorld();
        var v = new THREE.Vector3(stats[i].c[0], stats[i].c[1], stats[i].c[2]).project(camera);
        var r = canvas.getBoundingClientRect();
        return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
      },
      stats: function (k) { var i = INDEX[k]; return i == null ? null : stats[i]; }
    };
  }

  global.PainBody = {
    REGIONS: REGIONS, GROUPS: GROUPS, byKey: BY_KEY, COLORS: COL,
    load: load, create: create, glAvailable: glAvailable
  };
})(typeof window !== 'undefined' ? window : this);
