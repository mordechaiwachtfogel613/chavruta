// ================================================================
// חברותא – signal.js
// WebRTC signaling relay דרך Vercel KV.
// POST: דחיפת offer/answer/ICE/bye לצד השני.
// GET:  קריאת messages מהתור שלך (since-based, לא מוחק).
// ================================================================

import { kv } from '@vercel/kv';

const SIGNAL_TTL = 21600; // 6 שעות
const CAP        = 50;    // מקסימום הודעות בתור

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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // ── GET: קריאת תור signals ────────────────────────────────────
  if (req.method === 'GET') {
    const { roomId, for: forRole, since } = req.query;
    if (!roomId || !forRole) {
      return res.status(400).json({ error: 'missing roomId or for' });
    }
    if (!['host', 'guest'].includes(forRole)) {
      return res.status(400).json({ error: 'for must be host or guest' });
    }

    const key      = `friend:signal:${roomId}:${forRole}`;
    const sinceIdx = Number(since) || 0;

    let queue;
    try {
      queue = (await kv.get(key)) || [];
    } catch {
      queue = [];
    }

    const slice     = queue.slice(sinceIdx);
    const nextSince = sinceIdx + slice.length;

    return res.json({ messages: slice, nextSince });
  }

  // ── POST: שליחת signal ────────────────────────────────────────
  if (req.method === 'POST') {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }

    const { roomId, from, payload } = req.body || {};
    if (!roomId || !from || !payload) {
      return res.status(400).json({ error: 'missing roomId, from, or payload' });
    }
    if (!['host', 'guest'].includes(from)) {
      return res.status(400).json({ error: 'from must be host or guest' });
    }

    // הצד המקבל הוא ההפוך מהשולח
    const other = from === 'host' ? 'guest' : 'host';
    const key   = `friend:signal:${roomId}:${other}`;

    try {
      const existing = (await kv.get(key)) || [];
      const updated  = [...existing, { ...payload, _from: from, _ts: Date.now() }].slice(-CAP);
      await kv.set(key, updated, { ex: SIGNAL_TTL });
    } catch (e) {
      console.error('[signal] KV error:', e);
      return res.status(500).json({ error: 'kv_error' });
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
