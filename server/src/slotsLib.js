// Спільна логіка вільних слотів — використовується і сайтом (routes/admin.js),
// і ботом (bot.js), щоб правила були однакові незалежно від джерела.
import { prisma } from "./db.js";

// Майбутні слоти (вільні й зайняті), найраніші зверху.
export function listFutureSlots() {
  return prisma.slot.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
}

// Створити слоти. `dates` — масив Date. Пропускає минулі й дублікати (та сама послуга+час).
// Повертає масив реально створених слотів.
export async function createSlots(serviceId, dates) {
  const now = Date.now();
  const valid = dates.filter(
    (d) => d instanceof Date && !Number.isNaN(d.getTime()) && d.getTime() > now,
  );
  const created = [];
  for (const d of valid) {
    const exists = await prisma.slot.findFirst({ where: { serviceId, startsAt: d } });
    if (exists) continue;
    created.push(await prisma.slot.create({ data: { serviceId, startsAt: d } }));
  }
  return created;
}

// Скасувати запис: статус → "canceled" і, якщо був прив'язаний слот, звільнити його.
// Разом зі `booked: false` ОБОВ'ЯЗКОВО прибираємо `slotId` із запису: поле унікальне,
// тож інакше слот виглядає вільним, але зайняти його вже не вдасться (P2002).
// Обидві зміни в одній транзакції — щоб слот не «завис» напівзвільненим.
export async function cancelBooking(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      // holdUntil прибираємо разом зі слотом: скасований запис нічого не тримає.
      data: { status: "canceled", slotId: null, holdUntil: null },
    }),
    ...(booking.slotId
      ? [prisma.slot.update({ where: { id: booking.slotId }, data: { booked: false } })]
      : []),
  ]);
  return updated;
}

// Видалити вільний слот. Зайнятий видалити не можна.
// Повертає { ok } або { ok:false, reason: "not_found" | "booked" }.
export async function deleteFreeSlot(id) {
  const slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot) return { ok: false, reason: "not_found" };
  if (slot.booked) return { ok: false, reason: "booked" };
  await prisma.slot.delete({ where: { id } });
  return { ok: true };
}

// Зайняти вільний слот записом — спільно для сайту (routes/bookings.js) і бота.
// Слот «захоплюємо» умовним updateMany (booked: false → true) в одній транзакції зі
// створенням запису: двоє, що натиснули одночасно, не отримають той самий час.
// Повертає запис або null, якщо слот уже зайняли (чи він минув).
// data — поля Booking без slot/service-похідних: userId, clientName, status, holdUntil, source.
export async function bookSlot(slotId, data) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { service: true } });
  if (!slot || slot.booked || slot.startsAt.getTime() <= Date.now() || !slot.service?.active) return null;
  try {
    return await prisma.$transaction(async (tx) => {
      const { count } = await tx.slot.updateMany({ where: { id: slot.id, booked: false }, data: { booked: true } });
      if (!count) throw new SlotTaken();
      return tx.booking.create({
        data: {
          ...data,
          serviceId: slot.serviceId,
          slotId: slot.id,
          date: slot.startsAt,
          // Ціну й тривалість — з БД, а не від клієнта.
          durationMin: slot.service.durationMin,
          price: slot.service.price,
        },
      });
    });
  } catch (e) {
    // P2002 по slotId — слот уже прив'язаний до іншого запису.
    if (e instanceof SlotTaken || e.code === "P2002") return null;
    throw e;
  }
}
class SlotTaken extends Error {}
