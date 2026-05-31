// ================================================================
// מסע – Admin Config Endpoint
// GET  /api/masav-config  → returns current prompt & msgLimit (public)
// POST /api/masav-config  → updates config (admin only)
//                           OR generates image if body._action === 'generate-image'
// ================================================================

import { kv } from '@vercel/kv';

const DEFAULT_MSG_LIMIT = 60;
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

const MODEL_LABELS = {
  'openai/gpt-5.4-image-2':              'GPT 5.4 Image 2 (OpenAI)',
  'google/gemini-3.1-flash-image-preview': 'Gemini 3.1 Flash Image – Nano Banana 2 (Google)',
};

function isAdminAuthed(req) {
  const secret = req.headers['x-admin-secret'];
  return !!(secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c])
  );
}

async function sendImageEmail(toEmail, prompt, imageUrl, modelLabel) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const subject = 'התמונה שלך מוכנה!';
  const html = `
    <div style="font-family:Arial,sans-serif;background:#0f0f1a;padding:32px;border-radius:16px;max-width:600px;margin:auto;color:#e0e0e0;">
      <h2 style="color:#a78bfa;margin-top:0;">✨ התמונה שלך מוכנה</h2>
      <p style="color:#9ca3af;"><strong style="color:#c4b5fd;">מודל:</strong> ${escHtml(modelLabel)}</p>
      <p style="color:#9ca3af;"><strong style="color:#c4b5fd;">פרומפט:</strong> ${escHtml(prompt)}</p>
      <p style="color:#9ca3af;">התמונה מצורפת למייל זה כקובץ.</p>
    </div>`;

  // Ensure image is always sent as an attachment (not an external URL),
  // so email filters / content blockers on the recipient's side can't blur it.
  let attachments = undefined;
  if (imageUrl.startsWith('data:')) {
    const [meta, b64] = imageUrl.split(',');
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const ext = mime.split('/')[1] || 'png';
    attachments = [{ filename: `image.${ext}`, content: b64 }];
  } else if (imageUrl.startsWith('http')) {
    // Fetch the image server-side so it arrives as a file attachment,
    // bypassing any client-side URL filtering that blurs external images.
    try {
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const ext = (contentType.split('/')[1] || 'png').split(';')[0];
      const b64 = Buffer.from(buffer).toString('base64');
      attachments = [{ filename: `image.${ext}`, content: b64 }];
    } catch { /* silent — email will still be sent without attachment */ }
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Image Generator <${FROM}>`,
        to: [toEmail],
        subject,
        html,
        ...(attachments ? { attachments } : {}),
      }),
    });
  } catch { /* silent */ }
}

async function handleImageGeneration(req, res) {
  const { prompt, model, email } = req.body || {};

  if (!prompt || !model || !email) return res.status(400).json({ error: 'missing fields' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'invalid email' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'no api key configured' });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'https://www.chavruta-letalmudtorah.uk',
    'X-Title': 'Image Generator',
  };

  // Abort after 55s to return a clean error before Vercel's 60s hard kill
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    let orRes;
    try {
      orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
        }),
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'יצירת התמונה ארכה יותר מ-55 שניות. נסה פרומפט קצר יותר.' });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    let data;
    const ct = orRes.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = await orRes.text();
      return res.status(502).json({ error: `OpenRouter error (${orRes.status}): ${text.slice(0, 300)}` });
    }
    try {
      data = await orRes.json();
    } catch {
      return res.status(502).json({ error: 'Failed to parse OpenRouter response' });
    }

    if (!orRes.ok) {
      const errMsg = data?.error?.message || data?.error || JSON.stringify(data);
      return res.status(502).json({ error: `OpenRouter (${orRes.status}): ${errMsg}` });
    }

    // Extract image — handle array or string content
    const content = data?.choices?.[0]?.message?.content;
    let imageUrl = null;

    if (Array.isArray(content)) {
      const imgPart = content.find(p => p.type === 'image_url');
      imageUrl = imgPart?.image_url?.url || null;
    } else if (typeof content === 'string' && content.startsWith('data:')) {
      imageUrl = content;
    }

    if (!imageUrl) {
      return res.status(502).json({
        error: `No image in response. Raw content: ${JSON.stringify(content)?.slice(0, 400)}`,
      });
    }

    await sendImageEmail(email.trim(), prompt, imageUrl, MODEL_LABELS[model] || model);
    return res.json({ success: true, imageUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Return API key to hidden page so browser can call OpenRouter directly
  if (req.method === 'GET' && req.query._tzvi === '1') {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return res.status(500).json({ error: 'no key' });
    return res.json({ key });
  }

  // Send image email (browser already generated the image, just send email)
  if (req.method === 'POST' && req.body?._action === 'send-image-email') {
    const { imageUrl, email, prompt, model } = req.body || {};
    if (!imageUrl || !email) return res.status(400).json({ error: 'missing fields' });
    await sendImageEmail(email.trim(), prompt || '', imageUrl, MODEL_LABELS[model] || model);
    return res.json({ ok: true });
  }

  // Legacy route kept for reference (no longer used)
  if (req.method === 'POST' && req.body?._action === 'generate-image') {
    return handleImageGeneration(req, res);
  }

  if (req.method === 'GET') {
    const [prompt, msgLimit] = await Promise.all([
      kv.get('config:masav:prompt'),
      kv.get('config:masav:msgLimit'),
    ]);
    return res.json({
      prompt: prompt || null,
      msgLimit: typeof msgLimit === 'number' ? msgLimit : DEFAULT_MSG_LIMIT,
    });
  }

  if (req.method === 'POST') {
    if (!isAdminAuthed(req)) return res.status(403).json({ error: 'Forbidden' });

    const { prompt, msgLimit } = req.body || {};
    const ops = [];

    if (prompt !== undefined) {
      ops.push(prompt
        ? kv.set('config:masav:prompt', String(prompt).slice(0, 8000))
        : kv.del('config:masav:prompt'));
    }
    if (msgLimit !== undefined) {
      const limit = parseInt(msgLimit, 10);
      if (!isNaN(limit) && limit >= 1 && limit <= 500) {
        ops.push(kv.set('config:masav:msgLimit', limit));
      }
    }

    await Promise.all(ops);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
