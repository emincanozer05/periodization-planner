/* =========================================================
   SEASON PLAN (with customizable periods)
   ========================================================= */
/* ---- The choices a week is planned with ------------------------------------
   Training Phase — where the week sits in the season (the four macrocycle periods);
   Primary and Secondary Focus — the qualities it builds; Weekly Load — how hard the week
   is meant to be. Each option carries its own
   explanation in both languages, shown under the open list. A load level also carries a
   target factor (`f`, × the season's "normal week" load) and the volume / intensity
   profile (`v`, `i`) the Planned Microcycles chart draws. */
/* The qualities a week can build — the same list for the primary and the secondary focus. */
const WLT_FOCUS_OPTS=[
    {id:'aerobic',c:'#22c55e',l:['İş Kapasitesi','Work Capacity'],d:['Aerobik kapasiteyi, kondisyonu ve sporcunun antrenman yükünü tolere etme kapasitesini geliştirmeye odaklanır.',
      'Develops aerobic capacity, conditioning and the athlete\'s capacity to tolerate training load.']},
    {id:'hypertrophy',c:'#a78bfa',l:['Hipertrofi / Yapısal Kapasite','Hypertrophy / Structural Capacity'],d:['Kas kütlesi, kas kesit alanı ve sporcunun yapısal kapasitesini geliştirmeye odaklanır.',
      'Develops muscle mass, muscle cross-sectional area and the athlete\'s structural capacity.']},
    {id:'maxStrength',c:'#f43f5e',l:['Maksimal Kuvvet','Maximal Strength'],d:['Yüksek kuvvet üretme kapasitesini geliştirmeye odaklanır.',
      'Develops the capacity to produce high force.']},
    {id:'power',c:'#f59e0b',l:['Patlayıcı Güç','Explosive Power'],d:['Kuvveti yüksek hızda ve kısa sürede üretme kapasitesine odaklanır. RFD, kuvvet-sürat ve sürat-kuvvet bu başlık altında değerlendirilir.',
      'Develops the capacity to produce force at high velocity and in a short time. RFD, strength-speed and speed-strength sit under this heading.']},
    {id:'speed',c:'#38bdf8',l:['Sürat / İvmelenme','Speed / Acceleration'],d:['İlk hızlanma ve maksimal hız dahil olmak üzere sprint kapasitesini geliştirmeye odaklanır.',
      'Develops sprint capacity, including initial acceleration and maximal velocity.']},
    {id:'mixed',c:'#94a3b8',l:['Karma','Mixed'],d:['Birden fazla kalite aynı hafta içinde birlikte çalışılır; tek bir baskın vurgu yoktur. Müsabaka haftaları ve geçiş blokları için uygundur.',
      'Several qualities are trained in the same week with no single dominant emphasis. Suits competition weeks and bridging blocks.']},
  ];
const WLT_STEPS=[
  {key:'phase',label:['Antrenman Fazı','Training Phase'],opts:[
    {id:'gp',c:'#3b6ef5',l:['Temel Hazırlık','General Preparation'],d:['Sezon öncesi hazırlığın ilk aşaması: temel kuvvet, aerobik dayanıklılık, mobilite ve hareket kalitesi geliştirilir; hacim kademeli artırılarak yoğun yüklenmelere altyapı kurulur.',
      'The first stage of pre-season preparation: base strength, aerobic endurance, mobility and movement quality are developed; volume rises gradually, building the base for heavier loading.']},
    {id:'sp',c:'#facc15',l:['Özel Hazırlık','Specific Preparation'],d:['Sezon öncesi hazırlığın son aşaması: maksimal kuvvet, patlayıcı güç, sürat, çeviklik ve branşa özgü kondisyon geliştirilir; antrenmanın özgüllüğü artar.',
      'The last stage of pre-season preparation: maximal strength, explosive power, speed, agility and sport-specific conditioning are developed; training becomes more specific.']},
    {id:'perf',c:'#f43f5e',l:['Performans','Competition / Performance'],d:['Müsabaka dönemi: kazanılan fiziksel özellikler korunur, performans sürdürülür; yükler maç takvimine göre düzenlenir.',
      'The competition period: the qualities gained are maintained and performance sustained; loads are arranged around the match calendar.']},
    {id:'trans',c:'#2dd4a7',l:['Geçiş','Transition'],d:['Sezon sonu ve sezonlar arası: fiziksel ve psikolojik toparlanma, aktif dinlenme ve bireysel eksikliklere yönelik çalışma.',
      'End of season and between seasons: physical and psychological recovery, active rest and work on individual weaknesses.']},
  ]},
  {key:'emphasis',label:['Birincil Odak','Primary Focus'],opts:WLT_FOCUS_OPTS},
  {key:'emphasis2',label:['İkincil Odak','Secondary Focus'],opts:[...WLT_FOCUS_OPTS,
    {id:'none',c:'#64748b',l:['Yok','None'],d:['Bu hafta ikincil bir odak yok; hafta tek bir kaliteye ayrılır.','No secondary focus this week; the week is given to one quality.']}]},
  {key:'load',label:['Haftanın Yükü','Weekly Load'],opts:[
    {id:'low',c:'#38bdf8',f:.8,v:60,i:60,l:['Düşük','Low'],d:['Yükün normalin altında tutulduğu hafta: yeni bir bloğa giriş, yoğun maç takvimi ya da kontrollü yüklenme için. Hedef, normal haftanın %80\'i.',
      'A week held below the usual load: easing into a new block, a busy fixture list or controlled loading. Target: 80% of a normal week.']},
    {id:'moderate',c:'#22c55e',f:1,v:75,i:70,l:['Normal','Moderate'],d:['Planlı gelişimsel yüklenmenin olağan seviyede sürdürüldüğü hafta. Hedef, normal hafta yükü.',
      'A week of planned developmental loading at the usual level. Target: the normal week load.']},
    {id:'high',c:'#f97316',f:1.2,v:90,i:80,l:['Yüksek','High'],d:['Kısa süreli ve planlı olarak normalin üzerinde stres oluşturulan hafta; ardından çoğunlukla yük azaltma gelir. Hedef, normal haftanın %120\'si.',
      'A short, planned week of stress above the usual, usually followed by a deload. Target: 120% of a normal week.']},
    {id:'deload',c:'#2dd4a7',f:.6,v:45,i:55,l:['Yük Azaltma','Deload'],d:['Biriken yorgunluğu azaltmak ve toparlanmayı desteklemek için antrenman yükünün düşürüldüğü hafta. Hedef, normal haftanın %60\'ı.',
      'A week in which training load is lowered to shed accumulated fatigue and support recovery. Target: 60% of a normal week.']},
    {id:'peaking',c:'#facc15',f:.7,v:50,i:85,l:['Zirveleme','Peaking'],d:['Belirli bir müsabaka veya test tarihinde performansı en üst seviyeye çıkarmaya yönelik hafta: hacim düşer, şiddet korunur. Hedef, normal haftanın %70\'i.',
      'A week aimed at bringing performance to its highest for a specific competition or test date: volume drops, intensity holds. Target: 70% of a normal week.']},
  ]},
];
const wltOpt=(key,id)=>{const st=WLT_STEPS.find(x=>x.key===key);return st?st.opts.find(o=>o.id===id)||null:null;};
const wltLbl=(key,id)=>{const o=wltOpt(key,id);return o&&o.id!=='none'?L(o.l[0],o.l[1]):'';};
/* Weeks saved before the third choice became the week's load carried a "microcycle
   objective"; each one reads as the load level closest to it. */
const WLT_OBJ_LOAD={preparation:'low',loading:'moderate',overreaching:'high',deload:'deload',peaking:'peaking',competition:'moderate'};
/* What a week reads as before the coach has chosen anything: its phase is the period it
   falls in; the two focuses follow the phase; the load follows a taper, the transition
   period and a period's first week. Weeks saved with the older five-step phase scale
   (Foundation … Transition) read as the period that phase belongs to. */
const WLT_PERIOD_PHASE={gp:'gp',sp:'sp',comp:'perf',trans:'trans'};
const WLT_OLD_PHASE={base:'gp',accumulation:'gp',intensification:'sp',realization:'perf',transition:'trans'};
const WLT_PHASE_EMPH={gp:['aerobic','hypertrophy'],sp:['maxStrength','power'],perf:['power','speed'],trans:['aerobic','none']};
function wltDefaults(w,firstOfPeriod,games){
  const phase=WLT_PERIOD_PHASE[w.period]||'gp';
  const[emphasis,emphasis2]=WLT_PHASE_EMPH[phase]||['aerobic','none'];
  const load=w.taper?'peaking':(w.period==='trans'||w.focus==='Deload'||w.focus==='Active recovery')?'deload'
    :firstOfPeriod?'low':'moderate';
  return{phase,emphasis,emphasis2,load};
}
const nfAU=n=>Math.round(Number(n)||0).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-US');
const spPct=n=>REPORT_LANG==='tr'?`%${n}`:`${n}%`;
/* Every week of the season with what it is planned as and what it actually held:
   the three choices (hand-set or derived), the target load and the realised load. The
   realised load is the team's daily load the calendar shows under each day
   (teamDailyLoadMap — session sRPE × minutes, or the squad's own sRPE logs), so the
   week card, the calendar and the monotony chip all add up the same seven numbers.
   A week's target is the coach's own number, or — until one is typed — the season's
   "normal week" load × the load level's factor. That normal week is set by the coach,
   or read off the weeks already done (median of their load ÷ their level's factor). */
