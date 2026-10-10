/* ═══ ATHLETE PROFILE (Athlete Training Profile) — the tab beside Profile ═══
   Four sections on the same cards the scouting sheet uses, Joint by Joint first. It,
   the Athletic Profile and the Constraints are the coach's and are written straight onto
   `ath.trainingProfile`; Exercise Exposure is drawn from the calendar and cannot be
   edited, only read. Nothing here selects an exercise
   or builds a session — the profile reaches programming through the individualization
   JSON (atpSnapshot), as context.

   Every term is stored in English and drawn through atpT(), so the tab reads in the app
   language while the JSON keeps one vocabulary. Much of it is set in capitals by CSS,
   and <html lang> follows the app language — so a Turkish label gets its dotted
   capitals ("İVMELENME") and an English one stays "TRAINING". */
const atpBars=n=><i className={`atp-bars b${n}`} aria-hidden="true"><s/><s/><s/></i>;
function AtpSecHead({n,title,desc,children}){
  return(<div className="sc-sec-h">
    <div className="sc-sec-n">{n}</div>
    <div className="sc-sec-tx"><div className="sc-sec-t">{title}</div><div className="sc-sec-d">{desc}</div></div>
    {children&&<div className="atp-hcnt">{children}</div>}
  </div>);
}
function AtpGrpHead({title,n,of}){
  return(<div className="atp-grp-h">
    <div className="atp-grp-t">{title}</div>
    <span className="atp-grp-c"><b>{n}</b>/{of}</span>
  </div>);
}
/* A quality's name in the app language. In Turkish the English term it is stored and
   sent as is kept on hover — it is the word the JSON carries. */
const AtpName=({en})=><span className="atp-it-l" title={REPORT_LANG==='tr'?en:undefined}>{atpT(en)}</span>;
/* The seven groups in two columns of near-equal height: Speed, Change of Direction,
   Plyometric / Reactive and Power (10 qualities under four headers) beside Strength,
   Movement Quality and Conditioning (9 under three). The last card of each column
   takes up the few pixels between them; on a narrow screen the columns fold into one
   list in the template's own order. */
const ATP_COLS=[['speed','cod','plyo','power'],['strength','movement','conditioning']];
function AtpProfile({q,onSet,onClear}){
  const rated=ATP_QUALITIES.filter(it=>q[it.id]);
  const byPri=id=>rated.filter(it=>q[it.id].priority===id);
  /* High is capped (ATP_HIGH_MAX): once it is full, High is offered on no other
     quality until one is taken off. A profile saved over the cap before it existed is
     drawn as it is and says so; it cannot take another. */
  const nHigh=byPri('high').length,highFull=nHigh>=ATP_HIGH_MAX;
  const highTip=L(`Yüksek öncelik en fazla ${ATP_HIGH_MAX} kalitede olabilir — önce birini kaldır.`,
    `High can be set on at most ${ATP_HIGH_MAX} qualities — take one off first.`);
  const chip=it=>(
    <span key={it.id} className="atp-chip"
      title={`${atpT(it.group)}${REPORT_LANG==='tr'?` · ${it.en}`:''}`}>
      <i className="atp-chip-dot"/>{atpT(it.en)}
      <button onClick={()=>onSet(it.id,'priority',q[it.id].priority)} title={L('Önceliği kaldır','Clear priority')}
        aria-label={L(`${atpT(it.en)} önceliğini kaldır`,`Clear ${it.en} priority`)}>✕</button></span>);
  const group=g=>{const n=g.items.filter(it=>q[it.id]).length;return(
    <div key={g.id} className="atp-grp" style={{order:ATP_GROUPS.indexOf(g)}}>
      <AtpGrpHead title={atpT(g.en)} n={n} of={g.items.length}/>
      <div className="atp-its">{g.items.map(it=>{const r=q[it.id]||{};return(
        <div key={it.id} className={`atp-it mv${r.priority?` set pr-${r.priority}`:''}`}>
          <span className="atp-it-n"><AtpName en={it.en}/></span>
          <div className="atp-seg" role="group" aria-label={`${atpT(it.en)} — ${atpT('Priority')}`}>{ATP_PRIORITY.map(p=>{
            const shut=p.id==='high'&&highFull&&r.priority!=='high';
            return(<button key={p.id} className={`pr-${p.id}${r.priority===p.id?' on':''}`} aria-pressed={r.priority===p.id} aria-label={atpT(p.en)}
              disabled={shut} title={shut?highTip:`${atpT('Priority')}: ${atpT(p.en)} — ${L(p.dTr,p.dEn)}`}
              onClick={()=>onSet(it.id,'priority',p.id)}>{atpBars(p.bars)}{atpAb(p)}</button>);})}</div>
        </div>);})}</div>
    </div>);};
  return(<div className="sc-sec" id="atp-s1">
    <AtpSecHead n={2} title={atpT('Athletic Development Priorities')}
      desc={L(`Her fiziksel kalite için bu dönemde ne kadar geliştirileceği. Test sonuçları, antrenman geçmişi ve antrenör değerlendirmesiyle belirlenir. Yüksek öncelik en fazla ${ATP_HIGH_MAX} kalitede olabilir; öncelik verilmeyen kalite korunur.`,
        `How much this period develops every physical quality. Set from test results, training history and the coach’s judgement. High can be set on at most ${ATP_HIGH_MAX} qualities; a quality left unrated is maintained.`)}>
      {ATP_PRIORITY.map(p=><span key={p.id} className={`atp-hc pr-${p.id}`}><i/>{atpT(p.en)}<b>{byPri(p.id).length}{p.id==='high'?`/${ATP_HIGH_MAX}`:''}</b></span>)}
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-key">
        <div className="atp-key-g"><span className="atp-key-k">{atpT('Priority')}</span>
          {ATP_PRIORITY.map(p=><span key={p.id} className="atp-key-i"><span className={`atp-tag pr-${p.id}`}>{atpBars(p.bars)}{atpT(p.en)}</span>{L(p.dTr,p.dEn)}</span>)}</div>
        <button className="atp-clear" disabled={!rated.length} onClick={onClear}
          title={L('Seçili tüm öncelikleri kaldır','Remove every selected priority')}>{L('Temizle','Clear')}</button>
      </div>
      <div className="atp-lanes">{ATP_PRIORITY.map(p=>{const its=byPri(p.id);return(
        <div key={p.id} className={`atp-lane pr-${p.id}`}>
          <div className="atp-lane-h"><span className="atp-lane-t">{atpBars(p.bars)}{atpT(p.en)}</span>
            <span className="atp-lane-n" title={p.id==='high'?highTip:undefined}>{its.length}{p.id==='high'&&<small>/{ATP_HIGH_MAX}</small>}</span></div>
          {p.id==='high'&&nHigh>ATP_HIGH_MAX&&<div className="atp-lane-warn">{L(`En fazla ${ATP_HIGH_MAX} Yüksek öncelik kabul edilir — ${nHigh-ATP_HIGH_MAX} tanesini Orta'ya indir.`,
            `At most ${ATP_HIGH_MAX} High priorities are accepted — move ${nHigh-ATP_HIGH_MAX} down to Medium.`)}</div>}
          <div className="atp-chips">{its.length?its.map(chip)
            :<span className="atp-empty">{L('Henüz yok — aşağıdan seç.','Nothing yet — pick from below.')}</span>}</div>
        </div>);})}</div>
      <div className="atp-gwrap"><div className="atp-mgrid">{ATP_COLS.map((col,ci)=>
        <div key={ci} className="atp-mcol">{col.map(id=>group(ATP_GROUPS.find(g=>g.id===id)))}</div>)}</div></div>
    </div>
  </div>);
}
/* A constraint as the coach reads it: a catalogue entry in the app language, one the
   coach typed exactly as it was typed. */
