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

export interface GoogleIntegration {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expiry: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}
