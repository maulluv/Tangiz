// Двомовні тексти бота для ПАЦІЄНТА (uk / en).
//
// Сайт двомовний, тож мову, обрану при записі, ми зберігаємо в User.lang і далі
// говоримо з людиною саме нею. Пацієнт може перемкнути мову в боті командою /lang.
// Тексти для лікаря лишаються українською — вони в bot.js.
//
// Рядки з підстановками: {service}, {date}, {doctor}, {address}, {name}.

export const LANGS = ["uk", "en"];
export const normalizeLang = (v) => (LANGS.includes(String(v)) ? String(v) : "uk");

// Назви послуг збігаються з i18n сайту (src/i18n/translations.js).
const SERVICES = {
  uk: { s1: "Консультація", s2: "Мануальна терапія", s3: "Терапевтичний прийом" },
  en: { s1: "Consultation", s2: "Manual therapy", s3: "Therapy session" },
};

export const serviceLabel = (id, lang = "uk") => SERVICES[normalizeLang(lang)][id] || id;

// Короткі назви для списку слотів у лікаря (завжди українською).
export const SERVICE_SHORT = { s1: "Консульт.", s2: "Мануальна", s3: "Терапевт." };

const TEXT = {
  uk: {
    startPatient:
      "Вітаю! Це бот клініки TANGIZ.\n\n" +
      "Записатися на прийом найзручніше на сайті — там видно всі вільні години.\n" +
      "Після запису поверніться сюди за посиланням із сайту — і ми нагадаємо про візит " +
      "за добу й за годину.\n" +
      "Можете також написати сюди: лікар отримає ваше повідомлення й відповість.",
    remindersOn:
      "✅ Готово! Нагадаємо про візит за добу й за годину, а також напишемо, коли лікар " +
      "підтвердить запис.\n\n🩺 {service}\n🗓 {date}\n\nЯкщо плани зміняться — просто напишіть сюди.",
    remindersOnCanceled:
      "Цей запис скасовано, тож нагадувати нема про що.\n" +
      "Але ми вас запам'ятали: нагадаємо про наступний візит.",
    bookingNotFound: "Не вдалося знайти цей запис. Напишіть сюди — лікар підкаже, що сталося.",
    msgAck:
      "Дякуємо за звернення! Щоб записатися на прийом, скористайтеся сайтом. " +
      "Лікар отримав ваше повідомлення й відповість найближчим часом.",
    doctorReply: "👨‍⚕️ Відповідь лікаря:",
    confirmed:
      "✅ Запис підтверджено{doctor}\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "Чекаємо на вас. Якщо плани зміняться — напишіть сюди.",
    canceled:
      "❌ На жаль, цей запис скасовано.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "Оберіть, будь ласка, інший час на сайті — або напишіть сюди, і лікар підкаже зручний.",
    remindDay:
      "🗓 Нагадування про візит\n\nВаш прийом{doctor} — {date}.\n\n" +
      "🩺 {service}{address}\n\nЯкщо плани змінилися — напишіть сюди, ми передамо лікарю.",
    remindHour:
      "⏰ Нагадування про візит\n\nЗа годину — ваш прийом{doctor}.\n\n" +
      "🩺 {service}\n🗓 {date}{address}\n\nЯкщо плани змінилися — напишіть сюди, ми передамо лікарю.",
    doctorOf: " у лікаря {name}",
    langChoose: "Оберіть мову / Choose a language:",
    langSet: "✅ Готово, спілкуємось українською.",
  },
  en: {
    startPatient:
      "Hello! This is the TANGIZ clinic bot.\n\n" +
      "The easiest way to book is on the website — it shows every free hour.\n" +
      "After booking, come back here via the link on the site and we'll remind you " +
      "a day and an hour before your visit.\n" +
      "You can also write here: the doctor will get your message and reply.",
    remindersOn:
      "✅ All set! We'll remind you a day and an hour before your visit, and message you " +
      "once the doctor confirms the appointment.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "If your plans change — just write here.",
    remindersOnCanceled:
      "This appointment was canceled, so there's nothing to remind about.\n" +
      "But we've saved your chat: we'll remind you about the next visit.",
    bookingNotFound: "We couldn't find this appointment. Write here — the doctor will help.",
    msgAck:
      "Thanks for reaching out! To book an appointment, please use the website. " +
      "The doctor has received your message and will reply shortly.",
    doctorReply: "👨‍⚕️ Reply from the doctor:",
    confirmed:
      "✅ Appointment confirmed{doctor}\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "See you there. If your plans change — write here.",
    canceled:
      "❌ Unfortunately, this appointment has been canceled.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "Please pick another time on the website — or write here and the doctor will suggest one.",
    remindDay:
      "🗓 Appointment reminder\n\nYour appointment{doctor} is on {date}.\n\n" +
      "🩺 {service}{address}\n\nIf your plans changed — write here and we'll tell the doctor.",
    remindHour:
      "⏰ Appointment reminder\n\nYour appointment{doctor} starts in an hour.\n\n" +
      "🩺 {service}\n🗓 {date}{address}\n\nIf your plans changed — write here and we'll tell the doctor.",
    doctorOf: " with Dr. {name}",
    langChoose: "Оберіть мову / Choose a language:",
    langSet: "✅ Done, we'll speak English.",
  },
};

// tt("en", "confirmed", { service: "Consultation", … }) → готовий рядок.
// Невідомий ключ повертаємо як є — краще службовий текст, ніж порожнє повідомлення.
export function tt(lang, key, vars = {}) {
  const dict = TEXT[normalizeLang(lang)] ?? TEXT.uk;
  let str = dict[key] ?? TEXT.uk[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v ?? "");
  }
  return str;
}
