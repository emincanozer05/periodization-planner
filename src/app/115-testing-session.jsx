/* =========================================================
   TESTING SESSION — every test renders its own purpose-built,
   dynamic visual (stopwatch, jump bars, course maps, body-angle
   models …) instead of a generic form.
   ========================================================= */
const TEST_THEME={anthro:'#0094ff',circ:'#0094ff',posture:'#a78bfa',ankleDF:'#f59e0b',aslr:'#22d3ee',ohs:'#fb923c',yBalance:'#38bdf8',verticalJump:'#e6ff55',cmj:'#fb923c',lateralCmj:'#c084fc',squatJump:'#facc15',horizontalJump:'#34d399',dropJump:'#f472b6',sprint:'#a78bfa',tTest:'#f472b6',fiveZeroFive:'#fb7185',shuttleRun:'#22d3ee'};

function TField({label,unit,value,onChange,step,placeholder,hint,text}){
  return(<div><label className="tf-l">{label}</label>
    <div className="tf-in"><input type={text?'text':'number'} step={step||'0.1'} inputMode={text?'text':'decimal'} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'—'}/>{unit&&<span className="tf-u">{unit}</span>}</div>
    {hint&&<div className="tf-h">{hint}</div>}</div>);
}
function TSelect({label,value,onChange,options,hint}){
  return(<div><label className="tf-l">{label}</label>
    <div className="tf-in"><select value={value||''} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
    {hint&&<div className="tf-h">{hint}</div>}</div>);
}

