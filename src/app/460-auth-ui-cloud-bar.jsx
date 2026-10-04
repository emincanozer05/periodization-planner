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

function LoginPage({sync}){
  const[tab,setTab]=useState('google'); // google|email
  const[isSignup,setIsSignup]=useState(false);
  const[email,setEmail]=useState('');
  const[pw,setPw]=useState('');
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);
  const[showLogin,setShowLogin]=useState(false);
  const[lpPage,setLpPage]=useState('home');
  const goPage=(p)=>{setLpPage(p);window.scrollTo({top:0,behavior:'smooth'});};
  const openLogin=()=>{setErr('');sync.clearAuthErr&&sync.clearAuthErr();setShowLogin(true);};
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
  return(
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-logo"><img className="lp-logo-img" src="logo-wordmark.png" alt="CoachOS"/></div>
        <div className="lp-links">
          <a onClick={()=>goPage('platform')} style={{color:lpPage==='platform'?'var(--accent)':''}}>{L('Platform','Platform')}</a>
          <a onClick={()=>goPage('workflow')} style={{color:lpPage==='workflow'?'var(--accent)':''}}>{L('İş Akışı','Workflow')}</a>
          <a onClick={()=>goPage('analytics')} style={{color:lpPage==='analytics'?'var(--accent)':''}}>{L('Analitik','Analytics')}</a>
          <a onClick={()=>goPage('pricing')} style={{color:lpPage==='pricing'?'var(--accent)':''}}>{L('Fiyatlandırma','Pricing')}</a>
        </div>
        <div className="lp-actions">
          <button className="lp-btn ghost" onClick={openLogin}>{L('Giriş yap','Log in')}</button>
          <button className="lp-btn accent" onClick={openLogin}>{L('Demo talep et','Book a demo')}</button>
        </div>
      </nav>
      {lpPage==='home'&&(<div className="lp-hero">
        <div className="lp-hero-l">
          <div className="auth-badge"><span className="dot"></span>{L('Yüksek performans ekipleri için tasarlandı','Built for high-performance staff')}</div>
          <h1 className="auth-h1">{L('Kuvvet ve kondisyon için Performans İşletim Sistemi.','Performance OS for strength & conditioning.')}</h1>
          <p className="auth-sub">{L('Periyotlanmış antrenmanı programla, her sporcuya ilet ve yük, hız ile hazır oluşu veri geldikçe oku — hepsi tek sistemde.','Program periodized training, deliver it to every athlete, and read load, velocity and readiness as the data lands — all in one system.')}</p>
          <div className="lp-cta">
            <button className="lp-btn accent" onClick={openLogin}>{L('Demo talep et','Book a demo')}</button>
            <button className="lp-btn ghost" onClick={()=>goPage('analytics')}>{L('Panele göz at','See the dashboard')}</button>
          </div>
        </div>
        <div className="lp-hero-r">
          <div className="auth-mock">
            <div className="auth-mock-top">
              <div className="auth-mock-dots"><i></i><i></i><i></i></div>
              <div className="auth-mock-tag">{L('forge · hazır oluş','forge · readiness')}</div>
            </div>
            <div className="auth-mock-stats">
              <div className="auth-stat"><div className="k">{L('Akut Yük','Acute Load')}</div><div className="v">847<small>▲4%</small></div></div>
              <div className="auth-stat"><div className="k">{L('A:K Oranı','A:C Ratio')}</div><div className="v">1.08</div></div>
              <div className="auth-stat"><div className="k">{L('Hazır','Ready')}</div><div className="v">22/24</div></div>
            </div>
            <div className="auth-mock-bars">
              {[38,46,52,64,92,58,70,44,60,50].map((h,i)=><span key={i} className={i===4?'on':''} style={{height:h+'%'}}/>)}
            </div>
          </div>
        </div>
      </div>)}
      {lpPage==='platform'&&(<div className="lp-section"><div className="lp-sec-inner">
        <div className="lp-sec-label">{L('Platform','Platform')}</div>
        <h2 className="lp-sec-h2">{L('Antrenman kadronuzun ihtiyaç duyduğu her şey','Everything your coaching staff needs')}</h2>
        <p className="lp-sec-sub">{L('CoachOS periyotlama, yük yönetimi ve sporcu iletişimini tek bir bağlı iş akışında birleştirir.','CoachOS brings periodization, load management, and athlete communication into a single connected workflow.')}</p>
        <div className="lp-features">
          {[
            {icon:'📅',title:L('Sezon Planlayıcı','Season Planner'),desc:L('Çok fazlı periyotlanmış programlar kur. Tüm sezon için mezosikluları, yükleme örüntülerini ve antrenman hedeflerini tanımla.','Build multi-phase periodized programs. Define mesocycles, loading patterns, and training goals for the whole season.')},
            {icon:'📊',title:L('Yük Takibi','Load Monitoring'),desc:L('Akut ve kronik antrenman yükünü gerçek zamanlı izle. ACWR, monotonluk ve zorlanma — hepsi sporcu seans verisinden.','Track acute and chronic workload in real time. ACWR, monotony, and strain — all from athlete session data.')},
            {icon:'👥',title:L('Sporcu Profilleri','Athlete Profiles'),desc:L('Tüm kadronuzu yönetin. Sakatlıkları, sağlık trendlerini, test sonuçlarını ve bireysel antrenman geçmişini takip edin.','Manage your full roster. Track injuries, wellness trends, test results, and individual training history.')},
            {icon:'🧪',title:L('Test ve Değerlendirme','Testing & Assessment'),desc:L('Test protokollerini kaydedin ve görselleştirin. Otomatik karşılaştırmalarla zaman içindeki ilerlemeyi izleyin.','Log and visualize testing protocols. Track progress over time with automatic comparisons.')},
            {icon:'📚',title:L('Egzersiz Kütüphanesi','Exercise Library'),desc:L('Takımınızın egzersiz veritabanını oluşturun. Tipe, kas grubuna, zorluğa ve hareket örüntüsüne göre düzenleyin.','Build your team\'s exercise database. Organize by type, muscle group, difficulty, and movement pattern.')},
            {icon:'🤖',title:L('Yapay Zeka Koç','AI Coach'),desc:L('Planlama kararları, antrenman tasarımı ve sporcu yönetimi için yerleşik yapay zeka asistanınızdan anlık destek alın.','Get instant support for planning decisions, training design, and athlete management from your built-in AI assistant.')},
          ].map(f=><div key={f.title} className="lp-feat-card"><div className="lp-feat-icon">{f.icon}</div><div className="lp-feat-title">{f.title}</div><div className="lp-feat-desc">{f.desc}</div></div>)}
        </div>
        <div className="lp-cta" style={{marginTop:40}}><button className="lp-btn accent" onClick={openLogin}>{L('Başla','Get started')}</button><button className="lp-btn ghost" onClick={()=>goPage('pricing')}>{L('Fiyatlara bak','See pricing')}</button></div>
      </div></div>)}
      {lpPage==='workflow'&&(<div className="lp-section"><div className="lp-sec-inner">
        <div className="lp-sec-label">{L('İş Akışı','Workflow')}</div>
        <h2 className="lp-sec-h2">{L('Plandan performansa, tek sistemde','From plan to performance, in one system')}</h2>
        <p className="lp-sec-sub">{L('CoachOS koçluk sürecinin her adımını birbirine bağlar — hiçbir şey atlanmaz.','CoachOS connects every step of the coaching process — so nothing falls through the cracks.')}</p>
        <div className="lp-steps">
          {[
            {n:'01',title:L('Takımını kur','Set up your team'),desc:L('Takım profilini oluştur, kadronu ekle ve sezon tarihlerini ayarla. Beş dakikadan kısa sürer.','Create your team profile, add your roster, and configure your season dates. Takes less than five minutes.')},
            {n:'02',title:L('Sezonunu planla','Plan your season'),desc:L('Fazlar, mezosikluslar ve haftalık yükleme hedefleriyle periyotlanmış bir program kur. CoachOS bunu otomatik olarak takvimine işler.','Build a periodized program with phases, mesocycles, and weekly loading targets. CoachOS maps it across your calendar automatically.')},
            {n:'03',title:L('Günlük seansları programla','Program daily sessions'),desc:L('Antrenmanları günlere ata, set ve yükleri takip et, seans RPE\'sini kaydet. Sporcular planlarını anında alır.','Assign workouts to days, track sets and loads, and log session RPE. Athletes receive their plan instantly.')},
            {n:'04',title:L('Yükü ve hazır oluşu izle','Monitor load & readiness'),desc:L('Seanslar geldikçe ACWR, monotonluk ve sağlık verilerinin gerçek zamanlı güncellendiğini gör. Riski sakatlığa dönüşmeden fark et.','See ACWR, monotony, and wellness data update in real time as sessions come in. Spot risk before it becomes injury.')},
          ].map(s=><div key={s.n} className="lp-step"><div className="lp-step-n">{s.n}</div><div><div className="lp-step-title">{s.title}</div><div className="lp-step-desc">{s.desc}</div></div></div>)}
        </div>
        <div className="lp-cta" style={{marginTop:40}}><button className="lp-btn accent" onClick={openLogin}>{L('Ücretsiz başla','Start free')}</button></div>
      </div></div>)}
      {lpPage==='analytics'&&(<div className="lp-section"><div className="lp-sec-inner">
        <div className="lp-sec-label">{L('Analitik','Analytics')}</div>
        <h2 className="lp-sec-h2">{L('Karar aldıran veriler','Data that actually informs decisions')}</h2>
        <p className="lp-sec-sub">{L('Kadronuzun takip ettiği her metrik, gerçek zamanlı görünür. Ne tablo ne dışa aktarma — sadece cevaplar.','Every metric your staff tracks, surfaced in real time. No spreadsheets, no exports — just answers.')}</p>
        <div className="lp-analytics-grid">
          <div className="lp-analytics-main">
            <div className="auth-mock" style={{maxWidth:'100%'}}>
              <div className="auth-mock-top"><div className="auth-mock-dots"><i></i><i></i><i></i></div><div className="auth-mock-tag">{L('yük takibi · 24. hafta','load monitoring · week 24')}</div></div>
              <div className="auth-mock-stats">
                <div className="auth-stat"><div className="k">{L('Akut Yük','Acute Load')}</div><div className="v">847<small>▲4%</small></div></div>
                <div className="auth-stat"><div className="k">{L('Kronik Yük','Chronic Load')}</div><div className="v">783</div></div>
                <div className="auth-stat"><div className="k">{L('A:K Oranı','A:C Ratio')}</div><div className="v" style={{color:'#10b981'}}>1.08</div></div>
                <div className="auth-stat"><div className="k">{L('Monotonluk','Monotony')}</div><div className="v">1.4</div></div>
                <div className="auth-stat"><div className="k">{L('Zorlanma','Strain')}</div><div className="v">1185</div></div>
                <div className="auth-stat"><div className="k">{L('Hazır','Ready')}</div><div className="v">22/24</div></div>
              </div>
              <div className="auth-mock-bars" style={{height:100}}>
                {[38,46,52,64,92,58,70,44,60,50,72,80,62,55].map((h,i)=><span key={i} className={i===4||i===10?'on':''} style={{height:h+'%'}}/>)}
              </div>
            </div>
          </div>
          <div className="lp-analytics-aside">
            {[
              {label:L('ACWR Takibi','ACWR Monitoring'),desc:L('Takımının ne zaman aşırı yüklendiğini ya da az yüklendiğini tam olarak bil.','Know exactly when your team is overreached or underloaded.')},
              {label:L('Sağlık Trendleri','Wellness Trends'),desc:L('Kadro genelinde uyku, yorgunluk, ruh hali ve kas ağrısını takip et.','Track sleep, fatigue, mood, and soreness across the roster.')},
              {label:L('Antrenman Monotonluğu','Training Monotony'),desc:L('Durağanlığa yol açmadan önce çok az çeşitliliğe sahip haftaları belirle.','Identify weeks with too little variation before they cause stagnation.')},
              {label:L('Sporcu Hazır Oluşu','Athlete Readiness'),desc:L('Kimin sıkı antrenmana hazır, kimin yükünün azaltılması gerektiğini gör.','See who is ready to train hard and who needs a reduction.')},
            ].map(m=><div key={m.label} className="lp-metric-item"><div className="lp-metric-dot"></div><div><div className="lp-metric-title">{m.label}</div><div className="lp-metric-desc">{m.desc}</div></div></div>)}
          </div>
        </div>
        <div className="lp-cta" style={{marginTop:40}}><button className="lp-btn accent" onClick={openLogin}>{L('Paneline eriş','Access your dashboard')}</button></div>
      </div></div>)}
      {lpPage==='pricing'&&(<div className="lp-section"><div className="lp-sec-inner">
        <div className="lp-sec-label">{L('Fiyatlandırma','Pricing')}</div>
        <h2 className="lp-sec-h2">{L('Basit, şeffaf fiyatlandırma','Simple, transparent pricing')}</h2>
        <p className="lp-sec-sub">{L('Ücretsiz başla. Hazır olduğunda büyüt. Gizli ücret yok, sporcu başına koltuk maliyeti yok.','Start free. Scale when you\'re ready. No hidden fees, no per-athlete seat costs.')}</p>
        <div className="lp-plans">
          {[
            {name:L('Başlangıç','Starter'),price:L('Ücretsiz','Free'),desc:L('Yeni başlayan bireysel koçlar için mükemmel.','Perfect for individual coaches getting started.'),features:[L('1 takım','1 team'),L('15 sporcuya kadar','Up to 15 athletes'),L('Sezon planlayıcı','Season planner'),L('Yük takibi','Load monitoring'),L('Egzersiz kütüphanesi','Exercise library')],cta:L('Başla','Get started'),accent:false},
            {name:L('Pro','Pro'),price:'$49',period:L('/ay','/mo'),desc:L('Birden fazla takımı yöneten antrenman kadroları için.','For coaching staff managing multiple teams.'),features:[L('Sınırsız takım','Unlimited teams'),L('Sınırsız sporcu','Unlimited athletes'),L('Başlangıç\'taki her şey','Everything in Starter'),L('Analitik paneli','Analytics dashboard'),L('Yapay Zeka Koç','AI Coach'),L('Öncelikli destek','Priority support')],cta:L('Pro denemesini başlat','Start Pro trial'),accent:true},
            {name:L('Kurumsal','Enterprise'),price:L('Özel','Custom'),desc:L('Kulüpler ve yüksek performans enstitüleri için.','For clubs and high-performance institutes.'),features:[L('Pro\'daki her şey','Everything in Pro'),L('Özel entegrasyonlar','Custom integrations'),L('Özel katılım süreci','Dedicated onboarding'),L('SLA ve çalışma süresi garantisi','SLA & uptime guarantee'),L('Beyaz etiket seçenekleri','White-label options')],cta:L('Bize ulaşın','Contact us'),accent:false},
          ].map(p=><div key={p.name} className={`lp-plan-card${p.accent?' lp-plan-accent':''}`}>
            <div className="lp-plan-name">{p.name}</div>
            <div className="lp-plan-price">{p.price}{p.period&&<span className="lp-plan-period">{p.period}</span>}</div>
            <div className="lp-plan-desc">{p.desc}</div>
            <ul className="lp-plan-features">{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul>
            <button className={`lp-btn${p.accent?' accent':' ghost'}`} style={{width:'100%',marginTop:24}} onClick={openLogin}>{p.cta}</button>
          </div>)}
        </div>
      </div></div>)}
      {showLogin&&(
      <div className="lp-modal-bg" onClick={()=>setShowLogin(false)}>
        <div className="panel" style={{width:400,maxWidth:'100%',margin:0}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <img src="logo.png" alt="CoachOS" style={{height:52,marginBottom:10}}/>
            <div style={{fontWeight:700,fontSize:22,color:'var(--text)'}}>{L('Koçluk İşletim Sistemi','The Coaching Operating System')}</div>
            <div style={{fontSize:13,color:'var(--dim)',marginTop:6}}>{L('Verilerine erişmek için hesabınla giriş yap','Sign in to your account to access your data')}</div>
          </div>
          <GoogleBtn onClick={googleLogin} busy={busy&&tab==='google'}/>
          {(tab==='google'&&(err||sync.authErr))&&<div style={{color:'var(--red)',fontSize:12,marginTop:10}}>{err||sync.authErr}</div>}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'16px 0',color:'var(--dim)',fontSize:12}}>
            <div style={{flex:1,height:1,background:'var(--border)'}}/>
            <span>{L('veya','or')}</span>
            <div style={{flex:1,height:1,background:'var(--border)'}}/>
          </div>
          {tab==='google'?(
            <button className="btn sec" style={{width:'100%'}} onClick={()=>{setTab('email');setErr('');}}>{L('E-posta / Şifre ile Giriş','Sign in with Email / Password')}</button>
          ):(
            <>
              <label>{L('E-posta','Email')}</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="ornek@mail.com"/>
              <label style={{marginTop:10}}>{L('Şifre','Password')} {isSignup&&<span style={{color:'var(--dim)',textTransform:'none'}}>{L('(en az 6 karakter)','(at least 6 characters)')}</span>}</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
                autoComplete={isSignup?'new-password':'current-password'}
                onKeyDown={e=>{if(e.key==='Enter')emailSubmit();}}
                placeholder="••••••"/>
              {err&&<div style={{color:'var(--red)',fontSize:12,marginTop:8}}>{err}</div>}
              <button className="btn" style={{width:'100%',marginTop:12}} disabled={busy} onClick={emailSubmit}>
                {busy?'…':(isSignup?L('Kayıt Ol','Sign Up'):L('Giriş Yap','Sign In'))}
              </button>
              <div style={{textAlign:'center',marginTop:10,fontSize:12,color:'var(--dim)'}}>
                {isSignup?L('Zaten hesabın var mı? ','Already have an account? '):L('Hesabın yok mu? ','Don\'t have an account? ')}
                <a style={{color:'var(--accent2)',cursor:'pointer',fontWeight:600}} onClick={()=>{setErr('');setIsSignup(!isSignup);}}>
                  {isSignup?L('Giriş yap','Sign in'):L('Kayıt ol','Sign up')}
                </a>
              </div>
              <button className="btn sec" style={{width:'100%',marginTop:8,fontSize:12}} onClick={()=>{setTab('google');setErr('');}}>{L('← Geri','← Back')}</button>
            </>
          )}
        </div>
      </div>
      )}
      <LanguageSelector/>
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

