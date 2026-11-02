/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — bağlantı kayıtları (davet, state, eşleşme, bağlantı kesme)

   Akış:
     1) Koç (oturum açmış) sporcu için DAVET üretir. Sporcunun gerçekten bu koçun
        kadrosunda olduğu sunucunun okuduğu kadro özetinden (alert_roster) doğrulanır.
        Ham davet değeri yalnızca koça bir kez döner; Firestore'da hash'i durur.
     2) Sporcu linki açar, "Polar ile bağlan"a basar → tek kullanımlık, 10 dakikalık
        bir STATE ve tarayıcıya bağlanan bir nonce (çerez) üretilir.
     3) Polar dönüşünde state tek seferde tüketilir, çerezle eşleşmesi zorunlu (CSRF).
     4) Token alınıp kullanıcı kaydı yapıldıktan sonra eşleşme TEK transaction'da
        yazılır: bir Polar kullanıcısı yalnızca bir sporcuya, bir sporcu yalnızca bir
        Polar hesabına bağlanabilir.

   Bütün kayıtlar koçun kimliğiyle (coachUid) kapsanıyor: bir hesap başka bir hesabın
   kaydına hiçbir yoldan ulaşamıyor. Mevcut koleksiyonlara YAZILMIYOR; alert_roster
   yalnızca okunuyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const { COL, TICKET_TTL_MS, STATE_TTL_MS } = require('./config');
const { randomToken, sha256, safeEqual, encrypt } = require('./crypto');
const { safe, rosterDocId } = require('../ids');

class LinkError extends Error {
  /* code: BAD_INPUT · ROSTER_MISSING · ATHLETE_NOT_FOUND · ALREADY_LINKED · INVALID_TICKET ·
           TICKET_EXPIRED · INVALID_STATE · STATE_EXPIRED · STATE_REUSED · STATE_MISMATCH ·
           COOKIE_MISSING · POLAR_USER_TAKEN · NOT_FOUND */
  constructor(code, message) { super(message || code); this.code = code; }
}

const linkIdOf = (coachUid, athleteId) => `${safe(coachUid)}__${safe(athleteId)}`;

function cleanId(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || s.length > 200) throw new LinkError('BAD_INPUT', 'Geçersiz kimlik.');
  return s;
}

/* ── 1) Davet ────────────────────────────────────────────────────────────── */
async function createInvite({ db, coachUid, teamId, athleteId, now }) {
  const uid = cleanId(coachUid), tId = cleanId(teamId), aId = cleanId(athleteId);
  const t = now();
  const rs = await db.collection(COL.ROSTER).doc(rosterDocId(uid, tId)).get();
  const roster = rs.exists ? (rs.data() || {}) : null;
  if (!roster || roster.coachUid !== uid) throw new LinkError('ROSTER_MISSING');
  const ath = (roster.athletes || []).find(a => a && String(a.id) === aId);
  if (!ath) throw new LinkError('ATHLETE_NOT_FOUND');

  const ticket = randomToken(32);
  const h = sha256(ticket);
  const id = linkIdOf(uid, aId);
  const linkRef = db.collection(COL.LINKS).doc(id);
  const expiresAt = t + TICKET_TTL_MS;
  await db.runTransaction(async tx => {
    const cur = await tx.get(linkRef);
    const c = cur.exists ? (cur.data() || {}) : null;
    if (c && c.status === 'active') throw new LinkError('ALREADY_LINKED');
    // Önceki davet varsa geçersiz: sporcuya en son gönderilen link tek geçerli link.
    if (c && c.ticketHash) tx.delete(db.collection(COL.TICKETS).doc(c.ticketHash));
    tx.set(db.collection(COL.TICKETS).doc(h), {
      coachUid: uid, teamId: tId, athleteId: aId, linkId: id,
      athleteName: String(ath.name || ''), teamName: String(roster.teamName || ''),
      createdAt: t, expiresAt,
    });
    tx.set(linkRef, {
      coachUid: uid, teamId: tId, athleteId: aId, athleteName: String(ath.name || ''),
      status: 'pending', ticketHash: h, inviteCreatedAt: t, inviteExpiresAt: expiresAt,
      lastError: null, updatedAt: t,
    }, { merge: true });
  });
  return { ticket, expiresAt, linkId: id };
}

