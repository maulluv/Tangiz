import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Modal } from "@/components/ui";
import { PhoneIcon, TelegramIcon, StarIcon, ClockIcon } from "@/components/icons";
import DoctorPhoto from "@/components/DoctorPhoto";
import { services } from "@/data";
import { useClinic } from "@/features/clinic";
import { getAvailability } from "@/features/booking";
import { getReviews } from "@/features/reviews";
import { uah, slotShort } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

// Головна побудована навколо однієї дії — запису на консультацію (послуга s1).
// Кожен блок або веде до запису, або знімає сумнів перед ним.
const CONSULT = services.find((s) => s.id === "s1");
const bookUrl = (slot) =>
  `/booking?service=${CONSULT.id}${slot ? `&slot=${encodeURIComponent(slot)}` : ""}`;

const WHEN = ["when1", "when2", "when3", "when4", "when5", "when6", "when7", "when8"];
const GET = ["get1", "get2", "get3", "get4"];

export default function Landing() {
  const { t, lang } = useI18n();
  const CLINIC = useClinic();
  const [callOpen, setCallOpen] = useState(false);
  const [slots, setSlots] = useState(null); // null — ще вантажимо
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let alive = true;
    getAvailability()
      .then((data) => alive && setSlots(data[CONSULT.id] ?? []))
      .catch(() => alive && setSlots([]));
    getReviews()
      .then((list) => alive && setReviews(list.filter((r) => r.rating >= 4).slice(0, 3)))
      .catch(() => {
        /* без відгуків головна теж працює */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Плаваюча кнопка запису на телефоні: з'являється, коли кнопка в hero вже прокручена,
  // і ховається біля фінального заклику (там своя кнопка, а нижче — футер).
  const heroCtaRef = useRef(null);
  const finalRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === heroCtaRef.current) setHeroVisible(e.isIntersecting);
        if (e.target === finalRef.current) setFinalVisible(e.isIntersecting);
      }
    });
    if (heroCtaRef.current) io.observe(heroCtaRef.current);
    if (finalRef.current) io.observe(finalRef.current);
    return () => io.disconnect();
  }, []);
  const showSticky = !heroVisible && !finalVisible;

  function callDoctor() {
    setCallOpen(false);
    window.location.href = `tel:${(CLINIC.phone || "").replace(/\s/g, "")}`;
  }

  const consultMeta = t("landing.consultMeta", {
    price: uah(CONSULT.price),
    min: CONSULT.durationMin,
  });
  const nextSlots = (slots ?? []).slice(0, 4);

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-[520px] grid-bg" aria-hidden="true" />

      {/* ── HERO: пропозиція + кнопка + найближчий час ───────────────── */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid grid-cols-1 items-center gap-8 py-8 sm:py-14 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
          <div className="animate-rise">
            {/* Телефон: компактний аватар замість великого фото — щоб кнопка запису
                була на першому екрані. */}
            <div className="flex items-center gap-3 md:hidden">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-surface shadow-[var(--shadow-soft)]">
                <DoctorPhoto />
              </div>
              <div>
                <div className="font-semibold">{CLINIC.doctorName}</div>
                <div className="text-sm text-muted">{t("clinic.specialty")}</div>
              </div>
            </div>

            <span className="hidden flex-wrap items-center gap-x-2 md:inline-flex gap-y-1 rounded-full border border-brand-100 bg-brand-50/70 px-3.5 py-1.5 text-sm font-medium text-brand-700 backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand-500" />
              {CLINIC.doctorName}
              <span className="text-brand-200" aria-hidden="true">·</span>
              <span className="font-normal">{t("clinic.specialty")}</span>
            </span>

            <h1 className="mt-5 text-[2.1rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.3rem]">
              {t("landing.heroTitle")} <span className="accent">{t("landing.heroAccent")}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {t("landing.heroLead", { min: CONSULT.durationMin })}
            </p>

            <div ref={heroCtaRef} className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to={bookUrl()} className="sm:w-auto">
                <Button className="h-13 w-full px-7 text-base sm:w-auto">
                  {t("landing.consultCta")}
                </Button>
              </Link>
              <span className="flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
                <ClockIcon width={16} height={16} />
                {consultMeta}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <a
                href={CLINIC.botUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
              >
                <TelegramIcon width={18} height={18} />
                {CLINIC.telegram}
              </a>
              <button
                type="button"
                onClick={() => setCallOpen(true)}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
              >
                <PhoneIcon width={18} height={18} />
                {CLINIC.phone}
              </button>
            </div>
          </div>

          {/* Фото + картка з найближчим вільним часом */}
          <div className="animate-rise hidden w-full md:block">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-[26px] bg-gradient-to-tr from-brand-500/30 via-brand-200/20 to-transparent blur-xl"
                aria-hidden="true"
              />
              <div className="relative aspect-[2/3] overflow-hidden rounded-[22px] border border-border bg-surface shadow-[var(--shadow-lift)]">
                <DoctorPhoto />
              </div>
            </div>
          </div>
        </section>

        {/* ── Найближчі вільні години ──────────────────────────────────── */}
        <section className="animate-rise">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  {t("landing.nextSlots")}
                </h2>
                {nextSlots.length > 0 && (
                  <p className="mt-0.5 text-sm text-muted">{t("landing.nextSlotsHint")}</p>
                )}
              </div>
              {nextSlots.length > 0 && (
                <Link
                  to={bookUrl()}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("landing.moreSlots")}
                </Link>
              )}
            </div>

            {slots === null ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-black/5" />
                ))}
              </div>
            ) : nextSlots.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {nextSlots.map((s) => (
                  <Link
                    key={s}
                    to={bookUrl(s)}
                    className="rounded-xl border border-border bg-bg px-3 py-3 text-center text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {slotShort(s)}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">{t("landing.noSlots")}</p>
                <a href={CLINIC.botUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <TelegramIcon width={18} height={18} />
                    {t("booking.writeChat")}
                  </Button>
                </a>
              </div>
            )}
          </Card>
        </section>

        {/* ── Як записатися: 3 кроки ───────────────────────────────────── */}
        <section className="py-14 sm:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("landing.howTitle")} <span className="accent">{t("landing.howAccent")}</span>
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["how1t", "how1d", "🗓"],
              ["how2t", "how2d", "✈️"],
              ["how3t", "how3d", "✅"],
            ].map(([title, desc, icon], i) => (
              <li key={title}>
                <Card className="relative h-full p-6">
                  <span className="absolute right-5 top-5 text-4xl font-semibold text-black/[0.05]">
                    {i + 1}
                  </span>
                  <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-xl" aria-hidden="true">
                    {icon}
                  </div>
                  <h3 className="mt-4 font-semibold">{t(`landing.${title}`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`landing.${desc}`)}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* ── З чим приходять + що отримаєте ───────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-stretch">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.whenTitle")} <span className="accent">{t("landing.whenAccent")}</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {t("clinic.tagline")}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {WHEN.map((k) => (
                <li
                  key={k}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-[var(--shadow-soft)]"
                >
                  {t(`landing.${k}`)}
                </li>
              ))}
            </ul>
          </div>

          <Card className="flex flex-col p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-brand-600">{t(`service.${CONSULT.id}`)}</div>
                <h3 className="mt-1 text-lg font-semibold">{t("landing.getTitle")}</h3>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">{uah(CONSULT.price)}</div>
                <div className="text-xs text-muted">{t("landing.minutes", { n: CONSULT.durationMin })}</div>
              </div>
            </div>
            <ul className="mt-5 flex-1 space-y-3">
              {GET.map((k) => (
                <li key={k} className="flex gap-3 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] text-white">
                    ✓
                  </span>
                  <span>{t(`landing.${k}`)}</span>
                </li>
              ))}
            </ul>
            <Link to={bookUrl()} className="mt-6 block">
              <Button className="h-12 w-full text-[15px]">{t("landing.consultCta")}</Button>
            </Link>
          </Card>
        </section>

        {/* ── Відгуки ──────────────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <section className="pt-14 sm:pt-20">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("landing.reviewsTitle").split(" ").slice(0, -1).join(" ")}{" "}
                <span className="accent">{t("landing.reviewsTitle").split(" ").slice(-1)}</span>
              </h2>
              <Link to="/reviews" className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700">
                {t("landing.seeAll")}
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <Card key={r.id} className="flex flex-col p-5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon
                        key={i}
                        width={15}
                        height={15}
                        className={cn(i <= r.rating ? "text-amber-400" : "text-border")}
                      />
                    ))}
                  </div>
                  <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-ink/80">
                    «{r.text?.[lang] ?? r.text?.uk}»
                  </p>
                  <div className="mt-4 text-sm font-medium">{r.name}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Фінальний заклик ─────────────────────────────────────────── */}
        <section ref={finalRef} className="py-14 sm:py-20">
          <div className="relative overflow-hidden rounded-[28px] bg-brand-500 px-6 py-10 text-center text-white shadow-[var(--shadow-brand)] sm:px-10 sm:py-14">
            <div
              className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <h2 className="relative text-2xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.finalTitle")}{" "}
              <span className="font-serif italic">{t("landing.finalAccent")}</span>
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              {t("landing.finalText")}
            </p>
            <Link to={bookUrl()} className="relative mt-7 inline-block w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-12 w-full border-white bg-white px-7 text-[15px] text-brand-700 hover:bg-white/90 sm:w-auto"
              >
                {t("landing.consultCta")}
              </Button>
            </Link>
            <div className="relative mt-3 text-sm text-white/70">{consultMeta}</div>
          </div>
        </section>
      </div>

      {/* Плаваюча кнопка запису (лише телефон) */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 md:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
      >
        <Link to={bookUrl()} tabIndex={showSticky ? 0 : -1}>
          <Button className="h-12 w-full text-[15px]">
            {t("landing.stickyCta")} · {uah(CONSULT.price)}
          </Button>
        </Link>
      </div>

      {/* Підтвердження дзвінка лікарю */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)} title={t("call.title")} className="max-w-sm">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <PhoneIcon width={22} height={22} />
            </div>
            <div>
              <p className="font-medium">{t("call.question")}</p>
              <p className="mt-1 text-sm text-muted">{CLINIC.phone}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCallOpen(false)}>
              {t("call.no")}
            </Button>
            <Button onClick={callDoctor}>
              <PhoneIcon width={18} height={18} />
              {t("call.yes")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
