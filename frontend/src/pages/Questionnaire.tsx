import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

type Format = "csv" | "redcap" | "kobotoolbox" | "odk";
type QType = "multiple_choice" | "likert" | "vas" | "numeric" | "date" | "free_text" | "matrix";

interface Item {
  code: string;
  text: string;
  type: QType;
  options: string;
  required: boolean;
}

interface ExportResponse {
  title: string;
  format: Format;
  content: string;
}

const emptyItem = (): Item => ({
  code: "",
  text: "",
  type: "free_text",
  options: "",
  required: true,
});

export default function Questionnaire() {
  const [title, setTitle] = useState("Wound Healing Questionnaire");
  const [items, setItems] = useState<Item[]>([
    { code: "AGE", text: "What is your age?", type: "numeric", options: "", required: true },
    {
      code: "PAIN",
      text: "Rate your pain (0-10)",
      type: "vas",
      options: "",
      required: true,
    },
  ]);
  const [format, setFormat] = useState<Format>("csv");
  const [result, setResult] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title,
        items: items.map((it) => ({
          code: it.code,
          text: it.text,
          type: it.type,
          options: it.options
            ? it.options.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          required: it.required,
        })),
      };
      const res = await apiPost<ExportResponse>(
        `/questionnaires/export/${format}`,
        payload
      );
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const ext = format === "redcap" ? "csv" : format === "odk" ? "xml" : format === "kobotoolbox" ? "tsv" : "csv";
    const blob = new Blob([result.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.title.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <h2>Questionnaire &amp; Data Collection</h2>
      <form className="card" onSubmit={submit}>
        <label>Instrument title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Items</label>
        {items.map((it, i) => (
          <div key={i} className="subform">
            <div className="grid-2">
              <div>
                <label>Code</label>
                <input
                  value={it.code}
                  onChange={(e) => update(i, { code: e.target.value.toUpperCase() })}
                  placeholder="AGE"
                  required
                />
              </div>
              <div>
                <label>Type</label>
                <select
                  value={it.type}
                  onChange={(e) => update(i, { type: e.target.value as QType })}
                >
                  <option value="free_text">Free text</option>
                  <option value="numeric">Numeric</option>
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="likert">Likert</option>
                  <option value="vas">VAS</option>
                  <option value="date">Date</option>
                  <option value="matrix">Matrix</option>
                </select>
              </div>
            </div>
            <label>Question text</label>
            <input
              value={it.text}
              onChange={(e) => update(i, { text: e.target.value })}
              required
            />
            <label>Options (comma-separated, for choice / likert / matrix)</label>
            <input
              value={it.options}
              onChange={(e) => update(i, { options: e.target.value })}
              placeholder="Strongly agree, Agree, Neutral, Disagree, Strongly disagree"
            />
            <label className="inline">
              <input
                type="checkbox"
                checked={it.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />{" "}
              Required
            </label>
            <button
              type="button"
              className="ghost danger"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              disabled={items.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="ghost" onClick={() => setItems([...items, emptyItem()])}>
          + Add item
        </button>

        <label>Export format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
          <option value="csv">CSV</option>
          <option value="redcap">REDCap data dictionary</option>
          <option value="kobotoolbox">Kobo XLSForm (TSV)</option>
          <option value="odk">ODK XForm (XML)</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Building..." : "Export"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {result && (
        <div className="card">
          <div className="row-between">
            <h3>
              {result.title} <span className="badge">{result.format}</span>
            </h3>
            <div className="row-buttons">
              <button type="button" onClick={downloadResult}>Download</button>
              <SaveButton kind="questionnaire" title={result.title} payload={result} />
            </div>
          </div>
          <pre>{result.content}</pre>
        </div>
      )}
    </div>
  );
}
