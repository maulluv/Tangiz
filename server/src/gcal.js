// Синхронізація записів із Google Calendar лікаря.
//
// Лікар живе в Google Calendar, тож кожен запис (із сайту, бота чи адмінки) має
// з'являтися там сам: новий → подія, підтвердили/завершили → оновлюємо, скасували → видаляємо.
//
// Як підключено: сервісний акаунт Google (робот із власним email). Лікар відкриває
// доступ до свого календаря цьому email із правом «Вносити зміни в події» — і все.
// Жодних кнопок «Увійти через Google» і токенів, що протухають. Інструкція — у README.
//
// Змінні оточення (без них модуль тихо вимкнений):
//   GOOGLE_SERVICE_ACCOUNT — JSON-ключ сервісного акаунта (як є або в base64)
//   GOOGLE_CALENDAR_ID     — id календаря лікаря (для основного — його gmail-адреса)
//
// Як працює: раз на SYNC_MS прибиральник шукає записи, змінені після останньої звірки
// (updatedAt > gcalSyncedAt), і приводить подію у відповідність. Тож не важливо, хто й
// де змінив запис — точка синхронізації одна, і збій Google нічого не ламає: наступний
// прохід просто доробить.
import { createSign } from "node:crypto";
import { prisma } from "./db.js";
import { CLINIC_TZ, formatDateTime } from "./time.js";
import { serviceLabel } from "./botText.js";

const SYNC_MS = 30_000;
// Скільки днів у минуле підхоплювати записи при першому вмиканні (історію не заливаємо).
const BACKFILL_DAYS = 1;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3";

// pending_client — пацієнт ще не підтвердив запис у боті: у календар рано.
// canceled — події не має бути.
const SHOWN = ["pending", "confirmed", "completed", "no_show"];

// Кольори подій Google (colorId): видно статус, не відкриваючи подію.
const STATUS_VIEW = {
  pending: { colorId: "5", prefix: "⏳ ", label: "очікує підтвердження лікаря" }, // жовтий
  confirmed: { colorId: "10", prefix: "", label: "підтверджено" }, // зелений
  completed: { colorId: "8", prefix: "✔ ", label: "відбувся" }, // сірий
  no_show: { colorId: "11", prefix: "✖ ", label: "пацієнт не прийшов" }, // червоний
};
const SOURCE_LABEL = { site: "сайт", telegram: "Telegram-бот", phone: "адмінка / телефон" };

function readKey() {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const key = JSON.parse(json);
    if (!key.client_email || !key.private_key) throw new Error("немає client_email / private_key");
    return key;
  } catch (e) {
    console.error(`⚠️  GOOGLE_SERVICE_ACCOUNT не вдалося прочитати (${e.message}) — календар вимкнено.`);
    return null;
  }
}

const KEY = readKey();
const CALENDAR_ID = (process.env.GOOGLE_CALENDAR_ID || "").trim();
export const gcalEnabled = Boolean(KEY && CALENDAR_ID);

// --- Доступ до API -----------------------------------------------------

let token = null; // { value, exp }

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

// Сервісний акаунт сам підписує JWT своїм ключем і міняє його на access token (на годину).
async function accessToken() {
  if (token && token.exp - 60_000 > Date.now()) return token.value;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: "RS256", typ: "JWT" });
  const claims = b64url({ iss: KEY.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const signature = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(KEY.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${signature}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`Google auth ${res.status}: ${data.error_description || data.error || "?"}`);
    e.fatal = true;
    throw e;
  }
  token = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return token.value;
}

