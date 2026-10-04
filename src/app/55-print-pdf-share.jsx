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

/* Open the print dialog for a freshly written popup, but only once its images
   have settled. Photos live in cloud storage (Firebase / Drive), so right after
   document.close() they are still downloading — printing on a fixed delay leaves
   blank boxes in the output. `settle` lets the document lay out first, `safety`
   caps the wait so one stalled photo can never withhold the dialog. */
/* `before` runs once, in the opened window, after its images have settled and
   immediately before the print dialog — the only moment a sheet can measure
   itself against the paper it is about to go onto. It must never stop the
   print: a sheet that prints unfitted still prints. */
function printWhenImagesReady(w,{settle=350,safety=5000,before}={}){
  let printed=false;
  const go=()=>{if(printed)return;printed=true;
    if(before){try{before(w);}catch(e){console.warn('fit failed',e);}}
    try{w.focus();w.print();}catch(e){console.warn('print failed',e);}};
  setTimeout(()=>{
    const pending=[...w.document.images].filter(i=>!i.complete);
    if(!pending.length){go();return;}
    let left=pending.length;const one=()=>{if(--left<=0)go();};
    pending.forEach(i=>{i.addEventListener('load',one);i.addEventListener('error',one);});
    setTimeout(go,safety);
  },settle);
}

function printDayA4(title,subtitle,sessions,opts){
  const w=window.open('','_blank','width=900,height=1100');if(!w)return;
  w.document.write(buildSessionHTMLDoc(title,subtitle,sessions,opts));
  w.document.close();
  printWhenImagesReady(w);
}

/* THE WEEK AS A MESSAGE. The A4 printout is a page to hand over in person; what a coach
   actually sends the staff on a Sunday night is a few lines they can read on a phone
   without opening anything. Same week, same numbers, written as text: a day per line,
   its sessions under it with the time, the title and how long, and the week's totals at
   the foot. A rest day says so rather than going missing — "no line for Wednesday" and
   "nothing on Wednesday" have to be different things to read. */
function weekShareText(title,weekStart,days,athletes){
  const dates=Array.from({length:7},(_,i)=>fmt(addD(parseD(weekStart),i)));
  const teamDaily=teamDailyLoadMap(days,athletes);
  const out=[];
  const range=`${fd(dates[0])} – ${fd(dates[6])}`;
  out.push(`${title||''} · ${range}`.trim());
  out.push('');
  let nSes=0;
  dates.forEach((d,i)=>{
    const ses=(days[d]&&days[d].sessions)||[];
    const au=Math.round(Number(teamDaily[d])||0);
    const head=`${dnL(i)} ${fd(d).slice(0,5)}`;
    if(!ses.length){out.push(`${head} — ${L('dinlenme','rest')}`);return;}
    nSes+=ses.length;
    out.push(`${head}${au>0?` · ${au} AU`:''}`);
    ses.forEach(x=>{
      const blocks=[...new Set((x.blocks||[]).map(b=>blkSesName(x,b)).filter(Boolean))]
        .filter(n=>n!==(x.name||''));
      const dur=Number(x.duration)||0;
      out.push(`  • ${x.time||''} ${x.name||L('Antrenman','Session')}${dur?` (${dur}${L('dk','min')})`:''}`
        +(blocks.length?` — ${blocks.join(', ')}`:''));
    });
  });
  const wk=teamWeekMono(days,athletes,weekStart);
  const total=dates.reduce((a,d)=>a+(Number(teamDaily[d])||0),0);
  out.push('');
  out.push(`${L('Toplam','Total')}: ${nSes} ${L('antrenman','sessions')} · ${Math.round(total)} AU`
    +(wk&&wk.monotony?` · ${L('monotonluk','monotony')} ${wk.monotony.toFixed(2)}`:''));
  return out.join('\n');
}
/* The weekly sheet as a document, apart from the window it is printed in. The printout
   and the image the Share panel shows are the SAME page by construction: one builder,
   one layout, and nothing to drift out of step the next time the sheet is edited. */
