/* =========================================================
   ABONELİK — durum, erişim kuralı, üst çubuktaki uyarı
   =========================================================
   Tasarım: docs/yayina-hazirlik-plani.md §3. `billing/{uid}` belgesini yalnızca sunucu yazar
   (functions/billing/entitlement.js); uygulama okur ve gösterir.

   `config/billing.enforced` kapalıyken (bugünkü durum) erişim her zaman tam: ekranda hiçbir şey
   değişmez, yalnızca belge açılır. Ödeme sağlayıcısı bağlanınca bayrak Firebase Console'dan açılır.

   Erişim yoksa uygulama SALT OKUNUR olur (690-app.jsx → setData kapısı): veri görünür, dışa
   aktarılabilir, hesap silinebilir; düzenleme ve yapay zekâ kapalıdır. Veri asla silinmez. */

/* <billing-access> — functions/billing/entitlement.js → accessFor ile birebir aynı sonuç
   (functions/test/billing.test.js karşılaştırır). Bu bölüme yalnızca düz JavaScript yazılır. */
function billingAccess(b,now,cfg){
  var DAY=24*3600*1000,GRACE_DAYS=7;
  var ms=function(v){
    if(v==null||v==='')return null;
    if(typeof v==='number')return v;
    if(typeof v.toMillis==='function')return v.toMillis();
    if(v instanceof Date)return v.getTime();
    var p=Date.parse(v);return isFinite(p)?p:null;
  };
  var enforced=!!(cfg&&cfg.enforced);
  var t=Number(now);
  var s=(b&&b.status)||'none';
  var left=function(end){return end==null?null:Math.max(0,Math.ceil((end-t)/DAY));};
  var r,end;
  if(s==='comp')r={full:true,reason:'comp',daysLeft:null};
  else if(s==='active'){end=ms(b.currentPeriodEnd);r={full:true,reason:'active',daysLeft:left(end)};}
  else if(s==='trialing'){end=ms(b.trialEndsAt);
    r=end!=null&&t<end?{full:true,reason:'trial',daysLeft:left(end)}:{full:false,reason:'trial_ended',daysLeft:0};}
  else if(s==='past_due'){end=ms(b.currentPeriodEnd);var until=end==null?null:end+GRACE_DAYS*DAY;
    r=until!=null&&t<until?{full:true,reason:'grace',daysLeft:left(until)}:{full:false,reason:'expired',daysLeft:0};}
  else if(s==='canceled'){end=ms(b.currentPeriodEnd);
    r=end!=null&&t<end?{full:true,reason:'canceled_until_end',daysLeft:left(end)}:{full:false,reason:'expired',daysLeft:0};}
  else if(s==='expired')r={full:false,reason:'expired',daysLeft:0};
  else r={full:false,reason:'none',daysLeft:0};
  if(!r.full&&!enforced)r=Object.assign({},r,{full:true,reason:'not_enforced'});
  return Object.assign({status:s},r);
}
/* </billing-access> */

const BILLING_FULL={status:'none',full:true,reason:'loading',daysLeft:null};

/* Oturum açan kullanıcının abonelik durumu. Sunucu çağrısı belgeyi (yoksa) açar; sonra
   belge ve config/billing canlı dinlenir: ödeme gelince sayfa yenilenmeden açılır.
   Ağ ya da sunucu hatasında erişim TAM kalır — kimse bizim hatamız yüzünden kilitlenmez. */
/* ws: açık kulüp (Faz 5). Üye, kulüp sahibinin aboneliğiyle çalışır: billing/{ws} okunur.
   Kendi hesabında (ya da eski düzende) ws = kendi uid'i. */
