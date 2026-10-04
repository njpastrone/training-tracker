import { TemplateExercise } from './template';

// A plan is a thin record: its day types are WorkoutTemplates and its sessions are
// TemplateSchedule entries, both tagged with planId
export interface TrainingPlan {
  id: string;
  name: string; // "Re-entry week", "PPL split"
  request: string; // the user's first ask, verbatim
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: 'active' | 'ended' | 'cancelled';
  createdAt: string;
}

// A day type the planner proposes, e.g. "Upper A" or "Push"
export interface PlanDay {
  name: string;
  source: 'mine' | 'suggested';
  exercises: TemplateExercise[];
}

export interface PlanSession {
  date: string; // YYYY-MM-DD
  day: string; // key into PlanDraft.days
  note?: string;
}

// The plan as proposed by Claude, before Plan it saves it
export interface PlanDraft {
  name: string;
  days: Record<string, PlanDay>;
  sessions: PlanSession[]; // first week only; repeatWeeks expands it on the phone
  repeatWeeks: number;
}

export interface PlannerResponse {
  reply: string;
  plan: PlanDraft;
  chips: string[];
}
