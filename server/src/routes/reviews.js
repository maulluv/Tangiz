// Відгуки: GET (список) і POST (додати — лише після прийому, з акаунта).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";
import { requireAuth } from "../auth.js";
import { attendedServiceIds, createReview, REVIEW_MAX_LEN } from "../reviewsLib.js";
import { notifyOwnerNewReview } from "../bot.js";

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
    const serviceIds = await attendedServiceIds(req.auth.sub);
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
    if (cleanText.length > REVIEW_MAX_LEN) {
      return res.status(400).json({ error: `Відгук задовгий (до ${REVIEW_MAX_LEN} символів).` });
    }
    if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ error: "Оцінка має бути від 1 до 5." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) return res.status(401).json({ error: "Користувача не знайдено." });

    // Послуги, на яких клієнт був (див. reviewsLib.attendedServiceIds).
    const attended = await attendedServiceIds(user.id);
    if (attended.length === 0) {
      return res.status(403).json({ error: "Відгук можна залишити лише після прийому." });
    }
    if (!serviceId || !attended.includes(String(serviceId))) {
      return res.status(403).json({ error: "Оберіть послугу, на якій ви були." });
    }

    const review = await createReview(user, {
      rating: cleanRating,
      serviceId,
      text: cleanText,
      source: "site",
    });
    // Лікар дізнається про кожен новий відгук у боті (з кнопкою «прибрати з сайту»).
    notifyOwnerNewReview(review.id, user.id).catch((e) =>
      console.error("Не вдалося сповістити лікаря про відгук:", e.description || e.message),
    );
    res.status(201).json(toDTO(review));
  }),
);

export default router;
