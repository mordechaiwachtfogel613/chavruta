// ================================================================
// חברותא – Anki-style spaced repetition API
//   GET  /api/anki?email=&tz=                      → counts + next card
//   POST /api/anki {action:'review',   id, rating}  → answer a card
//   POST /api/anki {action:'create',   cards:[...]} → save cards
//   POST /api/anki {action:'generate', scope, ...}  → AI-made cards
//   POST /api/anki {action:'delete',   id}
// Cards live in a KV hash per user: anki:cards:{email}  (field = card id)
// Scheduling math is in ./_anki-scheduler.js (port of Anki's own).
// ================================================================

import { kv } from '@vercel/kv';
import {
  CONFIG, answerCard, previewIntervals, newCard, dayNumber,
} from './_anki-scheduler.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL  = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';
const ADMIN = (process.env.ADMIN_EMAIL || 'a0583298194@gmail.com').trim().toLowerCase();

const MAX_CARDS_PER_USER = 5000;
const GENERATE_PER_HOUR  = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cardsKey = (e) => `anki:cards:${e}`;
const dailyKey = (e) => `anki:daily:${e}`;

// ── helpers ─────────────────────────────────────────────────────
function normEmail(raw) {
  const e = String(raw || '').trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

async function requireUser(email) {
  if (email === ADMIN) return true;
  const user = await kv.get(`user:${email}`);
  return !!(user && user.status === 'approved');
}

function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; }
  catch { return 'Asia/Jerusalem'; }
}

const clip = (s, n) => String(s ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n);

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function loadCards(email) {
  const h = (await kv.hgetall(cardsKey(email))) || {};
  return Object.values(h).map(c => (typeof c === 'string' ? JSON.parse(c) : c));
}

async function loadDaily(email, today) {
  const d = await kv.get(dailyKey(email));
  if (d && d.day === today) return d;
  return { day: today, done: 0, newDone: 0 };
}

// Queue order follows Anki: due learning cards, then reviews, then new cards,
// then learning cards that are due within the learn-ahead window.
function pickNext(cards, nowSecs, today, daily) {
  const learnDue = [], reviewDue = [], newCards = [], learnAhead = [];
  for (const c of cards) {
    if (c.type === 'learning' || c.type === 'relearning') {
      if (c.dueSecs <= nowSecs) learnDue.push(c);
      else if (c.dueSecs <= nowSecs + CONFIG.learnAheadSecs) learnAhead.push(c);
    } else if (c.type === 'review') {
      if (c.dueDay <= today) reviewDue.push(c);
    } else {
      newCards.push(c);
    }
  }
  const newLeft = Math.max(CONFIG.newPerDay - daily.newDone, 0);
  const byDue  = (a, b) => a.dueSecs - b.dueSecs;
  const byDay  = (a, b) => a.dueDay - b.dueDay || (a.id < b.id ? -1 : 1);
  const byMade = (a, b) => a.created - b.created || (a.id < b.id ? -1 : 1);
  learnDue.sort(byDue); reviewDue.sort(byDay); newCards.sort(byMade); learnAhead.sort(byDue);

  const counts = {
    new:      Math.min(newCards.length, newLeft),
    learning: learnDue.length + learnAhead.length,
    review:   reviewDue.length,
    total:    cards.length,
  };
  const next = learnDue[0] || reviewDue[0] || (newLeft ? newCards[0] : null) || learnAhead[0] || null;

  // nothing to show now, but a learning card will come due later today
  const later = cards.filter(c => (c.type === 'learning' || c.type === 'relearning') &&
                                  c.dueSecs > nowSecs + CONFIG.learnAheadSecs)
                     .sort(byDue)[0];
  return { counts, next, nextLearnInSecs: later ? later.dueSecs - nowSecs : null };
}

function publicCard(c, nowSecs, today) {
  return {
    id: c.id, front: c.front, back: c.back, src: c.src || null,
    type: c.type, leech: !!c.leech,
    preview: previewIntervals(c, nowSecs, today),
  };
}

