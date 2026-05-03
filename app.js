// ================================================================
// חברותא – אפליקציית לימוד | Frontend Logic
// ================================================================

// ── Default prompts (must be before all functions that reference them) ──
const RABBI_PERSONA = `אתה רבי בניהו — רב חכם, סבלני ואוהב תורה, שלומד יחד עם התלמיד בשמחה. דבר בחמימות ובעידוד, כאילו אתה יושב לימוד עם תלמיד יקר. `;
const DEFAULT_ADMIN_PROMPTS = {
  tanach:   RABBI_PERSONA + `תלמד תנ"ך פסוק אחר פסוק, ותשאל שאלות על פשט, הקשר ספרותי, ומשמעות רוחנית.`,
  mishnah:  RABBI_PERSONA + `תלמד משנה אחת בכל פעם, ותשאל שאלות על הדין, מחלוקת התנאים, טעם ההלכה ויישומה.`,
  shas:     RABBI_PERSONA + `תלמד גמרא עמוד אחר עמוד, ותשאל שאלות על שקלא וטריא, פירוש המושגים, ומסקנת הסוגיה.`,
  rambam:   RABBI_PERSONA + `תלמד רמב"ם הלכה אחת בכל פעם, ותשאל שאלות על ההלכה, מקורה, ויישומה המעשי.`,
  shulchan: RABBI_PERSONA + `תלמד שולחן ערוך סעיף אחד בכל פעם, ותשאל שאלות על ההלכה, מחלוקות הפוסקים, ומנהג.`,
};
const DEFAULT_IYUN_PROMPT   = RABBI_PERSONA + `אתה לומד בעיון עמוק פסוק אחד עם התלמיד. הפסוק ופירושי המפרשים שנבחרו מסופקים לך.\nצטט את המפרשים בשמם, הצג מחלוקות ביניהם, וחבר בין דבריהם לפשט הפסוק. שאל שאלות מעמיקות שמעוררות מחשבה.`;
const DEFAULT_BEKIUT_PROMPT = RABBI_PERSONA + `אתה לומד בבקיאות פסוק אחד עם התלמיד. הפסוק ופירושי המפרשים שנבחרו מסופקים לך.\nהצג את עיקר הפסוק ועיקר דברי כל מפרש בקצרה. שאל שאלות קצרות שבודקות הבנה בסיסית של הפסוק ודברי המפרשים.`;
const DEFAULT_GREETING = `שלום! כאן רבי בניהו 👋
יחד נעמיק בתורה הקדושה.
בחר אוסף, ספר ויחידה — ואני אתחיל ללמוד איתך חברותא.
מה תרצה ללמוד היום? 📖`;

let GLOBAL_MODEL         = null; // loaded from server on init
let GLOBAL_GREETING_HE   = null; // loaded from server on init (Hebrew greeting)
let GLOBAL_GREETING_EN   = null; // loaded from server on init (English greeting)
let GLOBAL_PROMPTS       = {};   // loaded from server on init
let GLOBAL_PROMPT_IYUN        = null;  // verse-mode iyun prompt
let GLOBAL_PROMPT_BEKIUT      = null;  // verse-mode bekiut prompt
let GLOBAL_VERSE_MODE_ENABLED = false; // verse-mode buttons enabled (admin-controlled)
let GLOBAL_THINKING_MSGS = null; // custom thinking messages from admin
let SOUND_CORRECT     = null; // custom correct-answer sound (data URL)
let SOUND_WRONG       = null; // custom wrong-answer sound (data URL)
let SHARE_CARD_CONFIG = {     // share card design, overridden from server
  theme: 'dark',
  headerText: 'חברותא | שירת התורה',
  subtitle: 'לימוד תורה אינטראקטיבי',
  learnedText: 'למדתי היום את',
  scoreText: 'וצברתי {score} נקודות',
  ctaText: 'בוא ללמוד תורה גם אתה!',
  siteUrl: 'chavruta.vercel.app',
};

async function loadGlobalConfig() {
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    GLOBAL_MODEL         = d.model;
    GLOBAL_GREETING_HE   = d.greetingHe || d.greeting || null;
    GLOBAL_GREETING_EN   = d.greetingEn || null;
    GLOBAL_PROMPTS       = d.prompts  || {};
    GLOBAL_PROMPT_IYUN        = d.prompts?.iyun   || null;
    GLOBAL_PROMPT_BEKIUT      = d.prompts?.bekiut || null;
    GLOBAL_VERSE_MODE_ENABLED = d.verseModeEnabled === true;
    _applyVerseModeEnabled(GLOBAL_VERSE_MODE_ENABLED);
    GLOBAL_THINKING_MSGS = Array.isArray(d.thinkingMsgs) && d.thinkingMsgs.length ? d.thinkingMsgs : null;
    SOUND_CORRECT   = d.sound_correct || null;
    SOUND_WRONG     = d.sound_wrong   || null;
    if (d.shareCard) SHARE_CARD_CONFIG = { ...SHARE_CARD_CONFIG, ...d.shareCard };
  } catch { GLOBAL_MODEL = 'anthropic/claude-opus-4'; }
}
loadGlobalConfig();

// ── i18n ─────────────────────────────────────────────────────────
let currentLang = localStorage.getItem('chavruta_lang') || 'he';

const TRANSLATIONS = {
  he: {
    appName: 'חברותא',
    adminBtn: '⚙️ ניהול',
    newChatBtn: 'שיחה חדשה ↺',
    scoreLabel: 'ניקוד',
    historyBtn: '📚 הלמידה שלי',
    logoutBtn: 'יציאה',
    langToggle: '🌐 EN',
    rabbiName: 'רבי בניהו',
    landingTitle: 'שלום, כאן רבי בניהו',
    landingSub: 'חברותא – בינה מלאכותית ללימוד תורה',
    landingAccurate: 'שתמיד נשאר מדויק',
    landingHook: 'מתקשה להתרכז לאורך זמן?',
    landingHookSub: 'החברותא החדש שלך יגרום לך להתמכר ללימוד תורה',
    landingBtn: 'אני מעוניין ללמוד עם רבי בניהו ✦',
    registerTitle: 'ברוכים הבאים לחברותא',
    registerSub: 'הצטרפו ותלמדו עם רבי בניהו 📖',
    registerCollections: 'תנ"ך • משנה • גמרא • רמב"ם • שולחן ערוך',
    fullNameLabel: 'שם מלא',
    emailLabel: 'כתובת מייל',
    fullNamePlaceholder: 'ישראל ישראלי',
    emailPlaceholder: 'israel@example.com',
    signInBtn: 'כניסה ✦',
    errInvalidName: 'נא להזין שם מלא (לפחות 2 תווים)',
    errInvalidEmail: 'נא להזין כתובת מייל תקינה',
    errNetwork: 'שגיאת רשת, נסה שוב',
    sendingBtn: 'שולח...',
    pendingTitle: 'בקשתך התקבלה!',
    pendingMsg: 'רבי בניהו מחכה לך — חשבונך ממתין לאישור המנהל.',
    pendingSubmsg: 'לאחר שהמנהל יאשר את הצטרפותך, תוכל להתחיל ללמוד.',
    logoutConfirmBtn: 'התנתק',
    greetingHello: 'שלום',
    greetingName: 'אני רבי בניהו',
    greetingSubtitle: 'יחד נעמיק בתורה הקדושה',
    greetingStartBtn: 'אני רוצה ללמוד עם רבי בניהו',
    chooseStudy: '📖 בחר מה ללמוד:',
    startBtn: 'התחל ✦',
    chatPlaceholder: 'כתוב את תשובתך כאן...',
    sendBtn: 'שלח',
    congratsTitle: 'כל הכבוד! 🎉',
    finishedUnit: 'סיימת את היחידה!',
    shareWhatsapp: '📱 שתף בוואטסאפ',
    chooseNewUnit: 'בחר יחידה חדשה',
    historyTitle: '📚 מסע הלמידה שלי',
    statUnits: 'יחידות שנלמדו',
    statScore: 'נקודות כוללות',
    statBooks: 'ספרים שנלמדו',
    recentChats: '📅 שיחות אחרונות',
    progressByBook: '📊 התקדמות לפי ספר',
    exchanges: 'תגובות',
    historyEmpty: 'עדיין לא למדת יחידות',
    historyEmptySub: 'התחל ללמוד ותתחיל לבנות את מסע הלמידה שלך!',
    historyLoading: 'טוען...',
    historyError: 'שגיאה בטעינת ההיסטוריה.',
    errUnitNotFound: 'היחידה לא נמצאה בספריא',
    errUnitNotFoundDetail: 'ייתכן שהפרק שביקשת עדיין לא קיים בספריא, נסה יחידה אחרת.',
    errSefariaDown: 'ספריא אינה זמינה כרגע',
    errSefariaDownDetail: 'שרת ספריא.org אינו מגיב. זה לרוב זמני — נסה שוב בעוד כמה דקות.',
    errOccurred: 'אירעה שגיאה',
    errTimeout: 'הבקשה ארכה יותר מדי זמן — נסה שוב.',
    errTryOther: 'בחר יחידה אחרת מהתפריט או נסה שוב.',
    parseErrMsg: 'לא הצלחתי להבין מה תרצה ללמוד. נסה כך:',
    parseErrOr: 'או בחר מהתפריט ולחץ התחל.',
    adminUsersLoading: 'טוען...',
    adminUsersEmpty: 'אין משתמשים רשומים.',
    adminUsersError: 'שגיאה בטעינה.',
    pickerBook: 'ספר',
    pickerUnit: 'יחידה',
    pickerMasechet: 'מסכת',
    pickerPerek: 'פרק',
    pickerDaf: 'דף',
    pickerChelek: 'חלק',
    pickerSiman: 'סימן',
    logoutConfirmMsg: 'להתנתק? הניקוד שלך יישמר.',
    aiFirstMessage: 'התחל ללמוד. הצג לי את הפסוק הראשון ושאל אותי שאלה עליו.',
    explainRequest: 'לא הבנתי, אנא הסבר לי את הפסוק',
    explanationLabel: '📖 הסבר:',
    wrongText: '✗ לא נכון',
    userGreeting: (name) => `שלום, ${name} 👋`,
    finMsg: (book, unit) => `סיימת את ${book} ${unit}!`,
    finScore: (session, total) => `צברת ${session} נקודות (סה"כ: ${total})`,
    thinkingMsgs: [
      'רבי בניהו הולך לאוצר הספרים',
      'רבי בניהו מצא את הספר במדף גבוה',
      'רבי בניהו מעלעל בדפי הספר',
      'רבי בניהו חוכך בדעתו',
      'רבי בניהו לוגם מהקפה שלו (אחרי שהתקרר)',
      'רבי בניהו נזכר בסברא מיוחדת',
      'רבי בניהו מתעמק בסוגיא',
    ],
    defaultGreeting: `שלום! כאן רבי בניהו 👋\nיחד נעמיק בתורה הקדושה.\nבחר אוסף, ספר ויחידה — ואני אתחיל ללמוד איתך חברותא.\nמה תרצה ללמוד היום? 📖`,
  },
  en: {
    appName: 'Chavruta',
    adminBtn: '⚙️ Admin',
    newChatBtn: 'New Chat ↺',
    scoreLabel: 'Score',
    historyBtn: '📚 My Learning',
    logoutBtn: 'Sign Out',
    langToggle: '🌐 עב',
    rabbiName: 'Rabbi Binyahu',
    landingTitle: 'Shalom, I am Rabbi Binyahu',
    landingSub: 'Chavruta – AI-powered Torah learning',
    landingAccurate: 'Always accurate to the sources',
    landingHook: 'Having trouble focusing for long?',
    landingHookSub: 'Your new Chavruta will get you addicted to Torah learning',
    landingBtn: 'I want to learn with Rabbi Binyahu ✦',
    registerTitle: 'Welcome to Chavruta',
    registerSub: 'Join and learn with Rabbi Binyahu 📖',
    registerCollections: 'Tanach • Mishnah • Gemara • Rambam • Shulchan Aruch',
    fullNameLabel: 'Full Name',
    emailLabel: 'Email Address',
    fullNamePlaceholder: 'John Smith',
    emailPlaceholder: 'john@example.com',
    signInBtn: 'Sign In ✦',
    errInvalidName: 'Please enter your full name (at least 2 characters)',
    errInvalidEmail: 'Please enter a valid email address',
    errNetwork: 'Network error, please try again',
    sendingBtn: 'Sending...',
    pendingTitle: 'Your request has been received!',
    pendingMsg: 'Rabbi Binyahu is waiting for you — your account is pending admin approval.',
    pendingSubmsg: 'Once the admin approves your request, you can start learning.',
    logoutConfirmBtn: 'Sign Out',
    greetingHello: 'Shalom',
    greetingName: 'I am Rabbi Binyahu',
    greetingSubtitle: 'Together we will deepen in the Holy Torah',
    greetingStartBtn: 'I want to learn with Rabbi Binyahu',
    chooseStudy: '📖 Choose what to study:',
    startBtn: 'Start ✦',
    chatPlaceholder: 'Write your answer here...',
    sendBtn: 'Send',
    congratsTitle: 'Well done! 🎉',
    finishedUnit: 'You finished the unit!',
    shareWhatsapp: '📱 Share on WhatsApp',
    chooseNewUnit: 'Choose New Unit',
    historyTitle: '📚 My Learning Journey',
    statUnits: 'Units Studied',
    statScore: 'Total Points',
    statBooks: 'Books Studied',
    recentChats: '📅 Recent Conversations',
    progressByBook: '📊 Progress by Book',
    exchanges: 'exchanges',
    historyEmpty: 'You have not studied any units yet',
    historyEmptySub: 'Start learning and build your learning journey!',
    historyLoading: 'Loading...',
    historyError: 'Error loading history.',
    errUnitNotFound: 'The unit was not found in Sefaria',
    errUnitNotFoundDetail: 'The chapter you requested may not yet exist in Sefaria. Try another unit.',
    errSefariaDown: 'Sefaria is currently unavailable',
    errSefariaDownDetail: 'The Sefaria.org server is not responding. This is usually temporary — try again in a few minutes.',
    errOccurred: 'An error occurred',
    errTimeout: 'The request took too long — please try again.',
    errTryOther: 'Choose another unit from the menu or try again.',
    parseErrMsg: "I could not understand what you'd like to study. Try like this:",
    parseErrOr: 'Or select from the menu and click Start.',
    adminUsersLoading: 'Loading...',
    adminUsersEmpty: 'No registered users.',
    adminUsersError: 'Loading error.',
    pickerBook: 'Book',
    pickerUnit: 'Unit',
    pickerMasechet: 'Tractate',
    pickerPerek: 'Chapter',
    pickerDaf: 'Folio',
    pickerChelek: 'Section',
    pickerSiman: 'Siman',
    logoutConfirmMsg: 'Sign out? Your score will be saved.',
    aiFirstMessage: 'Begin the lesson. Show me the first passage and ask me a question about it.',
    explainRequest: 'I did not understand, please explain this passage to me',
    explanationLabel: '📖 Explanation:',
    wrongText: '✗ Wrong',
    userGreeting: (name) => `Shalom, ${name} 👋`,
    finMsg: (book, unit) => `You finished ${book} ${unit}!`,
    finScore: (session, total) => `You earned ${session} points (total: ${total})`,
    thinkingMsgs: [
      'Rabbi Binyahu is going to the library',
      'Rabbi Binyahu found the book on a high shelf',
      'Rabbi Binyahu is leafing through the pages',
      'Rabbi Binyahu is deep in thought',
      'Rabbi Binyahu is sipping his coffee (after it cooled down)',
      'Rabbi Binyahu recalled a special insight',
      'Rabbi Binyahu is delving into the sugya',
    ],
    defaultGreeting: `Shalom! This is Rabbi Binyahu 👋\nTogether we will deepen in the Holy Torah.\nChoose a collection, book and unit — and I will start learning with you.\nWhat would you like to study today? 📖`,
  }
};

