import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { services } from "@/data";
import { getSlots, addSlots, deleteSlot } from "@/features/admin";
import { DateSelect, TimeSelect } from "@/components/DateTimeInputs";
import { timeOnly } from "@/utils/format";
import { useI18n } from "@/i18n";

const LOCALES = { uk: "uk-UA", en: "en-US" };
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function Availability() {
  const { t, lang } = useI18n();
  const locale = LOCALES[lang] ?? "uk-UA";

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState(services[0].id);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setSlots(await getSlots());
  }
  useEffect(() => {
    let alive = true;
    load()
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const forService = useMemo(
    () => slots.filter((s) => s.serviceId === serviceId),
    [slots, serviceId],
  );

  // Кількість вільних слотів по кожній послузі (для бейджів у вкладках).
  const freeCount = useMemo(() => {
    const m = {};
    for (const s of slots) if (!s.booked) m[s.serviceId] = (m[s.serviceId] || 0) + 1;
    return m;
  }, [slots]);

  // Групуємо за днем (за локальним часом).
  const groups = useMemo(() => {
    const map = {};
    for (const s of forService) {
      const d = new Date(s.startsAt);
      const k = dayKey(d);
      (map[k] = map[k] || { date: d, slots: [] }).slots.push(s);
    }
    return Object.values(map);
  }, [forService]);

  const dayLabel = (d) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(d);

  async function handleAdd(e) {
    e.preventDefault();
    if (!date || !time || adding) return;
    setAdding(true);
    setError("");
    try {
      const res = await addSlots(serviceId, [`${date}T${time}:00`]);
      if (res.created.length === 0) setError(t("avail.exists"));
      else setTime(""); // дату лишаємо — зручно додати кілька годин поспіль
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    setBusyId(id);
    setError("");
    try {
      await deleteSlot(id);
      await load();
    } catch (err) {
      setError(err.message || t("avail.deleteError"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("avail.title")}</h2>
        <p className="text-sm text-muted">{t("avail.subtitle")}</p>
      </div>

      {/* Вкладки послуг */}
      <div className="flex flex-wrap gap-1.5">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setServiceId(s.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              serviceId === s.id
                ? "bg-brand-500 text-white"
                : "border border-border text-muted hover:text-ink"
            }`}
          >
            {t(`service.${s.id}`)}
            <span
              className={`rounded-full px-1.5 text-xs ${
                serviceId === s.id ? "bg-white/20" : "bg-black/5"
              }`}
            >
              {freeCount[s.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Додати слот */}
      <Card className="p-4 sm:p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">{t("avail.addDate")}</span>
            <DateSelect value={date} onChange={setDate} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">{t("avail.addTime")}</span>
            <TimeSelect value={time} onChange={setTime} />
          </div>
          <Button type="submit" disabled={!date || !time || adding}>
            <PlusIcon width={18} height={18} />
            {t("avail.add")}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
      </Card>

      {/* Список слотів обраної послуги */}
      {loading ? (
        <Card className="p-10 text-center text-muted">{t("avail.loading")}</Card>
      ) : groups.length === 0 ? (
        <Card className="p-10 text-center text-muted">{t("avail.empty")}</Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={dayKey(g.date)} className="p-4 sm:p-5">
              <div className="text-sm font-semibold capitalize">{dayLabel(g.date)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.slots.map((s) =>
                  s.booked ? (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-muted"
                    >
                      {timeOnly(s.startsAt)}
                      <span className="text-xs">· {t("avail.booked")}</span>
                    </span>
                  ) : (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-1.5 text-sm font-medium text-brand-700"
                    >
                      {timeOnly(s.startsAt)}
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        disabled={busyId === s.id}
                        aria-label={t("common.close")}
                        className="grid size-4 place-items-center rounded-full text-brand-400 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-40"
                      >
                        <CloseIcon width={12} height={12} />
                      </button>
                    </span>
                  ),
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
