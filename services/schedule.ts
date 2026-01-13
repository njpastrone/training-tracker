import AsyncStorage from '@react-native-async-storage/async-storage';
import { TemplateSchedule } from '../types/template';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, addWeeks, addDays, parseISO, isWithinInterval } from 'date-fns';

const SCHEDULE_STORAGE_KEY = '@training-tracker/schedule';

export type RecurringPattern = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export const scheduleService = {
  // Load all scheduled workouts from storage
  async getSchedule(): Promise<TemplateSchedule[]> {
    try {
      const scheduleJson = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (!scheduleJson) return [];
      return JSON.parse(scheduleJson);
    } catch (error) {
      console.error('Error loading schedule:', error);
      return [];
    }
  },

  // Save schedule to storage
  async saveSchedule(schedule: TemplateSchedule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  },

  // Schedule a single workout
  async scheduleWorkout(
    date: string, 
    templateId: string, 
    isRecurring: boolean = false,
    recurringPattern?: RecurringPattern
  ): Promise<TemplateSchedule> {
    const schedule = await this.getSchedule();
    
    // Check if date already has a scheduled workout
    const existingIndex = schedule.findIndex(s => s.date === date);
    
    const newSchedule: TemplateSchedule = {
      id: uuidv4(),
      date,
      templateId,
      isRecurring,
      recurringPattern,
      completed: false,
    };

    if (existingIndex >= 0) {
      // Replace existing schedule
      schedule[existingIndex] = newSchedule;
    } else {
      // Add new schedule
      schedule.push(newSchedule);
    }

    await this.saveSchedule(schedule);
    return newSchedule;
  },

  // Schedule recurring workouts
  async scheduleRecurringWorkouts(
    startDate: string,
    templateId: string,
    pattern: RecurringPattern,
    numberOfOccurrences: number = 12 // Default 3 months
  ): Promise<TemplateSchedule[]> {
    const schedule = await this.getSchedule();
    const newSchedules: TemplateSchedule[] = [];
    
    let currentDate = parseISO(startDate);
    
    for (let i = 0; i < numberOfOccurrences; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Skip if date already has a scheduled workout
      const existingSchedule = schedule.find(s => s.date === dateStr);
      if (!existingSchedule) {
        const newSchedule: TemplateSchedule = {
          id: uuidv4(),
          date: dateStr,
          templateId,
          isRecurring: true,
          recurringPattern: pattern,
          completed: false,
        };
        
        newSchedules.push(newSchedule);
        schedule.push(newSchedule);
      }

      // Calculate next occurrence based on pattern
      switch (pattern) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
          currentDate = addDays(currentDate, 30); // Approximate monthly
          break;
      }
    }

    await this.saveSchedule(schedule);
    return newSchedules;
  },

  // Get scheduled workout for a specific date
  async getScheduledWorkout(date: string): Promise<TemplateSchedule | null> {
    const schedule = await this.getSchedule();
    return schedule.find(s => s.date === date && !s.completed) || null;
  },

  // Get all scheduled workouts for a week
  async getWeekSchedule(weekStartDate: Date): Promise<TemplateSchedule[]> {
    const schedule = await this.getSchedule();
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    return schedule.filter(scheduledWorkout => {
      const workoutDate = parseISO(scheduledWorkout.date);
      return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
    }).sort((a, b) => a.date.localeCompare(b.date));
  },

  // Get upcoming scheduled workouts
  async getUpcomingWorkouts(limit: number = 7): Promise<TemplateSchedule[]> {
    const schedule = await this.getSchedule();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return schedule
      .filter(s => s.date >= today && !s.completed && !s.skipped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  },

  // Cancel/delete a scheduled workout
  async cancelScheduledWorkout(date: string): Promise<void> {
    const schedule = await this.getSchedule();
    const filtered = schedule.filter(s => s.date !== date);
    await this.saveSchedule(filtered);
  },

  // Mark workout as completed
  async markWorkoutCompleted(date: string, workoutId?: string): Promise<void> {
    const schedule = await this.getSchedule();
    const scheduleIndex = schedule.findIndex(s => s.date === date);
    
    if (scheduleIndex >= 0) {
      schedule[scheduleIndex] = {
        ...schedule[scheduleIndex],
        completed: true,
        completedWorkoutId: workoutId, // Reference to actual logged workout
      };
      await this.saveSchedule(schedule);
    }
  },

  // Mark workout as skipped
  async markWorkoutSkipped(date: string, reason?: string): Promise<void> {
    const schedule = await this.getSchedule();
    const scheduleIndex = schedule.findIndex(s => s.date === date);
    
    if (scheduleIndex >= 0) {
      schedule[scheduleIndex] = {
        ...schedule[scheduleIndex],
        skipped: true,
        skipReason: reason,
      };
      await this.saveSchedule(schedule);
    }
  },

  // Reschedule a workout to a different date
  async rescheduleWorkout(originalDate: string, newDate: string): Promise<void> {
    const schedule = await this.getSchedule();
    const workoutIndex = schedule.findIndex(s => s.date === originalDate);
    
    if (workoutIndex >= 0) {
      const workout = schedule[workoutIndex];
      
      // Remove from original date
      schedule.splice(workoutIndex, 1);
      
      // Add to new date (but not as recurring)
      schedule.push({
        ...workout,
        id: uuidv4(), // New ID for rescheduled workout
        date: newDate,
        isRecurring: false, // Rescheduled workouts break the recurring pattern
        recurringPattern: undefined,
      });
      
      await this.saveSchedule(schedule);
    }
  },

  // Get schedule statistics
  async getScheduleStats(): Promise<{
    totalScheduled: number;
    completed: number;
    skipped: number;
    upcoming: number;
    completionRate: number;
  }> {
    const schedule = await this.getSchedule();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const totalScheduled = schedule.length;
    const completed = schedule.filter(s => s.completed).length;
    const skipped = schedule.filter(s => s.skipped).length;
    const upcoming = schedule.filter(s => s.date >= today && !s.completed && !s.skipped).length;
    
    const completionRate = totalScheduled > 0 ? (completed / (completed + skipped)) * 100 : 0;
    
    return {
      totalScheduled,
      completed,
      skipped,
      upcoming,
      completionRate,
    };
  },

  // Clean up old completed/skipped schedules (housekeeping)
  async cleanupOldSchedules(daysToKeep: number = 30): Promise<void> {
    const schedule = await this.getSchedule();
    const cutoffDate = format(addDays(new Date(), -daysToKeep), 'yyyy-MM-dd');
    
    const filtered = schedule.filter(s => 
      s.date >= cutoffDate || (!s.completed && !s.skipped)
    );
    
    await this.saveSchedule(filtered);
  },

  // Get dates that have scheduled workouts (for calendar indicators)
  async getScheduledDates(): Promise<Set<string>> {
    const schedule = await this.getSchedule();
    return new Set(
      schedule
        .filter(s => !s.completed && !s.skipped)
        .map(s => s.date)
    );
  },
};