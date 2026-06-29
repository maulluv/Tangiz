import ServicesGrid from "@/components/ServicesGrid";
import { useI18n } from "@/i18n";

export default function Services() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t("services.title")}
      </h1>
      <p className="mt-2 text-muted">{t("services.subtitle")}</p>
      <div className="mt-8">
        <ServicesGrid />
      </div>
    </div>
  );
}
