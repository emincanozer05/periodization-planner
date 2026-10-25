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
const MK_TITLE={anthro:'Anthropometric Measurement',posture:'Static Posture',ankleDF:'Ankle Dorsiflexion Degree',aslr:'Active Straight Leg Raise',ohs:'Overhead Squat Test',fms:'FMS — Functional Movement Screen',yBalance:'Y Balance Test',verticalJump:'Vertical Jump',cmj:'Counter-Movement Jump',lateralCmj:'Lateral CMJ',squatJump:'Squat Jump',dropJump:'Drop Jump (RSI)',horizontalJump:'Horizontal Jump',sprint:'20m Sprint',tTest:'T-Agility Test',fiveZeroFive:'505 COD Test',shuttleRun:'Shuttle Run',circ:'Body Circumference',
  accel:'5-10m Acceleration',hipRot:'Active Hip IR/ER (Seated)',thomas:'Thomas Test',tSpine:'Active T-Spine Rotation',
  benchPress:'Bench Press',trapBarDL:'Trap Bar Deadlift',pullUp:'Pull-Up',copenhagen:'Short Lever Copenhagen Plank',sidePlank:'Side Plank',backSquat:'Barbell Squat',ift3015:'30-15 Intermittent Fitness Test'};
const MK_SOLO_UNIT={verticalJump:'cm',cmj:'cm',squatJump:'cm',horizontalJump:'cm',dropJump:'RSI',tTest:'sec',shuttleRun:'vo2max'};
const MK_SHORT={anthro:'ANTHRO',circ:'CIRC',posture:'POSTURE',ankleDF:'ANKLE DF',aslr:'ASLR',ohs:'OHS',fms:'FMS',yBalance:'YBT',verticalJump:'VJ',cmj:'CMJ',lateralCmj:'LAT CMJ',squatJump:'SJ',dropJump:'DROP J',horizontalJump:'H JUMP',sprint:'20M',tTest:'T-TEST',fiveZeroFive:'505',shuttleRun:'SHUTTLE',
  accel:'5-10M',hipRot:'HIP IR/ER',thomas:'THOMAS',tSpine:'T-SPINE',benchPress:'BP',trapBarDL:'TBDL',pullUp:'PULL-UP',copenhagen:'CPH',sidePlank:'SIDE PLANK',backSquat:'SQUAT',ift3015:'30-15 IFT'};
const BADGE_COLS=['#0094ff','#a855f7','#7c3aed','#f97316','#06b6d4','#f97316','#0094ff','#f97316','#eab308','#10b981','#ec4899','#7c3aed','#0094ff','#a855f7','#f97316'];
const OHS_SCORES=[{v:'',l:'— Select'},{v:'0',l:'0 — Pain'},{v:'1',l:'1 — Major comp.'},{v:'2',l:'2 — Minor comp.'},{v:'3',l:'3 — Functional'}];
const FMS_OPTS=[{v:'',l:'—'},{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'}];

function MkInput({value,onChange,unit,step,sm}){
  return(<div className={'mk-input'+(sm?' sm':'')}><input type="number" step={step||'0.1'} inputMode="decimal" value={value||''} onChange={e=>onChange(e.target.value)}/>{unit&&<span className="mk-unit">{unit}</span>}</div>);
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
      {d.level==='same'?L('ortalamada','on the average'):`${L('%'+Math.abs(d.pct).toFixed(1),Math.abs(d.pct).toFixed(1)+'%')} ${d.pct>0?L('üstünde','above'):L('altında','below')}`}</span>}
  </div>);
}
function MkObs({value,onChange,placeholder,className,label,autoGrow}){
  const lbl=label===undefined?L('Gözlem','Observations'):label;
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
              ?<div className="mk-up-ph">{L('Drive medyası','Drive media')}</div>
              :<img src={mediaSrc(thumbSrc)} alt={label} onError={()=>setImgErr(true)}/>}
            {isDrive&&<span className="mk-up-gd" title={L('Google Drive medyası','Google Drive media')}>Drive</span>}
            <button className="mk-up-rm" title={L('Fotoğrafı kaldır','Remove photo')} onClick={e=>{e.stopPropagation();onChange(null);}}>{L('Kaldır','Remove')}</button>
          </React.Fragment>
        :<React.Fragment><span className="mk-up-add">{L('Fotoğraf ekle','Add photo')}</span><span className="mk-up-alt"><button className="mk-up-drive" title={L('Google Drive bağlantısı kullan (görsel ya da video)','Use a Google Drive link (image or video)')} onClick={e=>{e.stopPropagation();pickDrive();}}>Drive</button><button className="mk-up-paste" title={L('Kopyalanan fotoğrafı yapıştır','Paste copied photo')} onClick={e=>{e.stopPropagation();pasteHere();}}>{L('Yapıştır','Paste')}</button></span></React.Fragment>}
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
          <button className="mk-lb-close" onClick={()=>setOpen(false)}>{L('Kapat','Close')}</button>
          {!isDrive&&<button className="mk-lb-change" onClick={pick}>{L('Fotoğrafı değiştir','Change photo')}</button>}
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

/* The FMS score sheet, live. One line per line of the official sheet (FMS_SHEET):
   tap a 0-3, tap + or − on a clearing test, tap R / Y / G on ankle mobility, write a
   comment against a movement. Final scores and the total are worked out as you go. The
   header is not typed: it is read off the athlete and the test (and the two
   measurements are carried forward from the last screen). */
/* "Tespit Edilen Problemler" cell: a multi-select dropdown. The button lists what is ticked and
   grows to fit it (wrapping onto more lines); the list floats over the page from <body>, because the table sits in a
   scroller that would clip it and a list opened in place would stretch the row. */
