// Точка входу API-сервера TANGIZ.
import express from "express";
import cors from "cors";
import { startBot } from "./bot.js";

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

// Централізований обробник помилок (сюди потрапляють помилки з asyncHandler).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Внутрішня помилка сервера." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 TANGIZ API на http://localhost:${PORT}`);
  startBot(); // без TELEGRAM_BOT_TOKEN — тихо вимкнено
});
