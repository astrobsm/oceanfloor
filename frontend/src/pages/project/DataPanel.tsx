import { useEffect, useState } from "react";
import { DataArtifact, Project, projectsStore } from "../../store/projects";

const EMPTY: DataArtifact = { format: "csv", raw: "", variableNotes: "" };

export default function DataPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<DataArtifact>(
    project.artifacts.data ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.data ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: DataArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "data", next);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      save({
        ...local,
        format: file.name.toLowerCase().endsWith(".json") ? "json" : "csv",
        raw: text,
      });
    });
  }

  function parsed(): { headers: string[]; rows: string[][] } | null {
    if (local.format !== "csv" || !local.raw.trim()) return null;
    const lines = local.raw.trim().split(/\r?\n/);
    if (lines.length < 1) return null;
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1, 21).map((l) => l.split(","));
    return { headers, rows };
  }

  const preview = parsed();
  const lineCount = local.raw ? local.raw.trim().split(/\r?\n/).length : 0;

  return (
    <div>
      <div className="card">
        <h3>Import dataset</h3>
        <p className="muted">
          Paste your data below or upload a CSV/JSON file. The first CSV row
          must be the column headers. Variable types are inferred during
          analysis. (Backend never sees your raw rows unless you trigger an
          analysis.)
        </p>
        <div className="row-buttons">
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={onFileChange}
          />
          <select
            value={local.format}
            onChange={(e) =>
              save({ ...local, format: e.target.value as "csv" | "json" })
            }
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          {local.raw && (
            <button
              type="button"
              className="ghost danger"
              onClick={() => save({ ...local, raw: "" })}
            >
              Clear data
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Raw data</h3>
        <p className="muted">
          {lineCount > 0
            ? `${lineCount} rows (including header for CSV).`
            : "No data yet."}
        </p>
        <textarea
          rows={12}
          value={local.raw}
          onChange={(e) => save({ ...local, raw: e.target.value })}
          placeholder={
            local.format === "csv"
              ? "id,age,sex,group,outcome\n1,52,F,NPWT,12\n2,61,M,Control,18"
              : '[{"id":1,"age":52,"group":"NPWT","outcome":12}]'
          }
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        />
      </div>

      {preview && (
        <div className="card">
          <h3>Preview (first 20 rows)</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Variable notes / codebook</h3>
        <textarea
          rows={5}
          value={local.variableNotes}
          onChange={(e) => save({ ...local, variableNotes: e.target.value })}
          placeholder="age: years; sex: F/M; group: NPWT/Control; outcome: time-to-closure in weeks"
        />
      </div>
    </div>
  );
}
