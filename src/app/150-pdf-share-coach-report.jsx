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
  await needLibs('html2canvas','jspdf');
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
  await needLibs('jspdf','autotable');
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

