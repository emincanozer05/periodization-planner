/* =========================================================
   EKİP VE ERİŞİM (senkron Faz 5b)
   =========================================================
   • TeamAccessPanel — Ayarlar'da, yalnızca sahip ve yöneticiye: davet linki (rol, takımlar, 7 gün),
     üye listesi (rol / takım değiştir, çıkar), kulüp adı. Kurallar: firestore.rules → workspaces/**.
   • useJoinInvite — adres ?join=<kulüp>.<davet> ile açılınca: giriş yapılmışsa onay sorar; kişinin
     kendi üyeliği davetteki rol ve takımlarla açılır, davet aynı batch'te kullanıldı olarak işaretlenir
     ve users/{uid}/memberships/{kulüp} yazılır; uygulama o kulübe geçer.
   • ClubSwitcher — birden fazla kulübe üye olan için menünün altındaki seçici.
   Hepsi yalnızca yeni yapıda (taşınmış hesap / kulüp) çalışır. */

/* Başka birinin kulübünü açan üye mi (App her çizimde ayarlar). Sahibe bağlı özellikler (check-in,
   Polar, uyarılar, bildirim) bu durumda gizlenir: hepsi bugün kişinin kendi kimliğini koç sayıyor. */
let CLUB_MEMBER=false;

const TA_ROLES=()=>[
  {v:'admin',l:L('Yönetici','Admin'),d:L('Her şeyi düzenler, üye davet eder ve yönetir','Edits everything, invites and manages members')},
  {v:'coach',l:L('Antrenör','Coach'),d:L('Erişimi olan takımlarda her şeyi düzenler','Edits everything in the teams they can access')},
  {v:'viewer',l:L('İzleyici','Viewer'),d:L('Yalnızca görür','View only')},
];
const taRoleLabel=r=>r==='owner'?L('Sahip','Owner'):(TA_ROLES().find(x=>x.v===r)||{}).l||r;
const taToken=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(36).padStart(2,'0')).join('').slice(0,28);};

