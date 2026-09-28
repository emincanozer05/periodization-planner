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

Çıktı: `../../pain-body.bin` (~200 KB). Derleme ~5 saniye.

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
3. **Yüzsüz baş** (`face.js`): yüzün ortası (göz çukurları, burun delikleri,
   ağzın içi dahil) ağdan çıkarılıyor; delik eşit aralıklı yeni bir üçgen
   yamayla kapatılıyor. Yamanın yüzeyi çevresindeki alından, şakaklardan,
   yanaklardan ve çeneden ince plaka eğrisiyle sürüyor — pürüzsüz, hafif kubbeli
   bir manken yüzü. Kulaklar ve kafanın biçimi yerinde.
4. **Bölgeler** (`regions.js`): her köşe 74 bölgeden birine. Önce deri
   ağırlıklarından parça (kol, el, parmak, bacak, ayak, baş, boyun, gövde),
   sonra parçanın içinde geometri: gövdede yükseklik ve gövde eksenine göre açı,
   kolda omuzdan uzaklık, bacakta yükseklik ve bacak eksenine göre açı. Boyun
   tabanı ve kasık çizgisi parça sınırından değil, düz geometrik kurallardan
   (boyun eksenine uzaklık; kalçada bir düzlem) geliyor. Bölge adları
   `pain-body.js`'teki katalogla denetleniyor; katalogda olmayan bir ad ya da
   hiç köşesi olmayan bir bölge derlemeyi durduruyor.
5. **Sınır noktaları** (`build.js`): iki ucu farklı bölgede olan her kenar için
   sınırın kenarı tam nerede kestiği, kuralın kendisiyle (kenar boyunca tarama +
   ikiye bölme) bulunup dosyaya yazılıyor. Tarayıcı üçgenleri tam bu noktalardan
   bölüyor: sınır çizgisi köşe ızgarasına takılmadan düz geçiyor.
6. **Ortam gölgesi (AO)** ve **şort maskesi** (`build.js`): koltuk altı, parmak
   araları, kas olukları için köşe başına pişirilmiş gölge; kumaşın olabileceği
   köşeler (gövde, bacak). Bel bandı ve paça ağzının kendisi gölgelendiricide,
   konumdan hesaplanıyor. Doku dosyası yok.

Ağın pürüzsüzleştirilmesi (Loop alt bölümleme; bölge sınırı kıvrım gibi
korunuyor), sınır çizgisi, renkler ve etiketler tarayıcıda, `pain-body.js`'te.

## Dosya biçimi

Little-endian: `PBM3` · JSON boyu (u32) · JSON (bölge adları, sınır kutusu,
sayılar, birkaç eklem) · köşeler (u16×3, kutuya göre nicelenmiş) · dörtgenler
(u16×4) · üçgenler (u16×3, yüz yaması) · sınır kenarları (u16×2, küçük uç önce) ·
köşegen bitleri (dörtgen başına 1) · köşenin bölgesi (u8, JSON'daki ad listesinde
sıra) · köşe başına 2 kanal (u8): AO, şort · sınır kenarının kesim noktası (u8,
küçük uçtan t × 255).