function useBilling(user,ws){
  const[billing,setBilling]=useState(null);
  const[cfg,setCfg]=useState({});
  const[ready,setReady]=useState(false);
  const[tick,setTick]=useState(0);
  const uid=user&&user.uid;
  const bws=ws||uid;
  useEffect(()=>{
    setBilling(null);setCfg({});setReady(false);
    const fb=FB();
    if(!uid||!fb)return;
    let dead=false;const offs=[];
    (async()=>{
      try{
        const tok=await fb.auth().currentUser.getIdToken();
        await fetch(AI_FN_BASE+'/billingStatus',{method:'POST',
          headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify({data:{}})});
      }catch(e){console.warn('billingStatus',e);}
      if(dead)return;
      try{
        const fs=fb.firestore();
        offs.push(fs.collection('billing').doc(bws).onSnapshot(
          s=>{setBilling(s.exists?s.data():null);setReady(true);},
          e=>{console.warn('billing',e);setReady(true);}));
        offs.push(fs.collection('config').doc('billing').onSnapshot(
          s=>setCfg(s.exists?(s.data()||{}):{}),
          e=>console.warn('billing config',e)));
      }catch(e){console.warn('billing listen',e);setReady(true);}
    })();
    return()=>{dead=true;offs.forEach(f=>{try{f();}catch(e){}});};
  },[uid,bws]);
  // Deneme/dönem gece yarısı biterse açık sekme de görsün: saatte bir yeniden hesapla.
  useEffect(()=>{const id=setInterval(()=>setTick(x=>x+1),3600*1000);return()=>clearInterval(id);},[]);
  const access=useMemo(()=>ready?billingAccess(billing,Date.now(),cfg):BILLING_FULL,[billing,cfg,ready,tick]);
  return{billing,access,enforced:!!cfg.enforced,ready};
}

/* Üst çubuğun altındaki tek satır. Bayrak kapalıyken ya da söylenecek bir şey yokken çizilmez. */
function BillingBanner({bill}){
  const{access,enforced}=bill;
  if(!enforced||!access)return null;
  const d=access.daysLeft;
  let tone='',msg='';
  if(!access.full){
    tone='red';
    msg=access.reason==='trial_ended'
      ?L('Deneme süren bitti. Verilerin duruyor; düzenlemek için abone ol. Bu arada verilerini görebilir ve dışa aktarabilirsin.',
         'Your trial has ended. Your data is safe; subscribe to keep editing. Meanwhile you can still view and export it.')
      :L('Aboneliğin sona erdi. Uygulama salt okunur: verilerini görebilir ve dışa aktarabilirsin.',
         'Your subscription has ended. The app is read-only: you can still view and export your data.');
  }else if(access.reason==='trial'&&d!=null&&d<=14){
    tone=d<=3?'yellow':'';
    msg=L(`Ücretsiz deneme: ${d} gün kaldı.`,`Free trial: ${d} day${d===1?'':'s'} left.`);
  }else if(access.reason==='grace'){
    tone='yellow';
    msg=L(`Son ödeme alınamadı. ${d} gün içinde kart bilgini güncellemezsen uygulama salt okunur olur.`,
          `Your last payment failed. Update your card within ${d} day${d===1?'':'s'} or the app becomes read-only.`);
  }else if(access.reason==='canceled_until_end'&&d!=null){
    tone='';
    msg=L(`Aboneliğin iptal edildi; ${d} gün daha tam erişimin var.`,`Your subscription is canceled; full access for ${d} more day${d===1?'':'s'}.`);
  }
  if(!msg)return null;
  const col=tone==='red'?'var(--red)':tone==='yellow'?'var(--yellow)':'var(--accent2)';
  return(<div role="status" className="billing-banner" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',
      padding:'8px 14px',borderBottom:`1px solid ${col}`,color:col,fontSize:12.5,lineHeight:1.5,background:'var(--panel)'}}>
    <span style={{flex:'1 1 240px'}}>{msg}</span>
    {/* Ödeme sağlayıcısı bağlanınca (yol haritası adım 5) bu düğme ödeme sayfasını açar. */}
    <button className="btn sm" disabled title={L('Ödeme yakında açılıyor','Payments open soon')}>
      {L('Abone ol','Subscribe')}
    </button>
  </div>);
}