function FmsProblemPick({opts,value,onChange,legacy}){
  const[pos,setPos]=useState(null);   // null = closed, else the popup's fixed placement
  const btn=useRef(null),pop=useRef(null);
  const sel=Array.isArray(value)?value:[];
  const chosen=opts.filter(o=>sel.includes(o[0]));
  const text=chosen.map(o=>L(o[1],o[2])).join(', ');
  const toggle=id=>onChange(sel.includes(id)?sel.filter(x=>x!==id):[...sel,id]);
  const place=()=>{
    const r=btn.current.getBoundingClientRect();
    const w=Math.min(Math.max(r.width,300),window.innerWidth-16);
    const left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
    const below=window.innerHeight-r.bottom-8,above=r.top-8,want=opts.length*38+(legacy?44:0)+12;
    return below>=want||below>=above?{left,width:w,top:r.bottom+4,maxHeight:Math.max(140,below)}:{left,width:w,bottom:window.innerHeight-r.top+4,maxHeight:Math.max(140,above)};
  };
  // The button grows as problems are ticked, so an open list follows its bottom edge.
  useLayoutEffect(()=>{if(pos)setPos(place());},[sel.length]);
  useEffect(()=>{
    if(!pos)return;
    const close=()=>setPos(null);
    const away=e=>{if(!(pop.current&&pop.current.contains(e.target))&&!(btn.current&&btn.current.contains(e.target)))close();};
    const key=e=>{if(e.key==='Escape'){close();btn.current&&btn.current.focus();}};
    const scroll=e=>{if(!(pop.current&&pop.current.contains(e.target)))close();};
    document.addEventListener('mousedown',away);document.addEventListener('keydown',key);
    window.addEventListener('scroll',scroll,true);window.addEventListener('resize',close);
    return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',key);
      window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',close);};
  },[pos]);
  return(<div className="fmsp">
    <button type="button" ref={btn} className={'fmsp-btn'+(pos?' open':'')+(chosen.length?' has':'')} aria-haspopup="true" aria-expanded={!!pos}
      onClick={()=>setPos(pos?null:place())}>
      <span>{text||L('Problem seç…','Select problems…')}</span><i aria-hidden="true">▾</i>
    </button>
    {pos&&ReactDOM.createPortal(
      <div className="fmsp-pop" ref={pop} style={pos} role="group" aria-label={L('Tespit Edilen Problemler','Identified Problems')}>
        {opts.map(o=>(<label key={o[0]}><input type="checkbox" checked={sel.includes(o[0])} onChange={()=>toggle(o[0])}/><span>{L(o[1],o[2])}</span></label>))}
        {legacy&&<div className="fmsp-old">{L('Önceki yorum: ','Earlier comment: ')}{legacy}</div>}
      </div>,document.body)}
  </div>);
}
function FmsSheetCard({test,ath,onUpdate}){
  const f=test.fms||{};
  const c=fmsCalc(f);
  const hd=fmsHeader(test,ath);
  const byId={};c.items.forEach(i=>{byId[i.id]=i;});
  const setTop=(k,v)=>onUpdate(t=>({fms:{...(t.fms||{}),[k]:v}}));
  const setCell=(r,v)=>onUpdate(t=>{
    const o=t.fms||{};
    if(!r.side)return{fms:{...o,[r.f]:v}};
    const cur=o[r.f];
    // A clearing test saved before the sheet had sides is a bare answer: it stands for both.
    const base=typeof cur==='string'&&cur?{right:cur,left:cur}:(cur&&typeof cur==='object'?cur:{});
    return{fms:{...o,[r.f]:{...base,[r.side]:v}}};
  });
  const setComment=(id,v)=>onUpdate(t=>({fms:{...(t.fms||{}),comments:{...((t.fms||{}).comments||{}),[id]:v}}}));
  const setProblems=(id,v)=>onUpdate(t=>({fms:{...(t.fms||{}),problems:{...((t.fms||{}).problems||{}),[id]:v}}}));
  const tone=v=>v==null||v===''?'':'t'+Math.max(1,Math.min(3,Number(v)));
  const sideLbl=r=>r.side==='right'?L('Sağ','Right'):L('Sol','Left');
  // The words a screen reader gets for a line: its group's label, carried down to the second side.
  let lastLab='';
  const labs=FMS_SHEET.map(r=>{if(r.lab)lastLab=L(r.lab[0],r.lab[1]);return lastLab;});
  const missing=[!hd.dob&&L('doğum tarihi','date of birth'),!hd.sex&&L('cinsiyet','sex')].filter(Boolean);
  const total=c.total;
  return(<div className="fmsl">
    <div className="fmsl-top">
      <div className="fmsl-hd"><span className="fmsl-t">{L('FONKSİYONEL HAREKET TARAMASI PUAN KÂĞIDI','FUNCTIONAL MOVEMENT SCREEN SCORE SHEET')}</span></div>
      <div className="fmsl-id">
        <div className="fmsl-f wide"><label>{L('Ad','Name')}</label><div className="fmsl-v">{hd.name||'—'}</div></div>
        <div className="fmsl-f"><label>{L('Tarih','Date')}</label><div className="fmsl-v">{fd(hd.date)||'—'}</div></div>
        <div className="fmsl-f"><label>{L('Doğum','DOB')}</label><div className="fmsl-v">{fd(hd.dob)||'—'}</div></div>
        <div className="fmsl-f"><label>{L('Yaş','Age')}</label><div className="fmsl-v">{hd.age!=null?hd.age:'—'}</div></div>
        <div className="fmsl-f"><label>{L('Cinsiyet','Gender')}</label><div className="fmsl-v">{hd.sex||'—'}</div></div>
        <div className="fmsl-f"><label>{L('Tibia Boyu','Tibia Height')}</label>
          <div className="fmsl-in"><LiveInput type="number" step="0.1" inputMode="decimal" value={hd.tibia} onChange={v=>setTop('tibia',v)}/><span>cm</span></div></div>
        <div className="fmsl-f"><label>{L('El Uzunluğu','Hand Length')}</label>
          <div className="fmsl-in"><LiveInput type="number" step="0.1" inputMode="decimal" value={hd.hand} onChange={v=>setTop('hand',v)}/><span>cm</span></div></div>
      </div>
      <div className="fmsl-auto">{L('Ad, tarih, doğum tarihi, yaş ve cinsiyet sporcu profilinden otomatik gelir; tibia boyu ve el uzunluğu bir kez girilir, sonraki taramalara taşınır.','Name, date, date of birth, age and sex come from the athlete’s profile; tibia height and hand length are typed once and carried to the next screens.')}
        {missing.length>0&&<b> {L('Profilde eksik: ','Missing on the profile: ')}{missing.join(', ')}.</b>}</div>
    </div>
    <div className="fmsl-scroll"><table className="fmsl-t">
      <colgroup><col className="c-lab"/><col className="c-sd"/><col className="c-raw"/><col className="c-fin"/><col className="c-cm"/></colgroup>
      <thead><tr><th colSpan="2">{L('Test','Screen')}</th><th>{L('Ham Skor','Raw Score')}</th><th>{L('Nihai Skor','Final Score')}</th><th>{L('Tespit Edilen Problemler','Identified Problems')}</th></tr></thead>
      <tbody>
        {FMS_SHEET.map((r,i)=>{
          const v=fmsCell(f,r);
          const it=r.fin&&r.fin.of?byId[r.fin.of]:null;
          const nm=labs[i];
          return(<tr key={i}>
            {r.lab&&<td className={'lab'+(r.sub?' sub':'')} rowSpan={r.ls} colSpan={r.side?1:2}>{L(r.lab[0],r.lab[1])}</td>}
            {r.side&&<td className="sd">{r.side==='right'?'R':'L'}</td>}
            <td className="raw">
              {r.kind==='score'&&<div className="fmsl-seg" role="group" aria-label={`${nm} ${sideLbl(r)}`}>
                {['0','1','2','3'].map(n=>(<button type="button" key={n} className={'s'+n+(String(v)===n?' on':'')} aria-pressed={String(v)===n}
                  onClick={()=>setCell(r,String(v)===n?'':n)}>{n}</button>))}
              </div>}
              {r.kind==='clear'&&<div className="fmsl-seg clr" role="group" aria-label={`${nm} ${r.side?sideLbl(r):''}`.trim()}>
                <button type="button" className={'neg'+(v==='neg'?' on':'')} aria-pressed={v==='neg'} title={L('Negatif — ağrı yok','Negative — no pain')}
                  onClick={()=>setCell(r,v==='neg'?'':'neg')}>−</button>
                <button type="button" className={'pos'+(v==='pos'?' on':'')} aria-pressed={v==='pos'} title={L('Pozitif — ağrı var (skor 0)','Positive — pain (score 0)')}
                  onClick={()=>setCell(r,v==='pos'?'':'pos')}>+</button>
              </div>}
              {r.kind==='ryg'&&<div className="fmsl-seg ryg" role="group" aria-label={`${nm} ${sideLbl(r)}`}>
                {['r','y','g'].map(k=>(<button type="button" key={k} className={k+(v===k?' on':'')} aria-pressed={v===k}
                  onClick={()=>setCell(r,v===k?'':k)}>{k.toUpperCase()}</button>))}
              </div>}
            </td>
            {r.fin&&<td className={'fin '+(it&&it.score!=null?tone(it.score):'')} rowSpan={r.fin.n}>{it&&it.score!=null?it.score:''}
              {it&&it.cleared==='pos'&&<div className="fmsl-flag">{L('ağrı → 0','pain → 0')}</div>}
              {it&&it.asym!=null&&it.cleared!=='pos'&&<div className="fmsl-flag am">{L('asimetri','asym.')} {it.asym}</div>}
            </td>}
            {r.cm&&FMS_PROBLEMS[r.cm.id]&&<td className="cm pk" rowSpan={r.cm.n}>
              <FmsProblemPick opts={FMS_PROBLEMS[r.cm.id]} value={(f.problems||{})[r.cm.id]} onChange={v=>setProblems(r.cm.id,v)} legacy={(f.comments||{})[r.cm.id]}/>
            </td>}
            {r.cm&&!FMS_PROBLEMS[r.cm.id]&&<td className="cm" rowSpan={r.cm.n}>
              <LiveTextarea value={(f.comments||{})[r.cm.id]||''} onChange={x=>setComment(r.cm.id,x)} rows={Math.max(1,r.cm.n)+(r.rh||0)}
                placeholder={L('Yorum…','Comment…')} aria-label={L('Yorum','Comment')}/>
            </td>}
          </tr>);
        })}
      </tbody>
      <tfoot><tr><td className="lab tot" colSpan="2">{L('Toplam Tarama Skoru','Total Screen Score')}</td>
        <td className={'tot-v '+(total!=null?(total>=17?'t3':total>=14?'t2':'t1'):'')} colSpan="3">{total!=null?total:'—'}<small> / 21</small>
          {c.n>0&&c.n<7&&<span className="fmsl-flag">{c.n}/7 {L('hareket puanlandı','movements scored')}</span>}</td></tr></tfoot>
    </table></div>
    <div className="fmsl-leg">{FMS_LEGEND().map((p,i)=><p key={i}>{p}</p>)}</div>
  </div>);
}