function t(key) {
  const val = TRANSLATIONS[currentLang]?.[key];
  return val !== undefined ? val : (TRANSLATIONS.he[key] ?? key);
}

function toggleLang() {
  currentLang = currentLang === 'he' ? 'en' : 'he';
  localStorage.setItem('chavruta_lang', currentLang);
  applyLang();
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = t('langToggle');
  // Update wrong popup text
  const wrongInner = document.getElementById('wrong-popup-inner');
  if (wrongInner) wrongInner.textContent = t('wrongText');
  // Switch chat direction based on language
  const isHe = currentLang === 'he';
  const chatEl = document.getElementById('chat');
  if (chatEl) chatEl.dir = isHe ? '' : 'ltr';
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.style.direction = isHe ? 'rtl' : 'ltr';
}

function getPickerLabels(key) {
  return {
    tanach:   { book: t('pickerBook'),     unit: t('pickerPerek')   },
    mishnah:  { book: t('pickerMasechet'), unit: t('pickerPerek')   },
    shas:     { book: t('pickerMasechet'), unit: t('pickerDaf')     },
    rambam:   { book: t('pickerBook'),     unit: t('pickerPerek')   },
    shulchan: { book: t('pickerChelek'),   unit: t('pickerSiman')   },
  }[key] || { book: t('pickerBook'), unit: t('pickerUnit') };
}

// ── Audio ────────────────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playCorrectSound() {
  try {
    if (SOUND_CORRECT) { const a = new Audio(SOUND_CORRECT); a.volume = 0.7; a.play(); return; }
    const ctx = getAudioCtx();
    [[659.25, 0], [783.99, 0.1], [987.77, 0.22]].forEach(([freq, t]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.45);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.45);
    });
  } catch { /* silent */ }
}

