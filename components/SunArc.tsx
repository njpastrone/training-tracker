import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { sunArc } from '../services/sunArc';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const H = 170;

// Log's hero: training days in the last 7 as a sun rising over the horizon. One dot per target day,
// filled once done; the sun on the latest. Replaces the training ring.
export default function SunArc() {
  const { colors, sky, isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const W = width - spacing.screen * 2;
  const a = sunArc(sky.done, sky.target, W, H);
  const arc = (to: number) => `M ${a.cx - a.r} ${a.cy} A ${a.r} ${a.r} 0 0 1 ${a.cx + a.r * Math.cos(to)} ${a.cy - a.r * Math.sin(to)}`;
  const rise = useSharedValue(reduceMotion ? 0 : 24);
  useEffect(() => {
    rise.value = reduceMotion ? 0 : withSpring(0, { damping: 14 });
  }, [sky.done, reduceMotion]);
  const sunY = a.sun?.y ?? 0;
  const sunProps = useAnimatedProps(() => ({ cy: sunY + rise.value }));
  const line = isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.95)';
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${sky.done} of ${sky.target} training days in the last 7`}>
      <Svg width={W} height={H}>
        <Path d={arc(0)} fill="none" stroke={line} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
        {sky.done > 0 && <Path d={arc(a.doneAngle)} fill="none" stroke={colors.sunrise} strokeWidth={3.5} strokeLinecap="round" />}
        <Line x1={0} y1={a.cy} x2={W} y2={a.cy} stroke={colors.textTertiary} strokeOpacity={0.4} strokeWidth={1.5} />
        {a.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={5} fill={d.done ? colors.sunrise : colors.background} stroke={d.done ? colors.sunrise : line} strokeWidth={2} />
        ))}
        {a.sun && <AnimatedCircle cx={a.sun.x} r={34} fill={colors.sunriseSoft} fillOpacity={0.3} animatedProps={sunProps} />}
        {a.sun && <AnimatedCircle cx={a.sun.x} r={15} fill={colors.sunrise} animatedProps={sunProps} />}
      </Svg>
      <View style={styles.centre}>
        <Text variant="displaySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
          {sky.done}
          <Text variant="displaySmall" maxFontSizeMultiplier={1.3} style={{ color: colors.textTertiary }}>{` of ${sky.target}`}</Text>
        </Text>
        <Text variant="bodyMedium" style={[styles.sub, { color: colors.textSecondary }]}>training days in the last 7</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The count sits under the horizon, so the sun and its halo never cross it at any text size
  wrap: { marginBottom: spacing.md },
  centre: { alignItems: 'center', marginTop: spacing.xs },
  sub: { fontWeight: '600', textAlign: 'center' },
});
