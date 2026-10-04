/* =========================================================
   SEASON PLAN (with customizable periods)
   ========================================================= */
/* ---- The three steps a week is planned in ----------------------------------
   1 Training Phase — where the week sits in the block; 2 Primary Emphasis — the quality
   it builds; 3 Microcycle Objective — what the week is for. Each option carries its own
   explanation in both languages, shown on hover. */
const WLT_STEPS=[
  {key:'phase',n:1,label:['Antrenman Fazı','Training Phase'],opts:[
    {id:'base',c:'#38bdf8',l:['Temel','Base'],d:['Genel fiziksel kapasitenin, aerobik kapasitenin, work capacity\'nin ve temel hareket/kuvvet altyapısının oluşturulduğu dönem.',
      'The period in which general physical capacity, aerobic capacity, work capacity and the basic movement/strength foundation are built.']},
    {id:'accumulation',c:'#3b82f6',l:['Birikim','Accumulation'],d:['Antrenman hacminin ve temel fiziksel kapasitelerin biriktirildiği dönem. Kuvvet, hipertrofi, aerobik kapasite ve work capacity geliştirilebilir.',
      'The period in which training volume and basic physical capacities are accumulated. Strength, hypertrophy, aerobic capacity and work capacity can be developed.']},
    {id:'intensification',c:'#f59e0b',l:['Yoğunlaştırma','Intensification'],d:['Hacmin görece azaltılıp yoğunluğun artırıldığı dönem. Max strength, force production ve yüksek kaliteli power çalışmaları daha fazla önem kazanır.',
      'The period in which volume is relatively reduced and intensity is raised. Max strength, force production and high-quality power work gain importance.']},
    {id:'realization',c:'#ef4444',l:['Gerçekleştirme','Realization'],d:['Önceki dönemlerde geliştirilen kapasitelerin performansa dönüştürüldüğü dönem. Speed, power, explosiveness ve özgüllük artar.',
      'The period in which the capacities built earlier are turned into performance. Speed, power, explosiveness and specificity increase.']},
    {id:'transition',c:'#2dd4a7',l:['Geçiş','Transition'],d:['Bir sezon veya antrenman döneminden diğerine geçiş dönemi. Toparlanma, düşük yük ve yeni döneme hazırlık ön plandadır.',
      'The bridge from one season or training block to the next. Recovery, low load and preparing for the next block come first.']},
  ]},
  {key:'emphasis',n:2,label:['Birincil Vurgu','Primary Emphasis'],opts:[
    {id:'aerobic',c:'#22c55e',l:['Aerobik / İş Kapasitesi','Aerobic / Work Capacity'],d:['Aerobik kapasiteyi, kondisyonu ve sporcunun antrenman yükünü tolere etme kapasitesini geliştirmeye odaklanır.',
      'Develops aerobic capacity, conditioning and the athlete\'s capacity to tolerate training load.']},
    {id:'hypertrophy',c:'#a78bfa',l:['Hipertrofi / Yapısal Kapasite','Hypertrophy / Structural Capacity'],d:['Kas kütlesi, kas kesit alanı ve sporcunun yapısal kapasitesini geliştirmeye odaklanır.',
      'Develops muscle mass, muscle cross-sectional area and the athlete\'s structural capacity.']},
    {id:'maxStrength',c:'#f43f5e',l:['Maksimal Kuvvet','Max Strength'],d:['Yüksek kuvvet üretme kapasitesini geliştirmeye odaklanır.',
      'Develops the capacity to produce high force.']},
    {id:'power',c:'#f59e0b',l:['Güç / Patlayıcı Kuvvet','Power / Explosive Strength'],d:['Kuvveti yüksek hızda ve kısa sürede üretme kapasitesine odaklanır. RFD, strength-speed ve speed-strength bu başlık altında değerlendirilebilir.',
      'Develops the capacity to produce force at high velocity and in a short time. RFD, strength-speed and speed-strength sit under this heading.']},
    {id:'speed',c:'#38bdf8',l:['Sürat / İvmelenme','Speed / Acceleration'],d:['İlk hızlanma ve maksimal hız dahil olmak üzere sprint kapasitesini geliştirmeye odaklanır.',
      'Develops sprint capacity, including initial acceleration and maximal velocity.']},
  ]},
  {key:'objective',n:3,label:['Mikrosiklus Hedefi','Microcycle Objective'],opts:[
    {id:'preparation',c:'#94a3b8',v:60,i:60,l:['Hazırlık','Preparation'],d:['Yeni bir yüklenme dönemine veya daha yüksek antrenman stresine hazırlık sağlar.',
      'Prepares for a new loading block or for higher training stress.']},
    {id:'loading',c:'#3b82f6',v:80,i:70,l:['Yüklenme','Loading'],d:['Planlı gelişimsel yüklenmenin gerçekleştirildiği haftadır.',
      'The week in which the planned developmental loading is carried out.']},
    {id:'overreaching',c:'#ef4444',v:95,i:80,l:['Aşırı Yüklenme','Overreaching'],d:['Kısa süreli ve planlı şekilde normalden daha yüksek antrenman stresi oluşturulan haftadır.',
      'A week of short, planned training stress above the usual.']},
    {id:'deload',c:'#2dd4a7',v:45,i:55,l:['Yük Azaltma','Deload'],d:['Biriken yorgunluğu azaltmak ve toparlanmayı desteklemek amacıyla antrenman yükünün düşürüldüğü haftadır.',
      'A week in which training load is lowered to shed accumulated fatigue and support recovery.']},
    {id:'peaking',c:'#facc15',v:50,i:85,l:['Zirveleme','Peaking'],d:['Belirli bir müsabaka veya test tarihinde performansı mümkün olduğunca üst seviyeye çıkarmaya yönelik haftadır.',
      'A week aimed at bringing performance as high as possible for a specific competition or test date.']},
    {id:'competition',c:'#f472b6',v:50,i:80,l:['Müsabaka','Competition'],d:['Müsabaka veya yoğun müsabaka dönemine göre yapılandırılan haftadır.',
      'A week structured around a competition or a congested competition period.']},
  ]},
];
const wltOpt=(key,id)=>{const st=WLT_STEPS.find(x=>x.key===key);return st?st.opts.find(o=>o.id===id)||null:null;};
/* What a week reads as before the coach has chosen anything: derived from the focus the
   periodization model gave it, its period, a taper and the games that fall in it. */
