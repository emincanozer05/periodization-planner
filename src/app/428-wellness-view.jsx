/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS — kenar çubuğundaki kendi sekmesi: kadronun bütün sabah check-in'leri

   Yük Takibi'ndeki Wellness Isı Haritası'nın yerini aldı. Üç katman:
     1. Başlık bandı — sade koyu zemin: yavaşça kayan iki hafif ışık ve sağa doğru
        silikleşen ince nokta deseni; seçili gün ve kaç sporcunun o gün form doldurduğu.
     2. Takımın o günkü ortalaması — beş 1-5 sorusu halka göstergelerde, RHR bpm (Polar'a
        bağlı sporcuda Polar'ın günün en düşük nabzı), hazır oluşun 1-5 dağılımı ve takımın
        haftalık hazır oluşu (hafta şeridi + seçili haftanın günleri çubuk grafik).
     3. Sporcu kutuları — her sporcunun profil fotoğrafı, çevresinde o günkü hazır oluş
        halkası; kutunun hemen altında o günün değerleri. Kutuya tıklayınca sporcunun
        takvimi açılır: hafta (varsayılan) ya da ay görünümünde her gün kendi rengiyle,
        hafta görünümünde gün kutusunun altında o günün ağrı bölgeleri, yanında gün paneli
        (o haftanın ortalama ve o günün antrenman başına Polar HR bölgeleri), hafta / ay seçilebilen wellness eğrisi ve altında o dönemin
        kayıtları (check-in + Polar gece nabzı), en altta Sporcu İzleme (428b: sağlık uyarıları,
        yük ve toparlanma — kişisel referansa göre, risk skoru yok). Takım görünümünün en altında
        Veri yeterliliği raporu (428b MonAdequacyPanel).
   Puanlar check-in formunun kendi renkleriyle boyanır (SCORE5_COLORS: 1 kırmızı … 5 mavi),
   formla ekran hiçbir zaman farklı renk söylemez. Haftalık RHR trendi (RHRMonitor) eski
   ısı haritasının son düğmesiydi; burada kendi paneli olarak duruyor.
   ═══════════════════════════════════════════════════════════════════════════ */
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
function WvHero({title,sub,dayKey,setDayKey,stats,onBack,photo,name,actions}){
  const dt=dayKey?parseD(dayKey):null;
  const isToday=dayKey===fmt(today);
  return(<div className="wv-hero">
    <div className="wv-hero-bg" aria-hidden="true">
      <div className="wv-glow g1"/><div className="wv-glow g2"/>
      <div className="wv-dots"/>
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
        {actions&&<div className="wv-hero-acts">{actions}</div>}
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
function WvTeamPanel({athletes,dayKey,setDayKey,rows,prhr}){
  const MS=WV_METRICS();
  const avg=id=>wvMean(rows.map(r=>r.d&&r.d[id]));
  const rdy=avg('readiness');
  const rdyN=useWvCount(rdy);
  /* Ortalama RHR: Polar'a bağlı sporcuda Polar'ın günün en düşük nabzı, değilse check-in. */
  const rhr=wvMean(rows.map(r=>wvRhr(r.a,r.d,dayKey,prhr)));
  const rhrN=useWvCount(rhr);
  /* Hazır oluşun 1-5 dağılımı: kaç sporcu hangi renkte uyandı. */
  const dist=[0,0,0,0,0];rows.forEach(r=>{const v=r.d&&r.d.readiness;if(v!=null)dist[Math.min(5,Math.max(1,Math.round(v)))-1]++;});
  const distN=dist.reduce((a,b)=>a+b,0);
  const painN=rows.filter(r=>r.d&&(r.d.pain||r.d.note)).length;
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
    <WvWeekTrend athletes={athletes} dayKey={dayKey} setDayKey={setDayKey}/>
  </div>);
}

/* ---- Takım Hazır Oluş Trendi: hafta hafta ----
   Üstte son haftaların şeridi (her hafta: tarih aralığı + takımın haftalık hazır oluş
   ortalaması, küçük bir çubukla); bir haftaya tıklanınca ya da ‹ › ile o hafta seçilir.
   Altta seçili haftanın yedi günü çubuk grafik: her gün, o gün form dolduranların
   ortalaması (check-in renginde), kaç sporcunun doldurduğu ve haftanın ortalama çizgisi.
   Bir güne tıklamak sayfanın gününü seçer. Haftalık ortalama = günlük takım
   ortalamalarının ortalaması (yalnızca verisi olan günler). */
const WV_WK_STRIP=8;
const wvWkLbl=(ws)=>{const a=parseD(ws),b=addD(a,6);
  return a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${MN[b.getMonth()]}`:`${a.getDate()} ${MN[a.getMonth()]} – ${b.getDate()} ${MN[b.getMonth()]}`;};
function WvWeekTrend({athletes,dayKey,setDayKey}){
  const tk=fmt(today);
  const thisWk=fmt(sow(today));
  const[wk,setWk]=useState(()=>fmt(sow(parseD(dayKey))));
  useEffect(()=>{setWk(fmt(sow(parseD(dayKey))));},[dayKey]);
  const memo=useMemo(()=>new Map(),[athletes]);
  const dayOf=k=>{if(memo.has(k))return memo.get(k);
    const vs=athletes.map(a=>{const d=wvDay(a,k);return d?d.readiness:null;}).filter(v=>v!=null);
    const o={k,v:vs.length?vs.reduce((x,y)=>x+y,0)/vs.length:null,n:vs.length};memo.set(k,o);return o;};
  const weekOf=ws=>{const days=Array.from({length:7},(_,i)=>dayOf(fmt(addD(parseD(ws),i))));return{ws,days,avg:wvMean(days.map(d=>d.v))};};
  /* Şerit seçili haftayı her zaman içerir: bu haftayla biter, seçili hafta daha eskiyse
     en fazla 7 hafta ilerisine kadar uzanır. */
  const wkD=parseD(wk);
  const endCand=fmt(addD(wkD,7*(WV_WK_STRIP-1)));
  const stripEnd=wk>thisWk?wk:(endCand<thisWk?endCand:thisWk);
  const strip=Array.from({length:WV_WK_STRIP},(_,i)=>weekOf(fmt(addD(parseD(stripEnd),7*(i-(WV_WK_STRIP-1))))));
  const W=weekOf(wk);
  const shift=d=>setWk(fmt(addD(wkD,7*d)));
  return(<div className="panel wv-team-trend">
    <div className="wv-ph wv-ph-wrap"><h2>{L('Takım Hazır Oluş Trendi','Team Readiness Trend')}</h2>
      <div className="wv-cal-nav">
        <button className="btn sm sec" onClick={()=>shift(-1)} aria-label={L('Önceki hafta','Previous week')}>‹</button>
        <span className="wv-plbl">{wvWkLbl(wk)}</span>
        <button className="btn sm sec" onClick={()=>shift(1)} aria-label={L('Sonraki hafta','Next week')}>›</button>
        {wk!==thisWk&&<button className="btn sm sec" onClick={()=>setWk(thisWk)}>{L('Bu hafta','This week')}</button>}
      </div>
    </div>
    <div className="wv-wks" role="tablist" aria-label={L('Haftalar','Weeks')}>
      {strip.map((x,i)=><button key={x.ws} role="tab" aria-selected={x.ws===wk} className={'wv-wk'+(x.ws===wk?' on':'')+(x.ws>thisWk?' fut':'')}
        onClick={()=>setWk(x.ws)} style={{animationDelay:(i*40)+'ms'}}
        title={L(`${wvWkLbl(x.ws)} · haftalık ort. ${wvFmt(x.avg,true)}`,`${wvWkLbl(x.ws)} · week avg ${wvFmt(x.avg,true)}`)}>
        <span className="wv-wk-d">{parseD(x.ws).getDate()} {MN[parseD(x.ws).getMonth()]}</span>
        <b style={{color:x.avg!=null?score5Color(x.avg):'var(--dim)'}}>{x.avg==null?'—':x.avg.toFixed(1)}</b>
        <i className="wv-wk-bar"><em style={{width:x.avg==null?0:(x.avg/5*100)+'%',background:score5Color(x.avg)||'var(--dim)'}}/></i>
      </button>)}
    </div>
    <div className="wv-wk-sub">{L('haftalık ort.','week avg')} <b style={{color:W.avg!=null?score5Color(W.avg):'var(--dim)'}}>{wvFmt(W.avg,true)}</b>
      <span>{L(`${W.days.filter(d=>d.n).length}/7 gün veri`,`${W.days.filter(d=>d.n).length}/7 days with data`)}</span></div>
    <WvWeekBars key={wk} days={W.days} avg={W.avg} total={athletes.length} dayKey={dayKey} tk={tk} onPick={setDayKey}/>
  </div>);
}
/* Haftanın yedi günü, çubuk: 0–5 ekseni, değer çubuğun üstünde, altında gün + tarih + doldurma. */
function WvWeekBars({days,avg,total,dayKey,tk,onPick}){
  const ref=useRef(null);const w=useElW(ref,520);
  const H=226,pl=26,pr=50,pt=22,pb=46;
  const cw=(w-pl-pr)/7,bw=Math.min(46,cw*.56);
  const Y=v=>pt+(1-v/5)*(H-pt-pb);
  const base=Y(0);
  return(<div ref={ref} className="wv-wkbars" style={{height:H}}>
    <svg width={w} height={H} role="img" aria-label={L('Haftanın günlük takım hazır oluşu','Daily team readiness of the week')}>
      {[1,2,3,4,5].map(t=><g key={t}><line x1={pl} x2={w-pr} y1={Y(t)} y2={Y(t)} className="wv-gl"/>
        <text x={pl-7} y={Y(t)+3.5} textAnchor="end" className="wv-ax">{t}</text></g>)}
      <line x1={pl} x2={w-pr} y1={base} y2={base} className="wv-gl"/>
      {days.map((d,i)=>{const cx=pl+cw*(i+.5),x=cx-bw/2,fut=d.k>tk,sel=d.k===dayKey;
        const c=score5Color(d.v)||'var(--dim)';const y=d.v!=null?Y(d.v):base;
        return<g key={d.k} className={'wv-wkb'+(sel?' sel':'')+(fut?' fut':'')} onClick={()=>onPick&&onPick(d.k)} style={{cursor:onPick?'pointer':'default'}}>
          <title>{`${DN[i]} ${fd(d.k)} · ${d.v==null?'—':d.v.toFixed(1)} · ${d.n}/${total} ${L('sporcu','athletes')}`}</title>
          <rect x={pl+cw*i+2} y={pt-14} width={cw-4} height={H-pt-pb+14+40} className="wv-wkb-hit" rx="4"/>
          {d.v!=null?<rect x={x} y={y} width={bw} height={Math.max(2,base-y)} rx="4" fill={c} className="wv-wkb-r" style={{animationDelay:(i*55)+'ms'}}/>
            :<rect x={x} y={base-3} width={bw} height={3} rx="1.5" className="wv-wkb-none"/>}
          <text x={cx} y={(d.v!=null?y:base-3)-6} textAnchor="middle" className="wv-wkb-v" style={{fill:d.v!=null?c:undefined}}>{d.v==null?(fut?'':'—'):d.v.toFixed(1)}</text>
          <text x={cx} y={H-pb+15} textAnchor="middle" className={'wv-wkb-dn'+(d.k===tk?' today':'')}>{DN[i]}</text>
          <text x={cx} y={H-pb+28} textAnchor="middle" className="wv-ax">{fd(d.k).slice(0,5)}</text>
          {d.n>0&&<text x={cx} y={H-pb+40} textAnchor="middle" className="wv-ax wv-wkb-n">{d.n}/{total}</text>}
        </g>;})}
      {avg!=null&&<g><line x1={pl} x2={w-pr} y1={Y(avg)} y2={Y(avg)} className="wv-teamline"/>
        <text x={w-pr+6} y={Y(avg)+3.5} textAnchor="start" className="wv-ax">{L('ort.','avg')} {avg.toFixed(1)}</text></g>}
    </svg>
  </div>);
}
/* Bir sporcunun o günkü RHR'ı: Polar'a bağlıysa Polar'ın günün en düşük nabzı (pwRhrMap),
   değilse check-in'deki RHR. */
function wvRhr(a,d,dk,prhr){
  const p=prhr&&prhr[String(a.id)];const v=p?p[dk]:null;
  if(typeof v==='number'&&isFinite(v)&&v>0)return v;
  return d?d.RHR:null;
}

/* ---- Sporcu kutusu: fotoğraf + o günün değerleri ---- */
function WvAthCard({a,d,i,onOpen,rhr}){
  const MS=WV_METRICS();
  const r=d?d.readiness:null,c=score5Color(r);
  return(<button className={'wv-card'+(d?'':' off')} onClick={onOpen} style={{animationDelay:Math.min(i,24)*45+'ms','--wv-rc':c||'var(--border2)'}}>
    <div className="wv-card-top">
      <WvRing value={r} max={5} color={c||'var(--border2)'} size={86} stroke={5} delay={200+Math.min(i,24)*45}>
        <div className="wv-photo">{hasMedia(a.photo)?<img src={mediaSrc(a.photo)} alt="" loading="lazy"/>:<span>{wvInitials(a.name)}</span>}</div>
      </WvRing>
      {d&&(d.pain||d.note)&&<span className="wv-card-pain" style={{background:d.pain?PAIN_SEV_COL[d.pain.max]:'#f43f5e'}}
        title={d.pain?d.pain.list.map(p=>painRegionShort(p.region)+' · '+PAIN_SEV_LABEL()[p.sev]).join('\n'):d.note}>!</span>}
      <div className="wv-card-nm">{a.name}</div>
      {a.position&&<div className="wv-card-pos">{posOf(a.position)}</div>}
    </div>
    {d?<div className="wv-card-vals">
      <div className="wv-card-r"><b style={{color:c||'var(--text)'}}>{wvFmt(r,true)}</b><span>{L('hazır oluş','readiness')}</span></div>
      {MS.filter(m=>m.five&&m.id!=='readiness').map(m=>{const v=d[m.id];
        return<div key={m.id} className="wv-cv"><span>{m.short}</span>
          <i className="wv-cv-bar"><em style={{width:v==null?0:(v/5*100)+'%',background:score5Color(v)||'var(--dim)'}}/></i>
          <b>{wvFmt(v,true)}</b></div>;})}
      <div className="wv-cv rhr"><span>RHR</span><b>{rhr!=null?Math.round(rhr):'—'}<small> bpm</small></b></div>
    </div>:<div className="wv-card-none">{L('Bu gün check-in yok','No check-in this day')}</div>}
  </button>);
}

/* ---- Sporcunun sayfası: takvim (hafta / ay), gün ayrıntısı, wellness eğrisi + kayıtlar ----
   Sporcu sayfasının ölçüleri: check-in'in beş puanı ve check-in'deki istirahat nabzının yerine
   Polar'ın gece nabzı (usePolarNightHR, 429). Takvim ve eğri birbirinden bağımsız olarak bir
   haftayı (Pzt–Paz) ya da bir ayı gösterir; ‹ › o dönemi kaydırır. Takvim haftayla açılır. */
const WV_DET_METRICS=()=>[...WV_METRICS().filter(m=>m.five),
  {id:'nightHR',label:L('Gece Nabzı','Night HR'),short:L('Gece N.','Night HR'),five:false,polar:true}];
function wvPeriod(mode,anchor){
  const a=parseD(anchor);
  if(mode==='week'){const st=sow(a);const days=Array.from({length:7},(_,i)=>fmt(addD(st,i)));return{from:days[0],to:days[6],days};}
  const l=new Date(a.getFullYear(),a.getMonth()+1,0);
  const days=Array.from({length:l.getDate()},(_,i)=>fmt(new Date(a.getFullYear(),a.getMonth(),i+1)));
  return{from:days[0],to:days[days.length-1],days,y:a.getFullYear(),m:a.getMonth()};
}
const wvShift=(mode,anchor,d)=>{const a=parseD(anchor);return fmt(mode==='week'?addD(a,7*d):new Date(a.getFullYear(),a.getMonth()+d,1));};
function wvPeriodLbl(mode,P){
  if(mode==='month')return`${MN[P.m]} ${P.y}`;
  const a=parseD(P.from),b=parseD(P.to);
  return a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${MN[b.getMonth()]} ${b.getFullYear()}`
    :`${a.getDate()} ${MN[a.getMonth()]} – ${b.getDate()} ${MN[b.getMonth()]} ${b.getFullYear()}`;
}
/* Hafta / Ay seçimi ve dönemi kaydıran oklar — takvimde ve eğride aynı parça. */
function WvPeriodNav({mode,setMode,label,onShift,onToday,showToday}){
  const wk=mode==='week';
  return(<div className="wv-pnav">
    <div className="lb-seg wv-pseg" role="group" aria-label={L('Görünüm','View')}>
      {[['week',L('Hafta','Week')],['month',L('Ay','Month')]].map(([id,t])=>
        <button key={id} className={mode===id?'on':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{t}</button>)}</div>
    <div className="wv-cal-nav">
      <button className="btn sm sec" onClick={()=>onShift(-1)} aria-label={wk?L('Önceki hafta','Previous week'):L('Önceki ay','Previous month')}>‹</button>
      {label&&<span className="wv-plbl">{label}</span>}
      <button className="btn sm sec" onClick={()=>onShift(1)} aria-label={wk?L('Sonraki hafta','Next week'):L('Sonraki ay','Next month')}>›</button>
      {showToday&&<button className="btn sm sec" onClick={onToday}>{L('Bugün','Today')}</button>}
    </div>
  </div>);
}
/* Seçili dönemin kayıtları — eski "Wellness Kaydı"nın tablosu buraya taşındı. Okuma görünümü
   her günün check-in puanlarını ve Polar gece nabzını yan yana verir; "Düzenle" dönemin
   check-in satırlarını düzenlenebilir yapar (elle yazılan alan kayda işlenir, sonraki form
   senkronu üzerine yazmaz), "+ Elle" seçili güne boş bir satır açar. */
function WvRecords({ath,updAth,P,val,nh,addDate,onAdded}){
  const[edit,setEdit]=useState(false);
  const[all,setAll]=useState(false);
  const W=ath.wellness||[];
  const MS=WV_DET_METRICS();
  const tk=fmt(today);
  const rows=P.days.filter(k=>wvDay(ath,k)||val(k,'nightHR')!=null).reverse();
  const shown=all?rows:rows.slice(0,10);
  const recs=W.map((w,i)=>({w,i})).filter(x=>x.w&&x.w.date>=P.from&&x.w.date<=P.to)
    .sort((a,b)=>String(b.w.date).localeCompare(String(a.w.date))||b.i-a.i);
  const addManual=()=>{
    const w={id:uid(),srcId:null,date:addDate||tk,RHR:'',sleep:'',mentalFatigue:'',physicalFatigue:'',fatigue:'',soreness:'',areaOfPain:'',readiness:''};
    updAth(ath.id,{wellness:[...W,w]});setEdit(true);if(onAdded)onAdded(w.date);
  };
  /* A value the coach types here is theirs: the field is stamped on the record so the next
     form sync writes around it instead of over it. */
  const uw=(i,k,v)=>{const a=[...W];const cur=a[i];
    const next={...cur,[k]:v,manualEdits:[...new Set([...(cur.manualEdits||[]),k])]};
    if(k==='mentalFatigue'||k==='physicalFatigue')next.fatigue=wellFatigue(next)??'';
    a[i]=next;updAth(ath.id,{wellness:a});};
  /* Formdan gelen satırın silinmesi kaynağını da mezar taşına yazıyor: gönderim 14 gün
     `checkins`'te duruyor ve taşı olmayan satırı gelen kutusu geri getirirdi. */
  const del=i=>{const row=W[i];const src=row&&row.srcId;
    const upd={wellness:W.filter((_,j)=>j!==i)};
    if(src)upd.deletedWellnessSrcIds=[...new Set([...(ath.deletedWellnessSrcIds||[]),src])];
    updAth(ath.id,upd);};
  const cell=(m,v)=><td key={m.id} className="wv-rec-v"><b style={{color:v==null?'var(--dim)':m.five?(score5Color(v)||'var(--text)'):'var(--text)'}}>{wvFmt(v,m.five)}</b></td>;
  return(<div className="wv-rec">
    <div className="wv-rec-h">
      <div><b>{L('Kayıtlar','Records')}</b><span>{L(`${rows.length} gün · sabah check-in ve Polar gece nabzı`,`${rows.length} days · morning check-in and Polar night HR`)}</span></div>
      <div className="wv-rec-tools">
        <button className="btn sm sec" onClick={addManual} title={L(`${fd(addDate||tk)} için boş bir check-in satırı`,`An empty check-in row for ${fd(addDate||tk)}`)}>+ {L('Elle','Manual')}</button>
        <button className={'btn sm'+(edit?'':' sec')} onClick={()=>setEdit(e=>!e)} disabled={!edit&&!recs.length}>{edit?L('Bitti','Done'):L('Düzenle','Edit')}</button>
      </div>
    </div>
    {!edit?(rows.length===0?<div className="wv-rec-none">{L('Bu dönemde kayıt yok.','No records in this period.')}</div>
    :<div className="wv-rec-w"><table className="wv-rec-t">
      <thead><tr><th>{L('Gün','Day')}</th>{MS.map(m=><th key={m.id}>{m.short}</th>)}<th>RHR</th><th/></tr></thead>
      <tbody>{shown.map(k=>{const d=wvDay(ath,k);const dt=parseD(k);
        return<tr key={k} className={k===addDate?'sel':''}>
          <td className="wv-rec-d"><b>{DN[(dt.getDay()+6)%7]}</b> {fd(k).slice(0,5)}</td>
          {MS.map(m=>cell(m,m.id==='nightHR'?val(k,'nightHR'):(d?d[m.id]:null)))}
          <td className="wv-rec-v"><b style={{color:d&&d.RHR!=null?'var(--text2)':'var(--dim)'}}>{d&&d.RHR!=null?Math.round(d.RHR):'—'}</b></td>
          <td>{d&&(d.pain||d.note)&&<i className="wv-rec-pain" style={{background:d.pain?PAIN_SEV_COL[d.pain.max]:'#f43f5e'}}
            title={d.pain?d.pain.list.map(p=>painRegionShort(p.region)+' · '+PAIN_SEV_LABEL()[p.sev]).join('\n'):d.note}/>}</td>
        </tr>;})}</tbody>
    </table>
      {rows.length>10&&<button className="wv-rec-more" onClick={()=>setAll(x=>!x)}>{all?L('Daralt','Collapse'):L(`Tümünü göster (${rows.length})`,`Show all (${rows.length})`)}</button>}
    </div>)
    :(recs.length===0?<div className="wv-rec-none">{L('Bu dönemde düzenlenecek check-in satırı yok. "+ Elle" ile ekle.','No check-in row to edit in this period. Add one with "+ Manual".')}</div>
    :<div className="wv-rec-w"><table className="wv-rec-t ed"><thead><tr>
      <th>{L('Tarih','Date')}</th><th>{L('Hazır Oluş','Readiness')}</th><th>{L('Uyku','Sleep')}</th><th>{L('Zihinsel Yorg.','Mental Fat.')}</th><th>{L('Fiziksel Yorg.','Physical Fat.')}</th><th>{L('Kas Ağrısı','Soreness')}</th><th>RHR</th><th style={{width:44}}/>
    </tr></thead><tbody>
      {recs.map(({w,i})=>{
        /* A row written before fatigue was split has one fatigue score and no halves; it
           shows in both boxes, greyed, until the coach types over it. */
        const oldFat=recNum(w.mentalFatigue)==null&&recNum(w.physicalFatigue)==null&&recNum(w.fatigue)!=null?String(w.fatigue):undefined;
        return<tr key={w.id||i}>
          <td><input type="date" value={w.date||''} onChange={e=>uw(i,'date',e.target.value)} style={{width:136}}/></td>
          <td><input type="number" step="0.1" value={w.readiness??''} onChange={e=>uw(i,'readiness',e.target.value)} style={{width:62}}/></td>
          <td><input type="number" step="0.5" value={w.sleep??''} onChange={e=>uw(i,'sleep',e.target.value)} style={{width:56}}/></td>
          <td><input type="number" step="0.5" value={w.mentalFatigue??''} placeholder={oldFat} onChange={e=>uw(i,'mentalFatigue',e.target.value)} style={{width:56}}/></td>
          <td><input type="number" step="0.5" value={w.physicalFatigue??''} placeholder={oldFat} onChange={e=>uw(i,'physicalFatigue',e.target.value)} style={{width:56}}/></td>
          <td><input type="number" step="0.5" value={w.soreness??''} onChange={e=>uw(i,'soreness',e.target.value)} style={{width:56}}/></td>
          <td><input type="number" value={w.RHR??''} onChange={e=>uw(i,'RHR',e.target.value)} style={{width:60}}/></td>
          <td><button className="btn xs danger" onClick={()=>del(i)} aria-label={L('Satırı sil','Delete row')}>✕</button></td>
        </tr>;})}
    </tbody></table></div>)}
    {nh&&!nh.off&&nh.err&&<div className="wv-rec-note">{L('Polar gece nabzı alınamadı: ','Polar night HR could not be loaded: ')}{nh.err}</div>}
  </div>);
}
function WvAthleteDetail({ath,updAth,dayKey,setDayKey,onBack,teamId}){
  const MS=WV_DET_METRICS();
  const tk=fmt(today);
  const[calMode,setCalMode]=useState('week');
  const[calAt,setCalAt]=useState(dayKey);
  const[cvMode,setCvMode]=useState('month');
  const[cvAt,setCvAt]=useState(dayKey);
  const[metric,setMetric]=useState('readiness');
  const M=MS.find(x=>x.id===metric)||MS[0];
  /* Takvimde Polar gece nabzı sekmesi yok: eğriden gece nabzı seçilse de takvim
     hazır oluşu gösterir. */
  const CMS=MS.filter(m=>!m.polar);
  const calMetric=M.polar?'readiness':metric;
  const CM=CMS.find(x=>x.id===calMetric)||CMS[0];
  const CP=wvPeriod(calMode,calAt),VP=wvPeriod(cvMode,cvAt);
  /* Gün ayrıntısının HR Zone bölümü seçili günün haftasını da ister. */
  const DW=wvPeriod('week',dayKey);
  const nhFrom=[CP.from,VP.from,DW.from].sort()[0],nhTo=[CP.to,VP.to,DW.to].sort()[2];
  const NH=usePolarNightHR(ath,teamId,nhFrom,nhTo);
  const dc={};const dOf=k=>(k in dc)?dc[k]:(dc[k]=wvDay(ath,k));
  const val=(k,id)=>id==='nightHR'?(NH.by[k]!=null?NH.by[k]:null):(((dOf(k)||{})[id])??null);
  const avgOf=(days,id)=>wvMean(days.map(k=>val(k,id)));
  /* Başlık bandı takvimin dönemini okur. */
  const cIn=CP.days.filter(k=>dOf(k)).length;
  const cPast=CP.days.filter(k=>k<=tk).length;
  const comp=cPast?Math.round(cIn/cPast*100):null;
  const rdyAvg=avgOf(CP.days,'readiness');
  const inCal=k=>k>=CP.from&&k<=CP.to;
  const cells=calMode==='week'?CP.days.map(parseD):(()=>{const first=parseD(CP.from),n=CP.days.length;const gs=sow(first);
    return Array.from({length:Math.ceil(((first.getDay()+6)%7+n)/7)*7},(_,i)=>addD(gs,i));})();
  const series=VP.days.map(k=>val(k,metric));
  const cvLabels=cvMode==='week'?VP.days.map((k,i)=>`${DN[i]} ${parseD(k).getDate()}`):VP.days.map(k=>String(parseD(k).getDate()));
  const cvAvg=avgOf(VP.days,metric);
  const polarMsg=NH.off?L('Polar verisi için koç oturumu gerekiyor.','Polar data needs a coach session.')
    :NH.err?L('Polar verisi alınamadı.','Polar data could not be loaded.')
    :!NH.loaded?L('Polar verisi yükleniyor…','Loading Polar data…')
    :!NH.linked?L('Sporcu Polar\'a bağlı değil.','The athlete is not connected to Polar.'):null;
  const wkCal=calMode==='week';
  return(<div className="wv-detail">
    <WvHero onBack={onBack} name={ath.name} photo={ath.photo} title={ath.name}
      sub={[ath.position&&posOf(ath.position),`${wvPeriodLbl(calMode,CP)} · ${cIn} check-in`].filter(Boolean).join(' · ')}
      stats={[{v:wvFmt(rdyAvg,true),l:wkCal?L('hafta ort. hazır oluş','week avg readiness'):L('ay ort. hazır oluş','month avg readiness'),c:score5Color(rdyAvg)},
        {v:comp==null?'—':comp+'%',l:L('katılım','compliance')}]}/>
    <div className="wv-cal-wrap">
      <div className={'panel wv-cal'+(wkCal?' wk':'')}>
        <div className="wv-ph wv-ph-wrap">
          <h2>{wvPeriodLbl(calMode,CP)}</h2>
          <WvPeriodNav mode={calMode} setMode={m=>{setCalMode(m);setCalAt(dayKey);}} label={null}
            onShift={d=>setCalAt(a=>wvShift(calMode,a,d))} showToday
            onToday={()=>{setCalAt(tk);setDayKey(tk);}}/>
        </div>
        <div className="lb-seg wv-seg">{CMS.map(m=><button key={m.id} className={calMetric===m.id?'on':''} onClick={()=>setMetric(m.id)}>{m.short}</button>)}</div>
        <div className={'wv-cal-grid'+(wkCal?' wk':'')} key={calMode+CP.from}>
          {[0,1,2,3,4,5,6].map(i=><div key={'h'+i} className="wv-cal-dn">{DN[i]}</div>)}
          {cells.map((dt,i)=>{const k=fmt(dt),inM=inCal(k);const d=inM?dOf(k):null;
            const v=inM?val(k,calMetric):null;
            const bg=v==null?null:(CM.five?score5Color(v):null);
            const others=wkCal&&inM?CMS.filter(m=>m.id!==calMetric).map(m=>({m,v:val(k,m.id)})).filter(x=>x.v!=null):[];
            return<button key={k} className={'wv-cal-d'+(inM?'':' out')+(k===dayKey?' sel':'')+(k===tk?' today':'')+((d||v!=null)?' has':'')}
              style={{animationDelay:(i*12)+'ms',...(bg?{'--wv-dc':bg}:{})}} onClick={()=>inM&&setDayKey(k)} disabled={!inM}>
              <span className="wv-cal-n">{dt.getDate()}</span>
              {v!=null&&<span className="wv-cal-v">{wvFmt(v,CM.five)}{!CM.five&&wkCal?<small> bpm</small>:null}</span>}
              {!wkCal&&d&&<span className="wv-cal-dots">{MS.filter(m=>m.five&&m.id!=='readiness').map(m=><i key={m.id} style={{background:score5Color(d[m.id])||'var(--border2)'}}/>)}</span>}
              {others.length>0&&<span className="wv-cal-wk">{others.map(({m,v:x})=><span key={m.id}><em>{m.short}</em>
                <b style={{color:m.five?(score5Color(x)||'var(--text)'):'var(--text)'}}>{wvFmt(x,m.five)}</b></span>)}</span>}
              {d&&(d.pain||d.note)&&<span className="wv-cal-pain" style={{background:d.pain?PAIN_SEV_COL[d.pain.max]:'#f43f5e'}}/>}
              {wkCal&&d&&(d.pain||d.note)&&<span className="wv-cal-pains">
                {d.pain&&d.pain.list.map(p=><span key={p.region} title={`${painRegionShort(p.region)} · ${PAIN_SEV_LABEL()[p.sev]}`}>
                  <i style={{background:PAIN_SEV_COL[p.sev]}}/><em>{painRegionShort(p.region)}</em></span>)}
                {d.note&&<q title={d.note}>{d.note}</q>}
              </span>}
            </button>;})}
        </div>
        <div className="wv-cal-leg">
          {CM.five&&SCORE5_COLORS.map((c,i)=><span key={i}><i style={{background:c}}/>{i+1}</span>)}
          <span><i className="pain"/>{L('ağrı bildirimi','pain report')}</span>
        </div>
      </div>
      {/* Gün paneli yalnızca Polar HR bölgeleri: check-in puanları ve ağrı bölgeleri takvimin
          gün kutusunda (hafta görünümünde ağrı bölgeleri kutunun altında, şiddet renginde). */}
      <div className="panel wv-dayp" key={dayKey}>
        <div className="wv-ph"><h2>{DN[(parseD(dayKey).getDay()+6)%7]} · {fd(dayKey)}</h2>
          <span>{L('Polar antrenmanları','Polar sessions')}</span></div>
        {NH.off?<div className="empty-st">{polarMsg}</div>
          :<WvHrZones ex={NH.ex} dayKey={dayKey} msg={(!NH.ex||!NH.ex.length)?polarMsg:null} bare
            onDay={k=>{setDayKey(k);if(!inCal(k))setCalAt(k);}}/>}
      </div>
    </div>
    <div className="panel wv-month">
      <div className="wv-ph wv-ph-wrap"><h2>{L('Wellness Eğrisi','Wellness Curve')} · {M.label}</h2>
        <WvPeriodNav mode={cvMode} setMode={m=>{setCvMode(m);setCvAt(dayKey);}} label={wvPeriodLbl(cvMode,VP)}
          onShift={d=>setCvAt(a=>wvShift(cvMode,a,d))} onToday={()=>setCvAt(tk)} showToday={!(tk>=VP.from&&tk<=VP.to)}/>
      </div>
      <div className="wv-month-sub">{cvMode==='week'?L('hafta ortalaması','week avg'):L('ay ortalaması','month avg')}{' '}
        <b style={{color:M.five?(score5Color(cvAvg)||'var(--text)'):'var(--text)'}}>{wvFmt(cvAvg,M.five)}{!M.five&&cvAvg!=null?' bpm':''}</b>
        {M.polar&&<em className="wv-polar-tag">Polar</em>}</div>
      {M.polar&&polarMsg&&!series.some(v=>v!=null)?<div className="wv-area none" style={{height:190}}>{polarMsg}</div>
        :<WvArea key={metric+cvMode+VP.from} vals={series} labels={cvLabels} color={M.five?'#3b82f6':'#06b6d4'}
          lo={M.five?1:null} hi={M.five?5:null} five={M.five} h={190} team={cvAvg}/>}
      <div className="wv-month-avgs">{MS.map((m,i)=>{const v=avgOf(VP.days,m.id);
        return<button key={m.id} className={'wv-ma'+(metric===m.id?' on':'')} onClick={()=>setMetric(m.id)} style={{animationDelay:(i*60)+'ms'}}
          title={m.polar?(polarMsg||L('Polar Loop gece nabzı ortalaması','Polar Loop night HR average')):undefined}>
          <span>{m.label}{m.polar&&<em className="wv-polar-tag">Polar</em>}</span>
          <b style={{color:m.five?(score5Color(v)||'var(--dim)'):'var(--text)'}}>{wvFmt(v,m.five)}{!m.five&&v!=null?<small> bpm</small>:null}</b></button>;})}</div>
      <WvRecords ath={ath} updAth={updAth} P={VP} val={val} nh={NH} addDate={dayKey}
        onAdded={k=>{if(!(k>=VP.from&&k<=VP.to))setCvAt(k);}}/>
    </div>
    <PolarAthleteCharts ath={ath} teamId={teamId}/>
    <AthMonitoring ath={ath} updAth={updAth} teamId={teamId} dayKey={dayKey}/>
  </div>);
}

/* ---- Sekmenin kendisi ---- */
function WellnessView({team,updateTeam,focus}){
  const athletes=team.athletes||[];
  const[dayKey,setDayKey]=useState(()=>fmt(today));
  /* Bir wellness bildiriminden gelindiyse doğrudan o sporcunun ayrıntısı açılır. */
  const[selId,setSelId]=useState(()=>focus&&athletes.some(a=>a.id===focus.athleteId)?focus.athleteId:null);
  useEffect(()=>{if(focus&&athletes.some(a=>a.id===focus.athleteId))setSelId(focus.athleteId);},[focus]);
  const[sort,setSort]=useState('name');
  const[q,setQ]=useState('');
  const updAth=(id,upd)=>updateTeam(team.id,t=>({athletes:(t.athletes||[]).map(a=>a.id===id?{...a,...(typeof upd==='function'?upd(a):upd)}:a)}));
  const rows=useMemo(()=>athletes.map(a=>({a,d:wvDay(a,dayKey)})),[athletes,dayKey]);
  const rhrWks=useMemo(()=>rhrWeeks(dayKey,RHR_WEEKS),[dayKey]);
  /* Polar'ın günün en düşük nabzı (RHR) — RHR Takibi'nin 12 haftası tek istekte (sürekli
     nabız + uyku). "Verileri al" bitince `pver` artar, aralık yeniden istenir. Takım
     ortalamasındaki ve sporcu kutularındaki RHR de buradan. */
  const[pver,setPver]=useState(0);
  const PR=usePolarTeamRange(team.id,rhrWks[0].start,rhrWks[rhrWks.length-1].end,['hr','sleep'],pver);
  const prhr=useMemo(()=>pwTeamRhr(PR.athletes),[PR.athletes]);
  const sel=selId&&athletes.find(a=>a.id===selId);
  useEffect(()=>{try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}},[selId]);
  if(sel)return<WvAthleteDetail key={sel.id} ath={sel} updAth={updAth} dayKey={dayKey} setDayKey={setDayKey} onBack={()=>setSelId(null)} teamId={team.id}/>;
  const ql=q.trim().toLocaleLowerCase('tr');
  const shown=rows.filter(r=>!ql||(r.a.name||'').toLocaleLowerCase('tr').includes(ql)).sort((x,y)=>{
    if(sort==='low'||sort==='high'){const xv=x.d&&x.d.readiness,yv=y.d&&y.d.readiness;
      if((xv==null)!==(yv==null))return xv==null?1:-1;
      if(xv!=null&&xv!==yv)return sort==='low'?xv-yv:yv-xv;}
    return(x.a.name||'').localeCompare(y.a.name||'','tr');});
  const wvPrint=kind=>{const d=parseD(dayKey);let from,to,label;
    if(kind==='week'){from=fmt(sow(d));to=fmt(addD(sow(d),6));label=`${fd(from)} – ${fd(to)}`;}
    else{from=fmt(new Date(d.getFullYear(),d.getMonth(),1));to=fmt(new Date(d.getFullYear(),d.getMonth()+1,0));label=`${MN[d.getMonth()]} ${d.getFullYear()}`;}
    printWellnessReport(buildWellnessReport({team,kind,from,to,label,prhr}));};
  return(<div className="wv">
    {/* Başlıkta istatistik kutuları yok (aynı sayılar hemen altındaki Takım Ortalaması'nda);
        yerlerinde seçili günün haftası / ayı için wellness çıktısı. */}
    <WvHero title={L('Kadro Wellness','Squad Wellness')} sub={team.setup.teamName} dayKey={dayKey} setDayKey={setDayKey}
      actions={athletes.length>0&&<>
        <button className="btn sec sm" onClick={()=>wvPrint('week')} title={L('Seçili günün haftası (Pzt–Paz)','The selected day\'s week (Mon–Sun)')}>{L('Haftalık Çıktı Al','Weekly Printout')}</button>
        <button className="btn sm" onClick={()=>wvPrint('month')} title={L('Seçili günün ayı','The selected day\'s month')}>{L('Aylık Çıktı Al','Monthly Printout')}</button>
      </>}/>
    {athletes.length===0?<div className="empty-st">{L('Kadroda sporcu yok.','No athletes on the roster.')}</div>:<>
      <WvTeamPanel athletes={athletes} dayKey={dayKey} setDayKey={setDayKey} rows={rows} prhr={prhr}/>
      <PolarWellness team={team} dayKey={dayKey} onOpen={id=>setSelId(id)} onSynced={()=>setPver(v=>v+1)}/>
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
        {shown.map((r,i)=><WvAthCard key={r.a.id} a={r.a} d={r.d} i={i} rhr={wvRhr(r.a,r.d,dayKey,prhr)} onOpen={()=>setSelId(r.a.id)}/>)}
      </div>
      <div className="panel lb-wrap wv-rhr-panel">
        <div className="lb-head"><div className="lb-title">{L('RHR Takibi','RHR Monitor')}<span className="lb-sub">{L('haftalık ortalama dinlenik nabız · Pzt–Paz · Polar: günün en düşük nabzı, yoksa check-in','weekly average resting HR · Mon–Sun · Polar: lowest HR of the day, else check-in')}</span></div></div>
        <RHRMonitor athletes={athletes} weeks={rhrWks} polarRhr={prhr}/>
      </div>
      <MonAdequacyPanel team={team}/>
    </>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS ÇIKTISI — haftalık ve aylık (A4 yatay), Kinexon rapor dili
   Sayfa 1: başlık (küçük CoachOS logosu), yedi gösterge (check-in uyumu ve beş sorunun +
   RHR'nin takım ortalaması), takımın günlük hazır oluşu, dikkat gerektiren sporcular ve
   kadro özeti (her sporcunun gün/hafta hazır oluşu, soru ortalamaları, check-in, ağrı).
   Sonraki sayfalar: her sporcunun kartı — metrik × gün (hafta) ya da metrik × hafta (ay)
   tablosu, check-in formunun renkleriyle (1 kırmızı … 5 mavi), ağrı bölgeleri.
   Değerler ekranla aynı yoldan: wvDay (günün son kaydı, hazır oluş yoksa soruların
   ortalaması), RHR için Polar'ın günün en düşük nabzı varsa o (wvRhr). Henüz gelmemiş
   günler sayılmaz.
   ═══════════════════════════════════════════════════════════════════════════ */
const WVR_IDS=['readiness','sleep','mentalFatigue','physicalFatigue','soreness','RHR'];
function buildWellnessReport({team,kind,from,to,label,prhr}){
  const tk=fmt(today);
  const ath=(team.athletes||[]);
  const days=[];for(let c=parseD(from);fmt(c)<=to;c=addD(c,1))days.push(fmt(c));
  const done=days.filter(k=>k<=tk);
  const len=days.length;
  const pFrom=fmt(addD(parseD(from),kind==='week'?-7:-len)),pTo=fmt(addD(parseD(from),-1));
  const cols=kind==='week'?days.map((k,i)=>({lab:DN[i],sub:fd(k).slice(0,5),days:[k]}))
    :(()=>{const o=[];for(let c=sow(parseD(from));fmt(c)<=to;c=addD(c,7)){const ws=fmt(c),we=fmt(addD(c,6));
      o.push({lab:fd(ws<from?from:ws).slice(0,5),sub:'– '+fd(we>to?to:we).slice(0,5),days:days.filter(k=>k>=ws&&k<=we)});}return o;})();
  const dayOf=(a,k)=>{const d=wvDay(a,k);const r=wvRhr(a,d,k,prhr);if(!d&&r==null)return null;return{...(d||{}),RHR:r};};
  const rows=ath.map(a=>{
    const per={};done.forEach(k=>{per[k]=dayOf(a,k);});
    const vals=(id,ks)=>ks.map(k=>per[k]&&per[k][id]).filter(v=>v!=null);
    const avg={};WVR_IDS.forEach(id=>{avg[id]=wvMean(vals(id,done));});
    const cells={};WVR_IDS.forEach(id=>{cells[id]=cols.map(c=>wvMean(vals(id,c.days.filter(k=>k<=tk))));});
    const prev=[];for(let c=parseD(pFrom);fmt(c)<=pTo;c=addD(c,1)){const d=wvDay(a,fmt(c));if(d&&d.readiness!=null)prev.push(d.readiness);}
    const pAvg=wvMean(prev);
    const pain={};let painDays=0;
    done.forEach(k=>{const p=per[k]&&per[k].pain;if(p&&p.list.length){painDays++;p.list.forEach(x=>{const o=pain[x.region]||(pain[x.region]={region:x.region,sev:0,n:0});o.sev=Math.max(o.sev,x.sev);o.n++;});}});
    return{a,name:a.name||'—',pos:posOf(a.position)||'',avg,cells,
      n:done.filter(k=>per[k]&&per[k].readiness!=null).length,
      low:done.filter(k=>per[k]&&per[k].readiness!=null&&per[k].readiness<3).length,
      delta:avg.readiness!=null&&pAvg!=null?avg.readiness-pAvg:null,
      spark:done.map(k=>per[k]?per[k].readiness:null),
      pain:Object.values(pain).sort((x,y)=>(y.sev-x.sev)||(y.n-x.n)),painDays};
  }).sort((x,y)=>(x.name||'').localeCompare(y.name||'','tr'));
  const all=id=>wvMean(rows.map(r=>r.avg[id]));
  const team_=days.map(k=>{const v=k>tk?[]:ath.map(a=>{const d=wvDay(a,k);return d&&d.readiness;}).filter(x=>x!=null);
    return{k,fut:k>tk,n:v.length,avg:wvMean(v)};});
  const totalIn=rows.reduce((s,r)=>s+r.n,0),possible=ath.length*done.length;
  const watch=rows.filter(r=>(r.avg.readiness!=null&&r.avg.readiness<3.5)||(r.delta!=null&&r.delta<=-0.5)||r.low>0||r.painDays>0)
    .map(r=>({...r,score:(r.avg.readiness==null?5:r.avg.readiness)-(r.low*0.3)-(r.painDays*0.2)+(r.delta!=null&&r.delta<0?r.delta:0)}))
    .sort((x,y)=>x.score-y.score);
  return{kind,label,from,to,ref:done.length?done[done.length-1]:from,partial:done.length<days.length,teamName:(team.setup&&team.setup.teamName)||'',
    cols,rows,days:team_,watch,nDone:done.length,
    kpi:{comp:possible?totalIn/possible*100:null,totalIn,possible,readiness:all('readiness'),sleep:all('sleep'),mentalFatigue:all('mentalFatigue'),
      physicalFatigue:all('physicalFatigue'),soreness:all('soreness'),RHR:all('RHR'),low:rows.reduce((s,r)=>s+r.low,0),pain:rows.reduce((s,r)=>s+r.painDays,0)}};
}
function printWellnessReport(R){
  const w=window.open('','_blank','width=1280,height=920');
  if(!w){alert(L('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.','Pop-up blocked — allow pop-ups for this site.'));return;}
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const wk=R.kind==='week',K=R.kpi;
  const f1=v=>v==null?'—':Number(v).toFixed(1);
  const f0=v=>v==null?'—':String(Math.round(v));
  /* Baskıda okunur renkler: formun 1-5 renkleri, sarı ve yeşil biraz koyulaştırılmış. */
  const PC=['#dc2626','#ea580c','#ca8a04','#16a34a','#0284c7'];
  const sc=v=>v==null?null:PC[Math.min(5,Math.max(1,Math.round(v)))-1];
  const cell=(v,id)=>{if(v==null)return'<td class="c e">·</td>';if(id==='RHR')return`<td class="c r">${f0(v)}</td>`;
    const c=sc(v);return`<td class="c" style="background:${c}1f;color:${c}"><b>${f1(v)}</b></td>`;};
  const M={readiness:L('Hazır oluş','Readiness'),sleep:L('Uyku','Sleep'),mentalFatigue:L('Zihinsel yorg.','Mental fatigue'),
    physicalFatigue:L('Fiziksel yorg.','Physical fatigue'),soreness:L('Kas ağrısı','Soreness'),RHR:L('RHR (bpm)','RHR (bpm)')};
  const title=wk?L('Haftalık Wellness Raporu','Weekly Wellness Report'):L('Aylık Wellness Raporu','Monthly Wellness Report');
  const tile=(k,v,sub,c)=>`<div class="kp"${c?` style="--kc:${c}"`:''}><div class="kk">${k}</div><div class="kv">${v}</div><div class="ks">${sub}</div></div>`;
  const kpis=[
    tile(L('Check-in uyumu','Check-in rate'),K.comp==null?'—':`${Math.round(K.comp)}<small>%</small>`,`${K.totalIn}/${K.possible} ${L('form','forms')}`,K.comp==null?null:K.comp>=80?'#16a34a':K.comp>=60?'#ca8a04':'#dc2626'),
    tile(M.readiness,f1(K.readiness)+'<small>/5</small>',L(`${K.low} düşük gün (<3)`,`${K.low} low days (<3)`),sc(K.readiness)),
    tile(M.sleep,f1(K.sleep)+'<small>/5</small>',L('takım ortalaması','team mean'),sc(K.sleep)),
    tile(M.mentalFatigue,f1(K.mentalFatigue)+'<small>/5</small>',L('5 = dinç','5 = fresh'),sc(K.mentalFatigue)),
    tile(M.physicalFatigue,f1(K.physicalFatigue)+'<small>/5</small>',L('5 = dinç','5 = fresh'),sc(K.physicalFatigue)),
    tile(M.soreness,f1(K.soreness)+'<small>/5</small>',L(`${K.pain} ağrı bildirimi`,`${K.pain} pain reports`),sc(K.soreness)),
    tile(L('RHR','RHR'),f0(K.RHR)+'<small> bpm</small>',L('dinlenik nabız ort.','resting HR mean')),
  ].join('');
  /* Takımın günlük hazır oluşu. */
  const many=R.days.length>10;
  const bars=R.days.map((d,i)=>{const h=d.avg==null?0:Math.max(4,(d.avg-1)/4*100);const c=sc(d.avg)||'#c3c7cd';const dt=parseD(d.k);
    return`<div class="bc${d.fut?' fut':''}${many&&[0,6].includes(dt.getDay())?' we':''}"><div class="bg"><div class="bv" style="color:${c}">${d.avg==null?'':f1(d.avg)}</div><div class="br" style="height:${h}%;background:${c}"></div></div>
      <div class="bl">${wk?`<b>${DN[i]}</b>${fd(d.k).slice(0,5)}`:dt.getDate()}${d.n&&wk?`<i>${d.n} ${L('form','forms')}</i>`:''}</div></div>`;}).join('');
  const daySec=`<div class="sec"><div class="sh"><span class="st">${L('Takımın günlük hazır oluşu','Team daily readiness')}</span><span class="ss">${L('check-in yapan sporcuların ortalaması · 1–5','mean of athletes who checked in · 1–5')}</span></div><div class="chart${wk?' wk':''}">${bars}</div></div>`;
  const wl=R.watch.slice(0,7).map(r=>{const why=[];
    if(r.avg.readiness!=null&&r.avg.readiness<3.5)why.push(L(`ort. hazır oluş ${f1(r.avg.readiness)}`,`avg readiness ${f1(r.avg.readiness)}`));
    if(r.delta!=null&&r.delta<=-0.5)why.push(L(`önceki döneme göre ${r.delta.toFixed(1)}`,`${r.delta.toFixed(1)} vs previous`));
    if(r.low)why.push(L(`${r.low} düşük gün`,`${r.low} low days`));
    if(r.painDays)why.push(L(`ağrı: ${r.pain.slice(0,2).map(p=>p.region).join(', ')}`,`pain: ${r.pain.slice(0,2).map(p=>p.region).join(', ')}`));
    return`<div class="wr"><span class="wd" style="background:${sc(r.avg.readiness)||'#c3c7cd'}"></span><b>${esc(r.name)}</b><em>${esc(why.join(' · '))}</em><span class="wv" style="color:${sc(r.avg.readiness)||'#8b9099'}">${f1(r.avg.readiness)}</span></div>`;}).join('');
  const watchSec=`<div class="sec"><div class="sh"><span class="st">${L('Dikkat gerektirenler','Needs attention')}</span><span class="ss">${L('düşük ya da düşen hazır oluş, ağrı','low or falling readiness, pain')}</span></div>
    <div class="wl">${wl||`<div class="ok">${L('Bu dönemde dikkat gerektiren sporcu yok.','No athlete needs attention in this period.')}</div>`}</div></div>`;
  /* Kadro özeti. */
  const sum=R.rows.map(r=>`<tr><td class="l"><b>${esc(r.name)}</b>${r.pos?`<em>${esc(r.pos)}</em>`:''}</td>${r.cells.readiness.map(v=>cell(v,'readiness')).join('')}
    <td class="av" style="color:${sc(r.avg.readiness)||'#8b9099'}">${f1(r.avg.readiness)}</td>
    <td>${f1(r.avg.sleep)}</td><td>${f1(r.avg.mentalFatigue)}</td><td>${f1(r.avg.physicalFatigue)}</td><td>${f1(r.avg.soreness)}</td><td>${f0(r.avg.RHR)}</td>
    <td>${r.n}/${R.nDone}</td><td class="dl" style="color:${r.delta==null?'#8b9099':r.delta<=-0.3?'#dc2626':r.delta>=0.3?'#16a34a':'#5c626c'}">${r.delta==null?'—':Math.abs(r.delta)<0.05?'0.0':(r.delta>0?'+':'')+r.delta.toFixed(1)}</td>
    <td class="pn">${r.pain.length?esc(r.pain.slice(0,3).map(p=>p.region).join(', ')):'<span class="z">—</span>'}</td></tr>`).join('');
  const sumSec=`<div class="sec"><div class="sh"><span class="st">${L('Kadro özeti','Squad summary')}</span><span class="ss">${wk?L('günlük hazır oluş','daily readiness'):L('haftalık ort. hazır oluş','weekly mean readiness')} · ${L('dönem ortalamaları','period means')}</span></div>
    <table class="ts"><thead><tr><th class="l">${L('Sporcu','Athlete')}</th>${R.cols.map(c=>`<th class="c">${c.lab}</th>`).join('')}<th>${L('Hazır','Ready')}</th><th>${L('Uyku','Sleep')}</th><th>${L('Zihin','Mental')}</th><th>${L('Fizik','Physical')}</th><th>${L('Ağrı','Sore')}</th><th>RHR</th><th>${L('Form','Forms')}</th><th>Δ</th><th class="l">${L('Ağrı bölgeleri','Pain areas')}</th></tr></thead><tbody>${sum}</tbody></table></div>`;
  /* Sporcu kartları. */
  const spark=v=>{const pts=v.map((x,i)=>x==null?null:[i,x]).filter(Boolean);if(pts.length<2)return'';const W=120,H=26,n=Math.max(1,v.length-1);
    return`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="#1f7cc2" stroke-width="1.5" points="${pts.map(([i,x])=>`${(i/n*W).toFixed(1)},${(H-2-(x-1)/4*(H-4)).toFixed(1)}`).join(' ')}"/></svg>`;};
  const cards=R.rows.map(r=>`<div class="card"><div class="cd-h"><div><b>${esc(r.name)}</b>${r.pos?`<em>${esc(r.pos)}</em>`:''}</div>
      <div class="cd-r">${wk?'':spark(r.spark)}<span class="cd-n">${r.n}/${R.nDone} ${L('form','forms')}</span><span class="cd-v" style="color:${sc(r.avg.readiness)||'#8b9099'}">${f1(r.avg.readiness)}<small>/5</small></span></div></div>
    <table class="tc"><thead><tr><th class="l"></th>${R.cols.map(c=>`<th class="c">${c.lab}${wk?'':`<i>${c.sub}</i>`}</th>`).join('')}<th>${L('Ort.','Avg')}</th></tr></thead>
      <tbody>${WVR_IDS.map(id=>`<tr><td class="l">${M[id]}</td>${r.cells[id].map(v=>cell(v,id)).join('')}<td class="av">${id==='RHR'?f0(r.avg[id]):f1(r.avg[id])}</td></tr>`).join('')}</tbody></table>
    <div class="cd-p">${r.pain.length?`<span>${L('Ağrı','Pain')}:</span> ${r.pain.map(p=>`<i class="pg s${p.sev}">${esc(p.region)}${p.n>1?` ×${p.n}`:''}</i>`).join('')}`:`<span>${L('Ağrı bildirimi yok','No pain reported')}</span>`}</div></div>`).join('');
  const gen=new Date().toLocaleDateString(REPORT_LANG==='tr'?'tr-TR':'en-GB');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${esc(R.teamName)} — ${esc(R.label)}</title>
<style>
@page{size:A4 landscape;margin:9mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ac:#1f7cc2;--ink:#0b0c0e;--bg2:#f5f6f8;--bd:#e3e5e8;--mut:#5c626c;--dim:#8b9099}
body{font-family:'Google Sans',Arial,sans-serif;color:var(--ink);font-size:10px;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:center;background:var(--ink);color:#fff;padding:11px 16px;margin-bottom:10px}
.hd .l{display:flex;align-items:center;gap:14px}.hd img{height:13px;width:auto}
.hd .sep{width:1px;height:26px;background:rgba(255,255,255,.2)}
.hd h1{font-size:16px;font-weight:700;letter-spacing:.01em;text-transform:uppercase;line-height:1.1}
.hd .tm{font-size:10px;color:rgba(255,255,255,.65);margin-top:3px}
.hd .r{text-align:right}.hd .rng{display:inline-block;font-size:11px;font-weight:700;background:var(--ac);padding:5px 12px}
.hd .gd{font-size:8.5px;color:rgba(255,255,255,.55);margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:10px}
.kp{border:1px solid var(--bd);border-top:3px solid var(--kc,var(--ink));padding:8px 10px 9px}
.kk{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.kv{font-size:21px;font-weight:700;margin-top:4px;line-height:1;color:var(--kc,var(--ink))}
.kv small{font-size:10px;font-weight:600;color:var(--dim);margin-left:1px}
.ks{font-size:8.5px;color:var(--mut);margin-top:5px}
.g2{display:grid;grid-template-columns:1.45fr 1fr;gap:10px;margin-bottom:10px}
.sec{border:1px solid var(--bd);break-inside:avoid;page-break-inside:avoid}
.sh{display:flex;align-items:baseline;gap:10px;padding:7px 11px;border-bottom:1px solid var(--bd)}
.st{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ac)}
.ss{margin-left:auto;font-size:8.5px;color:var(--dim)}
.chart{display:flex;gap:3px;height:150px;padding:10px 10px 6px}
.chart.wk{gap:8px}
.bc{flex:1;display:flex;flex-direction:column;min-width:0}.bc.we .bg{background:var(--bg2)}.bc.fut .bl{opacity:.4}
.bg{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.bv{font-size:8px;font-weight:700;margin-bottom:2px}.chart:not(.wk) .bv{font-size:6.5px}
.br{width:70%;max-width:44px}
.bl{text-align:center;font-size:7.5px;color:var(--dim);margin-top:4px;line-height:1.25}
.bl b{display:block;color:var(--ink);font-size:8.5px}.bl i{display:block;font-style:normal;font-size:7px}
.wl{padding:4px 11px}
.wr{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)}
.wr:last-child{border-bottom:none}
.wd{width:8px;height:8px;border-radius:50%;flex:none}
.wr b{font-size:9.5px;text-transform:uppercase;white-space:nowrap}
.wr em{font-style:normal;color:var(--mut);font-size:8.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wr .wv{font-size:13px;font-weight:700}
.ok{padding:14px 0;color:var(--mut)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{font-size:7.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:var(--ink);padding:6px 4px;text-align:center}
th i{display:block;font-style:normal;font-weight:500;color:rgba(255,255,255,.6);letter-spacing:0}
td{padding:4px 4px;border-top:1px solid var(--bd);text-align:center;font-variant-numeric:tabular-nums;font-size:9px}
th.l,td.l{text-align:left;padding-left:9px}
.ts th.l:first-child{width:19%}.ts td.l b,.ts td.l{font-size:9px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ts td.l em,.cd-h em{font-style:normal;color:var(--dim);font-size:7.5px;margin-left:5px;text-transform:none}
.ts th.l:last-child{width:15%}
td.c b{font-weight:700}td.e{color:#c3c7cd}td.r{color:var(--mut)}
td.av{font-weight:700;background:var(--bg2)}
td.pn{text-align:left;font-size:8px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.z{color:#c3c7cd}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;break-before:page;page-break-before:always}
.card{border:1px solid var(--bd);break-inside:avoid;page-break-inside:avoid}
.cd-h{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:2px solid var(--ink)}
.cd-h b{font-size:11px;text-transform:uppercase;letter-spacing:.02em}
.cd-r{display:flex;align-items:center;gap:10px}
.cd-n{font-size:8px;color:var(--dim)}
.cd-v{font-size:17px;font-weight:700;line-height:1}.cd-v small{font-size:8px;color:var(--dim)}
.tc td.l{width:24%;font-size:8.5px;color:var(--mut)}
.tc th{padding:4px 2px}
.cd-p{padding:5px 10px 6px;font-size:8px;color:var(--mut);display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pg{font-style:normal;padding:1px 6px;border:1px solid}
.pg.s0,.pg.s3{color:#dc2626;border-color:#dc262666;background:#dc262612}
.pg.s2{color:#ea580c;border-color:#ea580c66;background:#ea580c12}
.pg.s1{color:#ca8a04;border-color:#ca8a0466;background:#ca8a0412}
.fo{display:flex;justify-content:space-between;font-size:8px;color:var(--dim);margin-top:8px}
</style></head><body>
<div class="hd"><div class="l"><img src="${COACHOS_LOGO}" alt="CoachOS"><span class="sep"></span><div><h1>${title}</h1><div class="tm">${esc(R.teamName)}</div></div></div>
  <div class="r"><div class="rng">${esc(R.label)}</div><div class="gd">${R.partial?L(`${fd(R.ref)} itibarıyla · `,`as of ${fd(R.ref)} · `):''}${L('Oluşturuldu','Generated')} ${gen}</div></div></div>
<div class="kpis">${kpis}</div>
<div class="g2">${daySec}${watchSec}</div>
${sumSec}
<div class="cards">${cards}</div>
<div class="fo"><span>${L('Puanlar 1–5: 1 kötü · 5 iyi (check-in formunun renkleri). RHR: Polar\'ın günün en düşük nabzı, yoksa check-in. Δ: önceki döneme göre hazır oluş farkı.','Scores 1–5: 1 poor · 5 good (check-in form colours). RHR: Polar\'s lowest HR of the day, else check-in. Δ: readiness change vs previous period.')}</span><span>CoachOS · ${esc(R.teamName)} · ${esc(R.label)}</span></div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},500);
}
