import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { useRealtime } from "../socket";
import { ActivityFeed } from "../components/ActivityFeed";
import { TaskTable } from "../components/TaskTable";
import type { Priority, Project, Task, TaskStatus } from "../types";

type DevUser = { id: string; name: string };

export function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lastTask } = useRealtime();
  const [project, setProject] = useState<Project | null>(null);
  const [devs, setDevs] = useState<DevUser[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const canManage = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";

  async function load() {
    if (!id) return;
    const data = await api<{ project: Project }>(`/api/projects/${id}`);
    setProject(data.project);
  }

  useEffect(() => {
    void load();
    if (canManage) {
      void api<{ users: DevUser[] }>("/api/users/assignable").then((d) => setDevs(d.users));
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (lastTask && lastTask.projectId === id) void load();
  }, [lastTask, id]);

  async function changeStatus(task: Task, status: TaskStatus) {
    await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
  }

  if (!project || !id) return <p>Loading…</p>;

  return (
    <div className="grid layout-2">
      <div>
        <h1>{project.name}</h1>
        <p className="sub">{project.client.name} · {project.createdBy.name}</p>
        <p>{project.description}</p>
        {canManage && (
          <form
            className="card"
            style={{ display: "grid", gap: 8, margin: "16px 0" }}
            onSubmit={(e) => {
              e.preventDefault();
              void api(`/api/tasks/projects/${id}`, {
                method: "POST",
                body: JSON.stringify({
                  title,
                  description,
                  assignedToId: assignedToId || null,
                  priority,
                  dueDate: new Date(dueDate).toISOString(),
                }),
              }).then(() => {
                setTitle("");
                setDescription("");
                void load();
              });
            }}
          >
            <div className="label">Add task</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" required />
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {devs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            <button className="primary">Create task</button>
          </form>
        )}
        <div className="card">
          <TaskTable tasks={project.tasks ?? []} onStatus={(t, s) => void changeStatus(t, s)} />
        </div>
      </div>
      <ActivityFeed projectId={id} />
    </div>
  );
}