function playWrongSound() {
  try {
    if (SOUND_WRONG) { const a = new Audio(SOUND_WRONG); a.volume = 0.7; a.play(); return; }
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(230, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent */ }
}

// ── תנ"ך ────────────────────────────────────────────────────────
const TANACH = [
  // תורה
  { g:'תורה',    he:'בראשית',        sf:'Genesis',       ch:50 },
  { g:'תורה',    he:'שמות',          sf:'Exodus',        ch:40 },
  { g:'תורה',    he:'ויקרא',         sf:'Leviticus',     ch:27 },
  { g:'תורה',    he:'במדבר',         sf:'Numbers',       ch:36 },
  { g:'תורה',    he:'דברים',         sf:'Deuteronomy',   ch:34 },
  // נביאים
  { g:'נביאים',  he:'יהושע',         sf:'Joshua',        ch:24 },
  { g:'נביאים',  he:'שופטים',        sf:'Judges',        ch:21 },
  { g:'נביאים',  he:'שמואל א',       sf:'I Samuel',      ch:31 },
  { g:'נביאים',  he:'שמואל ב',       sf:'II Samuel',     ch:24 },
  { g:'נביאים',  he:'מלכים א',       sf:'I Kings',       ch:22 },
  { g:'נביאים',  he:'מלכים ב',       sf:'II Kings',      ch:25 },
  { g:'נביאים',  he:'ישעיהו',        sf:'Isaiah',        ch:66 },
  { g:'נביאים',  he:'ירמיהו',        sf:'Jeremiah',      ch:52 },
  { g:'נביאים',  he:'יחזקאל',        sf:'Ezekiel',       ch:48 },
  { g:'נביאים',  he:'הושע',          sf:'Hosea',         ch:14 },
  { g:'נביאים',  he:'יואל',          sf:'Joel',          ch:4  },
  { g:'נביאים',  he:'עמוס',          sf:'Amos',          ch:9  },
  { g:'נביאים',  he:'עובדיה',        sf:'Obadiah',       ch:1  },
  { g:'נביאים',  he:'יונה',          sf:'Jonah',         ch:4  },
  { g:'נביאים',  he:'מיכה',          sf:'Micah',         ch:7  },
  { g:'נביאים',  he:'נחום',          sf:'Nahum',         ch:3  },
  { g:'נביאים',  he:'חבקוק',         sf:'Habakkuk',      ch:3  },
  { g:'נביאים',  he:'צפניה',         sf:'Zephaniah',     ch:3  },
  { g:'נביאים',  he:'חגי',           sf:'Haggai',        ch:2  },
  { g:'נביאים',  he:'זכריה',         sf:'Zechariah',     ch:14 },
  { g:'נביאים',  he:'מלאכי',         sf:'Malachi',       ch:3  },
  // כתובים
  { g:'כתובים',  he:'תהילים',        sf:'Psalms',        ch:150},
  { g:'כתובים',  he:'משלי',          sf:'Proverbs',      ch:31 },
  { g:'כתובים',  he:'איוב',          sf:'Job',           ch:42 },
  { g:'כתובים',  he:'שיר השירים',    sf:'Song of Songs', ch:8  },
  { g:'כתובים',  he:'רות',           sf:'Ruth',          ch:4  },
  { g:'כתובים',  he:'איכה',          sf:'Lamentations',  ch:5  },
  { g:'כתובים',  he:'קהלת',          sf:'Ecclesiastes',  ch:12 },
  { g:'כתובים',  he:'אסתר',          sf:'Esther',        ch:10 },
  { g:'כתובים',  he:'דניאל',         sf:'Daniel',        ch:12 },
  { g:'כתובים',  he:'עזרא',          sf:'Ezra',          ch:10 },
  { g:'כתובים',  he:'נחמיה',         sf:'Nehemiah',      ch:13 },
  { g:'כתובים',  he:'דברי הימים א',  sf:'I Chronicles',  ch:29 },
  { g:'כתובים',  he:'דברי הימים ב',  sf:'II Chronicles', ch:36 },
];

// ── משנה ────────────────────────────────────────────────────────
const MISHNAH = [
  // זרעים
  {g:'זרעים', he:'ברכות',    sf:'Berakhot',     ch:9},
  {g:'זרעים', he:'פאה',      sf:'Peah',         ch:8},
  {g:'זרעים', he:'דמאי',     sf:'Demai',        ch:7},
  {g:'זרעים', he:'כלאים',    sf:'Kilayim',      ch:9},
  {g:'זרעים', he:'שביעית',   sf:'Sheviit',      ch:10},
  {g:'זרעים', he:'תרומות',   sf:'Terumot',      ch:11},
  {g:'זרעים', he:'מעשרות',   sf:'Maasrot',      ch:5},
  {g:'זרעים', he:'מעשר שני', sf:'Maaser_Sheni', ch:5},
  {g:'זרעים', he:'חלה',      sf:'Challah',      ch:4},
  {g:'זרעים', he:'ערלה',     sf:'Orlah',        ch:3},
  {g:'זרעים', he:'ביכורים',  sf:'Bikkurim',     ch:4},
  // מועד
  {g:'מועד', he:'שבת',       sf:'Shabbat',      ch:24},
  {g:'מועד', he:'עירובין',   sf:'Eruvin',       ch:10},
  {g:'מועד', he:'פסחים',     sf:'Pesachim',     ch:10},
  {g:'מועד', he:'שקלים',     sf:'Shekalim',     ch:8},
  {g:'מועד', he:'יומא',      sf:'Yoma',         ch:8},
  {g:'מועד', he:'סוכה',      sf:'Sukkah',       ch:5},
  {g:'מועד', he:'ביצה',      sf:'Beitzah',      ch:5},
  {g:'מועד', he:'ראש השנה',  sf:'Rosh_Hashanah',ch:4},
  {g:'מועד', he:'תענית',     sf:'Taanit',       ch:4},
  {g:'מועד', he:'מגילה',     sf:'Megillah',     ch:4},
  {g:'מועד', he:'מועד קטן',  sf:'Moed_Katan',   ch:3},
  {g:'מועד', he:'חגיגה',     sf:'Chagigah',     ch:3},
  // נשים
  {g:'נשים', he:'יבמות',     sf:'Yevamot',      ch:16},
  {g:'נשים', he:'כתובות',    sf:'Ketubot',      ch:13},
  {g:'נשים', he:'נדרים',     sf:'Nedarim',      ch:11},
  {g:'נשים', he:'נזיר',      sf:'Nazir',        ch:9},
  {g:'נשים', he:'סוטה',      sf:'Sotah',        ch:9},
  {g:'נשים', he:'גיטין',     sf:'Gittin',       ch:9},
  {g:'נשים', he:'קידושין',   sf:'Kiddushin',    ch:4},
  // נזיקין
  {g:'נזיקין', he:'בבא קמא',    sf:'Bava_Kamma',   ch:10},
  {g:'נזיקין', he:'בבא מציעא',  sf:'Bava_Metzia',  ch:10},
  {g:'נזיקין', he:'בבא בתרא',   sf:'Bava_Batra',   ch:10},
  {g:'נזיקין', he:'סנהדרין',    sf:'Sanhedrin',    ch:11},
  {g:'נזיקין', he:'מכות',       sf:'Makkot',       ch:3},
  {g:'נזיקין', he:'שבועות',     sf:'Shevuot',      ch:8},
  {g:'נזיקין', he:'עדיות',      sf:'Eduyot',       ch:8},
  {g:'נזיקין', he:'עבודה זרה',  sf:'Avodah_Zarah', ch:5},
  {g:'נזיקין', he:'אבות',       sf:'Avot',         ch:5},
  {g:'נזיקין', he:'הוריות',     sf:'Horayot',      ch:3},
  // קדשים
  {g:'קדשים', he:'זבחים',    sf:'Zevachim',   ch:14},
  {g:'קדשים', he:'מנחות',    sf:'Menachot',   ch:13},
  {g:'קדשים', he:'חולין',    sf:'Chullin',    ch:12},
  {g:'קדשים', he:'בכורות',   sf:'Bekhorot',   ch:9},
  {g:'קדשים', he:'ערכין',    sf:'Arakhin',    ch:9},
  {g:'קדשים', he:'תמורה',    sf:'Temurah',    ch:7},
  {g:'קדשים', he:'כריתות',   sf:'Keritot',    ch:6},
  {g:'קדשים', he:'מעילה',    sf:'Meilah',     ch:6},
  {g:'קדשים', he:'תמיד',     sf:'Tamid',      ch:7},
  {g:'קדשים', he:'מידות',    sf:'Middot',     ch:5},
  {g:'קדשים', he:'קינים',    sf:'Kinnim',     ch:3},
  // טהרות
  {g:'טהרות', he:'כלים',      sf:'Kelim',      ch:30},
  {g:'טהרות', he:'אהלות',     sf:'Oholot',     ch:18},
  {g:'טהרות', he:'נגעים',     sf:'Negaim',     ch:14},
  {g:'טהרות', he:'פרה',       sf:'Parah',      ch:12},
  {g:'טהרות', he:'טהרות',     sf:'Tahorot',    ch:10},
  {g:'טהרות', he:'מקוואות',   sf:'Mikvaot',    ch:10},
  {g:'טהרות', he:'נדה',       sf:'Niddah',     ch:10},
  {g:'טהרות', he:'מכשירין',   sf:'Makhshirin', ch:6},
  {g:'טהרות', he:'זבים',      sf:'Zavim',      ch:5},
  {g:'טהרות', he:'טבול יום',  sf:'Tevul_Yom',  ch:4},
  {g:'טהרות', he:'ידים',      sf:'Yadayim',    ch:4},
  {g:'טהרות', he:'עוקצין',    sf:'Oktzin',     ch:3},
];

// ── ש"ס בבלי ────────────────────────────────────────────────────
const SHAS = [
  {g:'זרעים',  he:'ברכות',      sf:'Berakhot',     daf:64},
  {g:'מועד',   he:'שבת',        sf:'Shabbat',      daf:157},
  {g:'מועד',   he:'עירובין',    sf:'Eruvin',       daf:105},
  {g:'מועד',   he:'פסחים',      sf:'Pesachim',     daf:121},
  {g:'מועד',   he:'יומא',       sf:'Yoma',         daf:88},
  {g:'מועד',   he:'סוכה',       sf:'Sukkah',       daf:56},
  {g:'מועד',   he:'ביצה',       sf:'Beitzah',      daf:40},
  {g:'מועד',   he:'ראש השנה',   sf:'Rosh_Hashanah',daf:35},
  {g:'מועד',   he:'תענית',      sf:'Taanit',       daf:31},
  {g:'מועד',   he:'מגילה',      sf:'Megillah',     daf:32},
  {g:'מועד',   he:'מועד קטן',   sf:'Moed_Katan',   daf:29},
  {g:'מועד',   he:'חגיגה',      sf:'Chagigah',     daf:27},
  {g:'נשים',   he:'יבמות',      sf:'Yevamot',      daf:122},
  {g:'נשים',   he:'כתובות',     sf:'Ketubot',      daf:112},
  {g:'נשים',   he:'נדרים',      sf:'Nedarim',      daf:91},
  {g:'נשים',   he:'נזיר',       sf:'Nazir',        daf:66},
  {g:'נשים',   he:'סוטה',       sf:'Sotah',        daf:49},
  {g:'נשים',   he:'גיטין',      sf:'Gittin',       daf:90},
  {g:'נשים',   he:'קידושין',    sf:'Kiddushin',    daf:82},
  {g:'נזיקין', he:'בבא קמא',    sf:'Bava_Kamma',   daf:119},
  {g:'נזיקין', he:'בבא מציעא',  sf:'Bava_Metzia',  daf:119},
  {g:'נזיקין', he:'בבא בתרא',   sf:'Bava_Batra',   daf:176},
  {g:'נזיקין', he:'סנהדרין',    sf:'Sanhedrin',    daf:113},
  {g:'נזיקין', he:'מכות',       sf:'Makkot',       daf:24},
  {g:'נזיקין', he:'שבועות',     sf:'Shevuot',      daf:49},
  {g:'נזיקין', he:'עבודה זרה',  sf:'Avodah_Zarah', daf:76},
  {g:'נזיקין', he:'הוריות',     sf:'Horayot',      daf:14},
  {g:'קדשים',  he:'זבחים',      sf:'Zevachim',     daf:120},
  {g:'קדשים',  he:'מנחות',      sf:'Menachot',     daf:110},
  {g:'קדשים',  he:'חולין',      sf:'Chullin',      daf:142},
  {g:'קדשים',  he:'בכורות',     sf:'Bekhorot',     daf:61},
  {g:'קדשים',  he:'ערכין',      sf:'Arakhin',      daf:34},
  {g:'קדשים',  he:'תמורה',      sf:'Temurah',      daf:34},
  {g:'קדשים',  he:'כריתות',     sf:'Keritot',      daf:28},
  {g:'קדשים',  he:'מעילה',      sf:'Meilah',       daf:22},
  {g:'טהרות',  he:'נדה',        sf:'Niddah',       daf:73},
];

// ── רמב"ם ────────────────────────────────────────────────────────
const RAMBAM = [
  {g:'ספר המדע',    he:'יסודי התורה',      sf:'Mishneh Torah, Foundations of the Torah',                                          ch:10},
  {g:'ספר המדע',    he:'דעות',             sf:'Mishneh Torah, Human Dispositions',                                                ch:7},
  {g:'ספר המדע',    he:'תלמוד תורה',       sf:'Mishneh Torah, Torah Study',                                                       ch:4},
  {g:'ספר המדע',    he:'עבודה זרה',        sf:'Mishneh Torah, Foreign Worship and Customs of the Nations',                        ch:12},
  {g:'ספר המדע',    he:'תשובה',            sf:'Mishneh Torah, Repentance',                                                        ch:10},
  {g:'ספר אהבה',   he:'קריאת שמע',        sf:'Mishneh Torah, Reading the Shema',                                                 ch:4},
  {g:'ספר אהבה',   he:'תפילה',            sf:'Mishneh Torah, Prayer and the Priestly Blessing',                                  ch:15},
  {g:'ספר אהבה',   he:'ציצית',            sf:'Mishneh Torah, Fringes',                                                           ch:3},
  {g:'ספר אהבה',   he:'תפילין',           sf:'Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll',                            ch:10},
  {g:'ספר אהבה',   he:'ברכות',            sf:'Mishneh Torah, Blessings',                                                         ch:11},
  {g:'ספר אהבה',   he:'מילה',             sf:'Mishneh Torah, Circumcision',                                                      ch:3},
  {g:'ספר זמנים',  he:'שבת',              sf:'Mishneh Torah, Sabbath',                                                           ch:30},
  {g:'ספר זמנים',  he:'יום טוב',          sf:'Mishneh Torah, Yom Tov',                                                           ch:8},
  {g:'ספר זמנים',  he:'חמץ ומצה',         sf:'Mishneh Torah, Leavened and Unleavened Bread',                                     ch:8},
  {g:'ספר זמנים',  he:'שופר סוכה לולב',   sf:'Mishneh Torah, Shofar, Sukkah and Lulav',                                         ch:8},
  {g:'ספר זמנים',  he:'שקלים',            sf:'Mishneh Torah, Sheqel Dues',                                                       ch:4},
  {g:'ספר זמנים',  he:'קידוש החודש',      sf:'Mishneh Torah, Sanctification of the New Month',                                   ch:19},
  {g:'ספר זמנים',  he:'תעניות',           sf:'Mishneh Torah, Fasts',                                                             ch:5},
  {g:'ספר זמנים',  he:'מגילה וחנוכה',     sf:'Mishneh Torah, Scroll of Esther and Hanukkah',                                    ch:4},
  {g:'ספר נשים',   he:'אישות',            sf:'Mishneh Torah, Marriage',                                                          ch:25},
  {g:'ספר נשים',   he:'גירושין',          sf:'Mishneh Torah, Divorce',                                                           ch:13},
  {g:'ספר קדושה',  he:'איסורי ביאה',      sf:'Mishneh Torah, Forbidden Intercourse',                                             ch:22},
  {g:'ספר קדושה',  he:'מאכלות אסורות',   sf:'Mishneh Torah, Forbidden Foods',                                                   ch:17},
  {g:'ספר קדושה',  he:'שחיטה',            sf:'Mishneh Torah, Ritual Slaughter',                                                  ch:14},
  {g:'ספר נזיקין', he:'רוצח ושמירת הנפש', sf:'Mishneh Torah, Murderer and the Preservation of Life',                             ch:13},
  {g:'ספר נזיקין', he:'גניבה',            sf:'Mishneh Torah, Theft',                                                             ch:9},
  {g:'ספר נזיקין', he:'גזילה ואבידה',     sf:'Mishneh Torah, Robbery and Lost Property',                                         ch:18},
  {g:'ספר קניין',  he:'מכירה',            sf:'Mishneh Torah, Sales',                                                             ch:30},
  {g:'ספר שופטים', he:'סנהדרין',          sf:'Mishneh Torah, The Sanhedrin and the Penalties within Their Jurisdiction',         ch:26},
  {g:'ספר שופטים', he:'עדות',             sf:'Mishneh Torah, Testimony',                                                         ch:22},
  {g:'ספר שופטים', he:'מלכים ומלחמות',    sf:'Mishneh Torah, Kings and Wars',                                                    ch:12},
];

// ── שולחן ערוך ───────────────────────────────────────────────────
const SHULCHAN = [
  {g:'שולחן ערוך', he:'אורח חיים',   sf:'Shulchan Arukh, Orach Chayyim',   ch:697},
  {g:'שולחן ערוך', he:'יורה דעה',    sf:'Shulchan Arukh, Yoreh Deah',      ch:403},
  {g:'שולחן ערוך', he:'אבן העזר',    sf:'Shulchan Arukh, Even HaEzer',     ch:178},
  {g:'שולחן ערוך', he:'חושן משפט',   sf:'Shulchan Arukh, Choshen Mishpat', ch:427},
];

// ── Collection definitions ───────────────────────────────────────
const COLLECTIONS = {
  tanach:   { label: 'תנ"ך',       items: TANACH,   type: 'chapter', unitLabel: 'פרק',  fetchRef: (item, unit) => `${item.sf}.${unit}` },
  mishnah:  { label: 'משנה',       items: MISHNAH,  type: 'chapter', unitLabel: 'פרק',  fetchRef: (item, unit) => `Mishnah_${item.sf}.${unit}` },
  shas:     { label: 'ש"ס בבלי',   items: SHAS,     type: 'daf',     unitLabel: 'דף',   fetchRef: (item, unit) => `${item.sf}.${unit}` },
  rambam:   { label: 'רמב"ם',      items: RAMBAM,   type: 'chapter', unitLabel: 'פרק',  fetchRef: (item, unit) => `${item.sf}.${unit}` },
  shulchan: { label: 'שולחן ערוך', items: SHULCHAN, type: 'chapter', unitLabel: 'סימן', fetchRef: (item, unit) => `${item.sf}.${unit}` },
};

// ── Commentators per collection ──────────────────────────────────
// For Shas: Steinsaltz is called "ביאור" per user request
const COMMENTATORS = {
  tanach: [
    { id: 'rashi',    he: 'רש"י',      ref: (sf, ch, v) => `Rashi on ${sf}.${ch}.${v}` },
    { id: 'ibnezra',  he: 'אבן עזרא',  ref: (sf, ch, v) => `Ibn Ezra on ${sf}.${ch}.${v}` },
    { id: 'ramban',   he: 'רמב"ן',     ref: (sf, ch, v) => `Ramban on ${sf}.${ch}.${v}` },
    { id: 'sforno',   he: 'ספורנו',    ref: (sf, ch, v) => `Sforno on ${sf}.${ch}.${v}` },
    { id: 'kliyakar', he: 'כלי יקר',   ref: (sf, ch, v) => `Kli Yakar on ${sf}.${ch}.${v}` },
  ],
  mishnah: [
    { id: 'bartenura', he: 'ברטנורא',      ref: (sf, ch, v) => `Bartenura on Mishnah ${sf}.${ch}.${v}` },
    { id: 'rambam',    he: 'רמב"ם',        ref: (sf, ch, v) => `Rambam on Mishnah ${sf}.${ch}.${v}` },
    { id: 'tiferet',   he: 'תפארת ישראל',  ref: (sf, ch, v) => `Tiferet Yisrael on Mishnah ${sf}.${ch}.${v}` },
  ],
  shas: [
    { id: 'rashi',    he: 'רש"י',    ref: (sf, ch, v) => `Rashi on ${sf}.${ch}.${v}` },
    { id: 'tosafot',  he: 'תוספות',  ref: (sf, ch, v) => `Tosafot on ${sf}.${ch}.${v}` },
    { id: 'biyur',    he: 'ביאור',   ref: (sf, ch, v) => `Steinsaltz on ${sf}.${ch}.${v}` },
    { id: 'maharsha', he: 'מהרש"א',  ref: (sf, ch, v) => `Maharsha on ${sf}.${ch}.${v}` },
  ],
  rambam: [
    { id: 'kessef',   he: 'כסף משנה',   ref: (sf, ch, v) => `Kessef Mishneh on ${sf}.${ch}.${v}` },
    { id: 'lechem',   he: 'לחם משנה',   ref: (sf, ch, v) => `Lechem Mishneh on ${sf}.${ch}.${v}` },
    { id: 'mishnehl', he: 'משנה למלך',  ref: (sf, ch, v) => `Mishneh LaMelech on ${sf}.${ch}.${v}` },
  ],
  shulchan: [
    { id: 'magen',    he: 'מגן אברהם',   ref: (sf, ch, v) => `Magen Avraham on ${sf}.${ch}.${v}` },
    { id: 'mishnahb', he: 'משנה ברורה',  ref: (sf, ch, v) => `Mishnah Berurah on ${sf}.${ch}.${v}` },
    { id: 'shach',    he: 'ש"ך',         ref: (sf, ch, v) => `Shach on ${sf}.${ch}.${v}` },
    { id: 'taz',      he: 'ט"ז',         ref: (sf, ch, v) => `Taz on ${sf}.${ch}.${v}` },
  ],
};

// ── Split-view state ─────────────────────────────────────────────
const SV = {
  active: false,
  selectedCommentators: new Set(),
  commentaryCache: {},   // key: `commId:verseIdx`
  hoveredVerseIdx: null,
  hoverDebounce: null,
};

// ── State ────────────────────────────────────────────────────────
const S = {
  collectionKey: 'tanach',
  book:          null,
  unit:          null,      // int (chapter) or string ('2a' / '2b' for Shas)
  verses:        [],
  messages:      [],
  totalScore:    0,
  sessionScore:  0,
  loading:        false,
  adminAuthed:    false,
  sessionStarted: false,
  greetingMode:   false,
  studyMode:      null,     // 'iyun' | 'bekiut' | null
  commentaryText: null,     // commentary text for verse mode
  studyVerseIdx:  null,     // verse index for verse mode
  wrongAttempts:  0,        // consecutive wrong answers on current unit (reset on correct)
};

// ── Hebrew numeral converter ─────────────────────────────────────
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

// ── User / Registration ──────────────────────────────────────────
function getUser() {
  try { return JSON.parse(localStorage.getItem('chavruta_user') || 'null'); }
  catch { return null; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!name || name.length < 2) {
    errEl.textContent = t('errInvalidName');
    errEl.classList.remove('hidden');
    document.getElementById('reg-name').focus();
    return;
  }
  if (!email || !isValidEmail(email)) {
    errEl.textContent = t('errInvalidEmail');
    errEl.classList.remove('hidden');
    document.getElementById('reg-email').focus();
    return;
  }

  const btn = document.getElementById('reg-btn');
  btn.disabled = true;
  btn.textContent = t('sendingBtn');

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    localStorage.setItem('chavruta_user', JSON.stringify({ name, email, isAdmin: data.isAdmin || false }));
    document.getElementById('modal-register').classList.add('hidden');
    if (data.status === 'approved') {
      updateUserUI();
    } else {
      showPendingScreen();
    }
  } catch {
    errEl.textContent = t('errNetwork');
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = t('signInBtn');
  }
}

