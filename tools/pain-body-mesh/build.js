/* pain-body.bin'i üret: MakeHuman mankeni + bölgeler + pişirilmiş AO + malzeme maskeleri.

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
const { classify } = require('./regions');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'pain-body.bin');
function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function catalog() {
  const PB = require(path.join(ROOT, 'pain-body.js')).PainBody;
  return PB.REGIONS.map(r => r.k);
}

function make() {
  const m = posed(), { P, J, W } = m, nvAll = P.length / 3;
  const { reg, seg, used } = classify(m);
  // Yalnızca gövde ağının köşeleri; yardımcı ağlar (giysi, diş, dil…) dışarıda.
  const map = new Int32Array(nvAll).fill(-1); let nv = 0;
  for (let i = 0; i < nvAll; i++) if (used[i]) map[i] = nv++;
  const back = new Int32Array(nv), pos = new Float32Array(nv * 3), quads = new Uint16Array(m.quads.length * 4);
  for (let i = 0; i < nvAll; i++) if (map[i] >= 0) { back[map[i]] = i; for (let k = 0; k < 3; k++) pos[map[i] * 3 + k] = P[i * 3 + k]; }
  m.quads.forEach((q, k) => q.forEach((v, c) => { quads[k * 4 + c] = map[v]; }));
  const tri = [];
  for (let k = 0; k < m.quads.length; k++) tri.push(quads[k * 4], quads[k * 4 + 1], quads[k * 4 + 2], quads[k * 4], quads[k * 4 + 2], quads[k * 4 + 3]);
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
     araları, kulak, göbek, kas oluklarını derinleştiriyor. Yönler sabit —
     derleme her seferinde aynı dosyayı veriyor. */
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

  /* Maskeler (0–1): kısa saç, kaş, dudak ve meme ucu, şort, yüz. Doku dosyası
     yok; gölgelendirici bunlarla deri rengini değiştiriyor. "Yüz" maskesi
     bölge renginin yüzün ortasında (göz, burun, ağız) hafiflemesi için —
     referans görseldeki gibi yüz doğal kalsın. */
  const eyeY = J['eye.L'].head[1];
  const hair = new Float32Array(nv), brow = new Float32Array(nv), lip = new Float32Array(nv), brief = new Float32Array(nv), face = new Float32Array(nv);
  let hc = [0, 0, 0], hn = 0;
  for (let i = 0; i < nv; i++) if (seg[back[i]] === 'head' && pos[i * 3 + 1] > eyeY) { for (let k = 0; k < 3; k++) hc[k] += pos[i * 3 + k]; hn++; }
  hc = hc.map(v => v / hn);
  // Saç çizgisi: kafanın ekseni etrafındaki açıya göre gözün ne kadar üstünde (m).
  const HL = [[0, 0.070], [25, 0.066], [45, 0.056], [58, 0.040], [68, 0.012], [74, -0.002], [80, 0.016], [100, 0.020],
              [112, 0.0], [125, -0.035], [145, -0.062], [180, -0.072]];
  function hairline(th) {
    th = Math.abs(th);
    for (let k = 0; k < HL.length - 1; k++) if (th <= HL[k + 1][0]) return HL[k][1] + (HL[k + 1][1] - HL[k][1]) * (th - HL[k][0]) / (HL[k + 1][0] - HL[k][0]);
    return HL[HL.length - 1][1];
  }
  const lipW = new Float32Array(nvAll);
  for (const [b, list] of Object.entries(W)) if (/^oris/.test(b)) for (const [i, w] of list) lipW[i] += w;
  const nip = [J['breast.L'].tail, J['breast.R'].tail];
  for (let i = 0; i < nv; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], g = seg[back[i]];
    if (g === 'head' || g === 'neck' || g === 'jaw') {
      const th = Math.atan2(x - hc[0], z - hc[2]) * 180 / Math.PI, hy = eyeY + hairline(th);
      const ear = Math.abs(x) > 0.066 && y < eyeY + 0.02 && y > eyeY - 0.075 && Math.abs(th) > 70 && Math.abs(th) < 125;
      hair[i] = ear ? 0 : smoothstep(hy - 0.004, hy + 0.006, y);
      const ax = Math.abs(x);
      if (z > 0.12 && ax > 0.008 && ax < 0.064) {
        const u = (ax - 0.010) / 0.052;
        const yb = eyeY + 0.022 + 0.007 * Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.9 + 0.1))) - 0.012 * Math.max(0, u - 0.7);
        const thick = 0.0055 * (1 - 0.45 * Math.max(0, u - 0.3));
        brow[i] = Math.exp(-Math.pow((y - yb) / thick, 2)) * smoothstep(0.004, 0.014, ax) * (1 - smoothstep(0.056, 0.066, ax));
      }
      lip[i] = smoothstep(0.35, 0.8, lipW[back[i]]) * (z > 0.13 ? 1 : 0);
      const fx = x / 0.066, fy = (y - (eyeY - 0.02)) / 0.075;
      face[i] = smoothstep(0.07, 0.1, z) * (1 - smoothstep(0.78, 1.0, Math.hypot(fx, fy)));
    }
    for (const q of nip) lip[i] = Math.max(lip[i], 0.75 * (1 - smoothstep(0.007, 0.012, Math.hypot(x - q[0], y - q[1], z - q[2]))));
    // Şort: bel bandı ve paça ağzı düz geometrik çizgiler (kemik sınırlarına bağlı değil).
    if (/^(torso|leg|shoulder|neck)/.test(g) && y < 1.02 && y > 0.74) {
      const side = x > 0 ? 'L' : 'R', cph = Math.cos(Math.atan2(x, z + 0.01));
      const waist = 0.962 + 0.03 * (1 - cph) / 2, hip = J['upperleg01.' + side].head;
      const lphi = Math.atan2((x - hip[0]) * (side === 'L' ? 1 : -1), z - hip[2]);
      const open = 0.80 + 0.018 * (1 + Math.sin(lphi)) / 2 - 0.01 * (1 + Math.cos(lphi)) / 2;
      brief[i] = smoothstep(open - 0.003, open + 0.003, y) * (1 - smoothstep(waist - 0.003, waist + 0.003, y));
    }
  }

  const keys = [...new Set(Array.from(back, i => reg[i]))];
  const rid = new Uint8Array(nv);
  for (let i = 0; i < nv; i++) rid[i] = keys.indexOf(reg[back[i]]);
  return { nv, pos, quads, rid, keys, ao, hair, brow, lip, brief, face, eyes: m.eyes, J };
}

