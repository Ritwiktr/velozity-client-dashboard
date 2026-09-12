import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getUser, requireRoles } from "../middleware/auth.js";
import { createProjectSchema } from "../lib/validators.js";
import { assertProjectAccess, projectWhereForRole } from "../lib/access.js";
import { joinProjectRoom } from "../realtime/socket.js";
import { notFound, routeParam } from "../lib/errors.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const projects = await prisma.project.findMany({
      where: projectWhereForRole(user),
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

projectsRouter.post("/", requireRoles("ADMIN", "PROJECT_MANAGER"), async (req, res, next) => {
  try {
    const user = getUser(req);
    const body = createProjectSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) {
      throw notFound("Client not found");
    }
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        clientId: body.clientId,
        createdById: user.sub,
      },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

projectsRouter.get("/:id", async (req, res, next) => {
  try {
    const user = getUser(req);
    const projectId = routeParam(req.params.id);
    await assertProjectAccess(user, projectId);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, role: true } },
        tasks: {
          where: user.role === "DEVELOPER" ? { assignedToId: user.sub } : undefined,
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        },
      },
    });
    try {
      joinProjectRoom(user.sub, projectId);
    } catch {
      // sockets optional during tests
    }
    res.json({ project });
  } catch (err) {
    next(err);
  }
});
