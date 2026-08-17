import { useState } from "react";
import { Button, Card, Modal } from "@/components/ui";
import { StarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useI18n } from "@/i18n";

function Stars({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          width={size}
          height={size}
          className={cn(i <= rating ? "text-amber-400" : "text-border")}
        />
      ))}
    </div>
  );
}

export default function ReviewsGrid({ items = [], canDelete = false, onDelete }) {
  const { t, lang } = useI18n();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const perPage = isDesktop ? 6 : 3;

  const [page, setPage] = useState(0);
  const [active, setActive] = useState(null); // відкритий повний відгук
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const start = safePage * perPage;
  const pageItems = items.slice(start, start + perPage);
  const placeholders = perPage - pageItems.length;

  function closeReview() {
    setActive(null);
    setConfirming(false);
  }

  async function handleDelete() {
    if (!active || deleting) return;
    setDeleting(true);
    try {
      await onDelete(active.id);
      closeReview();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:min-h-0 lg:flex-1 lg:grid-rows-2">
        {pageItems.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActive(r)}
            className="h-full w-full text-left"
          >
            <Card hover className="flex h-full min-h-[150px] cursor-pointer flex-col p-5 lg:min-h-0">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                <span className="font-serif text-3xl leading-none text-brand-100">”</span>
              </div>
              {r.serviceId && (
                <span className="mt-2.5 inline-flex w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {t(`service.${r.serviceId}`)}
                </span>
              )}
              <p className="mt-2.5 line-clamp-3 flex-1 text-[15px] leading-relaxed text-ink/80">
                {r.text[lang]}
              </p>
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-3.5">
                <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {r.name.trim().charAt(0)}
                </span>
                <span className="text-sm font-medium">{r.name}</span>
              </div>
            </Card>
          </button>
        ))}
        {/* Порожні слоти — щоб сітка завжди була «розрахована» під ряд (лише десктоп). */}
        {isDesktop &&
          Array.from({ length: placeholders }).map((_, i) => (
            <div key={`ph-${i}`} aria-hidden className="hidden h-full lg:block" />
          ))}
      </div>

      {/* Слайдер сторінок — унизу */}
      <div className="mt-5 flex shrink-0 items-center justify-center gap-4 lg:mt-6">
        <button
          type="button"
          onClick={() => setPage(Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          aria-label={t("reviews.prev")}
          className="grid size-10 place-items-center rounded-full border border-border text-muted transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
        >
          <ChevronLeftIcon width={20} height={20} />
        </button>
        <span className="min-w-[3.5rem] text-center text-sm font-medium text-muted">
          {safePage + 1} / {pages}
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
          disabled={safePage >= pages - 1}
          aria-label={t("reviews.next")}
          className="grid size-10 place-items-center rounded-full border border-border text-muted transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted"
        >
          <ChevronRightIcon width={20} height={20} />
        </button>
      </div>

      {/* Повний відгук — модалка */}
      <Modal open={!!active} onClose={closeReview} title={active?.name ?? ""} className="max-w-2xl">
        {active && (
          <div className="px-6 pb-6 pt-1 sm:px-8 sm:pb-8">
            <div className="flex items-center justify-between">
              <Stars rating={active.rating} size={20} />
              <span className="font-serif text-5xl leading-none text-brand-100">”</span>
            </div>
            {active.serviceId && (
              <span className="mt-4 inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {t(`service.${active.serviceId}`)}
              </span>
            )}
            <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink/85">
              {active.text[lang]}
            </p>
            <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-base font-semibold text-brand-700">
                {active.name.trim().charAt(0)}
              </span>
              <span className="font-medium">{active.name}</span>
            </div>

            {/* Модерація — лише для власника */}
            {canDelete && (
              <div className="mt-5 border-t border-border pt-4">
                {confirming ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-danger">
                      {t("reviews.deleteConfirm")}
                    </span>
                    <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                      {deleting ? t("reviews.submitting") : t("reviews.deleteYes")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="text-sm font-medium text-muted hover:text-ink"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirming(true)}
                    className="text-danger hover:bg-red-50"
                  >
                    {t("reviews.delete")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
