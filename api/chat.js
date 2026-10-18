// ================================================================
// חברותא – Vercel Serverless Function
// Proxies requests to OpenRouter API (keeps API key server-side)
// ================================================================

import { kv } from '@vercel/kv';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';

// ── Default system prompt intros per collection ──────────────────
const RABBI_PERSONA = `אתה החברותא — לומד חכם, סבלני ואוהב תורה, שלומד יחד עם התלמיד בשמחה. דבר בחמימות ובעידוד, כאילו אתה יושב לימוד עם תלמיד יקר. `;

const DEFAULT_PROMPT_IYUN = RABBI_PERSONA + `אתה לומד בעיון עמוק פסוק אחד עם התלמיד. הפסוק ופירושי המפרשים שנבחרו מסופקים לך.
צטט את המפרשים בשמם, הצג מחלוקות ביניהם, וחבר בין דבריהם לפשט הפסוק. שאל שאלות מעמיקות שמעוררות מחשבה.`;

const DEFAULT_PROMPT_BEKIUT = RABBI_PERSONA + `אתה לומד בבקיאות פסוק אחד עם התלמיד. הפסוק ופירושי המפרשים שנבחרו מסופקים לך.
הצג את עיקר הפסוק ועיקר דברי כל מפרש בקצרה. שאל שאלות קצרות שבודקות הבנה בסיסית של הפסוק ודברי המפרשים.`;

