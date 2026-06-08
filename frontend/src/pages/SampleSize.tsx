import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface SampleSizeResponse {
  required_sample_size: number;
  per_group: Record<string, number> | null;
  adjusted_for_dropout: number;
  formula: string;
  assumptions: Record<string, number | string>;
}

export default function SampleSize() {
  const [design, setDesign] = useState("cross_sectional");
  const [result, setResult] = useState<SampleSizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      design,
      confidence_level: Number(form.get("confidence_level")),
      power: Number(form.get("power")),
      dropout_rate: Number(form.get("dropout_rate")),
    };
    // Include design-relevant fields when present.
    for (const key of ["proportion", "margin_of_error", "p1", "p2", "mean_difference", "std_dev"]) {
      const v = form.get(key);
      if (v) payload[key] = Number(v);
    }
    try {
      const data = await apiPost<SampleSizeResponse>("/sample-size/calculate", payload);
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Sample Size Calculator</h2>
      <form className="card" onSubmit={submit}>
        <label>Study design</label>
        <select value={design} onChange={(e) => setDesign(e.target.value)}>
          <option value="cross_sectional">Cross-sectional (single proportion)</option>
          <option value="single_mean">Single mean</option>
          <option value="rct_two_proportions">RCT — two proportions</option>
          <option value="case_control">Case-control</option>
          <option value="rct_two_means">RCT — two means</option>
          <option value="cohort">Cohort</option>
        </select>

        <label>Confidence level</label>
        <input name="confidence_level" type="number" step="0.01" defaultValue="0.95" />
        <label>Power</label>
        <input name="power" type="number" step="0.01" defaultValue="0.80" />
        <label>Expected proportion (p) / p1</label>
        <input name="proportion" type="number" step="0.01" placeholder="e.g. 0.5" />
        <input name="p1" type="number" step="0.01" placeholder="p1 (two-proportion designs)" />
        <label>Comparison proportion (p2)</label>
        <input name="p2" type="number" step="0.01" placeholder="p2" />
        <label>Margin of error</label>
        <input name="margin_of_error" type="number" step="0.01" placeholder="e.g. 0.05" />
        <label>Mean difference (Δ)</label>
        <input name="mean_difference" type="number" step="0.1" />
        <label>Standard deviation (σ)</label>
        <input name="std_dev" type="number" step="0.1" />
        <label>Dropout rate</label>
        <input name="dropout_rate" type="number" step="0.01" defaultValue="0.10" />

        <button type="submit" disabled={loading}>
          {loading ? "Calculating…" : "Calculate"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {result && (
        <div className="card">
          <div className="row-between">
            <h3>Result</h3>
            <SaveButton kind="sample-size" title={`n = ${result.adjusted_for_dropout} (${design})`} payload={result} />
          </div>
          <p>
            Required sample size: <strong>{result.required_sample_size}</strong>
            <br />
            Adjusted for dropout: <strong>{result.adjusted_for_dropout}</strong>
          </p>
          {result.per_group && <pre>{JSON.stringify(result.per_group, null, 2)}</pre>}
          <p>Formula: <code>{result.formula}</code></p>
          <pre>{JSON.stringify(result.assumptions, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
