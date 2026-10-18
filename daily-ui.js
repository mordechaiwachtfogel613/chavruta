// ================================================================
// חברותא – "הלימוד היומי שלי" (UI)
// Loaded with `defer` after app.js / study-tools.js. Talks to /api/daily.
// Hooks in app.js: showGreeting() → dailyRenderCard(), showFinished() → dailyOnFinished().
// ================================================================
(function () {
  const OPEN_COLLECTIONS = ['tanach', 'mishnah', 'rambam', 'shulchan'];
  let D = null;          // last state from the server
  let choosing = false;  // modal is showing the track picker
  let lastFocus = null;

  const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'Asia/Jerusalem'; } };
  const $ = (id) => document.getElementById(id);
  const visible = () => typeof isAdmin === 'function' && isAdmin() && !!getUser();   // first rollout: admin only

  async function api(method, payload) {
    const u = getUser();
    if (!u) throw new Error('no user');
    const res = method === 'GET'
      ? await fetch(`/api/daily?email=${encodeURIComponent(u.email)}&tz=${encodeURIComponent(tz())}`)
      : await fetch('/api/daily', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, tz: tz(), ...payload }),
        });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  function trackInfo(tr) {
    const col = COLLECTIONS[tr?.collectionKey];
    const book = col?.items.find(b => b.sf === tr.bookKey);
    if (!col || !book) return null;
    return { col, book, unitText: `${col.unitLabel} ${toHebrew(tr.pointer)}`, label: `${book.he} ${col.unitLabel} ${toHebrew(tr.pointer)}` };
  }

  function streakText() {
    return D && D.streak >= 2 ? `${D.streak} ימים ברצף` : '';
  }

  // One-line status used by the card and the modal
  function statusLine() {
    if (!D) return 'טוען...';
    if (D.finished) return 'סיימת את המסלול. מוכנים לבחור את הבא?';
    const info = D.track && trackInfo(D.track);
    if (!info) return D.track ? 'בחר מסלול לימוד' : 'עוד לא בחרת מסלול לימוד יומי';
    return D.doneToday ? `הושלם היום ✓ — מחר: ${info.label}` : `היום: ${info.label}`;
  }

  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) Object.assign(e, props);
    if (text != null) e.textContent = text;
    return e;
  }

  // ── Card on the greeting screen ───────────────────────────────
  function renderCard() {
    const old = $('daily-card');
    const welcome = $('welcome');
    if (!visible() || !welcome) { if (old) old.remove(); return; }
    const card = old || el('div', { id: 'daily-card' });
    card.style.cssText = 'margin:18px auto 0;max-width:340px;background:#F1EEE6;border:1px solid #DCD6C8;border-radius:14px;padding:12px 14px;text-align:center;';
    card.setAttribute('aria-live', 'polite');
    card.replaceChildren();
    card.appendChild(el('div', { style: 'font-size:0.78rem;color:#6B7280;margin-bottom:2px;' }, 'הלימוד היומי שלי'));
    card.appendChild(el('div', { style: 'font-weight:700;color:#262220;font-size:0.95rem;' }, statusLine()));
    const s = streakText();
    if (s) card.appendChild(el('div', { style: 'font-size:0.8rem;color:#C1694F;margin-top:2px;' }, s));
    if (D) {
      const info = D.track && !D.finished && trackInfo(D.track);
      const b = el('button', { className: 'btn-dark', type: 'button', style: 'margin-top:8px;padding:7px 16px;font-size:0.88rem;' },
        info ? (D.doneToday ? 'ללמוד עוד' : 'התחל') : 'בחר מסלול');
      b.setAttribute('aria-label', info ? `התחל ${info.label}` : 'בחר מסלול לימוד יומי');
      b.onclick = () => (info ? startDailyUnit() : openDaily(true));
      card.appendChild(b);
    }
    if (!old) welcome.appendChild(card);
  }

  async function loadDaily() {
    if (!visible()) { const n = $('daily-nav-btn'); if (n) n.style.display = 'none'; renderCard(); return; }
    const n = $('daily-nav-btn'); if (n) n.style.display = 'flex';
    try { D = await api('GET'); } catch { /* keep the old state; the card says nothing wrong */ }
    renderCard();
    if (!$('modal-daily').classList.contains('hidden')) renderModal();
  }

  // ── Modal ─────────────────────────────────────────────────────
  function openDaily(pick) {
    if (typeof toggleDrawer === 'function') toggleDrawer(false);
    lastFocus = document.activeElement;
    choosing = !!pick || !D || !D.track || D.finished || !trackInfo(D.track);
    renderModal();
    $('modal-daily').classList.remove('hidden');
    const f = $('daily-body').querySelector('button, select');
    if (f) f.focus();
    loadDaily();
  }

  function closeDaily() {
    $('modal-daily').classList.add('hidden');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderModal() {
    const body = $('daily-body');
    body.replaceChildren();
    if (!D) { body.appendChild(el('p', { style: 'color:#6B7280;' }, 'טוען...')); return; }
    if (choosing) return renderPicker(body);

    const info = trackInfo(D.track);
    body.appendChild(el('p', { style: 'font-weight:700;font-size:1.05rem;margin:0 0 4px;' }, statusLine()));
    const s = streakText();
    body.appendChild(el('p', { style: 'color:#C1694F;font-size:0.88rem;margin:0 0 4px;min-height:1.2em;' }, s));
    if (D.totalDays) body.appendChild(el('p', { style: 'color:#6B7280;font-size:0.82rem;margin:0 0 12px;' }, `סך הכל ${D.totalDays} ימי לימוד`));
    const actions = el('div', { className: 'anki-offer-actions' });
    const go = el('button', { className: 'btn-dark', type: 'button' }, D.doneToday ? 'ללמוד עוד' : 'התחל');
    go.setAttribute('aria-label', `התחל ${info.label}`);
    go.onclick = startDailyUnit;
    const skip = el('button', { className: 'btn-quiet', type: 'button' }, 'דלג ליחידה הבאה');
    skip.onclick = skipUnit;
    const change = el('button', { className: 'btn-quiet', type: 'button' }, 'החלף מסלול');
    change.onclick = () => { choosing = true; renderModal(); };
    actions.append(go, skip, change);
    body.appendChild(actions);
    if (D.error) body.appendChild(el('p', { style: 'color:#B3402A;font-size:0.82rem;margin-top:8px;' }, D.error));
  }

  function renderPicker(body) {
    const hasTrack = D.track && !D.finished;
    body.appendChild(el('p', { style: 'margin:0 0 10px;color:#262220;' },
      D.finished ? 'סיימת את המסלול. בחר מסלול חדש.' : 'בחר מסלול: יחידה אחת בכל יום, ממשיכים מאיפה שעצרנו.'));
    const mk = (id, label) => {
      const s = el('select', { id, className: 'header-select' });
      s.setAttribute('aria-label', label);
      s.style.cssText = 'display:block;width:100%;margin-bottom:8px;';
      return s;
    };
    const colSel = mk('daily-col', 'אוסף'), bookSel = mk('daily-book', 'ספר'), unitSel = mk('daily-unit', 'יחידה');
    OPEN_COLLECTIONS.forEach(k => colSel.appendChild(el('option', { value: k }, COLLECTIONS[k].label)));
    const fillBooks = () => {
      bookSel.replaceChildren();
      COLLECTIONS[colSel.value].items.forEach(b => bookSel.appendChild(el('option', { value: b.sf }, b.he)));
      fillUnits();
    };
    const fillUnits = () => {
      const col = COLLECTIONS[colSel.value];
      const b = col.items.find(x => x.sf === bookSel.value);
      unitSel.replaceChildren();
      for (let i = 1; i <= (b ? b.ch : 0); i++) unitSel.appendChild(el('option', { value: i }, `${col.unitLabel} ${toHebrew(i)}`));
    };
    colSel.onchange = fillBooks; bookSel.onchange = fillUnits;
    fillBooks();
    body.append(colSel, bookSel, unitSel);
    const actions = el('div', { className: 'anki-offer-actions' });
    const ok = el('button', { className: 'btn-dark', type: 'button' }, 'שמור מסלול');
    ok.onclick = async () => {
      if (hasTrack && !confirm('להחליף מסלול? ההיסטוריה והרצף נשמרים.')) return;
      ok.disabled = true;
      try {
        D = await api('POST', { action: 'setTrack', collectionKey: colSel.value, bookKey: bookSel.value, unit: Number(unitSel.value) });
        choosing = false; renderModal(); renderCard();
      } catch { ok.disabled = false; body.appendChild(el('p', { style: 'color:#B3402A;font-size:0.82rem;' }, 'לא הצלחנו לשמור כרגע. אפשר לנסות שוב.')); }
    };
    actions.appendChild(ok);
    if (hasTrack) {
      const back = el('button', { className: 'btn-quiet', type: 'button' }, 'חזרה');
      back.onclick = () => { choosing = false; renderModal(); };
      actions.appendChild(back);
    }
    body.appendChild(actions);
  }

  async function skipUnit() {
    try { D = await api('POST', { action: 'skip' }); } catch { D = { ...D, error: 'לא הצלחנו לדלג כרגע.' }; }
    renderModal(); renderCard();
  }

  // ── Start the day's unit (same path as the greeting picker's "start") ──
  function startDailyUnit() {
    const tr = D && D.track, info = tr && trackInfo(tr);
    if (!info) { openDaily(true); return; }
    closeDaily();
    const run = () => {
      S.collectionKey = tr.collectionKey;
      S.book = info.col.items.find(b => b.sf === tr.bookKey);
      S.unit = String(tr.pointer);
      gpStart();
    };
    if (typeof confirmLeave === 'function' && !S.greetingMode) {
      confirmLeave(() => { _doResetSession(); run(); });
    } else run();
  }

  // ── Called from showFinished() ────────────────────────────────
  async function onFinished() {
    try {
      if (!visible() || !D || !D.track || D.finished || !S.book) return;
      if (S.collectionKey !== D.track.collectionKey || S.book.sf !== D.track.bookKey || Number(S.unit) !== D.track.pointer) return;
      const payload = { action: 'done', collectionKey: S.collectionKey, bookKey: S.book.sf, unit: Number(S.unit) };
      let r;
      try { r = await api('POST', payload); } catch { r = await api('POST', payload); }   // one retry
      D = r;
      if (r.counted) {
        let p = $('fin-daily');
        if (!p) {
          p = el('p', { id: 'fin-daily', style: 'color:#6B7280;font-size:0.88rem;margin:-6px 0 10px;' });
          p.setAttribute('aria-live', 'polite');
          $('fin-score').after(p);
        }
        p.textContent = 'הלימוד היומי הושלם ✓' + (r.streak >= 2 ? ` · ${r.streak} ימים ברצף` : '');
      }
    } catch { /* silent: stays local, nothing blocks the learner */ }
  }

  window.openDaily = openDaily;
  window.closeDaily = closeDaily;
  window.loadDaily = loadDaily;
  window.dailyRenderCard = () => { renderCard(); if (!D) loadDaily(); };
  window.dailyOnFinished = onFinished;

  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadDaily(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal-daily').classList.contains('hidden')) closeDaily(); });
  // isAdmin/getUser are ready once init() has run; try a couple of times after load
  window.addEventListener('load', () => { loadDaily(); setTimeout(loadDaily, 1500); setTimeout(loadDaily, 4000); });
})();
