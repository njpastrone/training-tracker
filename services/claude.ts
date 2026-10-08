import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, parseISO } from 'date-fns';
import { ParsedWorkoutResponse, MuscleGroup, Workout } from '../types/workout';
import { TemplateExercise } from '../types/template';
import { getExercisesByCategory } from '../data/exercises';
import { buildParseRequest, buildCorrectionRequest, finalizeParse, finalizeWithNames, type ParseOptions } from '../server/src/parse';
import { buildFoodCorrectionRequest, buildFoodRequest, readFoodItems, type DraftFoodForModel } from '../server/src/food';
import { FoodDraft } from '../types/food';
import { buildFoodCandidates, candidateNames, localFoodParse, mentionsFood, mentionsWorkout, resolveItems, splitLog, usualPortions } from './foods';
import { foodById } from '../data/foods';
import { buildCandidates } from '../server/src/identity';
import { offersName, yourExercises } from './exerciseIdentity';
import { useWorkoutStore } from '../stores/workoutStore';
import { draftToText } from './format';
import { flagGuesses, keepIdentity } from './draft';
import { hasAiConsent } from './aiConsent';

// Server refusals the user should see (wrong app password, daily cap reached, server busy)
export class ApiError extends Error {}

const INSTALL_ID_STORAGE_KEY = '@training-tracker/install-id';
let installId: Promise<string> | undefined;

// A random id made once per install and kept on the phone, so the Worker can cap each device's daily
// AI requests. It is not tied to who you are.
function getInstallId(): Promise<string> {
  installId ??= AsyncStorage.getItem(INSTALL_ID_STORAGE_KEY).then(async (saved) => {
    if (saved) return saved;
    const id = uuidv4();
    await AsyncStorage.setItem(INSTALL_ID_STORAGE_KEY, id);
    return id;
  }).catch(() => uuidv4()); // storage failing must not block AI requests; the id then lasts this session
  return installId;
}

// The user hasn't agreed to send their words to Anthropic, so nothing was sent
export class AiOffError extends ApiError {
  constructor() {
    super('AI is off. Turn it on in Settings to use this.');
  }
}

// Calls Claude through our Cloudflare Worker (server/), which holds the API key and picks the model.
// `mode` asks the Worker to build the prompt itself (parse or food); Workers deployed before a mode
// existed ignore it and send system/messages, so a new mode works before the Worker is redeployed.
export async function callClaude(
  system: string,
  content: string,
  maxTokens: number,
  mode?: { parse: ParseOptions & { input: string; draft?: ParsedWorkoutResponse; fix?: string } } | { food: Record<string, unknown> }
): Promise<string> {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  if (!(await hasAiConsent())) throw new AiOffError();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-app-password': process.env.EXPO_PUBLIC_APP_PASSWORD ?? '',
      'x-install-id': await getInstallId(),
    },
    body: JSON.stringify({ system, messages: [{ role: 'user', content }], max_tokens: maxTokens, ...mode }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 429 || res.status === 503) {
    throw new ApiError(data.error ?? 'AI request refused by the server.');
  }
  if (!res.ok || typeof data.text !== 'string') {
    throw new Error(data.error ?? `AI server error (${res.status})`);
  }
  return data.text;
}

