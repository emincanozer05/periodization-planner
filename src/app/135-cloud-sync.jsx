/* =========================================================
   ROOT
   ========================================================= */
/* =========================================================
   CLOUD SYNC — Firestore parçalı, İÇERİK ADRESLİ (Storage YOK)
   Firestore'un 1MB doküman sınırı olduğu için tüm uygulama
   durumu (JSON) birkaç küçük dokümana BÖLÜNÜR:
       kullanici_verileri/<uid>_<hash> = { userId, c, h, rev }
   Bir de manifest dokümanı:
       kullanici_verileri/<uid>        = { userId, v:2, n, rev, ids:[hash,…] }
   onSnapshot tüm parçaları+manifesti dinler; manifest.ids sırasıyla
   birleştirilip uygulanır → anlık, cihazlar arası.
   Storage, indirme URL'i, parça-dışı bağımlılık YOK.

   PARÇANIN ADI İÇERİĞİNİN HASH'İDİR ve bu kasıtlıdır. Adı <uid>_<rev>_<i>
   olduğu sürece her kayıt, içerik değişmemiş olsa bile parçaların HEPSİNİ
   yeni adlarla baştan yazıyordu; üstelik parçalar sabit bayt aralıklarında
   kesildiği için ortaya eklenen tek bir harf sonraki tüm parçaları kaydırıp
   gerçekten de değiştiriyordu. Tek bir not düzenlemek birkaç MB'ı yeniden
   yüklüyor, diğer cihazlar da aynı MB'ları yeniden indiriyordu — "senkronizasyon
   çok yavaş" şikâyetinin kaynağı buydu. Artık:
     • kesim noktaları içerikten türetilir → değişmeyen parça bayt bayt aynı kalır,
     • aynı kalan parçanın adı da aynı kalır → buluta yazılmaz, karşıya inmez.
   Yarıda kalan kayda karşı korumalar aynen durur — yeni kayıt eski parçalara
   hiç dokunmaz:
     1) YENİ olan parçalar yazılır (eski set el değmeden durur),
     2) manifest TEK BAŞINA yazılır → durum tek bir yazımla çevrilir,
     3) ancak bundan SONRA artık hiçbir manifestin göstermediği parçalar silinir.
   Kayıt hangi adımda ölürse ölsün okuyucu daima eksiksiz bir set görür.

   Eski (<uid>_<rev>_<i>) düzendeki bulutlar okunmaya devam eder; ilk yazımda
   kendiliğinden yeni düzene geçerler. */
const FB=()=>(typeof firebase!=='undefined'&&firebase.apps&&firebase.apps.length)?firebase:null;
/* Sunucunun kendi saati. Hangi cihazın düzenlemesinin daha yeni olduğu ancak ortak bir
   saatle söylenebilir: iki telefonun saati dakikalarca ayrı olabilir ve rev'ler Date.now()
   ile üretildiği için tek başlarına kıyaslanamaz. Bu damga manifeste yazılır, geri geldiğinde
   cihazın saatiyle arasındaki fark ölçülür ve yerel düzenlemeler de o farkla sunucu saatine
   çevrilir (bkz. skew / applyRemote). Alan yoksa (çok eski SDK) kıyas yapılmaz, kimse zarar görmez. */
const srvStamp=()=>{try{return firebase.firestore.FieldValue.serverTimestamp();}catch(e){return null;}};
const stampMs=v=>{   // manifestteki damgayı milisaniyeye çevir (Timestamp | Date | sayı | yok)
  if(v==null)return 0;
  if(typeof v==='number')return v;
  if(typeof v.toMillis==='function')return v.toMillis();
  if(typeof v.getTime==='function')return v.getTime();
  if(typeof v.seconds==='number')return v.seconds*1000;
  return 0;
};
/* BİR OKUMA SONSUZA KADAR BEKLEYEMEZ. Firestore'un `get({source:'server'})` çağrısının
   kendi zaman aşımı yoktur: ağ kopmuşsa değil, ağ "açık görünüp" veri geçirmiyorsa —
   telefon kilitlenip sekme donduğunda, hücresel bağlantı el değiştirdiğinde, bir ara
   sunucu bağlantıyı tutup bırakmadığında — dönen söz (promise) hiç sonuçlanmaz.
   Bu, tek başına bir yavaşlık olurdu; asıl zarar, o okumayı bekleyen yazım kilidinin
   bir daha hiç açılmaması ve o cihazın bir daha HİÇ yazamamasıydı (gösterge sonsuza
   kadar sarı). Okumanın sonucu zaten "olsa iyi olur" cinsinden: gelmezse yazım yine
   yapılır, dinleyici dönüşte birleştirir. O yüzden süreye bağlanır. */
const withTimeout=(p,ms)=>new Promise((resolve,reject)=>{
  let done=false;
  const t=setTimeout(()=>{if(done)return;done=true;const e=new Error('timeout');e.code='timeout';reject(e);},ms);
  p.then(v=>{if(done)return;done=true;clearTimeout(t);resolve(v);},
         e=>{if(done)return;done=true;clearTimeout(t);reject(e);});
});
const SERVER_READ_MS=4000;      // yazım öncesi güvenlik okuması bu kadar bekler, sonra yazıma geçilir
const COMMIT_MS=15000;          // bir commit'in SUNUCU ONAYINI bu kadar bekleriz (yazımın kendisi beklemez)
const WRITE_STUCK_MS=45000;     // bu kadar süredir İLERLEMEYEN yazım takılmış sayılır ve bırakılır
const PEND_STUCK_MS=12000;      // bekleyen yazım bu kadar oturmazsa dinleyici yine de açılır
/* Sunucudan bu kadar süre tek bir yanıt gelmezse taşıma katmanından şüphelenilir. Sağlam bir
   ağda ilk anlık görüntü bir-iki saniyede gelir, kötü ama çalışan bir mobil bağlantıda bile
   çok altında kalır; yani bu süre "yavaş" ile "hiç geçmiyor"u ayırmaya fazlasıyla yeter.
   Yanlış tahminin bedeli de küçük: tek bir yenileme, ve seçim her sunucu yanıtında yeniden
   yazıldığı için bir sonraki oturumda kendiliğinden düzelir. */
const STALL_MS=25000;
const isHidden=()=>typeof document!=='undefined'&&document.visibilityState==='hidden';
/* SENKRON GÜNLÜĞÜ — telefonda konsol yoktur.
   "Gösterge sarıda kalıyor" tek bir belirti, ama arkasında birbirine hiç benzemeyen
   sebepler var: cihaz sunucuya hiç bağlanamıyor olabilir (o zaman her anlık görüntü
   ÖNBELLEKTEN gelir ve dinleyici hiçbir zaman "hazır" diyemez), yazım turu takılmış
   olabilir, ya da bir kayıt reddediliyor olabilir. Bunları ayırmanın yolu cihazın ne
   yaşadığını görmek; konsolun olmadığı yerde de bunun tek yolu ekrana yazmak.
   Burada tutulan son seksen olay, göstergeye dokununca açılan panelde okunuyor ve tek
   düğmeyle kopyalanabiliyor. Yalnızca kayıt tutar — senkronun davranışına karışmaz. */
const SYNC_LOG=[];const SYNC_LOG_MAX=80;let _slSubs=[];
const slog=(msg,extra)=>{
  SYNC_LOG.push({t:Date.now(),msg,extra:(extra==null||extra==='')?'':String(extra)});
  if(SYNC_LOG.length>SYNC_LOG_MAX)SYNC_LOG.shift();
  // Abone yalnızca panel açıkken var: kapalıyken kayıt tutmanın render'a bedeli olmasın.
  for(let i=0;i<_slSubs.length;i++){try{_slSubs[i]();}catch(_){}}
};
const slogSub=f=>{_slSubs.push(f);return()=>{_slSubs=_slSubs.filter(x=>x!==f);};};
const slogText=()=>SYNC_LOG.map(e=>{
  const d=new Date(e.t);
  const p=n=>String(n).padStart(2,'0');
  return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+' '+e.msg+(e.extra?' '+e.extra:'');
}).join('\n');
/* PARÇALAMA SABİT ARALIKLA DEĞİL, İÇERİĞE GÖRE YAPILIR — ve parçanın ADI içeriğinin
   hash'idir. Senkronizasyonun yavaş olmasının asıl sebebi buydu:
     • parçalar sabit bayt aralıklarında kesildiği için durumun ortasına eklenen tek bir
       harf kendinden sonraki TÜM parçaların içeriğini bir bayt kaydırıyordu;
     • parça adı da rev taşıdığı için zaten her kayıtta hepsi yeni adlarla baştan yazılıyordu.
   Sonuç: bir antrenman notuna dokunmak bile birkaç MB'lık durumun TAMAMINI yeniden
   yüklüyor, diğer cihazlar da aynı MB'ları yeniden indiriyordu (gömülü fotoğraf/PDF'i olan
   bir durumda her düzenleme onlarca doküman demekti).
   Artık kesme noktaları içeriğin kendisinden türetiliyor (gezici/gear hash): bir düzenleme
   yalnızca dokunduğu parçanın sınırını oynatır, ondan sonrası bayt bayt aynı kalır. Parça
   adı içeriğin hash'i olduğundan değişmeyen parça buluta HİÇ yazılmaz ve karşı cihaza HİÇ
   inmez — yalnızca gerçekten değişen 1-2 parça gider.
   Firestore'un iki sert sınırı korunur (ikisi de UTF-8 BAYT cinsindendir):
     • bir doküman 1.048.576 baytı aşamaz  → CHUNK_MAX çok altında tutar;
     • bir Commit isteği 10 MiB'ı aşamaz   → batch bayt bütçesiyle kapanır. */
const CHUNK_MIN=8*1024;           // en küçük parça (bu bayttan önce kesim aranmaz)
const CHUNK_BITS=14;              // kesim koşulu: hash'in üst 14 biti sıfır → ~16KB ortalama parça
const CHUNK_MAX=64*1024;          // en büyük parça — 1MB doküman sınırının çok altında
const GEAR_WARM=64;               // kesim kararı yalnızca son ~32 bayta baksın diye ısınma payı
const BATCH_BYTES=4*1024*1024;    // commit başına bayt — 10MiB istek sınırının güvenli altında
const BATCH_OPS=450;              // bir batch en fazla 500 işlem alır
const CHUNK_OVERHEAD=300;         // doküman adı + alan adları + h/rev/userId için kaba pay
const chunkDocId=(uid,h)=>uid+'_'+h;
const _enc=(typeof TextEncoder!=='undefined')?new TextEncoder():null;
const _dec=(typeof TextDecoder!=='undefined')?new TextDecoder():null;
/* Gezici hash tablosu. Sabit bir tohumdan üretilir: parçalama TÜM cihazlarda birebir aynı
   çıkmak zorunda, yoksa aynı içerik farklı parçalara bölünür ve hiçbir şey eşleşmez.
   LCG'nin ham çıktısındaki düşük bitler düzenlidir; bir karıştırıcıdan geçirilir. */
const GEAR=(()=>{const g=new Uint32Array(256);let s=0x9E3779B9>>>0;
  for(let i=0;i<256;i++){
    s=(Math.imul(s,1664525)+1013904223)>>>0;
    let x=s;x=Math.imul(x^(x>>>16),0x85EBCA6B)>>>0;x=Math.imul(x^(x>>>13),0xC2B2AE35)>>>0;
    g[i]=(x^(x>>>16))>>>0;}
  return g;})();
/* Parça içeriğinin kimliği: 96 bit hash + uzunluk. Çakışma sessizce veri bozar, bu yüzden
   tek bir 32-bit hash yetmez; üç bağımsız birikim karıştırılır. */
const hashBytes=(bytes,from,to)=>{
  let a=0x811c9dc5>>>0,b=0x9e3779b1>>>0,c=0x85ebca6b>>>0;
  for(let i=from;i<to;i++){const v=bytes[i];
    a=Math.imul(a^v,16777619)>>>0;
    b=(Math.imul(b+v,2654435761)^(b>>>15))>>>0;
    c=(Math.imul(c^(v+0x9E37),2246822519)+((c<<7)>>>0))>>>0;}
  const hex=x=>('0000000'+(x>>>0).toString(16)).slice(-8);
  return hex(a)+hex(b)+hex(c)+(to-from).toString(36);
};
const hashString=s=>{   // TextEncoder yoksa (çok eski tarayıcı) karakter kodları üzerinden
  let a=0x811c9dc5>>>0,b=0x9e3779b1>>>0,c=0x85ebca6b>>>0;
  for(let i=0;i<s.length;i++){const v=s.charCodeAt(i);
    a=Math.imul(a^v,16777619)>>>0;
    b=(Math.imul(b+v,2654435761)^(b>>>15))>>>0;
    c=(Math.imul(c^(v+0x9E37),2246822519)+((c<<7)>>>0))>>>0;}
  const hex=x=>('0000000'+(x>>>0).toString(16)).slice(-8);
  return hex(a)+hex(b)+hex(c)+s.length.toString(36);
};
/* İçeriğe göre böler; çok baytlı bir karakterin (Türkçe harf, emoji) ortasından asla kesmez
   — kesim yalnızca bir karakterin İLK baytında yapılır. {c:parça, b:bayt, h:hash} döner;
   b batch bütçesi, h de parça adı için yeniden kodlamadan kullanılır. */
const splitChunks=s=>{
  if(!_enc||!_dec){   // çok eski tarayıcı: içerik hash'i yok, sabit adımla böl
    const a=[];const step=Math.floor(CHUNK_MAX/4);
    for(let i=0;i<s.length;i+=step){const c=s.slice(i,i+step);a.push({c,b:c.length*4,h:hashString(c)});}
    return a.length?a:[{c:'',b:0,h:hashString('')}];
  }
  const bytes=_enc.encode(s);
  if(!bytes.length)return[{c:'',b:0,h:hashBytes(bytes,0,0)}];
  const out=[];let start=0;
  while(start<bytes.length){
    const hard=Math.min(start+CHUNK_MAX,bytes.length);
    const from=Math.min(start+CHUNK_MIN,bytes.length);
    let end=hard;
    // Hash'i kesim aranan noktadan biraz ÖNCE ısıt: h<<1 sayesinde 32 baytlık kayan pencere
    // gibi davranır, yani kesim kararı parçanın nerede başladığına değil yalnızca son
    // baytlara bağlı kalır. Kaymaya dayanıklılığı sağlayan şey budur.
    let h=0;
    for(let i=Math.max(start,from-GEAR_WARM);i<from;i++)h=(((h<<1)>>>0)+GEAR[bytes[i]])>>>0;
    for(let i=from;i<hard;i++){
      h=(((h<<1)>>>0)+GEAR[bytes[i]])>>>0;
      if((h>>>(32-CHUNK_BITS))===0&&(bytes[i+1]&0xC0)!==0x80){end=i+1;break;}
    }
    // zorunlu kesim: 10xxxxxx bir devam baytıdır → karakterin başına kadar geri sar
    while(end>start&&end<bytes.length&&(bytes[end]&0xC0)===0x80)end--;
    if(end<=start)end=hard;   // güvenlik ağı (olmaması gerekir)
    out.push({c:_dec.decode(bytes.subarray(start,end)),b:end-start,h:hashBytes(bytes,start,end)});
    start=end;
  }
  return out;
};
/* Parçalama, ana iş parçacığında yapılan en pahalı iş: 2.6 MB'lık bir durumda kayan
   gear-hash'i uçtan uca gezmek ~130 ms sürer. Bu iş her yazımda — yani koç yazmaya ara
   verdiği anda — çalıştığı için ekran tam o anda donuyordu. Artık bir Worker'a veriliyor:
   ana iş parçacığı yalnızca JSON'u üretir, bölme ve hash arka planda döner.
   Worker'ın kaynağı fonksiyonların KENDİSİNDEN üretilir (toString), böylece arka plandaki
   bölme ile buradaki bölme birbirinden ayrı düşemez — parça adları içerik hash'i olduğu
   için ayrı düşmeleri, aynı içeriği bulutta iki kez saklamak demek olurdu.
   Worker kurulamazsa (dosya:// protokolü, Blob engelli, eski tarayıcı) iş eskisi gibi
   burada yapılır; yalnızca yavaş, asla yanlış değil. */
