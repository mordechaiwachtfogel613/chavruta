// ================================================================
// חברותא – study controls, Anki card creation, saved conversations
// Loaded after app.js (uses its globals: S, SV, COLLECTIONS, getUser, t, …)
// ================================================================

// ── Small helpers ───────────────────────────────────────────────
function isMobileView() {
  return window.matchMedia('(max-width: 640px)').matches;
}

function autoGrowInput(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

function showToast(msg, link) {
  document.querySelectorAll('.toast-msg').forEach(el => el.remove());
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.setAttribute('role', 'status');
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    a.addEventListener('click', (e) => { if (typeof guardNavigation === 'function') guardNavigation(e); });
    el.appendChild(a);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), link ? 6000 : 3500);
}

// Mobile drawer (the left rail)
function toggleDrawer(force) {
  const sb = document.getElementById('sidebar');
  const scrim = document.getElementById('drawer-scrim');
  const open = typeof force === 'boolean' ? force : !sb.classList.contains('drawer-open');
  sb.classList.toggle('drawer-open', open);
  scrim.classList.toggle('show', open);
}
window.addEventListener('resize', () => { if (!isMobileView()) toggleDrawer(false); });

// ── Study controls in the message box ───────────────────────────
const UNIT_NOUNS = {
  tanach:   { masc: true,  one: 'פסוק',  plural: 'פסוקים' },
  mishnah:  { masc: false, one: 'משנה',  plural: 'משניות' },
  shas:     { masc: true,  one: 'קטע',   plural: 'קטעים' },
  rambam:   { masc: false, one: 'הלכה',  plural: 'הלכות' },
  shulchan: { masc: true,  one: 'סעיף',  plural: 'סעיפים' },
};
const COUNT_OPTIONS = [1, 2, 3, 5];
const NUM_WORDS = {
  masc: { 2: 'שני', 3: 'שלושה', 5: 'חמישה' },
  fem:  { 2: 'שתי', 3: 'שלוש',  5: 'חמש' },
};

function countLabel(n, collectionKey) {
  const noun = UNIT_NOUNS[collectionKey] || UNIT_NOUNS.tanach;
  if (n === 1) return `${noun.one} ${noun.masc ? 'אחד' : 'אחת'}`;
  return `${NUM_WORDS[noun.masc ? 'masc' : 'fem'][n]} ${noun.plural}`;
}

const STYLE_OPTIONS = [
  { id: 'general',    short: 'כללי',      label: 'לימוד כללי של הנושא', desc: 'הרעיון המרכזי והתמונה הגדולה' },
  { id: 'particular', short: 'פרטני',     label: 'לימוד פרטני',         desc: 'פרט אחר פרט, מילה אחר מילה' },
  { id: 'free',       short: 'שיח חופשי', label: 'שיח חופשי',           desc: 'שיחה פתוחה, בלי ניקוד' },
  { id: 'deep',       short: 'מעמיק',     label: 'מעמיק',               desc: 'מפרשים, מחלוקות וקשיות' },
];

(function loadStudySettings() {
  try {
    const n = Number(localStorage.getItem('chavruta_units'));
    if (COUNT_OPTIONS.includes(n)) S.unitsPerStep = n;
    const st = localStorage.getItem('chavruta_style');
    if (STYLE_OPTIONS.some(o => o.id === st)) S.studyStyle = st;
  } catch { /* storage unavailable */ }
})();

function refreshToolLabels() {
  const verseMode = S.studyMode === 'iyun' || S.studyMode === 'bekiut';
  const countBtn = document.getElementById('tool-count');
  document.getElementById('tool-count-label').textContent =
    verseMode ? countLabel(1, S.collectionKey) : countLabel(S.unitsPerStep, S.collectionKey);
  countBtn.disabled = verseMode;
  countBtn.title = verseMode ? 'בלימוד בעיון או בבקיאות לומדים פסוק אחד בכל פעם' : 'כמה לקבל בכל פעם';
  const style = STYLE_OPTIONS.find(o => o.id === S.studyStyle) || STYLE_OPTIONS[1];
  document.getElementById('tool-style-label').textContent = style.short;
  document.getElementById('tool-card').disabled = !S.sessionStarted || !S.currentUnits.length;
}

