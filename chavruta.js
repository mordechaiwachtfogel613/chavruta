// ================================================================
// חברותא – chavruta.js
// לוגיקת frontend לדף "ללמוד עם חבר" (chavruta.html)
// מבודד לחלוטין מ-app.js — לא משתף state, ניקוד, היסטוריה.
// ================================================================

'use strict';

// ── Global config (thinking messages) ───────────────────────────
let CHAVRUTA_THINKING_MSGS = null;
(async () => {
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    CHAVRUTA_THINKING_MSGS = Array.isArray(d.chavrutaThinkingMsgs) && d.chavrutaThinkingMsgs.length
      ? d.chavrutaThinkingMsgs : null;
  } catch {}
})();

const DEFAULT_CHAVRUTA_THINKING_MSGS = [
  'רבי בניהו בוחן את שתי התשובות...',
  'רבי בניהו מדייק בניסוחים...',
  'רבי בניהו מחלק בין המשיבים...',
  'רבי בניהו שוקל את הטיעונים...',
  'רבי בניהו מסתכל בשני הכיוונים...',
  'רבי בניהו מתעמק בסוגיא...',
  'רבי בניהו מחפש את הראיה המכרעת...',
];

// ── Collections data ─────────────────────────────────────────────
const TANACH = [
  {g:'תורה',   he:'בראשית',       sf:'Genesis',       ch:50},
  {g:'תורה',   he:'שמות',         sf:'Exodus',        ch:40},
  {g:'תורה',   he:'ויקרא',        sf:'Leviticus',     ch:27},
  {g:'תורה',   he:'במדבר',        sf:'Numbers',       ch:36},
  {g:'תורה',   he:'דברים',        sf:'Deuteronomy',   ch:34},
  {g:'נביאים', he:'יהושע',        sf:'Joshua',        ch:24},
  {g:'נביאים', he:'שופטים',       sf:'Judges',        ch:21},
  {g:'נביאים', he:'שמואל א',      sf:'I Samuel',      ch:31},
  {g:'נביאים', he:'שמואל ב',      sf:'II Samuel',     ch:24},
  {g:'נביאים', he:'מלכים א',      sf:'I Kings',       ch:22},
  {g:'נביאים', he:'מלכים ב',      sf:'II Kings',      ch:25},
  {g:'נביאים', he:'ישעיהו',       sf:'Isaiah',        ch:66},
  {g:'נביאים', he:'ירמיהו',       sf:'Jeremiah',      ch:52},
  {g:'נביאים', he:'יחזקאל',       sf:'Ezekiel',       ch:48},
  {g:'נביאים', he:'הושע',         sf:'Hosea',         ch:14},
  {g:'נביאים', he:'יואל',         sf:'Joel',          ch:4},
  {g:'נביאים', he:'עמוס',         sf:'Amos',          ch:9},
  {g:'נביאים', he:'עובדיה',       sf:'Obadiah',       ch:1},
  {g:'נביאים', he:'יונה',         sf:'Jonah',         ch:4},
  {g:'נביאים', he:'מיכה',         sf:'Micah',         ch:7},
  {g:'נביאים', he:'נחום',         sf:'Nahum',         ch:3},
  {g:'נביאים', he:'חבקוק',        sf:'Habakkuk',      ch:3},
  {g:'נביאים', he:'צפניה',        sf:'Zephaniah',     ch:3},
  {g:'נביאים', he:'חגי',          sf:'Haggai',        ch:2},
  {g:'נביאים', he:'זכריה',        sf:'Zechariah',     ch:14},
  {g:'נביאים', he:'מלאכי',        sf:'Malachi',       ch:3},
  {g:'כתובים', he:'תהילים',       sf:'Psalms',        ch:150},
  {g:'כתובים', he:'משלי',         sf:'Proverbs',      ch:31},
  {g:'כתובים', he:'איוב',         sf:'Job',           ch:42},
  {g:'כתובים', he:'שיר השירים',   sf:'Song of Songs', ch:8},
  {g:'כתובים', he:'רות',          sf:'Ruth',          ch:4},
  {g:'כתובים', he:'איכה',         sf:'Lamentations',  ch:5},
  {g:'כתובים', he:'קהלת',         sf:'Ecclesiastes',  ch:12},
  {g:'כתובים', he:'אסתר',         sf:'Esther',        ch:10},
  {g:'כתובים', he:'דניאל',        sf:'Daniel',        ch:12},
  {g:'כתובים', he:'עזרא',         sf:'Ezra',          ch:10},
  {g:'כתובים', he:'נחמיה',        sf:'Nehemiah',      ch:13},
  {g:'כתובים', he:'דברי הימים א', sf:'I Chronicles',  ch:29},
  {g:'כתובים', he:'דברי הימים ב', sf:'II Chronicles', ch:36},
];

