/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS → POLAR: "Verileri al", takım tablosu ve sporcu grafikleri

   "Verileri al": takımın Polar'a bağlı her sporcusu için sunucuda senkron
   (functions/polar → /sync, aynı anda 3 sporcu), ardından Wellness'ta SEÇİLİ
   GÜNÜN Polar verisi tek istekle (/team-data, from = to = o gün) gelir. Senkron
   az önce yapıldıysa (TOO_SOON) sporcu "güncel" sayılır. 14/28/56 günlük
   grafikler sporcunun kendi sayfasında (PolarAthleteCharts).

   Ekranda yalnızca Polar'ın gönderdiği değerler var; gelmeyen değer "—".
   Hesaplanan şeyler adıyla belli (7 günlük ortalamalar, günün antrenman
   süresi/yük toplamı). Sporcunun senkronlanan kendi verisine
   (team.athletes) hiçbir şey yazılmıyor: bu bölüm yalnızca okur.

   Sporcu görünümü sade: üstte son değer + 7 günlük ortalama kutucukları, altında
   yalnızca 4 grafik (HRV, uyku süresi, gece nabzı, antrenman yükü). Tek eksen,
   tek renk; HRV ve gece nabzında her gece soluk nokta, üstünde 7 günlük ortalama
   çizgisi — ikisi biçimle ayrılıyor ve başlıkta düz yazıyla adlandırılıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const PW_DAYS=[14,28,56];
const PW_DAY=86400000;
const pwIso=ms=>new Date(ms).toISOString().slice(0,10);
const pwShift=(iso,d)=>pwIso(Date.parse(iso+'T00:00:00Z')+d*PW_DAY);
function pwKeys(from,to){const out=[];for(let k=from;k<=to&&out.length<200;k=pwShift(k,1))out.push(k);return out;}
const pwNum=v=>typeof v==='number'&&isFinite(v);
function pwMean(a){const v=a.filter(pwNum);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;}
function pwDur(sec){if(!pwNum(sec))return'—';const m=Math.round(sec/60);return L(`${Math.floor(m/60)} sa ${m%60} dk`,`${Math.floor(m/60)}h ${m%60}m`);}
const pwR=(v,d=0)=>pwNum(v)?(d?v.toFixed(d):String(Math.round(v))):'—';
const pwDm=iso=>iso?fd(iso).slice(0,5):'—';
/* Uyku süresi Polar uygulamasındaki gibi: uykuya dalıştan uyanmaya (sleep_end − sleep_start).
   "Gerçek uyku" (asleepSec) bundan gece içindeki uyanıklıklar çıkmış hâli — ayrı gösteriliyor.
   İki zaman damgasından biri yoksa süre de yok (tahmin edilmiyor). */
function pwSleepTime(s){
  if(!s||!s.sleepStart||!s.sleepEnd)return null;
  const d=(Date.parse(s.sleepEnd)-Date.parse(s.sleepStart))/1000;
  return isFinite(d)&&d>0&&d<24*3600?d:null;
}

const PW_STATUS={
  active:()=>[L('Bağlı','Connected'),'on'],
  pending:()=>[L('Davet bekliyor','Invite pending'),'wait'],
  revoked:()=>[L('İzin kaldırıldı','Revoked'),'bad'],
  error:()=>[L('Hata','Error'),'bad'],
  disconnected:()=>[L('Bağlantı kesildi','Disconnected'),'off'],
  none:()=>[L('Bağlı değil','Not connected'),'off'],
};

/* Sade grafik: az eksen yazısı, neredeyse görünmez ızgara, gösterge kutusu yok
   (gerekirse başlıkta düz yazı gösterge), noktalar yalnızca üzerine gelince. */
