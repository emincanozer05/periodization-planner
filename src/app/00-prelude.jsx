const{useState,useEffect,useLayoutEffect,useMemo,useRef,useCallback}=React;

/* Report/print/PDF font — mirror the site's Archivo so exported outputs use
   the same typeface as the web app. Uses an absolute URL so the font resolves in
   both print windows (window.open) and offscreen iframes. */
const RPT_FONT=`@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Medium.ttf') format('truetype');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-SemiBold.ttf') format('truetype');font-weight:600;font-style:normal;font-display:swap}
@font-face{font-family:'Archivo';src:url('${location.origin}/fonts/Archivo-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
*{font-family:'Archivo','Space Grotesk','Inter','Segoe UI',system-ui,sans-serif !important;font-style:normal !important}
h1,h2,h3,h4,h5,h6{font-weight:700 !important}`;

