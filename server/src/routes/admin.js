// Адмін-API (лише для власника): записи та клієнти.
// Усі роути нижче захищені requireAuth + requireOwner.
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, normalizePhone, normalizeTg, isValidPhone } from "../utils.js";
import { requireAuth, requireOwner } from "../auth.js";
import { listFutureSlots, createSlots, deleteFreeSlot, cancelBooking } from "../slotsLib.js";
import { notifyClientBookingStatus } from "../bot.js";

const router = Router();
router.use(requireAuth, requireOwner);

const STATUSES = ["pending", "confirmed", "completed", "canceled"];

// Booking(+user) → форма, яку очікують сторінки адмінки (з контактами клієнта).
function apptDTO(b) {
  return {
    id: b.id,
    clientId: b.userId,
    clientName: b.clientName,
    phone: b.user?.phone ?? null,
    telegram: b.user?.telegram ?? null,
    serviceId: b.serviceId,
    date: b.date,
    durationMin: b.durationMin,
    price: b.price,
    status: b.status,
    source: b.source,
    createdAt: b.createdAt,
  };
}

// --- Записи -----------------------------------------------------------

// Усі записи (найновіші зверху).
router.get(
  "/appointments",
  asyncHandler(async (req, res) => {
    const list = await prisma.booking.findMany({
      include: { user: true },
      orderBy: { date: "desc" },
    });
    res.json(list.map(apptDTO));
  }),
);

// Зміна статусу запису. Скасування звільняє прив'язаний слот.
router.patch(
  "/appointments/:id",
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: "Невідомий статус." });
    }
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Запис не знайдено." });

    if (status === "canceled") {
      await cancelBooking(booking.id); // звільняє слот і відв'язує його від запису
    } else {
      await prisma.booking.update({ where: { id: booking.id }, data: { status } });
    }
    // Пацієнту пишемо про підтвердження/скасування — так само, як із кнопок у боті
    // (сам notifyClientBookingStatus мовчить, якщо статус інший або бот вимкнено).
    if (status !== booking.status) {
      notifyClientBookingStatus(booking.id, status).catch((e) =>
        console.error("Не вдалося сповістити пацієнта:", e.message),
      );
    }

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { user: true },
    });
    res.json(apptDTO(updated));
  }),
);

// Ручне створення запису (з адмінки). Клієнт — існуючий (clientId) або новий.
router.post(
  "/appointments",
  asyncHandler(async (req, res) => {
    const { clientId, clientName, phone, telegram, serviceId, date, status, source } = req.body ?? {};

    const service = await prisma.service.findUnique({ where: { id: String(serviceId ?? "") } });
    if (!service) return res.status(400).json({ error: "Послугу не знайдено." });

    const when = new Date(date);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "Некоректна дата/час." });
    }
    const finalStatus = STATUSES.includes(status) ? status : "confirmed";

    // Визначаємо/створюємо клієнта.
    let user;
    if (clientId) {
      user = await prisma.user.findUnique({ where: { id: String(clientId) } });
      if (!user) return res.status(400).json({ error: "Клієнта не знайдено." });
    } else {
      const cleanName = String(clientName ?? "").trim();
      if (!cleanName) return res.status(400).json({ error: "Вкажіть ім'я клієнта." });
      if (phone && isValidPhone(phone)) {
        const id = normalizePhone(phone);
        user = await prisma.user.upsert({
          where: { id },
          create: { id, role: "client", name: cleanName, phone: String(phone), telegram: normalizeTg(telegram) || null },
          update: {},
        });
      } else {
        // Клієнт без телефону — генеруємо технічний id.
        user = await prisma.user.create({
          data: { id: crypto.randomUUID(), role: "client", name: cleanName, phone: null, telegram: normalizeTg(telegram) || null },
        });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        clientName: String(clientName ?? user.name).trim() || user.name,
        date: when,
        durationMin: service.durationMin,
        price: service.price,
        status: finalStatus,
        source: source || "phone",
      },
      include: { user: true },
    });
    res.status(201).json(apptDTO(booking));
  }),
);

