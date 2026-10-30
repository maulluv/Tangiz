import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card } from "@/components/ui";
import { PhoneIcon, TelegramIcon } from "@/components/icons";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";
import { getBookingStatus } from "@/features/booking";
import { uah, dateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

const POLL_MS = 4000;

// Екран після запису: пацієнт має підтвердити запис у Telegram-боті, далі — лікар.
// Сторінка опитує сервер і показує, на якому кроці зараз запис.
//   pending_client → чекаємо пацієнта · pending → чекаємо лікаря · confirmed → готово
//   canceled → час вийшов / скасовано
export default function BookingConfirmStep({ bookingId, confirm, service, slot, onRetry }) {
  const { t, lang } = useI18n();
  const CLINIC = useClinic();
  const [status, setStatus] = useState("pending_client");

  // Опитуємо, поки статус не остаточний. Вкладка у фоні — не смикаємо сервер.
  useEffect(() => {
    if (status === "confirmed" || status === "canceled") return;
    let alive = true;
    const tick = () => {
      if (document.hidden) return;
      getBookingStatus(bookingId)
        .then((b) => alive && setStatus(b.status))
        .catch(() => {
          /* мережа моргнула — спробуємо наступного разу */
        });
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [bookingId, status]);

  const botUrl = confirm.botUrl || `${CLINIC.botUrl}?start=r_${bookingId}`;
  const until = confirm.holdUntil
    ? new Date(confirm.holdUntil).toLocaleTimeString(lang === "en" ? "en-GB" : "uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Номер активного кроку (0..3) для шкали прогресу.
  const stage = { pending_client: 1, pending: 2, confirmed: 3 }[status] ?? 1;
  const steps = [
    t("booking.stepCreated"),
    t("booking.stepClient"),
    t("booking.stepDoctor"),
    t("booking.stepDone"),
  ];

  const summary = (
    <div className="rounded-xl border border-border bg-bg p-3 text-sm">
      <div className="font-medium">{t(`service.${service.id}`)}</div>
      <div className="mt-0.5 text-muted">
        {dateTime(slot)} · {uah(service.price)}
      </div>
    </div>
  );

  if (status === "canceled") {
    return (
      <Card className="animate-rise p-6 text-center">
        <div className="text-4xl" aria-hidden="true">⌛</div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">{t("booking.expiredTitle")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("booking.expiredText")}</p>
        <Button className="mt-5" onClick={onRetry}>
          {t("booking.retry")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="animate-rise space-y-4">
      {/* Шкала: де зараз запис */}
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, i) => {
          const done = i < stage || status === "confirmed";
          const active = i === stage && status !== "confirmed";
          return (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-brand-500 text-white",
                  active && "bg-brand-50 text-brand-700 ring-2 ring-brand-500 animate-pulse",
                  !done && !active && "bg-black/5 text-muted",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight sm:text-xs",
                  active ? "font-medium text-ink" : "text-muted",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {status === "pending_client" && (
        <Card className="p-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("booking.confirmTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("booking.confirmSubtitle", { until })}</p>

          <div className="mt-4">{summary}</div>

          {confirm.alreadyLinked && (
            <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
              {t("booking.confirmLinked")}
            </p>
          )}

          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <a href={botUrl} target="_blank" rel="noreferrer" className="w-full sm:flex-1">
              <Button className="h-12 w-full text-base">
                <TelegramIcon width={20} height={20} className="shrink-0" />
                {t("booking.confirmCta")}
              </Button>
            </a>
            {/* QR — для тих, хто записується з комп'ютера, а Telegram у них на телефоні. */}
            <div className="hidden flex-col items-center gap-1.5 sm:flex">
              <div className="rounded-xl border border-border bg-white p-2">
                <QRCodeSVG value={botUrl} size={104} />
              </div>
              <span className="max-w-[9rem] text-center text-[11px] leading-tight text-muted">
                {t("booking.confirmQr")}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-4 text-sm text-muted">
            <span>{t("booking.noTelegram")}</span>
            <a
              href={`tel:${CLINIC.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
            >
              <PhoneIcon width={15} height={15} />
              {CLINIC.phone}
            </a>
          </div>
        </Card>
      )}

      {status === "pending" && (
        <Card className="p-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("booking.waitDoctorTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("booking.waitDoctorText")}</p>
          <div className="mt-4">{summary}</div>
        </Card>
      )}

      {status === "confirmed" && (
        <Card className="p-6 text-center">
          <div className="text-4xl" aria-hidden="true">🎉</div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            {t("booking.successTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("booking.successText")}</p>
          <div className="mt-4 text-left">{summary}</div>
        </Card>
      )}
    </div>
  );
}
