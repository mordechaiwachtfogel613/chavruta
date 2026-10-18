// ================================================================
// Anki scheduler (v3, SM-2 derived) — port of ankitects/anki
//   rslib/src/scheduler/states/{steps,learning,relearning,review,fuzz}.rs
// Defaults are Anki's default deck options.
// Pure functions, no I/O. The leading underscore keeps Vercel from
// exposing this file as an endpoint.
// ================================================================

const DAY = 86400;

// Anki default deck options (docs.ankiweb.net/deck-options)
export const CONFIG = {
  steps:                [1, 10],   // learning steps, minutes
  relearnSteps:         [10],      // lapse steps, minutes
  graduatingIntervalGood: 1,       // days
  graduatingIntervalEasy: 4,       // days
  initialEase:          2.5,
  hardMultiplier:       1.2,
  easyMultiplier:       1.3,       // "easy bonus"
  intervalMultiplier:   1.0,
  maximumInterval:      36500,
  lapseMultiplier:      0.0,       // "new interval"
  minimumLapseInterval: 1,
  leechThreshold:       8,
  newPerDay:            20,
  learnAheadSecs:       20 * 60,   // Anki "learn ahead limit"
};

const MIN_EASE = 1.3;
const EASE_AGAIN = -0.2;
const EASE_HARD  = -0.15;
const EASE_EASY  = 0.15;

export const RATING = { again: 1, hard: 2, good: 3, easy: 4 };

// ── Learning steps (steps.rs) ───────────────────────────────────
const toSecs = (min) => Math.trunc(min * 60);

function maybeRoundInDays(secs) {
  return secs > DAY ? Math.round(secs / DAY) * DAY : secs;
}

function stepIndex(steps, remaining) {
  const total = steps.length;
  return Math.min(Math.max(total - (remaining % 1000), 0), Math.max(total - 1, 0));
}

const stepSecsAt = (steps, i) => (i >= 0 && i < steps.length ? toSecs(steps[i]) : null);

function againDelaySecs(steps) { return stepSecsAt(steps, 0); }

function hardDelaySecs(steps, remaining) {
  const idx = stepIndex(steps, remaining);
  let current = stepSecsAt(steps, idx);
  if (current === null && steps.length) current = toSecs(steps[0]);
  if (current === null) return null;
  if (idx !== 0) return current;
  const next = stepSecsAt(steps, 1);
  if (next !== null) return maybeRoundInDays(Math.trunc((current + next) / 2));
  // single step: 50% more, but at most one day more
  return maybeRoundInDays(Math.min(Math.trunc(current * 3 / 2), current + DAY));
}

function goodDelaySecs(steps, remaining) {
  return stepSecsAt(steps, stepIndex(steps, remaining) + 1);
}

const remainingForGood = (steps, remaining) =>
  Math.max(steps.length - (stepIndex(steps, remaining) + 1), 0);

// ── Fuzz (fuzz.rs) ──────────────────────────────────────────────
const FUZZ_RANGES = [
  { start: 2.5, end: 7.0,      factor: 0.15 },
  { start: 7.0, end: 20.0,     factor: 0.10 },
  { start: 20.0, end: Infinity, factor: 0.05 },
];

function fuzzDelta(interval) {
  if (interval < 2.5) return 0;
  return FUZZ_RANGES.reduce(
    (d, r) => d + r.factor * Math.max(Math.min(interval, r.end) - r.start, 0), 1);
}

// Rust f32::round rounds half away from zero; Math.round rounds half up.
// Intervals are positive, so they agree.
function constrainedFuzzBounds(interval, minimum, maximum) {
  minimum = Math.min(minimum, maximum);
  interval = Math.min(Math.max(interval, minimum), maximum);
  const delta = fuzzDelta(interval);
  let lower = Math.round(interval - delta);
  let upper = Math.round(interval + delta);
  lower = Math.min(Math.max(lower, minimum), maximum);
  upper = Math.min(Math.max(upper, minimum), maximum);
  if (upper === lower && upper > 2 && upper < maximum) upper = lower + 1;
  return [lower, upper];
}

function withReviewFuzz(fuzzFactor, interval, minimum, maximum) {
  if (fuzzFactor === null || fuzzFactor === undefined) {
    return Math.min(Math.max(Math.round(interval), minimum), maximum);
  }
  const [lower, upper] = constrainedFuzzBounds(interval, minimum, maximum);
  return Math.floor(lower + fuzzFactor * (1 + upper - lower));
}

function minMax(ctx, minimum) {
  const maximum = Math.max(ctx.maximumInterval, 1);
  return [Math.min(Math.max(minimum, 1), maximum), maximum];
}

