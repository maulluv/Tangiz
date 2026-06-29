import ReviewsGrid from "@/components/ReviewsGrid";
import { useI18n } from "@/i18n";

export default function Reviews() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("reviews.title")}
      </h1>
      <p className="mt-2 text-muted">{t("reviews.subtitle")}</p>
      <div className="mt-8">
        <ReviewsGrid />
      </div>
    </div>
  );
}
