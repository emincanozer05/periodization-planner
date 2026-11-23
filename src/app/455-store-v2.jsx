/* =========================================================
   KAYIT BAZLI SENKRON — UYGULAMA KANCASI (senkron Faz 2b-3, Faz 5)
   =========================================================
   useCloudSync bunu çağırır. Yeni yapı iki durumda etkin:
   • Kendi çalışma alanı: workspaces/{uid} → schemaVersion 2 ve migrated: true (yalnızca Faz 3'ün
     taşıma aracı koyar). Rol: sahip, bütün takımlar.
   • Bir kulübe üyelik (Faz 5): users/{uid}/memberships/{ws} (katılırken yazılır) ve
     workspaces/{ws}/members/{uid} (rol + takımlar). Kulüp de taşınmış olmalı.
   Kişi birden fazla kulübe üye olabilir; hangisinin açık olduğu cihaza kaydedilir (kulüp seçici).
   Etkinken eski senkronun dinleyicisi, yazıcısı, boşaltması ve gözcüsü durur. Taşınmamış ve hiçbir
   kulübe katılmamış hesapta (bugün bütün hesaplar) active hep false: hiçbir şey değişmez.

   Mantık 468-store-map.jsx → smController'da (emulator'de iki cihazla ve üye rolleriyle sınanıyor:
   rules-test/test/store-io.test.js). Bu parça JSX içermez: sync-test.js 440–460'ı düz JS çalıştırır. */
