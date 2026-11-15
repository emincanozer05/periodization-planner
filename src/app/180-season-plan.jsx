/* =========================================================
   SEASON PLAN (with customizable periods)
   ========================================================= */
/* ---- The three choices a week is planned with -------------------------------
   1 Training Phase — where the week sits in the block; 2 Weekly Focus — the quality it
   builds; 3 Weekly Load — how hard the week is meant to be. Each option carries its own
   explanation in both languages, shown under the open list. A load level also carries a
   target factor (`f`, × the season's "normal week" load) and the volume / intensity
   profile (`v`, `i`) the Planned Microcycles chart draws. */
const WLT_STEPS=[
  {key:'phase',label:['Antrenman Fazı','Training Phase'],opts:[
    {id:'base',c:'#38bdf8',l:['Temel','Foundation'],d:['Genel fiziksel kapasitenin, aerobik kapasitenin, iş kapasitesinin ve temel hareket/kuvvet altyapısının oluşturulduğu dönem.',
      'The period in which general physical capacity, aerobic capacity, work capacity and the basic movement/strength foundation are built.']},
    {id:'accumulation',c:'#3b82f6',l:['Birikim','Accumulation'],d:['Antrenman hacminin ve temel fiziksel kapasitelerin biriktirildiği dönem. Kuvvet, hipertrofi, aerobik kapasite ve iş kapasitesi geliştirilebilir.',
      'The period in which training volume and basic physical capacities are accumulated. Strength, hypertrophy, aerobic capacity and work capacity can be developed.']},
    {id:'intensification',c:'#f59e0b',l:['Yoğunlaştırma','Intensification'],d:['Hacmin görece azaltılıp yoğunluğun artırıldığı dönem. Maksimal kuvvet, kuvvet üretimi ve yüksek kaliteli güç çalışmaları önem kazanır.',
      'The period in which volume is relatively reduced and intensity is raised. Max strength, force production and high-quality power work gain importance.']},
    {id:'realization',c:'#ef4444',l:['Gerçekleştirme','Realization'],d:['Önceki dönemlerde geliştirilen kapasitelerin performansa dönüştürüldüğü dönem. Sürat, güç, patlayıcılık ve özgüllük artar.',
      'The period in which the capacities built earlier are turned into performance. Speed, power, explosiveness and specificity increase.']},
    {id:'transition',c:'#2dd4a7',l:['Geçiş','Transition'],d:['Bir sezon veya antrenman döneminden diğerine geçiş dönemi. Toparlanma, düşük yük ve yeni döneme hazırlık ön plandadır.',
      'The bridge from one season or training block to the next. Recovery, low load and preparing for the next block come first.']},
  ]},
  {key:'emphasis',label:['Haftanın Odağı','Weekly Focus'],opts:[
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
  ]},
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
const wltLbl=(key,id)=>{const o=wltOpt(key,id);return o?L(o.l[0],o.l[1]):'';};
/* Weeks saved before the third choice became the week's load carried a "microcycle
   objective"; each one reads as the load level closest to it. */
const WLT_OBJ_LOAD={preparation:'low',loading:'moderate',overreaching:'high',deload:'deload',peaking:'peaking',competition:'moderate'};
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
  const emphasis=games>0&&!w.taper?'mixed':(WLT_PHASE_EMPH[phase]||'aerobic');
  const load=w.taper?'peaking':(w.period==='trans'||w.focus==='Deload'||w.focus==='Active recovery')?'deload'
    :firstOfPeriod?'low':'moderate';
  return{phase,emphasis,load};
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
    const steps={phase:has('phase',o.phase)?o.phase:def.phase,emphasis:has('emphasis',o.emphasis)?o.emphasis:def.emphasis,
      load:has('load',oLoad)?oLoad:def.load};
    const hand=Number(o.target)>0?Math.round(Number(o.target)):null;
    return{...w,idx:i,end,au,ses,games,steps,set:{phase:has('phase',o.phase),emphasis:has('emphasis',o.emphasis),load:has('load',oLoad)},
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
  const[filter,setFilter]=useState('all');   // all | current | future
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
   Training types (name + colour, editable) dropped onto days: what the month is meant
   to look like before any session is written. Lives in team.setup.roughPlan, so it moves
   with the season. Types are referenced by id, so renaming or recolouring one updates
   every day that carries it. Three ways to place one: drag it from the palette onto a
   day, pick it as a brush and click days, or the day's own "+" menu. A placed box can be
   dragged to another day or removed with its ×. Each row starts with its week's plan
   (phase · focus · load) from the weekly cards, and fixtures show on their day. */
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
function RpAddMenu({types,onPick,onEdit,onClose,alignRight,up}){
  const ref=useRef(null);
  useDDOutside([ref],true,onClose);
  useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[]);
  return(<div className={'rp-menu'+(alignRight?' r':'')+(up?' up':'')} ref={ref} role="menu" onClick={e=>e.stopPropagation()}>
    <div className="rp-menu-h">{L('Antrenman ekle','Add training')}</div>
    {types.map(t=><button key={t.id} type="button" role="menuitem" className="rp-menu-i" style={{'--tc':t.color}} onClick={()=>onPick(t.id)}>
      <i/>{t.name||L('Adsız','Untitled')}</button>)}
    <button type="button" className="rp-menu-e" onClick={onEdit}>{L('Türleri düzenle…','Edit types…')}</button>
  </div>);
}
function RoughCalendar({team,updateTeam,rows}){
  const s=team.setup;
  const types=rpTypes(s);
  const dayMap=(s.roughPlan&&s.roughPlan.days)||{};
  const save=patch=>updateTeam(team.id,{setup:{...s,roughPlan:{types,days:dayMap,...patch}}});
  const[mk,setMk]=useState(()=>{const tk=fmt(today).slice(0,7);
    if(s.seasonStart&&s.seasonEnd&&tk>=s.seasonStart.slice(0,7)&&tk<=s.seasonEnd.slice(0,7))return tk;
    return(s.seasonStart||fmt(today)).slice(0,7);});
  const[menu,setMenu]=useState(null);       // day key whose "+" menu is open
  const[brush,setBrush]=useState(null);     // type id painted with a click
  const[editing,setEditing]=useState(false);
  const[over,setOver]=useState(null);       // day key under a drag
  useEffect(()=>{if(!brush)return;const k=e=>{if(e.key==='Escape')setBrush(null);};
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[brush]);
  const y=+mk.slice(0,4),m=+mk.slice(5,7)-1;
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  const wkStarts=[];for(let c=sow(first);c<=last;c=addD(c,7))wkStarts.push(c);
  const shift=n=>{setMenu(null);setMk(fmt(new Date(y,m+n,1)).slice(0,7));};
  const MNF=REPORT_LANG==='tr'?MN_TR:MN_EN;
  const tk=fmt(today);
  const rowBy={};rows.forEach(r=>{rowBy[r.week]=r;});
  const compsBy={};((s.competitions)||[]).forEach(c=>{if(c&&c.date)(compsBy[c.date]=compsBy[c.date]||[]).push(c);});
  const typeBy={};types.forEach(t=>{typeBy[t.id]=t;});
  const inSeason=k=>(!s.seasonStart||k>=s.seasonStart)&&(!s.seasonEnd||k<=s.seasonEnd);
  const setDays=nd=>save({days:nd});
  const setDay=(k,list)=>{const nd={...dayMap};if(list.length)nd[k]=list;else delete nd[k];setDays(nd);};
  const add=(k,tid)=>setDay(k,[...(dayMap[k]||[]),tid]);
  const removeAt=(k,i)=>setDay(k,(dayMap[k]||[]).filter((_,j)=>j!==i));
  const move=(from,i,to)=>{if(from===to)return;const a=[...(dayMap[from]||[])];const t=a.splice(i,1)[0];if(!t)return;
    const nd={...dayMap};if(a.length)nd[from]=a;else delete nd[from];nd[to]=[...(nd[to]||[]),t];setDays(nd);};
  const copyWeek=ws=>{const nx=addD(ws,7);
    const has=Array.from({length:7},(_,d)=>(dayMap[fmt(addD(nx,d))]||[]).length).some(Boolean);
    if(has&&!confirm(L('Sonraki haftada yerleştirilmiş antrenmanlar var. Bu haftanın düzeniyle değiştirilsin mi?',
      'The next week already has trainings placed. Replace them with this week\'s layout?')))return;
    const nd={...dayMap};
    for(let d=0;d<7;d++){const src=dayMap[fmt(addD(ws,d))],dst=fmt(addD(nx,d));if(src&&src.length)nd[dst]=[...src];else delete nd[dst];}
    setDays(nd);
    /* The copy usually lands in the next month's first week: follow it there. */
    if(fmt(nx).slice(0,7)>mk&&fmt(addD(nx,6)).slice(0,7)>mk)setMk(fmt(nx).slice(0,7));};
  const onDrop=(e,k)=>{e.preventDefault();setOver(null);let d=null;
    try{d=JSON.parse(e.dataTransfer.getData('text/plain'));}catch(err){return;}
    if(!d)return;if(d.t&&typeBy[d.t])add(k,d.t);else if(d.from)move(d.from,d.i,k);};
  const drag=(e,payload)=>{e.dataTransfer.effectAllowed=payload.t?'copy':'move';e.dataTransfer.setData('text/plain',JSON.stringify(payload));};
  const counts={};Object.entries(dayMap).forEach(([k,l])=>{if(k.slice(0,7)===mk)(l||[]).forEach(t=>{counts[t]=(counts[t]||0)+1;});});
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const updType=(id,patch)=>save({types:types.map(t=>t.id===id?{...t,...patch}:t)});
  const addType=()=>{const used=new Set(types.map(t=>t.color));
    save({types:[...types,{id:uid(),name:L('Yeni tür','New type'),color:RP_COLORS.find(c=>!used.has(c))||RP_COLORS[0]}]});};
  const delType=t=>{const n=Object.values(dayMap).reduce((a,l)=>a+(l||[]).filter(x=>x===t.id).length,0);
    if(n&&!confirm(L(`"${t.name}" takvimde ${n} yerde kullanılıyor. Tür ve bu kutucuklar silinsin mi?`,
      `"${t.name}" is placed ${n} time${n>1?'s':''} on the calendar. Delete the type and those boxes?`)))return;
    const nd={};Object.entries(dayMap).forEach(([k,l])=>{const a=(l||[]).filter(x=>x!==t.id);if(a.length)nd[k]=a;});
    if(brush===t.id)setBrush(null);
    save({types:types.filter(x=>x.id!==t.id),days:nd});};
  const clearMonth=()=>{if(!total)return;
    if(!confirm(L(`${MNF[m]} ${y} ayındaki ${total} kutucuk silinsin mi?`,`Delete the ${total} boxes placed in ${MNF[m]} ${y}?`)))return;
    const nd={};Object.entries(dayMap).forEach(([k,l])=>{if(k.slice(0,7)!==mk)nd[k]=l;});setDays(nd);};
  return(<div className={'rp'+(brush?' brushing':'')}>
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
    <div className="rp-pal">
      <div className="rp-pal-l">
        {types.map(t=><button key={t.id} type="button" draggable className={'rp-pt'+(brush===t.id?' on':'')} style={{'--tc':t.color}}
          aria-pressed={brush===t.id} onDragStart={e=>drag(e,{t:t.id})} onClick={()=>setBrush(b=>b===t.id?null:t.id)}
          title={L('Güne sürükle ya da seçip günlere tıkla','Drag onto a day, or pick it and click days')}>
          <i/>{t.name||L('Adsız','Untitled')}{counts[t.id]?<em>{counts[t.id]}</em>:null}</button>)}
        {types.length===0&&<span className="rp-hint">{L('Henüz antrenman türü yok.','No training types yet.')}</span>}
      </div>
      <button type="button" className={'btn xs sec rp-edit'+(editing?' on':'')} aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        {editing?L('Bitti','Done'):L('Türleri düzenle','Edit types')}</button>
    </div>
    {editing&&<div className="rp-ed">
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
    <div className="rp-hintbar">{brush&&typeBy[brush]
      ?<><span className="rp-brush" style={{'--tc':typeBy[brush].color}}><i/>{typeBy[brush].name}</span>
        {L('eklemek için günlere tıkla','click days to add it')} · <button type="button" className="rp-link" onClick={()=>setBrush(null)}>{L('Bitir (Esc)','Done (Esc)')}</button></>
      :L('Bir türü güne sürükle, seçip günlere tıkla ya da günün + düğmesini kullan. Kutucukları günler arasında sürükleyerek taşıyabilirsin.',
        'Drag a type onto a day, pick it and click days, or use a day\'s + button. Drag boxes between days to move them.')}</div>
    <div className="rp-scroll">
      <div className="rp-grid">
        <div className="rp-hd rp-hd-w">{L('Hafta','Week')}</div>
        {[0,1,2,3,4,5,6].map(i=><div key={i} className={'rp-hd'+(i>4?' we':'')}>{DN[i]}</div>)}
        {wkStarts.map((ws,wi)=>{const wk=fmt(ws),r=rowBy[wk];
          const ph=r&&wltOpt('phase',r.steps.phase),em=r&&wltOpt('emphasis',r.steps.emphasis),ld=r&&wltOpt('load',r.steps.load);
          return(<React.Fragment key={wk}>
            <div className={'rp-wk'+(r&&r.current?' cur':'')} style={{'--pc':r?PHASE_COL[r.period]||'#64748b':'transparent'}}>
              {r?<>
                <b>{L('H','W')}{r.idx+1}</b>
                <span style={{'--oc':ph.c}}><i/>{L(ph.l[0],ph.l[1])}</span>
                <span style={{'--oc':em.c}}><i/>{L(em.l[0],em.l[1])}</span>
                <span style={{'--oc':ld.c}}><i/>{L(ld.l[0],ld.l[1])}</span>
              </>:<b className="none">{L('Sezon dışı','Off-season')}</b>}
              <button type="button" className="rp-copy" onClick={()=>copyWeek(ws)}
                title={L('Bu haftanın düzenini sonraki haftaya kopyala','Copy this week\'s layout to the next week')}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h11"/></svg>
                {L('Alt haftaya kopyala','Copy down')}</button>
            </div>
            {[0,1,2,3,4,5,6].map(i=>{const d=addD(ws,i),k=fmt(d),list=dayMap[k]||[],games=compsBy[k]||[];
              const out=d.getMonth()!==m,isT=k===tk,isOpen=menu===k;
              return(<div key={k} className={'rp-day'+(out?' out':'')+(inSeason(k)?'':' off')+(isT?' today':'')+(over===k?' over':'')+(i>4?' we':'')+(isOpen?' open':'')}
                onDragOver={e=>{e.preventDefault();if(over!==k)setOver(k);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(o=>o===k?null:o);}}
                onDrop={e=>onDrop(e,k)}
                onClick={e=>{if(e.target.closest('button,.rp-chip,.rp-menu'))return;if(brush)add(k,brush);else setMenu(isOpen?null:k);}}>
                <div className="rp-day-h">
                  <span className="rp-num">{d.getDate()}</span>
                  <button type="button" className="rp-add" aria-label={L(`${fd(k)} için antrenman ekle`,`Add training on ${fd(k)}`)}
                    aria-expanded={isOpen} onClick={()=>{if(brush)add(k,brush);else setMenu(isOpen?null:k);}}>+</button>
                </div>
                <div className="rp-chips">
                  {games.map((c,gi)=><span key={'g'+gi} className="rp-match" title={[c.opponent||c.name,c.comp].filter(Boolean).join(' · ')}>
                    {L('Maç','Game')}{(c.opponent||c.name)?` · ${c.opponent||c.name}`:''}</span>)}
                  {list.map((tid,ci)=>{const t=typeBy[tid];if(!t)return null;return(
                    <span key={ci} className="rp-chip" draggable style={{'--tc':t.color}} onDragStart={e=>drag(e,{from:k,i:ci})} title={t.name}>
                      <span className="rp-chip-t">{t.name}</span>
                      <button type="button" className="rp-chip-x" onClick={()=>removeAt(k,ci)} aria-label={L(`${t.name} kaldır`,`Remove ${t.name}`)}>×</button>
                    </span>);})}
                </div>
                {isOpen&&<RpAddMenu types={types} alignRight={i>3} up={wi>=2&&wi>=wkStarts.length-2} onClose={()=>setMenu(null)}
                  onPick={tid=>{add(k,tid);setMenu(null);}} onEdit={()=>{setMenu(null);setEditing(true);}}/>}
              </div>);})}
          </React.Fragment>);})}
      </div>
    </div>
  </div>);
}

/* ---- Planned Microcycles ------------------------------------------------------
   The season (or one month) week by week: target vs actual load, or the volume ×
   intensity profile the load levels set. */
function MicrocycleChart({rows,months,initialMonth}){
  const[view,setView]=useState('year');
  const[mode,setMode]=useState('load');
  const[mon,setMon]=useState(initialMonth);
  const keys=months.map(x=>x.k);
  const cur=keys.includes(mon)?mon:(keys[0]||'');
  /* A week that straddles two months shows up under both, so none falls out of the monthly view. */
  const cw=view!=='month'||!cur?rows:rows.filter(w=>w.week.slice(0,7)===cur||w.end.slice(0,7)===cur);
  const labels=cw.map(w=>[`${L('H','W')}${w.idx+1}`,fd(w.week).slice(0,5)]);
  const title=items=>{const w=cw[items[0].dataIndex];return w?`${L('H','W')}${w.idx+1} · ${fd(w.week).slice(0,5)} – ${fd(w.end).slice(0,5)}`:'';};
  const after=items=>{const w=cw[items[0].dataIndex];return w?WLT_STEPS.map(st=>wltLbl(st.key,w.steps[st.key])).join(' · '):'';};
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
    scales:{x:xs,y:mode==='load'?{...CHART_DARK.scales.y,ticks:{...CHART_DARK.scales.y.ticks,callback:v=>nfAU(v)}}:{...CHART_DARK.scales.y,suggestedMax:110}},
    plugins:{legend,tooltip:{mode:'index',intersect:false,callbacks:{title,afterTitle:after,
      label:i=>mode==='load'?`${i.dataset.label}: ${nfAU(i.parsed.y)} AU`:`${i.dataset.label}: ${i.parsed.y}%`}}}};
  return(<div className="sp-mc">
    <div className="sp-bar-row">
      <div className="sp-seg" role="group" aria-label={L('Gösterilen','Shown')}>
        <button type="button" className={mode==='load'?'on':''} aria-pressed={mode==='load'} onClick={()=>setMode('load')}>{L('Hedef · Gerçekleşen','Target · Actual')}</button>
        <button type="button" className={mode==='vi'?'on':''} aria-pressed={mode==='vi'} onClick={()=>setMode('vi')}>{L('Hacim · Şiddet','Volume · Intensity')}</button>
      </div>
      <div className="sp-seg" role="group" aria-label={L('Dönem','Range')}>
        <button type="button" className={view==='year'?'on':''} aria-pressed={view==='year'} onClick={()=>setView('year')}>{L('Yıllık','Yearly')}</button>
        <button type="button" className={view==='month'?'on':''} aria-pressed={view==='month'} onClick={()=>setView('month')}>{L('Aylık','Monthly')}</button>
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
        <span className="sp-cur-v">{WLT_STEPS.map(st=>wltLbl(st.key,cur.steps[st.key])).join(' · ')}</span>
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
/* What each macrocycle phase is for — shown from the "?" on the Season Macrocycle card. */
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
function SeasonPlan({team,updateTeam,periods,weeks}){
  const s=team.setup;
  const total=diffD(s.seasonStart,s.seasonEnd);
  // The fixture list is a long read-only-most-of-the-time list, so it opens folded.
  const[compOpen,setCompOpen]=useState(false);
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
  const[phInfoOpen,setPhInfoOpen]=useState(false);
  useEffect(()=>{if(!phInfoOpen)return;const k=e=>{if(e.key==='Escape')setPhInfoOpen(false);};
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[phInfoOpen]);
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
        <div className="mc-head"><div className="mc-title">{L('Sezon Makrosiklüsü','Season Macrocycle')}<span className="mc-sub">{L(`${modelName} · ${periods.length} faz`,`${modelName} · ${periods.length} phases`)}</span></div>
          <button className="mc-help" onClick={()=>setPhInfoOpen(true)} aria-label={L('Faz bilgisi','Phase info')} title={L('Faz bilgisi','Phase info')}>?</button></div>
        <div className="mc-gantt">
          <div className="mc-axis">
            <div/>
            <div className="mc-axis-tr">
              {todayPct!=null&&<div className="mc-today" style={{left:`${todayPct}%`}}><span>{L('BUGÜN','TODAY')}</span></div>}
              {ticks.map((d,i)=><span key={i} className="mc-mtick" style={{left:`${pctOf(fmt(d))}%`}}>{MN[d.getMonth()]}</span>)}
            </div>
          </div>
          {periods.map((p,pi)=>{const l=pctOf(p.start),r=pctOf(p.end);const wk=Math.max(1,Math.round((diffD(p.start,p.end)+1)/7));
            const nm=exLabel(PHASE_NAME[p.id]||p.name),col=PHASE_COL[p.id]||'#64748b';return(
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
        {phInfoOpen&&<div className="modal-bg" onClick={()=>setPhInfoOpen(false)}>
          <div className="modal mc-info" role="dialog" aria-label={L('Faz bilgisi','Phase info')} onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2 style={{margin:0,fontSize:18}}>{L('Sezon Fazları','Season Phases')}</h2>
              <span style={{flex:1}}/><button className="x-btn" onClick={()=>setPhInfoOpen(false)}>✕</button></div>
            <div className="mc-info-body">
              {PHASE_INFO.map((ph,i)=>{const x=REPORT_LANG==='tr'?ph.tr:ph.en;return(
                <div key={ph.id} className="mc-info-ph">
                  <div className="mc-info-t"><span className="mc-dot" style={{background:PHASE_COL[ph.id]}}/>{i+1}. {x.t}</div>
                  <div className="mc-info-w"><b>{L('Dönem','Period')}:</b> {x.w}</div>
                  <p>{x.d}</p>
                </div>);})}
            </div>
          </div>
        </div>}
      </div>);
    })()}
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
            <td><strong style={{color:'var(--text)'}}><span style={{display:'inline-block',width:9,height:9,borderRadius:'50%',marginRight:8,verticalAlign:'middle',background:PHASE_COL[p.id]||'#64748b'}}/>{exLabel(p.name)}</strong></td>
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
        {s.competitions.length===0
          ?<div className="empty-st">{L('Henüz müsabaka yok — takvimde bir seansın odağını Müsabaka yap, gün buraya kendiliğinden düşsün; ya da aşağıdan elle ekle.',
              'No fixtures yet — set a session\'s focus to Competition on the calendar and the day lands here by itself, or add one by hand below.')}</div>
          :<div className="cmp-list">
            {s.competitions.map((c,i)=><div key={c.srcId||i} className="cmp-row">
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

