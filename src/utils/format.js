let currentLocale = "uk-UA";

// Прийом — у Києві, тож дати й години показуємо за київським часом незалежно від поясу
// браузера: інакше пацієнт за кордоном побачив би слот «10:00» як «09:00» (а бот пише 10:00).
export const CLINIC_TZ = "Europe/Kyiv";

export function setLocale(locale) {
  currentLocale = locale;
}

export const uah = (n) =>
  new Intl.NumberFormat(currentLocale, {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(n);

export const dateLong = (iso) =>
  new Intl.DateTimeFormat(currentLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CLINIC_TZ,
  }).format(new Date(iso));

export const dateTime = (iso) =>
  new Intl.DateTimeFormat(currentLocale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  }).format(new Date(iso));

export const timeOnly = (iso) =>
  new Intl.DateTimeFormat(currentLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  }).format(new Date(iso));

// «пт, 01.11 · 10:00» — коротко для чипів із вільним часом.
export const slotShort = (iso) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(currentLocale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: CLINIC_TZ,
  }).format(d);
  return `${day} · ${timeOnly(iso)}`;
};
