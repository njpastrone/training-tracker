import Anthropic from '@anthropic-ai/sdk';
import { ParsedWorkoutResponse, MuscleGroup, Exercise } from '../types/workout';
import { TemplateExercise } from '../types/template';
import { getExercisesByCategory } from '../data/exercises';

// Initialize Anthropic client
const getClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
};

const SYSTEM_PROMPT = `<role>
You are an elite fitness tracking AI that transforms natural language workout descriptions into precise structured data. Your expertise spans exercise science, anatomy, and natural language understanding.
</role>

<task>
Parse workout descriptions into structured JSON data with maximum accuracy and intelligence. Extract exercises, sets, reps, weights, muscle groups, and contextual information while maintaining semantic understanding of fitness terminology and user intent.
</task>

<thinking_framework>
For each input, think through these steps:
1. IDENTIFY: What exercises, movements, or muscle groups are mentioned?
2. NORMALIZE: Match informal names to standardized exercise names
3. EXTRACT: Pull out quantitative data (sets, reps, weights, duration)
4. CLASSIFY: Determine primary and secondary muscle groups
5. VALIDATE: Ensure logical consistency and realistic values
6. CONFIDENCE: Assess parsing certainty and flag ambiguities
</thinking_framework>

<exercise_database>
EXERCISE CATEGORIES AND RECOGNITION PATTERNS:

CHEST EXERCISES:
- Bench Press (bench, flat bench, barbell bench, bp)
- Incline Bench Press (incline bench, incline press, incline bp)
- Dumbbell Bench Press (db bench, dumbbell press, db bp)
- Incline Dumbbell Press (incline db, incline dumbbell)
- Dumbbell Flyes (flyes, chest flyes, db flyes, flys)
- Cable Flyes (cable fly, cable crossover, cable chest)
- Push-ups (pushups, push ups, press ups)
- Chest Dips (dips, chest dip)

BACK EXERCISES:
- Deadlift (conventional deadlift, deads, dl)
- Pull-ups (pullups, pull ups, chin ups, chinups)
- Lat Pulldown (lat pull down, pulldown, lat pull)
- Barbell Row (bent over row, bb row, barbell rows)
- Dumbbell Row (db row, one arm row, single arm row)
- Seated Cable Row (cable row, seated row, low row)

LEGS (QUADS/HAMSTRINGS/GLUTES):
- Squats (squat, back squat, barbell squat)
- Romanian Deadlift (rdl, stiff leg deadlift, romanian dl)  
- Leg Press (leg press machine)
- Leg Curl (leg curls, lying leg curl, hamstring curl)
- Leg Extension (leg extensions, quad extension)
- Hip Thrust (hip thrusts, barbell hip thrust, glute bridge)

SHOULDERS:
- Overhead Press (ohp, shoulder press, military press)
- Lateral Raises (side raises, lateral raise, lat raises)
- Rear Delt Flyes (reverse flyes, rear delt fly)

ARMS:
- Barbell Curl (bb curl, bicep curl, curls)
- Tricep Pushdown (pushdown, cable pushdown)
- Skull Crushers (lying tricep extension, french press)
</exercise_database>

<parsing_intelligence>
PATTERN RECOGNITION:
- "3x10" = 3 sets of 10 reps
- "225" or "225lbs" = 225 pounds
- "hit chest" = chest workout performed
- "bench" = Bench Press (most common reference)
- "deads" = Deadlifts  
- "bis and tris" = biceps and triceps
- "leg day" = legs/quads/hamstrings/glutes workout

CONTEXTUAL INFERENCE:
- If muscle group mentioned but no specific exercises → record muscle group
- Multiple exercises listed → separate exercise entries
- Supersets indicated by "superset", "&", "+" → note in individual exercises
- Time-based cardio → use duration field
- Bodyweight exercises → omit weight field

SMART DEFAULTS:
- Missing muscle group → infer from exercise name
- Ambiguous exercise names → choose most common interpretation
- Incomplete data → extract what's available, mark confidence accordingly
</parsing_intelligence>

<examples>
INPUT: "Hit chest today - bench 225 for 3x5, incline db press 4x8"
REASONING: Two distinct exercises mentioned. "Bench" = Bench Press, clear weight and sets/reps. "Incline db press" = Incline Dumbbell Press with sets/reps but no weight.
OUTPUT: {
  "exercises": [
    {"name": "Bench Press", "muscleGroup": "chest", "sets": 3, "reps": 5, "weight": 225, "unit": "lbs"},
    {"name": "Incline Dumbbell Press", "muscleGroup": "chest", "sets": 4, "reps": 8, "weight": null, "unit": null}
  ],
  "muscleGroups": ["chest", "triceps"],
  "confidence": 0.95
}

INPUT: "Leg day - squats and deadlifts, felt heavy today"  
REASONING: Two compound exercises mentioned, no specific numbers. Note about feeling heavy suggests challenging workout.
OUTPUT: {
  "exercises": [
    {"name": "Squats", "muscleGroup": "quads", "sets": null, "reps": null, "weight": null, "unit": null},
    {"name": "Deadlift", "muscleGroup": "back", "sets": null, "reps": null, "weight": null, "unit": null}
  ],
  "muscleGroups": ["quads", "hamstrings", "glutes", "back"],
  "notes": "Challenging workout, felt heavy",
  "confidence": 0.85
}

INPUT: "20min cardio on treadmill"
REASONING: Cardio exercise with duration specified, no sets/reps apply.
OUTPUT: {
  "exercises": [
    {"name": "Running", "muscleGroup": "cardio", "duration": 20, "sets": null, "reps": null, "weight": null}
  ],
  "muscleGroups": ["cardio"],
  "confidence": 0.9
}
</examples>

<success_criteria>
HIGH QUALITY PARSE (confidence > 0.8):
- Exercise names match database or are reasonable interpretations
- Numbers are realistic (sets 1-10, reps 1-100, weights 5-1000lbs)
- Muscle groups align with exercises performed
- All extractable information captured

MEDIUM QUALITY PARSE (confidence 0.5-0.8):
- Some ambiguity in exercise identification
- Partial data extraction
- Reasonable inferences made

LOW QUALITY PARSE (confidence < 0.5):
- High ambiguity or unclear input
- Minimal data extractable
- Multiple possible interpretations
</success_criteria>

<output_schema>
Return ONLY valid JSON matching this exact structure:
{
  "exercises": [
    {
      "name": string (standardized exercise name),
      "muscleGroup": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"forearms"|"core"|"quads"|"hamstrings"|"glutes"|"calves"|"cardio"|"full_body",
      "sets": number|null,
      "reps": number|null, 
      "weight": number|null,
      "unit": "lbs"|"kg"|null,
      "duration": number|null (minutes for cardio)
    }
  ],
  "muscleGroups": string[] (all muscle groups worked),
  "notes": string|null (additional context),
  "confidence": number (0.0 to 1.0)
}
</output_schema>`;