async function snapshot(email, tz) {
  const now = Date.now(), nowSecs = Math.floor(now / 1000);
  const today = dayNumber(now, tz);
  const [cards, daily] = await Promise.all([loadCards(email), loadDaily(email, today)]);
  const { counts, next, nextLearnInSecs } = pickNext(cards, nowSecs, today, daily);
  const remaining = counts.new + counts.learning + counts.review;
  return {
    counts, nextLearnInSecs,
    done: daily.done,
    progress: daily.done + remaining ? daily.done / (daily.done + remaining) : 0,
    next: next ? publicCard(next, nowSecs, today) : null,
  };
}

// ── AI card generation ──────────────────────────────────────────
const GEN_SYSTEM = `אתה מומחה ללימוד תורה ולבניית כרטיסיות זיכרון (Anki) בעברית.
תקבל חומר שנלמד בחברותא (ציטוט מהמקור + קטעי שיחה) ותיצור ממנו כרטיסיות זיכרון איכותיות.

כללי כרטיסייה טובה:
- כרטיסייה אחת = עובדה / רעיון אחד בלבד (עקרון Minimum Information).
- צד קדמי: שאלה ממוקדת וברורה שאפשר לענות עליה בעל פה מתוך הזיכרון. אל תכלול בשאלה את התשובה.
- צד אחורי: תשובה קצרה ומדויקת (משפט אחד עד שניים).
- בסס אך ורק על מה שמופיע בחומר שנמסר. אל תמציא מקורות, שמות או דעות שלא הופיעו.
- אל תכתוב שאלות כלליות כמו "מה למדנו?".
- כתוב בעברית פשוטה וברורה.

החזר אך ורק JSON תקין, ללא טקסט נוסף וללא \`\`\`:
{"summary": "סיכום קצר של הנלמד (2-4 משפטים)", "cards": [{"front": "שאלה", "back": "תשובה"}]}`;

function scopeInstruction(scope) {
  if (scope === 'focus')   return 'צור כרטיסייה אחת בלבד: על הרעיון המרכזי של מה שנלמד ברגע זה (הקטע האחרון בשיחה).';
  if (scope === 'chapter') return 'צור 5 עד 10 כרטיסיות שמכסות את עיקרי הפרק כולו.';
  return 'צור 3 עד 8 כרטיסיות על החומר שנלמד עד כה בשיחה.';
}

function buildGenPrompt({ scope, context }) {
  const c = context || {};
  const verses = (Array.isArray(c.verses) ? c.verses : []).slice(0, 80)
    .map(v => `${clip(v.num, 8)}. ${clip(v.text, 700)}`).join('\n');
  const transcript = (Array.isArray(c.transcript) ? c.transcript : []).slice(-30)
    .map(m => `${m.role === 'user' ? 'תלמיד' : 'חברותא'}: ${clip(m.text, 700)}`).join('\n');
  return `${scopeInstruction(scope)}\n\n` +
    `מקור: ${clip(c.book, 80)} ${clip(c.unit, 80)}\n\n` +
    `טקסט המקור שנלמד:\n${verses.slice(0, 9000) || '(לא נמסר)'}\n\n` +
    `קטעי השיחה:\n${transcript.slice(0, 9000) || '(לא נמסרו)'}`;
}

function parseJson(raw) {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI did not return valid JSON');
  return JSON.parse(m[0]);
}

async function generateCards(body) {
  const [kvModel, kvApiKey] = await Promise.all([kv.get('config:model'), kv.get('config:openrouter:key')]);
  const apiKey = (kvApiKey && String(kvApiKey).trim()) ? String(kvApiKey).trim() : process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key is not configured');

  const orRes = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  process.env.APP_URL || 'https://chavruta.vercel.app',
      'X-Title':       'Chavruta - Jewish Learning App',
    },
    body: JSON.stringify({
      model:           kvModel || DEFAULT_MODEL,
      max_tokens:      1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: GEN_SYSTEM },
        { role: 'user',   content: buildGenPrompt(body) },
      ],
    }),
  });
  if (!orRes.ok) throw new Error(`OpenRouter ${orRes.status}: ${await orRes.text()}`);
  const data = await orRes.json();
  const parsed = parseJson(data.choices?.[0]?.message?.content ?? '');
  const cards = (Array.isArray(parsed.cards) ? parsed.cards : [])
    .map(c => ({ front: clip(c.front, 400), back: clip(c.back, 800) }))
    .filter(c => c.front && c.back)
    .slice(0, body.scope === 'focus' ? 1 : 12);
  return { summary: clip(parsed.summary, 800), cards };
}

