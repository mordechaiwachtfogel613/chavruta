// ================================================================
// misc.js – single Serverless Function that dispatches small endpoints
// (Vercel Hobby allows max 12 functions per deployment)
//   /api/misc?fn=history | email-templates | analytics
// ================================================================

import history from './_history.js';
import emailTemplates from './_email-templates.js';
import analytics from './_analytics.js';

const HANDLERS = { 'history': history, 'email-templates': emailTemplates, 'analytics': analytics };

export default async function handler(req, res) {
  const fn = Object.prototype.hasOwnProperty.call(HANDLERS, req.query?.fn) ? req.query.fn : null;
  if (!fn) return res.status(404).end();
  return HANDLERS[fn](req, res);
}
