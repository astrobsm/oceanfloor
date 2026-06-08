/**
 * GrantWorkspace - hosts a single grant proposal and walks the user
 * through the 8-step GWIFOE wizard. Each step is a panel reading/writing
 * a slice of the Grant object via the grants store.
 */
import { useNavigate, useParams } from "react-router-dom";
import {
  GRANT_STEPS,
  Grant,
  GrantStepKey,
  grantsStore,
  useGrant,
} from "../store/grants";
import OverviewPanel from "./grant/OverviewPanel";
import FundersPanel from "./grant/FundersPanel";
import NarrativePanel from "./grant/NarrativePanel";
import FrameworksPanel from "./grant/FrameworksPanel";
import BudgetPanel from "./grant/BudgetPanel";
import ScorePanel from "./grant/ScorePanel";
import ReviewPanel from "./grant/ReviewPanel";
import ExportPanel from "./grant/ExportPanel";

export default function GrantWorkspace() {
  const { id = "" } = useParams<{ id: string }>();
  const grant = useGrant(id);
  const nav = useNavigate();

  if (!grant) {
    return (
      <div>
        <h2>Grant not found</h2>
        <p>
          This grant may have been deleted.{" "}
          <a href="/grants">Back to grants</a>
        </p>
      </div>
    );
  }

  function go(step: GrantStepKey) {
    grantsStore.setStep(grant!.id, step);
  }

  const currentIdx = GRANT_STEPS.findIndex((s) => s.key === grant.currentStep);
  const meta = GRANT_STEPS[currentIdx] ?? GRANT_STEPS[0];

  return (
    <div className="project-workspace">
      <aside className="stepper">
        <button className="ghost back-btn" onClick={() => nav("/grants")}>
          All grants
        </button>
        <h3 className="stepper-title">{grant.title || "Untitled grant"}</h3>
        <p className="muted stepper-meta">
          {grant.status} · {grant.progressPct}% complete
        </p>
        <ol className="stepper-list">
          {GRANT_STEPS.map((s, i) => {
            const done = grantStepCompleted(grant, s.key);
            const active = grant.currentStep === s.key;
            return (
              <li
                key={s.key}
                className={
                  (active ? "active " : "") + (done ? "done" : "pending")
                }
              >
                <button type="button" onClick={() => go(s.key)}>
                  <span className="step-num">{done ? "✓" : i + 1}</span>
                  <span className="step-label">{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="step-content">
        <header className="step-header">
          <div>
            <h2>{meta.label}</h2>
            <p className="muted">{meta.hint}</p>
          </div>
          <div className="row-buttons">
            {currentIdx > 0 && (
              <button
                className="ghost"
                onClick={() => go(GRANT_STEPS[currentIdx - 1].key)}
              >
                ← {GRANT_STEPS[currentIdx - 1].short}
              </button>
            )}
            {currentIdx < GRANT_STEPS.length - 1 && (
              <button onClick={() => go(GRANT_STEPS[currentIdx + 1].key)}>
                {GRANT_STEPS[currentIdx + 1].short} →
              </button>
            )}
          </div>
        </header>

        <StepPanel grant={grant} stepKey={grant.currentStep} />
      </section>
    </div>
  );
}

function StepPanel({
  grant,
  stepKey,
}: {
  grant: Grant;
  stepKey: GrantStepKey;
}) {
  switch (stepKey) {
    case "overview":
      return <OverviewPanel grant={grant} />;
    case "funders":
      return <FundersPanel grant={grant} />;
    case "narrative":
      return <NarrativePanel grant={grant} />;
    case "frameworks":
      return <FrameworksPanel grant={grant} />;
    case "budget":
      return <BudgetPanel grant={grant} />;
    case "score":
      return <ScorePanel grant={grant} />;
    case "review":
      return <ReviewPanel grant={grant} />;
    case "export":
      return <ExportPanel grant={grant} />;
  }
}

function grantStepCompleted(grant: Grant, key: GrantStepKey): boolean {
  switch (key) {
    case "overview":
      return Boolean(grant.title);
    case "funders":
      return Boolean(grant.selected_funder) || grant.funder_shortlist.length > 0;
    case "narrative":
      return Boolean(grant.aims && grant.methodology);
    case "frameworks":
      return (
        Boolean(grant.theory_of_change_narrative) ||
        Boolean(grant.logframe_markdown) ||
        grant.smart_objectives.length > 0
      );
    case "budget":
      return grant.budget_lines.length > 0;
    case "score":
      return Boolean(grant.last_fundability);
    case "review":
      return false; // re-runnable; never marked done
    case "export":
      return false;
  }
}