const MISHNAH = [
  {g:'זרעים',  he:'ברכות',     sf:'Berakhot',     ch:9},
  {g:'זרעים',  he:'פאה',       sf:'Peah',         ch:8},
  {g:'זרעים',  he:'דמאי',      sf:'Demai',        ch:7},
  {g:'זרעים',  he:'כלאים',     sf:'Kilayim',      ch:9},
  {g:'זרעים',  he:'שביעית',    sf:'Sheviit',      ch:10},
  {g:'זרעים',  he:'תרומות',    sf:'Terumot',      ch:11},
  {g:'זרעים',  he:'מעשרות',    sf:'Maasrot',      ch:5},
  {g:'זרעים',  he:'מעשר שני',  sf:'Maaser_Sheni', ch:5},
  {g:'זרעים',  he:'חלה',       sf:'Challah',      ch:4},
  {g:'זרעים',  he:'ערלה',      sf:'Orlah',        ch:3},
  {g:'זרעים',  he:'ביכורים',   sf:'Bikkurim',     ch:4},
  {g:'מועד',   he:'שבת',       sf:'Shabbat',      ch:24},
  {g:'מועד',   he:'עירובין',   sf:'Eruvin',       ch:10},
  {g:'מועד',   he:'פסחים',     sf:'Pesachim',     ch:10},
  {g:'מועד',   he:'שקלים',     sf:'Shekalim',     ch:8},
  {g:'מועד',   he:'יומא',      sf:'Yoma',         ch:8},
  {g:'מועד',   he:'סוכה',      sf:'Sukkah',       ch:5},
  {g:'מועד',   he:'ביצה',      sf:'Beitzah',      ch:5},
  {g:'מועד',   he:'ראש השנה',  sf:'Rosh_Hashanah',ch:4},
  {g:'מועד',   he:'תענית',     sf:'Taanit',       ch:4},
  {g:'מועד',   he:'מגילה',     sf:'Megillah',     ch:4},
  {g:'מועד',   he:'מועד קטן',  sf:'Moed_Katan',   ch:3},
  {g:'מועד',   he:'חגיגה',     sf:'Chagigah',     ch:3},
  {g:'נשים',   he:'יבמות',     sf:'Yevamot',      ch:16},
  {g:'נשים',   he:'כתובות',    sf:'Ketubot',      ch:13},
  {g:'נשים',   he:'נדרים',     sf:'Nedarim',      ch:11},
  {g:'נשים',   he:'נזיר',      sf:'Nazir',        ch:9},
  {g:'נשים',   he:'סוטה',      sf:'Sotah',        ch:9},
  {g:'נשים',   he:'גיטין',     sf:'Gittin',       ch:9},
  {g:'נשים',   he:'קידושין',   sf:'Kiddushin',    ch:4},
  {g:'נזיקין', he:'בבא קמא',   sf:'Bava_Kamma',   ch:10},
  {g:'נזיקין', he:'בבא מציעא', sf:'Bava_Metzia',  ch:10},
  {g:'נזיקין', he:'בבא בתרא',  sf:'Bava_Batra',   ch:10},
  {g:'נזיקין', he:'סנהדרין',   sf:'Sanhedrin',    ch:11},
  {g:'נזיקין', he:'מכות',      sf:'Makkot',       ch:3},
  {g:'נזיקין', he:'שבועות',    sf:'Shevuot',      ch:8},
  {g:'נזיקין', he:'עדיות',     sf:'Eduyot',       ch:8},
  {g:'נזיקין', he:'עבודה זרה', sf:'Avodah_Zarah', ch:5},
  {g:'נזיקין', he:'אבות',      sf:'Avot',         ch:5},
  {g:'נזיקין', he:'הוריות',    sf:'Horayot',      ch:3},
  {g:'קדשים',  he:'זבחים',     sf:'Zevachim',     ch:14},
  {g:'קדשים',  he:'מנחות',     sf:'Menachot',     ch:13},
  {g:'קדשים',  he:'חולין',     sf:'Chullin',      ch:12},
  {g:'קדשים',  he:'בכורות',    sf:'Bekhorot',     ch:9},
  {g:'קדשים',  he:'ערכין',     sf:'Arakhin',      ch:9},
  {g:'קדשים',  he:'תמורה',     sf:'Temurah',      ch:7},
  {g:'קדשים',  he:'כריתות',    sf:'Keritot',      ch:6},
  {g:'קדשים',  he:'מעילה',     sf:'Meilah',       ch:6},
  {g:'קדשים',  he:'תמיד',      sf:'Tamid',        ch:7},
  {g:'קדשים',  he:'מידות',     sf:'Middot',       ch:5},
  {g:'קדשים',  he:'קינים',     sf:'Kinnim',       ch:3},
  {g:'טהרות',  he:'כלים',      sf:'Kelim',        ch:30},
  {g:'טהרות',  he:'אהלות',     sf:'Oholot',       ch:18},
  {g:'טהרות',  he:'נגעים',     sf:'Negaim',       ch:14},
  {g:'טהרות',  he:'פרה',       sf:'Parah',        ch:12},
  {g:'טהרות',  he:'טהרות',     sf:'Tahorot',      ch:10},
  {g:'טהרות',  he:'מקוואות',   sf:'Mikvaot',      ch:10},
  {g:'טהרות',  he:'נדה',       sf:'Niddah',       ch:10},
  {g:'טהרות',  he:'מכשירין',   sf:'Makhshirin',   ch:6},
  {g:'טהרות',  he:'זבים',      sf:'Zavim',        ch:5},
  {g:'טהרות',  he:'טבול יום',  sf:'Tevul_Yom',    ch:4},
  {g:'טהרות',  he:'ידים',      sf:'Yadayim',      ch:4},
  {g:'טהרות',  he:'עוקצין',    sf:'Oktzin',       ch:3},
];

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

const RAMBAM = [
  {g:'ספר המדע',    he:'יסודי התורה',      sf:'Mishneh Torah, Foundations of the Torah',                                    ch:10},
  {g:'ספר המדע',    he:'דעות',             sf:'Mishneh Torah, Human Dispositions',                                          ch:7},
  {g:'ספר המדע',    he:'תלמוד תורה',       sf:'Mishneh Torah, Torah Study',                                                 ch:4},
  {g:'ספר המדע',    he:'עבודה זרה',        sf:'Mishneh Torah, Foreign Worship and Customs of the Nations',                  ch:12},
  {g:'ספר המדע',    he:'תשובה',            sf:'Mishneh Torah, Repentance',                                                  ch:10},
  {g:'ספר אהבה',   he:'קריאת שמע',        sf:'Mishneh Torah, Reading the Shema',                                           ch:4},
  {g:'ספר אהבה',   he:'תפילה',            sf:'Mishneh Torah, Prayer and the Priestly Blessing',                            ch:15},
  {g:'ספר אהבה',   he:'ציצית',            sf:'Mishneh Torah, Fringes',                                                     ch:3},
  {g:'ספר אהבה',   he:'תפילין',           sf:'Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll',                      ch:10},
  {g:'ספר אהבה',   he:'ברכות',            sf:'Mishneh Torah, Blessings',                                                   ch:11},
  {g:'ספר זמנים',  he:'שבת',              sf:'Mishneh Torah, Sabbath',                                                     ch:30},
  {g:'ספר זמנים',  he:'יום טוב',          sf:'Mishneh Torah, Yom Tov',                                                     ch:8},
  {g:'ספר זמנים',  he:'חמץ ומצה',         sf:'Mishneh Torah, Leavened and Unleavened Bread',                               ch:8},
  {g:'ספר זמנים',  he:'שופר סוכה לולב',   sf:'Mishneh Torah, Shofar, Sukkah and Lulav',                                   ch:8},
  {g:'ספר זמנים',  he:'קידוש החודש',      sf:'Mishneh Torah, Sanctification of the New Month',                             ch:19},
  {g:'ספר זמנים',  he:'תעניות',           sf:'Mishneh Torah, Fasts',                                                       ch:5},
  {g:'ספר נשים',   he:'אישות',            sf:'Mishneh Torah, Marriage',                                                    ch:25},
  {g:'ספר נשים',   he:'גירושין',          sf:'Mishneh Torah, Divorce',                                                     ch:13},
  {g:'ספר קדושה',  he:'איסורי ביאה',      sf:'Mishneh Torah, Forbidden Intercourse',                                       ch:22},
  {g:'ספר קדושה',  he:'מאכלות אסורות',   sf:'Mishneh Torah, Forbidden Foods',                                             ch:17},
  {g:'ספר קדושה',  he:'שחיטה',            sf:'Mishneh Torah, Ritual Slaughter',                                            ch:14},
  {g:'ספר נזיקין', he:'גניבה',            sf:'Mishneh Torah, Theft',                                                       ch:9},
  {g:'ספר נזיקין', he:'גזילה ואבידה',     sf:'Mishneh Torah, Robbery and Lost Property',                                   ch:18},
  {g:'ספר שופטים', he:'סנהדרין',          sf:'Mishneh Torah, The Sanhedrin and the Penalties within Their Jurisdiction',   ch:26},
  {g:'ספר שופטים', he:'מלכים ומלחמות',    sf:'Mishneh Torah, Kings and Wars',                                              ch:12},
];

