// Час клініки в одному місці.
//
// Навіщо: сервер може стояти в будь-якому часовому поясі (хостинг зазвичай UTC),
// а лікар і пацієнти живуть за київським часом. Якщо покластися на «годинник
// сервера», слот «25.08 10:00», доданий у боті, після деплою поїде на три години.
// Тому пояс задаємо явно: CLINIC_TZ у .env (типово Europe/Kyiv).
//
// Модуль треба імпортувати ПЕРШИМ (див. index.js): присвоєння process.env.TZ
// має відбутись до того, як інші модулі почнуть створювати дати.

const FALLBACK_TZ = "Europe/Kyiv";
const wanted = (process.env.CLINIC_TZ || FALLBACK_TZ).trim();

// Некоректна назва поясу впаде тут, а не посеред нагадування о 3-й ночі.
function isValidTz(tz) {
  try {
    new Intl.DateTimeFormat("uk-UA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const CLINIC_TZ = isValidTz(wanted) ? wanted : FALLBACK_TZ;
if (CLINIC_TZ !== wanted) {
  console.warn(`⚠️  Невідомий CLINIC_TZ="${wanted}" — використовую ${FALLBACK_TZ}.`);
}

// Локальний час процесу = час клініки. Завдяки цьому `new Date(2026, 7, 25, 10, 0)`
// у боті (розбір "25.08 10:00") означає саме 10:00 у Києві, де б не стояв сервер.
process.env.TZ = CLINIC_TZ;

// en-GB, а не en-US: клініка європейська — 24-годинний час і день перед місяцем.
const LOCALES = { uk: "uk-UA", en: "en-GB" };
const locale = (lang) => LOCALES[lang] || LOCALES.uk;

// "25.08, 10:00" — короткий формат для списків слотів і карток запису.
export function formatDateTime(d, lang = "uk") {
  return new Date(d).toLocaleString(locale(lang), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  });
}

// "понеділок, 25 серпня, 10:00" — для нагадування за добу (день тижня важливіший за цифри).
export function formatLongDateTime(d, lang = "uk") {
  return new Date(d).toLocaleString(locale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  });
}

// "10:00" — коли дата вже названа в сусідньому рядку.
export function formatTime(d, lang = "uk") {
  return new Date(d).toLocaleString(locale(lang), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TZ,
  });
}
