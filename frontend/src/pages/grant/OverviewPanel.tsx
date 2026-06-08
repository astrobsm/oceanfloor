/**
 * Overview panel: status, working title, funder targeting basics, optional
 * link to an existing project. The fields here feed every other panel.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Grant, GrantStatus, grantsStore } from "../../store/grants";
import { useProjects } from "../../store/projects";

const STATUS_OPTIONS: GrantStatus[] = [
  "draft",
  "submitted",
  "funded",
  "rejected",
  "archived",
];

const CAREER_STAGES = [
  "student",
  "early_career",
  "mid_career",
  "senior",
  "institutional",
];

export default function OverviewPanel({ grant }: { grant: Grant }) {
  const projects = useProjects();
  const [local, setLocal] = useState({
    title: grant.title,
    status: grant.status,
    selected_funder: grant.selected_funder ?? "",
    funder_priorities: grant.funder_priorities,
    career_stage: grant.career_stage,
    institution_country: grant.institution_country,
    is_lmic: grant.is_lmic,
    target_budget_usd: grant.target_budget_usd ?? "",
    target_duration_months: grant.target_duration_months ?? "",
    months_until_deadline: grant.months_until_deadline ?? "",
    currency: grant.currency,
    projectId: grant.projectId ?? "",
  });

  function save() {
    grantsStore.update(grant.id, {
      title: local.title.trim() || "Untitled grant",
      status: local.status,
      selected_funder: local.selected_funder.trim() || null,
      funder_priorities: local.funder_priorities,
      career_stage: local.career_stage,
      institution_country: local.institution_country,
      is_lmic: local.is_lmic,
      target_budget_usd: numOrNull(local.target_budget_usd),
      target_duration_months: numOrNull(local.target_duration_months),
      months_until_deadline: numOrNull(local.months_until_deadline),
      currency: local.currency || "USD",
      projectId: local.projectId || null,
    });
  }

  return (
    <div>
      <div className="card">
        <h3>Working title</h3>
        <label htmlFor="grant-title">Title</label>
        <input
          id="grant-title"
          value={local.title}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
        />
        <div className="grid-2">
          <div>
            <label htmlFor="grant-status">Status</label>
            <select
              id="grant-status"
              value={local.status}
              onChange={(e) =>
                setLocal({ ...local, status: e.target.value as GrantStatus })
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grant-project">Linked project</label>
            <select
              id="grant-project"
              value={local.projectId}
              onChange={(e) =>
                setLocal({ ...local, projectId: e.target.value })
              }
            >
              <option value="">(standalone)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Funder targeting</h3>
        <label htmlFor="grant-funder">Selected funder (acronym or name)</label>
        <input
          id="grant-funder"
          value={local.selected_funder}
          onChange={(e) =>
            setLocal({ ...local, selected_funder: e.target.value })
          }
          placeholder="NIH, Gates, Wellcome, Horizon Europe, ..."
        />
        <label htmlFor="grant-priorities">
          Funder priorities (paste the call's stated themes)
        </label>
        <textarea
          id="grant-priorities"
          rows={4}
          value={local.funder_priorities}
          onChange={(e) =>
            setLocal({ ...local, funder_priorities: e.target.value })
          }
          placeholder="e.g. 'Reduce maternal mortality in sub-Saharan Africa through implementation research...'"
        />
      </div>

      <div className="card">
        <h3>Team & budget basics</h3>
        <div className="grid-2">
          <div>
            <label htmlFor="grant-stage">Career stage</label>
            <select
              id="grant-stage"
              value={local.career_stage}
              onChange={(e) =>
                setLocal({ ...local, career_stage: e.target.value })
              }
            >
              {CAREER_STAGES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grant-country">Institution country (ISO)</label>
            <input
              id="grant-country"
              value={local.institution_country}
              onChange={(e) =>
                setLocal({ ...local, institution_country: e.target.value })
              }
              placeholder="US, UK, NG, KE, ZA..."
            />
          </div>
        </div>
        <label className="inline">
          <input
            type="checkbox"
            checked={local.is_lmic}
            onChange={(e) => setLocal({ ...local, is_lmic: e.target.checked })}
          />
          LMIC-based or LMIC-focused project
        </label>
        <div className="grid-2">
          <div>
            <label htmlFor="grant-currency">Currency</label>
            <input
              id="grant-currency"
              value={local.currency}
              onChange={(e) => setLocal({ ...local, currency: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="grant-budget">Target budget (USD)</label>
            <input
              id="grant-budget"
              type="number"
              value={local.target_budget_usd}
              onChange={(e) =>
                setLocal({ ...local, target_budget_usd: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="grant-months">Duration (months)</label>
            <input
              id="grant-months"
              type="number"
              value={local.target_duration_months}
              onChange={(e) =>
                setLocal({ ...local, target_duration_months: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="grant-deadline">Months until deadline</label>
            <input
              id="grant-deadline"
              type="number"
              value={local.months_until_deadline}
              onChange={(e) =>
                setLocal({ ...local, months_until_deadline: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="row-buttons">
        <button onClick={save}>Save overview</button>
        <Link className="ghost-link" to={`/grants/${grant.id}`}>
          Refresh
        </Link>
        <button
          className="ghost danger"
          onClick={() => {
            if (
              confirm(
                "Delete this grant? This cannot be undone. Local-only data."
              )
            ) {
              grantsStore.remove(grant.id);
              window.location.assign("/grants");
            }
          }}
        >
          Delete grant
        </button>
      </div>
    </div>
  );
}

function numOrNull(v: string | number): number | null {
  if (typeof v === "number") return v;
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}
