import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useRealtime } from "../socket";
import { timeAgo } from "../lib/format";
import type { NotificationItem } from "../types";

export function Notifications() {
  const { unreadBump } = useRealtime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await api<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications");
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!unreadBump) return;
    setUnread(unreadBump.unreadCount);
    setItems((prev) => [unreadBump.notification, ...prev.filter((n) => n.id !== unreadBump.notification.id)]);
  }, [unreadBump]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markOne(id: string) {
    const data = await api<{ unreadCount: number }>(`/api/notifications/${id}/read`, { method: "PATCH" });
    setUnread(data.unreadCount);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="bell" ref={box}>
      <button className="ghost" onClick={() => setOpen((v) => !v)}>
        Alerts
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <header>
            <strong>Notifications</strong>
            <button className="ghost" onClick={() => void markAll()}>
              Mark all read
            </button>
          </header>
          {items.length === 0 && <div className="note">No notifications</div>}
          {items.map((n) => (
            <div className={`note ${n.read ? "" : "unread"}`} key={n.id}>
              <strong>{n.title}</strong>
              <p style={{ margin: "6px 0", color: "var(--muted)" }}>{n.body}</p>
              <small>{timeAgo(n.createdAt)}</small>
              {!n.read && (
                <div>
                  <button className="ghost" onClick={() => void markOne(n.id)}>
                    Mark read
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
