import { ExerciseReference } from '../types/workout';

export const exercises: ExerciseReference[] = [
  // CHEST
  { name: 'Bench Press', aliases: ['bench', 'flat bench', 'barbell bench'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], isCompound: true, equipment: ['barbell', 'bench'] },
  { name: 'Incline Bench Press', aliases: ['incline bench', 'incline press'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], isCompound: true, equipment: ['barbell', 'bench'] },
  { name: 'Decline Bench Press', aliases: ['decline bench', 'decline press'], muscleGroup: 'chest', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['barbell', 'bench'] },
  { name: 'Dumbbell Bench Press', aliases: ['db bench', 'dumbbell press'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], isCompound: true, equipment: ['dumbbells', 'bench'] },
  { name: 'Incline Dumbbell Press', aliases: ['incline db press', 'incline dumbbell'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], isCompound: true, equipment: ['dumbbells', 'bench'] },
  { name: 'Dumbbell Flyes', aliases: ['flyes', 'chest flyes', 'db flyes', 'flys'], muscleGroup: 'chest', isCompound: false, equipment: ['dumbbells', 'bench'] },
  { name: 'Cable Flyes', aliases: ['cable fly', 'cable crossover', 'cable chest'], muscleGroup: 'chest', isCompound: false, equipment: ['cable machine'] },
  { name: 'Push-ups', aliases: ['pushups', 'push ups', 'press ups'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders', 'core'], isCompound: true, equipment: [] },
  { name: 'Chest Dips', aliases: ['dips', 'chest dip'], muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], isCompound: true, equipment: ['dip bars'] },
  { name: 'Machine Chest Press', aliases: ['chest press machine', 'seated chest press'], muscleGroup: 'chest', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['machine'] },
  { name: 'Pec Deck', aliases: ['pec fly machine', 'butterfly'], muscleGroup: 'chest', isCompound: false, equipment: ['machine'] },

  // BACK
  { name: 'Deadlift', aliases: ['conventional deadlift', 'deads'], muscleGroup: 'back', secondaryMuscles: ['hamstrings', 'glutes', 'core'], isCompound: true, equipment: ['barbell'] },
  { name: 'Pull-ups', aliases: ['pullups', 'pull ups', 'chin ups', 'chinups'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['pull-up bar'] },
  { name: 'Lat Pulldown', aliases: ['lat pull down', 'pulldown', 'lat pull'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['cable machine'] },
  { name: 'Barbell Row', aliases: ['bent over row', 'bb row', 'barbell rows'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['barbell'] },
  { name: 'Dumbbell Row', aliases: ['db row', 'one arm row', 'single arm row'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['dumbbells'] },
  { name: 'Seated Cable Row', aliases: ['cable row', 'seated row', 'low row'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['cable machine'] },
  { name: 'T-Bar Row', aliases: ['t bar row', 'landmine row'], muscleGroup: 'back', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['t-bar', 'barbell'] },
  { name: 'Face Pulls', aliases: ['face pull', 'rear delt pull'], muscleGroup: 'back', secondaryMuscles: ['shoulders'], isCompound: false, equipment: ['cable machine'] },
  { name: 'Straight Arm Pulldown', aliases: ['straight arm lat pulldown'], muscleGroup: 'back', isCompound: false, equipment: ['cable machine'] },
  { name: 'Rack Pulls', aliases: ['rack pull', 'block pulls'], muscleGroup: 'back', secondaryMuscles: ['glutes'], isCompound: true, equipment: ['barbell', 'rack'] },
  { name: 'Shrugs', aliases: ['barbell shrugs', 'dumbbell shrugs', 'trap shrugs'], muscleGroup: 'back', isCompound: false, equipment: ['barbell', 'dumbbells'] },

  // SHOULDERS
  { name: 'Overhead Press', aliases: ['ohp', 'shoulder press', 'military press', 'strict press'], muscleGroup: 'shoulders', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['barbell'] },
  { name: 'Dumbbell Shoulder Press', aliases: ['db shoulder press', 'seated shoulder press', 'db ohp'], muscleGroup: 'shoulders', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['dumbbells'] },
  { name: 'Arnold Press', aliases: ['arnold dumbbell press'], muscleGroup: 'shoulders', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['dumbbells'] },
  { name: 'Lateral Raises', aliases: ['side raises', 'lateral raise', 'side laterals', 'lat raises'], muscleGroup: 'shoulders', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Front Raises', aliases: ['front raise', 'front delt raise'], muscleGroup: 'shoulders', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Rear Delt Flyes', aliases: ['reverse flyes', 'rear delt fly', 'bent over laterals'], muscleGroup: 'shoulders', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Upright Rows', aliases: ['upright row'], muscleGroup: 'shoulders', secondaryMuscles: ['biceps'], isCompound: true, equipment: ['barbell', 'dumbbells'] },
  { name: 'Machine Shoulder Press', aliases: ['shoulder press machine'], muscleGroup: 'shoulders', secondaryMuscles: ['triceps'], isCompound: true, equipment: ['machine'] },
  { name: 'Cable Lateral Raises', aliases: ['cable side raises'], muscleGroup: 'shoulders', isCompound: false, equipment: ['cable machine'] },

  // BICEPS
  { name: 'Barbell Curl', aliases: ['bb curl', 'standing curl', 'bicep curl'], muscleGroup: 'biceps', isCompound: false, equipment: ['barbell'] },
  { name: 'Dumbbell Curl', aliases: ['db curl', 'bicep curls', 'curls'], muscleGroup: 'biceps', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Hammer Curls', aliases: ['hammer curl', 'neutral grip curl'], muscleGroup: 'biceps', secondaryMuscles: ['forearms'], isCompound: false, equipment: ['dumbbells'] },
  { name: 'Preacher Curl', aliases: ['preacher curls', 'scott curl'], muscleGroup: 'biceps', isCompound: false, equipment: ['barbell', 'bench'] },
  { name: 'Incline Dumbbell Curl', aliases: ['incline curl', 'incline bicep curl'], muscleGroup: 'biceps', isCompound: false, equipment: ['dumbbells', 'bench'] },
  { name: 'Concentration Curl', aliases: ['concentration curls'], muscleGroup: 'biceps', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Cable Curl', aliases: ['cable curls', 'cable bicep curl'], muscleGroup: 'biceps', isCompound: false, equipment: ['cable machine'] },
  { name: 'EZ Bar Curl', aliases: ['ez curl', 'ez bar curls'], muscleGroup: 'biceps', isCompound: false, equipment: ['ez bar'] },
  { name: 'Spider Curls', aliases: ['spider curl'], muscleGroup: 'biceps', isCompound: false, equipment: ['bench', 'dumbbells'] },

  // TRICEPS
  { name: 'Tricep Pushdown', aliases: ['pushdown', 'cable pushdown', 'tricep pressdown'], muscleGroup: 'triceps', isCompound: false, equipment: ['cable machine'] },
  { name: 'Skull Crushers', aliases: ['lying tricep extension', 'french press', 'nose breakers'], muscleGroup: 'triceps', isCompound: false, equipment: ['barbell', 'bench'] },
  { name: 'Close Grip Bench Press', aliases: ['close grip bench', 'cgbp'], muscleGroup: 'triceps', secondaryMuscles: ['chest'], isCompound: true, equipment: ['barbell', 'bench'] },
  { name: 'Tricep Dips', aliases: ['bench dips', 'tricep dip'], muscleGroup: 'triceps', isCompound: true, equipment: ['bench', 'dip bars'] },
  { name: 'Overhead Tricep Extension', aliases: ['tricep extension', 'french press'], muscleGroup: 'triceps', isCompound: false, equipment: ['dumbbells', 'cable machine'] },
  { name: 'Tricep Kickbacks', aliases: ['kickbacks', 'tricep kickback'], muscleGroup: 'triceps', isCompound: false, equipment: ['dumbbells'] },
  { name: 'Diamond Push-ups', aliases: ['diamond pushups', 'close grip pushups'], muscleGroup: 'triceps', secondaryMuscles: ['chest'], isCompound: true, equipment: [] },
  { name: 'Rope Pushdown', aliases: ['rope tricep pushdown', 'rope extension'], muscleGroup: 'triceps', isCompound: false, equipment: ['cable machine'] },

  // FOREARMS
  { name: 'Wrist Curls', aliases: ['wrist curl', 'forearm curls'], muscleGroup: 'forearms', isCompound: false, equipment: ['barbell', 'dumbbells'] },
  { name: 'Reverse Wrist Curls', aliases: ['reverse wrist curl'], muscleGroup: 'forearms', isCompound: false, equipment: ['barbell', 'dumbbells'] },
  { name: 'Farmers Walk', aliases: ['farmers carry', 'farmer walks'], muscleGroup: 'forearms', secondaryMuscles: ['core'], isCompound: true, equipment: ['dumbbells'] },
  { name: 'Reverse Curls', aliases: ['reverse curl', 'reverse grip curl'], muscleGroup: 'forearms', isCompound: false, equipment: ['barbell', 'dumbbells'] },

  // QUADS
  { name: 'Squats', aliases: ['squat', 'back squat', 'barbell squat'], muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings', 'core'], isCompound: true, equipment: ['barbell', 'rack'] },
  { name: 'Front Squat', aliases: ['front squats'], muscleGroup: 'quads', secondaryMuscles: ['glutes', 'core'], isCompound: true, equipment: ['barbell', 'rack'] },
  { name: 'Leg Press', aliases: ['leg press machine'], muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], isCompound: true, equipment: ['machine'] },
  { name: 'Leg Extension', aliases: ['leg extensions', 'quad extension'], muscleGroup: 'quads', isCompound: false, equipment: ['machine'] },
  { name: 'Lunges', aliases: ['lunge', 'walking lunges', 'forward lunges'], muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], isCompound: true, equipment: ['dumbbells'] },
  { name: 'Bulgarian Split Squat', aliases: ['split squat', 'rear foot elevated split squat'], muscleGroup: 'quads', secondaryMuscles: ['glutes'], isCompound: true, equipment: ['dumbbells', 'bench'] },
  { name: 'Goblet Squat', aliases: ['goblet squats'], muscleGroup: 'quads', secondaryMuscles: ['glutes', 'core'], isCompound: true, equipment: ['dumbbell', 'kettlebell'] },
  { name: 'Hack Squat', aliases: ['hack squats', 'hack squat machine'], muscleGroup: 'quads', secondaryMuscles: ['glutes'], isCompound: true, equipment: ['machine'] },
  { name: 'Step Ups', aliases: ['step up', 'box step ups'], muscleGroup: 'quads', secondaryMuscles: ['glutes'], isCompound: true, equipment: ['box', 'dumbbells'] },
  { name: 'Sissy Squat', aliases: ['sissy squats'], muscleGroup: 'quads', isCompound: false, equipment: [] },

  // HAMSTRINGS
  { name: 'Romanian Deadlift', aliases: ['rdl', 'stiff leg deadlift', 'romanian dl'], muscleGroup: 'hamstrings', secondaryMuscles: ['glutes', 'back'], isCompound: true, equipment: ['barbell', 'dumbbells'] },
  { name: 'Leg Curl', aliases: ['leg curls', 'lying leg curl', 'hamstring curl'], muscleGroup: 'hamstrings', isCompound: false, equipment: ['machine'] },
  { name: 'Seated Leg Curl', aliases: ['seated hamstring curl'], muscleGroup: 'hamstrings', isCompound: false, equipment: ['machine'] },
  { name: 'Good Mornings', aliases: ['good morning'], muscleGroup: 'hamstrings', secondaryMuscles: ['back', 'glutes'], isCompound: true, equipment: ['barbell'] },
  { name: 'Glute Ham Raise', aliases: ['ghr', 'glute ham raises'], muscleGroup: 'hamstrings', secondaryMuscles: ['glutes'], isCompound: true, equipment: ['ghr machine'] },
  { name: 'Nordic Curl', aliases: ['nordic curls', 'nordic hamstring curl'], muscleGroup: 'hamstrings', isCompound: false, equipment: [] },

  // GLUTES
  { name: 'Hip Thrust', aliases: ['hip thrusts', 'barbell hip thrust', 'glute bridge'], muscleGroup: 'glutes', secondaryMuscles: ['hamstrings'], isCompound: true, equipment: ['barbell', 'bench'] },
  { name: 'Glute Bridge', aliases: ['glute bridges', 'bridge'], muscleGroup: 'glutes', secondaryMuscles: ['hamstrings'], isCompound: false, equipment: [] },
  { name: 'Cable Kickbacks', aliases: ['glute kickback', 'cable glute kickback'], muscleGroup: 'glutes', isCompound: false, equipment: ['cable machine'] },
  { name: 'Sumo Deadlift', aliases: ['sumo dl', 'sumo deads'], muscleGroup: 'glutes', secondaryMuscles: ['hamstrings', 'back', 'quads'], isCompound: true, equipment: ['barbell'] },
  { name: 'Hip Abduction', aliases: ['hip abductor', 'abductor machine'], muscleGroup: 'glutes', isCompound: false, equipment: ['machine'] },
  { name: 'Clamshells', aliases: ['clamshell', 'clam shells'], muscleGroup: 'glutes', isCompound: false, equipment: ['band'] },

  // CALVES
  { name: 'Standing Calf Raise', aliases: ['calf raises', 'calf raise', 'standing calf'], muscleGroup: 'calves', isCompound: false, equipment: ['machine', 'dumbbells'] },
  { name: 'Seated Calf Raise', aliases: ['seated calf'], muscleGroup: 'calves', isCompound: false, equipment: ['machine'] },
  { name: 'Donkey Calf Raise', aliases: ['donkey calf'], muscleGroup: 'calves', isCompound: false, equipment: ['machine'] },
  { name: 'Leg Press Calf Raise', aliases: ['calf press'], muscleGroup: 'calves', isCompound: false, equipment: ['leg press machine'] },

  // CORE
  { name: 'Plank', aliases: ['planks', 'front plank'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Crunches', aliases: ['crunch', 'ab crunch'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Sit-ups', aliases: ['situps', 'sit ups'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Hanging Leg Raise', aliases: ['leg raises', 'hanging leg raises', 'knee raises'], muscleGroup: 'core', isCompound: false, equipment: ['pull-up bar'] },
  { name: 'Cable Crunch', aliases: ['cable crunches', 'kneeling cable crunch'], muscleGroup: 'core', isCompound: false, equipment: ['cable machine'] },
  { name: 'Ab Wheel Rollout', aliases: ['ab wheel', 'ab rollout'], muscleGroup: 'core', isCompound: false, equipment: ['ab wheel'] },
  { name: 'Russian Twist', aliases: ['russian twists'], muscleGroup: 'core', isCompound: false, equipment: ['dumbbell', 'medicine ball'] },
  { name: 'Mountain Climbers', aliases: ['mountain climber'], muscleGroup: 'core', secondaryMuscles: ['cardio'], isCompound: true, equipment: [] },
  { name: 'Dead Bug', aliases: ['dead bugs'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Bird Dog', aliases: ['bird dogs'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Side Plank', aliases: ['side planks'], muscleGroup: 'core', isCompound: false, equipment: [] },
  { name: 'Bicycle Crunches', aliases: ['bicycle crunch', 'bicycles'], muscleGroup: 'core', isCompound: false, equipment: [] },

  // CARDIO
  { name: 'Running', aliases: ['run', 'jog', 'jogging', 'treadmill'], muscleGroup: 'cardio', isCompound: true, equipment: ['treadmill'] },
  { name: 'Cycling', aliases: ['bike', 'biking', 'stationary bike', 'spin'], muscleGroup: 'cardio', isCompound: true, equipment: ['bike'] },
  { name: 'Rowing', aliases: ['row', 'rowing machine', 'erg', 'ergometer'], muscleGroup: 'cardio', secondaryMuscles: ['back', 'biceps'], isCompound: true, equipment: ['rowing machine'] },
  { name: 'Elliptical', aliases: ['elliptical trainer', 'cross trainer'], muscleGroup: 'cardio', isCompound: true, equipment: ['elliptical'] },
  { name: 'Stair Climber', aliases: ['stairs', 'stair master', 'stairmaster'], muscleGroup: 'cardio', secondaryMuscles: ['quads', 'glutes'], isCompound: true, equipment: ['stair climber'] },
  { name: 'Jump Rope', aliases: ['skipping', 'rope skipping', 'jump roping'], muscleGroup: 'cardio', isCompound: true, equipment: ['jump rope'] },
  { name: 'Swimming', aliases: ['swim', 'laps'], muscleGroup: 'cardio', secondaryMuscles: ['back', 'shoulders'], isCompound: true, equipment: ['pool'] },
  { name: 'Walking', aliases: ['walk', 'incline walk', 'treadmill walk'], muscleGroup: 'cardio', isCompound: false, equipment: ['treadmill'] },
  { name: 'HIIT', aliases: ['high intensity interval training', 'intervals'], muscleGroup: 'cardio', isCompound: true, equipment: [] },
  { name: 'Burpees', aliases: ['burpee'], muscleGroup: 'cardio', secondaryMuscles: ['chest', 'core'], isCompound: true, equipment: [] },
  { name: 'Box Jumps', aliases: ['box jump', 'plyometric jumps'], muscleGroup: 'cardio', secondaryMuscles: ['quads', 'glutes'], isCompound: true, equipment: ['box'] },
  { name: 'Battle Ropes', aliases: ['battle rope', 'rope slams'], muscleGroup: 'cardio', secondaryMuscles: ['shoulders', 'core'], isCompound: true, equipment: ['battle ropes'] },
];

// Helper function to find exercise by name or alias
export function findExercise(query: string): ExerciseReference | undefined {
  const normalizedQuery = query.toLowerCase().trim();
  return exercises.find(
    (exercise) =>
      exercise.name.toLowerCase() === normalizedQuery ||
      exercise.aliases.some((alias) => alias.toLowerCase() === normalizedQuery)
  );
}

// Get all exercises for a muscle group
export function getExercisesByMuscleGroup(muscleGroup: string): ExerciseReference[] {
  return exercises.filter((exercise) => exercise.muscleGroup === muscleGroup);
}

// Get exercise names as a simple list (for Claude prompt)
export function getExerciseNamesList(): string {
  return exercises.map((e) => e.name).join(', ');
}

// Get exercises organized by muscle group (for Claude prompt)
export function getExercisesByCategory(): string {
  const categories = new Map<string, string[]>();

  exercises.forEach((exercise) => {
    const group = exercise.muscleGroup;
    if (!categories.has(group)) {
      categories.set(group, []);
    }
    categories.get(group)!.push(exercise.name);
  });

  let result = '';
  categories.forEach((names, group) => {
    result += `${group.toUpperCase()}: ${names.join(', ')}\n`;
  });

  return result;
}
