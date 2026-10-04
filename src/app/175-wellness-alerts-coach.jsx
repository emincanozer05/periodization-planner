/* =========================================================
   WELLNESS ALERTS — the coach's side
   ========================================================= */

/* Bildirim izni kartı. Tek bir düğme değil, çünkü "açılamadı"nın birkaç farklı
   sebebi var ve her birinin farklı bir çaresi: iPhone'da ana ekrana eklemek,
   tarayıcı ayarından engeli kaldırmak, kurulumu tamamlamak. Hepsine "bildirimler
   kapalı" demek, koçu çözümü olan bir sorunla baş başa bırakırdı. */
function PushCard(){
  const[state,setState]=useState(()=>pushState());
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');

  // İzin verilmişse token'ı sessizce tazele — cihaz token'ları dönebiliyor ve
  // dönmüş bir token'ın tek belirtisi bildirimlerin sessizce kesilmesi oluyor.
  useEffect(()=>{
    if(state!=='granted')return;
    refreshCoachPush(false).catch(e=>setErr((e&&e.message)||String(e)));
  },[state]);

  const enable=async()=>{
    setErr('');setBusy(true);
    try{
      const p=await Notification.requestPermission();
      if(p!=='granted'){setState(pushState());setBusy(false);return;}
      await refreshCoachPush(true);        // düğmeye basıldı: şimdi kaydol
      setState('granted');
    }catch(e){setErr((e&&e.message)||String(e));}
    setBusy(false);
  };

  if(state==='granted'){
    return(<div className="push-c ok">
      <span className="ic">🔔</span>
      <div className="bd">
        <div className="h">{L('Bu cihazda bildirimler açık','Notifications are on for this device')}</div>
        <div className="p">{L('Bir sporcunun sabah formu uyarı verdiğinde bildirim bu cihaza düşer.',
                              'When an athlete’s morning check-in triggers an alert, this device is notified.')}</div>
        {err&&<div className="p" style={{color:'var(--yellow)'}}>{err}</div>}
      </div>
    </div>);
  }
  if(state==='ios-needs-install'){
    return(<div className="push-c warn">
      <span className="ic">📲</span>
      <div className="bd">
        <div className="h">{L('iPhone / iPad için bir adım daha','One more step on iPhone / iPad')}</div>
        <div className="p">{L('Apple, bildirimleri yalnızca ana ekrana eklenmiş sayfalarda çalıştırıyor:',
                              'Apple only runs notifications on pages added to the Home Screen:')}</div>
        <ol>
          <li>{L('Safari’de alttaki Paylaş düğmesine dokun.','Tap the Share button at the bottom of Safari.')}</li>
          <li>{L('"Ana Ekrana Ekle"yi seç.','Choose "Add to Home Screen".')}</li>
          <li>{L('CoachOS’u ana ekrandan aç ve bu kartı tekrar gör.','Open CoachOS from the Home Screen and come back to this card.')}</li>
        </ol>
      </div>
    </div>);
  }
  if(state==='denied'){
    return(<div className="push-c warn">
      <span className="ic">🔕</span>
      <div className="bd">
        <div className="h">{L('Bildirimler bu tarayıcıda engellenmiş','Notifications are blocked in this browser')}</div>
        <div className="p">{L('Adres çubuğundaki kilit simgesine tıkla → site ayarları → Bildirimler → izin ver, sonra sayfayı yenile.',
                              'Click the lock icon in the address bar → site settings → Notifications → allow, then reload.')}</div>
      </div>
    </div>);
  }
  if(state==='nokey'||state==='noconfig'){
    return(<div className="push-c warn">
      <span className="ic">⚙</span>
      <div className="bd">
        <div className="h">{L('Bildirim kurulumu tamamlanmamış','Notification setup is unfinished')}</div>
        <div className="p">{L('push-config.js içindeki vapidKey boş. Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair ile üretip dosyaya yapıştır.',
                              'vapidKey in push-config.js is empty. Generate one under Firebase Console → Project settings → Cloud Messaging → Web Push certificates, and paste it into the file.')}</div>
      </div>
    </div>);
  }
  if(state==='unsupported'){
    return(<div className="push-c">
      <span className="ic">🖥</span>
      <div className="bd">
        <div className="h">{L('Bu tarayıcı bildirim desteklemiyor','This browser cannot show notifications')}</div>
        <div className="p">{L('Uyarılar yine de oluşuyor; bildirim almak için başka bir tarayıcı ya da telefonun gerekiyor.',
                              'Alerts are still raised; to be notified you need another browser or your phone.')}</div>
      </div>
    </div>);
  }
  return(<div className="push-c">
    <span className="ic">🔔</span>
    <div className="bd">
      <div className="h">{L('Wellness uyarılarını bu cihaza al','Get wellness alerts on this device')}</div>
      <div className="p">{L('Bir sporcunun Overall Wellness skoru 3.5’in altına düştüğünde ya da orta/yüksek bir ağrı bildirdiğinde anında haberin olur.',
                            'You hear the moment an athlete’s Overall Wellness drops below 3.5 or they report moderate or high pain.')}</div>
      <button className="btn sec sm" style={{marginTop:9}} disabled={busy} onClick={enable}>
        {busy?L('Açılıyor…','Turning on…'):L('Bildirimleri aç','Turn on notifications')}</button>
      {err&&<div className="p" style={{color:'var(--red)'}}>{err}</div>}
    </div>
  </div>);
}


