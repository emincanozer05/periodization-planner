function LoadingScreen(){
  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <img src="logo.png" alt="CoachOS" style={{height:52,marginBottom:14,opacity:.7}}/>
        <div style={{color:'var(--dim)',fontSize:14}}>{L('Yükleniyor…','Loading…')}</div>
      </div>
      <LanguageSelector/>
    </div>
  );
}

function GoogleBtn({onClick,busy}){
  return(
    <button onClick={onClick} disabled={busy} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'10px 16px',borderRadius:8,border:'1px solid var(--border)',background:'#fff',color:'#1f1f1f',fontSize:14,fontWeight:600,cursor:busy?'default':'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
      {busy?'…':L('Google ile Giriş Yap','Sign in with Google')}
    </button>
  );
}

/* Giriş öncesi sayfa. Giriş kartı açılışta görünür (eskiden tanıtım sayfasındaki bir düğmeyle
   açılan pencereydi); altında uygulamanın GERÇEK modüllerini anlatan bölümler var. Uydurma rakam,
   fiyat ya da "demo" yok. Giriş mantığı (Google, e-posta/şifre, hata mesajları) değişmedi. */
const LN_FEATURES=[
  {ic:'▤',t:['Sezon ve periyotlama','Season & periodization'],
   d:['Sezonu makrosiklus, faz ve haftalara böl; her haftanın planlı hacim ve şiddetini gör. Lineer, blok, dalgalı ve diğer periyotlama modelleri.',
      'Split the season into a macrocycle, phases and weeks and see each week\'s planned volume and intensity. Linear, block, undulating and other periodization models.']},
  {ic:'▣',t:['Haftalık takvim','Weekly calendar'],
   d:['Takım ve sporcu seanslarını haftalık ya da aylık planla; seansları sürükle-bırakla taşı, kopyala. Haftayı yazdır ya da PDF/görsel olarak paylaş.',
      'Plan team and athlete sessions by week or month; drag sessions to move or copy them. Print the week or share it as a PDF or image.']},
  {ic:'◉',t:['Kadro ve sporcu profili','Roster & athlete profile'],
   d:['Her sporcu için antropometri, sakatlık ve ağrı kaydı, notlar, antrenman profili ve kişisel takvim tek sayfada.',
      'Anthropometrics, injury and pain records, notes, a training profile and a personal calendar for every athlete on one page.']},
  {ic:'◎',t:['Test ve değerlendirme','Testing & assessment'],
   d:['FMS, sıçrama, sprint, çeviklik, mobilite ve kuvvet testlerini kaydet; sonuçları yaşa ve pozisyona göre referanslarla ve takımla karşılaştır.',
      'Record FMS, jump, sprint, agility, mobility and strength tests; compare results with age- and position-based references and with the squad.']},
  {ic:'▥',t:['Yük takibi','Load monitoring'],
   d:['Seans RPE\'si ve süreden iç yükü (AU) hesapla; akut:kronik oran, monotoni, zorlanma ve wellness ısı haritasıyla riskli haftaları erken gör.',
      'Compute internal load (AU) from session RPE and duration; spot risky weeks early with the acute:chronic ratio, monotony, strain and a wellness heatmap.']},
  {ic:'⫶',t:['Egzersiz kütüphanesi','Exercise library'],
   d:['Hareket kalıbı, ekipman, zorluk ve kas grubuna göre düzenlenmiş egzersizler; video, açıklama ve kontrendikasyon uyarılarıyla. PDF olarak dışa aktar.',
      'Exercises organized by movement pattern, equipment, difficulty and muscle group, with video, description and contraindication warnings. Export as a PDF.']},
  {ic:'⧉',t:['Bireyselleştirme','Individualization'],
   d:['Bir takım seansını her sporcu için ayrı, düzenlenebilir bir programa çevir. Yapay zekâ önerir; ağrı ve sakatlık kurallarını denetleyen kod onaylamadan hiçbir şey kaydedilmez.',
      'Turn one team session into a separate, editable program for every athlete. AI suggests; nothing is saved until code that checks pain and injury rules approves it.']},
  {ic:'✓',t:['Check-in formları','Check-in forms'],
   d:['Sporculara wellness ve RPE formu bağlantısı gönder; yanıtlar takvime ve yük takibine düşer, eşiği aşan durumlarda ekibe uyarı gider.',
      'Send athletes wellness and RPE form links; answers land in the calendar and load monitoring, and the staff is alerted when a threshold is crossed.']},
];
const LN_EXTRAS=[
  ['Seçmeler havuzu','Tryouts pool'],['Interval zamanlayıcı','Interval timer'],['Ortak kulüp takvimi','Shared club calendar'],
  ['Türkçe / İngilizce','Turkish / English'],['Çevrimdışı çalışır','Works offline'],['Bulut senkronu ve yedekleme','Cloud sync & backup'],
];