// Deterministic per card+rep, like Anki's seeded fuzz: the same card shown
// twice (e.g. interval preview and the actual answer) gets the same result.
export function fuzzFactorFor(cardId, reps) {
  let h = 2166136261;
  const s = `${cardId}:${reps}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000003) / 1000003;
}

function ctxFor(card, config = CONFIG) {
  return { ...config, fuzz: fuzzFactorFor(card.id, card.reps || 0) };
}

const fuzzed = (ctx, interval, minimum, maximum) =>
  withReviewFuzz(ctx.fuzz, interval, minimum, maximum);

// ── Review (review.rs) ──────────────────────────────────────────
function constrainPassing(ctx, interval, minimum, fuzz) {
  interval *= ctx.intervalMultiplier;
  const [mn, mx] = minMax(ctx, minimum);
  return fuzz ? fuzzed(ctx, interval, mn, mx)
              : Math.min(Math.max(Math.round(interval), mn), mx);
}

function passingIntervals(ctx, c) {
  const scheduled = c.ivl;
  const daysLate  = c.elapsedDays - scheduled;

  if (daysLate < 0) {                      // reviewed early
    const sched = Math.max(scheduled, 1);
    const elapsed = c.elapsedDays;
    const hard = constrainPassing(ctx,
      Math.max(elapsed * ctx.hardMultiplier, sched * (ctx.hardMultiplier / 2)), 0, false);
    const good = constrainPassing(ctx, Math.max(elapsed * c.ease, sched), 0, false);
    const reducedBonus = ctx.easyMultiplier - (ctx.easyMultiplier - 1) / 2;
    const easy = constrainPassing(ctx,
      Math.max(elapsed * c.ease, sched) * reducedBonus, 0, false);
    return [hard, good, easy];
  }

  const current = Math.max(scheduled, 1);
  const late = Math.max(daysLate, 0);

  const hardMin = ctx.hardMultiplier <= 1 ? 0 : scheduled + 1;
  const hard = constrainPassing(ctx, current * ctx.hardMultiplier, hardMin, true);

  const goodMin = ctx.hardMultiplier <= 1 ? scheduled + 1 : hard + 1;
  const good = constrainPassing(ctx, (current + late / 2) * c.ease, goodMin, true);

  const easy = constrainPassing(ctx,
    (current + late) * c.ease * ctx.easyMultiplier, good + 1, true);
  return [hard, good, easy];
}

function failingReviewInterval(ctx, c) {
  const [mn, mx] = minMax(ctx, ctx.minimumLapseInterval);
  return fuzzed(ctx, Math.max(c.ivl, 1) * ctx.lapseMultiplier, mn, mx);
}

// ── State helpers ───────────────────────────────────────────────
// Card state fields:  type: 'new' | 'learning' | 'review' | 'relearning'
//   learning / relearning : left (remaining steps), dueSecs (Unix secs)
//   review                : ivl (days), ease, dueDay, lapses
// `elapsedDays` is supplied by the caller for review cards.

function learnTo(type, base, steps, left, delaySecs, nowSecs) {
  return { ...base, type, left, ivl: base.ivl || 0, dueSecs: nowSecs + delaySecs, dueDay: null };
}

function toReview(base, ivl, ease, today) {
  return {
    ...base, type: 'review', left: 0, ivl, ease, dueDay: today + ivl, dueSecs: null,
  };
}

function leechMet(lapses, threshold) {
  if (threshold <= 0) return false;
  const half = Math.max(Math.ceil(threshold / 2), 1);
  return lapses >= threshold && (lapses - threshold) % half === 0;
}

// Next state for each of the 4 answers. `today` is the current day number,
// `nowSecs` is Unix seconds.
export function nextStates(card, nowSecs, today, config = CONFIG) {
  const ctx = ctxFor(card, config);
  const base = {
    id: card.id, front: card.front, back: card.back, src: card.src, created: card.created,
    reps: card.reps || 0, lapses: card.lapses || 0, ease: card.ease || ctx.initialEase,
    ivl: card.ivl || 0, leech: !!card.leech,
  };

  if (card.type === 'new' || card.type === 'learning') {
    const steps = ctx.steps;
    const left = card.type === 'new' ? steps.length : card.left;
    const graduate = (interval) => {
      const [mn, mx] = minMax(ctx, 1);
      return toReview(base, fuzzed(ctx, Math.max(Math.round(interval), 1), mn, mx),
                      ctx.initialEase, today);
    };
    const stay = (delay, remaining) => learnTo('learning', base, steps, remaining, delay, nowSecs);

    const againD = againDelaySecs(steps);
    const again = againD !== null ? stay(againD, steps.length)
                                  : graduate(ctx.graduatingIntervalGood);
    const hardD = hardDelaySecs(steps, left);
    const hard = hardD !== null ? stay(hardD, left) : graduate(ctx.graduatingIntervalGood);
    const goodD = goodDelaySecs(steps, left);
    const good = goodD !== null ? stay(goodD, remainingForGood(steps, left))
                                : graduate(ctx.graduatingIntervalGood);
    const [mn, mx] = minMax(ctx, 1);
    const easy = toReview(base, fuzzed(ctx, ctx.graduatingIntervalEasy, mn, mx),
                          ctx.initialEase, today);
    return { again, hard, good, easy };
  }

  if (card.type === 'relearning') {
    const steps = ctx.relearnSteps;
    const left = card.left;
    // card.ivl already holds the post-lapse review interval.
    const review = toReview(base, card.ivl, card.ease, today);
    const stay = (delay, remaining) =>
      ({ ...learnTo('relearning', base, steps, remaining, delay, nowSecs), ivl: card.ivl });
    const againD = againDelaySecs(steps);
    const again = againD !== null ? stay(againD, steps.length) : review;
    const hardD = hardDelaySecs(steps, left);
    const hard = hardD !== null ? stay(hardD, left) : review;
    const goodD = goodDelaySecs(steps, left);
    const good = goodD !== null ? stay(goodD, remainingForGood(steps, left)) : review;
    const easy = toReview(base, card.ivl + 1, card.ease, today);
    return { again, hard, good, easy };
  }

  // review
  const c = { ...card, ivl: card.ivl, elapsedDays: Math.max(today - (card.dueDay - card.ivl), 0), ease: card.ease };
  const [hardI, goodI, easyI] = passingIntervals(ctx, c);

  const lapses = (card.lapses || 0) + 1;
  const lapseIvl = Math.max(failingReviewInterval(ctx, c), 1);
  const newEase = Math.max(card.ease + EASE_AGAIN, MIN_EASE);
  const againBase = { ...base, ease: newEase, lapses, leech: leechMet(lapses, ctx.leechThreshold) };
  const againD = againDelaySecs(ctx.relearnSteps);
  const again = againD !== null
    ? { ...learnTo('relearning', againBase, ctx.relearnSteps, ctx.relearnSteps.length, againD, nowSecs), ivl: lapseIvl }
    : toReview(againBase, lapseIvl, newEase, today);

  const hard = toReview(base, hardI, Math.max(card.ease + EASE_HARD, MIN_EASE), today);
  const good = toReview(base, goodI, card.ease, today);
  const easy = toReview(base, easyI, card.ease + EASE_EASY, today);
  return { again, hard, good, easy };
}

// Apply an answer (1-4) and return the updated card.
export function answerCard(card, rating, nowSecs, today, config = CONFIG) {
  const key = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }[rating];
  if (!key) throw new Error('bad rating');
  const next = nextStates(card, nowSecs, today, config)[key];
  return { ...next, reps: (card.reps || 0) + 1, last: nowSecs };
}

// Human-readable delay for the answer buttons (seconds from now).
export function delayOf(state, nowSecs, today) {
  if (state.type === 'learning' || state.type === 'relearning') {
    return Math.max(state.dueSecs - nowSecs, 0);
  }
  return Math.max(state.dueDay - today, 0) * DAY;
}

export function formatDelayHe(secs) {
  if (secs < 60)   return 'פחות מדקה';
  if (secs < 3600) return `${Math.round(secs / 60)} דק׳`;
  if (secs < DAY)  return `${Math.round(secs / 3600)} שע׳`;
  const num = (n) => String(Math.round(n * 10) / 10);
  const days = secs / DAY;
  if (days < 30) { const d = Math.round(days); return d === 1 ? 'יום' : `${d} ימים`; }
  if (days < 365) { const m = days / 30; return num(m) === '1' ? 'חודש' : `${num(m)} חודשים`; }
  const y = days / 365;
  return num(y) === '1' ? 'שנה' : `${num(y)} שנים`;
}

export function previewIntervals(card, nowSecs, today, config = CONFIG) {
  const ns = nextStates(card, nowSecs, today, config);
  const out = {};
  for (const k of ['again', 'hard', 'good', 'easy']) {
    out[k] = formatDelayHe(delayOf(ns[k], nowSecs, today));
  }
  return out;
}

export function newCard(id, front, back, src, nowSecs) {
  return {
    id, front, back, src: src || null, created: nowSecs,
    type: 'new', left: 0, ivl: 0, ease: CONFIG.initialEase,
    dueSecs: null, dueDay: null, reps: 0, lapses: 0, leech: false, last: null,
  };
}

// Anki's day rolls over at 4am local time.
export function dayNumber(nowMs, tz = 'Asia/Jerusalem', rolloverHour = 4) {
  let offsetMs = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(nowMs)).reduce((a, p) => (a[p.type] = p.value, a), {});
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    offsetMs = asUtc - Math.floor(nowMs / 1000) * 1000;
  } catch {
    return dayNumber(nowMs, 'Asia/Jerusalem', rolloverHour);
  }
  return Math.floor((nowMs + offsetMs - rolloverHour * 3600000) / 86400000);
}
