/* =========================================================
   SENKRON BAYRAKLARI VE UZAKTAN KAPATMA ANAHTARI (senkron hız planı R0 → G2, G3, G5)
   =========================================================
   Senkronu hızlandıran her yeni davranış kendi bayrağının arkasında, varsayılan KAPALI gelir
   (docs/senkron-hiz-plani.md). Bayrak kapalıyken davranış bugünküyle birebir aynıdır.

   Bir bayrak açık sayılır ancak:
     1. adı SYNC_FLAGS'ta tanımlıysa (tanımsız ad her zaman kapalı),
     2. bulut ayarı (config/sync) okunduysa: ayar duyulmadan hiçbir şey açılmaz — kapatma
        anahtarını duyamayan bir cihaz yeni davranışı çalıştırmasın,
     3. ayarda kapatılmamışsa: `off: true` hepsini, `kill: {ad: true}` birini kapatır. Kapatma her
        şeyi yener (cihazdaki açma dahil) ve canlıdır: uygulama yeniden yüklenmeden, saniyeler içinde,
     4. bu oturumda kendiliğinden kapanmamışsa (syncFlagTrip: onarım ağı bir tutarsızlık gördü),
     5. ve ya bulut ayarı herkese açmışsa (`flags: {ad: true}`) ya da bu cihazda açılmışsa
        (adres: ?syncflag=ad1,ad2 açar, ?syncflag=-ad kapatır; cihaza kaydedilir).

   config/sync yalnızca Firebase Console'dan yazılır (kurallar: okuma giriş yapmış herkese, yazma kimseye).
   Örnek: { off: false, kill: { echoSkip: true }, flags: {} }
   Bu parça JSX içermez: sync-test.js 440–460'ı düz JS çalıştırır. */
const SYNC_FLAGS={
  /* ad: 'ne yapar' — R2 ve sonrasının adımları buraya eklenir. */
  metaSkip:'Hiçbir belgenin değişmediği dinleyici olaylarında (yazım onayı, önbellek→sunucu) ekran yeniden kurulmaz (468 → smController)',
  echoSkip:'Değişen belgelerin hepsi bu cihazın son gönderdiğiyle aynıysa (kendi yazımının yankısı) ekran yeniden kurulmaz (468 → smController)',
  pipeWrite:'Yazımlar bir öncekinin sunucu onayını beklemeden hemen Firestore\'a verilir; reddedilen paket en güncel hâlden yeniden yazılır (468 → smController.send)',
};
const SYNC_FLAG_LS='coachos_syncflag_';
let _syncCfg={state:'unknown',off:false,kill:{},flags:{}};   // state: 'unknown' | 'ok' | 'error'
const _syncTrip={};                                          // ad → sebep (bu oturumda kendiliğinden kapandı)
const _syncObj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
/* Kapatma GENİŞ yorumlanır, açma KATI: Console'da elle yazılan `off: "true"` ya da `kill: ["ad"]` de
   kapatır (şüphede kapalı); açmak için yalnızca gerçek `true` geçer. */
const _syncOn=v=>v!==undefined&&v!==null&&v!==false&&v!==0&&v!==''&&v!=='false';
function syncCfgSet(d,state){
  const x=_syncObj(d),kill={};
  if(Array.isArray(x.kill))x.kill.forEach(n=>{if(typeof n==='string')kill[n]=true;});
  else{const k=_syncObj(x.kill);Object.keys(k).forEach(n=>{if(_syncOn(k[n]))kill[n]=true;});}
  _syncCfg={state,off:_syncOn(x.off),kill,flags:{..._syncObj(x.flags)}};
}
function syncFlag(name){
  if(!Object.prototype.hasOwnProperty.call(SYNC_FLAGS,name))return false;
  const c=_syncCfg;
  if(c.state!=='ok'||c.off===true||c.kill[name]===true)return false;
  if(_syncTrip[name])return false;
  if(c.flags[name]===true)return true;
  try{return localStorage.getItem(SYNC_FLAG_LS+name)==='1';}catch(e){return false;}
}
/* Onarım ağı (G5): yeni yolun sonucu tam hesapla tutmadı → bu oturumda o bayrak kapanır, cihazdaki
   açma silinir (bir dahaki açılışta da kapalı başlasın) ve günlüğe yazılır. Veri tam hesaptan gelir. */
function syncFlagTrip(name,why){
  if(_syncTrip[name])return;
  _syncTrip[name]=String(why||'?');
  try{localStorage.removeItem(SYNC_FLAG_LS+name);}catch(e){}
  try{slog('bayrak kendiliğinden kapandı: '+name,_syncTrip[name]);}catch(e){}
}
/* Adresle bu cihazda aç/kapat: ?syncflag=a,b  ?syncflag=-a */
function syncFlagsFromUrl(search){
  const m=/[?&]syncflag=([^&#]*)/.exec(search||'');
  if(!m)return[];
  const done=[];
  decodeURIComponent(m[1]).split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>{
    const off=s.charAt(0)==='-',name=off?s.slice(1):s;
    if(!Object.prototype.hasOwnProperty.call(SYNC_FLAGS,name))return;
    try{if(off)localStorage.removeItem(SYNC_FLAG_LS+name);else localStorage.setItem(SYNC_FLAG_LS+name,'1');done.push(s);}catch(e){}
  });
  return done;
}
/* Tanı penceresi için: her tanımlı bayrağın durumu ve neden. */
function syncFlagsReport(){
  const c=_syncCfg,names=Object.keys(SYNC_FLAGS);
  const head=c.state==='ok'?(c.off?'ayar: HEPSİ KAPALI (off)':'ayar okundu'):c.state==='error'?'ayar okunamadı → hepsi kapalı':'ayar bekleniyor → hepsi kapalı';
  if(!names.length)return head+' · tanımlı bayrak yok';
  return head+' · '+names.map(n=>{
    let local=false;try{local=localStorage.getItem(SYNC_FLAG_LS+n)==='1';}catch(e){}
    const why=c.kill[n]===true?'uzaktan kapalı':_syncTrip[n]?'kendiliğinden kapandı':c.flags[n]===true?'herkese açık':local?'bu cihazda açık':'kapalı';
    return n+'='+(syncFlag(n)?'AÇIK':'kapalı')+' ('+why+')';
  }).join(', ');
}
/* config/sync'i canlı dinler. Okunamazsa (yetki, ağ) bütün bayraklar kapalı kalır. */
function useSyncConfig(user){
  const uid=user&&user.uid;
  useEffect(()=>{
    try{const done=syncFlagsFromUrl(typeof location!=='undefined'?location.search:'');if(done.length)slog('bayrak (adres)',done.join(','));}catch(e){}
  },[]);
  useEffect(()=>{
    syncCfgSet(null,'unknown');
    const fb=FB();if(!fb||!uid)return;
    let ref=null;
    try{ref=fb.firestore().collection('config').doc('sync');}catch(e){}
    if(!ref||typeof ref.onSnapshot!=='function')return;   // sahte ortam (sync-test) → ayar yok, hepsi kapalı
    let last='';
    const off=ref.onSnapshot(s=>{
      syncCfgSet(s.exists?s.data():null,'ok');
      const sum=syncFlagsReport();
      if(sum!==last){last=sum;slog('senkron ayarı',sum);}
    },e=>{syncCfgSet(null,'error');slog('senkron ayarı okunamadı → bayraklar kapalı',(e&&e.code)||'?');});
    return()=>{try{off();}catch(e){}syncCfgSet(null,'unknown');};
  },[uid]);
}
