/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — sporcunun bağlantı bloğu (Aşama 1: davet, durum, bağlantı kesme)
   Sporcu detayındaki "Profili Düzenle" (✎) penceresinde, `compact` görünümüyle durur.

   Polar hesabı sporcunun; izni de sporcu veriyor. Koç burada bir DAVET LİNKİ üretiyor
   ve sporcuya gönderiyor (WhatsApp, kopyala). Sporcu linki telefonunda açıp Polar'da
   izin verince sunucu (functions/polar, polarApi) eşleşmeyi kuruyor; bu panel durumu
   Firestore'daki `polar_links` satırından canlı okuyor. Panel hiçbir şey YAZMIYOR:
   o koleksiyon tarayıcıya kapalı, yazan yalnızca sunucu. Sporcunun senkronlanan
   verisine (`team.athletes`) de dokunulmuyor.

   Token, client secret ve Polar kullanıcı kimliğinin token'ı bu sayfaya hiç gelmiyor.
   Davet ve bağlantı kesme isteği koçun Firebase oturumuyla (ID token) imzalanıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const POLAR_FN_BASE='https://europe-west1-periodization-planner.cloudfunctions.net/polarApi';

async function polarCall(path,body){
  const fb=FB();
  const u=fb&&fb.auth&&fb.auth().currentUser;
  if(!u||u.isAnonymous)throw new Error(L('Polar bağlantısı için koç hesabıyla oturum açman gerekiyor.','Sign in with the coach account to use Polar.'));
  let tok='';
  try{tok=await u.getIdToken();}catch(e){throw new Error(L('Oturum doğrulanamadı — sayfayı yenile.','The session could not be verified — reload the page.'));}
  let r;
  try{
    r=await fetch(POLAR_FN_BASE+path,{method:'POST',
      headers:{'content-type':'application/json',authorization:'Bearer '+tok},
      body:JSON.stringify(body||{})});
  }catch(e){throw new Error(L('Ağ hatası — internet bağlantını kontrol et.','Network error — check your connection.'));}
  let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok||!j||j.error){
    const err=new Error((j&&j.error&&j.error.message)||L(`Polar servisine ulaşılamadı (${r.status}).`,`The Polar service could not be reached (${r.status}).`));
    err.code=(j&&j.error&&j.error.code)||'HTTP_'+r.status;   // ör. TOO_SOON: toplu senkron bunu "güncel" sayar
    throw err;
  }
  return j;
}

/* Bu sporcunun bağlantı satırı, canlı. undefined = yükleniyor, null = kayıt yok. */
function usePolarLink(athId){
  const[uid,setUid]=useState(()=>{const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;return u&&!u.isAnonymous?u.uid:null;});
  const[link,setLink]=useState(undefined);
  useEffect(()=>{
    const fb=FB();
    if(!fb||!fb.auth)return;
    return fb.auth().onAuthStateChanged(u=>setUid(u&&!u.isAnonymous?u.uid:null));
  },[]);
  useEffect(()=>{
    const fb=FB();
    if(!fb||!uid||!athId){setLink(null);return;}
    setLink(undefined);
    return fb.firestore().collection('polar_links')
      .where('coachUid','==',uid).where('athleteId','==',String(athId))
      .onSnapshot(s=>setLink(s.empty?null:(s.docs[0].data()||null)),
        e=>{console.warn('polar_links',e);setLink(null);});
  },[uid,athId]);
  return{uid,link};
}

