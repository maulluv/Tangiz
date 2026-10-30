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
      "Після запису сайт дасть посилання сюди: тут ви підтвердите запис, отримаєте відповідь " +
      "лікаря й нагадування за добу й за годину до візиту.\n" +
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
    confirmAsk:
      "Майже готово! Підтвердіть, будь ласка, свій запис{doctor}:\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "Час тримається за вами до {until}. Після підтвердження запис піде лікарю, " +
      "і ми напишемо, щойно він його погодить.",
    confirmYes: "✅ Підтверджую",
    confirmNo: "❌ Скасувати",
    confirmSent:
      "✅ Дякуємо! Запис передано лікарю.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "Напишемо, щойно лікар його підтвердить. Нагадаємо про візит за добу й за годину.",
    confirmDeclined: "Запис скасовано, час знову вільний. Записатися на інший можна на сайті.",
    confirmTooLate:
      "На жаль, час на підтвердження вийшов і цей запис скасовано.\n" +
      "Оберіть, будь ласка, час на сайті ще раз.",
    confirmAlready: "Цей запис уже підтверджено вами. Ми напишемо, щойно лікар його погодить.",
    holdExpired:
      "⌛ Запис не підтвердили вчасно, тому його скасовано, а час знову вільний.\n\n" +
      "🩺 {service}\n🗓 {date}\n\nЯкщо ще актуально — оберіть час на сайті ще раз.",
    doctorReply: "👨‍⚕️ Відповідь лікаря:",
    confirmed:
      "🎉 Ви успішно записані{doctor}!\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
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
      "After booking, the site gives you a link here: you confirm the appointment, get the " +
      "doctor's answer and reminders a day and an hour before the visit.\n" +
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
    confirmAsk:
      "Almost done! Please confirm your appointment{doctor}:\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "The slot is held for you until {until}. Once you confirm, it goes to the doctor " +
      "and we'll message you as soon as it's approved.",
    confirmYes: "✅ Confirm",
    confirmNo: "❌ Cancel",
    confirmSent:
      "✅ Thank you! Your appointment has been sent to the doctor.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "We'll message you once the doctor confirms it, and remind you a day and an hour before.",
    confirmDeclined: "The appointment was canceled and the slot is free again. You can book another time on the website.",
    confirmTooLate:
      "Unfortunately, the time to confirm has run out and this appointment was canceled.\n" +
      "Please pick a time on the website again.",
    confirmAlready: "You've already confirmed this appointment. We'll message you once the doctor approves it.",
    holdExpired:
      "⌛ The appointment wasn't confirmed in time, so it was canceled and the slot is free again.\n\n" +
      "🩺 {service}\n🗓 {date}\n\nIf it's still relevant — pick a time on the website again.",
    doctorReply: "👨‍⚕️ Reply from the doctor:",
    confirmed:
      "🎉 You're booked{doctor}!\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
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
