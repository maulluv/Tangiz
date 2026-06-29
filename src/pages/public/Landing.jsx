import { Link } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { PhoneIcon, TelegramIcon } from "@/components/icons";
import DoctorPhoto from "@/components/DoctorPhoto";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";

export default function Landing() {
  const { t } = useI18n();
  const CLINIC = useClinic();
  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero / біографія — головна сторінка навмисно мінімалістична */}
      <section className="grid grid-cols-1 items-stretch gap-8 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            {t("clinic.specialty")}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {CLINIC.doctorName}
          </h1>
          <p className="mt-4 text-lg font-medium leading-snug text-ink">
            {t("clinic.tagline")}
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {t("clinic.bio")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/booking">
              <Button className="px-5 py-2.5">{t("landing.bookCta")}</Button>
            </Link>
            <a href={CLINIC.botUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="px-5 py-2.5">
                <TelegramIcon width={18} height={18} />
                {t("common.openBot")}
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <a
              href={CLINIC.botUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-brand-700"
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

        <Card className="relative order-first mx-auto aspect-[2/3] w-full max-w-[230px] overflow-hidden md:order-last md:mx-0 md:h-full md:w-auto md:max-w-none">
          <DoctorPhoto />
        </Card>
      </section>
    </div>
  );
}
