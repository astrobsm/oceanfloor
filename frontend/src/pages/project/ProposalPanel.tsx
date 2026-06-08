import { useEffect, useState } from "react";
import { Project, ProposalArtifact, projectsStore } from "../../store/projects";

const EMPTY: ProposalArtifact = {
  background: "",
  aim: "",
  objectives: "",
  hypothesis: "",
  methods: "",
  ethics: "",
  timeline: "",
  budget: "",
};

const FIELDS: { key: keyof ProposalArtifact; label: string; rows: number; hint?: string }[] = [
  { key: "background", label: "Background & rationale", rows: 8, hint: "Pulls from your literature review - paraphrase, then cite using [@1], [@2,3] tokens." },
  { key: "aim", label: "Aim", rows: 2 },
  { key: "objectives", label: "Specific objectives", rows: 4 },
  { key: "hypothesis", label: "Hypothesis / research question", rows: 3 },
  { key: "methods", label: "Methods (design, setting, sampling, instruments, analysis)", rows: 12 },
  { key: "ethics", label: "Ethical considerations", rows: 4 },
  { key: "timeline", label: "Timeline (Gantt narrative)", rows: 4 },
  { key: "budget", label: "Budget (line items)", rows: 4 },
];

export default function ProposalPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<ProposalArtifact>(
    project.artifacts.proposal ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.proposal ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof ProposalArtifact>(k: K, v: ProposalArtifact[K]) {
    const next = { ...local, [k]: v };
    setLocal(next);
    projectsStore.patchArtifact(project.id, "proposal", next);
  }

  function seedFromIdea() {
    const idea = project.artifacts.idea;
    if (!idea) return;
    const aim = idea.question || EMPTY.aim;
    const objectives =
      `1. To describe ${idea.population || "the study population"}.\n` +
      `2. To assess ${idea.intervention || "the intervention/exposure"}` +
      (idea.comparator ? ` compared with ${idea.comparator}` : "") +
      `.\n3. To determine ${idea.outcome || "the primary outcome"}.`;
    update("aim", aim);
    update("objectives", objectives);
  }

  return (
    <div>
      <div className="card">
        <div className="row-between">
          <h3>Auto-seed from earlier steps</h3>
          <button type="button" onClick={seedFromIdea}>
            Seed aim & objectives from Idea step
          </button>
        </div>
        <p className="muted">
          You can fill the proposal manually or seed key fields from the Idea
          step. Background should be cited from your Literature review using
          tokens like <code>[@1]</code> - numbers auto-update if you change
          the literature corpus later.
        </p>
      </div>

      {FIELDS.map((f) => (
        <div className="card" key={f.key}>
          <h3>{f.label}</h3>
          {f.hint && <p className="muted">{f.hint}</p>}
          <textarea
            rows={f.rows}
            value={local[f.key]}
            onChange={(e) => update(f.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
