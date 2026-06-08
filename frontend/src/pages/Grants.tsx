/**
 * Grants dashboard - lists all grant proposals (linked or standalone)
 * with status filters and quick actions.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Grant, GrantStatus, grantsStore, useGrants } from "../store/grants";

const STATUS_TABS: { key: GrantStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
  { key: "funded", label: "Funded" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

export default function Grants() {
  const grants = useGrants();
  const [filter, setFilter] = useState<GrantStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? grants
        : grants.filter((g) => g.status === filter),
    [grants, filter]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: grants.length };
    for (const g of grants) out[g.status] = (out[g.status] || 0) + 1;
    return out;
  }, [grants]);

  return (
    <div>
      <div className="row-between">
        <div>
          <h2>Grants</h2>
          <p className="muted">
            Grant Writing Intelligence and Funding Optimization Engine
            (GWIFOE). Discover funders, draft competitive proposals, simulate
            review panels, and assemble submission-ready packages.
          </p>
        </div>
        <button onClick={() => setShowNew(true)}>+ Start new grant</button>
      </div>

      <div className="card">
        <div className="tabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={filter === t.key ? "active" : "ghost"}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <span className="chip">{counts[t.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="row-buttons" style={{ marginTop: "0.6rem" }}>
          <Link to="/grants/discover" className="ghost-link">
            Find funding opportunities
          </Link>
          <Link to="/grants/templates" className="ghost-link">
            View templates
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No grants here yet</h3>
          <p>
            Start a new grant to launch the guided wizard, or open the funder
            discovery page to explore opportunities first.
          </p>
          <button onClick={() => setShowNew(true)}>+ Start new grant</button>
        </div>
      ) : (
        <div className="project-grid">
          {filtered.map((g) => (
            <GrantCard key={g.id} grant={g} />
          ))}
        </div>
      )}

      {showNew && (
        <NewGrantModal onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

function GrantCard({ grant }: { grant: Grant }) {
  return (
    <Link className="project-card" to={`/grants/${grant.id}`}>
      <div className="project-card-header">
        <h3>{grant.title || "Untitled grant"}</h3>
        <span className="muted">
          {grant.selected_funder || "Funder TBD"}
        </span>
      </div>
      <div className="project-card-stats">
        <span>{grant.status}</span>
        <span>
          {grant.target_budget_usd
            ? `${grant.currency} ${grant.target_budget_usd.toLocaleString()}`
            : "Budget TBD"}
        </span>
        <span>{grant.progressPct}% complete</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          data-pct={grant.progressPct}
          style={{ width: `${grant.progressPct}%` }}
        />
      </div>
      <div className="project-card-updated">
        Updated {new Date(grant.updatedAt).toLocaleString()}
      </div>
    </Link>
  );
}

function NewGrantModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const nav = useNavigate();

  function create() {
    const g = grantsStore.create({ title });
    nav(`/grants/${g.id}`);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Start a new grant</h3>
        <p className="muted">
          You can rename the grant later, link it to a project, and target one
          or many funders.
        </p>
        <label htmlFor="grant-title-input">Working title</label>
        <input
          id="grant-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Improving postoperative wound care in rural Nigeria"
        />
        <div className="row-buttons" style={{ marginTop: "1rem" }}>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button onClick={create} disabled={!title.trim()}>
            Create grant
          </button>
        </div>
      </div>
    </div>
  );
}
