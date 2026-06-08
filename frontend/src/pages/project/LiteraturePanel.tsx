/**
 * LiteraturePanel - project-scoped, real-time-updating literature review.
 *
 * Files are kept in component state (because File objects cannot be persisted
 * to localStorage). The review response itself (sections, articles, rendered
 * references) IS persisted into `project.artifacts.literature` so the
 * Discussion and Manuscript panels can derive live in-text citations from it.
 *
 * When the user adds files (and has not manually edited any section) the
 * review re-runs after a short debounce, refreshing the corpus and renumbering
 * citations everywhere in the project.
 */
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiPostMultipart } from "../../api/client";
import {
  LiteratureArtifact,
  LiteratureUploadedArticle,
  Project,
  projectsStore,
} from "../../store/projects";

interface ReviewResponse {
  query: string;
  style: string;
  sections: Record<string, string>;
  articles: LiteratureUploadedArticle[];
  rendered_references: string[];
  note: string;
}

const SECTION_ORDER = [
  "Introduction",
  "Thematic Synthesis",
  "Methodological Appraisal",
  "Knowledge Gaps",
  "Conclusion",
];

export default function LiteraturePanel({ project }: { project: Project }) {
  const stored = project.artifacts.literature;
  const [files, setFiles] = useState<File[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>(
    stored?.sections ?? {}
  );
  const [focus, setFocus] = useState(stored?.focus ?? "");
  const [style, setStyle] = useState(stored?.style ?? project.citationStyle);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSubmittedKeys = stored?.fileKeys ?? [];

  function fileKey(f: File): string {
    return `${f.name}-${f.size}`;
  }

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...Array.from(picked)].forEach((f) =>
        map.set(fileKey(f), f)
      );
      return Array.from(map.values());
    });
  }

  function hasUserEdits(): boolean {
    if (!stored) return false;
    return SECTION_ORDER.some(
      (n) => n in stored.sections && edited[n] !== stored.sections[n]
    );
  }

  async function runReview(filesToSend: File[]) {
    if (!filesToSend.length) {
      setError("Add at least one file.");
      return;
    }
    setError(null);
    setLoading(true);
    setStatus(null);
    const payload = new FormData();
    filesToSend.forEach((f) => payload.append("files", f, f.name));
    payload.append("style", style);
    if (focus) payload.append("focus", focus);
    try {
      const res = await apiPostMultipart<ReviewResponse>(
        "/literature/review-uploads",
        payload
      );
      const artifact: LiteratureArtifact = {
        style,
        focus,
        query: project.title,
        fileKeys: filesToSend.map(fileKey),
        sections: res.sections,
        articles: res.articles,
        rendered_references: res.rendered_references,
        note: res.note,
        updatedAt: Date.now(),
      };
      projectsStore.patchArtifact(project.id, "literature", artifact);
      setEdited({ ...res.sections });
      const prev = lastSubmittedKeys.length;
      if (prev > 0) {
        const delta = filesToSend.length - prev;
        setStatus(
          delta > 0
            ? `Review refreshed: ${delta} new article(s) added, citations renumbered across the whole project (${res.articles.length} total).`
            : `Review refreshed (${res.articles.length} article(s)).`
        );
      } else {
        setStatus(
          `Initial review built from ${res.articles.length} article(s). Discussion and manuscript citations will now reference these.`
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!stored) return;
    if (!autoUpdate) return;
    if (!files.length) return;
    const currentKeys = files.map(fileKey).sort().join("|");
    const lastKeys = [...lastSubmittedKeys].sort().join("|");
    if (currentKeys === lastKeys) return;
    if (hasUserEdits()) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runReview(files), 900);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, autoUpdate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runReview(files);
  }

  function saveEdits() {
    if (!stored) return;
    projectsStore.patchArtifact(project.id, "literature", {
      ...stored,
      sections: edited,
      updatedAt: Date.now(),
    });
    setStatus("Edits saved to the project.");
  }

  async function updateNow() {
    if (hasUserEdits()) {
      const ok = window.confirm(
        "You have edited one or more sections. Re-running will replace them " +
          "with a fresh draft (citation numbers will renumber). Continue?"
      );
      if (!ok) return;
    }
    await runReview(files);
  }

  const totalMb = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
  const currentKeys = files.map(fileKey).sort().join("|");
  const lastKeys = [...lastSubmittedKeys].sort().join("|");
  const pendingFiles = files.filter(
    (f) => !lastSubmittedKeys.includes(fileKey(f))
  );
  const isOutOfSync =
    stored !== undefined && currentKeys !== lastKeys && files.length > 0;

  return (
    <div>
      <form className="card" onSubmit={submit}>
        <label>Add articles (PDF, DOCX, TXT, MD)</label>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        {files.length > 0 && (
          <div className="file-list">
            <p className="muted">
              {files.length} file(s) selected, {totalMb.toFixed(1)} MB total
              {stored && (
                <>
                  {" - "}
                  <strong>{lastSubmittedKeys.length}</strong> in current review
                  {pendingFiles.length > 0 && (
                    <>
                      ,{" "}
                      <strong style={{ color: "var(--accent, #1f6feb)" }}>
                        {pendingFiles.length} new pending
                      </strong>
                    </>
                  )}
                </>
              )}
            </p>
            <ul>
              {files.map((f, i) => {
                const isNew =
                  stored !== undefined &&
                  !lastSubmittedKeys.includes(fileKey(f));
                return (
                  <li key={fileKey(f)}>
                    <span>
                      {f.name}
                      {isNew && (
                        <span className="badge" style={{ marginLeft: "0.4rem" }}>
                          new
                        </span>
                      )}
                    </span>
                    <span className="muted">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() =>
                        setFiles(files.filter((_, idx) => idx !== i))
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="ghost"
              onClick={() => setFiles([])}
            >
              Clear selection
            </button>
          </div>
        )}
        <label>Focus / sub-question (optional)</label>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. effect on time-to-closure in DFU"
        />
        <label>Citation style</label>
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="vancouver">Vancouver</option>
          <option value="ama">AMA</option>
          <option value="nature">Nature</option>
          <option value="apa7">APA 7</option>
          <option value="harvard">Harvard</option>
        </select>
        <label
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={(e) => setAutoUpdate(e.target.checked)}
          />
          Auto-update when I add more files (skipped if I have unsaved edits)
        </label>
        <div className="row-buttons">
          <button type="submit" disabled={loading || !files.length}>
            {loading
              ? "Parsing and reviewing..."
              : stored
                ? "Rebuild review (start fresh)"
                : "Build review from uploads"}
          </button>
          {stored && isOutOfSync && (
            <button
              type="button"
              onClick={updateNow}
              disabled={loading}
              style={{ background: "var(--accent, #1f6feb)", color: "#fff" }}
            >
              {loading
                ? "Updating..."
                : `Update with ${pendingFiles.length} new file(s)`}
            </button>
          )}
        </div>
        <p className="muted">
          Files are processed on the backend (PDF via pypdf, DOCX via
          python-docx). Title, authors, year, DOI, and abstract are extracted
          heuristically. Uploaded items are NOT provider-verified - confirm
          bibliographic details before submission. The whole project's
          in-text citations and bibliography update in real time when this
          corpus changes.
        </p>
      </form>

      {status && (
        <div
          className="card"
          style={{ borderLeft: "3px solid var(--accent, #1f6feb)" }}
        >
          <p style={{ margin: 0 }}>{status}</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {stored && (
        <>
          <div className="card">
            <div className="row-between">
              <h3>
                Review draft <span className="badge">{stored.style}</span>{" "}
                <span className="badge">{stored.articles.length} refs</span>
              </h3>
              <button type="button" onClick={saveEdits}>
                Save edits to project
              </button>
            </div>
            <p className="disclaimer">{stored.note}</p>
          </div>

          {SECTION_ORDER.filter((n) => n in edited).map((name) => (
            <div className="card" key={name}>
              <h3>{name}</h3>
              <textarea
                rows={Math.max(
                  6,
                  Math.min(24, edited[name].split("\n").length + 2)
                )}
                value={edited[name]}
                onChange={(e) =>
                  setEdited({ ...edited, [name]: e.target.value })
                }
              />
            </div>
          ))}

          <div className="card">
            <h3>References ({stored.rendered_references.length})</h3>
            <ol className="ref-list">
              {stored.rendered_references.map((ref, i) => (
                <li key={i}>
                  {ref}
                  {stored.articles[i]?.url && (
                    <>
                      {" "}
                      <a
                        href={stored.articles[i].url!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        link
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <h3>Per-article appraisal</h3>
            <p className="muted">
              Use the citation key for each article when writing the Discussion -
              e.g. <code>[@1]</code> or <code>[@1,3]</code>. Numbers
              automatically reflect the current order; if you renumber by adding
              files, the discussion and manuscript update in real time.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Citation</th>
                  <th>Design</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {stored.articles.map((a) => (
                  <tr key={a.number}>
                    <td>
                      <code>[@{a.number}]</code>
                    </td>
                    <td>
                      <strong>{a.title}</strong>
                      <div className="muted">
                        {a.authors.slice(0, 3).join("; ")}
                        {a.year ? ` (${a.year})` : ""} - {a.journal ?? ""}
                      </div>
                      <div className="muted">{a.inline_citation}</div>
                    </td>
                    <td>{a.design}</td>
                    <td>{a.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
