import { Project, projectsStore, STEPS } from "../../store/projects";

export default function OverviewPanel({ project }: { project: Project }) {
  const literature = project.artifacts.literature;
  return (
    <div>
      <div className="card">
        <h3>Project metadata</h3>
        <label>Title</label>
        <input
          value={project.title}
          onChange={(e) =>
            projectsStore.update(project.id, { title: e.target.value })
          }
        />
        <div className="grid-2">
          <div>
            <label>Field</label>
            <input
              value={project.field.replace(/_/g, " ")}
              readOnly
              className="readonly"
            />
          </div>
          <div>
            <label>Design</label>
            <input
              value={project.design.replace(/_/g, " ")}
              readOnly
              className="readonly"
            />
          </div>
        </div>
        <label>Citation style (applies to all in-text citations and the bibliography)</label>
        <select
          value={project.citationStyle}
          onChange={(e) =>
            projectsStore.update(project.id, { citationStyle: e.target.value })
          }
        >
          <option value="vancouver">Vancouver (numeric)</option>
          <option value="ama">AMA (numeric)</option>
          <option value="nature">Nature (numeric)</option>
          <option value="apa7">APA 7 (author-year)</option>
          <option value="harvard">Harvard (author-year)</option>
        </select>
      </div>

      <div className="card">
        <h3>Recommended workflow</h3>
        <p className="muted">
          OceanFloor will walk you through the standard health-sciences
          research pipeline. You can jump between steps freely - sections that
          depend on each other (literature, discussion, manuscript) stay in
          sync automatically.
        </p>
        <ol className="workflow-list">
          {STEPS.filter((s) => s.key !== "overview").map((s) => (
            <li key={s.key}>
              <button
                className="ghost"
                onClick={() => projectsStore.setStep(project.id, s.key)}
              >
                {s.label}
              </button>
              <span className="muted"> - {s.hint}</span>
            </li>
          ))}
        </ol>
      </div>

      {literature && (
        <div className="card">
          <h3>Live status</h3>
          <p>
            Literature corpus: <strong>{literature.articles.length}</strong>{" "}
            articles. References everywhere in this project will renumber
            automatically when you add or remove articles.
          </p>
        </div>
      )}

      <div className="card danger-zone">
        <h3>Danger zone</h3>
        <button
          className="ghost danger"
          onClick={() => {
            if (window.confirm("Delete this project? This cannot be undone.")) {
              projectsStore.remove(project.id);
              window.location.hash = "#/projects";
            }
          }}
        >
          Delete project
        </button>
      </div>
    </div>
  );
}
