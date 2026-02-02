import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";

interface OnboardingGuardProps {
  children: ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const location = useLocation();
  const { needsOnboarding, isLoading } = useOnboarding();

  // Rotas permitidas durante onboarding
  const allowedRoutes = ["/jarvis/chat", "/jarvis/settings", "/settings"];
  const isAllowedRoute = allowedRoutes.some(route => location.pathname.startsWith(route));

  if (isLoading) {
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
