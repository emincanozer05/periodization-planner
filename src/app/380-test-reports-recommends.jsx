/* Compact "Development" progression mini-charts (one per metric over time). */
function DevelopmentCharts({tests}){
  const ts=[...(tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(ts.length<1)return null;
  const labels=ts.map(t=>{const d=parseD(t.date);return MN[d.getMonth()];});
  const cards=[
    {t:'Vertical Jump',u:'cm',f:t=>Number(t.verticalJump),up:true,col:'#0080dc',dot:'#0094ff'},
    {t:'CMJ',u:'cm',f:t=>Number(t.cmj),up:true,col:'#f97316',dot:'#fb923c'},
    {t:'Lateral CMJ — R',u:'cm',f:t=>Number(t.lateralCmj?.right),up:true,col:'#a855f7',dot:'#c084fc'},
    {t:'Lateral CMJ — L',u:'cm',f:t=>Number(t.lateralCmj?.left),up:true,col:'#a855f7',dot:'#c084fc'},
    {t:'Squat Jump',u:'cm',f:t=>Number(t.squatJump),up:true,col:'#eab308',dot:'#facc15'},
    {t:'Horizontal Jump',u:'cm',f:t=>Number(t.horizontalJump),up:true,col:'#10b981',dot:'#34d399'},
    {t:'20m Sprint',u:'s',f:t=>Number(t.sprint20m?.time),up:false,col:'#7c3aed',dot:'#a78bfa'},
    {t:'T-Agility',u:'s',f:t=>Number(t.tTest),up:false,col:'#ec4899',dot:'#f472b6'},
    {t:'5-0-5',u:'s',f:t=>Number(t.fiveZeroFive),up:false,col:'#f43f5e',dot:'#fb7185'},
  ];
  const haveAny=cards.some(c=>ts.some(t=>{const v=c.f(t);return !isNaN(v)&&v>0;}));
  if(!haveAny)return null;
  const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',font:{size:9,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,formatter:v=>v==null?'':(+Number(v).toFixed(1))});
  return(<div className="panel"><h2 style={{marginTop:0,fontSize:17}}>📈 Development</h2><div className="rep-dev">
    {cards.map(c=>{const data=ts.map(t=>{const v=c.f(t);return isNaN(v)||v===0?null:v;});
      const valid=data.filter(v=>v!=null);if(valid.length===0)return null;
      const cur=valid[valid.length-1],first=valid[0];
      const imp=valid.length>1&&c.up!=null?+((c.up?cur-first:first-cur).toFixed(2)):null;
      const sign=imp==null?'':(imp>0?'+':'');
      return(<div key={c.t} className="metric-card dev-mini">
        <div className="mc-h"><div className="mc-t">{c.t}</div><div className="mc-u">{c.u}</div></div>
        <div className="mc-val"><span className="mv" style={{color:c.dot}}>{cur}</span>{imp!=null&&imp!==0&&<span className={`md ${imp>0?'pos':'neg'}`}>{sign}{imp}</span>}</div>
        <div className="mc-chart"><ChartC type="line" chartData={{labels,datasets:[
          {label:c.t,data,borderColor:c.col,backgroundColor:c.col,tension:.3,spanGaps:true,borderWidth:2,
            pointRadius:3,pointBackgroundColor:c.dot,pointBorderColor:c.dot,datalabels:dataLbl(c.dot)}
        ]}} options={{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18,bottom:4,left:6,right:6}},
          scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:9},autoSkip:true,maxRotation:0,maxTicksLimit:6},grid:{display:false},border:{display:false}},
            y:{display:false,grid:{display:false},beginAtZero:false}},
          plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
      </div>);})}
  </div></div>);
}

/* NOT MOUNTED ANYWHERE AT THE MOMENT — the athlete's tab bar carries Anthropometric
   (the tape measure) again, and test results are read on the Testing & Assessment
   screen beside the battery they were taken in. Kept whole, the way RecommendsTab and
   ProgramWriterTab are, so it can be put back on a tab without rebuilding it.

   THE ATHLETE'S PROGRESSION, ONE CARD PER MEASUREMENT — AND ONE PANEL PER FAMILY.
   Every number the Testing & Assessment screen collects, the built-in battery and the
   coach's own tests alike, drawn against the dates it was taken on. The card is the very
   card the body-composition charts are drawn in — same size, same two-up grid, same big
   current value with the change beside it, same month labels along the foot — because
   this tab now holds both and a tab made of two different-looking chart styles reads as
   two screens stitched together.
   The families are kept apart under their own headings (Antropometrik, Güç, Sürat…):
   thirty cards in one wall is a list to search through, five panels of four or five is a
   page to read. `cmpMetrics` is the single list the comparison table and the printouts
   already read, so a test added there turns up here without a second list to keep in
   step, and a coach's own test lands in the last panel. A metric nobody has a number for
   is not drawn: an empty card says nothing.
   Direction matters and is not guessed: a sprint that drops by 0.2s IMPROVED, and the
   list says so per metric (`dir:'lo'`). A coach's own test carries no direction, so its
   change is shown without a verdict. */
