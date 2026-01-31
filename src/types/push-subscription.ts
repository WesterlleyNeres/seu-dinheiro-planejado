export interface PushSubscriptionRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_active: boolean;
}
