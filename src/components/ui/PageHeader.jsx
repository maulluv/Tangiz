import { cn } from "@/utils/cn";

// Розбиває заголовок так, щоб останнє слово можна було виділити акцентним курсивом.
function renderTitle(title, accentLast) {
  if (!accentLast || typeof title !== "string") return title;
  const parts = title.trim().split(" ");
  if (parts.length < 2) return <span className="accent">{title}</span>;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")} <span className="accent">{last}</span>
    </>
  );
}

// Єдина шапка публічних сторінок: маленький «eyebrow», великий заголовок
// (останнє слово опційно виділяється акцентним курсивом) і підзаголовок.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  accentLast = true,
  center = false,
  className = "",
}) {
  return (
    <div className={cn(center && "text-center", "animate-rise", className)}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/70 px-3.5 py-1.5 text-sm font-medium text-brand-700">
          <span className="size-1.5 rounded-full bg-brand-500" />
          {eyebrow}
        </span>
      )}
      <h1 className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", eyebrow && "mt-4")}>
        {renderTitle(title, accentLast)}
      </h1>
      {subtitle && (
        <p className={cn("mt-3 max-w-2xl text-base text-muted", center && "mx-auto")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
