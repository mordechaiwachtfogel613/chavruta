// ================================================================
// analytics.js – Vercel Serverless Function
// Tracks user logins and learning sessions, exposes data to admin
// ================================================================

import { kv } from '@vercel/kv';

const ADMIN = (process.env.ADMIN_EMAIL || 'a0583298194@gmail.com').trim().toLowerCase();

function isAdminAuthed(req) {
  const email  = (req.headers['x-admin-email'] || '').trim().toLowerCase();
  const secret = req.headers['x-admin-secret'];
  return !!(
    (email && ADMIN && email === ADMIN) ||
    (secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET)
  );
}

const EMPTY_STATS = () => ({
  totalTimeMs: 0,
  sessions: 0,
  lastSeen: null,
  firstSeen: null,
  topics: {},
  totalScore: 0,
  recentSessions: [],
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-email, x-admin-secret');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // ── POST: record an event ───────────────────────────────────────
  if (req.method === 'POST') {
    const { email, event, collectionKey, book, unit, durationMs, score } = req.body || {};
    if (!email || !event) return res.status(400).json({ error: 'missing fields' });

    const normalEmail = email.trim().toLowerCase();
    const key = `analytics:user:${normalEmail}`;
    const now = Date.now();

    let data = (await kv.get(key)) || EMPTY_STATS();
    if (!data.recentSessions) data.recentSessions = [];
    if (!data.topics) data.topics = {};

    if (event === 'login') {
      if (!data.firstSeen) data.firstSeen = now;
      data.lastSeen = now;

    } else if (event === 'session_end') {
      if (!data.firstSeen) data.firstSeen = now;
      data.lastSeen = now;
      data.sessions = (data.sessions || 0) + 1;
      if (durationMs > 0) data.totalTimeMs = (data.totalTimeMs || 0) + durationMs;
      if (score > 0)      data.totalScore  = (data.totalScore  || 0) + score;
      if (collectionKey)  data.topics[collectionKey] = (data.topics[collectionKey] || 0) + 1;

      // Keep last 50 sessions
      data.recentSessions.unshift({ collectionKey, book, unit, durationMs: durationMs || 0, score: score || 0, ts: now });
      if (data.recentSessions.length > 50) data.recentSessions.length = 50;
    }

    await kv.set(key, data);
    return res.json({ ok: true });
  }

  // ── GET: admin reads all analytics ──────────────────────────────
  if (req.method === 'GET') {
    if (!isAdminAuthed(req)) return res.status(403).end();

    const emails = (await kv.smembers('users:all')) || [];
    const [users, analyticsArr, historiesArr] = await Promise.all([
      Promise.all(emails.map(e => kv.get(`user:${e}`))),
      Promise.all(emails.map(e => kv.get(`analytics:user:${e}`))),
      Promise.all(emails.map(e => kv.get(`history:${e}`))),
    ]);

    const result = emails.map((email, i) => {
      const user    = users[i];
      if (!user) return null;

      const tracked = analyticsArr[i] || EMPTY_STATS();
      const history = historiesArr[i] || [];

      // Derive stats from history (ground truth for completed sessions)
      const histTopics = {};
      let histScore = 0;
      for (const r of history) {
        if (r.collection) histTopics[r.collection] = (histTopics[r.collection] || 0) + 1;
        if (r.score > 0)  histScore += r.score;
      }

      // Merge: prefer history count/score (complete picture), use tracked time + lastSeen
      const merged = {
        sessions:       Math.max(history.length, tracked.sessions || 0),
        totalScore:     Math.max(histScore, tracked.totalScore || 0),
        topics:         Object.keys(histTopics).length ? histTopics : (tracked.topics || {}),
        totalTimeMs:    tracked.totalTimeMs || 0,
        lastSeen:       tracked.lastSeen || (history[0]?.ts ?? user.ts ?? null),
        firstSeen:      tracked.firstSeen || user.ts || null,
        recentSessions: history.length ? history.slice(0, 10).map(r => ({
          collectionKey: r.collection,
          book:          r.book,
          unit:          r.unit,
          score:         r.score,
          durationMs:    tracked.recentSessions?.[0]?.durationMs || 0,
          ts:            r.ts,
        })) : (tracked.recentSessions || []),
      };

      return { user, analytics: merged };
    }).filter(Boolean);

    // Sort by last seen (most recent first)
    result.sort((a, b) => (b.analytics.lastSeen || 0) - (a.analytics.lastSeen || 0));
    return res.json(result);
  }

  res.status(405).end();
}
