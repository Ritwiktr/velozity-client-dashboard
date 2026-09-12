import { useEffect, useState } from "react";
import { api } from "../api";
import { useRealtime } from "../socket";
import { TaskFilters, TaskTable, useTaskQuery } from "../components/TaskTable";
import type { Task, TaskStatus } from "../types";

export function TasksPage() {
  const query = useTaskQuery();
  const { lastTask } = useRealtime();
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const data = await api<{ tasks: Task[] }>(`/api/tasks${query ? `?${query}` : ""}`);
    setTasks(data.tasks);
  }

  useEffect(() => {
    void load();
  }, [query]);

  useEffect(() => {
    if (lastTask) void load();
  }, [lastTask]);

  return (
    <div>
      <h1>Tasks</h1>
      <p className="sub">Filters are query parameters — copy the URL to share this view.</p>
      <TaskFilters />
      <div className="card">
        <TaskTable
          tasks={tasks}
          onStatus={(task, status: TaskStatus) => {
            void api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then(load);
          }}
        />
      </div>
    </div>
  );
}
