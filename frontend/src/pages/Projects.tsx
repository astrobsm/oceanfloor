import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Project,
  ResearchField,
  StudyDesign,
  projectsStore,
  useProjects,
} from "../store/projects";

const FIELDS: { value: ResearchField; label: string }[] = [
  { value: "medicine", label: "Medicine" },
  { value: "nursing", label: "Nursing science" },
  { value: "public_health", label: "Public health / epidemiology" },
  { value: "pharmacy", label: "Pharmacy / pharmacology" },
  { value: "dentistry", label: "Dentistry" },
  { value: "allied_health", label: "Allied health" },
  { value: "biomedical_science", label: "Biomedical science" },
  { value: "other", label: "Other health science" },
];

const DESIGNS: { value: StudyDesign; label: string; suited: ResearchField[] }[] = [
  { value: "systematic_review", label: "Systematic review / meta-analysis", suited: [] },
  { value: "rct", label: "Randomized controlled trial", suited: [] },
  { value: "cohort", label: "Cohort study", suited: [] },
  { value: "case_control", label: "Case-control study", suited: [] },
  { value: "cross_sectional", label: "Cross-sectional / survey", suited: [] },
  { value: "case_series", label: "Case series / report", suited: [] },
  { value: "qualitative", label: "Qualitative study", suited: ["nursing"] },
  { value: "mixed_methods", label: "Mixed methods", suited: ["nursing"] },
  { value: "quality_improvement", label: "Quality improvement (QI)", suited: [] },
  { value: "secondary_analysis", label: "Secondary data analysis", suited: [] },
  { value: "other", label: "Other design", suited: [] },
];

export default function Projects() {
  const projects = useProjects();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="row-between">
        <div>
          <h2>Projects</h2>
          <p className="muted" style={{ marginTop: "-0.4rem" }}>
            Every research article starts here. Each project keeps its own idea,
            literature, proposal, data, results, discussion, and references in
            one live, auto-linked workspace.
          </p>
        </div>
        <button onClick={() => setCreating(true)}>+ New project</button>
      </div>

      {creating && (
        <NewProjectModal
          onClose={() => setCreating(false)}
          onCreated={() => setCreating(false)}
        />
      )}

      {projects.length === 0 ? (
        <div className="card">
          <h3>No projects yet</h3>
          <p>
            Click <strong>+ New project</strong> to start. You'll be guided
            through the full research pipeline - idea, literature, proposal,
            data, analysis, results, discussion, and export.
          </p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const lit = project.artifacts.literature;
  const refs = lit?.articles?.length ?? 0;
  const updated = new Date(project.updatedAt).toLocaleString();
  const stepLabel =
    project.currentStep === "overview" ? "Just created" : project.currentStep;
  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className="project-card-header">
        <h3>{project.title}</h3>
        <span className="badge">{project.design.replace(/_/g, " ")}</span>
      </div>
      <p className="muted">
        {project.field.replace(/_/g, " ")} - {project.citationStyle}
      </p>
      <div className="project-card-stats">
        <div>
          <strong>{refs}</strong>
          <span className="muted">refs</span>
        </div>
        <div>
          <strong>{Object.keys(project.artifacts).length}</strong>
          <span className="muted">sections</span>
        </div>
        <div>
          <strong>{stepLabel}</strong>
          <span className="muted">current step</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem" }}>
        Updated {updated}
      </p>
    </Link>
  );
}

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [field, setField] = useState<ResearchField>("medicine");
  const [design, setDesign] = useState<StudyDesign>("cross_sectional");
  const [style, setStyle] = useState("vancouver");

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = projectsStore.create({
      title,
      field,
      design,
      citationStyle: style,
    });
    onCreated(p);
    nav(`/projects/${p.id}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create a new project</h3>
        <form onSubmit={submit}>
          <label>Project title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NPWT vs standard dressing in diabetic foot ulcers - 2026"
            required
            autoFocus
          />
          <label>Health-science field</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value as ResearchField)}
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <label>Study design</label>
          <select
            value={design}
            onChange={(e) => setDesign(e.target.value as StudyDesign)}
          >
            {DESIGNS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <label>Default citation style</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="vancouver">Vancouver (numeric)</option>
            <option value="ama">AMA (numeric)</option>
            <option value="nature">Nature (numeric)</option>
            <option value="apa7">APA 7 (author-year)</option>
            <option value="harvard">Harvard (author-year)</option>
          </select>
          <div className="row-buttons" style={{ marginTop: "0.8rem" }}>
            <button type="submit">Create project</button>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
