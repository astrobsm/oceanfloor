/**
 * Score panel - 10 numeric self-ratings (0-10) for fundability dimensions,
 * scored on the backend into an overall score, grade and recommendations.
 * Result is persisted onto the grant as `last_fundability`.
 */
import { useState } from "react";
import {
  FundabilityRequest,
  FundabilityResponse,
  grantsApi,
} from "../../api/grants";
import { Grant, grantsStore } from "../../store/grants";

const DIMS: { key: keyof FundabilityRequest; label: string; hint: string }[] = [
  { key: "significance", label: "Significance", hint: "Importance of the problem; gap addressed." },
  { key: "innovation", label: "Innovation", hint: "Novelty vs. existing work." },
  { key: "feasibility", label: "Feasibility", hint: "Can your team deliver in the timeline?" },
  { key: "impact", label: "Impact", hint: "Clinical, policy, economic, social impact pathways." },
  { key: "budget", label: "Budget realism", hint: "Costs justified, value for money." },
  { key: "sustainability", label: "Sustainability", hint: "Continuity post-grant." },
  { key: "funder_alignment", label: "Funder alignment", hint: "Match against stated funder priorities." },
  { key: "methodology", label: "Methodology", hint: "Design rigour; bias control; analysis plan." },
  { key: "team", label: "Team strength", hint: "Track record, complementary expertise." },
  { key: "moe", label: "M&E plan", hint: "KPIs, monitoring schedule, evaluation design." },
];

function initial(grant: Grant): FundabilityRequest {
  return {
    significance: 5,
    innovation: 5,
    feasibility: 5,
    impact: 5,
    budget: 5,
    sustainability: 5,
    funder_alignment: grant.funder_priorities ? 6 : 5,
    methodology: 5,
    team: 5,
    moe: 5,
  };
}

export default function ScorePanel({ grant }: { grant: Grant }) {
  const [scores, setScores] = useState<FundabilityRequest>(initial(grant));
  const [result, setResult] = useState<FundabilityResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await grantsApi.score(scores);
      setResult(r);
      grantsStore.update(grant.id, {
        last_fundability: {
          overall_score: r.overall_score,
          grade: r.grade,
          weaknesses: r.weaknesses,
          recommendations: r.recommendations,
        },
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function update(k: keyof FundabilityRequest, v: number) {
    setScores({ ...scores, [k]: Math.max(0, Math.min(10, v)) });
  }

  const stored = grant.last_fundability;

  return (
    <div>
      <div className="card">
        <h3>Self-rate each dimension (0-10)</h3>
        <p className="muted">
          Be brutally honest. The scoring engine weights dimensions and returns
          a grade A-E with targeted improvement recommendations.
        </p>
        {DIMS.map((d) => (
          <div key={d.key} className="grid-2">
            <div>
              <label htmlFor={"score-" + d.key}>{d.label}</label>
              <p className="muted">{d.hint}</p>
            </div>
            <div>
              <input
                id={"score-" + d.key}
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={scores[d.key]}
                onChange={(e) => update(d.key, Number(e.target.value))}
              />
              <span className="chip">{scores[d.key].toFixed(1)}</span>
            </div>
          </div>
        ))}
        <div className="row-buttons">
          <button onClick={run} disabled={busy}>
            {busy ? "Scoring..." : "Run scoring"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {(result || stored) && (
        <div className="card">
          <h3>
            Grade:{" "}
            <span className="chip">{result?.grade ?? stored?.grade}</span>{" "}
            <span className="muted">
              ({(result?.overall_score ?? stored?.overall_score ?? 0).toFixed(1)}{" "}
              / 100)
            </span>
          </h3>
          {result && (
            <>
              <h4>Weighted contribution by dimension</h4>
              <ul>
                {Object.entries(result.weighted).map(([k, v]) => (
                  <li key={k}>
                    {k.replace(/_/g, " ")}: {v.toFixed(1)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {result && result.strengths.length > 0 && (
            <>
              <h4>Strengths</h4>
              <ul>
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {(result?.weaknesses ?? stored?.weaknesses ?? []).length > 0 && (
            <>
              <h4>Weaknesses</h4>
              <ul>
                {(result?.weaknesses ?? stored?.weaknesses ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {(result?.recommendations ?? stored?.recommendations ?? []).length >
            0 && (
            <>
              <h4>Recommendations</h4>
              <ul>
                {(result?.recommendations ?? stored?.recommendations ?? []).map(
                  (s, i) => (
                    <li key={i}>{s}</li>
                  )
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
