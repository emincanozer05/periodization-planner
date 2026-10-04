/* =========================================================
   PROGRAM INDIVIDUALIZATION — one source session, one editable sheet per athlete.

   There is no rule engine here and no automatic adjustment of any kind. A source
   session (a Template or a team-plan session) is copied verbatim onto every
   selected athlete, and the coach edits whatever needs editing: the exercise, its
   superset group, sets, reps, time, tempo, RPE, load, rest and a per-athlete note.
   Nothing is substituted, scaled, floored or flagged behind the coach's back.

   What the screen DOES do is put the athlete's own reported numbers next to the
   sheet — readiness, soreness, fatigue, yesterday's RPE and internal load, and
   whatever they typed into the check-in's pain box — so the coach has the context
   to make those edits without leaving the card. Reading it is the coach's job;
   acting on it is the coach's decision.
   ========================================================= */

/* Pain / restriction tags. `kw` drives the (opt-in) note → tag suggestion in the
   athlete profile; the coach approves each one, nothing is auto-assigned. */
const CONSTRAINT_TAGS=[
  {id:'knee',     label:'Knee',            kw:['diz','knee','patell','menisk','çapraz bağ','acl','pcl','jumper','quadriceps','ön uyluk','dış uyluk','quad']},
  {id:'back',     label:'Back / Lower back',kw:['sırt','bel ','bel,','beli','lomber','lumbar','disk','omurga','back pain','spine','fıtık','sakrum','kuyruk sokumu','sacrum','tailbone']},
  {id:'shoulder', label:'Shoulder',        kw:['omuz','shoulder','rotator','sıkışma','impingement','supraspinatus']},
  {id:'ankle',    label:'Ankle',           kw:['ayak bileği','ankle','burkulma','sprain','aşil','achilles','baldır','calf','tibialis','kaval','shin','topuk','heel','ayak tabanı','plantar','ayak üstü','ayak parmak']},
  {id:'hip',      label:'Hip / Groin',     kw:['kalça','hip','kasık','groin','adduktor','adductor']},
  {id:'hamstring',label:'Hamstring',       kw:['hamstring','arka bacak','biceps femoris']},
  {id:'neck',     label:'Head / Neck',     kw:['baş ','çene','boyun','ense ','head','jaw','neck','whiplash']},
  {id:'trunk',    label:'Chest / Ribs / Abdomen',kw:['göğüs','kaburga','yan gövde','karın','chest','ribs','rib ','abdom','oblik','oblique']},
  {id:'wrist',    label:'Wrist / Elbow',   kw:['el bileği','wrist','dirsek','elbow','üst kol','ön kol','upper arm','forearm','sağ el ','sol el ','sağ parmaklar ','sol parmaklar ']},
];
const ctLabel=id=>((CONSTRAINT_TAGS.find(t=>t.id===id)||{}).label)||id;
/* The same regions in Turkish, for the screens and the files written in Turkish. The id
   and the English label above stay the stored, canonical value. */
const CT_LABEL_TR={knee:'Diz',back:'Sırt / Bel',shoulder:'Omuz',ankle:'Ayak Bileği',hip:'Kalça / Kasık',
  hamstring:'Hamstring',neck:'Baş / Boyun',trunk:'Göğüs / Kaburga / Karın',wrist:'El Bileği / Dirsek'};
const ctLabelIn=(id,tr)=>tr?(CT_LABEL_TR[id]||ctLabel(id)):ctLabel(id);

/* Which movement patterns a pain region loads (`hit`), where work is usually
   redirected instead (`prefer`), and the wording that marks a friendlier variation
   (`kw`). Reference material for the coach and for the daily check-in's region
   picker — the program screen never acts on it by itself. */
const PAIN_RULES={
  knee:     {hit:['Squat','Lunge / Unilateral','Jump / Plyo'],       prefer:['Hinge','Core / Brace','Pull','Push'], kw:['rdl','hip thrust','trap bar','glute','kalça köprüsü','leg curl','sled']},
  back:     {hit:['Hinge','Carry','Rotation','Squat'],               prefer:['Push','Pull','Core / Brace'],         kw:['destekli','supported','makine','machine','leg press','goblet','nötr']},
  shoulder: {hit:['Push','Pull','Rotation'],                         prefer:['Core / Brace','Hinge','Squat'],       kw:['nötr','neutral','landmine','dumbbell','kablo','cable']},
  ankle:    {hit:['Jump / Plyo','Sprint / Locomotion','Squat','Lunge / Unilateral'],prefer:['Hinge','Push','Pull','Core / Brace'],kw:['hip thrust','rdl','leg curl','oturarak','bisiklet']},
  hip:      {hit:['Hinge','Lunge / Unilateral','Rotation','Squat'],  prefer:['Push','Pull','Core / Brace'],         kw:['izometrik','destekli','makine','wall sit']},
  hamstring:{hit:['Hinge','Sprint / Locomotion','Jump / Plyo'],      prefer:['Squat','Push','Core / Brace'],        kw:['goblet','box','leg press','izometrik']},
  neck:     {hit:['Carry','Push','Rotation','Jump / Plyo'],           prefer:['Lunge / Unilateral','Core / Brace','Mobility'],kw:['destekli','supported','makine','machine','oturarak']},
  trunk:    {hit:['Rotation','Core / Brace','Carry','Push'],         prefer:['Squat','Lunge / Unilateral','Mobility'],kw:['makine','machine','destekli','supported','izometrik']},
  wrist:    {hit:['Push','Pull','Carry'],                            prefer:['Squat','Hinge','Core / Brace'],       kw:['makine','kayış','strap','landmine']},
};

/* Movement patterns carried by the library. An entry can carry one explicitly
   (`movePattern`); when it doesn't, one is inferred from its Exercise Type. */
const IV_PATTERNS=['Squat','Hinge','Lunge / Unilateral','Push','Pull','Carry','Rotation','Jump / Plyo','Sprint / Locomotion','Core / Brace','Mobility'];
const PATTERN_FROM_TYPE={'Upper Body Push':'Push','Upper Body Pull':'Pull','Hip Dominant':'Hinge','Knee Dominant':'Squat',
  'Core':'Core / Brace','Plyometric':'Jump / Plyo','Multi Directional Speed':'Sprint / Locomotion','Medicine Ball':'Rotation',
  'Mobility':'Mobility','Warm-Up':'Mobility','Full Body':'Squat'};
const exPatternOf=e=>(e&&(e.movePattern||(e.pattern==='Unilateral'?'Lunge / Unilateral':'')||PATTERN_FROM_TYPE[e.type]))||'';
const exContraOf=e=>(e&&Array.isArray(e.contra))?e.contra:[];
/* The exercise's own picture — the one the coach pastes on the library entry (`image`),
   else the one a program row remembered (`planImage`) or the old Program Image control set
   (`thumb`): all three are a picture the coach put on this exercise. The library card and
   the library PDF both show this one. */
const exPicture=e=>(e&&(e.image||e.planImage||e.thumb))||'';
/* The library laid out as sections and cards, in the app's language — what the PDF is
   drawn from. One card per exercise under its category, categories in the shelf's own
   order, uncategorised ones last. The headings, the filter names and values, and the
   description (`descOf` hands in the description already in that language) are
   translated; `movement_pattern` is the one value that is never translated — it is the
   word the programme JSON uses, so it can be copied across unchanged. Only what the entry
   actually carries becomes a field. A `wide` field (muscles, contraindications) runs the
   width of the card; the others sit three to a row. */
function exLibraryEntries(list,opts){
  const o=opts||{};
  const tr=o.lang==='tr';
  const T=(a,b)=>tr?a:b;
  const lab=s=>tr?(EX_TERM_TR[s]||s):s;
  const subs=o.ball?BALL_SUB_TYPES:SUB_TYPES;
  const types=o.ball?BALL_TYPES:EX_TYPES;
  const one=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  const cap=(v,n)=>{const s=one(v);return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;};
  const items=(Array.isArray(list)?list:[]).filter(e=>e&&one(e.name));
  const byType={};
  items.forEach(e=>{const t=types.includes(e.type)?e.type:'Uncategorized';(byType[t]=byType[t]||[]).push(e);});
  const sections=[];
  [...types,'Uncategorized'].forEach(t=>{
    const rows=(byType[t]||[]).slice().sort((a,b)=>one(a.name).localeCompare(one(b.name)));
    if(!rows.length)return;
    sections.push({type:t,title:t==='Uncategorized'?T('Kategorisiz','Uncategorized'):lab(t),rows:rows.map(e=>{
      const fields=[];
      const put=(k,v,wide)=>{const s=one(v);if(s)fields.push({k,v:s,wide:!!wide});};
      const sub=subs[e.type];
      if(sub)put(lab(sub.label),e.subType?lab(e.subType):'');
      if(!o.ball){
        if(ACTIONS_FOR[e.type])put(lab('Action'),e.action?lab(e.action):'');
        if(PATTERNS_FOR[e.type])put(lab('Movement Pattern'),e.pattern?lab(e.pattern):'');
        (EX_EXTRA_FILTERS[e.type]||[]).forEach(d=>put(lab(d.label),exMulti(e[d.key]).map(lab).join(', ')));
        put('movement_pattern',exPatternOf(e));
      }
      put(T('Zorluk','Difficulty'),e.difficulty?`${lab(e.difficulty)}${LEVEL_LABEL[e.difficulty]?` (${tr?({Beginner:'Başlangıç',Intermediate:'Orta',Advanced:'İleri'}[LEVEL_LABEL[e.difficulty]]):LEVEL_LABEL[e.difficulty]})`:''}`:'');
      if(o.ball)put(T('Oyuncu','Players'),e.players);
      put(T('Kaslar','Muscles'),(Array.isArray(e.muscle)?e.muscle:[]).map(one).filter(Boolean).map(lab).join(', '),true);
      put(T('Kontrendikasyonlar','Contraindications'),exContraOf(e).map(id=>ctLabelIn(id,tr)).join(', '),true);
      return{ex:e,name:one(e.name),fields,desc:cap(o.descOf?o.descOf(e):e.purpose,600)};
    })});
  });
  return{total:items.length,sections};
}
/* Every exercise image frame in the PDF is this one size, so the cards line up down the
   page however the pictures were shot: a picture is cropped from its centre to fill the
   frame (never stretched, never letterboxed), and an exercise without one gets the same
   frame, empty. EXPDF_IMG_PX is the crop's pixel size — about 220 dpi at that width. */
const EXPDF_IMG={w:56,h:42};
const EXPDF_IMG_PX={w:480,h:360};
/* Draws the library (from exLibraryEntries) into `doc`, an A4 portrait jsPDF in mm that
   already carries the font named in `o.font`. Nothing here fetches: `o.imageOf(ex)` hands
   in each exercise's picture as a JPEG data URL already cropped to the frame ('' for
   none), and `o.logo` the CoachOS logo. A card never breaks across a page, and a category
   heading never sits alone at the foot of one. */
