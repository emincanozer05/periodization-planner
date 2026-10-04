/* =========================================================
   ATHLETE PROFILE TAB — identity & anthropometrics (auto-pulled),
   training background and injury history (auto).
   ========================================================= */
const SOMATOTYPES=['Ectomorph','Ecto-Mesomorph','Mesomorph','Endo-Mesomorph','Endomorph'];
// Dated coaching notes with arrow navigation. Legacy free-text `constraints`
// is migrated in as the first note so nothing entered before is lost.
function NotesPanel({ath,updAth}){
  const stored=Array.isArray(ath.constraintNotes)?ath.constraintNotes:null;
  const notes=stored||(ath.constraints?[{id:'seed',date:'',text:ath.constraints}]:[]);
  const[idx,setIdx]=useState(0);
  const i=Math.max(0,Math.min(idx,notes.length-1));
  const cur=notes[i];
  const write=n=>updAth(ath.id,{constraintNotes:n});
  const addNote=()=>{const n=[...notes,{id:uid(),date:fmt(today),text:''}];write(n);setIdx(n.length-1);};
  const patch=p=>write(notes.map((x,k)=>k===i?{...x,...p}:x));
  const del=()=>{const n=notes.filter((_,k)=>k!==i);write(n);setIdx(Math.max(0,i-1));};
  return(<div className="panel">
    <div className="notes-head">
      <h2 style={{margin:0}}>{L('Notlar','Notes')}</h2>
      <button className="notes-add" onClick={addNote} title={L('Yeni not ekle','Add a new note')}>+ {L('Not','Note')}</button>
    </div>
    {notes.length===0
      ?<div className="empty-st">{L('Henüz not yok — hareket kısıtları, yük yönetimi riskleri ya da antrenör gözlemleri için bir not ekle.','No notes yet — add one to track movement constraints, load-management risks or coaching observations.')}</div>
      :<React.Fragment>
        <div className="notes-nav">
          <button className="notes-arrow" disabled={i<=0} onClick={()=>setIdx(i-1)} title={L('Önceki not','Previous note')}>‹</button>
          <input type="date" className="notes-date" value={cur.date||''} onChange={e=>patch({date:e.target.value})}/>
          <span className="notes-count">{i+1} / {notes.length}</span>
          <button className="notes-arrow" disabled={i>=notes.length-1} onClick={()=>setIdx(i+1)} title={L('Sonraki not','Next note')}>›</button>
          <button className="notes-del" onClick={del} title={L('Bu notu sil','Delete this note')}>✕</button>
        </div>
        <textarea className="notes-text" rows={6} value={cur.text||''} onChange={e=>patch({text:e.target.value})} placeholder={L('Hareket kısıtları, medikal kısıtlar, yük yönetimi riskleri, sahaya dönüş sınırlamaları…','Movement restrictions, medical constraints, load-management risks, return-to-play limitations…')}/>
      </React.Fragment>}
  </div>);
}
/* ═══ SCOUTING SHEET — the development picture that lives on the Profile tab ═══
   Anthropometry is measured; everything below is judged. A coach rates each
   criterion 1–4, leaves a note beside it, names the archetype the athlete plays
   now and the one they project to, and signs off. All of it is stored under
   `ath.scout`, so nothing here touches the measured/tested records above. */
const SC_SCALE=[
  {n:1,tr:'Geliştirilmeli',en:'Needs work',c:'#ef4444'},
  {n:2,tr:'Yeterli',en:'Adequate',c:'#f59e0b'},
  {n:3,tr:'İyi',en:'Good',c:'#10b981'},
  {n:4,tr:'Üst Düzey',en:'Elite',c:'#3b82f6'},
];
const scColor=v=>(SC_SCALE.find(s=>s.n===v)||{}).c||'var(--text)';
/* Modern position classification — the role an athlete actually plays, rather than
   the 1–5 the jersey says. A coach fills two of these: where the athlete is today,
   and where their development is pointed.

   Each role carries three things: the one-liner shown under the picker, the longer
   definition the analytics literature actually uses for it (usage rate, assist
   percentage, attempt rate, switchability, rim protection — the measurable markers,
   not adjectives), and two players the role is normally illustrated with, so a coach
   can anchor an unfamiliar label to somebody they have watched. */
const SC_POS=[
  {k:'FLG',tr:'Oyun Kurucu',en:'Floor General',
   dTr:'Oyunu yöneten, tempoyu belirleyen, pas öncelikli kurucu.',
   dEn:'Runs the offence, sets the tempo, pass-first lead guard.',
   defTr:'Hücumu yöneten, tempoyu belirleyen pas öncelikli kurucu. Yüksek asist yüzdesi (AST%) ve düşük top kaybı oranıyla tanımlanır: kendi şutundan çok takım arkadaşının şutunu üretir, yarı sahada sistemi kurar ve savunmayı okur.',
   defEn:'The pass-first lead guard who runs the offence and sets the tempo. Defined by a high assist percentage and a low turnover rate: produces teammates\u2019 shots rather than their own, organises the half court and reads the defence.',
   ex:['Chris Paul','Ricky Rubio']},
  {k:'HUG',tr:'Yüksek Kullanımlı Guard',en:'High Usage Guard',
   dTr:'Topu çok elinde tutan, kendi şutunu yaratan skorer guard.',
   dEn:'High-volume ball handler who creates their own shot.',
   defTr:'Topun büyük bölümünü elinde tutan skorer guard. Yüksek kullanım oranıyla (USG% kabaca %28 ve üzeri) ayrılır; pick&roll ve izolasyonda kendi şutunu yaratır. Verimliliği her zaman hacimle birlikte okunur.',
   defEn:'The scoring guard who holds the ball. Marked by a high usage rate (roughly 28% and above) and the ability to create their own shot out of pick-and-roll and isolation. Efficiency for this role is always read next to volume.',
   ex:['Damian Lillard','James Harden']},
  {k:'ESW',tr:'Elit Şutör Kanat',en:'Elite Shooting Wing',
   dTr:'Topsuz hareket ve dış şutla sahayı açan kanat.',
   dEn:'Wing who spaces the floor off the ball with elite shooting.',
   defTr:'Topsuz hareketle sahayı açan, yüksek hacimli dış şutör kanat. Literatürde \u201cgravity\u201d (savunmayı kendine çekme) kavramıyla anılır: yüksek üçlük deneme oranı ve blok arkasından gelen şutlardaki isabet, savunmayı dışarı çekerek pota altını takımın geri kalanına açar.',
   defEn:'The high-volume shooting wing who spaces the floor off the ball. The literature describes this role through \u201cgravity\u201d: a high three-point attempt rate and accuracy coming off screens pull defenders out and open the paint for everyone else.',
   ex:['Klay Thompson','JJ Redick']},
  {k:'VRP',tr:'Çok Yönlü Rol Oyuncusu',en:'Versatile Role Player',
   dTr:'Birden fazla pozisyonu savunan, düşük kullanımla verimli katkı veren oyuncu.',
   dEn:'Defends several positions, contributes efficiently at low usage.',
   defTr:'Düşük kullanımla verimli katkı veren, birden fazla pozisyonu savunabilen oyuncu. \u201c3&D\u201d tanımının genişlemiş hali: köşe üçlüğündeki isabet, doğru rotasyonlar ve savunmada eşleşme değiştirebilme (switchability) temel ölçütleridir.',
   defEn:'The low-usage, efficient contributor who can guard several positions. A broadened version of the \u201c3&D\u201d definition: corner-three accuracy, correct rotations and defensive switchability are the markers.',
   ex:['Mikal Bridges','Andre Iguodala']},
  {k:'SKF',tr:'Yetenekli Forvet',en:'Skilled Forward',
   dTr:'Top sürebilen, pas verebilen ve şut atabilen çok yönlü forvet.',
   dEn:'Forward who can handle, pass and shoot.',
   defTr:'Top sürebilen, pas verebilen ve şut atabilen forvet; takımın ikincil oyun kurucusu. \u201cPoint forward\u201d tanımına yakındır: boy avantajını oyun kurma becerisiyle birleştirdiği için savunmada eşleşme sorunları yaratır.',
   defEn:'The forward who can handle, pass and shoot — the team\u2019s secondary creator. Close to the \u201cpoint forward\u201d definition: size combined with playmaking, which forces mismatches on the other end.',
   ex:['Paul George','Franz Wagner']},
  {k:'MC',tr:'Modern Pivot',en:'Modern Center',
   dTr:'Pick&roll, değişebilen savunma ve dış şut/pas menzili olan çağdaş uzun.',
   dEn:'Modern big: pick-and-roll, switchable defence, shooting or passing range.',
   defTr:'Pick&roll\u2019de hem potaya dalabilen hem dışarı açılabilen, savunmada eşleşme değiştirebilen çağdaş uzun. Ölçütleri: üçlük menzili ya da uzun için yüksek asist yüzdesi, perimetreye çıkacak ayak hareketi ve çember koruması.',
   defEn:'The contemporary big who can both roll and pop, and switch on defence. The markers: three-point range or a high assist percentage for a big, feet quick enough to hold up on the perimeter, and rim protection.',
   ex:['Nikola Jokić','Bam Adebayo']},
  {k:'TC',tr:'Geleneksel Pivot',en:'Traditional Center',
   dTr:'Potaya yakın oynayan, ribaund ve çember koruması ağırlıklı uzun.',
   dEn:'Plays near the rim — rebounding and rim protection first.',
   defTr:'Potaya yakın oynayan klasik uzun. Değeri ribaund yüzdesi, pota altı bitiricilik ve çember koruması (drop savunmada şut engelleme) üzerinden okunur; dış şut menzili bu rolün beklentisi değildir.',
   defEn:'The classic big who plays near the rim. Value is read through rebound percentage, finishing at the rim and rim protection in drop coverage; outside range is not part of the job.',
   ex:['Rudy Gobert','Steven Adams']},
  {k:'OE',tr:'Hücum Motoru',en:'Offensive Engine',
   dTr:'Takımın hücumunu taşıyan birincil skorer ve yaratıcı.',
   dEn:'Carries the offence — primary scorer and creator.',
   defTr:'Takımın hücumunu taşıyan birincil skorer ve yaratıcı. Takımın en yüksek kullanım oranına sahiptir; sahadayken hücum verimi belirgin biçimde yükselir (on/off farkı) ve rakip savunmalar oyun planını ona göre kurar.',
   defEn:'The primary scorer and creator who carries the offence. Carries the team\u2019s highest usage rate; offensive rating rises noticeably with them on the floor (the on/off split), and opposing game plans are built around them.',
   ex:['Luka Dončić','Giannis Antetokounmpo']},
];
const scPos=k=>SC_POS.find(p=>p.k===k)||null;
const SC_TECH=[
  {k:'handling',tr:'Top Hakimiyeti & Dribling',en:'Ball Handling & Dribbling',
   tTr:'Baskı altında topu koruma, iki eli de kullanabilme, dribbling ile avantaj yaratma.',
   tEn:'Protecting the ball under pressure, using both hands, creating an advantage off the dribble.'},
  {k:'shooting',tr:'Şut & Bitiricilik',en:'Shooting & Finishing',
   tTr:'Şut mekaniği ve tutarlılığı, menzil, çember çevresinde temas altında bitirme.',
   tEn:'Shooting mechanics and consistency, range, finishing through contact at the rim.'},
  {k:'passing',tr:'Pas Becerisi & Vizyon',en:'Passing & Vision',
   tTr:'Pas isabeti ve zamanlaması, savunmayı okuma, boştaki oyuncuyu bulma.',
   tEn:'Passing accuracy and timing, reading the defence, finding the open player.'},
  {k:'defOn',tr:'Bireysel Savunma',en:'On-Ball Defence',
   tTr:'Savunma duruşu, ayak hareketi, topu taşıyan oyuncuyu önünde tutabilme.',
   tEn:'Stance, footwork, keeping the ball handler in front.'},
  {k:'defTeam',tr:'Takım Savunması & Taktik IQ',en:'Team Defence & Basketball IQ',
   tTr:'Rotasyonlar, yardım ve geri dönüş, sistemin kurallarını sahada uygulama.',
   tEn:'Rotations, help and recover, applying the system on the floor.'},
  {k:'rebound',tr:'Ribaund (Hücum / Savunma)',en:'Rebounding (Off. / Def.)',
   tTr:'Blok-out, pozisyon alma, ikinci şans toplarına ulaşma isteği.',
   tEn:'Boxing out, positioning, the will to chase second-chance balls.'},
];
const SC_PHYS=[
  {k:'jump',tr:'Dikey Sıçrama / Patlayıcılık',en:'Vertical Jump / Explosiveness',
   tTr:'Tek ve çift ayak sıçrama gücü, ilk adımdaki patlayıcılık.',
   tEn:'One- and two-foot jumping power, explosiveness out of the first step.'},
  {k:'agility',tr:'Çeviklik ve Hız',en:'Agility & Speed',
   tTr:'Yön değiştirme, ivmelenme ve yavaşlama kalitesi, sahadaki düz hız.',
   tEn:'Change of direction, acceleration and deceleration quality, straight-line speed.'},
  {k:'endurance',tr:'Kondisyon / Dayanıklılık',en:'Conditioning / Endurance',
   tTr:'Maç temposunu koruyabilme, tekrarlı sprintler arası toparlanma.',
   tEn:'Holding game tempo, recovery between repeated sprints.'},
  {k:'strength',tr:'Güç / Kuvvet (Strength)',en:'Strength',
   tTr:'Temas dayanımı, gövde kuvveti, pozisyon alma ve koruma gücü.',
   tEn:'Absorbing contact, trunk strength, winning and holding position.'},
  {k:'mobility',tr:'Mobilite & Hareket Kalitesi',en:'Mobility & Movement Quality',
   tTr:'Eklem hareket açıklığı, hareket paternlerinin temizliği, asimetri ve kısıtlar.',
   tEn:'Range of motion, cleanliness of movement patterns, asymmetries and restrictions.'},
];
const SC_MIND=[
  {k:'discipline',tr:'Antrenman Disiplini & İş Ahlakı',en:'Training Discipline & Work Ethic',
   tTr:'Devamlılık, antrenmana hazır gelme, izlenmediğinde de aynı standartta çalışma.',
   tEn:'Attendance, arriving ready, working to the same standard unsupervised.'},
  {k:'coachability',tr:'Koç Edilebilirlik (Coachability)',en:'Coachability',
   tTr:'Geri bildirimi kabul etme, düzeltmeyi sahaya yansıtma hızı.',
   tEn:'Taking feedback, and how quickly a correction shows up on the floor.'},
  {k:'leadership',tr:'Liderlik & İletişim',en:'Leadership & Communication',
   tTr:'Sahada sesli iletişim, takım arkadaşlarını yönlendirme, örnek olma.',
   tEn:'Talking on the floor, directing teammates, setting the example.'},
  {k:'resilience',tr:'Duygusal Dayanıklılık',en:'Emotional Resilience',
   tTr:'Hata, faul ya da skor baskısı sonrası toparlanma; sakinliğini koruma.',
   tEn:'Bouncing back from a mistake, a foul or scoreboard pressure; staying composed.'},
  {k:'competitive',tr:'Rekabetçilik & Kazanma Arzusu',en:'Competitiveness & Will to Win',
   tTr:'Her top için mücadele, antrenmanda bile kazanma isteği.',
   tEn:'Competing for every ball, wanting to win even in practice.'},
];
function ScInfo({tip}){return <span className="sc-info" data-tip={tip}>i</span>;}
/* One rated section: a numbered header, its running average, and the criteria table. */
function ScSection({n,title,desc,items,vals,onSet,children}){
  const scored=items.map(it=>Number((vals[it.k]||{}).s)).filter(v=>v>=1&&v<=4);
  const avg=scored.length?scored.reduce((a,b)=>a+b,0)/scored.length:null;
  return(<div className="sc-sec">
    <div className="sc-sec-h">
      <div className="sc-sec-n">{n}</div>
      <div className="sc-sec-tx">
        <div className="sc-sec-t">{title}</div>
        {desc&&<div className="sc-sec-d">{desc}</div>}
      </div>
      <div className="sc-avg" title={L('Doldurulmuş kriterlerin ortalaması','Average of the criteria you have scored')}>
        <b style={{color:avg==null?'var(--dim)':scColor(Math.round(avg))}}>{avg==null?'—':avg.toFixed(1)}</b>
        <i>{L(`ort · ${scored.length}/${items.length}`,`avg · ${scored.length}/${items.length}`)}</i>
      </div>
    </div>
    <div className="sc-sec-b">
      {children}
      <div className="sc-hdr"><div>{L('Kriter','Criterion')}</div><div>{L('Puan','Score')}</div><div>{L('Not / Gözlem','Note / Observation')}</div></div>
      {items.map(it=>{
        const cur=vals[it.k]||{};
        return(<div key={it.k} className="sc-row">
          <div className="sc-crit">{L(it.tr,it.en)}<ScInfo tip={L(it.tTr,it.tEn)}/></div>
          <div className="sc-scale">
            {SC_SCALE.map(s=><button key={s.n} type="button" className={`sc-dot s${s.n} ${Number(cur.s)===s.n?'on':''}`}
              title={L(`${s.n} — ${s.tr}`,`${s.n} — ${s.en}`)}
              onClick={()=>onSet(it.k,{s:Number(cur.s)===s.n?'':s.n})}>{s.n}</button>)}
          </div>
          <div className="sc-note"><input value={cur.n||''} onChange={e=>onSet(it.k,{n:e.target.value})}
            placeholder={L('Not / gözlem…','Note / observation…')}/></div>
        </div>);
      })}
      <div className="sc-leg">
        {SC_SCALE.map(s=><span key={s.n}><i style={{background:s.c}}/>{s.n} {L(s.tr,s.en)}</span>)}
        <span style={{color:'var(--dim)'}}>{L('Kriterin yanındaki ⓘ işaretine gelerek açıklamayı görebilirsiniz.','Hover the ⓘ beside a criterion for what it means.')}</span>
      </div>
    </div>
  </div>);
}
/* The two archetype boxes: what the athlete plays now, and what they project to.

   A native <select> cannot explain itself — an option is a string and nothing more —
   and these eight labels are exactly the kind a coach meets for the first time here.
   So the picker is built by hand: hovering a role holds its definition and the two
   players it is usually illustrated with in a card below the list, and the same card
   stays under the closed control for whatever is selected. */