// Parses a free-text log. options.date is the day being logged; dayOffset on each exercise
// says how many days before it the exercise was done.
// Every exercise comes back with an exerciseId and match, picked by the model from the user's own
// exercises and the catalog entries the log mentions, then checked in code (server/src/identity.ts).
// fallbackText: what the no-AI parser reads if AI is off or fails (the workout part of a mixed message)
export async function parseWorkout(input: string, options: ParseOptions, fallbackText = input): Promise<ParsedWorkoutResponse | null> {
  try {
    const { workouts, exerciseLibrary } = useWorkoutStore.getState();
    const candidates = buildCandidates(input, yourExercises(workouts, exerciseLibrary));
    const exercises = candidates.map(({ name, muscleGroup, also, yours }) => ({ name, muscleGroup, also, yours }));
    const req = buildParseRequest(input, { ...options, exercises });
    // `parse` makes the Worker build the request itself; Workers deployed before that read system/messages.
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { parse: { input, ...options, exercises } });
    const parsed = finalizeParse(text, options.unit, { input, candidates, aliases: exerciseLibrary.aliases });
    return parsed ? flagGuesses(parsed, input) : fallbackParse(fallbackText);
  } catch (error) {
    // With AI off the log still works by hand: each line or comma becomes an exercise to fill in
    if (error instanceof AiOffError) return fallbackParse(fallbackText);
    console.error('Error parsing workout:', error);
    if (error instanceof ApiError) throw error;

    // Fallback: try simple parsing without AI
    return fallbackParse(fallbackText);
  }
}

// What a typed fix came back with: the whole updated draft, the answer when the fix asked a question,
// and the user's own words for an exercise when the question showed they call it something else
export interface Correction {
  draft: ParsedWorkoutResponse;
  reply?: string;
  callIt?: { exerciseId: string; words: string };
}

// Applies a typed fix ("actually 3x10, not 3x8") or answers a question about the draft ("is pec deck
// machine flys?"), or null when the reply is unusable. A question alone keeps the draft as it was.
// Workers without correction mode parse `input`, the draft written back as a log plus the fix;
// Workers older than parse mode send system/messages. Neither replies.
export async function correctWorkout(draft: ParsedWorkoutResponse, fix: string, options: ParseOptions): Promise<Correction | null> {
  const input = `${draftToText(draft.exercises, draft.notes)}\nCorrection: ${fix}`;
  try {
    // The model picks from the exercises the draft and the fix name, as in a parse
    const { workouts, exerciseLibrary } = useWorkoutStore.getState();
    const candidates = buildCandidates(input, yourExercises(workouts, exerciseLibrary));
    const exercises = candidates.map(({ name, muscleGroup, also, yours }) => ({ name, muscleGroup, also, yours }));
    const req = buildCorrectionRequest(draft, fix, { ...options, exercises });
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { parse: { input, ...options, exercises, draft, fix } });
    const updated = finalizeWithNames(text, options.unit, { input, candidates, aliases: exerciseLibrary.aliases });
    if (!updated) return null;
    const { reply, callIt } = updated;
    // A question can come back as "not a workout"; it never empties the draft
    const next = reply && updated.parsed.exercises.length === 0 ? draft : keepIdentity(draft, updated.parsed, updated.names);
    const exerciseId = callIt && next.exercises[callIt.exercise]?.exerciseId;
    return { draft: next, reply, ...(exerciseId && offersName(callIt.words, exerciseId, fix, exerciseLibrary) ? { callIt: { exerciseId, words: callIt.words } } : {}) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Error correcting workout:', error);
    return null;
  }
}

// Parses what the user ate. The model picks foods from the table entries the log mentions and says
// how much; the app computes USDA macros (services/foods.ts). Branded, restaurant and homemade food
// comes back as the model's estimate. With AI off or unreachable, the on-phone parser reads it.
export async function parseFood(input: string, date: string, fallbackText = input): Promise<FoodDraft> {
  const usual = usualPortions(useWorkoutStore.getState().foodEntries);
  try {
    const candidates = buildFoodCandidates(input);
    const foods = candidateNames(input, candidates);
    const req = buildFoodRequest(input, { date, foods });
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { food: { input, date, foods } });
    const read = readFoodItems(text, candidates.length);
    return read ? { items: resolveItems(read.items, candidates, usual), confidence: read.confidence } : localFoodParse(fallbackText, usual);
  } catch (error) {
    if (error instanceof AiOffError) return localFoodParse(fallbackText, usual);
    console.error('Error parsing food:', error);
    if (error instanceof ApiError) throw error;
    return localFoodParse(fallbackText, usual);
  }
}

