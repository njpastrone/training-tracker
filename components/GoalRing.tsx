import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '../contexts/ThemeContext';
import { foodMet, foodValue } from '../services/goals';
import type { FoodGoal } from '../types/workout';
import Ring from './Ring';

interface Props {
  goal: FoodGoal;
  day?: { protein: number; kcal: number }; // the day's food; none = a dashed empty circle
  size: number;
  children?: React.ReactNode;
}

// The one food-goal ring, the same mark everywhere: fills toward the target, mint on a day that met
// it, sunrise otherwise, dashed when no food was logged. Never red, never a grade.
export default function GoalRing({ goal, day, size, children }: Props) {
  const colors = useColors();
  const stroke = size >= 72 ? 6 : size > 20 ? 4 : 3;
  if (!day) {
    const r = size / 2 - 3;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.textTertiary} strokeWidth={1.5} strokeDasharray="2 3" />
        </Svg>
        {children}
      </View>
    );
  }
  const met = foodMet(goal, day);
  return (
    <Ring size={size} stroke={stroke} progress={foodValue(goal, day) / goal.target} color={met ? colors.mint : colors.sunrise}>
      {children}
    </Ring>
  );
}