const PERF_GROUPS=[
  {g:'anthro',tr:'Antropometrik',en:'Anthropometric'},
  {g:'mob',   tr:'Mobilite ve Tarama',en:'Mobility & Screening'},
  {g:'pow',   tr:'Güç',en:'Power'},
  {g:'spd',   tr:'Sürat ve Çeviklik',en:'Speed & Agility'},
  {g:'cust',  tr:'Kulüp Testleri',en:'Club Tests'},
];
/* One colour per card rather than one per family: four charts of the same purple side by
   side stop being four charts. The cycle is the body-composition panel's own — purple,
   blue, orange, green — so the two panels read as one set. */
const PERF_COLS=[['#a855f7','#c084fc'],['#3b82f6','#60a5fa'],['#f97316','#fb923c'],['#10b981','#34d399'],
  ['#22d3ee','#67e8f9'],['#ec4899','#f472b6'],['#eab308','#facc15'],['#8b5cf6','#a78bfa']];
function PerfProgressCharts({tests,customTests}){
  const ts=useMemo(()=>[...(tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date)),[tests]);
  const series=useMemo(()=>cmpMetrics(customTests).map(m=>{
    const data=ts.map(t=>{const v=m.get(t);return(v==null||isNaN(v))?null:+Number(v).toFixed(2);});
    return{m,data,n:data.filter(v=>v!=null).length};
  }).filter(x=>x.n>0),[ts,customTests]);
  if(!ts.length||!series.length)return(<div className="panel">
    <h2 style={{marginTop:0}}>{L('Performans Gelişimi','Performance Progression')}</h2>
    <div className="empty-st">{L('Henüz test sonucu yok — Test ve Değerlendirme sekmesinden bir test al, sonuçlar buraya işlensin.',
      'No test results yet — take a test on the Testing & Assessment screen and the results are drawn here.')}</div>
  </div>);
  // The foot of every card, exactly as Body Composition writes it: the month the test
  // was taken in. A date reads as a date on one card and as noise across twenty.
  const labels=ts.map(t=>MN[parseD(t.date).getMonth()]);
  const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',
    font:{size:10,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,
    formatter:v=>v==null?'':(+Number(v).toFixed(1))});
  // A family the app does not know about (an older record, a hand-edited metric) still
  // gets a panel of its own rather than dropping off the page.
  const groups=[...PERF_GROUPS,...[...new Set(series.map(x=>x.m.g))]
    .filter(g=>!PERF_GROUPS.some(p=>p.g===g)).map(g=>({g,tr:g,en:g}))];
  const card=({m,data},i)=>{
    const[col,dot]=PERF_COLS[i%PERF_COLS.length];
    const valid=data.filter(v=>v!=null);
    const cur=valid[valid.length-1],first=valid[0];
    const diff=valid.length>1?+((cur-first).toFixed(2)):null;
    const fav=(diff==null||diff===0||!m.dir)?null:(m.dir==='lo'?diff<0:diff>0);
    return(<div key={m.id} className="metric-card">
      <div className="mc-h"><div className="mc-t">{cmpLabel(m)}</div><div className="mc-u">{m.u||''}</div></div>
      <div className="mc-val"><span className="mv" style={{color:dot}}>{cur}</span>
        {diff!=null&&diff!==0&&<span className={`md ${fav==null?'':(fav?'pos':'neg')}`}>{diff>0?'+':''}{diff}</span>}</div>
      <div className="mc-chart tall"><ChartC type="line" chartData={{labels,datasets:[
        {label:cmpLabel(m),data,borderColor:col,backgroundColor:col+'22',fill:'origin',tension:.35,spanGaps:true,borderWidth:2.5,
          pointRadius:4,pointHoverRadius:6,pointBackgroundColor:dot,pointBorderColor:'#0d0f13',pointBorderWidth:1.5,
          datalabels:dataLbl(dot)}
      ]}} options={{responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:24,bottom:6,left:8,right:8}},
        scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:10},autoSkip:true,maxRotation:0,maxTicksLimit:7},grid:{display:false},border:{display:false}},
          y:{display:false,grid:{display:false},beginAtZero:false}},
        plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
    </div>);
  };
  let firstPanel=true;
  return(<React.Fragment>
    {groups.map(gr=>{
      const rows=series.filter(x=>x.m.g===gr.g);
      if(!rows.length)return null;
      const lead=firstPanel;firstPanel=false;
      return(<div className="panel" key={gr.g}>
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L(gr.tr,gr.en)}</h2>
          <span style={{fontFamily:"'IBM Plex Mono',ui-monospace,monospace",fontSize:11,color:'var(--dim)'}}>
            {L(`${rows.length} ölçüm · ${ts.length} test`,`${rows.length} measurement${rows.length>1?'s':''} · ${ts.length} test${ts.length>1?'s':''}`)}</span>
        </div>
        {lead&&<div className="help" style={{marginBottom:14}}>{L('Her kutu bir ölçümün ilk testten bugüne seyri. Köşedeki fark ilk sonuçla sonuncusu arasındaki değişimdir — düşmesi iyi olan testlerde (sprint, çeviklik) düşüş yeşil okunur.',
          'Each card is one measurement from the first test to today. The figure in the corner is the change between the first result and the latest — on a test where lower is better (sprints, agility) a drop reads as green.')}</div>}
        {/* Two up, two down — the same grid Body Composition uses, and for the same
            reason: across a full-width panel four cards leave each chart too narrow to
            read a trend off. */}
        <div className="metric-grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
          {rows.map(card)}
        </div>
      </div>);
    })}
  </React.Fragment>);
}