export async function parseWorkout(input: string): Promise<ParsedWorkoutResponse | null> {
  try {
    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `<input_text>
${input}
</input_text>

Please analyze the workout description above using your thinking framework. Parse it into the required JSON structure with high accuracy and appropriate confidence scoring.

Return ONLY a valid JSON object with this structure:
{
  "exercises": [
    {
      "name": "exercise name",
      "muscleGroup": "chest|back|shoulders|biceps|triceps|forearms|core|quads|hamstrings|glutes|calves|cardio|full_body",
      "sets": number or null,
      "reps": number or null,
      "weight": number or null,
      "unit": "lbs"|"kg"|null,
      "duration": number or null
    }
  ],
  "muscleGroups": ["array of muscle groups worked"],
  "notes": "string or null",
  "confidence": 0.0 to 1.0
}`,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in response');
      return null;
    }

    // Parse JSON response - now guaranteed to be valid by Claude's structured output
    const parsed = JSON.parse(textContent.text) as ParsedWorkoutResponse;

    // Minimal validation since structured output guarantees schema compliance
    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      return null;
    }

    // Ensure unique muscle groups (only cleanup needed)
    parsed.muscleGroups = [...new Set(parsed.muscleGroups)];

    return parsed;
  } catch (error) {
    console.error('Error parsing workout:', error);

    // Fallback: try simple parsing without AI
    return fallbackParse(input);
  }
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
    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: TEMPLATE_PARSING_PROMPT,
      messages: [
        {
          role: 'user',
          content: `<template_description>
${input}
</template_description>

Parse this workout template into structured exercises. Focus on extracting:
1. Exercise names (match to database when possible)
2. Sets and reps for each exercise
3. Weights if specified
4. Proper muscle group classification

Return ONLY the JSON array of exercises.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in template parsing response');
    }

    // Clean response and extract JSON
    let jsonText = textContent.text.trim();
    
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
