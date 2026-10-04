/* The device media store is read into memory BEFORE the first paint: mediaSrc() resolves a
   `local:` handle synchronously inside render, and a store that is unreadable (private mode,
   blocked storage) simply leaves those slots empty rather than holding up the app. */
lmPersist();
lmPreload().finally(()=>ReactDOM.createRoot(document.getElementById('root')).render(<App/>));