function TeamAccessPanel({sync,data}){
  const v2=sync&&sync.v2;
  const fb=FB();
  const user=sync&&sync.user;
  const canManage=!!(v2&&v2.active&&(v2.role==='owner'||v2.role==='admin'));
  const[members,setMembers]=useState([]);
  const[clubName,setClubName]=useState('');
  const[role,setRole]=useState('coach');
  const[teamsSel,setTeamsSel]=useState(['*']);
  const[link,setLink]=useState('');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const ws=v2&&v2.ws;
  useEffect(()=>{
    if(!canManage||!fb||!ws)return;
    const fs=fb.firestore();
    const a=fs.collection('workspaces/'+ws+'/members').onSnapshot(s=>setMembers(s.docs.map(d=>({id:d.id,...d.data()}))),e=>setErr(String(e.code||e)));
    const b=fs.doc('workspaces/'+ws).onSnapshot(s=>setClubName((s.exists&&s.data().name)||''),()=>{});
    return()=>{a();b();};
  },[canManage,ws]);
  if(!canManage)return null;
  const teams=(data&&data.teams)||[];
  const teamName=id=>id==='*'?L('Bütün takımlar','All teams'):((teams.find(t=>t.id===id)||{}).setup||{}).teamName||id;
  const toggleTeam=id=>setTeamsSel(cur=>id==='*'?['*']:(cur.includes(id)?cur.filter(x=>x!==id):cur.filter(x=>x!=='*').concat([id])));
  const fs=fb.firestore();
  const invite=async()=>{
    setErr('');setBusy(true);
    try{
      const t=taToken(),sel=teamsSel.length?teamsSel:['*'];
      await fs.doc('workspaces/'+ws+'/invites/'+t).set({role,teams:sel,usedBy:null,createdBy:user.uid,
        expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()+7*864e5),createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      setLink(location.origin+location.pathname+'?join='+ws+'.'+t);
    }catch(e){setErr(String(e.code||e.message||e));}
    setBusy(false);
  };
  const update=(m,patch)=>fs.doc('workspaces/'+ws+'/members/'+m.id).update(patch).catch(e=>setErr(String(e.code||e)));
  const remove=m=>{if(confirm(L(`${m.name||m.email||m.id} kulüpten çıkarılsın mı?`,`Remove ${m.name||m.email||m.id} from the club?`)))
    fs.doc('workspaces/'+ws+'/members/'+m.id).delete().catch(e=>setErr(String(e.code||e)));};
  return(<div className="panel su-panel" data-panel="team-access"><h2>{L('Ekip ve erişim','Team & access')}</h2>
    <p className="su-lead">{L('Ekibin her üyesi kendi hesabıyla girer. Davet linki 7 gün geçerli ve tek kullanımlık.',
      'Every member signs in with their own account. Invite links are valid for 7 days and single-use.')}</p>
    {v2.role==='owner'&&<div style={{marginBottom:12}}>
      <label htmlFor="ta-club">{L('Kulüp adı','Club name')}</label>
      <input id="ta-club" defaultValue={clubName} key={clubName} onBlur={e=>{const v=e.target.value.trim();if(v!==clubName)fs.doc('workspaces/'+ws).update({name:v}).catch(x=>setErr(String(x.code||x)));}}/>
    </div>}
    <div style={{display:'grid',gap:8,gridTemplateColumns:'minmax(0,1fr)'}}>
      <label htmlFor="ta-role">{L('Rol','Role')}</label>
      <select id="ta-role" value={role} onChange={e=>setRole(e.target.value)}>
        {TA_ROLES().map(r=><option key={r.v} value={r.v}>{r.l} — {r.d}</option>)}
      </select>
      <div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{L('Erişeceği takımlar','Teams they can access')}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {['*'].concat(teams.map(t=>t.id)).map(id=><button key={id} type="button" className={'btn sm'+(teamsSel.includes(id)?'':' sec')}
            aria-pressed={teamsSel.includes(id)} onClick={()=>toggleTeam(id)}>{teamName(id)}</button>)}
        </div>
      </div>
      <button type="button" className="btn" disabled={busy} onClick={invite}>{L('Davet linki oluştur','Create invite link')}</button>
      {link&&<div className="ta-link" style={{display:'flex',gap:6}}>
        <input readOnly value={link} onFocus={e=>e.target.select()} aria-label={L('Davet linki','Invite link')}/>
        <button type="button" className="btn sec sm" onClick={()=>{try{navigator.clipboard.writeText(link);}catch(e){}}}>{L('Kopyala','Copy')}</button>
      </div>}
    </div>
    <div style={{marginTop:16,fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.4}}>{L('Üyeler','Members')}</div>
    <div role="list">
      {members.sort((a,b)=>(a.role==='owner'?-1:b.role==='owner'?1:0)).map(m=>{
        const locked=m.role==='owner'||m.id===user.uid;
        return(<div role="listitem" key={m.id} className="ta-member" style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
          <div style={{flex:'1 1 180px',minWidth:0}}>
            <div style={{fontWeight:600}}>{m.name||m.email||(m.role==='owner'?L('Sahip','Owner'):m.id.slice(0,8))}</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{(m.teams||[]).map(teamName).join(', ')}</div>
          </div>
          {locked?<span style={{fontSize:12}}>{taRoleLabel(m.role)}</span>
            :<select value={m.role} aria-label={L('Rol','Role')} onChange={e=>update(m,{role:e.target.value})}>
              {TA_ROLES().map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select>}
          {!locked&&<button type="button" className="btn sec sm" onClick={()=>remove(m)}>{L('Çıkar','Remove')}</button>}
        </div>);
      })}
    </div>
    {err&&<div role="alert" style={{marginTop:8,color:'var(--red)',fontSize:13}}>{err}</div>}
  </div>);
}

/* ?join=<kulüp>.<davet> */
function useJoinInvite(sync){
  const user=sync&&sync.user;
  useEffect(()=>{
    if(!user)return;
    let q='';try{q=new URLSearchParams(location.search).get('join')||'';}catch(e){}
    const m=/^([A-Za-z0-9_-]{1,128})\.([A-Za-z0-9]{8,64})$/.exec(q);
    if(!m)return;
    const ws=m[1],tok=m[2];
    const clear=()=>{try{const u=new URL(location.href);u.searchParams.delete('join');history.replaceState(null,'',u.toString());}catch(e){}};
    (async()=>{
      const fs=FB().firestore();
      try{
        if(ws===user.uid){clear();return;}
        const inv=await fs.doc('workspaces/'+ws+'/invites/'+tok).get();
        const d=inv.exists?inv.data():null;
        if(!d||d.usedBy||!(d.expiresAt&&d.expiresAt.toMillis()>Date.now())){
          alert(L('Bu davet linki geçersiz, kullanılmış ya da süresi dolmuş. Kulüp yöneticisinden yeni bir link iste.',
            'This invite link is invalid, used or expired. Ask the club admin for a new one.'));clear();return;}
        if(!confirm(L(`Bu kulübe ${taRoleLabel(d.role)} olarak katılmak istiyor musun?`,`Join this club as ${taRoleLabel(d.role)}?`))){clear();return;}
        const b=fs.batch();
        b.set(fs.doc('workspaces/'+ws+'/members/'+user.uid),{uid:user.uid,role:d.role,teams:d.teams,invite:tok,
          name:String(user.displayName||''),email:String(user.email||''),joinedAt:firebase.firestore.FieldValue.serverTimestamp()});
        b.update(fs.doc('workspaces/'+ws+'/invites/'+tok),{usedBy:user.uid,usedAt:firebase.firestore.FieldValue.serverTimestamp()});
        b.set(fs.doc('users/'+user.uid+'/memberships/'+ws),{ws,at:firebase.firestore.FieldValue.serverTimestamp()});
        await b.commit();
        slog('kulüp: davetle katıldı','ws='+ws.slice(0,6)+' rol='+d.role);
        clear();
        if(sync.v2&&sync.v2.select)sync.v2.select(ws);
      }catch(e){
        console.warn('join',e);
        alert(L('Kulübe katılınamadı: ','Could not join the club: ')+String(e.code||e.message||e));clear();
      }
    })();
  },[user&&user.uid]);
}

/* Birden fazla kulüp ya da kendi (eski düzendeki) hesabı + bir kulüp varsa: menünün altında seçici. */
function ClubSwitcher({sync}){
  const v2=sync&&sync.v2,user=sync&&sync.user;
  const[names,setNames]=useState({});
  const clubs=(v2&&v2.clubs)||[];
  const others=clubs.filter(id=>id!==(user&&user.uid));
  useEffect(()=>{
    if(!others.length)return;
    const fs=FB().firestore();
    const offs=others.map(id=>fs.doc('workspaces/'+id).onSnapshot(s=>setNames(n=>({...n,[id]:(s.exists&&s.data().name)||''})),()=>{}));
    return()=>offs.forEach(f=>f());
  },[others.join('|')]);
  if(!user||!others.length)return null;
  const cur=(v2.active&&v2.ws)||'';
  return(<div className="club-switch" style={{padding:'6px 12px'}}>
    <label htmlFor="club-sel" style={{fontSize:11,color:'var(--muted)'}}>{L('Kulüp','Club')}</label>
    <select id="club-sel" value={cur===user.uid?'':cur} onChange={e=>v2.select(e.target.value||null)} style={{width:'100%'}}>
      <option value="">{L('Kendi hesabım','My own account')}</option>
      {others.map(id=><option key={id} value={id}>{names[id]||L('Kulüp','Club')+' · '+id.slice(0,6)}</option>)}
    </select>
  </div>);
}
