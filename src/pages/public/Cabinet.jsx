import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Card, Modal, StatusBadge } from "@/components/ui";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { useAuth } from "@/features/auth";
import { useI18n } from "@/i18n";
import { getBookings, cancelBooking } from "@/features/booking";
import { cancellationPolicy } from "@/data";
import { dateTime, uah } from "@/utils/format";

export default function Cabinet() {
  const { user, signOut } = useAuth();
  const { t, lang } = useI18n();
  const [bookings, setBookings] = useState(() =>
    user ? getBookings(user.id) : [],
  );
  const [cancelId, setCancelId] = useState(null);

  if (!user) return <Navigate to="/login" replace />;

  const cancelTarget = bookings.find((b) => b.id === cancelId);

  function confirmCancel() {
    cancelBooking(cancelId);
    setBookings(getBookings(user.id));
    setCancelId(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("cabinet.welcome", { name: user.name.split(" ")[0] })}
          </h1>
          <p className="mt-1 text-muted">{user.phone}</p>
        </div>
        <Button variant="ghost" onClick={signOut}>
          {t("common.logout")}
        </Button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold">{t("cabinet.myBookings")}</h2>
        <Link to="/booking">
          <Button variant="outline">
            <PlusIcon width={18} height={18} />
            {t("cabinet.newBooking")}
          </Button>
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {bookings.length === 0 ? (
          <Card className="grid place-items-center gap-3 p-10 text-center">
            <CalendarIcon width={32} height={32} className="text-muted" />
            <p className="text-muted">{t("cabinet.empty")}</p>
            <Link to="/booking">
              <Button>{t("cabinet.bookCta")}</Button>
            </Link>
          </Card>
        ) : (
          bookings.map((b) => {
            const cancelable = b.status === "pending" || b.status === "confirmed";
            return (
              <Card
                key={b.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{t(`service.${b.serviceId}`)}</div>
                  <div className="mt-0.5 text-sm text-muted">{dateTime(b.date)}</div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="font-semibold">{uah(b.price)}</span>
                  <StatusBadge status={b.status} />
                  {cancelable && (
                    <Button
                      variant="ghost"
                      onClick={() => setCancelId(b.id)}
                      className="ml-auto px-2 text-danger hover:bg-red-50 sm:ml-0"
                    >
                      {t("cabinet.cancel")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Модалка підтвердження скасування */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelId(null)}
        title={t("cancel.title")}
        className="max-w-2xl"
      >
        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
          {/* Ліворуч — підтвердження */}
          <div className="flex flex-col">
            <p className="text-sm leading-relaxed text-muted">{t("cancel.confirm")}</p>
            {cancelTarget && (
              <div className="mt-4 rounded-lg border border-border bg-bg p-3 text-sm">
                <div className="font-medium">{t(`service.${cancelTarget.serviceId}`)}</div>
                <div className="mt-0.5 text-muted">
                  {dateTime(cancelTarget.date)} · {uah(cancelTarget.price)}
                </div>
              </div>
            )}
            <div className="mt-6 flex gap-3 sm:mt-auto">
              <Button variant="outline" onClick={() => setCancelId(null)}>
                {t("cancel.keep")}
              </Button>
              <Button variant="danger" onClick={confirmCancel}>
                {t("cancel.confirmBtn")}
              </Button>
            </div>
          </div>

          {/* Праворуч — правила скасування */}
          <div className="rounded-xl bg-bg p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden="true">🧾</span>
              {t("info.cancelTitle")}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {cancellationPolicy.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span aria-hidden="true" className="shrink-0 text-base leading-5">
                    {c.icon}
                  </span>
                  <span className="text-muted">{c[lang]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
