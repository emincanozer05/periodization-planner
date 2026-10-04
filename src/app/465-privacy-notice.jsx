/* =========================================================
   KVKK AYDINLATMA METNİ — giriş sayfasından, kayıt formundan ve Ayarlar'dan açılır
   =========================================================
   TASLAKTIR. Metin uygulamanın GERÇEKTE yaptığına göre yazıldı (hangi veriler, nereye gidiyor),
   ama hukuki danışmanlık yerine geçmez: yayımlamadan önce bir hukukçuya okutulmalı.
   Köşeli ayraçlı alanlar (PRIVACY_CONTROLLER) doldurulana kadar metnin başında "TASLAK" uyarısı
   görünür; doldurulunca kendiliğinden kalkar. */
const PRIVACY_CONTROLLER={
  name:'[AD SOYAD]',          // veri sorumlusu (bireysel işletme sahibi)
  address:'[ADRES]',
  email:'[E-POSTA]',
  retentionDays:'[SÜRE]',     // hesap silindikten sonra verilerin silinme süresi (gün)
  updated:'4 Ekim 2026',
};
const privacyIsDraft=()=>Object.values(PRIVACY_CONTROLLER).some(v=>/^\[/.test(String(v)));

function privacySections(){
  const c=PRIVACY_CONTROLLER;
  return[
    [L('1. Veri sorumlusu','1. Data controller'),
     [L(`6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu, CoachOS'u işleten ${c.name}'dir (adres: ${c.address}, e-posta: ${c.email}).`,
        `Under the Turkish Personal Data Protection Law No. 6698 ("KVKK"), the data controller is ${c.name}, who operates CoachOS (address: ${c.address}, email: ${c.email}).`)]],
    [L('2. İşlenen kişisel veriler','2. Personal data we process'),
     [L('Hesap verileri: e-posta adresi; Google ile girişte adın ve profil bilgin; oturum ve kimlik doğrulama kayıtları.',
        'Account data: email address; your name and profile details when you sign in with Google; session and authentication records.'),
      L('Sporcu ve ekip verileri (koç tarafından girilir): ad soyad, doğum tarihi, pozisyon, telefon, fotoğraf, boy, kilo ve diğer vücut ölçümleri, test sonuçları, antrenman programları ve antrenman yükü.',
        'Athlete and staff data (entered by the coach): name, date of birth, position, phone, photo, height, weight and other body measurements, test results, training programs and training load.'),
      L('Özel nitelikli kişisel veriler (sağlık): sakatlık ve ağrı kayıtları, wellness yanıtları (uyku, yorgunluk, kas ağrısı vb.), seans RPE yanıtları ve sağlıkla ilgili notlar.',
        'Special categories of personal data (health): injury and pain records, wellness answers (sleep, fatigue, muscle soreness, etc.), session RPE answers and health-related notes.'),
      L('Teknik veriler: bildirim için cihaz belirteci, dil tercihi ve uygulama ayarları. Çerez, analitik ya da reklam takibi kullanılmaz.',
        'Technical data: a device token for notifications, language preference and app settings. No cookies, analytics or advertising tracking are used.')]],
    [L('3. İşleme amaçları','3. Purposes'),
     [L('Antrenman planlama ve sporcu takibi; yük yönetimi, test değerlendirmesi ve sakatlık riskini azaltmaya yönelik izleme; verilerin cihazlar arasında senkronu ve yedeklenmesi; check-in formları ve uyarı bildirimleri; kullanıcı talep ettiğinde yapay zekâ destekli program önerisi; hesap güvenliğinin sağlanması.',
        'Training planning and athlete monitoring; load management, test evaluation and monitoring aimed at reducing injury risk; syncing and backing up data across devices; check-in forms and alert notifications; AI-assisted program suggestions when the user asks for them; keeping accounts secure.')]],
    [L('4. Hukuki sebepler','4. Legal bases'),
     [L('KVKK m.5/2 (c) sözleşmenin kurulması ve ifası ile (f) veri sorumlusunun meşru menfaati. Sağlık verileri KVKK m.6 uyarınca ilgili kişinin açık rızasına dayanılarak işlenir; 18 yaşından küçük sporcular için veli ya da vasinin rızası gerekir.',
        'KVKK Art. 5/2 (c) establishment and performance of a contract and (f) the legitimate interest of the data controller. Health data is processed under KVKK Art. 6 on the basis of the data subject\'s explicit consent; for athletes under 18, the consent of a parent or guardian is required.'),
      L('Sporcu verilerini giren koç ya da kulüp, sporcularını bu metin hakkında bilgilendirmek ve gerekli açık rızaları almakla yükümlüdür.',
        'The coach or club that enters athlete data is responsible for informing their athletes about this notice and for obtaining the required explicit consent.')]],
    [L('5. Aktarım','5. Transfers'),
     [L('Veriler hizmetin sağlanması için şu hizmet sağlayıcılarla paylaşılır: Google Firebase (kimlik doğrulama, veritabanı, dosya depolama, bildirim) ve sitenin barındırıldığı Vercel / Netlify. Bu sağlayıcıların sunucuları yurt dışında bulunabilir; yurt dışına aktarım KVKK m.9\'daki şartlara uygun olarak yapılır.',
        'Data is shared with these service providers to run the service: Google Firebase (authentication, database, file storage, notifications) and Vercel / Netlify, which host the site. Their servers may be located abroad; transfers abroad are made in line with KVKK Art. 9.'),
      L('Yapay zekâ: kullanıcı bir programı yapay zekâyla oluşturmayı seçtiğinde, ilgili sporcunun program için gerekli verileri (test sonuçları, kısıtlamalar, ağrı ve sakatlık bilgisi gibi) Google Gemini\'ye; kullanıcı kendi anahtarını girdiyse Anthropic\'e gönderilir.',
        'AI: when a user chooses to create a program with AI, the athlete data the program needs (such as test results, restrictions, pain and injury information) is sent to Google Gemini, or to Anthropic if the user has entered their own key.'),
      L('Egzersiz açıklamalarının çevirisi için egzersiz metinleri Google Translate\'e gönderilir; bu metinler kişisel veri içermez.',
        'Exercise descriptions are sent to Google Translate for translation; these texts contain no personal data.')]],
    [L('6. Saklama süresi','6. Retention'),
     [L(`Veriler hesap kullanımda olduğu sürece saklanır. Hesap silindiğinde veriler ${c.retentionDays} gün içinde silinir. Cihazında çevrimdışı kullanım için tutulan görsel kopyaları çıkış yaptığında silinir.`,
        `Data is kept while the account is in use. When the account is deleted, the data is deleted within ${c.retentionDays} days. Image copies kept on your device for offline use are deleted when you sign out.`)]],
    [L('7. Toplama yöntemi','7. How data is collected'),
     [L('Veriler kullanıcının uygulamaya girmesiyle, sporcuların doldurduğu check-in formlarıyla ve Google ile girişte Google\'dan elektronik ortamda toplanır.',
        'Data is collected electronically: when users enter it in the app, through check-in forms filled in by athletes, and from Google when signing in with Google.')]],
    [L('8. Hakların','8. Your rights'),
     [L('KVKK m.11 uyarınca; kişisel verinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik ya da yanlış işlenmişse düzeltilmesini, şartlar oluştuğunda silinmesini ya da yok edilmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhine bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğrarsan zararın giderilmesini talep etme haklarına sahipsin.',
        'Under KVKK Art. 11 you have the right to learn whether your personal data is processed and to request information if so; to learn the purpose of processing and whether it is used accordingly; to know the third parties it is transferred to; to request correction if incomplete or inaccurate; to request deletion or destruction when the conditions are met; to request that these actions be notified to the recipients; to object to a result against you arising from analysis by automated systems; and to claim compensation for damage caused by unlawful processing.')]],
    [L('9. Başvuru','9. How to apply'),
     [L(`Haklarına ilişkin taleplerini ${c.email} adresine yazılı olarak iletebilirsin. Başvurular en geç 30 gün içinde sonuçlandırılır.`,
        `You can send requests about your rights in writing to ${c.email}. Requests are answered within 30 days at the latest.`)]],
  ];
}

function PrivacyNotice({onClose}){
  useAppLang();
  const closeRef=useRef(null);
  useEffect(()=>{
    const k=e=>{if(e.key==='Escape')onClose();};
    document.addEventListener('keydown',k);
    try{closeRef.current&&closeRef.current.focus();}catch(e){}
    return()=>document.removeEventListener('keydown',k);
  },[]);
  return(<div className="pv-bg" onClick={onClose}>
    <div className="pv" role="dialog" aria-modal="true" aria-labelledby="pv-title" onClick={e=>e.stopPropagation()}>
      <div className="pv-hd">
        <div>
          <h2 id="pv-title">{L('KVKK Aydınlatma Metni','Privacy Notice (KVKK)')}</h2>
          <div className="pv-date">{L('Son güncelleme: ','Last updated: ')}{PRIVACY_CONTROLLER.updated}</div>
        </div>
        <button ref={closeRef} type="button" className="pv-x" onClick={onClose} aria-label={L('Kapat','Close')}>✕</button>
      </div>
      {privacyIsDraft()&&<div className="pv-draft" role="note">{L('TASLAK — köşeli ayraçlı alanlar henüz doldurulmadı.','DRAFT — the fields in square brackets are not filled in yet.')}</div>}
      <div className="pv-body">
        {privacySections().map(([h,ps],i)=><section key={i}><h3>{h}</h3>{ps.map((p,j)=><p key={j}>{p}</p>)}</section>)}
      </div>
    </div>
  </div>);
}

/* Metni açan bağlantı: kendi durumunu tutar, nerede kullanılırsa kullanılsın tek satır. */
function PrivacyLink({className,children}){
  const[open,setOpen]=useState(false);
  return(<>
    <button type="button" className={className||'ln-link'} onClick={()=>setOpen(true)}>{children||L('KVKK Aydınlatma Metni','Privacy Notice')}</button>
    {open&&<PrivacyNotice onClose={()=>setOpen(false)}/>}
  </>);
}
