/* =========================================================
   TAKIM VERİLERİ — Test ve Değerlendirme'deki "Takım Verileri" düğmesinin açtığı ekran
   ---------------------------------------------------------
   Sporcuların test kayıtlarından takımın gelişimini okur. Yukarıdan aşağı, genelden özele:
     1) Başlık bandı — dört gösterge: gelişen ölçümlerin oranı (ilk → son test, bütün
        metrikler), en güçlü alan, gelişim alanı (en zayıf kategori), en çok gelişen sporcu.
     2) Kategori kartları — Mobilite, Güç, Sürat, Kuvvet, Dayanıklılık: her birinde gelişen /
        aynı / gerileyen karşılaştırmaların payı. Kart aynı zamanda sekme: haritayı o
        kategoriye çevirir.
     3) Gelişim haritası — seçili kategoride sporcu × metrik tablosu: hücre, sporcunun ilk ve
        son testi arasındaki % değişim (yön düzeltilmiş: sprint süresinin düşmesi gelişmedir);
        yeşil gelişme, kırmızı gerileme, ton büyüklük. Sütun başlığı o metriği seçer.
     4) Metrik odağı — seçili metrik: dört özet kutusu, sporcu sporcu "ilk → son test" sırası
        (ortak eksende iki nokta ve aradaki çubuk; takım ortalaması dikey çizgi) ve takımın
        test dönemlerine göre eğrisi (ortalama + en düşük–en yüksek bandı, seçili sporcu).
     5) Karşılaştırma tablosu (CompareAthletes) — açılır.
   Metrikler arası toplamlarda % ortalaması değil GELİŞEN ORANI kullanılır: 3 üzerinden
   puanlanan bir test (2 → 3 = +%50) ya da sıfıra yakın bir fark metriği yüzdeleri
   ortalamada şişirir; "kaç karşılaştırmada gelişti" her metrikte aynı anlama gelir.
   Metrik listesi test kataloğundan okunur (tdMetrics): yalnızca katalogda GÜNCEL olan bir
   testten gelen, yönü belli metrikler girer. Kataloğa yeni test eklenip CMP_METRICS'e metriği
   yazılınca burada kendiliğinden görünür; katalogda emekliye ayrılan test (eski ASLR, OHS,
   tek parça FMS) çıkar. FMS skorları bu ekrana hiç alınmaz (ne haritada, ne metrik listesinde,
   ne başlık/kategori toplamlarında). */