function pwChartOpts({zero,unit,dec}){
  const f=v=>pwNum(v)?(dec?v.toFixed(dec):Math.round(v))+(unit?' '+unit:''):'—';
  return{responsive:true,maintainAspectRatio:false,animation:false,
    interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},
      tooltip:{displayColors:false,callbacks:{label:c=>pwNum(c.raw)?`${c.dataset.label}: ${f(c.raw)}`:null}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#94a3b8',maxTicksLimit:5,maxRotation:0,font:{size:10}}},
      y:{beginAtZero:!!zero,grace:'10%',grid:{color:'rgba(255,255,255,.05)'},border:{display:false},ticks:{color:'#94a3b8',maxTicksLimit:4,font:{size:10},padding:6}}}};
}

/* Her gece soluk bir nokta, üstünde 7 günlük ortalamanın tek, net çizgisi. */
function pwRoll7(vals){return vals.map((_,i)=>{const w=vals.slice(Math.max(0,i-6),i+1).filter(pwNum);return w.length>=3?w.reduce((s,x)=>s+x,0)/w.length:null;});}
const pwDots=(label,data,color)=>({type:'line',label,data,showLine:false,pointRadius:3,pointHoverRadius:5,
  pointBackgroundColor:color+'73',pointBorderWidth:0,borderColor:color,order:2});
const pwMeanLine=(label,data,color)=>({type:'line',label,data,borderColor:color,borderWidth:2.5,pointRadius:0,pointHoverRadius:5,
  pointBackgroundColor:color,tension:.35,spanGaps:true,order:1});
const pwBars=(label,data,color)=>({type:'bar',label,data,backgroundColor:color,borderRadius:3,borderSkipped:'start',barPercentage:.6,categoryPercentage:.9});

function PwChart({title,unit,help,legend,labels,sets,zero,dec}){
  const has=sets.some(s=>s.data.some(pwNum));
  return(<div className="pw-card">
    <div className="pw-ct"><b>{title}</b>{unit&&<span>{unit}</span>}{legend&&has&&<em className="pw-leg">{legend}</em>}</div>
    {has?<div className="pw-cv"><ChartC type="line" chartData={{labels,datasets:sets}} options={pwChartOpts({zero,unit,dec})}/></div>
      :<div className="pw-none">{L('Polar bu aralıkta bu veriyi göndermedi.','Polar sent no data for this in the selected range.')}</div>}
    {help&&has&&<div className="pw-note">{help}</div>}
  </div>);
}

/* Kutucuk: son değer büyük, altında 7 günlük ortalama ve son değerin tarihi. */
function pwLast(arr,f){for(let i=(arr||[]).length-1;i>=0;i--){const v=f(arr[i]);if(pwNum(v))return{v,date:arr[i].date};}return null;}
function pwAvg7(arr,f,ref){return ref?pwMean((arr||[]).filter(x=>x.date>pwShift(ref,-7)).map(f)):null;}
function PwTile({label,value,unit,sub}){
  return(<div className="pw-tile"><span className="pw-tl">{label}</span>
    <b className="pw-tv">{value}{unit&&value!=='—'?<small> {unit}</small>:null}</b>
    <span className="pw-ts">{sub}</span></div>);
}