function showPendingScreen() {
  document.getElementById('pending-screen').classList.remove('hidden');
}

function regHandleKey(e) {
  if (e.key === 'Enter') register();
}

function logout() {
  if (!confirm(t('logoutConfirmMsg'))) return;
  localStorage.removeItem('chavruta_user');
  document.getElementById('pending-screen').classList.add('hidden');
  document.getElementById('modal-register').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('user-greeting').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('history-btn').classList.add('hidden');
  document.getElementById('admin-btn').classList.add('hidden');
}

function getAdminSecret() { return sessionStorage.getItem('chavruta_admin_secret') || ''; }
function setAdminSecret(s) { sessionStorage.setItem('chavruta_admin_secret', s); }
function adminHeaders() {
  const user = getUser();
  return { 'Content-Type': 'application/json', 'x-admin-email': user?.email || '' };
}

function isAdmin() {
  const user = getUser();
  return user?.isAdmin === true;
}

function updateUserUI() {
  const user = getUser();
  if (user) {
    const greet = document.getElementById('user-greeting');
    greet.textContent = t('userGreeting')(user.name);
    greet.classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('history-btn').classList.remove('hidden');
    if (isAdmin()) {
      document.getElementById('admin-btn').classList.remove('hidden');
      S.adminAuthed = true;
    }
    showGreeting();
  }
}

function openAdmin() {
  if (!isAdmin()) return;
  const modal = document.getElementById('modal-admin');
  modal.classList.remove('hidden');
  showAdminEditor();
}

function closeAdmin() {
  document.getElementById('modal-admin').classList.add('hidden');
}

function adminPwKey(e) {
  if (e.key === 'Enter') checkAdminPw();
}

async function checkAdminPw() {
  const input  = document.getElementById('admin-pw-input');
  const errEl  = document.getElementById('admin-pw-error');
  const secret = input ? input.value.trim() : '';
  if (!secret) return;
  errEl.classList.add('hidden');
  try {
    const res = await fetch('/api/users', { headers: { 'x-admin-secret': secret } });
    if (res.ok) {
      setAdminSecret(secret);
      showAdminEditor();
    } else {
      errEl.textContent = 'מפתח המנהל שגוי.';
      errEl.classList.remove('hidden');
    }
  } catch {
    errEl.textContent = 'שגיאת רשת, נסה שוב.';
    errEl.classList.remove('hidden');
  }
}

function showAdminEditor() {
  document.getElementById('admin-pw-gate').classList.add('hidden');
  document.getElementById('admin-editor').classList.remove('hidden');
  document.getElementById('admin-save-msg').classList.add('hidden');

  document.getElementById('admin-model-select').value = GLOBAL_MODEL || 'anthropic/claude-opus-4';
  document.getElementById('admin-greeting').value = GLOBAL_GREETING_HE || DEFAULT_GREETING;
  document.getElementById('admin-thinking-msgs').value =
    (GLOBAL_THINKING_MSGS || t('thinkingMsgs')).join('\n');

  const keys = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'];
  for (const k of keys) {
    document.getElementById(`admin-prompt-${k}`).value = GLOBAL_PROMPTS[k] || DEFAULT_ADMIN_PROMPTS[k];
  }
  document.getElementById('admin-prompt-iyun').value   = GLOBAL_PROMPT_IYUN   || DEFAULT_IYUN_PROMPT;
  document.getElementById('admin-prompt-bekiut').value = GLOBAL_PROMPT_BEKIUT || DEFAULT_BEKIUT_PROMPT;
  document.getElementById('admin-verse-mode-enabled').checked = GLOBAL_VERSE_MODE_ENABLED;

  loadAdminUsers();
  loadEmailTemplates();
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-list');
  container.innerHTML = `<p class="text-sm text-gray-400 text-center">${t('adminUsersLoading')}</p>`;
  try {
    const res = await fetch('/api/users', { headers: adminHeaders() });
    const users = await res.json();
    if (!Array.isArray(users) || !users.length) {
      container.innerHTML = `<p class="text-sm text-gray-400 text-center">${t('adminUsersEmpty')}</p>`;
      return;
    }
    container.innerHTML = users.map(u => `
      <div class="flex items-center justify-between gap-2 p-2 rounded-lg ${u.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-100'}">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-navy">${esc(u.name)}</div>
          <div class="text-xs text-gray-500 truncate">${esc(u.email)}</div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          ${u.status === 'pending'
            ? `<button onclick="setUserStatus(this.dataset.email,'approved')" data-email="${esc(u.email)}" class="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">אשר</button>`
            : (!u.isAdmin ? `<button onclick="setUserStatus(this.dataset.email,'pending')" data-email="${esc(u.email)}" class="text-xs px-2 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500">בטל</button>` : '')}
          <span class="text-xs px-2 py-1 rounded-lg ${u.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">${u.status === 'pending' ? 'ממתין' : 'מאושר'}</span>
        </div>
      </div>`).join('');
  } catch {
    container.innerHTML = `<p class="text-sm text-red-500 text-center">${t('adminUsersError')}</p>`;
  }
}

async function setUserStatus(email, status) {
  await fetch('/api/users', {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ email, status })
  });
  loadAdminUsers();
}

function _applyVerseModeEnabled(enabled) {
  const DISABLED_STYLE = 'flex:1;background:#9CA3AF;color:#e5e7eb;border:none;border-radius:10px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:not-allowed;font-family:inherit;opacity:0.6;';
  const IYUN_STYLE     = 'flex:1;background:#1B3A6B;color:#F0C040;border:none;border-radius:10px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s;';
  const BEKIUT_STYLE   = 'flex:1;background:#B8860B;color:#fff;border:none;border-radius:10px;padding:6px 8px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s;';

  const iyunBtn   = document.getElementById('panel-btn-iyun');
  const bekiutBtn = document.getElementById('panel-btn-bekiut');
  if (!iyunBtn || !bekiutBtn) return;

  if (enabled) {
    iyunBtn.disabled   = false;
    bekiutBtn.disabled = false;
    iyunBtn.style.cssText   = IYUN_STYLE;
    bekiutBtn.style.cssText = BEKIUT_STYLE;
    iyunBtn.title   = '';
    bekiutBtn.title = '';
    iyunBtn.onmouseenter   = () => { iyunBtn.style.opacity   = '.82'; };
    iyunBtn.onmouseleave   = () => { iyunBtn.style.opacity   = '1';  };
    bekiutBtn.onmouseenter = () => { bekiutBtn.style.opacity = '.82'; };
    bekiutBtn.onmouseleave = () => { bekiutBtn.style.opacity = '1';  };
  } else {
    iyunBtn.disabled   = true;
    bekiutBtn.disabled = true;
    iyunBtn.style.cssText   = DISABLED_STYLE;
    bekiutBtn.style.cssText = DISABLED_STYLE;
    iyunBtn.title   = 'האפשרות הזאת באמצע פיתוח';
    bekiutBtn.title = 'האפשרות הזאת באמצע פיתוח';
    iyunBtn.onmouseenter   = null;
    iyunBtn.onmouseleave   = null;
    bekiutBtn.onmouseenter = null;
    bekiutBtn.onmouseleave = null;
  }
}

async function saveVerseModeEnabled() {
  const enabled = document.getElementById('admin-verse-mode-enabled').checked;
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ verseModeEnabled: enabled }),
    });
    GLOBAL_VERSE_MODE_ENABLED = enabled;
    _applyVerseModeEnabled(enabled);
  } catch {
    // revert checkbox on failure
    document.getElementById('admin-verse-mode-enabled').checked = !enabled;
  }
}

function resetPrompt(k) {
  if (k === 'iyun')   document.getElementById('admin-prompt-iyun').value   = DEFAULT_IYUN_PROMPT;
  else if (k === 'bekiut') document.getElementById('admin-prompt-bekiut').value = DEFAULT_BEKIUT_PROMPT;
  else document.getElementById(`admin-prompt-${k}`).value = DEFAULT_ADMIN_PROMPTS[k];
}

async function saveAdminPrompts() {
  // Save model to server (affects all users)
  const model = document.getElementById('admin-model-select').value;
  const greeting = document.getElementById('admin-greeting').value.trim();
  const keys = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'];
  const allDefaults = { ...DEFAULT_ADMIN_PROMPTS, iyun: DEFAULT_IYUN_PROMPT, bekiut: DEFAULT_BEKIUT_PROMPT };
  const prompts = {};
  for (const k of keys) {
    const val = document.getElementById(`admin-prompt-${k}`).value.trim();
    prompts[k] = (val && val !== allDefaults[k]) ? val : '';
  }
  const iyunVal   = document.getElementById('admin-prompt-iyun').value.trim();
  const bekiutVal = document.getElementById('admin-prompt-bekiut').value.trim();
  prompts.iyun   = (iyunVal   && iyunVal   !== DEFAULT_IYUN_PROMPT)   ? iyunVal   : '';
  prompts.bekiut = (bekiutVal && bekiutVal !== DEFAULT_BEKIUT_PROMPT) ? bekiutVal : '';
  const msg = document.getElementById('admin-save-msg');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        model,
        greeting: greeting || null,
        prompts,
        thinkingMsgs: document.getElementById('admin-thinking-msgs').value
          .split('\n').map(s => s.trim()).filter(Boolean),
      })
    });
    if (!res.ok) throw new Error(`${res.status}`);
    GLOBAL_MODEL = model;
    GLOBAL_GREETING_HE = greeting || null;
    for (const k of keys) GLOBAL_PROMPTS[k] = prompts[k] || null;
    GLOBAL_PROMPT_IYUN   = prompts.iyun   || null;
    GLOBAL_PROMPT_BEKIUT = prompts.bekiut || null;
    const savedMsgs = document.getElementById('admin-thinking-msgs').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    GLOBAL_THINKING_MSGS = savedMsgs.length ? savedMsgs : null;
    msg.textContent = '✓ נשמר בהצלחה';
  } catch {
    msg.textContent = '⚠ שגיאה בשמירה';
  }
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
}

// ── Split-view: toggle ───────────────────────────────────────────
function toggleSplitView() {
  if (SV.active) {
    _closeSplitView();
  } else {
    _openSplitView();
  }
}

function _openSplitView() {
  SV.active = true;
  document.getElementById('app').classList.add('split-mode');
  const btn = document.getElementById('split-view-btn');
  if (btn) btn.textContent = '✕ סגור פרק';
  renderTextPanel();
}

function _closeSplitView() {
  SV.active = false;
  document.getElementById('app').classList.remove('split-mode');
  const btn = document.getElementById('split-view-btn');
  if (btn) btn.textContent = '📖 פתח פרק';
  document.getElementById('chapter-text-scroll').innerHTML = '';
  document.getElementById('commentary-area').style.display = 'none';
  document.getElementById('commentary-content').innerHTML = '';
}

