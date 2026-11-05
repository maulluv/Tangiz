// Записи: створення з сайту (публічно) + перегляд/скасування своїх (за токеном).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, normalizePhone, normalizeTg, isValidPhone } from "../utils.js";
import { normalizeLang } from "../botText.js";
import { requireAuth } from "../auth.js";
import {
  botEnabled,
  notifyOwnerClientCanceled,
  requestClientConfirmation,
  botLink,
} from "../bot.js";
import { cancelBooking, bookSlot } from "../slotsLib.js";
import { CONFIRM_MIN, holdDeadline } from "../holds.js";

const router = Router();

// Створити запис із сайту. Публічно (запис має бути без тертя — лише ім'я+телефон).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, phone, telegram, serviceId, date, lang } = req.body ?? {};

    const cleanName = String(name ?? "").trim();
    if (!cleanName) return res.status(400).json({ error: "Вкажіть ім'я." });
    if (!isValidPhone(phone)) return res.status(400).json({ error: "Некоректний номер телефону." });

    // Ціну й тривалість беремо з БД, а не з клієнта.
    const service = await prisma.service.findUnique({ where: { id: String(serviceId ?? "") } });
    if (!service || !service.active) {
      return res.status(400).json({ error: "Послугу не знайдено." });
    }

    const when = new Date(date);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "Некоректна дата/час." });
    }

    // Мовою сайту на момент запису бот далі говоритиме з людиною в Telegram.
    const clientLang = normalizeLang(lang);

    const userId = normalizePhone(phone);
    const existing = await prisma.user.findUnique({ where: { id: userId } });

    // Профіль зареєстрованого користувача НЕ перезаписуємо анонімним записом.
    let user;
    if (!existing) {
      user = await prisma.user.create({
        data: {
          id: userId,
          role: "client",
          name: cleanName,
          phone: String(phone),
          telegram: normalizeTg(telegram) || null,
          lang: clientLang,
        },
      });
    } else if (!existing.passwordHash) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { name: cleanName, telegram: normalizeTg(telegram) || null, lang: clientLang },
      });
    } else {
      // Зареєстрований профіль не чіпаємо, крім мови — нею він щойно користувався.
      user = await prisma.user.update({ where: { id: userId }, data: { lang: clientLang } });
    }

    // Записатися з сайту можна лише на вільний слот. Немає його (уже зайняли, поки
    // людина заповнювала форму, або час довільний) — інакше вийшов би подвійний запис.
    const slot = await prisma.slot.findFirst({
      where: { serviceId: service.id, startsAt: when, booked: false },
    });
    if (!slot || when.getTime() <= Date.now()) {
      return res.status(409).json({ error: "Цей час уже зайняли. Оберіть, будь ласка, інший." });
    }

    // Запис спершу має підтвердити сам пацієнт у Telegram-боті (див. holds.js) — до того
    // слот тримається за ним CONFIRM_MIN хвилин, а лікаря не смикаємо.
    // Без бота (немає токена в .env) підтвердити нікуди — тоді запис іде лікарю одразу.
    const needsClientConfirm = botEnabled;

    // bookSlot атомарно займає слот (двоє, що натиснули одночасно, не отримають той самий час).
    const booking = await bookSlot(slot.id, {
      userId: user.id,
      clientName: cleanName,
      status: needsClientConfirm ? "pending_client" : "pending",
      holdUntil: needsClientConfirm ? holdDeadline() : null,
      source: "site",
    });
    if (!booking) {
      return res.status(409).json({ error: "Цей час уже зайняли. Оберіть, будь ласка, інший." });
    }

    const accountExists = !!existing?.passwordHash;

    if (needsClientConfirm) {
      // Людина вже колись відкривала бота — просимо підтвердити одразу, без посилання.
      const alreadyLinked = !!user.telegramChatId;
      if (alreadyLinked) {
        requestClientConfirmation(booking.id).catch((e) =>
          console.error("Не вдалося попросити пацієнта підтвердити запис:", e.message),
        );
      }
      return res.status(201).json({
        booking,
        accountExists,
        confirm: {
          holdMin: CONFIRM_MIN,
          holdUntil: booking.holdUntil,
          alreadyLinked,
          botUrl: botLink(`r_${booking.id}`),
        },
      });
    }

    // Бот вимкнено: запис одразу «pending», лікар побачить його в адмінці.
    // accountExists → чи має цей телефон уже акаунт із паролем (для UI на екрані "готово").
    res.status(201).json({ booking, accountExists, confirm: null });
  }),
);

// Стан запису для екрана «готово» на сайті: сторінка опитує його, поки пацієнт
// підтверджує запис у боті, а потім — поки лікар його розглядає.
// Публічно, але віддаємо лише статус (id запису — довгий випадковий cuid).
router.get(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: { status: true, holdUntil: true },
    });
    if (!booking) return res.status(404).json({ error: "Запис не знайдено." });
    res.json(booking);
  }),
);

// Мої записи (для кабінету). Тільки свої — за токеном.
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.auth.sub },
      orderBy: { date: "desc" },
    });
    res.json(bookings);
  }),
);

// Скасувати свій запис. Звільняє слот, якщо він був прив'язаний.
router.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.userId !== req.auth.sub) {
      return res.status(404).json({ error: "Запис не знайдено." });
    }

    // Завершений прийом скасувати не можна; повторне скасування — просто повертаємо як є.
    if (booking.status === "completed") {
      return res.status(409).json({ error: "Прийом уже відбувся — скасувати його не можна." });
    }
    if (booking.status === "canceled") return res.json(booking);

    // Лікар дізнається про запис лише після підтвердження пацієнтом — до того
    // повідомляти його про скасування нема чого.
    const ownerKnew = !["canceled", "pending_client"].includes(booking.status);
    const updated = await cancelBooking(booking.id);

    // Лікар має побачити, що час звільнився (раніше слот тихо ставав вільним).
    // Повторне скасування вже скасованого — мовчки, щоб не смикати лікаря двічі.
    if (ownerKnew) {
      notifyOwnerClientCanceled(booking.id, "site").catch((e) =>
        console.error("Не вдалося сповістити лікаря про скасування:", e.message),
      );
    }

    res.json(updated);
  }),
);

export default router;
