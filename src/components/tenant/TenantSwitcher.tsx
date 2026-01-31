import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantSwitcherProps {
  variant?: "header" | "sidebar";
}

export const TenantSwitcher = ({ variant = "header" }: TenantSwitcherProps) => {
  const { tenant, allTenants, switchTenant, loading } = useTenant();

  // Não renderizar se só tiver 1 tenant ou menos
  if (allTenants.length <= 1) return null;

  if (loading) {
    return (
      <Button variant="ghost" disabled className="gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-muted-foreground">Carregando...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "gap-2 font-normal",
            variant === "sidebar" && "w-full justify-start"
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[150px]">{tenant?.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Seus espaços</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allTenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => switchTenant(t.id)}
            className="gap-2 cursor-pointer"
          >
            {t.id === tenant?.id ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <span className="w-4" />
            )}
            <span className="truncate">{t.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