// ── Start learning from panel (iyun / bekiut) ────────────────────
async function startLearningFromPanel(mode) {
  if (!S.book || !S.unit || !S.verses.length) return;

  const verseIdx  = SV.hoveredVerseIdx !== null ? SV.hoveredVerseIdx : 0;
  const verseText = S.verses[verseIdx] || '';

  // Gather commentary from cache; fetch if missing
  const comms = (COMMENTATORS[S.collectionKey] || [])
    .filter(c => SV.selectedCommentators.has(c.id));
  const commentaryParts = [];
  for (const comm of comms) {
    const cacheKey = `${comm.id}:${verseIdx}`;
    let text = SV.commentaryCache[cacheKey];
    if (!text) text = await _fetchCommentary(comm, verseIdx);
    if (text) commentaryParts.push(`[${comm.he}]: ${text}`);
  }

  // Close split view
  _closeSplitView();

  // Reset session state for verse mode
  S.messages       = [];
  S.sessionScore   = 0;
  S.sessionStarted = true;
  S.greetingMode   = false;
  S.studyMode      = mode;
  S.commentaryText = commentaryParts.join('\n\n');
  S.studyVerseIdx  = verseIdx;
  S.waitingForFirstQuestion = true;

  // Show chat UI
  document.getElementById('greeting-picker').classList.add('hidden');
  document.getElementById('chat-input-row').classList.remove('hidden');
  document.getElementById('input-area').classList.remove('hidden');
  document.getElementById('header-new-btn').classList.remove('hidden');
  document.getElementById('split-view-btn').classList.remove('hidden');
  setInput(true);

  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';

  // Session header
  const unitLabel  = buildUnitLabel();
  const modeLabel  = mode === 'iyun' ? '📚 לימוד בעיון' : '🏃 לימוד בבקיאות';
  const verseLabel = S.collectionKey === 'shas'
    ? `קטע ${verseIdx + 1}`
    : `פסוק ${toHebrew(verseIdx + 1)}`;
  const header = document.createElement('div');
  header.className = 'text-center text-sm text-gray-400 mb-4 pb-2 border-b border-parchmentDark';
  header.innerHTML = `<span class="font-semibold" style="color:#B8860B;">${esc(S.book.he)}</span> · <span class="font-semibold text-navy">${esc(unitLabel)}</span> · ${esc(verseLabel)} · <span style="color:#B8860B;">${modeLabel}</span>`;
  chatEl.appendChild(header);

  // Trigger first AI call
  S.messages.push({ role: 'user', content: t('aiFirstMessage') });
  await callAI();
}

// ── Split-view: render text panel ───────────────────────────────
function renderTextPanel() {
  if (!S.book || !S.unit || !S.verses.length) return;

  // Title
  document.getElementById('text-panel-title').textContent =
    `${S.book.he} | ${buildUnitLabel()}`;

  // Reset commentary cache when new chapter is shown
  SV.commentaryCache = {};
  SV.hoveredVerseIdx = null;
  document.getElementById('commentary-area').style.display = 'none';

  // Build commentator selector chips
  _buildCommentatorsBar();

  // Render verses
  const scroll = document.getElementById('chapter-text-scroll');
  scroll.innerHTML = '';

  S.verses.forEach((verse, idx) => {
    const div = document.createElement('div');
    div.className = 'verse-item';
    div.dataset.verseIdx = idx;

    const numSpan = document.createElement('span');
    numSpan.className = 'verse-num-badge';
    // For Shas show segment number as Arabic, others as Hebrew numeral
    numSpan.textContent = S.collectionKey === 'shas' ? (idx + 1) : toHebrew(idx + 1);

    const textSpan = document.createElement('span');
    textSpan.className = 'verse-text-content';
    textSpan.textContent = verse;

    div.appendChild(numSpan);
    div.appendChild(textSpan);

    div.addEventListener('mouseenter', () => _onVerseHover(idx));

    scroll.appendChild(div);
  });
}

function _buildCommentatorsBar() {
  const bar = document.getElementById('commentators-bar');
  bar.innerHTML = '<span style="font-size:0.75rem;color:#6B7280;flex-shrink:0;">מפרשים:</span>';

  const comms = COMMENTATORS[S.collectionKey] || [];

  // Default: first commentator selected
  if (SV.selectedCommentators.size === 0 && comms.length > 0) {
    SV.selectedCommentators.add(comms[0].id);
  }

  comms.forEach(comm => {
    const chip = document.createElement('button');
    const selected = SV.selectedCommentators.has(comm.id);
    chip.className = 'commentator-chip' + (selected ? ' chip-selected' : '');
    chip.textContent = comm.he;
    chip.onclick = () => {
      if (SV.selectedCommentators.has(comm.id)) {
        if (SV.selectedCommentators.size > 1) SV.selectedCommentators.delete(comm.id);
      } else {
        SV.selectedCommentators.add(comm.id);
      }
      chip.classList.toggle('chip-selected', SV.selectedCommentators.has(comm.id));
      // Refresh commentary for currently hovered verse
      if (SV.hoveredVerseIdx !== null) _showCommentaryForVerse(SV.hoveredVerseIdx);
    };
    bar.appendChild(chip);
  });
}

// ── Split-view: hover & commentary ──────────────────────────────
function _onVerseHover(idx) {
  if (SV.hoverDebounce) clearTimeout(SV.hoverDebounce);

  // Visual highlight
  document.querySelectorAll('.verse-item').forEach(el => el.classList.remove('verse-active'));
  const el = document.querySelector(`.verse-item[data-verse-idx="${idx}"]`);
  if (el) el.classList.add('verse-active');

  SV.hoveredVerseIdx = idx;
  SV.hoverDebounce = setTimeout(() => _showCommentaryForVerse(idx), 250);
}

// Auto-highlight verse in split panel when Rabbi moves to a new verse
function _autoHighlightVerse(idx) {
  if (!SV.active) return;
  document.querySelectorAll('.verse-item').forEach(el => el.classList.remove('verse-active'));
  const el = document.querySelector(`.verse-item[data-verse-idx="${idx}"]`);
  if (!el) return;
  el.classList.add('verse-active');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  SV.hoveredVerseIdx = idx;
  _showCommentaryForVerse(idx);
}

async function _showCommentaryForVerse(verseIdx) {
  const comms = (COMMENTATORS[S.collectionKey] || []).filter(c => SV.selectedCommentators.has(c.id));
  if (!comms.length) return;

  const commArea    = document.getElementById('commentary-area');
  const commContent = document.getElementById('commentary-content');
  const commLabel   = document.getElementById('commentary-verse-label');

  commArea.style.display = 'block';
  const labelNum = S.collectionKey === 'shas' ? (verseIdx + 1) : toHebrew(verseIdx + 1);
  commLabel.textContent = `${S.book.he} | ${buildUnitLabel()} | קטע ${labelNum}`;
  commContent.innerHTML = '<div style="color:#9CA3AF;font-size:0.85rem;padding:4px 0;">טוען פירושים...</div>';

  const results = await Promise.all(comms.map(c => _fetchCommentary(c, verseIdx)));

  commContent.innerHTML = '';
  let hasContent = false;

  results.forEach((text, i) => {
    if (!text) return;
    hasContent = true;
    const block = document.createElement('div');
    block.className = 'commentary-block';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'comm-name';
    nameDiv.textContent = comms[i].he + ':';
    const textDiv = document.createElement('div');
    textDiv.className = 'comm-text';
    textDiv.textContent = text;
    block.appendChild(nameDiv);
    block.appendChild(textDiv);
    commContent.appendChild(block);
  });

  if (!hasContent) {
    commContent.innerHTML = '<div style="color:#9CA3AF;font-size:0.85rem;padding:4px 0;">אין פירוש זמין לקטע זה.</div>';
  }
}

async function _fetchCommentary(comm, verseIdx) {
  const cacheKey = `${comm.id}:${verseIdx}`;
  if (cacheKey in SV.commentaryCache) return SV.commentaryCache[cacheKey];

  const sf  = S.book.sf;
  const ch  = S.unit;
  const v   = verseIdx + 1;
  const ref = comm.ref(sf, ch, v);

  try {
    const res = await fetch(`/api/sefaria?ref=${encodeURIComponent(ref)}`);
    if (!res.ok) { SV.commentaryCache[cacheKey] = null; return null; }
    const data = await res.json();

    let raw = data.he || '';
    if (Array.isArray(raw)) {
      raw = raw.flat ? raw.flat(4) : raw;
      raw = Array.isArray(raw) ? raw.filter(x => typeof x === 'string').join(' ') : String(raw);
    }
    // Strip HTML tags
    const tmp = document.createElement('div');
    tmp.innerHTML = String(raw).replace(/<br\s*\/?>/gi, '\n');
    const text = tmp.textContent.trim();

    SV.commentaryCache[cacheKey] = text || null;
    return text || null;
  } catch {
    SV.commentaryCache[cacheKey] = null;
    return null;
  }
}

// ── Fetch content from Sefaria ───────────────────────────────────
async function fetchContent(collectionKey, item, unit) {
  const col = COLLECTIONS[collectionKey];
  const ref = col.fetchRef(item, unit);
  // Use our server-side proxy to avoid client firewall/content-filter blocks
  const url = `/api/sefaria?ref=${encodeURIComponent(ref)}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('SEFARIA_DOWN');
  }
  if (!res.ok) throw new Error(res.status === 404 ? 'SEFARIA_NOT_FOUND' : 'SEFARIA_DOWN');
  const data = await res.json();
  let he = data.he;
  if (!Array.isArray(he)) throw new Error('SEFARIA_NOT_FOUND');
  if (Array.isArray(he[0])) he = he.flat();
  if (Array.isArray(he[0])) he = he.flat(); // handle 3-level nesting
  const _decodeEl = document.createElement('textarea');
  const verses = he.map(v => {
    if (typeof v !== 'string') return '';
    _decodeEl.innerHTML = v.replace(/<[^>]+>/g, ''); // strip tags, then decode HTML entities
    return _decodeEl.value.trim();
  }).filter(Boolean);
  if (!verses.length) throw new Error('SEFARIA_NOT_FOUND');
  return verses;
}

// ── Start Learning ───────────────────────────────────────────────
async function startLearning() {
  if (!S.book || !S.unit) return;

  S.messages       = [];
  S.sessionScore   = 0;
  S.sessionStarted = false;
  S.greetingMode   = false;
  S.studyMode      = null;
  S.commentaryText = null;
  S.studyVerseIdx  = null;

  const btn     = document.getElementById('gp-start');
  const spinner = document.getElementById('header-spinner');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  spinner.classList.remove('hidden');

  // Clear chat and hide welcome
  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';

  try {
    S.verses = await fetchContent(S.collectionKey, S.book, S.unit);

    // Show input area (learning mode — hide picker, show textarea)
    document.getElementById('greeting-picker').classList.add('hidden');
    document.getElementById('chat-input-row').classList.remove('hidden');
    document.getElementById('input-area').classList.remove('hidden');
    document.getElementById('header-new-btn').classList.remove('hidden');
    document.getElementById('split-view-btn').classList.remove('hidden');
    document.getElementById('modal-finished').classList.add('hidden');

    // Auto-open the text panel
    if (!SV.active) _openSplitView();

    // Add session header inside chat
    const col = COLLECTIONS[S.collectionKey];
    const unitLabel = buildUnitLabel();
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'text-center text-sm text-gray-400 mb-4 pb-2 border-b border-parchmentDark';
    sessionHeader.innerHTML = `<span class="font-semibold" style="color:#B8860B;">${col.label}</span> | <span class="font-semibold text-navy">${S.book.he}</span> | ${unitLabel}`;
    chatEl.appendChild(sessionHeader);

    S.sessionStarted = true;
    S.waitingForFirstQuestion = true; // Flag: skip wrong-answer on initial AI response

    // First AI call
    S.messages.push({
      role: 'user',
      content: t('aiFirstMessage'),
    });
    await callAI();

  } catch (e) {
    console.error(e);
    const isNotFound = e.message === 'SEFARIA_NOT_FOUND';
    const isDown     = e.message === 'SEFARIA_DOWN';
    const title   = isNotFound ? t('errUnitNotFound') : isDown ? t('errSefariaDown') : t('errOccurred');
    const detail  = isNotFound
      ? t('errUnitNotFoundDetail')
      : isDown
        ? t('errSefariaDownDetail')
        : e.message;
    chatEl.innerHTML = '';
    rabbiSayBubble(`
      <div style="font-weight:700;color:#B91C1C;margin-bottom:6px;">😔 ${title}</div>
      <div style="color:#6B7280;">${detail}</div>
      <div style="margin-top:10px;font-size:0.85rem;color:#9CA3AF;">${t('errTryOther')}</div>
    `);
    document.getElementById('greeting-picker').classList.remove('hidden');
    document.getElementById('chat-input-row').classList.add('hidden');
    document.getElementById('input-area').classList.remove('hidden');
    setInput(true);
    S.greetingMode = true;
    gpCollectionChange();
    if (btn) { btn.disabled = !S.unit; btn.style.opacity = S.unit ? '1' : '0.5'; }
  } finally {
    spinner.classList.add('hidden');
  }
}

function buildUnitLabel() {
  const col = COLLECTIONS[S.collectionKey];
  if (col.type === 'daf') {
    const dafNum  = parseInt(S.unit, 10);
    const amud    = S.unit.endsWith('b') ? 'ב' : 'א';
    return `${col.unitLabel} ${toHebrew(dafNum)} עמוד ${amud}'`;
  } else {
    return `${col.unitLabel} ${toHebrew(parseInt(S.unit, 10))}`;
  }
}