// Applies a typed fix to a food draft ("it was 3 eggs", "drop the toast") or answers a question
// about it; null when the reply is unusable
export async function correctFood(draft: FoodDraft, fix: string, date: string): Promise<{ draft: FoodDraft; reply?: string } | null> {
  try {
    // The draft's own foods come first, so their keys stay put; then whatever the fix mentions
    const own = draft.items.flatMap((i) => (i.foodId && foodById.get(i.foodId) ? [foodById.get(i.foodId)!] : []));
    const candidates = [...new Map([...own, ...buildFoodCandidates(fix)].map((f) => [f.id, f])).values()].slice(0, 80);
    const foods = candidateNames(fix, candidates);
    const items: DraftFoodForModel[] = draft.items.map((i) => {
      const k = i.foodId ? candidates.findIndex((f) => f.id === i.foodId) : -1;
      return {
        food: k >= 0 ? `f${k + 1}` : null, said: i.said, name: i.name, qty: i.qty, unit: i.unit, grams: i.grams, dayOffset: i.dayOffset,
        ...(k >= 0 ? {} : { kcal: i.macros.kcal, protein: i.macros.protein, carbs: i.macros.carbs, fat: i.macros.fat }),
      };
    });
    const req = buildFoodCorrectionRequest(items, fix, { date, foods });
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { food: { input: fix, date, foods, draft: { items }, fix } });
    const read = readFoodItems(text, candidates.length);
    if (!read) return null;
    // A question can come back with no items; it never empties the draft
    const usual = usualPortions(useWorkoutStore.getState().foodEntries);
    const next = read.reply && read.items.length === 0 ? draft : { items: resolveItems(read.items, candidates, usual), confidence: read.confidence };
    return { draft: next, ...(read.reply ? { reply: read.reply } : {}) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Error correcting food:', error);
    return null;
  }
}

// One message can hold a workout, food, or both ("did legs, squat 3x5 at 225, then ate 2 eggs and
// toast"). Each parser reads the whole message and ignores the other's part. Food words send it to
// the food parser, workout words (or no food words) to the workout parser, both at once when both
// show; if the parsers that ran find nothing, the other one gets a try. With AI on, every food log
// goes to the AI, grounded in the USDA table (evals/food: reading plain logs on the phone first saved
// little on realistic messages and was no more accurate). Without AI, each comma or line goes to
// whichever side it reads as and food is read on the phone.
export async function parseLog(input: string, options: ParseOptions): Promise<{ workout: ParsedWorkoutResponse | null; food: FoodDraft | null }> {
  const food = mentionsFood(input);
  const workout = !food || mentionsWorkout(input);
  const parts = splitLog(input);
  if (!(await hasAiConsent())) {
    const usual = usualPortions(useWorkoutStore.getState().foodEntries);
    return { workout: parts.workout ? fallbackParse(parts.workout) : null, food: parts.food ? localFoodParse(parts.food, usual) : null };
  }
  const has = <T,>(r: T | null, list: (r: T) => unknown[]) => (r && list(r).length ? r : null);
  // When both run and AI fails, each side's no-AI fallback reads only its own part
  const run = (w: boolean, f: boolean) =>
    Promise.all([
      w ? parseWorkout(input, options, f ? parts.workout || input : input) : null,
      f ? parseFood(input, options.date, w ? parts.food || input : input) : null,
    ])
      .then(([wr, fr]) => ({ workout: has(wr, (r) => r.exercises), food: has(fr, (r) => r.items) }));
  const first = await run(workout, food);
  if (first.workout || first.food || (workout && food)) return first;
  return run(!workout, !food);
}

