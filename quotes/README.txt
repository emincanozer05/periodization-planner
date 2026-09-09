Wellness gönderimi sonrası çıkan görseller
==========================================

Sporcu wellness formunu gönderince, skoru kaç olursa olsun bu klasördeki
sıradaki görsel ve altında ona ait özlü söz çıkıyor. Sıra telefonda tutuluyor:
her gönderimde bir sonrakine geçiyor, beşinciden sonra başa dönüyor.

Klasördeki dosyalar ve checkin.html içindeki MOTIVATION listesindeki karşılıkları:

  1.jpg    1080x608   Federer   "Çalışkanlığın önüne geçmenin bir yolu yok..."
  2.jpg    1280x720   Ali       "Şampiyonlar spor salonlarında yetişmez..."
  3.jpg     682x350   Bolt      "Hayaller bedava. Hedeflerin ise bir bedeli var..."
  4.webp    912x513   Durant    "Yetenekli kişi çok çalışmayı ihmal ettiğinde..."
  5.jpg    1320x743   Jordan    "Bazıları bunun olmasını ister..."

Dosyanın adı yalnızca sıra numarası. Uzantı olarak önce MOTIVATION'daki `ext`
deneniyor; tutmazsa .jpg, .png, .jpeg, .webp sırayla deneniyor. Yani uzantıyı
değiştirip `ext`'i güncellemeyi unutsan da görsel ekranda kalıyor. Hiçbiri
bulunamazsa görsel kutusu tamamen kalkıyor ve yalnızca söz çıkıyor — ekranda boş
çerçeve durmuyor.

Görsel eklerken / değiştirirken:

- GitHub'dan yüklerken: bu klasörü aç ("quotes" klasörünün içindeyken) →
  "Add file" → "Upload files" → dosyaları sürükle → "Commit changes".
  Deponun kök dizinindeyken yüklersen dosyalar quotes/ içine değil köke düşer
  ve görseller çıkmaz.
- Yeni bir dosyanın ölçüsü farklıysa MOTIVATION'daki w/h değerlerini de
  güncelle. Kutunun oranını bunlar veriyor: görsel inerken yer boş kalıyor,
  yüklenince altındaki yazı aşağı zıplamıyor.
- Sözü değiştirmek ya da sıraya yeni bir isim eklemek için MOTIVATION listesini
  güncelle. Liste kaç satırsa sıra o kadar uzuyor.
- Kutu telefonda en fazla 340px genişliğinde çıkıyor; 1000px civarı bir
  genişlik fazlasıyla yetiyor, daha büyüğü sporcunun internetini boşuna yiyor.
