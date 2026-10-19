import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, validTz, validateTrack, newCfg, advance, applyDone, computeStreak, trimLog, BOOKS,
} from '../api/_daily-logic.js';

const at = (iso) => Date.parse(iso);

test('dayKey: 04:00 local rollover in Jerusalem (UTC+3 in October)', () => {
  assert.equal(dayKey(at('2026-10-18T00:59:00Z'), 'Asia/Jerusalem'), '2026-10-17'); // 03:59 local
  assert.equal(dayKey(at('2026-10-18T01:00:00Z'), 'Asia/Jerusalem'), '2026-10-18'); // 04:00 local
  assert.equal(dayKey(at('2026-10-18T20:59:00Z'), 'Asia/Jerusalem'), '2026-10-18'); // 23:59 local
});

test('dayKey: other time zones differ', () => {
  const t = at('2026-10-18T05:00:00Z');
  assert.equal(dayKey(t, 'Asia/Jerusalem'), '2026-10-18');      // 08:00
  assert.equal(dayKey(t, 'America/New_York'), '2026-10-17');    // 01:00 -> before rollover
  assert.equal(dayKey(t, 'Asia/Tokyo'), '2026-10-18');          // 14:00
});

test('invalid tz falls back to Asia/Jerusalem', () => {
  assert.equal(validTz('Not/AZone'), 'Asia/Jerusalem');
  assert.equal(dayKey(at('2026-10-18T01:00:00Z'), 'Not/AZone'), '2026-10-18');
});

test('validateTrack: whitelist, book and unit range', () => {
  assert.deepEqual(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 1 }).track,
    { collectionKey: 'tanach', bookKey: 'Genesis', unit: 1 });
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis' }).track.unit, 1);
  assert.equal(validateTrack({ collectionKey: 'shas', bookKey: 'Berakhot', unit: 1 }).error, 'bad collection');
  assert.equal(validateTrack({ collectionKey: '__proto__', bookKey: 'x' }).error, 'bad collection');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Nope' }).error, 'bad book');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'constructor' }).error, 'bad book');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 51 }).error, 'bad unit');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 0 }).error, 'bad unit');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 1.5 }).error, 'bad unit');
  assert.equal(validateTrack({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 'x' }).error, 'bad unit');
  assert.ok(Object.keys(BOOKS).every(c => Object.values(BOOKS[c]).every(n => n > 0)));
});

test('advance and applyDone are idempotent and end the track at the last unit', () => {
  const track = { collectionKey: 'tanach', bookKey: 'Genesis', unit: 1 };
  let cfg = newCfg(track, 'Asia/Jerusalem', 1000);
  assert.equal(cfg.pointer, 1);
  const r1 = applyDone(cfg, track, 1);
  assert.equal(r1.counted, true);
  assert.equal(r1.cfg.pointer, 2);
  const r2 = applyDone(r1.cfg, track, 1);            // duplicate request
  assert.equal(r2.counted, false);
  assert.equal(r2.cfg.pointer, 2);
  // other book / other unit do not count
  assert.equal(applyDone(r1.cfg, { ...track, bookKey: 'Exodus' }, 2).counted, false);
  assert.equal(applyDone(r1.cfg, track, 5).counted, false);
  // last unit
  const last = { ...cfg, pointer: 50 };
  const end = applyDone(last, track, 50);
  assert.equal(end.counted, true);
  assert.equal(end.cfg.finished, true);
  assert.equal(end.cfg.pointer, 50);
  assert.equal(applyDone(end.cfg, track, 50).counted, false);
  assert.equal(advance(end.cfg), end.cfg);
});

test('newCfg keeps createdAt when replacing a track', () => {
  const a = newCfg({ collectionKey: 'tanach', bookKey: 'Genesis', unit: 3 }, 'Asia/Jerusalem', 100);
  const b = newCfg({ collectionKey: 'mishnah', bookKey: 'Berakhot', unit: 1 }, 'Bad/Tz', 999, a);
  assert.equal(b.createdAt, 100);
  assert.equal(b.tz, 'Asia/Jerusalem');
  assert.equal(b.finished, false);
});

test('computeStreak', () => {
  const today = '2026-10-18';
  assert.deepEqual(computeStreak([], today), { streak: 0, totalDays: 0, doneToday: false });
  assert.equal(computeStreak(['2026-10-18'], today).streak, 1);
  assert.equal(computeStreak(['2026-10-18'], today).doneToday, true);
  // consecutive
  assert.equal(computeStreak(['2026-10-18', '2026-10-17', '2026-10-16'], today).streak, 3);
  // today not done yet, yesterday done: streak kept
  const y = computeStreak(['2026-10-17', '2026-10-16'], today);
  assert.equal(y.streak, 2); assert.equal(y.doneToday, false);
  // one grace day: last done 2 days ago still alive; one empty day between days tolerated
  assert.equal(computeStreak(['2026-10-16'], today).streak, 1);
  assert.equal(computeStreak(['2026-10-18', '2026-10-16', '2026-10-15'], today).streak, 3);
  // two empty days break it
  assert.equal(computeStreak(['2026-10-15'], today).streak, 0);
  assert.equal(computeStreak(['2026-10-18', '2026-10-14', '2026-10-13'], today).streak, 1);
  assert.equal(computeStreak(['2026-10-18', '2026-10-14', '2026-10-13'], today).totalDays, 3);
  // garbage keys ignored, duplicates collapsed
  assert.equal(computeStreak(['x', '2026-10-18', '2026-10-18'], today).totalDays, 1);
  // month boundary
  assert.equal(computeStreak(['2026-11-01', '2026-10-31'], '2026-11-01').streak, 2);
});

test('trimLog drops the oldest entries beyond the cap', () => {
  const keys = Array.from({ length: 405 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
  const drop = trimLog([...keys].reverse(), 400);
  assert.equal(drop.length, 5);
  assert.deepEqual(drop, keys.slice(0, 5));
  assert.deepEqual(trimLog(keys.slice(0, 400), 400), []);
});