function exLibraryPDF(doc,lib,opts){
  const o=opts||{};
  const tr=o.lang==='tr';
  const T=(a,b)=>tr?a:b;
  const F=o.font||'helvetica';
  const UP=s=>String(s).toLocaleUpperCase(tr?'tr':'en');
  const PW=210,PH=297,M=14,CW=PW-2*M,BOTTOM=PH-16;
  const ACC=o.ball?'#ea8c2a':'#9aab3a';
  const INK='#0f172a',MUTED='#64748b',SOFT='#334155',LINE='#e2e8f0',FRAME='#cbd5e1';
  const IW=EXPDF_IMG.w,IH=EXPDF_IMG.h,PAD=4,GAP=6,CARD_GAP=4;
  const TX=M+PAD+IW+GAP,TW=PW-M-PAD-TX,COLS=3,COL_GAP=3.5,COL=(TW-COL_GAP*(COLS-1))/COLS;
  const lh=fs=>fs*0.3528*1.3;   // line height in mm for a size in pt
  const font=(st,fs,col)=>{doc.setFont(F,st);doc.setFontSize(fs);if(col)doc.setTextColor(col);};
  const text=(s,x,y,extra)=>doc.text(s,x,y,Object.assign({baseline:'top'},extra||{}));
  const title=o.ball?T('Dril Kütüphanesi','Drill Library'):T('Egzersiz Kütüphanesi','Exercise Library');
  const shelf=o.ball?T('Top Çalışması','Ball Practice'):T('Kuvvet ve Kondisyon','Strength & Conditioning');
  const unit=o.ball?T('dril','drills'):T('egzersiz','exercises');
  let y=0;

  // ── first page: the dark band with the title, the shelf and the count
  doc.setFillColor(INK);doc.rect(0,0,PW,38,'F');
  doc.setFillColor(ACC);doc.rect(0,38,PW,1.2,'F');
  font('bold',7.5,ACC);text('COACHOS',M,10,{charSpace:0.9});
  font('bold',22,'#ffffff');text(title,M,15);
  font('normal',9.5,'#cbd5e1');text(`${shelf}   ·   ${lib.total} ${unit}`,M,27.5);
  // The library is the app's, not the club's: the band carries the CoachOS logo.
  if(o.logo){
    try{
      const p=doc.getImageProperties(o.logo);
      const k=Math.min(58/p.width,12/p.height),w=p.width*k,h=p.height*k;
      doc.addImage(o.logo,'PNG',PW-M-w,7+(24-h)/2,w,h);
    }catch(e){}
  }
  y=46;
  // How to read it — the same note the text export carries, so the file still works as an
  // AI project's reference.
  let note=exLibraryNote(tr,'card');
  if(o.untranslated>0)note+=' '+T(`Not: ${o.untranslated} açıklama çevrilemedi ve yazıldığı dilde bırakıldı.`,
    `Note: ${o.untranslated} description(s) could not be translated and are left in the language they were written in.`);
  font('normal',7.5);
  const noteL=doc.splitTextToSize(note,CW-10);
  const noteH=lh(6.5)+1.2+noteL.length*lh(7.5)+6;
  doc.setFillColor('#f8fafc');doc.setDrawColor(LINE);doc.setLineWidth(0.3);doc.roundedRect(M,y,CW,noteH,2,2,'FD');
  doc.setFillColor(ACC);doc.rect(M,y+2,0.9,noteH-4,'F');
  font('bold',6.5,MUTED);text(UP(T('Nasıl kullanılır','How to use')),M+5,y+3,{charSpace:0.5});
  font('normal',7.5,SOFT);text(noteL,M+5,y+3+lh(6.5)+1.2,{lineHeightFactor:1.3});
  y+=noteH+7;

  const runHead=()=>{
    font('bold',7.5,INK);text(UP(title),M,9,{charSpace:0.5});
    font('normal',7.5,MUTED);text(shelf,PW-M,9,{align:'right'});
    doc.setDrawColor(LINE);doc.setLineWidth(0.3);doc.line(M,14.5,PW-M,14.5);
  };
  const newPage=()=>{doc.addPage();runHead();y=20;};

  /* One card, measured (draw=false) or drawn at `y0`; returns its height. The picture's
     frame sets the card's least height, so a card with little to say is exactly as tall
     as its frame and the frames line up down the page. */
  const card=(r,y0,draw,img)=>{
    let ty=y0+PAD;
    font('bold',11.5,INK);
    const nameL=doc.splitTextToSize(r.name,TW);
    if(draw)text(nameL,TX,ty,{lineHeightFactor:1.25});
    ty+=nameL.length*lh(11.5)+2;
    // Short fields three to a row, then the wide ones across the whole column.
    const short=r.fields.filter(f=>!f.wide),wide=r.fields.filter(f=>f.wide);
    const rows=[];
    for(let i=0;i<short.length;i+=COLS)rows.push(short.slice(i,i+COLS));
    wide.forEach(f=>rows.push([f]));
    rows.forEach(row=>{
      let rh=0;
      row.forEach((f,i)=>{
        const w=row.length===1&&f.wide?TW:COL;
        const x=TX+i*(COL+COL_GAP);
        font('normal',8.5);
        const vL=doc.splitTextToSize(f.v,w);
        if(draw){
          font('bold',6.3,MUTED);text(f.k==='movement_pattern'?f.k:UP(f.k),x,ty,{charSpace:0.35});
          font('normal',8.5,INK);text(vL,x,ty+lh(6.3)+0.4,{lineHeightFactor:1.3});
        }
        rh=Math.max(rh,lh(6.3)+0.4+vL.length*lh(8.5));
      });
      ty+=rh+1.8;
    });
    if(r.desc){
      ty+=0.6;
      if(draw){doc.setDrawColor(LINE);doc.setLineWidth(0.25);doc.line(TX,ty,TX+TW,ty);}
      ty+=2.2;
      font('normal',8,SOFT);
      const dL=doc.splitTextToSize(r.desc,TW);
      if(draw)text(dL,TX,ty,{lineHeightFactor:1.35});
      ty+=dL.length*lh(8)*1.35/1.3;
    }
    const h=Math.max(IH+2*PAD,ty-y0+PAD-1.8);
    if(draw){
      doc.setFillColor('#ffffff');doc.setDrawColor(LINE);doc.setLineWidth(0.3);
      doc.roundedRect(M,y0,CW,h,2.5,2.5,'S');
      const fx=M+PAD,fy=y0+PAD;
      if(img){
        doc.addImage(img,'JPEG',fx,fy,IW,IH);
        doc.setDrawColor(LINE);doc.setLineWidth(0.3);doc.rect(fx,fy,IW,IH,'S');
      }else{
        // No picture: the same frame, empty, so this card lines up with the rest.
        doc.setFillColor('#f8fafc');doc.rect(fx,fy,IW,IH,'F');
        doc.setDrawColor(FRAME);doc.setLineWidth(0.3);doc.setLineDashPattern([1.2,1],0);
        doc.rect(fx,fy,IW,IH,'S');doc.setLineDashPattern([],0);
      }
    }
    return h;
  };

  lib.sections.forEach(sec=>{
    const HEAD=11;
    const first=sec.rows[0];
    // A heading never sits alone at the foot of a page: it moves over with its first card.
    if(y+HEAD+card(first,0,false)>BOTTOM)newPage();
    font('bold',11,INK);text(UP(sec.title),M,y,{charSpace:0.6});
    const tw=doc.getTextWidth(UP(sec.title))+0.6*UP(sec.title).length;
    font('bold',9,ACC);text(String(sec.rows.length),M+tw+2.5,y+0.6);
    doc.setDrawColor(ACC);doc.setLineWidth(0.6);doc.line(M,y+6,PW-M,y+6);
    y+=HEAD;
    sec.rows.forEach(r=>{
      const h=card(r,y,false);
      if(y+h>BOTTOM)newPage();
      card(r,y,true,o.imageOf?o.imageOf(r.ex):'');
      y+=h+CARD_GAP;
    });
    y+=3;
  });

  // Every page's foot: what this is, and where in it you are.
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);
    doc.setDrawColor(LINE);doc.setLineWidth(0.3);doc.line(M,PH-11,PW-M,PH-11);
    font('normal',7,MUTED);
    text(`CoachOS · ${title} · ${shelf}`,M,PH-9);
    text(`${T('Sayfa','Page')} ${i} / ${n}`,PW-M,PH-9,{align:'right'});
  }
  return doc;
}
/* Archivo — the app's own font, served from this site — for the PDF. It carries the
   Turkish letters jsPDF's built-in Helvetica cannot draw, and a real bold. If it cannot be
   loaded the CDN Roboto that the coach report uses stands in. */
let _archivoB64=null;
async function pdfUseArchivo(doc){
  try{
    if(!_archivoB64)_archivoB64=Promise.all(['Regular','Bold'].map(w=>
      fetch(`${location.origin}/fonts/Archivo-${w}.ttf`)
        .then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(_b64FromBuffer)));
    const[reg,bold]=await _archivoB64;
    doc.addFileToVFS('Archivo-Regular.ttf',reg);doc.addFont('Archivo-Regular.ttf','Archivo','normal');
    doc.addFileToVFS('Archivo-Bold.ttf',bold);doc.addFont('Archivo-Bold.ttf','Archivo','bold');
    doc.setFont('Archivo','normal');
    return'Archivo';
  }catch(e){
    _archivoB64=null;
    console.warn('Archivo unavailable for the PDF, falling back:',e.message);
    return applyTurkishFont(doc);
  }
}
/* Each exercise's picture (exPicture — the one its library card shows), cropped from its centre to the PDF's frame and read
   into a JPEG data URL, six at a time. A picture that cannot be read is simply missing:
   its card gets the empty frame. */
async function exLibraryImages(lib){
  const out=new Map();
  const todo=[];
  lib.sections.forEach(s=>s.rows.forEach(r=>{
    const raw=exPicture(r.ex);
    if(!hasMedia(raw))return;
    const src=mediaSrc(raw);
    if(src&&src!==LM_BLANK)todo.push([r.ex,src]);
  }));
  const{w,h}=EXPDF_IMG_PX;
  const cover=im=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);   // a transparent PNG lands on white, not black
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const iw=im.naturalWidth,ih=im.naturalHeight,k=Math.max(w/iw,h/ih),sw=w/k,sh=h/k;
    ctx.drawImage(im,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,w,h);
    return c.toDataURL('image/jpeg',0.86);
  };
  let i=0;
  const worker=async()=>{
    while(i<todo.length){
      const[ex,src]=todo[i++];
      const d=await readDrawable(src,cover);
      if(d)out.set(ex,d);
    }
  };
  await Promise.all(Array.from({length:Math.min(6,todo.length)},worker));
  return out;
}
/* The open shelf as a designed A4 PDF in the app's language: the descriptions are
   translated, the pictures read, the font loaded — then drawn and saved. */
