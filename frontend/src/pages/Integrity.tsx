import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface IntegrityResponse {
  similarity_assessment: string;
  attribution_coverage: number;
  missing_citations_flagged: number;
  notes: string;
  disclaimer: string;
}

export default function Integrity() {
  const [data, setData] = useState<IntegrityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const refs = String(form.get("references") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiPost<IntegrityResponse>("/integrity/assess", {
        text: form.get("text"),
        references: refs,
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
      <h2>Academic Integrity</h2>
      <p className="disclaimer">
        OceanFloor never claims zero plagiarism. This is a heuristic assessment of citation
        coverage and attribution patterns &mdash; not a substitute for a similarity-detection
        service like iThenticate or Turnitin.
      </p>
      <form className="card" onSubmit={submit}>
        <label>Manuscript text</label>
        <textarea name="text" rows={8} required placeholder="Paste your draft text..." />
        <label>References cited (one per line: DOI / PMID / title)</label>
        <textarea name="references" rows={4} />
        <button type="submit" disabled={loading}>
          {loading ? "Assessing..." : "Assess"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>Assessment</h3>
            <SaveButton kind="integrity" title="Integrity assessment" payload={data} />
          </div>
          <p>
            <strong>Similarity assessment:</strong> {data.similarity_assessment}
          </p>
          <p>
            <strong>Attribution coverage:</strong>{" "}
            {(data.attribution_coverage * 100).toFixed(1)}%
          </p>
          <p>
            <strong>Missing-citation flags:</strong> {data.missing_citations_flagged}
          </p>
          <p>{data.notes}</p>
          <p className="disclaimer">{data.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
