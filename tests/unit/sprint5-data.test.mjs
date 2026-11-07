// Data checks for Sprint 5 (S5-01): growth.json, minigames.json new blocks,
// personas.json new events, needs.json talk knobs, conversation.json tuning.
// Specs: design/gdd/growth-personality.md §3.10b, §7.2 · design/gdd/minigames-2.md §3.0, §7.2 ·
// design/gdd/conversation.md §7.1.
// Run: node tests/unit/sprint5-data.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, deepEq, near, done } from './_harness.mjs';

console.log('sprint 5 data');

const file = (name) => fileURLToPath(new URL(`../../assets/data/${name}.json`, import.meta.url));
const load = (name) => JSON.parse(readFileSync(file(name), 'utf8'));
const G = load('growth');
const M = load('minigames');
const P = load('personas');
const N = load('needs');

const CHARS = ['flower', 'splat', 'gumdrop', 'diamond', 'cloud', 'pill'];
const CATS = ['cuddly', 'playful', 'foodie', 'stylish'];
const TRAITS = ['cheerful', 'cuddly', 'playful', 'foodie', 'stylish'];
const GAMES = ['snackRain', 'mimic', 'bubbles', 'hop'];
const MAX_LINE = 40; // code points, after placeholders are filled with their longest value
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, lo, hi, msg) => assert(num(v) && v >= lo && v <= hi, `${msg}: ${v} not in ${lo}..${hi}`);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/** New persona events and the placeholders each may use. */
const EVENTS = {
  pickGame: [], favGame: [], mimicStart: [], bubbleStart: [], hopStart: [],
  mimicGood: [], mimicSlip: [], bubbleCall: ['color'], bubbleWrong: [], hopBump: [],
  growUp: [], traitReveal: ['trait'], traitDrift: ['trait'],
  askPet: [], askPlay: [], snackHint: [], decorLike: [], silence: [],
};
const longest = (list) => list.reduce((a, s) => ([...s].length > [...a].length ? s : a), '');
const FILL = {
  trait: longest(TRAITS.map((t) => G.traits[t].label)),
  color: longest(M.bubbles.colors.map((c) => c.label)),
};

