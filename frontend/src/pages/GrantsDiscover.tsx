/**
 * Standalone funder discovery page - works without a grant created.
 * Powers the "Find funding opportunities" quick action.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FunderSummary, grantsApi } from "../api/grants";

const TYPE_OPTIONS = [
  { value: "international", label: "International" },
  { value: "research_council", label: "Research council" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "government", label: "Government" },
  { value: "industry", label: "Industry" },
  { value: "ngo", label: "NGO" },
];

export default function GrantsDiscover() {
  const [funders, setFunders] = useState<FunderSummary[]>([]);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [lmicOnly, setLmicOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    grantsApi
      .listFunders()
      .then((r) => setFunders(r.funders))
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return funders.filter((f) => {
      if (lmicOnly && !f.open_to_lmic) return false;
      if (types.length && !types.includes(f.funder_type)) return false;
      if (!q) return true;
      const hay = [
        f.name,
        f.acronym || "",
        ...(f.research_areas || []),
        ...(f.country_focus || []),
        f.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [funders, query, types, lmicOnly]);

  return (
    <div>
      <div className="row-between">
        <div>
          <h2>Funding opportunities</h2>
          <p className="muted">
            Browse the curated catalog of international funders. To get
            ranked matches against your specific project, open a grant and
            run the matcher there.
          </p>
        </div>
        <Link to="/grants" className="ghost-link">
          ← All grants
        </Link>
      </div>

      <div className="card">
        <div className="grid-2">
          <div>
            <label htmlFor="funder-query">Search funders</label>
            <input
              id="funder-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="topic, country, agency"
            />
          </div>
          <div>
            <label>Funder type</label>
            <div className="row-buttons">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  className={types.includes(t.value) ? "active" : "ghost"}
                  onClick={() =>
                    setTypes((ts) =>
                      ts.includes(t.value)
                        ? ts.filter((v) => v !== t.value)
                        : [...ts, t.value]
                    )
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="inline">
          <input
            type="checkbox"
            checked={lmicOnly}
            onChange={(e) => setLmicOnly(e.target.checked)}
          />
          LMIC-eligible only
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="project-grid">
        {filtered.map((f) => (
          <FunderCard key={f.name} funder={f} />
        ))}
        {!filtered.length && (
          <p className="muted">No funders match the current filters.</p>
        )}
      </div>
    </div>
  );
}

function FunderCard({ funder }: { funder: FunderSummary }) {
  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3>
          {funder.name}{" "}
          {funder.acronym && (
            <span className="chip">{funder.acronym}</span>
          )}
        </h3>
        <span className="muted">{funder.funder_type.replace(/_/g, " ")}</span>
      </div>
      <div className="project-card-stats">
        {funder.success_rate != null && (
          <span>~{Math.round(funder.success_rate * 100)}% success</span>
        )}
        {funder.typical_award_max_usd && (
          <span>
            up to USD {funder.typical_award_max_usd.toLocaleString()}
          </span>
        )}
        {funder.open_to_lmic && <span>LMIC OK</span>}
      </div>
      <p className="muted">
        {(funder.research_areas || []).slice(0, 4).join(", ")}
      </p>
      {funder.next_deadline_hint && (
        <p className="muted">Deadline: {funder.next_deadline_hint}</p>
      )}
      {funder.website && (
        <a href={funder.website} target="_blank" rel="noreferrer">
          Official site ↗
        </a>
      )}
    </div>
  );
}
