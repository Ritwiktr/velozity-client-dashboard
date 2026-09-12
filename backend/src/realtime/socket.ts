import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { isAllowedOrigin } from "../config.js";
import { verifyAccessToken } from "../lib/jwt.js";
import type { ActivityEvent, Role } from "@prisma/client";

type PresenceUser = { id: string; name: string; role: Role };

const socketsByUser = new Map<string, Set<string>>();
const presenceBySocket = new Map<string, PresenceUser>();

let io: Server | null = null;

export function getIo(): Server {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }
  return io;
}

export function onlineUserCount(): number {
  return socketsByUser.size;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (typeof socket.handshake.query.token === "string" ? socket.handshake.query.token : undefined);
      if (!token) {
        next(new Error("UNAUTHORIZED"));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { sub: string; role: Role; name: string };
    const rooms = roomsForUser(user);
    rooms.forEach((room) => socket.join(room));

    if (!socketsByUser.has(user.sub)) {
      socketsByUser.set(user.sub, new Set());
    }
    socketsByUser.get(user.sub)!.add(socket.id);
    presenceBySocket.set(socket.id, { id: user.sub, name: user.name, role: user.role });
    emitPresence();

    socket.on("disconnect", () => {
      const set = socketsByUser.get(user.sub);
      set?.delete(socket.id);
      if (set && set.size === 0) {
        socketsByUser.delete(user.sub);
      }
      presenceBySocket.delete(socket.id);
      emitPresence();
    });
  });

  return io;
}

export function roomsForUser(user: { sub: string; role: Role }): string[] {
  const rooms = [`user:${user.sub}`];
  if (user.role === "ADMIN") {
    rooms.push("role:admin");
  }
  if (user.role === "PROJECT_MANAGER") {
    rooms.push(`pm:${user.sub}`);
  }
  if (user.role === "DEVELOPER") {
    rooms.push(`dev:${user.sub}`);
  }
  return rooms;
}

function emitPresence() {
  getIo().to("role:admin").emit("presence:update", {
    count: onlineUserCount(),
    users: Array.from(socketsByUser.keys()).map((id) => {
      const sample = [...presenceBySocket.values()].find((u) => u.id === id);
      return sample ?? { id };
    }),
  });
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  getIo().to(`user:${userId}`).emit(event, payload);
}

export function emitActivity(
  event: ActivityEvent & { actor: { name: string } },
  projectCreatedById?: string,
) {
  const payload = serializeActivity(event);
  getIo().to("role:admin").emit("activity:new", payload);
  if (projectCreatedById) {
    getIo().to(`pm:${projectCreatedById}`).emit("activity:new", payload);
  }
  if (event.assignedToId) {
    getIo().to(`dev:${event.assignedToId}`).emit("activity:new", payload);
  }
}

export function emitTaskUpdated(payload: {
  projectId: string;
  assignedToId: string | null;
  createdById: string;
  task: unknown;
}) {
  getIo().to("role:admin").emit("task:updated", payload);
  getIo().to(`pm:${payload.createdById}`).emit("task:updated", payload);
  if (payload.assignedToId) {
    getIo().to(`dev:${payload.assignedToId}`).emit("task:updated", payload);
  }
}

export function emitNotification(userId: string, payload: unknown) {
  emitToUser(userId, "notification:new", payload);
}

export function serializeActivity(event: ActivityEvent & { actor: { name: string } }) {
  return {
    id: event.id,
    type: event.type,
    actorName: event.actor.name,
    projectId: event.projectId,
    taskId: event.taskId,
    taskNumber: event.taskNumber,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    summary: event.summary,
    createdAt: event.createdAt,
  };
}

export function joinProjectRoom(userId: string, projectId: string) {
  const ioServer = getIo();
  const ids = socketsByUser.get(userId);
  if (!ids) return;
  ids.forEach((socketId) => {
    ioServer.sockets.sockets.get(socketId)?.join(`project:${projectId}`);
  });
}
