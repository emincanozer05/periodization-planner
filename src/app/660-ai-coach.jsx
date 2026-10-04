/* =========================================================
   AI COACH ASSISTANT — talks to the Claude Messages API directly
   from the browser using the coach's own API key (stored locally).
   It is given a live, compact snapshot of the active team so it can
   advise on programming, load management and exercise content.
   ========================================================= */
/* ---- Gemini models -------------------------------------------------------
   The display name and the API id are two different things and are kept apart: `label`
   is what the coach reads in the dropdown, `id` is the exact string that goes into the
   request URL. Nothing derives one from the other.

   This list is a FALLBACK. The dropdown prefers the models the key itself reports
   (geminiListModels below), so a model Google shipped this morning is selectable this
   afternoon without a release here. The seed exists for the two cases the live call
   cannot cover: no key entered yet, and the call failing.

   `note` is the parenthetical a coach uses to choose (cost, speed); it is not part of
   the id and never reaches the API. */
const GEMINI_SEED_MODELS=[
  {id:'gemini-3.8-flash',     label:'Gemini 3.8 Flash',      note:['en yetenekli Flash','the most capable Flash']},
  {id:'gemini-3.7-flash',     label:'Gemini 3.7 Flash',      note:['hızlı ve güncel','fast and current']},
  {id:'gemini-3.6-flash',     label:'Gemini 3.6 Flash',      note:['kararlı sürüm','a stable release']},
  {id:'gemini-3.5-flash',     label:'Gemini 3.5 Flash',      note:['kararlı sürüm','a stable release']},
  {id:'gemini-3.5-flash-lite',label:'Gemini 3.5 Flash-Lite', note:['en hızlı / en ucuz','the fastest and cheapest']},
  {id:'gemini-2.5-flash',     label:'Gemini 2.5 Flash',      note:['önceki nesil','previous generation']},
  {id:'gemini-2.5-pro',       label:'Gemini 2.5 Pro',        note:['önceki nesil, sıkı ücretsiz kota','previous generation, tight free quota']},
];
/* Models the Gemini API will not write a training session with, whatever else they do:
   embeddings, image/video/audio generation, speech and the live/realtime endpoints. The
   list below is matched against the model id, and `generateContent` support is checked
   separately from the API's own answer — a model has to pass both to be offered. */
const GEMINI_NON_TEXT=/embedding|embed-|aqa|imagen|image-generation|-image$|veo|tts|audio|live-|realtime|learnlm-vision/i;
/* The models this key can actually call, asked of the API rather than remembered.
   Filtered to the ones that can do text generation, because the dropdown's whole job
   is picking the model that writes a session — offering an embedding model would be
   offering a guaranteed failure. */
/* ---- The server side of every Gemini call ---------------------------------
   The Gemini key is not in this page any more — not in the source, not in the synced
   workspace, not in localStorage. It lives in the Cloud Functions environment (Secret
   Manager, GEMINI_API_KEY) and every Gemini call goes through a function signed with
   the coach's own Firebase session:
     • everything (the assistant, the connection test, the model list) → the
       `geminiProxy` callable, one call per question, exactly as before.
   The callable protocol is plain HTTPS: POST {data} with the ID token, answer {result}
   or {error}. No extra SDK is loaded for it. */
const AI_FN_REGION='us-central1';
const AI_FN_BASE=`https://${AI_FN_REGION}-periodization-planner.cloudfunctions.net`;
/* What the key field holds for Gemini now: a marker that the key is the server's. The
   gates that used to read "is there a key?" read it as "yes", because there is one. */