function ScPosBox({kind,label,value,onChange}){
  const p=scPos(value);
  const[open,setOpen]=useState(false);
  const[hov,setHov]=useState(null);
  const boxRef=useRef(null);
  // Clicking anywhere else, or Escape, closes the list — a coach should not have to
  // find the button again to get rid of it.
  useEffect(()=>{
    if(!open)return;
    const onDown=e=>{if(boxRef.current&&!boxRef.current.contains(e.target))setOpen(false);};
    const onKey=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',onDown);
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
  },[open]);
  // The card follows the pointer while the list is open, and falls back to whatever is
  // selected, so it never blinks empty between two rows.
  const card=scPos(hov)||p;
  return(<div className={`sc-pos ${kind}`}>
    <div className="sc-pos-k"><span>{label}</span>{p&&<span className="sc-pos-code">{p.k}</span>}</div>
    <div className="sc-posdd" ref={boxRef}>
      <button type="button" className={`sc-posdd-btn ${open?'on':''}`} onClick={()=>setOpen(o=>!o)}>
        <span className="sc-posdd-cur">{p?L(`${p.tr} (${p.en} — ${p.k})`,`${p.en} (${p.k})`):L('— seçilmedi —','— not set —')}</span>
        <span className="sc-posdd-car">▾</span>
      </button>
      {open&&<div className="sc-posdd-menu">
        <div className="sc-posdd-list" onMouseLeave={()=>setHov(null)}>
          <button type="button" className={`sc-posdd-it ${value?'':'on'}`}
            onMouseEnter={()=>setHov(null)}
            onClick={()=>{onChange('');setOpen(false);setHov(null);}}>
            <i>—</i><span>{L('seçilmedi','not set')}</span>
          </button>
          {SC_POS.map(o=><button key={o.k} type="button"
            className={`sc-posdd-it ${value===o.k?'on':''} ${hov===o.k?'hv':''}`}
            onMouseEnter={()=>setHov(o.k)} onFocus={()=>setHov(o.k)}
            onClick={()=>{onChange(o.k);setOpen(false);setHov(null);}}>
            <i>{o.k}</i><span>{L(`${o.tr} (${o.en})`,o.en)}</span>
          </button>)}
        </div>
        <div className="sc-poscard">
          {card?<React.Fragment>
            <div className="sc-poscard-h"><b>{card.k}</b>{L(card.tr,card.en)}</div>
            <div className="sc-poscard-d">{L(card.defTr,card.defEn)}</div>
            <div className="sc-poscard-l">{L('Örnek oyuncular','Example players')}</div>
            <div className="sc-poscard-p">{card.ex.map(x=><span key={x}>{x}</span>)}</div>
          </React.Fragment>:
          <div className="sc-poscard-e">{L('Bir rolün üzerine gelince ne anlama geldiği ve örnek oyuncuları burada görünür.','Hover a role to see what it means and the players it is illustrated with.')}</div>}
        </div>
      </div>}
    </div>
    {p?<div className="sc-pos-sel">
      <div className="sc-pos-d">{L(p.defTr,p.defEn)}</div>
      <div className="sc-poscard-l">{L('Örnek oyuncular','Example players')}</div>
      <div className="sc-poscard-p">{p.ex.map(x=><span key={x}>{x}</span>)}</div>
    </div>:
    <div className="sc-pos-d">{L('Modern pozisyon sınıflandırmasından bir rol seç.','Pick a role from the modern position classification.')}</div>}
  </div>);
}
function ProfileTab({ath,updAth,setup}){
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  // Anthropometrics auto-pulled from the most recent dated measurement/test record,
  // falling back to the static profile fields entered via ✎ Edit Profile.
  const pull=k=>{
    const src=[...(ath.measurements||[]),...(ath.tests||[])]
      .filter(x=>x.date&&x[k]!==''&&x[k]!=null&&!isNaN(Number(x[k])))
      .sort((a,b)=>a.date.localeCompare(b.date));
    const last=src[src.length-1];
    return last?{v:Number(last[k]),date:last.date}:null;
  };
  const h=pull('height')||(Number(ath.height)?{v:Number(ath.height)}:null);
  const w=pull('weight')||(Number(ath.weight)?{v:Number(ath.weight)}:null);
  const ws=pull('wingspan');
  const inj=(ath.injuries||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const srcLbl=x=>x?(x.date?L(`son ölçüm ${fd(x.date)}`,`last measured ${fd(x.date)}`):L('profilden','from profile')):L('henüz veri yok','no data yet');
  /* The scouting sheet. One object on the athlete, patched field by field — the
     ratings above never overwrite each other because each group is merged in. */
  const sc=ath.scout||{};
  const setSc=patch=>updAth(ath.id,{scout:{...sc,...patch}});
  const grp=g=>sc[g]||{};
  const setCrit=g=>(k,patch)=>setSc({[g]:{...grp(g),[k]:{...(grp(g)[k]||{}),...patch}}});
  const setField=(g,k)=>v=>setSc({[g]:{...grp(g),[k]:v}});
  const proj=grp('projection'),verdict=grp('verdict');
  return(<div>
    <div className="ath-stat-row" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))'}}>
      <div className="ath-stat"><div className="k">{L('Yaş','Age')}</div><div className="v">{age!=null?age:'—'}<span className="u">{L('yıl','yrs')}</span></div><div className="sub">{ath.dateOfBirth?L(`d. ${fd(ath.dateOfBirth)}`,`b. ${fd(ath.dateOfBirth)}`):L('doğum tarihini ✎ ile gir','set date of birth via ✎')}</div></div>
      <div className="ath-stat"><div className="k">{L('Boy','Height')}</div><div className="v">{h?h.v:'—'}<span className="u">cm</span></div><div className="sub">{srcLbl(h)}</div></div>
      <div className="ath-stat"><div className="k">{L('Kilo','Weight')}</div><div className="v">{w?w.v:'—'}<span className="u">kg</span></div><div className="sub">{srcLbl(w)}</div></div>
      <div className="ath-stat"><div className="k">{L('Kulaç','Wingspan')}</div><div className="v">{ws?ws.v:'—'}<span className="u">cm</span></div><div className="sub">{srcLbl(ws)}</div></div>
    </div>
    <div className="sc-wrap">
      {/* ── 1 · modern position, now and projected ── */}
      <div className="sc-sec">
        <div className="sc-sec-h">
          <div className="sc-sec-n">1</div>
          <div className="sc-sec-tx">
            <div className="sc-sec-t">{L('Modern Pozisyon','Modern Position')}</div>
            <div className="sc-sec-d">{L('Formadaki numara değil, sahada oynanan rol — bugünkü hali ve gelişimin işaret ettiği hedef.','Not the number on the jersey but the role played on court — where they are today, and where development points.')}</div>
          </div>
        </div>
        <div className="sc-sec-b" style={{paddingTop:16}}>
          <div className="sc-pos2">
            <ScPosBox kind="now" label={L('Mevcut','Current')} value={sc.posNow} onChange={v=>setSc({posNow:v})}/>
            <ScPosBox kind="pot" label={L('Potansiyel','Potential')} value={sc.posPot} onChange={v=>setSc({posPot:v})}/>
          </div>
        </div>
      </div>
      {/* ── 2 · technical & tactical ── */}
      <ScSection n={2} title={L('Teknik ve Taktik Değerlendirme','Technical & Tactical Assessment')}
        desc={L('Topla ve topsuz oyunun sahadaki karşılığı.','What the game looks like on the floor, with the ball and without it.')}
        items={SC_TECH} vals={grp('tech')} onSet={setCrit('tech')}/>
      {/* ── 3 · physical development ── */}
      <ScSection n={3} title={L('Fiziksel Gelişim & Atletik Performans','Physical Development & Athletic Performance')}
        desc={L('Boy, kilo ve kulaç yukarıdaki ölçüm kartlarından okunur — burası atletik niteliklerin değerlendirmesi.','Height, weight and wingspan are read from the measurement cards above — this section rates athletic qualities.')}
        items={SC_PHYS} vals={grp('phys')} onSet={setCrit('phys')}/>
      {/* ── 4 · mental, character & social ── */}
      <ScSection n={4} title={L('Zihinsel, Karakter ve Sosyal Beceriler','Mental, Character & Social Skills')}
        desc={L('Yeteneğin ne kadarının sahaya çıkacağını belirleyen taraf.','The side of an athlete that decides how much of the talent reaches the floor.')}
        items={SC_MIND} vals={grp('mind')} onSet={setCrit('mind')}/>
      {/* ── 5 · scouting projection ── */}
      <div className="sc-sec">
        <div className="sc-sec-h">
          <div className="sc-sec-n">5</div>
          <div className="sc-sec-tx">
            <div className="sc-sec-t">{L('Scout Projeksiyonu','Scouting Projection')}</div>
            <div className="sc-sec-d">{L('Modern pozisyon sınıflandırmasına dayalı, geleceğe dönük değerlendirme.','A forward-looking read, built on the modern position classification.')}</div>
          </div>
        </div>
        <div className="sc-sec-b" style={{paddingTop:16}}>
          <div className="sc-grid">
            <div className="sc-f wide">
              <label>{L('Potansiyel Tavan (Ceiling)','Ceiling')}</label>
              <textarea value={proj.ceiling||''} onChange={e=>setField('projection','ceiling')(e.target.value)}
                placeholder={L('Örn: BSL rotasyon oyuncusu / EuroLeague seviyesi / NBA potansiyeli','e.g. domestic-league rotation player / EuroLeague level / NBA potential')}/>
              <div className="help">{L('Sporcu gelişimini tamamlarsa ulaşabileceği en yüksek seviyeyi yaz ve bu seviyeye neden inandığını kısaca açıkla.','Name the highest level this athlete could reach if development goes well, and say briefly why you believe it.')}</div>
            </div>
            <div className="sc-f">
              <label>{L('Üst Yapıya Hazır Olma Yaşı','Age Ready for the Senior Level')}</label>
              <input value={proj.readyAge||''} onChange={e=>setField('projection','readyAge')(e.target.value)}
                placeholder={L('Örn: 19–20 yaş','e.g. 19–20')}/>
            </div>
            <div className="sc-f">
              <label>{L('Risk Faktörü (Gelişim / Performans)','Risk Factor (Development / Performance)')}</label>
              <input value={proj.risk||''} onChange={e=>setField('projection','risk')(e.target.value)}
                placeholder={L('Örn: fiziksel gelişim geride, karakter/motivasyon soru işaretli','e.g. physically behind, questions over character / motivation')}/>
            </div>
            <div className="sc-f wide">
              <label>{L('Sağlık / Sakatlık Geçmişi','Health / Injury History')}</label>
              <input value={proj.health||''} onChange={e=>setField('projection','health')(e.target.value)}
                placeholder={L('Örn: geçmiş sakatlık, tekrarlayan sakatlık riski, dayanıklılık endişesi','e.g. past injury, recurring injury risk, durability concern')}/>
            </div>
          </div>
        </div>
      </div>
      {/* ── 6 · the coach's verdict ── */}
      <div className="sc-sec">
        <div className="sc-sec-h">
          <div className="sc-sec-n">6</div>
          <div className="sc-sec-tx">
            <div className="sc-sec-t">{L('Antrenör Genel Değerlendirmesi','Coach’s Overall Assessment')}</div>
            <div className="sc-sec-d">{L('Güçlü yönler, öncelikli gelişim alanları ve gelecek dönem hedefleri.','Strengths, the development priorities, and the targets for the coming period.')}</div>
          </div>
        </div>
        <div className="sc-sec-b" style={{paddingTop:16}}>
          <div className="sc-grid">
            <div className="sc-f wide tall">
              <label>{L('Genel değerlendirme','Overall assessment')}</label>
              <textarea value={verdict.summary||''} onChange={e=>setField('verdict','summary')(e.target.value)}
                placeholder={L('Güçlü yönler, öncelikli gelişim alanları ve gelecek dönem hedefleri…','Strengths, development priorities and targets for the coming period…')}/>
            </div>
            <div className="sc-f">
              <label>{L('Antrenör','Coach')}</label>
              <input value={verdict.coach||''} onChange={e=>setField('verdict','coach')(e.target.value)}
                placeholder={L('Ad soyad','Full name')}/>
            </div>
            <div className="sc-f">
              <label>{L('Tarih','Date')}</label>
              <input value={verdict.date||''} onChange={e=>setField('verdict','date')(e.target.value)}
                placeholder={L('gg/aa/yyyy','dd/mm/yyyy')}/>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="pf-cols">
      <div className="panel">
        <h2>{L('Sakatlık Geçmişi','Injury History')}<span className="pf-auto">{L('otomatik','auto')}</span></h2>
        {inj.length===0&&<div className="empty-st">{L('Kayıtlı sakatlık yok — Sakatlıklar sekmesinden senkronlanır','No injuries recorded — syncs from the Injuries tab')}</div>}
        {inj.map((i,ix)=>{const active=!i.actualReturn;return(
          <div key={i.id||ix} className="pf-injrow">
            <span className="d">{i.date?fd(i.date):'—'}</span>
            <span className="t">{i.location||i.type||L('(belirtilmemiş)','(unspecified)')}{i.tissueType?` · ${i.tissueType}`:''}{i.grade?` · ${L('Derece','Grade')} ${i.grade}`:''}</span>
            <span className={`inj-pill ${active?'inj':'ok'}`}>{active?L('AKTİF','ACTIVE'):L('İYİLEŞTİ','RECOVERED')}</span>
          </div>);})}
      </div>
      <NotesPanel ath={ath} updAth={updAth}/>
    </div>
  </div>);
}
/* ═══ ATHLETE TRAINING PROFILE — the tab beside Profile ═══
   Three sections on the same cards the scouting sheet uses. The first two are the
   coach's and are written straight onto `ath.trainingProfile`; the third is drawn
   from the calendar and cannot be edited, only read. Nothing here selects an exercise
   or builds a session — the profile reaches programming through the individualization
   JSON (atpSnapshot), as context.

   Every term is stored in English and drawn through atpT(), so the tab reads in the app
   language while the JSON keeps one vocabulary. Much of it is set in capitals by CSS,
   and <html lang> follows the app language — so a Turkish label gets its dotted
   capitals ("İVMELENME") and an English one stays "TRAINING". */
