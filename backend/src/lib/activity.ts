import type { ActivityType, Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { formatActivityLine } from "./access.js";
import { emitActivity } from "../realtime/socket.js";

export async function recordActivity(input: {
  type: ActivityType;
  actorId: string;
  actorName: string;
  projectId: string;
  taskId?: string | null;
  assignedToId?: string | null;
  taskNumber?: number | null;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  projectCreatedById: string;
}) {
  const summary = formatActivityLine({
    actorName: input.actorName,
    taskNumber: input.taskNumber ?? null,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    summary:
      input.type === "TASK_ASSIGNED"
        ? `${input.actorName} assigned Task #${input.taskNumber}`
        : input.type === "TASK_CREATED"
          ? `${input.actorName} created Task #${input.taskNumber}`
          : input.type === "TASK_OVERDUE"
            ? `Task #${input.taskNumber} was flagged as Overdue`
            : undefined,
  });

  const event = await prisma.activityEvent.create({
    data: {
      type: input.type,
      actorId: input.actorId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      assignedToId: input.assignedToId ?? null,
      taskNumber: input.taskNumber ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      summary,
    },
    include: { actor: { select: { name: true } } },
  });

  try {
    emitActivity(event, input.projectCreatedById);
  } catch {
    // Socket may not be ready during seed
  }

  return event;
}

export function activityInclude(): Prisma.ActivityEventInclude {
  return { actor: { select: { id: true, name: true, role: true } } };
}
