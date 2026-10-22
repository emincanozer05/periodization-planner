/* ═════════════════════════════════════════════════════════════════════
   ANTRENMAN GÜNLÜĞÜ — set set kg / tekrar (lift.html)

   Programda yazan yük ile sporcunun gerçekte kaldırdığı yük artık karşılaştırılabiliyor.

     1) YAYIN   Koçun uygulaması, sporcunun TAKVİMİNDEKİ o günkü programı (bireyselleştirme
                dahil: oraya yazılan zaten takvim seansıdır) `lift_plans/<token>_<sporcu>_<tarih>`
                dokümanına yayımlar. Pencere: dün … 6 gün sonrası. Değişmeyen doküman
                yeniden yazılmaz (içerik damgası), kaldırılan program dokümanı silinir.
     2) GİRİŞ   Sporcu lift.html#k=<token> linkini açar (check-in linkleriyle AYNI token),
                adını seçer, her egzersize set set kg + tekrar (+ isteğe bağlı RPE) girer.
                Gönderim `lift_logs` koleksiyonuna tek doküman olarak düşer.
     3) İŞLEME  LiftInbox bu koleksiyonu dinler ve sporcunun `liftLog` kaydına işler.
                Aynı gün + aynı plan için tekrar gönderim ESKİSİNİN ÜZERİNE yazılır, yeni
                satır açmaz; aynı gönderim iki kez işlense de sonuç değişmez.

   Yerel kayıt kompakt: `ath.liftLog[] = {id,date,at,pid,note,ex:[{k,n,pl:{s,r,l,kg},
   s:[[kg,tekrar,rpe],…]}]}`. 1RM'ler `ath.rm[normAd] = {n,kg,at}`.

   %1RM yüklerinin kg karşılığı 1RM tablosundan çözülür (2.5 kg'a yuvarlanır); tablo yoksa
   çözülmez ve sporcu yüzdeyi olduğu gibi görür — uydurma kg yazılmaz.
   ═════════════════════════════════════════════════════════════════════ */
const LIFT_PLANS='lift_plans', LIFT_LOGS='lift_logs';
const LIFT_KEEP_MS=14*24*60*60*1000;
const LIFT_WIN_BACK=1, LIFT_WIN_FWD=6;          // yayın penceresi: dün … +6 gün

const liftNorm=s=>phNorm(String(s==null?'':s).trim()).replace(/\s+/g,' ');
const liftPlanId=(token,athId,date)=>`${token}_${athId}_${date}`;
function liftUrl(token){
  const base=shareBase();   // vercel.app Türkiye'de engelli: 670'teki nota bak
  return `${base}lift.html#k=${encodeURIComponent(token)}`;
}
/* Aralık dışı değer SINIRLANMAZ, reddedilir: 99999 kg'ı 1000 kg diye kaydetmek de yalandır. */
const liftClamp=(v,lo,hi)=>{if(v===''||v==null||typeof v==='boolean')return null;const n=Number(v);return isFinite(n)&&n>=lo&&n<=hi?n:null;};
const liftRound=(kg,step)=>Math.round(kg/step)*step;
const liftFmtKg=kg=>{const r=Math.round(kg*100)/100;return Number.isInteger(r)?String(r):String(r);};

