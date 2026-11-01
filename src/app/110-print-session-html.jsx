/* =========================================================
   PRINT — A4 portrait (single day) & landscape (week)
   Print and Share both render the SAME HTML so the output is identical
   regardless of which path the user takes.
   ========================================================= */
const escHTML=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/* ONE LOOK FOR EVERY PRINTED PROGRAMME. A session prints from two places — the
   calendar (buildSessionHTMLDoc) and the individualization panel (printDiProgram) —
   and an athlete handed both should not be able to tell which one each sheet came
   from. So the masthead, the session banner and the phase cards are drawn once, here,
   and both documents are built out of them. */
const RPT_HEAD_CSS=`/* The sheet's own masthead: a black strip across the top with the product mark and what
   it stands for on the left (split by a hairline), the date on the right. Set as plain
   text (not the app's logo image) so it prints crisply at any size. */
.doc-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;background:#16181b;padding:9px 14px}
.doc-top-l{display:inline-flex;align-items:center;gap:12px;min-width:0}
.doc-top .wm{display:inline-flex;align-items:center;
  font-weight:800;font-size:16px;letter-spacing:-.01em;color:#fff;flex:none}
.doc-top .wm b{color:#3aa0e6;font-weight:800}
.doc-top .wm-div{width:1px;height:16px;background:rgba(255,255,255,.35);flex:none}
.doc-top .wm-sub{font-size:10.5px;font-weight:500;color:#c3c8cf;letter-spacing:.2px;white-space:nowrap}
.doc-top-date{font-family:'Google Sans',Arial,sans-serif;font-size:12.5px;font-weight:600;color:#fff;letter-spacing:.2px;white-space:nowrap}

/* Document header: the team's crest behind a hairline, what the sheet is, whose it is and
   (under the name) their position and age; opposite, the session's numbers as columns of
   "label over value" split by hairlines. A blue rule under it, heavier at its left end. */
.doc-head{position:relative;display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:16px;padding:2px 0 12px;border-bottom:1.5px solid #1f7cc2}
.doc-head::after{content:'';position:absolute;left:0;bottom:-2.5px;width:28mm;height:4px;background:#1f7cc2}
.doc-l{display:flex;align-items:center;gap:14px;min-width:0;flex:1}
.doc-logo-w{flex:none;display:flex;align-items:center;padding-right:14px;border-right:1px solid #d5dae0;align-self:stretch}
/* Bounded rather than forced to a fixed height: a square crest caps at max-height, a wide
   wordmark at max-width, and neither ends up letterboxed inside a box the wrong shape. */
.doc-logo{height:auto;width:auto;max-height:50px;max-width:96px;object-fit:contain;flex:none}
.doc-l h1{font-size:22px;font-weight:800 !important;color:#0f172a;letter-spacing:-0.02em;line-height:1.1;text-transform:uppercase}
.doc-l .lbl{font-family:'Google Sans',Arial,sans-serif;font-size:9.5px;color:#5c626c;font-weight:600;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:4px}
.doc-info{display:flex;align-items:center;gap:8px;margin-top:4px;font-size:11px;color:#5c626c}
.doc-info i{width:1px;height:10px;background:#c5cbd3}
.doc-r{display:flex;align-items:stretch;flex:none}
.doc-kv{display:flex;flex-direction:column;justify-content:center;gap:5px;padding:2px 11px;border-left:1px solid #d5dae0}
.doc-kv:last-child{padding-right:0}
.doc-kv-k{font-family:'Google Sans',Arial,sans-serif;font-size:8px;font-weight:600;color:#5c626c;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
.doc-kv-v{font-size:17px;font-weight:800;color:#0f172a;white-space:nowrap;letter-spacing:-.01em;line-height:1.1;font-variant-numeric:tabular-nums}
.doc-kv-v small{font-size:11px;font-weight:600;color:#5c626c;margin-left:2px}

/* Session card: the black banner and the purpose line under it, then the phases, each the
   full width of the sheet. Long sessions break across pages; headings glue themselves to
   what follows (break-after:avoid) so none is orphaned at the foot of a page. */
.sess{margin-bottom:12px;background:#fff}
.sh{padding:10px 16px;background:#16181b;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px;break-after:avoid;page-break-after:avoid}
.sh-l{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
.sh-l .sn{flex:none;display:inline-flex;align-items:center;justify-content:center;background:#1f7cc2;color:#fff;width:30px;height:30px;font-size:15px;font-weight:800}
.sh-l .sh-div{flex:none;width:1px;align-self:stretch;background:rgba(255,255,255,.3)}
.sh-nm{min-width:0;font-size:19px;font-weight:800;letter-spacing:.1px;line-height:1.15}
.sh-own{display:block;font-size:10px;font-weight:600;color:#6ab8ef;letter-spacing:.6px;text-transform:uppercase;margin-bottom:1px}
.sess.brk{break-before:page;page-break-before:always}
/* Each athlete on a document of several starts a fresh page, under their own header. */
.ath-doc.brk{break-before:page;page-break-before:always}
.sh-r{display:flex;align-items:stretch;flex:none}
.sh-stat{display:flex;align-items:center;gap:8px;padding:0 14px;border-left:1px solid rgba(255,255,255,.3)}
.sh-stat:first-child{border-left:0}
.sh-stat:last-child{padding-right:0}
.sh-ic{width:17px;height:17px;flex:none;color:#fff}
.sh-stat-t{display:flex;flex-direction:column;gap:1px}
.sh-stat-v{font-size:15px;font-weight:800;letter-spacing:.2px;line-height:1.1;white-space:nowrap}
.sh-stat-k{font-family:'Google Sans',Arial,sans-serif;font-size:10px;font-weight:500;color:rgba(255,255,255,.75);white-space:nowrap}

/* Purpose line — stays with what follows. */
.meta-bar{padding:8px 16px;background:#fff;border:1px solid #dfe3e8;border-top:0;display:flex;gap:0;align-items:center;flex-wrap:wrap;break-after:avoid;page-break-after:avoid}
.meta-item{display:flex;align-items:center;gap:5px;font-size:12px;padding:0 16px;border-left:1px solid #d5dae0}
.meta-item:first-child{padding-left:0;border-left:0}
.meta-item .lbl{font-family:'Google Sans',Arial,sans-serif;color:#5c626c;font-weight:400}
.meta-item .val{color:#0f172a;font-weight:700}`;
/* A phase of the session: its name on a grey bar behind a blue rule, the kind of work it
   is (or its total time) in a small box at the far end, then its exercises in a table with
   a dark head — #, the exercise (picture + name), Set × Reps, Load, Tempo, RPE, Rest and
   the coaching note. The head repeats on every page a long phase breaks onto; a row never
   splits. Both the phase bar and the table run the full width of the sheet. */
