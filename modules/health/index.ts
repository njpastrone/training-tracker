import { requireOptionalNativeModule } from 'expo';

// What ios/LiftTextHealthModule.swift reads; times are milliseconds since 1970
export interface HealthWorkout {
  start: number;
  end: number;
  activity: number; // HKWorkoutActivityType raw value
  source: string; // the app or device that saved it
}
export interface HealthWeight {
  date: number;
  kg: number;
}

// Apple Health (HealthKit). Null in Expo Go, where services/health.ts hides everything Health.
export default requireOptionalNativeModule<{
  isAvailable(): boolean;
  requestAccess(write: boolean): Promise<boolean>; // true when saving workouts is allowed
  canSaveWorkouts(): boolean;
  workouts(since: number): Promise<HealthWorkout[]>;
  bodyWeights(since: number): Promise<HealthWeight[]>;
  saveWorkout(id: string, start: number, end: number, activity: number): Promise<boolean>;
  deleteWorkouts(ids: string[]): Promise<number>;
}>('LiftTextHealth');
