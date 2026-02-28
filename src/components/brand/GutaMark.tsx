import { useId } from "react";
import { cn } from "@/lib/utils";

interface GutaMarkProps {
  className?: string;
}

export const GutaMark = ({ className }: GutaMarkProps) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-5 w-5", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gradientId}-guta`} x1="6" y1="6" x2="58" y2="58">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="hsl(var(--primary))" opacity="0.12" />
      <circle cx="32" cy="32" r="30" stroke={`url(#${gradientId}-guta)`} strokeWidth="2" />

      <path
        d="M18 28c0-9 6.2-16 14-16s14 7 14 16c0 6-2.2 9.8-5.4 12.8-1.6-4.2-5.8-7-8.6-7s-7 2.8-8.6 7C20.2 37.8 18 34 18 28z"
        fill={`url(#${gradientId}-guta)`}
      />

      <circle cx="32" cy="29" r="8" fill="#F3E4D0" />

      <path
        d="M14 54c3-10 11.2-15 18-15s15 5 18 15"
        fill={`url(#${gradientId}-guta)`}
      />
    </svg>
  );
};
