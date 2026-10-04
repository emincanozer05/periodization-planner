/* =========================================================
   TRAINING BLOCK BAR · TEAM PRACTICE / MATCH / TEST WINDOWS
   ========================================================= */
/* The row of buttons a day is planned from. Each button adds one training block, and
   hovering it (or tabbing onto it) opens a small card saying what that block covers, in
   the language the app is showing. The card is portalled to <body> with fixed
   coordinates, so the scrolling drawer it sits in can never clip it. */
function BlockAddBar({onAdd,variant}){
  const[tip,setTip]=useState(null);
  const show=(p,e)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const below=r.bottom+130<window.innerHeight;
    setTip({p,x:Math.max(8,Math.min(r.left,window.innerWidth-300)),y:below?r.bottom+8:r.top-8,below});
  };
  const hide=()=>setTip(null);
  const lbl=L('Antrenman bloğu ekle','Add training block');
  const btns=SPRESETS.map(p=><button key={p.name} type="button"
    onClick={()=>{hide();onAdd(spData(p));}}
    onMouseEnter={e=>show(p,e)} onMouseLeave={hide} onFocus={e=>show(p,e)} onBlur={hide}
    aria-label={`${spLabel(p)} — ${spDesc(p)}`}>+ {spLabel(p)}</button>);
  const card=tip&&ReactDOM.createPortal(<div className={'qa-tip'+(tip.below?'':' up')} role="tooltip"
    style={{left:tip.x,top:tip.y}}>
    <b>{spLabel(tip.p)}</b>
    <p>{spDesc(tip.p)}</p>
  </div>,document.body);
  if(variant==='planner')return(<div className="pbar">
    <strong style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>{lbl}</strong>
    {btns}{card}
  </div>);
  return(<div className="dw-quickadd"><span className="qa-lbl">{lbl}</span>{btns}{card}</div>);
}

/* The kind's name, and the short line a week card shows for it in place of the goals —
   who the match is against and how it ended, how many tests the day held. */
const sesKindName=k=>k==='tp'?L('Takım Antrenmanı','Team Practice'):k==='match'?L('Müsabaka','Competition'):k==='test'?L('Test','Test'):'';
const sesKindLine=s=>{
  const k=sesKind(s);
  if(k==='match'){
    const m=(s&&s.match)||{};const opp=String(m.opponent||'').trim();
    const has=v=>v!==''&&v!=null;
    const sc=has(m.scoreFor)&&has(m.scoreAgainst)?` · ${m.scoreFor}–${m.scoreAgainst}`:'';
    return opp?`${m.venue==='away'?'@':'vs'} ${opp}${sc}`:'';
  }
  if(k==='test'){const n=((s&&s.tests)||[]).length+(String((s&&s.testsOther)||'').trim()?1:0);return n?L(`${n} test`,`${n} tests`):'';}
  return'';
};
/* Average heart-rate zone of a team practice — typed by hand, as the five-zone scale
   (% of HRmax) every HR monitor reports in. */
const HR_ZONES=[
  {v:'1',c:'#94a3b8',tr:'Z1 · %50–60 · Çok hafif',en:'Z1 · 50–60% · Very light'},
  {v:'2',c:'#38bdf8',tr:'Z2 · %60–70 · Hafif',en:'Z2 · 60–70% · Light'},
  {v:'3',c:'#22c55e',tr:'Z3 · %70–80 · Orta',en:'Z3 · 70–80% · Moderate'},
  {v:'4',c:'#f97316',tr:'Z4 · %80–90 · Zor',en:'Z4 · 80–90% · Hard'},
  {v:'5',c:'#ef4444',tr:'Z5 · %90–100 · Maksimal',en:'Z5 · 90–100% · Maximal'},
];
const skInit=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
const SkIcClock=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/></svg>;
const SkIcTimer=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5h4"/><path d="M12 13l2.6-2.6"/><circle cx="12" cy="14" r="7.5"/></svg>;
const SkIcGauge=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3.5 18a9 9 0 1 1 17 0"/><path d="M12 14.5 16 9.5"/></svg>;
const SkIcHeart=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>;
const SkIcPin=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>;
const SkIcCal=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;

