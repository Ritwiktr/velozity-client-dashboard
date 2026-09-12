import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getUser } from "../middleware/auth.js";
import { activityWhereForRole, formatActivityLine } from "../lib/access.js";

export const activityRouter = Router();

activityRouter.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const events = await prisma.activityEvent.findMany({
      where: {
        AND: [activityWhereForRole(user), projectId ? { projectId } : {}],
      },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: Number.isFinite(limit) ? limit : 20,
    });
    res.json({
      events: events.map((event) => ({
        ...event,
        line: formatActivityLine({
          actorName: event.actor.name,
          taskNumber: event.taskNumber,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          summary: event.summary,
        }),
      })),
    });
  } catch (err) {
    next(err);
  }
});
