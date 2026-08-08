import { Card } from "@/components/ui";
import { StarIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={cn(i <= rating ? "text-amber-400" : "text-border")} />
      ))}
    </div>
  );
}

export default function ReviewsGrid({ limit, items = [] }) {
  const { t, lang } = useI18n();
  const list = limit ? items.slice(0, limit) : items;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((r) => (
        <Card key={r.id} hover className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <Stars rating={r.rating} />
            <span className="font-serif text-4xl leading-none text-brand-100">”</span>
          </div>
          {r.serviceId && (
            <span className="mt-3 inline-flex w-fit rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              {t(`service.${r.serviceId}`)}
            </span>
          )}
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/80">
            {r.text[lang]}
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {r.name.trim().charAt(0)}
            </span>
            <span className="text-sm font-medium">{r.name}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
