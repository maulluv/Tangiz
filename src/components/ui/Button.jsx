import { cn } from "@/utils/cn";

const variants = {
  primary:
    "bg-brand-500 text-white shadow-[var(--shadow-brand)] hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0",
  ghost: "text-ink hover:bg-black/5",
  outline:
    "border border-border bg-surface text-ink hover:border-brand-200 hover:bg-brand-50/40 hover:-translate-y-0.5 active:translate-y-0",
  danger: "bg-danger text-white hover:bg-red-700",
};

export function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
