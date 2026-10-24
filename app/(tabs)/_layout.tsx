import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePathname } from 'expo-router';
import { useColors } from '../../contexts/ThemeContext';

// Native Liquid Glass tab bar with SF Symbols, tinted in the open tab's hue: Today ink, Training coral,
// Food mint, Chat indigo, so the colour alone says where you are
export default function TabLayout() {
  const colors = useColors();
  const path = usePathname();
  const tint = path.startsWith('/training') ? colors.sunrise : path.startsWith('/food') ? colors.food : path.startsWith('/chat') ? colors.indigo : colors.text;

  return (
    <NativeTabs tintColor={tint} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="wb_sunny" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="training">
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
        <NativeTabs.Trigger.Label>Training</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="food">
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
        <NativeTabs.Trigger.Label>Food</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.text.bubble.right', selected: 'bubble.left.and.text.bubble.right.fill' }} md="chat" />
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
