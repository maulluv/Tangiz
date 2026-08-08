import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { PhoneIcon, TelegramIcon } from "@/components/icons";
import DoctorPhoto from "@/components/DoctorPhoto";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";

export default function Landing() {
  const { t } = useI18n();
  const CLINIC = useClinic();

  // Розбиваємо ім'я лікаря: прізвище — акцентним курсивом-серифом (штрих у дусі 21st.dev)
  const [firstName, ...rest] = CLINIC.doctorName.split(" ");
  const lastName = rest.join(" ");

  return (
    <div className="relative overflow-hidden">
      {/* Декоративне тло */}
      <div className="hero-glow" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-[520px] grid-bg" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-6">
        <section className="grid grid-cols-1 items-center gap-10 py-12 sm:py-16 md:grid-cols-[minmax(0,1fr)_280px] md:gap-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/70 px-3.5 py-1.5 text-sm font-medium text-brand-700 backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand-500" />
              {t("clinic.specialty")}
            </span>

            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {firstName}{" "}
              {lastName && <span className="accent">{lastName}</span>}
            </h1>

            <p className="mt-5 max-w-xl text-lg font-medium leading-snug text-ink sm:text-xl">
              {t("clinic.tagline")}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {t("clinic.bio")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/booking">
                <Button className="px-6 py-3 text-[15px]">{t("landing.bookCta")}</Button>
              </Link>
              <a href={CLINIC.botUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" className="px-6 py-3 text-[15px]">
                  <TelegramIcon width={18} height={18} />
                  {t("common.openBot")}
                </Button>
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <a
                href={CLINIC.botUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
              >
                <TelegramIcon width={18} height={18} />
                {CLINIC.telegram}
              </a>
              <span className="inline-flex items-center gap-2">
                <PhoneIcon width={18} height={18} />
                {CLINIC.phone}
              </span>
            </div>
          </div>

          {/* Фото лікаря з градієнтним обрамленням */}
          <div className="animate-rise order-first mx-auto w-full max-w-[280px] md:order-last md:mx-0 md:max-w-none">
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
      </div>
    </div>
  );
}
