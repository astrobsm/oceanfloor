import { useEffect, useState } from "react";
import {
  JournalArtifact,
  Project,
  projectsStore,
} from "../../store/projects";

const EMPTY: JournalArtifact = { shortlist: "", selected: "" };

const SUGGESTIONS: Record<string, string[]> = {
  medicine: [
    "BMJ Open",
    "The Lancet Regional Health",
    "JAMA Network Open",
    "PLOS Medicine",
  ],
  nursing: [
    "Journal of Advanced Nursing",
    "International Journal of Nursing Studies",
    "BMC Nursing",
    "Worldviews on Evidence-Based Nursing",
  ],
  public_health: [
    "BMC Public Health",
    "International Journal of Environmental Research and Public Health",
    "Frontiers in Public Health",
  ],
  pharmacy: [
    "BMC Pharmacology and Toxicology",
    "Frontiers in Pharmacology",
    "Pharmacy",
  ],
  dentistry: ["BMC Oral Health", "Journal of Dentistry", "Caries Research"],
  allied_health: ["BMC Health Services Research", "BMJ Quality & Safety"],
  biomedical_science: [
    "PLOS ONE",
    "Scientific Reports",
    "Frontiers in Bioengineering and Biotechnology",
  ],
  other: ["PLOS ONE", "BMJ Open"],
};

export default function JournalPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<JournalArtifact>(
    project.artifacts.journal ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.journal ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: JournalArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "journal", next);
  }

  const suggestions = SUGGESTIONS[project.field] ?? SUGGESTIONS.other;

  return (
    <div>
      <div className="card">
        <h3>Suggested journals for {project.field.replace(/_/g, " ")}</h3>
        <ul>
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  save({
                    ...local,
                    shortlist:
                      local.shortlist + (local.shortlist ? "\n" : "") + s,
                  })
                }
              >
                + {s}
              </button>
            </li>
          ))}
        </ul>
        <p className="muted">
          These are general suggestions for your field. Always verify scope,
          scope, impact factor, indexing (PubMed / Scopus / DOAJ), open-access
          fees, and reporting-guideline requirements (CONSORT, PRISMA, STROBE,
          SRQR) on the target journal's site.
        </p>
      </div>

      <div className="card">
        <h3>Shortlist</h3>
        <textarea
          rows={6}
          value={local.shortlist}
          onChange={(e) => save({ ...local, shortlist: e.target.value })}
          placeholder="One journal per line"
        />
      </div>

      <div className="card">
        <h3>Selected target journal</h3>
        <input
          value={local.selected}
          onChange={(e) => save({ ...local, selected: e.target.value })}
          placeholder="e.g. BMC Nursing"
        />
        <p className="muted">
          The selected journal is recorded with the project and printed on the
          exported title page.
        </p>
      </div>
    </div>
  );
}
