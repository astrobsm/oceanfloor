import { useEffect, useState } from "react";
import {
  Project,
  ResultsArtifact,
  projectsStore,
} from "../../store/projects";

export default function ResultsPanel({ project }: { project: Project }) {
  const auto = project.artifacts.analysis?.results ?? "";
  const [local, setLocal] = useState<ResultsArtifact>(
    project.artifacts.results ?? { narrative: auto }
  );

  useEffect(() => {
    const fallback = project.artifacts.analysis?.results ?? "";
    setLocal(project.artifacts.results ?? { narrative: fallback });
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: ResultsArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "results", next);
  }

  function pullFromAnalysis() {
    save({ narrative: auto });
  }

  return (
    <div>
      <div className="card">
        <div className="row-between">
          <h3>Results narrative</h3>
          <button type="button" onClick={pullFromAnalysis}>
            Pull from Analysis step
          </button>
        </div>
        <p className="muted">
          Convert the raw analysis output into a publication-ready narrative.
          You can keep markdown tables verbatim - the exporter renders them as
          tables in Word / PDF.
        </p>
        <textarea
          rows={22}
          value={local.narrative}
          onChange={(e) => save({ narrative: e.target.value })}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        />
      </div>
    </div>
  );
}
