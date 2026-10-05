// The built-in exercise catalog: every exercise the app knows by a permanent id.
//
// Names, implements and muscles were seeded from free-exercise-db (github.com/yuhonas/free-exercise-db,
// Unlicense: public domain) and hand-curated; aliases are hand-written. Only facts are taken, no
// instructions or images.
//
// Granularity rule: a different movement, implement, bench or body angle, one-sided version,
// assisted version, or a shortened range that lets you lift more is a different exercise. Grip,
// stance, bar position, tempo, pauses, deficit, cable attachment, machine brand and lifting aids are
// the same exercise plus a note. If a variant lets you lift more or do more reps than the base lift
// it must be separate, or it creates fake PRs.
//
// Rules (enforced by data/catalog.test.mts):
// - ids are permanent: never renamed or reused. Retire an entry with `replacedBy`, don't delete it.
// - names can change freely; nothing keys on them.
// - aliases are unambiguous wordings only. No alias belongs to two entries, and none is an
//   AMBIGUOUS_WORDS key; ambiguous wordings go in AMBIGUOUS_WORDS instead.
// - every name in data/exercises.ts maps to an id (LEGACY_NAMES or an exact catalog name).

import type { MuscleGroup } from '../types/workout';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'smith' | 'trap-bar'
  | 'ez-bar' | 'specialty-bar' | 'landmine' | 'bodyweight' | 'band' | 'none';

export type Pattern =
  | 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull' | 'squat'
  | 'hinge' | 'lunge' | 'carry' | 'isolation' | 'core' | 'cardio' | 'sport' | 'mobility'
  | 'general'; // a whole session logged by body part ("leg day")

// Which fields count and how a PR is judged
export type Metric = 'weight-reps' | 'reps' | 'assisted-reps' | 'time' | 'distance-time' | 'session';

export interface CatalogExercise {
  id: string; // permanent kebab-case slug
  name: string; // display name
  aliases: string[]; // unambiguous wordings, normalized (see normalizeWords)
  equipment: Equipment;
  pattern: Pattern;
  primary: MuscleGroup; // the muscle the lift is chosen for: a working set counts 1 set here
  secondary?: MuscleGroup[]; // 0-2 muscles doing substantial work (not stabilisers): ½ set each
  seed?: string; // the free-exercise-db id it was seeded from
  metric: Metric;
  angle?: 'incline' | 'decline'; // discriminators checked against the user's words
  oneSide?: true; // the one-sided version of a two-sided lift
  family?: string; // groups variants for candidate lists and "all bench variations" charts, never PRs
  replacedBy?: string; // a retired entry's successor id
}

export const CATALOG_VERSION = 1;

// Lowercase words separated by single spaces: "Push-Ups!" → "push ups"
export const normalizeWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Spelling-insensitive key for matching names and aliases: "Push-Ups", "push ups" and "pushup"
// all give "pushup". Words are singularized ("presses" → "press", "flyes" → "fly").
const singular = (w: string) =>
  w.replace(/yes$/, 'y').replace(/ies$/, 'y').replace(/(ch|sh|x|ss)es$/, '$1').replace(/([^s])s$/, '$1');
export const exerciseKey = (s: string) => normalizeWords(s).split(' ').map(singular).join('');
export const singularWords = (s: string) => normalizeWords(s).split(' ').map(singular).join(' ');

