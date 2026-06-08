/**
 * Review panel - simulates a multi-voice review committee. Backend
 * returns reviewers (role/score/strengths/weaknesses/questions/
 * recommendation), an overall recommendation and decision probability.
 */
import { useState } from "react";
import { GrantReviewResponse, grantsApi } from "../../api/grants";
import { Grant } from "../../store/grants";

export default function ReviewPanel({ grant }: { grant: Grant }) {
  const [res, setRes] = useState<GrantReviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await grantsApi.review({
        title: grant.title,
        aims: grant.aims,
        background: grant.background,
        methodology: grant.methodology,
        budget_summary: grant.budget_narrative,
        impact: grant.impact,
        innovation: grant.innovation,
        moe: grant.moe_plan,
        sustainability: grant.sustainability,
        funder_priorities: grant.funder_priorities || null,
      });
      setRes(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Review simulator</h3>
        <p className="muted">
          Mirrors a typical study section: scientific reviewer, methodology
          reviewer, statistical reviewer, program officer.
        </p>
        <button onClick={run} disabled={busy}>
          {busy ? "Simulating..." : "Simulate review"}
        </button>
      </div>

      {res && (
        <>
          <div className="card">
            <h3>Committee outcome</h3>
            <p>
              <strong>Recommendation:</strong> {res.overall_recommendation}
            </p>
            <h4>Decision probability</h4>
            <ul>
              {Object.entries(res.decision_probability).map(([k, v]) => (
                <li key={k}>
                  {k.replace(/_/g, " ")}: {(v * 100).toFixed(0)}%
                </li>
              ))}
            </ul>
            <p>{res.committee_summary}</p>
            <p className="muted">{res.disclaimer}</p>
          </div>

          {res.reviewers.map((r, i) => (
            <div key={i} className="card">
              <h3>
                {r.role}{" "}
                <span className="chip">Score {r.score.toFixed(1)}</span>{" "}
                <span className="muted">{r.recommendation}</span>
              </h3>
              {r.strengths.length > 0 && (
                <>
                  <h4>Strengths</h4>
                  <ul>
                    {r.strengths.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              {r.weaknesses.length > 0 && (
                <>
                  <h4>Weaknesses</h4>
                  <ul>
                    {r.weaknesses.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              {r.questions.length > 0 && (
                <>
                  <h4>Questions</h4>
                  <ul>
                    {r.questions.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
