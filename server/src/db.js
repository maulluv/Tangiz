// Єдиний екземпляр Prisma-клієнта на весь застосунок.
// Імпортуємо { prisma } усюди, де потрібен доступ до БД.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
