import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/jarvis-helpers";
import { MobileSidebar } from "./MobileSidebar";

export function MobileHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const initials = getInitials(user?.email || user?.user_metadata?.full_name || "");

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="FRACTTO" className="h-8 w-8" />
            <span className="font-semibold text-sm">FRACTTO</span>
          </div>

          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </>
  );
}
