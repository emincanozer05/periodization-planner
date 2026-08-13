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
const WORKER_VERSION = 8;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

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

async function fetchFormLabels(formId, key) {
  const labels = {};
  const sources = [];
  for (const build of FORM_LABEL_PATHS) {
    const path = build(formId);
    const before = Object.keys(labels).length;
    try {
      const res = await fetch(`${TALLY_API}${path}`, { headers: { 'Authorization': `Bearer ${key}` } });
      if (!res.ok) { sources.push({ path, status: res.status, added: 0 }); continue; }
      collectLabels(await res.json(), labels);
      sources.push({ path, status: res.status, added: Object.keys(labels).length - before });
    } catch (e) {
      sources.push({ path, status: 'error', error: String(e && e.message || e), added: 0 });
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
  const label = id => (typeof id === 'string' && labels[id]) ? labels[id] : id;
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
async function fetchForm(formId, key, startPage = 1, budget = PAGE_BUDGET) {
  try {
    return await fetchFormPages(formId, key, startPage, budget);
  } catch (e) {
    return { rows: [], total: null, nextPage: Math.max(1, Number(startPage) || 1), hasMore: false,
             unnamedGridIds: 0, formLabelCount: 0, labelSources: null,
             error: String((e && e.message) || e) };
  }
}

async function fetchFormPages(formId, key, startPage = 1, budget = PAGE_BUDGET) {
  const rows = [];
  let page = Math.max(1, Number(startPage) || 1);
  let total = null, more = false, unnamedGridIds = 0, unnamedOptionIds = 0;
  // Read once per form, before the pages: the dictionary that names a matrix's rows and
  // columns when the submissions payload does not carry them.
  const { labels: formLabels, sources: labelSources } = await fetchFormLabels(formId, key);
  for (let n = 0; n < budget; n++, page++) {
    const res = await fetch(`${TALLY_API}/forms/${formId}/submissions?page=${page}&limit=${PAGE_LIMIT}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tally API ${res.status} for form ${formId}: ${t.slice(0, 300)}`);
    }
    const j = await res.json();
    if (total == null) total = readTotal(j);
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
    more = j.hasMore === true || (j.hasMore == null && subs.length >= PAGE_LIMIT);
    if (!more || subs.length === 0) { more = false; page++; break; }
  }
  return { rows, total, nextPage: page, hasMore: more, unnamedGridIds, unnamedOptionIds,
           formLabelCount: Object.keys(formLabels).length, labelSources, error: null };
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
        const pull = (formId, which, from) =>
          !key ? Promise.resolve(idle())
               : formId ? fetchForm(formId, key, from) : Promise.resolve(unset(which));
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
        if (srpeRes.error && wellRes.error && !hookS.rows.length && !hookW.rows.length)
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
                      pulled: srpeRes.rows.length, pushed: hookS.rows.length,
                      unnamedOptionIds: (srpeRes.unnamedOptionIds || 0) + uS.opt, error: srpeRes.error || null },
          wellness: { fromPage: wellFrom, nextPage: wellRes.nextPage, hasMore: wellRes.hasMore, total: wellRes.total, fetched: wellness.length,
                      pulled: wellRes.rows.length, pushed: hookW.rows.length,
                      unnamedGridIds: (wellRes.unnamedGridIds || 0) + uW.grid,
                      unnamedOptionIds: (wellRes.unnamedOptionIds || 0) + uW.opt,
                      formLabels: wellRes.formLabelCount,
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
        const { labels, sources } = await fetchFormLabels(formId, key);
        const res = await fetch(`${TALLY_API}/forms/${formId}/submissions?page=1&limit=1`, {
          headers: { 'Authorization': `Bearer ${key}` },
        });
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