/* "80", "80 kg", "70% 1RM", "%70", "65-75%", "BW" → {kind,…} ya da null. */
function liftParseLoad(txt){
  const t=String(txt==null?'':txt).trim().toLowerCase().replace(/,/g,'.');
  if(!t)return null;
  if(/^(bw|body\s*weight|vücut|vucut)/.test(t))return{kind:'bw'};
  let m=t.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%/);
  if(m)return{kind:'pct',pct:(parseFloat(m[1])+parseFloat(m[2]))/2};
  m=t.match(/(\d+(?:\.\d+)?)\s*%/)||t.match(/^%\s*(\d+(?:\.\d+)?)/);
  if(m)return{kind:'pct',pct:parseFloat(m[1])};
  m=t.match(/^(\d+(?:\.\d+)?)\s*(?:kg|kilo)?\s*$/)||t.match(/^(\d+(?:\.\d+)?)\s*(?:kg|kilo)\b/);
  if(m)return{kind:'kg',kg:parseFloat(m[1])};
  return null;
}
/* 1RM'e ve hedef yüke göre kg. Çözülemiyorsa null (uydurma yok). */
function liftResolveKg(load,rm){
  const p=liftParseLoad(load);
  if(!p)return null;
  if(p.kind==='kg')return p.kg>0?p.kg:null;
  if(p.kind==='pct'&&rm>0&&p.pct>0&&p.pct<=130)return liftRound(rm*p.pct/100,2.5);
  return null;
}
const liftRmOf=(ath,name)=>{const r=ath&&ath.rm&&ath.rm[liftNorm(name)];return r&&r.kg>0?r.kg:null;};
/* Epley; tek tekrarda kg'ın kendisi, 12 tekrardan sonrası güvenilmez sayılıp kesilir. */
function liftE1rm(kg,reps){
  if(!(kg>0)||!(reps>0))return null;
  if(reps===1)return kg;
  return kg*(1+Math.min(reps,12)/30);
}
const liftPlannedSets=s=>{const m=String(s==null?'':s).match(/\d+/);return m?Math.max(1,Math.min(10,parseInt(m[0],10))):0;};
const liftPlannedReps=r=>{const t=String(r==null?'':r).trim();return /^\d+$/.test(t)?parseInt(t,10):null;};

/* ---- Yayın: takvimden plan ---- */
function liftPlanForDay(ath,date){
  const day=((ath.days||{})[date])||{};
  const items=[],titles=[];
  (day.sessions||[]).forEach((s,si)=>{
    if(!s||sesKind(s))return;
    let any=false;
    (s.blocks||[]).forEach((b,bi)=>{
      if(!b||blkKind(b)==='ball')return;
      (b.exercises||[]).forEach((x,ei)=>{
        const name=String((x&&x.name)||'').trim();
        if(!name||!(String(x.sets||'').trim()||String(x.reps||'').trim()))return;
        any=true;
        const rm=liftRmOf(ath,name);
        const kg=liftResolveKg(x.load,rm);
        items.push({k:`${si}.${bi}.${ei}`,n:name.slice(0,80),b:String(b.name||'').slice(0,40),ss:String(x.superset||'').slice(0,4),
          s:String(x.sets||'').slice(0,12),r:String(x.reps||'').slice(0,16),l:String(x.load||'').slice(0,24),
          kg:kg==null?null:kg,p:String(x.rpe||'').slice(0,8),t:String(x.tempo||'').slice(0,12),
          pv:liftPrevHint(ath,name,date),note:String(x.notes||x.description||'').slice(0,160)});
      });
    });
    if(any&&s.name)titles.push(String(s.name).slice(0,40));
  });
  return{title:titles.join(' · '),items:items.slice(0,40)};
}
/* Aynı egzersizin bu tarihten önceki son kaydı: "80×6 · 80×6 · 77.5×5". */
function liftPrevHint(ath,name,date){
  const key=liftNorm(name);
  const log=(ath.liftLog||[]).filter(e=>e.date<date).sort((a,b)=>b.date.localeCompare(a.date));
  for(const e of log){
    const ex=(e.ex||[]).find(x=>liftNorm(x.n)===key);
    if(ex&&ex.s&&ex.s.length)
      return ex.s.slice(0,5).map(s=>`${s[0]>0?liftFmtKg(s[0]):'BW'}×${s[1]}`).join(' · ');
  }
  return'';
}
function liftHash(o){
  const s=JSON.stringify(o);let h=5381;
  for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;
  return h.toString(36)+'.'+s.length;
}
function liftWindow(){
  const out=[];
  for(let i=-LIFT_WIN_BACK;i<=LIFT_WIN_FWD;i++)out.push(fmt(addD(today,i)));
  return out;
}
/* İstenen doküman kümesi: id → {coachUid,…,rev}. Programı olmayan gün dokümanı yok. */
function liftBuildDocs(uid,team,token,dates){
  const want={};
  (team.athletes||[]).forEach(a=>{
    if(!a||!a.id)return;
    dates.forEach(d=>{
      const plan=liftPlanForDay(a,d);
      if(!plan.items.length)return;
      const body={coachUid:uid,teamId:team.id,token,athleteId:String(a.id),date:d,title:plan.title,items:plan.items};
      want[liftPlanId(token,a.id,d)]={...body,rev:liftHash(body)};
    });
  });
  return want;
}
const LIFT_REV_KEY=teamId=>'coachos.lift.rev.'+teamId;
function liftReadCache(teamId){try{return JSON.parse(localStorage.getItem(LIFT_REV_KEY(teamId))||'{}')||{};}catch(e){return{};}}
function liftWriteCache(teamId,c){try{localStorage.setItem(LIFT_REV_KEY(teamId),JSON.stringify(c));}catch(e){}}
/* Yayımla: değişenleri yaz, penceredeki kalkan programları sil. {written,deleted,total}. */
async function publishLiftPlans(uid,team,token,opts){
  const fb=FB();
  if(!fb||!uid||!token)throw new Error(L('Önce giriş yap ve check-in linkini oluştur.','Sign in and create the check-in link first.'));
  const dates=liftWindow();
  const want=liftBuildDocs(uid,team,token,dates);
  const cache=(opts&&opts.force)?{}:liftReadCache(team.id);
  const ids=Object.keys(want);
  const toWrite=ids.filter(id=>cache[id]!==want[id].rev);
  const inWin=id=>dates.some(d=>id.endsWith('_'+d));
  const toDelete=Object.keys(cache).filter(id=>!want[id]&&inWin(id));
  const col=fb.firestore().collection(LIFT_PLANS);
  const ops=[...toWrite.map(id=>({t:'set',id})),...toDelete.map(id=>({t:'del',id}))];
  for(let i=0;i<ops.length;i+=400){
    const b=fb.firestore().batch();
    ops.slice(i,i+400).forEach(o=>{
      if(o.t==='set')b.set(col.doc(o.id),{...JSON.parse(JSON.stringify(want[o.id])),updatedAt:new Date().toISOString()});
      else b.delete(col.doc(o.id));
    });
    await b.commit();
  }
  const next={};ids.forEach(id=>{next[id]=want[id].rev;});
  /* Pencere dışına çıkmış (eski) kayıtlar önbellekten düşer; dokümanları kalır. */
  liftWriteCache(team.id,next);
  return{written:toWrite.length,deleted:toDelete.length,total:ids.length};
}