export const CATALOG: CatalogExercise[] = [
  // CHEST
  { id: 'bench-press', name: 'Bench Press', aliases: ['bench', 'flat bench', 'flat bench press', 'barbell bench', 'barbell bench press', 'bb bench', 'bb bench press', 'bp'], equipment: 'barbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Barbell_Bench_Press_-_Medium_Grip', metric: 'weight-reps', family: 'bench-press' },
  { id: 'incline-bench-press', name: 'Incline Bench Press', aliases: ['incline barbell bench', 'incline barbell press', 'incline barbell bench press', 'incline bb bench'], equipment: 'barbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'], seed: 'Barbell_Incline_Bench_Press_-_Medium_Grip', metric: 'weight-reps', angle: 'incline', family: 'bench-press' },
  { id: 'decline-bench-press', name: 'Decline Bench Press', aliases: ['decline barbell bench', 'decline barbell press'], equipment: 'barbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps'], seed: 'Decline_Barbell_Bench_Press', metric: 'weight-reps', angle: 'decline', family: 'bench-press' },
  { id: 'close-grip-bench-press', name: 'Close-Grip Bench Press', aliases: ['close grip bench', 'cgbp', 'close grip barbell bench'], equipment: 'barbell', pattern: 'horizontal-push', primary: 'triceps', secondary: ['chest', 'shoulders'], seed: 'Close-Grip_Barbell_Bench_Press', metric: 'weight-reps', family: 'bench-press' },
  { id: 'floor-press', name: 'Floor Press', aliases: ['barbell floor press'], equipment: 'barbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps'], seed: 'Floor_Press', metric: 'weight-reps', family: 'bench-press' },
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', aliases: ['db bench', 'db bench press', 'dumbbell bench', 'flat dumbbell press', 'flat db press', 'flat db bench', 'dumbbell chest press', 'db chest press'], equipment: 'dumbbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Dumbbell_Bench_Press', metric: 'weight-reps', family: 'bench-press' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', aliases: ['incline db press', 'incline dumbbell bench', 'incline dumbbell bench press', 'incline db bench', 'incline dumbbell'], equipment: 'dumbbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'], seed: 'Incline_Dumbbell_Press', metric: 'weight-reps', angle: 'incline', family: 'bench-press' },
  { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', aliases: ['decline db press', 'decline dumbbell bench', 'decline db bench'], equipment: 'dumbbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps'], seed: 'Decline_Dumbbell_Bench_Press', metric: 'weight-reps', angle: 'decline', family: 'bench-press' },
  { id: 'dumbbell-floor-press', name: 'Dumbbell Floor Press', aliases: ['db floor press'], equipment: 'dumbbell', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps'], seed: 'Dumbbell_Floor_Press', metric: 'weight-reps', family: 'bench-press' },
  { id: 'smith-machine-bench-press', name: 'Smith Machine Bench Press', aliases: ['smith bench', 'smith bench press', 'smith machine bench'], equipment: 'smith', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Smith_Machine_Bench_Press', metric: 'weight-reps', family: 'bench-press' },
  { id: 'incline-smith-machine-press', name: 'Incline Smith Machine Press', aliases: ['incline smith', 'incline smith press', 'incline smith bench', 'smith incline press', 'smith incline bench'], equipment: 'smith', pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'], seed: 'Smith_Machine_Incline_Bench_Press', metric: 'weight-reps', angle: 'incline', family: 'bench-press' },
  { id: 'machine-chest-press', name: 'Machine Chest Press', aliases: ['chest press machine', 'chest press', 'seated chest press'], equipment: 'machine', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Machine_Bench_Press', metric: 'weight-reps', family: 'chest-press' },
  { id: 'incline-machine-chest-press', name: 'Incline Machine Chest Press', aliases: ['incline chest press machine', 'incline machine press', 'incline chest press'], equipment: 'machine', pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'], seed: 'Leverage_Incline_Chest_Press', metric: 'weight-reps', angle: 'incline', family: 'chest-press' },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', aliases: ['dumbbell flyes', 'dumbbell flies', 'db fly', 'db flyes', 'db flies', 'flat dumbbell fly', 'flat db fly'], equipment: 'dumbbell', pattern: 'isolation', primary: 'chest', secondary: ['shoulders'], seed: 'Dumbbell_Flyes', metric: 'weight-reps', family: 'fly' },
  { id: 'incline-dumbbell-fly', name: 'Incline Dumbbell Fly', aliases: ['incline db fly', 'incline flyes', 'incline fly', 'incline dumbbell flyes'], equipment: 'dumbbell', pattern: 'isolation', primary: 'chest', secondary: ['shoulders'], seed: 'Incline_Dumbbell_Flyes', metric: 'weight-reps', angle: 'incline', family: 'fly' },
  { id: 'cable-fly', name: 'Cable Fly', aliases: ['cable flyes', 'cable flies', 'cable crossover', 'cable crossovers', 'cable chest fly', 'crossovers'], equipment: 'cable', pattern: 'isolation', primary: 'chest', secondary: ['shoulders'], seed: 'Cable_Crossover', metric: 'weight-reps', family: 'fly' },
  { id: 'pec-deck', name: 'Pec Deck', aliases: ['pec fly machine', 'pec deck fly', 'machine fly', 'machine flyes', 'butterfly machine', 'pec fly'], equipment: 'machine', pattern: 'isolation', primary: 'chest', secondary: ['shoulders'], seed: 'Butterfly', metric: 'weight-reps', family: 'fly' },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover', aliases: ['db pullover', 'pullover', 'pullovers'], equipment: 'dumbbell', pattern: 'isolation', primary: 'chest', secondary: ['back'], seed: 'Straight-Arm_Dumbbell_Pullover', metric: 'weight-reps' },
  { id: 'push-up', name: 'Push-up', aliases: ['push ups', 'pushups', 'press ups', 'pushup', 'press up'], equipment: 'bodyweight', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Pushups', metric: 'reps', family: 'push-up' },
  { id: 'incline-push-up', name: 'Incline Push-up', aliases: ['incline pushups', 'incline push ups', 'hands elevated push up', 'hands elevated pushups'], equipment: 'bodyweight', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Incline_Push-Up', metric: 'reps', angle: 'incline', family: 'push-up' },
  { id: 'decline-push-up', name: 'Decline Push-up', aliases: ['decline pushups', 'decline push ups', 'feet elevated push up', 'feet elevated pushups'], equipment: 'bodyweight', pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'], seed: 'Decline_Push-Up', metric: 'reps', angle: 'decline', family: 'push-up' },
  { id: 'kneeling-push-up', name: 'Kneeling Push-up', aliases: ['knee push ups', 'knee pushups', 'kneeling pushups', 'kneeling push ups'], equipment: 'bodyweight', pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], metric: 'reps', family: 'push-up' },
  { id: 'diamond-push-up', name: 'Diamond Push-up', aliases: ['diamond pushups', 'diamond push ups', 'close grip pushups', 'close grip push ups'], equipment: 'bodyweight', pattern: 'horizontal-push', primary: 'triceps', secondary: ['chest'], seed: 'Push-Ups_-_Close_Triceps_Position', metric: 'reps', family: 'push-up' },
  { id: 'chest-dip', name: 'Chest Dip', aliases: ['chest dips'], equipment: 'bodyweight', pattern: 'vertical-push', primary: 'chest', secondary: ['triceps', 'shoulders'], seed: 'Dips_-_Chest_Version', metric: 'reps', family: 'dip' },

  // BACK
  { id: 'deadlift', name: 'Deadlift', aliases: ['deads', 'deadlifts', 'dead lift', 'dead lifts', 'deadies', 'dl', 'conventional deadlift', 'conventional', 'barbell deadlift'], equipment: 'barbell', pattern: 'hinge', primary: 'back', secondary: ['glutes', 'hamstrings'], seed: 'Barbell_Deadlift', metric: 'weight-reps', family: 'deadlift' },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', aliases: ['sumo', 'sumo dl', 'sumo deads', 'sumo deadlifts'], equipment: 'barbell', pattern: 'hinge', primary: 'glutes', secondary: ['quads', 'hamstrings'], seed: 'Sumo_Deadlift', metric: 'weight-reps', family: 'deadlift' },
  { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift', aliases: ['trap bar dl', 'trap bar deads', 'hex bar deadlift', 'hex bar dl', 'hex bar', 'trap bar'], equipment: 'trap-bar', pattern: 'hinge', primary: 'quads', secondary: ['glutes', 'back'], seed: 'Trap_Bar_Deadlift', metric: 'weight-reps', family: 'deadlift' },
  { id: 'snatch-grip-deadlift', name: 'Snatch-Grip Deadlift', aliases: ['snatch grip deadlift', 'snatch grip dl'], equipment: 'barbell', pattern: 'hinge', primary: 'back', secondary: ['glutes', 'hamstrings'], seed: 'Snatch_Deadlift', metric: 'weight-reps', family: 'deadlift' },
  { id: 'rack-pull', name: 'Rack Pull', aliases: ['rack pulls', 'block pull', 'block pulls'], equipment: 'barbell', pattern: 'hinge', primary: 'back', secondary: ['glutes'], seed: 'Rack_Pulls', metric: 'weight-reps', family: 'deadlift' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', aliases: ['rdl', 'rdls', 'romanian dl', 'romanian', 'barbell rdl', 'bb rdl', 'stiff leg deadlift', 'stiff legged deadlift', 'sldl'], equipment: 'barbell', pattern: 'hinge', primary: 'hamstrings', secondary: ['glutes', 'back'], seed: 'Romanian_Deadlift', metric: 'weight-reps', family: 'romanian-deadlift' },
  { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', aliases: ['db rdl', 'dumbbell rdl', 'db romanian deadlift', 'dumbbell stiff leg deadlift'], equipment: 'dumbbell', pattern: 'hinge', primary: 'hamstrings', secondary: ['glutes'], seed: 'Stiff-Legged_Dumbbell_Deadlift', metric: 'weight-reps', family: 'romanian-deadlift' },
  { id: 'single-leg-romanian-deadlift', name: 'Single-Leg Romanian Deadlift', aliases: ['single leg rdl', 'single leg romanian deadlift', 'sl rdl', 'single leg deadlift', 'one leg rdl'], equipment: 'dumbbell', pattern: 'hinge', primary: 'hamstrings', secondary: ['glutes'], seed: 'Kettlebell_One-Legged_Deadlift', metric: 'weight-reps', oneSide: true, family: 'romanian-deadlift' },
  { id: 'good-morning', name: 'Good Morning', aliases: ['good mornings', 'barbell good morning'], equipment: 'barbell', pattern: 'hinge', primary: 'hamstrings', secondary: ['glutes', 'back'], seed: 'Good_Morning', metric: 'weight-reps' },
  { id: 'back-extension', name: 'Back Extension', aliases: ['back extensions', 'hyperextension', 'hyperextensions', 'hypers', 'roman chair back extension', '45 degree back extension'], equipment: 'bodyweight', pattern: 'hinge', primary: 'back', secondary: ['glutes', 'hamstrings'], seed: 'Hyperextensions_Back_Extensions', metric: 'reps' },
  { id: 'pull-up', name: 'Pull-up', aliases: ['pull ups', 'pullups', 'pullup', 'wide grip pull ups', 'neutral grip pull ups', 'weighted pull ups'], equipment: 'bodyweight', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], seed: 'Pullups', metric: 'reps', family: 'pull-up' },
  { id: 'chin-up', name: 'Chin-up', aliases: ['chin ups', 'chinups', 'chinup', 'chins', 'weighted chin ups'], equipment: 'bodyweight', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], seed: 'Chin-Up', metric: 'reps', family: 'pull-up' },
  { id: 'assisted-pull-up', name: 'Assisted Pull-up', aliases: ['assisted pull ups', 'assisted pullups', 'band assisted pull ups', 'banded pull ups', 'band pull ups', 'pull up machine'], equipment: 'machine', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], seed: 'Band_Assisted_Pull-Up', metric: 'assisted-reps', family: 'pull-up' },
  { id: 'assisted-chin-up', name: 'Assisted Chin-up', aliases: ['assisted chin ups'], equipment: 'machine', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], metric: 'assisted-reps', family: 'pull-up' },
  { id: 'muscle-up', name: 'Muscle-up', aliases: ['muscle ups', 'muscleups', 'bar muscle up', 'ring muscle up'], equipment: 'bodyweight', pattern: 'vertical-pull', primary: 'back', secondary: ['triceps', 'biceps'], seed: 'Muscle_Up', metric: 'reps', family: 'pull-up' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['lat pulldowns', 'lat pull down', 'lat pull downs', 'pulldown', 'pulldowns', 'lat pull', 'wide grip pulldown', 'close grip pulldown', 'v bar pulldown'], equipment: 'cable', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], seed: 'Wide-Grip_Lat_Pulldown', metric: 'weight-reps', family: 'pulldown' },
  { id: 'single-arm-lat-pulldown', name: 'Single-Arm Lat Pulldown', aliases: ['single arm pulldown', 'one arm pulldown', 'single arm lat pulldown', 'one arm lat pulldown'], equipment: 'cable', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'], seed: 'One_Arm_Lat_Pulldown', metric: 'weight-reps', oneSide: true, family: 'pulldown' },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', aliases: ['straight arm pulldown', 'straight arm pulldowns', 'straight arm lat pulldown', 'stiff arm pulldown', 'lat prayer'], equipment: 'cable', pattern: 'isolation', primary: 'back', seed: 'Straight-Arm_Pulldown', metric: 'weight-reps', family: 'pulldown' },
  { id: 'barbell-row', name: 'Barbell Row', aliases: ['barbell rows', 'bb row', 'bb rows', 'bent over row', 'bent over rows', 'bent over barbell row', 'pendlay row', 'pendlay rows', 'yates row'], equipment: 'barbell', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps', 'shoulders'], seed: 'Bent_Over_Barbell_Row', metric: 'weight-reps', family: 'row' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', aliases: ['db row', 'db rows', 'dumbbell rows', 'one arm row', 'one arm dumbbell row', 'single arm row', 'single arm dumbbell row', 'single arm db row', 'kroc row', 'kroc rows'], equipment: 'dumbbell', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'One-Arm_Dumbbell_Row', metric: 'weight-reps', family: 'row' },
  { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row', aliases: ['chest supported db row', 'chest supported dumbbell rows'], equipment: 'dumbbell', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps', 'shoulders'], seed: 'Dumbbell_Incline_Row', metric: 'weight-reps', family: 'row' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', aliases: ['cable row', 'cable rows', 'seated row', 'seated rows', 'seated cable rows', 'low row'], equipment: 'cable', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'Seated_Cable_Rows', metric: 'weight-reps', family: 'row' },
  { id: 'single-arm-cable-row', name: 'Single-Arm Cable Row', aliases: ['single arm cable row', 'one arm cable row', 'single arm seated cable row'], equipment: 'cable', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'Seated_One-arm_Cable_Pulley_Rows', metric: 'weight-reps', oneSide: true, family: 'row' },
  { id: 't-bar-row', name: 'T-Bar Row', aliases: ['t bar row', 't bar rows', 'tbar row'], equipment: 'landmine', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'T-Bar_Row_with_Handle', metric: 'weight-reps', family: 'row' },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', aliases: ['chest supported row', 'chest supported rows', 'chest supported machine row', 'chest supported t bar row'], equipment: 'machine', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps', 'shoulders'], seed: 'Lying_T-Bar_Row', metric: 'weight-reps', family: 'row' },
  { id: 'machine-row', name: 'Machine Row', aliases: ['seated machine row', 'machine rows', 'iso row', 'iso lateral row'], equipment: 'machine', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'Leverage_Iso_Row', metric: 'weight-reps', family: 'row' },
  { id: 'inverted-row', name: 'Inverted Row', aliases: ['inverted rows', 'body row', 'body rows', 'australian pull ups', 'ring rows', 'ring row'], equipment: 'bodyweight', pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'], seed: 'Inverted_Row', metric: 'reps', family: 'row' },
  { id: 'face-pull', name: 'Face Pull', aliases: ['face pulls', 'rear delt pull', 'cable face pull'], equipment: 'cable', pattern: 'horizontal-pull', primary: 'back', secondary: ['shoulders'], seed: 'Face_Pull', metric: 'weight-reps' },
  { id: 'barbell-shrug', name: 'Barbell Shrug', aliases: ['barbell shrugs', 'bb shrugs', 'bb shrug'], equipment: 'barbell', pattern: 'isolation', primary: 'back', seed: 'Barbell_Shrug', metric: 'weight-reps', family: 'shrug' },
  { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', aliases: ['dumbbell shrugs', 'db shrugs', 'db shrug'], equipment: 'dumbbell', pattern: 'isolation', primary: 'back', seed: 'Dumbbell_Shrug', metric: 'weight-reps', family: 'shrug' },
  { id: 'trap-bar-shrug', name: 'Trap Bar Shrug', aliases: ['trap bar shrugs', 'hex bar shrugs'], equipment: 'trap-bar', pattern: 'isolation', primary: 'back', metric: 'weight-reps', family: 'shrug' },

  // SHOULDERS
  { id: 'overhead-press', name: 'Overhead Press', aliases: ['ohp', 'military press', 'strict press', 'standing press', 'barbell overhead press', 'barbell shoulder press', 'bb ohp', 'standing overhead press', 'press overhead'], equipment: 'barbell', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Standing_Military_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'push-press', name: 'Push Press', aliases: ['push presses', 'barbell push press'], equipment: 'barbell', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Push_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', aliases: ['db shoulder press', 'db ohp', 'dumbbell ohp', 'dumbbell overhead press', 'db overhead press', 'seated dumbbell press', 'seated db press', 'seated dumbbell shoulder press'], equipment: 'dumbbell', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Dumbbell_Shoulder_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'arnold-press', name: 'Arnold Press', aliases: ['arnold dumbbell press', 'arnolds', 'arnold presses'], equipment: 'dumbbell', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Arnold_Dumbbell_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', aliases: ['shoulder press machine', 'machine overhead press', 'machine ohp'], equipment: 'machine', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Machine_Shoulder_Military_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'smith-machine-shoulder-press', name: 'Smith Machine Shoulder Press', aliases: ['smith shoulder press', 'smith ohp', 'smith overhead press', 'smith machine ohp'], equipment: 'smith', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Smith_Machine_Overhead_Shoulder_Press', metric: 'weight-reps', family: 'overhead-press' },
  { id: 'handstand-push-up', name: 'Handstand Push-up', aliases: ['handstand push ups', 'handstand pushups', 'hspu'], equipment: 'bodyweight', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], seed: 'Handstand_Push-Ups', metric: 'reps', family: 'overhead-press' },
  { id: 'pike-push-up', name: 'Pike Push-up', aliases: ['pike push ups', 'pike pushups'], equipment: 'bodyweight', pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'], metric: 'reps', family: 'push-up' },
  { id: 'lateral-raise', name: 'Lateral Raise', aliases: ['lateral raises', 'side raises', 'side raise', 'side laterals', 'side lateral raise', 'lat raises', 'db lateral raise', 'dumbbell lateral raise', 'db lateral raises', 'laterals'], equipment: 'dumbbell', pattern: 'isolation', primary: 'shoulders', seed: 'Side_Lateral_Raise', metric: 'weight-reps', family: 'lateral-raise' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', aliases: ['cable lateral raises', 'cable side raises', 'cable side raise', 'cable laterals'], equipment: 'cable', pattern: 'isolation', primary: 'shoulders', seed: 'Cable_Seated_Lateral_Raise', metric: 'weight-reps', family: 'lateral-raise' },
  { id: 'machine-lateral-raise', name: 'Machine Lateral Raise', aliases: ['lateral raise machine', 'machine lateral raises', 'machine side raises'], equipment: 'machine', pattern: 'isolation', primary: 'shoulders', metric: 'weight-reps', family: 'lateral-raise' },
  { id: 'front-raise', name: 'Front Raise', aliases: ['front raises', 'front delt raise', 'db front raise', 'dumbbell front raise', 'plate front raise', 'plate raises'], equipment: 'dumbbell', pattern: 'isolation', primary: 'shoulders', seed: 'Front_Dumbbell_Raise', metric: 'weight-reps' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', aliases: ['rear delt flyes', 'rear delt flies', 'rear delt raise', 'rear delt raises', 'reverse fly', 'reverse flyes', 'reverse flies', 'bent over laterals', 'bent over reverse fly'], equipment: 'dumbbell', pattern: 'isolation', primary: 'shoulders', secondary: ['back'], seed: 'Reverse_Flyes', metric: 'weight-reps', family: 'rear-delt-fly' },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', aliases: ['reverse pec deck fly', 'rear delt machine', 'reverse fly machine', 'rear delt fly machine', 'machine rear delt fly'], equipment: 'machine', pattern: 'isolation', primary: 'shoulders', secondary: ['back'], seed: 'Reverse_Machine_Flyes', metric: 'weight-reps', family: 'rear-delt-fly' },
  { id: 'upright-row', name: 'Upright Row', aliases: ['upright rows', 'barbell upright row', 'bb upright row'], equipment: 'barbell', pattern: 'vertical-pull', primary: 'shoulders', secondary: ['back'], seed: 'Upright_Barbell_Row', metric: 'weight-reps', family: 'upright-row' },
  { id: 'dumbbell-upright-row', name: 'Dumbbell Upright Row', aliases: ['db upright row', 'dumbbell upright rows'], equipment: 'dumbbell', pattern: 'vertical-pull', primary: 'shoulders', secondary: ['back'], seed: 'Standing_Dumbbell_Upright_Row', metric: 'weight-reps', family: 'upright-row' },

  // BICEPS
  { id: 'barbell-curl', name: 'Barbell Curl', aliases: ['barbell curls', 'bb curl', 'bb curls', 'straight bar curl', 'standing barbell curl', 'barbell bicep curl'], equipment: 'barbell', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'Barbell_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'ez-bar-curl', name: 'EZ-Bar Curl', aliases: ['ez bar curl', 'ez bar curls', 'ez curl', 'ez curls', 'ezbar curl'], equipment: 'ez-bar', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'EZ-Bar_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', aliases: ['dumbbell curls', 'db curl', 'db curls', 'dumbbell bicep curl', 'dumbbell bicep curls', 'db bicep curls', 'alternating dumbbell curl', 'alternating db curls'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'Dumbbell_Bicep_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'hammer-curl', name: 'Hammer Curl', aliases: ['hammer curls', 'db hammer curl', 'dumbbell hammer curl', 'neutral grip curl'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'Hammer_Curls', metric: 'weight-reps', family: 'curl' },
  { id: 'cable-hammer-curl', name: 'Cable Hammer Curl', aliases: ['rope hammer curl', 'rope hammer curls', 'cable rope curl', 'cable hammer curls'], equipment: 'cable', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'Cable_Hammer_Curls_-_Rope_Attachment', metric: 'weight-reps', family: 'curl' },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', aliases: ['incline curl', 'incline curls', 'incline db curl', 'incline bicep curl', 'incline dumbbell curls'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', seed: 'Incline_Dumbbell_Curl', metric: 'weight-reps', angle: 'incline', family: 'curl' },
  { id: 'preacher-curl', name: 'Preacher Curl', aliases: ['preacher curls', 'scott curl', 'ez bar preacher curl', 'barbell preacher curl'], equipment: 'ez-bar', pattern: 'isolation', primary: 'biceps', seed: 'Preacher_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'dumbbell-preacher-curl', name: 'Dumbbell Preacher Curl', aliases: ['db preacher curl', 'single arm preacher curl'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', seed: 'One_Arm_Dumbbell_Preacher_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'machine-preacher-curl', name: 'Machine Preacher Curl', aliases: ['preacher curl machine', 'machine curl', 'machine curls', 'bicep curl machine', 'machine bicep curl'], equipment: 'machine', pattern: 'isolation', primary: 'biceps', seed: 'Machine_Preacher_Curls', metric: 'weight-reps', family: 'curl' },
  { id: 'concentration-curl', name: 'Concentration Curl', aliases: ['concentration curls'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', seed: 'Concentration_Curls', metric: 'weight-reps', family: 'curl' },
  { id: 'spider-curl', name: 'Spider Curl', aliases: ['spider curls'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', seed: 'Spider_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'cable-curl', name: 'Cable Curl', aliases: ['cable curls', 'cable bicep curl', 'cable bicep curls', 'cable bar curl'], equipment: 'cable', pattern: 'isolation', primary: 'biceps', seed: 'Standing_Biceps_Cable_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'bayesian-curl', name: 'Bayesian Cable Curl', aliases: ['bayesian curl', 'bayesian curls', 'behind the body cable curl'], equipment: 'cable', pattern: 'isolation', primary: 'biceps', metric: 'weight-reps', family: 'curl' },
  { id: 'zottman-curl', name: 'Zottman Curl', aliases: ['zottman curls'], equipment: 'dumbbell', pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], seed: 'Zottman_Curl', metric: 'weight-reps', family: 'curl' },
  { id: 'reverse-curl', name: 'Reverse Curl', aliases: ['reverse curls', 'reverse grip curl', 'reverse barbell curl'], equipment: 'barbell', pattern: 'isolation', primary: 'forearms', secondary: ['biceps'], seed: 'Reverse_Barbell_Curl', metric: 'weight-reps', family: 'curl' },

  // TRICEPS
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['tricep pushdowns', 'triceps pushdown', 'pushdown', 'pushdowns', 'cable pushdown', 'tricep pressdown', 'rope pushdown', 'rope pushdowns', 'rope tricep pushdown', 'straight bar pushdown', 'v bar pushdown'], equipment: 'cable', pattern: 'isolation', primary: 'triceps', seed: 'Triceps_Pushdown', metric: 'weight-reps', family: 'pushdown' },
  { id: 'single-arm-tricep-pushdown', name: 'Single-Arm Tricep Pushdown', aliases: ['single arm pushdown', 'one arm pushdown', 'single arm tricep pushdown', 'one arm tricep pushdown'], equipment: 'cable', pattern: 'isolation', primary: 'triceps', metric: 'weight-reps', oneSide: true, family: 'pushdown' },
  { id: 'skull-crusher', name: 'Skull Crusher', aliases: ['skull crushers', 'skullcrushers', 'skullies', 'skulls', 'lying tricep extension', 'lying triceps extension', 'nose breakers', 'ez bar skull crushers', 'barbell skull crushers'], equipment: 'ez-bar', pattern: 'isolation', primary: 'triceps', seed: 'EZ-Bar_Skullcrusher', metric: 'weight-reps', family: 'tricep-extension' },
  { id: 'dumbbell-skull-crusher', name: 'Dumbbell Skull Crusher', aliases: ['db skull crushers', 'dumbbell skull crushers', 'dumbbell lying tricep extension'], equipment: 'dumbbell', pattern: 'isolation', primary: 'triceps', seed: 'Lying_Dumbbell_Tricep_Extension', metric: 'weight-reps', family: 'tricep-extension' },
  { id: 'dumbbell-overhead-tricep-extension', name: 'Dumbbell Overhead Tricep Extension', aliases: ['db overhead extension', 'dumbbell overhead extension', 'db overhead tricep extension', 'seated dumbbell tricep extension'], equipment: 'dumbbell', pattern: 'isolation', primary: 'triceps', seed: 'Standing_Dumbbell_Triceps_Extension', metric: 'weight-reps', family: 'tricep-extension' },
  { id: 'cable-overhead-tricep-extension', name: 'Cable Overhead Tricep Extension', aliases: ['cable overhead extension', 'rope overhead extension', 'overhead rope extension', 'cable overhead tricep extensions'], equipment: 'cable', pattern: 'isolation', primary: 'triceps', seed: 'Cable_Rope_Overhead_Triceps_Extension', metric: 'weight-reps', family: 'tricep-extension' },
  { id: 'jm-press', name: 'JM Press', aliases: ['jm presses'], equipment: 'barbell', pattern: 'isolation', primary: 'triceps', secondary: ['chest'], seed: 'JM_Press', metric: 'weight-reps', family: 'tricep-extension' },
  { id: 'tricep-dip', name: 'Tricep Dip', aliases: ['tricep dips', 'triceps dips'], equipment: 'bodyweight', pattern: 'vertical-push', primary: 'triceps', secondary: ['chest', 'shoulders'], seed: 'Dips_-_Triceps_Version', metric: 'reps', family: 'dip' },
  { id: 'bench-dip', name: 'Bench Dip', aliases: ['bench dips', 'chair dips'], equipment: 'bodyweight', pattern: 'vertical-push', primary: 'triceps', secondary: ['shoulders'], seed: 'Bench_Dips', metric: 'reps', family: 'dip' },
  { id: 'assisted-dip', name: 'Assisted Dip', aliases: ['assisted dips', 'assisted dip machine', 'band assisted dips'], equipment: 'machine', pattern: 'vertical-push', primary: 'triceps', secondary: ['chest', 'shoulders'], metric: 'assisted-reps', family: 'dip' },
  { id: 'machine-dip', name: 'Machine Dip', aliases: ['seated dip machine', 'machine dips'], equipment: 'machine', pattern: 'vertical-push', primary: 'triceps', secondary: ['chest'], seed: 'Dip_Machine', metric: 'weight-reps', family: 'dip' },
  { id: 'tricep-kickback', name: 'Tricep Kickback', aliases: ['tricep kickbacks', 'triceps kickback', 'db kickback', 'db kickbacks', 'dumbbell kickbacks'], equipment: 'dumbbell', pattern: 'isolation', primary: 'triceps', seed: 'Tricep_Dumbbell_Kickback', metric: 'weight-reps' },

  // FOREARMS AND GRIP
  { id: 'wrist-curl', name: 'Wrist Curl', aliases: ['wrist curls', 'forearm curls', 'db wrist curl', 'dumbbell wrist curl'], equipment: 'dumbbell', pattern: 'isolation', primary: 'forearms', seed: 'Seated_Dumbbell_Palms-Up_Wrist_Curl', metric: 'weight-reps', family: 'wrist-curl' },
  { id: 'barbell-wrist-curl', name: 'Barbell Wrist Curl', aliases: ['barbell wrist curls', 'bb wrist curl'], equipment: 'barbell', pattern: 'isolation', primary: 'forearms', seed: 'Seated_Palm-Up_Barbell_Wrist_Curl', metric: 'weight-reps', family: 'wrist-curl' },
  { id: 'reverse-wrist-curl', name: 'Reverse Wrist Curl', aliases: ['reverse wrist curls', 'wrist extension', 'wrist extensions'], equipment: 'dumbbell', pattern: 'isolation', primary: 'forearms', seed: 'Seated_Dumbbell_Palms-Down_Wrist_Curl', metric: 'weight-reps', family: 'wrist-curl' },
  { id: 'farmers-walk', name: "Farmer's Walk", aliases: ['farmers walk', 'farmers walks', 'farmer walks', 'farmers carry', 'farmers carries', 'farmer carry', 'farmer carries'], equipment: 'dumbbell', pattern: 'carry', primary: 'forearms', secondary: ['back', 'core'], seed: 'Farmers_Walk', metric: 'weight-reps', family: 'carry' },
  { id: 'suitcase-carry', name: 'Suitcase Carry', aliases: ['suitcase carries', 'single arm farmers carry', 'one arm farmers walk'], equipment: 'dumbbell', pattern: 'carry', primary: 'core', secondary: ['forearms'], metric: 'weight-reps', family: 'carry' },

  // QUADS
  { id: 'squat', name: 'Squat', aliases: ['squats', 'back squat', 'back squats', 'barbell squat', 'barbell squats', 'bb squat', 'high bar squat', 'low bar squat', 'high bar', 'low bar'], equipment: 'barbell', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Barbell_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'front-squat', name: 'Front Squat', aliases: ['front squats', 'barbell front squat'], equipment: 'barbell', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Front_Barbell_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'safety-bar-squat', name: 'Safety Bar Squat', aliases: ['safety bar squats', 'ssb squat', 'ssb squats', 'ssb', 'safety squat bar squat', 'safety squat'], equipment: 'specialty-bar', pattern: 'squat', primary: 'quads', secondary: ['glutes'], metric: 'weight-reps', family: 'squat' },
  { id: 'smith-machine-squat', name: 'Smith Machine Squat', aliases: ['smith squat', 'smith squats', 'smith machine squats'], equipment: 'smith', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Smith_Machine_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'overhead-squat', name: 'Overhead Squat', aliases: ['overhead squats', 'ohs'], equipment: 'barbell', pattern: 'squat', primary: 'quads', secondary: ['glutes', 'shoulders'], seed: 'Overhead_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'goblet-squat', name: 'Goblet Squat', aliases: ['goblet squats', 'kb goblet squat', 'kettlebell goblet squat', 'db goblet squat', 'dumbbell goblet squat'], equipment: 'dumbbell', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Goblet_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', aliases: ['air squat', 'air squats', 'bodyweight squats', 'bw squats'], equipment: 'bodyweight', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Bodyweight_Squat', metric: 'reps', family: 'squat' },
  { id: 'jump-squat', name: 'Jump Squat', aliases: ['jump squats', 'squat jumps', 'squat jump'], equipment: 'bodyweight', pattern: 'squat', primary: 'quads', secondary: ['glutes', 'calves'], seed: 'Freehand_Jump_Squat', metric: 'reps', family: 'squat' },
  { id: 'pistol-squat', name: 'Pistol Squat', aliases: ['pistol squats', 'pistols', 'single leg squat', 'one leg squat'], equipment: 'bodyweight', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Kettlebell_Pistol_Squat', metric: 'reps', family: 'squat' },
  { id: 'hack-squat', name: 'Hack Squat', aliases: ['hack squats', 'hack squat machine', 'machine hack squat'], equipment: 'machine', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Hack_Squat', metric: 'weight-reps', family: 'squat' },
  { id: 'pendulum-squat', name: 'Pendulum Squat', aliases: ['pendulum squats', 'pendulum squat machine'], equipment: 'machine', pattern: 'squat', primary: 'quads', secondary: ['glutes'], metric: 'weight-reps', family: 'squat' },
  { id: 'belt-squat', name: 'Belt Squat', aliases: ['belt squats', 'belt squat machine'], equipment: 'machine', pattern: 'squat', primary: 'quads', secondary: ['glutes'], metric: 'weight-reps', family: 'squat' },
  { id: 'leg-press', name: 'Leg Press', aliases: ['leg press machine', '45 degree leg press', 'sled leg press', 'leg presses'], equipment: 'machine', pattern: 'squat', primary: 'quads', secondary: ['glutes'], seed: 'Leg_Press', metric: 'weight-reps', family: 'leg-press' },
  { id: 'seated-leg-press', name: 'Seated Leg Press', aliases: ['horizontal leg press', 'seated leg press machine'], equipment: 'machine', pattern: 'squat', primary: 'quads', secondary: ['glutes'], metric: 'weight-reps', family: 'leg-press' },
  { id: 'leg-extension', name: 'Leg Extension', aliases: ['leg extensions', 'leg ext', 'leg exts', 'quad extension', 'quad extensions', 'leg extension machine'], equipment: 'machine', pattern: 'isolation', primary: 'quads', seed: 'Leg_Extensions', metric: 'weight-reps' },
  { id: 'sissy-squat', name: 'Sissy Squat', aliases: ['sissy squats'], equipment: 'bodyweight', pattern: 'squat', primary: 'quads', seed: 'Weighted_Sissy_Squat', metric: 'reps', family: 'squat' },
  { id: 'dumbbell-lunge', name: 'Dumbbell Lunge', aliases: ['dumbbell lunges', 'db lunge', 'db lunges', 'dumbbell walking lunges', 'db walking lunges', 'dumbbell reverse lunges', 'db reverse lunges'], equipment: 'dumbbell', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Dumbbell_Lunges', metric: 'weight-reps', family: 'lunge' },
  { id: 'barbell-lunge', name: 'Barbell Lunge', aliases: ['barbell lunges', 'bb lunges', 'barbell walking lunges', 'barbell reverse lunge'], equipment: 'barbell', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Barbell_Lunge', metric: 'weight-reps', family: 'lunge' },
  { id: 'bodyweight-lunge', name: 'Bodyweight Lunge', aliases: ['bodyweight lunges', 'bw lunges', 'jumping lunges'], equipment: 'bodyweight', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Bodyweight_Walking_Lunge', metric: 'reps', family: 'lunge' },
  { id: 'split-squat', name: 'Split Squat', aliases: ['split squats', 'db split squat', 'dumbbell split squat'], equipment: 'dumbbell', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Split_Squat_with_Dumbbells', metric: 'weight-reps', family: 'lunge' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', aliases: ['bulgarian split squats', 'bulgarians', 'bulgarian', 'bss', 'rfess', 'rear foot elevated split squat', 'rear foot elevated split squats'], equipment: 'dumbbell', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Smith_Single-Leg_Split_Squat', metric: 'weight-reps', family: 'lunge' },
  { id: 'step-up', name: 'Step-up', aliases: ['step ups', 'stepups', 'step up', 'box step ups', 'db step ups', 'dumbbell step ups'], equipment: 'dumbbell', pattern: 'lunge', primary: 'quads', secondary: ['glutes'], seed: 'Dumbbell_Step_Ups', metric: 'weight-reps', family: 'lunge' },

  // HAMSTRINGS
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', aliases: ['lying leg curls', 'lying hamstring curl', 'prone leg curl'], equipment: 'machine', pattern: 'isolation', primary: 'hamstrings', seed: 'Lying_Leg_Curls', metric: 'weight-reps', family: 'leg-curl' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', aliases: ['seated leg curls', 'seated hamstring curl', 'seated hamstring curls'], equipment: 'machine', pattern: 'isolation', primary: 'hamstrings', seed: 'Seated_Leg_Curl', metric: 'weight-reps', family: 'leg-curl' },
  { id: 'nordic-curl', name: 'Nordic Curl', aliases: ['nordic curls', 'nordic hamstring curl', 'nordics', 'nordic'], equipment: 'bodyweight', pattern: 'isolation', primary: 'hamstrings', seed: 'Natural_Glute_Ham_Raise', metric: 'reps', family: 'leg-curl' },
  { id: 'glute-ham-raise', name: 'Glute Ham Raise', aliases: ['glute ham raises', 'ghr', 'ghrs'], equipment: 'machine', pattern: 'isolation', primary: 'hamstrings', secondary: ['glutes'], seed: 'Glute_Ham_Raise', metric: 'reps', family: 'leg-curl' },
  { id: 'cable-pull-through', name: 'Cable Pull-through', aliases: ['cable pull through', 'pull throughs', 'pull through'], equipment: 'cable', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], seed: 'Pull_Through', metric: 'weight-reps' },
  { id: 'kettlebell-swing', name: 'Kettlebell Swing', aliases: ['kettlebell swings', 'kb swing', 'kb swings', 'russian swings', 'russian kettlebell swing', 'american swings', 'american kettlebell swing', 'two hand kettlebell swing'], equipment: 'kettlebell', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], seed: 'One-Arm_Kettlebell_Swings', metric: 'weight-reps', family: 'kettlebell-swing' },
  { id: 'one-arm-kettlebell-swing', name: 'One-Arm Kettlebell Swing', aliases: ['one arm kettlebell swing', 'one arm kb swing', 'one arm swings', 'single arm kb swing', 'single arm kettlebell swing'], equipment: 'kettlebell', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], seed: 'One-Arm_Kettlebell_Swings', metric: 'weight-reps', oneSide: true, family: 'kettlebell-swing' },

  // GLUTES
  { id: 'hip-thrust', name: 'Hip Thrust', aliases: ['hip thrusts', 'barbell hip thrust', 'barbell hip thrusts', 'bb hip thrust'], equipment: 'barbell', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], seed: 'Barbell_Hip_Thrust', metric: 'weight-reps', family: 'hip-thrust' },
  { id: 'machine-hip-thrust', name: 'Machine Hip Thrust', aliases: ['hip thrust machine', 'glute drive', 'machine hip thrusts'], equipment: 'machine', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], metric: 'weight-reps', family: 'hip-thrust' },
  { id: 'glute-bridge', name: 'Glute Bridge', aliases: ['glute bridges', 'hip bridge', 'hip bridges'], equipment: 'bodyweight', pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'], seed: 'Butt_Lift_Bridge', metric: 'reps', family: 'hip-thrust' },
  { id: 'cable-glute-kickback', name: 'Cable Glute Kickback', aliases: ['cable glute kickbacks', 'glute kickback', 'glute kickbacks', 'cable kickbacks'], equipment: 'cable', pattern: 'isolation', primary: 'glutes', seed: 'One-Legged_Cable_Kickback', metric: 'weight-reps' },
  { id: 'hip-abduction', name: 'Hip Abduction', aliases: ['hip abductions', 'hip abductor', 'abductor machine', 'abductors', 'abduction machine', 'outer thigh machine'], equipment: 'machine', pattern: 'isolation', primary: 'glutes', seed: 'Thigh_Abductor', metric: 'weight-reps' },
  { id: 'hip-adduction', name: 'Hip Adduction', aliases: ['hip adductions', 'hip adductor', 'adductor machine', 'adductors', 'adduction machine', 'inner thigh machine'], equipment: 'machine', pattern: 'isolation', primary: 'quads', seed: 'Thigh_Adductor', metric: 'weight-reps' },
  { id: 'clamshell', name: 'Clamshell', aliases: ['clamshells', 'clam shells', 'banded clamshells'], equipment: 'band', pattern: 'isolation', primary: 'glutes', metric: 'reps' },

  // CALVES
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', aliases: ['standing calf raises', 'standing calf', 'calf raises', 'calf raise', 'calf raise machine'], equipment: 'machine', pattern: 'isolation', primary: 'calves', seed: 'Standing_Calf_Raises', metric: 'weight-reps', family: 'calf-raise' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', aliases: ['seated calf raises', 'seated calf', 'seated calves'], equipment: 'machine', pattern: 'isolation', primary: 'calves', seed: 'Seated_Calf_Raise', metric: 'weight-reps', family: 'calf-raise' },
  { id: 'donkey-calf-raise', name: 'Donkey Calf Raise', aliases: ['donkey calf raises', 'donkey calf'], equipment: 'machine', pattern: 'isolation', primary: 'calves', seed: 'Donkey_Calf_Raises', metric: 'weight-reps', family: 'calf-raise' },
  { id: 'leg-press-calf-raise', name: 'Leg Press Calf Raise', aliases: ['leg press calf raises', 'calf press', 'calf presses'], equipment: 'machine', pattern: 'isolation', primary: 'calves', seed: 'Calf_Press_On_The_Leg_Press_Machine', metric: 'weight-reps', family: 'calf-raise' },
  { id: 'smith-machine-calf-raise', name: 'Smith Machine Calf Raise', aliases: ['smith calf raise', 'smith calf raises'], equipment: 'smith', pattern: 'isolation', primary: 'calves', seed: 'Smith_Machine_Calf_Raise', metric: 'weight-reps', family: 'calf-raise' },
  { id: 'single-leg-calf-raise', name: 'Single-Leg Calf Raise', aliases: ['single leg calf raise', 'single leg calf raises', 'one leg calf raise'], equipment: 'bodyweight', pattern: 'isolation', primary: 'calves', metric: 'reps', oneSide: true, family: 'calf-raise' },

  // CORE
  { id: 'crunch', name: 'Crunch', aliases: ['crunches', 'ab crunch', 'ab crunches'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Crunches', metric: 'reps', family: 'crunch' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', aliases: ['bicycle crunches', 'bicycles'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Cross-Body_Crunch', metric: 'reps', family: 'crunch' },
  { id: 'cable-crunch', name: 'Cable Crunch', aliases: ['cable crunches', 'kneeling cable crunch', 'rope crunch', 'rope crunches'], equipment: 'cable', pattern: 'core', primary: 'core', seed: 'Cable_Crunch', metric: 'weight-reps', family: 'crunch' },
  { id: 'machine-crunch', name: 'Machine Crunch', aliases: ['ab crunch machine', 'crunch machine', 'ab machine'], equipment: 'machine', pattern: 'core', primary: 'core', seed: 'Ab_Crunch_Machine', metric: 'weight-reps', family: 'crunch' },
  { id: 'sit-up', name: 'Sit-up', aliases: ['sit ups', 'situps', 'situp'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Sit-Up', metric: 'reps', family: 'crunch' },
  { id: 'decline-sit-up', name: 'Decline Sit-up', aliases: ['decline sit ups', 'decline situps', 'decline crunches'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Decline_Crunch', metric: 'reps', angle: 'decline', family: 'crunch' },
  { id: 'v-up', name: 'V-up', aliases: ['v ups', 'vups'], equipment: 'bodyweight', pattern: 'core', primary: 'core', metric: 'reps' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', aliases: ['hanging leg raises', 'hanging straight leg raise'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Hanging_Leg_Raise', metric: 'reps', family: 'leg-raise' },
  { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', aliases: ['hanging knee raises', 'knee raises', 'knee raise', 'knee ups'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Knee_Hip_Raise_On_Parallel_Bars', metric: 'reps', family: 'leg-raise' },
  { id: 'captains-chair-leg-raise', name: "Captain's Chair Leg Raise", aliases: ['captains chair', 'captains chair leg raises', 'captains chair knee raises', 'roman chair leg raise', 'roman chair knee raises'], equipment: 'machine', pattern: 'core', primary: 'core', seed: 'Knee_Hip_Raise_On_Parallel_Bars', metric: 'reps', family: 'leg-raise' },
  { id: 'lying-leg-raise', name: 'Lying Leg Raise', aliases: ['lying leg raises', 'floor leg raises'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Flat_Bench_Lying_Leg_Raise', metric: 'reps', family: 'leg-raise' },
  { id: 'toes-to-bar', name: 'Toes-to-Bar', aliases: ['toes to bar', 't2b', 'ttb'], equipment: 'bodyweight', pattern: 'core', primary: 'core', metric: 'reps', family: 'leg-raise' },
  { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', aliases: ['ab wheel', 'ab wheel rollouts', 'ab rollout', 'ab rollouts', 'rollouts', 'ab roller'], equipment: 'none', pattern: 'core', primary: 'core', seed: 'Ab_Roller', metric: 'reps' },
  { id: 'russian-twist', name: 'Russian Twist', aliases: ['russian twists'], equipment: 'none', pattern: 'core', primary: 'core', seed: 'Russian_Twist', metric: 'reps' },
  { id: 'mountain-climber', name: 'Mountain Climber', aliases: ['mountain climbers'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Mountain_Climbers', metric: 'reps' },
  { id: 'dead-bug', name: 'Dead Bug', aliases: ['dead bugs', 'deadbugs'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Dead_Bug', metric: 'reps' },
  { id: 'bird-dog', name: 'Bird Dog', aliases: ['bird dogs'], equipment: 'bodyweight', pattern: 'core', primary: 'core', metric: 'reps' },
  { id: 'flutter-kick', name: 'Flutter Kick', aliases: ['flutter kicks'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Flutter_Kicks', metric: 'reps' },
  { id: 'pallof-press', name: 'Pallof Press', aliases: ['pallof presses', 'paloff press'], equipment: 'cable', pattern: 'core', primary: 'core', seed: 'Pallof_Press', metric: 'weight-reps' },
  { id: 'cable-woodchop', name: 'Cable Woodchop', aliases: ['woodchop', 'woodchops', 'wood chops', 'cable woodchops', 'wood chopper', 'woodchoppers'], equipment: 'cable', pattern: 'core', primary: 'core', seed: 'Standing_Cable_Wood_Chop', metric: 'weight-reps' },
  { id: 'dumbbell-side-bend', name: 'Dumbbell Side Bend', aliases: ['side bends', 'side bend', 'db side bend', 'dumbbell side bends'], equipment: 'dumbbell', pattern: 'core', primary: 'core', seed: 'Dumbbell_Side_Bend', metric: 'weight-reps' },

  // HOLDS
  { id: 'plank', name: 'Plank', aliases: ['planks', 'front plank', 'forearm plank', 'weighted plank'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Plank', metric: 'time', family: 'plank' },
  { id: 'side-plank', name: 'Side Plank', aliases: ['side planks'], equipment: 'bodyweight', pattern: 'core', primary: 'core', seed: 'Side_Bridge', metric: 'time', family: 'plank' },
  { id: 'hollow-hold', name: 'Hollow Hold', aliases: ['hollow body hold', 'hollow holds', 'hollow body'], equipment: 'bodyweight', pattern: 'core', primary: 'core', metric: 'time' },
  { id: 'l-sit', name: 'L-sit', aliases: ['l sit', 'l sits', 'lsit'], equipment: 'bodyweight', pattern: 'core', primary: 'core', metric: 'time' },
  { id: 'wall-sit', name: 'Wall Sit', aliases: ['wall sits', 'wall squat hold'], equipment: 'bodyweight', pattern: 'squat', primary: 'quads', metric: 'time' },
  { id: 'dead-hang', name: 'Dead Hang', aliases: ['dead hangs', 'bar hang', 'bar hangs', 'hang from bar'], equipment: 'bodyweight', pattern: 'vertical-pull', primary: 'forearms', secondary: ['back'], metric: 'time' },

  // OLYMPIC, STRONGMAN AND FULL BODY
  { id: 'power-clean', name: 'Power Clean', aliases: ['power cleans'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Power_Clean', metric: 'weight-reps', family: 'clean' },
  { id: 'clean', name: 'Clean', aliases: ['cleans', 'squat clean', 'squat cleans', 'full clean'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Clean', metric: 'weight-reps', family: 'clean' },
  { id: 'hang-clean', name: 'Hang Clean', aliases: ['hang cleans'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Hang_Clean', metric: 'weight-reps', family: 'clean' },
  { id: 'clean-and-jerk', name: 'Clean and Jerk', aliases: ['clean and jerks', 'clean jerk', 'c and j'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Clean_and_Jerk', metric: 'weight-reps', family: 'clean' },
  { id: 'clean-and-press', name: 'Clean and Press', aliases: ['clean and presses', 'clean press'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Clean_and_Press', metric: 'weight-reps', family: 'clean' },
  { id: 'push-jerk', name: 'Push Jerk', aliases: ['push jerks', 'power jerk'], equipment: 'barbell', pattern: 'vertical-push', primary: 'full_body', seed: 'Power_Jerk', metric: 'weight-reps', family: 'clean' },
  { id: 'split-jerk', name: 'Split Jerk', aliases: ['split jerks'], equipment: 'barbell', pattern: 'vertical-push', primary: 'full_body', seed: 'Split_Jerk', metric: 'weight-reps', family: 'clean' },
  { id: 'snatch', name: 'Snatch', aliases: ['snatches', 'squat snatch', 'full snatch'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Snatch', metric: 'weight-reps', family: 'snatch' },
  { id: 'power-snatch', name: 'Power Snatch', aliases: ['power snatches'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Power_Snatch', metric: 'weight-reps', family: 'snatch' },
  { id: 'hang-snatch', name: 'Hang Snatch', aliases: ['hang snatches'], equipment: 'barbell', pattern: 'hinge', primary: 'full_body', seed: 'Hang_Snatch', metric: 'weight-reps', family: 'snatch' },
  { id: 'thruster', name: 'Thruster', aliases: ['thrusters', 'barbell thruster', 'barbell thrusters'], equipment: 'barbell', pattern: 'squat', primary: 'full_body', metric: 'weight-reps', family: 'thruster' },
  { id: 'dumbbell-thruster', name: 'Dumbbell Thruster', aliases: ['dumbbell thrusters', 'db thruster', 'db thrusters'], equipment: 'dumbbell', pattern: 'squat', primary: 'full_body', metric: 'weight-reps', family: 'thruster' },
  { id: 'wall-ball', name: 'Wall Ball', aliases: ['wall balls', 'wall ball shots', 'wallballs'], equipment: 'none', pattern: 'squat', primary: 'full_body', metric: 'weight-reps' },
  { id: 'kettlebell-clean', name: 'Kettlebell Clean', aliases: ['kettlebell cleans', 'kb clean', 'kb cleans'], equipment: 'kettlebell', pattern: 'hinge', primary: 'full_body', seed: 'Two-Arm_Kettlebell_Clean', metric: 'weight-reps' },
  { id: 'kettlebell-snatch', name: 'Kettlebell Snatch', aliases: ['kettlebell snatches', 'kb snatch', 'kb snatches'], equipment: 'kettlebell', pattern: 'hinge', primary: 'full_body', seed: 'One-Arm_Kettlebell_Snatch', metric: 'weight-reps' },
  { id: 'turkish-get-up', name: 'Turkish Get-up', aliases: ['turkish get ups', 'turkish getup', 'tgu', 'tgus', 'get ups'], equipment: 'kettlebell', pattern: 'core', primary: 'full_body', seed: 'Kettlebell_Turkish_Get-Up_Squat_style', metric: 'weight-reps' },
  { id: 'burpee', name: 'Burpee', aliases: ['burpees'], equipment: 'bodyweight', pattern: 'cardio', primary: 'cardio', metric: 'reps' },
  { id: 'box-jump', name: 'Box Jump', aliases: ['box jumps', 'plyometric jumps'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Front_Box_Jump', metric: 'reps' },
  { id: 'sled-push', name: 'Sled Push', aliases: ['sled pushes', 'prowler push', 'prowler', 'prowler pushes'], equipment: 'none', pattern: 'carry', primary: 'full_body', seed: 'Sled_Push', metric: 'weight-reps', family: 'sled' },
  { id: 'sled-pull', name: 'Sled Pull', aliases: ['sled pulls', 'sled drag', 'sled drags'], equipment: 'none', pattern: 'carry', primary: 'full_body', seed: 'Sled_Drag_-_Harness', metric: 'weight-reps', family: 'sled' },
  { id: 'tire-flip', name: 'Tire Flip', aliases: ['tire flips', 'tyre flips'], equipment: 'none', pattern: 'hinge', primary: 'full_body', seed: 'Tire_Flip', metric: 'reps' },
  { id: 'rope-climb', name: 'Rope Climb', aliases: ['rope climbs'], equipment: 'none', pattern: 'vertical-pull', primary: 'back', secondary: ['biceps', 'forearms'], seed: 'Rope_Climb', metric: 'reps' },

  // CARDIO
  { id: 'running', name: 'Running', aliases: ['run', 'runs', 'jog', 'jogging', 'treadmill run', 'treadmill running', 'trail run', 'trail running', 'ran'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Running_Treadmill', metric: 'distance-time', family: 'running' },
  { id: 'sprint', name: 'Sprints', aliases: ['sprint', 'sprinting', 'hill sprints'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Wind_Sprints', metric: 'distance-time', family: 'running' },
  { id: 'walking', name: 'Walking', aliases: ['walk', 'walks', 'treadmill walk', 'incline walk', 'incline walking', 'incline treadmill walk', '12 3 30'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Walking_Treadmill', metric: 'distance-time' },
  { id: 'rucking', name: 'Rucking', aliases: ['ruck', 'rucks', 'weighted walk', 'ruck march'], equipment: 'none', pattern: 'carry', primary: 'cardio', metric: 'distance-time' },
  { id: 'hiking', name: 'Hiking', aliases: ['hike', 'hikes', 'hiked'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Trail_Running_Walking', metric: 'distance-time' },
  { id: 'cycling', name: 'Cycling', aliases: ['bike', 'biking', 'bike ride', 'cycle', 'stationary bike', 'spin', 'spin class', 'spinning', 'peloton', 'road bike', 'mountain biking'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Bicycling', metric: 'distance-time' },
  { id: 'air-bike', name: 'Air Bike', aliases: ['assault bike', 'echo bike', 'airdyne', 'fan bike', 'air bike sprints'], equipment: 'machine', pattern: 'cardio', primary: 'cardio', seed: 'Air_Bike', metric: 'distance-time' },
  { id: 'rowing-machine', name: 'Rowing', aliases: ['rowing machine', 'rowing', 'erg', 'ergometer', 'rower', 'indoor rowing', 'erg row', 'concept2'], equipment: 'machine', pattern: 'cardio', primary: 'cardio', seed: 'Rowing_Stationary', metric: 'distance-time' },
  { id: 'ski-erg', name: 'Ski Erg', aliases: ['skierg', 'ski ergometer', 'ski machine'], equipment: 'machine', pattern: 'cardio', primary: 'cardio', metric: 'distance-time' },
  { id: 'elliptical', name: 'Elliptical', aliases: ['elliptical trainer', 'cross trainer', 'ellipticals'], equipment: 'machine', pattern: 'cardio', primary: 'cardio', seed: 'Elliptical_Trainer', metric: 'distance-time' },
  { id: 'stair-climber', name: 'Stair Climber', aliases: ['stairmaster', 'stair master', 'stairmill', 'stair mill', 'stepmill', 'stair climbing', 'stairs'], equipment: 'machine', pattern: 'cardio', primary: 'cardio', seed: 'Stairmaster', metric: 'distance-time' },
  { id: 'jump-rope', name: 'Jump Rope', aliases: ['skipping', 'skipping rope', 'skipped rope', 'rope skipping', 'jump roping', 'jumping rope', 'double unders'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Rope_Jumping', metric: 'time' },
  { id: 'swimming', name: 'Swimming', aliases: ['swim', 'swims', 'swam', 'freestyle swim', 'lap swimming', 'pool laps'], equipment: 'none', pattern: 'cardio', primary: 'cardio', metric: 'distance-time' },
  { id: 'hiit', name: 'HIIT', aliases: ['high intensity interval training', 'hiit class', 'hiit workout', 'orangetheory', 'f45', 'tabata'], equipment: 'none', pattern: 'cardio', primary: 'cardio', metric: 'session' },
  { id: 'battle-ropes', name: 'Battle Ropes', aliases: ['battle rope', 'battling ropes', 'rope slams'], equipment: 'none', pattern: 'cardio', primary: 'cardio', seed: 'Battling_Ropes', metric: 'time' },
  { id: 'circuit-training', name: 'Circuit Training', aliases: ['circuit class', 'crossfit', 'crossfit class', 'bootcamp', 'boot camp', 'metcon', 'wod'], equipment: 'none', pattern: 'cardio', primary: 'full_body', metric: 'session' },

  // SPORTS AND ACTIVITIES (session: time only, never PRs)
  { id: 'basketball', name: 'Basketball', aliases: ['pickup basketball', 'basketball game', 'hoops', 'shooting hoops'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'soccer', name: 'Soccer', aliases: ['football soccer', 'soccer game', 'futsal', 'five a side'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'american-football', name: 'American Football', aliases: ['flag football', 'touch football'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'tennis', name: 'Tennis', aliases: ['tennis match', 'played tennis'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'pickleball', name: 'Pickleball', aliases: ['pickle ball', 'pickleball game'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'padel', name: 'Padel', aliases: ['padel tennis', 'paddle tennis'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'badminton', name: 'Badminton', aliases: [], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'squash', name: 'Squash', aliases: ['racquetball'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'volleyball', name: 'Volleyball', aliases: ['beach volleyball'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'baseball', name: 'Baseball', aliases: ['softball'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'golf', name: 'Golf', aliases: ['round of golf', 'driving range'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'hockey', name: 'Hockey', aliases: ['ice hockey', 'field hockey', 'roller hockey'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'rugby', name: 'Rugby', aliases: [], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'climbing', name: 'Climbing', aliases: ['rock climbing', 'bouldering', 'indoor climbing', 'top rope', 'lead climbing'], equipment: 'none', pattern: 'sport', primary: 'back', metric: 'session' },
  { id: 'bjj', name: 'Brazilian Jiu-Jitsu', aliases: ['bjj', 'jiu jitsu', 'jujitsu', 'grappling'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'boxing', name: 'Boxing', aliases: ['boxing class', 'sparring', 'heavy bag', 'bag work', 'shadow boxing'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'martial-arts', name: 'Martial Arts', aliases: ['kickboxing', 'muay thai', 'kickboxing class', 'mma', 'karate', 'taekwondo', 'judo'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'wrestling', name: 'Wrestling', aliases: [], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'yoga', name: 'Yoga', aliases: ['hot yoga', 'vinyasa', 'vinyasa yoga', 'power yoga', 'yin yoga', 'hatha yoga', 'bikram'], equipment: 'none', pattern: 'mobility', primary: 'full_body', metric: 'session' },
  { id: 'pilates', name: 'Pilates', aliases: ['reformer pilates', 'mat pilates', 'pilates class', 'reformer', 'barre'], equipment: 'none', pattern: 'mobility', primary: 'core', metric: 'session' },
  { id: 'dance', name: 'Dance', aliases: ['dancing', 'dance class', 'zumba'], equipment: 'none', pattern: 'sport', primary: 'cardio', metric: 'session' },
  { id: 'skiing', name: 'Skiing', aliases: ['ski', 'downhill skiing', 'cross country skiing', 'ski day'], equipment: 'none', pattern: 'sport', primary: 'quads', metric: 'session' },
  { id: 'snowboarding', name: 'Snowboarding', aliases: ['snowboard'], equipment: 'none', pattern: 'sport', primary: 'quads', metric: 'session' },
  { id: 'surfing', name: 'Surfing', aliases: ['surf', 'surfed'], equipment: 'none', pattern: 'sport', primary: 'full_body', metric: 'session' },
  { id: 'paddling', name: 'Paddling', aliases: ['kayaking', 'kayak', 'canoeing', 'paddleboarding', 'paddle boarding'], equipment: 'none', pattern: 'sport', primary: 'back', metric: 'session' },
  { id: 'skating', name: 'Skating', aliases: ['ice skating', 'roller skating', 'rollerblading', 'inline skating', 'skateboarding'], equipment: 'none', pattern: 'sport', primary: 'quads', metric: 'session' },

  // MOBILITY AND RECOVERY
  { id: 'stretching', name: 'Stretching', aliases: ['stretch', 'stretches', 'stretched', 'stretching session'], equipment: 'none', pattern: 'mobility', primary: 'full_body', metric: 'session' },
  { id: 'foam-rolling', name: 'Foam Rolling', aliases: ['foam roll', 'foam rolled', 'foam roller', 'rolled out'], equipment: 'none', pattern: 'mobility', primary: 'full_body', metric: 'session' },
  { id: 'mobility', name: 'Mobility', aliases: ['mobility work', 'mobility session', 'mobility drills'], equipment: 'none', pattern: 'mobility', primary: 'full_body', metric: 'session' },

  // BODY-PART SESSIONS (a log that names body parts but no exercises)
  { id: 'chest-workout', name: 'Chest Workout', aliases: ['chest day', 'chest session'], equipment: 'none', pattern: 'general', primary: 'chest', metric: 'session', family: 'body-part' },
  { id: 'back-workout', name: 'Back Workout', aliases: ['back day', 'back session'], equipment: 'none', pattern: 'general', primary: 'back', metric: 'session', family: 'body-part' },
  { id: 'shoulder-workout', name: 'Shoulder Workout', aliases: ['shoulders workout', 'shoulder day', 'shoulders day', 'delt day'], equipment: 'none', pattern: 'general', primary: 'shoulders', metric: 'session', family: 'body-part' },
  { id: 'arm-workout', name: 'Arm Workout', aliases: ['arms workout', 'arm day', 'arms day', 'arms'], equipment: 'none', pattern: 'general', primary: 'biceps', metric: 'session', family: 'body-part' },
  { id: 'leg-workout', name: 'Leg Workout', aliases: ['legs workout', 'leg day', 'legs day', 'legs'], equipment: 'none', pattern: 'general', primary: 'quads', metric: 'session', family: 'body-part' },
  { id: 'glute-workout', name: 'Glute Workout', aliases: ['glutes workout', 'glute day', 'glutes day', 'booty day'], equipment: 'none', pattern: 'general', primary: 'glutes', metric: 'session', family: 'body-part' },
  { id: 'core-workout', name: 'Core Workout', aliases: ['abs workout', 'ab workout', 'abs', 'core day', 'ab day', 'abs day'], equipment: 'none', pattern: 'general', primary: 'core', metric: 'session', family: 'body-part' },
  { id: 'upper-body-workout', name: 'Upper Body Workout', aliases: ['upper body', 'upper day', 'upper body day'], equipment: 'none', pattern: 'general', primary: 'chest', metric: 'session', family: 'body-part' },
  { id: 'lower-body-workout', name: 'Lower Body Workout', aliases: ['lower body', 'lower day', 'lower body day'], equipment: 'none', pattern: 'general', primary: 'quads', metric: 'session', family: 'body-part' },
  { id: 'push-workout', name: 'Push Workout', aliases: ['push day', 'push session'], equipment: 'none', pattern: 'general', primary: 'chest', metric: 'session', family: 'body-part' },
  { id: 'pull-workout', name: 'Pull Workout', aliases: ['pull day', 'pull session'], equipment: 'none', pattern: 'general', primary: 'back', metric: 'session', family: 'body-part' },
  { id: 'full-body-workout', name: 'Full Body Workout', aliases: ['full body', 'full body day', 'total body workout', 'full body session'], equipment: 'none', pattern: 'general', primary: 'full_body', metric: 'session', family: 'body-part' },
];

// Words that name several exercises. They never map on their own: the user's library, the log's
// context or the user decides. Keys are normalized and singular.
export const AMBIGUOUS_WORDS: Record<string, string[]> = {
  row: ['barbell-row', 'seated-cable-row', 'dumbbell-row', 'machine-row', 't-bar-row', 'rowing-machine'],
  press: ['bench-press', 'overhead-press', 'dumbbell-bench-press', 'dumbbell-shoulder-press', 'machine-chest-press', 'leg-press'],
  'shoulder press': ['overhead-press', 'dumbbell-shoulder-press', 'machine-shoulder-press', 'smith-machine-shoulder-press'],
  'incline press': ['incline-bench-press', 'incline-dumbbell-press', 'incline-smith-machine-press', 'incline-machine-chest-press'],
  'dumbbell press': ['dumbbell-bench-press', 'dumbbell-shoulder-press'],
  curl: ['dumbbell-curl', 'barbell-curl', 'ez-bar-curl', 'cable-curl', 'hammer-curl', 'lying-leg-curl'],
  'bicep curl': ['dumbbell-curl', 'barbell-curl', 'ez-bar-curl', 'cable-curl'],
  'leg curl': ['lying-leg-curl', 'seated-leg-curl'],
  'hamstring curl': ['lying-leg-curl', 'seated-leg-curl'],
  dip: ['chest-dip', 'tricep-dip', 'bench-dip', 'assisted-dip', 'machine-dip'],
  fly: ['dumbbell-fly', 'cable-fly', 'pec-deck', 'rear-delt-fly'],
  flye: ['dumbbell-fly', 'cable-fly', 'pec-deck', 'rear-delt-fly'],
  'chest fly': ['dumbbell-fly', 'cable-fly', 'pec-deck'],
  raise: ['lateral-raise', 'front-raise', 'standing-calf-raise', 'hanging-leg-raise'],
  'leg raise': ['hanging-leg-raise', 'hanging-knee-raise', 'lying-leg-raise', 'captains-chair-leg-raise'],
  extension: ['leg-extension', 'back-extension', 'dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension', 'skull-crusher'],
  'tricep extension': ['dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension', 'skull-crusher'],
  'overhead extension': ['dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension'],
  'overhead tricep extension': ['dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension'],
  'overhead ext': ['dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension'],
  kickback: ['tricep-kickback', 'cable-glute-kickback'],
  bridge: ['glute-bridge', 'hip-thrust'],
  shrug: ['barbell-shrug', 'dumbbell-shrug', 'trap-bar-shrug'],
  lunge: ['dumbbell-lunge', 'barbell-lunge', 'bodyweight-lunge'],
  'walking lunge': ['dumbbell-lunge', 'barbell-lunge', 'bodyweight-lunge'],
  'reverse lunge': ['dumbbell-lunge', 'barbell-lunge', 'bodyweight-lunge'],
  'chest supported': ['chest-supported-row', 'chest-supported-dumbbell-row'],
  'french press': ['skull-crusher', 'dumbbell-overhead-tricep-extension', 'cable-overhead-tricep-extension'],
  'decline bench': ['decline-bench-press', 'decline-dumbbell-press'],
  'dip machine': ['machine-dip', 'assisted-dip'],
  'seated dip': ['machine-dip', 'assisted-dip'],
  'incline bench': ['incline-bench-press', 'incline-dumbbell-press', 'incline-smith-machine-press'],
  treadmill: ['running', 'walking'],
  lap: ['swimming', 'running'],
  interval: ['hiit', 'running', 'cycling', 'rowing-machine', 'air-bike'],
  cardio: ['running', 'cycling', 'elliptical', 'stair-climber', 'rowing-machine', 'walking'],
  machine: ['machine-chest-press', 'machine-shoulder-press', 'machine-row', 'leg-press'],
  football: ['soccer', 'american-football'],
  climb: ['climbing', 'stair-climber', 'rope-climb'],
  class: ['hiit', 'circuit-training', 'yoga', 'pilates', 'cycling', 'dance'],
};

// Every name in the old data/exercises.ts (and so in logs saved before ids existed) → its id.
// Names the old prompts produced from ambiguous words map to the likeliest exercise here; the
// migration re-checks those against each log's original text.
export const LEGACY_NAMES: Record<string, string> = {
  'Bench Press': 'bench-press',
  'Incline Bench Press': 'incline-bench-press',
  'Decline Bench Press': 'decline-bench-press',
  'Dumbbell Bench Press': 'dumbbell-bench-press',
  'Incline Dumbbell Press': 'incline-dumbbell-press',
  'Dumbbell Flyes': 'dumbbell-fly',
  'Cable Flyes': 'cable-fly',
  'Push-ups': 'push-up',
  'Chest Dips': 'chest-dip',
  'Machine Chest Press': 'machine-chest-press',
  'Pec Deck': 'pec-deck',
  'Deadlift': 'deadlift',
  'Pull-ups': 'pull-up',
  'Lat Pulldown': 'lat-pulldown',
  'Barbell Row': 'barbell-row',
  'Dumbbell Row': 'dumbbell-row',
  'Seated Cable Row': 'seated-cable-row',
  'T-Bar Row': 't-bar-row',
  'Face Pulls': 'face-pull',
  'Straight Arm Pulldown': 'straight-arm-pulldown',
  'Rack Pulls': 'rack-pull',
  'Shrugs': 'barbell-shrug',
  'Overhead Press': 'overhead-press',
  'Dumbbell Shoulder Press': 'dumbbell-shoulder-press',
  'Arnold Press': 'arnold-press',
  'Lateral Raises': 'lateral-raise',
  'Front Raises': 'front-raise',
  'Rear Delt Flyes': 'rear-delt-fly',
  'Upright Rows': 'upright-row',
  'Machine Shoulder Press': 'machine-shoulder-press',
  'Cable Lateral Raises': 'cable-lateral-raise',
  'Barbell Curl': 'barbell-curl',
  'Dumbbell Curl': 'dumbbell-curl',
  'Hammer Curls': 'hammer-curl',
  'Preacher Curl': 'preacher-curl',
  'Incline Dumbbell Curl': 'incline-dumbbell-curl',
  'Concentration Curl': 'concentration-curl',
  'Cable Curl': 'cable-curl',
  'EZ Bar Curl': 'ez-bar-curl',
  'Spider Curls': 'spider-curl',
  'Tricep Pushdown': 'tricep-pushdown',
  'Skull Crushers': 'skull-crusher',
  'Close Grip Bench Press': 'close-grip-bench-press',
  'Tricep Dips': 'tricep-dip',
  'Overhead Tricep Extension': 'dumbbell-overhead-tricep-extension',
  'Tricep Kickbacks': 'tricep-kickback',
  'Diamond Push-ups': 'diamond-push-up',
  'Rope Pushdown': 'tricep-pushdown',
  'Wrist Curls': 'wrist-curl',
  'Reverse Wrist Curls': 'reverse-wrist-curl',
  'Farmers Walk': 'farmers-walk',
  'Reverse Curls': 'reverse-curl',
  'Squats': 'squat',
  'Front Squat': 'front-squat',
  'Leg Press': 'leg-press',
  'Leg Extension': 'leg-extension',
  'Lunges': 'dumbbell-lunge',
  'Bulgarian Split Squat': 'bulgarian-split-squat',
  'Goblet Squat': 'goblet-squat',
  'Hack Squat': 'hack-squat',
  'Step Ups': 'step-up',
  'Sissy Squat': 'sissy-squat',
  'Romanian Deadlift': 'romanian-deadlift',
  'Leg Curl': 'lying-leg-curl',
  'Seated Leg Curl': 'seated-leg-curl',
  'Good Mornings': 'good-morning',
  'Glute Ham Raise': 'glute-ham-raise',
  'Nordic Curl': 'nordic-curl',
  'Hip Thrust': 'hip-thrust',
  'Glute Bridge': 'glute-bridge',
  'Cable Kickbacks': 'cable-glute-kickback',
  'Sumo Deadlift': 'sumo-deadlift',
  'Hip Abduction': 'hip-abduction',
  'Clamshells': 'clamshell',
  'Standing Calf Raise': 'standing-calf-raise',
  'Seated Calf Raise': 'seated-calf-raise',
  'Donkey Calf Raise': 'donkey-calf-raise',
  'Leg Press Calf Raise': 'leg-press-calf-raise',
  'Plank': 'plank',
  'Crunches': 'crunch',
  'Sit-ups': 'sit-up',
  'Hanging Leg Raise': 'hanging-leg-raise',
  'Cable Crunch': 'cable-crunch',
  'Ab Wheel Rollout': 'ab-wheel-rollout',
  'Russian Twist': 'russian-twist',
  'Mountain Climbers': 'mountain-climber',
  'Dead Bug': 'dead-bug',
  'Bird Dog': 'bird-dog',
  'Side Plank': 'side-plank',
  'Bicycle Crunches': 'bicycle-crunch',
  'Running': 'running',
  'Cycling': 'cycling',
  'Rowing': 'rowing-machine',
  'Elliptical': 'elliptical',
  'Stair Climber': 'stair-climber',
  'Jump Rope': 'jump-rope',
  'Swimming': 'swimming',
  'Walking': 'walking',
  'HIIT': 'hiit',
  'Burpees': 'burpee',
  'Box Jumps': 'box-jump',
  'Battle Ropes': 'battle-ropes',
};

export const catalogById = new Map(CATALOG.map((e) => [e.id, e]));