let _openPop = null;

function closeToolPops() {
  document.querySelectorAll('.tool-pop').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.composer-tools .tool-chip[aria-haspopup]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  _openPop = null;
}

function toggleToolPop(which) {
  const pop = document.getElementById('pop-' + which);
  const chip = document.getElementById('tool-' + which);
  if (_openPop === which) { closeToolPops(); return; }
  closeToolPops();

  if (which === 'count') {
    pop.innerHTML = `<div class="tool-pop-title">כמה לקבל בכל פעם</div>` + COUNT_OPTIONS.map(n =>
      `<button type="button" role="radio" aria-checked="${n === S.unitsPerStep}" onclick="pickCount(${n})">
         <span>${countLabel(n, S.collectionKey)}</span><span class="tick">✓</span></button>`).join('');
  } else {
    pop.innerHTML = `<div class="tool-pop-title">סגנון הלימוד</div>` + STYLE_OPTIONS.map(o =>
      `<button type="button" role="radio" aria-checked="${o.id === S.studyStyle}" onclick="pickStyle('${o.id}')">
         <span>${o.label}<small>${o.desc}</small></span><span class="tick">✓</span></button>`).join('');
  }
  // anchor the popover above its chip
  const tools = document.getElementById('composer-tools');
  pop.classList.remove('hidden');
  const right = tools.getBoundingClientRect().right - chip.getBoundingClientRect().right;
  pop.style.right = Math.max(right, 0) + 'px';
  chip.setAttribute('aria-expanded', 'true');
  _openPop = which;
}

function pickCount(n) {
  if (!COUNT_OPTIONS.includes(n)) return;
  S.unitsPerStep = n;
  try { localStorage.setItem('chavruta_units', String(n)); } catch {}
  closeToolPops();
  refreshToolLabels();
}

function pickStyle(id) {
  if (!STYLE_OPTIONS.some(o => o.id === id)) return;
  S.studyStyle = id;
  try { localStorage.setItem('chavruta_style', id); } catch {}
  closeToolPops();
  refreshToolLabels();
}

document.addEventListener('click', (e) => {
  if (_openPop && !e.target.closest('.composer-tools')) closeToolPops();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeToolPops(); });

// keep the labels in sync when the collection / session changes
(function hookLabelRefresh() {
  ['gpCollectionChange', 'startLearning', 'startLearningFromPanel', '_doResetSession'].forEach(name => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...args) {
      const r = orig.apply(this, args);
      Promise.resolve(r).then(refreshToolLabels, refreshToolLabels);
      refreshToolLabels();
      return r;
    };
  });
  refreshToolLabels();
})();

// Swipe right on the source drawer to close it (mobile)
(function swipeToCloseSource() {
  const panel = document.getElementById('text-panel');
  let sx = 0, sy = 0;
  panel.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener('touchend', (e) => {
    const t0 = e.changedTouches[0];
    const dx = t0.clientX - sx, dy = t0.clientY - sy;
    if (isMobileView() && SV.active && dx > 70 && Math.abs(dy) < Math.abs(dx) * 0.6) toggleSplitView();
  }, { passive: true });
})();

// ── Anki cards ──────────────────────────────────────────────────
function assistantText(m) {
  try {
    const d = JSON.parse(m.content);
    return [d.feedback, d.explanation, d.next_question].filter(Boolean).join(' ');
  } catch { return String(m.content || ''); }
}

function buildAnkiContext(scope) {
  const all = S.verses.map((v, i) => ({ num: i + 1, text: v }));
  let verses;
  if (scope === 'chapter') verses = all;
  else if (scope === 'focus') verses = S.currentUnits;
  else verses = all.filter(u => S.learned.has(u.num));
  if (!verses.length) verses = S.currentUnits;

  let msgs = S.messages;
  if (msgs.length && msgs[0].role === 'user' && msgs[0].content === t('aiFirstMessage')) msgs = msgs.slice(1);
  if (scope === 'focus') msgs = msgs.slice(-4);

  return {
    collection: S.collectionKey,
    book: S.book ? S.book.he : '',
    unit: S.book ? buildUnitLabel() : '',
    verses,
    transcript: msgs.map(m => ({ role: m.role, text: m.role === 'assistant' ? assistantText(m) : m.content })),
  };
}

