import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getUser } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const user = getUser(req);
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: user.sub },
      data: { read: true },
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: user.sub, read: false },
    });
    res.json({ ok: true, unreadCount });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const user = getUser(req);
    await prisma.notification.updateMany({
      where: { userId: user.sub, read: false },
      data: { read: true },
    });
    res.json({ ok: true, unreadCount: 0 });
  } catch (err) {
    next(err);
  }
});
