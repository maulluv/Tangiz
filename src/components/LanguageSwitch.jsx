import { useI18n } from "@/i18n";

export default function LanguageSwitch({ className = "" }) {
  const { lang, toggle } = useI18n();
  return (
    <button
      onClick={toggle}
      title={lang === "uk" ? "Switch to English" : "Перемкнути на українську"}
      className={`inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink ${className}`}
    >
      <span className={lang === "uk" ? "text-brand-700" : ""}>УКР</span>
      <span className="text-border">/</span>
      <span className={lang === "en" ? "text-brand-700" : ""}>EN</span>
    </button>
  );
}