const WLT_FOCUS_PHASE={'Base + aerobic':'base','General':'base','Accumulation':'accumulation','Hi-volume wave':'accumulation',
  'Transmutation':'intensification','Sport-specific':'intensification','Hi-intensity wave':'intensification','Max-effort':'intensification',
  'Realization':'realization','Maintain & peak':'realization','Dynamic-effort':'realization','Peak':'realization',
  'Active recovery':'transition','Deload':'transition',
  'Aerobic emphasis':'base','Intensity-first':'intensification','Strength emphasis':'intensification',
  'Power emphasis':'realization','Speed emphasis':'realization'};
const WLT_PERIOD_PHASE={gp:'base',sp:'accumulation',comp:'realization',trans:'transition'};
const WLT_PHASE_EMPH={base:'aerobic',accumulation:'hypertrophy',intensification:'maxStrength',realization:'power',transition:'aerobic'};
function wltDefaults(w,firstOfPeriod,games){
  const phase=w.taper?'realization':(WLT_FOCUS_PHASE[w.focus]||WLT_PERIOD_PHASE[w.period]||'base');
  const emphasis=WLT_PHASE_EMPH[phase]||'aerobic';
  const objective=games>0?'competition':w.taper?'peaking':(w.period==='trans'||w.focus==='Deload'||w.focus==='Active recovery')?'deload'
    :firstOfPeriod?'preparation':'loading';
  return{phase,emphasis,objective};
}
/* One step of a week card: a coloured button showing the choice, opening a list of the
   options. The explanation of whatever is under the pointer shows in a small box. */
function WltStep({step,value,onChange,edited}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  useDDOutside([ref],open,()=>setOpen(false));
  const cur=step.opts.find(o=>o.id===value)||step.opts[0];
  return(<div className="wlt3-step" ref={ref}>
    <div className="wlt3-sl"><i>{step.n}</i>{L(step.label[0],step.label[1])}{edited?<u title={L('Elle seçildi','Chosen by hand')}/>:null}</div>
    <button type="button" className={'wlt3-btn'+(open?' open':'')} style={{'--oc':cur.c}}
      data-tip={L(cur.d[0],cur.d[1])} onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
      <span className="wlt3-dot"/><span className="wlt3-v">{L(cur.l[0],cur.l[1])}</span><span className="wlt3-car">▾</span>
    </button>
    {open&&<div className="wlt3-menu" role="listbox">
      {step.opts.map(o=><button key={o.id} type="button" role="option" aria-selected={o.id===value}
        className={'wlt3-opt'+(o.id===value?' on':'')} style={{'--oc':o.c}} data-tip={L(o.d[0],o.d[1])}
        onClick={()=>{onChange(o);setOpen(false);}}>
        <span className="wlt3-dot"/>{L(o.l[0],o.l[1])}{o.id===value?<b>✓</b>:null}</button>)}
    </div>}
  </div>);
}
/* ---- Weekly Load Targets ---------------------------------------------------
   The season's weeks, grouped under the period they belong to. Each week says what it
   is for (the focus), what it asks for (volume and intensity — now set directly with a
   slider, or left to follow the focus), and what the team actually did in it (the load
   the calendar holds for those seven days). A strip across the top draws the whole
   season as one row of bars so the shape of the plan reads before any card does; a
   click on a bar jumps to its week. */
