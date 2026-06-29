import { useMemo } from "react";
import { ArrowUpIcon, CalendarIcon, ChartIcon, UsersIcon } from "@/components/icons";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import { revenueByMonth } from "@/data";
import { getAppointments, getClients } from "@/features/admin";
import { dateTime, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

// Порядок місяців → індекс Date.getMonth() для розкладання живого доходу.
const MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export default function Dashboard() {
  const { t } = useI18n();

  // Дані зі стору беремо один раз на монтування; перехід між сторінками
  // адмінки ремонтує компонент, тож статистика завжди свіжа.
  const { appointments, clients } = useMemo(
    () => ({ appointments: getAppointments(), clients: getClients() }),
    [],
  );

  const completed = appointments.filter((a) => a.status === "completed");
  const totalRevenue = completed.reduce((s, a) => s + a.price, 0);

  const upcoming = appointments
    .filter((a) => a.status === "confirmed" || a.status === "pending")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  // Графік: історична база + живий дохід зі стору по місяцях.
  const chart = useMemo(() => {
    const live = {};
    for (const a of completed) {
      const month = new Date(a.date).getMonth();
      const key = Object.keys(MONTH_INDEX).find((k) => MONTH_INDEX[k] === month);
      if (key) live[key] = (live[key] || 0) + a.price;
    }
    return revenueByMonth.map((m) => ({ ...m, value: m.value + (live[m.key] || 0) }));
  }, [completed]);

  const maxRev = Math.max(...chart.map((m) => m.value));
  const cur = chart.at(-1).value;
  const prev = chart.at(-2).value;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : 0;
  const revDelta = `${pct >= 0 ? "+" : ""}${pct}%`;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dash.revenueMonth")}
          value={uah(cur)}
          delta={revDelta}
          icon={<ChartIcon />}
        />
        <StatCard
          label={t("dash.totalAppointments")}
          value={String(appointments.length)}
          icon={<CalendarIcon />}
        />
        <StatCard
          label={t("dash.activeClients")}
          value={String(clients.length)}
          icon={<UsersIcon />}
        />
        <StatCard
          label={t("dash.completedVisits")}
          value={String(completed.length)}
          icon={<ArrowUpIcon />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t("dash.revenueByMonth")}</h2>
              <p className="text-sm text-muted">
                {t("dash.totalCompleted", { amount: uah(totalRevenue) })}
              </p>
            </div>
          </div>
          <div className="mt-6 flex h-52 items-stretch gap-3">
            {chart.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-brand-500/85 transition-all hover:bg-brand-600"
                    style={{ height: `${(m.value / maxRev) * 100}%` }}
                    title={uah(m.value)}
                  />
                </div>
                <span className="text-xs text-muted">{t(`month.${m.key}`)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming */}
        <Card className="p-5">
          <h2 className="font-semibold">{t("dash.upcoming")}</h2>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">{t("appt.empty")}</p>
            ) : (
              upcoming.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.clientName}</div>
                    <div className="truncate text-xs text-muted">
                      {t(`service.${a.serviceId}`)} · {dateTime(a.date)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
