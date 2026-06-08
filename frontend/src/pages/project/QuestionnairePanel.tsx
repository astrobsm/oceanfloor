import { useEffect, useState } from "react";
import {
  Project,
  QuestionnaireArtifact,
  projectsStore,
} from "../../store/projects";

const EMPTY: QuestionnaireArtifact = { sections: [], notes: "" };

export default function QuestionnairePanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<QuestionnaireArtifact>(
    project.artifacts.questionnaire ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.questionnaire ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: QuestionnaireArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "questionnaire", next);
  }

  function addSection() {
    save({
      ...local,
      sections: [...local.sections, { title: "New section", items: [""] }],
    });
  }

  function updateSection(idx: number, patch: Partial<{ title: string; items: string[] }>) {
    const sections = local.sections.map((s, i) =>
      i === idx ? { ...s, ...patch } : s
    );
    save({ ...local, sections });
  }

  function removeSection(idx: number) {
    save({ ...local, sections: local.sections.filter((_, i) => i !== idx) });
  }

  function updateItem(sIdx: number, iIdx: number, v: string) {
    const items = local.sections[sIdx].items.map((it, i) =>
      i === iIdx ? v : it
    );
    updateSection(sIdx, { items });
  }

  function addItem(sIdx: number) {
    updateSection(sIdx, { items: [...local.sections[sIdx].items, ""] });
  }

  function removeItem(sIdx: number, iIdx: number) {
    updateSection(sIdx, {
      items: local.sections[sIdx].items.filter((_, i) => i !== iIdx),
    });
  }

  return (
    <div>
      <div className="card">
        <p className="muted">
          Draft your data-collection instrument here - typically demographics,
          exposure/intervention items, outcome items, and any validated scales
          you'll use. The questionnaire is saved per project and included in the
          exported manuscript appendix.
        </p>
        <button type="button" onClick={addSection}>
          + Add section
        </button>
      </div>

      {local.sections.map((sec, sIdx) => (
        <div className="card" key={sIdx}>
          <div className="row-between">
            <input
              value={sec.title}
              onChange={(e) => updateSection(sIdx, { title: e.target.value })}
              style={{ fontSize: "1.05rem", fontWeight: 600 }}
            />
            <button
              type="button"
              className="ghost danger"
              onClick={() => removeSection(sIdx)}
            >
              Remove section
            </button>
          </div>
          <ol style={{ marginTop: "0.6rem" }}>
            {sec.items.map((item, iIdx) => (
              <li
                key={iIdx}
                style={{ display: "flex", gap: "0.4rem", marginBottom: "0.3rem" }}
              >
                <input
                  value={item}
                  onChange={(e) => updateItem(sIdx, iIdx, e.target.value)}
                  placeholder="Question text"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="ghost danger"
                  onClick={() => removeItem(sIdx, iIdx)}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="ghost" onClick={() => addItem(sIdx)}>
            + Add question
          </button>
        </div>
      ))}

      <div className="card">
        <h3>Notes (validation, scoring, scales used)</h3>
        <textarea
          rows={5}
          value={local.notes}
          onChange={(e) => save({ ...local, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
