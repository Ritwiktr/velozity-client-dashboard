export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Client = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};

export type Task = {
  id: string;
  number: number;
  title: string;
  description: string;
  projectId: string;
  assignedToId: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  isOverdue: boolean;
  assignedTo?: { id: string; name: string; email: string } | null;
  project?: { id: string; name: string; createdById?: string };
  statusLogs?: Array<{
    id: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    createdAt: string;
    actor: { id: string; name: string };
  }>;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  client: Client;
  createdBy: { id: string; name: string; role: Role };
  tasks?: Task[];
  _count?: { tasks: number };
};

export type Activity = {
  id: string;
  type: string;
  actorName?: string;
  actor?: { name: string };
  projectId: string;
  taskId: string | null;
  taskNumber: number | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  summary: string;
  line?: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  taskId: string | null;
};
