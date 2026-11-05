// Telegram-бот клініки: лікар керує записами, пацієнт отримує сповіщення.
// Вмикається ЛИШЕ якщо в .env є TELEGRAM_BOT_TOKEN — інакше сервер працює без бота.
//
// Лікарю:
//  • /bind <пароль> — прив'язати цей чат як отримувача записів;
//  • нові записи із сайту (вже підтверджені пацієнтом) з кнопками ✅ Підтвердити / ❌ Скасувати;
//  • скасування пацієнтом із кабінету — окремим повідомленням;
//  • /add — додати вільні години на послугу; /slots — переглянути й видалити;
//  • повідомлення пацієнтів + відповідь реплаєм (TelegramRelay) — так само відповідає
//    на відповіді пацієнтів на питання «як ви після прийому?» і на відгуки;
//  • кожен новий відгук (із сайту чи з бота) з кнопкою «прибрати з сайту».
//
// Пацієнту (відкриває бота за посиланням із сайту /start r_<id запису> — це обов'язковий крок):
//  • підтвердження власного запису ✅/❌ — лише після цього запис іде лікарю (див. holds.js);
//  • рішення лікаря — «ви успішно записані» / «скасовано»;
//  • нагадування за добу й за годину до візиту;
//  • запис просто в боті (/book, кнопка «🗓 Записатися»): послуга → день → час → номер
//    телефону (кнопкою «поділитися», один раз) → підтвердження; запис одразу йде лікарю;
//  • «📋 Мої записи» — майбутні записи з можливістю скасувати;
//  • через FOLLOWUP_DAYS днів після прийому — питання від імені лікаря «як ви зараз?»;
//    відповідь іде лікарю, він відповідає реплаєм — виходить діалог;
//  • відгук (/review, кнопка «⭐ Залишити відгук») — одразу з'являється на сайті;
//  • усе — його мовою (User.lang із сайту; перемкнути — /lang).
//
// Час скрізь у поясі клініки (CLINIC_TZ, див. time.js), керування слотами — через
// спільну з сайтом логіку (slotsLib), тож дані завжди синхронні.
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { listFutureSlots, createSlots, deleteFreeSlot, cancelBooking, bookSlot } from "./slotsLib.js";
import { formatDateTime, formatLongDateTime, formatTime, formatDayShort, dayKey, clinicHour } from "./time.js";
import { tt, serviceLabel, SERVICE_SHORT, normalizeLang, doctorNameIn, LANGS } from "./botText.js";
import { attendedServiceIds, createReview, REVIEW_MAX_LEN } from "./reviewsLib.js";
import { normalizePhone, normalizeTg } from "./utils.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const botEnabled = !!TOKEN;

// Лікар бачить усе українською — його тексти лишаються в цьому файлі.
const ownerService = (id) => serviceLabel(id, "uk");
const formatDate = (d) => formatDateTime(d, "uk");

// Нагадування пацієнту: два рівні, від дальнього до ближнього.
//  beforeMin  — за скільки хвилин до візиту нагадуємо;
//  minLeadMin — якщо до візиту лишилось менше, цей рівень уже не має сенсу
//               (запис за 3 години до прийому не отримає нагадування «за добу»);
//  minAgeMin  — не нагадуємо одразу після запису: людина щойно обрала цей час сама.
const REMIND_TIERS = [
  { field: "remindedDayAt", key: "remindDay", beforeMin: 24 * 60, minLeadMin: 6 * 60, minAgeMin: 60, long: true },
  { field: "reminderSentAt", key: "remindHour", beforeMin: 60, minLeadMin: 5, minAgeMin: 15, long: false },
];
const REMIND_CHECK_MS = 60_000; // як часто перевіряємо, кому пора нагадати

const DAY_MS = 24 * 60 * 60_000;
// Питання від лікаря «як ви після прийому?» — через стільки днів після візиту (типово тиждень).
const FOLLOWUP_DAYS = (() => {
  const v = Number(process.env.FOLLOWUP_DAYS);
  return Number.isFinite(v) && v > 0 ? v : 7;
})();
// Вікно, у якому ще шлемо питання: прийоми, давніші за FOLLOWUP_DAYS + стільки днів, пропускаємо —
// щоб після деплою не засипати питаннями всіх, хто був у лікаря місяці тому.
const FOLLOWUP_WINDOW_DAYS = 3;
// Пишемо пацієнтам лише вдень за часом клініки: [з, до).
const FOLLOWUP_HOURS = [10, 20];
// Скільки днів після питання повідомлення пацієнта показуємо лікарю як «відповідь на питання».
const FOLLOWUP_CONTEXT_DAYS = 3;
// Скільки активних майбутніх записів можна мати, записуючись через бота (захист від спаму).
const MAX_BOT_BOOKINGS = 3;
// Незавершений крок (чекаємо номер телефону чи текст відгуку) забуваємо через стільки часу —
// щоб звичайне повідомлення лікарю годину потому не стало відгуком.
const FLOW_TTL_MS = 30 * 60_000;
// Повну відповідь «повідомлення передано лікарю» шлемо раз на пів години, далі — лише 👍.
const ACK_QUIET_MS = 30 * 60_000;
const ACTIVE_STATUSES = ["pending_client", "pending", "confirmed"];

let bot = null;
let reminderTimer = null;
// Хто з власників зараз додає слоти й для якої послуги: chatId → serviceId.
const pendingAdd = new Map();
// Мова чатів, яких ще немає в БД (людина написала боту, не записавшись): chatId → "uk"|"en".
// Живе до перезапуску — цього досить, бо після запису мова осідає в User.lang.
const guestLang = new Map();
// Пацієнт посеред запису обрав час і має поділитися номером: chatId → { slotId, at }.
const pendingBook = new Map();
// Пацієнт поставив оцінку й зараз пише текст відгуку: chatId → { serviceId, rating, at }.
const pendingReview = new Map();
// Коли пацієнт востаннє отримав «повідомлення передано лікарю»: chatId → ms.
const lastAck = new Map();

// Крок, що не застарів (інакше — забуваємо його).
function freshFlow(map, chatId) {
  const v = map.get(chatId);
  if (v && Date.now() - v.at > FLOW_TTL_MS) {
    map.delete(chatId);
    return null;
  }
  return v ?? null;
}
const clearFlows = (chatId) => {
  pendingBook.delete(String(chatId));
  pendingReview.delete(String(chatId));
};

// Той самий текст обома мовами — для кнопок меню (людина могла перемкнути мову).
const both = (key) => LANGS.map((l) => tt(l, key));

// Меню пацієнта — кнопки внизу чату. Заодно замінює «приклеєну» клавіатуру попереднього бота.
const mainMenu = (lang) =>
  new Keyboard().text(tt(lang, "menuBook")).text(tt(lang, "menuMy")).row().text(tt(lang, "menuReview")).resized();

// Клавіатура «поділитися номером» (крок запису для нового пацієнта).
const contactKeyboard = (lang) =>
  new Keyboard().requestContact(tt(lang, "bkShareContact")).row().text(tt(lang, "bkCancelBtn")).resized().oneTime();

