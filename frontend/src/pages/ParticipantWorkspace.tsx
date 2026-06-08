/**
 * ParticipantWorkspace - scoped data-entry view for participants who joined
 * via a PIN. URL: /participant/:shareId. Renders a minimal form that posts
 * each contribution as an activity entry on the share (logActivity); the
 * supervisor sees these live in CollaboratorsPanel.
 *
 * This intentionally does NOT mutate the project's localStorage in the
 * supervisor's browser - participants are remote users with no access to
 * the supervisor's local state.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collabApi } from "../api/collab";
import {
  clearStoredSession,
  getStoredSession,
} from "./JoinShare";

const KINDS = ["data_entry", "note", "upload", "edit"] as const;

interface Logged {
  at: number;
  kind: string;
  summary: string;
}

export default function ParticipantWorkspace() {
  const { shareId = "" } = useParams<{ shareId: string }>();
  const nav = useNavigate();
  const session = getStoredSession(shareId);

  const [kind, setKind] = useState<(typeof KINDS)[number]>("data_entry");
  const [step, setStep] = useState<string>(session?.allowed_steps[0] ?? "");
  const [summary, setSummary] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Logged[]>([]);

  useEffect(() => {
    if (!session) {
      nav(`/join/${shareId}`);
      return;
    }
    // session start ping (best effort)
    collabApi
      .logActivity(
        shareId,
        session.session_token,
        "session_start",
        "Joined data entry view"
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  if (!session) {
    return (
      <div className="card">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Local non-null alias so callbacks can use it without re-narrowing.
  const ses = session;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let payload: Record<string, unknown> | undefined;
      if (payloadText.trim()) {
        try {
          payload = JSON.parse(payloadText);
        } catch {
          payload = { raw: payloadText };
        }
      }
      const finalSummary = step ? `[${step}] ${summary.trim()}` : summary.trim();
      await collabApi.logActivity(
        shareId,
        ses.session_token,
        kind,
        finalSummary,
        payload
      );
      setRecent(
        [{ at: Date.now() / 1000, kind, summary: finalSummary }, ...recent].slice(0, 20)
      );
      setSummary("");
      setPayloadText("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await collabApi.logActivity(
        shareId,
        ses.session_token,
        "session_end",
        "Signed out"
      );
    } catch {
      /* ignore */
    }
    clearStoredSession(shareId);
    nav(`/join/${shareId}`);
  }

  return (
    <div style={{ maxWidth: "780px", margin: "2rem auto" }}>
      <div className="card">
        <h2>{ses.project_title}</h2>
        <p className="muted">
          Signed in as <strong>{ses.participant_name}</strong> ({ses.role}).
          Your duties:
        </p>
        {ses.duties.length > 0 ? (
          <ul>
            {ses.duties.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No specific duties were assigned.</p>
        )}
        <div className="row-buttons">
          <button className="ghost danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Add a contribution</h3>
        <p className="muted">
          Each contribution is logged to the project supervisor in real time.
          Use Data entry for new records, Note for observations, Upload to
          register a file you handed off externally, Edit for corrections.
        </p>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div>
              <label htmlFor="kind">Kind</label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="step">Step</label>
              <select
                id="step"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              >
                {ses.allowed_steps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="summary">Summary (visible to supervisor)</label>
          <input
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Recorded 12 new questionnaires from clinic A"
            required
          />
          <label htmlFor="payload">
            Payload (optional JSON or free text)
          </label>
          <textarea
            id="payload"
            rows={5}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            placeholder='{"clinic": "A", "count": 12}'
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || !summary.trim()}>
            {busy ? "Sending..." : "Submit"}
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h3>Your recent contributions</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.at * 1000).toLocaleTimeString()}</td>
                  <td>
                    <span className="chip">{r.kind}</span>
                  </td>
                  <td>{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