function PwAthlete({a,title,from,to,tools}){
  const theme=useAppTheme();
  const C1=theme==='light'?'#2563eb':'#3b82f6';
  const keys=pwKeys(from,to);
  const labels=keys.map(pwDm);
  const by=(arr,f)=>{const m=new Map((arr||[]).map(x=>[x.date,x]));return keys.map(k=>{const x=m.get(k);return x&&pwNum(f(x))?f(x):null;});};
  const hrv=by(a.recharge,x=>x.hrvMs), nhr=by(a.recharge,x=>x.hrAvg);
  const exDay=keys.map(k=>{const xs=(a.exercises||[]).filter(e=>e.date===k&&pwNum(e.trainingLoad));return xs.length?xs.reduce((s,e)=>s+e.trainingLoad,0):null;});
  const ex=(a.exercises||[]).slice().reverse();
  const tile=(label,arr,f,fmtV,unit)=>{const l=pwLast(arr,f);const m=l?pwAvg7(arr,f,l.date):null;
    return<PwTile key={label} label={label} value={l?fmtV(l.v):'—'} unit={unit}
      sub={l?L(`7g ort. ${fmtV(m)} · ${pwDm(l.date)}`,`7d avg ${fmtV(m)} · ${pwDm(l.date)}`):L('veri yok','no data')}/>;};
  const todayIso=fmt(new Date());
  const ex7=(a.exercises||[]).filter(e=>e.date>pwShift(todayIso,-7));
  const load7=ex7.map(e=>e.trainingLoad).filter(pwNum);
  const legend=L('nokta: her gece · çizgi: 7 günlük ortalama','dot: each night · line: 7-day mean');
  return(<div className="panel pw-ath">
    <div className="pw-ath-h">
      <div><h2>{title}</h2><span className="pw-sub">{fd(from)} – {fd(to)}</span></div>
      {tools}
    </div>
    <div className="pw-tiles">
      {tile(L('Uyku süresi','Sleep time'),a.sleep,x=>pwSleepTime(x),v=>pwDur(v))}
      {tile(L('Gerçek uyku','Actual sleep'),a.sleep,x=>x.asleepSec,v=>pwDur(v))}
      {tile(L('Uyku skoru','Sleep score'),a.sleep,x=>x.sleepScore,v=>pwR(v))}
      {tile('HRV',a.recharge,x=>x.hrvMs,v=>pwR(v),'ms')}
      {tile(L('Gece nabzı','Night HR'),a.recharge,x=>x.hrAvg,v=>pwR(v),'bpm')}
      {tile(L('Solunum','Breathing'),a.recharge,x=>x.breathingRate,v=>pwR(v,1),L('/dk','/min'))}
      {tile('ANS Charge',a.recharge,x=>x.ansCharge,v=>pwR(v,1))}
      {tile(L('Adım','Steps'),a.activity,x=>x.steps,v=>pwNum(v)?Math.round(v).toLocaleString('tr-TR'):'—')}
      <PwTile label={L('Antrenman (7 gün)','Training (7 days)')} value={String(ex7.length)} unit={L('seans','sessions')}
        sub={load7.length?L(`toplam yük ${Math.round(load7.reduce((x,y)=>x+y,0))}`,`total load ${Math.round(load7.reduce((x,y)=>x+y,0))}`):L('yük verisi yok','no load data')}/>
    </div>
    <div className="pw-charts">
      <PwChart title="HRV" unit="ms" legend={legend} labels={labels}
        sets={[pwMeanLine(L('7 günlük ortalama','7-day mean'),pwRoll7(hrv),C1),pwDots(L('Gece','Night'),hrv,C1)]}
        help={L('Sporcunun kendi ortalamasına göre okunur. Çizginin belirgin düşmesi yorgunluk ya da eksik toparlanma işareti olabilir.','Read against the athlete\'s own average. A clear drop in the line can signal fatigue or incomplete recovery.')}/>
      <PwChart title={L('Uyku süresi','Sleep duration')} unit={L('saat','hours')} labels={labels} zero dec={1}
        sets={[pwBars(L('Uyku süresi','Sleep time'),by(a.sleep,x=>{const t=pwSleepTime(x);return t==null?null:t/3600;}),C1)]}
        help={L('Her çubuk bir gece: uykuya dalıştan uyanmaya, Polar uygulamasındaki uyku süresi.','Each bar is one night: from falling asleep to waking, as in the Polar app.')}/>
      <PwChart title={L('Gece kalp atım hızı','Night heart rate')} unit="bpm" legend={legend} labels={labels}
        sets={[pwMeanLine(L('7 günlük ortalama','7-day mean'),pwRoll7(nhr),C1),pwDots(L('Gece','Night'),nhr,C1)]}
        help={L('Her zamankinden yüksek seyretmesi toparlanmanın eksik kaldığını gösterebilir.','Running higher than usual can signal incomplete recovery.')}/>
      <PwChart title={L('Antrenman yükü','Training load')} unit={L('günlük','daily')} labels={labels} zero
        sets={[pwBars(L('Yük','Load'),exDay,C1)]}
        help={L('Polar\'ın hesapladığı günlük antrenman yükü; boş gün = kayıtlı antrenman yok.','Daily training load calculated by Polar; empty day = no recorded session.')}/>
    </div>
    <div className="pw-sess">
      <div className="pw-ct"><b>{L('Antrenmanlar','Training sessions')}</b><span>{ex.length}</span></div>
      {ex.length?<div className="pw-tw"><table className="pw-t">
        <thead><tr><th>{L('Tarih','Date')}</th><th>{L('Spor','Sport')}</th><th>{L('Süre','Duration')}</th><th>{L('Ort. nabız','Avg HR')}</th><th>{L('Maks. nabız','Max HR')}</th><th>kcal</th><th>{L('Yük','Load')}</th></tr></thead>
        <tbody>{ex.map(e=><tr key={e.exerciseId||e.startTime}>
          <td>{fd(e.date)}</td><td>{e.sport?String(e.sport).replace(/_/g,' ').toLocaleLowerCase('tr'):'—'}</td><td>{pwDur(e.durationSec)}</td>
          <td>{pwR(e.hrAvg)}</td><td>{pwR(e.hrMax)}</td><td>{pwR(e.calories)}</td><td>{pwR(e.trainingLoad)}</td></tr>)}</tbody>
      </table></div>:<div className="pw-none">{L('Bu aralıkta Polar antrenman kaydı yok.','No Polar training sessions in this range.')}</div>}
    </div>
  </div>);
}

