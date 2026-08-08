import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import {
  getClients,
  addClient,
  updateClient,
  getAppointments,
  clientStats,
} from "@/features/admin";
import { dateLong, dateTime, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500";

const initials = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Clients() {
  const { t } = useI18n();
  const [clients, setClients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [formClient, setFormClient] = useState(null); // null | {} (new) | client (edit)

  useEffect(() => {
    let alive = true;
    Promise.all([getClients(), getAppointments()])
      .then(([c, a]) => {
        if (!alive) return;
        setClients(c);
        setAppts(a);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const [c, a] = await Promise.all([getClients(), getAppointments()]);
    setClients(c);
    setAppts(a);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.telegram || "").toLowerCase().includes(q),
      )
      .map((c) => ({ ...c, stats: clientStats(c.id, appts) }));
  }, [clients, appts, query]);

  const detail = clients.find((c) => c.id === detailId) || null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{t("clients.all")}</h2>
          <span className="text-sm text-muted">{t("clients.count", { n: clients.length })}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("clients.searchPh")}
            className="h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500 sm:w-64"
          />
          <Button onClick={() => setFormClient({})} className="shrink-0">
            <PlusIcon width={18} height={18} />
            {t("clients.add")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3 font-medium sm:px-5">{t("clients.client")}</th>
              <th className="px-3 py-3 font-medium sm:px-5">{t("clients.phone")}</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">{t("clients.telegram")}</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">{t("clients.visits")}</th>
              <th className="px-3 py-3 font-medium sm:px-5">{t("clients.spent")}</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">{t("clients.since")}</th>
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
                  {t("clients.noResults")}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setDetailId(c.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="px-3 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initials(c.name)}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted sm:px-5">{c.phone || "—"}</td>
                  <td className="hidden px-5 py-3 text-muted lg:table-cell">{c.telegram ?? "—"}</td>
                  <td className="hidden px-5 py-3 sm:table-cell">{c.stats.visits}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium sm:px-5">{uah(c.stats.spent)}</td>
                  <td className="hidden whitespace-nowrap px-5 py-3 text-muted md:table-cell">{dateLong(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClientCard
        client={detail}
        appts={appts}
        onClose={() => setDetailId(null)}
        onEdit={(c) => {
          setDetailId(null);
          setFormClient(c);
        }}
      />

      <ClientForm
        client={formClient}
        onClose={() => setFormClient(null)}
        onSaved={refresh}
      />
    </Card>
  );
}

function ClientCard({ client, appts, onClose, onEdit }) {
  const { t } = useI18n();
  const open = !!client;
  const stats = client ? clientStats(client.id, appts) : null;
  const history = client
    ? appts
        .filter((a) => a.clientId === client.id)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    : [];

  return (
    <Modal open={open} onClose={onClose} title={t("clients.client")} className="max-w-lg">
      {client && (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{client.name}</div>
              <div className="truncate text-sm text-muted">
                {client.phone || "—"}
                {client.telegram ? ` · ${client.telegram}` : ""}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("clients.visits")} value={stats.visits} />
            <Stat label={t("clientCard.totalAppts")} value={stats.total} />
            <Stat label={t("clients.spent")} value={uah(stats.spent)} />
          </div>

          <div className="text-sm text-muted">
            {t("clients.since")}: {dateLong(client.createdAt)}
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("clientCard.history")}</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("clientCard.noHistory")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t(`service.${a.serviceId}`)}</div>
                      <div className="truncate text-xs text-muted">{dateTime(a.date)} · {uah(a.price)}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button variant="outline" onClick={() => onEdit(client)}>
              {t("clientCard.edit")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function ClientForm({ client, onClose, onSaved }) {
  const { t } = useI18n();
  const open = !!client;
  const editing = !!client?.id;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [error, setError] = useState(false);
  // Ключ змушує форму пересоздатись із потрібними значеннями при відкритті.
  const [seeded, setSeeded] = useState(null);

  if (open && seeded !== client) {
    setSeeded(client);
    setName(client.name || "");
    setPhone(client.phone || "");
    setTelegram(client.telegram || "");
    setError(false);
  }

  function close() {
    setSeeded(null);
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError(true);
      return;
    }
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      telegram: telegram.trim() || undefined,
    };
    if (editing) await updateClient(client.id, data);
    else await addClient(data);
    await onSaved();
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? t("clientForm.titleEdit") : t("clientForm.titleNew")}
      className="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("booking.name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("booking.namePh")}
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("booking.phone")}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("booking.telegram")}</span>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="@username"
            className={`mt-1.5 ${inputCls}`}
          />
        </label>

        {error && !name.trim() && (
          <p className="text-sm text-danger">{t("clientForm.nameRequired")}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
