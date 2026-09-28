/* ═══════════════════════════════════════════════════════════════════════════
   AĞRI HARİTASI — 3D vücut modeli (Wellness formu)

   Sporcu ağrıyan bölgeyi bir tablodan değil, çevirebildiği gerçekçi bir 3D
   insan modeli üzerinden seçiyor. Bu dosya üç şey taşıyor:

     1) BÖLGE KATALOĞU (PainBody.REGIONS). Her bölgenin anahtarı Türkçe adı —
        gönderime o ad gidiyor (`painMap: {'Sağ diz önü': 2}`), çünkü koçun
        uygulamasındaki ısı haritası, bireyselleştirme etiketleri ve uyarı
        bildirimi bölgeyi adıyla okuyor. İngilizce yalnızca ekrandaki karşılığı.

     2) MODELİ AÇAN KOD. Manken `pain-body.bin` dosyasında: MakeHuman'ın taban
        insan ağı (CC0 lisanslı; atletik genç erkek ölçüleri, kollar yanda, yüz
        hatları düzleştirilmiş — bir manken başı), her köşesinin hangi bölgeye
        düştüğü, bölge sınırının her kenarı tam nerede kestiği, pişirilmiş ortam
        gölgesi (AO) ve şort maskesi. Dosyayı `tools/pain-body-mesh/` üretiyor;
        bölge sınırlarının kuralları da orada. Burada ağ açılıyor, bölge
        sınırından geçen üçgenler dosyadaki kesim noktalarından bölünüyor (sınır
        köşeler arasından düz geçiyor, basamak yapmıyor) ve ağ bir kez
        pürüzsüzleştiriliyor (Loop alt bölümleme). Her üçgen tam olarak bir
        bölgeye düşüyor; dokunulan üçgen bölgeyi söylüyor.

     3) GÖRÜNTÜLEYİCİ (PainBody.create). Deri tek renk; bölgeler arasında ince
        koyu bir sınır çizgisi var, bölgelerin kendi rengi yok. İşaretlenen bölge
        şiddet rengini (Hafif / Orta / Yüksek) alıyor, yanına çizgiyle bağlı bir
        etiket çıkıyor; panelde açık olan bölge mavi. Baş / el / diz / ayak için
        hızlı yakınlaşma var.

   Koordinatlar metre; sporcu +z yönüne (ekrana) bakıyor, y yukarı, ayaklar y=0.
   Sporcunun SAĞI -x tarafında — karşıdan bakan kişinin solunda. Modelin
   yanındaki SAĞ / SOL etiketleri bu yüzden var.

   Three.js ve model dosyası yalnızca Wellness formu açılınca yükleniyor.
   Yüklenemezse (eski tarayıcı, WebGL2 yok, ağ yok) form bölgeyi listeden
   seçtiriyor; katalog bu dosyada olduğu için liste her durumda çalışıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
  // Model dosyası bu betiğin yanında duruyor. Sürüm eki, dosya değişince
  // tarayıcının eski kopyayı kullanmaması için.
  var MESH_VERSION = '3';
  var MESH_URL = (function () {
    var src = '';
    try { src = (document.currentScript && document.currentScript.src) || ''; } catch (e) {}
    var base = src ? src.replace(/[?#].*$/, '').replace(/[^/]*$/, '') : '';
    return base + 'pain-body.bin?v=' + MESH_VERSION;
  })();

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
  two('göğüs', 'chest', 'trunk');
  two('kaburga', 'ribs', 'trunk');
  two('üst sırt', 'upper back', 'trunk');
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

  /* ── Yardımcı matematik ─────────────────────────────────────────────────── */
  var DEG = Math.PI / 180;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function wrapPi(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }

  /* ── Model dosyası ───────────────────────────────────────────────────────
     'PBM3' | JSON boyu (u32) | JSON (bölge adları, sınır kutusu, sayılar, eklemler) |
     köşeler (u16×3, kutuya göre nicelenmiş) | dörtgenler (u16×4) | üçgenler (u16×3,
     yüz yaması) | sınır kenarları (u16×2, küçük uç önce) | köşegen bitleri (dörtgen
     başına 1: b–d köşegeni) | köşenin bölgesi (u8, JSON'daki ad listesine sıra) |
     köşe başına 2 kanal (u8): AO, şort | sınır kenarının kesim noktası (u8, küçük
     uçtan t × 255). Hepsi little-endian. */
  var NA = 2;
  function decode(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(buf);
    if (u8.length < 8 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'PBM3') throw new Error('PainBody: model dosyası tanınmadı');
    var jl = dv.getUint32(4, true), jb = u8.subarray(8, 8 + jl), txt;
    if (global.TextDecoder) txt = new TextDecoder('utf-8').decode(jb);
    else { txt = ''; for (var q = 0; q < jb.length; q++) txt += String.fromCharCode(jb[q]); txt = decodeURIComponent(escape(txt)); }
    var meta = JSON.parse(txt), nv = meta.nv, nq = meta.nq, nt = meta.nt, ne = meta.ne, nd = Math.ceil(nq / 8), o = 8 + jl;
    if (u8.length < o + nv * 6 + nq * 8 + nt * 6 + ne * 4 + nd + nv + nv * NA + ne) throw new Error('PainBody: model dosyası eksik');
    var qp = new Uint16Array(buf, o, nv * 3); o += nv * 6;
    var quads = new Uint16Array(buf, o, nq * 4); o += nq * 8;
    var tris = new Uint16Array(buf, o, nt * 3); o += nt * 6;
    var ed = new Uint16Array(buf, o, ne * 2); o += ne * 4;
    var diag = new Uint8Array(buf, o, nd); o += nd;
    var rid = new Uint8Array(buf, o, nv); o += nv;
    var mat = new Uint8Array(buf, o, nv * NA); o += nv * NA;
    var et = new Uint8Array(buf, o, ne);
    var pos = new Float32Array(nv * 3), mn = meta.min, mx = meta.max, i, k;
    for (i = 0; i < nv; i++) for (k = 0; k < 3; k++) pos[i * 3 + k] = mn[k] + (mx[k] - mn[k]) * qp[i * 3 + k] / 65535;
    // Dosyadaki bölge adı → katalogdaki sıra. Katalogda olmayan bir ad dosyanın
    // bu koddan eski/yeni olduğunu gösterir; o durumda 3D açılmıyor, liste kalıyor.
    var map = meta.keys.map(function (k2) {
      if (INDEX[k2] == null) throw new Error('PainBody: bilinmeyen bölge ' + k2);
      return INDEX[k2];
    });
    var r = new Uint8Array(nv);
    for (i = 0; i < nv; i++) r[i] = map[rid[i]];
    var cut = {};
    for (i = 0; i < ne; i++) cut[ed[i * 2] * 65536 + ed[i * 2 + 1]] = et[i] / 255;
    return { meta: meta, nv: nv, nq: nq, nt: nt, pos: pos, quads: quads, tris: tris, diag: diag, cut: cut, rid: r, mat: mat };
  }

  // Büyüyebilen köşe deposu: konum + malzeme kanalları.
  function Store(n, cap) { this.n = n; this.cap = cap; this.p = new Float32Array(cap * 3); this.a = new Float32Array(cap * NA); }
  Store.prototype.add = function () {
    if (this.n >= this.cap) {
      var c = this.cap * 2, p = new Float32Array(c * 3), a = new Float32Array(c * NA);
      p.set(this.p); a.set(this.a); this.p = p; this.a = a; this.cap = c;
    }
    return this.n++;
  };
  Store.prototype.lerp = function (dst, i, j, t) {
    var p = this.p, a = this.a, k;
    for (k = 0; k < 3; k++) p[dst * 3 + k] = p[i * 3 + k] * (1 - t) + p[j * 3 + k] * t;
    for (k = 0; k < NA; k++) a[dst * NA + k] = a[i * NA + k] * (1 - t) + a[j * NA + k] * t;
  };

  /* 1) Dörtgenleri dosyadaki köşegenden üçgenle (yüz yaması zaten üçgen);
        köşeleri farklı bölgeye düşen üçgeni böl. Sınırın her kenarı tam nerede
        kestiği dosyada (derlemede bölge kuralının kendisiyle bulundu): bölme
        noktası oraya konuyor, sınır köşelerin arasından düz bir çizgi olarak
        geçiyor. Her üçgen tek bölgenin oluyor. */
  function splitRegions(d) {
    var nv = d.nv, S = new Store(nv, Math.ceil(nv * 1.3)), i, k;
    S.p.set(d.pos);
    for (i = 0; i < nv * NA; i++) S.a[i] = d.mat[i] / 255;
    var T = [], R = [], rid = d.rid, mids = {}, mEdge = {}, seg = [], cents = [];
    function mid(a, b) {
      var lo = a < b ? a : b, hi = a < b ? b : a, key = lo * 65536 + hi, m = mids[key];
      if (m == null) {
        var t = d.cut[key];
        m = S.add(); mids[key] = m;
        // Dosyada noktası olmayan kenar (olmamalı) ortadan bölünüp sonra düzleştiriliyor.
        if (t == null) { t = 0.5; mEdge[m] = [lo, hi, t]; }
        S.lerp(m, lo, hi, t);
      }
      return m;
    }
    function tri(a, b, c) {
      var ra = rid[a], rb = rid[b], rc = rid[c];
      if (ra === rb && rb === rc) { T.push(a, b, c); R.push(ra); return; }
      if (ra !== rb && rb !== rc && ra !== rc) {
        var mab = mid(a, b), mbc = mid(b, c), mca = mid(c, a), cc = S.add();
        for (k = 0; k < 3; k++) S.p[cc * 3 + k] = (S.p[a * 3 + k] + S.p[b * 3 + k] + S.p[c * 3 + k]) / 3;
        for (k = 0; k < NA; k++) S.a[cc * NA + k] = (S.a[a * NA + k] + S.a[b * NA + k] + S.a[c * NA + k]) / 3;
        cents.push(cc, a, b, c); seg.push(mab, cc, mbc, cc, mca, cc);
        T.push(a, mab, cc, a, cc, mca); R.push(ra, ra);
        T.push(b, mbc, cc, b, cc, mab); R.push(rb, rb);
        T.push(c, mca, cc, c, cc, mbc); R.push(rc, rc);
        return;
      }
      // İkisi aynı bölgede: tek kalanı c'ye döndür.
      if (ra === rc) { var t0 = a; a = c; c = b; b = t0; }
      else if (rb === rc) { var t1 = a; a = b; b = c; c = t1; }
      var mac = mid(a, c), mbc2 = mid(b, c);
      seg.push(mac, mbc2);
      T.push(a, b, mbc2, a, mbc2, mac); R.push(rid[a], rid[a]);
      T.push(mac, mbc2, c); R.push(rid[c]);
    }
    for (i = 0; i < d.nq; i++) {
      var q0 = d.quads[i * 4], q1 = d.quads[i * 4 + 1], q2 = d.quads[i * 4 + 2], q3 = d.quads[i * 4 + 3];
      if (d.diag[i >> 3] & (1 << (i & 7))) { tri(q0, q1, q3); tri(q1, q2, q3); }
      else { tri(q0, q1, q2); tri(q0, q2, q3); }
    }
    for (i = 0; i < d.nt; i++) tri(d.tris[i * 3], d.tris[i * 3 + 1], d.tris[i * 3 + 2]);
    relax(S, seg, mEdge, cents, 6);
    return { S: S, T: new Uint32Array(T), R: new Uint8Array(R) };
  }

  /* 2) Üç bölgenin buluştuğu üçgende bölme noktası üçgenin ağırlık merkezinde
        doğuyor; üç sınır komşusunun ortasına (üçgenin içinde kalarak) çekiliyor.
        Dosyada noktası olmayan bir kenar olursa o da kendi kenarı üzerinde iki
        sınır komşusunun ortasına kaydırılıyor. */
  function relax(S, seg, mEdge, cents, iters) {
    var nb = {}, i, k, it;
    for (i = 0; i < seg.length; i += 2) {
      (nb[seg[i]] || (nb[seg[i]] = [])).push(seg[i + 1]);
      (nb[seg[i + 1]] || (nb[seg[i + 1]] = [])).push(seg[i]);
    }
    var ms = Object.keys(mEdge).map(Number).filter(function (m) { return nb[m] && nb[m].length === 2; });
    for (it = 0; it < iters; it++) {
      var p = S.p;
      for (i = 0; i < ms.length; i++) {
        var m = ms[i], e = mEdge[m], a = e[0], b = e[1], n0 = nb[m][0], n1 = nb[m][1];
        var tx = (p[n0 * 3] + p[n1 * 3]) / 2 - p[a * 3], ty = (p[n0 * 3 + 1] + p[n1 * 3 + 1]) / 2 - p[a * 3 + 1],
            tz = (p[n0 * 3 + 2] + p[n1 * 3 + 2]) / 2 - p[a * 3 + 2];
        var ex = p[b * 3] - p[a * 3], ey = p[b * 3 + 1] - p[a * 3 + 1], ez = p[b * 3 + 2] - p[a * 3 + 2];
        var t = (tx * ex + ty * ey + tz * ez) / (ex * ex + ey * ey + ez * ez || 1);
        e[2] += 0.7 * (clamp(t, 0.12, 0.88) - e[2]);
        S.lerp(m, a, b, e[2]);
      }
      for (i = 0; i < cents.length; i += 4) {
        var c = cents[i], q = nb[c]; if (!q || q.length < 3) continue;
        var v0 = cents[i + 1], v1 = cents[i + 2], v2 = cents[i + 3];
        var gx = 0, gy = 0, gz = 0;
        for (k = 0; k < q.length; k++) { gx += p[q[k] * 3]; gy += p[q[k] * 3 + 1]; gz += p[q[k] * 3 + 2]; }
        gx = gx / q.length - p[v0 * 3]; gy = gy / q.length - p[v0 * 3 + 1]; gz = gz / q.length - p[v0 * 3 + 2];
        var e1x = p[v1 * 3] - p[v0 * 3], e1y = p[v1 * 3 + 1] - p[v0 * 3 + 1], e1z = p[v1 * 3 + 2] - p[v0 * 3 + 2];
        var e2x = p[v2 * 3] - p[v0 * 3], e2y = p[v2 * 3 + 1] - p[v0 * 3 + 1], e2z = p[v2 * 3 + 2] - p[v0 * 3 + 2];
        var d11 = e1x * e1x + e1y * e1y + e1z * e1z, d12 = e1x * e2x + e1y * e2y + e1z * e2z, d22 = e2x * e2x + e2y * e2y + e2z * e2z;
        var g1 = gx * e1x + gy * e1y + gz * e1z, g2 = gx * e2x + gy * e2y + gz * e2z, den = d11 * d22 - d12 * d12;
        if (Math.abs(den) < 1e-16) continue;
        var wb = (d22 * g1 - d12 * g2) / den, wc = (d11 * g2 - d12 * g1) / den, w = [1 - wb - wc, wb, wc];
        for (k = 0; k < 3; k++) w[k] = Math.max(0.1, w[k]);
        var sw = w[0] + w[1] + w[2], v = [v0, v1, v2];
        for (k = 0; k < 3; k++) S.p[c * 3 + k] = (w[0] * p[v0 * 3 + k] + w[1] * p[v1 * 3 + k] + w[2] * p[v2 * 3 + k]) / sw;
        for (k = 0; k < NA; k++) S.a[c * NA + k] = (w[0] * S.a[v[0] * NA + k] + w[1] * S.a[v[1] * NA + k] + w[2] * S.a[v[2] * NA + k]) / sw;
      }
    }
  }

  /* 3) Bir kat Loop alt bölümleme: her üçgen dörde bölünüyor, köşeler komşularına
        göre yumuşatılıyor; çocuk üçgenler babalarının bölgesini alıyor. Bölge
        sınırı bir kıvrım gibi işleniyor: sınırdaki köşe yalnızca sınır boyunca
        yumuşuyor, sınır kenarının yeni noktası kenarın ortası. Yoksa sınır
        köşeleri iki yandaki düzensiz üçgenlere göre sağa sola kayıp çizgiyi
        titretiyordu. Kenarlar, (küçük uç, büyük uç) anahtarına göre sıralanmış
        yarım kenarlardan çıkarılıyor — nesne tablosu yerine düz dizilerle,
        telefonda da hızlı. */
  function subdivide(m) {
    var S = m.S, T = m.T, R = m.R, n = S.n, nt = R.length, nh = nt * 3, i, k;
    var comb = new Float64Array(nh);
    for (i = 0; i < nt; i++) for (k = 0; k < 3; k++) {
      var a = T[i * 3 + k], b = T[i * 3 + (k + 1) % 3];
      comb[i * 3 + k] = ((a < b ? a * n + b : b * n + a) * nh) + i * 3 + k;
    }
    comb.sort();
    var heE = new Int32Array(nh), eLo = new Int32Array(nh), eHi = new Int32Array(nh);
    var eO1 = new Int32Array(nh), eO2 = new Int32Array(nh), eN = new Uint8Array(nh), eB = new Uint8Array(nh), eR = new Int16Array(nh);
    var ne = -1, prev = -1;
    for (i = 0; i < nh; i++) {
      var c = comb[i], he = c % nh, key = (c - he) / nh, t = (he / 3) | 0, kk = he - t * 3;
      var opp = T[t * 3 + (kk + 2) % 3];
      if (key !== prev) {
        ne++; prev = key;
        var x0 = T[t * 3 + kk], x1 = T[t * 3 + (kk + 1) % 3];
        eLo[ne] = x0 < x1 ? x0 : x1; eHi[ne] = x0 < x1 ? x1 : x0; eO1[ne] = opp; eO2[ne] = -1; eN[ne] = 1; eR[ne] = R[t];
      } else { eO2[ne] = opp; if (eN[ne] < 255) eN[ne]++; if (R[t] !== eR[ne]) eB[ne] = 1; }
      heE[he] = ne;
    }
    ne++;
    var P = S.p, A = S.a, N = new Store(n + ne, n + ne), np = N.p, na = N.a;
    var val = new Uint16Array(n), sum = new Float64Array(n * 3), bc = new Uint8Array(n), bs = new Float64Array(n * 3);
    for (i = 0; i < ne; i++) {
      var lo = eLo[i], hi = eHi[i];
      val[lo]++; val[hi]++;
      for (k = 0; k < 3; k++) { sum[lo * 3 + k] += P[hi * 3 + k]; sum[hi * 3 + k] += P[lo * 3 + k]; }
      if (eN[i] === 1 || eB[i]) {
        bc[lo]++; bc[hi]++;
        for (k = 0; k < 3; k++) { bs[lo * 3 + k] += P[hi * 3 + k]; bs[hi * 3 + k] += P[lo * 3 + k]; }
      }
    }
    for (i = 0; i < n; i++) {
      var vl = val[i];
      if (bc[i]) {
        // Sınırdaki (ya da açık kenardaki) köşe: yalnızca sınır boyunca. Üç bölgenin
        // buluştuğu köşe yerinde kalıyor.
        if (bc[i] === 2) for (k = 0; k < 3; k++) np[i * 3 + k] = 0.75 * P[i * 3 + k] + 0.125 * bs[i * 3 + k];
        else for (k = 0; k < 3; k++) np[i * 3 + k] = P[i * 3 + k];
      } else if (vl >= 3) {
        var w = vl === 3 ? 3 / 16 : 3 / (8 * vl);
        for (k = 0; k < 3; k++) np[i * 3 + k] = (1 - vl * w) * P[i * 3 + k] + w * sum[i * 3 + k];
      } else for (k = 0; k < 3; k++) np[i * 3 + k] = P[i * 3 + k];
      for (k = 0; k < NA; k++) na[i * NA + k] = A[i * NA + k];
    }
    for (i = 0; i < ne; i++) {
      var v = n + i, l2 = eLo[i], h2 = eHi[i];
      if (eN[i] === 2 && !eB[i]) for (k = 0; k < 3; k++) np[v * 3 + k] = 0.375 * (P[l2 * 3 + k] + P[h2 * 3 + k]) + 0.125 * (P[eO1[i] * 3 + k] + P[eO2[i] * 3 + k]);
      else for (k = 0; k < 3; k++) np[v * 3 + k] = 0.5 * (P[l2 * 3 + k] + P[h2 * 3 + k]);
      for (k = 0; k < NA; k++) na[v * NA + k] = 0.5 * (A[l2 * NA + k] + A[h2 * NA + k]);
    }
    var T2 = new Uint32Array(nt * 12), R2 = new Uint8Array(nt * 4);
    for (i = 0; i < nt; i++) {
      var a0 = T[i * 3], a1 = T[i * 3 + 1], a2 = T[i * 3 + 2];
      var m01 = n + heE[i * 3], m12 = n + heE[i * 3 + 1], m20 = n + heE[i * 3 + 2], o = i * 12;
      T2[o] = a0; T2[o + 1] = m01; T2[o + 2] = m20;
      T2[o + 3] = a1; T2[o + 4] = m12; T2[o + 5] = m01;
      T2[o + 6] = a2; T2[o + 7] = m20; T2[o + 8] = m12;
      T2[o + 9] = m01; T2[o + 10] = m12; T2[o + 11] = m20;
      R2[i * 4] = R2[i * 4 + 1] = R2[i * 4 + 2] = R2[i * 4 + 3] = R[i];
    }
    return { S: N, T: T2, R: R2 };
  }

  /* 4) Normaller (bölünmeden önceki, kaynaşık ağda — sınırda gölge kırılmasın),
        sonra her bölge sınırındaki köşe bölge başına ayrı kopya alıyor: renk
        komşuya sızmıyor. `seam`, köşenin en yakın sınıra yüzey boyunca uzaklığı
        (metre); gölgelendirici sınır çizgisini bundan çiziyor. Bölge
        istatistikleri (odak, etiket) de burada çıkıyor. */
  function vertexNormals(p, T, nv) {
    var nrm = new Float32Array(nv * 3), nt = T.length / 3, i;
    for (i = 0; i < nt; i++) {
      var a = T[i * 3] * 3, b = T[i * 3 + 1] * 3, c = T[i * 3 + 2] * 3;
      var ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      var wx = p[c] - p[a], wy = p[c + 1] - p[a + 1], wz = p[c + 2] - p[a + 2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      nrm[a] += nx; nrm[a + 1] += ny; nrm[a + 2] += nz;
      nrm[b] += nx; nrm[b + 1] += ny; nrm[b + 2] += nz;
      nrm[c] += nx; nrm[c + 1] += ny; nrm[c + 2] += nz;
    }
    for (i = 0; i < nv * 3; i += 3) {
      var l = Math.sqrt(nrm[i] * nrm[i] + nrm[i + 1] * nrm[i + 1] + nrm[i + 2] * nrm[i + 2]) || 1;
      nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
    }
    return nrm;
  }
  // Köşe → komşu köşeler (sıkıştırılmış satır dizisi).
  function vertexRings(T, nv) {
    var nh = T.length, cnt = new Uint32Array(nv + 1), i;
    for (i = 0; i < nh; i++) { cnt[T[i] + 1]++; cnt[T[i - (i % 3) + (i % 3 + 1) % 3] + 1]++; }
    for (i = 0; i < nv; i++) cnt[i + 1] += cnt[i];
    var fill = cnt.slice(0, nv), nb = new Uint32Array(cnt[nv]);
    for (i = 0; i < nh; i++) {
      var x = T[i], y = T[i - (i % 3) + (i % 3 + 1) % 3];
      nb[fill[x]++] = y; nb[fill[y]++] = x;
    }
    return { start: cnt, nb: nb };
  }
  /* Köşenin sınır çizgisine uzaklığı. Önce Dijkstra (ikili yığın) her köşe için
     en yakın sınır köşesini buluyor; sonra uzaklık, o köşeye ve komşularına bağlı
     sınır kenarlarına dik olarak ölçülüyor. Kenarlar boyunca yürünen yol zikzak
     yaptığı için uzaklığı fazla sayıyordu; çizginin kenarı da o yüzden titrek
     çıkıyordu. Dik uzaklık üçgen içinde doğrusal: çizgi eşit kalınlıkta ve düz.
     FAR'dan ötesi FAR. */
  function seamDistance(p, ring, multi, nv, FAR, bseg) {
    var dist = new Float32Array(nv).fill(FAR), src = new Int32Array(nv).fill(-1);
    var heapV = new Uint32Array(nv * 2 + 16), heapD = new Float32Array(nv * 2 + 16), hn = 0, i;
    function push(v, d) {
      var j = hn++;
      if (j >= heapV.length) { var hv = new Uint32Array(heapV.length * 2), hd = new Float32Array(heapV.length * 2); hv.set(heapV); hd.set(heapD); heapV = hv; heapD = hd; }
      while (j > 0) { var pa = (j - 1) >> 1; if (heapD[pa] <= d) break; heapV[j] = heapV[pa]; heapD[j] = heapD[pa]; j = pa; }
      heapV[j] = v; heapD[j] = d;
    }
    function pop() {
      var v = heapV[0], lv = heapV[--hn], ld = heapD[hn], j = 0;
      while (true) {
        var l = j * 2 + 1; if (l >= hn) break;
        if (l + 1 < hn && heapD[l + 1] < heapD[l]) l++;
        if (heapD[l] >= ld) break;
        heapV[j] = heapV[l]; heapD[j] = heapD[l]; j = l;
      }
      heapV[j] = lv; heapD[j] = ld;
      return v;
    }
    for (i = 0; i < nv; i++) if (multi[i]) { dist[i] = 0; src[i] = i; push(i, 0); }
    var st = ring.start, nb = ring.nb;
    while (hn) {
      var d0 = heapD[0], v = pop();
      if (d0 > dist[v]) continue;
      for (var q = st[v]; q < st[v + 1]; q++) {
        var w = nb[q], dx = p[v * 3] - p[w * 3], dy = p[v * 3 + 1] - p[w * 3 + 1], dz = p[v * 3 + 2] - p[w * 3 + 2];
        var nd = d0 + Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (nd < dist[w]) { dist[w] = nd; src[w] = src[v]; push(w, nd); }
      }
    }
    function segD(x, a, b) {
      var ax = p[b * 3] - p[a * 3], ay = p[b * 3 + 1] - p[a * 3 + 1], az = p[b * 3 + 2] - p[a * 3 + 2];
      var qx = p[x * 3] - p[a * 3], qy = p[x * 3 + 1] - p[a * 3 + 1], qz = p[x * 3 + 2] - p[a * 3 + 2];
      var t = clamp((qx * ax + qy * ay + qz * az) / (ax * ax + ay * ay + az * az || 1), 0, 1);
      qx -= ax * t; qy -= ay * t; qz -= az * t;
      return Math.sqrt(qx * qx + qy * qy + qz * qz);
    }
    for (i = 0; i < nv; i++) {
      var s0 = src[i]; if (multi[i] || s0 < 0 || dist[i] >= FAR) continue;
      var best = dist[i], l1 = bseg[s0] || [];
      for (var a = 0; a < l1.length; a++) {
        var n1 = l1[a], l2 = bseg[n1] || [];
        best = Math.min(best, segD(i, s0, n1));
        for (var b = 0; b < l2.length; b++) best = Math.min(best, segD(i, n1, l2[b]));
      }
      dist[i] = best;
    }
    return dist;
  }
  function regionStats(P2, N2, RID, index, R, n2, nt) {
    var stats = REGIONS.map(function () {
      return { area: 0, c: [0, 0, 0], n: [0, 0, 0], min: [9, 9, 9], max: [-9, -9, -9], anchor: null, an: null, best: 1e9 };
    }), i, k;
    for (i = 0; i < nt; i++) {
      var st = stats[R[i]], i0 = index[i * 3] * 3, i1 = index[i * 3 + 1] * 3, i2 = index[i * 3 + 2] * 3;
      var ex = P2[i1] - P2[i0], ey = P2[i1 + 1] - P2[i0 + 1], ez = P2[i1 + 2] - P2[i0 + 2];
      var fx = P2[i2] - P2[i0], fy = P2[i2 + 1] - P2[i0 + 1], fz = P2[i2 + 2] - P2[i0 + 2];
      var cx = ey * fz - ez * fy, cy = ez * fx - ex * fz, cz = ex * fy - ey * fx, ar = Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
      st.area += ar;
      for (k = 0; k < 3; k++) {
        var v0 = P2[i0 + k], v1 = P2[i1 + k], v2 = P2[i2 + k];
        st.c[k] += ar * (v0 + v1 + v2) / 3;
        if (v0 < st.min[k]) st.min[k] = v0; if (v1 < st.min[k]) st.min[k] = v1; if (v2 < st.min[k]) st.min[k] = v2;
        if (v0 > st.max[k]) st.max[k] = v0; if (v1 > st.max[k]) st.max[k] = v1; if (v2 > st.max[k]) st.max[k] = v2;
      }
      st.n[0] += cx / 2; st.n[1] += cy / 2; st.n[2] += cz / 2;
    }
    stats.forEach(function (s) {
      if (!s.area) return;
      s.c = s.c.map(function (q) { return q / s.area; });
      var ln = Math.sqrt(s.n[0] * s.n[0] + s.n[1] * s.n[1] + s.n[2] * s.n[2]);
      s.dir = ln / s.area;   // 1'e yakınsa bölge tek yöne bakıyor, 0'a yakınsa sarıyor
      s.n = ln ? s.n.map(function (q) { return q / ln; }) : [0, 0, 1];
    });
    // Etiketin çizgisinin indiği nokta: merkeze yakın ve bölgenin baktığı yöne bakan
    // bir köşe (saran bölgelerde yalnızca yakınlık). Ayrıca altı yöne (ön, arka, iki
    // yan, üst, alt) bakan birer aday: etiket, o an kameraya en çok bakan ve önü
    // açık olan adaya iniyor — omuz başı gibi yana bakan bir bölge önden de etiketlenir.
    var DIRS = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    stats.forEach(function (s) {
      s.rad = Math.max(0.01, Math.sqrt(Math.pow(s.max[0] - s.min[0], 2) + Math.pow(s.max[1] - s.min[1], 2) + Math.pow(s.max[2] - s.min[2], 2)) / 2);
      s.cs = DIRS.map(function () { return null; }); s.csc = DIRS.map(function () { return -1e9; });
    });
    for (i = 0; i < n2; i++) {
      var s3 = stats[RID[i]]; if (!s3.area) continue;
      var qx = P2[i * 3] - s3.c[0], qy = P2[i * 3 + 1] - s3.c[1], qz = P2[i * 3 + 2] - s3.c[2], q2 = qx * qx + qy * qy + qz * qz;
      var nx = N2[i * 3], ny = N2[i * 3 + 1], nz = N2[i * 3 + 2];
      var facing = s3.dir > 0.3 ? (nx * s3.n[0] + ny * s3.n[1] + nz * s3.n[2]) : 1;
      var sc = q2 * (facing > 0.5 ? 1 : 6);
      if (sc < s3.best) { s3.best = sc; s3.anchor = [P2[i * 3], P2[i * 3 + 1], P2[i * 3 + 2]]; s3.an = [nx, ny, nz]; }
      var near = Math.sqrt(q2) / s3.rad;
      for (k = 0; k < 6; k++) {
        var dk = DIRS[k], f = nx * dk[0] + ny * dk[1] + nz * dk[2] - 1.2 * near;
        if (f > s3.csc[k]) { s3.csc[k] = f; s3.cs[k] = [P2[i * 3], P2[i * 3 + 1], P2[i * 3 + 2], nx, ny, nz]; }
      }
    }
    stats.forEach(function (s) {
      if (!s.area) return;
      s.cands = [[s.anchor[0], s.anchor[1], s.anchor[2], s.an[0], s.an[1], s.an[2]]].concat(s.cs.filter(Boolean));
      delete s.cs; delete s.csc; delete s.best;
    });
    return stats;
  }
  function finish(m, d) {
    var S = m.S, T = m.T, R = m.R, nv = S.n, nt = R.length, p = S.p, i, k;
    var nrm = vertexNormals(p, T, nv);
    var first = new Int16Array(nv).fill(-1), multi = new Uint8Array(nv);
    for (i = 0; i < nt * 3; i++) {
      var v = T[i], r0 = R[(i / 3) | 0];
      if (first[v] < 0) first[v] = r0; else if (first[v] !== r0) multi[v] = 1;
    }
    // Sınır kenarları: iki yanındaki üçgen farklı bölgede. bseg[v]: v'nin sınır komşuları.
    var eReg = new Map(), bseg = {};
    for (i = 0; i < nt; i++) for (k = 0; k < 3; k++) {
      var ea = T[i * 3 + k], eb = T[i * 3 + (k + 1) % 3];
      if (!multi[ea] || !multi[eb]) continue;
      var key = ea < eb ? ea * nv + eb : eb * nv + ea, er = eReg.get(key);
      if (er == null) eReg.set(key, R[i]);
      else if (er !== R[i] && er !== -1) {
        (bseg[ea] || (bseg[ea] = [])).push(eb); (bseg[eb] || (bseg[eb] = [])).push(ea);
        eReg.set(key, -1);
      }
    }
    var dist = seamDistance(p, vertexRings(T, nv), multi, nv, 0.03, bseg);
    // Sınır köşelerini bölge başına çoğalt.
    var copies = {}, out = nv, dup = [], index = new Uint32Array(nt * 3);
    for (i = 0; i < nt * 3; i++) {
      var v3 = T[i], r = R[(i / 3) | 0];
      if (!multi[v3] || first[v3] === r) { index[i] = v3; continue; }
      var ck = v3 * 256 + r, cp = copies[ck];
      if (cp == null) { cp = copies[ck] = out++; dup.push(v3, r); }
      index[i] = cp;
    }
    var n2 = out, P2 = new Float32Array(n2 * 3), N2 = new Float32Array(n2 * 3);
    var A2 = new Float32Array(n2 * NA), RID = new Float32Array(n2), SEAM = new Float32Array(n2);
    P2.set(p.subarray(0, nv * 3)); N2.set(nrm); A2.set(S.a.subarray(0, nv * NA));
    for (i = nv; i < n2; i++) {
      var src = dup[(i - nv) * 2];
      for (k = 0; k < 3; k++) { P2[i * 3 + k] = p[src * 3 + k]; N2[i * 3 + k] = nrm[src * 3 + k]; }
      for (k = 0; k < NA; k++) A2[i * NA + k] = S.a[src * NA + k];
    }
    for (i = 0; i < n2; i++) {
      if (i < nv) { RID[i] = first[i] < 0 ? 0 : first[i]; SEAM[i] = dist[i]; }
      else { RID[i] = dup[(i - nv) * 2 + 1]; SEAM[i] = 0; }
    }
    return { n: n2, nt: nt, pos: P2, nrm: N2, a: A2, rid: RID, seam: SEAM, index: index,
      faceRegion: R, stats: regionStats(P2, N2, RID, index, R, n2, nt), meta: d.meta };
  }

  function buildBody(buf) {
    var d = decode(buf);
    return finish(subdivide(splitRegions(d)), d);
  }

  /* ── Işın izleme ızgarası ─────────────────────────────────────────────────
     130 bin üçgende her dokunuşta hepsini denemek telefonda yavaş; üçgenler
     2,5 cm'lik hücrelere dağıtılıyor, ışın yalnızca geçtiği hücrelere bakıyor.
     Etiketlerin arkada kalıp kalmadığı da bununla sınanıyor. */
  function Grid(pos, index, nt) {
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], i, k;
    for (i = 0; i < pos.length; i += 3) for (k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
    var cs = 0.025, dim = [0, 0, 0];
    for (k = 0; k < 3; k++) { mn[k] -= 0.001; mx[k] += 0.001; dim[k] = Math.max(1, Math.ceil((mx[k] - mn[k]) / cs)); }
    var nc = dim[0] * dim[1] * dim[2], cnt = new Uint32Array(nc + 1);
    function cell(v, k2) { return clamp(Math.floor((v - mn[k2]) / cs), 0, dim[k2] - 1); }
    function each(t, fn) {
      var lo = [0, 0, 0], hi = [0, 0, 0], a = index[t * 3] * 3, b = index[t * 3 + 1] * 3, c = index[t * 3 + 2] * 3;
      for (var q = 0; q < 3; q++) {
        lo[q] = cell(Math.min(pos[a + q], pos[b + q], pos[c + q]), q);
        hi[q] = cell(Math.max(pos[a + q], pos[b + q], pos[c + q]), q);
      }
      for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++)
        fn((z * dim[1] + y) * dim[0] + x);
    }
    for (i = 0; i < nt; i++) each(i, function (c) { cnt[c + 1]++; });
    for (i = 0; i < nc; i++) cnt[i + 1] += cnt[i];
    var fill = cnt.slice(0, nc), list = new Uint32Array(cnt[nc]);
    for (i = 0; i < nt; i++) each(i, function (c) { list[fill[c]++] = i; });
    this.mn = mn; this.mx = mx; this.cs = cs; this.dim = dim; this.start = cnt; this.list = list;
    this.pos = pos; this.index = index; this.stamp = new Uint32Array(nt); this.gen = 0;
  }
  // Işının ilk çarptığı üçgen: { t, face } ya da null. o, d: [x,y,z] (d birim).
  Grid.prototype.cast = function (o, d, tMax) {
    var mn = this.mn, mx = this.mx, cs = this.cs, dim = this.dim, k;
    var t0 = 0, t1 = tMax || 1e9;
    for (k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-12) { if (o[k] < mn[k] || o[k] > mx[k]) return null; continue; }
      var ta = (mn[k] - o[k]) / d[k], tb = (mx[k] - o[k]) / d[k];
      if (ta > tb) { var sw = ta; ta = tb; tb = sw; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return null;
    }
    var p = [o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0], c = [0, 0, 0], step = [0, 0, 0], tn = [0, 0, 0], dt = [0, 0, 0];
    for (k = 0; k < 3; k++) {
      c[k] = clamp(Math.floor((p[k] - mn[k]) / cs), 0, dim[k] - 1);
      if (d[k] > 0) { step[k] = 1; tn[k] = t0 + ((mn[k] + (c[k] + 1) * cs) - p[k]) / d[k]; dt[k] = cs / d[k]; }
      else if (d[k] < 0) { step[k] = -1; tn[k] = t0 + ((mn[k] + c[k] * cs) - p[k]) / d[k]; dt[k] = -cs / d[k]; }
      else { step[k] = 0; tn[k] = 1e30; dt[k] = 1e30; }
    }
    var best = null, bt = t1, gen = ++this.gen, pos = this.pos, idx = this.index, stamp = this.stamp;
    if (gen > 4e9) { stamp.fill(0); gen = this.gen = 1; }
    for (var guard = 0; guard < 4096; guard++) {
      var ci = (c[2] * dim[1] + c[1]) * dim[0] + c[0], s = this.start[ci], e = this.start[ci + 1];
      for (var q = s; q < e; q++) {
        var tr = this.list[q]; if (stamp[tr] === gen) continue; stamp[tr] = gen;
        var a = idx[tr * 3] * 3, b = idx[tr * 3 + 1] * 3, cc = idx[tr * 3 + 2] * 3;
        var e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
        var e2x = pos[cc] - pos[a], e2y = pos[cc + 1] - pos[a + 1], e2z = pos[cc + 2] - pos[a + 2];
        var px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
        var det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
        var inv = 1 / det, sx = o[0] - pos[a], sy = o[1] - pos[a + 1], sz = o[2] - pos[a + 2];
        var u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
        var qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        var v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv; if (v < 0 || u + v > 1) continue;
        var t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 1e-5 && t < bt) { bt = t; best = tr; }
      }
      // Bu hücrenin çıkışından önce bir çarpma varsa daha ileriye bakmaya gerek yok.
      var ax = tn[0] < tn[1] ? (tn[0] < tn[2] ? 0 : 2) : (tn[1] < tn[2] ? 1 : 2);
      if (best != null && bt <= tn[ax]) break;
      if (tn[ax] > t1) break;
      c[ax] += step[ax];
      if (c[ax] < 0 || c[ax] >= dim[ax]) break;
      tn[ax] += dt[ax];
    }
    return best == null ? null : { t: bt, face: best };
  };

  /* ── Renkler ──────────────────────────────────────────────────────────────
     Bölgelerin kendi rengi yok; renk yalnızca durumu gösteriyor: seçili bölge
     vurgu mavisi, işaretli bölge şiddet rengi (Hafif / Orta / Yüksek). */
  var COL = {
    active: '#2f9dff',
    sev: { 1: '#46d6a0', 2: '#fcd34d', 3: '#ff6b5b' }
  };
  function hexRGB(h) { var v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }

  function glAvailable() {
    try {
      var c = document.createElement('canvas');
      // Three.js r163'ten beri yalnızca WebGL2 ile çalışıyor.
      return !!(global.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }

  /* Three.js'i ve model dosyasını bir kez yükle, modeli bir kez kur. Takılan bir
     ağ formu kilitlemesin diye süre sınırı var; biri gelmezse 3D açılmıyor. */
  var loading = null, BODY = null;
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (!glAvailable()) { reject(new Error('webgl')); return; }
      if (!global.fetch || !global.Promise) { reject(new Error('fetch')); return; }
      var timer = setTimeout(function () { reject(new Error('timeout')); }, 25000);
      var imp;
      try { imp = import(THREE_URL); } catch (e) { clearTimeout(timer); reject(e); return; }
      var mesh = BODY ? Promise.resolve(null) : fetch(MESH_URL).then(function (r) {
        if (!r.ok) throw new Error('PainBody: model dosyası ' + r.status);
        return r.arrayBuffer();
      });
      Promise.all([imp, mesh]).then(function (res) {
        clearTimeout(timer);
        if (!BODY) BODY = buildBody(res[1]);
        resolve(res[0]);
      }).catch(function (e) { clearTimeout(timer); reject(e); });
    });
    // Başarısız bir deneme kalıcı olmasın: bir sonraki çağrı yeniden denesin.
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* Hızlı yakınlaşma: referans görseldeki "baş ve boyun / el / diz / ayak" kutuları
     gibi, bir de gövde. Aynı düğmeye yeniden basınca ikinci görünüm: ense, sırt,
     öbür el, dizlerin ve ayakların arkası. [yaw, pitch, hedef x, y, z, yükseklik (m), genişlik (m)] */
  function zonePresets(J) {
    var hand = function (s) {
      var w = J['wrist.' + s], sx = s === 'L' ? 1 : -1;
      return [sx * 0.62, 0.1, w[0] + sx * 0.004, w[1] - 0.1, w[2] + 0.02, 0.34, 0.2];
    };
    var knee = J['lowerleg01.L'][1] + 0.025, ank = J['foot.L'];
    return {
      head: [[0, 0.04, 0, 1.63, 0.02, 0.44, 0.3], [Math.PI, 0.04, 0, 1.6, 0, 0.46, 0.3]],
      trunk: [[0, 0.04, 0, 1.2, 0.03, 0.64, 0.56], [Math.PI, 0.04, 0, 1.2, -0.03, 0.64, 0.56]],
      hand: [hand('R'), hand('L')],
      knee: [[0, 0.02, 0, knee, 0.03, 0.40, 0.44], [Math.PI, 0.02, 0, knee, 0.0, 0.40, 0.44]],
      foot: [[0.22, 0.32, 0, ank[1] - 0.02, ank[2] + 0.05, 0.26, 0.46], [Math.PI - 0.22, 0.2, 0, ank[1] + 0.005, ank[2] - 0.03, 0.26, 0.46]]
    };
  }

  /* ── Görüntüleyici ──────────────────────────────────────────────────────── */
  function create(THREE, opts) {
    opts = opts || {};
    if (!BODY) throw new Error('PainBody: önce load()');
    var B = BODY, NK = REGIONS.length;
    var canvas = document.createElement('canvas');
    canvas.className = 'pb-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    // Bölge etiketleri ayrı, düz bir tuvalde; modelin üstünde, dokunmayı engellemeden.
    var lab = document.createElement('canvas');
    lab.className = 'pb-labels';
    lab.setAttribute('aria-hidden', 'true');
    lab.style.pointerEvents = 'none';
    lab.style.zIndex = '1';
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    var scene = new THREE.Scene();
    var FOV = 26;
    var camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);
    scene.add(camera);

    // Işıklar kameraya bağlı: model hangi yöne çevrilirse çevrilsin bakılan taraf
    // aynı şekilde aydınlanıyor. Anahtar ışık sol üstten (kas kabartısı okunsun),
    // arkadan soğuk bir kenar ışığı (siluet koyu zeminde kaybolmasın).
    var lightTarget = new THREE.Object3D(); lightTarget.position.set(0, 0, -3); camera.add(lightTarget);
    scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x3a2e28, 0.9));
    function camLight(color, inten, x, y, z) {
      var l = new THREE.DirectionalLight(color, inten); l.position.set(x, y, z); l.target = lightTarget; camera.add(l); return l;
    }
    camLight(0xfff4ea, 2.4, -1.6, 2.2, 2.0);
    camLight(0xc8d8ff, 0.7, 2.0, 0.3, 1.0);
    camLight(0x9cc8ff, 1.6, 0.5, 1.2, -3);

    /* ── Beden ── */
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(B.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(B.nrm, 3));
    geo.setAttribute('rid', new THREE.BufferAttribute(B.rid, 1));
    geo.setAttribute('seam', new THREE.BufferAttribute(B.seam, 1));
    geo.setAttribute('pbA', new THREE.BufferAttribute(B.a, NA));
    geo.setIndex(new THREE.BufferAttribute(B.index, 1));
    geo.computeBoundingSphere();

    // Bölge başına iki satırlık küçük doku: 1. satır renk + saydamlık, 2. satır
    // durum (seçili / işaretli / fare üstünde). Durum değişince yalnız bu güncelleniyor.
    var palData = new Uint8Array(NK * 8);
    var palTex = new THREE.DataTexture(palData, NK, 2, THREE.RGBAFormat);
    palTex.magFilter = palTex.minFilter = THREE.NearestFilter;
    palTex.generateMipmaps = false;
    palTex.colorSpace = THREE.SRGBColorSpace;
    palTex.needsUpdate = true;

    var material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
    var U = {
      uPal: { value: palTex }, uNK: { value: NK },
      uSkin: { value: new THREE.Color('#c8906c') }, uFabric: { value: new THREE.Color('#8b919a') },
      uLine: { value: new THREE.Color('#24160f') }, uSeamW: { value: 0.6 * dpr },
      uHipL: { value: new THREE.Vector3().fromArray(B.meta.joints['upperleg01.L']) },
      uHipR: { value: new THREE.Vector3().fromArray(B.meta.joints['upperleg01.R']) }
    };
    /* Gölgelendirici eki. Tek renk deri (şortta kumaş), pişirilmiş AO, bölge
       sınırında ince koyu bir çizgi. İşaretli bölge şiddet rengini, seçili bölge
       vurgu mavisini alıyor; işaretsiz bölgelerin rengi yok. Çizginin kalınlığı
       köşenin sınıra olan uzaklığının ekrandaki değişim hızından çıkıyor;
       yakınlaşınca da uzaklaşınca da aynı incelikte, her yönde aynı kalınlıkta. */
    material.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', ['#include <common>',
          'attribute float rid; attribute float seam; attribute vec2 pbA;',
          'varying float vRid; varying float vSeam; varying vec2 vPbA; varying vec3 vObj;'].join('\n'))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRid = rid; vSeam = seam; vPbA = pbA; vObj = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', ['#include <common>',
          'varying float vRid; varying float vSeam; varying vec2 vPbA; varying vec3 vObj;',
          'uniform sampler2D uPal; uniform float uNK; uniform vec3 uSkin; uniform vec3 uFabric;',
          'uniform vec3 uLine; uniform float uSeamW; uniform vec3 uHipL; uniform vec3 uHipR;',
          'vec4 pbFlags;',
          'float pbHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
          'float pbNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
          '  return mix(mix(mix(pbHash(i), pbHash(i + vec3(1,0,0)), f.x), mix(pbHash(i + vec3(0,1,0)), pbHash(i + vec3(1,1,0)), f.x), f.y),',
          '             mix(mix(pbHash(i + vec3(0,0,1)), pbHash(i + vec3(1,0,1)), f.x), mix(pbHash(i + vec3(0,1,1)), pbHash(i + vec3(1,1,1)), f.x), f.y), f.z); }'
        ].join('\n'))
        .replace('#include <color_fragment>', ['#include <color_fragment>',
          'vec3 skin = uSkin * (0.94 + 0.12 * pbNoise(vObj * 40.0));',
          'float nz = pbNoise(vObj * 180.0) * 0.5 + pbNoise(vObj * 420.0) * 0.5;',
          // Şort: bel bandı (önde 96 cm, yanlarda biraz yukarıda; bölge kurallarındaki
          // waistY ile aynı — karın orada bitiyor) ile paça ağzı (dışta biraz aşağıda,
          // arkada kalçanın altında) arası; kenar konumdan, bir piksel yumuşaklıkta.
          // Maske yalnızca kumaşın olabileceği köşeleri (gövde, bacak) seçiyor.
          'float sd = vObj.x > 0.0 ? 1.0 : -1.0;',
          'vec3 hip = vObj.x > 0.0 ? uHipL : uHipR;',
          'float waist = 0.962 + 0.015 * (1.0 - cos(atan(vObj.x, vObj.z + 0.01)));',
          'float lph = atan((vObj.x - hip.x) * sd, vObj.z - hip.z);',
          'float legO = 0.80 + 0.009 * (1.0 + sin(lph)) - 0.005 * (1.0 + cos(lph));',
          'float band = min(vObj.y - legO, waist - vObj.y);',
          'float fwb = max(fwidth(band), 1e-5);',
          'float fab = step(0.5, vPbA.y) * smoothstep(-fwb, fwb, band);',
          'vec3 alb = mix(skin, uFabric * (0.9 + 0.2 * nz), fab);',
          'float rx = (floor(vRid + 0.5) + 0.5) / uNK;',
          'vec4 rc = texture2D(uPal, vec2(rx, 0.25));',
          'pbFlags = texture2D(uPal, vec2(rx, 0.75));',
          // Kumaş koyu: şiddet rengi şortun üstünde de koyulaşıyor, yapı kaybolmuyor.
          'float rel = clamp(dot(alb, vec3(0.3, 0.59, 0.11)) / dot(skin, vec3(0.3, 0.59, 0.11)), 0.5, 1.1);',
          'alb = mix(alb, rc.rgb * rel, rc.a);',
          'diffuseColor.rgb = alb;'].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.52, 0.85, fab);')
        .replace('#include <aomap_fragment>', ['float ambientOcclusion = mix(1.0, vPbA.x, 0.95);',
          'reflectedLight.indirectDiffuse *= ambientOcclusion;',
          'reflectedLight.directDiffuse *= mix(1.0, ambientOcclusion, 0.55);',
          'reflectedLight.indirectSpecular *= ambientOcclusion;'].join('\n'))
        .replace('#include <dithering_fragment>', [
          'float spx = vSeam / max(length(vec2(dFdx(vSeam), dFdy(vSeam))), 1e-7);',
          'float sw = uSeamW * (1.0 + 1.2 * pbFlags.r + 0.4 * pbFlags.g);',
          'float line = 1.0 - smoothstep(sw - 0.5, sw + 0.5, spx);',
          'gl_FragColor.rgb = mix(gl_FragColor.rgb, uLine, line * (0.7 + 0.25 * max(pbFlags.r, pbFlags.g)));',
          // Seçili bölgenin kenarı içeriden hafifçe parlıyor.
          'gl_FragColor.rgb += pbFlags.r * (1.0 - smoothstep(0.0, uSeamW * 10.0, spx)) * vec3(0.05, 0.12, 0.2);',
          '#include <dithering_fragment>'].join('\n'));
    };
    var body = new THREE.Mesh(geo, material);
    scene.add(body);

    // Işın ızgarası ilk dokunuşta ya da ilk kareden hemen sonra kuruluyor; açılışı geciktirmesin.
    var gridObj = null;
    function grid() { if (!gridObj) gridObj = new Grid(B.pos, B.index, B.nt); return gridObj; }
    setTimeout(function () { if (!disposed) grid(); }, 400);
    var stats = B.stats;
    var ACT = hexRGB(COL.active);
    var SEV = { 1: hexRGB(COL.sev[1]), 2: hexRGB(COL.sev[2]), 3: hexRGB(COL.sev[3]) };

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
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opacity == null ? 1 : opacity, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
    }
    var floor = new THREE.Group();
    floor.add(flat(0.62, radialTex([[0, 'rgba(0,148,255,0.20)'], [0.55, 'rgba(0,148,255,0.07)'], [1, 'rgba(0,148,255,0)']]), 0.0005));
    floor.add(flat(0.36, radialTex([[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]), 0.001));
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.47, 0.475, 96),
      new THREE.MeshBasicMaterial({ color: 0x0094ff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
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
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false }));
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

    /* ── Renk durumu ──
       İşaretsiz bölge renksiz: yalnızca deri ve sınır çizgisi. İşaretlenen bölge
       şiddet rengine boyanıyor; panelde açık olan (seçili) bölge vurgu mavisinde,
       kenarı kalın. Fare üstündeki bölge hafifçe açılıyor. */
    var state = { map: {}, active: null, hover: null };
    function recolor() {
      REGIONS.forEach(function (r, i) {
        var sev = SEV[state.map[r.k]], act = r.k === state.active, hov = r.k === state.hover && !act;
        var c = [255, 255, 255], a = 0;
        if (sev) { c = sev; a = act ? 0.95 : 0.88; }
        else if (act) { c = ACT; a = 0.68; }
        else if (hov) a = 0.16;
        var o = i * 4, f = (NK + i) * 4;
        palData[o] = c[0]; palData[o + 1] = c[1]; palData[o + 2] = c[2]; palData[o + 3] = Math.round(a * 255);
        palData[f] = act ? 255 : 0; palData[f + 1] = sev ? 255 : 0; palData[f + 2] = hov ? 255 : 0; palData[f + 3] = 255;
      });
      palTex.needsUpdate = true;
      requestRender();
    }

    /* ── Kamera ──
       Hedef noktanın etrafında dönen bir yörünge: yaw (sağa-sola), pitch (yukarı-
       aşağı), uzaklık. Her kare, o anki değer hedef değere yumuşakça yaklaşıyor. */
    // Başın üstünde görünüm seçiciye yer kalsın diye merkez biraz yukarıda.
    var HOME = { x: 0, y: 0.96, z: 0 };
    var cur = { yaw: 0.85, pitch: 0.16, dist: 5, x: HOME.x, y: HOME.y, z: HOME.z };
    var goal = { yaw: 0, pitch: 0.06, dist: 5, x: HOME.x, y: HOME.y, z: HOME.z };
    var fitDist = 5, width = 1, height = 1;
    var PITCH_MIN = -0.8, PITCH_MAX = 1.05, MIN_DIST = 0.42;
    var reduced = false;
    try { reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) { cur.yaw = goal.yaw; cur.pitch = goal.pitch; }
    var ZONES = zonePresets(B.meta.joints), zoneState = null;

    function computeFit() {
      var tv = Math.tan(FOV * DEG / 2), aspect = width / Math.max(1, height);
      var dV = (0.5 * 2.1) / tv, dH = (0.5 * 0.95) / (tv * aspect);
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
    // Kullanıcı modeli kendisi çevirince/yaklaştırınca hızlı yakınlaşma düğmesi söner.
    function clearZone() { if (zoneState) { zoneState = null; if (opts.onZone) opts.onZone(null, 0); } }

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
      drawLabels();
      dirty = false;
      // Hangi yüzden bakıldığı (ön / arka / sağ / sol): arayüz o düğmeyi yakıyor.
      var q = Math.round(wrapPi(cur.yaw) / (Math.PI / 2));
      var v = q === 0 ? 'front' : (q === 2 || q === -2 ? 'back' : (q === 1 ? 'left' : 'right'));
      if (v !== lastView) { lastView = v; if (opts.onView) opts.onView(v); }
      if (moving || dirty || Math.abs(inertia) > 0.00002) raf = global.requestAnimationFrame(frame);
      else lastT = 0;
    }

    /* ── Etiketler ──
       İşaretlenen (ve o an seçili) her bölge için, referans görseldeki gibi yan
       tarafta bir kutu ve bölgeye inen ince bir çizgi. Bölge o açıdan görünmüyorsa
       (arkada kalıyor ya da önünde başka bir uzuv var) etiketi de çizilmiyor.
       Kutular modelin solunda ve sağında iki sütuna diziliyor, üst üste binmiyor;
       iki satır: bölgenin adı ve şiddeti. */
    var tmpV = new THREE.Vector3(), LFONT = '600 11px "Space Grotesk", "Inter", "Segoe UI", system-ui, sans-serif';
    var SFONT = '700 10.5px "Space Grotesk", "Inter", "Segoe UI", system-ui, sans-serif';
    function roundRect(x, X, Y, w, h, r) {
      x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.arcTo(X + w, Y, X + w, Y + r, r);
      x.lineTo(X + w, Y + h - r); x.arcTo(X + w, Y + h, X + w - r, Y + h, r); x.lineTo(X + r, Y + h);
      x.arcTo(X, Y + h, X, Y + h - r, r); x.lineTo(X, Y + r); x.arcTo(X, Y, X + r, Y, r); x.closePath();
    }
    function fitText(x, t, max) {
      if (x.measureText(t).width <= max) return t;
      while (t.length > 1 && x.measureText(t + '…').width > max) t = t.slice(0, -1);
      return t + '…';
    }
    function drawLabels() {
      var W = width, H = height, pr = labDpr;
      var x = lab.getContext('2d'); if (!x) return;
      x.setTransform(pr, 0, 0, pr, 0, 0);
      x.clearRect(0, 0, W, H);
      if (!opts.label) return;
      var keys = Object.keys(state.map).filter(function (k) { return state.map[k] && INDEX[k] != null; });
      if (state.active && INDEX[state.active] != null && keys.indexOf(state.active) < 0) keys.push(state.active);
      if (!keys.length) return;
      var cp = camera.position, items = [];
      keys.forEach(function (k) {
        var st = stats[INDEX[k]]; if (!st || !st.cands) return;
        // Kameraya en çok bakan adaylardan önü açık olan ilki.
        var cs = st.cands.map(function (c) {
          var vx = cp.x - c[0], vy = cp.y - c[1], vz = cp.z - c[2], dl = Math.sqrt(vx * vx + vy * vy + vz * vz);
          return { c: c, dl: dl, v: [vx / dl, vy / dl, vz / dl], f: (c[3] * vx + c[4] * vy + c[5] * vz) / dl };
        }).filter(function (o) { return o.f > 0.12; }).sort(function (p, q) { return q.f - p.f; }).slice(0, 3);
        var a = null;
        for (var ci = 0; ci < cs.length && !a; ci++) {
          var o = cs[ci], hit = grid().cast([cp.x, cp.y, cp.z], [-o.v[0], -o.v[1], -o.v[2]], o.dl + 0.01);
          if (!hit || hit.t >= o.dl - 0.012) a = o.c;
        }
        if (!a) return;
        tmpV.set(a[0], a[1], a[2]).project(camera);
        var sx = (tmpV.x + 1) / 2 * W, sy = (1 - tmpV.y) / 2 * H;
        if (tmpV.z > 1 || sx < 4 || sx > W - 4 || sy < 4 || sy > H - 4) return;
        var info = opts.label(k); if (!info) return;
        items.push({ sx: sx, sy: sy, t: info.t, s: info.s || '', c: info.c || COL.active, act: k === state.active });
      });
      if (!items.length) return;
      // Kaçınılacak kutular (sahnedeki düğmeler): etiket onların altına iniyor.
      var avoid = [];
      try { avoid = (opts.labelAvoid && opts.labelAvoid()) || []; } catch (e) { avoid = []; }
      tmpV.set(cur.x, cur.y, cur.z).project(camera);
      var mid = (tmpV.x + 1) / 2 * W, bottom = H - 8, GAP = 5, PAD = 8;
      var maxW = Math.max(84, Math.min(136, W * 0.38));
      items.forEach(function (it) {
        x.font = LFONT;
        it.name = fitText(x, it.t, maxW - 2 * PAD - 8);
        var w1 = x.measureText(it.name).width, w2 = 0;
        if (it.s) { x.font = SFONT; w2 = x.measureText(it.s).width; }
        it.w = Math.ceil(Math.max(w1 + 8, w2 + 8) + 2 * PAD); it.h = it.s ? 34 : 22;
      });
      [[items.filter(function (it) { return it.sx < mid; }), true], [items.filter(function (it) { return it.sx >= mid; }), false]].forEach(function (col) {
        var list = col[0], left = col[1];
        list.sort(function (p, q) { return p.sy - q.sy; });
        list.forEach(function (it) {
          it.bx = left ? 6 : W - 6 - it.w; it.minY = 8;
          avoid.forEach(function (r) { if (it.bx < r.right + 4 && it.bx + it.w > r.left - 4) it.minY = Math.max(it.minY, r.bottom + 6); });
        });
        var y = 8;
        list.forEach(function (it) { it.y = Math.max(it.sy - it.h / 2, y, it.minY); y = it.y + it.h + GAP; });
        var lim = bottom;
        for (var i = list.length - 1; i >= 0; i--) { list[i].y = Math.max(list[i].minY, Math.min(list[i].y, lim - list[i].h)); lim = list[i].y - GAP; }
        list.forEach(function (it) {
          var bx = it.bx, by = Math.round(it.y);
          var cy = by + it.h / 2, ex = left ? bx + it.w : bx, knee = left ? ex + 7 : ex - 7;
          x.strokeStyle = 'rgba(255,255,255,0.78)'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(ex, cy); x.lineTo(knee, cy); x.lineTo(it.sx, it.sy); x.stroke();
          x.beginPath(); x.arc(it.sx, it.sy, 3.5, 0, Math.PI * 2); x.fillStyle = it.c; x.fill();
          x.lineWidth = 1.5; x.strokeStyle = '#ffffff'; x.stroke();
          roundRect(x, bx, by, it.w, it.h, 7);
          x.fillStyle = 'rgba(14,16,20,0.9)'; x.fill();
          x.lineWidth = it.act ? 1.5 : 1; x.strokeStyle = it.act ? '#ffffff' : it.c; x.stroke();
          x.fillStyle = it.c; x.beginPath(); x.arc(bx + PAD + 2.5, by + 11, 3, 0, Math.PI * 2); x.fill();
          x.textBaseline = 'middle';
          x.font = LFONT; x.fillStyle = '#eef0f3'; x.fillText(it.name, bx + PAD + 9, by + 11.5);
          if (it.s) { x.font = SFONT; x.fillStyle = it.c; x.fillText(it.s, bx + PAD + 9, by + 25); }
        });
      });
    }

    /* ── Boyut ── */
    var host = null, ro = null, labDpr = Math.min(2, global.devicePixelRatio || 1);
    function resize() {
      if (!host) return;
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var oldFit = fitDist;
      width = w; height = h;
      renderer.setSize(w, h, false);
      lab.width = Math.round(w * labDpr); lab.height = Math.round(h * labDpr);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      fitDist = computeFit();
      var ratioC = cur.dist / oldFit, ratioG = goal.dist / oldFit;
      cur.dist = ratioC * fitDist; goal.dist = ratioG * fitDist;
      clampGoal();
      requestRender();
    }
    function attach(el) {
      host = el;
      // Tuvalin üstündeki düğmeler ve yazılar görünür kalsın: tuval hep en altta,
      // etiket katmanı hemen üstünde.
      el.insertBefore(canvas, el.firstChild);
      el.insertBefore(lab, canvas.nextSibling);
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
      var o = raycaster.ray.origin, d = raycaster.ray.direction;
      var hit = grid().cast([o.x, o.y, o.z], [d.x, d.y, d.z]);
      if (!hit) return null;
      return { key: REGIONS[B.faceRegion[hit.face]].k, point: { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t, z: o.z + d.z * hit.t } };
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
        clearZone();
        var sp = 5.2 / Math.max(260, width);
        goal.yaw -= dx * sp;
        if (full || gesture.type === 'mouse') goal.pitch = clamp(goal.pitch + dy * sp * 0.8, PITCH_MIN, PITCH_MAX);
        var now = performance.now(), dtm = Math.max(1, now - gesture.lt);
        gesture.vx = 0.7 * gesture.vx + 0.3 * (dx * sp / dtm); gesture.lt = now;
        requestRender();
      } else if (gesture.kind === 'two' && npt >= 2) {
        clearZone();
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
        if (dbl || goal.dist < fitDist * 0.8) { goal.x = hit.point.x; goal.y = hit.point.y; goal.z = hit.point.z * 0.5; clearZone(); }
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
      clearZone();
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
      clearZone();
      requestRender();
    }
    function reset() { view('front'); }
    function zoom(f) { goal.dist *= f; clampGoal(); clearZone(); requestRender(); }
    /* Hızlı yakınlaşma (baş / el / diz / ayak). Aynı düğmeye yeniden basmak o
       bölgenin ikinci görünümüne geçiyor. Hangi görünümde olunduğu dönüyor. */
    function zone(name) {
      var Z = ZONES[name]; if (!Z) return -1;
      var idx = zoneState && zoneState.name === name ? (zoneState.idx + 1) % Z.length : 0, z = Z[idx];
      var tv = Math.tan(FOV * DEG / 2), aspect = width / Math.max(1, height);
      goal.yaw = nearYaw(z[0]); goal.pitch = z[1];
      goal.x = z[2]; goal.y = z[3]; goal.z = z[4];
      goal.dist = Math.max(z[5] / 2 / tv, z[6] / 2 / (tv * aspect));
      inertia = 0;
      clampGoal();
      zoneState = { name: name, idx: idx };
      if (opts.onZone) opts.onZone(name, idx);
      requestRender();
      return idx;
    }
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
      clearZone();
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
      palTex.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      if (lab.parentNode) lab.parentNode.removeChild(lab);
    }

    canvas.style.touchAction = 'pan-y';
    setLabels(opts.right || 'SAĞ', opts.left || 'SOL');
    recolor();
    return {
      canvas: canvas, attach: attach, update: update, focus: focus, view: view, zone: zone, reset: reset, zoom: zoom,
      setLabels: setLabels, setExpanded: setExpanded, resize: resize, dispose: dispose, redraw: requestRender,
      // Test ve hata ayıklama için: bir bölgenin ekrandaki yaklaşık konumu (yüzeydeki
      // çapa noktası) ve istatistikleri.
      project: function (k) {
        var i = INDEX[k]; if (i == null || !stats[i].anchor) return null;
        applyCamera(); camera.updateMatrixWorld();
        var a = stats[i].anchor, v = new THREE.Vector3(a[0], a[1], a[2]).project(camera);
        var r = canvas.getBoundingClientRect();
        return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
      },
      pickAt: function (x, y) { var h = pick(x, y); return h ? h.key : null; },
      stats: function (k) { var i = INDEX[k]; return i == null ? null : stats[i]; }
    };
  }

  global.PainBody = {
    REGIONS: REGIONS, GROUPS: GROUPS, byKey: BY_KEY, COLORS: COL,
    load: load, create: create, glAvailable: glAvailable,
    // Model dosyasını Node'da ya da testte doğrudan açmak için.
    _build: buildBody
  };
})(typeof window !== 'undefined' ? window : this);
