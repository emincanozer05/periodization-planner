/**
 * CoachOS — Notion Sync Worker (Cloudflare Workers, ES module)
 *
 * This Worker proxies your two Notion databases (sRPE + Wellness) into the
 * CoachOS app. The app calls  GET <worker-url>/sync  and expects:
 *
 *   { "sRPE": [ {_id, "Athlete", "Date", "TP RPE", ...}, ... ],
 *     "wellness": [ {_id, "Athlete", "Date", "RHR", "Sleep", ...}, ... ],
 *     "syncedAt": "<ISO timestamp>" }
 *
 * Each row's keys are the Notion property names exactly as they appear in your
 * database, so the column names in Notion must match what the app reads:
 *   sRPE DB:     Athlete, Date, TP RPE, TP Duration, S&C RPE, S&C Duration,
 *                Game RPE, Game Duration, (optional) TP sRPE, S&C sRPE, Total sRPE
 *   Wellness DB: Athlete, Date, RHR, Sleep, Fatigue, Soreness, Area of Pain, Readiness
 *
 * "Athlete" must resolve to the athlete's NAME as text (a Title, Text, Select,
 * or a Formula that outputs the name). If it is a Relation, add a Rollup/Formula
 * that shows the related athlete's name and point the column at that instead.
 *
 * Required environment variables (set in the Cloudflare dashboard):
 *   NOTION_TOKEN  — your Notion internal-integration secret (starts with "ntn_" / "secret_")
 *   SRPE_DB       — the sRPE database ID (32 hex chars from its URL)
 *   WELLNESS_DB   — the Wellness database ID
 */

const NOTION_VERSION = '2022-06-28';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Convert a single Notion property object into a plain primitive value.
function readProp(p) {
  if (!p) return null;
  switch (p.type) {
    case 'title':       return p.title.map(t => t.plain_text).join('');
    case 'rich_text':   return p.rich_text.map(t => t.plain_text).join('');
    case 'number':      return p.number;
    case 'select':      return p.select ? p.select.name : null;
    case 'status':      return p.status ? p.status.name : null;
    case 'multi_select':return p.multi_select.map(s => s.name).join(', ');
    case 'date':        return p.date ? p.date.start : null;
    case 'checkbox':    return p.checkbox;
    case 'people':      return p.people.map(u => u.name || '').join(', ');
    case 'formula': {
      const f = p.formula; if (!f) return null;
      return f.string ?? f.number ?? f.boolean ?? (f.date ? f.date.start : null);
    }
    case 'rollup': {
      const r = p.rollup; if (!r) return null;
      if (r.type === 'number') return r.number;
      if (r.type === 'date')   return r.date ? r.date.start : null;
      if (r.type === 'array')  return r.array.map(readProp).filter(v => v != null).join(', ');
      return null;
    }
    default: return null;
  }
}

// Query one database (handles pagination) and flatten each page to {_id, ...props}.
async function queryDB(dbId, token) {
  let results = [], cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion API ${res.status} for DB ${dbId}: ${txt.slice(0, 300)}`);
    }
    const j = await res.json();
    results = results.concat(j.results || []);
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);

  return results.map(pg => {
    const row = { _id: pg.id };
    for (const [k, v] of Object.entries(pg.properties || {})) row[k] = readProp(v);
    return row;
  });
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
        const token = env.NOTION_TOKEN;
        if (!token) throw new Error('NOTION_TOKEN secret is not set on the Worker');
        const [sRPE, wellness] = await Promise.all([
          env.SRPE_DB     ? queryDB(env.SRPE_DB, token)     : Promise.resolve([]),
          env.WELLNESS_DB ? queryDB(env.WELLNESS_DB, token) : Promise.resolve([]),
        ]);
        return json({ sRPE, wellness, syncedAt: new Date().toISOString() });
      } catch (e) {
        // Return 200 + {error} so the app surfaces the message instead of a bare HTTP error.
        return json({ error: String(e && e.message || e) });
      }
    }

    return new Response('CoachOS Notion Worker is running. Append /sync to fetch data.', { headers: CORS });
  },
};
