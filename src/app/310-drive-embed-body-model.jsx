/* =========================================================
   GOOGLE DRIVE EMBED HELPERS
   Videos & images can be hosted on Google Drive (no server storage).
   ========================================================= */
// ⬇️  CHANGE THIS to your own Google Drive video file ID (or full share link).
//    Open the video in Drive → Share → "Copy link". You can paste the whole
//    link here OR just the ID part, e.g. "1AbCDeFgHIjkLMnOpQ".
const DRIVE_VIDEO_ID = "YOUR_DRIVE_FILE_ID";

// Extracts the file ID from any Drive URL form (/file/d/ID/…, ?id=ID, /d/ID) or a raw ID.
function driveId(url){
  if(!url)return '';
  const s=String(url).trim();
  let m=s.match(/\/file\/d\/([\w-]+)/)||s.match(/\/d\/([\w-]+)/)||s.match(/[?&]id=([\w-]+)/);
  if(m)return m[1];
  if(/^[\w-]{16,}$/.test(s))return s; // looks like a bare ID
  return '';
}
// Drive-hosted image URL usable directly in <img src> (no server storage).
function driveImg(id){return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;}

/* Responsive, centred Google Drive video player. Pass an ID or full share link. */
function DriveVideo({id,title}){
  const vid=driveId(id)||(/^[\w-]{16,}$/.test(String(id||'').trim())?String(id).trim():'');
  if(!vid||vid==='YOUR_DRIVE_FILE_ID'){
    return(<div className="dv-box"><div className="dv-frame dv-empty">
      <div>🎬</div>
      <div className="dv-empty-t">{L('Drive videosu tanımlı değil','No Drive video configured')}</div>
      <div className="dv-empty-s">{L(<>Kod içindeki <code>DRIVE_VIDEO_ID</code> değerini Google&nbsp;Drive video bağlantın ya da dosya kimliğinle doldur.</>,
        <>Set <code>DRIVE_VIDEO_ID</code> in the code to your Google&nbsp;Drive video link or file ID.</>)}</div>
    </div></div>);
  }
  return(<div className="dv-box">
    <div className="dv-frame">
      <iframe src={`https://drive.google.com/file/d/${vid}/preview`} allow="autoplay; fullscreen" allowFullScreen title={title||'Drive video'}/>
    </div>
    {title&&<div className="dv-cap">▶ {title}</div>}
  </div>);
}

/* =========================================================
   2D BODY CIRCUMFERENCE MODEL
   A front-view stylised human silhouette. Each measurement is entered in a
   small card flanking the body and is also shown ON the model (pill at the
   measuring-tape ellipse). Clicking a body band focuses its input.
   ========================================================= */
const CIRC_FIELDS=[
  {k:'shoulder',  tr:'Omuz',       en:'Shoulder', side:'r', cardTop:50,  cx:180,cy:80, rx:40,ry:7, px:218,py:80},
  {k:'waist',     tr:'Bel',        en:'Waist',    side:'l', cardTop:162, cx:180,cy:156,rx:26,ry:7, px:152,py:156},
  {k:'hip',       tr:'Kalça',      en:'Hip',      side:'r', cardTop:162, cx:180,cy:192,rx:34,ry:7, px:212,py:192},
  {k:'thighRight',tr:'Uyluk (Sağ)',en:'Thigh R',  side:'l', cardTop:262, cx:168,cy:254,rx:15,ry:6, px:151,py:254},
  {k:'thighLeft', tr:'Uyluk (Sol)',en:'Thigh L',  side:'r', cardTop:262, cx:192,cy:254,rx:15,ry:6, px:209,py:254},
  {k:'calfRight', tr:'Baldır (Sağ)',en:'Calf R',  side:'l', cardTop:362, cx:167,cy:348,rx:12,ry:6, px:153,py:348},
  {k:'calfLeft',  tr:'Baldır (Sol)',en:'Calf L',  side:'r', cardTop:362, cx:193,cy:348,rx:12,ry:6, px:207,py:348},
];
function BodyCircumferenceModel({test,onUpdate,lang}){
  const circ=test.circ||{};
  const setVal=(k,v)=>onUpdate({circ:{...(test.circ||{}),[k]:v}});
  const Lx=(tr,en)=>lang==='en'?en:tr;
  /* input chips overlaid on the body — side (l/r) + vertical %position */
  const CHIPS=[
    {k:'shoulder',  tr:'Omuz',       en:'Shoulder', side:'l', top:13},
    {k:'waist',     tr:'Bel',        en:'Waist',    side:'l', top:35},
    {k:'thighRight',tr:'Uyluk (Sağ)',en:'Thigh R',  side:'l', top:57},
    {k:'calfRight', tr:'Baldır (Sağ)',en:'Calf R',  side:'l', top:74},
    {k:'hip',       tr:'Kalça',      en:'Hip',      side:'r', top:40},
    {k:'thighLeft', tr:'Uyluk (Sol)',en:'Thigh L',  side:'r', top:57},
    {k:'calfLeft',  tr:'Baldır (Sol)',en:'Calf L',  side:'r', top:74},
  ];
  return(<div className="bcm2">
    <img className="bcm2-body" src="body-model.png" width="122" height="325" alt="" aria-hidden="true"/>
    {CHIPS.map(c=>(
      <div key={c.k} className={"bcm2-chip"+(c.side==='r'?' r':'')} style={{top:c.top+'%',[c.side==='r'?'right':'left']:0}}>
        <div className="bcm2-chip-l">{Lx(c.tr,c.en)}</div>
        <div className="bcm2-chip-in">
          <input type="number" step="0.1" inputMode="decimal" placeholder="—" value={circ[c.k]||''} onChange={e=>setVal(c.k,e.target.value)}/>
          <span className="bcm2-chip-u">cm</span>
        </div>
      </div>
    ))}
  </div>);
}