const atpConShow=c=>atpConDef(c&&c.id)?atpT(atpConLabel(c)):atpConLabel(c);
function AtpConPanel({kind,list,other,onList}){
  const[open,setOpen]=useState(false);
  const[cat,setCat]=useState('suggest');
  const[custom,setCustom]=useState('');
  const[customCat,setCustomCat]=useState('load');
  const[msg,setMsg]=useState('');
  const hard=kind==='hard';
  const mine=new Set(list.map(c=>c.id)),theirs=new Set(other.map(c=>c.id));
  const otherName=atpT(hard?'Soft':'Hard');
  const add=id=>{if(!mine.has(id)&&!theirs.has(id))onList([...list,{id}]);};
  const remove=id=>onList(list.filter(c=>c.id!==id));
  const patch=(id,p)=>onList(list.map(c=>c.id===id?{...c,...p}:c));
  const low=x=>String(x||'').trim().toLocaleLowerCase(REPORT_LANG==='tr'?'tr-TR':'en-US');
  /* A typed constraint that names a catalogue entry IS that entry — in either language —
     so the same rule can never sit on the list twice, or on both lists, just because it
     was typed. */
  const addCustom=()=>{
    const t=custom.trim();if(!t)return;
    const hit=ATP_CONSTRAINTS.find(c=>low(c.en)===low(t)||low(atpT(c.en))===low(t));
    if(hit){
      if(theirs.has(hit.id)){setMsg(L(`"${atpT(hit.en)}" zaten ${otherName} listesinde.`,`"${hit.en}" is already on the ${otherName} list.`));return;}
      if(!atpConFits(hit,kind)){setMsg(L(`"${atpT(hit.en)}" yalnızca ${otherName} olabilir.`,`"${hit.en}" can only be ${otherName}.`));return;}
      add(hit.id);
    }else{
      if([...list,...other].some(c=>low(atpConLabel(c))===low(t)||low(atpConShow(c))===low(t))){setMsg(L('Bu kısıt zaten ekli.','That constraint is already there.'));return;}
      onList([...list,{id:'c_'+uid(),label:t,cat:customCat}]);
    }
    setCustom('');setMsg('');
  };
  const opts=(cat==='suggest'?ATP_CON_SUGGEST[kind].map(atpConDef):ATP_CONSTRAINTS.filter(c=>c.cat===cat)).filter(Boolean);
  return(<div className={`atp-con ${kind}`}>
    <div className="atp-con-h">
      <span className="atp-con-badge">{atpT(hard?'Hard':'Soft')}</span>
      <div className="atp-con-tx">
        <div className="atp-con-t">{atpT(hard?'Hard Constraints':'Soft Constraints')}</div>
        <div className="atp-con-d">{hard?L('Kesin olarak uyulması gereken kısıtlamalar.','Rules that must be followed, without exception.')
          :L('Kesin yasak olmayan; tercih edilen veya sınırlandırılması gereken durumlar.','Not prohibitions — preferences, or things to keep limited.')}</div>
      </div>
      <span className="atp-con-n">{list.length}</span>
    </div>
    <div className="atp-con-list">
      {list.length===0&&<div className="atp-con-none">{hard?L('Kesin kısıt yok.','No hard constraints.'):L('Esnek kısıt yok.','No soft constraints.')}</div>}
      {list.map(c=>{const d=atpConDef(c.id);const withVal=!!(d&&d.ph);return(
        <div key={c.id} className="atp-con-row">
          <div className="atp-con-top">
            {atpCatLabel(atpConCat(c))?<span className="atp-con-cat">{atpT(atpCatLabel(atpConCat(c)))}</span>
              :<span className="atp-con-cat">{L('Diğer','Other')}</span>}
            <span className="atp-con-l" title={d&&REPORT_LANG==='tr'?d.en:undefined}>{atpConShow(c)}</span>
            <button className="atp-x" onClick={()=>remove(c.id)} title={L('Kısıtı kaldır','Remove constraint')} aria-label={L('Kısıtı kaldır','Remove constraint')}>✕</button>
          </div>
          <div className={`atp-con-in${withVal?' two':''}`}>
            {withVal&&<input value={c.value||''} onChange={e=>patch(c.id,{value:e.target.value})} placeholder={L(d.ph[0],d.ph[1])}
              aria-label={L('Değer','Value')}/>}
            <input value={c.note||''} onChange={e=>patch(c.id,{note:e.target.value})}
              placeholder={L('Not — bölge, süre, gerekçe…','Note — region, duration, reason…')} aria-label={L('Not','Note')}/>
          </div>
        </div>);})}
    </div>
    <button className="atp-con-add" onClick={()=>{setOpen(o=>!o);setMsg('');}}>{open?L('Kapat','Close'):L('+ Kısıt ekle','+ Add constraint')}</button>
    {open&&<div className="atp-pick">
      <div className="atp-pick-tabs">
        <button className={cat==='suggest'?'on':''} onClick={()=>setCat('suggest')}>{L('Önerilen','Suggested')}</button>
        {ATP_CON_CATS.map(k=><button key={k.id} className={cat===k.id?'on':''} onClick={()=>setCat(k.id)}>{atpT(k.en)}</button>)}
      </div>
      <div className="atp-pick-list">{opts.map(d=>{
        const on=mine.has(d.id),elsewhere=theirs.has(d.id),fits=atpConFits(d,kind);
        const why=elsewhere?L(`${otherName} listesinde — bir kısıt iki listede birden olamaz.`,`On the ${otherName} list — a constraint cannot be on both.`)
          :!fits?L(`Bu kısıt yalnızca ${otherName} olabilir.`,`This constraint can only be ${otherName}.`):undefined;
        return<button key={d.id} className={`atp-opt${on?' on':''}`} disabled={!on&&(elsewhere||!fits)} title={why}
          onClick={()=>on?remove(d.id):add(d.id)}>{on?'✓':'+'} {atpT(d.en)}{elsewhere&&<i>{otherName}</i>}</button>;})}</div>
      <div className="atp-pick-custom">
        <select value={customCat} onChange={e=>setCustomCat(e.target.value)} aria-label={L('Kategori','Category')}>
          {ATP_CON_CATS.map(k=><option key={k.id} value={k.id}>{atpT(k.en)}</option>)}</select>
        <input value={custom} onChange={e=>{setCustom(e.target.value);setMsg('');}} onKeyDown={e=>{if(e.key==='Enter')addCustom();}}
          placeholder={L('Özel kısıt yaz…','Write a custom constraint…')}/>
        <button onClick={addCustom} disabled={!custom.trim()}>{L('Ekle','Add')}</button>
      </div>
      {msg&&<div className="atp-pick-msg">{msg}</div>}
    </div>}
  </div>);
}
function AtpConstraints({con,onChange}){
  return(<div className="sc-sec" id="atp-s2">
    <AtpSecHead n={3} title={atpT('Constraints')}
      desc={L('Antrenmanda dikkate alınması gereken sınırlamalar ve tercihler. Kesin ve Esnek kısıtlar kesinlikle ayrı tutulur — bir kısıt yalnızca bir listede bulunabilir.',
        'The limits and preferences training has to take into account. Hard and Soft are kept strictly apart — a constraint can sit on one list only.')}>
      <span className="atp-hc cn-hard"><i/>{atpT('Hard')}<b>{con.hard.length}</b></span>
      <span className="atp-hc cn-soft"><i/>{atpT('Soft')}<b>{con.soft.length}</b></span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-con2">
        <AtpConPanel kind="hard" list={con.hard} other={con.soft} onList={l=>onChange({...con,hard:l})}/>
        <AtpConPanel kind="soft" list={con.soft} other={con.hard} onList={l=>onChange({...con,soft:l})}/>
      </div>
    </div>
  </div>);
}
/* The four ways a set is filed besides the exercise itself, one at a time on a tab. */
const ATP_EXP_LAYERS=[
  {id:'patterns',en:'Movement Pattern',      dTr:'Hareketin çalıştırdığı patern',dEn:'What the movement trains',fixed:true},
  {id:'stimuli', en:'Athletic Stimulus',     dTr:'Verilen atletik talep',dEn:'The athletic demand delivered',fixed:true},
  {id:'loading', en:'Loading Characteristic',dTr:'Vücudun nasıl yüklendiği',dEn:'How the body was loaded',fixed:true},
  {id:'families',en:'Exercise Family',       dTr:'Birbiriyle ilişkili egzersiz grupları',dEn:'Groups of related exercises',fixed:false},
];
function AtpExposure({exp,refDate,setRefDate}){
  const[win,setWin]=useState('d7');
  const[all,setAll]=useState(false);
  const[lay,setLay]=useState('patterns');
  const lv=id=>ATP_EXP_LEVELS.find(x=>x.id===id)||ATP_EXP_LEVELS[0];
  const pill=id=><span className={`atp-lv x-${id}`} title={L(lv(id).dTr,lv(id).dEn)}>{atpAb(lv(id))}</span>;
  const byWin=list=>list.filter(t=>t.sets[win]>0)
    .sort((a,b)=>(b.sets[win]-a.sets[win])||String(b.lastUsed||'').localeCompare(String(a.lastUsed||'')));
  const exRows=byWin(exp.exercises);
  const shown=all?exRows:exRows.slice(0,10);
  const W=ATP_EXP_WINDOWS.find(w=>w.id===win);
  const totalSets=exRows.reduce((n,t)=>n+t.sets[win],0);
  /* One row: a name, a bar as long as its share of the busiest row, the set count and the
     level. The bar is only there to be compared down the list; the level is the reading. */
  const bar=(t,max)=><span className={`atp-ly-bar x-${t.level[win]}`}><i style={{width:`${Math.max(6,Math.round(t.sets[win]/max*100))}%`}}/></span>;
  const L0=ATP_EXP_LAYERS.find(x=>x.id===lay);
  const lList=exp[lay]||[];
  const lOn=byWin(lList),lMax=Math.max(1,...lOn.map(t=>t.sets[win]));
  const lOff=L0.fixed?lList.filter(t=>!(t.sets[win]>0)):[];
  const exMax=Math.max(1,...exRows.map(t=>t.sets[win]));
  const stats=win==='last'
    ?[[L('Seans','Session'),exp.last?fd(exp.last.date):'—',exp.last&&exp.last.name],
      [L('Egzersiz','Exercises'),exRows.length],[L('Toplam set','Total sets'),totalSets]]
    :[[L('Aralık','Window'),`${fd(exp.from[win])} – ${fd(exp.end)}`],[L('Seans','Sessions'),exp.sessions[win]],
      [L('Egzersiz','Exercises'),exRows.length],[L('Toplam set','Total sets'),totalSets]];
  return(<div className="sc-sec" id="atp-s3">
    <AtpSecHead n={4} title={atpT('Exercise Exposure')}
      desc={L('Sporcunun takvimindeki antrenman kayıtlarından otomatik oluşur: seçilen aralıkta hangi egzersize ve hangi kategoriye kaç set maruz kaldığı. Düzey set sayısından okunur.',
        'Built automatically from the training records on the athlete’s calendar: how many sets of which exercise and which category the athlete did in the chosen window. The level is read from the set count.')}>
      <span className="atp-hc atp-auto">{L('Otomatik','Automatic')}</span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-xbar">
        <div className="atp-wseg" role="tablist">{ATP_EXP_WINDOWS.map(w=>
          <button key={w.id} role="tab" aria-selected={win===w.id} className={win===w.id?'on':''} onClick={()=>setWin(w.id)}>{atpT(w.en)}</button>)}</div>
        <label className="atp-ref"><span>{L('Referans günü','Reference day')}</span>
          <input type="date" value={refDate} onChange={e=>setRefDate(e.target.value)}/></label>
      </div>
      {!exp.last?<div className="atp-xempty">{L('Takvimde egzersiz kaydı yok. Egzersiz maruziyeti, sporcunun takvimine yazılan seanslardan — takım seansları dahil — kendiliğinden oluşur.',
          'No exercise on the calendar yet. Exercise Exposure builds itself from the sessions on the athlete’s calendar, team sessions included.')}</div>
      :<>
        <div className="atp-xstats">{stats.map(([k,v,sub])=>
          <div key={k} className={`atp-xstat${String(v).length>12?' wide':''}`}><div className="k">{k}</div><div className="v">{v}</div>{sub&&<div className="s">{sub}</div>}</div>)}
          <div className="atp-xleg" title={L('Düzey, seçilen aralıktaki set sayısından okunur (gün aralıkları haftalık ortalamayla).','The level is read from the set count in the window (day windows as a weekly average).')}>
            <div className="k">{L('Maruziyet düzeyi','Exposure level')}</div>
            <div className="l">{ATP_EXP_LEVELS.slice(1).map(l=><span key={l.id}><i className={`atp-sw x-${l.id}`}/>{atpT(l.en)}</span>)}</div>
          </div>
        </div>
        <div className="atp-xcols">
          <div className="atp-grp">
            <div className="atp-grp-h">
              <div><div className="atp-grp-t">{atpT('Exercise')}</div><div className="atp-grp-s">{atpT(W.en)}</div></div>
              <span className="atp-grp-c"><b>{exRows.length}</b></span>
            </div>
            {exRows.length===0?<div className="atp-ly-empty">{L('Bu aralıkta egzersiz kaydı yok.','No exercise in this window.')}</div>
            :shown.map(t=>{const l=t.level[win];return(
              <div key={t.key} className="atp-ex-r">
                <div className="atp-ex-tx">
                  <div className="atp-ex-n" title={t.label}>{t.label}</div>
                  <div className="atp-ex-m">{atpT(t.family)} · {L('son','last')} {fd(t.lastUsed)} · <span title={L('Son 28 günde yer aldığı seans sayısı','Sessions it appeared in over the last 28 days')}>{t.freq28}× / {L('28 gün','28 d')}</span></div>
                </div>
                {bar(t,exMax)}
                <span className="atp-ly-s">{t.sets[win]} set</span>
                {pill(l)}
              </div>);})}
            {exRows.length>10&&<button className="atp-xt-more" onClick={()=>setAll(a=>!a)}>{all?L('Daralt','Collapse'):L(`Tümünü göster (${exRows.length})`,`Show all (${exRows.length})`)}</button>}
          </div>
          <div className="atp-grp">
            <div className="atp-xtabs" role="tablist">{ATP_EXP_LAYERS.map(x=>
              <button key={x.id} role="tab" aria-selected={lay===x.id} className={lay===x.id?'on':''} onClick={()=>setLay(x.id)}>{atpT(x.en)}</button>)}</div>
            <div className="atp-xtab-d"><span>{L(L0.dTr,L0.dEn)}</span><span className="atp-grp-c"><b>{lOn.length}</b>{L0.fixed?`/${lList.length}`:''}</span></div>
            {lOn.length===0&&<div className="atp-ly-empty">{L('Bu aralıkta maruziyet yok.','No exposure in this window.')}</div>}
            {lOn.map(t=>
              <div key={t.key} className="atp-ly-r">
                <span className="atp-ly-n" title={atpT(t.label)}>{atpT(t.label)}</span>
                {bar(t,lMax)}
                <span className="atp-ly-s">{t.sets[win]} set</span>
                {pill(t.level[win])}
              </div>)}
            {lOff.length>0&&<div className="atp-ly-none"><div className="k">{L('Bu aralıkta yok','Not in this window')}</div>
              <div className="l">{lOff.map(t=><span key={t.key}>{atpT(t.label)}</span>)}</div></div>}
          </div>
        </div>
      </>}
    </div>
  </div>);
}
/* ---- Joint by Joint: rated on the mannequin photograph ----
   The coach's own joint map (joint-model.jpg, made from "Eklem Ağrısı Haritası.png"): the
   athlete from the front and from the back, each joint marked where the photograph marks
   it. The front shows the athlete's right on the left of the picture, the back the other
   way round. Every joint is a marker drawn over the photograph's own dot: a ring in the
   colour of its need (blue for a mobile joint, amber for a stable one), filled in the
   colour of the level once it is rated (green Low, yellow Medium, red High). The
   thoracic spine is one dot on the photograph and two motions in the record (extension
   and rotation); its marker opens both. The photograph has no dot on the feet, so those
   two markers are the only ones that sit on bare skin.

   Beside the figures the chain itself, head to foot, alternating mobile and stable —
   the approach read as a table, each side a cell that opens the same picker. */
