import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Priority, Task, TaskStatus } from "../types";
import { formatPriority, formatStatus } from "../lib/format";

export function TaskFilters() {
  const [params, setParams] = useSearchParams();
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }
  return (
    <div className="filters">
      <select value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">All statuses</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
      </select>
      <select value={params.get("priority") ?? ""} onChange={(e) => set("priority", e.target.value)}>
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>
      <input type="datetime-local" value={toLocal(params.get("dueFrom"))} onChange={(e) => set("dueFrom", toIso(e.target.value))} />
      <input type="datetime-local" value={toLocal(params.get("dueTo"))} onChange={(e) => set("dueTo", toIso(e.target.value))} />
    </div>
  );
}

export function useTaskQuery() {
  const [params] = useSearchParams();
  return useMemo(() => {
    const qs = new URLSearchParams();
    for (const key of ["status", "priority", "dueFrom", "dueTo", "projectId", "overdue"]) {
      const v = params.get(key);
      if (v) qs.set(key, v);
    }
    return qs.toString();
  }, [params]);
}

export function TaskTable({
  tasks,
  onStatus,
}: {
  tasks: Task[];
  onStatus?: (task: Task, status: TaskStatus) => void;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Project</th>
          <th>Assignee</th>
          <th>Priority</th>
          <th>Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.number}</td>
            <td>
              {task.title}
              {task.isOverdue && task.status !== "DONE" && (
                <span className="pill overdue" style={{ marginLeft: 8 }}>
                  Overdue
                </span>
              )}
            </td>
            <td>{task.project?.name ?? "—"}</td>
            <td>{task.assignedTo?.name ?? "Unassigned"}</td>
            <td className={`prio ${task.priority}`}>{formatPriority(task.priority as Priority)}</td>
            <td>{new Date(task.dueDate).toLocaleDateString()}</td>
            <td>
              {onStatus ? (
                <select value={task.status} onChange={(e) => onStatus(task, e.target.value as TaskStatus)}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              ) : (
                <span className={`pill ${task.status}`}>{formatStatus(task.status)}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string) {
  if (!local) return "";
  return new Date(local).toISOString();
}
