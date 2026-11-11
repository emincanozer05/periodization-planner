/* =========================================================
   TAKIM VERİLERİ — Test ve Değerlendirme'deki "Takım Verileri" düğmesinin açtığı ekran
   ---------------------------------------------------------
   Sporcuların test kayıtlarından takımın gelişimini okur. Yukarıdan aşağı, genelden özele:
     1) Başlık bandı — dört gösterge: gelişen ölçümlerin oranı (ilk → son test, bütün
        testler), en güçlü alan, gelişim alanı (en zayıf kategori), en çok gelişen sporcu.
     2) Kategori kartları — Antropometri, Mobilite, Güç, Sürat, Kuvvet, Dayanıklılık: her
        birinde gelişen / aynı / gerileyen karşılaştırmaların payı (Antropometride ölçülen
        sporcu sayısı). Kart aynı zamanda sekme: haritayı o kategoriye çevirir.
     3) Gelişim haritası — seçili kategoride sporcu × test tablosu: hücre, sporcunun ilk ve
        son testi arasındaki % değişim (yön düzeltilmiş: sprint süresinin düşmesi gelişmedir);
        yeşil gelişme, kırmızı gerileme, ton büyüklük. Sütun başlığı o testi seçer.
     4) Test odağı — seçili test: dört özet kutusu, sporcu sporcu "ilk → son test" sırası
        (ortak eksende iki nokta ve aradaki çubuk; takım ortalaması dikey çizgi), takımın
        test dönemlerine göre eğrisi ve — sağ/sol ya da ara süreleri olan testte — parça
        parça ayrıntı grafiği ile son test ayrıntı tablosu.
   Testler arası toplamlarda % ortalaması değil GELİŞEN ORANI kullanılır: 3 üzerinden
   puanlanan bir test (2 → 3 = +%50) ya da sıfıra yakın bir fark ölçüsü yüzdeleri
   ortalamada şişirir; "kaç karşılaştırmada gelişti" her testte aynı anlama gelir.

   Test listesi test kataloğundan okunur (tdItems): katalogda GÜNCEL olan her test, ölçümü
   olsun olmasın, listede TEK satırdır. Sağ / sol / fark ya da 0-5 / 0-10 / 0-20 m gibi
   parçaları ayrı satır olmaz; testin ana değeri (TD_SPEC) haritaya ve sıralamaya girer,
   parçalar odaktaki ayrıntı grafiğinde ve tablosunda görünür. Kataloğa yeni test eklenip
   CMP_METRICS'e metriği yazılınca burada kendiliğinden görünür; emekliye ayrılan test
   (eski ASLR, OHS, tek parça FMS) çıkar. FMS skorları bu ekrana hiç alınmaz.
   Antropometri (boy, kilo, kulaç…) her ölçüsüyle ayrı satırdır; "daha iyi" yönü olmadığı
   için değişimi nötr gösterilir ve gelişim toplamlarına (başlık, kategori kartları) girmez. */
const tdVal=(m,t)=>{try{const v=m.get(t);return v==null||!isFinite(v)?null:v;}catch(e){return null;}};
const tdAvg2=(a,b)=>a!=null&&b!=null?+((a+b)/2).toFixed(2):null;
/* Parçalı testlerin tek satırı: ana değer ve ayrıntıya düşen parçalar.
   both: ana değer iki tarafın ortalaması · main: ana değer o metrik · get: kendi hesabı.
   parts verilmezse testin öbür metrikleri (CMP_METRICS sırasıyla) parça olur. */
