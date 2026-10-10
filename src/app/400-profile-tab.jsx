/* The athlete's measures, read once for the profile tab and for the printed sheet:
   age from the date of birth; height, weight and wingspan from the most recent dated
   measurement or test, falling back to the static profile fields from ✎ Edit Profile. */
function athProfileBasics(ath){
  const age=ath.dateOfBirth?(()=>{const b=parseD(ath.dateOfBirth);const t=new Date();let y=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;return y;})():null;
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
  const sc=(ath.scYears===''||ath.scYears==null||isNaN(Number(ath.scYears)))?null:Number(ath.scYears);
  return{age,h,w,ws,sc};
}
/* The head coach's observations open and close as one block; which way it was left is
   remembered on this device. */
const HC_OPEN_KEY='coachos_hc_obs_open';
function ProfileTab({ath,updAth,setup}){
  const{age,h,w,ws}=athProfileBasics(ath);
  const srcLbl=x=>x?(x.date?L(`son ölçüm ${fd(x.date)}`,`last measured ${fd(x.date)}`):L('profilden','from profile')):L('henüz veri yok','no data yet');
  /* The scouting sheet. One object on the athlete, patched field by field — the
     ratings below never overwrite each other because each group is merged in. */
  const sc=ath.scout||{};
  const setSc=patch=>updAth(ath.id,{scout:{...sc,...patch}});
  const grp=g=>sc[g]||{};
  const setCrit=g=>(k,patch)=>setSc({[g]:{...grp(g),[k]:{...(grp(g)[k]||{}),...patch}}});
  const setField=(g,k)=>v=>setSc({[g]:{...grp(g),[k]:v}});
  const verdict=grp('verdict');
  const goals=(ath.goals&&typeof ath.goals==='object')?ath.goals:{};
  const setGoal=(k,v)=>updAth(ath.id,{goals:{...goals,[k]:v}});
  const[hcOpen,setHcOpen]=useState(()=>{try{return localStorage.getItem(HC_OPEN_KEY)==='1';}catch(e){return false;}});
  const toggleHc=()=>setHcOpen(o=>{const n=!o;try{localStorage.setItem(HC_OPEN_KEY,n?'1':'0');}catch(e){}return n;});
  const tech=scRead(SC_TECH,grp('tech')),mind=scRead(SC_MIND,grp('mind'));
  const pNow=scPos(sc.posNow),pPot=scPos(sc.posPot);
  const avgTxt=r=>r.avg==null?'—':`${r.avg.toFixed(1)} / 4`;
  return(<div className="pf2">
    <div className="pf2-stats">
      <div className="ath-stat"><div className="k">{L('Yaş','Age')}</div><div className="v">{age!=null?age:'—'}<span className="u">{L('yıl','yrs')}</span></div><div className="sub">{ath.dateOfBirth?L(`d. ${fd(ath.dateOfBirth)}`,`b. ${fd(ath.dateOfBirth)}`):L('doğum tarihini ✎ ile gir','set date of birth via ✎')}</div></div>
      <div className="ath-stat"><div className="k">{L('Boy','Height')}</div><div className="v">{h?h.v:'—'}<span className="u">cm</span></div><div className="sub">{srcLbl(h)}</div></div>
      <div className="ath-stat"><div className="k">{L('Kilo','Weight')}</div><div className="v">{w?w.v:'—'}<span className="u">kg</span></div><div className="sub">{srcLbl(w)}</div></div>
      <div className="ath-stat"><div className="k">{L('Kulaç','Wingspan')}</div><div className="v">{ws?ws.v:'—'}<span className="u">cm</span></div><div className="sub">{srcLbl(ws)}</div></div>
      {/* Typed in: how many years of structured strength & conditioning the athlete has. */}
      <label className="ath-stat pf2-sc">
        <div className="k">{L('S&C Deneyimi','S&C Experience')}</div>
        <div className="v"><input type="number" min="0" max="40" step="0.5" inputMode="decimal" value={ath.scYears??''}
          onChange={e=>updAth(ath.id,{scYears:e.target.value})} placeholder="—" aria-label={L('S&C deneyimi (yıl)','S&C experience (years)')}/>
          <span className="u">{L('yıl','yrs')}</span></div>
        <div className="sub">{L('elle girilir','typed in')}</div>
      </label>
    </div>
    <div className="pf2-cols">
      <div className="panel pf2-goals">
        <h2>{L('Performans Hedefleri','Performance Goals')}</h2>
        <div className="pf2-goal">
          <div className="pf2-goal-h"><b>{L('Kısa Vadeli','Short Term')}</b><span>{L('bu dönem','this period')}</span></div>
          <textarea rows={4} value={goals.short||''} onChange={e=>setGoal('short',e.target.value)}
            placeholder={L('Örn: 6 hafta içinde CMJ +3 cm, 20 m sprint 3.10 sn altı…','e.g. CMJ +3 cm within 6 weeks, 20 m sprint under 3.10 s…')}/>
        </div>
        <div className="pf2-goal">
          <div className="pf2-goal-h"><b>{L('Uzun Vadeli','Long Term')}</b><span>{L('sezon ve sonrası','season and beyond')}</span></div>
          <textarea rows={4} value={goals.long||''} onChange={e=>setGoal('long',e.target.value)}
            placeholder={L('Örn: üst yapıya hazır fiziksel profil, sakatlıksız bir sezon…','e.g. a physical profile ready for the senior level, an injury-free season…')}/>
        </div>
      </div>
      <NotesPanel ath={ath} updAth={updAth} title={L('Bireysel Gözlemler','Individual Observations')}
        emptyText={L('Henüz gözlem yok — sporcu hakkındaki bireysel gözlemlerini tarihli bir not olarak ekle.','No observations yet — add your individual observations about the athlete as a dated note.')}
        placeholder={L('Sporcu hakkındaki bireysel gözlemler: karakter, antrenmana yaklaşım, fiziksel durum, dikkat edilmesi gerekenler…','Individual observations about the athlete: character, approach to training, physical state, what to watch…')}/>
    </div>

    {/* ── Head coach's observations: one block that opens and closes ── */}
    <div className={`hc-wrap${hcOpen?' open':''}`}>
      <button className="hc-head" aria-expanded={hcOpen} onClick={toggleHc}>
        <span className="hc-tx">
          <span className="hc-t">{L('Baş Antrenör Gözlemleri','Head Coach Observations')}</span>
          <span className="hc-d">{L('Modern pozisyon · Teknik ve taktik · Zihinsel, karakter ve sosyal · Genel değerlendirme','Modern position · Technical & tactical · Mental, character & social · Overall assessment')}</span>
        </span>
        <span className="hc-chips">
          <span className="hc-chip"><em>{L('Mevcut','Current')}</em><b>{pNow?pNow.k:'—'}</b></span>
          <span className="hc-chip"><em>{L('Potansiyel','Potential')}</em><b>{pPot?pPot.k:'—'}</b></span>
          <span className="hc-chip"><em>{L('Teknik-Taktik','Tech-Tactical')}</em><b>{avgTxt(tech)}</b></span>
          <span className="hc-chip"><em>{L('Zihinsel','Mental')}</em><b>{avgTxt(mind)}</b></span>
        </span>
        <span className="hc-car" aria-hidden="true">▾</span>
      </button>
      {hcOpen&&<div className="hc-body sc-wrap">
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
        {/* ── 2 · technical & tactical: the table, its radar and what it adds up to ── */}
        <ScSection n={2} radar title={L('Teknik ve Taktik Değerlendirme','Technical & Tactical Assessment')}
          radarTitle={L('Teknik ve Taktik Profil','Technical & Tactical Profile')}
          desc={L('Topla ve topsuz oyunun sahadaki karşılığı.','What the game looks like on the floor, with the ball and without it.')}
          items={SC_TECH} vals={grp('tech')} onSet={setCrit('tech')}/>
        {/* ── 3 · mental, character & social ── */}
        <ScSection n={3} title={L('Zihinsel, Karakter ve Sosyal Beceriler','Mental, Character & Social Skills')}
          desc={L('Yeteneğin ne kadarının sahaya çıkacağını belirleyen taraf.','The side of an athlete that decides how much of the talent reaches the floor.')}
          items={SC_MIND} vals={grp('mind')} onSet={setCrit('mind')}/>
        {/* ── 4 · the head coach's verdict ── */}
        <div className="sc-sec">
          <div className="sc-sec-h">
            <div className="sc-sec-n">4</div>
            <div className="sc-sec-tx">
              <div className="sc-sec-t">{L('Baş Antrenör Genel Değerlendirmesi','Head Coach’s Overall Assessment')}</div>
              <div className="sc-sec-d">{L('Güçlü yönler, öncelikli gelişim alanları ve gelecek dönem hedefleri.','Strengths, the development priorities, and the targets for the coming period.')}</div>
            </div>
          </div>
          <div className="sc-sec-b hc-verdict">
            <div className="sc-f hc-v-main">
              <label>{L('Genel değerlendirme','Overall assessment')}</label>
              <textarea value={verdict.summary||''} onChange={e=>setField('verdict','summary')(e.target.value)}
                placeholder={L('Güçlü yönler, öncelikli gelişim alanları ve gelecek dönem hedefleri…','Strengths, development priorities and targets for the coming period…')}/>
            </div>
            <div className="hc-v-side">
              <div className="sc-f">
                <label>{L('Baş Antrenör','Head Coach')}</label>
                <input value={verdict.coach||''} onChange={e=>setField('verdict','coach')(e.target.value)}
                  placeholder={L('Ad soyad','Full name')}/>
              </div>
              <div className="sc-f">
                <label>{L('Tarih','Date')}</label>
                <input value={verdict.date||''} onChange={e=>setField('verdict','date')(e.target.value)}
                  placeholder={L('gg/aa/yyyy','dd/mm/yyyy')}/>
              </div>
              <div className="hc-v-key">
                <div><span>{L('Teknik-Taktik','Tech-Tactical')}</span><b>{avgTxt(tech)}</b></div>
                <div><span>{L('Zihinsel','Mental')}</span><b>{avgTxt(mind)}</b></div>
                <div><span>{L('Pozisyon','Position')}</span><b>{pNow?pNow.k:'—'}{pPot&&(!pNow||pPot.k!==pNow.k)?` → ${pPot.k}`:''}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </div>
  </div>);
}