/* ---- Gelen günlük → sporcunun liftLog'u ---- */
function liftAtIso(d){
  const t=d&&d.at;
  if(t&&typeof t.toDate==='function'){try{return t.toDate().toISOString();}catch(e){return'';}}
  return typeof t==='string'?t:'';
}
/* Sporcudan gelen veri GÜVENİLMEZ: sayılar sınırlanır, adlar kısaltılır, fazlası atılır. */
function liftEntryFromDoc(d){
  const ex=[];
  (Array.isArray(d.ex)?d.ex:[]).slice(0,40).forEach(x=>{
    if(!x||typeof x!=='object')return;
    const n=String(x.n||'').trim().slice(0,80);
    const s=[];
    (Array.isArray(x.s)?x.s:[]).slice(0,20).forEach(r=>{
      if(!r||typeof r!=='object')return;
      const reps=liftClamp(r.r,1,1000),kg=liftClamp(r.kg==null?0:r.kg,0,1000);
      if(reps==null||kg==null)return;
      const p=r.p==null?null:liftClamp(r.p,1,10);
      s.push([Math.round(kg*100)/100,Math.round(reps),p==null?null:p]);
    });
    if(!n||!s.length)return;
    const pl=x.pl&&typeof x.pl==='object'?x.pl:{};
    ex.push({k:String(x.k||'').slice(0,24),n,
      pl:{s:String(pl.s||'').slice(0,12),r:String(pl.r||'').slice(0,16),l:String(pl.l||'').slice(0,24),kg:liftClamp(pl.kg,0,1000)},s});
  });
  return{id:String(d._docId||''),date:String(d.date||''),at:liftAtIso(d),pid:String(d.planId||''),
    note:String(d.note||'').slice(0,500),ex};
}
/* team.athletes'e işlenecek hali; değişen yoksa null (snapshot döngüsü kurmasın). */
function liftMerge(team,docs){
  if(!docs||!docs.length)return null;
  const byId=new Map((team.athletes||[]).map((a,i)=>[a.id,i]));
  const sorted=docs.slice().sort((a,b)=>String(liftAtIso(a)).localeCompare(String(liftAtIso(b))));
  let athletes=null,touched=0;
  sorted.forEach(d=>{
    const i=byId.get(d.athleteId);
    if(i==null||!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date||'')))return;
    const entry=liftEntryFromDoc(d);
    if(!entry.ex.length)return;
    const a=(athletes||team.athletes)[i];
    const log=a.liftLog||[];
    const k=log.findIndex(e=>e.date===entry.date&&(e.pid||'')===entry.pid);
    if(k>=0){
      if(log[k].id===entry.id)return;                                  // zaten işlendi
      if(entry.at&&log[k].at&&entry.at<log[k].at)return;                // eskisi yenisini ezmesin
    }
    if(!athletes)athletes=team.athletes.slice();
    const nl=k>=0?log.map((e,j)=>j===k?entry:e):[...log,entry];
    athletes[i]={...a,liftLog:nl.sort((x,y)=>x.date.localeCompare(y.date))};
    touched++;
  });
  return touched?{athletes,touched}:null;
}

