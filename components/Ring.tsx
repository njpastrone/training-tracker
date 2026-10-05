import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors } from '../contexts/ThemeContext';

interface Props {
  size: number;
  stroke: number;
  progress: number; // 0..1
  sweep?: number; // degrees; 360 is a full ring starting at the top, less is a gauge open at the bottom
  color?: string; // solid stroke; default is the sunrise gradient
  children?: React.ReactNode;
}

// Progress ring or gauge with content centred inside
export default function Ring({ size, stroke, progress, sweep = 360, color, children }: Props) {
  const colors = useColors();
  const gradientId = useId();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (circumference * sweep) / 360;
  const start = sweep === 360 ? -90 : 90 + (360 - sweep) / 2;
  const filled = arc * Math.min(1, Math.max(0, progress));
  const c = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.sunriseSoft} />
            <Stop offset="1" stopColor={colors.sunrise} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={c} cy={c} r={r} fill="none"
          stroke={colors.dim} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
        {filled > 0 && (
          <Circle
            cx={c} cy={c} r={r} fill="none"
            stroke={color ?? `url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform={`rotate(${start} ${c} ${c})`}
          />
        )}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