/* Davetin hâlâ geçerli olup olmadığı — sporcunun açtığı sayfa bunu gösteriyor. */
async function loadTicket({ db, ticket, now }) {
  const tk = String(ticket || '');
  if (!tk || tk.length > 200) throw new LinkError('INVALID_TICKET');
  const h = sha256(tk);
  const s = await db.collection(COL.TICKETS).doc(h).get();
  if (!s.exists) throw new LinkError('INVALID_TICKET');
  const d = s.data() || {};
  if (!(Number(d.expiresAt) > now())) throw new LinkError('TICKET_EXPIRED');
  const ls = await db.collection(COL.LINKS).doc(d.linkId).get();
  const l = ls.exists ? (ls.data() || {}) : null;
  if (!l || l.ticketHash !== h) throw new LinkError('INVALID_TICKET');
  if (l.status === 'active') throw new LinkError('ALREADY_LINKED');
  return Object.assign({}, d, { ticketHash: h });
}

/* ── 2) State + tarayıcı bağlama nonce'u ─────────────────────────────────── */
async function beginAuth({ db, ticket, now }) {
  const tk = await loadTicket({ db, ticket, now });
  const state = randomToken(32);
  const nonce = randomToken(32);
  const t = now();
  await db.collection(COL.STATES).doc(sha256(state)).set({
    ticketHash: tk.ticketHash, linkId: tk.linkId, coachUid: tk.coachUid, teamId: tk.teamId,
    athleteId: tk.athleteId, nonceHash: sha256(nonce), createdAt: t, expiresAt: t + STATE_TTL_MS, used: false,
  });
  return { state, nonce, ticket: tk };
}

/* ── 3) State'i tek seferde tüket ────────────────────────────────────────────
   Hata durumunda da state "kullanıldı" işaretleniyor (bilinmeyen state hariç):
   eşleşmeyen bir çerezle gelen state'in ikinci bir denemesi olmasın. Transaction
   içinde hata fırlatmak yazımı geri alacağı için sonuç değer olarak dönüyor. */
async function consumeState({ db, state, nonce, now }) {
  const st = String(state || '');
  if (!st || st.length > 200) throw new LinkError('INVALID_STATE');
  const ref = db.collection(COL.STATES).doc(sha256(st));
  const res = await db.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) return { err: 'INVALID_STATE' };
    const d = s.data() || {};
    if (d.used) return { err: 'STATE_REUSED' };
    const t = now();
    tx.set(ref, { used: true, usedAt: t }, { merge: true });
    if (!(Number(d.expiresAt) > t)) return { err: 'STATE_EXPIRED' };
    if (!nonce) return { err: 'COOKIE_MISSING' };
    if (!safeEqual(sha256(nonce), d.nonceHash)) return { err: 'STATE_MISMATCH' };
    return { data: d };
  });
  if (res.err) throw new LinkError(res.err);
  return res.data;
}

/* Token alınmadan ÖNCE hızlı bir ön kontrol: başka bir sporcuya bağlı bir Polar
   kullanıcısını boşuna kaydetmeyelim. Asıl karar completeLink'teki transaction'da. */
async function precheck({ db, st, polarUserId }) {
  const us = await db.collection(COL.USERS).doc(String(polarUserId)).get();
  const u = us.exists ? (us.data() || {}) : null;
  if (u && u.linkId !== st.linkId) throw new LinkError('POLAR_USER_TAKEN');
  const ls = await db.collection(COL.LINKS).doc(st.linkId).get();
  const l = ls.exists ? (ls.data() || {}) : null;
  if (!l || l.ticketHash !== st.ticketHash) throw new LinkError('INVALID_TICKET');
  if (l.status === 'active') throw new LinkError('ALREADY_LINKED');
}

/* ── 4) Eşleşme: token + benzersizlik + durum, tek transaction ─────────────── */
async function completeLink({ db, st, token, memberId, tokenKey, now }) {
  const pid = String(token.polarUserId);
  const t = now();
  // Şifreleme transaction'dan önce: anahtar bozuksa hiçbir şey yazılmadan düşsün.
  const enc = encrypt(token.accessToken, tokenKey, pid);
  const linkRef = db.collection(COL.LINKS).doc(st.linkId);
  const userRef = db.collection(COL.USERS).doc(pid);
  const tokenRef = db.collection(COL.TOKENS).doc(pid);
  const res = await db.runTransaction(async tx => {
    const ls = await tx.get(linkRef);
    const us = await tx.get(userRef);
    const l = ls.exists ? (ls.data() || {}) : null;
    const u = us.exists ? (us.data() || {}) : null;
    if (!l || l.ticketHash !== st.ticketHash) return { err: 'INVALID_TICKET' };
    if (l.status === 'active') return { err: 'ALREADY_LINKED' };
    if (u && u.linkId !== st.linkId) return { err: 'POLAR_USER_TAKEN' };
    tx.set(tokenRef, {
      polarUserId: pid, linkId: st.linkId, coachUid: st.coachUid, enc,
      tokenType: token.tokenType || 'bearer',
      expiresAt: token.expiresIn ? t + token.expiresIn * 1000 : null,
      createdAt: t, updatedAt: t,
    });
    tx.set(userRef, {
      polarUserId: pid, linkId: st.linkId, coachUid: st.coachUid, teamId: st.teamId,
      athleteId: st.athleteId, memberId, linkedAt: t,
    });
    tx.set(linkRef, {
      status: 'active', polarUserId: pid, memberId, connectedAt: t,
      tokenExpiresAt: token.expiresIn ? t + token.expiresIn * 1000 : null,
      ticketHash: null, inviteExpiresAt: null, lastError: null, updatedAt: t,
    }, { merge: true });
    tx.delete(db.collection(COL.TICKETS).doc(st.ticketHash));
    return { ok: true };
  });
  if (res.err) throw new LinkError(res.err);
  return { linkId: st.linkId, polarUserId: pid };
}

