/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS → POLAR: "Verileri al", takım tablosu ve sporcu grafikleri

   "Verileri al": takımın Polar'a bağlı her sporcusu için sunucuda senkron
   (functions/polar → /sync, aynı anda 3 sporcu), ardından Wellness'ta SEÇİLİ
   GÜNÜN Polar verisi tek istekle (/team-data, from = to = o gün) gelir; tablodaki gece
   nabzı (pwNight) Gece Nabzı Takibi'yle (pwNightHrMap) aynı kuralla. Senkron
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

/* ── Wellness sporcu sayfası: Polar gece nabzı, ay ay ─────────────────────────
   Takvim ve eğri hafta / ay arasında gezdikçe gereken aylar (/team-data, bu sporcu,
   ayın 1'i → ayın sonu ya da bugün) bir kez istenir ve oturum boyunca saklanır; içinde
   bulunulan ay 10 dakikada bir tazelenir. Dönen: {by:{'YYYY-MM-DD':bpm}, sleep:{'YYYY-MM-DD':uyuma sn},
   ex:[antrenman (spor, süre, HR bölgeleri)], linked, loaded, off, err}. Gece verisi uyanılan sabahın tarihini taşır — takvim günüyle aynı kural. */
const PW_NHR_CACHE=new Map();
function pwMonthsOf(from,to){
  const out=[];if(!from||!to||from>to)return out;
  let y=+from.slice(0,4),m=+from.slice(5,7);const ey=+to.slice(0,4),em=+to.slice(5,7);
  while((y<ey||(y===ey&&m<=em))&&out.length<24){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}
  return out;
}
function usePolarNightHR(ath,teamId,from,to){
  const months=pwMonthsOf(from,to);
  const id=ath&&ath.id?String(ath.id):'';
  const[,setTick]=useState(0);
  const[err,setErr]=useState('');
  const key=m=>`${teamId}|${id}|${m}`;
  const todayK=fmt(new Date());
  const fresh=m=>{const c=PW_NHR_CACHE.get(key(m));return!!c&&(m<todayK.slice(0,7)||Date.now()-c.at<6e5);};
  const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
  const off=!teamId||!id||!u||u.isAnonymous;
  useEffect(()=>{
    if(off)return;
    let alive=true;
    const need=months.filter(m=>!fresh(m)&&m+'-01'<=todayK);
    if(!need.length)return;
    Promise.all(need.map(m=>{
      const last=`${m}-${String(new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate()).padStart(2,'0')}`;
      return polarCall('/team-data',{teamId,athleteId:id,from:m+'-01',to:last>todayK?todayK:last}).then(j=>{
        const a=(j.athletes||[])[0];const by=pwNightHrMap(a),sl={};
        /* Uyku süresi de aynı yanıttan: uyanılan sabahın tarihiyle (pwNight'ın kuralı). */
        ((a&&a.sleep)||[]).forEach(x=>{const k=String((x&&x.sleepEnd)||'').slice(0,10)||(x&&x.date);if(k&&pwNum(x.asleepSec))sl[k]=x.asleepSec;});
        /* Antrenmanlar (spor, süre, HR bölgeleri): Wellness gün ayrıntısındaki HR Zone bölümü. */
        const ex=((a&&a.exercises)||[]).filter(e=>e&&e.date);
        PW_NHR_CACHE.set(key(m),{by,sl,ex,linked:!!a,at:Date.now()});
      });}))
      .then(()=>{if(alive){setErr('');setTick(t=>t+1);}})
      .catch(e=>{if(alive)setErr(e.message||String(e));});
    return()=>{alive=false;};
  },[teamId,id,months.join(','),off]);
  const by={},sleep={},exById=new Map();let linked=false,loaded=true;
  months.forEach(m=>{const c=PW_NHR_CACHE.get(key(m));
    if(c){Object.assign(by,c.by);Object.assign(sleep,c.sl||{});(c.ex||[]).forEach(e=>exById.set(e.exerciseId||(e.date+'|'+e.startTime),e));linked=linked||c.linked;}
    else if(m+'-01'<=todayK)loaded=false;});
  const ex=[...exById.values()].sort((x,y)=>String(x.startTime||x.date).localeCompare(String(y.startTime||y.date)));
  return{by,sleep,ex,linked,loaded:off||loaded||!!err,off,err};
}

/* ── Takımın bir tarih aralığındaki Polar verisi (yalnızca istenen türler) ─────
   Gece Nabzı Takibi (12 hafta, `recharge` + `sleep`) ve Yük Takibi'ndeki takım HR Zone grafiği
   (`exercises`) için. Yanıt oturum boyunca saklanır; aralık bugünü içeriyorsa 10
   dakikada bir, ayrıca `ver` değişince ("Verileri al" bitince) yeniden istenir.
   Eski sunucu `kinds`'ı bilmiyorsa bütün türleri döndürür — sonuç aynı. */