async function ankiGenerate(scope) {
  const user = getUser();
  if (!user) throw new Error('not signed in');
  let tz = 'Asia/Jerusalem';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch {}
  const res = await fetch('/api/anki', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, tz, action: 'generate', scope, context: buildAnkiContext(scope) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function cardsMessage(n) {
  return n === 1 ? 'נוצרה כרטיסייה אחת' : `נוצרו ${n} כרטיסיות`;
}

let _focusBusy = false;
async function createFocusCard() {
  if (_focusBusy) return;
  if (!S.sessionStarted || !S.currentUnits.length) {
    showToast('אפשר ליצור כרטיסייה אחרי שהחברותא מציגה קטע ללימוד.');
    return;
  }
  _focusBusy = true;
  const btn = document.getElementById('tool-card');
  const label = btn.querySelector('span');
  const prev = label.textContent;
  btn.disabled = true; label.textContent = 'יוצר…';
  try {
    const r = await ankiGenerate('focus');
    showToast(r.added ? 'נוצרה כרטיסייה' : 'כרטיסייה כזו כבר קיימת', { href: '/anki.html', text: 'לתרגול' });
  } catch (e) {
    showToast(e.message === 'rate limit' ? 'יצרת הרבה כרטיסיות לאחרונה, נסו שוב מאוחר יותר.' : 'לא הצלחנו ליצור כרטיסייה. נסו שוב.');
  } finally {
    label.textContent = prev; _focusBusy = false; refreshToolLabels();
  }
}

// Offer inside the "finished" dialog
const FIN_ANKI_DEFAULT = 'רוצה שאסכם את מה שלמדנו ואכין כרטיסי זיכרון לחזרה?';

function resetFinAnki() {
  const text = document.getElementById('fin-anki-text');
  const actions = document.getElementById('fin-anki-actions');
  if (!text || !actions) return;
  text.textContent = FIN_ANKI_DEFAULT;
  actions.innerHTML = '';
  const yes = document.createElement('button');
  yes.className = 'btn-dark'; yes.style.cssText = 'padding:8px 16px;font-size:0.88rem;';
  yes.textContent = 'כן, צור כרטיסים';
  yes.onclick = () => offerCreateCards(S.studyMode ? 'session' : 'chapter', 'fin');
  actions.appendChild(yes);
}

async function offerCreateCards(scope) {
  const text = document.getElementById('fin-anki-text');
  const actions = document.getElementById('fin-anki-actions');
  text.textContent = 'מסכם ומכין כרטיסיות…';
  actions.innerHTML = '';
  try {
    const r = await ankiGenerate(scope);
    text.textContent = '';
    if (r.summary) {
      const p = document.createElement('div');
      p.textContent = r.summary; p.style.cssText = 'margin-bottom:8px;';
      text.appendChild(p);
    }
    const b = document.createElement('b');
    b.textContent = r.added ? cardsMessage(r.added) : 'הכרטיסיות כבר קיימות';
    text.appendChild(b);
    S.offerBaseline = S.answers;
    const go = document.createElement('a');
    go.href = '/anki.html'; go.className = 'btn-dark'; go.textContent = 'לתרגול';
    go.style.cssText = 'padding:8px 16px;font-size:0.88rem;text-decoration:none;display:inline-block;';
    actions.appendChild(go);
  } catch (e) {
    text.textContent = 'לא הצלחנו ליצור כרטיסיות כרגע.';
    const retry = document.createElement('button');
    retry.className = 'btn-quiet'; retry.textContent = 'נסו שוב'; retry.style.padding = '6px 14px';
    retry.onclick = () => offerCreateCards(scope);
    actions.appendChild(retry);
  }
}

function resetAnkiSession() {
  S.currentUnits = [];
  S.learned = new Set();
  S.answers = 0;
  S.offerBaseline = 0;
  S.finishedShown = false;
  S.convId = null;
  _mouseLeaveShown = false;
  refreshToolLabels();
}

// ── Leaving in the middle of a lesson ───────────────────────────
let _exitPending = null;
let _mouseLeaveShown = false;
let _exitBusy = false;

// There is something worth keeping: the learner answered at least once
// (three more answers if cards were already offered in this session).
function hasActiveSession() {
  if (!S.sessionStarted || S.greetingMode || S.finishedShown || !S.book) return false;
  return S.answers - S.offerBaseline >= (S.offerBaseline ? 3 : 1);
}

function confirmLeave(action) {
  if (!hasActiveSession()) { action(); return; }
  openExitOffer(action);
}

function guardNavigation(e) {
  if (!hasActiveSession()) return true;
  e.preventDefault();
  const href = e.currentTarget ? e.currentTarget.getAttribute('href') : e.target.closest('a').getAttribute('href');
  openExitOffer(() => { location.href = href; });
  return false;
}

function openExitOffer(action) {
  _exitPending = action || null;
  _exitBusy = false;
  document.getElementById('anki-exit-title').textContent = 'האם ליצור כרטיסי זיכרון על מה שכבר למדנו?';
  document.getElementById('anki-exit-sub').textContent = 'נכין כרטיסיות לחזרה על החומר שלמדת עד עכשיו.';
  ['anki-exit-yes', 'anki-exit-no'].forEach(id => { document.getElementById(id).disabled = false; });
  document.getElementById('anki-exit-yes').textContent = 'כן, צור כרטיסים';
  document.getElementById('modal-anki-exit').classList.remove('hidden');
  document.getElementById('anki-exit-yes').focus();
}

function closeExitOffer() {
  document.getElementById('modal-anki-exit').classList.add('hidden');
}

function runExitPending() {
  const fn = _exitPending;
  _exitPending = null;
  if (fn) fn();
}

function exitOfferCancel() {
  if (_exitBusy) return;
  _exitPending = null;
  closeExitOffer();
}

async function exitOfferAnswer(yes) {
  if (_exitBusy) return;
  if (!yes) {
    S.offerBaseline = S.answers;
    closeExitOffer();
    runExitPending();
    return;
  }
  _exitBusy = true;
  const sub = document.getElementById('anki-exit-sub');
  document.getElementById('anki-exit-yes').disabled = true;
  document.getElementById('anki-exit-no').disabled = true;
  document.getElementById('anki-exit-yes').textContent = 'מכין כרטיסיות…';
  try {
    const r = await ankiGenerate('session');
    S.offerBaseline = S.answers;
    document.getElementById('anki-exit-title').textContent = r.added ? cardsMessage(r.added) + ' ✓' : 'הכרטיסיות כבר קיימות ✓';
    sub.textContent = r.summary || '';
    const hadPending = !!_exitPending;
    setTimeout(() => {
      _exitBusy = false;
      closeExitOffer();
      if (hadPending) runExitPending();
      else showToast(r.added ? cardsMessage(r.added) : 'הכרטיסיות כבר קיימות', { href: '/anki.html', text: 'לתרגול' });
    }, hadPending ? 1200 : 900);
  } catch (e) {
    _exitBusy = false;
    sub.textContent = 'לא הצלחנו ליצור כרטיסיות כרגע. אפשר לנסות שוב או להמשיך בלי.';
    document.getElementById('anki-exit-yes').disabled = false;
    document.getElementById('anki-exit-no').disabled = false;
    document.getElementById('anki-exit-yes').textContent = 'נסו שוב';
  }
}

// Closing the tab / reloading: the browser shows its own "leave site?" prompt;
// if the learner stays, we ask our own question.
window.addEventListener('beforeunload', (e) => {
  if (!hasActiveSession()) return;
  e.preventDefault();
  e.returnValue = '';
  setTimeout(() => {
    if (hasActiveSession() && document.getElementById('modal-anki-exit').classList.contains('hidden')) openExitOffer(null);
  }, 400);
});

// Desktop: pointer leaving through the top edge (towards tabs / close button)
document.addEventListener('mouseleave', (e) => {
  if (e.clientY > 0 || _mouseLeaveShown) return;
  if (!hasActiveSession() || S.answers < 2) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  _mouseLeaveShown = true;
  openExitOffer(null);
});

// ── Saved conversations (the chat history list) ─────────────────
let CONV_LIST = [];
let _convTimer = null;

function saveConversationSoon() {
  clearTimeout(_convTimer);
  _convTimer = setTimeout(saveConversationNow, 1500);
}

async function saveConversationNow() {
  clearTimeout(_convTimer);
  const user = getUser();
  if (!user || !S.sessionStarted || !S.book || S.messages.length < 2) return;
  if (!S.convId) S.convId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const conv = {
    id: S.convId,
    title: `${S.book.he} ${buildUnitLabel()}`,
    collection: S.collectionKey,
    bookHe: S.book.he,
    unit: String(S.unit),
    unitLabel: buildUnitLabel(),
    studyMode: S.studyMode,
    studyVerseIdx: S.studyVerseIdx,
    commentaryText: S.commentaryText || '',
    style: S.studyStyle,
    unitsPerStep: S.unitsPerStep,
    sessionScore: S.sessionScore,
    finished: S.finishedShown,
    messages: S.messages.map(m => ({ role: m.role, content: m.content })),
  };
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, conv }),
    });
    if (!res.ok) return;
    const { ts } = await res.json();
    CONV_LIST = [{ id: conv.id, title: conv.title, collection: conv.collection, bookHe: conv.bookHe,
                   unitLabel: conv.unitLabel, finished: conv.finished, ts },
                 ...CONV_LIST.filter(c => c.id !== conv.id)];
    renderConvList();
  } catch { /* offline: the next answer retries */ }
}

