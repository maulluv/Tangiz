import { Card } from "@/components/ui";
import { availability, services } from "@/data";
import { uah } from "@/utils/format";
import { useI18n } from "@/i18n";

export default function ServicesGrid({ limit }) {
  const { t } = useI18n();
  const list = limit ? services.slice(0, limit) : services;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s) => {
        const open = (availability[s.id] ?? []).length > 0;
        return (
          <Card key={s.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">{t(`service.${s.id}`)}</div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  open
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {open ? t("services.available") : t("services.full")}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {t(`service.${s.id}desc`)}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted">
                {t("landing.minutes", { n: s.durationMin })}
              </span>
              <span className="text-lg font-semibold text-brand-700">
                {uah(s.price)}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
