/* pain-body.bin'i üret: MakeHuman mankeni (yüzsüz) + bölgeler + sınır noktaları + pişirilmiş AO.

   Çalıştırma (bu klasörde):  npm install && node fetch.js && node build.js
   Çıktı deponun köküne, pain-body.js'in yanına yazılıyor. Dosya biçimi
   pain-body.js'teki decode()'un başında anlatılıyor.

   Bölgelerin adları pain-body.js'teki katalogdan kontrol ediliyor: katalogda
   olmayan bir ad ya da hiç köşesi olmayan bir bölge derlemeyi durduruyor. */
'use strict';
const fs = require('fs'), path = require('path');
const THREE = require('three');
const { MeshBVH } = require('three-mesh-bvh');
const { posed } = require('./makehuman');
const { faceless } = require('./face');
const { classify } = require('./regions');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'pain-body.bin');

function catalog() {
  const PB = require(path.join(ROOT, 'pain-body.js')).PainBody;
  return PB.REGIONS.map(r => r.k);
}

function make() {
  const m = posed();
  faceless(m);
  const { P, J } = m, nvAll = P.length / 3;
  const { reg, seg, used, between } = classify(m);
  // Yalnızca gövde ağının köşeleri; yardımcı ağlar (giysi, diş, dil…) dışarıda.
  const map = new Int32Array(nvAll).fill(-1); let nv = 0;
  for (let i = 0; i < nvAll; i++) if (used[i]) map[i] = nv++;
  const back = new Int32Array(nv), pos = new Float32Array(nv * 3);
  const quads = new Uint16Array(m.quads.length * 4), tris = new Uint16Array(m.tris.length * 3);
  for (let i = 0; i < nvAll; i++) if (map[i] >= 0) { back[map[i]] = i; for (let k = 0; k < 3; k++) pos[map[i] * 3 + k] = P[i * 3 + k]; }
  m.quads.forEach((q, k) => q.forEach((v, c) => { quads[k * 4 + c] = map[v]; }));
  m.tris.forEach((t, k) => t.forEach((v, c) => { tris[k * 3 + c] = map[v]; }));

  // Dörtgenler kısa köşegenden üçgenleniyor; hangi köşegen olduğu dosyaya yazılıyor
  // ki tarayıcı aynı üçgenleri kursun (sınır noktaları o kenarlar için). Yüz
  // yamasının üçgenleri olduğu gibi.
  const nq = m.quads.length, diag = new Uint8Array(Math.ceil(nq / 8)), tri = [];
  const d2 = (a, b) => (pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2;
  for (let k = 0; k < nq; k++) {
    const [a, b, c, d] = quads.subarray(k * 4, k * 4 + 4);
    if (d2(a, c) <= d2(b, d)) tri.push(a, b, c, a, c, d);
    else { tri.push(a, b, d, b, c, d); diag[k >> 3] |= 1 << (k & 7); }
  }
  for (let k = 0; k < tris.length; k++) tri.push(tris[k]);

  /* Sınır noktaları: iki ucu farklı bölgede olan her kenar için sınırın kenarı tam
     nerede kestiği (kuralın kendisiyle, kenar boyunca tarama + ikiye bölme). Kenar
     ortasından geçen sınır ızgarada basamak bırakıyordu; bu noktalar düz bir çizgi
     veriyor. t, küçük numaralı uçtan ölçülüyor. */
  const label = Array.from(back, i => reg[i]), edges = new Map();
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = tri[t + k], b = tri[t + (k + 1) % 3];
    if (label[a] === label[b]) continue;
    const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * 65536 + hi;
    if (edges.has(key)) continue;
    const A = back[lo], B = back[hi], ra = label[lo];
    let tt = 0.5;
    if (between(A, B, 0) === ra) {
      let prev = 0;
      for (let s = 1; s <= 24; s++) {
        const u = s / 24;
        if (between(A, B, u) !== ra) {
          let l = prev, h = u;
          for (let it = 0; it < 10; it++) { const mid = (l + h) / 2; if (between(A, B, mid) === ra) l = mid; else h = mid; }
          tt = (l + h) / 2; break;
        }
        prev = u;
      }
    }
    edges.set(key, [lo, hi, Math.max(4, Math.min(251, Math.round(tt * 255)))]);
  }

  // Normaller (AO için).
  const nrm = new Float32Array(nv * 3);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    const u = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]], w = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) nrm[v + k] += n[k];
  }
  for (let i = 0; i < nv; i++) { const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) nrm[i * 3 + k] /= l; }

  /* Ortam gölgesi (AO): her köşeden yarım küreye 96 ışın; 35 cm içinde bir yere
     çarpan ışın gölge sayılıyor (yakın çarpan daha çok). Koltuk altı, parmak
     araları, kas olukları derinleşiyor. Yönler sabit — derleme her seferinde aynı
     dosyayı veriyor. */
  const ao = new Float32Array(nv).fill(1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(tri);
  const bvh = new MeshBVH(geo), NR = 96, MAXD = 0.35, dirs = [];
  for (let k = 0; k < NR; k++) { const u = (k + 0.5) / NR, v = (k * 0.618034) % 1, r = Math.sqrt(u), th = 2 * Math.PI * v; dirs.push([r * Math.cos(th), r * Math.sin(th), Math.sqrt(1 - u)]); }
  const ray = new THREE.Ray(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  for (let i = 0; i < nv; i++) {
    n.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
    t1.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize(); t2.copy(n).cross(t1);
    const rot = (i * 2.399963) % (2 * Math.PI), cr = Math.cos(rot), sr = Math.sin(rot);
    let occ = 0;
    for (const d of dirs) {
      const dx = d[0] * cr - d[1] * sr, dy = d[0] * sr + d[1] * cr;
      ray.direction.set(t1.x * dx + t2.x * dy + n.x * d[2], t1.y * dx + t2.y * dy + n.y * d[2], t1.z * dx + t2.z * dy + n.z * d[2]);
      ray.origin.set(pos[i * 3] + n.x * 0.0008, pos[i * 3 + 1] + n.y * 0.0008, pos[i * 3 + 2] + n.z * 0.0008);
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      if (hit && hit.distance < MAXD) occ += 1 - Math.pow(hit.distance / MAXD, 0.5);
    }
    ao[i] = 1 - occ / NR;
  }

  // Şort: kumaşın olabileceği köşeler (gövde ve bacak, kalçanın çevresi). Bel bandı
  // ve paça ağzının kendisi gölgelendiricide, konumdan hesaplanıyor (pain-body.js):
  // kenar köşe ızgarasına takılmadan düz ve keskin çıkıyor. Kollar ve eller dışarıda.
  const brief = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const y = pos[i * 3 + 1];
    if (y > 0.70 && y < 1.06 && /^(torso|leg|shoulder)/.test(seg[back[i]])) brief[i] = 1;
  }

  const keys = [...new Set(label)], rid = new Uint8Array(nv);
  for (let i = 0; i < nv; i++) rid[i] = keys.indexOf(label[i]);
  return { nv, pos, quads, tris, diag, edges: [...edges.values()], rid, keys, ao, brief, J };
}