const RPT_PHASE_CSS=`.pc-card{margin-bottom:12px}
.pc-hd{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f2f4f6;border:1px solid #e3e7eb;margin-bottom:8px;break-after:avoid;page-break-after:avoid}
.pc-dot{flex:none;width:3px;height:20px;background:#1f7cc2}
.pc-t{font-size:15px;font-weight:800;letter-spacing:-.005em;color:#0a0b0d}
.pc-tag{margin-left:auto;flex:none;font-size:10.5px;color:#3b4252;background:#fff;border:1px solid #d5dae0;padding:3px 10px;white-space:nowrap}
.pc-tag b{color:#0a0b0d}
.pc-tbl{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #dfe3e8}
.pc-tbl thead{display:table-header-group}
/* White column names on the dark head: the shared print layer (KX_PRINT) paints every
   thead light blue with !important, so this table's head answers in kind. */
.pc-tbl thead th{background:#1e2124 !important;color:#fff !important;border-color:#1e2124 !important;font-size:10px;font-weight:600;letter-spacing:.02em;padding:7px 6px;text-align:center}
.pc-tbl td{padding:6px;text-align:center;vertical-align:middle;border-top:1px solid #e3e7eb;font-size:10.5px;color:#3b4252;background:#fff}
.pc-tbl tbody tr:first-child td{border-top:0}
.pc-tbl tr{break-inside:avoid;page-break-inside:avoid}
.pc-tbl th.n,.pc-tbl td.n{width:5%;color:#0a0b0d;font-weight:800;font-size:12px}
.pc-tbl th.ex,.pc-tbl td.ex{width:38%;text-align:left}
.pc-tbl th.ds,.pc-tbl td.ds{width:11%}
.pc-tbl th:nth-child(4),.pc-tbl th:nth-child(5){width:7%}
.pc-tbl th:nth-child(6){width:5%}
.pc-tbl th:nth-child(7){width:8%}
.pc-tbl th.nt,.pc-tbl td.nt{text-align:left}
.pc-tbl td.nt{font-size:10px;color:#3b4252;line-height:1.4}
.pc-nm{font-size:12px;font-weight:700;color:#0a0b0d}
.pc-why{font-size:10px;color:#3b4252;line-height:1.4}
.pc-why+.pc-why{margin-top:2px}
.pc-tbl td.ds b{font-size:12px;color:#0a0b0d;white-space:nowrap}
.pc-tbl td.ds s{color:#8b9099}
.pc-dd{font-size:9.5px;color:#5c626c;margin-top:2px}`;
/* The # column's badges (a superset's A1 in green, a plain number in grey) and the amber
   alternative row bound under its exercise — shared by the calendar's printout and the
   athlete programme's (printDiProgram), so a superset reads the same on both sheets. */
