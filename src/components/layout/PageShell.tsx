import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const PageShell = ({ children, className, ...props }: PageShellProps) => (
  <div
    className={cn("mx-auto w-full max-w-6xl space-y-4 sm:space-y-6", className)}
    {...props}
  >
    {children}
  </div>
);
