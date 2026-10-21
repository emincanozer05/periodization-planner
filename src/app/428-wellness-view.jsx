/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS — kenar çubuğundaki kendi sekmesi: kadronun bütün sabah check-in'leri

   Yük Takibi'ndeki Wellness Isı Haritası'nın yerini aldı. Üç katman:
     1. Başlık bandı — Higgsfield ile üretilmiş aurora görseli (yavaş Ken Burns kayması),
        üstünde CSS aurora ve kendini çizen nabız çizgisi; seçili gün ve kaç sporcunun
        o gün form doldurduğu.
     2. Takımın o günkü ortalaması — beş 1-5 sorusu halka göstergelerde, RHR bpm, hazır
        oluşun 1-5 dağılımı ve son 14 günün takım hazır oluş eğrisi.
     3. Sporcu kutuları — her sporcunun profil fotoğrafı, çevresinde o günkü hazır oluş
        halkası; kutunun hemen altında o günün değerleri. Kutuya tıklayınca sporcunun
        takvimi açılır: ay görünümünde her gün kendi rengiyle, seçilen günün ayrıntısı,
        ayın metrik eğrileri ve en altta sporcunun Wellness / Uyku / HRV kaydı.
   Puanlar check-in formunun kendi renkleriyle boyanır (SCORE5_COLORS: 1 kırmızı … 5 mavi),
   formla ekran hiçbir zaman farklı renk söylemez. Haftalık RHR trendi (RHRMonitor) eski
   ısı haritasının son düğmesiydi; burada kendi paneli olarak duruyor.
   ═══════════════════════════════════════════════════════════════════════════ */
/* Higgsfield (gpt_image_2) ile bu sekme için üretilen başlık görseli. Yüklenemezse alttaki
   CSS aurora tek başına kalır; görsel yalnızca süs, hiçbir bilgi taşımaz. */
const WV_HERO_IMG='https://d8j0ntlcm91z4.cloudfront.net/user_3F9zE2joTDdJeqasMFFis8cYF8B/hf_20261020_234707_ab5147c3-9f4a-4320-be44-4805c6b21f76.png';
const WV_METRICS=()=>[
  {id:'readiness',label:L('Hazır Oluş','Readiness'),short:L('Hazır','Ready'),five:true},
  {id:'sleep',label:L('Uyku','Sleep'),short:L('Uyku','Sleep'),five:true},
  {id:'mentalFatigue',label:L('Zihinsel Yorgunluk','Mental Fatigue'),short:L('Zihin','Mental'),five:true},
  {id:'physicalFatigue',label:L('Fiziksel Yorgunluk','Physical Fatigue'),short:L('Fizik','Physical'),five:true},
  {id:'soreness',label:L('Kas Ağrısı','Muscle Soreness'),short:L('Ağrı','Soreness'),five:true},
  {id:'RHR',label:L('İstirahat Nabzı','Resting HR'),short:'RHR',five:false},
];
const wvInitials=n=>(n||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
const wvFmt=(v,five)=>v==null?'—':(five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v)));
/* Bir sporcunun bir günü: o tarihteki en son kayıt kazanır (ısı haritasının kuralı). Bölünmeden
   önceki kayıtta tek `fatigue` var; o iki yarıda da gösterilir. Hazır oluş kayıtta yazılı
   değilse soruların ortalamasıdır — formun ve sunucunun formülü (wellReadiness). */