const normFront = (s) => s.replace(/[\s֑-ׇ"'׳״.,:;?!־-]+/g, '');

async function saveCards(email, incoming, src) {
  const existing = await loadCards(email);
  if (existing.length >= MAX_CARDS_PER_USER) return { added: [], skipped: incoming.length, full: true };
  const seen = new Set(existing.map(c => normFront(c.front)));
  const nowSecs = Math.floor(Date.now() / 1000);
  const added = [];
  const fields = {};
  for (const c of incoming) {
    const front = clip(c.front, 400), back = clip(c.back, 800);
    if (!front || !back || seen.has(normFront(front))) continue;
    if (existing.length + added.length >= MAX_CARDS_PER_USER) break;
    seen.add(normFront(front));
    const card = newCard(newId(), front, back, src || null, nowSecs);
    fields[card.id] = JSON.stringify(card);
    added.push(card);
  }
  if (added.length) await kv.hset(cardsKey(email), fields);
  return { added, skipped: incoming.length - added.length };
}

function cleanSrc(s) {
  if (!s || typeof s !== 'object') return null;
  return { collection: clip(s.collection, 20), book: clip(s.book, 80), unit: clip(s.unit, 80) };
}

// ── handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const q    = req.query || {};
    const body = req.body || {};
    const email = normEmail(req.method === 'GET' ? q.email : body.email);
    if (!email) return res.status(400).json({ error: 'invalid email' });
    if (!(await requireUser(email))) return res.status(403).json({ error: 'not approved' });
    const tz = validTz((req.method === 'GET' ? q.tz : body.tz) || 'Asia/Jerusalem');

    if (req.method === 'GET') {
      return res.json(await snapshot(email, tz));
    }
    if (req.method !== 'POST') return res.status(405).end();

    switch (body.action) {
      case 'review': {
        const rating = Number(body.rating);
        if (![1, 2, 3, 4].includes(rating)) return res.status(400).json({ error: 'bad rating' });
        const raw = await kv.hget(cardsKey(email), String(body.id));
        if (!raw) return res.status(404).json({ error: 'card not found' });
        const card = typeof raw === 'string' ? JSON.parse(raw) : raw;

        const now = Date.now(), nowSecs = Math.floor(now / 1000);
        const today = dayNumber(now, tz);
        const updated = answerCard(card, rating, nowSecs, today);
        await kv.hset(cardsKey(email), { [card.id]: JSON.stringify(updated) });

        const daily = await loadDaily(email, today);
        if (card.type === 'new') daily.newDone += 1;
        if (updated.type === 'review') daily.done += 1;   // card is finished for today
        await kv.set(dailyKey(email), daily, { ex: 3 * 86400 });
        return res.json(await snapshot(email, tz));
      }

      case 'create': {
        const incoming = (Array.isArray(body.cards) ? body.cards : []).slice(0, 20);
        const out = await saveCards(email, incoming, cleanSrc(body.src));
        return res.json({ added: out.added.length, skipped: out.skipped, full: !!out.full });
      }

      case 'generate': {
        const scope = ['focus', 'chapter', 'session'].includes(body.scope) ? body.scope : 'session';
        const rlKey = `anki:gen:${email}`;
        const used = await kv.incr(rlKey);
        if (used === 1) await kv.expire(rlKey, 3600);
        if (used > GENERATE_PER_HOUR) return res.status(429).json({ error: 'rate limit' });

        const gen = await generateCards({ scope, context: body.context });
        if (!gen.cards.length) return res.status(502).json({ error: 'no cards generated' });
        const src = cleanSrc({ collection: body.context?.collection, book: body.context?.book, unit: body.context?.unit });
        const out = await saveCards(email, gen.cards, src);
        return res.json({ summary: gen.summary, added: out.added.length, skipped: out.skipped,
                          cards: out.added.map(c => ({ front: c.front, back: c.back })) });
      }

      case 'delete': {
        await kv.hdel(cardsKey(email), String(body.id));
        return res.json(await snapshot(email, tz));
      }

      default:
        return res.status(400).json({ error: 'unknown action' });
    }
  } catch (err) {
    console.error('[chavruta/api/anki] Error:', err);
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
