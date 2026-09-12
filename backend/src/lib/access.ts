import type { Role, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { forbidden, notFound } from "./errors.js";

export async function assertProjectAccess(user: { sub: string; role: Role }, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: { select: { assignedToId: true } } },
  });
  if (!project) {
    throw notFound("Project not found");
  }
  if (user.role === "ADMIN") {
    return project;
  }
  if (user.role === "PROJECT_MANAGER") {
    if (project.createdById !== user.sub) {
      throw forbidden("Project managers can only access projects they created");
    }
    return project;
  }
  const assigned = project.tasks.some((t) => t.assignedToId === user.sub);
  if (!assigned) {
    throw forbidden("Developers can only access projects with tasks assigned to them");
  }
  return project;
}

export async function assertTaskAccess(user: { sub: string; role: Role }, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true, assignedTo: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!task) {
    throw notFound("Task not found");
  }
  if (user.role === "ADMIN") {
    return task;
  }
  if (user.role === "PROJECT_MANAGER") {
    if (task.project.createdById !== user.sub) {
      throw forbidden("Project managers can only access tasks on their own projects");
    }
    return task;
  }
  if (task.assignedToId !== user.sub) {
    throw forbidden("Developers can only access tasks assigned to them");
  }
  return task;
}

export function projectWhereForRole(user: { sub: string; role: Role }) {
  if (user.role === "ADMIN") {
    return {};
  }
  if (user.role === "PROJECT_MANAGER") {
    return { createdById: user.sub };
  }
  return { tasks: { some: { assignedToId: user.sub } } };
}

export function taskWhereForRole(user: { sub: string; role: Role }) {
  if (user.role === "ADMIN") {
    return {};
  }
  if (user.role === "PROJECT_MANAGER") {
    return { project: { createdById: user.sub } };
  }
  return { assignedToId: user.sub };
}

export function activityWhereForRole(user: { sub: string; role: Role }) {
  if (user.role === "ADMIN") {
    return {};
  }
  if (user.role === "PROJECT_MANAGER") {
    return { project: { createdById: user.sub } };
  }
  return { assignedToId: user.sub };
}

export function formatStatus(status: TaskStatus | null | undefined): string {
  if (!status) return "None";
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
    default:
      return status;
  }
}

export function formatActivityLine(input: {
  actorName: string;
  taskNumber: number | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  summary?: string;
}): string {
  if (input.fromStatus && input.toStatus && input.taskNumber != null) {
    return `${input.actorName} moved Task #${input.taskNumber} from ${formatStatus(input.fromStatus)} → ${formatStatus(input.toStatus)}`;
  }
  return input.summary ?? `${input.actorName} updated a task`;
}