async function downloadExLibraryPDF(exercises,{ball,libTab}){
  if(!window.jspdf||!window.jspdf.jsPDF)throw new Error('jsPDF is not loaded');
  const lang=REPORT_LANG;
  const{map,untranslated}=await exLibraryDescriptions(exercises,lang);
  const lib=exLibraryEntries(exercises,{ball,lang,descOf:e=>map[String(e.purpose||'').trim()]||e.purpose||''});
  const images=await exLibraryImages(lib);
  const doc=new window.jspdf.jsPDF({orientation:'p',unit:'mm',format:'a4',compress:true});
  const font=await pdfUseArchivo(doc);
  exLibraryPDF(doc,lib,{ball,lang,untranslated,font,logo:COACHOS_LOGO,imageOf:e=>images.get(e)||''});
  doc.save(`exercise_library_${libTab}_${lang}_${new Date().toISOString().slice(0,10)}.pdf`);
}
/* "How to use", at the head of the .txt and the PDF alike: what an AI project reads before
   the list. The list is where an exercise is chosen from first; one from outside it is
   still allowed, with its reason said. Difficulty and contraindications are said to bind,
   and a field that is not written is said to be unknown — not to be guessed as empty. */
function exLibraryNote(tr,unit){
  const card=unit==='card';
  return tr
    ?`Her egzersiz kendi kategorisi altında tek bir ${card?'kart':'blok'} olarak yer alır. `+
      'Egzersizi önce bu listeden seç ve adını yazıldığı gibi kullan; listede uygun bir egzersiz yoksa dışarıdan yazabilirsin, ama nedenini belirt. '+
      'movement_pattern programdaki satıra yazılacak değerdir ve her zaman İngilizce yazılır. '+
      'Zorluk: Seviye 1 başlangıç, Seviye 2 orta, Seviye 3 ileri; sporcunun seviyesinin üstündeki bir egzersizi seçme. '+
      'Kontrendikasyonlar: o bölgede ağrısı ya da sakatlığı olan sporcuya bu egzersizi verme. '+
      'Bir egzersizde yazmayan alan, o bilginin girilmediği anlamına gelir.'
    :`Each exercise is one ${card?'card':'block'} under its category. `+
      'Choose exercises from this list first and write the name as given; if nothing on it fits, you may write one from outside it, but say why. '+
      'movement_pattern is the value to write in a programme row and is always in English. '+
      'Difficulty: Level 1 beginner, Level 2 intermediate, Level 3 advanced; do not choose an exercise above the athlete\'s level. '+
      'Contraindications: do not give the exercise to an athlete with pain or an injury in that region. '+
      'A field an exercise does not show means the information was not entered.';
}
/* The same library as one plain-text file — the format the programme-writing
   instructions describe for an AI project's reference file ("CoachOS Exercise Library",
   .txt): one block per exercise under its category, the name on its own line and every
   field the PDF card carries on an indented line under it. Built from the very entries
   the PDF is drawn from, so the two files can never list different things. */
