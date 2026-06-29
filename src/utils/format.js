let currentLocale = "uk-UA";

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
  }).format(new Date(iso));

export const dateTime = (iso) =>
  new Intl.DateTimeFormat(currentLocale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const timeOnly = (iso) =>
  new Intl.DateTimeFormat(currentLocale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