const VERSE_STUDY_RULES = `
חוקי הפעולה:
1. פידבק קצר על התשובה הקודמת (ריק בהודעה הראשונה).
2. ניקוד: 5=נכון לגמרי | 2=חלקי/כיוון נכון | 0=שגוי.
3. שאל שאלה אחת בלבד על הפסוק ופירושי המפרשים.
4. אם ביקשו הסבר — מלא שדה explanation בהסבר קצר ומדויק.
5. לאחר 3-4 שאלות — כתוב ברכה חמה ב-feedback ושים is_finished=true.

כלל ברזל: החזר אך ורק JSON תקין — ללא טקסט לפניו, ללא \`\`\`json, ללא שום תוספות.

פורמט חובה (שמות שדות אלה בדיוק):
{
  "feedback":       "פידבק על התשובה האחרונה",
  "score":          0,
  "next_verse_num": 1,
  "next_verse":     "הפסוק או הציטוט שדנים בו",
  "next_question":  "שאלה אחת על הפסוק/מפרשים",
  "explanation":    "",
  "is_finished":    false
}`;

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
3. הצג את היחידה הבאה לפי הסדר – אל תדלג. חריג: אם הניקוד הוא 0 (תשובה שגויה), הצג שוב את אותה יחידה בדיוק (השאר next_verse_num ו-next_verse זהים לקודמים) ושאל בסוף: "האם אתה חושב שיש לך תשובה טובה יותר?". עשה זאת לכל היותר פעמיים נוספות (סה"כ 3 תשובות שגויות על אותה יחידה), ולאחר מכן עבור ליחידה הבאה.
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
3. Present the next unit in order — do not skip. Exception: if score is 0 (wrong answer), re-present the exact same unit (keep next_verse_num and next_verse identical to the previous response) and ask at the end: "Do you think you have a better answer?". Do this at most twice more (3 wrong answers total on the same unit), then move to the next unit.
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

// ── Learner-controlled study settings ────────────────────────────
const STUDY_STYLES = {
  general: {
    he: `סגנון הלימוד שבחר הלומד: לימוד כללי של הנושא.
התמקד ברעיון המרכזי, בתמונה הגדולה ובקשרים בין היחידות. שאל שאלות הבנה רחבות ("מה הרעיון המרכזי כאן?", "איך זה מתחבר למה שלמדנו קודם?") ולא על פרטים קטנים או על ניואנסים של מילים בודדות.`,
    en: `Study style chosen by the learner: general overview.
Focus on the main idea, the big picture and the connections between units. Ask broad comprehension questions rather than questions about small details or individual words.`,
  },
  particular: {
    he: `סגנון הלימוד שבחר הלומד: לימוד פרטני.
התעמק בפרטים: משמעות מילים וביטויים, דיוק לשון הכתוב, הבדלים בין נוסחים, ופרט אחר פרט. שאל שאלות מדויקות על הכתוב עצמו.`,
    en: `Study style chosen by the learner: detailed study.
Go into the details: meaning of words and phrases, precision of the wording, and point-by-point reading. Ask precise questions about the text itself.`,
  },
  free: {
    he: `סגנון הלימוד שבחר הלומד: שיח חופשי.
שוחח באופן טבעי וזורם, כמו שני חברים שלומדים יחד. ענה לשאלות הלומד, התייחס לרעיונות שהוא מעלה, ופתח דיון. אין צורך בשאלה בכל תור — שאל רק כשזה מתאים לשיחה, ושאל את הלומד גם מה הוא חושב. בסגנון זה אין ניקוד: החזר תמיד score=0, ושדה feedback הוא תגובה טבעית לדברי הלומד (לא "נכון/שגוי"). בסגנון זה אין חזרה על אותה יחידה אחרי תשובה שגויה (התעלם מכלל חזרה על יחידה בציון 0). התקדם ליחידה הבאה רק כשהשיחה על היחידה הנוכחית מיצתה את עצמה או כשהלומד מבקש.`,
    en: `Study style chosen by the learner: free discussion.
Talk naturally and fluidly, like two friends studying together. Answer the learner's questions, respond to the ideas they raise, and open a discussion. You do not need a question every turn — ask only when it fits, and ask what the learner thinks. There is no scoring in this style: always return score=0, and "feedback" is a natural reply to what the learner said (not "right/wrong"). Do not repeat a unit after a wrong answer (ignore the repeat-on-score-0 rule). Move on to the next unit only when the discussion of the current one is exhausted or the learner asks.`,
  },
  deep: {
    he: `סגנון הלימוד שבחר הלומד: לימוד מעמיק.
העמק: הצג את דברי המפרשים והמחלוקות ביניהם, הקשרים למקורות אחרים בתורה ובדברי חז"ל, שאלות קשות ("קשיא") ותירוצים. שאל שאלות מחשבה שדורשות הבנה וניתוח, לא רק שליפה מהטקסט.`,
    en: `Study style chosen by the learner: in-depth study.
Go deep: bring the commentators and their disputes, connections to other sources in the Torah and in Chazal, difficulties and their resolutions. Ask analytical, thought-provoking questions that require understanding rather than recall.`,
  },
};

const ALLOWED_UNIT_COUNTS = [1, 2, 3, 5];

function studySettingsSection({ styleKey, unitsPerStep, isEnglish, isVerseMode }) {
  const parts = [];
  const style = STUDY_STYLES[styleKey];
  if (style) parts.push(isEnglish ? style.en : style.he);

  if (!isVerseMode && unitsPerStep > 1) {
    parts.push(isEnglish
      ? `Units per step: ${unitsPerStep}. The learner wants ${unitsPerStep} consecutive units at a time (instead of one). Present the next ${unitsPerStep} units in order (fewer only if the chapter has fewer left): set "next_verse_num" to the number of the FIRST unit of the group, add the field "next_verse_count" with the number of units in the group, and ask ONE question about the group as a whole. Advance by that many units each step. If the learner answers wrongly, re-present the same group. (This overrides "present the next unit" in the rules above.)`
      : `כמות יחידות בכל שלב: ${unitsPerStep}. הלומד ביקש ללמוד ${unitsPerStep} יחידות רצופות בכל פעם (במקום יחידה אחת). הצג בכל שלב את ${unitsPerStep} היחידות הבאות לפי הסדר (פחות רק אם נשארו פחות בפרק): קבע את "next_verse_num" למספר היחידה הראשונה בקבוצה, הוסף שדה "next_verse_count" עם מספר היחידות בקבוצה, ושאל שאלה אחת על הקבוצה כולה. התקדם בכל שלב בכמות הזו של יחידות. אם הלומד טעה — הצג שוב את אותה קבוצה. (זה גובר על "הצג את היחידה הבאה" בכללים שלמעלה.)`);
  }
  if (!parts.length) return '';
  return `\n\n────────────────────────────────\n` +
         (isEnglish ? 'Learner settings (apply from now on, even if they differ from earlier messages):\n'
                    : 'הגדרות הלומד (חלות מעכשיו, גם אם הן שונות מהודעות קודמות בשיחה):\n') +
         parts.join('\n\n') + `\n────────────────────────────────`;
}

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
    study_mode,            // 'iyun' | 'bekiut' | undefined
    commentary_text,       // commentaries text for verse mode
    verse_num,             // 1-based verse number
    steinsaltz_commentary, // Steinsaltz commentary for the full chapter (shas/tanach)
    study_style,           // 'general' | 'particular' | 'free' | 'deep' (learner-chosen)
    units_per_step,        // 1 | 2 | 3 | 5 units shown at a time
  } = req.body || {};

  if (!messages?.length || !chapter_text) {
    res.status(400).json({ error: 'Missing required fields: messages, chapter_text' });
    return;
  }

  // API key is checked after KV read below (supports key stored in KV or env var)

  // ── Build system prompt ────────────────────────────────────────
  const isEnglish   = lang === 'en';
  const isVerseMode = study_mode === 'iyun' || study_mode === 'bekiut';
  const collectionKey = ['tanach','mishnah','shas','rambam','shulchan'].includes(collection_type)
    ? collection_type : 'tanach';

  const kvKeys = isVerseMode
    ? [`config:prompt:${study_mode}`, 'config:model', 'config:openrouter:key']
    : [`config:prompt:${collectionKey}`, 'config:model', 'config:openrouter:key'];
  const [kvPrompt, kvModel, kvApiKey] = await Promise.all(kvKeys.map(k => kv.get(k)));
  const resolvedApiKey = (kvApiKey && String(kvApiKey).trim()) ? String(kvApiKey).trim() : process.env.OPENROUTER_API_KEY;

  let introPrompt, universalRules, chapterHeader;

  if (isVerseMode) {
    const defaultVersePrompt = study_mode === 'iyun' ? DEFAULT_PROMPT_IYUN : DEFAULT_PROMPT_BEKIUT;
    introPrompt   = (kvPrompt && kvPrompt.trim() && !isEnglish) ? kvPrompt.trim() : defaultVersePrompt;
    universalRules = VERSE_STUDY_RULES;
    chapterHeader  =
      `הפסוק הנוכחי: ${book_name} | ${chapter_num} | פסוק ${verse_num || 1}\n\n` +
      `הפסוק:\n${chapter_text}\n\n` +
      (commentary_text
        ? `פירושי המפרשים:\n${commentary_text}`
        : '(לא נבחרו מפרשים)');
  } else {
    const defaultPrompts = isEnglish ? DEFAULT_PROMPTS_EN : DEFAULT_PROMPTS;
    universalRules = isEnglish ? UNIVERSAL_RULES_EN : UNIVERSAL_RULES;
    // KV admin prompts are Hebrew-only; skip them in English mode
    introPrompt = (kvPrompt && kvPrompt.trim() && !isEnglish)
      ? kvPrompt.trim()
      : (defaultPrompts[collectionKey] || defaultPrompts.tanach);
    chapterHeader = isEnglish
      ? `Current section: ${book_name} | Unit: ${chapter_num} (${total_verses} units)`
      : `הפרק הנוכחי: ${book_name} | יחידה: ${chapter_num} (${total_verses} יחידות)`;
  }

  // ── Steinsaltz commentary section ─────────────────────────────
  // When provided: questions and feedback must be based ONLY on this commentary.
  // The AI must never reveal the source or mention any commentator by name.
  const steinsaltzSection = (steinsaltz_commentary && steinsaltz_commentary.trim())
    ? `\n\n────────────────────────────────\n` +
      `פירוש על הקטע הנלמד:\n${steinsaltz_commentary.trim()}\n` +
      `────────────────────────────────\n\n` +
      `הנחיה מחייבת: בסס את כל שאלותיך ואת כל הפידבק שלך אך ורק על מה שכתוב בפירוש לעיל. ` +
      `אסור לציין שהשאלות מבוססות על פירוש כלשהו ואסור להזכיר שם של מפרש או מחבר. ` +
      `הצג את הרעיונות בסגנון חברותא טבעי, כאילו הם ידע רבני שלך.`
    : '';

  const styleKey      = Object.hasOwn(STUDY_STYLES, study_style) ? study_style : null;
  const unitsPerStep  = ALLOWED_UNIT_COUNTS.includes(Number(units_per_step)) ? Number(units_per_step) : 1;
  const settingsSection = studySettingsSection({ styleKey, unitsPerStep, isEnglish, isVerseMode });

  const systemWithChapter =
    `${introPrompt}\n` +
    `${universalRules}` +
    `${settingsSection}` +
    `${steinsaltzSection}\n\n` +
    `${chapterHeader}\n` +
    `──────────────────────────────\n` +
    (isVerseMode ? '' : `${chapter_text}\n──────────────────────────────`);

  // ── Call OpenRouter ────────────────────────────────────────────
  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resolvedApiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.APP_URL || 'https://chavruta.vercel.app',
        'X-Title':       'Chavruta - Jewish Learning App',
      },
      body: JSON.stringify({
        model:           kvModel || DEFAULT_MODEL,
        max_tokens:      1024,
        response_format: { type: 'json_object' },
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
    const groupSize = Math.floor(Number(parsed.next_verse_count));
    parsed.next_verse_count = groupSize >= 1 ? Math.min(groupSize, 5) : 1;
    if (styleKey === 'free') parsed.score = 0;

    res.status(200).json(parsed);

  } catch (err) {
    console.error('[chavruta/api/chat] Error:', err);
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
