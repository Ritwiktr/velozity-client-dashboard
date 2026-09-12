import { useEffect, useState } from "react";
import { api } from "../api";
import { useRealtime } from "../socket";
import { activityLine } from "../lib/format";
import type { Activity } from "../types";

export function ActivityFeed({ projectId }: { projectId?: string }) {
  const { lastActivity } = useRealtime();
  const [events, setEvents] = useState<Activity[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams({ limit: "20" });
    if (projectId) qs.set("projectId", projectId);
    void api<{ events: Activity[] }>(`/api/activity?${qs.toString()}`).then((data) => setEvents(data.events));
  }, [projectId]);

  useEffect(() => {
    if (!lastActivity) return;
    if (projectId && lastActivity.projectId !== projectId) return;
    setEvents((prev) => [lastActivity, ...prev.filter((e) => e.id !== lastActivity.id)].slice(0, 20));
  }, [lastActivity, projectId]);

  return (
    <div className="card feed">
      <div className="label">Live activity</div>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{activityLine(event)}</li>
        ))}
      </ul>
    </div>
  );
}
