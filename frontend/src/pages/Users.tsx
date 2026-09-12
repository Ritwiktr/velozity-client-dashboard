import { useEffect, useState } from "react";
import { api } from "../api";
import type { AuthUser, Role } from "../types";

export function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Passw0rd!");
  const [role, setRole] = useState<Role>("DEVELOPER");

  async function load() {
    const data = await api<{ users: AuthUser[] }>("/api/users");
    setUsers(data.users);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <h1>Users</h1>
      <p className="sub">Admin-only. Roles are enforced again on every API route.</p>
      <form
        className="card"
        style={{ display: "grid", gap: 8, margin: "16px 0" }}
        onSubmit={(e) => {
          e.preventDefault();
          void api("/api/users", {
            method: "POST",
            body: JSON.stringify({ name, email, password, role }),
          }).then(() => {
            setName("");
            setEmail("");
            void load();
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="ADMIN">Admin</option>
          <option value="PROJECT_MANAGER">Project Manager</option>
          <option value="DEVELOPER">Developer</option>
        </select>
        <button className="primary">Create user</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
