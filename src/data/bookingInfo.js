// Правила запису (двомовні) — для блоку на сторінці запису.
export const bookingRules = [
  { uk: "Прийом лише за попереднім записом.", en: "By appointment only." },
  { uk: "Екстрений запис — у приватні повідомлення боту.", en: "For urgent visits, message the bot directly." },
  { uk: "Підтвердження обов'язкове після відповіді лікаря або адміністратора.", en: "Confirmation is required after the doctor or admin replies." },
  { uk: "Скасування чи перенесення — за правилами скасування поряд.", en: "Cancellation or rescheduling follows the policy beside this." },
  { uk: "Терапевтичний прийом — не їжте за годину до візиту.", en: "For a therapy session, don't eat for an hour before the visit." },
  { uk: "На консультацію візьміть наявну медичну документацію.", en: "Bring any medical records to a consultation." },
  { uk: "У день візиту напишіть для уточнення деталей.", en: "On the day of the visit, message to confirm the details." },
];

// Політика скасування (двомовна).
export const cancellationPolicy = [
  { icon: "⏳", uk: "За 24 години і більше — повне повернення коштів або перенесення запису.", en: "24 hours or more — full refund or reschedule." },
  { icon: "⚖️", uk: "За 24–12 годин — кошти повертаються залежно від обставин.", en: "24–12 hours — refund depends on the circumstances." },
  { icon: "🚫", uk: "За 6 годин і менше — передоплата не повертається: це вікно вже не встигнути заповнити.", en: "6 hours or less — prepayment is non-refundable: the slot can't be filled in time." },
];
