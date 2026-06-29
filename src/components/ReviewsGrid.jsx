import { Card } from "@/components/ui";
import { StarIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { reviews } from "@/data";
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

export default function ReviewsGrid({ limit }) {
  const { lang } = useI18n();
  const list = limit ? reviews.slice(0, limit) : reviews;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((r) => (
        <Card key={r.id} className="flex flex-col p-5">
          <Stars rating={r.rating} />
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
            “{r.text[lang]}”
          </p>
          <div className="mt-4 text-sm font-medium">{r.name}</div>
        </Card>
      ))}
    </div>
  );
}
