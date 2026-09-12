import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@velozity.test");
  const [password, setPassword] = useState("Passw0rd!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="brand">VELOZITY GLOBAL SOLUTIONS</div>
        <h1>Project Desk</h1>
        <p className="sub">Internal client delivery console</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            void login(email, password)
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false));
          }}
        >
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="accounts">
          Shared password: <code>Passw0rd!</code>
          <br />
          admin@velozity.test · pm.ravi@velozity.test · pm.meera@velozity.test
          <br />
          dev.arjun@velozity.test · dev.sara@velozity.test · dev.nikhil@velozity.test · dev.priya@velozity.test
        </p>
      </div>
    </div>
  );
}