// --- Клієнти ----------------------------------------------------------

function clientDTO(u) {
  return { id: u.id, name: u.name, phone: u.phone, telegram: u.telegram, createdAt: u.createdAt };
}

router.get(
  "/clients",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "client" },
      orderBy: { createdAt: "desc" },
    });
    res.json(users.map(clientDTO));
  }),
);

router.post(
  "/clients",
  asyncHandler(async (req, res) => {
    const { name, phone, telegram } = req.body ?? {};
    const cleanName = String(name ?? "").trim();
    if (!cleanName) return res.status(400).json({ error: "Вкажіть ім'я." });

    const id = phone && isValidPhone(phone) ? normalizePhone(phone) : crypto.randomUUID();
    const user = await prisma.user.upsert({
      where: { id },
      create: { id, role: "client", name: cleanName, phone: phone || null, telegram: normalizeTg(telegram) || null },
      update: { name: cleanName, telegram: normalizeTg(telegram) || null },
    });
    res.status(201).json(clientDTO(user));
  }),
);

router.patch(
  "/clients/:id",
  asyncHandler(async (req, res) => {
    const { name, phone, telegram } = req.body ?? {};
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "Клієнта не знайдено." });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? String(name).trim() : user.name,
        phone: phone !== undefined ? phone || null : user.phone,
        telegram: telegram !== undefined ? normalizeTg(telegram) || null : user.telegram,
      },
    });
    res.json(clientDTO(updated));
  }),
);

// --- Відгуки (модерація) ----------------------------------------------

// Видалити відгук (чистка спаму).
router.delete(
  "/reviews/:id",
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: "Відгук не знайдено." });
    await prisma.review.delete({ where: { id: review.id } });
    res.json({ ok: true });
  }),
);

// --- Вільні слоти (розклад) -------------------------------------------

function slotDTO(s) {
  return { id: s.id, serviceId: s.serviceId, startsAt: s.startsAt, booked: s.booked };
}

// Майбутні слоти (вільні й зайняті) — щоб власник бачив увесь розклад.
router.get(
  "/slots",
  asyncHandler(async (req, res) => {
    const slots = await listFutureSlots();
    res.json(slots.map(slotDTO));
  }),
);

// Додати слот(и): body { serviceId, startsAts: [ISO|"YYYY-MM-DDTHH:mm:ss"] }.
// Дублікати (та сама послуга+час) і минулі часи пропускаємо (див. slotsLib).
router.post(
  "/slots",
  asyncHandler(async (req, res) => {
    const { serviceId, startsAt, startsAts } = req.body ?? {};
    const service = await prisma.service.findUnique({ where: { id: String(serviceId ?? "") } });
    if (!service) return res.status(400).json({ error: "Послугу не знайдено." });

    const raw = startsAts ?? (startsAt ? [startsAt] : []);
    const dates = raw.map((s) => new Date(s));
    if (!dates.some((d) => !Number.isNaN(d.getTime()) && d.getTime() > Date.now())) {
      return res.status(400).json({ error: "Вкажіть коректну майбутню дату/час." });
    }

    const created = await createSlots(service.id, dates);
    res.status(201).json({ created: created.map(slotDTO) });
  }),
);

// Видалити слот. Зайнятий видалити не можна — спершу скасувати запис.
router.delete(
  "/slots/:id",
  asyncHandler(async (req, res) => {
    const result = await deleteFreeSlot(req.params.id);
    if (result.ok) return res.json({ ok: true });
    if (result.reason === "booked") {
      return res.status(409).json({ error: "Слот зайнятий. Спершу скасуйте запис." });
    }
    return res.status(404).json({ error: "Слот не знайдено." });
  }),
);

export default router;
