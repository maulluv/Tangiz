// Сторінка «повернулися з каси». Свідомо НЕ вірить самому факту повернення:
// натиснути «оплатити» й закрити вкладку — не те саме, що заплатити, а адресу цієї
// сторінки легко відкрити руками. Тому статус питаємо в сервера, який його дізнається
// лише з підписаного вебхука банку.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { TelegramIcon } from "@/components/icons";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";
import { getPaymentStatus } from "@/features/booking";

const POLL_MS = 2000;
const POLL_LIMIT = 60; // ~2 хвилини: далі питати немає сенсу, бронь однаково протухне

export default function BookingReturn() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking") ?? "";
  const { t } = useI18n();
  const CLINIC = useClinic();

  const [state, setState] = useState("waiting"); // waiting | paid | failed | error
  const tries = useRef(0);

  useEffect(() => {
    if (!bookingId) return setState("error");

    let alive = true;
    let timer;

    const tick = async () => {
      try {
        const res = await getPaymentStatus(bookingId);
        if (!alive) return;
        if (res.status === "confirmed" || res.payment?.status === "paid") return setState("paid");
        if (res.status === "canceled" || res.payment?.status === "failed") return setState("failed");
      } catch {
        if (!alive) return;
        return setState("error");
      }
      // Вебхук міг ще не дійти — чекаємо далі, але не нескінченно.
      if (++tries.current >= POLL_LIMIT) return setState("failed");
      timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [bookingId]);

  const view = {
    waiting: { icon: "⏳", title: t("pay.waitTitle"), text: t("pay.waitText") },
    paid: { icon: "✅", title: t("pay.paidTitle"), text: t("pay.paidText") },
    failed: { icon: "❌", title: t("pay.failedTitle"), text: t("pay.failedText") },
    error: { icon: "⚠️", title: t("pay.errorTitle"), text: t("pay.errorText") },
  }[state];

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-3xl leading-none">
            {view.icon}
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{view.title}</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted">{view.text}</p>
          </div>
        </div>

        {/* Сітка з items-stretch: якщо довша назва перенесеться у два рядки,
            обидві кнопки лишаться однакової висоти, а не «сходинкою». */}
        {state === "paid" && (
          <div className="mt-6 grid items-stretch gap-2 sm:grid-cols-2">
            <a
              href={bookingId ? `${CLINIC.botUrl}?start=r_${bookingId}` : CLINIC.botUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" className="h-full w-full whitespace-nowrap">
                <TelegramIcon width={18} height={18} className="shrink-0" />
                {t("booking.remindCta")}
              </Button>
            </a>
            <Link to="/cabinet">
              <Button className="h-full w-full whitespace-nowrap">{t("booking.goCabinet")}</Button>
            </Link>
          </div>
        )}

        {(state === "failed" || state === "error") && (
          <div className="mt-6">
            <Link to="/booking" className="block sm:inline-block">
              <Button className="w-full sm:w-auto">{t("pay.retry")}</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
