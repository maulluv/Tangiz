// Тимчасовий "бекенд" зареєстрованих клієнтів (поки що localStorage).
// Ключ акаунта — НОМЕР ТЕЛЕФОНУ (його знають усі, зокрема й похилі клієнти).
// Telegram-нік лишається опційним полем. Згодом замінимо на реальний бек.
const KEY = "tangiz.users";

// Нормалізуємо телефон до цифрового ключа у форматі 380XXXXXXXXX,
// щоб "+380 67…", "067…" і "67…" вважалися одним номером.
export function normalizePhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("380")) return digits;
  if (digits.startsWith("0")) return "380" + digits.slice(1);
  if (digits.length === 9) return "380" + digits;
  return digits;
}

// Маска для поля вводу: будь-який ввід → "+380 XX XXX XX XX".
// Порожнє повертаємо як "" (щоб показувався placeholder).
export function formatPhone(input) {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("380")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 9); // 9 цифр абонента після коду країни
  if (!d) return "";
  let out = "+380";
  if (d.length > 0) out += " " + d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += " " + d.slice(5, 7);
  if (d.length > 7) out += " " + d.slice(7, 9);
  return out;
}

// Повний український мобільний = 380 + 9 цифр.
export function isValidPhone(input) {
  const key = normalizePhone(input);
  return key.length === 12 && key.startsWith("380");
}

// Нормалізуємо Telegram-нік (опційне поле): порожній лишається порожнім.
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

export function findUser(phone) {
  const key = normalizePhone(phone);
  if (!key) return null;
  return readAll().find((u) => normalizePhone(u.phone) === key) || null;
}

export function registerUser({ phone, name, telegram, password }) {
  const key = normalizePhone(phone);
  const user = {
    id: key,
    phone: phone || "",
    name: name || "",
    telegram: normalizeTg(telegram),
    password,
    createdAt: new Date().toISOString(),
  };
  const list = readAll().filter((u) => normalizePhone(u.phone) !== key);
  writeAll([...list, user]);
  return user;
}

export function verifyUser(phone, password) {
  const u = findUser(phone);
  return u && u.password === password ? u : null;
}
