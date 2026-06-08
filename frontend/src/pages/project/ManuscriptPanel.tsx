/**
 * ManuscriptPanel - assembles the project into a live IMRAD draft with
 * automatically-resolved in-text citations and a numbered bibliography.
 *
 * All sections (Background from Proposal, Methods from Proposal/Sample Size,
 * Results from Results, Discussion from Discussion) are read directly from
 * `project.artifacts` and re-rendered every time the user edits any upstream
 * step or adds more literature. The user only edits title/abstract/authors
 * locally.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ManuscriptArtifact,
  NUMERIC_CITATION_STYLES,
  Project,
  projectsStore,
  renderCitations,
} from "../../store/projects";

const EMPTY: ManuscriptArtifact = {
  title: "",
  authors: "",
  affiliations: "",
  abstract: "",
  keywords: "",
};

export default function ManuscriptPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<ManuscriptArtifact>(
    project.artifacts.manuscript ?? { ...EMPTY, title: project.title }
  );

  useEffect(() => {
    setLocal(
      project.artifacts.manuscript ?? { ...EMPTY, title: project.title }
    );
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: ManuscriptArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "manuscript", next);
  }

  const assembled = useMemo(
    () => assembleManuscript(project, local),
    [project, local]
  );

  return (
    <div>
      <div className="card">
        <h3>Title & front matter</h3>
        <label>Title</label>
        <input
          value={local.title}
          onChange={(e) => save({ ...local, title: e.target.value })}
        />
        <label>Authors (comma-separated)</label>
        <input
          value={local.authors}
          onChange={(e) => save({ ...local, authors: e.target.value })}
          placeholder="Smith JA, Doe RB, Lee K"
        />
        <label>Affiliations (one per line)</label>
        <textarea
          rows={3}
          value={local.affiliations}
          onChange={(e) => save({ ...local, affiliations: e.target.value })}
        />
        <label>Keywords (comma-separated)</label>
        <input
          value={local.keywords}
          onChange={(e) => save({ ...local, keywords: e.target.value })}
        />
      </div>

      <div className="card">
        <h3>Abstract</h3>
        <textarea
          rows={8}
          value={local.abstract}
          onChange={(e) => save({ ...local, abstract: e.target.value })}
          placeholder="Background ... Methods ... Results ... Conclusion ..."
        />
      </div>

      <div className="card">
        <h3>
          Live manuscript preview{" "}
          <span className="badge">{project.citationStyle}</span>{" "}
          <span className="badge">
            {project.artifacts.literature?.articles?.length ?? 0} refs
          </span>
        </h3>
        <p className="muted">
          Every section below is derived from the corresponding step in real
          time. To change a section, edit it in its own step - the manuscript
          updates automatically. In-text citations <code>[@n]</code> resolve
          against the current Literature corpus.
        </p>
        <div
          className="rendered-text"
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            background: "rgba(0,0,0,0.02)",
            padding: "1rem",
            borderRadius: "6px",
          }}
        >
          {assembled}
        </div>
      </div>
    </div>
  );
}

export function assembleManuscript(
  project: Project,
  ms: ManuscriptArtifact
): string {
  const a = project.artifacts;
  const articles = a.literature?.articles;
  const style = project.citationStyle;
  const cite = (txt: string) =>
    renderCitations(txt, articles, NUMERIC_CITATION_STYLES, style);

  const lines: string[] = [];
  lines.push(`# ${ms.title || project.title}`);
  if (ms.authors) lines.push("");
  if (ms.authors) lines.push(`**${ms.authors}**`);
  if (ms.affiliations) lines.push("");
  if (ms.affiliations) lines.push(ms.affiliations);
  if (ms.keywords) {
    lines.push("");
    lines.push(`*Keywords:* ${ms.keywords}`);
  }
  if (ms.abstract) {
    lines.push("");
    lines.push("## Abstract");
    lines.push("");
    lines.push(cite(ms.abstract));
  }

  // Introduction
  const introParts: string[] = [];
  if (a.proposal?.background) introParts.push(a.proposal.background);
  if (a.literature?.sections?.Introduction) {
    introParts.push(a.literature.sections.Introduction);
  }
  if (a.idea?.question) {
    introParts.push(`The research question of this study was: ${a.idea.question}`);
  }
  if (a.proposal?.aim) introParts.push(`**Aim:** ${a.proposal.aim}`);
  if (a.proposal?.objectives)
    introParts.push(`**Objectives:** ${a.proposal.objectives}`);
  if (introParts.length) {
    lines.push("");
    lines.push("## Introduction");
    lines.push("");
    lines.push(cite(introParts.join("\n\n")));
  }

  // Methods
  const methodsParts: string[] = [];
  if (a.proposal?.methods) methodsParts.push(a.proposal.methods);
  if (a.sample_size?.rationale)
    methodsParts.push(`**Sample size:** ${a.sample_size.rationale}`);
  if (a.questionnaire?.sections?.length) {
    const qLines = a.questionnaire.sections
      .map(
        (s) =>
          `- ${s.title}: ${s.items.filter(Boolean).length} item(s)`
      )
      .join("\n");
    methodsParts.push(`**Instrument:**\n${qLines}`);
  }
  if (a.ethics?.consent || a.ethics?.irb) {
    methodsParts.push(
      `**Ethics:** ${a.ethics.irb || ""} ${a.ethics.consent || ""}`.trim()
    );
  }
  if (a.analysis?.plan) methodsParts.push(`**Analysis plan:** ${a.analysis.plan}`);
  if (methodsParts.length) {
    lines.push("");
    lines.push("## Methods");
    lines.push("");
    lines.push(cite(methodsParts.join("\n\n")));
  }

  // Results
  if (a.results?.narrative) {
    lines.push("");
    lines.push("## Results");
    lines.push("");
    lines.push(a.results.narrative);
  } else if (a.analysis?.results) {
    lines.push("");
    lines.push("## Results");
    lines.push("");
    lines.push(a.analysis.results);
  }

  // Discussion
  if (a.discussion?.body) {
    lines.push("");
    lines.push("## Discussion");
    lines.push("");
    lines.push(cite(a.discussion.body));
  } else if (a.literature?.sections?.["Thematic Synthesis"]) {
    lines.push("");
    lines.push("## Discussion");
    lines.push("");
    lines.push(cite(a.literature.sections["Thematic Synthesis"]));
  }

  // Conclusion (use literature.Conclusion if present)
  if (a.literature?.sections?.Conclusion) {
    lines.push("");
    lines.push("## Conclusion");
    lines.push("");
    lines.push(cite(a.literature.sections.Conclusion));
  }

  // References
  if (a.literature?.rendered_references?.length) {
    lines.push("");
    lines.push("## References");
    lines.push("");
    a.literature.rendered_references.forEach((ref, i) => {
      lines.push(`${i + 1}. ${ref}`);
    });
  }

  return lines.join("\n");
}
