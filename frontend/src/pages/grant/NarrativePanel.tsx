/**
 * Narrative panel - the long-form proposal text divided into 10 standard
 * sections (executive summary -> dissemination). Each section is a free
 * textarea; citation tokens [@1] resolve against the linked project's
 * literature corpus if one is linked.
 */
import { useMemo, useState } from "react";
import { Grant, grantsStore } from "../../store/grants";
import {
  LiteratureUploadedArticle,
  NUMERIC_CITATION_STYLES,
  renderCitations,
  useProject,
} from "../../store/projects";

type SectionKey =
  | "executive_summary"
  | "background"
  | "significance"
  | "innovation"
  | "aims"
  | "methodology"
  | "workplan"
  | "impact"
  | "sustainability"
  | "dissemination";

const SECTIONS: { key: SectionKey; label: string; hint: string; rows: number }[] = [
  { key: "executive_summary", label: "Executive summary", hint: "150-250 words. Hooks the reviewer.", rows: 6 },
  { key: "background", label: "Background", hint: "Problem, epidemiology, gap analysis.", rows: 8 },
  { key: "significance", label: "Significance", hint: "Why this matters now; clinical/policy importance.", rows: 6 },
  { key: "innovation", label: "Innovation", hint: "Novelty vs. the state of the art.", rows: 6 },
  { key: "aims", label: "Specific aims", hint: "Numbered specific aims with measurable outcomes.", rows: 8 },
  { key: "methodology", label: "Methodology", hint: "Design, population, sample size, analysis plan, ethics.", rows: 10 },
  { key: "workplan", label: "Work plan", hint: "Milestones, timeline, team roles. Gantt-style description ok.", rows: 8 },
  { key: "impact", label: "Impact", hint: "Clinical, policy, economic, social impact pathways.", rows: 6 },
  { key: "sustainability", label: "Sustainability", hint: "Continuity after the grant ends.", rows: 5 },
  { key: "dissemination", label: "Dissemination", hint: "Publications, conferences, policy briefs, stakeholders.", rows: 5 },
];

export default function NarrativePanel({ grant }: { grant: Grant }) {
  const project = useProject(grant.projectId ?? undefined);
  const articles: LiteratureUploadedArticle[] = useMemo(
    () => project?.artifacts.literature?.articles ?? [],
    [project]
  );
  const style = project?.citationStyle || "vancouver";

  const [local, setLocal] = useState<Record<SectionKey, string>>({
    executive_summary: grant.executive_summary,
    background: grant.background,
    significance: grant.significance,
    innovation: grant.innovation,
    aims: grant.aims,
    methodology: grant.methodology,
    workplan: grant.workplan,
    impact: grant.impact,
    sustainability: grant.sustainability,
    dissemination: grant.dissemination,
  });
  const [active, setActive] = useState<SectionKey>("executive_summary");
  const [preview, setPreview] = useState(false);

  function save() {
    grantsStore.update(grant.id, local);
  }

  const cited = (text: string) =>
    renderCitations(text, articles, NUMERIC_CITATION_STYLES, style);

  return (
    <div>
      {project ? (
        <div className="status-banner">
          Linked to project <strong>{project.title}</strong> ({articles.length}{" "}
          reference{articles.length === 1 ? "" : "s"}). In-text tokens like{" "}
          <code>[@1]</code> or <code>[@SmithJA]</code> resolve live against the
          project's literature.
        </div>
      ) : (
        <div className="status-banner">
          Not linked to a project. Tokens like <code>[@1]</code> will appear as
          <code>[?1]</code> in preview. Link a project on the Overview step to
          enable live citations.
        </div>
      )}

      <div className="card">
        <div className="tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={active === s.key ? "active" : "ghost"}
              onClick={() => setActive(s.key)}
            >
              {s.label}
              {local[s.key] && <span className="chip">✓</span>}
            </button>
          ))}
        </div>

        {SECTIONS.filter((s) => s.key === active).map((s) => (
          <div key={s.key}>
            <h3>{s.label}</h3>
            <p className="muted">{s.hint}</p>
            <textarea
              aria-label={s.label}
              rows={s.rows}
              value={local[s.key]}
              onChange={(e) =>
                setLocal({ ...local, [s.key]: e.target.value })
              }
            />
            {preview && (
              <>
                <h4>Preview (citations resolved)</h4>
                <div className="rendered-text">{cited(local[s.key])}</div>
              </>
            )}
          </div>
        ))}

        <div className="row-buttons">
          <button onClick={save}>Save narrative</button>
          <button
            className={preview ? "active" : "ghost"}
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Hide preview" : "Show preview"}
          </button>
        </div>
      </div>

      <details className="section">
        <summary>Full preview (all sections, citations resolved)</summary>
        {SECTIONS.map((s) => (
          <div key={s.key}>
            <h4>{s.label}</h4>
            <div className="rendered-text">
              {cited(local[s.key]) || "(empty)"}
            </div>
          </div>
        ))}
      </details>
    </div>
  );
}
