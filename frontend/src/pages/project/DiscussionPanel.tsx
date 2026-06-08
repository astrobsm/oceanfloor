/**
 * DiscussionPanel - free-text discussion section with LIVE in-text citations.
 *
 * The user writes citation tokens like `[@1]`, `[@2,3]`, or `[@filenamePart]`
 * inside the body. As they type (or as literature changes), a live preview
 * resolves these tokens against `project.artifacts.literature.articles` and
 * displays the rendered text with proper numeric or author-year citations.
 *
 * Because the underlying article numbers can change when the user uploads
 * more literature, the *raw* text stays stable while the *rendered* text
 * always reflects the current corpus - no manual renumbering ever needed.
 */
import { useEffect, useMemo, useState } from "react";
import {
  DiscussionArtifact,
  NUMERIC_CITATION_STYLES,
  Project,
  projectsStore,
  renderCitations,
} from "../../store/projects";

const EMPTY: DiscussionArtifact = { body: "" };

export default function DiscussionPanel({ project }: { project: Project }) {
  const [local, setLocal] = useState<DiscussionArtifact>(
    project.artifacts.discussion ?? EMPTY
  );
  useEffect(() => {
    setLocal(project.artifacts.discussion ?? EMPTY);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(next: DiscussionArtifact) {
    setLocal(next);
    projectsStore.patchArtifact(project.id, "discussion", next);
  }

  const articles = project.artifacts.literature?.articles;
  const style = project.citationStyle;
  const rendered = useMemo(
    () => renderCitations(local.body, articles, NUMERIC_CITATION_STYLES, style),
    [local.body, articles, style]
  );

  function seed() {
    const literature = project.artifacts.literature;
    const results = project.artifacts.results?.narrative;
    const parts: string[] = [];
    parts.push("## Discussion\n");
    if (results) {
      parts.push(
        "This study found that [summarise key results from the Results step]."
      );
    }
    if (literature?.articles?.length) {
      parts.push(
        `Our findings align with previous work [@1${literature.articles.length > 1 ? ",2" : ""}], which reported similar trends.`
      );
      parts.push(
        "However, [contrast or extend the comparison with other studies in the corpus]."
      );
    }
    parts.push(
      "Strengths of this study include [...]. Limitations include [...]."
    );
    parts.push(
      "In conclusion, [restate the main message and clinical / practice implications]."
    );
    save({ body: parts.join("\n\n") });
  }

  return (
    <div>
      <div className="card">
        <div className="row-between">
          <h3>How to cite</h3>
          <button type="button" onClick={seed} disabled={Boolean(local.body)}>
            Insert discussion scaffold
          </button>
        </div>
        <p className="muted">
          Type <code>[@1]</code> for a single reference, <code>[@1,3]</code>{" "}
          for multiple, or <code>[@SmithJA]</code> /{" "}
          <code>[@partOfTitle]</code> to look up by author or title fragment.
          The preview below renumbers automatically when you upload more
          articles in the Literature step.
        </p>
      </div>

      <div className="card">
        <h3>Discussion (editable source)</h3>
        <textarea
          rows={22}
          value={local.body}
          onChange={(e) => save({ body: e.target.value })}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        />
      </div>

      <div className="card">
        <h3>
          Live preview <span className="badge">{style}</span>{" "}
          <span className="badge">
            {articles?.length ?? 0} refs available
          </span>
        </h3>
        {!articles?.length && (
          <p className="muted">
            No literature yet - upload articles in the Literature step to
            populate the reference list.
          </p>
        )}
        <div
          className="rendered-text"
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            background: "rgba(0,0,0,0.02)",
            padding: "0.8rem",
            borderRadius: "6px",
            minHeight: "8rem",
          }}
        >
          {rendered || (
            <span className="muted">
              The rendered discussion (with proper in-text citations) will
              appear here.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
