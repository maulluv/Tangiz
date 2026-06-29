import { Link } from "react-router-dom";
import { Button, Card } from "@/components/ui";
import { PlayIcon } from "@/components/icons";
import DoctorPhoto from "@/components/DoctorPhoto";
import SocialLinks from "@/components/SocialLinks";
import { interviews } from "@/data";
import { useClinic } from "@/features/clinic";
import { useI18n } from "@/i18n";

const facts = [
  { icon: "🇬🇪", tKey: "about.fact1" },
  { icon: "🇺🇦", tKey: "about.fact2" },
  { icon: "🍵", tKey: "about.fact3" },
  { icon: "🌍", tKey: "about.fact4" },
];

const sections = [
  { h: "about.h1", p: "about.p1" },
  { h: "about.h2", p: "about.p2" },
  { h: "about.h3", p: "about.p3" },
];

export default function About() {
  const { t, lang } = useI18n();
  const CLINIC = useClinic();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Шапка з фото */}
      <section className="grid grid-cols-1 items-start gap-8 sm:grid-cols-[auto_1fr]">
        <Card className="relative mx-auto aspect-[2/3] w-40 overflow-hidden sm:mx-0">
          <DoctorPhoto />
        </Card>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            {t("clinic.specialty")}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{CLINIC.doctorName}</h1>
          <p className="mt-2 text-muted">{t("about.soulMix")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {facts.map((f) => (
              <span
                key={f.tKey}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted"
              >
                <span aria-hidden="true">{f.icon}</span>
                {t(f.tKey)}
              </span>
            ))}
          </div>
          <SocialLinks className="-ml-2 mt-4" />
        </div>
      </section>

      {/* Розповідь */}
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{t(s.h)}</h2>
            <p className="mt-2 leading-relaxed text-muted">{t(s.p)}</p>
          </section>
        ))}
      </div>

      {/* Інтерв'ю та виступи */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t("about.mediaTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((iv) => (
            <a
              key={iv.id}
              href={iv.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand-500"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <PlayIcon width={20} height={20} />
              </span>
              <span className="text-sm font-medium leading-snug group-hover:text-brand-700">
                {iv.title[lang]}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Card className="mt-10 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-lg font-semibold">{t("about.ctaTitle")} 🤙</div>
          <p className="mt-1 text-sm text-muted">{t("about.ctaText")}</p>
        </div>
        <Link to="/booking" className="shrink-0">
          <Button className="px-5 py-2.5">{t("landing.bookCta")}</Button>
        </Link>
      </Card>
    </div>
  );
}
