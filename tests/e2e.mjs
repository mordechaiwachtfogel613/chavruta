// End-to-end check of the study controls, Anki flow and mobile layout.
// Usage:  FINISH_AFTER=4 node tests/dev-server.mjs &   node tests/e2e.mjs
// Needs Playwright (NODE_PATH or a local install) and a Chromium build.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright');

const BASE = process.env.BASE || 'http://localhost:3100';
const SHOTS = process.env.SHOTS || '/tmp/shots';
const EMAIL = 'a0583298194@gmail.com';
fs.mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failed++; };
const json = async (path, init) => (await fetch(BASE + path, init)).json();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem', ...opts });
  await ctx.addInitScript((e) => {
    localStorage.setItem('chavruta_user', JSON.stringify({ name: 'משה', email: e, isAdmin: true }));
  }, EMAIL);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('PAGEERROR', e.message); failed++; });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) console.log('CONSOLE', m.text()); });
  return page;
}

async function startLesson(page, tap = false) {
  const click = (sel) => (tap ? page.tap(sel) : page.click(sel));
  await page.waitForSelector('.start-learning-btn', { timeout: 15000 });
  await click('.start-learning-btn');
  await page.waitForSelector('#gp-book', { state: 'visible', timeout: 20000 });
  await page.selectOption('#gp-book', { label: 'בראשית' });
  await page.selectOption('#gp-unit', { index: 1 });
  await click('#gp-start');
  await page.waitForSelector('.verse-box', { timeout: 15000 });
}