const polarWhen=ms=>{
  if(!ms)return'—';
  try{return new Date(ms).toLocaleString(L('tr-TR','en-GB'),{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  catch(e){return new Date(ms).toISOString().slice(0,16).replace('T',' ');}
};

const POLAR_ERR_TXT={
  DENIED:()=>L('Sporcu izin vermedi.','The athlete declined access.'),
  INVALID_GRANT:()=>L('Polar yetkilendirme kodu geçersiz ya da süresi dolmuş.','The Polar authorisation code was invalid or expired.'),
  POLAR_USER_TAKEN:()=>L('Bu Polar hesabı başka bir sporcuya bağlı.','This Polar account is linked to another athlete.'),
  COOKIE_MISSING:()=>L('Sporcu işlemi başladığı tarayıcıda tamamlamadı.','The athlete did not finish in the browser they started in.'),
  REVOKED:()=>L('Sporcu Polar iznini kaldırmış. Yeniden bağlamak için yeni davet gönder.','The athlete revoked Polar access. Send a new invite to reconnect.'),
  SYNC_PARTIAL:()=>L('Son senkron kısmen tamamlandı (ayrıntı aşağıda).','The last sync was partial (details below).'),
  TOKEN_UNAVAILABLE:()=>L('Polar erişim bilgisi okunamadı. Bağlantıyı kesip yeniden bağla.','Polar credentials could not be read. Disconnect and reconnect.'),
};

/* Son senkronun özeti: hangi veriden kaç kayıt geldi, hangisi gelmedi. Yalnızca Polar'ın
   gönderdiği sayılar — tahmin yok. Ayrıntılı veri görünümü Aşama 4'te. */
const POLAR_KINDS=[
  ['sleep',()=>L('Uyku','Sleep'),()=>L('gece','nights')],
  ['recharge',()=>'Nightly Recharge',()=>L('gece','nights')],
  ['exercises',()=>L('Antrenman','Training'),()=>L('kayıt','sessions')],
  ['activity',()=>L('Günlük aktivite','Daily activity'),()=>L('gün','days')],
  ['cardioLoad',()=>L('Kardiyo yükü','Cardio load'),()=>L('gün','days')],
];
function polarReportLines(rep){
  if(!rep)return null;
  const ok=[],off=[],err=[];
  POLAR_KINDS.forEach(([k,lbl,unit])=>{
    const r=rep[k];if(!r)return;
    if(r.status==='ok')ok.push(`${lbl()} ${r.count||0} ${unit()}`);
    else if(r.status==='unavailable')off.push(lbl());
    else err.push(lbl());
  });
  return{ok,off,err};
}
const polarErrText=e=>e&&e.code?((POLAR_ERR_TXT[e.code]&&POLAR_ERR_TXT[e.code]())||L(`Son deneme başarısız (${e.code}).`,`Last attempt failed (${e.code}).`)):'';

function PolarConnect({ath,teamId}){
  const{uid,link}=usePolarLink(ath.id);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const[note,setNote]=useState('');
  const[invite,setInvite]=useState(null);   // {url,expiresAt} — yalnızca üretildiği oturumda görünür
  const[syncing,setSyncing]=useState(false);
  useEffect(()=>{setInvite(null);setErr('');setNote('');},[ath.id]);

  const now=Date.now();
  let status=link?link.status:'none';
  if(status==='pending'&&link.inviteExpiresAt&&link.inviteExpiresAt<now)status='expired';
  const ST={
    none:[L('Bağlı değil','Not connected'),'off'],
    pending:[L('Davet gönderildi · sporcunun izni bekleniyor','Invite sent · waiting for the athlete'),'wait'],
    expired:[L('Davetin süresi doldu','Invite expired'),'off'],
    active:[L('Bağlı','Connected'),'on'],
    disconnected:[L('Bağlantı kesildi','Disconnected'),'off'],
    revoked:[L('Sporcu izni kaldırdı','Access revoked by the athlete'),'bad'],
    error:[L('Hata','Error'),'bad'],
  };
  const[stTxt,stCls]=ST[status]||ST.none;

  const run=async fn=>{setErr('');setNote('');setBusy(true);try{await fn();}catch(e){setErr(e.message||String(e));}finally{setBusy(false);}};
  const makeInvite=()=>run(async()=>{
    if(!teamId)throw new Error(L('Takım bilgisi bulunamadı.','Team not found.'));
    const j=await polarCall('/invite',{teamId,athleteId:ath.id});
    setInvite({url:j.url,expiresAt:j.expiresAt});
  });
  const disconnect=()=>{
    const active=status==='active';
    const q=active
      ?L('Polar bağlantısı kesilsin mi? Polar tarafında da izin kaldırılır ve yeni veri gelmez. Daha önce aktarılmış veriler silinmez.','Disconnect Polar? Access is also revoked on Polar and no new data will arrive. Data already imported is kept.')
      :L('Davet iptal edilsin mi? Gönderilen link artık çalışmaz.','Cancel the invite? The link you sent will stop working.');
    if(!window.confirm(q))return;
    run(async()=>{
      await polarCall('/disconnect',{athleteId:ath.id});
      setInvite(null);
      setNote(active?L('Bağlantı kesildi.','Disconnected.'):L('Davet iptal edildi.','Invite cancelled.'));
    });
  };
  const doSync=async()=>{
    setErr('');setNote('');setSyncing(true);
    try{
      const j=await polarCall('/sync',{athleteId:ath.id});
      const lines=polarReportLines(j.report);
      setNote((j.ok?L('Senkron tamamlandı','Sync complete'):L('Senkron kısmen tamamlandı','Sync partially complete'))+(lines&&lines.ok.length?' · '+lines.ok.join(' · '):''));
    }catch(e){setErr(e.message||String(e));}
    finally{setSyncing(false);}
  };
  const inviteText=()=>L(`${ath.name||''} — Polar hesabını CoachOS'a bağlamak için bu linki aç ve Polar'da izin ver:`,`${ath.name||''} — open this link and allow access in Polar to connect your Polar account to CoachOS:`).trim();
  const copy=async()=>{
    if(!invite)return;
    let ok=false;
    try{await navigator.clipboard.writeText(invite.url);ok=true;}
    catch(e){
      try{const ta=document.createElement('textarea');ta.value=invite.url;ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();ok=document.execCommand('copy');document.body.removeChild(ta);}catch(e2){ok=false;}
    }
    setNote(ok?L('Link kopyalandı.','Link copied.'):L('Kopyalanamadı — linki elle seç.','Could not copy — select the link manually.'));
  };
  const share=async()=>{
    if(!invite)return;
    if(navigator.share){try{await navigator.share({title:'CoachOS · Polar',text:inviteText(),url:invite.url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
    window.open('https://wa.me/?text='+encodeURIComponent(inviteText()+' '+invite.url),'_blank','noopener');
  };

  if(!uid)return(<div className="pl-mini"><label>{L('Polar bağlantısı','Polar connection')}</label>
    <div className="pl-mini-box"><div className="pl-mini-sub">{L('Polar bağlantısı için koç hesabıyla oturum aç.','Sign in with the coach account to connect Polar.')}</div></div></div>);

  const canInvite=status!=='active';
  const canCancel=status==='active'||status==='pending'||status==='expired'||status==='revoked'||status==='error';
  const rl=link&&link.lastSyncReport?polarReportLines(link.lastSyncReport):null;
  const btns=<div className="pl-btns">
      {status==='active'&&<button className="btn sm" disabled={busy||syncing} onClick={doSync}>
        {syncing?L('Senkronize ediliyor…','Syncing…'):L('Verileri Senkronize Et','Sync Data')}</button>}
      {canInvite&&<button className="btn sm" disabled={busy} onClick={makeInvite}>
        {status==='pending'||status==='expired'?L('Yeni davet linki oluştur','Create a new invite link')
          :status==='revoked'||status==='error'?L('Yeniden bağla (yeni davet)','Reconnect (new invite)')
          :L('Polar Hesabını Bağla','Connect Polar Account')}</button>}
      {canCancel&&<button className="btn sm sec" disabled={busy} onClick={disconnect}>
        {status==='active'?L('Polar Bağlantısını Kes','Disconnect Polar'):L('Daveti iptal et','Cancel invite')}</button>}
    </div>;
  const inviteBox=invite&&<div className="pl-invite">
      <div className="pl-ik">{L('Sporcuya gönderilecek link','Link to send to the athlete')} · {L('geçerlilik','valid until')} {polarWhen(invite.expiresAt)}</div>
      <input readOnly value={invite.url} onFocus={e=>e.target.select()} aria-label={L('Davet linki','Invite link')}/>
      <div className="pl-btns">
        <button className="btn sm" onClick={share}>{L('Paylaş','Share')}</button>
        <button className="btn sm sec" onClick={copy}>{L('Kopyala','Copy')}</button>
      </div>
    </div>;
  /* Durum rozeti + tek satır özet, altında düğmeler. */
  const meta=link===undefined?[]:[
    status==='active'&&link.polarAccount&&link.polarAccount.name,
    status==='active'&&L(`bağlandı ${polarWhen(link.connectedAt)}`,`connected ${polarWhen(link.connectedAt)}`),
    link&&link.lastSyncAt&&L(`son senkron ${polarWhen(link.lastSyncAt)}`,`last sync ${polarWhen(link.lastSyncAt)}`),
    (status==='pending'||status==='expired')&&L(`davet geçerliliği ${polarWhen(link.inviteExpiresAt)}`,`invite valid until ${polarWhen(link.inviteExpiresAt)}`),
  ].filter(Boolean);
  const warn=[link&&link.lastError&&(status!=='active'||link.lastError.code==='SYNC_PARTIAL')&&polarErrText(link.lastError),
    rl&&rl.err.length>0&&L(`Alınamayan: ${rl.err.join(', ')}`,`Failed: ${rl.err.join(', ')}`)].filter(Boolean);
  /* Faz 5: Polar bağlantıları kulüp sahibinin hesabına bağlı; başka bir kulübü açan üye yönetemez. */
  if(CLUB_MEMBER)return(<div className="pl-mini"><label>{L('Polar bağlantısı','Polar connection')}</label>
    <div style={{fontSize:12,color:'var(--muted)'}}>{L('Polar bağlantılarını kulüp sahibi yönetir.','Polar connections are managed by the club owner.')}</div></div>);
  return(<div className="pl-mini">
    <label>{L('Polar bağlantısı','Polar connection')}</label>
    <div className="pl-mini-box">
      <div className="pl-mini-top">
        <span className={'pl-st pl-'+stCls}>{link===undefined?L('Yükleniyor…','Loading…'):stTxt}</span>
        {meta.length>0&&<span className="pl-mini-sub">{meta.join(' · ')}</span>}
      </div>
      {warn.map((t,i)=><div key={i} className="pl-mini-sub pl-mini-warn">{t}</div>)}
      {inviteBox}
      {btns}
      {err&&<div className="pl-err" role="alert">{err}</div>}
      {note&&<div className="pl-note" role="status">{note}</div>}
    </div>
    <div className="help">{status==='active'
      ?L('Polar verisi ayrı kaydedilir; sporcunun mevcut kayıtlarının üzerine yazılmaz.','Polar data is stored separately and never overwrites the athlete\'s existing records.')
      :L('Linki sporcuya gönder; sporcu kendi telefonunda açıp Polar\'da izin verince burada "Bağlı" görünür.','Send the link to the athlete; once they open it on their phone and allow access in Polar, this shows "Connected".')}</div>
  </div>);
}
