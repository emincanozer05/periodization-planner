/* ═══════════════════════════════════════════════════════════════════════════
   CHECK-IN FORMLARI — uygulamanın kendi anketleri (Tally'siz yol)

   Koç iki linki kopyalar ve sporculara yollar:
     rpe.html#k=<token>       → antrenman sonrası içsel yük (sRPE)
     wellness.html#k=<token>  → sabah wellness

   İkisi de checkin.html'i açan birer kapak sayfası; ayrı dosya olmalarının sebebi
   WhatsApp/Telegram önizlemesinin form başına farklı bir başlık göstermesi.

   Token TAKIM başınadır ve `checkin_links/<token>` dokümanına bakar; o doküman
   takımın adını, logosunu ve kadroyu taşır, sporcu listeden kendi adını seçer. Seçilen ad bir
   sporcu KİMLİĞİ taşıdığı için Tally'deki "eşleşmeyen isim atlandı" derdi burada yok.

   Sporcunun gönderimi `checkins` koleksiyonuna düşer; aşağıdaki CheckinInbox bunu
   dinler, sporcunun günlüğüne işler ve — durum buluta yazıldıktan SONRA — dokümanı
   siler. Sıra bu yüzden önemli: silmeyi yazımdan önce yapmak, tarayıcı o arada
   kapandığında check-in'i hiçbir yerde bırakmaz.
   ═══════════════════════════════════════════════════════════════════════════ */

const CHECKIN_LINKS='checkin_links', CHECKIN_COL='checkins';
/* İşlenen gönderim hemen silinmez. Birleştirme aynı sonucu veren (idempotent) bir iş
   olduğu için ikinci kez işlenmesi zararsız; buna karşılık gönderimi yazımdan önce
   silmek, tarayıcı o arada kapandığında check-in'i hiçbir yerde bırakmaz. Bu yüzden
   doküman birkaç dakika daha durur ve ancak durum buluta yazıldıktan sonra süpürülür.
   Aynı pencere koçun ikinci cihazının da aynı gönderimi görmesine izin verir. */
const CHECKIN_KEEP_MS=10*60*1000;
/* Sunucunun İŞLEMEDİĞİ gönderim (telefon sayfasına ve uyarıya çevrilmemiş) silinmez:
   eskiden 10 dakikayı geçen her doküman süpürülüyordu ve sunucunun tetikleyicisi bir
   deploy sonrası olay almayı bıraktığında o sabahın formları koçun uygulaması açılır
   açılmaz ekip sayfasına hiç ulaşamadan siliniyordu. İşlenmemiş doküman ancak bu kadar
   eskiyse gider (sunucu da bundan eskisine bakmıyor). */
const CHECKIN_UNPROCESSED_KEEP_MS=3*24*60*60*1000;
function checkinProcessed(d){
  if(!d)return true;
  if(d.kind==='wellness')return !!(d.alertSent||d.alertClaimedAt);
  if(d.kind==='srpe')return !!d.rpeRecordedAt;
  return true;
}
/* Tetikleyicinin kaçırdığı gönderimleri sunucuya düz HTTPS ile işlet (functions/index.js →
   processCheckins). Kapsamı sunucu çıkarıyor: koçun oturumu yalnızca kendi hesabını süpürür. */
const CHECKIN_FN_URL='https://us-central1-periodization-planner.cloudfunctions.net/processCheckins';
let CHECKIN_SWEEP_AT=0;
async function sweepCheckinsOnServer(){
  if(Date.now()-CHECKIN_SWEEP_AT<2*60*1000)return;
  CHECKIN_SWEEP_AT=Date.now();
  const fb=FB();
  const u=fb&&fb.auth&&fb.auth().currentUser;
  if(!u)return;
  try{
    const tok=await u.getIdToken();
    await fetch(CHECKIN_FN_URL,{method:'POST',
      headers:{'content-type':'application/json',authorization:'Bearer '+tok},
      body:JSON.stringify({data:{}})});
  }catch(e){console.warn('processCheckins',e);}
}

// Tahmin edilemez adres: 128 bit rastgele, URL'de sorunsuz taşınan alfabeyle.
function newCheckinToken(){
  const abc='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out='';
  try{
    const buf=new Uint8Array(22);crypto.getRandomValues(buf);
    for(const b of buf)out+=abc[b%abc.length];
  }catch(e){
    for(let i=0;i<22;i++)out+=abc[Math.floor(Math.random()*abc.length)];
  }
  return out;
}
/* Sporcunun açacağı adres. Uygulama hangi klasörde duruyorsa form dosyaları onun
   yanında. Adres doğrudan checkin.html'e değil, form başına bir "kapak" sayfasına
   bakıyor (rpe.html / wellness.html): WhatsApp önizlemesi sayfanın <title>/og:*
   etiketlerini okuyor, adresin # kısmını ise hiç görmüyor — yani hangi formun linki
   olduğu ancak dosya ayrıysa önizlemede yazıyor. Kapak sayfası açılır açılmaz
   checkin.html'e geçiyor ve token'ı # kısmında taşımaya devam ediyor. */
function checkinUrl(token,kind){
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  const page=kind==='wellness'?'wellness.html':'rpe.html';
  return `${base}${page}#k=${encodeURIComponent(token)}`;
}
/* Linkin arkasındaki kaydın kadroyla aynı olup olmadığını söyleyen damga. Kadro
   değişince (sporcu eklendi/çıktı/adı düzeltildi) doküman yeniden yayımlanır —
   yoksa formdaki isim listesi eskide kalır. */
function checkinRev(team){
  /* Logo da damganın parçası: koç logoyu değiştirdiğinde (ya da ilk kez yüklediğinde)
     link kaydı kendiliğinden yeniden yayımlansın. Damgaya logonun TAMAMI değil boyu ve
     sonu giriyor — bu işlev her çizimde çalışıyor, kilobaytlarca base64'ü her seferinde
     baştan sona taramak gereksiz. */
  const logo=(team.setup&&team.setup.logo)||'';
  const parts=[(team.setup&&team.setup.teamName)||'',
               logo?('logo:'+logo.length+':'+logo.slice(-24)):''];
  (team.athletes||[]).forEach(a=>parts.push(a.id+':'+(a.name||'').trim()));
  const s=parts.join('|');
  let h=5381;
  for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;
  return h.toString(36)+'.'+(team.athletes||[]).length;
}
/* Takım logosunun forma girecek hali. Formu açan sporcu koçun hesabıyla giriş yapmış
   değil ve koçun cihazındaki tutamakları çözemez, o yüzden logo linkin arkasındaki kayda
   sporcunun tarayıcısının doğrudan açabileceği bir biçimde yazılıyor:
     • bulutta duran logo (Storage/Drive adresi) → adresin kendisi geçer, kopyalanmaz;
     • cihazdaki logo ya da gömülü base64 → 160 pikselde küçültülmüş bir PNG data URL.
   Küçültme, koçun yüklediği tam boy görselin (birkaç yüz KB olabilir) Firestore'un 1 MB'lık
   doküman sınırını kadroyla birlikte zorlamasını engelliyor. 160, formdaki 50 piksellik
   kutunun telefonlardaki 3x ekranda da bulanıklaşmadan dolduracağı ölçü. */
