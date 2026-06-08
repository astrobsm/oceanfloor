import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

type Measure = "nominal" | "ordinal" | "scale";
type VType = "numeric" | "string" | "date";

interface VarRow {
  name: string;
  label: string;
  measure: Measure;
  type: VType;
  width: number;
  decimals: number;
  values: string; // "1=Male,2=Female"
  missing: string; // "-99,-98"
}

interface Response {
  dictionary_csv: string;
  syntax_sps: string;
}

const empty = (): VarRow => ({
  name: "",
  label: "",
  measure: "scale",
  type: "numeric",
  width: 8,
  decimals: 2,
  values: "",
  missing: "",
});

function parseValues(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [k, ...rest] = pair.split("=");
      if (k && rest.length) out[k.trim()] = rest.join("=").trim();
    });
  return out;
}

export default function SPSS() {
  const [vars, setVars] = useState<VarRow[]>([
    { name: "sex", label: "Sex", measure: "nominal", type: "numeric", width: 1, decimals: 0, values: "1=Male,2=Female", missing: "-99" },
    { name: "pain", label: "Pain (0-10)", measure: "scale", type: "numeric", width: 2, decimals: 0, values: "", missing: "-99" },
  ]);
  const [res, setRes] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(i: number, patch: Partial<VarRow>) {
    setVars((p) => p.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        variables: vars.map((v) => ({
          name: v.name,
          label: v.label,
          measure: v.measure,
          type: v.type,
          width: v.width,
          decimals: v.decimals,
          values: parseValues(v.values),
          missing: v.missing.split(",").map((s) => s.trim()).filter(Boolean),
        })),
      };
      const data = await apiPost<Response>("/spss/data-dictionary", payload);
      setRes(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <h2>SPSS Compatibility</h2>
      <form className="card" onSubmit={submit}>
        <label>Variables</label>
        {vars.map((v, i) => (
          <div className="subform" key={i}>
            <div className="grid-2">
              <div>
                <label>Name</label>
                <input value={v.name} onChange={(e) => update(i, { name: e.target.value })} required />
              </div>
              <div>
                <label>Label</label>
                <input value={v.label} onChange={(e) => update(i, { label: e.target.value })} required />
              </div>
              <div>
                <label>Measure</label>
                <select value={v.measure} onChange={(e) => update(i, { measure: e.target.value as Measure })}>
                  <option value="nominal">Nominal</option>
                  <option value="ordinal">Ordinal</option>
                  <option value="scale">Scale</option>
                </select>
              </div>
              <div>
                <label>Type</label>
                <select value={v.type} onChange={(e) => update(i, { type: e.target.value as VType })}>
                  <option value="numeric">Numeric</option>
                  <option value="string">String</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div>
                <label>Width</label>
                <input type="number" value={v.width} onChange={(e) => update(i, { width: Number(e.target.value) })} />
              </div>
              <div>
                <label>Decimals</label>
                <input type="number" value={v.decimals} onChange={(e) => update(i, { decimals: Number(e.target.value) })} />
              </div>
            </div>
            <label>Value labels (e.g. <code>1=Male,2=Female</code>)</label>
            <input value={v.values} onChange={(e) => update(i, { values: e.target.value })} />
            <label>Missing codes (comma-separated)</label>
            <input value={v.missing} onChange={(e) => update(i, { missing: e.target.value })} />
            <button
              type="button"
              className="ghost danger"
              onClick={() => setVars(vars.filter((_, idx) => idx !== i))}
              disabled={vars.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="ghost" onClick={() => setVars([...vars, empty()])}>
          + Add variable
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Building..." : "Build dictionary + syntax"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {res && (
        <div className="card">
          <div className="row-between">
            <h3>SPSS artefacts</h3>
            <SaveButton kind="spss" title="SPSS data dictionary" payload={res} />
          </div>
          <h4>data_dictionary.csv</h4>
          <button type="button" onClick={() => download(res.dictionary_csv, "data_dictionary.csv", "text/csv")}>
            Download CSV
          </button>
          <pre>{res.dictionary_csv}</pre>
          <h4>syntax.sps</h4>
          <button type="button" onClick={() => download(res.syntax_sps, "syntax.sps", "text/plain")}>
            Download .sps
          </button>
          <pre>{res.syntax_sps}</pre>
        </div>
      )}
    </div>
  );
}