/* ---- Hesaplar ---- */
function liftExStats(x){
  let reps=0,vol=0,top=0,e1=0,kgSum=0,kgN=0;
  (x.s||[]).forEach(([kg,r])=>{
    reps+=r;vol+=kg*r;
    if(kg>0){kgSum+=kg;kgN++;}
    if(kg>top)top=kg;
    const e=liftE1rm(kg,r);if(e&&e>e1)e1=e;
  });
  const ps=liftPlannedSets(x.pl&&x.pl.s),pr=liftPlannedReps(x.pl&&x.pl.r);
  return{sets:(x.s||[]).length,reps,vol:Math.round(vol),top,e1:e1?Math.round(e1*10)/10:0,
    avgKg:kgN?kgSum/kgN:0,plannedSets:ps,plannedReps:pr,plannedKg:x.pl&&x.pl.kg>0?x.pl.kg:null,
    avgReps:(x.s||[]).length?reps/(x.s||[]).length:0};
}
function liftEntryStats(e){
  const ex=(e.ex||[]).map(x=>({x,st:liftExStats(x)}));
  const planned=ex.filter(o=>o.st.plannedSets>0);
  const pl=planned.reduce((s,o)=>s+o.st.plannedSets,0);
  const done=planned.reduce((s,o)=>s+Math.min(o.st.sets,o.st.plannedSets),0);
  return{ex,sets:ex.reduce((s,o)=>s+o.st.sets,0),reps:ex.reduce((s,o)=>s+o.st.reps,0),vol:ex.reduce((s,o)=>s+o.st.vol,0),
    adherence:pl?Math.round(done/pl*100):null};
}
/* Egzersiz bazında en iyi e1RM geçmişi: normAd → [{date,e1,kg,r}] (tarihe göre). */
function liftBestMap(ath){
  const m={};
  (ath.liftLog||[]).forEach(e=>(e.ex||[]).forEach(x=>{
    const key=liftNorm(x.n);let best=null;
    (x.s||[]).forEach(([kg,r])=>{const v=liftE1rm(kg,r);if(v&&(!best||v>best.e1))best={e1:v,kg,r};});
    if(best)(m[key]||(m[key]=[])).push({date:e.date,n:x.n,...best});
  }));
  Object.values(m).forEach(a=>a.sort((p,q)=>p.date.localeCompare(q.date)));
  return m;
}
/* Bu günlükte yeni rekor (önceki tüm e1RM'lerin üstü) kıran egzersizler. */
function liftPRsOf(ath,entry){
  const m=liftBestMap(ath);const out=[];
  (entry.ex||[]).forEach(x=>{
    const key=liftNorm(x.n),hist=m[key]||[];
    const mine=hist.filter(h=>h.date===entry.date);
    if(!mine.length)return;
    const cur=Math.max(...mine.map(h=>h.e1));
    const before=hist.filter(h=>h.date<entry.date);
    if(before.length&&cur>Math.max(...before.map(h=>h.e1))+1e-9)out.push(x.n);
  });
  return out;
}
/* 1RM önerisi: ≤6 tekrarlı setlerin en iyi e1RM'i, 2.5 kg'a yuvarlanmış. */
function liftSuggestRm(ath){
  const out={};
  (ath.liftLog||[]).forEach(e=>(e.ex||[]).forEach(x=>{
    (x.s||[]).forEach(([kg,r])=>{
      if(!(kg>0)||r>6)return;
      const v=liftE1rm(kg,r);if(!v)return;
      const key=liftNorm(x.n);
      if(!out[key]||v>out[key].e1)out[key]={n:x.n,e1:v,kg:liftRound(v,2.5)};
    });
  }));
  return out;
}
/* Son n haftanın hacim yükü (kg×tekrar), eskiden yeniye. */
function liftWeekly(ath,n){
  const start=sow(addD(today,-7*(n-1)));
  const weeks=[];
  for(let i=0;i<n;i++)weeks.push({from:fmt(addD(start,7*i)),vol:0,sets:0});
  (ath.liftLog||[]).forEach(e=>{
    const w=weeks.filter(w=>w.from<=e.date).pop();
    if(!w||diffD(w.from,e.date)>6)return;
    const st=liftEntryStats(e);w.vol+=st.vol;w.sets+=st.sets;
  });
  return weeks;
}

