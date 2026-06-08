import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface DiscussionResponse {
  interpretation: string;
  comparison_with_literature: string;
  implications: string;
  limitations: string;
  future_directions: string;
}

export default function Discussion() {
  const [data, setData] = useState<DiscussionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const findings = String(form.get("findings") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiPost<DiscussionResponse>("/discussion/generate", {
        research_question: form.get("research_question"),
        key_findings: findings,
        discipline: form.get("discipline") || null,
        audience: form.get("audience"),
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
      <h2>Discussion &amp; Interpretation</h2>
      <form className="card" onSubmit={submit}>
        <label>Research question</label>
        <input name="research_question" required />
        <label>Key findings (one per line)</label>
        <textarea name="findings" rows={5} required />
        <label>Discipline (optional)</label>
        <input name="discipline" />
        <label>Audience</label>
        <select name="audience" defaultValue="clinical">
          <option value="clinical">Clinical</option>
          <option value="nursing">Nursing</option>
          <option value="surgical">Surgical</option>
          <option value="public_health">Public health</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Drafting..." : "Draft discussion"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>Discussion</h3>
            <SaveButton kind="discussion" title="Discussion draft" payload={data} />
          </div>
          {[
            ["Interpretation", data.interpretation],
            ["Comparison with literature", data.comparison_with_literature],
            ["Implications", data.implications],
            ["Limitations", data.limitations],
            ["Future directions", data.future_directions],
          ].map(([t, b]) => (
            <details key={t} className="section" open>
              <summary>{t}</summary>
              <p>{b}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
