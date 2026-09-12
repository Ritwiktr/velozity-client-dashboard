import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, getAccessToken } from "./api";
import { useAuth } from "./auth";
import type { Activity, NotificationItem, Task } from "./types";

type SocketApi = {
  socket: Socket | null;
  onlineCount: number | null;
  lastActivity: Activity | null;
  lastTask: Task | null;
  unreadBump: { unreadCount: number; notification: NotificationItem } | null;
};

const SocketContext = createContext<SocketApi | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [lastActivity, setLastActivity] = useState<Activity | null>(null);
  const [lastTask, setLastTask] = useState<Task | null>(null);
  const [unreadBump, setUnreadBump] = useState<SocketApi["unreadBump"]>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!user || !token) {
      setSocket(null);
      return;
    }
    const next = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    next.on("presence:update", (payload: { count: number }) => setOnlineCount(payload.count));
    next.on("activity:new", (payload: Activity) => setLastActivity(payload));
    next.on("task:updated", (payload: { task: Task }) => setLastTask(payload.task));
    next.on("notification:new", (payload: { unreadCount: number; notification: NotificationItem }) =>
      setUnreadBump(payload),
    );
    setSocket(next);
    return () => {
      next.close();
    };
  }, [user]);

  const value = useMemo(
    () => ({ socket, onlineCount, lastActivity, lastTask, unreadBump }),
    [socket, onlineCount, lastActivity, lastTask, unreadBump],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useRealtime() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useRealtime must be used inside SocketProvider");
  return ctx;
}
