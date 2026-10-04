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