// Номер для профілю у звичному для сайту вигляді: +380 67 123 45 67.
function displayPhone(key) {
  const m = key.match(/^380(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+380 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${key}`;
}

// Кнопки сіткою по `cols` у ряд (без порожніх рядів — Telegram їх не любить).
function gridKeyboard(buttons, cols) {
  const kb = new InlineKeyboard();
  buttons.forEach(([text, data], i) => {
    if (i > 0 && i % cols === 0) kb.row();
    kb.text(text, data);
  });
  return kb;
}

// Назва послуги: власна назва з БД (якщо лікар додав свою) або стандартна з перекладів.
const svcName = (svc, lang) => (lang === "en" ? svc.nameEn : svc.nameUk) || serviceLabel(svc.id, lang);

// Редагуємо повідомлення з кнопками на місці; якщо не вийшло — надсилаємо нове.
async function editOrReply(ctx, text, extra = {}) {
  if (ctx.callbackQuery?.message) {
    try {
      return await ctx.editMessageText(text, extra);
    } catch (e) {
      if (String(e.description || "").includes("not modified")) return;
    }
  }
  return ctx.reply(text, extra);
}

const getOwner = () => prisma.user.findFirst({ where: { role: "owner" } });
const isOwnerChat = (owner, chatId) =>
  owner?.telegramChatId && String(chatId) === owner.telegramChatId;

// Клієнт, який колись відкрив бота з цього чату (у нього збережено telegramChatId).
const clientByChat = (chatId) =>
  prisma.user.findFirst({ where: { role: "client", telegramChatId: String(chatId) } });

// Мова, якою говоримо з цим чатом.
async function chatLang(chatId) {
  const user = await clientByChat(chatId);
  if (user) return normalizeLang(user.lang);
  return guestLang.get(String(chatId)) ?? "uk";
}

// Хвостики для текстів пацієнта: «у лікаря Дадвані» та рядок з адресою.
async function clinicBits(lang) {
  const clinic = await prisma.clinicProfile.findUnique({ where: { id: 1 } });
  return {
    doctor: clinic?.doctorName ? tt(lang, "doctorOf", { name: doctorNameIn(clinic.doctorName, lang) }) : "",
    address: clinic?.address ? `\n📍 ${clinic.address}` : "",
  };
}

// Розбирає рядок "ДД.ММ ГГ:ХХ" (рік необов'язковий) у Date. Час трактуємо як київський:
// process.env.TZ виставлено в time.js, тож локальний час процесу = час клініки.
function parseSlotLine(line) {
  const m = line.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const dd = +m[1];
  const mm = +m[2];
  const yyyy = m[3] ? +m[3] : null;
  const hh = +m[4];
  const min = +m[5];
  const year = yyyy ?? new Date().getFullYear();
  let d = new Date(year, mm - 1, dd, hh, min, 0, 0);
  // Без явного року й дата вже минула → беремо наступний рік.
  if (!yyyy && d.getTime() < Date.now()) d = new Date(year + 1, mm - 1, dd, hh, min, 0, 0);
  // 31.02 чи 25:00 JS тихо переносить на інший день — такі рядки вважаємо помилкою.
  if (Number.isNaN(d.getTime()) || d.getDate() !== dd || d.getMonth() !== mm - 1 || hh > 23 || min > 59) {
    return null;
  }
  return d;
}

// Список вільних слотів із кнопками видалення (для /slots).
async function buildSlotsView() {
  const slots = await listFutureSlots();
  const free = slots.filter((s) => !s.booked);
  if (free.length === 0) {
    return { text: "Вільних слотів немає. Додати — командою /add.", keyboard: undefined };
  }
  const kb = new InlineKeyboard();
  for (const s of free.slice(0, 60)) {
    kb.text(`🗑 ${formatDate(s.startsAt)} · ${SERVICE_SHORT[s.serviceId] || s.serviceId}`, `delslot:${s.id}`).row();
  }
  return { text: "Вільні слоти (натисніть 🗑, щоб видалити):", keyboard: kb };
}

// Пацієнт відкрив бота за посиланням із сайту (/start r_<id запису>).
// Запам'ятовуємо його chatId у профілі — далі зможемо писати першими. Якщо запис ще
// чекає його підтвердження — одразу показуємо кнопки ✅/❌.
async function linkClientChat(ctx, bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking) {
    const lang = await chatLang(ctx.chat.id);
    return ctx.reply(tt(lang, "bookingNotFound"));
  }

  const lang = normalizeLang(booking.user?.lang);
  await prisma.user.update({
    where: { id: booking.userId },
    data: { telegramChatId: String(ctx.chat.id) },
  });

  if (booking.status === "pending_client") {
    return sendConfirmRequest(ctx.chat.id, booking);
  }

  if (booking.status === "canceled") {
    return ctx.reply(tt(lang, "remindersOnCanceled"), { reply_markup: mainMenu(lang) });
  }

  return ctx.reply(
    tt(lang, "remindersOn", {
      service: serviceLabel(booking.serviceId, lang),
      date: formatDateTime(booking.date, lang),
    }),
    { reply_markup: mainMenu(lang) },
  );
}

// Повідомлення пацієнту «підтвердіть запис» з кнопками. booking — з include: { user }.
async function sendConfirmRequest(chatId, booking) {
  const lang = normalizeLang(booking.user?.lang);
  const { doctor, address } = await clinicBits(lang);
  const kb = new InlineKeyboard()
    .text(tt(lang, "confirmYes"), `cok:${booking.id}`)
    .text(tt(lang, "confirmNo"), `cno:${booking.id}`);
  const text = tt(lang, "confirmAsk", {
    doctor,
    address,
    service: serviceLabel(booking.serviceId, lang),
    date: formatLongDateTime(booking.date, lang),
    until: booking.holdUntil ? formatTime(booking.holdUntil, lang) : "",
  });
  return bot.api.sendMessage(chatId, text, { reply_markup: kb });
}

// ─────────────────────────────────────────────────────────────
// ЗАПИС ЧЕРЕЗ БОТА: послуга → день → час → (номер телефону) → підтвердження.
// Стан кроку переважно живе в callback-даних кнопок, тож перезапуск сервера посеред
// вибору нічого не ламає. Слоти й правила — ті самі, що на сайті (slotsLib).
// ─────────────────────────────────────────────────────────────

const freeSlotsOf = (serviceId) =>
  prisma.slot.findMany({
    where: { serviceId, booked: false, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

const activeCount = (userId) =>
  prisma.booking.count({ where: { userId, status: { in: ACTIVE_STATUSES }, date: { gt: new Date() } } });

// Крок 1: послуги, на які є вільний час.
async function showServices(ctx, lang) {
  const [services, counts] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    prisma.slot.groupBy({ by: ["serviceId"], where: { booked: false, startsAt: { gt: new Date() } }, _count: true }),
  ]);
  const free = new Map(counts.map((c) => [c.serviceId, c._count]));
  const available = services.filter((svc) => free.get(svc.id) > 0);
  if (available.length === 0) return editOrReply(ctx, tt(lang, "bkNoSlots"));

  const kb = new InlineKeyboard();
  for (const svc of available) {
    kb.text(tt(lang, "bkServiceBtn", { service: svcName(svc, lang), price: svc.price }), `bks:${svc.id}`).row();
  }
  kb.text(tt(lang, "bkCancelBtn"), "bkx");
  const { doctor } = await clinicBits(lang);
  return editOrReply(ctx, tt(lang, "bkChooseService", { doctor }), { reply_markup: kb });
}

// Крок 2: дні з вільним часом (до двох тижнів уперед — у кнопках).
async function showDays(ctx, lang, serviceId, lead = "") {
  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  const slots = svc?.active ? await freeSlotsOf(serviceId) : [];
  if (slots.length === 0) return showServices(ctx, lang);

  const days = new Map(); // dayKey → перший слот дня (для підпису)
  for (const sl of slots) if (!days.has(dayKey(sl.startsAt))) days.set(dayKey(sl.startsAt), sl.startsAt);

  const kb = gridKeyboard(
    [...days.entries()].slice(0, 14).map(([key, d]) => [formatDayShort(d, lang), `bkd:${serviceId}:${key}`]),
    2,
  );
  kb.row().text(tt(lang, "bkBack"), "bk").text(tt(lang, "bkCancelBtn"), "bkx");
  const text = (lead ? `${lead}\n\n` : "") + tt(lang, "bkChooseDay", { service: svcName(svc, lang) });
  return editOrReply(ctx, text, { reply_markup: kb });
}

// Крок 3: вільні години обраного дня.
async function showTimes(ctx, lang, serviceId, key) {
  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  const slots = svc?.active ? (await freeSlotsOf(serviceId)).filter((sl) => dayKey(sl.startsAt) === key) : [];
  if (slots.length === 0) return showDays(ctx, lang, serviceId, tt(lang, "bkTaken"));

  const kb = gridKeyboard(
    slots.slice(0, 30).map((sl) => [formatTime(sl.startsAt, lang), `bkt:${sl.id}`]),
    3,
  );
  kb.row().text(tt(lang, "bkBack"), `bks:${serviceId}`).text(tt(lang, "bkCancelBtn"), "bkx");
  return editOrReply(
    ctx,
    tt(lang, "bkChooseTime", { service: svcName(svc, lang), day: formatDayShort(slots[0].startsAt, lang) }),
    { reply_markup: kb },
  );
}

// Слот ще можна зайняти?
async function freeSlot(slotId) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { service: true } });
  if (!slot || slot.booked || slot.startsAt.getTime() <= Date.now() || !slot.service?.active) return null;
  return slot;
}

// Крок 4: підсумок «перевірте й підтвердіть».
async function showBookConfirm(ctx, lang, slot, user) {
  const { doctor, address } = await clinicBits(lang);
  const kb = new InlineKeyboard()
    .text(tt(lang, "bkConfirmYes"), `bky:${slot.id}`)
    .row()
    .text(tt(lang, "bkOtherTime"), `bks:${slot.serviceId}`)
    .text(tt(lang, "bkCancelBtn"), "bkx");
  const text = tt(lang, "bkConfirmAsk", {
    doctor,
    address,
    name: user.name,
    phone: user.phone || "—",
    service: svcName(slot.service, lang),
    date: formatLongDateTime(slot.startsAt, lang),
    price: slot.service.price,
  });
  return editOrReply(ctx, text, { reply_markup: kb });
}

// Профіль пацієнта з контакту, яким він поділився. Ключ — телефон, як і на сайті:
// людина, що вже записувалась на сайті, потрапить у свій же профіль з історією.
async function clientFromContact(ctx, contact, lang) {
  const id = normalizePhone(contact.phone_number);
  const chatId = String(ctx.chat.id);
  const tg = ctx.from?.username ? normalizeTg(ctx.from.username) : null;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) {
    // Ім'я й пароль зареєстрованого профілю не чіпаємо — лише прив'язуємо чат.
    return prisma.user.update({
      where: { id },
      data: { telegramChatId: chatId, telegram: existing.telegram || tg, phone: existing.phone || displayPhone(id) },
    });
  }
  const name =
    `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || ctx.from?.first_name || "Пацієнт";
  return prisma.user.create({
    data: { id, role: "client", name, phone: displayPhone(id), telegram: tg, lang, telegramChatId: chatId },
  });
}

// ─────────────────────────────────────────────────────────────
// МОЇ ЗАПИСИ
// ─────────────────────────────────────────────────────────────
async function showMyBookings(ctx, lang) {
  const user = await clientByChat(ctx.chat.id);
  const list = user
    ? await prisma.booking.findMany({
        where: { userId: user.id, status: { in: ACTIVE_STATUSES }, date: { gt: new Date() } },
        orderBy: { date: "asc" },
      })
    : [];
  if (list.length === 0) return editOrReply(ctx, tt(lang, "myNone"));

  const items = list.map((b) =>
    tt(lang, "myItem", {
      service: serviceLabel(b.serviceId, lang),
      date: formatDateTime(b.date, lang),
      status: tt(lang, `st_${b.status}`),
    }),
  );
  const kb = gridKeyboard(
    list.map((b) => [tt(lang, "myCancelBtn", { date: formatDateTime(b.date, lang) }), `myc:${b.id}`]),
    1,
  );
  return editOrReply(ctx, `${tt(lang, "myHeader")}\n\n${items.join("\n\n")}`, { reply_markup: kb });
}

// ─────────────────────────────────────────────────────────────
// ВІДГУК ЧЕРЕЗ БОТА: (послуга) → зірки → текст. Публікується на сайті одразу, як і з сайту.
// ─────────────────────────────────────────────────────────────
async function startReview(ctx, lang, bookingId = null) {
  const chatId = String(ctx.chat.id);
  clearFlows(chatId);
  const user = await clientByChat(chatId);
  const attended = user ? await attendedServiceIds(user.id) : [];
  if (attended.length === 0) return ctx.reply(tt(lang, "rvNotEligible"));

  let serviceId = null;
  if (bookingId) {
    const bk = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (bk && bk.userId === user.id && attended.includes(bk.serviceId)) serviceId = bk.serviceId;
  }
  if (!serviceId && attended.length === 1) serviceId = attended[0];
  if (serviceId) return ctx.reply(...ratingPrompt(lang, serviceId));

  const kb = new InlineKeyboard();
  for (const id of attended) kb.text(serviceLabel(id, lang), `rvs:${id}`).row();
  kb.text(tt(lang, "bkCancelBtn"), "rvx");
  return ctx.reply(tt(lang, "rvChooseService"), { reply_markup: kb });
}

// [текст, extra] — прохання оцінити прийом зірками (від 5 до 1, згори вниз).
function ratingPrompt(lang, serviceId) {
  const kb = new InlineKeyboard();
  for (let n = 5; n >= 1; n--) kb.text("⭐".repeat(n), `rvr:${serviceId}:${n}`).row();
  kb.text(tt(lang, "bkCancelBtn"), "rvx");
  return [tt(lang, "rvChooseRating", { service: serviceLabel(serviceId, lang) }), { reply_markup: kb }];
}

// Лікаря в чаті пацієнта не обслуговуємо як пацієнта — підказуємо його інструменти.
const OWNER_PATIENT_MENU_NOTE =
  "Це меню пацієнта. Нові записи приходять вам сюди, вільні години — /slots, додати — /add.";

function buildBot() {
  const b = new Bot(TOKEN);

  // /start відповідає по-різному трьом аудиторіям, щоб пацієнт не бачив службових команд:
  //  • лікар (прив'язаний чат) — його інструменти;
  //  • ніхто ще не прив'язаний — підказка про /bind (лише на час налаштування бота);
  //  • усі інші — текст для пацієнта, без згадок про пароль і команди.
  b.command("start", async (ctx) => {
    const owner = await getOwner();

    // Посилання з сайту: t.me/<бот>?start=r_<id запису> — підтвердження запису й нагадування.
    const payload = (ctx.match || "").trim();
    if (payload.startsWith("r_")) {
      return linkClientChat(ctx, payload.slice(2));
    }

    if (isOwnerChat(owner, ctx.chat.id)) {
      return ctx.reply(
        "Вітаю! Сюди приходять нові записи (із сайту й через бота), відгуки пацієнтів " +
          "і їхні повідомлення. Щоб відповісти пацієнту — відповідайте реплаєм на його повідомлення.\n\n" +
          "/add — додати вільні години\n" +
          "/slots — переглянути й видалити вільні години",
      );
    }

    if (!owner?.telegramChatId) {
      return ctx.reply(
        "Вітаю! Це службовий бот клініки TANGIZ.\n\n" +
          "Бот ще не налаштований. Якщо ви лікар — надішліть «/bind ваш_пароль», " +
          "щоб отримувати сюди нові записи з сайту.",
      );
    }

    // Меню пацієнта заодно замінює «приклеєну» клавіатуру попереднього бота з цим токеном.
    clearFlows(ctx.chat.id);
    const lang = await chatLang(ctx.chat.id);
    return ctx.reply(tt(lang, "startPatient"), { reply_markup: mainMenu(lang) });
  });

  // Пацієнт може перемкнути мову бота: /lang → кнопки.
  b.command("lang", async (ctx) => {
    const owner = await getOwner();
    // Лікарю мову не міняємо, але й не мовчимо — інакше здається, що бот завис.
    if (isOwnerChat(owner, ctx.chat.id)) {
      return ctx.reply("Повідомлення для лікаря завжди українською. /lang — для пацієнтів: вони так обирають мову бота.");
    }
    const kb = new InlineKeyboard().text("🇺🇦 Українська", "lang:uk").text("🇬🇧 English", "lang:en");
    await ctx.reply(tt(await chatLang(ctx.chat.id), "langChoose"), { reply_markup: kb });
  });

  b.callbackQuery(/^lang:(uk|en)$/, async (ctx) => {
    const lang = normalizeLang(ctx.match[1]);
    const chatId = String(ctx.chat?.id);
    // Мова осідає в профілі; якщо профілю ще немає — тримаємо в пам'яті до запису.
    const { count } = await prisma.user.updateMany({
      where: { role: "client", telegramChatId: chatId },
      data: { lang },
    });
    if (!count) guestLang.set(chatId, lang);

    await ctx.answerCallbackQuery();
    // Кнопки меню теж мають «заговорити» новою мовою — тож шлемо відповідь із новим меню,
    // а повідомлення з вибором мови прибираємо.
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(tt(lang, "langSet"), { reply_markup: mainMenu(lang) });
  });

  // Прив'язка власника: /bind <пароль>.
  b.command("bind", async (ctx) => {
    const password = (ctx.match || "").trim();
    if (!password) return ctx.reply("Використання: /bind ваш_пароль");

    const owner = await getOwner();
    if (!owner?.passwordHash || !bcrypt.compareSync(password, owner.passwordHash)) {
      return ctx.reply("❌ Невірний пароль.");
    }
    await prisma.user.update({
      where: { id: owner.id },
      data: { telegramChatId: String(ctx.chat.id) },
    });
    return ctx.reply("✅ Готово! Тепер нові записи з сайту приходитимуть сюди.\nДодати вільні години — /add.");
  });

  // Додати вільні години: /add → вибір послуги → надіслати дату/час.
  b.command("add", async (ctx) => {
    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat.id)) return ctx.reply("Ця команда лише для лікаря.");
    const kb = new InlineKeyboard();
    for (const id of ["s1", "s2", "s3"]) kb.text(ownerService(id), `addsvc:${id}`).row();
    await ctx.reply("Оберіть послугу, для якої додати вільний час:", { reply_markup: kb });
  });

  // Переглянути/видалити вільні слоти.
  b.command("slots", async (ctx) => {
    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat.id)) return ctx.reply("Ця команда лише для лікаря.");
    const view = await buildSlotsView();
    await ctx.reply(view.text, { reply_markup: view.keyboard });
  });

  // Вибір послуги для додавання слотів.
  b.callbackQuery(/^addsvc:(.+)$/, async (ctx) => {
    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat?.id)) return ctx.answerCallbackQuery({ text: "Немає доступу." });
    const serviceId = ctx.match[1];
    pendingAdd.set(String(ctx.chat.id), serviceId);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `Послуга: ${ownerService(serviceId)}.\n` +
        "Надішліть дату й час у форматі ДД.ММ ГГ:ХХ.\n" +
        "Можна кілька рядків одразу, напр.:\n25.08 10:00\n25.08 11:30",
    );
  });

  // Видалення слота з /slots.
  b.callbackQuery(/^delslot:(.+)$/, async (ctx) => {
    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat?.id)) return ctx.answerCallbackQuery({ text: "Немає доступу." });
    const res = await deleteFreeSlot(ctx.match[1]);
    await ctx.answerCallbackQuery({
      text: res.ok ? "Видалено ❌" : res.reason === "booked" ? "Слот зайнятий" : "Не знайдено",
    });
    const view = await buildSlotsView();
    try {
      await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
    } catch {
      /* нічого не змінилось — ігноруємо */
    }
  });

  // Пацієнт підтверджує (cok) або скасовує (cno) свій запис. Лише після ✅ запис іде лікарю.
  b.callbackQuery(/^(cok|cno):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const booking = await prisma.booking.findUnique({
      where: { id: ctx.match[2] },
      include: { user: true },
    });
    // Натиснути може лише той чат, що прив'язаний до власника запису.
    if (!booking || booking.user?.telegramChatId !== String(ctx.chat?.id)) {
      return ctx.answerCallbackQuery({ text: tt(await chatLang(ctx.chat?.id), "bookingNotFound") });
    }
    const lang = normalizeLang(booking.user.lang);
    const vars = {
      service: serviceLabel(booking.serviceId, lang),
      date: formatDateTime(booking.date, lang),
    };
    const finish = async (key) => {
      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText(tt(lang, key, vars), { reply_markup: undefined });
      } catch {
        await ctx.reply(tt(lang, key, vars));
      }
    };

    // Кнопки лишаються під старим повідомленням — реагуємо за поточним станом запису.
    if (booking.status === "canceled") return finish("confirmTooLate");
    if (booking.status !== "pending_client") return finish("confirmAlready");
    // Час на підтвердження вийшов, а прибиральник ще не встиг (він ходить щохвилини).
    if (action === "cok" && booking.holdUntil && booking.holdUntil < new Date()) {
      await cancelBooking(booking.id);
      return finish("confirmTooLate");
    }

    if (action === "cno") {
      await cancelBooking(booking.id); // лікар про цей запис ще не знав — йому не пишемо
      return finish("confirmDeclined");
    }

    // updateMany з умовою на статус — щоб подвійне натискання не надіслало лікарю дубль.
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, status: "pending_client" },
      data: { status: "pending", holdUntil: null },
    });
    if (!count) return finish("confirmAlready");

    await finish("confirmSent");
    const fresh = await prisma.booking.findUnique({ where: { id: booking.id } });
    await notifyOwnerNewBooking(fresh).catch((e) =>
      console.error("Не вдалося сповістити власника:", e.description || e.message),
    );
  });

  // Кнопки під повідомленням про запис (підтвердити/скасувати).
  b.callbackQuery(/^(confirm|cancel):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const bookingId = ctx.match[2];

    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat?.id)) return ctx.answerCallbackQuery({ text: "Немає доступу." });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return ctx.answerCallbackQuery({ text: "Запис не знайдено." });

    const status = action === "confirm" ? "confirmed" : "canceled";
    // Кнопки лишаються під старими повідомленнями — не повторюємо дію (і лист пацієнту).
    if (booking.status === status) {
      return ctx.answerCallbackQuery({
        text: status === "confirmed" ? "Уже підтверджено." : "Уже скасовано.",
      });
    }
    // Пацієнт скасував запис сам (кабінет) або прийом уже завершено — слот міг зайняти
    // хтось інший, тож «воскрешати» запис кнопкою зі старого повідомлення не можна.
    if (booking.status === "canceled" || booking.status === "completed") {
      return ctx.answerCallbackQuery({
        text: booking.status === "canceled" ? "Запис уже скасовано." : "Прийом уже завершено.",
        show_alert: true,
      });
    }

    if (status === "canceled") {
      await cancelBooking(bookingId); // звільняє слот і відв'язує його від запису
    } else {
      await prisma.booking.update({ where: { id: bookingId }, data: { status } });
    }

    // Пацієнт має дізнатися про рішення — інакше кнопка міняє лише статус у БД.
    const delivery = await notifyClientBookingStatus(bookingId, status);

    await ctx.answerCallbackQuery({ text: status === "confirmed" ? "Підтверджено ✅" : "Скасовано ❌" });
    const mark = status === "confirmed" ? "✅ ПІДТВЕРДЖЕНО" : "❌ СКАСОВАНО";
    const note = deliveryNote(delivery);
    const base = ctx.callbackQuery.message?.text ?? "Запис";
    try {
      await ctx.editMessageText(`${base}\n\n${mark}\n${note}`, { reply_markup: undefined });
    } catch {
      /* повідомлення могло змінитись — ігноруємо */
    }
  });

  // ── Пацієнт: запис, мої записи, відгук (команди й кнопки меню обома мовами) ──
  const patientEntry = (fn) => async (ctx) => {
    const owner = await getOwner();
    if (isOwnerChat(owner, ctx.chat.id)) return ctx.reply(OWNER_PATIENT_MENU_NOTE);
    clearFlows(ctx.chat.id);
    return fn(ctx, await chatLang(ctx.chat.id));
  };
  const bookEntry = patientEntry((ctx, lang) => showServices(ctx, lang));
  const myEntry = patientEntry((ctx, lang) => showMyBookings(ctx, lang));
  const reviewEntry = patientEntry((ctx, lang) => startReview(ctx, lang));
  b.command("book", bookEntry);
  b.hears(both("menuBook"), bookEntry);
  b.command("my", myEntry);
  b.hears(both("menuMy"), myEntry);
  b.command("review", reviewEntry);
  b.hears(both("menuReview"), reviewEntry);

  // «✖️ Скасувати» з клавіатури «поділитися номером».
  b.hears(both("bkCancelBtn"), async (ctx) => {
    clearFlows(ctx.chat.id);
    const lang = await chatLang(ctx.chat.id);
    return ctx.reply(tt(lang, "bkAborted"), { reply_markup: mainMenu(lang) });
  });

  // Кроки запису (кнопки під повідомленням). Відповідаємо на callback одразу —
  // щоб у людини не крутився «годинник», поки ходимо в БД.
  const patientCb = (fn) => async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    return fn(ctx, await chatLang(ctx.chat.id));
  };
  b.callbackQuery("bk", patientCb((ctx, lang) => showServices(ctx, lang)));
  b.callbackQuery(/^bks:(.+)$/, patientCb((ctx, lang) => showDays(ctx, lang, ctx.match[1])));
  b.callbackQuery(/^bkd:([^:]+):(\d{8})$/, patientCb((ctx, lang) => showTimes(ctx, lang, ctx.match[1], ctx.match[2])));
  b.callbackQuery(
    "bkx",
    patientCb((ctx, lang) => {
      clearFlows(ctx.chat.id);
      return editOrReply(ctx, tt(lang, "bkAborted"));
    }),
  );

  // Обрано час. Знайомий пацієнт — одразу підсумок; новий — спершу номер телефону.
  b.callbackQuery(
    /^bkt:(.+)$/,
    patientCb(async (ctx, lang) => {
      const slot = await freeSlot(ctx.match[1]);
      if (!slot) return editOrReply(ctx, tt(lang, "bkGone"));
      const user = await clientByChat(ctx.chat.id);
      if (user) {
        const count = await activeCount(user.id);
        if (count >= MAX_BOT_BOOKINGS) return editOrReply(ctx, tt(lang, "bkTooMany", { count }));
        return showBookConfirm(ctx, lang, slot, user);
      }
      pendingBook.set(String(ctx.chat.id), { slotId: slot.id, at: Date.now() });
      await editOrReply(
        ctx,
        tt(lang, "bkChooseTime", {
          service: svcName(slot.service, lang),
          day: formatDayShort(slot.startsAt, lang),
        }).replace(/\n\n[^\n]*$/, `\n⏰ ${formatTime(slot.startsAt, lang)}`),
      );
      return ctx.reply(tt(lang, "bkAskContact"), { reply_markup: contactKeyboard(lang) });
    }),
  );

  // Остаточне «✅ Записатися». Запис одразу «pending»: пацієнт щойно підтвердив його сам,
  // тож, на відміну від сайту, окреме підтвердження не потрібне — він іде лікарю.
  b.callbackQuery(
    /^bky:(.+)$/,
    patientCb(async (ctx, lang) => {
      const user = await clientByChat(ctx.chat.id);
      if (!user) return editOrReply(ctx, tt(lang, "bkGone"));
      const count = await activeCount(user.id);
      if (count >= MAX_BOT_BOOKINGS) return editOrReply(ctx, tt(lang, "bkTooMany", { count }));

      const booking = await bookSlot(ctx.match[1], {
        userId: user.id,
        clientName: user.name,
        status: "pending",
        source: "telegram",
      });
      if (!booking) {
        const slot = await prisma.slot.findUnique({ where: { id: ctx.match[1] } });
        if (!slot) return editOrReply(ctx, tt(lang, "bkGone"));
        return showDays(ctx, lang, slot.serviceId, tt(lang, "bkTaken"));
      }
      await editOrReply(
        ctx,
        tt(lang, "confirmSent", {
          service: serviceLabel(booking.serviceId, lang),
          date: formatDateTime(booking.date, lang),
        }),
      );
      await notifyOwnerNewBooking(booking).catch((e) =>
        console.error("Не вдалося сповістити власника:", e.description || e.message),
      );
    }),
  );

  // Мої записи → скасування (із перепитуванням).
  const ownBooking = async (ctx, id) => {
    const booking = await prisma.booking.findUnique({ where: { id }, include: { user: true } });
    return booking && booking.user?.telegramChatId === String(ctx.chat?.id) ? booking : null;
  };
  b.callbackQuery(
    /^myc:(.+)$/,
    patientCb(async (ctx, lang) => {
      const booking = await ownBooking(ctx, ctx.match[1]);
      if (!booking || !ACTIVE_STATUSES.includes(booking.status)) return showMyBookings(ctx, lang);
      const kb = new InlineKeyboard()
        .text(tt(lang, "myCancelYes"), `mcy:${booking.id}`)
        .text(tt(lang, "myCancelNo"), "mcn");
      const vars = { service: serviceLabel(booking.serviceId, lang), date: formatDateTime(booking.date, lang) };
      return editOrReply(ctx, tt(lang, "myCancelAsk", vars), { reply_markup: kb });
    }),
  );
  b.callbackQuery("mcn", patientCb((ctx, lang) => editOrReply(ctx, tt(lang, "myKept"))));
  b.callbackQuery(
    /^mcy:(.+)$/,
    patientCb(async (ctx, lang) => {
      const booking = await ownBooking(ctx, ctx.match[1]);
      if (!booking) return editOrReply(ctx, tt(lang, "bookingNotFound"));
      const vars = { service: serviceLabel(booking.serviceId, lang), date: formatDateTime(booking.date, lang) };
      if (!ACTIVE_STATUSES.includes(booking.status)) return editOrReply(ctx, tt(lang, "myCanceled", vars));
      // Лікар знає про запис, лише якщо пацієнт уже підтвердив його (див. holds.js).
      const ownerKnew = booking.status !== "pending_client";
      await cancelBooking(booking.id);
      await editOrReply(ctx, tt(lang, "myCanceled", vars));
      if (ownerKnew) await notifyOwnerClientCanceled(booking.id, "telegram");
    }),
  );

  // Відгук: з кнопки під питанням лікаря (rv:<id запису>), вибір послуги, зірки, скасування.
  b.callbackQuery(
    /^rv:(.+)$/,
    patientCb((ctx, lang) => startReview(ctx, lang, ctx.match[1])),
  );
  b.callbackQuery(
    /^rvs:(.+)$/,
    patientCb((ctx, lang) => editOrReply(ctx, ...ratingPrompt(lang, ctx.match[1]))),
  );
  b.callbackQuery(
    /^rvr:([^:]+):([1-5])$/,
    patientCb(async (ctx, lang) => {
      const serviceId = ctx.match[1];
      const rating = Number(ctx.match[2]);
      const user = await clientByChat(ctx.chat.id);
      const attended = user ? await attendedServiceIds(user.id) : [];
      if (!attended.includes(serviceId)) return editOrReply(ctx, tt(lang, "rvNotEligible"));
      pendingReview.set(String(ctx.chat.id), { serviceId, rating, at: Date.now() });
      const kb = new InlineKeyboard().text(tt(lang, "bkCancelBtn"), "rvx");
      return editOrReply(ctx, tt(lang, "rvAskText", { stars: "⭐".repeat(rating) }), { reply_markup: kb });
    }),
  );
  b.callbackQuery(
    "rvx",
    patientCb((ctx, lang) => {
      pendingReview.delete(String(ctx.chat.id));
      return editOrReply(ctx, tt(lang, "rvCanceled"));
    }),
  );

  // Лікар: прибрати відгук із сайту (з перепитуванням, щоб не видалити випадковим дотиком).
  const ownerCb = (fn) => async (ctx) => {
    const owner = await getOwner();
    if (!isOwnerChat(owner, ctx.chat?.id)) return ctx.answerCallbackQuery({ text: "Немає доступу." });
    return fn(ctx);
  };
  const reviewKb = (id) => new InlineKeyboard().text("🗑 Прибрати з сайту", `rvdel:${id}`);
  b.callbackQuery(
    /^rvdel:(.+)$/,
    ownerCb(async (ctx) => {
      await ctx.answerCallbackQuery();
      const kb = new InlineKeyboard()
        .text("Так, видалити відгук", `rvdelok:${ctx.match[1]}`)
        .text("Ні, залишити", `rvkeep:${ctx.match[1]}`);
      await ctx.editMessageReplyMarkup({ reply_markup: kb }).catch(() => {});
    }),
  );
  b.callbackQuery(
    /^rvkeep:(.+)$/,
    ownerCb(async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: reviewKb(ctx.match[1]) }).catch(() => {});
    }),
  );
  b.callbackQuery(
    /^rvdelok:(.+)$/,
    ownerCb(async (ctx) => {
      const { count } = await prisma.review.deleteMany({ where: { id: ctx.match[1] } });
      await ctx.answerCallbackQuery({ text: count ? "Відгук видалено" : "Відгук уже видалено" });
      const base = ctx.callbackQuery.message?.text ?? "Відгук";
      await ctx.editMessageText(`${base}\n\n🗑 ВИДАЛЕНО З САЙТУ`, { reply_markup: undefined }).catch(() => {});
    }),
  );

  // Пацієнт поділився номером (крок запису).
  b.on("message:contact", async (ctx, next) => {
    const chatId = String(ctx.chat.id);
    const flow = freshFlow(pendingBook, chatId);
    if (!flow) return next();
    const lang = await chatLang(chatId);
    const contact = ctx.message.contact;
    // Лише власний номер: Telegram ставить user_id, коли людина ділиться саме своїм контактом.
    // Інакше хтось міг би «прив'язати» до себе чужий профіль і отримувати чужі нагадування.
    if (contact.user_id !== ctx.from?.id) {
      return ctx.reply(tt(lang, "bkContactNotOwn"), { reply_markup: contactKeyboard(lang) });
    }
    const user = await clientFromContact(ctx, contact, lang);
    pendingBook.delete(chatId);
    await ctx.reply(tt(lang, "bkContactThanks", { name: user.name }), { reply_markup: mainMenu(lang) });

    const slot = await freeSlot(flow.slotId);
    if (!slot) return ctx.reply(tt(lang, "bkGone"));
    const count = await activeCount(user.id);
    if (count >= MAX_BOT_BOOKINGS) return ctx.reply(tt(lang, "bkTooMany", { count }));
    return showBookConfirm(ctx, lang, slot, user);
  });

  // Будь-яка інша кнопка — зі старих повідомлень (напр. попереднього бота з цим токеном)
  // чи з нашої старішої версії. Відповідаємо, щоб у людини не крутився вічний «годинник».
  b.on("callback_query:data", (ctx) =>
    ctx.answerCallbackQuery({ text: "Ця кнопка вже не діє. Надішліть /start.", show_alert: true }),
  );

  // Текстові повідомлення.
  b.on("message", async (ctx) => {
    const owner = await getOwner();

    if (isOwnerChat(owner, ctx.chat.id)) {
      // Реплай на переслане повідомлення = відповідь пацієнту. Перевіряємо це першим:
      // явний намір лікаря важливіший за незавершений /add.
      const replyTo = ctx.message.reply_to_message?.message_id;
      if (replyTo) {
        const relay = await prisma.telegramRelay.findUnique({ where: { ownerMsgId: replyTo } });
        if (relay) {
          const lang = await chatLang(relay.chatId);
          try {
            if (ctx.message.text) {
              await ctx.api.sendMessage(relay.chatId, `${tt(lang, "doctorReply")}\n\n${ctx.message.text}`);
            } else {
              // Вкладення (фото, документ, голосове) — копіюємо як є, з підписом-заголовком.
              await ctx.api.sendMessage(relay.chatId, tt(lang, "doctorReply"));
              await ctx.api.copyMessage(relay.chatId, ctx.chat.id, ctx.message.message_id);
            }
            return ctx.reply(`✅ Надіслано${relay.fromName ? ` — ${relay.fromName}` : ""}.`);
          } catch (e) {
            // Найчастіше пацієнт заблокував бота або видалив чат.
            return ctx.reply(`❌ Не вдалося надіслати: ${e.description || e.message}`);
          }
        }
        return ctx.reply("Не бачу, кому це відповідь. Відповідайте реплаєм на переслане повідомлення пацієнта.");
      }

      // Якщо лікар зараз додає слоти — трактуємо текст як дати/час.
      const serviceId = pendingAdd.get(String(ctx.chat.id));
      if (serviceId && ctx.message.text) {
        pendingAdd.delete(String(ctx.chat.id));
        const lines = ctx.message.text.split("\n").map((l) => l.trim()).filter(Boolean);
        const dates = [];
        const bad = [];
        for (const line of lines) {
          const d = parseSlotLine(line);
          if (d) dates.push(d);
          else bad.push(line);
        }
        if (dates.length === 0) {
          return ctx.reply("Не вдалося розпізнати дату/час. Формат: ДД.ММ ГГ:ХХ. Спробуйте /add ще раз.");
        }
        const created = await createSlots(serviceId, dates);
        let msg = `✅ Додано годин: ${created.length} (${ownerService(serviceId)}).`;
        if (created.length < dates.length) {
          msg += `\nПропущено (минулі або дублікати): ${dates.length - created.length}.`;
        }
        if (bad.length) msg += `\nНерозпізнано: ${bad.join(", ")}.`;
        return ctx.reply(msg);
      }
      return; // звичайні повідомлення власника — не чіпаємо
    }

    const chatId = String(ctx.chat.id);
    const lang = await chatLang(chatId);

    // Пацієнт пише текст відгуку (після вибору зірок).
    const review = freshFlow(pendingReview, chatId);
    if (review) {
      const text = ctx.message.text?.trim();
      if (!text) return ctx.reply(tt(lang, "rvTextOnly"));
      if (text.length > REVIEW_MAX_LEN) return ctx.reply(tt(lang, "rvTooLong", { max: REVIEW_MAX_LEN }));
      const user = await clientByChat(chatId);
      pendingReview.delete(chatId);
      if (!user) return ctx.reply(tt(lang, "rvNotEligible"));
      const created = await createReview(user, {
        rating: review.rating,
        serviceId: review.serviceId,
        text,
        source: "telegram",
      });
      await ctx.reply(tt(lang, "rvThanks"), { reply_markup: mainMenu(lang) });
      return notifyOwnerNewReview(created.id, user.id).catch((e) =>
        console.error("Не вдалося сповістити лікаря про відгук:", e.description || e.message),
      );
    }

    // Чекаємо номер телефону, а людина написала текст — нагадуємо про кнопку.
    if (freshFlow(pendingBook, chatId)) {
      return ctx.reply(tt(lang, "bkAskContact"), { reply_markup: contactKeyboard(lang) });
    }

    // Звичайне повідомлення — пересилаємо лікарю. Якщо нещодавно йому надіслали питання
    // «як ви після прийому?», підписуємо, що це відповідь на нього.
    const user = await clientByChat(chatId);
    const followUp = user
      ? await prisma.booking.findFirst({
          where: { userId: user.id, followUpSentAt: { gte: new Date(Date.now() - FOLLOWUP_CONTEXT_DAYS * DAY_MS) } },
          orderBy: { followUpSentAt: "desc" },
        })
      : null;

    // Повна відповідь — раз на пів години, далі лише 👍: у діалозі з лікарем
    // однакове «повідомлення передано» на кожну репліку дратує.
    const last = lastAck.get(chatId) ?? 0;
    if (Date.now() - last > ACK_QUIET_MS) {
      lastAck.set(chatId, Date.now());
      await ctx.reply(tt(lang, followUp ? "msgAckFollowUp" : "msgAck"), { reply_markup: mainMenu(lang) });
    } else {
      await ctx.react("👍").catch(() => {});
    }

    if (owner?.telegramChatId) {
      const f = ctx.from;
      const tgName = f ? `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim() : "";
      const name = user?.name || tgName;
      const who =
        (name || "пацієнта") +
        (f?.username ? ` (@${f.username})` : "") +
        (user?.phone ? `, 📞 ${user.phone}` : "");
      const head = followUp
        ? `💬 ${who} відповідає на ваше питання після прийому ` +
          `(${ownerService(followUp.serviceId)}, ${formatDate(followUp.date)})`
        : `✉️ Повідомлення від ${who}`;
      try {
        await ctx.api.sendMessage(
          owner.telegramChatId,
          `${head}${lang === "en" ? " (пише англійською 🇬🇧)" : ""}` +
            " — відповідайте реплаєм на наступне повідомлення:",
        );
        // copyMessage переносить будь-який вміст (текст, фото, документ, голосове).
        const copy = await ctx.api.copyMessage(owner.telegramChatId, ctx.chat.id, ctx.message.message_id);
        // Запам'ятовуємо, кому належить копія — щоб реплай лікаря дійшов адресату.
        await prisma.telegramRelay.create({
          data: { ownerMsgId: copy.message_id, chatId, fromName: name || null },
        });
      } catch (e) {
        console.error("Не вдалося переслати повідомлення пацієнта:", e.description || e.message);
      }
    }
  });

  b.catch((err) => console.error("Помилка бота:", err));
  return b;
}

// Рядок для лікаря: чи дійшло рішення до пацієнта.
function deliveryNote(delivery) {
  if (delivery?.sent) return "📨 Пацієнта сповіщено в Telegram.";
  if (delivery?.reason === "no_chat") return "🔕 Пацієнт не відкривав бота — варто подзвонити.";
  return "⚠️ Не вдалося написати пацієнту — варто подзвонити.";
}

// Один прохід нагадувань: для кожного рівня (за добу, за годину) беремо активні записи,
// що потрапили у вікно й ще не отримали саме цього нагадування. Позначку зберігаємо в БД,
// щоб перезапуск сервера не спричинив дубль.
let remindersRunning = false;
async function sendDueReminders() {
  if (remindersRunning) return; // попередній прохід ще триває — не дублюємо
  remindersRunning = true;
  try {
    for (const tier of REMIND_TIERS) {
      const now = Date.now();
      const due = await prisma.booking.findMany({
        where: {
          status: { in: ["pending", "confirmed"] },
          [tier.field]: null,
          date: {
            gte: new Date(now + tier.minLeadMin * 60_000),
            lte: new Date(now + tier.beforeMin * 60_000),
          },
          createdAt: { lte: new Date(now - tier.minAgeMin * 60_000) },
        },
        include: { user: true },
      });
      if (due.length === 0) continue;

      for (const b of due) {
        // Пацієнт не відкривав бота — нагадувати нікуди. Лишаємо позначку порожньою:
        // якщо він натисне посилання до візиту, нагадування ще встигне піти.
        const chatId = b.user?.telegramChatId;
        if (!chatId) continue;

        const lang = normalizeLang(b.user.lang);
        const { doctor, address } = await clinicBits(lang);
        const text = tt(lang, tier.key, {
          doctor,
          address,
          service: serviceLabel(b.serviceId, lang),
          date: tier.long ? formatLongDateTime(b.date, lang) : formatDateTime(b.date, lang),
        });

        try {
          await bot.api.sendMessage(chatId, text);
          await markReminded(b.id, tier.field);
        } catch (e) {
          // Найчастіше пацієнт заблокував бота. Позначаємо як надіслане, щоб не бити
          // в стіну щохвилини, і повідомляємо лікаря — хай подзвонить.
          console.error("Не вдалося надіслати нагадування:", e.description || e.message);
          await markReminded(b.id, tier.field);
          const owner = await getOwner();
          if (owner?.telegramChatId) {
            await bot.api
              .sendMessage(
                owner.telegramChatId,
                `⚠️ Не вдалося нагадати пацієнту: ${b.clientName} — ${formatDate(b.date)}. ` +
                  "Можливо, варто подзвонити.",
              )
              .catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.error("Помилка нагадувань:", e.message);
  } finally {
    remindersRunning = false;
  }
}

const markReminded = (bookingId, field) =>
  prisma.booking.update({ where: { id: bookingId }, data: { [field]: new Date() } });

// Посилання на бота з payload'ом для /start, напр. botLink("r_<id запису>").
// null — бот вимкнено або ще не встиг дізнатися своє ім'я (тоді сайт візьме посилання з профілю клініки).
export function botLink(payload) {
  try {
    const username = bot?.botInfo?.username;
    return username ? `https://t.me/${username}?start=${payload}` : null;
  } catch {
    return null; // botInfo недоступний до bot.init()
  }
}

// Створити бота без запуску опитування (startBot нижче; окремо — для перевірок сценаріїв).
export function initBot() {
  bot = buildBot();
  return bot;
}

// Запуск (з index.js). Без токена — тихо вимкнено.
export function startBot() {
  if (!botEnabled) {
    console.log("ℹ️  Telegram-бот вимкнено (немає TELEGRAM_BOT_TOKEN у .env).");
    return;
  }
  initBot();
  // Помилку запуску (невірний токен, Telegram недоступний, другий екземпляр бота — 409)
  // ловимо: без цього необроблений reject валить увесь процес, а з ним і сайт.
  bot
    .start({ onStart: (info) => console.log(`🤖 Telegram-бот @${info.username} запущено.`) })
    .catch((e) =>
      console.error("❌ Telegram-бот зупинився (сайт працює далі):", e.description || e.message),
    );

  // Нагадування: одразу після старту (раптом щось назріло під час простою) і далі щохвилини.
  // Там само — питання «як ви після прийому?» (сам пропускає нічні години).
  const tick = () => {
    sendDueReminders();
    sendDueFollowUps();
  };
  tick();
  reminderTimer = setInterval(tick, REMIND_CHECK_MS);
  reminderTimer.unref?.(); // не тримати процес живим лише через таймер
}

// Сповістити власника про новий запис із сайту. Викликається, коли пацієнт уже
// підтвердив запис у боті (кнопка cok) — отже, людина реальна й на зв'язку.
export async function notifyOwnerNewBooking(booking) {
  if (!botEnabled || !bot) return;
  const owner = await getOwner();
  if (!owner?.telegramChatId) return; // лікар ще не зробив /bind

  const client = await prisma.user.findUnique({ where: { id: booking.userId } });
  const fromBot = booking.source === "telegram";
  const lines = [
    fromBot ? "🆕 Новий запис через Telegram-бот" : "🆕 Новий запис із сайту",
    fromBot ? "Пацієнт обрав час і підтвердив запис у боті ✔️" : "Пацієнт підтвердив його в Telegram ✔️",
    "",
    `👤 ${booking.clientName}`,
    client?.phone ? `📞 ${client.phone}` : null,
    client?.telegram ? `✈️ ${client.telegram}` : null,
    normalizeLang(client?.lang) === "en" ? "🇬🇧 Пише англійською" : null,
    `🩺 ${ownerService(booking.serviceId)}`,
    `🗓 ${formatDate(booking.date)}`,
    `💰 ${booking.price} грн`,
  ].filter((l) => l !== null);

  const kb = new InlineKeyboard()
    .text("✅ Підтвердити", `confirm:${booking.id}`)
    .text("❌ Скасувати", `cancel:${booking.id}`);

  await bot.api.sendMessage(owner.telegramChatId, lines.join("\n"), { reply_markup: kb });
}

// Попросити пацієнта підтвердити запис (routes/bookings.js), якщо його чат уже відомий —
// тоді йому навіть не треба переходити за посиланням із сайту.
export async function requestClientConfirmation(bookingId) {
  if (!botEnabled || !bot) return;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking?.user?.telegramChatId || booking.status !== "pending_client") return;
  await sendConfirmRequest(booking.user.telegramChatId, booking);
}