const WS_PICK_KEY=uid=>'coachos_ws_'+uid;
function useStoreV2(o){
  const{user,data,dataRef,setData,setStatus,setSyncErr,setSyncNote,ready}=o;
  const uid=user&&user.uid;
  const[own,setOwn]=useState(false);                 // kendi çalışma alanı taşınmış mı
  /* Aynı soru, yalnızca SUNUCUNUN cevabı: null = henüz bilinmiyor, true/false = sunucu söyledi.
     Eski senkron, eski manifestte `migratedTo` görünce bunu bekler (450 → legacyHold): sunucu
     "taşınmamış" demedikçe eski yapının donmuş verisini ekrana koymaz. */
  const[ownSrv,setOwnSrv]=useState(null);
  const[joined,setJoined]=useState([]);              // üye olduğu kulüpler (ws kimlikleri)
  const[pick,setPick]=useState(null);                // bu cihazda seçili kulüp
  const[member,setMember]=useState(null);            // seçili kulüpteki üyelik {role,teams} | null
  const[wsOk,setWsOk]=useState(false);               // seçili kulüp taşınmış mı
  /* İlk veri geldi mi. Gelmeden yapılan düzenleme kaybolurdu: denetleyici henüz bir taban bilmediği için onu
     gönderemez, ilk veri gelince ekran onunla değişir. O ana kadar ekran salt okunur (690 → readOnly). */
  const[loaded,setLoaded]=useState(false);
  const ctl=useRef(null);
  const slowAt=useRef({});
  const fsOf=()=>{const fb=FB();if(!fb||!uid)return null;try{const fs=fb.firestore();return fs&&typeof fs.doc==='function'?fs:null;}catch(e){return null;}};
  // 1) kendi çalışma alanı + katıldığı kulüpler + bu cihazın seçimi
  useEffect(()=>{
    setOwn(false);setOwnSrv(null);setJoined([]);
    let p=null;try{p=uid?localStorage.getItem(WS_PICK_KEY(uid)):null;}catch(e){}
    setPick(p);
    const fs=fsOf();if(!fs)return;                   // sahte ortam (sync-test) → eski düzen
    const offs=[];
    try{
      // Üst veri değişimleri de istenir: önbellekten gelen cevap sunucudakiyle aynıysa sunucunun
      // onayı ancak böyle duyulur (ownSrv).
      offs.push(fs.doc('workspaces/'+uid).onSnapshot({includeMetadataChanges:true},s=>{
        const d=s.exists?s.data():null,m=!!(d&&d.schemaVersion===2&&d.migrated===true);
        setOwn(m);
        if(!(s.metadata&&s.metadata.fromCache))setOwnSrv(m);
      },e=>{console.warn('store v2: işaret okunamadı',e&&e.code);setOwn(false);}));
      offs.push(fs.collection('users/'+uid+'/memberships').onSnapshot(s=>{
        setJoined(s.docs.map(d=>d.id).filter(id=>id!==uid));
      },e=>console.warn('store v2: üyelikler okunamadı',e&&e.code)));
    }catch(e){}
    return()=>offs.forEach(f=>{try{f();}catch(e){}});
  },[uid]);
  // Açık kulüp: seçim geçerliyse o, değilse kendi çalışma alanı (taşınmışsa), değilse yok.
  const ws=uid&&(pick&&(pick===uid?own:joined.indexOf(pick)>=0)?pick:(own?uid:null));
  // 2) açık kulüp başkasınınsa: üyelik (rol, takımlar) ve kulübün taşınmış olması
  useEffect(()=>{
    setMember(null);setWsOk(false);
    if(!ws||ws===uid)return;
    const fs=fsOf();if(!fs)return;
    const offs=[];
    offs.push(fs.doc('workspaces/'+ws+'/members/'+uid).onSnapshot(s=>setMember(s.exists?s.data():null),
      e=>{console.warn('store v2: üyelik okunamadı',e&&e.code);setMember(null);}));
    offs.push(fs.doc('workspaces/'+ws).onSnapshot(s=>{const d=s.exists?s.data():null;setWsOk(!!(d&&d.schemaVersion===2&&d.migrated===true));},
      e=>{console.warn('store v2: kulüp okunamadı',e&&e.code);setWsOk(false);}));
    return()=>offs.forEach(f=>{try{f();}catch(e){}});
  },[ws,uid]);
  const role=!ws?null:ws===uid?'owner':(member&&member.role)||null;
  const teams=!ws?null:ws===uid?['*']:(member&&Array.isArray(member.teams)?member.teams:null);
  const active=!!(ws&&role&&teams&&(ws===uid||wsOk));
  const teamsKey=teams?teams.join('|'):'';
  // 3) denetleyici
  useEffect(()=>{
    if(!active)return;
    const fb=FB();
    slog('v2: yeni yapı etkin','ws='+ws.slice(0,6)+' rol='+role);
    setStatus('syncing');
    const c=smController({
      fs:fb.firestore(),wsPath:'workspaces/'+ws,teams,
      K:{FieldPath:firebase.firestore.FieldPath,FieldValue:firebase.firestore.FieldValue,uid},
      getData:()=>dataRef.current,
      /* Gelen veri düz değer olarak değil, React'in SIRADAKİ son hâline bakan bir güncelleyiciyle konur: arada sıraya
         girmiş bir düzenleme varsa (ör. Firestore olayı bir tıklamanın güncellemesi işlenmeden geldi) silinmez,
         gelen verinin üstüne taşınır (smController.rebase) ve bir sonraki gönderim turunda gider. */
      apply:(d,cx)=>{
        dataRef.current=d;
        setData(prev=>{
          if(!cx||prev===cx.cur||prev===d)return d;
          let r=null;try{r=ctl.current?ctl.current.rebase(prev,cx):null;}catch(e){console.warn('rebase',e);}
          if(r){slog('v2: gelen veri, sırada bekleyen düzenlemeyle birleştirildi');return r;}
          return d;
        });
      },
      prep:d=>stripDeviceOnly(d),
      fromDocs:docs=>migrate(smFromDocs(docs)),
      status:s=>{setStatus(s);if(s==='synced'){ready.current=true;setSyncErr('');}if(ctl.current&&ctl.current.ready())setLoaded(true);},
      /* Yavaş tur (ana iş parçacığında SM_SLOW_MS'den uzun): her tür için en çok 30 sn'de bir günlüğe. */
      slow:(k,ms,info)=>{const t=Date.now(),l=slowAt.current;if(t-(l[k]||0)<30000)return;l[k]=t;slog('v2: yavaş tur ('+k+')',ms+' ms · '+info);},
      flag:syncFlag,                                  // bayraklar (447): denetleyici yeni davranışı yalnızca bunlarla açar
      trip:syncFlagTrip,                              // onarım ağı: uyuşmazlıkta bayrak bu oturumda kapanır (G5)
      shadow:(n,info)=>{const t=Date.now(),l=slowAt.current,k='sh:'+n;if(t-(l[k]||0)<30000)return;l[k]=t;slog('v2: gölge uyuşmazlığı ('+n+')',info);},
      note:n=>{slog('v2: silinmiş kayda düzenleme düştü','adet='+n);
        setSyncNote(L('Başka bir cihazda silinmiş '+n+' kayda yaptığın değişiklik uygulanamadı.',
          'Your change to '+n+' record(s) deleted on another device could not be applied.'));},
      error:e=>{const m=String((e&&(e.code||e.message))||e);slog('v2: hata',m);setStatus('error');
        setSyncErr(e&&e.code==='newer-format'?L('Veri uygulamanın daha yeni bir sürümüyle yazılmış. Değişiklikler gönderilmiyor: sayfayı yenile.',
          'The data was written by a newer version of the app. Changes are not being sent: reload the page.'):m);},
    });
    setLoaded(false);
    ctl.current=c;c.start();
    /* Onarım ağı (incMap, R3): düzenleme yapıldıysa 3 dakikada bir ve sekme gizlenince, tarayıcının boş anında
       ekrandaki veri tam eşlemeyle karşılaştırılır (bayrak kapalıyken hiçbir şey yapmaz). */
    let lastFlush=-1;
    const recon=()=>{const s=c.stats();if(s.flushN===lastFlush)return;lastFlush=s.flushN;
      const run=()=>{try{const r=c.reconcile();if(r&&r.ops)slog('v2: uzlaşma farkı gönderildi','adet='+r.ops);}catch(e){console.warn('reconcile',e);}};
      if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:5000});else setTimeout(run,0);};
    const iv=setInterval(recon,180000);
    const onVis=()=>{if(document.visibilityState==='hidden')recon();};
    document.addEventListener('visibilitychange',onVis);
    return()=>{clearInterval(iv);document.removeEventListener('visibilitychange',onVis);c.stop();ctl.current=null;ready.current=false;};
  },[active,ws,role,teamsKey]);
  // 4) ekrandaki her değişiklik: fark hemen gönderilir (izleyicinin ekranı zaten salt okunur)
  useEffect(()=>{if(ctl.current&&ctl.current.ready())ctl.current.changed();},[data]);
  /* Kulüp değiştir: cihaza kaydedilir; ekran yeni kulübün verisini yükleyene kadar boş başlar. */
  const select=id=>{
    try{if(id)localStorage.setItem(WS_PICK_KEY(uid),id);else localStorage.removeItem(WS_PICK_KEY(uid));}catch(e){}
    setPick(id||null);
  };
  const clubs=(own?[uid]:[]).concat(joined);
  return{active,ws,role,teams,clubs,select,ownSrv,loading:active&&!loaded,stats:()=>ctl.current?ctl.current.stats():null,idle:()=>ctl.current?ctl.current.idle():Promise.resolve()};
}
