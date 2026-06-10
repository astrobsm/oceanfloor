import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { ApiError } from "../api/client";
import {
  forgotPassword,
  forgotUsername,
  registerUser,
  ROLE_LABELS,
  SELF_SIGNUP_ROLES,
  type Role,
} from "../api/auth";

type Mode = "login" | "register" | "forgot-username" | "forgot-password";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  // shared state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // register
  const [rUsername, setRUsername] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rFullName, setRFullName] = useState("");
  const [rRole, setRRole] = useState<Role>("researcher");

  // recovery
  const [recEmail, setRecEmail] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recUsername, setRecUsername] = useState("");

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  function switchMode(next: Mode) {
    resetMessages();
    setMode(next);
  }

  function describeError(e: unknown): string {
    if (e instanceof ApiError) return e.detail;
    if (e instanceof Error) return e.message;
    return "Something went wrong. Please try again.";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const res = await login(username, password);
      if (res.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const res = await registerUser({
        username: rUsername,
        email: rEmail,
        phone: rPhone || null,
        full_name: rFullName || null,
        role: rRole,
      });
      setNotice(res.detail);
      setUsername(res.user.username);
      setPassword("");
      setMode("login");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotUsername(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const res = await forgotUsername({
        email: recEmail || undefined,
        phone: recPhone || undefined,
      });
      setNotice(`${res.detail} Your username is "${res.username}".`);
      setUsername(res.username);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const res = await forgotPassword({
        username: recUsername,
        email: recEmail || undefined,
        phone: recPhone || undefined,
      });
      setNotice(res.detail);
      setUsername(recUsername);
      setMode("login");
    } catch (err) {
      setError(describeError(err));
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
            <p className="auth-tagline">Medical Research Assistant&trade;</p>
          </div>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {notice && <div className="auth-alert success">{notice}</div>}

        {mode === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <label>
              Username
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button className="auth-primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="auth-hint">
              First time signing in? Use your <strong>username</strong> as the
              password — you'll set a new one right away.
            </p>
            <div className="auth-links">
              <button type="button" onClick={() => switchMode("forgot-username")}>
                Forgot username?
              </button>
              <button type="button" onClick={() => switchMode("forgot-password")}>
                Forgot password?
              </button>
            </div>
            <div className="auth-divider">
              <span>New to OceanFloor?</span>
            </div>
            <button
              type="button"
              className="auth-secondary"
              onClick={() => switchMode("register")}
            >
              Create a profile
            </button>
          </form>
        )}

        {mode === "register" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2>Create your profile</h2>
            <label>
              Full name
              <input
                type="text"
                value={rFullName}
                onChange={(e) => setRFullName(e.target.value)}
                placeholder="Dr. Jane Doe"
              />
            </label>
            <label>
              Username
              <input
                type="text"
                value={rUsername}
                onChange={(e) => setRUsername(e.target.value)}
                placeholder="jane.doe"
                minLength={3}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={rEmail}
                onChange={(e) => setREmail(e.target.value)}
                placeholder="jane@hospital.org"
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={rPhone}
                onChange={(e) => setRPhone(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </label>
            <label>
              Role
              <select
                value={rRole}
                onChange={(e) => setRRole(e.target.value as Role)}
              >
                {SELF_SIGNUP_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <p className="auth-hint">
              Your initial password will be your username. You'll be prompted to
              change it after your first sign-in. Admin roles are assigned by a
              super admin.
            </p>
            <button className="auth-primary" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create profile"}
            </button>
            <button
              type="button"
              className="auth-text-link"
              onClick={() => switchMode("login")}
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot-username" && (
          <form className="auth-form" onSubmit={handleForgotUsername}>
            <h2>Recover username</h2>
            <p className="auth-hint">
              Enter the email or phone number you registered with.
            </p>
            <label>
              Email
              <input
                type="email"
                value={recEmail}
                onChange={(e) => setRecEmail(e.target.value)}
                placeholder="jane@hospital.org"
              />
            </label>
            <div className="auth-or">or</div>
            <label>
              Phone number
              <input
                type="tel"
                value={recPhone}
                onChange={(e) => setRecPhone(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </label>
            <button className="auth-primary" type="submit" disabled={busy}>
              {busy ? "Searching…" : "Find my username"}
            </button>
            <button
              type="button"
              className="auth-text-link"
              onClick={() => switchMode("login")}
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot-password" && (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <h2>Reset password</h2>
            <p className="auth-hint">
              Confirm your identity with the email or phone on file. Your
              password resets to your username and you'll set a new one on next
              sign-in.
            </p>
            <label>
              Username
              <input
                type="text"
                value={recUsername}
                onChange={(e) => setRecUsername(e.target.value)}
                placeholder="jane.doe"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={recEmail}
                onChange={(e) => setRecEmail(e.target.value)}
                placeholder="jane@hospital.org"
              />
            </label>
            <div className="auth-or">or</div>
            <label>
              Phone number
              <input
                type="tel"
                value={recPhone}
                onChange={(e) => setRecPhone(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </label>
            <button className="auth-primary" type="submit" disabled={busy}>
              {busy ? "Resetting…" : "Reset password"}
            </button>
            <button
              type="button"
              className="auth-text-link"
              onClick={() => switchMode("login")}
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