/* ---- Per-test stage illustrations (SVG, value-driven) ---- */
const SVG_BODY=u=>(<linearGradient id={'bodyG'+u} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#525d6b"/><stop offset="1" stopColor="#272e37"/></linearGradient>);
function AnthroStage({bmi,theme}){
  const bv=Math.max(15,Math.min(35,Number(bmi)||0));
  const gx=204,gy=148,gr=23,ga=bmi?(-120+(bv-15)/20*240):null;
  const gcol=!bmi?'#5c626c':bmi<18.5?'#38bdf8':bmi<25?'#2dd4a7':bmi<30?'#f59e0b':'#f43f5e';
  const p=(deg)=>({x:gx+gr*Math.cos((deg-90)*Math.PI/180),y:gy+gr*Math.sin((deg-90)*Math.PI/180)});
  const s=p(-120),e=p(120),nd=ga!=null?p(ga):null;
  return(<svg viewBox="0 0 240 226" width="206">
    <defs>{SVG_BODY('an')}</defs>
    <ellipse cx="128" cy="206" rx="42" ry="7" fill="#000" opacity=".35"/>
    <rect x="96" y="200" width="64" height="11" rx="3" fill="#2a313b" stroke="#3a4150"/><rect x="100" y="203" width="56" height="3" rx="1.5" fill="#10141a"/>
    <rect x="58" y="16" width="8" height="186" rx="2" fill="#2a313b" stroke="#3a4150"/>
    {[0,1,2,3,4,5,6,7,8].map(i=>{const y=20+i*20;return<g key={i}><line x1="50" y1={y} x2="58" y2={y} stroke="#6b7480" strokeWidth={i%2?1:1.5}/>{i%2===0&&<text x="47" y={y+3} textAnchor="end" fontSize="6.5" fill="#7a838f" fontFamily="IBM Plex Mono">{200-i*20}</text>}</g>;})}
    <rect x="51" y="46" width="86" height="7" rx="2" fill={theme}/><rect x="50" y="42" width="13" height="15" rx="2" fill={theme}/>
    <g stroke="#3c4450" strokeWidth="11" strokeLinecap="round" fill="none">
      <path d="M114 84 L104 132 L107 152"/><path d="M146 84 L156 132 L153 152"/>
      <path d="M122 160 L121 196"/><path d="M138 160 L139 196"/>
    </g>
    <g fill="url(#bodyGan)" stroke="#10141a" strokeWidth="1">
      <circle cx="130" cy="58" r="15"/><rect x="124" y="70" width="12" height="8" rx="3"/>
      <path d="M112 82 C112 75 120 72 130 72 C140 72 148 75 148 82 L144 124 L139 150 L143 164 L117 164 L121 150 L116 124 Z"/>
    </g>
    <ellipse cx="121" cy="198" rx="7" ry="3.5" fill="#2a313b"/><ellipse cx="139" cy="198" rx="7" ry="3.5" fill="#2a313b"/>
    <path d={`M${s.x} ${s.y} A ${gr} ${gr} 0 1 1 ${e.x} ${e.y}`} fill="none" stroke="#2a313b" strokeWidth="5"/>
    {nd&&<line x1={gx} y1={gy} x2={nd.x} y2={nd.y} stroke={gcol} strokeWidth="2.5" strokeLinecap="round"/>}
    <circle cx={gx} cy={gy} r="3" fill={gcol}/>
    <text x={gx} y={gy+38} textAnchor="middle" fontSize="13" fontWeight="700" fill={gcol} fontFamily="IBM Plex Mono">{bmi?bmi.toFixed(1):'—'}</text>
    <text x={gx} y={gy+49} textAnchor="middle" fontSize="7" fill="#7a838f" fontFamily="IBM Plex Mono">BMI</text>
  </svg>);
}
function PostureStage({theme}){
  return(<svg viewBox="0 0 200 210" width="178">
    {[40,70,100,130,160].map(x=><line key={x} x1={x} y1="16" x2={x} y2="194" stroke="rgba(255,255,255,.045)"/>)}
    {[40,80,120,160].map(y=><line key={y} x1="20" y1={y} x2="180" y2={y} stroke="rgba(255,255,255,.045)"/>)}
    <line x1="100" y1="14" x2="100" y2="196" stroke={theme} strokeWidth="1.2" strokeDasharray="5 4"/>
    <line x1="66" y1="66" x2="134" y2="66" stroke={theme} strokeWidth="1" opacity=".5"/>
    <line x1="74" y1="120" x2="126" y2="120" stroke={theme} strokeWidth="1" opacity=".5"/>
    <g fill="#1a1e25" stroke="#cfd6e0" strokeWidth="2">
      <circle cx="100" cy="44" r="14"/>
      <path d="M70 66 q30 -10 60 0 l-6 56 q-24 8 -48 0 Z"/>
      <rect x="84" y="120" width="13" height="62" rx="5"/><rect x="103" y="120" width="13" height="62" rx="5"/>
    </g>
    <circle cx="100" cy="44" r="2.5" fill={theme}/><circle cx="100" cy="120" r="2.5" fill={theme}/>
  </svg>);
}
function AnkleStage({deg,theme}){
  const d=Math.max(0,Math.min(55,Number(deg)||0));const ax=126,ay=150,len=78,rad=d*Math.PI/180;
  const kx=ax-len*Math.sin(rad),ky=ay-len*Math.cos(rad);
  return(<svg viewBox="0 0 240 200" width="210">
    <defs>{SVG_BODY('ak')}</defs>
    <rect x="40" y="26" width="16" height="126" fill="#262d36"/>
    {[40,58,76,94,112,130].map((y,i)=><line key={i} x1="40" y1={y} x2="56" y2={y} stroke="#161a20" strokeWidth="1.5"/>)}
    <rect x="40" y="152" width="172" height="10" fill="#262d36"/><line x1="40" y1="152" x2="212" y2="152" stroke="#3a4150"/>
    <path d="M108 151 Q103 151 103 145 L106 139 L166 141 Q175 142 175 149 L173 152 Z" fill="url(#bodyGak)" stroke="#10141a" strokeWidth="1"/>
    <line x1={ax} y1={ay} x2={kx} y2={ky} stroke="url(#bodyGak)" strokeWidth="13" strokeLinecap="round"/>
    <line x1={kx} y1={ky} x2={kx-30} y2={ky+11} stroke="url(#bodyGak)" strokeWidth="13" strokeLinecap="round"/>
    <circle cx={kx} cy={ky} r="8" fill="#525d6b" stroke="#10141a"/>
    <line x1={kx} y1={ky} x2="56" y2={ky} stroke={theme} strokeWidth="1" strokeDasharray="3 3" opacity=".7"/>
    <path d={`M${ax} ${ay-30} A 30 30 0 0 1 ${ax-30*Math.sin(rad)} ${ay-30*Math.cos(rad)}`} fill="none" stroke={theme} strokeWidth="2.5"/>
    <rect x="150" y="38" width="58" height="28" rx="8" fill="#0a0b0d" stroke={theme}/>
    <text x="179" y="50" textAnchor="middle" fontSize="7.5" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('DORSİFLEKS.','DORSIFLEX.')}</text>
    <text x="179" y="61" textAnchor="middle" fontSize="13" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{d?d+'°':'—'}</text>
    <text x="132" y="190" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('DİZ-DUVAR TESTİ','KNEE-TO-WALL')}</text>
  </svg>);
}
function AslrStage({score,theme}){
  const s=Math.max(0,Math.min(3,Number(score)||0));const ang=18+(s/3)*72,rad=ang*Math.PI/180,len=80;
  const fx=120+len*Math.cos(rad),fy=150-len*Math.sin(rad);
  return(<svg viewBox="0 0 240 200" width="210">
    <defs>{SVG_BODY('as')}</defs>
    <rect x="18" y="158" width="204" height="9" rx="3" fill="#262d36" stroke="#3a4150"/>
    <ellipse cx="120" cy="158" rx="74" ry="5" fill="#000" opacity=".22"/>
    <path d="M118 150 L186 154" stroke="#3a4150" strokeWidth="13" strokeLinecap="round"/>
    <path d="M58 150 L120 150" stroke="url(#bodyGas)" strokeWidth="21" strokeLinecap="round"/>
    <circle cx="44" cy="148" r="12" fill="url(#bodyGas)" stroke="#10141a"/>
    <path d={`M120 150 L${fx} ${fy}`} stroke="url(#bodyGas)" strokeWidth="13" strokeLinecap="round"/>
    <circle cx={fx} cy={fy} r="6" fill={theme}/>
    <path d={`M154 150 A 34 34 0 0 0 ${120+34*Math.cos(rad)} ${150-34*Math.sin(rad)}`} fill="none" stroke={theme} strokeWidth="2.5"/>
    <rect x="150" y="36" width="56" height="30" rx="8" fill="#0a0b0d" stroke={theme}/>
    <text x="178" y="48" textAnchor="middle" fontSize="7.5" fill="var(--muted)" fontFamily="IBM Plex Mono">FMS</text>
    <text x="178" y="61" textAnchor="middle" fontSize="15" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{s||'—'}</text>
    <text x="120" y="190" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('AKTİF DÜZ BACAK KALDIRMA','ACTIVE STRAIGHT LEG RAISE')}</text>
  </svg>);
}
function OhsStage({theme}){
  return(<svg viewBox="0 0 200 210" width="172">
    <defs>{SVG_BODY('oh')}</defs>
    <ellipse cx="100" cy="190" rx="40" ry="6" fill="#000" opacity=".3"/>
    <rect x="44" y="20" width="112" height="6" rx="3" fill="#9aa6b4"/>
    <rect x="40" y="11" width="9" height="24" rx="2" fill={theme}/><rect x="151" y="11" width="9" height="24" rx="2" fill={theme}/>
    <rect x="31" y="14" width="9" height="18" rx="2" fill="#6b7480"/><rect x="160" y="14" width="9" height="18" rx="2" fill="#6b7480"/>
    <g stroke="url(#bodyGoh)" strokeWidth="13" strokeLinecap="round" fill="none">
      <path d="M100 64 L78 26"/><path d="M100 64 L122 26"/>
      <path d="M83 138 L75 176"/><path d="M117 138 L125 176"/>
    </g>
    <g fill="url(#bodyGoh)" stroke="#10141a" strokeWidth="1">
      <circle cx="100" cy="52" r="14"/>
      <path d="M84 64 C84 60 91 58 100 58 C109 58 116 60 116 64 L112 100 L100 110 L88 100 Z"/>
      <path d="M88 100 L82 140 L100 130 L118 140 L112 100 Z"/>
    </g>
    <ellipse cx="75" cy="178" rx="7" ry="3" fill="#2a313b"/><ellipse cx="125" cy="178" rx="7" ry="3" fill="#2a313b"/>
    <text x="100" y="202" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('BAŞ ÜSTÜ SQUAT','OVERHEAD SQUAT')}</text>
  </svg>);
}
function VertJumpStage({value,theme,variant,uid}){
  const max=110,v=Math.max(0,Math.min(max,Number(value)||0)),y0=192,yTop=38;
  const fillY=y0-(v/max)*(y0-yTop);
  const arms=variant==='cmj'?<><path d="M96 98 L74 120"/><path d="M96 98 L122 78"/></>
    :variant==='sj'?<><path d="M96 98 L82 106"/><path d="M96 98 L110 106"/></>
    :<><path d="M96 98 L84 112"/><path d="M96 98 L124 48"/></>;
  const cap=variant==='cmj'?'COUNTER-MOVEMENT':variant==='sj'?'SQUAT JUMP':'VERTICAL JUMP';
  return(<svg viewBox="0 0 240 210" width="200">
    <defs>{SVG_BODY(uid)}</defs>
    <ellipse cx="98" cy="196" rx="24" ry="5" fill="#000" opacity=".28"/>
    <rect x="168" y="32" width="6" height="164" rx="3" fill="#2a313b" stroke="#3a4150"/>
    <rect x="160" y="194" width="22" height="6" rx="2" fill="#3a4150"/>
    {Array.from({length:15}).map((_,i)=>{const y=42+i*10;const reached=v>0&&y>=fillY;return<line key={i} x1="150" y1={y} x2="168" y2={y} stroke={reached?theme:'#48515d'} strokeWidth={reached?3:2} strokeLinecap="round"/>;})}
    {v>0&&<g><line x1="60" y1={fillY} x2="150" y2={fillY} stroke={theme} strokeWidth="1.2" strokeDasharray="3 3"/><rect x="22" y={fillY-11} width="44" height="20" rx="5" fill="#0a0b0d" stroke={theme}/><text x="44" y={fillY+3} textAnchor="middle" fontSize="11" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{v}</text></g>}
    <g stroke={`url(#bodyG${uid})`} strokeWidth="11" strokeLinecap="round" fill="none">{arms}<path d="M96 126 L86 160"/><path d="M96 126 L108 160"/></g>
    <g fill={`url(#bodyG${uid})`} stroke="#10141a" strokeWidth="1"><circle cx="96" cy="80" r="12"/><path d="M84 92 C84 87 90 84 96 84 C102 84 108 87 108 92 L104 124 L88 124 Z"/></g>
    <text x="96" y="206" textAnchor="middle" fontSize="7.5" fill="var(--muted)" fontFamily="IBM Plex Mono">{cap}</text>
  </svg>);
}
function HorizJumpStage({value,theme}){
  const max=320,v=Math.max(0,Math.min(max,Number(value)||0)),x0=46,xEnd=212,floor=168;
  const landX=x0+(v/max)*(xEnd-x0);
  return(<svg viewBox="0 0 240 204" width="210">
    <defs>{SVG_BODY('hj')}<pattern id="sandHJ" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#2c2820"/><circle cx="2" cy="2" r="0.8" fill="#4a4128"/><circle cx="5" cy="5" r="0.8" fill="#4a4128"/></pattern></defs>
    <rect x="18" y={floor} width="24" height="10" fill="#3a4150"/>
    <rect x="42" y={floor} width="5" height="10" fill={theme}/>
    <rect x="47" y={floor} width={xEnd-47+6} height="15" fill="url(#sandHJ)" stroke="#3a4150"/>
    {[0,80,160,240,320].map(t=>{const x=x0+(t/max)*(xEnd-x0);return<g key={t}><line x1={x} y1={floor+15} x2={x} y2={floor+21} stroke="var(--muted)"/><text x={x} y={floor+31} textAnchor="middle" fontSize="7" fill="var(--muted)" fontFamily="IBM Plex Mono">{t}</text></g>;})}
    {v>0&&<path d={`M${x0} ${floor} Q ${(x0+landX)/2} ${floor-96} ${landX} ${floor}`} fill="none" stroke={theme} strokeWidth="1.5" strokeDasharray="4 3"/>}
    {v>0&&<g><line x1={landX} y1={floor-14} x2={landX} y2={floor} stroke={theme} strokeWidth="2"/><rect x={landX-21} y={floor-36} width="42" height="19" rx="5" fill="#0a0b0d" stroke={theme}/><text x={landX} y={floor-23} textAnchor="middle" fontSize="10" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{v}</text></g>}
    <g transform="translate(38,0)">
      <g stroke="url(#bodyGhj)" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M2 110 L-16 102"/><path d="M2 110 L22 96"/>
        <path d="M14 120 L36 114"/><path d="M14 120 L30 138"/>
      </g>
      <g fill="url(#bodyGhj)" stroke="#10141a" strokeWidth="1"><circle cx="3" cy="98" r="10"/><path d="M-6 108 L14 108 L16 122 L-2 122 Z"/></g>
    </g>
  </svg>);
}
function DropJumpStage({value,theme}){
  const v=Math.max(0,Math.min(3,Number(value)||0)),pct=v/3,cx=178,cy=72,r=33;
  const a1=Math.PI*(1+pct),ex=cx+r*Math.cos(a1),ey=cy+r*Math.sin(a1);
  return(<svg viewBox="0 0 240 200" width="210">
    <defs>{SVG_BODY('dj')}</defs>
    <rect x="20" y="166" width="200" height="8" fill="#262d36"/>
    <path d="M34 112 L86 112 L86 166 L34 166 Z" fill="#2f3742" stroke="#3a4150"/>
    <path d="M34 112 L46 102 L98 102 L86 112 Z" fill="#3c4654" stroke="#3a4150"/>
    <path d="M86 112 L98 102 L98 156 L86 166 Z" fill="#222a32" stroke="#3a4150"/>
    <g transform="translate(112,0)">
      <g stroke="url(#bodyGdj)" strokeWidth="10" strokeLinecap="round" fill="none"><path d="M0 88 L-14 72"/><path d="M0 88 L14 72"/><path d="M-2 118 L-8 150"/><path d="M6 118 L12 150"/></g>
      <g fill="url(#bodyGdj)" stroke="#10141a" strokeWidth="1"><circle cx="2" cy="62" r="11"/><path d="M-10 76 L14 76 L10 118 L-6 118 Z"/></g>
    </g>
    <path d="M134 120 v30" stroke={theme} strokeWidth="2"/><path d="M134 150 l-4 -7 m4 7 l4 -7" stroke={theme} strokeWidth="2" fill="none"/>
    <path d="M152 150 v-30" stroke={theme} strokeWidth="2"/><path d="M152 120 l-4 7 m4 -7 l4 7" stroke={theme} strokeWidth="2" fill="none"/>
    <path d={`M${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#2a313b" strokeWidth="7"/>
    {v>0&&<path d={`M${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={theme} strokeWidth="7" strokeLinecap="round"/>}
    <text x={cx} y={cy-3} textAnchor="middle" fontSize="15" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{v?v.toFixed(2):'—'}</text>
    <text x={cx} y={cy+9} textAnchor="middle" fontSize="7" fill="var(--muted)" fontFamily="IBM Plex Mono">RSI</text>
    <text x="120" y="190" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('DROP JUMP SEKME','DROP JUMP REBOUND')}</text>
  </svg>);
}
function StopwatchStage({time,theme}){
  const t=Math.max(0,Number(time)||0),cx=120,cy=98,R=58,ang=(t%6)/6*360,rad=(ang-90)*Math.PI/180;
  const nx=cx+(R-13)*Math.cos(rad),ny=cy+(R-13)*Math.sin(rad);
  return(<svg viewBox="0 0 240 210" width="200">
    <defs>
      <radialGradient id="swFace" cx="50%" cy="36%" r="72%"><stop offset="0" stopColor="#1d232b"/><stop offset="1" stopColor="#070809"/></radialGradient>
      <linearGradient id="swBezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#727c89"/><stop offset=".5" stopColor="#39414c"/><stop offset="1" stopColor="#171b21"/></linearGradient>
    </defs>
    <rect x="113" y="20" width="14" height="10" rx="2" fill="#9aa6b4"/><rect x="116" y="13" width="8" height="9" rx="2" fill={theme}/>
    <rect x="156" y="32" width="9" height="6" rx="2" transform="rotate(42 160 35)" fill="#6b7480"/>
    <rect x="75" y="32" width="9" height="6" rx="2" transform="rotate(-42 79 35)" fill="#6b7480"/>
    <circle cx={cx} cy={cy} r={R+8} fill="url(#swBezel)"/><circle cx={cx} cy={cy} r={R+2} fill="#0c0f13"/>
    <circle cx={cx} cy={cy} r={R} fill="url(#swFace)" stroke={theme} strokeWidth="1.5"/>
    {Array.from({length:60}).map((_,i)=>{const a=(i*6-90)*Math.PI/180,big=i%5===0,r1=R-2,r2=big?R-9:R-5;return<line key={i} x1={cx+r1*Math.cos(a)} y1={cy+r1*Math.sin(a)} x2={cx+r2*Math.cos(a)} y2={cy+r2*Math.sin(a)} stroke={big?'#cfd6e0':'#5c626c'} strokeWidth={big?1.6:0.8}/>;})}
    {[0,1,2,3,4,5].map(n=>{const a=(n*60-90)*Math.PI/180,rr=R-19;return<text key={n} x={cx+rr*Math.cos(a)} y={cy+rr*Math.sin(a)+3} textAnchor="middle" fontSize="8" fill="#9aa6b4" fontFamily="IBM Plex Mono">{n}</text>;})}
    <rect x={cx-26} y={cy-28} width="52" height="15" rx="3" fill="#0a0b0d" stroke="#2a313b"/>
    <text x={cx} y={cy-17} textAnchor="middle" fontSize="11" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{(t||0).toFixed(2)}</text>
    <circle cx={cx} cy={cy+26} r="9" fill="#10141a" stroke="#3a4150"/>
    <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={theme} strokeWidth="2.5" strokeLinecap="round"/>
    <line x1={cx} y1={cy} x2={cx-7*Math.cos(rad)} y2={cy-7*Math.sin(rad)} stroke={theme} strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx={cx} cy={cy} r="4" fill={theme}/>
    <line x1="20" y1="182" x2="220" y2="182" stroke="#3a4150" strokeWidth="2"/>
    <line x1="20" y1="194" x2="220" y2="194" stroke="#2a313b" strokeWidth="1.5" strokeDasharray="9 7"/>
    <g transform="translate(150,0)" stroke={theme} strokeWidth="3.4" strokeLinecap="round" fill="none">
      <circle cx="8" cy="164" r="4.5" fill={theme} stroke="none"/>
      <path d="M8 168 L18 178"/><path d="M18 178 L10 182 M18 178 L28 180"/><path d="M8 170 L-2 176 M8 170 L18 172"/>
    </g>
    <text x="100" y="204" textAnchor="middle" fontSize="8" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('20 METRE SPRİNT','20 METRE SPRINT')}</text>
  </svg>);
}
function Cone({x,y,k,s=1}){return(<g key={k}>
  <ellipse cx={x} cy={y+5*s} rx={8*s} ry={2.6*s} fill="#000" opacity=".3"/>
  <path d={`M${x} ${y-12*s} L${x+7.5*s} ${y+5*s} L${x-7.5*s} ${y+5*s} Z`} fill="#f9743a"/>
  <path d={`M${x-3.6*s} ${y-3*s} L${x+3.6*s} ${y-3*s} L${x+4.8*s} ${y+0.6*s} L${x-4.8*s} ${y+0.6*s} Z`} fill="#fff" opacity=".85"/>
  <path d={`M${x} ${y-12*s} L${x+7.5*s} ${y+5*s} L${x} ${y+5*s} Z`} fill="#000" opacity=".12"/>
</g>);}
function arrowHead(x,y,dir,c){const d={u:'l-4 9 m4 -9 l4 9',d:'l-4 -9 m4 9 l4 -9',l:'l9 -4 m-9 4 l9 4',r:'l-9 -4 m9 4 l-9 4'}[dir];return<path d={`M${x} ${y} ${d}`} stroke={c} strokeWidth="2.2" fill="none"/>;}
function CourseStage({kind,theme,time}){
  const tval=time?Number(time).toFixed(2)+'s':'—';
  if(kind==='t')return(<svg viewBox="0 0 240 200" width="210">
    <rect x="0" y="0" width="240" height="200" fill="none"/>
    <path d="M120 168 L120 70" stroke={theme} strokeWidth="2" fill="none" strokeDasharray="7 5"/>
    <path d="M120 70 L62 70" stroke={theme} strokeWidth="2" fill="none" strokeDasharray="7 5"/>
    <path d="M120 70 L178 70" stroke={theme} strokeWidth="2" fill="none" strokeDasharray="7 5" opacity=".55"/>
    {arrowHead(120,74,'u',theme)}{arrowHead(66,70,'l',theme)}
    <text x="135" y="118" textAnchor="start" fontSize="6.5" fill="var(--muted)" fontFamily="IBM Plex Mono">10m</text>
    <text x="90" y="64" textAnchor="middle" fontSize="6.5" fill="var(--muted)" fontFamily="IBM Plex Mono">5m</text>
    <Cone x={120} y={172} k="a"/><Cone x={120} y={62} k="b"/><Cone x={60} y={62} k="c"/><Cone x={180} y={62} k="d"/>
    <rect x="92" y="104" width="56" height="26" rx="6" fill="#0a0b0d" stroke={theme}/>
    <text x="120" y="121" textAnchor="middle" fontSize="14" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{tval}</text>
    <text x="120" y="192" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('T ÇEVİKLİK TESTİ','T-AGILITY DRILL')}</text>
  </svg>);
  if(kind==='505')return(<svg viewBox="0 0 240 190" width="210">
    <line x1="100" y1="92" x2="100" y2="150" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="3 3"/>
    <line x1="174" y1="88" x2="174" y2="154" stroke={theme} strokeWidth="2.5"/>
    <path d="M48 110 H178 A11 11 0 0 1 178 132 H48" fill="none" stroke={theme} strokeWidth="2"/>
    {arrowHead(54,132,'l',theme)}
    <Cone x={100} y={123} k="a" s={0.85}/><Cone x={174} y={123} k="b" s={0.85}/>
    <text x="137" y="84" textAnchor="middle" fontSize="7" fill="var(--muted)" fontFamily="IBM Plex Mono">5m</text>
    <rect x="92" y="48" width="56" height="24" rx="6" fill="#0a0b0d" stroke={theme}/>
    <text x="120" y="64" textAnchor="middle" fontSize="14" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{tval}</text>
    <text x="120" y="176" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('5-0-5 YÖN DEĞİŞTİRME','5-0-5 CHANGE OF DIRECTION')}</text>
  </svg>);
  return(<svg viewBox="0 0 240 196" width="210">
    <line x1="52" y1="64" x2="52" y2="150" stroke={theme} strokeWidth="2.5"/><line x1="190" y1="64" x2="190" y2="150" stroke={theme} strokeWidth="2.5"/>
    <path d="M52 92 H190 M190 110 H52 M52 128 H190" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 3"/>
    {arrowHead(186,110,'l','var(--muted)')}{arrowHead(56,128,'r','var(--muted)')}
    <path d="M198 100 a11 11 0 0 1 0 22" fill="none" stroke={theme} strokeWidth="1.6"/><path d="M204 95 a18 18 0 0 1 0 32" fill="none" stroke={theme} strokeWidth="1.1" opacity=".55"/>
    <Cone x={52} y={160} k="a" s={0.85}/><Cone x={190} y={160} k="b" s={0.85}/>
    <text x="121" y="44" textAnchor="middle" fontSize="17" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">{time?Number(time).toFixed(2):'—'}</text>
    <text x="121" y="56" textAnchor="middle" fontSize="9" fontWeight="700" fill={theme} fontFamily="IBM Plex Mono">VO₂max</text>
    <text x="121" y="186" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('MEKİK / BEEP TESTİ','SHUTTLE / BEEP TEST')}</text>
  </svg>);
}
function CustomStage({theme}){
  return(<svg viewBox="0 0 200 200" width="150">
    <rect x="58" y="40" width="84" height="118" rx="12" fill="#12151b" stroke="var(--border)" strokeWidth="2"/>
    <rect x="84" y="32" width="32" height="16" rx="5" fill={theme}/>
    <circle cx="100" cy="96" r="26" fill="none" stroke={theme} strokeWidth="3"/><circle cx="100" cy="96" r="13" fill="none" stroke={theme} strokeWidth="2" opacity=".6"/><circle cx="100" cy="96" r="3" fill={theme}/>
    <text x="100" y="150" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="IBM Plex Mono">{L('ÖZEL TEST','CUSTOM TEST')}</text>
  </svg>);
}

