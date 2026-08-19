// Передоплата за запис: створення платежу, обробка вебхука, прибирання протухлих броней.
//
// Головне правило: статус платежу приходить ТІЛЬКИ вебхуком із перевіреним підписом.
// Повернення користувача в браузері нічого не підтверджує — цей редірект тривіально
// підробити, відкривши «сторінку успіху» вручну.
//
// Життєвий цикл запису з оплатою:
//   pending_payment (слот зайнято, holdUntil = +15 хв)
//        │ вебхук paid    → confirmed  (лікар і пацієнт отримують повідомлення)
//        │ вебхук failed  → canceled   (слот одразу вільний)
//        └ час вийшов     → canceled   (прибиральник щохвилини)
import { prisma } from "../db.js";
import { cancelBooking } from "../slotsLib.js";
import { getProvider } from "./providers/index.js";
import { HOLD_MIN, APP_URL, PAYMENT_PROVIDER, paymentsEnabled } from "./config.js";
import { notifyOwnerNewBooking, notifyClientBookingStatus, notifyOwnerPaymentIssue } from "../bot.js";

const SWEEP_MS = 60_000;
let sweeperTimer = null;

// Створити платіж і повернути посилання на касу. Викликається з routes/bookings.js
// одразу після створення запису в статусі pending_payment.
export async function startCheckout(booking, amount) {
  const provider = getProvider();
  const payment = await prisma.payment.create({
    data: { bookingId: booking.id, provider: PAYMENT_PROVIDER, amount, status: "pending" },
  });

  const returnUrl = `${APP_URL}/booking/return?booking=${booking.id}`;
  const checkoutUrl = await provider.createCheckout(payment, { returnUrl });
  return { payment, checkoutUrl };
}

// Обробка перевіреного вебхука. Ідемпотентна: банк має право надіслати його двічі.
export async function applyWebhook({ paymentId, status, ref }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });
  if (!payment) return { ok: false, reason: "unknown_payment" };
  if (payment.status === "paid") return { ok: true, alreadyHandled: true }; // дубль вебхука

  const booking = payment.booking;

  if (status !== "paid") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", providerRef: ref } });
    // Не оплатили — не тримаємо слот до кінця таймера, віддаємо його іншим одразу.
    if (booking.status === "pending_payment") await cancelBooking(booking.id);
    return { ok: true, status: "failed" };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "paid", providerRef: ref, paidAt: new Date() },
  });

  // Гроші прийшли, коли бронь уже зняли (людина платила довше за таймер, або лікар
  // скасував). Автоматично «воскрешати» запис не можна — слот міг піти іншому.
  if (booking.status === "canceled") {
    await notifyOwnerPaymentIssue(booking.id, payment.amount);
    return { ok: true, status: "paid_late" };
  }

  const confirmed = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "confirmed", holdUntil: null },
  });

  // Тепер запис реальний — саме тут лікар дізнається про нього вперше.
  await notifyOwnerNewBooking(confirmed, { paid: payment.amount });
  await notifyClientBookingStatus(confirmed.id, "confirmed");
  return { ok: true, status: "paid" };
}

// Протухлі брони: час вийшов, грошей немає — звільняємо слот.
export async function sweepExpiredHolds() {
  const stale = await prisma.booking.findMany({
    where: { status: "pending_payment", holdUntil: { lt: new Date() } },
  });
  for (const b of stale) {
    await cancelBooking(b.id);
    await prisma.payment.updateMany({
      where: { bookingId: b.id, status: "pending" },
      data: { status: "expired" },
    });
    console.log(`⌛ Бронь ${b.id.slice(-6)} протухла без оплати — слот звільнено.`);
  }
  return stale.length;
}

export function startPaymentSweeper() {
  if (!paymentsEnabled) {
    console.log("ℹ️  Передоплата вимкнена (PAYMENT_MODE=off).");
    return;
  }
  console.log(`💳 Передоплата: провайдер ${PAYMENT_PROVIDER}, бронь тримається ${HOLD_MIN} хв.`);
  sweepExpiredHolds().catch((e) => console.error("Помилка прибирання броней:", e.message));
  sweeperTimer = setInterval(
    () => sweepExpiredHolds().catch((e) => console.error("Помилка прибирання броней:", e.message)),
    SWEEP_MS,
  );
  sweeperTimer.unref?.();
}
