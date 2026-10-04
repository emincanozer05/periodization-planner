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
const RPT_HEAD_CSS=`/* The sheet's own masthead, centred across the top where the browser used to print its
   title strip. It carries the product mark and nothing else: what document this is and
   whose it is are the two lines directly under it, and repeating either up here would
   only crowd a header that has to earn its height back in exercises. Set as plain text
   (not the app's own dark-background logo image) so it reads straight on white paper
   with no box behind it. */
.doc-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}
/* The mark and what it stands for, read as one lockup on the left of the strip. */
.doc-top-l{display:inline-flex;align-items:center;gap:9px;min-width:0}
.doc-top .wm{display:inline-flex;align-items:center;
  font-weight:800;font-size:13px;letter-spacing:-.01em;color:#0f172a;flex:none}
.doc-top .wm b{color:#0094ff;font-weight:800}
/* Deliberately quiet: it explains the mark for a parent or an athlete reading the sheet
   for the first time, and should not compete with the team name below it. */
.doc-top .wm-sub{font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:.4px;white-space:nowrap}
.doc-top-date{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#64748b;letter-spacing:.3px}

/* Document header — clean editorial style, with the team's logo when one is uploaded */
.doc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0f172a}
.doc-l{display:flex;align-items:center;gap:12px;min-width:0}
/* Bounded rather than forced to a fixed height: a square crest caps at max-height, a wide
   wordmark at max-width, and neither ends up letterboxed inside a box the wrong shape.
   Uploads are capped at 900px (resizePhotoBlob) and never upscaled here, so a low-res logo
   stays at its own size instead of being blown up into a blurry one. */
.doc-logo{height:auto;width:auto;max-height:56px;max-width:124px;object-fit:contain;flex:none}
.doc-l h1{font-size:23px;font-weight:800 !important;color:#0f172a;letter-spacing:-0.03em;line-height:1.05}
.doc-l .lbl{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
/* The session's volume and target RPE, opposite the title — two quiet "label over value"
   pairs split by a hairline. They used to be two framed panels under the session banner;
   up here they take no height of their own, which is height handed back to exercises. */
.doc-r{display:flex;align-items:flex-end;gap:12px;text-align:right;flex:none}
.doc-kv{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.doc-kv-k{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.9px}
.doc-kv-v{font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;letter-spacing:-.005em}
.doc-kv-v small{font-size:9.5px;font-weight:600;color:#94a3b8}
.doc-kv-v em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-left:5px}
.doc-kv-sep{color:#cbd5e1;font-weight:500;margin:0 4px}
.doc-kv-div{width:1px;align-self:stretch;background:#e2e8f0}

/* Session card — refined; allow page breaks INSIDE the session so a long
   session flows naturally across pages (no half-empty pages). The header /
   metadata / block headings glue themselves to the next content using
   break-after:avoid, so we never get orphaned section headers. */
.sess{margin-bottom:10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.04)}
/* A keyline of the product's blue around the black banner: on white paper the banner
   otherwise reads as a solid slab dropped on the page, and the frame gives it an edge
   without spending any of the sheet's colour budget on a fill. Two points rather than
   one: at a hairline the blue was there on screen but the first inkjet pass thinned it
   to almost nothing, and this is a sheet that gets printed far more often than viewed. */
.sh{padding:10px 15px;background:#0a0b0d;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px;border:2px solid #0094ff;border-radius:7px 7px 0 0;break-after:avoid;page-break-after:avoid}
.sh-l{font-size:18px;font-weight:800;letter-spacing:.2px;flex:1}
.sh-own{display:block;font-size:12px;font-weight:600;color:#e6ff55;letter-spacing:.6px;text-transform:uppercase;margin-left:39px}
.sess.brk{break-before:page;page-break-before:always}
/* Each athlete on a document of several starts a fresh page, under their own header. */
.ath-doc.brk{break-before:page;page-break-before:always}
/* White, not the app's yellow: on the printed sheet the disc is the session's number and
   nothing more, and white is the one fill that stays legible on the black banner through
   a photocopier as well as a colour printer. */
.sh-l .sn{display:inline-block;background:#fff;color:#0a0b0d;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:800;margin-right:11px}
/* Two small stat blocks (start time · total duration) in the dark banner, each a value
   over an uppercase caption — replaces the plain pills so the numbers read as what they
   are rather than as generic tags. */
.sh-r{display:flex;gap:14px;align-items:center}
.sh-stat{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.sh-stat-v{font-size:14px;font-weight:800;letter-spacing:.2px}
.sh-stat-k{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.7px}
.sh-stat-div{width:1px;align-self:stretch;background:rgba(255,255,255,.16)}

/* Metadata bar — stays with following content */
.meta-bar{padding:7px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:20px;align-items:center;flex-wrap:wrap;break-after:avoid;page-break-after:avoid}
.meta-item{display:flex;align-items:center;gap:6px;font-size:12px}
.meta-item .lbl{font-family:'IBM Plex Mono',monospace;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.6px;font-size:11px}
.meta-item .val{color:#0f172a;font-weight:600}`;
/* A phase of the session as a card: its name on a grey bar with an accent rule, the kind
   of work it is as a quiet tag at the far end, and its exercises in a six-column table —
   #, the exercise with its coaching text under it, Set × Reps, Load, Tempo, Rest. The
   table's head repeats on every page a long phase breaks onto; a row never splits. */
