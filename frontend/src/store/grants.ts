/**
 * Grants store — localStorage-backed registry of grant proposals.
 *
 * Grants can be standalone (not yet linked to a project) or linked to an
 * existing project via `projectId`. Either way the artifact shape is the
 * same and matches the Project store's `GrantArtifact` so the two can be
 * synced via `linkProject(grantId, projectId)`.
 */
import { useSyncExternalStore } from "react";
import {
  GrantArtifact,
  GrantBudgetLine,
  GrantSmartObjective,
} from "./projects";

export type GrantStatus =
  | "draft"
  | "submitted"
  | "funded"
  | "rejected"
  | "archived";

export interface Grant extends GrantArtifact {
  id: string;
  projectId: string | null;
  createdAt: number;
  status: GrantStatus;
  progressPct: number;
  currentStep: GrantStepKey;
}

// ---------- 12-step grant workflow ----------
export type GrantStepKey =
  | "overview"
  | "funders"
  | "narrative"
  | "frameworks"
  | "budget"
  | "score"
  | "review"
  | "export";

export interface GrantStepMeta {
  key: GrantStepKey;
  label: string;
  short: string;
  hint: string;
}

export const GRANT_STEPS: GrantStepMeta[] = [
  {
    key: "overview",
    label: "Grant overview",
    short: "Overview",
    hint: "Working title, target funder, career stage, institution, link to a project.",
  },
  {
    key: "funders",
    label: "Funder discovery & matching",
    short: "Funders",
    hint: "Browse the catalog, run the matcher, shortlist and select a funder.",
  },
  {
    key: "narrative",
    label: "Proposal narrative",
    short: "Narrative",
    hint: "Executive summary, background, significance, innovation, aims, methodology, workplan, impact, sustainability, dissemination.",
  },
  {
    key: "frameworks",
    label: "Frameworks (SMART, ToC, Logframe, M&E, risk)",
    short: "Frameworks",
    hint: "SMART objectives, Theory of Change diagram, logical framework, M&E plan, risk register.",
  },
  {
    key: "budget",
    label: "Budget builder",
    short: "Budget",
    hint: "Itemised lines with categories, contingency, indirects, narrative.",
  },
  {
    key: "score",
    label: "Fundability scoring",
    short: "Score",
    hint: "Six-dimensional fundability assessment with recommendations.",
  },
  {
    key: "review",
    label: "Review simulator",
    short: "Review",
    hint: "Scientific, methodology, statistical and program-officer review voices.",
  },
  {
    key: "export",
    label: "Export submission package",
    short: "Export",
    hint: "Full proposal, budget workbook, logframe, cover documents.",
  },
];

const KEY = "oceanfloor.grants.v1";

function read(): Grant[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Grant[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
let cachedSnapshot: Grant[] | null = null;

function invalidate(): void {
  cachedSnapshot = null;
}

function getSnapshot(): Grant[] {
  if (cachedSnapshot === null) {
    cachedSnapshot = read().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return cachedSnapshot;
}

function write(items: Grant[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  invalidate();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
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

const SECTIONS_FOR_PROGRESS: (keyof Grant)[] = [
  "title",
  "executive_summary",
  "background",
  "significance",
  "innovation",
  "aims",
  "methodology",
  "workplan",
  "impact",
  "sustainability",
  "dissemination",
  "theory_of_change_narrative",
  "logframe_markdown",
  "moe_plan",
  "budget_narrative",
];

function computeProgress(g: Grant): number {
  const filled = SECTIONS_FOR_PROGRESS.filter((k) => {
    const v = g[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  const ratio = filled / SECTIONS_FOR_PROGRESS.length;
  const bonus = g.budget_lines.length > 0 ? 0.05 : 0;
  return Math.min(100, Math.round((ratio + bonus) * 100));
}

export function newGrantArtifact(): GrantArtifact {
  return {
    status: "draft",
    funder_shortlist: [],
    selected_funder: null,
    funder_priorities: "",
    career_stage: "early_career",
    institution_country: "",
    is_lmic: false,
    target_budget_usd: null,
    target_duration_months: null,
    months_until_deadline: null,
    title: "",
    executive_summary: "",
    background: "",
    significance: "",
    innovation: "",
    aims: "",
    methodology: "",
    workplan: "",
    impact: "",
    sustainability: "",
    dissemination: "",
    smart_objectives: [] as GrantSmartObjective[],
    theory_of_change_mermaid: "",
    theory_of_change_narrative: "",
    logframe_markdown: "",
    moe_plan: "",
    risk_register: "",
    currency: "USD",
    budget_lines: [] as GrantBudgetLine[],
    contingency_rate: 0.05,
    indirects_rate: 0,
    budget_narrative: "",
    last_fundability: null,
    updatedAt: Date.now(),
  };
}

export const grantsStore = {
  list(): Grant[] {
    return getSnapshot();
  },
  get(grantId: string): Grant | undefined {
    return getSnapshot().find((g) => g.id === grantId);
  },
  create(input: {
    title: string;
    projectId?: string | null;
  }): Grant {
    const base = newGrantArtifact();
    const now = Date.now();
    const grant: Grant = {
      ...base,
      id: id(),
      projectId: input.projectId ?? null,
      createdAt: now,
      updatedAt: now,
      title: input.title.trim() || "Untitled grant",
      status: "draft",
      progressPct: 0,
      currentStep: "overview",
    };
    grant.progressPct = computeProgress(grant);
    write([grant, ...read()]);
    return grant;
  },
  update(grantId: string, patch: Partial<Grant>): Grant | undefined {
    const items = read();
    const idx = items.findIndex((g) => g.id === grantId);
    if (idx === -1) return undefined;
    const merged: Grant = {
      ...items[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    merged.progressPct = computeProgress(merged);
    items[idx] = merged;
    write(items);
    return merged;
  },
  setStatus(grantId: string, status: GrantStatus): Grant | undefined {
    return this.update(grantId, { status });
  },
  setStep(grantId: string, currentStep: GrantStepKey): Grant | undefined {
    return this.update(grantId, { currentStep });
  },
  remove(grantId: string): void {
    write(read().filter((g) => g.id !== grantId));
  },
};

export function useGrants(): Grant[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useGrant(grantId: string | undefined): Grant | undefined {
  const all = useGrants();
  return grantId ? all.find((g) => g.id === grantId) : undefined;
}