// One workout per day the log covers, dated relative to baseDate (YYYY-MM-DD).
export function workoutsFromParse(parsed: ParsedWorkoutResponse, rawInput: string, baseDate: string, templateId?: string): Workout[] {
  const offsets = [...new Set(parsed.exercises.map((e) => e.dayOffset ?? 0))].sort((a, b) => a - b);
  const latest = offsets[offsets.length - 1];
  return offsets.map((offset) => {
    const exercises = parsed.exercises
      .filter((e) => (e.dayOffset ?? 0) === offset)
      .map(({ dayOffset, ...e }) => ({ ...e, id: uuidv4() }));
    return {
      id: uuidv4(),
      date: format(addDays(parseISO(baseDate), offset), 'yyyy-MM-dd'),
      exercises,
      rawInput,
      // ponytail: workout-level muscle groups and notes go to the latest day; split them per day if multi-day logs with notes get common
      muscleGroups: offsets.length === 1 ? parsed.muscleGroups : [...new Set(exercises.map((e) => e.muscleGroup))],
      notes: offset === latest ? parsed.notes : undefined,
      createdAt: new Date().toISOString(),
      templateId,
    };
  });
}

// Detect muscle groups from keywords
const muscleGroupKeywords: Record<string, MuscleGroup> = {
  'chest': 'chest',
  'bench': 'chest',
  'back': 'back',
  'pull': 'back',
  'row': 'back',
  'shoulder': 'shoulders',
  'ohp': 'shoulders',
  'press': 'shoulders',
  'bicep': 'biceps',
  'curl': 'biceps',
  'leg curl': 'hamstrings',
  'leg press': 'quads',
  'tricep': 'triceps',
  'pushdown': 'triceps',
  'leg': 'quads',
  'squat': 'quads',
  'quad': 'quads',
  'hamstring': 'hamstrings',
  'deadlift': 'hamstrings',
  'glute': 'glutes',
  'hip thrust': 'glutes',
  'calf': 'calves',
  'calves': 'calves',
  'core': 'core',
  'ab': 'core',
  'plank': 'core',
  'crunch': 'core',
  'cardio': 'cardio',
  'run': 'cardio',
  'bike': 'cardio',
};

const keywordsLongestFirst = Object.keys(muscleGroupKeywords).sort((a, b) => b.length - a.length);

// Simple fallback parser when AI is off or unavailable: one exercise per line or comma, numbers filled in by hand
function fallbackParse(input: string): ParsedWorkoutResponse | null {
  const exercises = input
    .split(/[,\n]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const lower = part.toLowerCase();
      const keyword = keywordsLongestFirst.find(k => new RegExp(`\\b${k}`).test(lower));
      return { name: part.substring(0, 50), muscleGroup: keyword ? muscleGroupKeywords[keyword] : 'full_body' as MuscleGroup };
    });

  return {
    exercises,
    muscleGroups: [...new Set(exercises.map(e => e.muscleGroup))],
    confidence: 0.3,
  };
}

const TEMPLATE_PARSING_PROMPT = `<role>
You are a fitness template parser that converts natural language workout descriptions into structured exercise templates. Your expertise includes understanding various workout notations and exercise variations.
</role>

<task>
Parse workout template descriptions into structured exercise data. Extract exercise names, sets, reps, and optional weights from various notation styles.
</task>

<exercise_database>
${getExercisesByCategory()}
</exercise_database>

<parsing_patterns>
Common notations to recognize:
- "5x5" or "5 x 5" = 5 sets of 5 reps
- "3x8-12" = 3 sets of 8-12 reps (range)
- "4 sets of 10" = 4 sets of 10 reps
- "@225" or "225lbs" or "100kg" = weight specification
- "3x10@135" = 3 sets of 10 reps at 135 lbs
- Exercise names can be abbreviated (bench = bench press, OHP = overhead press)
</parsing_patterns>

<output_format>
Return ONLY a valid JSON array of exercise objects:
[
  {
    "name": "Exercise Name",
    "muscleGroup": "chest|back|shoulders|biceps|triceps|forearms|core|quads|hamstrings|glutes|calves|cardio|full_body",
    "sets": 3,
    "reps": "10", // can be number or range like "8-12"
    "weight": 135, // optional, in lbs unless kg specified
    "weightUnit": "lbs", // or "kg"
    "notes": null // optional notes
  }
]
</output_format>`;

