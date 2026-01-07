import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, Card, Chip, ProgressBar, Divider, List, Badge, TextInput, IconButton, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useRouter } from 'expo-router';
import { spacing } from '../../constants/theme';
import { getCoachingAdvice, analyzeWeeklyVolume, CoachAnalysis, TRAINING_GUIDELINES, askFollowUpQuestion } from '../../services/coach';
import { startOfWeek, format, addWeeks } from 'date-fns';

export default function CoachScreen() {
  const { colors } = useTheme();
  const { workouts } = useWorkoutStore();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [analyzedWeek, setAnalyzedWeek] = useState<Date | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const selectedWeek = new Date(currentWeek.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);

  const analyzeCurrentWeek = async () => {
    setIsLoading(true);
    try {
      const result = await getCoachingAdvice(workouts, selectedWeek);
      setAnalysis(result);
      setAnalyzedWeek(result.analyzedWeek || selectedWeek);
    } catch (error) {
      Alert.alert('Analysis Error', 'Failed to analyze your training. Please try again.');
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
    // Auto-focus would happen here in a real app
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
    // Auto-analyze when component mounts or week changes
    if (workouts.length > 0) {
      analyzeCurrentWeek();
    }
  }, [workouts, weekOffset]);

  const getQualityColor = (quality: CoachAnalysis['splitQuality']) => {
    switch (quality) {
      case 'excellent': return colors.success;
      case 'good': return colors.secondary;
      case 'fair': return colors.warning;
      case 'poor': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getVolumeStatus = (muscle: string, sets: number) => {
    const mev = TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME] || 6;
    const optimal = TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE[muscle as keyof typeof TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE] || 14;
    
    if (sets < mev) return { status: 'low', color: colors.error };
    if (sets >= mev && sets <= optimal) return { status: 'optimal', color: colors.secondary };
    return { status: 'high', color: colors.warning };
  };

  const getLetterGrade = (quality: CoachAnalysis['splitQuality']) => {
    switch (quality) {
      case 'excellent': return 'A+';
      case 'good': return 'B+';
      case 'fair': return 'C';
      case 'poor': return 'D';
      default: return 'C';
    }
  };

  const getVolumeGrade = (weeklyVolume: Record<string, number>) => {
    const volumes = Object.entries(weeklyVolume).filter(([muscle, sets]) => 
      sets > 0 && muscle !== 'cardio' && muscle !== 'full_body'
    );
    
    let goodVolumes = 0;
    volumes.forEach(([muscle, sets]) => {
      const mev = TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME] || 6;
      if (sets >= mev) goodVolumes++;
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

  const getWorkingWell = (analysis: CoachAnalysis, colors: any) => {
    const working = [];
    
    // Check for good volumes
    Object.entries(analysis.weeklyVolume).forEach(([muscle, sets]) => {
      if (sets > 0 && muscle !== 'cardio' && muscle !== 'full_body') {
        const mev = TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME[muscle as keyof typeof TRAINING_GUIDELINES.MINIMUM_EFFECTIVE_VOLUME] || 6;
        const optimal = TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE[muscle as keyof typeof TRAINING_GUIDELINES.OPTIMAL_VOLUME_RANGE] || 14;
        
        if (sets >= mev && sets <= optimal) {
          working.push(`Great ${muscle} volume (${sets} sets)`);
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
      <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.emptyContent}>
          <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="fitness" size={64} color={colors.primary} />
            </View>
            <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
              AI Coach
            </Text>
            <Text variant="bodyLarge" style={[styles.description, { color: colors.textSecondary }]}>
              Log some workouts to get personalized training analysis and recommendations based on exercise science research.
            </Text>
            <Text variant="bodySmall" style={[styles.footnote, { color: colors.textSecondary }]}>
              Powered by evidence-based training principles
            </Text>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Report Card Header */}
        <View style={styles.header}>
          <Text variant="headlineLarge" style={[styles.title, { color: colors.text }]}>
            {analyzedWeek && analyzedWeek.getTime() !== currentWeek.getTime() 
              ? `Last Week's Report Card`
              : `This Week's Report Card`}
          </Text>
          {analyzedWeek && (
            <Text variant="bodyMedium" style={[{ color: colors.textSecondary, textAlign: 'center' }]}>
              {format(analyzedWeek, 'MMM dd')} - {format(new Date(analyzedWeek.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}
            </Text>
          )}
        </View>

        {analysis && (
          <>
            {/* Grade Summary */}
            <Surface style={[styles.gradeCard, { backgroundColor: colors.surface }]} elevation={2}>
              <View style={styles.gradeHeader}>
                <Text variant="headlineMedium" style={[styles.overallGrade, { color: getQualityColor(analysis.splitQuality) }]}>
                  {getLetterGrade(analysis.splitQuality)}
                </Text>
                <Text variant="bodyMedium" style={[{ color: colors.textSecondary }]}>
                  Overall Training
                </Text>
              </View>
              
              <View style={styles.gradeBreakdown}>
                <GradeItem 
                  label="Volume" 
                  grade={getVolumeGrade(analysis.weeklyVolume)} 
                  colors={colors} 
                  onPress={() => handleGradeClick('Volume', getVolumeGrade(analysis.weeklyVolume))}
                />
                <GradeItem 
                  label="Frequency" 
                  grade={getFrequencyGrade(analysis.frequencyIssues)} 
                  colors={colors} 
                  onPress={() => handleGradeClick('Frequency', getFrequencyGrade(analysis.frequencyIssues))}
                />
                <GradeItem 
                  label="Balance" 
                  grade={getBalanceGrade(analysis.volumeIssues)} 
                  colors={colors} 
                  onPress={() => handleGradeClick('Balance', getBalanceGrade(analysis.volumeIssues))}
                />
              </View>
            </Surface>

            {/* What's Working */}
            <Surface style={[styles.workingCard, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.success }]}>
                What's Working
              </Text>
              <View style={styles.workingList}>
                {getWorkingWell(analysis, colors).map((item, index) => (
                  <Text key={index} variant="bodyMedium" style={[styles.workingItem, { color: colors.text }]}>
                    • {item}
                  </Text>
                ))}
              </View>
            </Surface>

            {/* Fix This Week */}
            {(analysis.recommendations.length > 0 || analysis.volumeIssues.length > 0 || analysis.frequencyIssues.length > 0) && (
              <Surface style={[styles.fixCard, { backgroundColor: colors.surface }]} elevation={1}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.warning }]}>
                  Fix This Week
                </Text>
                <View style={styles.fixList}>
                  {getTopIssues(analysis).slice(0, 3).map((issue, index) => (
                    <TouchableRipple 
                      key={index} 
                      style={styles.fixItem}
                      onPress={() => handleIssueClick(issue)}
                      rippleColor={colors.primary + '20'}
                    >
                      <View style={styles.fixItemContent}>
                        <Text variant="bodyMedium" style={[{ color: colors.text, lineHeight: 20 }]}>
                          • {issue}
                        </Text>
                        <IconButton 
                          icon="chat-question" 
                          size={16} 
                          iconColor={colors.primary}
                          style={styles.askIcon}
                        />
                      </View>
                    </TouchableRipple>
                  ))}
                </View>
              </Surface>
            )}

            {/* Coach's Take */}
            <Surface style={[styles.coachTakeCard, { backgroundColor: colors.primary + '10' }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                Your Coach's Take
              </Text>
              <Text variant="bodyMedium" style={[styles.coachQuote, { color: colors.text }]}>
                "{getCoachQuote(analysis)}"
              </Text>
              <Text variant="bodySmall" style={[styles.coachAttribution, { color: colors.textSecondary }]}>
                Based on exercise science research
              </Text>
            </Surface>

            {/* Ask Your Coach */}
            <Surface style={[styles.chatCard, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                Ask Your Coach
              </Text>
              
              {/* Suggested Questions */}
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Ionicons name="lightbulb" size={16} color={colors.primary} />
                  <Text variant="bodySmall" style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>
                    Quick questions:
                  </Text>
                </View>
                <View style={styles.suggestionsChips}>
                  {getSuggestedQuestions(analysis).map((suggestion, index) => (
                    <Chip
                      key={index}
                      mode="outlined"
                      onPress={() => askQuestion(suggestion)}
                      style={styles.suggestionChip}
                      textStyle={styles.suggestionChipText}
                    >
                      {suggestion}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <View style={styles.chatContainer}>
                  {chatMessages.map((message, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.messageContainer,
                        message.role === 'user' 
                          ? { ...styles.userMessage, backgroundColor: colors.primary } 
                          : { ...styles.assistantMessage, backgroundColor: colors.primary + '10' }
                      ]}
                    >
                      <Text 
                        variant="bodyMedium" 
                        style={[
                          styles.messageText,
                          { color: message.role === 'user' ? '#FFFFFF' : colors.text }
                        ]}
                      >
                        {message.content}
                      </Text>
                    </View>
                  ))}
                  {isChatLoading && (
                    <View style={[styles.messageContainer, { ...styles.assistantMessage, backgroundColor: colors.primary + '10' }]}>
                      <Text variant="bodyMedium" style={[styles.messageText, { color: colors.textSecondary }]}>
                        Thinking...
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Chat Input - Always Visible */}
              <View style={styles.chatInputContainer}>
                <TextInput
                  mode="outlined"
                  placeholder="Ask about your training analysis..."
                  value={currentQuestion}
                  onChangeText={setCurrentQuestion}
                  style={styles.chatInput}
                  multiline
                  onSubmitEditing={handleFollowUpQuestion}
                  disabled={isChatLoading}
                />
                <IconButton
                  icon="send"
                  mode="contained"
                  onPress={handleFollowUpQuestion}
                  disabled={!currentQuestion.trim() || isChatLoading}
                  style={styles.sendButton}
                />
              </View>
            </Surface>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button 
            mode="outlined" 
            onPress={() => router.push('/(tabs)/history')} 
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            View History
          </Button>
          <Button 
            mode="contained" 
            onPress={analyzeCurrentWeek}
            loading={isLoading}
            disabled={isLoading}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GradeItem({ label, grade, colors, onPress }: { label: string; grade: string; colors: any; onPress: () => void }) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return colors.success;
      case 'B+':
      case 'B': return colors.secondary;
      case 'C': return colors.warning;
      case 'D': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <TouchableRipple 
      style={styles.gradeItem} 
      onPress={onPress}
      rippleColor={colors.primary + '20'}
    >
      <View style={styles.gradeItemContent}>
        <Text variant="titleLarge" style={[styles.gradeValue, { color: getGradeColor(grade) }]}>
          {grade}
        </Text>
        <Text variant="bodySmall" style={[styles.gradeLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <IconButton 
          icon="help-circle-outline" 
          size={12} 
          iconColor={colors.textSecondary}
          style={styles.gradeHelpIcon}
        />
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  gradeCard: {
    padding: spacing.xl,
    borderRadius: 20,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  gradeHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  overallGrade: {
    fontWeight: '800',
    fontSize: 48,
    lineHeight: 52,
  },
  gradeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gradeItem: {
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.sm,
  },
  gradeItemContent: {
    alignItems: 'center',
    position: 'relative',
  },
  gradeValue: {
    fontWeight: '700',
  },
  gradeLabel: {
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  workingCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  fixCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  coachTakeCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
    fontSize: 16,
  },
  workingList: {
    gap: spacing.xs,
  },
  workingItem: {
    lineHeight: 22,
  },
  fixList: {
    gap: spacing.xs,
  },
  fixItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  fixItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  coachQuote: {
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  coachAttribution: {
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  footnote: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  chatCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  suggestionsContainer: {
    marginBottom: spacing.md,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    marginRight: 0,
  },
  suggestionChipText: {
    fontSize: 12,
  },
  gradeHelpIcon: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    margin: 0,
    width: 20,
    height: 20,
  },
  askIcon: {
    margin: 0,
    width: 24,
    height: 24,
  },
  chatContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  messageContainer: {
    padding: spacing.md,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chatInput: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    marginBottom: 4,
  },
});
