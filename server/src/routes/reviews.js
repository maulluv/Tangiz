// Відгуки: GET (список) і POST (додати з сайту).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";

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

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, rating, serviceId, text } = req.body ?? {};
    const cleanName = String(name ?? "").trim();
    const cleanText = String(text ?? "").trim();
    const cleanRating = Number(rating);

    if (!cleanName || !cleanText) {
      return res.status(400).json({ error: "Ім'я та текст відгуку обов'язкові." });
    }
    if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ error: "Оцінка має бути від 1 до 5." });
    }

    // Користувач пише однією мовою — зберігаємо той самий текст в обидві.
    const review = await prisma.review.create({
      data: {
        name: cleanName,
        rating: cleanRating,
        serviceId: serviceId || null,
        textUk: cleanText,
        textEn: cleanText,
      },
    });
    res.status(201).json(toDTO(review));
  }),
);

export default router;
