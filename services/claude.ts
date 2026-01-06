import Anthropic from '@anthropic-ai/sdk';
import { ParsedWorkoutResponse, MuscleGroup, Exercise } from '../types/workout';
import { getExercisesByCategory } from '../data/exercises';

// Initialize Anthropic client
const getClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
};

const SYSTEM_PROMPT = `You are a fitness tracking assistant that parses natural language workout descriptions into structured data.

Your job is to extract:
1. Exercise names (match to common exercises when possible)
2. Sets and reps (if mentioned)
3. Weight (if mentioned)
4. Muscle groups worked

Here are the exercises you should recognize, organized by muscle group:
${getExercisesByCategory()}

PARSING RULES:
- If someone says "hit chest" or "did chest", infer they did chest exercises
- Common phrases like "bench" mean "Bench Press"
- "3x10" means 3 sets of 10 reps
- "225" or "225lbs" means 225 pounds
- If no specific exercises mentioned but a muscle group is, still record the muscle group
- Be flexible with exercise names - "incline db press" = "Incline Dumbbell Press"
- If the input is unclear, do your best to extract what you can

RESPONSE FORMAT:
Respond with a JSON object only, no other text:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "muscleGroup": "chest|back|shoulders|biceps|triceps|forearms|core|quads|hamstrings|glutes|calves|cardio|full_body",
      "sets": number or null,
      "reps": number or null,
      "weight": number or null,
      "unit": "lbs" or "kg" or null,
      "duration": number or null (minutes, for cardio)
    }
  ],
  "muscleGroups": ["chest", "triceps"],
  "notes": "any additional notes or null",
  "confidence": 0.0 to 1.0
}`;

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
          content: `Parse this workout description: "${input}"`,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in response');
      return null;
    }

    // Parse JSON response
    const jsonStr = textContent.text.trim();
    const parsed = JSON.parse(jsonStr) as ParsedWorkoutResponse;

    // Validate and clean the response
    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      return null;
    }

    // Ensure muscle groups are valid
    const validMuscleGroups: MuscleGroup[] = [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'
    ];

    parsed.exercises = parsed.exercises.map((exercise) => ({
      ...exercise,
      muscleGroup: validMuscleGroups.includes(exercise.muscleGroup as MuscleGroup)
        ? exercise.muscleGroup
        : 'full_body',
    }));

    parsed.muscleGroups = parsed.muscleGroups.filter((g) =>
      validMuscleGroups.includes(g)
    );

    // Ensure unique muscle groups
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
