# Як влаштовано робочий сайт TENGIZ

Сайт, API, Telegram-бот і таймери (автоскасування, нагадування) працюють **одним процесом**,
а база — це один файл SQLite на диску. Тому хостинг — **Railway** (тариф Hobby, ~$5/міс):
процес працює постійно, диск не стирається при оновленні.

| Що | Де | Чий акаунт |
|---|---|---|
| Код | GitHub `maulluv/Tangiz`, гілка `main` | розробника |
| Сервер + база | Railway, сервіс `Tangiz` + диск `tangiz-volume` (`/data`) | розробника (Hobby) |
| Домен `drtengizdadvani.com` | куплено на Porkbun | власника |
| DNS домену | **Cloudflare** (NS у Porkbun вказують на Cloudflare) | власника |
| Telegram-бот | @BotFather | власника (робочий), розробника (тестовий) |

---

## Оновлення сайту

Злити зміни в `main` (PR на GitHub) — Railway сам перезбере й перезапустить за 3–5 хв.
База на `/data` не зачіпається, міграції бази застосовуються автоматично при старті.

Перевірка після оновлення: Railway → `Tangiz` → **Deployments** → останній → **View logs**:
`🚀 TENGIZ API …` і `🤖 Telegram-бот @… запущено.`

---

## Як це налаштовано (якщо треба повторити з нуля)

### 1. Сервіс
1. railway.com → **New → GitHub Repository** → `maulluv/Tangiz`
   (якщо репозиторію немає в списку — **Configure GitHub App** → дати доступ до `Tangiz`).
2. Сервіс → **Settings**:
   - **Source → Branch:** `main`;
   - **Build → Custom Build Command:** `npm run build && npm ci --prefix server`;
   - **Deploy → Custom Start Command:** `npm --prefix server run start:prod`;
   - **Deploy → Healthcheck Path:** `/api/health`;
   - **Scale → Region:** EU West (Amsterdam) — ближче до України.

   > Файл `railway.json` (Config as Code) Railway більше не підтримує для нових сервісів,
   > тому команди задано вручну в налаштуваннях.
3. Правою кнопкою на сервіс → **Attach volume** → Mount path `/data`.

### 2. Змінні (сервіс → Variables → Raw Editor)
```
DATABASE_URL=file:/data/tangiz.db
JWT_SECRET=<openssl rand -base64 48>
TELEGRAM_BOT_TOKEN=<токен бота з @BotFather>
OWNER_USERNAME=<логін адмінки>
OWNER_PASSWORD=<пароль адмінки, від 8 символів>
VITE_SITE_URL=https://drtengizdadvani.com
CLINIC_TZ=Europe/Kyiv
BOOKING_CONFIRM_MIN=30
FOLLOWUP_DAYS=7
```
- `PORT` не задавати — Railway ставить сам (зараз 8080).
- `OWNER_USERNAME`/`OWNER_PASSWORD` спрацьовують лише при першому запуску з порожньою базою.
- `VITE_SITE_URL` вшивається в сайт під час збірки (прев'ю посилань). Змінили — **Redeploy**.
- Секрети нікуди не пересилати й не показувати на скрінах.

### 3. Домен
1. Railway → сервіс → **Settings → Networking → Custom Domain** → `drtengizdadvani.com`, порт `8080`.
   Те саме для `www.drtengizdadvani.com`.
2. Railway показує записи `CNAME` і `TXT` — їх додати в **Cloudflare** (dash.cloudflare.com →
   домен → **DNS → Records**):
   - `CNAME`, Name `@` (або `www`), Target — з Railway, **Proxy status: DNS only** (сіра хмаринка);
   - `TXT`, Name `_railway-verify` (або як дав Railway), Content — з Railway.
3. Через 5–30 хв у Railway біля домену зелена галочка, HTTPS видається сам.

> Записи в DNS-розділі самого Porkbun **ні на що не впливають**, поки NS домену — Cloudflare.

### 4. Railway: тариф і захист
- **Plans → Hobby** (без нього сервер зупиняється після пробного періоду).
- **Usage → Usage limits:** Compute hard limit `$20`, email alert `$8`.
- Сервіс → **Backups** → розклад Daily.

---

## Telegram-бот

Зараз на сервері — **тестовий** бот `@tangiz_dev_dan_bot`.
⚠️ Один токен працює лише в одному місці: поки бот на сервері, не запускайте локальний
`npm run dev` з тим самим токеном (для локальної роботи — окремий бот у `server/.env`).

### Перехід на робочий `@Drdadvanibot`
1. З Telegram власника: @BotFather → `/mybots` → `@Drdadvanibot` → **API Token**.
2. Railway → Variables → `TELEGRAM_BOT_TOKEN` → новий токен → **Deploy**.
3. Одразу відключити бота в старому конструкторі (видалити інтеграцію/токен).
4. Тексти й меню бота: на Mac **тимчасово** вписати робочий токен у `server/.env` і запустити
   ```bash
   cd server
   npm run bot:setup -- --dry
   npm run bot:setup -- --name
   ```
   потім повернути в `server/.env` локальний токен.
5. Лікар у `@Drdadvanibot`: **Start** → `/bind ПАРОЛЬ_АДМІНКИ`. Потім ще раз `bot:setup` —
   у меню лікаря з'являться `/add`, `/slots`.
6. Аватар — @BotFather `/setuserpic` з Telegram власника.
7. Підписку конструктора скасувати, коли переконалися, що новий бот відповідає.

Записи, слоти й відгуки лишаються (вони в базі). Пацієнти старого бота отримуватимуть
повідомлення від нового лише після того, як натиснуть у ньому Start.

---

## Google Calendar (ще не підключено)

1. **Власник:** console.cloud.google.com → **New Project** `TENGIZ` → увімкнути **Google Calendar API**.
2. **IAM & Admin → Service Accounts → Create** `tengiz-calendar` → **Keys → Add key → JSON**.
3. calendar.google.com → ⚙️ → свій календар → **Доступ для окремих користувачів** → email
   сервісного акаунта → право **«Вносити зміни в події»**.
4. Ключ в один рядок: `base64 -i ~/Downloads/КЛЮЧ.json | tr -d '\n' | pbcopy`, JSON-файл видалити.
5. Railway → Variables: `GOOGLE_SERVICE_ACCOUNT=<рядок>`, `GOOGLE_CALENDAR_ID=<gmail лікаря>` → Deploy.
   У логах: `📅 Google Calendar: …`.

---

## Перший вхід

1. `https://drtengizdadvani.com/admin` → логін і пароль адмінки.
2. **Профіль клініки** — справжні телефон, Telegram, адреса.
3. Бот: **Start** → `/bind ПАРОЛЬ_АДМІНКИ`, вільні години — `/add` або **Доступність** в адмінці.
4. Пробний запис з телефона → підтвердити в боті → лікар підтверджує → скасувати.
