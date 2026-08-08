// Наповнення БД початковими даними (можна запускати повторно — спершу чистимо).
// Запуск: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../src/utils.js";

const prisma = new PrismaClient();

// Майбутнє віконце: за N днів від сьогодні о HH:MM (щоб слоти не були в минулому).
function futureSlot(dayOffset, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  // --- Чистимо (у правильному порядку через зовнішні ключі) ---
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.review.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.clinicProfile.deleteMany();

  // --- Послуги (id збігаються з ключами i18n) ---
  await prisma.service.createMany({
    data: [
      { id: "s1", price: 600, durationMin: 30 },
      { id: "s2", price: 900, durationMin: 45 },
      { id: "s3", price: 1100, durationMin: 60 },
    ],
  });

  // --- Вільні слоти (майбутні). s3 навмисно без слотів — демо "немає місць". ---
  const slotPlan = [
    { serviceId: "s1", at: futureSlot(1, 10, 0) },
    { serviceId: "s1", at: futureSlot(1, 11, 30) },
    { serviceId: "s1", at: futureSlot(3, 9, 0) },
    { serviceId: "s1", at: futureSlot(4, 15, 0) },
    { serviceId: "s2", at: futureSlot(2, 12, 0) },
    { serviceId: "s2", at: futureSlot(5, 10, 0) },
    { serviceId: "s2", at: futureSlot(7, 16, 0) },
  ];
  await prisma.slot.createMany({
    data: slotPlan.map((s) => ({ serviceId: s.serviceId, startsAt: s.at })),
  });

  // --- Власник (логін admin/admin, як зараз на фронті) ---
  await prisma.user.create({
    data: {
      id: "owner",
      role: "owner",
      name: "Тенгіз Дадвані",
      username: "admin",
      passwordHash: bcrypt.hashSync("admin", 10),
    },
  });

  // --- Демо-клієнти + історичні записи (щоб адмінка мала контент) ---
  const demoClients = [
    { key: "c1", name: "Ірина Коваленко", phone: "+380 50 111 22 33", telegram: "@iryna_k" },
    { key: "c2", name: "Андрій Бондар", phone: "+380 67 222 33 44", telegram: "@a_bondar" },
    { key: "c3", name: "Олена Шевчук", phone: "+380 63 333 44 55" },
    { key: "c4", name: "Максим Ткаченко", phone: "+380 99 444 55 66", telegram: "@maxt" },
    { key: "c5", name: "Наталія Мороз", phone: "+380 95 555 66 77" },
    { key: "c6", name: "Дмитро Лисенко", phone: "+380 68 666 77 88", telegram: "@dlysenko" },
  ];
  const idByKey = {};
  for (const c of demoClients) {
    const id = normalizePhone(c.phone);
    idByKey[c.key] = id;
    await prisma.user.create({
      data: { id, role: "client", name: c.name, phone: c.phone, telegram: c.telegram ?? null },
    });
  }

  const price = { s1: 600, s2: 900, s3: 1100 };
  const dur = { s1: 30, s2: 45, s3: 60 };
  const demoAppts = [
    { client: "c1", name: "Ірина Коваленко", serviceId: "s2", date: "2026-06-26T09:00:00", status: "confirmed", source: "telegram" },
    { client: "c4", name: "Максим Ткаченко", serviceId: "s3", date: "2026-06-26T11:00:00", status: "confirmed", source: "site" },
    { client: "c3", name: "Олена Шевчук", serviceId: "s1", date: "2026-06-26T13:30:00", status: "pending", source: "telegram" },
    { client: "c2", name: "Андрій Бондар", serviceId: "s2", date: "2026-06-27T10:00:00", status: "confirmed", source: "phone" },
    { client: "c5", name: "Наталія Мороз", serviceId: "s2", date: "2026-06-27T15:00:00", status: "pending", source: "site" },
    { client: "c6", name: "Дмитро Лисенко", serviceId: "s1", date: "2026-06-24T12:00:00", status: "completed", source: "telegram" },
    { client: "c1", name: "Ірина Коваленко", serviceId: "s3", date: "2026-06-23T16:00:00", status: "completed", source: "telegram" },
    { client: "c4", name: "Максим Ткаченко", serviceId: "s2", date: "2026-06-22T09:30:00", status: "canceled", source: "site" },
  ];
  for (const a of demoAppts) {
    await prisma.booking.create({
      data: {
        userId: idByKey[a.client],
        serviceId: a.serviceId,
        clientName: a.name,
        date: new Date(a.date),
        durationMin: dur[a.serviceId],
        price: price[a.serviceId],
        status: a.status,
        source: a.source,
      },
    });
  }

  // --- Відгуки ---
  const reviews = [
    { name: "Андрій К.", rating: 5, uk: "Після розтягнення коліна боявся, що без операції не обійтись. Тенгіз підібрав лікування — за місяць повернувся до тренувань.", en: "After a knee sprain I feared surgery was inevitable. Tengiz chose a treatment plan and in a month I was back to training." },
    { name: "Марія Л.", rating: 5, uk: "Дуже уважний лікар. Усе пояснив спокійно, без поспіху. Біль у плечі минув.", en: "A very attentive doctor. Explained everything calmly, without rushing. My shoulder pain is gone." },
    { name: "Олег П.", rating: 5, uk: "Звернувся з переломом — чіткий план лікування і постійно на зв'язку. Дякую!", en: "Came in with a fracture — a clear treatment plan and always in touch. Thank you!" },
    { name: "Ірина С.", rating: 5, uk: "Багато років боліли суглоби. Вперше відчула, що лікар справді зацікавлений у результаті.", en: "My joints had hurt for years. For the first time I felt the doctor was truly invested in the result." },
    { name: "Дмитро В.", rating: 4, uk: "Професійний підхід, реальна допомога. Іноді відповідає не одразу, але завжди уважно.", en: "Professional approach, real help. Replies aren't always instant, but always thoughtful." },
    { name: "Наталя Б.", rating: 5, uk: "Підвернула ногу — прийняв швидко, пояснив що робити. Усе зажило без проблем.", en: "Twisted my ankle — seen quickly, told exactly what to do. Healed without any issues." },
  ];
  for (const r of reviews) {
    await prisma.review.create({
      data: { name: r.name, rating: r.rating, textUk: r.uk, textEn: r.en },
    });
  }

  // --- Профіль клініки ---
  await prisma.clinicProfile.create({
    data: {
      id: 1,
      name: "TANGIZ",
      doctorName: "Тенгіз Дадвані",
      phone: "+380 67 123 45 67",
      telegram: "@Drdadvanibot",
      address: "Київ",
    },
  });

  console.log("✅ Seed завершено: послуги, слоти, власник, клієнти, записи, відгуки, профіль.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
