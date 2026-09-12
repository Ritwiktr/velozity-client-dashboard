import { prisma } from "./prisma.js";
import { emitNotification } from "../realtime/socket.js";

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  taskId?: string | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      taskId: input.taskId ?? null,
    },
  });
  const unread = await prisma.notification.count({
    where: { userId: input.userId, read: false },
  });
  try {
    emitNotification(input.userId, { notification, unreadCount: unread });
  } catch {
    // ignore if sockets are not running
  }
  return notification;
}
