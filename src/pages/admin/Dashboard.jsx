import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ChartIcon, PhoneIcon, UsersIcon, ArrowUpIcon } from "@/components/icons";
import { Button, Card, StatCard, StatusBadge } from "@/components/ui";
import {
  getAppointments,
  getClients,
  setAppointmentStatus,
  isDone,
  needsMark,
  isUpcoming,
} from "@/features/admin";
import { CLINIC_TZ, compact, dateTime, timeOnly, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

// Ключі перекладів місяців у порядку Date.getMonth().
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// Скільки останніх місяців (разом із поточним) показує графік.
const CHART_MONTHS = 6;
// Скільки рядків показуємо в списках на головній адмінки.
const MAX_MARKS = 5;
const MAX_UPCOMING = 6;
const LOCALES = { uk: "uk-UA", en: "en-GB" };

// "2026-11-07" — день у поясі клініки (а не браузера): так і сайт, і бот рахують дати.
const kyivDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ }).format(new Date(d));
const kyivMonth = (d) => kyivDay(d).slice(0, 7);

export default function Dashboard() {
  const { t, lang } = useI18n();

  // Дані тягнемо з сервера при монтуванні; перехід між сторінками адмінки
  // ремонтує компонент, тож статистика завжди свіжа.
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([getAppointments(), getClients()])
      .then(([a, c]) => {
        if (!alive) return;
        setAppointments(a);
        setClients(c);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  async function mark(id, status) {
    await setAppointmentStatus(id, status);
    setAppointments(await getAppointments());
  }

  const done = useMemo(() => appointments.filter(isDone), [appointments]);
  const thisMonth = kyivMonth(new Date());
  const doneThisMonth = done.filter((a) => kyivMonth(a.date) === thisMonth);

  // Графік: дохід із прийомів, що відбулися, за останні CHART_MONTHS місяців (поточний — останній).
  const chart = useMemo(() => {
    const [y, m] = thisMonth.split("-").map(Number);
    const months = Array.from({ length: CHART_MONTHS }, (_, i) => {
      const d = new Date(y, m - 1 - (CHART_MONTHS - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: MONTH_KEYS[d.getMonth()], value: 0 };
    });
    for (const a of done) {
      const slot = months.find((x) => x.key === kyivMonth(a.date));
      if (slot) slot.value += a.price;
    }
    return months;
  }, [done, thisMonth]);

  const totalRevenue = done.reduce((s, a) => s + a.price, 0);
  // max ≥ 1 — щоб порожній графік не ділив на нуль.
  const maxRev = Math.max(1, ...chart.map((m) => m.value));
  const cur = chart.at(-1).value;
  const prev = chart.at(-2).value;
  // Відсоток показуємо, лише коли є з чим порівнювати.
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : null;
  const revDelta = pct === null ? undefined : `${pct >= 0 ? "+" : ""}${pct}%`;

  const upcoming = appointments.filter(isUpcoming).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const weekAhead = upcoming.filter((a) => +new Date(a.date) - Date.now() < 7 * 864e5);
  const newClients = clients.filter((c) => kyivMonth(c.createdAt) === thisMonth).length;

  const pendingCount = appointments.filter((a) => a.status === "pending" && !needsMark(a)).length;
  const marks = appointments.filter(needsMark).sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // Підпис дня для списку найближчих: «Сьогодні», «Завтра» або «пн, 10 листопада».
  const today = kyivDay(new Date());
  const tomorrow = kyivDay(Date.now() + 864e5);
  const dayLabel = (d) => {
    const k = kyivDay(d);
    if (k === today) return t("dash.today");
    if (k === tomorrow) return t("dash.tomorrow");
    return new Intl.DateTimeFormat(LOCALES[lang] ?? "uk-UA", {
      weekday: "short",
      day: "numeric",
      month: "long",
      timeZone: CLINIC_TZ,
    }).format(new Date(d));
  };
  const upcomingByDay = [];
  for (const a of upcoming.slice(0, MAX_UPCOMING)) {
    const label = dayLabel(a.date);
    if (upcomingByDay.at(-1)?.label !== label) upcomingByDay.push({ label, items: [] });
    upcomingByDay.at(-1).items.push(a);
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("dash.revenueMonth")} value={uah(cur)} delta={revDelta} icon={<ChartIcon />} />
        <StatCard
          label={t("dash.visitsMonth")}
          value={String(doneThisMonth.length)}
          icon={<ArrowUpIcon />}
        />
        <StatCard label={t("dash.next7")} value={String(weekAhead.length)} icon={<CalendarIcon />} />
        <StatCard
          label={t("dash.clients")}
          value={String(clients.length)}
          delta={newClients ? `+${newClients}` : undefined}
          icon={<UsersIcon />}
        />
      </div>

      {/* Потрібна увага: нові записи + минулі прийоми без позначки */}
      {loaded && (pendingCount > 0 || marks.length > 0) && (
        <Card className="border-amber-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            {t("dash.attention")}
          </h2>

          {pendingCount > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-amber-800">{t("dash.pendingN", { n: pendingCount })}</p>
              <Link to="/admin/pending" className="shrink-0">
                <Button className="w-full sm:w-auto">{t("dash.review")}</Button>
              </Link>
            </div>
          )}

          {marks.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium">{t("dash.markQ")}</div>
              <p className="text-xs text-muted">{t("dash.markHint")}</p>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {marks.slice(0, MAX_MARKS).map((a) => (
                  <MarkRow key={a.id} appt={a} onMark={mark} />
                ))}
              </ul>
              {marks.length > MAX_MARKS && (
                <Link
                  to="/admin/appointments"
                  className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("dash.moreMarks", { n: marks.length - MAX_MARKS })}
                </Link>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">{t("dash.revenueByMonth")}</h2>
          <p className="text-sm text-muted">{t("dash.totalCompleted", { amount: uah(totalRevenue) })}</p>
          <div className="mt-6 flex h-52 items-stretch gap-2 sm:gap-3">
            {chart.map((m) => (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 flex-col justify-end">
                  {m.value > 0 && (
                    <div className="mb-1 truncate text-center text-[11px] font-medium text-muted">
                      {compact(m.value)}
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-md bg-brand-500/85 transition-all hover:bg-brand-600"
                    style={{ height: `${Math.max((m.value / maxRev) * 80, m.value ? 2 : 0)}%` }}
                    title={uah(m.value)}
                  />
                </div>
                <span className="text-xs text-muted">{t(`month.${m.label}`)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Найближчі прийоми, згруповані за днем */}
        <Card className="flex flex-col p-5">
          <h2 className="font-semibold">{t("dash.upcoming")}</h2>
          <div className="mt-4 flex-1 space-y-4">
            {upcomingByDay.length === 0 ? (
              <p className="text-sm text-muted">{t("dash.noUpcoming")}</p>
            ) : (
              upcomingByDay.map((g) => (
                <div key={g.label}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted first-letter:uppercase">
                    {g.label}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {g.items.map((a) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{timeOnly(a.date)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.clientName}</div>
                          <div className="truncate text-xs text-muted">{t(`service.${a.serviceId}`)}</div>
                        </div>
                        {a.status === "pending" ? (
                          <StatusBadge status="pending" />
                        ) : (
                          a.phone && (
                            <a
                              href={`tel:${a.phone.replace(/\s/g, "")}`}
                              title={a.phone}
                              aria-label={a.phone}
                              className="grid size-8 shrink-0 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"
                            >
                              <PhoneIcon width={16} height={16} />
                            </a>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <Link
            to="/admin/calendar"
            className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t("dash.openCalendar")}
          </Link>
        </Card>
      </div>
    </div>
  );
}

// Рядок «прийом відбувся?». «Не відбувся» — з перепитуванням: скасований запис не повернути.
function MarkRow({ appt, onMark }) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(status) {
    setBusy(true);
    try {
      await onMark(appt.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{appt.clientName}</div>
        <div className="truncate text-xs text-muted">
          {t(`service.${appt.serviceId}`)} · {dateTime(appt.date)} · {uah(appt.price)}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {asking ? (
          <>
            <Button variant="danger" disabled={busy} onClick={() => run("canceled")}>
              {t("dash.markNoConfirm")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setAsking(false)}>
              {t("dash.back")}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={busy} onClick={() => run("completed")}>
              {t("dash.markYes")}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setAsking(true)}
              className="text-danger hover:bg-red-50"
            >
              {t("dash.markNo")}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
