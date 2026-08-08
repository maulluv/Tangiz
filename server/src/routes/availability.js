// GET /api/availability — вільні майбутні слоти, згруповані по послузі.
// Формат збігається з фронтовим data/availability.js: { s1: [ISO…], s2: [ISO…] }.
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const slots = await prisma.slot.findMany({
      where: {
        booked: false,
        startsAt: { gte: new Date() },
        service: { active: true },
      },
      orderBy: { startsAt: "asc" },
    });

    const grouped = {};
    for (const s of slots) {
      (grouped[s.serviceId] ??= []).push(s.startsAt.toISOString());
    }
    res.json(grouped);
  }),
);

export default router;
