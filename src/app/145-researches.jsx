/* =========================================================
   RESEARCHES — article-summary blog (auto APA via CrossRef)
   ========================================================= */
async function fetchCrossref(input){
  const m=(input||'').match(/10\.\d{4,9}\/[^\s"<>]+/i);
  if(!m)throw new Error('DOI bulunamadı — makalenin DOI içeren linkini ya da DOI’sini gir (ör. 10.1234/abcd).');
  const doi=m[0].replace(/[).,;]+$/,'');
  const r=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{headers:{'Accept':'application/json'}});
  if(!r.ok)throw new Error('CrossRef HTTP '+r.status);
  const w=(await r.json()).message;
  const dp=((w.issued||w['published']||w['published-print']||w['published-online']||{})['date-parts']||[[]])[0]||[];
  return{doi,url:w.URL||input,
    authors:(w.author||[]).map(a=>({family:a.family||'',given:a.given||''})),
    year:dp[0]||'',date:dp.join('-'),
    title:(w.title&&w.title[0])||'',journal:(w['container-title']&&w['container-title'][0])||'',
    volume:w.volume||'',issue:w.issue||'',page:w.page||''};
}
function apaCite(m){
  const fmtA=a=>{const ini=(a.given||'').split(/[\s.]+/).filter(Boolean).map(s=>s[0].toUpperCase()+'.').join(' ');return (a.family||'')+(ini?', '+ini:'');};
  const A=m.authors||[];let auth='';
  if(A.length===1)auth=fmtA(A[0]);
  else if(A.length>=2&&A.length<=20)auth=A.slice(0,-1).map(fmtA).join(', ')+', & '+fmtA(A[A.length-1]);
  else if(A.length>20)auth=A.slice(0,19).map(fmtA).join(', ')+', … '+fmtA(A[A.length-1]);
  const yr=m.year?`(${m.year}).`:'(n.d.).';
  const title=m.title?(m.title.replace(/\s*\.\s*$/,'')+'.'):'';
  let src='';
  if(m.journal){src=m.journal+(m.volume?`, ${m.volume}`:'')+(m.issue?`(${m.issue})`:'')+(m.page?`, ${m.page}`:'')+'.';}
  const link=m.doi?`https://doi.org/${m.doi}`:(m.url||'');
  return [auth,yr,title,src,link].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
}
function authorsLine(m){
  const A=m.authors||[];if(!A.length)return m.authorsText||'';
  return A.map(a=>[a.given,a.family].filter(Boolean).join(' ')).join(', ');
}
// Minimal rich-text editor (contentEditable + execCommand) — stores HTML.
function RichText({html,onChange}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==(html||''))ref.current.innerHTML=html||'';},[]);
  const cmd=(c,v)=>{ref.current.focus();document.execCommand(c,false,v);onChange(ref.current.innerHTML);};
  const Btn=({c,v,children,st})=><button type="button" className="rt-b" style={st} onMouseDown={e=>e.preventDefault()} onClick={()=>cmd(c,v)}>{children}</button>;
  return(<div>
    <div className="rt-tools">
      <Btn c="bold" st={{fontWeight:800}}>B</Btn>
      <Btn c="italic" st={{fontStyle:'italic'}}>I</Btn>
      <Btn c="underline" st={{textDecoration:'underline'}}>U</Btn>
      <span className="rt-sep"/>
      <Btn c="formatBlock" v="H2">Başlık</Btn>
      <Btn c="formatBlock" v="H3">Alt Başlık</Btn>
      <Btn c="formatBlock" v="P">Paragraf</Btn>
      <span className="rt-sep"/>
      <select className="rt-b" defaultValue="" onMouseDown={e=>e.stopPropagation()} onChange={e=>{const v=e.target.value;e.target.value='';if(v)cmd('fontSize',v);}}>
        <option value="" disabled>Boyut</option>
        <option value="2">Küçük</option><option value="4">Normal</option><option value="6">Büyük</option><option value="7">Çok Büyük</option>
      </select>
      <Btn c="insertUnorderedList">• Liste</Btn>
      <Btn c="insertOrderedList">1. Liste</Btn>
      <span className="rt-sep"/>
      <Btn c="removeFormat">✕ Biçimi Temizle</Btn>
    </div>
    <div ref={ref} className="rt-edit" contentEditable suppressContentEditableWarning
      onInput={e=>onChange(e.currentTarget.innerHTML)}
      data-ph="Makalenin özeti, çıkarımlar, uygulama notları… (metni seçip yukarıdan kalın/büyük yapabilirsin)"/>
  </div>);
}
// Print a single research note on A4 (title, authors, APA, formatted summary).
function printResearch(rec){
  const w=window.open('','_blank','width=900,height=1100');
  if(!w){alert('Pop-up engellendi — tarayıcıdan bu site için pop-up iznini aç.');return;}
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(rec.title||L('Makale','Article'))}</title><style>
@page{size:A4 portrait;margin:18mm}
${RPT_FONT}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Segoe UI',-apple-system,Arial,sans-serif;color:#0f172a;font-size:13px;line-height:1.65}
h1{font-size:23px;font-weight:800;margin-bottom:8px;line-height:1.2}
.meta{font-size:12px;color:#475569;margin-bottom:2px}
.apa{font-size:12px;color:#334155;background:#f1f5f9;border-left:3px solid #0891b2;padding:10px 12px;border-radius:6px;margin:14px 0;word-break:break-word}
.sumh{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#0891b2;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:5px}
.sum{font-size:13px}
.sum h2{font-size:18px;margin:.5em 0}.sum h3{font-size:15px;margin:.5em 0}.sum ul,.sum ol{padding-left:22px;margin:.4em 0}
</style></head><body>
<h1>${esc(rec.title||L('(başlıksız makale)','(untitled article)'))}</h1>
${rec.authorsText?`<div class="meta"><b>${L('Yazar(lar):','Author(s):')}</b> ${esc(rec.authorsText)}</div>`:''}
${(rec.journal||rec.year)?`<div class="meta">${esc([rec.journal,rec.year].filter(Boolean).join(' · '))}</div>`:''}
${rec.apa?`<div class="apa">${esc(rec.apa)}</div>`:''}
<div class="sumh">${L('Özet','Summary')}</div>
<div class="sum">${rec.summary||L('<i>Özet girilmemiş.</i>','<i>No summary entered.</i>')}</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},300);
}
function ResearchModal({rec,onChange,onDelete,onClose}){
  const set=(k,v)=>onChange({[k]:v});
  const[busy,setBusy]=useState(false);const[err,setErr]=useState('');
  // New (empty) entries start in edit mode so the user can fill meta + summary.
  const isNew=!rec.title&&!rec.summary&&!rec.authorsText;
  const[editing,setEditing]=useState(isNew);
  const fetchMeta=async()=>{
    setErr('');setBusy(true);
    try{const m=await fetchCrossref(rec.url||rec.doi);
      onChange({doi:m.doi,url:m.url,year:String(m.year||''),date:m.date,journal:m.journal,
        authors:m.authors,authorsText:authorsLine(m),apa:apaCite(m)});
    }catch(e){setErr(e.message||String(e));}finally{setBusy(false);}
  };
  const metaLine=[rec.authorsText,rec.year].filter(Boolean).join(' · ');
  return(<div className="modal-bg rs-bg" onClick={onClose}>
    <div className="modal ex-modal rs-modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        {editing
          ? <input className="ex-title-in" value={rec.title} placeholder={L('Makale başlığını elle yaz…','Type the article title by hand…')} onChange={e=>set('title',e.target.value)}/>
          : <div className="ex-title-in" style={{cursor:'default'}}>{rec.title||'(başlıksız makale)'}</div>}
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ex-modal-body">
        {editing&&<>
          <div>
            <label>{L('Makale Linki / DOI','Article link / DOI')}</label>
            <div className="row" style={{gap:8,flexWrap:'nowrap'}}>
              <input value={rec.url} onChange={e=>set('url',e.target.value)} placeholder={L('https://doi.org/10.1234/… ya da DOI','https://doi.org/10.1234/… or a DOI')}/>
              <button className="btn sm" disabled={busy} onClick={fetchMeta} style={{whiteSpace:'nowrap'}}>{busy?L('Alınıyor…','Fetching…'):L('⤓ Bilgileri Getir','⤓ Fetch details')}</button>
            </div>
            <div className="help" style={{marginTop:4}}>{L(<>Linki yapıştırıp <b>Bilgileri Getir</b>’e bas — yazarlar, tarih ve APA otomatik dolar (DOI’li makalelerde).</>,
              <>Paste the link and press <b>Fetch details</b> — authors, date and the APA reference fill themselves in (for articles with a DOI).</>)}</div>
            {err&&<div className="help" style={{marginTop:6,color:'#dc2626'}}>{err}</div>}
          </div>
          <div className="grid cols-2" style={{marginTop:14}}>
            <div><label>{L('Yazar(lar)','Author(s)')}</label><input value={rec.authorsText||''} onChange={e=>set('authorsText',e.target.value)} placeholder="Surname, N., …"/></div>
            <div><label>{L('Yıl / Tarih','Year / Date')}</label><input value={rec.year||''} onChange={e=>set('year',e.target.value)} placeholder="2024"/></div>
          </div>
          <div style={{marginTop:14}}><label>{L('Dergi','Journal')}</label><input value={rec.journal||''} onChange={e=>set('journal',e.target.value)} placeholder="Journal of …"/></div>
          <div style={{marginTop:14}}><label>{L('APA Kaynakça','APA reference')}</label>
            <textarea value={rec.apa||''} onChange={e=>set('apa',e.target.value)} placeholder={L('Otomatik oluşur — düzenleyebilirsin.','Filled in automatically — you can edit it.')} style={{minHeight:70}}/></div>
          <div style={{marginTop:14}}><label>{L('Etiketler (virgülle)','Tags (comma separated)')}</label><input value={rec.tags||''} onChange={e=>set('tags',e.target.value)} placeholder={L('kuvvet, ACWR, yaralanma…','strength, ACWR, injury…')}/></div>
        </>}
        {!editing&&(metaLine||rec.journal)&&<div className="rs-readmeta">
          {metaLine&&<div className="rs-readmeta-au">{metaLine}</div>}
          {rec.journal&&<div className="rs-readmeta-jr">{rec.journal}</div>}
        </div>}
        <div style={{marginTop:editing?16:8}}>
          {editing&&<label>{L('Özet / Blog','Summary / Blog')}</label>}
          {editing
            ? <RichText html={rec.summary} onChange={v=>set('summary',v)}/>
            : <div className="rt-edit rs-paper" dangerouslySetInnerHTML={{__html:rec.summary||L('<i style="color:#9ca3af">Henüz özet yazılmamış — Düzenle’ye basıp ekleyebilirsin.</i>','<i style="color:#9ca3af">No summary written yet — press Edit to add one.</i>')}}/>}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn danger sm" onClick={onDelete}>{L('Sil','Delete')}</button>
        <div className="row" style={{gap:8}}>
          <button className="btn sec sm" onClick={()=>setEditing(e=>!e)}>{editing?L('👁 Görüntüle','👁 View'):L('✎ Düzenle','✎ Edit')}</button>
          <button className="btn sec sm" onClick={()=>printResearch(rec)}>{L('🖨 Yazdır (A4)','🖨 Print (A4)')}</button>
          <button className="btn sm" onClick={onClose}>{L('Bitti','Done')}</button>
        </div>
      </div>
    </div>
  </div>);
}
function ResearchCard({rec,onOpen}){
  const tags=(rec.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
  return(<div className="rs-card2" onClick={onOpen}>
    <div className="rs-top">
      <div className="rs-tags">{tags.slice(0,4).map((t,i)=><span key={i} className="rs-tag">{t}</span>)}</div>
      <svg className="rs-bm" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
    </div>
    <div className="rs-title">{rec.title||'(başlıksız makale)'}</div>
    <div className="rs-auth">{rec.authorsText||'—'}</div>
    <div className="rs-foot">
      <span className="rs-src">{[rec.journal,rec.year].filter(Boolean).join(' · ')||'—'}</span>
      <span className="rs-read">{L('Oku ›','Read ›')}</span>
    </div>
  </div>);
}
/* ---------------------------------------------------------------
   Daily research feed — pulls fresh training-science RCTs from
   Europe PMC (free, no key, CORS-open) every day. OpenAlex was the
   old source but it requires an API key since Feb 2026, which broke
   the feed. Topics + the article picked within each topic rotate
   deterministically by calendar day. Today's set is kept in memory
   so it stays stable through the session and only the abstract + a
   source link are shown.
   --------------------------------------------------------------- */
// Bellek-içi önbellekler (sayfa yenilenince sıfırlanır; kalıcı depo kullanılmaz)
let RS_FEED_CACHE=null;     // {date, roll, items}
let RS_SEEN_CACHE=[];       // son gösterilen id'ler (tekrarı azalt)
let RS_TR_CACHE={};         // EN→TR başlık çevirileri
const RS_TOPICS=[
  {tr:'Periodization',q:'periodization resistance training program'},
  {tr:'Plyometrics',q:'plyometric training jump performance'},
  {tr:'Strength & Power',q:'strength power training athletes'},
  {tr:'Coaching',q:'coaching behaviour athlete performance'},
  {tr:'Return to Sport',q:'return to sport after injury rehabilitation'},
  {tr:'Sprint Mechanics',q:'sprint running mechanics biomechanics'},
  {tr:'Reactive Agility',q:'reactive agility change of direction'},
  {tr:'Interval Training',q:'high intensity interval training'},
  {tr:'Training Methods',q:'resistance training methods adaptation'},
  {tr:'Aerobic Capacity',q:'aerobic capacity VO2max endurance training'},
  {tr:'Anaerobic Capacity',q:'anaerobic capacity repeated sprint ability'},
  {tr:'Load Management',q:'training load management athletes'},
  {tr:'Exercise Physiology',q:'exercise physiology skeletal muscle adaptation'},
  {tr:'Biomechanics',q:'sport biomechanics movement analysis'},
  {tr:'Mobility & Stability',q:'joint mobility core stability training'},
  {tr:'Performance Testing',q:'physical performance testing athletes assessment'},
  {tr:'Recovery',q:'recovery strategies athletes fatigue'},
  {tr:'Injury Prevention',q:'injury prevention program team sport'},
  {tr:'Load Tracking',q:'training load monitoring GPS wearable'},
  {tr:'Performance Tech',q:'wearable sensor technology sport performance'},
  {tr:'Agility & Speed',q:'agility speed quickness training'},
  {tr:'Reaction Time',q:'reaction time perceptual cognitive sport'},
  {tr:'Sports Nutrition',q:'sports nutrition supplementation performance'},
];
// Small deterministic PRNG so a given day always yields the same picks.
function rsRng(seed){let a=(seed>>>0)||1;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function rsShuffle(arr,rng){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function rsTodayKey(){return new Date().toISOString().slice(0,10);}
function rsLoadSeen(){return RS_SEEN_CACHE.slice();}
function rsSaveSeen(a){RS_SEEN_CACHE=a.slice(-90);}
// Europe PMC titles/abstracts may carry markup tags — strip to plain text.
function rsStripTags(s){return(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function rsNorm(w,topic){
  const src=w.source||'MED',doi=w.doi||'';
  return{
    id:src+'/'+w.id,doi,
    url:doi?'https://doi.org/'+doi:'https://europepmc.org/article/'+src+'/'+w.id,
    title:rsStripTags(w.title)||'(untitled)',titleTr:'',
    abstract:rsStripTags(w.abstractText),
    journal:(w.journalInfo&&w.journalInfo.journal&&w.journalInfo.journal.title)||w.journalTitle||'',
    year:w.pubYear||'',authors:w.authorString||'',isOA:w.isOpenAccess==='Y',topic};
}
// Translate an English title to Turkish via Google's free endpoint; cached in memory.
async function rsTranslate(text){
  if(!text)return'';
  if(RS_TR_CACHE[text])return RS_TR_CACHE[text];
  try{
    const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),6000);
    const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q='+encodeURIComponent(text),{signal:ctrl.signal});
    clearTimeout(to);if(!r.ok)return'';
    const j=await r.json();
    const tr=(j&&Array.isArray(j[0]))?j[0].map(s=>s&&s[0]).filter(Boolean).join(''):'';
    if(tr)RS_TR_CACHE[text]=tr;
    return tr;
  }catch(e){return'';}
}
// Query Europe PMC for one recent RCT on a topic, rotating among the
// most-relevant top results for daily variety while skipping recently-shown ids.
// Drop studies on non-athlete / clinical / special populations (elderly, women,
// children, patients & disease groups) — the coach wants athlete research only.
const RS_EXCLUDE=/\b(older adults?|elderly|geriatric|sarcopenia|nursing home|menopaus\w*|postmenopaus\w*|premenopaus\w*|pregnan\w*|menstrual|diabet\w*|cancer|carcinoma|tumou?rs?|oncolog\w*|obes\w*|overweight|parkinson\w*|alzheimer\w*|dementia|\bstroke\b|cardiovascular disease|coronary|hypertens\w*|\bcopd\b|asthma|covid\w*|bariatric|rheumat\w*|osteoporo\w*|fibromyalgia|multiple sclerosis|cerebral palsy|low(er)? back pain|chronic pain|non-?specific|children|paediatric|pediatric|prepubertal|\binfants?\b|toddler|schoolchild\w*|\bwomen\b|\bwoman\b|\bgirls?\b|\bfemales?\b|patients with|in patients)\b/i;
// Positive signal that a study is about athletes / sport performance.
const RS_ATHLETE=/\b(athletes?|sport|sports|players?|soccer|football|basketball|volleyball|handball|rugby|tennis|sprint\w*|jumping|track and field|team[- ]?sport|elite|competiti\w*|trained (men|males|individuals)|physically active|collegiate|professional|academy)\b/i;
async function rsQuery(qstr,topicTr,from,rng,used,seen){
  const today=new Date().toISOString().slice(0,10);
  const q='('+qstr+') AND PUB_TYPE:"randomized controlled trial" AND HAS_ABSTRACT:y AND LANG:eng AND FIRST_PDATE:['+from+' TO '+today+']';
  const url='https://www.ebi.ac.uk/europepmc/webservices/rest/search?query='+encodeURIComponent(q)
    +'&format=json&resultType=core&pageSize=50';
  let res;try{const r=await fetch(url);if(!r.ok)return null;const j=await r.json();res=(j.resultList&&j.resultList.result)||[];}catch(e){return null;}
  if(!res.length)return null;
  const topN=Math.min(20,res.length);
  const order=rsShuffle(Array.from({length:topN},(_,i)=>i),rng)
    .concat(Array.from({length:Math.max(0,res.length-topN)},(_,i)=>i+topN));
  // Pick within the relevance-ranked pool. RCT is guaranteed by the PUB_TYPE
  // filter; athletes are a HARD requirement — clinical / special populations
  // and studies without a clear athlete signal are never returned.
  const txt=n=>n.title+' '+(n.abstract||'');
  let t1,t2;
  for(const i of order){
    const w=res[i];if(!w)continue;
    const n=rsNorm(w,topicTr);if(used.has(n.id))continue;
    if(!n.abstract||n.abstract.length<120)continue;
    if(RS_EXCLUDE.test(txt(n)))continue;          // skip elderly/children/patients
    if(!RS_ATHLETE.test(txt(n)))continue;         // must clearly involve athletes
    if(!t2)t2=n;                                  // athlete RCT (shown before)
    if(!seen.includes(n.id)){t1=n;break;}         // athlete RCT, fresh ★
  }
  return t1||t2;
}
// Fetch 6 day-rotated topics — athlete-only randomized controlled trials —
// then translate each title to Turkish (best-effort). If a topic yields no
// athlete RCT, the next topic in the daily rotation fills the slot.
async function rsFetchDaily(seed){
  const rng=rsRng(Math.imul(seed||1,2654435761));
  const topics=rsShuffle(RS_TOPICS.slice(),rng);
  const from=(()=>{const d=new Date();d.setFullYear(d.getFullYear()-5);return d.toISOString().slice(0,10);})();
  const seen=rsLoadSeen(),used=new Set(),out=[];
  for(const t of topics){
    if(out.length>=6)break;
    let pick=await rsQuery(t.q+' athletes',t.tr,from,rng,used,seen);
    if(!pick)pick=await rsQuery(t.q,t.tr,from,rng,used,seen);
    if(pick){out.push(pick);used.add(pick.id);}
  }
  await Promise.all(out.map(async o=>{try{o.titleTr=await rsTranslate(o.title);}catch(e){}}));
  if(out.length)rsSaveSeen(seen.concat(out.map(o=>o.id)));
  return out;
}

function ResearchFeedCard({rec,idx,saved,onToggleSave}){
  const[exp,setExp]=useState(false);
  const[tt,setTt]=useState(rec.titleTr||'');
  const ab=rec.abstract||'';const long=ab.length>360;
  // Show the Turkish translation on hover; translate lazily for older saved items.
  const hoverTr=()=>{if(!tt)rsTranslate(rec.title).then(t=>{if(t)setTt(t);});};
  return(<article className="rsf-card" style={{animationDelay:(idx*70)+'ms'}}>
    <div className="rsf-top">
      <span className="rsf-topic">{rec.topic||L('Araştırma','Research')}</span>
      <div className="rsf-top-r">
        {rec.isOA&&<span className="rsf-oa">{L('açık erişim','open access')}</span>}
        {rec.year&&<span className="rsf-year">{rec.year}</span>}
      </div>
    </div>
    <h3 className="rsf-title" onMouseEnter={hoverTr}>
      <a href={rec.url} target="_blank" rel="noopener noreferrer">{rec.title}</a>
      {tt&&<span className="rsf-tt"><span className="rsf-tt-lbl">{L('TR çeviri','TR translation')}</span>{tt}</span>}
    </h3>
    <div className="rsf-meta">{[rec.journal,rec.authors].filter(Boolean).join(' · ')||'—'}</div>
    <p className={'rsf-abs'+(exp?' open':'')}>{ab||L('Bu makale için özet yok.','No abstract available for this article.')}</p>
    {long&&<button className="rsf-more" onClick={()=>setExp(e=>!e)}>{exp?L('Daha az ↑','Show less ↑'):L('Devamını oku ↓','Read more ↓')}</button>}
    <div className="rsf-foot">
      <a className="rsf-link" href={rec.url} target="_blank" rel="noopener noreferrer">{L('Kaynağa git ↗','View source ↗')}</a>
      <button className={'rsf-save'+(saved?' on':'')} onClick={()=>onToggleSave(rec)}>
        <span className="rsf-heart">{saved?'★':'☆'}</span>{saved?L('Kaydedildi','Saved'):L('Kaydet','Save')}
      </button>
    </div>
  </article>);
}

function ResearchFeed({savedIds,onToggleSave}){
  const[items,setItems]=useState(null);// null = loading
  const[err,setErr]=useState('');
  const[roll,setRoll]=useState(0);
  const baseDay=Math.floor(Date.now()/86400000);
  useEffect(()=>{
    let alive=true;setItems(null);setErr('');
    const today=rsTodayKey();
    if(roll===0){
      const cache=RS_FEED_CACHE;
      if(cache&&cache.date===today&&cache.roll===0&&Array.isArray(cache.items)&&cache.items.length){setItems(cache.items);return;}
    }
    (async()=>{
      try{
        const res=await rsFetchDaily(baseDay+roll*101);
        if(!alive)return;
        if(!res.length){setErr('Could not load articles right now. Check your internet connection and try again.');setItems([]);return;}
        setItems(res);
        RS_FEED_CACHE={date:today,roll,items:res};
      }catch(e){if(alive){setErr('Connection error — please try again.');setItems([]);}}
    })();
    return()=>{alive=false;};
  },[roll]);
  const dateStr=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  return(<div>
    <div className="rsf-bar">
      <div className="rsf-date">📅 {dateStr} · today's picks</div>
      <button className="btn sec sm" onClick={()=>setRoll(r=>r+1)} disabled={items===null}>🔀 New 6 articles</button>
    </div>
    {items===null&&<div className="rsf-grid">{[0,1,2,3,4,5].map(i=><div key={i} className="rsf-skel"><div className="sk sk1"/><div className="sk sk2"/><div className="sk sk3"/><div className="sk sk4"/></div>)}</div>}
    {items&&items.length===0&&<div className="ex-empty">{err||'Sonuç bulunamadı.'}<div style={{marginTop:12}}><button className="btn sm" onClick={()=>setRoll(r=>r+1)}>Tekrar dene</button></div></div>}
    {items&&items.length>0&&<div className="rsf-grid">{items.map((r,i)=><ResearchFeedCard key={r.id} rec={r} idx={i} saved={savedIds.has(r.id)} onToggleSave={onToggleSave}/>)}</div>}
  </div>);
}

function ResearchSaved({saved,onToggleSave}){
  if(!saved.length)return<div className="ex-empty">No saved articles yet. Hit <b>☆ Save</b> on any article in the <b>Daily Feed</b> — it will appear here.</div>;
  return<div className="rsf-grid">{saved.map((r,i)=><ResearchFeedCard key={r.id} rec={r} idx={i} saved={true} onToggleSave={onToggleSave}/>)}</div>;
}

// The original paste-a-DOI blog, kept as a third "Notlarım" tab.
function ResearchNotes({data,setData}){
  const items=data.researches||[];
  const setItems=arr=>setData({...data,researches:arr});
  const[q,setQ]=useState('');const[openId,setOpenId]=useState(null);
  const add=()=>{const r={id:uid(),title:'',url:'',doi:'',authors:[],authorsText:'',year:'',date:'',journal:'',apa:'',summary:'',tags:'',addedAt:Date.now()};setItems([r,...items]);setOpenId(r.id);};
  const patch=(id,p)=>setItems(items.map(r=>r.id===id?{...r,...p}:r));
  const remove=id=>{if(window.confirm('Bu makale silinsin mi?')){setItems(items.filter(r=>r.id!==id));setOpenId(null);}};
  const ql=q.toLowerCase();
  const list=items.filter(r=>!q||(r.title||'').toLowerCase().includes(ql)||(r.authorsText||'').toLowerCase().includes(ql)||(r.tags||'').toLowerCase().includes(ql)||(r.summary||'').toLowerCase().includes(ql));
  const open=items.find(r=>r.id===openId);
  return(<div>
    <div className="ex-toolbar">
      <div className="ex-search"><span aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg></span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={L('Makale ara…','Search articles…')}/></div>
      <button className="btn sm" onClick={add}>＋ Makale Ekle</button>
    </div>
    {list.length===0&&<div className="ex-empty">Henüz makale yok. <b>＋ Makale Ekle</b> ile ilk özeti oluştur — DOI linkini yapıştırınca yazar/tarih/APA otomatik yazılır.</div>}
    <div className="ex-grid rs-grid">{list.map(r=><ResearchCard key={r.id} rec={r} onOpen={()=>setOpenId(r.id)}/>)}</div>
    {open&&<ResearchModal rec={open} onChange={p=>patch(open.id,p)} onDelete={()=>remove(open.id)} onClose={()=>setOpenId(null)}/>}
  </div>);
}

function ResearchesView({data,setData}){
  const[tab,setTab]=useState('feed');
  const saved=data.savedResearch||[];
  const savedIds=new Set(saved.map(s=>s.id));
  const toggleSave=rec=>{
    if(savedIds.has(rec.id))setData({...data,savedResearch:saved.filter(s=>s.id!==rec.id)});
    else setData({...data,savedResearch:[{...rec,savedAt:Date.now()},...saved]});
  };
  const notesN=(data.researches||[]).length;
  return(<div className="ex-wrap">
    <div className="ex-top">
      <div><h1 className="ex-h1">Researches</h1><div className="sub">6 fresh athlete-only randomized controlled trials every day — abstract + source link. Hover the title to see the Turkish translation.</div></div>
    </div>
    <div className="rsf-tabs">
      <button className={tab==='feed'?'on':''} onClick={()=>setTab('feed')}>📰 Daily Feed</button>
      <button className={tab==='saved'?'on':''} onClick={()=>setTab('saved')}>★ Saved{saved.length?<span className="rsf-tabn">{saved.length}</span>:null}</button>
      <button className={tab==='notes'?'on':''} onClick={()=>setTab('notes')}>✎ My Notes{notesN?<span className="rsf-tabn">{notesN}</span>:null}</button>
    </div>
    {tab==='feed'&&<ResearchFeed savedIds={savedIds} onToggleSave={toggleSave}/>}
    {tab==='saved'&&<ResearchSaved saved={saved} onToggleSave={toggleSave}/>}
    {tab==='notes'&&<ResearchNotes data={data} setData={setData}/>}
  </div>);
}