const atpBars=n=><i className={`atp-bars b${n}`} aria-hidden="true"><s/><s/><s/></i>;
function AtpSecHead({n,title,desc,children}){
  return(<div className="sc-sec-h">
    <div className="sc-sec-n">{n}</div>
    <div className="sc-sec-tx"><div className="sc-sec-t">{title}</div><div className="sc-sec-d">{desc}</div></div>
    {children&&<div className="atp-hcnt">{children}</div>}
  </div>);
}
function AtpGrpHead({title,n,of}){
  return(<div className="atp-grp-h">
    <div className="atp-grp-t">{title}</div>
    <span className="atp-grp-c"><b>{n}</b>/{of}</span>
  </div>);
}
/* A quality's name in the app language. In Turkish the English term it is stored and
   sent as is kept on hover — it is the word the JSON carries. */
const AtpName=({en})=><span className="atp-it-l" title={REPORT_LANG==='tr'?en:undefined}>{atpT(en)}</span>;
/* The seven groups in two columns of near-equal height: Speed, Change of Direction,
   Plyometric / Reactive and Power (9 qualities under four headers) beside Strength,
   Movement Quality and Conditioning (9 under three). The last card of each column
   takes up the few pixels between them; on a narrow screen the columns fold into one
   list in the template's own order. */
const ATP_COLS=[['speed','cod','plyo','power'],['strength','movement','conditioning']];
function AtpProfile({q,onSet}){
  const rated=ATP_QUALITIES.filter(it=>q[it.id]);
  const byPri=id=>rated.filter(it=>q[it.id].priority===id);
  const chip=it=>(
    <span key={it.id} className="atp-chip"
      title={`${atpT(it.group)}${REPORT_LANG==='tr'?` · ${it.en}`:''}`}>
      <i className="atp-chip-dot"/>{atpT(it.en)}
      <button onClick={()=>onSet(it.id,'priority',q[it.id].priority)} title={L('Önceliği kaldır','Clear priority')}
        aria-label={L(`${atpT(it.en)} önceliğini kaldır`,`Clear ${it.en} priority`)}>✕</button></span>);
  const group=g=>{const n=g.items.filter(it=>q[it.id]).length;return(
    <div key={g.id} className="atp-grp" style={{order:ATP_GROUPS.indexOf(g)}}>
      <AtpGrpHead title={atpT(g.en)} n={n} of={g.items.length}/>
      <div className="atp-its">{g.items.map(it=>{const r=q[it.id]||{};return(
        <div key={it.id} className={`atp-it mv${r.priority?` set pr-${r.priority}`:''}`}>
          <span className="atp-it-n"><AtpName en={it.en}/></span>
          <div className="atp-seg" role="group" aria-label={`${atpT(it.en)} — ${atpT('Priority')}`}>{ATP_PRIORITY.map(p=>
            <button key={p.id} className={`pr-${p.id}${r.priority===p.id?' on':''}`} aria-pressed={r.priority===p.id} aria-label={atpT(p.en)}
              title={`${atpT('Priority')}: ${atpT(p.en)} — ${L(p.dTr,p.dEn)}`} onClick={()=>onSet(it.id,'priority',p.id)}>{atpBars(p.bars)}{atpAb(p)}</button>)}</div>
        </div>);})}</div>
    </div>);};
  return(<div className="sc-sec" id="atp-s1">
    <AtpSecHead n={1} title={atpT('Athletic Profile')}
      desc={L(`Her fiziksel kalite için Öncelik — bu dönemde ne kadar geliştirileceği. Performans verileri, test sonuçları, antrenman geçmişi ve antrenör değerlendirmesiyle belirlenir. Öncelik verilmeyen kalite Düşük gibi korunur.`,
        `A Priority for every physical quality — how much this period develops it. Set from performance data, test results, training history and the coach’s judgement. A quality left unrated is maintained, like Low.`)}/>
    <div className="sc-sec-b">
      <div className="atp-key">
        <div className="atp-key-g"><span className="atp-key-k">{atpT('Priority')}</span>
          {ATP_PRIORITY.map(p=><span key={p.id} className="atp-key-i"><span className={`atp-tag pr-${p.id}`}>{atpBars(p.bars)}{atpT(p.en)}</span>{L(p.dTr,p.dEn)}</span>)}</div>
      </div>
      <div className="atp-lanes">{ATP_PRIORITY.map(p=>{const its=byPri(p.id);return(
        <div key={p.id} className={`atp-lane pr-${p.id}`}>
          <div className="atp-lane-h"><span className="atp-lane-t">{atpBars(p.bars)}{atpT(p.en)}</span><span className="atp-lane-n">{its.length}</span></div>
          <div className="atp-chips">{its.length?its.map(chip)
            :<span className="atp-empty">{L('Henüz yok — aşağıdan seç.','Nothing yet — pick from below.')}</span>}</div>
        </div>);})}</div>
      <div className="atp-gwrap"><div className="atp-mgrid">{ATP_COLS.map((col,ci)=>
        <div key={ci} className="atp-mcol">{col.map(id=>group(ATP_GROUPS.find(g=>g.id===id)))}</div>)}</div></div>
    </div>
  </div>);
}
/* A constraint as the coach reads it: a catalogue entry in the app language, one the
   coach typed exactly as it was typed. */
