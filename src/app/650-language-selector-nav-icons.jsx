/* Global "Language" control — switching it takes effect instantly, everywhere:
   UI text and every generated report/PDF share this one setting. On the
   marketing/login page and the loading screen (no sidebar to dock into) it
   floats fixed to the bottom-left corner; inside the app it renders `inline`
   instead — a normal, non-floating row docked in the sidebar, between the
   team/account block and the nav groups, so it never overlaps other content. */
/* The flag beside the language is DRAWN, not typed. The 🇬🇧 / 🇹🇷 emoji are pairs of
   regional-indicator letters that the font is asked to fuse into a flag, and Windows
   ships no flag glyphs at all — it renders the letters, so the control said "GB English"
   on exactly the machines most coaches use. Two small SVGs say it everywhere. */
const LANG_FLAGS={
  en:(<svg viewBox="0 0 60 40" aria-hidden="true">
    <clipPath id="lf-uk"><path d="M30 20h30v20zv20H0zH0V0zV0h30z"/></clipPath>
    <rect width="60" height="40" fill="#012169"/>
    <path d="M0 0l60 40m0-40L0 40" stroke="#fff" strokeWidth="8"/>
    <path d="M0 0l60 40m0-40L0 40" stroke="#c8102e" strokeWidth="5" clipPath="url(#lf-uk)"/>
    <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13"/>
    <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8"/>
  </svg>),
  tr:(<svg viewBox="0 0 60 40" aria-hidden="true">
    <rect width="60" height="40" fill="#e30a17"/>
    <circle cx="25" cy="20" r="10" fill="#fff"/>
    <circle cx="28.5" cy="20" r="8" fill="#e30a17"/>
    <polygon fill="#fff" points="40.50,14.80 41.70,18.34 45.45,18.39 42.45,20.63 43.56,24.21 40.50,22.05 37.44,24.21 38.55,20.63 35.55,18.39 39.30,18.34"/>
  </svg>),
};
function LanguageSelector({inline}){
  useAppLang();
  /* The flag shows the language that is SELECTED — an <option> cannot hold a picture,
     so the row wears the current one rather than the list wearing all of them. */
  const flag=<span className="lang-flag">{LANG_FLAGS[REPORT_LANG]||LANG_FLAGS.en}</span>;
  const sel=(<select className={inline?'lang-inline-sel':'lang-fixed-sel'} value={REPORT_LANG} onChange={e=>setReportLang(e.target.value)}
      aria-label={L('Dil seçimi','Language selector')}>
      <option value="en">English</option>
      <option value="tr">Türkçe</option>
    </select>);
  if(inline)return(<div className="lang-inline">
    <span className="bt-label">{L('Dil','Language')}</span>
    {flag}
    {sel}
  </div>);
  return(<div className="lang-fixed">
    <span className="lang-fixed-ic" aria-hidden="true">🌐</span>
    {flag}
    {sel}
  </div>);
}
// Sidebar nav icons — simple stroke glyphs that inherit the lime accent via
// currentColor, each chosen to match its section's meaning.
const NIc=({children})=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const NAV_ICONS={
  season:<NIc><path d="M4 6h13"/><path d="M4 12h16"/><path d="M4 18h9"/></NIc>,
  calendar:<NIc><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/></NIc>,
  allcal:<NIc><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M7 13.5h4"/><path d="M13 13.5h4"/><path d="M7 17h4"/></NIc>,
  athletes:<NIc><circle cx="9" cy="8" r="3"/><path d="M3.6 19.4c.6-3 2.8-4.7 5.4-4.7s4.8 1.7 5.4 4.7"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.6 14.9c1.9.5 3.3 2.1 3.7 4.5"/></NIc>,
  reports:<NIc><path d="M4 20h16"/><path d="M7 20v-6"/><path d="M12 20V8"/><path d="M17 20v-9"/></NIc>,
  exercises:<NIc><path d="M6 8v8"/><path d="M9 6v12"/><path d="M15 6v12"/><path d="M18 8v8"/><path d="M9 12h6"/></NIc>,
  templates:<NIc><rect x="8" y="8" width="12.5" height="12.5" rx="2"/><path d="M4.5 15.5V5.5a2 2 0 0 1 2-2h9"/></NIc>,
  individual:<NIc><circle cx="7" cy="7.5" r="2.6"/><circle cx="7" cy="16.5" r="2.6"/><path d="M12 7.5h4.5"/><path d="M12 16.5h7.5"/><path d="M16.5 7.5v4.5h3"/></NIc>,
  evaluation:<NIc><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 11.5l2 2 4-4.5"/></NIc>,
  setup:<NIc><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/></NIc>,
  backup:<NIc><path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19.5h14"/></NIc>,
  tempo:<NIc><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></NIc>,
  checkin:<NIc><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8.5 9.5h7"/><path d="M8.5 13.5h4.5"/><path d="M14.5 17.5l1.8 1.8 3.2-3.6"/></NIc>,
  tryouts:<NIc><circle cx="10.5" cy="8" r="3.2"/><path d="M4.5 19.6c.7-3.2 3-5 6-5s5.3 1.8 6 5"/><path d="M17.5 4.5v6"/><path d="M14.5 7.5h6"/></NIc>,
};
