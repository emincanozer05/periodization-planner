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
 *     "syncedAt": "<ISO timestamp>" }
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
  if (t.includes('bolge') || t.includes('area of pain')) return 'Area of Pain';
  if (t.includes('readiness') || t.includes('hazir')) return 'Readiness';

  return rawTitle;
}

// Turn one Tally answer into a plain value, mapping choice option-IDs to their labels.
function answerToValue(resp, question) {
  let a = resp.answer !== undefined ? resp.answer : resp.value;
  if (a == null) return null;
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

// Fetch submissions of a form → array of {_id, <CanonicalKey>: value}.
// Uses a large page size and a hard page cap so we never exceed Cloudflare's
// per-invocation subrequest limit (~50 on the free plan).
async function fetchForm(formId, key) {
  const rows = [];
  const LIMIT = 500, MAX_PAGES = 8;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${TALLY_API}/forms/${formId}/submissions?page=${page}&limit=${LIMIT}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tally API ${res.status} for form ${formId}: ${t.slice(0, 300)}`);
    }
    const j = await res.json();
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
        if (v != null && v !== '') row[canonicalKey(title)] = v;
      }
      rows.push(row);
    }
    if (!j.hasMore || subs.length === 0) break;
  }
  return rows;
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
        const [sRPE, wellness] = await Promise.all([
          env.SRPE_FORM     ? fetchForm(env.SRPE_FORM, key)     : Promise.resolve([]),
          env.WELLNESS_FORM ? fetchForm(env.WELLNESS_FORM, key) : Promise.resolve([]),
        ]);
        // The Wellness form has no "Readiness" question, so derive it as the mean of the
        // 1-5 subscores present (Sleep, Fatigue, Soreness). Remove this block if unwanted.
        for (const r of wellness) {
          if (r['Readiness'] == null) {
            const vals = ['Sleep', 'Fatigue', 'Soreness'].map(k => Number(r[k])).filter(n => !isNaN(n));
            if (vals.length) r['Readiness'] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
          }
        }
        return json({ sRPE, wellness, syncedAt: new Date().toISOString() });
      } catch (e) {
        return json({ error: String(e && e.message || e) });
      }
    }

    return new Response('CoachOS Tally Worker is running. Append /sync to fetch data.', { headers: CORS });
  },
};
