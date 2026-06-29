import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";
import { Card } from "./Card";

export function StatCard({ label, value, delta, icon }) {
  const { t } = useI18n();
  const positive = delta?.startsWith("+");
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="text-brand-500">{icon}</span>}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {delta && (
        <div
          className={cn(
            "mt-1 text-xs font-medium",
            positive ? "text-success" : "text-danger",
          )}
        >
          {delta} <span className="text-muted">{t("dash.perMonth")}</span>
        </div>
      )}
    </Card>
  );
}
