import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TenantSwitcher } from "@/components/tenant/TenantSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  PieChart,
  Target,
  TrendingUp,
  LogOut,
  Tag,
  Wallet,
  LineChart,
  Settings,
  ArrowLeftRight,
  Upload,
  HelpCircle,
  Brain,
  CheckSquare,
  CalendarDays,
  Repeat,
  Bell,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/jarvis-helpers";

const jarvisNavigation = [
  { name: "Início", href: "/jarvis", icon: Brain },
  { name: "Chat", href: "/jarvis/chat", icon: MessageCircle },
  { name: "Tarefas", href: "/jarvis/tasks", icon: CheckSquare },
  { name: "Agenda", href: "/jarvis/calendar", icon: CalendarDays },
  { name: "Hábitos", href: "/jarvis/habits", icon: Repeat },
  { name: "Lembretes", href: "/jarvis/reminders", icon: Bell },
  { name: "Memória", href: "/jarvis/memory", icon: Lightbulb },
];

const financesNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/transactions", icon: Receipt },
  { name: "Categorias", href: "/categories", icon: Tag },
  { name: "Carteiras", href: "/wallets", icon: Wallet },
  { name: "Transferências", href: "/transfers", icon: ArrowLeftRight },
  { name: "Calendário", href: "/calendar", icon: Calendar },
  { name: "Orçamento", href: "/budget", icon: PieChart },
  { name: "Metas", href: "/goals", icon: Target },
  { name: "Investimentos", href: "/investments", icon: LineChart },
  { name: "Relatórios", href: "/reports", icon: TrendingUp },
  { name: "Importar", href: "/import", icon: Upload },
  { name: "Ajuda (FAQ)", href: "/faq", icon: HelpCircle },
];

const systemNavigation = [
  { name: "Configurações", href: "/settings", icon: Settings },
];

interface NavItemProps {
  item: { name: string; href: string; icon: React.ElementType };
  isActive: boolean;
}

const NavItem = ({ item, isActive }: NavItemProps) => (
  <Link
    to={item.href}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )}
  >
    <item.icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{item.name}</span>
  </Link>
);

interface NavSectionProps {
  title: string;
  items: { name: string; href: string; icon: React.ElementType }[];
  currentPath: string;
}

const NavSection = ({ title, items, currentPath }: NavSectionProps) => (
  <div className="space-y-1">
    <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {title}
    </p>
    {items.map((item) => (
      <NavItem 
        key={item.href} 
        item={item} 
        isActive={currentPath === item.href || (item.href !== '/jarvis' && currentPath.startsWith(item.href + '/'))} 
      />
    ))}
  </div>
);

export const UnifiedSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, user } = useAuth();
  
  const initials = getInitials(user?.email || user?.user_metadata?.full_name || "");

  return (
    <aside 
      data-tour="sidebar"
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <img src="/favicon.svg" alt="FRACTTO FLOW" className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">FRACTTO FLOW</span>
            <span className="text-xs text-muted-foreground">Suas finanças, peça por peça</span>
          </div>
        </div>

        {/* Tenant Switcher */}
        <div className="border-b border-border px-4 py-2">
          <TenantSwitcher variant="sidebar" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
          {/* JARVIS Section */}
          <NavSection
            title="Assistente"
            items={jarvisNavigation}
            currentPath={currentPath}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Finanças Section */}
          <NavSection
            title="Finanças"
            items={financesNavigation}
            currentPath={currentPath}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Settings Section */}
          <NavSection
            title="Sistema"
            items={systemNavigation}
            currentPath={currentPath}
          />
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3 rounded-lg bg-muted px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Conectado como</p>
              <p className="truncate text-sm font-medium">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
};
