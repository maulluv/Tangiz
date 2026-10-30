import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { PhoneIcon, TelegramIcon } from "@/components/icons";
import { bookingRules, cancellationPolicy, services } from "@/data";
import { uah, dateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useAuth, normalizeTg, formatPhone, isValidPhone } from "@/features/auth";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";
import { getAvailability, createBooking } from "@/features/booking";
import BookingConfirmStep from "./BookingConfirmStep";

export default function Booking() {
  const navigate = useNavigate();
  // З головної приходимо з ?service=s1 і, можливо, &slot=<ISO> — одразу обираємо їх.
  const [params] = useSearchParams();
  const wantedService = services.some((s) => s.id === params.get("service"))
    ? params.get("service")
    : services[0].id;
  const wantedSlot = params.get("slot");
  const { user, registerClient } = useAuth();
  const { t, lang } = useI18n();
  const CLINIC = useClinic();

  const [step, setStep] = useState("form"); // form | done
  const [accountExists, setAccountExists] = useState(false);
  // id створеного запису — потрібен для посилання на бота (підтвердження й нагадування).
  const [bookingId, setBookingId] = useState("");
  // Крок «підтвердьте в Telegram» від сервера: { holdUntil, alreadyLinked, botUrl }.
  // null — бот вимкнено, запис іде лікарю без підтвердження пацієнтом.
  const [confirm, setConfirm] = useState(null);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [telegram, setTelegram] = useState(user?.telegram ?? "");
  const [serviceId, setServiceId] = useState(wantedService);
  const [slot, setSlot] = useState("");

  const [availability, setAvailability] = useState(null); // null = ще вантажимо
  const [availError, setAvailError] = useState(false);

  const [phoneErr, setPhoneErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Опційне створення доступу до кабінету (для нового клієнта, на екрані "готово").
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Вільні слоти тягнемо з сервера. Перший слот поточної послуги обираємо одразу.
  // reloadKey — повторне завантаження після «Обрати час ще раз» (бронь знято).
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setAvailability(null);
    setAvailError(false);
    getAvailability()
      .then((data) => {
        if (!alive) return;
        setAvailability(data);
        const list = data[serviceId] ?? [];
        setSlot(list.includes(wantedSlot) ? wantedSlot : (list[0] ?? ""));
      })
      .catch(() => {
        if (!alive) return;
        setAvailability({});
        setAvailError(true);
      });
    return () => {
      alive = false;
    };
    // serviceId свідомо не в залежностях: зміну послуги обробляє handleServiceChange.
  }, [reloadKey]);

  // Новий крок — з початку сторінки (на телефоні форма довга, інакше лишаємось внизу).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function handleRetry() {
    setStep("form");
    setConfirm(null);
    setBookingId("");
    setReloadKey((k) => k + 1);
  }

  const service = services.find((s) => s.id === serviceId);
  const slots = availability?.[serviceId] ?? [];
  const hasSlots = slots.length > 0;
  const tg = normalizeTg(telegram); // опційно

  // Зміна послуги → скидаємо вибраний слот на перший доступний
  function handleServiceChange(id) {
    setServiceId(id);
    setSlot((availability?.[id] ?? [])[0] ?? "");
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!hasSlots || !slot || submitting) return; // немає місць / уже надсилаємо
    if (!isValidPhone(phone)) {
      setPhoneErr(true);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      // Запис створюється на сервері (звідси його побачать адмінка й бот).
      const res = await createBooking({
        name,
        phone,
        telegram,
        serviceId: service.id,
        date: slot,
        lang, // якою мовою бот писатиме людині в Telegram
      });
      setConfirm(res.confirm ?? null);
      setAccountExists(!!res.accountExists);
      setBookingId(res.booking?.id ?? "");
      setStep("done");
    } catch (err) {
      setSubmitError(err.message || t("booking.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  // Новий клієнт може одразу задати пароль → створюється акаунт і відкривається кабінет.
  async function handleSetPassword(e) {
    e.preventDefault();
    if (password.length < 4) {
      setPwError(t("booking.passwordShort"));
      return;
    }
    if (password !== password2) {
      setPwError(t("booking.passwordMismatch"));
      return;
    }
    setPwSubmitting(true);
    setPwError("");
    const r = await registerClient({ name, phone, telegram, password });
    if (!r.ok) {
      setPwError(r.error || t("booking.submitError"));
      setPwSubmitting(false);
      return;
    }
    navigate("/cabinet");
  }

  const inputCls =
    "mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

  return (
    <div className="px-6 py-8">
      {/* КРОК 1 — форма запису */}
      {step === "form" && (
        <div className="mx-auto max-w-6xl">
          <div className="animate-rise text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("booking.title").split(" ").slice(0, -1).join(" ")}{" "}
              <span className="accent">{t("booking.title").split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-2 text-sm text-muted">{t("booking.subtitle")}</p>
          </div>

          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)]">
            {/* Правила запису */}
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">📋</span>
                {t("info.rulesTitle")}
              </h2>
              <ol className="mt-3 space-y-2.5">
                {bookingRules.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="text-muted">{r[lang]}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Форма запису */}
            <Card className="p-5">
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted">{t("booking.name")}</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder={t("booking.namePh")}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.phone")}</label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    setPhoneErr(false);
                  }}
                  className={cn(
                    inputCls,
                    phoneErr && "border-danger focus:border-danger focus:ring-red-100",
                  )}
                  placeholder="+380 67 123 45 67"
                />
                {phoneErr ? (
                  <p className="mt-1 text-xs font-medium text-danger">
                    {t("booking.phoneInvalid")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">{t("booking.phoneHint")}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted">
                  {t("booking.telegram")}
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {t("booking.optional")}
                  </span>
                </label>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className={inputCls}
                  placeholder="@username"
                />
                <p className="mt-1 text-xs text-muted">{t("booking.telegramHint")}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.service")}</label>
                <select
                  value={serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className={inputCls}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(`service.${s.id}`)} — {uah(s.price)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">{t(`service.${serviceId}desc`)}</p>
              </div>

              {availability === null ? (
                <p className="py-4 text-center text-sm text-muted">
                  {t("booking.loadingSlots")}
                </p>
              ) : hasSlots ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted">{t("booking.slotLabel")}</label>
                    <select
                      required
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      className={inputCls}
                    >
                      {slots.map((s) => (
                        <option key={s} value={s}>
                          {dateTime(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {submitError && (
                    <p className="text-sm font-medium text-danger">{submitError}</p>
                  )}

                  {/* Наступний крок — підтвердження в боті: кажемо про нього заздалегідь. */}
                  <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
                    <TelegramIcon width={16} height={16} className="shrink-0" />
                    {t("booking.submitHint")}
                  </p>

                  <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-muted">
                      {t("booking.toPay")}{" "}
                      <span className="font-semibold text-ink">{uah(service.price)}</span>
                    </span>
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting ? t("reviews.submitting") : t("booking.submit")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="font-semibold text-amber-800">
                    {t("booking.noSlotsTitle")}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-amber-700">
                    {availError ? t("booking.slotsError") : t("booking.noSlots")}
                  </p>
                  <a
                    href={CLINIC.botUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block"
                  >
                    <Button variant="outline">
                      <TelegramIcon width={18} height={18} />
                      {t("booking.writeChat")}
                    </Button>
                  </a>
                </div>
              )}
            </form>
            </Card>

            {/* Скасування запису */}
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">🧾</span>
                {t("info.cancelTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted">{t("info.cancelSubtitle")}</p>
              <ul className="mt-3 space-y-2.5">
                {cancellationPolicy.map((c, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span aria-hidden="true" className="shrink-0 text-base leading-5">
                      {c.icon}
                    </span>
                    <span className="text-muted">{c[lang]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
                {t("info.cancelNote")}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* КРОК 2а — пацієнт підтверджує запис у Telegram, далі лікар */}
      {step === "done" && confirm && (
        <div className="mx-auto max-w-xl">
          <BookingConfirmStep
            bookingId={bookingId}
            confirm={confirm}
            service={service}
            slot={slot}
            onRetry={handleRetry}
          />
          {user && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => navigate("/cabinet")}>
                {t("booking.goCabinet")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* КРОК 2б — бот вимкнено: запис одразу пішов лікарю */}
      {step === "done" && !confirm && (
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight">
            {accountExists ? t("booking.doneReturningTitle") : t("booking.doneNewTitle")}
          </h1>

          <Card className="mt-6 p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <PhoneIcon width={22} height={22} />
              </div>
              <div>
                <div className="font-semibold">{t("booking.callNoteTitle")}</div>
                <p className="mt-1 text-sm text-muted">
                  {t("booking.callNoteText", { phone })}
                </p>
                {tg && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <TelegramIcon width={16} height={16} />
                    {t("booking.tgAlsoNote", { tg })}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-bg p-3 text-sm">
              <div className="font-medium">{t(`service.${service.id}`)}</div>
              <div className="mt-0.5 text-muted">
                {dateTime(slot)} · {uah(service.price)}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted">{t("booking.simNote")}</p>

            {/* Нагадування за годину: бот дізнається чат пацієнта з payload'у /start. */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600">
                <span aria-hidden="true">⏰</span>
              </div>
              <div>
                <div className="text-sm font-semibold">{t("booking.remindTitle")}</div>
                <p className="mt-0.5 text-sm text-muted">{t("booking.remindText")}</p>
              </div>
            </div>

            {/* Сітка з items-stretch тримає обидві кнопки однакової висоти,
                навіть коли довша назва переноситься у два рядки. */}
            <div className="mt-5 grid items-stretch gap-2 sm:grid-cols-2">
              <a
                href={bookingId ? `${CLINIC.botUrl}?start=r_${bookingId}` : CLINIC.botUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" className="h-full w-full">
                  <TelegramIcon width={18} height={18} className="shrink-0" />
                  {bookingId ? t("booking.remindCta") : t("common.openBot")}
                </Button>
              </a>
              {user ? (
                <Button className="h-full w-full" onClick={() => navigate("/cabinet")}>
                  {t("booking.goCabinet")}
                </Button>
              ) : accountExists ? (
                <Link to="/login">
                  <Button className="h-full w-full">{t("login.submit")}</Button>
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      )}

      {/* Новий клієнт — опційно створити доступ до кабінету (пароль) — в обох варіантах. */}
      {step === "done" && !user && !accountExists && (
        <div className="mx-auto max-w-xl">
          <Card className="mt-4 p-6">
            <h2 className="font-semibold">{t("booking.registerTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("booking.registerSubtitle")}</p>

            <form onSubmit={handleSetPassword} className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
                <PhoneIcon width={18} height={18} />
                <span className="font-medium">{phone}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.password")}</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPwError("");
                  }}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-muted">{t("booking.passwordHint")}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.passwordConfirm")}</label>
                <input
                  required
                  type="password"
                  value={password2}
                  onChange={(e) => {
                    setPassword2(e.target.value);
                    setPwError("");
                  }}
                  className={inputCls}
                />
              </div>

              {pwError && <p className="text-sm font-medium text-danger">{pwError}</p>}

              <div className="flex justify-end border-t border-border pt-3">
                <Button type="submit" disabled={pwSubmitting}>
                  {pwSubmitting ? t("reviews.submitting") : t("booking.createAccount")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
