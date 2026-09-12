import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useRealtime } from "../socket";
import { ActivityFeed } from "../components/ActivityFeed";
import { TaskTable } from "../components/TaskTable";
import type { Task } from "../types";
import { formatStatus } from "../lib/format";

type AdminDash = {
  role: "ADMIN";
  totalProjects: number;
  tasksByStatus: Record<string, number>;
  overdueCount: number;
  onlineUsers: number;
};

type PmDash = {
  role: "PROJECT_MANAGER";
  totalProjects: number;
  tasksByPriority: Record<string, number>;
  upcomingThisWeek: Task[];
};

type DevDash = { role: "DEVELOPER"; tasks: Task[] };

export function DashboardPage() {
  const { user } = useAuth();
  const { onlineCount, lastTask } = useRealtime();
  const [admin, setAdmin] = useState<AdminDash | null>(null);
  const [pm, setPm] = useState<PmDash | null>(null);
  const [dev, setDev] = useState<DevDash | null>(null);

  async function load() {
    const data = await api<AdminDash | PmDash | DevDash>("/api/dashboard");
    if (data.role === "ADMIN") setAdmin(data);
    if (data.role === "PROJECT_MANAGER") setPm(data);
    if (data.role === "DEVELOPER") setDev(data);
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  useEffect(() => {
    if (lastTask) void load();
  }, [lastTask]);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="sub">Role-aware summary. Activity is filtered on the server.</p>
      {admin && (
        <div className="grid cards" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="label">Projects</div>
            <div className="value">{admin.totalProjects}</div>
          </div>
          {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((status) => (
            <div className="card" key={status}>
              <div className="label">{formatStatus(status)}</div>
              <div className="value">{admin.tasksByStatus[status] ?? 0}</div>
            </div>
          ))}
          <div className="card">
            <div className="label">Overdue</div>
            <div className="value">{admin.overdueCount}</div>
          </div>
          <div className="card">
            <div className="label">Online now</div>
            <div className="value">{onlineCount ?? admin.onlineUsers}</div>
          </div>
        </div>
      )}
      {pm && (
        <>
          <div className="grid cards" style={{ marginTop: 20 }}>
            <div className="card">
              <div className="label">My projects</div>
              <div className="value">{pm.totalProjects}</div>
            </div>
            {Object.entries(pm.tasksByPriority).map(([prio, count]) => (
              <div className="card" key={prio}>
                <div className="label">{prio}</div>
                <div className="value">{count}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="label">Due this week</div>
            <TaskTable tasks={pm.upcomingThisWeek} />
          </div>
        </>
      )}
      {dev && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="label">Assigned to me</div>
          <TaskTable tasks={dev.tasks} />
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <ActivityFeed />
      </div>
    </div>
  );
}