/* ---- Mockup-style test card helpers ---- */
const MK_TITLE={anthro:'Anthropometric Measurement',posture:'Static Posture',ankleDF:'Ankle Dorsiflexion Degree',aslr:'Active Straight Leg Raise',ohs:'Overhead Squat Test',fms:'FMS — Functional Movement Screen',yBalance:'Y Balance Test',verticalJump:'Vertical Jump',cmj:'Counter-Movement Jump',lateralCmj:'Lateral CMJ',squatJump:'Squat Jump',dropJump:'Drop Jump (RSI)',horizontalJump:'Horizontal Jump',sprint:'20m Sprint',tTest:'T-Agility Test',fiveZeroFive:'5-0-5 Agility Test',shuttleRun:'Shuttle Run',circ:'Body Circumference'};
const MK_SOLO_UNIT={verticalJump:'cm',cmj:'cm',squatJump:'cm',horizontalJump:'cm',dropJump:'RSI',tTest:'sec',fiveZeroFive:'sec',shuttleRun:'vo2max'};
const MK_SHORT={anthro:'ANTHRO',circ:'CIRC',posture:'POSTURE',ankleDF:'ANKLE DF',aslr:'ASLR',ohs:'OHS',fms:'FMS',yBalance:'YBT',verticalJump:'VJ',cmj:'CMJ',lateralCmj:'LAT CMJ',squatJump:'SJ',dropJump:'DROP J',horizontalJump:'H JUMP',sprint:'20M',tTest:'T-TEST',fiveZeroFive:'5-0-5',shuttleRun:'SHUTTLE'};
const BADGE_COLS=['#0094ff','#a855f7','#7c3aed','#f97316','#06b6d4','#f97316','#0094ff','#f97316','#eab308','#10b981','#ec4899','#7c3aed','#0094ff','#a855f7','#f97316'];
const OHS_SCORES=[{v:'',l:'— Select'},{v:'0',l:'0 — Pain'},{v:'1',l:'1 — Major comp.'},{v:'2',l:'2 — Minor comp.'},{v:'3',l:'3 — Functional'}];
const FMS_OPTS=[{v:'',l:'—'},{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'}];

function MkInput({value,onChange,unit,step}){
  return(<div className="mk-input"><input type="number" step={step||'0.1'} inputMode="decimal" value={value||''} onChange={e=>onChange(e.target.value)}/>{unit&&<span className="mk-unit">{unit}</span>}</div>);
}
/* One line under the score box: the squad's current average and how far this
   reading sits from it. Silent when the test has no team average to show — an
   empty roster, or nobody else has taken it yet. */
function MkTeamAvg({id,value,athletes,athId}){
  const meta=TEAM_AVG_TESTS[id];
  const ta=useMemo(()=>teamAvgOf(athletes,id,athId),[athletes,id,athId]);
  if(!meta||!ta)return null;
  const d=teamAvgDelta(cmpN(value),ta.avg,meta.dir);
  return(<div className="mk-tavg">
    <span className="mk-tavg-l">{L('Takım ort.','Team avg')}</span>
    <span className="mk-tavg-v">{teamAvgFmt(ta.avg,id)}{meta.u?' '+meta.u:''}</span>
    {d&&<span className={'mk-tavg-d '+d.level}>
      {d.level==='same'?'on the average':`${Math.abs(d.pct).toFixed(1)}% ${d.pct>0?'above':'below'}`}</span>}
  </div>);
}
function MkObs({value,onChange,placeholder,className,label,autoGrow}){
  const lbl=label===undefined?'Observations':label;
  const ta=useRef(null);
  /* Grow the box downwards as the coach types so long notes stay fully visible
     (min-height from CSS is the floor; deleting text shrinks it back). */
  useEffect(()=>{
    if(!autoGrow)return;
    const el=ta.current;if(!el)return;
    const borders=el.offsetHeight-el.clientHeight;
    el.style.height='auto';
    el.style.height=(el.scrollHeight+borders)+'px';
  },[value,autoGrow]);
  return(<div className={"tc-obs"+(className?" "+className:"")}>{lbl?<div className="tc-obs-l">{lbl}</div>:null}
    <textarea ref={ta} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'—'}/></div>);
}
function MkSelectField({value,onChange,options}){
  return(<div className="mk-select"><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select><span className="mk-select-arr">▾</span></div>);
}
function MkUpload({photo,onChange,label}){
  const ref=useRef(null);
  const[open,setOpen]=useState(false);
  const[imgErr,setImgErr]=useState(false);
  useEffect(()=>{if(!open)return;const h=e=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[open]);
  useEffect(()=>{setImgErr(false);},[photo]);
  const isDrive=typeof photo==='string'&&photo.indexOf('drive:')===0;
  const dId=isDrive?photo.slice(6):'';
  const thumbSrc=isDrive?driveImg(dId):photo;
  const pick=()=>ref.current?.click();
  const pickDrive=()=>{
    const u=prompt('Paste a Google Drive share link (image OR video) — or just the file ID:');
    if(u==null)return;
    const did=driveId(u);
    if(!did){if(u.trim())alert('Could not read a Drive file ID from that link.');return;}
    onChange('drive:'+did); // stored tagged → opened in Drive's native viewer (image or video)
  };
  const pasteHere=()=>pasteImageFromClipboard('tests',d=>onChange(d));
  return(<div className="mk-up">
    <div className="mk-up-box" tabIndex={0}
      onPaste={e=>{const f=imageFileFromPaste(e);if(f){e.preventDefault();handleImageUpload(f,'tests',d=>onChange(d));}}}
      onClick={()=>{if(photo)setOpen(true);else pick();}}>
      {photo
        ?<React.Fragment>
            {isDrive&&imgErr
              ?<div className="mk-up-ph"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/></svg></div>
              :<img src={mediaSrc(thumbSrc)} alt={label} onError={()=>setImgErr(true)}/>}
            {isDrive&&<span className="mk-up-gd" title={L('Google Drive medyası','Google Drive media')}>▶</span>}
            <button className="mk-up-rm" onClick={e=>{e.stopPropagation();onChange(null);}}>✕</button>
          </React.Fragment>
        :<React.Fragment><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><button className="mk-up-drive" title={L('Google Drive bağlantısı kullan (görsel ya da video)','Use a Google Drive link (image or video)')} onClick={e=>{e.stopPropagation();pickDrive();}}>🔗</button><button className="mk-up-paste" title={L('Kopyalanan fotoğrafı yapıştır','Paste copied photo')} onClick={e=>{e.stopPropagation();pasteHere();}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></button></React.Fragment>}
    </div>
    <div className="mk-up-cap">{label}</div>
    <input ref={ref} type="file" accept="image/*" style={{display:'none'}}
      onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,'tests',d=>onChange(d));e.target.value='';}}/>
    {open&&photo&&ReactDOM.createPortal(
      <div className="mk-lb" onClick={()=>setOpen(false)}>
        <div className="mk-lb-inner" onClick={e=>e.stopPropagation()}>
          {isDrive
            ?<iframe className="mk-lb-frame" src={`https://drive.google.com/file/d/${dId}/preview`} allow="autoplay; fullscreen" allowFullScreen title={label}/>
            :<img className="mk-lb-img" src={mediaSrc(photo)} alt={label}/>}
          <button className="mk-lb-close" onClick={()=>setOpen(false)}>✕</button>
          {!isDrive&&<button className="mk-lb-change" onClick={pick}>↻ {L('Fotoğrafı değiştir','Change photo')}</button>}
        </div>
      </div>, document.body)}
  </div>);
}

