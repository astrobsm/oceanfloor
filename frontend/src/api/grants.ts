/**
 * Typed API client for the GWIFOE (Grant Writing Intelligence) endpoints.
 */
import { apiGet, apiPost } from "./client";

export interface FunderSummary {
  name: string;
  acronym: string | null;
  funder_type: string;
  country_focus: string[];
  research_areas: string[];
  career_stages: string[];
  typical_award_min_usd: number | null;
  typical_award_max_usd: number | null;
  typical_duration_months: number | null;
  success_rate: number | null;
  review_weeks: number | null;
  next_deadline_hint: string | null;
  open_to_lmic: boolean;
  requires_collaboration: boolean;
  website: string | null;
  portal: string | null;
  proposal_format: string[];
  notes: string;
}

export interface GrantMatchDimension {
  name: string;
  score: number;
  rationale: string;
}

export interface GrantMatchItem {
  funder: FunderSummary;
  overall_score: number;
  dimensions: GrantMatchDimension[];
  notes: string[];
}

export interface GrantMatchResponse {
  matches: GrantMatchItem[];
  disclaimer: string;
}

export interface GrantMatchRequest {
  title?: string;
  abstract?: string;
  research_areas?: string[];
  keywords?: string[];
  career_stage?:
    | "student"
    | "early_career"
    | "mid_career"
    | "senior"
    | "institutional"
    | null;
  institution_country?: string | null;
  is_lmic?: boolean;
  has_institution?: boolean;
  welcomes_collaboration?: boolean;
  target_budget_usd?: number | null;
  target_duration_months?: number | null;
  open_to_phases?: string[] | null;
  months_until_deadline?: number | null;
  funder_types?: string[] | null;
  limit?: number;
}

export interface FundabilityResponse {
  overall_score: number;
  grade: string;
  breakdown: Record<string, number>;
  weighted: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface GrantReviewResponse {
  reviewers: {
    role: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    questions: string[];
    recommendation: string;
  }[];
  committee_summary: string;
  overall_recommendation: string;
  decision_probability: Record<string, number>;
  disclaimer: string;
}

export interface TocResponse {
  inputs: string[];
  activities: string[];
  outputs: string[];
  short_outcomes: string[];
  intermediate_outcomes: string[];
  long_term_impact: string;
  assumptions: string[];
  diagram_mermaid: string;
  narrative: string;
}

export interface LogframeResponse {
  rows: {
    level: string;
    summary: string;
    indicators: string[];
    means_of_verification: string[];
    assumptions: string[];
  }[];
  notes: string[];
}

export interface SmartCheckResponse {
  raw: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_bound: string;
  is_smart: boolean;
  issues: string[];
}

export interface BudgetResponse {
  currency: string;
  by_category: Record<string, number>;
  subtotal: number;
  contingency: number;
  indirects: number;
  total: number;
  rows: {
    category: string;
    description: string;
    quantity: number;
    unit_cost: number;
    months: number;
    total: number;
    notes: string;
  }[];
  narrative: string;
}

export interface FundabilityRequest {
  significance: number;
  innovation: number;
  feasibility: number;
  impact: number;
  budget: number;
  sustainability: number;
  funder_alignment: number;
  methodology: number;
  team: number;
  moe: number;
}

export interface GrantReviewRequest {
  title: string;
  aims?: string;
  background?: string;
  methodology?: string;
  budget_summary?: string;
  impact?: string;
  innovation?: string;
  moe?: string;
  sustainability?: string;
  funder_priorities?: string | null;
}

export const grantsApi = {
  listFunders: () =>
    apiGet<{ funders: FunderSummary[] }>("/grants/funders"),
  match: (req: GrantMatchRequest) =>
    apiPost<GrantMatchResponse>("/grants/match", req),
  score: (req: FundabilityRequest) =>
    apiPost<FundabilityResponse>("/grants/score", req),
  review: (req: GrantReviewRequest) =>
    apiPost<GrantReviewResponse>("/grants/review", req),
  theoryOfChange: (req: Record<string, unknown>) =>
    apiPost<TocResponse>("/grants/theory-of-change", req),
  logframe: (req: Record<string, unknown>) =>
    apiPost<LogframeResponse>("/grants/logframe", req),
  smartCheck: (objective: string) =>
    apiPost<SmartCheckResponse>("/grants/smart-check", { objective }),
  assembleBudget: (req: Record<string, unknown>) =>
    apiPost<BudgetResponse>("/grants/budget", req),
};
