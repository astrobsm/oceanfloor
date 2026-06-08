import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface Suggestion {
  name: string;
  scope: string;
  indicative_impact_factor: number | null;
  open_access: boolean;
  fit_score: number;
  submission_url: string | null;
}

interface MatchResponse {
  suggestions: Suggestion[];
  note: string;
}

export default function JournalMatch() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<MatchResponse>("/journals/match", {
        title: form.get("title"),
        abstract: form.get("abstract"),
        discipline: form.get("discipline") || null,
        open_access_preferred: form.get("open_access_preferred") === "on",
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
      <h2>Journal Matching</h2>
      <form className="card" onSubmit={submit}>
        <label>Manuscript title</label>
        <input name="title" required />
        <label>Abstract</label>
        <textarea name="abstract" rows={5} required />
        <label>Discipline (optional)</label>
        <input name="discipline" placeholder="Wound Care, Plastic Surgery, Public Health..." />
        <label className="inline">
          <input type="checkbox" name="open_access_preferred" /> Prefer open access
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Matching..." : "Match journals"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>Suggestions</h3>
            <SaveButton kind="journal" title="Journal suggestions" payload={data} />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Journal</th>
                <th>Scope</th>
                <th>IF</th>
                <th>OA</th>
                <th>Fit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.suggestions.map((s) => (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.scope}</td>
                  <td>{s.indicative_impact_factor ?? "—"}</td>
                  <td>{s.open_access ? "Yes" : "No"}</td>
                  <td>{s.fit_score.toFixed(2)}</td>
                  <td>
                    {s.submission_url && (
                      <a href={s.submission_url} target="_blank" rel="noreferrer">Submit</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="disclaimer">{data.note}</p>
        </div>
      )}
    </div>
  );
}
