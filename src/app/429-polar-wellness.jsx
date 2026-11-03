/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS → POLAR: "Verileri al", takım tablosu ve sporcu grafikleri

   "Verileri al": takımın Polar'a bağlı her sporcusu için sunucuda senkron
   (functions/polar → /sync, aynı anda 3 sporcu), ardından Wellness'ta SEÇİLİ
   GÜNÜN Polar verisi tek istekle (/team-data, from = to = o gün) gelir. Senkron
   az önce yapıldıysa (TOO_SOON) sporcu "güncel" sayılır. 14/28 günlük
   grafikler sporcunun kendi sayfasında (PolarAthleteCharts); aralık bugünle
   biten tam 14 / 28 gün (yerel takvim), istekte açık from/to olarak gidiyor.
   Profil Çıktısı'nın aylık "Polar Loop" bölümü de burada (pwSheetSection).

   Ekranda yalnızca Polar'ın gönderdiği değerler var; gelmeyen değer "—".
   Hesaplanan şeyler adıyla belli (7 günlük ortalamalar, günün antrenman
   süresi/yük toplamı). Sporcunun senkronlanan kendi verisine
   (team.athletes) hiçbir şey yazılmıyor: bu bölüm yalnızca okur.

   Sporcu görünümü sade: üstte son değer + 7 günlük ortalama kutucukları, altında
   yalnızca 4 grafik (HRV, uyku süresi, gece nabzı, antrenman yükü). Tek eksen,
   tek renk; HRV ve gece nabzında her gece soluk nokta, üstünde 7 günlük ortalama
   çizgisi — ikisi biçimle ayrılıyor ve başlıkta düz yazıyla adlandırılıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const PW_DAYS=[14,28];
/* Polar Loop logosu: koyu zeminde beyaz, açık temada koyu sürüm. */
const pwLogoSrc=theme=>theme==='light'?'polar-loop-logo-dark.png':'polar-loop-logo.png';
const PW_DAY=86400000;
const pwIso=ms=>new Date(ms).toISOString().slice(0,10);
const pwShift=(iso,d)=>pwIso(Date.parse(iso+'T00:00:00Z')+d*PW_DAY);
function pwKeys(from,to){const out=[];for(let k=from;k<=to&&out.length<200;k=pwShift(k,1))out.push(k);return out;}
const pwNum=v=>typeof v==='number'&&isFinite(v);
function pwMean(a){const v=a.filter(pwNum);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;}
function pwDur(sec){if(!pwNum(sec))return'—';const m=Math.round(sec/60);return L(`${Math.floor(m/60)} sa ${m%60} dk`,`${Math.floor(m/60)}h ${m%60}m`);}
const pwR=(v,d=0)=>pwNum(v)?(d?v.toFixed(d):String(Math.round(v))):'—';
const pwDm=iso=>iso?fd(iso).slice(0,5):'—';

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
      <div className="pw-ath-id"><img className="pw-logo" src={pwLogoSrc(theme)} alt="Polar Loop"/>
        <div><h2>{title}</h2><span className="pw-sub">{fd(from)} – {fd(to)}</span></div></div>
      {tools}
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

/* ── Bireysel: 14 / 28 günlük kutucuklar + grafikler ──────────────────────────
   Sporcu profilinde (Kadro → sporcu → Profil, Polar panelinin altında) ve
   Wellness'ta sporcunun kendi sayfasında. Kendi verisini kendisi ister
   (/team-data, yalnızca bu sporcu); senkron yapmaz.
   Aralık: bugün (yerel gün) dahil geriye tam N gün → from = bugün − (N−1),
   to = bugün. Eskiden yalnızca `days` gidiyordu; sunucu UTC'ye göre
   [bugün − N, yarın] veriyordu (28 yerine 30 gün, sonunda boş bir "yarın"). */