function WeeklyLoadTargets({team,updateTeam,weeks,periods,setWeekFocus}){
  const ov=team.weekOverrides||{};
  const days=team.days||{};
  const comps=(team.setup&&team.setup.competitions)||[];
  const todayK=fmt(today);
  const[filter,setFilter]=useState('all');   // all | current | future
  const refs=useRef({});
  const setWeek=(k,patch)=>updateTeam(team.id,{weekOverrides:{...ov,[k]:{...(ov[k]||{}),...patch}}});
  const resetWeek=k=>{const n={...ov};delete n[k];updateTeam(team.id,{weekOverrides:n});};
  const resetAll=()=>{if(confirm(L('Bütün haftalar periyotlama modelinin önerisine dönsün mü? Elle seçilen basamaklar, hacim ve şiddet silinir.',
    'Return every week to the periodization model\'s default? Hand-set steps, volume and intensity are cleared.')))updateTeam(team.id,{weekOverrides:{}});};
  const rows=useMemo(()=>weeks.map((w,i)=>{
    const end=fmt(addD(parseD(w.week),6));
    let au=0,ses=0;
    for(let d=0;d<7;d++){const dd=days[fmt(addD(parseD(w.week),d))];au+=dLoad(dd);ses+=((dd&&dd.sessions)||[]).length;}
    const games=comps.filter(c=>c&&c.date&&c.date>=w.week&&c.date<=end);
    const first=i===0||weeks[i-1].period!==w.period;
    const def=wltDefaults(w,first,games.length);
    const o=ov[w.week]||{};
    const steps={phase:wltOpt('phase',o.phase)?o.phase:def.phase,emphasis:wltOpt('emphasis',o.emphasis)?o.emphasis:def.emphasis,
      objective:wltOpt('objective',o.objective)?o.objective:def.objective};
    return{...w,idx:i,end,au:Math.round(au),ses,games,steps,stepSet:{phase:!!o.phase,emphasis:!!o.emphasis,objective:!!o.objective},index:Math.round((Number(w.volume)||0)*(Number(w.intensity)||0)/100),
      current:todayK>=w.week&&todayK<=end,past:end<todayK,edited:!!ov[w.week]};
  }),[weeks,days,comps,ov,todayK]);
  const maxIdx=Math.max(1,...rows.map(r=>r.index));
  const maxAu=Math.max(1,...rows.map(r=>r.au));
  /* "This period" is the period today falls in — or, before the season, the first one to come. */
  const curPeriod=((rows.find(x=>x.current)||rows.find(x=>!x.past)||{}).period)||null;
  const shown=rows.filter(r=>filter==='all'||(filter==='future'?!r.past:r.period===curPeriod));
  const groups=[];
  shown.forEach(r=>{const g=groups[groups.length-1];if(g&&g.period===r.period)g.rows.push(r);else groups.push({period:r.period,rows:[r]});});
  const pName=id=>{const p=(periods||[]).find(x=>x.id===id);return exLabel((p&&p.name)||PHASE_NAME[id]||id);};
  const edited=rows.filter(r=>r.edited).length;
  const jump=k=>{const el=refs.current[k];if(el)el.scrollIntoView({behavior:'smooth',block:'center'});};
  return(<div className="panel wlt2">
    <div className="wlt2-hd">
      <div>
        <h2 style={{margin:0}}>{L('Haftalık Yük Hedefleri','Weekly Load Targets')}</h2>
        <div className="help" style={{marginTop:6}}>{L('Her hafta üç basamakta planlanır: antrenman fazı, birincil vurgu ve mikrosiklus hedefi. Bir seçeneğin üzerine gelince açıklaması görünür. Mikrosiklus hedefi hacim ve şiddeti ayarlar — kaydırıcılarla ince ayar yapabilirsin. Her kart o haftanın takvimde gerçekleşen yükünü de gösterir.',
          'Each week is planned in three steps: training phase, primary emphasis and microcycle objective. Hover an option to read what it means. The microcycle objective sets volume and intensity — fine-tune them with the sliders. Each card also shows the load the calendar actually holds for that week.')}</div>
      </div>
      <div className="wlt2-tools">
        <div className="wlt2-seg">
          {[['all',L('Tümü','All')],['current',L('Bu dönem','This period')],['future',L('Kalan','Remaining')]].map(([k,l])=>
            <button key={k} type="button" className={filter===k?'on':''} onClick={()=>setFilter(k)}>{l}</button>)}
        </div>
        {edited>0&&<button type="button" className="btn xs sec" onClick={resetAll} title={L('Elle yapılan bütün hafta ayarlarını temizle','Clear every hand-set week')}>↺ {L(`Sıfırla (${edited})`,`Reset (${edited})`)}</button>}
      </div>
    </div>
    {/* The season in one row: bar height = volume × intensity, colour = period. */}
    <div className="wlt2-strip" role="list">
      {rows.map(r=><button key={r.week} type="button" role="listitem" className={'wlt2-sb'+(r.current?' cur':'')+(r.past?' past':'')}
        style={{'--pc':PHASE_COL[r.period]||'#64748b',height:`${Math.max(8,r.index/maxIdx*100)}%`}}
        onClick={()=>{if(filter!=='all')setFilter('all');setTimeout(()=>jump(r.week),30);}}
        title={`${L('H','W')}${r.idx+1} · ${fd(r.week)} · ${WLT_STEPS.map(st=>{const o=wltOpt(st.key,r.steps[st.key]);return o?L(o.l[0],o.l[1]):'';}).join(' / ')} · ${L('Hacim','Vol')} ${r.volume}% · ${L('Şiddet','Int')} ${r.intensity}%${r.games.length?` · ${L('maç','game')}: ${r.games.length}`:''}`}>
        {r.games.length?<i/>:null}</button>)}
    </div>
    <div className="wlt2-legend">
      {['gp','sp','comp','trans'].map(p=><span key={p}><i style={{background:PHASE_COL[p]}}/>{exLabel(PHASE_NAME[p])}</span>)}
      <span><i className="g"/>{L('Maç haftası','Game week')}</span>
      <span className="r">{L('Çubuk yüksekliği = hacim × şiddet','Bar height = volume × intensity')}</span>
    </div>
    {groups.map((g,gi)=>{const a=g.rows[0],z=g.rows[g.rows.length-1];
      const avgV=Math.round(g.rows.reduce((n,r)=>n+(Number(r.volume)||0),0)/g.rows.length);
      const avgI=Math.round(g.rows.reduce((n,r)=>n+(Number(r.intensity)||0),0)/g.rows.length);
      return(<div key={g.period+gi} className="wlt2-grp" style={{'--pc':PHASE_COL[g.period]||'#64748b'}}>
        <div className="wlt2-gh">
          <i/><b>{pName(g.period)}</b>
          <span>{fd(a.week)} – {fd(z.end)} · {L(`${g.rows.length} hafta`,`${g.rows.length} week${g.rows.length>1?'s':''}`)}</span>
          <em>{L('ort. hacim','avg vol')} {avgV}% · {L('ort. şiddet','avg int')} {avgI}%</em>
        </div>
        <div className="wlt2-grid">
          {g.rows.map(w=>{
            const vol=Math.max(0,Math.min(100,Number(w.volume)||0)),int=Math.max(0,Math.min(100,Number(w.intensity)||0));
            return(<div key={w.week} ref={el=>{refs.current[w.week]=el;}} className={'wlt2-card'+(w.current?' cur':'')+(w.past?' past':'')}>
              <div className="wlt2-top">
                <div className="wlt2-wk"><b>{L('H','W')}{w.idx+1}</b><span>{fd(w.week).slice(0,5)} – {fd(w.end).slice(0,5)}</span></div>
                <div className="wlt2-tags">
                  {w.current&&<span className="wlt2-now">{L('Bu hafta','This week')}</span>}
                  {w.taper&&<span className="wlt-taper">⚠ TAPER</span>}
                  {w.games.length>0&&<span className="wlt2-game" title={w.games.map(c=>`${fd(c.date)} · ${c.name||''}${c.opponent?` (${c.opponent})`:''}`).join('\n')}>🏀 {w.games.length}</span>}
                  {w.edited&&<button type="button" className="wlt2-rst" onClick={()=>resetWeek(w.week)} title={L('Bu haftayı modelin önerisine döndür','Return this week to the model default')}>↺</button>}
                </div>
              </div>
              <div className="wlt3-steps">
                {WLT_STEPS.map(st=><WltStep key={st.key} step={st} value={w.steps[st.key]} edited={w.stepSet[st.key]}
                  onChange={o=>{
                    const next={...w.steps,[st.key]:o.id};
                    const ph=wltOpt('phase',next.phase),ob=wltOpt('objective',next.objective);
                    /* The objective carries a load profile, so picking one sets volume and
                       intensity to match — the sliders below fine-tune it from there. */
                    setWeek(w.week,{[st.key]:o.id,focus:`${ph.l[1]} · ${ob.l[1]}`,
                      ...(st.key==='objective'&&o.v!=null?{volume:o.v,intensity:o.i}:{})});
                  }}/>)}
              </div>
              <div className="wlt2-sl vol"><span>{L('Hacim','Volume')}</span>
                <input type="range" min="0" max="100" step="5" value={vol} style={{'--v':vol+'%'}}
                  onChange={e=>setWeek(w.week,{volume:Number(e.target.value)})} aria-label={L('Hacim','Volume')}/>
                <b>{vol}%</b></div>
              <div className="wlt2-sl int"><span>{L('Şiddet','Intensity')}</span>
                <input type="range" min="0" max="100" step="5" value={int} style={{'--v':int+'%'}}
                  onChange={e=>setWeek(w.week,{intensity:Number(e.target.value)})} aria-label={L('Şiddet','Intensity')}/>
                <b>{int}%</b></div>
              <div className="wlt2-act">
                <div className="wlt2-act-l"><span>{L('Gerçekleşen','Actual')}</span>
                  <b>{w.au?`${w.au.toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-US')} AU`:'—'}</b>
                  <em>{L(`${w.ses} seans`,`${w.ses} session${w.ses!==1?'s':''}`)}</em></div>
                <div className="wlt2-act-bar"><i style={{width:`${w.au/maxAu*100}%`}}/><u style={{left:`${w.index/maxIdx*100}%`}} title={L('Hedef yük (göreli)','Target load (relative)')}/></div>
              </div>
            </div>);})}
        </div>
      </div>);})}
    {groups.length===0&&<div className="ex-empty" style={{margin:0}}>{L('Bu filtrede hafta yok.','No weeks in this filter.')}</div>}
  </div>);
}

