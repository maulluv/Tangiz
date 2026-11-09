// Початкові дані для РОБОЧОГО сервера. Запускається при кожному старті (npm run start:prod),
// але нічого не стирає й не перезаписує: створює лише те, чого ще немає.
// На відміну від seed.js тут немає демо-пацієнтів, записів і слотів, а пароль власника —
// з OWNER_PASSWORD, а не admin/admin.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const REVIEWS = [
  { name: "Андрій К.", rating: 5, uk: "Після розтягнення коліна боявся, що без операції не обійтись. Тенгіз підібрав лікування — за місяць повернувся до тренувань.", en: "After a knee sprain I feared surgery was inevitable. Tengiz chose a treatment plan and in a month I was back to training." },
  { name: "Марія Л.", rating: 5, uk: "Дуже уважний лікар. Усе пояснив спокійно, без поспіху. Біль у плечі минув.", en: "A very attentive doctor. Explained everything calmly, without rushing. My shoulder pain is gone." },
  { name: "Олег П.", rating: 5, uk: "Звернувся з переломом — чіткий план лікування і постійно на зв'язку. Дякую!", en: "Came in with a fracture — a clear treatment plan and always in touch. Thank you!" },
  { name: "Ірина С.", rating: 5, uk: "Багато років боліли суглоби. Вперше відчула, що лікар справді зацікавлений у результаті.", en: "My joints had hurt for years. For the first time I felt the doctor was truly invested in the result." },
  { name: "Дмитро В.", rating: 4, uk: "Професійний підхід, реальна допомога. Іноді відповідає не одразу, але завжди уважно.", en: "Professional approach, real help. Replies aren't always instant, but always thoughtful." },
  { name: "Наталя Б.", rating: 5, uk: "Підвернула ногу — прийняв швидко, пояснив що робити. Усе зажило без проблем.", en: "Twisted my ankle — seen quickly, told exactly what to do. Healed without any issues." },
];

async function main() {
  // Послуги (id збігаються з ключами i18n) — лише відсутні.
  for (const s of [
    { id: "s1", price: 600, durationMin: 30 },
    { id: "s2", price: 900, durationMin: 45 },
    { id: "s3", price: 1100, durationMin: 60 },
  ]) {
    await prisma.service.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // Власник. Пароль потрібен лише при першому запуску, далі не чіпаємо.
  const owner = await prisma.user.findFirst({ where: { role: "owner" } });
  if (!owner) {
    const password = process.env.OWNER_PASSWORD;
    if (!password || password.length < 8) {
      throw new Error("Задайте OWNER_PASSWORD (мінімум 8 символів) — це пароль входу в адмінку.");
    }
    await prisma.user.create({
      data: {
        id: "owner",
        role: "owner",
        name: "Тенгіз Дадвані",
        username: process.env.OWNER_USERNAME || "admin",
        passwordHash: bcrypt.hashSync(password, 10),
      },
    });
    console.log("👤 Створено власника — вхід в адмінку з OWNER_USERNAME / OWNER_PASSWORD.");
  }

  // Профіль клініки — далі редагується в адмінці.
  await prisma.clinicProfile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "TENGIZ", doctorName: "Тенгіз Дадвані", phone: "", telegram: "@Drdadvanibot", address: "Київ" },
  });

  // Відгуки — лише в порожню базу, щоб не дублювати й не повертати видалені.
  if ((await prisma.review.count()) === 0) {
    for (const r of REVIEWS) {
      await prisma.review.create({ data: { name: r.name, rating: r.rating, textUk: r.uk, textEn: r.en } });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
