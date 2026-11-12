/* =========================================================
   KAYIT BAZLI SENKRON — UYGULAMA KANCASI (senkron Faz 2b-3)
   =========================================================
   useCloudSync bunu çağırır. Hesap yeni yapıya TAŞINMIŞSA (workspaces/{uid}: schemaVersion 2 ve
   migrated: true — bu işaretleri yalnızca Faz 3'ün taşıma aracı koyar) veri dinleme ve yazma
   buradan yapılır; eski senkronun dinleyicisi, yazıcısı, sekme kapanırken boşaltması ve gözcüsü
   durur. Taşınmamış hesapta (bugün bütün hesaplar) hiçbir şey değişmez: active hep false.

   Mantık 468-store-map.jsx → smController'da (emulator'de iki cihazla sınanıyor:
   rules-test/test/store-io.test.js). Burada yalnızca React'e bağlanır.

   Bu parça JSX içermez: sync-test.js 440–460 aralığını düz JavaScript olarak çalıştırır. */
function useStoreV2(o){
  const{user,data,dataRef,setData,setStatus,setSyncErr,setSyncNote,ready}=o;
  const[active,setActive]=useState(false);
  const ctl=useRef(null);
  // 1) Bu hesap yeni yapıda mı? Sahip kendi çalışma alanı belgesini okuyabilir (yoksa bile).
  useEffect(()=>{
    setActive(false);
    const fb=FB();if(!fb||!user)return;
    let fs=null;try{fs=fb.firestore();}catch(e){return;}
    if(!fs||typeof fs.doc!=='function')return;     // sahte ortam (sync-test) → eski düzen
    let off=null;
    try{
      off=fs.doc('workspaces/'+user.uid).onSnapshot(s=>{
        const d=s.exists?s.data():null;
        setActive(!!(d&&d.schemaVersion===2&&d.migrated===true));
      },e=>{console.warn('store v2: işaret okunamadı',e&&e.code);setActive(false);});
    }catch(e){return;}
    return()=>{try{off&&off();}catch(e){}};
  },[user]);
  // 2) Denetleyici: yeni yapı etkinse dinle ve yaz.
  useEffect(()=>{
    if(!active||!user)return;
    const fb=FB();
    slog('v2: yeni yapı etkin','uid='+user.uid.slice(0,6));
    setStatus('syncing');
    const c=smController({
      fs:fb.firestore(),wsPath:'workspaces/'+user.uid,
      K:{FieldPath:firebase.firestore.FieldPath,FieldValue:firebase.firestore.FieldValue,uid:user.uid},
      getData:()=>dataRef.current,
      apply:d=>{dataRef.current=d;setData(d);},
      prep:d=>stripDeviceOnly(d),
      fromDocs:docs=>migrate(smFromDocs(docs)),
      status:s=>{setStatus(s);if(s==='synced'){ready.current=true;setSyncErr('');}},
      note:n=>{slog('v2: silinmiş kayda düzenleme düştü','adet='+n);
        setSyncNote(L('Başka bir cihazda silinmiş '+n+' kayda yaptığın değişiklik uygulanamadı.',
          'Your change to '+n+' record(s) deleted on another device could not be applied.'));},
      error:e=>{const m=String((e&&(e.code||e.message))||e);slog('v2: hata',m);setStatus('error');setSyncErr(m);},
    });
    ctl.current=c;c.start();
    return()=>{c.stop();ctl.current=null;ready.current=false;};
  },[active,user]);
  // 3) Ekrandaki her değişiklik: fark hemen gönderilir (bekletme yok; Firestore yerel önbelleğe anında yazar).
  useEffect(()=>{if(ctl.current&&ctl.current.ready())ctl.current.changed();},[data]);
  return{active,idle:()=>ctl.current?ctl.current.idle():Promise.resolve()};
}
