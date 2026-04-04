// ================================================================
// חברותא – אפליקציית לימוד | Frontend Logic
// ================================================================

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
  {g:'ספר המדע',    he:'עבודה זרה',        sf:'Mishneh Torah, Idolatry and Paganism',                                             ch:12},
  {g:'ספר המדע',    he:'תשובה',            sf:'Mishneh Torah, Repentance',                                                        ch:10},
  {g:'ספר אהבה',   he:'קריאת שמע',        sf:'Mishneh Torah, Recitation of Shema',                                               ch:4},
  {g:'ספר אהבה',   he:'תפילה',            sf:'Mishneh Torah, Prayer and the Priestly Blessing',                                  ch:15},
  {g:'ספר אהבה',   he:'ציצית',            sf:'Mishneh Torah, Fringes',                                                           ch:3},
  {g:'ספר אהבה',   he:'תפילין',           sf:'Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll',                            ch:10},
  {g:'ספר אהבה',   he:'ברכות',            sf:'Mishneh Torah, Blessings',                                                         ch:11},
  {g:'ספר אהבה',   he:'מילה',             sf:'Mishneh Torah, Circumcision',                                                      ch:3},
  {g:'ספר זמנים',  he:'שבת',              sf:'Mishneh Torah, Shabbat',                                                           ch:30},
  {g:'ספר זמנים',  he:'יום טוב',          sf:'Mishneh Torah, Yom Tov',                                                           ch:8},
  {g:'ספר זמנים',  he:'חמץ ומצה',         sf:'Mishneh Torah, Leavened and Unleavened Bread',                                     ch:8},
  {g:'ספר זמנים',  he:'שופר סוכה לולב',   sf:'Mishneh Torah, Shofar, Sukkah and Lulav',                                         ch:8},
  {g:'ספר זמנים',  he:'שקלים',            sf:'Mishneh Torah, Shekel Dues',                                                       ch:4},
  {g:'ספר זמנים',  he:'קידוש החודש',      sf:'Mishneh Torah, Sanctification of the New Month',                                   ch:19},
  {g:'ספר זמנים',  he:'תעניות',           sf:'Mishneh Torah, Fasts',                                                             ch:5},
  {g:'ספר זמנים',  he:'מגילה וחנוכה',     sf:'Mishneh Torah, Scroll, Purim and Chanukah',                                        ch:4},
  {g:'ספר נשים',   he:'אישות',            sf:'Mishneh Torah, Marriage',                                                          ch:25},
  {g:'ספר נשים',   he:'גירושין',          sf:'Mishneh Torah, Divorce',                                                           ch:13},
  {g:'ספר קדושה',  he:'איסורי ביאה',      sf:'Mishneh Torah, Forbidden Intercourse',                                             ch:22},
  {g:'ספר קדושה',  he:'מאכלות אסורות',   sf:'Mishneh Torah, Forbidden Foods',                                                   ch:17},
  {g:'ספר קדושה',  he:'שחיטה',            sf:'Mishneh Torah, Slaughter',                                                         ch:14},
  {g:'ספר נזיקין', he:'רוצח ושמירת הנפש', sf:'Mishneh Torah, Murderer and the Protection of Life',                              ch:13},
  {g:'ספר נזיקין', he:'גניבה',            sf:'Mishneh Torah, Theft',                                                             ch:9},
  {g:'ספר נזיקין', he:'גזילה ואבידה',     sf:'Mishneh Torah, Robbery and Lost Property',                                         ch:18},
  {g:'ספר קניין',  he:'מכירה',            sf:'Mishneh Torah, Sales',                                                             ch:30},
  {g:'ספר שופטים', he:'סנהדרין',          sf:'Mishneh Torah, Sanhedrin and the Penalties within their Jurisdiction',             ch:26},
  {g:'ספר שופטים', he:'עדות',             sf:'Mishneh Torah, Witnesses',                                                         ch:22},
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

