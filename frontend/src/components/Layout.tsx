import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { Notifications } from "./Notifications";

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">VELOZITY DESK</div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          {user.role === "ADMIN" && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="user-card">
          <strong>{user.name}</strong>
          <span>{user.role.replace("_", " ")}</span>
          <button className="ghost" style={{ marginTop: 10 }} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div />
          <Notifications />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
