import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Tenant, TenantMember } from "@/types/jarvis";

interface TenantWithMembership extends TenantMember {
  tenants: Tenant;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  membership: TenantMember | null;
  allTenants: Tenant[];
  allMemberships: TenantMember[];
  loading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => void;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const extractFirstName = (user: { email?: string; user_metadata?: { full_name?: string } }): string => {
  const fullName = user.user_metadata?.full_name;
  if (fullName) return fullName.split(" ")[0];
  return user.email?.split("@")[0] || "Usuário";
};

const getStorageKey = (userId: string) => `ff_active_tenant_${userId}`;

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [membership, setMembership] = useState<TenantMember | null>(null);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [allMemberships, setAllMemberships] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setTenant(null);
    setMembership(null);
    setAllTenants([]);
    setAllMemberships([]);
    setLoading(false);
    setError(null);
  }, []);

  const fetchUserTenants = useCallback(async () => {
    if (!user) {
      resetState();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar TODAS as memberships do usuário com JOIN em tenants
      const { data: membershipData, error: membershipError } = await supabase
        .from("tenant_members")
        .select("*, tenants(*)")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      if (membershipData && membershipData.length > 0) {
        // 2. Extrair tenants e memberships
        const memberships = membershipData as TenantWithMembership[];
        const tenants = memberships.map(m => m.tenants).filter(Boolean);
        const membershipsOnly: TenantMember[] = memberships.map(({ tenants: _, ...m }) => m as TenantMember);

        // 3. Restaurar último tenant do localStorage ou usar primeiro
        const savedTenantId = localStorage.getItem(getStorageKey(user.id));
        const activeTenant = tenants.find(t => t.id === savedTenantId) || tenants[0];
        const activeMembership = membershipsOnly.find(m => m.tenant_id === activeTenant?.id) || null;

        setAllTenants(tenants);
        setAllMemberships(membershipsOnly);
        setTenant(activeTenant || null);
        setMembership(activeMembership);

        // Salvar no localStorage se não existia
        if (activeTenant && !savedTenantId) {
          localStorage.setItem(getStorageKey(user.id), activeTenant.id);
        }
      } else {
        // 4. Criar novo tenant com nome personalizado
        const firstName = extractFirstName(user);
        const tenantName = `Pessoal - ${firstName}`;

        const { data: newTenant, error: createTenantError } = await supabase
          .from("tenants")
          .insert({
            name: tenantName,
            created_by: user.id,
          })
          .select()
          .single();

        if (createTenantError) throw createTenantError;

        // 5. Adicionar usuário como owner
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

        const tenantTyped = newTenant as Tenant;
        const membershipTyped = newMembership as TenantMember;

        setAllTenants([tenantTyped]);
        setAllMemberships([membershipTyped]);
        setTenant(tenantTyped);
        setMembership(membershipTyped);
        
        localStorage.setItem(getStorageKey(user.id), tenantTyped.id);
      }
    } catch (err) {
      console.error("Erro ao carregar tenants:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [user, resetState]);

  const switchTenant = useCallback((tenantId: string) => {
    const newTenant = allTenants.find(t => t.id === tenantId);
    const newMembership = allMemberships.find(m => m.tenant_id === tenantId);
    
    if (newTenant && user) {
      setTenant(newTenant);
      setMembership(newMembership || null);
      localStorage.setItem(getStorageKey(user.id), tenantId);
      
      // Invalidar todas as queries para recarregar dados do novo tenant
      queryClient.invalidateQueries();
    }
  }, [allTenants, allMemberships, user, queryClient]);

  useEffect(() => {
    fetchUserTenants();
  }, [fetchUserTenants]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId: tenant?.id ?? null,
        membership,
        allTenants,
        allMemberships,
        loading,
        error,
        switchTenant,
        refetch: fetchUserTenants,
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
