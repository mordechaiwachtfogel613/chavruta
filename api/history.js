import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const { email, record } = req.body || {};
    if (!email || !record) return res.status(400).json({ error: 'missing' });
    const key = `history:${email.toLowerCase().trim()}`;
    const history = (await kv.get(key)) || [];
    history.unshift({ ...record, ts: Date.now() });
    await kv.set(key, history.slice(0, 300));
    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'missing' });
    const key = `history:${email.toLowerCase().trim()}`;
    const history = (await kv.get(key)) || [];
    return res.json(history);
  }

  res.status(405).end();
}