const ATP_JB_IMG={src:'joint-model.jpg',w:1000,h:951};
const ATP_JB_MARKS=[
  {id:'cervical',  keys:['cervical'],                    at:[744,131],    r:23},
  {id:'scapula_l', keys:['scapula_l'],                   at:[689.1,209],  r:23},
  {id:'scapula_r', keys:['scapula_r'],                   at:[799,208.8],  r:23},
  {id:'thoracic',  keys:['thoracic_ext','thoracic_rot'], at:[744.2,262.3],r:23},
  {id:'lumbar',    keys:['lumbar'],                      at:[743.6,357.6],r:23},
  {id:'shoulder_r',keys:['shoulder_r'],                  at:[152.8,185.3],r:23},
  {id:'shoulder_l',keys:['shoulder_l'],                  at:[347.4,185.2],r:23},
  {id:'elbow_r',   keys:['elbow_r'],                     at:[119.6,319.7],r:23},
  {id:'elbow_l',   keys:['elbow_l'],                     at:[377.8,321.1],r:23},
  {id:'wrist_r',   keys:['wrist_r'],                     at:[72.1,421.3], r:21},
  {id:'wrist_l',   keys:['wrist_l'],                     at:[420.9,422.7],r:21},
  {id:'hip_r',     keys:['hip_r'],                       at:[186.7,427.4],r:23},
  {id:'hip_l',     keys:['hip_l'],                       at:[313,427.7],  r:23},
  {id:'knee_r',    keys:['knee_r'],                      at:[191.2,623.1],r:23},
  {id:'knee_l',    keys:['knee_l'],                      at:[308.6,623.8],r:23},
  {id:'ankle_r',   keys:['ankle_r'],                     at:[181.9,800.4],r:21},
  {id:'ankle_l',   keys:['ankle_l'],                     at:[316.7,800.7],r:21},
  {id:'foot_r',    keys:['foot_r'],                      at:[170,856],    r:19},
  {id:'foot_l',    keys:['foot_l'],                      at:[329,856],    r:19},
];
const atpJbMarkOf=key=>ATP_JB_MARKS.find(m=>m.keys.includes(key))||null;
const atpJbRow=key=>ATP_JOINT_ROWS.find(r=>r.key===key);
/* A joint's name with its side, in the app language. */
const atpJbLabel=r=>`${r.side?atpT(r.side)+' ':''}${atpT(r.joint.en)}`;
/* A marker's name: the joint and side, or just "Thoracic Spine" for the two motions. */
const atpJbMarkLabel=m=>m.keys.length>1?atpT('Thoracic Spine'):atpJbLabel(atpJbRow(m.keys[0]));
/* The level letter a rated marker carries, so a level is read without its colour too. */
const atpJbLetter=id=>({low:L('D','L'),medium:L('O','M'),high:L('Y','H')}[id]||'');
function AtpJbStage({joints,sel,onPick,children}){
  const marker=m=>{
    const rows=m.keys.map(atpJbRow);
    const need=rows[0].joint.need;
    /* A two-motion marker shows the stronger of its two levels. */
    const lv=Math.max(0,...m.keys.map(k=>atpJointLv((joints[k]||{}).level)));
    const lvId=lv?ATP_JOINT_LEVELS[lv-1].id:null;
    const on=sel===m.id;
    const[x,y]=m.at,R=m.r;
    const tip=`${atpJbMarkLabel(m)} — ${atpT(ATP_JOINT_NEEDS.find(n=>n.id===need).en)}: ${m.keys.map(k=>{const v=(joints[k]||{}).level;
      return(m.keys.length>1?`${atpT(atpJbRow(k).joint.en)} `:'')+(v?atpT(ATP_JOINT_LEVELS[atpJointLv(v)-1].en):'—');}).join(' · ')}`;
    const pick=e=>{e.stopPropagation();onPick(m.id);};
    return(<g key={m.id} className={`jb2-m jb-${need}${lvId?` jl-${lvId}`:''}${on?' on':''}`} transform={`translate(${x} ${y})`}
      role="button" tabIndex={0} aria-label={tip} aria-pressed={on} aria-haspopup="dialog"
      onClick={pick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}}}>
      <title>{tip}</title>
      <circle className="jb2-hit" r={R+8}/>
      {on&&<circle className="jb2-halo" r={R+7}/>}
      <circle className="jb2-disc" r={R-1.5}/>
      <circle className="jb2-ring" r={R-2.5}/>
      {lvId?<text className="jb2-lt" textAnchor="middle" dy="7">{atpJbLetter(lvId)}</text>:<circle className="jb2-core" r={5.5}/>}
      {m.keys.length>1&&<text className="jb2-two" textAnchor="middle" y={-R-7}>E · R</text>}
    </g>);
  };
  return(<div className="jb2-stage">
    <img src={ATP_JB_IMG.src} alt="" width={ATP_JB_IMG.w} height={ATP_JB_IMG.h} draggable="false"/>
    <svg viewBox={`0 0 ${ATP_JB_IMG.w} ${ATP_JB_IMG.h}`} className="jb2-svg" role="group" aria-label="Joint by Joint">
      {ATP_JB_MARKS.map(marker)}
    </svg>
    <span className="jb2-cap" style={{left:'25%'}}>{atpT('Front')}</span>
    <span className="jb2-cap" style={{left:'75%'}}>{atpT('Back')}</span>
    <span className="jb2-side" style={{left:'3%'}}>{atpT('Right')}</span>
    <span className="jb2-side" style={{left:'47%',transform:'translateX(-100%)'}}>{atpT('Left')}</span>
    <span className="jb2-side" style={{left:'53%'}}>{atpT('Left')}</span>
    <span className="jb2-side" style={{left:'97%',transform:'translateX(-100%)'}}>{atpT('Right')}</span>
    {children}
  </div>);
}
/* The picker that opens next to a marker: the need, the three levels and a note — once
   per motion on the thoracic spine. It sits below the marker (above it for the lower
   half of the picture) and is kept inside the picture at the edges. */