const pwRange=days=>{const to=fmt(new Date());return{from:pwShift(to,-(days-1)),to};};
function PolarAthleteCharts({ath,teamId}){
  const theme=useAppTheme();
  const[days,setDays]=useState(28);
  const[data,setData]=useState(undefined);   // undefined: yükleniyor · null: veri/bağlantı yok
  const[err,setErr]=useState('');
  useEffect(()=>{
    let alive=true;setErr('');
    if(!teamId||!ath||!ath.id){setData(null);return;}
    const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
    if(!u||u.isAnonymous){setData(null);return;}
    setData(undefined);
    const{from,to}=pwRange(days);
    polarCall('/team-data',{teamId,athleteId:String(ath.id),from,to})
      .then(j=>{if(!alive)return;const a=(j.athletes||[])[0];setData(a?{a,from:j.from,to:j.to}:null);})
      .catch(e=>{if(alive){setErr(e.message||String(e));setData(null);}});
    return()=>{alive=false;};
  },[ath&&ath.id,teamId,days]);
  if(data===null&&!err)return null;          // Polar bağlantısı hiç olmamış sporcu: bölüm görünmez
  const tools=<div className="lb-seg">{PW_DAYS.map(d=><button key={d} className={days===d?'on':''} onClick={()=>setDays(d)}>{L(`${d} gün`,`${d} days`)}</button>)}</div>;
  const logo=<img className="pw-logo" src={pwLogoSrc(theme)} alt="Polar Loop"/>;
  if(err)return<div className="panel pw-ath"><div className="pw-ath-h"><div className="pw-ath-id">{logo}<div><h2>{L('Polar verisi','Polar data')}</h2></div></div>{tools}</div><div className="pw-err">{err}</div></div>;
  if(data===undefined)return<div className="panel pw-ath"><div className="pw-ath-h"><div className="pw-ath-id">{logo}<div><h2>{L('Polar verisi','Polar data')}</h2><span className="pw-sub">{L('Yükleniyor…','Loading…')}</span></div></div>{tools}</div></div>;
  return<PwAthlete a={data.a} title={L(`Polar verisi · son ${days} gün`,`Polar data · last ${days} days`)} from={data.from} to={data.to} tools={tools}/>;
}

/* ── Wellness: takımın GÜNLÜK Polar tablosu ──────────────────────────────────
   Wellness'ın üstündeki tarih seçicide hangi gün seçiliyse o günün verisi.
   Gece verisi (uyku, HRV, gece nabzı, solunum, ANS) uyanılan SABAHIN tarihini
   taşır — CoachOS'un gece kaydıyla aynı kural. Adım ve antrenman o güne ait;
   bugün seçiliyse gün içinde artar. Satıra tıklayınca sporcunun sayfası açılır;
   14/28 günlük grafikler orada. Başlığın solunda Polar Loop logosu (pwLogoSrc). */
