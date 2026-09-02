/**
 * CoachOS — Tally Sync Worker (Cloudflare Workers, ES module)
 *
 * Reads submissions from your two Tally forms (sRPE / "İçsel Yük Takibi" +
 * Wellness / "Wellness Takibi") via the Tally API and serves them at
 *   GET <worker-url>/sync
 * in the shape CoachOS expects:
 *
 *   { "sRPE":     [ {_id, "Athlete", "Date", "TP RPE", ...}, ... ],
 *     "wellness": [ {_id, "Athlete", "Date", "RHR", "Sleep", ...}, ... ],
 *     "meta":     { "srpe": {nextPage, hasMore, total, fetched, error}, "wellness": {...} },
 *     "syncedAt": "<ISO timestamp>" }
 *
 * A form the API cannot serve reports `meta.<form>.error` and no rows; the other form's
 * rows still come through. Only when BOTH forms fail does the response become {"error"}.
 *
 * Forms with more submissions than one Worker invocation can page through
 * report `meta.<form>.hasMore: true`; call
 *   GET <worker-url>/sync?srpePage=<meta.srpe.nextPage>&wellnessPage=<meta.wellness.nextPage>
 * to continue. CoachOS does this automatically.
 *
 * Your form questions are in Turkish, so this Worker AUTO-MAPS the Turkish
 * question titles to the keys the app reads (see canonicalKey() below).
 * You do NOT need to rename anything in Tally.
 *
 * Required environment variables (Cloudflare → Worker → Settings → Variables):
 *   TALLY_API_KEY  — your Tally API key (Tally → Settings → API)  [add as a Secret]
 *   SRPE_FORM      — the "İçsel Yük Takibi" form ID
 *   WELLNESS_FORM  — the "Wellness Takibi" form ID
 *
 * Form ID = the code in the form's editor URL, e.g. https://tally.so/forms/<FORM_ID>/edit
 */

const TALLY_API = 'https://api.tally.so';

// Build stamp of this Worker. It rides along in `meta.worker` so CoachOS can tell
// whether Cloudflare is still running an older copy of this file. A stale Worker is the
// usual reason a coach sees unnamed pain regions or a truncated history, and neither
// symptom points at the Worker on its own — so the app names it outright.
const WORKER_VERSION = 11;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

/* ───────────────────────── Staying inside Tally's rate limit ─────────────────────────
   Tally allows 100 requests a minute per key. A full pull of a season is far more than
   that on its own: a form with 3000 submissions is 60+ pages at 50 a page, and each
   invocation also reads the form definition for its matrix labels. Two coaches — or one
   coach with the app open on a phone and a laptop — auto-syncing every five minutes then
   ran the same pull twice over and Tally answered 429, which surfaced in the app as a
   sync that simply failed. Three things keep it under the ceiling:

   · A limiter paces this invocation's own requests, so the pull cannot outrun the ceiling
     even when both forms page in parallel.
   · Answers are cached in the same KV namespace the webhooks use, so a SECOND device
     syncing right after the first is served from the cache and costs Tally nothing. This
     is what makes several devices behave like one.
   · A 429 is retried (honouring Retry-After) and, failing that, ends the page-run early
     and hands back what was already read with `hasMore` still true — the app resumes from
     there on its next round instead of throwing a whole season away. */

const TALLY_RATE_LIMIT = 100;     // requests a minute, per Tally's documented ceiling
const RATE_BUDGET = 80;           // what one invocation may spend — headroom for other devices
const RATE_WINDOW_MS = 60000;
const MAX_RETRY_WAIT_MS = 6000;   // longest we will sit on a Retry-After before giving up
const PAGE_CACHE_TTL = 600;       // seconds; the key carries the submission count, so a
                                  // new check-in retires the page rather than the clock
const LABEL_CACHE_TTL = 21600;    // 6h — a form's matrix labels change when the form does
// The parsed season, kept whole. Keyed by the form's submission count, so it is only ever
// served while it still describes the form; the clock is the last line of defence for a
// submission EDITED in place, which leaves the count untouched.
const SNAPSHOT_TTL = 3600;        // 1h
const PARTIAL_SNAPSHOT_TTL = 900; // 15m — only useful while the pull it belongs to resumes

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Paces the Tally requests of ONE invocation. `take()` resolves when another request may
// go out, waiting only as long as the oldest request in the window needs to age out.
function makeLimiter(max = RATE_BUDGET, windowMs = RATE_WINDOW_MS) {
  const stamps = [];
  return {
    spent: () => stamps.length,
    async take() {
      for (;;) {
        const now = Date.now();
        while (stamps.length && now - stamps[0] >= windowMs) stamps.shift();
        if (stamps.length < max) { stamps.push(now); return; }
        await sleep(Math.min(windowMs, windowMs - (now - stamps[0]) + 50));
      }
    },
  };
}

function rateLimitError(msg) {
  const e = new Error(msg);
  e.rateLimited = true;
  return e;
}

// One Tally API request, paced and 429-aware. A 429 is not a misconfiguration — it means
// too much was asked at once — so it is retried on Tally's own Retry-After and, when that
// does not clear it, reported as a rate-limit error the callers above can treat as
// "come back for the rest" rather than as a failure.
async function tallyFetch(path, key, ctx = {}, attempt = 0) {
  if (ctx.limiter) await ctx.limiter.take();
  const res = await fetch(`${TALLY_API}${path}`, { headers: { 'Authorization': `Bearer ${key}` } });
  if (res.status !== 429) return res;
  const retryAfter = Number(res.headers.get('retry-after'));
  const wait = Math.min(MAX_RETRY_WAIT_MS, isNaN(retryAfter) ? 1500 * (attempt + 1) : retryAfter * 1000);
  if (attempt >= 1 || wait > MAX_RETRY_WAIT_MS)
    throw rateLimitError(`Tally rate limit (429) on ${path} — ${TALLY_RATE_LIMIT} requests/minute is shared by every device syncing this account. The rows already read are kept; the rest arrive on the next round.`);
  await sleep(wait);
  return tallyFetch(path, key, ctx, attempt + 1);
}

/* The KV cache. It rides in the namespace the webhook deliveries already use (TALLY_STORE)
   under its own `c:` prefix, so nothing new has to be bound for it to work — and when no
   namespace is bound at all, every call here is a no-op and the Worker behaves as before,
   just without the sharing between devices. */
async function cacheGet(store, key) {
  if (!store) return null;
  try { return await store.get(`c:${key}`, 'json'); } catch (e) { return null; }
}
async function cachePut(store, key, value, ttl) {
  if (!store) return;
  try { await store.put(`c:${key}`, JSON.stringify(value), { expirationTtl: Math.max(60, ttl) }); }
  catch (e) { /* a cache that cannot be written must never fail the sync */ }
}

// Normalise a Turkish title: lowercase + strip Turkish diacritics so we can keyword-match.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/i̇/g, 'i').replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c');
}