/* Kadro özetini bulutta güncel tutar. Hiçbir şey çizmez.

   Sunucu "bu sporcunun uyarısı kime gider" sorusunu tek bir dokümandan
   cevaplıyor; o doküman koçun kadrosundan türüyor ve kadro değiştiğinde
   tazelenmesi gerekiyor. Damga aynıysa hiç yazılmıyor, yani koç plan üzerinde
   çalışırken bu bileşen sessiz duruyor. */
function AlertRosterSync({teams,sync}){
  const user=sync&&sync.user,status=sync&&sync.status;
  /* Takım başına, bu oturumda yayımlanmış damga. Hesap değişirse sıfırlanıyor:
     başka bir hesabın kadrosu bu hesabın adına yayımlanmış sayılmamalı. */
  const done=useRef({uid:null,rev:new Map()});
  useEffect(()=>{
    // Buluttan ilk yükleme bitmeden yazmak, boş bir kadroyu yayımlamak olurdu.
    if(!user||status!=='synced'||!Array.isArray(teams))return;
    if(done.current.uid!==user.uid){done.current={uid:user.uid,rev:new Map()};}
    const seen=done.current.rev;
    let alive=true;
    /* HER TAKIM yayımlanıyor, yalnızca ekranda açık olan değil.
       Eskiden yalnızca aktif takım yayımlanıyordu ve sonucu şuydu: koç U12'ye
       bakarken U14'ün kadro dokümanı hiç yazılmıyor, o takımın sporcusu uyarı
       verdiğinde sunucu kadroyu bulamıyor ve ekipten KİMSEYE bildirim gitmiyor —
       üstelik bildirimin linki de o dokümandan geldiği için uyarı linksiz kalıyor.
       Koçun bütün takımlarını tek tek açmış olması şart olamaz. */
    (teams||[]).forEach(team=>{
      if(!team||!team.id)return;
      const rev=alertRosterRev(team);
      if(seen.get(team.id)===rev)return;         // bu kadro bu hâliyle zaten yayımlandı
      seen.set(team.id,rev);
      publishAlertRoster(user.uid,team).catch(e=>{
        if(alive)seen.delete(team.id);           // başarısız olduysa bir dahaki turda yeniden dene
        console.warn('alert roster publish',e);
      });
    });
    return()=>{alive=false;};
  },[user,status,teams]);
  return null;
}

/* ── Bildirim köprüsü ───────────────────────────────────────────────────────
   Koç hangi ekranda olursa olsun çalışan üç şey. Hiçbiri çizim yapmıyor.

   1) CİHAZ KAYDINI TAZE TUTMAK. Web FCM'de "token değişti" diye bir olay yok;
      kaydın yaşadığından emin olmanın tek yolu arada bir getToken çağırmak. Bu
      eskiden yalnızca Wellness Uyarıları EKRANI açıkken yapılıyordu: o ekrana
      girmeyen koçun dönmüş ya da sunucudan silinmiş kaydı hiç fark edilmiyordu ve
      kart "bildirimler açık" derken ortada kayıt kalmıyordu.

   2) UYGULAMA AÇIKKEN GELEN BİLDİRİMİ GÖSTERMEK. Firebase'in service worker'ı,
      sitenin GÖRÜNÜR bir sekmesi varsa bildirimi KENDİSİ göstermiyor; payload'ı
      sayfaya yollayıp çıkıyor (SDK: hasVisibleClients → sendMessagePayload…).
      Sayfada bunu karşılayan kimse olmadığı için uyarı sessizce düşüyordu —
      "bazen geliyor bazen gelmiyor"un birinci sebebi buydu. Bildirimi burada
      elle gösteriyoruz; worker göstermediği için ikinci bir kopya oluşmuyor.

   3) BİLDİRİME TIKLAYINCA DOĞRU EKRANI AÇMAK. Zaten açık bir sekme varsa FCM'in
      worker'ı yeni adrese GİTMİYOR, sekmeyi öne alıp bir mesaj yolluyor; o mesajı
      dinleyen olmadığı için koç tıkladığında hiçbir şey olmuyordu. */
