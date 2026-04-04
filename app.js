// ================================================================
// חברותא – אפליקציית לימוד תנ"ך | Frontend Logic
// ================================================================

// ── ספרי התנ"ך עם שמות Sefaria לשליפה ──────────────────────────
const BOOKS = [
  // תורה
  { g:'תורה',    he:'בראשית',         sf:'Genesis',       ch:50 },
  { g:'תורה',    he:'שמות',           sf:'Exodus',        ch:40 },
  { g:'תורה',    he:'ויקרא',          sf:'Leviticus',     ch:27 },
  { g:'תורה',    he:'במדבר',          sf:'Numbers',       ch:36 },
  { g:'תורה',    he:'דברים',          sf:'Deuteronomy',   ch:34 },
  // נביאים
  { g:'נביאים',  he:'יהושע',          sf:'Joshua',        ch:24 },
  { g:'נביאים',  he:'שופטים',         sf:'Judges',        ch:21 },
  { g:'נביאים',  he:'שמואל א',        sf:'I Samuel',      ch:31 },
  { g:'נביאים',  he:'שמואל ב',        sf:'II Samuel',     ch:24 },
  { g:'נביאים',  he:'מלכים א',        sf:'I Kings',       ch:22 },
  { g:'נביאים',  he:'מלכים ב',        sf:'II Kings',      ch:25 },
  { g:'נביאים',  he:'ישעיהו',         sf:'Isaiah',        ch:66 },
  { g:'נביאים',  he:'ירמיהו',         sf:'Jeremiah',      ch:52 },
  { g:'נביאים',  he:'יחזקאל',         sf:'Ezekiel',       ch:48 },
  { g:'נביאים',  he:'הושע',           sf:'Hosea',         ch:14 },
  { g:'נביאים',  he:'יואל',           sf:'Joel',          ch:4  },
  { g:'נביאים',  he:'עמוס',           sf:'Amos',          ch:9  },
  { g:'נביאים',  he:'עובדיה',         sf:'Obadiah',       ch:1  },
  { g:'נביאים',  he:'יונה',           sf:'Jonah',         ch:4  },
  { g:'נביאים',  he:'מיכה',           sf:'Micah',         ch:7  },
  { g:'נביאים',  he:'נחום',           sf:'Nahum',         ch:3  },
  { g:'נביאים',  he:'חבקוק',          sf:'Habakkuk',      ch:3  },
  { g:'נביאים',  he:'צפניה',          sf:'Zephaniah',     ch:3  },
  { g:'נביאים',  he:'חגי',            sf:'Haggai',        ch:2  },
  { g:'נביאים',  he:'זכריה',          sf:'Zechariah',     ch:14 },
  { g:'נביאים',  he:'מלאכי',          sf:'Malachi',       ch:3  },
  // כתובים
  { g:'כתובים',  he:'תהילים',         sf:'Psalms',        ch:150},
  { g:'כתובים',  he:'משלי',           sf:'Proverbs',      ch:31 },
  { g:'כתובים',  he:'איוב',           sf:'Job',           ch:42 },
  { g:'כתובים',  he:'שיר השירים',     sf:'Song of Songs', ch:8  },
  { g:'כתובים',  he:'רות',            sf:'Ruth',          ch:4  },
  { g:'כתובים',  he:'איכה',           sf:'Lamentations',  ch:5  },
  { g:'כתובים',  he:'קהלת',           sf:'Ecclesiastes',  ch:12 },
  { g:'כתובים',  he:'אסתר',           sf:'Esther',        ch:10 },
  { g:'כתובים',  he:'דניאל',          sf:'Daniel',        ch:12 },
  { g:'כתובים',  he:'עזרא',           sf:'Ezra',          ch:10 },
  { g:'כתובים',  he:'נחמיה',          sf:'Nehemiah',      ch:13 },
  { g:'כתובים',  he:'דברי הימים א',   sf:'I Chronicles',  ch:29 },
  { g:'כתובים',  he:'דברי הימים ב',   sf:'II Chronicles', ch:36 },
];

// ── ממיר מספר לאות עברית (גימטריה) ──────────────────────────────
function toHebrew(n) {
  if (!n || n <= 0) return '';
  const map = [
    [400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],
    [90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],
    [40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],
    [9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],
    [4,'ד'],[3,'ג'],[2,'ב'],[1,'א'],
  ];
  if (n === 15) return 'ט"ו';
  if (n === 16) return 'ט"ז';
  let r = '', rem = n;
  for (const [v, l] of map) { while (rem >= v) { r += l; rem -= v; } }
  return r.length === 1 ? r + "'" : r.slice(0, -1) + '"' + r.slice(-1);
}

// ── State ────────────────────────────────────────────────────────
const S = {
  book:          null,   // book object
  chapter:       0,
  verses:        [],     // string[]
  messages:      [],     // Claude conversation
  totalScore:    0,
  sessionScore:  0,
  loading:       false,
};

// ── Init ─────────────────────────────────────────────────────────
function init() {
  S.totalScore = parseInt(localStorage.getItem('chavruta_score') || '0', 10);
  refreshScores();
  buildBookDropdown();
}

