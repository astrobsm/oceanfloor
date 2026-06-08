/**
 * ExportPanel - assembles the manuscript from project artifacts and exports
 * to Word (.docx via backend python-docx) or PDF (HTML export rendered with
 * browser print-to-PDF, which avoids extra backend dependencies and respects
 * the user's installed fonts).
 */
import { useMemo, useState } from "react";
import { apiPostBlob, triggerDownload } from "../../api/client";
import { Project } from "../../store/projects";
import { assembleManuscript } from "./ManuscriptPanel";

export default function ExportPanel({ project }: { project: Project }) {
  const ms = project.artifacts.manuscript ?? {
    title: project.title,
    authors: "",
    affiliations: "",
    abstract: "",
    keywords: "",
  };
  const assembled = useMemo(
    () => assembleManuscript(project, ms),
    [project, ms]
  );
  const sections = useMemo(() => splitSections(assembled), [assembled]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadDocx() {
    setBusy("docx");
    setError(null);
    try {
      const { blob, filename } = await apiPostBlob("/export/manuscript", {
        format: "docx",
        title: ms.title || project.title,
        sections,
      });
      triggerDownload(blob, filename || `${slug(ms.title || project.title)}.docx`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadHtml() {
    setBusy("html");
    setError(null);
    try {
      const { blob, filename } = await apiPostBlob("/export/manuscript", {
        format: "html",
        title: ms.title || project.title,
        sections,
      });
      triggerDownload(blob, filename || `${slug(ms.title || project.title)}.html`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadMd() {
    const blob = new Blob([assembled], { type: "text/markdown" });
    triggerDownload(blob, `${slug(ms.title || project.title)}.md`);
  }

  async function printPdf() {
    setBusy("pdf");
    setError(null);
    try {
      const { blob } = await apiPostBlob("/export/manuscript", {
        format: "html",
        title: ms.title || project.title,
        sections,
      });
      const html = await blob.text();
      const styled = html.replace(
        "</head>",
        `<style>
          body { font-family: Georgia, 'Times New Roman', serif; max-width: 760px; margin: 2.5rem auto; padding: 0 1.5rem; line-height: 1.6; color: #111; }
          h1 { font-size: 1.7rem; }
          h2 { font-size: 1.25rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; margin-top: 1.6rem; }
          h3 { font-size: 1.05rem; }
          p { margin: 0.6rem 0; }
          ol, ul { margin: 0.6rem 0 0.6rem 1.4rem; }
          table { border-collapse: collapse; margin: 0.8rem 0; }
          th, td { border: 1px solid #aaa; padding: 4px 8px; font-size: 0.9rem; }
          @media print {
            body { margin: 0; padding: 1.2cm; }
            h1 { page-break-before: avoid; }
            h2 { page-break-after: avoid; }
            .print-hint { display: none; }
          }
        </style>
        <script>
          window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });
        </script>
        </head>`
      ).replace(
        "<body>",
        `<body><div class="print-hint" style="background:#fff8c4;padding:0.6rem;margin-bottom:1rem;border:1px solid #d4c200;border-radius:6px;font-family:system-ui">Your browser's print dialog will open. Choose <strong>Save as PDF</strong> as the destination.</div>`
      );
      const win = window.open("", "_blank");
      if (!win) {
        setError(
          "Pop-up blocked - allow pop-ups for this site to print to PDF."
        );
        return;
      }
      win.document.open();
      win.document.write(styled);
      win.document.close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const refsCount = project.artifacts.literature?.articles?.length ?? 0;

  return (
    <div>
      <div className="card">
        <h3>Pre-flight check</h3>
        <ul style={{ lineHeight: 1.8 }}>
          <li>
            Title: <strong>{ms.title || project.title}</strong>
          </li>
          <li>
            Authors:{" "}
            <strong>{ms.authors || "(not set in Manuscript step)"}</strong>
          </li>
          <li>
            Sections assembled: <strong>{Object.keys(sections).length}</strong>
          </li>
          <li>
            References (auto-numbered): <strong>{refsCount}</strong>
          </li>
          <li>
            Target journal:{" "}
            <strong>{project.artifacts.journal?.selected || "(none)"}</strong>
          </li>
        </ul>
      </div>

      <div className="card">
        <h3>Download</h3>
        <p className="muted">
          The manuscript is built from every step of this project. References
          and in-text citations are renumbered live from the current literature
          corpus before export.
        </p>
        <div className="row-buttons">
          <button onClick={downloadDocx} disabled={busy !== null}>
            {busy === "docx" ? "Generating..." : "Download Word (.docx)"}
          </button>
          <button onClick={printPdf} disabled={busy !== null}>
            {busy === "pdf" ? "Opening..." : "Print to PDF"}
          </button>
          <button
            className="ghost"
            onClick={downloadHtml}
            disabled={busy !== null}
          >
            {busy === "html" ? "Generating..." : "Download HTML"}
          </button>
          <button className="ghost" onClick={downloadMd}>
            Download Markdown
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Assembled manuscript preview</h3>
        <div
          className="rendered-text"
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.65,
            background: "rgba(0,0,0,0.02)",
            padding: "1rem",
            borderRadius: "6px",
            maxHeight: "55vh",
            overflow: "auto",
          }}
        >
          {assembled}
        </div>
      </div>
    </div>
  );
}

function splitSections(markdown: string): Record<string, string> {
  const lines = markdown.split("\n");
  const sections: Record<string, string> = {};
  let current = "Front matter";
  let buffer: string[] = [];
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      if (buffer.length) sections[current] = buffer.join("\n").trim();
      current = m[1].trim();
      buffer = [];
    } else if (/^#\s+/.test(line)) {
      // top-level title goes into front matter
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections[current] = buffer.join("\n").trim();
  return sections;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "manuscript"
  );
}
