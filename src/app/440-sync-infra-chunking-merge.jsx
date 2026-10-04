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

