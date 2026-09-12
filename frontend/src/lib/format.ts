export function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function formatStatus(status: string) {
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
    default:
      return status;
  }
}

export function formatPriority(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function activityLine(event: {
  actorName?: string;
  actor?: { name: string };
  summary: string;
  line?: string;
  taskNumber: number | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}) {
  const actor = event.actorName ?? event.actor?.name ?? "Someone";
  const core =
    event.line ??
    (event.fromStatus && event.toStatus && event.taskNumber != null
      ? `${actor} moved Task #${event.taskNumber} from ${formatStatus(event.fromStatus)} → ${formatStatus(event.toStatus)}`
      : event.summary);
  return `${core} · ${timeAgo(event.createdAt)}`;
}
