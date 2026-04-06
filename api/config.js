import { kv } from '@vercel/kv';

const ADMIN = 'a0583298194@gmail.com';
const DEFAULT_MODEL = 'anthropic/claude-opus-4';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const model = await kv.get('config:model') || DEFAULT_MODEL;
    return res.json({ model });
  }
  if (req.method === 'POST') {
    const { adminEmail, model } = req.body;
    if (!adminEmail || adminEmail.trim().toLowerCase() !== ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await kv.set('config:model', model);
    return res.json({ ok: true });
  }
  res.status(405).end();
}