const TD_SPEC={
  ankleDF:{tr:'Ayak Bileği DF',en:'Ankle DF',st:'ADF',se:'ADF',both:['adfR','adfL']},
  hipRot:{tr:'Kalça IR/ER',en:'Hip IR/ER',st:'Kalça IR/ER',se:'Hip IR/ER',u:'°',dir:'hi',
    get:t=>{const h=hipRotCalc(t);return tdAvg2(h.totR,h.totL);},
    note:['toplam rotasyon (IR+ER), sağ-sol ortalaması','total rotation (IR+ER), mean of right and left']},
  tSpine:{tr:'T-Spine Rotasyon',en:'T-Spine Rotation',st:'TSR',se:'TSR',both:['tspR','tspL']},
  yBalance:{tr:'Y Balance',en:'Y Balance',st:'YBT',se:'YBT',both:['ybR','ybL']},
  lateralCmj:{tr:'Lateral CMJ',en:'Lateral CMJ',st:'LCMJ',se:'LCMJ',both:['lcjR','lcjL']},
  sprint:{tr:'20m Sprint',en:'20m Sprint',st:'20m',se:'20m',main:'sp20',
    parts:[['acc5','0-5 m'],['acc10','0-10 m'],['sp20','0-20 m']],note:['0-20 m süresi','0-20 m time']},
  accel:{tr:'5-10m İvmelenme',en:'5-10m Acceleration',st:'5-10m',se:'5-10m',main:'acc10',
    parts:[['acc5','0-5 m'],['acc10','0-10 m']],note:['0-10 m süresi','0-10 m time']},
  fiveZeroFive:{tr:'505 COD',en:'505 COD',st:'505',se:'505',main:'f505',note:['iyi taraf','better side']},
  curvedRun:{tr:'Curved Run',en:'Curved Run',st:'Curved',se:'Curved',main:'crun',note:['iyi taraf','better side']},
  copenhagen:{tr:'Copenhagen',en:'Copenhagen',st:'CPH',se:'CPH',both:['cphR','cphL']},
  sidePlank:{tr:'Side Plank',en:'Side Plank',st:'SPK',se:'SPK',both:['spkR','spkL']},
};
/* Ekranın test listesi: katalogda güncel her test bir satır (Antropometri her ölçüsüyle). */
function tdItems(){
  const live=new Set(TEST_CATALOG.filter(c=>!c.retired&&!/^fms/.test(c.id)).map(c=>c.id));
  const byId=new Map(CMP_METRICS.map(m=>[m.id,m]));
  const order=[],of=new Map();
  CMP_METRICS.filter(m=>(m.dir||m.g==='anthro')&&live.has(CMP_METRIC_TEST[m.id])).forEach(m=>{
    const k=m.g==='anthro'?'anthro:'+m.id:CMP_METRIC_TEST[m.id];
    if(!of.has(k)){of.set(k,[]);order.push(k);}of.get(k).push(m);});
  return order.map(k=>{
    const own=of.get(k),first=own[0],test=CMP_METRIC_TEST[first.id];
    const sp=k===test?(TD_SPEC[test]||{}):{},c=TEST_CATALOG.find(x=>x.id===test)||{};
    const solo=own.length===1&&!sp.parts;
    const base={id:'t_'+(solo&&first.g==='anthro'?first.id:test),test,g:first.g,
      tr:sp.tr||(solo?first.tr:c.name),en:sp.en||(solo?first.en:c.name),
      st:sp.st||(solo?first.st:c.short),se:sp.se||(solo?first.se:c.short)};
    if(solo)return{...base,u:first.u,dir:first.dir,get:first.get,parts:[],note:null};
    let main,mainId=null;
    if(sp.both){const a=byId.get(sp.both[0]),b=byId.get(sp.both[1]);
      main={u:a.u,dir:a.dir,get:t=>tdAvg2(tdVal(a,t),tdVal(b,t))};}
    else if(sp.get)main={u:sp.u,dir:sp.dir,get:sp.get};
    else{const m=byId.get(sp.main)||first;mainId=m.id;main={u:m.u,dir:m.dir,get:m.get};}
    const parts=sp.parts?sp.parts.map(([id,lbl])=>({m:byId.get(id),tr:lbl,en:lbl})).filter(p=>p.m)
      :own.filter(m=>m.id!==mainId).map(m=>({m,tr:m.st||m.tr,en:m.se||m.en}));
    return{...base,...main,parts,note:sp.both?['sağ-sol ortalaması','mean of right and left']:(sp.note||null)};
  });
}
/* Bir sporcunun bu testteki tarihli değerleri, eskiden yeniye (parçalar için kaydın kendisiyle). */
function tdSeries(ath,m){
  return(ath.tests||[]).filter(t=>t.date).map(t=>({d:t.date,v:tdVal(m,t),t})).filter(x=>x.v!=null)
    .sort((a,b)=>a.d.localeCompare(b.d));
}
/* İlk → son % değişim, yön düzeltilmiş: pozitif her zaman gelişme (yönsüz ölçüde artış). */
function tdGain(s,dir){
  if(s.length<2)return null;
  const a=s[0].v,b=s[s.length-1].v;
  if(!a)return null;
  const pct=(b-a)/Math.abs(a)*100;
  return+(dir==='lo'?-pct:pct).toFixed(1);
}
/* Süre ve hız iki ondalıkla (3,25 sn ile 3,31 sn aynı sayı görünmesin), gerisi tablodaki gibi. */
const tdFmt=(m,v)=>v==null?'—':(m&&(m.u==='s'||m.u==='m/s'))?Number(v).toFixed(2):cmpFmt(v);
const tdPct=g=>g==null?'—':g===0?'0%':(g>0?'+':'−')+(Math.abs(g)>=100?Math.round(Math.abs(g)):+Math.abs(g).toFixed(1))+'%';
/* Hücrenin tonu: işaret + büyüklük basamağı (±2 ve ±5). Yönsüz ölçü nötr kalır. */
const tdTier=g=>g==null?'':g===0?'z':(g>0?'p':'n')+(Math.abs(g)<2?1:Math.abs(g)<5?2:3);
const tdTierOf=(m,g)=>m.dir?tdTier(g):(g==null?'':'x');
/* Gelişen / aynı / gerileyen payı tek yatay çubukta. */
function TdSplit({up,same,dn}){
  const t=up+same+dn;
  return(<span className="td-split" aria-hidden="true">{t>0&&<>
    {up>0&&<i className="td-s-up" style={{flexGrow:up}}/>}{same>0&&<i className="td-s-same" style={{flexGrow:same}}/>}{dn>0&&<i className="td-s-dn" style={{flexGrow:dn}}/>}</>}</span>);
}
function TeamData({athletes,setup,Lx}){
  const theme=useAppTheme();
  const roster=useMemo(()=>[...athletes].sort(byAthleteName),[athletes]);
  /* Bütün model tek yerde: her testte her sporcunun serisi, ilk/son değeri ve gelişimi.
     cnt: gelişim toplamlarına giren test (yönü belli, antropometri değil). */
  const model=useMemo(()=>{
    const M=tdItems().map(m=>{
      const per=roster.map(a=>{const s=tdSeries(a,m);return{a,s,g:tdGain(s,m.dir),first:s[0]||null,last:s[s.length-1]||null};}).filter(r=>r.s.length);
      const gs=per.filter(r=>r.g!=null);
      return{m,per,by:new Map(per.map(r=>[r.a.id,r])),n:per.length,cmp:gs.length,up:gs.filter(r=>r.g>0).length,dn:gs.filter(r=>r.g<0).length,
        avg:gs.length?+(gs.reduce((x,r)=>x+r.g,0)/gs.length).toFixed(1):null,cnt:!!m.dir&&m.g!=='anthro'};
    });
    const sum=(xs,k)=>xs.reduce((t,x)=>t+x[k],0);
    const cats=CMP_GROUPS.map(g=>{const ms=M.filter(x=>x.m.g===g.id),sc=ms.filter(x=>x.cnt);
      const cmp=sum(sc,'cmp'),up=sum(sc,'up'),dn=sum(sc,'dn');
      const who=new Set(ms.flatMap(x=>x.per.map(r=>r.a.id)));
      return{g,ms,cmp,up,dn,same:cmp-up-dn,pct:cmp?Math.round(up/cmp*100):null,n:sum(ms,'n'),ath:who.size,scored:g.id!=='anthro'};}).filter(c=>c.ms.length);
    const S=M.filter(x=>x.cnt);
    const ath=roster.map(a=>{let cmp=0,up=0;S.forEach(x=>{const r=x.by.get(a.id);if(r&&r.g!=null){cmp++;if(r.g>0)up++;}});return{a,cmp,up};});
    const cmp=sum(S,'cmp'),up=sum(S,'up'),dn=sum(S,'dn');
    const dates=roster.flatMap(a=>(a.tests||[]).filter(t=>t.date).map(t=>t.date)).sort();
    return{M,cats,ath,cmp,up,dn,same:cmp-up-dn,dates,any:M.some(x=>x.n>0),
      multi:roster.filter(a=>(a.tests||[]).filter(t=>t.date).length>1).length};
  },[roster]);

  const[catId,setCatId]=useState(null);
  const[mid,setMid]=useState(null);
  const[focus,setFocus]=useState(null);
  const[sort,setSort]=useState('level');
  /* Varsayılanlar: en çok karşılaştırması (yoksa en çok ölçümü) olan kategori ve test. */
  const pick=xs=>xs.reduce((b,x)=>!b||x.cmp>b.cmp||(x.cmp===b.cmp&&x.n>b.n)?x:b,null);
  const scoredCats=model.cats.filter(c=>c.scored&&c.n);
  const cat=model.cats.find(c=>c.g.id===catId)||pick(scoredCats.length?scoredCats:model.cats);
  const X=(cat&&cat.ms.find(x=>x.m.id===mid))||(cat&&pick(cat.ms))||null;
  const m=X&&X.m;
  const pickMetric=id=>{const x=model.M.find(y=>y.m.id===id);if(!x)return;setCatId(x.m.g);setMid(id);};
  const catLbl=g=>Lx(g.tr,g.en);
  const unit=m&&m.u?` ${m.u}`:'';
  const monLbl=mo=>{const[y,mm]=mo.split('-');return`${MN[Number(mm)-1]} ${y.slice(2)}`;};
  const toggleFocus=id=>setFocus(f=>f===id?null:id);
  const pLbl=p=>Lx(p.tr,p.en);
  const pUnit=p=>p.m.u?` ${p.m.u}`:'';

  /* Başlık göstergeleri. */
  const rated=model.cats.filter(c=>c.cmp>0);
  const bestCat=rated.length?rated.reduce((b,c)=>c.pct>b.pct?c:b):null;
  const weakCat=rated.length>1?rated.reduce((b,c)=>c.pct<b.pct?c:b):null;
  const minCmp=Math.min(3,Math.max(1,...model.ath.map(x=>x.cmp)));
  const topAth=model.ath.filter(x=>x.cmp>=minCmp&&x.up>0).sort((x,y)=>(y.up/y.cmp-x.up/x.cmp)||(y.up-x.up))[0]||null;
  const allPct=model.cmp?Math.round(model.up/model.cmp*100):null;
  const span=model.dates.length?(()=>{const a=model.dates[0].slice(0,7),b=model.dates[model.dates.length-1].slice(0,7);return a===b?monLbl(a):`${monLbl(a)} → ${monLbl(b)}`;})():'';
  const nTests=model.dates.length;

  /* Seçili testin görünümü: sıra, eksen, dönem eğrisi, parçalar. */
  const view=useMemo(()=>{
    if(!X||!X.n)return null;
    const lo=m.dir==='lo';
    const better=(a,b)=>lo?a-b:b-a;
    const rows=[...X.per].sort((x,y)=>sort==='gain'
      ?((y.g==null?-1e9:y.g)-(x.g==null?-1e9:x.g))||better(x.last.v,y.last.v)
      :better(x.last.v,y.last.v)||(x.a.name||'').localeCompare(y.a.name||'','tr'));
    const all=X.per.flatMap(r=>[r.first.v,r.last.v]);
    let a=Math.min(...all),b=Math.max(...all);if(a===b){a-=1;b+=1;}
    const pad=(b-a)*.07;a-=pad;b+=pad;
    const pos=v=>(v-a)/(b-a)*100;
    const lastAvg=X.per.reduce((t,r)=>t+r.last.v,0)/X.per.length;
    const best=X.per.reduce((t,r)=>better(r.last.v,t.last.v)<0?r:t);
    const months=[...new Set(X.per.flatMap(r=>r.s.map(x=>x.d.slice(0,7))))].sort();
    /* Bir sporcunun o dönemdeki kaydı: o ayın son testi. */
    const entry=(r,mo)=>{const h=r.s.filter(x=>x.d.slice(0,7)===mo);return h.length?h[h.length-1]:null;};
    const at=(r,mo)=>{const e=entry(r,mo);return e?e.v:null;};
    const parts=m.parts||[];
    const mean=v=>v.length?+(v.reduce((t,x)=>t+x,0)/v.length).toFixed(2):null;
    const per=months.map(mo=>{const es=X.per.map(r=>entry(r,mo)).filter(Boolean),v=es.map(e=>e.v);
      return{mo,n:v.length,avg:mean(v),min:v.length?Math.min(...v):null,max:v.length?Math.max(...v):null,
        p:parts.map(p=>mean(es.map(e=>tdVal(p.m,e.t)).filter(x=>x!=null)))};});
    /* Ayrıntı grafiğine aynı birim ve yöndeki parçalar girer (fark/asimetri tabloda kalır). */
    const draw=parts.map((p,i)=>({p,i})).filter(({p})=>p.m.u===m.u&&p.m.dir===m.dir);
    const partAt=(r,mo,i)=>{const e=entry(r,mo);return e?tdVal(parts[i].m,e.t):null;};
    return{rows,pos,lo:a,hi:b,lastAvg,best,months,per,at,parts,draw,partAt};
  },[X,sort]);

  const dark=theme!=='light';
  const grid=dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)',tick=dark?'rgba(255,255,255,.6)':'#5d6570';
  const AVG=dark?'#3aa0e6':'#1a8ad4',FOC=dark?'#f0a35e':'#c2570c';
  const PAL=dark?['#3aa0e6','#f0a35e','#5bc58a','#c084fc']:['#1a8ad4','#c2570c','#2f9a5e','#8b5cf6'];
  const ptBorder=dark?'#232323':'#fff';
  const fr=view&&focus?X.by.get(focus):null;
  const multi=!!view&&view.draw.length>0;
  const trend=!!view&&view.months.length>=2;
  const lastPer=view&&view.per[view.per.length-1];
  /* Büyüklükleri çok farklı parçalar (0-5 m ile 0-20 m süresi) tek eksende düz çizgi olur:
     o zaman her parça kendi küçük grafiğinde çizilir. */
  const split=multi&&trend&&(()=>{const v=view.per.flatMap(x=>view.draw.map(({i})=>x.p[i])).filter(x=>x!=null&&x>0);
    return v.length>1&&Math.max(...v)/Math.min(...v)>1.6;})();
  const miniChart=({p,i},k)=>({type:'line',data:{labels:view.months.map(monLbl),datasets:[
    {label:Lx('Takım ortalaması','Team average'),data:view.per.map(x=>x.p[i]),borderColor:PAL[k%PAL.length],borderWidth:2.5,pointRadius:3.5,pointHoverRadius:5,
      pointBackgroundColor:PAL[k%PAL.length],pointBorderColor:ptBorder,pointBorderWidth:2,tension:.3,spanGaps:true,fill:false},
    ...(fr?[{label:fr.a.name||'—',data:view.months.map(mo=>view.partAt(fr,mo,i)),borderColor:PAL[k%PAL.length],borderWidth:2,borderDash:[5,4],
      pointRadius:3,pointHoverRadius:5,pointBackgroundColor:PAL[k%PAL.length],tension:.3,spanGaps:true,fill:false}]:[])]}});
  const chart=!view?null:!multi?(trend?{type:'line',data:{labels:view.months.map(monLbl),datasets:[
      {label:Lx('En yüksek','Highest'),data:view.per.map(p=>p.max),borderWidth:0,pointRadius:0,pointHoverRadius:0,fill:'+1',
        backgroundColor:dark?'rgba(58,160,230,.13)':'rgba(26,138,212,.12)',tension:.3,spanGaps:true,order:3},
      {label:Lx('En düşük','Lowest'),data:view.per.map(p=>p.min),borderWidth:0,pointRadius:0,pointHoverRadius:0,fill:false,tension:.3,spanGaps:true,order:3},
      {label:Lx('Takım ortalaması','Team average'),data:view.per.map(p=>p.avg),borderColor:AVG,borderWidth:2.5,pointRadius:4.5,pointHoverRadius:6,
        pointBackgroundColor:AVG,pointBorderColor:ptBorder,pointBorderWidth:2,tension:.3,spanGaps:true,fill:false,order:1,
        datalabels:{display:!fr,align:'top',offset:6,color:dark?'#f2f2f2':'#14181d',font:{weight:'700',size:11},formatter:v=>v==null?'':tdFmt(m,v)}},
      ...(fr?[{label:fr.a.name||'—',data:view.months.map(mo=>view.at(fr,mo)),borderColor:FOC,borderWidth:2,pointRadius:4,pointHoverRadius:6,
        pointBackgroundColor:FOC,pointBorderColor:ptBorder,pointBorderWidth:2,tension:.3,spanGaps:true,fill:false,order:0}]:[])]}}:null)
    :trend?{type:'line',data:{labels:view.months.map(monLbl),datasets:[
      ...view.draw.map(({p,i},k)=>({label:`${Lx('Takım ort.','Team avg')} · ${pLbl(p)}`,data:view.per.map(x=>x.p[i]),borderColor:PAL[k%PAL.length],borderWidth:2.5,
        pointRadius:4,pointHoverRadius:6,pointBackgroundColor:PAL[k%PAL.length],pointBorderColor:ptBorder,pointBorderWidth:2,tension:.3,spanGaps:true,fill:false})),
      ...(fr?view.draw.map(({p,i},k)=>({label:`${fr.a.name||'—'} · ${pLbl(p)}`,data:view.months.map(mo=>view.partAt(fr,mo,i)),borderColor:PAL[k%PAL.length],
        borderWidth:2,borderDash:[5,4],pointRadius:3,pointHoverRadius:5,pointBackgroundColor:PAL[k%PAL.length],tension:.3,spanGaps:true,fill:false})):[])]}}
    :{type:'bar',data:{labels:view.draw.map(({p})=>pLbl(p)),datasets:[
      {label:Lx('Takım ortalaması','Team average'),data:view.draw.map(({i})=>lastPer.p[i]),backgroundColor:view.draw.map((_,k)=>PAL[k%PAL.length]),borderRadius:3,maxBarThickness:46,
        datalabels:{display:true,anchor:'end',align:'end',offset:2,color:dark?'#f2f2f2':'#14181d',font:{weight:'700',size:11},formatter:v=>v==null?'':tdFmt(m,v)}},
      ...(fr?[{label:fr.a.name||'—',data:view.draw.map(({i})=>view.partAt(fr,lastPer.mo,i)),backgroundColor:FOC,borderRadius:3,maxBarThickness:46,
        datalabels:{display:true,anchor:'end',align:'end',offset:2,color:FOC,font:{weight:'700',size:11},formatter:v=>v==null?'':tdFmt(m,v)}}]:[])]}};
  const chartOpts={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    animation:{duration:500,easing:'easeOutQuart'},layout:{padding:{top:18,right:8}},
    plugins:{legend:{display:false},datalabels:{display:false},
      tooltip:{callbacks:{label:c=>c.parsed.y==null?null:`${c.dataset.label}: ${tdFmt(m,c.parsed.y)}${unit}`,
        footer:it=>{if(!view||(multi&&!trend))return'';const p=it&&it[0]&&view.per[it[0].dataIndex];return p?`${p.n} ${Lx('sporcu','athletes')}`:'';}}}},
    scales:{x:{grid:{display:false},ticks:{color:tick}},
      y:{grace:'12%',grid:{color:grid},border:{display:false},ticks:{color:tick,maxTicksLimit:6},...(multi&&!trend?{beginAtZero:true}:{})}}};

  if(!model.any)return(<div className="td-wrap">
    <div className="empty-st">{Lx('Grafik için tarihli test sonucu yok. Bir sporcuya test girince burada görünür.','No dated test results to chart yet. They show here once tests are entered.')}</div>
  </div>);

  const heatRows=roster.filter(a=>cat.ms.some(x=>x.by.has(a.id)));
  const same=X.cmp-X.up-X.dn;
  const scored=!!m.dir;
  return(<div className="td-wrap">
    {/* 1 · Başlık bandı */}
    <div className="td-hero">
      <div className="td-hero-tx">
        <div className="td-eyebrow">{Lx('Takım Verileri','Team Data')} · {setup.teamName}</div>
        <div className="td-hero-t">{Lx('Takımın gelişimi, ilk testten son teste','How the squad developed, first test to latest')}</div>
        <div className="td-hero-s">{[span,Lx(`${nTests} test kaydı`,`${nTests} test records`),Lx(`${model.multi}/${roster.length} sporcunun 2+ testi var`,`${model.multi}/${roster.length} athletes with 2+ tests`)].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="td-kpis">
        <div className="td-kpi"><div className="td-kpi-l">{Lx('Gelişen ölçüm','Improved measures')}</div>
          <div className="td-kpi-v">{allPct==null?'—':<>{allPct}<small>%</small></>}</div>
          <TdSplit up={model.up} same={model.same} dn={model.dn}/>
          <div className="td-kpi-s">{model.cmp?Lx(`${model.up} gelişti · ${model.same} aynı · ${model.dn} geriledi`,`${model.up} up · ${model.same} same · ${model.dn} down`):Lx('ikinci test girilince hesaplanır','needs a second test')}</div></div>
        <div className="td-kpi"><div className="td-kpi-l">{Lx('En güçlü alan','Strongest area')}</div>
          <div className="td-kpi-v sm">{bestCat?catLbl(bestCat.g):'—'}</div>
          <div className="td-kpi-s">{bestCat?Lx(`%${bestCat.pct} gelişen · ${bestCat.up}/${bestCat.cmp} karşılaştırma`,`${bestCat.pct}% improved · ${bestCat.up}/${bestCat.cmp} comparisons`):'—'}</div></div>
        <div className="td-kpi"><div className="td-kpi-l">{Lx('Gelişim alanı','Area to develop')}</div>
          <div className="td-kpi-v sm">{weakCat&&weakCat!==bestCat?catLbl(weakCat.g):'—'}</div>
          <div className="td-kpi-s">{weakCat&&weakCat!==bestCat?Lx(`%${weakCat.pct} gelişen · ${weakCat.up}/${weakCat.cmp} karşılaştırma`,`${weakCat.pct}% improved · ${weakCat.up}/${weakCat.cmp} comparisons`):Lx('tek kategoride veri var','one category has data')}</div></div>
        <div className="td-kpi"><div className="td-kpi-l">{Lx('En çok gelişen','Most improved')}</div>
          <div className="td-kpi-v sm">{topAth?topAth.a.name:'—'}</div>
          <div className="td-kpi-s">{topAth?Lx(`${topAth.up}/${topAth.cmp} ölçümde gelişti`,`improved in ${topAth.up} of ${topAth.cmp} measures`):'—'}</div></div>
      </div>
    </div>

    {/* 2 · Kategori kartları (aynı zamanda haritanın sekmeleri) */}
    <div className="td-cats" role="tablist" aria-label={Lx('Test kategorileri','Test categories')}>
      {model.cats.map((c,i)=><button key={c.g.id} type="button" role="tab" aria-selected={c===cat} className={'td-cat'+(c===cat?' on':'')}
        style={{animationDelay:(i*50)+'ms'}} onClick={()=>{setCatId(c.g.id);setMid(null);}}>
        <span className="td-cat-n">{catLbl(c.g)}</span>
        {c.scored
          ?<span className="td-cat-v"><span>{c.pct==null?'—':<>{c.pct}<small>%</small></>}</span><em>{c.pct!=null?Lx('gelişen','improved'):c.n?Lx('ikinci test bekleniyor','awaiting a second test'):Lx('henüz ölçüm yok','no measurements yet')}</em></span>
          :<span className="td-cat-v"><span>{c.ath||'—'}</span><em>{c.ath?Lx('sporcu ölçüldü','athletes measured'):Lx('henüz ölçüm yok','no measurements yet')}</em></span>}
        <TdSplit up={c.up} same={c.same} dn={c.dn}/>
        <span className="td-cat-f">{c.scored?Lx(`${c.ms.length} test · ${c.cmp} karşılaştırma`,`${c.ms.length} tests · ${c.cmp} comparisons`):Lx(`${c.ms.length} ölçüm · yönü yok`,`${c.ms.length} measures · no direction`)}</span>
      </button>)}
    </div>

    {/* 3 · Gelişim haritası */}
    <div className="panel td-panel">
      <div className="td-hd">
        <div><h2>{Lx('Gelişim haritası','Development map')} · {catLbl(cat.g)}</h2>
          <p>{cat.scored
            ?Lx('Her hücre sporcunun ilk ve son testi arasındaki değişim; yön düzeltilmiş: artı her zaman gelişme. Sütun başlığına tıkla → test ayrıntısı.','Each cell is the change between the athlete\'s first and latest test, direction-corrected: plus is always improvement. Click a column header → test detail.')
            :Lx('Her hücre sporcunun ilk ve son ölçümü arasındaki değişim; bu ölçülerde "daha iyi" yönü yok, artış ya da azalış gelişim sayılmaz. Sütun başlığına tıkla → ölçü ayrıntısı.','Each cell is the change between the athlete\'s first and latest measurement; these measures have no better direction, so a rise or fall is not counted as improvement. Click a column header → measure detail.')}</p></div>
        <div className="td-leg" aria-hidden="true">
          <span>{Lx('geriledi','declined')}</span><i className="td-c n3"/><i className="td-c n2"/><i className="td-c n1"/><i className="td-c z"/><i className="td-c p1"/><i className="td-c p2"/><i className="td-c p3"/><span>{Lx('gelişti','improved')}</span>
          <span className="td-leg-1"><i className="td-c one"/>{Lx('tek test (son değer)','single test (latest value)')}</span>
        </div>
      </div>
      <div className="td-heat-w"><table className="td-heat" key={cat.g.id}>
        <thead><tr>
          <th className="td-h-ath">{Lx('Sporcu','Athlete')}</th>
          {cat.ms.map(x=><th key={x.m.id} className={x===X?'sel':''}>
            <button type="button" aria-pressed={x===X} title={`${cmpLabel(x.m)}${x.m.u?' · '+x.m.u:''} · ${x.m.dir==='lo'?Lx('düşük daha iyi','lower is better'):x.m.dir?Lx('yüksek daha iyi','higher is better'):Lx('yönü yok','no direction')}${x.n?'':' · '+Lx('veri yok','no data')}`}
              onClick={()=>setMid(x.m.id)}>{cmpShort(x.m)}</button></th>)}
          {cat.scored&&<th className="td-h-sum" title={Lx('Bu kategoride gelişen ölçüm / karşılaştırılabilen ölçüm','Improved measures / comparable measures in this category')}>{Lx('Gelişen','Improved')}</th>}
        </tr></thead>
        <tbody>{heatRows.length?heatRows.map(a=>{let cmp=0,up=0;
          const cells=cat.ms.map(x=>{const r=x.by.get(a.id);
            if(!r)return<td key={x.m.id} className={'td-c none'+(x===X?' sel':'')}>·</td>;
            if(r.g==null)return<td key={x.m.id} className={'td-c one'+(x===X?' sel':'')}
              title={`${cmpLabel(x.m)} · ${fd(r.last.d)}: ${tdFmt(x.m,r.last.v)}${x.m.u?' '+x.m.u:''}`}>{tdFmt(x.m,r.last.v)}</td>;
            if(x.cnt){cmp++;if(r.g>0)up++;}
            return<td key={x.m.id} className={'td-c '+tdTierOf(x.m,r.g)+(x===X?' sel':'')}
              title={`${cmpLabel(x.m)}\n${fd(r.first.d)}: ${tdFmt(x.m,r.first.v)} → ${fd(r.last.d)}: ${tdFmt(x.m,r.last.v)}${x.m.u?' '+x.m.u:''}`}>{tdPct(r.g)}</td>;});
          return<tr key={a.id} className={focus===a.id?'foc':''}>
            <th className="td-h-ath"><button type="button" aria-pressed={focus===a.id} onClick={()=>toggleFocus(a.id)}
              title={Lx('Test odağında öne çıkar','Highlight in the test focus')}>{a.name||'—'}</button></th>
            {cells}
            {cat.scored&&<td className="td-h-sum">{cmp?<><b>{up}</b>/{cmp}</>:'—'}</td>}</tr>;})
          :<tr><td className="td-f" colSpan={cat.ms.length+(cat.scored?2:1)}>{Lx('Bu kategoride henüz ölçüm yok.','No measurements in this category yet.')}</td></tr>}</tbody>
        {heatRows.length>0&&<tfoot>
          <tr><th className="td-h-ath">{Lx('Takım ort. değişim','Team avg. change')}</th>
            {cat.ms.map(x=><td key={x.m.id} className={'td-c '+tdTierOf(x.m,x.avg)+(x===X?' sel':'')}>{tdPct(x.avg)}</td>)}{cat.scored&&<td className="td-h-sum"/>}</tr>
          {cat.scored
            ?<tr><th className="td-h-ath">{Lx('Gelişen sporcu','Athletes improving')}</th>
              {cat.ms.map(x=><td key={x.m.id} className={'td-f'+(x===X?' sel':'')}>{x.cmp?<><b>{x.up}</b>/{x.cmp}</>:'—'}</td>)}
              <td className="td-h-sum">{cat.cmp?<><b>{cat.up}</b>/{cat.cmp}</>:'—'}</td></tr>
            :<tr><th className="td-h-ath">{Lx('Ölçülen sporcu','Athletes measured')}</th>
              {cat.ms.map(x=><td key={x.m.id} className={'td-f'+(x===X?' sel':'')}>{x.n?<b>{x.n}</b>:'—'}</td>)}</tr>}
        </tfoot>}
      </table></div>
    </div>

    {/* 4 · Test odağı */}
    <div className="panel td-panel" key={m.id}>
      <div className="td-hd">
        <div><h2>{Lx('Test odağı','Test focus')} · {cmpLabel(m)}{m.u&&<span className="td-u">{m.u}</span>}</h2>
          <p>{m.dir==='lo'?Lx('Düşük değer daha iyi.','Lower is better.'):m.dir?Lx('Yüksek değer daha iyi.','Higher is better.'):Lx('Yönü olmayan ölçü: artış ya da azalış gelişim sayılmaz.','No better direction: a rise or fall is not counted as improvement.')}
            {m.note&&<>{' '}{Lx(`Ana değer: ${m.note[0]}.`,`Main value: ${m.note[1]}.`)}</>}
            {' '}{X.n?Lx(`${X.n} sporcunun ölçümü var, ${X.cmp} sporcu ilk ve son testiyle karşılaştırılabiliyor.`,`${X.n} athletes measured, ${X.cmp} comparable across first and latest test.`):''}</p></div>
        <select className="td-sel" value={m.id} onChange={e=>pickMetric(e.target.value)} aria-label={Lx('Test seç','Pick a test')}>
          {model.cats.map(c=><optgroup key={c.g.id} label={catLbl(c.g)}>{c.ms.map(x=><option key={x.m.id} value={x.m.id}>{cmpLabel(x.m)}{x.n?'':' · '+Lx('veri yok','no data')}</option>)}</optgroup>)}
        </select>
      </div>
      {!view?<div className="td-empty">{Lx('Bu testte henüz ölçüm yok. Bir sporcuya bu test girilince burada görünür.','No measurements in this test yet. They show here once the test is entered for an athlete.')}</div>:<>
      <div className="td-stats">
        <div className="td-stat"><span>{Lx('Takım ortalaması · son test','Team average · latest test')}</span>
          <b>{tdFmt(m,view.lastAvg)}<small>{unit}</small></b><em>{Lx(`${X.n} sporcu`,`${X.n} athletes`)}</em></div>
        <div className="td-stat"><span>{Lx('Ortalama değişim','Average change')}</span>
          <b className={scored?(X.avg>0?'g-up':X.avg<0?'g-dn':''):''}>{tdPct(X.avg)}</b><em>{Lx(`ilk → son test · ${X.cmp} sporcu`,`first → latest · ${X.cmp} athletes`)}</em></div>
        <div className="td-stat"><span>{scored?Lx('Gelişen / gerileyen','Improved / declined'):Lx('Artan / azalan','Rose / fell')}</span>
          <b>{X.cmp?<>{X.up}<i> / </i>{X.dn}</>:'—'}</b>{scored&&<TdSplit up={X.up} same={same} dn={X.dn}/>}
          <em>{Lx(`${same} aynı · ${X.n-X.cmp} tek test`,`${same} same · ${X.n-X.cmp} single test`)}</em></div>
        <div className="td-stat"><span>{scored?Lx('En iyi değer','Best value'):Lx('En yüksek değer','Highest value')}</span>
          <b>{tdFmt(m,view.best.last.v)}<small>{unit}</small></b><em>{view.best.a.name||'—'}</em></div>
      </div>
      <div className="td-focus">
        <div className="td-db">
          <div className="td-sub">
            <h3>{Lx('Sporcu sıralaması · ilk → son test','Athlete ranking · first → latest test')}</h3>
            <div className="lb-seg">
              <button type="button" className={sort==='level'?'on':''} aria-pressed={sort==='level'} onClick={()=>setSort('level')}>{Lx('Son değere göre','By latest value')}</button>
              <button type="button" className={sort==='gain'?'on':''} aria-pressed={sort==='gain'} onClick={()=>setSort('gain')}>{scored?Lx('Gelişime göre','By change'):Lx('Değişime göre','By change')}</button>
            </div>
          </div>
          <div className="td-db-ax">
            <span/><div className="td-db-tr"><span className="td-ax-lo">{tdFmt(m,view.lo)}</span><span className="td-ax-hi">{tdFmt(m,view.hi)}</span>
              <span className="td-ax-avg" style={{left:view.pos(view.lastAvg)+'%'}}>{Lx('takım ort.','team avg')} {tdFmt(m,view.lastAvg)}</span></div>
            <span className="td-db-dir">{m.dir==='lo'?Lx('← daha iyi','← better'):m.dir?Lx('daha iyi →','better →'):''}</span>
          </div>
          <div className="td-db-rows">{view.rows.map((r,i)=>{const pf=view.pos(r.first.v),pl=view.pos(r.last.v);const one=r.s.length<2;
            const cls=r.g==null||!scored?'':r.g>0?' g-up':r.g<0?' g-dn':' g-same';
            return<button type="button" key={r.a.id} className={'td-db-r'+cls+(focus===r.a.id?' foc':'')} aria-pressed={focus===r.a.id} onClick={()=>toggleFocus(r.a.id)}
              style={{animationDelay:Math.min(i,20)*25+'ms'}}
              title={one?`${fd(r.last.d)}: ${tdFmt(m,r.last.v)}${unit}`:`${fd(r.first.d)}: ${tdFmt(m,r.first.v)} → ${fd(r.last.d)}: ${tdFmt(m,r.last.v)}${unit}`}>
              <span className="td-db-n"><i>{i+1}</i>{r.a.name||'—'}</span>
              <span className="td-db-tr">
                <i className="td-m-avg" style={{left:view.pos(view.lastAvg)+'%'}}/>
                {!one&&<i className="td-m-bar" style={{left:Math.min(pf,pl)+'%',width:Math.abs(pl-pf)+'%'}}/>}
                {!one&&<i className="td-m-d0" style={{left:pf+'%'}}/>}
                <i className="td-m-d1" style={{left:pl+'%'}}/>
              </span>
              <span className="td-db-v"><b>{tdFmt(m,r.last.v)}</b>{!one&&<small>{tdFmt(m,r.first.v)} →</small>}</span>
              <span className={'td-db-g'+cls}>{one?Lx('tek test','1 test'):tdPct(r.g)}</span>
            </button>;})}</div>
          <div className="td-db-leg"><span><i className="td-k-d0"/>{Lx('ilk test','first test')}</span><span><i className="td-k-d1"/>{Lx('son test','latest test')}</span>
            <span><i className="td-k-vln"/>{Lx('takım ort. (son test)','team avg (latest)')}</span><em>{Lx('satıra tıkla → sporcu grafikte öne çıkar','click a row → highlight the athlete on the chart')}</em></div>
          {view.parts.length>0&&<>
            <div className="td-sub td-sub-pt"><h3>{Lx('Ayrıntı · son test','Detail · latest test')}</h3></div>
            <div className="td-pt-w"><table className="td-per td-pt">
              <thead><tr><th>{Lx('Sporcu','Athlete')}</th><th>{cmpShort(m)}{unit}</th>{view.parts.map((p,i)=><th key={i}>{pLbl(p)}{pUnit(p)}</th>)}</tr></thead>
              <tbody>{view.rows.map(r=><tr key={r.a.id} className={focus===r.a.id?'foc':''}>
                <td>{r.a.name||'—'}</td><td><b>{tdFmt(m,r.last.v)}</b></td>
                {view.parts.map((p,i)=><td key={i}>{tdFmt(p.m,tdVal(p.m,r.last.t))}</td>)}</tr>)}</tbody>
            </table></div></>}
        </div>
        <div className="td-tr">
          <div className="td-sub"><h3>{multi?(trend?Lx('Ayrıntı grafiği · test dönemleri','Detail chart · test periods'):Lx('Ayrıntı grafiği · son test dönemi','Detail chart · latest test period')):Lx('Takım eğrisi · test dönemleri','Team curve · test periods')}</h3></div>
          {!chart
            ?<div className="td-empty">{Lx('Eğri için bu testte en az iki ayrı test dönemi gerekir.','The curve needs at least two test periods in this test.')}</div>
            :<>{split
              ?<div className="td-minis">{view.draw.map((d,k)=>{const c=miniChart(d,k);return<div key={k} className="td-mini">
                <div className="td-mini-t"><i className="td-k-ln" style={{background:PAL[k%PAL.length]}}/>{pLbl(d.p)}{d.p.m.u?` (${d.p.m.u})`:''}</div>
                <div className="td-chart sm"><ChartC type="line" chartData={c.data} options={chartOpts}/></div></div>;})}</div>
              :<div className="td-chart"><ChartC type={chart.type} chartData={chart.data} options={chartOpts}/></div>}
              <div className="td-tr-leg">{multi
                ?<>{!split&&view.draw.map(({p},k)=><span key={k}><i className="td-k-ln" style={{background:PAL[k%PAL.length]}}/>{pLbl(p)}</span>)}
                  {fr&&<span><i className={trend?'td-k-ln td-k-dash':'td-k-ln'} style={trend?null:{background:FOC}}/>{fr.a.name}</span>}
                  <em>{trend?Lx('düz çizgi takım ortalaması, kesikli seçili sporcu','solid: team average, dashed: selected athlete'):Lx('çubuk takım ortalaması','bars: team average')}</em></>
                :<><span><i className="td-k-ln" style={{background:AVG}}/>{Lx('takım ortalaması','team average')}</span>
                  <span><i className="td-k-band"/>{Lx('en düşük – en yüksek','lowest – highest')}</span>
                  {fr&&<span><i className="td-k-ln" style={{background:FOC}}/>{fr.a.name}</span>}</>}</div></>}
          <table className="td-per"><thead><tr><th>{Lx('Dönem','Period')}</th><th>{Lx('Sporcu','Athletes')}</th><th>{view.parts.length?cmpShort(m):Lx('Ort.','Avg')}</th>
            {view.parts.length?view.parts.map((p,i)=><th key={i}>{pLbl(p)}</th>):<><th>{Lx('En düşük','Lowest')}</th><th>{Lx('En yüksek','Highest')}</th></>}</tr></thead>
            <tbody>{view.per.map(p=><tr key={p.mo}><td>{monLbl(p.mo)}</td><td>{p.n}</td><td><b>{tdFmt(m,p.avg)}</b></td>
              {view.parts.length?view.parts.map((q,i)=><td key={i}>{tdFmt(q.m,p.p[i])}</td>):<><td>{tdFmt(m,p.min)}</td><td>{tdFmt(m,p.max)}</td></>}</tr>)}</tbody></table>
          <div className="td-note">{view.parts.length?Lx('Tablodaki değerler o dönemde ölçülen sporcuların ortalamasıdır. ','Table values are averages of the athletes measured in that period. '):''}{Lx('Dönem ortalaması o dönemde ölçülen sporcularla hesaplanır; sporcu sayısı dönemden döneme değişiyorsa ortalamalar birebir karşılaştırılamaz.','Each period average covers the athletes measured in that period; when the number of athletes differs, the averages are not directly comparable.')}</div>
        </div>
      </div></>}
    </div>
  </div>);
}
