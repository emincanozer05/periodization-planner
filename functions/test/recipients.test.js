/* ═══════════════════════════════════════════════════════════════════════════
   ALICILAR — Test 11, 12, 13 ve 15'in kadro tarafı

   Buradaki soru tek: bir sporcunun uyarısı KİMİN telefonuna gidiyor. Kadro
   yapısı uygulamanın kendi `team.staff[]` yapısı; hiçbir kulüp/takım kimliği
   koda gömülü değil, testler de bunu kurgusal kimliklerle gösteriyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t } = require('./harness');
const { eligibleStaff, staffCovers, tokensFor, groupByLang, groupByDelivery } = require('../recipients');

const COACH = 'coach-uid-1';
const TEAM = 'team-u16';
const OTHER_TEAM = 'team-u18';
const ATH = 'ath-emir';
const ATH2 = 'ath-ahmet';

// Kadro — uygulamadaki normStaff şeklinin aynısı (id, role, name, athleteIds).
const S = (id, role, name, athleteIds) => ({ id, role, name, athleteIds });

const STAFF = [
  S('s-head', 'head', 'Baş Antrenör'),
  S('s-asst', 'assistant', 'Yardımcı Antrenör'),
  S('s-perf', 'performance', 'Performans Antrenörü'),
  S('s-physio', 'physio', 'Fizyoterapist'),
  S('s-ind-emir', 'individual', 'Emir\'in Bireysel Antrenörü', [ATH]),
  S('s-ind-other', 'individual', 'Başkasının Bireysel Antrenörü', [ATH2]),
  S('s-ind-none', 'individual', 'Ataması Olmayan Bireysel Antrenör', []),
];

// Cihaz kaydı — push_tokens koleksiyonundaki şekil.
const TK = (token, staffId, extra) => Object.assign(
  { token, kind: 'staff', coachUid: COACH, teamId: TEAM, staffId, lang: 'tr' }, extra || {});

/* ── Rol kapsamı ──────────────────────────────────────────────────────────── */
section('Rol kapsamı — dördü takım geneli, bireysel antrenör kendi sporcusu');

t('baş antrenör takımın her sporcusunu kapsıyor', () => {
  assert.strictEqual(staffCovers(S('x', 'head', 'A'), ATH), true);
  assert.strictEqual(staffCovers(S('x', 'head', 'A'), ATH2), true);
});
t('yardımcı, performans ve fizyoterapist de takım geneli', () => {
  ['assistant', 'performance', 'physio'].forEach(role => {
    assert.strictEqual(staffCovers(S('x', role, 'A'), ATH), true, role);
  });
});
t('bireysel antrenör yalnızca atandığı sporcuyu kapsıyor', () => {
  const m = S('x', 'individual', 'A', [ATH]);
  assert.strictEqual(staffCovers(m, ATH), true);
  assert.strictEqual(staffCovers(m, ATH2), false);
});
t('ataması olmayan bireysel antrenör hiçbir sporcuyu kapsamıyor', () => {
  assert.strictEqual(staffCovers(S('x', 'individual', 'A', []), ATH), false);
  assert.strictEqual(staffCovers(S('x', 'individual', 'A'), ATH), false);
});
t('tanınmayan rol kapsam açmıyor', () => {
  assert.strictEqual(staffCovers(S('x', 'masseur', 'A'), ATH), false);
});
t('kimliksiz kadro satırı yok sayılıyor', () => {
  assert.strictEqual(staffCovers({ role: 'head' }, ATH), false);
  assert.strictEqual(staffCovers(null, ATH), false);
});

/* ── Test 11 ──────────────────────────────────────────────────────────────── */
section('TEST 11 — yalnızca ilgili ekip üyeleri');