// Пацієнт не підтвердив запис вчасно — його скасовано (holds.js). Кажемо людині чому.
export async function notifyClientHoldExpired(bookingId) {
  if (!botEnabled || !bot) return;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  const chatId = booking?.user?.telegramChatId;
  if (!chatId) return;
  const lang = normalizeLang(booking.user.lang);
  await bot.api.sendMessage(
    chatId,
    tt(lang, "holdExpired", {
      service: serviceLabel(booking.serviceId, lang),
      date: formatDateTime(booking.date, lang),
    }),
  );
}

// Сповістити ПАЦІЄНТА про рішення лікаря (кнопки в боті або статус в адмінці).
// Пишемо лише про підтвердження й скасування — «completed» людині нецікаво.
// Повертає { sent, reason } — лікарю показуємо, чи дійшло.
export async function notifyClientBookingStatus(bookingId, status) {
  const key = status === "confirmed" ? "confirmed" : status === "canceled" ? "canceled" : null;
  if (!key) return { sent: false, reason: "skip" };
  if (!botEnabled || !bot) return { sent: false, reason: "bot_off" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking) return { sent: false, reason: "not_found" };

  const chatId = booking.user?.telegramChatId;
  if (!chatId || booking.user.role === "owner") return { sent: false, reason: "no_chat" };

  const lang = normalizeLang(booking.user.lang);
  const { doctor, address } = await clinicBits(lang);
  const text = tt(lang, key, {
    doctor,
    address: key === "confirmed" ? address : "",
    service: serviceLabel(booking.serviceId, lang),
    date: formatDateTime(booking.date, lang),
  });

  try {
    await bot.api.sendMessage(chatId, text);
    return { sent: true };
  } catch (e) {
    console.error("Не вдалося сповістити пацієнта:", e.description || e.message);
    return { sent: false, reason: "error" };
  }
}

