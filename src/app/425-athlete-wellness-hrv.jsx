/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS TAB — the morning check-in, the night's sleep and HRV

   Left, the wellness log: the check-in's six answers over two weeks. Right, the night:
   how long the athlete slept, when they fell asleep and woke, and HRV (RMSSD) read
   against the athlete's own reference, with a three-level alert. Under both, the four
   things HRV is read beside: sleeping heart rate, sleep duration, wellness and sRPE load.

   The nights are typed in (Polar Loop gives RMSSD from the first four hours of sleep)
   and kept on `ath.nightLog` — [{id,date,bedTime,wakeTime,hrv,sleepHR}], one row per
   morning, the date being the morning the athlete woke up. They live apart from the
   check-in rows so a re-submitted form can never write over a night.

   HRV MONITORING — CoachOS_HRV_Monitoring v1.0, as written:
     ln_rmssd     = ln(daily RMSSD); 0, negative and empty nights are left out
     weekly_mean  = mean ln_rmssd over the 7 days ending today, ≥ 5 valid nights
     baseline     = mean ln_rmssd over the 28 days BEFORE today, ≥ 21 valid nights
                    (rolling, previous days only — so each day keeps the reference it
                    had on the day), baseline_sd its sample SD (ddof 1)
     LL1 = baseline − 0.5·SD   LL2 = baseline − 1.0·SD   (SWC = 0.5·SD)
     weekly_cv    = sample SD ÷ mean of the last 7 nights' RMSSD × 100, ≥ 5 nights
     deviation %  = (e^(weekly_mean − baseline) − 1) × 100
   Alerts, RED > YELLOW > DAILY_DROP > NORMAL:
     RED          weekly_mean < LL2
     YELLOW       LL2 ≤ weekly_mean < LL1, or ≥ 2 nights in a row below LL2
     DAILY_DROP   tonight below LL2 (and not yet two in a row)
     NORMAL       weekly_mean ≥ LL1
   A missing night breaks a run. Sleeping HR (> its 28-day mean + 1 SD) and wellness
   (< its 28-day mean − 1 SD) are supporting indicators: a warning when 2 of the last 3
   days are abnormal. Read beside a YELLOW or RED, they add the combined messages; all
   three together is a level-3 review. Nothing here changes a training load: HRV is not
   diagnostic and every alert asks for the coach's own review.
   ═══════════════════════════════════════════════════════════════════════════ */
const HRV_PERIODS=[7,14,28,90];
const HRV_ALERTS={
  NORMAL:{level:0,c:'#22c55e',tr:'Normal',en:'Normal',
    mTr:'HRV kişisel referans seviyesine yakın.',mEn:'HRV is close to the personal reference.'},
  DAILY_DROP:{level:1,c:'#0ea5e9',tr:'Günlük Düşüş',en:'Daily Drop',
    mTr:'Günlük HRV normal seviyenin altında. Takip önerilir.',mEn:'Daily HRV is below its normal level. Follow-up is advised.'},
  YELLOW:{level:2,c:'#f59e0b',tr:'Sarı',en:'Yellow',
    mTr:'HRV eğiliminde düşüş tespit edildi. Uyku, wellness ve antrenman yükünü inceleyin.',mEn:'A downward HRV trend was detected. Review sleep, wellness and training load.'},
  RED:{level:3,c:'#ef4444',tr:'Kırmızı',en:'Red',
    mTr:'HRV eğilimi kişisel referanstan belirgin şekilde uzaklaştı. Sporcu değerlendirmesi önerilir.',mEn:'The HRV trend has moved clearly away from the personal reference. An athlete review is advised.'},
  INSUFFICIENT_DATA:{level:null,c:'var(--dim)',tr:'Yetersiz Veri',en:'Insufficient Data',
    mTr:'Kişisel referans için son 28 günde en az 21 geçerli gece gerekiyor.',mEn:'The personal reference needs at least 21 valid nights in the last 28 days.'},
  INSUFFICIENT_WEEK:{level:null,c:'var(--dim)',tr:'Yetersiz Veri',en:'Insufficient Data',
    mTr:'7 günlük ortalama için son 7 günde en az 5 geçerli gece gerekiyor.',mEn:'The 7-day mean needs at least 5 valid nights in the last 7 days.'},
};
const HRV_COMBINED={
  HRV_AND_SLEEPING_HR:{tr:'HRV düşüşüne yüksek gece kalp atış hızı eşlik ediyor.',en:'The HRV drop comes with a raised sleeping heart rate.'},
  HRV_AND_WELLNESS:{tr:'HRV düşüşüne olumsuz wellness değerleri eşlik ediyor.',en:'The HRV drop comes with poor wellness scores.'},
  MULTIPLE_INDICATORS:{tr:'Birden fazla toparlanma göstergesinde olumsuz değişim tespit edildi. Sporcu ve antrenman yükü incelenmeli.',en:'Several recovery indicators changed for the worse. The athlete and the training load should be reviewed.'},
};
const _hMean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const _hSd=a=>{if(a.length<2)return 0;const m=_hMean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1));};
/* "23:40" → minutes after midnight. */
const hhmmMin=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(v||'').trim());if(!m)return null;const h=+m[1],mi=+m[2];return h<24&&mi<60?h*60+mi:null;};
/* Minutes asleep from falling asleep to waking, across midnight; nothing over 18 h. */
function nightSleepMin(n){
  const b=hhmmMin(n&&n.bedTime),w=hhmmMin(n&&n.wakeTime);
  if(b==null||w==null)return null;
  let d=w-b;if(d<=0)d+=1440;
  return d>0&&d<=1080?d:null;
}
const fmtSleep=m=>m==null?'—':L(`${Math.floor(m/60)} sa ${String(m%60).padStart(2,'0')} dk`,`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} m`);
/* The whole model over an athlete's record. Every day is computed from that day's own
   rolling windows, so a past day keeps the reference it was alerted against. */
