// Telegram-бот для власника (лікаря).
// Вмикається ЛИШЕ якщо в .env є TELEGRAM_BOT_TOKEN — інакше сервер працює без бота.
//
// Що вміє:
//  • /bind <пароль> — прив'язати цей чат як отримувача записів;
//  • шле власнику нові записи із сайту з кнопками ✅ Підтвердити / ❌ Скасувати;
//  • /add — додати вільні години на послугу; /slots — переглянути й видалити;
//  • інші повідомлення від людей — ввічлива відповідь + пересилання власнику.
// Керування слотами використовує ту саму логіку, що й сайт (slotsLib) → усе синхронно.
import { Bot, InlineKeyboard } from "grammy";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { listFutureSlots, createSlots, deleteFreeSlot } from "./slotsLib.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const botEnabled = !!TOKEN;

// Назви послуг українською (збігаються з i18n сайту).
const SERVICE_LABELS = {
  s1: "Консультація",
  s2: "Мануальна терапія",
  s3: "Терапевтичний прийом",
};
const SERVICE_SHORT = { s1: "Консульт.", s2: "Мануальна", s3: "Терапевт." };
const serviceLabel = (id) => SERVICE_LABELS[id] || id;

const formatDate = (d) =>
  new Date(d).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

let bot = null;
// Хто з власників зараз додає слоти й для якої послуги: chatId → serviceId.
const pendingAdd = new Map();

const getOwner = () => prisma.user.findFirst({ where: { role: "owner" } });
const isOwnerChat = (owner, chatId) =>
  owner?.telegramChatId && String(chatId) === owner.telegramChatId;

// Розбирає рядок "ДД.ММ ГГ:ХХ" (рік необов'язковий) у Date у локальному часі сервера.
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

function buildBot() {
  const b = new Bot(TOKEN);

  b.command("start", (ctx) =>
    ctx.reply(
      "Вітаю! Це службовий бот клініки TANGIZ.\n\n" +
        "• Якщо ви лікар — надішліть «/bind ваш_пароль», щоб отримувати сюди нові записи.\n" +
        "   Далі: /add — додати вільні години, /slots — переглянути й видалити.\n" +
        "• Якщо ви пацієнт — записатися найзручніше на сайті. Можете також написати тут, і лікар відповість.",
    ),
  );

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
    for (const [id, label] of Object.entries(SERVICE_LABELS)) kb.text(label, `addsvc:${id}`).row();
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
      `Послуга: ${serviceLabel(serviceId)}.\n` +
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
    await prisma.booking.update({ where: { id: bookingId }, data: { status } });
    if (status === "canceled" && booking.slotId) {
      await prisma.slot.update({ where: { id: booking.slotId }, data: { booked: false } });
    }

    await ctx.answerCallbackQuery({ text: status === "confirmed" ? "Підтверджено ✅" : "Скасовано ❌" });
    const mark = status === "confirmed" ? "✅ ПІДТВЕРДЖЕНО" : "❌ СКАСОВАНО";
    const base = ctx.callbackQuery.message?.text ?? "Запис";
    try {
      await ctx.editMessageText(`${base}\n\n${mark}`, { reply_markup: undefined });
    } catch {
      /* повідомлення могло змінитись — ігноруємо */
    }
  });

  // Текстові повідомлення.
  b.on("message", async (ctx) => {
    const owner = await getOwner();

    if (isOwnerChat(owner, ctx.chat.id)) {
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
        let msg = `✅ Додано годин: ${created.length} (${serviceLabel(serviceId)}).`;
        if (created.length < dates.length) {
          msg += `\nПропущено (минулі або дублікати): ${dates.length - created.length}.`;
        }
        if (bad.length) msg += `\nНерозпізнано: ${bad.join(", ")}.`;
        return ctx.reply(msg);
      }
      return; // звичайні повідомлення власника — не чіпаємо
    }

    // Пацієнт: відповідь + пересилання власнику.
    await ctx.reply(
      "Дякуємо за звернення! Щоб записатися на прийом, скористайтеся сайтом. " +
        "Лікар отримав ваше повідомлення й відповість найближчим часом.",
    );
    if (owner?.telegramChatId) {
      const f = ctx.from;
      const who =
        (f ? `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim() : "") +
        (f?.username ? ` (@${f.username})` : "");
      const text = ctx.message.text || "(вкладення без тексту)";
      try {
        await ctx.api.sendMessage(owner.telegramChatId, `✉️ Повідомлення від ${who || "пацієнта"}:\n\n${text}`);
      } catch {
        /* власник міг заблокувати бота — ігноруємо */
      }
    }
  });

  b.catch((err) => console.error("Помилка бота:", err));
  return b;
}

// Запуск (з index.js). Без токена — тихо вимкнено.
export function startBot() {
  if (!botEnabled) {
    console.log("ℹ️  Telegram-бот вимкнено (немає TELEGRAM_BOT_TOKEN у .env).");
    return;
  }
  bot = buildBot();
  bot.start({ onStart: (info) => console.log(`🤖 Telegram-бот @${info.username} запущено.`) });
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
    `🩺 ${serviceLabel(booking.serviceId)}`,
    `🗓 ${formatDate(booking.date)}`,
    `💰 ${booking.price} грн`,
  ].filter(Boolean);

  const kb = new InlineKeyboard()
    .text("✅ Підтвердити", `confirm:${booking.id}`)
    .text("❌ Скасувати", `cancel:${booking.id}`);

  await bot.api.sendMessage(owner.telegramChatId, lines.join("\n"), { reply_markup: kb });
}
