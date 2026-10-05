import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { SkyScreen, SkyCard, LargeTitle, SectionLabel } from '../../components/Sky';
import { Composer, Pill } from '../../components/Glass';
import { CoachBubble, UserBubble } from '../../components/Chat';
import Ring from '../../components/Ring';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useRouter } from 'expo-router';
import { fonts, spacing } from '../../constants/theme';
import { getCoachingAdvice, CoachAnalysis, TRAINING_GUIDELINES, askFollowUpQuestion } from '../../services/coach';
import { onPace } from '../../services/pace';
import { ApiError } from '../../services/claude';
import { format, parseISO } from 'date-fns';
import LogoMark from '../../components/LogoMark';

// How far round the gauge each letter grade sits
const GRADE_FILL: Record<string, number> = { 'A+': 1, A: 0.92, 'B+': 0.82, B: 0.74, C: 0.55, D: 0.35 };

export default function CoachScreen() {
  const { colors } = useTheme();
  const { workouts } = useWorkoutStore();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const analyzeCurrentWeek = async () => {
    setIsLoading(true);
    try {
      setAnalysis(await getCoachingAdvice(workouts));
    } catch (error) {
      Alert.alert('Analysis Error', error instanceof ApiError ? error.message : 'Failed to analyze your training. Please try again.');
      console.error('Coaching analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpQuestion = async () => {
    if (!currentQuestion.trim() || !analysis) return;

    const userMessage = { role: 'user' as const, content: currentQuestion.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsChatLoading(true);

    try {
      const response = await askFollowUpQuestion(currentQuestion.trim(), analysis, workouts);
      const assistantMessage = { role: 'assistant' as const, content: response };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      Alert.alert('Chat Error', 'Failed to get response. Please try again.');
      console.error('Follow-up question error:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const askQuestion = (question: string) => {
    setCurrentQuestion(question);
  };

  const handleGradeClick = (gradeType: string, grade: string) => {
    const questions = {
      'Volume': `Why is my volume grade ${grade}? How can I improve it?`,
      'Frequency': `My frequency is rated ${grade}. What should I change about my training schedule?`,
      'Balance': `I got a ${grade} for balance. Which muscle groups need more attention?`
    };
    askQuestion(questions[gradeType as keyof typeof questions] || `Tell me more about my ${gradeType.toLowerCase()} grade.`);
  };

  const handleIssueClick = (issue: string) => {
    askQuestion(`Can you explain this issue and help me fix it: "${issue}"`);
  };

  const getSuggestedQuestions = (analysis: CoachAnalysis) => {
    const suggestions = [];

    if (analysis.volumeIssues.length > 0) {
      suggestions.push("How do I increase my training volume safely?");
    }
    if (analysis.frequencyIssues.length > 0) {
      suggestions.push("What's the best way to train more frequently?");
    }
    if (analysis.splitQuality === 'poor' || analysis.splitQuality === 'fair') {
      suggestions.push("How can I improve my overall program?");
    }
    suggestions.push("What should I focus on this week?");

    return suggestions.slice(0, 3);
  };

  useEffect(() => {
    // Auto-analyze when component mounts or workouts change
    if (workouts.length > 0) {
      analyzeCurrentWeek();
    }
  }, [workouts]);

  const getLetterGrade = (quality: CoachAnalysis['splitQuality']) => {
    switch (quality) {
      case 'excellent': return 'A+';
      case 'good': return 'B+';
      case 'fair': return 'C';
      case 'poor': return 'D';
      default: return 'C';
    }
  };

  const getVolumeGrade = ({ weeklyVolume, window }: CoachAnalysis) => {
    const volumes = Object.entries(weeklyVolume).filter(([muscle, sets]) =>
      sets > 0 && muscle !== 'cardio' && muscle !== 'full_body'
    );

    let goodVolumes = 0;
    volumes.forEach(([muscle, sets]) => {
      const mev = TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME] || 6;
      if (onPace(sets, mev, window.elapsed)) goodVolumes++;
    });

    const ratio = volumes.length > 0 ? goodVolumes / volumes.length : 0;
    if (ratio >= 0.8) return 'A';
    if (ratio >= 0.6) return 'B';
    if (ratio >= 0.4) return 'C';
    return 'D';
  };

  const getFrequencyGrade = (frequencyIssues: string[]) => {
    if (frequencyIssues.length === 0) return 'A';
    if (frequencyIssues.length <= 2) return 'B';
    if (frequencyIssues.length <= 4) return 'C';
    return 'D';
  };

  const getBalanceGrade = (volumeIssues: string[]) => {
    if (volumeIssues.length === 0) return 'A';
    if (volumeIssues.length <= 2) return 'B';
    if (volumeIssues.length <= 4) return 'C';
    return 'D';
  };

  const getWorkingWell = (analysis: CoachAnalysis) => {
    const working = [];

    // Check for good volumes
    Object.entries(analysis.weeklyVolume).forEach(([muscle, sets]) => {
      if (sets > 0 && muscle !== 'cardio' && muscle !== 'full_body') {
        const mev = TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME] || 6;
        const optimal = TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE[muscle as keyof typeof TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE] || 14;

        if (onPace(sets, mev, analysis.window.elapsed) && sets <= optimal) {
          working.push(`Great ${muscle} volume (${sets} sets a week)`);
        }
      }
    });

    // Add some variety if nothing specific
    if (working.length === 0) {
      working.push('You showed up and trained consistently');
      if (analysis.frequencyIssues.length === 0) {
        working.push('Good training frequency');
      }
    }

    return working.slice(0, 3); // Show top 3
  };

  const getTopIssues = (analysis: CoachAnalysis) => {
    const issues: string[] = [];

    // Combine all issues with priority
    analysis.volumeIssues.forEach(issue => issues.push(issue.replace(/:/g, '')));
    analysis.frequencyIssues.forEach(issue => issues.push(issue.replace(/:/g, '')));
    analysis.recommendations.slice(0, 2).forEach(rec => issues.push(rec));

    return issues;
  };

  const getCoachQuote = (analysis: CoachAnalysis) => {
    if (analysis.splitQuality === 'excellent') {
      return "Outstanding week! Your volume and frequency are dialed in perfectly. Keep this momentum going.";
    } else if (analysis.splitQuality === 'good') {
      return "Solid training week! A few tweaks and you'll be hitting all the optimal ranges.";
    } else if (analysis.splitQuality === 'fair') {
      return "You're on the right track. Focus on the key fixes and you'll see better progress.";
    } else {
      return "Let's get back to basics. Small consistent improvements will get you there.";
    }
  };

  if (!workouts.length) {
    return (
      <SkyScreen>
        <View style={styles.content}>
          <LargeTitle title="Coach" />
          <SkyCard style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.dim }]}>
              <LogoMark size={34} color={colors.sunrise} />
            </View>
            <Text variant="titleLarge" style={[styles.center, { color: colors.text }]}>
              Your coach is ready
            </Text>
            <Text variant="bodyLarge" style={[styles.center, { color: colors.textSecondary }]}>
              Log some workouts to get personalized training analysis and recommendations based on exercise science research.
            </Text>
            <Text variant="bodySmall" style={[styles.center, { color: colors.textTertiary }]}>
              Powered by evidence-based training principles
            </Text>
          </SkyCard>
        </View>
      </SkyScreen>
    );
  }

  const span = analysis?.window;
  const subtitle = span && `Last ${span.days} days · ${format(parseISO(span.first), 'MMM d')} – ${format(parseISO(span.last), 'MMM d')}`;

  const subGrades = analysis
    ? [
        { label: 'Volume', grade: getVolumeGrade(analysis) },
        { label: 'Frequency', grade: getFrequencyGrade(analysis.frequencyIssues) },
        { label: 'Balance', grade: getBalanceGrade(analysis.volumeIssues) },
      ]
    : [];
  const overall = analysis ? getLetterGrade(analysis.splitQuality) : '';

  return (
    // The composer sits above the tab bar, so pad the bottom edge too
    <SkyScreen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.fill}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => chatMessages.length > 0 && scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <LargeTitle title="Coach" subtitle={subtitle} />

          {analysis && (
            <>
              <SkyCard>
                <View style={styles.gradeRow}>
                  <Ring size={120} stroke={11} sweep={270} progress={GRADE_FILL[overall] ?? 0.5}>
                    <Text style={[styles.overall, { color: colors.text }]}>{overall}</Text>
                    <Text style={[styles.overallLabel, { color: colors.textTertiary }]}>Overall</Text>
                  </Ring>
                  <View style={styles.subGrades}>
                    {subGrades.map(({ label, grade }) => (
                      <Pressable
                        key={label}
                        onPress={() => handleGradeClick(label, grade)}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} grade ${grade}. Ask your coach about it`}
                        style={({ pressed }) => [styles.subGrade, pressed && styles.pressed]}
                      >
                        <View style={styles.subGradeTop}>
                          <Text variant="titleSmall" style={{ color: colors.textSecondary }}>{label}</Text>
                          <Text style={[styles.subGradeLetter, { color: colors.text }]}>{grade}</Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.dim }]}>
                          <View style={[styles.bar, { backgroundColor: colors.sunrise, width: `${(GRADE_FILL[grade] ?? 0.5) * 100}%` }]} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </SkyCard>

              <SkyCard>
                <SectionLabel>What's working</SectionLabel>
                {getWorkingWell(analysis).map((item, index) => (
                  <ItemRow key={index} icon="checkmark.circle.fill" iconColor={colors.mint} text={item} />
                ))}
              </SkyCard>

              {(analysis.recommendations.length > 0 || analysis.volumeIssues.length > 0 || analysis.frequencyIssues.length > 0) && (
                <SkyCard>
                  <SectionLabel>Fix this week</SectionLabel>
                  {getTopIssues(analysis).slice(0, 3).map((issue, index) => (
                    <ItemRow
                      key={index}
                      icon="arrow.forward.circle.fill"
                      iconColor={colors.sunrise}
                      text={issue}
                      onPress={() => handleIssueClick(issue)}
                    />
                  ))}
                </SkyCard>
              )}

              <CoachBubble text={getCoachQuote(analysis)} />

              <View style={styles.suggestions}>
                {getSuggestedQuestions(analysis).map((suggestion, index) => (
                  <Pill key={index} variant="glass" size="small" label={suggestion} onPress={() => askQuestion(suggestion)} />
                ))}
              </View>

              {chatMessages.map((message, index) =>
                message.role === 'user' ? (
                  <UserBubble key={index} text={message.content} />
                ) : (
                  <CoachBubble key={index} text={message.content} />
                )
              )}
              {isChatLoading && <CoachBubble text="Thinking…" muted />}
            </>
          )}

          <View style={styles.actions}>
            <Pill variant="glass" icon="calendar" label="History" onPress={() => router.push('/(tabs)/history')} style={styles.action} />
            <Pill
              variant="glass"
              icon="arrow.clockwise"
              label={isLoading ? 'Analyzing…' : 'Refresh'}
              onPress={analyzeCurrentWeek}
              loading={isLoading}
              style={styles.action}
            />
          </View>
        </ScrollView>

        {analysis && (
          <View style={styles.composer}>
            <Composer
              value={currentQuestion}
              onChangeText={setCurrentQuestion}
              onSend={handleFollowUpQuestion}
              placeholder="Ask your coach…"
              busy={isChatLoading}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SkyScreen>
  );
}

function ItemRow({ icon, iconColor, text, onPress }: { icon: SFSymbol; iconColor: string; text: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Asks your coach about it' : undefined}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <SymbolView name={icon} size={19} tintColor={iconColor} style={styles.itemIcon} />
      <Text variant="bodyLarge" style={[styles.itemText, { color: colors.text }]}>
        {text}
      </Text>
      {onPress && <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.textTertiary} />}
    </Pressable>
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
  center: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
  },
  overall: {
    fontFamily: fonts.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
  },
  overallLabel: {
    position: 'absolute',
    bottom: 12,
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subGrades: {
    flex: 1,
    gap: 4,
  },
  subGrade: {
    paddingVertical: 4,
  },
  subGradeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  subGradeLetter: {
    fontFamily: fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  itemIcon: {
    width: 22,
    height: 22,
  },
  itemText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.gap,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
