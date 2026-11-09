// Адмін-дані через API (усі роути захищені токеном власника).
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// --- Записи ---
// Подія для тих, хто показує похідні цифри (лічильник «Очікують» у меню адмінки).
export const APPTS_CHANGED = "tangiz:appointments-changed";
const changed = (res) => {
  window.dispatchEvent(new Event(APPTS_CHANGED));
  return res;
};
export const getAppointments = () => apiGet("/admin/appointments");
export const setAppointmentStatus = (id, status) =>
  apiPatch(`/admin/appointments/${id}`, { status }).then(changed);
export const addAppointment = (data) => apiPost("/admin/appointments", data).then(changed);

// --- Вільні слоти (розклад) ---
export const getSlots = () => apiGet("/admin/slots");
export const addSlots = (serviceId, startsAts) =>
  apiPost("/admin/slots", { serviceId, startsAts });
export const deleteSlot = (id) => apiDelete(`/admin/slots/${id}`);

// --- Відгуки (модерація) ---
export const getAdminReviews = () => apiGet("/admin/reviews");
export const deleteReview = (id) => apiDelete(`/admin/reviews/${id}`);

// --- Клієнти ---
export const getClients = () => apiGet("/admin/clients");
export const addClient = (data) => apiPost("/admin/clients", data);
export const updateClient = (id, data) => apiPatch(`/admin/clients/${id}`, data);

// --- Правила для статистики (чисті функції) ---
export const isPast = (a) => +new Date(a.date) < Date.now();
// Прийом відбувся: лікар позначив «Завершено» АБО підтверджений час уже минув.
// Лікар не завжди тисне «Завершено» — без цього дохід і візити показували б нуль.
// Так само рахує сервер, коли вирішує, чи можна залишити відгук (reviewsLib.js).
export const isDone = (a) => a.status === "completed" || (a.status === "confirmed" && isPast(a));
// Минулий запис без позначки, чи відбувся він (за останні MARK_WINDOW_DAYS днів).
const MARK_WINDOW_DAYS = 30;
export const needsMark = (a) =>
  (a.status === "pending" || a.status === "confirmed") &&
  isPast(a) &&
  Date.now() - +new Date(a.date) < MARK_WINDOW_DAYS * 864e5;
// Активний майбутній запис (чекає лікаря або підтверджений).
export const isUpcoming = (a) => (a.status === "pending" || a.status === "confirmed") && !isPast(a);

export const isNoShow = (a) => a.status === "no_show";

// Статистика клієнта рахується наживо з записів. Чиста функція.
export function clientStats(clientId, appts = []) {
  const mine = appts.filter((a) => a.clientId === clientId);
  const done = mine.filter(isDone);
  return {
    total: mine.length,
    visits: done.length,
    noShows: mine.filter(isNoShow).length,
    spent: done.reduce((s, a) => s + a.price, 0),
  };
}