function buildWeekHTMLDoc(title,weekStart,days,athletes,opts){
  const dates=Array.from({length:7},(_,i)=>fmt(addD(parseD(weekStart),i)));
  /* Per-day AU loads (Mon..Sun) — through teamDailyLoadMap, the same helper the
     calendar and Load Monitoring read. A day whose sessions carry no session-level
     sRPE (typical when several blocks share a day and the athletes log their own
     RPE instead) used to print "Toplam: 0 AU"; the helper falls back to the
     athletes' logged load for exactly those days. */
  const teamDaily=teamDailyLoadMap(days,athletes);
  const dayLoads=dates.map(d=>Number(teamDaily[d])||0);
  const totalLoad=dayLoads.reduce((a,b)=>a+b,0);
  const totalSessions=dates.reduce((a,d)=>a+(days[d]?.sessions||[]).length,0);
  // Daily team load = SUM of that day's session AU boxes — exactly what the calendar shows and
  // the on-screen Training Load tab now uses (e.g. 420 + 455 = 875), not a per-athlete average.
  const rDay=dayLoads.map(v=>Math.round(v||0));
  const rTotal=rDay.reduce((a,b)=>a+b,0);
  /* Foster monotony — from teamWeekMono, the same helper the calendar's chip and the
     Load Monitoring card read, so all three report one number for a week. This used to
     recompute mean/SD over the TEAM's daily totals, which is a different statistic:
     collapsing the roster into one curve first smooths away the very day-to-day
     variation monotony measures, and it printed 1.51 where the calendar said 1.29.
     mean/SD/strain come from the helper too, so the printed "Mean / SD" still divides
     out to the printed monotony. */
  const wkMono=teamWeekMono(days,athletes,weekStart);
  const meanLoad=wkMono.mean,sd=wkMono.sd,monotony=wkMono.monotony,strain=wkMono.strain;
  // The bar chart plots the TEAM's daily totals, so its mean line stays a team mean.
  const chartMean=rTotal/7;
  const maxLoad=Math.max(...rDay,1);
  // Build SVG bar chart
  /* The chart reads like a chart rather than seven floating blocks: a left gutter with a
     scale on it, gridlines the bars are measured against, and the squad mean as a labelled
     line across them. The scale tops out at a round number above the heaviest day, so the
     ticks are numbers a coach recognises (300, 600, 900) rather than the day's own total. */
  const cBarW=58,cGap=10,cPad=26,cBottomLbl=20,cGut=40,cH=178;
  const cUsableH=cH-cPad-cBottomLbl;
  const cPlotW=7*cBarW+6*cGap;
  const cTotalW=cGut+cPlotW;
  const niceStep=v=>{const raw=v/4;const p10=Math.pow(10,Math.floor(Math.log10(Math.max(1,raw))));
    const n=raw/p10;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p10;};
  const step=niceStep(maxLoad);
  const axMax=Math.max(step,Math.ceil(maxLoad/step)*step);
  const yOf=v=>cPad+cUsableH-(axMax>0?(v/axMax)*cUsableH:0);
  const ticks=[];for(let v=0;v<=axMax+.001;v+=step)ticks.push(v);
  const grid=ticks.map(v=>`<line x1="${cGut}" y1="${yOf(v)}" x2="${cTotalW}" y2="${yOf(v)}" stroke="#e5e7eb" stroke-width="1"/><text x="${cGut-8}" y="${yOf(v)+3.5}" text-anchor="end" font-size="9" fill="#8b9099" font-family="'IBM Plex Mono',monospace">${Math.round(v)}</text>`).join('');
  const bars=rDay.map((load,i)=>{
    const h=Math.max(yOf(0)-yOf(load),0);
    const x=cGut+i*(cBarW+cGap);const y=yOf(load);
    return`<rect x="${x}" y="${y}" width="${cBarW}" height="${h||0}" fill="#9aab3a" rx="4" ry="4"/><text x="${x+cBarW/2}" y="${y-6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0a0b0d">${Math.round(load)}</text><text x="${x+cBarW/2}" y="${cH-4}" text-anchor="middle" font-size="10" font-weight="600" fill="#5c626c" font-family="'IBM Plex Mono',monospace">${dnL(i)}</text>`;
  }).join('');
  const meanY=chartMean>0?yOf(chartMean):0;
  const meanTx=`${L('Ort.','Mean')} ${Math.round(chartMean)} AU`;
  const meanW=meanTx.length*5.6+14;
  const meanLine=chartMean>0?`<line x1="${cGut}" y1="${meanY}" x2="${cTotalW}" y2="${meanY}" stroke="#334155" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.8"/><rect x="${cTotalW-meanW}" y="${meanY-9.5}" width="${meanW}" height="17" rx="5" fill="#f4f5f7" stroke="#cbd5e1" stroke-width="1"/><text x="${cTotalW-meanW/2}" y="${meanY+2.5}" text-anchor="middle" font-size="9" fill="#3b4252" font-weight="700" font-family="'IBM Plex Mono',monospace">${meanTx}</text>`:'';
  const chartSvg=`<svg viewBox="0 0 ${cTotalW} ${cH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-height:190px">${grid}${bars}${meanLine}</svg>`;
  // Monotony flag
  const mF=!monotony?{c:'#8b9099',t:'—'}:monotony>2?{c:'#ff6b5b',t:L('YÜKSEK','HIGH')}:monotony>=1.5?{c:'#f59e0b',t:L('İZLE','WATCH')}:monotony>=1?{c:'#9aab3a',t:L('NORMAL','NORMAL')}:{c:'#5b8cff',t:L('DÜŞÜK','LOW')};
  const monoSay=!monotony?L('Bu hafta için yük verisi yok.','No load recorded for this week.')
    :monotony>2?L('Günler birbirine fazla benziyor — aşırı yüklenme riski.','The days look too alike — overtraining risk.')
    :monotony>=1.5?L('Varyasyon daralıyor — haftayı yakından izle.','Variation is narrowing — watch the week closely.')
    :L('Antrenman yükü bu hafta sağlıklı varyasyon gösteriyor.','Training load shows healthy variation this week.');
  const monotonyBlock=rTotal>0?`<div class="mono-row">
    <div class="mono-chart">
      <div class="mono-h">${L('Haftalık Yük Dağılımı','Weekly Load Distribution')} <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--dim)">· ${L('gerçekleşen yük','realized load')} (AU)</span></div>
      ${chartSvg}
    </div>
    <div class="mono-side">
      <div class="mono-stats">
        <div class="stat"><div class="stat-l">${L('Toplam Yük','Total Load')}</div><div class="stat-v">${Math.round(rTotal)}<span class="stat-u">AU</span></div></div>
        <div class="stat"><div class="stat-l">${L('Ort./sporcu','Mean/ath.')}</div><div class="stat-v">${Math.round(meanLoad)}<span class="stat-u">AU</span></div></div>
        <div class="stat"><div class="stat-l">${L('SS/sporcu','SD/ath.')}</div><div class="stat-v">${sd.toFixed(1)}</div></div>
      </div>
      <div class="mono-big" style="border-color:${mF.c}55;background:${mF.c}12">
        <div class="mono-big-in">
          <div class="mono-big-l">${L('MONOTONİ','MONOTONY')}</div>
          <div class="mono-big-v" style="color:${mF.c}">${monotony.toFixed(2)}</div>
          <span class="mono-big-t" style="background:${mF.c}">${mF.t}</span>
        </div>
        <div class="mono-big-s">${monoSay}<br><span>${L('Zorlanma','Strain')}: <strong>${Math.round(strain)}</strong></span></div>
      </div>
      <div class="mono-help">
        <div class="mono-help-h">${L('Foster Monotonisi = Ortalama / SS','Foster Monotony = Mean / SD')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#10b981"></span><strong>&lt; 1.5</strong> — ${L('Sağlıklı varyasyon','Healthy variation')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#f59e0b"></span><strong>1.5–2.0</strong> — ${L('Yakın takip','Monitor closely')}</div>
        <div class="mono-help-line"><span class="dot" style="background:#ef4444"></span><strong>&gt; 2.0</strong> — ${L('Aşırı (aşırı yüklenme riski)','Excessive (overtraining risk)')}</div>
        <div class="mono-help-line tr-note">${L('Her sporcunun kendi haftası hesaplanıp takım geneline ortalanır — takvimde görünen değerin aynısı.','Each athlete\'s own week, averaged across the squad — the same value the calendar shows.')}</div>
      </div>
    </div>
  </div>`:'';
  // Athletes table (only when athletes provided and have data this week)
  let athleteBlock='';
  if(Array.isArray(athletes)&&athletes.length>0){
    const wkStart=dates[0],wkEnd=dates[6];
    const rows=athletes.map(a=>{
      let aLoad=0,aSess=0,rSum=0,rCnt=0;
      // Pull from athlete's personal srpeLog (Notion-synced or manual entries on profile)
      (a.srpeLog||[]).forEach(e=>{
        if(!e.date||e.date<wkStart||e.date>wkEnd)return;
        // Total AU = sum of TP + S&C + Game session loads for that day
        const tp=Number(e.tpLoad)||0,sc=Number(e.scLoad)||0,gm=Number(e.gameLoad)||0;
        aLoad+=(Number(e.totalLoad)||(tp+sc+gm));
        // Count each non-empty sub-session as one
        [e.tpRPE,e.scRPE,e.gameRPE].forEach(r=>{const n=Number(r);if(n>0){rSum+=n;rCnt++;aSess++;}});
      });
      return{name:a.name,total:aLoad,sess:aSess,meanRPE:rCnt?(rSum/rCnt):0,number:a.number};
    }).filter(r=>r.sess>0).sort((a,b)=>b.total-a.total);
    if(rows.length>0){
      const maxAthLoad=Math.max(...rows.map(r=>r.total),1);
      athleteBlock=`<div class="ath-tbl-wrap">
        <div class="ath-tbl-h">${L('Sporcu Bazında Haftalık sRPE ve Yük','Athlete Weekly sRPE & Load Totals')}</div>
        <table class="ath-tbl"><thead><tr><th style="text-align:left;padding-left:10px">Athlete</th><th>#</th><th>Sessions</th><th>Mean sRPE</th><th>Total Load (AU)</th><th style="width:25%">Distribution</th></tr></thead><tbody>
          ${rows.map(r=>`<tr>
            <td style="text-align:left;font-weight:700;padding-left:10px">${r.name}</td>
            <td>${r.number||'—'}</td>
            <td>${r.sess}</td>
            <td><span class="srpe-cell">${r.meanRPE.toFixed(1)}</span></td>
            <td><strong style="color:#6f7d29">${Math.round(r.total)}</strong></td>
            <td><div class="load-bar-wrap"><div class="load-bar" style="width:${Math.round(r.total/maxAthLoad*100)}%"></div></div></td>
          </tr>`).join('')}
        </tbody></table>
      </div>`;
    }
  }
  // Color per session purpose — the frame round the whole session card, as on the calendar
  const colorOf=printSesColor;
  const labelsFor=exs=>{const c={};return exs.map(ex=>{
    const ss=(ex.superset||'').toString().toUpperCase().trim();
    if(ss){c[ss]=(c[ss]||0)+1;return{tag:ss+c[ss],ss};}
    c._=(c._||0)+1;return{tag:c._+'.',ss:''};});};
  const renderEx=(e,lab)=>`<div class="ex"><span class="ex-no${lab.ss?' ss':''}">${lab.tag}</span><span class="exn">${e.name||''}</span>${(e.sets||e.reps)?`<span class="exr">${e.sets||''}×${e.reps||''}</span>`:''}${e.rpe?`<span class="exl">RPE ${e.rpe}</span>`:''}${e.load?`<span class="exl">@${e.load}</span>`:''}${e.duration?`<span class="exd">${e.duration}</span>`:''}${e.tempo?`<span class="ext">t:${e.tempo}</span>`:''}${e.rest?`<span class="exrr">r:${e.rest}</span>`:''}${exDesc(e)?`<div class="exdesc">${exDesc(e)}</div>`:''}</div>`;
  const renderDay=(date,i)=>{const day=days[date];const ss=day?.sessions||[];const isWeekend=i>=5;
    const dayLoad=rDay[i];   // realized team load for the day (matches chart + monotony)
    return`<td class="day-cell${isWeekend?' weekend':''}">
      <div class="day-head">
        <div class="day-name">${dnL(i)}</div>
        <div class="day-date">${fd(date).slice(0,5)}</div>
      </div>
      ${ss.length===0?`<div class="rest-box">
          <div class="rest-tag">${L('DİNLENME','REST')}</div>
        </div>`:
        /* Only what, when and how long — no RPE (target or logged sRPE) and no goal line. */
        ss.map(s=>{const c=colorOf(s);
          return`<div class="sess" style="border-color:${c}">
          <div class="sess-h"><span class="sess-name">${s.name}</span></div>
          <div class="sess-meta"><span class="sess-time">${s.time}</span><span class="sess-sep"></span><span class="sess-dur">${Number(s.duration)||0} ${L('dk','min')}</span></div>
        </div>`;}).join('')}
      ${ss.length>0?`<div class="day-total"><u>${L('Toplam Yük','Total Load')}</u><b>${Math.round(dayLoad)} AU</b></div>`:''}
      ${day?.dailyNotes?`<div class="day-notes"><em>${day.dailyNotes}</em></div>`:''}
    </td>`;};
  /* The club signs the sheet: a plan that leaves the app on WhatsApp is read next to
     four other clubs' plans, and a crest is how it is told apart at a glance. */
  // The caller may hand in its own crest (the PNG builder passes one it has made drawable).
  const rawCrest=(opts&&opts.logo!==undefined)?opts.logo:teamLogo();
  const crest=hasMedia(rawCrest)?escHTML(mediaSrc(rawCrest)):'';
  const club=escHTML(clubNameNow());
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — ${L('Haftalık Plan','Weekly Plan')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:6mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{height:100%}
:root{--accent:#9aab3a;--bg:#ffffff;--bg2:#f4f5f7;--panel:#ffffff;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
/* The sheet is a picture as often as it is a page, and a picture that runs edge to edge
   reads as a screenshot of something cut off. The page padding is the white frame around
   it — the same on all four sides — and it is what the shared PNG is captured with. */
body{font-family:'Space Grotesk',Arial,sans-serif;font-size:10px;color:var(--text);line-height:1.4;background:#fff;display:flex;flex-direction:column;padding:16px 18px}
.fit{display:flex;flex-direction:column}
.mono{font-family:'IBM Plex Mono',monospace}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:11px;padding:13px 18px;background:#0a0b0d;color:#fff;border-radius:14px;flex:none}
.hdr-l{min-width:0;display:flex;align-items:center;gap:14px}
/* The app's own mark, small, before the team's title — the crest on the right is the club's. */
.hdr-logo{height:18px;width:auto;flex:none;display:block}
.hdr-tx{min-width:0}
.hdr h1{font-size:20px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.hdr .sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;opacity:.66;margin-top:4px;letter-spacing:.02em}
.hdr-r{display:flex;align-items:center;gap:10px;flex:none}
.hstat{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:7px 12px}
.hstat-l{font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,.62);font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.hstat-v{background:var(--accent);color:#0a0b0d;padding:3px 10px;border-radius:7px;font-weight:700;font-size:11.5px;white-space:nowrap}
.hdr-div{width:1px;align-self:stretch;background:rgba(255,255,255,.18);margin:0 2px}
.hdr-club{display:flex;align-items:center;gap:10px;max-width:190px}
.hdr-club img{height:34px;width:auto;max-width:56px;object-fit:contain}
.hdr-club span{font-size:12px;font-weight:700;letter-spacing:.02em;line-height:1.2;text-transform:uppercase}
table{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed}
.day-cell{vertical-align:top;background:#fff;border:1px solid var(--border);border-radius:12px;padding:0;width:14.28%;overflow:hidden}
.day-head{padding:9px 11px 5px;display:flex;justify-content:space-between;align-items:baseline}
.day-name{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)}
.day-date{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dim);font-weight:500}
/* A rest day is not an empty cell: it says what it is. */
.rest-box{padding:26px 10px 30px;text-align:center}
.rest-tag{color:var(--dim);font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.24em}
.sess{background:var(--bg2);border:3px solid var(--border2);border-radius:11px;padding:8px 10px;margin:5px;overflow:hidden}
.sess-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:5px}
.sess-name{font-weight:600;font-size:12.5px;color:var(--text);line-height:1.2;flex:1;word-wrap:break-word;letter-spacing:-.01em}
.sess-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)}
.sess-sep{width:1px;height:11px;background:var(--border2);flex:none}
.sess-time{font-size:13px;font-weight:700;color:var(--text);letter-spacing:.01em}
.sess-dur{font-size:10px;font-weight:600;color:var(--text2)}
.au-pill{background:var(--accent);color:#0a0b0d;padding:1px 7px;border-radius:4px;font-weight:600}
.blk{margin-top:6px}
.blk-h{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:9.5px;letter-spacing:.06em;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid var(--border)}
.ex{margin-bottom:3px;font-size:9.5px;line-height:1.4;padding-left:2px;color:var(--text)}
.exn{font-weight:500;color:var(--text)}
.ex-no{display:inline-block;min-width:20px;padding:1px 5px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;text-align:center;margin-right:5px;background:var(--bg2);color:var(--muted)}
.ex-no.ss{background:var(--accent);color:#0a0b0d}
.exr{margin-left:5px;color:var(--text);font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:9.5px}
.exl{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-weight:500}
.exd{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
.ext{margin-left:4px;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:8.5px}
.exrr{margin-left:4px;color:var(--dim);font-family:'IBM Plex Mono',monospace;font-size:8.5px}
.exdesc{font-size:8.5px;color:var(--dim);line-height:1.35;margin-top:2px;padding-left:4px}
.day-total{margin:5px;padding:7px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;text-align:left}
.day-total u{display:block;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}
.day-total b{display:block;font-size:13px;font-weight:700;color:var(--text);letter-spacing:-.01em;margin-top:2px}
.day-notes{margin:0 4px 4px;padding:4px 6px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;font-size:7px;color:var(--text2);line-height:1.3}
/* Monotony block */
.mono-row{display:flex;gap:12px;margin-top:11px;padding:15px;background:#fff;border:1px solid var(--border);border-radius:14px;page-break-inside:avoid;break-inside:avoid}
.mono-chart{flex:2.2;min-width:0}
.mono-h{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)}
.mono-side{flex:1.6;display:flex;flex-direction:column;gap:8px;min-width:0}
.mono-stats{display:flex;gap:7px}
.stat{flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:10px 11px;text-align:left}
.stat-l{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);text-transform:uppercase;letter-spacing:.09em;font-weight:500}
.stat-v{font-size:19px;font-weight:700;color:var(--text);margin-top:3px;line-height:1;letter-spacing:-.015em}
.stat-u{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);font-weight:500;margin-left:3px}
/* The verdict beside the number that produced it, tinted by the zone it lands in. */
.mono-big{display:flex;align-items:center;gap:14px;border:1px solid var(--border2);border-radius:11px;padding:11px 13px}
.mono-big-in{flex:none;text-align:center;min-width:76px}
.mono-big-l{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);font-weight:500;letter-spacing:.09em;text-transform:uppercase}
.mono-big-v{font-size:30px;font-weight:700;line-height:1;margin:2px 0 4px;color:var(--text);letter-spacing:-.02em}
.mono-big-t{display:inline-block;color:#0a0b0d;font-family:'IBM Plex Mono',monospace;font-size:8px;padding:3px 10px;border-radius:7px;font-weight:600;letter-spacing:.06em;background:var(--accent)}
.mono-big-s{font-size:10px;color:var(--text2);line-height:1.5}
.mono-big-s span{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)}
.mono-help{background:var(--bg2);border:1px solid var(--border);padding:8px 10px;border-radius:8px;font-size:9px;line-height:1.6;color:var(--text2)}
.mono-help-h{font-family:'IBM Plex Mono',monospace;font-weight:500;color:var(--text);margin-bottom:4px;font-size:9px;letter-spacing:.04em}
.mono-help-line{display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap}
.mono-help-line .dot{display:inline-block;width:8px;height:8px;border-radius:2px;flex-shrink:0}
.mono-help-line .tr{color:var(--dim);font-size:8px;margin-left:2px}
.mono-help-line.tr-note{display:block;color:var(--dim);font-size:8px;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid var(--border)}
/* Athletes table */
.ath-tbl-wrap{margin-top:12px;page-break-inside:avoid;break-inside:avoid}
.ath-tbl-h{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding-left:10px;border-left:3px solid var(--accent);line-height:1.5}
.ath-tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;table-layout:fixed}
.ath-tbl th{background:#0a0b0d;color:#fff;padding:7px 8px;font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.08em;text-align:center;text-transform:uppercase}
.ath-tbl td{padding:6px 8px;font-size:10px;border-top:1px solid var(--border);background:#fff;text-align:center;color:var(--text)}
.ath-tbl tr:nth-child(even) td{background:var(--bg2)}
.srpe-cell{display:inline-block;background:#0a0b0d;color:#fff;padding:1px 8px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:9px}
.load-bar-wrap{background:var(--bg2);border:1px solid var(--border);height:10px;border-radius:5px;overflow:hidden;position:relative}
.load-bar{height:100%;background:var(--accent);border-radius:5px}
.footer{margin-top:10px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.06em}
</style></head><body>
<div class="fit">
<div class="hdr">
  <div class="hdr-l">
    <img class="hdr-logo" src="${COACHOS_LOGO}" alt="CoachOS">
    <span class="hdr-div"></span>
    <div class="hdr-tx">
      <h1>${title}</h1>
      <div class="sub">${L('Hafta','Week of')} ${fdL(weekStart)} — ${fdL(dates[6])}</div>
    </div>
  </div>
  <div class="hdr-r">
    <div class="hstat"><span class="hstat-l">${L('Seans','Sessions')}</span><span class="hstat-v">${totalSessions}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Toplam Yük','Total Load')}</span><span class="hstat-v">${Math.round(rTotal)} AU</span></div>
    ${club?`<span class="hdr-div"></span><div class="hdr-club">${crest?`<img src="${crest}" alt="">`:''}<span>${club}</span></div>`
      :(crest?`<span class="hdr-div"></span><div class="hdr-club"><img src="${crest}" alt=""></div>`:'')}
  </div>
</div>
<table>${dates.map(renderDay).join('')}</table>
${monotonyBlock}
</div>
</body></html>`;
  return html;
}
function printWeekA4Land(title,weekStart,days,athletes){
  const w=window.open('','_blank','width=1300,height=900');if(!w)return;
  w.document.write(buildWeekHTMLDoc(title,weekStart,days,athletes));w.document.close();
  printWhenImagesReady(w,{before:fitWeekToPage});
}

/* THE WEEK AS A PICTURE. A plan sent as a paragraph of text is read; a plan sent as the
   sheet itself is recognised — the coach's staff already know that grid. The same HTML
   the printout uses is laid out in an offscreen iframe at A4-landscape width and
   captured with html2canvas, so what lands in WhatsApp is the sheet, not a screenshot of
   part of a screen. It is rendered once at `scale` 2 and that one picture serves both
   the preview on the panel and the file that is downloaded, copied or shared — a second
   pass at preview quality would be a second html2canvas run for the same image. */
/* THE CREST AS A PICTURE html2canvas CAN DRAW. The shared PNG and PDF are drawn by
   html2canvas, which re-loads every cross-origin <img> itself (in CORS mode) and silently
   skips any it cannot load — the crest on the shared sheet came out as an empty 34px box
   between the divider and the club name, while the sidebar showed the same picture.
   Reading the crest into a data URL up front takes that decision away from html2canvas:
   a data URL is always drawn. It is shrunk on the way (the slot is 34-56px,
   drawn at 2x), and PNG keeps a transparent crest transparent on the black header.
   If the crest cannot be read at all the slot is left out, so the sheet shows the club
   name alone rather than a hole.
   Firebase Storage sends no CORS headers on downloads until the bucket is given a CORS
   config, so a crest in Storage cannot be read directly. It is then fetched through
   /api/crest (api/crest.js) on this site's own origin, where no CORS applies. Applying
   cors.json to the bucket makes the first, direct attempt succeed as well:
     gcloud storage buckets update gs://periodization-planner.firebasestorage.app --cors-file=cors.json */
const CREST_PX=240;
const _crestCache=new Map();
const CREST_STORAGE=/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/periodization-planner\.firebasestorage\.app\/o\/users%2F/;
/* The crest's own drawing: shrunk to CREST_PX on the long side, kept as PNG. */
function crestPNG(im){
  let w=im.naturalWidth,h=im.naturalHeight;
  const k=Math.min(1,CREST_PX/Math.max(w,h));w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(im,0,0,w,h);
  return c.toDataURL('image/png');   // throws on a tainted canvas → next attempt
}
/* `render` turns the loaded picture into the data URL that is handed back — the crest's
   PNG by default; the exercise-library PDF passes its own fixed-frame crop. */
function readCrest(src,mode,render){
  return withTimeout(new Promise((res,rej)=>{
    const draw=(url,after)=>{
      const im=new Image();
      if(!/^(data|blob):/i.test(url))im.crossOrigin='anonymous';
      im.onload=()=>{
        try{
          if(!im.naturalWidth||!im.naturalHeight){rej(new Error('empty'));return;}
          res((render||crestPNG)(im));
        }catch(e){rej(e);}
        finally{if(after)after();}
      };
      im.onerror=()=>{if(after)after();rej(new Error('load'));};
      im.src=url;
    };
    if(mode==='direct'){draw(src);return;}
    /* 'proxy': the same file through this site's /api/crest — same origin, no CORS.
       'fresh': fetch it again past the cache. A copy the browser cached from a plain
       <img> may lack the CORS headers a CORS-mode load now needs; 'reload' skips it. */
    const req=mode==='proxy'?fetch('/api/crest?u='+encodeURIComponent(src)):fetch(src,{mode:'cors',cache:'reload'});
    req.then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.blob();})
      .then(b=>{const u=URL.createObjectURL(b);draw(u,()=>URL.revokeObjectURL(u));}).catch(rej);
  }),8000);
}
async function drawableCrest(){
  const raw=teamLogo();
  if(!hasMedia(raw))return '';
  const src=mediaSrc(raw);
  if(!src||src===LM_BLANK)return '';
  if(/^data:image\/(png|jpe?g|gif|webp)/i.test(src))return src;
  if(_crestCache.has(src))return _crestCache.get(src);
  const out=await readDrawable(src);
  if(out)_crestCache.set(src,out);   // a failure is not remembered: the next share tries again
  return out;
}
/* Any picture this app stores, read into a data URL by every route there is — directly,
   through /api/crest when it sits in this app's Storage bucket, then fetched afresh — so
   html2canvas or jsPDF can draw it. '' when none of them can read it. */
async function readDrawable(src,render){
  const modes=['direct'];
  if(CREST_STORAGE.test(src)&&/^https?:$/.test(location.protocol))modes.push('proxy');
  modes.push('fresh');
  for(const m of modes){
    try{return await readCrest(src,m,render);}
    catch(e){console.warn('picture: '+m+' read failed',e);}
  }
  return '';
}
async function buildWeekImageBlob(title,weekStart,days,athletes,scale=2){
  const logo=await drawableCrest();
  const html=buildWeekHTMLDoc(title,weekStart,days,athletes,{logo});
  const W=1123;   // 297mm at 96dpi — A4 landscape
  const iframe=document.createElement('iframe');
  iframe.style.cssText=`position:fixed;left:-9999px;top:0;width:${W}px;height:1px;border:none;visibility:hidden`;
  document.body.appendChild(iframe);
  try{
    const idoc=iframe.contentDocument||iframe.contentWindow.document;
    idoc.open();idoc.write(html);idoc.close();
    await new Promise(r=>setTimeout(r,50));
    try{if(idoc.fonts&&idoc.fonts.ready)await idoc.fonts.ready;}catch(e){}
    const imgs=Array.from(idoc.images||[]);
    await Promise.all(imgs.map(im=>im.complete?Promise.resolve():new Promise(rs=>{im.onload=rs;im.onerror=rs;})));
    const contentH=Math.max(idoc.body.scrollHeight,idoc.documentElement.scrollHeight,320);
    iframe.style.height=contentH+'px';
    await new Promise(r=>setTimeout(r,80));
    const canvas=await window.html2canvas(idoc.body,{
      scale,useCORS:true,backgroundColor:'#ffffff',logging:false,
      windowWidth:W,width:W,height:contentH});
    return await new Promise(res=>canvas.toBlob(b=>res(b),'image/png'));
  } finally {
    document.body.removeChild(iframe);
  }
}

/* The weekly sheet is one A4 landscape page by design: the week grid and the load
   distribution block belong on the coach's single sheet. A busy week grows the grid
   past the page and pushes the chart onto a second page, so the whole sheet is
   measured against the printable area and zoomed down until it fits. */
const RPT_WK_PAGE_W='285mm';                 // A4 landscape (297mm) minus the 6mm @page margins
const RPT_WK_PAGE_H=198/25.4*96;             // 210mm minus the same margins, in CSS px
const RPT_WK_FIT_MIN=0.55;
function fitWeekToPage(w){
  const doc=w.document,box=doc.querySelector('.fit');
  if(!box)return;
  const body=doc.body,prevW=body.style.width;
  body.style.width=RPT_WK_PAGE_W;
  try{
    let k=1;
    /* Zoom reflows rather than scaling pixels, so height does not fall exactly in
       step with it — a couple of passes settle it. */
    for(let i=0;i<4;i++){
      const h=box.getBoundingClientRect().height;
      if(h<=RPT_WK_PAGE_H)break;
      k=Math.max(RPT_WK_FIT_MIN,k*(RPT_WK_PAGE_H/h));
      box.style.zoom=k;
      if(k<=RPT_WK_FIT_MIN)break;
    }
  }finally{body.style.width=prevW;}
}

/* A session's colour on paper — the calendar's own rule: the card colour the coach
   picked wins, otherwise the load type's hue (the neuromuscular yellow a shade deeper so
   it still reads on white). Shared by the weekly and the monthly sheet. */
function printSesColor(s){
  if(s&&s.color)return cardCol(s.color);
  const t=((s&&s.loadType)||'').toLowerCase();
  if(t.includes('mechanical'))return'#0094ff';
  if(t.includes('metabolic'))return'#5b8cff';
  if(t.includes('neuromuscular'))return'#f59e0b';
  if(t.includes('cognitive'))return'#ff6b5b';
  return'#8b9099';
}

/* ═══ THE MONTH, BY QUALITY ═══
   Which qualities the month's sessions were written to train, week by week. A session
   counts once under every focus it carries (so a Strength + Power session is one
   Strength session and one Power session), and its minutes are shared out evenly among
   those focuses — so the minutes column adds up to the month's real training time
   while the session counts say how often each quality came round. Sub-focuses are
   tallied under the focus that owns them. A session with no recognised focus is kept
   in an "Other" row rather than dropped, so the table always accounts for every
   session on the calendar.
   Weeks are the calendar's own Monday–Sunday weeks, clipped to the month: the first
   and last may be short, and say so in their label. */
function monthFocusLoad(days,yr,mo){
  const first=new Date(yr,mo,1),dim=new Date(yr,mo+1,0).getDate();
  const weeks=[];
  for(let d=1;d<=dim;){
    const dt=new Date(yr,mo,d);const dow=(dt.getDay()+6)%7;
    const end=Math.min(dim,d+(6-dow));
    weeks.push({from:d,to:end});d=end+1;
  }
  const rowsBy={};const order=[...SESSION_FOCUS,'__other'];
  const row=id=>rowsBy[id]||(rowsBy[id]={id,weeks:weeks.map(()=>({n:0,min:0})),n:0,min:0,subs:{}});
  let sessions=0,minutes=0,trainDays=0;
  for(let d=1;d<=dim;d++){
    const ss=((days||{})[fmt(new Date(yr,mo,d))]||{}).sessions||[];
    if(ss.length)trainDays++;
    const wi=weeks.findIndex(w=>d>=w.from&&d<=w.to);
    ss.forEach(x=>{
      sessions++;
      const dur=Math.max(0,Number(x.duration)||0);minutes+=dur;
      const fs=sesFocus(x);const ids=fs.length?fs:['__other'];
      ids.forEach(id=>{const r=row(id);r.n++;r.min+=dur/ids.length;r.weeks[wi].n++;r.weeks[wi].min+=dur/ids.length;});
      sesSubFocus(x).forEach(sub=>{const own=SUBFOCUS_OWNER[sub];if(!own||!rowsBy[own])return;
        rowsBy[own].subs[sub]=(rowsBy[own].subs[sub]||0)+1;});
    });
  }
  const rows=order.filter(id=>rowsBy[id]).map(id=>{const r=rowsBy[id];return{
    ...r,min:Math.round(r.min),weeks:r.weeks.map(w=>({n:w.n,min:Math.round(w.min)})),
    share:minutes>0?r.min/minutes:(sessions>0?r.n/sessions:0),
    subs:Object.entries(r.subs).sort((a,b)=>b[1]-a[1])};});
  return{weeks,rows,sessions,minutes,trainDays,restDays:dim-trainDays,days:dim,first:fmt(first)};
}
const focusColor=id=>(FOCUS_BY[id]&&FOCUS_BY[id].c)||'#8b9099';
const focusName=id=>id==='__other'?L('Diğer / belirtilmemiş','Other / unspecified'):focusLabel(id);
/* Minutes as the coach says them: "4 sa 30 dk", "45 dk". */
const fmtMin=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;
  return h?`${h} ${L('sa','h')}${r?` ${r} ${L('dk','min')}`:''}`:`${r} ${L('dk','min')}`;};

/* The month on paper: the calendar grid on the first A4 landscape page, the loading
   table on the second. The same header the weekly sheet wears — CoachOS on the left,
   the club on the right — so the two read as one set. */
function buildMonthHTMLDoc(title,yr,mo,days){
  const ML=REPORT_LANG==='tr'?MN_TR:MN_EN;
  const monthName=`${ML[mo]} ${yr}`;
  const F=monthFocusLoad(days,yr,mo);
  const first=new Date(yr,mo,1),off=(first.getDay()+6)%7;
  const cells=[];for(let i=0;i<off;i++)cells.push(null);
  for(let d=1;d<=F.days;d++)cells.push(d);
  while(cells.length%7)cells.push(null);
  const MAX_IN_CELL=4;
  const cellHTML=d=>{
    if(d==null)return`<td class="mc out"></td>`;
    const dt=new Date(yr,mo,d);const k=fmt(dt);const ss=((days||{})[k]||{}).sessions||[];
    const wk=(dt.getDay()+6)%7>=5;
    const items=ss.slice(0,MAX_IN_CELL).map(x=>`<div class="ms" style="border-color:${printSesColor(x)}">
      <span class="ms-n">${escHTML(x.name||L('Seans','Session'))}</span>
      <span class="ms-t">${escHTML(x.time||'')}${x.time&&Number(x.duration)?' · ':''}${Number(x.duration)?`${Number(x.duration)}′`:''}</span></div>`).join('');
    const more=ss.length>MAX_IN_CELL?`<div class="ms-more">+${ss.length-MAX_IN_CELL} ${L('seans daha','more')}</div>`:'';
    return`<td class="mc${wk?' wk':''}${ss.length?'':' rest'}"><div class="mc-d">${d}</div>${items}${more}${ss.length?'':`<div class="mc-rest">${L('DİNLENME','REST')}</div>`}</td>`;
  };
  const rowsHTML=[];for(let i=0;i<cells.length;i+=7)rowsHTML.push(`<tr>${cells.slice(i,i+7).map(cellHTML).join('')}</tr>`);
  const wkLbl=w=>w.from===w.to?`${w.from}`:`${w.from}–${w.to}`;
  const maxShare=Math.max(...F.rows.map(r=>r.share),0.0001);
  const tableRows=F.rows.map(r=>{const c=focusColor(r.id);return`<tr>
      <td class="q"><span class="qd" style="background:${c}"></span><b>${escHTML(focusName(r.id))}</b>
        ${r.subs.length?`<div class="subs">${r.subs.map(([n,k])=>`<span>${escHTML(n)}${k>1?` <i>×${k}</i>`:''}</span>`).join('')}</div>`:''}</td>
      ${r.weeks.map(w=>w.n?`<td class="wc on" style="background:${c}14"><b>${w.n}</b><small>${w.min?fmtMin(w.min):'—'}</small></td>`:`<td class="wc">·</td>`).join('')}
      <td class="tot"><b>${r.n}</b></td>
      <td class="tot">${fmtMin(r.min)}</td>
      <td class="shr"><div class="bar"><i style="width:${Math.round(r.share/maxShare*100)}%;background:${c}"></i></div><span>${Math.round(r.share*100)}%</span></td>
    </tr>`;}).join('');
  const wkTotals=F.weeks.map((w,i)=>{
    let n=0,min=0;for(let d=w.from;d<=w.to;d++){const ss=((days||{})[fmt(new Date(yr,mo,d))]||{}).sessions||[];n+=ss.length;ss.forEach(x=>{min+=Math.max(0,Number(x.duration)||0);});}
    return`<td class="wc"><b>${n}</b><small>${fmtMin(min)}</small></td>`;}).join('');
  const crest=hasMedia(teamLogo())?escHTML(mediaSrc(teamLogo())):'';
  const club=escHTML(clubNameNow());
  const hdr=sub=>`<div class="hdr">
  <div class="hdr-l"><img class="hdr-logo" src="${COACHOS_LOGO}" alt="CoachOS"><span class="hdr-div"></span>
    <div class="hdr-tx"><h1>${escHTML(title)}</h1><div class="sub">${sub}</div></div></div>
  <div class="hdr-r">
    <div class="hstat"><span class="hstat-l">${L('Seans','Sessions')}</span><span class="hstat-v">${F.sessions}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Antrenman günü','Training days')}</span><span class="hstat-v">${F.trainDays}</span></div>
    <div class="hstat"><span class="hstat-l">${L('Süre','Time')}</span><span class="hstat-v">${fmtMin(F.minutes)}</span></div>
    ${club||crest?`<span class="hdr-div"></span><div class="hdr-club">${crest?`<img src="${crest}" alt="">`:''}${club?`<span>${club}</span>`:''}</div>`:''}
  </div></div>`;
  const dn=Array.from({length:7},(_,i)=>`<th>${dnL(i)}</th>`).join('');
  return`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHTML(title)} — ${monthName}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><style>
@page{size:A4 landscape;margin:6mm}
${RPT_FONT}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--accent:#9aab3a;--bg2:#f4f5f7;--border:#e5e7eb;--border2:#cbd5e1;--text:#0a0b0d;--text2:#3b4252;--muted:#5c626c;--dim:#8b9099}
body{font-family:'Space Grotesk',Arial,sans-serif;font-size:10px;color:var(--text);line-height:1.35;background:#fff;padding:14px 16px}
.pg{break-after:page;page-break-after:always}
.pg:last-child{break-after:auto;page-break-after:auto}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px;padding:12px 18px;background:#0a0b0d;color:#fff;border-radius:14px}
.hdr-l{min-width:0;display:flex;align-items:center;gap:14px}
.hdr-logo{height:18px;width:auto;flex:none;display:block}
.hdr h1{font-size:19px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.hdr .sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;opacity:.66;margin-top:4px}
.hdr-r{display:flex;align-items:center;gap:9px;flex:none}
.hstat{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:6px 11px}
.hstat-l{font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,.62);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase}
.hstat-v{background:var(--accent);color:#0a0b0d;padding:3px 9px;border-radius:7px;font-weight:700;font-size:11px;white-space:nowrap}
.hdr-div{width:1px;align-self:stretch;background:rgba(255,255,255,.18);margin:0 2px}
.hdr-club{display:flex;align-items:center;gap:10px;max-width:190px}
.hdr-club img{height:34px;width:34px;object-fit:contain}
.hdr-club span{font-size:12px;font-weight:700;letter-spacing:.02em;line-height:1.2;text-transform:uppercase}
/* The grid */
.cal{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed}
.cal th{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:left;padding:0 8px 2px}
.mc{vertical-align:top;border:1px solid var(--border);border-radius:10px;padding:6px 6px 7px;height:80px;background:#fff}
.mc.wk{background:#fafbfc}
.mc.out{border:none;background:none}
.mc-d{font-size:12px;font-weight:700;margin:0 2px 4px}
.ms{border:2px solid var(--border2);border-radius:7px;padding:3px 6px;margin-top:3px;background:var(--bg2)}
.ms-n{display:block;font-size:9.5px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-t{display:block;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted);margin-top:1px}
.ms-more{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--dim);margin:3px 2px 0}
.mc-rest{font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.2em;color:var(--dim);text-align:center;margin-top:18px}
/* The loading table */
.lt-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:4px 2px 9px}
.lt-h h2{font-size:15px;font-weight:700;letter-spacing:-.01em}
.lt-h p{font-size:9.5px;color:var(--muted);max-width:560px;text-align:right}
.lt{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;table-layout:fixed}
.lt th{background:#0a0b0d;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:8px 6px;text-align:center}
.lt th.q{text-align:left;padding-left:12px;width:30%}
.lt th small{display:block;opacity:.6;font-size:8px;letter-spacing:.02em;text-transform:none;margin-top:2px}
.lt td{border-top:1px solid var(--border);padding:7px 6px;text-align:center;vertical-align:middle}
.lt td.q{text-align:left;padding-left:12px}
.lt td.q b{font-size:11px}
.qd{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:0}
.subs{display:flex;flex-wrap:wrap;gap:3px 5px;margin:4px 0 0 16px}
.subs span{font-size:8.5px;color:var(--text2);background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:1px 5px}
.subs i{font-style:normal;color:var(--dim);font-family:'IBM Plex Mono',monospace}
.wc{color:var(--dim)}
.wc b{display:block;font-size:12px;color:var(--text)}
.wc small{display:block;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted)}
.tot{font-size:10.5px;white-space:nowrap}
.tot b{font-size:12px}
.shr{white-space:nowrap}
.shr .bar{display:inline-block;width:62%;height:7px;border-radius:4px;background:var(--bg2);border:1px solid var(--border);overflow:hidden;vertical-align:middle}
.shr .bar i{display:block;height:100%;border-radius:4px}
.shr span{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;margin-left:6px;vertical-align:middle}
.lt tr.sum td{background:var(--bg2);font-weight:600}
.lt-none{border:1px dashed var(--border2);border-radius:12px;padding:30px;text-align:center;color:var(--muted);font-size:11px}
.lt-foot{margin-top:8px;font-size:8.5px;color:var(--dim);line-height:1.5}
</style></head><body>
<section class="pg fit">
${hdr(`${monthName} · ${L('Aylık plan','Monthly plan')}`)}
<table class="cal"><thead><tr>${dn}</tr></thead><tbody>${rowsHTML.join('')}</tbody></table>
</section>
<section class="pg fit">
${hdr(`${monthName} · ${L('Özelliklere göre yüklenme','Loading by quality')}`)}
<div class="lt-h"><h2>${L('Ay boyunca yüklenilen özellikler','Qualities loaded across the month')}</h2>
  <p>${L('Her hücre: o hafta o özelliğe ayrılan seans sayısı ve süresi. Birden fazla hedefi olan seans her hedefte bir kez sayılır; süresi hedefler arasında eşit paylaştırılır.',
    'Each cell: sessions given to that quality that week, and their time. A session with several goals counts once under each; its time is split evenly between them.')}</p></div>
${F.rows.length?`<table class="lt"><thead><tr><th class="q">${L('Özellik','Quality')}</th>
  ${F.weeks.map((w,i)=>`<th>${L('Hafta','Week')} ${i+1}<small>${wkLbl(w)} ${ML[mo].slice(0,3)}</small></th>`).join('')}
  <th>${L('Seans','Sessions')}</th><th>${L('Süre','Time')}</th><th style="width:15%">${L('Pay','Share')}</th></tr></thead>
  <tbody>${tableRows}
  <tr class="sum"><td class="q"><b>${L('Toplam','Total')}</b></td>${wkTotals}<td class="tot"><b>${F.sessions}</b></td><td class="tot">${fmtMin(F.minutes)}</td><td class="shr"></td></tr>
  </tbody></table>`:`<div class="lt-none">${L('Bu ay takvimde seans yok.','No sessions on the calendar this month.')}</div>`}
<div class="lt-foot">${L(`Antrenman günü ${F.trainDays} · Dinlenme günü ${F.restDays} · Pay, süreye göre (süre girilmemişse seans sayısına göre) hesaplanır.`,
  `Training days ${F.trainDays} · Rest days ${F.restDays} · Share is by time (by session count when no time was entered).`)}</div>
</section>
</body></html>`;
}
/* Each page of the monthly sheet is fitted to the paper on its own — a busy month grows
   the grid, and it must shrink rather than spill onto the table's page. The body's own
   padding sits on the paper too, so it comes off the height a page may take, with a few
   pixels to spare for rounding. */
function fitPagesToPaper(w){
  const doc=w.document,body=doc.body,prevW=body.style.width;
  const cs=w.getComputedStyle(body);
  const maxH=RPT_WK_PAGE_H-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-6;
  body.style.width=RPT_WK_PAGE_W;
  try{doc.querySelectorAll('.fit').forEach(box=>{
    let k=1;
    for(let i=0;i<4;i++){
      const h=box.getBoundingClientRect().height;
      if(h<=maxH)break;
      k=Math.max(RPT_WK_FIT_MIN,k*(maxH/h));
      box.style.zoom=k;
      if(k<=RPT_WK_FIT_MIN)break;
    }});
  }finally{body.style.width=prevW;}
}
function printMonthA4Land(title,yr,mo,days){
  const w=window.open('','_blank','width=1300,height=900');if(!w)return;
  w.document.write(buildMonthHTMLDoc(title,yr,mo,days));w.document.close();
  printWhenImagesReady(w,{before:fitPagesToPaper});
}

/* =========================================================
   UNICODE FONT LOADER (Roboto via CDN)
   jsPDF's default Helvetica only supports WinAnsi (CP1252) which
   lacks Turkish-specific glyphs (İ, ı, Ğ, ğ, Ş, ş). Loading a
   real TTF via fetch + addFileToVFS gives us full Unicode support.
   Cached after first load so PDF generation is fast on subsequent calls.
   ========================================================= */
let _ttfCache=null;let _ttfPending=null;
function _b64FromBuffer(buf){const u8=new Uint8Array(buf);let bin='';const C=0x8000;
  for(let i=0;i<u8.length;i+=C)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+C));return btoa(bin);}
async function _fetchUnicodeFont(){
  const urls=[
    'https://cdn.jsdelivr.net/gh/google/fonts/apache/roboto/static/Roboto-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto-3-classic@main/src/hinted/Roboto-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/dejavu-fonts/dejavu-fonts-ttf@2.37/ttf/DejaVuSans.ttf',
  ];
  for(const u of urls){
    try{const r=await fetch(u);if(!r.ok)continue;
      const buf=await r.arrayBuffer();return _b64FromBuffer(buf);
    }catch(e){console.warn('Font URL failed:',u,e.message);}
  }
  throw new Error('All font CDNs failed');
}
async function applyTurkishFont(doc){
  try{
    if(!_ttfCache){
      if(!_ttfPending)_ttfPending=_fetchUnicodeFont();
      _ttfCache=await _ttfPending;
    }
    doc.addFileToVFS('Roboto-Regular.ttf',_ttfCache);
    doc.addFont('Roboto-Regular.ttf','Roboto','normal');
    doc.addFont('Roboto-Regular.ttf','Roboto','bold');
    doc.setFont('Roboto');
    return'Roboto';
  }catch(e){
    console.warn('Unicode font unavailable, falling back to Helvetica:',e.message);
    return'helvetica';
  }
}

/* =========================================================
   PDF BLOB BUILDER (for Share button)
   Renders the SAME HTML that the Print button uses, captures it
   with html2canvas, then embeds the resulting image into a multi-page
   A4 PDF via jsPDF. This guarantees Print and Share produce identical
   output — Turkish characters, photos, and layout all match exactly.
   ========================================================= */
async function buildSessionPDFBlob(title,subtitle,sessions){
  const logo=await drawableCrest();
  const html=buildSessionHTMLDoc(title,subtitle,sessions,{logo});
  // Offscreen iframe rendered at A4 width (794px ≈ 210mm @ 96dpi)
  const iframe=document.createElement('iframe');
  iframe.style.cssText='position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;visibility:hidden';
  document.body.appendChild(iframe);
  try{
    const idoc=iframe.contentDocument||iframe.contentWindow.document;
    idoc.open();idoc.write(html);idoc.close();
    // Wait for the iframe to settle and any images to load
    await new Promise(r=>setTimeout(r,50));
    // Make sure the Archivo webfont is loaded before capture so the PDF matches the site.
    try{if(idoc.fonts&&idoc.fonts.ready)await idoc.fonts.ready;}catch(e){}
    const imgs=Array.from(idoc.images||[]);
    await Promise.all(imgs.map(im=>im.complete?Promise.resolve():new Promise(rs=>{im.onload=rs;im.onerror=rs;})));
    // Match iframe height to content so html2canvas can capture full body
    const contentH=Math.max(idoc.body.scrollHeight,idoc.documentElement.scrollHeight);
    iframe.style.height=contentH+'px';
    await new Promise(r=>setTimeout(r,80));

    // Capture body to high-DPI canvas
    const canvas=await window.html2canvas(idoc.body,{
      scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,
      windowWidth:794,width:794,height:contentH,
    });

    // Slice the canvas into A4-portrait pages
    const{jsPDF}=window.jspdf;
    const pdf=new jsPDF('p','mm','a4');
    const pageW=210,pageH=297;
    const ratio=canvas.width/794;            // px-per-mm-equivalent scaling
    const pxPerMm=canvas.width/pageW;        // canvas px per mm
    const pageHpx=Math.floor(pageH*pxPerMm); // height of one A4 page in canvas px
    let yOffset=0;
    while(yOffset<canvas.height){
      const sliceH=Math.min(pageHpx,canvas.height-yOffset);
      const slice=document.createElement('canvas');
      slice.width=canvas.width;slice.height=sliceH;
      slice.getContext('2d').drawImage(canvas,0,yOffset,canvas.width,sliceH,0,0,canvas.width,sliceH);
      const img=slice.toDataURL('image/jpeg',0.92);
      if(yOffset>0)pdf.addPage();
      pdf.addImage(img,'JPEG',0,0,pageW,sliceH/pxPerMm);
      yOffset+=sliceH;
    }
    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

/* =========================================================
   GENERIC SHARE (cross-platform)
   Uses Web Share API Level 2 (file attachment) when available —
   on mobile this opens the native sheet (WhatsApp, Telegram,
   Mail, AirDrop, etc.). On desktop Chromium it uses the OS
   share sheet. Falls back to plain PDF download otherwise.
   ========================================================= */
async function shareTrainingPDF({title,subtitle,sessions,athleteName}){
  const blob=await buildSessionPDFBlob(title,subtitle,sessions);
  const safeName=(athleteName||'training').replace(/[^a-zA-Z0-9_-]/g,'_');
  const filename=`${safeName}_${fmt(today)}.pdf`;
  const file=new File([blob],filename,{type:'application/pdf'});

  // Path 1 — native Web Share with file
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file],title:`${athleteName||'Training Plan'}`,text:subtitle});
      return{ok:true,method:'native-share'};
    }catch(e){
      if(e.name==='AbortError')return{ok:false,cancelled:true};
      // fall through to download
    }
  }

  // Path 2 — fallback: download so user can attach manually
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  return{ok:true,method:'download'};
}

/* Share icon (inline SVG) */
const ShareIcon=({size=14})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{verticalAlign:'middle',marginRight:4}}><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>);

/* =========================================================
   COACH REPORT (PDF)
   ========================================================= */
async function generateCoachReport(teamName,periodLabel,days,weeks,monthWeeks,pMix,acwrVal){
  const{jsPDF}=window.jspdf;const doc=new jsPDF();
  const fontName=await applyTurkishFont(doc);
  // header
  doc.setFillColor(8,145,178);doc.rect(0,0,210,28,'F');
  doc.setTextColor(255);doc.setFontSize(18);doc.text(teamName,14,14);
  doc.setFontSize(11);doc.text(`${L('Koç Raporu','Coach Report')} — ${periodLabel}`,14,22);
  doc.setTextColor(40);
  // metrics
  doc.setFontSize(11);doc.setFont(fontName,'bold');doc.text(L('Temel Göstergeler','Key Metrics'),14,38);doc.setFont(fontName,'normal');
  doc.setFontSize(10);
  doc.text(`${L('ACWR (bugün)','ACWR (today)')}: ${acwrVal.toFixed(2)}  ${acwrVal>1.5?L('(YÜKSEK RİSK)','(HIGH RISK)'):acwrVal>=.8&&acwrVal<=1.3?L('(güvenli)','(safe)'):L('(düşük)','(low)')}`,14,46);
  doc.text(`${L('Toplam yük','Total load')}: ${Math.round(monthWeeks.reduce((a,b)=>a+b.total,0))} AU`,14,52);
  doc.text(`${L('Ortalama haftalık monotoni','Mean weekly monotony')}: ${(monthWeeks.filter(w=>w.monotony>0).reduce((a,b)=>a+b.monotony,0)/Math.max(1,monthWeeks.filter(w=>w.monotony>0).length)).toFixed(2)}`,14,58);
  // weekly table
  doc.autoTable({startY:66,head:[[L('Hafta başı','Week starting'),L('Toplam AU','Total AU'),L('Ort.','Mean'),L('SS','SD'),L('Monotoni','Monotony'),L('Zorlanma','Strain'),L('Durum','Flag')]],
    body:monthWeeks.map(w=>[fd(w.wkStart),Math.round(w.total),w.mean.toFixed(0),w.sd.toFixed(1),w.monotony.toFixed(2),Math.round(w.strain),!w.monotony?'—':w.monotony>2?L('YÜKSEK','HIGH'):w.monotony>=1.5?L('İZLE','WATCH'):w.monotony>=1?L('NORMAL','NORMAL'):L('DÜŞÜK','LOW')]),
    headStyles:{font:fontName,fillColor:[8,145,178]},styles:{font:fontName,fontSize:9}});
  // purpose mix
  if(pMix.length){doc.autoTable({head:[[L('Antrenman Türü','Training Purpose'),L('Dakika','Minutes'),L('% toplam','% of total')]],
    body:pMix.map(p=>[p.label,p.min,p.pct.toFixed(1)+'%']),headStyles:{font:fontName,fillColor:[139,92,246]},styles:{font:fontName,fontSize:9}});}
  doc.save(`${teamName.replace(/\s+/g,'_')}_report_${periodLabel.replace(/[\s/]+/g,'_')}.pdf`);
}

