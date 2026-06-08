import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface Slide {
  title: string;
  bullets: string[];
  speaker_notes: string;
}

interface PresentationResponse {
  title: string;
  slides: Slide[];
}

export default function Presentation() {
  const [data, setData] = useState<PresentationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const sections = String(form.get("sections") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiPost<PresentationResponse>("/presentations/build", {
        title: form.get("title"),
        audience: form.get("audience"),
        sections,
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
      <h2>Presentation Builder</h2>
      <form className="card" onSubmit={submit}>
        <label>Deck title</label>
        <input name="title" required />
        <label>Audience</label>
        <input name="audience" defaultValue="academic defense" />
        <label>Sections (comma-separated; leave blank for default IMRAD)</label>
        <input name="sections" placeholder="Background, Methods, Results, Discussion, Conclusion" />
        <button type="submit" disabled={loading}>
          {loading ? "Building..." : "Build deck"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>{data.title}</h3>
            <SaveButton kind="presentation" title={data.title} payload={data} />
          </div>
          {data.slides.map((s, i) => (
            <div key={i} className="slide">
              <h4>
                Slide {i + 1}: {s.title}
              </h4>
              <ul>
                {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
              {s.speaker_notes && (
                <p className="muted">
                  <em>Notes:</em> {s.speaker_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
