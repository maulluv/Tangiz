// GET /api/services — активні послуги (для форм на сайті й в адмінці).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });
    res.json(
      services.map((s) => ({
        id: s.id,
        price: s.price,
        durationMin: s.durationMin,
        nameUk: s.nameUk,
        nameEn: s.nameEn,
      })),
    );
  }),
);

export default router;
