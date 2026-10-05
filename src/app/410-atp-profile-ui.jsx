/* ═══ ATHLETE PROFILE (Athlete Training Profile) — the tab beside Profile ═══
   Four sections on the same cards the scouting sheet uses. The first two and the
   fourth (Joint by Joint) are the coach's and are written straight onto
   `ath.trainingProfile`; the third is drawn from the calendar and cannot be edited,
   only read. Nothing here selects an exercise
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
   Plyometric / Reactive and Power (9 qualities under four headers) beside Strength,
   Movement Quality and Conditioning (9 under three). The last card of each column
   takes up the few pixels between them; on a narrow screen the columns fold into one
   list in the template's own order. */
const ATP_COLS=[['speed','cod','plyo','power'],['strength','movement','conditioning']];
function AtpProfile({q,onSet}){
  const rated=ATP_QUALITIES.filter(it=>q[it.id]);
  const byPri=id=>rated.filter(it=>q[it.id].priority===id);
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
          <div className="atp-seg" role="group" aria-label={`${atpT(it.en)} — ${atpT('Priority')}`}>{ATP_PRIORITY.map(p=>
            <button key={p.id} className={`pr-${p.id}${r.priority===p.id?' on':''}`} aria-pressed={r.priority===p.id} aria-label={atpT(p.en)}
              title={`${atpT('Priority')}: ${atpT(p.en)} — ${L(p.dTr,p.dEn)}`} onClick={()=>onSet(it.id,'priority',p.id)}>{atpBars(p.bars)}{atpAb(p)}</button>)}</div>
        </div>);})}</div>
    </div>);};
  return(<div className="sc-sec" id="atp-s1">
    <AtpSecHead n={1} title={atpT('Athletic Profile')}
      desc={L(`Her fiziksel kalite için Öncelik — bu dönemde ne kadar geliştirileceği. Performans verileri, test sonuçları, antrenman geçmişi ve antrenör değerlendirmesiyle belirlenir. Öncelik verilmeyen kalite Düşük gibi korunur.`,
        `A Priority for every physical quality — how much this period develops it. Set from performance data, test results, training history and the coach’s judgement. A quality left unrated is maintained, like Low.`)}/>
    <div className="sc-sec-b">
      <div className="atp-key">
        <div className="atp-key-g"><span className="atp-key-k">{atpT('Priority')}</span>
          {ATP_PRIORITY.map(p=><span key={p.id} className="atp-key-i"><span className={`atp-tag pr-${p.id}`}>{atpBars(p.bars)}{atpT(p.en)}</span>{L(p.dTr,p.dEn)}</span>)}</div>
      </div>
      <div className="atp-lanes">{ATP_PRIORITY.map(p=>{const its=byPri(p.id);return(
        <div key={p.id} className={`atp-lane pr-${p.id}`}>
          <div className="atp-lane-h"><span className="atp-lane-t">{atpBars(p.bars)}{atpT(p.en)}</span><span className="atp-lane-n">{its.length}</span></div>
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
    <AtpSecHead n={2} title={atpT('Constraints')}
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
    <AtpSecHead n={3} title={atpT('Exercise Exposure')}
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
/* ---- Joint by Joint: the two mannequins and the table ----
   A figure seen from the front and one from the back. The front is drawn facing the
   coach, so the athlete's right is on the left of the picture; the back the other way
   round. Each joint is a marker in its need's colour — blue for a mobile joint, orange
   for a stable one, the Joint-by-Joint chart's own colours: an empty dashed ring while
   it is not rated, a filled disc once it is, growing with the level it carries as a
   number. Clicking a marker picks the joint's row in the table, where it is rated.

   The body is drawn as halves: each shape is written once for the right of the picture
   and drawn again mirrored, so the figure is symmetric by construction. */
const ATP_JB_W=200,ATP_JB_H=446;
const ATP_JB_HALF={
  torso:'M99.5 50L108 50C108 58 110 64 116 67C126 71 138 72 143 80C147 88 146 102 141 114C137 132 133 150 131 168C130 182 134 194 138 207C141 221 137 235 128 244L99.5 247Z',
  arm:'M137 82C147 80 154 90 154 106C155 124 157 140 157 157C159 177 162 201 162 227C164 239 166 251 163 263C159 271 152 269 152 259C150 249 150 240 152 230C150 206 145 181 142 161C140 145 138 129 138 113Z',
  leg:'M138 204C143 230 143 258 139 287C137 301 136 312 136 322C138 341 141 361 137 385C135 400 133 409 133 417C135 423 141 427 141 432C139 437 119 437 116 432C116 426 118 420 118 414C116 396 112 371 114 350C114 338 112 330 112 322C110 300 106 271 102 246L99.5 242L99.5 204Z',
};
/* Where each joint sits on the right of the picture (mirrored for the other side). */
const ATP_JB_AT={cervical:[100,54],scapula:[121,104],shoulder:[141,88],elbow:[150,158],wrist:[158,230],
  thoracic:[100,124],lumbar:[100,192],hip:[123,226],knee:[125,322],ankle:[126,406],foot:[130,432]};
/* x on the picture: the front shows the athlete's right on the left, the back on the right. */
const atpJbXY=(r,view)=>{const[x,y]=ATP_JB_AT[r.joint.id];
  if(!r.side)return[x,y];
  const leftOfPic=(view==='front')===(r.side==='Right');
  return[leftOfPic?ATP_JB_W-x:x,y];};
function AtpMannequin({view,joints,sel,onPick}){
  const mir=`translate(${ATP_JB_W} 0) scale(-1 1)`;
  const both=d=><><path d={d}/><path d={d} transform={mir}/></>;
  const marker=r=>{
    const[x,y]=atpJbXY(r,view);
    const j=joints[r.key]||{};
    const lv=atpJointLv(j.level);
    const rad=lv?6.5+lv*1.7:6;
    const on=sel===r.key;
    const need=ATP_JOINT_NEEDS.find(n=>n.id===r.joint.need);
    const tip=`${r.side?atpT(r.side)+' ':''}${atpT(r.joint.en)} — ${atpT(need.en)}: ${lv?atpT(ATP_JOINT_LEVELS[lv-1].en):'—'}`;
    const pick=()=>onPick(r.key);
    return(<g key={r.key} className={`atp-jb-m jb-${r.joint.need}${on?' on':''}${lv?' set':''}`} transform={`translate(${x} ${y})`}
      role="button" tabIndex={0} aria-label={tip} aria-pressed={on}
      onClick={pick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}}}>
      <title>{tip}</title>
      {on&&<circle className="atp-jb-halo" r={rad+4.5}/>}
      <circle className={lv?'atp-jb-dot':'atp-jb-empty'} r={rad}/>
      {lv>0&&<text className="atp-jb-n" dy="0.36em">{lv}</text>}
    </g>);
  };
  const front=view==='front';
  return(<figure className="atp-jb-fig">
    <svg viewBox={`0 0 ${ATP_JB_W} ${ATP_JB_H}`} className="atp-jb-svg" role="group"
      aria-label={`${atpT(front?'Front':'Back')} — ${atpT('Joint by Joint')}`}>
      <g className="atp-jb-body">
        {both(ATP_JB_HALF.arm)}{both(ATP_JB_HALF.leg)}{both(ATP_JB_HALF.torso)}
        <ellipse cx="100" cy="30" rx="17" ry="21"/>
      </g>
      {front
        ?<g className="atp-jb-lines">
          {both('M100 72C110 74 122 72 132 76')}{both('M104 104C112 112 124 112 132 106')}
          <path d="M100 118L100 196"/>{both('M108 132L126 134M108 152L124 154M108 172L122 174')}
          <ellipse cx="125" cy="318" rx="6.5" ry="8"/><ellipse cx="75" cy="318" rx="6.5" ry="8"/></g>
        :<g className="atp-jb-lines">
          <path d="M100 58L100 214" strokeDasharray="1.5 5" strokeLinecap="round" className="atp-jb-spine"/>
          {both('M108 86C116 84 128 86 134 92C130 106 124 118 116 124C112 112 110 98 108 86Z')}
          {both('M100 222C110 232 124 234 134 226')}{both('M118 330C122 326 128 326 132 330')}</g>}
      <text className="atp-jb-side" x="8" y="300">{atpT(front?'Right':'Left')}</text>
      <text className="atp-jb-side" x={ATP_JB_W-8} y="300" textAnchor="end">{atpT(front?'Left':'Right')}</text>
      {ATP_JOINT_ROWS.filter(r=>r.joint.view===view).map(marker)}
    </svg>
    <figcaption>{atpT(front?'Front':'Back')}</figcaption>
  </figure>);
}
function AtpJoints({joints,onSet,onNote}){
  const[sel,setSel]=useState(null);
  const pick=key=>{
    setSel(k=>k===key?null:key);
    const el=document.getElementById('atp-jr-'+key);
    if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  const count=id=>ATP_JOINT_ROWS.filter(r=>r.joint.need===id&&(joints[r.key]||{}).level).length;
  const needTag=id=>{const n=ATP_JOINT_NEEDS.find(x=>x.id===id);return<span className={`atp-jb-tag jb-${id}`}><i/>{atpT(n.en)}</span>;};
  const listOf=id=>ATP_JOINTS.filter(j=>j.need===id).map(j=>atpT(j.en)).join(' · ');
  return(<div className="sc-sec" id="atp-s4">
    <AtpSecHead n={4} title={atpT('Joint by Joint')}
      desc={L('Joint by Joint yaklaşımı: eklemler aşağıdan yukarı sırayla stabil ve mobil olarak dizilir. Her eklemin tek bir ihtiyacı vardır — diz stabil bir eklemdir, mobiliteye değil stabiliteye ihtiyaç duyar. Sporcunun değerlendirmesine göre her eklem ve taraf için bu ihtiyacın düzeyini Düşük / Orta / Yüksek olarak işaretle. Bilgiler bireyselleştirme JSON\'una yazılır ve hazırlık / rehabilitasyon bölümü bunlara göre kurulur.',
        'The Joint-by-Joint approach: up the body the joints alternate between stable and mobile. Each joint has one need — the knee is a stable joint, it needs stability, not mobility. Mark how much of that need the athlete has, from the assessment, per joint and side as Low / Medium / High. It is written into the individualization JSON, and the preparation / rehabilitation part is built on it.')}>
      <span className="atp-hc jb-mobility"><i/>{atpT('Mobility')}<b>{count('mobility')}</b></span>
      <span className="atp-hc jb-stability"><i/>{atpT('Stability')}<b>{count('stability')}</b></span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-jb-kinds">
        <div className="atp-jb-kind jb-stability"><b>{atpT('Stable Joints')}</b><span>{listOf('stability')}</span></div>
        <div className="atp-jb-kind jb-mobility"><b>{atpT('Mobile Joints')}</b><span>{listOf('mobility')}</span></div>
      </div>
      <div className="atp-key">
        <div className="atp-key-g"><span className="atp-key-k">{atpT('Level')}</span>
          {ATP_JOINT_LEVELS.map(l=><span key={l.id} className="atp-key-i"><span className={`atp-tag pr-${l.id}`}>{atpBars(l.bars)}{atpT(l.en)}</span>{L(l.dTr,l.dEn)}</span>)}</div>
      </div>
      <div className="atp-jb">
        <div className="atp-jb-figs">
          <div className="atp-jb-pair">
            <AtpMannequin view="front" joints={joints} sel={sel} onPick={pick}/>
            <AtpMannequin view="back" joints={joints} sel={sel} onPick={pick}/>
          </div>
          <div className="atp-jb-leg">
            <span><i className="jb-dot jb-mobility"/>{atpT('Mobility')}</span>
            <span><i className="jb-dot jb-stability"/>{atpT('Stability')}</span>
            <span><i className="jb-dot jb-none"/>{L('Değerlendirilmedi','Not rated')}</span>
            <span className="atp-jb-leg-n">{L('Sayı ve boyut: ihtiyaç düzeyi (1–3)','Number and size: level of need (1–3)')}</span>
          </div>
        </div>
        <div className="atp-jb-tbl" role="table" aria-label={atpT('Joint by Joint')}>
          <div className="atp-jb-hr" role="row">
            <span role="columnheader">{atpT('Joint')}</span><span role="columnheader">{atpT('Need')}</span>
            <span role="columnheader">{atpT('Level')}</span>
          </div>
          {ATP_JOINT_ROWS.map(r=>{const j=joints[r.key]||{};const n=ATP_JOINT_NEEDS.find(x=>x.id===r.joint.need);return(
            <div key={r.key} id={'atp-jr-'+r.key} role="row"
              className={`atp-jb-r${sel===r.key?' on':''}${j.level?' set':''}${r.side==='Right'?' pair':''}`}
              onClick={()=>setSel(r.key)}>
              <span className="atp-jb-n" role="cell">
                <b title={REPORT_LANG==='tr'?r.joint.en:undefined}>{atpT(r.joint.en)}</b>
                {r.side&&<small>{atpT(r.side)}</small>}</span>
              <span role="cell">{needTag(r.joint.need)}</span>
              <span role="cell" className="atp-jb-c">
                <div className="atp-seg" role="group" aria-label={`${atpT(atpJointName(r))} — ${atpT(n.en)}`}>{ATP_JOINT_LEVELS.map(l=>
                  <button key={l.id} className={`pr-${l.id}${j.level===l.id?' on':''}`} aria-pressed={j.level===l.id} aria-label={atpT(l.en)}
                    title={`${atpT(n.en)}: ${atpT(l.en)} — ${L(l.dTr,l.dEn)}`} onClick={()=>onSet(r.key,'level',l.id)}>{atpBars(l.bars)}{atpAb(l)}</button>)}</div></span>
              {(sel===r.key||j.note)&&<input className="atp-jb-note" value={j.note||''} onChange={e=>onNote(r.key,e.target.value)}
                onClick={e=>e.stopPropagation()}
                placeholder={L('Not — test sonucu, ağrı, gözlem…','Note — test result, pain, observation…')} aria-label={atpT('Note')}/>}
            </div>);})}
        </div>
      </div>
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
    if(cur[field]===v)delete cur[field];else cur[field]=v;
    const nx={...tp.qualities};
    if(cur.priority)nx[id]=cur;else delete nx[id];
    save({qualities:nx});
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
  const jRated=ATP_JOINT_ROWS.filter(r=>(tp.joints[r.key]||{}).level);
  const jHigh=jRated.filter(r=>tp.joints[r.key].level==='high');
  const jN=id=>jRated.filter(r=>r.joint.need===id).length;
  const rated=ATP_QUALITIES.filter(it=>tp.qualities[it.id]);
  const nP=id=>rated.filter(it=>tp.qualities[it.id].priority===id).length;
  const high=rated.filter(it=>tp.qualities[it.id].priority==='high').map(it=>atpT(it.en));
  const go=id=>{const el=document.getElementById(id);if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});};
  const tiles=[
    {id:'atp-s1',c:'#0094ff',k:atpT('Athletic Profile'),v:rated.length,u:`/ ${ATP_QUALITIES.length}`,
      s:high.length?`${atpT('High')}: ${high.join(', ')}`:`${atpT('Medium')} ${nP('medium')} · ${atpT('Low')} ${nP('low')}`},
    {id:'atp-s2',c:'#ef4444',k:atpT('Constraints'),v:tp.constraints.hard.length+tp.constraints.soft.length,u:L('kısıt','total'),
      s:`${atpT('Hard')} ${tp.constraints.hard.length} · ${atpT('Soft')} ${tp.constraints.soft.length}`},
    {id:'atp-s3',c:'#22d3ee',k:atpT('Exercise Exposure'),v:exp.sessions.d28,u:L('seans / 28 gün','sessions / 28 d'),
      s:exp.last?`${L('Son seans','Last session')} ${fd(exp.last.date)}`:L('Takvimde kayıt yok','Nothing on the calendar')},
    {id:'atp-s4',c:'#2dd4bf',k:atpT('Joint by Joint'),v:jRated.length,u:`/ ${ATP_JOINT_ROWS.length}`,
      s:jHigh.length?`${atpT('High')}: ${jHigh.map(r=>(r.side?atpT(r.side)+' ':'')+atpT(r.joint.en)).join(', ')}`
        :`${atpT('Mobility')} ${jN('mobility')} · ${atpT('Stability')} ${jN('stability')}`},
  ];
  return(<div className="atp-wrap">
    <div className="atp-intro">
      <div className="atp-intro-ic">◎</div>
      <div className="atp-intro-tx">
        <div className="atp-intro-t">{atpT('Athlete Profile')}</div>
        <div className="atp-intro-d">{L('Sporcunun antrenman profilini tanımlar: atletik profil (her kalitenin önceliği), kısıtlar, egzersiz maruziyeti ve eklem ihtiyaçları (Joint by Joint). Bu bölümden egzersiz seçimi veya program oluşturma yapılmaz — bilgiler bireyselleştirme JSON\'una sporcunun profili olarak eklenir.',
          'Defines the athlete as a trainee: the athletic profile (each quality’s priority), constraints, exercise exposure and joint needs (Joint by Joint). No exercise is selected and no programme is built from this section — it goes into the individualization JSON as the athlete’s profile.')}</div>
      </div>
      {tp.updated&&<div className="atp-intro-up">{L('Son güncelleme','Last updated')}<b>{fd(tp.updated)}</b></div>}
    </div>
    <div className="atp-glance">{tiles.map(t=>
      <button key={t.id} className="atp-gl" style={{'--gc':t.c}} onClick={()=>go(t.id)}>
        <div className="k">{t.k}</div>
        <div className="v">{t.v}<small>{t.u}</small></div>
        <div className="s" title={t.s}>{t.s}</div>
      </button>)}</div>
    <AtpProfile q={tp.qualities} onSet={setQ}/>
    <AtpConstraints con={tp.constraints} onChange={c=>save({constraints:c})}/>
    <AtpExposure exp={exp} refDate={refDate} setRefDate={setRefDate}/>
    <AtpJoints joints={tp.joints} onSet={setJ} onNote={(key,v)=>setJ(key,'note',v)}/>
  </div>);
}
