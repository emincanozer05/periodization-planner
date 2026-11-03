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

function PwAthlete({a,name,from,to,onClose}){
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
  const todayIso=pwIso(Date.now());
  const ex7=(a.exercises||[]).filter(e=>e.date>pwShift(todayIso,-7));
  const load7=ex7.map(e=>e.trainingLoad).filter(pwNum);
  const legend=L('nokta: her gece · çizgi: 7 günlük ortalama','dot: each night · line: 7-day mean');
  return(<div className="panel pw-ath">
    <div className="pw-ath-h">
      <div><h2>{name}</h2><span className="pw-sub">{L('Polar verisi','Polar data')} · {fd(from)} – {fd(to)}</span></div>
      <button className="btn sm sec" onClick={onClose}>{L('Kapat','Close')}</button>
    </div>
    <div className="pw-tiles">
      {tile(L('Uyku','Sleep'),a.sleep,x=>x.asleepSec,v=>pwDur(v))}
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
        sets={[pwBars(L('Uyku','Sleep'),by(a.sleep,x=>pwNum(x.asleepSec)?x.asleepSec/3600:null),C1)]}
        help={L('Her çubuk bir gece (Polar uyku evrelerinin toplamı).','Each bar is one night (sum of Polar sleep stages).')}/>
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
