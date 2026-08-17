import { useEffect } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

// Модалка: на мобільному — bottom-sheet із «ручкою», на десктопі — центрована картка.
// Esc / клік по підкладці / кнопка закриття.
export function Modal({ open, onClose, title, children, className = "" }) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="animate-overlay-in absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-sheet-in relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[0_-10px_50px_-12px_rgba(15,17,21,0.3)] sm:max-h-[90vh] sm:rounded-2xl sm:shadow-2xl",
          className,
        )}
      >
        {/* Ручка (тільки мобільний) */}
        <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-ink"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
