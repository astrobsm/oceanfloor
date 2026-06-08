import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface QualityResponse {
  overall_score: number;
  grade: string;
  breakdown: Record<string, number>;
  recommendations: string[];
}

const FIELDS = [
  ["methodology_score", "Methodology"],
  ["statistics_score", "Statistics"],
  ["citation_score", "Citation quality"],
  ["ethics_score", "Ethics & consent"],
  ["reporting_score", "Reporting completeness"],
  ["writing_score", "Writing & clarity"],
] as const;

export default function Quality() {
  const [data, setData] = useState<QualityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, number> = {};
    for (const [k] of FIELDS) payload[k] = Number(form.get(k));
    try {
      const res = await apiPost<QualityResponse>("/quality/score", payload);
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Quality Assurance</h2>
      <form className="card" onSubmit={submit}>
        <p className="muted">Rate each dimension from 0 to 10.</p>
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <label>{label}</label>
            <input
              name={k}
              type="number"
              step="0.5"
              min="0"
              max="10"
              defaultValue="7"
              required
            />
          </div>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? "Scoring..." : "Score"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>
              Overall: <strong>{data.overall_score.toFixed(2)}</strong>{" "}
              <span className="badge">{data.grade}</span>
            </h3>
            <SaveButton kind="quality" title={`QA: ${data.grade}`} payload={data} />
          </div>
          <h4>Breakdown</h4>
          <table className="kv">
            <tbody>
              {Object.entries(data.breakdown).map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Recommendations</h4>
          <ul>
            {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
