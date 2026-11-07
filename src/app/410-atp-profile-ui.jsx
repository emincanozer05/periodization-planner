/* ═══ ATHLETE PROFILE (Athlete Training Profile) — the tab beside Profile ═══
   The latest tests, the F-V summary and two sections on the same cards the scouting sheet
   uses: the Athletic Development Priorities, the coach's, written straight onto
   `ath.trainingProfile`; and Exercise Exposure, drawn from the calendar and never edited,
   only read. (Joint by Joint and Constraints were taken off the tab; a profile saved with
   them keeps them on the record, unread.) Nothing here selects an exercise
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
    <AtpSecHead n={1} title={atpT('Athletic Development Priorities')}
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
/* The four ways a set is filed besides the exercise itself, one at a time on a tab. */
const ATP_EXP_LAYERS=[
  {id:'patterns',en:'Movement Pattern',      dTr:'Hareketin çalıştırdığı patern',dEn:'What the movement trains',fixed:true},
  {id:'stimuli', en:'Athletic Stimulus',     dTr:'Verilen atletik talep',dEn:'The athletic demand delivered',fixed:true},
  {id:'loading', en:'Loading Characteristic',dTr:'Vücudun nasıl yüklendiği',dEn:'How the body was loaded',fixed:true},
  {id:'families',en:'Exercise Family',       dTr:'Birbiriyle ilişkili egzersiz grupları',dEn:'Groups of related exercises',fixed:false},
];
/* Exercise Exposure on screen. Above the two lists, the window's sets spread over the
   pattern table's own categories (Kategori, 185) as one bar — a category is a filter: a click
   keeps only its exercises in the list. Each count is read beside the same window just
   before it (the 7 days before these 7 …), so a jump or a drop in volume shows at once. */
const atpAgo=(d,end)=>{if(!d)return'—';const n=Math.round((parseD(end)-parseD(d))/864e5);
  return n<=0?L('bugün','today'):n===1?L('dün','yesterday'):L(`${n} gün önce`,`${n} days ago`);};