/* ---- Dinleyiciler (görünmez) ---- */
function LiftInbox({sync,setData}){
  const user=sync&&sync.user,status=sync&&sync.status;
  const[ready,setReady]=useState(false);
  useEffect(()=>{if(status==='synced')setReady(true);},[status]);
  useEffect(()=>{if(!user)setReady(false);},[user]);
  const statusRef=useRef(status);statusRef.current=status;
  const seen=useRef([]);
  useEffect(()=>{
    const fb=FB();
    if(!fb||!user||!ready)return;
    let alive=true;
    const col=fb.firestore().collection(LIFT_LOGS);
    const sweep=()=>{
      if(statusRef.current!=='synced')return;
      const now=Date.now();
      seen.current.filter(d=>{const t=d.at&&d.at.toDate?d.at.toDate().getTime():null;return t!=null&&now-t>LIFT_KEEP_MS;})
        .forEach(d=>col.doc(d._docId).delete().catch(()=>{}));
    };
    const unsub=col.where('coachUid','==',user.uid).onSnapshot(snap=>{
      if(!alive)return;
      const docs=[];
      snap.forEach(d=>{const v=d.data();if(v)docs.push({...v,_docId:d.id});});
      seen.current=docs;
      if(docs.length)setData(prev=>{
        let changed=false;
        const teams=(prev.teams||[]).map(t=>{
          const mine=docs.filter(d=>d.teamId===t.id);
          if(!mine.length)return t;
          const res=liftMerge(t,mine);
          if(!res)return t;
          changed=true;
          return{...t,athletes:res.athletes};
        });
        return changed?{...prev,teams}:prev;
      });
      sweep();
    },e=>console.warn('lift inbox',e));
    const iv=setInterval(sweep,5*60*1000);
    return()=>{alive=false;clearInterval(iv);unsub();};
  },[user,ready,setData]);
  return null;
}
/* Otomatik yayın: açıksa, takvim değiştikten 4 sn sonra değişen planlar yayımlanır. */
function LiftSync({team,sync}){
  const user=sync&&sync.user,status=sync&&sync.status;
  const cfg=(team&&team.checkin)||{};
  const on=!!(cfg.lift&&cfg.token);
  useEffect(()=>{
    if(!on||!user||status!=='synced')return;
    const t=setTimeout(()=>{publishLiftPlans(user.uid,team,cfg.token).catch(e=>console.warn('lift publish',e));},4000);
    return()=>clearTimeout(t);
  },[on,user&&user.uid,status,team&&team.id,team&&team.athletes,cfg.token]);
  return null;
}