const SHULCHAN = [
  {g:'שולחן ערוך', he:'אורח חיים',  sf:'Shulchan Arukh, Orach Chayyim',   ch:697},
  {g:'שולחן ערוך', he:'יורה דעה',   sf:'Shulchan Arukh, Yoreh Deah',      ch:403},
  {g:'שולחן ערוך', he:'אבן העזר',   sf:'Shulchan Arukh, Even HaEzer',     ch:178},
  {g:'שולחן ערוך', he:'חושן משפט',  sf:'Shulchan Arukh, Choshen Mishpat', ch:427},
];

const COLLECTIONS = {
  tanach:   { label:'תנ"ך',       items:TANACH,   type:'chapter', unitLabel:'פרק',  fetchRef:(item,unit) => `${item.sf}.${unit}` },
  mishnah:  { label:'משנה',       items:MISHNAH,  type:'chapter', unitLabel:'פרק',  fetchRef:(item,unit) => `Mishnah_${item.sf}.${unit}` },
  shas:     { label:'ש"ס בבלי',   items:SHAS,     type:'daf',     unitLabel:'דף',   fetchRef:(item,unit) => `${item.sf}.${unit}` },
  rambam:   { label:'רמב"ם',      items:RAMBAM,   type:'chapter', unitLabel:'פרק',  fetchRef:(item,unit) => `${item.sf}.${unit}` },
  shulchan: { label:'שולחן ערוך', items:SHULCHAN, type:'chapter', unitLabel:'סימן', fetchRef:(item,unit) => `${item.sf}.${unit}` },
};

// ── Commentators per collection ──────────────────────────────────
const COMMENTATORS = {
  tanach: [
    { id: 'rashi',    he: 'רש"י',      ref: (sf, ch, v) => `Rashi on ${sf}.${ch}.${v}` },
    { id: 'ibnezra',  he: 'אבן עזרא',  ref: (sf, ch, v) => `Ibn Ezra on ${sf}.${ch}.${v}` },
    { id: 'ramban',   he: 'רמב"ן',     ref: (sf, ch, v) => `Ramban on ${sf}.${ch}.${v}` },
    { id: 'sforno',   he: 'ספורנו',    ref: (sf, ch, v) => `Sforno on ${sf}.${ch}.${v}` },
    { id: 'kliyakar',      he: 'כלי יקר',      ref: (sf, ch, v) => `Kli Yakar on ${sf}.${ch}.${v}` },
    { id: 'metzudat_david', he: 'מצודת דוד',   ref: (sf, ch, v) => `Metzudat David on ${sf}.${ch}.${v}` },
    { id: 'metzudat_zion',  he: 'מצודת ציון',  ref: (sf, ch, v) => `Metzudat Zion on ${sf}.${ch}.${v}` },
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

// ── State ────────────────────────────────────────────────────────
const F = {
  me:            null,    // { email, name, role:'host'|'guest' }
  roomId:        null,
  room:          null,    // last fetched room object
  lastVersion:   0,
  lastSeenMsg:   0,       // index of last rendered message
  pollTimer:     null,
  pollInterval:  1500,
  errorStreak:   0,
  lastActivity:  Date.now(),
  disconnectTimer: null,
  // Video / WebRTC
  videoOn:        false,
  localStream:    null,
  pc:             null,
  remoteStream:   null,
  iceQueue:       [],      // buffered ICE candidates before setRemoteDescription
  peerReady:      false,   // did the other side signal 'video-ready'?
  negotiating:    false,   // prevent double-offer
  signalSince:    0,
  signalTimer:    null,
  // Auto-advance
  autoNextTimer:  null,
  // Thinking animation
  thinkingAnimEl:  null,
  thinkingAnimTimer: null,
  // Verdict bubble
  verdictBubbleEl: null,
  // Typing indicator
  typingThrottle:  false,
  typingClearTimer: null,
  // Phase tracking
  lastPhase:       null,
};

// ── Text panel state ─────────────────────────────────────────────
const TP = {
  open:                  false,
  verses:                [],
  loading:               false,
  selectedCommentators:  new Set(),
  commentaryCache:       {},
  hoveredVerseIdx:       null,
  hoverDebounce:         null,
};

// ── XSS-safe escape ──────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#x27;'
  }[c]));
}

