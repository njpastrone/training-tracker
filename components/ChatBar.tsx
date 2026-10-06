import { useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { SkyScreen } from './Sky';
import { Composer, Pill } from './Glass';
import type { useLogDraft } from '../hooks/useLogDraft';

export interface ChatBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  chips: string[];
  onChip: (chip: string) => void;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
}

// The one chat bar every chat tab shares: suggestion chips over the composer, an error above them.
// Only the placeholder, chips and what a send does change per tab.
export function ChatBar({ value, onChangeText, onSend, placeholder, chips, onChip, busy, disabled, error }: ChatBarProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
      {error ? (
        <Animated.Text entering={FadeIn} style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
          {error}
        </Animated.Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
        {chips.map(chip => (
          <Pill key={chip} variant="glass" size="small" label={chip} onPress={() => onChip(chip)} disabled={busy || disabled} />
        ))}
      </ScrollView>
      <Composer value={value} onChangeText={onChangeText} onSend={onSend} placeholder={placeholder} busy={busy} disabled={disabled} />
    </View>
  );
}

// While a parsed card is open the bar fixes it, so cards need no fix box of their own
const FIX_CHIPS = ['It was yesterday', 'Drop the last exercise'];

// The bar for a tab that logs through useLogDraft (Log, Progress): log what you typed, then fix the card.
// Chips with nothing open start a message; fix chips send right away.
export function logBar(log: ReturnType<typeof useLogDraft>, placeholder: string, chips: string[], beforeSend?: () => void): ChatBarProps {
  const fixing = !!log.draft;
  return {
    value: log.text,
    onChangeText: log.setText,
    onSend: async () => {
      beforeSend?.();
      if (!fixing) return log.parse();
      if (await log.fix(log.text)) log.setText('');
    },
    placeholder: fixing ? 'Fix or ask: "it was rows, not pulldowns"' : placeholder,
    chips: fixing ? FIX_CHIPS : chips,
    onChip: chip => (fixing ? log.fix(chip) : log.setText(`${chip} `)),
    busy: log.busy === 'parse' || log.busy === 'fix',
    disabled: log.busy === 'save',
    error: fixing ? null : log.error, // the card shows its own errors
  };
}

interface ChatScreenProps {
  bar: ChatBarProps;
  children: React.ReactNode;
  follow?: boolean; // scroll to the newest answer as it grows
  overlay?: React.ReactNode; // toasts, kept above the bar
}

// A chat tab: the page scrolls, the bar stays pinned above the tab bar and rides up with the keyboard
export function ChatScreen({ bar, children, follow, overlay }: ChatScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    // The bar sits above the tab bar, so pad the bottom edge too
    <SkyScreen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <View style={styles.fill}>
          <ScrollView
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => follow && scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {children}
          </ScrollView>
          {overlay}
        </View>
        <ChatBar {...bar} />
      </KeyboardAvoidingView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
  },
  bar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chips: {
    gap: 6,
    paddingBottom: spacing.sm,
  },
  error: {
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 6,
  },
});
