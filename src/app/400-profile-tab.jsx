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
