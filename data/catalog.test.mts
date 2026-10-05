/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, AMBIGUOUS_WORDS, LEGACY_NAMES, catalogById, exerciseKey, normalizeWords, singularWords } from './catalog';
import { exercises as legacyList } from './exercises';

const loose = exerciseKey;

// Every id ever shipped. Ids are permanent: this list only grows.
const SHIPPED_IDS = `bench-press incline-bench-press decline-bench-press close-grip-bench-press floor-press
dumbbell-bench-press incline-dumbbell-press decline-dumbbell-press dumbbell-floor-press smith-machine-bench-press
incline-smith-machine-press machine-chest-press incline-machine-chest-press dumbbell-fly incline-dumbbell-fly cable-fly
pec-deck dumbbell-pullover push-up incline-push-up decline-push-up kneeling-push-up diamond-push-up chest-dip deadlift
sumo-deadlift trap-bar-deadlift snatch-grip-deadlift rack-pull romanian-deadlift dumbbell-romanian-deadlift
single-leg-romanian-deadlift good-morning back-extension pull-up chin-up assisted-pull-up assisted-chin-up muscle-up lat-pulldown
single-arm-lat-pulldown straight-arm-pulldown barbell-row dumbbell-row chest-supported-dumbbell-row seated-cable-row
single-arm-cable-row t-bar-row chest-supported-row machine-row inverted-row face-pull barbell-shrug dumbbell-shrug
trap-bar-shrug overhead-press push-press dumbbell-shoulder-press arnold-press machine-shoulder-press
smith-machine-shoulder-press handstand-push-up pike-push-up lateral-raise cable-lateral-raise machine-lateral-raise
front-raise rear-delt-fly reverse-pec-deck upright-row dumbbell-upright-row barbell-curl ez-bar-curl dumbbell-curl
hammer-curl cable-hammer-curl incline-dumbbell-curl preacher-curl dumbbell-preacher-curl machine-preacher-curl
concentration-curl spider-curl cable-curl bayesian-curl zottman-curl reverse-curl tricep-pushdown
single-arm-tricep-pushdown skull-crusher dumbbell-skull-crusher dumbbell-overhead-tricep-extension
cable-overhead-tricep-extension jm-press tricep-dip bench-dip assisted-dip machine-dip tricep-kickback wrist-curl
barbell-wrist-curl reverse-wrist-curl farmers-walk suitcase-carry squat front-squat safety-bar-squat smith-machine-squat
overhead-squat goblet-squat bodyweight-squat jump-squat pistol-squat hack-squat pendulum-squat belt-squat leg-press
seated-leg-press leg-extension sissy-squat dumbbell-lunge barbell-lunge bodyweight-lunge split-squat
bulgarian-split-squat step-up lying-leg-curl seated-leg-curl nordic-curl glute-ham-raise cable-pull-through
kettlebell-swing one-arm-kettlebell-swing hip-thrust machine-hip-thrust glute-bridge cable-glute-kickback hip-abduction
hip-adduction clamshell standing-calf-raise seated-calf-raise donkey-calf-raise leg-press-calf-raise
smith-machine-calf-raise single-leg-calf-raise crunch bicycle-crunch cable-crunch machine-crunch sit-up decline-sit-up
v-up hanging-leg-raise hanging-knee-raise captains-chair-leg-raise lying-leg-raise toes-to-bar ab-wheel-rollout
russian-twist mountain-climber dead-bug bird-dog flutter-kick pallof-press cable-woodchop dumbbell-side-bend plank
side-plank hollow-hold l-sit wall-sit dead-hang power-clean clean hang-clean clean-and-jerk clean-and-press push-jerk
split-jerk snatch power-snatch hang-snatch thruster dumbbell-thruster wall-ball kettlebell-clean kettlebell-snatch turkish-get-up
burpee box-jump sled-push sled-pull tire-flip rope-climb running sprint walking rucking hiking cycling air-bike
rowing-machine ski-erg elliptical stair-climber jump-rope swimming hiit battle-ropes circuit-training basketball soccer
american-football tennis pickleball padel badminton squash volleyball baseball golf hockey rugby climbing bjj boxing
martial-arts wrestling yoga pilates dance skiing snowboarding surfing paddling skating stretching foam-rolling mobility
chest-workout back-workout shoulder-workout arm-workout leg-workout glute-workout core-workout upper-body-workout
lower-body-workout push-workout pull-workout full-body-workout`.split(/\s+/);

