import { useEffect, useState } from "react";
import ReviewsGrid from "@/components/ReviewsGrid";
import { Button, Modal, PageHeader } from "@/components/ui";
import { PlusIcon, StarIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { services } from "@/data";
import { getReviews, addReview } from "@/features/reviews";
import { useI18n } from "@/i18n";

// Інтерактивний вибір оцінки зірками.
function RatingPicker({ value, onChange }) {
  return (
    <div className="mt-1 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={String(i)}
        >
          <StarIcon
            width={24}
            height={24}
            className={cn(i <= value ? "text-amber-400" : "text-border")}
          />
        </button>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [serviceId, setServiceId] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Завантажуємо відгуки з сервера при відкритті сторінки.
  useEffect(() => {
    let alive = true;
    getReviews()
      .then((data) => alive && setItems(data))
      .catch(() => alive && setLoadError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

  function resetForm() {
    setName("");
    setRating(5);
    setServiceId("");
    setText("");
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedText = text.trim();
    if (!trimmedName || !trimmedText || submitting) return;

    setSubmitting(true);
    setFormError("");
    try {
      // Сервер повертає створений відгук (уже у форматі для показу) — додаємо його зверху.
      const created = await addReview({
        name: trimmedName,
        rating,
        serviceId: serviceId || undefined,
        text: trimmedText,
      });
      setItems((prev) => [created, ...prev]);
      resetForm();
      setOpen(false);
    } catch {
      setFormError(t("reviews.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow={t("clinic.specialty")}
          title={t("reviews.title")}
          subtitle={t("reviews.subtitle")}
        />
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <PlusIcon width={18} height={18} />
          {t("reviews.add")}
        </Button>
      </div>

      <div className="mt-10">
        {loading ? (
          <p className="py-16 text-center text-muted">{t("reviews.loading")}</p>
        ) : loadError ? (
          <p className="py-16 text-center text-danger">{t("reviews.loadError")}</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("reviews.empty")}</p>
        ) : (
          <ReviewsGrid items={items} />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("reviews.addTitle")}
        className="sm:max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formName")}</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder={t("reviews.formNamePh")}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formRating")}</label>
            <RatingPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted">
              {t("reviews.formService")}
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-muted">
                {t("booking.optional")}
              </span>
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={inputCls}
            >
              <option value="">{t("reviews.formServiceNone")}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(`service.${s.id}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formText")}</label>
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={cn(inputCls, "resize-none")}
              placeholder={t("reviews.formTextPh")}
            />
          </div>

          {formError && <p className="text-sm font-medium text-danger">{formError}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              {t("common.cancel")}
            </button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("reviews.submitting") : t("reviews.submit")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
