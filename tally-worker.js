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
 *     "meta":     { "srpe": {nextPage, hasMore, total, fetched}, "wellness": {...} },
 *     "syncedAt": "<ISO timestamp>" }
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
  if (t.includes('kas') || ((t.includes('agri') || t.includes('agrin')) && t.includes('derece'))) return 'Soreness';
  // "Ağrın hangi bölgede ve şiddette?" is a MATRIX (region rows × severity columns) and
  // is decoded into "Region: Severity" pairs — checked before the plain free-text
  // "Ağrın hangi bölgede?", which is the same question without the severity axis.
  if (t.includes('bolge') && (t.includes('siddet') || t.includes('severity'))) return 'Pain Map';
  if (t.includes('pain map') || t.includes('pain grid')) return 'Pain Map';
  if (t.includes('bolge') || t.includes('area of pain')) return 'Area of Pain';
  if (t.includes('readiness') || t.includes('hazir')) return 'Readiness';

  return rawTitle;
}

// A MATRIX answer is a grid: {rowId: columnId} or {rowId: [columnIds]}. Tally sends the
// ids, so both axes are resolved back to their labels and written out as
// "Row: Column, Row: Column" — which is what the pain question needs to survive the trip
// (region AND severity, not one or the other). Returns null when this is not a matrix,
// so the ordinary answer handling below takes over.
function matrixToValue(a, question) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const q = question || {};
  const f = q.field || {};
  const rows = q.rows || f.rows || null;
  const cols = q.columns || f.columns || null;
  if (!rows || !cols) return null;
  const label = (list, id) => {
    const o = (list || []).find(o => o.id === id || o.uuid === id);
    return o ? (o.text || o.label || o.title || id) : id;
  };
  const out = [];
  for (const [rowId, val] of Object.entries(a)) {
    const picks = (Array.isArray(val) ? val : [val]).filter(v => v != null && v !== '');
    if (!picks.length) continue;
    out.push(`${label(rows, rowId)}: ${picks.map(c => label(cols, c)).join('/')}`);
  }
  return out.length ? out.join(', ') : null;
}

// Turn one Tally answer into a plain value, mapping choice option-IDs to their labels.
function answerToValue(resp, question) {
  let a = resp.answer !== undefined ? resp.answer : resp.value;
  if (a == null) return null;
  const grid = matrixToValue(a, question);
  if (grid != null) return grid;
  const opts = (question && (question.options || (question.field && question.field.options))) || null;
  const mapOpt = id => {
    if (!opts) return id;
    const o = opts.find(o => o.id === id || o.uuid === id);
    return o ? (o.text || o.label || o.title || id) : id;
  };
  if (Array.isArray(a)) {
    return a.map(x => (x && typeof x === 'object') ? (x.text || x.label || x.value || x.title || '') : mapOpt(x))
            .filter(v => v !== '' && v != null).join(', ');
  }
  if (typeof a === 'object') {
    return a.value ?? a.text ?? a.url ?? a.name ?? JSON.stringify(a);
  }
  if (opts && typeof a === 'string') { const m = mapOpt(a); if (m !== a) return m; }
  return a;
}

// Tally caps the page size (50 by default) and silently ignores anything larger,
// so asking for 500 does NOT return 500 — it returns one capped page. The old
// code combined that with a hard 8-page stop, which quietly truncated any form
// with more than a few hundred submissions: the rest of the season simply never
// reached the app. We now paginate until `hasMore` is false and, when a single
// Worker invocation would blow Cloudflare's subrequest budget, we hand the next
// page number back so the app can resume in a follow-up request.
const PAGE_LIMIT = 50;   // Tally's documented page size
const PAGE_BUDGET = 20;  // pages per form per invocation (2 forms → 40 subrequests < 50)

// Fetch one page-run of a form's submissions.
// → {rows, total, nextPage, hasMore} — `hasMore` true means Tally still has
//   submissions after `nextPage - 1` and the caller should come back for them.
async function fetchForm(formId, key, startPage = 1, budget = PAGE_BUDGET) {
  const rows = [];
  let page = Math.max(1, Number(startPage) || 1);
  let total = null, more = false;
  for (let n = 0; n < budget; n++, page++) {
    const res = await fetch(`${TALLY_API}/forms/${formId}/submissions?page=${page}&limit=${PAGE_LIMIT}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tally API ${res.status} for form ${formId}: ${t.slice(0, 300)}`);
    }
    const j = await res.json();
    if (total == null) {
      const t = j.totalNumberOfSubmissionsPerFilter ?? j.total;
      total = (t == null || isNaN(Number(t))) ? null : Number(t);
    }
    const qById = {};
    (j.questions || []).forEach(q => { qById[q.id] = q; });
    const subs = j.submissions || [];
    for (const s of subs) {
      const row = { _id: s.id };
      if (s.submittedAt) row['Date'] = String(s.submittedAt).slice(0, 10); // default; a "Tarih" question overrides
      for (const resp of (s.responses || [])) {
        const q = qById[resp.questionId];
        const title = q ? (q.title || q.label || resp.questionId) : resp.questionId;
        const v = answerToValue(resp, q);
        if (v == null || v === '') continue;
        const key = canonicalKey(title);
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
  return { rows, total, nextPage: page, hasMore: more };
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
        const EMPTY = { rows: [], total: 0, nextPage: 1, hasMore: false };
        const [srpeRes, wellRes] = await Promise.all([
          env.SRPE_FORM     ? fetchForm(env.SRPE_FORM, key, srpeFrom)     : Promise.resolve(EMPTY),
          env.WELLNESS_FORM ? fetchForm(env.WELLNESS_FORM, key, wellFrom) : Promise.resolve(EMPTY),
        ]);
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
          srpe:     { fromPage: srpeFrom, nextPage: srpeRes.nextPage, hasMore: srpeRes.hasMore, total: srpeRes.total, fetched: sRPE.length },
          wellness: { fromPage: wellFrom, nextPage: wellRes.nextPage, hasMore: wellRes.hasMore, total: wellRes.total, fetched: wellness.length },
          pageLimit: PAGE_LIMIT,
        };
        return json({ sRPE, wellness, meta, syncedAt: new Date().toISOString() });
      } catch (e) {
        return json({ error: String(e && e.message || e) });
      }
    }

    return new Response('CoachOS Tally Worker is running. Append /sync to fetch data.', { headers: CORS });
  },
};