/* ---- Compact card pieces: a right/left table, a read-out tile, a −/+ switch ---- */
const pctTxt=p=>L('%'+p,p+'%');
function MkAsym({pct,extra}){
  if(pct==null)return null;
  const lv=asymLevel(pct);
  return(<div className={'mk-asym-pill lv-'+lv}>{L('Asimetri','Asymmetry')} {pctTxt(pct)}{extra?' · '+extra:''}</div>);
}
function MkStat({k,v,u,tone}){
  return(<div className={'mk-stat'+(tone?' '+tone:'')}><div className="k">{k}</div><div className="v">{v==null||v===''?'—':v}{u&&v!=null&&v!==''?<span className="u">{u}</span>:null}</div></div>);
}
/* Rows of right / left entries with the gap between them. A row with `ro` shows numbers
   worked out from the others instead of taking input. */
function MkLR({rows,unit,step,diffHead}){
  return(<div className="mk-lr">
    <div className="mk-lr-h"><span/><span>{L('Sağ','Right')}</span><span>{L('Sol','Left')}</span><span>{diffHead||L('Fark','Gap')}</span></div>
    {rows.map(r=>(<div key={r.k} className={'mk-lr-r'+(r.ro?' ro':'')}>
      <span className="mk-lr-l">{r.label}</span>
      {r.ro?<span className="mk-lr-v">{r.r==null?'—':r.r}</span>:<MkInput value={r.r} onChange={r.setR} unit={unit} step={step} sm/>}
      {r.ro?<span className="mk-lr-v">{r.l==null?'—':r.l}</span>:<MkInput value={r.l} onChange={r.setL} unit={unit} step={step} sm/>}
      <span className={'mk-lr-d'+(r.cls?' '+r.cls:'')}>{r.diff==null?'—':r.diff}</span>
    </div>))}
  </div>);
}
function MkPM({value,onChange,auto,label}){
  const cur=value||'';
  return(<div className="fmsl-seg clr mk-pm" role="group" aria-label={label}>
    <button type="button" className={'neg'+(cur==='neg'?' on':(!cur&&auto==='neg'?' auto':''))} aria-pressed={cur==='neg'} onClick={()=>onChange(cur==='neg'?'':'neg')} title={L('Negatif','Negative')}>−</button>
    <button type="button" className={'pos'+(cur==='pos'?' on':(!cur&&auto==='pos'?' auto':''))} aria-pressed={cur==='pos'} onClick={()=>onChange(cur==='pos'?'':'pos')} title={L('Pozitif','Positive')}>+</button>
  </div>);
}

