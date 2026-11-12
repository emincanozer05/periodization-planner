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
  const[joined,setJoined]=useState([]);              // üye olduğu kulüpler (ws kimlikleri)
  const[pick,setPick]=useState(null);                // bu cihazda seçili kulüp
  const[member,setMember]=useState(null);            // seçili kulüpteki üyelik {role,teams} | null
  const[wsOk,setWsOk]=useState(false);               // seçili kulüp taşınmış mı
  const ctl=useRef(null);
  const fsOf=()=>{const fb=FB();if(!fb||!uid)return null;try{const fs=fb.firestore();return fs&&typeof fs.doc==='function'?fs:null;}catch(e){return null;}};
  // 1) kendi çalışma alanı + katıldığı kulüpler + bu cihazın seçimi
  useEffect(()=>{
    setOwn(false);setJoined([]);
    let p=null;try{p=uid?localStorage.getItem(WS_PICK_KEY(uid)):null;}catch(e){}
    setPick(p);
    const fs=fsOf();if(!fs)return;                   // sahte ortam (sync-test) → eski düzen
    const offs=[];
    try{
      offs.push(fs.doc('workspaces/'+uid).onSnapshot(s=>{
        const d=s.exists?s.data():null;setOwn(!!(d&&d.schemaVersion===2&&d.migrated===true));
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
  },[active,ws,role,teamsKey]);
  // 4) ekrandaki her değişiklik: fark hemen gönderilir (izleyicinin ekranı zaten salt okunur)
  useEffect(()=>{if(ctl.current&&ctl.current.ready())ctl.current.changed();},[data]);
  /* Kulüp değiştir: cihaza kaydedilir; ekran yeni kulübün verisini yükleyene kadar boş başlar. */
  const select=id=>{
    try{if(id)localStorage.setItem(WS_PICK_KEY(uid),id);else localStorage.removeItem(WS_PICK_KEY(uid));}catch(e){}
    setPick(id||null);
  };
  const clubs=(own?[uid]:[]).concat(joined);
  return{active,ws,role,teams,clubs,select,idle:()=>ctl.current?ctl.current.idle():Promise.resolve()};
}
