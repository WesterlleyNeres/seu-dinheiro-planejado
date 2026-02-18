import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useWallets } from "@/hooks/useWallets";

interface OnboardingGuardProps {
  children: ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const location = useLocation();
  const { needsOnboarding, isLoading, profile } = useOnboarding();
  const { wallets, loading: walletsLoading } = useWallets();

  // Rotas permitidas durante onboarding (expandido)
  const allowedRoutes = [
    "/jarvis/chat",
    "/jarvis/settings",
    "/settings",
    "/dashboard",
    "/wallets",
    "/transactions",
    "/transfers",
    "/categories",
    "/budget",
    "/goals",
    "/calendar",
    "/investments",
    "/reports",
    "/import",
    "/faq",
    "/jarvis",
  ];
  const isAllowedRoute = allowedRoutes.some(route => location.pathname.startsWith(route));

  // FALLBACK: Se usuário já tem carteira, considerar onboarding funcional
  const hasWallets = !walletsLoading && wallets && wallets.length > 0;
  
  // Se tem carteiras, liberar acesso independente do status de onboarding
  if (hasWallets) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading || walletsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirecionar para chat se precisa de onboarding e não está em rota permitida
  if (needsOnboarding && !isAllowedRoute) {
    return <Navigate to="/jarvis/chat" replace />;
  }

  return <>{children}</>;
};