const RPT_BADGE_CSS=`/* Superset rows get the green badge; a plain sequence number otherwise gets the same
   pill shape in neutral grey, so the column reads as one system either way. */
.ex-badge{display:inline-block;min-width:24px;padding:2px 6px;border-radius:2px;text-align:center;
  font-family:'Google Sans',Arial,sans-serif;font-size:11px;font-weight:700;color:#94a3b8;background:#f1f5f9}
.ex-badge.ss{background:rgba(31,124,194,.16);color:#165f96;border:1px solid rgba(31,124,194,.5)}
/* The alternative rides directly under the exercise it replaces, tinted amber and bound
   to it, so the pair reads as one prescription with two ways of being done rather than
   as two exercises in a row. The binding is the whole point: the row above gives up its
   bottom rule and refuses to break away from this one, the number column repeats that
   row's own badge behind a hook, and the cell opens by naming what is being replaced. */
.pc-tbl tr.alt-row td{border-top:0;padding-top:4px;background:rgba(245,158,11,.055)}
/* No rule between an exercise and its alternative, and no page break either. */
.pc-tbl tr.has-alt td{padding-bottom:3px;background:rgba(245,158,11,.055);break-after:avoid;page-break-after:avoid}
/* The hook and the parent's own badge, greyed back: read down the # column and the
   alternative points straight at the row it belongs to. */
.alt-of{display:inline-flex;align-items:center;gap:2px;justify-content:center}
.alt-hook{font-size:12px;font-weight:700;color:#b45309;line-height:1}
.ex-badge.ghost{min-width:0;padding:1px 4px;font-size:9.5px;color:#b45309;background:rgba(245,158,11,.14);
  border:1px solid rgba(245,158,11,.4)}
/* The alternative's text hangs off an amber rule, indented from the exercise above it —
   the shape of a sub-entry, read before a single word of it is. */
.alt-row .ex-ex-txt{padding-left:8px;border-left:2px solid rgba(245,158,11,.6)}
/* Just the word: which exercise this replaces is already said by the badge in the number
   column and by the rule the whole block hangs off, and spelling the name out a third
   time cost two lines of paper per alternative. */
.alt-for{font-family:'Google Sans',Arial,sans-serif;font-size:8px;font-weight:700;letter-spacing:.09em;
  color:#b45309;line-height:1.35;margin-bottom:1px}
.alt-name{font-weight:700;font-size:13px;color:#78350f;line-height:1.25}
.alt-why{margin-top:3px;font-size:11px;font-weight:400;color:#78350f;line-height:1.5}
.alt-why-k{font-family:'Google Sans',Arial,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:#b45309;margin-right:6px}`;
/* The masthead: the product line with the date, then the team's crest, what the sheet is,
   whose it is (with `info` — position, age — under the name) and, opposite, the session's
   numbers (rptHeadStats). `titleHTML` and `statsHTML` go in as markup, `info` as text. */
function rptDocHead(titleHTML,sub,statsHTML,logo,info){
  const inf=(info||[]).map(x=>String(x==null?'':x).trim()).filter(Boolean);
  return`<div class="doc-top"><span class="doc-top-l"><span class="wm">COACH<b>OS</b></span><span class="wm-div"></span><span class="wm-sub">Coaching Operating System</span></span><span class="doc-top-date">${escHTML(String(sub==null?'':sub).replace(/,/g,' ·'))}</span></div>
<div class="doc-head">
  <div class="doc-l">
    ${logo?`<span class="doc-logo-w"><img class="doc-logo" src="${escHTML(mediaSrc(logo))}" alt=""></span>`:''}
    <div>
      <div class="lbl">${L('Antrenman Programı','Training Program')}</div>
      <h1>${titleHTML}</h1>
      ${inf.length?`<div class="doc-info">${inf.map(escHTML).join('<i></i>')}</div>`:''}
    </div>
  </div>
  ${statsHTML||''}
</div>`;
}
/* An athlete's line under their name on the masthead: position and age, where known. */
function rptAthInfo(a){
  if(!a)return[];
  const out=[];
  const pos=a.position?(posOf(a.position)||a.position):'';
  if(pos)out.push(pos);
  if(a.dateOfBirth){const b=parseD(a.dateOfBirth);
    if(b&&!isNaN(b)){const t=new Date();let y=t.getFullYear()-b.getFullYear();
      if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))y--;
      if(y>0&&y<100)out.push(`${L('Yaş','Age')}: ${y}`);}}
  return out;
}
/* The session's numbers for the masthead, a column each: total sets, total reps, the
   estimated tonnage and the target RPE range. `vol` from rptVolStats, `rlo`/`rhi` the
   RPE range. A number the session does not have prints as a dash. */
function rptHeadStats(vol,rlo,rhi){
  const nf=v=>Number(v||0).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-US');
  const kv=(k,v)=>`<div class="doc-kv"><span class="doc-kv-k">${k}</span><span class="doc-kv-v">${v}</span></div>`;
  return`<div class="doc-r">
    ${kv(L('Toplam Hacim','Total Volume'),vol.sets?`${vol.sets} ${L('set','sets')}`:'—')}
    ${kv(L('Toplam Tekrar','Total Reps'),vol.reps?nf(vol.reps):'—')}
    ${kv(L('Tahmini Yük','Est. Load'),vol.hasLoad?`~${nf(vol.tonnage)} kg`:'—')}
    ${kv(L('Hedef RPE','Target RPE'),`${rlo===rhi?rlo:`${rlo} – ${rhi}`}<small>/10</small>`)}
  </div>`;
}
/* The session's black banner — its number in a blue square, its name, when it starts and
   how long it runs — and the purpose line under it. `nameHTML` / `ownerHTML` go in as
   markup. */