/* Players as a grid of chips — who took part in a practice, who made the match squad. */
function SkPlayerPick({athletes,selected,onChange,max,readOnly}){
  const sel=new Set(selected||[]);
  const n=(selected||[]).length;
  const toggle=id=>{
    if(readOnly)return;
    if(sel.has(id))onChange((selected||[]).filter(x=>x!==id));
    else{if(max&&n>=max)return;onChange([...(selected||[]),id]);}
  };
  if(!athletes||!athletes.length)return<div className="dw-empty">{L('Kadroda sporcu yok — Sporcular sekmesinden ekle.','No athletes on the roster — add them in the Athletes tab.')}</div>;
  return(<div className="sk-pick">
    <div className="sk-pick-h">
      <span className={'sk-pick-n'+(max&&n>=max?' full':'')}>{n}{max?` / ${max}`:` / ${athletes.length}`}</span>
      {!readOnly&&<>
        {!max&&<button type="button" className="btn xs sec" onClick={()=>onChange(athletes.map(a=>a.id))}>{L('Tümünü seç','Select all')}</button>}
        <button type="button" className="btn xs sec" onClick={()=>onChange([])}>{L('Temizle','Clear')}</button>
      </>}
    </div>
    <div className="ath-pick-grid">
      {athletes.map(a=>{const on=sel.has(a.id);const off=!on&&max&&n>=max;
        return(<label key={a.id} className={`ath-chip${on?' on':''}${off?' off':''}`}>
          <input type="checkbox" checked={on} disabled={readOnly||off} onChange={()=>toggle(a.id)}/>
          <span>{a.name}</span>{a.number?<span className="num">#{a.number}</span>:null}
        </label>);})}
    </div>
  </div>);
}

/* Each player's RPE and the sRPE (AU) it makes. The RPE is the one the player submitted
   on the day's check-in form when there is one — marked "form" — and the coach can type
   over it. `rpe` is supplied by the calendar, which owns the athletes' logs. With
   `minutes` (a match), the sRPE is RPE × the minutes that player was on the floor. */
function SkRpeTable({list,rpe,minutes,onMinutes,readOnly}){
  if(!list.length)return<div className="dw-empty">{L('Listede oyuncu yok.','No players listed.')}</div>;
  const withMin=!!minutes;
  return(<div className="sk-tbl">
    <div className="sk-tr sk-th">
      <span>{L('Oyuncu','Player')}</span>
      {withMin&&<span>{L('Süre (dk)','Minutes')}</span>}
      <span>RPE</span><span>sRPE (AU)</span>
    </div>
    {list.map(a=>{
      const v=rpe?rpe.get(a):{rpe:'',load:'',fromAthlete:false};
      const min=withMin?minutes[a.id]:'';
      const nMin=Number(min)||0;
      const hasR=v.rpe!==''&&v.rpe!=null&&!isNaN(Number(v.rpe));
      const load=(v.fromAthlete&&v.load!==''&&v.load!=null)?v.load
        :(withMin&&hasR&&nMin)?Math.round(Number(v.rpe)*nMin):v.load;
      return(<div key={a.id} className={'sk-tr'+(v.fromAthlete?' own':'')}>
        <span className="sk-pl">
          <span className="dw-rpe-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:skInit(a.name)}</span>
          <span className="dw-rpe-nm">{a.name}</span>
          {v.fromAthlete&&<span className="dw-rpe-src" title={L('Bu değer sporcunun check-in formundan geldi — üzerine yazabilirsin.','This value came from the athlete\'s check-in form — you can overwrite it.')}>{L('form','form')}</span>}
        </span>
        {withMin&&<span>{readOnly?(min||'—'):<input type="number" min="0" max="60" className="dw-rpe-in" placeholder="dk" value={min??''}
          onChange={e=>onMinutes(a.id,e.target.value)}/>}</span>}
        <span>{(readOnly||!rpe||!rpe.set)?(hasR?v.rpe:'—'):<input type="number" min="0" max="10" step="0.5" className="dw-rpe-in" placeholder="RPE"
          value={v.rpe} onChange={e=>rpe.set(a.id,e.target.value,withMin&&nMin?nMin:undefined)}/>}</span>
        <span className="sk-au">{load!==''&&load!=null?load:'—'}</span>
      </div>);
    })}
  </div>);
}

function SkSec({title,sub,children}){
  return(<section className="sk-sec">
    <div className="sk-sec-h"><span>{title}</span>{sub&&<em>{sub}</em>}</div>
    {children}
  </section>);
}

/* THE WINDOW A NON-S&C SESSION OPENS IN. A team practice, a match and a test day are not
   written as exercises — that is the S&C coach's work, and these three are not — so
   instead of blocks each gets the handful of fields that describe it:
     tp     who took part, time, duration, content, target intensity, average HR zone,
            each player's RPE / sRPE, notes
     match  opponent, the score, location, time, home or away, the 12-man squad, who
            was left out, each player's minutes and RPE / sRPE, notes
     test   the day, the time and which tests were taken
   `onPatch` merges into the session. `roster` is the team's athletes (absent on a
   personal calendar); `rpe` reads and writes their ratings (absent in the day editor,
   where the ratings are not collected). */
function SesKindForm({session,dateKey,onPatch,readOnly,roster,rpe,teamName}){
  const kind=sesKind(session);
  const s=session||{};
  const u=onPatch;
  const team=Array.isArray(roster);
  const fromTeam=!!s.sourceId;
  const tile=(k,ac,ic,body)=><div className="dw-dm white" style={{'--dm-ac':ac}}>
    <div className="dm-top"><span className="k">{k}</span><span className="dm-ic">{ic}</span></div>{body}</div>;
  const timeTile=tile(L('Saat','Time'),'#22d3ee',<SkIcClock/>,readOnly
    ?<div className="v">{s.time||'—'}</div>
    :<input type="time" className="dw-inp" value={s.time||''} onChange={e=>u({time:e.target.value})}/>);
  const setDur=raw0=>{
    const raw=String(raw0).replace(/^0+(?=\d)/,'');const d=raw===''?'':Math.max(0,Number(raw));
    const patch={duration:d};
    if(!s.auManual&&s.sRPE!==''&&s.sRPE!=null)patch.au=Math.round(Number(s.sRPE)*(Number(d)||0));
    u(patch);
  };
  const durTile=tile(L('Süre','Duration'),'#a78bfa',<SkIcTimer/>,readOnly
    ?<div className="v">{Number(s.duration)||0}<span className="dw-unit"> {L('dk','min')}</span></div>
    :<div className="dw-inrow"><input type="number" min="0" className="dw-inp" style={{width:'2.6em'}} value={s.duration??''} onChange={e=>setDur(e.target.value)}/><span className="dw-unit">{L('dk','min')}</span></div>);
  const notes=<SkSec title={L('Notlar','Notes')}>
    {readOnly?<div className="plan-note-view">{s.planNote||'—'}</div>
      :<LiveTextarea className="sk-ta" value={s.planNote||''} onChange={v=>u({planNote:v})} placeholder={L('Notlar…','Notes…')}/>}
  </SkSec>;

  if(kind==='tp'){
    const rT=sesRpeTarget(s);const z=rpeZone(rT);
    const hz=HR_ZONES.find(h=>h.v===String(s.hrZone||''));
    const parts=team?((s.athletes||[]).map(id=>roster.find(a=>a.id===id)).filter(Boolean)):[];
    const rpeList=parts.length?parts:(roster||[]);
    return(<div className="sk">
      <div className="dw-meta">
        {timeTile}{durTile}
        {tile(L('Hedef Yoğunluk','Target Intensity'),z.c,<SkIcGauge/>,readOnly
          ?<div className="dw-inrow"><span className="v" style={{marginTop:0}}>{rT}</span><span className="dw-unit">/10 · {L(z.tr,z.en)}</span></div>
          :<div className="dw-inrow"><select className="dw-inp dw-sel" style={{width:'2.4em'}} value={rT} onChange={e=>u({rpeTarget:Number(e.target.value)})}
              title={L('Hedeflenen RPE (10 üzerinden)','Target RPE (out of 10)')}>
              {[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v} value={v}>{v}</option>)}
            </select><span className="dw-unit">/10 · {L(z.tr,z.en)}</span></div>)}
        {tile(L('Ort. HR Zone','Avg HR Zone'),hz?hz.c:'#f43f5e',<SkIcHeart/>,readOnly
          ?<div className="v sk-hz">{hz?L(hz.tr,hz.en):'—'}</div>
          :<select className="dw-inp dw-sel sk-hz-sel" value={String(s.hrZone||'')} onChange={e=>u({hrZone:e.target.value})}
              title={L('Antrenmanın ortalama kalp atım bölgesi — elle girilir','The practice\'s average heart-rate zone — entered by hand')}>
              <option value="">—</option>
              {HR_ZONES.map(h=><option key={h.v} value={h.v}>{L(h.tr,h.en)}</option>)}
            </select>)}
      </div>
      {team&&!fromTeam&&<SkSec title={L('Katılan Oyuncular','Participants')}
        sub={L('Seçilenlerin kişisel takvimine eklenir','Added to the chosen players\' own calendars')}>
        <SkPlayerPick athletes={roster} selected={s.athletes||[]} onChange={ids=>u({athletes:ids})} readOnly={readOnly}/>
      </SkSec>}
      <SkSec title={L('İçerik','Content')}>
        {readOnly?<div className="plan-note-view">{s.content||'—'}</div>
          :<LiveTextarea className="sk-ta" value={s.content||''} onChange={v=>u({content:v})}
            placeholder={L('Antrenmanın içeriği — hücum setleri, savunma, 5v5…','What the practice covers — offensive sets, defence, 5v5…')}/>}
      </SkSec>
      {team&&rpe&&<SkSec title={L('RPE & sRPE','RPE & sRPE')}
        sub={L('Sporcuların check-in formundan otomatik dolar','Filled in automatically from the athletes\' check-in form')}>
        <SkRpeTable list={rpeList} rpe={rpe} readOnly={readOnly}/>
      </SkSec>}
      {notes}
    </div>);
  }

  if(kind==='match'){
    const m=s.match||{};
    const um=x=>u({match:{...m,...x}});
    const res=compResult({scoreFor:m.scoreFor,scoreAgainst:m.scoreAgainst});
    const squad=team?((s.athletes||[]).map(id=>roster.find(a=>a.id===id)).filter(Boolean)):[];
    const out=team&&squad.length?roster.filter(a=>!(s.athletes||[]).includes(a.id)):[];
    const minutes=m.minutes||{};
    const outNotes=m.outNotes||{};
    const scoreIn=(k,ph)=>readOnly?<span className="sk-score-n">{m[k]!==''&&m[k]!=null?m[k]:'–'}</span>
      :<input type="number" min="0" inputMode="numeric" className="sk-score-n" placeholder={ph} value={m[k]??''}
        onChange={e=>um({[k]:e.target.value})}/>;
    const home=m.venue!=='away';
    return(<div className="sk">
      <div className={'sk-score'+(res?' '+res.k:'')}>
        <div className="sk-score-side">
          <span className="sk-score-tm">{teamName||L('Biz','Us')}</span>
          {scoreIn('scoreFor','0')}
        </div>
        <div className="sk-score-mid">
          {res?<span className={'sk-res '+res.k} title={res.title}>{res.title}</span>:<span className="sk-res">{L('Sonuç','Result')}</span>}
          <span className="sk-score-dash">–</span>
        </div>
        <div className="sk-score-side">
          {readOnly?<span className="sk-score-tm">{m.opponent||L('Rakip','Opponent')}</span>
            :<LiveInput className="sk-score-opp" value={m.opponent||''} onChange={v=>um({opponent:v})} placeholder={L('Rakip takım','Opponent')}/>}
          {scoreIn('scoreAgainst','0')}
        </div>
      </div>
      <div className="dw-meta">
        {timeTile}
        {tile(L('Lokasyon','Location'),'#f59e0b',<SkIcPin/>,readOnly
          ?<div className="v sk-hz">{m.location||'—'}</div>
          :<LiveInput className="dw-inp sk-txt" value={m.location||''} onChange={v=>um({location:v})} placeholder={L('Salon / şehir','Venue / city')}/>)}
        {tile(L('Ev / Deplasman','Home / Away'),home?'#22c55e':'#3b82f6',<SkIcPin/>,
          <div className="sk-seg">
            <button type="button" className={home?'on':''} disabled={readOnly} onClick={()=>um({venue:'home'})}>{L('Ev sahibi','Home')}</button>
            <button type="button" className={!home?'on':''} disabled={readOnly} onClick={()=>um({venue:'away'})}>{L('Deplasman','Away')}</button>
          </div>)}
        {durTile}
      </div>
      {team&&!fromTeam&&<SkSec title={L('İlk 12','Match Squad (12)')}
        sub={L('Maç kadrosu — seçilenlerin kişisel takvimine eklenir','The game-day twelve — added to their own calendars')}>
        <SkPlayerPick athletes={roster} selected={s.athletes||[]} onChange={ids=>u({athletes:ids})} max={12} readOnly={readOnly}/>
      </SkSec>}
      {team&&!fromTeam&&<SkSec title={L('Kadro Dışı','Left Out')}
        sub={squad.length?L(`${out.length} oyuncu`,`${out.length} players`):L('Önce ilk 12\'yi seç','Pick the squad first')}>
        {squad.length===0?<div className="dw-empty">{L('İlk 12 seçilince kadro dışı kalanlar burada listelenir.','Once the twelve are picked, everyone left out is listed here.')}</div>
          :out.length===0?<div className="dw-empty">{L('Kadro dışı oyuncu yok.','Nobody left out.')}</div>
          :<div className="sk-out">{out.map(a=><div key={a.id} className="sk-out-row">
              <span className="dw-rpe-av">{a.photo?<img src={mediaSrc(a.photo)} alt=""/>:skInit(a.name)}</span>
              <span className="dw-rpe-nm">{a.name}</span>
              {readOnly?<span className="sk-out-why">{outNotes[a.id]||''}</span>
                :<LiveInput className="sk-out-in" value={outNotes[a.id]||''} placeholder={L('Sebep (sakat, teknik karar…)','Reason (injured, coach\'s decision…)')}
                  onChange={v=>um({outNotes:{...outNotes,[a.id]:v}})}/>}
            </div>)}</div>}
      </SkSec>}
      {team&&<SkSec title={L('Süre · RPE · sRPE','Minutes · RPE · sRPE')}
        sub={L('RPE ve sRPE sporcuların check-in formundan otomatik dolar','RPE and sRPE fill in automatically from the athletes\' check-in form')}>
        <SkRpeTable list={squad.length?squad:(roster||[])} rpe={rpe} minutes={minutes} readOnly={readOnly}
          onMinutes={(id,v)=>um({minutes:{...minutes,[id]:v===''?'':Math.max(0,Number(v))}})}/>
      </SkSec>}
      {notes}
    </div>);
  }

  if(kind==='test'){
    const picked=Array.isArray(s.tests)?s.tests:[];
    const set=new Set(picked);
    const nm=c=>L(TRYOUT_TR[c.id]||c.name,c.name);
    const toggle=id=>u({tests:set.has(id)?picked.filter(x=>x!==id):[...picked,id]});
    const list=TEST_CATALOG.filter(c=>!c.retired||set.has(c.id));
    return(<div className="sk">
      <div className="dw-meta">
        {tile(L('Test Günü','Test Day'),'#94a3b8',<SkIcCal/>,<div className="v sk-hz">{dateKey?fdLong(dateKey):'—'}</div>)}
        {timeTile}
      </div>
      <SkSec title={L('Alınan Testler','Tests Taken')} sub={L(`${picked.length} test`,`${picked.length} tests`)}>
        <div className="sk-tests">
          {list.filter(c=>!readOnly||set.has(c.id)).map(c=><button key={c.id} type="button" disabled={readOnly}
            className={'sk-test'+(set.has(c.id)?' on':'')} onClick={()=>toggle(c.id)}>{set.has(c.id)?'✓ ':''}{nm(c)}</button>)}
        </div>
        {readOnly?(s.testsOther?<div className="plan-note-view" style={{marginTop:10}}>{s.testsOther}</div>:null)
          :<LiveInput className="dw-inp sk-txt sk-other" value={s.testsOther||''} onChange={v=>u({testsOther:v})}
            placeholder={L('Diğer testler (virgülle ayır)','Other tests (comma-separated)')}/>}
      </SkSec>
    </div>);
  }
  return null;
}

