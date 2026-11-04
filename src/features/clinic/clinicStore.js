// Похідні поля профілю клініки (ініціали, посилання на бот) — чисті хелпери.
// Дані профілю живуть на сервері (див. clinicApi.js), тут лише обчислення.
import { CLINIC } from "@/data";

// Поля, які власник може редагувати в Налаштуваннях.
export const CLINIC_FIELDS = ["name", "doctorName", "phone", "telegram", "address"];

// Ім'я лікаря латиницею для англійської версії сайту. Автотранслітерація тут не годиться
// (за офіційними правилами «Тенгіз» стало б «Tenhiz»), тож відомі імена — словником;
// якщо власник впише інше ім'я, англійська версія просто покаже його як є.
const EN_NAMES = { "Тенгіз Дадвані": "Tengiz Dadvani" };

// Додає похідні поля: initials (з імені лікаря), doctorNameEn і botUrl (з telegram-ніка).
export function withDerived(c) {
  const handle = (c.telegram || "").replace(/^@/, "");
  return {
    ...c,
    doctorNameEn: EN_NAMES[(c.doctorName || "").trim()] ?? c.doctorName,
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
