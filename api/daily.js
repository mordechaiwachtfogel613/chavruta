// ================================================================
// חברותא – "הלימוד היומי שלי" API
//   GET  /api/daily?email=&tz=                       → state (track, today, streak…)
//   POST /api/daily {action:'setTrack', collectionKey, bookKey, unit}
//   POST /api/daily {action:'done', collectionKey, bookKey, unit}
//   POST /api/daily {action:'skip'}
// KV: daily:cfg:{email} (JSON)   daily:log:{email} (hash: YYYY-MM-DD → JSON)
// Pure logic lives in ./_daily-logic.js
// ================================================================

import { kv } from '@vercel/kv';
import {
  validTz, dayKey, validateTrack, newCfg, advance, applyDone, computeStreak, trimLog,
} from './_daily-logic.js';

const ADMIN = (process.env.ADMIN_EMAIL || 'a0583298194@gmail.com').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cfgKey = (e) => `daily:cfg:${e}`;
const logKey = (e) => `daily:log:${e}`;

function normEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

async function requireUser(email) {
  if (email === ADMIN) return true;
  const user = await kv.get(`user:${email}`);
  return !!(user && user.status === 'approved');
}

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

async function snapshot(email, today) {
  const [cfgRaw, logRaw] = await Promise.all([kv.get(cfgKey(email)), kv.hgetall(logKey(email))]);
  const cfg = cfgRaw ? parse(cfgRaw) : null;
  const { streak, totalDays, doneToday } = computeStreak(Object.keys(logRaw || {}), today);
  return {
    track: cfg ? {
      collectionKey: cfg.collectionKey, bookKey: cfg.bookKey, pointer: cfg.pointer, mode: cfg.mode,
    } : null,
    finished: !!(cfg && cfg.finished),
    today, doneToday, streak, totalDays,
  };
}

async function writeLog(email, today, entry) {
  await kv.hset(logKey(email), { [today]: JSON.stringify(entry) });
  const all = (await kv.hgetall(logKey(email))) || {};
  for (const f of trimLog(Object.keys(all))) await kv.hdel(logKey(email), f);
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const body = req.body || {};
    const email = normEmail(req.method === 'GET' ? q.email : body.email);
    if (!email) return res.status(400).json({ error: 'invalid email' });
    if (!(await requireUser(email))) return res.status(403).json({ error: 'not approved' });
    const tz = validTz((req.method === 'GET' ? q.tz : body.tz) || 'Asia/Jerusalem');
    const now = Date.now();
    const today = dayKey(now, tz);

    if (req.method === 'GET') return res.json(await snapshot(email, today));
    if (req.method !== 'POST') return res.status(405).end();

    const raw = await kv.get(cfgKey(email));
    const cfg = raw ? parse(raw) : null;

    switch (body.action) {
      case 'setTrack': {
        const v = validateTrack(body);
        if (v.error) return res.status(400).json({ error: v.error });
        await kv.set(cfgKey(email), newCfg(v.track, tz, now, cfg));
        return res.json({ ...(await snapshot(email, today)), counted: false });
      }

      case 'done': {
        if (!cfg) return res.status(400).json({ error: 'no track' });
        const v = validateTrack(body);
        if (v.error) return res.status(400).json({ error: v.error });
        const out = applyDone(cfg, v.track, v.track.unit);
        if (out.counted) {
          await kv.set(cfgKey(email), { ...out.cfg, tz });
          await writeLog(email, today, { ...v.track, ts: now });
        }
        return res.json({ ...(await snapshot(email, today)), counted: out.counted });
      }

      case 'skip': {
        if (!cfg) return res.status(400).json({ error: 'no track' });
        if (!cfg.finished) await kv.set(cfgKey(email), { ...advance(cfg), tz });
        return res.json({ ...(await snapshot(email, today)), counted: false });
      }

      default:
        return res.status(400).json({ error: 'unknown action' });
    }
  } catch (e) {
    console.error('daily error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
