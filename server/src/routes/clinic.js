// Профіль клініки: GET (публічно — сайт показує назву/бот/адресу) і PATCH (власник).
import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils.js";
import { requireAuth, requireOwner } from "../auth.js";

const router = Router();
const FIELDS = ["name", "doctorName", "phone", "telegram", "address"];

function dto(c) {
  return {
    name: c.name,
    doctorName: c.doctorName,
    phone: c.phone,
    telegram: c.telegram,
    address: c.address,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const c = await prisma.clinicProfile.findUnique({ where: { id: 1 } });
    if (!c) return res.status(404).json({ error: "Профіль клініки не знайдено." });
    res.json(dto(c));
  }),
);

router.patch(
  "/",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const data = {};
    for (const f of FIELDS) {
      if (body[f] !== undefined) data[f] = String(body[f]).trim();
    }
    if (data.name === "" || data.doctorName === "") {
      return res.status(400).json({ error: "Назва та ім'я лікаря обов'язкові." });
    }

    const c = await prisma.clinicProfile.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        name: data.name || "TANGIZ",
        doctorName: data.doctorName || "",
        phone: data.phone || "",
        telegram: data.telegram || "",
        address: data.address || "",
      },
    });
    res.json(dto(c));
  }),
);

export default router;
