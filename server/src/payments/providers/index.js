// Реєстр провайдерів оплати. Додати справжній = покласти поруч файл із такими самими
// двома методами й вписати його сюди; решта системи не змінюється.
//
// Контракт адаптера:
//   id                                   — рядок, потрапляє в Payment.provider;
//   createCheckout(payment, { returnUrl }) → URL каси, куди відправити людину;
//   verify(req) → { ok, paymentId, status: "paid"|"failed", ref } — перевірка ПІДПИСУ
//                 вебхука по сирому тілу (req.rawBody). Ніколи не довіряти редіректу.
//
// Наступні кроки, коли власник дасть дані (потрібні: банк ФОП, ключі, чи є ПРРО):
//   • liqpay.js — data/signature (base64 + SHA1), ПРРО безкоштовне для ПриватБанку;
//   • mono.js   — Monobank Acquiring, суми в КОПІЙКАХ, підпис X-Sign (ECDSA, публічний ключ).
import { mockProvider } from "./mock.js";
import { PAYMENT_PROVIDER } from "../config.js";

const PROVIDERS = { mock: mockProvider };

export function getProvider() {
  const p = PROVIDERS[PAYMENT_PROVIDER];
  if (!p) {
    throw new Error(
      `Невідомий PAYMENT_PROVIDER="${PAYMENT_PROVIDER}". Доступні: ${Object.keys(PROVIDERS).join(", ")}.`,
    );
  }
  return p;
}
