import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface ScoredIdea {
  title: string;
  rationale: string;
  research_gap: string;
  novelty_score: number;
  feasibility_score: number;
  impact_score: number;
  publication_potential: number;
  overall_score: number;
}

interface IdeaResponse {
  ideas: ScoredIdea[];
  disclaimer: string;
}

export default function Ideas() {
  const [data, setData] = useState<IdeaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<IdeaResponse>("/ideas/generate", {
        context: form.get("context"),
        discipline: form.get("discipline") || null,
        count: Number(form.get("count")),
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
      <h2>Research Idea Generation</h2>
      <form className="card" onSubmit={submit}>
        <label>Clinical context / observation</label>
        <textarea name="context" rows={3} required />
        <label>Discipline (optional)</label>
        <input name="discipline" placeholder="Wound Care, Nursing, Plastic Surgery…" />
        <label>Number of ideas</label>
        <input name="count" type="number" defaultValue="5" />
        <button type="submit" disabled={loading}>
          {loading ? "Generating…" : "Generate ideas"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>{data.ideas.length} ranked ideas</h3>
            <SaveButton kind="idea" title={`Ideas (${data.ideas.length})`} payload={data} />
          </div>
          <p className="disclaimer">{data.disclaimer}</p>
          {data.ideas.map((idea, i) => (
            <div key={i} style={{ marginBottom: "1rem" }}>
              <strong>
                #{i + 1} — {idea.title} (score {idea.overall_score})
              </strong>
              <p>{idea.rationale}</p>
              <em>Gap: {idea.research_gap}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
