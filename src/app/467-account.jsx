/* =========================================================
   HESAP VE VERİLER (KVKK m.11) — Ayarlar → Gizlilik ve KVKK
   =========================================================
   • Verilerimi indir: hesabın bütün verisi tek JSON dosyası (Yedek sekmesindekiyle aynı içerik).
   • Hesabımı sil: functions/account/delete.js. Sunucu son 15 dakikada giriş ve hesabın
     e-postasının yazılmasını ister.
   • Aydınlatma metni: girişte, metnin hangi sürümünün gösterildiği users/{uid}/legal/privacy'ye yazılır.

   Silmenin sırası önemli. Önce taze bir kimlik anahtarı alınır, SONRA oturum kapatılır, en son
   sunucu o anahtarla çağrılır. Oturum açıkken silinseydi senkron, buluttan kaybolan veriyi
   cihazdaki kopyadan geri yazabilirdi; oturum kapalıyken senkron hiçbir şey yazmaz. Anahtar
   oturum kapandıktan sonra da (en fazla bir saat) geçerlidir. */

function downloadMyData(data){
  const b=new Blob([JSON.stringify(inlineLocalMedia(data),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=`coachos_verilerim_${fmt(today)}.json`;a.click();URL.revokeObjectURL(a.href);
}

/* Girişte aydınlatma metninin sürümünü kaydet (sürüm değişince yeniden). En iyi çaba. */
function usePrivacyAck(user){
  const uid=user&&user.uid;
  useEffect(()=>{
    const fb=FB();if(!uid||!fb)return;
    const ref=fb.firestore().collection('users').doc(uid).collection('legal').doc('privacy');
    ref.get().then(s=>{
      const v=PRIVACY_CONTROLLER.updated;
      if(s.exists&&(s.data()||{}).version===v)return;
      return ref.set({version:v,draft:privacyIsDraft(),shownAt:firebase.firestore.FieldValue.serverTimestamp(),lang:REPORT_LANG},{merge:true});
    }).catch(e=>console.warn('privacy ack',e));
  },[uid]);
}

const ACCOUNT_RECENT_SEC=14*60;   // sunucu 15 dk istiyor; bir dakika pay

async function reauthIfNeeded(user,password){
  const res=await user.getIdTokenResult();
  const authTime=Date.parse(res.authTime)/1000;
  if(isFinite(authTime)&&Date.now()/1000-authTime<ACCOUNT_RECENT_SEC)return;
  const prov=((user.providerData||[])[0]||{}).providerId;
  if(prov==='password'){
    if(!password)throw Object.assign(new Error(L('Güvenlik için şifreni gir.','Enter your password for security.')),{needPassword:true});
    await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email,password));
  }else{
    await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
  }
}

async function deleteMyAccount(user,confirm,password){
  await reauthIfNeeded(user,password);
  const tok=await user.getIdToken(true);
  const uid=user.uid;
  // Senkron dursun: oturumu kapat (bekleyen yazımı göndermeden), cihazdaki kopyaları temizle.
  try{localStorage.removeItem(LS_KEY(uid));}catch(e){}
  try{const sw=navigator.serviceWorker&&navigator.serviceWorker.controller;if(sw)sw.postMessage({coachos:'clear-media'});}catch(e){}
  await FB().auth().signOut();
  let r,j=null;
  try{
    r=await fetch(AI_FN_BASE+'/deleteAccount',{method:'POST',
      headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify({data:{confirm}})});
    try{j=await r.json();}catch(e){}
  }catch(e){throw new Error(L('Ağ hatası: hesap silinemedi. Tekrar giriş yapıp yeniden dene.','Network error: the account was not deleted. Sign in again and retry.'));}
  if(!r.ok||!j||j.error)throw new Error(((j&&j.error&&j.error.message)||L('Hesap silinemedi.','The account could not be deleted.'))+' '+L('Tekrar giriş yapıp yeniden deneyebilirsin; kalan kayıtlar silinir.','You can sign in again and retry; the remaining records will be deleted.'));
  return j.result;
}

function DeleteAccountModal({user,data,onClose}){
  const[confirm,setConfirm]=useState('');
  const[pw,setPw]=useState('');
  const[needPw,setNeedPw]=useState(false);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const want=String(user.email||'').trim().toLowerCase();
  const ok=confirm.trim().toLowerCase()===want&&!!want;
  const run=async()=>{
    setErr('');setBusy(true);
    try{
      await deleteMyAccount(user,confirm.trim(),pw);
      // Oturum kapandı, bu pencere kapanacak: sonucu tek bir uyarıyla bildir ve sayfayı tazele.
      alert(L('Hesabın ve bütün verilerin silindi.','Your account and all of its data have been deleted.'));
      location.reload();
    }catch(e){
      if(e&&e.needPassword){setNeedPw(true);setErr(e.message);setBusy(false);return;}
      if(!FB().auth().currentUser){alert(e.message);location.reload();return;}
      setErr(String((e&&e.message)||e));setBusy(false);
    }
  };
  return(<div className="modal-bg" onClick={()=>!busy&&onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={L('Hesabı sil','Delete account')}
         onClick={e=>e.stopPropagation()} style={{maxWidth:540}}>
      <div className="modal-head"><h2 style={{margin:0,fontSize:18,flex:1}}>{L('Hesabımı sil','Delete my account')}</h2>
        <button type="button" className="x-btn" onClick={onClose} disabled={busy} aria-label={L('Kapat','Close')}>✕</button></div>
      <div style={{padding:'18px 22px',overflowY:'auto'}}>
      <p style={{lineHeight:1.6,marginTop:0}}>{L('Bu işlem geri alınamaz. Silinenler:','This cannot be undone. What gets deleted:')}</p>
      <ul style={{lineHeight:1.6,marginTop:0}}>
        <li>{L('Bütün takımlar, sporcular, testler, programlar, takvim ve günlük yedekler','All teams, athletes, tests, programs, the calendar and the daily backups')}</li>
        <li>{L('Check-in ve antrenman günlüğü linkleri ve gelen yanıtlar; ekip üyelerinin bağlantıları','Check-in and training-log links and their answers; staff connections')}</li>
        <li>{L('Polar bağlantıları (Polar tarafında da kaldırılır) ve toplanan Polar verisi','Polar connections (removed on Polar\'s side too) and the collected Polar data')}</li>
        <li>{L('Yüklenen fotoğraflar ve dosyalar, abonelik kaydı, giriş hesabın','Uploaded photos and files, the subscription record, your sign-in account')}</li>
      </ul>
      <p style={{lineHeight:1.6}}>
        {L('Önce verilerini indirmeni öneririz:','We suggest downloading your data first:')}{' '}
        <button type="button" className="btn sec sm" onClick={()=>downloadMyData(data)} disabled={busy}>{L('Verilerimi indir','Download my data')}</button>
      </p>
      <label htmlFor="del-confirm">{L(`Onaylamak için e-posta adresini yaz: ${user.email||''}`,`Type your email to confirm: ${user.email||''}`)}</label>
      <input id="del-confirm" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off" disabled={busy}/>
      {needPw&&<>
        <label htmlFor="del-pw" style={{marginTop:10}}>{L('Şifre','Password')}</label>
        <input id="del-pw" type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" disabled={busy}/>
      </>}
      {err&&<div role="alert" style={{marginTop:10,color:'var(--red)',fontSize:13,lineHeight:1.5}}>{err}</div>}
      </div>
      <div className="modal-foot" style={{justifyContent:'flex-end',flexWrap:'wrap'}}>
        <button type="button" className="btn sec" onClick={onClose} disabled={busy}>{L('Vazgeç','Cancel')}</button>
        <button type="button" className="btn" style={{background:'var(--red)',borderColor:'var(--red)'}}
                onClick={run} disabled={!ok||busy}>
          {busy?L('Siliniyor…','Deleting…'):L('Hesabımı kalıcı olarak sil','Permanently delete my account')}
        </button>
      </div>
    </div>
  </div>);
}

/* Ayarlar → Gizlilik ve KVKK panelinin altındaki iki düğme. */
function AccountDataActions({data}){
  const[open,setOpen]=useState(false);
  const fb=FB();
  const user=fb&&fb.auth().currentUser;
  if(!user)return null;
  return(<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
    <button type="button" className="btn sec" onClick={()=>downloadMyData(data)}>{L('Verilerimi indir (JSON)','Download my data (JSON)')}</button>
    <button type="button" className="btn sec" style={{color:'var(--red)',borderColor:'var(--red)'}} onClick={()=>setOpen(true)}>
      {L('Hesabımı sil','Delete my account')}
    </button>
    {open&&<DeleteAccountModal user={user} data={data} onClose={()=>setOpen(false)}/>}
  </div>);
}
