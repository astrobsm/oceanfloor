import { useEffect, useState } from "react";
import { IdeaArtifact, Project, projectsStore } from "../../store/projects";

const EMPTY: IdeaArtifact = {
  problem: "",
  population: "",
  intervention: "",
  comparator: "",
  outcome: "",
  question: "",
};

export default function IdeaPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<IdeaArtifact>(
    project.artifacts.idea ?? EMPTY
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocal(project.artifacts.idea ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof IdeaArtifact>(k: K, v: IdeaArtifact[K]) {
    const next = { ...local, [k]: v };
    setLocal(next);
    projectsStore.patchArtifact(project.id, "idea", next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  function generateQuestion() {
    const parts: string[] = [];
    if (local.population) parts.push(`In ${local.population}`);
    if (local.intervention)
      parts.push(`does ${local.intervention}`);
    if (local.comparator)
      parts.push(`compared with ${local.comparator}`);
    if (local.outcome) parts.push(`affect ${local.outcome}?`);
    update("question", parts.join(", "));
  }

  return (
    <div>
      <div className="card">
        <h3>Problem statement</h3>
        <textarea
          rows={3}
          value={local.problem}
          onChange={(e) => update("problem", e.target.value)}
          placeholder="State the clinical or public-health problem this project addresses."
        />
      </div>

      <div className="card">
        <h3>PICO / PEO framing</h3>
        <p className="muted">
          For quantitative work use PICO (Population, Intervention, Comparator,
          Outcome). For qualitative work treat I/C as Exposure / Phenomenon of
          interest (PEO).
        </p>
        <label>Population</label>
        <input
          value={local.population}
          onChange={(e) => update("population", e.target.value)}
          placeholder="adults with type-2 diabetes and a chronic foot ulcer"
        />
        <label>Intervention / Exposure</label>
        <input
          value={local.intervention}
          onChange={(e) => update("intervention", e.target.value)}
          placeholder="negative pressure wound therapy (NPWT)"
        />
        <label>Comparator</label>
        <input
          value={local.comparator}
          onChange={(e) => update("comparator", e.target.value)}
          placeholder="standard moist wound dressing"
        />
        <label>Outcome</label>
        <input
          value={local.outcome}
          onChange={(e) => update("outcome", e.target.value)}
          placeholder="time to complete wound closure (weeks)"
        />
        <button type="button" onClick={generateQuestion}>
          Generate research question
        </button>
      </div>

      <div className="card">
        <h3>Research question</h3>
        <textarea
          rows={3}
          value={local.question}
          onChange={(e) => update("question", e.target.value)}
          placeholder="In adults with type-2 diabetes and a chronic foot ulcer, does NPWT compared with standard moist dressing affect time to complete wound closure?"
        />
        {saved && <p className="muted">Saved ✓</p>}
      </div>
    </div>
  );
}