// ── Dropdowns ────────────────────────────────────────────────────
function buildBookDropdown() {
  const sel = document.getElementById('book-select');
  const groups = {};
  for (const b of BOOKS) {
    if (!groups[b.g]) groups[b.g] = [];
    groups[b.g].push(b);
  }
  for (const [grp, books] of Object.entries(groups)) {
    const og = document.createElement('optgroup');
    og.label = grp;
    for (const b of books) {
      const o = document.createElement('option');
      o.value = b.sf;
      o.textContent = b.he;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
}

function onBookChange() {
  const sf = document.getElementById('book-select').value;
  const chapSel = document.getElementById('chapter-select');
  const btn = document.getElementById('start-btn');

  S.book = BOOKS.find(b => b.sf === sf) || null;
  chapSel.innerHTML = '';
  btn.disabled = true;

  if (!S.book) {
    chapSel.disabled = true;
    chapSel.innerHTML = '<option value="">— קודם בחר ספר —</option>';
    return;
  }

  chapSel.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— בחר פרק —';
  chapSel.appendChild(placeholder);

  for (let i = 1; i <= S.book.ch; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `פרק ${toHebrew(i)}`;
    chapSel.appendChild(o);
  }
}

function onChapterChange() {
  const v = document.getElementById('chapter-select').value;
  document.getElementById('start-btn').disabled = !v;
}

// ── Sefaria API ──────────────────────────────────────────────────
async function fetchVerses(sfName, chapter) {
  const url =
    `https://www.sefaria.org/api/texts/${encodeURIComponent(sfName)}.${chapter}` +
    `?lang=he&commentary=0&context=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sefaria החזיר ${res.status}`);
  const data = await res.json();

  let he = data.he;
  // Some books nest arrays (e.g. Song of Songs with sub-sections)
  if (Array.isArray(he) && Array.isArray(he[0])) he = he.flat();

  // Strip HTML tags Sefaria sometimes injects
  return he
    .map(v => (typeof v === 'string' ? v.replace(/<[^>]+>/g, '').trim() : ''))
    .filter(Boolean);
}

// ── Start Learning ───────────────────────────────────────────────
async function startLearning() {
  if (!S.book) return;
  S.chapter = parseInt(document.getElementById('chapter-select').value, 10);
  if (!S.chapter) return;

  S.messages      = [];
  S.sessionScore  = 0;

  // Show loading state
  const btn  = document.getElementById('start-btn');
  const load = document.getElementById('loading-sel');
  const err  = document.getElementById('error-sel');
  btn.disabled = true;
  load.classList.remove('hidden');
  err.classList.add('hidden');

  try {
    S.verses = await fetchVerses(S.book.sf, S.chapter);
    if (!S.verses.length) throw new Error('לא נמצאו פסוקים בפרק זה');

    switchToChat();

    // First AI call – kick off with verse 1
    S.messages.push({
      role: 'user',
      content: 'התחל ללמוד. הצג לי את הפסוק הראשון ושאל אותי שאלה עליו.',
    });
    await callAI();

  } catch (e) {
    console.error(e);
    err.textContent = `שגיאה: ${e.message}`;
    err.classList.remove('hidden');
    btn.disabled = false;
  } finally {
    load.classList.add('hidden');
  }
}

// ── Claude API call ──────────────────────────────────────────────
async function callAI() {
  S.loading = true;
  setInput(false);
  const tid = showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:      S.messages,
        chapter_text:  S.verses.map((v, i) => `${i + 1}. ${v}`).join('\n'),
        book_name:     S.book.he,
        chapter_num:   toHebrew(S.chapter),
        total_verses:  S.verses.length,
      }),
    });

    removeTyping(tid);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();

    // Store AI reply in conversation history (as JSON string)
    S.messages.push({ role: 'assistant', content: JSON.stringify(data) });

    processResponse(data);

  } catch (e) {
    removeTyping(tid);
    console.error(e);
    appendError(`שגיאה: ${e.message}`);
    setInput(true);
  } finally {
    S.loading = false;
  }
}

// ── Process AI JSON ──────────────────────────────────────────────
function processResponse(data) {
  // Award score
  if (data.score > 0) addScore(data.score);

  // Update subtitle
  if (data.next_verse_num) {
    document.getElementById('chat-subtitle').textContent =
      `פסוק ${toHebrew(data.next_verse_num)} מתוך ${toHebrew(S.verses.length)} (${data.next_verse_num}/${S.verses.length})`;
  }

  // Override verse text from authoritative local source
  if (data.next_verse_num && S.verses[data.next_verse_num - 1]) {
    data.next_verse = S.verses[data.next_verse_num - 1];
  }

  renderAI(data);

  if (data.is_finished) {
    showFinished();
  } else {
    setInput(true);
    setTimeout(() => document.getElementById('user-input').focus(), 100);
  }
}

