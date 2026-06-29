// Профіль клініки: базові дані з data/clinic.js, поверх — збережені власником
// зміни в localStorage. botUrl та initials завжди похідні, тож лишаються
// узгодженими після редагування. Згодом — реальний бекенд.
import { CLINIC } from "@/data";

const KEY = "tangiz.clinic";

// Поля, які власник може редагувати в Налаштуваннях.
export const CLINIC_FIELDS = ["name", "doctorName", "phone", "telegram", "address"];

function withDerived(c) {
  const handle = (c.telegram || "").replace(/^@/, "");
  return {
    ...c,
    initials: c.doctorName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    botUrl: handle ? `https://t.me/${handle}` : c.botUrl,
  };
}

export function getClinic() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return withDerived({ ...CLINIC, ...JSON.parse(raw) });
  } catch {
    /* пошкоджені дані — повертаємо базу */
  }
  return withDerived(CLINIC);
}

export function saveClinic(patch) {
  const merged = { ...getClinic(), ...patch };
  // Зберігаємо лише редаговані поля — botUrl/initials похідні.
  const toStore = {};
  for (const f of CLINIC_FIELDS) toStore[f] = merged[f];
  localStorage.setItem(KEY, JSON.stringify(toStore));
  return withDerived({ ...CLINIC, ...toStore });
}
