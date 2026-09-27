/* MakeHuman taban ağı → atletik genç erkek, kollar yanda, ayakta.

   1) Şekil: taban ağa MakeHuman'ın "makro" hedefleri (cinsiyet, yaş, kas, kilo,
      boy, oran) MakeHuman'ın kendi ağırlık formülüyle uygulanıyor; üstüne V
      gövde, göğüs ve sırt kası, düz karın.
   2) Duruş: taban ağ kolları 45° açık (A duruşu) duruyor. MakeHuman'ın iskeleti
      ve deri ağırlıklarıyla (doğrusal karışımlı deri, LBS) köprücük ve omuz
      biraz indiriliyor, kollar gövdenin yanına, dirsek hafif bükük; bacaklar
      biraz toplanıyor.
   3) Birim: MakeHuman desimetre; burada metreye çevriliyor, ayak tabanı y=0.
      Model +z'ye bakıyor, sporcunun solu +x. */
'use strict';
const fs = require('fs'), path = require('path');
const THREE = require('three');
const { CACHE } = require('./fetch');

function parseObj(file) {
  const V = [], faces = []; let g = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('v ')) { const p = line.split(/\s+/); V.push(+p[1], +p[2], +p[3]); }
    else if (line.startsWith('g ')) g = line.slice(2).trim();
    else if (line.startsWith('f ')) {
      const p = line.trim().split(/\s+/).slice(1).map(s => s.split('/'));
      faces.push({ g, v: p.map(q => +q[0] - 1) });
    }
  }
  return { V: new Float64Array(V), faces };
}
// Hedef dosyası: "köşe dx dy dz" satırları.
function applyTarget(V, rel, w) {
  if (!w) return;
  for (const line of fs.readFileSync(path.join(CACHE, 'targets', rel), 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const p = line.trim().split(/\s+/); if (p.length < 4) continue;
    const i = +p[0] * 3; V[i] += w * +p[1]; V[i + 1] += w * +p[2]; V[i + 2] += w * +p[3];
  }
}

// Mankenin ölçüleri (MakeHuman kaydırıcıları, 0–1).
const SHAPE = {
  muscle: 1.0, weight: 0.55, height: 0.55, proportions: 1.0,
  race: { caucasian: 0.7, african: 0.15, asian: 0.15 },
  extra: { 'torso/torso-vshape-incr': 0.3, 'torso/torso-muscle-pectoral-incr': 0.5,
           'torso/torso-muscle-dorsi-incr': 0.4, 'stomach/stomach-pregnant-decr': 0.5 }
};
// MakeHuman'ın human.py'deki _setMuscleVals / _setWeightVals / _setHeightVals /
// _setBodyProportionVals formülleri; yaş 25 (genç = 1), erkek = 1.
function shape(opt) {
  const obj = parseObj(path.join(CACHE, '3dobjs/base.obj')), V = obj.V;
  const mus = { minmuscle: Math.max(0, 1 - opt.muscle * 2), maxmuscle: Math.max(0, opt.muscle * 2 - 1) };
  mus.averagemuscle = 1 - mus.minmuscle - mus.maxmuscle;
  const wt = { minweight: Math.max(0, 1 - opt.weight * 2), maxweight: Math.max(0, opt.weight * 2 - 1) };
  wt.averageweight = 1 - wt.minweight - wt.maxweight;
  const maxh = Math.max(0, opt.height * 2 - 1), ideal = Math.max(0, opt.proportions * 2 - 1);
  if (mus.minmuscle || wt.minweight || opt.height < 0.5) throw new Error('Bu betik yalnızca ortalama-üstü kas/kilo/boy hedeflerini indiriyor.');
  for (const m of ['averagemuscle', 'maxmuscle']) for (const w of ['averageweight', 'maxweight']) {
    const f = mus[m] * wt[w]; if (!f) continue;
    applyTarget(V, `macrodetails/universal-male-young-${m}-${w}.target`, f);
    applyTarget(V, `macrodetails/height/male-young-${m}-${w}-maxheight.target`, f * maxh);
    applyTarget(V, `macrodetails/proportions/male-young-${m}-${w}-idealproportions.target`, f * ideal);
  }
  for (const r of Object.keys(opt.race)) applyTarget(V, `macrodetails/${r}-male-young.target`, opt.race[r]);
  for (const [k, w] of Object.entries(opt.extra)) applyTarget(V, k + '.target', w);
  return obj;
}

// İskelet: eklem konumu = eklemi tarif eden köşelerin ortalaması (şekle göre).
function rig(V) {
  const sk = JSON.parse(fs.readFileSync(path.join(CACHE, 'rigs/default.mhskel'), 'utf8'));
  const J = {};
  for (const [name, idx] of Object.entries(sk.joints)) {
    const p = new THREE.Vector3();
    idx.forEach(i => p.add(new THREE.Vector3(V[i * 3], V[i * 3 + 1], V[i * 3 + 2])));
    J[name] = p.multiplyScalar(1 / idx.length);
  }
  const bones = {};
  for (const [name, b] of Object.entries(sk.bones)) bones[name] = { head: J[b.head].clone(), tail: J[b.tail].clone(), parent: b.parent };
  const W = JSON.parse(fs.readFileSync(path.join(CACHE, 'rigs/default_weights.mhw'), 'utf8')).weights;
  return { bones, W };
}
// pose: { kemik: Quaternion } — dinlenme çerçevesinde, kemiğin başı etrafında.
function skin(V, rg, pose) {
  const { bones, W } = rg, G = {};
  function glob(name) {
    if (G[name]) return G[name];
    const b = bones[name], P = b.parent ? glob(b.parent) : new THREE.Matrix4();
    let L = new THREE.Matrix4();
    if (pose[name]) {
      const h = b.head;
      L = new THREE.Matrix4().makeTranslation(h.x, h.y, h.z)
        .multiply(new THREE.Matrix4().makeRotationFromQuaternion(pose[name]))
        .multiply(new THREE.Matrix4().makeTranslation(-h.x, -h.y, -h.z));
    }
    return (G[name] = P.clone().multiply(L));
  }
  Object.keys(bones).forEach(glob);
  const n = V.length / 3, out = new Float64Array(V.length), acc = new Float64Array(n), t = new THREE.Vector3();
  for (const [bn, list] of Object.entries(W)) {
    for (const [i, w] of list) {
      t.set(V[i * 3], V[i * 3 + 1], V[i * 3 + 2]).applyMatrix4(G[bn]);
      out[i * 3] += w * t.x; out[i * 3 + 1] += w * t.y; out[i * 3 + 2] += w * t.z; acc[i] += w;
    }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = acc[i] > 0 ? out[i * 3 + k] / acc[i] : V[i * 3 + k];
  return { P: out, G };
}
function globalRot(bones, pose, name) {
  const b = bones[name], q = b.parent ? globalRot(bones, pose, b.parent) : new THREE.Quaternion();
  return pose[name] ? q.clone().multiply(pose[name]) : q.clone();
}
// Kemiği, dünyadaki `restDir` yönü `target`a gelecek kadar döndür (ebeveynleri hesaba katarak).
function aim(bones, pose, name, restDir, target) {
  const Rp = globalRot(bones, pose, bones[name].parent);
  const cur = restDir.clone().applyQuaternion(Rp).normalize();
  const Rb = new THREE.Quaternion().setFromUnitVectors(cur, target.clone().normalize()).multiply(Rp);
  pose[name] = Rp.clone().invert().multiply(Rb);
}
// Açılar derece: kolun yana açıklığı, öne eğimi, dirsek bükümü, ön kolun açıklığı,
// köprücük ve omuz inişi, bacağın içe toplanması.
const POSE = { abd: 9, fwd: 2, elbow: 12, foreAbd: 5, cla: 12, sh: 10, legIn: 2.6 };
function standPose(rg, o) {
  const { bones } = rg, pose = {}, D = Math.PI / 180, Z = new THREE.Vector3(0, 0, 1);
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    pose['clavicle.' + s] = new THREE.Quaternion().setFromAxisAngle(Z, -sx * o.cla * D);
    pose['shoulder01.' + s] = new THREE.Quaternion().setFromAxisAngle(Z, -sx * o.sh * D);
    const up = bones['upperarm02.' + s].tail.clone().sub(bones['upperarm01.' + s].head).normalize();
    aim(bones, pose, 'upperarm01.' + s, up, new THREE.Vector3(sx * Math.sin(o.abd * D), -Math.cos(o.abd * D), Math.sin(o.fwd * D)));
    const fore = bones['lowerarm02.' + s].tail.clone().sub(bones['lowerarm01.' + s].head).normalize();
    aim(bones, pose, 'lowerarm01.' + s, fore, new THREE.Vector3(sx * Math.sin(o.foreAbd * D), -Math.cos(o.elbow * D), Math.sin(o.elbow * D)));
    // Uyluk içe, ayak geri: taban yere düz kalsın.
    pose['upperleg01.' + s] = new THREE.Quaternion().setFromAxisAngle(Z, -sx * o.legIn * D);
    pose['foot.' + s] = new THREE.Quaternion().setFromAxisAngle(Z, sx * o.legIn * D);
  }
  return pose;
}

/* Hazır manken: köşeler (metre), gövde dörtgenleri, deri ağırlıkları ve eklemler
   (duruş verilmiş hâlleriyle, metre). */
function posed() {
  const obj = shape(SHAPE), rg = rig(obj.V), { P, G } = skin(obj.V, rg, standPose(rg, POSE));
  const body = obj.faces.filter(f => f.g === 'body');
  let miny = 1e9; body.forEach(f => f.v.forEach(i => { miny = Math.min(miny, P[i * 3 + 1]); }));
  const S = 0.1, out = new Float64Array(P.length);
  for (let i = 0; i < P.length; i += 3) { out[i] = P[i] * S; out[i + 1] = (P[i + 1] - miny) * S; out[i + 2] = P[i + 2] * S; }
  const J = {};
  for (const [n, b] of Object.entries(rg.bones)) {
    const gp = b.parent ? G[b.parent] : new THREE.Matrix4();
    const h = b.head.clone().applyMatrix4(gp), t = b.tail.clone().applyMatrix4(G[n]);
    J[n] = { head: [h.x * S, (h.y - miny) * S, h.z * S], tail: [t.x * S, (t.y - miny) * S, t.z * S] };
  }
  return { P: out, quads: body.map(f => f.v), W: rg.W, J };
}

module.exports = { posed, SHAPE, POSE };
