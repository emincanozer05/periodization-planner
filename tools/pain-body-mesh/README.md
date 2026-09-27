# Ağrı haritası mankeni — `pain-body.bin` üreticisi

Wellness formundaki 3D ağrı haritasının mankeni deponun kökündeki
`pain-body.bin` dosyasında. Bu klasör o dosyayı üretiyor. Formun kendisi
(`pain-body.js`) yalnızca dosyayı açıyor; model ya da bölge sınırları
değişecekse burada değişiyor.

## Kaynak ve lisans

Manken [MakeHuman](http://www.makehumancommunity.org/)'ın taban insan ağından
(hm08) ve şekil hedeflerinden kuruluyor. MakeHuman bu varlıkları **CC0 1.0**
ile yayımladı (`makehumancommunity/makehuman` → `LICENSE.md`, bölüm C): herkes
dilediği gibi kullanabilir, çıktı üzerinde hak iddiası yok. Dosyalar depoya
konmuyor; `fetch.js` onları GitHub'dan `.cache/` altına indiriyor ve her birinin
SHA-256'sını denetliyor.

## Çalıştırma

```
cd tools/pain-body-mesh
npm install
npm run build        # = node fetch.js && node build.js
```

Çıktı: `../../pain-body.bin` (~280 KB). Derleme ~5 saniye.

Dosya değiştiyse `pain-body.js`'teki `MESH_VERSION`'ı bir artır — tarayıcılar
eski kopyayı kullanmasın.

## Neler oluyor

1. **Şekil** (`makehuman.js`): taban ağa MakeHuman'ın makro hedefleri kendi
   ağırlık formülüyle uygulanıyor — erkek, 25 yaş, en yüksek kas, ortanın biraz
   üstünde kilo ve boy, ideal oranlar — üstüne V gövde, göğüs ve sırt kası, düz
   karın. Boy ~1,81 m.
2. **Duruş**: taban ağ kolları 45° açık duruyor. MakeHuman iskeleti ve deri
   ağırlıklarıyla köprücük ve omuz biraz indiriliyor, kollar gövdenin yanına
   geliyor, dirsek hafif bükük; bacaklar biraz toplanıyor.
3. **Bölgeler** (`regions.js`): her köşe 72 bölgeden birine. Önce deri
   ağırlıklarından parça (kol, el, parmak, bacak, ayak, baş, boyun, gövde),
   sonra parçanın içinde geometri: gövdede yükseklik ve gövde eksenine göre açı,
   kolda omuzdan uzaklık, bacakta yükseklik ve bacak eksenine göre açı. Bölge
   adları `pain-body.js`'teki katalogla denetleniyor; katalogda olmayan bir ad ya
   da hiç köşesi olmayan bir bölge derlemeyi durduruyor.
4. **Ortam gölgesi (AO)** ve **maskeler** (`build.js`): koltuk altı, parmak
   araları, kas olukları için köşe başına pişirilmiş gölge; kısa saç, kaş,
   dudak, şort ve yüzün ortası için 0–1 maskeler. Doku dosyası yok —
   gölgelendirici deri rengini bunlarla değiştiriyor.

Sınırın basamaksız görünmesi, ağın pürüzsüzleştirilmesi (Loop alt bölümleme),
renkler ve etiketler tarayıcıda, `pain-body.js`'te.

## Dosya biçimi

Little-endian: `PBM1` · JSON boyu (u32) · JSON (bölge adları, sınır kutusu, göz
küreleri, birkaç eklem) · köşeler (u16×3, kutuya göre nicelenmiş) · dörtgenler
(u16×4) · köşenin bölgesi (u8, JSON'daki ad listesinde sıra) · köşe başına 6 kanal
(u8): AO, saç, kaş, dudak/meme ucu, şort, yüz.
