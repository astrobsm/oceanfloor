import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface ProposalResponse {
  title: string;
  sections: Record<string, string>;
}

export default function Proposal() {
  const [data, setData] = useState<ProposalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<ProposalResponse>("/proposals/generate", {
        topic: form.get("topic"),
        discipline: form.get("discipline") || null,
        study_design: form.get("study_design") || null,
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
      <h2>Research Proposal</h2>
      <form className="card" onSubmit={submit}>
        <label>Topic</label>
        <input name="topic" required placeholder="Effect of NPWT on diabetic foot ulcer healing" />
        <label>Discipline (optional)</label>
        <input name="discipline" placeholder="Wound Care" />
        <label>Study design (optional)</label>
        <input name="study_design" placeholder="Randomized controlled trial" />
        <button type="submit" disabled={loading}>
          {loading ? "Drafting..." : "Generate proposal"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>{data.title}</h3>
            <SaveButton kind="proposal" title={data.title} payload={data} />
          </div>
          {Object.entries(data.sections).map(([name, body]) => (
            <details key={name} className="section">
              <summary>{name}</summary>
              <pre>{body}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
