// Підтвердження запису пацієнтом у Telegram.
//
// Запис із сайту не йде лікарю одразу: спершу пацієнт має відкрити бота й натиснути
// «Підтверджую». Це відсіює випадкові й «про всяк випадок» записи, а заразом гарантує,
// що бот зможе писати людині (нагадування, рішення лікаря).
//
// Життєвий цикл:
//   pending_client (слот зайнято, holdUntil = +CONFIRM_MIN хв)
//        │ пацієнт ✅ у боті → pending   (лікар отримує запис із кнопками ✅/❌)
//        │ пацієнт ❌ у боті → canceled  (слот одразу вільний)
//        └ час вийшов        → canceled  (прибиральник щохвилини)
import { prisma } from "./db.js";
import { cancelBooking } from "./slotsLib.js";
import { notifyClientHoldExpired } from "./bot.js";

// Скільки хвилин слот тримається за пацієнтом, поки той підтверджує запис у боті.
export const CONFIRM_MIN = Math.max(5, Number(process.env.BOOKING_CONFIRM_MIN) || 30);

const SWEEP_MS = 60_000;
let sweeperTimer = null;

export const holdDeadline = () => new Date(Date.now() + CONFIRM_MIN * 60_000);

// Непідтверджені вчасно записи: скасовуємо й повертаємо час у вільні.
export async function sweepExpiredHolds() {
  const stale = await prisma.booking.findMany({
    where: { status: "pending_client", holdUntil: { lt: new Date() } },
  });
  for (const b of stale) {
    await cancelBooking(b.id);
    await notifyClientHoldExpired(b.id).catch(() => {});
    console.log(`⌛ Запис ${b.id.slice(-6)} не підтверджено в боті — слот звільнено.`);
  }
  return stale.length;
}

export function startHoldSweeper() {
  const run = () =>
    sweepExpiredHolds().catch((e) => console.error("Помилка прибирання броней:", e.message));
  run();
  sweeperTimer = setInterval(run, SWEEP_MS);
  sweeperTimer.unref?.();
}