const RPT_CLOCK_SVG=`<svg class="sh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/></svg>`;
function rptSessBanner({no,nameHTML,ownerHTML,time,duration,purpose,meta}){
  return`<div class="sh">
    <div class="sh-l"><span class="sn">${no}</span><span class="sh-div"></span><div class="sh-nm">${ownerHTML?`<span class="sh-own">${ownerHTML}</span>`:''}${nameHTML}</div></div>
    <div class="sh-r">
      <div class="sh-stat">${RPT_CLOCK_SVG}<span class="sh-stat-t"><span class="sh-stat-v">${escHTML(time||'—')}</span><span class="sh-stat-k">${L('Başlangıç','Start')}</span></span></div>
      <div class="sh-stat"><span class="sh-stat-t"><span class="sh-stat-v">${Number(duration)||0} ${L('dk','min')}</span><span class="sh-stat-k">${L('Toplam Süre','Total Time')}</span></span></div>
    </div>
  </div>
  <div class="meta-bar">
    <div class="meta-item"><span class="lbl">${L('Amaç','Purpose')}:</span><span class="val">${escHTML(purpose||'—')}</span></div>
    ${(meta||[]).filter(m=>m&&m.val).map(m=>`<div class="meta-item"><span class="lbl">${escHTML(m.lbl)}:</span><span class="val">${escHTML(m.val)}</span></div>`).join('')}
  </div>`;
}
/* An exercise's movement pattern as a label ("Diz Dominant" for a Trap Bar Squat). The
   row's own pattern wins; a row that was never tagged is read off its name
   (exResolveTags), and one nothing can place has none. */
const RPT_PAT_TR={'Hip Dominant':'Kalça Dominant','Knee Dominant':'Diz Dominant'};
function rptPatLbl(name,pattern){
  const p=exResolveTags(name,pattern,'').pattern;
  if(!p)return'';
  return REPORT_LANG==='tr'?(RPT_PAT_TR[p]||exLabel(p)):p;
}
/* The "Note" column: the coaching text the coach wrote on the row, a line per line; a row
   with none carries its movement pattern instead, so the column still says what the
   exercise is for. Plain text in, markup out. */
function rptNoteCell(lines,name,pattern){
  const ls=(lines||[]).map(x=>String(x==null?'':x).trim()).filter(Boolean);
  if(ls.length)return ls.map(n=>`<div class="pc-why">${escHTML(n)}</div>`).join('');
  const p=name?rptPatLbl(name,pattern):'';
  return p?escHTML(p):`<span class="dash">—</span>`;
}
/* One phase card around rows already drawn as <tr>s. Title and tag are plain text; a
   card with neither prints its table alone. */
function rptPhaseCard(title,tag,rowsHTML){
  const t=String(title||'').trim(),g=String(tag||'').trim();
  return`<div class="pc-card">${t||g?`<div class="pc-hd"><span class="pc-dot"></span><span class="pc-t">${escHTML(t)}</span>${g?`<span class="pc-tag">${escHTML(g)}</span>`:''}</div>`:''}
    <table class="pc-tbl"><thead><tr><th class="n">#</th><th class="ex">${L('Egzersiz','Exercise')}</th><th class="ds">${L('Set × Tekrar','Sets × Reps')}</th>
      <th>${L('Yük','Load')}</th><th>${L('Tempo','Tempo')}</th><th>RPE</th><th>${L('Dinlenme','Rest')}</th><th class="nt">${L('Not','Note')}</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>`;
}
/* Best-effort volume summary for the printed program's "Training Volume" line — total
   sets and reps are exact sums of what the coach typed; total load is a tonnage estimate
   (sets × reps × the first number found in the load field) since load is free text
   ("20-24 kg", "Bodyweight") rather than a guaranteed number. Shown with a leading "~" for
   exactly that reason. */
function rptVolStats(list){
  let sets=0,reps=0,tonnage=0,hasLoad=false;
  (list||[]).forEach(e=>{
    if(!e||!e.name)return;
    const st=Number(e.sets)||0,rp=Number(e.reps)||0;
    sets+=st;reps+=rp;
    const lm=String(e.load||'').match(/[\d.]+/);
    if(lm){hasLoad=true;tonnage+=parseFloat(lm[0])*(st||1)*(rp||1);}
  });
  return{sets,reps,tonnage:Math.round(tonnage),hasLoad};
}
/* An exercise's picture for "Print with Image": the one put on the row, else the library's
   card for that name — a programme written from the table carries no picture of its own. */
const rptExImage=ex=>{if(!ex)return'';const hit=String(ex.name||'').trim()?exLibHit(ex.name):null;
  return ex.image||(hit&&hit.image)||'';};