function AtpJointPop({m,joints,onSet,onNote,onClose}){
  const[x,y]=m.at;
  const left=x/ATP_JB_IMG.w*100,top=y/ATP_JB_IMG.h*100;
  const up=top>55;
  const need=ATP_JOINT_NEEDS.find(n=>n.id===atpJbRow(m.keys[0]).joint.need);
  const one=k=>{const r=atpJbRow(k),j=joints[k]||{};return(
    <div key={k} className="jb2-pop-b">
      {m.keys.length>1&&<div className="jb2-pop-k">{atpT(r.joint.en)}</div>}
      <div className="atp-jb-lvs" role="group" aria-label={`${atpJbLabel(r)} — ${atpT(need.en)}`}>{ATP_JOINT_LEVELS.map(l=>
        <button key={l.id} className={`jl-${l.id}${j.level===l.id?' on':''}`} aria-pressed={j.level===l.id}
          title={L(l.dTr,l.dEn)} onClick={()=>{onSet(k,'level',l.id);if(m.keys.length===1)onClose();}}><i/>{atpT(l.en)}</button>)}</div>
      <input className="atp-jb-note" value={j.note||''} onChange={e=>onNote(k,e.target.value)}
        placeholder={L('Not — test, ağrı, gözlem…','Note — test, pain, observation…')} aria-label={atpT('Note')}/>
      {j.level&&<div className="atp-jb-pop-d">{L(ATP_JOINT_LEVELS[atpJointLv(j.level)-1].dTr,ATP_JOINT_LEVELS[atpJointLv(j.level)-1].dEn)}</div>}
    </div>);};
  return(<div className={`atp-jb-pop jb2-pop${up?' up':''}`} role="dialog" aria-label={atpJbMarkLabel(m)}
    style={{left:`clamp(118px, ${left}%, calc(100% - 118px))`,top:`${top}%`}} onClick={e=>e.stopPropagation()}>
    <div className="atp-jb-pop-h">
      <b>{atpJbMarkLabel(m)}</b>
      <span className={`atp-jb-tag jb-${need.id}`}><i/>{atpT(need.en)}</span>
      <button className="atp-x" onClick={onClose} aria-label={L('Kapat','Close')} title={L('Kapat','Close')}>✕</button>
    </div>
    {m.keys.map(one)}
  </div>);
}
function AtpJoints({joints,onSet,onNote}){
  const[sel,setSel]=useState(null);
  const boxRef=useRef(null);
  /* A click anywhere outside the figures and the chain, or Escape, closes the picker. */
  useEffect(()=>{
    if(!sel)return;
    const down=e=>{if(boxRef.current&&!boxRef.current.contains(e.target))setSel(null);};
    const key=e=>{if(e.key==='Escape')setSel(null);};
    document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key);};
  },[sel]);
  const pick=id=>setSel(k=>k===id?null:id);
  const rated=ATP_JOINT_ROWS.filter(r=>(joints[r.key]||{}).level);
  const count=id=>rated.filter(r=>r.joint.need===id).length;
  const selMark=sel&&ATP_JB_MARKS.find(m=>m.id===sel);
  const cell=r=>{const j=joints[r.key]||{};const m=atpJbMarkOf(r.key);const on=m&&sel===m.id;
    return(<button key={r.key} className={`jb2-cell${j.level?` jl-${j.level}`:''}${on?' on':''}`}
      onClick={e=>{e.stopPropagation();if(m)pick(m.id);}} title={j.note||atpJbLabel(r)}
      aria-label={`${atpJbLabel(r)}: ${j.level?atpT(ATP_JOINT_LEVELS[atpJointLv(j.level)-1].en):'—'}`}>
      {j.level?<><i/>{atpT(ATP_JOINT_LEVELS[atpJointLv(j.level)-1].en)}</>:<span className="jb2-none">—</span>}
      {j.note&&<em className="jb2-note">{L('not','note')}</em>}
    </button>);};
  return(<div className="sc-sec" id="atp-s4">
    <AtpSecHead n={1} title={<span lang="en">Joint by Joint</span>}
      desc={L('Eklemler sırayla stabil ve mobildir; her eklemin tek bir ihtiyacı vardır (diz stabilite ister, mobilite değil). Mankende bir eklemi tıkla ve ihtiyaç düzeyini seç.',
        'Joints alternate between stable and mobile; each has one need (the knee needs stability, not mobility). Click a joint on the mannequin and pick how much it needs.')}>
      <span className="atp-hc jb-mobility"><i/>{atpT('Mobility')}<b>{count('mobility')}</b></span>
      <span className="atp-hc jb-stability"><i/>{atpT('Stability')}<b>{count('stability')}</b></span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="jb2" ref={boxRef}>
        <AtpJbStage joints={joints} sel={sel} onPick={pick}>
          {selMark&&<AtpJointPop m={selMark} joints={joints} onSet={onSet} onNote={onNote} onClose={()=>setSel(null)}/>}
        </AtpJbStage>
        <div className="jb2-chain">
          <div className="jb2-tbl" role="table" aria-label={L('Eklem zinciri','Joint chain')}>
            <div className="jb2-tr jb2-th" role="row">
              <span role="columnheader">{atpT('Joint')}</span><span role="columnheader">{atpT('Need')}</span>
              <span role="columnheader">{atpT('Right')}</span><span role="columnheader">{atpT('Left')}</span>
            </div>
            {ATP_JOINTS.map(j=>{const rs=ATP_JOINT_ROWS.filter(r=>r.joint.id===j.id);return(
              <div key={j.id} className={`jb2-tr jb-${j.need}`} role="row">
                <span className="jb2-jn" role="cell">{atpT(j.en)}</span>
                <span className="jb2-need" role="cell"><i/>{atpT(j.need==='mobility'?'Mobility':'Stability')}</span>
                {j.bi?<>{cell(rs[0])}{cell(rs[1])}</>:<span className="jb2-mid" role="cell">{cell(rs[0])}</span>}
              </div>);})}
          </div>
          <div className="jb2-leg">
            <span><i className="jb-ring jb-mobility"/>{atpT('Mobile Joints')}</span>
            <span><i className="jb-ring jb-stability"/>{atpT('Stable Joints')}</span>
            {ATP_JOINT_LEVELS.map(l=><span key={l.id} title={L(l.dTr,l.dEn)}><i className={`jb-dot jl-${l.id}`}/>{atpT(l.en)}</span>)}
          </div>
        </div>
      </div>
    </div>
  </div>);
}
/* ---- The latest test results, at the top of the tab ----
   Movement Quality, Jump & Reactivity and Speed & Agility, each test as one small box
   with its most recent result, the date it was taken and how it moved against the
   result before it. Only the tests the athlete has actually done are shown — a category
   with none taken does not appear at all. The boxes are one width across the strip, and
   when there are more than eight they fold into two even rows. */
