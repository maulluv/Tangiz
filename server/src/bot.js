// Telegram-бот клініки: лікар керує записами, пацієнт отримує сповіщення.
// Вмикається ЛИШЕ якщо в .env є TELEGRAM_BOT_TOKEN — інакше сервер працює без бота.
//
// Лікарю:
//  • /bind <пароль> — прив'язати цей чат як отримувача записів;
//  • нові записи із сайту з кнопками ✅ Підтвердити / ❌ Скасувати;
//  • скасування пацієнтом із кабінету — окремим повідомленням;
//  • /add — додати вільні години на послугу; /slots — переглянути й видалити;
//  • повідомлення пацієнтів + відповідь реплаєм (TelegramRelay).
//
// Пацієнту (якщо він відкрив бота за посиланням із сайту /start r_<id запису>):
//  • рішення лікаря — «підтверджено» / «скасовано»;
//  • нагадування за добу й за годину до візиту;
//  • усе — його мовою (User.lang із сайту; перемкнути — /lang).
//
// Час скрізь у поясі клініки (CLINIC_TZ, див. time.js), керування слотами — через
// спільну з сайтом логіку (slotsLib), тож дані завжди синхронні.
import { Bot, InlineKeyboard } from "grammy";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { listFutureSlots, createSlots, deleteFreeSlot, cancelBooking } from "./slotsLib.js";
import { formatDateTime, formatLongDateTime } from "./time.js";
import { tt, serviceLabel, SERVICE_SHORT, normalizeLang } from "./botText.js";

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

let bot = null;
let reminderTimer = null;
// Хто з власників зараз додає слоти й для якої послуги: chatId → serviceId.
const pendingAdd = new Map();
// Мова чатів, яких ще немає в БД (людина написала боту, не записавшись): chatId → "uk"|"en".
// Живе до перезапуску — цього досить, бо після запису мова осідає в User.lang.
const guestLang = new Map();

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
    doctor: clinic?.doctorName ? tt(lang, "doctorOf", { name: clinic.doctorName }) : "",
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
  return Number.isNaN(d.getTime()) ? null : d;
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
// Запам'ятовуємо його chatId у профілі — далі зможемо писати першими.
async function enableRemindersFor(ctx, bookingId) {
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

  if (booking.status === "canceled") {
    return ctx.reply(tt(lang, "remindersOnCanceled"));
  }

  return ctx.reply(
    tt(lang, "remindersOn", {
      service: serviceLabel(booking.serviceId, lang),
      date: formatDateTime(booking.date, lang),
    }),
  );
}

function buildBot() {
  const b = new Bot(TOKEN);

  // /start відповідає по-різному трьом аудиторіям, щоб пацієнт не бачив службових команд:
  //  • лікар (прив'язаний чат) — його інструменти;
  //  • ніхто ще не прив'язаний — підказка про /bind (лише на час налаштування бота);
  //  • усі інші — текст для пацієнта, без згадок про пароль і команди.
  b.command("start", async (ctx) => {
    const owner = await getOwner();

    // Посилання з сайту: t.me/<бот>?start=r_<id запису> — вмикає нагадування пацієнту.
    const payload = (ctx.match || "").trim();
    if (payload.startsWith("r_")) {
      return enableRemindersFor(ctx, payload.slice(2));
    }

    if (isOwnerChat(owner, ctx.chat.id)) {
      return ctx.reply(
        "Вітаю! Ви отримуєте сюди нові записи з сайту.\n\n" +
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

    return ctx.reply(tt(await chatLang(ctx.chat.id), "startPatient"));
  });

  // Пацієнт може перемкнути мову бота: /lang → кнопки.
  b.command("lang", async (ctx) => {
    const owner = await getOwner();
    if (isOwnerChat(owner, ctx.chat.id)) return; // лікарю мову не міняємо
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
    try {
      await ctx.editMessageText(tt(lang, "langSet"), { reply_markup: undefined });
    } catch {
      await ctx.reply(tt(lang, "langSet"));
    }
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

    // Пацієнт: відповідь + пересилання власнику.
    const lang = await chatLang(ctx.chat.id);
    await ctx.reply(tt(lang, "msgAck"));
    if (owner?.telegramChatId) {
      const f = ctx.from;
      const name = f ? `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim() : "";
      const who = name + (f?.username ? ` (@${f.username})` : "");
      try {
        await ctx.api.sendMessage(
          owner.telegramChatId,
          `✉️ Повідомлення від ${who || "пацієнта"}${lang === "en" ? " (пише англійською 🇬🇧)" : ""}` +
            " — відповідайте реплаєм на наступне повідомлення:",
        );
        // copyMessage переносить будь-який вміст (текст, фото, документ, голосове),
        // на відміну від колишнього ctx.message.text, який губив усі вкладення.
        const copy = await ctx.api.copyMessage(owner.telegramChatId, ctx.chat.id, ctx.message.message_id);
        // Запам'ятовуємо, кому належить копія — щоб реплай лікаря дійшов адресату.
        await prisma.telegramRelay.create({
          data: {
            ownerMsgId: copy.message_id,
            chatId: String(ctx.chat.id),
            fromName: name || null,
          },
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

// Запуск (з index.js). Без токена — тихо вимкнено.
export function startBot() {
  if (!botEnabled) {
    console.log("ℹ️  Telegram-бот вимкнено (немає TELEGRAM_BOT_TOKEN у .env).");
    return;
  }
  bot = buildBot();
  bot.start({ onStart: (info) => console.log(`🤖 Telegram-бот @${info.username} запущено.`) });

  // Нагадування: одразу після старту (раптом щось назріло під час простою) і далі щохвилини.
  sendDueReminders();
  reminderTimer = setInterval(sendDueReminders, REMIND_CHECK_MS);
  reminderTimer.unref?.(); // не тримати процес живим лише через таймер
}

// Сповістити власника про новий запис із сайту (викликається з routes/bookings.js).
export async function notifyOwnerNewBooking(booking) {
  if (!botEnabled || !bot) return;
  const owner = await getOwner();
  if (!owner?.telegramChatId) return; // лікар ще не зробив /bind

  const client = await prisma.user.findUnique({ where: { id: booking.userId } });
  const lines = [
    "🆕 Новий запис із сайту",
    `👤 ${booking.clientName}`,
    client?.phone ? `📞 ${client.phone}` : null,
    client?.telegram ? `✈️ ${client.telegram}` : null,
    normalizeLang(client?.lang) === "en" ? "🇬🇧 Пише англійською" : null,
    `🩺 ${ownerService(booking.serviceId)}`,
    `🗓 ${formatDate(booking.date)}`,
    `💰 ${booking.price} грн`,
  ].filter(Boolean);

  const kb = new InlineKeyboard()
    .text("✅ Підтвердити", `confirm:${booking.id}`)
    .text("❌ Скасувати", `cancel:${booking.id}`);

  await bot.api.sendMessage(owner.telegramChatId, lines.join("\n"), { reply_markup: kb });
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

// Сповістити ЛІКАРЯ, що пацієнт скасував запис сам (кабінет на сайті).
// Без цього слот звільнявся тихо — лікар дізнавався про вікно, лише зазирнувши в адмінку.
export async function notifyOwnerClientCanceled(bookingId) {
  if (!botEnabled || !bot) return;
  const owner = await getOwner();
  if (!owner?.telegramChatId) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true },
  });
  if (!booking) return;

  const lines = [
    "🚫 Пацієнт скасував запис (кабінет на сайті)",
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
