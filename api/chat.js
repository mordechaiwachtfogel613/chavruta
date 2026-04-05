// ================================================================
// חברותא – Vercel Serverless Function
// Proxies requests to OpenRouter API (keeps API key server-side)
// ================================================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';

// ── Default system prompt intros per collection ──────────────────
const RABBI_PERSONA = `אתה רבי בניהו — רב חכם, סבלני ואוהב תורה, שלומד יחד עם התלמיד בשמחה. דבר בחמימות ובעידוד, כאילו אתה יושב לימוד עם תלמיד יקר. `;

const DEFAULT_PROMPTS = {
  tanach: RABBI_PERSONA + `תלמד תנ"ך פסוק אחר פסוק, ותשאל שאלות על פשט, הקשר ספרותי, ומשמעות רוחנית.`,

  mishnah: RABBI_PERSONA + `תלמד משנה אחת בכל פעם, ותשאל שאלות על הדין, מחלוקת התנאים, טעם ההלכה ויישומה.`,

  shas: RABBI_PERSONA + `תלמד גמרא עמוד אחר עמוד, ותשאל שאלות על שקלא וטריא, פירוש המושגים, ומסקנת הסוגיה.`,

  rambam: RABBI_PERSONA + `תלמד רמב"ם הלכה אחת בכל פעם, ותשאל שאלות על ההלכה, מקורה, ויישומה המעשי.`,

  shulchan: RABBI_PERSONA + `תלמד שולחן ערוך סעיף אחד בכל פעם, ותשאל שאלות על ההלכה, מחלוקות הפוסקים, ומנהג.`,
};

const UNIVERSAL_RULES = `
חוקי הפעולה:
1. פידבק קצר על התשובה הקודמת (ריק בהודעה הראשונה).
2. ניקוד: 5=נכון לגמרי | 2=חלקי/כיוון נכון | 0=שגוי.
3. הצג את היחידה הבאה לפי הסדר – אל תדלג.
4. שאל שאלה אחת בלבד – מעמיקה ומעוררת מחשבה.
5. אם ביקשו הסבר – מלא שדה explanation בהסבר קצר ומדויק. לאחר ההסבר – עבור ליחידה הבאה.
6. כשסיימת את כל היחידות – כתוב ברכה חמה ב-feedback ושים is_finished=true.

כלל ברזל: החזר אך ורק JSON תקין – ללא טקסט לפניו, ללא \`\`\`json, ללא שום תוספות.

פורמט חובה (שמות שדות אלה בדיוק):
{
  "feedback":       "פידבק על התשובה האחרונה",
  "score":          0,
  "next_verse_num": 1,
  "next_verse":     "הטקסט המלא של היחידה הבאה",
  "next_question":  "שאלה אחת על היחידה",
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
  const {
    messages,
    chapter_text,
    book_name,
    chapter_num,
    total_verses,
    collection_type,
    custom_prompt,
    model,
  } = req.body || {};

  if (!messages?.length || !chapter_text) {
    res.status(400).json({ error: 'Missing required fields: messages, chapter_text' });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' });
    return;
  }

  // ── Build system prompt ────────────────────────────────────────
  const collectionKey  = collection_type || 'tanach';
  const introPrompt    = (custom_prompt && custom_prompt.trim())
    ? custom_prompt.trim()
    : (DEFAULT_PROMPTS[collectionKey] || DEFAULT_PROMPTS.tanach);

  const systemWithChapter =
    `${introPrompt}\n` +
    `${UNIVERSAL_RULES}\n\n` +
    `הפרק הנוכחי: ${book_name} | יחידה: ${chapter_num} (${total_verses} יחידות)\n` +
    `──────────────────────────────\n` +
    `${chapter_text}\n` +
    `──────────────────────────────`;

  // ── Call OpenRouter ────────────────────────────────────────────
  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.APP_URL || 'https://chavruta.vercel.app',
        'X-Title':       'Chavruta - Jewish Learning App',
      },
      body: JSON.stringify({
        model:      model || DEFAULT_MODEL,
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