// ── State ────────────────────────────────────────────────────────
const S = {
  collectionKey: 'tanach',
  book:          null,
  unit:          null,      // int (chapter) or string ('2a' / '2b' for Shas)
  verses:        [],
  messages:      [],
  totalScore:    0,
  sessionScore:  0,
  loading:       false,
  adminAuthed:   false,
  logoClickCount: 0,
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

function register() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!name || name.length < 2) {
    errEl.textContent = 'נא להזין שם מלא (לפחות 2 תווים)';
    errEl.classList.remove('hidden');
    document.getElementById('reg-name').focus();
    return;
  }
  if (!email || !isValidEmail(email)) {
    errEl.textContent = 'נא להזין כתובת מייל תקינה';
    errEl.classList.remove('hidden');
    document.getElementById('reg-email').focus();
    return;
  }

  localStorage.setItem('chavruta_user', JSON.stringify({ name, email }));
  document.getElementById('modal-register').classList.add('hidden');
  updateUserUI();
}

function regHandleKey(e) {
  if (e.key === 'Enter') register();
}

function logout() {
  if (!confirm('להתנתק? הניקוד שלך יישמר.')) return;
  localStorage.removeItem('chavruta_user');
  document.getElementById('modal-register').classList.remove('hidden');
  document.getElementById('user-greeting').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
}

function updateUserUI() {
  const user = getUser();
  if (user) {
    const greet = document.getElementById('user-greeting');
    greet.textContent = `שלום, ${user.name} 👋`;
    greet.classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
  }
}

// ── Admin panel ──────────────────────────────────────────────────
function logoClick() {
  S.logoClickCount++;
  if (S.logoClickCount >= 5) {
    S.logoClickCount = 0;
    openAdmin();
  }
}

function openAdmin() {
  document.getElementById('modal-admin').classList.remove('hidden');
  if (S.adminAuthed) {
    showAdminEditor();
  } else {
    document.getElementById('admin-pw-gate').classList.remove('hidden');
    document.getElementById('admin-editor').classList.add('hidden');
    document.getElementById('admin-pw-error').classList.add('hidden');
    setTimeout(() => document.getElementById('admin-pw-input').focus(), 100);
  }
}

function closeAdmin() {
  document.getElementById('modal-admin').classList.add('hidden');
}

function adminPwKey(e) {
  if (e.key === 'Enter') checkAdminPw();
}

function checkAdminPw() {
  const input = document.getElementById('admin-pw-input').value;
  const stored = localStorage.getItem('chavruta_admin_pw') || 'A089557176';
  if (input === stored) {
    S.adminAuthed = true;
    document.getElementById('admin-pw-input').value = '';
    showAdminEditor();
  } else {
    document.getElementById('admin-pw-error').classList.remove('hidden');
  }
}

function showAdminEditor() {
  document.getElementById('admin-pw-gate').classList.add('hidden');
  document.getElementById('admin-editor').classList.remove('hidden');
  document.getElementById('admin-save-msg').classList.add('hidden');

  // Pre-fill from localStorage
  const keys = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'];
  for (const k of keys) {
    const saved = localStorage.getItem(`chavruta_prompt_${k}`) || '';
    document.getElementById(`admin-prompt-${k}`).value = saved;
  }
}

