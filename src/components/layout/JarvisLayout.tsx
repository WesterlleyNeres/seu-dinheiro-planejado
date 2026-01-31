import { ReactNode, useEffect } from "react";
import { JarvisSidebar } from "@/components/jarvis/JarvisSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JarvisLayoutProps {
  children: ReactNode;
}

export const JarvisLayout = ({ children }: JarvisLayoutProps) => {
  const { user } = useAuth();

  // Apply jarvis-theme class to body when this layout is mounted
  useEffect(() => {
    document.documentElement.classList.add("jarvis-theme");
    return () => {
      document.documentElement.classList.remove("jarvis-theme");
    };
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const userName = user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <JarvisSidebar />

      {/* Main content */}
      <div className="flex-1 pl-16">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="px-6 py-4">
            <h1 className="text-lg font-medium text-foreground">
              {greeting()}, <span className="text-primary">{userName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
