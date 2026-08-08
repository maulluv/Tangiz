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
  const [firstName, ...rest] = CLINIC.doctorName.split(" ");
  const lastName = rest.join(" ");
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Шапка з фото */}
      <section className="animate-rise grid grid-cols-1 items-center gap-8 sm:grid-cols-[auto_1fr]">
        <div className="relative mx-auto w-40 sm:mx-0">
          <div
            className="absolute -inset-2.5 rounded-[22px] bg-gradient-to-tr from-brand-500/25 via-brand-200/20 to-transparent blur-lg"
            aria-hidden="true"
          />
          <Card className="relative aspect-[2/3] w-40 overflow-hidden shadow-[var(--shadow-lift)]">
            <DoctorPhoto />
          </Card>
        </div>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/70 px-3.5 py-1.5 text-sm font-medium text-brand-700">
            <span className="size-1.5 rounded-full bg-brand-500" />
            {t("clinic.specialty")}
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName} {lastName && <span className="accent">{lastName}</span>}
          </h1>
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
      <div className="mt-12 space-y-8">
        {sections.map((s) => (
          <section key={s.h} className="border-l-2 border-brand-100 pl-5">
            <h2 className="text-xl font-semibold tracking-tight">{t(s.h)}</h2>
            <p className="mt-2 leading-relaxed text-muted">{t(s.p)}</p>
          </section>
        ))}
      </div>

      {/* Інтерв'ю та виступи */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">{t("about.mediaTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((iv) => (
            <a
              key={iv.id}
              href={iv.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
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
      <div className="relative mt-12 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-tr from-brand-50 via-surface to-surface p-7 shadow-[var(--shadow-soft)]">
        <div
          className="absolute -right-10 -top-10 size-40 rounded-full bg-brand-500/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xl font-semibold tracking-tight">{t("about.ctaTitle")} 🤙</div>
            <p className="mt-1 text-sm text-muted">{t("about.ctaText")}</p>
          </div>
          <Link to="/booking" className="shrink-0">
            <Button className="px-6 py-3">{t("landing.bookCta")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