function tdMetrics(){
  const live=new Set(TEST_CATALOG.filter(c=>!c.retired&&!/^fms/.test(c.id)).map(c=>c.id));
  return CMP_METRICS.filter(m=>m.dir&&m.g!=='anthro'&&live.has(CMP_METRIC_TEST[m.id]));
}
const tdVal=(m,t)=>{try{const v=m.get(t);return v==null||!isFinite(v)?null:v;}catch(e){return null;}};
/* Bir sporcunun bu metrikteki tarihli değerleri, eskiden yeniye. */
function tdSeries(ath,m){
  return(ath.tests||[]).filter(t=>t.date).map(t=>({d:t.date,v:tdVal(m,t)})).filter(x=>x.v!=null)
    .sort((a,b)=>a.d.localeCompare(b.d));
}
/* İlk → son % değişim, yön düzeltilmiş: pozitif her zaman gelişme. */
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
/* Hücrenin tonu: işaret + büyüklük basamağı (±2 ve ±5). */
const tdTier=g=>g==null?'':g===0?'z':(g>0?'p':'n')+(Math.abs(g)<2?1:Math.abs(g)<5?2:3);
/* Gelişen / aynı / gerileyen payı tek yatay çubukta. */
function TdSplit({up,same,dn}){
  const t=up+same+dn;
  return(<span className="td-split" aria-hidden="true">{t>0&&<>
    {up>0&&<i className="td-s-up" style={{flexGrow:up}}/>}{same>0&&<i className="td-s-same" style={{flexGrow:same}}/>}{dn>0&&<i className="td-s-dn" style={{flexGrow:dn}}/>}</>}</span>);
}
function TeamData({athletes,setup,customTests,Lx}){
  const theme=useAppTheme();
  const roster=useMemo(()=>[...athletes].sort(byAthleteName),[athletes]);
  /* Bütün model tek yerde: her metrikte her sporcunun serisi, ilk/son değeri ve gelişimi. */
  const model=useMemo(()=>{
    const M=tdMetrics().map(m=>{
      const per=roster.map(a=>{const s=tdSeries(a,m);return{a,s,g:tdGain(s,m.dir),first:s[0]||null,last:s[s.length-1]||null};}).filter(r=>r.s.length);
      const gs=per.filter(r=>r.g!=null);
      return{m,per,by:new Map(per.map(r=>[r.a.id,r])),n:per.length,cmp:gs.length,up:gs.filter(r=>r.g>0).length,dn:gs.filter(r=>r.g<0).length,
        avg:gs.length?+(gs.reduce((x,r)=>x+r.g,0)/gs.length).toFixed(1):null};
    }).filter(x=>x.n>0);
    const sum=(xs,k)=>xs.reduce((t,x)=>t+x[k],0);
    const cats=CMP_GROUPS.filter(g=>g.id!=='anthro').map(g=>{const ms=M.filter(x=>x.m.g===g.id);
      const cmp=sum(ms,'cmp'),up=sum(ms,'up'),dn=sum(ms,'dn');
      return{g,ms,cmp,up,dn,same:cmp-up-dn,pct:cmp?Math.round(up/cmp*100):null};}).filter(c=>c.ms.length);
    const ath=roster.map(a=>{let cmp=0,up=0;M.forEach(x=>{const r=x.by.get(a.id);if(r&&r.g!=null){cmp++;if(r.g>0)up++;}});return{a,cmp,up};});
    const cmp=sum(M,'cmp'),up=sum(M,'up'),dn=sum(M,'dn');
    const dates=roster.flatMap(a=>(a.tests||[]).filter(t=>t.date).map(t=>t.date)).sort();
    return{M,cats,ath,cmp,up,dn,same:cmp-up-dn,dates,
      multi:roster.filter(a=>(a.tests||[]).filter(t=>t.date).length>1).length};
  },[roster]);

  const[catId,setCatId]=useState(null);
  const[mid,setMid]=useState(null);
  const[focus,setFocus]=useState(null);
  const[sort,setSort]=useState('level');
  const[showCmp,setShowCmp]=useState(false);
  /* Varsayılanlar: en çok karşılaştırması olan kategori ve o kategoride en çok sporcunun iki ölçümü olan metrik. */
  const most=(xs,k)=>xs.reduce((b,x)=>!b||x[k]>b[k]?x:b,null);
  const cat=model.cats.find(c=>c.g.id===catId)||most(model.cats,'cmp');
  const X=(cat&&cat.ms.find(x=>x.m.id===mid))||(cat&&(most(cat.ms,'cmp')||cat.ms[0]))||null;
  const m=X&&X.m;
  const pickMetric=id=>{const x=model.M.find(y=>y.m.id===id);if(!x)return;setCatId(x.m.g);setMid(id);};
  const catLbl=g=>Lx(g.tr,g.en);
  const unit=m&&m.u?` ${m.u}`:'';
  const monLbl=mo=>{const[y,mm]=mo.split('-');return`${MN[Number(mm)-1]} ${y.slice(2)}`;};
  const toggleFocus=id=>setFocus(f=>f===id?null:id);

  /* Başlık göstergeleri. */
  const rated=model.cats.filter(c=>c.cmp>0);
  const bestCat=rated.length?rated.reduce((b,c)=>c.pct>b.pct?c:b):null;
  const weakCat=rated.length>1?rated.reduce((b,c)=>c.pct<b.pct?c:b):null;
  const minCmp=Math.min(3,Math.max(1,...model.ath.map(x=>x.cmp)));
  const topAth=model.ath.filter(x=>x.cmp>=minCmp&&x.up>0).sort((x,y)=>(y.up/y.cmp-x.up/x.cmp)||(y.up-x.up))[0]||null;
  const allPct=model.cmp?Math.round(model.up/model.cmp*100):null;
  const span=model.dates.length?(()=>{const a=model.dates[0].slice(0,7),b=model.dates[model.dates.length-1].slice(0,7);return a===b?monLbl(a):`${monLbl(a)} → ${monLbl(b)}`;})():'';
  const nTests=model.dates.length;

  /* Seçili metriğin görünümü: sıra, eksen, dönem eğrisi. */
  const view=useMemo(()=>{
    if(!X)return null;
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
    /* Bir sporcunun o dönemdeki değeri: o ayın son testi. */
    const at=(r,mo)=>{const h=r.s.filter(x=>x.d.slice(0,7)===mo);return h.length?h[h.length-1].v:null;};
    const per=months.map(mo=>{const v=X.per.map(r=>at(r,mo)).filter(x=>x!=null);
      return{mo,n:v.length,avg:v.length?+(v.reduce((t,x)=>t+x,0)/v.length).toFixed(2):null,min:v.length?Math.min(...v):null,max:v.length?Math.max(...v):null};});
    return{rows,pos,lo:a,hi:b,lastAvg,best,months,per,at};
  },[X,sort]);

  const dark=theme!=='light';
  const grid=dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)',tick=dark?'rgba(255,255,255,.6)':'#5d6570';
  const AVG=dark?'#3aa0e6':'#1a8ad4',FOC=dark?'#f0a35e':'#c2570c';
  const fr=view&&focus?X.by.get(focus):null;
  const lineData=view&&{labels:view.months.map(monLbl),datasets:[
    {label:Lx('En yüksek','Highest'),data:view.per.map(p=>p.max),borderWidth:0,pointRadius:0,pointHoverRadius:0,fill:'+1',
      backgroundColor:dark?'rgba(58,160,230,.13)':'rgba(26,138,212,.12)',tension:.3,spanGaps:true,order:3},
    {label:Lx('En düşük','Lowest'),data:view.per.map(p=>p.min),borderWidth:0,pointRadius:0,pointHoverRadius:0,fill:false,tension:.3,spanGaps:true,order:3},
    {label:Lx('Takım ortalaması','Team average'),data:view.per.map(p=>p.avg),borderColor:AVG,borderWidth:2.5,pointRadius:4.5,pointHoverRadius:6,
      pointBackgroundColor:AVG,pointBorderColor:dark?'#232323':'#fff',pointBorderWidth:2,tension:.3,spanGaps:true,fill:false,order:1,
      datalabels:{display:!fr,align:'top',offset:6,color:dark?'#f2f2f2':'#14181d',font:{weight:'700',size:11},formatter:v=>v==null?'':tdFmt(m,v)}},
    ...(fr?[{label:fr.a.name||'—',data:view.months.map(mo=>view.at(fr,mo)),borderColor:FOC,borderWidth:2,pointRadius:4,pointHoverRadius:6,
      pointBackgroundColor:FOC,pointBorderColor:dark?'#232323':'#fff',pointBorderWidth:2,tension:.3,spanGaps:true,fill:false,order:0}]:[])]};
  const lineOpts={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    animation:{duration:500,easing:'easeOutQuart'},layout:{padding:{top:18,right:8}},
    plugins:{legend:{display:false},datalabels:{display:false},
      tooltip:{callbacks:{label:c=>c.parsed.y==null?null:`${c.dataset.label}: ${tdFmt(m,c.parsed.y)}${unit}`,
        footer:it=>{const p=it&&it[0]&&view.per[it[0].dataIndex];return p?`${p.n} ${Lx('sporcu','athletes')}`:'';}}}},
    scales:{x:{grid:{display:false},ticks:{color:tick}},
      y:{grace:'12%',grid:{color:grid},border:{display:false},ticks:{color:tick,maxTicksLimit:6}}}};

  if(!model.M.length)return(<div className="td-wrap">
    <div className="empty-st">{Lx('Grafik için tarihli test sonucu yok. Bir sporcuya test girince burada görünür.','No dated test results to chart yet. They show here once tests are entered.')}</div>
    <div className="td-cmp"><CompareAthletes athletes={athletes} setup={setup} customTests={customTests} Lx={Lx}/></div>
  </div>);

  const heatRows=roster.filter(a=>cat.ms.some(x=>x.by.has(a.id)));
  const same=X.cmp-X.up-X.dn;
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
        <span className="td-cat-v"><span>{c.pct==null?'—':<>{c.pct}<small>%</small></>}</span><em>{c.pct==null?Lx('ikinci test bekleniyor','awaiting a second test'):Lx('gelişen','improved')}</em></span>
        <TdSplit up={c.up} same={c.same} dn={c.dn}/>
        <span className="td-cat-f">{Lx(`${c.ms.length} metrik · ${c.cmp} karşılaştırma`,`${c.ms.length} metrics · ${c.cmp} comparisons`)}</span>
      </button>)}
    </div>

    {/* 3 · Gelişim haritası */}
    <div className="panel td-panel">
      <div className="td-hd">
        <div><h2>{Lx('Gelişim haritası','Development map')} · {catLbl(cat.g)}</h2>
          <p>{Lx('Her hücre sporcunun ilk ve son testi arasındaki değişim; yön düzeltilmiş: artı her zaman gelişme. Sütun başlığına tıkla → metrik ayrıntısı.','Each cell is the change between the athlete\'s first and latest test, direction-corrected: plus is always improvement. Click a column header → metric detail.')}</p></div>
        <div className="td-leg" aria-hidden="true">
          <span>{Lx('geriledi','declined')}</span><i className="td-c n3"/><i className="td-c n2"/><i className="td-c n1"/><i className="td-c z"/><i className="td-c p1"/><i className="td-c p2"/><i className="td-c p3"/><span>{Lx('gelişti','improved')}</span>
          <span className="td-leg-1"><i className="td-c one"/>{Lx('tek test (son değer)','single test (latest value)')}</span>
        </div>
      </div>
      <div className="td-heat-w"><table className="td-heat" key={cat.g.id}>
        <thead><tr>
          <th className="td-h-ath">{Lx('Sporcu','Athlete')}</th>
          {cat.ms.map(x=><th key={x.m.id} className={x===X?'sel':''}>
            <button type="button" aria-pressed={x===X} title={`${cmpLabel(x.m)}${x.m.u?' · '+x.m.u:''} · ${x.m.dir==='lo'?Lx('düşük daha iyi','lower is better'):Lx('yüksek daha iyi','higher is better')}`}
              onClick={()=>setMid(x.m.id)}>{cmpShort(x.m)}</button></th>)}
          <th className="td-h-sum" title={Lx('Bu kategoride gelişen ölçüm / karşılaştırılabilen ölçüm','Improved measures / comparable measures in this category')}>{Lx('Gelişen','Improved')}</th>
        </tr></thead>
        <tbody>{heatRows.map(a=>{let cmp=0,up=0;
          const cells=cat.ms.map(x=>{const r=x.by.get(a.id);
            if(!r)return<td key={x.m.id} className={'td-c none'+(x===X?' sel':'')}>·</td>;
            if(r.g==null)return<td key={x.m.id} className={'td-c one'+(x===X?' sel':'')}
              title={`${cmpLabel(x.m)} · ${fd(r.last.d)}: ${tdFmt(x.m,r.last.v)}${x.m.u?' '+x.m.u:''}`}>{tdFmt(x.m,r.last.v)}</td>;
            cmp++;if(r.g>0)up++;
            return<td key={x.m.id} className={'td-c '+tdTier(r.g)+(x===X?' sel':'')}
              title={`${cmpLabel(x.m)}\n${fd(r.first.d)}: ${tdFmt(x.m,r.first.v)} → ${fd(r.last.d)}: ${tdFmt(x.m,r.last.v)}${x.m.u?' '+x.m.u:''}`}>{tdPct(r.g)}</td>;});
          return<tr key={a.id} className={focus===a.id?'foc':''}>
            <th className="td-h-ath"><button type="button" aria-pressed={focus===a.id} onClick={()=>toggleFocus(a.id)}
              title={Lx('Metrik odağında öne çıkar','Highlight in the metric focus')}>{a.name||'—'}</button></th>
            {cells}
            <td className="td-h-sum">{cmp?<><b>{up}</b>/{cmp}</>:'—'}</td></tr>;})}</tbody>
        <tfoot>
          <tr><th className="td-h-ath">{Lx('Takım ort. değişim','Team avg. change')}</th>
            {cat.ms.map(x=><td key={x.m.id} className={'td-c '+tdTier(x.avg)+(x===X?' sel':'')}>{tdPct(x.avg)}</td>)}<td className="td-h-sum"/></tr>
          <tr><th className="td-h-ath">{Lx('Gelişen sporcu','Athletes improving')}</th>
            {cat.ms.map(x=><td key={x.m.id} className={'td-f'+(x===X?' sel':'')}>{x.cmp?<><b>{x.up}</b>/{x.cmp}</>:'—'}</td>)}
            <td className="td-h-sum">{cat.cmp?<><b>{cat.up}</b>/{cat.cmp}</>:'—'}</td></tr>
        </tfoot>
      </table></div>
    </div>

    {/* 4 · Metrik odağı */}
    <div className="panel td-panel" key={m.id}>
      <div className="td-hd">
        <div><h2>{Lx('Metrik odağı','Metric focus')} · {cmpLabel(m)}{m.u&&<span className="td-u">{m.u}</span>}</h2>
          <p>{m.dir==='lo'?Lx('Düşük değer daha iyi.','Lower is better.'):Lx('Yüksek değer daha iyi.','Higher is better.')}{' '}{Lx(`${X.n} sporcunun ölçümü var, ${X.cmp} sporcu ilk ve son testiyle karşılaştırılabiliyor.`,`${X.n} athletes measured, ${X.cmp} comparable across first and latest test.`)}</p></div>
        <select className="td-sel" value={m.id} onChange={e=>pickMetric(e.target.value)} aria-label={Lx('Metrik seç','Pick a metric')}>
          {model.cats.map(c=><optgroup key={c.g.id} label={catLbl(c.g)}>{c.ms.map(x=><option key={x.m.id} value={x.m.id}>{cmpLabel(x.m)}</option>)}</optgroup>)}
        </select>
      </div>
      <div className="td-stats">
        <div className="td-stat"><span>{Lx('Takım ortalaması · son test','Team average · latest test')}</span>
          <b>{tdFmt(m,view.lastAvg)}<small>{unit}</small></b><em>{Lx(`${X.n} sporcu`,`${X.n} athletes`)}</em></div>
        <div className="td-stat"><span>{Lx('Ortalama gelişim','Average change')}</span>
          <b className={X.avg>0?'g-up':X.avg<0?'g-dn':''}>{tdPct(X.avg)}</b><em>{Lx(`ilk → son test · ${X.cmp} sporcu`,`first → latest · ${X.cmp} athletes`)}</em></div>
        <div className="td-stat"><span>{Lx('Gelişen / gerileyen','Improved / declined')}</span>
          <b>{X.cmp?<>{X.up}<i> / </i>{X.dn}</>:'—'}</b><TdSplit up={X.up} same={same} dn={X.dn}/>
          <em>{Lx(`${same} aynı · ${X.n-X.cmp} tek test`,`${same} same · ${X.n-X.cmp} single test`)}</em></div>
        <div className="td-stat"><span>{Lx('En iyi değer','Best value')}</span>
          <b>{tdFmt(m,view.best.last.v)}<small>{unit}</small></b><em>{view.best.a.name||'—'}</em></div>
      </div>
      <div className="td-focus">
        <div className="td-db">
          <div className="td-sub">
            <h3>{Lx('Sporcu sıralaması · ilk → son test','Athlete ranking · first → latest test')}</h3>
            <div className="lb-seg">
              <button type="button" className={sort==='level'?'on':''} aria-pressed={sort==='level'} onClick={()=>setSort('level')}>{Lx('Son değere göre','By latest value')}</button>
              <button type="button" className={sort==='gain'?'on':''} aria-pressed={sort==='gain'} onClick={()=>setSort('gain')}>{Lx('Gelişime göre','By change')}</button>
            </div>
          </div>
          <div className="td-db-ax">
            <span/><div className="td-db-tr"><span className="td-ax-lo">{tdFmt(m,view.lo)}</span><span className="td-ax-hi">{tdFmt(m,view.hi)}</span>
              <span className="td-ax-avg" style={{left:view.pos(view.lastAvg)+'%'}}>{Lx('takım ort.','team avg')} {tdFmt(m,view.lastAvg)}</span></div>
            <span className="td-db-dir">{m.dir==='lo'?Lx('← daha iyi','← better'):Lx('daha iyi →','better →')}</span>
          </div>
          <div className="td-db-rows">{view.rows.map((r,i)=>{const pf=view.pos(r.first.v),pl=view.pos(r.last.v);const one=r.s.length<2;
            const cls=r.g==null?'':r.g>0?' g-up':r.g<0?' g-dn':' g-same';
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
            <span><i className="td-k-vln"/>{Lx('takım ort. (son test)','team avg (latest)')}</span><em>{Lx('satıra tıkla → sporcu eğride öne çıkar','click a row → highlight the athlete on the curve')}</em></div>
        </div>
        <div className="td-tr">
          <div className="td-sub"><h3>{Lx('Takım eğrisi · test dönemleri','Team curve · test periods')}</h3></div>
          {view.months.length<2
            ?<div className="td-empty">{Lx('Eğri için bu metrikte en az iki ayrı test dönemi gerekir.','The curve needs at least two test periods in this metric.')}</div>
            :<><div className="td-chart"><ChartC type="line" chartData={lineData} options={lineOpts}/></div>
              <div className="td-tr-leg"><span><i className="td-k-ln" style={{background:AVG}}/>{Lx('takım ortalaması','team average')}</span>
                <span><i className="td-k-band"/>{Lx('en düşük – en yüksek','lowest – highest')}</span>
                {fr&&<span><i className="td-k-ln" style={{background:FOC}}/>{fr.a.name}</span>}</div></>}
          <table className="td-per"><thead><tr><th>{Lx('Dönem','Period')}</th><th>{Lx('Sporcu','Athletes')}</th><th>{Lx('Ort.','Avg')}</th><th>{Lx('En düşük','Lowest')}</th><th>{Lx('En yüksek','Highest')}</th></tr></thead>
            <tbody>{view.per.map(p=><tr key={p.mo}><td>{monLbl(p.mo)}</td><td>{p.n}</td><td><b>{tdFmt(m,p.avg)}</b></td><td>{tdFmt(m,p.min)}</td><td>{tdFmt(m,p.max)}</td></tr>)}</tbody></table>
          <div className="td-note">{Lx('Dönem ortalaması o dönemde ölçülen sporcularla hesaplanır; sporcu sayısı dönemden döneme değişiyorsa ortalamalar birebir karşılaştırılamaz.','Each period average covers the athletes measured in that period; when the number of athletes differs, the averages are not directly comparable.')}</div>
        </div>
      </div>
    </div>

    {/* 5 · Karşılaştırma tablosu */}
    <div className="td-cmp">
      <button type="button" className="td-cmp-tg" aria-expanded={showCmp} onClick={()=>setShowCmp(v=>!v)}>
        <span>{showCmp?'▾':'▸'}</span>{Lx('Sporcuları karşılaştır (tablo)','Compare athletes (table)')}
        <em>{Lx('son test değerleri yan yana · çıktı alınabilir','latest test values side by side · printable')}</em></button>
      {showCmp&&<CompareAthletes athletes={athletes} setup={setup} customTests={customTests} Lx={Lx}/>}
    </div>
  </div>);
}