t('sporcunun ekibi: dört takım rolü + kendi bireysel antrenörü', () => {
  const ids = eligibleStaff(STAFF, ATH).map(m => m.id);
  assert.deepStrictEqual(ids, ['s-head', 's-asst', 's-perf', 's-physio', 's-ind-emir']);
});
t('başka sporcunun bireysel antrenörü listeye girmiyor', () => {
  const ids = eligibleStaff(STAFF, ATH).map(m => m.id);
  assert.ok(!ids.includes('s-ind-other'));
  assert.ok(!ids.includes('s-ind-none'));
});
t('yalnızca baş antrenör + performans antrenörü varsa yalnızca onlar', () => {
  const small = [S('s-head', 'head', 'A'), S('s-perf', 'performance', 'B')];
  assert.deepStrictEqual(eligibleStaff(small, ATH).map(m => m.id), ['s-head', 's-perf']);
});
t('bildirim yalnızca kapsanan kişilerin cihazlarına gidiyor', () => {
  const tokens = [
    TK('tok-head', 's-head'),
    TK('tok-perf', 's-perf'),
    TK('tok-ind-other', 's-ind-other'),   // başka sporcunun bireysel antrenörü
  ];
  const got = tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-head', 'tok-perf']);
});

/* ── Test 12 ──────────────────────────────────────────────────────────────── */
section('TEST 12 — eksik rol hata üretmiyor');

t('fizyoterapisti olmayan takımda diğerleri bildirim alıyor', () => {
  const noPhysio = STAFF.filter(m => m.role !== 'physio');
  const tokens = [TK('tok-head', 's-head'), TK('tok-perf', 's-perf')];
  const got = tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: noPhysio });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-head', 'tok-perf']);
});
t('kadro tamamen boşsa hata değil, boş liste', () => {
  assert.deepStrictEqual(eligibleStaff([], ATH), []);
  assert.deepStrictEqual(tokensFor([TK('t', 's-head')], { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: [] }), []);
});
t('kadro alanı hiç yoksa (eski takım kaydı) çökmüyor', () => {
  assert.deepStrictEqual(eligibleStaff(undefined, ATH), []);
  assert.deepStrictEqual(tokensFor(undefined, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: undefined }), []);
});

/* ── Test 13 ──────────────────────────────────────────────────────────────── */
section('TEST 13 — cihazı olmayan kişi atlanıyor');

t('tokensız fizyoterapist atlanıyor, diğerleri alıyor', () => {
  // s-physio kapsamda ama hiç cihaz eşleştirmemiş: listede kaydı yok.
  const tokens = [TK('tok-head', 's-head'), TK('tok-asst', 's-asst')];
  const got = tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-head', 'tok-asst']);
});
t('hiç kimse eşleştirmemişse boş liste — hata değil', () => {
  assert.deepStrictEqual(tokensFor([], { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }), []);
});
t('bir kişinin iki cihazı varsa ikisi de alıyor', () => {
  const tokens = [TK('tok-phone', 's-head'), TK('tok-tablet', 's-head')];
  const got = tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-phone', 'tok-tablet']);
});

/* ── Güvenlik sınırları (Madde 16) ────────────────────────────────────────── */
section('Güvenlik — kapsam dışı hiçbir cihaza gitmiyor');

t('başka hesabın cihazı asla almıyor', () => {
  const tokens = [TK('tok-other-acct', 's-head', { coachUid: 'coach-uid-2' })];
  assert.deepStrictEqual(tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }), []);
});
t('aynı hesabın BAŞKA takımına eşleşmiş cihaz almıyor', () => {
  const tokens = [TK('tok-u18', 's-head', { teamId: OTHER_TEAM })];
  assert.deepStrictEqual(tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }), []);
});
t('staffId taşımayan "staff" cihazı almıyor', () => {
  const tokens = [TK('tok-nostaff', null)];
  assert.deepStrictEqual(tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }), []);
});
t('kadrodan çıkarılmış kişinin cihazı almıyor', () => {
  // s-head kadrodan silinmiş ama cihaz kaydı duruyor → kapsam yok.
  const gone = STAFF.filter(m => m.id !== 's-head');
  const tokens = [TK('tok-head', 's-head')];
  assert.deepStrictEqual(tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: gone }), []);
});

/* ── Koçun kendi cihazı ───────────────────────────────────────────────────── */
section('Hesap sahibi — tüm takımlarının uyarısını alıyor');

const COACH_TOK = { token: 'tok-coach', kind: 'coach', coachUid: COACH, lang: 'tr' };