// the admin is auto-approved on registration
await json('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'משה', email: EMAIL }) });

// ───────────── desktop: study flow ─────────────
{
  const page = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + '/');
  await page.waitForSelector('#sidebar:not(.hidden)');
  ok(!(await page.content()).includes('סיים שיעור'), 'no "סיים שיעור" button on the main screen');

  // welcome → greeting → pick a unit → start
  await startLesson(page);
  ok((await page.locator('.verse-box').count()) === 1, 'default: one verse per step');
  ok((await page.locator('#tool-count-label').textContent()).includes('פסוק אחד'), 'amount chip shows "פסוק אחד"');
  ok(await page.locator('#app.split-mode #text-panel').isVisible(), 'desktop: source panel pushes open next to the chat');
  await page.screenshot({ path: `${SHOTS}/01-desktop-chat.png` });

  // amount + style
  await page.click('#tool-count');
  await page.screenshot({ path: `${SHOTS}/02-count-pop.png` });
  await page.click('#pop-count button:has-text("שלושה פסוקים")');
  ok((await page.locator('#tool-count-label').textContent()) === 'שלושה פסוקים', 'amount chip updates to three');
  await page.click('#tool-style');
  await page.screenshot({ path: `${SHOTS}/03-style-pop.png` });
  await page.click('#pop-style button:has-text("שיח חופשי")');
  ok((await page.locator('#tool-style-label').textContent()) === 'שיח חופשי', 'style chip updates');

  const before = await page.locator('.verse-box').count();
  await page.fill('#user-input', 'התשובה שלי');
  await page.click('#send-btn');
  await page.waitForFunction((n) => document.querySelectorAll('.verse-box').length >= n + 3, before);
  const sent = await json('/__test/last-openrouter');
  const sys = sent.messages[0].content;
  ok(sys.includes('כמות יחידות בכל שלב: 3'), 'server prompt carries units-per-step');
  ok(sys.includes('שיח חופשי'), 'server prompt carries the study style');
  ok((await page.locator('.verse-box').count()) === before + 3, 'three verses rendered in one step');
  ok((await page.locator('#score-display').textContent()).trim() === '0', 'free discussion does not score');
  await page.screenshot({ path: `${SHOTS}/04-three-verses.png` });

  // focus card from the message box
  await page.click('#tool-card');
  await page.waitForSelector('.toast-msg');
  ok((await page.locator('.toast-msg').textContent()).includes('נוצרה כרטיסייה'), 'card chip creates a card');
  let snap = await json(`/api/anki?email=${EMAIL}`);
  ok(snap.counts.total === 1, 'focus scope saved exactly one card');

  // second answer, then leave mid-session through the sidebar
  await page.fill('#user-input', 'עוד תשובה');
  await page.click('#send-btn');
  await page.waitForFunction(() => document.querySelectorAll('#chat .bubble-user').length >= 2);
  await page.waitForTimeout(400);

  // conversation list
  await page.click('text=לזכור את הלימוד');
  await page.waitForSelector('.conv-row');
  ok((await page.locator('.conv-day').first().textContent()) === 'היום', 'history groups by day ("היום")');
  ok((await page.locator('.conv-row').first().textContent()).includes('בראשית'), 'conversation saved in the sidebar list');
  await page.screenshot({ path: `${SHOTS}/05-history.png` });

  // exit intent: clicking the Anki icon mid-lesson
  await page.click('#anki-nav-btn');
  await page.waitForSelector('#modal-anki-exit:not(.hidden)');
  ok(true, 'leaving mid-session shows the Anki offer');
  await page.screenshot({ path: `${SHOTS}/06-exit-offer.png` });
  await page.click('#anki-exit-yes');
  await page.waitForURL('**/anki.html', { timeout: 8000 });
  snap = await json(`/api/anki?email=${EMAIL}`);
  ok(snap.counts.total >= 3, `session cards were saved before navigating (total ${snap.counts.total})`);

  // ───────────── practice page ─────────────
  await page.waitForSelector('#view-card:not(.hidden)');
  await page.screenshot({ path: `${SHOTS}/07-anki-front.png` });
  ok(await page.locator('#reveal-btn').isVisible(), 'front side shows the reveal button');
  ok(!(await page.locator('#rate-row').isVisible()), 'rating buttons hidden until reveal');
  await page.click('#reveal-btn');
  ok(await page.locator('#rate-row').isVisible(), 'rating buttons appear after reveal');
  const labels = await page.locator('.rate b').allTextContents();
  ok(labels.join(',') === 'שוב,קשה,טוב,קל', 'four Anki buttons: ' + labels.join(','));
  const ivs = await page.locator('.rate small').allTextContents();
  console.log('     intervals:', ivs.join(' | '));
  await page.screenshot({ path: `${SHOTS}/08-anki-back.png` });

  let prog0 = await page.evaluate(() => document.getElementById('progress-fill').style.width);
  // answer every card with "good"/"easy" until the empty state shows
  for (let i = 0; i < 20; i++) {
    if (await page.locator('#view-empty:not(.hidden)').count()) break;
    if (await page.locator('#reveal-btn').isVisible()) await page.click('#reveal-btn');
    await page.keyboard.press('4');            // Easy, via keyboard
    await page.waitForTimeout(450);
  }
  await page.waitForSelector('#view-empty:not(.hidden)');
  const prog1 = await page.evaluate(() => document.getElementById('progress-fill').style.width);
  ok(prog1 === '100%', `progress bar fills to 100% (was ${prog0}, now ${prog1})`);
  ok((await page.locator('#quote-text').textContent()).length > 5, 'empty state shows a rotating saying');
  ok((await page.locator('#done-note').textContent()).includes('הושלמו'), 'empty state says reviews are done');
  await page.screenshot({ path: `${SHOTS}/09-anki-empty.png` });
  snap = await json(`/api/anki?email=${EMAIL}`);
  ok(snap.next === null, 'no card is due after answering them all');

  // back to the chat: restore the saved conversation
  await page.click('text=חזרה ללימוד');
  await page.waitForSelector('#sidebar:not(.hidden)');
  await page.click('text=לזכור את הלימוד');
  await page.waitForSelector('.conv-row');
  await page.click('.conv-open');
  await page.waitForSelector('.verse-box');
  ok((await page.locator('#chat .bubble-user').count()) >= 2, 'opening a saved conversation replays it');
  await page.screenshot({ path: `${SHOTS}/10-restored.png` });

  // finish the lesson: the mock ends it once 4 learner messages were sent
  await page.fill('#user-input', 'תשובה אחרונה');
  await page.click('#send-btn');
  await page.waitForSelector('#modal-finished:not(.hidden)', { timeout: 8000 });
  ok(await page.locator('#fin-anki').isVisible(), 'finishing the chapter offers to create cards');
  await page.screenshot({ path: `${SHOTS}/11-finished.png` });
  const total0 = (await json(`/api/anki?email=${EMAIL}`)).counts.total;
  await page.click('#fin-anki-actions button');
  await page.waitForSelector('#fin-anki-actions a', { timeout: 8000 });
  const total1 = (await json(`/api/anki?email=${EMAIL}`)).counts.total;
  ok(total1 >= total0, 'chapter-end offer ran (' + total0 + ' -> ' + total1 + ')');
  await page.screenshot({ path: `${SHOTS}/12-finished-done.png` });
  await page.context().close();
}