const atpCatCol=k=>(mvCat(k)||{}).color||'var(--dim)';
const atpCatName=k=>k?mvCatLabel(k):L('Kategorisiz','No category');
function AtpExposure({exp,prev,refDate,setRefDate}){
  const[win,setWin]=useState('d7');
  const[all,setAll]=useState(false);
  const[lay,setLay]=useState('patterns');
  const[cat,setCat]=useState(null);       // a Kategori picked on the bar: the exercise list keeps only it
  const[q,setQ]=useState('');
  const lv=id=>ATP_EXP_LEVELS.find(x=>x.id===id)||ATP_EXP_LEVELS[0];
  const pill=id=><span className={`atp-lv x-${id}`} title={L(lv(id).dTr,lv(id).dEn)}>{atpAb(lv(id))}</span>;
  const byWin=list=>list.filter(t=>t.sets[win]>0)
    .sort((a,b)=>(b.sets[win]-a.sets[win])||String(b.lastUsed||'').localeCompare(String(a.lastUsed||'')));
  const exAll=byWin(exp.exercises);
  const cats=byWin(exp.categories||[]);
  const catOn=cat!=null&&cats.some(c=>c.key===cat)?cat:null;
  const ql=q.trim().toLocaleLowerCase('tr');
  const exRows=exAll.filter(t=>(catOn==null||(t.mvCat||'')===catOn)&&(!ql||String(t.label).toLocaleLowerCase('tr').includes(ql)));
  const shown=all?exRows:exRows.slice(0,10);
  const W=ATP_EXP_WINDOWS.find(w=>w.id===win);
  const sum=list=>list.reduce((n,t)=>n+(t.sets[win]||0),0);
  const totalSets=sum(exAll);
  /* The same window just before this one; the last session has none. */
  const pv=win!=='last'&&prev&&prev[win]?prev[win]:null;
  const pvSets=pv?pv.exercises.reduce((n,t)=>n+(t.sets[win]||0),0):null;
  const pvSess=pv?pv.sessions[win]:null;
  const pvEx=pv?pv.exercises.filter(t=>t.sets[win]>0).length:null;
  const delta=(v,p)=>{if(p==null)return null;const d=v-p;
    return<span className={`atp-xd ${d>0?'up':d<0?'dn':''}`} title={L('Bir önceki aynı uzunluktaki döneme göre','Against the window of the same length just before')}>
      {d>0?'▲ +':d<0?'▼ ':'= '}{d===0?'':d}<small>{L(` önceki: ${p}`,` prev: ${p}`)}</small></span>;};
  const bar=(t,max)=><span className={`atp-ly-bar x-${t.level[win]}`}><i style={{width:`${Math.max(6,Math.round(t.sets[win]/max*100))}%`}}/></span>;
  const L0=ATP_EXP_LAYERS.find(x=>x.id===lay);
  const lList=exp[lay]||[];
  const lOn=byWin(lList),lMax=Math.max(1,...lOn.map(t=>t.sets[win]));
  const lOff=L0.fixed?lList.filter(t=>!(t.sets[win]>0)):[];
  const exMax=Math.max(1,...exAll.map(t=>t.sets[win]));
  const stats=win==='last'
    ?[{k:L('Seans','Session'),v:exp.last?fd(exp.last.date):'—',s:exp.last&&[exp.last.name,atpAgo(exp.last.date,exp.end)].filter(Boolean).join(' · ')},
      {k:L('Egzersiz','Exercises'),v:exAll.length},{k:L('Toplam set','Total sets'),v:totalSets}]
    :[{k:L('Aralık','Window'),v:`${fd(exp.from[win]).slice(0,5)} – ${fd(exp.end).slice(0,5)}`,s:L(`${W.days} gün`,`${W.days} days`)},
      {k:L('Seans','Sessions'),v:exp.sessions[win],d:delta(exp.sessions[win],pvSess)},
      {k:L('Egzersiz','Exercises'),v:exAll.length,d:delta(exAll.length,pvEx)},
      {k:L('Toplam set','Total sets'),v:totalSets,d:delta(totalSets,pvSets),s:W.days>7?L(`haftada ≈ ${Math.round(totalSets*7/W.days)} set`,`≈ ${Math.round(totalSets*7/W.days)} sets / week`):null}];
  const isToday=refDate===fmt(today);
  return(<div className="sc-sec atp-xp" id="atp-s3">
    <AtpSecHead n={2} title={atpT('Exercise Exposure')}
      desc={L('Sporcunun takvimindeki antrenman kayıtlarından (takım seansları dahil) otomatik oluşur: seçilen aralıkta hangi kategoriye ve egzersize kaç set maruz kaldığı. Kategori, patern tablosundaki Kategori · Tür etiketinden okunur; düzey set sayısından.',
        'Built automatically from the training records on the athlete’s calendar (team sessions included): how many sets of which category and exercise in the chosen window. The category is read from the pattern table’s Kategori · Tür tag; the level from the set count.')}>
      <span className="atp-hc atp-auto">{L('Otomatik','Automatic')}</span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-xbar">
        <div className="atp-wseg" role="tablist">{ATP_EXP_WINDOWS.map(w=>
          <button key={w.id} role="tab" aria-selected={win===w.id} className={win===w.id?'on':''} onClick={()=>setWin(w.id)}>{atpT(w.en)}</button>)}</div>
        <div className="atp-ref">
          <span>{L('Referans günü','Reference day')}</span>
          <button className="atp-ref-step" onClick={()=>setRefDate(fmt(addD(parseD(refDate),-7)))} title={L('Bir hafta geri','One week back')} aria-label={L('Bir hafta geri','One week back')}>‹</button>
          <input type="date" value={refDate} onChange={e=>setRefDate(e.target.value)}/>
          <button className="atp-ref-step" onClick={()=>setRefDate(fmt(addD(parseD(refDate),7)))} title={L('Bir hafta ileri','One week forward')} aria-label={L('Bir hafta ileri','One week forward')}>›</button>
          {!isToday&&<button className="atp-ref-today" onClick={()=>setRefDate(fmt(today))}>{L('Bugün','Today')}</button>}
        </div>
      </div>
      {!exp.last?<div className="atp-xempty">{L('Takvimde egzersiz kaydı yok. Egzersiz maruziyeti, sporcunun takvimine yazılan seanslardan — takım seansları dahil — kendiliğinden oluşur.',
          'No exercise on the calendar yet. Exercise Exposure builds itself from the sessions on the athlete’s calendar, team sessions included.')}</div>
      :<>
        <div className="atp-xstats">{stats.map(x=>
          <div key={x.k} className={`atp-xstat${String(x.v).length>12?' wide':''}`}><div className="k">{x.k}</div>
            <div className="v">{x.v}</div>{x.d&&<div className="s">{x.d}</div>}{x.s&&<div className="s">{x.s}</div>}</div>)}
        </div>
        {cats.length>0&&<div className="atp-xcat">
          <div className="atp-xcat-h"><b>{L('Kategori dağılımı','Spread by category')}</b>
            <span>{catOn!=null?<button className="atp-xcat-clr" onClick={()=>setCat(null)}>{L('Filtreyi kaldır','Clear filter')} ✕</button>
              :L('kategoriye tıkla → egzersiz listesi süzülür','click a category → filters the exercise list')}</span></div>
          <div className="atp-xcat-bar" role="group" aria-label={L('Kategori dağılımı','Spread by category')}>{cats.map(c=>
            <button key={c.key||'none'} className={catOn===c.key?'on':catOn!=null?'dim':''} style={{flexGrow:c.sets[win],background:atpCatCol(c.key)}}
              onClick={()=>setCat(x=>x===c.key?null:c.key)} title={`${atpCatName(c.key)} · ${c.sets[win]} set · %${Math.round(c.sets[win]/Math.max(1,totalSets)*100)}`}
              aria-pressed={catOn===c.key}/>)}</div>
          <div className="atp-xcat-leg">{cats.map(c=>
            <button key={c.key||'none'} className={catOn===c.key?'on':catOn!=null?'dim':''} onClick={()=>setCat(x=>x===c.key?null:c.key)} aria-pressed={catOn===c.key}>
              <i style={{background:atpCatCol(c.key)}}/>{atpCatName(c.key)}<b>{c.sets[win]}</b><em>%{Math.round(c.sets[win]/Math.max(1,totalSets)*100)}</em></button>)}</div>
        </div>}
        <div className="atp-xleg-row" title={L('Düzey, seçilen aralıktaki set sayısından okunur (gün aralıkları haftalık ortalamayla).','The level is read from the set count in the window (day windows as a weekly average).')}>
          <span className="k">{L('Maruziyet düzeyi','Exposure level')}</span>
          {ATP_EXP_LEVELS.slice(1).map(l=><span key={l.id}><i className={`atp-sw x-${l.id}`}/>{atpT(l.en)}</span>)}
        </div>
        <div className="atp-xcols">
          <div className="atp-grp">
            <div className="atp-grp-h">
              <div><div className="atp-grp-t">{atpT('Exercise')}{catOn!=null&&<span className="atp-xf"><i style={{background:atpCatCol(catOn)}}/>{atpCatName(catOn)}</span>}</div>
                <div className="atp-grp-s">{atpT(W.en)}</div></div>
              <input className="atp-xsearch" value={q} onChange={e=>setQ(e.target.value)} placeholder={L('Egzersiz ara…','Search exercise…')} aria-label={L('Egzersiz ara','Search exercise')}/>
              <span className="atp-grp-c"><b>{exRows.length}</b></span>
            </div>
            {exRows.length===0?<div className="atp-ly-empty">{exAll.length?L('Bu süzgeçle egzersiz yok.','No exercise matches this filter.'):L('Bu aralıkta egzersiz kaydı yok.','No exercise in this window.')}</div>
            :shown.map(t=>{const l=t.level[win];const k=t.mvCat||'';return(
              <div key={t.key} className="atp-ex-r">
                <div className="atp-ex-tx">
                  <div className="atp-ex-n" title={t.label}><i className="atp-ex-dot" style={{background:atpCatCol(k)}}/>{t.label}</div>
                  <div className="atp-ex-m">{k?<>{mvCatLabel(k)}{t.mvType?` · ${mvTermOr(k,t.mvType)}`:''}</>:atpT(t.family)}
                    {' · '}<span title={fd(t.lastUsed)}>{atpAgo(t.lastUsed,exp.end)}</span>
                    {' · '}<span title={L('Son 28 günde yer aldığı seans sayısı','Sessions it appeared in over the last 28 days')}>{t.freq28}× / {L('28 gün','28 d')}</span></div>
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
  {g:'speed',id:'laneAgility',tr:'Lane Agility',en:'Lane Agility',u:'s',dir:'lo',get:t=>cmpN(t.laneAgility)},
  {g:'speed',id:'curvedRun',tr:'Curved Run',en:'Curved Run',u:'s',dir:'lo',bi:t=>{const c=curvedRunCalc(t);return[c.r,c.l];}},
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
  /* Each window read beside the one of the same length just before it. */
  const prev=useMemo(()=>{const o={};ATP_EXP_WINDOWS.filter(w=>w.days).forEach(w=>{
    o[w.id]=atpExposure(ath,fmt(addD(parseD(refOk),-w.days)),{libMap});});return o;},[ath.days,libMap,refOk]);
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
  return(<div className="atp-wrap">
    <AtpTestStrip ath={ath}/>
    <FvSummaryCard ath={ath}/>
    <AtpProfile q={tp.qualities} onSet={setQ} onClear={clearQ}/>
    <AtpExposure exp={exp} prev={prev} refDate={refOk} setRefDate={setRefDate}/>
  </div>);
}
