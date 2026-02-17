/// <reference types="vite/client" />

interface ServiceWorkerRegistration {
  pushManager: PushManager;
}

interface PushManager {
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  getSubscription(): Promise<PushSubscription | null>;
}