const PW_RANGE_CACHE=new Map();
const PW_NONE=[];
function usePolarTeamRange(teamId,from,to,kinds,ver){
  const[,setTick]=useState(0);
  const[err,setErr]=useState('');
  const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
  const todayK=fmt(new Date());
  const off=!teamId||!from||!to||from>to||from>todayK||!u||u.isAnonymous;
  const end=to>todayK?todayK:to;
  const key=`${teamId}|${from}|${end}|${(kinds||[]).join(',')}|${ver||0}`;
  const c=PW_RANGE_CACHE.get(key);
  const fresh=!!c&&(end<todayK||Date.now()-c.at<6e5);
  useEffect(()=>{
    if(off||fresh)return;
    let alive=true;setErr('');
    polarCall('/team-data',{teamId,from,to:end,kinds})
      .then(j=>{PW_RANGE_CACHE.set(key,{athletes:j.athletes||[],at:Date.now()});if(alive)setTick(t=>t+1);})
      .catch(e=>{if(alive)setErr(e.message||String(e));});
    return()=>{alive=false;};
  },[key,off]);
  return{athletes:c?c.athletes:PW_NONE,loaded:off||!!c||!!err,off,err};
}

/* Polar gece nabzı = Nightly Recharge'ın gece ortalaması (`recharge.hrAvg`), uyanılan
   SABAHIN tarihiyle: gecenin uykusunun uyanış saati (`sleepEnd`) hangi güne düşüyorsa o gün;
   uyku kaydı yoksa recharge'ın kendi tarihi. Wellness'taki Polar tablosunun "Gece nabzı"
   sütunu (pwNight) da aynı eşlemeyi yapar — takım ortalaması, sporcu kutuları, Gece Nabzı
   Takibi ve wellness çıktıları bu haritadan okur, hepsi aynı sayıyı söyler.
   Döner: {'YYYY-MM-DD': bpm}. (Eski "RHR = günün en düşük nabzı" kuralı kaldırıldı.) */
function pwNightHrMap(p){
  const out={};if(!p)return out;
  const wake={};(p.sleep||[]).forEach(x=>{const k=String((x&&x.sleepEnd)||'').slice(0,10);if(x&&x.date&&k)wake[x.date]=k;});
  (p.recharge||[]).forEach(r=>{if(r&&r.date&&pwNum(r.hrAvg))out[wake[r.date]||r.date]=r.hrAvg;});
  return out;
}
/* Takımın bütün sporcuları: {athleteId: {'YYYY-MM-DD': bpm}} */
function pwTeamNightHr(athletes){
  const out={};(athletes||[]).forEach(a=>{const m=pwNightHrMap(a);if(Object.keys(m).length)out[a.athleteId]=m;});
  return out;
}

/* ── Antrenmanın kalp atım bölgeleri (Polar HR Zone 1-5) ─────────────────────
   Polar her antrenmanda beş bölgenin alt/üst sınırını ve bölgede geçen süreyi
   gönderiyor. Renkler Polar Flow'un bölge renkleri: gri, mavi, yeşil, sarı, kırmızı. */
const PW_ZONE_COL=['#9ca3af','#3b82f6','#22c55e','#eab308','#ef4444'];
const PW_ZONE_PCT=['50–60%','60–70%','70–80%','80–90%','90–100%'];
/* Bir antrenmanın bölge süreleri: [Z1…Z5] saniye; bölge verisi yoksa null. Polar
   indeksi 1'den başlıyor; 0'dan başlayan bir yanıt da doğru bölgeye düşer. */