/* ---- One FMS movement as its own card. It edits that movement's lines of the shared `fms`
   record — the score, its clearing / mobility lines, the comment or findings — and shows the
   final score and the running total of the whole screen. ---- */
function FmsPartCard({item,test,ath,onUpdate}){
  const f=test.fms||{};
  const c=fmsCalc(f);
  const it=c.items.find(i=>i.id===item.id)||{};
  const hd=fmsHeader(test,ath);
  const rows=fmsRowsOf(item.id);
  const setTop=(k,v)=>onUpdate(t=>({fms:{...(t.fms||{}),[k]:v}}));
  const setCell=(r,v)=>onUpdate(t=>{
    const o=t.fms||{};
    if(!r.side)return{fms:{...o,[r.f]:v}};
    const cur=o[r.f];
    const base=typeof cur==='string'&&cur?{right:cur,left:cur}:(cur&&typeof cur==='object'?cur:{});
    return{fms:{...o,[r.f]:{...base,[r.side]:v}}};
  });
  const setComment=(id,v)=>onUpdate(t=>({fms:{...(t.fms||{}),comments:{...((t.fms||{}).comments||{}),[id]:v}}}));
  const setProblems=(id,v)=>onUpdate(t=>({fms:{...(t.fms||{}),problems:{...((t.fms||{}).problems||{}),[id]:v}}}));
  /* Front and side photos of the movement, kept per movement in `fms.photos`; the report prints them. */
  const ph=(f.photos||{})[item.id]||{};
  const setPhoto=(k,v)=>onUpdate(t=>{const o=t.fms||{},all=o.photos||{};return{fms:{...o,photos:{...all,[item.id]:{...(all[item.id]||{}),[k]:v}}}};});
  const tone=v=>v==null||v===''?'':'t'+Math.max(1,Math.min(3,Number(v)));
  let lab='';
  const lines=rows.map(r=>{if(r.lab)lab=r.lab[1];return{r,lab:r.kind==='score'?L('Ham skor','Raw score'):lab};});
  const cms=fmsCommentsOf(item.id);
  const meas=item.id==='hurdleStep'||item.id==='inlineLunge'?['tibia',L('Tibia boyu','Tibia height'),hd.tibia]:item.id==='shoulderMobility'?['hand',L('El uzunluğu','Hand length'),hd.hand]:null;
  return(<div className="tcard tcard-fms">
    <div className="tcard-hd">
      <img className="tcard-fmslogo" src="fms-logo-square.png" alt="FMS"/>
      <div className="tcard-title">{item.en}</div>
      <div className="tcard-tag">FMS</div>
    </div>
    <div className="tcard-col">
      <div className="fmsc">
        <div className="fmsc-rows">
          {lines.map(({r,lab},i)=>{const v=fmsCell(f,r);const sd=r.side?(r.side==='right'?'R':'L'):'';
            return(<div key={i} className={'fmsc-row'+(r.sub?' sub':'')}>
              <span className="fmsc-l">{lab}</span><span className="fmsc-sd">{sd}</span>
              {r.kind==='score'&&<div className="fmsl-seg" role="group" aria-label={`${item.en} ${sd}`}>
                {['0','1','2','3'].map(n=>(<button type="button" key={n} className={'s'+n+(String(v)===n?' on':'')} aria-pressed={String(v)===n}
                  onClick={()=>setCell(r,String(v)===n?'':n)}>{n}</button>))}</div>}
              {r.kind==='clear'&&<div className="fmsl-seg clr" role="group" aria-label={`${lab} ${sd}`}>
                <button type="button" className={'neg'+(v==='neg'?' on':'')} aria-pressed={v==='neg'} title={L('Negatif — ağrı yok','Negative — no pain')} onClick={()=>setCell(r,v==='neg'?'':'neg')}>−</button>
                <button type="button" className={'pos'+(v==='pos'?' on':'')} aria-pressed={v==='pos'} title={L('Pozitif — ağrı var (skor 0)','Positive — pain (score 0)')} onClick={()=>setCell(r,v==='pos'?'':'pos')}>+</button></div>}
              {r.kind==='ryg'&&<div className="fmsl-seg ryg" role="group" aria-label={`${lab} ${sd}`}>
                {['r','y','g'].map(k=>(<button type="button" key={k} className={k+(v===k?' on':'')} aria-pressed={v===k} onClick={()=>setCell(r,v===k?'':k)}>{k.toUpperCase()}</button>))}</div>}
            </div>);})}
        </div>
        <div className={'fmsc-fin '+tone(it.score)}>
          <div className="k">{L('Nihai','Final')}</div>
          <div className="v">{it.score!=null?it.score:'—'}<small>/3</small></div>
          {it.cleared==='pos'&&<div className="fmsc-flag">{L('ağrı → 0','pain → 0')}</div>}
          {it.asym!=null&&it.cleared!=='pos'&&<div className="fmsc-flag am">{L('asimetri','asym.')} {it.asym}</div>}
        </div>
      </div>
      {meas&&<div className="fmsc-meas"><span>{meas[1]}</span>
        <div className="mk-input sm"><LiveInput type="number" step="0.1" inputMode="decimal" value={meas[2]} onChange={v=>setTop(meas[0],v)}/><span className="mk-unit">cm</span></div></div>}
      {cms.map(id=>FMS_PROBLEMS[id]
        ?<div key={id} className="fmsc-cm"><div className="mk-flbl">{L('Tespit edilen problemler','Identified problems')}</div>
            <FmsProblemPick opts={FMS_PROBLEMS[id]} value={(f.problems||{})[id]} onChange={v=>setProblems(id,v)} legacy={(f.comments||{})[id]}/></div>
        :<div key={id} className="tc-obs fmsc-cm"><div className="tc-obs-l">{id==='ankle'?L('Ayak bileği yorumu','Ankle comment'):L('Yorum','Comment')}</div>
            <LiveTextarea value={(f.comments||{})[id]||''} onChange={x=>setComment(id,x)} rows={2} placeholder={L('Kompanzasyon, ağrı, kalite notu…','Compensation, pain, quality note…')}/></div>)}
      <div className="fmsc-ph"><div className="mk-flbl">{L('Fotoğraflar','Photos')}</div>
        <div className="mk-uploads sm">
          <MkUpload photo={ph.front} onChange={v=>setPhoto('front',v)} label={L('Önden','Front')}/>
          <MkUpload photo={ph.side} onChange={v=>setPhoto('side',v)} label={L('Yandan','Side')}/>
        </div></div>
      <div className="fmsc-tot">{L('FMS toplamı','FMS total')} <b>{c.total!=null?c.total:'—'}</b> / 21<span>{c.n}/7 {L('hareket','movements')}</span></div>
    </div>
  </div>);
}

