import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Client, Project } from "../types";

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const canManage = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";

  async function load() {
    const data = await api<{ projects: Project[] }>("/api/projects");
    setProjects(data.projects);
    if (canManage) {
      const c = await api<{ clients: Client[] }>("/api/clients");
      setClients(c.clients);
      if (!clientId && c.clients[0]) setClientId(c.clients[0].id);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  return (
    <div>
      <h1>Projects</h1>
      <p className="sub">PMs only see projects they created. Developers only see projects with assigned tasks.</p>
      {user?.role === "ADMIN" && (
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            void api("/api/clients", {
              method: "POST",
              body: JSON.stringify({ name: clientName }),
            }).then(() => {
              setClientName("");
              void load();
            });
          }}
        >
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="New client name" />
          <button className="primary">Add client</button>
        </form>
      )}
      {canManage && (
        <form
          className="card"
          style={{ display: "grid", gap: 10, margin: "12px 0 20px" }}
          onSubmit={(e) => {
            e.preventDefault();
            void api("/api/projects", {
              method: "POST",
              body: JSON.stringify({ name, description, clientId }),
            }).then(() => {
              setName("");
              setDescription("");
              void load();
            });
          }}
        >
          <div className="label">Create project</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="primary">Create</button>
        </form>
      )}
      <div className="grid">
        {projects.map((p) => (
          <Link className="card" key={p.id} to={`/projects/${p.id}`}>
            <strong>{p.name}</strong>
            <p className="sub">{p.client.name}</p>
            <p>{p.description}</p>
            <small>{p._count?.tasks ?? p.tasks?.length ?? 0} tasks · owner {p.createdBy.name}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
