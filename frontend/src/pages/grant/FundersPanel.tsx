/**
 * Funders panel - browse the catalog, run the matcher against the
 * project context, and select a funder.
 */
import { useEffect, useMemo, useState } from "react";
import {
  FunderSummary,
  GrantMatchItem,
  GrantMatchRequest,
  grantsApi,
} from "../../api/grants";
import { Grant, grantsStore } from "../../store/grants";

export default function FundersPanel({ grant }: { grant: Grant }) {
  const [funders, setFunders] = useState<FunderSummary[]>([]);
  const [matches, setMatches] = useState<GrantMatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    grantsApi
      .listFunders()
      .then((r) => setFunders(r.funders))
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return funders;
    return funders.filter((f) =>
      [f.name, f.acronym || "", ...(f.research_areas || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [funders, query]);

  async function runMatch() {
    setRunning(true);
    setError(null);
    try {
      const req: GrantMatchRequest = {
        title: grant.title,
        abstract: grant.executive_summary || grant.background,
        keywords: [],
        career_stage: (grant.career_stage as GrantMatchRequest["career_stage"]) ?? null,
        institution_country: grant.institution_country || null,
        is_lmic: grant.is_lmic,
        target_budget_usd: grant.target_budget_usd ?? null,
        target_duration_months: grant.target_duration_months ?? null,
        months_until_deadline: grant.months_until_deadline ?? null,
        limit: 12,
      };
      const res = await grantsApi.match(req);
      setMatches(res.matches);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  function toggleShortlist(name: string) {
    const next = grant.funder_shortlist.includes(name)
      ? grant.funder_shortlist.filter((n) => n !== name)
      : [...grant.funder_shortlist, name];
    grantsStore.update(grant.id, { funder_shortlist: next });
  }

  function select(name: string) {
    grantsStore.update(grant.id, { selected_funder: name });
  }

  return (
    <div>
      <div className="card">
        <h3>Run the matcher</h3>
        <p className="muted">
          Uses the overview fields (title, summary, career stage, country,
          budget, deadline) to score each funder across six dimensions.
        </p>
        <div className="row-buttons">
          <button onClick={runMatch} disabled={running}>
            {running ? "Matching..." : "Run matcher"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {matches.length > 0 && (
        <div className="card">
          <h3>Ranked matches</h3>
          <p className="muted">{matches.length} funders scored. Tap a row to view details.</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Funder</th>
                <th>Score</th>
                <th>Type</th>
                <th>Success</th>
                <th>Shortlist</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.funder.name}>
                  <td>
                    <strong>{m.funder.acronym || m.funder.name}</strong>
                    <div className="muted">{m.funder.name}</div>
                  </td>
                  <td>{(m.overall_score * 100).toFixed(0)}%</td>
                  <td>{m.funder.funder_type.replace(/_/g, " ")}</td>
                  <td>
                    {m.funder.success_rate != null
                      ? `~${Math.round(m.funder.success_rate * 100)}%`
                      : "—"}
                  </td>
                  <td>
                    <button
                      className={
                        grant.funder_shortlist.includes(m.funder.name)
                          ? "active"
                          : "ghost"
                      }
                      onClick={() => toggleShortlist(m.funder.name)}
                    >
                      {grant.funder_shortlist.includes(m.funder.name)
                        ? "✓ Shortlisted"
                        : "+ Shortlist"}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => select(m.funder.name)}>Select</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length > 0 && (
            <details className="section">
              <summary>Top match: dimension breakdown</summary>
              <ul>
                {matches[0].dimensions.map((d) => (
                  <li key={d.name}>
                    <strong>{d.name.replace(/_/g, " ")}</strong>:{" "}
                    {(d.score * 100).toFixed(0)}% — {d.rationale}
                  </li>
                ))}
              </ul>
              <ul>
                {matches[0].notes.map((n, i) => (
                  <li key={i} className="muted">
                    {n}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="card">
        <h3>Browse all funders</h3>
        <label htmlFor="funder-search">Filter</label>
        <input
          id="funder-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="name, area, country..."
        />
        <div className="project-grid">
          {filtered.map((f) => (
            <div key={f.name} className="project-card">
              <div className="project-card-header">
                <h3>{f.name}</h3>
                {f.acronym && <span className="chip">{f.acronym}</span>}
              </div>
              <div className="project-card-stats">
                <span>{f.funder_type.replace(/_/g, " ")}</span>
                {f.success_rate != null && (
                  <span>~{Math.round(f.success_rate * 100)}%</span>
                )}
                {f.typical_award_max_usd && (
                  <span>
                    up to USD {f.typical_award_max_usd.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="muted">{(f.research_areas || []).join(", ")}</p>
              <div className="row-buttons">
                <button
                  className="ghost"
                  onClick={() => toggleShortlist(f.name)}
                >
                  {grant.funder_shortlist.includes(f.name) ? "✓" : "+"}{" "}
                  Shortlist
                </button>
                <button onClick={() => select(f.name)}>Select</button>
                {f.website && (
                  <a
                    href={f.website}
                    target="_blank"
                    rel="noreferrer"
                    className="ghost-link"
                  >
                    Site ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Your shortlist</h3>
        {grant.funder_shortlist.length === 0 ? (
          <p className="muted">Shortlist is empty.</p>
        ) : (
          <ul>
            {grant.funder_shortlist.map((n) => (
              <li key={n}>
                {n}{" "}
                {grant.selected_funder === n && <span className="chip">Selected</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