// ── Send user answer ─────────────────────────────────────────────
async function sendMessage() {
  const ta = document.getElementById('user-input');
  const text = ta.value.trim();
  if (!text || S.loading) return;
  ta.value = '';
  renderUser(text);
  S.messages.push({ role: 'user', content: text });
  await callAI();
}

async function sendExplain() {
  if (S.loading) return;
  const text = 'לא הבנתי, אנא הסבר לי את הפסוק';
  renderUser(text);
  S.messages.push({ role: 'user', content: text });
  await callAI();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// ── Render helpers ───────────────────────────────────────────────
function renderAI(data) {
  const box = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'bubble-ai rounded-2xl p-4 max-w-2xl';

  let html = '';

  // Feedback
  if (data.feedback) {
    html += `<div class="text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100 leading-relaxed">
               💬 ${esc(data.feedback)}
             </div>`;
  }

  // Explanation block
  if (data.explanation) {
    html += `<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-sm text-blue-800 leading-relaxed">
               <strong>📖 הסבר:</strong> ${esc(data.explanation)}
             </div>`;
  }

  // Verse display (only if not finished)
  if (!data.is_finished && data.next_verse) {
    html += `<div class="verse-box p-4 mb-3">
               <div class="flex items-start gap-3">
                 <span class="flex-shrink-0 font-bold text-gold text-xl mt-0.5">${toHebrew(data.next_verse_num)}</span>
                 <p class="text-lg font-semibold leading-loose">${esc(data.next_verse)}</p>
               </div>
             </div>`;
  }

  // Question
  if (!data.is_finished && data.next_question) {
    html += `<div class="text-base font-medium leading-relaxed">
               <span class="text-navy">❓</span> ${esc(data.next_question)}
             </div>`;
  }

  wrap.innerHTML = html;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

function renderUser(text) {
  const box = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'flex';
  wrap.innerHTML = `<div class="bubble-user rounded-2xl px-4 py-3 max-w-lg leading-relaxed" style="margin-left:auto">${esc(text)}</div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

function appendError(msg) {
  const box = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.className = 'bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm';
  d.textContent = msg;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

function showTyping() {
  const box = document.getElementById('chat-messages');
  const id  = 'typing-' + Date.now();
  const d   = document.createElement('div');
  d.id = id;
  d.className = 'bubble-ai rounded-2xl p-4 inline-flex items-center gap-1.5 text-sm text-gray-400';
  d.innerHTML = `<span class="dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                 <span class="dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                 <span class="dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                 <span class="mr-2">חברותא חושב…</span>`;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

// ── Score ────────────────────────────────────────────────────────
function addScore(pts) {
  S.totalScore   += pts;
  S.sessionScore += pts;
  localStorage.setItem('chavruta_score', S.totalScore);
  refreshScores();
  popScore(pts);
}

function refreshScores() {
  document.getElementById('score-sel').textContent  = S.totalScore;
  document.getElementById('score-chat').textContent = S.totalScore;
}

function popScore(pts) {
  const el = document.getElementById('score-popup');
  const inner = el.firstElementChild;
  inner.textContent = `+${pts}`;
  inner.className = inner.className.replace(' score-pop', '');
  el.classList.remove('hidden');
  // Trigger reflow then animate
  void inner.offsetWidth;
  inner.className += ' score-pop';
  setTimeout(() => { el.classList.add('hidden'); inner.className = inner.className.replace(' score-pop', ''); }, 1600);
}

// ── Screen transitions ───────────────────────────────────────────
function switchToChat() {
  document.getElementById('screen-selection').classList.add('hidden');
  const chat = document.getElementById('screen-chat');
  chat.classList.remove('hidden');
  chat.classList.add('flex');
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('chat-title').textContent =
    `${S.book.he} פרק ${toHebrew(S.chapter)}`;
  document.getElementById('chat-subtitle').textContent = 'מתחיל…';
  document.getElementById('input-area').classList.remove('hidden');
  document.getElementById('finished-modal').classList.add('hidden');
}

function showFinished() {
  setInput(false);
  document.getElementById('input-area').classList.add('hidden');
  document.getElementById('fin-msg').textContent =
    `סיימת את ${S.book.he} פרק ${toHebrew(S.chapter)}!`;
  document.getElementById('fin-score').textContent =
    `צברת ${S.sessionScore} נקודות (סה"כ: ${S.totalScore})`;
  document.getElementById('finished-modal').classList.remove('hidden');
}

function goHome() {
  document.getElementById('finished-modal').classList.add('hidden');
  document.getElementById('screen-chat').classList.add('hidden');
  document.getElementById('screen-chat').classList.remove('flex');
  document.getElementById('screen-selection').classList.remove('hidden');
  // Re-enable start button
  document.getElementById('start-btn').disabled =
    !document.getElementById('chapter-select').value;
}

// ── Utils ────────────────────────────────────────────────────────
function setInput(on) {
  const area = document.getElementById('input-area');
  area.querySelectorAll('button, textarea').forEach(el => {
    el.disabled = !on;
    el.style.opacity = on ? '' : '0.5';
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

// ── Bootstrap ────────────────────────────────────────────────────
init();
