import { FormEvent, useEffect, useRef, useState } from "react";
import { apiPost, apiPostMultipart } from "../api/client";
import SaveButton from "../components/SaveButton";

type Style = "vancouver" | "ama" | "apa7" | "harvard" | "nature";

interface Record_ {
  title: string;
  authors: string[];
  journal: string | null;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  source: string;
  abstract?: string | null;
}

interface SearchResponse {
  query: string;
  records: Record_[];
  note: string;
}

interface ReviewedArticle {
  number: number;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  design: string;
  summary: string;
  inline_citation: string;
}

interface ReviewResponse {
  query: string;
  style: Style;
  sections: Record<string, string>;
  articles: ReviewedArticle[];
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

export default function Literature() {
  const [tab, setTab] = useState<"review" | "upload" | "search">("review");
  return (
    <div>
      <h2>Literature Review</h2>
      <p className="disclaimer">
        Results come only from verifiable providers (Crossref, Europe PMC) or files you
        upload. OceanFloor never fabricates references, citations, or DOIs.
      </p>
      <div className="tabs">
        <button
          className={tab === "review" ? "active" : "ghost"}
          onClick={() => setTab("review")}
        >
          Deep review (search providers)
        </button>
        <button
          className={tab === "upload" ? "active" : "ghost"}
          onClick={() => setTab("upload")}
        >
          Review uploaded articles
        </button>
        <button
          className={tab === "search" ? "active" : "ghost"}
          onClick={() => setTab("search")}
        >
          Raw search
        </button>
      </div>
      {tab === "search" && <RawSearch />}
      {tab === "review" && <DeepReview />}
      {tab === "upload" && <UploadReview />}
    </div>
  );
}

function RawSearch() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<SearchResponse>("/literature/search", {
        query: form.get("query"),
        max_results: Number(form.get("max_results")),
      });
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <label>Search query</label>
        <input
          name="query"
          placeholder="negative pressure wound therapy diabetic foot"
          required
        />
        <label>Max results</label>
        <input name="max_results" type="number" defaultValue="10" />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {data && (
        <div className="card">
          <div className="row-between">
            <h3>{data.records.length} verifiable records</h3>
            <SaveButton kind="literature" title={`Lit: ${data.query}`} payload={data} />
          </div>
          {data.records.map((r, i) => (
            <p key={i}>
              <strong>{r.title}</strong>
              <br />
              {r.authors.slice(0, 4).join(", ")} {r.year ? `(${r.year})` : ""} - {r.journal ?? ""}
              <br />
              {r.doi && (
                <a
                  href={r.url ?? `https://doi.org/${r.doi}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  doi:{r.doi}
                </a>
              )}
              {!r.doi && r.pmid && <span>PMID:{r.pmid}</span>}{" "}
              <em>[{r.source}]</em>
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function DeepReview() {
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiPost<ReviewResponse>("/literature/review", {
        query: form.get("query"),
        max_results: Number(form.get("max_results")),
        style: form.get("style"),
        focus: form.get("focus") || null,
      });
      setData(res);
      setEdited({ ...res.sections });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <label>Search query</label>
        <input
          name="query"
          placeholder="negative pressure wound therapy diabetic foot ulcers"
          required
        />
        <label>Focus / sub-question (optional)</label>
        <input name="focus" placeholder="effect of NPWT on time-to-closure in DFU" />
        <div className="grid-2">
          <div>
            <label>Citation style</label>
            <select name="style" defaultValue="vancouver">
              <option value="vancouver">Vancouver</option>
              <option value="ama">AMA</option>
              <option value="apa7">APA 7</option>
              <option value="harvard">Harvard</option>
              <option value="nature">Nature</option>
            </select>
          </div>
          <div>
            <label>Records to include (3 - 30)</label>
            <input
              name="max_results"
              type="number"
              defaultValue="15"
              min="3"
              max="30"
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Reviewing literature..." : "Build submission-grade review"}
        </button>
        <p className="muted">
          Searches Crossref and Europe PMC, fetches abstracts, detects each study's
          design, summarises it, and assembles an editable 5-section narrative with
          inline citations and a numbered bibliography in the chosen style.
        </p>
      </form>

      {error && <p className="error">{error}</p>}
      {data && <ReviewResult data={data} edited={edited} setEdited={setEdited} />}
    </>
  );
}

function UploadReview() {
  const [project, setProject] = useState<string>(
    () => localStorage.getItem("of.litUpload.project") || "Untitled review"
  );
  const [files, setFiles] = useState<File[]>([]);
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [lastSubmittedKeys, setLastSubmittedKeys] = useState<string[]>([]);
  const [lastStyle, setLastStyle] = useState<Style>("vancouver");
  const [lastFocus, setLastFocus] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("of.litUpload.project", project);
  }, [project]);

  function fileKey(f: File): string {
    return `${f.name}-${f.size}`;
  }

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const arr = Array.from(picked);
    setFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...arr].forEach((f) => map.set(fileKey(f), f));
      return Array.from(map.values());
    });
  }

  function hasUserEdits(): boolean {
    if (!data) return false;
    return SECTION_ORDER.some(
      (n) => n in data.sections && edited[n] !== data.sections[n]
    );
  }

  async function runReview(filesToSend: File[], style: Style, focus: string) {
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
      const previousCount = lastSubmittedKeys.length;
      setData(res);
      setEdited({ ...res.sections });
      setLastSubmittedKeys(filesToSend.map(fileKey));
      setLastStyle(style);
      setLastFocus(focus);
      if (previousCount > 0) {
        const delta = filesToSend.length - previousCount;
        setStatus(
          delta > 0
            ? `Review refreshed: ${delta} new article(s) added, citations renumbered (${res.articles.length} total).`
            : `Review refreshed (${res.articles.length} article(s), citations renumbered).`
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-update when files change after the first successful review,
  // but only if the user has not edited any section (to avoid clobbering edits).
  useEffect(() => {
    if (!data) return;
    if (!autoUpdate) return;
    const currentKeys = files.map(fileKey).sort().join("|");
    const lastKeys = [...lastSubmittedKeys].sort().join("|");
    if (currentKeys === lastKeys) return;
    if (!files.length) return;
    if (hasUserEdits()) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      runReview(files, lastStyle, lastFocus);
    }, 900);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, autoUpdate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const style = (String(form.get("style") || "vancouver")) as Style;
    const focus = String(form.get("focus") || "");
    await runReview(files, style, focus);
  }

  async function updateNow() {
    if (hasUserEdits()) {
      const ok = window.confirm(
        "You have edited one or more sections. Re-running the review will replace " +
          "your edits with a freshly generated draft (citation numbers will be " +
          "updated for the expanded article set). Continue?"
      );
      if (!ok) return;
    }
    await runReview(files, lastStyle, lastFocus);
  }

  const totalMb = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
  const currentKeys = files.map(fileKey).sort().join("|");
  const lastKeys = [...lastSubmittedKeys].sort().join("|");
  const pendingFiles = files.filter((f) => !lastSubmittedKeys.includes(fileKey(f)));
  const isOutOfSync = data !== null && currentKeys !== lastKeys && files.length > 0;

  return (
    <>
      <form className="card" onSubmit={submit}>
        <label>Project / review title</label>
        <input
          name="project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. NPWT in diabetic foot ulcers - 2026 systematic review"
        />
        <label>Articles (PDF, DOCX, TXT, MD)</label>
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
              {files.length} file(s), {totalMb.toFixed(1)} MB total
              {data && (
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
                  data !== null && !lastSubmittedKeys.includes(fileKey(f));
                return (
                  <li key={fileKey(f)}>
                    <span>
                      {f.name}
                      {isNew && (
                        <span
                          className="badge"
                          style={{ marginLeft: "0.4rem" }}
                          title="Added since last review"
                        >
                          new
                        </span>
                      )}
                    </span>
                    <span className="muted">{(f.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="ghost" onClick={() => setFiles([])}>
              Clear all
            </button>
          </div>
        )}
        <label>Focus / sub-question (optional)</label>
        <input
          name="focus"
          defaultValue={lastFocus}
          placeholder="effect of NPWT on time-to-closure"
        />
        <label>Citation style</label>
        <select name="style" defaultValue={lastStyle}>
          <option value="vancouver">Vancouver</option>
          <option value="ama">AMA</option>
          <option value="apa7">APA 7</option>
          <option value="harvard">Harvard</option>
          <option value="nature">Nature</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={(e) => setAutoUpdate(e.target.checked)}
          />
          Auto-update review when I add more files (only if I have not edited
          the draft)
        </label>
        <div className="row-buttons">
          <button type="submit" disabled={loading || !files.length}>
            {loading
              ? "Parsing and reviewing..."
              : data
                ? "Start over (build new review)"
                : "Review uploaded articles"}
          </button>
          {data && isOutOfSync && (
            <button
              type="button"
              onClick={updateNow}
              disabled={loading}
              style={{ background: "var(--accent, #1f6feb)", color: "#fff" }}
            >
              {loading
                ? "Updating..."
                : `Update review with ${pendingFiles.length} new file(s)`}
            </button>
          )}
        </div>
        <p className="muted">
          Each file is parsed on the backend (PDF via pypdf, DOCX via python-docx).
          Title, authors, year, DOI, and abstract are extracted heuristically. Up to
          50 files / 25 MB per file. As you add more articles, the review and
          in-text citations are re-built so numbering stays professional and
          consistent. Uploaded items are NOT provider-verified; confirm
          bibliographic details before submission.
        </p>
      </form>

      {status && (
        <div className="card" style={{ borderLeft: "3px solid var(--accent, #1f6feb)" }}>
          <p style={{ margin: 0 }}>{status}</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {data && <ReviewResult data={data} edited={edited} setEdited={setEdited} />}
    </>
  );
}

function ReviewResult({
  data,
  edited,
  setEdited,
}: {
  data: ReviewResponse;
  edited: Record<string, string>;
  setEdited: (v: Record<string, string>) => void;
}) {
  function buildMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# Literature Review: ${data.query}`);
    lines.push("");
    lines.push(`*Citation style: ${data.style}*  `);
    lines.push(`*Records included: ${data.articles.length}*`);
    lines.push("");
    for (const name of SECTION_ORDER) {
      if (!(name in edited)) continue;
      lines.push(`## ${name}`);
      lines.push("");
      lines.push(edited[name]);
      lines.push("");
    }
    lines.push("## References");
    lines.push("");
    data.rendered_references.forEach((ref, i) => {
      lines.push(`${i + 1}. ${ref}`);
    });
    lines.push("");
    lines.push("---");
    lines.push(`*${data.note}*`);
    return lines.join("\n");
  }

  function download() {
    const blob = new Blob([buildMarkdown()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `literature-review-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(buildMarkdown());
  }

  return (
    <>
      <div className="card">
        <div className="row-between">
          <h3>
            Review draft <span className="badge">{data.style}</span>{" "}
            <span className="badge">{data.articles.length} refs</span>
          </h3>
          <div className="row-buttons">
            <button type="button" onClick={copyAll}>
              Copy Markdown
            </button>
            <button type="button" onClick={download}>
              Download .md
            </button>
            <SaveButton
              kind="literature"
              title={`Review: ${data.query}`}
              payload={{ ...data, sections: edited }}
            />
          </div>
        </div>
        <p className="disclaimer">{data.note}</p>
      </div>

      {SECTION_ORDER.filter((n) => n in edited).map((name) => (
        <div className="card" key={name}>
          <h3>{name}</h3>
          <textarea
            rows={Math.max(6, Math.min(24, edited[name].split("\n").length + 2))}
            value={edited[name]}
            onChange={(e) => setEdited({ ...edited, [name]: e.target.value })}
          />
        </div>
      ))}

      <div className="card">
        <h3>References ({data.rendered_references.length})</h3>
        <ol className="ref-list">
          {data.rendered_references.map((ref, i) => (
            <li key={i}>
              {ref}
              {data.articles[i]?.url && (
                <>
                  {" "}
                  <a href={data.articles[i].url!} target="_blank" rel="noreferrer">
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
            {data.articles.map((a) => (
              <tr key={a.number}>
                <td>{a.number}</td>
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
  );
}
