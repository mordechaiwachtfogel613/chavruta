// ================================================================
// חברותא – Vercel Serverless Function
// Proxies requests to OpenRouter API (keeps API key server-side)
// ================================================================

import { kv } from '@vercel/kv';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';

// ── Default system prompt intros per collection ──────────────────
const RABBI_PERSONA = `אתה רבי בניהו — רב חכם, סבלני ואוהב תורה, שלומד יחד עם התלמיד בשמחה. דבר בחמימות ובעידוד, כאילו אתה יושב לימוד עם תלמיד יקר. `;

const DEFAULT_PROMPTS = {
  tanach:   RABBI_PERSONA + `תלמד תנ"ך פסוק אחר פסוק, ותשאל שאלות על פשט, הקשר ספרותי, ומשמעות רוחנית.`,
  mishnah:  RABBI_PERSONA + `תלמד משנה אחת בכל פעם, ותשאל שאלות על הדין, מחלוקת התנאים, טעם ההלכה ויישומה.`,
  shas:     RABBI_PERSONA + `תלמד גמרא עמוד אחר עמוד, ותשאל שאלות על שקלא וטריא, פירוש המושגים, ומסקנת הסוגיה.`,
  rambam:   RABBI_PERSONA + `תלמד רמב"ם הלכה אחת בכל פעם, ותשאל שאלות על ההלכה, מקורה, ויישומה המעשי.`,
  shulchan: RABBI_PERSONA + `תלמד שולחן ערוך סעיף אחד בכל פעם, ותשאל שאלות על ההלכה, מחלוקות הפוסקים, ומנהג.`,
};

// ── English prompts ───────────────────────────────────────────────
const RABBI_PERSONA_EN = `You are Rabbi Binyahu — a wise, patient, and Torah-loving rabbi who studies together with the student joyfully. Speak with warmth and encouragement, as if sitting in a study session with a dear student. `;

const DEFAULT_PROMPTS_EN = {
  tanach:   RABBI_PERSONA_EN + `Study Tanach verse by verse, asking questions about the plain meaning (peshat), literary context, and spiritual significance.`,
  mishnah:  RABBI_PERSONA_EN + `Study one Mishnah at a time, asking questions about the law, disputes among the Tannaim, the reason behind the ruling, and its practical application.`,
  shas:     RABBI_PERSONA_EN + `Study Talmud folio by folio, asking questions about the dialectic (shakla ve-tarya), interpretation of concepts, and the conclusion of the passage.`,
  rambam:   RABBI_PERSONA_EN + `Study one Rambam law at a time, asking questions about the ruling, its source, and practical application.`,
  shulchan: RABBI_PERSONA_EN + `Study one paragraph of Shulchan Aruch at a time, asking questions about the law, disputes among the decisors (poskim), and custom.`,
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

const UNIVERSAL_RULES_EN = `
Operating rules:
1. Brief feedback on the previous answer (empty in the first message).
2. Score: 5=fully correct | 2=partial/right direction | 0=wrong.
3. Present the next unit in order — do not skip.
4. Ask only one question — deep and thought-provoking.
5. If an explanation is requested — fill the explanation field with a brief, precise explanation. After explaining — move to the next unit.
6. When all units are finished — write a warm blessing in feedback and set is_finished=true.

Iron rule: Return ONLY valid JSON — no text before it, no \`\`\`json, no additions whatsoever.

Required format (these exact field names):
{
  "feedback":       "feedback on the previous answer",
  "score":          0,
  "next_verse_num": 1,
  "next_verse":     "the full text of the next unit",
  "next_question":  "one question about the unit",
  "explanation":    "",
  "is_finished":    false
}`;

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────
  const reqOrigin    = req.headers.origin || '';
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
    custom_prompt,
    lang,
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
  const isEnglish = lang === 'en';
  const collectionKey  = ['tanach','mishnah','shas','rambam','shulchan'].includes(collection_type)
    ? collection_type : 'tanach';
  const [kvPrompt, kvModel] = await Promise.all([
    kv.get(`config:prompt:${collectionKey}`),
    kv.get('config:model'),
  ]);
  const defaultPrompts = isEnglish ? DEFAULT_PROMPTS_EN : DEFAULT_PROMPTS;
  const universalRules = isEnglish ? UNIVERSAL_RULES_EN : UNIVERSAL_RULES;
  // KV admin prompts are Hebrew-only; skip them in English mode
  const introPrompt = (kvPrompt && kvPrompt.trim() && !isEnglish)
    ? kvPrompt.trim()
    : (defaultPrompts[collectionKey] || defaultPrompts.tanach);
  const chapterHeader = isEnglish
    ? `Current section: ${book_name} | Unit: ${chapter_num} (${total_verses} units)`
    : `הפרק הנוכחי: ${book_name} | יחידה: ${chapter_num} (${total_verses} יחידות)`;

  const systemWithChapter =
    `${introPrompt}\n` +
    `${universalRules}\n\n` +
    `${chapterHeader}\n` +
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
        model:      kvModel || DEFAULT_MODEL,
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
