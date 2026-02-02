import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, CheckSquare, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jarvis", icon: Home, label: "Início", exact: true },
  { href: "/jarvis/chat", icon: MessageCircle, label: "Chat", exact: false },
  { href: "/jarvis/tasks", icon: CheckSquare, label: "Tarefas", exact: false },
  { href: "/dashboard", icon: LayoutDashboard, label: "Finanças", exact: false },
  { href: "/settings", icon: Settings, label: "Config", exact: false },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div
        className="flex items-center justify-around py-1"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 min-w-[60px] rounded-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-accent"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110"
                )}
              />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