export async function parseTemplateFromNL(input: string): Promise<TemplateExercise[]> {
  try {
    const text = await callClaude(TEMPLATE_PARSING_PROMPT, `<template_description>
${input}
</template_description>

Parse this workout template into structured exercises. Focus on extracting:
1. Exercise names (match to database when possible)
2. Sets and reps for each exercise
3. Weights if specified
4. Proper muscle group classification

Return ONLY the JSON array of exercises.`, 1024);

    // Clean response and extract JSON
    let jsonText = text.trim();
    
    // Find the JSON array boundaries
    const jsonStart = jsonText.indexOf('[');
    const jsonEnd = jsonText.lastIndexOf(']');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    const exercises: TemplateExercise[] = JSON.parse(jsonText);
    
    // Validate and clean the exercises
    return exercises.map(exercise => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: Number(exercise.sets) || 3,
      reps: exercise.reps || "10",
      weight: exercise.weight ? Number(exercise.weight) : undefined,
      weightUnit: exercise.weightUnit || 'lbs',
      notes: exercise.notes || undefined,
    }));

  } catch (error) {
    console.error('Error parsing template from NL:', error);
    if (error instanceof ApiError) throw error;
    
    // Fallback to basic parsing
    return parseTemplateBasic(input);
  }
}

// Basic template parsing without AI
function parseTemplateBasic(input: string): TemplateExercise[] {
  const exercises: TemplateExercise[] = [];
  const lines = input.split(/[,\n]+/).map(line => line.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Try to extract sets x reps pattern
    const setsRepsMatch = line.match(/(\d+)\s*[xX×]\s*(\d+(?:-\d+)?)/);
    const weightMatch = line.match(/@?\s*(\d+)\s*(lbs?|kg)?/i);
    
    // Extract exercise name (everything before the numbers)
    let exerciseName = line;
    if (setsRepsMatch) {
      exerciseName = line.substring(0, line.indexOf(setsRepsMatch[0])).trim();
    }
    
    if (!exerciseName) continue;
    
    // Try to determine muscle group
    const muscleGroup = detectMuscleGroupFromExercise(exerciseName);
    
    exercises.push({
      name: exerciseName,
      muscleGroup,
      sets: setsRepsMatch ? parseInt(setsRepsMatch[1]) : 3,
      reps: setsRepsMatch ? setsRepsMatch[2] : "10",
      weight: weightMatch ? parseInt(weightMatch[1]) : undefined,
      weightUnit: weightMatch && weightMatch[2]?.toLowerCase().includes('kg') ? 'kg' : 'lbs',
    });
  }
  
  return exercises;
}

function detectMuscleGroupFromExercise(exerciseName: string): MuscleGroup {
  const lower = exerciseName.toLowerCase();
  
  if (lower.includes('bench') || lower.includes('chest') || lower.includes('fly')) return 'chest';
  if (lower.includes('squat') || lower.includes('quad') || lower.includes('leg press')) return 'quads';
  if (lower.includes('deadlift') || lower.includes('rdl') || lower.includes('hamstring')) return 'hamstrings';
  if (lower.includes('row') || lower.includes('pull') || lower.includes('lat')) return 'back';
  if (lower.includes('press') && !lower.includes('bench') && !lower.includes('leg')) return 'shoulders';
  if (lower.includes('curl') || lower.includes('bicep')) return 'biceps';
  if (lower.includes('tricep') || lower.includes('dip') || lower.includes('pushdown')) return 'triceps';
  if (lower.includes('calf') || lower.includes('raise')) return 'calves';
  if (lower.includes('ab') || lower.includes('plank') || lower.includes('core')) return 'core';
  if (lower.includes('glute') || lower.includes('hip thrust')) return 'glutes';
  
  return 'full_body';
}
