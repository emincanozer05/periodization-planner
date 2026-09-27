/* Team crest, served from this site's own origin.

   The shared week PNG and session PDF are drawn by html2canvas, which can only draw a
   cross-origin picture the browser lets the page read back — and Firebase Storage sends
   no CORS headers on file downloads unless the bucket has been given a CORS config.
   So the coach's crest, which the sidebar shows without trouble, was left out of every
   shared sheet. Fetched here, server to server, there is no CORS to satisfy: the page
   asks /api/crest on its own origin and gets the same bytes back.

   It is deliberately not an open proxy: only files in this app's own bucket, under
   users/ (the one folder uploadMedia() writes to), and only raster images. SVG is
   refused because an SVG served from this origin could carry script. */
const BUCKET = 'periodization-planner.firebasestorage.app';
const PREFIX = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/users%2F`;
const TYPES = /^image\/(png|jpeg|gif|webp)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

module.exports = async (req, res) => {
  let u = '';
  try { u = new URL(req.url, 'http://local').searchParams.get('u') || ''; } catch (e) { u = ''; }
  if (!u.startsWith(PREFIX)) { res.statusCode = 400; res.end('bad url'); return; }
  try {
    const r = await fetch(u, { redirect: 'error' });
    if (!r.ok) { res.statusCode = r.status === 404 ? 404 : 502; res.end('upstream ' + r.status); return; }
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!TYPES.test(type)) { res.statusCode = 415; res.end('not a raster image'); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) { res.statusCode = 413; res.end('too large'); return; }
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(buf);
  } catch (e) {
    res.statusCode = 502; res.end('fetch failed');
  }
};
