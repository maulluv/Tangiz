// Налаштування «косметики» бота в Telegram: назва, описи, меню команд.
// Це єдине джерело правди — те саме застосується і до тестового, і до робочого бота.
// Логіку бота (команди, кнопки, слоти) тут не змінюємо — вона у src/bot.js.
//
// Запуск:  npm run bot:setup           — застосувати
//          npm run bot:setup -- --dry  — лише показати різницю, нічого не писати
//          npm run bot:setup -- --name — ще й перейменувати бота (для тестового зазвичай не треба)
import { prisma } from "../src/db.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DRY = process.argv.includes("--dry") || process.argv.includes("--dry-run");
// Назву чіпаємо лише за явним проханням: у тестового бота вона своя («TANGIZ dev»),
// та й Telegram сильно обмежує частоту перейменувань.
const WITH_NAME = process.argv.includes("--name");

if (!TOKEN) {
  console.log("❌ Немає TELEGRAM_BOT_TOKEN у .env — додайте токен від @BotFather і повторіть.");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// ЩО ВИСТАВЛЯЄМО. Правити тільки тут.
// ─────────────────────────────────────────────────────────────
const SETTINGS = {
  // Відображувана назва бота (BotFather: /setname). Telegram сильно лімітує зміни назви.
  name: "TANGIZ — записи",

  // Текст на порожньому екрані чату, до першого /start (до 512 символів).
  // Його бачать усі, тому він суто для пацієнтів — лікар отримає свою інструкцію
  // у відповіді на /start, поки бот ще не прив'язаний (див. bot.js).
  description:
    "Бот клініки TANGIZ.\n\n" +
    "Записатися на прийом найзручніше на сайті — там видно всі вільні години.\n\n" +
    "Можете також написати сюди: лікар отримає ваше повідомлення й відповість.",

  // Короткий опис у профілі бота (до 120 символів).
  shortDescription: "Записи на прийом до лікаря та повідомлення клініки TANGIZ.",

  // Меню команд для всіх (пацієнтів). Команди лікаря тут НЕ показуємо.
  publicCommands: [{ command: "start", description: "Про бота й як записатися" }],

  // Меню команд лише в чаті лікаря — застосується, якщо власник уже зробив /bind.
  ownerCommands: [
    { command: "add", description: "Додати вільні години" },
    { command: "slots", description: "Вільні слоти — переглянути й видалити" },
    { command: "bind", description: "Прив'язати цей чат (потрібен пароль)" },
    { command: "start", description: "Про бота" },
  ],
};

const api = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
};

// Читання поточного значення; якщо метод недоступний — повертаємо null, не падаємо.
const read = async (method, body) => {
  try {
    return await api(method, body);
  } catch {
    return null;
  }
};

const sameCommands = (a, b) =>
  JSON.stringify((a ?? []).map((c) => [c.command, c.description])) ===
  JSON.stringify((b ?? []).map((c) => [c.command, c.description]));

// Застосовує одне налаштування: пропускає, якщо вже таке саме; у --dry лише показує.
async function apply(label, current, desired, method, body) {
  const unchanged = typeof desired === "string" ? current === desired : sameCommands(current, desired);
  if (unchanged) {
    console.log(`= ${label}: вже актуально`);
    return;
  }
  if (DRY) {
    console.log(`~ ${label}: ЗМІНИЛОСЬ БИ\n    було:  ${JSON.stringify(current)}\n    стало: ${JSON.stringify(desired)}`);
    return;
  }
  try {
    await api(method, body);
    console.log(`✓ ${label}: оновлено`);
  } catch (e) {
    // Найчастіше це ліміт Telegram на зміну назви — не причина валити весь скрипт.
    console.log(`⚠️  ${label}: не вдалося — ${e.message}`);
  }
}

try {
  const me = await api("getMe");
  console.log(`Бот: @${me.username} (${me.first_name})${DRY ? "  [DRY RUN — нічого не пишемо]" : ""}\n`);

  const [name, desc, shortDesc, publicCmds] = await Promise.all([
    read("getMyName"),
    read("getMyDescription"),
    read("getMyShortDescription"),
    read("getMyCommands", { scope: { type: "default" } }),
  ]);

  if (WITH_NAME) {
    await apply("Назва", name?.name, SETTINGS.name, "setMyName", { name: SETTINGS.name });
  } else {
    console.log(`… Назва: лишаємо «${name?.name}» (змінити — запуск із --name)`);
  }
  await apply("Опис", desc?.description, SETTINGS.description, "setMyDescription", {
    description: SETTINGS.description,
  });
  await apply("Короткий опис", shortDesc?.short_description, SETTINGS.shortDescription, "setMyShortDescription", {
    short_description: SETTINGS.shortDescription,
  });
  await apply("Команди (усі)", publicCmds, SETTINGS.publicCommands, "setMyCommands", {
    commands: SETTINGS.publicCommands,
    scope: { type: "default" },
  });

  // Команди лікаря — окремою областю видимості, лише для його чату.
  const owner = await prisma.user.findFirst({ where: { role: "owner" } });
  if (owner?.telegramChatId) {
    const scope = { type: "chat", chat_id: owner.telegramChatId };
    const ownerCmds = await read("getMyCommands", { scope });
    await apply("Команди (чат лікаря)", ownerCmds, SETTINGS.ownerCommands, "setMyCommands", {
      commands: SETTINGS.ownerCommands,
      scope,
    });
  } else {
    console.log("… Команди (чат лікаря): пропущено — лікар ще не зробив /bind. Запустіть скрипт ще раз після цього.");
  }

  const menu = await read("getChatMenuButton");
  await apply("Кнопка меню", menu?.type, "commands", "setChatMenuButton", {
    menu_button: { type: "commands" },
  });

  console.log(DRY ? "\nDRY RUN завершено — у боті нічого не змінено." : "\nГотово.");
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