// Every name and alias → the ids it names
function wordings() {
  const owners = new Map<string, Set<string>>();
  for (const e of CATALOG) {
    for (const w of [e.name, ...e.aliases]) {
      const k = loose(w);
      owners.set(k, (owners.get(k) ?? new Set()).add(e.id));
    }
  }
  return owners;
}

test('ids are unique, kebab-case and never removed', () => {
  const ids = CATALOG.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
  for (const id of SHIPPED_IDS) assert.ok(catalogById.has(id), `shipped id ${id} was removed or renamed`);
  for (const id of ids) assert.ok(SHIPPED_IDS.includes(id), `new id ${id}: add it to SHIPPED_IDS`);
});

test('retired entries point at a live entry', () => {
  for (const e of CATALOG.filter((e) => e.replacedBy)) {
    const next = catalogById.get(e.replacedBy!);
    assert.ok(next && !next.replacedBy, `${e.id} → ${e.replacedBy}`);
  }
});

test('the catalog is about 250 entries with about 25 sports', () => {
  assert.ok(CATALOG.length >= 230 && CATALOG.length <= 270, `${CATALOG.length} entries`);
  const sports = CATALOG.filter((e) => e.pattern === 'sport' || e.id === 'yoga' || e.id === 'pilates').length;
  assert.ok(sports >= 22 && sports <= 30, `${sports} sports`);
});

test('no name or alias names two exercises', () => {
  const clashes = [...wordings()].filter(([, ids]) => ids.size > 1).map(([w, ids]) => `${w}: ${[...ids].join(', ')}`);
  assert.deepEqual(clashes, []);
});

test('aliases are normalized and never an ambiguous word', () => {
  const ambiguous = new Set(Object.keys(AMBIGUOUS_WORDS).map(loose));
  for (const e of CATALOG) {
    for (const a of e.aliases) {
      assert.equal(a, normalizeWords(a), `${e.id}: alias "${a}" is not normalized`);
      assert.ok(!ambiguous.has(loose(a)), `${e.id}: alias "${a}" is an ambiguous word`);
    }
    assert.ok(!ambiguous.has(loose(e.name)), `${e.id}: name is an ambiguous word`);
  }
});

test('ambiguous words are normalized singular keys that list 2+ real exercises', () => {
  for (const [word, ids] of Object.entries(AMBIGUOUS_WORDS)) {
    assert.equal(word, singularWords(word), word);
    assert.ok(ids.length >= 2 && new Set(ids).size === ids.length, word);
    for (const id of ids) assert.ok(catalogById.has(id), `${word} → unknown ${id}`);
  }
});

test('angle and one-side flags agree with the names and aliases', () => {
  for (const e of CATALOG) {
    for (const angle of ['incline', 'decline'] as const) {
      assert.equal(normalizeWords(e.name).includes(angle), e.angle === angle, `${e.id}: name vs angle ${angle}`);
      for (const a of e.aliases) {
        // a treadmill's incline is a note, not a bench angle
        if (e.pattern !== 'cardio' && a.split(' ').includes(angle)) assert.equal(e.angle, angle, `${e.id}: alias "${a}"`);
      }
    }
    assert.equal(/\b(single|one)\b/.test(normalizeWords(e.name)), !!e.oneSide, `${e.id}: name vs oneSide`);
  }
});

