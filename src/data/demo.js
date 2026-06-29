// Демо-дані для адмінки (клієнти, записи, дохід). Згодом — із бекенду.
import { priceOf } from "./services";

export const clients = [
  { id: "c1", name: "Ірина Коваленко", phone: "+380 50 111 22 33", telegram: "@iryna_k", createdAt: "2026-01-12", visits: 4, totalSpent: 4200 },
  { id: "c2", name: "Андрій Бондар", phone: "+380 67 222 33 44", telegram: "@a_bondar", createdAt: "2026-02-03", visits: 2, totalSpent: 2000 },
  { id: "c3", name: "Олена Шевчук", phone: "+380 63 333 44 55", createdAt: "2026-02-21", visits: 1, totalSpent: 600 },
  { id: "c4", name: "Максим Ткаченко", phone: "+380 99 444 55 66", telegram: "@maxt", createdAt: "2026-03-15", visits: 6, totalSpent: 7400 },
  { id: "c5", name: "Наталія Мороз", phone: "+380 95 555 66 77", createdAt: "2026-04-02", visits: 3, totalSpent: 3300 },
  { id: "c6", name: "Дмитро Лисенко", phone: "+380 68 666 77 88", telegram: "@dlysenko", createdAt: "2026-05-19", visits: 1, totalSpent: 600 },
];

// service беремо через t(`service.${serviceId}`)
export const appointments = [
  { id: "a1", clientId: "c1", clientName: "Ірина Коваленко", serviceId: "s2", date: "2026-06-26T09:00:00", durationMin: 45, price: priceOf("s2"), status: "confirmed", source: "telegram" },
  { id: "a2", clientId: "c4", clientName: "Максим Ткаченко", serviceId: "s3", date: "2026-06-26T11:00:00", durationMin: 60, price: priceOf("s3"), status: "confirmed", source: "site" },
  { id: "a3", clientId: "c3", clientName: "Олена Шевчук", serviceId: "s1", date: "2026-06-26T13:30:00", durationMin: 30, price: priceOf("s1"), status: "pending", source: "telegram" },
  { id: "a4", clientId: "c2", clientName: "Андрій Бондар", serviceId: "s2", date: "2026-06-27T10:00:00", durationMin: 45, price: priceOf("s2"), status: "confirmed", source: "phone" },
  { id: "a5", clientId: "c5", clientName: "Наталія Мороз", serviceId: "s2", date: "2026-06-27T15:00:00", durationMin: 45, price: priceOf("s2"), status: "pending", source: "site" },
  { id: "a6", clientId: "c6", clientName: "Дмитро Лисенко", serviceId: "s1", date: "2026-06-24T12:00:00", durationMin: 30, price: priceOf("s1"), status: "completed", source: "telegram" },
  { id: "a7", clientId: "c1", clientName: "Ірина Коваленко", serviceId: "s3", date: "2026-06-23T16:00:00", durationMin: 60, price: priceOf("s3"), status: "completed", source: "telegram" },
  { id: "a8", clientId: "c4", clientName: "Максим Ткаченко", serviceId: "s2", date: "2026-06-22T09:30:00", durationMin: 45, price: priceOf("s2"), status: "canceled", source: "site" },
];

// month беремо через t(`month.${key}`)
export const revenueByMonth = [
  { key: "jan", value: 42000 },
  { key: "feb", value: 51000 },
  { key: "mar", value: 47500 },
  { key: "apr", value: 63000 },
  { key: "may", value: 58500 },
  { key: "jun", value: 71000 },
];
