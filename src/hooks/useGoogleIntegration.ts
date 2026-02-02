import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { GoogleIntegration } from "@/types/jarvis";

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const useGoogleIntegration = () => {
  const { tenantId } = useTenant();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const queryKey = ["google-integration", tenantId, user?.id];

  // Fetch existing integration
  const { data: integration, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !user) return null;
      
      const { data, error } = await supabase
        .from("ff_integrations_google")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as GoogleIntegration | null;
    },
    enabled: !!tenantId && !!user,
  });

  // Handle OAuth callback (check for code in URL)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      // Clean up URL params
      if (code || error) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }

      if (error) {
        toast({
          title: "Erro na autorização",
          description: error === "access_denied" 
            ? "Você cancelou a autorização do Google Calendar"
            : `Erro: ${error}`,
          variant: "destructive",
        });
        return;
      }

      if (!code || !tenantId || !user) return;

      // Verify state matches
      const savedState = sessionStorage.getItem("google_oauth_state");
      if (state !== savedState) {
        console.error("State mismatch", { state, savedState });
        return;
      }
      sessionStorage.removeItem("google_oauth_state");

      try {
        toast({ title: "Conectando ao Google Calendar..." });

        const response = await supabase.functions.invoke("ff-google-oauth-callback", {
          body: {
            code,
            tenant_id: tenantId,
            user_id: user.id,
            redirect_uri: `${window.location.origin}/jarvis/settings`,
          },
        });

        if (response.error) throw response.error;

        toast({
          title: "Google Calendar conectado!",
          description: `Sincronizado com ${response.data.email}`,
        });

        // Refetch integration and trigger sync
        await refetch();
        triggerSync();
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        toast({
          title: "Erro ao conectar",
          description: err.message || "Tente novamente",
          variant: "destructive",
        });
      }
    };

    handleOAuthCallback();
  }, [tenantId, user]);

  // Derived status
  const isConnected = !!integration?.access_token;

  // Initiate OAuth connection
  const initiateConnection = useMutation({
    mutationFn: async () => {
      // Get Google Client ID from environment or edge function
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        throw new Error("Google Client ID não configurado. Configure VITE_GOOGLE_CLIENT_ID.");
      }

      // Generate state for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem("google_oauth_state", state);

      // Build OAuth URL
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/jarvis/settings`,
        response_type: "code",
        scope: GOOGLE_SCOPES,
        access_type: "offline",
        prompt: "consent",
        state,
      });

      // Redirect to Google OAuth
      window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disconnect (clear tokens)
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error("Nenhuma integração encontrada");
      
      const { error } = await supabase
        .from("ff_integrations_google")
        .update({
          access_token: null,
          refresh_token: null,
          expiry: null,
          email: null,
          sync_token: null,
          last_sync_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Google Calendar desconectado" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao desconectar", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Trigger sync
  const triggerSync = async () => {
    if (!tenantId || !session?.access_token || isSyncing) return;

    setIsSyncing(true);
    try {
      const response = await supabase.functions.invoke("ff-google-calendar-sync", {
        body: { tenant_id: tenantId },
      });

      if (response.error) throw response.error;

      const { imported, updated, deleted, unchanged } = response.data;
      
      // Invalidate events query to refresh UI
      queryClient.invalidateQueries({ queryKey: ["jarvis-events", tenantId] });
      await refetch();

      const changes = imported + updated + deleted;
      if (changes > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${imported} importados, ${updated} atualizados, ${deleted} removidos`,
        });
      } else {
        toast({ title: "Calendário já sincronizado" });
      }

      return response.data;
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({
        title: "Erro na sincronização",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Format last sync time
  const getLastSyncLabel = () => {
    if (!integration?.last_sync_at) return null;
    
    const lastSync = new Date(integration.last_sync_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "agora mesmo";
    if (diffMinutes < 60) return `há ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    
    return `há ${Math.floor(diffHours / 24)} dias`;
  };

  return {
    integration,
    isLoading,
    isConnected,
    isSyncing,
    initiateConnection,
    disconnect,
    triggerSync,
    connectedEmail: integration?.email || null,
    lastSyncLabel: getLastSyncLabel(),
    lastSyncAt: integration?.last_sync_at ? new Date(integration.last_sync_at) : null,
  };
};