const RPT_PHASE_CSS=`.pc-card{border:1px solid #e5e7eb;border-radius:11px;overflow:hidden;margin-bottom:11px;background:#fff}
.pc-hd{display:flex;align-items:center;gap:9px;padding:8px 12px;background:#f4f5f7;border-bottom:1px solid #e5e7eb;break-after:avoid;page-break-after:avoid}
.pc-dot{flex:none;width:3px;height:14px;border-radius:2px;background:#9aab3a}
.pc-t{font-size:11.5px;font-weight:700;letter-spacing:.04em;color:#0a0b0d}
.pc-tag{margin-left:auto;flex:none;font-size:9px;color:#5c626c;border:1px solid #e5e7eb;border-radius:6px;padding:2px 8px;white-space:nowrap}
.pc-tbl{width:100%;border-collapse:collapse;table-layout:fixed}
.pc-tbl thead{display:table-header-group}
.pc-tbl th{font-size:9px;font-weight:600;color:#5c626c;text-transform:uppercase;letter-spacing:.06em;padding:6px 8px;text-align:center;border-bottom:1px solid #e5e7eb}
.pc-tbl td{padding:8px;text-align:center;vertical-align:top;border-top:1px solid #e5e7eb;font-size:10.5px;color:#3b4252}
.pc-tbl tbody tr:first-child td{border-top:0}
.pc-tbl tr{break-inside:avoid;page-break-inside:avoid}
.pc-tbl th.n,.pc-tbl td.n{width:36px;padding-left:6px;padding-right:4px;color:#8b9099;font-weight:700}
.pc-tbl th.ex,.pc-tbl td.ex{width:46%;text-align:left}
.pc-nm{font-size:12px;font-weight:700;color:#0a0b0d}
.pc-why{font-size:9.5px;color:#5c626c;margin-top:3px;line-height:1.45}
.pc-tbl td.ds b{font-size:12px;color:#0a0b0d}
.pc-tbl td.ds s{color:#8b9099}
.pc-dd{font-size:9.5px;color:#5c626c;margin-top:2px}`;
/* The masthead: the product line with the date, then the team's crest, what the sheet is,
   whose it is and — opposite — the volume and target RPE (rptHeadStats). `titleHTML` and
   `statsHTML` go in as markup. */
function rptDocHead(titleHTML,sub,statsHTML,logo){
  return`<div class="doc-top"><span class="doc-top-l"><span class="wm">COACH<b>OS</b></span><span class="wm-sub">Coaching Operating System</span></span><span class="doc-top-date">${escHTML(String(sub==null?'':sub).replace(/,/g,'·'))}</span></div>
<div class="doc-head">
  <div class="doc-l">
    ${logo?`<img class="doc-logo" src="${escHTML(mediaSrc(logo))}" alt="">`:''}
    <div>
      <div class="lbl">${L('Antrenman Programı','Training Program')}</div>
      <h1>${titleHTML}</h1>
    </div>
  </div>
  ${statsHTML||''}
</div>`;
}
/* Volume and target RPE for the masthead: `vol` from rptVolStats, `rlo`/`rhi` the RPE
   range. Plain text on the white sheet, no frame — it is a summary, not a panel. */