const atpConShow=c=>atpConDef(c&&c.id)?atpT(atpConLabel(c)):atpConLabel(c);
function AtpConPanel({kind,list,other,onList}){
  const[open,setOpen]=useState(false);
  const[cat,setCat]=useState('suggest');
  const[custom,setCustom]=useState('');
  const[customCat,setCustomCat]=useState('load');
  const[msg,setMsg]=useState('');
  const hard=kind==='hard';
  const mine=new Set(list.map(c=>c.id)),theirs=new Set(other.map(c=>c.id));
  const otherName=atpT(hard?'Soft':'Hard');
  const add=id=>{if(!mine.has(id)&&!theirs.has(id))onList([...list,{id}]);};
  const remove=id=>onList(list.filter(c=>c.id!==id));
  const patch=(id,p)=>onList(list.map(c=>c.id===id?{...c,...p}:c));
  const low=x=>String(x||'').trim().toLocaleLowerCase(REPORT_LANG==='tr'?'tr-TR':'en-US');
  /* A typed constraint that names a catalogue entry IS that entry — in either language —
     so the same rule can never sit on the list twice, or on both lists, just because it
     was typed. */
  const addCustom=()=>{
    const t=custom.trim();if(!t)return;
    const hit=ATP_CONSTRAINTS.find(c=>low(c.en)===low(t)||low(atpT(c.en))===low(t));
    if(hit){
      if(theirs.has(hit.id)){setMsg(L(`"${atpT(hit.en)}" zaten ${otherName} listesinde.`,`"${hit.en}" is already on the ${otherName} list.`));return;}
      if(!atpConFits(hit,kind)){setMsg(L(`"${atpT(hit.en)}" yalnızca ${otherName} olabilir.`,`"${hit.en}" can only be ${otherName}.`));return;}
      add(hit.id);
    }else{
      if([...list,...other].some(c=>low(atpConLabel(c))===low(t)||low(atpConShow(c))===low(t))){setMsg(L('Bu kısıt zaten ekli.','That constraint is already there.'));return;}
      onList([...list,{id:'c_'+uid(),label:t,cat:customCat}]);
    }
    setCustom('');setMsg('');
  };
  const opts=(cat==='suggest'?ATP_CON_SUGGEST[kind].map(atpConDef):ATP_CONSTRAINTS.filter(c=>c.cat===cat)).filter(Boolean);
  return(<div className={`atp-con ${kind}`}>
    <div className="atp-con-h">
      <span className="atp-con-badge">{atpT(hard?'Hard':'Soft')}</span>
      <div className="atp-con-tx">
        <div className="atp-con-t">{atpT(hard?'Hard Constraints':'Soft Constraints')}</div>
        <div className="atp-con-d">{hard?L('Kesin olarak uyulması gereken kısıtlamalar.','Rules that must be followed, without exception.')
          :L('Kesin yasak olmayan; tercih edilen veya sınırlandırılması gereken durumlar.','Not prohibitions — preferences, or things to keep limited.')}</div>
      </div>
      <span className="atp-con-n">{list.length}</span>
    </div>
    <div className="atp-con-list">
      {list.length===0&&<div className="atp-con-none">{hard?L('Kesin kısıt yok.','No hard constraints.'):L('Esnek kısıt yok.','No soft constraints.')}</div>}
      {list.map(c=>{const d=atpConDef(c.id);const withVal=!!(d&&d.ph);return(
        <div key={c.id} className="atp-con-row">
          <div className="atp-con-top">
            {atpCatLabel(atpConCat(c))?<span className="atp-con-cat">{atpT(atpCatLabel(atpConCat(c)))}</span>
              :<span className="atp-con-cat">{L('Diğer','Other')}</span>}
            <span className="atp-con-l" title={d&&REPORT_LANG==='tr'?d.en:undefined}>{atpConShow(c)}</span>
            <button className="atp-x" onClick={()=>remove(c.id)} title={L('Kısıtı kaldır','Remove constraint')} aria-label={L('Kısıtı kaldır','Remove constraint')}>✕</button>
          </div>
          <div className={`atp-con-in${withVal?' two':''}`}>
            {withVal&&<input value={c.value||''} onChange={e=>patch(c.id,{value:e.target.value})} placeholder={L(d.ph[0],d.ph[1])}
              aria-label={L('Değer','Value')}/>}
            <input value={c.note||''} onChange={e=>patch(c.id,{note:e.target.value})}
              placeholder={L('Not — bölge, süre, gerekçe…','Note — region, duration, reason…')} aria-label={L('Not','Note')}/>
          </div>
        </div>);})}
    </div>
    <button className="atp-con-add" onClick={()=>{setOpen(o=>!o);setMsg('');}}>{open?L('Kapat','Close'):L('+ Kısıt ekle','+ Add constraint')}</button>
    {open&&<div className="atp-pick">
      <div className="atp-pick-tabs">
        <button className={cat==='suggest'?'on':''} onClick={()=>setCat('suggest')}>{L('Önerilen','Suggested')}</button>
        {ATP_CON_CATS.map(k=><button key={k.id} className={cat===k.id?'on':''} onClick={()=>setCat(k.id)}>{atpT(k.en)}</button>)}
      </div>
      <div className="atp-pick-list">{opts.map(d=>{
        const on=mine.has(d.id),elsewhere=theirs.has(d.id),fits=atpConFits(d,kind);
        const why=elsewhere?L(`${otherName} listesinde — bir kısıt iki listede birden olamaz.`,`On the ${otherName} list — a constraint cannot be on both.`)
          :!fits?L(`Bu kısıt yalnızca ${otherName} olabilir.`,`This constraint can only be ${otherName}.`):undefined;
        return<button key={d.id} className={`atp-opt${on?' on':''}`} disabled={!on&&(elsewhere||!fits)} title={why}
          onClick={()=>on?remove(d.id):add(d.id)}>{on?'✓':'+'} {atpT(d.en)}{elsewhere&&<i>{otherName}</i>}</button>;})}</div>
      <div className="atp-pick-custom">
        <select value={customCat} onChange={e=>setCustomCat(e.target.value)} aria-label={L('Kategori','Category')}>
          {ATP_CON_CATS.map(k=><option key={k.id} value={k.id}>{atpT(k.en)}</option>)}</select>
        <input value={custom} onChange={e=>{setCustom(e.target.value);setMsg('');}} onKeyDown={e=>{if(e.key==='Enter')addCustom();}}
          placeholder={L('Özel kısıt yaz…','Write a custom constraint…')}/>
        <button onClick={addCustom} disabled={!custom.trim()}>{L('Ekle','Add')}</button>
      </div>
      {msg&&<div className="atp-pick-msg">{msg}</div>}
    </div>}
  </div>);
}
function AtpConstraints({con,onChange}){
  return(<div className="sc-sec" id="atp-s2">
    <AtpSecHead n={2} title={atpT('Constraints')}
      desc={L('Antrenmanda dikkate alınması gereken sınırlamalar ve tercihler. Kesin ve Esnek kısıtlar kesinlikle ayrı tutulur — bir kısıt yalnızca bir listede bulunabilir.',
        'The limits and preferences training has to take into account. Hard and Soft are kept strictly apart — a constraint can sit on one list only.')}>
      <span className="atp-hc cn-hard"><i/>{atpT('Hard')}<b>{con.hard.length}</b></span>
      <span className="atp-hc cn-soft"><i/>{atpT('Soft')}<b>{con.soft.length}</b></span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-con2">
        <AtpConPanel kind="hard" list={con.hard} other={con.soft} onList={l=>onChange({...con,hard:l})}/>
        <AtpConPanel kind="soft" list={con.soft} other={con.hard} onList={l=>onChange({...con,soft:l})}/>
      </div>
    </div>
  </div>);
}
/* The four ways a set is filed besides the exercise itself, one at a time on a tab. */
const ATP_EXP_LAYERS=[
  {id:'patterns',en:'Movement Pattern',      dTr:'Hareketin çalıştırdığı patern',dEn:'What the movement trains',fixed:true},
  {id:'stimuli', en:'Athletic Stimulus',     dTr:'Verilen atletik talep',dEn:'The athletic demand delivered',fixed:true},
  {id:'loading', en:'Loading Characteristic',dTr:'Vücudun nasıl yüklendiği',dEn:'How the body was loaded',fixed:true},
  {id:'families',en:'Exercise Family',       dTr:'Birbiriyle ilişkili egzersiz grupları',dEn:'Groups of related exercises',fixed:false},
];
function AtpExposure({exp,refDate,setRefDate}){
  const[win,setWin]=useState('d7');
  const[all,setAll]=useState(false);
  const[lay,setLay]=useState('patterns');
  const lv=id=>ATP_EXP_LEVELS.find(x=>x.id===id)||ATP_EXP_LEVELS[0];
  const pill=id=><span className={`atp-lv x-${id}`} title={L(lv(id).dTr,lv(id).dEn)}>{atpAb(lv(id))}</span>;
  const byWin=list=>list.filter(t=>t.sets[win]>0)
    .sort((a,b)=>(b.sets[win]-a.sets[win])||String(b.lastUsed||'').localeCompare(String(a.lastUsed||'')));
  const exRows=byWin(exp.exercises);
  const shown=all?exRows:exRows.slice(0,10);
  const W=ATP_EXP_WINDOWS.find(w=>w.id===win);
  const totalSets=exRows.reduce((n,t)=>n+t.sets[win],0);
  /* One row: a name, a bar as long as its share of the busiest row, the set count and the
     level. The bar is only there to be compared down the list; the level is the reading. */
  const bar=(t,max)=><span className={`atp-ly-bar x-${t.level[win]}`}><i style={{width:`${Math.max(6,Math.round(t.sets[win]/max*100))}%`}}/></span>;
  const L0=ATP_EXP_LAYERS.find(x=>x.id===lay);
  const lList=exp[lay]||[];
  const lOn=byWin(lList),lMax=Math.max(1,...lOn.map(t=>t.sets[win]));
  const lOff=L0.fixed?lList.filter(t=>!(t.sets[win]>0)):[];
  const exMax=Math.max(1,...exRows.map(t=>t.sets[win]));
  const stats=win==='last'
    ?[[L('Seans','Session'),exp.last?fd(exp.last.date):'—',exp.last&&exp.last.name],
      [L('Egzersiz','Exercises'),exRows.length],[L('Toplam set','Total sets'),totalSets]]
    :[[L('Aralık','Window'),`${fd(exp.from[win])} – ${fd(exp.end)}`],[L('Seans','Sessions'),exp.sessions[win]],
      [L('Egzersiz','Exercises'),exRows.length],[L('Toplam set','Total sets'),totalSets]];
  return(<div className="sc-sec" id="atp-s3">
    <AtpSecHead n={3} title={atpT('Exercise Exposure')}
      desc={L('Sporcunun takvimindeki antrenman kayıtlarından otomatik oluşur: seçilen aralıkta hangi egzersize ve hangi kategoriye kaç set maruz kaldığı. Düzey set sayısından okunur.',
        'Built automatically from the training records on the athlete’s calendar: how many sets of which exercise and which category the athlete did in the chosen window. The level is read from the set count.')}>
      <span className="atp-hc atp-auto">{L('Otomatik','Automatic')}</span>
    </AtpSecHead>
    <div className="sc-sec-b">
      <div className="atp-xbar">
        <div className="atp-wseg" role="tablist">{ATP_EXP_WINDOWS.map(w=>
          <button key={w.id} role="tab" aria-selected={win===w.id} className={win===w.id?'on':''} onClick={()=>setWin(w.id)}>{atpT(w.en)}</button>)}</div>
        <label className="atp-ref"><span>{L('Referans günü','Reference day')}</span>
          <input type="date" value={refDate} onChange={e=>setRefDate(e.target.value)}/></label>
      </div>
      {!exp.last?<div className="atp-xempty">{L('Takvimde egzersiz kaydı yok. Egzersiz maruziyeti, sporcunun takvimine yazılan seanslardan — takım seansları dahil — kendiliğinden oluşur.',
          'No exercise on the calendar yet. Exercise Exposure builds itself from the sessions on the athlete’s calendar, team sessions included.')}</div>
      :<>
        <div className="atp-xstats">{stats.map(([k,v,sub])=>
          <div key={k} className={`atp-xstat${String(v).length>12?' wide':''}`}><div className="k">{k}</div><div className="v">{v}</div>{sub&&<div className="s">{sub}</div>}</div>)}
          <div className="atp-xleg" title={L('Düzey, seçilen aralıktaki set sayısından okunur (gün aralıkları haftalık ortalamayla).','The level is read from the set count in the window (day windows as a weekly average).')}>
            <div className="k">{L('Maruziyet düzeyi','Exposure level')}</div>
            <div className="l">{ATP_EXP_LEVELS.slice(1).map(l=><span key={l.id}><i className={`atp-sw x-${l.id}`}/>{atpT(l.en)}</span>)}</div>
          </div>
        </div>
        <div className="atp-xcols">
          <div className="atp-grp">
            <div className="atp-grp-h">
              <div><div className="atp-grp-t">{atpT('Exercise')}</div><div className="atp-grp-s">{atpT(W.en)}</div></div>
              <span className="atp-grp-c"><b>{exRows.length}</b></span>
            </div>
            {exRows.length===0?<div className="atp-ly-empty">{L('Bu aralıkta egzersiz kaydı yok.','No exercise in this window.')}</div>
            :shown.map(t=>{const l=t.level[win];return(
              <div key={t.key} className="atp-ex-r">
                <div className="atp-ex-tx">
                  <div className="atp-ex-n" title={t.label}>{t.label}</div>
                  <div className="atp-ex-m">{atpT(t.family)} · {L('son','last')} {fd(t.lastUsed)} · <span title={L('Son 28 günde yer aldığı seans sayısı','Sessions it appeared in over the last 28 days')}>{t.freq28}× / {L('28 gün','28 d')}</span></div>
                </div>
                {bar(t,exMax)}
                <span className="atp-ly-s">{t.sets[win]} set</span>
                {pill(l)}
              </div>);})}
            {exRows.length>10&&<button className="atp-xt-more" onClick={()=>setAll(a=>!a)}>{all?L('Daralt','Collapse'):L(`Tümünü göster (${exRows.length})`,`Show all (${exRows.length})`)}</button>}
          </div>
          <div className="atp-grp">
            <div className="atp-xtabs" role="tablist">{ATP_EXP_LAYERS.map(x=>
              <button key={x.id} role="tab" aria-selected={lay===x.id} className={lay===x.id?'on':''} onClick={()=>setLay(x.id)}>{atpT(x.en)}</button>)}</div>
            <div className="atp-xtab-d"><span>{L(L0.dTr,L0.dEn)}</span><span className="atp-grp-c"><b>{lOn.length}</b>{L0.fixed?`/${lList.length}`:''}</span></div>
            {lOn.length===0&&<div className="atp-ly-empty">{L('Bu aralıkta maruziyet yok.','No exposure in this window.')}</div>}
            {lOn.map(t=>
              <div key={t.key} className="atp-ly-r">
                <span className="atp-ly-n" title={atpT(t.label)}>{atpT(t.label)}</span>
                {bar(t,lMax)}
                <span className="atp-ly-s">{t.sets[win]} set</span>
                {pill(t.level[win])}
              </div>)}
            {lOff.length>0&&<div className="atp-ly-none"><div className="k">{L('Bu aralıkta yok','Not in this window')}</div>
              <div className="l">{lOff.map(t=><span key={t.key}>{atpT(t.label)}</span>)}</div></div>}
          </div>
        </div>
      </>}
    </div>
  </div>);
}
function TrainingProfileTab({ath,updAth,exercises}){
  const tp=atpRead(ath);
  const raw=(ath.trainingProfile&&typeof ath.trainingProfile==='object')?ath.trainingProfile:{};
  /* A save always writes the profile in the template's shape; the two sections it
     replaced (priorities, movement) are read into it by atpRead and not kept. */
  const save=patch=>{const{priorities,movement,...rest}=raw;
    updAth(ath.id,{trainingProfile:{...rest,qualities:tp.qualities,...patch,updated:fmt(new Date())}});};
  const libMap=useMemo(()=>atpLibMap(exercises),[exercises]);
  const[refDate,setRefDate]=useState(()=>fmt(today));
  const refOk=/^\d{4}-\d{2}-\d{2}$/.test(refDate||'')?refDate:fmt(today);
  const exp=useMemo(()=>atpExposure(ath,refOk,{libMap}),[ath.days,libMap,refOk]);
  /* Clicking the priority that is already on takes it off again. */
  const setQ=(id,field,v)=>{
    const cur={...(tp.qualities[id]||{})};
    if(cur[field]===v)delete cur[field];else cur[field]=v;
    const nx={...tp.qualities};
    if(cur.priority)nx[id]=cur;else delete nx[id];
    save({qualities:nx});
  };
  const rated=ATP_QUALITIES.filter(it=>tp.qualities[it.id]);
  const nP=id=>rated.filter(it=>tp.qualities[it.id].priority===id).length;
  const high=rated.filter(it=>tp.qualities[it.id].priority==='high').map(it=>atpT(it.en));
  const go=id=>{const el=document.getElementById(id);if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});};
  const tiles=[
    {id:'atp-s1',c:'#0094ff',k:atpT('Athletic Profile'),v:rated.length,u:`/ ${ATP_QUALITIES.length}`,
      s:high.length?`${atpT('High')}: ${high.join(', ')}`:`${atpT('Medium')} ${nP('medium')} · ${atpT('Low')} ${nP('low')}`},
    {id:'atp-s2',c:'#ef4444',k:atpT('Constraints'),v:tp.constraints.hard.length+tp.constraints.soft.length,u:L('kısıt','total'),
      s:`${atpT('Hard')} ${tp.constraints.hard.length} · ${atpT('Soft')} ${tp.constraints.soft.length}`},
    {id:'atp-s3',c:'#22d3ee',k:atpT('Exercise Exposure'),v:exp.sessions.d28,u:L('seans / 28 gün','sessions / 28 d'),
      s:exp.last?`${L('Son seans','Last session')} ${fd(exp.last.date)}`:L('Takvimde kayıt yok','Nothing on the calendar')},
  ];
  return(<div className="atp-wrap">
    <div className="atp-intro">
      <div className="atp-intro-ic">◎</div>
      <div className="atp-intro-tx">
        <div className="atp-intro-t">{atpT('Athlete Training Profile')}</div>
        <div className="atp-intro-d">{L('Sporcunun antrenman profilini tanımlar: atletik profil (her kalitenin önceliği), kısıtlar ve egzersiz maruziyeti. Bu bölümden egzersiz seçimi veya program oluşturma yapılmaz — bilgiler bireyselleştirme JSON\'una sporcunun profili olarak eklenir.',
          'Defines the athlete as a trainee: the athletic profile (each quality’s priority), constraints and exercise exposure. No exercise is selected and no programme is built from this section — it goes into the individualization JSON as the athlete’s profile.')}</div>
      </div>
      {tp.updated&&<div className="atp-intro-up">{L('Son güncelleme','Last updated')}<b>{fd(tp.updated)}</b></div>}
    </div>
    <div className="atp-glance">{tiles.map(t=>
      <button key={t.id} className="atp-gl" style={{'--gc':t.c}} onClick={()=>go(t.id)}>
        <div className="k">{t.k}</div>
        <div className="v">{t.v}<small>{t.u}</small></div>
        <div className="s" title={t.s}>{t.s}</div>
      </button>)}</div>
    <AtpProfile q={tp.qualities} onSet={setQ}/>
    <AtpConstraints con={tp.constraints} onChange={c=>save({constraints:c})}/>
    <AtpExposure exp={exp} refDate={refDate} setRefDate={setRefDate}/>
  </div>);
}
function AthleteDetail({ath,onBack,updAth,setup,weeks,exercises,ai,customTests,initialTab}){
  /* Normally the profile, but a wellness notification opens straight onto the tab it
     is about — the coach tapped a line about last night's sleep, not a biography. */
  const[tab,setTab]=useState(initialTab||'profile');
  const[editProfileOpen,setEditProfileOpen]=useState(false);
  const[dobText,setDobText]=useState('');
  useEffect(()=>{setDobText(fd(ath.dateOfBirth));},[ath.dateOfBirth,editProfileOpen]);
  const[srpeTableOpen,setSrpeTableOpen]=useState(false);
  const[wellnessTableOpen,setWellnessTableOpen]=useState(false);
  const[bodyTableOpen,setBodyTableOpen]=useState(false);
  // Find the most recent date that has any data (sessions/wellness/measurements)
  // so charts open on a month with actual data instead of an empty current month.
  const recentDate=useMemo(()=>{
    const all=new Set();
    Object.values(ath.days||{}).forEach(d=>{if(d?.sessions?.length)all.add(d.date);});
    (ath.wellness||[]).forEach(w=>{if(w.date)all.add(w.date);});
    (ath.measurements||[]).forEach(m=>{if(m.date)all.add(m.date);});
    const arr=[...all].sort();return arr.length?arr[arr.length-1]:fmt(today);
  },[ath.id]); // only recompute when switching athletes
  const recentParsed=parseD(recentDate);
  const[athDayKey,setAthDayKey]=useState(recentDate);
  const[athSel,setAthSel]=useState({year:recentParsed.getFullYear(),month:recentParsed.getMonth()+1,date:recentDate});
  // Week selectors for the per-panel charts (Wellness / sRPE) — Archivoy-anchored.
  const _mostRecent=(arr)=>{const ds=arr.map(x=>x.date).filter(Boolean).sort();return ds.length?wk(parseD(ds[ds.length-1])):wk(today);};
  const[wellnessWeek,setWellnessWeek]=useState(()=>_mostRecent(ath.wellness||[]));
  const[wellMetric,setWellMetric]=useState('readiness');
  const[srpeWeek,setSrpeWeek]=useState(()=>_mostRecent(ath.srpeLog||[]));
  // Wellness Log 2-week window (end date); defaults to the latest wellness entry.
  const[wlWeekEnd,setWlWeekEnd]=useState(()=>{const ds=(ath.wellness||[]).map(w=>w.date).filter(Boolean).sort();return ds.length?ds[ds.length-1]:fmt(today);});
  // Table pagination — show 10 by default, extendable in 10s.
  const[wlLimit,setWlLimit]=useState(10);
  const[srLimit,setSrLimit]=useState(10);
  const[mLimit,setMLimit]=useState(10);
  const[injLimit,setInjLimit]=useState(10);
  const photoRef=useRef(null);
  // Let a copied image be pasted straight onto the athlete photo with Ctrl/Cmd+V.
  // Only images are consumed, so pasting text into inputs is unaffected.
  useEffect(()=>{
    const onPaste=e=>{
      const el=document.activeElement;
      if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable))return;
      const f=imageFileFromPaste(e);
      if(f){e.preventDefault();handleImageUpload(f,'athletes',d=>updAth(ath.id,{photo:d}));}
    };
    document.addEventListener('paste',onPaste);
    return()=>document.removeEventListener('paste',onPaste);
  },[ath.id]);
  const positions=POSITIONS[setup.sport]||POSITIONS.default;
  const saveAthDays=nd=>updAth(ath.id,{days:nd});

  const exportPDF=async(period,extra)=>{
    const label=period==='weekly'?`Week of ${fd(wk(parseD(athSel.date)))}`:`${MN[athSel.month-1]} ${athSel.year}`;
    let mw=extra.mWeeks;
    if(period==='weekly'){const wkS=wk(parseD(athSel.date));const wkE=fmt(addD(parseD(wkS),6));mw=[{wkStart:wkS,wkEnd:wkE,...weekMono(dailyLoads(ath.days||{},wkS,wkE))}];}
    await generateCoachReport(`${ath.name} (${setup.teamName})`,label,ath.days||{},weeks,mw,extra.pMix,extra.acwrVal);
  };

  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
  const dobLong=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);return`b. ${String(b.getDate()).padStart(2,'0')} ${MN[b.getMonth()]} ${b.getFullYear()}`;})():null;
  // Header snapshot metrics — at the athlete's most recent logged date
  const apRef=athLatestDate(ath);
  const apL7=athLoadSum(ath,fmt(addD(parseD(apRef),-6)),apRef);
  const apAcwr=athACWR(ath,apRef);
  const apRd=athWellnessVal(ath,'readiness',apRef);
  const apRhr=athWellnessVal(ath,'RHR',apRef);
  const apEntries=(ath.srpeLog||[]).length;
  const apCheckins=(ath.wellness||[]).length;
  const apRcls=apRd==null?'na':apRd>=4?'':apRd>=3?'warn':'bad';
  const ATH_TABS=[
    {id:'profile',ic:'◈',l:L('Profil','Profile')},
    /* The athlete as a trainee — priorities, movement profile, constraints, exposure. */
    {id:'training',ic:'◎',l:atpT('Athlete Training Profile')},
    {id:'load',ic:'▤',l:L('Yük','Load')},
    {id:'calendar',ic:'▣',l:L('Takvim','Calendar')},
    /* The tape measure, and only the tape measure. Test results are read on the Testing
       & Assessment screen, next to the battery they were taken in; putting them here as
       well made one tab answer two questions. */
    {id:'body',ic:'⌇',l:L('Antropometrik Ölçüm','Anthropometric')},
    {id:'injuries',ic:'⊘',l:L('Sakatlıklar','Injuries')},
    {id:'wellness',ic:'♡',l:'Wellness'},
  ];
  return(<div>
    <button className="back" onClick={onBack} style={{marginBottom:14}}>‹ {L('Sporcular','Athletes')}</button>
    <div className="ap-head">
      <div className="ap-av-wrap">
        <div className={`ap-av ${apRcls}`} onClick={()=>photoRef.current?.click()} title={L('Fotoğrafı değiştirmek için tıkla','Click to change photo')}>
          {ath.photo?<img src={mediaSrc(ath.photo)} alt=""/>:initials}
          <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'athletes',d=>updAth(ath.id,{photo:d}));e.target.value='';}}/>
        </div>
        <button className="ap-paste" title={L('Kopyalanan fotoğrafı yapıştır','Paste copied photo')} onClick={e=>{e.stopPropagation();pasteImageFromClipboard('athletes',d=>updAth(ath.id,{photo:d}));}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
        </button>
      </div>
      <div className="ap-id">
        <h1>{ath.name||L('Adsız Sporcu','Unnamed Athlete')}{ath.number&&<span className="ap-num">#{ath.number}</span>}</h1>
        <div className="ap-meta">
          {ath.position&&<span>◉ {POS_FULL[ath.position]||ath.position}</span>}
          <span>〰 {L(`${apEntries} yük kaydı`,`${apEntries} load entries`)}</span>
          <span>♡ {L(`${apCheckins} check-in`,`${apCheckins} check-ins`)}</span>
        </div>
      </div>
      <div className="ap-stats">
        <div className="ap-stat"><div className="k">{L('Hazır Oluş','Readiness')}</div><div className="v" style={{color:readyColor(apRd)}}>{apRd!=null?<CountUp value={apRd} decimals={1}/>:'—'}<small>/5</small></div></div>
        <div className="ap-stat"><div className="k">RHR</div><div className="v">{apRhr!=null?<CountUp value={apRhr} decimals={0}/>:'—'}<small>bpm</small></div></div>
        <div className="ap-stat"><div className="k">{L('7g yük','7d load')}</div><div className="v" style={{color:'#3b6ef5'}}>{apL7?<CountUp value={apL7} format={x=>Math.round(x).toLocaleString('en-US').replace(/,/g,'.')}/>:'—'}<small>AU</small></div></div>
        <div className="ap-stat"><div className="k">ACWR</div><div className="v" style={{color:acwrZoneOf(apAcwr).c}}>{apAcwr?<CountUp value={apAcwr} decimals={2}/>:'—'}</div></div>
      </div>
      <button className="ap-edit" onClick={()=>setEditProfileOpen(true)} title={L('Profili düzenle','Edit profile')}>✎</button>
    </div>
    <div className="ath-tabs">{ATH_TABS.map(t=><button key={t.id} className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}><span className="ic">{t.ic}</span>{t.l}</button>)}</div>
    {tab==='profile'&&<ProfileTab ath={ath} updAth={updAth} setup={setup}/>}
    {tab==='training'&&<TrainingProfileTab ath={ath} updAth={updAth} exercises={exercises}/>}

    {editProfileOpen&&<div className="modal-bg" onClick={()=>setEditProfileOpen(false)}>
      <div className="modal" style={{maxWidth:680,width:'95vw',background:'#15181e',backdropFilter:'none',WebkitBackdropFilter:'none'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2 style={{margin:0,fontSize:18}}>{L('Profili Düzenle','Edit Profile')}</h2><button className="x-btn" onClick={()=>setEditProfileOpen(false)}>✕</button></div>
        <div style={{padding:'18px 22px'}}>
          <div className="grid cols-3">
            <div><label>{L('Ad Soyad','Full name')}</label><input value={ath.name} onChange={e=>updAth(ath.id,{name:e.target.value})}/></div>
            <div><label>{L('Forma No','Jersey #')}</label><input value={ath.number} onChange={e=>updAth(ath.id,{number:e.target.value})}/></div>
            <div><label>{L('Mevki','Position')}</label><select value={posOf(ath.position)} onChange={e=>updAth(ath.id,{position:e.target.value})}>{positions.map(p=><option key={p}>{p}</option>)}</select></div>
          </div>
          <div className="grid cols-3" style={{marginTop:12}}>
            <div><label>{L('Doğum tarihi','Date of birth')}</label><input type="text" inputMode="numeric" placeholder={L('gg/aa/yyyy','dd/mm/yyyy')} value={dobText} onChange={e=>{const v=e.target.value;setDobText(v);const m=v.trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);if(m){const d=+m[1],mo=+m[2];if(d>=1&&d<=31&&mo>=1&&mo<=12)updAth(ath.id,{dateOfBirth:`${m[3]}-${pad(mo)}-${pad(d)}`});}}}/><div className="help">{L('gün / ay / yıl','day / month / year')}</div></div>
            {/* Cep telefonu: ülke kodu ayrı bir kutuda, numara ayrı. Numaranın uluslararası
                biçimde durması gerekiyor, ve bir koç +90'ı numaranın içine yazmayı hep
                unutuyor — o yüzden seçtiriyoruz. */}
            <div style={{gridColumn:'span 2'}}><label>{L('Cep telefonu','Mobile phone')}</label>
              <div style={{display:'flex',gap:8}}>
                <select style={{flex:'0 0 130px'}} value={ath.phoneCode||DEFAULT_DIAL} onChange={e=>updAth(ath.id,{phoneCode:e.target.value})}>
                  {DIAL_CODES.map(c=><option key={c.c} value={c.d}>{c.d} · {c.c}</option>)}
                </select>
                <input style={{flex:1}} type="tel" inputMode="tel" placeholder="532 123 45 67"
                  value={ath.phone||''} onChange={e=>updAth(ath.id,{phone:cleanPhone(e.target.value)})}/>
              </div>
              <div className="help">{fullPhone(ath)||L('Ülke kodunu seç, numarayı başındaki 0 olmadan yaz.','Pick the country code, and write the number without a leading 0.')}</div></div>
          </div>
          <div className="grid cols-3" style={{marginTop:12}}>
            <div><label>{L('Cinsiyet','Sex')}</label><select value={ath.sex||''} onChange={e=>updAth(ath.id,{sex:e.target.value})}>
              <option value="">{L('— girilmemiş','— not set')}</option>
              <option value="M">{L('Erkek','Male')}</option>
              <option value="F">{L('Kadın','Female')}</option>
            </select></div>
          </div>
          <div style={{marginTop:12}}><label>{L('Notlar','Notes')}</label><textarea value={ath.notes} onChange={e=>updAth(ath.id,{notes:e.target.value})} placeholder={L('Hedefler, özel durumlar…','Goals, special considerations…')}/></div>
          <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}><button className="btn sm" onClick={()=>setEditProfileOpen(false)}>{L('Bitti','Done')}</button></div>
        </div>
      </div>
    </div>}
    {tab==='injuries'&&<div>
      <div className="row" style={{justifyContent:'space-between',marginBottom:14}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:600,color:'var(--text)'}}>{L('Sporcu Sakatlık Kaydı','Athlete Injury Record')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>({(ath.injuries||[]).length})</span></h2>
        <button className="btn sm" onClick={()=>{const inj={id:uid(),date:fmt(today),context:'Training',mechanism:'',side:'',location:'',tissueType:'',type:'',grade:'1',firstInjuryDay:fmt(today),sidelinedDate:fmt(today),estimatedReturn:'',actualReturn:'',status:'Active',notes:''};updAth(ath.id,{injuries:[...(ath.injuries||[]),inj]});}}>+ {L('Sakatlık Ekle','Add Injury')}</button>
      </div>
      {(!ath.injuries||ath.injuries.length===0)&&<div className="empty-st">{L('Kayıtlı sakatlık yok','No injuries recorded')}</div>}
      {(ath.injuries||[]).map((inj,idx)=>{
        const ui=(k,v)=>{const a=[...ath.injuries];a[idx]={...a[idx],[k]:v};updAth(ath.id,{injuries:a});};
        const sd=inj.sidelinedDate,ar=inj.actualReturn;
        let missedTraining=null,missedMatches=null;
        if(sd){const endDate=ar||fmt(today);if(endDate>=sd){missedTraining=Math.max(0,diffD(sd,endDate));missedMatches=(setup.competitions||[]).filter(c=>c.date>=sd&&c.date<=endDate).length;}}
        const isActive=!ar;
        return(<div key={inj.id||idx} className="panel inj-card">
          <div className="inj-h">
            <div className="inj-h-l">
              <span className={`inj-pill ${isActive?'inj':'ok'}`}>{isActive?L('AKTİF','ACTIVE'):L('İYİLEŞTİ','RECOVERED')}</span>
              <strong style={{fontSize:14,color:'var(--text)'}}>{inj.location||inj.type||L('(belirtilmemiş sakatlık)','(unspecified injury)')}</strong>
              {inj.grade&&<span className="inj-grade">{L('Derece','Grade')} {inj.grade}</span>}
            </div>
            <button className="btn xs danger" onClick={()=>{if(confirm(L('Bu sakatlık kaydı silinsin mi?','Delete this injury record?')))updAth(ath.id,{injuries:ath.injuries.filter((_,j)=>j!==idx)});}}>✕ {L('Sil','Delete')}</button>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('Sakatlık Tarihi','Injury Date')}</label><input type="date" value={inj.date||''} onChange={e=>ui('date',e.target.value)}/></div>
            <div><label>{L('Bağlam','Context')}</label><select value={inj.context||'Training'} onChange={e=>ui('context',e.target.value)}><option value="Training">{L('Antrenman','Training')}</option><option value="Match">{L('Maç','Match')}</option><option value="Other">{L('Diğer','Other')}</option></select></div>
            <div><label>{L('Taraf','Side')}</label><select value={inj.side||''} onChange={e=>ui('side',e.target.value)}><option value="">—</option><option value="Right">{L('Sağ','Right')}</option><option value="Left">{L('Sol','Left')}</option><option value="Bilateral">{L('Çift taraflı','Bilateral')}</option><option value="N/A">{L('Yok','N/A')}</option></select></div>
            <div><label>{L('Şiddet Derecesi','Severity Grade')}</label><select value={inj.grade||'1'} onChange={e=>ui('grade',e.target.value)}><option value="1">{L('Derece 1','Grade 1')}</option><option value="2">{L('Derece 2','Grade 2')}</option><option value="3">{L('Derece 3','Grade 3')}</option><option value="4">{L('Derece 4','Grade 4')}</option></select></div>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('Anatomik Bölge','Anatomical Location')}</label><input value={inj.location||''} onChange={e=>ui('location',e.target.value)} placeholder={L('Diz, Ayak bileği…','Knee, Ankle…')}/></div>
            <div><label>{L('Doku Tipi','Tissue Type')}</label><select value={inj.tissueType||''} onChange={e=>ui('tissueType',e.target.value)}><option value="">—</option><option value="Muscle">{L('Kas','Muscle')}</option><option value="Ligament">{L('Bağ','Ligament')}</option><option value="Tendon">{L('Tendon','Tendon')}</option><option value="Bone">{L('Kemik','Bone')}</option><option value="Cartilage">{L('Kıkırdak','Cartilage')}</option><option value="Joint capsule">{L('Eklem kapsülü','Joint capsule')}</option><option value="Nerve">{L('Sinir','Nerve')}</option><option value="Other">{L('Diğer','Other')}</option></select></div>
            <div><label>{L('Sakatlık Tipi','Injury Type')}</label><input value={inj.type||''} onChange={e=>ui('type',e.target.value)} placeholder={L('ÖÇB burkulması…','ACL sprain…')}/></div>
            <div><label>{L('Sakatlanma Mekanizması','Injury Mechanism')}</label><input value={inj.mechanism||''} onChange={e=>ui('mechanism',e.target.value)} placeholder={L('Temassız dönüş…','Non-contact pivot…')}/></div>
          </div>
          <div className="grid cols-4" style={{marginBottom:10}}>
            <div><label>{L('İlk Sakatlık Günü','First Injury Day')}</label><input type="date" value={inj.firstInjuryDay||''} onChange={e=>ui('firstInjuryDay',e.target.value)}/></div>
            <div><label>{L('Kadro Dışı Tarihi','Sidelined Date')}</label><input type="date" value={inj.sidelinedDate||''} onChange={e=>ui('sidelinedDate',e.target.value)}/></div>
            <div><label>{L('Tahmini Dönüş','Estimated Return')}</label><input type="date" value={inj.estimatedReturn||''} onChange={e=>ui('estimatedReturn',e.target.value)}/></div>
            <div><label>{L('Gerçekleşen Dönüş','Actual Return')}</label><input type="date" value={inj.actualReturn||''} onChange={e=>ui('actualReturn',e.target.value)}/></div>
          </div>
          <div className="inj-stats">
            <div className="inj-stat"><div className="k">{L('Kaçırılan Antrenman','Missed Training')}</div><div className="v">{missedTraining!=null?missedTraining:'—'}<span className="u">{L('gün','days')}</span></div></div>
            <div className="inj-stat"><div className="k">{L('Kaçırılan Maç','Missed Matches')}</div><div className="v">{missedMatches!=null?missedMatches:'—'}</div></div>
          </div>
        </div>);
      })}
    </div>}
    {tab==='body'&&<div>
      {(()=>{const m=(ath.measurements||[]).filter(x=>x.date).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));const cur=m[m.length-1];const prev=m[m.length-2];
        const d=(a,b,k,dp=1)=>{const v1=Number(a?.[k]),v2=Number(b?.[k]);if(!a||!b||isNaN(v1)||isNaN(v2))return null;return+(v1-v2).toFixed(dp);};
        const w=cur?Number(cur.weight)||null:null,bf=cur?Number(cur.bodyFat)||null:null,ws=cur?Number(cur.wingspan)||null:null;
        const dw=d(cur,prev,'weight'),dbf=d(cur,prev,'bodyFat'),dws=d(cur,prev,'wingspan');
        const fmtD=(v,u)=>v==null?null:(v>0?`+${v}${u}`:`${v}${u}`);
        return(<div className="ath-stat-row" style={{gridTemplateColumns:`repeat(${dws!=null?6:5},minmax(0,1fr))`}}>
          <div className="ath-stat"><div className="k">{L('Güncel Kilo','Current Wt')}</div><div className="v">{w!=null?w:'—'}<span className="u">kg</span></div></div>
          <div className="ath-stat"><div className="k">{L('Değişim','Change')}</div><div className="v">{fmtD(dw,'')||'—'}<span className="u">kg</span></div>{dw!=null&&<div className={`d ${dw>0?'pos':'neg'}`}>{dw>0?L('arttı','gain'):L('azaldı','loss')}</div>}</div>
          <div className="ath-stat"><div className="k">{L('Yağ Oranı','Body Fat')}</div><div className="v">{bf!=null?bf:'—'}<span className="u">%</span></div></div>
          <div className="ath-stat"><div className="k">{L('Yağ Değişimi','BF Change')}</div><div className="v">{fmtD(dbf,'')||'—'}<span className="u">%</span></div>{dbf!=null&&<div className={`d ${dbf<0?'pos':'neg'}`}>{dbf<0?L('daha iyi','better'):L('daha yüksek','higher')}</div>}</div>
          <div className="ath-stat"><div className="k">{L('Kulaç','Wingspan')}</div><div className="v">{ws!=null?ws:'—'}<span className="u">cm</span></div></div>
          {dws!=null&&<div className="ath-stat"><div className="k">{L('Kulaç Değişimi','WS Change')}</div><div className="v">{fmtD(dws,'')}<span className="u">cm</span></div><div className={`d ${dws>0?'pos':'neg'}`}>{dws>0?L('arttı','gain'):L('azaldı','loss')}</div></div>}
        </div>);})()}
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L('Vücut Kompozisyonu Takibi','Body Composition Tracking')}</h2>
          <div className="row" style={{gap:6}}>
            <button className="btn sec sm" disabled={(ath.measurements||[]).length===0} onClick={()=>printBodyComp(ath,setup)} title={L('Vücut Kompozisyonu raporu (A4 çıktı)','Body Composition report (A4 print)')}>⎙ {L('Çıktı al','Print')}</button>
            {/* A new row is an empty row waiting to be typed into, so open the table with it
                — otherwise the button looks like it did nothing. */}
            <button className="btn sm" onClick={()=>{const m={id:uid(),date:fmt(today),height:'',weight:'',bodyFat:'',wingspan:'',notes:''};updAth(ath.id,{measurements:[...(ath.measurements||[]),m]});setBodyTableOpen(true);}}>+ {L('Ölçüm Ekle','Add Measurement')}</button>
          </div>
        </div>
        {(ath.measurements||[]).length>0&&<div>
          {(()=>{const sorted=[...ath.measurements].filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
            const labels=sorted.map(m=>{const d=parseD(m.date);return MN[d.getMonth()];});
            const dataLbl=color=>({display:'auto',align:'top',anchor:'end',color,backgroundColor:'transparent',font:{size:10,weight:'bold',family:"'Archivo','IBM Plex Mono',monospace"},clip:false,formatter:v=>v==null?'':(+Number(v).toFixed(1))});
            const mkChart=(title,unit,field,color,dotColor,goodUp)=>{const data=sorted.map(m=>{const raw=m[field];if(raw===''||raw==null)return null;const v=Number(raw);return(isNaN(v)||v===0)?null:v;});
              const valid=data.filter(v=>v!=null);
              const cur=valid.length?valid[valid.length-1]:null,first=valid.length?valid[0]:null;
              const imp=valid.length>1?+((cur-first).toFixed(1)):null;
              const fav=(imp==null||goodUp==null)?null:(goodUp?imp>0:imp<0);
              return(<div className="metric-card">
                <div className="mc-h"><div className="mc-t">{title}</div><div className="mc-u">{unit}</div></div>
                <div className="mc-val"><span className="mv" style={{color:dotColor||color}}>{cur!=null?cur:'—'}</span>{imp!=null&&imp!==0&&<span className={`md ${fav==null?'':(fav?'pos':'neg')}`}>{imp>0?'+':''}{imp}</span>}</div>
                <div className="mc-chart tall"><ChartC type="line" chartData={{labels,datasets:[
                  {label:title,data,borderColor:color,backgroundColor:color+'22',fill:'origin',tension:.35,spanGaps:true,borderWidth:2.5,
                    pointRadius:4,pointHoverRadius:6,pointBackgroundColor:dotColor||color,pointBorderColor:'#0d0f13',pointBorderWidth:1.5,
                    datalabels:dataLbl(dotColor||color)}
                ]}} options={{responsive:true,maintainAspectRatio:false,
                  layout:{padding:{top:24,bottom:6,left:8,right:8}},
                  scales:{x:{ticks:{color:'#74808f',font:{family:"'Archivo','IBM Plex Mono',monospace",size:10},autoSkip:true,maxRotation:0,maxTicksLimit:7},grid:{display:false},border:{display:false}},
                    y:{display:false,grid:{display:false},beginAtZero:false}},
                  plugins:{legend:{display:false},tooltip:{enabled:true}}}}/></div>
              </div>);};
            /* Two up, two down: across a full-width panel four cards left each chart too
               narrow to read a trend off, and the row of tiny plots read as a strip of
               sparklines rather than four charts worth looking at. */
            return(<div className="metric-grid" style={{marginBottom:18,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
              {mkChart(L('Boy','Height'),'cm','height','#a855f7','#c084fc',null)}
              {mkChart(L('Kilo','Weight'),'kg','weight','#3b82f6','#60a5fa',null)}
              {mkChart(L('Yağ Oranı','Body Fat'),'%','bodyFat','#f97316','#fb923c',false)}
              {mkChart(L('Kulaç','Wingspan'),'cm','wingspan','#10b981','#34d399',null)}
            </div>);})()}
          {/* Collapsible paginated table (10 rows by default, expand in 10s) */}
          <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:bodyTableOpen?10:0}}>
            <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ölçüm kayıtları','Measurement records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.measurements.length} {L('satır','rows')})</span></strong>
            <button className="btn sec sm" onClick={()=>setBodyTableOpen(o=>!o)}>{bodyTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
          </div>
          {bodyTableOpen&&(()=>{const rev=ath.measurements.map((m,i)=>({m,i})).sort((a,b)=>(b.m.date||'').localeCompare(a.m.date||''));const vis=rev.slice(0,mLimit);const hasMore=rev.length>mLimit;
            return<div style={{overflowX:'auto'}}><table><thead><tr><th>{L('Tarih','Date')}</th><th>{L('Boy (cm)','Height (cm)')}</th><th>{L('Kilo (kg)','Weight (kg)')}</th><th>{L('Yağ (%)','Body Fat (%)')}</th><th>{L('Kulaç (cm)','Wingspan (cm)')}</th><th>{L('Notlar','Notes')}</th><th style={{width:50}}></th></tr></thead><tbody>
              {vis.map(({m,i:realIdx},idx)=>{
                const um=(k,v)=>{const a=[...ath.measurements];a[realIdx]={...a[realIdx],[k]:v};updAth(ath.id,{measurements:a});};
                // Rows mirrored from an Anthropometric Measurement test are read-only here —
                // edit them from the Testing tab so the source and Body Comp stay in sync.
                const synced=!!m.srcTest;
                return<tr key={m.id||idx} style={synced?{opacity:.92}:undefined}>
                  <td><input type="date" value={m.date} onChange={e=>um('date',e.target.value)} style={{width:130}} disabled={synced}/><div className="help">{fd(m.date)}</div></td>
                  <td><input type="number" step="0.1" value={m.height||''} onChange={e=>um('height',e.target.value)} placeholder="cm" style={{width:80}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.weight} onChange={e=>um('weight',e.target.value)} placeholder="kg" style={{width:80}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.bodyFat} onChange={e=>um('bodyFat',e.target.value)} placeholder="%" style={{width:70}} disabled={synced}/></td>
                  <td><input type="number" step="0.1" value={m.wingspan||''} onChange={e=>um('wingspan',e.target.value)} placeholder="cm" style={{width:80}} disabled={synced}/></td>
                  <td><input value={m.notes||''} onChange={e=>um('notes',e.target.value)} placeholder={L('Notlar…','Notes…')}/></td>
                  <td>{synced?<span className="help" title={L('Test sekmesinden yönetiliyor','Managed by the Testing tab')} style={{fontSize:16}}>🔗</span>:<button className="btn xs danger" onClick={()=>updAth(ath.id,{measurements:ath.measurements.filter((_,j)=>j!==realIdx)})}>✕</button>}</td>
                </tr>;})}
            </tbody></table>
            <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
              {hasMore&&<button className="btn sm sec" onClick={()=>setMLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-mLimit} kaldı)`,`Show 10 more (${rev.length-mLimit} remaining)`)}</button>}
              {mLimit>10&&<button className="btn sm sec" onClick={()=>setMLimit(10)}>{L('Daralt','Collapse')}</button>}
              <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
            </div></div>;})()}
        </div>}
        {(!ath.measurements||ath.measurements.length===0)&&<div className="empty-st">{L('Henüz ölçüm yok','No measurements yet')}</div>}
      </div>
    </div>}
    {tab==='wellness'&&<div>
      {/* ---- Wellness Log (from Notion sync or manual) ---- */}
      <div className="panel">
      <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:600,color:'var(--text)'}}>{L('Wellness Kaydı','Wellness Log')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('son 2 hafta · sabah check-in soruları','last 2 weeks · morning check-in questions')}</span></h2>
        <div className="row" style={{gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <button className="btn sm sec" onClick={()=>setWlWeekEnd(w=>fmt(addD(parseD(w),-7)))} title={L('Önceki hafta','Previous week')}>‹</button>
          <strong style={{fontSize:12,minWidth:118,textAlign:'center',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",color:'var(--text2)'}}>{fd(fmt(addD(parseD(wlWeekEnd),-13))).slice(0,5)} – {fd(wlWeekEnd).slice(0,5)}</strong>
          <button className="btn sm sec" onClick={()=>setWlWeekEnd(w=>fmt(addD(parseD(w),7)))} title={L('Sonraki hafta','Next week')}>›</button>
          <button className="btn sm sec" onClick={()=>{const ds=(ath.wellness||[]).map(x=>x.date).filter(Boolean).sort();setWlWeekEnd(ds.length?ds[ds.length-1]:fmt(today));}}>{L('En son','Latest')}</button>
          <button className="btn sm sec" onClick={()=>{const w={id:uid(),srcId:null,date:fmt(today),RHR:'',sleep:'',mentalFatigue:'',physicalFatigue:'',fatigue:'',soreness:'',areaOfPain:'',readiness:''};updAth(ath.id,{wellness:[...(ath.wellness||[]),w]});}}>+ {L('Elle','Manual')}</button>
        </div>
      </div>
      {(ath.wellness||[]).length===0&&<div className="empty-st">{L('Wellness verisi yok — Tally’den senkronla ya da elle ekle','No wellness data — sync from Tally or add manually')}</div>}
      {(ath.wellness||[]).length>0&&(()=>{
        const METRICS=[
          {id:'readiness',label:L('Hazır Oluş','Readiness'),color:'#10b981',dot:'#34d399',unit:'/5',hi:true},
          {id:'sleep',label:L('Uyku','Sleep'),color:'#3b82f6',dot:'#60a5fa',unit:'/5',hi:true},
          // The check-in's questions in the form's order — the same list as the heatmap.
          {id:'mentalFatigue',label:L('Zihinsel Yorgunluk','Mental Fatigue'),color:'#a78bfa',dot:'#c4b5fd',unit:'/5',hi:true},
          {id:'physicalFatigue',label:L('Fiziksel Yorgunluk','Physical Fatigue'),color:'#f97316',dot:'#fb923c',unit:'/5',hi:true},
          {id:'soreness',label:L('Kas Ağrısı','Muscle Soreness'),color:'#f43f5e',dot:'#fb7185',unit:'/5',hi:true},
          {id:'RHR',label:L('İstirahat Nabzı','Resting HR'),color:'#22d3ee',dot:'#67e8f9',unit:'bpm',hi:false},
        ];
        const valColor='#2dd4a7';
        // 1-5 scores in the check-in form's own colours: 1 red … 5 blue.
        const score5Col=v=>score5Color(v)||'var(--dim)';
        const fmtN=(v,five)=>v==null?'—':(five?(Number.isInteger(v)?String(v):v.toFixed(1)):String(Math.round(v)));
        const _wStart=fmt(addD(parseD(wlWeekEnd),-13));
        const logsAll=[...ath.wellness].filter(w=>w.date&&w.date>=_wStart&&w.date<=wlWeekEnd).sort((a,b)=>a.date.localeCompare(b.date));
        return(<div>
          <div className="wl-card" style={{border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',marginBottom:14,background:'rgba(255,255,255,.015)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:2}}>{L('Wellness Kaydı','Wellness Log')} <span style={{fontSize:11,fontWeight:400,color:'var(--muted)'}}>· {METRICS.length} {L('metrik · check-in başına','metrics · per check-in')}</span></div>
            {METRICS.map(m=>{
              const five=m.unit==='/5';
              const series=logsAll.map(w=>w[m.id]!==''&&w[m.id]!=null?Number(w[m.id]):null);
              const present=series.filter(v=>v!=null);
              const count=present.length;
              const latest=count?present[count-1]:null;
              const prev=count>1?present[count-2]:null;
              const avg=count?present.reduce((a,b)=>a+b,0)/count:null;
              const delta=(latest!=null&&prev!=null)?latest-prev:null;
              const good=delta==null?true:(m.hi?delta>=0:delta<=0);
              return<div key={m.id} style={{display:'flex',alignItems:'center',gap:16,padding:'11px 0',borderTop:'1px solid var(--border)'}}>
                <div style={{width:150,flex:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,fontSize:13,fontWeight:600,color:'var(--text)'}}><span style={{width:9,height:9,borderRadius:2,background:m.color,flex:'none'}}/>{m.label}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:4}}>
                    <span style={{fontSize:26,fontWeight:700,lineHeight:1,color:latest==null?'var(--dim)':(five?score5Col(latest):valColor)}}>{fmtN(latest,five)}</span>
                    <span style={{fontSize:11,color:'var(--dim)'}}>{m.unit}</span>
                    {delta!=null&&delta!==0&&<span style={{fontSize:12,fontWeight:700,color:good?'#2dd4a7':'#f43f5e'}}>{delta>0?'↑':'↓'}{fmtN(Math.abs(delta),five)}</span>}
                  </div>
                  <div style={{fontSize:10.5,color:'var(--dim)',marginTop:3,letterSpacing:.3}}>{L('ort.','avg')} {fmtN(avg,five)} · {count} {L('kayıt','logs')}</div>
                </div>
                <div style={{flex:1,minWidth:0}}><SparkSVG id={m.id} data={series} color={m.color} avg={avg} unit={m.unit} showValues valueColor={five?score5Col:null}/></div>
              </div>;
            })}
          </div>
            {/* Collapsible paginated table */}
            <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:wellnessTableOpen?10:0}}>
              <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ayrıntılı kayıtlar','Detailed records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.wellness.length} {L('satır','rows')})</span></strong>
              <button className="btn sec sm" onClick={()=>setWellnessTableOpen(o=>!o)}>{wellnessTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
            </div>
            {wellnessTableOpen&&(()=>{const rev=[...ath.wellness].reverse();const vis=rev.slice(0,wlLimit);const hasMore=rev.length>wlLimit;
              return<div style={{overflowX:'auto'}}><table><thead><tr>
                <th>{L('Tarih','Date')}</th><th>RHR</th><th>{L('Uyku','Sleep')}</th><th>{L('Zihinsel Yorg.','Mental Fat.')}</th><th>{L('Fiziksel Yorg.','Physical Fat.')}</th><th>{L('Kas Ağrısı','Soreness')}</th><th>{L('Hazır Oluş','Readiness')}</th><th style={{width:50}}></th>
              </tr></thead><tbody>
                {vis.map((w,idx)=>{const realIdx=ath.wellness.length-1-idx;
                  /* A value the coach types here is theirs: the field is stamped on the
                     record so the next Tally sync writes around it instead of over it. */
                  const uw=(k,v)=>{const a=[...ath.wellness];const cur=a[realIdx];
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
                    {/* Area of Pain and Source have no column here. Both stay on the record
                        and keep doing their job — the pain report and the wellness heatmap
                        read areaOfPain, and srcId still decides what the next Tally sync is
                        allowed to overwrite. Pain is shown where it is acted on (the flag
                        list, the heatmap, the athlete's day), and where a row came from is
                        not a number to correct. */}
                    <td><input type="number" step="0.1" value={w.readiness??''} onChange={e=>uw('readiness',e.target.value)} style={{width:60}}/></td>
                    <td><button className="btn xs danger" onClick={()=>updAth(ath.id,{wellness:ath.wellness.filter((_,j)=>j!==realIdx)})}>✕</button></td>
                  </tr>;})}
              </tbody></table>
              <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
                {hasMore&&<button className="btn sm sec" onClick={()=>setWlLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-wlLimit} kaldı)`,`Show 10 more (${rev.length-wlLimit} remaining)`)}</button>}
                {wlLimit>10&&<button className="btn sm sec" onClick={()=>setWlLimit(10)}>{L('Daralt','Collapse')}</button>}
                <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
              </div></div>;
            })()}
          </div>);
        })()}
      </div>

    </div>}

    {tab==='load'&&<div>
      {/* ---- sRPE Log (Inner Load — synced from Notion form) ---- */}
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h2 style={{margin:0}}>{L('sRPE Kaydı','sRPE Log')} <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{L('kaynağa göre seans-RPE · her çubuğun üstünde sRPE yükü (AU)','session-RPE by source · sRPE load (AU) above each bar')}</span></h2>
          <div className="row" style={{gap:6}}>
            <button className="btn sec sm" onClick={()=>setSrpeWeek(fmt(addD(parseD(srpeWeek),-7)))}>‹ {L('Hafta','Week')}</button>
            <strong style={{fontSize:13,minWidth:170,textAlign:'center'}}>{fd(srpeWeek)} → {fd(fmt(addD(parseD(srpeWeek),6)))}</strong>
            <button className="btn sec sm" onClick={()=>setSrpeWeek(fmt(addD(parseD(srpeWeek),7)))}>{L('Hafta','Week')} ›</button>
            <button className="btn sm sec" onClick={()=>setSrpeWeek(_mostRecent(ath.srpeLog||[]))}>{L('En son','Latest')}</button>
            <button className="btn sm sec" onClick={()=>{const s={id:uid(),notionId:null,date:fmt(today),tpRPE:'',tpDuration:'',tpLoad:'',scRPE:'',scDuration:'',scLoad:'',gameRPE:'',gameDuration:'',gameLoad:'',totalLoad:''};updAth(ath.id,{srpeLog:[...(ath.srpeLog||[]),s]});}}>+ {L('Elle','Manual')}</button>
          </div>
        </div>
        {(ath.srpeLog||[]).length===0&&<div className="empty-st">{L('Henüz sRPE verisi yok — Tally’den senkronla ya da elle ekle','No sRPE data yet — sync from Tally or add manually')}</div>}
        {(ath.srpeLog||[]).length>0&&(()=>{
          const days7=Array.from({length:7},(_,i)=>fmt(addD(parseD(srpeWeek),i)));
          // Aggregate ALL entries per date. A single day can hold several sessions (e.g. an
          // S&C session AND a Ball Practice session), each its own srpeLog row. The old
          // Object.fromEntries(date→entry) kept only the LAST row per date, so a second
          // same-day session (the S&C manual RPE) silently disappeared from the chart.
          const agg={};
          (ath.srpeLog||[]).forEach(s=>{
            if(!s||!s.date)return;
            const a=agg[s.date]||(agg[s.date]={tpLoad:0,scLoad:0,gmLoad:0,tpRW:0,tpDW:0,scRW:0,scDW:0,gmRW:0,gmDW:0});
            const add=(P,load,rpe,dur)=>{a[P+'Load']+=Number(load)||0;const r=(rpe===''||rpe==null)?null:Number(rpe);const du=Number(dur)||0;if(r!=null&&!isNaN(r)&&du>0){a[P+'RW']+=r*du;a[P+'DW']+=du;}};
            add('tp',s.tpLoad,s.tpRPE,s.tpDuration);
            add('sc',s.scLoad,s.scRPE,s.scDuration);
            add('gm',s.gameLoad,s.gameRPE,s.gameDuration);
          });
          const labels=days7.map((d,i)=>`${DN[i]} ${fd(d).slice(0,5)}`);
          const tpVals=days7.map(d=>agg[d]?.tpLoad||0);
          const scVals=days7.map(d=>agg[d]?.scLoad||0);
          const gmVals=days7.map(d=>agg[d]?.gmLoad||0);
          // Segment RPE = duration-weighted average across that day's sessions in that category
          // (for a single session this is exactly its own RPE).
          const wAvg=(d,P)=>agg[d]&&agg[d][P+'DW']>0?agg[d][P+'RW']/agg[d][P+'DW']:null;
          const tpRPEs=days7.map(d=>wAvg(d,'tp'));
          const scRPEs=days7.map(d=>wAvg(d,'sc'));
          const gmRPEs=days7.map(d=>wAvg(d,'gm'));
          const weekTotal=tpVals.reduce((a,b)=>a+b,0)+scVals.reduce((a,b)=>a+b,0)+gmVals.reduce((a,b)=>a+b,0);
          const dailyTotals=days7.map((d,i)=>tpVals[i]+scVals[i]+gmVals[i]);
          const activeDays=dailyTotals.filter(v=>v>0).length;
          const cumAU=Math.round(weekTotal);
          const avgAU=activeDays?Math.round(weekTotal/activeDays):0;
          const peakAU=Math.round(Math.max(0,...tpVals,...scVals,...gmVals));
          const rpeByDs=[tpRPEs,scRPEs,gmRPEs];
          const SRC_LABELS=[L('Top Çalışması','Team Practice'),'S&C',L('Maç','Game')];
          const fmtRPE=x=>x==null?'':(Number(x)%1===0?String(Number(x)):Number(x).toFixed(1));
          // Real session titles for the hover tooltip — matched from the athlete's calendar
          // by date + source category (tp / sc / gm), so a bar segment shows the actual
          // session name(s) (e.g. "Temel Kuvvet & Güç", "Recovery Session"). Falls back to
          // the source label when no calendar session is found (e.g. Notion-only data).
          const sesCat=s=>{const lt=(s.loadType||'').toLowerCase(),p=(s.purpose||'').toLowerCase(),n=(s.name||'').toLowerCase();
            if(s.rpeCat==='game'||p.includes('game')||p.includes('match')||n.includes('maç')||n.includes('match')||n.includes('game'))return'gm';
            if(s.rpeCat==='sc'||lt.includes('mechanical')||lt.includes('neuromuscular'))return'sc';
            return'tp';};
          const namesByDay={};
          days7.forEach(d=>{const o={tp:[],sc:[],gm:[]};((ath.days&&ath.days[d]&&ath.days[d].sessions)||[]).forEach(s=>{if(s.name)o[sesCat(s)].push(s.name);});namesByDay[d]=o;});
          const namesFor=(dsIdx,dayIdx)=>{const cat=['tp','sc','gm'][dsIdx];return(namesByDay[days7[dayIdx]]&&namesByDay[days7[dayIdx]][cat])||[];};
          // Middle-of-segment label = that segment's RPE (plain number). Top label = total AU.
          const rpeMid=arr=>({display:ctx=>ctx.dataset.data[ctx.dataIndex]>=50&&arr[ctx.dataIndex]!=null,anchor:'center',align:'center',color:'#fff',font:{weight:'600',size:13},formatter:(v,ctx)=>fmtRPE(arr[ctx.dataIndex])});
          const totalLbl={display:true,align:'end',anchor:'end',color:'#eef1f5',font:{weight:'700',size:12},formatter:(v,ctx)=>{const i=ctx.dataIndex;const t=ctx.chart.data.datasets.reduce((s,ds)=>s+(ds.data[i]||0),0);return t>0?Math.round(t).toLocaleString():'';}};
          return(<div>
            <div className="srpe-stats">
              <div className="srpe-stat"><div className="v" style={{color:'#5b9bff'}}>{avgAU.toLocaleString()}</div><div className="k">{L('Ort. sRPE · AU','Avg sRPE · AU')}</div></div>
              <div className="srpe-stat"><div className="v">{peakAU.toLocaleString()}</div><div className="k">{L('En yüksek seans','Peak session')}</div></div>
              <div className="srpe-stat"><div className="v">{cumAU.toLocaleString()}</div><div className="k">{L('Toplam','Cumulative')}</div></div>
            </div>
            <div className="chart-box" style={{marginBottom:12,height:380}}>
              {weekTotal>0?<ChartC type="bar" chartData={{labels,datasets:[
                {label:SRC_LABELS[0],data:tpVals,backgroundColor:'transparent',solidColor:'rgb(245,147,40)',hoverSolidColor:'rgb(255,166,74)',stack:'load',maxBarThickness:74,datalabels:rpeMid(tpRPEs)},
                {label:'S&C',data:scVals,backgroundColor:'transparent',solidColor:'rgb(26,168,95)',hoverSolidColor:'rgb(38,190,114)',stack:'load',maxBarThickness:74,datalabels:rpeMid(scRPEs)},
                {label:SRC_LABELS[2],data:gmVals,backgroundColor:'transparent',solidColor:'rgb(239,68,68)',hoverSolidColor:'rgb(248,100,100)',stack:'load',maxBarThickness:74,datalabels:{labels:{total:totalLbl,rpe:rpeMid(gmRPEs)}}},
              ]}} plugins={[roundBars]} options={{responsive:true,maintainAspectRatio:false,
                layout:{padding:{top:28}},
                scales:{x:{...CHART_DARK.scales.x,stacked:true,ticks:{...CHART_DARK.scales.x.ticks,color:'#eef1f5',font:{size:12,weight:'500'}}},y:{...CHART_DARK.scales.y,stacked:true,title:{display:true,text:L('Günlük Yük (AU = RPE × dk)','Daily Load (AU = RPE × min)'),color:'#94a3b8'}}},
                plugins:{legend:{position:'top',align:'end',labels:{...CHART_DARK.plugins.legend.labels,color:'#eef1f5',usePointStyle:true,pointStyle:'circle',boxWidth:8,padding:16,font:{size:12,weight:'500'},generateLabels:chart=>chart.data.datasets.map((ds,i)=>({text:ds.label,fillStyle:ds.solidColor,strokeStyle:ds.solidColor,fontColor:'#ffffff',lineWidth:0,pointStyle:'circle',hidden:!chart.isDatasetVisible(i),datasetIndex:i}))}},
                  tooltip:{enabled:true,mode:'nearest',intersect:true,backgroundColor:'rgba(18,20,25,.94)',borderColor:'rgba(255,255,255,.14)',borderWidth:1,cornerRadius:10,padding:{top:9,bottom:9,left:12,right:12},displayColors:true,boxPadding:5,caretSize:6,titleColor:'#eef1f5',bodyColor:'#cdd3dc',footerColor:'#8b94a3',titleFont:{family:"'Archivo','Space Grotesk',sans-serif",size:13,weight:'700'},bodyFont:{family:"'Archivo','IBM Plex Mono',monospace",size:12},footerFont:{family:"'Archivo','IBM Plex Mono',monospace",size:10,weight:'400'},
                    callbacks:{labelColor:ctx=>({backgroundColor:ctx.dataset.solidColor,borderColor:ctx.dataset.solidColor,borderWidth:0,borderRadius:3}),
                      title:items=>{const it=items[0];if(!it)return'';const nm=namesFor(it.datasetIndex,it.dataIndex);return nm.length?nm.join(' · '):(SRC_LABELS[it.datasetIndex]||it.dataset.label);},
                      label:ctx=>{const r=rpeByDs[ctx.datasetIndex]&&rpeByDs[ctx.datasetIndex][ctx.dataIndex];const au=Math.round(ctx.parsed.y);return '  '+(SRC_LABELS[ctx.datasetIndex]||'')+' · '+au.toLocaleString()+' AU'+(r!=null?' · RPE '+fmtRPE(r):'');},
                      footer:items=>{const it=items[0];return it?labels[it.dataIndex]:'';}}}}}}/>:
              <div className="empty-st">{L('Bu hafta sRPE kaydı yok — ‹ Hafta / Hafta › ile gezin ya da En son’a bas.','No sRPE entries this week — try ‹ Week / Week › or click Latest.')}</div>}
            </div>
            <div className="row" style={{justifyContent:'space-between',marginTop:6,marginBottom:srpeTableOpen?10:0}}>
              <strong style={{fontSize:13,color:'var(--text2)'}}>{L('Ayrıntılı kayıtlar','Detailed records')} <span style={{fontSize:11,color:'var(--dim)',fontWeight:400}}>({ath.srpeLog.length} {L('satır','rows')})</span></strong>
              <button className="btn sec sm" onClick={()=>setSrpeTableOpen(o=>!o)}>{srpeTableOpen?L('▲ Gizle','▲ Hide'):L('▼ Göster','▼ Show')}</button>
            </div>
            {srpeTableOpen&&(()=>{const rev=[...ath.srpeLog].reverse();const vis=rev.slice(0,srLimit);const hasMore=rev.length>srLimit;
              return<div style={{overflowX:'auto'}}><table><thead><tr>
                <th>{L('Tarih','Date')}</th><th>TP RPE</th><th>{L('TP dk','TP min')}</th><th>TP AU</th><th>S&C RPE</th><th>{L('S&C dk','S&C min')}</th><th>S&C AU</th><th>{L('Maç RPE','Game RPE')}</th><th>{L('Maç dk','Game min')}</th><th>{L('Maç AU','Game AU')}</th><th>{L('Toplam AU','Total AU')}</th><th>{L('Kaynak','Source')}</th><th style={{width:50}}></th>
              </tr></thead><tbody>
                {vis.map((s,idx)=>{const realIdx=ath.srpeLog.length-1-idx;
                  const us=(k,v)=>{const a=[...ath.srpeLog];a[realIdx]={...a[realIdx],[k]:v};
                    const r=a[realIdx];
                    const tp=(Number(r.tpRPE)||0)*(Number(r.tpDuration)||0);const sc=(Number(r.scRPE)||0)*(Number(r.scDuration)||0);const gm=(Number(r.gameRPE)||0)*(Number(r.gameDuration)||0);
                    a[realIdx]={...r,tpLoad:tp||'',scLoad:sc||'',gameLoad:gm||'',totalLoad:(tp+sc+gm)||''};
                    updAth(ath.id,{srpeLog:a});};
                  return<tr key={s.id||idx}>
                    <td><input type="date" value={s.date} onChange={e=>us('date',e.target.value)} style={{width:130}}/><div className="help">{fd(s.date)}</div></td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.tpRPE??''} onChange={e=>us('tpRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.tpDuration??''} onChange={e=>us('tpDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.tpLoad||'—'}</td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.scRPE??''} onChange={e=>us('scRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.scDuration??''} onChange={e=>us('scDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.scLoad||'—'}</td>
                    <td><input type="number" min="0" max="10" step="0.5" value={s.gameRPE??''} onChange={e=>us('gameRPE',e.target.value)} style={{width:55}}/></td>
                    <td><input type="number" value={s.gameDuration??''} onChange={e=>us('gameDuration',e.target.value)} style={{width:55}}/></td>
                    <td style={{color:'var(--accent2)',fontWeight:600}}>{s.gameLoad||'—'}</td>
                    <td style={{color:'var(--accent)',fontWeight:700}}>{s.totalLoad||'—'}</td>
                    <td>{(s.srcId||s.notionId)?<span className="team-badge">TALLY</span>:<span className="tag" style={{background:'var(--elevated)',color:'var(--muted)'}}>{L('ELLE','MANUAL')}</span>}</td>
                    {/* Deleting a Tally-sourced row also tombstones its submission id.
                        Without that the next Tally Sync finds no entry carrying the id and
                        adds it straight back — the coach deletes the same day forever. */}
                    <td><button className="btn xs danger" onClick={()=>{
                      const row=ath.srpeLog[realIdx];
                      const src=row&&(row.srcId||row.notionId);
                      const upd={srpeLog:ath.srpeLog.filter((_,j)=>j!==realIdx)};
                      if(src)upd.deletedSrpeSrcIds=[...new Set([...(ath.deletedSrpeSrcIds||[]),src])];
                      updAth(ath.id,upd);
                    }}>✕</button></td>
                  </tr>;})}
              </tbody></table>
              <div className="row" style={{justifyContent:'center',marginTop:10,gap:6}}>
                {hasMore&&<button className="btn sm sec" onClick={()=>setSrLimit(n=>n+10)}>{L(`10 tane daha (${rev.length-srLimit} kaldı)`,`Show 10 more (${rev.length-srLimit} remaining)`)}</button>}
                {srLimit>10&&<button className="btn sm sec" onClick={()=>setSrLimit(10)}>{L('Daralt','Collapse')}</button>}
                <span style={{fontSize:11,color:'var(--dim)',alignSelf:'center'}}>{L(`${rev.length} kayıttan ${vis.length} tanesi`,`Showing ${vis.length} of ${rev.length}`)}</span>
              </div></div>;
            })()}
          </div>);
        })()}
      </div>
    </div>}

    {tab==='calendar'&&<><CalendarView days={ath.days||{}} selected={athSel} setSelected={setAthSel}
      goDayView={k=>{setAthDayKey(k);}} weeks={weeks}
      saveDays={saveAthDays} setup={setup} labelOwner={ath.name} exercises={exercises}/>
    <MuscleLoadDistribution days={ath.days||{}} refDate={athSel.date}/></>}

    {tab==='report'&&(()=>{
      // Stat-row summaries on top of the existing ReportsBody (mockup design)
      const wkS=wk(parseD(athSel.date));const wkE=fmt(addD(parseD(wkS),6));
      const prevS=fmt(addD(parseD(wkS),-7));const prevE=fmt(addD(parseD(wkS),-1));
      const sumLoad=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).reduce((x,ses)=>x+(Number(ses.au)||0),0),0);
      const sumDur=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).reduce((x,ses)=>x+(Number(ses.duration)||0),0),0);
      const avgRPE=(s,e)=>{const rs=Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).flatMap(([,d])=>(d.sessions||[]).map(x=>Number(x.sRPE)).filter(n=>!isNaN(n)&&n>0));return rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length):null;};
      const sessCount=(s,e)=>Object.entries(ath.days||{}).filter(([k])=>k>=s&&k<=e).reduce((t,[,d])=>t+(d.sessions||[]).length,0);
      const wkLoad=Math.round(sumLoad(wkS,wkE));const prevLoad=Math.round(sumLoad(prevS,prevE));const loadDelta=wkLoad-prevLoad;
      const wkRPE=avgRPE(wkS,wkE);const wkDur=sumDur(wkS,wkE);
      const recentReadiness=(ath.wellness||[]).filter(w=>w.date>=wkS&&w.date<=wkE&&w.readiness!==''&&w.readiness!=null).map(w=>Number(w.readiness));
      const wkReadiness=recentReadiness.length?recentReadiness.reduce((a,b)=>a+b,0)/recentReadiness.length:null;
      // Monthly = last 4 weeks
      const m4start=fmt(addD(parseD(wkS),-21));const m4end=wkE;
      const mLoad=sumLoad(m4start,m4end);const avgWkLoad=Math.round(mLoad/4);const totalSess=sessCount(m4start,m4end);
      const mReady=(ath.wellness||[]).filter(w=>w.date>=m4start&&w.date<=m4end&&w.readiness!==''&&w.readiness!=null).map(w=>Number(w.readiness));
      const avgReady=mReady.length?(mReady.reduce((a,b)=>a+b,0)/mReady.length):null;
      const mRHR=(ath.wellness||[]).filter(w=>w.date>=m4start&&w.date<=m4end&&w.RHR!==''&&w.RHR!=null).map(w=>Number(w.RHR));
      const avgRHR=mRHR.length?(mRHR.reduce((a,b)=>a+b,0)/mRHR.length):null;
      return(<div>
        <div className="panel">
          <div className="ath-section-h"><div className="t">{L('Haftalık Rapor','Weekly Report')}</div><div className="s">{L('bu hafta','current week')} · {fd(wkS).slice(0,5)} → {fd(wkE).slice(0,5)}</div></div>
          <div className="ath-stat-row" style={{marginBottom:0}}>
            <div className="ath-stat"><div className="k">{L('Bu hafta yük','This week load')}</div><div className="v">{wkLoad.toLocaleString('en-US').replace(/,/g,'.')}<span className="u">AU</span></div>{prevLoad>0&&<div className={`d ${loadDelta>=0?'pos':'neg'}`}>{loadDelta>=0?'+':''}{loadDelta} {L('geçen haftaya göre','vs prev wk')}</div>}</div>
            <div className="ath-stat"><div className="k">{L('Ort. sRPE','Avg sRPE')}</div><div className="v">{wkRPE!=null?wkRPE.toFixed(1):'—'}</div><div className="sub">{L('seans şiddeti','session intensity')}</div></div>
            <div className="ath-stat"><div className="k">{L('Hacim','Volume')}</div><div className="v">{wkDur}<span className="u">{L('dk','min')}</span></div><div className="sub">{L('toplam seans süresi','total session time')}</div></div>
            <div className="ath-stat"><div className="k">{L('Hazır Oluş','Readiness')}</div><div className="v">{wkReadiness!=null?wkReadiness.toFixed(1):'—'}</div><div className="sub">/ 10</div></div>
          </div>
        </div>
        <div className="panel">
          <div className="ath-section-h"><div className="t">{L('Aylık Rapor','Monthly Report')}</div><div className="s">{L('son 4 hafta','last 4 weeks')}</div></div>
          <div className="ath-stat-row" style={{marginBottom:0}}>
            <div className="ath-stat"><div className="k">{L('Ort. haftalık yük','Avg weekly load')}</div><div className="v">{avgWkLoad.toLocaleString('en-US').replace(/,/g,'.')}<span className="u">AU</span></div></div>
            <div className="ath-stat"><div className="k">{L('Toplam seans','Total sessions')}</div><div className="v">{totalSess}</div></div>
            <div className="ath-stat"><div className="k">{L('Ort. hazır oluş','Avg readiness')}</div><div className="v">{avgReady!=null?avgReady.toFixed(1):'—'}</div></div>
            <div className="ath-stat"><div className="k">{L('Ort. RHR','Avg RHR')}</div><div className="v">{avgRHR!=null?Math.round(avgRHR):'—'}<span className="u">bpm</span></div></div>
          </div>
        </div>
        <ReportsBody days={ath.days||{}} weeks={weeks} selected={athSel} setSelected={setAthSel} ownerName={ath.name} onExportPDF={exportPDF}/>
      </div>);
    })()}

  </div>);
}

