import { Workout, MuscleGroup } from '../types/workout';
import { catalogById } from '../data/catalog';
import { parseISO } from 'date-fns';
import type { TrainingWindow } from './pace';

// Sets and sessions per muscle group over a window, for the planner's history summary.
// (The graded weekly report and its chat were replaced by the Progress tab.)

export interface WeeklyMuscleData {
  muscleGroup: MuscleGroup;
  totalSets: number; // in the window
  frequency: number; // sessions in the window
  lastTrained: string | null; // date
  daysRestBetweenSessions: number[];
}

export function analyzeWeeklyVolume(workouts: Workout[], win: TrainingWindow): Record<MuscleGroup, WeeklyMuscleData> {
  const weeklyData: Record<MuscleGroup, WeeklyMuscleData> = {} as Record<MuscleGroup, WeeklyMuscleData>;
  
  // Initialize all muscle groups
  const allMuscleGroups: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'core', 'quads', 'hamstrings', 'glutes', 'calves', 'cardio', 'full_body'
  ];
  
  allMuscleGroups.forEach(muscle => {
    weeklyData[muscle] = {
      muscleGroup: muscle,
      totalSets: 0,
      frequency: 0,
      lastTrained: null,
      daysRestBetweenSessions: []
    };
  });

  const weekWorkouts = workouts.filter(w => w.date >= win.first && w.date <= win.last);

  // Calculate volume and frequency per muscle group
  const sessionDates: Record<MuscleGroup, string[]> = {} as Record<MuscleGroup, string[]>;
  
  weekWorkouts.forEach(workout => {
    workout.muscleGroups.forEach(muscle => {
      if (!sessionDates[muscle]) sessionDates[muscle] = [];
      if (!sessionDates[muscle].includes(workout.date)) {
        sessionDates[muscle].push(workout.date);
        weeklyData[muscle].frequency++;
      }
      weeklyData[muscle].lastTrained = workout.date;
    });

    // A set counts 1 for the exercise's primary muscle and ½ for each secondary (fractional volume).
    // Exercises without a catalog id count toward their stored muscle group only.
    workout.exercises.forEach(exercise => {
      const entry = exercise.exerciseId ? catalogById.get(exercise.exerciseId) : undefined;
      const sets = exercise.sets || 0;
      weeklyData[entry?.primary ?? exercise.muscleGroup].totalSets += sets;
      for (const muscle of entry?.secondary ?? []) weeklyData[muscle].totalSets += sets / 2;
    });
  });

  // Calculate rest days between sessions
  Object.keys(sessionDates).forEach(muscle => {
    const dates = sessionDates[muscle as MuscleGroup].sort();
    const restDays = [];
    for (let i = 1; i < dates.length; i++) {
      const daysBetween = Math.floor(
        (parseISO(dates[i]).getTime() - parseISO(dates[i-1]).getTime()) / (1000 * 60 * 60 * 24)
      );
      restDays.push(daysBetween);
    }
    weeklyData[muscle as MuscleGroup].daysRestBetweenSessions = restDays;
  });

  return weeklyData;
}
