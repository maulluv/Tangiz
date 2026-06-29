import { useEffect } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

// Reusable модалка (Paddle-стиль): затемнення, центр, Esc / клік-поза-нею.
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
