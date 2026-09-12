import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../middleware/auth.js";
import { createClientSchema } from "../lib/validators.js";

export const clientsRouter = Router();

clientsRouter.get("/", requireRoles("ADMIN", "PROJECT_MANAGER"), async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    res.json({ clients });
  } catch (err) {
    next(err);
  }
});

clientsRouter.post("/", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = createClientSchema.parse(req.body);
    const client = await prisma.client.create({ data: body });
    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
});