function exLibraryText(lib,opts){
  const o=opts||{};
  const tr=o.lang==='tr';
  const T=(a,b)=>tr?a:b;
  const heavy='='.repeat(48),light='-'.repeat(48);
  const out=[
    T(o.ball?'COACHOS DRİL KÜTÜPHANESİ — TOP ÇALIŞMASI':'COACHOS EGZERSİZ KÜTÜPHANESİ — KUVVET VE KONDİSYON',
      o.ball?'COACHOS DRILL LIBRARY — BALL PRACTICE':'COACHOS EXERCISE LIBRARY — STRENGTH & CONDITIONING'),
    `${lib.total} ${T(o.ball?'dril':'egzersiz',o.ball?'drills':'exercises')}${o.date?` · ${T('dışa aktarım','exported')} ${o.date}`:''}`,'',
    T('NASIL KULLANILIR','HOW TO USE'),
    exLibraryNote(tr,'block')];
  if(o.untranslated>0)out.push(T(`Not: ${o.untranslated} açıklama çevrilemedi ve yazıldığı dilde bırakıldı.`,
    `Note: ${o.untranslated} description(s) could not be translated and are left in the language they were written in.`));
  out.push('');
  lib.sections.forEach(sec=>{
    out.push(heavy,`${sec.title.toLocaleUpperCase(tr?'tr':'en')} (${sec.rows.length})`,heavy,'');
    sec.rows.forEach(r=>{
      out.push(r.name);
      r.fields.forEach(f=>out.push(`  ${f.k}: ${f.v}`));
      if(r.desc)out.push(`  ${T('Açıklama','Description')}: ${r.desc}`);
      out.push('',light,'');
    });
  });
  return out.join('\n');
}
async function downloadExLibraryText(exercises,{ball,libTab}){
  const lang=REPORT_LANG;
  const date=new Date().toISOString().slice(0,10);
  const{map,untranslated}=await exLibraryDescriptions(exercises,lang);
  const lib=exLibraryEntries(exercises,{ball,lang,descOf:e=>map[String(e.purpose||'').trim()]||e.purpose||''});
  const txt=exLibraryText(lib,{ball,lang,date,untranslated});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'}));
  a.download=`exercise_library_${libTab}_${lang}_${date}.txt`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
/* The description of every exercise in the app's language. A description is stored as the
   coach wrote it — in practice Turkish — and the screen shows an English machine
   translation while the app is in English; the export does the same, a few at a time. A
   description that could not be translated is kept as written and counted, so the file
   can say so. */
async function exLibraryDescriptions(list,lang){
  const map={};
  const texts=[...new Set((list||[]).map(e=>String((e&&e.purpose)||'').trim()).filter(Boolean))];
  let untranslated=0;
  if(lang!=='en'){texts.forEach(t=>{map[t]=t;});return{map,untranslated};}
  let i=0;
  const worker=async()=>{
    while(i<texts.length){
      const t=texts[i++];
      if(descLangOf(t)!=='tr'){map[t]=t;continue;}
      const r=await mtToEn(t);
      map[t]=r;
      if(r===t)untranslated++;
    }
  };
  await Promise.all(Array.from({length:Math.min(6,texts.length)},worker));
  return{map,untranslated};
}
const LEVEL_LABEL={'Level 1':'Beginner','Level 2':'Intermediate','Level 3':'Advanced'};

/* Position → grouping axis. Non-basketball rosters fall into `other`, which
   carries a neutral profile so nothing changes for them. */
const POS_GROUPS=[
  {id:'guard',label:'Guard',  pos:['Guard']},
  {id:'wing', label:'Forward',pos:['Forward']},
  {id:'post', label:'Center', pos:['Center']},
];
const posGroupOf=p=>((POS_GROUPS.find(g=>g.pos.includes(posOf(p)))||{}).id)||'other';
const posGroupLabel=id=>((POS_GROUPS.find(g=>g.id===id)||{}).label)||'Other';

/* Readiness band table — display only. It gives the score on the card a colour and
   a word; it does not move a single number on the program sheet. */
const RD_BANDS=[
  {id:'low',  min:0,   label:'Very low',  color:'#f43f5e'},
  {id:'below',min:2.5, label:'Low',       color:'#f59e0b'},
  {id:'mid',  min:3.2, label:'Moderate',  color:'#eab308'},
  {id:'good', min:3.9, label:'Good',      color:'#2dd4a7'},
  {id:'high', min:4.5, label:'Very good', color:'#38bdf8'},
];
/* How far back a check-in still counts as "today's" for the card. */
const IV_CHECKIN_WINDOW=2;

/* ---- Readiness ------------------------------------------------------------
   Primary source is the wellness check-in (the same field the Load Board reads).
   When an athlete has no recent check-in the score is ESTIMATED from their own
   sRPE trend (3-day acute load against the 28-day daily mean) so the card still
   has something to show — the estimate is labelled as such wherever it appears. */
function dayGap(a,b){return Math.round((parseD(b)-parseD(a))/86400000);}
function athReadiness(a,ref){
  const ws=(a.wellness||[]).filter(w=>w.date&&w.date<=ref&&w.readiness!==''&&w.readiness!=null&&!isNaN(Number(w.readiness)))
    .sort((x,y)=>x.date.localeCompare(y.date));
  const last=ws[ws.length-1];
  if(last&&dayGap(last.date,ref)<=7)return{score:Number(last.readiness),src:'wellness',date:last.date,age:dayGap(last.date,ref)};
  let ac=0,ch=0,nd=0;
  for(let i=0;i<28;i++){const v=athDayLoad(a,fmt(addD(parseD(ref),-i)))||0;ch+=v;if(v>0)nd++;if(i<3)ac+=v;}
  if(nd>=4&&ch>0){
    const r=(ac/3)/(ch/28);
    const sc=r<=0.7?4.5:r<=1?4:r<=1.3?3.5:r<=1.6?3:2.5;
    return{score:sc,src:'srpe',date:ref,age:0,ratio:r};
  }
  if(last)return{score:Number(last.readiness),src:'wellness',date:last.date,age:dayGap(last.date,ref),stale:true};
  return{score:null,src:null,date:null};
}
function rdBand(score){
  if(score==null)return null;
  let out=RD_BANDS[0];
  for(const b of RD_BANDS)if(score>=Number(b.min))out=b;
  return out;
}
/* Soreness and fatigue as the athlete rated them on their latest check-in, on the
   survey's own 1-5 scale where 5 is the good end. Shown next to readiness so the
   coach sees what the single score is made of. */
function athWellnessSnap(a,ref){
  const ws=(a.wellness||[]).filter(w=>w.date&&w.date<=ref).sort((x,y)=>x.date.localeCompare(y.date));
  const w=ws[ws.length-1];
  if(!w||dayGap(w.date,ref)>IV_CHECKIN_WINDOW)return{soreness:null,fatigue:null,date:null};
  const n=v=>{const x=Number(v);return (v===''||v==null||isNaN(x))?null:x;};
  return{soreness:n(w.soreness),fatigue:n(w.fatigue),date:w.date};
}

/* ---- Daily survey → reported pain ----------------------------------------
   How long a reported pain stays on screen is set by how bad it was. A region graded
   Fazla (the red chip) is shown on the day it was reported AND the day after, whether
   or not the next check-in ticks it again — a severe report is still worth seeing the
   morning after. Anything milder (Hafif / Orta), anything ungraded and anything only
   written in the free-text box is shown on its own day only: a hamstring rated Orta
   yesterday and not ticked today is gone today, and so is one reported yesterday by an
   athlete who has not checked in yet. When both days report a region, today's grading
   is the one shown. */
const PAIN_CARRY_SEV=3;
const painCarries=sev=>painSevKey(sev)>=PAIN_CARRY_SEV;
/* The two check-ins the rule reads: the latest one ON the day, and the latest one on
   the day before (only its red regions are kept). */
function painCheckinsFor(a,ref){
  const lastOn=d=>{const ws=(a.wellness||[]).filter(w=>w&&w.date===d);return ws[ws.length-1]||null;};
  return{today:lastOn(ref),yesterday:lastOn(fmt(addD(parseD(ref),-1)))};
}
/* One record per painful region, for display and for the engine. Two shapes are
   understood: the structured `pain` map written by the wellness survey ({knee:2}),
   and the free-text "Area of Pain" field that arrives from Tally, matched against the
   same region keywords. */
function athPainReports(a,ref){
  const{today,yesterday}=painCheckinsFor(a,ref);
  const out=[],seen=new Set();
  const known=new Set(CONSTRAINT_TAGS.map(t=>t.id));
  const read=(w,carry)=>{
    /* The stored tags, plus the ones the 3D map's regions read to today — so a check-in
       taken before a region's keyword existed still closes what it should. */
    const fromMap=painTagsFromMap(w.painMap&&typeof w.painMap==='object'?w.painMap:null)||{};
    const stored=(w.pain&&typeof w.pain==='object')?w.pain:{};
    const pm={...fromMap};Object.keys(stored).forEach(k=>{pm[k]=Math.max(Number(pm[k])||0,Number(stored[k])||0);});
    // A tag with severity 0 is still a report — the region was ticked on a question that
    // never asked how bad it is — so it counts as one and simply shows no grade.
    if(pm)Object.keys(pm).forEach(tag=>{
      const sev=Number(pm[tag])||0;
      if(carry&&!painCarries(sev))return;
      if(sev>=0&&known.has(tag)&&!seen.has(tag)){seen.add(tag);out.push({tag,sev,date:w.date,src:'survey'});}});
    // Free text carries no grading, so it never outlives its own day.
    if(carry)return;
    const raw=painFreeText(w.areaOfPain),txt=raw.toLowerCase();
    if(txt)CONSTRAINT_TAGS.forEach(t=>{
      if(!seen.has(t.id)&&t.kw.some(k=>txt.includes(k))){
        seen.add(t.id);out.push({tag:t.id,date:w.date,src:'text',raw});}});
  };
  if(today)read(today,false);
  if(yesterday)read(yesterday,true);
  return out;
}
/* Whatever the athlete reported in the check-in's pain box, in their own words.
   athPainReports only returns regions it could match to a known tag, so a note
   that matches nothing ("belim tutuldu") — or a ticked region the tag list has no
   entry for — would otherwise disappear before the coach ever sees it. Read from
   the same two check-ins under the same rule.

   `text` is the one-line prose the AI briefings and the trigger summaries want —
   the athlete's own words when they wrote some (`quoted`), else the grid.
   `regions` is the grid as a list, for the places that DRAW it: a chip per region,
   coloured by severity, each with the date it was reported. `covered` names the
   constraint tags these regions already account for, so the card can drop the tag
   chips that would otherwise repeat the same regions in a second vocabulary. */
function athPainNote(a,ref){
  const{today,yesterday}=painCheckinsFor(a,ref);
  const gridOf=w=>w?painEntries(parsePainMap(w.painMap&&typeof w.painMap==='object'?w.painMap:w.areaOfPain))
    .map(g=>({...g,date:w.date})):[];
  const note=today?painFreeText(today.areaOfPain):'';
  /* A check-in with words in the pain box shows the words, as it always has; the grid
     of that same morning is left to the tag chips. */
  const regions=note?[]:gridOf(today);
  const have=new Set(regions.map(g=>g.region));
  gridOf(yesterday).forEach(g=>{if(painCarries(g.sev)&&!have.has(g.region)){have.add(g.region);regions.push(g);}});
  if(!note&&!regions.length)return null;
  const map={};regions.forEach(g=>{map[g.region]=g.sev;});
  const covered=Object.keys(painTagsFromMap(map)||{});
  if(note)return{text:note,date:today.date,quoted:true,regions,covered};
  const SEV=PAIN_SEV_LABEL();
  const text=regions.map(g=>(g.sev?`${g.region}: ${SEV[g.sev]}`:g.region)
    +(today&&g.date!==today.date?` (${g.date})`:'')).join(', ');
  return{text,regions,covered,date:today&&regions.some(g=>g.date===today.date)?today.date:regions[0].date,
    quoted:false};
}
/* Yesterday, as the athlete reported it: the session RPE they rated and the load
   (sRPE × duration) it worked out to — context for the coach's own edits, so he
   does not have to leave the card to see it. */
function athPrevDay(a,ref){
  const date=fmt(addD(parseD(ref),-1));
  const r=athDayRPE(a,date);
  return{date,rpe:(r==null||isNaN(r))?null:Math.round(r*10)/10,load:athDayLoad(a,date)};
}
/* Coach notes, newest first — shown next to the athlete on the build screen.
   Free text, never parsed by the substitution engine (Feature 4a). */
function athNotesList(a){
  const stored=Array.isArray(a.constraintNotes)?a.constraintNotes:null;
  const list=stored||((a.constraints||'').trim()?[{id:'seed',date:'',text:a.constraints}]:[]);
  return list.filter(x=>(x.text||'').trim()).slice().reverse();
}
/* Keyword hits inside the notes — offered as tag SUGGESTIONS the coach ticks. */
function noteTagSuggestions(a){
  const txt=athNotesList(a).map(x=>x.text).join(' \n ').toLowerCase();
  if(!txt.trim())return[];
  const have=new Set(a.constraintTags||[]);
  return CONSTRAINT_TAGS.filter(t=>!have.has(t.id)&&t.kw.some(k=>txt.includes(k))).map(t=>t.id);
}

/* Templates written before RPE had its own column still carry it inside the load
   text as "@RPE 7". These two lift it out so it lands in the RPE field and is not
   prescribed twice. */
const rpeInText=t=>{const m=String(t||'').match(/rpe\s*([0-9]+(?:[.,][0-9])?)/i);return m?Number(m[1].replace(',','.')):null;};
/* Takes an "@RPE 7" out of a load text and tidies up the separators it leaves
   behind, so "%75 · @RPE 7" becomes "%75" and a bare "@RPE 7" becomes "". */
const stripRPEText=t=>String(t||'').split('·').map(s=>s.trim())
  .filter(s=>s&&!/^@?\s*rpe\s*[0-9]/i.test(s)).join(' · ').trim();

/* Build one athlete's version of a source session. Pure, and deliberately dumb:
   every slot starts as the template wrote it and is then overwritten by whatever
   the coach typed on this athlete's card. No layer sits in between. The athlete's
   reported numbers ride along on the plan so the card can show them, but they are
   read by the UI, never applied to the sheet. */
function buildIndivPlan(src,ath,ctx){
  const{ref,ovr}=ctx;
  const rd=athReadiness(ath,ref);
  const band=rdBand(rd.score);
  const pgId=posGroupOf(ath.position);
  const slotOvr=(ovr&&ovr.slots)||{};
  /* One row on the sheet, built the same way whether the template wrote it or the
     coach added it: `ex` is whatever the template put in the slot, and an ADDED
     exercise simply has an empty one behind it — so every box on it is the
     override, and the code below does not need to know the difference. */
  const mkRow=(key,ex,addId)=>{
    const o=slotOvr[key]||{};
    const base={...ex};
    /* A template that predates the RPE column carries it inside the load text; it
       is moved into the RPE field and dropped from the load so the same number is
       not written twice. */
    const legacyRPE=rpeInText(base.load);
    const baseRPE=String(base.rpe==null?'':base.rpe).trim()||(legacyRPE!=null?String(legacyRPE):'');
    const baseLoad=(legacyRPE!=null?stripRPEText(base.load):String(base.load||'')).trim();
    /* A field the coach has touched is HIS, empty included: the presence of the key
       decides, never the value. Falling back on an empty value would refill the box
       from the template the moment it was cleared — the field could not be emptied
       at all, and a name could not be typed either, since every space is a trailing
       space until the next letter arrives. ↺ Reset is what goes back to the
       template; it drops the whole slot override. Values are stored exactly as
       typed and trimmed only where they are read. */
    const pick=(k,fallback)=>o[k]!==undefined&&o[k]!==null?o[k]:fallback;
    const name=String(pick('name',base.name||''));
    /* "Changed" means the coach put a different exercise where the template had
       one. An added exercise replaced nothing, so it is never a change — counting
       it would inflate the card's "n changed" badge with work that was simply
       extra, and make the sheet read as if the template had been rewritten. */
    const changedName=!addId&&name.trim().toLowerCase()!==(base.name||'').trim().toLowerCase();
    return{key,base,name,added:!!addId,addId:addId||null,
      sets:pick('sets',base.sets),
      reps:pick('reps',base.reps),
      duration:pick('duration',base.duration),
      tempo:pick('tempo',base.tempo),
      rpe:pick('rpe',baseRPE),
      load:pick('load',baseLoad),
      rest:pick('rest',base.rest),
      superset:(o.superset!=null?o.superset:(base.superset||'')),
      /* What the exercise trains and how it is executed — the pair the calendar's
         load distribution reads. Defaults to whatever the template row carries. */
      pattern:pick('pattern',base.pattern||''),
      plane:pick('plane',base.plane||''),
      /* The reference link is the coach's to set per athlete, like every other box on
         the row: it starts from whatever the template attached and is overridden the
         same way, so one athlete can be pointed at a different clip without the
         template — or anyone else's sheet — moving. */
      link:pick('link',base.link||''),
      // Which phase of the session the row belongs to — the source block's answer.
      phase:exPhase(base),
      description:base.description,image:base.image,
      changedName,
      note:o.note||''};
  };
  /* Exercises the coach ADDED to a block. They are stored as a flat list of
     {id,bi} rather than spliced into the template's own slots so the template
     numbering never shifts under an override: slot "1:2" always means the same
     row of the same block, whatever was added around it. */
  const addedAll=(ovr&&Array.isArray(ovr.added)?ovr.added:[]).filter(a=>a&&a.id!=null);
  /* Blocks the coach ADDED for this athlete, and the per-block edits (a renamed or
     removed heading) laid over the source session's own. Both are keyed the same way
     slots are: a template block by its index, an added one by its id — so a rename
     survives whatever is added around it. */
  const addedBlocks=(ovr&&Array.isArray(ovr.addedBlocks)?ovr.addedBlocks:[]).filter(b=>b&&b.id!=null);
  const blockOvr=(ovr&&ovr.blockOvr)||{};
  const mkBlock=(key,baseName,exercises,addId,phases,phaseNames)=>{
    const o=blockOvr[key]||{};
    // Same rule as a slot field: the presence of the key decides, so a heading can be
    // cleared and typed into freely. ✕ Remove is what takes the block off the sheet.
    const name=String(o.name!==undefined&&o.name!==null?o.name:(baseName||''));
    return{key,name,baseName:baseName||'',added:!!addId,addId:addId||null,
      /* The phases the source block was written in. The sheet does not edit them — an
         athlete's copy is the coach's session, laid out the way the coach laid it out —
         but they ride across so the program written from here keeps its sections. */
      phases:Array.isArray(phases)?phases:[],
      phaseNames:(phaseNames&&typeof phaseNames==='object')?phaseNames:{},
      removed:!addId&&!!o.removed,
      renamed:!addId&&name.trim()!==(baseName||'').trim(),
      rows:[
        ...(exercises||[]).map((ex,ei)=>mkRow(`${key}:${ei}`,ex,null)),
        // Added slots sit after the template's own, in the order they were added.
        ...addedAll.filter(a=>String(a.bi)===key).map(a=>mkRow(`add:${a.id}`,{},a.id)),
      ]};
  };
  /* ONLY THE BLOCKS THIS ATHLETE ACTUALLY DOES. One strength session is routinely split
     into a guards' block, a forwards' block and a pivots' block, each ticked to the
     players who do it — the team→athlete sync has always copied a session that way, and
     the sheet must read it the same. Without this the sheet built every block for every
     athlete, so all three landed on all three groups' calendars.
     A block that names nobody is the session's own work and belongs to everyone, exactly
     as `blockCoversAthlete` reads it; the block's list is what narrows it, never the
     session's roster, so writing to an athlete the session was never given to (the button
     in the bar, over a template) still builds them a full sheet. If the split leaves this
     athlete with nothing — stale data, ticks that no longer name anyone here — the whole
     session stands rather than an empty program. Blocks keep their SOURCE index as their
     key so every override the coach typed stays on the row it was typed on. */
  const srcBlocks=(src.blocks||[]).map((b,bi)=>({b,bi}));
  const ownIds=b=>(Array.isArray(b&&b.athletes)?b.athletes:[]);
  const myBlocks=srcBlocks.filter(({b})=>{const ids=ownIds(b);return !ids.length||ids.includes(ath.id);});
  const useBlocks=myBlocks.length?myBlocks:srcBlocks;
  const blocks=[
    ...useBlocks.map(({b,bi})=>mkBlock(String(bi),b.name||'',b.exercises||[],null,blkPhases(b),b.phaseNames)),
    // Added blocks sit after the source session's own, in the order they were added.
    ...addedBlocks.map(b=>mkBlock(`add:${b.id}`,'',[],b.id)),
  ];
  /* An exercise inside a block the coach removed is not prescribed, so it is not a
     change either — counting it would leave the badge claiming edits the athlete
     never sees on their sheet. */
  const changed=blocks.filter(b=>!b.removed).reduce((n,b)=>n+b.rows.filter(r=>r.changedName).length,0);
  /* The session's own line, per athlete — the same six fields the calendar's session
     editor carries, so what a session IS reads identically on both screens: its title,
     when it runs, how long, and what it trains. Each starts from the source session and
     is overridden exactly like a slot field, the key's presence deciding. */
  const mOvr=(ovr&&ovr.meta)||{};
  const has=k=>mOvr[k]!==undefined&&mOvr[k]!==null;
  const mPick=(k,fallback)=>has(k)?String(mOvr[k]):String(fallback||'');
  const mList=(k,fallback)=>Array.isArray(mOvr[k])?mOvr[k]:(fallback||[]);
  const baseFocus=sesFocus(src),baseMethods=sesMethods(src),baseRegion=sesRegion(src);
  /* The title the athlete sees is the title of the block they do: a session split by
     position gives each group its own heading, and the plain copy the sync writes is
     already named that way. One title among their blocks is theirs; blocks that disagree
     fall back to the session's own name — the same rule `syncSessionsToAthletes` uses. */
  const myTitles=[...new Set(useBlocks.map(({b})=>blkSesName(src,b)).filter(Boolean))];
  const baseSesName=myTitles.length===1?myTitles[0]:(src.name||'');
  const meta={
    name:mPick('name',baseSesName),time:mPick('time',src.time||''),
    duration:mPick('duration',src.duration==null?'':src.duration),
    focus:mList('focus',baseFocus),region:mPick('region',baseRegion),methods:mList('methods',baseMethods),
    baseName:baseSesName,baseTime:src.time||'',baseDuration:src.duration==null?'':String(src.duration),
    baseFocus,baseRegion,baseMethods,
    edited:{name:has('name'),time:has('time'),duration:has('duration'),
      focus:Array.isArray(mOvr.focus),region:has('region'),methods:Array.isArray(mOvr.methods)},
  };
  return{ath,rd,band,posGroup:pgId,blocks,changed,meta,
    prev:athPrevDay(ath,ref),pains:athPainReports(ath,ref),painNote:athPainNote(ath,ref),
    well:athWellnessSnap(ath,ref),notes:athNotesList(ath)};
}
/* Blocks that are actually prescribed — a removed one keeps its row on the card so
   it can be put back, exactly like an emptied slot, but never leaves the screen. */
const liveBlocks=plan=>(plan.blocks||[]).filter(b=>!b.removed);

/* Clearing a slot's exercise name is how an exercise is deleted from one athlete's
   sheet: the row stays on the card so it can be filled back in (or Reset to the
   template), but it is not part of the program that gets written or exported. */
const liveSlot=r=>!!String(r.name||'').trim();


/* A written program's fingerprint: everything on it a coach can see, and nothing a
   rewrite invents anew. Row and block ids are regenerated on every build, so two
   identical programs never compare equal as objects — the fingerprint is what lets the
   sheet tell whether what sits on the athlete's calendar is still what the sheet says.
   `indiv` is left out on purpose: it carries the fingerprint itself and the readiness of
   the day, and a fresh check-in is not a change to the program. */
/* The session-level fields that are filled in AFTER the fingerprint is taken — the link
   to the team session and the athlete's own post-session feedback. Leaving them out is
   what lets a stored session be fingerprinted again later and compared with the one that
   was written, which is how a program edited by hand on the calendar is recognised. */
const INDIV_SIG_SKIP=new Set(['id','indiv','sourceId','sRPE','au','athletes','notes']);
function indivSig(ses){
  const walk=(v,d)=>{
    if(Array.isArray(v))return v.map(x=>walk(x,d+1));
    if(v&&typeof v==='object')return Object.keys(v)
      .filter(k=>k!=='id'&&k!=='descI18n'&&!(d===0&&INDIV_SIG_SKIP.has(k))).sort()
      .reduce((o,k)=>{o[k]=walk(v[k],d+1);return o;},{});
    return v==null?'':v;
  };
  return JSON.stringify(walk(ses,0));
}
/* A written program the coach has since edited on the athlete's own calendar. Its content
   no longer matches the fingerprint taken when it was written, so rewriting the sheet
   over it would throw those edits away — the sheet must ask first, and must never do it
   on its own. Sessions written before fingerprints existed report false: there is nothing
   to compare them against, and guessing would block writing for good. */
function indivHandEdited(ses){
  const sig=ses&&ses.indiv&&ses.indiv.sig;
  return !!sig&&indivSig(ses)!==sig;
}

/* ---- AI-written exercise descriptions, in the app's language ---------------------
   The programme JSON is English end to end and says nothing about language; the model
   answers in whatever language it likes. What it wrote as an exercise's description is
   kept with the row as `descI18n` ({en, tr}, keyed by the language it is in), and the
   calendar and the printed sheet read it through exDesc() — so switching the app's
   language switches the description too. The missing language is filled in by the
   coach's own AI connection the first time the row is shown in it (descTranslate), and
   stored on the row, so it is asked for once. A description the coach has typed over is
   the coach's: it no longer matches any stored version and is shown exactly as typed. */
function descLangOf(t){
  const x=String(t||'');
  return /[çğıöşüÇĞİÖŞÜ]/.test(x)||/\b(ve|için|ile|bir|bu|daha|olarak|sporcu)\b/i.test(x)?'tr':'en';
}
function descI18nFor(isAI,text){
  const t=String(text||'').trim();
  return isAI&&t?{descI18n:{[descLangOf(t)]:t}}:{};
}
// The row's description is still one the model wrote (not typed over by the coach).
function descUnedited(ex){
  const m=ex&&ex.descI18n,d=String((ex&&ex.description)||'');
  return !!(m&&typeof m==='object'&&d&&Object.keys(m).some(k=>m[k]===d));
}
function exDesc(ex){
  const d=String((ex&&ex.description)||'');
  if(!descUnedited(ex))return d;
  return ex.descI18n[REPORT_LANG]||d;
}
/* The AI settings the translator uses — registered by the App, like the library bridge. */
let DESC_AI_CFG=null;
const DESC_TR_KEY='coachos_desc_tr_v1';
const descTrCache=(()=>{try{const o=JSON.parse(localStorage.getItem(DESC_TR_KEY)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return{};}})();
const descTrWait={},descTrFailed=new Set();
let descTrQ=[],descTrTimer=0;
/* One translation, answered from the cache or batched with the others the screen asks
   for in the same moment — a phased session asks for a dozen rows at once. Resolves to
   null when there is no AI connection or the call fails; the row then keeps the
   language it was written in, and a failed text is not asked for again this visit. */
function descTranslate(text,to){
  const k=to+'|'+text;
  if(descTrCache[k])return Promise.resolve(descTrCache[k]);
  if(descTrFailed.has(k))return Promise.resolve(null);
  return new Promise(res=>{
    const w=descTrWait[k]||(descTrWait[k]=[]);
    w.push(res);
    if(w.length===1)descTrQ.push({k,text,to});
    clearTimeout(descTrTimer);descTrTimer=setTimeout(descTrFlush,150);
  });
}
async function descTrFlush(){
  const batch=descTrQ.splice(0,30);
  if(descTrQ.length)descTrTimer=setTimeout(descTrFlush,150);
  const done=(k,v)=>{const w=descTrWait[k]||[];delete descTrWait[k];w.forEach(r=>r(v));};
  const byTo={};batch.forEach(b=>(byTo[b.to]=byTo[b.to]||[]).push(b));
  for(const to of Object.keys(byTo)){
    const list=byTo[to];
    try{
      const ai=DESC_AI_CFG||{};
      const provider=aiProviderOf(ai),key=aiKeyOf(ai),model=aiModelOf(ai);
      if(!key)throw new Error('no ai');
      const sys=`Translate each strength-and-conditioning exercise note into ${to==='tr'?'Turkish':'English'}. `+
        'Keep exercise names, numbers, units and abbreviations (RPE, 1RM, RFD, DB, KB) as they are; add nothing. '+
        'Reply with ONLY a JSON array of strings: one translation per input, in the same order.';
      const msgs=[{role:'user',content:JSON.stringify(list.map(b=>b.text))}];
      const txt=provider==='anthropic'
        ?await askCoach(key,model,sys,msgs,{maxTokens:4000,effort:'low'})
        :await askGemini(key,model,sys,msgs,{maxTokens:4000,json:true,thinkingBudget:0,temperature:0.2});
      const arr=JSON.parse(txt.slice(txt.indexOf('['),txt.lastIndexOf(']')+1));
      list.forEach((b,i)=>{
        const v=String((Array.isArray(arr)&&arr[i]!=null)?arr[i]:'').trim();
        if(v)descTrCache[b.k]=v;else descTrFailed.add(b.k);
        done(b.k,v||null);
      });
    }catch(e){
      try{console.warn('[CoachOS] description translation failed:',(e&&e.message)||e);}catch(_){}
      list.forEach(b=>{descTrFailed.add(b.k);done(b.k,null);});
    }
  }
  try{
    const ks=Object.keys(descTrCache);
    ks.slice(0,Math.max(0,ks.length-600)).forEach(k=>{delete descTrCache[k];});
    localStorage.setItem(DESC_TR_KEY,JSON.stringify(descTrCache));
  }catch(e){}
}
/* A row editor shows its description in the app's language. The row's own versions
   (descI18n) are used when the description is still one of them; otherwise the
   description as it stands is taken as the original — a programme written before
   descI18n existed, one edited on the calendar, or one typed in — and, when it is in the
   other language, the missing version is asked for and stored beside it. The text the
   coach wrote is never replaced: `description` stays as it is, descI18n only adds the
   other language for display. */
function useDescI18n(ex,onChange){
  // The rows are memoised: subscribing is what re-renders one when the language changes.
  const lang=useAppLang();
  const exRef=useRef(ex);exRef.current=ex;
  const cbRef=useRef(onChange);cbRef.current=onChange;
  const d=String((ex&&ex.description)||'').trim();
  const kept=descUnedited(ex);
  const src=!d?null:(kept?(ex.descI18n[lang]?null:d):(descLangOf(d)===lang?null:d));
  useEffect(()=>{
    if(!src)return;
    let live=true;
    descTranslate(src,lang).then(t=>{
      const cur=exRef.current;
      if(!live||!t||String((cur&&cur.description)||'').trim()!==src)return;
      const base=descUnedited(cur)?cur.descI18n:{[descLangOf(src)]:String(cur.description)};
      if(base[lang])return;
      cbRef.current({...cur,descI18n:{...base,[lang]:t}});
    });
    return()=>{live=false;};
  },[src,lang]);
}
/* Turn a built sheet into a session object for the athlete's own calendar. Which exercise
   the source session had asked for rides along on every changed slot, so the card can still
   say what was swapped; it prints nowhere. */
function planToSession(plan,src,dateKey,srcKey){
  const t=v=>String(v==null?'':v).trim();
  const rows=b=>b.rows.filter(liveSlot).map(r=>{
    const note=t(r.note);
    return{name:t(r.name),sets:t(r.sets),reps:t(r.reps),duration:t(r.duration),
      tempo:t(r.tempo),rpe:t(r.rpe),load:t(r.load),rest:t(r.rest),
      description:[r.base.description||'',note].filter(Boolean).join(r.base.description&&note?' · ':''),
      ...descI18nFor(r.base.aiDesc,[r.base.description||'',note].filter(Boolean).join(r.base.description&&note?' · ':'')),
      notes:r.base.notes||'',superset:t(r.superset),image:r.image||'',link:r.link||'',
      phase:exPhase(r),
      pattern:t(r.pattern),plane:t(r.plane),
      /* The alternative rides across with the exercise it stands in for. Without this
         an alternative written on a template was dropped the moment the session was
         individualized, and an approved substitution had nowhere to record the option
         the coach kept beside it. */
      ...(r.alt&&typeof r.alt==='object'?{alt:r.alt}:{}),
      changed:!!r.changedName,fromName:r.base.name||''};});
  /* The session's own line comes off the athlete's sheet — the coach may have rewritten
     any of the six fields for this athlete — and falls back to the source session's
     wherever one was never touched. `purpose` is the focus list written out, the same
     way the session editor keeps the two in step. */
  const m=plan.meta||{};
  const focus=Array.isArray(m.focus)?m.focus:sesFocus(src);
  const dur=Number(t(m.duration));
  const ses={id:uid(),name:t(m.name)||src.name||'Individual Program',time:t(m.time)||src.time||'17:00',
    loadType:src.loadType||'Mechanical load',
    /* The capacity the source session named rides along with its focus: an athlete's copy
       of a session should say what it trains in both stages the team's does, not just the
       first of them. */
    sub:sesSubFocus(src),
    purpose:[...focus,...sesSubFocus(src)].join(', '),focus,
    methods:Array.isArray(m.methods)?m.methods:sesMethods(src),
    region:m.region!=null?t(m.region):sesRegion(src),
    duration:(dur>0?dur:(src.duration||60)),
    sRPE:'',au:'',color:src.color||'',
    /* What the source session says it trains — the muscles and the movement patterns the
       coach ticked on it — rides onto the athlete's copy, so their session opens with the
       same Movements & Patterns panel and the same summary strip the team session has. */
    selMuscles:Array.isArray(src.selMuscles)?[...src.selMuscles]:[],
    selPatterns:Array.isArray(src.selPatterns)?[...src.selPatterns]:[],
    selPlanes:(src.selPlanes&&!Array.isArray(src.selPlanes))?JSON.parse(JSON.stringify(src.selPlanes)):{},
    blocks:liveBlocks(plan).map(b=>({id:uid(),name:b.name,
      ...(blkPhases(b).length?{phases:blkPhases(b)}:{}),
      ...(blkPhases(b).length&&b.phaseNames&&Object.keys(b.phaseNames).length?{phaseNames:{...b.phaseNames}}:{}),
      exercises:rows(b)})),
    notes:'',planNote:src.planNote||'',
    athletes:[],sourceId:null,
    indiv:{srcKey,date:dateKey,readiness:plan.rd.score,band:plan.band?plan.band.label:'',
      pos:plan.posGroup,changed:plan.changed}};
  ses.indiv.sig=indivSig(ses);
  return ses;
}

function indivSessionsFor(ath,dateKey){
  return (((ath.days||{})[dateKey]||{}).sessions)||[];
}
/* Every session the athlete has in the Mon-Sun week containing `dateKey`, tagged
   with the day it falls on so a week's worth reads in order on one document. */
function indivWeekSessions(ath,dateKey){
  const start=sow(parseD(dateKey));const out=[];
  for(let i=0;i<7;i++){
    const dk=fmt(addD(start,i));
    indivSessionsFor(ath,dk).forEach(s=>out.push({...s,_day:dk,_dayIdx:i}));
  }
  return out;
}
/* Generic chip multi-select used for constraint tags everywhere. */
function TagChips({value,onChange,options,empty}){
  const sel=Array.isArray(value)?value:[];
  const toggle=id=>onChange(sel.includes(id)?sel.filter(x=>x!==id):[...sel,id]);
  return(<div className="iv-chips">
    {options.map(o=><button key={o.id} type="button" className={'iv-chip'+(sel.includes(o.id)?' on':'')}
      onClick={()=>toggle(o.id)}>{o.label}</button>)}
    {options.length===0&&<span className="iv-dim">{empty||'—'}</span>}
  </div>);
}

/* Sets, reps and RPE are picked from a list rather than typed — the same three
   numbers get written over and over, and a dropdown is faster than a keyboard.
   Whatever is already written stays selectable even when it is not on the list, so
   a template's rep RANGE ("8-10") or an odd strength-set count survives the coach
   opening the dropdown. */
const SLOT_SETS=['1','2','3','4','5','6','7','8','9','10'];
const SLOT_REPS=['1','2','3','4','5','6','8','10','12','15','20'];
const SLOT_RPES=['4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10'];
const SLOT_SS=['A','B','C','D','E','F'];
function SlotPick({value,options,onChange,title}){
  /* Picked, not typed, but the same rule applies: the box shows the new number on the
     next frame and the plan behind it is rebuilt as a transition. */
  const[v,set]=useLiveValue(String(value==null?'':value),onChange);
  const opts=(v&&!options.includes(v))?[v,...options]:options;
  return(<select value={v} onChange={e=>set(e.target.value)} title={title}>
    <option value="">—</option>
    {opts.map(o=><option key={o} value={o}>{o}</option>)}
  </select>);
}

/* ---- Assistant coach ------------------------------------------------------
   What THIS athlete should train today, in six slots — one per movement pattern.
   It is a reading of their own record, not a generic template and not a call to a
   model: the check-in (readiness, soreness, fatigue, reported pain), yesterday's RPE,
   the acute:chronic load, the latest test session (asymmetries, ankle dorsiflexion,
   ASLR, overhead squat, Y balance, jumps), the anthropometrics, the position group and
   the training level. Every pick names the number that produced it, so the coach can
   disagree with it on the spot — nothing is written anywhere until Copy → Paste. */
const CA_SLOTS=[
  {id:'hip', pattern:'Hip Dominant',    label:'Hip Dominant'},
  {id:'knee',pattern:'Knee Dominant',   label:'Knee Dominant'},
  {id:'push',pattern:'Upper Body Push', label:'Upper Body Push'},
  {id:'pull',pattern:'Upper Body Pull', label:'Upper Body Pull'},
  {id:'core',pattern:'Core',            label:'Core'},
  {id:'acc', pattern:'Accessory',       label:'Aksesuar'},
];
/* One candidate per line: the name, the execution it is filed under (must be one of the
   pattern's own executions), the level it suits, the traits the day's intent selects on,
   the pain regions it LOADS (reported ⇒ dropped), and the needs it answers. */
const CA_POOL={
  hip:[
    {n:'Romanian Deadlift',           ex:'Pull',     lv:2, t:[], base:1,    hits:['back','hamstring'], fix:['ham']},
    {n:'Trap Bar Deadlift',           ex:'Pull',     lv:2, t:[],            hits:['back'],             fix:['power']},
    {n:'Barbell Hip Thrust',          ex:'Push',     lv:1, t:['sup'],       hits:[],                   fix:['glute']},
    {n:'Single-Leg RDL',              ex:'Pull',     lv:2, t:['uni'],       hits:['hamstring'],        fix:['asym','balance']},
    {n:'45° Back Extension',          ex:'Pull',     lv:1, t:['bw'],        hits:['back'],             fix:['ham']},
    {n:'Nordic Hamstring Curl',       ex:'Eccentric',lv:3, t:['ecc'],tp:'4-0-1',hits:['hamstring'],    fix:['ham']},
    {n:'Glute Bridge ISO Hold',       ex:'ISO',      lv:1, t:['iso','bw'],  hits:[],                   fix:['glute']},
    {n:'Kettlebell Swing',            ex:'Pull',     lv:2, t:['exp'],       hits:['back'],             fix:['power']},
  ],
  knee:[
    {n:'Back Squat',                  ex:'Push',     lv:3, t:[], base:1,    hits:['knee','back'],      fix:[]},
    {n:'Goblet Squat',                ex:'Push',     lv:1, t:['sup'],       hits:['knee'],             fix:['tech']},
    {n:'Front Squat',                 ex:'Push',     lv:3, t:[],            hits:['knee','back','wrist'],fix:['tech']},
    {n:'Bulgarian Split Squat',       ex:'Push',     lv:2, t:['uni'],       hits:['knee'],             fix:['asym','balance']},
    {n:'Split Squat ISO Hold',        ex:'ISO',      lv:1, t:['iso','uni'], hits:[],                   fix:['asym','tech']},
    {n:'Leg Press',                   ex:'Push',     lv:1, t:['sup'],       hits:[],                   fix:[]},
    {n:'Tempo Box Squat (3-1-1)',     ex:'Eccentric',lv:2, t:['ecc'],tp:'3-1-1',hits:['knee'],         fix:['tech']},
    {n:'Step-Up',                     ex:'Push',     lv:1, t:['uni'],       hits:[],                   fix:['asym','balance']},
    {n:'Wall Sit',                    ex:'ISO',      lv:1, t:['iso','bw'],  hits:[],                   fix:[]},
  ],
  push:[
    {n:'Barbell Bench Press',         ex:'Horizontal',lv:2, t:[], base:1,   hits:['shoulder','wrist'], fix:[]},
    {n:'Neutral-Grip DB Bench Press', ex:'Horizontal',lv:1, t:[],           hits:[],                   fix:['shoulder-health']},
    {n:'Overhead Press',              ex:'Vertical',  lv:3, t:[],           hits:['shoulder','back'],  fix:[]},
    {n:'Landmine Press',              ex:'Vertical',  lv:1, t:[],           hits:[],                   fix:['shoulder-health','tspine']},
    {n:'Incline DB Press',            ex:'Horizontal',lv:2, t:[],           hits:['shoulder'],         fix:[]},
    {n:'Half-Kneeling 1-Arm DB Press',ex:'Vertical',  lv:2, t:['uni'],      hits:['shoulder'],         fix:['asym','core-brace']},
    {n:'Tempo Push-Up (3-1-1)',       ex:'Horizontal',lv:1, t:['bw','ecc'],tp:'3-1-1',hits:['wrist'],  fix:['tech']},
    {n:'Med Ball Chest Pass',         ex:'Horizontal',lv:2, t:['exp'],      hits:[],                   fix:['power']},
  ],
  pull:[
    {n:'Pull-Up',                     ex:'Vertical',  lv:3, t:['bw'],       hits:['shoulder','wrist'], fix:[]},
    {n:'Lat Pulldown',                ex:'Vertical',  lv:1, t:['sup'],base:1,hits:[],                  fix:[]},
    {n:'Barbell Row',                 ex:'Horizontal',lv:3, t:[],           hits:['back'],             fix:[]},
    {n:'Chest-Supported DB Row',      ex:'Horizontal',lv:1, t:['sup'],      hits:[],                   fix:['posture']},
    {n:'1-Arm DB Row',                ex:'Horizontal',lv:2, t:['uni','sup'],hits:[],                   fix:['asym']},
    {n:'Inverted Row',                ex:'Horizontal',lv:1, t:['bw'],       hits:['wrist'],            fix:['tech']},
    {n:'Face Pull',                   ex:'Horizontal',lv:1, t:[],           hits:[],                   fix:['shoulder-health','posture']},
    {n:'Seated Cable Row (neutral)',  ex:'Horizontal',lv:1, t:['sup'],      hits:[],                   fix:['posture']},
  ],
  core:[
    {n:'Front Plank',                 ex:'Anti-Extension',      lv:1, t:['iso','bw'], base:1, hits:[],fix:['core-brace']},
    {n:'Dead Bug',                    ex:'Anti-Extension',      lv:1, t:['bw'],       hits:[],       fix:['core-brace','tech']},
    {n:'Pallof Press',                ex:'Anti-Rotation',       lv:1, t:[],           hits:[],       fix:['core-brace','rot']},
    {n:'Side Plank',                  ex:'Anti-Lateral Flexion',lv:1, t:['iso','bw'], hits:[],       fix:['asym']},
    {n:'Suitcase Carry',              ex:'Anti-Lateral Flexion',lv:2, t:[],           hits:['back','wrist'], fix:['grip','asym']},
    {n:'Cable Woodchop',              ex:'Rotation',            lv:2, t:[],           hits:['back'], fix:['rot']},
    {n:'Hollow Body Hold',            ex:'Flexion',             lv:2, t:['iso','bw'], hits:[],       fix:['core-brace']},
    {n:'Bird Dog',                    ex:'Anti-Rotation',       lv:1, t:['bw'],       hits:[],       fix:['core-brace','posture']},
  ],
  acc:[
    {n:'Eccentric Calf Raise',        ex:'Eccentric',lv:1, t:['ecc'],tp:'4-0-1',hits:['ankle'], fix:['calf','ankle']},
    {n:'Ankle Dorsiflexion Mobilisation',ex:'ISO',   lv:1, t:['iso'],      hits:[],        fix:['ankle']},
    {n:'Tibialis Raise',              ex:'Pull',     lv:1, t:[],           hits:[],        fix:['ankle','calf']},
    {n:'Copenhagen Adduction (ISO)',  ex:'ISO',      lv:2, t:['iso','uni'],hits:['hip'],   fix:['groin','asym']},
    {n:'Hamstring Slider Curl',       ex:'Eccentric',lv:2, t:['ecc'],tp:'4-0-1',hits:['hamstring'], fix:['ham']},
    {n:'Band External Rotation',      ex:'Pull',     lv:1, t:[], base:1,   hits:[],        fix:['shoulder-health']},
    {n:'Y-T-W Scapular Series',       ex:'Pull',     lv:1, t:['bw'],       hits:[],        fix:['posture','shoulder-health','tspine']},
    {n:"Farmer's Carry",              ex:'Pull',     lv:1, t:[],           hits:['back','wrist'], fix:['grip']},
    {n:'Neck Isometrics',             ex:'ISO',      lv:1, t:['iso'],      hits:[],        fix:[]},
  ],
};
/* Position bias — what that group's game asks for most often. It biases CONTENT only:
   an asymmetry is something a test measures, never something a position implies. `other`
   (any non-basketball roster) gets nothing, so a sport the app knows nothing about is not
   second-guessed. */
const CA_POS_BIAS={guard:['ankle','calf','rot'],wing:['ankle','shoulder-health'],post:['shoulder-health','posture','groin','tspine'],other:[]};
/* Which slots a need is allowed to speak for. A leg asymmetry is a reason to press one arm
   at a time in nobody's book, and that is exactly what an unscoped need would do — it fed
   every slot the same +3 and turned all six picks unilateral. */
const CA_NEED_SLOTS={asym:['hip','knee','core','acc'],ankle:['acc','knee'],calf:['acc'],ham:['hip','acc'],
  groin:['acc','hip'],'shoulder-health':['push','pull','acc'],posture:['pull','acc','core'],tspine:['push','pull','acc'],
  'core-brace':['core','push','knee'],rot:['core'],grip:['core','acc'],power:['hip','knee','push'],balance:['knee','hip']};
/* The day's intent: how hard, and which kind of variation the pool should lean on. Only the
   ends of the range state a preference — a normal training day has no business overriding
   the staple lift of a slot with a variation nobody asked for. */
const CA_INTENT={
  recovery:{label:'Toparlanma',  want:['iso','sup','bw'],  dose:{main:{sets:'2',reps:'8', rpe:'5',  rest:'90sn'},hold:{sets:'2',duration:'30sn',rpe:'5',rest:'45sn'},exp:{sets:'2',reps:'3',rpe:'5',rest:'90sn'},acc:{sets:'2',reps:'12',rpe:'5',rest:'45sn'}}},
  maintain:{label:'Koruma',      want:['sup'],             dose:{main:{sets:'3',reps:'6', rpe:'6.5',rest:'2dk'}, hold:{sets:'3',duration:'30sn',rpe:'6',rest:'45sn'},exp:{sets:'3',reps:'3',rpe:'6',rest:'2dk'},  acc:{sets:'2',reps:'12',rpe:'6',rest:'60sn'}}},
  develop: {label:'Geliştirme',  want:[],                  dose:{main:{sets:'4',reps:'5', rpe:'7.5',rest:'2-3dk'},hold:{sets:'3',duration:'40sn',rpe:'7',rest:'60sn'},exp:{sets:'4',reps:'3',rpe:'7',rest:'2dk'},  acc:{sets:'3',reps:'12',rpe:'7',rest:'60sn'}}},
  load:    {label:'Yüklenme',    want:['exp'],             dose:{main:{sets:'5',reps:'3', rpe:'8.5',rest:'3dk'}, hold:{sets:'3',duration:'40sn',rpe:'7',rest:'60sn'},exp:{sets:'5',reps:'3',rpe:'8',rest:'3dk'},  acc:{sets:'3',reps:'10',rpe:'7',rest:'60sn'}}},
};
const caNum=v=>{const n=Number(v);return (v===''||v==null||isNaN(n))?null:n;};
/* Two sides of the same test as a percentage difference of the bigger one. Under 3% is
   measurement noise on any of these, so it is not reported as anything. */
function caAsym(r,l){
  const a=caNum(r),b=caNum(l);
  if(a==null||b==null||a<=0||b<=0)return null;
  const d=Math.abs(a-b)/Math.max(a,b)*100;
  return d<3?null:{pct:Math.round(d),strong:a>=b?'R':'L',weak:a>=b?'L':'R'};
}
/* ---- How hard today can be, for one athlete --------------------------------
   Each signal that says "not today" adds to the same counter, so one bad number
   nudges the day and three of them change it outright. Four rungs, worst first:
   recovery → maintain → develop → load — CA_INTENT carries their words and their
   doses. Read both by the assistant coach's exercise picker and by the Team
   Insights flag list, which is what makes "tier stepped down" mean the same thing
   in the box that writes the session and in the board that flags the athlete.
   `pre` lets a caller that has already read the athlete hand the inputs in rather
   than paying for them a second time. */
function athLoadTier(ath,ref,pre){
  const p=pre||{};
  const rd=p.rd||athReadiness(ath,ref);
  const well=p.well||athWellnessSnap(ath,ref);
  const prev=p.prev||athPrevDay(ath,ref);
  const acwr=p.acwr!=null?p.acwr:athACWR(ath,ref);
  const flags=p.flags||[...new Set([...athPainReports(ath,ref).map(x=>x.tag),
    ...(((ath&&ath.constraintTags)||[]).filter(Boolean))])];
  let stress=0;
  if(rd.score!=null&&rd.score<2.5)stress+=2;else if(rd.score!=null&&rd.score<3.2)stress+=1;
  if(acwr>1.5)stress+=2;else if(acwr>1.3)stress+=1;
  if(prev.rpe!=null&&prev.rpe>=8.5)stress+=1;
  if(well.soreness!=null&&well.soreness<=2)stress+=1;
  if(well.fatigue!=null&&well.fatigue<=2)stress+=1;
  if(flags.length)stress+=1;
  const intent=stress>=4?'recovery':stress>=2?'maintain'
    :(acwr>0&&acwr<0.8&&rd.score!=null&&rd.score>=3.9)?'load':'develop';
  return{intent,stress,rd,well,prev,acwr,flags};
}
/* Everything the six picks are made of, read once. Kept separate from the picking so the
   box can show the coach the same evidence the choice was made on. */
function caReadAthlete(ath,ref){
  const rd=athReadiness(ath,ref),well=athWellnessSnap(ath,ref),prev=athPrevDay(ath,ref);
  const pains=athPainReports(ath,ref).map(p=>p.tag);
  const note=athPainNote(ath,ref);
  const acwr=athACWR(ath,ref);
  const tests=[...(ath.tests||[])].filter(t=>t.date).sort((a,b)=>a.date.localeCompare(b.date));
  const t=tests[tests.length-1]||null;
  const needs={},drivers=[];
  const need=(k,why)=>{if(!needs[k])needs[k]=why;};
  /* Long-standing tags the coach ticked on the card count alongside what the athlete
     reported this morning: a knee that is being managed is a knee to work around. */
  const flags=[...new Set([...pains,...((ath.constraintTags||[]).filter(Boolean))])];
  flags.forEach(f=>{
    drivers.push(`${ctLabel(f)} ağrısı — bölgeyi yükleyen seçenekler elendi`);
    if(f==='ankle')need('ankle','ayak bileği şikâyeti');
    if(f==='hamstring')need('ham','hamstring şikâyeti');
    if(f==='shoulder')need('shoulder-health','omuz şikâyeti');
    if(f==='back')need('core-brace','bel şikâyeti');
    if(f==='hip')need('groin','kalça/kasık şikâyeti');
  });
  let asym=null;
  if(t){
    const pairs=[
      ['Lateral CMJ',caAsym(t.lateralCmj&&t.lateralCmj.right,t.lateralCmj&&t.lateralCmj.left)],
      ['Y Balance',  caAsym(ybCalc(t.yBalance).compR,ybCalc(t.yBalance).compL)],
      ['Uyluk çevresi',caAsym(t.circ&&t.circ.thighRight,t.circ&&t.circ.thighLeft)],
      ['Baldır çevresi',caAsym(t.circ&&t.circ.calfRight,t.circ&&t.circ.calfLeft)],
    ].filter(([,v])=>v&&v.pct>=10);
    if(pairs.length){
      const[nm,v]=pairs.sort((a,b)=>b[1].pct-a[1].pct)[0];
      asym={test:nm,...v};
      need('asym',`${nm} sağ/sol farkı %${v.pct}`);
      drivers.push(`${nm} sağ/sol farkı %${v.pct} (zayıf taraf: ${v.weak==='L'?'sol':'sağ'}) — tek taraflı çalışma`);
    }
    const df=[caNum(t.ankleDF&&t.ankleDF.right),caNum(t.ankleDF&&t.ankleDF.left)].filter(v=>v!=null);
    if(df.length&&Math.min(...df)<35){need('ankle',`ayak bileği dorsifleksiyon ${Math.min(...df)}°`);
      drivers.push(`Ayak bileği dorsifleksiyonu ${Math.min(...df)}° (<35°) — mobilite/baldır işi`);}
    const as=[caNum(t.aslr&&t.aslr.right),caNum(t.aslr&&t.aslr.left)].filter(v=>v!=null);
    if(as.length&&Math.min(...as)<=1){need('ham',`ASLR ${Math.min(...as)}/3`);
      drivers.push(`ASLR ${Math.min(...as)}/3 — arka zincir uzunluğu/kontrolü`);}
    const ohs=caNum(t.ohs&&t.ohs.score);
    if(ohs!=null&&ohs<=1){need('core-brace',`overhead squat ${ohs}/3`);need('tspine',`overhead squat ${ohs}/3`);
      need('tech',`overhead squat ${ohs}/3`);
      drivers.push(`Overhead squat ${ohs}/3 — destekli/teknik varyasyon, gövde kontrolü`);}
    const h=caNum(t.height),w=caNum(t.weight),bf=caNum(t.bodyFat);
    if(bf!=null&&bf>=20){need('bw',`vücut yağı %${bf}`);drivers.push(`Vücut yağı %${bf} — eklem yükü düşük varyasyonlar`);}
    if(h&&w){const bmi=w/((h/100)**2);if(bmi>=27)drivers.push(`BMI ${bmi.toFixed(1)} — sıçrama hacmi düşük tutuldu`);}
  }else drivers.push('Test kaydı yok — seçim check-in, yük ve pozisyona göre yapıldı');
  CA_POS_BIAS[posGroupOf(ath.position)].forEach(k=>need(k,`pozisyon: ${posGroupLabel(posGroupOf(ath.position))}`));
  // How hard today can be — the shared ladder, so this box and the Team Insights
  // flag list step an athlete down for exactly the same reasons.
  const{intent}=athLoadTier(ath,ref,{rd,well,prev,acwr,flags});
  if(rd.score!=null)drivers.unshift(`Hazırlık ${rd.score}/5${rd.src==='srpe'?' (sRPE tahmini)':''}`);
  else drivers.unshift('Check-in yok — hazırlık okunamadı');
  if(acwr>0)drivers.push(`ACWR ${acwr.toFixed(2)} — ${acwrZoneOf(acwr).t}`);
  if(prev.rpe!=null)drivers.push(`Dün RPE ${prev.rpe}${prev.load>0?` · ${prev.load} AU`:''}`);
  if(!needs.power&&intent==='load')need('power','ACWR düşük, hazırlık iyi');
  const lv=Number(String(ath.levelTag||'').replace(/\D/g,''))||(caNum(ath.trainingAge)>=3?3:caNum(ath.trainingAge)>=1?2:2);
  return{rd,well,prev,acwr,flags,note,needs,drivers,intent,asym,level:lv,test:t,
    pos:posGroupOf(ath.position)};
}
/* The pick itself: drop what the reported pain loads, then score what is left on the needs
   it answers and how well it fits the day. Deterministic — same athlete, same day, same
   `round`, same six exercises, so the coach can go back to the box and find it saying what
   it said.

   `round` is what the refresh button turns. The candidates are ranked once and the round
   walks down that ranking, so pressing refresh does not re-roll the pick at random — it
   hands over the next best exercise for THIS athlete, still filtered by the pain that was
   reported and still scored on the needs their tests showed. Past the end of the ranking
   it wraps around to the first, so refresh never runs out. */
function caPick(slotId,rx,round){
  const pool=CA_POOL[slotId]||[];
  const want=CA_INTENT[rx.intent].want;
  const safe=pool.filter(c=>!c.hits.some(h=>rx.flags.includes(h)));
  const list=safe.length?safe:pool;   // everything hurts: fall back rather than show nothing
  // A need only counts for the slots it is about (see CA_NEED_SLOTS); one with no entry
  // there — technique, body weight, glute work — speaks everywhere.
  const asks=k=>{const sc=CA_NEED_SLOTS[k];return rx.needs[k]&&(!sc||sc.includes(slotId))?rx.needs[k]:null;};
  const ranked=list.map((c,i)=>{
    let s=c.base?2.5:0;               // the slot's staple lift, when nothing else is asked for
    const why=[];
    c.fix.forEach(f=>{const w=asks(f);if(w){s+=3;why.push(w);}});
    c.t.forEach(tr=>{if(want.includes(tr))s+=2;const w=asks(tr);if(w){s+=2;why.push(w);}});
    if(c.t.includes('uni')&&rx.asym&&(CA_NEED_SLOTS.asym.includes(slotId)))s+=2;
    s-=Math.abs(c.lv-rx.level)*(c.lv>rx.level?2:1);
    s-=i*0.01;                        // stable order, never a coin toss
    return{c,s,why};
  }).sort((a,b)=>b.s-a.s);
  if(!ranked.length)return null;
  const n=ranked.length;
  const at=((Number(round)||0)%n+n)%n;
  const{c:best,why}=ranked[at];
  const bestWhy=[...why];
  if(!bestWhy.length){
    bestWhy.push(safe.length<pool.length
      ?`${rx.flags.map(ctLabel).join(', ')} bölgesini yüklemiyor`
      :`${CA_INTENT[rx.intent].label} günü için uygun yüklenme`);
  }
  const dose=CA_INTENT[rx.intent].dose;
  /* A hold is prescribed in seconds and a throw in a handful of crisp reps — neither is
     the main lift's set×rep, so each gets its own line of the dose table. */
  const d=c=>c.t.includes('iso')?dose.hold:c.t.includes('exp')?dose.exp:(slotId==='acc'||slotId==='core')?dose.acc:dose.main;
  return{slot:slotId,name:best.n,pattern:(CA_SLOTS.find(s=>s.id===slotId)||{}).pattern,plane:best.ex,
    ...{sets:'',reps:'',duration:'',rpe:'',rest:'',tempo:'',load:''},...d(best),...(best.tp?{tempo:best.tp}:{}),
    why:[...new Set(bestWhy)].slice(0,2).join(' · '),alts:n};
}
function caSuggest(ath,ref,round){
  const rx=caReadAthlete(ath,ref);
  return{...rx,round:Number(round)||0,items:CA_SLOTS.map(s=>caPick(s.id,rx,round)).filter(Boolean)};
}

/* The button beside Training Method, and the box it opens. Nothing here writes to the
   session: Copy puts one row on the clipboard and the slot's paste button is what puts it
   into the program. */
function CoachAssistant({ath,date}){
  const[open,setOpen]=useState(false);
  const[copied,setCopied]=useState('');
  /* Which round of suggestions is on screen. 0 is the assistant's first answer; every
     press of the refresh button steps it on and every slot hands over its next-best
     exercise for this athlete. A different athlete or a different day is a different
     question, so the count starts over. */
  const[round,setRound]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[open]);
  const day=date||fmt(today);
  useEffect(()=>{setRound(0);},[ath&&ath.id,day]);
  const s=useMemo(()=>open?caSuggest(ath,day,round):null,[open,ath,day,round]);
  const copy=it=>{copyExerciseToClipboard(it);setCopied(it.slot);setTimeout(()=>setCopied(''),1600);};
  const dose=it=>[it.sets&&it.duration?`${it.sets} × ${it.duration}`:(it.sets&&it.reps?`${it.sets} × ${it.reps}`:(it.duration||it.reps||'')),
    it.rpe?`RPE ${it.rpe}`:'',it.rest?L(`dinlenme ${it.rest}`,`rest ${it.rest}`):''].filter(Boolean).join(' · ');
  return(<div className="ca-wrap" ref={ref}>
    <button type="button" className={'ca-btn'+(open?' on':'')} onClick={()=>setOpen(o=>!o)}
      title={L(`${ath.name||'Sporcu'} bugün ne çalışmalı — test, antropometri, pozisyon, ağrı, wellness ve RPE verisinden`,
        `What ${ath.name||'this athlete'} should train today — off their test, anthropometric, position, pain, wellness and RPE data`)}>{L('Yrd. Antrenör','Ass. Coach')}</button>
    {open&&s&&<div className="ca-pop">
      <div className="ca-hd">
        <b>{ath.name||L('Sporcu','Athlete')} · {fd(day)}</b>
        {/* Refresh: the same reading of the athlete, the next set of exercises off it.
            The intent, the evidence and the pain filter do not move — only which
            exercise each slot is answered with. */}
        <button type="button" className="ca-rf" onClick={()=>setRound(r=>r+1)}
          title={L('Yenile — aynı okumadan, bu sporcuya uygun yeni egzersizler','Refresh — the same reading, the next set of exercises that suit this athlete')}>↻ {L('Yenile','Refresh')}</button>
        <span className={'ca-intent i-'+s.intent}>{CA_INTENT[s.intent].label}</span>
      </div>
      <div className="ca-why">{s.drivers.slice(0,4).join(' · ')}</div>
      {s.round>0&&<div className="ca-alt">{L(`${s.round+1}. öneri seti — aynı gerekçeler, sıradaki uygun egzersizler.`,`Suggestion set ${s.round+1} — the same reasoning, the next exercises that fit.`)}</div>}
      {s.note&&<div className="ca-pain">{s.note.quoted?`“${s.note.text}”`:s.note.text}</div>}
      <div className="ca-list">
        {s.items.map(it=><div key={it.slot} className="ca-it">
          <div className="ca-it-l">
            <span className="ca-slot">{(CA_SLOTS.find(x=>x.id===it.slot)||{}).label}</span>
            <span className="ca-nm">{it.name}</span>
            <span className="ca-dose">{dose(it)}{it.plane?` · ${it.plane}`:''}</span>
            <span className="ca-r">{it.why}</span>
          </div>
          <button type="button" className={'ca-cp'+(copied===it.slot?' ok':'')} onClick={()=>copy(it)}
            title={L('Bu egzersizi kopyala — sonra bir slotun yapıştır düğmesine bas','Copy this exercise — then press paste on a slot')}>{copied===it.slot?'Copied':'Copy'}</button>
        </div>)}
      </div>
      <div className="ca-ft">Öneri — hiçbir şey programa kendiliğinden yazılmaz. Copy'ye bas, sonra egzersiz satırındaki yapıştır düğmesini kullan.</div>
    </div>}
  </div>);
}

