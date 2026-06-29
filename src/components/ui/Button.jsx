import { cn } from "@/utils/cn";

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  ghost: "text-ink hover:bg-black/5",
  outline: "border border-border text-ink hover:bg-black/5",
  danger: "bg-danger text-white hover:bg-red-700",
};

export function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