function write(a, file) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < a.nv; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.pos[i * 3 + k]); mx[k] = Math.max(mx[k], a.pos[i * 3 + k]); }
  mn = mn.map(v => Math.floor(v * 1000 - 1) / 1000); mx = mx.map(v => Math.ceil(v * 1000 + 1) / 1000);
  const r4 = v => v.map(x => Math.round(x * 10000) / 10000), J = {};
  // Görüntüleyicinin hızlı yakınlaşmaları için birkaç eklem.
  for (const n of ['head', 'neck01', 'spine01', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R',
    'upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'foot.L', 'foot.R']) J[n] = r4(a.J[n].head);
  const meta = { v: 1, src: 'MakeHuman base mesh hm08 + targets (CC0 1.0)', keys: a.keys, min: mn, max: mx,
    nv: a.nv, nq: a.quads.length / 4, eyes: a.eyes.map(r4), joints: J };
  const js = Buffer.from(JSON.stringify(meta), 'utf8'), jl = (js.length + 3) & ~3, nq = a.quads.length / 4;
  const buf = Buffer.alloc(8 + jl + a.nv * 6 + nq * 8 + a.nv + a.nv * 6);
  let o = 0;
  buf.write('PBM1', o); o += 4; buf.writeUInt32LE(jl, o); o += 4;
  js.copy(buf, o); buf.fill(32, o + js.length, o + jl); o += jl;
  for (let i = 0; i < a.nv; i++) for (let k = 0; k < 3; k++) { buf.writeUInt16LE(Math.round((a.pos[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535), o); o += 2; }
  for (let i = 0; i < a.quads.length; i++) { buf.writeUInt16LE(a.quads[i], o); o += 2; }
  for (let i = 0; i < a.nv; i++) buf[o++] = a.rid[i];
  const q8 = v => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let i = 0; i < a.nv; i++) for (const ch of [a.ao, a.hair, a.brow, a.lip, a.brief, a.face]) buf[o++] = q8(ch[i]);
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
  console.log(path.relative(ROOT, OUT) + ': ' + bytes + ' bayt, ' + a.nv + ' köşe, ' + a.quads.length / 4 + ' dörtgen, ' + a.keys.length + ' bölge (' + (Date.now() - t0) + ' ms)');
}
module.exports = { make, write };
