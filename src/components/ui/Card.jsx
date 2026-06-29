import { cn } from "@/utils/cn";

export function Card({ children, className = "" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      {children}
    </div>
  );
}
