import { cn } from "@/utils/cn";

// Рамка є в кожного варіанта — у більшості прозора. Так усі кнопки однакової висоти
// (без цього `outline` на 2 px вищий і в ряду виходить «сходинка»).
// Колір рамки задає саме варіант: cn() тут просто склеює класи, без tailwind-merge,
// тож у базовому рядку кольору бути не повинно — він перебивав би `outline`.
const variants = {
  primary:
    "border-transparent bg-brand-500 text-white shadow-[var(--shadow-brand)] hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0",
  ghost: "border-transparent text-ink hover:bg-black/5",
  outline:
    "border-border bg-surface text-ink hover:border-brand-200 hover:bg-brand-50/40 hover:-translate-y-0.5 active:translate-y-0",
  danger: "border-transparent bg-danger text-white hover:bg-red-700",
};

export function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