/* ---- 20 m sprint: the timing gates in a row, the speed of each stretch under its gate, then
   the F-V profile and the step / foot photos side by side. ---- */
function SprintCard({hd,test,onUpdate,ath,obsVal,setObs}){
  const sp=test.sprintSplits||{};
  const gates=[{k:'t5',d:5,v:sp.t5},{k:'t10',d:10,v:sp.t10},{k:'time',d:20,v:test.sprint20m&&test.sprint20m.time,main:true},{k:'t30',d:30,v:sp.t30}];
  const set=(g,v)=>onUpdate(t=>g.main?{sprint20m:{...(t.sprint20m||{}),time:v}}:{sprintSplits:{...(t.sprintSplits||{}),[g.k]:v}});
  let prev={d:0,t:0};
  const seg=gates.map(g=>{const t=tN(g.v);if(!(t>0))return null;
    const out=t>prev.t?{from:prev.d,v:+((g.d-prev.d)/(t-prev.t)).toFixed(2)}:{bad:true};prev={d:g.d,t};return out;});
  const s20=test.sprint20m||{};
  const P=(k,lbl)=><MkUpload photo={s20[k]} onChange={v=>onUpdate(t=>({sprint20m:{...(t.sprint20m||{}),[k]:v}}))} label={lbl}/>;
  return(<div className="tcard tcard-wide tcard-sprint">
    {hd}
    <div className="tcard-body-wide">
      <div className="spr-track">
        {gates.map((g,i)=>(<div key={g.k} className={'spr-gate'+(g.main?' main':'')}>
          <div className="spr-gate-d"><b>{g.d} m</b>{g.main?<span>{L('ana süre','main time')}</span>:<span>{L('ara zaman','split')}</span>}</div>
          <MkInput value={g.v} onChange={v=>set(g,v)} unit="s" step="0.01"/>
          <div className={'spr-gate-v'+(seg[i]&&seg[i].bad?' bad':'')}>{seg[i]?(seg[i].bad?L('önceki kapıdan kısa olamaz','cannot be under the previous gate'):`${seg[i].from}–${g.d} m · ${seg[i].v} m/s`):'—'}</div>
        </div>))}
      </div>
      <div className="spr-body">
        <FvSprintResult test={test} ath={ath}/>
        <div className="spr-photos">
          <div className="mk-flbl">{L('Adım / ayak fotoğrafları','Step / foot photos')}</div>
          <div className="mk-uploads sm">
            {P('sideStep1',L('Adım 1','Step 1'))}{P('sideStep2',L('Adım 2','Step 2'))}{P('sideStep3',L('Adım 3','Step 3'))}
            {P('frontRightFoot',L('Sağ ayak','R foot'))}{P('frontLeftFoot',L('Sol ayak','L foot'))}
          </div>
        </div>
      </div>
      <MkObs value={obsVal} onChange={setObs} placeholder={L('Sprint mekaniği, çıkış, reaksiyon notları…','Sprint mechanics, start, reaction notes…')}/>
    </div>
  </div>);
}

