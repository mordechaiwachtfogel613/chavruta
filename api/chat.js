// ================================================================
// חברותא – Vercel Serverless Function
// Proxies requests to OpenRouter API (keeps API key server-side)
// Docs: https://openrouter.ai/docs
// ================================================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Change this to any model available on OpenRouter ────────────
// Examples:
//   anthropic/claude-opus-4          – Claude Opus 4 (strongest)
//   anthropic/claude-sonnet-4-5      – Claude Sonnet (faster/cheaper)
//   google/gemini-2.5-pro            – Google Gemini 2.5 Pro
//   openai/gpt-4o                    – OpenAI GPT-4o
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';

const SYSTEM_PROMPT = `אתה "חברותא" – מורה לתנ"ך דיגיטלי אינטראקטיבי.
תפקידך: ללוות לומד פסוק אחר פסוק דרך פרק בתנ"ך בדיאלוג עידודי ומעמיק.

חוקי הפעולה:
1. פידבק: תן משפט עידוד קצר על התשובה הקודמת (ריק בהודעה הראשונה).
2. ניקוד: הענק 5 (נכון לגמרי), 2 (חלקי/כיוון נכון), 0 (שגוי).
3. פסוק: הצג את הפסוק הבא לפי הסדר – אל תדלג.
4. שאלה: שאל שאלה אחת בלבד – מעמיקה, מעניינת, שמעוררת מחשבה.
5. הסבר: אם המשתמש ביקש הסבר ("לא הבנתי", "פרש", "הסבר"), מלא את שדה explanation בהסבר קצר ומדויק. לאחר ההסבר – עבור לפסוק הבא.
6. סיום: אחרי שתשאל על הפסוק האחרון בפרק ותקבל תשובה, כתוב ברכה חמה ב-feedback ושים is_finished=true. המספר next_verse_num יהיה מספר הפסוק האחרון.

כלל ברזל: החזר אך ורק JSON תקין – ללא טקסט לפניו, ללא \`\`\`json, ללא שום תוספות.

פורמט חובה (שמות שדות אלה בדיוק):
{
  "feedback":       "פידבק על התשובה האחרונה",
  "score":          0,
  "next_verse_num": 1,
  "next_verse":     "הטקסט המלא של הפסוק הבא",
  "next_question":  "שאלה אחת על הפסוק",
  "explanation":    "",
  "is_finished":    false
}`;

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ── Validate input ─────────────────────────────────────────────
  const { messages, chapter_text, book_name, chapter_num, total_verses } = req.body || {};

  if (!messages?.length || !chapter_text) {
    res.status(400).json({ error: 'Missing required fields: messages, chapter_text' });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' });
    return;
  }

  // ── Build system prompt with chapter context ───────────────────
  const systemWithChapter =
    `${SYSTEM_PROMPT}\n\n` +
    `הפרק הנוכחי: ${book_name} פרק ${chapter_num} (${total_verses} פסוקים)\n` +
    `──────────────────────────────\n` +
    `${chapter_text}\n` +
    `──────────────────────────────`;

  // ── Call OpenRouter ────────────────────────────────────────────
  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':   'application/json',
        'HTTP-Referer':   process.env.APP_URL || 'https://chavruta.vercel.app',
        'X-Title':        'חברותא – לימוד תנ"ך',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemWithChapter },
          ...messages,
        ],
      }),
    });

    if (!orRes.ok) {
      const errBody = await orRes.text();
      throw new Error(`OpenRouter ${orRes.status}: ${errBody}`);
    }

    const orData = await orRes.json();
    const raw    = orData.choices?.[0]?.message?.content ?? '';

    // ── Parse JSON (robust: strip any wrapping markdown) ──────────
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('AI did not return valid JSON');
      parsed = JSON.parse(m[0]);
    }

    // ── Sanitize fields ────────────────────────────────────────────
    parsed.score       = Number(parsed.score) || 0;
    parsed.is_finished = Boolean(parsed.is_finished);
    parsed.explanation = parsed.explanation || '';
    parsed.feedback    = parsed.feedback    || '';

    res.status(200).json(parsed);

  } catch (err) {
    console.error('[chavruta/api/chat] Error:', err);
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
