/**
 * Export panel - assembles a single proposal document (markdown / HTML)
 * for client-side download. Pure browser, no server dependency.
 */
import { useMemo, useState } from "react";
import { Grant } from "../../store/grants";
import {
  LiteratureUploadedArticle,
  NUMERIC_CITATION_STYLES,
  renderCitations,
  useProject,
} from "../../store/projects";

export default function ExportPanel({ grant }: { grant: Grant }) {
  const project = useProject(grant.projectId ?? undefined);
  const articles: LiteratureUploadedArticle[] = useMemo(
    () => project?.artifacts.literature?.articles ?? [],
    [project]
  );
  const style = project?.citationStyle || "vancouver";
  const [busyKind, setBusyKind] = useState<string | null>(null);

  const cite = (s: string) =>
    renderCitations(s, articles, NUMERIC_CITATION_STYLES, style);

  const proposal = useMemo(() => buildProposal(grant, cite), [grant, articles, style]);

  function download(filename: string, mime: string, body: string) {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportMd() {
    setBusyKind("md");
    download(safeName(grant.title) + ".md", "text/markdown", proposal);
    setBusyKind(null);
  }

  function exportHtml() {
    setBusyKind("html");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      grant.title
    )}</title><style>body{font-family:Georgia,serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.6}h1,h2,h3{font-family:system-ui,sans-serif}pre{white-space:pre-wrap}</style></head><body><pre>${escapeHtml(
      proposal
    )}</pre></body></html>`;
    download(safeName(grant.title) + ".html", "text/html", html);
    setBusyKind(null);
  }

  function exportBudgetCsv() {
    setBusyKind("csv");
    const rows = [
      ["category", "description", "quantity", "unit_cost", "months", "subtotal", "notes"].join(","),
      ...grant.budget_lines.map((l) =>
        [
          l.category,
          csv(l.description),
          l.quantity,
          l.unit_cost,
          l.months,
          (l.quantity * l.unit_cost * Math.max(1, l.months)).toFixed(2),
          csv(l.notes || ""),
        ].join(",")
      ),
    ].join("\n");
    download(safeName(grant.title) + "-budget.csv", "text/csv", rows);
    setBusyKind(null);
  }

  return (
    <div>
      <div className="card">
        <h3>Export submission package</h3>
        <p className="muted">
          Generates a single proposal document containing every section, the
          frameworks, logframe table and budget summary. Citations resolved
          against the linked project's references.
        </p>
        <div className="row-buttons">
          <button onClick={exportMd} disabled={busyKind !== null}>
            {busyKind === "md" ? "..." : "Download .md"}
          </button>
          <button onClick={exportHtml} disabled={busyKind !== null}>
            {busyKind === "html" ? "..." : "Download .html"}
          </button>
          <button onClick={exportBudgetCsv} disabled={busyKind !== null}>
            {busyKind === "csv" ? "..." : "Budget .csv"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Preview</h3>
        <pre className="rendered-text" style={{ whiteSpace: "pre-wrap" }}>
          {proposal}
        </pre>
      </div>
    </div>
  );
}

function buildProposal(grant: Grant, cite: (s: string) => string): string {
  const total = grant.budget_lines.reduce(
    (s, l) => s + l.quantity * l.unit_cost * Math.max(1, l.months),
    0
  );
  const grandTotal = total * (1 + grant.contingency_rate + grant.indirects_rate);

  const parts: string[] = [];
  parts.push(`# ${grant.title || "Untitled grant"}`);
  if (grant.selected_funder) parts.push(`**Target funder:** ${grant.selected_funder}`);
  if (grant.target_budget_usd)
    parts.push(`**Target budget:** USD ${grant.target_budget_usd.toLocaleString()}`);
  if (grant.target_duration_months)
    parts.push(`**Duration:** ${grant.target_duration_months} months`);
  parts.push("");

  const sec = (h: string, body: string) => {
    if (!body.trim()) return;
    parts.push(`## ${h}`);
    parts.push(cite(body));
    parts.push("");
  };

  sec("Executive summary", grant.executive_summary);
  sec("Background", grant.background);
  sec("Significance", grant.significance);
  sec("Innovation", grant.innovation);
  sec("Specific aims", grant.aims);

  if (grant.smart_objectives.length > 0) {
    parts.push("## SMART objectives");
    grant.smart_objectives.forEach((o, i) => {
      parts.push(`${i + 1}. ${o.is_smart ? "" : "(△) "}${o.raw}`);
    });
    parts.push("");
  }

  sec("Methodology", grant.methodology);
  sec("Work plan", grant.workplan);

  if (grant.theory_of_change_narrative) {
    parts.push("## Theory of Change");
    parts.push(grant.theory_of_change_narrative);
    if (grant.theory_of_change_mermaid) {
      parts.push("```mermaid");
      parts.push(grant.theory_of_change_mermaid);
      parts.push("```");
    }
    parts.push("");
  }

  if (grant.logframe_markdown) {
    parts.push("## Logical framework");
    parts.push(grant.logframe_markdown);
    parts.push("");
  }

  sec("Monitoring & evaluation", grant.moe_plan);
  sec("Risk register", grant.risk_register);
  sec("Impact", grant.impact);
  sec("Sustainability", grant.sustainability);
  sec("Dissemination", grant.dissemination);

  if (grant.budget_lines.length > 0) {
    parts.push("## Budget");
    parts.push(`Currency: **${grant.currency}**`);
    parts.push("");
    parts.push("| Category | Description | Qty | Unit | Months | Subtotal |");
    parts.push("|---|---|---|---|---|---|");
    grant.budget_lines.forEach((l) => {
      parts.push(
        `| ${l.category} | ${(l.description || "").replace(/\|/g, "\\|")} | ${l.quantity} | ${
          l.unit_cost
        } | ${l.months} | ${(l.quantity * l.unit_cost * Math.max(1, l.months)).toFixed(2)} |`
      );
    });
    parts.push("");
    parts.push(`- Subtotal: ${grant.currency} ${total.toLocaleString()}`);
    parts.push(
      `- Contingency (${(grant.contingency_rate * 100).toFixed(0)}%): ${grant.currency} ${(
        total * grant.contingency_rate
      ).toLocaleString()}`
    );
    parts.push(
      `- Indirects (${(grant.indirects_rate * 100).toFixed(0)}%): ${grant.currency} ${(
        total * grant.indirects_rate
      ).toLocaleString()}`
    );
    parts.push(`- **Total: ${grant.currency} ${grandTotal.toLocaleString()}**`);
    if (grant.budget_narrative) {
      parts.push("");
      parts.push("### Budget narrative");
      parts.push(grant.budget_narrative);
    }
    parts.push("");
  }

  return parts.join("\n");
}

function safeName(s: string): string {
  return (s || "grant").replace(/[^a-z0-9-]+/gi, "-").slice(0, 60);
}

function csv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
