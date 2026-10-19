// ================================================================
// חברותא – "הלימוד היומי שלי": pure logic (no I/O, easy to test).
// The file name starts with "_" so Vercel does not expose it as an endpoint.
// All time-dependent functions take `nowMs` / `tz` as parameters.
// ================================================================

export const ROLLOVER_HOUR = 4;       // a "day" runs 04:00 → 04:00 local time
export const MAX_LOG_DAYS  = 400;
export const GRACE_GAP     = 2;       // streak survives one empty day (gap of <= 2 days between done days)
export const DEFAULT_TZ    = 'Asia/Jerusalem';

export function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return String(tz); }
  catch { return DEFAULT_TZ; }
}

// "YYYY-MM-DD" of the learning day that `nowMs` falls in, in time zone `tz`.
export function dayKey(nowMs, tz = DEFAULT_TZ) {
  tz = validTz(tz);
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(nowMs)).reduce((a, x) => (a[x.type] = x.value, a), {});
  const localAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(localAsUtc - ROLLOVER_HOUR * 3600000).toISOString().slice(0, 10);
}

export function dayIndex(key) { return Math.round(Date.parse(key + 'T00:00:00Z') / 86400000); }
export const isDayKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k)) && !Number.isNaN(Date.parse(k + 'T00:00:00Z'));

// Collection → { Sefaria id: number of units } (mirrors COLLECTIONS in app.js; Shas is not supported).
export const BOOKS = {
  tanach: {
    "Genesis": 50,
    "Exodus": 40,
    "Leviticus": 27,
    "Numbers": 36,
    "Deuteronomy": 34,
    "Joshua": 24,
    "Judges": 21,
    "I Samuel": 31,
    "II Samuel": 24,
    "I Kings": 22,
    "II Kings": 25,
    "Isaiah": 66,
    "Jeremiah": 52,
    "Ezekiel": 48,
    "Hosea": 14,
    "Joel": 4,
    "Amos": 9,
    "Obadiah": 1,
    "Jonah": 4,
    "Micah": 7,
    "Nahum": 3,
    "Habakkuk": 3,
    "Zephaniah": 3,
    "Haggai": 2,
    "Zechariah": 14,
    "Malachi": 3,
    "Psalms": 150,
    "Proverbs": 31,
    "Job": 42,
    "Song of Songs": 8,
    "Ruth": 4,
    "Lamentations": 5,
    "Ecclesiastes": 12,
    "Esther": 10,
    "Daniel": 12,
    "Ezra": 10,
    "Nehemiah": 13,
    "I Chronicles": 29,
    "II Chronicles": 36,
  },
  mishnah: {
    "Berakhot": 9,
    "Peah": 8,
    "Demai": 7,
    "Kilayim": 9,
    "Sheviit": 10,
    "Terumot": 11,
    "Maasrot": 5,
    "Maaser_Sheni": 5,
    "Challah": 4,
    "Orlah": 3,
    "Bikkurim": 4,
    "Shabbat": 24,
    "Eruvin": 10,
    "Pesachim": 10,
    "Shekalim": 8,
    "Yoma": 8,
    "Sukkah": 5,
    "Beitzah": 5,
    "Rosh_Hashanah": 4,
    "Taanit": 4,
    "Megillah": 4,
    "Moed_Katan": 3,
    "Chagigah": 3,
    "Yevamot": 16,
    "Ketubot": 13,
    "Nedarim": 11,
    "Nazir": 9,
    "Sotah": 9,
    "Gittin": 9,
    "Kiddushin": 4,
    "Bava_Kamma": 10,
    "Bava_Metzia": 10,
    "Bava_Batra": 10,
    "Sanhedrin": 11,
    "Makkot": 3,
    "Shevuot": 8,
    "Eduyot": 8,
    "Avodah_Zarah": 5,
    "Avot": 5,
    "Horayot": 3,
    "Zevachim": 14,
    "Menachot": 13,
    "Chullin": 12,
    "Bekhorot": 9,
    "Arakhin": 9,
    "Temurah": 7,
    "Keritot": 6,
    "Meilah": 6,
    "Tamid": 7,
    "Middot": 5,
    "Kinnim": 3,
    "Kelim": 30,
    "Oholot": 18,
    "Negaim": 14,
    "Parah": 12,
    "Tahorot": 10,
    "Mikvaot": 10,
    "Niddah": 10,
    "Makhshirin": 6,
    "Zavim": 5,
    "Tevul_Yom": 4,
    "Yadayim": 4,
    "Oktzin": 3,
  },
  rambam: {
    "Mishneh Torah, Foundations of the Torah": 10,
    "Mishneh Torah, Human Dispositions": 7,
    "Mishneh Torah, Torah Study": 4,
    "Mishneh Torah, Foreign Worship and Customs of the Nations": 12,
    "Mishneh Torah, Repentance": 10,
    "Mishneh Torah, Reading the Shema": 4,
    "Mishneh Torah, Prayer and the Priestly Blessing": 15,
    "Mishneh Torah, Fringes": 3,
    "Mishneh Torah, Tefillin, Mezuzah and the Torah Scroll": 10,
    "Mishneh Torah, Blessings": 11,
    "Mishneh Torah, Circumcision": 3,
    "Mishneh Torah, Sabbath": 30,
    "Mishneh Torah, Yom Tov": 8,
    "Mishneh Torah, Leavened and Unleavened Bread": 8,
    "Mishneh Torah, Shofar, Sukkah and Lulav": 8,
    "Mishneh Torah, Sheqel Dues": 4,
    "Mishneh Torah, Sanctification of the New Month": 19,
    "Mishneh Torah, Fasts": 5,
    "Mishneh Torah, Scroll of Esther and Hanukkah": 4,
    "Mishneh Torah, Marriage": 25,
    "Mishneh Torah, Divorce": 13,
    "Mishneh Torah, Forbidden Intercourse": 22,
    "Mishneh Torah, Forbidden Foods": 17,
    "Mishneh Torah, Ritual Slaughter": 14,
    "Mishneh Torah, Murderer and the Preservation of Life": 13,
    "Mishneh Torah, Theft": 9,
    "Mishneh Torah, Robbery and Lost Property": 18,
    "Mishneh Torah, Sales": 30,
    "Mishneh Torah, The Sanhedrin and the Penalties within Their Jurisdiction": 26,
    "Mishneh Torah, Testimony": 22,
    "Mishneh Torah, Kings and Wars": 12,
  },
  shulchan: {
    "Shulchan Arukh, Orach Chayyim": 697,
    "Shulchan Arukh, Yoreh Deah": 403,
    "Shulchan Arukh, Even HaEzer": 178,
    "Shulchan Arukh, Choshen Mishpat": 427,
  },
};