function LangSeg(){
  useAppLang();
  return(<div className="ln-lang" role="group" aria-label={L('Dil seçimi','Language')}>
    {[['tr','TR'],['en','EN']].map(([k,lbl])=><button key={k} type="button" className={REPORT_LANG===k?'on':''}
      aria-pressed={REPORT_LANG===k} onClick={()=>setReportLang(k)}>{lbl}</button>)}
  </div>);
}

function LoginPage({sync}){
  useAppLang();
  const[tab,setTab]=useState('google'); // google|email
  const[isSignup,setIsSignup]=useState(false);
  const[email,setEmail]=useState('');
  const[pw,setPw]=useState('');
  const[err,setErr]=useState('');
  const[note,setNote]=useState('');
  const[busy,setBusy]=useState(false);
  const googleLogin=async()=>{
    setErr('');sync.clearAuthErr&&sync.clearAuthErr();setBusy(true);
    try{await sync.signInWithGoogle();}
    catch(e){
      const msgs={
        'auth/operation-not-allowed':L('Google girişi Firebase Console\'da etkinleştirilmemiş. Authentication → Sign-in method → Google → Enable.','Google sign-in is not enabled in the Firebase Console. Authentication → Sign-in method → Google → Enable.'),
        'auth/unauthorized-domain':L('Bu domain Firebase\'de yetkili değil. Authentication → Settings → Authorized domains listesine bu sitenin adresini (ör. ...netlify.app) ekle.','This domain is not authorized in Firebase. Add this site\'s address (e.g. ...netlify.app) to Authentication → Settings → Authorized domains.'),
        'auth/network-request-failed':L('İnternet bağlantısı hatası.','Network connection error.'),
        'auth/popup-blocked':L('Tarayıcı popup\'ı engelledi. Adres çubuğundaki izin ikonuna tıkla.','The browser blocked the popup. Click the permission icon in the address bar.'),
      };
      setErr(msgs[e.code]||(e.code?e.code+': '+e.message:e.message));
    }finally{setBusy(false);}
  };
  const emailSubmit=async()=>{
    const mail=email.trim(), pass=pw;
    if(!mail){setErr(L('E-posta girin.','Enter your email.'));return;}
    if(!pass){setErr(L('Şifre girin.','Enter your password.'));return;}
    if(isSignup&&pass.length<6){setErr(L('Şifre en az 6 karakter olmalı.','Password must be at least 6 characters.'));return;}
    setErr('');setBusy(true);
    try{
      if(isSignup)await sync.signUp(mail,pass);
      else await sync.signIn(mail,pass);
    }catch(e){
      // When the credential is rejected, check which provider this email is actually registered with.
      // The #1 cause here: the account was created via Google Sign-In and has NO password.
      if(e.code==='auth/invalid-credential'||e.code==='auth/wrong-password'||
         e.code==='auth/user-not-found'||e.code==='auth/email-already-in-use'){
        const methods=await sync.methodsFor(mail);
        if(methods.includes('google.com')&&!methods.includes('password')){
          setErr(L('Bu e-posta Google ile kayıtlı; şifresi yok. Yukarıdaki "Google ile Giriş" butonunu kullan.','This email is registered with Google and has no password. Use the "Sign in with Google" button above.'));
          setBusy(false);return;
        }
        if(isSignup&&methods.length){setErr(L('Bu e-posta zaten kayıtlı — giriş yap.','This email is already registered — sign in instead.'));setBusy(false);return;}
        if(!isSignup&&methods.length===0){
          setErr(L('Bu e-postayla hesap yok (ya da şifresi yanlış). Önce "Kayıt ol".','There is no account with this email (or the password is wrong). Try "Sign up" first.'));setBusy(false);return;}
      }
      const msgs={'auth/invalid-email':L('Geçersiz e-posta.','Invalid email.'),'auth/missing-password':L('Şifre girin.','Enter your password.'),
        'auth/weak-password':L('Şifre en az 6 karakter olmalı.','Password must be at least 6 characters.'),'auth/email-already-in-use':L('Bu e-posta zaten kayıtlı — giriş yap.','This email is already registered — sign in instead.'),
        'auth/invalid-credential':L('Yanlış e-posta veya şifre.','Wrong email or password.'),'auth/user-not-found':L('Hesap bulunamadı.','Account not found.'),
        'auth/wrong-password':L('Yanlış şifre.','Wrong password.'),'auth/network-request-failed':L('Bağlantı hatası.','Connection error.'),
        'auth/too-many-requests':L('Çok fazla deneme — biraz bekleyip tekrar dene.','Too many attempts — wait a moment and try again.')};
      setErr(msgs[e.code]||e.message);
    }finally{setBusy(false);}
  };
  const resetPassword=async()=>{
    const mail=email.trim();
    setErr('');setNote('');
    if(!mail){setErr(L('Şifre sıfırlama bağlantısı için önce e-postanı yaz.','Type your email first so we can send the reset link.'));return;}
    setBusy(true);
    try{
      await sync.resetPassword(mail);
      setNote(L('Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.',
        'If this email is registered, a password reset link has been sent. Check your inbox (and spam folder).'));
    }catch(e){
      const msgs={'auth/invalid-email':L('Geçersiz e-posta.','Invalid email.'),'auth/missing-email':L('E-posta girin.','Enter your email.'),
        'auth/network-request-failed':L('Bağlantı hatası.','Connection error.'),
        'auth/too-many-requests':L('Çok fazla deneme — biraz bekleyip tekrar dene.','Too many attempts — wait a moment and try again.')};
      setErr(msgs[e.code]||e.message);
    }finally{setBusy(false);}
  };
  const shownErr=err||sync.authErr;
  return(
    <div className="ln">
      <header className="ln-top">
        <img className="ln-logo" src="logo-wordmark.png" alt="CoachOS"/>
        <LangSeg/>
      </header>
      <main className="ln-hero">
        <div className="ln-intro">
          <div className="ln-kicker">{L('Kuvvet ve kondisyon ekipleri için','For strength & conditioning staff')}</div>
          <h1 className="ln-h1">{L('Antrenman planlama ve sporcu takibi, tek yerde.','Training planning and athlete monitoring, in one place.')}</h1>
          <p className="ln-sub">{L('Sezon planı, haftalık takvim, yük takibi, testler ve sporcuya özel programlar — koç ve performans ekibinin günlük işi için.',
            'Season plan, weekly calendar, load monitoring, testing and athlete-specific programs — for the daily work of coaches and performance staff.')}</p>
          <ul className="ln-points">
            <li>{L('Verilerin hesabına bağlı; bilgisayar ve telefon arasında senkronize olur.','Your data is tied to your account and syncs between computer and phone.')}</li>
            <li>{L('İnternet yokken de açılır, bağlantı gelince kaydeder.','Opens without internet and saves once you are back online.')}</li>
          </ul>
        </div>
        <section className="ln-card" aria-label={L('Giriş','Sign in')}>
          <div className="ln-card-hd">
            <div>
              <div className="ln-card-t">{isSignup&&tab==='email'?L('Hesap oluştur','Create an account'):L('Giriş yap','Sign in')}</div>
              <div className="ln-card-s">{L('Verilerine erişmek için hesabınla devam et','Continue with your account to reach your data')}</div>
            </div>
          </div>
          <GoogleBtn onClick={googleLogin} busy={busy&&tab==='google'}/>
          {(tab==='google'&&shownErr)&&<div className="ln-err" role="alert">{shownErr}</div>}
          <div className="ln-or"><i/><span>{L('veya','or')}</span><i/></div>
          {tab==='google'?(
            <button type="button" className="btn sec" style={{width:'100%'}} onClick={()=>{setTab('email');setErr('');setNote('');}}>{L('E-posta / Şifre ile Giriş','Sign in with Email / Password')}</button>
          ):(
            <form onSubmit={e=>{e.preventDefault();emailSubmit();}} noValidate>
              <label htmlFor="ln-email">{L('E-posta','Email')}</label>
              <input id="ln-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="ornek@mail.com"/>
              <label htmlFor="ln-pw" style={{marginTop:10}}>{L('Şifre','Password')} {isSignup&&<span style={{color:'var(--dim)',textTransform:'none'}}>{L('(en az 6 karakter)','(at least 6 characters)')}</span>}</label>
              <input id="ln-pw" type="password" value={pw} onChange={e=>setPw(e.target.value)}
                autoComplete={isSignup?'new-password':'current-password'} placeholder="••••••"/>
              {!isSignup&&<button type="button" className="ln-link ln-forgot" onClick={resetPassword} disabled={busy}>{L('Şifremi unuttum','Forgot password?')}</button>}
              {shownErr&&<div className="ln-err" role="alert">{shownErr}</div>}
              {note&&<div className="ln-note" role="status">{note}</div>}
              <button type="submit" className="btn" style={{width:'100%',marginTop:12}} disabled={busy}>
                {busy?'…':(isSignup?L('Kayıt Ol','Sign Up'):L('Giriş Yap','Sign In'))}
              </button>
              <div className="ln-switch">
                {isSignup?L('Zaten hesabın var mı? ','Already have an account? '):L('Hesabın yok mu? ','Don\'t have an account? ')}
                <button type="button" className="ln-link" onClick={()=>{setErr('');setNote('');setIsSignup(!isSignup);}}>
                  {isSignup?L('Giriş yap','Sign in'):L('Kayıt ol','Sign up')}
                </button>
              </div>
              <button type="button" className="btn sec" style={{width:'100%',marginTop:8,fontSize:12}} onClick={()=>{setTab('google');setErr('');setNote('');}}>{L('← Geri','← Back')}</button>
            </form>
          )}
        </section>
      </main>
      <section className="ln-feats" aria-label={L('Neler yapabilirsin','What you can do')}>
        <h2 className="ln-h2">{L('CoachOS ile neler yapabilirsin','What you can do with CoachOS')}</h2>
        <div className="ln-grid">
          {LN_FEATURES.map((f,i)=><article key={i} className="ln-feat">
            <div className="ln-feat-ic" aria-hidden="true">{f.ic}</div>
            <h3>{L(f.t[0],f.t[1])}</h3>
            <p>{L(f.d[0],f.d[1])}</p>
          </article>)}
        </div>
        <div className="ln-extras">{LN_EXTRAS.map((x,i)=><span key={i}>{L(x[0],x[1])}</span>)}</div>
      </section>
      <footer className="ln-foot">
        <span>© {new Date().getFullYear()} CoachOS</span>
      </footer>
    </div>
  );
}

