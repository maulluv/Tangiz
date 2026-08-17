// Адмін-дані через API (усі роути захищені токеном власника).
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// --- Записи ---
export const getAppointments = () => apiGet("/admin/appointments");
export const setAppointmentStatus = (id, status) =>
  apiPatch(`/admin/appointments/${id}`, { status });
export const addAppointment = (data) => apiPost("/admin/appointments", data);

// --- Вільні слоти (розклад) ---
export const getSlots = () => apiGet("/admin/slots");
export const addSlots = (serviceId, startsAts) =>
  apiPost("/admin/slots", { serviceId, startsAts });
export const deleteSlot = (id) => apiDelete(`/admin/slots/${id}`);

// --- Відгуки (модерація) ---
export const deleteReview = (id) => apiDelete(`/admin/reviews/${id}`);

// --- Клієнти ---
export const getClients = () => apiGet("/admin/clients");
export const addClient = (data) => apiPost("/admin/clients", data);
export const updateClient = (id, data) => apiPatch(`/admin/clients/${id}`, data);

// Статистика клієнта рахується наживо з записів (visits = завершені). Чиста функція.
export function clientStats(clientId, appts = []) {
  const mine = appts.filter((a) => a.clientId === clientId);
  const completed = mine.filter((a) => a.status === "completed");
  return {
    total: mine.length,
    visits: completed.length,
    spent: completed.reduce((s, a) => s + a.price, 0),
  };
}