const _chunkWorkerSrc=()=>`
const CHUNK_MIN=${CHUNK_MIN},CHUNK_BITS=${CHUNK_BITS},CHUNK_MAX=${CHUNK_MAX},GEAR_WARM=${GEAR_WARM};
const _enc=(typeof TextEncoder!=='undefined')?new TextEncoder():null;
const _dec=(typeof TextDecoder!=='undefined')?new TextDecoder():null;
const GEAR=new Uint32Array(${JSON.stringify(Array.from(GEAR))});
const hashBytes=${hashBytes.toString()};
const hashString=${hashString.toString()};
const splitChunks=${splitChunks.toString()};
self.onmessage=e=>{const d=e.data||{};
  try{self.postMessage({id:d.id,ok:1,parts:splitChunks(d.json)});}
  catch(err){self.postMessage({id:d.id,ok:0});}
};`;
let _cw=null,_cwOff=false,_cwSeq=0;
const _chunkWorker=()=>{
  if(_cw||_cwOff)return _cw;
  try{
    if(typeof Worker==='undefined'||typeof Blob==='undefined'||!URL.createObjectURL)throw 0;
    const url=URL.createObjectURL(new Blob([_chunkWorkerSrc()],{type:'text/javascript'}));
    _cw=new Worker(url);
    URL.revokeObjectURL(url);
  }catch(e){_cwOff=true;_cw=null;}
  return _cw;
};
const splitChunksAsync=json=>new Promise(resolve=>{
  const w=_chunkWorker();
  if(!w)return resolve(splitChunks(json));
  const id=++_cwSeq;
  let done=false,tmr=0;
  const off=()=>{if(done)return true;done=true;if(tmr)clearTimeout(tmr);
    w.removeEventListener('message',onMsg);w.removeEventListener('error',onErr);return false;};
  const onMsg=e=>{const d=e.data||{};if(d.id!==id)return;if(off())return;
    resolve(d.ok?d.parts:splitChunks(json));};
  /* Worker düştü: bir daha denenmez, iş buradan sürdürülür. Yazım hiçbir hâlde yarıda
     kalmaz — bu yüzden hata da bir sonuçtur, reject değil.
     SESSİZCE ÖLEN WORKER de aynı kapıya çıkmalı: telefonda, bellek darda kaldığında
     tarayıcı worker'ı hiçbir olay üretmeden sonlandırabiliyor. O hâlde yanıt hiç gelmez,
     yazım o satırda asılı kalır ve cihaz bir daha senkron olmaz. Onun için yanıt süreye
     bağlı: gelmezse iş ana iş parçacığında yapılır (yalnızca yavaş, asla yanlış değil). */
  const onErr=()=>{if(off())return;_cwOff=true;try{w.terminate();}catch(_){}_cw=null;
    resolve(splitChunks(json));};
  w.addEventListener('message',onMsg);w.addEventListener('error',onErr);
  // Süre, işin kendisiyle ölçeklenir: ~130 ms'lik bir bölme için 10 sn zaten fazlasıyla geniş.
  tmr=setTimeout(()=>{if(!done)onErr();},10000+Math.ceil(json.length/50000));
  try{w.postMessage({id,json});}catch(e){onErr();}
});
/* Aynı nesne için JSON.stringify'ı bir kez yapıp saklar. Durumun tamamı her tuş vuruşunda
   birkaç kez seri hâle getiriliyordu (debounce karşılaştırması + yazım + dinleyici
   karşılaştırması); birkaç MB'lık bir durumda bu tek başına yazmayı tutuklaştırıyordu.
   Kökteki durum nesnesi her değişiklikte yenilendiği (asla yerinde değiştirilmediği) için
   nesne kimliğine göre önbelleklemek güvenlidir. */
const _serCache=(typeof WeakMap!=='undefined')?new WeakMap():null;
const ser=o=>{
  if(!o||typeof o!=='object'||!_serCache)return JSON.stringify(stripDeviceOnly(o));
  const hit=_serCache.get(o);if(hit!==undefined)return hit;
  const s=JSON.stringify(stripDeviceOnly(o));_serCache.set(o,s);return s;
};

/* YEREL EMNİYET KOPYASI. Uygulamanın tek deposu buluttu: bulut okunamaz hâle gelirse
   cihazda geri dönülecek hiçbir şey kalmıyordu. Buluttan tutarlı bir durum her
   okunduğunda aynısı tarayıcıya da yazılır; bulut kurtarılamazsa buradan geri
   yüklenip buluta yeniden yazılır. Kota dolarsa/gizli moddaysa sessizce atlanır. */
const LS_KEY=uid=>'coachos_last_state_'+uid;
const LS_MAX=3.5*1024*1024;   // localStorage ~5MB: gömülü fotoğraflı devasa durumları hiç denemeyelim
/* Yazma anında DEĞİL, tarayıcı boşa düştüğünde kaydedilir. localStorage.setItem
   senkron bir yazımdır; birkaç MB'lık durumda ana iş parçacığını yüzlerce ms tutuyordu ve
   bu, bulut yazımının hemen ardına — yani düzenlemeden sonraki ilk kaydırmalara —
   denk geliyordu. Kopya emniyet amaçlıdır; bir kare geç yazılması sorun değil, bu yüzden
   sekme kapanırken lsFlush ile hemen yazılır. */
let _lsPend=null,_lsSched=0,_lsLast=null;
/* Aynı hâli iki kez yazma. setItem birkaç MB'ı ana iş parçacığında diske geçirir ve bu
   kopya buluttan gelen HER tutarlı hâl için isteniyor — elle çekim, onarım turu, dönüş
   sınavının getirdiği hâl, hepsi. Çoğu zaman getirdikleri şey cihazda zaten duran hâldir;
   o zaman yazmanın karşılığı yok, yalnızca telefonun takıldığı bir kare var. */
const _lsWrite=()=>{const p=_lsPend;_lsPend=null;_lsSched=0;if(!p)return;
  if(_lsLast&&_lsLast.uid===p.uid&&_lsLast.json===p.json)return;
  try{if(p.json.length>LS_MAX)return;localStorage.setItem(LS_KEY(p.uid),p.json);_lsLast={uid:p.uid,json:p.json};}catch(e){/* kota / gizli mod */}};
const lsSave=(uid,json)=>{
  _lsPend={uid,json};
  if(_lsSched)return;
  _lsSched=(typeof requestIdleCallback==='function')
    ?requestIdleCallback(_lsWrite,{timeout:3000})
    :setTimeout(_lsWrite,300);
};
const lsFlush=()=>{if(_lsPend)_lsWrite();};
const lsLoad=uid=>{try{return localStorage.getItem(LS_KEY(uid))||null;}catch(e){return null;}};

// Gerçek veri var mı? (boş/varsayılan veri buluttaki dolu veriyi silmesin diye)
function hasRealData(d){
  if(!d||!Array.isArray(d.teams))return false;
  if(d.teams.some(t=>(t.athletes&&t.athletes.length)||(t.days&&Object.keys(t.days).length)))return true;
  if(Array.isArray(d.exercises)&&d.exercises.length)return true;
  return false;
}

/* =========================================================
   ÜÇ YÖNLÜ BİRLEŞTİRME (3-way merge)
   Durum tek bir JSON olarak senkronlandığı için, iki cihaz aynı anda çalıştığında
   buluttan gelen hâli ekrandakinin ÜZERİNE yazmak, diğer cihazda henüz yazılmamış
   (ya da farklı bir alanda yapılmış) düzenlemeyi sessizce siliyordu. Artık üç taraf
   karşılaştırılıyor:
     base   = bu cihazın bulutla en son mutabık olduğu hâl (lastSynced)
     local  = ekrandaki hâl (base'ten sonra bu cihazda yapılanlar)
     remote = buluttan yeni gelen hâl (base'ten sonra ÖTEKİ cihazda yapılanlar)
   Kural basit ve kayıpsız: bir alanı yalnızca bir taraf değiştirmişse o taraf geçerlidir;
   iki taraf da değiştirmişse ekrandaki (local) kazanır ve sonuç buluta geri yazılır.
   Silme ile değişiklik karşı karşıya gelirse DEĞİŞİKLİK kazanır — silinen bir şey geri
   getirilebilir, kaybolan bir antrenman getirilemez.
   Karşılıklı birleştirme sayesinde cihazlar birbirine yakınsar: bir cihaz kendi hâlini
   yazsa bile, öteki cihaz onu kendi base'iyle birleştirip eksik kalanı geri yazar.
   ========================================================= */
const _isPlainObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
/* Derin eşitlik. JSON.stringify ile karşılaştırmak birkaç MB'lık bir durumda her düğümde
   baştan sona dolaşmak demekti; bu, ilk farkta durur. */
function deq(a,b){
  if(a===b)return true;
  if(typeof a!==typeof b)return false;
  if(a===null||b===null||typeof a!=='object')return a===b;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a)){
    if(a.length!==b.length)return false;
    for(let i=0;i<a.length;i++)if(!deq(a[i],b[i]))return false;
    return true;
  }
  const ka=Object.keys(a),kb=Object.keys(b);
  if(ka.length!==kb.length)return false;
  for(const k of ka){if(!Object.prototype.hasOwnProperty.call(b,k))return false;if(!deq(a[k],b[k]))return false;}
  return true;
}
/* Kimliği olan liste mi? (takımlar, sporcular, sezonlar, egzersizler…) Öyleyse liste
   indeksle değil id ile eşleştirilir: öteki cihaz başa bir sporcu eklediğinde geri kalan
   herkesin "değişmiş" sayılmasını bu önler. */
const _keyedList=arr=>{
  if(!Array.isArray(arr))return null;
  const m=new Map();
  if(!arr.length)return m;   // boş liste de eşlenebilir: karşı taraftaki eklemeler böyle korunur
  for(const v of arr){
    if(!_isPlainObj(v))return null;
    const id=v.id;
    if(typeof id!=='string'&&typeof id!=='number')return null;
    if(m.has(id))return null;               // tekrar eden id → güvenli eşleme yok
    m.set(id,v);
  }
  return m;
};
function merge3(base,local,remote,st){
  if(deq(local,remote))return remote;       // ikisi aynı → iş yok
  if(deq(base,local))return remote;         // bu cihaz dokunmamış → uzak geçerli
  if(deq(base,remote))return local;         // öteki cihaz dokunmamış → yerel geçerli
  // İkisi de değişmiş: yapıya inip alan alan çöz.
  const kl=_keyedList(local),kr=_keyedList(remote);
  if(kl&&kr&&(kl.size||kr.size)){
    const kb=_keyedList(Array.isArray(base)?base:[])||new Map();
    const out=[];const taken=new Set();
    /* Sıra da bir düzenlemedir: bu cihaz sıralamayı değiştirmediyse ötekinin sırası
       korunur, değiştirdiyse ekrandaki sıra esas alınır. */
    const sameOrder=Array.isArray(base)&&base.length===local.length&&base.every((v,i)=>_isPlainObj(v)&&_isPlainObj(local[i])&&v.id===local[i].id);
    const order=sameOrder?remote:local;
    const other=sameOrder?local:remote;
    const push=(id,a,b)=>{   // a: order tarafındaki, b: öteki taraftaki
      if(taken.has(id))return;
      taken.add(id);
      const bv=kb.get(id);
      if(a&&b){out.push(merge3(bv,sameOrder?b:a,sameOrder?a:b,st));return;}
      const only=a||b;
      // Bir tarafta yok: base'te vardı ve DURAN tarafta hiç değişmemişse gerçek bir silmedir.
      if(kb.has(id)&&deq(bv,only)){if(st)st.deleted++;return;}
      out.push(only);         // eklenmiş ya da değiştirilmiş → korunur (silme veriyi yutmaz)
    };
    for(const v of order)push(v.id,v,(sameOrder?kl:kr).get(v.id));
    for(const v of other)push(v.id,undefined,v);
    return out;
  }
  if(_isPlainObj(local)&&_isPlainObj(remote)){
    const b=_isPlainObj(base)?base:{};
    const out={};
    const keys=[];const seen=new Set();
    for(const k of Object.keys(local))if(!seen.has(k)){seen.add(k);keys.push(k);}
    for(const k of Object.keys(remote))if(!seen.has(k)){seen.add(k);keys.push(k);}
    const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
    for(const k of keys){
      const inL=has(local,k),inR=has(remote,k),inB=has(b,k);
      if(inL&&inR){out[k]=merge3(inB?b[k]:undefined,local[k],remote[k],st);continue;}
      const side=inL?local[k]:remote[k];
      if(inB&&deq(b[k],side)){if(st)st.deleted++;continue;}   // öteki taraf sildi, bu taraf dokunmadı → silinsin
      out[k]=side;                                            // eklendi ya da değiştirildi → korunur
    }
    return out;
  }
  /* İkisi de AYNI alanı farklı bir değere çevirmiş. Burası, hiçbir yapısal kuralın
     çözemediği tek durum: kazanan seçilmek zorunda.
     Eskiden her zaman EKRANDAKİ kazanırdı. Bu, sayfayı açık tutan cihazı baskın yapıyordu:
     bir antrenör telefonundan bir değeri düzeltiyor, laptopu açık duran bir başkası hiçbir
     şey yapmadan o düzeltmeyi geri alabiliyordu.
     Artık kazanan, DAHA SONRA yapılmış olandır — hangi cihazda yapıldığından bağımsız.
     Kıyas ortak bir saatle (sunucu damgası) yapılır; ölçüm yoksa eski davranışa dönülür,
     yani hiçbir hâlde ekrandaki hâlden daha kötüsü olmaz. */
  if(st)st.conflicts++;
  return(st&&st.preferRemote)?remote:local;
}
/* Buluttan gelen hâli ekrandakiyle birleştir. {state, changed, stats} döner; changed,
   sonucun buluttakinden farklı olduğunu (yani geri yazılması gerektiğini) söyler. */
function mergeCloud(baseJson,localState,remoteState,preferRemote){
  const st={conflicts:0,deleted:0,preferRemote:!!preferRemote};
  let base=null;
  if(baseJson!=null){try{base=migrate(JSON.parse(baseJson));}catch(e){base=null;}}
  // Base yoksa birleştirmenin dayanağı yok: hiçbir şeyi silmemek için iki tarafı da koru.
  const merged=merge3(base,localState,remoteState,st);
  return{state:merged,changed:!deq(merged,remoteState),stats:st};
}

