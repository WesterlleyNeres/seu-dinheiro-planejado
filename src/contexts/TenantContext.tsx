import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantMember } from "@/types/jarvis";

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  membership: TenantMember | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [membership, setMembership] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrCreateTenant = async () => {
    if (!user) {
      setTenant(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar membership do usuário
      const { data: membershipData, error: membershipError } = await supabase
        .from("tenant_members")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (membershipData) {
        // Usuário já tem tenant
        setMembership(membershipData as TenantMember);

        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", membershipData.tenant_id)
          .single();

        if (tenantError) throw tenantError;
        setTenant(tenantData as Tenant);
      } else {
        // Criar novo tenant para o usuário
        const { data: newTenant, error: createTenantError } = await supabase
          .from("tenants")
          .insert({
            name: "Meu Espaço JARVIS",
            created_by: user.id,
          })
          .select()
          .single();

        if (createTenantError) throw createTenantError;

        // Adicionar usuário como owner
        const { data: newMembership, error: memberError } = await supabase
          .from("tenant_members")
          .insert({
            tenant_id: newTenant.id,
            user_id: user.id,
            role: "owner",
          })
          .select()
          .single();

        if (memberError) throw memberError;

        setTenant(newTenant as Tenant);
        setMembership(newMembership as TenantMember);
      }
    } catch (err) {
      console.error("Erro ao carregar tenant:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrCreateTenant();
  }, [user]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id ?? null,
        membership,
        loading,
        error,
        refetch: fetchOrCreateTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};