/* The card a team practice, match or test day gets in the day editor — the same fields
   as its window, under the editor's own header (number, title, moves, remove), and no
   block / exercise list under them. */
function SesKindCard({session,index,total,onUpdate,onRemove,onMove,athletes,dateKey,teamName}){
  const u=upd=>onUpdate({...session,...upd});
  const fromTeam=!!session.sourceId;
  const kind=sesKind(session);
  const tag=sesKindName(kind);
  const del=()=>{if(confirm(fromTeam?L('Bu takım-senkronlu seans yalnızca bu sporcudan silinsin mi? (Takım planı değişmez)','Delete this team-synced session from this athlete only? (The team plan is unchanged)'):L('Seans silinsin mi? Bu, atandığı tüm sporculardan da kaldırılacak.','Delete session? This will also remove it from any athletes it was assigned to.')))onRemove();};
  const tint=blkTint(session.color||'');
  return(<div className="sess-ed"><div className="sbody">
    <div className={'iv-block cal-block sk-card'+tint.cls} style={tint.style}>
      <div className="iv-block-hd">
        <span className="blk-sn" title={L('Seans numarası','Session number')}>{index+1}</span>
        <LiveInput className="iv-block-nm" value={session.name||''} placeholder={tag}
          title={L('Seans adı','Session name')} onChange={v=>u({name:v})}/>
        <span className="sk-kind">{tag}</span>
        <span className="iv-blockacts">
          <CardColorPick value={session.color||''} onPick={c=>u({color:c})}/>
          {total>1&&<>
            <button type="button" className="btn xs sec" onClick={()=>onMove(-1)} disabled={index===0} title={L('Seansı yukarı taşı','Move the session up')}>↑</button>
            <button type="button" className="btn xs sec" onClick={()=>onMove(1)} disabled={index===total-1} title={L('Seansı aşağı taşı','Move the session down')}>↓</button></>}
          <button type="button" className="btn xs sec iv-rmb" onClick={del} title={L('Bu seansı sil','Delete this session')}>✕ {L('Kaldır','Remove')}</button>
        </span>
      </div>
      <div style={{padding:'4px 2px 2px'}}>
        <SesKindForm session={session} dateKey={dateKey} onPatch={u} roster={athletes} teamName={teamName}/>
      </div>
    </div>
  </div></div>);
}
