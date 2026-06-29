import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { TelegramIcon } from "@/components/icons";
import { availability, bookingRules, cancellationPolicy, services } from "@/data";
import { uah, dateTime } from "@/utils/format";
import { useAuth, findUser, normalizeTg, registerUser } from "@/features/auth";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";
import { addBooking } from "@/features/booking";

export default function Booking() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { t, lang } = useI18n();
  const CLINIC = useClinic();

  const [step, setStep] = useState("form"); // form | register | done
  const [isNewUser, setIsNewUser] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [telegram, setTelegram] = useState(user?.telegram ?? "");
  const [serviceId, setServiceId] = useState(services[0].id);
  const [slot, setSlot] = useState(availability[services[0].id]?.[0] ?? "");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId);
  const slots = availability[serviceId] ?? [];
  const hasSlots = slots.length > 0;
  const tg = normalizeTg(telegram);

  // Зміна послуги → скидаємо вибраний слот на перший доступний
  function handleServiceChange(id) {
    setServiceId(id);
    setSlot((availability[id] ?? [])[0] ?? "");
  }

  // Створює запис + сесію та переходить на екран підтвердження
  function completeBooking(finalName, finalPhone, isNew) {
    signIn({ id: tg, name: finalName, phone: finalPhone, telegram: tg });
    addBooking({
      userId: tg,
      serviceId: service.id,
      price: service.price,
      date: new Date(slot).toISOString(),
    });
    setIsNewUser(isNew);
    setStep("done");
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!hasSlots || !slot) return; // немає вільних місць — запис заблоковано
    const existing = findUser(tg);
    if (existing) {
      // Уже зареєстрований → одразу підтвердження (як у боті)
      completeBooking(existing.name || name, existing.phone || phone, false);
    } else {
      // Новий → крок реєстрації з паролем
      setStep("register");
    }
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    if (password.length < 4) {
      setError(t("booking.passwordShort"));
      return;
    }
    if (password !== password2) {
      setError(t("booking.passwordMismatch"));
      return;
    }
    registerUser({ telegram: tg, name, phone, password });
    completeBooking(name, phone, true);
  }

  const inputCls =
    "mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-brand-500";

  return (
    <div className="px-6 py-12">
      {/* КРОК 1 — форма запису */}
      {step === "form" && (
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t("booking.title")}</h1>
            <p className="mt-2 text-muted">{t("booking.subtitle")}</p>
          </div>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)]">
            {/* Правила запису */}
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">📋</span>
                {t("info.rulesTitle")}
              </h2>
              <ol className="mt-4 space-y-3">
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
            <Card className="p-6">
            <form onSubmit={handleFormSubmit} className="space-y-4">
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
                <label className="text-sm font-medium text-muted">{t("booking.telegram")}</label>
                <input
                  required
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className={inputCls}
                  placeholder="@username"
                />
                <p className="mt-1 text-xs text-muted">{t("booking.telegramHint")}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.phone")}</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  placeholder="+380 67 123 45 67"
                />
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

              {hasSlots ? (
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

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted">
                      {t("booking.toPay")}{" "}
                      <span className="font-semibold text-ink">{uah(service.price)}</span>
                    </span>
                    <Button type="submit">{t("booking.submit")}</Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="font-semibold text-amber-800">
                    {t("booking.noSlotsTitle")}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-amber-700">
                    {t("booking.noSlots")}
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
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">🧾</span>
                {t("info.cancelTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted">{t("info.cancelSubtitle")}</p>
              <ul className="mt-4 space-y-3">
                {cancellationPolicy.map((c, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span aria-hidden="true" className="shrink-0 text-base leading-5">
                      {c.icon}
                    </span>
                    <span className="text-muted">{c[lang]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
                {t("info.cancelNote")}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* КРОК 2 — реєстрація нового клієнта (пароль) */}
      {step === "register" && (
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight">{t("booking.registerTitle")}</h1>
          <p className="mt-2 text-muted">{t("booking.registerSubtitle")}</p>

          <Card className="mt-6 p-6">
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                <TelegramIcon width={18} height={18} />
                <span className="font-medium">{tg}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-muted">{t("booking.password")}</label>
                <input
                  required
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
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
                    setError("");
                  }}
                  className={inputCls}
                />
              </div>

              {error && <p className="text-sm font-medium text-danger">{error}</p>}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  {t("booking.back")}
                </button>
                <Button type="submit">{t("booking.createAccount")}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* КРОК 3 — підтвердження + симуляція сповіщення в Telegram */}
      {step === "done" && (
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight">
            {isNewUser ? t("booking.doneNewTitle") : t("booking.doneReturningTitle")}
          </h1>

          <Card className="mt-6 p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <TelegramIcon width={22} height={22} />
              </div>
              <div>
                <div className="font-semibold">{t("booking.tgNoteTitle")}</div>
                <p className="mt-1 text-sm text-muted">
                  {isNewUser
                    ? t("booking.tgNoteNew", { tg })
                    : t("booking.tgNoteReturning", { tg })}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-bg p-3 text-sm">
              <div className="font-medium">{t(`service.${service.id}`)}</div>
              <div className="mt-0.5 text-muted">
                {dateTime(slot)} · {uah(service.price)}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted">{t("booking.simNote")}</p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={CLINIC.botUrl}
                target="_blank"
                rel="noreferrer"
                className="sm:flex-1"
              >
                <Button variant="outline" className="w-full">
                  <TelegramIcon width={18} height={18} />
                  {t("common.openBot")}
                </Button>
              </a>
              <Button className="sm:flex-1" onClick={() => navigate("/cabinet")}>
                {t("booking.goCabinet")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
