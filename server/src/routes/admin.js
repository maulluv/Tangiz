// Адмін-API (лише для власника): записи та клієнти.
// Усі роути нижче захищені requireAuth + requireOwner.
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, normalizePhone, normalizeTg, isValidPhone } from "../utils.js";
import { requireAuth, requireOwner } from "../auth.js";

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

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      include: { user: true },
    });
    if (status === "canceled" && booking.slotId) {
      await prisma.slot.update({ where: { id: booking.slotId }, data: { booked: false } });
    }
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

export default router;
