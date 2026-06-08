import { useEffect, useState } from "react";
import { EthicsArtifact, Project, projectsStore } from "../../store/projects";

const EMPTY: EthicsArtifact = {
  consent: "",
  irb: "",
  conflicts: "",
  integrityNotes: "",
};

export default function EthicsPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<EthicsArtifact>(
    project.artifacts.ethics ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.ethics ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof EthicsArtifact>(k: K, v: EthicsArtifact[K]) {
    const next = { ...local, [k]: v };
    setLocal(next);
    projectsStore.patchArtifact(project.id, "ethics", next);
  }

  return (
    <div>
      <div className="card">
        <h3>Informed consent statement</h3>
        <p className="muted">
          Describe how voluntary, written/verbal informed consent will be
          obtained, including provisions for vulnerable groups.
        </p>
        <textarea
          rows={6}
          value={local.consent}
          onChange={(e) => update("consent", e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Institutional Review Board (IRB) / ethics committee</h3>
        <p className="muted">
          Name the IRB or research ethics committee, reference number (if
          known), and any other required regulatory approvals.
        </p>
        <textarea
          rows={4}
          value={local.irb}
          onChange={(e) => update("irb", e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Conflicts of interest & funding</h3>
        <textarea
          rows={3}
          value={local.conflicts}
          onChange={(e) => update("conflicts", e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Research integrity self-check</h3>
        <p className="muted">
          Plagiarism plan, data management, authorship criteria (ICMJE),
          AI-use disclosure, raw-data archival.
        </p>
        <textarea
          rows={5}
          value={local.integrityNotes}
          onChange={(e) => update("integrityNotes", e.target.value)}
        />
      </div>
    </div>
  );
}