/* ── Bireysel: 14 / 28 / 56 günlük kutucuklar + grafikler ─────────────────────
   Sporcu profilinde (Kadro → sporcu → Profil, Polar panelinin altında) ve
   Wellness'ta sporcunun kendi sayfasında. Kendi verisini kendisi ister
   (/team-data, yalnızca bu sporcu); senkron yapmaz. */
function PolarAthleteCharts({ath,teamId}){
  const[days,setDays]=useState(28);
  const[data,setData]=useState(undefined);   // undefined: yükleniyor · null: veri/bağlantı yok
  const[err,setErr]=useState('');
  useEffect(()=>{
    let alive=true;setErr('');
    if(!teamId||!ath||!ath.id){setData(null);return;}
    const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
    if(!u||u.isAnonymous){setData(null);return;}
    setData(undefined);
    polarCall('/team-data',{teamId,athleteId:String(ath.id),days})
      .then(j=>{if(!alive)return;const a=(j.athletes||[])[0];setData(a?{a,from:j.from,to:j.to}:null);})
      .catch(e=>{if(alive){setErr(e.message||String(e));setData(null);}});
    return()=>{alive=false;};
  },[ath&&ath.id,teamId,days]);
  if(data===null&&!err)return null;          // Polar bağlantısı hiç olmamış sporcu: bölüm görünmez
  const tools=<div className="lb-seg">{PW_DAYS.map(d=><button key={d} className={days===d?'on':''} onClick={()=>setDays(d)}>{L(`${d} gün`,`${d} days`)}</button>)}</div>;
  if(err)return<div className="panel pw-ath"><div className="pw-ath-h"><div><h2>{L('Polar verisi','Polar data')}</h2></div>{tools}</div><div className="pw-err">{err}</div></div>;
  if(data===undefined)return<div className="panel pw-ath"><div className="pw-ath-h"><div><h2>{L('Polar verisi','Polar data')}</h2><span className="pw-sub">{L('Yükleniyor…','Loading…')}</span></div>{tools}</div></div>;
  return<PwAthlete a={data.a} title={L(`Polar verisi · son ${days} gün`,`Polar data · last ${days} days`)} from={data.from} to={data.to} tools={tools}/>;
}

