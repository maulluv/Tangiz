import { Card } from "@/components/ui";
import { ClockIcon } from "@/components/icons";
import { services } from "@/data";
import { uah } from "@/utils/format";
import { useI18n } from "@/i18n";

// availability приходить із сервера (об'єкт { s1: [...] }) — передається пропом.
export default function ServicesGrid({ limit, availability = {} }) {
  const { t } = useI18n();
  const list = limit ? services.slice(0, limit) : services;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s) => {
        const open = (availability[s.id] ?? []).length > 0;
        return (
          <Card key={s.id} hover className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[17px] font-semibold tracking-tight">
                {t(`service.${s.id}`)}
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  open
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    open ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {open ? t("services.available") : t("services.full")}
              </span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {t(`service.${s.id}desc`)}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <ClockIcon width={16} height={16} />
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