/* ---- Periodization Model ---------------------------------------------------
   The season's five phases across the top, the eleven models below. A phase is picked
   first, then the model it runs; each phase card shows its dates and its model, so a
   hybrid season reads at a glance. Resting the pointer on a model shows its explanation
   in a small box, in the language the app is in. */
function PeriodizationModelPanel({s,periods,set}){
  const ranges=seasonPhaseRanges(s,periods);
  const tk=fmt(new Date());
  const todayPh=SEASON_PHASES.find(ph=>{const x=ranges[ph.id];return x&&tk>=x.start&&tk<=x.end;});
  const[sel,setSel]=useState(todayPh?todayPh.id:'off');
  const selPh=SEASON_PHASES.find(ph=>ph.id===sel)||SEASON_PHASES[0];
  const cur=phaseModel(s,sel);
  const pick=id=>set({phaseModels:{...(s.phaseModels||{}),[sel]:id}});
  const applyAll=()=>set({model:cur,phaseModels:{}});
  const same=SEASON_PHASES.every(ph=>phaseModel(s,ph.id)===cur);
  const rng=x=>x?`${fd(x.start).slice(0,5)} – ${fd(x.end).slice(0,5)}`:L('bu sezonda yok','not in this season');
  return(<div className="panel pm-panel"><h2>{L('Periyotlama Modeli','Periodization Model')}</h2>
    <div className="pm-sh"><b>{L('Sezon Aşamaları','Season Phases')}</b>
      <span>{L('Bir aşama seç, ardından o aşamanın modelini belirle.','Pick a phase, then choose the model it runs.')}</span></div>
    <div className="pm-phases" role="tablist">
      {SEASON_PHASES.map(ph=>{const m=modelOf(phaseModel(s,ph.id));const on=ph.id===sel;
        return(<button key={ph.id} type="button" role="tab" aria-selected={on} className={'pm-ph'+(on?' on':'')+(ranges[ph.id]?'':' none')}
          style={{'--oc':ph.c}} onClick={()=>setSel(ph.id)}>
          <span className="pm-ph-n"><i/>{phaseLabel(ph)}{todayPh&&todayPh.id===ph.id?<em>{L('BUGÜN','TODAY')}</em>:null}</span>
          <span className="pm-ph-d">{rng(ranges[ph.id])}</span>
          <span className="pm-ph-m">{modelLabel(m)}</span>
        </button>);})}
    </div>
    <div className="pm-sh"><b>{L('Periodizasyon Modelleri','Periodization Models')}</b>
      <span style={{'--oc':selPh.c}}><i className="pm-dot"/>{L(`${selPh.tr||selPh.name} için`,`for ${selPh.name}`)}</span>
      {!same&&<button type="button" className="btn sec sm" onClick={applyAll}
        title={L('Seçili modeli bütün sezon aşamalarına uygula','Use the selected model in every season phase')}>
        {L('Tüm aşamalara uygula','Apply to all phases')}</button>}</div>
    <div className="pm-grid" role="radiogroup">
      {MODELS.map(m=>{const on=m.id===cur;const used=SEASON_PHASES.filter(ph=>phaseModel(s,ph.id)===m.id);
        return(<button key={m.id} type="button" role="radio" aria-checked={on} className={'pm-m'+(on?' on':'')}
          style={{'--oc':selPh.c}} data-tip={L(m.d[0],m.d[1])} onClick={()=>pick(m.id)}>
          <span className="pm-radio"/><span className="pm-m-n">{modelLabel(m)}</span>
          {used.length>0&&<span className="pm-m-u">{used.map(ph=><i key={ph.id} style={{background:ph.c}} title={phaseLabel(ph)}/>)}</span>}
        </button>);})}
    </div>
  </div>);
}
function SeasonPlan({team,updateTeam,periods,weeks}){
  const s=team.setup;
  const total=diffD(s.seasonStart,s.seasonEnd);
  // The fixture list is a long read-only-most-of-the-time list, so it opens folded.
  const[compOpen,setCompOpen]=useState(false);
  /* Picking a week focus also writes that focus's volume/intensity profile, so the two
     numbers stay in step with the choice without the coach touching them. */
  const setWeekFocus=(k,f)=>{const w=team.weekOverrides[k]||{},fl=FOCUS_LOAD[f];
    updateTeam(team.id,{weekOverrides:{...team.weekOverrides,[k]:{...w,focus:f,...(fl?{volume:fl.v,intensity:fl.i}:{})}}});};
  /* The season runs from the first period's start to the last period's end — General
     Preparation opens it, Transition closes it. Editing a period date therefore moves the
     season window with it, so the stat row, the weeks and both charts can't drift apart
     from the dates in this table. */
  const updPeriod=(id,field,val)=>{if(!val)return;
    const cur=s.periods||autoPeriods(s);const np=cur.map(p=>p.id===id?{...p,[field]:val}:p);
    updateTeam(team.id,{setup:{...s,periods:np,seasonStart:np[0].start,seasonEnd:np[np.length-1].end}});};
  const u=(k,v)=>updateTeam(team.id,{setup:{...s,[k]:v}});
  const uc=(i,k,v)=>{const c=[...s.competitions];c[i]={...c[i],[k]:v};u('competitions',c);};
  /* Deleting a fixture. A row the calendar wrote is remembered as deleted, so the next
     resync does not bring it back while its session is still on the calendar. */
  const delComp=i=>{
    const c=s.competitions[i];if(!c)return;
    if(!confirm(L(`"${c.name||'Müsabaka'}" (${fd(c.date)}) silinsin mi?`,`Delete "${c.name||'Competition'}" (${fd(c.date)})?`)))return;
    const next=s.competitions.filter((_,j)=>j!==i);
    const hidden=Array.isArray(s.compHidden)?s.compHidden:[];
    updateTeam(team.id,{setup:{...s,competitions:next,
      ...(c.srcId?{compHidden:hidden.includes(c.srcId)?hidden:[...hidden,c.srcId]}:{})}});
  };
  const ourAbbrAuto=compAbbr(s.clubName||s.teamName)||L('BİZ','US');
  const resetPeriods=()=>{if(confirm(L('Fazlar sezon + müsabaka tarihlerinden otomatik oluşturulsun mu?','Reset periods to auto-generated from season + competition dates?')))updateTeam(team.id,{setup:{...s,periods:null}});};
  const usingCustom=!!s.periods;
  // Period long names + monthly tick labels for the macrocycle bar
  const periodLong={gp:'General',sp:'Specific Prep',comp:'Competition',trans:'Transition'};
  const monthTicks=useMemo(()=>{const a=[];if(!s.seasonStart||!s.seasonEnd)return a;
    const start=parseD(s.seasonStart),end=parseD(s.seasonEnd);
    let cur=new Date(start.getFullYear(),start.getMonth(),1);
    while(cur<=end){a.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}
    return a;},[s.seasonStart,s.seasonEnd]);
  const athleteCount=(team.athletes||[]).length;
  /* Planned Microcycles: the whole season at once, or one month at a time. A week that
     straddles two months shows up under both, so no microcycle falls out of the monthly view. */
  const[mcView,setMcView]=useState('year');
  const[mcMonth,setMcMonth]=useState('');
  const months=useMemo(()=>monthTicks.map(d=>({k:fmt(d).slice(0,7),label:MN[d.getMonth()],year:d.getFullYear()})),[monthTicks]);
  const monthKeys=months.map(m=>m.k);
  const thisMonth=fmt(today).slice(0,7);
  const curMonth=monthKeys.includes(mcMonth)?mcMonth:(monthKeys.includes(thisMonth)?thisMonth:(monthKeys[0]||''));
  const chartWeeks=useMemo(()=>{
    if(mcView!=='month'||!curMonth)return weeks;
    return weeks.filter(w=>w.week.slice(0,7)===curMonth||fmt(addD(parseD(w.week),6)).slice(0,7)===curMonth);
  },[weeks,mcView,curMonth]);
  // Load Mix — share of planned sessions by load type
  const LT_COL={'Mechanical load':'#8b5cf6','Metabolic load':'#06b6d4','Neuromuscular load':'#f97316','Cognitive/perceptual load':'#ec4899'};
  const loadMix=useMemo(()=>{const t={};Object.values(team.days||{}).forEach(d=>(d.sessions||[]).forEach(ses=>{const k=ses.loadType||'—';t[k]=(t[k]||0)+1;}));
    const tot=Object.values(t).reduce((a,b)=>a+b,0);
    return{tot,rows:Object.entries(t).map(([k,v])=>({label:k,n:v,pct:tot?v/tot*100:0})).sort((a,b)=>b.n-a.n)};},[team.days]);
  /* Season switching. The season on screen keeps living in team.setup/days/weekOverrides,
     so moving to another one parks the current slice in seasonData and lifts the target's
     slice into its place — one write, and every other view follows along. */
  const seasons=team.seasons||[];
  const activeId=team.activeSeasonId;
  const switchSeason=id=>switchTeamSeason(team,updateTeam,id);
  /* A new season starts as this one shifted a year on — same sport, same competition
     rhythm, empty plan — which is the edit a coach would otherwise do by hand. */
  const addSeason=()=>{
    const sh=ds=>{if(!ds)return ds;const d=parseD(ds);return fmt(new Date(d.getFullYear()+1,d.getMonth(),d.getDate()));};
    const ns={...s,seasonStart:sh(s.seasonStart),seasonEnd:sh(s.seasonEnd),
      competitions:(s.competitions||[]).map(c=>({...c,date:sh(c.date)})),periods:null};
    const id=uid();
    const store={...(team.seasonData||{})};
    store[activeId]=seasonSlice(team);
    updateTeam(team.id,{seasons:[...seasons,{id}],seasonData:store,activeSeasonId:id,
      setup:ns,days:{},weekOverrides:{}});
  };
  const renameSeason=()=>{
    const cur=seasons.find(sn=>sn.id===activeId);if(!cur)return;
    const n=prompt(L('Sezon adı','Season name'),seasonName(team,cur));if(n===null)return;
    updateTeam(team.id,{seasons:seasons.map(sn=>sn.id===activeId?{...sn,name:n.trim()||undefined}:sn)});
  };
  const removeSeason=()=>{
    if(seasons.length<2)return;
    const cur=seasons.find(sn=>sn.id===activeId);
    if(!confirm(L('"'+seasonName(team,cur)+'" sezonu tüm planıyla silinsin mi? Bu geri alınamaz.','Delete season "'+seasonName(team,cur)+'" with its whole plan? This cannot be undone.')))return;
    const rest=seasons.filter(sn=>sn.id!==activeId);
    const store={...(team.seasonData||{})};
    const nid=rest[0].id;const nx=store[nid]||{};delete store[nid];
    updateTeam(team.id,{seasons:rest,seasonData:store,activeSeasonId:nid,
      setup:nx.setup||s,days:nx.days||{},weekOverrides:nx.weekOverrides||{}});
  };
  const activeSeason=seasons.find(sn=>sn.id===activeId);
  const heroYears=seasonYears(s)||seasonName(team,activeSeason);
  const compPlayed=compPlayedCount(s.competitions);
  return(<div>
    <PageHero title={L('Sezon','Season')}
      sub={L(`Makrosiklüsü kur ve sezonu haftalara böl · ${team.setup.teamName}`,
             `Set the macrocycle up and cut the season into weeks · ${team.setup.teamName}`)}
      stats={[{v:heroYears,l:L('Sezon','Season')},
              {v:weeks.length,l:L('Hafta','Weeks')},
              {v:periods.length,l:L('Faz','Phases')},
              {v:athleteCount,l:L('Sporcu','Athletes')}]}>
      <select className="season-sel" value={activeId||''} onChange={e=>switchSeason(e.target.value)} title={L('Sezon değiştir','Switch season')}>
        {seasons.map(sn=><option key={sn.id} value={sn.id}>{seasonName(team,sn)}</option>)}
      </select>
      <button className="btn sec sm" onClick={addSeason}>{L('Yeni sezon','New season')}</button>
      <button className="btn sec sm" onClick={renameSeason}>{L('Yeniden adlandır','Rename')}</button>
      {seasons.length>1&&<button className="btn sm danger" onClick={removeSeason}>{L('Sil','Delete')}</button>}
    </PageHero>
    {(()=>{
      /* The chart used to start at today, which chopped off whatever a phase had already
         spent — a General Preparation running Jul 20–Aug 16 drew as a stub on Aug 3. The
         window is the macrocycle itself now: General Preparation's start to Transition's
         end, with TODAY marked wherever it actually falls inside it. */
      const tk=fmt(today);
      const winStart=periods.length?periods[0].start:s.seasonStart;
      const winEnd=periods.length?periods[periods.length-1].end:s.seasonEnd;
      const span=Math.max(1,diffD(winStart,winEnd));
      const pctOf=ds=>{const d=Math.max(0,Math.min(span,diffD(winStart,ds)));return d/span*100;};
      const todayPct=(tk>=winStart&&tk<=winEnd)?pctOf(tk):null;
      const phModels=[...new Set(SEASON_PHASES.map(ph=>phaseModel(s,ph.id)))];
      const modelName=phModels.length===1?modelLabel(modelOf(phModels[0])):L('Aşamaya göre model','Model by phase');
      const fmd=ds=>{const d=parseD(ds);return MN[d.getMonth()]+' '+d.getDate();};
      const ticks=[];let cur=new Date(parseD(winStart).getFullYear(),parseD(winStart).getMonth()+1,1);const endD=parseD(winEnd);
      while(cur<=endD){ticks.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}
      return(<div className="panel mc-panel">
        <div className="mc-head"><div className="mc-title">{L('Sezon Makrosiklüsü','Season Macrocycle')}<span className="mc-sub">{L(`${modelName} · ${periods.length} faz`,`${modelName} · ${periods.length} phases`)}</span></div></div>
        <div className="mc-gantt">
          <div className="mc-axis">
            <div/>
            <div className="mc-axis-tr">
              {todayPct!=null&&<div className="mc-today" style={{left:`${todayPct}%`}}><span>{L('BUGÜN','TODAY')}</span></div>}
              {ticks.map((d,i)=><span key={i} className="mc-mtick" style={{left:`${pctOf(fmt(d))}%`}}>{MN[d.getMonth()]}</span>)}
            </div>
          </div>
          {periods.map((p,pi)=>{const l=pctOf(p.start),r=pctOf(p.end);const wk=Math.max(1,Math.round((diffD(p.start,p.end)+1)/7));
            const nm=PHASE_NAME[p.id]||p.name,col=PHASE_COL[p.id]||'#64748b';return(
            <div key={p.id} className="mc-row">
              <div className="mc-lbl" title={nm}>
                <span className="mc-dot" style={{background:col}}/>
                <div className="mc-lbl-tx"><b>{nm}</b><i>{L(`${wk} hf · ${fmd(p.start)}–${fmd(p.end)}`,`${wk} wk · ${fmd(p.start)}–${fmd(p.end)}`)}</i></div>
              </div>
              <div className="mc-track">
                {ticks.map((d,i)=><div key={'g'+i} className="mc-grid" style={{left:`${pctOf(fmt(d))}%`}}/>)}
                {todayPct!=null&&<div className="mc-todayline" style={{left:`${todayPct}%`}}/>}
                <div className="mc-bar" title={L(`${nm} · ${fmd(p.start)} – ${fmd(p.end)} · ${wk} hf`,`${nm} · ${fmd(p.start)} – ${fmd(p.end)} · ${wk} wk`)}
                  style={{left:`${l}%`,width:`${Math.max(.6,r-l)}%`,backgroundColor:col,animationDelay:(pi*80)+'ms'}}/>
              </div>
            </div>);})}
        </div>
      </div>);
    })()}
    <div className="mc-extra">
      <div className="panel" style={{margin:0}}>
        <div className="pm-head">
          <h2 style={{margin:0,fontSize:16}}>{L('Planlı Mikrosikluslar','Planned Microcycles')}</h2>
          <span className="pm-sub">{L('haftalık hacim × şiddet','volume × intensity per week')}</span>
          <span style={{flex:'1 1 auto'}}/>
          <div className="pm-seg">
            <button className={mcView==='year'?'on':''} onClick={()=>setMcView('year')}>{L('Yıllık','Yearly')}</button>
            <button className={mcView==='month'?'on':''} onClick={()=>setMcView('month')}>{L('Aylık','Monthly')}</button>
          </div>
        </div>
        {mcView==='month'&&<div className="pm-months">
          {months.map(m=><button key={m.k} className={`pm-month${m.k===curMonth?' on':''}`} onClick={()=>setMcMonth(m.k)}>
            {m.label}<small>{String(m.year).slice(2)}</small>
          </button>)}
        </div>}
        <div className="chart-box" style={{height:340}}>
          {chartWeeks.length===0
            ?<div className="ex-empty" style={{margin:0}}>{L('Bu ayda planlı mikrosiklus yok.','No planned microcycle this month.')}</div>
            :<ChartC type="line" chartData={{labels:chartWeeks.map(w=>[fd(w.week).slice(0,5),w.focus||'']),datasets:[
            {label:L('Hacim','Volume'),data:chartWeeks.map(w=>Number(w.volume)||0),borderColor:'#3b6ef5',backgroundColor:'rgba(59,110,245,.16)',tension:.4,fill:true,borderWidth:2,pointRadius:mcView==='month'?4:0,pointBackgroundColor:'#3b6ef5',pointBorderColor:'#0f1115',pointHoverRadius:5,pointHoverBackgroundColor:'#3b6ef5',pointHoverBorderColor:'#fff',pointHoverBorderWidth:2},
            {label:L('Şiddet','Intensity'),data:chartWeeks.map(w=>Number(w.intensity)||0),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.14)',tension:.4,fill:true,borderWidth:2,pointRadius:mcView==='month'?4:0,pointBackgroundColor:'#f59e0b',pointBorderColor:'#0f1115',pointHoverRadius:5,pointHoverBackgroundColor:'#f59e0b',pointHoverBorderColor:'#fff',pointHoverBorderWidth:2}
          ]}} options={{responsive:true,maintainAspectRatio:false,
            interaction:{mode:'index',intersect:false},hover:{mode:'index',intersect:false},
            scales:{x:{...CHART_DARK.scales.x,ticks:{...CHART_DARK.scales.x.ticks,autoSkip:mcView!=='month',maxRotation:0,font:{size:10}}},y:{...CHART_DARK.scales.y,suggestedMax:110}},
            plugins:{legend:{position:'top',align:'end',labels:{color:'#e5e7eb',font:{size:13,weight:'600',family:"'Archivo','Space Grotesk',sans-serif"},usePointStyle:true,pointStyle:'circle',boxWidth:9,padding:16}},
              tooltip:{mode:'index',intersect:false,callbacks:{title:items=>{const w=chartWeeks[items[0].dataIndex];return w?`${fd(w.week)} · ${w.focus||''}`:'';},label:i=>`${i.dataset.label}: ${i.parsed.y}%`}}}}}/>}
        </div>
      </div>
    </div>
    <div className="panel"><h2>{L('Makrosiklüs Zaman Çizelgesi','Macrocycle Timeline')}</h2>
      <div className="row" style={{justifyContent:'space-between',marginBottom:8}}>
        <strong style={{fontSize:13}}>{L('Faz Tarihleri','Period Dates')} {usingCustom?<span className="tag" style={{marginLeft:8}}>{L('ÖZEL','CUSTOM')}</span>:<span className="tag" style={{marginLeft:8,background:'rgba(245,158,11,.15)',color:'var(--yellow)'}}>{L('OTOMATİK','AUTO')}</span>}</strong>
        <button className="btn sec sm" onClick={resetPeriods}>{L('Otomatiğe sıfırla','Reset to auto')}</button>
      </div>
      <table><thead><tr><th>{L('Faz','Period')}</th><th>{L('Başlangıç (gg/aa/yyyy)','Start (dd/mm/yyyy)')}</th><th>{L('Bitiş (gg/aa/yyyy)','End (dd/mm/yyyy)')}</th><th>{L('Süre','Duration')}</th></tr></thead><tbody>
        {periods.map(p=><tr key={p.id}>
          <td><strong style={{color:'var(--text)'}}><span style={{display:'inline-block',width:9,height:9,borderRadius:'50%',marginRight:8,verticalAlign:'middle',background:PHASE_COL[p.id]||'#64748b'}}/>{exLabel(p.name)}</strong></td>
          <td><DateDMY value={p.start} onChange={v=>updPeriod(p.id,'start',v)} style={{width:160}}/></td>
          <td><DateDMY value={p.end} onChange={v=>updPeriod(p.id,'end',v)} style={{width:160}}/></td>
          <td><strong>{diffD(p.start,p.end)+1}</strong> {L('gün','days')}</td>
        </tr>)}
      </tbody></table>
    </div>

    {/* The model and the fixtures used to sit on Setup, two screens away from the
        macrocycle they draw: the model writes every week's volume/intensity profile and
        the fixture list is what the auto phases are cut around. They belong on the
        screen that shows what they did. */}
    <PeriodizationModelPanel s={s} periods={periods} set={patch=>updateTeam(team.id,{setup:{...s,...patch}})}/>
    {/* The fixture list. Most of it writes itself — a session ticked Competition in the
        session editor lands here on its own — so the panel opens folded: it is a long
        list a coach checks rather than a form they fill in. What is typed here is what
        the calendar cannot know: where it was played, which league or cup it counted
        for, and how it ended. */}
    <div className="panel cmp-panel">
      <button type="button" className={'cmp-h'+(compOpen?' on':'')} onClick={()=>setCompOpen(o=>!o)}>
        <i>{compOpen?'▼':'▶'}</i>
        <b>{L('Müsabaka Tarihleri','Competition Dates')}</b>
        <span className="cmp-count">{L(`${compPlayed} oynandı`,`${compPlayed} played`)}
          <em>{L(`${s.competitions.length} maç`,`${s.competitions.length} fixtures`)}</em></span>
      </button>
      {compOpen&&<div className="cmp-b">
        {s.competitions.length===0
          ?<div className="empty-st">{L('Henüz müsabaka yok — takvimde bir seansın odağını Müsabaka yap, gün buraya kendiliğinden düşsün; ya da aşağıdan elle ekle.',
              'No fixtures yet — set a session\'s focus to Competition on the calendar and the day lands here by itself, or add one by hand below.')}</div>
          :<div className="cmp-list">
            {s.competitions.map((c,i)=><div key={c.srcId||i} className="cmp-row">
              <div className="cmp-f date"><label>{L('Tarih','Date')}</label>
                <DateDMY long value={c.date} onChange={v=>uc(i,'date',v)}/></div>
              <div className="cmp-f grow"><label>{L('Etkinlik','Event')}</label>
                <input value={c.name||''} onChange={e=>uc(i,'name',e.target.value)}/></div>
              <div className="cmp-f grow"><label>{L('Rakip','Opponent')}</label>
                <input value={c.opponent||''} placeholder={L('rakip takım','opposing team')}
                  onChange={e=>uc(i,'opponent',e.target.value)}/></div>
              <div className="cmp-f grow"><label>{L('Lig / turnuva','League / tournament')}</label>
                <input value={c.comp||''} placeholder={L('ör. U16 Bölgesel Lig','e.g. U16 Regional League')}
                  onChange={e=>uc(i,'comp',e.target.value)}/></div>
              <div className="cmp-f grow"><label>{L('Konum','Location')}</label>
                <input value={c.location||''} placeholder={L('salon / şehir','venue / city')}
                  onChange={e=>uc(i,'location',e.target.value)}/></div>
              {(()=>{const res=compResult(c);const oppAuto=compAbbr(c.opponent||c.name)||L('RAK','OPP');
                return(<div className="cmp-f score"><label>{L('Skor','Score')}</label>
                <div className="cmp-score">
                  <div className="cmp-side us">
                    <input className="cmp-abbr" value={s.teamAbbr||''} placeholder={ourAbbrAuto} maxLength={5}
                      title={L(`Bizim takım — ${s.clubName||s.teamName||''} (kısaltmayı değiştirmek için yaz)`,`Our team — ${s.clubName||s.teamName||''} (type to change the tag)`)}
                      onChange={e=>u('teamAbbr',e.target.value.toLocaleUpperCase('tr'))}/>
                    <input inputMode="numeric" value={c.scoreFor??''} aria-label={L('Bizim skorumuz','Our score')}
                      onChange={e=>uc(i,'scoreFor',e.target.value)}/>
                  </div>
                  <span className="cmp-dash">–</span>
                  <div className="cmp-side them">
                    <input className="cmp-abbr" value={c.oppAbbr||''} placeholder={oppAuto} maxLength={5}
                      title={L(`Rakip — ${c.opponent||c.name||''} (kısaltmayı değiştirmek için yaz)`,`Opponent — ${c.opponent||c.name||''} (type to change the tag)`)}
                      onChange={e=>uc(i,'oppAbbr',e.target.value.toLocaleUpperCase('tr'))}/>
                    <input inputMode="numeric" value={c.scoreAgainst??''} aria-label={L('Rakip skoru','Opponent score')}
                      onChange={e=>uc(i,'scoreAgainst',e.target.value)}/>
                  </div>
                  <span className={'cmp-res'+(res?' '+res.k:'')} title={res?res.title:L('Skor girilince sonuç kendiliğinden yazılır','The result is filled in once the score is entered')}>
                    {res?res.t:''}</span>
                </div>
              </div>);})()}
              <div className="cmp-f act">
                {c.srcId&&<span className="cmp-auto" title={L('Bu satır takvimdeki müsabaka seansından geliyor.',
                      'This row comes from a Competition session on the calendar.')}>{L('Takvimden','From calendar')}</span>}
                <button type="button" className="cmp-del" onClick={()=>delComp(i)}
                  title={L('Maçı sil','Delete the match')} aria-label={L('Maçı sil','Delete the match')}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            </div>)}
          </div>}
        <button className="btn sec sm" style={{marginTop:12}}
          onClick={()=>u('competitions',[...s.competitions,{date:s.seasonStart,name:L('Yeni müsabaka','New fixture'),opponent:'',comp:'',location:'',scoreFor:'',scoreAgainst:''}])}>
          {L('Müsabaka ekle','Add competition')}</button>
      </div>}
    </div>
    <WeeklyLoadTargets team={team} updateTeam={updateTeam} weeks={weeks} periods={periods} setWeekFocus={setWeekFocus}/>
  </div>);
}