// ── Hebrew numeral converter ─────────────────────────────────────
function toHebrew(n) {
  if (!n || n <= 0) return String(n);
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

// ── Show/hide screens ────────────────────────────────────────────
function showScreen(id) {
  ['auth-gate','create-screen','lobby-screen','room-screen','end-screen']
    .forEach(s => document.getElementById(s)?.classList[s === id ? 'remove' : 'add']('hidden'));
}

// ── Status pill ──────────────────────────────────────────────────
function setStatusPill(text, type = '') {
  const wrap = document.getElementById('status-pill-wrap');
  if (!wrap) return;
  if (!text) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div class="status-pill${type ? ' pill-' + type : ''}">${esc(text)}</div>`;
}

// ── Score badges ─────────────────────────────────────────────────
function updateBadges(room) {
  if (!room) return;
  const myRole = F.me?.role;
  document.getElementById('badge-host-name').textContent  = room.host?.name  || 'מארח';
  document.getElementById('badge-guest-name').textContent = room.guest?.name || 'אורח';
  document.getElementById('badge-host-score').textContent  = room.host?.score  ?? 0;
  document.getElementById('badge-guest-score').textContent = room.guest?.score ?? 0;

  document.getElementById('badge-host')?.classList.toggle('is-me',  myRole === 'host');
  document.getElementById('badge-guest')?.classList.toggle('is-me', myRole === 'guest');
}

// ── Collections picker ───────────────────────────────────────────
function F_onCollectionChange() {
  const colKey = document.getElementById('col-select')?.value || 'tanach';
  const col    = COLLECTIONS[colKey];
  const unitLabelEl = document.getElementById('unit-label');
  if (unitLabelEl) unitLabelEl.textContent = col.unitLabel;

  const bookSel = document.getElementById('book-select');
  bookSel.innerHTML = '';
  col.items.forEach((item, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = item.he;
    bookSel.appendChild(opt);
  });
  F_onBookChange();
}

function F_onBookChange() {
  const colKey  = document.getElementById('col-select')?.value || 'tanach';
  const col     = COLLECTIONS[colKey];
  const bookIdx = parseInt(document.getElementById('book-select')?.value ?? 0, 10);
  const book    = col.items[bookIdx];
  const unitSel = document.getElementById('unit-select');
  unitSel.innerHTML = '';

  if (col.type === 'daf') {
    for (let d = 2; d <= (book.daf || 10); d++) {
      for (const side of ['a', 'b']) {
        const opt = document.createElement('option');
        opt.value = `${d}${side}`;
        opt.textContent = `דף ${d} עמוד ${side === 'a' ? 'א' : 'ב'}`;
        unitSel.appendChild(opt);
      }
    }
  } else {
    for (let c = 1; c <= (book.ch || 1); c++) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `${col.unitLabel} ${c}`;
      unitSel.appendChild(opt);
    }
  }
}

// ── Fetch verses from Sefaria ────────────────────────────────────
async function fetchVerses(colKey, bookIdx, unit) {
  const col  = COLLECTIONS[colKey];
  const book = col.items[bookIdx];
  const ref  = col.fetchRef(book, unit);

  const url = `/api/sefaria?ref=${encodeURIComponent(ref)}&lang=he&commentary=0&context=0`;
  const r   = await fetch(url);
  if (!r.ok) throw new Error(`Sefaria error ${r.status}`);

  const data = await r.json();
  let rawVerses = data.he || data.text || [];
  if (typeof rawVerses === 'string') rawVerses = [rawVerses];
  if (!Array.isArray(rawVerses)) rawVerses = [];

  const decodeHtml = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  const strip = s => decodeHtml(String(s || '').replace(/<[^>]+>/g, '')).trim();
  return rawVerses.map(v => strip(v)).filter(Boolean);
}

// ── Create room ──────────────────────────────────────────────────
async function F_createRoom() {
  const btn    = document.getElementById('create-btn');
  const errEl  = document.getElementById('create-error');
  const colKey = document.getElementById('col-select')?.value || 'tanach';
  const col    = COLLECTIONS[colKey];
  const bookIdx = parseInt(document.getElementById('book-select')?.value ?? 0, 10);
  const book   = col.items[bookIdx];
  const unitVal = document.getElementById('unit-select')?.value;
  const unit   = col.type === 'daf' ? unitVal : parseInt(unitVal, 10);

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'טוען טקסט...';

  let verses;
  try {
    verses = await fetchVerses(colKey, bookIdx, unit);
  } catch (e) {
    errEl.textContent = 'שגיאה בטעינת הטקסט מספריא. נסה יחידה אחרת.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'צור חדר ושתף קישור';
    return;
  }

  if (!verses.length) {
    errEl.textContent = 'לא נמצא טקסט ביחידה זו. נסה יחידה אחרת.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'צור חדר ושתף קישור';
    return;
  }

  btn.textContent = 'יוצר חדר...';

  const chapterText = verses.map((v, i) => `${i + 1}. ${v}`).join('\n');

  try {
    const resp = await fetch('/api/room?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:      F.me.email,
        name:       F.me.name,
        collection: colKey,
        book:       { he: book.he, sf: book.sf },
        chapterNum: unit,
        totalVerses: verses.length,
        verses:     [chapterText],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      errEl.textContent = data.error === 'user_not_approved'
        ? 'חשבונך עדיין לא מאושר.'
        : 'שגיאה ביצירת החדר. נסה שוב.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'צור חדר ושתף קישור';
      return;
    }

    F.roomId = data.roomId;
    F.me.role = 'host';

    const shareInput = document.getElementById('share-link-input');
    if (shareInput) shareInput.value = data.shareUrl;
    showScreen('lobby-screen');

    startPolling();

  } catch (e) {
    errEl.textContent = 'שגיאת רשת. נסה שוב.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'צור חדר ושתף קישור';
  }
}

// ── Join room ────────────────────────────────────────────────────
async function joinRoom(roomId) {
  try {
    const resp = await fetch('/api/room?action=join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, email: F.me.email, name: F.me.name }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      let msg = 'שגיאה בהצטרפות לחדר.';
      if (data.error === 'user_not_approved')  msg = 'חשבונך עדיין לא מאושר.';
      if (data.error === 'room_not_found')     msg = 'החדר לא נמצא — ייתכן שפג תוקפו.';
      if (data.error === 'room_not_open')      msg = 'החדר כבר מלא או השיעור כבר התחיל.';
      if (data.error === 'already_host')       msg = 'אתה המארח של החדר הזה — פתח בטאב אחר?';
      showAuthGate(msg);
      return;
    }

    F.roomId = roomId;
    F.me.role = 'guest';

    applyRoom(data.room);
    startPolling();

  } catch (e) {
    showAuthGate('שגיאת רשת. נסה לרענן את הדף.');
  }
}

// ── Copy share link ──────────────────────────────────────────────
function F_copyShareLink() {
  const input = document.getElementById('share-link-input');
  const text  = input?.value || '';
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => {
    const fb = document.getElementById('copy-feedback');
    if (fb) { fb.textContent = '✓ הקישור הועתק!'; setTimeout(() => { fb.textContent = ''; }, 2500); }
  }).catch(() => {
    input?.select();
    document.execCommand('copy');
  });
}

// ── Polling ──────────────────────────────────────────────────────
function startPolling() {
  stopPolling();
  F.pollTimer = setInterval(pollRoom, F.pollInterval);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

function stopPolling() {
  if (F.pollTimer) { clearInterval(F.pollTimer); F.pollTimer = null; }
}

function onVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    startPolling();
    pollRoom();
  }
}

async function pollRoom() {
  if (!F.roomId) return;
  try {
    const url = `/api/room?id=${F.roomId}&since=${F.lastVersion}`;
    const resp = await fetch(url);

    if (resp.status === 404) {
      stopPolling();
      showAuthGate('החדר פג תוקף. צור חדר חדש.');
      return;
    }

    if (!resp.ok) throw new Error(`poll ${resp.status}`);

    const data = await resp.json();
    F.errorStreak = 0;
    document.getElementById('reconnect-banner')?.classList.remove('active');
    F.pollInterval = 1500;

    if (!data.unchanged) {
      applyRoom(data.room);
    }

  } catch (e) {
    F.errorStreak++;
    if (F.errorStreak >= 3) {
      document.getElementById('reconnect-banner')?.classList.add('active');
      F.pollInterval = Math.min(6000, 1500 * Math.pow(2, Math.floor(F.errorStreak / 3)));
      stopPolling();
      F.pollTimer = setInterval(pollRoom, F.pollInterval);
    }
  }
}

// ── Apply room state ─────────────────────────────────────────────
function applyRoom(room) {
  if (!room) return;
  F.room = room;
  F.lastVersion = room.version;
  F.lastActivity = Date.now();

  document.getElementById('disconnected-banner')?.classList.remove('active');
  resetDisconnectTimer();

  updateBadges(room);
  updateHeaderUserName();

  renderNewMessages(room);
  switchPhaseUI(room);
}

function resetDisconnectTimer() {
  if (F.disconnectTimer) clearTimeout(F.disconnectTimer);
  F.disconnectTimer = setTimeout(() => {
    if (F.room?.phase !== 'finished') {
      document.getElementById('disconnected-banner')?.classList.add('active');
    }
  }, 60000);
}

// ── Render new messages ──────────────────────────────────────────
function renderNewMessages(room) {
  const msgs = room.messages || [];
  for (let i = F.lastSeenMsg; i < msgs.length; i++) {
    const msg = msgs[i];
    if (msg.type === 'question') renderQuestion(msg);
    else if (msg.type === 'answer') renderAnswer(msg, room);
    else if (msg.type === 'verdict') renderVerdict(msg, room);
  }
  F.lastSeenMsg = msgs.length;
}

// ── Render: question bubble ──────────────────────────────────────
function renderQuestion(msg) {
  const chat = document.getElementById('friend-chat');
  if (!chat) return;
  const el = document.createElement('div');
  el.className = 'msg-question';
  el.innerHTML = `
    <div class="verse-text">${esc(msg.verse || '')}</div>
    <div class="question-text">❓ ${esc(msg.question || '')}</div>
  `;
  chat.appendChild(el);
  scrollChat();
}

// ── Render: answer bubble ────────────────────────────────────────
function renderAnswer(msg, room) {
  const chat = document.getElementById('friend-chat');
  if (!chat) return;
  const isMe = msg.role === F.me?.role;
  const name = msg.role === 'host' ? (room.host?.name || 'מארח') : (room.guest?.name || 'אורח');
  const el = document.createElement('div');
  el.className = `msg-answer ${isMe ? 'answer-me' : 'answer-other'}`;
  el.innerHTML = `<div class="answer-sender">${esc(name)}</div>${esc(msg.text || '')}`;
  chat.appendChild(el);
  scrollChat();
}

// ── Render: verdict → shows as chat bubble ───────────────────────
function renderVerdict(msg, room) {
  if (F.verdictBubbleEl) { F.verdictBubbleEl.remove(); F.verdictBubbleEl = null; }
  const chat = document.getElementById('friend-chat');
  if (!chat) return;

  const hostName  = room.host?.name  || 'מארח';
  const guestName = room.guest?.name || 'אורח';

  const winnerText = msg.winner === 'host'  ? `🏆 ${esc(hostName)} ענה טוב יותר!`
                   : msg.winner === 'guest' ? `🏆 ${esc(guestName)} ענה טוב יותר!`
                   : '🤝 תיקו!';

  const scoreStars = s => s >= 5 ? '⭐⭐⭐' : s >= 2 ? '⭐⭐' : '⭐';

  const el = document.createElement('div');
  el.className = 'chavruta-verdict-bubble';
  el.innerHTML = `
    <img src="rabbi.png" alt="רבי בניהו">
    <div class="chavruta-verdict-content">
      <div class="chavruta-verdict-winner">${winnerText}</div>
      <div class="chavruta-verdict-players">
        <strong>${esc(hostName)}</strong> <span class="vb-round-score">+${msg.scoreHost ?? 0}</span> ${scoreStars(msg.scoreHost ?? 0)}${msg.fbHost ? ` — ${esc(msg.fbHost)}` : ''}<br>
        <strong>${esc(guestName)}</strong> <span class="vb-round-score">+${msg.scoreGuest ?? 0}</span> ${scoreStars(msg.scoreGuest ?? 0)}${msg.fbGuest ? ` — ${esc(msg.fbGuest)}` : ''}
      </div>
    </div>
  `;
  chat.appendChild(el);
  F.verdictBubbleEl = el;
  scrollChat();
}

// ── Thinking animation (during evaluating phase) ─────────────────
function showChavrutaThinking() {
  if (F.thinkingAnimEl) return; // already showing

  const chat = document.getElementById('friend-chat');
  if (!chat) return;

  const msgs = [...(CHAVRUTA_THINKING_MSGS || DEFAULT_CHAVRUTA_THINKING_MSGS)]
    .sort(() => Math.random() - 0.5);
  let idx = 0;

  const el = document.createElement('div');
  el.className = 'chavruta-thinking-bubble';
  el.innerHTML = `
    <img src="rabbi.png" alt="רבי בניהו">
    <div class="chavruta-thinking-content">
      <div class="chavruta-thinking-text" id="chavruta-thinking-msg">${esc(msgs[0])}</div>
      <div class="chavruta-thinking-bar-wrap">
        <div class="chavruta-thinking-bar" id="chavruta-thinking-bar"></div>
      </div>
    </div>
  `;
  chat.appendChild(el);
  F.thinkingAnimEl = el;
  scrollChat();

  let pct = 0;
  F.thinkingAnimTimer = setInterval(() => {
    if (!F.thinkingAnimEl) { clearInterval(F.thinkingAnimTimer); F.thinkingAnimTimer = null; return; }
    pct = Math.min(pct + (Math.random() * 8 + 3), 90);
    const bar = document.getElementById('chavruta-thinking-bar');
    if (bar) bar.style.width = pct + '%';
    idx = (idx + 1) % msgs.length;
    const msgEl = document.getElementById('chavruta-thinking-msg');
    if (msgEl) {
      msgEl.style.opacity = '0';
      setTimeout(() => {
        if (msgEl) { msgEl.textContent = msgs[idx]; msgEl.style.opacity = '1'; }
      }, 200);
    }
  }, 1800);
}

function hideChavrutaThinking() {
  if (F.thinkingAnimTimer) { clearInterval(F.thinkingAnimTimer); F.thinkingAnimTimer = null; }
  if (F.thinkingAnimEl) { F.thinkingAnimEl.remove(); F.thinkingAnimEl = null; }
}

// ── Phase-driven UI changes ──────────────────────────────────────
function switchPhaseUI(room) {
  const phase = room.phase;
  const prevPhase = F.lastPhase;
  F.lastPhase = phase;

  if (phase === 'waiting_for_guest') {
    showScreen('lobby-screen');
    return;
  }

  if (phase === 'finished') {
    stopPolling();
    stopSignalPoll();
    hideChavrutaThinking();
    clearAutoNextTimer();
    renderEndScreen(room);
    showScreen('end-screen');
    return;
  }

  // All active phases → room-screen
  showScreen('room-screen');

  // Start signal polling for active phases (enables typing indicators)
  if (!F.signalTimer) startSignalPoll();

  const textarea  = document.getElementById('answer-textarea');
  const sendBtn   = document.getElementById('send-btn');
  const startBtn  = document.getElementById('start-btn');
  const isHost   = F.me?.role === 'host';
  const myRole   = F.me?.role;
  const haveSent = !!room.pendingAnswers?.[myRole];

  // Clear verdict bubble when a new question starts
  if (phase === 'asking') {
    if (F.verdictBubbleEl) { F.verdictBubbleEl.remove(); F.verdictBubbleEl = null; }
  }

  // Thinking animation: show during evaluating, hide otherwise
  if (phase === 'evaluating') {
    showChavrutaThinking();
  } else {
    hideChavrutaThinking();
  }

  // Auto-advance after showing_feedback
  if (phase === 'showing_feedback') {
    if (!F.autoNextTimer) {
      F.autoNextTimer = setTimeout(() => {
        F.autoNextTimer = null;
        F_clickNext();
      }, 4500);
    }
  } else {
    clearAutoNextTimer();
  }

  // start button (host only, ready phase)
  startBtn?.classList.toggle('hidden', !(phase === 'ready' && isHost));

  // answer input: enable only when asking and haven't sent yet
  const canAnswer = phase === 'asking' && !haveSent;
  if (textarea) textarea.disabled = !canAnswer;
  if (sendBtn)  sendBtn.disabled  = !canAnswer;

  // status pills
  if (phase === 'asking' && haveSent) {
    const otherName = myRole === 'host' ? (room.guest?.name || 'האורח') : (room.host?.name || 'המארח');
    setStatusPill(`תשובתך נשלחה — מחכה ש${otherName} יענה...`, 'waiting');
  } else if (phase === 'evaluating') {
    setStatusPill('', '');
  } else if (phase === 'showing_feedback') {
    setStatusPill('', '');
  } else if (phase === 'asking') {
    setStatusPill('', '');
    if (textarea && prevPhase !== 'asking') textarea.value = '';
  } else if (phase === 'ready') {
    if (isHost) setStatusPill('לחץ "התחל שיעור" כשהחבר מוכן', 'waiting');
    else setStatusPill('ממתין שהמארח יתחיל את השיעור...', 'waiting');
    if (textarea) textarea.disabled = true;
    if (sendBtn)  sendBtn.disabled  = true;
  }
}

function clearAutoNextTimer() {
  if (F.autoNextTimer) { clearTimeout(F.autoNextTimer); F.autoNextTimer = null; }
}

// ── End screen ───────────────────────────────────────────────────
function renderEndScreen(room) {
  document.getElementById('end-host-name').textContent  = room.host?.name  || 'מארח';
  document.getElementById('end-guest-name').textContent = room.guest?.name || 'אורח';
  document.getElementById('end-host-score').textContent  = room.host?.score  ?? 0;
  document.getElementById('end-guest-score').textContent = room.guest?.score ?? 0;

  const hostScore  = room.host?.score  || 0;
  const guestScore = room.guest?.score || 0;
  const ribbon = document.getElementById('winner-ribbon');
  if (ribbon) {
    if (hostScore > guestScore)      ribbon.textContent = `🏆 ${room.host?.name || 'המארח'} ניצח! יישר כוח`;
    else if (guestScore > hostScore) ribbon.textContent = `🏆 ${room.guest?.name || 'האורח'} ניצח! יישר כוח`;
    else                             ribbon.textContent = '🤝 תיקו! שניכם אלופים!';
  }
}

function F_newRound() {
  F.roomId      = null;
  F.room        = null;
  F.lastVersion = 0;
  F.lastSeenMsg = 0;
  F.lastActivity = Date.now();
  clearAutoNextTimer();
  hideChavrutaThinking();
  document.getElementById('friend-chat').innerHTML = '';
  if (F.verdictBubbleEl) { F.verdictBubbleEl.remove(); F.verdictBubbleEl = null; }
  stopPolling();
  stopSignalPoll();
  videoCleanup();
  // Reset text panel
  TP.open = false;
  TP.verses = [];
  TP.commentaryCache = {};
  TP.selectedCommentators = new Set();
  document.getElementById('text-panel-float')?.classList.remove('active');
  document.getElementById('tp-open-btn').textContent = '📖 פתח טקסט';
  showScreen('create-screen');
  F_onCollectionChange();
}

// ── Submit answer ────────────────────────────────────────────────
async function F_submitAnswer() {
  const textarea = document.getElementById('answer-textarea');
  const answer   = (textarea?.value || '').trim();
  if (!answer || !F.roomId) return;

  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;
  if (textarea) textarea.disabled = true;

  try {
    await fetch('/api/room?action=answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: F.roomId, email: F.me.email, answer }),
    });
  } catch {}
}

// ── Next question ────────────────────────────────────────────────
async function F_clickNext() {
  if (!F.roomId) return;
  try {
    await fetch('/api/room?action=next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: F.roomId, email: F.me?.email }),
    });
  } catch {}
}

// ── Start session (host only) ────────────────────────────────────
async function F_clickStart() {
  if (!F.roomId || F.me?.role !== 'host') return;
  const startBtn = document.getElementById('start-btn');
  if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'מתחיל...'; }

  try {
    const resp = await fetch('/api/room?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: F.roomId, email: F.me.email }),
    });
    if (!resp.ok) {
      if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'התחל שיעור ▶'; }
      setStatusPill('שגיאה בהתחלת השיעור. נסה שוב.', 'error');
    }
  } catch {
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'התחל שיעור ▶'; }
  }
}

// ── End session ──────────────────────────────────────────────────
async function F_endSession() {
  if (!F.roomId) return;
  if (!confirm('לסיים את השיעור?')) return;
  try {
    await fetch('/api/room?action=end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: F.roomId, email: F.me?.email }),
    });
  } catch {}
}

// ── Scroll chat to bottom ────────────────────────────────────────
function scrollChat() {
  const chat = document.getElementById('friend-chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
}

// ── Update header user name ──────────────────────────────────────
function updateHeaderUserName() {
  const el = document.getElementById('hdr-user-name');
  if (el && F.me?.name) el.textContent = F.me.name;
}

// ── Auth gate ────────────────────────────────────────────────────
function showAuthGate(msg) {
  stopPolling();
  const msgEl = document.getElementById('auth-msg');
  if (msgEl && msg) msgEl.textContent = msg;
  showScreen('auth-gate');
}

// ── Video / WebRTC ───────────────────────────────────────────────
// Layout: inline bar above chat, two <video> tiles side-by-side.
// Signaling: piggyback on existing /api/signal KV relay.
// Protocol:
//   1. Each side clicks "הפעל וידאו" → gets camera, sends {type:'video-ready'}
//   2. When BOTH sides are ready, host sends offer
//   3. Guest replies with answer
//   4. ICE candidates are buffered until remote desc is set, then flushed

const RTC_CONFIG = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]};

function videoSetStatus(txt) {
  const el = document.getElementById('video-status');
  if (el) el.textContent = txt;
}

function videoSignal(payload) {
  if (!F.roomId || !F.me?.role) return;
  fetch('/api/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: F.roomId, from: F.me.role, payload }),
  }).catch(() => {});
}

async function F_toggleVideo() {
  if (F.videoOn) {
    videoClose();
    return;
  }

  const btn = document.getElementById('video-toggle-btn');
  const closeBtn = document.getElementById('video-bar-close');
  if (btn) btn.disabled = true;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    alert('לא ניתן לגשת למצלמה/מיקרופון — ודא שנתת הרשאה.');
    if (btn) btn.disabled = false;
    return;
  }

  F.videoOn = true;
  F.localStream = stream;
  F.iceQueue = [];
  F.negotiating = false;

  // Show local video immediately
  const lv = document.getElementById('local-video');
  if (lv) lv.srcObject = stream;

  // Show bar
  document.getElementById('video-bar')?.classList.add('active');
  if (closeBtn) closeBtn.style.display = '';
  if (btn) { btn.textContent = '📹 כבה וידאו'; btn.disabled = false; }
  videoSetStatus('ממתין לחבר...');

  // Tell the other side we're ready
  videoSignal({ type: 'video-ready' });

  // If the other side already signaled ready before us → host creates offer now
  if (F.peerReady && F.me?.role === 'host') {
    await videoCreateOffer();
  }
}

function videoClose() {
  videoSignal({ type: 'video-bye' });
  videoCleanup();
}

function videoCleanup() {
  F.videoOn    = false;
  F.peerReady  = false;
  F.iceQueue   = [];
  F.negotiating = false;

  if (F.localStream) { F.localStream.getTracks().forEach(t => t.stop()); F.localStream = null; }
  if (F.pc) { F.pc.close(); F.pc = null; }
  F.remoteStream = null;

  const lv = document.getElementById('local-video');
  const rv = document.getElementById('remote-video');
  if (lv) lv.srcObject = null;
  if (rv) rv.srcObject = null;

  document.getElementById('video-bar')?.classList.remove('active');
  const closeBtn = document.getElementById('video-bar-close');
  if (closeBtn) closeBtn.style.display = 'none';
  const btn = document.getElementById('video-toggle-btn');
  if (btn) btn.textContent = '🎥 הפעל וידאו';
  videoSetStatus('');
}

function videoMakePeer() {
  if (F.pc) { F.pc.close(); F.pc = null; }
  const pc = new RTCPeerConnection(RTC_CONFIG);
  F.pc = pc;

  // Attach local tracks
  if (F.localStream) F.localStream.getTracks().forEach(t => pc.addTrack(t, F.localStream));

  // Remote stream
  F.remoteStream = new MediaStream();
  const rv = document.getElementById('remote-video');
  if (rv) rv.srcObject = F.remoteStream;
  pc.ontrack = e => {
    e.streams[0]?.getTracks().forEach(t => F.remoteStream.addTrack(t));
    videoSetStatus('מחובר ✓');
  };

  // Send ICE candidates
  pc.onicecandidate = e => {
    if (e.candidate) videoSignal({ type: 'ice', candidate: e.candidate });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') videoSetStatus('חיבור נכשל');
    if (pc.connectionState === 'disconnected') videoSetStatus('מתנתק...');
  };

  return pc;
}

async function videoFlushIce(pc) {
  for (const c of F.iceQueue) {
    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
  }
  F.iceQueue = [];
}

async function videoCreateOffer() {
  if (F.negotiating) return;
  F.negotiating = true;
  videoSetStatus('מתחבר...');
  const pc = videoMakePeer();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  videoSignal({ type: 'offer', sdp: pc.localDescription });
}

// ── Signal polling (typing + WebRTC) ────────────────────────────
function startSignalPoll() {
  stopSignalPoll();
  F.signalTimer = setInterval(pollSignals, 1000);
}

function stopSignalPoll() {
  if (F.signalTimer) { clearInterval(F.signalTimer); F.signalTimer = null; }
}

async function pollSignals() {
  if (!F.roomId || !F.me?.role) return;
  try {
    const url = `/api/signal?roomId=${F.roomId}&for=${F.me.role}&since=${F.signalSince}`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    F.signalSince = data.nextSince || F.signalSince;
    for (const msg of (data.messages || [])) {
      await handleSignalMsg(msg);
    }
  } catch {}
}

async function handleSignalMsg(msg) {
  // Typing indicator
  if (msg.type === 'typing') {
    const otherName = msg.name || (F.me?.role === 'host' ? F.room?.guest?.name : F.room?.host?.name) || 'השני';
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.textContent = `${otherName} מקליד...`;
      indicator.classList.add('visible');
      if (F.typingClearTimer) clearTimeout(F.typingClearTimer);
      F.typingClearTimer = setTimeout(() => indicator.classList.remove('visible'), 3000);
    }
    return;
  }

  // Other side enabled video
  if (msg.type === 'video-ready') {
    F.peerReady = true;
    if (F.videoOn && F.me?.role === 'host' && !F.negotiating) {
      await videoCreateOffer();
    }
    return;
  }

  // Other side disabled video
  if (msg.type === 'video-bye') {
    if (F.videoOn) videoCleanup();
    else F.peerReady = false;
    return;
  }

  // Guest receives offer from host
  if (msg.type === 'offer' && F.me?.role === 'guest' && F.videoOn) {
    videoSetStatus('מתחבר...');
    const pc = videoMakePeer();
    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    await videoFlushIce(pc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    videoSignal({ type: 'answer', sdp: pc.localDescription });
    return;
  }

  // Host receives answer from guest
  if (msg.type === 'answer' && F.me?.role === 'host' && F.pc) {
    if (F.pc.signalingState === 'have-local-offer') {
      await F.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      await videoFlushIce(F.pc);
    }
    return;
  }

  // ICE candidate
  if (msg.type === 'ice' && msg.candidate) {
    if (F.pc?.remoteDescription) {
      try { await F.pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
    } else {
      F.iceQueue.push(msg.candidate);
    }
    return;
  }
}

// ── Send typing signal ───────────────────────────────────────────
function sendTypingSignal() {
  if (!F.roomId || !F.me?.role) return;
  fetch('/api/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: F.roomId,
      from: F.me.role,
      payload: { type: 'typing', name: F.me.name },
    }),
  }).catch(() => {});
}

// ── Generic drag helper ──────────────────────────────────────────
function makeDraggable(container, handle) {
  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = rect.left, startTop = rect.top;

    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      container.style.left   = `${startLeft + dx}px`;
      container.style.top    = `${startTop  + dy}px`;
      container.style.right  = 'auto';
      container.style.bottom = 'auto';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

// ── Text panel ───────────────────────────────────────────────────
function F_toggleTextPanel() {
  if (TP.open) {
    F_closeTextPanel();
  } else {
    F_openTextPanel();
  }
}

function F_openTextPanel() {
  const panel = document.getElementById('text-panel-float');
  if (!panel) return;
  TP.open = true;
  panel.classList.add('active');
  document.getElementById('tp-open-btn').textContent = '✕ סגור טקסט';

  if (!TP.verses.length && F.room) {
    tp_loadVerses();
  } else if (TP.verses.length) {
    tp_render();
  }
}

function F_closeTextPanel() {
  const panel = document.getElementById('text-panel-float');
  if (!panel) return;
  TP.open = false;
  panel.classList.remove('active');
  document.getElementById('tp-open-btn').textContent = '📖 פתח טקסט';
}

async function tp_loadVerses() {
  const room = F.room;
  if (!room?.collection || !room?.book?.sf) return;

  const scrollEl = document.getElementById('tp-verses-scroll');
  if (scrollEl) scrollEl.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:0.85rem;">טוען טקסט...</div>';

  TP.loading = true;
  try {
    const col = COLLECTIONS[room.collection];
    if (!col) return;
    const bookIdx = col.items.findIndex(item => item.sf === room.book.sf);
    if (bookIdx < 0) return;

    const verses = await fetchVerses(room.collection, bookIdx, room.unit);
    TP.verses = verses;
    TP.commentaryCache = {};
    tp_render();
  } catch {
    const scrollEl = document.getElementById('tp-verses-scroll');
    if (scrollEl) scrollEl.innerHTML = '<div style="padding:20px;color:#e53e3e;font-size:0.85rem;">שגיאה בטעינת הטקסט.</div>';
  } finally {
    TP.loading = false;
  }
}

function tp_render() {
  const room = F.room;
  if (!room) return;

  const col = COLLECTIONS[room.collection];
  const unitLabel = col?.unitLabel || 'פרק';
  const titleEl = document.getElementById('tp-title');
  if (titleEl) titleEl.textContent = `📖 ${room.book?.he || ''} | ${unitLabel} ${room.unit}`;

  tp_buildCommentatorsBar();

  const scrollEl = document.getElementById('tp-verses-scroll');
  if (!scrollEl) return;
  scrollEl.innerHTML = '';

  if (!TP.verses.length) {
    scrollEl.innerHTML = '<div style="padding:16px;color:#888;font-size:0.85rem;text-align:center;">אין טקסט זמין.</div>';
    return;
  }

  TP.verses.forEach((verse, idx) => {
    const div = document.createElement('div');
    div.className = 'tp-verse-item';
    div.dataset.verseIdx = idx;

    const numSpan = document.createElement('span');
    numSpan.className = 'tp-verse-num';
    numSpan.textContent = room.collection === 'shas' ? (idx + 1) : toHebrew(idx + 1);

    const textSpan = document.createElement('span');
    textSpan.className = 'tp-verse-text';
    textSpan.textContent = verse;

    div.appendChild(numSpan);
    div.appendChild(textSpan);
    div.addEventListener('mouseenter', () => tp_onVerseHover(idx));
    scrollEl.appendChild(div);
  });

  TP.hoveredVerseIdx = null;
  document.getElementById('tp-commentary-area').style.display = 'none';
}

function tp_buildCommentatorsBar() {
  const room = F.room;
  if (!room) return;

  const bar = document.getElementById('tp-commentators-bar');
  bar.innerHTML = '<span style="font-size:0.72rem;color:#6B7280;flex-shrink:0;">מפרשים:</span>';

  const comms = COMMENTATORS[room.collection] || [];
  if (TP.selectedCommentators.size === 0 && comms.length > 0) {
    TP.selectedCommentators.add(comms[0].id);
  }

  comms.forEach(comm => {
    const chip = document.createElement('button');
    const selected = TP.selectedCommentators.has(comm.id);
    chip.className = 'commentator-chip' + (selected ? ' chip-selected' : '');
    chip.textContent = comm.he;
    chip.onclick = () => {
      if (TP.selectedCommentators.has(comm.id)) {
        if (TP.selectedCommentators.size > 1) TP.selectedCommentators.delete(comm.id);
      } else {
        TP.selectedCommentators.add(comm.id);
      }
      chip.classList.toggle('chip-selected', TP.selectedCommentators.has(comm.id));
      if (TP.hoveredVerseIdx !== null) tp_showCommentaryForVerse(TP.hoveredVerseIdx);
    };
    bar.appendChild(chip);
  });
}

function tp_onVerseHover(idx) {
  if (TP.hoverDebounce) clearTimeout(TP.hoverDebounce);

  document.querySelectorAll('.tp-verse-item').forEach(el => el.classList.remove('tp-active'));
  const el = document.querySelector(`.tp-verse-item[data-verse-idx="${idx}"]`);
  if (el) el.classList.add('tp-active');

  TP.hoveredVerseIdx = idx;
  TP.hoverDebounce = setTimeout(() => tp_showCommentaryForVerse(idx), 250);
}

async function tp_showCommentaryForVerse(verseIdx) {
  const room = F.room;
  if (!room) return;

  const comms = (COMMENTATORS[room.collection] || []).filter(c => TP.selectedCommentators.has(c.id));
  if (!comms.length) return;

  const area    = document.getElementById('tp-commentary-area');
  const content = document.getElementById('tp-commentary-content');
  const label   = document.getElementById('tp-commentary-label');

  area.style.display = 'block';
  const labelNum = room.collection === 'shas' ? (verseIdx + 1) : toHebrew(verseIdx + 1);
  label.textContent = `${room.book?.he || ''} | קטע ${labelNum}`;
  content.innerHTML = '<div style="color:#9CA3AF;font-size:0.82rem;padding:2px 0;">טוען פירושים...</div>';

  const results = await Promise.all(comms.map(c => tp_fetchCommentary(c, verseIdx)));
  content.innerHTML = '';
  let hasContent = false;

  results.forEach((text, i) => {
    if (!text) return;
    hasContent = true;
    const block = document.createElement('div');
    block.className = 'tp-comm-block';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'tp-comm-name';
    nameDiv.textContent = comms[i].he + ':';
    const textDiv = document.createElement('div');
    textDiv.className = 'tp-comm-text';
    textDiv.textContent = text;
    block.appendChild(nameDiv);
    block.appendChild(textDiv);
    content.appendChild(block);
  });

  if (!hasContent) {
    content.innerHTML = '<div style="color:#9CA3AF;font-size:0.82rem;padding:2px 0;">אין פירוש זמין לקטע זה.</div>';
  }
}

async function tp_fetchCommentary(comm, verseIdx) {
  const room = F.room;
  if (!room) return null;

  const cacheKey = `${comm.id}:${verseIdx}`;
  if (cacheKey in TP.commentaryCache) return TP.commentaryCache[cacheKey];

  const sf  = room.book.sf;
  const ch  = room.unit;
  const v   = verseIdx + 1;
  const ref = comm.ref(sf, ch, v);

  try {
    const res = await fetch(`/api/sefaria?ref=${encodeURIComponent(ref)}`);
    if (!res.ok) { TP.commentaryCache[cacheKey] = null; return null; }
    const data = await res.json();

    let raw = data.he || '';
    if (Array.isArray(raw)) {
      raw = raw.flat ? raw.flat(4) : raw;
      raw = Array.isArray(raw) ? raw.filter(x => typeof x === 'string').join(' ') : String(raw);
    }
    const text = String(raw).replace(/<[^>]+>/g, '').trim();
    TP.commentaryCache[cacheKey] = text || null;
    return text || null;
  } catch {
    TP.commentaryCache[cacheKey] = null;
    return null;
  }
}

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  F_onCollectionChange();

  let userData = null;
  try {
    userData = JSON.parse(localStorage.getItem('chavruta_user') || 'null');
  } catch {}

  if (!userData?.email || !userData?.name) {
    const returnUrl = encodeURIComponent(location.href);
    location.href = `/index.html?redirect=${returnUrl}`;
    return;
  }

  F.me = { email: userData.email.trim().toLowerCase(), name: userData.name, role: null };
  updateHeaderUserName();

  try {
    const r = await fetch(`/api/users?email=${encodeURIComponent(F.me.email)}`);
    const d = await r.json();
    if (d.status !== 'approved') {
      document.getElementById('auth-title').textContent = 'ממתין לאישור';
      document.getElementById('auth-msg').textContent   =
        'חשבונך ממתין לאישור המנהל. לאחר האישור תוכל ללמוד עם חבר.';
      showScreen('auth-gate');
      return;
    }
  } catch {}

  const urlParams = new URLSearchParams(location.search);
  const roomParam = urlParams.get('room');

  if (roomParam) {
    F.roomId = roomParam;
    try {
      const r2 = await fetch(`/api/room?id=${roomParam}&since=0`);
      if (r2.status === 404) {
        showAuthGate('החדר לא נמצא — ייתכן שפג תוקפו.');
        return;
      }
      const d2 = await r2.json();
      const room = d2.room;
      if (room && room.host?.email === F.me.email) {
        F.me.role = 'host';
        applyRoom(room);
        startPolling();
        return;
      }
      if (room && room.guest?.email === F.me.email) {
        F.me.role = 'guest';
        applyRoom(room);
        startPolling();
        return;
      }
    } catch {}

    await joinRoom(roomParam);
    return;
  }

  showScreen('create-screen');
}

// ── Textarea: Enter to submit, typing signal ─────────────────────
document.getElementById('answer-textarea')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    F_submitAnswer();
  }
});

document.getElementById('answer-textarea')?.addEventListener('input', () => {
  if (!F.typingThrottle && F.roomId && F.me?.role) {
    F.typingThrottle = true;
    sendTypingSignal();
    setTimeout(() => { F.typingThrottle = false; }, 2000);
  }
});

// ── Boot ─────────────────────────────────────────────────────────
init();
