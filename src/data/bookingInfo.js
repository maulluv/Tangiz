// Правила запису (двомовні) — для блоку на сторінці запису.
export const bookingRules = [
  { uk: "Прийом лише за попереднім записом.", en: "By appointment only." },
  { uk: "Екстрений запис — у приватні повідомлення боту.", en: "For urgent visits, message the bot directly." },
  { uk: "Запис обов'язково підтвердіть у нашому Telegram-боті — без цього він не дійде до лікаря.", en: "Be sure to confirm your booking in our Telegram bot — otherwise it won't reach the doctor." },
  { uk: "Скасування чи перенесення — за правилами скасування поряд.", en: "Cancellation or rescheduling follows the policy beside this." },
  { uk: "Терапевтичний прийом — не їжте за годину до візиту.", en: "For a therapy session, don't eat for an hour before the visit." },
  { uk: "На консультацію візьміть наявну медичну документацію.", en: "Bring any medical records to a consultation." },
  { uk: "У день візиту напишіть для уточнення деталей.", en: "On the day of the visit, message to confirm the details." },
];

// Політика скасування (двомовна).
export const cancellationPolicy = [
  { icon: "⏳", uk: "За 24 години і більше — безкоштовне скасування або перенесення запису.", en: "24 hours or more — free cancellation or rescheduling." },
  { icon: "⚖️", uk: "За 24–6 годин — перенесення можливе, якщо є вільний час.", en: "24–6 hours — rescheduling is possible if there's a free slot." },
  { icon: "🚫", uk: "За 6 годин і менше — повідомте обов'язково: це вікно вже не встигнути заповнити.", en: "6 hours or less — please let us know: the slot can't be filled in time." },
];