// Сповістити ЛІКАРЯ, що пацієнт скасував запис сам (кабінет на сайті чи «Мої записи» в боті).
// Без цього слот звільнявся тихо — лікар дізнавався про вікно, лише зазирнувши в адмінку.
export async function notifyOwnerClientCanceled(bookingId, via = "site") {
  if (!botEnabled || !bot) return;
  const owner = await getOwner();
  if (!owner?.telegramChatId) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking) return;

  const lines = [
    `🚫 Пацієнт скасував запис (${via === "telegram" ? "через Telegram-бот" : "кабінет на сайті"})`,
    `👤 ${booking.clientName}`,
    booking.user?.phone ? `📞 ${booking.user.phone}` : null,
    `🩺 ${ownerService(booking.serviceId)}`,
    `🗓 ${formatDate(booking.date)}`,
    "",
    "Час знову вільний на сайті.",
  ].filter((l) => l !== null);

  await bot.api.sendMessage(owner.telegramChatId, lines.join("\n")).catch((e) => {
    console.error("Не вдалося сповістити лікаря про скасування:", e.description || e.message);
  });
}

// Сповістити ЛІКАРЯ про новий відгук — і з сайту, і з бота. Кнопка під ним прибирає
// відгук із сайту. Якщо автор на зв'язку в боті, лікар може подякувати йому реплаєм.
export async function notifyOwnerNewReview(reviewId, authorId = null) {
  if (!botEnabled || !bot) return;
  const owner = await getOwner();
  if (!owner?.telegramChatId) return;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return;
  const author = authorId ? await prisma.user.findUnique({ where: { id: authorId } }) : null;
  const canReply = !!author?.telegramChatId && author.role === "client";

  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const lines = [
    review.source === "telegram" ? "⭐ Новий відгук через Telegram-бот" : "⭐ Новий відгук на сайті",
    "",
    `👤 ${review.name}`,
    author?.phone ? `📞 ${author.phone}` : null,
    review.serviceId ? `🩺 ${ownerService(review.serviceId)}` : null,
    `${stars} (${review.rating}/5)`,
    "",
    `«${review.textUk}»`,
    "",
    "Відгук уже на сайті.",
    canReply ? "Подякувати автору — реплаєм на це повідомлення." : null,
  ].filter((l) => l !== null);

  const msg = await bot.api.sendMessage(owner.telegramChatId, lines.join("\n"), {
    reply_markup: new InlineKeyboard().text("🗑 Прибрати з сайту", `rvdel:${review.id}`),
  });
  if (canReply) {
    await prisma.telegramRelay.create({
      data: { ownerMsgId: msg.message_id, chatId: author.telegramChatId, fromName: author.name },
    });
  }
}

