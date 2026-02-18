import { useId } from "react";
import { cn } from "@/lib/utils";

interface GutaMarkProps {
  className?: string;
}

export const GutaMark = ({ className }: GutaMarkProps) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-5 w-5", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gradientId}-guta`} x1="8" y1="8" x2="40" y2="40">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="20"
        fill={`url(#${gradientId}-guta)`}
        opacity="0.18"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke={`url(#${gradientId}-guta)`}
        strokeWidth="2"
      />
      <path
        d="M15 27c3-3 15-3 18 0"
        stroke={`url(#${gradientId}-guta)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 17c4-4 12-3 14 2"
        stroke={`url(#${gradientId}-guta)`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
