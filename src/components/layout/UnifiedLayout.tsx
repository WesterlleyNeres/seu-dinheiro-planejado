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
  const mobileInsetsStyle = isMobile
    ? {
        paddingTop: "calc(var(--mobile-header-height) + var(--safe-area-top))",
        paddingBottom: "calc(var(--mobile-nav-height) + var(--safe-area-bottom))",
      }
    : undefined;

  // Fallback skeleton se tenant ainda não carregou
  if (tenantLoading) {
    return <TenantLoadingFallback />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Desktop: Sidebar fixa */}
      {!isMobile && <UnifiedSidebar />}

      {/* Mobile: Header com hamburger */}
      {isMobile && <MobileHeader />}

      {/* Tour Overlay */}
      <TourOverlay />

      {/* Conteúdo principal */}
      <main
        className={cn(
          "min-h-[100dvh] w-full overflow-x-hidden",
          isMobile
            ? "px-4" // spacing handled via safe-area-aware inline styles
            : "pl-64 pr-4 py-6" // sidebar padding + right padding
        )}
        style={mobileInsetsStyle}
      >
        <div className="max-w-full">
          {children}
        </div>
      </main>

      {/* Mobile: Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};
