/* =========================================================
   CALENDAR (reusable for team & athlete)
   ========================================================= */
const SESS_COLORS=['#67e8f9','#fcd34d','#86efac','#f9a8d4'];
/* `inline` keeps the session view and the day editor inside the calendar itself instead
   of throwing them over the page as a modal — the Individualization card uses it, so a
   coach editing an athlete's session never leaves the athlete's card. */
/* `coachAthlete` is the one athlete this calendar belongs to — passed only by the
   individualization card, where a session is being written FOR somebody. It is what the
   assistant coach reads; everywhere else it is absent and the button does not appear. */
/* SENDING THE WEEK. Printing it is one thing a coach does with a plan; the other, far
   more often, is sending it — and until now that meant printing to PDF and hunting for
   the file in WhatsApp. The week is written out as text the moment this opens (editable,
   because the message a coach sends usually has a line of their own at the top), and
   every way out of here carries that same text.
   THE STAFF COME FIRST, by name and by face: these are the people a weekly plan is
   actually sent to, and a coach should not have to remember which number is the
   physio's. One tap opens WhatsApp on that person's own conversation. Everyone else —
   a parents' group, a club address — is one row further down, where the generic
   buttons are. */
function ShareWeekModal({title,weekStart,days,athletes,staff,onClose}){
  const base=useMemo(()=>weekShareText(title,weekStart,days,athletes),[title,weekStart,days,athletes]);
  const[text,setText]=useState(base);
  const[imgCopied,setImgCopied]=useState(false);
  /* The sheet itself, rendered once when the panel opens and held for every button that
     wants it: the preview on the left, the file that is downloaded, the image put on the
     clipboard, the file handed to the share sheet. Rendering it four times would be four
     html2canvas passes for one identical picture. */
  const[img,setImg]=useState({state:'loading',url:'',blob:null});
  useEffect(()=>{
    let dead=false,url='';
    setImg({state:'loading',url:'',blob:null});
    buildWeekImageBlob(title,weekStart,days,athletes,2).then(blob=>{
      if(dead||!blob){return;}
      url=URL.createObjectURL(blob);
      setImg({state:'ok',url,blob});
    }).catch(e=>{if(!dead)setImg({state:'err',url:'',blob:null,msg:e&&e.message});});
    return()=>{dead=true;if(url)URL.revokeObjectURL(url);};
    // eslint-disable-next-line
  },[title,weekStart,days,athletes]);
  const list=(Array.isArray(staff)?staff:[]).map(normStaff);
  const range=`${fd(weekStart)} – ${fd(fmt(addD(parseD(weekStart),6)))}`;
  const subject=L(`${title} · Haftalık plan ${range}`,`${title} · Weekly plan ${range}`);
  const fileName=`${String(title||'week').replace(/[^a-zA-Z0-9_-]/g,'_')}_${weekStart}.png`;
  // wa.me wants the number as digits alone — no +, no spaces, no dashes.
  const waNum=m=>String(`${m.phoneCode||''}${m.phone||''}`).replace(/\D/g,'');
  const open=url=>window.open(url,'_blank','noopener');
  // wa.me with a number opens that person's chat; without one, WhatsApp asks who to send to.
  const toWhatsApp=num=>open(`https://wa.me/${num||''}?text=${encodeURIComponent(text)}`);
  const toMail=()=>{window.location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;};
  /* FIVE WAYS OUT WAS FOUR TOO MANY. What is left is one row: send it, mail it, keep the
     file, put the picture on the clipboard — and the device's own share sheet where
     there is one. The three that went were each a second way to do one of these:
     "share as PDF" made a second copy of the very sheet the PNG already is, "copy text"
     duplicated the message box a coach can select from, and the text-only share was the
     share sheet without the picture. */
  const pngDownload=()=>{
    if(!img.blob)return;
    const a=document.createElement('a');a.href=img.url;a.download=fileName;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  };
  /* An image on the clipboard is the one that goes straight into a WhatsApp box with
     ⌘V. Only Chromium browsers carry ClipboardItem; where they do not, the file is
     downloaded instead so the coach still ends up holding the picture. */
  const pngCopy=async()=>{
    if(!img.blob)return;
    try{
      if(typeof ClipboardItem==='undefined'||!navigator.clipboard||!navigator.clipboard.write)throw new Error('no-clipboard');
      await navigator.clipboard.write([new ClipboardItem({'image/png':img.blob})]);
      setImgCopied(true);setTimeout(()=>setImgCopied(false),1800);
    }catch(e){
      pngDownload();
      alert(L('Tarayıcı görsel kopyalamayı desteklemiyor — dosya indirildi.',
              'This browser cannot copy images — the file was downloaded instead.'));
    }
  };
  const pngShare=async()=>{
    if(!img.blob)return;
    const file=new File([img.blob],fileName,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:subject,text});return;}
      catch(e){if(e&&e.name==='AbortError')return;}
    }
    pngDownload();
  };
  return(<div className="modal-bg" onClick={onClose}>
    <div className="modal shw" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div><h2 style={{margin:0,fontSize:18}}>{L('Haftayı Paylaş','Share the Week')}</h2>
          <div className="shw-sub">{title} · {range}</div></div>
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      {/* THE SHEET ON THE LEFT, WHO AND WHAT ON THE RIGHT. What is being sent is the
          bigger half and is looked at first; the staff, the message and the buttons are
          the decision made about it. On a narrow screen the two stack, sheet first. */}
      <div className="shw-b">
        <section className="shw-prev">
          <div className="shw-lbl">{L('Haftalık antrenman çıktısı','The weekly plan sheet')}</div>
          <div className="shw-shot">
            {img.state==='loading'&&<div className="shw-shot-st"><span className="shw-spin"/>{L('Çıktı hazırlanıyor…','Rendering the sheet…')}</div>}
            {img.state==='err'&&<div className="shw-shot-st err">{L('Görsel oluşturulamadı','The image could not be rendered')}{img.msg?` — ${img.msg}`:''}</div>}
            {img.state==='ok'&&<img src={img.url} alt={subject}/>}
          </div>
        </section>
        <section className="shw-side">
          <div className="shw-lbl">{L('Teknik ekip','The staff')}</div>
          {list.length===0
            ?<div className="shw-none">{L('Kadroda teknik ekip yok — Kadro → Teknik Ekip sekmesinden ekleyebilirsin.',
                'No staff on this squad yet — add them on Roster → Staff.')}</div>
            :<div className="shw-staff">
              {list.map(m=>{const r=STAFF_ROLE_BY[m.role]||STAFF_ROLES[0];const num=waNum(m);
                return(<button key={m.id} className={'shw-card'+(num?'':' off')} disabled={!num}
                  onClick={()=>toWhatsApp(num)}
                  title={num?L(`${m.name||'—'} · WhatsApp ile gönder`,`${m.name||'—'} · send on WhatsApp`)
                    :L('Bu kişinin telefonu kayıtlı değil','No phone number saved for this person')}>
                  <span className="shw-av" style={{borderColor:r.c,background:r.bg,color:r.c}}>
                    {m.photo?<img src={mediaSrc(m.photo)} alt=""/>:((m.name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?')}
                  </span>
                  <span className="shw-who"><b>{m.name||L('(isimsiz)','(unnamed)')}</b>
                    <i style={{color:r.c}}>{L(capTR(r.str),r.sen)}</i></span>
                  <span className="shw-go">{num?'WhatsApp ›':L('telefon yok','no phone')}</span>
                </button>);})}
            </div>}
          <div className="shw-lbl">{L('Mesaj','Message')}</div>
          <textarea className="shw-txt" value={text} onChange={e=>setText(e.target.value)} rows={10}/>
          {/* Every way out of here in one row, beside the message they all carry. The two
              that act on the sheet — keep the file, put the picture on the clipboard —
              wait for it to finish rendering; the two that act on the text do not. */}
          <div className="shw-acts">
            <button className="btn sm" onClick={()=>toWhatsApp('')}>{L('WhatsApp ile gönder','Send on WhatsApp')}</button>
            <button className="btn sm sec" onClick={toMail}>{L('E-posta','Email')}</button>
            <button className="btn sm sec" disabled={img.state!=='ok'} onClick={pngDownload}>{L('PNG indir','Download PNG')}</button>
            <button className="btn sm sec" disabled={img.state!=='ok'} onClick={pngCopy}>{imgCopied?L('✓ Kopyalandı','✓ Copied'):L('Görseli kopyala','Copy image')}</button>
            {typeof navigator!=='undefined'&&navigator.share&&
              <button className="btn sm sec" disabled={img.state!=='ok'} onClick={pngShare}><ShareIcon/> {L('Paylaş','Share')}</button>}
          </div>
          <div className="shw-foot"><button className="btn sm sec" onClick={onClose}>{L('Kapat','Close')}</button></div>
        </section>
      </div>
    </div>
  </div>);
}

function CalendarView({days,selected,setSelected,goDayView,weeks,saveDays,setup,athletes,staff,saveAthletes,labelOwner,exercises,inline,coachAthlete}){
  const ref=parseD(selected.date);
  const weekStart=sow(ref);
  const weekEnd=addD(weekStart,6);
  const dayCells=[];for(let i=0;i<7;i++)dayCells.push(addD(weekStart,i));
  const setWeek=d=>{const n=addD(weekStart,d*7);setSelected({year:n.getFullYear(),month:n.getMonth()+1,date:fmt(n)});};
  const[drawerSes,setDrawerSes]=useState(null);
  const[drawerDate,setDrawerDate]=useState(null);
  const[rpeOpen,setRpeOpen]=useState(false);
  const[editDate,setEditDate]=useState(null);
  /* The session card the editor was opened from — what "Back" returns to. Only the id is
     kept, so the panel that reopens reads the session as it stands after the edit. */
  const[editFrom,setEditFrom]=useState(null);
  const[monthRef,setMonthRef]=useState(()=>parseD(selected.date));
  const[calMode,setCalMode]=useState('week');   // single calendar: 'week' (rich strip) | 'month' (grid)
  const[shareOpen,setShareOpen]=useState(false);   // the week, as a message to send
  // What is on the training clipboard right now, so every day column here offers to paste it
  // the moment it is copied — from this calendar or from another athlete's.
  const sesClip=useSessionClipboard();
  const[copied,setCopied]=useState(false);
  useEffect(()=>{setCopied(false);},[drawerSes&&drawerSes.id]);
  useEffect(()=>{setMonthRef(parseD(selected.date));},[selected.date]);
  // ---- Inline editing (so planning happens from the calendar, not the Program tab) ----
  const canEdit=typeof saveDays==='function';
  const teamMode=Array.isArray(athletes)&&typeof saveAthletes==='function';
  /* Daily team load per date, straight from the shared helper Load Monitoring's
     Team Load Trend reads — so the "Daily" figure under a week column is the same
     number that day's bar shows in the trend chart, by construction. */
  const teamDaily=useMemo(()=>teamDailyLoadMap(days,teamMode?athletes:null),[days,athletes,teamMode]);
  const edDay=editDate?(days[editDate]||EDAY(editDate)):null;
  /* One place to mirror a day's team sessions onto the athletes who carry them. The
     roster is written back only when the mirror actually moved — an edit that leaves every
     athlete's copy identical must not push a new roster through the app and the cloud. */
  const syncAths=(dateK,oldS,newS)=>{
    const next=syncSessionsToAthletes(athletes,dateK,oldS,newS);
    if(next!==athletes)saveAthletes(next);
  };
  const svDay=(dateK,upd)=>{
    const d0=days[dateK]||EDAY(dateK);
    const oldS=d0.sessions||[];
    const newDay={...d0,...upd,date:dateK};
    const newS=newDay.sessions||[];
    const nd={...days,[dateK]:newDay};
    if(teamMode&&newS!==oldS){saveDays(nd);syncAths(dateK,oldS,newS);}
    else saveDays(nd);
  };
  const edAdd=p=>svDay(editDate,{sessions:[...(edDay.sessions||[]),SESS(p)]});
  const edUpd=(sid,ns)=>svDay(editDate,{sessions:edDay.sessions.map(s=>s.id===sid?ns:s)});
  const edDel=sid=>svDay(editDate,{sessions:edDay.sessions.filter(s=>s.id!==sid)});
  const edDup=sid=>{const o=edDay.sessions.find(s=>s.id===sid);svDay(editDate,{sessions:[...edDay.sessions,{...o,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,blocks:(o.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))}]});};
  const edMv=(sid,dir)=>{const a=[...edDay.sessions];const i=a.findIndex(s=>s.id===sid);const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];svDay(editDate,{sessions:a});};
  const edCopyYesterday=()=>{const yk=fmt(addD(parseD(editDate),-1));const y=days[yk];if(!y?.sessions?.length){alert('No sessions on the previous day');return;}
    svDay(editDate,{sessions:[...(edDay.sessions||[]),...y.sessions.map(s=>({...s,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,blocks:(s.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))}))]});};
  const openEdit=k=>{if(canEdit){setEditFrom(drawerSes?{id:drawerSes.id,date:drawerDate||k}:null);setDrawerSes(null);setEditDate(k);}else goDayView(k);};
  /* Back out of the plan and onto the session panel it was opened from — the one with the
     movements, the meta tiles and the block list. Straight from the calendar's "+" (no panel
     behind it), it opens the day's first session instead, and it is not offered at all on a
     day with nothing on it yet. */
  const editBackSes=()=>{
    if(!editDate)return null;
    const list=((days[(editFrom&&editFrom.date)||editDate]||{}).sessions)||[];
    return (editFrom&&list.find(x=>x.id===editFrom.id))||((days[editDate]||{}).sessions||[])[0]||null;
  };
  const goBackFromEdit=()=>{
    const dk=(editFrom&&editFrom.date)||editDate;
    const ses=editBackSes();
    setEditDate(null);setEditFrom(null);
    if(ses){setDrawerSes(ses);setDrawerDate(dk);}
  };
  /* Paste the copied training onto a day — here it lands on THIS calendar, which on an
     athlete's card is that athlete's own, so a program written for one player reaches
     another without being typed again. It is added to the day, never over what is there. */
  const pasteSession=k=>{
    const clip=getSessionClipboard();
    if(!canEdit||!clip)return;
    const d0=days[k]||EDAY(k);
    svDay(k,{sessions:[...(d0.sessions||[]),sessionFromClipboard(clip)]});
  };
  /* Inline mode renders the two panels where the calendar sits, so they need no scrim
     and no portal — and the panel that just opened is scrolled to, because in place it
     can land below the fold of the card it belongs to. */
  const layer=node=>inline?node:ReactDOM.createPortal(node,document.body);
  const inlineRef=useRef(null);
  useEffect(()=>{
    if(!inline||!inlineRef.current)return;
    inlineRef.current.scrollIntoView({behavior:'smooth',block:'nearest'});
  },[inline,editDate,drawerSes&&drawerSes.id]);
  // Inline edit of the open drawer session (time / duration / load) without opening
  // the full editor. Persists to days (and syncs to athletes in team mode).
  const drwUpd=patch=>{
    if(!canEdit||!drawerSes)return;
    const dateK=drawerDate||Object.keys(days).find(k=>(days[k].sessions||[]).some(x=>x.id===drawerSes.id));
    if(!dateK)return;
    const ns={...drawerSes,...patch};
    const d0=days[dateK]||EDAY(dateK);const oldS=d0.sessions||[];const newS=oldS.map(s=>s.id===drawerSes.id?ns:s);
    const nd={...days,[dateK]:{...d0,sessions:newS,date:dateK}};
    if(teamMode){saveDays(nd);syncAths(dateK,oldS,newS);}else saveDays(nd);
    setDrawerSes(ns);
  };
  /* Renaming from the session panel renames the block heading the editor shows with it
     (the first block's, or the heading of a session with no blocks yet): the card and the
     heading are one name. */
  const drwRename=v=>{
    if(!drawerSes)return;
    const bl=drawerSes.blocks||[];
    drwUpd(bl.length?{name:v,blocks:bl.map((b,i)=>i===0?{...b,name:v}:b)}:{name:v,soloName:v});
  };
  // ---- Per-athlete RPE for a team session ----
  // Writes to each athlete's srpeLog (the canonical inner-load record that powers
  // the sRPE chart, Wellness heatmap & ACWR). One entry per athlete per session,
  // tagged with sessionId so re-entering a value updates it instead of duplicating.
  const aInit=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const srpeSlot=lt=>{const x=(lt||'').toLowerCase();return(x.includes('mechanical')||x.includes('neuromuscular'))?'sc':'tp';};
  const rpeCatOf=ses=>(ses&&ses.rpeCat)||(sesKind(ses)==='match'?'game':srpeSlot(ses&&ses.loadType));
  /* Who the session is for: the athletes assigned to it, or the whole roster while none
     are — the same list the RPE panel shows and the team sRPE averages. */
  const rpeRoster=ses=>{
    const ids=(ses&&ses.athletes)||[];
    const parts=ids.map(id=>(athletes||[]).find(a=>a.id===id)).filter(Boolean);
    return parts.length?parts:(athletes||[]);
  };
  /* One athlete's RPE for this session. A number the coach typed here is recorded against
     the session id, so it wins. Otherwise the athlete's OWN rating is read — the one they
     submitted on the day's form, which is what Load Monitoring charts — matched by the
     category this session records under, so a day holding both a ball practice and an S&C
     session takes the right rating for each. Load is the athlete's own sRPE for that slot
     when the form carried one, and RPE × this session's duration when it did not. */
  const athRPEFor=(a,ses,dk)=>{
    const log=(a&&a.srpeLog)||[];
    const dur=Number(ses&&ses.duration)||0;
    const own=log.find(e=>e.sessionId===(ses&&ses.id));
    if(own){
      const v=[own.scRPE,own.tpRPE,own.gameRPE].find(x=>x!==''&&x!=null);
      const ld=(own.totalLoad!==''&&own.totalLoad!=null)?own.totalLoad:'';
      const od=[own.scDuration,own.tpDuration,own.gameDuration].find(x=>x!==''&&x!=null);
      return{rpe:v==null?'':v,load:ld,dur:od==null?'':od,fromAthlete:false};
    }
    const cat=rpeCatOf(ses);
    /* What they submitted is a rating for their day, not for one session on it, so it is read
       onto a session only while the day holds a single session in that category. With two S&C
       sessions on one day there is no telling which one the number is for, and counting it on
       both would double the day's load. */
    if((((days[dk]||{}).sessions)||[]).filter(s=>rpeCatOf(s)===cat).length>1)return{rpe:'',load:'',fromAthlete:false};
    for(const e of log){
      if(e.sessionId||e.date!==dk)continue;
      const v=e[cat+'RPE'];
      if(v===''||v==null||isNaN(Number(v)))continue;
      const ld=e[cat+'Load'];
      /* The minutes they reported with it — for a match, the time they were on the floor. */
      const fd=e[cat+'Duration'];
      return{rpe:v,load:(ld!==''&&ld!=null)?ld:(dur?Math.round(Number(v)*dur):''),
        formLoad:(ld!==''&&ld!=null)?ld:'',dur:(fd!==''&&fd!=null&&!isNaN(Number(fd)))?Number(fd):'',fromAthlete:true};
    }
    return{rpe:'',load:'',fromAthlete:false};
  };
  /* The team sRPE and AU a session should be carrying, given what its athletes rated it —
     or null when it already says exactly that. Team sRPE = the average of their ratings;
     AU = avg × duration, unless the AU was set by hand. A session sRPE the coach typed
     themselves is left alone by the passive pass; entering a rating in the panel is a
     deliberate act, so that path passes `force`. */
  const srpePatchFor=(ses,dk,aths,opts)=>{
    if(!ses)return null;
    const handSet=ses.sRPE!==''&&ses.sRPE!=null&&!ses.srpeFromManual;
    if(handSet&&!(opts&&opts.force))return null;
    const ids=ses.athletes||[];
    const parts=ids.map(id=>(aths||[]).find(a=>a.id===id)).filter(Boolean);
    const roster=parts.length?parts:(aths||[]);
    const rs=[];
    roster.forEach(a=>{
      const r=athRPEFor(a,ses,dk).rpe;
      if(r!==''&&r!=null&&!isNaN(Number(r)))rs.push(Number(r));
    });
    const dur=Number(ses.duration)||0;
    const avg=rs.length?rs.reduce((x,y)=>x+y,0)/rs.length:null;
    let patch;
    if(avg!=null){
      patch={sRPE:Math.round(avg*10)/10,srpeFromManual:true};
      if(!ses.auManual)patch.au=Math.round(avg*dur);
    }else if(ses.srpeFromManual){ // last rating removed → clear what this pass set
      patch={sRPE:'',srpeFromManual:false};
      if(!ses.auManual)patch.au='';
    }else return null;
    // Nothing new to say: leave the session (and the render loop) alone.
    if(Object.keys(patch).every(k=>String(ses[k]==null?'':ses[k])===String(patch[k]==null?'':patch[k])))return null;
    return patch;
  };
  // The open session's own sRPE / AU, brought into step with the ratings on the spot.
  const syncSessionSRPE=(aths,dk)=>{
    if(!drawerSes)return;
    const d0=days[dk];if(!d0)return;
    const patch=srpePatchFor(drawerSes,dk,aths,{force:true});
    if(!patch)return;
    const newS=(d0.sessions||[]).map(s=>s.id===drawerSes.id?{...s,...patch}:s);
    saveDays({...days,[dk]:{...d0,sessions:newS,date:dk}});
    setDrawerSes(s=>s?{...s,...patch}:s);
  };
  /* The ratings arrive from the athletes' own forms, not from this panel, so every session
     on a day someone rated follows them by itself: the coach does not have to open a session
     for its load to be there. Only sessions whose sRPE this pass owns are touched, and the
     pass writes nothing once they agree, so it settles after one round. */
  useEffect(()=>{
    if(!teamMode)return;
    const dates=new Set();
    (athletes||[]).forEach(a=>(a.srpeLog||[]).forEach(e=>{if(e.date)dates.add(e.date);}));
    if(!dates.size)return;
    let changed=false;
    const nd={...days};
    dates.forEach(dk=>{
      const d0=days[dk];
      if(!d0||!(d0.sessions||[]).length)return;
      let dayChanged=false;
      const sessions=d0.sessions.map(s=>{
        const patch=srpePatchFor(s,dk,athletes);
        if(!patch)return s;
        dayChanged=true;return{...s,...patch};
      });
      if(dayChanged){nd[dk]={...d0,sessions,date:dk};changed=true;}
    });
    if(changed)saveDays(nd);
    // eslint-disable-next-line
  },[teamMode,days,athletes]);
  /* The drawer reads from its own copy of the session, so it follows the load the pass above
     works out for it — otherwise the open panel would still be showing the AU the session
     had before its athletes' ratings were counted. */
  const drwDateKey=drawerDate||(drawerSes?Object.keys(days).find(k=>(days[k].sessions||[]).some(x=>x.id===drawerSes.id)):null);
  useEffect(()=>{
    if(!drawerSes||!drwDateKey)return;
    const live=((days[drwDateKey]||{}).sessions||[]).find(s=>s.id===drawerSes.id);
    if(!live)return;
    if(String(live.sRPE??'')===String(drawerSes.sRPE??'')&&String(live.au??'')===String(drawerSes.au??''))return;
    setDrawerSes(s=>s?{...s,sRPE:live.sRPE,au:live.au,srpeFromManual:live.srpeFromManual}:s);
  },[days,drwDateKey,drawerSes]);
  /* The two picked answers the meta bar carries next to the clock and the duration: what
     the session is FOR (its stage-1 focus) and how hard it is planned to be (the RPE
     target, out of 10). Neither is a new field — both are the ones the session editor and
     the printed program already read, so a pick made here is the same pick made there. */
  const drwGoals=drawerSes?sesFocus(drawerSes):[];
  // A team practice, a match or a test day opens its own window instead of the exercise one.
  const drwKind=drawerSes?sesKind(drawerSes):'';
  const drwRpeT=drawerSes?sesRpeTarget(drawerSes):7;
  const drwZone=rpeZone(drwRpeT);
  /* Picking goals here is the same act as picking them in the editor, so it follows the
     same rule: a sub-focus whose quality is no longer ticked goes with it, because a
     capacity left behind by the quality that justified it is not a record of anything. */
  const setDrwGoals=arr=>{
    if(!drawerSes)return;
    const sub=sesSubFocus(drawerSes).filter(x=>arr.includes(SUBFOCUS_OWNER[x]));
    drwUpd({focus:arr,sub,purpose:[...arr,...sub].join(', ')});
  };
  /* `durOverride` is the minutes this one athlete was actually on for — a match, where
     the load is RPE × their own minutes rather than × the length of the game. */
  const setAthRPE=(athId,rpeRaw,durOverride)=>{
    if(!teamMode||!drawerSes)return;
    const dk=drawerDate||Object.keys(days).find(k=>(days[k].sessions||[]).some(x=>x.id===drawerSes.id));
    if(!dk)return;
    const dur=Number(durOverride)||Number(drawerSes.duration)||0;
    const slot=rpeCatOf(drawerSes);
    const rpe=(rpeRaw===''||rpeRaw==null)?'':Number(rpeRaw);
    const load=(rpe===''||isNaN(rpe))?'':Math.round(rpe*dur);
    const newAthletes=athletes.map(a=>{
      if(a.id!==athId)return a;
      const log=[...(a.srpeLog||[])];
      const idx=log.findIndex(e=>e.sessionId===drawerSes.id);
      if(rpe===''||isNaN(rpe)){if(idx>=0)log.splice(idx,1);return{...a,srpeLog:log};}
      const entry={id:idx>=0?log[idx].id:uid(),srcId:null,sessionId:drawerSes.id,date:dk,
        tpRPE:'',tpDuration:'',tpLoad:'',scRPE:'',scDuration:'',scLoad:'',gameRPE:'',gameDuration:'',gameLoad:'',totalLoad:load};
      entry[slot+'RPE']=rpe;entry[slot+'Duration']=dur;entry[slot+'Load']=load;
      if(idx>=0)log[idx]=entry;else log.push(entry);
      return{...a,srpeLog:log};
    });
    saveAthletes(newAthletes);
    syncSessionSRPE(newAthletes,dk);     // keep the session's own sRPE/AU in step automatically
  };
  // Change which sRPE category (tp / sc / game) the manual RPE is recorded under,
  // persist the choice on the session, and migrate any values already entered.
  const changeRpeCat=cat=>{
    if(!drawerSes)return;
    const dk=drawerDate||Object.keys(days).find(k=>(days[k].sessions||[]).some(x=>x.id===drawerSes.id));
    if(dk){const d0=days[dk]||EDAY(dk);
      const newS=(d0.sessions||[]).map(s=>s.id===drawerSes.id?{...s,rpeCat:cat}:s);
      saveDays({...days,[dk]:{...d0,sessions:newS,date:dk}});}
    setDrawerSes(s=>s?{...s,rpeCat:cat}:s);
    if(!teamMode)return;
    const dur=Number(drawerSes.duration)||0;
    saveAthletes(athletes.map(a=>{
      const log=[...(a.srpeLog||[])];
      const idx=log.findIndex(e=>e.sessionId===drawerSes.id);
      if(idx<0)return a;
      const old=log[idx];
      const rpeV=[old.scRPE,old.tpRPE,old.gameRPE].find(v=>v!==''&&v!=null);
      if(rpeV===''||rpeV==null)return a;
      const load=Math.round(Number(rpeV)*dur);
      const entry={id:old.id,srcId:null,sessionId:drawerSes.id,date:old.date,
        tpRPE:'',tpDuration:'',tpLoad:'',scRPE:'',scDuration:'',scLoad:'',gameRPE:'',gameDuration:'',gameLoad:'',totalLoad:load};
      entry[cat+'RPE']=Number(rpeV);entry[cat+'Duration']=dur;entry[cat+'Load']=load;
      log[idx]=entry;return{...a,srpeLog:log};
    }));
  };
  // ---- Drag & drop sessions across days (mirrors Planner.moveOrCopySession) ----
  const[dragInfo,setDragInfo]=useState(null);
  const[dragOverDate,setDragOverDate]=useState(null);
  const moveOrCopy=(fromDate,sessionId,toDate,copy)=>{
    if(!canEdit||(fromDate===toDate&&!copy))return;
    const fromDay=days[fromDate];if(!fromDay?.sessions)return;
    const session=fromDay.sessions.find(s=>s.id===sessionId);if(!session)return;
    const oldFrom=fromDay.sessions;
    let newFrom=oldFrom;
    let newDays={...days};
    if(!copy){newFrom=oldFrom.filter(s=>s.id!==sessionId);newDays[fromDate]={...fromDay,sessions:newFrom,date:fromDate};}
    const newSession=copy
      ?{...session,id:uid(),sRPE:'',au:'',athletes:[],sourceId:null,blocks:(session.blocks||[]).map(b=>({...b,id:uid(),athletes:[],exercises:(b.exercises||[]).map(e=>({...e}))}))}
      :session;
    const toDay=newDays[toDate]||{date:toDate,sessions:[],dailyNotes:''};
    const oldTo=toDay.sessions||[];const newTo=[...oldTo,newSession];
    newDays[toDate]={...toDay,sessions:newTo,date:toDate};
    if(teamMode){
      let newAths=athletes;
      if(!copy&&fromDate!==toDate)newAths=syncSessionsToAthletes(newAths,fromDate,oldFrom,newFrom);
      newAths=syncSessionsToAthletes(newAths,toDate,oldTo,newTo);
      saveDays(newDays);saveAthletes(newAths);
    } else saveDays(newDays);
  };
  const printWeek=()=>{try{printWeekA4Land(labelOwner||setup?.teamName||'',fmt(weekStart),days,teamMode?athletes:undefined);}catch(e){alert('Print error: '+e.message);}};
  const printMonth=()=>{try{printMonthA4Land(labelOwner||setup?.teamName||'',yr,mo,days);}catch(e){alert('Print error: '+e.message);}};
  // Duplicate / delete a session directly from a calendar card
  const dupSession=(dateK,sid)=>{if(canEdit)moveOrCopy(dateK,sid,dateK,true);};
  const delSession=(dateK,sid)=>{
    if(!canEdit)return;const day=days[dateK];if(!day?.sessions)return;
    const oldS=day.sessions;const newS=oldS.filter(s=>s.id!==sid);
    const nd={...days,[dateK]:{...day,sessions:newS,date:dateK}};
    if(teamMode){saveDays(nd);syncAths(dateK,oldS,newS);}
    else saveDays(nd);
  };
  const ltCls=lt=>{if(!lt)return'';const x=lt.toLowerCase();
    if(x.includes('mechanical'))return'mech';
    if(x.includes('metabolic'))return'metab';
    if(x.includes('neuromuscular'))return'neuro';
    if(x.includes('cognitive'))return'cog';return'';};
  const ltColor=cls=>cls==='mech'?'var(--accent)':cls==='metab'?'var(--peak-t)':cls==='neuro'?'var(--med-t)':cls==='cog'?'var(--high-t)':'var(--dim)';
  // ---- Week monotony (Foster) for the week on screen. Same helper the Load Monitoring
  // card uses, so the two screens can never show different numbers for the same week. ----
  const weekMonoV=useMemo(()=>teamWeekMono(days,athletes,fmt(weekStart)).monotony,[days,athletes,weekStart]);
  const weekMonoZ=monoZoneOf(weekMonoV);
  /* ---- What the week ADDS UP TO, read once at the top of it -------------------
     Seven columns say what happens on each day; none of them says what the week is.
     These five do, and every one of them is read off the same numbers the columns and
     Load Monitoring already draw, so no card here can disagree with the grid under it. */
  const weekSum=useMemo(()=>{
    const at=d=>Math.round(teamDaily[fmt(d)]||0);
    let load=0,prev=0;
    for(let i=0;i<7;i++){load+=at(addD(weekStart,i));prev+=at(addD(weekStart,i-7));}
    // How many sessions, and which kind: a session carrying a ball block is court work.
    let court=0,floor=0;
    const rpes=[];
    for(let i=0;i<7;i++){
      const k=fmt(addD(weekStart,i));
      ((days[k]||{}).sessions||[]).forEach(ss=>{
        if((ss.blocks||[]).some(b=>blkKind(b)==='ball'))court++;else floor++;
      });
      const r=teamMode?teamDayRPE(athletes,k):null;
      if(r!=null)rpes.push(r);
    }
    const rpe=rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:null;
    return{load,prev,
      delta:prev>0?Math.round((load-prev)/prev*100):null,
      court,floor,sessions:court+floor,rpe};
  },[days,athletes,teamDaily,weekStart,teamMode]);
  /* The planned band is 5-7: under it the week is too easy to adapt to, over it the squad
     is being asked for more than a week of training should ask. */
  const rpeBand=weekSum.rpe==null?{t:L('Veri yok','No data'),c:'var(--dim)'}
    :weekSum.rpe<5?{t:L('Düşük','Low'),c:'#3b82f6'}
    :weekSum.rpe<=7?{t:L('Normal','Normal'),c:'#22c55e'}
    :{t:L('Yüksek','High'),c:'#f97316'};
  // ---- Month view (grid) — same single card, toggled from the header ----
  const yr=monthRef.getFullYear(),mo=monthRef.getMonth();
  const setMo=d=>setMonthRef(new Date(yr,mo+d,1));
  const goToday=()=>{const k=fmt(today);setSelected({year:today.getFullYear(),month:today.getMonth()+1,date:k});setMonthRef(new Date(today.getFullYear(),today.getMonth(),1));};
  // Session bar colour — identical to the weekly cards (custom s.color, else load-type colour).
  const sesColor=s=>cardCol(s.color)||ltColor(ltCls(s.loadType));
  // Full weeks: pad leading days from the previous month and trailing from the next.
  const monthCells=(()=>{const first=new Date(yr,mo,1);const off=(first.getDay()+6)%7;const dim=new Date(yr,mo+1,0).getDate();const a=[];
    for(let i=off;i>0;i--)a.push({d:new Date(yr,mo,1-i),out:true});
    for(let d=1;d<=dim;d++)a.push({d:new Date(yr,mo,d),out:false});
    while(a.length%7!==0){const l=a[a.length-1].d;a.push({d:new Date(l.getFullYear(),l.getMonth(),l.getDate()+1),out:true});}
    return a;})();
  const pickMonth=k=>{const n=parseD(k);setSelected({year:n.getFullYear(),month:n.getMonth()+1,date:k});openEdit(k);};
  const monthLoad=useMemo(()=>calMode==='month'?monthFocusLoad(days,yr,mo):null,[calMode,days,yr,mo]);
  return(<>
  {/* Controls only. The screen is named once, by the masthead above it — the calendar
      used to title itself as well, so the tab opened with the word "Calendar" twice. */}
  <div className="cal-head">
    <div className="calm-ctrl">
      <div className="calm-seg">
        <button className={calMode==='week'?'on':''} onClick={()=>setCalMode('week')}>{L('Hafta','Week')}</button>
        <button className={calMode==='month'?'on':''} onClick={()=>setCalMode('month')}>{L('Ay','Month')}</button>
      </div>
      {canEdit&&calMode==='week'&&<button className="btn sec sm" onClick={printWeek} title={L('Haftalık plan çıktısı (A4 yatay)','Weekly plan export (A4 landscape)')}>⎙ {L('Haftayı yazdır','Print week')}</button>}
      {canEdit&&calMode==='month'&&<button className="btn sec sm" onClick={printMonth}
        title={L('Aylık plan ve özelliklere göre yüklenme tablosu (A4 yatay)','Monthly plan and loading-by-quality table (A4 landscape)')}>⎙ {L('Ayı yazdır','Print month')}</button>}
      {/* White, because it is the one button on this bar that sends the week out of the
          app — "print" and the week arrows move around inside it. */}
      {calMode==='week'&&<button className="btn sm calm-share" onClick={()=>setShareOpen(true)}
        title={L('Haftayı WhatsApp ya da e-posta ile gönder','Send the week by WhatsApp or email')}>↗ {L('Paylaş','Share')}</button>}
      <div className="calm-nav">
        <button onClick={()=>calMode==='week'?setWeek(-1):setMo(-1)} title={L('Geri','Back')}>‹</button>
        <button className="td" onClick={goToday}>{L('Bugün','Today')}</button>
        <button onClick={()=>calMode==='week'?setWeek(1):setMo(1)} title={L('İleri','Forward')}>›</button>
      </div>
    </div>
  </div>
  {shareOpen&&<ShareWeekModal onClose={()=>setShareOpen(false)}
    title={labelOwner||setup?.teamName||''} weekStart={fmt(weekStart)} days={days}
    athletes={teamMode?athletes:undefined} staff={staff}/>}
  <div className="panel">
    {calMode==='week'?<>
    {/* The week in four numbers, before the seven columns that make them up. */}
    <div className="calw-stats">
      <div className="cws">
        <span className="cws-ic blue"><TIc k="chart" size={19}/></span>
        <div className="cws-tx">
          <div className="cws-k">{L('Toplam Yük','Total Load')}</div>
          <div className="cws-v">{weekSum.load}<small>AU</small>
            {weekSum.delta!=null&&<em className={weekSum.delta>=0?'up':'down'}
              title={L('Önceki haftanın toplam takım yüküne göre değişim','Change against the previous week\'s total team load')}>
              {weekSum.delta>=0?'↑':'↓'} %{Math.abs(weekSum.delta)}</em>}
          </div>
          <div className="cws-s">{L('Önceki haftaya göre','Against the previous week')}</div>
        </div>
      </div>
      <div className="cws">
        <span className="cws-ic violet"><TIc k="list" size={19}/></span>
        <div className="cws-tx">
          <div className="cws-k">{L('Toplam Seans','Total Sessions')}</div>
          <div className="cws-v">{weekSum.sessions}</div>
          <div className="cws-s">{L(`${weekSum.floor} antrenman + ${weekSum.court} saha`,`${weekSum.floor} training + ${weekSum.court} court`)}</div>
        </div>
      </div>
      <div className="cws">
        <span className="cws-ic green"><TIc k="up" size={19}/></span>
        <div className="cws-tx">
          <div className="cws-k">{L('Ortalama RPE','Average RPE')}</div>
          <div className="cws-v">{weekSum.rpe!=null?weekSum.rpe.toFixed(1):'—'}
            <em className="band" style={{color:rpeBand.c,borderColor:rpeBand.c}}>{rpeBand.t}</em></div>
          <div className="cws-s">{L('Hedef aralık: 5–7','Target band: 5–7')}</div>
        </div>
      </div>
      <div className="cws" title={L('Bu haftanın takım monotonluğu = her sporcunun kendi Foster monotonluğunun (ortalama günlük yükü ÷ günlük yüklerinin standart sapması) kadro genelinde ortalaması.\n<1.0 düşük — yükler çok değişken\n1.0–1.5 normal / kabul edilebilir\n1.5–2.0 artan monotonluk — izle\n>2.0 yüksek — aşırı yüklenme ve hastalık/sakatlık riski artar','Team monotony for this week = each athlete\'s own Foster monotony (their mean daily load ÷ the SD of their daily loads), averaged across the squad.\n<1.0 low — loads highly varied\n1.0–1.5 normal / acceptable\n1.5–2.0 rising monotony — watch it\n>2.0 high — overload and illness/injury risk climbs')}>
        <span className="cws-ic amber"><TIc k="tape" size={19}/></span>
        <div className="cws-tx">
          <div className="cws-k">{L('Takım Monotonluğu','Team Monotony')}</div>
          <div className="cws-v">{weekMonoV?weekMonoV.toFixed(2):'—'}
            <em className="band" style={{color:weekMonoZ.dot,borderColor:weekMonoZ.dot}}>{exLabel(weekMonoZ.t)}</em></div>
          <div className="cws-s">{L('Hedef aralık: < 1.50','Target band: < 1.50')}</div>
        </div>
      </div>
    </div>
    {canEdit&&<div className="calw-hint">{L(<>Bir seansı başka güne sürükle · bırakırken <strong>Ctrl/⌥</strong>'ye bas → kopyalar</>,<>Drag a session to another day · hold <strong>Ctrl/⌥</strong> and drop → copies</>)}</div>}
    <div className="calw-grid">
      {dayCells.map((d,i)=>{
        const k=fmt(d);const day=days[k];const ss=day?.sessions||[];
        // Daily load = exactly what the Team Load Trend chart plots for this date:
        // the planned team-session AU, or the athletes' logged average on a day that
        // was only logged. Read from the same map so the two screens cannot drift.
        const dayAU=Math.round(teamDaily[k]||0);
        // Team averages under the date. In team mode they come from the roster's logs;
        // on a personal calendar the "team" is the single athlete, so fall back to the
        // day's own session RPEs.
        const dayRPE=teamMode?null
          :(()=>{const v=ss.map(s=>Number(s.sRPE)).filter(x=>!isNaN(x)&&x>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;})();
        /* Split by what the athletes were actually asked about, so the day says which
           session earned the score. Only a team calendar can split it: a personal one has
           no check-ins to read and keeps the single figure. */
        const dayRpeSC=teamMode?teamDayRPE(athletes,k,['sc']):null;
        const dayRpeTP=teamMode?teamDayRPE(athletes,k,['tp']):null;
        const dayRpeGM=teamMode?teamDayRPE(athletes,k,['game']):null;
        const dayRdy=teamMode?teamDayReadiness(athletes,k):null;
        const isDrop=canEdit&&dragInfo&&dragOverDate===k&&dragInfo.fromDate!==k;
        return(<div key={k} className={`calw-col${isDrop?' drop':''}`}
          onDragOver={e=>{if(canEdit&&dragInfo){e.preventDefault();e.dataTransfer.dropEffect=(e.ctrlKey||e.metaKey||e.altKey)?'copy':'move';setDragOverDate(k);}}}
          onDragLeave={()=>{if(dragOverDate===k)setDragOverDate(null);}}
          onDrop={e=>{e.preventDefault();if(canEdit&&dragInfo){moveOrCopy(dragInfo.fromDate,dragInfo.sessionId,k,e.ctrlKey||e.metaKey||e.altKey);}setDragInfo(null);setDragOverDate(null);}}>
          <div className="dh">
            {/* The weekday leads and the date sits under it: the column is scanned by day
                name first, and a date squeezed onto the same line made both harder to
                read at seven columns wide. */}
            <span className="dh-d"><b>{DN[i]}</b><i>{d.getDate()} {MN[d.getMonth()]}</i></span>
            <span className="dh-acts">
              {/* Only while a training is on the clipboard — it is the paste half of the
                  session view's "Copy the Training". */}
              {canEdit&&sesClip&&<button className="add paste" onClick={e=>{e.stopPropagation();pasteSession(k);}}
                title={`Yapıştır: ${sesClip.name||'Antrenman'}`}>📋</button>}
              <button className="add" onClick={e=>{e.stopPropagation();openEdit(k);}} title={L('Antrenman ekle / planla','Add / plan training')}>+</button>
            </span>
          </div>
          {/* Team averages for the day, right under the date: session RPE (0–10) and
              wellness readiness (0–5), each tinted by its own severity scale. The RPE is
              given per kind of session — the check-in asks about S&C, ball practice and
              the match separately, so the day can say which of them was hard. All four
              rows are always shown (— when empty) so every column lines up. */}
          <div className="calw-avg">
            {teamMode?<>
              <span className="cav" title={L('Bu gün için takım ortalaması Kuvvet & Kondisyon RPE\'si (0–10)','Team average S&C RPE for this day (0–10)')}>
                <em>{'S&C'}</em><b style={{color:rpeColor(dayRpeSC)||'var(--dim)'}}>{dayRpeSC!=null?dayRpeSC.toFixed(1):'—'}</b>
              </span>
              <span className="cav" title={L('Bu gün için takım ortalaması top antrenmanı RPE\'si (0–10)','Team average ball practice RPE for this day (0–10)')}>
                <em>{L('Top Antrenmanı','Ball Practice')}</em><b style={{color:rpeColor(dayRpeTP)||'var(--dim)'}}>{dayRpeTP!=null?dayRpeTP.toFixed(1):'—'}</b>
              </span>
              <span className="cav" title={L('Bu gün için takım ortalaması müsabaka RPE\'si (0–10)','Team average match RPE for this day (0–10)')}>
                <em>{L('Maç','Match')}</em><b style={{color:rpeColor(dayRpeGM)||'var(--dim)'}}>{dayRpeGM!=null?dayRpeGM.toFixed(1):'—'}</b>
              </span>
            </>:<span className="cav" title={L('Bu gün için takım ortalaması seans RPE\'si (0–10)','Team average session RPE for this day (0–10)')}>
              <em>RPE</em><b style={{color:rpeColor(dayRPE)||'var(--dim)'}}>{dayRPE!=null?dayRPE.toFixed(1):'—'}</b>
            </span>}
            <span className="cav" title={L('Bu günün wellness check-in\'lerinden takım ortalama hazır oluşu (0–5)','Team average readiness from this day\'s wellness check-ins (0–5)')}>
              <em>{L('Hazır Oluş','Readiness')}</em><b style={{color:readyColor(dayRdy)}}>{dayRdy!=null?dayRdy.toFixed(1):'—'}</b>
            </span>
          </div>
          {ss.length===0&&<div className="calw-empty">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 18V8"/><path d="M3 12h18v6"/><path d="M21 18v-4a3 3 0 0 0-3-3h-7"/>
              <path d="M6.8 8.6a1.9 1.9 0 1 0 0 3.4"/>
            </svg>
            <span>{L('Dinlenme','Rest')}</span>
          </div>}
          {ss.map(s=>{
            return(<div key={s.id} className={`calw-ses ${s.color?'':ltCls(s.loadType)}${dragInfo?.sessionId===s.id?' dragging':''}`}
              draggable={canEdit}
              style={s.color?{'--sc':cardCol(s.color)}:undefined}
              onDragStart={e=>{if(!canEdit)return;e.stopPropagation();e.dataTransfer.effectAllowed='copyMove';try{e.dataTransfer.setData('text/plain',s.id);}catch{}setDragInfo({fromDate:k,sessionId:s.id});}}
              onDragEnd={()=>{setDragInfo(null);setDragOverDate(null);}}
              onClick={()=>{setDrawerSes(s);setDrawerDate(k);}}>
              {canEdit&&<div className="calw-ses-act" onClick={e=>e.stopPropagation()}>
                <button title={L('Çoğalt','Duplicate')} onClick={e=>{e.stopPropagation();dupSession(k,s.id);}}>⎘</button>
                <button title={L('Sil','Delete')} className="del" onClick={e=>{e.stopPropagation();if(confirm(L('Bu seans silinsin mi?','Delete this session?')))delSession(k,s.id);}}>✕</button>
              </div>}
              <div className="nm">{s.name}</div>
              {/* Only the goals — Kuvvet, Güç, Hız — never the sub-focuses under them:
                  five lines of capacities pushed the time, the length and the RPE badge
                  off the bottom of the card. */}
              <div className="pr">{sesKindLine(s)||sesGoalLine(s)}</div>
              {/* Clock, length, and the intensity the coach planned for the day — the third
                  number belongs on this line because the first two only say when and how
                  long, never how hard. It is the same target the session editor's scale
                  sets and the printed program prints, in the same band colour, so the day
                  column reads how hard the week is without opening a single session. */}
              <div className="mt"><span>{s.time}</span><span className="sep"/><span>{Number(s.duration)||0}m</span>{(()=>{
                const[rlo,rhi]=sesRpeRange(s);const rz=rpeZone(sesRpeTarget(s));
                return<span className="rpe" style={{color:rz.c,background:rz.soft,borderColor:`color-mix(in srgb,${rz.c} 60%,transparent)`}}
                  title={L(`Hedeflenen RPE ${rlo}-${rhi} — ${rz.tr}`,`Target RPE ${rlo}-${rhi} — ${rz.en}`)}>RPE {rlo}-{rhi}</span>;
              })()}</div>
            </div>);
          })}
          {/* The day's team load — the same value Load Monitoring's Team Load Trend plots. */}
          {dayAU>0&&<div className="calw-daytot">
            <div className="dtrow" title={L('Yük Takibi → Takım Yük Trendi\'ndeki günlük yük','The daily load from Load Monitoring → Team Load Trend')}><span>{L('Günlük Yük','Daily Load')}</span><b>{dayAU} AU</b></div>
          </div>}
        </div>);
      })}
    </div>
    </>:<>
    {/* The month in four numbers, and what its sessions train — the same split the
        printed sheet's table gives week by week, here as one bar across the month. */}
    <div className="calm-top">
      <div className="calm-month">{L(MN_TR[mo],MN_EN[mo])} <span>{yr}</span></div>
      {monthLoad&&<div className="calm-sum">
        <div className="calm-k"><b>{monthLoad.sessions}</b><span>{L('Seans','Sessions')}</span></div>
        <div className="calm-k"><b>{monthLoad.trainDays}</b><span>{L('Antrenman günü','Training days')}</span></div>
        <div className="calm-k"><b>{monthLoad.restDays}</b><span>{L('Dinlenme günü','Rest days')}</span></div>
        <div className="calm-k"><b>{fmtMin(monthLoad.minutes)}</b><span>{L('Toplam süre','Total time')}</span></div>
      </div>}
    </div>
    {monthLoad&&monthLoad.rows.length>0&&<div className="calm-mix">
      <div className="calm-mix-bar">{monthLoad.rows.map(r=><i key={r.id} style={{flexGrow:r.share,background:focusColor(r.id)}}
        title={`${focusName(r.id)} — ${r.n} ${L('seans','sessions')} · ${fmtMin(r.min)} · ${Math.round(r.share*100)}%`}/>)}</div>
      <div className="calm-mix-lg">{monthLoad.rows.map(r=><span key={r.id}><i style={{background:focusColor(r.id)}}/>{focusName(r.id)}<b>{Math.round(r.share*100)}%</b></span>)}</div>
    </div>}
    <div className="calm-grid">
      {DN.map((d,i)=><div key={d} className={`calm-dow${i>=5?' wk':''}`}>{dnL(i)}</div>)}
      {monthCells.map((c,i)=>{
        const d=c.d;const k=fmt(d);const day=days[k];const ss=day?.sessions||[];
        const isToday=k===fmt(today);const isSel=k===selected.date;
        const au=ss.reduce((t,s)=>t+(Number(s.au)||(s.sRPE!==''&&s.sRPE!=null?Number(s.sRPE)*Number(s.duration||0):0)),0);
        const mAvg=teamMode?teamDayAvgAU(athletes,k):null;
        const isWk=i%7>=5;
        return(<div key={k+'-'+i} className={`calm-cell${c.out?' out':''}${isSel?' sel':''}${isToday?' today':''}${isWk?' wk':''}${ss.length?'':' empty'}`} onClick={()=>pickMonth(k)} title={L('Planla','Plan')}>
          <div className="ch"><span className="d">{d.getDate()}</span>{ss.length>0&&<span className="cn">{ss.length}</span>}</div>
          {ss.length>0&&<div className="csess">
            {ss.slice(0,3).map((s,j)=>(<div key={s.id||j} className="cs-item-wrap">
                <div className="cs-item" style={{'--sc':sesColor(s)}}>{s.time&&<em>{s.time}</em>}<span>{s.name||L('Seans','Session')}</span></div>
              </div>))}
            {ss.length>3&&<div className="cs-more">{L(`+${ss.length-3} daha`,`+${ss.length-3} more`)}</div>}
          </div>}
          {(au>0||(mAvg&&mAvg.avg>0))&&<div className="mau">
            {au>0&&<span>{Math.round(au)}<small>AU</small></span>}
            {/* The same per-athlete average the week strip carries, in the room a month
                cell has for it: their own calendars, added up and averaged. */}
            {mAvg&&mAvg.avg>0&&<i title={L(`Sporcuların takvimlerindeki günlük AU ortalaması — ${mAvg.n} sporcu`,`Average daily AU across athletes' calendars — ${mAvg.n} athletes`)}>ø {Math.round(mAvg.avg)}<small>AU</small></i>}
          </div>}
        </div>);
      })}
    </div>
    </>}
    {drawerSes&&layer((<>
      {!inline&&<div className="dw-scrim" onClick={()=>setDrawerSes(null)}/>}
      <aside className={'dw'+(inline?' inline':'')} ref={inline?inlineRef:null}>
        <div className="dw-h">
          <div style={{flex:1,minWidth:0}}>
            {/* The title is the session's name as the calendar shows it — editable in
                place, saved like the other fields here. */}
            {canEdit
              ?<input className="ti dw-ti-in" value={drawerSes.name||''} placeholder={L('Seans adı','Session name')} onChange={e=>drwRename(e.target.value)} title={L('Seans adını değiştir','Rename the session')}/>
              :<div className="ti">{drawerSes.name}</div>}
            <div className="su">{drwKind?`${sesKindName(drwKind)} · ${fdLong(drwDateKey)}`:drawerSes.purpose}</div>
          </div>
          {/* No assignment button here any more. Assigning is a per-BLOCK decision — the
              guards and the forwards get different work on the same day — and this one
              could only speak for the whole session, so it fought the buttons in the
              editor that do the real job. ✎ Edit is one press away from them. */}
          <button className="btn sm white" style={{marginRight:8}} onClick={()=>openEdit(drawerDate||Object.keys(days).find(k=>(days[k].sessions||[]).some(x=>x.id===drawerSes.id)))}>✎ {L('Düzenle','Edit')}</button>
          <button className="x" onClick={()=>setDrawerSes(null)}>×</button>
        </div>
        {/* The exercises take the left of the drawer — they are what the session IS — and
            what it trains is summarised down the right, where it can be read against
            them. */}
        {drwKind?<div className="dw-layout">
          <div className="dw-b">
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,flexWrap:'wrap'}}>
              <button className={'btn sm'+(copied?' outline':' sec')}
                onClick={()=>{copySessionToClipboard(drawerSes);setCopied(true);}}
                title={L('Panoya kopyalanır — başka bir günün başlığındaki 📋 ile yapıştır','Copied to the clipboard — paste it with the 📋 on any day header')}>
                {copied?L('✓ Kopyalandı','✓ Copied'):L('Kopyala','Copy')}</button>
            </div>
            <SesKindForm session={drawerSes} dateKey={drwDateKey} onPatch={drwUpd} readOnly={!canEdit}
              roster={teamMode?athletes:undefined} teamName={labelOwner||setup?.teamName||''}
              rpe={teamMode?{get:a=>athRPEFor(a,drawerSes,drwDateKey),set:canEdit?setAthRPE:null}:null}/>
            <div style={{marginTop:18,display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn sec sm" onClick={()=>setDrawerSes(null)}>{L('Kapat','Close')}</button>
            </div>
          </div>
        </div>
        :<div className="dw-layout">
          <div className="dw-b">
          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,flexWrap:'wrap'}}>
            {/* Five actions share this row now, so it wraps to a second line on a narrow
                drawer instead of squashing each label onto two lines. */}
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
              {teamMode&&<button className={`btn sm ${rpeOpen?'':'sec'}`} onClick={()=>setRpeOpen(o=>!o)} title={L('Her sporcunun RPE\'si — kendi gönderdikleri değerlendirmeler ve buraya senin gireceklerin; ikisi de profillerine senkronize olur','Each athlete\'s RPE — the ratings they submitted themselves, and anything you enter here; both sync to their profile')}>{L('RPE Değerleri','RPE Values')}</button>}
              {/* Copy the whole training, to be pasted onto another day or another athlete's
                  calendar: the paste button appears on every day column while something is
                  on the clipboard, in this card and in every other athlete's. */}
              <button className={'btn sm'+(copied?' outline':' sec')}
                onClick={()=>{copySessionToClipboard(drawerSes);setCopied(true);}}
                title={L(`"${drawerSes.name||'Antrenman'}" panoya kopyalanır — başka bir sporcunun (ya da günün) takviminde gün başlığındaki 📋 ile yapıştır`,`"${drawerSes.name||'Session'}" is copied to the clipboard — paste it with the 📋 on any day header, on another athlete's calendar or this one`)}>
                {copied?L('✓ Kopyalandı','✓ Copied'):L('Antrenmanı Kopyala','Copy the Training')}</button>
              <button className="btn sec sm" onClick={()=>printDayA4(labelOwner||setup?.teamName||'',fdLong(drawerDate||fmt(today)),[drawerSes])} title={L('Bu seansı yazdır','Print this session')}>⎙ {L('Yazdır','Print')}</button>
              <button className="btn sec sm" onClick={()=>printDayA4(labelOwner||setup?.teamName||'',fdLong(drawerDate||fmt(today)),[drawerSes],{withImages:true})} title={L('Bu seansı yüklenen egzersiz görselleriyle birlikte yazdır','Print this session including the uploaded exercise images')}>⎙ {L('Görselle Yazdır','Print with Image')}</button>
            </div>
          </div>
          {teamMode&&rpeOpen&&(()=>{
            const list=rpeRoster(drawerSes);
            const CATS=[['tp','BP'],['sc','S&C'],['game','Match']];
            const cat=rpeCatOf(drawerSes);
            const catLbl=(CATS.find(c=>c[0]===cat)||['','S&C'])[1];
            const dk=drwDateKey;
            const own=list.filter(a=>athRPEFor(a,drawerSes,dk).fromAthlete).length;
            return(<div className="dw-rpe">
              <div className="dw-rpe-h">
                <span>{L('RPE Değerleri','RPE Values')}</span>
                <div className="dw-rpe-seg">{CATS.map(([v,lbl])=><button key={v} className={cat===v?'on':''} onClick={()=>changeRpeCat(v)} title={'RPE → '+lbl}>{lbl}</button>)}</div>
              </div>
              <div className="dw-rpe-sub">{L(`${list.length} sporcu · ${Number(drawerSes.duration)||0} dk · profilde `,`${list.length} athletes · ${Number(drawerSes.duration)||0} min · saved to `)}<b style={{color:'var(--accent)'}}>{catLbl}</b>{L(' altına kaydedilir','')}{own>0?<> · <b style={{color:'var(--accent)'}}>{own}</b> {L(`tanesi sporcuların kendi ${catLbl} değerlendirmesinden`,`from the athletes' own ${catLbl} rating`)}</>:null}</div>
              {list.length===0?<div className="dw-empty">{L('Kadroda sporcu yok — Athletes sekmesinden ekle.','No athletes on roster — add them in the Athletes tab.')}</div>:list.map(a=>{
                /* Their own rating fills the box until the coach types over it, and the row
                   says so — the number is the athlete's, not something entered for them. */
                const v=athRPEFor(a,drawerSes,dk);
                return(<div key={a.id} className={'dw-rpe-row'+(v.fromAthlete?' own':'')}>
                  <span className="dw-rpe-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:aInit(a.name)}</span>
                  <span className="dw-rpe-nm">{a.name}</span>
                  {v.fromAthlete&&<span className="dw-rpe-src" title={L(`${a.name} bu günün formunda ${catLbl} için ${v.rpe} verdi — yük otomatik hesaplandı. Üzerine yazabilirsin.`,`${a.name} submitted ${v.rpe} for ${catLbl} on today's form — load was calculated automatically. You can overwrite it.`)}>{L('sporcu','athlete')}</span>}
                  <span className="dw-rpe-au">{v.load!==''&&v.load!=null?v.load+' AU':''}</span>
                  <input type="number" min="0" max="10" step="0.5" className="dw-rpe-in" placeholder="RPE" value={v.rpe} onChange={ev=>setAthRPE(a.id,ev.target.value)}/>
                </div>);
              })}
            </div>);
          })()}
          <div className="dw-meta">
            <div className="dw-dm white" style={{'--dm-ac':'#22d3ee'}}>
              <div className="dm-top"><span className="k">{L('Saat','Time')}</span><span className="dm-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/></svg></span></div>
              {canEdit
                ?<input type="time" className="dw-inp" value={drawerSes.time||''} onChange={e=>drwUpd({time:e.target.value})}/>
                :<div className="v">{drawerSes.time||'—'}</div>}
            </div>
            <div className="dw-dm white" style={{'--dm-ac':'#a78bfa'}}>
              <div className="dm-top"><span className="k">{L('Süre','Duration')}</span><span className="dm-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5h4"/><path d="M12 13l2.6-2.6"/><circle cx="12" cy="14" r="7.5"/></svg></span></div>
              {canEdit
                ?<div className="dw-inrow"><input type="number" min="0" className="dw-inp" style={{width:'2.6em'}} value={drawerSes.duration??''} onChange={e=>{const raw=e.target.value.replace(/^0+(?=\d)/,'');const d=raw===''?'':Math.max(0,Number(raw));const patch={duration:d};if(!drawerSes.auManual&&drawerSes.sRPE!==''&&drawerSes.sRPE!=null)patch.au=Math.round(Number(drawerSes.sRPE)*(Number(d)||0));drwUpd(patch);}}/><span className="dw-unit">{L('dk','min')}</span></div>
                :<div className="v">{Number(drawerSes.duration)||0}<span className="dw-unit"> {L('dk','min')}</span></div>}
            </div>
            {/* What the session is for — one goal or several, picked by hand from the nine
                qualities the focus tree names rather than read off the exercises, so the
                bar states the coach's intent for the day. */}
            <div className="dw-dm white" style={{'--dm-ac':FOCUS_BY[drwGoals[0]]?.c||'#22c55e'}}>
              <div className="dm-top"><span className="k">{L('Hedef','Goal')}</span><span className="dm-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg></span></div>
              <GoalPicker value={drwGoals} onChange={setDrwGoals} readOnly={!canEdit}/>
            </div>
            {/* How hard the day is planned to be, on the 1-10 RPE scale the whole app
                speaks — the same rpeTarget the session editor's gauge and the printed
                program show, so the three never disagree. */}
            <div className="dw-dm" style={{'--dm-ac':drwZone.c}}>
              <div className="dm-top"><span className="k">{L('Yoğunluk','Intensity')}</span><span className="dm-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3.5 18a9 9 0 1 1 17 0"/><path d="M12 14.5 16 9.5"/></svg></span></div>
              {canEdit
                ?<div className="dw-inrow"><select className="dw-inp dw-sel" style={{width:'2.4em'}} value={drwRpeT} onChange={e=>drwUpd({rpeTarget:Number(e.target.value)})} title={L('Antrenman yoğunluğu — 10 üzerinden hedef RPE','Session intensity — target RPE out of 10')}>
                    {[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v} value={v}>{v}</option>)}
                  </select><span className="dw-unit">/10 · {L(drwZone.tr,drwZone.en)}</span></div>
                :<div className="dw-inrow"><span className="v" style={{marginTop:0}}>{drwRpeT}</span><span className="dw-unit">/10 · {L(drwZone.tr,drwZone.en)}</span></div>}
            </div>
          </div>
          {(drawerSes.blocks||[]).length===0&&<div className="dw-empty">{L('Egzersiz bloğu yok','No exercise blocks')}</div>}
          {(drawerSes.blocks||[]).map(b=>{
            const exs=b.exercises||[];
            const cnt={};
            const isBall=blkKind(b)==='ball';
            return(<div key={b.id} className={'dw-blk'+(isBall?' ball':'')}>
              <div className="bh">{b.name}{isBall&&<span className="dw-kind">{L('TOP','BALL')}</span>}</div>
              {exs.length===0&&<div className="dw-empty">{isBall?L('Dril yok','No drills'):L('Egzersiz yok','No exercises')}</div>}
              {exs.map((e,i)=>{
                const ss=(e.superset||'').toString().toUpperCase().trim();
                let tag;if(ss){cnt[ss]=(cnt[ss]||0)+1;tag=`${ss}${cnt[ss]}`;}
                else{cnt._=(cnt._||0)+1;tag=String(cnt._).padStart(2,'0');}
                // Show whatever was filled in — volume (sets×reps / sets×duration / reps / duration / sets), plus RPE, load, tempo and rest.
                const _v=e.reps||e.duration;
                const vol=e.sets&&_v?`${e.sets} × ${_v}`:(_v||(e.sets?L(`${e.sets} set`,`${e.sets} sets`):''));
                const detail=isBall
                  ?[vol,e.players,e.rpe?`RPE ${e.rpe}`:'',e.rest?`rest ${e.rest}`:''].filter(Boolean).join(' · ')
                  :[vol,e.rpe?`RPE ${e.rpe}`:'',e.load,e.tempo?`tempo ${e.tempo}`:'',e.rest?`rest ${e.rest}`:''].filter(Boolean).join(' · ');
                return(<div key={i} className={'dw-ex'+(isBall?' dw-drill':'')}>
                  <span className={`ss${e.name?'':' empty'}`}>{tag}</span>
                  <span className="en">{e.name||'—'}</span>
                  <span className="ed">{detail}</span>
                  {/* The diagram is how a coach recognises the drill, so the drawer shows
                      it rather than only naming it. */}
                  {isBall&&!sceneIsEmpty(e.court)&&<CourtView scene={e.court} className="dw-court"/>}
                </div>);
              })}
            </div>);
          })}
          {drawerSes.planNote&&<div className="plan-note-view">{drawerSes.planNote}</div>}
          <div style={{marginTop:18,display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn sec sm" onClick={()=>setDrawerSes(null)}>{L('Kapat','Close')}</button>
          </div>
        </div>
        <div className="dw-right-panel"><TrainContent session={drawerSes} onPatch={drwUpd} readOnly={!canEdit}/></div>
        </div>}
      </aside>
    </>))}
    {editDate&&layer((<>
      {!inline&&<div className="dw-scrim" onClick={()=>setEditDate(null)}/>}
      <aside className={'dw edit'+(inline?' inline':'')} ref={inline?inlineRef:null}>
        <div className="dw-h">
          <div style={{flex:1,minWidth:0}}>
            <div className="ti">{L('Antrenman Planı','Training Plan')}</div>
            <div className="su">{fdLong(editDate)} · {Math.round(dLoad(edDay))} AU</div>
          </div>
          {/* Reverses ✎ Edit: closes the plan and reopens the session panel it came from. */}
          {editBackSes()&&<button className="btn sm white" style={{marginRight:8}}
            onClick={goBackFromEdit} title={L('Antrenman detayına dön','Back to session detail')}>{L('Geri','Back')}</button>}
          <button className="x" onClick={()=>{setEditDate(null);setEditFrom(null);}}>×</button>
        </div>
        <div className="dw-layout">
        <div className="dw-b">
          <BlockAddBar onAdd={edAdd}/>
          {(edDay.sessions||[]).length===0&&<div className="dw-empty">{L('Henüz seans yok — yukarıdan bir antrenman bloğu ekleyerek başla','No sessions yet — start by adding a training block above')}</div>}
          {(edDay.sessions||[]).map((s,i)=>sesKind(s)
            ?<SesKindCard key={s.id} session={s} index={i} total={edDay.sessions.length}
              onUpdate={ns=>edUpd(s.id,ns)} onRemove={()=>edDel(s.id)} onMove={dir=>edMv(s.id,dir)}
              athletes={teamMode?athletes:undefined} dateKey={editDate} teamName={labelOwner||setup?.teamName||''}/>
            :<SessEd key={s.id} session={s} index={i} total={edDay.sessions.length}
            onUpdate={ns=>edUpd(s.id,ns)} onRemove={()=>edDel(s.id)} onDuplicate={()=>edDup(s.id)} onMove={dir=>edMv(s.id,dir)}
            printContext={{title:labelOwner||setup?.teamName||'',subtitle:fdLong(editDate)}}
            athletes={teamMode?athletes:undefined}
            coach={coachAthlete?{ath:coachAthlete,date:editDate}:null}/>)}
          <div style={{marginTop:18,display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn sm" onClick={()=>setEditDate(null)}>{L('Bitti','Done')}</button>
          </div>
        </div>
        </div>
      </aside>
    </>))}
  </div>
  </>);
}