/* Ask AI Coach — inline chatbox that evaluates THIS athlete's test results. */
function AskAICoachBox({ath,setup,ai,exercises}){
  const provider=aiProviderOf(ai);
  const apiKey=aiKeyOf(ai);
  const model=aiModelOf(ai);
  const[msgs,setMsgs]=useState([]);
  const[input,setInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const scrollRef=useRef(null);
  const snap=useMemo(()=>{try{return buildAthleteSnapshot(ath,setup||{},exercises||[]);}catch(e){return '';}},[ath,setup,exercises]);
  const system='You are an elite strength & conditioning assistant coach. Evaluate THIS athlete\'s TEST RESULTS and answer the coach\'s questions concisely and concretely. Base everything ONLY on the provided data — never invent test numbers; if data is missing, say so. Prefer short bullet points, give actual set×rep / %1RM / RPE when suggesting work. Reply in the SAME language as the coach\'s message.\n\n=== ATHLETE DATA ===\n'+snap;
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs,busy]);
  const send=async(text)=>{
    const q=(text!=null?text:input).trim();
    if(!q||busy||!apiKey)return;
    setErr('');const next=[...msgs,{role:'user',content:q}];setMsgs(next);setInput('');setBusy(true);
    try{
      const ans=provider==='anthropic'?await askCoach(apiKey,model,system,next):await askGemini(apiKey,model,system,next);
      setMsgs(m=>[...m,{role:'assistant',content:ans||'(empty response)'}]);
    }catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);}
  };
  return(<div className="aicb">
    <div className="aicb-h">🤖 Ask AI Coach <span>· evaluates test results</span></div>
    {!apiKey
      ?<div className="aicb-empty">Add an API key in the <b>✨ AI Coach</b> panel (bottom-right) to chat about <b>{ath.name}</b>'s results. <b>Gemini is free.</b></div>
      :<React.Fragment>
        <div className="aicb-msgs" ref={scrollRef}>
          {msgs.length===0&&<div className="aicb-hint">Ask anything about {ath.name}'s test results — or tap a suggestion below.</div>}
          {msgs.map((m,i)=><div key={i} className={'aicb-msg '+m.role}><div className="aicb-bub" dangerouslySetInnerHTML={{__html:recMd(m.content)}}/></div>)}
          {busy&&<div className="aicb-msg assistant"><div className="aicb-bub aicb-typing">● ● ●</div></div>}
        </div>
        {err&&<div className="aicb-err">⚠ {err}</div>}
        {msgs.length===0&&<div className="aicb-sugg">
          {['Evaluate these test results','Biggest weakness?','What to train next?'].map(s=><button key={s} disabled={busy} onClick={()=>send(s)}>{s}</button>)}
        </div>}
        <form className="aicb-in" onSubmit={e=>{e.preventDefault();send();}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about the results…" disabled={busy}/>
          <button type="submit" disabled={busy||!input.trim()} title="Send">➤</button>
        </form>
      </React.Fragment>}
  </div>);
}

/* Simple, readable test-results report for an athlete (latest session + history). */
function TestReportsTab({ath,setup,ai,exercises}){
  const num=v=>(v!==''&&v!=null&&!isNaN(Number(v)))?Number(v):null;
  const tests=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=tests.length?tests[tests.length-1]:null;
  const Tile=({k,v,u,raw})=>{const n=raw!==undefined?raw:num(v);if(n==null)return null;return(<div className="rep-tile"><div className="k">{k}</div><div className="v">{n}{u&&<small>{u}</small>}</div></div>);};
  if(!t)return(<div className="empty-st">No test sessions recorded yet. Add results in the <b>Testing &amp; Assessment</b> tab, then come back here.</div>);
  const period=(TEST_PERIODS.find(p=>p.id===t.period)||{}).label||t.period||'';
  const h=num(t.height),w=num(t.weight);const bmi=(h&&w)?(w/((h/100)**2)):null;
  const anthro=[['Height',t.height,'cm'],['Weight',t.weight,'kg'],['Body Fat',t.bodyFat,'%'],['Wingspan',t.wingspan,'cm'],
    ['Leg Length',t.legLength,'cm'],['Sitting Height',t.sittingHeight,'cm']];
  const power=[['Vertical Jump',t.verticalJump,'cm'],['CMJ',t.cmj,'cm'],
    ['Lateral CMJ — R',t.lateralCmj&&t.lateralCmj.right,'cm'],['Lateral CMJ — L',t.lateralCmj&&t.lateralCmj.left,'cm'],
    ['Squat Jump',t.squatJump,'cm'],['Drop Jump',t.dropJump,'RSI'],['Horizontal Jump',t.horizontalJump,'cm']];
  const speed=[['20m Sprint',t.sprint20m&&t.sprint20m.time,'s'],['T-Test',t.tTest,'s'],['5-0-5',t.fiveZeroFive,'s'],['Shuttle Run',t.shuttleRun,'']];
  const circ=t.circ||{};
  const circList=[['Shoulder',circ.shoulder],['Waist',circ.waist],['Hip',circ.hip],['Thigh R',circ.thighRight],['Thigh L',circ.thighLeft],['Calf R',circ.calfRight],['Calf L',circ.calfLeft]];
  const adfR=num(t.ankleDF&&t.ankleDF.right),adfL=num(t.ankleDF&&t.ankleDF.left);
  const asR=num(t.aslr&&t.aslr.right),asL=num(t.aslr&&t.aslr.left);
  const ohs=(t.ohs&&t.ohs.score!==''&&t.ohs.score!=null)?t.ohs.score:null;
  const ybt=ybCalc(t.yBalance);
  const hasAny=arr=>arr.some(([,v])=>num(v)!=null);
  const hasMobility=adfR!=null||adfL!=null||asR!=null||asL!=null||ohs!=null||ybt.compR!=null||ybt.compL!=null;
  return(<div>
    <div className="rep-cols">
      <div className="panel">
        <div className="rep-head"><h2 style={{margin:0,fontSize:17}}>📋 Latest Test Report</h2><div className="rep-date">{fd(t.date)}{period?` · ${period}`:''}</div></div>
        {tests.length>1&&<div className="rep-hist">{tests.slice(0,-1).slice(-6).map((x,i)=><span key={i}>{fd(x.date)}</span>)}</div>}
        {hasAny(anthro)&&<><div className="rep-sec-t">Anthropometrics</div><div className="rep-grid">{anthro.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}{bmi!=null&&<Tile k="BMI" raw={bmi.toFixed(1)}/>}</div></>}
        {hasAny(power)&&<><div className="rep-sec-t">Power / Jumps</div><div className="rep-grid">{power.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}</div></>}
        {hasAny(speed)&&<><div className="rep-sec-t">Speed / Agility</div><div className="rep-grid">{speed.map(([k,v,u])=><Tile key={k} k={k} v={v} u={u}/>)}</div></>}
        {hasMobility&&<><div className="rep-sec-t">Mobility / Movement</div><div className="rep-grid">
          {adfR!=null&&<Tile k="Ankle DF — R" v={adfR} u="°"/>}
          {adfL!=null&&<Tile k="Ankle DF — L" v={adfL} u="°"/>}
          {asR!=null&&<Tile k="ASLR — R" raw={asR+' /3'}/>}
          {asL!=null&&<Tile k="ASLR — L" raw={asL+' /3'}/>}
          {ohs!=null&&<Tile k="Overhead Squat" raw={ohs+' /3'}/>}
          {ybt.compR!=null&&<Tile k="Y Balance — R" raw={ybt.compR+' %'}/>}
          {ybt.compL!=null&&<Tile k="Y Balance — L" raw={ybt.compL+' %'}/>}
        </div></>}
        {hasAny(circList)&&<><div className="rep-sec-t">Body Circumference (cm)</div><div className="rep-grid">{circList.map(([k,v])=><Tile key={k} k={k} v={v} u="cm"/>)}</div></>}
        {t.posture&&t.posture.observations&&<><div className="rep-sec-t">Posture Notes</div><div className="rep-note">{t.posture.observations}</div></>}
        {t.ohs&&t.ohs.observations&&<><div className="rep-sec-t">Overhead Squat Notes</div><div className="rep-note">{t.ohs.observations}</div></>}
        {t.notes&&<><div className="rep-sec-t">Observations &amp; Comments</div><div className="rep-note">{t.notes}</div></>}
      </div>
      <AskAICoachBox ath={ath} setup={setup} ai={ai} exercises={exercises}/>
    </div>
    <DevelopmentCharts tests={ath.tests}/>
  </div>);
}

/* Program Design Assistant. Not mounted anywhere at the moment — the athlete profile's
   Recommendations tab was taken off the tab bar — but kept whole, together with the
   PROGRAM_DESIGN_SYSTEM prompt and PDA_CATS it reads, so it can be put back on a tab
   without rebuilding it. */
function RecommendsTab({ath,updAth,setup,ai,exercises,autoGen,onAutoDone}){
  const[pdBusy,setPdBusy]=useState(false);
  const[pdErr,setPdErr]=useState('');
  const pd=ath.programDesign||null;
  const provider=aiProviderOf(ai);
  const apiKey=aiKeyOf(ai);
  const model=aiModelOf(ai);
  const genPD=async()=>{
    if(pdBusy||!apiKey)return;setPdErr('');setPdBusy(true);
    try{
      const input=buildProgramDesignInput(ath,setup);
      const msgs=[{role:'user',content:'Aşağıdaki sporcu verisini analiz et ve SADECE istenen JSON formatında yanıt ver.\n\n'+JSON.stringify(input,null,2)}];
      // This answer is a long JSON document, so it needs a much larger output
      // budget than the chat calls — and on Gemini the thinking step has to be
      // capped, otherwise it eats the budget and the JSON arrives truncated.
      const ask=()=>provider==='anthropic'
        ?askCoach(apiKey,model,PROGRAM_DESIGN_SYSTEM,msgs,{maxTokens:16000})
        :askGemini(apiKey,model,PROGRAM_DESIGN_SYSTEM,msgs,{maxTokens:16000,json:true,thinkingBudget:0,temperature:0.4});
      // Retry only a parse failure (transient formatting slip) — an API error
      // such as 401/429 propagates as is instead of burning a second call.
      const ans=await ask();
      let data;
      try{data=pdaParse(ans);}
      catch(e){data=pdaParse(await ask());}
      updAth(ath.id,{programDesign:{data,input,at:Date.now(),provider,model}});
    }catch(e){setPdErr(e.message||String(e));}
    finally{setPdBusy(false);}
  };
  // "Ask AI" shortcut: auto-run the analysis once when arriving with no result yet.
  useEffect(()=>{
    if(!autoGen)return;
    if(!pd&&apiKey&&!pdBusy)genPD();
    onAutoDone&&onAutoDone();
  },[autoGen]);
  if(!apiKey)return(<div className="rec-empty">
    <div className="rec-empty-ic">🧩</div>
    <h3>An API key is required for the Program Design Assistant</h3>
    <p>This tab analyzes the athlete's <b>anthropometrics, test results, movement screen and questionnaires</b> and produces joint-by-joint, justified exercise suggestions. To use it, open the <b>✨ AI Coach Assistant</b> at the bottom right and enter an API key — <b>Gemini is free</b>. The key is stored with your account across all devices.</p>
  </div>);
  return(<div className="rec-wrap">
    <div className="rec-bar">
      <div className="rec-bar-l">
        <div className="rec-bar-t">🧩 Program Design Assistant</div>
        <div className="rec-bar-s">{pd?`Analyzed: ${new Date(pd.at).toLocaleString('en-GB')} · ${pd.model}`:'Joint-by-joint constraint analysis — 3 mobilization + 3 stabilization exercises, plus a reasoned strength assessment.'}</div>
      </div>
      <button className="btn sm" disabled={pdBusy} onClick={genPD}>{pdBusy?'Analyzing…':(pd?'↻ Re-analyze':'🧩 Analyze Athlete')}</button>
    </div>
    {pdErr&&<div className="rec-err">⚠ {pdErr}</div>}
    {pdBusy&&!pd&&<div className="rec-loading"><div className="rec-spin"/><div>Scanning data, checking asymmetries, matching exercises…</div></div>}
    {pd&&pd.data&&<div className={'pda-card'+(pdBusy?' dim':'')}>
      {pd.data.kesildi&&<div className="rec-err">⚠ Model yanıtı token sınırında kesildi — aşağıda yalnızca tamamlanan öneriler var. Tam liste için <b>↻ Re-analyze</b> deneyin.</div>}
      {pd.data.kirmizi_bayrak&&pd.data.kirmizi_bayrak!=='null'&&<div className="pda-flag"><span className="ic">🚩</span><div><b>Kırmızı bayrak:</b> {pd.data.kirmizi_bayrak}</div></div>}
      {pd.data.sporcu_ozeti&&<div className="pda-summary"><b>Özet:</b> {pd.data.sporcu_ozeti}</div>}
      {(()=>{
        const byPrio=a=>[...a].sort((x,y)=>pdaPrio(x.oncelik).rank-pdaPrio(y.oncelik).rank);
        // Kuvvet reads in movement-pattern order (yatay itiş → … → core), others by priority.
        const byPat=a=>[...a].sort((x,y)=>{const rx=(pdaPat(x.hareket_paterni)||{rank:99}).rank,ry=(pdaPat(y.hareket_paterni)||{rank:99}).rank;return rx-ry||pdaPrio(x.oncelik).rank-pdaPrio(y.oncelik).rank;});
        const groups=PDA_CATS.map(c=>{const items=pd.data.oneriler.filter(r=>(pdaCat(r.kategori)||{}).id===c.id);return{...c,items:c.id==='str'?byPat(items):byPrio(items)};});
        const rest=byPrio(pd.data.oneriler.filter(r=>!pdaCat(r.kategori)));
        if(rest.length)groups.push({id:'other',ic:'📌',lbl:'Diğer',desc:'',items:rest});
        const card=(r,i)=>{const p=pdaPrio(r.oncelik);const pat=pdaPat(r.hareket_paterni);return(
          <div key={i} className={'pda-item '+p.cls}>
            <div className="pda-item-h">
              <span className={'pda-pill '+p.cls}>{p.lbl}</span>
              {pat&&<span className="pda-pattern">🎯 {pat.lbl}</span>}
              {r.hedef_eklem&&<span className="pda-joint">🦴 {r.hedef_eklem}</span>}
              <span className="pda-cons">{r.tespit_edilen_kisitlilik||'—'}</span>
            </div>
            <div className="pda-ex">🏋️ {r.onerilen_egzersiz||'—'}</div>
            {r.set_tekrar_yuk_onerisi&&<div className="pda-dose">{r.set_tekrar_yuk_onerisi}</div>}
            {r.dayanak_veri&&<div className="pda-kv"><span className="k">Dayanak</span><span className="v">{r.dayanak_veri}</span></div>}
            {r.gerekce&&<div className="pda-kv"><span className="k">Gerekçe</span><span className="v">{r.gerekce}</span></div>}
            {r.notlar&&r.notlar!=='null'&&<div className="pda-kv warn"><span className="k">Not</span><span className="v">{r.notlar}</span></div>}
          </div>);};
        // Strength is an assessment, not a prescription — region, evidence and mechanism.
        const kg=byPrio(pd.data.kuvvet_gorusu||[]);
        const view=(r,i)=>{const p=pdaPrio(r.oncelik);const pat=pdaPat(r.hareket_paterni);return(
          <div key={i} className={'pda-item '+p.cls}>
            <div className="pda-item-h">
              <span className={'pda-pill '+p.cls}>{p.lbl}</span>
              {pat&&<span className="pda-pattern">🎯 {pat.lbl}</span>}
              <span className="pda-cons">{r.hedef_bolge||'—'}</span>
            </div>
            {r.dayanak_veri&&<div className="pda-kv"><span className="k">Dayanak</span><span className="v">{r.dayanak_veri}</span></div>}
            {r.neden&&<div className="pda-kv"><span className="k">Neden</span><span className="v">{r.neden}</span></div>}
            {r.performansa_etkisi&&<div className="pda-kv"><span className="k">Etki</span><span className="v">{r.performansa_etkisi}</span></div>}
            {r.programlama_yonu&&r.programlama_yonu!=='null'&&<div className="pda-kv"><span className="k">Yön</span><span className="v">{r.programlama_yonu}</span></div>}
          </div>);};
        return(<React.Fragment>
          {groups.filter(g=>g.items.length).map(g=>(
            <div key={g.id} className="pda-sec">
              <div className="pda-sec-h">
                <span className="pda-sec-t">{g.ic} {g.lbl}</span>
                <span className="pda-sec-n">{g.items.length} egzersiz</span>
              </div>
              {g.desc&&<div className="pda-sec-d">{g.desc}</div>}
              <div className="pda-list">{g.items.map(card)}</div>
            </div>))}
          {kg.length>0&&<div className="pda-sec">
            <div className="pda-sec-h">
              <span className="pda-sec-t">🏋️ Kuvvet Görüşü</span>
              <span className="pda-sec-n">{kg.length} değerlendirme</span>
            </div>
            <div className="pda-sec-d">Egzersiz reçetesi değil — hangi bölgenin neden geliştirilmesi gerektiğine dair veriye dayalı değerlendirme</div>
            <div className="pda-list">{kg.map(view)}</div>
          </div>}
          {pd.data.oneriler.length===0&&kg.length===0&&<div className="rec-hint">Analiz tamamlandı ancak öneri üretilecek yeterli veri bulunamadı — Body Comp, Testing ve Wellness sekmelerine veri girip tekrar deneyin.</div>}
        </React.Fragment>);
      })()}
      {pd.input&&<details className="pda-details"><summary>📄 Analizde kullanılan veri (JSON)</summary><pre>{JSON.stringify(pd.input,null,2)}</pre></details>}
      <div className="rec-foot">Bu çıktı gerekçeli bir öneridir, kesin talimat değildir — nihai karar antrenöre aittir. Ağrı veya klinik bulguda fizyoterapiste yönlendirin.</div>
    </div>}
    {!pd&&!pdBusy&&<div className="rec-hint">No analysis yet. Press <b>🧩 Analyze Athlete</b> above — it scans the athlete's profile data, flags right-left asymmetries (≥10%) and weaknesses, and prioritizes them by injury risk. You get exactly <b>3 🧘 mobilization</b> and <b>3 ⚖️ stabilization</b> exercises, each tied to the measurement behind it. Strength is <b>not</b> prescribed as exercises: the <b>🏋️ strength assessment</b> reads like a sport scientist's note — which region needs developing, which test result says so, the mechanism involved, and what it should change on court. Exercises are chosen freely for the athlete's needs — not limited to your library.</div>}
  </div>);
}

// Animated number that eases from 0 → value on mount/change (cubic ease-out).
function CountUp({value,decimals=0,dur=850,format}){
  const[v,setV]=useState(0);
  const raf=useRef(0);
  useEffect(()=>{
    const target=Number(value)||0;let start=0;
    const tick=ts=>{if(!start)start=ts;const p=Math.min(1,(ts-start)/dur);const e=1-Math.pow(1-p,3);setV(target*e);if(p<1)raf.current=requestAnimationFrame(tick);};
    raf.current=requestAnimationFrame(tick);
    // Fallback: guarantee the final value lands even if rAF is paused (bg tab).
    const done=setTimeout(()=>setV(target),dur+80);
    return()=>{cancelAnimationFrame(raf.current);clearTimeout(done);};
  },[value,dur]);
  return<span className="countup">{format?format(v):v.toFixed(decimals)}</span>;
}

