import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { recordActivity } from "../lib/activity.js";

export function startOverdueJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await flagOverdueTasks();
    } catch (err) {
      console.error("Overdue job failed", err);
    }
  });
}

export async function flagOverdueTasks() {
  const now = new Date();
  const due = await prisma.task.findMany({
    where: {
      isOverdue: false,
      status: { not: "DONE" },
      dueDate: { lt: now },
    },
    include: { project: true },
  });

  for (const task of due) {
    await prisma.task.update({
      where: { id: task.id },
      data: { isOverdue: true },
    });
    await recordActivity({
      type: "TASK_OVERDUE",
      actorId: task.project.createdById,
      actorName: "System",
      projectId: task.projectId,
      taskId: task.id,
      assignedToId: task.assignedToId,
      taskNumber: task.number,
      projectCreatedById: task.project.createdById,
    });
  }

  return due.length;
}
