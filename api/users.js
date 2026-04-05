import { kv } from '@vercel/kv';

const ADMIN = 'a0583298194@gmail.com';
const FROM  = process.env.RESEND_FROM || 'onboarding@resend.dev';

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `רבי בניהו – חברותא <${FROM}>`, to: [to], subject, html })
  });
}

const baseStyle = `font-family:Arial,sans-serif;direction:rtl;text-align:right;background:#faf8f3;padding:32px;border-radius:16px;max-width:480px;margin:auto;`;
const navyBtn   = `display:inline-block;background:#1a2744;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;margin-top:20px;`;

function welcomeHtml(name) {
  return `<div style="${baseStyle}">
    <h2 style="color:#1a2744;">שלום ${name}! 👋</h2>
    <p style="color:#444;line-height:1.7;">קיבלנו את בקשת ההרשמה שלך לאפליקציית <strong>חברותא</strong>.</p>
    <p style="color:#444;line-height:1.7;">בקשתך בבדיקה ותקבל מייל נוסף ברגע שתאושר.</p>
    <p style="color:#B8860B;font-weight:bold;margin-top:24px;">יחד נעמיק בתורה הקדושה 📖</p>
  </div>`;
}

function approvalHtml(name) {
  return `<div style="${baseStyle}">
    <h2 style="color:#1a2744;">בשורות טובות, ${name}! 🎉</h2>
    <p style="color:#444;line-height:1.7;">הרשמתך לאפליקציית <strong>חברותא</strong> <strong style="color:green;">אושרה!</strong></p>
    <p style="color:#444;line-height:1.7;">כעת תוכל להיכנס ולהתחיל ללמוד תורה עם רבי בניהו.</p>
    <a href="https://chavruta.vercel.app" style="${navyBtn}">התחל ללמוד ✦</a>
    <p style="color:#B8860B;font-weight:bold;margin-top:28px;">יחד נעמיק בתורה הקדושה 📖</p>
  </div>`;
}

function adminNotifyHtml(name, email) {
  return `<div style="${baseStyle}">
    <h2 style="color:#1a2744;">משתמש חדש נרשם</h2>
    <p style="color:#444;"><strong>שם:</strong> ${name}</p>
    <p style="color:#444;"><strong>מייל:</strong> ${email}</p>
    <p style="color:#888;font-size:0.9rem;">כנס לפאנל הניהול כדי לאשר או לדחות.</p>
  </div>`;
}

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

    // Emails (non-blocking)
    if (!isAdm) {
      sendEmail(user.email, 'קיבלנו את בקשתך – חברותא', welcomeHtml(name));
      sendEmail(ADMIN, `משתמש חדש נרשם: ${name}`, adminNotifyHtml(name, user.email));
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

    // Send approval email
    if (status === 'approved') {
      sendEmail(user.email, 'אושרת לחברותא! 🎉', approvalHtml(user.name));
    }

    return res.json({ ok: true });
  }

  res.status(405).end();
}