t('koç, takım kısıtı olmadan her takımın uyarısını alıyor', () => {
  const a = tokensFor([COACH_TOK], { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  const b = tokensFor([COACH_TOK], { coachUid: COACH, teamId: OTHER_TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(a.map(x => x.token), ['tok-coach']);
  assert.deepStrictEqual(b.map(x => x.token), ['tok-coach']);
});
t('takıma kilitlenmiş koç cihazı yalnızca o takımı alıyor', () => {
  const locked = Object.assign({}, COACH_TOK, { teamId: TEAM });
  assert.strictEqual(tokensFor([locked], { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }).length, 1);
  assert.strictEqual(tokensFor([locked], { coachUid: COACH, teamId: OTHER_TEAM, athleteId: ATH, staff: STAFF }).length, 0);
});
t('başka hesabın koç cihazı almıyor', () => {
  const foreign = Object.assign({}, COACH_TOK, { coachUid: 'coach-uid-2' });
  assert.deepStrictEqual(tokensFor([foreign], { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF }), []);
});

/* ── Test 14'ün alıcı tarafı ──────────────────────────────────────────────── */
section('TEST 14 — aynı cihaza iki kez gönderilmiyor');

t('aynı token iki kayıtta duruyorsa bir kez gidiyor', () => {
  const tokens = [TK('tok-head', 's-head'), TK('tok-head', 's-asst')];
  const got = tokensFor(tokens, { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-head']);
});
t('boş token kaydı listeye girmiyor', () => {
  const got = tokensFor([TK('', 's-head'), TK('tok-ok', 's-head')],
    { coachUid: COACH, teamId: TEAM, athleteId: ATH, staff: STAFF });
  assert.deepStrictEqual(got.map(x => x.token), ['tok-ok']);
});

/* ── Dil grupları ─────────────────────────────────────────────────────────── */
section('Dil — bildirim kişinin diliyle kuruluyor');

t('cihazlar diline göre gruplanıyor', () => {
  const g = groupByLang([
    TK('a', 's-head'), TK('b', 's-asst', { lang: 'en' }), TK('c', 's-perf'),
  ]);
  assert.deepStrictEqual(g.get('tr').map(x => x.token), ['a', 'c']);
  assert.deepStrictEqual(g.get('en').map(x => x.token), ['b']);
});
t('bilinmeyen dil Türkçeye düşüyor', () => {
  const g = groupByLang([TK('a', 's-head', { lang: 'de' }), TK('b', 's-asst', { lang: null })]);
  assert.deepStrictEqual(g.get('tr').map(x => x.token), ['a', 'b']);
  assert.strictEqual(g.has('en'), false);
});

/* ── Gönderim grupları ─────────────────────────────────────────────────────
   Adres kişiye özel olduğu için dil tek başına grup anahtarı değil: aynı dili
   konuşan iki kişi farklı sayfalara açılıyor ve aynı mesajla gidemezler. */
section('Gönderim grupları');

t('aynı dil + aynı adres tek istekte gidiyor', () => {
  const g = [...groupByDelivery([
    { token: 'a', lang: 'tr', link: 'L1' },
    { token: 'b', lang: 'tr', link: 'L1' },
  ]).values()];
  assert.strictEqual(g.length, 1);
  assert.deepStrictEqual(g[0].tokens.map(t => t.token), ['a', 'b']);
  assert.strictEqual(g[0].link, 'L1');
});
t('aynı dil farklı adres ayrı gidiyor — kimse başkasının sayfasını açmıyor', () => {
  const g = [...groupByDelivery([
    { token: 'a', lang: 'tr', link: 'L1' },
    { token: 'b', lang: 'tr', link: 'L2' },
  ]).values()];
  assert.strictEqual(g.length, 2);
  assert.deepStrictEqual(g.map(x => x.link), ['L1', 'L2']);
});
t('dil de ayırıyor', () => {
  const g = [...groupByDelivery([
    { token: 'a', lang: 'tr', link: 'L1' },
    { token: 'b', lang: 'en', link: 'L1' },
  ]).values()];
  assert.deepStrictEqual(g.map(x => x.lang), ['tr', 'en']);
});
t('linksiz cihaz da gönderimde — bildirim gider, tıklanınca bir şey açılmaz', () => {
  const g = [...groupByDelivery([{ token: 'a', lang: 'tr' }]).values()];
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].link, '');
});
t('bilinmeyen dil Türkçeye düşüyor', () => {
  const g = [...groupByDelivery([{ token: 'a', lang: 'de', link: 'L1' }]).values()];
  assert.strictEqual(g[0].lang, 'tr');
});
