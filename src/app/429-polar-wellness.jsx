/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS → POLAR: "Verileri al", takım tablosu ve sporcu grafikleri

   "Verileri al": takımın Polar'a bağlı her sporcusu için sunucuda senkron
   (functions/polar → /sync, aynı anda 3 sporcu), ardından takımın son N günlük
   Polar verisi tek istekle (/team-data) gelir. Senkron az önce yapıldıysa
   (TOO_SOON) sporcu "güncel" sayılır; veri yine gösterilir.

   Ekranda yalnızca Polar'ın gönderdiği değerler var; gelmeyen değer "—".
   Hesaplanan tek şeyler adıyla belli: HRV 7 günlük ortalaması, 7 günlük
   antrenman sayısı ve toplam yükü. Sporcunun senkronlanan kendi verisine
   (team.athletes) hiçbir şey yazılmıyor: bu bölüm yalnızca okur.

   Grafikler: tek eksen (iki farklı ölçü iki ayrı grafik), tek seride gösterge
   yok, iki seride gösterge var; renk çifti renk körlüğü denetiminden geçti
   (koyu #3b82f6/#d97706, açık #2563eb/#b45309).
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

/* Bir sporcunun tablo satırı: son değerler + 7 günlük özetler (adıyla hesaplanan). */
function pwSummary(a,todayIso){
  const last=arr=>arr&&arr.length?arr[arr.length-1]:null;
  const s=last(a.sleep),r=last(a.recharge),act=last(a.activity);
  const hrv7=r?pwMean(a.recharge.filter(x=>x.date>pwShift(r.date,-7)).map(x=>x.hrvMs)):null;
  const ex7=(a.exercises||[]).filter(e=>e.date>pwShift(todayIso,-7));
  const loads=ex7.map(e=>e.trainingLoad).filter(pwNum);
  return{s,r,act,hrv7,ex7n:ex7.length,load7:loads.length?loads.reduce((x,y)=>x+y,0):null};
}

const PW_STATUS={
  active:()=>[L('Bağlı','Connected'),'on'],
  pending:()=>[L('Davet bekliyor','Invite pending'),'wait'],
  revoked:()=>[L('İzin kaldırıldı','Revoked'),'bad'],
  error:()=>[L('Hata','Error'),'bad'],
  disconnected:()=>[L('Bağlantı kesildi','Disconnected'),'off'],
  none:()=>[L('Bağlı değil','Not connected'),'off'],
};

function pwChartOpts({legend,zero,unit,dec}){
  const f=v=>pwNum(v)?(dec?v.toFixed(dec):Math.round(v))+(unit?' '+unit:''):'—';
  return{responsive:true,maintainAspectRatio:false,animation:false,
    interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:!!legend,position:'top',align:'start',labels:{color:'#cbd5e1',boxWidth:10,boxHeight:10,usePointStyle:true,font:{size:11}}},
      tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${f(c.raw)}`}}},
    scales:{x:{grid:{display:false},ticks:{color:'#94a3b8',maxTicksLimit:8,maxRotation:0,font:{size:10}}},
      y:{beginAtZero:!!zero,grid:{color:'rgba(255,255,255,.07)'},border:{display:false},ticks:{color:'#94a3b8',maxTicksLimit:5,font:{size:10}}}}};
}

function PwChart({title,unit,note,kind,labels,sets,zero,dec}){
  const has=sets.some(s=>s.data.some(pwNum));
  return(<div className="pw-card">
    <div className="pw-ct"><b>{title}</b>{unit&&<span>{unit}</span>}</div>
    {has?<div className="pw-cv"><ChartC type={kind} chartData={{labels,datasets:sets}} options={pwChartOpts({legend:sets.length>1,zero,unit,dec})}/></div>
      :<div className="pw-none">{L('Polar bu aralıkta bu veriyi göndermedi.','Polar sent no data for this in the selected range.')}</div>}
    {note&&has&&<div className="pw-note">{note}</div>}
  </div>);
}

function PwAthlete({a,name,from,to,onClose}){
  const theme=useAppTheme();
  const C1=theme==='light'?'#2563eb':'#3b82f6', C2=theme==='light'?'#b45309':'#d97706';
  const keys=pwKeys(from,to);
  const labels=keys.map(pwDm);
  const by=(arr,f)=>{const m=new Map((arr||[]).map(x=>[x.date,x]));return keys.map(k=>{const x=m.get(k);return x&&pwNum(f(x))?f(x):null;});};
  const hrv=by(a.recharge,x=>x.hrvMs);
  const hrv7=keys.map((k,i)=>{const w=hrv.slice(Math.max(0,i-6),i+1).filter(pwNum);return w.length>=3?w.reduce((s,x)=>s+x,0)/w.length:null;});
  const exDay=keys.map(k=>{const xs=(a.exercises||[]).filter(e=>e.date===k&&pwNum(e.trainingLoad));return xs.length?xs.reduce((s,e)=>s+e.trainingLoad,0):null;});
  const line=(label,data,color)=>({label,data,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:4,pointHoverRadius:6,spanGaps:false,tension:0});
  const bar=(label,data,color)=>({label,data,backgroundColor:color,borderRadius:4,borderSkipped:'start',barPercentage:.7,categoryPercentage:.85});
  const ex=(a.exercises||[]).slice().reverse();
  return(<div className="panel pw-ath">
    <div className="pw-ath-h">
      <div><h2>{name}</h2><span className="pw-sub">{L('Polar verisi','Polar data')} · {fd(from)} – {fd(to)}</span></div>
      <button className="btn sm sec" onClick={onClose}>{L('Kapat','Close')}</button>
    </div>
    <div className="pw-charts">
      <PwChart title="HRV · RMSSD" unit="ms" kind="line" labels={labels}
        sets={[line(L('Gece HRV','Nightly HRV'),hrv,C1),line(L('7 günlük ortalama','7-day mean'),hrv7,C2)]}
        note={L('7 günlük ortalama hesaplanır (en az 3 gece).','The 7-day mean is calculated (at least 3 nights).')}/>
      <PwChart title={L('Uyku süresi','Sleep duration')} unit={L('saat','hours')} kind="bar" labels={labels} zero dec={1}
        sets={[bar(L('Uyku','Sleep'),by(a.sleep,x=>pwNum(x.asleepSec)?x.asleepSec/3600:null),C1)]}
        note={L('Uyku süresi = Polar\'ın uyku evrelerinin toplamı.','Sleep duration = sum of Polar\'s sleep stages.')}/>
      <PwChart title={L('Uyku skoru','Sleep score')} kind="line" labels={labels}
        sets={[line(L('Uyku skoru','Sleep score'),by(a.sleep,x=>x.sleepScore),C1)]}/>
      <PwChart title={L('Gece kalp atım hızı','Nightly heart rate')} unit="bpm" kind="line" labels={labels}
        sets={[line(L('Gece nabzı','Night HR'),by(a.recharge,x=>x.hrAvg),C1)]}/>
      <PwChart title={L('Solunum hızı','Breathing rate')} unit={L('/dk','/min')} kind="line" labels={labels} dec={1}
        sets={[line(L('Solunum','Breathing'),by(a.recharge,x=>x.breathingRate),C1)]}/>
      <PwChart title="ANS Charge" kind="line" labels={labels} dec={1}
        sets={[line('ANS Charge',by(a.recharge,x=>x.ansCharge),C1)]}/>
      <PwChart title={L('Günlük adım','Daily steps')} kind="bar" labels={labels} zero
        sets={[bar(L('Adım','Steps'),by(a.activity,x=>x.steps),C1)]}/>
      <PwChart title={L('Antrenman yükü','Training load')} unit={L('Polar, günlük toplam','Polar, daily total')} kind="bar" labels={labels} zero
        sets={[bar(L('Yük','Load'),exDay,C1)]}/>
    </div>
    <div className="pw-sess">
      <div className="pw-ct"><b>{L('Antrenmanlar','Training sessions')}</b><span>{ex.length}</span></div>
      {ex.length?<div className="pw-tw"><table className="pw-t">
        <thead><tr><th>{L('Tarih','Date')}</th><th>{L('Spor','Sport')}</th><th>{L('Süre','Duration')}</th><th>{L('Ort. nabız','Avg HR')}</th><th>{L('Maks. nabız','Max HR')}</th><th>kcal</th><th>{L('Yük','Load')}</th><th>{L('Kardiyo yükü','Cardio load')}</th></tr></thead>
        <tbody>{ex.map(e=><tr key={e.exerciseId||e.startTime}>
          <td>{fd(e.date)}</td><td>{e.sport?String(e.sport).replace(/_/g,' ').toLocaleLowerCase('tr'):'—'}</td><td>{pwDur(e.durationSec)}</td>
          <td>{pwR(e.hrAvg)}</td><td>{pwR(e.hrMax)}</td><td>{pwR(e.calories)}</td><td>{pwR(e.trainingLoad,1)}</td><td>{pwR(e.cardioLoad,1)}</td></tr>)}</tbody>
      </table></div>:<div className="pw-none">{L('Bu aralıkta Polar antrenman kaydı yok.','No Polar training sessions in this range.')}</div>}
    </div>
  </div>);
}

function PolarWellness({team}){
  const[data,setData]=useState(null);         // /team-data yanıtı
  const[days,setDays]=useState(28);
  const[busy,setBusy]=useState(false);
  const[prog,setProg]=useState(null);         // {done,total,fails:[{name,msg}]}
  const[err,setErr]=useState('');
  const[sel,setSel]=useState(null);
  useEffect(()=>{setData(null);setSel(null);setProg(null);setErr('');},[team.id]);
  const nameOf=id=>{const a=(team.athletes||[]).find(x=>x.id===id);return a?(a.name||''):'';};
  const load=async d=>{const j=await polarCall('/team-data',{teamId:team.id,days:d});setData(j);return j;};

  const fetchAll=async()=>{
    setErr('');setBusy(true);setProg(null);
    try{
      const first=await load(days);
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
      await load(days);
    }catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);}
  };
  const changeDays=async d=>{setDays(d);if(!data)return;setBusy(true);setErr('');try{await load(d);}catch(e){setErr(e.message||String(e));}finally{setBusy(false);}};

  const todayIso=pwIso(Date.now());
  const byId=new Map(((data&&data.athletes)||[]).map(a=>[a.athleteId,a]));
  const rows=(team.athletes||[]).filter(a=>a&&a.id).map(a=>({a,p:byId.get(String(a.id))||null}))
    .sort((x,y)=>(!!y.p-!!x.p)||(x.a.name||'').localeCompare(y.a.name||'','tr'));
  const nLinked=rows.filter(r=>r.p&&r.p.status==='active').length;
  const selRow=sel&&rows.find(r=>String(r.a.id)===sel&&r.p);

  return(<div className="panel pw">
    <div className="pw-h">
      <div><h2>Polar</h2><span className="pw-sub">{data?L(`${nLinked} sporcu bağlı · son ${data.days} gün`,`${nLinked} athletes connected · last ${data.days} days`):L('Polar\'a bağlı sporcuların uyku, toparlanma, aktivite ve antrenman verisi','Sleep, recovery, activity and training data of athletes connected to Polar')}</span></div>
      <div className="pw-tools">
        <div className="lb-seg">{PW_DAYS.map(d=><button key={d} className={days===d?'on':''} disabled={busy} onClick={()=>changeDays(d)}>{L(`${d} gün`,`${d} days`)}</button>)}</div>
        <button className="btn sm" disabled={busy} onClick={fetchAll}>{busy?L('Veriler alınıyor…','Fetching…'):L('Verileri al','Fetch data')}</button>
      </div>
    </div>
    {prog&&prog.total>0&&<div className="pw-prog" role="status">
      {busy?L(`Polar'dan alınıyor: ${prog.done}/${prog.total} sporcu`,`Fetching from Polar: ${prog.done}/${prog.total} athletes`)
        :L(`${prog.total-prog.fails.length}/${prog.total} sporcunun verisi güncellendi.`,`Updated ${prog.total-prog.fails.length}/${prog.total} athletes.`)}
      {prog.fails.map(f=><div key={f.name} className="pw-fail">{f.name}: {f.msg}</div>)}
    </div>}
    {err&&<div className="pw-err" role="alert">{err}</div>}
    {!data?<div className="pw-empty">{L('"Verileri al"a bastığında Polar\'a bağlı bütün sporcuların verisi güncellenir ve burada listelenir. Sporcuyu bağlamak için: Kadro → sporcu → Profil → Polar.','Press "Fetch data" to update and list every Polar-connected athlete. To connect an athlete: Roster → athlete → Profile → Polar.')}</div>
    :<>
      <div className="pw-tw"><table className="pw-t pw-team">
        <thead><tr>
          <th>{L('Sporcu','Athlete')}</th><th>Polar</th><th>{L('Son gece','Last night')}</th><th>{L('Uyku','Sleep')}</th><th>{L('Skor','Score')}</th>
          <th>HRV</th><th>{L('HRV 7g ort.','HRV 7d avg')}</th><th>{L('Gece nabzı','Night HR')}</th><th>{L('Solunum','Breathing')}</th><th>ANS</th>
          <th>{L('Adım','Steps')}</th><th>{L('Antr. 7g','Sessions 7d')}</th><th>{L('Yük 7g','Load 7d')}</th>
        </tr></thead>
        <tbody>{rows.map(({a,p})=>{
          const[stTxt,stCls]=(PW_STATUS[(p&&p.status)||'none']||PW_STATUS.none)();
          const open=!!(p&&(p.sleep.length||p.recharge.length||p.activity.length||p.exercises.length));
          const m=open?pwSummary(p,todayIso):null;   // hiç verisi olmayan satırda sayı yerine "—"
          return(<tr key={a.id} className={(open?'pw-click ':'')+(sel===String(a.id)?'on':'')} onClick={open?()=>setSel(sel===String(a.id)?null:String(a.id)):undefined}
            tabIndex={open?0:undefined} onKeyDown={open?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSel(String(a.id));}}:undefined}>
            <td className="pw-name">{a.name||'—'}</td>
            <td><span className={'pw-st pw-'+stCls}>{stTxt}</span></td>
            <td>{m&&m.s?pwDm(m.s.date):'—'}</td>
            <td>{m&&m.s?pwDur(m.s.asleepSec):'—'}</td>
            <td>{m&&m.s?pwR(m.s.sleepScore):'—'}</td>
            <td>{m&&m.r?pwR(m.r.hrvMs):'—'}</td>
            <td>{m?pwR(m.hrv7):'—'}</td>
            <td>{m&&m.r?pwR(m.r.hrAvg):'—'}</td>
            <td>{m&&m.r?pwR(m.r.breathingRate,1):'—'}</td>
            <td>{m&&m.r?pwR(m.r.ansCharge,1):'—'}</td>
            <td>{m&&m.act?pwR(m.act.steps):'—'}</td>
            <td>{m?m.ex7n:'—'}</td>
            <td>{m?pwR(m.load7):'—'}</td>
          </tr>);})}</tbody>
      </table></div>
      <div className="pw-foot">{L('Satıra tıkla → sporcunun grafikleri. "—": Polar bu değeri göndermedi. HRV 7g ortalaması, 7 günlük antrenman sayısı ve yük toplamı hesaplanır.','Click a row → the athlete\'s charts. "—": Polar did not send this value. HRV 7-day mean, 7-day session count and load total are calculated.')}</div>
      {selRow&&<PwAthlete key={selRow.a.id} a={selRow.p} name={selRow.a.name||selRow.p.athleteName} from={data.from} to={data.to} onClose={()=>setSel(null)}/>}
    </>}
  </div>);
}