function AuthModal({sync,onClose}){
  const[mode,setMode]=useState('signin');
  const[email,setEmail]=useState('');
  const[pw,setPw]=useState('');
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);
  const submit=async()=>{
    const mail=email.trim(), pass=pw;
    if(!mail){setErr('Enter an email.');return;}
    if(!pass){setErr('Enter a password.');return;}
    if(mode==='signup'&&pass.length<6){setErr('Password must be at least 6 characters.');return;}
    setErr('');setBusy(true);
    try{
      if(mode==='signin')await sync.signIn(mail,pass);
      else await sync.signUp(mail,pass);
      onClose();
    }catch(e){
      if(e.code==='auth/invalid-credential'||e.code==='auth/wrong-password'||
         e.code==='auth/user-not-found'||e.code==='auth/email-already-in-use'){
        const methods=await sync.methodsFor(mail);
        if(methods.includes('google.com')&&!methods.includes('password')){
          setErr('This email is registered via Google (no password). Use the Google Sign-In button.');setBusy(false);return;}
        if(mode==='signup'&&methods.length){setErr('This email is already registered — Sign in.');setBusy(false);return;}
        if(mode==='signin'&&methods.length===0){setErr('No account for this email (or wrong password). Sign up first.');setBusy(false);return;}
      }
      const m={'auth/invalid-email':L('Geçersiz e-posta.','Invalid email.'),'auth/missing-password':L('Bir parola gir.','Enter a password.'),
        'auth/weak-password':L('Parola en az 6 karakter olmalı.','Password must be at least 6 characters.'),'auth/email-already-in-use':L('Bu e-posta zaten kayıtlı — Giriş yap.','This email is already registered — Sign in.'),
        'auth/invalid-credential':L('E-posta ya da parola yanlış.','Wrong email or password.'),'auth/user-not-found':L('Hesap bulunamadı — önce kayıt ol.','Account not found — sign up first.'),
        'auth/wrong-password':L('Parola yanlış.','Wrong password.'),'auth/network-request-failed':L('Bağlantı hatası.','Connection error.'),
        'auth/too-many-requests':L('Çok fazla deneme — biraz bekleyip tekrar dene.','Too many attempts — wait a bit and retry.')}[e.code]||e.message;
      setErr(m);
    }finally{setBusy(false);}
  };
  return(<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div onClick={e=>e.stopPropagation()} className="panel" style={{width:360,maxWidth:'92vw',margin:0}}>
      <h2>☁ {mode==='signin'?L('Buluta Giriş','Cloud Sign-in'):L('Hesap Oluştur','Create Account')}</h2>
      <div className="help" style={{marginBottom:12}}>{L('Bütün cihazlarında aynı e-posta ve parolayla gir — verin kendiliğinden senkronlanır.','Sign in with the same email/password on all your devices — your data syncs automatically.')}</div>
      <label>{L('E-posta','Email')}</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="ornek@mail.com"/>
      <label style={{marginTop:10}}>{L('Parola','Password')} {mode==='signup'&&<span style={{textTransform:'none',color:'var(--dim)'}}>{L('(en az 6 karakter)','(at least 6 characters)')}</span>}</label>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'}
        onKeyDown={e=>{if(e.key==='Enter')submit();}} placeholder="••••••"/>
      {err&&<div style={{color:'var(--red)',fontSize:12,marginTop:10}}>{err}</div>}
      <button className="btn" style={{width:'100%',marginTop:14}} disabled={busy} onClick={submit}>{busy?'...':(mode==='signin'?L('Giriş Yap','Sign In'):L('Kayıt Ol','Sign Up'))}</button>
      <div style={{textAlign:'center',marginTop:12,fontSize:12,color:'var(--muted)'}}>
        {mode==='signin'?L('Hesabın yok mu? ',"Don't have an account? "):L('Zaten hesabın var mı? ','Already have an account? ')}
        <a style={{color:'var(--accent2)',cursor:'pointer',fontWeight:600}} onClick={()=>{setErr('');setMode(mode==='signin'?'signup':'signin');}}>{mode==='signin'?'Sign up':'Sign in'}</a>
      </div>
    </div>
  </div>);
}

