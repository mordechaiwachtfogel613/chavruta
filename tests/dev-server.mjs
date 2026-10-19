// Local test server: serves the static site and runs api/*.js handlers with
// an in-memory KV and a canned OpenRouter reply. Not used in production.
import { register } from 'node:module';
register('./loader-hooks.mjs', import.meta.url);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3100);
process.env.OPENROUTER_API_KEY = 'test-key';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };

// Canned AI replies so the UI can be exercised without a network.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('openrouter.ai')) {
    const req = JSON.parse(init.body);
    const sys = req.messages[0].content;
    globalThis.__lastOpenRouter = req;
    let content;
    if (sys.includes('Anki')) {
      content = JSON.stringify({
        summary: 'למדנו על בריאת השמים והארץ.',
        cards: [
          { front: 'מה נברא ביום הראשון?', back: 'האור' },
          { front: 'מה קרא אלוקים לאור?', back: 'יום' },
          { front: 'מה קרא אלוקים לחושך?', back: 'לילה' },
        ],
      });
    } else {
      const m = req.messages.filter(x => x.role === 'user').length;
      const nm = (/כמות יחידות בכל שלב: (\d+)/.exec(sys)?.[1] ?? '1');
      content = JSON.stringify({
        feedback: m > 1 ? 'יפה מאוד' : '', score: m > 1 ? 5 : 0,
        next_verse_num: m, next_verse_count: Number(nm), next_verse: 'x',
        next_question: `שאלה מספר ${m}?`, explanation: '', is_finished: m >= (Number(process.env.FINISH_AFTER) || 99),
      });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }
  if (String(url).includes('sefaria.org')) {
    if (String(url).includes('Steinsaltz')) return new Response('{}', { status: 404 });
    const he = ['בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ', 'וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ', 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר', 'וַיַּרְא אֱלֹהִים אֶת הָאוֹר כִּי טוֹב', 'וַיִּקְרָא אֱלֹהִים לָאוֹר יוֹם', 'וַיְהִי עֶרֶב וַיְהִי בֹקֶר יוֹם אֶחָד'];
    return new Response(JSON.stringify({ he, text: he, ref: 'Genesis 1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, init);
};

const cache = new Map();
async function handler(name) {
  if (!cache.has(name)) cache.set(name, (await import(pathToFileURL(path.join(root, 'api', name + '.js')).href)).default);
  return cache.get(name);
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    let name = u.pathname.slice(5).replace(/\/$/, '');
    // mirrors the rewrites in vercel.json (history / email-templates / analytics -> api/misc.js)
    if (['history', 'email-templates', 'analytics'].includes(name)) { u.searchParams.set('fn', name); name = 'misc'; }
    if (!/^[a-z-]+$/.test(name) || !fs.existsSync(path.join(root, 'api', name + '.js'))) { res.writeHead(404); return res.end(); }
    let raw = ''; for await (const c of req) raw += c;
    req.query = Object.fromEntries(u.searchParams);
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    try { await (await handler(name))(req, res); } catch (e) { res.statusCode = 500; res.end(String(e)); }
    return;
  }
  if (u.pathname === '/__test/last-openrouter') {
    res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(globalThis.__lastOpenRouter || null));
  }
  let p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname);
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('dev server on', PORT));
