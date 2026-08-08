// Спільні хелпери (та сама логіка, що й на фронті — щоб ключі збігалися).

// Телефон → цифровий ключ 380XXXXXXXXX. "+380 67…", "067…", "67…" → один ключ.
export function normalizePhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("380")) return digits;
  if (digits.startsWith("0")) return "380" + digits.slice(1);
  if (digits.length === 9) return "380" + digits;
  return digits;
}

// Повний український мобільний = 380 + 9 цифр.
export function isValidPhone(input) {
  const key = normalizePhone(input);
  return key.length === 12 && key.startsWith("380");
}

// Telegram-нік: порожній лишається порожнім, інакше гарантуємо "@".
export function normalizeTg(tg) {
  let s = (tg || "").trim().toLowerCase();
  if (!s) return "";
  if (!s.startsWith("@")) s = "@" + s;
  return s;
}

// Обгортка для async-роутів: ловить помилки й віддає їх у next() (централізований обробник).
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
