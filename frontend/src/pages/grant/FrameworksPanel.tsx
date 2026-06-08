/**
 * Frameworks panel: SMART objectives, Theory of Change, Logical Framework,
 * M&E, and risk register. Calls the GWIFOE backend to scaffold each
 * artifact; the user edits the output freely.
 */
import { useState } from "react";
import { grantsApi } from "../../api/grants";
import { Grant, grantsStore } from "../../store/grants";
import { GrantSmartObjective } from "../../store/projects";

export default function FrameworksPanel({ grant }: { grant: Grant }) {
  const [smartInput, setSmartInput] = useState("");
  const [smartList, setSmartList] = useState<GrantSmartObjective[]>(
    grant.smart_objectives
  );
  const [smartBusy, setSmartBusy] = useState(false);

  const [tocBusy, setTocBusy] = useState(false);
  const [tocMermaid, setTocMermaid] = useState(grant.theory_of_change_mermaid);
  const [tocNarrative, setTocNarrative] = useState(
    grant.theory_of_change_narrative
  );

  const [logframeBusy, setLogframeBusy] = useState(false);
  const [logframe, setLogframe] = useState(grant.logframe_markdown);

  const [moe, setMoe] = useState(grant.moe_plan);
  const [risk, setRisk] = useState(grant.risk_register);

  const [error, setError] = useState<string | null>(null);

  async function checkSmart() {
    if (!smartInput.trim()) return;
    setSmartBusy(true);
    setError(null);
    try {
      const r = await grantsApi.smartCheck(smartInput);
      const next: GrantSmartObjective[] = [
        ...smartList,
        { raw: r.raw, is_smart: r.is_smart, issues: r.issues },
      ];
      setSmartList(next);
      setSmartInput("");
      grantsStore.update(grant.id, { smart_objectives: next });
    } catch (e) {
      setError(String(e));
    } finally {
      setSmartBusy(false);
    }
  }

  async function generateToc() {
    setTocBusy(true);
    setError(null);
    try {
      const r = await grantsApi.theoryOfChange({
        problem: grant.background.slice(0, 500),
        population: grant.aims.slice(0, 200) || "the target population",
      });
      setTocMermaid(r.diagram_mermaid);
      setTocNarrative(r.narrative);
      grantsStore.update(grant.id, {
        theory_of_change_mermaid: r.diagram_mermaid,
        theory_of_change_narrative: r.narrative,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setTocBusy(false);
    }
  }

  async function generateLogframe() {
    setLogframeBusy(true);
    setError(null);
    try {
      const aimLines = grant.aims
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6);
      const r = await grantsApi.logframe({
        goal: grant.impact || grant.aims.split("\n")[0] || "Improve health outcomes.",
        purpose: grant.executive_summary || grant.aims || "Achieve the project objectives.",
        outputs: aimLines.length ? aimLines : ["Validated dataset", "Peer-reviewed publication"],
        activities: ["Recruit and consent participants", "Collect and analyse data"],
      });
      const md = [
        "| Level | Summary | Indicators | Verification | Assumptions |",
        "|---|---|---|---|---|",
        ...r.rows.map(
          (row) =>
            `| ${row.level} | ${esc(row.summary)} | ${esc(
              row.indicators.join("; ")
            )} | ${esc(row.means_of_verification.join("; "))} | ${esc(
              row.assumptions.join("; ")
            )} |`
        ),
      ].join("\n");
      setLogframe(md);
      grantsStore.update(grant.id, { logframe_markdown: md });
    } catch (e) {
      setError(String(e));
    } finally {
      setLogframeBusy(false);
    }
  }

  function saveAll() {
    grantsStore.update(grant.id, {
      smart_objectives: smartList,
      theory_of_change_mermaid: tocMermaid,
      theory_of_change_narrative: tocNarrative,
      logframe_markdown: logframe,
      moe_plan: moe,
      risk_register: risk,
    });
  }

  function deleteSmart(i: number) {
    const next = smartList.filter((_, j) => j !== i);
    setSmartList(next);
    grantsStore.update(grant.id, { smart_objectives: next });
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>SMART objectives</h3>
        <p className="muted">
          Add one objective at a time. The checker scores Specific, Measurable
          and Time-bound deterministically; Achievable/Relevant are assumed and
          should be cross-checked with feasibility analysis.
        </p>
        <label htmlFor="smart-input">New objective</label>
        <textarea
          id="smart-input"
          rows={2}
          value={smartInput}
          onChange={(e) => setSmartInput(e.target.value)}
          placeholder="e.g. Reduce surgical site infection rates by 30% within 18 months in our 200-bed tertiary hospital."
        />
        <button onClick={checkSmart} disabled={smartBusy || !smartInput.trim()}>
          {smartBusy ? "Checking..." : "Check & add"}
        </button>
        {smartList.length > 0 && (
          <ul className="ref-list">
            {smartList.map((o, i) => (
              <li key={i}>
                <strong>{o.is_smart ? "✓" : "△"}</strong> {o.raw}
                {o.issues.length > 0 && (
                  <ul>
                    {o.issues.map((iss, k) => (
                      <li key={k} className="muted">
                        {iss}
                      </li>
                    ))}
                  </ul>
                )}
                <button className="ghost danger" onClick={() => deleteSmart(i)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Theory of Change</h3>
        <p className="muted">
          Generates a Mermaid diagram + narrative scaffold from the Background
          and Aims sections. Edit freely.
        </p>
        <button onClick={generateToc} disabled={tocBusy}>
          {tocBusy ? "Generating..." : "Generate Theory of Change"}
        </button>
        <label htmlFor="toc-mermaid">Mermaid diagram source</label>
        <textarea
          id="toc-mermaid"
          rows={8}
          value={tocMermaid}
          onChange={(e) => setTocMermaid(e.target.value)}
        />
        <label htmlFor="toc-narrative">Narrative</label>
        <textarea
          id="toc-narrative"
          rows={10}
          value={tocNarrative}
          onChange={(e) => setTocNarrative(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Logical framework</h3>
        <p className="muted">
          Generates a Logframe matrix scaffold from your goal/impact and aims.
        </p>
        <button onClick={generateLogframe} disabled={logframeBusy}>
          {logframeBusy ? "Generating..." : "Generate logframe"}
        </button>
        <label htmlFor="logframe">Logframe (markdown table)</label>
        <textarea
          id="logframe"
          rows={10}
          value={logframe}
          onChange={(e) => setLogframe(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Monitoring &amp; evaluation plan</h3>
        <label htmlFor="moe">KPIs, indicators, data sources, evaluation schedule</label>
        <textarea
          id="moe"
          rows={8}
          value={moe}
          onChange={(e) => setMoe(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Risk register</h3>
        <label htmlFor="risk">Technical, operational, financial and ethical risks with mitigation</label>
        <textarea
          id="risk"
          rows={8}
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        />
      </div>

      <div className="row-buttons">
        <button onClick={saveAll}>Save frameworks</button>
      </div>
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