function rptHeadStats(vol,rlo,rhi){
  const nf=v=>Number(v||0).toLocaleString(REPORT_LANG==='tr'?'tr-TR':'en-US');
  const sep=`<span class="doc-kv-sep">·</span>`;
  const parts=[];
  if(vol.sets)parts.push(`${vol.sets} ${L('set','sets')}`);
  if(vol.reps)parts.push(`${vol.reps} ${L('tekrar','reps')}`);
  if(vol.hasLoad)parts.push(`~${nf(vol.tonnage)} kg`);
  const rz=rpeZone(Math.round((rlo+rhi)/2));
  return`<div class="doc-r">
    <div class="doc-kv"><span class="doc-kv-k">${L('Antrenman Hacmi','Training Volume')}</span><span class="doc-kv-v">${parts.length?parts.join(sep):'—'}</span></div>
    <div class="doc-kv-div"></div>
    <div class="doc-kv"><span class="doc-kv-k">${L('Hedef RPE','Target RPE')}</span><span class="doc-kv-v">${rlo===rhi?rlo:`${rlo}-${rhi}`}<small>/10</small><em style="color:${rz.pc}">${L(rz.tr,rz.en)}</em></span></div>
  </div>`;
}
/* The session's black banner — its number, its name, when it starts and how long it
   runs — and the purpose line under it. `nameHTML` / `ownerHTML` go in as markup. */
function rptSessBanner({no,nameHTML,ownerHTML,time,duration,purpose,meta}){
  return`<div class="sh">
    <div class="sh-l"><span class="sn">${no}</span>${ownerHTML?`<span class="sh-own">${ownerHTML}</span>`:''}${nameHTML}</div>
    <div class="sh-r">
      <div class="sh-stat"><span class="sh-stat-v">🕐 ${escHTML(time||'—')}</span><span class="sh-stat-k">${L('BAŞLANGIÇ','START')}</span></div>
      <div class="sh-stat-div"></div>
      <div class="sh-stat"><span class="sh-stat-v">${Number(duration)||0} ${L('DK','MIN')}</span><span class="sh-stat-k">${L('TOPLAM SÜRE','TOTAL TIME')}</span></div>
    </div>
  </div>
  <div class="meta-bar">
    <div class="meta-item"><span class="lbl">${L('Amaç','Purpose')}</span><span class="val">${escHTML(purpose||'')}</span></div>
    ${(meta||[]).filter(m=>m&&m.val).map(m=>`<div class="meta-item"><span class="lbl">${escHTML(m.lbl)}</span><span class="val">${escHTML(m.val)}</span></div>`).join('')}
  </div>`;
}
/* One phase card around rows already drawn as <tr>s. Title and tag are plain text; a
   card with neither prints its table alone. */
