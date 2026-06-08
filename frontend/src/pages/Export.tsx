import { FormEvent, useState } from "react";
import { apiPostBlob, triggerDownload } from "../api/client";

type Format = "docx" | "pptx" | "xlsx" | "csv" | "json" | "md" | "html" | "latex";

interface Section {
  name: string;
  body: string;
}

const defaults: Section[] = [
  { name: "Abstract", body: "Brief structured summary of background, methods, results, conclusions." },
  { name: "Introduction", body: "Background and rationale." },
  { name: "Methods", body: "Design, participants, measures, analysis plan." },
  { name: "Results", body: "Findings with effect sizes and CIs." },
  { name: "Discussion", body: "Interpretation, implications, limitations." },
];

export default function ExportPage() {
  const [title, setTitle] = useState("Untitled Manuscript");
  const [format, setFormat] = useState<Format>("docx");
  const [sections, setSections] = useState<Section[]>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  function update(i: number, patch: Partial<Section>) {
    setSections((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sectionMap = Object.fromEntries(
        sections.filter((s) => s.name.trim()).map((s) => [s.name, s.body])
      );
      const { blob, filename } = await apiPostBlob("/export/manuscript", {
        format,
        title,
        sections: sectionMap,
      });
      triggerDownload(blob, filename);
      setLast(filename);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Export</h2>
      <form className="card" onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
          <option value="docx">DOCX (Word)</option>
          <option value="pptx">PPTX (PowerPoint)</option>
          <option value="xlsx">XLSX (Excel)</option>
          <option value="md">Markdown</option>
          <option value="html">HTML</option>
          <option value="latex">LaTeX</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>

        <label>Sections</label>
        {sections.map((s, i) => (
          <div className="subform" key={i}>
            <label>Section name</label>
            <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} required />
            <label>Body</label>
            <textarea
              rows={4}
              value={s.body}
              onChange={(e) => update(i, { body: e.target.value })}
            />
            <button
              type="button"
              className="ghost danger"
              onClick={() => setSections(sections.filter((_, idx) => idx !== i))}
              disabled={sections.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() => setSections([...sections, { name: "", body: "" }])}
        >
          + Add section
        </button>

        <button type="submit" disabled={loading}>
          {loading ? "Rendering..." : `Download .${format}`}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {last && <p className="muted">Last download: <code>{last}</code></p>}
      <p className="disclaimer">
        DOCX / PPTX / XLSX require <code>python-docx</code>, <code>python-pptx</code>, and
        <code>openpyxl</code> respectively on the backend. Markdown / HTML / JSON / CSV / LaTeX
        work without optional dependencies.
      </p>
    </div>
  );
}
