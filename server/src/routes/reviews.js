// Відгуки: GET (список) і POST (додати — лише після прийому, з акаунта).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";
import { requireAuth } from "../auth.js";

const router = Router();

// DB-рядок → форма, яку очікує фронт (text: { uk, en }).
function toDTO(r) {
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    serviceId: r.serviceId ?? undefined,
    text: { uk: r.textUk, en: r.textEn },
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const list = await prisma.review.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(list.map(toDTO));
  }),
);

// Список послуг, на яких залогінений клієнт БУВ (завершені прийоми).
// Фронт бере звідси варіанти для селекта у формі відгуку.
router.get(
  "/eligibility",
  requireAuth,
  asyncHandler(async (req, res) => {
    const completed = await prisma.booking.findMany({
      where: { userId: req.auth.sub, status: "completed" },
      select: { serviceId: true },
    });
    const serviceIds = [...new Set(completed.map((b) => b.serviceId))];
    res.json({ canReview: serviceIds.length > 0, serviceIds });
  }),
);

// Додати відгук. Лише авторизований клієнт, який БУВ на прийомі (завершений запис).
// Ім'я беремо з профілю; послуга — з тих, на яких клієнт був.
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rating, serviceId, text } = req.body ?? {};
    const cleanText = String(text ?? "").trim();
    const cleanRating = Number(rating);

    if (!cleanText) return res.status(400).json({ error: "Текст відгуку обов'язковий." });
    if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ error: "Оцінка має бути від 1 до 5." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) return res.status(401).json({ error: "Користувача не знайдено." });

    // Послуги із завершених прийомів клієнта.
    const completed = await prisma.booking.findMany({
      where: { userId: user.id, status: "completed" },
      select: { serviceId: true },
    });
    const attended = [...new Set(completed.map((b) => b.serviceId))];
    if (attended.length === 0) {
      return res.status(403).json({ error: "Відгук можна залишити лише після прийому." });
    }
    if (!serviceId || !attended.includes(String(serviceId))) {
      return res.status(403).json({ error: "Оберіть послугу, на якій ви були." });
    }

    const review = await prisma.review.create({
      data: {
        name: user.name,
        rating: cleanRating,
        serviceId: String(serviceId),
        textUk: cleanText,
        textEn: cleanText,
      },
    });
    res.status(201).json(toDTO(review));
  }),
);

export default router;
