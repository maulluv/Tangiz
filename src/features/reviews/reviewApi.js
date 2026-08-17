// Відгуки через API. Форма даних збігається з тим, що очікують компоненти:
// { id, name, rating, serviceId?, text: { uk, en } }.
import { apiGet, apiPost } from "@/lib/api";

export function getReviews() {
  return apiGet("/reviews");
}

// Чи може залогінений клієнт залишити відгук + на яких послугах він був.
// { canReview: boolean, serviceIds: string[] }.
export function getReviewEligibility() {
  return apiGet("/reviews/eligibility");
}

// Додати відгук (потрібен токен клієнта; ім'я бере сервер із профілю).
export function addReview({ rating, serviceId, text }) {
  return apiPost("/reviews", { rating, serviceId, text });
}