const CHECKIN_LOGO_PX=160;
function shrinkLogo(src){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      try{
        let w=img.width,h=img.height;
        if(!w||!h){res('');return;}
        if(w>h&&w>CHECKIN_LOGO_PX){h=Math.round(h*CHECKIN_LOGO_PX/w);w=CHECKIN_LOGO_PX;}
        else if(h>=w&&h>CHECKIN_LOGO_PX){w=Math.round(w*CHECKIN_LOGO_PX/h);h=CHECKIN_LOGO_PX;}
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const ctx=c.getContext('2d');
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,0,0,w,h);
        // PNG: kulüp logoları saydam zeminli geliyor, JPEG onları siyah bir kutuya çevirirdi.
        res(c.toDataURL('image/png'));
      }catch(e){res('');}   // başka kökenden gelen görsel tuvali kirletir; toDataURL atar
    };
    img.onerror=()=>res('');
    img.src=src;
  });
}
async function checkinLogoSrc(team){
  const raw=(team&&team.setup&&team.setup.logo)||'';
  if(!raw)return '';
  const src=mediaSrc(raw);
  if(!src||src===LM_BLANK)return '';           // tutamak başka cihazda: logo yok say
  if(/^https?:/i.test(src))return src;         // zaten açık bir adres, olduğu gibi geçsin
  return await shrinkLogo(src);
}
async function publishCheckinLink(uid,team,token){
  const fb=FB();
  if(!fb)throw new Error('Bulut bağlantısı yok.');
  if(!uid)throw new Error('Önce giriş yapmalısın — link koç hesabına bağlanıyor.');
  // Logo süs: çözülemezse link logosuz yayımlanır, yayım bu yüzden hiç durmaz.
  let logo='';
  try{logo=await checkinLogoSrc(team);}catch(e){logo='';}
  await fb.firestore().collection(CHECKIN_LINKS).doc(token).set({
    coachUid:uid,teamId:team.id,
    teamName:(team.setup&&team.setup.teamName)||'',
    teamLogo:logo,
    athletes:(team.athletes||[]).map(a=>({id:a.id,name:(a.name||'').trim()})).filter(a=>a.name),
    rev:checkinRev(team),updatedAt:new Date().toISOString(),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS UYARILARI — istemci tarafı

   Uyarının kendisini sunucu üretiyor (functions/index.js). Burada üç iş var:

     1) KADRO YAYINI — sunucu "bu sporcunun uyarısı kime gider" sorusunu tek bir
        dokümandan cevaplıyor. O dokümanı burası yazıyor, çünkü kadro koçun kendi
        verisinin içinde (parçalı, içerik adresli bir JSON blob) duruyor ve
        sunucunun onu çözmesi hem pahalı hem kırılgan olurdu.

     2) EKİP ÜYESİ LİNKLERİ — CoachOS'ta ekip üyelerinin hesabı yok; kadroda birer
        kayıtlar. Telefonlarını uyarılara bağlamanın yolu, check-in formlarında
        zaten kullanılan desen: kişiye özel, tahmin edilemez bir adres.

     3) KOÇUN KENDİ CİHAZI — bildirim izni ve token kaydı.

   Hiçbirinde kulüp/takım/kişi kimliği koda gömülü değil (Madde 7).
   ═══════════════════════════════════════════════════════════════════════════ */

const STAFF_LINKS='staff_links', ALERT_ROSTER='alert_roster',
      PUSH_TOKENS='push_tokens', ALERTS_COL='wellness_alerts';

/* Sunucudaki rosterDocId() ile AYNI adı üretmek zorunda (functions/ids.js). İkisi
   de alfanümerik kimliklerle çalışıyor — uid() base36 üretiyor, Firebase uid'leri
   de alfanümerik — o yüzden burada ayrıca temizlemeye gerek kalmıyor. */
const alertRosterId=(uid_,teamId)=>`${uid_}__${teamId}`;

/* Yayımlanan kadronun kadroyla aynı olup olmadığını söyleyen damga — checkin
   linklerindeki checkinRev() ile aynı fikir. Damga değişmediyse hiç yazılmıyor:
   koç plan üzerinde çalışırken her tuşa basışta bir doküman yazmanın anlamı yok. */
function alertRosterRev(team){
  const parts=[(team.setup&&team.setup.teamName)||''];
  (team.staff||[]).forEach(m=>parts.push(
    [m.id,m.role,(m.name||'').trim(),(m.athleteIds||[]).slice().sort().join('+')].join(':')));
  // Sporcu listesi de damganın parçası: ekip üyesinin sayfasındaki "kim doldurdu,
  // kim doldurmadı" şeridi bu listeye bakıyor; kadroya eklenen sporcu orada görünsün.
  (team.athletes||[]).forEach(a=>parts.push('a:'+a.id+':'+(a.name||'').trim()));
  const s=parts.join('|');
  let h=5381;
  for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;
  return h.toString(36)+'.'+(team.staff||[]).length+'.'+(team.athletes||[]).length;
}

/* Sunucunun okuyacağı kadro özeti. Yalnızca uyarı yönlendirmesi için gereken
   alanlar gidiyor: telefon, fotoğraf ve kalan her şey koçun kendi verisinde
   kalıyor — bir dokümanın taşımaya ihtiyacı olmayan veriyi taşıması, onu
   sızdırabileceği tek yerdir. */
async function publishAlertRoster(uid_,team){
  const fb=FB();
  if(!fb||!uid_||!team)return;
  await fb.firestore().collection(ALERT_ROSTER).doc(alertRosterId(uid_,team.id)).set({
    coachUid:uid_,teamId:team.id,
    teamName:(team.setup&&team.setup.teamName)||'',
    /* Bildirime tıklanınca açılacak adres. Uygulamanın nerede yayınlandığını
       yalnızca tarayıcı biliyor; sunucuda sabit bir alan adı durmasın diye
       buradan gidiyor (Madde 7). */
    appUrl:location.origin+location.pathname,
    /* Firestore `undefined` taşıyan bir dokümanı BÜTÜNÜYLE reddediyor: kimliği
       olmayan tek bir satır (eski bir yedekten gelen sporcu, rolü boş ekip üyesi)
       kadronun hiç yayımlanmamasına — ve telefon sayfasındaki "kim doldurdu"
       şeridinin kaybolmasına — yetiyordu. Kimliksiz satır atlanıyor, kalan alanlar
       her zaman tanımlı. */
    staff:(team.staff||[]).filter(m=>m&&m.id).map(m=>({
      id:String(m.id),role:m.role||'',name:(m.name||'').trim(),
      // Sporcu ataması yalnızca bireysel antrenör için anlamlı; diğer dört rol
      // takımın tamamını kapsıyor ve listeyi taşımalarının bir anlamı yok.
      athleteIds:m.role===INDIVIDUAL_ROLE?(m.athleteIds||[]).filter(Boolean).map(String):[],
    })),
    /* Sporcuların yalnızca kimliği ve adı — ekip üyesinin sayfası bugünkü kayıtları
       bununla karşılaştırıp formu henüz doldurmayanları gösteriyor. Aynı adlar zaten
       uyarı kayıtlarında ve check-in linkinde duruyor; yeni bir bilgi açılmıyor. */
    athletes:(team.athletes||[]).filter(a=>a&&a.id)
      .map(a=>({id:String(a.id),name:(a.name||'').trim()})).filter(a=>a.name),
    rev:alertRosterRev(team),updatedAt:new Date().toISOString(),
  });
}