function pwZoneSec(e){
  const zs=(e&&Array.isArray(e.zones))?e.zones:null;if(!zs||!zs.length)return null;
  const zero=zs.some(z=>z&&z.index===0);
  const out=[0,0,0,0,0];
  zs.forEach((z,i)=>{if(!z||!pwNum(z.inZoneSec))return;
    const ix=pwNum(z.index)?z.index+(zero?1:0):i+1;
    if(ix>=1&&ix<=5)out[ix-1]+=z.inZoneSec;});
  return out.some(v=>v>0)?out:null;
}
/* Bölge dizilerinin ortalaması (her bölge ayrı): [Z1…Z5] saniye. */
function pwZoneMean(list){
  const v=(list||[]).filter(Boolean);if(!v.length)return null;
  return[0,1,2,3,4].map(i=>v.reduce((s,z)=>s+z[i],0)/v.length);
}
const PW_SPORT={
  STRENGTH_TRAINING:['Kuvvet antrenmanı','Strength training'],BASKETBALL:['Basketbol','Basketball'],
  RUNNING:['Koşu','Running'],TREADMILL_RUNNING:['Koşu bandı','Treadmill'],INDOOR_RUNNING:['Kapalı alan koşu','Indoor running'],
  CYCLING:['Bisiklet','Cycling'],INDOOR_CYCLING:['Kapalı alan bisiklet','Indoor cycling'],
  CIRCUIT_TRAINING:['Devre antrenmanı','Circuit training'],FUNCTIONAL_TRAINING:['Fonksiyonel antrenman','Functional training'],
  CORE:['Core','Core'],MOBILITY:['Mobilite','Mobility'],MOBILITY_DYNAMIC:['Dinamik mobilite','Dynamic mobility'],
  MOBILITY_STATIC:['Statik mobilite','Static mobility'],STRETCHING:['Esneme','Stretching'],YOGA:['Yoga','Yoga'],PILATES:['Pilates','Pilates'],
  WALKING:['Yürüyüş','Walking'],SWIMMING:['Yüzme','Swimming'],HIIT:['HIIT','HIIT'],
  OTHER_INDOOR:['Diğer (kapalı alan)','Other indoor'],OTHER_OUTDOOR:['Diğer (açık alan)','Other outdoor'],OTHER:['Diğer','Other'],
};
function pwSportLbl(e){
  const pickK=v=>{const k=String(v||'').toUpperCase().replace(/[\s-]+/g,'_');return PW_SPORT[k]?k:null;};
  const k=pickK(e&&e.detailedSport)||pickK(e&&e.sport);
  if(k)return L(PW_SPORT[k][0],PW_SPORT[k][1]);
  const raw=String((e&&(e.detailedSport||e.sport))||'').replace(/_/g,' ').toLocaleLowerCase('tr');
  return raw?raw.charAt(0).toLocaleUpperCase('tr')+raw.slice(1):L('Antrenman','Training');
}
const pwMin=sec=>pwNum(sec)?Math.round(sec/60):null;
const pwPct=n=>L(`%${n}`,`${n}%`);
/* Tek satır: başlık + yığılmış bölge çubuğu + bölge başına dakika. */
function PwZoneRow({title,sub,sec,delay}){
  const tot=sec?sec.reduce((a,b)=>a+b,0):0;
  return(<div className="pwz-row">
    <div className="pwz-h"><b>{title}</b>{sub&&<span>{sub}</span>}</div>
    {tot>0?<>
      <div className="pwz-bar" role="img" aria-label={sec.map((v,i)=>`Z${i+1} ${pwMin(v)} ${L('dk','min')}`).join(', ')}>
        {sec.map((v,i)=>v>0?<i key={i} style={{flexGrow:v,background:PW_ZONE_COL[i],animationDelay:((delay||0)+i*60)+'ms'}}
          title={`Z${i+1} · ${pwMin(v)} ${L('dk','min')} · ${pwPct(Math.round(v/tot*100))}`}/>:null)}</div>
      <div className="pwz-leg">{sec.map((v,i)=><span key={i} className={v>0?'':'z0'}><i style={{background:PW_ZONE_COL[i]}}/>Z{i+1}
        <b>{pwMin(v)}</b><small>{L('dk','m')} · {pwPct(Math.round(v/tot*100))}</small></span>)}</div>
    </>:<div className="pwz-none">{L('Polar bu antrenman için bölge verisi göndermedi.','Polar sent no zone data for this session.')}</div>}
  </div>);
}

/* ── Wellness sporcu sayfası → gün ayrıntısı: HR Zone ─────────────────────────
   Üstte seçili günün haftasının (Pzt–Paz) ortalaması: o haftaki Polar antrenmanlarının
   bölge sürelerinin seans başına ortalaması; haftada birden çok spor varsa her spor ayrı
   (kuvvet antrenmanının, basketbolun ortalaması). Altında o gün kaydedilen her antrenman
   kendi bölgeleriyle ayrı ayrı. */
/* Haftanın bölge grafiği: Pzt–Paz her gün bir yığılmış çubuk, çubuğun dilimleri o gün
   kaydedilen bütün Polar antrenmanlarının bölgede geçen DAKİKA toplamı (Z1 altta, Z5
   üstte). Ortalama değil toplam: iki seanslı gün iki seansın süresini taşır, haftanın
   yükü gün gün görünür. Seçili gün koyu, öteki günler hafif soluk; bir güne tıklamak
   (onDay verilmişse) o günü seçer. */
