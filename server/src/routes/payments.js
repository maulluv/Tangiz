// Маршрути оплати: вебхук провайдера, статус для сторінки повернення
// і тестова каса (лише коли PAYMENT_PROVIDER=mock).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";
import { getProvider } from "../payments/providers/index.js";
import { applyWebhook } from "../payments/index.js";
import { sign as mockSign } from "../payments/providers/mock.js";
import { API_URL, PAYMENT_PROVIDER, paymentPublicConfig, depositFor } from "../payments/config.js";

const router = Router();

// Публічні налаштування оплати для сторінки запису: режим, розмір передоплати
// по кожній послузі й скільки тримається бронь. Суму рахує сервер — щоб фронт
// не дублював формулу депозиту (а отже, не міг розійтися з нею).
router.get(
  "/config",
  asyncHandler(async (req, res) => {
    const services = await prisma.service.findMany({ where: { active: true } });
    const deposits = Object.fromEntries(services.map((s) => [s.id, depositFor(s.price)]));
    res.json({ ...paymentPublicConfig(), deposits });
  }),
);

// Вебхук провайдера — єдине джерело правди про гроші.
// Відповідаємо 200 навіть на «не наш» платіж: банки ретраять усе, що не 2xx.
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const verified = getProvider().verify(req);
    if (!verified.ok) {
      console.warn("Вебхук оплати з невірним підписом — ігноруємо.");
      return res.status(400).json({ error: "bad signature" });
    }
    const result = await applyWebhook(verified);
    res.json({ ok: true, ...result });
  }),
);

// Статус запису для сторінки «повертаємось із каси». Свідомо не віддаємо нічого зайвого:
// id запису — це cuid, який знає лише той, хто щойно записався.
router.get(
  "/status/:bookingId",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!booking) return res.status(404).json({ error: "Запис не знайдено." });
    res.json({
      status: booking.status,
      holdUntil: booking.holdUntil,
      payment: booking.payments[0]
        ? { status: booking.payments[0].status, amount: booking.payments[0].amount }
        : null,
    });
  }),
);

// ─── Тестова каса ─────────────────────────────────────────────────────────
// Замінник платіжної сторінки банку: дві кнопки, які надсилають підписаний вебхук
// на наш же /webhook. Живе лише поки PAYMENT_PROVIDER=mock.

const mockOnly = (req, res, next) =>
  PAYMENT_PROVIDER === "mock" ? next() : res.status(404).json({ error: "Not found" });

const page = (title, body) => `<!doctype html>
<html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
         background:#f6f7fb; color:#14161a; padding:24px; }
  @media (prefers-color-scheme: dark) { body { background:#0f1115; color:#e8eaed; } }
  .card { width:min(420px,100%); background:#fff; border-radius:16px; padding:24px;
          box-shadow:0 10px 30px rgba(0,0,0,.08); }
  @media (prefers-color-scheme: dark) { .card { background:#171a20; box-shadow:none; border:1px solid #2a2f38; } }
  .tag { display:inline-block; font-size:12px; font-weight:600; letter-spacing:.04em;
         text-transform:uppercase; color:#b26b00; background:#fff3d6; border-radius:999px; padding:4px 10px; }
  h1 { font-size:20px; margin:14px 0 4px; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; margin:18px 0 22px; font-size:14px; }
  dt { color:#6b7280; } dd { margin:0; font-weight:600; text-align:right; }
  .row { display:flex; gap:10px; flex-wrap:wrap; }
  button { flex:1 1 140px; border:0; border-radius:999px; padding:12px 18px; font:inherit;
           font-weight:600; cursor:pointer; }
  .pay { background:#0f9d58; color:#fff; } .fail { background:#eceff3; color:#14161a; }
  @media (prefers-color-scheme: dark) { .fail { background:#252a33; color:#e8eaed; } }
  p.note { font-size:13px; color:#6b7280; margin:16px 0 0; }
</style></head><body><div class="card">${body}</div></body></html>`;

router.get(
  "/mock/:id",
  mockOnly,
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });
    if (!payment) return res.status(404).send(page("Платіж не знайдено", "<h1>Платіж не знайдено</h1>"));

    const back = String(req.query.return || "/");
    const done = payment.status !== "pending";
    const body = `
      <span class="tag">Тестова каса</span>
      <h1>Передоплата за прийом</h1>
      <dl>
        <dt>Пацієнт</dt><dd>${payment.booking.clientName}</dd>
        <dt>До сплати</dt><dd>${payment.amount} грн</dd>
        <dt>Платіж</dt><dd>${payment.id.slice(-8)}</dd>
      </dl>
      ${
        done
          ? `<p class="note">Цей платіж уже має статус «${payment.status}». <a href="${back}">Повернутися на сайт</a>.</p>`
          : `<div class="row">
               <button class="pay" onclick="send('paid')">Оплатити ${payment.amount} грн</button>
               <button class="fail" onclick="send('failed')">Відхилити</button>
             </div>
             <p class="note">Справжніх грошей тут немає. Кнопка надсилає підписаний вебхук —
             рівно так само, як це зробить банк.</p>
             <script>
               async function send(result) {
                 document.querySelectorAll("button").forEach(b => b.disabled = true);
                 await fetch(location.pathname + "/complete", {
                   method: "POST", headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ result }),
                 });
                 location.href = ${JSON.stringify(back)};
               }
             </script>`
      }`;
    res.type("html").send(page("Тестова каса", body));
  }),
);

// Кнопка каси → підписаний вебхук на наш власний /webhook (той самий шлях, що й у банку).
router.post(
  "/mock/:id/complete",
  mockOnly,
  asyncHandler(async (req, res) => {
    const body = JSON.stringify({
      paymentId: req.params.id,
      status: req.body?.result === "paid" ? "paid" : "failed",
      transactionId: `mock_${Date.now()}`,
    });
    const hook = await fetch(`${API_URL}/api/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Payment-Signature": mockSign(body) },
      body,
    });
    res.json({ ok: hook.ok });
  }),
);

export default router;
