// Спільна логіка відгуків — для сайту (routes/reviews.js) і бота (bot.js).
import { prisma } from "./db.js";

export const REVIEW_MAX_LEN = 2000;

// Послуги, на яких клієнт справді був: прийом завершено лікарем або підтверджений
// прийом уже минув (лікар не завжди тисне «Завершено» в адмінці — без цього людина,
// що була на прийомі, не змогла б залишити відгук).
export async function attendedServiceIds(userId) {
  const list = await prisma.booking.findMany({
    where: {
      userId,
      OR: [{ status: "completed" }, { status: "confirmed", date: { lt: new Date() } }],
    },
    select: { serviceId: true },
    orderBy: { date: "desc" },
  });
  return [...new Set(list.map((b) => b.serviceId))];
}

// Створити відгук від імені клієнта (ім'я — з профілю). Пишуть однією мовою — дублюємо.
export function createReview(user, { rating, serviceId, text, source }) {
  return prisma.review.create({
    data: {
      name: user.name,
      rating,
      serviceId: String(serviceId),
      textUk: text,
      textEn: text,
      source,
    },
  });
}