/* Ekip üyesinin açacağı adres — check-in linkleriyle aynı biçim, aynı güven
   modeli: adresi bilen kişi o kaydın sahibidir. Token yine # kısmında, yani ne
   sunucu loglarına düşüyor ne link önizlemesi çeken uygulamalara gidiyor. */
function staffAlertUrl(token){
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  return `${base}alerts.html#k=${encodeURIComponent(token)}`;
}
async function publishStaffLink(uid_,team,member,token){
  const fb=FB();
  if(!fb)throw new Error('Bulut bağlantısı yok.');
  if(!uid_)throw new Error('Önce giriş yapmalısın — link koç hesabına bağlanıyor.');
  const role=STAFF_ROLE_BY[member.role]||STAFF_ROLES[0];
  await fb.firestore().collection(STAFF_LINKS).doc(token).set({
    coachUid:uid_,teamId:team.id,staffId:member.id,role:member.role,
    staffName:(member.name||'').trim(),
    roleLabel:L(role.tr,role.en),
    teamName:(team.setup&&team.setup.teamName)||'',
    updatedAt:new Date().toISOString(),
  });
}
/* Linki geçersiz kılmak: kayıt siliniyor, o adresi açan telefon bir daha hiçbir
   şey göremiyor. Kayıtlı cihazı da düşürmek gerekiyor ama onu istemci okuyamıyor
   (push_tokens okumaya kapalı) — kadrodan çıkarılan kişinin cihazı zaten kapsam
   dışı kaldığı için uyarı almıyor, sunucu da ilk hatada kaydı temizliyor. */
async function revokeStaffLink(token){
  const fb=FB();
  if(!fb||!token)return;
  await fb.firestore().collection(STAFF_LINKS).doc(token).delete();
}

/* ── Bildirim izni ve cihaz kaydı ──────────────────────────────────────────── */
const PUSH_CFG=()=>(typeof COACHOS_FCM!=='undefined')?COACHOS_FCM:null;
const IS_IOS=(()=>{const ua=navigator.userAgent||'';
  return /iPad|iPhone|iPod/.test(ua)||(/Mac/.test(ua)&&navigator.maxTouchPoints>1);})();
const IS_STANDALONE=(()=>{try{
  return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
}catch(e){return false;}})();

/* Bu tarayıcıda bildirim mümkün mü — ve değilse NEDEN. Sebep önemli: "desteklenmiyor"
   ile "iPhone'da ana ekrana eklenmemiş" bambaşka iki durum ve ikincisinin çözümü var. */
function pushState(){
  if(!PUSH_CFG())return 'noconfig';
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!window.isSecureContext)return 'unsupported';
  // Apple, web push'u yalnızca ana ekrana eklenmiş sayfalarda çalıştırıyor.
  if(IS_IOS&&!IS_STANDALONE)return 'ios-needs-install';
  if(!PUSH_CFG().vapidKey)return 'nokey';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission==='granted')return 'granted';
  return 'ask';
}

/* ETKİN bir service worker döndürür.

   `register()` kaydı BAŞLATIR başlatmaz dönüyor — worker o anda hâlâ 'installing'
   olabiliyor. Push aboneliği ise etkin bir worker istiyor ve etkin olmayanla
   çağrıldığında tarayıcı şunu diyor:

     Failed to execute 'subscribe' on 'PushManager':
     Subscription failed - no active Service Worker

   Yani kayıt başarılı görünürken bildirim açılamıyor. Karşılığı, worker gerçekten
   etkinleşene kadar beklemek.

   'redundant' durumu ayrı bir şey: worker betiği hiç yüklenememiş ya da çalışırken
   patlamış demek (sahada en sık sebebi, yanındaki push-config.js'in yayına
   çıkmamış olması). Onu sessiz bir zaman aşımına bırakmak yerine adıyla söylüyoruz. */
const SW_FILE='firebase-messaging-sw.js';
async function readyServiceWorker(){
  /* Worker'ın adresi sayfaya GÖRE kuruluyor, kökten değil: uygulama bir alt
     dizinde de yayınlanabiliyor (check-in linkleri de aynı şekilde türüyor) ve
     kökten verilen bir adres orada 404 dönerdi. */
  const swPath=location.pathname.replace(/[^/]*$/,'')+SW_FILE;
  const reg=await navigator.serviceWorker.register(swPath);
  if(reg.active)return reg;
  const w=reg.installing||reg.waiting;
  if(w){
    await new Promise((res,rej)=>{
      const timer=setTimeout(()=>{cleanup();rej(new Error(L('Bildirim servisi zamanında başlamadı — sayfayı yenileyip tekrar dene.','The notification service did not start in time — reload and try again.')));},20000);
      const cleanup=()=>{clearTimeout(timer);w.removeEventListener('statechange',onChange);};
      function onChange(){
        if(w.state==='activated'){cleanup();res();}
        else if(w.state==='redundant'){cleanup();rej(new Error(L(`Bildirim servisi yüklenemedi. ${SW_FILE} ve push-config.js sitenin kök dizininde yayında olmalı.`,`The notification service failed to load. ${SW_FILE} and push-config.js must be published at the site root.`)));}
      }
      w.addEventListener('statechange',onChange);
      onChange();                                   // durum zaten değişmiş olabilir
    });
  }
  // Etkinleşme bitti ama kayıt nesnesi tazelenmemiş olabilir; kontrolü devralanı al.
  return (await navigator.serviceWorker.ready)||reg;
}

/* Koçun bu cihazını uyarılara bağla. Token'ın KENDİSİ doküman adı: aynı cihaz
   ikinci kez kaydolursa yeni satır açmıyor, aynı satırı tazeliyor. */
async function registerCoachPush(){
  const fb=FB(),cfg=PUSH_CFG();
  if(!fb||!cfg||!cfg.vapidKey)throw new Error('Bildirim kurulumu tamamlanmamış.');
  const user=fb.auth().currentUser;
  if(!user)throw new Error('Önce hesabınla giriş yap.');
  const reg=await readyServiceWorker();
  const token=await firebase.messaging().getToken({vapidKey:cfg.vapidKey,serviceWorkerRegistration:reg});
  if(!token)throw new Error('Cihaz kimliği alınamadı.');
  await fb.firestore().collection(PUSH_TOKENS).doc(token).set({
    uid:user.uid,kind:'coach',coachUid:user.uid,
    /* teamId YOK — ve bu kasıtlı: hesabın sahibi baktığı TÜM takımların uyarısını
       alıyor. Takım başına bir cihaz kaydı, iki takıma bakan koçun ikinci takımını
       sessizce görünmez yapardı. */
    name:(user.email||'').trim(),role:'coach',
    lang:REPORT_LANG==='tr'?'tr':'en',
    platform:IS_IOS?(IS_STANDALONE?'ios-pwa':'ios-safari'):(/Android/.test(navigator.userAgent||'')?'android':'desktop'),
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),
  },{merge:true});
  return token;
}