const AI_SERVER_KEY='server-managed';
async function aiProxyCall(data){
  const fb=FB();
  const u=fb&&fb.auth&&fb.auth().currentUser;
  if(!u)throw new Error(L('AI için oturum açman gerekiyor.','Sign in to use the AI.'));
  let tok='';
  try{tok=await u.getIdToken();}catch(e){throw new Error(L('Oturum doğrulanamadı — sayfayı yenile.','The session could not be verified — reload the page.'));}
  let r;
  try{
    r=await fetch(AI_FN_BASE+'/geminiProxy',{method:'POST',
      headers:{'content-type':'application/json',authorization:'Bearer '+tok},
      body:JSON.stringify({data})});
  }catch(e){throw new Error(L('Ağ hatası — internet bağlantını kontrol et.','Network error — check your connection.'));}
  let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok||!j||j.error){
    /* The function words its own errors for a coach; a stack trace never reaches here. */
    const m=(j&&j.error&&j.error.message)||L(`AI servisine ulaşılamadı (${r.status}).`,`The AI service could not be reached (${r.status}).`);
    throw new Error(m);
  }
  return j.result;
}
async function geminiListModels(){
  const res=await aiProxyCall({op:'listModels'});
  const out=[];
  ((res&&res.models)||[]).forEach(m=>{
    const id=String((m&&m.id)||'').trim();
    if(!id||GEMINI_NON_TEXT.test(id))return;
    out.push({id,label:String((m&&m.displayName)||id).trim()||id,live:true});
  });
  /* Newest first, as the API tends to list oldest first. A plain reverse would be a
     guess; sorting on the version number in the id is what a coach means by "newest". */
  const ver=id=>{const mm=String(id).match(/(\d+(?:\.\d+)?)/);return mm?parseFloat(mm[1]):0;};
  out.sort((a,b)=>ver(b.id)-ver(a.id)||a.id.localeCompare(b.id));
  return out;
}

const AIC_PROVIDERS={
  gemini:{label:'Gemini',short:'Gemini · sunucu',keyPlaceholder:'',serverKey:true,
    keyHelp:()=>L(<>Gemini anahtarı <b>sunucuda</b> (Cloud Functions · Secret Manager) tutulur; tarayıcıya, senkronlanan veriye ya da bu cihaza hiç gelmez. Yönetici: <code>firebase functions:secrets:set GEMINI_API_KEY</code>.</>,
      <>The Gemini key is kept <b>on the server</b> (Cloud Functions · Secret Manager); it never reaches the browser, the synced data or this device. Admin: <code>firebase functions:secrets:set GEMINI_API_KEY</code>.</>),
    /* A SEED, not the catalogue. The live list comes from the Gemini API itself
       (geminiListModels) as soon as a key is present, because a list typed into the
       source is out of date the moment Google ships anything — which is exactly how
       this dropdown came to be offering 2.0 Flash and nothing newer. These are the
       fallback for a coach who has not entered a key yet, or whose network refused
       the call. `id` is what goes on the wire; `label` is only ever shown. */
    models:GEMINI_SEED_MODELS,
    /* The live catalogue is the Gemini API's to state, so a model saved here is not
       second-guessed against the seed above. */
    live:geminiListModels},
  anthropic:{label:'Claude',short:'Claude · ücretli',keyPlaceholder:'sk-ant-…',
    keyHelp:()=>L(<>Anahtarı <b>console.anthropic.com</b> → API Keys'ten alırsın (kullandıkça öde, ~5$ bakiye gerekir).</>,
      <>Get the key from <b>console.anthropic.com</b> → API Keys (pay as you go, needs about $5 of credit).</>),
    /* Anthropic has no discovery call here, so this list IS the catalogue: a model
       outside it is one this app does not offer, and a saved id that has left the
       list falls back rather than going on the wire (see aiModelOf). */
    closedList:true,
    models:[{id:'claude-opus-5',label:'Opus 5',note:['en yetenekli','the most capable']},
            {id:'claude-sonnet-5',label:'Sonnet 5',note:['hızlı / uygun','fast and affordable']},
            {id:'claude-haiku-4-5',label:'Haiku 4.5',note:['en ucuz','the cheapest']}]},
};
/* What the dropdown shows: the model's own name, with the buying note beside it. The
   id is never built from this and never shown as the label. */
const aiModelLabel=m=>(m&&m.note)?`${m.label} — ${L(m.note[0],m.note[1])}`:((m&&m.label)||'');
/* The default model of each provider is the FIRST one it lists, so the list stays the
   single place a model is named. It used to be typed out again at every call site —
   five copies of 'claude-opus-4-8' — and a list updated in one place left the others
   pointing at a model the dropdown no longer offered. */