/* TEŞHİS PANELİ — göstergeye dokununca açılır.
   "Sarıda kalıyor" belirtisi tek, sebepleri ayrı: cihaz sunucuya hiç bağlanamıyor,
   yazım turu takılmış, ya da bir kayıt reddediliyor olabilir. Telefonda konsol
   olmadığı için bunları ayıran tek yol ekranda okumak. Panel kapalıyken hiçbir
   maliyeti yok: günlüğe abone olmaz, render etmez. */
function SyncDiag({sync,onClose}){
  const[,bump]=useState(0);
  const[probe,setProbe]=useState('');
  const[probing,setProbing]=useState(false);
  const[copied,setCopied]=useState(false);
  useEffect(()=>slogSub(()=>bump(n=>n+1)),[]);
  useEffect(()=>{const iv=setInterval(()=>bump(n=>n+1),1000);return()=>clearInterval(iv);},[]);
  const d=sync.diag?sync.diag():{};
  const yn=v=>v?L('evet','yes'):L('hayır','no');
  const rows=[
    [L('Sunucudan veri geldi mi','Server ever reached'),d.sawServer?L('EVET','YES'):L('HAYIR — hiç bağlanılamadı','NO — never connected')],
    [L('Son sunucu yanıtı','Last server reply'),d.serverAgo>=0?(d.serverAgo+L(' sn önce',' s ago')):'—'],
    [L('Bağlantı biçimi','Transport'),d.transport==='long'?L('uzun yoklama','long-polling'):d.transport==='auto'?L('otomatik','auto'):'?'],
    [L('Veri hazır (ready)','Ready'),yn(d.ready)],
    [L('Son yazım onaylandı','Last write acknowledged'),yn(d.acked)],
    [L('Saat farkı (sunucu−cihaz)','Clock skew (server−device)'),d.skew==null?L('ölçülmedi','not measured'):(Math.round(d.skew/1000)+L(' sn',' s'))],
    [L('Yazılmamış değişiklik','Unwritten edits'),yn(d.dirty)],
    [L('Yazım uçuşta','Write in flight'),d.writing?(d.inflight+L(' sn',' s')):L('hayır','no')],
    [L('Sırada bekleyen','Queued'),yn(d.queued)],
    [L('Bekleyen yazım','Pending writes'),yn(d.pending)],
    [L('Dinleyici uyanma sayısı','Listener wakeups'),String(d.snaps||0)],
    [L('Görülen doküman','Docs seen'),String(d.docs||0)],
    [L('Bulut parça sayısı','Cloud chunks'),String(d.chunks||0)],
    [L('Veri boyutu','State size'),d.size?(Math.round(d.size/1024)+' KB'):'—'],
    [L('Durum','Status'),sync.status],
  ];
  const text=()=>rows.map(r=>r[0]+': '+r[1]).join('\n')+'\n\n'+slogText();
  const copy=()=>{
    const t=text();
    const done=()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,done);
    else{try{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();
      document.execCommand('copy');document.body.removeChild(a);}catch(e){}done();}
  };
  return(<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:220,display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
    <div onClick={e=>e.stopPropagation()} className="panel" style={{width:420,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',margin:0}}>
      <h2>{L('Senkron Teşhisi','Sync Diagnostics')}</h2>
      <div className="help" style={{marginBottom:10}}>
        {L('Gösterge sarıda kalıyorsa sebebi buradan okunur. En önemli satır ilki: sunucudan hiç veri gelmediyse sorun bağlantıdadır, uygulamanın mantığında değil.',
           'If the dot stays yellow, the reason is here. The first row matters most: if the server was never reached, the problem is the connection, not the app logic.')}
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,marginBottom:12}}><tbody>
        {rows.map(r=><tr key={r[0]}>
          <td style={{padding:'4px 0',color:'var(--muted)'}}>{r[0]}</td>
          <td style={{padding:'4px 0',textAlign:'right',fontWeight:600,color:'var(--text2)'}}>{r[1]}</td>
        </tr>)}
      </tbody></table>
      <button className="btn sec sm" style={{width:'100%'}} disabled={probing}
        onClick={async()=>{setProbing(true);setProbe(L('bakılıyor…','checking…'));
          setProbe(sync.probe?await sync.probe():'—');setProbing(false);}}>
        {L('Bağlantıyı sına','Test connection')}
      </button>
      {probe&&<div style={{marginTop:8,padding:'8px 10px',borderRadius:6,fontSize:11.5,lineHeight:1.5,
        border:'1px solid var(--border)',background:'rgba(0,0,0,.25)',color:'var(--text2)'}}>{probe}</div>}
      <div style={{marginTop:14,fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.4}}>{L('Son olaylar','Recent events')}</div>
      <pre style={{marginTop:6,maxHeight:220,overflow:'auto',padding:8,borderRadius:6,background:'rgba(0,0,0,.3)',
        border:'1px solid var(--border)',fontSize:10.5,lineHeight:1.45,whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--dim)'}}>
        {slogText()||L('(henüz olay yok)','(no events yet)')}</pre>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button className="btn sec sm" style={{flex:1}} onClick={copy}>{copied?L('Kopyalandı ✓','Copied ✓'):L('Kopyala','Copy')}</button>
        <button className="btn sm" style={{flex:1}} onClick={onClose}>{L('Kapat','Close')}</button>
      </div>
    </div>
  </div>);
}