// Map a Tally question title → the canonical key CoachOS reads. Unknown titles
// pass through unchanged (so extra questions still appear under their own name).
function canonicalKey(rawTitle) {
  const t = norm(rawTitle);
  if (t.includes('tarih') || t.includes('date')) return 'Date';
  if (t.includes('sporcu') || t.includes('athlete') || t.includes('isim')) return 'Athlete';

  // ----- sRPE (İçsel Yük Takibi) -----
  if (t.includes('top') && t.includes('yorucu')) return 'TP RPE';
  if (t.includes('top') && (t.includes('sure') || t.includes('dakika'))) return 'TP Duration';
  if (t.includes('kuvvet') && t.includes('yorucu')) return 'S&C RPE';
  if (t.includes('kuvvet') && (t.includes('sure') || t.includes('dakika'))) return 'S&C Duration';
  if ((t.includes('musabaka') || t.includes('mac')) && t.includes('yorucu')) return 'Game RPE';
  if (t.includes('dakika') && t.includes('aldin')) return 'Game Duration';
  if ((t.includes('musabaka') || t.includes('mac')) && t.includes('sure')) return 'Game Duration';

  // ----- Wellness (Wellness Takibi) -----
  if (t.includes('kah') || t.includes('dinlenik') || t.includes('rhr')) return 'RHR';
  if (t.includes('uyku') || t.includes('sleep')) return 'Sleep';
  if (t.includes('yorgun')) return 'Fatigue';
  // "Kas ağrın ne derecede?" and "Ağrı düzeyin nedir?" are the same 1-5 question — the
  // score, not the place. It is matched before the region question below, which asks
  // about pain too but wants a body part back.
  if (t.includes('kas') || (t.includes('agri') && (t.includes('derece') || t.includes('duzey') || t.includes('seviye') || t.includes('siddeti')))) return 'Soreness';
  // "Ağrın hangi bölgede ve şiddette?" is a MATRIX (region rows × severity columns) and
  // is decoded into "Region: Severity" pairs — checked before the plain free-text
  // "Ağrın hangi bölgede?", which is the same question without the severity axis.
  if (t.includes('bolge') && (t.includes('siddet') || t.includes('severity'))) return 'Pain Map';
  if (t.includes('pain map') || t.includes('pain grid')) return 'Pain Map';
  if (t.includes('bolge') || t.includes('area of pain')) return 'Area of Pain';
  if (t.includes('readiness') || t.includes('hazir')) return 'Readiness';

  return rawTitle;
}

// A label reaches us as a plain string, as a rich-text array of {text} nodes, or as HTML
// (the form definition stores block labels that way). All three have to end up as the
// words the athlete read on the form.
function plainText(v, depth) {
  depth = depth || 0;
  if (v == null || depth > 4) return '';
  if (typeof v === 'string') {
    return v.replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').replace(/\s+([?!,.;:])/g, '$1').trim();
  }
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(x => plainText(x, depth + 1)).filter(Boolean).join(' ').trim();
  if (typeof v === 'object') return plainText(v.text ?? v.label ?? v.title ?? v.name ?? v.html, depth + 1);
  return '';
}

// Tally does not keep a matrix's row and column lists in one fixed place — depending on
// the API version they hang off the question, off its `field`, off a nested list, or (for
// the submissions endpoint) nowhere at all, in which case only the form definition knows
// them. The old code looked at `rows`/`columns` only, and when they were not there the
// grid fell through to the JSON.stringify fallback below, so the app received the raw
// answer object (`{"eeb7ce0e-…":["Hafif"]}`) instead of regions. Rather than guess the
// path, walk whatever we are given and collect every {id, text}-shaped node — including
// the `payload` a form-definition block keeps its label in — so a row or column id
// resolves to its label wherever it happens to be declared. First label wins: the nearest
// declaration (the question itself) is collected before any wider fallback.
function collectLabels(node, out, depth) {
  out = out || {};
  depth = depth || 0;
  if (!node || typeof node !== 'object' || depth > 8) return out;
  const id = node.id || node.uuid;
  if (typeof id === 'string' && !out[id]) {
    const text = plainText(node.text ?? node.label ?? node.title ?? node.name)
      || plainText(node.payload && (node.payload.text ?? node.payload.label ?? node.payload.title ?? node.payload.name ?? node.payload.html));
    if (text) out[id] = text;
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach(x => collectLabels(x, out, depth + 1));
    else if (v && typeof v === 'object') collectLabels(v, out, depth + 1);
  }
  return out;
}

// The submissions endpoint describes a matrix question by little more than its title, so
// the row ids in an answer cannot be named from that payload alone — which is exactly how
// `{"eeb7ce0e-…":["Orta"]}` ends up in front of a coach as an unnamed region. The form
// definition always knows: every matrix row and column is a block carrying its uuid and
// its label. We read it once per form per sync and keep it as the fallback dictionary for
// the grid's ids. Best effort throughout — a form we cannot read must never fail a sync.
//
// Every source is asked and the answers are merged. An earlier build stopped at the first
// endpoint that produced ANY label — and `GET /forms/{id}` always produces one, its own
// name — so the endpoint that actually carries the rows was never reached and the grid
// stayed unnamed. Never stop early: a form object without blocks is not a dictionary.
// → {labels, sources} — `sources` is what /diag reports, so a form we cannot read says
//   which endpoint refused and with what status instead of failing silently.
const FORM_LABEL_PATHS = [
  id => `/forms/${id}`,
  id => `/forms/${id}?includeBlocks=true`,
  id => `/forms/${id}/questions`,
  id => `/forms/${id}/blocks`,
];

