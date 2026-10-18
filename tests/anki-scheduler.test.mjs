import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextStates, answerCard, newCard, previewIntervals, formatDelayHe, dayNumber, delayOf,
} from '../api/_anki-scheduler.js';

const NOW = 1_800_000_000;
const TODAY = 20000;

test('new card: steps 1m,10m -> again 1m, hard 5.5m, good 10m, easy 4d', () => {
  const s = nextStates(newCard('a', 'q', 'a', null, NOW), NOW, TODAY);
  assert.equal(s.again.dueSecs - NOW, 60);
  assert.equal(s.hard.dueSecs - NOW, 330);
  assert.equal(s.good.dueSecs - NOW, 600);
  assert.equal(s.again.type, 'learning');
  assert.equal(s.easy.type, 'review');
  assert.equal(s.easy.ease, 2.5);
  assert.ok(s.easy.ivl >= 3 && s.easy.ivl <= 5);
});

test('learning second step: again resets to step 1, hard repeats 10m, good graduates to 1d', () => {
  let c = answerCard(newCard('b', 'q', 'a', null, NOW), 3, NOW, TODAY); // good -> step 2
  assert.equal(c.type, 'learning');
  assert.equal(c.left, 1);
  const s = nextStates(c, NOW, TODAY);
  assert.equal(s.again.dueSecs - NOW, 60);
  assert.equal(s.again.left, 2);
  assert.equal(s.hard.dueSecs - NOW, 600);
  assert.equal(s.good.type, 'review');
  assert.equal(s.good.ivl, 1);
  assert.equal(s.good.dueDay, TODAY + 1);
  assert.equal(s.good.ease, 2.5);
});

test('review on time: again -> relearning, ease -0.20, 10m', () => {
  const rev = { ...newCard('c', 'q', 'a', null, NOW), type: 'review', ivl: 10, ease: 2.5, dueDay: TODAY, reps: 5 };
  const s = nextStates(rev, NOW, TODAY);
  assert.equal(s.again.type, 'relearning');
  assert.equal(s.again.dueSecs - NOW, 600);
  assert.ok(Math.abs(s.again.ease - 2.3) < 1e-9);
  assert.equal(s.again.lapses, 1);
  assert.equal(s.again.ivl, 1); // new interval 0% -> minimum 1 day
  assert.ok(Math.abs(s.hard.ease - 2.35) < 1e-9);
  assert.equal(s.good.ease, 2.5);
  assert.ok(Math.abs(s.easy.ease - 2.65) < 1e-9);
});

test('review intervals are strictly ordered hard < good < easy and near formula', () => {
  for (let i = 0; i < 400; i++) {
    const ivl = 1 + Math.floor(Math.random() * 500);
    const ease = 1.3 + Math.random() * 2;
    const late = Math.floor(Math.random() * 30);
    const rev = { ...newCard('r' + i, 'q', 'a', null, NOW), type: 'review', ivl, ease, dueDay: TODAY - late, reps: i };
    const s = nextStates(rev, NOW, TODAY);
    const [h, g, e] = [s.hard.ivl, s.good.ivl, s.easy.ivl];
    assert.ok(h >= ivl + 1, `hard>ivl ${h} ${ivl}`);
    assert.ok(g > h && e > g, `order ${h} ${g} ${e}`);
    const gExp = (ivl + late / 2) * ease;
    assert.ok(Math.abs(g - gExp) <= gExp * 0.06 + 3, `good ${g} vs ${gExp}`);
    const eExp = (ivl + late) * ease * 1.3;
    assert.ok(e >= eExp * 0.9 - 3 && e <= eExp * 1.1 + 3 || e === g + 1, `easy ${e} vs ${eExp}`);
  }
});

test('ease never goes below 1.3 and relearning returns to review', () => {
  let c = { ...newCard('d', 'q', 'a', null, NOW), type: 'review', ivl: 30, ease: 1.35, dueDay: TODAY, reps: 3 };
  c = answerCard(c, 1, NOW, TODAY);
  assert.equal(c.ease, 1.3);
  assert.equal(c.type, 'relearning');
  c = answerCard(c, 3, NOW + 600, TODAY);
  assert.equal(c.type, 'review');
  assert.equal(c.ivl, 1);
  assert.equal(c.dueDay, TODAY + 1);
  assert.equal(c.lapses, 1);
});

test('lapses flag leech at threshold 8', () => {
  let c = { ...newCard('e', 'q', 'a', null, NOW), type: 'review', ivl: 5, ease: 2.5, dueDay: TODAY, lapses: 7 };
  assert.equal(answerCard(c, 1, NOW, TODAY).leech, true);
});

test('preview labels', () => {
  const p = previewIntervals(newCard('f', 'q', 'a', null, NOW), NOW, TODAY);
  assert.equal(p.again, '1 דק׳');
  assert.equal(p.good, '10 דק׳');
  assert.equal(formatDelayHe(86400 * 11), '11 ימים');
  assert.equal(formatDelayHe(86400), 'יום');
});

test('day number rolls over at 4am Jerusalem time', () => {
  const before = Date.parse('2026-10-18T00:30:00Z'); // 03:30 IDT -> still previous day
  const after  = Date.parse('2026-10-18T01:30:00Z'); // 04:30 IDT -> new day
  assert.equal(dayNumber(after) - dayNumber(before), 1);
});