function TestCard({id,index,test,onUpdate,custom,athletes,athId}){
  const u=(k,v)=>onUpdate({[k]:v});
  // Merged into the test as it is when the value lands: photos arrive after their upload,
  // and merging into the closed-over `test` dropped the slots filled in the meantime.
  const uN=(key,sub,val)=>onUpdate(t=>({[key]:{...(t[key]||{}),[sub]:val}}));
  const cat=TEST_CATALOG.find(c=>c.id===id);
  const name=custom?custom.name:(MK_TITLE[id]||(cat?cat.name:id));
  const tag=custom?'':(MK_SHORT[id]||'');
  const obsVal=id==='posture'?(test.posture?.observations||''):id==='ohs'?(test.ohs?.observations||''):id==='fms'?(test.fms?.observations||''):((test.obs||{})[id]||'');
  const setObs=id==='posture'?(v=>uN('posture','observations',v)):id==='ohs'?(v=>uN('ohs','observations',v)):id==='fms'?(v=>uN('fms','observations',v)):(v=>onUpdate({obs:{...(test.obs||{}),[id]:v}}));
  const badgeColor=BADGE_COLS[(index-1)%BADGE_COLS.length];

  const Hd=()=>(<div className="tcard-hd">
    <div className="tcard-badge">{String(index).padStart(2,'0')}</div>
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
    const setF=(k,v)=>onUpdate(t=>({fms:{...(t.fms||{}),[k]:v}}));
    const athObj=(athletes||[]).find(a=>a.id===athId)||{id:athId};
    return(<div className="tcard tcard-wide" style={{'--card-accent':badgeColor}}>
      <div className="tcard-hd">
        <div className="tcard-badge">{String(index).padStart(2,'0')}</div>
        <div className="tcard-title">{name}</div>
        <button type="button" className="btn xs sec fmsl-print" onClick={()=>{try{printFmsSheet(test,athObj,{note:test.notes});}catch(e){alert(L('Çıktı hatası: ','Print error: ')+e.message);}}}
          title={L('Puan kâğıdı tek A4 sayfada çıkar','The score sheet prints on one A4 page')}>{L('Kâğıdı yazdır','Print sheet')}</button>
        <img className="fms-hd-logo" src="fms-logo.png" alt="FMS"/>
      </div>
      <div className="tcard-body-wide">
        <FmsSheetCard test={test} ath={athObj} onUpdate={onUpdate}/>
        {f.pdf&&<div>
          <div className="fmsl-old">{L('Bu kayıtta, canlı kâğıttan önce yüklenmiş bir FMS PDF’i var. Raporda yine basılır.','This record carries an FMS PDF uploaded before the live sheet existed. It still prints in the report.')}</div>
          <FmsPdfPanel pdf={f.pdf} onChange={v=>setF('pdf',v)}/>
        </div>}
        <MkObs value={obsVal} onChange={setObs} className="tc-obs-fms" autoGrow label={L('Genel gözlemler','Overall observations')} placeholder={L('Kompanzasyonlar, ağrı, hareket kalitesi notları…','Compensations, pain, movement-quality notes…')}/>
      </div>
    </div>);
  }

  if(fmsPartItem(id)){
    const athObj=(athletes||[]).find(a=>a.id===athId)||{id:athId};
    return<FmsPartCard item={fmsPartItem(id)} test={test} ath={athObj} onUpdate={onUpdate}/>;
  }

  const athObj=(athletes||[]).find(a=>a.id===athId)||null;
  const bw=fvBodyMass(test,athObj);
  const card=(body,cls)=>(<div className={'tcard'+(cls?' '+cls:'')} style={{'--card-accent':badgeColor}}><Hd/><div className="tcard-col">{body}</div></div>);
  const obs=ph=><MkObs value={obsVal} onChange={setObs} placeholder={ph}/>;

  if(id==='accel'){
    const a=accelCalc(test);
    const set=(k,v)=>onUpdate(t=>({sprintSplits:{...(t.sprintSplits||{}),[k]:v}}));
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">0–5 m</div><MkInput value={test.sprintSplits?.t5} onChange={v=>set('t5',v)} unit="s" step="0.01"/></div>
        <div className="mk-field"><div className="mk-flbl">0–10 m</div><MkInput value={test.sprintSplits?.t10} onChange={v=>set('t10',v)} unit="s" step="0.01"/></div>
      </div>
      {a.t5!=null&&a.t10!=null&&a.split==null&&<div className="help" style={{color:'var(--high-t)'}}>{L('10 m süresi 5 m süresinden uzun olmalı.','The 10 m time must be longer than the 5 m time.')}</div>}
      <div className="mk-stats">
        <MkStat k={L('5–10 m ara','5–10 m split')} v={a.split} u="s"/>
        <MkStat k={L('0–5 m hız','0–5 m speed')} v={a.v5} u="m/s"/>
        <MkStat k={L('5–10 m hız','5–10 m speed')} v={a.v510} u="m/s"/>
      </div>
      {obs(L('Çıkış, ilk adımlar, gövde açısı…','Start, first steps, trunk angle…'))}
    </>);
  }

  if(id==='fiveZeroFive'){
    const c=cod505Calc(test);
    const set=(s,v)=>onUpdate(t=>{const o={...(t.cod505||{}),[s]:v};const b=cod505Calc({cod505:o}).best;return{cod505:o,fiveZeroFive:b!=null?String(b):''};});
    const legacy=c.r==null&&c.l==null&&c.best!=null;
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">{L('Sağ ayak dönüş','Right-foot turn')}</div><MkInput value={test.cod505?.right} onChange={v=>set('right',v)} unit="s" step="0.01"/></div>
        <div className="mk-field"><div className="mk-flbl">{L('Sol ayak dönüş','Left-foot turn')}</div><MkInput value={test.cod505?.left} onChange={v=>set('left',v)} unit="s" step="0.01"/></div>
      </div>
      {legacy&&<div className="help">{L(`Önceki kayıt: ${c.best} s (taraf girilmemiş).`,`Earlier record: ${c.best} s (no side given).`)}</div>}
      <div className="mk-stats">
        <MkStat k={L('En iyi','Best')} v={c.best} u="s"/>
        <MkStat k={L('Asimetri','Asymmetry')} v={c.pct!=null?pctTxt(c.pct):null} tone={asymLevel(c.pct)}/>
        <MkStat k={L('Yavaş taraf','Slower side')} v={c.slow?(c.slow==='right'?L('Sağ','Right'):L('Sol','Left')):null}/>
      </div>
      {obs(L('Dönüş tekniği, yavaşlama, taraf tercihi…','Turn technique, deceleration, side preference…'))}
    </>);
  }

  if(id==='hipRot'){
    const h=hipRotCalc(test);
    const set=k=>v=>uN('hipRot',k,v);
    return card(<>
      <MkLR unit="°" step="1" rows={[
        {k:'ir',label:L('İç rotasyon','Internal rot.'),r:test.hipRot?.irR,l:test.hipRot?.irL,setR:set('irR'),setL:set('irL'),diff:h.dIr!=null?h.dIr+'°':null},
        {k:'er',label:L('Dış rotasyon','External rot.'),r:test.hipRot?.erR,l:test.hipRot?.erL,setR:set('erR'),setL:set('erL'),diff:h.dEr!=null?h.dEr+'°':null},
        {k:'tot',ro:true,label:L('Toplam ark','Total arc'),r:h.totR!=null?h.totR+'°':null,l:h.totL!=null?h.totL+'°':null,diff:h.dTot!=null?h.dTot+'°':null,cls:asymLevel(h.pTot)},
      ]}/>
      <MkAsym pct={h.pTot} extra={L('toplam ark','total arc')}/>
      {obs(L('Oturarak, kalça-diz 90°; kompanzasyon, uç his…','Seated, hip and knee at 90°; compensation, end feel…'))}
    </>);
  }

  if(id==='thomas'){
    const th=thomasCalc(test);
    const setS=(s,k,v)=>onUpdate(t=>({thomas:{...(t.thomas||{}),[s]:{...((t.thomas||{})[s]||{}),[k]:v}}}));
    const raw=s=>(test.thomas||{})[s]||{};
    return card(<>
      <div className="mk-pair th-sides">
        {[['right',L('Sağ','Right')],['left',L('Sol','Left')]].map(([s,lbl])=>(<div key={s} className="th-side">
          <div className="th-side-h">{lbl}</div>
          <div className="mk-pair">
            <div className="mk-field"><div className="mk-flbl">{L('Uyluk açısı','Thigh angle')}</div><MkInput value={raw(s).hip} onChange={v=>setS(s,'hip',v)} unit="°" step="1" sm/></div>
            <div className="mk-field"><div className="mk-flbl">{L('Diz fleksiyonu','Knee flexion')}</div><MkInput value={raw(s).knee} onChange={v=>setS(s,'knee',v)} unit="°" step="1" sm/></div>
          </div>
          {THOMAS_FIND.map(([k,nm,hint])=>(<div key={k} className="th-find">
            <div className="th-find-t"><b>{nm}</b><span>{L(hint[0],hint[1])}</span></div>
            <MkPM value={raw(s)[k]} auto={th[s].res[k]} onChange={v=>setS(s,k,v)} label={nm}/>
          </div>))}
        </div>))}
      </div>
      <div className="help">{L('Uyluk açısı yataya göre ölçülür (yatayın üstü +). Açı girildiğinde iliopsoas (açı > 0°) ve rectus femoris (diz < 80°) sonucu kendiliğinden gelir; düğmeyle değiştirilebilir.','The thigh angle is taken against the horizontal (above it is +). With angles entered, the iliopsoas (angle > 0°) and rectus femoris (knee < 80°) calls fill themselves in; the switch overrides them.')}</div>
      {obs(L('Lomber kontrol, kompanzasyon…','Lumbar control, compensation…'))}
    </>,'tcard-w2');
  }

  if(id==='tSpine'){
    const x=tSpineCalc(test);
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">{L('Sağa rotasyon','Rotation right')}</div><MkInput value={test.tSpine?.right} onChange={v=>uN('tSpine','right',v)} unit="°" step="1"/></div>
        <div className="mk-field"><div className="mk-flbl">{L('Sola rotasyon','Rotation left')}</div><MkInput value={test.tSpine?.left} onChange={v=>uN('tSpine','left',v)} unit="°" step="1"/></div>
      </div>
      <MkAsym pct={x.pct} extra={x.diff!=null?x.diff+'°':''}/>
      {obs(L('Pelvis sabit mi, lomber kompanzasyon…','Pelvis fixed?, lumbar compensation…'))}
    </>);
  }

  if(STR_LIFTS.includes(id)){
    const c=strCalc(test,id,bw);
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">{L('Yük','Load')}</div><MkInput value={test[id]?.load} onChange={v=>uN(id,'load',v)} unit="kg" step="0.5"/></div>
        <div className="mk-field"><div className="mk-flbl">{L('Tekrar','Reps')}</div><MkInput value={test[id]?.reps} onChange={v=>uN(id,'reps',v)} step="1"/></div>
      </div>
      <div className="mk-stats">
        <MkStat k="e1RM" v={c.e1} u="kg"/>
        <MkStat k={L('Göreli kuvvet','Relative')} v={c.rel} u="× BW"/>
      </div>
      <div className="help">{L('Epley tahmini; tek tekrarda yükün kendisi, 12 tekrardan sonrası hesaba katılmaz.','Epley estimate; a single is the load itself, reps past 12 are not counted.')}{bw?'':' '+L('Göreli kuvvet için kilo gir (Antropometri).','Enter body mass (Anthropometry) for relative strength.')}</div>
      {obs(L('Teknik, derinlik, tempo…','Technique, depth, tempo…'))}
    </>);
  }

  if(id==='pullUp'){
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">{L('Tam tekrar','Full reps')}</div><MkInput value={test.pullUp?.reps} onChange={v=>uN('pullUp','reps',v)} step="1"/></div>
        <div className="mk-field"><div className="mk-flbl">{L('Ek yük','Added load')}</div><MkInput value={test.pullUp?.load} onChange={v=>uN('pullUp','load',v)} unit="kg" step="0.5"/></div>
      </div>
      {obs(L('Tam açılma, kipping, tutuş…','Full hang, kipping, grip…'))}
    </>);
  }

  if(id==='copenhagen'||id==='sidePlank'){
    const h=holdCalc(test,id);
    return card(<>
      <div className="mk-pair">
        <div className="mk-field"><div className="mk-flbl">{L('Sağ','Right')}</div><MkInput value={test[id]?.right} onChange={v=>uN(id,'right',v)} unit="s" step="1"/></div>
        <div className="mk-field"><div className="mk-flbl">{L('Sol','Left')}</div><MkInput value={test[id]?.left} onChange={v=>uN(id,'left',v)} unit="s" step="1"/></div>
      </div>
      <MkAsym pct={h.pct} extra={h.weak?L('zayıf: ','weaker: ')+(h.weak==='right'?L('sağ','right'):L('sol','left')):''}/>
      {obs(id==='copenhagen'?L('Kalça hizası, kasık ağrısı…','Hip alignment, groin pain…'):L('Pelvis düşmesi, omuz hizası…','Hip drop, shoulder alignment…'))}
    </>);
  }

  if(id==='ift3015'){
    const c=iftCalc(test,athObj,bw);
    return card(<>
      <div className="mk-field"><div className="mk-flbl">{L('VIFT — son tamamlanan kademe','VIFT — last stage completed')}</div>
        <MkInput value={test.ift3015?.vift} onChange={v=>uN('ift3015','vift',v)} unit="km/h" step="0.5"/></div>
      <div className="mk-stats">
        <MkStat k={L('Tahmini VO2max','Est. VO2max')} v={c.vo2} u={L('ml/kg/dk','ml/kg/min')}/>
        <MkStat k="VIFT" v={c.ms} u="m/s"/>
      </div>
      {c.vift>0&&c.missing.length>0&&<div className="help">{L('VO2max tahmini için profilde eksik: ','Missing for the VO2max estimate: ')}{c.missing.join(', ')}.</div>}
      {obs(L('Bırakma nedeni, son kademe nabız…','Reason for stopping, final-stage heart rate…'))}
    </>);
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
    const set=(k,v)=>onUpdate(t=>({yBalance:{...(t.yBalance||{}),[k]:v}}));
    const setSide=(s,k,v)=>onUpdate(t=>({yBalance:{...(t.yBalance||{}),[s]:{...((t.yBalance||{})[s]||{}),[k]:v}}}));
    const d=v=>v==null?null:v.toFixed(1)+' cm';
    const dc=v=>v==null?'':v<4?'ok':'bad';
    const row=(k,lbl,dv)=>({k,label:lbl,r:test.yBalance?.right?.[k],l:test.yBalance?.left?.[k],setR:v=>setSide('right',k,v),setL:v=>setSide('left',k,v),diff:d(dv),cls:dc(dv)});
    const cGap=yb.compR!=null&&yb.compL!=null?+Math.abs(yb.compR-yb.compL).toFixed(1):null;
    return(<div className="tcard tcard-ybt" style={{'--card-accent':badgeColor}}>
      <Hd/>
      <div className="tcard-col">
        <div className="yb-limb"><span className="mk-flbl">{L('Bacak uzunluğu (SİAS – medial malleol)','Leg length (ASIS – medial malleolus)')}</span>
          <MkInput value={test.yBalance?.limbLength} onChange={v=>set('limbLength',v)} unit="cm" sm/></div>
        <MkLR unit="cm" diffHead={L('Fark < 4','Gap < 4')} rows={[row('ant','Anterior',yb.dAnt),row('pm','Posteromedial',yb.dPm),row('pl','Posterolateral',yb.dPl)]}/>
        <div className="mk-stats">
          <MkStat k={L('Bileşik sağ','Composite R')} v={yb.compR} u="%"/>
          <MkStat k={L('Bileşik sol','Composite L')} v={yb.compL} u="%"/>
          <MkStat k={L('Fark','Gap')} v={cGap} u="%"/>
        </div>
        <div className="yb-formula">{L('Bileşik = (ANT + PM + PL) / (3 × bacak uzunluğu) × 100','Composite = (ANT + PM + PL) / (3 × leg length) × 100')}</div>
        <MkObs value={obsVal} onChange={setObs} placeholder={L('Denge stratejisi, salınım, yere temaslar…','Balance strategy, wobble, touch-downs…')}/>
      </div>
    </div>);
  }

  if(id==='sprint')return<SprintCard hd={<Hd/>} test={test} onUpdate={onUpdate} ath={(athletes||[]).find(a=>a.id===athId)} obsVal={obsVal} setObs={setObs}/>;

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
        <MkAsym pct={asymPct(r,l,'hi')} extra={r>0&&l>0?diff.toFixed(1)+' cm':''}/>
        <MkObs value={obsVal} onChange={setObs} placeholder={L('İniş kontrolü, taraf baskınlığı…','Landing control, side dominance…')}/>
      </div>
    </div>);
  }

  if(MK_SOLO_UNIT[id]){
    const step=(id==='dropJump'||id==='tTest'||id==='shuttleRun')?'0.01':'0.1';
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
  const ids=expandBattery(test.battery)||TEST_CATALOG.filter(c=>!c.retired||(TI_HAS[c.id]&&TI_HAS[c.id](test))).map(c=>c.id);
  // A record screened on the whole FMS sheet opens as that sheet, never also as its seven movements.
  const valid=ids.filter(id=>TEST_CATALOG.find(c=>c.id===id)||cTests.find(c=>c.id===id))
    .filter(id=>!(ids.includes('fms')&&FMS_PART_IDS.includes(id)));
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
        <button className="btn sm sec" onClick={()=>{try{generateTestPDF(test,ath,setup,customTests,athletes);}catch(e){alert(L('PDF hatası: ','PDF error: ')+e.message);}}}>{L('Çıktı al','Print')}</button>
        <button className="btn sm sec" onClick={()=>{try{printTestCompare(test,ath,setup,customTests,athletes);}catch(e){alert(L('Rapor hatası: ','Report error: ')+e.message);}}}
          title={L('Bu kayıttaki her ölçüm takım ortalamasına karşı (A4 dikey)','Every reading on this record set against the squad average (A4 portrait)')}>{L('Rapor','Report')}</button>
        <button className="btn sm sec" onClick={onClose}>{L('Kapat','Close')}</button>
      </div>
    </div>
    <div className="ts-wrap">
      {valid.map((id,i)=>{const cu=cTests.find(c=>c.id===id);return<TestCard key={id} id={id} index={i+1} test={test} onUpdate={onUpdate} custom={cu} athletes={athletes} athId={ath.id}/>;})}
      {valid.length===0&&<div className="empty-st">{L('Bu bataryada test yok.','No tests in this battery.')}</div>}
      <div className="tcard tcard-wide tcard-summary" style={{'--card-accent':'#0094ff'}}>
        <div className="tcard-hd">
          <div className="tcard-badge">{String(valid.length+1).padStart(2,'0')}</div>
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

