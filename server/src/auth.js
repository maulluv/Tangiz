// Авторизація: підпис/перевірка JWT та middleware для захищених роутів.
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES_IN = "30d";

// Токен для користувача (клієнта чи власника). У payload — id та роль.
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });
}

// Публічна форма користувача (без passwordHash!).
export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    telegram: u.telegram,
    role: u.role,
  };
}

// Вимагає валідний токен. Кладе розкодований payload у req.auth.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Потрібна авторизація." });
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Сесія недійсна. Увійдіть знову." });
  }
}

// Тільки для власника (використаємо у Фазі 3 для адмін-роутів).
export function requireOwner(req, res, next) {
  if (req.auth?.role !== "owner") {
    return res.status(403).json({ error: "Доступ лише для власника." });
  }
  next();
}