function WvHrZoneWeek({wk,days,dayKey,onDay}){
  const per=days.map(k=>{const zs=wk.filter(x=>x.e.date===k).map(x=>x.z);
    return zs.length?[0,1,2,3,4].map(i=>zs.reduce((s,z)=>s+z[i],0)):null;});
  if(!per.some(Boolean))return null;
  const sel=days.indexOf(dayKey);
  const labels=days.map((k,i)=>`${DN[i]} ${parseD(k).getDate()}`);
  const sets=PW_ZONE_COL.map((c,z)=>({type:'bar',label:'Z'+(z+1),
    data:per.map(p=>p&&p[z]>0?Math.round(p[z]/6)/10:null),
    backgroundColor:days.map((_,i)=>sel<0||i===sel?c:c+'8c'),
    borderSkipped:false,borderRadius:2,stack:'z',barPercentage:.72,categoryPercentage:.9}));
  const opts={responsive:true,maintainAspectRatio:false,animation:false,
    interaction:{mode:'index',intersect:false},
    onClick:onDay?(_,els)=>{const e=els&&els[0];if(e&&days[e.index])onDay(days[e.index]);}:undefined,
    plugins:{legend:{display:false},
      tooltip:{displayColors:true,callbacks:{
        title:it=>it&&it[0]?labels[it[0].dataIndex]:'',
        label:c=>pwNum(c.raw)?`${c.dataset.label}: ${c.raw} ${L('dk','min')}`:null,
        footer:it=>{const p=it&&it[0]&&per[it[0].dataIndex];if(!p)return'';
          return L(`Toplam ${Math.round(p.reduce((a,b)=>a+b,0)/60)} dk`,`Total ${Math.round(p.reduce((a,b)=>a+b,0)/60)} min`);}}}},
    scales:{x:{stacked:true,grid:{display:false},border:{display:false},ticks:{color:'#94a3b8',maxRotation:0,font:{size:10}}},
      y:{stacked:true,beginAtZero:true,grace:'8%',grid:{color:'rgba(255,255,255,.05)'},border:{display:false},
        ticks:{color:'#94a3b8',maxTicksLimit:4,font:{size:10},padding:6},
        title:{display:true,text:L('dk','min'),color:'#94a3b8',font:{size:10}}}}};
  return(<div className="pwz-wk">
    <div className="pwz-wk-cv"><ChartC type="bar" chartData={{labels,datasets:sets}} options={opts}/></div>
  </div>);
}
function WvHrZones({ex,dayKey,msg,bare,onDay}){
  const wS=fmt(sow(parseD(dayKey))),wE=fmt(addD(sow(parseD(dayKey)),6));
  const wk=(ex||[]).filter(e=>e.date>=wS&&e.date<=wE).map(e=>({e,z:pwZoneSec(e)})).filter(x=>x.z);
  const day=(ex||[]).filter(e=>e.date===dayKey);
  const groups=new Map();wk.forEach(x=>{const k=pwSportLbl(x.e);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x.z);});
  const sports=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length);
  const nTxt=n=>L(`${n} antrenman`,`${n} session${n===1?'':'s'}`);
  const tm=e=>{const m=/T(\d{2}:\d{2})/.exec(String(e.startTime||''));return m?m[1]:'';};
  const a=parseD(wS),b=parseD(wE);
  const wLbl=a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${MN[b.getMonth()]}`:`${a.getDate()} ${MN[a.getMonth()]} – ${b.getDate()} ${MN[b.getMonth()]}`;
  const none=!wk.length&&!day.length;
  return(<div className={'pwz'+(bare?' bare':'')}>
    <div className="pwz-k">{L('Kalp atım bölgeleri','Heart rate zones')}<em className="wv-polar-tag">Polar</em></div>
    {none?<div className="pwz-none">{msg||L(`${wLbl} haftasında Polar antrenman kaydı yok.`,`No Polar sessions in the week of ${wLbl}.`)}</div>:<>
      {wk.length>0&&<>
        <div className="pwz-sec">{L('Haftalık bölge dağılımı','Weekly zone distribution')} · {wLbl}</div>
        <WvHrZoneWeek wk={wk} days={Array.from({length:7},(_,i)=>fmt(addD(parseD(wS),i)))} dayKey={dayKey} onDay={onDay}/>
      </>}
      <div className="pwz-sec">{L('Hafta ortalaması','Week average')} · {wLbl}</div>
      {wk.length?<>
        <PwZoneRow title={L('Bütün antrenmanlar','All sessions')} sub={L(`seans başına ort. · ${nTxt(wk.length)}`,`avg per session · ${nTxt(wk.length)}`)} sec={pwZoneMean(wk.map(x=>x.z))}/>
        {sports.length>1&&sports.map(([k,zs],i)=><PwZoneRow key={k} title={k} sub={L(`ort. · ${nTxt(zs.length)}`,`avg · ${nTxt(zs.length)}`)} sec={pwZoneMean(zs)} delay={(i+1)*80}/>)}
      </>:<div className="pwz-none">{L('Bu haftanın antrenmanlarında bölge verisi yok.','No zone data in this week\'s sessions.')}</div>}
      <div className="pwz-sec">{L('Bu gün','This day')} · {fd(dayKey)}</div>
      {day.length?day.map((e,i)=><PwZoneRow key={e.exerciseId||i} title={pwSportLbl(e)} delay={i*80}
        sub={[tm(e),pwNum(e.durationSec)?pwDur(e.durationSec):null,pwNum(e.hrAvg)?L(`ort. ${Math.round(e.hrAvg)} bpm`,`avg ${Math.round(e.hrAvg)} bpm`):null].filter(Boolean).join(' · ')}
        sec={pwZoneSec(e)}/>)
        :<div className="pwz-none">{L('Bu gün Polar antrenman kaydı yok.','No Polar session on this day.')}</div>}
    </>}
    <div className="pwz-scale"><em>{L('Polar varsayılanı, maks. nabzın:','Polar default, of max HR:')}</em>{PW_ZONE_PCT.map((p,i)=><span key={i}><i style={{background:PW_ZONE_COL[i]}}/>Z{i+1} <small>{p}</small></span>)}</div>
  </div>);
}

/* ── Yük Takibi → Takım Yük Trendi: takımın ortalama HR Zone'u ────────────────
   Yük grafiğinin İÇİNDE (280): her günün yük çubuğu, o günün bölge dağılımına göre
   bölünüp boyanır (tek çubuk; ayrı bölge çubuğu ve sağ eksen yok). Her gün, o gün Polar'da antrenmanı (bölge verisiyle) olan BÜTÜN
   sporcuların bölge sürelerinin ortalaması: önce sporcunun o günkü antrenmanları toplanır
   (iki seans = günün toplamı), sonra sporcular arasında ortalama. Antrenmana katılmayan
   sporcu ortalamayı sıfırla aşağı çekmez. */
function useTeamHrZones(teamId,days){
  const from=days[0],to=days[days.length-1];
  const R=usePolarTeamRange(teamId,from,to,['exercises']);
  const per=days.map(k=>{
    const ath=[];
    R.athletes.forEach(a=>{const zs=(a.exercises||[]).filter(e=>e.date===k).map(pwZoneSec).filter(Boolean);
      if(zs.length)ath.push([0,1,2,3,4].map(i=>zs.reduce((s,z)=>s+z[i],0)));});
    return{k,n:ath.length,avg:pwZoneMean(ath)};
  });
  /* Aralığın özeti: sporcu-gün başına ortalama dakika ve yüzde. */
  const all=per.filter(p=>p.n);
  const tot=[0,1,2,3,4].map(i=>all.reduce((s,p)=>s+p.avg[i]*p.n,0));
  const nAD=all.reduce((s,p)=>s+p.n,0);
  return{R,per,any:all.length>0,tot,nAD,sum:tot.reduce((a,b)=>a+b,0)};
}
/* Günün yük çubuğunun İÇİNDEKİ bölge dilimleri: yükü (AU) o günün bölge sürelerinin
   payına göre böler, Z1 altta Z5 üstte — çubuğun boyu yine günün yükü, renkleri
   bölge dağılımı. Yükün yığınında (`load`, sol eksen) durur; order 0: akut çizginin
   dolgusu bölge renklerini boyamasın diye en üstte çizilir. Her dilim kendi dakikasını
   (`zmin`) ve yüzdesini (`zpct`) taşır; ipucu bunları yazar. Yükü 0 olan günün çubuğu
   olmadığı için bölgesi de çizilmez (alt satırdaki özet ve ipucu yine sayar).
   `zday(i)`: o gün bölgelere bölünecek mi — yük çubuğunun kendisi o gün boş bırakılır. */
function pwZoneDay(Z,daily,i){
  const p=Z&&Z.per[i];if(!p||!p.avg||!(daily[i]>0))return null;
  const sum=p.avg.reduce((a,b)=>a+b,0);return sum>0?{p,sum}:null;
}
function pwZoneDatasets(Z,daily){
  if(!Z||!Z.any)return[];
  const days=(daily||[]).map((_,i)=>pwZoneDay(Z,daily,i));
  /* Yalnızca en üstteki ve en alttaki dolu dilimin köşeleri yuvarlak: tek çubuk gibi dursun. */
  const edge=(i,top)=>{const d=days[i];if(!d)return-1;const ix=[0,1,2,3,4].filter(z=>d.p.avg[z]>0);return top?ix[ix.length-1]:ix[0];};
  return PW_ZONE_COL.map((c,z)=>({type:'bar',label:'Z'+(z+1),
    data:days.map((d,i)=>d&&d.p.avg[z]>0?daily[i]*d.p.avg[z]/d.sum:null),
    zmin:days.map(d=>d?Math.round(d.p.avg[z]/6)/10:null),
    zpct:days.map(d=>d?Math.round(d.p.avg[z]/d.sum*100):null),
    backgroundColor:c,borderSkipped:false,
    borderRadius:ctx=>{const t=edge(ctx.dataIndex,true)===z?7:0,b=edge(ctx.dataIndex,false)===z?7:0;
      return{topLeft:t,topRight:t,bottomLeft:b,bottomRight:b};},
    stack:'load',yAxisID:'y',order:0,categoryPercentage:.82,barPercentage:.9}));
}
/* Grafiğin altındaki satır: bölge özeti ya da Polar durumu. */
function TeamHrZoneSummary({Z}){
  const R=Z.R;
  if(R.off)return null;
  if(R.err)return<div className="pwz-none">{L('Polar HR Zone verisi alınamadı: ','Polar HR zone data could not be loaded: ')}{R.err}</div>;
  if(!R.loaded)return<div className="pwz-none">{L('Polar HR Zone verisi yükleniyor…','Loading Polar HR zone data…')}</div>;
  if(!Z.any)return<div className="pwz-none">{L('Bu aralıkta bölge verili Polar antrenmanı yok.','No Polar sessions with zone data in this range.')}</div>;
  return(<div className="pwz-leg pwz-sum"><b className="pwz-sum-k">{L('HR Zone','HR Zone')}</b>{Z.tot.map((v,i)=><span key={i} className={v>0?'':'z0'}><i style={{background:PW_ZONE_COL[i]}}/>Z{i+1}
    <b>{Math.round(v/Z.nAD/60)}</b><small>{L('dk','m')} · {pwPct(Z.sum?Math.round(v/Z.sum*100):0)}</small></span>)}
    <em>{L(`antrenmana katılan sporcuların ortalaması · sporcu-gün başına · ${Z.nAD} sporcu-gün · Polar`,`mean of athletes who trained · per athlete-day · ${Z.nAD} athlete-days · Polar`)}</em></div>);
}

/* ── Yük Takibi → Sporcu Yük Panosu: sporcunun haftalık HR Zone'u ───────────────
   İki sütun:
   · Gün gün (PwZoneWeekStrip): Pzt–Paz her gün bir kutu. Kutunun İÇİNDE o günkü bütün
     Polar antrenmanlarının bölgede geçen toplam DAKİKASI yazar; yazının ve zeminin rengi
     günün ortalama bölgesi (dakika ağırlıklı Z1…Z5 — gri, mavi, yeşil, sarı, kırmızı), yani
     günün ne kadar sert geçtiği bir bakışta okunur. Kutunun altındaki ince şerit günün
     Z1→Z5 dağılımı. Üzerine gelince ayrıntı kutusu: her bölgenin dakikası, yüzdesi,
     çubuğu ve o gün kaydedilen antrenmanlar. Kaydı olmayan gün "·".
   · Hafta (PwZoneWeekSum): haftanın toplam bölge dağılımı tek yatay çubukta, yanında
     toplam dakika ve yüksek yoğunluk payı (Z4+Z5).
   `pwAthZoneWeek` sporcunun Polar kaydından yedi günü çıkarır: {z:[Z1…Z5] sn, sports:[…]}
   ya da null. */
function pwAthZoneWeek(p,days){
  return days.map(k=>{const ex=((p&&p.exercises)||[]).filter(e=>e&&e.date===k).map(e=>({e,z:pwZoneSec(e)})).filter(x=>x.z);
    if(!ex.length)return null;
    return{z:[0,1,2,3,4].map(i=>ex.reduce((s,x)=>s+x.z[i],0)),sports:ex.map(x=>pwSportLbl(x.e))};});
}
const pwZTot=z=>z?z.reduce((a,b)=>a+b,0):0;
/* Dakika ağırlıklı ortalama bölge, 1…5 (ondalıklı). */
const pwZAvg=z=>{const t=pwZTot(z);return t?z.reduce((s,v,i)=>s+v*(i+1),0)/t:0;};
const pwZCol=z=>PW_ZONE_COL[Math.max(0,Math.min(4,Math.round(pwZAvg(z))-1))];
/* Yatay dağılım şeridi: Z1 solda, Z5 sağda. */
function PwZoneBar({z,cls}){
  const t=pwZTot(z);
  return(<span className={cls||'lb-hz-bar'}>{t>0&&z.map((v,j)=>v>0?<i key={j} style={{flexGrow:v,background:PW_ZONE_COL[j]}}/>:null)}</span>);
}
function PwZoneWeekStrip({week,days}){
  const[tip,setTip]=useState(null);
  const show=(ev,i)=>{const r=ev.currentTarget.getBoundingClientRect();
    const half=150,vw=window.innerWidth||0;
    setTip({x:Math.min(Math.max(r.left+r.width/2,half),Math.max(half,vw-half)),y:r.top,i});};
  const d=tip&&week&&week[tip.i];const dt=d?pwZTot(d.z):0;
  return(<div className="lb-hz-row">
    {days.map((dk,i)=>{const x=week&&week[i];const t=x?pwZTot(x.z):0;
      if(!t)return<span key={dk} className="lb-hz-cell empty" onMouseEnter={ev=>show(ev,i)} onMouseLeave={()=>setTip(null)}>·</span>;
      return<span key={dk} className="lb-hz-cell" style={{'--zc':pwZCol(x.z)}}
        aria-label={`${DN[i]}: ${pwMin(t)} ${L('dk','min')}, ${x.z.map((v,j)=>`Z${j+1} ${pwMin(v)}`).join(', ')}`}
        onMouseEnter={ev=>show(ev,i)} onMouseLeave={()=>setTip(null)}>
        <b>{pwMin(t)}</b><PwZoneBar z={x.z}/>
      </span>;})}
    {tip&&ReactDOM.createPortal(
      <div className="lb-rpe-tip lb-hz-tip" style={{left:tip.x,top:tip.y}}>
        <div className="d">{DN[(parseD(days[tip.i]).getDay()+6)%7]} · {fd(days[tip.i])}{dt?` · ${pwMin(dt)} ${L('dk','min')}`:''}</div>
        {dt?<>
          {d.z.map((v,j)=><div key={j} className={'lb-hz-tr'+(v>0?'':' z0')}>
            <i className="dot" style={{background:PW_ZONE_COL[j]}}/><span className="zk">Z{j+1}</span>
            <span className="tb"><i style={{width:`${v/dt*100}%`,background:PW_ZONE_COL[j]}}/></span>
            <span className="zm">{pwMin(v)} {L('dk','min')}</span><span className="zp">{pwPct(Math.round(v/dt*100))}</span></div>)}
          <div className="lb-hz-ses">{[...new Set(d.sports)].join(' · ')}</div>
        </>:<span className="none">{L('Bu gün Polar antrenman kaydı yok','No Polar session on this day')}</span>}
      </div>, document.body)}
  </div>);
}
function PwZoneWeekSum({week}){
  const days=(week||[]).filter(Boolean);
  if(!days.length)return<span className="lb-hz-none">—</span>;
  const z=[0,1,2,3,4].map(i=>days.reduce((s,x)=>s+x.z[i],0));const t=pwZTot(z);
  const hi=Math.round((z[3]+z[4])/t*100);
  return(<div className="lb-hz-wk" title={z.map((v,j)=>`Z${j+1}  ${pwMin(v)} ${L('dk','min')} · ${pwPct(Math.round(v/t*100))}`).join('\n')}>
    <PwZoneBar z={z} cls="lb-hz-wbar"/>
    <div className="lb-hz-wt"><b>{pwMin(t)}</b> {L('dk','min')}<span className="sep">·</span>
      <span style={{color:hi>=20?PW_ZONE_COL[4]:hi>=10?PW_ZONE_COL[3]:'var(--dim)'}}>Z4–5 {pwPct(hi)}</span>
      <span className="sep">·</span>{L(`${days.length} gün`,`${days.length} d`)}</div>
  </div>);
}

/* ── Wellness: takımın GÜNLÜK Polar tablosu ──────────────────────────────────
   Wellness'ın üstündeki tarih seçicide hangi gün seçiliyse o günün verisi.
   Gece verisi (uyku, yatış/uyanış saati, HRV, gece nabzı, ANS) uyanılan SABAHIN tarihini
   taşır — CoachOS'un gece kaydıyla aynı kural. Adım ve antrenman o güne ait;
   bugün seçiliyse gün içinde artar. Satıra tıklayınca sporcunun sayfası açılır;
   14/28 günlük grafikler orada. Başlığın solunda Polar Loop logosu (pwLogoSrc). */
/* Seçili günün (uyanılan sabahın) gece kaydı: önce uyanış saati o güne düşen uyku,
   yoksa tarihi o gün olan; recharge uykuyla aynı `date`'i taşır. */
function pwNight(p,day){
  const ss=p.sleep||[],rr=p.recharge||[];
  const s=ss.find(x=>String(x.sleepEnd||'').slice(0,10)===day)||ss.find(x=>x.date===day&&!x.sleepEnd)||null;
  const r=(s&&rr.find(x=>x.date===s.date))||rr.find(x=>x.date===day)||null;
  return{s,r};
}
/* Takım tablosunun son okunan hali (takım|gün → /team-data yanıtı), oturum boyunca.
   Sekme değiştirip geri gelince tablo hemen bu kopyadan çizilir; arkada aynı gün
   sessizce yeniden okunur. */
const PW_DAY_CACHE=new Map();
const PW_SYNC_PAR=5;
function PolarWellness({team,dayKey,onOpen,onSynced}){
  const theme=useAppTheme();
  const day=dayKey||fmt(new Date());
  const ck=`${team.id}|${day}`;
  const[data,setData]=useState(()=>PW_DAY_CACHE.get(ck)||null);   // /team-data yanıtı (yalnızca seçili gün)
  const[busy,setBusy]=useState(false);
  const[reading,setReading]=useState(false); // sessiz okuma (senkron yok) sürüyor
  const[prog,setProg]=useState(null);         // {done,total,fails:[{name,msg}]}
  const[err,setErr]=useState('');
  useEffect(()=>{setProg(null);setErr('');},[team.id]);
  const nameOf=id=>{const a=(team.athletes||[]).find(x=>x.id===id);return a?(a.name||''):'';};
  /* Seçili gün ve bir önceki gün istenir: gece kaydı uyanış saatine (sleepEnd) göre
     eşleştiriliyor; Polar'ın `date` alanı geceyi başladığı güne yazsa da sabahki
     uyku bulunur (pwNight). */
  const ask=d=>polarCall('/team-data',{teamId:team.id,from:pwShift(d,-1),to:d})
    .then(j=>{PW_DAY_CACHE.set(`${team.id}|${d}`,j);return j;});
  const load=async d=>{const j=await ask(d);setData(j);return j;};
  /* Sekmeye girince, takım ya da gün değişince: son alınan veri sunucudan okunur
     (Polar'la senkron YOK — o yalnızca "Verileri güncelle"de). Önbellekte varsa tablo
     hemen ondan çizilir. Sessiz okumanın hatası gösterilmez (oturum yok, Polar
     kurulmamış…): boş durum metni kalır, düğme hatayı yine söyler. */
  useEffect(()=>{
    const fb=FB();const u=fb&&fb.auth&&fb.auth().currentUser;
    setData(PW_DAY_CACHE.get(ck)||null);
    if(!u||u.isAnonymous)return;
    let alive=true;setReading(true);
    ask(day).then(j=>{if(alive)setData(j);}).catch(()=>{})
      .finally(()=>{if(alive)setReading(false);});
    return()=>{alive=false;};
  },[ck]);

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
      /* Aynı anda PW_SYNC_PAR sporcu. Polar'ın sınırı istek SAYISI (15 dk / 24 sa
         penceresi), eşzamanlılık değil: aynı sayıda istek daha kısa sürede biter. Her
         sporcunun senkronu sunucuda yine sırayla ve kendi kilidiyle çalışır; 429'da
         sunucu bekleyip yeniden dener, o sporcunun kalan adımlarını durdurur. */
      await Promise.all(Array.from({length:Math.min(PW_SYNC_PAR,act.length)},worker));
      await load(day);
      if(typeof onSynced==='function')onSynced();
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
        <button className="btn sm" disabled={busy} onClick={fetchAll} title={L('Polar\'a bağlı bütün sporcuların verisini Polar\'dan yeniden çeker','Pulls fresh data from Polar for every connected athlete')}>{busy?L('Veriler alınıyor…','Fetching…'):data?L('Verileri güncelle','Update data'):L('Verileri al','Fetch data')}</button>
      </div>
    </div>
    {prog&&prog.total>0&&<div className="pw-prog" role="status">
      {busy?L(`Polar'dan alınıyor: ${prog.done}/${prog.total} sporcu`,`Fetching from Polar: ${prog.done}/${prog.total} athletes`)
        :L(`${prog.total-prog.fails.length}/${prog.total} sporcunun verisi güncellendi.`,`Updated ${prog.total-prog.fails.length}/${prog.total} athletes.`)}
      {prog.fails.map(f=><div key={f.name} className="pw-fail">{f.name}: {f.msg}</div>)}
    </div>}
    {err&&<div className="pw-err" role="alert">{err}</div>}
    {!data?<div className="pw-empty">{reading?L('Son alınan veriler yükleniyor…','Loading the last fetched data…'):L('"Verileri al"a bastığında Polar\'a bağlı bütün sporcuların verisi güncellenir ve üstteki tarih seçicide seçili günün değerleri burada listelenir. Sporcuyu bağlamak için: Kadro → sporcu → Profili Düzenle (✎) → Polar bağlantısı.','Press "Fetch data" to update every Polar-connected athlete; the values of the day picked above are listed here. To connect an athlete: Roster → athlete → Edit Profile (✎) → Polar connection.')}</div>
    :<>
      <div className="pw-tw"><table className="pw-t pw-team">
        <thead><tr>
          <th>{L('Sporcu','Athlete')}</th><th>Polar</th><th>{L('Uyku','Sleep')}</th><th>{L('Yatış','Bedtime')}</th><th>{L('Uyanış','Wake')}</th><th>{L('Uyku skoru','Sleep score')}</th>
          <th>HRV</th><th>{L('Gece nabzı','Night HR')}</th>
          <th>ANS</th>
          <th>{L('Adım','Steps')}</th><th>{L('Antrenman','Training')}</th><th>{L('Yük','Load')}</th>
        </tr></thead>
        <tbody>{rows.map(({a,p})=>{
          const[stTxt,stCls]=(PW_STATUS[(p&&p.status)||'none']||PW_STATUS.none)();
          const{s,r}=p?pwNight(p,day):{s:null,r:null};const act=p&&pick(p.activity);
          const ex=p?(p.exercises||[]).filter(e=>e.date===day):[];
          const exDur=ex.map(e=>e.durationSec).filter(pwNum),exLoad=ex.map(e=>e.trainingLoad).filter(pwNum);
          const canOpen=!!p&&typeof onOpen==='function';
          return(<tr key={a.id} className={canOpen?'pw-click':''} onClick={canOpen?()=>onOpen(a.id):undefined}
            tabIndex={canOpen?0:undefined} onKeyDown={canOpen?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen(a.id);}}:undefined}>
            <td className="pw-name">{a.name||'—'}</td>
            <td><span className={'pw-st pw-'+stCls}>{stTxt}</span></td>
            <td>{s?pwDur(s.asleepSec):'—'}</td>
            <td>{s?pwHm(pwClock(s.sleepStart,12*60)):'—'}</td>
            <td>{s?pwHm(pwClock(s.sleepEnd,-6*60)):'—'}</td>
            <td>{s?pwR(s.sleepScore):'—'}</td>
            <td>{r?pwR(r.hrvMs):'—'}</td>
            <td>{r?pwR(r.hrAvg):'—'}</td>
            <td>{r?pwR(r.ansCharge,1):'—'}</td>
            <td>{act&&pwNum(act.steps)?Math.round(act.steps).toLocaleString('tr-TR'):'—'}</td>
            <td>{ex.length?`${ex.length} · ${exDur.length?pwDur(exDur.reduce((x,y)=>x+y,0)):'—'}`:'—'}</td>
            <td>{exLoad.length?pwR(exLoad.reduce((x,y)=>x+y,0)):'—'}</td>
          </tr>);})}</tbody>
      </table></div>
      <div className="pw-foot">{L(`Uyku (süre, yatış ve uyanış saati), HRV, gece nabzı ve ANS o sabah uyanılan gecenin verisidir; aşağıdaki Gece Nabzı Takibi aynı gece nabzını kullanır. Adım ve antrenman ${isToday?'bugüne aittir ve gün içinde artar':'o güne aittir'}. "—": Polar bu değeri göndermedi. Satıra tıkla → sporcunun 14/28 günlük grafikleri.`,
        `Sleep (duration, bedtime and wake time), HRV, night HR and ANS belong to the night ending that morning; the Night HR Monitor below uses the same night HR. Steps and training ${isToday?'are today\'s and grow during the day':'belong to that day'}. "—": Polar did not send this value. Click a row → the athlete\'s 14/28-day charts.`)}</div>
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
