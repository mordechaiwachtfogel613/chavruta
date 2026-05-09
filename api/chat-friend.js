// ================================================================
// חברותא – chat-friend API
// מירור של api/chat.js לסשן חברותא דו-משתתפי.
// שני תלמידים עונים על אותה שאלה; רבי בניהו מנקד כל אחד בנפרד.
// ================================================================

import { kv } from '@vercel/kv';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL  = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';

// ── Persona + rules for two-student chavruta ───────────────────
const FRIEND_SYSTEM_PROMPT = (hostName, guestName) =>
`אתה רבי בניהו לומד **בחברותא עם שני תלמידים**: ${hostName} ו-${guestName}.

שניהם ענו על אותה שאלה. תפקידך:
1. תן פידבק חם ומכבד **לכל תלמיד בנפרד** — אל תשווה ביניהם בתוך הפידבק עצמו.
2. נקד כל תשובה לפי הסולם: 5=נכון לגמרי | 2=חלקי/כיוון נכון | 0=שגוי.
3. החלט מי ענה טוב יותר: "host" / "guest" / "tie". כתוב הסבר קצר.
4. עבור לפסוק/יחידה הבאה (בסדר) ושאל שאלה חדשה.
5. אחרי 4-5 חילופי שאלות — כתוב ברכה חמה ב-feedback_host ו-feedback_guest ושים is_finished:true.

בקריאה הראשונה (host_answer ו-guest_answer ריקים): אל תתן פידבק — פתח ישירות עם הפסוק הראשון ושאלה.

כלל ברזל: החזר אך ורק JSON תקין — ללא טקסט לפניו, ללא \`\`\`json, ללא שום תוספות.

פורמט חובה (שמות שדות אלה בדיוק):
{
  "feedback_host":  "פידבק לתלמיד הראשון",
  "feedback_guest": "פידבק לתלמיד השני",
  "score_host":     5,
  "score_guest":    2,
  "winner":         "host",
  "winner_reason":  "הסבר קצר מדוע",
  "next_verse_num": 1,
  "next_verse":     "הטקסט המלא של היחידה הבאה",
  "next_question":  "שאלה אחת על היחידה",
  "explanation":    "",
  "is_finished":    false
}`;

// ── Helper: clamp score to allowed enum {0, 2, 5} ─────────────
function clampScore(v) {
  const n = Number(v) || 0;
  if (n >= 4) return 5;
  if (n >= 1) return 2;
  return 0;
}

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────
  const reqOrigin     = req.headers.origin || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  if (allowedOrigin && reqOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ── Validate input ─────────────────────────────────────────────
  const {
    messages,
    chapter_text,
    book_name,
    chapter_num,
    total_verses,
    collection_type,
    host_answer  = '',
    guest_answer = '',
    host_name    = 'המארח',
    guest_name   = 'האורח',
  } = req.body || {};

  if (!chapter_text) {
    res.status(400).json({ error: 'Missing required field: chapter_text' });
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' });
    return;
  }

  // ── Load model + custom friend prompt from KV ─────────────────
  let kvModel, kvFriendPrompt;
  try {
    [kvModel, kvFriendPrompt] = await Promise.all([
      kv.get('config:model'),
      kv.get('config:prompt:friend'),
    ]);
  } catch {
    kvModel = null;
    kvFriendPrompt = null;
  }

  // ── Build system prompt ────────────────────────────────────────
  const collectionKey = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'].includes(collection_type)
    ? collection_type : 'tanach';

  const chapterHeader =
    `הפרק הנוכחי: ${book_name || ''} | יחידה: ${chapter_num || 1} (${total_verses || '?'} יחידות)\n\n` +
    `──────────────────────────────\n` +
    `${chapter_text}\n` +
    `──────────────────────────────`;

  // Use admin-customized prompt if available (replace {HOST} and {GUEST} placeholders)
  const basePrompt = kvFriendPrompt
    ? kvFriendPrompt.replace(/\{HOST\}/g, host_name).replace(/\{GUEST\}/g, guest_name)
    : FRIEND_SYSTEM_PROMPT(host_name, guest_name);

  const systemPrompt = basePrompt + '\n\n' + chapterHeader;

  // ── Build messages array ───────────────────────────────────────
  // If both answers are present, append them as a user turn so the AI can compare.
  const chatMessages = Array.isArray(messages) ? [...messages] : [];

  if (host_answer || guest_answer) {
    const userTurn =
      `תשובת ${host_name}: ${host_answer || '(לא ענה)'}\n\n` +
      `תשובת ${guest_name}: ${guest_answer || '(לא ענה)'}`;
    chatMessages.push({ role: 'user', content: userTurn });
  }

  // First call — no prior messages, no answers — just trigger opening question.
  // We still need at least one user message for most models.
  if (chatMessages.length === 0) {
    chatMessages.push({ role: 'user', content: 'אנא פתח את השיעור — הצג את הפסוק הראשון ושאל שאלה.' });
  }

  // ── Call OpenRouter ────────────────────────────────────────────
  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.APP_URL || 'https://chavruta-iota.vercel.app',
        'X-Title':       'Chavruta - Jewish Learning App (Friend Mode)',
      },
      body: JSON.stringify({
        model:           kvModel || DEFAULT_MODEL,
        max_tokens:      1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatMessages,
        ],
      }),
      signal: AbortSignal.timeout(28000),
    });

    if (!orRes.ok) {
      const errBody = await orRes.text();
      throw new Error(`OpenRouter ${orRes.status}: ${errBody}`);
    }

    const orData = await orRes.json();
    const raw    = orData.choices?.[0]?.message?.content ?? '';

    // ── Parse JSON ────────────────────────────────────────────────
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('AI did not return valid JSON');
      parsed = JSON.parse(m[0]);
    }

    // ── Sanitize ──────────────────────────────────────────────────
    parsed.score_host     = clampScore(parsed.score_host);
    parsed.score_guest    = clampScore(parsed.score_guest);
    parsed.is_finished    = Boolean(parsed.is_finished);
    parsed.feedback_host  = String(parsed.feedback_host  || '');
    parsed.feedback_guest = String(parsed.feedback_guest || '');
    parsed.winner_reason  = String(parsed.winner_reason  || '');
    parsed.next_verse     = String(parsed.next_verse     || '');
    parsed.next_question  = String(parsed.next_question  || '');
    parsed.explanation    = String(parsed.explanation    || '');
    parsed.next_verse_num = Number(parsed.next_verse_num) || 1;

    // winner must be one of the allowed enum values
    if (!['host', 'guest', 'tie'].includes(parsed.winner)) {
      parsed.winner = 'tie';
    }

    res.status(200).json(parsed);

  } catch (err) {
    console.error('[chavruta/api/chat-friend] Error:', err);
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
