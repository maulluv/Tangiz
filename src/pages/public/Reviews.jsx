import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReviewsGrid from "@/components/ReviewsGrid";
import { Button, Modal, PageHeader } from "@/components/ui";
import { PlusIcon, StarIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { getReviews, getReviewEligibility, addReview } from "@/features/reviews";
import { deleteReview } from "@/features/admin";
import { useAuth } from "@/features/auth";
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
            width={26}
            height={26}
            className={cn(i <= value ? "text-amber-400" : "text-border")}
          />
        </button>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { t } = useI18n();
  const { user, isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);

  // На які послуги клієнт має право залишити відгук (де був).
  const [attended, setAttended] = useState([]);

  const [rating, setRating] = useState(5);
  const [serviceId, setServiceId] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isClient = !!user && !isOwner;
  const canReview = isClient && attended.length > 0;

  // Список відгуків.
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

  // Право на відгук + послуги, на яких клієнт був.
  useEffect(() => {
    if (!isClient) {
      setAttended([]);
      return;
    }
    let alive = true;
    getReviewEligibility()
      .then((r) => alive && setAttended(r.serviceIds || []))
      .catch(() => alive && setAttended([]));
    return () => {
      alive = false;
    };
  }, [isClient]);

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

  function openAdd() {
    setRating(5);
    setServiceId(attended[0] ?? "");
    setText("");
    setFormError("");
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || !serviceId || submitting) return;

    setSubmitting(true);
    setFormError("");
    try {
      const created = await addReview({ rating, serviceId, text: trimmedText });
      setItems((prev) => [created, ...prev]);
      setOpen(false);
    } catch (err) {
      setFormError(err.message || t("reviews.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  // Видалення відгуку власником (модерація спаму).
  async function handleDelete(id) {
    await deleteReview(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  // Керуючий елемент праворуч від заголовка: кнопка / підказка.
  function AddControl() {
    if (isOwner) return null;
    if (canReview) {
      return (
        <Button onClick={openAdd} className="shrink-0">
          <PlusIcon width={18} height={18} />
          {t("reviews.add")}
        </Button>
      );
    }
    if (user) {
      return <p className="text-sm text-muted">{t("reviews.needVisit")}</p>;
    }
    return (
      <Link
        to="/login"
        className="text-sm font-medium text-brand-700 hover:text-brand-600"
      >
        {t("reviews.loginToAdd")}
      </Link>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-6 sm:py-8 lg:flex-1">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow={t("clinic.specialty")}
          title={t("reviews.title")}
          subtitle={t("reviews.subtitle")}
        />
        <AddControl />
      </div>

      <div className="mt-6 flex flex-col lg:flex-1">
        {loading ? (
          <p className="py-16 text-center text-muted lg:my-auto">{t("reviews.loading")}</p>
        ) : loadError ? (
          <p className="py-16 text-center text-danger lg:my-auto">{t("reviews.loadError")}</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-muted lg:my-auto">{t("reviews.empty")}</p>
        ) : (
          <ReviewsGrid items={items} canDelete={isOwner} onDelete={handleDelete} />
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("reviews.addTitle")}
        className="sm:max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          {/* Ім'я — з профілю (не редагується) */}
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
            <span className="text-muted">{t("reviews.fromName")}:</span>
            <span className="font-medium">{user?.name}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formRating")}</label>
            <RatingPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formService")}</label>
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={inputCls}
            >
              {attended.map((id) => (
                <option key={id} value={id}>
                  {t(`service.${id}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted">{t("reviews.formText")}</label>
            <textarea
              required
              autoFocus
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