async function call(method, path, body) {
  const res = await fetch(`${API}/calendars/${encodeURIComponent(CALENDAR_ID)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

// fatal — проблема не в конкретному записі, а в доступі (ключ, права, неіснуючий календар,
// ліміт запитів): решту записів цього проходу не чіпаємо.
function apiError(r, fatal = r.status === 401 || r.status === 403) {
  const e = new Error(`Google Calendar ${r.status}: ${r.data?.error?.message || "?"}`);
  e.fatal = fatal;
  return e;
}

// --- Подія з запису ----------------------------------------------------

// Id події задаємо самі (Google дозволяє символи 0-9 a-v): той самий запис → та сама подія.
// Тож якщо подію створили, а зберегти id у БД не встигли, наступний прохід не зробить дубль.
const eventIdOf = (booking) => "tg" + Buffer.from(booking.id).toString("hex");

function eventBody(b) {
  const view = STATUS_VIEW[b.status] || STATUS_VIEW.pending;
  const service = (b.service?.nameUk || serviceLabel(b.serviceId, "uk")).trim();
  const start = new Date(b.date);
  const end = new Date(start.getTime() + (b.durationMin || 30) * 60_000);
  const lines = [
    `Пацієнт: ${b.clientName}`,
    b.user?.phone && `Телефон: ${b.user.phone}`,
    b.user?.telegram && `Telegram: ${b.user.telegram}`,
    `Послуга: ${service}${b.price ? ` — ${b.price} грн` : ""}`,
    `Статус: ${view.label}`,
    `Джерело: ${SOURCE_LABEL[b.source] || b.source}`,
    "",
    `Час: ${formatDateTime(start)}. Подію веде сайт: змінюйте статус у боті чи адмінці — тут оновиться саме.`,
  ];
  return {
    summary: `${view.prefix}${b.clientName} — ${service}`,
    description: lines.filter((l) => l !== null && l !== undefined && l !== false).join("\n"),
    start: { dateTime: start.toISOString(), timeZone: CLINIC_TZ },
    end: { dateTime: end.toISOString(), timeZone: CLINIC_TZ },
    colorId: view.colorId,
    extendedProperties: { private: { bookingId: b.id } },
  };
}

// Привести подію у відповідність запису. Повертає id події (або null, якщо її не має бути).
async function syncOne(b) {
  const id = b.gcalEventId || eventIdOf(b);

  if (!SHOWN.includes(b.status)) {
    if (!b.gcalEventId) return null; // події й не було
    const r = await call("DELETE", `/events/${id}`);
    // 404/410 — лікар уже прибрав її сам.
    if (!r.ok && r.status !== 404 && r.status !== 410) throw apiError(r);
    return null;
  }

  const body = eventBody(b);
  if (b.gcalEventId) {
    const r = await call("PATCH", `/events/${id}`, body);
    // Лікар видалив подію в календарі вручну — не нав'язуємо її знову.
    if (r.ok || r.status === 404 || r.status === 410) return id;
    throw apiError(r);
  }
  const r = await call("POST", "/events", { id, ...body });
  if (r.ok) return id;
  if (r.status === 409) {
    // Подія з цим id уже є (попередня спроба не встигла зберегтись) — оновлюємо її.
    const p = await call("PATCH", `/events/${id}`, body);
    if (p.ok) return id;
    throw apiError(p);
  }
  // 404 на створенні — календаря з таким id немає (або його не відкрили сервісному акаунту).
  throw apiError(r, r.status === 404 || undefined);
}

// --- Прибиральник ------------------------------------------------------

// Запис, що раз за разом падає (напр. Google відкидає дані), не смикаємо щопроходу.
const failures = new Map(); // bookingId → { count, until }
let running = false;
let lastAuthError = "";

export async function syncCalendar() {
  if (!gcalEnabled || running) return 0;
  running = true;
  try {
    const since = new Date(Date.now() - BACKFILL_DAYS * 86_400_000);
    const pending = await prisma.booking.findMany({
      where: {
        OR: [{ gcalSyncedAt: null }, { updatedAt: { gt: prisma.booking.fields.gcalSyncedAt } }],
        AND: [{ OR: [{ date: { gte: since } }, { gcalEventId: { not: null } }] }],
      },
      include: { user: true, service: true },
      orderBy: { date: "asc" },
      take: 50,
    });

    let done = 0;
    for (const b of pending) {
      const fail = failures.get(b.id);
      if (fail && fail.until > Date.now()) continue;
      let eventId;
      try {
        eventId = await syncOne(b);
      } catch (e) {
        if (e.fatal) {
          // Ключ/доступ зламано — немає сенсу пробувати решту записів.
          if (e.message !== lastAuthError) console.error(`📅 ${e.message}`);
          lastAuthError = e.message;
          break;
        }
        const count = (fail?.count || 0) + 1;
        failures.set(b.id, { count, until: Date.now() + Math.min(60, 2 ** count) * 60_000 });
        console.error(`📅 Запис ${b.id.slice(-6)} не потрапив у календар: ${e.message}`);
        continue;
      }
      failures.delete(b.id);
      lastAuthError = "";
      const t = new Date();
      // Умова на updatedAt: якщо запис змінили, поки ми говорили з Google, звірку не
      // зараховуємо — наступний прохід підхопить свіжу версію.
      const { count } = await prisma.booking.updateMany({
        where: { id: b.id, updatedAt: b.updatedAt },
        data: { gcalEventId: eventId, gcalSyncedAt: t, updatedAt: t },
      });
      if (!count) await prisma.booking.update({ where: { id: b.id }, data: { gcalEventId: eventId } });
      done++;
    }
    return done;
  } finally {
    running = false;
  }
}

export function startCalendarSync() {
  if (!gcalEnabled) {
    if (KEY || CALENDAR_ID) console.warn("⚠️  Для Google Calendar потрібні і GOOGLE_SERVICE_ACCOUNT, і GOOGLE_CALENDAR_ID.");
    return;
  }
  console.log(`📅 Google Calendar: записи синхронізуються в ${CALENDAR_ID}`);
  const run = () => syncCalendar().catch((e) => console.error("📅 Помилка синхронізації календаря:", e.message));
  run();
  setInterval(run, SYNC_MS).unref?.();
}
