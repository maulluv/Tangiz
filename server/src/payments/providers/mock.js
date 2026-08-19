// Тестовий («пісочниця») провайдер оплати. Грошей не рухає: замість каси банку відкриває
// нашу ж сторінку з двома кнопками — «Оплатити» і «Відхилити».
//
// Навіщо він, якщо однаково буде справжній: цей адаптер проходить рівно той самий шлях,
// що й банківський — створення платежу → каса → ВЕБХУК ІЗ ПІДПИСОМ → зміна статусу.
// Тож коли власник дасть реквізити, міняється лише цей файл, а не потік.
import crypto from "node:crypto";
import { API_URL } from "../config.js";

const SECRET = (process.env.PAYMENT_MOCK_SECRET || "dev-mock-secret").trim();

// Підпис такий самий за формою, як у LiqPay/monobank: HMAC по СИРОМУ тілу запиту.
export const sign = (rawBody) =>
  crypto.createHmac("sha256", SECRET).update(rawBody).digest("base64");

export const mockProvider = {
  id: "mock",

  // Куди відправити людину платити. Реальний адаптер тут робить запит до API банку
  // й повертає його checkout-URL.
  async createCheckout(payment, { returnUrl }) {
    const url = new URL(`${API_URL}/api/payments/mock/${payment.id}`);
    url.searchParams.set("return", returnUrl);
    return url.toString();
  },

  // Перевірка вебхука. Повертає { ok, paymentId, status, ref } — далі payments/index.js
  // однаково обробляє будь-якого провайдера.
  verify(req) {
    const rawBody = req.rawBody?.toString("utf8") ?? "";
    const given = req.get("X-Payment-Signature") ?? "";
    const expected = sign(rawBody);
    // timingSafeEqual падає на різній довжині — звідси попередня перевірка.
    const ok =
      given.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) return { ok: false, reason: "bad_signature" };

    const body = req.body ?? {};
    return {
      ok: true,
      paymentId: String(body.paymentId ?? ""),
      status: body.status === "paid" ? "paid" : "failed",
      ref: body.transactionId ? String(body.transactionId) : null,
    };
  },
};
