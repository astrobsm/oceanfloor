/**
 * Project store - localStorage-backed registry of research projects.
 *
 * Every artifact a user creates (idea, literature, proposal, data, results,
 * discussion, manuscript) is attached to a single Project. The Discussion and
 * Manuscript sections derive their in-text citations live from
 * `artifacts.literature.articles`, so adding/removing literature
 * automatically renumbers references everywhere.
 */

import { useEffect, useState, useSyncExternalStore } from "react";

export type ResearchField =
  | "medicine"
  | "nursing"
  | "public_health"
  | "pharmacy"
  | "dentistry"
  | "allied_health"
  | "biomedical_science"
  | "other";

export type StudyDesign =
  | "systematic_review"
  | "rct"
  | "cohort"
  | "case_control"
  | "cross_sectional"
  | "case_series"
  | "qualitative"
  | "mixed_methods"
  | "quality_improvement"
  | "secondary_analysis"
  | "other";

export const STEP_KEYS = [
  "overview",
  "idea",
  "literature",
  "proposal",
  "sample_size",
  "questionnaire",
  "ethics",
  "data",
  "analysis",
  "results",
  "discussion",
  "manuscript",
  "journal",
  "export",
] as const;

export type StepKey = (typeof STEP_KEYS)[number];

export interface StepMeta {
  key: StepKey;
  label: string;
  short: string;
  hint: string;
}

export const STEPS: StepMeta[] = [
  {
    key: "overview",
    label: "Project overview",
    short: "Overview",
    hint: "Title, field, design, team, and target timeline.",
  },
  {
    key: "idea",
    label: "Idea & research question",
    short: "Idea",
    hint: "Define the problem and frame a PICO/PEO research question.",
  },
  {
    key: "literature",
    label: "Literature review",
    short: "Literature",
    hint: "Upload articles; generate and update the review as the corpus grows.",
  },
  {
    key: "proposal",
    label: "Proposal & objectives",
    short: "Proposal",
    hint: "Background, aim, objectives, hypothesis, methods.",
  },
  {
    key: "sample_size",
    label: "Sample size & power",
    short: "Sample size",
    hint: "Compute the sample size for your design.",
  },
  {
    key: "questionnaire",
    label: "Questionnaire / instrument",
    short: "Questionnaire",
    hint: "Draft and refine the data-collection instrument.",
  },
  {
    key: "ethics",
    label: "Ethics & integrity",
    short: "Ethics",
    hint: "Informed consent, IRB statements, integrity self-check.",
  },
  {
    key: "data",
    label: "Data entry",
    short: "Data",
    hint: "Paste or import the dataset (CSV/JSON).",
  },
  {
    key: "analysis",
    label: "Statistical analysis",
    short: "Analysis",
    hint: "Descriptive, inferential, and SPSS-equivalent procedures.",
  },
  {
    key: "results",
    label: "Results",
    short: "Results",
    hint: "Auto-assembled tables and narrative from the analysis.",
  },
  {
    key: "discussion",
    label: "Discussion",
    short: "Discussion",
    hint: "Interpret results against the literature with live citations.",
  },
  {
    key: "manuscript",
    label: "Manuscript assembly",
    short: "Manuscript",
    hint: "Title, abstract, IMRAD, references - all live-linked.",
  },
  {
    key: "journal",
    label: "Journal selection",
    short: "Journal",
    hint: "Match the manuscript to candidate journals.",
  },
  {
    key: "export",
    label: "Export (Word / PDF)",
    short: "Export",
    hint: "Render the final manuscript with references in submission format.",
  },
];

// ---------- Artifact shapes (loose by design - panels own their schema) ----------

export interface IdeaArtifact {
  problem: string;
  population: string;
  intervention: string;
  comparator: string;
  outcome: string;
  question: string;
}

