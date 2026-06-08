/**
 * Budget panel - line item editor with categories, contingency and
 * indirects. Backend returns assembled budget with rows + totals.
 */
import { useMemo, useState } from "react";
import { BudgetResponse, grantsApi } from "../../api/grants";
import { Grant, grantsStore } from "../../store/grants";
import { GrantBudgetLine } from "../../store/projects";

const CATEGORIES = [
  "personnel",
  "consultants",
  "equipment",
  "consumables",
  "travel",
  "training",
  "meetings",
  "dissemination",
  "ethics",
];

function newLine(): GrantBudgetLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    category: "personnel",
    description: "",
    quantity: 1,
    unit_cost: 0,
    months: 1,
    notes: "",
  };
}

export default function BudgetPanel({ grant }: { grant: Grant }) {
  const [lines, setLines] = useState<GrantBudgetLine[]>(grant.budget_lines);
  const [currency, setCurrency] = useState(grant.currency || "USD");
  const [contingency, setContingency] = useState(grant.contingency_rate);
  const [indirects, setIndirects] = useState(grant.indirects_rate);
  const [narrative, setNarrative] = useState(grant.budget_narrative);
  const [summary, setSummary] = useState<BudgetResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localTotal = useMemo(() => {
    const sub = lines.reduce(
      (s, l) => s + l.quantity * l.unit_cost * Math.max(1, l.months),
      0
    );
    return sub * (1 + contingency + indirects);
  }, [lines, contingency, indirects]);

  function updateLine(i: number, patch: Partial<GrantBudgetLine>) {
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function add() {
    setLines([...lines, newLine()]);
  }

  function remove(i: number) {
    setLines(lines.filter((_, j) => j !== i));
  }

  function save() {
    grantsStore.update(grant.id, {
      budget_lines: lines,
      currency,
      contingency_rate: contingency,
      indirects_rate: indirects,
      budget_narrative: narrative,
    });
  }

  async function assemble() {
    setBusy(true);
    setError(null);
    try {
      const r = await grantsApi.assembleBudget({
        currency,
        lines: lines.map((l) => ({
          category: l.category,
          description: l.description,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          months: l.months,
          notes: l.notes || "",
        })),
        contingency_rate: contingency,
        indirects_rate: indirects,
      });
      setSummary(r);
      setNarrative(r.narrative);
      grantsStore.update(grant.id, {
        budget_lines: lines,
        currency,
        contingency_rate: contingency,
        indirects_rate: indirects,
        budget_narrative: r.narrative,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Budget parameters</h3>
        <div className="grid-2">
          <div>
            <label htmlFor="budget-currency">Currency</label>
            <input
              id="budget-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="budget-cont">Contingency rate (0-0.15)</label>
            <input
              id="budget-cont"
              type="number"
              step="0.01"
              min="0"
              max="0.15"
              value={contingency}
              onChange={(e) => setContingency(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="budget-ind">Indirects rate (0-0.40)</label>
            <input
              id="budget-ind"
              type="number"
              step="0.01"
              min="0"
              max="0.40"
              value={indirects}
              onChange={(e) => setIndirects(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Line items</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Months</th>
              <th>Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id}>
                <td>
                  <select
                    aria-label="category"
                    value={l.category}
                    onChange={(e) =>
                      updateLine(i, { category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    aria-label="description"
                    value={l.description}
                    onChange={(e) =>
                      updateLine(i, { description: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="quantity"
                    type="number"
                    min="0"
                    value={l.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="unit cost"
                    type="number"
                    min="0"
                    value={l.unit_cost}
                    onChange={(e) =>
                      updateLine(i, { unit_cost: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="months"
                    type="number"
                    min="1"
                    value={l.months}
                    onChange={(e) =>
                      updateLine(i, { months: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  {currency}{" "}
                  {(
                    l.quantity *
                    l.unit_cost *
                    Math.max(1, l.months)
                  ).toLocaleString()}
                </td>
                <td>
                  <button className="ghost danger" onClick={() => remove(i)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row-buttons">
          <button onClick={add}>+ Add line</button>
          <button onClick={save}>Save budget</button>
          <button onClick={assemble} disabled={busy}>
            {busy ? "Computing..." : "Assemble & summarise"}
          </button>
          <span className="chip">
            Estimated total: {currency} {localTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {summary && (
        <div className="card">
          <h3>Budget summary</h3>
          <ul>
            <li>
              Subtotal: {summary.currency} {summary.subtotal.toLocaleString()}
            </li>
            <li>
              Contingency: {summary.currency}{" "}
              {summary.contingency.toLocaleString()}
            </li>
            <li>
              Indirects: {summary.currency} {summary.indirects.toLocaleString()}
            </li>
            <li>
              <strong>
                Total: {summary.currency} {summary.total.toLocaleString()}
              </strong>
            </li>
          </ul>
          <h4>By category</h4>
          <ul>
            {Object.entries(summary.by_category).map(([k, v]) => (
              <li key={k}>
                {k}: {summary.currency} {v.toLocaleString()}
              </li>
            ))}
          </ul>
          <h4>Assembled rows</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.category}</td>
                  <td>{r.description}</td>
                  <td>
                    {summary.currency} {r.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3>Budget narrative</h3>
        <textarea
          aria-label="budget narrative"
          rows={8}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />
        <button onClick={save}>Save narrative</button>
      </div>
    </div>
  );
}