// An alias naming another implement is only allowed where the catalog deliberately says so
const IMPLEMENT_MARKERS: [RegExp, string][] = [
  [/\b(db|dumbbells?)\b/, 'dumbbell'], [/\b(bb|barbell)\b/, 'barbell'], [/\b(kb|kettlebells?)\b/, 'kettlebell'],
  [/\bcable\b/, 'cable'], [/\bsmith\b/, 'smith'], [/\b(trap|hex) bar\b/, 'trap-bar'], [/\bez\b|\bezbar\b/, 'ez-bar'],
];
const IMPLEMENT_EXCEPTIONS = new Set(['kb goblet squat', 'kettlebell goblet squat', 'barbell preacher curl', 'barbell skull crushers']);

test('aliases that name an implement name the entry\'s implement', () => {
  for (const e of CATALOG) {
    for (const a of e.aliases) {
      for (const [marker, equipment] of IMPLEMENT_MARKERS) {
        if (marker.test(a) && e.equipment !== equipment && !IMPLEMENT_EXCEPTIONS.has(a)) {
          assert.fail(`${e.id} (${e.equipment}): alias "${a}" names ${equipment}`);
        }
      }
    }
  }
});

test('secondary muscles are at most 2, distinct and never the primary', () => {
  for (const e of CATALOG) {
    const secondary = e.secondary ?? [];
    assert.ok(secondary.length <= 2 && new Set(secondary).size === secondary.length, e.id);
    assert.ok(!secondary.includes(e.primary), `${e.id}: secondary repeats the primary`);
    // Cardio, whole-body lifts and sessions count toward their one group only
    if (e.metric === 'session' || e.primary === 'cardio' || e.primary === 'full_body') assert.deepEqual(secondary, [], e.id);
  }
});

test('close-grip bench and triceps dips are triceps-primary, their base lifts chest-primary', () => {
  assert.equal(catalogById.get('close-grip-bench-press')!.primary, 'triceps');
  assert.equal(catalogById.get('tricep-dip')!.primary, 'triceps');
  assert.equal(catalogById.get('bench-press')!.primary, 'chest');
  assert.equal(catalogById.get('chest-dip')!.primary, 'chest');
});

test('every old exercise-list name maps to an id with the same muscle group', () => {
  for (const old of legacyList) {
    const id = LEGACY_NAMES[old.name];
    assert.ok(id && catalogById.has(id), `${old.name} has no id`);
    assert.equal(catalogById.get(id)!.primary, old.muscleGroup, old.name);
  }
  for (const [name, id] of Object.entries(LEGACY_NAMES)) assert.ok(catalogById.has(id), `${name} → unknown ${id}`);
});

test('chin-ups are their own exercise, not pull-ups', () => {
  const owners = wordings();
  for (const w of ['chin ups', 'chinups', 'chins', 'Chin-up']) assert.deepEqual([...owners.get(loose(w))!], ['chin-up'], w);
  assert.deepEqual([...owners.get(loose('pull ups'))!], ['pull-up']);
});

test('lookalikes the parser used to merge stay apart', () => {
  const owners = wordings();
  const id = (w: string) => [...(owners.get(loose(w)) ?? [])].join();
  assert.equal(id('row'), ''); // ambiguous: never a bare alias
  assert.equal(id('knee raises'), 'hanging-knee-raise');
  assert.equal(id('split squat'), 'split-squat');
  assert.equal(id('bulgarians'), 'bulgarian-split-squat');
  assert.equal(id('incline db bench'), 'incline-dumbbell-press');
  assert.equal(id('trap bar dl'), 'trap-bar-deadlift');
  assert.equal(id('assisted pull ups'), 'assisted-pull-up');
  assert.equal(id('assisted chin ups'), 'assisted-chin-up');
  assert.equal(id('decline bench'), '');
  assert.equal(id('dip machine'), '');
  assert.equal(id('seated dips'), '');
  assert.equal(id('rowed'), '');
  assert.equal(id('erg'), 'rowing-machine');
});
