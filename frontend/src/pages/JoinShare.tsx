/**
 * JoinShare - public landing page for project share links.
 * URL: /join/:shareId
 *
 * Flow: load public info (project name, active state) -> participant
 * enters name + 6-digit PIN -> on success store session token in
 * sessionStorage and forward to /participant/:shareId.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collabApi, JoinShareResponse } from "../api/collab";

interface PublicInfo {
  share_id: string;
  project_title: string;
  active: boolean;
  allowed_steps: string[];
}

const SESSION_KEY = (shareId: string) => `oceanfloor.session.${shareId}`;

export function getStoredSession(shareId: string): JoinShareResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(shareId));
    if (!raw) return null;
    return JSON.parse(raw) as JoinShareResponse;
  } catch {
    return null;
  }
}

export function clearStoredSession(shareId: string): void {
  sessionStorage.removeItem(SESSION_KEY(shareId));
}

export default function JoinShare() {
  const { shareId = "" } = useParams<{ shareId: string }>();
  const nav = useNavigate();
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = useMemo(() => getStoredSession(shareId), [shareId]);

  useEffect(() => {
    if (!shareId) return;
    collabApi
      .publicInfo(shareId)
      .then(setInfo)
      .catch((e) => setLoadError(String(e)));
  }, [shareId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !/^\d{4,8}$/.test(pin.trim())) {
      setError("Enter your name and the 6-digit PIN supplied by the supervisor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await collabApi.join(shareId, name.trim(), pin.trim());
      sessionStorage.setItem(SESSION_KEY(shareId), JSON.stringify(res));
      nav(`/participant/${shareId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="card">
        <h2>Share unavailable</h2>
        <p className="error">{loadError}</p>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="card">
        <p>Loading share...</p>
      </div>
    );
  }
  if (!info.active) {
    return (
      <div className="card">
        <h2>{info.project_title}</h2>
        <p>
          This share link has been deactivated. Please contact the project
          supervisor for renewed access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "520px", margin: "3rem auto" }}>
      <div className="card">
        <h2>Join project</h2>
        <h3>{info.project_title}</h3>
        <p className="muted">
          You will be able to contribute to: {info.allowed_steps.join(", ")}.
        </p>
        {existing && (
          <div className="status-banner">
            You already have an active session as{" "}
            <strong>{existing.participant_name}</strong>.{" "}
            <button
              className="ghost"
              onClick={() => nav(`/participant/${shareId}`)}
            >
              Resume
            </button>{" "}
            <button
              className="ghost danger"
              onClick={() => {
                clearStoredSession(shareId);
                window.location.reload();
              }}
            >
              Sign out
            </button>
          </div>
        )}
        <form onSubmit={submit}>
          <label htmlFor="join-name">Your name</label>
          <input
            id="join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="join-pin">6-digit PIN</label>
          <input
            id="join-pin"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
