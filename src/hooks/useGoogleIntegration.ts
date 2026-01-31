import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { GoogleIntegration } from "@/types/jarvis";

export const useGoogleIntegration = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["google-integration", tenantId, user?.id];

  // Buscar integração existente
  const { data: integration, isLoading } = useQuery({
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

  // Status derivado
  const isConnected = !!integration?.access_token;
  
  // Placeholder: Iniciar conexão (será OAuth real no futuro)
  const initiateConnection = useMutation({
    mutationFn: async () => {
      // Por enquanto, apenas mostra toast informativo
      throw new Error("OAuth ainda não implementado");
    },
    onError: () => {
      toast({ 
        title: "Em desenvolvimento", 
        description: "A conexão com Google Calendar será ativada em breve.",
      });
    },
  });

  // Desconectar (limpar tokens)
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Google Calendar desconectado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao desconectar", description: error.message, variant: "destructive" });
    },
  });

  return {
    integration,
    isLoading,
    isConnected,
    initiateConnection,
    disconnect,
    connectedEmail: integration?.email || null,
  };
};