const MK_ICONS={
  height:(<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0094ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2.5" width="5" height="19" rx="1"/><line x1="3" y1="7" x2="6" y2="7"/><line x1="3" y1="11" x2="6" y2="11"/><line x1="3" y1="15" x2="6" y2="15"/><line x1="3" y1="19" x2="6" y2="19"/><circle cx="15.5" cy="6" r="2"/><path d="M15.5 8v6"/><path d="M11.5 11h8"/><path d="M15.5 14l-3 6"/><path d="M15.5 14l3 6"/></svg>),
  weight:(<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0094ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><rect x="9" y="6.5" width="6" height="3.2" rx="1.2"/><path d="M12 17l3-5"/><circle cx="12" cy="17" r="1.4"/></svg>),
  wingspan:(<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0094ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2v8"/><path d="M3 11h18"/><path d="M12 15.2l-3 5.5"/><path d="M12 15.2l3 5.5"/></svg>),
  bodyfat:(<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0094ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1.7"/><path d="M12 6.7l-5 14"/><path d="M12 6.7l5 14"/><path d="M8.5 16h7"/></svg>),
};

/* Small Y-shaped stance diagram for the Y Balance card (mirrored for left stance). */
function YbDiag({flip}){
  return(<svg width="30" height="30" viewBox="0 0 34 34" style={flip?{transform:'scaleX(-1)'}:undefined}>
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
      <line x1="17" y1="17" x2="17" y2="4"/>
      <line x1="17" y1="17" x2="6" y2="28"/>
      <line x1="17" y1="17" x2="28" y2="28"/>
    </g>
    <circle cx="17" cy="17" r="2.6" fill="currentColor"/>
  </svg>);
}

/* The FMS score sheet, attached to the record.
   The coach runs the screen on the official sheet and comes back with a PDF;
   this is where it lands. Its pages are read on the way in so the report can
   print them — see fmsReadPdf — and the original file is kept beside them. */
function FmsPdfPanel({pdf,onChange}){
  const ref=useRef(null);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const[zoom,setZoom]=useState(-1);
  useEffect(()=>{if(zoom<0)return;const h=e=>{if(e.key==='Escape')setZoom(-1);};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[zoom]);
  const take=async f=>{
    if(!f)return;
    setErr('');setBusy(true);
    try{onChange(await fmsReadPdf(f));}
    catch(e){setErr(e.message||String(e));}
    finally{setBusy(false);if(ref.current)ref.current.value='';}
  };
  const drop=e=>{e.preventDefault();take(e.dataTransfer?.files?.[0]);};
  const openOriginal=()=>{
    if(!pdf?.data){alert(L('Bu PDF kayda sığmayacak kadar büyüktü — yalnızca sayfaları tutuldu.','That PDF was too large to keep on the record — only its pages were kept.'));return;}
    const w=window.open();
    if(!w){alert(L('Pop-up engellendi.','Pop-up blocked.'));return;}
    w.document.write(`<iframe src="${pdf.data}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`);
    w.document.close();
  };
  const kb=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  return(<div className="fms-pdf">
    <div className="mk-flbl">{L('FMS TEST SONUÇ PDF’İ','FMS TEST RESULTS PDF')}</div>
    {!pdf&&<div className={'fms-drop'+(busy?' busy':'')}
        onClick={()=>!busy&&ref.current?.click()}
        onDragOver={e=>e.preventDefault()} onDrop={drop}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
      <div className="fms-drop-t">{busy?L('PDF okunuyor…','Reading the PDF…'):L('Test sonuçları PDF’ini yükle','Upload test results PDF')}</div>
      <div className="fms-drop-s">{L('PDF sürükleyip bırak veya seçmek için tıkla · en fazla 12 MB','Drag a PDF here, or click to choose one · 12 MB max')}</div>
    </div>}
    {pdf&&<div className="fms-pdf-have">
      <div className="fms-pdf-meta">
        <span className="fms-pdf-nm" title={pdf.name}>{pdf.name}</span>
        <span className="fms-pdf-sz">{pdf.pages.length} {L('sayfa','page'+(pdf.pages.length===1?'':'s'))}{pdf.size?' · '+kb(pdf.size):''}</span>
        <div style={{flex:1}}/>
        {pdf.data&&<button type="button" className="btn xs sec" onClick={openOriginal}>{L('PDF’i aç','Open PDF')}</button>}
        <button type="button" className="btn xs sec" onClick={()=>ref.current?.click()}>{L('Değiştir','Replace')}</button>
        <button type="button" className="btn xs sec" onClick={()=>{if(confirm(L('Yüklenen PDF kayıttan kaldırılsın mı?','Remove the uploaded PDF from this record?')))onChange(null);}}>{L('Kaldır','Remove')}</button>
      </div>
      <div className="fms-pdf-pages">
        {pdf.pages.map((src,i)=>(<button type="button" key={i} className="fms-pdf-pg" onClick={()=>setZoom(i)} title={L('Büyüt','Enlarge')}>
          <img src={mediaSrc(src)} alt={L('Sayfa','Page')+' '+(i+1)}/>
          {pdf.pages.length>1&&<span className="fms-pdf-pgn">{i+1}</span>}
        </button>))}
      </div>
    </div>}
    {err&&<div className="fms-pdf-err">{err}</div>}
    <input ref={ref} type="file" accept="application/pdf,.pdf" style={{display:'none'}} onChange={e=>take(e.target.files?.[0])}/>
    {zoom>=0&&pdf&&<div className="fms-pdf-lb" onClick={()=>setZoom(-1)}>
      <img src={mediaSrc(pdf.pages[zoom])} alt="" onClick={e=>e.stopPropagation()}/>
      <button type="button" className="fms-pdf-lbx" onClick={()=>setZoom(-1)}>✕</button>
    </div>}
  </div>);
}

function TestCard({id,index,test,onUpdate,custom,athletes,athId}){
  const u=(k,v)=>onUpdate({[k]:v});
  const uN=(key,sub,val)=>onUpdate({[key]:{...(test[key]||{}),[sub]:val}});
  const cat=TEST_CATALOG.find(c=>c.id===id);
  const name=custom?custom.name:(MK_TITLE[id]||(cat?cat.name:id));
  const tag=custom?'':(MK_SHORT[id]||'');
  const obsVal=id==='posture'?(test.posture?.observations||''):id==='ohs'?(test.ohs?.observations||''):id==='fms'?(test.fms?.observations||''):((test.obs||{})[id]||'');
  const setObs=id==='posture'?(v=>uN('posture','observations',v)):id==='ohs'?(v=>uN('ohs','observations',v)):id==='fms'?(v=>uN('fms','observations',v)):(v=>onUpdate({obs:{...(test.obs||{}),[id]:v}}));
  const badgeColor=BADGE_COLS[(index-1)%BADGE_COLS.length];
  const wide=id==='anthro'||id==='circ'||id==='ohs'||id==='fms'||id==='sprint';

  const Hd=()=>(<div className="tcard-hd">
    <div className="tcard-badge">{index}</div>
    <div className="tcard-title">{name}</div>
    {tag&&<div className="tcard-tag">{tag}</div>}
  </div>);

  if(id==='circ'){
    return(<div className={"tcard tcard-wide"} style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div style={{padding:'4px 20px 20px'}}><BodyCircumferenceModel test={test} onUpdate={onUpdate} lang={REPORT_LANG}/></div>
    </div>);
  }

  if(id==='anthro'){
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-body-wide">
        <div className="mk-anthro">
          <div className="mk-field"><div className="mk-flbl">{L('Boy','Height')}</div><MkInput value={test.height} onChange={v=>u('height',v)} unit="cm"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Kilo','Weight')}</div><MkInput value={test.weight} onChange={v=>u('weight',v)} unit="kg"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Kulaç','Wingspan')}</div><MkInput value={test.wingspan} onChange={v=>u('wingspan',v)} unit="cm"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Yağ Oranı','Body Fat')}</div><MkInput value={test.bodyFat} onChange={v=>u('bodyFat',v)} unit="%"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Bacak Uzunluğu (SİAS – Medial Malleol)','Leg Length (ASIS – Medial Malleolus)')}</div><MkInput value={test.legLength} onChange={v=>u('legLength',v)} unit="cm"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Oturma Yüksekliği','Sitting Height')}</div><MkInput value={test.sittingHeight} onChange={v=>u('sittingHeight',v)} unit="cm"/></div>
        </div>
      </div>
    </div>);
  }

  if(id==='posture'){
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-content">
        <div className="tc-fields">
          <div className="photo-grid2x2">
            <MkUpload photo={test.posture?.frontPhoto} onChange={v=>uN('posture','frontPhoto',v)} label={L('Ön','Front')}/>
            <MkUpload photo={test.posture?.sidePhoto} onChange={v=>uN('posture','sidePhoto',v)} label="Side (R)"/>
            <MkUpload photo={test.posture?.sideLPhoto} onChange={v=>uN('posture','sideLPhoto',v)} label="Side (L)"/>
            <MkUpload photo={test.posture?.backPhoto} onChange={v=>uN('posture','backPhoto',v)} label={L('Arka','Back')}/>
          </div>
        </div>
        <MkObs value={obsVal} onChange={setObs} className="tc-obs-posture" placeholder={L('Dizilim, asimetriler, postür sapmaları…','Alignment, asymmetries, postural deviations…')}/>
      </div>
    </div>);
  }

  if(id==='ohs'){
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-body-wide">
        <div className="ohs-top">
          <div className="mk-field" style={{flex:'1 1 260px',maxWidth:440}}>
            <div className="mk-flbl">{L('BÜS Skoru (FMS 0-3)','OHS Score (FMS 0-3)')}</div>
            <MkSelectField value={test.ohs?.score??''} onChange={v=>uN('ohs','score',v)} options={OHS_SCORES}/>
          </div>
        </div>
        <div style={{display:'flex',gap:28,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div>
            <div className="mk-flbl" style={{marginBottom:10}}>{L('Fotoğraflar','Photos')}</div>
            <div className="mk-uploads">
              <MkUpload photo={test.ohs?.frontPhoto} onChange={v=>uN('ohs','frontPhoto',v)} label={L('Ön','Front')}/>
              <MkUpload photo={test.ohs?.sidePhoto} onChange={v=>uN('ohs','sidePhoto',v)} label={L('Yan','Side')}/>
              <MkUpload photo={test.ohs?.backPhoto} onChange={v=>uN('ohs','backPhoto',v)} label={L('Arka','Back')}/>
            </div>
          </div>
          <MkObs value={obsVal} onChange={setObs} placeholder={L('Hareket kalitesi, notlar…','Movement quality, notes…')} className="tc-obs-flex"/>
        </div>
      </div>
    </div>);
  }

  if(id==='fms'){
    const f=test.fms||{};
    const setF=(k,v)=>onUpdate({fms:{...f,[k]:v}});
    /* The screen is run on the official FMS sheet and comes back as a PDF, so
       the sheet is the record — there is nothing to re-key here. */
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <div className="tcard-hd">
        <div className="tcard-badge">{index}</div>
        <div className="tcard-title">{name}</div>
        <img className="fms-hd-logo" src="fms-logo.png" alt="FMS"/>
      </div>
      <div className="tcard-body-wide">
        <FmsPdfPanel pdf={f.pdf||null} onChange={v=>setF('pdf',v)}/>
        <MkObs value={obsVal} onChange={setObs} placeholder={L('Kompanzasyonlar, ağrı, hareket kalitesi notları…','Compensations, pain, movement-quality notes…')}/>
      </div>
    </div>);
  }

  if(id==='ankleDF'){
    const r=Number(test.ankleDF?.right)||0,l=Number(test.ankleDF?.left)||0,diff=Math.abs(r-l);
    return(<div className="tcard" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-col">
        <div className="mk-pair">
          <div className="mk-field"><div className="mk-flbl">{L('Sağ','Right')}</div><MkInput value={test.ankleDF?.right} onChange={v=>uN('ankleDF','right',v)} unit="°"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Sol','Left')}</div><MkInput value={test.ankleDF?.left} onChange={v=>uN('ankleDF','left',v)} unit="°"/></div>
        </div>
        {(r>0||l>0)&&<div className="mk-asym-pill">{L('Asimetri','Asymmetry')} {diff.toFixed(1)}°</div>}
      </div>
    </div>);
  }

  if(id==='aslr'){
    const r=Number(test.aslr?.right)||0,l=Number(test.aslr?.left)||0,diff=Math.abs(r-l);
    return(<div className="tcard" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-col">
        <div className="mk-pair">
          <div className="mk-field"><div className="mk-flbl">{L('Sağ (FMS)','Right (FMS)')}</div><MkSelectField value={test.aslr?.right??''} onChange={v=>uN('aslr','right',v)} options={FMS_OPTS}/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Sol (FMS)','Left (FMS)')}</div><MkSelectField value={test.aslr?.left??''} onChange={v=>uN('aslr','left',v)} options={FMS_OPTS}/></div>
        </div>
        {(r>0||l>0)&&<div className="mk-asym-pill">{L('Asimetri','Asymmetry')} {diff} {L('puan','pts')}</div>}
      </div>
    </div>);
  }

  if(id==='yBalance'){
    const yb=ybCalc(test.yBalance);
    const set=(k,v)=>onUpdate({yBalance:{...(test.yBalance||{}),[k]:v}});
    const setSide=(s,k,v)=>onUpdate({yBalance:{...(test.yBalance||{}),[s]:{...((test.yBalance||{})[s]||{}),[k]:v}}});
    const DIRS=[['ant',L('Anterior','Anterior')],['pm',L('Posteromedial','Posteromedial')],['pl',L('Posterolateral','Posterolateral')]];
    const diffs=[[L('Anterior','Anterior'),yb.dAnt],[L('Posteromedial','Posteromedial'),yb.dPm],[L('Posterolateral','Posterolateral'),yb.dPl]];
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-body-wide">
        <div className="yb-wrap">
          <div className="yb-left">
            <div className="mk-field" style={{maxWidth:360}}>
              <div className="mk-flbl">{L('Bacak Uzunluğu (SİAS – Medial Malleol)','Leg Length (ASIS – Medial Malleolus)')}</div>
              <MkInput value={test.yBalance?.limbLength} onChange={v=>set('limbLength',v)} unit="cm"/>
            </div>
            <div className="yb-sides">
              {[['right',L('Sağ Ayak','Right Foot')],['left',L('Sol Ayak','Left Foot')]].map(([s,lbl])=>(
                <div key={s} className="yb-side">
                  <div className="yb-side-h"><YbDiag flip={s==='left'}/><span>{lbl}</span></div>
                  {DIRS.map(([k,dl])=>(
                    <div key={k} className="mk-field">
                      <div className="mk-flbl">{dl}</div>
                      <MkInput value={test.yBalance?.[s]?.[k]} onChange={v=>setSide(s,k,v)} unit="cm"/>
                    </div>))}
                </div>))}
            </div>
          </div>
          <div className="yb-score">
            <div className="yb-score-t">{L('Bileşik Skor','Composite Score')}</div>
            <div className="yb-comps">
              {[[L('Sağ','Right'),yb.compR],[L('Sol','Left'),yb.compL]].map(([lbl,v])=>(
                <div key={lbl} className="yb-comp">
                  <div className="yb-comp-l">{lbl}</div>
                  <div className="yb-comp-v" style={{color:v!=null?'var(--card-accent,#0094ff)':'rgba(255,255,255,.25)'}}>{v!=null?v:'—'}<small>%</small></div>
                </div>))}
            </div>
            {yb.compR!=null&&yb.compL!=null&&<div className="mk-asym-pill" style={{marginTop:0}}>{L('Asimetri','Asymmetry')} {Math.abs(yb.compR-yb.compL).toFixed(1)}%</div>}
            <div className="yb-diffs">
              <div className="yb-diffs-t">{L('Sağ / Sol Uzanma Farkı (< 4 cm)','R / L Reach Difference (< 4 cm)')}</div>
              {diffs.map(([lbl,d])=>(
                <div key={lbl} className="yb-diff-row">
                  <span>{lbl}</span>
                  <span className={'yb-diff-val'+(d==null?'':(d<4?' ok':' bad'))}>{d==null?'—':d.toFixed(1)+' cm'}</span>
                </div>))}
            </div>
            <div className="yb-formula">{L('Bileşik = (ANT + PM + PL) / (3 × Bacak Uzunluğu) × 100','Composite = (ANT + PM + PL) / (3 × Leg Length) × 100')}</div>
          </div>
        </div>
        <MkObs value={obsVal} onChange={setObs} placeholder={L('Denge stratejisi, salınım, yere temaslar…','Balance strategy, wobble, touch-downs…')}/>
      </div>
    </div>);
  }

  if(id==='sprint'){
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-content">
        <div className="tc-fields">
          <div className="mk-field">
            <div className="mk-flbl">{L('20m Sprint Süresi','20m Sprint Time')}</div>
            <div className="mk-input mk-solo"><input type="number" step="0.01" inputMode="decimal" value={test.sprint20m?.time||''} onChange={e=>uN('sprint20m','time',e.target.value)}/><span className="mk-unit">s</span></div>
          </div>
          <div>
            <div className="mk-flbl" style={{marginBottom:10}}>{L('Adım / Ayak Fotoğrafları','Step / Foot Photos')}</div>
            <div className="mk-uploads">
              <MkUpload photo={test.sprint20m?.sideStep1} onChange={v=>uN('sprint20m','sideStep1',v)} label={L('Adım 1','Step 1')}/>
              <MkUpload photo={test.sprint20m?.sideStep2} onChange={v=>uN('sprint20m','sideStep2',v)} label={L('Adım 2','Step 2')}/>
              <MkUpload photo={test.sprint20m?.sideStep3} onChange={v=>uN('sprint20m','sideStep3',v)} label={L('Adım 3','Step 3')}/>
              <MkUpload photo={test.sprint20m?.frontRightFoot} onChange={v=>uN('sprint20m','frontRightFoot',v)} label={L('Sağ Ayak','R Foot')}/>
              <MkUpload photo={test.sprint20m?.frontLeftFoot} onChange={v=>uN('sprint20m','frontLeftFoot',v)} label={L('Sol Ayak','L Foot')}/>
            </div>
          </div>
        </div>
        <MkObs value={obsVal} onChange={setObs} placeholder={L('Sprint mekaniği, reaksiyon süresi notları…','Sprint mechanics, reaction time notes…')}/>
      </div>
    </div>);
  }

  if(id==='lateralCmj'){
    const r=Number(test.lateralCmj?.right)||0,l=Number(test.lateralCmj?.left)||0;
    const diff=Math.abs(r-l),mx=Math.max(r,l);
    return(<div className="tcard tcard-score" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-col">
        <div className="mk-pair">
          <div className="mk-field"><div className="mk-flbl">{L('Sağ','Right')}</div><MkInput value={test.lateralCmj?.right} onChange={v=>uN('lateralCmj','right',v)} unit="cm"/></div>
          <div className="mk-field"><div className="mk-flbl">{L('Sol','Left')}</div><MkInput value={test.lateralCmj?.left} onChange={v=>uN('lateralCmj','left',v)} unit="cm"/></div>
        </div>
        {(r>0&&l>0)&&<div className="mk-asym-pill">Asymmetry {diff.toFixed(1)} cm ({(diff/mx*100).toFixed(1)}%)</div>}
        <MkObs value={obsVal} onChange={setObs} placeholder={L('İniş kontrolü, taraf baskınlığı…','Landing control, side dominance…')}/>
      </div>
    </div>);
  }

  if(MK_SOLO_UNIT[id]){
    const step=(id==='dropJump'||id==='tTest'||id==='fiveZeroFive'||id==='shuttleRun')?'0.01':'0.1';
    return(<div className="tcard tcard-score" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-col">
        <div className="mk-input mk-solo"><input type="number" step={step} inputMode="decimal" value={test[id]||''} onChange={e=>u(id,e.target.value)}/><span className="mk-unit">{MK_SOLO_UNIT[id]}</span></div>
        <MkTeamAvg id={id} value={test[id]} athletes={athletes} athId={athId}/>
        <MkObs value={obsVal} onChange={setObs}/>
      </div>
    </div>);
  }

  // custom test
  return(<div className="tcard tcard-score" style={{'--card-accent':badgeColor}}>
    <Hd/>
    <div className="tcard-col">
      <div className="mk-input"><input type="text" value={(test.custom&&test.custom[id])||''} onChange={e=>onUpdate({custom:{...(test.custom||{}),[id]:e.target.value}})}/></div>
      <MkObs value={obsVal} onChange={setObs}/>
    </div>
  </div>);
}

