/**
 * Web Push Utilities for JARVIS Reminders
 * Handles Service Worker registration, permission requests, and subscription management
 */

import { supabase } from "@/integrations/supabase/client";

// VAPID Public Key - deve ser configurada como env var
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Converts a base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("Service Worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Requests notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Subscribes to push notifications using the push manager
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error("VAPID_PUBLIC_KEY not configured");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  
  try {
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
    
    console.log("Push subscription created:", subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return null;
  }
}

/**
 * Gets the current push subscription if it exists
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error("Failed to get existing subscription:", error);
    return null;
  }
}

/**
 * Sends the push subscription to Supabase for storage
 */
export async function sendSubscriptionToSupabase(
  tenantId: string,
  subscription: PushSubscription
): Promise<boolean> {
  const json = subscription.toJSON();
  
  if (!json.keys?.p256dh || !json.keys?.auth || !json.endpoint) {
    console.error("Invalid subscription data");
    return false;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    console.error("User not authenticated");
    return false;
  }

  // Upsert subscription (endpoint is unique)
  const { error } = await supabase
    .from("ff_push_subscriptions")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userData.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      },
      {
        onConflict: "endpoint",
      }
    );

  if (error) {
    console.error("Failed to save subscription:", error);
    return false;
  }

  console.log("Subscription saved to Supabase");
  return true;
}

/**
 * Deactivates a push subscription in Supabase
 */
export async function deactivateSubscription(endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from("ff_push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Failed to deactivate subscription:", error);
    return false;
  }

  return true;
}

/**
 * Updates the last_seen_at timestamp for a subscription
 */
export async function updateSubscriptionLastSeen(endpoint: string): Promise<void> {
  await supabase
    .from("ff_push_subscriptions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("endpoint", endpoint);
}

/**
 * Unsubscribes from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getExistingSubscription();
    if (!subscription) {
      return true;
    }

    // Deactivate in Supabase
    await deactivateSubscription(subscription.endpoint);

    // Unsubscribe from browser
    await subscription.unsubscribe();

    return true;
  } catch (error) {
    console.error("Failed to unsubscribe:", error);
    return false;
  }
}

/**
 * Checks if push notifications are fully supported
 */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Checks if VAPID key is configured
 */
export function isVapidConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 0;
}
