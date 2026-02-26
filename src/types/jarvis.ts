export interface JarvisTask {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at?: string | null;
  completed_at?: string | null;
  tags: string[];
  source: 'manual' | 'whatsapp';
  created_at: string;
  updated_at: string;
}

export interface JarvisProject {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export interface JarvisProjectTask {
  id: string;
  tenant_id: string;
  project_id: string;
  task_id: string;
  created_at: string;
  task?: JarvisTask;
}

export interface JarvisProjectChecklistItem {
  id: string;
  tenant_id: string;
  project_item_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JarvisProjectItem {
  id: string;
  tenant_id: string;
  project_id: string;
  stage_id: string;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  checklist_items?: JarvisProjectChecklistItem[];
}

export interface JarvisProjectStage {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: JarvisProjectItem[];
}

export interface JarvisEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'cancelled' | 'completed';
  google_calendar_id?: string | null;
  google_event_id?: string | null;
  source: 'manual' | 'google';
  created_at: string;
  updated_at: string;
}

export interface JarvisHabit {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  times_per_cadence: number;
  target_type: 'count' | 'duration';
  target_value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Calculated fields (joined from logs)
  currentStreak?: number;
  completionsThisPeriod?: number;
}

export interface JarvisHabitLog {
  id: string;
  tenant_id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  value: number;
  created_at: string;
}

export interface JarvisReminder {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  remind_at: string;
  channel: 'whatsapp' | 'email' | 'push';
  status: 'pending' | 'sent' | 'dismissed' | 'canceled';
  created_at: string;
  updated_at: string;
}

export interface JarvisMemoryItem {
  id: string;
  tenant_id: string;
  user_id: string;
  kind: string;
  title?: string | null;
  content: string;
  metadata: Record<string, unknown>;
  source: string;
  created_at: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

// Type helpers
export type TaskStatus = 'open' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type HabitCadence = 'daily' | 'weekly' | 'monthly';
export type ReminderChannel = 'whatsapp' | 'email' | 'push';
export type ReminderStatus = 'pending' | 'sent' | 'dismissed' | 'canceled';
export type EventStatus = 'scheduled' | 'cancelled' | 'completed';
export type OnboardingStep = 'welcome' | 'profile' | 'goals' | 'wallet_setup' | 'category_review' | 'first_habit' | 'complete';

export interface JarvisUserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name?: string | null;
  nickname?: string | null;
  birth_date?: string | null;
  timezone: string;
  locale: string;
  onboarding_completed: boolean;
  onboarding_step: OnboardingStep;
  preferences: Record<string, unknown>;
  last_interaction_at?: string | null;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface GoogleIntegration {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expiry: string | null;
  scope: string | null;
  last_sync_at: string | null;
  sync_token: string | null;
  created_at: string;
  updated_at: string;
}
