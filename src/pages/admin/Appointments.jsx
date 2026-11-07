import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { PlusIcon, PhoneIcon, TelegramIcon } from "@/components/icons";
import {
  getAppointments,
  setAppointmentStatus,
  NewAppointmentModal,
} from "@/features/admin";
import { dateTime, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

const filters = [
  { key: "all", tKey: "appt.all" },
  { key: "pending", tKey: "appt.pending" },
  { key: "confirmed", tKey: "appt.confirmed" },
  { key: "completed", tKey: "appt.completed" },
  { key: "canceled", tKey: "appt.canceled" },
];

// Доступні переходи статусу залежно від поточного.
const transitions = {
  // Пацієнт ще не підтвердив запис у боті — лікар може хіба що скасувати.
  pending_client: ["cancel"],
  pending: ["confirm", "complete", "cancel"],
  confirmed: ["complete", "cancel"],
  completed: [],
  canceled: [],
};
const statusOf = { confirm: "confirmed", complete: "completed", cancel: "canceled" };

export default function Appointments() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    let alive = true;
    getAppointments()
      .then((data) => alive && setList(data))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Пошук за ім'ям або телефоном (телефон — за цифрами, формат не важливий).
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = q.replace(/\D/g, "").replace(/^(380|0)/, "");
    if (!q) return list;
    return list.filter(
      (a) =>
        a.clientName.toLowerCase().includes(q) ||
        (qd.length >= 3 && (a.phone || "").replace(/\D/g, "").includes(qd)),
    );
  }, [list, query]);

  const counts = useMemo(() => {
    const c = { all: matches.length };
    for (const a of matches) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [matches]);

  const rows = useMemo(
    () =>
      [...matches]
        .filter((a) => filter === "all" || a.status === filter)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [matches, filter],
  );

  const detail = list.find((a) => a.id === detailId) || null;

  async function refresh() {
    setList(await getAppointments());
  }

  async function handleStatus(id, status) {
    await setAppointmentStatus(id, status);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-brand-500 text-white"
                  : "border border-border text-muted hover:text-ink"
              }`}
            >
              {t(f.tKey)}
              <span
                className={`ml-1.5 rounded-full px-1.5 text-xs ${filter === f.key ? "bg-white/20" : "bg-black/5"}`}
              >
                {counts[f.key] || 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("appt.searchPh")}
            aria-label={t("appt.searchPh")}
            className="h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500 sm:w-56"
          />
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <PlusIcon width={18} height={18} />
            {t("appt.new")}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-3 font-medium sm:px-5">{t("appt.client")}</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">{t("appt.service")}</th>
                <th className="px-3 py-3 font-medium sm:px-5">{t("appt.datetime")}</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">{t("appt.source")}</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">{t("appt.amount")}</th>
                <th className="px-3 py-3 font-medium sm:px-5">{t("appt.status")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    {t("appt.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    {t("appt.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setDetailId(a.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                  >
                    <td className="px-3 py-3 sm:px-5">
                      <div className="font-medium">{a.clientName}</div>
                      <div className="text-xs text-muted sm:hidden">{t(`service.${a.serviceId}`)}</div>
                    </td>
                    <td className="hidden px-5 py-3 text-muted sm:table-cell">{t(`service.${a.serviceId}`)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted sm:px-5">{dateTime(a.date)}</td>
                    <td className="hidden px-5 py-3 text-muted lg:table-cell">{t(`source.${a.source}`)}</td>
                    <td className="hidden whitespace-nowrap px-5 py-3 font-medium md:table-cell">{uah(a.price)}</td>
                    <td className="px-3 py-3 sm:px-5">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <NewAppointmentModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={refresh}
      />

      <DetailModal
        appt={detail}
        onClose={() => setDetailId(null)}
        onStatus={handleStatus}
      />
    </div>
  );
}

function DetailModal({ appt, onClose, onStatus }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  // Скидаємо стан підтвердження, коли модалку закрито/відкрито інший запис.
  const open = !!appt;

  function close() {
    setConfirming(false);
    onClose();
  }

  function apply(action) {
    if (action === "cancel") {
      setConfirming(true);
      return;
    }
    onStatus(appt.id, statusOf[action]);
    close();
  }

  const actions = appt ? transitions[appt.status] : [];

  return (
    <Modal open={open} onClose={close} title={t("apptDetail.title")} className="max-w-md">
      {appt && (
        <div className="space-y-4 p-5 sm:p-6">
          <Row label={t("appt.client")} value={appt.clientName} />
          {(appt.phone || appt.telegram) && (
            <div className="flex flex-wrap items-center gap-2">
              {appt.phone && (
                <a
                  href={`tel:${appt.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <PhoneIcon width={16} height={16} className="text-brand-600" />
                  {appt.phone}
                </a>
              )}
              {appt.telegram && (
                <a
                  href={`https://t.me/${appt.telegram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <TelegramIcon width={16} height={16} className="text-brand-600" />
                  {appt.telegram}
                </a>
              )}
            </div>
          )}
          <Row label={t("appt.service")} value={t(`service.${appt.serviceId}`)} />
          <Row label={t("appt.datetime")} value={dateTime(appt.date)} />
          <Row label={t("appt.source")} value={t(`source.${appt.source}`)} />
          <Row label={t("appt.amount")} value={uah(appt.price)} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">{t("appt.status")}</span>
            <StatusBadge status={appt.status} />
          </div>

          {confirming ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{t("apptAction.cancelQ")}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    onStatus(appt.id, "canceled");
                    close();
                  }}
                >
                  {t("apptAction.cancelYes")}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  {t("apptAction.cancelNo")}
                </Button>
              </div>
            </div>
          ) : (
            actions.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {actions.includes("confirm") && (
                  <Button onClick={() => apply("confirm")}>{t("apptAction.confirm")}</Button>
                )}
                {actions.includes("complete") && (
                  <Button variant="outline" onClick={() => apply("complete")}>
                    {t("apptAction.complete")}
                  </Button>
                )}
                {actions.includes("cancel") && (
                  <Button
                    variant="ghost"
                    onClick={() => apply("cancel")}
                    className="text-danger hover:bg-red-50"
                  >
                    {t("apptAction.cancel")}
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
