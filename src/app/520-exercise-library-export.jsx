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
