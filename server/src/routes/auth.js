// Авторизація: реєстрація/логін клієнта, логін власника, поточний користувач.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { asyncHandler, normalizePhone, normalizeTg, isValidPhone } from "../utils.js";
import { signToken, publicUser, requireAuth } from "../auth.js";

const router = Router();

// Реєстрація клієнта (або встановлення пароля на акаунт, створений під час запису).
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, phone, password, telegram } = req.body ?? {};
    const cleanName = String(name ?? "").trim();

    if (!cleanName) return res.status(400).json({ error: "Вкажіть ім'я." });
    if (!isValidPhone(phone)) return res.status(400).json({ error: "Некоректний номер телефону." });
    if (String(password ?? "").length < 4) {
      return res.status(400).json({ error: "Пароль має містити щонайменше 4 символи." });
    }

    const id = normalizePhone(phone);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing?.passwordHash) {
      return res.status(409).json({ error: "Акаунт із цим номером уже існує. Увійдіть." });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const data = {
      name: cleanName,
      phone: String(phone),
      telegram: normalizeTg(telegram) || null,
      passwordHash,
      role: "client",
    };
    // Якщо акаунт уже був (без пароля, з форми запису) — оновлюємо; інакше створюємо.
    const user = existing
      ? await prisma.user.update({ where: { id }, data })
      : await prisma.user.create({ data: { id, ...data } });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

// Логін клієнта: телефон + пароль.
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body ?? {};
    const id = normalizePhone(phone);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || !user.passwordHash || !bcrypt.compareSync(String(password ?? ""), user.passwordHash)) {
      return res.status(401).json({ error: "Невірний телефон або пароль." });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

// Логін власника: логін (username) + пароль.
router.post(
  "/owner-login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};
    const user = await prisma.user.findFirst({
      where: { username: String(username ?? "").trim(), role: "owner" },
    });

    if (!user || !user.passwordHash || !bcrypt.compareSync(String(password ?? ""), user.passwordHash)) {
      return res.status(401).json({ error: "Невірний логін або пароль." });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

// Поточний користувач за токеном (для відновлення сесії після перезавантаження).
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) return res.status(401).json({ error: "Користувача не знайдено." });
    res.json({ user: publicUser(user) });
  }),
);

export default router;
