/* =========================================================
   BALL PRACTICE — the court, and the drills drawn on it
   =========================================================
   A strength coach writes sets and reps; a basketball coach draws. So a ball-practice row
   is a diagram first: a court the coach draws the drill on the way they would on a
   clipboard, a clip of it being run, and the prescription (sets, reps, time, intensity,
   rest) around the edges.

   Everything here works in COURT COORDINATES — centimetres on a FIBA floor, 2800 × 1500,
   origin at the left baseline corner. A drawing is stored in those numbers and nothing
   else, which is what lets the same drill be shown half-court in the editor, full-court on
   the next drill, thumbnail-sized on a library card and full width on the printed sheet
   without any of them re-scaling the coach's lines. The half-court view is the same floor
   seen turned a quarter turn (baseline at the bottom, the way a coach draws it), applied
   as one transform on the group — never by storing different numbers. */
const CRT={W:2800,H:1500,             // FIBA floor, cm
  HOOP_X:157.5,HOOP_R:22.75,          // ring centre from the baseline, ring radius
  BOARD_X:120,BOARD_HW:90,            // backboard face, half its width
  KEY_L:580,KEY_HW:245,               // free-throw lane: 5.80 long, 4.90 wide
  FT_R:180,                           // free-throw circle
  R3:675,C3:90,                       // three-point arc, and the corner line's inset
  RA:125,                             // restricted area under the ring
  CC:180};                            // centre circle
// Where the corner three meets the arc — the x at which a line drawn C3 from the sideline
// is exactly R3 from the ring.
CRT.ARC3_X=CRT.HOOP_X+Math.sqrt(CRT.R3*CRT.R3-Math.pow(CRT.H/2-CRT.C3,2));
const CY=CRT.H/2;

/* ---- Element descriptors --------------------------------------------------
   Both renderers — React on screen, an HTML string on the printed sheet — are fed the
   same list of {tag, attrs, kids, text} descriptors, so the court a coach draws on and
   the court that comes out of the printer can never drift apart. Attribute names are
   written the SVG way (`stroke-width`); the React side camel-cases them on the way in. */
const el=(tag,attrs,kids,text)=>({tag,attrs:attrs||{},kids:kids||null,text:text==null?null:text});
const camel=k=>k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
function elsToReact(list,keyPfx){
  return (list||[]).map((e,i)=>{
    const p={key:`${keyPfx||'e'}-${i}`};
    for(const k in e.attrs)p[camel(k)]=e.attrs[k];
    return React.createElement(e.tag,p,e.kids?elsToReact(e.kids,`${keyPfx||'e'}-${i}`):e.text);
  });
}
function elsToSVGString(list){
  return (list||[]).map(e=>{
    const a=Object.keys(e.attrs).map(k=>`${k}="${escHTML(String(e.attrs[k]))}"`).join(' ');
    const inner=e.kids?elsToSVGString(e.kids):(e.text==null?'':escHTML(String(e.text)));
    return `<${e.tag}${a?' '+a:''}>${inner}</${e.tag}>`;
  }).join('');
}

/* ---- The floor ------------------------------------------------------------
   One end's markings, drawn against the baseline at x = 0; the far end is the same
   drawing mirrored about the halfway line, which is what a court is. `ink` is the line
   colour: light on the app's dark board, dark on the printed sheet. */
function courtEndEls(ink,lw){
  const s={fill:'none',stroke:ink,'stroke-width':lw};
  const K=CRT;
  return[
    // Free-throw lane, and the free-throw line across the top of it
    el('rect',{...s,x:0,y:CY-K.KEY_HW,width:K.KEY_L,height:K.KEY_HW*2}),
    // Free-throw circle: solid outside the lane, dashed where it crosses it
    el('path',{...s,d:`M ${K.KEY_L} ${CY-K.FT_R} A ${K.FT_R} ${K.FT_R} 0 0 1 ${K.KEY_L} ${CY+K.FT_R}`}),
    el('path',{...s,'stroke-dasharray':`${lw*4} ${lw*4}`,d:`M ${K.KEY_L} ${CY-K.FT_R} A ${K.FT_R} ${K.FT_R} 0 0 0 ${K.KEY_L} ${CY+K.FT_R}`}),
    // Three-point line: two corner straights into the arc around the ring
    el('path',{...s,d:`M 0 ${K.C3} L ${K.ARC3_X.toFixed(1)} ${K.C3} A ${K.R3} ${K.R3} 0 0 1 ${K.ARC3_X.toFixed(1)} ${K.H-K.C3} L 0 ${K.H-K.C3}`}),
    // No-charge semicircle under the ring
    el('path',{...s,d:`M ${K.HOOP_X} ${CY-K.RA} A ${K.RA} ${K.RA} 0 0 1 ${K.HOOP_X} ${CY+K.RA}`}),
    // Backboard, ring neck, ring
    el('line',{stroke:ink,'stroke-width':lw*1.8,'stroke-linecap':'round',x1:K.BOARD_X,y1:CY-K.BOARD_HW,x2:K.BOARD_X,y2:CY+K.BOARD_HW}),
    el('line',{stroke:ink,'stroke-width':lw,x1:K.BOARD_X,y1:CY,x2:K.HOOP_X-K.HOOP_R,y2:CY}),
    el('circle',{...s,cx:K.HOOP_X,cy:CY,r:K.HOOP_R}),
  ];
}
/* The whole floor. `half` keeps the drawing to the near end and turns it a quarter turn so
   the baseline sits at the bottom — the orientation a coach draws a set play in. */
function courtEls({half,ink,surface,line}){
  const lw=line||5;
  const body=[
    el('rect',{x:0,y:0,width:CRT.W,height:CRT.H,fill:surface,stroke:ink,'stroke-width':lw*1.4}),
    ...courtEndEls(ink,lw),
    el('g',{transform:`translate(${CRT.W},0) scale(-1,1)`},courtEndEls(ink,lw)),
    el('line',{stroke:ink,'stroke-width':lw,x1:CRT.W/2,y1:0,x2:CRT.W/2,y2:CRT.H}),
    el('circle',{fill:'none',stroke:ink,'stroke-width':lw,cx:CRT.W/2,cy:CY,r:CRT.CC}),
  ];
  return half?[el('g',{transform:HALF_TF},body)]:body;
}
/* court (x,y) → half-court display (y, 1400−x): the quarter turn, as one matrix. */
const HALF_TF=`matrix(0,-1,1,0,0,${CRT.W/2})`;
const courtViewBox=half=>half?`0 0 ${CRT.H} ${CRT.W/2}`:`0 0 ${CRT.W} ${CRT.H}`;
const courtRatio=half=>half?CRT.H/(CRT.W/2):CRT.W/CRT.H;

/* ---- The coach's own lines ------------------------------------------------
   Seven ways to mark a court, and they mean seven different things — a pass is not a cut
   and a dribble is not a screen, so each carries the notation a coach already reads:
   dashed for a pass, a wave for a dribble, a bar across the end for a screen. */
const CT_TOOLS=[
  {id:'select', tr:'Seç',       en:'Select',    ic:'⤧'},
  {id:'free',   tr:'Kalem',     en:'Pen',       ic:'✎'},
  {id:'cut',    tr:'Kesme',     en:'Cut',       ic:'→'},
  {id:'dribble',tr:'Top sürme', en:'Dribble',   ic:'∿'},
  {id:'pass',   tr:'Pas',       en:'Pass',      ic:'⇢'},
  {id:'screen', tr:'Perde',     en:'Screen',    ic:'⊣'},
  {id:'shot',   tr:'Şut',       en:'Shot',      ic:'⤳'},
  {id:'zone',   tr:'Alan',      en:'Zone',      ic:'▱'},
  {id:'erase',  tr:'Sil',       en:'Erase',     ic:'⌫'},
];
const CT_MARKS=[
  {id:'off',   tr:'Hücum',     en:'Offense',  ic:'①'},
  {id:'def',   tr:'Savunma',   en:'Defense',  ic:'✕'},
  {id:'coach', tr:'Koç',       en:'Coach',    ic:'C'},
  {id:'ball',  tr:'Top',       en:'Ball',     ic:'●'},
  {id:'cone',  tr:'Koni',      en:'Cone',     ic:'▲'},
  {id:'disc',  tr:'Tabak',     en:'Disc',     ic:'⬬'},
  {id:'chair', tr:'Sandalye',  en:'Chair',    ic:'▣'},
  {id:'ladder',tr:'Merdiven',  en:'Ladder',   ic:'☰'},
  {id:'rack',  tr:'Top arabası',en:'Ball rack',ic:'⛁'},
  {id:'text',  tr:'Yazı',      en:'Label',    ic:'T'},
];
const CT_COLORS=['#ffffff','#ff5b5b','#4da3ff','#ffd23f','#46d6a0','#c084fc','#ff9f43','#111111'];
const CT_WIDTHS=[6,11,18,27];   // court centimetres, so a line keeps its weight at any zoom

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
/* Catmull-Rom through the captured points, emitted as cubic béziers — a hand-drawn line
   that stays a hand-drawn line instead of the polygon the raw pointer samples make. */
