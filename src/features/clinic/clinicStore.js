// Похідні поля профілю клініки (ініціали, посилання на бот) — чисті хелпери.
// Дані профілю живуть на сервері (див. clinicApi.js), тут лише обчислення.
import { CLINIC } from "@/data";

// Поля, які власник може редагувати в Налаштуваннях.
export const CLINIC_FIELDS = ["name", "doctorName", "phone", "telegram", "address"];

// Додає похідні поля: initials (з імені лікаря) і botUrl (з telegram-ніка).
export function withDerived(c) {
  const handle = (c.telegram || "").replace(/^@/, "");
  return {
    ...c,
    initials: (c.doctorName || "")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    botUrl: handle ? `https://t.me/${handle}` : c.botUrl,
  };
}

// Базовий профіль (дефолт до завантаження з сервера).
export const CLINIC_BASE = CLINIC;
