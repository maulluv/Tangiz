import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

const statusCls = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-brand-50 text-brand-700 ring-brand-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  canceled: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusCls[status],
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