export function validateTrack(t) {
  const collectionKey = String(t?.collectionKey ?? '');
  const bookKey = String(t?.bookKey ?? '');
  const books = Object.prototype.hasOwnProperty.call(BOOKS, collectionKey) ? BOOKS[collectionKey] : null;
  if (!books) return { error: 'bad collection' };
  if (!Object.prototype.hasOwnProperty.call(books, bookKey)) return { error: 'bad book' };
  const unit = Number(t?.unit ?? 1);
  if (!Number.isInteger(unit) || unit < 1 || unit > books[bookKey]) return { error: 'bad unit' };
  return { track: { collectionKey, bookKey, unit } };
}

export function newCfg(track, tz, nowMs, prev = null) {
  return {
    collectionKey: track.collectionKey, bookKey: track.bookKey, pointer: track.unit,
    mode: 'sequential', tz: validTz(tz), finished: false,
    createdAt: prev?.createdAt || nowMs,
  };
}

// Moves the pointer one unit forward; past the last unit the track is finished.
export function advance(cfg) {
  if (!cfg || cfg.finished) return cfg;
  const total = BOOKS[cfg.collectionKey]?.[cfg.bookKey] || 0;
  const next = cfg.pointer + 1;
  return next > total ? { ...cfg, finished: true } : { ...cfg, pointer: next };
}

// Idempotent: only the unit the pointer is on counts, so a repeated "done" never advances twice.
export function applyDone(cfg, track, unit) {
  if (!cfg || cfg.finished) return { counted: false, cfg };
  if (track.collectionKey !== cfg.collectionKey || track.bookKey !== cfg.bookKey || Number(unit) !== cfg.pointer) {
    return { counted: false, cfg };
  }
  return { counted: true, cfg: advance(cfg) };
}

// Streak from the set of done day-keys. Counts done days; one empty day between two
// done days (or since the last one) does not break it.
export function computeStreak(dayKeys, today) {
  const idx = [...new Set(dayKeys.filter(isDayKey))].map(dayIndex).sort((a, b) => b - a);
  const t = dayIndex(today);
  const out = { streak: 0, totalDays: idx.length, doneToday: idx[0] === t };
  if (!idx.length || t - idx[0] > GRACE_GAP) return out;
  out.streak = 1;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i - 1] - idx[i] > GRACE_GAP) break;
    out.streak++;
  }
  return out;
}

// Which day-keys to delete so that at most `max` remain (oldest go first).
export function trimLog(dayKeys, max = MAX_LOG_DAYS) {
  const sorted = [...dayKeys].sort();
  return sorted.length > max ? sorted.slice(0, sorted.length - max) : [];
}
