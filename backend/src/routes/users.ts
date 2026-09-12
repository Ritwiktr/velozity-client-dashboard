import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { getUser, requireRoles } from "../middleware/auth.js";
import { createUserSchema } from "../lib/validators.js";
import { conflict } from "../lib/errors.js";

export const usersRouter = Router();

usersRouter.get("/", requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/assignable", requireRoles("ADMIN", "PROJECT_MANAGER"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "DEVELOPER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      throw conflict("A user with that email already exists");
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(body.password, 12),
        role: body.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    getUser(req);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});
