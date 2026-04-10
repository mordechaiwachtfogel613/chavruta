import { kv } from '@vercel/kv';

const ALLOWED_MODELS = new Set([
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-haiku-4-5',
  'anthropic/claude-3.7-sonnet',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-pro',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct',
]);

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4';
const PROMPT_KEYS = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'];

const DEFAULT_SHARE_CARD = {
  theme: 'dark',
  headerText: 'חברותא | שירת התורה',
  subtitle: 'לימוד תורה אינטראקטיבי',
  learnedText: 'למדתי היום את',
  scoreText: 'וצברתי {score} נקודות',
  ctaText: 'בוא ללמוד תורה גם אתה!',
  siteUrl: 'chavruta.vercel.app',
};

const ADMIN = (process.env.ADMIN_EMAIL || 'a0583298194@gmail.com').trim().toLowerCase();

function isAdminAuthed(req) {
  const email  = (req.headers['x-admin-email'] || '').trim().toLowerCase();
  const secret = req.headers['x-admin-secret'];
  return !!(
    (email  && ADMIN && email  === ADMIN) ||
    (secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET)
  );
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET') {
    const [model, greeting, shareCard, ...prompts] = await Promise.all([
      kv.get('config:model'),
      kv.get('config:greeting'),
      kv.get('config:shareCard'),
      ...PROMPT_KEYS.map(k => kv.get(`config:prompt:${k}`)),
    ]);
    const promptsObj = {};
    PROMPT_KEYS.forEach((k, i) => { if (prompts[i]) promptsObj[k] = prompts[i]; });
    return res.json({
      model: model || DEFAULT_MODEL,
      greeting: greeting || null,
      prompts: promptsObj,
      shareCard: shareCard || DEFAULT_SHARE_CARD,
    });
  }

  if (req.method === 'POST') {
    if (!isAdminAuthed(req)) return res.status(403).json({ error: 'Forbidden' });

    const { model, greeting, prompts, shareCard } = req.body || {};
    const ops = [];

    if (model !== undefined) {
      if (!ALLOWED_MODELS.has(model)) return res.status(400).json({ error: 'Invalid model' });
      ops.push(kv.set('config:model', model));
    }
    if (greeting !== undefined) {
      ops.push(kv.set('config:greeting', String(greeting).slice(0, 500)));
    }
    if (shareCard !== undefined) {
      ops.push(kv.set('config:shareCard', { ...DEFAULT_SHARE_CARD, ...shareCard }));
    }
    if (prompts !== undefined) {
      for (const k of PROMPT_KEYS) {
        if (prompts[k] !== undefined) {
          ops.push(prompts[k]
            ? kv.set(`config:prompt:${k}`, String(prompts[k]).slice(0, 2000))
            : kv.del(`config:prompt:${k}`));
        }
      }
    }
    await Promise.all(ops);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
