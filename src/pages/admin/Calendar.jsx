import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";
import { getAppointments, NewAppointmentModal } from "@/features/admin";
import { timeOnly, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

const LOCALES = { uk: "uk-UA", en: "en-US" };

const pad = (n) => String(n).padStart(2, "0");
// Дата у форматі YYYY-MM-DD для <input type="date">.
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Колір індикатора за статусом запису.
const dotCls = {
  pending: "bg-amber-400",
  confirmed: "bg-brand-500",
  completed: "bg-emerald-500",
  canceled: "bg-red-400",
};

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Calendar() {
  const { t, lang } = useI18n();
  const locale = LOCALES[lang] ?? "uk-UA";

  const [appts, setAppts] = useState([]);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState(null); // Date | null
  const [formDate, setFormDate] = useState(null); // YYYY-MM-DD | null — форма нового запису

  useEffect(() => {
    let alive = true;
    getAppointments()
      .then((data) => alive && setAppts(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    setAppts(await getAppointments());
  }

  // Записи, згруповані за днем.
  const byDay = useMemo(() => {
    const map = {};
    for (const a of appts) {
      const k = dayKey(new Date(a.date));
      (map[k] = map[k] || []).push(a);
    }
    for (const k in map) {
      map[k].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    }
    return map;
  }, [appts]);

  // 42 клітинки (6 тижнів), тиждень починається з понеділка.
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Пн=0 … Нд=6
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  // Назви днів тижня (1 січня 2024 — понеділок).
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1);
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return fmt.format(d);
    });
  }, [locale]);

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const todayKey = dayKey(new Date());
  const curMonth = cursor.getMonth();

  function shift(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }
  function goToday() {
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  const selectedList = selected ? byDay[dayKey(selected)] || [] : [];

  return (
    <Card className="overflow-hidden">
      {/* Заголовок: місяць + навігація */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold capitalize sm:text-lg">{monthTitle}</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToday}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            {t("calendar.today")}
          </button>
          <button
            onClick={() => shift(-1)}
            aria-label={t("calendar.prevMonth")}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
          >
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <button
            onClick={() => shift(1)}
            aria-label={t("calendar.nextMonth")}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
          >
            <ChevronRightIcon width={20} height={20} />
          </button>
        </div>
      </div>

      {/* Дні тижня */}
      <div
        className="grid border-b border-border text-center text-xs font-medium uppercase tracking-wide text-muted"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {weekdays.map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>

      {/* Сітка днів */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {grid.map((d) => {
          const k = dayKey(d);
          const list = byDay[k] || [];
          const inMonth = d.getMonth() === curMonth;
          const isToday = k === todayKey;
          const hasAppts = list.length > 0;

          return (
            <button
              key={k}
              onClick={() => (hasAppts ? setSelected(d) : setFormDate(isoDate(d)))}
              className={`flex min-h-[84px] cursor-pointer flex-col gap-1 border-b border-r border-border p-1.5 text-left hover:bg-brand-50/60 sm:min-h-[112px] ${
                inMonth ? "" : "bg-black/[0.015] text-muted"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium ${
                  isToday ? "bg-brand-500 text-white" : inMonth ? "" : "text-muted"
                }`}
              >
                {d.getDate()}
              </span>

              {/* Десктоп: чипи записів */}
              {hasAppts && (
                <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                  {list.slice(0, 2).map((a) => (
                    <span
                      key={a.id}
                      className="flex items-center gap-1 truncate rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] leading-tight"
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${dotCls[a.status]}`} />
                      <span className="truncate">
                        {timeOnly(a.date)} {a.clientName}
                      </span>
                    </span>
                  ))}
                  {list.length > 2 && (
                    <span className="px-1 text-[11px] text-muted">
                      {t("calendar.more", { n: list.length - 2 })}
                    </span>
                  )}
                </div>
              )}

              {/* Мобільний: крапки-індикатори */}
              {hasAppts && (
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {list.slice(0, 4).map((a) => (
                    <span key={a.id} className={`size-1.5 rounded-full ${dotCls[a.status]}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Модалка з записами обраного дня */}
      <DayModal
        date={selected}
        list={selectedList}
        locale={locale}
        onClose={() => setSelected(null)}
        onAdd={() => {
          const d = selected;
          setSelected(null);
          setFormDate(isoDate(d));
        }}
      />

      {/* Форма нового запису (з підставленою датою) */}
      <NewAppointmentModal
        open={!!formDate}
        defaultDate={formDate ?? ""}
        onClose={() => setFormDate(null)}
        onCreated={refresh}
      />
    </Card>
  );
}

function DayModal({ date, list, locale, onClose, onAdd }) {
  const { t } = useI18n();
  const title = date
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date)
    : "";

  return (
    <Modal open={!!date} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-2 p-5 sm:p-6">
        {list.length === 0 ? (
          <p className="text-sm text-muted">{t("calendar.dayEmpty")}</p>
        ) : (
          list.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {timeOnly(a.date)} · {a.clientName}
                </div>
                <div className="truncate text-xs text-muted">
                  {t(`service.${a.serviceId}`)} · {uah(a.price)}
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))
        )}

        <div className="border-t border-border pt-3">
          <Button variant="outline" onClick={onAdd} className="w-full">
            <PlusIcon width={18} height={18} />
            {t("appt.new")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