// Питання від імені лікаря через FOLLOWUP_DAYS днів після прийому: «як ви зараз?».
// Відповідь пацієнта йде лікарю як звичайне повідомлення (з підписом «відповідає на ваше
// питання»), лікар відповідає реплаєм — і так далі, виходить діалог. Під питанням — кнопка
// «⭐ Оцінити прийом». Позначку followUpSentAt ставимо навіть при помилці — щоб не повторювати.
let followUpsRunning = false;
export async function sendDueFollowUps() {
  if (!botEnabled || !bot || followUpsRunning) return;
  const hour = clinicHour();
  if (hour < FOLLOWUP_HOURS[0] || hour >= FOLLOWUP_HOURS[1]) return; // не пишемо вночі
  followUpsRunning = true;
  try {
    const now = Date.now();
    const due = await prisma.booking.findMany({
      where: {
        // Прийом відбувся: лікар завершив його або підтверджений час уже минув.
        status: { in: ["confirmed", "completed"] },
        followUpSentAt: null,
        date: {
          lte: new Date(now - FOLLOWUP_DAYS * DAY_MS),
          gte: new Date(now - (FOLLOWUP_DAYS + FOLLOWUP_WINDOW_DAYS) * DAY_MS),
        },
        user: { role: "client", telegramChatId: { not: null } },
      },
      include: { user: true },
      orderBy: { date: "desc" },
    });
    if (due.length === 0) return;

    const owner = await getOwner();
    const asked = new Set(); // одне питання на людину, навіть якщо прийомів було кілька
    for (const b of due) {
      await prisma.booking.update({ where: { id: b.id }, data: { followUpSentAt: new Date() } });
      if (asked.has(b.userId)) continue;
      asked.add(b.userId);

      const lang = normalizeLang(b.user.lang);
      const clinic = await prisma.clinicProfile.findUnique({ where: { id: 1 } });
      const doctorName = clinic?.doctorName
        ? tt(lang, "followUpDoctor", { name: doctorNameIn(clinic.doctorName, lang) })
        : tt(lang, "followUpDoctor", { name: "" }).trim();
      const text = tt(lang, "followUp", {
        name: b.user.name,
        doctorName,
        service: serviceLabel(b.serviceId, lang),
        date: formatDateTime(b.date, lang).split(",")[0],
      });
      const kb = new InlineKeyboard().text(tt(lang, "followUpReviewBtn"), `rv:${b.id}`);
      try {
        await bot.api.sendMessage(b.user.telegramChatId, text, { reply_markup: kb });
      } catch (e) {
        console.error("Не вдалося надіслати питання після прийому:", e.description || e.message);
        continue;
      }

      // Лікарю — тихе повідомлення: що й кому пішло. Реплай на нього = написати пацієнту.
      if (owner?.telegramChatId) {
        try {
          const notice = await bot.api.sendMessage(
            owner.telegramChatId,
            `📨 ${b.clientName} — надіслано ваше питання про самопочуття ` +
              `(${FOLLOWUP_DAYS} дн. після прийому: ${ownerService(b.serviceId)}, ${formatDate(b.date)}).\n` +
              "Відповідь пацієнта прийде сюди. Написати йому зараз — реплаєм на це повідомлення.",
            { disable_notification: true },
          );
          await prisma.telegramRelay.create({
            data: { ownerMsgId: notice.message_id, chatId: b.user.telegramChatId, fromName: b.clientName },
          });
        } catch (e) {
          console.error("Не вдалося сповістити лікаря про питання:", e.description || e.message);
        }
      }
    }
  } catch (e) {
    console.error("Помилка питань після прийому:", e.message);
  } finally {
    followUpsRunning = false;
  }
}