function CloudBar({sync,onOpen}){
  const{user,status,syncErr,syncNote,clearSyncNote}=sync;
  const[diagOpen,setDiagOpen]=useState(false);
  const dot={offline:'var(--dim)',syncing:'var(--yellow)',synced:'var(--green)',error:'var(--red)'}[status];
  const label={offline:L('Çevrimdışı','Offline'),syncing:L('Senkronize ediliyor…','Syncing…'),synced:L('Senkronize','Synced'),error:L('Senkron hatası!','Sync error!')}[status];
  if(!FB())return null;
  if(!user)return<button className="btn sec sm" onClick={onOpen}>☁ {L('Giriş yap / Senkronize et','Sign in / Sync')}</button>;
  const isRules=syncErr&&(syncErr.includes('permission-denied')||syncErr.includes('PERMISSION_DENIED'));
  // invalid-argument = Firestore yazımı reddetti; pratikte her zaman boyut kaynaklı olur
  const isSize=syncErr&&(syncErr.includes('invalid-argument')||syncErr.includes('INVALID_ARGUMENT'));
  return(<div style={{width:'100%'}}>
    {/* The address is the answer to "whose data is this?", and half of one answers
        nothing — two coaches on the same machine differ by the part that was being
        clipped. So the state keeps its line and the address gets its own, wrapping
        rather than being cut off. */}
    <div className="team-sw no-italic sync-chip" title={user.email+' · uid:'+user.uid}
         onClick={()=>setDiagOpen(true)} style={{cursor:'pointer'}}>
      <span className="sync-dot" style={{background:dot,boxShadow:`0 0 6px ${dot}`}}></span>
      <span className="sync-txt no-italic">
        <b>{label}</b>
        <em>{user.email}</em>
      </span>
    </div>
    {/* The account-code line and the manual "⟳ Sync" button used to live here. They are
        intentionally hidden from the sidebar — syncing is automatic and the uid is still
        available from the status row's tooltip. */}
    {diagOpen&&<SyncDiag sync={sync} onClose={()=>setDiagOpen(false)}/>}
    {status==='error'&&syncErr&&(
      <div style={{marginTop:6,padding:'8px 10px',background:'rgba(239,68,68,.12)',border:'1px solid var(--red)',borderRadius:6,fontSize:11,color:'var(--red)',lineHeight:1.5}}>
        {isRules?(
          <>⚠ <b>{L('Firestore izin hatası.','Firestore permission error.')}</b> {L('Firebase Console → Firestore → Kurallar sekmesine gidip aşağıdaki kuralları yapıştır ve yayınla:','Go to Firebase Console → Firestore → Rules and paste + publish the following rules:')}<br/>
          <code style={{display:'block',marginTop:4,padding:4,background:'rgba(0,0,0,.3)',borderRadius:4,fontSize:10,whiteSpace:'pre',userSelect:'all'}}>{'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /kullanici_verileri/{docId} {\n      allow read: if request.auth != null && resource.data.userId == request.auth.uid;\n      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;\n      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;\n    }\n    match /users/{uid}/{doc=**} {\n      allow read, write: if request.auth.uid == uid;\n    }\n  }\n}'}</code>
          </>
        ):isSize?(
          <>⚠ <b>{L('Veri paketi Firestore\'un kabul ettiğinden büyük.','The data package is larger than Firestore accepts.')}</b> {L('Genelde sebebi duruma gömülü kalmış fotoğraf/PDF\'lerdir. Sayfayı yenile — kayıt artık küçük parçalar hâlinde gönderilir. Sürerse Backup sekmesindeki medya kurtarmayı çalıştır ya da çok büyük bir FMS PDF\'ini kaldır.',
          'This is usually caused by a photo/PDF embedded in the record. Refresh the page — saves are now sent in smaller chunks. If it persists, run the media recovery on the Backup tab or remove a very large FMS PDF.')}</>
        ):(
          <>⚠ {L('Senkronizasyon hatası:','Sync error:')} <b>{syncErr}</b><br/>{L('Sayfayı yenile veya tekrar giriş yap.','Refresh the page or sign in again.')}</>
        )}
      </div>
    )}
    {!syncErr&&syncNote&&(
      <div style={{margin:'6px 0 0',padding:'8px 10px',border:'1px solid var(--yellow)',borderRadius:6,
                   background:'rgba(250,204,21,.08)',color:'var(--yellow)',fontSize:11,lineHeight:1.5}}>
        <b>{L('Veri geri yüklendi.','Data was restored.')}</b> {syncNote}
        <a style={{display:'block',marginTop:6,color:'var(--accent2)',cursor:'pointer',fontWeight:600}}
           onClick={clearSyncNote}>{L('Tamam, anladım','Got it')}</a>
      </div>
    )}
  </div>);
}