const aiProviderOf=ai=>((ai&&ai.provider)||'gemini');
const aiCfgOf=ai=>AIC_PROVIDERS[aiProviderOf(ai)]||AIC_PROVIDERS.gemini;
const aiKeyOf=ai=>(aiProviderOf(ai)==='anthropic'?((ai&&ai.akey)||''):AI_SERVER_KEY);
/* Which model this request will actually be addressed to, and — when that is not the
   one saved — the fact that it is not.

   The fallback itself is right: on a CLOSED list (Claude) an id that has left the list
   would go on the wire as a retired model and come back a 404, so falling back to a
   live one is better than failing. What was wrong is that it happened in SILENCE. The
   settings card went on showing the saved model, the request carried a different one,
   and the only way to find out was to open a console on localhost. A swap the coach
   cannot see is a swap they cannot consent to, so the swap is now reported: same
   behaviour, stated out loud. Where the catalogue is the provider's to state (Gemini,
   which is asked directly) the coach's pick always stands — a model newer than this
   file is the normal case, and second-guessing it would put back the original bug. */
function aiModelResolve(ai){
  const p=aiProviderOf(ai);
  const picked=p==='anthropic'?(ai&&ai.amodel):(ai&&ai.gmodel);
  const cfg=AIC_PROVIDERS[p]||AIC_PROVIDERS.gemini;
  const list=cfg.models;
  if(!picked)return{id:list[0].id,fellBackFrom:null,defaulted:true};
  if(cfg.closedList&&!list.some(m=>m.id===picked))return{id:list[0].id,fellBackFrom:picked,defaulted:false};
  return{id:picked,fellBackFrom:null,defaulted:false};
}
const aiModelOf=ai=>aiModelResolve(ai).id;

async function askCoach(apiKey,model,system,messages,opts){
  const o=opts||{};
  let r;
  try{
    const body={model,max_tokens:o.maxTokens||6000,system,messages};
    /* Haiku 4.5 predates adaptive thinking and takes a token budget instead, so it is
       sent without the block rather than with one it would reject. */
    if(model!=='claude-haiku-4-5'){body.thinking={type:'adaptive'};body.output_config={effort:o.effort||'medium'};}
    aiDebugLog('anthropic',model,'https://api.anthropic.com/v1/messages');
    r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify(body)});
  }catch(e){throw new Error('Ağ hatası — internet bağlantını kontrol et.');}
  if(!r.ok){let msg='';try{const j=await r.json();msg=(j.error&&j.error.message)||'';}catch(e){}
    if(r.status===401)throw new Error('API anahtarı geçersiz (401). Ayarlardan kontrol et.');
    if(r.status===429)throw new Error('Hız sınırı (429). Biraz sonra tekrar dene.');
    if(/credit|balance|billing/i.test(msg))throw new Error('Bakiye/faturalandırma: '+msg);
    throw new Error('API '+r.status+(msg?': '+msg:''));}
  const j=await r.json();
  const txt=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
  if(!txt&&j.stop_reason==='max_tokens')throw new Error('Yanıt token sınırına takıldı (max_tokens) — tekrar dene.');
  return txt;
}

/* Development only: which model id actually went on the wire. A dropdown that shows
   one model while the request carries another is invisible from the outside, so the
   answer is printed where it can be checked — on localhost, or on any page opened with
   ?aidebug=1. Silent everywhere else; no key, prompt or athlete data is ever logged. */
function aiDebugOn(){
  try{
    const h=location.hostname||'';
    return h==='localhost'||h==='127.0.0.1'||h==='[::1]'||h.endsWith('.local')
      ||/[?&]aidebug=1\b/.test(location.search||'');
  }catch(e){return false;}
}
function aiDebugLog(provider,model,url){
  if(!aiDebugOn())return;
  try{console.info(`[CoachOS AI] provider=${provider} model=${model}`+(url?` → ${url}`:''));}catch(e){}
}
/* One Gemini call, through the server. `apiKey` is kept in the signature so no caller
   has to change, and is ignored: the key is the server's (see aiProxyCall). One call,
   no retry — the same contract the direct call had. The programme writer does NOT come
   through here; it runs as a background job with its own retry / fallback budget. */
async function askGemini(apiKey,model,system,messages,opts){
  const o=opts||{};
  aiDebugLog('gemini',model,AI_FN_BASE+'/geminiProxy');
  const res=await aiProxyCall({op:'generate',model,system,
    messages:(messages||[]).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content})),
    generation:{maxOutputTokens:o.maxTokens||6000,temperature:o.temperature!=null?o.temperature:0.6,
      json:!!o.json,thinkingBudget:o.thinkingBudget!=null?o.thinkingBudget:null}});
  const text=String((res&&res.text)||'').trim();
  if(!text)throw new Error(L('Model boş yanıt döndürdü — tekrar dene.','The model returned an empty reply — try again.'));
  return text;
}

