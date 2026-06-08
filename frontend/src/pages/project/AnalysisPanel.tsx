import { useEffect, useState } from "react";
import { apiPost } from "../../api/client";
import {
  AnalysisArtifact,
  Project,
  projectsStore,
} from "../../store/projects";

const EMPTY: AnalysisArtifact = { plan: "", results: "", tables: [] };

interface DescriptiveResponse {
  n: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
  iqr?: [number, number];
}

interface RecommendationResponse {
  recommended_test: string;
  alternatives: string[];
  rationale: string;
}

export default function AnalysisPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<AnalysisArtifact>(
    project.artifacts.analysis ?? EMPTY
  );
  const [column, setColumn] = useState("");
  const [outcomeType, setOutcomeType] = useState("continuous");
  const [groups, setGroups] = useState(2);
  const [paired, setPaired] = useState(false);
  const [normal, setNormal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocal(project.artifacts.analysis ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: AnalysisArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "analysis", next);
  }

  function extractColumn(name: string): number[] {
    const data = project.artifacts.data;
    if (!data?.raw) return [];
    if (data.format === "csv") {
      const lines = data.raw.trim().split(/\r?\n/);
      const headers = lines[0].split(",").map((h) => h.trim());
      const idx = headers.indexOf(name);
      if (idx === -1) return [];
      return lines
        .slice(1)
        .map((l) => Number(l.split(",")[idx]))
        .filter((n) => !Number.isNaN(n));
    }
    try {
      const arr = JSON.parse(data.raw) as Record<string, unknown>[];
      return arr
        .map((r) => Number(r[name]))
        .filter((n) => !Number.isNaN(n));
    } catch {
      return [];
    }
  }

  function columnOptions(): string[] {
    const data = project.artifacts.data;
    if (!data?.raw) return [];
    if (data.format === "csv") {
      return data.raw.split(/\r?\n/)[0].split(",").map((h) => h.trim());
    }
    try {
      const arr = JSON.parse(data.raw) as Record<string, unknown>[];
      return Object.keys(arr[0] ?? {});
    } catch {
      return [];
    }
  }

  async function runDescriptive() {
    if (!column) {
      setError("Select a numeric column.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const values = extractColumn(column);
      if (!values.length) {
        setError(`Column "${column}" has no numeric values.`);
        return;
      }
      const res = await apiPost<DescriptiveResponse>(
        "/statistics/descriptive",
        { data: values }
      );
      const md =
        `### Descriptive statistics - ${column} (n=${res.n})\n\n` +
        `| Statistic | Value |\n|---|---|\n` +
        `| Mean | ${fmt(res.mean)} |\n` +
        `| Median | ${fmt(res.median)} |\n` +
        `| SD | ${fmt(res.std_dev)} |\n` +
        `| Min | ${fmt(res.min)} |\n` +
        `| Max | ${fmt(res.max)} |\n` +
        (res.iqr
          ? `| IQR | ${fmt(res.iqr[0])} - ${fmt(res.iqr[1])} |\n`
          : "");
      const next: AnalysisArtifact = {
        ...local,
        results: (local.results ? local.results + "\n\n" : "") + md,
        tables: [...local.tables, md],
      };
      save(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function recommend() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost<RecommendationResponse>(
        "/statistics/recommend-test",
        {
          outcome_type: outcomeType,
          groups,
          paired,
          normal_distribution: normal,
        }
      );
      const md =
        `### Recommended test\n\n` +
        `- **Test:** ${res.recommended_test}\n` +
        `- **Alternatives:** ${res.alternatives.join(", ") || "none"}\n` +
        `- **Rationale:** ${res.rationale}\n`;
      save({
        ...local,
        plan: (local.plan ? local.plan + "\n\n" : "") + md,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cols = columnOptions();

  return (
    <div>
      <div className="card">
        <h3>Recommend a statistical test</h3>
        <div className="grid-2">
          <div>
            <label>Outcome type</label>
            <select
              value={outcomeType}
              onChange={(e) => setOutcomeType(e.target.value)}
            >
              <option value="continuous">Continuous</option>
              <option value="binary">Binary</option>
              <option value="categorical">Categorical</option>
              <option value="time-to-event">Time-to-event</option>
            </select>
          </div>
          <div>
            <label>Number of groups</label>
            <input
              type="number"
              value={groups}
              min={1}
              onChange={(e) => setGroups(Number(e.target.value))}
            />
          </div>
        </div>
        <label style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={paired}
            onChange={(e) => setPaired(e.target.checked)}
          />
          Paired / repeated measures
        </label>
        <label style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={normal}
            onChange={(e) => setNormal(e.target.checked)}
          />
          Normally distributed (assume yes if unsure)
        </label>
        <button type="button" onClick={recommend} disabled={busy}>
          Recommend test
        </button>
      </div>

      <div className="card">
        <h3>Descriptive statistics</h3>
        {cols.length === 0 ? (
          <p className="muted">
            Add a dataset in the Data step to enable descriptive statistics.
          </p>
        ) : (
          <>
            <label>Numeric column</label>
            <select value={column} onChange={(e) => setColumn(e.target.value)}>
              <option value="">-- pick a column --</option>
              {cols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" onClick={runDescriptive} disabled={busy}>
              Compute descriptives
            </button>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Analysis plan</h3>
        <textarea
          rows={6}
          value={local.plan}
          onChange={(e) => save({ ...local, plan: e.target.value })}
          placeholder="Describe the planned tests and pre-specified comparisons."
        />
      </div>

      <div className="card">
        <h3>Analysis output (auto-appended)</h3>
        <p className="muted">
          Every computation above is appended here as a markdown table. The
          Results step renders this directly.
        </p>
        <textarea
          rows={14}
          value={local.results}
          onChange={(e) => save({ ...local, results: e.target.value })}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        />
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "-";
  return Math.abs(n) < 0.01 || Math.abs(n) >= 1000
    ? n.toExponential(2)
    : n.toFixed(2);
}
