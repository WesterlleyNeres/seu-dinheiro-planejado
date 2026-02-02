import { ReactNode } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { TenantLoadingFallback } from "@/components/tenant/TenantLoadingFallback";

interface UnifiedLayoutProps {
  children: ReactNode;
}

export const UnifiedLayout = ({ children }: UnifiedLayoutProps) => {
  const { loading: tenantLoading } = useTenant();

  // Fallback skeleton se tenant ainda não carregou
  if (tenantLoading) {
    return <TenantLoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa */}
      <UnifiedSidebar />

      {/* Conteúdo principal */}
      <main className="pl-64">
        <div className="min-h-screen p-6">{children}</div>
      </main>
    </div>
  );
};
