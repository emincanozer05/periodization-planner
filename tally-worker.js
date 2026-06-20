/**
 * CoachOS — Tally Sync Worker (Cloudflare Workers, ES module)
 *
 * Reads submissions from your two Tally forms (sRPE + Wellness) via the Tally API
 * and exposes them at  GET <worker-url>/sync  in the shape CoachOS expects:
 *
 *   { "sRPE":     [ {_id, "Athlete", "Date", "TP RPE", ...}, ... ],
 *     "wellness": [ {_id, "Athlete", "Date", "RHR", "Sleep", ...}, ... ],
 *     "syncedAt": "<ISO timestamp>" }
 *
 * Each row's keys are the Tally QUESTION TITLES, so name your form questions
 * exactly like the columns the app reads:
 *   sRPE form:     Athlete, Date, TP RPE, TP Duration, S&C RPE, S&C Duration,
 *                  Game RPE, Game Duration   (optional: TP sRPE, S&C sRPE, Total sRPE)
 *   Wellness form: Athlete, Date, RHR, Sleep, Fatigue, Soreness, Area of Pain, Readiness
 *
 * "Athlete" must be the athlete's NAME (a short-text question, or a dropdown whose
 * option label is the name). If there is no "Date" question, the submission time is
 * used as the date automatically.
 *
 * Required environment variables (Cloudflare → Worker → Settings → Variables):
 *   TALLY_API_KEY  — your Tally API key  (Tally → Settings → API keys)  [encrypt as a Secret]
 *   SRPE_FORM      — the sRPE form ID
 *   WELLNESS_FORM  — the Wellness form ID
 *
 * Form ID: open the form in Tally; the ID is the code in the URL
 *   https://tally.so/forms/<FORM_ID>/...   (also shown as wXXXXX in the editor URL)
 *
 * Tip for "automatic": turn ON Auto-sync in CoachOS → Tally Sync. The app then
 * polls this Worker every few minutes, so new submissions appear on their own.
 */

const TALLY_API = 'https://api.tally.so';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

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

// Fetch every submission of a form (paginated) → array of {_id, <QuestionTitle>: value}.
async function fetchForm(formId, key) {
  const rows = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${TALLY_API}/forms/${formId}/submissions?page=${page}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tally API ${res.status} for form ${formId}: ${t.slice(0, 300)}`);
    }
    const j = await res.json();
    const qById = {};
    (j.questions || []).forEach(q => { qById[q.id] = q; });
    for (const s of (j.submissions || [])) {
      const row = { _id: s.id };
      if (s.submittedAt) row['Date'] = String(s.submittedAt).slice(0, 10); // default; a "Date" question overrides
      for (const resp of (s.responses || [])) {
        const q = qById[resp.questionId];
        const title = q ? (q.title || q.label || resp.questionId) : resp.questionId;
        const v = answerToValue(resp, q);
        if (v != null && v !== '') row[title] = v;
      }
      rows.push(row);
    }
    if (j.hasMore) page++; else break;
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
        return json({ sRPE, wellness, syncedAt: new Date().toISOString() });
      } catch (e) {
        // Return 200 + {error} so the app surfaces the message instead of a bare HTTP error.
        return json({ error: String(e && e.message || e) });
      }
    }

    return new Response('CoachOS Tally Worker is running. Append /sync to fetch data.', { headers: CORS });
  },
};
