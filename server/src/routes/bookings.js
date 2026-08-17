// Записи: створення з сайту (публічно) + перегляд/скасування своїх (за токеном).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, normalizePhone, normalizeTg, isValidPhone } from "../utils.js";
import { requireAuth } from "../auth.js";
import { notifyOwnerNewBooking } from "../bot.js";

const router = Router();

// Створити запис із сайту. Публічно (запис має бути без тертя — лише ім'я+телефон).
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, phone, telegram, serviceId, date } = req.body ?? {};

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
        },
      });
    } else if (!existing.passwordHash) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { name: cleanName, telegram: normalizeTg(telegram) || null },
      });
    } else {
      user = existing;
    }

    // Якщо це заброньований слот — знаходимо його й позначаємо зайнятим.
    const slot = await prisma.slot.findFirst({
      where: { serviceId: service.id, startsAt: when, booked: false },
    });

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        slotId: slot?.id ?? null,
        clientName: cleanName,
        date: when,
        durationMin: service.durationMin,
        price: service.price,
        status: "pending",
        source: "site",
      },
    });

    if (slot) {
      await prisma.slot.update({ where: { id: slot.id }, data: { booked: true } });
    }

    // Сповіщаємо власника в Telegram (не блокуючи відповідь; тихо ігноруємо помилки).
    notifyOwnerNewBooking(booking).catch((e) =>
      console.error("Не вдалося сповістити власника:", e.message),
    );

    // accountExists → чи має цей телефон уже акаунт із паролем (для UI на екрані "готово").
    res.status(201).json({ booking, accountExists: !!existing?.passwordHash });
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

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "canceled" },
    });
    if (booking.slotId) {
      await prisma.slot.update({ where: { id: booking.slotId }, data: { booked: false } });
    }
    res.json(updated);
  }),
);

export default router;
