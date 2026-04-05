import { kv } from '@vercel/kv';

const ADMIN = 'a0583298194@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const adminEmail = (req.method === 'GET' ? req.query.adminEmail : req.body?.adminEmail) || '';
  if (adminEmail.trim().toLowerCase() !== ADMIN) return res.status(403).end();

  if (req.method === 'GET') {
    const [welcome, approval, admin_notify] = await Promise.all([
      kv.get('email_template:welcome'),
      kv.get('email_template:approval'),
      kv.get('email_template:admin_notify'),
    ]);
    return res.json({ welcome, approval, admin_notify });
  }

  if (req.method === 'PATCH') {
    const { type, subject, body } = req.body || {};
    if (!type || !subject || !body) return res.status(400).json({ error: 'missing' });
    await kv.set(`email_template:${type}`, { subject, body });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
