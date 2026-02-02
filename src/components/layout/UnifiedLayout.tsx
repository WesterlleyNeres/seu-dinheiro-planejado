import { ReactNode } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { TenantLoadingFallback } from "@/components/tenant/TenantLoadingFallback";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface UnifiedLayoutProps {
  children: ReactNode;
}

export const UnifiedLayout = ({ children }: UnifiedLayoutProps) => {
  const { loading: tenantLoading } = useTenant();
  const isMobile = useIsMobile();

  // Fallback skeleton se tenant ainda não carregou
  if (tenantLoading) {
    return <TenantLoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Sidebar fixa */}
      {!isMobile && <UnifiedSidebar />}

      {/* Mobile: Header com hamburger */}
      {isMobile && <MobileHeader />}

      {/* Tour Overlay */}
      <TourOverlay />

      {/* Conteúdo principal */}
      <main
        className={cn(
          "min-h-screen",
          isMobile
            ? "pt-14 pb-20 px-4" // space for header + bottom nav
            : "pl-64 p-6" // sidebar padding
        )}
      >
        {children}
      </main>

      {/* Mobile: Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};