/* Kaydı taze tut — ama gereğinden sık yazmadan.

   Bu iki yerden çağrılıyor (uygulama açılışı ve Uyarılar ekranı) ve ikisi aynı
   oturumda üst üste gelebiliyor; aynı cihazın kaydını dakika içinde ikinci kez
   yazmanın hiçbir faydası yok. `force`, koç düğmeye bastığında geçiliyor: orada
   beklenen şey "şimdi kaydol" ve bir zaman aşımına takılmamalı. */
let PUSH_LAST_REG=0;
const PUSH_REG_MIN_GAP=6*60*60*1000;
async function refreshCoachPush(force){
  if(!force&&PUSH_LAST_REG&&Date.now()-PUSH_LAST_REG<PUSH_REG_MIN_GAP)return null;
  const token=await registerCoachPush();
  PUSH_LAST_REG=Date.now();
  return token;
}

/* Bir gönderim → sporcunun günlüğündeki kayıt. srcId sporcu+tarih+tür'den türetilir:
   aynı gün ikinci kez dolduran sporcunun cevabı ESKİSİNİN ÜZERİNE yazılır, yeni bir
   satır açmaz — ve aynı doküman ikinci kez işlense de sonuç değişmez. */
function checkinSrcId(kind,athleteId,date){
  return `ci-${kind==='wellness'?'w':'srpe'}-${athleteId}-${date}`;
}
/* Bir gönderimin ZAMANI. Sunucu damgası henüz inmemiş bir doküman (yeni yazılmış,
   `at` boş) EN YENİ sayılıyor: damgasız tek sebep, dokümanın az önce yazılmış
   olması. Süpürme de aynı varsayımla çalışıyor — damgasız dokümanı silmiyor. */
function checkinAt(d){
  const t=d&&d.at&&d.at.toDate?d.at.toDate().getTime():(d&&d.atIso?Date.parse(d.atIso):NaN);
  return isNaN(t)?Infinity:t;
}
/* Gelen gönderim, günlükte duran kaydın üstüne yazılmalı mı?
   Kural: AYNI GÜNÜN EN SON gönderimi geçerli olan. Sporcu sabah yanlış bir şey
   girip öğleden sonra düzeltebiliyor ve düzeltmesi kazanmak zorunda.

   Bunun kontrol edilmesi gerekiyor çünkü gönderimler sıraya girmiş gelmiyor:
   gelen kutusu sorgusu sırasız ve Firestore sırasız sorguyu DOKÜMAN ADINA göre
   döndürüyor; adlar da add() ile rastgele. Koç uygulamayı akşam açtığında o günün
   üç gönderimi tek anlık görüntüde ve rastgele sırada geliyordu — hangisinin
   ekranda kaldığı şansa bağlıydı. Zaman karşılaştırması sırayı önemsiz kılıyor.

   Zamanı bilinmeyen bir taraf varsa gelen kazanıyor: bugünkü davranış bu ve
   bilinmeyen bir zamanla eski kaydı korumak, düzeltmeyi sessizce yutabilirdi. */
function checkinWins(incomingAt,prev){
  const a=Date.parse(incomingAt||'');
  const b=Date.parse((prev&&prev.submittedAt)||'');
  if(isNaN(a)||isNaN(b))return true;
  return a>=b;
}
function mergeCheckins(team,docs){
  if(!docs.length)return null;
  // Eskiden yeniye: zamanı bilinmeyen (damgasız, yani yeni yazılmış) en sonda.
  docs=docs.slice().sort((a,b)=>checkinAt(a)-checkinAt(b));
  const byId=new Map((team.athletes||[]).map((a,i)=>[a.id,i]));
  const byName=new Map((team.athletes||[]).map((a,i)=>[NORM(a.name),i]));
  let athletes=null,touched=0,unknown=0;
  const clone=i=>{
    if(!athletes)athletes=(team.athletes||[]).map(a=>({...a}));
    const a=athletes[i];
    if(!a._ciCloned){athletes[i]={...a,srpeLog:[...(a.srpeLog||[])],wellness:[...(a.wellness||[])],_ciCloned:1};}
    return athletes[i];
  };
  /* Gönderimler açık bir uçtan geliyor: link'i bilen herkes yazabilir. Kurallar
     dokümanın şeklini kontrol eder ama içindeki sayıların makul olduğunu kontrol edemez,
     bu yüzden sınırlar burada uygulanır — koçun grafiklerine 10.000'lik bir RPE ya da
     kilometrelerce uzunlukta bir bölge adı girmesin. */
  const clamp=(v,lo,hi)=>{
    if(v==null||v===''||isNaN(Number(v)))return null;
    const n=Number(v);
    return n<lo?lo:(n>hi?hi:n);
  };
  for(const d of docs){
    if(d.teamId!==team.id)continue;
    /* Kimlik önce: sporcu formda kendi adını seçtiği için kimlik zaten elimizde.
       Ad, yalnızca kadro kimliği değiştiyse (dışa/içe aktarma) devreye giren yedek yol. */
    let i=byId.has(d.athleteId)?byId.get(d.athleteId):(byName.has(NORM(d.athleteName))?byName.get(NORM(d.athleteName)):-1);
    if(i<0){unknown++;continue;}
    const p=d.payload||{},date=d.date;
    const at=d.at&&d.at.toDate?d.at.toDate().toISOString():(d.atIso||null);
    if(d.kind==='srpe'){
      const nid=checkinSrcId('srpe',d.athleteId,date);
      const ath=clone(i);
      // Koç bu check-in'i silmişse geri getirme — mezar taşı Tally yolundakiyle aynı.
      if((ath.deletedSrpeSrcIds||[]).includes(nid))continue;
      const tpRPE=clamp(p.tpRPE,0,10),tpDur=clamp(p.tpDuration,0,400);
      const scRPE=clamp(p.scRPE,0,10),scDur=clamp(p.scDuration,0,400);
      const gmRPE=clamp(p.gameRPE,0,10),gmDur=clamp(p.gameDuration,0,400);
      const tpLoad=tpRPE&&tpDur?tpRPE*tpDur:null;
      const scLoad=scRPE&&scDur?scRPE*scDur:null;
      const gmLoad=gmRPE&&gmDur?gmRPE*gmDur:null;
      const total=((tpLoad||0)+(scLoad||0)+(gmLoad||0))||null;
      const entry={id:uid(),srcId:nid,date,submittedAt:at,
        tpRPE,tpDuration:tpDur,tpLoad:tpLoad?Math.round(tpLoad):null,
        scRPE,scDuration:scDur,scLoad:scLoad?Math.round(scLoad):null,
        gameRPE:gmRPE,gameDuration:gmDur,gameLoad:gmLoad?Math.round(gmLoad):null,
        totalLoad:total?Math.round(total):null};
      const k=ath.srpeLog.findIndex(e=>(e.srcId||e.notionId)===nid);
      if(k>=0){
        // Aynı günün daha ESKİ bir gönderimi, duran kaydın üstüne yazmıyor.
        if(!checkinWins(at,ath.srpeLog[k]))continue;
        entry.id=ath.srpeLog[k].id;ath.srpeLog[k]=entry;
      }else ath.srpeLog.push(entry);
      touched++;
    }else if(d.kind==='wellness'){
      const nid=checkinSrcId('wellness',d.athleteId,date);
      const ath=clone(i);
      const sleep=clamp(p.sleep,1,5),sor=clamp(p.soreness,1,5),rhr=clamp(p.RHR,20,250);
      const mental=clamp(p.mentalFatigue,1,5),physical=clamp(p.physicalFatigue,1,5);
      /* Yorgunluk formda iki soru. `fatigue` ikisinin ortalaması olarak kayda yine
         yazılıyor: bireyselleştirme, AI dışa aktarımı ve eski grafikler o alanı
         okuyor. Eski formdan (tek yorgunluk sorusu) gelen gönderimde doğrudan o. */
      const fat=wellFatigue({mentalFatigue:mental,physicalFatigue:physical,fatigue:clamp(p.fatigue,1,5)});
      // Bölge → şiddet. Sporcu şiddeti kendi işaretlediği için tahmine gerek yok.
      let painMap=null;
      const pm=(p.painMap&&typeof p.painMap==='object')?p.painMap:{};
      Object.keys(pm).slice(0,40).forEach(raw=>{
        const rg=String(raw||'').trim().slice(0,40);
        const sev=clamp(pm[raw],1,3);
        if(!rg||!sev)return;
        (painMap||(painMap={}))[rg]=Math.round(sev);
      });
      const entry={id:uid(),srcId:nid,date,submittedAt:at,
        RHR:rhr,sleep,mentalFatigue:mental,physicalFatigue:physical,fatigue:fat,soreness:sor,
        areaOfPain:'',painMap,pain:painTagsFromMap(painMap),readiness:null};
      entry.readiness=wellReadiness(entry);
      const k=ath.wellness.findIndex(w=>(w.srcId||w.notionId)===nid);
      if(k>=0){
        /* AYNI GÜNÜN SON GÖNDERİMİ geçerli: daha eski bir gönderim (rastgele sırada
           gelmiş olabilir) sporcunun sonradan yaptığı düzeltmeyi geri almıyor. */
        if(!checkinWins(at,ath.wellness[k]))continue;
        /* Koçun elle düzelttiği alanlar yeniden gönderimde de korunur — Tally yolundaki
           kuralın aynısı, yoksa koçun düzeltmesi sessizce geri alınırdı. */
        const prev=ath.wellness[k],kept=prev.manualEdits||[];
        if(kept.length){
          kept.forEach(f=>{entry[f]=prev[f];});
          entry.manualEdits=kept;
          if(!kept.includes('fatigue'))entry.fatigue=wellFatigue(entry);
          if(!kept.includes('readiness'))entry.readiness=wellReadiness(entry);
        }
        entry.id=prev.id;ath.wellness[k]=entry;
      }else ath.wellness.push(entry);
      touched++;
    }
  }
  if(!athletes)return null;
  athletes=athletes.map(a=>{const{_ciCloned,...rest}=a;return rest;});
  return{athletes,touched,unknown};
}

