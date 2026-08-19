// Запис та вільні слоти через API.
import { apiGet, apiPost } from "@/lib/api";

// Вільні майбутні слоти: { s1: [ISO…], s2: [ISO…] }.
export function getAvailability() {
  return apiGet("/availability");
}

// Створити запис із сайту. Сервер сам порахує ціну й тривалість, позначить слот зайнятим.
// `lang` — мова сайту в момент запису: нею Telegram-бот далі пише нагадування й статуси.
// Повертає { booking, accountExists }.
export function createBooking({ name, phone, telegram, serviceId, date, lang }) {
  return apiPost("/bookings", { name, phone, telegram, serviceId, date, lang });
}

// Налаштування передоплати: { mode, holdMin, deposits: { s1: 200… } }.
// Суми рахує сервер, щоб формула депозиту жила в одному місці.
export function getPaymentConfig() {
  return apiGet("/payments/config");
}

// Статус запису після повернення з каси. Джерело правди — вебхук банку,
// тому сторінка повернення саме питає сервер, а не вірить редіректу.
export function getPaymentStatus(bookingId) {
  return apiGet(`/payments/status/${bookingId}`);
}

// Мої записи (потрібен токен) — для кабінету.
export function getMyBookings() {
  return apiGet("/bookings/mine");
}

// Скасувати свій запис (потрібен токен).
export function cancelBooking(id) {
  return apiPost(`/bookings/${id}/cancel`);
}
