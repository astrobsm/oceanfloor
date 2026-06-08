import { FormEvent, useEffect, useState } from "react";
import { apiPost } from "../../api/client";
import {
  Project,
  SampleSizeArtifact,
  projectsStore,
} from "../../store/projects";

const DESIGNS = [
  { value: "cross_sectional", label: "Cross-sectional (single proportion)" },
  { value: "single_proportion", label: "Single proportion (Yamane/Cochran)" },
  { value: "single_mean", label: "Single mean" },
  { value: "cohort", label: "Cohort - two proportions" },
  { value: "case_control", label: "Case-control - two proportions" },
  { value: "rct_two_proportions", label: "RCT - two proportions" },
  { value: "rct_two_means", label: "RCT - two means" },
];

interface SampleSizeResponse {
  required_sample_size: number;
  per_group: Record<string, number> | null;
  adjusted_for_dropout: number;
  formula: string;
  assumptions: Record<string, number | string>;
}

export default function SampleSizePanel({ project }: { project: Project }) {
  const [design, setDesign] = useState(
    project.artifacts.sample_size?.test || "cross_sectional"
  );
  const [inputs, setInputs] = useState<Record<string, string>>(
    project.artifacts.sample_size?.inputs ?? {
      confidence_level: "0.95",
      power: "0.80",
      proportion: "0.5",
      margin_of_error: "0.05",
      p1: "0.30",
      p2: "0.50",
      mean_difference: "0.5",
      std_dev: "1.0",
      allocation_ratio: "1.0",
      dropout_rate: "0.10",
    }
  );
  const [result, setResult] = useState<SampleSizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project.artifacts.sample_size?.result) {
      try {
        setResult(JSON.parse(project.artifacts.sample_size.result));
      } catch {
        /* ignore */
      }
    }
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function num(k: string): number | undefined {
    const v = inputs[k];
    return v === "" || v === undefined ? undefined : Number(v);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        design,
        confidence_level: num("confidence_level"),
        power: num("power"),
        allocation_ratio: num("allocation_ratio"),
        dropout_rate: num("dropout_rate"),
      };
      if (design === "single_proportion" || design === "cross_sectional") {
        body.proportion = num("proportion");
        body.margin_of_error = num("margin_of_error");
      } else if (design === "single_mean") {
        body.mean_difference = num("mean_difference");
        body.std_dev = num("std_dev");
        body.margin_of_error = num("margin_of_error");
      } else if (design === "rct_two_proportions" || design === "cohort" || design === "case_control") {
        body.p1 = num("p1");
        body.p2 = num("p2");
      } else if (design === "rct_two_means") {
        body.mean_difference = num("mean_difference");
        body.std_dev = num("std_dev");
      }
      const res = await apiPost<SampleSizeResponse>(
        "/sample-size/calculate",
        body
      );
      setResult(res);
      const artifact: SampleSizeArtifact = {
        test: design,
        inputs,
        result: JSON.stringify(res),
        rationale: `Computed using ${res.formula}. Adjusted for ${(num("dropout_rate") ?? 0) * 100}% dropout.`,
      };
      projectsStore.patchArtifact(project.id, "sample_size", artifact);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function setInput(k: string, v: string) {
    setInputs({ ...inputs, [k]: v });
  }

  return (
    <div>
      <form className="card" onSubmit={submit}>
        <label>Calculation type</label>
        <select value={design} onChange={(e) => setDesign(e.target.value)}>
          {DESIGNS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <div className="grid-2">
          <div>
            <label>Confidence level (e.g. 0.95)</label>
            <input
              value={inputs.confidence_level}
              onChange={(e) => setInput("confidence_level", e.target.value)}
            />
          </div>
          <div>
            <label>Power (for comparative tests)</label>
            <input
              value={inputs.power}
              onChange={(e) => setInput("power", e.target.value)}
            />
          </div>
        </div>

        {(design === "single_proportion" || design === "cross_sectional") && (
          <div className="grid-2">
            <div>
              <label>Expected proportion (0-1)</label>
              <input
                value={inputs.proportion}
                onChange={(e) => setInput("proportion", e.target.value)}
              />
            </div>
            <div>
              <label>Margin of error (0-1)</label>
              <input
                value={inputs.margin_of_error}
                onChange={(e) => setInput("margin_of_error", e.target.value)}
              />
            </div>
          </div>
        )}

        {(design === "rct_two_proportions" ||
          design === "cohort" ||
          design === "case_control") && (
          <div className="grid-2">
            <div>
              <label>p1 (group 1 proportion)</label>
              <input
                value={inputs.p1}
                onChange={(e) => setInput("p1", e.target.value)}
              />
            </div>
            <div>
              <label>p2 (group 2 proportion)</label>
              <input
                value={inputs.p2}
                onChange={(e) => setInput("p2", e.target.value)}
              />
            </div>
          </div>
        )}

        {(design === "single_mean" || design === "rct_two_means") && (
          <div className="grid-2">
            <div>
              <label>Mean difference</label>
              <input
                value={inputs.mean_difference}
                onChange={(e) => setInput("mean_difference", e.target.value)}
              />
            </div>
            <div>
              <label>Standard deviation</label>
              <input
                value={inputs.std_dev}
                onChange={(e) => setInput("std_dev", e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid-2">
          <div>
            <label>Allocation ratio</label>
            <input
              value={inputs.allocation_ratio}
              onChange={(e) => setInput("allocation_ratio", e.target.value)}
            />
          </div>
          <div>
            <label>Dropout rate (0-1)</label>
            <input
              value={inputs.dropout_rate}
              onChange={(e) => setInput("dropout_rate", e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Calculating..." : "Calculate sample size"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <h3>Result</h3>
          <p>
            Required sample size: <strong>{result.required_sample_size}</strong>
          </p>
          <p>
            Adjusted for dropout: <strong>{result.adjusted_for_dropout}</strong>
          </p>
          {result.per_group && (
            <p>
              Per group:{" "}
              {Object.entries(result.per_group)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </p>
          )}
          <p className="muted">Formula: {result.formula}</p>
          <p className="muted">
            Assumptions: {JSON.stringify(result.assumptions)}
          </p>
        </div>
      )}
    </div>
  );
}