/* Gelen kutusu. Hiçbir şey çizmez; koç uygulamayı açtığı sürece sporcuların
   gönderimlerini dinler ve günlüğe işler. */
function CheckinInbox({sync,setData}){
  const user=sync&&sync.user,status=sync&&sync.status;
  // Buluttan ilk yükleme bitmeden yazmaya kalkmak, boş bir duruma check-in yazıp onu
  // geri göndermek demek olurdu. Bir kez "synced" görene kadar beklenir.
  const[ready,setReady]=useState(false);
  useEffect(()=>{if(status==='synced')setReady(true);},[status]);
  useEffect(()=>{if(!user)setReady(false);},[user]);
  // Süpürme, durum yeşilken (= ekrandaki hâl buluta yazılmışken) yapılır.
  const statusRef=useRef(status);statusRef.current=status;
  const seen=useRef([]);              // son anlık görüntüdeki dokümanlar
  useEffect(()=>{
    const fb=FB();
    if(!fb||!user||!ready)return;
    let alive=true;
    const col=fb.firestore().collection(CHECKIN_COL);
    /* Yaşı geçmiş ve işlenmiş gönderimleri temizle. Sunucu damgası henüz gelmemiş
       (yeni yazılmış) doküman bekletilir — yaşını bilmeden silmek, işlenmeden silmek
       riskini taşır. */
    const sweep=()=>{
      if(statusRef.current!=='synced')return;
      const now=Date.now();
      seen.current.filter(d=>{
        const t=d.at&&d.at.toDate?d.at.toDate().getTime():null;
        return t!=null&&now-t>(checkinProcessed(d)?CHECKIN_KEEP_MS:CHECKIN_UNPROCESSED_KEEP_MS);
      }).forEach(d=>col.doc(d._docId).delete().catch(()=>{}));
      // Bir dakikadan uzun süredir işlenmemiş gönderim varsa tetikleyici kaçırmış demektir.
      if(seen.current.some(d=>{
        const t=d.at&&d.at.toDate?d.at.toDate().getTime():null;
        return !checkinProcessed(d)&&t!=null&&now-t>60*1000;
      }))sweepCheckinsOnServer();
    };
    const unsub=col.where('coachUid','==',user.uid).onSnapshot(snap=>{
      if(!alive)return;
      const docs=[];
      snap.forEach(d=>{const v=d.data();if(v)docs.push({...v,_docId:d.id});});
      seen.current=docs;
      if(docs.length)setData(prev=>{
        let changed=false;
        const teams=(prev.teams||[]).map(t=>{
          const mine=docs.filter(d=>d.teamId===t.id);
          if(!mine.length)return t;
          const res=mergeCheckins(t,mine);
          if(!res||!res.touched)return t;
          changed=true;
          return{...t,athletes:res.athletes};
        });
        return changed?{...prev,teams}:prev;
      });
      sweep();
    },e=>console.warn('checkin inbox',e));
    const iv=setInterval(sweep,5*60*1000);
    return()=>{alive=false;clearInterval(iv);unsub();};
  },[user,ready,setData]);
  return null;
}

