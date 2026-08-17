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

// Видалити вільний слот. Зайнятий видалити не можна.
// Повертає { ok } або { ok:false, reason: "not_found" | "booked" }.
export async function deleteFreeSlot(id) {
  const slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot) return { ok: false, reason: "not_found" };
  if (slot.booked) return { ok: false, reason: "booked" };
  await prisma.slot.delete({ where: { id } });
  return { ok: true };
}