// The form's own public page. A Tally form renders from its definition, so the page
// carries the blocks — every matrix row with its uuid and the words the athlete read —
// and reading it needs NO API key: it is the same page the athletes fill in. This is the
// source that survives everything the API can refuse: a key without the right scope, an
// endpoint a plan does not serve, a workspace the token cannot see. Two ways in, in order
// of trust: the JSON the page embeds for its own renderer, and failing that, pairing each
// uuid in the markup with the first label that follows it.
async function labelsFromPublicForm(formId, out) {
  const res = await fetch(`https://tally.so/r/${formId}`, {
    headers: { 'User-Agent': 'CoachOS-Tally-Sync', 'Accept': 'text/html' },
  });
  if (!res.ok) return res.status;
  const html = await res.text();
  const before = Object.keys(out).length;
  for (const tag of (html.match(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/gi) || [])) {
    const body = tag.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try { collectLabels(JSON.parse(body), out); } catch (e) { /* not the blob we want */ }
  }
  if (Object.keys(out).length === before) {
    const re = /"(?:uuid|id)"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"[\s\S]{0,400}?"(?:text|title|label)"\s*:\s*"((?:[^"\\]|\\.){1,160})"/gi;
    let m;
    while ((m = re.exec(html))) {
      if (out[m[1]]) continue;
      let text = m[2];
      try { text = JSON.parse(`"${text}"`); } catch (e) { /* leave the escapes in */ }
      text = plainText(text);
      if (text) out[m[1]] = text;
    }
  }
  return res.status;
}

// The dictionary is read once per form and then held in KV for LABEL_CACHE_TTL. It used
// to cost five requests per form on EVERY invocation — ten per sync round, fifty across a
// season-length pull — which is half of Tally's minute budget spent on labels that change
// only when the coach edits the form. `ctx.store` is the cache; without one the reads
// happen as before.
async function fetchFormLabels(formId, key, ctx = {}) {
  const cached = await cacheGet(ctx.store, `labels:${formId}`);
  if (cached && cached.labels) return { labels: cached.labels, sources: cached.sources || [], cached: true };
  const fresh = await readFormLabels(formId, key, ctx);
  // Only a dictionary that actually named something is worth keeping: caching an empty
  // one would pin a transient failure in place for six hours.
  if (Object.keys(fresh.labels).length)
    await cachePut(ctx.store, `labels:${formId}`, { labels: fresh.labels, sources: fresh.sources }, LABEL_CACHE_TTL);
  return fresh;
}

async function readFormLabels(formId, key, ctx = {}) {
  const labels = {};
  const sources = [];
  for (const build of FORM_LABEL_PATHS) {
    const path = build(formId);
    const before = Object.keys(labels).length;
    try {
      const res = await tallyFetch(path, key, ctx);
      if (!res.ok) { sources.push({ path, status: res.status, added: 0 }); continue; }
      collectLabels(await res.json(), labels);
      sources.push({ path, status: res.status, added: Object.keys(labels).length - before });
    } catch (e) {
      sources.push({ path, status: e && e.rateLimited ? 429 : 'error', error: String(e && e.message || e), added: 0 });
      // Rate-limited: the remaining endpoints would only spend more of the same budget.
      if (e && e.rateLimited) break;
    }
  }
  /* Always asked, never skipped. Deciding "the API already answered" is what broke this
     twice: `GET /forms/{id}` returns the form's own name, so any test for "did we get a
     label" passes while not one matrix row has been named. One extra request per form is
     cheaper than another round of a coach staring at an unnamed region. Existing labels
     win — collectLabels keeps the first it saw. */
  {
    const before = Object.keys(labels).length;
    try {
      const status = await labelsFromPublicForm(formId, labels);
      sources.push({ path: `tally.so/r/${formId}`, status, added: Object.keys(labels).length - before });
    } catch (e) {
      sources.push({ path: `tally.so/r/${formId}`, status: 'error', error: String(e && e.message || e), added: 0 });
    }
  }
  return { labels, sources };
}

// An id that survived every dictionary — it is reported (not printed at a coach) so the
// app can say "the grid came over unnamed" instead of leaving the coach to guess.
const GRID_ID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// Keys that mark an answer object as a single scalar wrapped up (a file upload, a signed
// URL, a payment) rather than a grid — a matrix is keyed by row ids and never by these.
const SCALAR_ANSWER_KEYS = ['value', 'text', 'url', 'name', 'title', 'label', 'id', 'uuid'];

// A MATRIX answer is a grid: {rowId: columnId} or {rowId: [columnIds]}. Both axes are
// resolved back to their labels and written out as "Row: Column, Row: Column" — which is
// what the pain question needs to survive the trip (region AND severity, not one or the
// other). An id the question does not explain is passed through as-is; the app knows to
// report it as an unnamed region rather than print it at a coach. Returns null when this
// is not a matrix, so the ordinary answer handling below takes over.
// Tally can send a matrix as one question PER ROW, and it titles each of those questions
// "<the whole question> [<the row>]". The row id then resolves to that whole title, so the
// coach was handed "💥 Ağrın hangi bölgede ve şiddette? (opsiyonel) [Sırt]" where a body
// part belongs — the same question repeated once per region, with the answer buried at the
// end of it. The row is what is in brackets; everything before it is the question. Leading
// emoji go too. An id no dictionary named passes through untouched, so it is still counted
// as an unnamed region rather than quietly reshaped.
const ROW_IN_BRACKETS = /\[([^\][]{1,40})\]\s*$/;
function rowLabel(v) {
  const original = plainText(v) || (typeof v === 'string' ? v : '');
  let t = original;
  const m = ROW_IN_BRACKETS.exec(t);
  if (m && m[1].trim()) t = m[1].trim();
  t = t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[\s:;,.\-–—]+$/, '').trim();
  return t || original;
}

function matrixToValue(a, question, fallbackLabels) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const vals = Object.values(a);
  if (!vals.length) return null;
  if (SCALAR_ANSWER_KEYS.some(k => k in a)) return null;
  // Every row of a grid answers with its ticked column(s) — a plain value or a list of
  // them. An object there is some other answer shape, so leave it to the caller.
  if (vals.some(v => v && typeof v === 'object' && !Array.isArray(v))) return null;
  // What the question itself declares, overlaid with the dictionary the caller built —
  // the form definition wins there, because it is the one place a matrix row is always
  // spelled out (a per-row question only repeats the question's own title).
  const labels = Object.assign(collectLabels(question), fallbackLabels || {});
  const label = id => rowLabel((typeof id === 'string' && labels[id]) ? labels[id] : id);
  const out = [];
  for (const [rowId, val] of Object.entries(a)) {
    const picks = (Array.isArray(val) ? val : [val]).filter(v => v != null && v !== '' && v !== false);
    if (!picks.length) continue;
    out.push(`${label(rowId)}: ${picks.map(label).join('/')}`);
  }
  return out.length ? out.join(', ') : null;
}

// Turn one Tally answer into a plain value, mapping choice option-IDs to their labels.
// → {value, isGrid} — `isGrid` tells the caller the answer was a matrix, which is how the
//   pain question is recognised even when its title never says "şiddet".
function answerToValue(resp, question, fallbackLabels) {
  let a = resp.answer !== undefined ? resp.answer : resp.value;
  if (a == null) return { value: null, isGrid: false };
  const grid = matrixToValue(a, question, fallbackLabels);
  if (grid != null) return { value: grid, isGrid: true };
  const opts = (question && (question.options || (question.field && question.field.options))) || null;
  /* A choice answer is option ids. The question usually carries its own option list, but
     a multi-select ("Ağrın hangi bölgede?" asked as a list of regions rather than a grid)
     leaves the same trap the matrix did when it does not: unresolved ids reaching the
     coach. The dictionary built for the grid — the form definition, the public form page
     — names those options too, so it is used as the fallback here as well. */
  const mapOpt = id => {
    if (typeof id !== 'string') return id;
    if (opts) {
      const o = opts.find(o => o.id === id || o.uuid === id);
      if (o) return o.text || o.label || o.title || id;
    }
    return (fallbackLabels && fallbackLabels[id]) || id;
  };
  if (Array.isArray(a)) {
    return { value: a.map(x => (x && typeof x === 'object') ? (x.text || x.label || x.value || x.title || '') : mapOpt(x))
                        .filter(v => v !== '' && v != null).join(', '), isGrid: false };
  }
  if (typeof a === 'object') {
    return { value: a.value ?? a.text ?? a.url ?? a.name ?? JSON.stringify(a), isGrid: false };
  }
  if (typeof a === 'string') { const m = mapOpt(a); if (m !== a) return { value: m, isGrid: false }; }
  return { value: a, isGrid: false };
}

// Tally caps the page size (50 by default) and silently ignores anything larger,
// so asking for 500 does NOT return 500 — it returns one capped page. The old
// code combined that with a hard 8-page stop, which quietly truncated any form
// with more than a few hundred submissions: the rest of the season simply never
// reached the app. We now paginate until `hasMore` is false and, when a single
// Worker invocation would blow Cloudflare's subrequest budget, we hand the next
// page number back so the app can resume in a follow-up request.
const PAGE_LIMIT = 50;   // Tally's documented page size
// Pages per form per invocation. Two forms plus the three form-definition reads each one
// makes for its matrix labels stay under Cloudflare's 50-subrequest budget.
const PAGE_BUDGET = 15;

// How many submissions the form holds. Tally reports it as an object keyed by filter
// (`{"all":420,"completed":410,"partial":10}`); older API versions sent a bare number and
// some send `total`. Reading it as a number only is why the app's "/ formda N" check never
// appeared beside the row count — `Number({...})` is NaN, so the one signal that tells a
// coach submissions went missing was dead, and a truncated sync looked like a clean one.
function readTotal(j) {
  const cand = j.totalNumberOfSubmissionsPerFilter ?? j.totalNumberOfSubmissions ?? j.total;
  if (cand == null) return null;
  if (typeof cand === 'object') {
    const nums = Object.values(cand).map(Number).filter(n => !isNaN(n));
    const n = Number(cand.all);
    if (!isNaN(n)) return n;
    return nums.length ? Math.max(...nums) : null;
  }
  const n = Number(cand);
  return isNaN(n) ? null : n;
}

// Fetch one page-run of a form's submissions.
// → {rows, total, nextPage, hasMore, unnamedGridIds, formLabelCount, labelSources, error} —
//   `hasMore` true means Tally still has submissions after `nextPage - 1` and the caller
//   should come back for them; `unnamedGridIds` counts grid answers whose row id no
//   dictionary could name, which is what the app reports when a coach sees a nameless
//   pain region, and the label fields say where the dictionary came from.
//
//   A form that cannot be read reports `error` and returns no rows instead of throwing.
//   Throwing meant one wrong form id — a form renamed, deleted, or outside what the API
//   key may read — failed the WHOLE sync, so the other form's whole season was thrown away
//   with it and the coach saw an error and zero data. One broken form must cost one form.
async function fetchForm(formId, key, startPage = 1, budget = PAGE_BUDGET, ctx = {}) {
  try {
    return await fetchFormPages(formId, key, startPage, budget, ctx);
  } catch (e) {
    // A rate limit is not a broken form: the pages are still there and the next round
    // will read them. Say so with `hasMore` true and `rateLimited`, so the app resumes
    // (and waits) rather than reporting a failed sync and dropping the season.
    const limited = !!(e && e.rateLimited);
    return { rows: [], total: null, nextPage: Math.max(1, Number(startPage) || 1), hasMore: limited,
             unnamedGridIds: 0, formLabelCount: 0, labelSources: null, rateLimited: limited,
             error: String((e && e.message) || e) };
  }
}

/* One page of Tally submissions → the rows CoachOS reads. Split out of the page loop so
   the same parsing serves a fresh page, a cached page, and the delta probe below. */
function parseSubmissions(j, formLabels) {
  const rows = [];
  let unnamedGridIds = 0, unnamedOptionIds = 0;
  const qById = {};
  (j.questions || []).forEach(q => { qById[q.id] = q; });
  // Everything this page's questions declare, with the form definition on top of it.
  const labelBook = Object.assign(collectLabels({ questions: j.questions || [] }), formLabels);
  const subs = j.submissions || [];
  for (const s of subs) {
    const row = { _id: s.id };
    if (s.submittedAt) row['Date'] = String(s.submittedAt).slice(0, 10); // default; a "Tarih" question overrides
    for (const resp of (s.responses || [])) {
      const q = qById[resp.questionId];
      const title = q ? (q.title || q.label || resp.questionId) : resp.questionId;
      const { value: v, isGrid } = answerToValue(resp, q, labelBook);
      if (v == null || v === '') continue;
      if (isGrid) unnamedGridIds += (String(v).match(GRID_ID_RE) || []).length;
      // A dropdown/multi-select answer is option ids too, and when no dictionary names
      // them the athlete's NAME arrives as a uuid — it matches nobody on the roster, so
      // every submission is skipped and the coach sees a sync that "worked" with nothing
      // in it. Counted here so the app can name that cause instead of staying silent.
      else if (typeof v === 'string') unnamedOptionIds += (v.match(GRID_ID_RE) || []).length;
      // A grid answer to the pain question is the pain map whatever the question is
      // called: a form that words it "Ağrın hangi bölgede?" (no severity axis in the
      // title) still asks it as a matrix, and reading that as free text is what put
      // the raw answer object in front of the coach.
      let key = canonicalKey(title);
      if (isGrid && key === 'Area of Pain') key = 'Pain Map';
      // Tally may hand a matrix over as one question or as one question PER ROW, in
      // which case every row shares the same title and would otherwise overwrite the
      // one before it. Merging keeps whichever shape the API sends.
      row[key] = (key === 'Pain Map' && row[key]) ? `${row[key]}, ${v}` : v;
    }
    rows.push(row);
  }
  // `hasMore` is authoritative; a short/empty page is the fallback signal for
  // API versions that omit it.
  const hasMore = j.hasMore === true || (j.hasMore == null && subs.length >= PAGE_LIMIT);
  return { rows, unnamedGridIds, unnamedOptionIds, count: subs.length, hasMore };
}

/* How many submissions the form holds, in one request. It is the cheapest question the
   Tally API answers, and everything below is keyed off it: a page cache that invalidates
   itself the moment the count moves, and the snapshot that decides whether this sync has
   to read the season at all. */
async function fetchTotal(formId, key, ctx = {}) {
  const res = await tallyFetch(`/forms/${formId}/submissions?page=1&limit=1`, key, ctx);
  if (!res.ok) return null;   // the page-run below reports the real failure
  try { return readTotal(await res.json()); } catch (e) { return null; }
}

/* One page of submissions, from KV when another device (or an earlier round) has already
   paid for it. The key carries the form's submission COUNT, so a new check-in retires
   every cached page by itself — the cache can never serve a season that has moved on. */
async function getSubmissionPage(formId, key, page, total, ctx = {}) {
  const ck = `sub:${formId}:${page}:${PAGE_LIMIT}:${total == null ? 'x' : total}`;
  const hit = await cacheGet(ctx.store, ck);
  if (hit) return { j: hit, cached: true };
  const res = await tallyFetch(`/forms/${formId}/submissions?page=${page}&limit=${PAGE_LIMIT}`, key, ctx);
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429)
      throw rateLimitError(`Tally rate limit (429) for form ${formId} — ${TALLY_RATE_LIMIT} requests/minute is shared by every device syncing this account.`);
    throw new Error(`Tally API ${res.status} for form ${formId}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  await cachePut(ctx.store, ck, j, PAGE_CACHE_TTL);
  return { j, cached: false };
}

/* ── The snapshot: why a second device syncs in one round ──
   A season is 60+ pages, and every device used to page through all of them on its own
   timer. So the whole parsed season is kept in KV beside its submission count. A sync
   whose count still matches gets the season handed back in ONE round for ONE request —
   which is what a coach opening the app on a second device (or pressing Sync Now again)
   actually experiences as "instant". When the count has MOVED, only the new submissions
   are read: they sit at one end of the form, so the pages are probed from the front and,
   failing that, from the back, and a full re-page happens only when neither end explains
   the difference. */
const snapKey = formId => `snap:${formId}`;
const DELTA_PROBE_PAGES = 6;   // pages read from one end before a full re-page is cheaper

async function refreshSnapshot(formId, key, snap, total, formLabels, ctx) {
  const need = total - snap.total;
  if (need <= 0) return null;                       // submissions were deleted — re-read the form
  const known = new Set(snap.rows.map(r => r._id));
  const added = [];
  let unnamedGridIds = 0, unnamedOptionIds = 0, reads = 0;
  const probe = async page => {
    const { j } = await getSubmissionPage(formId, key, page, total, ctx);
    reads++;
    const p = parseSubmissions(j, formLabels);
    unnamedGridIds += p.unnamedGridIds; unnamedOptionIds += p.unnamedOptionIds;
    const fresh = p.rows.filter(r => !known.has(r._id));
    fresh.forEach(r => known.add(r._id));
    added.push(...fresh);
    return fresh.length;
  };
  // Newest first: the new submissions are on page 1 and the probe stops at the first
  // page that holds nothing new.
  for (let p = 1; p <= DELTA_PROBE_PAGES && added.length < need; p++)
    if (!(await probe(p))) break;
  // Oldest first: they are on the last page instead.
  if (added.length < need) {
    const last = Math.max(1, Math.ceil(total / PAGE_LIMIT));
    for (let n = 0, p = last; n < DELTA_PROBE_PAGES && p >= 1 && added.length < need; n++, p--)
      if (!(await probe(p))) break;
  }
  // Not both ends, not the count we were promised — the form moved in some way this
  // shortcut cannot account for, so the caller reads it in full rather than guess.
  if (added.length < need) return null;
  return { rows: snap.rows.concat(added), unnamedGridIds, unnamedOptionIds, reads };
}

async function fetchFormPages(formId, key, startPage = 1, budget = PAGE_BUDGET, ctx = {}) {
  const rows = [];
  let page = Math.max(1, Number(startPage) || 1);
  let total = null, more = false, unnamedGridIds = 0, unnamedOptionIds = 0;
  let rateLimited = false, cacheHits = 0, snapshot = null;
  // Read once per form, before the pages: the dictionary that names a matrix's rows and
  // columns when the submissions payload does not carry them. Cached in KV, so it costs
  // the second device nothing.
  const { labels: formLabels, sources: labelSources } = await fetchFormLabels(formId, key, ctx);
  // What Tally holds right now. One request, and it decides everything below.
  try { total = await fetchTotal(formId, key, ctx); }
  catch (e) { if (!(e && e.rateLimited)) throw e; rateLimited = true; }

  const done = (allRows, extra) => ({ rows: allRows, total, nextPage: Math.max(1, Math.ceil((total || 0) / PAGE_LIMIT)) + 1,
                                      hasMore: false, unnamedGridIds, unnamedOptionIds,
                                      formLabelCount: Object.keys(formLabels).length, labelSources,
                                      cacheHits, rateLimited: false, error: null, ...extra });

  // The stored season, if there is one. Only a snapshot whose count still means something
  // is worth consulting, so a form whose total could not be read pages the old way.
  let snap = (!ctx.fresh && total != null) ? await cacheGet(ctx.store, snapKey(formId)) : null;
  if (snap && !Array.isArray(snap.rows)) snap = null;
  let carry = [];                     // rows from earlier rounds of THIS pull, kept for the snapshot
  /* Only a run that starts at page 1, or one that resumes exactly where a partial
     snapshot stopped, may write the snapshot. The app keeps echoing the page number of a
     form that finished early while the OTHER form pages on, and those rounds read nothing
     — letting them store their empty result is what wiped a season out of the cache. */
  let canSnapshot = page <= 1;
  if (snap && snap.complete && page <= 1) {
    if (snap.total === total) {
      // Nothing has moved: the whole season in one round, for the one count request.
      unnamedGridIds = snap.unnamedGridIds || 0; unnamedOptionIds = snap.unnamedOptionIds || 0;
      return done(snap.rows, { snapshot: 'hit' });
    }
    let grown = null;
    try { grown = await refreshSnapshot(formId, key, snap, total, formLabels, ctx); }
    catch (e) { if (!(e && e.rateLimited)) throw e; }
    if (grown) {
      unnamedGridIds = (snap.unnamedGridIds || 0) + grown.unnamedGridIds;
      unnamedOptionIds = (snap.unnamedOptionIds || 0) + grown.unnamedOptionIds;
      await cachePut(ctx.store, snapKey(formId), { total, rows: grown.rows, complete: true,
        unnamedGridIds, unnamedOptionIds, at: Date.now() }, SNAPSHOT_TTL);
      return done(grown.rows, { snapshot: 'delta' });
    }
    // Neither end explained the new count — fall through and read the form in full.
  } else if (snap && !snap.complete && snap.total === total && snap.nextPage === page && page > 1) {
    // A long first pull, resumed. The earlier rounds' rows are not sent again (the app
    // already has them) but they are carried so the snapshot this pull builds is whole.
    carry = snap.rows;
    canSnapshot = true;
    unnamedGridIds = snap.unnamedGridIds || 0; unnamedOptionIds = snap.unnamedOptionIds || 0;
  }

  for (let n = 0; n < budget; n++, page++) {
    let got;
    try {
      got = await getSubmissionPage(formId, key, page, total, ctx);
    } catch (e) {
      // Out of budget mid-run: keep the pages already read and let the caller come back
      // for the rest. Throwing here is what turned a busy minute into a failed sync.
      if (e && e.rateLimited && (rows.length || carry.length)) { rateLimited = true; more = true; break; }
      throw e;
    }
    if (got.cached) cacheHits++;
    const p = parseSubmissions(got.j, formLabels);
    if (total == null) total = readTotal(got.j);
    rows.push(...p.rows);
    unnamedGridIds += p.unnamedGridIds;
    unnamedOptionIds += p.unnamedOptionIds;
    more = p.hasMore;
    if (!more || p.count === 0) { more = false; page++; break; }
  }

  /* Keep what this pull has read. A complete snapshot is what every other device — and
     every later sync from this one — is served from; a partial one lets a season-length
     first pull resume without re-reading the pages it already paid for. */
  if (canSnapshot && total != null && ctx.store && !rateLimited) {
    const all = carry.concat(rows);
    await cachePut(ctx.store, snapKey(formId), { total, rows: all, complete: !more, nextPage: page,
      unnamedGridIds, unnamedOptionIds, at: Date.now() },
      more ? PARTIAL_SNAPSHOT_TTL : SNAPSHOT_TTL);
    snapshot = more ? 'building' : 'built';
  }

  return { rows, total, nextPage: page, hasMore: more, unnamedGridIds, unnamedOptionIds,
           formLabelCount: Object.keys(formLabels).length, labelSources, cacheHits,
           rateLimited, snapshot,
           // Not an error: the rows in hand are good and `hasMore` says where to resume.
           // It rides along so the app can tell the coach why a sync came in pieces.
           error: null };
}

/* ─────────────────────────────── Webhook deliveries ───────────────────────────────
   Everything above PULLS: the Worker asks the Tally API for submissions when the app
   syncs. This half is the push side. Tally posts each submission the moment it is filled
   in (Tally → form → Integrations → Webhooks → Endpoint URL), the Worker stores it, and
   /sync serves it beside the pulled rows so the app needs no second address.

   Three things it buys, all of them real:
   · The check-in lands at once instead of one auto-sync interval later.
   · A delivery carries its own option / row / column labels inline, so the athlete's name
     and the pain regions cannot arrive as bare uuids the way they can from the
     submissions endpoint — the failure that silently skipped every submission.
   · The Tally API is a paid feature; webhooks are not. With no TALLY_API_KEY at all the
     Worker still serves everything that has been pushed to it.

   Storage is a Workers KV namespace bound as TALLY_STORE. One key per submission, named
   so that a list() comes back in submission order:

       w:<form>:<submittedAt>:<submissionId>     value = the row, metadata = the same row

   The row is written into the key's metadata as well because list() hands metadata back
   with the keys — so reading a season is a couple of list() calls rather than one read
   per check-in. KV caps metadata at 1 KiB; a row too big for that is stored without it
   and read back by value. The key is derived from the submission, never from the clock,
   so Tally retrying a delivery overwrites rather than duplicates. */

const WEBHOOK_PREFIX = 'w';
const KV_METADATA_MAX = 900;    // KV's own cap is 1024 bytes of serialised metadata
const WEBHOOK_LIST_PAGES = 20;  // 1000 keys a page — a hard stop against an unbounded list

// The binding as the coach created it in the Cloudflare dashboard. TALLY_STORE is what the
// setup guide says to call it; the others are the names people reach for anyway, and a
// binding named the wrong thing should not read as "webhooks are off".
function webhookStore(env) {
  const kv = env.TALLY_STORE || env.TALLY_KV || env.WEBHOOK_STORE || env.KV;
  return (kv && typeof kv.list === 'function' && typeof kv.put === 'function') ? kv : null;
}

function webhookSecret(env) {
  return env.TALLY_SIGNING_SECRET || env.TALLY_WEBHOOK_SECRET || null;
}

// Tally signs a delivery with base64(HMAC-SHA256(signing secret, raw body)) in
// `tally-signature`. The RAW body is what gets signed — re-serialising the parsed JSON
// reorders keys and the comparison then fails on every legitimate delivery.
async function signatureMatches(secret, raw, header) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  const got = String(header || '').trim();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

// Which of the two forms a delivery belongs to. The form id is the answer whenever the
// coach set SRPE_FORM / WELLNESS_FORM; the name and then the questions themselves are the
// fallbacks, so a webhook set up before those variables exist still routes correctly.
const FORM_MARKERS = {
  srpe:     ['TP RPE', 'TP Duration', 'S&C RPE', 'S&C Duration', 'Game RPE', 'Game Duration'],
  wellness: ['RHR', 'Sleep', 'Fatigue', 'Soreness', 'Pain Map', 'Area of Pain', 'Readiness'],
};

function whichForm(data, keys, env) {
  const id = data.formId;
  if (id) {
    if (env.SRPE_FORM && id === env.SRPE_FORM) return 'srpe';
    if (env.WELLNESS_FORM && id === env.WELLNESS_FORM) return 'wellness';
  }
  const n = norm(plainText(data.formName));
  if (n.includes('wellness')) return 'wellness';
  if (n.includes('icsel') || n.includes('yuk') || n.includes('rpe')) return 'srpe';
  const score = which => keys.filter(k => FORM_MARKERS[which].includes(k)).length;
  const s = score('srpe'), w = score('wellness');
  if (s !== w) return s > w ? 'srpe' : 'wellness';
  return null;
}

// One delivery → one row in the same shape /sync serves from the API, so the app cannot
// tell the two paths apart. A webhook field carries its own `options` / `rows` / `columns`,
// which is why the ids here resolve without asking Tally anything.
function rowFromDelivery(data) {
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const labelBook = collectLabels({ fields });
  const row = { _id: String(data.submissionId || data.responseId || '') };
  const when = data.createdAt || data.submittedAt;
  if (when) row['Date'] = String(when).slice(0, 10);   // a "Tarih" question overrides this
  const keys = [];
  let unnamedGridIds = 0, unnamedOptionIds = 0;
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const title = plainText(f.label ?? f.title ?? f.name) || String(f.key || '');
    if (!title) continue;
    const { value: v, isGrid } = answerToValue({ answer: f.value }, f, labelBook);
    if (v == null || v === '') continue;
    if (isGrid) unnamedGridIds += (String(v).match(GRID_ID_RE) || []).length;
    else if (typeof v === 'string') unnamedOptionIds += (v.match(GRID_ID_RE) || []).length;
    let key = canonicalKey(title);
    if (isGrid && key === 'Area of Pain') key = 'Pain Map';
    keys.push(key);
    // Same merge as the pull path: Tally may send a matrix as one field or as one field
    // per row, and per-row fields all share the question's title.
    row[key] = (key === 'Pain Map' && row[key]) ? `${row[key]}, ${v}` : v;
  }
  return { row, keys, unnamedGridIds, unnamedOptionIds };
}

async function storeDelivery(kv, form, row, when) {
  const stamp = String(when || row['Date'] || '').slice(0, 24) || new Date().toISOString();
  const name = `${WEBHOOK_PREFIX}:${form}:${stamp}:${row._id}`;
  const body = JSON.stringify(row);
  await kv.put(name, body, body.length <= KV_METADATA_MAX ? { metadata: { r: row } } : undefined);
  return name;
}

async function readDeliveries(kv, form) {
  const rows = [], missing = [];
  let cursor, pages = 0, truncated = false;
  for (;;) {
    const res = await kv.list({ prefix: `${WEBHOOK_PREFIX}:${form}:`, limit: 1000, cursor });
    for (const k of (res.keys || [])) {
      if (k.metadata && k.metadata.r) rows.push(k.metadata.r);
      else missing.push(k.name);
    }
    pages++;
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
    if (pages >= WEBHOOK_LIST_PAGES) { truncated = true; break; }
  }
  // The rows too long for key metadata — a check-in with a paragraph of free text — are
  // the only ones that cost a read each.
  for (let i = 0; i < missing.length; i += 50) {
    const batch = await Promise.all(missing.slice(i, i + 50).map(n => kv.get(n, 'json').catch(() => null)));
    for (const r of batch) if (r) rows.push(r);
  }
  // A retry of a delivery that carried no timestamp lands under a second key. The
  // submission id is what decides identity, not the key it happens to sit under.
  const seen = new Set(), out = [];
  for (const r of rows) {
    const id = r && r._id;
    if (id) { if (seen.has(id)) continue; seen.add(id); }
    out.push(r);
  }
  return { rows: out, truncated, error: null };
}

// A submission can reach the app twice: pushed the moment it was filled in, then pulled
// again by the next API sync. Counted twice it would double that athlete's load for the
// day, so the pushed copy wins — it is the one whose options are named — and the pulled
// duplicate is dropped. Tally identifies a submission differently on the two paths, so
// both ids a delivery carries are checked against the pulled row's id.
function mergeRows(pushed, pulled) {
  const seen = new Set();
  for (const r of pushed) {
    if (r._id) seen.add(String(r._id));
    if (r._altId) seen.add(String(r._altId));
  }
  return pushed.concat((pulled || []).filter(r => r && !seen.has(String(r._id))));
}

/* POST — a Tally webhook delivery. Accepted on ANY path, deliberately: the address the
   coach has already been given for this Worker is its root, `/webhook` is what the guide
   says to paste, and a delivery lost to a trailing slash would show up as nothing worse
   than a form that "does not sync" — the exact failure the app spent versions learning to
   name. GET keeps its routes; only POST lands here. */
async function handleWebhook(request, env) {
  const raw = await request.text();
  const secret = webhookSecret(env);
  if (secret) {
    const header = request.headers.get('tally-signature') || request.headers.get('x-tally-signature');
    if (!header)
      return json({ ok: false, error: 'This Worker has TALLY_SIGNING_SECRET set, but the delivery carried no tally-signature header. Either put the same signing secret on the Tally webhook, or remove the variable from the Worker.' }, 401);
    if (!(await signatureMatches(secret, raw, header)))
      return json({ ok: false, error: 'tally-signature does not match TALLY_SIGNING_SECRET — the secret on the Tally webhook and the one on the Worker are not the same string.' }, 401);
  }
  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) { return json({ ok: false, error: 'Body is not JSON. This address expects a Tally webhook delivery.' }, 400); }

  const data = (payload && payload.data) || {};
  // Tally sends other event types too; acknowledging them keeps Tally from retrying an
  // event this Worker was never meant to store.
  if (payload && payload.eventType && payload.eventType !== 'FORM_RESPONSE')
    return json({ ok: true, ignored: payload.eventType, worker: WORKER_VERSION });

  const { row, keys, unnamedGridIds, unnamedOptionIds } = rowFromDelivery(data);
  if (!row._id) row._id = String(payload.eventId || crypto.randomUUID());
  if (data.responseId && data.responseId !== row._id) row._altId = String(data.responseId);

  const form = whichForm(data, keys, env);
  if (!form)
    return json({ ok: false, error: `Cannot tell which of the two forms this delivery is from (formId "${data.formId || '?'}", name "${plainText(data.formName) || ''}"). Set SRPE_FORM or WELLNESS_FORM on the Worker to this form's id.` }, 400);

  const kv = webhookStore(env);
  if (!kv)
    return json({ ok: false, error: 'No KV namespace is bound to this Worker, so there is nowhere to keep the delivery. Cloudflare → Workers & Pages → this Worker → Settings → Bindings → add a KV namespace binding named TALLY_STORE.' }, 503);

  try {
    const name = await storeDelivery(kv, form, row, data.createdAt || payload.createdAt);
    return json({ ok: true, form, id: row._id, key: name, athlete: row['Athlete'] ?? null, date: row['Date'] ?? null,
                  unnamedGridIds, unnamedOptionIds, worker: WORKER_VERSION });
  } catch (e) {
    // A non-2xx makes Tally retry, which is what we want when the store is the problem.
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method === 'POST') return handleWebhook(request, env);

    if (url.pathname === '/sync') {
      try {
        const key = env.TALLY_API_KEY;
        const store = webhookStore(env);
        if (!key && !store)
          throw new Error('TALLY_API_KEY secret is not set on the Worker, and no KV namespace is bound to hold webhook deliveries either — so there is no way to get at the submissions. Set one or the other.');
        // The app resumes a truncated sync by echoing back the page numbers from
        // the previous response's `meta`. Each round-trip is a fresh Worker
        // invocation, so a season's worth of submissions can be pulled in full
        // without ever exceeding one invocation's subrequest budget.
        const srpeFrom = Number(url.searchParams.get('srpePage')) || 1;
        const wellFrom = Number(url.searchParams.get('wellnessPage')) || 1;
        const unset = which => ({ rows: [], total: null, nextPage: 1, hasMore: false, unnamedGridIds: 0,
                                  error: `${which} is not set on the Worker` });
        // Nothing to pull: this Worker runs on webhook deliveries alone. Not an error —
        // the Tally API is a paid feature and the push path does not need it.
        const idle = () => ({ rows: [], total: null, nextPage: 1, hasMore: false, unnamedGridIds: 0,
                              unnamedOptionIds: 0, error: null });
        // One limiter and one cache for the whole invocation: both forms page in
        // parallel, so they have to share the minute's budget rather than each assume
        // it has the whole of it.
        // `?fresh=1` bypasses the stored season — the way back when a submission was
        // edited in Tally and the count could not tell.
        const fresh = /^(1|true|yes)$/i.test(url.searchParams.get('fresh') || '');
        const ctx = { limiter: makeLimiter(), store, fresh };
        const pull = (formId, which, from) =>
          !key ? Promise.resolve(idle())
               : formId ? fetchForm(formId, key, from, PAGE_BUDGET, ctx) : Promise.resolve(unset(which));
        // Stored deliveries ride along with the FIRST page only. The app resumes a long
        // pull by asking for later pages, and re-sending every stored row each round would
        // count a check-in once per round-trip the pull happened to take.
        const stored = (form, from) =>
          (store && from <= 1) ? readDeliveries(store, form).catch(e => ({ rows: [], truncated: false, error: String((e && e.message) || e) }))
                               : Promise.resolve({ rows: [], truncated: false, error: null });
        const [srpeRes, wellRes, hookS, hookW] = await Promise.all([
          pull(env.SRPE_FORM, 'SRPE_FORM', srpeFrom),
          pull(env.WELLNESS_FORM, 'WELLNESS_FORM', wellFrom),
          stored('srpe', srpeFrom),
          stored('wellness', wellFrom),
        ]);
        // Both forms unreadable is a Worker-level failure (a bad key, no forms configured);
        // one of the two is not, and the half that answered still goes to the app. Rows
        // already pushed to the Worker are an answer too — they are not thrown away
        // because the API half of the same Worker is misconfigured.
        // Both forms rate-limited with nothing in hand is a "come back in a moment", not a
        // Worker-level failure — reporting it as one is what put "TALLY_API_KEY is missing
        // or the form IDs are wrong" in front of a coach whose key and ids were both fine.
        if (srpeRes.error && wellRes.error && !hookS.rows.length && !hookW.rows.length
            && !(srpeRes.rateLimited || wellRes.rateLimited))
          throw new Error(`sRPE: ${srpeRes.error} · Wellness: ${wellRes.error}`);
        const sRPE = mergeRows(hookS.rows, srpeRes.rows);
        const wellness = mergeRows(hookW.rows, wellRes.rows);
        // The Wellness form has no "Readiness" question, so derive it as the mean of the
        // 1-5 subscores present (Sleep, Fatigue, Soreness). Remove this block if unwanted.
        for (const r of wellness) {
          if (r['Readiness'] == null) {
            const vals = ['Sleep', 'Fatigue', 'Soreness'].map(k => Number(r[k])).filter(n => !isNaN(n));
            if (vals.length) r['Readiness'] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
          }
        }
        // Ids a stored delivery could not name are counted the same way the pulled rows
        // are, so the app's "the pain region came over unnamed" warning covers both paths
        // rather than going quiet the moment a coach switches to webhooks.
        const hookUnnamed = rows => {
          let grid = 0, opt = 0;
          for (const r of rows) for (const [k, v] of Object.entries(r)) {
            if (k[0] === '_' || typeof v !== 'string') continue;
            const n = (v.match(GRID_ID_RE) || []).length;
            if (k === 'Pain Map') grid += n; else opt += n;
          }
          return { grid, opt };
        };
        const uS = hookUnnamed(hookS.rows), uW = hookUnnamed(hookW.rows);
        const meta = {
          worker:   { version: WORKER_VERSION },
          srpe:     { fromPage: srpeFrom, nextPage: srpeRes.nextPage, hasMore: srpeRes.hasMore, total: srpeRes.total, fetched: sRPE.length,
                      pulled: srpeRes.rows.length, pushed: hookS.rows.length, cacheHits: srpeRes.cacheHits || 0,
                      rateLimited: !!srpeRes.rateLimited, snapshot: srpeRes.snapshot || null,
                      unnamedOptionIds: (srpeRes.unnamedOptionIds || 0) + uS.opt, error: srpeRes.error || null },
          wellness: { fromPage: wellFrom, nextPage: wellRes.nextPage, hasMore: wellRes.hasMore, total: wellRes.total, fetched: wellness.length,
                      pulled: wellRes.rows.length, pushed: hookW.rows.length,
                      unnamedGridIds: (wellRes.unnamedGridIds || 0) + uW.grid,
                      unnamedOptionIds: (wellRes.unnamedOptionIds || 0) + uW.opt,
                      formLabels: wellRes.formLabelCount, cacheHits: wellRes.cacheHits || 0,
                      rateLimited: !!wellRes.rateLimited, snapshot: wellRes.snapshot || null,
                      labelSources: wellRes.labelSources, error: wellRes.error || null },
          // The push half: whether a store is bound at all, whether deliveries are signed,
          // and how many rows came from it. `mode` is what the app reports to the coach —
          // a Worker with no API key is not broken, it is webhook-only.
          webhook:  { enabled: !!store, signed: !!webhookSecret(env),
                      mode: key ? (store ? 'api+webhook' : 'api') : 'webhook',
                      srpe: hookS.rows.length, wellness: hookW.rows.length,
                      truncated: !!(hookS.truncated || hookW.truncated),
                      error: hookS.error || hookW.error || null },
          pageLimit: PAGE_LIMIT,
          // What this pull actually cost Tally, and whether the ceiling was reached. The
          // app reads `rateLimited` to slow itself down instead of hammering on.
          rate: { limit: TALLY_RATE_LIMIT, budget: RATE_BUDGET, spent: ctx.limiter.spent(),
                  cached: !!store,
                  // Served from the stored season rather than read out of Tally page by
                  // page. The app reads it to know a sync cost nothing and needs no pacing.
                  snapshot: (srpeRes.snapshot === 'hit' || srpeRes.snapshot === 'delta')
                         && (wellRes.snapshot === 'hit' || wellRes.snapshot === 'delta'),
                  rateLimited: !!(srpeRes.rateLimited || wellRes.rateLimited) },
        };
        return json({ sRPE, wellness, meta, syncedAt: new Date().toISOString() });
      } catch (e) {
        return json({ error: String(e && e.message || e) });
      }
    }

    /* GET /diag[?form=wellness|srpe] — what the Worker actually sees.
       When a pain region arrives unnamed there is no way to tell from the app whether
       Tally declares the matrix's rows, whether the API key may read the form definition,
       or whether Cloudflare is simply running older code. This dumps exactly that: the
       questions of the first page as Tally sends them, every label endpoint with its HTTP
       status, and the newest grid answer with the value it decoded to. It carries one
       submission's answers, so treat the output as you would the form itself. */
    if (url.pathname === '/diag') {
      try {
        const key = env.TALLY_API_KEY;
        if (!key) throw new Error('TALLY_API_KEY secret is not set on the Worker');
        const which = (url.searchParams.get('form') || 'wellness').toLowerCase();
        const formId = which === 'srpe' ? env.SRPE_FORM : env.WELLNESS_FORM;
        if (!formId) throw new Error(`${which === 'srpe' ? 'SRPE_FORM' : 'WELLNESS_FORM'} is not set on the Worker`);
        const diagCtx = { limiter: makeLimiter(), store: webhookStore(env) };
        const { labels, sources } = await fetchFormLabels(formId, key, diagCtx);
        const res = await tallyFetch(`/forms/${formId}/submissions?page=1&limit=1`, key, diagCtx);
        const page = res.ok ? await res.json() : null;
        const qById = {};
        ((page && page.questions) || []).forEach(q => { qById[q.id] = q; });
        const pageLabels = collectLabels({ questions: (page && page.questions) || [] });
        const labelBook = Object.assign(pageLabels, labels);
        const grids = [];
        for (const s of ((page && page.submissions) || [])) {
          for (const resp of (s.responses || [])) {
            const a = resp.answer !== undefined ? resp.answer : resp.value;
            if (!a || typeof a !== 'object' || Array.isArray(a)) continue;
            const q = qById[resp.questionId];
            grids.push({
              questionId: resp.questionId,
              questionTitle: q ? (q.title || q.label || null) : null,
              canonicalKey: canonicalKey(q ? (q.title || q.label || resp.questionId) : resp.questionId),
              rawAnswer: a,
              decoded: answerToValue(resp, q, labelBook).value,
            });
          }
        }
        return json({
          worker: { version: WORKER_VERSION },
          webhook: { enabled: !!webhookStore(env), signed: !!webhookSecret(env), endpoint: `${url.origin}/webhook` },
          form: { which, id: formId },
          formLabels: { count: Object.keys(labels).length, sources, sample: Object.entries(labels).slice(0, 25) },
          submissionsPage: { status: res.status, questions: (page && page.questions) || [] },
          gridAnswers: grids,
          hint: grids.length === 0
            ? 'No object-shaped (matrix) answer in the newest submission — the pain grid may be answered on older submissions only.'
            : (grids.some(g => (JSON.stringify(g.decoded) || '').match(GRID_ID_RE))
              ? 'Row ids survived every dictionary: check formLabels.sources above — a 401/403 means TALLY_API_KEY cannot read the form definition, a 404 means the endpoint is not available on this plan.'
              : 'Grid decoded to region names — if the app still shows unnamed regions, press Sync Now so the stored check-ins are rewritten.'),
        });
      } catch (e) {
        return json({ error: String(e && e.message || e) });
      }
    }

    /* GET /webhook — the same address Tally posts to, opened in a browser. Says whether
       this Worker can actually accept a delivery (a store is bound, a secret is set) and
       how many are already held, so the endpoint can be checked before a single athlete
       fills the form in. */
    if (url.pathname === '/webhook' || url.pathname === '/hook' || url.pathname === '/tally') {
      const kv = webhookStore(env);
      const counts = { srpe: null, wellness: null };
      if (kv) {
        try {
          const [s, w] = await Promise.all([readDeliveries(kv, 'srpe'), readDeliveries(kv, 'wellness')]);
          counts.srpe = s.rows.length; counts.wellness = w.rows.length;
        } catch (e) { /* the counts are a courtesy; the status below is the point */ }
      }
      return json({
        worker: { version: WORKER_VERSION },
        endpoint: `${url.origin}/webhook`,
        ready: !!kv,
        store: kv ? 'bound' : 'MISSING — add a KV namespace binding named TALLY_STORE (Cloudflare → this Worker → Settings → Bindings), otherwise deliveries have nowhere to go.',
        signed: !!webhookSecret(env),
        forms: { srpe: env.SRPE_FORM || null, wellness: env.WELLNESS_FORM || null },
        held: counts,
        hint: 'Paste this address into Tally → your form → Integrations → Webhooks → Endpoint URL. Do the same for both forms; the Worker tells them apart by form id.',
      });
    }

    return new Response('CoachOS Tally Worker is running. Append /sync to fetch data, /diag to see what it reads from Tally, or /webhook for the address Tally posts new submissions to.', { headers: CORS });
  },
};