// ── Claude API call ──────────────────────────────────────────────
async function callAI() {
  S.loading = true;
  setInput(false);
  const tid = showTyping();

  try {
    const col         = COLLECTIONS[S.collectionKey];
    const unitLabel   = buildUnitLabel();
    const isVerseMode = S.studyMode === 'iyun' || S.studyMode === 'bekiut';
    const body = {
      messages:        S.messages,
      chapter_text:    isVerseMode
        ? `1. ${S.verses[S.studyVerseIdx ?? 0] || ''}`
        : S.verses.map((v, i) => `${i + 1}. ${v}`).join('\n'),
      book_name:       S.book.he,
      chapter_num:     unitLabel,
      total_verses:    isVerseMode ? 1 : S.verses.length,
      collection_type: S.collectionKey,
      lang:            currentLang,
    };
    if (isVerseMode) {
      body.study_mode      = S.studyMode;
      body.commentary_text = S.commentaryText || '';
      body.verse_num       = (S.studyVerseIdx !== null ? S.studyVerseIdx : 0) + 1;
    }
    if (GLOBAL_MODEL) body.model = GLOBAL_MODEL;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);
    let res;
    try {
      res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    removeTyping(tid);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();
    S.messages.push({ role: 'assistant', content: JSON.stringify(data) });
    processResponse(data);

  } catch (e) {
    removeTyping(tid);
    console.error(e);
    const msg = e.name === 'AbortError' ? t('errTimeout') : `${t('errOccurred')}: ${e.message}`;
    appendError(msg);
    setInput(true);
  } finally {
    S.loading = false;
  }
}

// ── Process AI JSON ──────────────────────────────────────────────
function processResponse(data) {
  const isInitial = S.waitingForFirstQuestion;
  S.waitingForFirstQuestion = false;
  if (data.score > 0) {
    addScore(data.score);
    S.wrongAttempts = 0;
  } else if (!isInitial && data.score === 0 && data.feedback && data.feedback.trim()) {
    S.wrongAttempts++;
    deductScore(2);
    wrongAnswer();
  }

  // Override verse from authoritative local source
  if (data.next_verse_num && S.verses[data.next_verse_num - 1]) {
    data.next_verse = S.verses[data.next_verse_num - 1];
  }

  renderAI(data);

  // Auto-highlight the current verse in the split-view panel
  if (data.next_verse_num) _autoHighlightVerse(data.next_verse_num - 1);

  if (data.is_finished) {
    showFinished();
  } else {
    setInput(true);
    setTimeout(() => document.getElementById('user-input').focus(), 100);
  }
}

// ── Send message ─────────────────────────────────────────────────
async function sendMessage() {
  const ta   = document.getElementById('user-input');
  const text = ta.value.trim();
  if (!text || S.loading) return;
  ta.value = '';
  renderUser(text);
  if (S.greetingMode) { await handleGreetingResponse(text); return; }
  S.messages.push({ role: 'user', content: text });
  await callAI();
}

async function sendExplain() {
  if (S.loading) return;
  const text = t('explainRequest');
  renderUser(text);
  S.messages.push({ role: 'user', content: text });
  await callAI();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// ── Render helpers ───────────────────────────────────────────────
function renderAI(data) {
  const box      = document.getElementById('chat');
  const outer    = document.createElement('div');
  outer.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;';
  outer.innerHTML = `
    <div style="flex-shrink:0;text-align:center;">
      <img src="rabbi.png" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #B8860B;display:block;">
      <div style="font-size:0.6rem;color:#B8860B;font-weight:700;margin-top:2px;white-space:nowrap;">${t('rabbiName')}</div>
    </div>
    <div class="rabbi-bubble-inner" style="flex:1;min-width:0;"></div>`;
  box.appendChild(outer);
  const wrap = outer.querySelector('.rabbi-bubble-inner');
  wrap.className += ' bubble-ai rounded-2xl p-4';

  let html = '';

  if (data.feedback) {
    html += `<div class="text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100 leading-relaxed">
               💬 ${esc(data.feedback)}
             </div>`;
  }

  if (data.explanation) {
    html += `<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-sm text-blue-800 leading-relaxed">
               <strong>${t('explanationLabel')}</strong> ${esc(data.explanation)}
             </div>`;
  }

  if (!data.is_finished && data.next_verse) {
    html += `<div class="verse-box p-4 mb-3">
               <div class="flex items-start gap-3">
                 ${S.collectionKey !== 'shas' ? `<span class="flex-shrink-0 font-bold text-gold text-xl mt-0.5">${toHebrew(data.next_verse_num)}</span>` : ''}
                 <p class="text-lg font-semibold leading-loose">${esc(data.next_verse)}</p>
               </div>
             </div>`;
  }

  if (!data.is_finished && data.next_question) {
    html += `<div class="text-base font-medium leading-relaxed">
               <span class="text-navy">❓</span> ${esc(data.next_question)}
             </div>`;
  }

  wrap.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

function renderUser(text) {
  const box  = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = 'flex mb-4';
  wrap.innerHTML = `<div class="bubble-user rounded-2xl px-4 py-3 max-w-lg leading-relaxed" style="margin-left:auto">${esc(text)}</div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

function appendError(msg) {
  const box = document.getElementById('chat');
  const d   = document.createElement('div');
  d.className = 'bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4';
  d.textContent = msg;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

function showTyping() {
  const box = document.getElementById('chat');
  const id  = 'typing-' + Date.now();
  const d   = document.createElement('div');
  d.id = id;
  d.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;';

  // Pick random subset of messages (shuffle, take up to all)
  const msgs = [...(GLOBAL_THINKING_MSGS || t('thinkingMsgs'))].sort(() => Math.random() - 0.5);
  let idx = 0;

  d.innerHTML = `
    <div style="flex-shrink:0;text-align:center;">
      <img src="rabbi.png" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #B8860B;">
      <div style="font-size:0.6rem;color:#B8860B;font-weight:700;margin-top:2px;">רבי בניהו</div>
    </div>
    <div class="bubble-ai rounded-2xl px-4 py-3" style="flex:1;">
      <div id="${id}-msg" style="font-size:0.97rem;font-weight:700;color:#1B3A6B;margin-bottom:10px;">${msgs[0]}</div>
      <div style="background:#e8e0d0;border-radius:99px;height:6px;overflow:hidden;">
        <div id="${id}-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#B8860B,#F0C040);border-radius:99px;transition:width 0.4s ease;"></div>
      </div>
    </div>`;

  box.appendChild(d);
  box.scrollTop = box.scrollHeight;

  // Animate progress bar and cycle messages
  let pct = 0;
  const interval = setInterval(() => {
    if (!document.getElementById(id)) { clearInterval(interval); return; }
    pct = Math.min(pct + (Math.random() * 8 + 3), 90);
    const bar = document.getElementById(`${id}-bar`);
    if (bar) bar.style.width = pct + '%';
    idx = (idx + 1) % msgs.length;
    const msgEl = document.getElementById(`${id}-msg`);
    if (msgEl) {
      msgEl.style.opacity = '0';
      setTimeout(() => { if (msgEl) { msgEl.textContent = msgs[idx]; msgEl.style.opacity = '1'; } }, 200);
    }
  }, 1800);

  d._interval = interval;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) { clearInterval(el._interval); el.remove(); }
}

// ── Score ────────────────────────────────────────────────────────
function addScore(pts) {
  S.totalScore   += pts;
  S.sessionScore += pts;
  localStorage.setItem('chavruta_score', S.totalScore);
  refreshScores();
  popScore(pts);
  playCorrectSound();
}

function deductScore(pts) {
  S.totalScore   -= pts;
  S.sessionScore -= pts;
  localStorage.setItem('chavruta_score', S.totalScore);
  refreshScores();
}

function refreshScores() {
  document.getElementById('score-display').textContent = S.totalScore;
}

function popScore(pts) {
  const el    = document.getElementById('score-popup');
  const inner = document.getElementById('score-popup-inner');
  inner.textContent = `+${pts}`;
  inner.classList.remove('score-pop');
  el.classList.remove('hidden');
  void inner.offsetWidth;
  inner.classList.add('score-pop');
  setTimeout(() => {
    el.classList.add('hidden');
    inner.classList.remove('score-pop');
  }, 2500);
}

// ── Wrong answer ─────────────────────────────────────────────────
function wrongAnswer() {
  playWrongSound();
  // Shake the last user bubble
  const bubbles = document.querySelectorAll('.bubble-user');
  const last    = bubbles[bubbles.length - 1];
  if (last) {
    last.classList.remove('wrong-shake');
    void last.offsetWidth;
    last.classList.add('wrong-shake');
    setTimeout(() => last.classList.remove('wrong-shake'), 500);
  }
  // Show floating ✗ popup
  const el    = document.getElementById('wrong-popup');
  const inner = document.getElementById('wrong-popup-inner');
  inner.classList.remove('wrong-pop');
  el.classList.remove('hidden');
  void inner.offsetWidth;
  inner.classList.add('wrong-pop');
  setTimeout(() => {
    el.classList.add('hidden');
    inner.classList.remove('wrong-pop');
  }, 2100);
}

// ── Finished ─────────────────────────────────────────────────────
function showFinished() {
  setInput(false);
  document.getElementById('input-area').classList.add('hidden');
  const unitLabel = buildUnitLabel();
  document.getElementById('fin-msg').textContent = t('finMsg')(S.book.he, unitLabel);
  document.getElementById('fin-score').textContent = t('finScore')(S.sessionScore, S.totalScore);
  document.getElementById('modal-finished').classList.remove('hidden');
}

function resetSession() {
  document.getElementById('modal-finished').classList.add('hidden');
  document.getElementById('input-area').classList.add('hidden');
  document.getElementById('header-new-btn').classList.add('hidden');
  document.getElementById('split-view-btn').classList.add('hidden');

  // Reset split view
  if (SV.active) _closeSplitView();
  SV.selectedCommentators.clear();
  SV.commentaryCache = {};
  SV.hoveredVerseIdx = null;

  // Save to history if session had activity
  if (S.sessionStarted && S.sessionScore > 0 && S.book) {
    const col = COLLECTIONS[S.collectionKey];
    const bookTotal = col.type === 'daf' ? S.book.daf - 1 : (S.book.ch || 0);
    saveSessionToHistory({
      collection: S.collectionKey,
      collectionLabel: col.label,
      book: S.book.he,
      unit: buildUnitLabel(),
      unitRaw: S.unit,
      score: S.sessionScore,
      exchanges: Math.floor((S.messages.length - 1) / 2),
      bookTotal,
    });
  }

  S.messages       = [];
  S.sessionScore   = 0;
  S.loading        = false;
  S.sessionStarted = false;

  showGreeting();
}

// ── Utils ────────────────────────────────────────────────────────
function setInput(on) {
  const area = document.getElementById('input-area');
  area.querySelectorAll('button, textarea').forEach(el => {
    el.disabled      = !on;
    el.style.opacity = on ? '' : '0.5';
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function buildGreetingHtml(text) {
  const lines = (text || t('defaultGreeting')).split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    const e = esc(line);
    if (i === 0)               return `<div style="font-weight:800;font-size:1.05rem;color:#1B3A6B;">${e}</div>`;
    if (i === lines.length - 1) return `<div style="margin-top:8px;color:#B8860B;font-weight:700;">${e}</div>`;
    return `<div>${e}</div>`;
  }).join('');
}

function resetGreeting() {
  document.getElementById('admin-greeting').value = DEFAULT_GREETING;
}

function resetThinkingMsgs() {
  document.getElementById('admin-thinking-msgs').value = t('thinkingMsgs').join('\n');
}

// ── Share Card ────────────────────────────────────────────────────
async function openShareModal() {
  document.getElementById('modal-share-card').classList.remove('hidden');
  await document.fonts.ready;
  generateShareCard();
}

function closeShareModal() {
  document.getElementById('modal-share-card').classList.add('hidden');
}

async function generateShareCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W;
  canvas.height = H;

  const cfg = SHARE_CARD_CONFIG;
  const dark = cfg.theme !== 'light';
  const GOLD   = '#F0C040';
  const GOLDDARK = '#B8860B';
  const textMain = dark ? '#FDF8EF' : '#1B3A6B';

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  if (dark) {
    bg.addColorStop(0,   '#0A1628');
    bg.addColorStop(0.5, '#1B3A6B');
    bg.addColorStop(1,   '#0A1628');
  } else {
    bg.addColorStop(0, '#FDF8EF');
    bg.addColorStop(1, '#F0E6C8');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Borders ──
  ctx.strokeStyle = GOLDDARK;
  ctx.lineWidth = 10;
  _scRoundRect(ctx, 24, 24, W-48, H-48, 26);
  ctx.stroke();
  ctx.lineWidth = 2;
  _scRoundRect(ctx, 46, 46, W-92, H-92, 18);
  ctx.stroke();

  // ── Corner diamonds ──
  [[68,68],[W-68,68],[68,H-68],[W-68,H-68]].forEach(([x,y]) => {
    ctx.fillStyle = GOLDDARK;
    ctx.beginPath();
    ctx.moveTo(x, y-13); ctx.lineTo(x+13, y);
    ctx.lineTo(x, y+13); ctx.lineTo(x-13, y);
    ctx.closePath(); ctx.fill();
  });

  ctx.textAlign = 'center';
  ctx.direction = 'rtl';

  // ── App name ──
  ctx.fillStyle = GOLD;
  ctx.font = `bold 68px 'Noto Serif Hebrew', serif`;
  ctx.fillText(cfg.headerText || 'חברותא | שירת התורה', W/2, 172);

  // ── Subtitle ──
  ctx.fillStyle = dark ? 'rgba(240,192,64,0.65)' : GOLDDARK;
  ctx.font = `38px 'Noto Serif Hebrew', serif`;
  ctx.fillText(cfg.subtitle || 'לימוד תורה אינטראקטיבי', W/2, 232);

  // ── Divider ──
  _scDivider(ctx, W/2, 278, 700, GOLDDARK);

  // ── "I learned today" ──
  ctx.fillStyle = textMain;
  ctx.font = `46px 'Noto Serif Hebrew', serif`;
  ctx.fillText(cfg.learnedText || 'למדתי היום את', W/2, 390);

  // ── Book + chapter (large gold, auto-shrink) ──
  ctx.fillStyle = GOLD;
  let bookFontSize = 88;
  const bookLabel = `${S.book?.he || ''} ${buildUnitLabel()}`;
  ctx.font = `bold ${bookFontSize}px 'Noto Serif Hebrew', serif`;
  while (ctx.measureText(bookLabel).width > W - 120 && bookFontSize > 52) {
    bookFontSize -= 4;
    ctx.font = `bold ${bookFontSize}px 'Noto Serif Hebrew', serif`;
  }
  ctx.fillText(bookLabel, W/2, 508);

  // ── Divider ──
  _scDivider(ctx, W/2, 562, 520, GOLDDARK);

  // ── Score ──
  ctx.fillStyle = textMain;
  ctx.font = `52px 'Noto Serif Hebrew', serif`;
  const scoreLabel = (cfg.scoreText || 'וצברתי {score} נקודות')
    .replace('{score}', S.sessionScore);
  ctx.fillText(scoreLabel, W/2, 652);

  // ── Stars ──
  const stars = Math.min(5, Math.max(1, Math.round(S.sessionScore / 8)));
  ctx.direction = 'ltr';
  ctx.font = `68px sans-serif`;
  ctx.fillText('⭐'.repeat(stars), W/2, 740);
  ctx.direction = 'rtl';

  // ── Divider ──
  _scDivider(ctx, W/2, 788, 700, GOLDDARK);

  // ── CTA ──
  ctx.fillStyle = textMain;
  ctx.font = `46px 'Noto Serif Hebrew', serif`;
  ctx.fillText(cfg.ctaText || 'בוא ללמוד תורה גם אתה!', W/2, 888);

  // ── URL ──
  ctx.fillStyle = GOLD;
  ctx.font = `bold 40px Arial, sans-serif`;
  ctx.direction = 'ltr';
  ctx.fillText(cfg.siteUrl || 'chavruta.vercel.app', W/2, 958);
}

function _scRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y,   x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x,   y+h, x,     y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x,   y,   x+r,   y);
  ctx.closePath();
}

function _scDivider(ctx, cx, y, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width/2, y);
  ctx.lineTo(cx + width/2, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, y-11); ctx.lineTo(cx+11, y);
  ctx.lineTo(cx, y+11); ctx.lineTo(cx-11, y);
  ctx.closePath(); ctx.fill();
}

function downloadShareCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  const bookName = (S.book?.he || 'chavruta').replace(/\s+/g, '-');
  link.download = `chavruta-${bookName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function shareCardToWhatsapp() {
  const cfg = SHARE_CARD_CONFIG;
  const url  = cfg.siteUrl?.startsWith('http') ? cfg.siteUrl : `https://${cfg.siteUrl || 'chavruta.vercel.app'}`;
  const text = `למדתי ${S.book?.he || ''} ${buildUnitLabel()} וצברתי ${S.sessionScore} נקודות ב-חברותא 📖\n${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function copyShareLink() {
  const cfg = SHARE_CARD_CONFIG;
  const url  = cfg.siteUrl?.startsWith('http') ? cfg.siteUrl : `https://${cfg.siteUrl || 'chavruta.vercel.app'}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copy-link-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ הועתק!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

// Admin preview – opens the share modal with a dummy session if no session is active
function previewShareCardAdmin() {
  if (!S.book) {
    S.book = { he: 'בראשית' };
    S.unit = 1;
    S.collectionKey = 'tanach';
    S.sessionScore = 47;
    const _wasDummy = true;
    openShareModal().then(() => {
      if (_wasDummy) { S.book = null; S.unit = null; S.sessionScore = 0; }
    });
    return;
  }
  openShareModal();
}

// Admin: save share card config
async function saveShareCardConfig() {
  const user = getUser();
  if (!user) return;
  const cfg = {
    theme:      document.getElementById('sc-theme').value,
    headerText: document.getElementById('sc-header').value,
    subtitle:   document.getElementById('sc-subtitle').value,
    learnedText: document.getElementById('sc-learned').value,
    scoreText:  document.getElementById('sc-score-text').value,
    ctaText:    document.getElementById('sc-cta').value,
    siteUrl:    document.getElementById('sc-url').value,
  };
  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ shareCard: cfg }),
    });
    if (!r.ok) throw new Error();
    SHARE_CARD_CONFIG = { ...SHARE_CARD_CONFIG, ...cfg };
    const msg = document.getElementById('sc-save-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch { alert('שגיאה בשמירה'); }
}

// Admin: populate share card fields when admin panel opens
function populateShareCardAdmin() {
  const cfg = SHARE_CARD_CONFIG;
  document.getElementById('sc-theme').value      = cfg.theme || 'dark';
  document.getElementById('sc-header').value     = cfg.headerText || '';
  document.getElementById('sc-subtitle').value   = cfg.subtitle || '';
  document.getElementById('sc-learned').value    = cfg.learnedText || '';
  document.getElementById('sc-score-text').value = cfg.scoreText || '';
  document.getElementById('sc-cta').value        = cfg.ctaText || '';
  document.getElementById('sc-url').value        = cfg.siteUrl || '';
}

// ── Learning History ─────────────────────────────────────────────
const COLLECTION_ICONS = { tanach:'📖', mishnah:'📜', shas:'🕍', rambam:'✍️', shulchan:'⚖️' };

async function saveSessionToHistory(record) {
  const user = getUser();
  if (!user) return;
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, record })
    });
  } catch { /* silent */ }
}

