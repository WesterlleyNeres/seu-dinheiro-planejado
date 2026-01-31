import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TaskPriority, TaskStatus, HabitCadence, ReminderChannel, TenantMember } from "@/types/jarvis";

// ===========================
// Priority Helpers
// ===========================

export const priorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    low: "text-muted-foreground",
    medium: "text-amber-500",
    high: "text-destructive",
  };
  return colors[priority] || colors.medium;
};

export const priorityBgColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    low: "bg-muted/50",
    medium: "bg-amber-500/10",
    high: "bg-destructive/10",
  };
  return colors[priority] || colors.medium;
};

export const priorityLabel = (priority: TaskPriority): string => {
  const labels: Record<TaskPriority, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };
  return labels[priority] || "Média";
};

// ===========================
// Status Helpers
// ===========================

export const statusLabel = (status: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    open: "Aberta",
    in_progress: "Em Progresso",
    done: "Concluída",
  };
  return labels[status] || "Aberta";
};

export const statusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    open: "text-muted-foreground",
    in_progress: "text-primary",
    done: "text-emerald-500",
  };
  return colors[status] || colors.open;
};

// ===========================
// Cadence Helpers
// ===========================

export const cadenceLabel = (cadence: HabitCadence): string => {
  const labels: Record<HabitCadence, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };
  return labels[cadence] || "Semanal";
};

// ===========================
// Channel Helpers
// ===========================

export const channelLabel = (channel: ReminderChannel): string => {
  const labels: Record<ReminderChannel, string> = {
    whatsapp: "WhatsApp",
    email: "E-mail",
    push: "Push",
  };
  return labels[channel] || "WhatsApp";
};

export const channelIcon = (channel: ReminderChannel): string => {
  const icons: Record<ReminderChannel, string> = {
    whatsapp: "📱",
    email: "📧",
    push: "🔔",
  };
  return icons[channel] || "📱";
};

// ===========================
// Role Helpers
// ===========================

export const hasRole = (member: TenantMember | null, roles: string[]): boolean => {
  if (!member) return false;
  return roles.includes(member.role);
};

export const isOwner = (member: TenantMember | null): boolean => {
  return hasRole(member, ["owner"]);
};

export const isAdmin = (member: TenantMember | null): boolean => {
  return hasRole(member, ["owner", "admin"]);
};

// ===========================
// Date Helpers
// ===========================

export const formatRelativeDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isToday(d)) {
    return `Hoje às ${format(d, "HH:mm")}`;
  }
  if (isTomorrow(d)) {
    return `Amanhã às ${format(d, "HH:mm")}`;
  }
  if (isYesterday(d)) {
    return `Ontem às ${format(d, "HH:mm")}`;
  }
  
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  if (isYesterday(d)) return "Ontem";
  
  return format(d, "dd/MM", { locale: ptBR });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm");
};

// ===========================
// Greeting Helper
// ===========================

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
};

export const getDayOfWeek = (): string => {
  return format(new Date(), "EEEE", { locale: ptBR });
};

export const getFormattedDate = (): string => {
  return format(new Date(), "d 'de' MMMM", { locale: ptBR });
};