export interface LiteratureUploadedArticle {
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

export interface LiteratureArtifact {
  style: string;
  focus: string;
  query: string;
  fileKeys: string[]; // name-size identifiers of files included in last build
  sections: Record<string, string>; // editable narrative sections
  articles: LiteratureUploadedArticle[];
  rendered_references: string[];
  note: string;
  updatedAt: number;
}

export interface ProposalArtifact {
  background: string;
  aim: string;
  objectives: string;
  hypothesis: string;
  methods: string;
  ethics: string;
  timeline: string;
  budget: string;
}

export interface SampleSizeArtifact {
  test: string;
  inputs: Record<string, string>;
  result: string;
  rationale: string;
}

export interface QuestionnaireArtifact {
  sections: { title: string; items: string[] }[];
  notes: string;
}

export interface EthicsArtifact {
  consent: string;
  irb: string;
  conflicts: string;
  integrityNotes: string;
}

export interface DataArtifact {
  format: "csv" | "json";
  raw: string;
  variableNotes: string;
}

export interface AnalysisArtifact {
  plan: string;
  results: string; // markdown / text summarising stats outputs
  tables: string[]; // serialised markdown tables
}

export interface ResultsArtifact {
  narrative: string;
}

export interface DiscussionArtifact {
  body: string; // free text with citation tokens like [@1] or [@filename.pdf]
}

export interface ManuscriptArtifact {
  title: string;
  authors: string;
  affiliations: string;
  abstract: string;
  keywords: string;
}

export interface JournalArtifact {
  shortlist: string;
  selected: string;
}

// ---------- Grants (GWIFOE) ----------
export interface GrantSmartObjective {
  raw: string;
  is_smart: boolean;
  issues: string[];
}

export interface GrantBudgetLine {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit_cost: number;
  months: number;
  notes?: string;
}

export interface GrantArtifact {
  status: "draft" | "submitted" | "funded" | "rejected" | "archived";
  // Funder targeting
  funder_shortlist: string[]; // funder acronyms or names
  selected_funder: string | null;
  funder_priorities: string;
  career_stage: string;
  institution_country: string;
  is_lmic: boolean;
  target_budget_usd: number | null;
  target_duration_months: number | null;
  months_until_deadline: number | null;
  // Narrative sections
  title: string;
  executive_summary: string;
  background: string;
  significance: string;
  innovation: string;
  aims: string;
  methodology: string;
  workplan: string;
  impact: string;
  sustainability: string;
  dissemination: string;
  // Frameworks
  smart_objectives: GrantSmartObjective[];
  theory_of_change_mermaid: string;
  theory_of_change_narrative: string;
  logframe_markdown: string;
  moe_plan: string;
  risk_register: string;
  // Budget
  currency: string;
  budget_lines: GrantBudgetLine[];
  contingency_rate: number;
  indirects_rate: number;
  budget_narrative: string;
  // Live scoring snapshot
  last_fundability: {
    overall_score: number;
    grade: string;
    weaknesses: string[];
    recommendations: string[];
  } | null;
  updatedAt: number;
}

// ---------- Collaboration (PIN-protected share + participant tracking) ----------
export interface CollaborationParticipant {
  id: string;
  name: string;
  role: string;
  duties: string[];
  active: boolean;
  created_at: number;
  deactivated_at: number | null;
  last_seen_at: number | null;
  entries_count: number;
  // PIN is shown ONCE at creation and stored locally so the supervisor
  // can re-display it; in production this should be deliberately not
  // persisted server-side.
  pin_hint?: string;
}

export interface CollaborationActivity {
  at: number;
  participant_id: string;
  participant_name: string;
  kind: string;
  summary: string;
}

export interface CollaborationArtifact {
  share_id: string | null;
  supervisor_token: string | null; // displayed once at mint; needed for API calls
  allowed_steps: string[];
  active: boolean;
  participants: CollaborationParticipant[];
  activity: CollaborationActivity[];
  lastSyncAt: number | null;
}

export interface ProjectArtifacts {
  idea?: IdeaArtifact;
  literature?: LiteratureArtifact;
  proposal?: ProposalArtifact;
  sample_size?: SampleSizeArtifact;
  questionnaire?: QuestionnaireArtifact;
  ethics?: EthicsArtifact;
  data?: DataArtifact;
  analysis?: AnalysisArtifact;
  results?: ResultsArtifact;
  discussion?: DiscussionArtifact;
  manuscript?: ManuscriptArtifact;
  journal?: JournalArtifact;
  grant?: GrantArtifact;
  collaboration?: CollaborationArtifact;
}

export interface Project {
  id: string;
  title: string;
  field: ResearchField;
  design: StudyDesign;
  citationStyle: string;
  createdAt: number;
  updatedAt: number;
  currentStep: StepKey;
  artifacts: ProjectArtifacts;
}

// ---------- Storage ----------

const KEY = "oceanfloor.projects.v1";

function read(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Project[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

// Cached snapshot so useSyncExternalStore sees a stable reference between writes.
let cachedSnapshot: Project[] | null = null;

function invalidate(): void {
  cachedSnapshot = null;
}

function getSnapshot(): Project[] {
  if (cachedSnapshot === null) {
    cachedSnapshot = read().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return cachedSnapshot;
}

function write(items: Project[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  invalidate();
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new Event("projects:changed"));
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // Cross-tab sync: pick up writes from other tabs/windows.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      invalidate();
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function id(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const projectsStore = {
  list(): Project[] {
    return getSnapshot();
  },
  get(projectId: string): Project | undefined {
    return getSnapshot().find((p) => p.id === projectId);
  },
  create(input: {
    title: string;
    field: ResearchField;
    design: StudyDesign;
    citationStyle?: string;
  }): Project {
    const now = Date.now();
    const proj: Project = {
      id: id(),
      title: input.title.trim() || "Untitled project",
      field: input.field,
      design: input.design,
      citationStyle: input.citationStyle || "vancouver",
      createdAt: now,
      updatedAt: now,
      currentStep: "overview",
      artifacts: {},
    };
    write([proj, ...read()]);
    return proj;
  },
  update(projectId: string, patch: Partial<Project>): Project | undefined {
    const items = read();
    const idx = items.findIndex((p) => p.id === projectId);
    if (idx === -1) return undefined;
    const merged: Project = {
      ...items[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    items[idx] = merged;
    write(items);
    return merged;
  },
  patchArtifact<K extends keyof ProjectArtifacts>(
    projectId: string,
    key: K,
    value: ProjectArtifacts[K]
  ): Project | undefined {
    const items = read();
    const idx = items.findIndex((p) => p.id === projectId);
    if (idx === -1) return undefined;
    const merged: Project = {
      ...items[idx],
      artifacts: { ...items[idx].artifacts, [key]: value },
      updatedAt: Date.now(),
    };
    items[idx] = merged;
    write(items);
    return merged;
  },
  setStep(projectId: string, step: StepKey): void {
    const items = read();
    const idx = items.findIndex((p) => p.id === projectId);
    if (idx === -1) return;
    items[idx] = { ...items[idx], currentStep: step, updatedAt: Date.now() };
    write(items);
  },
  remove(projectId: string): void {
    write(read().filter((p) => p.id !== projectId));
  },
};

// ---------- Hooks ----------

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useProject(projectId: string | undefined): Project | undefined {
  const all = useProjects();
  return projectId ? all.find((p) => p.id === projectId) : undefined;
}

// Persist a string field locally for forms that mirror artifact state without
// re-rendering on every keystroke through the store.
export function useLocalDraft<T>(initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    setV(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [v, setV];
}

// ---------- Citation helpers (live in-text renumbering) ----------

/**
 * Replace citation tokens of the form [@key1,key2] or [@1,3] with the current
 * numeric labels, derived from the project's literature articles. Keys may be:
 *   - a numeric reference number (1-based) from `articles`
 *   - a substring of an article title
 *   - a filename fragment (matches the `inline_citation` field)
 *
 * Unmatched keys are left visible as `[?key]` so the user can fix them.
 */
export function renderCitations(
  text: string,
  articles: LiteratureUploadedArticle[] | undefined,
  numericStyles: Set<string>,
  style: string
): string {
  if (!text) return "";
  if (!articles || !articles.length) {
    return text.replace(/\[@([^\]]+)\]/g, "[?$1]");
  }
  const numeric = numericStyles.has(style);
  const byTitle = new Map<string, number>();
  articles.forEach((a) => {
    byTitle.set(a.title.toLowerCase().trim(), a.number);
  });
  return text.replace(/\[@([^\]]+)\]/g, (_, raw: string) => {
    const keys = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const resolved: { num: number; article: LiteratureUploadedArticle }[] = [];
    for (const k of keys) {
      let match: LiteratureUploadedArticle | undefined;
      if (/^\d+$/.test(k)) {
        match = articles[Number(k) - 1];
      } else {
        const needle = k.toLowerCase();
        match =
          articles.find((a) => a.title.toLowerCase().includes(needle)) ||
          articles.find((a) =>
            (a.authors[0] || "").toLowerCase().includes(needle)
          );
      }
      if (match) resolved.push({ num: match.number, article: match });
    }
    if (!resolved.length) return `[?${raw}]`;
    if (numeric) {
      const nums = resolved
        .map((r) => r.num)
        .sort((a, b) => a - b)
        .map(String);
      return `[${nums.join(",")}]`;
    }
    // Author-year for apa7 / harvard
    return (
      "(" +
      resolved
        .map((r) => r.article.inline_citation.replace(/^\(|\)$/g, ""))
        .join("; ") +
      ")"
    );
  });
}

export const NUMERIC_CITATION_STYLES = new Set(["vancouver", "ama", "nature"]);
