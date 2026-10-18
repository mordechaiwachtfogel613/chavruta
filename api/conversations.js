// ================================================================
// חברותא – saved study conversations (the chat history list)
//   GET    /api/conversations?email=            → list (newest first)
//   GET    /api/conversations?email=&id=        → one full conversation
//   POST   /api/conversations {email, conv}     → create / update
//   DELETE /api/conversations?email=&id=
// KV: conv:idx:{email}   → meta list
//     conv:{email}:{id}  → full conversation
// ================================================================

import { kv } from '@vercel/kv';

const MAX_CONVERSATIONS = 200;
const MAX_MESSAGES      = 160;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE    = /^[a-z0-9]{6,32}$/;

const clip = (s, n) => String(s ?? '').slice(0, n);

function sanitize(conv) {
  if (!conv || !ID_RE.test(String(conv.id || ''))) return null;
  const messages = (Array.isArray(conv.messages) ? conv.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(0, MAX_MESSAGES)
    .map(m => ({ role: m.role, content: clip(m.content, 8000) }));
  if (!messages.length) return null;
  return {
    id:          conv.id,
    title:       clip(conv.title, 120),
    collection:  clip(conv.collection, 20),
    bookHe:      clip(conv.bookHe, 80),
    unit:        clip(conv.unit, 20),
    unitLabel:   clip(conv.unitLabel, 60),
    studyMode:   ['iyun', 'bekiut'].includes(conv.studyMode) ? conv.studyMode : null,
    studyVerseIdx: Number.isInteger(conv.studyVerseIdx) ? conv.studyVerseIdx : null,
    commentaryText: clip(conv.commentaryText, 6000),
    style:       ['general', 'particular', 'free', 'deep'].includes(conv.style) ? conv.style : 'particular',
    unitsPerStep: [1, 2, 3, 5].includes(Number(conv.unitsPerStep)) ? Number(conv.unitsPerStep) : 1,
    sessionScore: Number(conv.sessionScore) || 0,
    finished:    !!conv.finished,
    messages,
  };
}

const metaOf = (c, ts) => ({
  id: c.id, title: c.title, collection: c.collection, bookHe: c.bookHe, unitLabel: c.unitLabel,
  finished: c.finished, ts,
});

export default async function handler(req, res) {
  try {
    const src   = req.method === 'GET' || req.method === 'DELETE' ? (req.query || {}) : (req.body || {});
    const email = String(src.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email' });
    const idxKey = `conv:idx:${email}`;

    if (req.method === 'GET') {
      if (src.id) {
        if (!ID_RE.test(String(src.id))) return res.status(400).json({ error: 'bad id' });
        const conv = await kv.get(`conv:${email}:${src.id}`);
        return conv ? res.json(conv) : res.status(404).json({ error: 'not found' });
      }
      return res.json((await kv.get(idxKey)) || []);
    }

    if (req.method === 'POST') {
      const conv = sanitize(req.body?.conv);
      if (!conv) return res.status(400).json({ error: 'invalid conversation' });
      const ts  = Date.now();
      const idx = ((await kv.get(idxKey)) || []).filter(m => m.id !== conv.id);
      idx.unshift(metaOf(conv, ts));
      const kept = idx.slice(0, MAX_CONVERSATIONS);
      await kv.set(`conv:${email}:${conv.id}`, { ...conv, ts });
      await kv.set(idxKey, kept);
      // drop conversations that fell off the end of the index
      await Promise.all(idx.slice(MAX_CONVERSATIONS).map(m => kv.del(`conv:${email}:${m.id}`)));
      return res.json({ ok: true, ts });
    }

    if (req.method === 'DELETE') {
      if (!ID_RE.test(String(src.id || ''))) return res.status(400).json({ error: 'bad id' });
      const idx = ((await kv.get(idxKey)) || []).filter(m => m.id !== src.id);
      await kv.set(idxKey, idx);
      await kv.del(`conv:${email}:${src.id}`);
      return res.json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[chavruta/api/conversations] Error:', err);
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
