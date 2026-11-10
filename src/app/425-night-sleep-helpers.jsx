/* ═══════════════════════════════════════════════════════════════════════════
   GECE / UYKU YARDIMCILARI — elle girilen gece kaydının (ath.nightLog) okunması

   Gece kaydı: [{id,date,bedTime,wakeTime,hrv,sleepHR}], sabah başına bir satır; tarih
   sporcunun uyandığı sabah. Check-in satırlarından ayrı durur ki yeniden gönderilen bir
   form geceyi ezmesin. Kayıt formu Sporcu İzleme bileşeninde (428b MonNightLog; bölüm Wellness sporcu sayfasından kaldırıldı).

   Eski "Uyku ve HRV" bölümü (CoachOS_HRV_Monitoring v1.0: RED / YELLOW / DAILY_DROP
   uyarı seviyeleri, renkli sabit eşikler) kaldırıldı: revizyon talimatı v1.4 risk renkli
   sabit sınıflandırma istemiyor ve HRV izlenecek veri grupları arasında değil. Ham HRV
   değerleri kayıtta duruyor (silinmedi); Polar'dan gelen HRV, Polar grafiklerinde.
   ═══════════════════════════════════════════════════════════════════════════ */
/* "23:40" → minutes after midnight. */
const hhmmMin=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(v||'').trim());if(!m)return null;const h=+m[1],mi=+m[2];return h<24&&mi<60?h*60+mi:null;};
/* Minutes asleep from falling asleep to waking, across midnight; nothing over 18 h. */
function nightSleepMin(n){
  const b=hhmmMin(n&&n.bedTime),w=hhmmMin(n&&n.wakeTime);
  if(b==null||w==null)return null;
  let d=w-b;if(d<=0)d+=1440;
  return d>0&&d<=1080?d:null;
}
const fmtSleep=m=>m==null?'—':L(`${Math.floor(m/60)} sa ${String(m%60).padStart(2,'0')} dk`,`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} m`);
/* Width of a box in px, kept current — the charts are drawn in real pixels. */
function useElW(ref,fallback){
  const[w,setW]=useState(fallback||600);
  useEffect(()=>{const el=ref.current;if(!el)return;
    const m=()=>setW(Math.max(80,el.clientWidth||0));m();
    let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);try{ro.observe(el);}catch(e){}}
    else window.addEventListener('resize',m);
    return()=>{try{ro&&ro.disconnect();}catch(e){}window.removeEventListener('resize',m);};
  },[]);
  return w;
}
