import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface HypothesisResponse {
  null_hypothesis: string;
  alternative_hypothesis: string;
  recommended_tests: string[];
  assumption_checks: string[];
}

export default function Hypothesis() {
  const [data, setData] = useState<HypothesisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<HypothesisResponse>("/hypotheses/generate", {
        independent_variable: form.get("independent_variable"),
        dependent_variable: form.get("dependent_variable"),
        direction: form.get("direction") || null,
      });
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Hypothesis Engine</h2>
      <form className="card" onSubmit={submit}>
        <label>Independent variable (predictor / exposure)</label>
        <input name="independent_variable" required placeholder="NPWT vs standard dressing" />
        <label>Dependent variable (outcome)</label>
        <input name="dependent_variable" required placeholder="Time to wound closure (days)" />
        <label>Direction</label>
        <select name="direction" defaultValue="two-sided">
          <option value="two-sided">Two-sided</option>
          <option value="greater">Greater</option>
          <option value="less">Less</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Drafting..." : "Generate hypotheses"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>Hypotheses</h3>
            <SaveButton kind="hypothesis" title="Hypotheses" payload={data} />
          </div>
          <p><strong>H&#8320;:</strong> {data.null_hypothesis}</p>
          <p><strong>H&#8321;:</strong> {data.alternative_hypothesis}</p>
          <h4>Recommended tests</h4>
          <ul>{data.recommended_tests.map((t) => <li key={t}>{t}</li>)}</ul>
          <h4>Assumption checks</h4>
          <ul>{data.assumption_checks.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
