import { v4 as uuidv4 } from 'uuid';
import { addDays, format, parseISO } from 'date-fns';
import { ParsedWorkoutResponse, MuscleGroup, Workout } from '../types/workout';
import { TemplateExercise } from '../types/template';
import { getExercisesByCategory } from '../data/exercises';
import { buildParseRequest, buildCorrectionRequest, finalizeParse, type ParseOptions } from '../server/src/parse';
import { buildCandidates } from '../server/src/identity';
import { yourExercises } from './exerciseIdentity';
import { useWorkoutStore } from '../stores/workoutStore';
import { draftToText } from './format';

// Server refusals the user should see (wrong app password, daily cap reached, server busy)
export class ApiError extends Error {}

// Calls Claude through our Cloudflare Worker (server/), which holds the API key and picks the model
export async function callClaude(
  system: string,
  content: string,
  maxTokens: number,
  parse?: ParseOptions & { input: string; draft?: ParsedWorkoutResponse; fix?: string }
): Promise<string> {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-app-password': process.env.EXPO_PUBLIC_APP_PASSWORD ?? '',
    },
    body: JSON.stringify({ system, messages: [{ role: 'user', content }], max_tokens: maxTokens, parse }),
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
export async function parseWorkout(input: string, options: ParseOptions): Promise<ParsedWorkoutResponse | null> {
  try {
    const { workouts, exerciseLibrary } = useWorkoutStore.getState();
    const candidates = buildCandidates(input, yourExercises(workouts, exerciseLibrary));
    const exercises = candidates.map(({ name, muscleGroup, also, yours }) => ({ name, muscleGroup, also, yours }));
    const req = buildParseRequest(input, { ...options, exercises });
    // `parse` makes the Worker build the request itself; Workers deployed before that read system/messages.
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { input, ...options, exercises });
    return finalizeParse(text, options.unit, { input, candidates, aliases: exerciseLibrary.aliases }) ?? fallbackParse(input);
  } catch (error) {
    console.error('Error parsing workout:', error);
    if (error instanceof ApiError) throw error;

    // Fallback: try simple parsing without AI
    return fallbackParse(input);
  }
}

// Applies a typed fix ("actually 3x10, not 3x8") to the draft under review and returns the whole
// updated draft, or null when the reply is unusable. Workers without correction mode parse `input`,
// the draft written back as a log plus the fix; Workers older than parse mode send system/messages.
export async function correctWorkout(draft: ParsedWorkoutResponse, fix: string, options: ParseOptions): Promise<ParsedWorkoutResponse | null> {
  const req = buildCorrectionRequest(draft, fix, options);
  const input = `${draftToText(draft.exercises, draft.notes)}\nCorrection: ${fix}`;
  try {
    const text = await callClaude(req.system, req.messages[0].content, req.max_tokens, { input, ...options, draft, fix });
    return finalizeParse(text, options.unit);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Error correcting workout:', error);
    return null;
  }
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

// Simple fallback parser when AI is unavailable
function fallbackParse(input: string): ParsedWorkoutResponse | null {
  const lowerInput = input.toLowerCase();

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
    'core': 'core',
    'ab': 'core',
    'plank': 'core',
    'cardio': 'cardio',
    'run': 'cardio',
    'bike': 'cardio',
  };

  const detectedMuscleGroups: Set<MuscleGroup> = new Set();

  for (const [keyword, group] of Object.entries(muscleGroupKeywords)) {
    if (lowerInput.includes(keyword)) {
      detectedMuscleGroups.add(group);
    }
  }

  if (detectedMuscleGroups.size === 0) {
    detectedMuscleGroups.add('full_body');
  }

  return {
    exercises: [
      {
        name: input.substring(0, 50),
        muscleGroup: Array.from(detectedMuscleGroups)[0],
      },
    ],
    muscleGroups: Array.from(detectedMuscleGroups),
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
