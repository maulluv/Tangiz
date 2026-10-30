// Запис та вільні слоти через API.
import { apiGet, apiPost } from "@/lib/api";

// Вільні майбутні слоти: { s1: [ISO…], s2: [ISO…] }.
export function getAvailability() {
  return apiGet("/availability");
}

// Створити запис із сайту. Сервер сам порахує ціну й тривалість, позначить слот зайнятим.
// `lang` — мова сайту в момент запису: нею Telegram-бот далі пише нагадування й статуси.
// Повертає { booking, accountExists, confirm } — confirm (якщо бот увімкнено):
// { holdMin, holdUntil, alreadyLinked, botUrl } для кроку «підтвердьте в Telegram».
export function createBooking({ name, phone, telegram, serviceId, date, lang }) {
  return apiPost("/bookings", { name, phone, telegram, serviceId, date, lang });
}

// Статус запису ({ status, holdUntil }) — екран «готово» опитує його, поки пацієнт
// підтверджує запис у боті, а лікар — погоджує.
export function getBookingStatus(bookingId) {
  return apiGet(`/bookings/${bookingId}/status`);
}

// Мої записи (потрібен токен) — для кабінету.
export function getMyBookings() {
  return apiGet("/bookings/mine");
}

// Скасувати свій запис (потрібен токен).
export function cancelBooking(id) {
  return apiPost(`/bookings/${id}/cancel`);
}
