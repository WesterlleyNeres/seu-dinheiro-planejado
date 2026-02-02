import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep = 
  | "welcome" 
  | "profile" 
  | "goals" 
  | "wallet_setup" 
  | "category_review" 
  | "first_habit" 
  | "complete";

export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  nickname: string | null;
  full_name: string | null;
  birth_date: string | null;
  timezone: string;
  locale: string;
  preferences: Record<string, unknown>;
  onboarding_completed: boolean;
  onboarding_step: string | null;
  interaction_count: number;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnboarding() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  // Query para buscar perfil do usuário
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["user-profile", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from("ff_user_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data as UserProfile | null;
    },
    enabled: !!tenantId,
  });

  const needsOnboarding = !isLoading && (!profile || !profile.onboarding_completed);
  const currentStep = (profile?.onboarding_step as OnboardingStep) || "welcome";
  const isNewUser = !profile || profile.interaction_count === 0;

  return {
    profile,
    isLoading,
    needsOnboarding,
    currentStep,
    isNewUser,
    refetch,
  };
}
