import { useMemo, useState } from "react";
import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
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
  pending: ["confirm", "complete", "cancel"],
  confirmed: ["complete", "cancel"],
  completed: [],
  canceled: [],
};
const statusOf = { confirm: "confirmed", complete: "completed", cancel: "canceled" };

export default function Appointments() {
  const { t } = useI18n();
  const [list, setList] = useState(getAppointments);
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const rows = useMemo(
    () =>
      [...list]
        .filter((a) => filter === "all" || a.status === filter)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [list, filter],
  );

  const detail = list.find((a) => a.id === detailId) || null;

  function refresh() {
    setList(getAppointments());
  }

  function handleStatus(id, status) {
    setAppointmentStatus(id, status);
    refresh();
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
            </button>
          ))}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon width={18} height={18} />
          {t("appt.new")}
        </Button>
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
              {rows.length === 0 ? (
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
                    <td className="px-3 py-3 font-medium sm:px-5">{a.clientName}</td>
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