function hrvModel(ath){
  const nights={};(ath.nightLog||[]).forEach(n=>{if(n&&n.date)nights[n.date]=n;});
  const wl={};(ath.wellness||[]).forEach(w=>{if(!w||!w.date)return;
    const v=recNum(w.readiness)!=null?recNum(w.readiness):wellReadiness(w);if(v!=null&&!isNaN(v))wl[w.date]=Number(v);});
  const shift=(k,o)=>fmt(addD(parseD(k),o));
  const pos=v=>{const n=recNum(v);return n!=null&&n>0?n:null;};
  const rm=k=>pos((nights[k]||{}).hrv);
  const shr=k=>pos((nights[k]||{}).sleepHR);
  const wv=k=>wl[k]==null?null:wl[k];
  const memo=new Map();
  const stat=k=>{
    if(memo.has(k))return memo.get(k);
    const r=rm(k),ln=r!=null?Math.log(r):null;
    const wk=[];for(let j=0;j<7;j++){const v=rm(shift(k,-j));if(v!=null)wk.push(v);}
    const weekly=wk.length>=5?_hMean(wk.map(Math.log)):null;
    const cv=wk.length>=5?_hSd(wk)/_hMean(wk)*100:null;
    const bl=[];for(let j=1;j<=28;j++){const v=rm(shift(k,-j));if(v!=null)bl.push(Math.log(v));}
    const ok=bl.length>=21;
    const base=ok?_hMean(bl):null,sd=ok?_hSd(bl):null;
    const o={k,r,ln,weekly,cv,base,sd,nBase:bl.length,nWeek:wk.length,
      ll1:ok?base-0.5*sd:null,ll2:ok?base-sd:null,up:ok?base+0.5*sd:null,
      dev:(ok&&weekly!=null)?(Math.exp(weekly-base)-1)*100:null};
    memo.set(k,o);return o;
  };
  const low=k=>{const s=stat(k);return s.ln!=null&&s.ll2!=null&&s.ln<s.ll2;};
  const consec=k=>{let n=0;for(let j=0;j<120&&low(shift(k,-j));j++)n++;return n;};
  const alertAt=k=>{
    const s=stat(k),c=consec(k);
    if(s.base==null)return'INSUFFICIENT_DATA';
    if(s.weekly!=null&&s.weekly<s.ll2)return'RED';
    if((s.weekly!=null&&s.weekly<s.ll1)||c>=2)return'YELLOW';
    if(s.ln!=null&&s.ln<s.ll2)return'DAILY_DROP';
    if(s.weekly!=null)return'NORMAL';
    return'INSUFFICIENT_WEEK';
  };
  /* A supporting indicator on a day: its 28-day reference (previous days only, ≥ 21),
     and a warning when 2 of the last 3 days sit beyond 1 SD in the bad direction. */
  const support=(get,high)=>{
    const ref=d=>{const b=[];for(let j=1;j<=28;j++){const x=get(shift(d,-j));if(x!=null)b.push(x);}
      return b.length>=21?{m:_hMean(b),sd:_hSd(b)}:null;};
    const abn=d=>{const v=get(d),r=ref(d);if(v==null||!r)return false;return high?v>r.m+r.sd:v<r.m-r.sd;};
    return k=>{let n=0;for(let j=0;j<3;j++)if(abn(shift(k,-j)))n++;return{warn:n>=2,ref:ref(k),today:abn(k)};};
  };
  const shrAt=support(shr,true),wlAt=support(wv,false);
  /* The day the panel reads: the latest night with an HRV value, else the latest night. */
  const keys=Object.keys(nights).sort();
  const withHrv=keys.filter(k=>rm(k)!=null);
  const end=withHrv.length?withHrv[withHrv.length-1]:(keys.length?keys[keys.length-1]:fmt(today));
  return{nights,rm,shr,wv,stat,consec,alertAt,shrAt,wlAt,shift,end};
}
/* What the panel says about the end day: the alert, the combined messages, the trend,
   where the week sits against the reference and how urgently to look at it. */
function hrvAssess(M,k){
  const s=M.stat(k),id=M.alertAt(k),a=HRV_ALERTS[id];
  const sh=M.shrAt(k),wl=M.wlAt(k);
  const combined=[];let level=a.level;
  if(a.level!=null&&a.level>=2){
    if(sh.warn&&wl.warn){combined.push('MULTIPLE_INDICATORS');level=3;}
    else{if(sh.warn)combined.push('HRV_AND_SLEEPING_HR');if(wl.warn)combined.push('HRV_AND_WELLNESS');}
  }
  const prev=M.stat(M.shift(k,-7));
  const swc=s.sd!=null?0.5*s.sd:null;
  const trend=(s.weekly==null||prev.weekly==null||swc==null)?null
    :(s.weekly-prev.weekly< -swc?'down':s.weekly-prev.weekly>swc?'up':'flat');
  const ref=(s.weekly==null||s.ll1==null)?null:s.weekly<s.ll1?'below':s.weekly>s.up?'above':'within';
  const prio=level==null?null:level>=3?'high':level===2?'med':level===1?'low':'none';
  return{s,id,a,combined,level,trend,ref,prio,sh,wl};
}
/* Width of a box in px, kept current — the charts are drawn in real pixels. */
function useElW(ref,fallback){
  const[w,setW]=useState(fallback||600);
  useEffect(()=>{const el=ref.current;if(!el)return;
    const m=()=>setW(Math.max(80,el.clientWidth||0));m();
    let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);try{ro.observe(el);}catch(e){}}
    else window.addEventListener('resize',m);
    return()=>{try{ro&&ro.disconnect();}catch(e){}window.removeEventListener('resize',m);};
  },[]);
  return w;
}
/* A small line (or bar) chart for one series, gaps left as gaps. No fills, no gradients:
   a line, its points and a dashed average. */
