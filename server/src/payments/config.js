// Налаштування передоплати. Усе — зі змінних оточення, щоб перемкнути режим або суму
// без правок коду (реальні цифри дасть власник; поки що працює тестовий провайдер).
//
//   PAYMENT_MODE      off | optional | required   — чи потрібна передоплата для запису
//   PAYMENT_PROVIDER  mock | (згодом liqpay | mono)
//   PAYMENT_DEPOSIT_TYPE   fixed | percent | full
//   PAYMENT_DEPOSIT_VALUE  сума в гривнях (fixed) або відсоток (percent)
//   PAYMENT_HOLD_MIN       скільки хвилин тримаємо слот, поки людина платить
//   APP_URL                публічна адреса сайту — куди повертати з каси

const MODES = ["off", "optional", "required"];
const raw = (name, fallback) => (process.env[name] ?? fallback).toString().trim();

export const PAYMENT_MODE = MODES.includes(raw("PAYMENT_MODE", "off"))
  ? raw("PAYMENT_MODE", "off")
  : "off";
export const PAYMENT_PROVIDER = raw("PAYMENT_PROVIDER", "mock");
export const HOLD_MIN = Math.max(1, Number(raw("PAYMENT_HOLD_MIN", "15")) || 15);
export const APP_URL = raw("APP_URL", "http://localhost:5173").replace(/\/$/, "");
export const API_URL = raw("API_URL", `http://localhost:${raw("PORT", "4000")}`).replace(/\/$/, "");

export const paymentsEnabled = PAYMENT_MODE !== "off";
export const paymentRequired = PAYMENT_MODE === "required";

const DEPOSIT_TYPE = ["fixed", "percent", "full"].includes(raw("PAYMENT_DEPOSIT_TYPE", "fixed"))
  ? raw("PAYMENT_DEPOSIT_TYPE", "fixed")
  : "fixed";
const DEPOSIT_VALUE = Number(raw("PAYMENT_DEPOSIT_VALUE", "200")) || 0;

// Скільки платимо наперед за конкретну послугу (гривні, ціле число).
// Передоплата ніколи не більша за саму послугу — інакше «депозит» перетворюється на переплату.
export function depositFor(price) {
  if (!paymentsEnabled) return 0;
  if (DEPOSIT_TYPE === "full") return price;
  const value = DEPOSIT_TYPE === "percent" ? Math.round((price * DEPOSIT_VALUE) / 100) : DEPOSIT_VALUE;
  return Math.max(0, Math.min(price, value));
}

// Для фронта: /api/clinic/payment-info — щоб сторінка запису знала суму й режим.
export const paymentPublicConfig = () => ({
  mode: PAYMENT_MODE,
  depositType: DEPOSIT_TYPE,
  depositValue: DEPOSIT_VALUE,
  holdMin: HOLD_MIN,
});
