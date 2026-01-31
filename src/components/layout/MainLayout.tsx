import { ReactNode } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { TenantLoadingFallback } from "@/components/tenant/TenantLoadingFallback";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export const MainLayout = ({ children, title }: MainLayoutProps) => {
  const { loading: tenantLoading } = useTenant();

  // Fallback skeleton se tenant ainda não carregou
  if (tenantLoading) {
    return <TenantLoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa */}
      <Sidebar />

      {/* Topbar fixa */}
      <Topbar title={title} />

      {/* Conteúdo principal */}
      <main className="pl-64 pt-14">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
