import { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { services } from "@/data";
import { uah } from "@/utils/format";
import { useI18n } from "@/i18n";
import { addAppointment, getClients } from "./adminApi";

const sources = ["telegram", "site", "phone"];

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500";

// Форма створення запису. `defaultDate` (YYYY-MM-DD) підставляє дату при відкритті
// (використовується з календаря — клік по даті).
export function NewAppointmentModal({ open, onClose, onCreated, defaultDate = "" }) {
  const { t } = useI18n();
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Список клієнтів тягнемо щоразу при відкритті форми.
  useEffect(() => {
    if (!open) return;
    getClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, [open]);

  const [clientId, setClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTelegram, setNewTelegram] = useState("");
  const [serviceId, setServiceId] = useState("s1");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [source, setSource] = useState("phone");
  const [status, setStatus] = useState("confirmed");
  const [error, setError] = useState(false);
  // Сідимо форму один раз на кожне відкриття (щоб підхопити defaultDate).
  const [primed, setPrimed] = useState(false);

  if (open && !primed) {
    setPrimed(true);
    setClientId("");
    setNewName("");
    setNewPhone("");
    setNewTelegram("");
    setServiceId("s1");
    setDate(defaultDate);
    setTime("");
    setSource("phone");
    setStatus("confirmed");
    setError(false);
  }
  if (!open && primed) setPrimed(false);

  const isNewClient = clientId === "__new__";
  const valid =
    serviceId && date && time && (isNewClient ? newName.trim() : clientId);

  async function submit(e) {
    e.preventDefault();
    if (!valid || submitting) {
      if (!valid) setError(true);
      return;
    }

    // Ціну й тривалість порахує сервер. Новий клієнт створюється там само.
    const payload = { serviceId, date: `${date}T${time}:00`, status, source };
    if (isNewClient) {
      payload.clientName = newName.trim();
      payload.phone = newPhone.trim() || undefined;
      payload.telegram = newTelegram.trim() || undefined;
    } else {
      const c = clients.find((x) => x.id === clientId);
      payload.clientId = clientId;
      payload.clientName = c?.name ?? "";
    }

    setSubmitting(true);
    try {
      await addAppointment(payload);
      await onCreated();
      onClose();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("apptForm.title")} className="max-w-lg">
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {/* Клієнт */}
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("apptForm.client")}</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={`mt-1.5 ${inputCls}`}
          >
            <option value="">{t("apptForm.choose")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">{t("apptForm.newClient")}</option>
          </select>
        </label>

        {isNewClient && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-bg p-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-muted">{t("booking.name")}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("booking.namePh")}
                className={`mt-1.5 ${inputCls}`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted">{t("booking.phone")}</span>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className={`mt-1.5 ${inputCls}`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted">{t("booking.telegram")}</span>
              <input
                value={newTelegram}
                onChange={(e) => setNewTelegram(e.target.value)}
                placeholder="@username"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>
          </div>
        )}

        {/* Послуга */}
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("appt.service")}</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={`mt-1.5 ${inputCls}`}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {t(`service.${s.id}`)} · {uah(s.price)}
              </option>
            ))}
          </select>
        </label>

        {/* Дата / час */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("booking.date")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("booking.time")}</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
        </div>

        {/* Джерело / статус */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("appt.source")}</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {t(`source.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("appt.status")}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            >
              <option value="pending">{t("status.pending")}</option>
              <option value="confirmed">{t("status.confirmed")}</option>
              <option value="completed">{t("status.completed")}</option>
            </select>
          </label>
        </div>

        {error && !valid && (
          <p className="text-sm text-danger">{t("apptForm.required")}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? t("reviews.submitting") : t("apptForm.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