// ───────────── mobile ─────────────
{
  const page = await newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  await page.goto(BASE + '/');
  await page.waitForSelector('#drawer-btn');
  const sbBox = await page.locator('#sidebar').boundingBox();
  ok(sbBox.x + sbBox.width <= 1, 'mobile: sidebar starts off-screen');
  await page.tap('#drawer-btn');
  await page.waitForTimeout(300);
  ok((await page.locator('#sidebar').boundingBox()).x >= -1, 'mobile: hamburger opens the rail as a drawer');
  await page.screenshot({ path: `${SHOTS}/13-mobile-drawer.png` });
  await page.tap('#drawer-scrim', { position: { x: 360, y: 300 } });

  await startLesson(page, true);
  ok(!(await page.locator('#app.split-mode').count()), 'mobile: source text does not auto-open over the chat');
  await page.screenshot({ path: `${SHOTS}/14-mobile-chat.png` });

  await page.tap('#split-view-btn');
  await page.waitForTimeout(400);
  const pb = await page.locator('#text-panel').boundingBox();
  ok(pb.width > 300 && pb.x > 0, 'mobile: source opens as a drawer over the chat');
  await page.screenshot({ path: `${SHOTS}/15-mobile-source.png` });
  // swipe right
  await page.evaluate(() => {
    const el = document.getElementById('chapter-text-scroll');
    const mk = (type, x, y) => new TouchEvent(type, { bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })] });
    el.dispatchEvent(mk('touchstart', 120, 400));
    el.dispatchEvent(mk('touchend', 300, 410));
  });
  await page.waitForTimeout(400);
  ok(!(await page.locator('#app.split-mode').count()), 'mobile: swiping right closes the source drawer');

  // composer fits
  const cb = await page.locator('.composer-box').boundingBox();
  ok(cb.x >= 0 && cb.x + cb.width <= 390, 'mobile: message box fits the screen');

  // practice page on mobile
  await page.goto(BASE + '/anki.html');
  await page.waitForSelector('#view-empty:not(.hidden), #view-card:not(.hidden)');
  ok(await page.locator('#menu-btn').isVisible(), 'mobile: anki page has the menu button');
  await page.screenshot({ path: `${SHOTS}/16-mobile-anki.png` });
  await page.context().close();
}

// ───────────── leaving mid-lesson without clicking a link ─────────────
{
  const page = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + '/');
  await startLesson(page);
  for (const text of ['תשובה א', 'תשובה ב']) {
    const n = await page.locator('#chat .bubble-user').count();
    await page.fill('#user-input', text);
    await page.click('#send-btn');
    await page.waitForFunction((k) => document.querySelectorAll('#chat .bubble-user').length > k && !S.loading, n);
  }
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave', { clientY: -2, bubbles: true })));
  await page.waitForSelector('#modal-anki-exit:not(.hidden)', { timeout: 3000 });
  ok(true, 'pointer leaving through the top edge shows the Anki offer');
  await page.click('text=חזרה ללימוד');
  ok(await page.locator('#modal-anki-exit.hidden').count() === 1, '"חזרה ללימוד" closes the dialog without choosing');
  const dialogs = [];
  page.on('dialog', async (d) => { dialogs.push(d.type()); await d.dismiss(); });
  await page.close({ runBeforeUnload: true }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  ok(dialogs.includes('beforeunload'), 'closing the tab mid-lesson triggers the browser leave prompt');
  ok(await page.locator('#modal-anki-exit:not(.hidden)').count() === 1, 'staying on the page then shows the Anki offer');
  await page.click('#anki-exit-no');
  ok(await page.locator('#modal-anki-exit.hidden').count() === 1, '"לא, תודה" closes the dialog');
}

await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
