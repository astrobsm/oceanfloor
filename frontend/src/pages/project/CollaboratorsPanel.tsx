/**
 * CollaboratorsPanel - supervisor-facing view for managing the project's
 * sharable link, PIN-issuing, participant activation, and live activity
 * tracking. Renders inside the project workspace at /projects/:id when
 * the user toggles the Collaborators view, and also at the dedicated
 * route /projects/:id/collaborators.
 *
 * Security note: tokens are intentionally stored locally inside the
 * project artifact (single-user dev). For multi-user prod move them to
 * an auth backend.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  collabApi,
  CreateShareResponse,
  SharePublic,
} from "../../api/collab";
import {
  CollaborationActivity,
  CollaborationArtifact,
  CollaborationParticipant,
  Project,
  projectsStore,
  STEP_KEYS,
  StepKey,
} from "../../store/projects";

const DEFAULT_ALLOWED: StepKey[] = ["literature", "questionnaire", "data"];

export default function CollaboratorsPanel({ project }: { project: Project }) {
  const artifact: CollaborationArtifact = project.artifacts.collaboration ?? {
    share_id: null,
    supervisor_token: null,
    allowed_steps: DEFAULT_ALLOWED,
    active: false,
    participants: [],
    activity: [],
    lastSyncAt: null,
  };

  const [allowedSteps, setAllowedSteps] = useState<string[]>(
    artifact.allowed_steps.length ? artifact.allowed_steps : DEFAULT_ALLOWED
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedPin, setRevealedPin] = useState<{
    participantId: string;
    pin: string;
  } | null>(null);
  const [revealedSupervisor, setRevealedSupervisor] = useState<string | null>(
    null
  );

  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addDuties, setAddDuties] = useState("");

  const shareUrl = useMemo(() => {
    if (!artifact.share_id) return "";
    return `${window.location.origin}/join/${artifact.share_id}`;
  }, [artifact.share_id]);

  function persist(next: Partial<CollaborationArtifact>) {
    projectsStore.patchArtifact(project.id, "collaboration", {
      ...artifact,
      ...next,
    });
  }

  function syncFromServer(view: SharePublic) {
    const participants: CollaborationParticipant[] = view.participants.map(
      (p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        duties: p.duties,
        active: p.active,
        created_at: p.created_at,
        deactivated_at: p.deactivated_at,
        last_seen_at: p.last_seen_at,
        entries_count: p.entries_count,
      })
    );
    const activity: CollaborationActivity[] = view.activity.map((a) => ({
      at: a.at,
      participant_id: a.participant_id,
      participant_name: a.participant_name,
      kind: a.kind,
      summary: a.summary,
    }));
    persist({
      active: view.active,
      allowed_steps: view.allowed_steps,
      participants,
      activity,
      lastSyncAt: Date.now(),
    });
  }

  async function createShare() {
    setBusy("create");
    setError(null);
    try {
      const r: CreateShareResponse = await collabApi.createShare(
        project.id,
        project.title,
        allowedSteps
      );
      const next: CollaborationArtifact = {
        share_id: r.share.id,
        supervisor_token: r.supervisor_token,
        allowed_steps: r.share.allowed_steps,
        active: r.share.active,
        participants: [],
        activity: [],
        lastSyncAt: Date.now(),
      };
      projectsStore.patchArtifact(project.id, "collaboration", next);
      setRevealedSupervisor(r.supervisor_token);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    if (!artifact.share_id || !artifact.supervisor_token) return;
    setBusy("refresh");
    setError(null);
    try {
      const view = await collabApi.supervisorView(
        artifact.share_id,
        artifact.supervisor_token
      );
      syncFromServer(view);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  // Live activity refresh while panel is open (every 10s).
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (!artifact.share_id || !artifact.supervisor_token || !artifact.active) {
      return;
    }
    intervalRef.current = window.setInterval(() => {
      refresh().catch(() => {});
    }, 10_000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact.share_id, artifact.supervisor_token, artifact.active]);

  async function addParticipant() {
    if (
      !artifact.share_id ||
      !artifact.supervisor_token ||
      !addName.trim() ||
      !addRole.trim()
    )
      return;
    setBusy("add");
    setError(null);
    try {
      const r = await collabApi.addParticipant(
        artifact.share_id,
        artifact.supervisor_token,
        {
          name: addName.trim(),
          role: addRole.trim(),
          duties: addDuties
            .split("\n")
            .map((d) => d.trim())
            .filter(Boolean),
        }
      );
      setRevealedPin({ participantId: r.participant.id, pin: r.pin });
      setAddName("");
      setAddRole("");
      setAddDuties("");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(p: CollaborationParticipant) {
    if (!artifact.share_id || !artifact.supervisor_token) return;
    setBusy("toggle-" + p.id);
    try {
      await collabApi.setActive(
        artifact.share_id,
        p.id,
        artifact.supervisor_token,
        !p.active
      );
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deactivateShare() {
    if (!artifact.share_id || !artifact.supervisor_token) return;
    if (!confirm("Deactivate the share link? Participants will lose access.")) {
      return;
    }
    setBusy("deactivate");
    try {
      const view = await collabApi.deactivateShare(
        artifact.share_id,
        artifact.supervisor_token
      );
      syncFromServer(view);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  function toggleStep(k: string) {
    if (artifact.share_id) return; // can't change after creation
    setAllowedSteps(
      allowedSteps.includes(k)
        ? allowedSteps.filter((s) => s !== k)
        : [...allowedSteps, k]
    );
  }

  // --- Render ---
  if (!artifact.share_id) {
    return (
      <div>
        <div className="card">
          <h3>Sharable link</h3>
          <p className="muted">
            Create a link other participants (research assistants, data
            collectors) can open to enter project data. Each participant gets a
            6-digit PIN that you generate, and you can deactivate them at any
            time. Activity is tracked in real time below.
          </p>
          <h4>Steps participants may use</h4>
          <div className="row-buttons" style={{ flexWrap: "wrap" }}>
            {STEP_KEYS.map((k) => (
              <button
                key={k}
                className={allowedSteps.includes(k) ? "active" : "ghost"}
                onClick={() => toggleStep(k)}
                type="button"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="row-buttons" style={{ marginTop: "1rem" }}>
            <button onClick={createShare} disabled={busy === "create"}>
              {busy === "create" ? "Creating..." : "Create share link"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <div className={"card " + (artifact.active ? "" : "disabled")}>
        <h3>
          Share link{" "}
          <span className="chip">{artifact.active ? "Active" : "Inactive"}</span>
        </h3>
        <div className="share-banner">
          <code style={{ wordBreak: "break-all" }}>{shareUrl}</code>
          <button className="ghost" onClick={() => copy(shareUrl)}>
            Copy URL
          </button>
        </div>
        {revealedSupervisor && (
          <div className="share-banner warning">
            <strong>Supervisor token (shown ONCE):</strong>
            <code style={{ wordBreak: "break-all" }}>{revealedSupervisor}</code>
            <button
              className="ghost"
              onClick={() => copy(revealedSupervisor)}
            >
              Copy
            </button>
            <button
              className="ghost"
              onClick={() => setRevealedSupervisor(null)}
            >
              Hide
            </button>
            <p className="muted">
              Save this in a password manager. It is also kept in this browser
              so you can manage the link, but treat it like a password.
            </p>
          </div>
        )}
        <p className="muted">
          Allowed steps: {artifact.allowed_steps.join(", ") || "(none)"}
        </p>
        <div className="row-buttons">
          <button onClick={refresh} disabled={busy === "refresh"}>
            {busy === "refresh" ? "..." : "Refresh now"}
          </button>
          {artifact.active && (
            <button
              className="ghost danger"
              onClick={deactivateShare}
              disabled={busy === "deactivate"}
            >
              Deactivate share
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Add participant</h3>
        <div className="grid-2">
          <div>
            <label htmlFor="part-name">Name</label>
            <input
              id="part-name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="part-role">Role</label>
            <input
              id="part-role"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              placeholder="data_collector, research_assistant..."
            />
          </div>
        </div>
        <label htmlFor="part-duties">Duties (one per line)</label>
        <textarea
          id="part-duties"
          rows={3}
          value={addDuties}
          onChange={(e) => setAddDuties(e.target.value)}
          placeholder="Recruit at clinic A&#10;Enter questionnaires&#10;Daily QA on yesterday's batch"
        />
        <button
          onClick={addParticipant}
          disabled={busy === "add" || !addName.trim() || !addRole.trim()}
        >
          {busy === "add" ? "Issuing PIN..." : "Issue PIN"}
        </button>
        {revealedPin && (
          <div className="share-banner warning">
            <strong>PIN (shown ONCE):</strong>{" "}
            <code style={{ fontSize: "1.5rem" }}>{revealedPin.pin}</code>
            <button className="ghost" onClick={() => copy(revealedPin.pin)}>
              Copy
            </button>
            <button className="ghost" onClick={() => setRevealedPin(null)}>
              Dismiss
            </button>
            <p className="muted">
              Share via a secure channel. The PIN is hashed server-side and
              cannot be recovered.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Participants ({artifact.participants.length})</h3>
        {artifact.participants.length === 0 ? (
          <p className="muted">No participants yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Active</th>
                <th>Entries</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {artifact.participants.map((p) => (
                <tr
                  key={p.id}
                  className={p.active ? "" : "participant-row inactive"}
                >
                  <td>
                    <strong>{p.name}</strong>
                    {p.duties.length > 0 && (
                      <div className="muted">{p.duties.join(" · ")}</div>
                    )}
                  </td>
                  <td>{p.role}</td>
                  <td>
                    {p.active ? "✓" : "—"}
                    {p.deactivated_at && (
                      <div className="muted">
                        {new Date(p.deactivated_at * 1000).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td>{p.entries_count}</td>
                  <td>
                    {p.last_seen_at
                      ? new Date(p.last_seen_at * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <button
                      className={p.active ? "ghost" : ""}
                      onClick={() => toggleActive(p)}
                      disabled={busy === "toggle-" + p.id}
                    >
                      {p.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Live activity</h3>
        <p className="muted">
          {artifact.lastSyncAt
            ? `Last refresh: ${new Date(artifact.lastSyncAt).toLocaleTimeString()}`
            : "Not yet refreshed."}
          {artifact.active && " · Auto-refreshing every 10s."}
        </p>
        {artifact.activity.length === 0 ? (
          <p className="muted">No activity recorded yet.</p>
        ) : (
          <div className="activity-feed">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Kind</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {[...artifact.activity].reverse().map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.at * 1000).toLocaleTimeString()}</td>
                    <td>{a.participant_name}</td>
                    <td>
                      <span className="chip">{a.kind}</span>
                    </td>
                    <td>{a.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