// --- ESKİ FORMAT GEÇİŞİ (tek seferlik): per-entity dokümanlardan durumu kur ---
function docKind(d){
  if(!d)return null;
  if(d._type)return d._type;
  if(d.type==='team'||d.type==='research'||d.type==='settings')return d.type;
  return 'exercise';   // eski egzersiz dokümanında type=kategori olabilir
}
function stateFromOldDocs(arr){
  const teams=[],exercises=[],researches=[];
  let extra={activeTeamId:null,customTests:[],savedResearch:[],ai:null};
  arr.forEach(d=>{
    if(!d)return;
    const k=docKind(d);
    if(k==='team'){const{_type,type,userId,...r}=d;teams.push(r);}
    else if(k==='research'){const{_type,type,userId,...r}=d;researches.push(r);}
    else if(k==='settings'){const{_type,type,userId,...r}=d;Object.assign(extra,r);}
    else if(k==='exercise'){const{_type,userId,...r}=d;exercises.push(r);}  // type=kategori KORUNUR
  });
  return migrate({...extra,teams,exercises,researches});
}

function useCloudSync(data,setData){
  const[user,setUser]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[status,setStatus]=useState('offline');   // offline | syncing | synced | error
  const[syncErr,setSyncErr]=useState('');
  const[syncNote,setSyncNote]=useState('');   // hata değil ama kullanıcının bilmesi gereken kurtarma notu
  const[subTick,setSubTick]=useState(0);     // artırılınca dinleyici yeniden kurulur (gözcü kullanır)
  const[authErr,setAuthErr]=useState('');
  const dataRef=useRef(data); dataRef.current=data;
  const userRef=useRef(null); userRef.current=user;
  const prevUid=useRef(null);           // hesap değişimini saptamak için (bellek-içi)
  const ready=useRef(false);            // ilk bulut yanıtı alındı mı
  const lastSynced=useRef(null);        // bulutla eşit son içerik (JSON) — gereksiz yazım/yankı önler
  /* BİRLEŞTİRME TABANI: iki cihazın da ortak atası olduğu BİLİNEN son hâl. Kendi yazımımız
     bunu ilerletmez — ancak bulut o yazımı geri gösterdiğinde ilerler. Aksi hâlde şu yarış
     veriyi yutuyordu: iki cihaz da aynı tabandan yazar, geç kalan yazım kazanır, erken yazan
     cihaz kendi değişikliğini "bulutla eşitim" sanıp gelen hâli olduğu gibi kabul ederdi. */
  const ancestor=useRef(null);
  /* Son anlık görüntü SUNUCUDAN mı geldi? Bağlantı varken başka cihazın yazımı milisaniyeler
     içinde buraya düşer, dolayısıyla ekrandaki hâl daima güncel bir tabandan türer. Bağlantı
     kesikken böyle bir güvence yok: dönüşte yazımımız, aradaki yazımları hiç görmeden buluta
     gidip onları silebilir. O yüzden bağlantısız geçen bir aradan sonraki İLK yazımdan önce
     sunucu bir kez okunur ve gerekiyorsa birleştirilir. */
  const fromServer=useRef(false);
  const prevN=useRef(0);                // önceki parça sayısı (fazlalıkları silmek için)
  const timer=useRef(null);
  const lastRev=useRef(0);              // yazdığımız son rev (rev'in geri gitmemesi için)
  const chunkIds=useRef([]);            // canlı anlık görüntüdeki parça dokümanları [{id,rev}] — bedelsiz temizlik için
  const docCache=useRef(new Map());     // docId → veri; dinleyicide yalnızca DEĞİŞEN dokümanlar çözülsün diye
  const idsJson=useRef([]);             // son iki {key,json}: manifest id listesi → karşılığı olan dizgi
  const myRevs=useRef(new Set());       // bu cihazın yazdığı rev'ler — kendi çöpümüzü bekletmeden toplamak için
  const settle=useRef(null);            // tutarsız ara durumu bekleme sayacı (hemen hata basma)
  const healing=useRef(false);          // kurtarma turu uçuşta mı
  const dirty=useRef(false);            // yerelde buluta yazılmamış değişiklik var mı → yeşil ancak bu false iken yanar
  const lastApplied=useRef(null);       // buluttan gelip ekrana uygulanan son durum nesnesi (boşuna yazım turu açmasın)
  const writing=useRef(false);          // writeNow uçuşta mı (eşzamanlı yazımların birbirini ezmesini önler)
  const writeStarted=useRef(0);         // uçuştaki yazım ne zaman başladı (takılanı bırakabilmek için)
  const writeGen=useRef(0);             // yazım turu sıra no: bırakılan bir tur geri dönerse hiçbir şeye dokunamaz
  const sawServer=useRef(false);        // bu oturumda SUNUCUDAN hiç anlık görüntü geldi mi (teşhisin ana ayracı)
  const snapCount=useRef(0);            // dinleyici kaç kez uyandı (bir kez = kilitlenmiş demektir)
  const lastDocs=useRef(0);             // son görüntüdeki doküman sayısı
  const pendSince=useRef(0);            // hazır olmadan 'bekleyen yazım' görmeye ne zaman başladık
  const pendTimer=useRef(null);         // o hâlden çıkış denemesi (dinleyici bir daha uyanmayabilir)
  const fromPending=useRef(false);      // bu tur bekleyen yazım taşıyan bir görüntüden açıldı → yeşil yakma
  const queued=useRef(false);           // uçuş sırasında yeni yazım istendi mi
  const writeAcked=useRef(true);        // son yazımı sunucu ONAYLADI mı (yoksa yerel kuyrukta yolda)
  const lastServerAt=useRef(0);         // sunucudan en son ne zaman yanıt geldi (taşıma sağlığı)
  const startedAt=useRef(0);            // dinleyici ne zaman kuruldu (ilk bağlanma penceresi)
  const resub=useRef(null);             // yeniden abone olma isteği (supervisor okur)
  const subFresh=useRef(null);          // dinleyici en son hangi uid için SIFIRDAN kuruldu
  const lastEditAt=useRef(0);           // bu cihazda en son ne zaman düzenleme yapıldı (yerel saat)
  const skew=useRef(null);              // sunucu saati − cihaz saati (ms); ölçülene kadar null
  const COL='kullanici_verileri';
  const GC_GRACE_MS=5*60*1000;   // bu kadar yeni bir parça, kimse göstermiyor görünse bile silinmez

  // Eski {url} pointer'ından (Storage) veriyi kurtarmayı dene — sadece fetch, SDK gerekmez
  const tryDownload=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('download '+r.status);return await r.text();};

  // manifest+parça DIŞINDAki eski dokümanları sil (per-entity / {icerik} / {url})
  const cleanupLegacy=async(fb,uid)=>{
    try{
      const col=fb.firestore().collection(COL);
      const snap=await col.where('userId','==',uid).get();
      const dels=[];
      snap.forEach(d=>{const v=d.data();if(!v)return;
        const isManifest=(d.id===uid&&(Array.isArray(v.ids)||typeof v.n==='number'));
        const isChunk=(typeof v.c==='string');   // yeni düzen: {c,h}; eski düzen: {i,c,rev}
        if(!isManifest&&!isChunk)dels.push(d.id);});
      for(let i=0;i<dels.length;i+=450){const b=fb.firestore().batch();dels.slice(i,i+450).forEach(id=>b.delete(col.doc(id)));await b.commit();}
    }catch(e){console.warn('cleanup',e);}
  };

  /* Geçici sunucu hatalarında commit'i yeniden dene. Batch nesnesi commit'ten sonra
     tekrar kullanılamadığı için her denemede yeniden kurulur.

     ONAYI SONSUZA KADAR BEKLEMEK YOK. Kalıcı önbellek açıkken `commit()`'in döndürdüğü
     söz, yazım cihazın IndexedDB'sine İŞLENDİĞİNDE değil, SUNUCU ONAYLADIĞINDA sonuçlanır.
     Ağ "açık görünüp" veri geçirmediğinde o onay hiç gelmez ve söz hiç sonuçlanmaz — eskiden
     yazım kilidi de o sözü beklediği için tek bir takılı commit cihazı kalıcı olarak sarıda
     bırakıyordu: sonraki her düzenleme yalnızca sıraya giriyor, hiçbiri yola çıkamıyordu.
     Oysa beklemenin bir karşılığı yok: yazım o an zaten diske işlenmiştir ve Firestore onu
     kuyruğunda SIRAYLA, gerekirse sayfa yenilendikten sonra bile kendisi gönderir. Sıra
     korunduğu için "önce parçalar, sonra manifest" güvencesi de bozulmaz.
     Bu yüzden onay bir süreye bağlanır: gelmezse kilit bırakılır (yazım yolda kalır, gösterge
     dürüstçe sarıda kalır) ve cihaz yazmaya devam edebilir. Dönüş: onaylandı mı? */
  const SOFT_ERR=['unavailable','deadline-exceeded','aborted','internal','cancelled'];
  const RETRY_MS=[1000,3000];
  const commitOps=async(fb,col,ops)=>{
    for(let a=0;;a++){
      const b=fb.firestore().batch();
      ops.forEach(o=>o.del?b.delete(col.doc(o.id)):b.set(col.doc(o.id),o.data));
      const p=b.commit();
      p.catch(()=>{});   // süre dolduktan sonra gelen ret, yakalanmamış söz uyarısı üretmesin
      try{await withTimeout(p,COMMIT_MS);return true;}
      catch(e){
        // Zaman aşımı bir HATA DEĞİL: yazım yerel kuyrukta duruyor, sırası gelince gidecek.
        // Yeniden denemek yalnızca kuyruğu şişirirdi.
        if(e&&e.code==='timeout'){slog('write: onay gecikti, kuyrukta','op='+ops.length);return false;}
        if(SOFT_ERR.indexOf(e&&e.code)<0||a>=RETRY_MS.length)throw e;
        await new Promise(r=>setTimeout(r,RETRY_MS[a]));
      }
    }
  };

  // Manifest yeni rev'e geçtikten SONRA, artık hiçbir manifestin göstermediği parçaları sil.
  // Sıra kritik: önce silinseydi yarıda kalan bir kayıt, okunabilir tek seti yok ederdi.
  // keep: yeni manifestin gösterdiği doküman adları — İÇERİĞİ AYNI KALDIĞI İÇİN yeniden
  // yazılmamış (dolayısıyla rev'i eski) parçalar da buradadır ve asla silinmez.
  // Başka bir cihazın DAHA YENİ yazımına (rev >= keepRev) de asla dokunmaz.
  const gcOldChunks=async(fb,uid,keepRev,keep,known)=>{
    try{
      const col=fb.firestore().collection(COL);
      let dels=[];
      /* GÜVENLİK PAYI: yeni yazılmış hiçbir parçaya dokunma. Başka bir cihaz şu anda
         yazıyor olabilir — parçaları bulutta, manifesti henüz yolda. rev'i bizimkinden
         küçük diye onları silmek, o cihazın manifestini boşa düşürüp "buluttaki veri
         parçaları tutarsız" hatasına yol açıyordu (cihaz saatleri birebir aynı olmadığı
         için rev karşılaştırması tek başına yetmez). Payın dışında kalan çöp bir sonraki
         yazımda zaten toplanır.
         AMA PAY YALNIZCA BAŞKASININ PARÇALARI İÇİNDİR. Kendi yazdığımız bir rev'i taşıyan
         parçayı oraya biz koyduk ve yeni manifestimiz artık onu göstermiyor; bizden yana
         onu bekletecek bir şey yok. (Başka bir cihaz aynı içeriği yazmış olsaydı doküman
         ONUN rev'ini taşırdı, bizimkini değil — yani bu ayrım kesin.) Beş dakika boyunca
         kendi çöpümüzü tutmak, koç çalışırken koleksiyonu yüzlerce ölü parçayla
         dolduruyordu; dinleyici onların hepsini taşıdığı için senkron "önce hızlı, bir
         süre sonra yavaş" hâline gelmesinin asıl sebebi buydu. */
      const cutoff=Date.now()-GC_GRACE_MS;
      const mine=myRevs.current;
      const collectable=r=>r<cutoff||mine.has(r);
      // Canlı dinleyici zaten TÜM dokümanları görüyor; silinecekleri oradan bil → ekstra okuma yok.
      known.forEach(c=>{if(c.rev<keepRev&&collectable(c.rev)&&!keep.has(c.id))dels.push(c.id);});
      if(!known.length){
        // Dinleyici henüz konuşmadıysa (ör. ilk kayıt) sunucuyu bir kez tara.
        const snap=await col.where('userId','==',uid).get();
        snap.forEach(d=>{const v=d.data();if(!v||d.id===uid)return;                  // manifest hariç
          if(typeof v.c!=='string')return;                                            // parça değil → cleanupLegacy'nin işi
          if(keep.has(d.id))return;                                                   // yeni set bunu gösteriyor
          const r=(typeof v.rev==='number')?v.rev:0;
          if(r<keepRev&&collectable(r))dels.push(d.id);});
      }
      dels=dels.filter((id,i)=>dels.indexOf(id)===i);
      for(let i=0;i<dels.length;i+=BATCH_OPS)
        await commitOps(fb,col,dels.slice(i,i+BATCH_OPS).map(id=>({del:1,id})));
    }catch(e){console.warn('gc',e);}
  };

  // YAZIM: JSON'u parçalara böl → SADECE bulutta olmayan parçalar + manifest + artık gösterilmeyenleri temizle
  const writeNow=async()=>{
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    const fb=FB();const u=userRef.current;
    if(!fb||!u||!ready.current){slog('write: atlandı','ready='+(ready.current?1:0)+' user='+(u?1:0));return;}
    if(writing.current){queued.current=true;slog('write: kilitli, sıraya alındı');return;}   // uçuştaki yazım bitince tekrar denenir → eski yazım yeniyi ezemez
    const gen=++writeGen.current;      // bu turun kimliği: bırakılmış bir tur dönerse artık hiçbir şeye dokunmaz
    const stale=()=>gen!==writeGen.current;
    /* Bağlantısız geçen bir aradan sonraki ilk yazım: önce sunucudaki hâli oku. Arada başka
       bir cihaz yazdıysa körlemesine üzerine yazmak yerine birleştir — böylece "tablet
       çevrimdışıyken çalıştı, dönünce laptopta yapılanları sildi" durumu olmaz.
       Sekme GİZLİYKEN bu okuma atlanır. Telefon cebe girerken yapılan son yazım tam da
       burada takılıyordu: bağlantı kopmak üzereyken açılan okuma hiç sonuçlanmıyor, kilit
       hiç açılmıyor ve o cihaz bir daha yazamıyordu. Kaçırılan bir şey de olmuyor —
       dinleyici geri dönüşte uzak hâli zaten getirip birleştiriyor. */
    if(!fromServer.current&&ready.current&&!isHidden()){
      writing.current=true;writeStarted.current=Date.now();
      try{
        // Önce yalnızca manifest okunur (tek doküman): rev bizimkinden yeni değilse
        // arada kimse yazmamış demektir, parçaları çekmeye hiç gerek kalmaz.
        const md=await withTimeout(fb.firestore().collection(COL).doc(u.uid).get({source:'server'}),SERVER_READ_MS);
        const mv=md.exists?md.data():null;
        const sv=(mv&&typeof mv.rev==='number'&&mv.rev>lastRev.current)?await withTimeout(readServer(fb,u.uid),SERVER_READ_MS):{json:null};
        if(sv.json!=null&&sv.json!==lastSynced.current&&sv.json!==ancestor.current){
          let sp=null;try{sp=migrate(JSON.parse(sv.json));}catch(e){}
          if(sp){lastRev.current=Math.max(lastRev.current,sv.rev||0);prevN.current=sv.n;applyRemote(sv.json,sp,sv.at||0);}
        }
        fromServer.current=true;   // sunucuyu şimdi okuduk; sıradaki yazımlar tekrar okumaz
      }catch(e){/* okunamadı ya da zamanında gelmedi → yazımı yine de dene, dinleyici dönüşte birleştirir */
        slog('write: ön-okuma başarısız',(e&&e.code)||(e&&e.message)||'?');}
      // Sıra önemli: bu tur bırakıldıysa kilit ARTIK BİZİM DEĞİL — yerine geçen tur onu
      // tutuyor olabilir, dokunmadan çekiliyoruz.
      if(stale())return;
      writing.current=false;
    }
    const json=ser(dataRef.current);
    if(json===lastSynced.current){dirty.current=false;setStatus('synced');return;}
    /* Boş/varsayılan veri buluttaki dolu veriyi SİLMESİN. Karşılaştırma yalnızca EKRAN
       boş göründüğünde yapılır: eskiden en son yazılan JSON her yazımda baştan sona
       parse ediliyordu (birkaç MB'lık bir durumda tek başına onlarca ms), oysa dolu bir
       durumu dolu bir durumun üstüne yazarken sorulacak bir şey yok. */
    if(!hasRealData(dataRef.current)){
      let prevReal=false;try{prevReal=!!lastSynced.current&&hasRealData(JSON.parse(lastSynced.current));}catch(e){}
      // dirty da temizlenir: yazılacak bir şey olmadığına burada karar verildi. Kalsaydı
      // dinleyici bir daha hiç yeşil yakamazdı ("yerelde yazılmamış değişiklik var" sanırdı).
      if(prevReal){dirty.current=false;setStatus('synced');return;}
    }
    setStatus('syncing');
    writing.current=true;writeStarted.current=Date.now();
    const wT0=Date.now();   // bu turun toplam süresi: bölme + parça commit'leri + manifest
    slog('write: başladı','boyut='+json.length);
    try{
      const col=fb.firestore().collection(COL);
      const parts=await splitChunksAsync(json);const n=parts.length;
      if(stale())return;   // bu tur bırakıldı (bkz. takılan yazım gözcüsü) → yerini alan tur yazsın
      slog('write: bölündü','parça='+n);
      let rev=Date.now();if(rev<=lastRev.current)rev=lastRev.current+1;   // rev daima artar (saat geri gitse bile)
      const ids=parts.map(p=>p.h);
      /* Bu hâlin kimliğini ŞİMDİ kaydet, commit'lerden SONRA değil. Parça adları içeriğin
         hash'i olduğu için "şu id listesi şu dizgiye açılır" bir içerik gerçeğidir; buluta
         gidip gitmemesinden bağımsızdır. Sonraya bırakılınca dinleyici, manifestin yankısını
         kayıt tamamlanmadan önce görebiliyor ve durumu boşuna yeniden birleştiriyordu.
         Aynı sebeple rev de burada işaretleniyor: yazım yarıda kalsa bile bulutta kalan
         parçalar bizim olduğundan bir sonraki turda beklemeden toplanabilsin. */
      idsJson.current=[{key:ids.join('|'),json},idsJson.current[0]].filter(Boolean);
      myRevs.current.add(rev);
      if(myRevs.current.size>64){const it=myRevs.current.values();for(let k=0;k<32;k++)myRevs.current.delete(it.next().value);}
      const keep=new Set(ids.map(h=>chunkDocId(u.uid,h)));
      const known=chunkIds.current;                     // silme adayları: yazımdan ÖNCEKİ bulut hâli
      const have=new Set();known.forEach(c=>have.add(c.id));
      /* SADECE YENİ OLAN PARÇALAR YAZILIR. Aynı içerik zaten bulutta duruyorsa (adı içeriğinin
         hash'i olduğu için bunu okumadan biliyoruz) o dokümana hiç dokunulmaz — küçük bir
         düzenlemede tek bir parça gider, birkaç MB değil. Aynı parça durumda iki kez geçiyorsa
         (tekrar eden içerik) bir kez yazılır. */
      const seen=new Set();const news=[];
      parts.forEach(p=>{
        const id=chunkDocId(u.uid,p.h);
        if(seen.has(id)||have.has(id))return;
        seen.add(id);
        news.push({id,data:{userId:u.uid,c:p.c,h:p.h,rev},bytes:p.b+CHUNK_OVERHEAD});
      });
      // Batch hem işlem sayısı hem de bayt bütçesi dolunca kapanır: tek bir commit asla
      // Firestore'un 10 MiB istek sınırına dayanmaz.
      const groups=[];let cur=[],bytes=0;
      news.forEach(o=>{
        if(cur.length&&(cur.length>=BATCH_OPS||bytes+o.bytes>BATCH_BYTES)){groups.push(cur);cur=[];bytes=0;}
        cur.push(o);bytes+=o.bytes;
      });
      if(cur.length)groups.push(cur);
      slog('write: yeni parça gönderiliyor','adet='+news.length+' grup='+groups.length);
      /* "Takıldı" = İLERLEMİYOR, "uzun sürüyor" değil. Büyük bir ilk kayıt onlarca commit
         eder; her biri ilerleme olduğu için gözcünün sayacı burada sıfırlanır, yoksa gözcü
         çalışan bir yazımı ortasından bırakıp baştan başlatır ve iş hiç bitmezdi. */
      let acked=true;
      for(const g of groups){
        if(!await commitOps(fb,col,g))acked=false;
        if(stale())return;
        writeStarted.current=Date.now();
      }
      // Parçaların HEPSİ yerinde → manifest TEK BAŞINA yazılır: durumu çeviren tek atomik adım.
      slog('write: parçalar yazıldı, manifest gidiyor',acked?'':'(onay bekleniyor)');
      /* Manifeste SUNUCU SAATİ de yazılır. Kimin düzenlemesinin daha yeni olduğu ancak ortak
         bir saatle söylenebilir; cihaz saatleri birbirini tutmaz. Bkz. applyRemote. */
      if(!await commitOps(fb,col,[{id:u.uid,data:{userId:u.uid,v:2,n,rev,ids,st:srvStamp()}}]))acked=false;
      /* Bu tur bırakılmışsa (ağ takıldı sanıldı, yerine yenisi başladı) ve şimdi geç de olsa
         döndüyse: yazdığı hâl buluta gitti, ama ekrandaki hâl artık o değil. "Senkron" demek
         ya da lastSynced'i geriye çekmek, yeni turun yazacağını bastırıp cihazı yanlışlıkla
         yeşile boyardı. Bulutu bozmadan çekiliyor; sonucu yeni tur belirler. */
      if(stale())return;
      lastRev.current=rev;prevN.current=n;lastSynced.current=json;lsSave(u.uid,json);
      writeAcked.current=acked;
      /* The cloud has this state now, so any device file it no longer points at is safe to
         let go — checked against the state on screen too, since the coach may have edited
         while the write was in flight. This is the ONLY place device media is deleted. */
      if(_lmCache.size)lmSweep(json,ser(dataRef.current));
      /* Kendi yazımımızın yankısı dinleyicide elenir (hasPendingWrites), o yüzden bulutta
         nelerin durduğunu burada kendimiz güncelleriz — yoksa bir sonraki yazım her şeyi
         yeniden yazardı. Başka bir cihazın daha yeni parçaları da korunur. */
      chunkIds.current=ids.map(h=>({id:chunkDocId(u.uid,h),rev}))
        .concat(known.filter(c=>c.rev>=rev&&!keep.has(c.id)));
      gcOldChunks(fb,u.uid,rev,keep,known);   // artık gösterilmeyenleri arkada temizle (başarısız olsa da veri sağlam)
    }catch(e){
      if(stale())return;   // bırakılmış turun hatası yeni turun durumunu bozmasın
      console.warn('write',e);slog('write: HATA',(e&&e.code)||(e&&e.message)||'?');
      setStatus('error');setSyncErr(e.code||e.message||'unknown');
      writing.current=false;
      const rerun=queued.current;queued.current=false;if(rerun)writeNow();   // yeni değişiklik beklemesin
      return;
    }
    writing.current=false;
    // Yazım sürerken yeni değişiklik geldiyse: yeşil YAKMADAN hemen onu da yaz.
    if(queued.current||ser(dataRef.current)!==json){queued.current=false;writeNow();return;}
    dirty.current=false;   // yazılacak başka bir şey yok: bu hâl ya bulutta ya da yola çıkmış kuyrukta
    if(!writeAcked.current){
      /* Onay zamanında gelmedi. Düzenleme kaybolmadı — diske işlendi ve Firestore onu
         kendisi gönderecek — ama daha BULUTTA DEĞİL, o yüzden yeşil yakmıyoruz. Yeşili,
         yazım oturduğunda dinleyicinin getireceği yankı yakar. */
      setStatus('syncing');slog('write: yola çıktı, onay bekleniyor → SARI',(Date.now()-wT0)+'ms');return;
    }
    setStatus('synced');setSyncErr('');   // yeşil = bulut, ekrandaki halin birebir aynısı
    // Bu süre, uzak cihazın beklemeye BAŞLAYACAĞI andır: düzenleme buradan sonra buluttadır.
    slog('write: bitti → YEŞİL',(Date.now()-wT0)+'ms');
  };

  /* BULUTTAN GELEN HÂLİ UYGULA — ama asla körlemesine üzerine yazma.
     Bu cihazda henüz buluta gitmemiş bir düzenleme varsa (dirty / uçuşan yazım), gelen hâl
     üç yönlü birleştirilir: base = bu cihazın bulutla son mutabık olduğu JSON, local =
     ekrandaki, remote = yeni gelen. Sonuç buluttakinden farklıysa geri yazılır; böylece iki
     cihaz aynı anda çalışırken hiçbir düzenleme kaybolmaz, ikisi de aynı hâle yakınsar.
     Geri yazımı `data` değişiminin tetiklediği debounce turu üstlenir — bunun için birleşmiş
     hâl lastApplied'a YAZILMAZ (yazılsaydı "buluttan geldi, geri yazma" sanılırdı).
     true döner: geri yazılacak bir şey var (yeşil yakma). */
  const applyRemote=(json,parsed,remoteAt)=>{
    const base=ancestor.current;
    const mine=lastSynced.current;   // buluta en son yazdığımız hâl (henüz atası olmadıysa yazımımız uçuşta demektir)
    lastSynced.current=json;ancestor.current=json;
    // Bulutta artık başka bir hâl var: onay bekleyen yazımımızın bekleyeni kalmadı. Ekrandaki
    // hâl bundan farklıysa bunu zaten dirty söyler ve yeni bir tur yazar.
    writeAcked.current=true;
    /* GELEN HÂL BİZİMKİNDEN DAHA MI YENİ? Yalnızca gerçek bir çakışmada — iki cihazın aynı
       alanı farklı bir değere çevirdiği durumda — sorulur; başka her şey zaten kayıpsız
       birleşiyor. Kıyas sunucu saatinde yapılır: uzak yazımın sunucu damgası, bu cihazdaki
       son düzenlemenin ölçülen saat farkıyla sunucu saatine çevrilmiş hâliyle karşılaştırılır.
       Ölçüm yoksa (henüz kendi yazımımızın yankısını görmedik) karar verilemez ve eski
       davranış sürer: ekrandaki kalır. */
    const myAt=(skew.current!=null&&lastEditAt.current)?lastEditAt.current+skew.current:0;
    const preferRemote=!!(remoteAt&&myAt&&remoteAt>myAt);
    /* Yazılmamış düzenleme YOKKEN bile birleştirmek gerekebilir: kendi yazımımız buluta
       gitmiş ama ortak ata olarak dönmemişse, gelen hâl bizimkiyle aynı tabandan yazılmış
       rakip bir yazım olabilir. */
    const pending=dirty.current||writing.current||queued.current||(mine!=null&&mine!==base);
    /* ATA YOKKEN DE BİRLEŞTİR. Ortak ata yalnızca dinleyici yeniden kurulduğunda ya da
       kurtarma turundan sonra boş kalır; tam o anda buluttan gelen hâli ekrandakinin üstüne
       YAZMAK, o sırada yapılmış ama henüz gönderilmemiş düzenlemeyi sessizce siliyordu.
       Atasız birleştirme hiçbir şeyi silmez, iki tarafı da korur (bkz. mergeCloud).
       Ekranda gerçek veri yokken (açılıştaki örnek takım) bu yola hiç girilmez: örnek takımı
       koçun bulutuna karıştırmanın âlemi yok. */
    if(pending&&base!==json&&(base!=null||hasRealData(dataRef.current))){
      const{state,changed,stats}=mergeCloud(base,dataRef.current,parsed,preferRemote);
      if(changed){
        dataRef.current=state;setData(state);
        dirty.current=true;
        if(stats.conflicts)setSyncNote(preferRemote
          ?'Aynı alan iki cihazda birden değiştirilmişti; daha sonra yapılan (diğer cihazdaki) değişiklik geçerli oldu.'
          :'Aynı alan iki cihazda birden değiştirilmişti; daha sonra yapılan (bu cihazdaki) değişiklik geçerli oldu.');
        return true;
      }
      // Birleşme buluttakiyle aynı çıktı → yerel düzenleme zaten uzakta var.
      if(!deq(state,dataRef.current)){dataRef.current=state;lastApplied.current=state;setData(state);}
      dirty.current=false;return false;
    }
    /* Gelen hâl ekrandakinin aynısı mı? Bu soru eskiden İKİ tam serileştirmeyle
       yanıtlanıyordu: uzak durum baştan sona JSON'a çevriliyor, ekrandaki de öyle, sonra
       dizgiler karşılaştırılıyordu. Birkaç MB'lık bir durumda tek bir uzak görüntü için
       telefonun ana iş parçacığında yüzlerce ms — hem de yanıtı çoğu zaman ilk alanda
       belli olan bir soru için. `deq` ilk farkta duruyor ve hiçbir şey ayırmıyor. */
    if(!deq(parsed,dataRef.current)){dataRef.current=parsed;lastApplied.current=parsed;setData(parsed);}
    dirty.current=false;return false;
  };

  /* Parçalar rev'e göre gruplanır: byRev[rev][i] = parça. Aynı i'nin birden çok rev'i
     bir arada bulunabildiği için (yeni kayıt eskiyi silmeden yazar) yalnızca indekse göre
     anahtarlamak setleri birbirinin üstüne düşürürdü. */
  const groupChunks=docs=>{
    const byRev={};
    docs.forEach(v=>{if(!v||typeof v.i!=='number'||typeof v.c!=='string')return;
      const r=(typeof v.rev==='number')?v.rev:0;(byRev[r]=byRev[r]||{})[v.i]=v;});
    return byRev;
  };

  // manifest.rev ile eşleşen n parçayı birleştir; eksikse null (tutarsız ara durum → bekle)
  const assemble=(manifest,byRev)=>{
    const g=byRev[manifest.rev];if(!g)return null;
    const parts=[];
    for(let i=0;i<manifest.n;i++){const ch=g[i];if(!ch)return null;parts.push(ch.c);}
    return parts.join('');
  };

  /* İçerik adresli parçalar: hash → içerik. Manifest'in ids listesi bu haritadan SIRAYLA
     birleştirilir; biri eksikse null döner (yarıda kalmış yazım ya da henüz inmemiş parça
     → tutarsız ara durum, beklenir). */
  const indexByHash=docs=>{const m={};
    docs.forEach(v=>{if(v&&typeof v.c==='string'&&typeof v.h==='string')m[v.h]=v.c;});return m;};
  const assembleIds=(manifest,byHash)=>{
    const ids=manifest.ids;if(!Array.isArray(ids))return null;
    const parts=[];
    for(let i=0;i<ids.length;i++){const c=byHash[ids[i]];if(c==null)return null;parts.push(c);}
    return parts.join('');
  };
  // Manifest hangi düzendeyse ondan birleştir: ids varsa içerik adresli (yeni), yoksa rev+indeks (eski).
  const assembleFrom=(manifest,byHash,byRev)=>
    Array.isArray(manifest.ids)?assembleIds(manifest,byHash):assemble(manifest,byRev);

  // KURTARMA: manifest parçalarla tutuşmuyorsa (yarıda kalmış eski bir yazım), parçaların kendi
  // rev'lerinden en yeni tutarlı seti bul: 0'dan itibaren ardışık parçaları birleştir, JSON.parse
  // doğrularsa geçerli say. Böylece "sync sarıda takılı, veri boş" kilidi kendiliğinden açılır.
  const assembleAny=byRev=>{
    const revs=Object.keys(byRev).map(Number).sort((a,b)=>b-a);   // en yeni rev önce
    for(const rev of revs){
      const g=byRev[rev];const parts=[];
      for(let i=0;g[i];i++)parts.push(g[i].c);
      if(!parts.length)continue;
      const json=parts.join('');
      try{JSON.parse(json);return{json,n:parts.length,rev};}catch(e){/* eksik/kesik set → sonraki rev */}
    }
    return null;
  };

  /* SON ÇARE (yalnızca eski, üzerine-yazan şemadan kalan bozuk bulutlar için):
     bir rev'in eksik parçalarını aynı indeksin başka rev'lerdeki kopyasıyla doldur.
     Sonuç yalnızca geçerli JSON ise kabul edilir; yine de karışık bir kayıttan gelmiş
     olabileceği için kullanıcıya haber verilir ve yedek alması istenir. */
  const spliceRecover=byRev=>{
    const revs=Object.keys(byRev).map(Number).sort((a,b)=>b-a);
    for(const rev of revs){
      const g=byRev[rev];const idx=Object.keys(g).map(Number).sort((a,b)=>a-b);
      if(!idx.length)continue;
      const max=idx[idx.length-1];const parts=[];let ok=true;
      for(let i=0;i<=max;i++){
        let ch=g[i];
        if(!ch)for(const r of revs){if(r!==rev&&byRev[r][i]){ch=byRev[r][i];break;}}   // en yeni başka rev'den ödünç
        if(!ch){ok=false;break;}
        parts.push(ch.c);
      }
      if(!ok)continue;
      const json=parts.join('');
      try{const d=JSON.parse(json);if(hasRealData(migrate(d)))return{json,n:max+1,rev};}catch(e){}
    }
    return null;
  };

  /* Bir yazım BİRDEN ÇOK batch'e bölündüğünde (durum büyükse) commit'ler tek tek gider:
     ilk batch geçtikten sonra, manifest'i taşıyan son batch gelmeden önce sunucudaki hâl
     KISA SÜRELİĞİNE tutarsızdır (parçaların bir kısmı yeni rev'de, manifest hâlâ eski).
     Dinleyici bu ara durumu kalıcı bozulma sanıp kırmızı "Buluttaki veri parçaları tutarsız"
     uyarısını basıyordu — oysa saniyesinde kendiliğinden düzeliyor. Artık: ara durumda sarıda
     bekle, kısa bir süre sonra sunucuya bak; hâlâ tutarsızsa ve elimizde gerçek veri varsa
     durumu buluta yeniden yazarak bulutu ONAR. Hata ancak bunların hepsi başarısız olursa. */
  const SETTLE_MS=8000;
  const INCONSISTENT_MSG='Buluttaki veri parçaları tutarsız. Sayfayı yenile; düzelmezse Backup dosyanı içe aktar — verin silinmedi.';
  const clearSettle=()=>{if(settle.current){clearTimeout(settle.current);settle.current=null;}};

  // Sunucudan taze oku: {json,n} ya da null (hâlâ tutarsız). Kurtarılan set için manifesti de tazeler.
  const readServer=async(fb,uid)=>{
    const snap=await fb.firestore().collection(COL).where('userId','==',uid).get({source:'server'});
    let manifest=null;const docs=[];
    snap.forEach(d=>{const v=d.data();if(!v)return;
      if(d.id===uid&&(Array.isArray(v.ids)||typeof v.n==='number'))manifest=v;else docs.push(v);});
    const byRev=groupChunks(docs);
    const byHash=indexByHash(docs);
    const found=docs.some(v=>v&&typeof v.c==='string');
    if(manifest){
      const json=assembleFrom(manifest,byHash,byRev);
      if(json!=null)return{json,n:manifest.n,rev:manifest.rev,at:stampMs(manifest.st),found,byRev};
    }
    const rec=assembleAny(byRev);
    if(rec){
      try{await fb.firestore().collection(COL).doc(uid).set({userId:uid,n:rec.n,rev:rec.rev,st:srvStamp()});}catch(e){console.warn('manifest heal',e);}
      return{json:rec.json,n:rec.n,rev:rec.rev,at:0,found,byRev};
    }
    return{json:null,n:0,rev:0,at:0,found,byRev};
  };

  // Tutarsız ara durum: sunucuya tekrar bak → düzeldiyse uygula, düzelmediyse yerelden geri yaz.
  const healInconsistent=async(fb,uid)=>{
    if(healing.current)return;
    if(writing.current||queued.current){waitThenHeal(fb,uid);return;}   // yazımımız sürüyor → ara durum bizim, tekrar bekle
    healing.current=true;
    try{
      const{json,n,rev,at,byRev}=await readServer(fb,uid);
      if(json!=null){
        let parsed=null;try{parsed=migrate(JSON.parse(json));}catch(e){}
        if(parsed){
          prevN.current=n;lastRev.current=Math.max(lastRev.current,rev||0);
          ready.current=true;
          const back=applyRemote(json,parsed,at||0);   // onarım turu da yereldeki düzenlemeyi ezmez
          lsSave(uid,json);
          setSyncErr('');
          if(!back){setStatus('synced');setSyncNote('');}
          return;
        }
      }
      /* Buradan sonrası, ESKİ (üzerine-yazan) şemadan kalmış bozuk bulutlar içindir: hiçbir
         rev'den eksiksiz set çıkmıyor. Bulutu ne olursa olsun ezmeden önce sırayla dene.
         Ne bulunduğunu konsola da yaz — sorun sürerse tanı koymayı kolaylaştırır. */
      const revs=Object.keys(byRev||{});
      console.warn('cloud inconsistent · rev sayısı:',revs.length,
        revs.map(r=>r+': '+Object.keys(byRev[r]).length+' parça').join(' | '));

      // 1) Bu tarayıcıdaki son TUTARLI kopya (en güvenli kaynak).
      const local=lsLoad(uid);
      if(local){
        let lp=null;try{lp=migrate(JSON.parse(local));}catch(e){}
        if(lp&&hasRealData(lp)){
          dataRef.current=lp;lastApplied.current=lp;setData(lp);
          ready.current=true;lastSynced.current=null;
          await writeNow();                                   // bulutu bu kopyadan yeniden kur
          if(lastSynced.current!=null)setSyncNote('Buluttaki kayıt yarıda kalmıştı; bu cihazdaki son kopyadan geri yüklendi. Son değişikliklerini gözden geçir.');
          return;
        }
      }

      // 2) Ekranda hâlâ gerçek veri duruyorsa onu yaz.
      if(hasRealData(dataRef.current)){
        ready.current=true;lastSynced.current=null;
        await writeNow();
        return;                                               // hata olduysa writeNow yazdı
      }

      // 3) Son çare: parçaları rev'ler arası birleştirip geçerli JSON çıkarmayı dene.
      const spliced=byRev?spliceRecover(byRev):null;
      if(spliced){
        const sp=migrate(JSON.parse(spliced.json));
        dataRef.current=sp;lastApplied.current=sp;setData(sp);
        ready.current=true;lastSynced.current=null;
        await writeNow();
        if(lastSynced.current!=null)setSyncNote('Buluttaki kayıt yarıda kalmıştı; veri parçalardan kurtarıldı. En son yaptığın birkaç değişiklik eksik olabilir — kontrol edip Backup al.');
        return;
      }

      setStatus('error');setSyncErr(INCONSISTENT_MSG);
    }catch(e){console.warn('heal',e);setStatus('error');setSyncErr(INCONSISTENT_MSG);}
    finally{healing.current=false;}
  };

  // Ara durumu hemen hata sayma: sarıda bekle, SETTLE_MS sonra sunucuya bak.
  const waitThenHeal=(fb,uid)=>{
    if(settle.current)return;
    setStatus('syncing');setSyncErr('');
    settle.current=setTimeout(()=>{settle.current=null;healInconsistent(fb,uid);},SETTLE_MS);
  };

  // Sunucudan elle çek
  const forcePull=async()=>{
    const fb=FB();const u=userRef.current;if(!fb||!u)return;
    clearSettle();
    setStatus('syncing');
    let pulled=false;
    try{
      const{json,n,rev,at,found}=await withTimeout(readServer(fb,u.uid),SERVER_READ_MS);   // manifest bozuksa parçalardan kurtarır
      if(json==null){
        // Parçalar duruyor ama hiçbir tutarlı set çıkmıyor → onarım turu (asla üzerine yazma).
        if(found){await healInconsistent(fb,u.uid);return;}
        // Bulutta gerçekten parça yok; yerel durum korunur.
      }else{
        prevN.current=n;lastRev.current=Math.max(lastRev.current,rev||0);
        ready.current=true;
        const parsed=migrate(JSON.parse(json));
        pulled=applyRemote(json,parsed,at||0);   // elle çekmek de yazılmamış düzenlemeyi silmez, birleştirir
        lsSave(u.uid,json);
      }
      ready.current=true;setSyncErr('');
      if(!pulled)setStatus('synced');
    }catch(e){console.warn('forcePull',e);slog('kurtarma çekimi: HATA',(e&&e.code)||(e&&e.message)||'?');
      setStatus('error');setSyncErr(e.code||e.message||'unknown');}
  };

  // Auth durumu
  useEffect(()=>{
    const fb=FB();
    if(!fb){setAuthLoading(false);return;}
    fb.auth().getRedirectResult().catch(e=>{
      const m={'auth/unauthorized-domain':'Bu domain Firebase\'de yetkili değil. Authentication → Settings → Authorized domains listesine bu sitenin adresini ekle.',
        'auth/operation-not-allowed':'Google girişi Firebase Console\'da etkin değil.',
        'auth/account-exists-with-different-credential':'Bu e-posta başka bir yöntemle kayıtlı.',
        'auth/network-request-failed':'İnternet bağlantısı hatası.'}[e.code]||(e.code?e.code+': '+e.message:e.message);
      setAuthErr(m);
    });
    return fb.auth().onAuthStateChanged(u=>{
      setAuthLoading(false);
      /* Anonim oturum bu uygulamanın hesabı DEĞİL: burada giriş yalnızca e-posta ya da
         Google ile yapılıyor, anonim girişi kullanan tek yer sporcunun check-in formu.
         Form artık kendi Firebase uygulaması altında çalıştığı için koçun oturumunun
         üstüne yazamıyor; ama bu düzeltmeden ÖNCE formu açmış bir tarayıcıda o anonim
         oturum hâlâ duruyor olabilir. Onu hesap sanıp boş bir kadroyla açılmak yerine
         atıyoruz — kullanıcı giriş ekranını görür, bir kere girer ve slot temizlenir. */
      if(u&&u.isAnonymous){fb.auth().signOut().catch(()=>{});return;}
      if(!u){
        ready.current=false;lastSynced.current=null;ancestor.current=null;prevUid.current=null;prevN.current=0;lastRev.current=0;chunkIds.current=[];
        if(timer.current){clearTimeout(timer.current);timer.current=null;}
        clearSettle();
        setData(makeDefault());setStatus('offline');setSyncErr('');setUser(null);
        return;
      }
      if(prevUid.current&&prevUid.current!==u.uid){ready.current=false;lastSynced.current=null;ancestor.current=null;prevN.current=0;lastRev.current=0;chunkIds.current=[];setData(makeDefault());}
      prevUid.current=u.uid;
      setUser(u);
    });
  },[]);

  // CANLI DİNLEYİCİ: manifest + parçalar (+ eski formatlardan tek seferlik geçiş)
  useEffect(()=>{
    const fb=FB();if(!fb||!user)return;
    /* Dinleyici İKİ sebeple kurulur: hesap değişti (sıfırdan) ya da eskisi ölüp yenisi
       geliyor (yeniden). İkisi aynı şey değil. Yeniden kurarken lastSynced/ancestor'ı
       silmek, o anda gönderilmemiş bir düzenleme varsa onu birleştirilecek tabansız
       bırakıyordu — kurtarma turunun veri kaybettirmesi tam olarak böyle olurdu. Bu yüzden
       hafıza yalnızca hesap gerçekten değiştiğinde temizlenir. */
    const fresh=subFresh.current!==user.uid;
    subFresh.current=user.uid;
    slog('dinleyici: kuruluyor',(fresh?'yeni':'yeniden')+' uid='+user.uid.slice(0,6));
    setStatus('syncing');ready.current=false;
    if(fresh){lastSynced.current=null;ancestor.current=null;prevN.current=0;lastRev.current=0;chunkIds.current=[];idsJson.current=[];skew.current=null;}
    docCache.current=new Map();   // yeni dinleyici tüm dokümanları 'eklendi' olarak getirir
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    clearSettle();
    /* ÜST VERİ DEĞİŞİMLERİNİ DE İSTE. Varsayılan dinleyici yalnızca BELGE içeriği
       değiştiğinde uyanır; "önbellekten geldi → sunucudan geldi" ve "bekleyen yazım var →
       yazım oturdu" geçişleri ise yalnızca ÜST VERİ değişimidir. Bu yüzden istenmedikçe
       haber verilmez — ve cihazın kilitlenmesinin sebebi tam olarak buydu:
       bir anlık görüntü "bekleyen yazım var" diye atlanıyor, o yazımlar sonra oturuyor
       ama içerik aynı kaldığı için dinleyici BİR DAHA HİÇ uyanmıyordu. ready hiçbir
       zaman true olmuyor, ready false olduğu için writeNow ilk satırında dönüyor, hiçbir
       şey yazılamıyor ve gösterge sonsuza kadar sarıda kalıyordu. Firestore'un bekleyen
       yazım kuyruğu IndexedDB'de saklandığı için de sayfayı yenilemek kurtarmıyordu:
       yenilenen sekme aynı kuyrukla açılıp aynı yere düşüyordu. */
    /* KAÇIŞ TURU. Yukarıdaki açılma kontrolü yalnızca YENİ bir anlık görüntü geldiğinde
       çalışır; dinleyicinin bir daha hiç uyanmadığı durum ise tam olarak kurtarmak
       istediğimiz durumdur. O yüzden zamanlayıcıya bağlı: hâlâ hazır değilsek sunucudan
       doğrudan çekmeyi dener. Başarırsa cihaz açılır ve yeşile döner; başaramazsa hata
       kodunu gösterir — ikisi de sessiz sarıdan iyidir. Hazır olana kadar seyrekleşerek
       tekrar dener. */
    const armPendEscape=()=>{
      if(pendTimer.current||ready.current)return;
      const again=()=>{
        pendTimer.current=null;
        if(ready.current)return;
        slog('kurtarma çekimi: deneniyor');
        Promise.resolve(forcePull()).catch(()=>{}).then(()=>{
          if(!ready.current&&!pendTimer.current)pendTimer.current=setTimeout(again,30000);
        });
      };
      pendTimer.current=setTimeout(again,PEND_STUCK_MS+500);
    };
    startedAt.current=Date.now();
    const unsub=fb.firestore().collection(COL).where('userId','==',user.uid)
      .onSnapshot({includeMetadataChanges:true},async snap=>{
        try{
          const t0=Date.now();   // bu görüntünün İŞLENMESİ ne kadar sürdü (aşağıdaki ölçüm için)
          // Sunucuyla temas var mı? (yazım öncesi güvenlik okumasının gerekip gerekmediğini bu söyler)
          const _cache=!!(snap.metadata&&snap.metadata.fromCache),_pend=!!(snap.metadata&&snap.metadata.hasPendingWrites);
          /* Bu satır teşhisin kilit taşı: kaynak SUNUCU mu ÖNBELLEK mi? Her anlık görüntü
             sürekli önbellekten geliyorsa cihaz Firestore'a hiç bağlanamıyor demektir ve
             sarıda kalmasının sebebi kodun mantığı değil, taşıma katmanıdır. */
          if(!_cache){sawServer.current=true;lastServerAt.current=Date.now();
            // Bu taşıma gerçekten sunucuya ulaşıyor → bu cihazın seçimi olarak saklansın.
            if(typeof window.__fsTransportWorks==='function')window.__fsTransportWorks();}
          snapCount.current++;lastDocs.current=snap.size;
          slog('snap',(_cache?'ÖNBELLEK':'SUNUCU')+' dok='+snap.size+(_pend?' bekleyen-yazım':''));
          if(!(snap.metadata&&snap.metadata.fromCache))fromServer.current=true;
          /* SADECE DEĞİŞEN DOKÜMAN AÇILIR. Anlık görüntü sorguya uyan TÜM dokümanları taşır
             ve her birinde d.data() çağırmak, dokümanı baştan çözmek demektir: birkaç MB'lık
             bir durum ~200 parçadır, üstüne bir de henüz toplanmamış eskiler biner ve bu iş
             HER yazımın yankısında yeniden yapılırdı. Dinleyicinin zamanla ağırlaşmasının —
             "önce hızlı, bir süre sonra yavaş" — asıl sebebi buydu. Artık yalnızca değişen
             dokümanlar çözülüp elde tutulan haritaya işleniyor; boyutlar tutmazsa (olmaması
             gerekir) harita anlık görüntüden bir kez baştan kuruluyor. */
          const cache=docCache.current;
          snap.docChanges().forEach(ch=>{
            if(ch.type==='removed')cache.delete(ch.doc.id);
            else cache.set(ch.doc.id,ch.doc.data());
          });
          if(cache.size!==snap.size){cache.clear();snap.forEach(d=>cache.set(d.id,d.data()));}
          /* Kendi yazımımızın yankısı atlanır — ama sonsuza kadar değil. Yukarıdaki
             üst veri aboneliği normalde yazım oturur oturmaz bizi uyandırır. Uyandırmıyorsa
             (kuyrukta oturmayan bir kayıt kalmışsa) cihazı ölü bırakmaktansa, bir süre sonra
             bu görüntüden AÇILIR: veriyi okur, ready olur, uygulama yeniden yazabilir hâle
             gelir. Yeşil yakılmaz — bu hâl henüz bulutta değil, ekranda.

             AMA "BEKLEYEN YAZIM VAR" GÖRÜNTÜNÜN TAMAMI İÇİN SÖYLENİR, MANİFEST İÇİN DEĞİL.
             `snap.metadata.hasPendingWrites`, sorguya uyan dokümanlardan HERHANGİ BİRİNDE
             oturmamış bir yerel yazım varsa doğrudur: yarıda kalmış bir turun parçası, çöp
             toplayıcının sildiği bir doküman, cebe girerken kesilen bir commit… Oysa durumu
             çeviren tek şey manifesttir. Eskiden bu ayrım yoktu: bu cihazın tek bir oturmamış
             yazımı varken gelen HER görüntü — içinde masaüstünün yepyeni manifesti dursa
             bile — "kendi yankımız" sayılıp atlanıyordu. Telefonun, bilgisayarda yazılan
             antrenmanı ekranda hiç göstermemesinin sebebi buydu; üstelik görüntüler gelmeye
             devam ettiği için gözcünün "sunucudan ses yok" dalı da hiç açılmıyordu, yani
             cihazı bu körlükten çıkaracak kimse yoktu.
             Ayrım manifestin KİMİN olduğuna bakılarak yapılır: rev'i bu cihazın yazdığı
             rev'lerden biriyse görüntü gerçekten kendi yankımızdır ve eskisi gibi atlanır;
             değilse bulutta BAŞKA bir cihazın hâli duruyor demektir ve okunmalıdır. Yeşil
             yine yakılmaz (fromPending) — kendi yazımımız hâlâ yolda. */
          if(snap.metadata&&snap.metadata.hasPendingWrites){
            const mf=cache.get(user.uid);
            const mfMine=!mf||typeof mf.rev!=='number'||myRevs.current.has(mf.rev);
            if(mfMine){
              if(ready.current){slog('snap: atlandı (kendi yankımız)');return;}
              if(!pendSince.current)pendSince.current=Date.now();
              if(Date.now()-pendSince.current<PEND_STUCK_MS){
                slog('snap: atlandı (kendi yankımız, henüz hazır değiliz)');
                armPendEscape();
                return;
              }
              slog('snap: bekleyen yazım oturmuyor → yine de okunuyor');
            }else{
              slog('snap: bekleyen yazımımız var, ama manifest başka cihazın → okunuyor','rev='+mf.rev);
              pendSince.current=0;
              if(pendTimer.current){clearTimeout(pendTimer.current);pendTimer.current=null;}
            }
            fromPending.current=true;   // bu turda yeşil yakma, lastSynced'i buradan kurma
          }else{pendSince.current=0;fromPending.current=false;
            if(pendTimer.current){clearTimeout(pendTimer.current);pendTimer.current=null;}}
          let manifest=null,url=null,icerik=null;const chunkDocs=[];const ids=[];const oldDocs=[];
          cache.forEach((v,docId)=>{if(!v)return;
            if(docId===user.uid&&(Array.isArray(v.ids)||typeof v.n==='number'))manifest=v;   // manifest
            else if(typeof v.c==='string'){chunkDocs.push(v);              // parça (yeni: h, eski: i+rev)
              ids.push({id:docId,rev:(typeof v.rev==='number')?v.rev:0});}
            else if(typeof v.url==='string')url=v.url;                     // eski: Storage pointer
            else if(typeof v.icerik==='string')icerik=v.icerik;           // eski: tek-doküman
            else oldDocs.push(v);});                                       // eski: per-entity
          chunkIds.current=ids;                      // artık gösterilmeyenleri sonra bedelsiz silebilmek için
          const chunks=groupChunks(chunkDocs);       // eski düzen: rev → {i: parça}
          const byHash=indexByHash(chunkDocs);       // yeni düzen: hash → içerik
          if(manifest){
            /* AYNI MANİFEST → AYNI DİZGİ. Parça adları içeriğin hash'i olduğundan bir
               manifestin id listesi, birleşecek dizginin birebir kimliğidir: liste aynıysa
               birleşecek şey de aynıdır. Bu bir tahmin değil, içerik adreslemenin kendisi —
               aynı listeyle farklı bir durum birleşemez.
               Son iki hâl saklanır, çünkü bir yazım birden çok commit'tir: önce parçalar,
               sonra manifest. Arada bulut BİZİM ürettiğimiz bir ara hâli gösterir (parçalar
               yeni, manifest hâlâ eski) ve dinleyici onu da, ardından gelen asıl yankıyı da
               görür. Eskiden ikisi için de birkaç MB'lık dizgi baştan birleştirilip baştan
               karşılaştırılıyordu; düzenleme başına ödenen en büyük kalemlerden biriydi.
               İkisi de artık hatırlanan dizgiye düşüyor — hiç birleştirme yok — ve aşağıdaki
               `json===lastSynced` karşılaştırması aynı dizgi NESNESİ üzerinden yapıldığı için
               bedelsiz. Uzak bir cihazın yazdığı yeni bir hâl listede olmadığından her zaman
               normal yoldan birleştirilir: hiçbir uzak değişiklik bu yüzden atlanmaz. */
            const idsKey=Array.isArray(manifest.ids)?manifest.ids.join('|'):null;
            const hit=idsKey!=null?idsJson.current.find(e=>e.key===idsKey):null;
            let json=hit?hit.json:assembleFrom(manifest,byHash,chunks);
            if(!hit&&idsKey!=null&&json!=null)idsJson.current=[{key:idsKey,json},idsJson.current[0]].filter(Boolean);
            let healed=null;
            if(json==null){
              // Manifest ile parçalar tutuşmuyor (yarıda kalmış eski yazım) → parçalardan kurtar.
              // Sunucu henüz tüm parçaları göndermediyse (fromCache) kurtarmaya kalkma, bekle.
              if(snap.metadata&&snap.metadata.fromCache){slog('snap: manifest/parça tutmuyor, önbellek → bekleniyor');armPendEscape();return;}
              // Kendi çok-batch'li yazımımız hâlâ uçuşta → bu ara durumu biz üretiyoruz, bekle.
              if(writing.current||queued.current){slog('snap: ara durum, kendi yazımımız uçuşta → bekleniyor');armPendEscape();return;}
              slog('snap: manifest/parça tutmuyor → onarılıyor');
              healed=assembleAny(chunks);
              if(!healed){waitThenHeal(fb,user.uid);return;}   // ara durum olabilir → sarıda bekle, sonra onar
              json=healed.json;
              try{await fb.firestore().collection(COL).doc(user.uid).set({userId:user.uid,n:healed.n,rev:healed.rev,st:srvStamp()});}catch(e){console.warn('manifest heal',e);}
            }
            clearSettle();   // tutarlı hâl geldi → bekleyen onarım turuna gerek yok
            if(!ready.current)slog('snap: HAZIR (manifest okundu)');
            /* SAAT FARKINI KENDİ YAZIMIMIZIN YANKISINDAN ÖLÇ. Manifestteki rev, onu yazan
               cihazın kendi Date.now()'ıdır; st ise aynı yazımın SUNUCUDAKİ saatidir. İkisi
               yalnızca yazan cihaz BİZSEK kıyaslanabilir — o zaman fark, bu cihazın saatinin
               sunucudan ne kadar sapmış olduğunu verir. Başka bir cihazın rev'i bize bir şey
               söylemez, bu yüzden ölçüm yalnızca kendi rev'lerimizden yapılır. */
            const mAt=stampMs(manifest.st);
            if(mAt&&typeof manifest.rev==='number'&&myRevs.current.has(manifest.rev))
              skew.current=mAt-manifest.rev;
            ready.current=true;prevN.current=healed?healed.n:manifest.n;
            lastRev.current=Math.max(lastRev.current,(healed?healed.rev:manifest.rev)||0);
            if(json===lastSynced.current){
              // Kendi yazımımızın yankısı: bulut onu gösterdiğine göre artık ortak atadır
              // ve onay beklemesi de bitmiştir — bulutta duran şey bu.
              ancestor.current=json;writeAcked.current=true;
              // Yerelde henüz yazılmamış değişiklik varken YEŞİL YAKMA
              if(!dirty.current&&!writing.current&&!fromPending.current){setStatus('synced');setSyncErr('');}
              return;
            }
            let parsed;try{parsed=migrate(JSON.parse(json));}catch(e){return;}  // tutarsız → bekle
            lsSave(user.uid,json);   // cihazda emniyet kopyası: bulut bir daha okunamazsa buradan dönülür
            const back=applyRemote(json,parsed,mAt);   // yerel düzenleme varsa birleştirir, ezmez
            setSyncErr('');
            /* ZİNCİRİN NEREDE GEÇTİĞİNİ ÖLÇ. "Telefonda geç görünüyor" tek bir belirti ama
               arkasında iki ayrı süre var ve bunlar birbirinden ayrılmadan hiçbir düzeltme
               doğrulanamaz:
                 ağ     = uzak yazım SUNUCUYA işlendiği andan bu cihazın onu eline aldığı ana
                          kadar geçen süre (taşıma/dinleyici katmanı),
                 işleme = görüntüyü çözüp birleştirip ekrana koymak (bu cihazın CPU'su).
               Ağ ölçümü ortak bir saat ister: uzak manifestin sunucu damgası, bu cihazın
               saatiyle ancak ölçülmüş fark (skew) üzerinden kıyaslanabilir. Fark yalnızca
               kendi yazımımızın yankısından öğrenilir, o yüzden hiç yazmamış bir cihazda ağ
               süresi bilinmez ve basılmaz — uydurulmuş bir sayı basmaktansa boş bırakılır. */
            const netMs=(mAt&&skew.current!=null)?Math.round(Date.now()+skew.current-mAt):-1;
            slog('snap: uzak hâl uygulandı',
              (netMs>=0?'ağ='+netMs+'ms ':'')+'işleme='+(Date.now()-t0)+'ms '+
              (back?'geri yazılacak var':(fromPending.current?'(bekleyen yazım var, sarı kalıyor)':'→ YEŞİL')));
            if(!back&&!fromPending.current)setStatus('synced');   // geri yazılacak varsa yeşili yazım turu yakar
            if(url||icerik||oldDocs.length)cleanupLegacy(fb,user.uid);
          }else if(chunkDocs.length){
            // Parçalar var ama manifest yok (ilk yazım yarıda kalmış ya da manifest silinmiş).
            // "Bulut boş" sanıp üzerine yazmak veriyi uçururdu → parçalardan kurtar, manifesti tazele.
            if(snap.metadata&&snap.metadata.fromCache){slog('snap: manifest yok, önbellek → bekleniyor');armPendEscape();return;}
            if(writing.current||queued.current){slog('snap: manifest yok, kendi yazımımız uçuşta → bekleniyor');armPendEscape();return;}
            slog('snap: manifest yok → parçalardan kurtarılıyor');
            const rec=assembleAny(chunks);
            if(!rec){waitThenHeal(fb,user.uid);return;}
            clearSettle();ready.current=true;prevN.current=rec.n;lastRev.current=Math.max(lastRev.current,rec.rev||0);
            try{await fb.firestore().collection(COL).doc(user.uid).set({userId:user.uid,n:rec.n,rev:rec.rev,st:srvStamp()});}catch(e){console.warn('manifest heal',e);}
            let back=false;
            if(rec.json!==lastSynced.current){
              let parsed;try{parsed=migrate(JSON.parse(rec.json));}catch(e){return;}
              back=applyRemote(rec.json,parsed);
            }
            setSyncErr('');
            // Yerelde yazılmamış değişiklik varken yeşil yakma
            if(!back&&!dirty.current&&!writing.current&&!fromPending.current)setStatus('synced');
          }else if(oldDocs.length){
            // GEÇİŞ: eski per-entity → parçalı
            ready.current=true;const state=stateFromOldDocs(oldDocs);dataRef.current=state;lastApplied.current=state;setData(state);
            if(hasRealData(state)){lastSynced.current=null;await writeNow();if(lastSynced.current!=null)await cleanupLegacy(fb,user.uid);}
            else lastSynced.current=ser(state);
            setStatus('synced');
          }else if(icerik!=null){
            // GEÇİŞ: ara {icerik} → parçalı
            ready.current=true;let parsed;try{parsed=migrate(JSON.parse(icerik));}catch(e){parsed=makeDefault();}
            dataRef.current=parsed;lastApplied.current=parsed;setData(parsed);
            if(hasRealData(parsed)){lastSynced.current=null;await writeNow();if(lastSynced.current!=null)await cleanupLegacy(fb,user.uid);}
            else lastSynced.current=ser(parsed);
            setStatus('synced');
          }else if(url){
            // GEÇİŞ: eski Storage pointer → veriyi indirip parçalıya taşımayı DENE
            ready.current=true;
            try{
              const json=await tryDownload(url);
              lastSynced.current=null;const parsed=migrate(JSON.parse(json));dataRef.current=parsed;lastApplied.current=parsed;setData(parsed);
              await writeNow();if(lastSynced.current!=null)await cleanupLegacy(fb,user.uid);
              setStatus('synced');
            }catch(e){
              // Storage'dan indirilemedi (403 vb.) → default'u YAZMA (pointer'ı ezme); kullanıcı backup import etsin
              lastSynced.current=ser(dataRef.current);
              setStatus('error');
              setSyncErr('Eski verin önceki sürümde Firebase Storage\'a kaydedilmiş ve oradan indirilemiyor. Kurtarmak için: Firebase Console → Storage → Files → users/'+user.uid+'/state.json dosyasını indir, sonra bu uygulamada Backup → "Load Backup" ile o dosyayı içe aktar. İçe aktarınca veri otomatik olarak yeni (parçalı) sisteme kaydedilir.');
            }
          }else{
            // Bulutta hiç veri yok
            if(snap.metadata&&snap.metadata.fromCache){slog('snap: bulut boş görünüyor, önbellek → sunucu bekleniyor');armPendEscape();return;}
            slog('snap: bulutta veri yok');
            ready.current=true;
            if(hasRealData(dataRef.current)){lastSynced.current=null;await writeNow();}
            else{lastSynced.current=ser(dataRef.current);setStatus('synced');}
          }
        }catch(e){console.warn('sync',e);slog('snap: HATA',(e&&e.code)||(e&&e.message)||'?');
          setStatus('error');setSyncErr(e.code||e.message||'unknown');}
      },err=>{console.warn('sync sub',err);slog('dinleyici: HATA',(err&&err.code)||(err&&err.message)||'?');
        /* DİNLEYİCİ ÖLDÜ. Eskiden burada yalnızca kırmızı yakılıyordu ve abonelik bir daha
           hiç kurulmuyordu: cihaz, sayfa yenilenene kadar ne uzak değişikliği görüyor ne de
           yazabiliyordu. İzin hatası gerçekten kalıcıdır (kural sorunu, tekrar denemek
           faydasız); gerisi geçicidir ve gözcü kısa süre sonra yeniden abone eder. */
        const c=(err&&err.code)||'';
        setSyncErr(err.code||err.message||'unknown');
        if(c==='permission-denied'){setStatus('error');return;}
        setStatus('syncing');resub.current=Date.now();});
    return ()=>{clearSettle();if(pendTimer.current){clearTimeout(pendTimer.current);pendTimer.current=null;}
      pendSince.current=0;fromPending.current=false;unsub();};
  },[user,subTick]);

  /* Bekleyen görselleri buluta taşı — senkronlanan JSON küçük kalsın.
     Storage kapalıyken çekilen fotoğraf cihazda `local:` tutamağıyla duruyor; bulut
     açılınca (kurallar yayınlanınca / ağ dönünce) burada Storage'a yükleniyor ve
     durumdaki tutamak gerçek URL ile değişiyor, böylece diğer cihazlarda da görünüyor.
     Eski sürümlerden kalan gömülü base64 de aynı geçişte dışarı alınıyor. */
  const lifting=useRef(false);
  /* Kurtarma: cihazda dosyası olan her `local:` tutamağı, buluta hiç dokunmadan durumun
     içine geri yazılır. Yükleme turunu beklemez — fotoğraf, veri gelir gelmez görünür.
     Tur her düzenlemeden sonra yeniden koşar (buluttan yeni bir tutamak inmiş olabilir),
     ama artık bir bedeli yok: `restoredLocalMedia` geri yazacak bir şey bulmazsa durumun
     KENDİSİNİ döndürür — kopya yok, tarama dışında iş yok. Eskiden burada her seferinde
     durumun tamamı JSON'dan geçirilip klonlanıyor, klon dolaşılıyor, görselleri sayılıp
     konsola basılıyordu; başka bir cihazda çekilmiş tek bir fotoğraf bile bunu kalıcı
     hâle getiriyordu (o tutamak hiçbir zaman çözülmez), yani her düzenlemeden yarım
     saniye sonra ekran bir kez donuyordu.
     Tarayıcının boş anına bırakılır: kurtarılacak bir şey varsa bir kare sonra da orada.
     Cihazın deposunda tek bir dosya bile yoksa tarama hiç başlamaz: geri konacak bir şey
     olmadığı zaten biliniyor, dolayısıyla durumun tamamını dolaşmanın karşılığı yok. Depo
     ilk render'dan ÖNCE belleğe alınıyor (lmPreload) ve sonradan eklenen her fotoğraf oraya
     da yazılıyor, yani boş olması "henüz okunmadı" değil, "yok" demektir. Fotoğraf çekmemiş
     bir telefonda her düzenleme ve her uzak görüntü başına bir tam ağaç gezintisi eksilir. */
  useEffect(()=>{
    if(!user)return;
    const HAS_IDLE=typeof requestIdleCallback==='function'&&typeof cancelIdleCallback==='function';
    let idle=0;
    const run=()=>{
      if(!_lmCache.size)return;               // this device holds no file → nothing to put back
      const cur=dataRef.current;
      const out={restored:0,missing:0};
      const next=restoredLocalMedia(cur,out);
      if(next===cur)return;                   // nothing this device can put back → no copy, no render
      dataRef.current=next;setData(next);     // restored handles are gone → this cannot loop
      console.log('media:',out.restored+' restored from this device,',out.missing+' still pointing at a file this device does not have',mediaReport(next));
    };
    const t=setTimeout(()=>{
      idle=HAS_IDLE?requestIdleCallback(run,{timeout:2000}):setTimeout(run,0);
    },500);
    return()=>{clearTimeout(t);if(!idle)return;
      if(HAS_IDLE)cancelIdleCallback(idle);else clearTimeout(idle);};
  },[user,data]);
  useEffect(()=>{
    const fb=FB();if(!fb||!user)return;
    const run=async()=>{
      if(lifting.current||!ready.current||writing.current||liftPaused())return;
      const before=dataRef.current;
      if(!hasPendingMedia(before))return;
      lifting.current=true;
      try{
        const clone=JSON.parse(JSON.stringify(before));
        // Taşıma sırasında kullanıcı bir şey değiştirdiyse bu turu atla — düzenlemesi ezilmesin.
        if(await liftLocalMedia(clone,fb,user.uid)&&dataRef.current===before){dataRef.current=clone;setData(clone);}
      }catch(e){console.warn('media lift',e);}
      lifting.current=false;
    };
    const first=setTimeout(run,4000);          // ilk bulut yüklemesi otursun
    const iv=setInterval(run,5*60*1000);       // kalan varsa arada bir yeniden dene
    return()=>{clearTimeout(first);clearInterval(iv);};
  },[user]);

  // Sekme gizlenince/kapatılınca bekleyen yazmayı gönder
  useEffect(()=>{
    const fb=FB();if(!fb||!user)return;
    const flush=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}writeNow();lsFlush();};
    /* Sekme gizliyken (telefon cebe girdiğinde) dinleyici uykuya alınabilir; ağ da kopmuş
       olabilir. İkisinde de "sunucuyla temasım var" güvencesi düşer: dönüşteki ilk yazım,
       arada başka cihaz yazmış mı diye önce sunucuya bakar.

       AMA HER SEKME DEĞİŞİMİ BİR ARA DEĞİLDİR. Bu güvence eskiden sekme her gizlendiğinde
       düşüyordu; masaüstünde başka bir pencereye bakıp dönmek bile buna giriyordu ve
       dönüşteki İLK yazım, iki sunucu okumasını beklemeden yola çıkamıyordu. Koçun
       masaüstünde tarif ettiği "bir şey yazınca uzun uzun sarıda kalıyor" tam olarak buydu:
       gecikme ağdan değil, her alt+tab'ın açtığı bu okumalardan geliyordu.
       Kısa bir gizlenmede dinleyici zaten ayaktadır ve arada bir yazım olsaydı görürdük;
       o yüzden güvence yalnızca GERÇEK bir aradan sonra düşer. */
    const HIDE_GAP_MS=20000;
    let hidAt=0;                       // sekme ne zaman gizlendi (0 = görünür)
    const offline=()=>{fromServer.current=false;};
    /* TAKILAN YAZIMI BIRAK. Bir yazım, ağ "açık görünüp" veri geçirmediğinde sonuçlanmadan
       asılı kalabilir. Kilit (writing) o yazım bitene kadar başka yazıma izin vermediği için
       tek bir asılı tur, cihazı kalıcı olarak sarıda bırakıyordu: yeni düzenlemeler yalnızca
       sıraya giriyor, hiçbiri buluta çıkmıyordu. Belli bir süreden sonra o tur bırakılır —
       sıra numarası ilerletildiği için geç de olsa dönerse hiçbir şeye dokunamaz — ve
       yerine yenisi başlatılır. Bulut için bir riski yok: parça adları içerik hash'i,
       manifest rev'i de daima artıyor, yani en son yazan tur kazanır. */
    const unstick=()=>{
      if(!writing.current)return false;
      if(Date.now()-writeStarted.current<WRITE_STUCK_MS)return false;
      console.warn('sync: write stuck, retrying');slog('gözcü: takılan yazım bırakıldı');
      writeGen.current++;writing.current=false;queued.current=false;
      return true;
    };
    /* DÖNÜŞ SINAVI — "masaüstünde değiştirdim, telefonda geç göründü"ün asıl sebebi.
       Yukarıdaki dönüş turu yalnızca BU cihazın gönderemediği yazımı kurtarıyordu; bu
       cihazın ALAMADIĞI değişiklik için hiçbir şey yapmıyordu. Oysa telefon cepteyken
       olan tam olarak şu: tarayıcı sekmeyi dondurur, Firestore'un akışı sessizce ölür ve
       geri dönüldüğünde cihaz "hazır ve temiz" görünür — ready true, yazılacak bir şey yok.
       Gözcünün dinleyiciyi tazeleyen dalı ise yalnızca BEKLERKEN (hazır değil / yazılmamış
       değişiklik var / onay bekleniyor) çalışır; temiz ve senkron görünen bir cihaz o dalın
       hiçbir şartını sağlamaz. Yani ölü akışı fark edecek kimse kalmıyordu: telefon, koç
       kendisi bir şey yazana kadar masaüstündeki değişikliği HİÇ görmüyor, ekranda eski
       hâli tutuyordu. Gecikmenin kaynağı ağ değil, sorulmayan soruydu.
       Dönüşte tek bir doküman — manifest — doğrudan sunucudan okunur. Cevap üç şeyi birden
       söyler: taşıma ayakta mı, bulutta bizden yeni bir hâl var mı, yok mu.
         • rev bizimkinden yeniyse → dinleyici geride kalmış, hemen çekilir;
         • rev aynıysa → gerçekten günceliz, hiçbir şey yapılmaz (boş yazım/okuma yok);
         • okuma hiç dönmezse → akış ölü, dinleyici tazelenir.
       Bedeli, yirmi saniyeden uzun bir aradan sonra TEK doküman okuması. Veri güvenliği
       açısından da yeni bir yol açmaz: çekim, her zamanki gibi applyRemote üzerinden
       birleştirir — yereldeki yazılmamış düzenlemeyi ezmez. */
    let checking=false;
    const checkLive=async()=>{
      const fb2=FB(),u=userRef.current;
      if(checking||!ready.current||!fb2||!u)return;
      if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
      checking=true;
      try{
        const d=await withTimeout(fb2.firestore().collection(COL).doc(u.uid).get({source:'server'}),SERVER_READ_MS);
        sawServer.current=true;lastServerAt.current=Date.now();
        const v=d.exists?d.data():null;
        const rev=(v&&typeof v.rev==='number')?v.rev:0;
        if(rev>lastRev.current){slog('dönüş sınavı: bulutta daha yeni hâl → çekiliyor','rev='+rev);await forcePull();}
        else slog('dönüş sınavı: güncel','rev='+rev);
      }catch(e){
        /* Sunucu yanıt vermedi: akış ölü ya da taşıma bu ağda geçmiyor. Dinleyiciyi
           tazelemek hafızayı silmez (hesap değişmediği için "yeniden" kurulum), yani
           gönderilmemiş bir düzenleme tabansız kalmaz. */
        slog('dönüş sınavı: sunucuya ULAŞILAMADI → dinleyici tazeleniyor',(e&&e.code)||(e&&e.message)||'?');
        setSubTick(n=>n+1);
      }
      checking=false;
    };
    /* Telefon geri açıldığında: cepteyken bağlantı kopmuş, dinleyici uyutulmuş, bekleyen
       yazım askıda kalmış olabilir. Eskiden dönüş için hiçbir şey yapılmıyordu — koç
       uygulamayı açıyor, gösterge sarıda kalıyor ve ancak sayfayı yenileyince düzeliyordu.
       Artık dönüşte takılan tur bırakılıp bekleyen değişiklik yeniden gönderiliyor. */
    const resume=e=>{
      const gap=hidAt?Date.now()-hidAt:0;
      hidAt=0;
      slog('uygulamaya dönüldü',gap?('ara='+Math.round(gap/1000)+'sn'):'');
      // Uzun bir aradan sonra: dönüşteki ilk yazım, arada başka cihaz yazmış mı diye baksın.
      if(gap>=HIDE_GAP_MS||typeof navigator!=='undefined'&&navigator.onLine===false)fromServer.current=false;
      const freed=unstick();
      if(freed||dirty.current)writeNow();
      lsFlush();
      /* Ağ geri geldiğinde ve sayfa geri gösterildiğinde ara ölçülemez (sekme hiç
         gizlenmemiş olabilir), ama akışın ölmüş olma ihtimali en yüksek olan an tam
         olarak orasıdır — o yüzden sınav ara şartına bakılmadan yapılır. */
      const forced=!!(e&&(e.type==='online'||e.type==='pageshow'));
      if(gap>=HIDE_GAP_MS||forced)checkLive();
    };
    const onHide=()=>{hidAt=Date.now();flush();};
    const onVis=()=>{if(document.visibilityState==='hidden'){slog('arka plana alındı');onHide();}else resume();};
    /* SESSİZLİK SINAVI — açık duran bir cihazın akışı ölünce onu fark edecek kimse yoktu.
       Yukarıdaki dönüş sınavı yalnızca uygulamaya DÖNÜLDÜĞÜNDE soruyor; gözcünün dinleyiciyi
       tazeleyen dalı ise yalnızca cihaz bir şey BEKLERKEN (hazır değil / yazılmamış değişiklik
       var / onay bekleniyor) çalışıyor. Telefon ekranda açık durup hiçbir şey yazmıyorsa
       ikisi de olmaz: akış sessizce ölmüştür, cihaz "hazır ve temiz" görünür ve masaüstünde
       yazılan antrenman oraya HİÇ düşmez. Koç telefonu kapatıp açana kadar eski hâle bakar —
       "pc ile telefon senkron değil"in kendisi budur.
       Sağlam bir akışta sessizlik normaldir (dinleyici yalnızca bir şey değişince uyanır),
       bu yüzden sınav ucuz tutuldu: yarım dakikadır sunucudan tek bir yanıt gelmemişse ve
       sekme GÖRÜNÜRSE, TEK bir doküman — manifest — okunur. Cevap üç şeyi birden söyler:
       taşıma ayakta mı, bulutta bizden yeni bir hâl var mı, yok mu. Yoksa hiçbir şey yapılmaz
       (boş yazım da çekim de yok); varsa hemen çekilir; okuma hiç dönmezse dinleyici tazelenir.
       Arka plandaki sekme hiç yoklanmaz — orada zaten okunacak bir ekran yok. */
    const LISTEN_SILENT_MS=30000;
    const watchdog=setInterval(()=>{
      if(unstick())writeNow();
      if(isHidden()||!sawServer.current||!lastServerAt.current)return;
      if(Date.now()-lastServerAt.current<LISTEN_SILENT_MS)return;
      slog('sessizlik sınavı: dinleyiciden ses yok → buluta soruluyor',
        Math.round((Date.now()-lastServerAt.current)/1000)+'sn');
      checkLive();
    },15000);
    // Sayfa kapatılır/yenilenirken bekleyen yazımı gönder ve yerel kopyayı diske yaz.
    // Tarayıcının "Site yeniden yüklensin mi?" onayı GÖSTERİLMEZ: flush() yazımı hemen
    // başlattığı için senkron olsa bile uyarı çıkıyordu. Başlatılan yazım Firestore'un
    // kalıcı (IndexedDB) kuyruğuna düşer ve yeniden açılışta buluta gönderilir.
    const onBeforeUnload=()=>{flush();};
    document.addEventListener('visibilitychange',onVis);
    window.addEventListener('offline',offline);
    window.addEventListener('online',resume);
    window.addEventListener('pageshow',resume);
    window.addEventListener('pagehide',onHide);
    window.addEventListener('beforeunload',onBeforeUnload);
    return()=>{clearInterval(watchdog);document.removeEventListener('visibilitychange',onVis);window.removeEventListener('offline',offline);
      window.removeEventListener('online',resume);window.removeEventListener('pageshow',resume);
      window.removeEventListener('pagehide',onHide);window.removeEventListener('beforeunload',onBeforeUnload);};
  },[user]);

  /* ═══════════════════════════════════════════════════════════════════════
     GÖZCÜ — göstergenin sarıda ÇAKILI KALMASININ panzehiri.

     Senkronun kendisi olay güdümlü: dinleyici uyanır, yazım turu açılır, gösterge döner.
     Bu, her şey çalışırken kusursuz; bozulduğunda ise sessizce duruyor, çünkü onu ileri
     itecek olan olay tam da gelmeyen şey. Cihazın kilitlendiği her hâl aynı kalıba
     oturuyordu: BEKLENEN OLAY HİÇ GELMEDİ ve bekleyecek başka kimse yoktu —
       • dinleyici bir hata alıp öldü, yerine yenisi kurulmadı;
       • anlık görüntüler hep ÖNBELLEKTEN geldi, ready hiçbir zaman true olmadı, dolayısıyla
         yazım da hiç açılamadı;
       • seçilen taşıma katmanı bu ağda hiç geçmedi (bkz. sayfa başındaki transport seçimi);
       • debounce turu ready olmadan çalıştı, düzenleme sessizce düştü ve onu bir daha
         hatırlatacak bir şey olmadı;
       • yazım turu bitti ama gösterge sarıda unutuldu.
     Hepsinin ortak çaresi tek bir şey: DÜZENLİ ARALIKLA GERÇEĞE BAK. Aşağıdaki tur iki
     saniyede bir cihazın kendi durumunu okur ve tıkanan neyse onu iter. Hiçbir şeyi
     yeniden icat etmez — var olan yolları (forcePull, writeNow, yeniden abonelik) çağırır,
     yalnızca onları çağıracak bir olay kalmadığında.
     ═══════════════════════════════════════════════════════════════════════ */
  const statusRef=useRef(status);statusRef.current=status;
  const lastPull=useRef(0);
  const lastResub=useRef(0);
  useEffect(()=>{
    const fb=FB();if(!fb||!user)return;
    let reloading=false;
    const RESUB_MS=20000;
    const tick=()=>{
      if(reloading)return;
      const now=Date.now();
      const st=statusRef.current;

      // 1) Dinleyici bir hata alıp öldü → yerine yenisini kur (art arda tekrarlarsa seyrelterek).
      if(resub.current&&now-lastResub.current>RESUB_MS){
        resub.current=0;lastResub.current=now;
        slog('gözcü: ölen dinleyici yeniden kuruluyor');
        setSubTick(n=>n+1);return;
      }

      /* 2) Seçilen taşıma bu ağda hiç açılmadı: ağ ayakta, giriş yapılmış, ama Firestore'dan
            tek bir sunucu yanıtı gelmedi. Bu, mantıkla çözülecek bir şey değil — öteki taşımaya
            geçilip sayfa bir kez yenilenir. Oturum başına yalnızca bir kez (bkz. __fsSwitchTransport),
            yani bir ileri bir geri dönemez. Yenilemenin bedeli yok: yazımlar zaten IndexedDB'de
            kalıcı, ekrandaki hâl de yerel kopyaya yazılıyor. */
      if(!sawServer.current&&startedAt.current&&now-startedAt.current>STALL_MS
         &&(typeof navigator==='undefined'||navigator.onLine!==false)
         &&typeof window!=='undefined'&&typeof window.__fsSwitchTransport==='function'
         &&window.__fsSwitchTransport()){
        reloading=true;
        slog('gözcü: sunucuya hiç ulaşılamadı → taşıma değiştirilip sayfa yenileniyor');
        try{lsFlush();}catch(e){}
        setTimeout(()=>{try{location.reload();}catch(e){}},400);
        return;
      }

      /* 3) Bulutu BEKLERKEN bir süredir tek bir yanıt yok → bağlantı sessizce kopmuş olabilir,
            dinleyiciyi tazele. "Bekliyor" şartı önemli: her şey senkronken sessizlik normaldir
            (dinleyici yalnızca bir şey değişince uyanır), onu tazelemek boş yere iş çıkarırdı. */
      const waiting=!ready.current||dirty.current||writing.current||queued.current||!writeAcked.current;
      if(waiting&&sawServer.current&&lastServerAt.current&&!isHidden()
         &&now-lastServerAt.current>STALL_MS*2&&now-lastResub.current>RESUB_MS){
        lastResub.current=now;lastServerAt.current=now;
        slog('gözcü: sunucudan ses yok → dinleyici tazeleniyor');
        setSubTick(n=>n+1);return;
      }

      /* 4) Hâlâ hazır değiliz. Dinleyicinin bir daha uyanmadığı durum, kurtarmak istediğimiz
            durumun ta kendisi; o yüzden sunucudan doğrudan çekmeyi deneriz. Başarırsa cihaz
            açılır, başaramazsa hata kodunu gösterir — ikisi de sessiz sarıdan iyidir. */
      if(!ready.current){
        if(!isHidden()&&startedAt.current&&now-startedAt.current>PEND_STUCK_MS&&now-lastPull.current>15000){
          lastPull.current=now;
          slog('gözcü: hâlâ hazır değil → sunucudan çekiliyor');
          Promise.resolve(forcePull()).catch(()=>{});
        }
        return;
      }

      // 5) Yazım uçuşta ya da zamanlayıcı kurulu: kendi yolunda, karışma.
      if(writing.current||queued.current||timer.current)return;

      /* 6) Ekrandaki hâl bulutta olandan farklı ama ne yazım var ne zamanlayıcı: düzenleme
            hazır değilken yapıldığı (ya da bir tur yarıda bırakıldığı) için düşmüş. Yaz. */
      const cur=ser(dataRef.current);
      /* Buluttan gelip ekrana uygulanmış hâl burada YAZIM SAYILMAZ — debounce turunun
         `data===lastApplied` kontrolüyle aynı kural. Olmasaydı, birleştirme sonrası dizgi
         buluttakiyle bayt bayt aynı çıkmadığında iki cihaz birbirine aynı durumu durmadan
         geri yazardı. */
      if(cur!==lastSynced.current&&dataRef.current!==lastApplied.current){
        if(!dirty.current)slog('gözcü: düşmüş düzenleme bulundu → yazılıyor');
        dirty.current=true;writeNow();return;
      }

      /* 7) Yazılacak hiçbir şey kalmadı. Gösterge hâlâ sarıysa bu artık bir gerçek değil,
            unutulmuş bir bayrak — düzelt. Onay bekleyen bir yazım varsa sarı DOĞRUDUR ve
            öyle kalır: o hâl gerçekten henüz bulutta değil. */
      dirty.current=false;
      if(st==='syncing'&&writeAcked.current){setStatus('synced');setSyncErr('');}
    };
    const iv=setInterval(tick,2000);
    return()=>clearInterval(iv);
  },[user]);

  /* Düzenlemeleri debounce ile yaz. Bekleme süresi durumun büyüklüğüne göre ayarlanır:
     her yazım, durumun tamamını seri hâle getirip parçalamayı gerektirir (birkaç MB'lık bir
     durumda bu iş görmezden gelinecek kadar ucuz değildir), 120 ms'lik sabit bekleme ise
     bunu neredeyse her tuş vuruşunda tetikliyordu. Küçük durumlar hâlâ anında gider.
     Karşılaştırma da artık burada yapılmıyor: eskiden her render'da durumun TAMAMI
     JSON'a çevrilip lastSynced ile karşılaştırılıyordu — yazacak bir şey olmasa bile.
     Değişiklik olup olmadığına writeNow zaten (önbellekli seri hâlle) karar veriyor. */
  const writeDelay=()=>{
    const len=lastSynced.current?lastSynced.current.length:0;
    /* Bekleme, "diğer cihazda ne kadar geç görünür" demektir; artık düzenlemeyi yazıma
       çevirecek kadar kısa, her tuş vuruşunda tam bir serileştirme açmayacak kadar uzun.
       Parça adları içerik hash'i olduğu için sık yazım fazladan bant genişliği getirmez:
       yalnızca gerçekten değişen 1-2 parça gider.
       Tavan düşürüldü: bir yazımın ana iş parçacığına maliyeti artık serileştirmeden ibaret
       (parçalama Worker'da, görsel süpürmesi tek geçişte, yankıda birleştirme yok), yani
       sezon doldukça beklemeyi 400 ms'e kadar uzatmanın bir karşılığı yok — uzatmak, koçun
       "kullandıkça yavaşlıyor" diye tarif ettiği kaymanın kendisiydi. Kayıt zaten yazımın
       ilk anında diske işleniyor (kalıcı önbellek); buradaki bekleme yalnızca bulutun ve
       öteki cihazın ne kadar geç göreceğini belirler. */
    return Math.min(220,Math.max(60,Math.round(len/40000)));    // ~2.4MB → 60ms, 4MB → 100ms, 9MB+ → 220ms
  };
  useEffect(()=>{
    const fb=FB();if(!fb||!user||!ready.current)return;
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    if(data===lastApplied.current)return;   // buluttan gelen durumu uyguladık → geri yazacak bir şey yok
    dirty.current=true;lastEditAt.current=Date.now();setStatus('syncing');
    /* Bekleme dolduğunda yazımı hemen değil, tarayıcının ilk boş anında başlat. Yazım
       durumun tamamını seri hâle getirip parçalara böler; kaydırmanın ortasına denk
       geldiğinde kare düşüren iş budur. Boş an gelmezse zaman aşımı yine de yazdırır. */
    timer.current=setTimeout(()=>{
      // Boş an beklenir ama uzun beklenmez: 2.5 sn'lik zaman aşımı, diğer cihazın değişikliği
      // görmesini tek başına saniyelerce geciktirebiliyordu.
      if(typeof requestIdleCallback==='function')requestIdleCallback(()=>writeNow(),{timeout:120});
      else writeNow();
    },writeDelay());
  },[data,user]);

  /* Panelin okuduğu canlı iç durum. Ref'ler render sırasında okunuyor — teşhis için
     doğru olan da bu: gösterilen şey o anın gerçeği olsun, React'in bir tur gerisi değil. */
  const diag=()=>({
    sawServer:sawServer.current,ready:ready.current,dirty:dirty.current,writing:writing.current,
    queued:queued.current,fromServer:fromServer.current,lastRev:lastRev.current,chunks:chunkIds.current.length,
    size:lastSynced.current?lastSynced.current.length:0,
    pending:!!pendSince.current,snaps:snapCount.current,docs:lastDocs.current,
    inflight:writing.current?Math.round((Date.now()-writeStarted.current)/1000):0,
    acked:writeAcked.current,
    transport:(typeof window!=='undefined'&&window.__fsTransport)||'?',
    serverAgo:lastServerAt.current?Math.round((Date.now()-lastServerAt.current)/1000):-1,
    skew:skew.current,
  });
  /* Tek atışlık bağlantı sınavı: manifest dokümanını doğrudan SUNUCUDAN iste. Sonuç üç
     şeyden birini söyler — okundu (taşıma sağlam, sorun mantıkta), zaman aşımı (cihaz
     Firestore'a ulaşamıyor), ya da bir hata kodu (ör. izin). Sarının sebebini ayıran soru
     tam olarak budur ve başka hiçbir yerden okunamıyor. */
  const probe=async()=>{
    const fb=FB(),u=userRef.current;
    if(!fb||!u)return'giriş yok';
    const t0=Date.now();
    try{
      const d=await withTimeout(fb.firestore().collection(COL).doc(u.uid).get({source:'server'}),SERVER_READ_MS);
      const ms=Date.now()-t0;
      const r=(d.exists?('manifest var, rev='+(d.data()||{}).rev):'manifest yok')+' ('+ms+'ms)';
      slog('sınav: SUNUCU OKUNDU',r);return'sunucu okundu — '+r;
    }catch(e){
      const c=(e&&e.code)||(e&&e.message)||'?';const ms=Date.now()-t0;
      slog('sınav: BAŞARISIZ',c+' ('+ms+'ms)');
      return(c==='timeout'?'sunucuya ULAŞILAMIYOR (zaman aşımı)':'hata: '+c)+' ('+ms+'ms)';
    }
  };
  return{user,status,authLoading,syncErr,syncNote,clearSyncNote:()=>setSyncNote(''),authErr,clearAuthErr:()=>setAuthErr(''),forcePull,diag,probe,
    signIn:(e,p)=>FB().auth().signInWithEmailAndPassword(String(e||'').trim(),String(p||'')),
    signUp:(e,p)=>FB().auth().createUserWithEmailAndPassword(String(e||'').trim(),String(p||'')),
    methodsFor:(e)=>FB().auth().fetchSignInMethodsForEmail(String(e||'').trim()).catch(()=>[]),
    signOut:async()=>{
      // Çıkıştan önce bekleyen yazımın gerçekten bitmesini bekle (en fazla ~6 sn)
      try{await writeNow();let k=0;while((writing.current||dirty.current)&&k++<40)await new Promise(r=>setTimeout(r,150));}catch(e){}
      /* Service worker'ın sakladığı sporcu fotoğrafları bu cihazda kalmasın. En iyi çaba:
         worker yoksa ya da mesaj gitmezse çıkış yine de tamamlanır. */
      try{const sw=navigator.serviceWorker&&navigator.serviceWorker.controller;if(sw)sw.postMessage({coachos:'clear-media'});}catch(e){}
      return FB().auth().signOut();
    },
    signInWithGoogle:async()=>{
      const p=new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({prompt:'select_account'});
      try{return await FB().auth().signInWithPopup(p);}
      catch(e){
        const toRedirect=['auth/popup-closed-by-user','auth/cancelled-popup-request','auth/popup-blocked',
          'auth/web-storage-unsupported','auth/operation-not-supported-in-this-environment','auth/internal-error'];
        if(toRedirect.includes(e.code)){await FB().auth().signInWithRedirect(p);return;}
        throw e;
      }
    }};
}

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

