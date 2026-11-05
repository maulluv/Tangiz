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
// Ім'я лікаря латиницею для англомовних пацієнтів (те саме, що на сайті — clinicStore.js).
const EN_NAMES = { "Тенгіз Дадвані": "Tengiz Dadvani" };
export const doctorNameIn = (name, lang) =>
  (normalizeLang(lang) === "en" && EN_NAMES[(name || "").trim()]) || name;

export const SERVICE_SHORT = { s1: "Консульт.", s2: "Мануальна", s3: "Терапевт." };

const TEXT = {
  uk: {
    startPatient:
      "Вітаю! Це бот клініки TANGIZ 👋\n\n" +
      "Тут можна:\n" +
      "🗓 записатися на прийом — бот покаже вільні години;\n" +
      "📋 переглянути або скасувати свої записи;\n" +
      "⭐ залишити відгук після прийому;\n" +
      "✉️ написати лікарю — просто надішліть повідомлення, він відповість сюди.\n\n" +
      "Також нагадаємо про візит за добу й за годину. Скористайтеся кнопками внизу 👇",
    remindersOn:
      "✅ Готово! Нагадаємо про візит за добу й за годину, а також напишемо, коли лікар " +
      "підтвердить запис.\n\n🩺 {service}\n🗓 {date}\n\nЯкщо плани зміняться — просто напишіть сюди.",
    remindersOnCanceled:
      "Цей запис скасовано, тож нагадувати нема про що.\n" +
      "Але ми вас запам'ятали: нагадаємо про наступний візит.",
    bookingNotFound: "Не вдалося знайти цей запис. Напишіть сюди — лікар підкаже, що сталося.",
    msgAck:
      "✉️ Ваше повідомлення передано лікарю — він відповість сюди найближчим часом.\n" +
      "Записатися на прийом можна кнопкою «🗓 Записатися» внизу.",
    msgAckFollowUp: "🙏 Дякую! Лікар отримав вашу відповідь і напише вам сюди.",
    confirmAsk:
      "Майже готово! Підтвердіть, будь ласка, свій запис{doctor}:\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "Час тримається за вами до {until}. Після підтвердження запис піде лікарю, " +
      "і ми напишемо, щойно він його погодить.",
    confirmYes: "✅ Підтверджую",
    confirmNo: "❌ Скасувати",
    confirmSent:
      "✅ Дякуємо! Запис передано лікарю.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "Напишемо, щойно лікар його підтвердить. Нагадаємо про візит за добу й за годину.",
    confirmDeclined: "Запис скасовано, час знову вільний. Записатися на інший — кнопкою «🗓 Записатися».",
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
      "Оберіть, будь ласка, інший час кнопкою «🗓 Записатися» — або напишіть сюди, і лікар підкаже зручний.",
    remindDay:
      "🗓 Нагадування про візит\n\nВаш прийом{doctor} — {date}.\n\n" +
      "🩺 {service}{address}\n\nЯкщо плани змінилися — напишіть сюди, ми передамо лікарю.",
    remindHour:
      "⏰ Нагадування про візит\n\nЗа годину — ваш прийом{doctor}.\n\n" +
      "🩺 {service}\n🗓 {date}{address}\n\nЯкщо плани змінилися — напишіть сюди, ми передамо лікарю.",
    doctorOf: " у лікаря {name}",
    langChoose: "Оберіть мову / Choose a language:",
    langSet: "✅ Готово, спілкуємось українською.",

    // Меню пацієнта (кнопки внизу чату).
    menuBook: "🗓 Записатися",
    menuMy: "📋 Мої записи",
    menuReview: "⭐ Залишити відгук",

    // Запис через бота.
    bkChooseService: "🗓 Запис на прийом{doctor}\n\nОберіть послугу:",
    bkServiceBtn: "{service} · {price} грн",
    bkServiceNoSlots: "{service} — немає вільного часу",
    bkNoSlots:
      "На жаль, зараз вільних годин немає 😔\n\n" +
      "Напишіть сюди повідомлення — лікар підкаже, коли зможе вас прийняти.",
    bkChooseDay: "🩺 {service}\n\nОберіть день:",
    bkChooseTime: "🩺 {service}\n🗓 {day}\n\nОберіть час:",
    bkBack: "↩️ Назад",
    bkCancelBtn: "✖️ Скасувати",
    bkAskContact:
      "Щоб лікар міг з вами зв'язатися, поділіться, будь ласка, номером телефону — " +
      "натисніть кнопку «📱 Поділитися номером» внизу.",
    bkShareContact: "📱 Поділитися номером",
    bkContactNotOwn: "Будь ласка, надішліть саме свій номер — кнопкою «📱 Поділитися номером» внизу.",
    bkContactThanks: "Дякуємо, {name}! 👍",
    bkConfirmAsk:
      "Перевірте, будь ласка, запис{doctor}:\n\n👤 {name}\n📞 {phone}\n🩺 {service}\n🗓 {date}\n💰 {price} грн{address}\n\n" +
      "Записати вас?",
    bkConfirmYes: "✅ Записатися",
    bkOtherTime: "↩️ Інший час",
    bkTaken: "😔 Цей час щойно зайняли. Оберіть, будь ласка, інший:",
    bkGone: "Цей час уже недоступний. Почніть запис ще раз — кнопкою «🗓 Записатися».",
    bkAborted: "Добре, запис не оформлено. Повернутися до нього можна кнопкою «🗓 Записатися».",
    bkTooMany:
      "У вас уже є {count} активні записи — це максимум для запису через бота.\n" +
      "Якщо потрібно більше, напишіть сюди — лікар допоможе.",

    // Мої записи.
    myNone: "У вас немає майбутніх записів. Записатися — кнопкою «🗓 Записатися».",
    myHeader: "📋 Ваші майбутні записи:",
    myItem: "🩺 {service}\n🗓 {date} — {status}",
    myCancelBtn: "✖️ Скасувати {date}",
    myCancelAsk: "Скасувати запис?\n\n🩺 {service}\n🗓 {date}",
    myCancelYes: "Так, скасувати",
    myCancelNo: "Ні, залишити",
    myCanceled: "Запис скасовано, лікаря сповіщено.\n\n🩺 {service}\n🗓 {date}",
    myKept: "Добре, запис залишається 👍",
    st_pending_client: "чекає вашого підтвердження",
    st_pending: "чекає підтвердження лікаря",
    st_confirmed: "підтверджено ✅",

    // Питання від лікаря через тиждень після прийому.
    followUp:
      "Добрий день, {name}! 👋\n\n" +
      "Це {doctorName}. Минув тиждень після вашого прийому ({service}, {date}), " +
      "і мені важливо знати, як ви зараз.\n\n" +
      "Як ви почуваєтесь? Чи помітили зміни — стало легше, зменшився біль, " +
      "покращився рух? Чи, можливо, щось ще турбує?\n\n" +
      "Напишіть мені у відповідь прямо тут — я прочитаю особисто й відповім.",
    followUpDoctor: "лікар {name}",
    followUpReviewBtn: "⭐ Оцінити прийом",

    // Відгук через бота.
    rvNotEligible:
      "Відгук можна залишити після прийому 🙂\n" +
      "Щойно ви побуваєте у лікаря, кнопка «⭐ Залишити відгук» запрацює.",
    rvChooseService: "Про яку послугу ваш відгук?",
    rvChooseRating: "⭐ Відгук: {service}\n\nОцініть, будь ласка, прийом:",
    rvAskText:
      "Дякуємо за оцінку {stars}!\n\n" +
      "Тепер напишіть кілька слів про прийом — їх побачать інші пацієнти на сайті.",
    rvTextOnly: "Будь ласка, напишіть відгук текстом 🙂",
    rvTooLong: "Відгук задовгий — до {max} символів. Скоротіть, будь ласка, і надішліть ще раз.",
    rvThanks: "💛 Дякуємо за відгук! Він уже з'явився на сайті клініки.",
    rvCanceled: "Добре, відгук не надіслано.",
  },
  en: {
    startPatient:
      "Hello! This is the TANGIZ clinic bot 👋\n\n" +
      "Here you can:\n" +
      "🗓 book an appointment — the bot shows free hours;\n" +
      "📋 view or cancel your appointments;\n" +
      "⭐ leave a review after your visit;\n" +
      "✉️ write to the doctor — just send a message, he'll reply here.\n\n" +
      "We'll also remind you a day and an hour before the visit. Use the buttons below 👇",
    remindersOn:
      "✅ All set! We'll remind you a day and an hour before your visit, and message you " +
      "once the doctor confirms the appointment.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "If your plans change — just write here.",
    remindersOnCanceled:
      "This appointment was canceled, so there's nothing to remind about.\n" +
      "But we've saved your chat: we'll remind you about the next visit.",
    bookingNotFound: "We couldn't find this appointment. Write here — the doctor will help.",
    msgAck:
      "✉️ Your message has been passed to the doctor — he'll reply here shortly.\n" +
      "To book an appointment, tap «🗓 Book» below.",
    msgAckFollowUp: "🙏 Thank you! The doctor has received your reply and will write back here.",
    confirmAsk:
      "Almost done! Please confirm your appointment{doctor}:\n\n🩺 {service}\n🗓 {date}{address}\n\n" +
      "The slot is held for you until {until}. Once you confirm, it goes to the doctor " +
      "and we'll message you as soon as it's approved.",
    confirmYes: "✅ Confirm",
    confirmNo: "❌ Cancel",
    confirmSent:
      "✅ Thank you! Your appointment has been sent to the doctor.\n\n🩺 {service}\n🗓 {date}\n\n" +
      "We'll message you once the doctor confirms it, and remind you a day and an hour before.",
    confirmDeclined: "The appointment was canceled and the slot is free again. To book another time, tap «🗓 Book».",
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
      "Please pick another time with «🗓 Book» — or write here and the doctor will suggest one.",
    remindDay:
      "🗓 Appointment reminder\n\nYour appointment{doctor} is on {date}.\n\n" +
      "🩺 {service}{address}\n\nIf your plans changed — write here and we'll tell the doctor.",
    remindHour:
      "⏰ Appointment reminder\n\nYour appointment{doctor} starts in an hour.\n\n" +
      "🩺 {service}\n🗓 {date}{address}\n\nIf your plans changed — write here and we'll tell the doctor.",
    doctorOf: " with Dr. {name}",
    langChoose: "Оберіть мову / Choose a language:",
    langSet: "✅ Done, we'll speak English.",

    menuBook: "🗓 Book",
    menuMy: "📋 My appointments",
    menuReview: "⭐ Leave a review",

    bkChooseService: "🗓 Book an appointment{doctor}\n\nChoose a service:",
    bkServiceBtn: "{service} · {price} UAH",
    bkServiceNoSlots: "{service} — no free time",
    bkNoSlots:
      "Unfortunately, there are no free hours right now 😔\n\n" +
      "Send a message here — the doctor will tell you when he can see you.",
    bkChooseDay: "🩺 {service}\n\nChoose a day:",
    bkChooseTime: "🩺 {service}\n🗓 {day}\n\nChoose a time:",
    bkBack: "↩️ Back",
    bkCancelBtn: "✖️ Cancel",
    bkAskContact:
      "So the doctor can reach you, please share your phone number — " +
      "tap «📱 Share my number» below.",
    bkShareContact: "📱 Share my number",
    bkContactNotOwn: "Please send your own number — with the «📱 Share my number» button below.",
    bkContactThanks: "Thank you, {name}! 👍",
    bkConfirmAsk:
      "Please check your appointment{doctor}:\n\n👤 {name}\n📞 {phone}\n🩺 {service}\n🗓 {date}\n💰 {price} UAH{address}\n\n" +
      "Shall we book it?",
    bkConfirmYes: "✅ Book",
    bkOtherTime: "↩️ Another time",
    bkTaken: "😔 This time was just taken. Please choose another one:",
    bkGone: "This time is no longer available. Start again with «🗓 Book».",
    bkAborted: "OK, nothing was booked. You can come back to it with «🗓 Book».",
    bkTooMany:
      "You already have {count} active appointments — the maximum for booking via the bot.\n" +
      "If you need more, write here — the doctor will help.",

    myNone: "You have no upcoming appointments. To book, tap «🗓 Book».",
    myHeader: "📋 Your upcoming appointments:",
    myItem: "🩺 {service}\n🗓 {date} — {status}",
    myCancelBtn: "✖️ Cancel {date}",
    myCancelAsk: "Cancel this appointment?\n\n🩺 {service}\n🗓 {date}",
    myCancelYes: "Yes, cancel",
    myCancelNo: "No, keep it",
    myCanceled: "The appointment was canceled and the doctor notified.\n\n🩺 {service}\n🗓 {date}",
    myKept: "OK, the appointment stays 👍",
    st_pending_client: "waiting for your confirmation",
    st_pending: "waiting for the doctor's confirmation",
    st_confirmed: "confirmed ✅",

    followUp:
      "Hello, {name}! 👋\n\n" +
      "This is {doctorName}. It's been a week since your appointment ({service}, {date}), " +
      "and I'd like to know how you're doing.\n\n" +
      "How do you feel? Have you noticed any changes — less pain, easier movement? " +
      "Or is something still bothering you?\n\n" +
      "Just reply right here — I'll read it personally and get back to you.",
    followUpDoctor: "Dr. {name}",
    followUpReviewBtn: "⭐ Rate the visit",

    rvNotEligible:
      "You can leave a review after your appointment 🙂\n" +
      "Once you've visited the doctor, the «⭐ Leave a review» button will work.",
    rvChooseService: "Which service is your review about?",
    rvChooseRating: "⭐ Review: {service}\n\nPlease rate your visit:",
    rvAskText:
      "Thanks for the rating {stars}!\n\n" +
      "Now write a few words about the visit — other patients will see them on the website.",
    rvTextOnly: "Please write your review as text 🙂",
    rvTooLong: "The review is too long — up to {max} characters. Please shorten it and send again.",
    rvThanks: "💛 Thank you for your review! It's already on the clinic's website.",
    rvCanceled: "OK, the review wasn't sent.",
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
