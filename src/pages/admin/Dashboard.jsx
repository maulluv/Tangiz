import { useEffect, useMemo, useState } from "react";
import { ArrowUpIcon, CalendarIcon, ChartIcon, UsersIcon } from "@/components/icons";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import { getAppointments, getClients } from "@/features/admin";
import { dateTime, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

// Ключі перекладів місяців у порядку Date.getMonth().
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// Скільки останніх місяців (разом із поточним) показує графік.
const CHART_MONTHS = 6;

export default function Dashboard() {
  const { t } = useI18n();

  // Дані тягнемо з сервера при монтуванні; перехід між сторінками адмінки
  // ремонтує компонент, тож статистика завжди свіжа.
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all([getAppointments(), getClients()])
      .then(([a, c]) => {
        if (!alive) return;
        setAppointments(a);
        setClients(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const completed = appointments.filter((a) => a.status === "completed");
  const totalRevenue = completed.reduce((s, a) => s + a.price, 0);

  const upcoming = appointments
    .filter((a) => (a.status === "confirmed" || a.status === "pending") && +new Date(a.date) >= Date.now())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  // Графік: дохід із завершених прийомів за останні CHART_MONTHS місяців (поточний — останній).
  const chart = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: CHART_MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS - 1 - i), 1);
      return { y: d.getFullYear(), m: d.getMonth(), key: MONTH_KEYS[d.getMonth()], value: 0 };
    });
    for (const a of completed) {
      const d = new Date(a.date);
      const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (slot) slot.value += a.price;
    }
    return months;
  }, [completed]);

  // max ≥ 1 — щоб порожній графік (ще жодного завершеного прийому) не ділив на нуль.
  const maxRev = Math.max(1, ...chart.map((m) => m.value));
  const cur = chart.at(-1).value;
  const prev = chart.at(-2).value;
  // Відсоток показуємо, лише коли є з чим порівнювати.
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : null;
  const revDelta = pct === null ? undefined : `${pct >= 0 ? "+" : ""}${pct}%`;

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
              <div key={`${m.y}-${m.m}`} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-brand-500/85 transition-all hover:bg-brand-600"
                    style={{ height: `${Math.max((m.value / maxRev) * 100, m.value ? 2 : 0)}%` }}
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