/* ---- Check-in ekranı bölümü: link + otomatik yayın ---- */
function LiftSection({team,setData,user,loaded,ensureLink,copyText}){
  const cfg=team.checkin||{};
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(''),4000);};
  const saveCfg=upd=>setData(prev=>({...prev,teams:(prev.teams||[]).map(t=>
    t.id===team.id?{...t,checkin:{...(t.checkin||{}),...upd}}:t)}));
  const today_=fmt(today);
  const athletes=(team.athletes||[]).filter(a=>(a.name||'').trim());
  const logged=athletes.filter(a=>(a.liftLog||[]).some(e=>e.date===today_)).length;
  const planned=athletes.filter(a=>liftPlanForDay(a,today_).items.length).length;
  const run=async fn=>{setErr('');setBusy(true);try{await fn();}catch(e){setErr((e&&e.message)||String(e));}finally{setBusy(false);}};
  const copy=()=>run(async()=>{
    const t=await ensureLink();
    const ok=await copyText(liftUrl(t));
    if(!ok)throw new Error(L('Panoya kopyalanamadı.','Could not copy to clipboard.'));
    flash(L('Link kopyalandı.','Link copied.'));
  });
  const publish=()=>run(async()=>{
    const t=await ensureLink();
    const r=await publishLiftPlans(user.uid,team,t,{force:true});
    flash(L(`${r.total} program yayımlandı (dün … +${LIFT_WIN_FWD} gün).`,`${r.total} programme(s) published (yesterday … +${LIFT_WIN_FWD} days).`));
  });
  const toggle=on=>run(async()=>{
    if(on){const t=await ensureLink();await publishLiftPlans(user.uid,team,t,{force:true});saveCfg({lift:true});flash(L('Otomatik yayın açıldı.','Auto-publish is on.'));}
    else{saveCfg({lift:false});flash(L('Otomatik yayın kapatıldı.','Auto-publish is off.'));}
  });
  return(<div className="panel lift-sec">
    <div className="ck-head"><div className="ck-head-t">
      <b>{L('Antrenman Günlüğü (kg / tekrar)','Training Log (kg / reps)')}</b>
      <span>{L('Sporcu, takvimindeki o günkü programa set set kg ve tekrar girer. Plan ile gerçekleşen sporcu sayfasında (Atletik Profil) karşılaştırılır. Link, check-in linkleriyle aynı takım anahtarını kullanır.',
        'Athletes enter kg and reps set by set against that day\'s programme on their calendar. Plan vs actual is compared on the athlete page (Athletic Profile). The link uses the same team key as the check-in links.')}</span>
    </div></div>
    {err&&<div className="ck-note err">{err}</div>}
    <div className="row" style={{gap:8,flexWrap:'wrap',marginTop:8}}>
      <button className="btn" onClick={copy} disabled={busy||!user||!loaded}>{L('Günlük linkini kopyala','Copy log link')}</button>
      <button className="btn sec" onClick={publish} disabled={busy||!user||!loaded}>{L('Programları şimdi yayımla','Publish programmes now')}</button>
      <label className="row" style={{gap:6,alignItems:'center',cursor:'pointer'}}>
        <input type="checkbox" checked={!!cfg.lift} disabled={busy||!user||!loaded} onChange={e=>toggle(e.target.checked)}/>
        <span>{L('Takvim değişince otomatik yayımla','Auto-publish when the calendar changes')}</span>
      </label>
    </div>
    {cfg.token&&<div className="help" style={{marginTop:8}}><code>{liftUrl(cfg.token)}</code></div>}
    <div className="help" style={{marginTop:6}}>
      {L(`Bugün: ${planned} sporcunun programı var, ${logged} sporcu kg/tekrar girdi.`,`Today: ${planned} athlete(s) have a programme, ${logged} entered kg/reps.`)}
      {msg&&<b style={{marginLeft:8}}>{msg}</b>}
    </div>
  </div>);
}