function WlSpark({vals,color,colorOf,avg,five,h,bars,labels}){
  const ref=useRef(null);const w=useElW(ref,300);
  const H=h||54,px=8,pt=labels?15:6,pb=6;
  const pres=vals.map((v,i)=>({v,i})).filter(p=>p.v!=null);
  if(!pres.length)return<div ref={ref} className="wl-spark none" style={{height:H}}>—</div>;
  let lo=Math.min(...pres.map(p=>p.v)),hi=Math.max(...pres.map(p=>p.v));
  if(bars)lo=0;
  if(lo===hi){lo-=1;hi+=1;}else if(!bars){const pd=(hi-lo)*.25;lo-=pd;hi+=pd;}
  const n=vals.length,step=n>1?(w-2*px)/(n-1):0;
  const X=i=>n<=1?w/2:px+i*step;
  const Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  const fmtV=v=>five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v));
  const line=pres.map((p,k)=>`${k?'L':'M'}${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const bw=Math.max(2,Math.min(14,step*.62||10));
  return(<div ref={ref} className="wl-spark" style={{height:H}}>
    <svg width={w} height={H}>
      {avg!=null&&!bars&&<line x1={px} x2={w-px} y1={Y(avg)} y2={Y(avg)} className="wl-avg"/>}
      {bars?pres.map(p=><rect key={p.i} x={X(p.i)-bw/2} y={Y(p.v)} width={bw} height={Math.max(1,H-pb-Y(p.v))} rx="2" fill={colorOf?colorOf(p.v):color}/>)
      :<><path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
        {pres.map((p,k)=><circle key={p.i} cx={X(p.i)} cy={Y(p.v)} r={k===pres.length-1?3.3:2.3} fill={colorOf?colorOf(p.v):color}/>)}</>}
      {labels&&pres.map(p=><text key={'t'+p.i} x={X(p.i)} y={Y(p.v)-6} textAnchor="middle" className="wl-sv" fill={colorOf?colorOf(p.v):'var(--text2)'}>{fmtV(p.v)}</text>)}
    </svg>
  </div>);
}
/* ---- The wellness log: six answers over a two-week window ---- */
function WellnessLog({ath,updAth}){
  const[wlEnd,setWlEnd]=useState(()=>{const ds=(ath.wellness||[]).map(w=>w.date).filter(Boolean).sort();return ds.length?ds[ds.length-1]:fmt(today);});
  const[tableOpen,setTableOpen]=useState(false);
  const[lim,setLim]=useState(10);
  const W=ath.wellness||[];
  const METRICS=[
    {id:'readiness',label:L('Hazır Oluş','Readiness'),color:'#10b981',unit:'/5',hi:true},
    {id:'sleep',label:L('Uyku','Sleep'),color:'#3b82f6',unit:'/5',hi:true},
    // The check-in's questions in the form's order — the same list as the heatmap.
    {id:'mentalFatigue',label:L('Zihinsel Yorgunluk','Mental Fatigue'),color:'#8b5cf6',unit:'/5',hi:true},
    {id:'physicalFatigue',label:L('Fiziksel Yorgunluk','Physical Fatigue'),color:'#f97316',unit:'/5',hi:true},
    {id:'soreness',label:L('Kas Ağrısı','Muscle Soreness'),color:'#f43f5e',unit:'/5',hi:true},
    {id:'RHR',label:L('İstirahat Nabzı','Resting HR'),color:'#06b6d4',unit:'bpm',hi:false},
  ];
  // 1-5 scores in the check-in form's own colours: 1 red … 5 blue.
  const s5=v=>score5Color(v)||'var(--dim)';
  const fmtN=(v,five)=>v==null?'—':(five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v)));
  const start=fmt(addD(parseD(wlEnd),-13));
  const days=Array.from({length:14},(_,i)=>fmt(addD(parseD(start),i)));
  const byDay={};W.forEach(w=>{if(w.date&&w.date>=start&&w.date<=wlEnd)byDay[w.date]=w;});
  const nIn=Object.keys(byDay).length;
  return(<div className="panel wl2-log">
    <div className="wl2-h">
      <div><h2>{L('Wellness Kaydı','Wellness Log')}</h2>
        <div className="wl2-s">{L(`Sabah check-in · ${fd(start).slice(0,5)} – ${fd(wlEnd).slice(0,5)} · ${nIn} kayıt`,`Morning check-in · ${fd(start).slice(0,5)} – ${fd(wlEnd).slice(0,5)} · ${nIn} entries`)}</div></div>
      <div className="wl2-nav">
        <button className="btn sm sec" onClick={()=>setWlEnd(w=>fmt(addD(parseD(w),-7)))} title={L('Önceki hafta','Previous week')}>‹</button>
        <button className="btn sm sec" onClick={()=>setWlEnd(w=>fmt(addD(parseD(w),7)))} title={L('Sonraki hafta','Next week')}>›</button>
        <button className="btn sm sec" onClick={()=>{const ds=W.map(x=>x.date).filter(Boolean).sort();setWlEnd(ds.length?ds[ds.length-1]:fmt(today));}}>{L('En son','Latest')}</button>
        <button className="btn sm sec" onClick={()=>{const w={id:uid(),srcId:null,date:fmt(today),RHR:'',sleep:'',mentalFatigue:'',physicalFatigue:'',fatigue:'',soreness:'',areaOfPain:'',readiness:''};updAth(ath.id,{wellness:[...W,w]});setTableOpen(true);}}>+ {L('Elle','Manual')}</button>
      </div>
    </div>
    {W.length===0&&<div className="empty-st">{L('Wellness verisi yok — check-in formundan gelir ya da elle eklenir','No wellness data — it comes from the check-in form or is added by hand')}</div>}
    {W.length>0&&<div className="wl2-rows">
      {METRICS.map(m=>{
        const five=m.unit==='/5';
        const series=days.map(d=>{const w=byDay[d];if(!w)return null;const v=recNum(w[m.id]);return v==null?null:v;});
        const present=series.filter(v=>v!=null);
        const latest=present.length?present[present.length-1]:null;
        const prev=present.length>1?present[present.length-2]:null;
        const avg=present.length?present.reduce((a,b)=>a+b,0)/present.length:null;
        const delta=(latest!=null&&prev!=null)?latest-prev:null;
        const good=delta==null?true:(m.hi?delta>=0:delta<=0);
        return(<div key={m.id} className="wl2-row" style={{'--mc':m.color}}>
          <div className="wl2-m">
            <div className="wl2-ml">{m.label}</div>
            <div className="wl2-mv"><b style={{color:latest==null?'var(--dim)':(five?s5(latest):'var(--text)')}}>{fmtN(latest,five)}</b><span>{m.unit}</span>
              {delta!=null&&delta!==0&&<em className={good?'up':'dn'}>{delta>0?'+':''}{fmtN(delta,five)}</em>}</div>
          </div>
          <WlSpark vals={series} color={m.color} colorOf={five?s5:null} avg={avg} five={five} labels/>
          <div className="wl2-avg"><b>{fmtN(avg,five)}</b><span>{L('ort.','avg')} · {present.length}</span></div>
        </div>);
      })}
    </div>}
    {W.length>0&&<>
      <div className="row" style={{justifyContent:'space-between',marginTop:12,marginBottom:tableOpen?10:0}}>
        <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ayrıntılı kayıtlar','Detailed records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({W.length} {L('satır','rows')})</span></strong>
        <button className="btn sec sm" onClick={()=>setTableOpen(o=>!o)}>{tableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
      </div>
      {tableOpen&&(()=>{const rev=[...W].reverse();const vis=rev.slice(0,lim);const hasMore=rev.length>lim;
        return<div style={{overflowX:'auto'}}><table><thead><tr>
          <th>{L('Tarih','Date')}</th><th>RHR</th><th>{L('Uyku','Sleep')}</th><th>{L('Zihinsel Yorg.','Mental Fat.')}</th><th>{L('Fiziksel Yorg.','Physical Fat.')}</th><th>{L('Kas Ağrısı','Soreness')}</th><th>{L('Hazır Oluş','Readiness')}</th><th style={{width:50}}></th>
        </tr></thead><tbody>
          {vis.map((w,idx)=>{const realIdx=W.length-1-idx;
            /* A value the coach types here is theirs: the field is stamped on the
               record so the next form sync writes around it instead of over it. */
            const uw=(k,v)=>{const a=[...W];const cur=a[realIdx];
              const next={...cur,[k]:v,manualEdits:[...new Set([...(cur.manualEdits||[]),k])]};
              // The single fatigue number other screens read follows its two halves.
              if(k==='mentalFatigue'||k==='physicalFatigue')next.fatigue=wellFatigue(next)??'';
              a[realIdx]=next;
              updAth(ath.id,{wellness:a});};
            /* A row written before fatigue was split has one fatigue score and no
               halves; it shows in both boxes, greyed, until the coach types over it. */
            const oldFat=recNum(w.mentalFatigue)==null&&recNum(w.physicalFatigue)==null&&recNum(w.fatigue)!=null?String(w.fatigue):undefined;
            return<tr key={w.id||idx}>
              <td><input type="date" value={w.date} onChange={e=>uw('date',e.target.value)} style={{width:130}}/><div className="help">{fd(w.date)}</div></td>
              <td><input type="number" value={w.RHR??''} onChange={e=>uw('RHR',e.target.value)} style={{width:60}}/></td>
              <td><input type="number" step="0.5" value={w.sleep??''} onChange={e=>uw('sleep',e.target.value)} style={{width:55}}/></td>
              <td><input type="number" step="0.5" value={w.mentalFatigue??''} placeholder={oldFat} onChange={e=>uw('mentalFatigue',e.target.value)} style={{width:55}}/></td>
              <td><input type="number" step="0.5" value={w.physicalFatigue??''} placeholder={oldFat} onChange={e=>uw('physicalFatigue',e.target.value)} style={{width:55}}/></td>
              <td><input type="number" step="0.5" value={w.soreness??''} onChange={e=>uw('soreness',e.target.value)} style={{width:55}}/></td>
              {/* Area of Pain and Source have no column here: both stay on the record —
                  the pain report and the heatmap read areaOfPain, and srcId decides what
                  the next sync may overwrite. */}
              <td><input type="number" step="0.1" value={w.readiness??''} onChange={e=>uw('readiness',e.target.value)} style={{width:60}}/></td>
              {/* Formdan gelen satırın silinmesi kaynağını da mezar taşına yazıyor: gönderim
                  14 gün `checkins`'te duruyor ve taşı olmayan satırı gelen kutusu geri getirirdi. */}
              <td><button className="btn xs danger" onClick={()=>{
                const row=W[realIdx];
                const src=row&&row.srcId;
                const upd={wellness:W.filter((_,j)=>j!==realIdx)};
                if(src)upd.deletedWellnessSrcIds=[...new Set([...(ath.deletedWellnessSrcIds||[]),src])];
                updAth(ath.id,upd);
              }}>✕</button></td>
            </tr>;})}
        </tbody></table>
        <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
          {hasMore&&<button className="btn sm sec" onClick={()=>setLim(n=>n+10)}>{L(`10 tane daha (${rev.length-lim} kaldı)`,`Show 10 more (${rev.length-lim} remaining)`)}</button>}
          {lim>10&&<button className="btn sm sec" onClick={()=>setLim(10)}>{L('Daralt','Collapse')}</button>}
          <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
        </div></div>;
      })()}
    </>}
  </div>);
}
/* ---- The HRV chart: daily RMSSD, its 7-day mean, the 28-day reference and the
   personal band (e^LL1 … e^(baseline + 0.5 SD)), missing nights drawn as gaps. ---- */
function HrvChart({M,end,days}){
  const ref=useRef(null);const W=useElW(ref,520);
  const H=232,pl=36,pr=10,ptp=10,pb=24;
  const keys=Array.from({length:days},(_,i)=>M.shift(end,i-days+1));
  const pts=keys.map(k=>{const s=M.stat(k);return{k,r:s.r,wk:s.weekly!=null?Math.exp(s.weekly):null,
    base:s.base!=null?Math.exp(s.base):null,lo:s.ll1!=null?Math.exp(s.ll1):null,hi:s.up!=null?Math.exp(s.up):null,al:M.alertAt(k)};});
  const all=[];pts.forEach(p=>['r','wk','base','lo','hi'].forEach(f=>{if(p[f]!=null)all.push(p[f]);}));
  if(!all.length)return<div ref={ref} className="hrv-empty">{L('Bu aralıkta HRV kaydı yok. Gece verisini sağ üstteki "+ Gece verisi" ile gir.','No HRV in this window. Enter a night with "+ Night data" above.')}</div>;
  let lo=Math.min(...all),hi=Math.max(...all);const pad=Math.max(4,(hi-lo)*.15);lo=Math.max(0,lo-pad);hi=hi+pad;
  const span=hi-lo,stepRaw=span/4;const mag=Math.pow(10,Math.floor(Math.log10(stepRaw)));
  const step=[1,2,2.5,5,10].map(x=>x*mag).find(x=>x>=stepRaw)||10*mag;
  lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
  const ticks=[];for(let v=lo;v<=hi+1e-9;v+=step)ticks.push(+v.toFixed(6));
  const n=pts.length,X=i=>pl+(n<=1?(W-pl-pr)/2:i*(W-pl-pr)/(n-1)),Y=v=>ptp+(1-(v-lo)/(hi-lo))*(H-ptp-pb);
  /* Runs of consecutive days carrying a value, so a missing night is a gap. */
  const runs=f=>{const out=[];let cur=[];pts.forEach((p,i)=>{if(p[f]!=null)cur.push(i);else if(cur.length){out.push(cur);cur=[];}});if(cur.length)out.push(cur);return out;};
  const path=f=>runs(f).map(r=>r.map((i,k)=>`${k?'L':'M'}${X(i).toFixed(1)} ${Y(pts[i][f]).toFixed(1)}`).join(' ')).join(' ');
  const band=runs('lo').map(r=>{const up=r.map((i,k)=>`${k?'L':'M'}${X(i).toFixed(1)} ${Y(pts[i].hi).toFixed(1)}`).join(' ');
    const dn=r.slice().reverse().map(i=>`L${X(i).toFixed(1)} ${Y(pts[i].lo).toFixed(1)}`).join(' ');return`${up} ${dn} Z`;}).join(' ');
  const every=Math.max(1,Math.ceil(n/8));
  return(<div ref={ref} className="hrv-chart">
    <svg width={W} height={H} role="img" aria-label="HRV">
      {ticks.map(t=><g key={t}><line x1={pl} x2={W-pr} y1={Y(t)} y2={Y(t)} className="hrv-grid"/>
        <text x={pl-6} y={Y(t)+3.5} textAnchor="end" className="hrv-ax">{Math.round(t)}</text></g>)}
      {band&&<path d={band} className="hrv-band"/>}
      <path d={path('base')} className="hrv-base"/>
      <path d={path('wk')} className="hrv-wk"/>
      <path d={path('r')} className="hrv-day"/>
      {pts.map((p,i)=>p.r==null?null:<circle key={p.k} cx={X(i)} cy={Y(p.r)} r={i===n-1||n<=31?3.2:2.2}
        className="hrv-pt" style={(HRV_ALERTS[p.al]||{}).level>=1?{fill:HRV_ALERTS[p.al].c}:undefined}>
        <title>{`${fd(p.k)} · ${Math.round(p.r)} ms · ${L(HRV_ALERTS[p.al].tr,HRV_ALERTS[p.al].en)}`}</title></circle>)}
      {pts.map((p,i)=>(i%every===0||i===n-1)?<text key={'x'+p.k} x={X(i)} y={H-6} textAnchor="middle" className="hrv-ax">{fd(p.k).slice(0,5)}</text>:null)}
    </svg>
  </div>);
}
/* ---- The night: sleep and HRV, the right-hand column ---- */
function AthSleepHrv({ath,updAth,M,days,setDays}){
  const log=ath.nightLog||[];
  const[formOpen,setFormOpen]=useState(false);
  const[listOpen,setListOpen]=useState(false);
  const blank=()=>({date:fmt(today),bedTime:'',wakeTime:'',hrv:'',sleepHR:''});
  const[draft,setDraft]=useState(blank);
  const saveNight=()=>{
    if(!draft.date)return;
    const i=log.findIndex(n=>n.date===draft.date);
    const rec={id:i>=0?log[i].id:uid(),date:draft.date,bedTime:draft.bedTime,wakeTime:draft.wakeTime,hrv:draft.hrv,sleepHR:draft.sleepHR};
    const next=i>=0?log.map((n,j)=>j===i?{...n,...rec}:n):[...log,rec];
    updAth(ath.id,{nightLog:next.sort((a,b)=>String(a.date).localeCompare(String(b.date)))});
    setDraft(blank());setFormOpen(false);
  };
  const upd=(id,k,v)=>updAth(ath.id,{nightLog:log.map(n=>n.id===id?{...n,[k]:v}:n)});
  const del=id=>updAth(ath.id,{nightLog:log.filter(n=>n.id!==id)});
  /* The latest night that carries sleep times, and the week's average around it. */
  const withSleep=log.filter(n=>nightSleepMin(n)!=null).sort((a,b)=>a.date.localeCompare(b.date));
  const last=withSleep[withSleep.length-1]||null;
  const lastMin=last?nightSleepMin(last):null;
  const wkFrom=last?M.shift(last.date,-6):null;
  const wk=withSleep.filter(n=>wkFrom&&n.date>=wkFrom&&n.date<=last.date).map(nightSleepMin);
  const wkAvg=wk.length?Math.round(_hMean(wk)):null;
  const sleepBars=Array.from({length:14},(_,i)=>{const k=M.shift(last?last.date:M.end,i-13);const n=M.nights[k];return n?nightSleepMin(n):null;});
  const end=M.end,A=hrvAssess(M,end),s=A.s;
  const ex=v=>v==null?'—':Math.round(Math.exp(v));
  const devC=s.dev==null?'var(--text)':s.dev<0?'var(--high-t)':'var(--low-t)';
  const cards=[
    {k:L('Son HRV','Latest HRV'),v:s.r!=null?Math.round(s.r):'—',u:'ms',c:'#3b82f6',sub:s.r!=null?fd(end):L('bu gece veri yok','no value tonight')},
    {k:L('7 Günlük Ortalama','7-Day Mean'),v:ex(s.weekly),u:'ms',c:'#14b8a6',sub:L(`${s.nWeek}/7 gece`,`${s.nWeek}/7 nights`)},
    {k:L('28 Günlük Referans','28-Day Reference'),v:ex(s.base),u:'ms',c:'#6366f1',sub:L(`${s.nBase}/28 gece`,`${s.nBase}/28 nights`)},
    {k:L('Sapma','Deviation'),v:s.dev==null?'—':`${s.dev>0?'+':''}${Math.round(s.dev)}%`,u:'',c:s.dev!=null&&s.dev<0?'#ef4444':'#22c55e',vc:devC,sub:L('7 gün / referans','7 days vs reference')},
    {k:'CV',v:s.cv==null?'—':`${s.cv.toFixed(1)}%`,u:'',c:'#94a3b8',sub:L('son 7 gece','last 7 nights')},
    {k:L('Uyarı','Alert'),v:L(A.a.tr,A.a.en),u:'',c:A.a.c,vc:A.a.c,sub:A.level==null?L('referans oluşuyor','reference building'):L(`seviye ${A.level}`,`level ${A.level}`)},
  ];
  const trendTxt={down:[L('Düşüş','Falling'),'var(--high-t)'],up:[L('Artış','Rising'),'var(--low-t)'],flat:[L('Stabil','Stable'),'var(--text)']};
  const refTxt={below:[L('Altında','Below'),'var(--high-t)'],within:[L('Aralıkta','Within'),'var(--low-t)'],above:[L('Üstünde','Above'),'var(--peak-t)']};
  const prioTxt={high:[L('Yüksek','High'),'#ef4444'],med:[L('Orta','Medium'),'#f59e0b'],low:[L('Düşük','Low'),'#0ea5e9'],none:[L('Rutin','Routine'),'var(--low-t)']};
  const row=(k,pair)=><div className="hrv-ar"><span>{k}</span><b style={{color:pair?pair[1]:'var(--dim)'}}>{pair?pair[0]:'—'}</b></div>;
  return(<div className="panel wl2-night">
    <div className="wl2-h">
      <div><h2>{L('Uyku ve HRV','Sleep & HRV')}</h2><div className="wl2-s">{L('Gece verisi · Polar Loop · RMSSD (uykunun ilk 4 saati)','Night data · Polar Loop · RMSSD (first 4 hours of sleep)')}</div></div>
      <div className="wl2-nav">
        <button className="btn sm" onClick={()=>{setFormOpen(o=>!o);setDraft(blank());}}>{formOpen?L('Kapat','Close'):L('+ Gece verisi','+ Night data')}</button>
      </div>
    </div>
    {formOpen&&<div className="ng-form">
      <label><span>{L('Sabah (tarih)','Morning (date)')}</span><input type="date" value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))}/></label>
      <label><span>{L('Uykuya dalış','Fell asleep')}</span><input type="time" value={draft.bedTime} onChange={e=>setDraft(d=>({...d,bedTime:e.target.value}))}/></label>
      <label><span>{L('Uyanma','Woke up')}</span><input type="time" value={draft.wakeTime} onChange={e=>setDraft(d=>({...d,wakeTime:e.target.value}))}/></label>
      <label><span>HRV · RMSSD (ms)</span><input type="number" min="1" step="0.1" inputMode="decimal" value={draft.hrv} onChange={e=>setDraft(d=>({...d,hrv:e.target.value}))}/></label>
      <label><span>{L('Uyku nabzı (bpm)','Sleeping HR (bpm)')}</span><input type="number" min="20" step="1" inputMode="numeric" value={draft.sleepHR} onChange={e=>setDraft(d=>({...d,sleepHR:e.target.value}))}/></label>
      <button className="btn sm" onClick={saveNight} disabled={!draft.date}>{L('Kaydet','Save')}</button>
      <div className="ng-help">{L('Aynı sabaha ikinci kez girilen veri öncekinin üzerine yazılır.','A second entry for the same morning replaces the first.')}</div>
    </div>}
    <div className="sl-tiles">
      <div className="sl-t"><div className="k">{L('Toplam Uyku','Total Sleep')}</div><div className="v">{fmtSleep(lastMin)}</div>
        <div className="s">{last?`${fd(last.date)}${wkAvg!=null?L(` · 7g ort. ${fmtSleep(wkAvg)}`,` · 7d avg ${fmtSleep(wkAvg)}`):''}`:L('kayıt yok','no entry')}</div></div>
      <div className="sl-t"><div className="k">{L('Uykuya Dalış','Fell Asleep')}</div><div className="v">{last?last.bedTime:'—'}</div><div className="s">{last?L('gece','night'):'—'}</div></div>
      <div className="sl-t"><div className="k">{L('Uyanma','Woke Up')}</div><div className="v">{last?last.wakeTime:'—'}</div><div className="s">{last?fd(last.date):'—'}</div></div>
    </div>
    <div className="sl-bars"><div className="k">{L('Son 14 gece · uyku süresi','Last 14 nights · sleep duration')}</div>
      <WlSpark vals={sleepBars.map(v=>v==null?null:v/60)} color="#0ea5e9" bars h={40}/></div>
    <div className="hrv-hd">
      <div><div className="hrv-t">HRV Monitoring</div><div className="hrv-st">{L('Kalp Atış Hızı Değişkenliği · RMSSD','Heart Rate Variability · RMSSD')}</div></div>
      <select value={days} onChange={e=>setDays(Number(e.target.value))} aria-label={L('Dönem','Period')}>
        {HRV_PERIODS.map(p=><option key={p} value={p}>{L(`Son ${p} Gün`,`Last ${p} Days`)}</option>)}</select>
    </div>
    <div className="hrv-cards">{cards.map(c=><div key={c.k} className="hrv-c" style={{'--hc':c.c}}>
      <div className="k">{c.k}</div><div className="v" style={c.vc?{color:c.vc}:undefined}>{c.v}{c.u&&<small>{c.u}</small>}</div><div className="s">{c.sub}</div>
    </div>)}</div>
    <HrvChart M={M} end={end} days={days}/>
    <div className="hrv-leg">
      <span><i className="l day"/>{L('Günlük HRV','Daily HRV')}</span>
      <span><i className="l wk"/>{L('7 Günlük Ortalama','7-Day Mean')}</span>
      <span><i className="l base"/>{L('28 Günlük Referans','28-Day Reference')}</span>
      <span><i className="b"/>{L('Kişisel Değişim Aralığı','Personal Range')}</span>
    </div>
    <div className="hrv-as" style={{'--hc':A.a.c}}>
      <div className="hrv-as-h">{L('Otomatik Değerlendirme','Automatic Assessment')}<span style={{color:A.a.c}}>{L(A.a.tr,A.a.en)}</span></div>
      <div className="hrv-as-m">{L(A.a.mTr,A.a.mEn)}</div>
      {A.combined.map(c=><div key={c} className="hrv-as-c">{L(HRV_COMBINED[c].tr,HRV_COMBINED[c].en)}</div>)}
      <div className="hrv-as-rows">
        {row(L('HRV Eğilimi','HRV Trend'),A.trend&&trendTxt[A.trend])}
        {row(L('Referans Durumu','Reference Status'),A.ref&&refTxt[A.ref])}
        {row(L('İnceleme Önceliği','Review Priority'),A.prio&&prioTxt[A.prio])}
      </div>
      <div className="hrv-as-n">{L('HRV tek başına tanı koymaz ve yükü otomatik değiştirmez; eşikler kişisel ve klinik olarak doğrulanmamıştır — antrenörün değerlendirmesiyle okunur.','HRV is not diagnostic and changes no load by itself; the thresholds are personal and not clinically validated — read them with the coach’s review.')}</div>
    </div>
    <div className="row" style={{justifyContent:'space-between',marginTop:12,marginBottom:listOpen?8:0}}>
      <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Gece kayıtları','Night records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({log.length})</span></strong>
      <button className="btn sec sm" onClick={()=>setListOpen(o=>!o)} disabled={!log.length}>{listOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
    </div>
    {listOpen&&log.length>0&&<div style={{overflowX:'auto'}}><table className="ng-tbl"><thead><tr>
      <th>{L('Sabah','Morning')}</th><th>{L('Dalış','Asleep')}</th><th>{L('Uyanma','Woke')}</th><th>{L('Süre','Duration')}</th><th>HRV</th><th>{L('Nabız','HR')}</th><th/>
    </tr></thead><tbody>
      {log.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,60).map(n=><tr key={n.id||n.date}>
        <td><input type="date" value={n.date||''} onChange={e=>upd(n.id,'date',e.target.value)} style={{width:128}}/></td>
        <td><input type="time" value={n.bedTime||''} onChange={e=>upd(n.id,'bedTime',e.target.value)}/></td>
        <td><input type="time" value={n.wakeTime||''} onChange={e=>upd(n.id,'wakeTime',e.target.value)}/></td>
        <td className="ng-dur">{fmtSleep(nightSleepMin(n))}</td>
        <td><input type="number" step="0.1" value={n.hrv??''} onChange={e=>upd(n.id,'hrv',e.target.value)} style={{width:64}}/></td>
        <td><input type="number" value={n.sleepHR??''} onChange={e=>upd(n.id,'sleepHR',e.target.value)} style={{width:58}}/></td>
        <td><button className="btn xs danger" onClick={()=>del(n.id)}>✕</button></td>
      </tr>)}
    </tbody></table></div>}
  </div>);
}
/* ---- What HRV is read beside: sleeping HR, sleep, wellness and sRPE load ---- */
function HrvContext({ath,M,days}){
  const end=M.end;
  const keys=Array.from({length:days},(_,i)=>M.shift(end,i-days+1));
  const lastOf=arr=>{for(let i=arr.length-1;i>=0;i--)if(arr[i]!=null)return arr[i];return null;};
  const hr=keys.map(M.shr),sl=keys.map(k=>{const n=M.nights[k];const m=n?nightSleepMin(n):null;return m==null?null:m/60;}),
    wl=keys.map(M.wv),ld=keys.map(k=>athDayLoad(ath,k)||null);
  const sh=M.shrAt(end),ww=M.wlAt(end);
  const lastHr=lastOf(hr),lastSl=lastOf(sl),lastWl=lastOf(wl);
  const acwr=athACWR(ath,end);const l7=athLoadSum(ath,M.shift(end,-6),end);
  const wlWord=v=>v==null?['—','var(--dim)']:ww.warn?[L('Düşük','Low'),'#ef4444']:v>=4?[L('İyi','Good'),'#22c55e']:v>=3?[L('Orta','Moderate'),'#f59e0b']:[L('Düşük','Low'),'#ef4444'];
  const ldWord=!l7?['—','var(--dim)']:acwr>1.3?[L('Yüksek','High'),'#ef4444']:acwr>=0.8?[L('Normal','Normal'),'#22c55e']:[L('Düşük','Low'),'#0ea5e9'];
  const cards=[
    {k:L('Uyku Nabzı','Sleeping HR'),v:lastHr!=null?`${Math.round(lastHr)} bpm`:'—',c:'#ef4444',
      sub:lastHr==null?L('kayıt yok','no entry'):!sh.ref?L('referans için veri az','too little data for a reference'):sh.warn?L('Normalden yüksek','Above normal'):L('Normal aralıkta','Within normal'),
      subC:sh.warn?'var(--high-t)':'var(--muted)',spark:<WlSpark vals={hr} color="#ef4444" h={42}/>},
    {k:L('Uyku Süresi','Sleep Duration'),v:lastSl!=null?fmtSleep(Math.round(lastSl*60)):'—',c:'#0ea5e9',
      sub:L(`son ${days} gün`,`last ${days} days`),subC:'var(--muted)',spark:<WlSpark vals={sl} color="#0ea5e9" bars h={42}/>},
    {k:'Wellness',v:wlWord(lastWl)[0],vc:wlWord(lastWl)[1],c:'#f59e0b',
      sub:lastWl!=null?L(`hazır oluş ${lastWl.toFixed(1)}/5${ww.warn?' · referansın altında':''}`,`readiness ${lastWl.toFixed(1)}/5${ww.warn?' · below reference':''}`):L('kayıt yok','no entry'),
      subC:ww.warn?'var(--high-t)':'var(--muted)',spark:<WlSpark vals={wl} color="#f59e0b" h={42}/>},
    {k:L('sRPE Yükü','sRPE Load'),v:ldWord[0],vc:ldWord[1],c:'#a855f7',
      sub:l7?L(`7g ${l7.toLocaleString('tr-TR')} AU · ACWR ${acwr?acwr.toFixed(2):'—'}`,`7d ${l7.toLocaleString('en-US')} AU · ACWR ${acwr?acwr.toFixed(2):'—'}`):L('yük kaydı yok','no load logged'),
      subC:'var(--muted)',spark:<WlSpark vals={ld} color="#a855f7" h={42}/>},
  ];
  return(<div className="hrv-ctx">{cards.map(c=><div key={c.k} className="hrv-cx" style={{'--hc':c.c}}>
    <div className="hrv-cx-t"><div className="k">{c.k}</div><div className="v" style={c.vc?{color:c.vc}:undefined}>{c.v}</div><div className="s" style={{color:c.subC}}>{c.sub}</div></div>
    <div className="hrv-cx-g">{c.spark}</div>
  </div>)}</div>);
}
function AthWellness({ath,updAth}){
  const[days,setDays]=useState(28);
  const M=useMemo(()=>hrvModel(ath),[ath.nightLog,ath.wellness]);
  return(<div className="wl2">
    <div className="wl2-grid">
      <WellnessLog ath={ath} updAth={updAth}/>
      <AthSleepHrv ath={ath} updAth={updAth} M={M} days={days} setDays={setDays}/>
    </div>
    <div className="hrv-ctx-h">{L('Toparlanma göstergeleri','Recovery indicators')}<span>{L(`HRV ile birlikte okunur · son ${days} gün`,`read with HRV · last ${days} days`)}</span></div>
    <HrvContext ath={ath} M={M} days={days}/>
  </div>);
}
