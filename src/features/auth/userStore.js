// Тимчасовий "бекенд" зареєстрованих клієнтів (поки що localStorage).
// Ключ акаунта — Telegram-нік. Згодом замінимо на реальний бек + Telegram-бот.
const KEY = "tangiz.users";

export function normalizeTg(tg) {
  let s = (tg || "").trim().toLowerCase();
  if (!s) return "";
  if (!s.startsWith("@")) s = "@" + s;
  return s;
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function findUser(telegram) {
  const t = normalizeTg(telegram);
  if (!t) return null;
  return readAll().find((u) => u.telegram === t) || null;
}

export function registerUser({ telegram, name, phone, password }) {
  const t = normalizeTg(telegram);
  const user = {
    telegram: t,
    name: name || "",
    phone: phone || "",
    password,
    createdAt: new Date().toISOString(),
  };
  const list = readAll().filter((u) => u.telegram !== t);
  writeAll([...list, user]);
  return user;
}

export function verifyUser(telegram, password) {
  const u = findUser(telegram);
  return u && u.password === password ? u : null;
}