function checkLines(lines, allowed, where) {
  assert(Array.isArray(lines), `${where}: not a list`);
  assert(lines.length >= 2 && lines.length <= 4, `${where}: ${lines.length} lines, want 2–4`);
  eq(new Set(lines).size, lines.length, `${where}: duplicate lines`);
  for (const s of lines) {
    assert(typeof s === 'string' && s.trim().length > 0, `${where}: empty line`);
    const holes = [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    for (const h of holes) assert(allowed.includes(h), `${where}: placeholder {${h}} not allowed in "${s}"`);
    const filled = s.replace(/\{(\w+)\}/g, (_, h) => FILL[h]);
    assert([...filled].length <= MAX_LINE, `${where}: "${filled}" is ${[...filled].length} > ${MAX_LINE}`);
  }
}

// ---------- growth.json ----------

test('growth stages baby/kid/grown in order, Thai labels, thresholds 0/45/180', () => {
  deepEq(Object.keys(G.stages), ['baby', 'kid', 'grown'], 'stage keys');
  deepEq(G.stageOrder, ['baby', 'kid', 'grown'], 'stageOrder');
  deepEq(['baby', 'kid', 'grown'].map((s) => G.stages[s].label), ['ก้อนจิ๋ว', 'ก้อนซน', 'ก้อนโต'], 'labels');
  deepEq(['baby', 'kid', 'grown'].map((s) => G.stages[s].atMinutes), [0, 45, 180], 'atMinutes');
  deepEq(['baby', 'kid', 'grown'].map((s) => G.stages[s].vocabLevel), [1, 2, 3], 'vocabLevel');
});

test('growth stage look values inside GDD 7.1 safe ranges; grown is exactly today\'s look', () => {
  for (const [id, s] of Object.entries(G.stages)) {
    inRange(s.scale, 0.6, 1, `${id}.scale`); inRange(s.eyeScale, 1, 1.4, `${id}.eyeScale`);
    inRange(s.roundness, 1, 1.15, `${id}.roundness`); inRange(s.jiggle, 1, 1.4, `${id}.jiggle`);
    inRange(s.hopScale, 0.6, 1, `${id}.hopScale`); inRange(s.pitchSemitones, 0, 4, `${id}.pitchSemitones`);
    inRange(s.needRateScale, 0.8, 1.2, `${id}.needRateScale`);
  }
  for (const k of ['scale', 'eyeScale', 'roundness', 'jiggle', 'hopScale', 'needRateScale']) eq(G.stages.grown[k], 1, `grown.${k}`);
  eq(G.stages.grown.pitchSemitones, 0, 'grown.pitchSemitones');
  assert(G.stages.baby.scale < G.stages.kid.scale && G.stages.kid.scale < G.stages.grown.scale, 'scale grows');
});

test('growth timing and tally knobs inside safe ranges', () => {
  inRange(G.transitionSec, 1, 4, 'transitionSec'); inRange(G.engagedWindowSec, 20, 120, 'engagedWindowSec');
  inRange(G.offline.minutesPerHour, 0, 3, 'offline.minutesPerHour'); inRange(G.offline.capMinutes, 0, 30, 'offline.capMinutes');
  inRange(G.dailySoftCap.minutes, 0, 120, 'dailySoftCap.minutes'); inRange(G.dailySoftCap.rate, 0.25, 1, 'dailySoftCap.rate');
  inRange(G.bucketSec, 30, 120, 'bucketSec'); inRange(G.capPerBucket, 3, 12, 'capPerBucket');
  inRange(G.minigameMinuteWeight, 0.3, 1, 'minigameMinuteWeight'); inRange(G.minTallyForTrait, 0, 60, 'minTallyForTrait');
  inRange(G.balancedMaxShare, 0.3, 0.45, 'balancedMaxShare'); inRange(G.tieMargin, 0, 0.05, 'tieMargin');
  inRange(G.traitLineShare, 0.2, 0.8, 'traitLineShare'); inRange(G.traitIdle.everySeconds, 8, 40, 'traitIdle.everySeconds');
  inRange(G.hint.minTally, 5, 40, 'hint.minTally'); inRange(G.hint.everyMinutes, 10, 40, 'hint.everyMinutes');
  inRange(G.drift.decayPerBucket, 0, 0.03, 'drift.decayPerBucket'); inRange(G.drift.confirmMinutes, 15, 90, 'drift.confirmMinutes');
  inRange(G.drift.minGapMinutes, 60, 600, 'drift.minGapMinutes'); inRange(G.minigameMinScale, 0.7, 1, 'minigameMinScale');
  deepEq(G.categories, CATS, 'categories'); deepEq(Object.keys(G.categoryScale), CATS, 'categoryScale keys');
  eq(G.categoryScale.stylish, 1.5, 'stylish scale');
});

test('growth events map to known categories (or neutral) with weights 0–6', () => {
  for (const [ev, w] of Object.entries(G.events)) {
    for (const [c, v] of Object.entries(w)) {
      assert(CATS.includes(c) || c === 'neutral', `${ev}: unknown category ${c}`);
      inRange(v, 0, 6, `events.${ev}.${c}`);
    }
  }
});

test('minigameMix covers the 4 games, each sums to 1', () => {
  deepEq(Object.keys(G.minigameMix), GAMES, 'mix games');
  for (const [g, mix] of Object.entries(G.minigameMix)) {
    for (const c of Object.keys(mix)) assert(CATS.includes(c), `${g}: unknown category ${c}`);
    near(sum(mix), 1, 1e-9, `${g} mix sum`);
  }
});

test('5 traits with contract ids, Thai labels, hint, because, idle list, mark', () => {
  deepEq(Object.keys(G.traits), TRAITS, 'trait ids');
  deepEq(G.traitOrder, TRAITS, 'traitOrder');
  deepEq(TRAITS.map((t) => G.traits[t].label), ['ร่าเริง', 'ขี้อ้อน', 'ขี้เล่น', 'นักกิน', 'สายแฟ'], 'labels');
  for (const t of TRAITS) {
    const x = G.traits[t];
    for (const k of ['hint', 'because', 'mark', 'behaviorLine']) assert(typeof x[k] === 'string' && x[k], `${t}.${k}`);
    assert(Array.isArray(x.idle) && x.idle.length >= 1, `${t}.idle`);
  }
});

test('growth personas: 6 characters, bias 0.7–1.4, tendencyOrder is a permutation of the 4 categories', () => {
  deepEq(Object.keys(G.personas), CHARS, 'persona keys');
  for (const [k, p] of Object.entries(G.personas)) {
    deepEq(Object.keys(p.bias), CATS, `${k} bias keys`);
    for (const c of CATS) inRange(p.bias[c], 0.7, 1.4, `${k}.bias.${c}`);
    inRange(p.balancedMaxShare, 0.3, 0.45, `${k}.balancedMaxShare`);
    deepEq([...p.tendencyOrder].sort(), [...CATS].sort(), `${k}.tendencyOrder`);
  }
  eq(G.personas.gumdrop.balancedMaxShare, 0.4, 'มิน balancedMaxShare');
});

test('growth migration v4 → v5: played → kid, unplayed → baby', () => {
  eq(G.migration.fromVersion, 4, 'from'); eq(G.migration.toVersion, 5, 'to');
  eq(G.migration.playedStage, 'kid', 'played'); eq(G.migration.unplayedStage, 'baby', 'unplayed');
  assert(G.migration.coachOnce.includes('{name}'), 'coach has {name}');
});

test('growth babble fallback: every list has 1–4 short lines', () => {
  for (const [ev, list] of Object.entries(G.babble)) {
    assert(Array.isArray(list) && list.length >= 1 && list.length <= 4, `babble.${ev}`);
    for (const s of list) assert([...s].length <= 12, `babble.${ev} "${s}" too long for a baby`);
  }
});

// ---------- minigames.json ----------

test('minigames has snackRain + picker + mimic/bubbles/hop; snackRain kept', () => {
  for (const k of ['snackRain', 'picker', ...GAMES]) assert(M[k] && typeof M[k] === 'object', `missing ${k}`);
  eq(M.snackRain.title, 'ฝนขนม', 'snackRain title'); eq(M.snackRain.durationSec, 45, 'snackRain duration');
  eq(M.snackRain.lines.start, 'minigameStart', 'snackRain start line');
});

test('picker: order lists the 4 games, favourites are known games for known characters', () => {
  deepEq(M.picker.order, GAMES, 'order');
  for (const [k, g] of Object.entries(M.picker.favorites)) {
    assert(CHARS.includes(k), `unknown character ${k}`); assert(GAMES.includes(g), `${k}: unknown game ${g}`);
  }
  deepEq(M.picker.favorites, { flower: 'hop', splat: 'mimic', gumdrop: 'snackRain', diamond: 'bubbles', cloud: 'bubbles' }, 'favorites');
  inRange(M.picker.favoriteFunScale, 1, 1.5, 'favoriteFunScale');
});

test('each new game: Thai title, one-line howTo, controls, needs and coin caps in range', () => {
  const titles = { mimic: 'จำท่าทาง', bubbles: 'เป่าฟองสบู่', hop: 'กระโดดข้ามก้อน' };
  for (const g of ['mimic', 'bubbles', 'hop']) {
    const b = M[g];
    eq(b.title, titles[g], `${g}.title`);
    assert(typeof b.howTo === 'string' && b.howTo && !b.howTo.includes('\n') && [...b.howTo].length <= MAX_LINE, `${g}.howTo`);
    assert(Array.isArray(b.controls) && b.controls.includes('touch'), `${g}.controls`);
    for (const c of b.controls) assert(['touch', 'head'].includes(c), `${g}: control ${c}`);
    inRange(b.needs.fun, 0.1, 0.4, `${g}.needs.fun`); inRange(b.needs.social, 0, 0.2, `${g}.needs.social`);
    inRange(b.needs.hunger, -0.15, 0, `${g}.needs.hunger`);
    inRange(b.minCoinsPerRound, 0, 10, `${g}.minCoinsPerRound`); inRange(b.maxCoinsPerRound, 40, 100, `${g}.maxCoinsPerRound`);
    assert(num(b.coinsPerPoints) && b.coinsPerPoints > 0, `${g}.coinsPerPoints`);
    assert(b.lines && typeof b.lines.start === 'string' && typeof b.lines.end === 'string', `${g}.lines start/end`);
  }
  eq(M.mimic.controls.includes('head'), false, 'mimic has no head mode in S5');
});

test('mimic: 6 distinct poses (id, shape, colour, note 1–6), pads 4 → 6 at length 6', () => {
  const poses = M.mimic.poses;
  eq(poses.length, 6, 'pose count');
  for (const k of ['id', 'shape', 'color', 'note', 'label']) eq(new Set(poses.map((p) => p[k])).size, 6, `unique ${k}`);
  deepEq(poses.map((p) => p.note), [1, 2, 3, 4, 5, 6], 'notes');
  deepEq(M.mimic.pads, { start: 4, max: 6, addAt: 6 }, 'pads');
  assert(M.mimic.pads.max <= poses.length, 'pads.max ≤ poses');
  eq(M.mimic.slipsPerRound, 3, 'slips'); eq(M.mimic.maxSec, 75, 'maxSec');
  inRange(M.mimic.showStartSec, 0.6, 1.0, 'showStartSec'); inRange(M.mimic.showEndSec, 0.4, 0.7, 'showEndSec');
});

test('bubbles: 4 colours with distinct patterns and labels; shares and call timing in range', () => {
  const cs = M.bubbles.colors;
  eq(cs.length, 4, 'colours');
  for (const k of ['id', 'label', 'pattern']) eq(new Set(cs.map((c) => c[k])).size, 4, `unique ${k}`);
  inRange(M.bubbles.targetShare, 0.3, 0.6, 'targetShare'); inRange(M.bubbles.coinShare, 0.04, 0.12, 'coinShare');
  inRange(M.bubbles.call.everySec, 5, 12, 'call.everySec'); inRange(M.bubbles.call.graceSec, 0.2, 0.8, 'call.graceSec');
  assert(M.bubbles.relaxed.colors < cs.length, 'relaxed uses fewer colours');
});

test('hop: obstacle kinds sum to 1, jump/speed/flick in range, no doubles in head mode', () => {
  near(sum(M.hop.spawn.kinds), 1, 1e-9, 'kinds sum');
  deepEq(Object.keys(M.hop.spawn.kinds), ['pebble', 'cushion', 'demon'], 'kinds');
  inRange(M.hop.jump.airSec, 0.5, 0.8, 'airSec'); inRange(M.hop.speed.start, 2, 3.2, 'speed.start');
  inRange(M.hop.speed.end, 3.4, 5, 'speed.end');
  assert(M.hop.headFlick.offDeg < M.hop.headFlick.onDeg, 'flick off < on');
  eq(M.hop.headMode.doubles, false, 'head mode doubles');
});

test('every line event a minigame block names exists for every persona', () => {
  const ids = new Set();
  for (const k of ['snackRain', 'picker', ...GAMES]) {
    for (const v of Object.values(M[k].lines ?? {})) if (typeof v === 'string') ids.add(v);
  }
  for (const id of ids) for (const c of CHARS) assert(Array.isArray(P[c].lines[id]) && P[c].lines[id].length, `${c} lacks ${id}`);
});

// ---------- personas.json ----------

test('every persona (5 playable + ปาม) has every new event, 2–4 short lines, allowed placeholders only', () => {
  for (const c of CHARS) for (const [ev, allowed] of Object.entries(EVENTS)) checkLines(P[c].lines[ev], allowed, `${c}.${ev}`);
});

test('bubbleCall lines all name the colour; traitReveal / traitDrift use {trait} in at least one line', () => {
  for (const c of CHARS) {
    for (const s of P[c].lines.bubbleCall) assert(s.includes('{color}'), `${c}.bubbleCall "${s}" has no {color}`);
    for (const ev of ['traitReveal', 'traitDrift']) assert(P[c].lines[ev].some((s) => s.includes('{trait}')), `${c}.${ev}`);
  }
});

test('every persona has traits.<5 ids>.lines.traitHint', () => {
  for (const c of CHARS) {
    deepEq(Object.keys(P[c].traits ?? {}), TRAITS, `${c} trait keys`);
    for (const t of TRAITS) checkLines(P[c].traits[t].lines.traitHint, [], `${c}.traits.${t}.traitHint`);
  }
});

test('growth line ids named by growth.json exist for every persona', () => {
  for (const id of Object.values(G.lines)) {
    if (id === 'traitHint') continue; // per trait, checked above
    for (const c of CHARS) assert(P[c].lines[id], `${c} lacks ${id}`);
  }
  for (const t of TRAITS) for (const c of CHARS) assert(P[c].lines[G.traits[t].behaviorLine], `${c} lacks ${G.traits[t].behaviorLine}`);
});

// ---------- needs.json / conversation.json ----------

test('needs.json talk knobs for conversation (talkFun, talkSocialCapPerMinute)', () => {
  eq(N.actions.talkFun, 0.01, 'talkFun'); inRange(N.actions.talkFun, 0, 0.05, 'talkFun range');
  eq(N.actions.talkSocialCapPerMinute, 0.12, 'cap'); inRange(N.actions.talkSocialCapPerMinute, 0.05, 0.3, 'cap range');
  assert(N.actions.talkSocialCapPerMinute >= N.actions.talkSocial, 'cap allows at least one turn');
});

test('conversation.json tuning (Loop numbers) when present', () => {
  if (!existsSync(file('conversation'))) { console.log('        (conversation.json not landed yet)'); return; }
  const T = load('conversation').tuning;
  assert(T, 'tuning object');
  inRange(T.match.minScore, 0.3, 0.8, 'match.minScore'); inRange(T.match.shortKeywordMax, 2, 4, 'shortKeywordMax');
  inRange(T.match.nameWeight, 0.3, 0.8, 'nameWeight'); eq(T.match.passWeights.length, 3, 'passWeights');
  inRange(T.listen.timeoutSec, 4, 10, 'listen.timeoutSec'); inRange(T.listen.startTimeoutSec, 1, 4, 'startTimeoutSec');
  inRange(T.listen.maxAlternatives, 1, 5, 'maxAlternatives');
  inRange(T.ui.captionSec, 0, 4, 'captionSec'); inRange(T.ui.thinkingShowSec, 0.3, 1.5, 'thinkingShowSec');
  inRange(T.ui.hintAfterMisses, 1, 4, 'hintAfterMisses'); inRange(T.brainTimeoutSec, 2, 8, 'brainTimeoutSec');
  for (const [k, v] of Object.entries(T.intentGain)) inRange(v, 0, 2, `intentGain.${k}`);
  eq(T.intentGain.mean, 0, 'mean gives nothing');
  deepEq(Object.keys(T.stages), ['baby', 'kid', 'grown'], 'stages');
  deepEq(Object.keys(T.babble), CHARS, 'babble chars');
});

done();
