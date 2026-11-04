// Точка входу API-сервера TANGIZ.
// time.js — ПЕРШИМ імпортом: він виставляє часовий пояс клініки (CLINIC_TZ) для всього
// процесу, і зробити це треба до того, як інші модулі почнуть працювати з датами.
import { CLINIC_TZ } from "./time.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { startBot } from "./bot.js";
import { startHoldSweeper } from "./holds.js";

import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import clinicRouter from "./routes/clinic.js";
import servicesRouter from "./routes/services.js";
import availabilityRouter from "./routes/availability.js";
import reviewsRouter from "./routes/reviews.js";
import bookingsRouter from "./routes/bookings.js";

const app = express();

// Дозволяємо запити з фронтенду (Vite). Origin'и — зі змінної CORS_ORIGIN.
const origins = (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json());

// Перевірка «живий сервер».
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Роутери.
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/clinic", clinicRouter);
app.use("/api/services", servicesRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/bookings", bookingsRouter);

// 404 для невідомих /api-шляхів.
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// На робочому сервері той самий процес віддає і зібраний сайт (npm run build → dist/):
// один домен, без CORS. Усі не-файлові шляхи (/booking, /admin…) — index.html для роутера.
// У розробці dist/ зазвичай немає — тоді сайт віддає Vite.
const DIST = fileURLToPath(new URL("../../dist", import.meta.url));
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (req, res) => res.sendFile(join(DIST, "index.html")));
}

// Централізований обробник помилок (сюди потрапляють помилки з asyncHandler).
app.use((err, req, res, next) => {
  // Битий JSON у тілі запиту — помилка клієнта, а не сервера.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Некоректний запит." });
  }
  // Унікальне поле вже зайняте (напр. телефон, що є в іншого клієнта).
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Такі дані вже використовуються (напр. номер телефону)." });
  }
  console.error(err);
  res.status(500).json({ error: "Внутрішня помилка сервера." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 TANGIZ API на http://localhost:${PORT} (час клініки: ${CLINIC_TZ})`);
  startBot(); // без TELEGRAM_BOT_TOKEN — тихо вимкнено
  startHoldSweeper(); // знімає записи, які пацієнт не підтвердив у боті вчасно
});
