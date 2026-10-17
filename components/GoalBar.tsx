import { foodMet, foodValue } from '../services/goals';
import type { FoodGoal } from '../types/workout';
import { Bar } from './GoalsCard';

// The food goal's one mark: a bar toward the target, ink until met, sunrise once met.
// Nothing on a day with no food. Never red, never a grade.
export default function GoalBar({ goal, day }: { goal: FoodGoal; day?: { protein: number; kcal: number } }) {
  if (!day) return null;
  return <Bar progress={foodValue(goal, day) / goal.target} done={foodMet(goal, day)} />;
}
