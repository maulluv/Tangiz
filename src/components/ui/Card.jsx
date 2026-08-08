import { cn } from "@/utils/cn";

export function Card({ children, className = "", hover = false }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]",
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