function saveAdminPrompts() {
  const keys = ['tanach', 'mishnah', 'shas', 'rambam', 'shulchan'];
  for (const k of keys) {
    const val = document.getElementById(`admin-prompt-${k}`).value.trim();
    if (val) {
      localStorage.setItem(`chavruta_prompt_${k}`, val);
    } else {
      localStorage.removeItem(`chavruta_prompt_${k}`);
    }
  }
  const msg = document.getElementById('admin-save-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2500);
}

// ── Dropdown builders ────────────────────────────────────────────
function buildBookDropdown() {
  const col = COLLECTIONS[S.collectionKey];
  const sel = document.getElementById('sel-book');
  sel.innerHTML = '<option value="">— ספר —</option>';

  const groups = {};
  for (const item of col.items) {
    if (!groups[item.g]) groups[item.g] = [];
    groups[item.g].push(item);
  }
  for (const [grp, items] of Object.entries(groups)) {
    const og = document.createElement('optgroup');
    og.label = grp;
    for (const item of items) {
      const o = document.createElement('option');
      o.value = item.sf;
      o.textContent = item.he;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }

  // Reset unit and start button
  document.getElementById('sel-unit').innerHTML = '<option value="">— יחידה —</option>';
  document.getElementById('sel-unit').disabled = true;
  document.getElementById('header-start-btn').disabled = true;
  S.book = null;
  S.unit = null;
}

function buildUnitDropdown() {
  const col = COLLECTIONS[S.collectionKey];
  const sel = document.getElementById('sel-unit');
  sel.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `— ${col.unitLabel} —`;
  sel.appendChild(placeholder);

  if (!S.book) { sel.disabled = true; return; }

  sel.disabled = false;

  if (col.type === 'daf') {
    // Shas: daf from 2 to item.daf, each with amud א and ב
    for (let d = 2; d <= S.book.daf; d++) {
      const oA = document.createElement('option');
      oA.value = `${d}a`;
      oA.textContent = `דף ${toHebrew(d)}' עמוד א'`;
      sel.appendChild(oA);

      const oB = document.createElement('option');
      oB.value = `${d}b`;
      oB.textContent = `דף ${toHebrew(d)}' עמוד ב'`;
      sel.appendChild(oB);
    }
  } else {
    // Chapter-based
    for (let i = 1; i <= S.book.ch; i++) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${col.unitLabel} ${toHebrew(i)}'`;
      sel.appendChild(o);
    }
  }
}

// ── Dropdown event handlers ──────────────────────────────────────
function onCollectionChange() {
  S.collectionKey = document.getElementById('sel-collection').value;
  S.book = null;
  S.unit = null;
  buildBookDropdown();
}

function onBookChange() {
  const col = COLLECTIONS[S.collectionKey];
  const sf  = document.getElementById('sel-book').value;
  S.book    = col.items.find(b => b.sf === sf) || null;
  S.unit    = null;
  document.getElementById('header-start-btn').disabled = true;
  buildUnitDropdown();
}

function onUnitChange() {
  const val = document.getElementById('sel-unit').value;
  S.unit = val || null;
  document.getElementById('header-start-btn').disabled = !S.unit;
}

// ── Fetch content from Sefaria ───────────────────────────────────
async function fetchContent(collectionKey, item, unit) {
  const col = COLLECTIONS[collectionKey];
  const ref = col.fetchRef(item, unit);
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&commentary=0&context=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sefaria החזיר ${res.status}`);
  const data = await res.json();
  let he = data.he;
  if (Array.isArray(he) && Array.isArray(he[0])) he = he.flat();
  return he.map(v => typeof v === 'string' ? v.replace(/<[^>]+>/g, '').trim() : '').filter(Boolean);
}

// ── Start Learning ───────────────────────────────────────────────
async function startLearning() {
  if (!S.book || !S.unit) return;

  S.messages     = [];
  S.sessionScore = 0;

  const btn     = document.getElementById('header-start-btn');
  const spinner = document.getElementById('header-spinner');
  btn.disabled  = true;
  spinner.classList.remove('hidden');

  // Clear chat and hide welcome
  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';

  try {
    S.verses = await fetchContent(S.collectionKey, S.book, S.unit);
    if (!S.verses.length) throw new Error('לא נמצאו נתונים ביחידה זו');

    // Show input area
    document.getElementById('input-area').classList.remove('hidden');
    document.getElementById('modal-finished').classList.add('hidden');

    // Add session header inside chat
    const col = COLLECTIONS[S.collectionKey];
    const unitLabel = buildUnitLabel();
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'text-center text-sm text-gray-400 mb-4 pb-2 border-b border-parchmentDark';
    sessionHeader.innerHTML = `<span class="font-semibold" style="color:#B8860B;">${col.label}</span> | <span class="font-semibold text-navy">${S.book.he}</span> | ${unitLabel}`;
    chatEl.appendChild(sessionHeader);

    // First AI call
    S.messages.push({
      role: 'user',
      content: 'התחל ללמוד. הצג לי את הפסוק הראשון ושאל אותי שאלה עליו.',
    });
    await callAI();

  } catch (e) {
    console.error(e);
    chatEl.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center m-4';
    errDiv.textContent = `שגיאה: ${e.message}`;
    chatEl.appendChild(errDiv);
    // Restore welcome state
    const welcome = document.createElement('div');
    welcome.id = 'welcome';
    welcome.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:#9CA3AF;gap:12px;';
    welcome.innerHTML = `<div style="font-size:3rem">📖</div><p style="font-size:1.2rem;font-weight:600;">בחרו אוסף, ספר ויחידה ולחצו התחל</p>`;
    chatEl.appendChild(welcome);
    btn.disabled = !S.unit;
  } finally {
    spinner.classList.add('hidden');
  }
}

function buildUnitLabel() {
  const col = COLLECTIONS[S.collectionKey];
  if (col.type === 'daf') {
    const dafNum  = parseInt(S.unit, 10);
    const amud    = S.unit.endsWith('b') ? 'ב' : 'א';
    return `${col.unitLabel} ${toHebrew(dafNum)}' עמוד ${amud}'`;
  } else {
    return `${col.unitLabel} ${toHebrew(parseInt(S.unit, 10))}'`;
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
    const customPrompt = localStorage.getItem(`chavruta_prompt_${S.collectionKey}`) || '';

    const body = {
      messages:        S.messages,
      chapter_text:    S.verses.map((v, i) => `${i + 1}. ${v}`).join('\n'),
      book_name:       S.book.he,
      chapter_num:     unitLabel,
      total_verses:    S.verses.length,
      collection_type: S.collectionKey,
    };
    if (customPrompt) body.custom_prompt = customPrompt;

    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

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
    appendError(`שגיאה: ${e.message}`);
    setInput(true);
  } finally {
    S.loading = false;
  }
}

