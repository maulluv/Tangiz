// Відгуки через API. Форма даних збігається з тим, що очікують компоненти:
// { id, name, rating, serviceId?, text: { uk, en } }.
import { apiGet, apiPost } from "@/lib/api";

export function getReviews() {
  return apiGet("/reviews");
}

export function addReview({ name, rating, serviceId, text }) {
  return apiPost("/reviews", { name, rating, serviceId, text });
}
