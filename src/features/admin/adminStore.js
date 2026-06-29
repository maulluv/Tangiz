// Стор адмінки: записи та клієнти з персистом у localStorage.
// На перший запуск сідимо демо-даними, далі працюємо з localStorage,
// тож зміни статусів і нові записи зберігаються між сесіями.
// Згодом це замінить реальний бекенд / спільна БД з Telegram-ботом.
import { appointments as demoAppointments, clients as demoClients } from "@/data";

const APPTS_KEY = "tangiz.admin.appointments";
const CLIENTS_KEY = "tangiz.admin.clients";

function read(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* пошкоджені дані — пересідимо нижче */
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function write(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// --- Записи ------------------------------------------------------------
export function getAppointments() {
  return read(APPTS_KEY, demoAppointments);
}

export function addAppointment(data) {
  const appt = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  write(APPTS_KEY, [...getAppointments(), appt]);
  return appt;
}

export function setAppointmentStatus(id, status) {
  const list = getAppointments().map((a) =>
    a.id === id ? { ...a, status } : a,
  );
  write(APPTS_KEY, list);
  return list;
}

// --- Клієнти -----------------------------------------------------------
export function getClients() {
  return read(CLIENTS_KEY, demoClients);
}

export function addClient(data) {
  const client = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().slice(0, 10),
    ...data,
  };
  write(CLIENTS_KEY, [...getClients(), client]);
  return client;
}

export function updateClient(id, data) {
  const list = getClients().map((c) => (c.id === id ? { ...c, ...data } : c));
  write(CLIENTS_KEY, list);
  return list;
}

// Статистика клієнта рахується наживо з записів (visits = завершені).
export function clientStats(clientId, appts = getAppointments()) {
  const mine = appts.filter((a) => a.clientId === clientId);
  const completed = mine.filter((a) => a.status === "completed");
  return {
    total: mine.length,
    visits: completed.length,
    spent: completed.reduce((s, a) => s + a.price, 0),
  };
}