function wltRows(team,weeks){
  const ov=team.weekOverrides||{},days=team.days||{};
  const comps=(team.setup&&team.setup.competitions)||[];
  const daily=teamDailyLoadMap(days,team.athletes);
  const tk=fmt(today);
  const rows=weeks.map((w,i)=>{
    const ws=parseD(w.week),end=fmt(addD(ws,6));
    let au=0,ses=0;
    for(let d=0;d<7;d++){const k=fmt(addD(ws,d));au+=Math.round(daily[k]||0);ses+=((days[k]&&days[k].sessions)||[]).length;}
    const games=comps.filter(c=>c&&c.date&&c.date>=w.week&&c.date<=end);
    const def=wltDefaults(w,i===0||weeks[i-1].period!==w.period,games.length);
    const o=ov[w.week]||{};
    const has=(k,v)=>!!wltOpt(k,v);
    const oLoad=o.load||WLT_OBJ_LOAD[o.objective];
    const oPhase=WLT_OLD_PHASE[o.phase]||o.phase;
    const steps={phase:has('phase',oPhase)?oPhase:def.phase,emphasis:has('emphasis',o.emphasis)?o.emphasis:def.emphasis,
      emphasis2:has('emphasis2',o.emphasis2)?o.emphasis2:def.emphasis2,load:has('load',oLoad)?oLoad:def.load};
    const hand=Number(o.target)>0?Math.round(Number(o.target)):null;
    return{...w,idx:i,end,au,ses,games,steps,set:{phase:has('phase',oPhase),emphasis:has('emphasis',o.emphasis),emphasis2:has('emphasis2',o.emphasis2),load:has('load',oLoad)},
      hand,current:tk>=w.week&&tk<=end,past:end<tk,edited:!!ov[w.week]};
  });
  const ref=Number(team.setup&&team.setup.loadRef)>0?Math.round(Number(team.setup.loadRef)):null;
  const est=rows.filter(r=>r.past&&r.au>0).map(r=>r.au/(wltOpt('load',r.steps.load).f||1)).sort((a,b)=>a-b);
  const autoRef=est.length?Math.round((est.length%2?est[(est.length-1)/2]:(est[est.length/2-1]+est[est.length/2])/2)/10)*10:null;
  const base=ref||autoRef;
  rows.forEach(r=>{r.sug=base?Math.round(base*(wltOpt('load',r.steps.load).f||1)/10)*10:null;
    r.target=r.hand!=null?r.hand:r.sug;
    r.ratio=r.target?Math.round(r.au/r.target*100):null;});
  return{rows,ref,autoRef};
}
/* A number field that writes when the coach is done (blur / Enter), not on every key:
   each write is a sync round, and a half-typed "6" for "650" is not a target. */
function SpNumInput({value,placeholder,onCommit,className,ariaLabel}){
  const[v,setV]=useState(value==null?'':String(value));
  useEffect(()=>{setV(value==null?'':String(value));},[value]);
  const commit=()=>{const t=String(v).replace(/[^\d]/g,'');const n=t?Number(t):null;
    if((n||null)!==(value||null))onCommit(n);else setV(value==null?'':String(value));};
  return <input type="text" inputMode="numeric" className={className} value={v} placeholder={placeholder} aria-label={ariaLabel}
    onChange={e=>setV(e.target.value.replace(/[^\d]/g,'').slice(0,6))} onBlur={commit}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setV(value==null?'':String(value));setTimeout(()=>e.target.blur(),0);}}}/>;
}
const SpChev=()=><svg className="sp-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>;
const SpCheck=()=><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>;
/* One choice of a week card: a field showing the choice; it opens the list of options,
   and the explanation of whichever option is under the pointer (or chosen) shows at the
   foot of the list — readable on a touch screen too, where nothing hovers. */
function WltSelect({step,value,onChange,edited}){
  const[open,setOpen]=useState(false);
  const[hov,setHov]=useState(null);
  const ref=useRef(null);
  useDDOutside([ref],open,()=>setOpen(false));
  useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[open]);
  const cur=step.opts.find(o=>o.id===value)||step.opts[0];
  const tip=step.opts.find(o=>o.id===hov)||cur;
  return(<div className={'sp-f'+(open?' open':'')} ref={ref}>
    <div className="sp-fl">{L(step.label[0],step.label[1])}
      {edited&&<i title={L('Elle seçildi','Chosen by hand')}/>}</div>
    <button type="button" className="sp-sel" style={{'--oc':cur.c}} aria-haspopup="listbox" aria-expanded={open}
      title={`${L(cur.l[0],cur.l[1])} — ${L(cur.d[0],cur.d[1])}`} onClick={()=>{setHov(null);setOpen(o=>!o);}}>
      <span className="sp-dot"/><span className="sp-sel-v">{L(cur.l[0],cur.l[1])}</span><SpChev/>
    </button>
    {open&&<div className="sp-menu" role="listbox" aria-label={L(step.label[0],step.label[1])} onMouseLeave={()=>setHov(null)}>
      {step.opts.map(o=>{const on=o.id===value;return(
        <button key={o.id} type="button" role="option" aria-selected={on} className={'sp-opt'+(on?' on':'')} style={{'--oc':o.c}}
          onMouseEnter={()=>setHov(o.id)} onFocus={()=>setHov(o.id)} onClick={()=>{onChange(o);setOpen(false);}}>
          <span className="sp-dot"/><span className="sp-opt-l">{L(o.l[0],o.l[1])}</span>{on&&<SpCheck/>}
        </button>);})}
      <div className="sp-menu-d" style={{'--oc':tip.c}}>{L(tip.d[0],tip.d[1])}</div>
    </div>}
  </div>);
}

/* ---- Weekly plan ------------------------------------------------------------
   The season's weeks, grouped under the period they belong to. Each card is one week:
   the three choices, the target load (typed, or suggested from the normal week) and the
   load the team actually did, with how far along the target it is. */
