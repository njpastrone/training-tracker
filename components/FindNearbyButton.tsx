import type { StyleProp, ViewStyle } from 'react-native';
import { Pill } from './Glass';

interface Props {
  onPress: () => void;
  variant?: 'filled' | 'glass';
  size?: 'regular' | 'small';
  label?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The one button: "Find food near me". Mounted on Chat (as the bar's chip and here) and under Settings ›
// Where to look; the Food tab can mount it in its coach line once the tab redesign lands.
export default function FindNearbyButton({ onPress, variant = 'filled', size = 'regular', label = 'Find food near me', loading, style }: Props) {
  return <Pill icon="mappin.and.ellipse" label={label} onPress={onPress} variant={variant} size={size} loading={loading} style={style} />;
}