function TestSession({test,ath,setup,customTests,athletes,onUpdate,onClose}){
  const cTests=Array.isArray(customTests)?customTests:[];
  const ids=expandBattery(test.battery)||TEST_CATALOG.filter(c=>!c.retired||(c.id==='fms'&&FMS_HAS(test))).map(c=>c.id);
  const valid=ids.filter(id=>TEST_CATALOG.find(c=>c.id===id)||cTests.find(c=>c.id===id));
  const u=(k,v)=>onUpdate({[k]:v});
  const initials=(ath.name||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'?';
  return(<div className="panel" style={{borderColor:'var(--accent)',boxShadow:'0 0 0 1px rgba(0,148,255,.22)'}}>
    <div className="tsess-h">
      <div className="row" style={{gap:12,alignItems:'center'}}>
        {ath.photo?<img className="tsess-av" src={mediaSrc(ath.photo)} alt=""/>:<div className="tsess-avph">{initials}</div>}
        <div><div className="tsess-nm">{ath.name}</div><div className="tsess-meta">{valid.length} {L('test','tests')} · {fd(test.date)}</div></div>
      </div>
      <div className="row" style={{gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div><label style={{fontSize:11}}>{L('Tarih','Date')}</label><input type="date" value={test.date} onChange={e=>u('date',e.target.value)} style={{width:150}}/></div>
        <div><label style={{fontSize:11}}>{L('Dönem','Period')}</label><select value={test.period} onChange={e=>u('period',e.target.value)} style={{width:140}}>{TEST_PERIODS.map(p=><option key={p.id} value={p.id}>{exLabel(p.label)}</option>)}</select></div>
        <button className="btn sm sec" onClick={()=>{try{generateTestPDF(test,ath,setup,customTests,athletes);}catch(e){alert(L('PDF hatası: ','PDF error: ')+e.message);}}}>⎙ {L('Çıktı al','Print')}</button>
        <button className="btn sm sec" onClick={()=>{try{printTestCompare(test,ath,setup,customTests,athletes);}catch(e){alert(L('Rapor hatası: ','Report error: ')+e.message);}}}
          title={L('Bu kayıttaki her ölçüm takım ortalamasına karşı (A4 dikey)','Every reading on this record set against the squad average (A4 portrait)')}>▤ {L('Rapor','Report')}</button>
        <button className="btn sm sec" onClick={onClose}>{L('Kapat','Close')} ✕</button>
      </div>
    </div>
    <div className="ts-wrap">
      {valid.map((id,i)=>{const cu=cTests.find(c=>c.id===id);return<TestCard key={id} id={id} index={i+1} test={test} onUpdate={onUpdate} custom={cu} athletes={athletes} athId={ath.id}/>;})}
      {valid.length===0&&<div className="empty-st">{L('Bu bataryada test yok.','No tests in this battery.')}</div>}
      <div className="tcard tcard-wide tcard-summary" style={{'--card-accent':'#0094ff'}}>
        <div className="tcard-hd">
          <div className="tcard-badge">✎</div>
          <div className="tcard-title">{L('Gözlemler ve Yorumlar','Observations & Comments')}</div>
          <div className="tcard-tag">{L('ÖZET','SUMMARY')}</div>
        </div>
        <div className="tcard-body-wide">
          <MkObs value={test.notes} onChange={v=>u('notes',v)} label="" className="tc-obs-summary" autoGrow
            placeholder={L('Bu test seansına dair genel izlenim, temel bulgular, kısıtlar ve öneriler…','Overall impressions, key findings, limitations and recommendations for this testing session…')}/>
        </div>
      </div>
    </div>
  </div>);
}