const ATH_TEST_BOXES=[
  {g:'move',id:'ankleDF',tr:'Ayak Bileği DF',en:'Ankle DF',u:'°',dir:'hi',bi:t=>[cmpN(t.ankleDF&&t.ankleDF.right),cmpN(t.ankleDF&&t.ankleDF.left)]},
  {g:'move',id:'aslr',tr:'ASLR',en:'ASLR',u:'/3',dir:'hi',bi:t=>[cmpN(t.aslr&&t.aslr.right),cmpN(t.aslr&&t.aslr.left)]},
  {g:'move',id:'ohs',tr:'Overhead Squat',en:'Overhead Squat',u:'/3',dir:'hi',get:t=>cmpN(t.ohs&&t.ohs.score)},
  {g:'move',id:'fms',tr:'FMS',en:'FMS',u:'/21',dir:'hi',get:t=>{const f=fmsCalc(t.fms);return f.n?f.total:null;}},
  {g:'move',id:'yBalance',tr:'Y Balance',en:'Y Balance',u:'%',dir:'hi',bi:t=>{const y=ybCalc(t.yBalance);return[y.compR,y.compL];}},
  {g:'jump',id:'verticalJump',tr:'Dikey Sıçrama',en:'Vertical Jump',u:'cm',dir:'hi',get:t=>cmpN(t.verticalJump)},
  {g:'jump',id:'cmj',tr:'CMJ',en:'CMJ',u:'cm',dir:'hi',get:t=>cmpN(t.cmj)},
  {g:'jump',id:'squatJump',tr:'Squat Jump',en:'Squat Jump',u:'cm',dir:'hi',get:t=>cmpN(t.squatJump)},
  {g:'jump',id:'dropJump',tr:'Drop Jump',en:'Drop Jump',u:'RSI',dir:'hi',get:t=>cmpN(t.dropJump)},
  {g:'jump',id:'horizontalJump',tr:'Yatay Sıçrama',en:'Horizontal Jump',u:'cm',dir:'hi',get:t=>cmpN(t.horizontalJump)},
  {g:'jump',id:'lateralCmj',tr:'Lateral CMJ',en:'Lateral CMJ',u:'cm',dir:'hi',bi:t=>[cmpN(t.lateralCmj&&t.lateralCmj.right),cmpN(t.lateralCmj&&t.lateralCmj.left)]},
  {g:'speed',id:'sprint',tr:'20 m Sprint',en:'20 m Sprint',u:'s',dir:'lo',get:t=>cmpN(t.sprint20m&&t.sprint20m.time)},
  {g:'speed',id:'tTest',tr:'T-Test',en:'T-Test',u:'s',dir:'lo',get:t=>cmpN(t.tTest)},
  {g:'speed',id:'fiveZeroFive',tr:'5-0-5',en:'5-0-5',u:'s',dir:'lo',get:t=>cmpN(t.fiveZeroFive)},
  {g:'speed',id:'shuttleRun',tr:'Shuttle Run',en:'Shuttle Run',u:'VO2max',get:t=>cmpN(t.shuttleRun)},
];
const ATH_TEST_GROUPS=['move','jump','speed'];
/* Every box with a result: its latest value(s), the date, and the change against the
   record before it (single-value tests) or the side-to-side gap (two-sided tests). */
