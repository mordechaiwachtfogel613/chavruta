import { kv } from '@vercel/kv';

const ADMIN = 'a0583298194@gmail.com';
const FROM  = process.env.RESEND_FROM || 'onboarding@resend.dev';
const BASE  = 'font-family:Arial,sans-serif;direction:rtl;text-align:right;background:#faf8f3;padding:32px;border-radius:16px;max-width:480px;margin:auto;';

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
  return str.replace(/\{\{name\}\}/g, name || '').replace(/\{\{email\}\}/g, email || '');
}

const wrap = c => `<div style="${BASE}">${c}</div>`;

// ── Defaults ────────────────────────────────────────────────────
const DEFAULTS = {
  welcome: {
    subject: 'קיבלנו את בקשתך – חברותא',
    html: (name) => wrap(`<h2 style="color:#1a2744;">שלום ${name}! 👋</h2>
      <p style="color:#444;line-height:1.7;">קיבלנו את בקשת ההרשמה שלך לאפליקציית <strong>חברותא</strong>.</p>
      <p style="color:#444;line-height:1.7;">בקשתך בבדיקה ותקבל מייל נוסף ברגע שתאושר.</p>
      <p style="color:#B8860B;font-weight:bold;margin-top:24px;">יחד נעמיק בתורה הקדושה 📖</p>`),
  },
  approval: {
    subject: 'אושרת לחברותא! 🎉',
    html: (name) => wrap(`<h2 style="color:#1a2744;">בשורות טובות, ${name}! 🎉</h2>
      <p style="color:#444;line-height:1.7;">הרשמתך לאפליקציית <strong>חברותא</strong> <strong style="color:green;">אושרה!</strong></p>
      <p style="color:#444;line-height:1.7;">כעת תוכל להיכנס ולהתחיל ללמוד עם רבי בניהו.</p>
      <a href="https://chavruta-iota.vercel.app" style="display:inline-block;background:#1a2744;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;margin-top:20px;">התחל ללמוד ✦</a>
      <p style="color:#B8860B;font-weight:bold;margin-top:28px;">יחד נעמיק בתורה הקדושה 📖</p>`),
  },
  admin_notify: {
    subject: (name) => `משתמש חדש נרשם: ${name}`,
    html: (name, email) => wrap(`<h2 style="color:#1a2744;">משתמש חדש נרשם</h2>
      <p style="color:#444;"><strong>שם:</strong> ${name}</p>
      <p style="color:#444;"><strong>מייל:</strong> ${email}</p>
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
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'missing' });
    const key = `user:${email.trim().toLowerCase()}`;
    const exists = await kv.get(key);
    if (exists) return res.json({ status: exists.status });
    const isAdm = email.trim().toLowerCase() === ADMIN;
    const user  = { name, email: email.trim().toLowerCase(), status: isAdm ? 'approved' : 'pending', ts: Date.now() };
    await kv.set(key, user);
    await kv.sadd('users:all', email.trim().toLowerCase());
    if (!isAdm) {
      await Promise.all([
        dispatchEmail('welcome',      user.email, name, user.email),
        dispatchEmail('admin_notify', ADMIN,      name, user.email),
      ]).catch(() => {});
    }
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
      const users  = await Promise.all(emails.map(e => kv.get(`user:${e}`)));
      return res.json(users.filter(Boolean).sort((a, b) => b.ts - a.ts));
    }
    return res.status(403).end();
  }

  if (req.method === 'PATCH') {
    const { email, status, adminEmail } = req.body || {};
    if (!adminEmail || adminEmail.trim().toLowerCase() !== ADMIN) return res.status(403).end();
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
