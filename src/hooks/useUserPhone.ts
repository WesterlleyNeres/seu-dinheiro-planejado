import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserPhone {
  id: string;
  tenant_id: string;
  user_id: string;
  phone_e164: string;
  display_name: string | null;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserPhone = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const queryKey = ["user-phone", tenantId, user?.id];
  
  // Buscar telefone atual
  const { data: phone, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !user) return null;
      
      const { data, error } = await supabase
        .from("ff_user_phones")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserPhone | null;
    },
    enabled: !!tenantId && !!user,
  });
  
  // Salvar/atualizar telefone
  const savePhone = useMutation({
    mutationFn: async (phoneE164: string) => {
      if (!tenantId || !user) throw new Error("Not authenticated");
      
      // Check if user already has a phone in this tenant
      const { data: existing } = await supabase
        .from("ff_user_phones")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("ff_user_phones")
          .update({
            phone_e164: phoneE164,
            verified_at: null, // Reset verification on number change
          })
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("ff_user_phones")
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            phone_e164: phoneE164,
            is_primary: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Telefone salvo!" });
    },
    onError: (err: Error) => {
      toast({ 
        title: "Erro ao salvar telefone", 
        description: err.message,
        variant: "destructive" 
      });
    },
  });
  
  // Remover telefone
  const removePhone = useMutation({
    mutationFn: async () => {
      if (!phone) throw new Error("No phone to remove");
      
      const { error } = await supabase
        .from("ff_user_phones")
        .delete()
        .eq("id", phone.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Telefone removido" });
    },
    onError: (err: Error) => {
      toast({ 
        title: "Erro ao remover telefone", 
        description: err.message,
        variant: "destructive" 
      });
    },
  });
  
  return {
    phone,
    isLoading,
    isVerified: !!phone?.verified_at,
    savePhone,
    removePhone,
  };
};
