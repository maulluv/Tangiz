import { useEffect, useState } from "react";
import { Button, Card, StatusBadge } from "@/components/ui";
import { PhoneIcon, TelegramIcon } from "@/components/icons";
import { getAppointments, setAppointmentStatus } from "@/features/admin";
import { dateTime, uah } from "@/utils/format";
import { useI18n } from "@/i18n";

// Черга нових записів, які очікують підтвердження власника.
export default function Pending() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const data = await getAppointments();
    setList(
      data
        .filter((a) => a.status === "pending")
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    );
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

  async function act(id, status) {
    setBusyId(id);
    try {
      await setAppointmentStatus(id, status);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("pending.title")}</h2>
        <p className="text-sm text-muted">{t("pending.subtitle")}</p>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted">{t("appt.loading")}</Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-muted">{t("pending.empty")}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{a.clientName}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {t(`service.${a.serviceId}`)} · {uah(a.price)}
                  </div>
                </div>
                <StatusBadge status="pending" />
              </div>

              <div className="text-sm text-muted">
                {dateTime(a.date)} · {t(`source.${a.source}`)}
              </div>

              {(a.phone || a.telegram) && (
                <div className="flex flex-wrap gap-2">
                  {a.phone && (
                    <a
                      href={`tel:${a.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      <PhoneIcon width={16} height={16} className="text-brand-600" />
                      {a.phone}
                    </a>
                  )}
                  {a.telegram && (
                    <a
                      href={`https://t.me/${a.telegram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      <TelegramIcon width={16} height={16} className="text-brand-600" />
                      {a.telegram}
                    </a>
                  )}
                </div>
              )}

              <div className="mt-1 flex gap-2 border-t border-border pt-3">
                <Button disabled={busyId === a.id} onClick={() => act(a.id, "confirmed")}>
                  {t("apptAction.confirm")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busyId === a.id}
                  onClick={() => act(a.id, "canceled")}
                  className="text-danger hover:bg-red-50"
                >
                  {t("apptAction.cancel")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
