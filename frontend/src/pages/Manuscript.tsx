import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface ManuscriptResponse {
  title: string;
  target_journal: string | null;
  citation_style: string;
  sections: Record<string, string>;
}

export default function Manuscript() {
  const [data, setData] = useState<ManuscriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<ManuscriptResponse>("/manuscripts/assemble", {
        title: form.get("title"),
        target_journal: form.get("target_journal") || null,
        citation_style: form.get("citation_style") || "vancouver",
        background: form.get("background") || null,
        methods: form.get("methods") || null,
        results: form.get("results") || null,
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
      <h2>Manuscript Writing</h2>
      <form className="card" onSubmit={submit}>
        <label>Title</label>
        <input name="title" required />
        <label>Target journal (optional)</label>
        <input name="target_journal" />
        <label>Citation style</label>
        <select name="citation_style" defaultValue="vancouver">
          <option value="vancouver">Vancouver</option>
          <option value="ama">AMA</option>
          <option value="apa7">APA 7</option>
          <option value="harvard">Harvard</option>
          <option value="nature">Nature</option>
        </select>
        <label>Background notes</label>
        <textarea name="background" rows={3} />
        <label>Methods notes</label>
        <textarea name="methods" rows={3} />
        <label>Results notes</label>
        <textarea name="results" rows={3} />
        <button type="submit" disabled={loading}>
          {loading ? "Assembling..." : "Assemble manuscript"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>
              {data.title}
              {data.target_journal && <span className="badge"> {data.target_journal}</span>}
              <span className="badge">{data.citation_style}</span>
            </h3>
            <SaveButton kind="manuscript" title={data.title} payload={data} />
          </div>
          {Object.entries(data.sections).map(([name, body]) => (
            <details key={name} className="section" open>
              <summary>{name}</summary>
              <pre>{body}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
