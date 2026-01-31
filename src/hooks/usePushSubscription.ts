import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushSupported,
  isVapidConfigured,
  registerServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  subscribeToPush,
  getExistingSubscription,
  sendSubscriptionToSupabase,
  unsubscribeFromPush,
  updateSubscriptionLastSeen,
} from "@/lib/webpush";

interface UsePushSubscriptionReturn {
  isSupported: boolean;
  isVapidReady: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

export const usePushSubscription = (): UsePushSubscriptionReturn => {
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const [isSupported] = useState(() => isPushSupported());
  const [isVapidReady] = useState(() => isVapidConfigured());
  const [permission, setPermission] = useState<NotificationPermission>(
    () => getNotificationPermission()
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check existing subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        await registerServiceWorker();
        const existingSub = await getExistingSubscription();
        
        if (existingSub) {
          setIsSubscribed(true);
          // Update last_seen_at
          await updateSubscriptionLastSeen(existingSub.endpoint);
        }
      } catch (err) {
        console.error("Failed to check subscription:", err);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Notificações push não são suportadas neste navegador");
      return false;
    }

    if (!isVapidReady) {
      setError("Configuração de push não disponível. Contate o suporte.");
      return false;
    }

    if (!tenantId) {
      setError("Tenant não identificado");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Falha ao registrar Service Worker");
      }

      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== "granted") {
        throw new Error(
          perm === "denied"
            ? "Permissão negada. Ative nas configurações do navegador."
            : "Permissão não concedida"
        );
      }

      // Subscribe to push
      const subscription = await subscribeToPush();
      if (!subscription) {
        throw new Error("Falha ao criar subscription de push");
      }

      // Save to Supabase
      const saved = await sendSubscriptionToSupabase(tenantId, subscription);
      if (!saved) {
        throw new Error("Falha ao salvar subscription no servidor");
      }

      setIsSubscribed(true);
      toast({ title: "Notificações ativadas!", description: "Você receberá alertas de lembretes." });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      toast({ title: "Erro", description: message, variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isVapidReady, tenantId, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
        toast({ title: "Notificações desativadas" });
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao desativar";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Send test notification via edge function
  const sendTestNotification = useCallback(async (): Promise<void> => {
    if (!tenantId) {
      toast({ title: "Erro", description: "Tenant não identificado", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-test", {
        body: { tenant_id: tenantId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Notificação de teste enviada!" });
      } else {
        throw new Error(data?.error || "Falha ao enviar teste");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar teste";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, toast]);

  return {
    isSupported,
    isVapidReady,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
};