function dayHeading(ts) {
  const d = new Date(ts), now = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'אתמול';
  if (diff < 7) return d.toLocaleDateString('he-IL', { weekday: 'long' });
  return d.toLocaleDateString('he-IL', d.getFullYear() === now.getFullYear()
    ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderConvList() {
  const list = document.getElementById('history-list');
  if (!list) return;
  if (!CONV_LIST.length) {
    list.innerHTML = '<div class="conv-empty">עדיין אין שיחות.<br>השיחות שלך יישמרו כאן אוטומטית.</div>';
    return;
  }
  list.innerHTML = '';
  let lastHeading = null;
  CONV_LIST.slice().sort((a, b) => b.ts - a.ts).forEach(c => {
    const h = dayHeading(c.ts);
    if (h !== lastHeading) {
      const head = document.createElement('div');
      head.className = 'conv-day';
      head.textContent = h;
      list.appendChild(head);
      lastHeading = h;
    }
    const row = document.createElement('div');
    row.className = 'conv-row' + (c.id === S.convId ? ' active' : '');
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'conv-open';
    open.title = c.title;
    open.textContent = c.title;
    open.onclick = () => openConversation(c.id);
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'conv-del'; del.setAttribute('aria-label', 'מחק שיחה');
    del.textContent = '×';
    del.onclick = (ev) => { ev.stopPropagation(); deleteConversation(c.id); };
    row.appendChild(open); row.appendChild(del);
    list.appendChild(row);
  });
}

async function loadHistory() {
  const user = getUser();
  if (!user) return;
  const list = document.getElementById('history-list');
  if (list && !CONV_LIST.length) list.innerHTML = '<div class="conv-empty">טוען…</div>';
  try {
    const res = await fetch(`/api/conversations?email=${encodeURIComponent(user.email)}`);
    if (!res.ok) throw new Error('bad status');
    CONV_LIST = await res.json();
    renderConvList();
  } catch {
    if (list) list.innerHTML = '<div class="conv-empty">לא הצלחנו לטעון את ההיסטוריה.</div>';
  }
}

async function deleteConversation(id) {
  if (!confirm('למחוק את השיחה הזו?')) return;
  const user = getUser();
  try {
    await fetch(`/api/conversations?email=${encodeURIComponent(user.email)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    CONV_LIST = CONV_LIST.filter(c => c.id !== id);
    renderConvList();
  } catch { showToast('המחיקה נכשלה.'); }
}

function openConversation(id) {
  toggleDrawer(false);
  if (id === S.convId) return;
  confirmLeave(() => _openConversation(id));
}

async function _openConversation(id) {
  const user = getUser();
  const spinner = document.getElementById('header-spinner');
  spinner.classList.remove('hidden');
  try {
    await saveConversationNow();
    const res = await fetch(`/api/conversations?email=${encodeURIComponent(user.email)}&id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('not found');
    const conv = await res.json();
    const col = COLLECTIONS[conv.collection];
    const book = col && col.items.find(b => b.he === conv.bookHe);
    if (!book) throw new Error('book missing');

    if (_greetingTimer) { clearTimeout(_greetingTimer); _greetingTimer = null; }
    S.collectionKey = conv.collection;
    S.book = book;
    S.unit = col.type === 'daf' ? conv.unit : parseInt(conv.unit, 10);
    S.studyMode = conv.studyMode;
    S.studyVerseIdx = conv.studyVerseIdx;
    S.commentaryText = conv.commentaryText || null;
    S.steinsaltzCommentary = null;
    S.verses = await fetchContent(S.collectionKey, S.book, S.unit);
    if (S.collectionKey === 'shas' || S.collectionKey === 'tanach') {
      S.steinsaltzCommentary = await fetchSteinsaltz(S.collectionKey, S.book, S.unit);
    }

    resetAnkiSession();
    S.messages = conv.messages.slice();
    S.sessionScore = conv.sessionScore || 0;
    S.sessionStarted = true;
    S.greetingMode = false;
    S.waitingForFirstQuestion = false;
    S.convId = conv.id;

    document.getElementById('modal-finished').classList.add('hidden');
    document.getElementById('greeting-picker').classList.add('hidden');
    document.getElementById('chat-input-row').classList.remove('hidden');
    document.getElementById('header-new-btn').classList.remove('hidden');
    document.getElementById('split-view-btn').classList.remove('hidden');

    SV.commentaryCache = {};
    if (SV.active) renderTextPanel();
    else if (!isMobileView()) _openSplitView();

    const chatEl = document.getElementById('chat');
    chatEl.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'text-center text-sm text-gray-400 mb-4 pb-2 border-b border-parchmentDark';
    header.innerHTML = `<span class="font-semibold" style="color:#C1694F;">${esc(col.label)}</span> | <span class="font-semibold text-navy">${esc(S.book.he)}</span> | ${esc(buildUnitLabel())}`;
    chatEl.appendChild(header);

    let lastFinished = false;
    conv.messages.forEach((m, i) => {
      if (m.role === 'user') {
        if (i === 0 && m.content === t('aiFirstMessage')) return;
        S.answers++;
        renderUser(m.content);
        return;
      }
      let data;
      try { data = JSON.parse(m.content); } catch { return; }
      attachUnits(data);
      if (!data.is_finished && data._units.length) {
        S.currentUnits = data._units;
        data._units.forEach(u => S.learned.add(u.num));
      }
      lastFinished = !!data.is_finished;
      renderAI(data);
    });
    S.offerBaseline = S.answers;
    S.finishedShown = lastFinished || conv.finished;

    document.getElementById('input-area').classList.remove('hidden');
    if (S.finishedShown) {
      setInput(false);
      document.getElementById('input-area').classList.add('hidden');
      rabbiSayBubble('השיעור הזה הסתיים. אפשר לבחור יחידה חדשה בלחיצה על ״שיחה חדשה״.');
    } else {
      setInput(true);
    }
    if (S.currentUnits.length && SV.active) _autoHighlightVerse(S.currentUnits[0].num - 1);
    chatEl.scrollTop = chatEl.scrollHeight;
    refreshToolLabels();
    renderConvList();
  } catch (e) {
    console.error(e);
    showToast('לא הצלחנו לפתוח את השיחה.');
  } finally {
    spinner.classList.add('hidden');
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveConversationNow();
});