/* Bir adımda hata olursa bağlantı satırına kısa bir not — koçun ekranı
   "davet bekliyor" demeye devam ederken son denemenin neden düştüğünü görsün.
   Davet geçerliliğini korur: sporcu aynı linkle yeniden deneyebilir. */
async function noteFailure({ db, linkId, code, now }) {
  if (!linkId) return;
  try {
    const ref = db.collection(COL.LINKS).doc(linkId);
    const s = await ref.get();
    if (!s.exists || (s.data() || {}).status === 'active') return;
    await ref.set({ lastError: { code: String(code || 'ERROR'), at: now() }, updatedAt: now() }, { merge: true });
  } catch (e) { /* not düşülemezse akış yine aynı sonucu gösteriyor */ }
}

/* ── Bağlantıyı kes / daveti iptal et ────────────────────────────────────────
   Aktif bağlantıda önce Polar'da kayıt silinir (token Polar tarafında da iptal olur),
   sonra token ve eşleşme kaydı silinir. Polar'a ulaşılamazsa HİÇBİR ŞEY silinmez:
   koç tekrar dener. Token çözülemiyorsa (anahtar değişmiş) yerel kayıt yine temizlenir;
   sporcu izni Polar Flow'dan da kaldırabilir. Toplanmış Polar verisine dokunulmaz. */
async function disconnect({ db, coachUid, athleteId, tokenKey, deregister, decrypt, now }) {
  const uid = cleanId(coachUid), aId = cleanId(athleteId);
  const id = linkIdOf(uid, aId);
  const linkRef = db.collection(COL.LINKS).doc(id);
  const ls = await linkRef.get();
  const l = ls.exists ? (ls.data() || {}) : null;
  if (!l || l.coachUid !== uid) throw new LinkError('NOT_FOUND');
  let remote = 'none';
  const pid = l.status === 'active' && l.polarUserId ? String(l.polarUserId) : null;
  if (pid) {
    const ts = await db.collection(COL.TOKENS).doc(pid).get();
    if (ts.exists) {
      let accessToken = null;
      try { accessToken = decrypt((ts.data() || {}).enc, tokenKey, pid); } catch (e) { remote = 'undecryptable'; }
      if (accessToken) {
        const r = await deregister({ accessToken, polarUserId: pid });   // ağ hatası yukarı çıkar
        remote = r.gone ? 'already_gone' : 'deregistered';
      }
    }
  }
  const t = now();
  await db.runTransaction(async tx => {
    let userDoc = null;
    if (pid) {
      const us = await tx.get(db.collection(COL.USERS).doc(pid));
      userDoc = us.exists ? (us.data() || {}) : null;
    }
    if (pid) tx.delete(db.collection(COL.TOKENS).doc(pid));
    if (pid && userDoc && userDoc.linkId === id) tx.delete(db.collection(COL.USERS).doc(pid));
    if (l.ticketHash) tx.delete(db.collection(COL.TICKETS).doc(l.ticketHash));
    tx.set(linkRef, {
      status: 'disconnected', disconnectedAt: t, lastPolarUserId: pid || l.lastPolarUserId || null,
      polarUserId: null, ticketHash: null, inviteExpiresAt: null, lastError: null, updatedAt: t,
    }, { merge: true });
  });
  return { linkId: id, remote, wasActive: !!pid };
}

const newMemberId = () => 'cos_' + randomToken(16);

module.exports = {
  LinkError, linkIdOf, createInvite, loadTicket, beginAuth, consumeState, precheck,
  completeLink, noteFailure, disconnect, newMemberId,
};
