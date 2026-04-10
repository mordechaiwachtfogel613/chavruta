import { kv } from '@vercel/kv';

const ALLOWED_TYPES = new Set(['welcome', 'approval', 'admin_notify']);

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
  if (!isAdminAuthed(req)) return res.status(403).end();

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
    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
    await kv.set(`email_template:${type}`, {
      subject: String(subject).slice(0, 200),
      body:    String(body).slice(0, 5000),
    });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