function WeeklyPlanTab({team,updateTeam,plan,periods,focusWeek}){
  const ov=team.weekOverrides||{};
  const s=team.setup;
  const{rows,ref,autoRef}=plan;
  const[filter,setFilter]=useState('current');   // all | current | future — opens on this period
  const refs=useRef({});
  const setWeek=(k,patch)=>{const n={...(ov[k]||{}),...patch};Object.keys(n).forEach(x=>{if(n[x]==null)delete n[x];});
    updateTeam(team.id,{weekOverrides:{...ov,[k]:n}});};
  const resetWeek=k=>{const n={...ov};delete n[k];updateTeam(team.id,{weekOverrides:n});};
  const resetAll=()=>{if(confirm(L('Bütün haftalar önerilen plana dönsün mü? Elle yapılan seçimler ve yazılan hedefler silinir.',
    'Return every week to the suggested plan? Hand-made choices and typed targets are cleared.')))updateTeam(team.id,{weekOverrides:{}});};
  const setRef=n=>{const nx={...s};if(n)nx.loadRef=n;else delete nx.loadRef;updateTeam(team.id,{setup:nx});};
  /* "This period" is the period today falls in — or, before the season, the first one to come. */
  const curPeriod=((rows.find(x=>x.current)||rows.find(x=>!x.past)||{}).period)||null;
  const shown=rows.filter(r=>filter==='all'||(filter==='future'?!r.past:r.period===curPeriod));
  const groups=[];
  shown.forEach(r=>{const g=groups[groups.length-1];if(g&&g.period===r.period)g.rows.push(r);else groups.push({period:r.period,rows:[r]});});
  const pName=id=>{const p=(periods||[]).find(x=>x.id===id);return exLabel((p&&p.name)||PHASE_NAME[id]||id);};
  const edited=rows.filter(r=>r.edited).length;
  /* The header's "this week" chip asks for a week: show it whatever the filter, then scroll. */
  useEffect(()=>{if(!focusWeek||!focusWeek.k)return;
    if(!shown.some(r=>r.week===focusWeek.k))setFilter('all');
    const t=setTimeout(()=>{const el=refs.current[focusWeek.k];if(el){el.scrollIntoView({behavior:'smooth',block:'center'});
      el.classList.remove('sp-flash');void el.offsetWidth;el.classList.add('sp-flash');}},60);
    return()=>clearTimeout(t);},[focusWeek]);
  return(<div className="sp-weeks">
    <div className="sp-bar-row">
      <div className="sp-seg" role="group" aria-label={L('Haftaları süz','Filter weeks')}>
        {[['all',L('Tümü','All')],['current',L('Bu dönem','This period')],['future',L('Kalan haftalar','Remaining')]].map(([k,l])=>
          <button key={k} type="button" className={filter===k?'on':''} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}
      </div>
      <label className="sp-ref" title={L('Hedefler bu değere göre önerilir: Düşük %80 · Normal %100 · Yüksek %120 · Zirveleme %70 · Yük Azaltma %60. Bir haftaya kendi hedefini yazarsan o geçerli olur.',
        'Targets are suggested from this value: Low 80% · Moderate 100% · High 120% · Peaking 70% · Deload 60%. A target typed into a week overrides it.')}>
        <span>{L('Normal hafta yükü','Normal week load')}</span>
        <SpNumInput value={ref} placeholder={autoRef?String(autoRef):'—'} onCommit={setRef} ariaLabel={L('Normal hafta yükü (AU)','Normal week load (AU)')}/>
        <em>AU{!ref&&autoRef?' · '+L('geçmiş haftalardan','from past weeks'):''}</em>
      </label>
      {edited>0&&<button type="button" className="btn xs sec sp-reset-all" onClick={resetAll}
        title={L('Elle yapılan bütün hafta ayarlarını temizle','Clear every hand-set week')}>↺ {L(`Sıfırla (${edited})`,`Reset (${edited})`)}</button>}
    </div>
    {!ref&&!autoRef&&<div className="sp-note">{L('Hedef yükler için yukarıya bir normal hafta yükü (AU) yaz ya da kartlara tek tek hedef gir. Haftalar tamamlandıkça bu değer gerçekleşen yüklerden kendiliğinden önerilir.',
      'For target loads, type a normal week load (AU) above or enter a target on each card. As weeks are completed this value is suggested from the realised loads by itself.')}</div>}
    {groups.map((g,gi)=>{const a=g.rows[0],z=g.rows[g.rows.length-1];
      const tSum=g.rows.reduce((n,r)=>n+(r.target||0),0),aSum=g.rows.reduce((n,r)=>n+r.au,0);
      return(<section key={g.period+gi} className="sp-grp" style={{'--pc':PHASE_COL[g.period]||'#64748b'}}>
        <div className="sp-grp-h">
          <i/><b>{pName(g.period)}</b>
          <span>{fd(a.week).slice(0,5)} – {fd(z.end).slice(0,5)} · {L(`${g.rows.length} hafta`,`${g.rows.length} week${g.rows.length>1?'s':''}`)}</span>
          <em>{tSum>0&&<>{L('Hedef','Target')} <b>{nfAU(tSum)}</b> · </>}{L('Gerçekleşen','Actual')} <b>{nfAU(aSum)}</b> AU</em>
        </div>
        <div className="sp-grid">
          {g.rows.map(w=>{
            const r=w.ratio,pct=r==null?0:Math.min(100,r),over=r!=null&&r>100;
            const left=w.target?w.target-w.au:null;
            return(<article key={w.week} ref={el=>{refs.current[w.week]=el;}}
              className={'sp-wk'+(w.current?' cur':'')+(w.past?' past':'')}>
              <div className="sp-wk-hd">
                <div className="sp-wk-id"><b>{L('H','W')}{w.idx+1}</b><span>{fd(w.week).slice(0,5)} – {fd(w.end).slice(0,5)}</span></div>
                <div className="sp-wk-r">
                  <span className="sp-wk-ses">{L(`${w.ses} seans`,`${w.ses} session${w.ses!==1?'s':''}`)}</span>
                  {(w.current||w.games.length>0||w.edited)&&<div className="sp-wk-tags">
                    {w.current&&<span className="sp-now">{L('Bu hafta','This week')}</span>}
                    {w.games.length>0&&<span className="sp-game" title={w.games.map(c=>`${fd(c.date)} · ${c.opponent||c.name||''}`).join('\n')}>
                      {L('Maç','Game')}{w.games.length>1?` ×${w.games.length}`:''}</span>}
                    {w.edited&&<button type="button" className="sp-rst" onClick={()=>resetWeek(w.week)}
                      title={L('Bu haftayı önerilen plana döndür','Return this week to the suggested plan')}
                      aria-label={L('Bu haftayı sıfırla','Reset this week')}>↺</button>}
                  </div>}
                </div>
              </div>
              <div className="sp-box">
                {WLT_STEPS.map(st=><WltSelect key={st.key} step={st} value={w.steps[st.key]} edited={w.set[st.key]}
                  onChange={o=>{
                    const next={...w.steps,[st.key]:o.id};
                    const ph=wltOpt('phase',next.phase),ld=wltOpt('load',next.load);
                    /* The load level carries a volume / intensity profile, so the Planned
                       Microcycles chart follows the choice without another control. */
                    setWeek(w.week,{[st.key]:o.id,objective:null,focus:`${ph.l[1]} · ${ld.l[1]}`,
                      ...(st.key==='load'?{volume:o.v,intensity:o.i}:{})});
                  }}/>)}
              </div>
              <div className="sp-loads">
                <div className="sp-lc">
                  <div className="sp-lc-l" title={L('Hedeflenen yük','Target load')}>{L('Hedef','Target')}</div>
                  <SpNumInput className={'sp-tgt'+(w.hand==null?' sug':'')} value={w.hand} placeholder={w.sug!=null?String(w.sug):'—'}
                    onCommit={n=>setWeek(w.week,{target:n})} ariaLabel={L(`H${w.idx+1} hedeflenen yük (AU)`,`W${w.idx+1} target load (AU)`)}/>
                  <div className="sp-lc-s">{w.hand!=null?L('AU · Düzenlenebilir','AU · Editable')
                    :w.sug!=null?L('AU · Öneri','AU · Suggested'):L('AU · Hedef gir','AU · Enter a target')}</div>
                </div>
                <div className="sp-lc">
                  <div className="sp-lc-l" title={L('Gerçekleşen yük','Actual load')}>{L('Gerçekleşen','Actual')}</div>
                  <div className={'sp-act'+(w.au?'':' none')}>{w.au?<>{nfAU(w.au)} <small>AU</small></>:'—'}</div>
                  <div className="sp-lc-s">{L('sRPE verilerinden','From sRPE data')}</div>
                </div>
              </div>
              <div className={'sp-prog'+(over?' over':'')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
                aria-label={L('Hedef gerçekleşme oranı','Target completion')}><i style={{width:pct+'%'}}/></div>
              {/* One row under the bar: what is left (or how far over), and the completion rate. */}
              <div className={'sp-ratio'+(over?' over':'')}>
                <span>{left==null?L('Hedef belirlenmedi','No target set')
                  :left>=0?<>{L('Hedefe kalan','Left to target')}: <em>{nfAU(left)} AU</em></>
                  :<>{L('Hedef aşıldı','Over target')}: <em>+{nfAU(-left)} AU</em></>}</span>
                <b title={L('Hedef gerçekleşme oranı','Target completion')}>{r==null?'—':spPct(r)}</b>
              </div>
            </article>);})}
        </div>
      </section>);})}
    {groups.length===0&&<div className="empty-st">{L('Bu filtrede hafta yok.','No weeks in this filter.')}</div>}
  </div>);
}

/* ---- Monthly calendar: a rough draft of the season ---------------------------
   Training boxes placed on days: what the month is meant to look like before any
   session is written. Lives in team.setup.roughPlan, so it moves with the season.
   A box is added from the day's "+" menu, which lists the training types (name + colour,
   edited from the same menu). A placed box starts as its type and can then be made its
   own: a right-click (a long press on a touch screen, or Enter / the menu key on a
   focused box) opens its editor — name, colour, time and location. It is drawn like a
   session card on the Calendar tab (`calw-ses`), so both calendars read the same. Boxes
   drag between days; each row starts with its week's plan (phase · focus · load) from
   the weekly cards, and fixtures show on their day.
   A day holds a list of boxes, each {id, t, name?, color?, time?, loc?}. Older saves hold a
   bare type id or an object without `id`; a day's boxes get their ids the first time that
   day is written (rpIds). The id lets the record-based sync (468-store-map.jsx) keep two
   boxes added to the same day on two devices at once — a list without ids is written whole. */
const RP_COLORS=['#ef4444','#f97316','#f59e0b','#facc15','#a3e635','#22c55e','#2dd4a7','#38bdf8','#3b82f6','#6366f1','#a78bfa','#ec4899','#94a3b8'];
const RP_DEFAULT_TYPES=[
  {id:'str',n:['Kuvvet','Strength'],c:'#ef4444'},
  {id:'pow',n:['Patlayıcı Güç','Power'],c:'#facc15'},
  {id:'spd',n:['Sürat','Speed'],c:'#38bdf8'},
  {id:'cond',n:['Kondisyon','Conditioning'],c:'#22c55e'},
  {id:'bb',n:['Basketbol','Basketball'],c:'#f97316'},
  {id:'rec',n:['Toparlanma','Recovery'],c:'#2dd4a7'},
];
function rpTypes(s){const rp=s&&s.roughPlan;
  if(rp&&Array.isArray(rp.types))return rp.types;
  return RP_DEFAULT_TYPES.map(t=>({id:t.id,name:L(t.n[0],t.n[1]),color:t.c}));}
const rpBox=e=>typeof e==='string'?{t:e}:(e&&typeof e==='object'?e:null);
/* A day's boxes, each with an id (older bare type ids and id-less objects get one). */
const rpIds=list=>(list||[]).map(e=>{const b=rpBox(e);return!b||b.id?b:{id:uid(),...b};}).filter(Boolean);
/* A box as it shows: its own name / colour, else its type's. */
const rpView=(e,typeBy)=>{const b=rpBox(e);if(!b)return null;const t=typeBy[b.t];
  if(!t&&!b.name)return null;
  return{...b,name:b.name||(t&&t.name)||L('Antrenman','Training'),color:b.color||(t&&t.color)||'#94a3b8',type:t||null};};
function RpAddMenu({types,onPick,onEdit,onClose,alignRight,up}){
  const ref=useRef(null);
  useDDOutside([ref],true,onClose);
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
  return(<div className={'rp-menu'+(alignRight?' r':'')+(up?' up':'')} ref={ref} role="menu" onClick={e=>e.stopPropagation()}>
    <div className="rp-menu-h">{L('Antrenman ekle','Add training')}</div>
    {types.map(t=><button key={t.id} type="button" role="menuitem" className="rp-menu-i" style={{'--tc':t.color}} onClick={()=>onPick(t.id)}>
      <i/>{t.name||L('Adsız','Untitled')}</button>)}
    {types.length===0&&<div className="rp-menu-none">{L('Henüz antrenman türü yok.','No training types yet.')}</div>}
    <button type="button" className="rp-menu-e" onClick={onEdit}>{L('Türleri düzenle…','Edit types…')}</button>
  </div>);
}
/* The box editor, opened at the pointer. Typing is kept here until the editor closes —
   by Kaydet, Enter or a click outside — so a half-typed name is not written; Escape
   leaves without saving. A colour is part of the same draft. Locations typed before are
   offered in a list under the field (filtered by what is typed); each has an × that
   drops it from the list — the boxes that use it keep it. */
function RpBoxEditor({x,y,box,type,locs,onDelLoc,onSave,onDelete,onClose}){
  const ref=useRef(null);
  const[pos,setPos]=useState({left:x,top:y});
  const[d,setD]=useState({name:box.name||'',color:box.color||'',time:box.time||'',loc:box.loc||''});
  const dRef=useRef(d);dRef.current=d;
  const done=useRef(false);
  const save=()=>{if(done.current)return;done.current=true;onSave(dRef.current);onClose();};
  const cancel=()=>{done.current=true;onClose();};
  const[locOpen,setLocOpen]=useState(false);
  const locOpenRef=useRef(false);locOpenRef.current=locOpen;
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;const r=el.getBoundingClientRect(),m=8;
    setPos({left:Math.max(m,Math.min(x,window.innerWidth-r.width-m)),top:Math.max(m,Math.min(y,window.innerHeight-r.height-m))});},[x,y]);
  useEffect(()=>{
    const down=e=>{if(ref.current&&!ref.current.contains(e.target))save();};
    const key=e=>{if(e.key!=='Escape')return;e.stopPropagation();if(locOpenRef.current)setLocOpen(false);else cancel();};
    document.addEventListener('mousedown',down,true);document.addEventListener('keydown',key,true);
    const t=setTimeout(()=>{const i=ref.current&&ref.current.querySelector('input');if(i)i.focus();},30);
    return()=>{clearTimeout(t);document.removeEventListener('mousedown',down,true);document.removeEventListener('keydown',key,true);};
  },[]);
  const set=(k,v)=>setD(o=>({...o,[k]:v}));
  const col=d.color||(type&&type.color)||'#94a3b8';
  const enter=e=>{if(e.key==='Enter'){e.preventDefault();save();}};
  return ReactDOM.createPortal(<div ref={ref} className="rpbx" role="dialog" aria-label={L('Antrenmanı düzenle','Edit training')} style={{...pos,'--tc':col}}
      onClick={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}>
    <div className="rpbx-h"><i/>{L('Antrenmanı düzenle','Edit training')}
      {type&&<span title={L('Türü','Its type')}>{type.name}</span>}</div>
    <label className="rpbx-f"><span>{L('İsim','Name')}</span>
      <input value={d.name} maxLength={40} placeholder={(type&&type.name)||L('Antrenman adı','Training name')}
        onChange={e=>set('name',e.target.value)} onKeyDown={enter}/></label>
    <div className="rpbx-row">
      <label className="rpbx-f rpbx-t"><span>{L('Saat','Time')}</span>
        <input type="time" value={d.time} onChange={e=>set('time',e.target.value)} onKeyDown={enter}/></label>
      <div className="rpbx-f"><span>{L('Lokasyon','Location')}</span>
        {(()=>{const q=d.loc.trim().toLocaleLowerCase('tr');
          const list=(locs||[]).filter(l=>!q||l.toLocaleLowerCase('tr').includes(q));
          return(<div className={'rpbx-loc'+(locOpen?' open':'')}>
            <input value={d.loc} maxLength={40} placeholder={L('ör. Ağırlık salonu','e.g. Weight room')} aria-label={L('Lokasyon','Location')}
              role="combobox" aria-expanded={locOpen} aria-autocomplete="list"
              onChange={e=>{set('loc',e.target.value);setLocOpen(true);}} onFocus={()=>setLocOpen(true)}
              onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setLocOpen(true);
                const b=e.currentTarget.parentNode.querySelector('.rpbx-loc-i');if(b)b.focus();}else enter(e);}}/>
            {(locs||[]).length>0&&<button type="button" className="rpbx-loc-car" tabIndex={-1} aria-label={L('Kayıtlı lokasyonlar','Saved locations')}
              onClick={()=>setLocOpen(o=>!o)}><SpChev/></button>}
            {locOpen&&list.length>0&&<div className="rpbx-loc-l" role="listbox">
              {list.map(l=><div key={l} className={'rpbx-loc-r'+(l===d.loc?' on':'')}>
                <button type="button" role="option" aria-selected={l===d.loc} className="rpbx-loc-i"
                  onClick={()=>{set('loc',l);setLocOpen(false);}}
                  onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();
                    const r=e.currentTarget.parentNode[e.key==='ArrowDown'?'nextSibling':'previousSibling'];
                    const b=r&&r.querySelector('.rpbx-loc-i');if(b)b.focus();}}}>{l}</button>
                <button type="button" className="rpbx-loc-x" aria-label={L(`${l} lokasyonunu listeden sil`,`Remove ${l} from the list`)}
                  title={L('Listeden sil','Remove from the list')} onClick={()=>onDelLoc(l)}>×</button>
              </div>)}
            </div>}
          </div>);})()}
      </div>
    </div>
    <div className="rpbx-f"><span>{L('Renk','Colour')}</span>
      <div className="rpbx-sws" role="radiogroup" aria-label={L('Renk','Colour')}>
        {RP_COLORS.map(c=><button key={c} type="button" role="radio" aria-checked={col===c} aria-label={c}
          className={'rpbx-sw'+(col===c?' on':'')} style={{background:c}} onClick={()=>set('color',c)}/>)}
        <label className={'rpbx-sw rpbx-cust'+(RP_COLORS.includes(col)?'':' on')} title={L('Özel renk','Custom colour')}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(col)?col:'#94a3b8'} onChange={e=>set('color',e.target.value)}/></label>
      </div>
      {d.color&&type&&<button type="button" className="rpbx-reset" onClick={()=>set('color','')}>
        <i style={{background:type.color}}/>{L('Türün rengine dön','Back to the type\'s colour')}</button>}
    </div>
    <div className="rpbx-act">
      <button type="button" className="rpbx-del" onClick={()=>{done.current=true;onDelete();onClose();}}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        {L('Sil','Delete')}</button>
      <span style={{flex:1}}/>
      <button type="button" className="btn xs sec" onClick={cancel}>{L('Vazgeç','Cancel')}</button>
      <button type="button" className="btn xs" onClick={save}>{L('Kaydet','Save')}</button>
    </div>
  </div>,document.body);
}
function RoughCalendar({team,updateTeam,rows}){
  const s=team.setup;
  const types=rpTypes(s);
  const dayMap=(s.roughPlan&&s.roughPlan.days)||{};
  const save=patch=>updateTeam(team.id,{setup:{...s,roughPlan:{...(s.roughPlan||{}),types,days:dayMap,...patch}}});
  const[mk,setMk]=useState(()=>{const tk=fmt(today).slice(0,7);
    if(s.seasonStart&&s.seasonEnd&&tk>=s.seasonStart.slice(0,7)&&tk<=s.seasonEnd.slice(0,7))return tk;
    return(s.seasonStart||fmt(today)).slice(0,7);});
  const[menu,setMenu]=useState(null);       // day key whose "+" menu is open
  const[editing,setEditing]=useState(false);
  const[over,setOver]=useState(null);       // day key under a drag
  const[boxEd,setBoxEd]=useState(null);     // {k,i,x,y}: the box whose editor is open
  const press=useRef(null);
  const y=+mk.slice(0,4),m=+mk.slice(5,7)-1;
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  const wkStarts=[];for(let c=sow(first);c<=last;c=addD(c,7))wkStarts.push(c);
  const shift=n=>{setMenu(null);setMk(fmt(new Date(y,m+n,1)).slice(0,7));};
  const MNF=REPORT_LANG==='tr'?MN_TR:MN_EN;
  const tk=fmt(today);
  const rowBy={};rows.forEach(r=>{rowBy[r.week]=r;});
  const compsBy={};((s.competitions)||[]).forEach(c=>{if(c&&c.date)(compsBy[c.date]=compsBy[c.date]||[]).push(c);});
  const typeBy={};types.forEach(t=>{typeBy[t.id]=t;});
  /* Saved locations: kept in roughPlan.locs once there is one; before that, read off the
     boxes already carrying a location. */
  const locs=(s.roughPlan&&Array.isArray(s.roughPlan.locs))?s.roughPlan.locs
    :[...new Set(Object.values(dayMap).flatMap(l=>(l||[]).map(e=>(rpBox(e)||{}).loc).filter(Boolean)))];
  const sortLocs=a=>[...a].sort((p,q)=>p.localeCompare(q,REPORT_LANG==='tr'?'tr':'en'));
  const delLoc=l=>save({locs:locs.filter(x=>x!==l)});
  const inSeason=k=>(!s.seasonStart||k>=s.seasonStart)&&(!s.seasonEnd||k<=s.seasonEnd);
  const setDays=nd=>save({days:nd});
  const setDay=(k,list)=>{const nd={...dayMap};if(list.length)nd[k]=rpIds(list);else delete nd[k];setDays(nd);};
  const add=(k,tid)=>setDay(k,[...(dayMap[k]||[]),{id:uid(),t:tid}]);
  const removeAt=(k,i)=>setDay(k,(dayMap[k]||[]).filter((_,j)=>j!==i));
  /* A box with nothing of its own left is just its id and type. */
  const editAt=(k,i,draft)=>{const b=rpBox((dayMap[k]||[])[i]);if(!b)return;
    const n={id:b.id||uid(),t:b.t};['name','color','time','loc'].forEach(f=>{const v=String(draft[f]||'').trim();if(v)n[f]=v;});
    const t=typeBy[b.t];if(t&&n.name===t.name)delete n.name;if(t&&n.color===t.color)delete n.color;
    const nd={...dayMap,[k]:rpIds((dayMap[k]||[]).map((e,j)=>j===i?n:e))};
    const known=n.loc&&locs.some(l=>l.toLocaleLowerCase('tr')===n.loc.toLocaleLowerCase('tr'));
    save({days:nd,...(n.loc&&!known?{locs:sortLocs([...locs,n.loc])}:{})});};
  const move=(from,i,to)=>{if(from===to)return;const a=rpIds(dayMap[from]);const t=a.splice(i,1)[0];if(!t)return;
    const nd={...dayMap};if(a.length)nd[from]=a;else delete nd[from];nd[to]=[...rpIds(nd[to]),t];setDays(nd);};
  const onDrop=(e,k)=>{e.preventDefault();setOver(null);let d=null;
    try{d=JSON.parse(e.dataTransfer.getData('text/plain'));}catch(err){return;}
    if(d&&d.from)move(d.from,d.i,k);};
  const openEd=(k,i,px,py)=>{setMenu(null);setBoxEd({k,i,x:px,y:py});};
  const pressStart=(e,k,i)=>{const t=e.touches&&e.touches[0];if(!t)return;clearTimeout(press.current);
    press.current=setTimeout(()=>openEd(k,i,t.clientX,t.clientY),550);};
  const pressEnd=()=>clearTimeout(press.current);
  useEffect(()=>()=>clearTimeout(press.current),[]);
  let total=0;Object.entries(dayMap).forEach(([k,l])=>{if(k.slice(0,7)===mk)total+=(l||[]).filter(e=>rpView(e,typeBy)).length;});
  const updType=(id,patch)=>save({types:types.map(t=>t.id===id?{...t,...patch}:t)});
  const addType=()=>{const used=new Set(types.map(t=>t.color));
    save({types:[...types,{id:uid(),name:L('Yeni tür','New type'),color:RP_COLORS.find(c=>!used.has(c))||RP_COLORS[0]}]});};
  const delType=t=>{const n=Object.values(dayMap).reduce((a,l)=>a+(l||[]).filter(x=>(rpBox(x)||{}).t===t.id).length,0);
    if(n&&!confirm(L(`"${t.name}" takvimde ${n} yerde kullanılıyor. Tür ve bu kutucuklar silinsin mi?`,
      `"${t.name}" is placed ${n} time${n>1?'s':''} on the calendar. Delete the type and those boxes?`)))return;
    const nd={};Object.entries(dayMap).forEach(([k,l])=>{const a=(l||[]).filter(x=>(rpBox(x)||{}).t!==t.id);if(a.length)nd[k]=a;});
    save({types:types.filter(x=>x.id!==t.id),days:nd});};
  const clearMonth=()=>{if(!total)return;
    if(!confirm(L(`${MNF[m]} ${y} ayındaki ${total} kutucuk silinsin mi?`,`Delete the ${total} boxes placed in ${MNF[m]} ${y}?`)))return;
    const nd={};Object.entries(dayMap).forEach(([k,l])=>{if(k.slice(0,7)!==mk)nd[k]=l;});setDays(nd);};
  const edBox=boxEd&&rpBox((dayMap[boxEd.k]||[])[boxEd.i]);
  return(<div className="rp">
    <div className="rp-top">
      <div className="rp-nav">
        <button type="button" className="rp-nb" onClick={()=>shift(-1)} aria-label={L('Önceki ay','Previous month')}>‹</button>
        <div className="rp-mn"><b>{MNF[m]}</b> {y}</div>
        <button type="button" className="rp-nb" onClick={()=>shift(1)} aria-label={L('Sonraki ay','Next month')}>›</button>
        {mk!==tk.slice(0,7)&&<button type="button" className="btn xs sec" onClick={()=>{setMenu(null);setMk(tk.slice(0,7));}}>{L('Bugün','Today')}</button>}
      </div>
      <div className="rp-top-r">
        <span className="rp-total">{L(`Bu ay ${total} antrenman`,`${total} training${total!==1?'s':''} this month`)}</span>
        {total>0&&<button type="button" className="btn xs sec" onClick={clearMonth}>{L('Ayı temizle','Clear month')}</button>}
      </div>
    </div>
    {editing&&<div className="rp-ed">
      <div className="rp-ed-h"><b>{L('Antrenman türleri','Training types')}</b>
        <span>{L('Günün + menüsünde listelenir. Yeni eklenen kutucuk türün adını ve rengini alır.','Listed in a day\'s + menu. A new box takes its type\'s name and colour.')}</span>
        <button type="button" className="btn xs sec" onClick={()=>setEditing(false)}>{L('Bitti','Done')}</button></div>
      {types.map(t=><div key={t.id} className="rp-ed-row" style={{'--tc':t.color}}>
        <span className="rp-ed-sw" aria-hidden="true"/>
        <input className="rp-ed-n" defaultValue={t.name} maxLength={28} aria-label={L('Tür adı','Type name')}
          onBlur={e=>{const v=e.target.value.trim();if(v&&v!==t.name)updType(t.id,{name:v});else e.target.value=t.name;}}
          onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
        <div className="rp-ed-cols" role="radiogroup" aria-label={L('Renk','Colour')}>
          {RP_COLORS.map(c=><button key={c} type="button" role="radio" aria-checked={t.color===c} aria-label={c}
            className={t.color===c?'on':''} style={{background:c}} onClick={()=>updType(t.id,{color:c})}/>)}
          <label className={'rp-ed-cust'+(RP_COLORS.includes(t.color)?'':' on')} title={L('Özel renk','Custom colour')}>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#94a3b8'} onChange={e=>updType(t.id,{color:e.target.value})}/></label>
        </div>
        <button type="button" className="rp-ed-del" onClick={()=>delType(t)} aria-label={L(`${t.name} türünü sil`,`Delete ${t.name}`)}
          title={L('Türü sil','Delete type')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div>)}
      <button type="button" className="rp-ed-add" onClick={addType}>+ {L('Yeni tür ekle','Add a type')}</button>
    </div>}
    <div className="rp-hintbar">{L('Günün + düğmesiyle antrenman ekle. Kutucuğa sağ tıklayarak adını, rengini, saatini ve lokasyonunu düzenle; sürükleyerek başka güne taşı.',
      'Add a training with a day\'s + button. Right-click a box to edit its name, colour, time and location; drag it to move it to another day.')}</div>
    <div className="rp-scroll">
      <div className="rp-grid">
        <div className="rp-hd rp-hd-w">{L('Hafta','Week')}</div>
        {[0,1,2,3,4,5,6].map(i=><div key={i} className={'rp-hd'+(i>4?' we':'')}>{DN[i]}</div>)}
        {wkStarts.map((ws,wi)=>{const wk=fmt(ws),r=rowBy[wk];
          const ph=r&&wltOpt('phase',r.steps.phase),em=r&&wltOpt('emphasis',r.steps.emphasis),em2=r&&wltOpt('emphasis2',r.steps.emphasis2),ld=r&&wltOpt('load',r.steps.load);
          return(<React.Fragment key={wk}>
            <div className={'rp-wk'+(r&&r.current?' cur':'')} style={{'--pc':r?PHASE_COL[r.period]||'#64748b':'transparent'}}>
              {r?<>
                <b>{L('H','W')}{r.idx+1}</b>
                <span style={{'--oc':ph.c}}><i/>{L(ph.l[0],ph.l[1])}</span>
                <span style={{'--oc':em.c}}><i/>{L(em.l[0],em.l[1])}</span>
                {em2&&em2.id!=='none'&&<span style={{'--oc':em2.c}}><i/>{L(em2.l[0],em2.l[1])}</span>}
                <span style={{'--oc':ld.c}}><i/>{L(ld.l[0],ld.l[1])}</span>
              </>:<b className="none">{L('Sezon dışı','Off-season')}</b>}
            </div>
            {[0,1,2,3,4,5,6].map(i=>{const d=addD(ws,i),k=fmt(d),list=dayMap[k]||[],games=compsBy[k]||[];
              const out=d.getMonth()!==m,isT=k===tk,isOpen=menu===k;
              return(<div key={k} className={'rp-day'+(out?' out':'')+(inSeason(k)?'':' off')+(isT?' today':'')+(over===k?' over':'')+(i>4?' we':'')+(isOpen?' open':'')}
                onDragOver={e=>{e.preventDefault();if(over!==k)setOver(k);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(o=>o===k?null:o);}}
                onDrop={e=>onDrop(e,k)}
                onClick={e=>{if(e.target.closest('button,.rp-ses,.rp-menu'))return;setMenu(isOpen?null:k);}}>
                <div className="rp-day-h">
                  <span className="rp-num">{d.getDate()}</span>
                  <button type="button" className="rp-add" aria-label={L(`${fd(k)} için antrenman ekle`,`Add training on ${fd(k)}`)}
                    aria-expanded={isOpen} onClick={()=>setMenu(isOpen?null:k)}>+</button>
                </div>
                <div className="rp-chips">
                  {games.map((c,gi)=><span key={'g'+gi} className="rp-match" title={[c.opponent||c.name,c.comp].filter(Boolean).join(' · ')}>
                    {L('Maç','Game')}{(c.opponent||c.name)?` · ${c.opponent||c.name}`:''}</span>)}
                  {list.map((e,ci)=>{const v=rpView(e,typeBy);if(!v)return null;
                    const meta=[v.time,v.loc].filter(Boolean);
                    return(<div key={ci} className={'calw-ses rp-ses'+(boxEd&&boxEd.k===k&&boxEd.i===ci?' editing':'')} draggable
                      style={{'--sc':v.color}} tabIndex={0} role="button" aria-haspopup="dialog"
                      title={[v.name,...meta].join(' · ')+'\n'+L('Sağ tık: düzenle','Right-click: edit')}
                      onDragStart={ev=>{ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',JSON.stringify({from:k,i:ci}));}}
                      onContextMenu={ev=>{ev.preventDefault();ev.stopPropagation();openEd(k,ci,ev.clientX,ev.clientY);}}
                      onKeyDown={ev=>{if(ev.key==='Enter'||ev.key==='ContextMenu'||(ev.shiftKey&&ev.key==='F10')){ev.preventDefault();
                        const rc=ev.currentTarget.getBoundingClientRect();openEd(k,ci,rc.left,rc.bottom+4);}
                        else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();removeAt(k,ci);}}}
                      onTouchStart={ev=>pressStart(ev,k,ci)} onTouchEnd={pressEnd} onTouchMove={pressEnd} onTouchCancel={pressEnd}>
                      <div className="calw-ses-act" onClick={ev=>ev.stopPropagation()}>
                        <button type="button" className="del" title={L('Kaldır','Remove')} aria-label={L(`${v.name} kaldır`,`Remove ${v.name}`)}
                          onClick={ev=>{ev.stopPropagation();removeAt(k,ci);}}>✕</button>
                      </div>
                      <div className="nm">{v.name}</div>
                      {meta.length>0&&<div className="mt">{v.time&&<span>{v.time}</span>}{v.time&&v.loc&&<span className="sep"/>}{v.loc&&<span className="rp-loc">{v.loc}</span>}</div>}
                    </div>);})}
                </div>
                {isOpen&&<RpAddMenu types={types} alignRight={i>3} up={wi>=2&&wi>=wkStarts.length-2} onClose={()=>setMenu(null)}
                  onPick={tid=>{add(k,tid);setMenu(null);}} onEdit={()=>{setMenu(null);setEditing(true);}}/>}
              </div>);})}
          </React.Fragment>);})}
      </div>
    </div>
    {boxEd&&edBox&&<RpBoxEditor key={boxEd.k+':'+boxEd.i} x={boxEd.x} y={boxEd.y} box={edBox} type={typeBy[edBox.t]||null}
      locs={locs} onDelLoc={delLoc}
      onSave={dr=>editAt(boxEd.k,boxEd.i,dr)} onDelete={()=>removeAt(boxEd.k,boxEd.i)} onClose={()=>setBoxEd(null)}/>}
  </div>);
}

/* ---- Planned Microcycles ------------------------------------------------------
   The season (or one month) week by week: target vs actual load, or the volume ×
   intensity profile the load levels set. */
function MicrocycleChart({rows,months,initialMonth}){
  const[view,setView]=useState('month');
  const[mode,setMode]=useState('load');
  const[mon,setMon]=useState(initialMonth);
  const keys=months.map(x=>x.k);
  const cur=keys.includes(mon)?mon:(keys[0]||'');
  /* A week that straddles two months shows up under both, so none falls out of the monthly view. */
  const cw=view!=='month'||!cur?rows:rows.filter(w=>w.week.slice(0,7)===cur||w.end.slice(0,7)===cur);
  const labels=cw.map(w=>[`${L('H','W')}${w.idx+1}`,fd(w.week).slice(0,5)]);
  const title=items=>{const w=cw[items[0].dataIndex];return w?`${L('H','W')}${w.idx+1} · ${fd(w.week).slice(0,5)} – ${fd(w.end).slice(0,5)}`:'';};
  const after=items=>{const w=cw[items[0].dataIndex];return w?WLT_STEPS.map(st=>wltLbl(st.key,w.steps[st.key])).filter(Boolean).join(' · '):'';};
  const legend={position:'top',align:'end',labels:{color:'#e5e7eb',font:{size:12,weight:'600',family:"'Archivo','Space Grotesk',sans-serif"},usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:14}};
  const xs={...CHART_DARK.scales.x,ticks:{...CHART_DARK.scales.x.ticks,autoSkip:view!=='month',maxRotation:0,font:{size:10}}};
  const pt=c=>({pointRadius:view==='month'?4:0,pointBackgroundColor:c,pointBorderColor:'#0f1115',pointHoverRadius:5,pointHoverBackgroundColor:c,pointHoverBorderColor:'#fff',pointHoverBorderWidth:2});
  const data=mode==='load'
    ?{labels,datasets:[
      {label:L('Hedeflenen','Target'),data:cw.map(w=>w.target||0),backgroundColor:'rgba(148,163,184,.22)',borderColor:'rgba(148,163,184,.75)',borderWidth:1,borderRadius:3,categoryPercentage:.78,barPercentage:.92},
      {label:L('Gerçekleşen','Actual'),data:cw.map(w=>w.au),backgroundColor:cw.map(w=>w.ratio!=null&&w.ratio>100?'#f59e0b':'#2dd4a7'),borderRadius:3,categoryPercentage:.78,barPercentage:.92}]}
    :{labels,datasets:[
      {label:L('Hacim','Volume'),data:cw.map(w=>Number(w.volume)||0),borderColor:'#3b6ef5',backgroundColor:'rgba(59,110,245,.16)',tension:.4,fill:true,borderWidth:2,...pt('#3b6ef5')},
      {label:L('Şiddet','Intensity'),data:cw.map(w=>Number(w.intensity)||0),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.14)',tension:.4,fill:true,borderWidth:2,...pt('#f59e0b')}]};
  const opts={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},hover:{mode:'index',intersect:false},
    scales:{x:xs,y:mode==='load'?{...CHART_DARK.scales.y,suggestedMax:1000,ticks:{...CHART_DARK.scales.y.ticks,precision:0,callback:v=>nfAU(v)}}:{...CHART_DARK.scales.y,suggestedMax:110}},
    plugins:{legend,tooltip:{mode:'index',intersect:false,callbacks:{title,afterTitle:after,
      label:i=>mode==='load'?`${i.dataset.label}: ${nfAU(i.parsed.y)} AU`:`${i.dataset.label}: ${i.parsed.y}%`}}}};
  return(<div className="sp-mc">
    <div className="sp-bar-row">
      <div className="sp-seg" role="group" aria-label={L('Gösterilen','Shown')}>
        <button type="button" className={mode==='load'?'on':''} aria-pressed={mode==='load'} onClick={()=>setMode('load')}>{L('Hedef · Gerçekleşen','Target · Actual')}</button>
        <button type="button" className={mode==='vi'?'on':''} aria-pressed={mode==='vi'} onClick={()=>setMode('vi')}>{L('Hacim · Şiddet','Volume · Intensity')}</button>
      </div>
      <div className="sp-seg" role="group" aria-label={L('Dönem','Range')}>
        <button type="button" className={view==='month'?'on':''} aria-pressed={view==='month'} onClick={()=>setView('month')}>{L('Aylık','Monthly')}</button>
        <button type="button" className={view==='year'?'on':''} aria-pressed={view==='year'} onClick={()=>setView('year')}>{L('Yıllık','Yearly')}</button>
      </div>
    </div>
    {view==='month'&&<div className="pm-months">
      {months.map(x=><button key={x.k} type="button" className={`pm-month${x.k===cur?' on':''}`} onClick={()=>setMon(x.k)}>
        {x.label}<small>{String(x.year).slice(2)}</small></button>)}
    </div>}
    <div className="chart-box" style={{height:340}}>
      {cw.length===0
        ?<div className="empty-st" style={{margin:0}}>{L('Bu ayda planlı mikrosiklus yok.','No planned microcycle this month.')}</div>
        :<ChartC key={mode+view} type={mode==='load'?'bar':'line'} chartData={data} options={opts}/>}
    </div>
    {mode==='load'&&<div className="sp-mc-foot">{L('Turuncu çubuk: hedefin aşıldığı hafta. Hedefler Haftalık Plan sekmesinden gelir.',
      'Orange bar: a week over its target. Targets come from the Weekly Plan tab.')}</div>}
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
  return(<div className="pm-panel">
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

/* ---- Season Planning --------------------------------------------------------
   One panel for everything the season is planned with, one tab at a time: the weekly
   plan (where most of the work happens, so it opens first), a monthly rough calendar,
   the planned microcycles chart, the period dates and the periodization model. The
   last tab is remembered on this device. */
const SP_TAB_KEY='coachos_season_tab';
const SP_TABS=[
  {id:'weeks',l:['Haftalık Plan','Weekly Plan'],d:['Her haftanın fazını, odağını ve yükünü seç; hedef yükü yaz ve gerçekleşenle karşılaştır.',
    'Choose each week\'s phase, focus and load; set the target load and compare it with what was done.']},
  {id:'month',l:['Aylık Takvim','Monthly Calendar'],d:['Günlere antrenman türleri yerleştirerek ayın kaba taslağını çıkar.',
    'Sketch the month by placing training types on its days.']},
  {id:'chart',l:['Mikrosikluslar','Microcycles'],d:['Sezonun haftalık hedef ve gerçekleşen yükü ya da hacim–şiddet profili.',
    'The season\'s weekly target and actual load, or its volume–intensity profile.']},
  {id:'dates',l:['Faz Tarihleri','Period Dates'],d:['Makrosiklüsün dört fazının başlangıç ve bitiş tarihleri.',
    'Start and end dates of the macrocycle\'s four periods.']},
  {id:'model',l:['Periyotlama Modeli','Periodization Model'],d:['Her sezon aşamasında hangi periyotlama modelinin uygulanacağı.',
    'Which periodization model each season phase runs.']},
];
function SeasonPlanning({team,updateTeam,weeks,periods,months,initialMonth,datesTab,modelTab}){
  const[tab,setTabS]=useState(()=>{try{const t=localStorage.getItem(SP_TAB_KEY);if(SP_TABS.some(x=>x.id===t))return t;}catch(e){}return'weeks';});
  const setTab=t=>{setTabS(t);try{localStorage.setItem(SP_TAB_KEY,t);}catch(e){}};
  const[focusWeek,setFocusWeek]=useState(null);
  const plan=useMemo(()=>wltRows(team,weeks),[team.weekOverrides,team.days,team.athletes,team.setup,weeks]);
  const cur=plan.rows.find(r=>r.current);
  const meta=SP_TABS.find(x=>x.id===tab)||SP_TABS[0];
  const tabRefs=useRef({});
  const onKey=e=>{const i=SP_TABS.findIndex(x=>x.id===tab);let j=null;
    if(e.key==='ArrowRight')j=(i+1)%SP_TABS.length;else if(e.key==='ArrowLeft')j=(i-1+SP_TABS.length)%SP_TABS.length;
    else if(e.key==='Home')j=0;else if(e.key==='End')j=SP_TABS.length-1;
    if(j==null)return;e.preventDefault();setTab(SP_TABS[j].id);const el=tabRefs.current[SP_TABS[j].id];if(el)el.focus();};
  return(<div className="panel sp">
    <div className="sp-head">
      <div className="sp-head-t">
        <h2>{L('Sezon Planlaması','Season Planning')}</h2>
        <p>{L(meta.d[0],meta.d[1])}</p>
      </div>
      {cur&&<button type="button" className="sp-cur" style={{'--pc':PHASE_COL[cur.period]||'#64748b'}}
        onClick={()=>{setTab('weeks');setFocusWeek({k:cur.week,n:Date.now()});}}
        title={L('Bu haftanın kartına git','Go to this week\'s card')}>
        <span className="sp-cur-k">{L('Bu hafta','This week')}</span>
        <b>{L('H','W')}{cur.idx+1}</b>
        <span className="sp-cur-v">{WLT_STEPS.map(st=>wltLbl(st.key,cur.steps[st.key])).filter(Boolean).join(' · ')}</span>
        {cur.ratio!=null&&<span className="sp-cur-p">{spPct(cur.ratio)}</span>}
      </button>}
    </div>
    <div className="sp-tabs" role="tablist" aria-label={L('Sezon planlaması bölümleri','Season planning sections')} onKeyDown={onKey}>
      {SP_TABS.map(t=><button key={t.id} ref={el=>{tabRefs.current[t.id]=el;}} type="button" role="tab" id={'sp-tab-'+t.id}
        aria-selected={tab===t.id} aria-controls="sp-tabpanel" tabIndex={tab===t.id?0:-1}
        className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}>{L(t.l[0],t.l[1])}</button>)}
    </div>
    <div className="sp-body" role="tabpanel" id="sp-tabpanel" aria-labelledby={'sp-tab-'+tab} key={tab}>
      {tab==='weeks'&&<WeeklyPlanTab team={team} updateTeam={updateTeam} plan={plan} periods={periods} focusWeek={focusWeek}/>}
      {tab==='month'&&<RoughCalendar team={team} updateTeam={updateTeam} rows={plan.rows}/>}
      {tab==='chart'&&<MicrocycleChart rows={plan.rows} months={months} initialMonth={initialMonth}/>}
      {tab==='dates'&&datesTab}
      {tab==='model'&&modelTab}
    </div>
  </div>);
}
/* What each macrocycle phase is for — shown when the pointer rests on a period's name in
   Season Planning → Period Dates. */
const PHASE_INFO=[
  {id:'gp',tr:{t:'Genel Hazırlık',w:'Sezon öncesi hazırlığın ilk aşaması.',
    d:'Temel kuvvet, aerobik dayanıklılık, mobilite ve hareket kalitesinin geliştirilmesi hedeflenir. Antrenman hacmi kademeli artırılarak daha yoğun yüklenmelere fiziksel altyapı oluşturulur.'},
    en:{t:'General Preparation',w:'The first stage of pre-season preparation.',
    d:'The aim is to develop base strength, aerobic endurance, mobility and movement quality. Training volume is raised gradually, building the physical foundation for heavier loading.'}},
  {id:'sp',tr:{t:'Özel Hazırlık',w:'Sezon öncesi hazırlığın son aşaması.',
    d:'Maksimal kuvvet, patlayıcı güç, sürat, çeviklik ve branşa özgü kondisyon geliştirilir. Antrenmanların özgüllüğü artırılarak sporcu müsabaka taleplerine hazırlanır.'},
    en:{t:'Specific Preparation',w:'The last stage of pre-season preparation.',
    d:'Maximal strength, explosive power, speed, agility and sport-specific conditioning are developed. Training becomes more specific, preparing the athlete for the demands of competition.'}},
  {id:'comp',tr:{t:'Müsabaka',w:'Müsabaka sezonu boyunca.',
    d:'Kazanılan fiziksel özelliklerin korunması ve performansın sürdürülmesi amaçlanır. Antrenman yükleri maç takvimine göre düzenlenerek yorgunluk ve toparlanma süreçleri yönetilir.'},
    en:{t:'Competition',w:'Throughout the competitive season.',
    d:'The aim is to maintain the physical qualities already gained and sustain performance. Training loads are arranged around the match calendar so fatigue and recovery can be managed.'}},
  {id:'trans',tr:{t:'Geçiş',w:'Sezon sonu ve sezonlar arası.',
    d:'Fiziksel ve psikolojik toparlanma ön plandadır. Antrenman yükleri azaltılarak aktif dinlenme ve bireysel eksikliklere yönelik çalışmalarla yeni sezona hazırlık desteklenir.'},
    en:{t:'Transition',w:'End of season and between seasons.',
    d:'Physical and psychological recovery comes first. Loads are reduced, and active rest plus work on individual weaknesses supports preparation for the new season.'}},
];
/* ===== Competition Dates — month view =====
   The same fixture list laid out as a month: Monday-first grid, every fixture a chip on
   its day (opponent, then the score and result once written, else the league). It opens
   on the current month when it holds a fixture, otherwise on the next month that does.
   Clicking a chip hands the row back to the list (onPick) so it can be edited there; the
   + on an empty day adds a fixture on that date (onAdd). */
function CompMonthCal({list,ourAbbr,onPick,onAdd,month:mk,setMonth:setMk}){
  const byDay=useMemo(()=>{const m={};(list||[]).forEach((c,i)=>{if(c&&c.date)(m[c.date]=m[c.date]||[]).push({c,i});});return m;},[list]);
  const keys=useMemo(()=>[...new Set(Object.keys(byDay).map(d=>d.slice(0,7)))].sort(),[byDay]);
  const tk=fmt(today),tm=tk.slice(0,7);
  const def=keys.includes(tm)?tm:(keys.find(k=>k>tm)||keys[keys.length-1]||tm);
  const cur=mk||def;
  const y=Number(cur.slice(0,4)),mo=Number(cur.slice(5,7))-1;
  const shift=n=>{const d=new Date(y,mo+n,1);setMk(fmt(d).slice(0,7));};
  const first=new Date(y,mo,1),lead=(first.getDay()+6)%7,dim=new Date(y,mo+1,0).getDate();
  const cells=[];for(let i=0;i<lead;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(fmt(new Date(y,mo,d)));
  while(cells.length%7)cells.push(null);
  const inMonth=(list||[]).filter(c=>c&&c.date&&c.date.slice(0,7)===cur);
  const tally={w:0,l:0,d:0};inMonth.forEach(c=>{const r=compResult(c);if(r)tally[r.k]++;});
  const MNL=REPORT_LANG==='tr'?MN_TR:MN_EN;
  return(<div className="cmc">
    <div className="cmc-bar">
      <button type="button" className="cmc-nav" onClick={()=>shift(-1)} aria-label={L('Önceki ay','Previous month')}>‹</button>
      <b className="cmc-title">{MNL[mo]} {y}</b>
      <button type="button" className="cmc-nav" onClick={()=>shift(1)} aria-label={L('Sonraki ay','Next month')}>›</button>
      <span className="cmc-sum">{L(`${inMonth.length} maç`,`${inMonth.length} fixtures`)}
        {(tally.w+tally.l+tally.d)>0&&<em>{L(`${tally.w}G · ${tally.l}M${tally.d?` · ${tally.d}B`:''}`,`${tally.w}W · ${tally.l}L${tally.d?` · ${tally.d}D`:''}`)}</em>}</span>
      {cur!==tm&&<button type="button" className="btn sec sm cmc-today" onClick={()=>setMk(tm)}>{L('Bugün','Today')}</button>}
    </div>
    {keys.length>1&&<div className="pm-months cmc-months">
      {keys.map(k=>{const n=(list||[]).filter(c=>c&&c.date&&c.date.slice(0,7)===k).length;
        return(<button key={k} type="button" className={`pm-month${k===cur?' on':''}`} onClick={()=>setMk(k)}>
          {MN[Number(k.slice(5,7))-1]}<small>{k.slice(2,4)} · {n}</small></button>);})}
    </div>}
    <div className="cmc-grid" role="grid" aria-label={`${MNL[mo]} ${y}`}>
      {[0,1,2,3,4,5,6].map(i=><div key={'h'+i} className="cmc-dn">{DN[i]}</div>)}
      {cells.map((d,i)=>{
        if(!d)return<div key={'e'+i} className="cmc-cell out"/>;
        const evs=byDay[d]||[];
        return(<div key={d} className={'cmc-cell'+(d===tk?' today':'')+(evs.length?' has':'')}>
          <div className="cmc-dh"><span className="cmc-dnum">{Number(d.slice(8))}</span>
            <button type="button" className="cmc-add" onClick={()=>onAdd(d)}
              title={L('Bu güne müsabaka ekle','Add a fixture on this day')} aria-label={L('Bu güne müsabaka ekle','Add a fixture on this day')}>+</button></div>
          {evs.map(({c,i:idx})=>{const r=compResult(c);const opp=c.opponent||c.name||L('Müsabaka','Fixture');
            const oppA=c.oppAbbr||compAbbr(c.opponent||c.name)||L('RAK','OPP');
            const hasScore=String(c.scoreFor??'').trim()!==''&&String(c.scoreAgainst??'').trim()!=='';
            const tip=[opp,c.comp,c.location,hasScore?`${ourAbbr} ${c.scoreFor}–${c.scoreAgainst} ${oppA}`:''].filter(Boolean).join(' · ');
            return(<button key={c.srcId||idx} type="button" className={'cmc-ev'+(r?' '+r.k:'')+(d<tk&&!hasScore?' past':'')}
              onClick={()=>onPick(idx)} title={tip}>
              <span className="cmc-opp">{opp}</span><span className="cmc-oppa">{oppA}</span>
              {hasScore
                ?<span className="cmc-sc"><i>{ourAbbr}</i> {c.scoreFor}–{c.scoreAgainst} <i>{oppA}</i>{r&&<b className={'cmp-res '+r.k}>{r.t}</b>}</span>
                :(c.comp||c.location)&&<span className="cmc-meta">{c.comp||c.location}</span>}
            </button>);})}
        </div>);})}
    </div>
  </div>);
}
function SeasonPlan({team,updateTeam,periods,weeks}){
  const s=team.setup;
  const total=diffD(s.seasonStart,s.seasonEnd);
  // The fixture list is a long read-only-most-of-the-time list, so it opens folded.
  const[compOpen,setCompOpen]=useState(false);
  /* List or month view of the fixtures; the choice is remembered on this device. A chip
     clicked in the month view opens the list on that row and flashes it. */
  const[compView,setCompViewS]=useState(()=>{try{return localStorage.getItem('cmpView')==='cal'?'cal':'list';}catch(e){return'list';}});
  const setCompView=v=>{setCompViewS(v);try{localStorage.setItem('cmpView',v);}catch(e){}};
  const[compFlash,setCompFlash]=useState(null);
  const[compMonth,setCompMonth]=useState(null);   // month shown in the month view, kept across list ↔ month
  useEffect(()=>{if(compFlash==null||compView!=='list')return;
    const el=document.getElementById('cmp-row-'+compFlash);
    if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});
    const t=setTimeout(()=>setCompFlash(null),1800);return()=>clearTimeout(t);},[compFlash,compView]);
  /* The season runs from the first period's start to the last period's end — General
     Preparation opens it, Transition closes it. Editing a period date therefore moves the
     season window with it, so the stat row, the weeks and both charts can't drift apart
     from the dates in this table. */
  const updPeriod=(id,field,val)=>{if(!val)return;
    const cur=s.periods||autoPeriods(s);const np=cur.map(p=>p.id===id?{...p,[field]:val}:p);
    updateTeam(team.id,{setup:{...s,periods:np,seasonStart:np[0].start,seasonEnd:np[np.length-1].end}});};
  const u=(k,v)=>updateTeam(team.id,{setup:{...s,[k]:v}});
  /* A row the calendar wrote is the match session's own fixture: what is typed into it
     here is written onto that session as well (and onto the athletes' copies of it), so
     the match window shows the same opponent, league, venue and score. */
  const uc=(i,k,v)=>{
    const c=[...s.competitions];const row={...c[i],[k]:v};c[i]=row;
    let dk=null,ses=null;
    if(row.srcId)Object.entries(team.days||{}).some(([key,d])=>{
      const hit=((d&&d.sessions)||[]).find(x=>String(x.id)===row.srcId);
      if(hit){dk=key;ses=hit;return true;}return false;});
    const patch=ses?compRowToSesPatch(ses,k,v):null;
    if(!patch){u('competitions',c);return;}
    const d0=team.days[dk];const oldS=d0.sessions||[];
    const newS=oldS.map(x=>x===ses?{...x,...patch}:x);
    row.cal={...(row.cal||compCalOf(ses)),[k]:String(v==null?'':v).trim()};
    const upd={setup:{...s,competitions:c},days:{...team.days,[dk]:{...d0,sessions:newS}}};
    if(Array.isArray(team.athletes))upd.athletes=syncSessionsToAthletes(team.athletes,dk,oldS,newS);
    updateTeam(team.id,upd);
  };
  /* Deleting a fixture. A row the calendar wrote is remembered as deleted, so the next
     resync does not bring it back while its session is still on the calendar. */
  const delComp=i=>{
    const c=s.competitions[i];if(!c)return;
    if(!confirm(L(`"${c.opponent||c.name||'Müsabaka'}" (${fd(c.date)}) silinsin mi?`,`Delete "${c.opponent||c.name||'Competition'}" (${fd(c.date)})?`)))return;
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
  const months=useMemo(()=>monthTicks.map(d=>({k:fmt(d).slice(0,7),label:MN[d.getMonth()],year:d.getFullYear()})),[monthTicks]);
  const thisMonth=fmt(today).slice(0,7);
  const initialMonth=months.some(x=>x.k===thisMonth)?thisMonth:((months[0]||{}).k||'');
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
    {/* Season Planning: the weekly plan, a monthly rough calendar, the planned
        microcycles, the period dates and the periodization model, one tab at a time.
        The model and the period dates sit here because they write every week's default
        plan; the fixtures below are what the auto periods are cut around. */}
    <SeasonPlanning team={team} updateTeam={updateTeam} weeks={weeks} periods={periods}
      months={months} initialMonth={initialMonth}
      datesTab={<div className="sp-dates">
        <div className="sp-bar-row">
          <span className="sp-dates-mode">{usingCustom
            ?<span className="tag">{L('ÖZEL','CUSTOM')}</span>
            :<span className="tag" style={{background:'rgba(245,158,11,.15)',color:'var(--yellow)'}}>{L('OTOMATİK','AUTO')}</span>}
            {usingCustom?L('Tarihler elle ayarlandı.','Dates set by hand.'):L('Tarihler sezon ve müsabaka tarihlerinden hesaplanıyor.','Dates are worked out from the season and fixture dates.')}</span>
          {usingCustom&&<button className="btn sec sm" onClick={resetPeriods}>{L('Otomatiğe sıfırla','Reset to auto')}</button>}
        </div>
        <div className="sp-table">
        <table><thead><tr><th>{L('Faz','Period')}</th><th>{L('Başlangıç (gg/aa/yyyy)','Start (dd/mm/yyyy)')}</th><th>{L('Bitiş (gg/aa/yyyy)','End (dd/mm/yyyy)')}</th><th>{L('Süre','Duration')}</th></tr></thead><tbody>
          {periods.map(p=><tr key={p.id}>
            <td title={(()=>{const x=PHASE_INFO.find(i=>i.id===p.id);const y=x&&(REPORT_LANG==='tr'?x.tr:x.en);return y?`${y.w} ${y.d}`:'';})()}><strong style={{color:'var(--text)'}}><span style={{display:'inline-block',width:9,height:9,borderRadius:'50%',marginRight:8,verticalAlign:'middle',background:PHASE_COL[p.id]||'#64748b'}}/>{exLabel(p.name)}</strong></td>
            <td><DateDMY value={p.start} onChange={v=>updPeriod(p.id,'start',v)} style={{width:160}}/></td>
            <td><DateDMY value={p.end} onChange={v=>updPeriod(p.id,'end',v)} style={{width:160}}/></td>
            <td><strong>{diffD(p.start,p.end)+1}</strong> {L('gün','days')} <span className="sp-dim">· {L(`${Math.max(1,Math.round((diffD(p.start,p.end)+1)/7))} hafta`,`${Math.max(1,Math.round((diffD(p.start,p.end)+1)/7))} wk`)}</span></td>
          </tr>)}
        </tbody></table></div>
      </div>}
      modelTab={<PeriodizationModelPanel s={s} periods={periods} set={patch=>updateTeam(team.id,{setup:{...s,...patch}})}/>}/>
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
        {s.competitions.length>0&&<div className="cmp-tools">
          <div className="pm-seg" role="tablist" aria-label={L('Görünüm','View')}>
            <button type="button" className={compView==='list'?'on':''} onClick={()=>setCompView('list')}>{L('Liste','List')}</button>
            <button type="button" className={compView==='cal'?'on':''} onClick={()=>setCompView('cal')}>{L('Aylık Takvim','Month')}</button>
          </div>
        </div>}
        {s.competitions.length>0&&compView==='cal'
          ?<CompMonthCal list={s.competitions} ourAbbr={s.teamAbbr||ourAbbrAuto} month={compMonth} setMonth={setCompMonth}
              onPick={i=>{setCompView('list');setCompFlash(i);}}
              onAdd={d=>{const n=s.competitions.length;
                u('competitions',[...s.competitions,{date:d,name:L('Yeni müsabaka','New fixture'),opponent:'',comp:'',location:'',scoreFor:'',scoreAgainst:''}]);
                setCompView('list');setCompFlash(n);}}/>
        :s.competitions.length===0
          ?<div className="empty-st">{L('Henüz müsabaka yok — takvimde bir seansın odağını Müsabaka yap, gün buraya kendiliğinden düşsün; ya da aşağıdan elle ekle.',
              'No fixtures yet — set a session\'s focus to Competition on the calendar and the day lands here by itself, or add one by hand below.')}</div>
          :<div className="cmp-list">
            {s.competitions.map((c,i)=><div key={c.srcId||i} id={'cmp-row-'+i} className={'cmp-row'+(compFlash===i?' flash':'')}>
              <div className="cmp-f date"><label>{L('Tarih','Date')}</label>
                <DateDMY long value={c.date} onChange={v=>uc(i,'date',v)}/></div>
              <div className="cmp-f grow"><label>{L('Rakip','Opponent')}</label>
                <input value={c.opponent||''} placeholder={c.name||L('rakip takım','opposing team')}
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
  </div>);
}

