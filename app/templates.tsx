import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, FAB, List, IconButton, Searchbar, Chip, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../stores/workoutStore';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';
import { WorkoutTemplate } from '../types/template';
import { format } from 'date-fns';

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { templates, loadTemplates, deleteTemplate } = useWorkoutStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<WorkoutTemplate[]>([]);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

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

  const handleDeleteTemplate = (id: string, name: string) => {
    setTemplateToDelete(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setDeleteDialogVisible(false);
      setTemplateToDelete(null);
    }
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>
            Workout Templates
          </Text>
        </View>
        <Searchbar
          placeholder="Search templates..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface }]}
          iconColor={colors.text}
          inputStyle={{ color: colors.text }}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filteredTemplates.length === 0 ? (
          <Surface style={[styles.emptyState, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="bodyLarge" style={{ color: colors.text, textAlign: 'center' }}>
              {templates.length === 0 
                ? "No templates created yet.\nTap the + button to create your first template!"
                : "No templates match your search."}
            </Text>
          </Surface>
        ) : (
          filteredTemplates.map(template => (
            <Surface 
              key={template.id} 
              style={[styles.templateCard, { backgroundColor: colors.surface }]} 
              elevation={1}
            >
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <Text variant="titleMedium" style={{ color: colors.text, fontWeight: '600' }}>
                    {template.name}
                  </Text>
                  {template.description && (
                    <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7 }}>
                      {template.description}
                    </Text>
                  )}
                  <View style={styles.muscleChips}>
                    {template.muscleGroups.slice(0, 3).map(mg => (
                      <Chip 
                        key={mg} 
                        compact 
                        style={styles.muscleChip}
                        textStyle={{ fontSize: 11, textTransform: 'capitalize' }}
                      >
                        {mg}
                      </Chip>
                    ))}
                    {template.muscleGroups.length > 3 && (
                      <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.5 }}>
                        +{template.muscleGroups.length - 3}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <IconButton
                    icon="play-circle-outline"
                    size={24}
                    onPress={() => handleUseTemplate(template.id)}
                    iconColor={colors.primary}
                  />
                  <IconButton
                    icon="pencil-outline"
                    size={20}
                    onPress={() => handleEditTemplate(template.id)}
                  />
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    onPress={() => handleDeleteTemplate(template.id, template.name)}
                    iconColor={colors.error}
                  />
                </View>
              </View>

              <View style={styles.templateExercises}>
                <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7, marginBottom: 4 }}>
                  {template.exercises.length} exercises
                </Text>
                {template.exercises.slice(0, 3).map((exercise, index) => (
                  <Text key={index} variant="bodySmall" style={{ color: colors.text }}>
                    • {exercise.name} - {exercise.sets}x{exercise.reps}
                    {exercise.weight && ` @ ${exercise.weight}${exercise.weightUnit}`}
                  </Text>
                ))}
                {template.exercises.length > 3 && (
                  <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.5 }}>
                    ...and {template.exercises.length - 3} more
                  </Text>
                )}
              </View>

              {template.lastUsed && (
                <Text variant="bodySmall" style={[styles.lastUsed, { color: colors.text, opacity: 0.5 }]}>
                  Last used: {format(new Date(template.lastUsed), 'MMM d, yyyy')} • Used {template.usageCount}x
                </Text>
              )}
            </Surface>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateTemplate}
        color={colors.surface}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Template</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this template? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor={colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    marginLeft: -8,
    marginRight: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  searchBar: {
    borderRadius: 12,
    elevation: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emptyState: {
    padding: spacing.xl,
    borderRadius: 16,
  },
  templateCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  templateInfo: {
    flex: 1,
  },
  muscleChips: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  muscleChip: {
    height: 32,
  },
  templateActions: {
    flexDirection: 'row',
    marginRight: -8,
  },
  templateExercises: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  lastUsed: {
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});