function buildSessionHTMLDoc(title,subtitle,sessions,opts){
  const withImages=!!(opts&&opts.withImages);
  /* Coach copy: prints the justification recorded against every changed exercise.
     The athlete copy leaves them out entirely — same document, two audiences. */
  const withReasons=!!(opts&&opts.withReasons);
  // Active team's logo, unless the caller passes its own (opts.logo:'' prints unbranded).
  const logo=(opts&&opts.logo!==undefined)?opts.logo:teamLogo();
  const dash=`<span class="dash">—</span>`;
  const computeLabels=exs=>{const cnt={};return exs.map(ex=>{
    const ss=(ex.superset||'').toString().toUpperCase().trim();
    if(ss){cnt[ss]=(cnt[ss]||0)+1;return{tag:`${ss}${cnt[ss]}`,letter:ss};}
    cnt._=(cnt._||0)+1;return{tag:`${cnt._}.`,letter:''};});};
  /* Exercises print as phase cards (rptPhaseCard) — one card per section of the block,
     in the running order, the section's name on its bar and what it is for as its tag.
     A block with no sections is one card under the block's own name (left off when it
     only repeats the session's title). Each row: # (plain or a superset badge) ·
     exercise (image + name + link) · Set × Reps (with the time under it) · Load · Tempo ·
     RPE · Rest · Note (the coaching text, or the movement pattern when there is none). */
  const exTable=(b,showName)=>{
    const namedExs=(b.exercises||[]).filter(e=>e.name);
    if(namedExs.length===0)return`<div class="empty-block">${L('Egzersiz yok','No exercises')}</div>`;
    const labs=computeLabels(b.exercises||[]);
    const bPh=blkPhases(b);
    const dose=(sets,reps,dur)=>{
      let sr='';
      if(sets&&reps)sr=`${sets} × ${reps}`;
      else if(sets)sr=`${sets} ${L('set','sets')}`;
      else if(reps)sr=String(reps);
      if(!sr&&!dur)return dash;
      return sr?`<b>${escHTML(sr)}</b>${dur?`<div class="pc-dd">${escHTML(dur)}</div>`:''}`:`<b>${escHTML(dur)}</b>`;
    };
    const cards=[];
    let cur=null;
    (b.exercises||[]).forEach((e,i)=>{
      if(!e.name)return;
      const lab=labs[i];const isSS=!!lab.letter;
      const ph=bPh.length?(bPh.includes(exPhase(e))?exPhase(e):''):null;
      if(!cur||cur.ph!==ph){
        cur=ph===null
          ?{ph,title:showName?b.name:'',tag:'',rows:[]}
          :{ph,title:ph?blkPhaseLbl(ph,b):L('Fazsız','Unplaced'),tag:ph?blkPhaseNote(ph,b):'',rows:[]};
        cards.push(cur);
      }
      const num=isSS?`<span class="ex-badge ss">${lab.tag}</span>`:String(lab.tag).replace(/\.$/,'');
      // Reference link — clickable in the shared PDF, and short enough on paper to type out.
      const lnk=safeURL(e.link);
      /* The coaching text goes in the Note column, a line per line the coach wrote, plus
         the recorded justification (coach copy only) as a last line. */
      const notes=String(exDesc(e)).split('\n').map(x=>x.trim()).filter(Boolean);
      if(withReasons&&e.why)notes.push(`${L('Gerekçe','Reason')}: ${e.why}`);
      /* The alternative, printed as its own row directly under the exercise it stands in
         for: same columns, so it can be read straight across, with the coach's reason
         spelled out under its name. A program that says "or do this instead" without
         saying why is one the next coach simply ignores. */
      const alt=(e.alt&&typeof e.alt==='object')?e.alt:null;
      const altNm=String((alt&&alt.name)||'').trim();
      const altWhy=String((alt&&alt.reason)||'').trim();
      let altRow='';
      const altDose=alt&&['sets','reps','duration','load','tempo','rpe','rest'].some(k=>String(alt[k]||'').trim());
      if(altNm||altWhy||altDose){
        const aLnk=safeURL(alt.link);
        const aNotes=String(alt.description||'').split('\n').map(x=>x.trim()).filter(Boolean);
        /* Whose alternative this is has to be unmissable, or the row reads as an eighth
           exercise rather than a second way of doing the fourth: the number column carries
           the parent's own badge behind a ↳, the cell opens with the word, and the two
           rows are tied together by dropping the rule between them. */
        altRow=`<tr class="ex-row alt-row">
          <td class="n"><span class="alt-of"><span class="alt-hook">↳</span><span class="ex-badge${isSS?' ss':''} ghost">${lab.tag}</span></span></td>
          <td class="ex">
            <div class="ex-ex-wrap">
              ${withImages&&rptExImage(alt)?`<div class="ex-imgwrap"><img class="ex-img" src="${escHTML(mediaSrc(rptExImage(alt)))}" alt="${escHTML(altNm)}"></div>`:''}
              <div class="ex-ex-txt">
                <div class="alt-for">${L('⇄ ALTERNATİF','⇄ ALTERNATIVE')}</div>
                <div class="ex-nm-wrap"><span class="alt-name">${escHTML(altNm||L('(belirtilmedi)','(not named)'))}</span>${aLnk?`<a class="ex-lnk" href="${aLnk}">🔗 ${escHTML(linkLabel(aLnk))}</a>`:''}</div>
                ${altWhy?`<div class="alt-why"><span class="alt-why-k">${L('Gerekçe','Reason')}</span>${escHTML(altWhy)}</div>`:''}
              </div>
            </div>
          </td>
          <td class="ds">${dose(alt.sets,alt.reps,alt.duration)}</td>
          <td>${alt.load?escHTML(alt.load):dash}</td>
          <td>${alt.tempo?escHTML(alt.tempo):dash}</td>
          <td>${alt.rpe?escHTML(alt.rpe):dash}</td>
          <td>${alt.rest?escHTML(alt.rest):dash}</td>
          <td class="nt">${rptNoteCell(aNotes,altNm,alt.pattern)}</td>
        </tr>`;
      }
      cur.rows.push(`<tr class="ex-row${altRow?' has-alt':''}">
        <td class="n">${num}</td>
        <td class="ex">
          <div class="ex-ex-wrap">
            ${withImages&&rptExImage(e)?`<div class="ex-imgwrap"><img class="ex-img" src="${escHTML(mediaSrc(rptExImage(e)))}" alt="${escHTML(e.name)}"></div>`:''}
            <div class="ex-ex-txt">
              <div class="ex-nm-wrap"><span class="pc-nm">${e.name}</span>${lnk?`<a class="ex-lnk" href="${lnk}">🔗 ${escHTML(linkLabel(lnk))}</a>`:''}</div>
            </div>
          </div>
        </td>
        <td class="ds">${dose(e.sets,e.reps,e.duration)}</td>
        <td>${e.load?escHTML(e.load):dash}</td>
        <td>${e.tempo?escHTML(e.tempo):dash}</td>
        <td>${e.rpe?escHTML(e.rpe):dash}</td>
        <td>${e.rest?escHTML(e.rest):dash}</td>
        <td class="nt">${rptNoteCell(notes,e.name,e.pattern)}</td>
      </tr>${altRow}`);
    });
    return cards.map(c=>rptPhaseCard(c.title,c.tag,c.rows.join(''))).join('');
  };
  /* A ball-practice block does not go in a table. What a coach needs off the sheet at the
     side of a court is the picture — so each drill prints as a card: the diagram at the
     size it can actually be read, the prescription beside it, and the coaching points
     under both. The court is inline SVG built from the same descriptors the on-screen
     board draws, in its print colours, so it prints crisply at any paper size. */
  const drillCards=b=>{
    const named=(b.exercises||[]).filter(e=>e.name);
    if(!named.length)return`<div class="empty-block">${L('Dril yok','No drills')}</div>`;
    let lastPh=null;
    const bPh=blkPhases(b);
    return`<div class="drill-cards">${named.map((e,i)=>{
      // The phase heading, on the same terms as the exercise table's — see exTable above.
      const ph=bPh.includes(exPhase(e))?exPhase(e):'';
      let phHd='';
      if(ph!==lastPh){
        if(ph)phHd=`<div class="dc-ph ${phCls(ph,bPh)}"><span class="ph-nm">${escHTML(blkPhaseLbl(ph,b))}</span><span class="ph-note">${escHTML(blkPhaseNote(ph,b))}</span></div>`;
        lastPh=ph;
      }
      const bits=[];
      if(e.sets&&e.reps)bits.push(`${e.sets} × ${e.reps}`);
      else if(e.sets)bits.push(`${e.sets} ${L('set','sets')}`);
      else if(e.reps)bits.push(String(e.reps));
      if(e.duration)bits.push(escHTML(e.duration));
      if(e.players)bits.push(escHTML(e.players));
      if(e.rpe)bits.push(`RPE ${escHTML(String(e.rpe))}`);
      if(e.rest)bits.push(`⏱ ${escHTML(e.rest)}`);
      const notes=String(exDesc(e)).split('\n').map(x=>x.trim()).filter(Boolean);
      const lnk=safeURL(e.videoUrl);
      return`${phHd}<div class="drill-card">
        <div class="dc-hd"><span class="dc-no">${i+1}</span><span class="dc-nm">${escHTML(e.name)}</span>
          ${lnk?`<a class="ex-lnk" href="${lnk}">🔗 ${escHTML(linkLabel(lnk))}</a>`:''}</div>
        <div class="dc-body">
          <div class="dc-fig">${sceneIsEmpty(e.court)?`<div class="dc-nofig">${L('Çizim yok','No diagram')}</div>`:courtSVGString(e.court)}</div>
          <div class="dc-txt">
            ${bits.length?`<div class="dc-presc">${bits.map(x=>`<span>${x}</span>`).join('')}</div>`:''}
            ${notes.length?`<ul class="ex-notes">${notes.map(n=>`<li>${escHTML(n)}</li>`).join('')}</ul>`:''}
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  };
  /* One document can carry several athletes: each is a group with its own header — the same
     header a single athlete's printout has — starting on a fresh page. Called the plain way,
     with (title, subtitle, sessions), there is exactly one group and the document is the one
     it has always been. */
  const groups=(opts&&Array.isArray(opts.groups)&&opts.groups.length)?opts.groups:[{title,subtitle,sessions,info:opts&&opts.info}];
  /* Volume and target RPE across the group's own sessions, for the masthead: the sets,
     reps and tonnage summed, and the RPE range running from the lowest target's floor to
     the highest one's ceiling — one session prints exactly its own range. */
  const headStats=list=>{
    const ss=list||[];
    if(!ss.length)return'';
    const vol=rptVolStats(ss.flatMap(s=>(s.blocks||[]).flatMap(b=>b.exercises||[])));
    const rr=ss.map(sesRpeRange);
    return rptHeadStats(vol,Math.min(...rr.map(r=>r[0])),Math.max(...rr.map(r=>r[1])));
  };
  const docHead=(t,sub,statsHTML,info)=>rptDocHead(t,sub,statsHTML,logo,info);
  /* A block whose heading is the session's own title (a one-block session, or a block
     printed on its own, which is headed by it) would print the same line twice, one
     under the other — so its heading is left to the session banner. */
  const sameTitle=(a,b)=>String(a||'').trim().toLocaleLowerCase()===String(b||'').trim().toLocaleLowerCase();
  const sessionsHTML=list=>(list||[]).map((s,i)=>`<div class="sess${(opts&&opts.pageBreaks&&i>0)?' brk':''}">
  ${rptSessBanner({no:i+1,nameHTML:s.name,ownerHTML:s.ownerName?escHTML(s.ownerName):'',
    time:s.time,duration:s.duration,purpose:sesFocusLine(s)||s.purpose||''})}
  ${(()=>{
    // Lay every block out side-by-side in a flowing grid — no warmup/main/cooldown
    // categorization, blocks stay in the order the user arranged them.
    const blks=(s.blocks||[]).filter(b=>(b.exercises||[]).some(e=>e.name));
    if(blks.length===0)return`<div class="bs"><div class="empty-block">${L('Antrenman planlanmadı','No exercises planned')}</div></div>`;
    /* A table block with no sections carries its name on its one card, so only a ball
       block, or a block split into sections, keeps a heading of its own above them. */
    return`<div class="bs blocks-grid">${blks.map(b=>{
      const ball=blkKind(b)==='ball';
      const named=!!(b.name&&!sameTitle(b.name,s.name));
      const head=named&&(ball||blkPhases(b).length)?`<div class="bh">${b.name}${ball?`<span class="bh-kind">${L('TOP','BALL')}</span>`:''}</div>`:'';
      return`<div class="block${ball?' ball-block':''}">${head}${ball?drillCards(b):exTable(b,named)}</div>`;
    }).join('')}</div>`;
  })()}
  ${(s.planNote||s.notes)?`<div class="sf">
    <div class="sf-notes">
      ${s.planNote?`<div class="sf-plan-note">${escHTML(s.planNote)}</div>`:''}
      ${s.notes?`<div><strong style="color:#0f172a">${L('Notlar:','Notes:')}</strong> ${s.notes}</div>`:''}
    </div>
  </div>`:''}
</div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${L('Antrenman Programı','Training Program')}</title>


<style>
/* Portrait: a program is read top-to-bottom like a worksheet, and the Share/PDF path
   (buildSessionPDFBlob) has always rendered at A4 portrait width — printing landscape
   meant the two outputs never matched.

   Zero page margin, and the 10mm the sheet is set in comes from the body's padding
   instead. The browser draws its own header and footer — the print date, the document
   title, the page number, the about:blank URL — inside the page margin, and a sheet a
   coach hands an athlete should carry the program's branding, not the browser's; with
   no margin there is nowhere for that strip to go. It also makes the two outputs match
   for the first time: html2canvas never saw @page at all, so the shared PDF has always
   run its content to the bare edge of the paper. Padding is honoured by both. */
@page{size:A4 portrait;margin:0}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{font-family:'Google Sans',Arial,sans-serif;font-size:12px;color:#0f172a;line-height:1.4;letter-spacing:.005em;padding:0 10mm}
/* The sides come from the body's padding above, but padding only ever falls at the two
   ends of the whole document — a program that runs to three pages would start pages two
   and three hard against the top of the paper, inside the strip most printers cannot
   print on. A thead and a tfoot are repeated by the browser on every page it breaks
   onto, so an empty row in each is the one thing that reserves the same band of white
   at the top and foot of every sheet. */
.pg-frame{width:100%;border-collapse:collapse}
.pg-frame>thead{display:table-header-group}
.pg-frame>tfoot{display:table-footer-group}
.pg-frame>tbody>tr>td{padding:0;vertical-align:top}
.pg-pad{height:10mm;padding:0;border:none}

${RPT_HEAD_CSS}

.bs{padding:12px 0 0}
/* Blocks stack one under the other, in the order the coach arranged them, so the sheet
   is read straight down. Side-by-side columns only made sense on a landscape page; on
   portrait they squeezed exercise names into two-line wraps. */
.bs.blocks-grid{display:flex;flex-direction:column;gap:12px}
.block{min-width:0}
/* Smaller than .ex-name on purpose — uppercase, 800 weight, letter-spaced and sitting on a
   green rule is enough to read as the heading over its exercises, and matching the exercise
   names would make the block titles shout. */
.bh{font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin:2px 0 4px 0;padding-bottom:4px;border-bottom:2px solid #1f7cc2;display:block;break-after:avoid;page-break-after:avoid}
/* Ball practice prints as cards, not rows: the diagram is the drill, so it gets real
   width on the page and the numbers sit beside it. */
.ball-block .bh{border-bottom-color:#ea8c2a}
.bh-kind{float:right;font-family:'Google Sans',Arial,sans-serif;font-size:8px;letter-spacing:1px;
  color:#ea8c2a;border:1px solid #f0c79a;border-radius:2px;padding:1px 5px;vertical-align:middle}
.drill-cards{display:flex;flex-direction:column;gap:9px;margin-top:6px}
.drill-card{border:1px solid #e2e8f0;border-radius:2px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.dc-hd{display:flex;align-items:center;gap:8px;background:#fff7ef;border-bottom:1px solid #f0e0cf;padding:5px 9px}
.dc-no{font-family:'Google Sans',Arial,sans-serif;font-size:10px;font-weight:700;color:#fff;background:#ea8c2a;
  border-radius:2px;padding:1px 6px}
.dc-nm{font-size:13px;font-weight:700;color:#0f172a;flex:1}
.dc-body{display:flex;gap:11px;padding:9px}
.dc-fig{flex:0 0 46%;max-width:46%}
.court-fig{width:100%;height:auto;display:block;border:1px solid #e2e8f0;border-radius:2px}
.dc-nofig{padding:22px 8px;text-align:center;color:#cbd5e1;font-size:11px;border:1px dashed #e2e8f0;border-radius:2px}
.dc-txt{flex:1;min-width:0}
.dc-presc{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
.dc-presc span{font-family:'Google Sans',Arial,sans-serif;font-size:10.5px;font-weight:700;color:#334155;
  background:#f1f5f9;border:1px solid #e2e8f0;border-radius:2px;padding:2px 8px}

/* The exercises print as phase cards — the same cards the individualization panel's
   printout draws (RPT_PHASE_CSS), so a programme reads the same whichever sheet it
   came off. What follows is only what the calendar's rows carry on top: superset
   badges, images, links and alternatives. */
${RPT_PHASE_CSS}
.block .pc-card:last-child{margin-bottom:0}
${RPT_BADGE_CSS}
.ex-ex-wrap{display:flex;gap:10px;align-items:center}
.ex-ex-txt{min-width:0}
.ex-nm-wrap{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ex-lnk{display:inline-block;font-size:10.5px;font-weight:700;color:#165f96;text-decoration:none;
  background:rgba(31,124,194,.14);border:1px solid rgba(31,124,194,.45);border-radius:2px;
  padding:1px 7px;line-height:1.5;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-notes{margin:0;padding-left:14px;font-weight:400;font-size:11px;color:#64748b;line-height:1.5}
.ex-notes li{margin-bottom:1px}
/* Exercise image — only rendered by "Print with Image". Fixed thumbnail box so every
   row lines up down the page whatever the uploaded photo's own proportions are; fitted
   inside rather than cropped, so a portrait shot still shows the whole movement. Small, so
   a picture does not make its row taller than the text beside it needs. */
.ex-imgwrap{flex:none;line-height:0;width:32mm;height:23mm;border:1px solid #e2e8f0;background:#fff;overflow:hidden}
.ex-img{display:block;width:100%;height:100%;object-fit:contain}
.dash{color:#cbd5e1;font-weight:400}

/* The phase headings between drill cards — a rule in the section's own colour, holding
   the section's name and what belongs in it, bound to the drill underneath. */
.dc-ph{margin:8px 0 5px;padding:5px 9px;background:#f1f5f9;border-left:3px solid #94a3b8;border-radius:0 6px 6px 0;
  break-after:avoid;page-break-after:avoid}
.dc-ph.pc0{border-left-color:#ca8a04;background:rgba(234,179,8,.14)}
.dc-ph.pc1{border-left-color:#16a34a;background:rgba(22,163,74,.12)}
.dc-ph.pc2{border-left-color:#0284c7;background:rgba(2,132,199,.12)}
.dc-ph.pc3{border-left-color:#ea580c;background:rgba(234,88,12,.12)}
.dc-ph.pc4{border-left-color:#7c3aed;background:rgba(124,58,237,.12)}
.dc-ph.pc5{border-left-color:#db2777;background:rgba(219,39,119,.12)}
.ph-nm{font-family:'Google Sans',Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#334155}
.ph-note{font-size:9.5px;color:#94a3b8;margin-left:9px}

.empty-block{padding:16px;text-align:center;color:#cbd5e1;font-size:12px;background:#fafbfc;border-radius:2px;border:1px dashed #e2e8f0}

/* Footer */
.sf{margin-top:12px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;gap:24px;align-items:stretch;break-inside:avoid;page-break-inside:avoid}
.sf-item{display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:100px}
.sf-lbl{font-family:'Google Sans',Arial,sans-serif;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.6px}
.sf-val{font-family:'Google Sans',Arial,sans-serif;font-size:18px;font-weight:600;color:#0f172a;letter-spacing:-.01em;line-height:1.1}
.sf-val.placeholder{color:#cbd5e1;font-weight:700}
.sf-val .unit{font-size:12px;color:#94a3b8;font-weight:600;margin-left:3px}
.sf-divider{width:1px;background:#e2e8f0}
.sf-notes{flex:1;font-size:12px;color:#475569;line-height:1.5;display:flex;flex-direction:column;gap:5px}
.sf-plan-note{font-weight:400 !important;font-size:12px;color:#334155;line-height:1.55;white-space:pre-wrap}

/* Page footer */
.page-footer{font-family:'Google Sans',Arial,sans-serif;margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;letter-spacing:.3px}
</style></head><body>
<table class="pg-frame"><thead><tr><td class="pg-pad"></td></tr></thead>
<tfoot><tr><td class="pg-pad"></td></tr></tfoot>
<tbody><tr><td>

${groups.map((g,gi)=>`<section class="ath-doc${gi>0?' brk':''}">
${docHead(g.title,g.subtitle,headStats(g.sessions),g.info)}
${sessionsHTML(g.sessions)}
</section>`).join('')}

<div class="page-footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · CoachOS</div>

</td></tr></tbody></table>
</body></html>`;
}