function wvDay(ath,dk){
  const es=(ath.wellness||[]).filter(w=>w&&w.date===dk);
  if(!es.length)return null;
  const w=es[es.length-1];
  const v={
    readiness:recNum(w.readiness)!=null?recNum(w.readiness):wellReadiness(w),
    sleep:recNum(w.sleep),
    mentalFatigue:recNum(w.mentalFatigue)!=null?recNum(w.mentalFatigue):recNum(w.fatigue),
    physicalFatigue:recNum(w.physicalFatigue)!=null?recNum(w.physicalFatigue):recNum(w.fatigue),
    soreness:recNum(w.soreness),
    RHR:(()=>{const r=recNum(w.RHR);return r!=null&&r>0?r:null;})(),
  };
  let pain=null;
  for(let i=es.length-1;i>=0&&!pain;i--){
    const m=parsePainMap(es[i].painMap&&typeof es[i].painMap==='object'?es[i].painMap:es[i].areaOfPain);
    const list=painEntries(m);
    if(list.length)pain={list,max:list[0].sev};
  }
  const note=es.map(e=>painFreeText(e.areaOfPain)).filter(Boolean).pop()||'';
  const any=Object.values(v).some(x=>x!=null);
  return any||pain||note?{...v,pain,note}:null;
}
const wvMean=a=>{const v=a.filter(x=>x!=null);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;};
/* Bir sayının ekranda sıfırdan kendisine sayarak gelmesi — az hareket isteyen cihazda anında. */
function useWvCount(target,dur){
  const[v,setV]=useState(target==null?null:0);
  useEffect(()=>{
    if(target==null){setV(null);return;}
    const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){setV(target);return;}
    let raf,t0;const d=dur||900;
    const tick=t=>{if(t0==null)t0=t;const p=Math.min(1,(t-t0)/d);const e=1-Math.pow(1-p,3);
      setV(target*e);if(p<1)raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[target]);
  return v;
}
/* Halka gösterge: 1-5 puanı (ya da 0-1 oranı) çevresine dolan bir yay olarak çizer. */
function WvRing({value,max,color,size,stroke,children,delay}){
  const S=size||84,SW=stroke||7,r=(S-SW)/2,C=2*Math.PI*r;
  const frac=value==null?0:Math.max(0,Math.min(1,value/(max||5)));
  return(<div className="wv-ring" style={{width:S,height:S}}>
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
      <circle cx={S/2} cy={S/2} r={r} className="wv-ring-bg" strokeWidth={SW}/>
      <circle cx={S/2} cy={S/2} r={r} className="wv-ring-fg" strokeWidth={SW} stroke={color||'var(--dim)'}
        strokeDasharray={C} style={{'--wv-c':C,'--wv-off':C*(1-frac),animationDelay:(delay||0)+'ms'}}
        transform={`rotate(-90 ${S/2} ${S/2})`}/>
    </svg>
    <div className="wv-ring-in">{children}</div>
  </div>);
}
/* Bir değer serisi için alan + çizgi grafiği; boş günler boşluk kalır, çizgi girişte kendini çizer. */
function WvArea({vals,labels,color,lo,hi,h,five,team}){
  const ref=useRef(null);const w=useElW(ref,600);
  const H=h||150,pl=30,pr=12,pt=14,pb=24;
  const pres=vals.map((v,i)=>({v,i})).filter(p=>p.v!=null);
  if(!pres.length)return<div ref={ref} className="wv-area none" style={{height:H}}>{L('Bu aralıkta veri yok','No data in this range')}</div>;
  let a=lo!=null?lo:Math.min(...pres.map(p=>p.v)),b=hi!=null?hi:Math.max(...pres.map(p=>p.v));
  if(a===b){a-=1;b+=1;}
  const n=vals.length,X=i=>pl+(n<=1?(w-pl-pr)/2:i*(w-pl-pr)/(n-1)),Y=v=>pt+(1-(v-a)/(b-a))*(H-pt-pb);
  const runs=[];let cur=[];vals.forEach((v,i)=>{if(v!=null)cur.push(i);else if(cur.length){runs.push(cur);cur=[];}});if(cur.length)runs.push(cur);
  const line=runs.map(r=>r.map((i,k)=>`${k?'L':'M'}${X(i).toFixed(1)} ${Y(vals[i]).toFixed(1)}`).join(' ')).join(' ');
  const area=runs.filter(r=>r.length>1).map(r=>`M${X(r[0]).toFixed(1)} ${H-pb} `+r.map(i=>`L${X(i).toFixed(1)} ${Y(vals[i]).toFixed(1)}`).join(' ')+` L${X(r[r.length-1]).toFixed(1)} ${H-pb} Z`).join(' ');
  const gid='wvg'+String(color).replace(/[^a-z0-9]/gi,'');
  const ticks=five?[1,2,3,4,5].filter(t=>t>=a&&t<=b):[a,(a+b)/2,b];
  const every=Math.max(1,Math.ceil(n/10));
  return(<div ref={ref} className="wv-area" style={{height:H}}>
    <svg width={w} height={H}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".34"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {ticks.map(t=><g key={t}><line x1={pl} x2={w-pr} y1={Y(t)} y2={Y(t)} className="wv-gl"/>
        <text x={pl-7} y={Y(t)+3.5} textAnchor="end" className="wv-ax">{five?t:Math.round(t)}</text></g>)}
      {team!=null&&<line x1={pl} x2={w-pr} y1={Y(team)} y2={Y(team)} className="wv-teamline"/>}
      {area&&<path d={area} fill={`url(#${gid})`} className="wv-area-fill"/>}
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="wv-draw" pathLength="1"/>
      {pres.map((p,k)=><circle key={p.i} cx={X(p.i)} cy={Y(p.v)} r={k===pres.length-1?4.2:2.8}
        fill={five?(score5Color(p.v)||color):color} className="wv-dot" style={{animationDelay:(300+k*25)+'ms'}}>
        <title>{(labels&&labels[p.i]?labels[p.i]+' · ':'')+wvFmt(p.v,five)}</title></circle>)}
      {labels&&labels.map((t,i)=>(i%every===0||(i===n-1&&(n-1)%every>every/2))?<text key={'x'+i} x={X(i)} y={H-6} textAnchor="middle" className="wv-ax">{t}</text>:null)}
    </svg>
  </div>);
}

/* ---- Başlık bandı ---- */
function WvHero({title,sub,dayKey,setDayKey,stats,onBack,photo,name}){
  const dt=dayKey?parseD(dayKey):null;
  const isToday=dayKey===fmt(today);
  return(<div className="wv-hero">
    <div className="wv-hero-bg" aria-hidden="true">
      <img src={WV_HERO_IMG} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>
      <div className="wv-aurora a1"/><div className="wv-aurora a2"/><div className="wv-aurora a3"/>
      <svg className="wv-ecg" viewBox="0 0 600 60" preserveAspectRatio="none">
        <path d="M0 30 H170 L182 30 L190 14 L198 46 L206 6 L214 52 L222 30 H330 L342 30 L350 18 L358 42 L366 30 H600" pathLength="1"/>
      </svg>
      <div className="wv-grain"/>
    </div>
    <div className="wv-hero-in">
      <div className="wv-hero-l">
        {onBack&&<button className="wv-back" onClick={onBack} aria-label={L('Geri','Back')}>‹ {L('Tüm sporcular','All athletes')}</button>}
        <div className="wv-hero-id">
          {name!=null&&<div className="wv-hero-av">{hasMedia(photo)?<img src={mediaSrc(photo)} alt=""/>:<span>{wvInitials(name)}</span>}</div>}
          <div>
            <div className="wv-hero-k">Wellness</div>
            <div className="wv-hero-t">{title}</div>
            {sub&&<div className="wv-hero-s">{sub}</div>}
          </div>
        </div>
      </div>
      <div className="wv-hero-r">
        {stats&&stats.map((s,i)=><div key={i} className="wv-hero-stat" style={{animationDelay:(120+i*90)+'ms'}}>
          <b style={s.c?{color:s.c}:undefined}>{s.v}</b><span>{s.l}</span></div>)}
        {setDayKey&&dt&&<div className="wv-day-nav">
          <button onClick={()=>setDayKey(fmt(addD(dt,-1)))} aria-label={L('Önceki gün','Previous day')}>‹</button>
          <div className="wv-day-lbl"><b>{DN[(dt.getDay()+6)%7]}</b>{fd(dayKey)}</div>
          <button onClick={()=>setDayKey(fmt(addD(dt,1)))} aria-label={L('Sonraki gün','Next day')}>›</button>
          {!isToday&&<button className="wv-today" onClick={()=>setDayKey(fmt(today))}>{L('Bugün','Today')}</button>}
        </div>}
      </div>
    </div>
  </div>);
}

/* ---- Takımın o günkü ortalaması ---- */
function WvTeamPanel({athletes,dayKey,rows}){
  const MS=WV_METRICS();
  const avg=id=>wvMean(rows.map(r=>r.d&&r.d[id]));
  const rdy=avg('readiness');
  const rdyN=useWvCount(rdy);
  const rhr=avg('RHR');
  const rhrN=useWvCount(rhr);
  /* Hazır oluşun 1-5 dağılımı: kaç sporcu hangi renkte uyandı. */
  const dist=[0,0,0,0,0];rows.forEach(r=>{const v=r.d&&r.d.readiness;if(v!=null)dist[Math.min(5,Math.max(1,Math.round(v)))-1]++;});
  const distN=dist.reduce((a,b)=>a+b,0);
  const painN=rows.filter(r=>r.d&&(r.d.pain||r.d.note)).length;
  /* Son 14 günün takım hazır oluşu: her gün, o gün form dolduranların ortalaması. */
  const days14=Array.from({length:14},(_,i)=>fmt(addD(parseD(dayKey),i-13)));
  const trend=days14.map(k=>wvMean(athletes.map(a=>{const d=wvDay(a,k);return d?d.readiness:null;})));
  const lbl=days14.map(k=>fd(k).slice(0,5));
  return(<div className="wv-team">
    <div className="panel wv-team-main">
      <div className="wv-ph"><h2>{L('Takım Ortalaması','Team Average')}</h2>
        <span>{L(`${fd(dayKey)} · ${rows.filter(r=>r.d).length}/${athletes.length} sporcu`,`${fd(dayKey)} · ${rows.filter(r=>r.d).length}/${athletes.length} athletes`)}</span></div>
      <div className="wv-team-grid">
        <div className="wv-big">
          <WvRing value={rdy} max={5} color={score5Color(rdy)||'var(--border2)'} size={148} stroke={12}>
            <b style={{color:rdy!=null?score5Color(rdy):'var(--dim)'}}>{rdyN==null?'—':rdyN.toFixed(1)}</b>
            <span>{L('hazır oluş','readiness')}</span>
          </WvRing>
          <div className="wv-big-side">
            <div className="wv-rhr"><i className="wv-heart" aria-hidden="true">♥</i>
              <b>{rhrN==null?'—':Math.round(rhrN)}</b><small>bpm</small><span>{L('ort. RHR','avg RHR')}</span></div>
            <div className="wv-pain-n" data-on={painN>0?'1':'0'}><b>{painN}</b><span>{L('ağrı bildirimi','pain reports')}</span></div>
          </div>
        </div>
        <div className="wv-mini-rings">
          {MS.filter(m=>m.five&&m.id!=='readiness').map((m,i)=>{const v=avg(m.id);
            return<div key={m.id} className="wv-mr" style={{animationDelay:(i*80)+'ms'}}>
              <WvRing value={v} max={5} color={score5Color(v)||'var(--border2)'} size={70} stroke={6} delay={150+i*90}>
                <b style={{color:v!=null?score5Color(v):'var(--dim)'}}>{wvFmt(v,true)}</b></WvRing>
              <span>{m.label}</span></div>;})}
        </div>
      </div>
      <div className="wv-dist">
        <div className="wv-dist-k">{L('Hazır oluş dağılımı','Readiness spread')}</div>
        <div className="wv-dist-bar">{distN===0?<i className="none"/>:dist.map((n,i)=>n?<i key={i} style={{flexGrow:n,background:SCORE5_COLORS[i],animationDelay:(i*70)+'ms'}} title={`${i+1}: ${n}`}>{n}</i>:null)}</div>
        <div className="wv-dist-leg">{SCORE5_COLORS.map((c,i)=><span key={i}><i style={{background:c}}/>{i+1}</span>)}</div>
      </div>
    </div>
    <div className="panel wv-team-trend">
      <div className="wv-ph"><h2>{L('Takım Hazır Oluş Trendi','Team Readiness Trend')}</h2><span>{L('son 14 gün','last 14 days')}</span></div>
      <WvArea vals={trend} labels={lbl} color="#10b981" lo={1} hi={5} five h={210}/>
    </div>
  </div>);
}

/* ---- Sporcu kutusu: fotoğraf + o günün değerleri ---- */
function WvAthCard({a,d,i,onOpen}){
  const MS=WV_METRICS();
  const r=d?d.readiness:null,c=score5Color(r);
  return(<button className={'wv-card'+(d?'':' off')} onClick={onOpen} style={{animationDelay:Math.min(i,24)*45+'ms','--wv-rc':c||'var(--border2)'}}>
    <div className="wv-card-top">
      <WvRing value={r} max={5} color={c||'var(--border2)'} size={86} stroke={5} delay={200+Math.min(i,24)*45}>
        <div className="wv-photo">{hasMedia(a.photo)?<img src={mediaSrc(a.photo)} alt="" loading="lazy"/>:<span>{wvInitials(a.name)}</span>}</div>
      </WvRing>
      {d&&(d.pain||d.note)&&<span className="wv-card-pain" style={{background:d.pain?PAIN_SEV_COL[d.pain.max]:'#f43f5e'}}
        title={d.pain?d.pain.list.map(p=>p.region+' · '+PAIN_SEV_LABEL()[p.sev]).join('\n'):d.note}>!</span>}
      <div className="wv-card-nm">{a.name}</div>
      {a.position&&<div className="wv-card-pos">{posOf(a.position)}</div>}
    </div>
    {d?<div className="wv-card-vals">
      <div className="wv-card-r"><b style={{color:c||'var(--text)'}}>{wvFmt(r,true)}</b><span>{L('hazır oluş','readiness')}</span></div>
      {MS.filter(m=>m.five&&m.id!=='readiness').map(m=>{const v=d[m.id];
        return<div key={m.id} className="wv-cv"><span>{m.short}</span>
          <i className="wv-cv-bar"><em style={{width:v==null?0:(v/5*100)+'%',background:score5Color(v)||'var(--dim)'}}/></i>
          <b>{wvFmt(v,true)}</b></div>;})}
      <div className="wv-cv rhr"><span>RHR</span><b>{d.RHR!=null?Math.round(d.RHR):'—'}<small> bpm</small></b></div>
    </div>:<div className="wv-card-none">{L('Bu gün check-in yok','No check-in this day')}</div>}
  </button>);
}

/* ---- Sporcunun takvimi: ay görünümü, gün ayrıntısı, ayın eğrileri ---- */
function WvAthleteDetail({ath,updAth,dayKey,setDayKey,onBack}){
  const MS=WV_METRICS();
  const[month,setMonth]=useState(()=>{const d=parseD(dayKey);return{y:d.getFullYear(),m:d.getMonth()};});
  const[metric,setMetric]=useState('readiness');
  const M=MS.find(x=>x.id===metric)||MS[0];
  const first=new Date(month.y,month.m,1),last=new Date(month.y,month.m+1,0);
  const gridStart=sow(first);
  const cells=Array.from({length:Math.ceil(((first.getDay()+6)%7+last.getDate())/7)*7},(_,i)=>addD(gridStart,i));
  const mDays=Array.from({length:last.getDate()},(_,i)=>fmt(new Date(month.y,month.m,i+1)));
  const byDay={};mDays.forEach(k=>{byDay[k]=wvDay(ath,k);});
  const shiftM=d=>setMonth(({y,m})=>{const n=new Date(y,m+d,1);return{y:n.getFullYear(),m:n.getMonth()};});
  const pastDays=mDays.filter(k=>k<=fmt(today));
  const nIn=mDays.filter(k=>byDay[k]).length;
  const comp=pastDays.length?Math.round(nIn/pastDays.length*100):null;
  const mAvg=id=>wvMean(mDays.map(k=>byDay[k]&&byDay[k][id]));
  const sel=wvDay(ath,dayKey);
  const night=(ath.nightLog||[]).find(n=>n&&n.date===dayKey)||null;
  const load=athDayLoad(ath,dayKey);
  const series=mDays.map(k=>byDay[k]?byDay[k][metric]:null);
  const rdyAvg=mAvg('readiness');
  return(<div className="wv-detail">
    <WvHero onBack={onBack} name={ath.name} photo={ath.photo} title={ath.name}
      sub={[ath.position&&posOf(ath.position),L(`${MN[month.m]} ${month.y} · ${nIn} check-in`,`${MN[month.m]} ${month.y} · ${nIn} check-ins`)].filter(Boolean).join(' · ')}
      stats={[{v:wvFmt(rdyAvg,true),l:L('ay ort. hazır oluş','month avg readiness'),c:score5Color(rdyAvg)},
        {v:comp==null?'—':comp+'%',l:L('katılım','compliance')}]}/>
    <div className="wv-cal-wrap">
      <div className="panel wv-cal">
        <div className="wv-ph">
          <h2>{MN[month.m]} {month.y}</h2>
          <div className="wv-cal-nav">
            <button className="btn sm sec" onClick={()=>shiftM(-1)} aria-label={L('Önceki ay','Previous month')}>‹</button>
            <button className="btn sm sec" onClick={()=>{setMonth({y:today.getFullYear(),m:today.getMonth()});setDayKey(fmt(today));}}>{L('Bugün','Today')}</button>
            <button className="btn sm sec" onClick={()=>shiftM(1)} aria-label={L('Sonraki ay','Next month')}>›</button>
          </div>
        </div>
        <div className="lb-seg wv-seg">{MS.map(m=><button key={m.id} className={metric===m.id?'on':''} onClick={()=>setMetric(m.id)}>{m.short}</button>)}</div>
        <div className="wv-cal-grid" key={month.y+'-'+month.m}>
          {[0,1,2,3,4,5,6].map(i=><div key={'h'+i} className="wv-cal-dn">{DN[i]}</div>)}
          {cells.map((dt,i)=>{const k=fmt(dt),inM=dt.getMonth()===month.m;const d=inM?byDay[k]:null;
            const v=d?d[metric]:null;
            const bg=v==null?null:(M.five?score5Color(v):null);
            return<button key={k} className={'wv-cal-d'+(inM?'':' out')+(k===dayKey?' sel':'')+(k===fmt(today)?' today':'')+(d?' has':'')}
              style={{animationDelay:(i*12)+'ms',...(bg?{'--wv-dc':bg}:{})}} onClick={()=>inM&&setDayKey(k)} disabled={!inM}>
              <span className="wv-cal-n">{dt.getDate()}</span>
              {v!=null&&<span className="wv-cal-v">{wvFmt(v,M.five)}</span>}
              {d&&<span className="wv-cal-dots">{MS.filter(m=>m.five&&m.id!=='readiness').map(m=><i key={m.id} style={{background:score5Color(d[m.id])||'var(--border2)'}}/>)}</span>}
              {d&&(d.pain||d.note)&&<span className="wv-cal-pain" style={{background:d.pain?PAIN_SEV_COL[d.pain.max]:'#f43f5e'}}/>}
            </button>;})}
        </div>
        <div className="wv-cal-leg">
          {M.five?SCORE5_COLORS.map((c,i)=><span key={i}><i style={{background:c}}/>{i+1}</span>)
            :<span className="wv-cal-leg-t">{L('RHR değeri gün kutusunda bpm olarak','Resting HR shown in bpm on each day')}</span>}
          <span><i className="pain"/>{L('ağrı bildirimi','pain report')}</span>
        </div>
      </div>
      <div className="panel wv-dayp" key={dayKey}>
        <div className="wv-ph"><h2>{DN[(parseD(dayKey).getDay()+6)%7]} · {fd(dayKey)}</h2>
          <span>{sel?L('sabah check-in','morning check-in'):L('kayıt yok','no entry')}</span></div>
        {sel?<>
          <div className="wv-dayp-top">
            <WvRing value={sel.readiness} max={5} color={score5Color(sel.readiness)||'var(--border2)'} size={112} stroke={9}>
              <b style={{color:score5Color(sel.readiness)||'var(--dim)'}}>{wvFmt(sel.readiness,true)}</b><span>{L('hazır oluş','readiness')}</span></WvRing>
            <div className="wv-dayp-side">
              <div className="wv-dk"><span>RHR</span><b>{sel.RHR!=null?Math.round(sel.RHR):'—'}<small> bpm</small></b></div>
              <div className="wv-dk"><span>{L('sRPE yükü','sRPE load')}</span><b>{load?load:'—'}<small> AU</small></b></div>
              {night&&nightSleepMin(night)!=null&&<div className="wv-dk"><span>{L('Uyku süresi','Sleep time')}</span><b>{fmtSleep(nightSleepMin(night))}</b></div>}
              {night&&recNum(night.hrv)!=null&&<div className="wv-dk"><span>HRV</span><b>{Math.round(recNum(night.hrv))}<small> ms</small></b></div>}
            </div>
          </div>
          <div className="wv-dayp-bars">{MS.filter(m=>m.five&&m.id!=='readiness').map((m,i)=>{const v=sel[m.id];
            return<div key={m.id} className="wv-db"><span>{m.label}</span>
              <i><em style={{width:v==null?0:(v/5*100)+'%',background:score5Color(v)||'var(--dim)',animationDelay:(i*70)+'ms'}}/></i>
              <b style={{color:score5Color(v)||'var(--dim)'}}>{wvFmt(v,true)}</b></div>;})}</div>
          {(sel.pain||sel.note)&&<div className="wv-dayp-pain">
            <div className="wv-dayp-pk">{L('Ağrı bildirimi','Pain report')}</div>
            {sel.pain&&sel.pain.list.map(p=><div key={p.region} className="wv-pr"><i style={{background:PAIN_SEV_COL[p.sev]}}/>{p.region}
              <b style={{color:PAIN_SEV_COL[p.sev]}}>{PAIN_SEV_LABEL()[p.sev]}</b></div>)}
            {sel.note&&<div className="wv-pnote">“{sel.note}”</div>}
          </div>}
        </>:<div className="empty-st">{L('Bu gün için check-in yok. Takvimden renkli bir gün seç.','No check-in on this day. Pick a coloured day on the calendar.')}</div>}
      </div>
    </div>
    <div className="panel wv-month">
      <div className="wv-ph"><h2>{L('Ayın Eğrisi','Month Curve')} · {M.label}</h2>
        <span>{L('ay ortalaması','month avg')} <b style={{color:M.five?(score5Color(mAvg(metric))||'var(--text)'):'var(--text)'}}>{wvFmt(mAvg(metric),M.five)}</b></span></div>
      <WvArea key={metric+month.y+month.m} vals={series} labels={mDays.map(k=>String(parseD(k).getDate()))} color={M.five?'#3b82f6':'#06b6d4'}
        lo={M.five?1:null} hi={M.five?5:null} five={M.five} h={190} team={mAvg(metric)}/>
      <div className="wv-month-avgs">{MS.map((m,i)=>{const v=mAvg(m.id);
        return<button key={m.id} className={'wv-ma'+(metric===m.id?' on':'')} onClick={()=>setMetric(m.id)} style={{animationDelay:(i*60)+'ms'}}>
          <span>{m.label}</span><b style={{color:m.five?(score5Color(v)||'var(--dim)'):'var(--text)'}}>{wvFmt(v,m.five)}{!m.five&&v!=null?<small> bpm</small>:null}</b></button>;})}</div>
    </div>
    <div className="wv-sec-h">{L('Kayıtlar, Uyku ve HRV','Records, Sleep & HRV')}</div>
    <AthWellness ath={ath} updAth={updAth}/>
  </div>);
}

/* ---- Sekmenin kendisi ---- */
function WellnessView({team,updateTeam}){
  const athletes=team.athletes||[];
  const[dayKey,setDayKey]=useState(()=>fmt(today));
  const[selId,setSelId]=useState(null);
  const[sort,setSort]=useState('name');
  const[q,setQ]=useState('');
  const updAth=(id,upd)=>updateTeam(team.id,t=>({athletes:(t.athletes||[]).map(a=>a.id===id?{...a,...(typeof upd==='function'?upd(a):upd)}:a)}));
  const rows=useMemo(()=>athletes.map(a=>({a,d:wvDay(a,dayKey)})),[athletes,dayKey]);
  const rhrWks=useMemo(()=>rhrWeeks(dayKey,RHR_WEEKS),[dayKey]);
  const sel=selId&&athletes.find(a=>a.id===selId);
  useEffect(()=>{try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}},[selId]);
  if(sel)return<WvAthleteDetail key={sel.id} ath={sel} updAth={updAth} dayKey={dayKey} setDayKey={setDayKey} onBack={()=>setSelId(null)}/>;
  const ql=q.trim().toLocaleLowerCase('tr');
  const shown=rows.filter(r=>!ql||(r.a.name||'').toLocaleLowerCase('tr').includes(ql)).sort((x,y)=>{
    if(sort==='low'||sort==='high'){const xv=x.d&&x.d.readiness,yv=y.d&&y.d.readiness;
      if((xv==null)!==(yv==null))return xv==null?1:-1;
      if(xv!=null&&xv!==yv)return sort==='low'?xv-yv:yv-xv;}
    return(x.a.name||'').localeCompare(y.a.name||'','tr');});
  const nIn=rows.filter(r=>r.d).length;
  const rdy=wvMean(rows.map(r=>r.d&&r.d.readiness));
  const low=rows.filter(r=>r.d&&r.d.readiness!=null&&r.d.readiness<3).length;
  return(<div className="wv">
    <WvHero title={L('Kadro Wellness','Squad Wellness')} sub={team.setup.teamName} dayKey={dayKey} setDayKey={setDayKey}
      stats={[{v:`${nIn}/${athletes.length}`,l:L('check-in','check-ins')},
        {v:wvFmt(rdy,true),l:L('takım hazır oluş','team readiness'),c:score5Color(rdy)},
        {v:low,l:L('düşük (<3)','low (<3)'),c:low?'#f97316':undefined}]}/>
    {athletes.length===0?<div className="empty-st">{L('Kadroda sporcu yok.','No athletes on the roster.')}</div>:<>
      <WvTeamPanel athletes={athletes} dayKey={dayKey} rows={rows}/>
      <div className="wv-ath-h">
        <h2>{L('Sporcular','Athletes')}<span>{L('profile tıkla → takvim ve ayrıntılı veriler','click a profile → calendar & detailed data')}</span></h2>
        <div className="wv-ath-tools">
          <input className="wv-search" value={q} onChange={e=>setQ(e.target.value)} placeholder={L('Sporcu ara…','Search athlete…')} aria-label={L('Sporcu ara','Search athlete')}/>
          <div className="lb-seg">
            <button className={sort==='name'?'on':''} onClick={()=>setSort('name')}>{L('İsim','Name')}</button>
            <button className={sort==='low'?'on':''} onClick={()=>setSort('low')}>{L('Düşük önce','Lowest first')}</button>
            <button className={sort==='high'?'on':''} onClick={()=>setSort('high')}>{L('Yüksek önce','Highest first')}</button>
          </div>
        </div>
      </div>
      <div className="wv-grid" key={dayKey+sort}>
        {shown.map((r,i)=><WvAthCard key={r.a.id} a={r.a} d={r.d} i={i} onOpen={()=>setSelId(r.a.id)}/>)}
      </div>
      <div className="panel lb-wrap wv-rhr-panel">
        <div className="lb-head"><div className="lb-title">{L('RHR Takibi','RHR Monitor')}<span className="lb-sub">{L('haftalık ortalama dinlenik nabız · Pzt–Paz','weekly average resting HR · Mon–Sun')}</span></div></div>
        <RHRMonitor athletes={athletes} weeks={rhrWks}/>
      </div>
    </>}
  </div>);
}