/* ── Check-in ekranı: iki link düğmesi + günün özeti ────────────────────── */
function CheckinPanel({data,setData,team,sync}){
  const user=sync&&sync.user;
  const cfg=team.checkin||{};
  /* Bulut verisi gelmeden yayımlamak, linkin arkasına BOŞ bir kadro yazmak demek:
     uygulama açıldığı anda elinde örnek takım vardır, gerçek kadro saniyeler sonra
     iner. Formu açan sporcu da isim listesi boş bir açılır kutu görür. Bu yüzden
     yayım, durum bir kez "synced" olana kadar bekler. */
  const[loaded,setLoaded]=useState(false);
  useEffect(()=>{if(sync&&sync.status==='synced')setLoaded(true);},[sync&&sync.status]);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState(null);
  const[copied,setCopied]=useState('');
  const[date,setDate]=useState(()=>fmt(today));
  const rev=checkinRev(team);
  const token=cfg.token||null;

  const saveCfg=upd=>setData(prev=>({...prev,teams:(prev.teams||[]).map(t=>
    t.id===team.id?{...t,checkin:{...(t.checkin||{}),...upd}}:t)}));

  /* Kadro değiştiyse linkin arkasındaki kaydı sessizce güncelle: koç bir sporcu
     ekleyip linki tekrar kopyalamayı unutsa bile formdaki liste doğru kalsın. */
  useEffect(()=>{
    if(!user||!loaded||!token||cfg.rev===rev)return;
    let alive=true;
    publishCheckinLink(user.uid,team,token)
      .then(()=>{if(alive)saveCfg({rev,publishedAt:new Date().toISOString()});})
      .catch(e=>{if(alive)setErr((e&&e.message)||String(e));});
    return()=>{alive=false;};
  },[user,loaded,token,rev]);

  const ensureLink=async()=>{
    if(!user)throw new Error(L('Önce giriş yap — linkler koç hesabına bağlanıyor.','Sign in first — links are tied to the coach account.'));
    if(!loaded)throw new Error(L('Veriler buluttan henüz inmedi. Birkaç saniye bekleyip tekrar dene — yoksa linkin arkasına boş bir kadro yazılır.','Data has not loaded from the cloud yet. Wait a few seconds and try again — otherwise the link will publish with an empty roster.'));
    const t=token||newCheckinToken();
    await publishCheckinLink(user.uid,team,t);
    if(t!==token||cfg.rev!==rev)saveCfg({token:t,rev,publishedAt:new Date().toISOString()});
    return t;
  };
  const copyText=async txt=>{
    try{await navigator.clipboard.writeText(txt);return true;}
    catch(e){
      // clipboard API'si yoksa (http, eski tarayıcı) klasik yol.
      try{
        const ta=document.createElement('textarea');
        ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();
        const ok=document.execCommand('copy');document.body.removeChild(ta);
        return ok;
      }catch(e2){return false;}
    }
  };
  const copyLink=async kind=>{
    setErr(null);setBusy(true);
    try{
      const t=await ensureLink();
      const url=checkinUrl(t,kind);
      const ok=await copyText(url);
      if(!ok)throw new Error(L('Panoya kopyalanamadı — aşağıdaki adresi elle kopyalayabilirsin.','Could not copy to clipboard — you can copy the address below by hand.'));
      setCopied(kind);setTimeout(()=>setCopied(c=>c===kind?'':c),2500);
    }catch(e){setErr((e&&e.message)||String(e));}
    finally{setBusy(false);}
  };
  /* Linkin arkasında ŞU AN ne yazdığı: koç bunu görmeden sporcuya link göndermesin.
     Sayı, en son yayımlanan kadroya göre değil, yayımlanacak kadroya göre gösterilir —
     ikisi ayrıldığında yukarıdaki etki zaten yeniden yayımlıyor. */
  const published=(team.athletes||[]).filter(a=>(a.name||'').trim()).length;
  const republish=async()=>{
    setErr(null);setBusy(true);
    try{
      const t=await ensureLink();
      saveCfg({token:t,rev,publishedAt:new Date().toISOString()});
      setCopied('pub');setTimeout(()=>setCopied(c=>c==='pub'?'':c),2500);
    }catch(e){setErr((e&&e.message)||String(e));}
    finally{setBusy(false);}
  };
  const resetToken=async()=>{
    if(!confirm(L('Eski linkler çalışmayı bırakacak ve sporculara yeni link göndermen gerekecek. Devam edilsin mi?','Old links will stop working and you\'ll need to send athletes a new one. Continue?')))return;
    setErr(null);setBusy(true);
    try{
      const t=newCheckinToken();
      await publishCheckinLink(user.uid,team,t);
      const fb=FB();
      if(fb&&token)await fb.firestore().collection(CHECKIN_LINKS).doc(token).delete().catch(()=>{});
      saveCfg({token:t,rev,publishedAt:new Date().toISOString()});
      setCopied('');
    }catch(e){setErr((e&&e.message)||String(e));}
    finally{setBusy(false);}
  };

  /* ── Özet: seçili gün kim doldurdu, kim doldurmadı ── */
  const athletes=(team.athletes||[]).filter(a=>(a.name||'').trim());
  const rows=useMemo(()=>athletes.map(a=>{
    const s=(a.srpeLog||[]).filter(e=>e.date===date);
    const w=(a.wellness||[]).filter(e=>e.date===date);
    const last=arr=>arr.length?arr[arr.length-1]:null;
    return{a,srpe:last(s),well:last(w)};
  }),[athletes,date]);
  const nS=rows.filter(r=>r.srpe).length,nW=rows.filter(r=>r.well).length;
  const missing=kind=>rows.filter(r=>!(kind==='srpe'?r.srpe:r.well)).map(r=>r.a.name);
  const hhmm=v=>{if(!v)return null;const t=new Date(v);return isNaN(t)?null:t.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});};
  const shiftDay=n=>setDate(d=>fmt(addD(parseD(d),n)));

  const LINK_BTN=[
    {kind:'srpe',tone:'rpe',icon:'bars',label:L('Antrenman sonrası — İçsel Yük (RPE)','Post-training — Internal Load (RPE)'),
     hint:L('Antrenman/maç bitince at. Top antrenmanı, kuvvet & kondisyon ve müsabaka için zorluk + süre sorar.','Send after training/a match. Asks difficulty + duration for ball training, strength & conditioning, and competition.')},
    {kind:'wellness',tone:'well',icon:'heart',label:'Wellness',
     hint:L('Dinlenik KAH, uyku, zihinsel yorgunluk, fiziksel yorgunluk, kas ağrısı ve ağrı bölgesi haritasını sorar.','Asks resting HR, sleep, mental fatigue, physical fatigue, muscle soreness, and the pain-region map.')},
  ];
  const nA=athletes.length;
  const pct=n=>nA?Math.min(100,Math.round(n/nA*100)):0;
  const sumRef=useRef(null),linksRef=useRef(null);
  const goTo=r=>{if(r.current)r.current.scrollIntoView({behavior:'smooth',block:'start'});};
  const HERO=[
    {v:`${nS} / ${nA}`,l:L('İçsel Yük (RPE)','Internal Load (RPE)'),p:pct(nS),tone:'rpe',to:sumRef},
    {v:`${nW} / ${nA}`,l:'Wellness',p:pct(nW),tone:'well',to:sumRef},
    {v:published,l:L('Linkteki kadro','Roster on the link'),p:pct(published),tone:'ros',to:linksRef},
  ];
  const copyMissing=async k=>{
    const names=missing(k);if(!names.length)return;
    const ok=await copyText(names.join(', '));
    if(ok){setCopied('miss-'+k);setTimeout(()=>setCopied(c=>c==='miss-'+k?'':c),2500);}
  };
  /* Satırın ⋮ menüsü: o sporcuya gidecek hatırlatma — adı ve formun linki tek mesajda,
     koç WhatsApp'ta tek tek yazmasın. Link henüz yoksa ilk kopyada yayımlanır. */
  const[menu,setMenu]=useState(null);
  const openMenu=(e,a)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const up=r.bottom+120>window.innerHeight;
    setMenu({id:a.id,name:a.name,left:Math.max(8,r.right-200),top:up?r.top-4:r.bottom+4,up});
  };
  const copyReminder=async(kind,name)=>{
    setMenu(null);setErr(null);setBusy(true);
    try{
      const t=await ensureLink();
      const url=checkinUrl(t,kind);
      const msg=kind==='srpe'
        ?L(`${name}, antrenman sonrası İçsel Yük (RPE) formunu doldurmayı unutma: ${url}`,`${name}, don't forget the post-training Internal Load (RPE) form: ${url}`)
        :L(`${name}, bugünkü Wellness formunu doldurmayı unutma: ${url}`,`${name}, don't forget today's Wellness form: ${url}`);
      const ok=await copyText(msg);
      if(!ok)throw new Error(L('Panoya kopyalanamadı.','Could not copy to clipboard.'));
      setCopied('rem');setTimeout(()=>setCopied(c=>c==='rem'?'':c),2500);
    }catch(e){setErr((e&&e.message)||String(e));}
    finally{setBusy(false);}
  };
  const lastAt=(...es)=>es.filter(e=>e&&e.submittedAt).map(e=>e.submittedAt).sort().pop()||null;
  const fmtWell=v=>{const n=Number(v);return isFinite(n)?String(Math.round(n*10)/10):v;};

  return(<div className="ck-page">
    <PageHero title={L('Check-in Formları','Check-in Forms')}
      sub={L(`Sporcunun kendi doldurduğu iki form · ${team.setup.teamName}`,
             `The two forms the athletes fill in themselves · ${team.setup.teamName}`)}>
      {HERO.map((s,i)=><button key={i} type="button" className={`ck-hstat ${s.tone}`} onClick={()=>goTo(s.to)}>
        <span className="ck-hstat-b">
          <b>{s.v}</b>
          <span className="ck-bar"><i style={{width:s.p+'%'}}/></span>
          <small>{s.l}</small>
        </span>
        <CkIcon n="chev" s={16}/>
      </button>)}
    </PageHero>

    {!user&&<div className="ck-note warn">
      {L(<>Linkler koç hesabına bağlandığı için <b>önce giriş yapman</b> gerekiyor.</>,
         <>Links are tied to the coach account, so you need to <b>sign in first</b>.</>)}
    </div>}
    {err&&<div className="ck-note err">{err}</div>}

    <div className="panel" ref={linksRef}>
      <div className="ck-head">
        <div className="ck-head-t">
          <b>{L('Formların linkleri','The form links')}</b>
          <span>{L('Aşağıdaki linkleri sporcularla paylaşın. Sporcu forma kendi adını seçerek doldurur, cevap uygulamaya otomatik olarak kaydedilir.',
                   'Share the links below with the athletes. The athlete picks their own name on the form, and the answer is saved to the app automatically.')}</span>
        </div>
      </div>
      <div className="ck-links">
        {LINK_BTN.map(b=><div key={b.kind} className={`ck-link ${b.tone}`}>
          <div className="ck-link-top">
            <span className="ck-ico"><CkIcon n={b.icon} s={24}/></span>
            <div className="ck-link-tx">
              <div className="ck-link-t">{b.label}</div>
              <div className="ck-link-h">{b.hint}</div>
            </div>
          </div>
          <button className="ck-copy" onClick={()=>copyLink(b.kind)} disabled={busy||!user||!loaded}>
            <CkIcon n={copied===b.kind?'check':'link'} s={17}/>
            <span>{copied===b.kind?L('Kopyalandı','Copied'):(busy?'…':(loaded?L('Linki kopyala','Copy link'):L('Veriler yükleniyor…','Loading data…')))}</span>
            <CkIcon n="copy" s={16} c="ck-copy-r"/>
          </button>
          {token&&<div className="ck-link-u">
            <CkIcon n="ext" s={17}/>
            <div>
              <a href={checkinUrl(token,b.kind)} target="_blank" rel="noreferrer">{L('Formu aç / önizle','Open / preview form')}</a>
              <code>{checkinUrl(token,b.kind)}</code>
            </div>
          </div>}
        </div>)}
      </div>
      {/* Sporcunun formda göreceği liste bu. Boşsa form işe yaramaz, o yüzden sayı
          burada yazıyor — koç linki göndermeden önce görsün. */}
      {token&&<div className="ck-state">
        <div className="ck-state-l">
          <CkIcon n="info" s={20} c="ck-state-i"/>
          <span>{L('Linkteki kadro:','Roster on the link:')} <b style={published===0?{color:'var(--high-t)'}:undefined}>{L(`${published} sporcu`,`${published} athletes`)}</b></span>
          {cfg.publishedAt&&<><i className="ck-state-sep"/>
            <span>{L('Son güncelleme:','Last updated:')} {new Date(cfg.publishedAt).toLocaleString(L('tr-TR','en-GB'))}</span></>}
          {cfg.rev!==rev&&<span className="ck-state-w">{L('kadro değişti, yayımlanıyor…','roster changed, publishing…')}</span>}
        </div>
        <div className="ck-state-a">
          <button className="btn sec" onClick={republish} disabled={busy||!loaded}>
            <CkIcon n="sync" s={15}/>{copied==='pub'?L('Yayımlandı','Published'):L('Kadroyu yeniden yayımla','Republish roster')}</button>
          <button className="btn sec" onClick={resetToken} disabled={busy}
            title={L('Link birine yanlışlıkla gittiyse ya da eski sporcuların elinde kaldıysa kullan.','Use this if a link went to the wrong person, or is still in former athletes\' hands.')}>
            <CkIcon n="link" s={15}/>{L('Linkleri yenile','Refresh links')}</button>
        </div>
      </div>}
      {token&&published===0&&<div className="ck-note warn" style={{marginTop:10,marginBottom:0}}>
        {L(<>Linkin arkasındaki kadro <b>boş</b> — formu açan sporcu isim listesi göremez.
        Bu takımda sporcu varsa <b>Kadroyu yeniden yayımla</b>'ya bas; yoksa önce <b>Kadro</b> ekranından kadroyu ekle.</>,
        <>The roster behind the link is <b>empty</b> — an athlete opening the form won't see a name list.
        If this team has athletes, click <b>Republish roster</b>; otherwise add the roster from the <b>Roster</b> screen first.</>)}
      </div>}
    </div>

    <div className="panel" ref={sumRef}>
      <div className="ck-head">
        <div className="ck-head-t">
          <b className="ck-h-lg">{L('Günün Özeti','Today\'s Summary')}</b>
          <span>{fd(date)}</span>
        </div>
        <div className="ck-daynav">
          <button className="ck-sq" onClick={()=>shiftDay(-1)} aria-label={L('Önceki gün','Previous day')}><CkIcon n="chevl" s={15}/></button>
          <input type="date" value={date} onChange={e=>setDate(e.target.value||fmt(today))}/>
          <button className="ck-sq" onClick={()=>shiftDay(1)} aria-label={L('Sonraki gün','Next day')}><CkIcon n="chev" s={15}/></button>
          <button className="ck-today" onClick={()=>setDate(fmt(today))}>{L('Bugün','Today')}</button>
        </div>
      </div>
      <div className="ck-kpis">
        {[{k:'srpe',tone:'rpe',icon:'bars',l:L('İçsel Yük (RPE)','Internal Load (RPE)'),n:nS},
          {k:'wellness',tone:'well',icon:'heart',l:'Wellness',n:nW}].map(m=>{
          const miss=nA-m.n;
          return<div key={m.k} className={`ck-kpi ${m.tone}`}>
            <span className="ck-ico"><CkIcon n={m.icon} s={24}/></span>
            <div className="ck-kpi-b">
              <div className="ck-kpi-l">{m.l}</div>
              <div className="ck-kpi-v">{m.n} / {nA}</div>
              <div className="ck-kpi-h">
                {miss>0?L(`${miss} kişi doldurmadı`,`${miss} not submitted`):L('Herkes doldurdu','Everyone submitted')}
                {miss>0&&<button type="button" className="ck-kpi-c" onClick={()=>copyMissing(m.k)}
                  title={L('Doldurmayanların adlarını kopyala','Copy the names of who hasn\'t submitted')}>
                  <CkIcon n={copied==='miss-'+m.k?'check':'copy'} s={12}/>{copied==='miss-'+m.k?L('Kopyalandı','Copied'):L('Adları kopyala','Copy names')}</button>}
              </div>
            </div>
          </div>;
        })}
        <div className="ck-kpi ros">
          <span className="ck-ico"><CkIcon n="users" s={24}/></span>
          <div className="ck-kpi-b">
            <div className="ck-kpi-l">{L('Kadro','Roster')}</div>
            <div className="ck-kpi-v">{nA}</div>
            <div className="ck-kpi-h">{L('Bu takımdaki sporcu','Athletes on this team')}</div>
          </div>
        </div>
      </div>

      {nA>0&&<div className="ck-tbl-w">
        <table className="ck-tbl">
          <thead><tr>
            <th className="n">#</th>
            <th>{L('Sporcu','Athlete')}</th>
            <th>{L('İçsel Yük (RPE)','Internal Load (RPE)')}</th>
            <th>Wellness</th>
            <th>{L('Son güncelleme','Last update')}</th>
            <th className="m"/>
          </tr></thead>
          <tbody>
            {rows.map(({a,srpe,well},i)=>{
              const last=hhmm(lastAt(srpe,well));
              return<tr key={a.id}>
                <td className="n"><span>{i+1}</span></td>
                <td className="nm">{a.name}</td>
                <td>{srpe?<span className="ck-val rpe"><b>{srpe.totalLoad?`${srpe.totalLoad} AU`:L('geldi','in')}</b>{hhmm(srpe.submittedAt)&&<i>{hhmm(srpe.submittedAt)}</i>}</span>
                  :<span className="ck-miss">{L('Doldurulmadı','Not submitted')}</span>}</td>
                <td>{well?<span className="ck-val well"><b>{well.readiness!=null?fmtWell(well.readiness):L('geldi','in')}</b>{hhmm(well.submittedAt)&&<i>{hhmm(well.submittedAt)}</i>}</span>
                  :<span className="ck-miss">{L('Doldurulmadı','Not submitted')}</span>}</td>
                <td>{last?<span className="ck-last"><CkIcon n="clock" s={17}/>{last}</span>:<span className="ck-dash">—</span>}</td>
                <td className="m"><button type="button" className="ck-sq sm" aria-label={L('Seçenekler','Options')}
                  onClick={e=>openMenu(e,a)}><CkIcon n="dots" s={16}/></button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
      {copied==='rem'&&<div className="ck-toast">{L('Hatırlatma panoya kopyalandı','Reminder copied to the clipboard')}</div>}
      {menu&&ReactDOM.createPortal(<>
        <div className="abm-bd" onClick={()=>setMenu(null)}/>
        <div className="abm-menu ck-menu" style={{left:menu.left,top:menu.top,transform:menu.up?'translateY(-100%)':'none'}}>
          <button type="button" disabled={busy||!user||!loaded} onClick={()=>copyReminder('srpe',menu.name)}>
            <CkIcon n="bars" s={14}/>{L('RPE hatırlatması kopyala','Copy RPE reminder')}</button>
          <button type="button" disabled={busy||!user||!loaded} onClick={()=>copyReminder('wellness',menu.name)}>
            <CkIcon n="heart" s={14}/>{L('Wellness hatırlatması kopyala','Copy Wellness reminder')}</button>
        </div>
      </>,document.body)}
      {!nA&&<div className="help" style={{marginTop:10}}>
        {L(<>Bu takımda sporcu yok. <b>Kadro</b> ekranından kadroyu ekle — formdaki isim listesi oradan geliyor.</>,
          <>This team has no athletes. Add the roster from the <b>Roster</b> screen — the form's name list comes from there.</>)}
      </div>}
    </div>
  </div>);
}

/* Check-in sayfasının çizgi simgeleri — tek renk, currentColor. */
function CkIcon({n,s=16,c}){
  const P={
    bars:<><rect x="4" y="12" width="4" height="8" rx="1.3" fill="currentColor" stroke="none"/><rect x="10" y="5" width="4" height="15" rx="1.3" fill="currentColor" stroke="none"/><rect x="16" y="9" width="4" height="11" rx="1.3" fill="currentColor" stroke="none"/></>,
    heart:<><path d="M19.5 12.6 12 20l-7.5-7.4A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 7.5 6.3z"/><path d="M3.5 12.5h4l1.6-2.6 2.4 5 1.8-3.4h7.2"/></>,
    users:<><circle cx="9" cy="8" r="3.4" fill="currentColor" stroke="none"/><path d="M2.8 19.5c.4-3.5 3-5.6 6.2-5.6s5.8 2.1 6.2 5.6z" fill="currentColor" stroke="none"/><circle cx="16.6" cy="8.6" r="2.7" fill="currentColor" stroke="none" opacity=".75"/><path d="M16.8 13.4c2.6.2 4.3 2.1 4.6 5.1h-4.2c-.2-2-1-3.7-2.2-4.8.5-.2 1.1-.3 1.8-.3z" fill="currentColor" stroke="none" opacity=".75"/></>,
    link:<><path d="M10 13.5a4.2 4.2 0 0 0 6 .3l2.9-2.9a4.2 4.2 0 0 0-6-6l-1.4 1.4"/><path d="M14 10.5a4.2 4.2 0 0 0-6-.3l-2.9 2.9a4.2 4.2 0 0 0 6 6l1.4-1.4"/></>,
    copy:<><rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M15.5 8.5V5.7a2.2 2.2 0 0 0-2.2-2.2H5.7a2.2 2.2 0 0 0-2.2 2.2v7.6a2.2 2.2 0 0 0 2.2 2.2h2.8"/></>,
    check:<path d="m5 12.5 4.5 4.5L19 7.5"/>,
    ext:<><path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H11"/><path d="M15 3.5h5.5V9"/><path d="M10.5 13.5l10-10"/></>,
    info:<><circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="M12 11v6" stroke="var(--panel)" strokeWidth="2.2"/><circle cx="12" cy="7.6" r="1.35" fill="var(--panel)" stroke="none"/></>,
    sync:<><path d="M20 11a8 8 0 0 0-14.6-4.2L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.2l1.4-1.7"/><path d="M20 20v-4.5h-4.5"/></>,
    chev:<path d="m9 5 7 7-7 7"/>,
    chevl:<path d="m15 5-7 7 7 7"/>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></>,
    dots:<><circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none"/></>,
  };
  return<svg className={c} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>;
}

