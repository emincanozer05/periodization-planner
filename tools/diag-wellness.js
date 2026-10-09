/* GEÇİCİ TEŞHİS — yalnızca okur, kimlik/isim/token basmaz (kısaltılmış özet + sayılar). */
const admin = require('../functions/node_modules/firebase-admin');
const crypto = require('crypto');
admin.initializeApp({ projectId: 'periodization-planner' });
const db = admin.firestore();
const h = s => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 6);
const dayKey = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(d);
const days = [0, 1, 2, 3, 4, 5, 6].map(i => dayKey(new Date(Date.now() - i * 864e5)));

(async () => {
  console.log('days', days.join(','));
  const roster = await db.collection('alert_roster').get();
  console.log('\n== alert_roster', roster.size);
  roster.forEach(d => { const x = d.data(); console.log(' coach', h(x.coachUid), 'team', h(x.teamId), 'athletes', (x.athletes || []).length, 'staff', (x.staff || []).length, 'upd', x.updatedAt); });

  const cl = await db.collection('checkin_links').get();
  console.log('\n== checkin_links', cl.size);
  cl.forEach(d => { const x = d.data(); console.log(' coach', h(x.coachUid), 'team', h(x.teamId), 'athletes', (x.athletes || []).length, 'upd', x.updatedAt); });

  const sl = await db.collection('staff_links').get();
  console.log('\n== staff_links', sl.size);
  sl.forEach(d => { const x = d.data(); console.log(' coach', h(x.coachUid), 'team', h(x.teamId), 'role', x.role, 'upd', x.updatedAt); });

  const sm = await db.collection('staff_members').get();
  console.log('\n== staff_members', sm.size);
  sm.forEach(d => { const x = d.data(); console.log(' coach', h(x.coachUid), 'team', h(x.teamId), 'tokenLive', sl.docs.some(s => s.id === x.token), 'paired', x.pairedAt && x.pairedAt.toDate().toISOString()); });

  const ci = await db.collection('checkins').get();
  console.log('\n== checkins (henüz silinmemiş)', ci.size);
  const cc = {};
  ci.forEach(d => { const x = d.data(); const k = [h(x.coachUid), h(x.teamId), x.kind, x.date, x.alertSent ? 'sent' : (x.alertClaimedAt ? 'claimed' : 'UNPROCESSED')].join(' '); cc[k] = (cc[k] || 0) + 1; });
  Object.keys(cc).sort().forEach(k => console.log(' ', k, cc[k]));

  for (const col of ['wellness_alerts', 'rpe_reports']) {
    const s = await db.collection(col).where('date', 'in', days).get();
    console.log('\n==', col, 'son 7 gün', s.size);
    const c = {};
    s.forEach(d => { const x = d.data(); const k = [h(x.coachUid), h(x.teamId), x.date, x.notificationStatus || ''].join(' '); c[k] = (c[k] || 0) + 1; });
    Object.keys(c).sort().forEach(k => console.log(' ', k, c[k]));
    const last = await db.collection(col).orderBy('createdAt', 'desc').limit(5).get();
    last.forEach(d => { const x = d.data(); console.log('  latest', h(x.teamId), x.date, x.createdAt && x.createdAt.toDate().toISOString()); });
  }
})().catch(e => { console.error('HATA', e.code || '', e.message); process.exit(1); });