function write(a, file) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < a.nv; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.pos[i * 3 + k]); mx[k] = Math.max(mx[k], a.pos[i * 3 + k]); }
  mn = mn.map(v => Math.floor(v * 1000 - 1) / 1000); mx = mx.map(v => Math.ceil(v * 1000 + 1) / 1000);
  const r4 = v => v.map(x => Math.round(x * 10000) / 10000), J = {};
  // Görüntüleyicinin hızlı yakınlaşmaları için birkaç eklem.
  for (const n of ['head', 'neck01', 'spine01', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R',
    'upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'foot.L', 'foot.R']) J[n] = r4(a.J[n].head);
  const nq = a.quads.length / 4, nt = a.tris.length / 3, ne = a.edges.length;
  const meta = { v: 3, src: 'MakeHuman base mesh hm08 + targets (CC0 1.0), faceless', keys: a.keys, min: mn, max: mx, nv: a.nv, nq, nt, ne, joints: J };
  const js = Buffer.from(JSON.stringify(meta), 'utf8'), jl = (js.length + 3) & ~3;
  const buf = Buffer.alloc(8 + jl + a.nv * 6 + nq * 8 + nt * 6 + ne * 4 + a.diag.length + a.nv + a.nv * 2 + ne);
  let o = 0;
  buf.write('PBM3', o); o += 4; buf.writeUInt32LE(jl, o); o += 4;
  js.copy(buf, o); buf.fill(32, o + js.length, o + jl); o += jl;
  for (let i = 0; i < a.nv; i++) for (let k = 0; k < 3; k++) { buf.writeUInt16LE(Math.round((a.pos[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535), o); o += 2; }
  for (let i = 0; i < a.quads.length; i++) { buf.writeUInt16LE(a.quads[i], o); o += 2; }
  for (let i = 0; i < a.tris.length; i++) { buf.writeUInt16LE(a.tris[i], o); o += 2; }
  for (const e of a.edges) { buf.writeUInt16LE(e[0], o); buf.writeUInt16LE(e[1], o + 2); o += 4; }
  Buffer.from(a.diag).copy(buf, o); o += a.diag.length;
  for (let i = 0; i < a.nv; i++) buf[o++] = a.rid[i];
  const q8 = v => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let i = 0; i < a.nv; i++) { buf[o++] = q8(a.ao[i]); buf[o++] = q8(a.brief[i]); }
  for (const e of a.edges) buf[o++] = e[2];
  fs.writeFileSync(file, buf);
  return buf.length;
}

if (require.main === module) {
  const t0 = Date.now(), a = make(), cat = catalog();
  const unknown = a.keys.filter(k => cat.indexOf(k) < 0), missing = cat.filter(k => a.keys.indexOf(k) < 0);
  if (unknown.length || missing.length) {
    console.error('Bölge listesi katalogla tutmuyor.\n  katalogda yok: ' + unknown.join(', ') + '\n  modelde yok: ' + missing.join(', '));
    process.exit(1);
  }
  const bytes = write(a, OUT);
  console.log(path.relative(ROOT, OUT) + ': ' + bytes + ' bayt, ' + a.nv + ' köşe, ' + a.quads.length / 4 + ' dörtgen, ' + a.tris.length / 3 + ' üçgen, ' +
    a.edges.length + ' sınır kenarı, ' + a.keys.length + ' bölge (' + (Date.now() - t0) + ' ms)');
}
module.exports = { make, write };
