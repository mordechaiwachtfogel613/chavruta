// ================================================================
// חברותא – room.js
// ניהול חדרי חברותא: create / join / get / start / answer / next / end
// כל המפתחות ב-KV תחת namespace friend:* בלבד.
// ================================================================

import { kv } from '@vercel/kv';

const ROOM_TTL   = 21600; // 6 שעות
const LOCK_TTL   = 35;    // שניות — גדול מ-timeout ה-AI (30s)

// ── CORS helper (זהה לדפוס של chat.js) ───────────────────────
function setCors(req, res) {
  const reqOrigin     = req.headers.origin || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  if (allowedOrigin && reqOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

// ── אימות משתמש מאושר (read-only על מפתח קיים) ────────────────
async function isApproved(email) {
  if (!email) return false;
  try {
    const user = await kv.get(`user:${email.trim().toLowerCase()}`);
    return user?.status === 'approved';
  } catch {
    return false;
  }
}

// ── שמירת היסטוריית חברותא (מבודדת ממערכת ההיסטוריה הקיימת) ──
async function appendFriendHistory(email, record) {
  if (!email) return;
  const key = `friend:history:${email.trim().toLowerCase()}`;
  try {
    const existing = (await kv.get(key)) || [];
    const updated  = [record, ...existing].slice(0, 100);
    await kv.set(key, updated);
  } catch (e) {
    console.error('[room] appendFriendHistory error:', e);
  }
}

// ── קריאה ל-chat-friend server-to-server ─────────────────────
async function callChatFriend(payload, req) {
  const base = process.env.APP_URL || `https://${req.headers.host}`;
  const url  = `${base}/api/chat-friend`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(28000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`chat-friend ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const action = req.query.action || '';

  // ── GET: polling ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { id, since } = req.query;
    if (!id) return res.status(400).json({ error: 'missing id' });

    const room = await kv.get(`friend:room:${id}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    const sinceVer = Number(since) || 0;
    if (room.version <= sinceVer) {
      return res.json({ unchanged: true, version: room.version });
    }
    return res.json({ unchanged: false, room });
  }

  // ── POST actions ──────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // בדיקת Content-Type לכל POST
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  // ── action=create ─────────────────────────────────────────────
  if (action === 'create') {
    const { email, name, collection, book, chapterNum, verses } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: 'missing email or name' });

    const normalEmail = email.trim().toLowerCase();
    if (!(await isApproved(normalEmail))) {
      return res.status(403).json({ error: 'user_not_approved' });
    }

    const roomId = crypto.randomUUID().slice(0, 8);
    const now    = Date.now();

    const room = {
      id:              roomId,
      version:         1,
      phase:           'waiting_for_guest',
      host:  { email: normalEmail, name: String(name).slice(0, 60), score: 0, joinedAt: now },
      guest: null,
      collection:      collection || 'tanach',
      book:            book || {},
      unit:            Number(chapterNum) || 1,
      verses:          Array.isArray(verses) ? verses : [],
      currentVerseNum: 0,
      currentVerse:    '',
      currentQuestion: '',
      messages:        [],
      pendingAnswers:  { host: null, guest: null },
      evaluating:      false,
      isFinished:      false,
      createdAt:       now,
      updatedAt:       now,
    };

    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

    const base     = process.env.APP_URL || `https://${req.headers.host}`;
    const shareUrl = `${base}/chavruta.html?room=${roomId}`;

    return res.json({ roomId, shareUrl });
  }

  // ── action=join ───────────────────────────────────────────────
  if (action === 'join') {
    const { roomId, email, name } = req.body || {};
    if (!roomId || !email || !name) return res.status(400).json({ error: 'missing fields' });

    const normalEmail = email.trim().toLowerCase();
    if (!(await isApproved(normalEmail))) {
      return res.status(403).json({ error: 'user_not_approved' });
    }

    const room = await kv.get(`friend:room:${roomId}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    if (room.phase !== 'waiting_for_guest') {
      return res.status(409).json({ error: 'room_not_open' });
    }
    if (room.host.email === normalEmail) {
      return res.status(409).json({ error: 'already_host' });
    }

    room.guest = { email: normalEmail, name: String(name).slice(0, 60), score: 0, joinedAt: Date.now() };
    room.phase    = 'ready';
    room.version  = (room.version || 0) + 1;
    room.updatedAt = Date.now();

    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });
    return res.json({ ok: true, room });
  }

  // ── action=start ──────────────────────────────────────────────
  if (action === 'start') {
    const { roomId, email } = req.body || {};
    if (!roomId || !email) return res.status(400).json({ error: 'missing fields' });

    const room = await kv.get(`friend:room:${roomId}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    if (room.host.email !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: 'only_host_can_start' });
    }
    if (room.phase !== 'ready') {
      return res.status(409).json({ error: 'room_not_ready', phase: room.phase });
    }

    room.phase    = 'fetching_verse';
    room.version  = (room.version || 0) + 1;
    room.updatedAt = Date.now();
    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

    // שליחה ל-chat-friend לקבלת פסוק ראשון ושאלה
    let aiResp;
    try {
      aiResp = await callChatFriend({
        messages:        [],
        chapter_text:    room.verses.join('\n'),
        book_name:       room.book?.he || room.book?.sf || '',
        chapter_num:     room.unit,
        total_verses:    room.verses.length,
        collection_type: room.collection,
        host_answer:     '',
        guest_answer:    '',
        host_name:       room.host.name,
        guest_name:      room.guest?.name || 'האורח',
      }, req);
    } catch (e) {
      // אם ה-AI נכשל — החזר phase ל-ready
      room.phase    = 'ready';
      room.version  = (room.version || 0) + 1;
      room.updatedAt = Date.now();
      await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });
      console.error('[room/start] chat-friend error:', e);
      return res.status(502).json({ error: 'ai_error', detail: e.message });
    }

    room.currentVerseNum = aiResp.next_verse_num || 1;
    room.currentVerse    = aiResp.next_verse    || '';
    room.currentQuestion = aiResp.next_question || '';
    room.phase           = 'asking';
    room.version         = (room.version || 0) + 1;
    room.updatedAt       = Date.now();
    room.messages.push({
      role:     'assistant',
      type:     'question',
      verse:    room.currentVerse,
      question: room.currentQuestion,
      verseNum: room.currentVerseNum,
      ts:       Date.now(),
    });

    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });
    return res.json({ ok: true, version: room.version });
  }

  // ── action=answer ─────────────────────────────────────────────
  if (action === 'answer') {
    const { roomId, email, answer } = req.body || {};
    if (!roomId || !email || answer == null) return res.status(400).json({ error: 'missing fields' });

    const normalEmail = email.trim().toLowerCase();
    const room = await kv.get(`friend:room:${roomId}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    if (room.phase !== 'asking') {
      return res.status(409).json({ error: 'not_in_asking_phase', phase: room.phase });
    }

    // זיהוי תפקיד
    const role = room.host.email === normalEmail ? 'host'
               : room.guest?.email === normalEmail ? 'guest'
               : null;
    if (!role) return res.status(403).json({ error: 'not_a_participant' });

    // שמירת תשובה
    room.pendingAnswers[role] = String(answer).slice(0, 2000);
    room.version  = (room.version || 0) + 1;
    room.updatedAt = Date.now();

    // הוספת הודעת תשובה ל-messages
    room.messages.push({
      role,
      type: 'answer',
      text: room.pendingAnswers[role],
      ts:   Date.now(),
    });

    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

    // בדיקה אם שתי התשובות קיימות ואין הערכה פעילה
    if (room.pendingAnswers.host && room.pendingAnswers.guest && !room.evaluating) {
      // ניסיון נעילה אטומית — רק צד אחד יבצע הערכה
      const lockKey  = `friend:lock:${roomId}`;
      const lockWon  = await kv.set(lockKey, '1', { nx: true, ex: LOCK_TTL });

      if (!lockWon) {
        // הצד השני ינצח את הנעילה ויקרא ל-AI
        return res.status(202).json({ ok: true, version: room.version, waiting: true });
      }

      // ── הצד הזה קיבל את הנעילה — מבצע הערכה ──
      // עדכון מצב לפני קריאת AI
      room.evaluating = true;
      room.phase      = 'evaluating';
      room.version    = (room.version || 0) + 1;
      room.updatedAt  = Date.now();
      await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

      // בדיקה שלא כבר עברנו לתוצאה (edge case: שני הצדדים)
      const freshRoom = await kv.get(`friend:room:${roomId}`);
      const lastMsg   = freshRoom?.messages?.[freshRoom.messages.length - 1];
      if (lastMsg?.type === 'verdict') {
        // כבר הוערך — בטל
        await kv.del(lockKey);
        return res.json({ ok: true, version: freshRoom.version });
      }

      let aiResp;
      try {
        // בניית היסטוריית messages לשליחה ל-AI (ללא הודעות answer/verdict גולמיות — רק question/verdict)
        const aiMessages = (room.messages || [])
          .filter(m => m.type === 'question' || m.type === 'verdict')
          .map(m => {
            if (m.type === 'question') {
              return { role: 'assistant', content: JSON.stringify({ next_verse: m.verse, next_question: m.question }) };
            }
            // verdict — נמיר לתשובת assistant
            return {
              role: 'assistant',
              content: JSON.stringify({
                feedback_host:  m.fbHost || '',
                feedback_guest: m.fbGuest || '',
                score_host:     m.scoreHost || 0,
                score_guest:    m.scoreGuest || 0,
                winner:         m.winner || 'tie',
                winner_reason:  m.winnerReason || '',
              }),
            };
          });

        aiResp = await callChatFriend({
          messages:        aiMessages,
          chapter_text:    room.verses.join('\n'),
          book_name:       room.book?.he || room.book?.sf || '',
          chapter_num:     room.unit,
          total_verses:    room.verses.length,
          collection_type: room.collection,
          host_answer:     room.pendingAnswers.host  || '',
          guest_answer:    room.pendingAnswers.guest || '',
          host_name:       room.host.name,
          guest_name:      room.guest?.name || 'האורח',
        }, req);
      } catch (e) {
        // AI נכשל — שחרר נעילה, החזר phase ל-asking
        try {
          const r2 = await kv.get(`friend:room:${roomId}`);
          if (r2) {
            r2.evaluating = false;
            r2.phase      = 'asking';
            r2.version    = (r2.version || 0) + 1;
            r2.updatedAt  = Date.now();
            await kv.set(`friend:room:${roomId}`, r2, { ex: ROOM_TTL });
          }
        } catch {}
        await kv.del(lockKey);
        console.error('[room/answer] chat-friend error:', e);
        return res.status(502).json({ error: 'ai_error', detail: e.message });
      }

      // ── עדכון חדר עם תוצאות ──
      const r3 = await kv.get(`friend:room:${roomId}`);
      if (!r3) { await kv.del(lockKey); return res.status(404).json({ error: 'room_vanished' }); }

      r3.host.score   = (r3.host.score  || 0) + (aiResp.score_host  || 0);
      r3.guest.score  = (r3.guest.score || 0) + (aiResp.score_guest || 0);

      r3.messages.push({
        role:        'assistant',
        type:        'verdict',
        fbHost:      aiResp.feedback_host  || '',
        fbGuest:     aiResp.feedback_guest || '',
        scoreHost:   aiResp.score_host     || 0,
        scoreGuest:  aiResp.score_guest    || 0,
        winner:      aiResp.winner         || 'tie',
        winnerReason: aiResp.winner_reason  || '',
        ts:          Date.now(),
      });

      r3.pendingAnswers  = { host: null, guest: null };
      r3.evaluating      = false;
      r3.currentVerseNum = aiResp.next_verse_num || r3.currentVerseNum;
      r3.currentVerse    = aiResp.next_verse     || r3.currentVerse;
      r3.currentQuestion = aiResp.next_question  || r3.currentQuestion;
      r3.isFinished      = Boolean(aiResp.is_finished);
      r3.phase           = r3.isFinished ? 'finished' : 'showing_feedback';
      r3.version         = (r3.version || 0) + 1;
      r3.updatedAt       = Date.now();

      await kv.set(`friend:room:${roomId}`, r3, { ex: ROOM_TTL });

      // שחרור נעילה
      await kv.del(lockKey);

      // שמירת היסטוריה אם השיעור הסתיים
      if (r3.isFinished) {
        const histRecord = {
          roomId,
          date:       Date.now(),
          collection: r3.collection,
          book:       r3.book,
          unit:       r3.unit,
          hostEmail:  r3.host.email,
          hostName:   r3.host.name,
          hostScore:  r3.host.score,
          guestEmail: r3.guest?.email || '',
          guestName:  r3.guest?.name  || '',
          guestScore: r3.guest?.score || 0,
          winner: r3.host.score > (r3.guest?.score || 0) ? 'host'
                : (r3.guest?.score || 0) > r3.host.score ? 'guest'
                : 'tie',
        };
        await Promise.all([
          appendFriendHistory(r3.host.email, histRecord),
          appendFriendHistory(r3.guest?.email, histRecord),
        ]);
      }

      return res.json({ ok: true, version: r3.version });
    }

    return res.json({ ok: true, version: room.version });
  }

  // ── action=next ───────────────────────────────────────────────
  if (action === 'next') {
    const { roomId, email } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'missing roomId' });

    const room = await kv.get(`friend:room:${roomId}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    if (room.phase !== 'showing_feedback') {
      return res.status(409).json({ error: 'not_in_feedback_phase', phase: room.phase });
    }

    // הוסף שאלה חדשה מהנתונים שכבר חושבו ב-answer
    if (room.currentVerse && room.currentQuestion) {
      room.messages.push({
        role:     'assistant',
        type:     'question',
        verse:    room.currentVerse,
        question: room.currentQuestion,
        verseNum: room.currentVerseNum,
        ts:       Date.now(),
      });
    }

    room.phase     = 'asking';
    room.version   = (room.version || 0) + 1;
    room.updatedAt = Date.now();
    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

    return res.json({ ok: true, version: room.version });
  }

  // ── action=end ────────────────────────────────────────────────
  if (action === 'end') {
    const { roomId, email } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'missing roomId' });

    const room = await kv.get(`friend:room:${roomId}`);
    if (!room) return res.status(404).json({ error: 'room_not_found' });

    if (room.isFinished) {
      return res.json({ ok: true, version: room.version });
    }

    room.isFinished = true;
    room.phase      = 'finished';
    room.version    = (room.version || 0) + 1;
    room.updatedAt  = Date.now();
    await kv.set(`friend:room:${roomId}`, room, { ex: ROOM_TTL });

    // שמירת היסטוריה
    if (room.host?.email || room.guest?.email) {
      const histRecord = {
        roomId,
        date:       Date.now(),
        collection: room.collection,
        book:       room.book,
        unit:       room.unit,
        hostEmail:  room.host?.email  || '',
        hostName:   room.host?.name   || '',
        hostScore:  room.host?.score  || 0,
        guestEmail: room.guest?.email || '',
        guestName:  room.guest?.name  || '',
        guestScore: room.guest?.score || 0,
        winner: (room.host?.score || 0) > (room.guest?.score || 0) ? 'host'
              : (room.guest?.score || 0) > (room.host?.score || 0) ? 'guest'
              : 'tie',
        earlyEnd: true,
      };
      await Promise.all([
        appendFriendHistory(room.host?.email,  histRecord),
        appendFriendHistory(room.guest?.email, histRecord),
      ]);
    }

    return res.json({ ok: true, version: room.version });
  }

  return res.status(400).json({ error: 'unknown action', action });
}
