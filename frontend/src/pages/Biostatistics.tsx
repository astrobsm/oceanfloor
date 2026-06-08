import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface Descriptive {
  n: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness?: number;
}

interface TestRec {
  recommended_test: string;
  alternatives: string[];
  rationale: string;
}

export default function Biostatistics() {
  const [tab, setTab] = useState<"describe" | "recommend">("describe");
  return (
    <div>
      <h2>Biostatistics</h2>
      <div className="tabs">
        <button className={tab === "describe" ? "active" : "ghost"} onClick={() => setTab("describe")}>
          Descriptive statistics
        </button>
        <button className={tab === "recommend" ? "active" : "ghost"} onClick={() => setTab("recommend")}>
          Test recommendation
        </button>
      </div>
      {tab === "describe" ? <Describe /> : <Recommend />}
    </div>
  );
}

function Describe() {
  const [result, setResult] = useState<Descriptive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const raw = String(form.get("data") ?? "");
    const data = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    try {
      const res = await apiPost<Descriptive>("/statistics/descriptive", { data });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <label>Numeric series (comma- or whitespace-separated)</label>
      <textarea name="data" rows={4} required placeholder="2.3, 4.1, 5.7, 6.2, 8.0, 9.4" />
      <button type="submit" disabled={loading}>
        {loading ? "Computing..." : "Compute"}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <div className="row-between">
            <h3>Descriptive summary</h3>
            <SaveButton kind="statistics" title="Descriptive stats" payload={result} />
          </div>
          <table className="kv">
            <tbody>
              {Object.entries(result).map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{typeof v === "number" ? v.toFixed(4) : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </form>
  );
}

function Recommend() {
  const [result, setResult] = useState<TestRec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<TestRec>("/statistics/recommend-test", {
        outcome_type: form.get("outcome_type"),
        groups: Number(form.get("groups")),
        paired: form.get("paired") === "on",
        normal_distribution: form.get("normal_distribution") === "on",
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <label>Outcome type</label>
      <select name="outcome_type" defaultValue="continuous">
        <option value="continuous">Continuous</option>
        <option value="binary">Binary</option>
        <option value="categorical">Categorical</option>
        <option value="time-to-event">Time-to-event</option>
      </select>
      <label>Number of groups</label>
      <input name="groups" type="number" defaultValue="2" min="1" />
      <label className="inline">
        <input type="checkbox" name="paired" /> Paired / repeated measures
      </label>
      <label className="inline">
        <input type="checkbox" name="normal_distribution" defaultChecked /> Normally distributed
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Recommending..." : "Recommend test"}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <div className="row-between">
            <h3>Recommendation</h3>
            <SaveButton kind="statistics" title={`Test: ${result.recommended_test}`} payload={result} />
          </div>
          <p>
            <strong>{result.recommended_test}</strong>
          </p>
          <p className="muted">{result.rationale}</p>
          <p>
            <em>Alternatives:</em> {result.alternatives.join(", ")}
          </p>
        </>
      )}
    </form>
  );
}
