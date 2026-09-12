import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getUser, requireRoles } from "../middleware/auth.js";
import { createTaskSchema, taskFilterSchema, updateTaskSchema } from "../lib/validators.js";
import { assertProjectAccess, assertTaskAccess, taskWhereForRole } from "../lib/access.js";
import { forbidden, notFound } from "../lib/errors.js";
import { recordActivity } from "../lib/activity.js";
import { notifyUser } from "../lib/notify.js";
import { emitTaskUpdated } from "../realtime/socket.js";

export const tasksRouter = Router();

function parseFilters(query: RequestQuery) {
  const parsed = taskFilterSchema.parse(query);
  const where: Prisma.TaskWhereInput = {};
  if (parsed.status) where.status = parsed.status;
  if (parsed.priority) where.priority = parsed.priority;
  if (parsed.projectId) where.projectId = parsed.projectId;
  if (parsed.overdue === "true") where.isOverdue = true;
  if (parsed.overdue === "false") where.isOverdue = false;
  if (parsed.dueFrom || parsed.dueTo) {
    where.dueDate = {};
    if (parsed.dueFrom) where.dueDate.gte = new Date(parsed.dueFrom);
    if (parsed.dueTo) where.dueDate.lte = new Date(parsed.dueTo);
  }
  return where;
}

type RequestQuery = Record<string, unknown>;

const taskInclude = {
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  project: { select: { id: true, name: true, createdById: true } },
  statusLogs: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { id: true, name: true } } },
  },
};

tasksRouter.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const filters = parseFilters(req.query as RequestQuery);
    const tasks = await prisma.task.findMany({
      where: { AND: [taskWhereForRole(user), filters] },
      include: taskInclude,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/projects/:projectId", requireRoles("ADMIN", "PROJECT_MANAGER"), async (req, res, next) => {
  try {
    const user = getUser(req);
    const project = await assertProjectAccess(user, req.params.projectId);
    const body = createTaskSchema.parse(req.body);
    if (user.role === "PROJECT_MANAGER" && project.createdById !== user.sub) {
      throw forbidden();
    }
    if (body.assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: body.assignedToId } });
      if (!assignee || assignee.role !== "DEVELOPER") {
        throw notFound("Assigned user must be a developer");
      }
    }
    const dueDate = new Date(body.dueDate);
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        projectId: project.id,
        assignedToId: body.assignedToId ?? null,
        status: body.status ?? "TODO",
        priority: body.priority,
        dueDate,
        isOverdue: dueDate < new Date() && (body.status ?? "TODO") !== "DONE",
      },
      include: taskInclude,
    });

    await prisma.taskStatusLog.create({
      data: {
        taskId: task.id,
        actorId: user.sub,
        fromStatus: null,
        toStatus: task.status,
      },
    });

    await recordActivity({
      type: "TASK_CREATED",
      actorId: user.sub,
      actorName: user.name,
      projectId: project.id,
      taskId: task.id,
      assignedToId: task.assignedToId,
      taskNumber: task.number,
      toStatus: task.status,
      projectCreatedById: project.createdById,
    });

    if (task.assignedToId) {
      await notifyUser({
        userId: task.assignedToId,
        title: "New task assigned",
        body: `${user.name} assigned you Task #${task.number}: ${task.title}`,
        taskId: task.id,
      });
      await recordActivity({
        type: "TASK_ASSIGNED",
        actorId: user.sub,
        actorName: user.name,
        projectId: project.id,
        taskId: task.id,
        assignedToId: task.assignedToId,
        taskNumber: task.number,
        projectCreatedById: project.createdById,
      });
    }

    emitTaskUpdated({
      projectId: project.id,
      assignedToId: task.assignedToId,
      createdById: project.createdById,
      task,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const user = getUser(req);
    const task = await assertTaskAccess(user, req.params.id);
    const full = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskInclude,
    });
    res.json({ task: full });
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = getUser(req);
    const existing = await assertTaskAccess(user, req.params.id);
    const body = updateTaskSchema.parse(req.body);

    if (user.role === "DEVELOPER") {
      const extra = Object.keys(body).filter((k) => k !== "status");
      if (extra.length > 0) {
        throw forbidden("Developers can only update task status");
      }
    }

    if (body.assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: body.assignedToId } });
      if (!assignee || assignee.role !== "DEVELOPER") {
        throw notFound("Assigned user must be a developer");
      }
    }

    const nextDue = body.dueDate ? new Date(body.dueDate) : existing.dueDate;
    const nextStatus = body.status ?? existing.status;
    const isOverdue = nextDue < new Date() && nextStatus !== "DONE";

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        description: body.description,
        assignedToId: body.assignedToId === undefined ? undefined : body.assignedToId,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        isOverdue,
      },
      include: taskInclude,
    });

    if (body.status && body.status !== existing.status) {
      await prisma.taskStatusLog.create({
        data: {
          taskId: task.id,
          actorId: user.sub,
          fromStatus: existing.status,
          toStatus: body.status,
        },
      });
      await recordActivity({
        type: "STATUS_CHANGED",
        actorId: user.sub,
        actorName: user.name,
        projectId: task.projectId,
        taskId: task.id,
        assignedToId: task.assignedToId,
        taskNumber: task.number,
        fromStatus: existing.status,
        toStatus: body.status,
        projectCreatedById: existing.project.createdById,
      });
      if (body.status === "IN_REVIEW") {
        await notifyUser({
          userId: existing.project.createdById,
          title: "Task ready for review",
          body: `${user.name} moved Task #${task.number} to In Review`,
          taskId: task.id,
        });
      }
    }

    if (body.assignedToId && body.assignedToId !== existing.assignedToId) {
      await notifyUser({
        userId: body.assignedToId,
        title: "New task assigned",
        body: `${user.name} assigned you Task #${task.number}: ${task.title}`,
        taskId: task.id,
      });
      await recordActivity({
        type: "TASK_ASSIGNED",
        actorId: user.sub,
        actorName: user.name,
        projectId: task.projectId,
        taskId: task.id,
        assignedToId: body.assignedToId,
        taskNumber: task.number,
        projectCreatedById: existing.project.createdById,
      });
    }

    emitTaskUpdated({
      projectId: task.projectId,
      assignedToId: task.assignedToId,
      createdById: existing.project.createdById,
      task,
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
});
