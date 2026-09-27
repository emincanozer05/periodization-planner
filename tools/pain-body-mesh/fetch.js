/* MakeHuman verilerini indir (bir kez).

   Mankenin kaynağı MakeHuman'ın taban insan ağı ve şekil hedefleri. MakeHuman
   bunları CC0 1.0 ile yayımladı (makehumancommunity/makehuman → LICENSE.md,
   "C. The license for the bundled assets"): serbestçe kullanılabilir, çıktıda
   hiçbir hak iddiası yok. Dosyalar depoya konmuyor; bu betik `.cache/` altına
   indiriyor ve her birinin SHA-256'sını denetliyor — MakeHuman bir dosyayı
   değiştirirse model sessizce başka bir şeye dönüşmesin, derleme dursun.

   Çalıştırma:  node fetch.js */
'use strict';
const fs = require('fs'), path = require('path'), https = require('https'), crypto = require('crypto');

const BASE = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/';
const CACHE = path.join(__dirname, '.cache');
const FILES = [
  ['3dobjs/base.obj', '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'],
  ['rigs/default.mhskel', '99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24'],
  ['rigs/default_weights.mhw', '0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625'],
  ['targets/macrodetails/universal-male-young-averagemuscle-averageweight.target', '4ba5396ddabda448ece15650a566fbebfbb10239256ccb201e8f883429e12249'],
  ['targets/macrodetails/universal-male-young-averagemuscle-maxweight.target', '3e77ff5a07a9b870db5226507e1cf8a295f0e09c109fb72142770f5f50427b5e'],
  ['targets/macrodetails/universal-male-young-maxmuscle-averageweight.target', 'c171ff9cc95e96273beb3e3b1969a01988c2d4982ebc6fe04bf81cf72ee3b295'],
  ['targets/macrodetails/universal-male-young-maxmuscle-maxweight.target', '95392741389537889a37dc67a7d8453c93b30f27131e3e622bee3f30d1d8738c'],
  ['targets/macrodetails/height/male-young-averagemuscle-averageweight-maxheight.target', '3baacc70187410ebba2b62c56a53775266ab859b7844d47e658d36ee78493621'],
  ['targets/macrodetails/height/male-young-averagemuscle-maxweight-maxheight.target', '3baacc70187410ebba2b62c56a53775266ab859b7844d47e658d36ee78493621'],
  ['targets/macrodetails/height/male-young-maxmuscle-averageweight-maxheight.target', '3baacc70187410ebba2b62c56a53775266ab859b7844d47e658d36ee78493621'],
  ['targets/macrodetails/height/male-young-maxmuscle-maxweight-maxheight.target', '3baacc70187410ebba2b62c56a53775266ab859b7844d47e658d36ee78493621'],
  ['targets/macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions.target', '7bbd790604c908417ff8ca11e566e3577508d92a4f397a2ace0f89f4cc3aa373'],
  ['targets/macrodetails/proportions/male-young-averagemuscle-maxweight-idealproportions.target', 'b1d386377040a51f9d2e1c173af028c3485a7c6091ca7e312a50dc28d1bd57f6'],
  ['targets/macrodetails/proportions/male-young-maxmuscle-averageweight-idealproportions.target', 'd9452857903d18a2100ca26105d5a61083e7064fbe16f035863446728755ec20'],
  ['targets/macrodetails/proportions/male-young-maxmuscle-maxweight-idealproportions.target', 'd9452857903d18a2100ca26105d5a61083e7064fbe16f035863446728755ec20'],
  ['targets/macrodetails/caucasian-male-young.target', '70e228ba7164737dae664454394536fc5935fa48d333c1a97d77e2dc6eacc5f5'],
  ['targets/macrodetails/african-male-young.target', '894abc1fbb3d28543a51fef16f89d5d4bdf9aa2e1534413339811a3d47818b7d'],
  ['targets/macrodetails/asian-male-young.target', 'ed2e8c191cb6b87b4a2d97c80486acb2604fa549316c7aa2a738a5d5a14334dc'],
  ['targets/torso/torso-vshape-incr.target', '9d0ac9eec39a14d51d7db50e48292b3db67aed9b91e654b379f4dbe348644684'],
  ['targets/torso/torso-muscle-pectoral-incr.target', '0299c687b73a5e217d00273da99acb8a983c8a83640177062fdc27d20bdce77b'],
  ['targets/torso/torso-muscle-dorsi-incr.target', 'a9eb27874c600716c4ac058caf922671c6556427f00373d0d31c7615d31ded56'],
  ['targets/stomach/stomach-pregnant-decr.target', 'c312c72444527d7db00e84a144d15ea7a9ebe43dfdd6673936ddac3c46a75e1b']
];

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(url + ' → HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchAll() {
  for (const [rel, want] of FILES) {
    const out = path.join(CACHE, rel);
    if (fs.existsSync(out) && sha(fs.readFileSync(out)) === want) continue;
    process.stdout.write('indiriliyor ' + rel + ' … ');
    const buf = await get(BASE + rel);
    const got = sha(buf);
    if (got !== want) throw new Error(rel + ': SHA-256 tutmuyor (' + got + '). MakeHuman dosyayı değiştirmiş olabilir.');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log('tamam');
  }
}

module.exports = { fetchAll, CACHE, FILES };
if (require.main === module) {
  fetchAll().then(() => console.log('MakeHuman verileri hazır: ' + CACHE), e => { console.error(e.message); process.exit(1); });
}
