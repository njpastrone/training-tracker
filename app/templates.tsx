import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { muscleGroupColors, spacing } from '../constants/theme';
import { WorkoutTemplate } from '../types/template';
import { format } from 'date-fns';
import { SkyScreen, SkyCard, LargeTitle } from '../components/Sky';
import { HeaderButton, Pill } from '../components/Glass';

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { templates, loadTemplates, deleteTemplate } = useWorkoutStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<WorkoutTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const filtered = templates.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.muscleGroups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredTemplates(filtered);
  }, [templates, searchQuery]);

  const handleDeleteTemplate = (id: string) => {
    Alert.alert('Delete Template', 'Are you sure you want to delete this template? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id) },
    ]);
  };

  const handleCreateTemplate = () => {
    router.push('/template-edit');
  };

  const handleEditTemplate = (id: string) => {
    router.push(`/template-edit?id=${id}`);
  };

  const handleUseTemplate = (id: string) => {
    router.push({
      pathname: '/(tabs)/',
      params: { templateId: id }
    });
  };

  return (
    <SkyScreen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => <HeaderButton icon="plus" label="New template" onPress={handleCreateTemplate} />,
          headerSearchBarOptions: {
            placeholder: 'Search templates',
            hideWhenScrolling: false,
            onChangeText: (e) => setSearchQuery(e.nativeEvent.text),
          },
        }}
      />

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <LargeTitle title="Templates" />
        {filteredTemplates.length === 0 ? (
          <SkyCard style={styles.empty}>
            <SymbolView name="list.bullet.rectangle" size={30} tintColor={colors.sunrise} />
            <Text variant="bodyLarge" style={[styles.center, { color: colors.textSecondary }]}>
              {templates.length === 0
                ? 'No templates yet. Tap + to create your first one.'
                : 'No templates match your search.'}
            </Text>
          </SkyCard>
        ) : (
          filteredTemplates.map(template => (
            <SkyCard key={template.id}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <Text variant="titleLarge" style={{ color: colors.text }}>
                    {template.name}
                  </Text>
                  {template.description ? (
                    <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                      {template.description}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => handleEditTemplate(template.id)} accessibilityRole="button" accessibilityLabel={`Edit ${template.name}`} hitSlop={6} style={styles.iconButton}>
                  <SymbolView name="pencil" size={18} tintColor={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => handleDeleteTemplate(template.id)} accessibilityRole="button" accessibilityLabel={`Delete ${template.name}`} hitSlop={6} style={styles.iconButton}>
                  <SymbolView name="trash" size={18} tintColor={colors.error} />
                </Pressable>
              </View>

              <View style={styles.muscles}>
                {template.muscleGroups.map(mg => (
                  <View key={mg} style={styles.muscle}>
                    <View style={[styles.dot, { backgroundColor: muscleGroupColors[mg] }]} />
                    <Text variant="labelMedium" style={[styles.muscleText, { color: colors.textSecondary }]}>
                      {mg.replace('_', ' ')}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.exercises}>
                {template.exercises.slice(0, 3).map((exercise, index) => (
                  <View key={index} style={[styles.exerciseRow, { borderTopColor: colors.dim }]}>
                    <Text variant="bodyLarge" style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    <Text variant="labelLarge" style={[styles.numbers, { color: colors.textSecondary }]}>
                      {exercise.sets} × {exercise.reps}
                      {exercise.weight ? ` · ${exercise.weight} ${exercise.weightUnit}` : ''}
                    </Text>
                  </View>
                ))}
                {template.exercises.length > 3 && (
                  <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                    and {template.exercises.length - 3} more
                  </Text>
                )}
              </View>

              <View style={styles.footer}>
                <Text variant="bodySmall" style={[styles.footerText, { color: colors.textTertiary }]}>
                  {template.exercises.length} exercises
                  {template.lastUsed ? ` · Last used ${format(new Date(template.lastUsed), 'MMM d, yyyy')} · Used ${template.usageCount}×` : ''}
                </Text>
                <Pill icon="play.fill" size="small" label="Use" onPress={() => handleUseTemplate(template.id)} />
              </View>
            </SkyCard>
          ))
        )}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  templateInfo: {
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gap,
    marginTop: spacing.sm,
  },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleText: {
    textTransform: 'capitalize',
  },
  exercises: {
    marginTop: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  exerciseName: {
    flex: 1,
  },
  numbers: {
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerText: {
    flex: 1,
  },
});
