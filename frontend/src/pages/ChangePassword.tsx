import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { ApiError } from "../api/client";

export default function ChangePassword() {
  const { user, mustChangePassword, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forced = mustChangePassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (user && next.trim().toLowerCase() === user.username) {
      setError("New password cannot be the same as your username.");
      return;
    }

    setBusy(true);
    try {
      await changePassword(current, next);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else if (err instanceof Error) setError(err.message);
      else setError("Could not change password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/icon.png" alt="" className="auth-logo" />
          <div>
            <h1>OceanFloor</h1>
            <p className="auth-tagline">Secure your account</p>
          </div>
        </div>

        {forced && (
          <div className="auth-alert info">
            Welcome{user?.full_name ? `, ${user.full_name}` : ""}! For your
            security, please set a new password before continuing.
          </div>
        )}
        {error && <div className="auth-alert error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{forced ? "Set a new password" : "Change password"}</h2>
          <label>
            {forced ? "Current password (your username)" : "Current password"}
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={forced ? user?.username : "••••••••"}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-type new password"
              minLength={8}
              required
            />
          </label>
          <p className="auth-hint">
            Use at least 8 characters including a number. Avoid reusing your
            username.
          </p>
          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
          {!forced && (
            <button
              type="button"
              className="auth-text-link"
              onClick={() => navigate(-1)}
            >
              ← Cancel
            </button>
          )}
          {forced && (
            <button
              type="button"
              className="auth-text-link"
              onClick={() => logout()}
            >
              Sign out
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
