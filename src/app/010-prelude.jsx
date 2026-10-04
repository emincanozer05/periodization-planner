const{useState,useEffect,useLayoutEffect,useMemo,useRef,useCallback}=React;

/* Dışa aktarma kütüphaneleri İHTİYAÇ ANINDA. Eskiden <head>'de senkron yükleniyorlardı:
   her açılışta ~900 KB, ilk çizimi bekleten indirme — oysa yalnızca PDF/görsel dışa
   aktarırken ve FMS PDF'i yüklerken lazımlar. Sıralı yükleniyor (autotable jsPDF'e takılır).
   Uygulama açıldıktan sonra boşta bir kez arka planda ÇEKİLİYOR (çalıştırılmadan): service
   worker kopyasını saklıyor, yani dışa aktarma çevrimdışıyken de çalışıyor ve ilk tıklamada
   beklenmiyor. pdf.js: yüklenen FMS puan kâğıdı bir PDF; sayfaları yüklemede resme çevrilip
   rapora o resimler basılıyor. */
const LIB_SRC={
  jspdf:'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  autotable:'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.7.1/dist/jspdf.plugin.autotable.min.js',
  html2canvas:'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  pdfjs:'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
};
const LIB_READY={jspdf:()=>!!window.jspdf,autotable:()=>!!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable),
  html2canvas:()=>typeof window.html2canvas==='function',pdfjs:()=>!!window.pdfjsLib};
const _libLoading={};
function loadLib(key){
  if(LIB_READY[key]())return Promise.resolve();
  return _libLoading[key]||(_libLoading[key]=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=LIB_SRC[key];s.async=true;
    s.onload=()=>res();
    s.onerror=()=>{delete _libLoading[key];s.remove();
      rej(new Error(L(`Gerekli bileşen yüklenemedi (${key}) — bağlantını kontrol edip tekrar dene.`,`A required component could not load (${key}) — check your connection and try again.`)));};
    document.head.appendChild(s);
  }));
}
async function needLibs(...keys){for(const k of keys)await loadLib(k);}
// Boşta bir kez arka planda çek (çalıştırmadan): kopya service worker'da, ilk tıklama beklemesin.
window.addEventListener('load',()=>{
  const go=()=>{try{const c=navigator.connection;if(c&&c.saveData)return;
    Object.values(LIB_SRC).forEach(u=>fetch(u,{mode:'cors',credentials:'omit'}).catch(()=>{}));}catch(e){}};
  setTimeout(()=>(window.requestIdleCallback||setTimeout)(go,{timeout:8000}),6000);
});

/* Report/print/PDF font — mirror the site's Archivo so exported outputs use
   the same typeface as the web app. Uses an absolute URL so the font resolves in
   both print windows (window.open) and offscreen iframes. */
const RPT_FONT=`@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Medium.ttf') format('truetype');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-SemiBold.ttf') format('truetype');font-weight:600;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
*{font-family:'Archivo','Space Grotesk','Inter','Segoe UI',system-ui,sans-serif !important;font-style:normal !important}
h1,h2,h3,h4,h5,h6{font-weight:700 !important}`;

