// ================================================================
// misc.js – נקודת כניסה אחת לכמה פונקציות קטנות
// Vercel (תוכנית Hobby) מגביל ל-12 פונקציות. הקוד של history,
// email-templates ו-analytics יושב ב-server/ ללא שינוי, וכאן
// מנתבים אליו. הכתובות /api/<שם> נשארות זהות דרך rewrites ב-vercel.json.
// ================================================================

import history from '../server/history.js';
import emailTemplates from '../server/email-templates.js';
import analytics from '../server/analytics.js';

const HANDLERS = {
  'history': history,
  'email-templates': emailTemplates,
  'analytics': analytics,
};

export default async function handler(req, res) {
  let fn = req.query && req.query.fn;
  if (!fn) {
    const m = /^\/api\/([a-z-]+)/.exec(req.url || '');
    fn = m && m[1];
  }
  const target = Object.prototype.hasOwnProperty.call(HANDLERS, fn) ? HANDLERS[fn] : null;
  if (!target) return res.status(404).end();
  if (req.query) delete req.query.fn;
  return target(req, res);
}
