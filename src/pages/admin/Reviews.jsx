import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { StarIcon, TelegramIcon } from "@/components/icons";
import { getAdminReviews, deleteReview } from "@/features/admin";
import { dateLong } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

const FILTERS = ["all", "site", "telegram"];

// Відгуки пацієнтів (із сайту й із Telegram-бота): огляд і прибирання небажаних.
// Про кожен новий відгук лікар і так дізнається в боті — тут повна картина.
export default function AdminReviews() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setList(await getAdminReviews());
  }
  useEffect(() => {
    let alive = true;
    getAdminReviews()
      .then((data) => alive && setList(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { all: list.length, site: 0, telegram: 0 };
    for (const r of list) c[r.source === "telegram" ? "telegram" : "site"]++;
    return c;
  }, [list]);
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const rows = list.filter((r) => filter === "all" || (r.source === "telegram" ? "telegram" : "site") === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("adminReviews.title")}</h2>
          <p className="text-sm text-muted">{t("adminReviews.subtitle")}</p>
        </div>
        {list.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars rating={Math.round(avg)} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted">· {t("adminReviews.count", { n: list.length })}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f ? "bg-brand-500 text-white" : "border border-border text-muted hover:text-ink",
            )}
          >
            {t(`adminReviews.f_${f}`)}
            <span className={cn("rounded-full px-1.5 text-xs", filter === f ? "bg-white/20" : "bg-black/5")}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted">{t("appt.loading")}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted">{t("adminReviews.empty")}</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <ReviewCard key={r.id} review={r} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} width={15} height={15} className={i <= rating ? "text-amber-400" : "text-border"} />
      ))}
    </span>
  );
}

function ReviewCard({ review: r, onDeleted }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteReview(r.id);
      await onDeleted();
    } catch (e) {
      setError(e.message || t("adminReviews.deleteError"));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {r.serviceId ? `${t(`service.${r.serviceId}`)} · ` : ""}
            {dateLong(r.createdAt)}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            r.source === "telegram"
              ? "bg-sky-50 text-sky-700 ring-sky-200"
              : "bg-black/[0.03] text-muted ring-border",
          )}
        >
          {r.source === "telegram" && <TelegramIcon width={12} height={12} />}
          {t(`adminReviews.src_${r.source === "telegram" ? "telegram" : "site"}`)}
        </span>
      </div>

      <div className="mt-3">
        <Stars rating={r.rating} />
      </div>
      <p className="mt-2 flex-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink/80">«{r.text}»</p>

      <div className="mt-4 border-t border-border pt-3">
        {asking ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-700">{t("adminReviews.deleteQ")}</span>
            <Button variant="danger" disabled={busy} onClick={remove}>
              {t("adminReviews.deleteYes")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setAsking(false)}>
              {t("dash.back")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setAsking(true)} className="text-danger hover:bg-red-50">
            {t("adminReviews.delete")}
          </Button>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    </Card>
  );
}