function athLatestTests(ath){
  const ts=[...(ath.tests||[])].filter(t=>t&&t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const out=[];
  ATH_TEST_BOXES.forEach(b=>{
    const vals=ts.map(t=>({t,v:b.bi?b.bi(t):b.get(t)}))
      .filter(x=>b.bi?(x.v[0]!=null||x.v[1]!=null):x.v!=null);
    if(!vals.length)return;
    const last=vals[vals.length-1],prev=vals[vals.length-2]||null;
    let delta=null,gap=null;
    if(b.bi){if(last.v[0]!=null&&last.v[1]!=null)gap=+Math.abs(last.v[0]-last.v[1]).toFixed(1);}
    else if(prev)delta=+(last.v-prev.v).toFixed(2);
    out.push({...b,v:last.v,date:last.t.date,delta,gap,good:delta==null||!b.dir?null:(b.dir==='hi'?delta>0:delta<0)});
  });
  return out;
}
const athTestFmt=v=>v==null?'—':String(+(Math.round(v*100)/100));
function AtpTestStrip({ath}){
  const all=athLatestTests(ath);
  const groups=ATH_TEST_GROUPS.map(g=>({g,meta:TEST_GROUPS.find(x=>x.id===g),items:all.filter(b=>b.g===g)})).filter(x=>x.items.length);
  if(!groups.length)return(<div className="ats ats-empty">
    <div className="ats-h"><b>{L('Son Test Sonuçları','Latest Test Results')}</b></div>
    <div className="ats-none">{L('Hareket Kalitesi, Sıçrama & Reaktivite ya da Hız & Çeviklik kategorisinde alınmış test yok. Testler Test ve Değerlendirme ekranından girilir.',
      'No Movement Quality, Jump & Reactivity or Speed & Agility test taken yet. Tests are entered on the Testing & Assessment screen.')}</div>
  </div>);
  const N=all.length,rows=N>8?2:1;
  const cols=groups.map(x=>Math.ceil(x.items.length/rows));
  return(<div className="ats">
    <div className="ats-h"><b>{L('Son Test Sonuçları','Latest Test Results')}</b><span>{L(`${N} test · her testin en son sonucu`,`${N} tests · each test's latest result`)}</span></div>
    <div className="ats-grid" style={{gridTemplateColumns:cols.map(c=>`minmax(0,${c}fr)`).join(' ')}}>
      {groups.map((x,gi)=><div key={x.g} className={`ats-g ats-${x.g}`} style={{'--cols':cols[gi]}}>
        <div className="ats-gh">{L(x.meta.tr,x.meta.en)}</div>
        <div className="ats-boxes">{x.items.map(b=><div key={b.id} className="ats-b" title={`${L(b.tr,b.en)} · ${fd(b.date)}`}>
          <div className="ats-n"><span>{L(b.tr,b.en)}</span><em>{b.u}</em></div>
          {b.bi?<div className="ats-v ats-bi">
              <span><small>{L('Sağ','R')}</small>{athTestFmt(b.v[0])}</span>
              <span><small>{L('Sol','L')}</small>{athTestFmt(b.v[1])}</span>
            </div>
            :<div className="ats-v">{athTestFmt(b.v)}{b.delta!=null&&b.delta!==0&&<i className={b.good==null?'':b.good?'up':'dn'}>{b.delta>0?'+':''}{athTestFmt(b.delta)}</i>}</div>}
          <div className="ats-d">{fd(b.date)}{b.gap!=null&&<span>{L('fark','gap')} {athTestFmt(b.gap)}</span>}</div>
        </div>)}</div>
      </div>)}
    </div>
  </div>);
}
function TrainingProfileTab({ath,updAth,exercises}){
  const tp=atpRead(ath);
  const raw=(ath.trainingProfile&&typeof ath.trainingProfile==='object')?ath.trainingProfile:{};
  /* A save always writes the profile in the template's shape; the two sections it
     replaced (priorities, movement) are read into it by atpRead and not kept. */
  const save=patch=>{const{priorities,movement,...rest}=raw;
    updAth(ath.id,{trainingProfile:{...rest,qualities:tp.qualities,joints:tp.joints,...patch,updated:fmt(new Date())}});};
  const libMap=useMemo(()=>atpLibMap(exercises),[exercises]);
  const[refDate,setRefDate]=useState(()=>fmt(today));
  const refOk=/^\d{4}-\d{2}-\d{2}$/.test(refDate||'')?refDate:fmt(today);
  const exp=useMemo(()=>atpExposure(ath,refOk,{libMap}),[ath.days,libMap,refOk]);
  /* Clicking the priority that is already on takes it off again. */
  const setQ=(id,field,v)=>{
    const cur={...(tp.qualities[id]||{})};
    /* A sixth High is refused (ATP_HIGH_MAX), whatever path the click came by. */
    if(field==='priority'&&v==='high'&&cur.priority!=='high'&&
      Object.values(tp.qualities).filter(x=>x&&x.priority==='high').length>=ATP_HIGH_MAX)return;
    if(cur[field]===v)delete cur[field];else cur[field]=v;
    const nx={...tp.qualities};
    if(cur.priority)nx[id]=cur;else delete nx[id];
    save({qualities:nx});
  };
  /* Clear: every priority set on the Athletic Profile is taken off (asked first — there is no undo). */
  const clearQ=()=>{
    if(!Object.keys(tp.qualities).length)return;
    if(!confirm(L('Atletik Gelişim Öncelikleri\'ndeki tüm öncelikler kaldırılsın mı?','Remove every priority from the Athletic Development Priorities?')))return;
    save({qualities:{}});
  };
  /* A joint's level for one need; clicking the level that is on takes it off. A joint
     left with neither need nor note is dropped from the record. */
  const setJ=(key,field,v)=>{
    const cur={...(tp.joints[key]||{})};
    if(field==='note'?!v:cur[field]===v)delete cur[field];else cur[field]=v;
    const nx={...tp.joints};
    if(Object.keys(cur).length)nx[key]=cur;else delete nx[key];
    save({joints:nx});
  };
  return(<div className="atp-wrap">
    <AtpTestStrip ath={ath}/>
    <AtpJoints joints={tp.joints} onSet={setJ} onNote={(key,v)=>setJ(key,'note',v)}/>
    <AtpProfile q={tp.qualities} onSet={setQ} onClear={clearQ}/>
    <AtpConstraints con={tp.constraints} onChange={c=>save({constraints:c})}/>
    <AtpExposure exp={exp} refDate={refDate} setRefDate={setRefDate}/>
  </div>);
}