function rptPhaseCard(title,tag,rowsHTML){
  const t=String(title||'').trim(),g=String(tag||'').trim();
  return`<div class="pc-card">${t||g?`<div class="pc-hd"><span class="pc-dot"></span><span class="pc-t">${escHTML(t)}</span>${g?`<span class="pc-tag">${escHTML(g)}</span>`:''}</div>`:''}
    <table class="pc-tbl"><thead><tr><th class="n">#</th><th class="ex">${L('Egzersiz','Exercise')}</th><th>${L('Set × Tekrar','Sets × Reps')}</th>
      <th>${L('Yük','Load')}</th><th>${L('Tempo','Tempo')}</th><th>${L('Dinlenme','Rest')}</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>`;
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
     exercise (image + name + link, the coaching text under it) · Set × Reps (with the
     time under it) · Load · Tempo · Rest. */
  const exTable=(b,showName)=>{
    const namedExs=(b.exercises||[]).filter(e=>e.name);
    if(namedExs.length===0)return`<div class="empty-block">${L('Egzersiz yok','No exercises')}</div>`;
    const labs=computeLabels(b.exercises||[]);
    const bPh=blkPhases(b);
    const dose=(sets,reps,dur)=>{
      let sr='';
      if(sets&&reps)sr=`${sets}×${reps}`;
      else if(sets)sr=`${sets} ${L('set','sets')}`;
      else if(reps)sr=String(reps);
      if(!sr&&!dur)return dash;
      return sr?`<b>${escHTML(sr)}</b>${dur?`<div class="pc-dd">${escHTML(dur)}</div>`:''}`:`<b>${escHTML(dur)}</b>`;
    };
    const lines=arr=>arr.map(n=>`<div class="pc-why">${escHTML(n)}</div>`).join('');
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
      /* The coaching text reads under the name, a line per line the coach wrote, plus
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
      if(altNm||altWhy){
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
              ${withImages&&alt.image?`<div class="ex-imgwrap"><img class="ex-img" src="${escHTML(mediaSrc(alt.image))}" alt="${escHTML(altNm)}"></div>`:''}
              <div class="ex-ex-txt">
                <div class="alt-for">${L('⇄ ALTERNATİF','⇄ ALTERNATIVE')}</div>
                <div class="ex-nm-wrap"><span class="alt-name">${escHTML(altNm||L('(belirtilmedi)','(not named)'))}</span>${aLnk?`<a class="ex-lnk" href="${aLnk}">🔗 ${escHTML(linkLabel(aLnk))}</a>`:''}</div>
                ${lines(aNotes)}
                ${altWhy?`<div class="alt-why"><span class="alt-why-k">${L('Gerekçe','Reason')}</span>${escHTML(altWhy)}</div>`:''}
              </div>
            </div>
          </td>
          <td class="ds">${dose(alt.sets,alt.reps,alt.duration)}</td>
          <td>${alt.load?escHTML(alt.load):dash}</td>
          <td>${alt.tempo?escHTML(alt.tempo):dash}</td>
          <td>${alt.rest?escHTML(alt.rest):dash}</td>
        </tr>`;
      }
      cur.rows.push(`<tr class="ex-row${altRow?' has-alt':''}">
        <td class="n">${num}</td>
        <td class="ex">
          <div class="ex-ex-wrap">
            ${withImages&&e.image?`<div class="ex-imgwrap"><img class="ex-img" src="${escHTML(mediaSrc(e.image))}" alt="${escHTML(e.name)}"></div>`:''}
            <div class="ex-ex-txt">
              <div class="ex-nm-wrap"><span class="pc-nm">${e.name}</span>${lnk?`<a class="ex-lnk" href="${lnk}">🔗 ${escHTML(linkLabel(lnk))}</a>`:''}</div>
              ${lines(notes)}
            </div>
          </div>
        </td>
        <td class="ds">${dose(e.sets,e.reps,e.duration)}</td>
        <td>${e.load?escHTML(e.load):dash}</td>
        <td>${e.tempo?escHTML(e.tempo):dash}</td>
        <td>${e.rest?escHTML(e.rest):dash}</td>
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
  const groups=(opts&&Array.isArray(opts.groups)&&opts.groups.length)?opts.groups:[{title,subtitle,sessions}];
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
  const docHead=(t,sub,statsHTML)=>rptDocHead(t,sub,statsHTML,logo);
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
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
body{font-family:'Space Grotesk','Inter','Segoe UI',system-ui,sans-serif;font-size:12px;color:#0f172a;line-height:1.4;letter-spacing:.005em;padding:0 10mm}
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

.bs{padding:10px 16px}
/* Blocks stack one under the other, in the order the coach arranged them, so the sheet
   is read straight down. Side-by-side columns only made sense on a landscape page; on
   portrait they squeezed exercise names into two-line wraps. */
.bs.blocks-grid{display:flex;flex-direction:column;gap:12px}
.block{min-width:0}
/* Smaller than .ex-name on purpose — uppercase, 800 weight, letter-spaced and sitting on a
   green rule is enough to read as the heading over its exercises, and matching the exercise
   names would make the block titles shout. */
.bh{font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin:2px 0 4px 0;padding-bottom:4px;border-bottom:2px solid #9aab3a;display:block;break-after:avoid;page-break-after:avoid}
/* Ball practice prints as cards, not rows: the diagram is the drill, so it gets real
   width on the page and the numbers sit beside it. */
.ball-block .bh{border-bottom-color:#ea8c2a}
.bh-kind{float:right;font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:1px;
  color:#ea8c2a;border:1px solid #f0c79a;border-radius:4px;padding:1px 5px;vertical-align:middle}
.drill-cards{display:flex;flex-direction:column;gap:9px;margin-top:6px}
.drill-card{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.dc-hd{display:flex;align-items:center;gap:8px;background:#fff7ef;border-bottom:1px solid #f0e0cf;padding:5px 9px}
.dc-no{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;color:#fff;background:#ea8c2a;
  border-radius:4px;padding:1px 6px}
.dc-nm{font-size:13px;font-weight:700;color:#0f172a;flex:1}
.dc-body{display:flex;gap:11px;padding:9px}
.dc-fig{flex:0 0 46%;max-width:46%}
.court-fig{width:100%;height:auto;display:block;border:1px solid #e2e8f0;border-radius:6px}
.dc-nofig{padding:22px 8px;text-align:center;color:#cbd5e1;font-size:11px;border:1px dashed #e2e8f0;border-radius:6px}
.dc-txt{flex:1;min-width:0}
.dc-presc{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
.dc-presc span{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:#334155;
  background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:2px 8px}

/* The exercises print as phase cards — the same cards the individualization panel's
   printout draws (RPT_PHASE_CSS), so a programme reads the same whichever sheet it
   came off. What follows is only what the calendar's rows carry on top: superset
   badges, images, links and alternatives. */
${RPT_PHASE_CSS}
.block .pc-card:last-child{margin-bottom:0}
/* Superset rows get the green badge; a plain sequence number otherwise gets the same
   pill shape in neutral grey, so the column reads as one system either way. */
.ex-badge{display:inline-block;min-width:24px;padding:2px 6px;border-radius:5px;text-align:center;
  font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:#94a3b8;background:#f1f5f9}
.ex-badge.ss{background:rgba(154,171,58,.16);color:#5c6b1f;border:1px solid rgba(154,171,58,.5)}
.ex-ex-wrap{display:flex;gap:9px;align-items:flex-start}
.ex-ex-txt{min-width:0}
.ex-nm-wrap{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ex-lnk{display:inline-block;font-size:10.5px;font-weight:700;color:#6f7d29;text-decoration:none;
  background:rgba(154,171,58,.14);border:1px solid rgba(154,171,58,.45);border-radius:5px;
  padding:1px 7px;line-height:1.5;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-notes{margin:0;padding-left:14px;font-weight:400;font-size:11px;color:#64748b;line-height:1.5}
.ex-notes li{margin-bottom:1px}
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
.alt-for{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.09em;
  color:#b45309;line-height:1.35;margin-bottom:1px}
.alt-name{font-weight:700;font-size:13px;color:#78350f;line-height:1.25}
.alt-why{margin-top:3px;font-size:11px;font-weight:400;color:#78350f;line-height:1.5}
.alt-why-k{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:#b45309;margin-right:6px}
/* Exercise image — only rendered by "Print with Image". Fixed thumbnail box so every
   row lines up down the page whatever the uploaded photo's own proportions are; fitted
   inside rather than cropped, so a portrait shot still shows the whole movement. */
.ex-imgwrap{flex:none;line-height:0;width:26mm;height:18mm;border:1px solid #e2e8f0;border-radius:6px;background:#fff;overflow:hidden}
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
.ph-nm{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#334155}
.ph-note{font-size:9.5px;color:#94a3b8;margin-left:9px}

.empty-block{padding:16px;text-align:center;color:#cbd5e1;font-size:12px;background:#fafbfc;border-radius:6px;border:1px dashed #e2e8f0}

/* Footer */
.sf{padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;gap:24px;align-items:stretch;border-radius:0 0 7px 7px;break-inside:avoid;page-break-inside:avoid}
.sf-item{display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:100px}
.sf-lbl{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.6px}
.sf-val{font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:600;color:#0f172a;letter-spacing:-.01em;line-height:1.1}
.sf-val.placeholder{color:#cbd5e1;font-weight:700}
.sf-val .unit{font-size:12px;color:#94a3b8;font-weight:600;margin-left:3px}
.sf-divider{width:1px;background:#e2e8f0}
.sf-notes{flex:1;font-size:12px;color:#475569;line-height:1.5;display:flex;flex-direction:column;gap:5px}
.sf-plan-note{font-weight:400 !important;font-size:12px;color:#334155;line-height:1.55;white-space:pre-wrap}

/* Page footer */
.page-footer{font-family:'IBM Plex Mono',monospace;margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;letter-spacing:.3px}
</style></head><body>
<table class="pg-frame"><thead><tr><td class="pg-pad"></td></tr></thead>
<tfoot><tr><td class="pg-pad"></td></tr></tfoot>
<tbody><tr><td>

${groups.map((g,gi)=>`<section class="ath-doc${gi>0?' brk':''}">
${docHead(g.title,g.subtitle,headStats(g.sessions))}
${sessionsHTML(g.sessions)}
</section>`).join('')}

<div class="page-footer">${L(fdL(fmt(today))+' tarihinde oluşturuldu','Generated '+fdL(fmt(today)))} · CoachOS</div>

</td></tr></tbody></table>
</body></html>`;
}

