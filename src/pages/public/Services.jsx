import { useEffect, useState } from "react";
import ServicesGrid from "@/components/ServicesGrid";
import { PageHeader } from "@/components/ui";
import { getAvailability } from "@/features/booking";
import { useI18n } from "@/i18n";

export default function Services() {
  const { t } = useI18n();
  const [availability, setAvailability] = useState({});

  // Тягнемо вільні слоти з сервера — щоб бейдж «є місця / немає» був актуальним.
  useEffect(() => {
    getAvailability()
      .then(setAvailability)
      .catch(() => setAvailability({}));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader
        eyebrow={t("clinic.specialty")}
        title={t("services.title")}
        subtitle={t("services.subtitle")}
      />
      <div className="mt-10">
        <ServicesGrid availability={availability} />
      </div>
    </div>
  );
}