function PolarWellness({team,dayKey,onOpen}){
  const theme=useAppTheme();
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
      <div className="pw-ath-id"><img className="pw-logo" src={pwLogoSrc(theme)} alt="Polar Loop"/><div><h2>Polar</h2><span className="pw-sub">{data
        ?L(`${nLinked} sporcu bağlı · ${fd(day)}${isToday?' (bugün)':''}`,`${nLinked} athletes connected · ${fd(day)}${isToday?' (today)':''}`)
        :L('Polar\'a bağlı sporcuların günlük uyku, toparlanma, aktivite ve antrenman verisi','Daily sleep, recovery, activity and training data of Polar-connected athletes')}</span></div></div>
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
          <th>{L('Sporcu','Athlete')}</th><th>Polar</th><th>{L('Uyku','Sleep')}</th><th>{L('Uyku skoru','Sleep score')}</th>
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
            <td>{s?pwDur(s.asleepSec):'—'}</td>
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
      <div className="pw-foot">{L(`Uyku, HRV, gece nabzı, solunum ve ANS o sabah uyanılan gecenin verisidir. Adım ve antrenman ${isToday?'bugüne aittir ve gün içinde artar':'o güne aittir'}. "—": Polar bu değeri göndermedi. Satıra tıkla → sporcunun 14/28 günlük grafikleri.`,
        `Sleep, HRV, night HR, breathing and ANS belong to the night ending that morning. Steps and training ${isToday?'are today\'s and grow during the day':'belong to that day'}. "—": Polar did not send this value. Click a row → the athlete\'s 14/28-day charts.`)}</div>
    </>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFİL ÇIKTISI → "Polar Loop" bölümü (426, printAthleteInfo)

   Sezonun (Sezon sekmesi: setup.seasonStart → seasonEnd) başladığı aydan bittiği
   aya kadar her ay bir satır; iki tablo:
     UYKU        ort. uyku süresi, ort. uyku skoru, ort. uykuya dalış / uyanma
                 saati, uyku düzenliliği, uyku verimliliği, ort. derin uyku
     TOPARLANMA  ort. gece nabzı, ort. HRV (RMSSD), ort. ANS, Nightly Recharge
                 dağılımı
   En altta sezonun tamamı. Polar'ın gönderdiği değerlerin aylık ortalaması;
   HESAPLANAN üç değer dipnotta adıyla: düzenlilik (yatış ve uyanış saatinin
   standart sapması, en az 3 gece), verimlilik (uyku süresi ÷ uykuya dalıştan
   uyanmaya geçen süre) ve saat ortalamaları (gece yarısını aşan saatler doğru
   ortalansın diye yatış 12:00'den, uyanış 18:00'den başlayan 24 saatte).

   Veri: /team-data, en çok 3 aylık parçalar (sunucunun tek istek sınırı 92 gün),
   yalnızca başlamış aylar. Sporcunun Polar bağlantısı hiç olmamışsa ya da koç
   oturumu yoksa bölüm çıktıda yer almaz (null). İstek başarısızsa bölüm, nedeni
   yazan tek bir satırla görünür.
   ═══════════════════════════════════════════════════════════════════════════ */
/* Polar nightly_recharge_status: 1 çok zayıf … 6 çok iyi. */
const PW_RECHARGE=[
  {n:1,tr:'Çok zayıf',en:'Very poor',c:'#b91c1c'},
  {n:2,tr:'Zayıf',en:'Poor',c:'#ef4444'},
  {n:3,tr:'Yetersiz',en:'Compromised',c:'#f59e0b'},
  {n:4,tr:'Normal',en:'OK',c:'#9ca3af'},
  {n:5,tr:'İyi',en:'Good',c:'#4ade80'},
  {n:6,tr:'Çok iyi',en:'Very good',c:'#15803d'},
];
/* Çıktının beyaz zemini için koyu logo, sayfanın içinde (çıktı penceresi dosya çekmesin). */
const PW_LOGO_PRINT='data:image/png;base64,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';

/* Sezonun ayları: [{key:'2026-08', y, m, from:'2026-08-01', to:'2026-08-31'}] */
function pwSeasonMonths(s){
  const ok=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  if(!s||!ok(s.seasonStart)||!ok(s.seasonEnd)||s.seasonStart>s.seasonEnd)return[];
  let y=+s.seasonStart.slice(0,4),m=+s.seasonStart.slice(5,7);
  const ey=+s.seasonEnd.slice(0,4),em=+s.seasonEnd.slice(5,7);
  const out=[];
  while((y<ey||(y===ey&&m<=em))&&out.length<24){
    const key=`${y}-${String(m).padStart(2,'0')}`;
    out.push({key,y,m,from:key+'-01',to:`${key}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`});
    m++;if(m>12){m=1;y++;}
  }
  return out;
}

/* "2026-10-05T23:41:00+03:00" → dakika (cihazın yerel saati), [pivot, pivot+24 sa) aralığında. */
function pwClock(iso,pivot){
  const m=/T(\d{2}):(\d{2})/.exec(String(iso||''));if(!m)return null;
  let t=+m[1]*60+(+m[2]);
  while(t<pivot)t+=1440;while(t>=pivot+1440)t-=1440;
  return t;
}
const pwHm=t=>{if(!pwNum(t))return'—';const x=((Math.round(t)%1440)+1440)%1440;return`${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;};
function pwSd(a){const v=a.filter(pwNum);if(v.length<3)return null;const m=v.reduce((s,x)=>s+x,0)/v.length;return Math.sqrt(v.reduce((s,x)=>s+(x-m)*(x-m),0)/(v.length-1));}

/* Bir dönemin (ay ya da sezon) özeti. */
function pwPeriodStats(sleep,recharge){
  const bed=sleep.map(x=>pwClock(x.sleepStart,12*60)),wake=sleep.map(x=>pwClock(x.sleepEnd,-6*60));
  const eff=sleep.map(x=>{const a=Date.parse(x.sleepStart),b=Date.parse(x.sleepEnd);
    if(!pwNum(x.asleepSec)||!isFinite(a)||!isFinite(b)||b<=a)return null;return Math.min(1,x.asleepSec/((b-a)/1000))*100;});
  const dist=PW_RECHARGE.map(r=>recharge.filter(x=>x.nightlyRechargeStatus===r.n).length);
  return{
    nSleep:sleep.length,nRech:recharge.length,
    asleep:pwMean(sleep.map(x=>x.asleepSec)),score:pwMean(sleep.map(x=>x.sleepScore)),
    bed:pwMean(bed),wake:pwMean(wake),bedSd:pwSd(bed),wakeSd:pwSd(wake),
    eff:pwMean(eff),deep:pwMean(sleep.map(x=>x.deepSec)),
    hr:pwMean(recharge.map(x=>x.hrAvg)),hrv:pwMean(recharge.map(x=>x.hrvMs)),ans:pwMean(recharge.map(x=>x.ansCharge)),
    dist,nDist:dist.reduce((s,x)=>s+x,0),
  };
}

/* Sezonun Polar verisi: { months:[{...ay, sleep, recharge}], status } | { error } | null */
async function pwSeasonData(ath,teamId,setup){
  const months=pwSeasonMonths(setup);
  if(!months.length||!teamId||!ath||!ath.id)return null;
  const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
  if(!u||u.isAnonymous)return null;
  const today=fmt(new Date());
  const live=months.filter(x=>x.from<=today);
  /* Hiç ay başlamadıysa bağlantıyı bugünün tek günüyle yokla. */
  const chunks=[];
  for(let i=0;i<live.length;i+=3){const g=live.slice(i,i+3);const to=g[g.length-1].to;chunks.push({from:g[0].from,to:to>today?today:to});}
  if(!chunks.length)chunks.push({from:today,to:today});
  let res;
  try{res=await Promise.all(chunks.map(c=>polarCall('/team-data',{teamId,athleteId:String(ath.id),from:c.from,to:c.to})));}
  catch(e){return{error:e.message||String(e)};}
  const as=res.map(j=>(j.athletes||[])[0]).filter(Boolean);
  if(!as.length)return null;                 // Polar bağlantısı hiç olmamış sporcu
  const all=k=>as.flatMap(a=>a[k]||[]);
  const sleep=all('sleep'),recharge=all('recharge');
  const last=as[as.length-1];
  return{status:last.status,lastSyncAt:last.lastSyncAt||null,
    months:months.map(mo=>({...mo,started:mo.from<=today,
      sleep:sleep.filter(x=>x.date>=mo.from&&x.date<=mo.to),recharge:recharge.filter(x=>x.date>=mo.from&&x.date<=mo.to)}))};
}

const PW_SHEET_CSS=`
.pl-sec{break-inside:avoid;page-break-inside:avoid}
.plh .plg{height:26px;width:auto;flex:none;margin-left:auto}
.pl-t{table-layout:fixed;margin-bottom:4px}
.pl-t th,.pl-t td{text-align:center;padding:4px 4px;white-space:nowrap}
.pl-t th:first-child,.pl-t td:first-child{text-align:left}
.pl-t th{font-size:7.6px;letter-spacing:.05em;white-space:normal;line-height:1.25;vertical-align:bottom}
.pl-t td{font-size:9.4px;font-variant-numeric:tabular-nums}
.pl-t td.mo b{font-weight:700}.pl-t td.mo small{color:var(--dim);font-size:8px;margin-left:3px}
.pl-t tr.fut td{color:var(--dim)}
.pl-t tr.tot td{border-top:1.5px solid var(--ink);font-weight:700;background:var(--soft)}
.pl-t td small.u{color:var(--mu);font-size:8px;margin-left:1px}
.pl-bar{display:flex;height:7px;border-radius:1px;overflow:hidden;background:var(--soft);border:1px solid var(--ln)}
.pl-bar i{display:block;height:100%}
.pl-cnt{display:flex;gap:6px;justify-content:flex-start;margin-top:2px;font-size:8px;color:var(--t2)}
.pl-cnt span{display:inline-flex;align-items:center;gap:2px}
.pl-cnt i,.pl-key i{width:6px;height:6px;border-radius:1px;display:inline-block}
.pl-key{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:8px;color:var(--mu);margin:2px 0 6px}
.pl-key span{display:inline-flex;align-items:center;gap:3px}
.pl-fn{font-size:8px;color:var(--mu);line-height:1.4}
`;

/* Çıktının "Polar Loop" bölümü (HTML) ya da '' (bölüm yok). n: bölüm numarası. */
async function pwSheetSection(ath,teamId,setup,n){
  let d=null;
  try{d=await Promise.race([pwSeasonData(ath,teamId,setup),new Promise(r=>setTimeout(()=>r({error:L('Polar servisi zamanında yanıt vermedi.','The Polar service did not answer in time.')}),25000))]);}
  catch(e){d={error:e.message||String(e)};}
  if(!d)return'';
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const months=pwSeasonMonths(setup);
  const span=months.length?`${L(MN_TR[months[0].m-1],MN_EN[months[0].m-1])} ${months[0].y} – ${L(MN_TR[months[months.length-1].m-1],MN_EN[months[months.length-1].m-1])} ${months[months.length-1].y}`:'';
  const head=`<div class="sec-h plh"><span class="n">${n}</span><div><div class="t">Polar Loop</div>
    <div class="d">${esc(L(`Uyku ve toparlanma, aylık ortalamalar · sezon ${span}`,`Sleep and recovery, monthly averages · season ${span}`))}</div></div>
    <img class="plg" src="${PW_LOGO_PRINT}" alt="Polar Loop"/></div>`;
  if(d.error)return`<section class="pl-sec">${head}<div class="card none">${esc(L('Polar verisi alınamadı: ','Polar data could not be loaded: ')+d.error)}</div></section>`;
  const u=(v,unit)=>v==='—'?v:`${v}<small class="u">${unit}</small>`;
  const r0=v=>pwR(v),r1=v=>pwR(v,1);
  const ans=v=>pwNum(v)?(v>0?'+':'')+v.toFixed(1):'—';
  const sdTxt=(a,b)=>pwNum(a)||pwNum(b)?`±${pwR(a)} / ±${pwR(b)}<small class="u">${L('dk','min')}</small>`:'—';
  const moCell=mo=>`<td class="mo"><b>${esc(L(MN_TR[mo.m-1],MN_EN[mo.m-1]))}</b><small>${mo.y}</small></td>`;
  const rows=d.months.map(mo=>({mo,st:pwPeriodStats(mo.sleep,mo.recharge)}));
  const season=pwPeriodStats(d.months.flatMap(x=>x.sleep),d.months.flatMap(x=>x.recharge));
  const totCell=`<td class="mo"><b>${L('Sezon','Season')}</b></td>`;
  const sleepRow=(first,st,cls)=>`<tr class="${cls}">${first}<td>${st.nSleep||'—'}</td><td>${pwDur(st.asleep)}</td><td>${r0(st.score)}</td>
    <td>${pwHm(st.bed)}</td><td>${pwHm(st.wake)}</td><td>${sdTxt(st.bedSd,st.wakeSd)}</td><td>${pwNum(st.eff)?'%'+pwR(st.eff):'—'}</td><td>${pwDur(st.deep)}</td></tr>`;
  const distCell=st=>!st.nDist?'<td>—</td>':`<td><div class="pl-bar">${PW_RECHARGE.map((r,i)=>st.dist[i]?`<i style="width:${(st.dist[i]/st.nDist*100).toFixed(2)}%;background:${r.c}"></i>`:'').join('')}</div>
    <div class="pl-cnt">${PW_RECHARGE.map((r,i)=>st.dist[i]?`<span><i style="background:${r.c}"></i>${st.dist[i]}</span>`:'').join('')}</div></td>`;
  const rechRow=(first,st,cls)=>`<tr class="${cls}">${first}<td>${st.nRech||'—'}</td><td>${u(r0(st.hr),'bpm')}</td><td>${u(r0(st.hrv),'ms')}</td><td>${ans(st.ans)}</td>${distCell(st)}</tr>`;
  const cls=x=>x.mo.started?'':'fut';
  const sleepT=`<table class="pl-t"><colgroup><col style="width:15%"/><col style="width:7%"/><col style="width:13%"/><col style="width:9%"/><col style="width:11%"/><col style="width:10%"/><col style="width:14%"/><col style="width:9%"/><col/></colgroup>
    <tr><th>${L('Ay','Month')}</th><th>${L('Gece','Nights')}</th><th>${L('Ort. uyku süresi','Avg sleep')}</th><th>${L('Ort. uyku skoru','Avg sleep score')}</th>
      <th>${L('Ort. uykuya dalış','Avg sleep onset')}</th><th>${L('Ort. uyanma','Avg wake-up')}</th><th>${L('Uyku düzenliliği (dalış / uyanma sapması)','Sleep regularity (onset / wake SD)')}</th>
      <th>${L('Uyku verimliliği','Sleep efficiency')}</th><th>${L('Ort. derin uyku','Avg deep sleep')}</th></tr>
    ${rows.map(x=>sleepRow(moCell(x.mo),x.st,cls(x))).join('')}${sleepRow(totCell,season,'tot')}</table>`;
  const rechT=`<table class="pl-t"><colgroup><col style="width:15%"/><col style="width:7%"/><col style="width:12%"/><col style="width:13%"/><col style="width:10%"/><col/></colgroup>
    <tr><th>${L('Ay','Month')}</th><th>${L('Gece','Nights')}</th><th>${L('Ort. gece nabzı','Avg night HR')}</th><th>${L('Ort. HRV (RMSSD)','Avg HRV (RMSSD)')}</th>
      <th>${L('Ort. ANS','Avg ANS')}</th><th>${L('Nightly Recharge dağılımı (gece sayısı)','Nightly Recharge distribution (nights)')}</th></tr>
    ${rows.map(x=>rechRow(moCell(x.mo),x.st,cls(x))).join('')}${rechRow(totCell,season,'tot')}</table>
    <div class="pl-key">${PW_RECHARGE.map(r=>`<span><i style="background:${r.c}"></i>${esc(L(r.tr,r.en))}</span>`).join('')}</div>`;
  /* Hiç veri yoksa boş tablo basılmaz: neden olabileceği (bağlantı durumu, son senkron) tek satırda. */
  const anyData=season.nSleep||season.nRech;
  if(!anyData){
    const[stTxt]=(PW_STATUS[d.status||'none']||PW_STATUS.none)();
    const ls=pwNum(d.lastSyncAt)?fd(fmt(new Date(d.lastSyncAt))):L('hiç yapılmadı','never');
    return`<section class="pl-sec">${head}<div class="card none">${esc(L(`Sezon boyunca Polar'dan uyku ya da toparlanma verisi gelmedi · Polar: ${stTxt} · son senkron: ${ls}`,
      `No sleep or recovery data came from Polar during the season · Polar: ${stTxt} · last sync: ${ls}`))}</div></section>`;
  }
  /* Başlık ve içerik aynı sayfada: bölüm bölünmeden (sığmazsa bütünüyle) sonraki sayfaya geçer;
     yine de bölünürse başlık Uyku tablosuyla aynı blokta kalır. */
  return`<section class="pl-sec">
    <div class="blk">${head}<div class="sub-h">${L('Uyku','Sleep')}</div>${sleepT}</div>
    <div class="blk"><div class="sub-h">${L('Toparlanma','Recovery')}</div>${rechT}</div>
    <div class="pl-fn">${L('Değerler Polar Loop\'un gönderdiği gecelerin aylık ortalamasıdır; "—": o ay veri yok. Gece verisi uyanılan sabahın tarihini taşır. Hesaplananlar: uyku düzenliliği = uykuya dalış ve uyanma saatinin standart sapması (en az 3 gece); uyku verimliliği = uyku süresi ÷ uykuya dalıştan uyanmaya geçen süre; uyku süresi = Polar uyku evrelerinin toplamı. ANS: Polar ANS Charge (−10 … +10).',
      'Values are monthly means of the nights Polar Loop sent; "—": no data that month. Night data carries the date of the morning woken up. Calculated: sleep regularity = standard deviation of sleep onset and wake-up time (at least 3 nights); sleep efficiency = sleep time ÷ time from sleep onset to wake-up; sleep time = sum of Polar sleep stages. ANS: Polar ANS Charge (−10 … +10).')}</div>
  </section>`;
}
