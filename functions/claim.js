/* ═══════════════════════════════════════════════════════════════════════════
   SAHİPLENME — bir gönderimin yalnızca BİR kez bildirilmesi (Madde 13, Test 14)

   Firestore tetikleyicileri "en az bir kez" çalışır: platform aynı olayı ikinci
   kez getirebilir, ve getirdiğinde function'ın baştan çalıştığını bilmesinin
   hiçbir yolu yoktur. Karşılığı, gönderimin kendisine bir damga basmak.

   Damga GÖNDERİMDEN ÖNCE ve bir transaction içinde basılıyor. Sonra basmak iki
   çalışmanın aynı anda bildirim göndermesine kapı bırakırdı: ikisi de damgayı
   göremez, ikisi de gönderir, ekip aynı uyarıyı iki kez görür.

   Ayrı dosyada çünkü test edilmesi gereken tam olarak bu: sahte bir Firestore ile
   "aynı olay iki kez" senaryosu doğrudan çalıştırılabiliyor.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Dokümanı bu çalışma için sahiplen.

   Döner:
     true  → damga bu çalışma tarafından basıldı, bildirimi GÖNDER
     false → doküman yok (koç arada silmiş) ya da damga zaten duruyor, ÇIK

   `stamp` sunucu zaman damgası üreten fonksiyon; testte sabit bir değer veriliyor.
   Hata fırlatmıyor: transaction başarısız olursa false dönüyor, yani şüphede
   kalındığında GÖNDERİLMİYOR. Eksik bir uyarı, ikiye katlanmış bir uyarıdan
   iyidir — ikincisi ekibin bildirimlere olan güvenini bozuyor. */
async function claimForAlert(firestore, ref, stamp) {
  try {
    return await firestore.runTransaction(async tx => {
      const cur = await tx.get(ref);
      if (!cur.exists) return false;
      const d = cur.data() || {};
      if (d.alertClaimedAt || d.alertSent) return false;
      tx.update(ref, { alertClaimedAt: stamp() });
      return true;
    });
  } catch (e) {
    return false;
  }
}

module.exports = { claimForAlert };
