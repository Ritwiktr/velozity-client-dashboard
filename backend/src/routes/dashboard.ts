import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getUser } from "../middleware/auth.js";
import { taskWhereForRole } from "../lib/access.js";
import { onlineUserCount } from "../realtime/socket.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    if (user.role === "ADMIN") {
      const [projects, tasks, overdue] = await Promise.all([
        prisma.project.count(),
        prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.task.count({ where: { isOverdue: true, status: { not: "DONE" } } }),
      ]);
      res.json({
        role: user.role,
        totalProjects: projects,
        tasksByStatus: Object.fromEntries(tasks.map((row) => [row.status, row._count._all])),
        overdueCount: overdue,
        onlineUsers: onlineUserCount(),
      });
      return;
    }

    if (user.role === "PROJECT_MANAGER") {
      const where = taskWhereForRole(user);
      const start = startOfWeek(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const [projects, byPriority, upcoming] = await Promise.all([
        prisma.project.count({ where: { createdById: user.sub } }),
        prisma.task.groupBy({ by: ["priority"], where, _count: { _all: true } }),
        prisma.task.findMany({
          where: { ...where, dueDate: { gte: start, lt: end }, status: { not: "DONE" } },
          orderBy: { dueDate: "asc" },
          include: { project: { select: { id: true, name: true } } },
        }),
      ]);
      res.json({
        role: user.role,
        totalProjects: projects,
        tasksByPriority: Object.fromEntries(byPriority.map((row) => [row.priority, row._count._all])),
        upcomingThisWeek: upcoming,
      });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { assignedToId: user.sub },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json({ role: user.role, tasks });
  } catch (err) {
    next(err);
  }
});

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