function openHistory() {
  document.getElementById('modal-history').classList.remove('hidden');
  loadHistory();
}

function closeHistory() {
  document.getElementById('modal-history').classList.add('hidden');
}

async function loadHistory() {
  const user = getUser();
  if (!user) return;
  const list = document.getElementById('history-list');
  list.innerHTML = `<div class="text-center text-gray-400 py-8">${t('historyLoading')}</div>`;

  try {
    const res = await fetch(`/api/history?email=${encodeURIComponent(user.email)}`);
    const history = await res.json();

    if (!history.length) {
      list.innerHTML = `
        <div class="text-center py-12">
          <div style="font-size:3rem;margin-bottom:12px;">🌱</div>
          <p class="text-gray-500 font-medium">${t('historyEmpty')}</p>
          <p class="text-gray-400 text-sm mt-1">${t('historyEmptySub')}</p>
        </div>`;
      document.getElementById('stat-units').textContent = '0';
      document.getElementById('stat-score').textContent = '0';
      document.getElementById('stat-books').textContent = '0';
      return;
    }

    // Stats
    const totalScore = history.reduce((s, r) => s + (r.score || 0), 0);
    const uniqueBooks = new Set(history.map(r => r.book)).size;
    document.getElementById('stat-units').textContent = history.length;
    document.getElementById('stat-score').textContent = totalScore.toLocaleString();
    document.getElementById('stat-books').textContent = uniqueBooks;

    // Group by date
    const groups = {};
    history.forEach(r => {
      const d = new Date(r.ts);
      const key = d.toLocaleDateString('he-IL', { year:'numeric', month:'long', day:'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    // Build book progress
    const bookMap = {};
    history.forEach(r => {
      const key = `${r.collection}|${r.book}`;
      if (!bookMap[key]) bookMap[key] = { book: r.book, collectionLabel: r.collectionLabel, icon: COLLECTION_ICONS[r.collection] || '📖', units: new Set(), total: r.bookTotal || 0 };
      if (r.unitRaw) bookMap[key].units.add(String(r.unitRaw));
    });

    const progressHTML = Object.values(bookMap).map(b => {
      const studied = b.units.size;
      const total   = b.total;
      const pct     = total ? Math.round((studied / total) * 100) : 0;
      return `
        <div style="background:white;border-radius:12px;padding:12px 14px;border:1px solid #e8e0d0;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:1.3rem;">${b.icon}</span>
            <div style="flex:1">
              <div style="font-weight:700;color:#1a2744;font-size:0.9rem;">${esc(b.book)}</div>
              <div style="color:#9CA3AF;font-size:0.72rem;">${esc(b.collectionLabel)}</div>
            </div>
            <div style="font-weight:700;color:#B8860B;font-size:0.85rem;">${studied}${total ? `/${total}` : ''}</div>
          </div>
          ${total ? `
            <div style="background:#f0e6c8;border-radius:99px;height:6px;overflow:hidden;">
              <div style="background:linear-gradient(90deg,#B8860B,#F0C040);height:100%;width:${pct}%;border-radius:99px;transition:width 0.6s;"></div>
            </div>` : ''}
        </div>`;
    }).join('');

    list.innerHTML = `
      <div class="mb-2" style="font-weight:700;color:#1a2744;font-size:0.85rem;">${t('recentChats')}</div>
      ${Object.entries(groups).map(([date, records]) => `
        <div class="mb-5">
          <div class="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <span class="flex-1 border-t border-gray-200"></span>
            <span>${date}</span>
            <span class="flex-1 border-t border-gray-200"></span>
          </div>
          <div class="space-y-2">
            ${records.map(r => `
              <div style="background:white;border-radius:14px;padding:12px 14px;border:1px solid #e8e0d0;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="font-size:1.6rem;flex-shrink:0;">${COLLECTION_ICONS[r.collection] || '📖'}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:700;color:#1a2744;font-size:0.9rem;">${esc(r.book)}</div>
                  <div style="color:#6B7280;font-size:0.78rem;">${esc(r.collectionLabel)} • ${esc(r.unit)}</div>
                  ${r.exchanges ? `<div style="color:#9CA3AF;font-size:0.72rem;margin-top:1px;">${r.exchanges} ${t('exchanges')}</div>` : ''}
                </div>
                <div style="text-align:center;flex-shrink:0;">
                  <div style="color:#B8860B;font-weight:800;font-size:1rem;">★ ${r.score}</div>
                  <div style="color:#9CA3AF;font-size:0.68rem;">${new Date(r.ts).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div class="mt-4 mb-2" style="font-weight:700;color:#1a2744;font-size:0.85rem;">${t('progressByBook')}</div>
      ${progressHTML}
    `;

  } catch {
    list.innerHTML = `<div class="text-center text-red-500 py-8">${t('historyError')}</div>`;
  }
}

// ── Greeting picker ──────────────────────────────────────────────
function gpCollectionChange() {
  const key = document.getElementById('gp-collection').value;
  S.collectionKey = key;
  S.book = null; S.unit = null;
  const col = COLLECTIONS[key];
  const lbl = getPickerLabels(key);
  const bookSel = document.getElementById('gp-book');
  bookSel.innerHTML = `<option value="">— ${lbl.book} —</option>`;
  // Group by g field if available
  const groups = {};
  col.items.forEach(item => {
    const g = item.g || '';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });
  Object.entries(groups).forEach(([g, items]) => {
    if (g) {
      const og = document.createElement('optgroup');
      og.label = g;
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.sf;
        opt.textContent = item.he;
        og.appendChild(opt);
      });
      bookSel.appendChild(og);
    } else {
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.sf;
        opt.textContent = item.he;
        bookSel.appendChild(opt);
      });
    }
  });
  const unitSel = document.getElementById('gp-unit');
  unitSel.innerHTML = `<option value="">— ${lbl.unit} —</option>`;
  unitSel.disabled = true;
  const btn = document.getElementById('gp-start');
  btn.disabled = true; btn.style.opacity = '0.5';
}

function gpBookChange() {
  const sf = document.getElementById('gp-book').value;
  const col = COLLECTIONS[S.collectionKey];
  S.book = col.items.find(b => b.sf === sf) || null;
  S.unit = null;
  const lbl = getPickerLabels(S.collectionKey);
  const unitSel = document.getElementById('gp-unit');
  unitSel.innerHTML = `<option value="">— ${lbl.unit} —</option>`;
  const btn = document.getElementById('gp-start');
  if (!S.book) { unitSel.disabled = true; btn.disabled = true; btn.style.opacity='0.5'; return; }
  unitSel.disabled = false;
  if (col.type === 'daf') {
    for (let d = 2; d <= S.book.daf; d++) {
      for (const a of ['a','b']) {
        const opt = document.createElement('option');
        opt.value = `${d}${a}`;
        opt.textContent = `דף ${toHebrew(d)} עמוד ${a==='a'?'א':'ב'}'`;
        unitSel.appendChild(opt);
      }
    }
  } else {
    for (let i = 1; i <= S.book.ch; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${col.unitLabel} ${toHebrew(i)}`;
      unitSel.appendChild(opt);
    }
  }
}

function gpUnitChange() {
  S.unit = document.getElementById('gp-unit').value || null;
  const btn = document.getElementById('gp-start');
  btn.disabled = !S.unit; btn.style.opacity = S.unit ? '1' : '0.5';
}

function gpStart() {
  if (!S.book || !S.unit) return;
  if (_greetingTimer) { clearTimeout(_greetingTimer); _greetingTimer = null; }
  S.greetingMode = false;
  document.getElementById('greeting-picker').classList.add('hidden');
  document.getElementById('chat-input-row').classList.remove('hidden');
  startLearning();
}

// ── Greeting mode ────────────────────────────────────────────────
let _greetingTimer = null;

function showGreeting() {
  if (_greetingTimer) { clearTimeout(_greetingTimer); _greetingTimer = null; }
  S.greetingMode = true;
  const chatEl = document.getElementById('chat');
  document.getElementById('input-area').classList.add('hidden');
  document.getElementById('header-new-btn').classList.add('hidden');

  // If welcome div doesn't exist (after a previous session), recreate it with animation
  if (!document.getElementById('welcome')) {
    chatEl.innerHTML = '';
    const welcomeDiv = document.createElement('div');
    welcomeDiv.id = 'welcome';
    welcomeDiv.innerHTML = `
      <img src="rabbi.png" alt="רבי בניהו" class="rabbi-avatar-lg anim-line anim-1">
      <p class="anim-line anim-2" style="font-size:2rem;font-weight:800;color:#1B3A6B;margin:0;" data-i18n="greetingHello">${t('greetingHello')}</p>
      <p class="anim-line anim-3" style="font-size:1.25rem;font-weight:700;color:#B8860B;margin:0;" data-i18n="greetingName">${t('greetingName')}</p>
      <p class="anim-line anim-sub" style="font-size:1rem;color:#6B7280;margin:0;" data-i18n="greetingSubtitle">${t('greetingSubtitle')}</p>
    `;
    chatEl.appendChild(welcomeDiv);
  }

  // After animations complete, add button inside the welcome div
  _greetingTimer = setTimeout(() => {
    _greetingTimer = null;
    if (S.sessionStarted) return;
    const welcome = document.getElementById('welcome');
    if (!welcome) return;
    // Remove old button if exists
    const old = welcome.querySelector('.start-learning-btn');
    if (old) old.remove();
    const startBtn = document.createElement('button');
    startBtn.className = 'start-learning-btn';
    startBtn.textContent = t('greetingStartBtn');
    startBtn.style.cssText = 'display:block;margin:28px auto 0;background:#1B3A6B;color:#F0C040;border:none;border-radius:14px;padding:14px 32px;font-size:1.05rem;font-weight:800;cursor:pointer;transition:all .2s;';
    startBtn.onmouseenter = () => { startBtn.style.transform='translateY(-2px)'; startBtn.style.boxShadow='0 8px 24px rgba(27,58,107,0.35)'; };
    startBtn.onmouseleave = () => { startBtn.style.transform=''; startBtn.style.boxShadow=''; };
    startBtn.onclick = () => {
      chatEl.innerHTML = '';
      const outer = document.createElement('div');
      outer.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;margin-top:8px;';
      const bubble = document.createElement('div');
      bubble.className = 'bubble-ai rounded-2xl p-4';
      bubble.style.cssText = 'flex:1;line-height:1.9;font-size:1rem;';
      outer.innerHTML = `
        <div style="flex-shrink:0;text-align:center;">
          <img src="rabbi.png" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #B8860B;">
          <div style="font-size:0.62rem;color:#B8860B;font-weight:700;margin-top:3px;">${t('rabbiName')}</div>
        </div>`;
      outer.appendChild(bubble);
      chatEl.appendChild(outer);

      // Typewriter effect — word by word
      const lines = (GLOBAL_GREETING_HE || t('defaultGreeting')).split('\n').filter(l => l.trim());
      const totalLines = lines.length;
      let lineIdx = 0;

      function typeLine() {
        if (lineIdx >= totalLines) {
          document.getElementById('greeting-picker').classList.remove('hidden');
          document.getElementById('chat-input-row').classList.add('hidden');
          document.getElementById('input-area').classList.remove('hidden');
          setInput(true);
          gpCollectionChange();
          return;
        }
        const line = lines[lineIdx];
        const isFirst = lineIdx === 0;
        const isLast  = lineIdx === totalLines - 1;
        const el = document.createElement('div');
        if (isFirst) el.style.cssText = 'font-weight:800;font-size:1.05rem;color:#1B3A6B;';
        if (isLast)  el.style.cssText = 'margin-top:8px;color:#B8860B;font-weight:700;';
        bubble.appendChild(el);

        const words = line.split(' ');
        let wordIdx = 0;
        const delay = isFirst ? 35 : 42; // ms per word

        const interval = setInterval(() => {
          if (wordIdx >= words.length) {
            clearInterval(interval);
            lineIdx++;
            setTimeout(typeLine, isFirst ? 80 : 60);
            return;
          }
          el.textContent += (wordIdx === 0 ? '' : ' ') + words[wordIdx];
          wordIdx++;
        }, delay);
      }

      typeLine();
    };
    welcome.appendChild(startBtn);
  }, 3200);
}

// Hebrew numeral → integer
const HEB_NUMS = {
  'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
  'י':10,'יא':11,'יב':12,'יג':13,'יד':14,'טו':15,'טז':16,
  'יז':17,'יח':18,'יט':19,'כ':20,'כא':21,'כב':22,'כג':23,
  'כד':24,'כה':25,'כו':26,'כז':27,'כח':28,'כט':29,'ל':30,
  'לא':31,'לב':32,'לג':33,'לד':34,'לה':35,'לו':36,'לז':37,
  'לח':38,'לט':39,'מ':40,'מא':41,'מב':42,'מג':43,'מד':44,
  'מה':45,'מו':46,'מז':47,'מח':48,'מט':49,'נ':50,
};
function heNum(s) { return HEB_NUMS[s.replace(/['׳\s]/g,'')] || null; }

function extractUnit(text, type) {
  if (type === 'daf') {
    const mH = text.match(/דף\s+([\u05D0-\u05EA]{1,3})['׳]?\s*(?:עמוד\s*)?([אב])?/);
    if (mH) { const n=heNum(mH[1]); if(n) return `${n}${mH[2]==='ב'?'b':'a'}`; }
    const mA = text.match(/דף\s+(\d+)\s*([אב])?/);
    if (mA) return `${mA[1]}${mA[2]==='ב'?'b':'a'}`;
    return '2a';
  } else {
    const mH = text.match(/פרק\s+([\u05D0-\u05EA]{1,3})['׳]?/);
    if (mH) { const n=heNum(mH[1]); if(n) return n; }
    const mA = text.match(/פרק\s+(\d+)/);
    if (mA) return parseInt(mA[1]);
    const mN = text.match(/(\d+)/);
    if (mN) return parseInt(mN[1]);
    return 1;
  }
}

function parseStudyRequest(text) {
  const isDaf      = /דף|גמרא|בבלי/.test(text);
  const isMishnah  = /משנה(?! תורה)/.test(text) && !isDaf;
  const isRambam   = /רמב"?ם|משנה תורה|הלכות/.test(text);
  const isShulchan = /שולחן|אורח חיים|יורה דעה|חושן משפט|אבן העזר/.test(text);

  let order = ['tanach','mishnah','shas','rambam','shulchan'];
  if (isDaf)      order = ['shas','mishnah','tanach','rambam','shulchan'];
  if (isMishnah)  order = ['mishnah','shas','tanach','rambam','shulchan'];
  if (isRambam)   order = ['rambam','shulchan','mishnah','tanach','shas'];
  if (isShulchan) order = ['shulchan','rambam','mishnah','tanach','shas'];

  for (const collKey of order) {
    const coll = COLLECTIONS[collKey];
    for (const item of coll.items) {
      if (text.includes(item.he)) {
        const unit = extractUnit(text, coll.type);
        return { collection: collKey, bookSf: item.sf, unit };
      }
    }
  }
  return null;
}

function rabbiSayBubble(html) {
  const box = document.getElementById('chat');
  const outer = document.createElement('div');
  outer.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;';
  outer.innerHTML = `
    <div style="flex-shrink:0;text-align:center;">
      <img src="rabbi.png" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #B8860B;">
      <div style="font-size:0.6rem;color:#B8860B;font-weight:700;margin-top:2px;">רבי בניהו</div>
    </div>
    <div class="bubble-ai rounded-2xl p-4" style="flex:1;line-height:1.75;">${html}</div>`;
  box.appendChild(outer);
  box.scrollTop = box.scrollHeight;
}

async function handleGreetingResponse(text) {
  const parsed = parseStudyRequest(text);
  if (parsed) {
    document.getElementById('gp-collection').value = parsed.collection;
    gpCollectionChange();
    document.getElementById('gp-book').value = parsed.bookSf;
    gpBookChange();
    document.getElementById('gp-unit').value = String(parsed.unit);
    gpUnitChange();
    S.greetingMode = false;
    await startLearning();
  } else {
    rabbiSayBubble(`
      ${t('parseErrMsg')}<br>
      <span style="display:block;margin-top:8px;">📖 <strong>בראשית פרק א</strong></span>
      <span style="display:block;">📜 <strong>ברכות פרק א</strong> (משנה)</span>
      <span style="display:block;">🕍 <strong>בבא קמא דף ב</strong></span>
      <span style="display:block;margin-top:8px;color:#9CA3AF;font-size:0.85rem;">${t('parseErrOr')}</span>
    `);
  }
}

// ── Email Templates (Admin) ──────────────────────────────────────
const DEFAULT_EMAIL_SUBJECTS = {
  welcome:      'קיבלנו את בקשתך – חברותא',
  approval:     'אושרת לחברותא! 🎉',
  admin_notify: 'משתמש חדש נרשם – חברותא',
};
const DEFAULT_EMAIL_BODIES = {
  welcome:      `<h2 style="color:#1a2744;">שלום {{name}}! 👋</h2>\n<p style="color:#444;line-height:1.7;">קיבלנו את בקשת ההרשמה שלך לאפליקציית <strong>חברותא</strong>.</p>\n<p style="color:#444;line-height:1.7;">בקשתך בבדיקה ותקבל מייל נוסף ברגע שתאושר.</p>\n<p style="color:#B8860B;font-weight:bold;margin-top:24px;">יחד נעמיק בתורה הקדושה 📖</p>`,
  approval:     `<h2 style="color:#1a2744;">בשורות טובות, {{name}}! 🎉</h2>\n<p style="color:#444;line-height:1.7;">הרשמתך לאפליקציית <strong>חברותא</strong> <strong style="color:green;">אושרה!</strong></p>\n<p style="color:#444;line-height:1.7;">כעת תוכל להיכנס ולהתחיל ללמוד עם רבי בניהו.</p>\n<p style="color:#B8860B;font-weight:bold;margin-top:28px;">יחד נעמיק בתורה הקדושה 📖</p>`,
  admin_notify: `<h2 style="color:#1a2744;">משתמש חדש נרשם</h2>\n<p style="color:#444;"><strong>שם:</strong> {{name}}</p>\n<p style="color:#444;"><strong>מייל:</strong> {{email}}</p>\n<p style="color:#888;font-size:0.9rem;">כנס לפאנל הניהול כדי לאשר או לדחות.</p>`,
};

async function loadEmailTemplates() {
  try {
    const res  = await fetch('/api/email-templates', { headers: adminHeaders() });
    const data = await res.json();
    for (const type of ['welcome', 'approval', 'admin_notify']) {
      const tmpl = data[type];
      document.getElementById(`email-subj-${type}`).value = tmpl?.subject || DEFAULT_EMAIL_SUBJECTS[type];
      document.getElementById(`email-body-${type}`).value = tmpl?.body    || DEFAULT_EMAIL_BODIES[type];
    }
  } catch { /* silent */ }
}

async function saveEmailTemplate(type) {
  const subject = document.getElementById(`email-subj-${type}`).value.trim();
  const body    = document.getElementById(`email-body-${type}`).value.trim();
  if (!subject || !body) return;
  try {
    await fetch('/api/email-templates', {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ type, subject, body })
    });
    const msg = document.getElementById(`email-save-msg-${type}`);
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
  } catch { /* silent */ }
}

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  S.totalScore = parseInt(localStorage.getItem('chavruta_score') || '0', 10);
  refreshScores();

  const user = getUser();
  if (user) {
    document.getElementById('modal-register').classList.add('hidden');
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      // Persist isAdmin flag if server says so (updates stale localStorage)
      if (data.isAdmin && !user.isAdmin) {
        localStorage.setItem('chavruta_user', JSON.stringify({ ...user, isAdmin: true }));
      }
      if (data.status === 'approved') {
        updateUserUI();
      } else if (data.status === 'not_found') {
        // Re-register (migration: user exists locally but not in KV)
        const r2 = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user.name, email: user.email })
        });
        const d2 = await r2.json();
        if (d2.isAdmin) localStorage.setItem('chavruta_user', JSON.stringify({ ...user, isAdmin: true }));
        if (d2.status === 'approved') updateUserUI(); else showPendingScreen();
      } else {
        showPendingScreen();
      }
    } catch {
      // Network error – allow access if already locally registered
      updateUserUI();
    }
  } else {
    document.getElementById('landing-page').classList.remove('hidden');
  }
}

function showRegisterFromLanding() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('modal-register').classList.remove('hidden');
  setTimeout(() => document.getElementById('reg-name').focus(), 200);
}

init();
applyLang();
