import { Link, useLocation } from "react-router-dom";
import {
  Brain,
  CheckSquare,
  CalendarDays,
  Repeat,
  Bell,
  Settings,
  Wallet,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const jarvisNav = [
  { icon: Brain, label: "Início", href: "/jarvis" },
  { icon: CheckSquare, label: "Tarefas", href: "/jarvis/tasks" },
  { icon: CalendarDays, label: "Agenda", href: "/jarvis/calendar" },
  { icon: Repeat, label: "Hábitos", href: "/jarvis/habits" },
  { icon: Bell, label: "Lembretes", href: "/jarvis/reminders" },
  { icon: Lightbulb, label: "Memória", href: "/jarvis/memory" },
  { icon: Settings, label: "Configurações", href: "/jarvis/settings" },
];

export const JarvisSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <Link to="/jarvis" className="group">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2 p-3">
        {jarvisNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Finance toggle */}
      <div className="border-t border-border p-3">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Wallet className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Finanças
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};