/* ── Wellness: takımın GÜNLÜK Polar tablosu ──────────────────────────────────
   Wellness'ın üstündeki tarih seçicide hangi gün seçiliyse o günün verisi.
   Gece verisi (uyku, HRV, gece nabzı, solunum, ANS) uyanılan SABAHIN tarihini
   taşır — CoachOS'un gece kaydıyla aynı kural. Adım ve antrenman o güne ait;
   bugün seçiliyse gün içinde artar. Satıra tıklayınca sporcunun sayfası açılır;
   14/28/56 günlük grafikler orada. */
function PolarWellness({team,dayKey,onOpen}){
  const[data,setData]=useState(null);         // /team-data yanıtı (yalnızca seçili gün)
  const[busy,setBusy]=useState(false);
  const[prog,setProg]=useState(null);         // {done,total,fails:[{name,msg}]}
  const[err,setErr]=useState('');
  const day=dayKey||fmt(new Date());
  useEffect(()=>{setData(null);setProg(null);setErr('');},[team.id]);
  const nameOf=id=>{const a=(team.athletes||[]).find(x=>x.id===id);return a?(a.name||''):'';};
  const load=async d=>{const j=await polarCall('/team-data',{teamId:team.id,from:d,to:d});setData(j);return j;};
  /* Gün değişince (veri bir kez alındıysa) yalnızca o günü yeniden oku — senkron yok. */
  useEffect(()=>{
    if(!data||data.from===day)return;
    let alive=true;setBusy(true);
    polarCall('/team-data',{teamId:team.id,from:day,to:day}).then(j=>{if(alive)setData(j);})
      .catch(e=>{if(alive)setErr(e.message||String(e));}).finally(()=>{if(alive)setBusy(false);});
    return()=>{alive=false;};
  },[day]);

  const fetchAll=async()=>{
    setErr('');setBusy(true);setProg(null);
    try{
      const first=await load(day);
      const act=(first.athletes||[]).filter(a=>a.status==='active');
      const fails=[];let done=0;
      setProg({done,total:act.length,fails:[]});
      const queue=act.slice();
      const worker=async()=>{
        while(queue.length){
          const a=queue.shift();
          try{await polarCall('/sync',{athleteId:a.athleteId});}
          catch(e){if(e.code!=='TOO_SOON'&&e.code!=='SYNC_IN_PROGRESS')fails.push({name:nameOf(a.athleteId)||a.athleteName,msg:e.message});}
          done++;setProg({done,total:act.length,fails:fails.slice()});
        }
      };
      await Promise.all([worker(),worker(),worker()]);
      await load(day);
    }catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);}
  };

  const isToday=day===fmt(new Date());
  const byId=new Map(((data&&data.athletes)||[]).map(a=>[a.athleteId,a]));
  const rows=(team.athletes||[]).filter(a=>a&&a.id).map(a=>({a,p:byId.get(String(a.id))||null}))
    .sort((x,y)=>(!!y.p-!!x.p)||(x.a.name||'').localeCompare(y.a.name||'','tr'));
  const nLinked=rows.filter(r=>r.p&&r.p.status==='active').length;
  const pick=(arr)=>(arr||[]).find(x=>x.date===day)||null;

  return(<div className="panel pw">
    <div className="pw-h">
      <div><h2>Polar</h2><span className="pw-sub">{data
        ?L(`${nLinked} sporcu bağlı · ${fd(day)}${isToday?' (bugün)':''}`,`${nLinked} athletes connected · ${fd(day)}${isToday?' (today)':''}`)
        :L('Polar\'a bağlı sporcuların günlük uyku, toparlanma, aktivite ve antrenman verisi','Daily sleep, recovery, activity and training data of Polar-connected athletes')}</span></div>
      <div className="pw-tools">
        <button className="btn sm" disabled={busy} onClick={fetchAll}>{busy?L('Veriler alınıyor…','Fetching…'):L('Verileri al','Fetch data')}</button>
      </div>
    </div>
    {prog&&prog.total>0&&<div className="pw-prog" role="status">
      {busy?L(`Polar'dan alınıyor: ${prog.done}/${prog.total} sporcu`,`Fetching from Polar: ${prog.done}/${prog.total} athletes`)
        :L(`${prog.total-prog.fails.length}/${prog.total} sporcunun verisi güncellendi.`,`Updated ${prog.total-prog.fails.length}/${prog.total} athletes.`)}
      {prog.fails.map(f=><div key={f.name} className="pw-fail">{f.name}: {f.msg}</div>)}
    </div>}
    {err&&<div className="pw-err" role="alert">{err}</div>}
    {!data?<div className="pw-empty">{L('"Verileri al"a bastığında Polar\'a bağlı bütün sporcuların verisi güncellenir ve üstteki tarih seçicide seçili günün değerleri burada listelenir. Sporcuyu bağlamak için: Kadro → sporcu → Profil → Polar.','Press "Fetch data" to update every Polar-connected athlete; the values of the day picked above are listed here. To connect an athlete: Roster → athlete → Profile → Polar.')}</div>
    :<>
      <div className="pw-tw"><table className="pw-t pw-team">
        <thead><tr>
          <th>{L('Sporcu','Athlete')}</th><th>Polar</th><th>{L('Uyku süresi','Sleep time')}</th><th>{L('Uyku skoru','Sleep score')}</th>
          <th>HRV</th><th>{L('Gece nabzı','Night HR')}</th><th>{L('Solunum','Breathing')}</th><th>ANS</th>
          <th>{L('Adım','Steps')}</th><th>{L('Antrenman','Training')}</th><th>{L('Yük','Load')}</th>
        </tr></thead>
        <tbody>{rows.map(({a,p})=>{
          const[stTxt,stCls]=(PW_STATUS[(p&&p.status)||'none']||PW_STATUS.none)();
          const s=p&&pick(p.sleep),r=p&&pick(p.recharge),act=p&&pick(p.activity);
          const ex=p?(p.exercises||[]).filter(e=>e.date===day):[];
          const exDur=ex.map(e=>e.durationSec).filter(pwNum),exLoad=ex.map(e=>e.trainingLoad).filter(pwNum);
          const canOpen=!!p&&typeof onOpen==='function';
          return(<tr key={a.id} className={canOpen?'pw-click':''} onClick={canOpen?()=>onOpen(a.id):undefined}
            tabIndex={canOpen?0:undefined} onKeyDown={canOpen?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen(a.id);}}:undefined}>
            <td className="pw-name">{a.name||'—'}</td>
            <td><span className={'pw-st pw-'+stCls}>{stTxt}</span></td>
            <td>{s?pwDur(pwSleepTime(s)):'—'}</td>
            <td>{s?pwR(s.sleepScore):'—'}</td>
            <td>{r?pwR(r.hrvMs):'—'}</td>
            <td>{r?pwR(r.hrAvg):'—'}</td>
            <td>{r?pwR(r.breathingRate,1):'—'}</td>
            <td>{r?pwR(r.ansCharge,1):'—'}</td>
            <td>{act&&pwNum(act.steps)?Math.round(act.steps).toLocaleString('tr-TR'):'—'}</td>
            <td>{ex.length?`${ex.length} · ${exDur.length?pwDur(exDur.reduce((x,y)=>x+y,0)):'—'}`:'—'}</td>
            <td>{exLoad.length?pwR(exLoad.reduce((x,y)=>x+y,0)):'—'}</td>
          </tr>);})}</tbody>
      </table></div>
      <div className="pw-foot">{L(`Uyku, HRV, gece nabzı, solunum ve ANS o sabah uyanılan gecenin verisidir. Adım ve antrenman ${isToday?'bugüne aittir ve gün içinde artar':'o güne aittir'}. "—": Polar bu değeri göndermedi. Satıra tıkla → sporcunun 14/28/56 günlük grafikleri.`,
        `Sleep, HRV, night HR, breathing and ANS belong to the night ending that morning. Steps and training ${isToday?'are today\'s and grow during the day':'belong to that day'}. "—": Polar did not send this value. Click a row → the athlete\'s 14/28/56-day charts.`)}</div>
    </>}
  </div>);
}
