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
const WORKER_VERSION = 7;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

    if (url.pathname === '/sync') {
      try {
        const key = env.TALLY_API_KEY;
        if (!key) throw new Error('TALLY_API_KEY secret is not set on the Worker');
        // The app resumes a truncated sync by echoing back the page numbers from
        // the previous response's `meta`. Each round-trip is a fresh Worker
        // invocation, so a season's worth of submissions can be pulled in full
        // without ever exceeding one invocation's subrequest budget.
        const srpeFrom = Number(url.searchParams.get('srpePage')) || 1;
        const wellFrom = Number(url.searchParams.get('wellnessPage')) || 1;
        const unset = which => ({ rows: [], total: null, nextPage: 1, hasMore: false, unnamedGridIds: 0,
                                  error: `${which} is not set on the Worker` });
        const [srpeRes, wellRes] = await Promise.all([
          env.SRPE_FORM     ? fetchForm(env.SRPE_FORM, key, srpeFrom)     : Promise.resolve(unset('SRPE_FORM')),
          env.WELLNESS_FORM ? fetchForm(env.WELLNESS_FORM, key, wellFrom) : Promise.resolve(unset('WELLNESS_FORM')),
        ]);
        // Both forms unreadable is a Worker-level failure (a bad key, no forms configured);
        // one of the two is not, and the half that answered still goes to the app.
        if (srpeRes.error && wellRes.error)
          throw new Error(`sRPE: ${srpeRes.error} · Wellness: ${wellRes.error}`);
        const sRPE = srpeRes.rows, wellness = wellRes.rows;
        // The Wellness form has no "Readiness" question, so derive it as the mean of the
        // 1-5 subscores present (Sleep, Fatigue, Soreness). Remove this block if unwanted.
        for (const r of wellness) {
          if (r['Readiness'] == null) {
            const vals = ['Sleep', 'Fatigue', 'Soreness'].map(k => Number(r[k])).filter(n => !isNaN(n));
            if (vals.length) r['Readiness'] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
          }
        }
        const meta = {
          worker:   { version: WORKER_VERSION },
          srpe:     { fromPage: srpeFrom, nextPage: srpeRes.nextPage, hasMore: srpeRes.hasMore, total: srpeRes.total, fetched: sRPE.length,
                      unnamedOptionIds: srpeRes.unnamedOptionIds || 0, error: srpeRes.error || null },
          wellness: { fromPage: wellFrom, nextPage: wellRes.nextPage, hasMore: wellRes.hasMore, total: wellRes.total, fetched: wellness.length,
                      unnamedGridIds: wellRes.unnamedGridIds, unnamedOptionIds: wellRes.unnamedOptionIds || 0,
                      formLabels: wellRes.formLabelCount,
                      labelSources: wellRes.labelSources, error: wellRes.error || null },
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

    return new Response('CoachOS Tally Worker is running. Append /sync to fetch data, or /diag to see what it reads from Tally.', { headers: CORS });
  },
};
