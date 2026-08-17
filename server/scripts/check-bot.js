// Безпечна перевірка стану бота (тільки читання — нічого не перехоплює).
// Запуск: npm run bot:check
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.log("❌ Немає TELEGRAM_BOT_TOKEN у .env — додайте токен від @BotFather і повторіть.");
  process.exit(1);
}

const base = `https://api.telegram.org/bot${TOKEN}`;

async function call(method) {
  const res = await fetch(`${base}/${method}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

// Тихий виклик: не кидає, якщо метод недоступний — просто повертає null.
async function tryCall(method) {
  try {
    return await call(method);
  } catch {
    return null;
  }
}

try {
  const me = await call("getMe");
  console.log(`✅ Токен робочий. Бот: @${me.username} (${me.first_name})`);
  console.log(`   Може вступати в групи: ${me.can_join_groups ? "так" : "ні"}; ` +
    `бачить усі повідомлення: ${me.can_read_all_group_messages ? "так" : "ні"}; ` +
    `inline-режим: ${me.supports_inline_queries ? "так" : "ні"}`);

  const wh = await call("getWebhookInfo");
  if (wh.url) {
    console.log(`\n⚠️  Налаштований ВЕБХУК: ${wh.url}`);
    console.log("   Значить, за ботом уже щось працює — не підключаємо другий екземпляр.");
  } else {
    console.log("\n✅ Вебхук не налаштований — за ботом нічого не працює, можна підключати наш код.");
  }
  console.log(`ℹ️  Повідомлень у черзі (getUpdates): ${wh.pending_update_count}`);

  // --- Інвентаризація поточних налаштувань (усе read-only) ---
  console.log("\n── Що вже налаштовано в боті ──");

  const name = await tryCall("getMyName");
  console.log(`Назва: ${name?.name || "—"}`);

  const desc = await tryCall("getMyDescription");
  console.log(`Опис (екран перед /start): ${desc?.description || "—"}`);

  const shortDesc = await tryCall("getMyShortDescription");
  console.log(`Короткий опис (профіль): ${shortDesc?.short_description || "—"}`);

  const cmds = await tryCall("getMyCommands");
  if (cmds && cmds.length) {
    console.log("Команди:");
    for (const c of cmds) console.log(`  /${c.command} — ${c.description}`);
  } else {
    console.log("Команди: — (не задані)");
  }

  const menu = await tryCall("getChatMenuButton");
  console.log(`Кнопка меню: ${menu?.type || "—"}${menu?.text ? ` («${menu.text}»)` : ""}`);

  console.log("\nГотово. Надішли цей вивід — і скажу, що лишити, що оновити, що додати.");
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
}
