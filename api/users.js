import { kv } from '@vercel/kv';

const ADMIN = 'a0583298194@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'missing' });
    const key = `user:${email.trim().toLowerCase()}`;
    const exists = await kv.get(key);
    if (exists) return res.json({ status: exists.status });
    const isAdm = email.trim().toLowerCase() === ADMIN;
    const user = { name, email: email.trim().toLowerCase(), status: isAdm ? 'approved' : 'pending', ts: Date.now() };
    await kv.set(key, user);
    await kv.sadd('users:all', email.trim().toLowerCase());
    return res.json({ status: user.status });
  }

  if (req.method === 'GET') {
    const { email, adminEmail } = req.query;
    if (email) {
      const user = await kv.get(`user:${email.trim().toLowerCase()}`);
      return res.json({ status: user ? user.status : 'not_found' });
    }
    if (adminEmail && adminEmail.trim().toLowerCase() === ADMIN) {
      const emails = (await kv.smembers('users:all')) || [];
      const users = await Promise.all(emails.map(e => kv.get(`user:${e}`)));
      return res.json(users.filter(Boolean).sort((a, b) => b.ts - a.ts));
    }
    return res.status(403).end();
  }

  if (req.method === 'PATCH') {
    const { email, status, adminEmail } = req.body || {};
    if (!adminEmail || adminEmail.trim().toLowerCase() !== ADMIN) return res.status(403).end();
    const key = `user:${email.trim().toLowerCase()}`;
    const user = await kv.get(key);
    if (!user) return res.status(404).end();
    await kv.set(key, { ...user, status });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
