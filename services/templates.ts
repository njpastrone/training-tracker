import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutTemplate, TemplateExercise, CreateTemplateInput } from '../types/template';
import { Workout } from '../types/workout';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES_STORAGE_KEY = '@training-tracker/templates';

export const templateService = {
  // Load all templates from storage
  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const templatesJson = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (!templatesJson) return [];
      return JSON.parse(templatesJson);
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  },

  // Save templates to storage
  async saveTemplates(templates: WorkoutTemplate[]): Promise<void> {
    try {
      await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  },

  // Get a single template by ID
  async getTemplate(id: string): Promise<WorkoutTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  },

  // Create a new template
  async createTemplate(input: CreateTemplateInput): Promise<WorkoutTemplate> {
    const templates = await this.getTemplates();
    
    const newTemplate: WorkoutTemplate = {
      ...input,
      id: uuidv4() as string,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      // Extract unique muscle groups from exercises
      muscleGroups: [...new Set(input.exercises.map(e => e.muscleGroup))],
    };

    templates.push(newTemplate);
    await this.saveTemplates(templates);
    
    return newTemplate;
  },

  // Update an existing template
  async updateTemplate(id: string, updates: Partial<WorkoutTemplate>): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Template with id ${id} not found`);
    }

    // Don't allow updating id or createdAt
    const { id: _, createdAt: __, ...safeUpdates } = updates;
    
    // If exercises are updated, recalculate muscle groups
    if (safeUpdates.exercises) {
      safeUpdates.muscleGroups = [...new Set(safeUpdates.exercises.map(e => e.muscleGroup))];
    }

    templates[index] = {
      ...templates[index],
      ...safeUpdates,
    };

    await this.saveTemplates(templates);
  },

  // Delete a template
  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
      throw new Error(`Template with id ${id} not found`);
    }

    await this.saveTemplates(filtered);
  },

  // Create a template from an existing workout
  async createTemplateFromWorkout(workout: Workout, name: string, description?: string): Promise<WorkoutTemplate> {
    const exercises: TemplateExercise[] = workout.exercises.map(exercise => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets || 3, // Default to 3 if not specified
      reps: exercise.reps || 10, // Default to 10 if not specified
      weight: exercise.weight,
      weightUnit: exercise.unit || 'lbs',
      notes: exercise.notes,
    }));

    const input: CreateTemplateInput = {
      name,
      description: description || `Created from workout on ${new Date(workout.date).toLocaleDateString()}`,
      exercises,
      muscleGroups: workout.muscleGroups,
    };

    return this.createTemplate(input);
  },

  // Mark a template as used (updates lastUsed and increments usageCount)
  async markTemplateUsed(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Template with id ${id} not found`);
    }

    templates[index] = {
      ...templates[index],
      lastUsed: new Date().toISOString(),
      usageCount: (templates[index].usageCount || 0) + 1,
    };

    await this.saveTemplates(templates);
  },

  // Convert template to natural language for workout input
  templateToNaturalLanguage(template: WorkoutTemplate): string {
    const exerciseDescriptions = template.exercises.map(exercise => {
      let description = exercise.name;
      
      if (exercise.sets && exercise.reps) {
        description += ` ${exercise.sets}x${exercise.reps}`;
      }
      
      if (exercise.weight) {
        description += ` @ ${exercise.weight}${exercise.weightUnit || 'lbs'}`;
      }
      
      if (exercise.notes) {
        description += ` (${exercise.notes})`;
      }
      
      return description;
    });

    return exerciseDescriptions.join(', ');
  },

  // Parse natural language into template exercises using Claude
  async parseTemplateFromNL(input: string): Promise<TemplateExercise[]> {
    const { parseTemplateFromNL } = await import('./claude');
    return parseTemplateFromNL(input);
  },

  // Get templates sorted by usage (most used first)
  async getTemplatesByUsage(): Promise<WorkoutTemplate[]> {
    const templates = await this.getTemplates();
    return templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  },

  // Get recently used templates
  async getRecentTemplates(limit: number = 5): Promise<WorkoutTemplate[]> {
    const templates = await this.getTemplates();
    return templates
      .filter(t => t.lastUsed)
      .sort((a, b) => {
        const dateA = new Date(a.lastUsed || 0).getTime();
        const dateB = new Date(b.lastUsed || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  },
};