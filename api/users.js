import { kv } from '@vercel/kv';

const ADMIN = (process.env.ADMIN_EMAIL || 'a0583298194@gmail.com').trim().toLowerCase();
const FROM  = process.env.RESEND_FROM || 'onboarding@resend.dev';
const BASE  = 'font-family:Arial,sans-serif;direction:rtl;text-align:right;background:#faf8f3;padding:32px;border-radius:16px;max-width:480px;margin:auto;';

function isAdminAuthed(req) {
  const email  = (req.headers['x-admin-email'] || '').trim().toLowerCase();
  const secret = req.headers['x-admin-secret'];
  return !!(
    (email  && ADMIN && email  === ADMIN) ||
    (secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET)
  );
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));
}

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `רבי בניהו – חברותא <${FROM}>`, to: [to], subject, html })
    });
  } catch { /* silent */ }
}

async function getTemplate(type) {
  try { return await kv.get(`email_template:${type}`); } catch { return null; }
}

function vars(str, name, email) {
  return str.replace(/\{\{name\}\}/g, escHtml(name || '')).replace(/\{\{email\}\}/g, escHtml(email || ''));
}

const wrap = c => `<div style="${BASE}">${c}</div>`;

// ── Defaults ────────────────────────────────────────────────────
const DEFAULTS = {
  welcome: {
    subject: 'קיבלנו את בקשתך – חברותא',
    html: (name) => wrap(`<h2 style="color:#1a2744;">שלום ${escHtml(name)}! 👋</h2>
      <p style="color:#444;line-height:1.7;">קיבלנו את בקשת ההרשמה שלך לאפליקציית <strong>חברותא</strong>.</p>
      <p style="color:#444;line-height:1.7;">בקשתך בבדיקה ותקבל מייל נוסף ברגע שתאושר.</p>
      <p style="color:#B8860B;font-weight:bold;margin-top:24px;">יחד נעמיק בתורה הקדושה 📖</p>`),
  },
  approval: {
    subject: 'אושרת לחברותא! 🎉',
    html: (name) => wrap(`<h2 style="color:#1a2744;">בשורות טובות, ${escHtml(name)}! 🎉</h2>
      <p style="color:#444;line-height:1.7;">הרשמתך לאפליקציית <strong>חברותא</strong> <strong style="color:green;">אושרה!</strong></p>
      <p style="color:#444;line-height:1.7;">כעת תוכל להיכנס ולהתחיל ללמוד עם רבי בניהו.</p>
      <a href="https://chavruta-iota.vercel.app" style="display:inline-block;background:#1a2744;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;margin-top:20px;">התחל ללמוד ✦</a>
      <p style="color:#B8860B;font-weight:bold;margin-top:28px;">יחד נעמיק בתורה הקדושה 📖</p>`),
  },
  admin_notify: {
    subject: (name) => `משתמש חדש נרשם: ${name}`,
    html: (name, email) => wrap(`<h2 style="color:#1a2744;">משתמש חדש נרשם</h2>
      <p style="color:#444;"><strong>שם:</strong> ${escHtml(name)}</p>
      <p style="color:#444;"><strong>מייל:</strong> ${escHtml(email)}</p>
      <p style="color:#888;font-size:0.9rem;">כנס לפאנל הניהול כדי לאשר או לדחות.</p>`),
  },
};

async function dispatchEmail(type, toEmail, name, email) {
  const tmpl = await getTemplate(type);
  let subject, html;
  if (tmpl?.subject && tmpl?.body) {
    subject = vars(tmpl.subject, name, email);
    html    = wrap(vars(tmpl.body, name, email));
  } else if (type === 'admin_notify') {
    subject = DEFAULTS.admin_notify.subject(name);
    html    = DEFAULTS.admin_notify.html(name, email);
  } else {
    subject = DEFAULTS[type].subject;
    html    = DEFAULTS[type].html(name, email);
  }
  await sendEmail(toEmail, subject, html);
}

// ── Handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'missing' });
    const normalEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    const key = `user:${normalEmail}`;
    const exists = await kv.get(key);
    if (exists) return res.json({ status: exists.status, isAdmin: exists.isAdmin || false });
    const isAdm = ADMIN && normalEmail === ADMIN;
    const user  = { name: String(name).slice(0, 100), email: normalEmail, status: isAdm ? 'approved' : 'pending', isAdmin: isAdm, ts: Date.now() };
    await kv.set(key, user);
    await kv.sadd('users:all', normalEmail);
    if (!isAdm) {
      await Promise.all([
        dispatchEmail('welcome',      user.email, name, user.email),
        dispatchEmail('admin_notify', ADMIN,      name, user.email),
      ]).catch(() => {});
    }
    return res.json({ status: user.status, isAdmin: isAdm });
  }

  if (req.method === 'GET') {
    const { email } = req.query;
    if (email) {
      const normalEmail = email.trim().toLowerCase();
      const user = await kv.get(`user:${normalEmail}`);
      if (!user) return res.json({ status: 'not_found', isAdmin: false });
      const isAdm = !!(ADMIN && normalEmail === ADMIN);
      // Backfill isAdmin into KV if the record predates the field
      if (isAdm && !user.isAdmin) {
        await kv.set(`user:${normalEmail}`, { ...user, isAdmin: true }).catch(() => {});
      }
      return res.json({ status: user.status, isAdmin: isAdm || user.isAdmin || false });
    }
    if (isAdminAuthed(req)) {
      const emails = (await kv.smembers('users:all')) || [];
      const users  = await Promise.all(emails.map(e => kv.get(`user:${e}`)));
      return res.json(users.filter(Boolean).sort((a, b) => b.ts - a.ts));
    }
    return res.status(403).end();
  }

  if (req.method === 'PATCH') {
    if (!isAdminAuthed(req)) return res.status(403).end();
    const { email, status } = req.body || {};
    if (!email || !status) return res.status(400).end();
    const key  = `user:${email.trim().toLowerCase()}`;
    const user = await kv.get(key);
    if (!user) return res.status(404).end();
    await kv.set(key, { ...user, status });
    if (status === 'approved') {
      await dispatchEmail('approval', user.email, user.name, user.email).catch(() => {});
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