// ── Process AI JSON ──────────────────────────────────────────────
function processResponse(data) {
  if (data.score > 0) addScore(data.score);

  // Override verse from authoritative local source
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

// ── Send message ─────────────────────────────────────────────────
async function sendMessage() {
  const ta   = document.getElementById('user-input');
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
  const box  = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = 'bubble-ai rounded-2xl p-4 max-w-2xl mb-4';

  let html = '';

  if (data.feedback) {
    html += `<div class="text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100 leading-relaxed">
               💬 ${esc(data.feedback)}
             </div>`;
  }

  if (data.explanation) {
    html += `<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-sm text-blue-800 leading-relaxed">
               <strong>📖 הסבר:</strong> ${esc(data.explanation)}
             </div>`;
  }

  if (!data.is_finished && data.next_verse) {
    html += `<div class="verse-box p-4 mb-3">
               <div class="flex items-start gap-3">
                 <span class="flex-shrink-0 font-bold text-gold text-xl mt-0.5">${toHebrew(data.next_verse_num)}</span>
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
  box.appendChild(wrap);
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
  d.className = 'bubble-ai rounded-2xl p-4 inline-flex items-center gap-1.5 text-sm text-gray-400 mb-4';
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
  }, 1600);
}

// ── Finished ─────────────────────────────────────────────────────
function showFinished() {
  setInput(false);
  document.getElementById('input-area').classList.add('hidden');
  const unitLabel = buildUnitLabel();
  document.getElementById('fin-msg').textContent =
    `סיימת את ${S.book.he} ${unitLabel}!`;
  document.getElementById('fin-score').textContent =
    `צברת ${S.sessionScore} נקודות (סה"כ: ${S.totalScore})`;
  document.getElementById('modal-finished').classList.remove('hidden');
}

function resetSession() {
  document.getElementById('modal-finished').classList.add('hidden');
  document.getElementById('input-area').classList.add('hidden');
  S.messages     = [];
  S.sessionScore = 0;
  S.loading      = false;

  // Restore welcome state
  const chatEl = document.getElementById('chat');
  chatEl.innerHTML = '';
  const welcome = document.createElement('div');
  welcome.id = 'welcome';
  welcome.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:#9CA3AF;gap:12px;';
  welcome.innerHTML = `
    <div style="font-size:3rem">📖</div>
    <p style="font-size:1.2rem;font-weight:600;">בחרו אוסף, ספר ויחידה ולחצו התחל</p>
    <p style="font-size:0.85rem;color:#C4B5A0;">הטקסט מסופק ע"י <a href="https://www.sefaria.org" target="_blank" style="text-decoration:underline;color:#B8860B;">Sefaria</a> • הלימוד מנוהל ע"י Claude AI</p>
  `;
  chatEl.appendChild(welcome);

  // Re-enable start button if unit still selected
  document.getElementById('header-start-btn').disabled = !S.unit;
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

// ── Init ─────────────────────────────────────────────────────────
function init() {
  S.totalScore = parseInt(localStorage.getItem('chavruta_score') || '0', 10);
  refreshScores();

  // Build initial dropdowns for tanach
  buildBookDropdown();

  // Registration gate
  if (getUser()) {
    document.getElementById('modal-register').classList.add('hidden');
    updateUserUI();
  } else {
    document.getElementById('modal-register').classList.remove('hidden');
    setTimeout(() => document.getElementById('reg-name').focus(), 200);
  }
}

init();