function PushBridge({sync,openAlert}){
  const user=sync&&sync.user;
  const route=useRef(openAlert);route.current=openAlert;

  // 1) Kayıt tazeleme — izin verilmişse, oturum başına bir kez.
  useEffect(()=>{
    if(!user||pushState()!=='granted')return;
    refreshCoachPush(false).catch(e=>console.warn('push keep-alive',e));
  },[user]);

  /* 2) + 3) — dinleyiciler. İZİN ARANMIYOR ve bu kasıtlı: koç izni bu oturum
     içinde (Uyarılar ekranındaki düğmeyle) veriyor olabiliyor ve o an bu etkinin
     yeniden çalışması için bir sebep yok. İzinsiz bir dinleyici zararsız — hiç
     mesaj gelmiyor; izin sonradan verildiğinde ise hazır duruyor. */
  useEffect(()=>{
    if(!('serviceWorker' in navigator)||!PUSH_CFG())return;
    let alive=true;
    /* Bildirimi sayfadan göstermek: SW kaydı üzerinden, çünkü `new Notification()`
       mobil tarayıcılarda çalışmıyor. Etiket sunucudakiyle AYNI (alertId): aynı
       sporcunun aynı günkü uyarısı üst üste yazıyor, yeni satır açmıyor.

       Worker payload'ı AÇIK OLAN HER sekmeye yolluyor, yalnızca görünene değil:
       iki sekmesi açık bir koçta bu fonksiyon iki kez çalışıyor. Ayrı bir "yalnızca
       görünen sekme göstersin" kontrolü BİLEREK yok — aynı etiket ikinci bildirimi
       ilkinin üstüne yazdığı için ekranda yine tek satır kalıyor, ve o kontrol
       sekme tam o anda arkaya alınırsa bildirimi tamamen yutabiliyordu.
       Kaçırılmış bir uyarı, ikinci kez titreyen bir telefondan kötüdür. */
    const showLocal=async payload=>{
      try{
        const d=(payload&&payload.data)||{};
        const n=(payload&&payload.notification)||{};
        const reg=await navigator.serviceWorker.ready;
        if(!reg||!alive)return;
        await reg.showNotification(n.title||'CoachOS',{
          body:n.body||'',
          /* `icon` BİLEREK yok: Android bu görseli bildirimin SAĞ kenarında ikinci
             bir kutu olarak basıyor, solda zaten aynı logo (badge) duruyor. */
          badge:'logo-mark.png',
          tag:d.alertId||undefined,renotify:true,
          /* Tıklanınca nereye gidileceği. `coachosAlert` bir işaret: service
             worker'daki tıklama dinleyicisi YALNIZCA bu işareti taşıyan
             bildirimlere bakıyor, FCM'in kendi gösterdikleri ona kalıyor. */
          data:{coachosAlert:{alertId:d.alertId||'',athleteId:d.athleteId||'',teamId:d.teamId||''},
                link:d.link||''},
        });
      }catch(e){console.warn('push foreground',e);}
    };
    let stop=null;
    try{
      stop=firebase.messaging().onMessage(p=>{if(alive)showLocal(p);});
    }catch(e){console.warn('push onMessage',e);}

    // Tıklama: hem FCM'in kendi mesajı hem bizim gösterdiğimiz bildirim.
    const onMsg=ev=>{
      const p=ev&&ev.data;
      if(!p||typeof p!=='object')return;
      const d=(p.isFirebaseMessaging&&p.messageType==='notification-clicked')?(p.data||null)
             :(p.coachos==='alert-click'?p:null);
      if(!d||!d.athleteId)return;
      route.current&&route.current({athleteId:d.athleteId,teamId:d.teamId||''});
    };
    navigator.serviceWorker.addEventListener('message',onMsg);
    return()=>{alive=false;
      navigator.serviceWorker.removeEventListener('message',onMsg);
      try{if(typeof stop==='function')stop();}catch(e){}};
  },[user]);
  return null;
}