function smoothPath(p){
  if(!p.length)return'';
  if(p.length<3)return`M ${p[0][0]} ${p[0][1]}`+(p[1]?` L ${p[1][0]} ${p[1][1]}`:'');
  let d=`M ${p[0][0]} ${p[0][1]}`;
  for(let i=0;i<p.length-1;i++){
    const p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p[i+1];
    d+=` C ${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
/* A dribble is drawn as a wave along the path. The line is resampled at a fixed arc
   length and pushed alternately to either side of it, so the wave keeps one amplitude
   whether the coach drew ten centimetres or the length of the floor. */
function wavePts(p,amp){
  const step=amp*1.15;const out=[];let carry=0;
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1];const len=dist(a,b);if(len<.001)continue;
    const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;
    for(let t=carry;t<len;t+=step){
      const k=out.length%2?1:-1;
      out.push([a[0]+ux*t-uy*amp*k,a[1]+uy*t+ux*amp*k]);
    }
    carry=(carry-len)%step;if(carry<0)carry+=step;
  }
  out.push(p[p.length-1]);
  return out.length>2?out:p;
}
/* The path with `d` of its length taken off the end — how the dribble's wave is kept clear
   of its own arrowhead, which otherwise sits inside the last oscillation and stops reading
   as an arrow at all. */
function trimEnd(p,d){
  const out=p.slice();let left=d;
  while(out.length>2){
    const b=out[out.length-1],a=out[out.length-2],L=dist(a,b);
    if(L>left){const t=(L-left)/L;out[out.length-1]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];return out;}
    left-=L;out.pop();
  }
  return out;
}
// The head of an arrow, as a filled triangle on the path's last direction.
function arrowEls(p,c,w){
  if(p.length<2)return[];
  const b=p[p.length-1];let a=p[p.length-2];
  for(let i=p.length-2;i>=0&&dist(a,b)<w;i--)a=p[i];
  const len=dist(a,b)||1,ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;
  const h=w*4,hw=w*1.9;
  const bx=b[0]-ux*h,by=b[1]-uy*h;
  return[el('polygon',{fill:c,points:`${b[0]},${b[1]} ${bx-uy*hw},${by+ux*hw} ${bx+uy*hw},${by-ux*hw}`})];
}
// A screen ends in a bar across the direction of travel — the blocker's shoulders.
function teeEls(p,c,w){
  if(p.length<2)return[];
  const b=p[p.length-1],a=p[p.length-2];
  const len=dist(a,b)||1,ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len,hw=w*2.4;
  return[el('line',{stroke:c,'stroke-width':w,'stroke-linecap':'round',
    x1:b[0]-uy*hw,y1:b[1]+ux*hw,x2:b[0]+uy*hw,y2:b[1]-ux*hw})];
}
/* One drawn item → the elements that draw it. Every tool shares the same stored shape
   (a list of points, a colour, a width); only what is made of them differs. */
function strokeEls(it){
  const c=it.c||'#fff',w=it.w||11,p=it.pts||[];
  if(p.length<1)return[];
  const base={fill:'none',stroke:c,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'};
  if(it.tool==='zone'){
    return[el('path',{...base,fill:c,'fill-opacity':.14,'stroke-dasharray':`${w*2.4} ${w*1.8}`,d:smoothPath(p)+' Z'})];
  }
  if(it.tool==='dribble'){
    const wv=wavePts(trimEnd(p,w*4.4),w*1.9);
    return[el('path',{...base,d:smoothPath(wv)}),...arrowEls(p,c,w)];
  }
  if(it.tool==='pass')return[el('path',{...base,'stroke-dasharray':`${w*2.6} ${w*2.2}`,d:smoothPath(p)}),...arrowEls(p,c,w)];
  if(it.tool==='shot')return[el('path',{...base,'stroke-dasharray':`${w*.1} ${w*2.4}`,d:smoothPath(p)}),...arrowEls(p,c,w)];
  if(it.tool==='screen')return[el('path',{...base,d:smoothPath(p)}),...teeEls(p,c,w)];
  if(it.tool==='cut')return[el('path',{...base,d:smoothPath(p)}),...arrowEls(p,c,w)];
  return[el('path',{...base,d:smoothPath(p)})];   // free pen
}
const MK_R=46;   // a player on the floor, in court centimetres
/* Readable ink for a number written INSIDE a filled marker. The coach picks the colour of
   their players, and the palette runs from white to near-black — a number written in one
   fixed dark ink disappears the moment somebody picks black. Relative luminance decides,
   so every colour on the palette (and any custom one) keeps its number legible. */
function inkOn(hex){
  const s=String(hex||'').replace('#','');
  const h=s.length===3?s.split('').map(c=>c+c).join(''):s;
  if(!/^[0-9a-f]{6}$/i.test(h))return'#0b0f14';
  const v=i=>{const c=parseInt(h.slice(i,i+2),16)/255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);};
  return(.2126*v(0)+.7152*v(2)+.0722*v(4))>.42?'#0b0f14':'#ffffff';
}
/* One placed object → the elements that draw it. Players are the two shapes every
   basketball diagram uses — a numbered circle for the offence, an X for the defender —
   and the equipment is drawn as itself so a coach reads the set-up without a legend. */
function markEls(it){
  const c=it.c||'#fff',x=it.x,y=it.y,r=MK_R;
  /* Centred on the marker by `dominant-baseline`, not by nudging the baseline down a
     fraction of the font size: the nudge is a direction, and a direction does not survive
     the half-court quarter turn (the letters stay upright, so the nudge would tip over on
     its side and push the number out of its circle). The anchor is the centre either way. */
  const txt=(s,size,col)=>el('text',{x,y,'text-anchor':'middle','dominant-baseline':'central','font-size':size,
    'font-family':"'IBM Plex Mono',ui-monospace,monospace",'font-weight':'700',fill:col||inkOn(c)},null,s);
  switch(it.kind){
    case'off':  return[el('circle',{cx:x,cy:y,r,fill:c,stroke:'#0b0f14','stroke-width':4}),txt(it.label||'',r*1.02)];
    case'def':  return[el('line',{stroke:c,'stroke-width':13,'stroke-linecap':'round',x1:x-r*.8,y1:y-r*.8,x2:x+r*.8,y2:y+r*.8}),
                       el('line',{stroke:c,'stroke-width':13,'stroke-linecap':'round',x1:x+r*.8,y1:y-r*.8,x2:x-r*.8,y2:y+r*.8}),
                       el('text',{x:x+r*1.15,y:y-r*.5,'font-size':r*.95,'font-family':"'IBM Plex Mono',ui-monospace,monospace",'font-weight':'700',fill:c},null,it.label||'')];
    case'coach':return[el('circle',{cx:x,cy:y,r:r*.95,fill:'none',stroke:c,'stroke-width':11}),txt('C',r*1.05,c)];
    case'ball': return[el('circle',{cx:x,cy:y,r:r*.5,fill:'#ff9f43',stroke:'#0b0f14','stroke-width':4}),
                       el('line',{stroke:'#0b0f14','stroke-width':3.5,x1:x-r*.5,y1:y,x2:x+r*.5,y2:y}),
                       el('path',{fill:'none',stroke:'#0b0f14','stroke-width':3.5,d:`M ${x} ${y-r*.5} Q ${x+r*.28} ${y} ${x} ${y+r*.5}`})];
    case'cone': return[el('polygon',{fill:c,stroke:'#0b0f14','stroke-width':3,points:`${x},${y-r*.85} ${x+r*.72},${y+r*.55} ${x-r*.72},${y+r*.55}`})];
    case'disc': return[el('ellipse',{cx:x,cy:y,rx:r*.8,ry:r*.34,fill:c,stroke:'#0b0f14','stroke-width':3})];
    case'chair':return[el('rect',{x:x-r*.62,y:y-r*.62,width:r*1.24,height:r*1.24,rx:r*.16,fill:'none',stroke:c,'stroke-width':10}),
                       el('line',{stroke:c,'stroke-width':10,'stroke-linecap':'round',x1:x-r*.62,y1:y-r*.62,x2:x+r*.62,y2:y-r*.62})];
    case'ladder':return[el('rect',{x:x-r*.45,y:y-r,width:r*.9,height:r*2,fill:'none',stroke:c,'stroke-width':7}),
                       el('line',{stroke:c,'stroke-width':6,x1:x-r*.45,y1:y-r*.4,x2:x+r*.45,y2:y-r*.4}),
                       el('line',{stroke:c,'stroke-width':6,x1:x-r*.45,y1:y+r*.2,x2:x+r*.45,y2:y+r*.2})];
    case'rack': return[el('rect',{x:x-r*.9,y:y-r*.55,width:r*1.8,height:r*1.1,rx:r*.2,fill:'none',stroke:c,'stroke-width':8}),
                       el('circle',{cx:x-r*.42,cy:y,r:r*.28,fill:c}),el('circle',{cx:x+r*.42,cy:y,r:r*.28,fill:c})];
    case'text': return[el('text',{x,y,'text-anchor':'middle','font-size':r*1.25,'font-weight':'700',
                       'font-family':"'Archivo',system-ui,sans-serif",fill:c},null,it.label||'')];
    default:    return[];
  }
}
/* Lines turn with the floor; objects on it do not. A pass drawn from the wing to the post
   has to follow the court whichever way the court is being looked at — but a player's
   number, a defender's X1, a cone and a ball rack are things seen from above, and they
   read upside-down the moment the floor is turned. So a marker is turned back through the
   half-court quarter turn about its own centre: the centre is exactly where the rotation
   leaves it, so the marker does not move a millimetre — only which way up it is drawn. */
function sceneItemEls(it,half){
  if(it.t!=='mark')return strokeEls(it);
  const body=markEls(it);
  return half?[el('g',{transform:`rotate(90 ${it.x} ${it.y})`},body)]:body;
}
/* Players and equipment paint over the lines, whatever order they were drawn in. A pass
   is drawn BETWEEN two players, so a line that runs across the face of one — hiding the
   number that says who it is — is never what the coach meant, and the alternative (place
   everybody before drawing anything) is not how a board gets used. Each item keeps its
   own index so the editor's selection still points at the right thing. */
const paintOrder=items=>(items||[]).map((it,i)=>[it,i])
  .sort((a,b)=>(a[0].t==='mark'?1:0)-(b[0].t==='mark'?1:0));   // stable: order within each half is kept
/* The whole scene. Half-court view wraps it in the same quarter turn the floor gets, so
   the drawing and the floor it was drawn on can never come apart. */
function sceneEls(items,half){
  const body=paintOrder(items).reduce((a,[it])=>a.concat(sceneItemEls(it,half)),[]);
  return half?[el('g',{transform:HALF_TF},body)]:body;
}
const emptyScene=()=>({v:1,half:true,items:[]});
const normScene=s=>(s&&Array.isArray(s.items))?{v:1,half:s.half!==false,items:s.items}:emptyScene();
const sceneIsEmpty=s=>!s||!Array.isArray(s.items)||s.items.length===0;

/* ---- Read-only court ------------------------------------------------------
   The same drawing at any size: a thumbnail on a library card, a strip in the day drawer,
   a full-width figure on the printed sheet. */
function CourtView({scene,className,style,print}){
  const sc=normScene(scene);
  const ink=print?'#334155':'rgba(255,255,255,.42)';
  const surface=print?'#ffffff':'#171a1f';
  return(<svg className={className} style={style} viewBox={courtViewBox(sc.half)} preserveAspectRatio="xMidYMid meet">
    {elsToReact(courtEls({half:sc.half,ink,surface,line:print?4:5}),'c')}
    {elsToReact(sceneEls(sc.items,sc.half),'s')}
  </svg>);
}
// The printed sheet's copy of a diagram — same descriptors, emitted as markup.
function courtSVGString(scene){
  const sc=normScene(scene);
  return`<svg class="court-fig" viewBox="${courtViewBox(sc.half)}" preserveAspectRatio="xMidYMid meet">`
    +elsToSVGString(courtEls({half:sc.half,ink:'#334155',surface:'#ffffff',line:4}))
    +elsToSVGString(sceneEls(sc.items,sc.half))+`</svg>`;
}

/* ---- The board -----------------------------------------------------------
   Draw with the pointer, place objects with a click, drag them with Select, take one
   back with Undo. Every line is stored as the points it was drawn through, so nothing is
   flattened into a picture: a drawing made half-court can be reread full-court, an object
   put down in the wrong place can be picked up again, and the whole thing still travels
   as a few kilobytes of JSON rather than a PNG. */
/* `barSlot` (an element, optional) takes the tool rail out of the board's own header and
   paints it wherever the caller wants it — the exercise card puts it beside the clip, so
   the tools are not stacked on top of the floor they draw on. `zoom` blows the board up to
   the whole screen with nothing but the floor and the tools on it, which is the only way
   a half court is big enough to draw on with a finger. */
function CourtEditor({value,onChange,barSlot}){
  const sc=normScene(value);
  const items=sc.items;
  const[tool,setTool]=useState('free');
  const[mark,setMark]=useState('');           // a placeable object, when one is armed
  const[color,setColor]=useState('#ffffff');
  const[wid,setWid]=useState(CT_WIDTHS[1]);
  const[straight,setStraight]=useState(false);
  const[draft,setDraft]=useState(null);
  const[sel,setSel]=useState(null);
  const[zoom,setZoom]=useState(false);
  const[hist,setHist]=useState({undo:[],redo:[]});
  const gRef=useRef(null),dragRef=useRef(null);
  // Escape leaves the blown-up board — the same key that closes everything else here.
  useEffect(()=>{
    if(!zoom)return;
    const k=e=>{if(e.key==='Escape'){e.stopPropagation();setZoom(false);}};
    window.addEventListener('keydown',k,true);
    return()=>window.removeEventListener('keydown',k,true);
  },[zoom]);

  const write=(next,push=true)=>{
    if(push)setHist(h=>({undo:[...h.undo.slice(-49),items],redo:[]}));
    onChange({v:1,half:sc.half,items:next});
  };
  const undo=()=>setHist(h=>{
    if(!h.undo.length)return h;
    onChange({v:1,half:sc.half,items:h.undo[h.undo.length-1]});
    return{undo:h.undo.slice(0,-1),redo:[...h.redo,items]};
  });
  const redo=()=>setHist(h=>{
    if(!h.redo.length)return h;
    onChange({v:1,half:sc.half,items:h.redo[h.redo.length-1]});
    return{undo:[...h.undo,items],redo:h.redo.slice(0,-1)};
  });
  // Screen pixels → court centimetres, straight off the group's own matrix, so the half
  // court's quarter turn is inverted with everything else instead of by hand.
  const toCourt=e=>{
    const g=gRef.current;if(!g||!g.getScreenCTM)return null;
    const m=g.getScreenCTM();if(!m)return null;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());
    return[Math.round(p.x),Math.round(p.y)];
  };
  /* What is under the pointer. Read in reverse paint order, so what the coach can SEE on
     top is what gets picked: every marker first (they paint over the lines), latest-drawn
     first within each, then the lines. A marker is caught within reach of its centre, a
     line within a finger's width of any part of it. */
  const hit=pt=>{
    const order=paintOrder(items);
    for(let k=order.length-1;k>=0;k--){
      const[it,i]=order[k];
      if(it.t==='mark'){if(dist(pt,[it.x,it.y])<MK_R*1.5)return i;continue;}
      const tol=Math.max((it.w||11)*2.2,42);
      const p=it.pts||[];
      for(let j=0;j<p.length;j++){
        if(dist(pt,p[j])<tol)return i;
        if(j<p.length-1){
          const a=p[j],b=p[j+1],L=dist(a,b);
          if(L>0.001){
            const t=Math.max(0,Math.min(1,((pt[0]-a[0])*(b[0]-a[0])+(pt[1]-a[1])*(b[1]-a[1]))/(L*L)));
            if(dist(pt,[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])])<tol)return i;
          }
        }
      }
    }
    return -1;
  };
  // Offence and defence number themselves 1-5 as they go down, so a five-man set is placed
  // without stopping to label anybody.
  const nextNum=kind=>{
    const n=items.filter(i=>i.t==='mark'&&i.kind===kind).length;
    return String((n%5)+1);
  };
  const placeMark=pt=>{
    let label='';
    if(mark==='off')label=nextNum('off');
    else if(mark==='def')label='X'+nextNum('def');
    else if(mark==='text'){
      label=(window.prompt(L('Etiket yazısı','Label text'),'')||'').trim();
      if(!label)return;
    }
    write([...items,{id:uid(),t:'mark',kind:mark,x:pt[0],y:pt[1],c:color,label}]);
  };

  const down=e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    const pt=toCourt(e);if(!pt)return;
    e.currentTarget.setPointerCapture&&e.currentTarget.setPointerCapture(e.pointerId);
    if(mark){placeMark(pt);return;}
    if(tool==='erase'){const i=hit(pt);if(i>=0)write(items.filter((_,j)=>j!==i));setSel(null);return;}
    if(tool==='select'){
      const i=hit(pt);setSel(i>=0?i:null);
      if(i>=0)dragRef.current={i,from:pt,item:items[i],moved:false};
      return;
    }
    setSel(null);
    setDraft({id:uid(),t:'path',tool,c:color,w:wid,pts:[pt]});
  };
  const move=e=>{
    const d=dragRef.current;
    if(d){
      const pt=toCourt(e);if(!pt)return;
      const dx=pt[0]-d.from[0],dy=pt[1]-d.from[1];
      if(!d.moved&&Math.hypot(dx,dy)<8)return;
      d.moved=true;
      const it=d.item;
      const moved=it.t==='mark'?{...it,x:it.x+dx,y:it.y+dy}
                               :{...it,pts:(it.pts||[]).map(p=>[p[0]+dx,p[1]+dy])};
      onChange({v:1,half:sc.half,items:items.map((x,j)=>j===d.i?moved:x)});
      return;
    }
    if(!draft)return;
    const pt=toCourt(e);if(!pt)return;
    // Straight mode keeps two points — press and release; freehand keeps the trail, thinned
    // so a slow drag does not store a thousand samples.
    if(straight)setDraft(o=>({...o,pts:[o.pts[0],pt]}));
    else setDraft(o=>(dist(o.pts[o.pts.length-1],pt)<9?o:{...o,pts:[...o.pts,pt]}));
  };
  const up=()=>{
    const d=dragRef.current;
    if(d){dragRef.current=null;if(d.moved)setHist(h=>({undo:[...h.undo.slice(-49),
      items.map((x,j)=>j===d.i?d.item:x)],redo:[]}));return;}
    if(!draft)return;
    // A tap that never became a line is not a line — it is the coach missing.
    if(draft.pts.length>1&&dist(draft.pts[0],draft.pts[draft.pts.length-1])>18)write([...items,draft]);
    setDraft(null);
  };

  const drawing=!mark&&tool!=='select'&&tool!=='erase';
  const cursor=mark?'copy':tool==='erase'?'not-allowed':tool==='select'?'grab':'crosshair';
  const tbtn=(on,onClick,title,children,cls)=>
    <button type="button" className={`ct-tb${on?' on':''}${cls?' '+cls:''}`} onClick={onClick} title={title}>{children}</button>;

  /* Every cluster says what it is for above the chips it holds — the rail carries five
     different kinds of control and a coach reading it should not have to work out which
     row places a cone and which row picks a colour. */
  const grp=(label,children,cls)=>(
    <div className={`ct-grp${cls?' '+cls:''}`}>
      <span className="ct-lbl">{label}</span>
      <div className="ct-row">{children}</div>
    </div>);

  const bar=(
    <div className="ct-bar">
      {grp(L('çizim','draw'),CT_TOOLS.map(t=>tbtn(!mark&&tool===t.id,()=>{setTool(t.id);setMark('');},L(t.tr,t.en),
        <><i>{t.ic}</i><b>{L(t.tr,t.en)}</b></>)))}
      {grp(L('renk','colour'),<>
        {CT_COLORS.map(c=><button key={c} type="button" className={`ct-sw${color===c?' on':''}`}
          style={{background:c}} onClick={()=>setColor(c)} title={c}/>)}
        <input type="color" className="ct-sw ct-swc" value={color} onChange={e=>setColor(e.target.value)}
          title={L('Özel renk','Custom colour')}/>
      </>)}
      {grp(L('kalınlık','width'),CT_WIDTHS.map(w=><button key={w} type="button" className={`ct-w${wid===w?' on':''}`}
        onClick={()=>setWid(w)} title={L(`Kalınlık ${w}`,`Width ${w}`)}>
        <span style={{height:Math.max(2,w/3.2)}}/></button>))}
      {grp(L('yerleştir','place'),CT_MARKS.map(m=>tbtn(mark===m.id,()=>setMark(mark===m.id?'':m.id),L(m.tr,m.en),
        <><i>{m.ic}</i><b>{L(m.tr,m.en)}</b></>)),'ct-marks')}
      {grp(L('saha','board'),<>
        {tbtn(straight,()=>setStraight(s=>!s),L('Düz çizgi — basılı tut ve bırak','Straight line — press and release'),
          <><i>╱</i><b>{L('Düz','Straight')}</b></>)}
        {tbtn(!sc.half,()=>onChange({...sc,half:!sc.half}),L('Yarı saha / tam saha','Half court / full court'),
          <><i>⛶</i><b>{sc.half?L('Yarı saha','Half court'):L('Tam saha','Full court')}</b></>)}
        {tbtn(zoom,()=>setZoom(z=>!z),zoom?L('Küçült (Esc)','Shrink (Esc)'):L('Büyüt — sadece saha','Zoom — court only'),
          <><i>{zoom?'⤡':'⤢'}</i><b>{zoom?L('Küçült','Shrink'):L('Büyüt','Zoom')}</b></>)}
      </>)}
      {grp(L('geri / sil','undo / delete'),<>
        {tbtn(false,undo,L('Geri al','Undo'),<><i>↶</i></>,hist.undo.length?'':'off')}
        {tbtn(false,redo,L('İleri al','Redo'),<><i>↷</i></>,hist.redo.length?'':'off')}
        {sel!=null&&items[sel]&&tbtn(false,()=>{write(items.filter((_,j)=>j!==sel));setSel(null);},
          L('Seçileni sil','Delete selected'),<><i>✕</i><b>{L('Sil','Delete')}</b></>,'danger')}
        {tbtn(false,()=>{if(items.length&&window.confirm(L('Çizimin tamamı silinsin mi?','Clear the whole drawing?')))write([]);},
          L('Tahtayı temizle','Clear the board'),<><i>🗑</i><b>{L('Temizle','Clear')}</b></>,items.length?'danger':'off')}
      </>)}
    </div>);
  const board=(
    <div className="ct-board" style={{aspectRatio:String(courtRatio(sc.half))}}>
      <svg className="ct-svg" viewBox={courtViewBox(sc.half)} preserveAspectRatio="xMidYMid meet"
        style={{cursor,touchAction:'none'}}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
        {elsToReact(courtEls({half:sc.half,ink:'rgba(255,255,255,.42)',surface:'#171a1f',line:5}),'c')}
        {/* Everything the coach drew, plus the line currently under the pointer, inside the
            group whose matrix the pointer maths is read off. */}
        <g ref={gRef} transform={sc.half?HALF_TF:undefined}>
          {paintOrder(items).map(([it,i])=><g key={it.id||i} className={sel===i?'ct-sel':undefined}>
            {elsToReact(sceneItemEls(it,sc.half),`i${i}`)}
          </g>)}
          {draft&&elsToReact(sceneItemEls(draft,sc.half),'d')}
        </g>
      </svg>
    </div>);
  const hint=sceneIsEmpty(sc)&&!draft?(
    <div className="ct-hint">
      {L('Sahaya çiz — kalem, pas, top sürme, perde; oyuncu ve ekipmanı tıklayarak yerleştir.',
         'Draw on the court — pen, pass, dribble, screen; click to place players and equipment.')}
    </div>):null;
  const legend=(
    <div className="ct-legend">
      <span><i className="lg lg-cut"/>{L('Kesme','Cut')}</span>
      <span><i className="lg lg-pass"/>{L('Pas','Pass')}</span>
      <span><i className="lg lg-drib"/>{L('Top sürme','Dribble')}</span>
      <span><i className="lg lg-scr"/>{L('Perde','Screen')}</span>
      <span><i className="lg lg-shot"/>{L('Şut','Shot')}</span>
      <span className="ct-legend-t">{drawing
        ?L('Sürükleyerek çiz','Drag to draw')
        :mark?L('Yerleştirmek için sahaya tıkla','Click the court to place')
        :tool==='select'?L('Taşımak için sürükle','Drag to move')
        :L('Silmek için üstüne tıkla','Click an item to erase')}</span>
    </div>);

  /* Blown up, the board is the whole screen and nothing else is: the tools, the floor and
     the notation, with the page dimmed out behind them. Portalled to the body so the modal
     it was opened from cannot clip it, and the panel eases up from the size it was rather
     than appearing at full size. */
  if(zoom)return ReactDOM.createPortal(
    <div className="ct-zoom" onPointerDown={e=>{if(e.target===e.currentTarget)setZoom(false);}}>
      <div className="ct-zoom-panel">
        {bar}
        {board}
        {hint}
        {legend}
      </div>
    </div>,document.body);

  return(<div className="ct-wrap">
    {barSlot?ReactDOM.createPortal(bar,barSlot):bar}
    {board}
    {hint}
    {legend}
  </div>);
}

/* ---- Ball practice library ------------------------------------------------
   Court work is filed the way court work is coached — by what the drill teaches, not by
   which muscles it loads — so it gets its own categories rather than being forced into
   the S&C ones. */
const BALL_TYPES=['Ball Warm-Up','Ball Handling','Shooting','Finishing','Passing','Individual Defense',
  'Team Offense Concepts','Team Defense Concepts','Transition / Fast Break','Rebounding',
  'Set Plays','Small-Sided Games'];
const BALL_TYPE_COLORS={
  'Ball Warm-Up':'#fdba74','Ball Handling':'#22d3ee','Shooting':'#fcd34d','Finishing':'#fb923c',
  'Passing':'#86efac','Individual Defense':'#fca5a5','Team Offense Concepts':'#f9a8d4',
  'Team Defense Concepts':'#c4b5fd','Transition / Fast Break':'#5eead4','Rebounding':'#a78bfa',
  'Set Plays':'#93c5fd','Small-Sided Games':'#a7f3d0'};
const BALL_SUB_TYPES={
  'Ball Warm-Up':{label:'Category',values:['General','Ball-Handling Prep','Shooting Prep','Reaction']},
  'Ball Handling':{label:'Category',values:['Stationary','On the Move','Two-Ball','Pressure / Live']},
  'Shooting':{label:'Category',values:['Spot-Up','Off the Catch','Off the Dribble','Off Screens','Free Throw','Game Speed']},
  'Finishing':{label:'Category',values:['Layup Package','Floater','Contact Finish','Post Finish']},
  'Passing':{label:'Category',values:['Stationary','On the Move','Post Entry','Skip / Kick-Out']},
  'Individual Defense':{label:'Category',values:['Stance & Slides','On-Ball','Closeout','Post Defense','Screen Navigation']},
  'Team Offense Concepts':{label:'Category',values:['Spacing','Ball Screen','Off-Ball Screen','Cutting','Post Play','Motion']},
  'Team Defense Concepts':{label:'Category',values:['Shell','Help & Recover','Ball Screen Coverage','Zone','Press']},
  'Transition / Fast Break':{label:'Category',values:['Primary Break','Secondary Break','Transition Defense','Conversion']},
  'Rebounding':{label:'Category',values:['Box Out','Offensive Board','Outlet']},
  'Set Plays':{label:'Category',values:['Quick Hitter','BLOB','SLOB','After Timeout','End of Clock']},
  'Small-Sided Games':{label:'Category',values:['1v1','2v2','3v3','4v4','5v5','Advantage / Disadvantage']},
};
/* The ball-practice half of the library, mirrored out of the app state for the same
   reason the S&C half is: the drill editor sits deep inside the session panel and should
   not have the whole library threaded down to it as a prop. */
let _ballLib=[];
function setBallLibItems(a){_ballLib=Array.isArray(a)?a:[];}
function getBallLibItems(){return _ballLib;}
let _ballSave=null;
function registerBallSave(fn){_ballSave=fn;}
/* Save a drill written on a session into the Ball Practice library — the diagram, the
   clip and the coaching notes, under the drill's own name. Returns false when there is
   no name to file it under. */
function saveBallDrillToLibrary(ex){
  const nm=(ex&&ex.name||'').trim();
  if(!nm||!_ballSave)return false;
  _ballSave({name:nm,court:ex.court||null,videoUrl:ex.videoUrl||'',videoData:ex.videoData||'',
    purpose:(ex.description||'').trim(),players:ex.players||''});
  return true;
}

/* ---- The clip on a drill --------------------------------------------------
   A diagram says where everybody goes; a clip says what it is supposed to look like. Same
   two fields the exercise library stores — an uploaded file or a pasted link — so a drill
   saved to the library arrives with its video already in the shape the library expects. */
function DrillVideo({ex,onChange}){
  const[up,setUp]=useState(null);
  const[open,setOpen]=useState(false);
  const has=!!(ex.videoData||ex.videoUrl);
  const onFile=async file=>{
    if(!file)return;
    const mb=file.size/1048576;
    const fb=(typeof FB==='function')?FB():null;
    const loggedIn=fb&&fb.auth&&fb.auth().currentUser;
    if(loggedIn){
      if(mb>200){alert(L(`Video çok büyük (${mb.toFixed(0)} MB). 200 MB altı bir dosya seç ya da link kullan.`,`Video is too large (${mb.toFixed(0)} MB). Pick a file under 200 MB or use a link.`));return;}
      try{setUp(0);const url=await uploadMedia(file,'videos',p=>setUp(p),file.name);onChange({videoUrl:url,videoData:''});}
      catch(e){alert(L('Video yüklenemedi: ','Video upload failed: ')+(e.message||e));}
      finally{setUp(null);}
      return;
    }
    if(mb>25){alert(L('Bulut yüklemesi için giriş yap. Çevrimdışı sınır: 25 MB.','Sign in for cloud upload. Offline limit: 25 MB.'));return;}
    const r=new FileReader();
    r.onload=async e=>{
      try{onChange({videoData:await saveLocalMedia(e.target.result),videoUrl:''});}
      catch(err){onChange({videoData:e.target.result,videoUrl:''});}
    };
    r.readAsDataURL(file);
  };
  return(<div className="dv-wrap">
    <div className="dv-hd">
      <span className="dv-lbl">{L('video','video')}</span>
      {has&&<button type="button" className="dv-tog" onClick={()=>setOpen(o=>!o)}>
        {open?L('▾ Gizle','▾ Hide'):L('▸ Oynat','▸ Play')}</button>}
      <label className="dv-up" title={L('Bu drilin videosunu yükle','Upload a clip of this drill')}>
        {up!=null?`${up}%`:L('⤒ Yükle','⤒ Upload')}
        <input type="file" accept="video/*" onChange={e=>{onFile(e.target.files&&e.target.files[0]);e.target.value='';}}/>
      </label>
      {has&&<button type="button" className="dv-x" title={L('Videoyu kaldır','Remove the video')}
        onClick={()=>onChange({videoUrl:'',videoData:''})}>✕</button>}
    </div>
    <input className="dv-link" value={ex.videoUrl||''} placeholder={L('…ya da bir link yapıştır (YouTube / Vimeo / mp4)','…or paste a link (YouTube / Vimeo / mp4)')}
      onChange={e=>onChange({videoUrl:e.target.value})}/>
    {open&&has&&<div className="dv-player"><VideoPlayer ex={ex}/></div>}
  </div>);
}

/* ---- One ball-practice drill ----------------------------------------------
   The court row's answer to CalSlotEd. The prescription fields are the same ones a lift
   carries — a drill is still sets, reps, time, intensity and rest — so the day drawer, the
   volume figures and the printed sheet read it without knowing it came off a court. What
   is different is what sits above them: the diagram, and the clip of it being run. */
function BallDrillEdRaw({ex,tag,onChange,onMove,onRemove,first,last,onSaved,phases}){
  const f=(k,v)=>onChange({...ex,[k]:v});
  const[saved,setSaved]=useState(false);
  const[openCourt,setOpenCourt]=useState(true);
  const empty=!String(ex.name||'').trim();
  const lib=getBallLibItems();
  const save=()=>{
    if(!String(ex.name||'').trim()){alert(L('Önce drile bir ad ver.','Give the drill a name first.'));return;}
    if(saveBallDrillToLibrary(ex)){setSaved(true);setTimeout(()=>setSaved(false),1800);onSaved&&onSaved();}
  };
  // Picking a saved drill brings its diagram, clip and notes across — the whole point of
  // having filed it in the first place.
  const pick=nm=>{
    const it=lib.find(x=>(x.name||'').trim().toLowerCase()===nm.trim().toLowerCase());
    if(!it){f('name',nm);return;}
    onChange({...ex,name:it.name,court:it.court||ex.court||null,
      videoUrl:it.videoUrl||ex.videoUrl||'',videoData:it.videoData||ex.videoData||'',
      description:ex.description||it.purpose||'',players:ex.players||it.players||''});
  };
  const num=(lbl,trLbl,k,opts,title)=>(<label key={k}>{L(trLbl,lbl)}
    {opts?<SlotPick value={ex[k]} options={opts} onChange={v=>f(k,v)} title={title}/>
         :<LiveInput value={ex[k]||''} onChange={v=>f(k,v)} placeholder="—" title={title}/>}
  </label>);
  return(<div className={'iv-slot bp-slot'+(empty?' off':'')}>
    <div className="iv-slot-main">
      <span className="iv-ss-tag on bp-tag">{tag}</span>
      <div className="iv-slot-nm">
        <LiveInput className="bp-nm" list="bp-lib-names" value={ex.name||''} placeholder={L('Dril adı — ör. 3\'lü Şut Dönüşü','Drill name — e.g. 3-Man Shooting Rotation')}
          onChange={pick}/>
      </div>
      <span className="iv-slotacts">
        <button type="button" onClick={()=>onMove(-1)} disabled={first} title={L('Yukarı taşı','Move up')}>↑</button>
        <button type="button" onClick={()=>onMove(1)} disabled={last} title={L('Aşağı taşı','Move down')}>↓</button>
        <button type="button" className={'bp-save'+(saved?' on':'')} onClick={save}
          title={L('Bu drili Top Çalışması kütüphanesine kaydet','Save this drill to the Ball Practice library')}>
          {saved?L('✓ Kaydedildi','✓ Saved'):L('⤓ Kütüphane','⤓ Library')}</button>
        <button type="button" className="del" onClick={onRemove} title={L('Bu drili kaldır','Remove this drill')}>✕</button>
      </span>
    </div>
    <div className="iv-slot-ed bp-ed">
      <div className="bp-court">
        <button type="button" className="bp-court-t" onClick={()=>setOpenCourt(o=>!o)}>
          <i>{openCourt?'▼':'▶'}</i>{L('Saha Çizimi','Court Diagram')}
          {!openCourt&&!sceneIsEmpty(ex.court)&&<b>{L(`${ex.court.items.length} öğe`,`${ex.court.items.length} items`)}</b>}
        </button>
        {openCourt
          ?<CourtEditor value={ex.court} onChange={sc=>f('court',sc)}/>
          :!sceneIsEmpty(ex.court)&&<CourtView scene={ex.court} className="bp-court-mini"/>}
      </div>
      <div className="bp-side">
        <div className="iv-numed bp-numed">
          {num('sets','set','sets',SLOT_SETS,L('Set sayısı','Number of sets'))}
          {num('reps','tekrar','reps',SLOT_REPS,L('Tekrar sayısı','Number of reps'))}
          {num('time','süre','duration',null,L('Çalışma süresi (ör. 4dk)','Work time (e.g. 4 min)'))}
          {num('rpe','rpe','rpe',SLOT_RPES,L('Hedef RPE (4–10)','Target RPE (4–10)'))}
          {num('rest','dinlenme','rest',null,L('Setler arası dinlenme','Rest between sets'))}
          {num('players','oyuncu','players',null,L('Kaç oyuncuyla çalışılıyor (ör. 3v3)','How many players (e.g. 3v3)'))}
        </div>
        <DrillVideo ex={ex} onChange={p=>onChange({...ex,...p})}/>
        <div className="iv-noterow">
          <label>{L('koçluk noktaları','coaching points')}
            <LiveTextarea className="bp-notes" value={ex.description||''} onChange={v=>f('description',v)}
              placeholder={L('Kurallar, ilerlemeler, vurgulanacak detaylar…','Rules, progressions, what to emphasise…')}/>
          </label>
        </div>
      </div>
    </div>
  </div>);
}

/* Memoised for the same reason as CalSlotEd above — a court diagram and a clip on every
   row make a ball block the most expensive thing on the page to rebuild. */
const BallDrillEd=React.memo(BallDrillEdRaw);

/* `session`, `printContext` and `isTemplate` are here for the block's own actions: printing
   and saving a template both need a whole session to work with, and a block is handed to
   them as one that carries this block alone.

   `sessionUpd`, `athletes`, `showPicker` and `coach` are for the session details the block
   carries at the top of its body, and `athUpd` writes THIS block's participant list —
   see SessionDetails above. The assignment button in the header is the block's too: it
   assigns the players ticked on this block, not on the session. */
function BlockEd({block,onUpdate,onRemove,onDuplicate,index,dragB,setDragB,onDropBlk,session,printContext,isTemplate,
                  sessionUpd,athletes,showPicker,coach,athUpd,setColor,ses,sesMoves}){
  const[open,setOpen]=useState(true);const exs=block.exercises||[];
  /* Sections the coach has folded away, keyed by phase. A session written in three
     phases is long, and the one being worked on should not sit under the other two. */
  const[shutPh,setShutPh]=useState({});
  /* The rows below are memoised, so their callbacks have to survive a re-render or the
     memo never holds. They read the block and its exercises out of refs — always the
     current ones — instead of closing over them, which is what keeps their identity. */
  const liveRef=useRef(null);
  liveRef.current={exs,block,onUpdate};
  /* Every write goes back sorted into the block's phases, so the array the rest of the
     app reads — the sheet, the printout, the athlete's copy — is always in the order
     the session is actually run. With no phase open the sort is the identity. */
  const setExs=a=>{const{block:b,onUpdate:up}=liveRef.current;up({...b,exercises:sortExsByPhase(a,blkPhases(b))});};
  const setExsRef=useRef(setExs);setExsRef.current=setExs;
  /* One set of handlers per row, rebuilt only when the number of rows changes. */
  const slotFns=useMemo(()=>exs.map((_,i)=>({
    onChange:nx=>{const a=[...liveRef.current.exs];a[i]=nx;setExsRef.current(a);},
    /* Up and down move a row within its OWN section: the nearest neighbour sharing its
       phase, which is simply the next row along in a block with no phases open. A row
       changes section through the picker in its header, never by being nudged out of
       one. */
    onMove:d=>{const a=[...liveRef.current.exs];const ph=exPhase(a[i]);
      let j=i+d;while(j>=0&&j<a.length&&exPhase(a[j])!==ph)j+=d;
      if(j<0||j>=a.length)return;
      [a[i],a[j]]=[a[j],a[i]];setExsRef.current(a);},
    onRemove:()=>setExsRef.current(liveRef.current.exs.filter((_,j)=>j!==i)),
  })),[exs.length]);
  // Compute display labels — exercises with the same superset letter become A1, A2, A3…
  // exercises with empty superset are numbered 1., 2., 3. independently.
  const labels=useMemo(()=>{const cnt={};return exs.map(ex=>{
    const ss=(ex.superset||'').toString().toUpperCase().trim();
    if(ss){cnt[ss]=(cnt[ss]||0)+1;return`${ss}${cnt[ss]}`;}
    cnt._=(cnt._||0)+1;return`${cnt._}.`;
  });},[exs]);
  const groups=[...new Set(exs.map(e=>(e.superset||'').toUpperCase().trim()).filter(Boolean))].sort();
  const isDragging=dragB!=null&&dragB===index;
  const isBall=blkKind(block)==='ball';
  /* ---- The phases open on this block ------------------------------------
     `phaseList` is handed down to every row editor, and those are memoised, so it has
     to keep its identity between renders or each row rebuilds on every keystroke. */
  const phaseIds=blkPhases(block);
  const phasesKey=JSON.stringify(phaseIds.map(p=>[p,blkPhaseLbl(p,block)]));
  const phaseList=useMemo(()=>JSON.parse(phasesKey).map(x=>x[0]),[phasesKey]);
  /* What the row editors get: id, name and colour of each open section. */
  const phaseOpts=useMemo(()=>JSON.parse(phasesKey).map((x,i)=>({id:x[0],label:x[1]||L(`Faz ${i+1}`,`Phase ${i+1}`),
    cls:'pc'+(i%PH_COLORS)})),[phasesKey]);
  const phLbl=p=>{const o=phaseOpts.find(x=>x.id===p);return o?o.label:'';};
  const phC=p=>phCls(p,phaseList);
  const phased=phaseList.length>0;
  const phaseN=p=>exs.filter(e=>exPhase(e)===p).length;
  /* Opening a section. The first one opened on a block that already holds work takes
     that work in — a coach who gives phases to a written block gets it all in the first
     section and lifts the rest out of it, instead of placing twenty rows by hand. Later
     sections start empty. Each new section gets a name the coach can type over. */
  const addPhase=()=>{
    const{block:b,onUpdate:up}=liveRef.current;
    const had=blkPhases(b);
    const id=newPhaseId();
    const next=[...had,id];
    const names={...(b.phaseNames||{}),[id]:L(`Faz ${next.length}`,`Phase ${next.length}`)};
    const rows=!had.length?liveRef.current.exs.map(e=>had.includes(exPhase(e))?e:{...e,phase:id}):liveRef.current.exs;
    up({...b,phases:next,phaseNames:names,exercises:sortExsByPhase(rows,next)});
    setOpen(true);
  };
  const renamePhase=(p,name)=>{
    const{block:b,onUpdate:up}=liveRef.current;
    up({...b,phaseNames:{...(b.phaseNames||{}),[p]:name}});
  };
  /* Closing a section is not deleting one: the exercises stay in the block and go back
     to being unplaced, where the tray below offers to put them somewhere else. */
  const closePhase=p=>{
    const{block:b,onUpdate:up}=liveRef.current;
    const next=blkPhases(b).filter(x=>x!==p);
    const rows=liveRef.current.exs.map(e=>exPhase(e)===p?{...e,phase:''}:e);
    const names={...(b.phaseNames||{})};delete names[p];
    up({...b,phases:next,phaseNames:names,exercises:sortExsByPhase(rows,next)});
  };
  // Everything still unplaced, into one section — the tray's own button.
  const placeLooseIn=p=>{const ph=blkPhases(liveRef.current.block);
    setExs(liveRef.current.exs.map(e=>ph.includes(exPhase(e))?e:{...e,phase:p}));};
  const addEx=p=>{setOpen(true);setExs([...liveRef.current.exs,{...(isBall?BALL_EX():EX()),phase:p||''}]);};
  /* The rows as they are read: one group per open section, in running order, with
     whatever is not placed yet collected at the end. No sections open means one group
     holding everything, which is the block as it has always been drawn. */
  const view=useMemo(()=>{
    const rows=exs.map((ex,i)=>({ex,i}));
    if(!phaseList.length)return[{phase:'',rows,flat:true}];
    const gs=phaseList.map(p=>({phase:p,rows:rows.filter(r=>exPhase(r.ex)===p)}));
    const loose=rows.filter(r=>!phaseList.includes(exPhase(r.ex)));
    if(loose.length)gs.push({phase:'',rows:loose,loose:true});
    return gs;
  },[exs,phaseList]);
  /* This block as a session of its own — what Print and Save to Templates are given. It is
     the session it belongs to with every other block dropped, so the printed sheet keeps
     the session's date, duration and focus; the name carries the block so the sheet (and
     the saved template) says which one it is rather than repeating the session's title. */
  const blkName=block.name||L(`Blok ${index+1}`,`Block ${index+1}`);
  const blkSession=()=>({...(session||{}),
    name:[blkSesName(session,block).trim(),blkName].filter(Boolean).join(' · '),
    blocks:[block]});
  /* The printed sheet is headed by the session's OWN title — the one at the head of the
     session card ("Takım Kuvvet") — and not by the block's, which the block heading on the
     sheet already carries a few lines below. A session left untitled falls back to the
     block's name so the sheet is never headed by nothing. */
  const printSession=()=>({...blkSession(),
    name:String((session&&session.name)||'').trim()||blkName});
  /* The block's own card colour; a block that never picked one wears the session's. */
  const blkColor=block.color!=null?block.color:((session&&session.color)||'');
  const tint=blkTint(blkColor);
  return(<div className={'iv-block cal-block'+(isDragging?' dragging':'')+(isBall?' bp-block':'')+tint.cls} style={tint.style}
    onDragOver={e=>{if(dragB!=null&&dragB!==index)e.preventDefault();}}
    onDrop={e=>{e.preventDefault();onDropBlk&&onDropBlk();}}>
    <div className="iv-block-hd">
      {/* What the block IS, on two stacked lines: its kind and its name above, what it
          holds below. The actions stand beside the pair as their own column, centred
          against the whole header rather than riding on its lower line. */}
      <div className="iv-block-hdinfo">
        <div className="iv-block-hdtop">
          {/* The session's number heads the block (the bar that carried it is gone), and
              it is the handle the block is dragged by. A session split into several
              blocks numbers them under it: 1.1, 1.2. */}
          <span className={ses?'blk-sn':'blk-grip'} draggable={setDragB!=null}
            onDragStart={e=>{setDragB&&setDragB(index);e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(index));}catch(_){}}}
            onDragEnd={()=>setDragB&&setDragB(null)}
            title={ses?L('Seans numarası · sürükleyerek sırala','Session number · drag to reorder'):L('Sürükleyerek sırala','Drag to reorder')}>{ses?(ses.multi?`${ses.no}.${index+1}`:ses.no):'⠿'}</span>
          <button type="button" className="iv-blockch" onClick={()=>setOpen(!open)}
            title={open?L('Bu bloğu daralt','Collapse this block'):L('Bu bloğu genişlet','Expand this block')}>{open?'▼':'▶'}</button>
          <LiveInput className="iv-block-nm" value={block.name} placeholder={isBall?L(`Top Bloğu ${index+1}`,`Ball Block ${index+1}`):L(`Blok ${index+1}`,`Block ${index+1}`)}
            onChange={v=>onUpdate({...block,name:v})} title={L('Blok başlığı','Block title')}/>
        </div>
        <span className="iv-blockcnt">{isBall
          ?L(`${exs.length} dril`,`${exs.length} drill${exs.length!==1?'s':''}`)
          :L(`${exs.length} egzersiz`,`${exs.length} exercise${exs.length!==1?'s':''}`)}{!isBall&&groups.length?L(` · süpersetler ${groups.join(', ')}`,` · supersets ${groups.join(', ')}`):''}{
          /* What the block holds per phase, on the same line as how much it holds —
             a collapsed block still says how the session is shaped. */
          phased?' · '+phaseList.map(p=>`${phLbl(p)} ${phaseN(p)}`).join(' · '):''}</span>
      </div>
      <span className="iv-blockacts">
        {/* The buttons on one line and the card colour on the line under them, so the
            colour row no longer eats into the width the block's title has to show in.
            A session's only block is the session: its Remove deletes the session, and
            the first block also carries the session's ↑ ↓. */}
        <span className="cal-acts-row">
          {sesMoves}
          <button type="button" className="btn xs sec" onClick={onDuplicate}
            title={L('Bu bloğu çoğalt','Duplicate this block')}>⎘ {L('Çoğalt','Clone')}</button>
          <button type="button" className="btn xs sec"
            onClick={()=>printDayA4(printContext.title,printContext.subtitle,[printSession()])}
            title={L('Yalnızca bu bloğu yazdır','Print this block only')}>{L('Yazdır','Print')}</button>
          <button type="button" className="btn xs sec"
            onClick={()=>printDayA4(printContext.title,printContext.subtitle,[printSession()],{withImages:true})}
            title={L('Yalnızca bu bloğu, yüklenen egzersiz görselleriyle yazdır','Print this block only, including the uploaded exercise images')}>{L('Görselle Yazdır','Print with Image')}</button>
          <button type="button" className="btn xs sec iv-rmb"
            onClick={()=>{if(ses&&!ses.multi){ses.remove();return;}if(confirm(L('Blok silinsin mi?','Delete block?')))onRemove();}}
            title={ses&&!ses.multi?L('Bu seansı sil','Delete this session'):L('Bu bloğu sil','Delete this block')}>✕ {L('Kaldır','Remove')}</button>
        </span>
        {!isTemplate&&setColor&&<CardColorPick value={blkColor} onPick={setColor}/>}
      </span>
    </div>
    {open&&<>
      {/* What the session is, before what this block of it is made of. */}
      {sessionUpd&&<SessionDetails session={session} u={sessionUpd} athletes={athletes}
        showPicker={showPicker} isTemplate={isTemplate} coach={coach}
        block={block} blockUpd={p=>onUpdate({...block,...p})} athUpd={athUpd}/>}
      {/* ---- The phases of the session, inside this one block --------------
          Preparation, Main Phase and Cool Down are sections of a block rather than three
          blocks of their own: one card, one set of session details, one assignment — and
          a session that still reads down the page in the order it is run. The bar sits
          between what the block IS and what it holds, which is where the coach decides
          how the session is shaped. */}
      <div className="blk-phbar">
        <span className="blk-phbar-l">{L('Seans Fazları','Session Phases')}</span>
        <div className="blk-phbar-chips">
          {phaseOpts.map(o=><span key={o.id} className={'blk-phchip '+o.cls}>
            <i/><LiveInput className="blk-phname" value={(block.phaseNames&&block.phaseNames[o.id]!=null)?block.phaseNames[o.id]:o.label}
              size={Math.max(4,Math.min(34,String(o.label).length+1))}
              onChange={v=>renamePhase(o.id,v)} title={L('Faz adı — değiştirmek için yaz','Phase name — type to change it')}/>
            <b>{phaseN(o.id)}</b>
            <button type="button" onClick={()=>closePhase(o.id)}
              title={L('Bu fazı kapat — egzersizleri silinmez, fazsıza döner','Close this phase — its exercises are not deleted, they go back to unplaced')}>✕</button>
          </span>)}
          <button type="button" className="blk-phadd" onClick={addPhase}
            title={L('Bu bloğa yeni bir faz ekle','Add a new phase to this block')}>＋ {L('Faz Ekle','Add Phase')}</button>
        </div>
      </div>
      {/* Two slots to a row — 1|2, 3|4, 5|6 — so a whole block is readable without
          scrolling past one exercise to reach the next. */}
      {/* A ball-practice block runs its drills one to a row: each carries a court diagram
          and a clip, and neither survives being squeezed into half a row. S&C keeps the
          two-up grid it has always had. */}
      <div className="iv-slotswrap">{view.map(g=>{
        const gKey=g.phase||'_loose';
        const shut=!!shutPh[gKey];
        const grid=(<div className={isBall?'iv-slots bp-slots':'iv-slots'}>
          {g.rows.map((r,k)=>isBall
            ?<BallDrillEd key={r.ex.id||r.i} ex={r.ex} tag={labels[r.i]} {...slotFns[r.i]} phases={phaseOpts}
              first={k===0} last={k===g.rows.length-1}/>
            :<CalSlotEd key={r.i} ex={r.ex} tag={labels[r.i]} {...slotFns[r.i]} phases={phaseOpts}
              first={k===0} last={k===g.rows.length-1}/>)}
          {/* Adding lands where the next exercise goes: at the end of THIS section,
              beside the last one when the row still has a free half, across the row when
              the last row is full. An unplaced row is never added on purpose, so the
              tray at the foot has no button of its own. */}
          {!g.loose&&<button type="button" className={'iv-addslot'+(!isBall&&g.rows.length%2?' beside':'')}
            onClick={()=>addEx(g.phase)}
            title={g.phase
              ?(isBall?L(`${phLbl(g.phase)} bölümüne dril ekle`,`Add a drill to the ${phLbl(g.phase)} section`)
                     :L(`${phLbl(g.phase)} bölümüne egzersiz ekle`,`Add an exercise to the ${phLbl(g.phase)} section`))
              :(isBall?L(`${blkName}'a dril ekle`,`Add a drill to ${blkName}`):L(`${blkName}'a egzersiz ekle`,`Add an exercise to ${blkName}`))}>
            + {isBall?L('Dril ekle','Add drill'):L('Egzersiz ekle','Add exercise')}
            {g.phase?<u>{phLbl(g.phase)}</u>:null}</button>}
        </div>);
        if(g.flat)return<React.Fragment key="flat">{grid}</React.Fragment>;
        return(<section key={gKey} className={'blk-ph '+(g.phase?phC(g.phase):'p-loose')}>
          <header className="blk-ph-h">
            <button type="button" className="blk-ph-ch" onClick={()=>setShutPh(m=>({...m,[gKey]:!shut}))}
              title={shut?L('Bu bölümü aç','Expand this section'):L('Bu bölümü daralt','Collapse this section')}>{shut?'▶':'▼'}</button>
            {g.loose?<span className="blk-ph-nm">{L('Fazsız','Unplaced')}</span>
              :<PhaseNameInput className="blk-ph-nm" value={(block.phaseNames&&block.phaseNames[g.phase]!=null)?block.phaseNames[g.phase]:phLbl(g.phase)}
                onChange={v=>renamePhase(g.phase,v)} title={L('Faz adı — değiştirmek için yaz','Phase name — type to change it')}/>}
            <span className="blk-ph-n">{isBall
              ?L(`${g.rows.length} dril`,`${g.rows.length} drill${g.rows.length!==1?'s':''}`)
              :L(`${g.rows.length} egzersiz`,`${g.rows.length} exercise${g.rows.length!==1?'s':''}`)}</span>
            <span className="blk-ph-note">{g.loose
              ?L('Henüz bir faza konmadı — aşağıdan ya da satırın kendi seçicisinden yerleştir','Not placed in a phase yet — put them somewhere from here, or from each row\'s own picker')
              :blkPhaseNote(g.phase,block)}</span>
            <span className="blk-ph-acts">
              {g.loose
                ?phaseList.map(p=><button key={p} type="button" className={'blk-ph-mv '+phC(p)} onClick={()=>placeLooseIn(p)}
                  title={L(`Yerleştirilmemiş ${g.rows.length} satırı ${phLbl(p)} bölümüne taşı`,`Move the ${g.rows.length} unplaced row${g.rows.length!==1?'s':''} into ${phLbl(p)}`)}>
                  → {phLbl(p)}</button>)
                :<button type="button" className="blk-ph-x" onClick={()=>closePhase(g.phase)}
                  title={L('Bu fazı kapat — egzersizleri silinmez, fazsıza döner','Close this phase — its exercises are not deleted, they go back to unplaced')}>✕</button>}
            </span>
          </header>
          {!shut&&grid}
        </section>);
      })}</div>
      {exs.length===0&&!phased&&<div className="iv-dim" style={{padding:'9px 13px'}}>{isBall
        ?L('Bu blokta dril yok — bir tane çizmek için "+ Dril ekle"yi kullan.','No drills in this block — use "+ Add drill" to draw one.')
        :L('Bu blokta egzersiz yok — bir tane yazmak için "+ Egzersiz ekle"yi kullan.','No exercises in this block — use "+ Add exercise" to write one.')}</div>}
    </>}
  </div>);
}

