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

