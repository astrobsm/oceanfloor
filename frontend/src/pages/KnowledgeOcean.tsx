import { useEffect, useState } from "react";
import { oceanStore, OceanItem } from "../api/ocean";

export default function KnowledgeOcean() {
  const [items, setItems] = useState<OceanItem[]>(() => oceanStore.list());
  const [filter, setFilter] = useState<string>("all");
  const [opened, setOpened] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setItems(oceanStore.list());
    window.addEventListener("ocean:changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ocean:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const kinds = Array.from(new Set(items.map((i) => i.kind))).sort();
  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  function exportAll() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `knowledge-ocean-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <h2>Knowledge Ocean Repository</h2>
      <p className="disclaimer">
        Local browser repository (stored in <code>localStorage</code>) of saved engine outputs.
        Use the "Save to Knowledge Ocean" button on any engine result to add it here.
      </p>

      <div className="card">
        <div className="row-between">
          <div>
            <label>Filter by engine</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All ({items.length})</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k} ({items.filter((i) => i.kind === k).length})
                </option>
              ))}
            </select>
          </div>
          <div className="row-buttons">
            <button type="button" onClick={exportAll} disabled={!items.length}>
              Export JSON
            </button>
            <button
              type="button"
              className="ghost danger"
              onClick={() => {
                if (confirm("Clear all saved items?")) oceanStore.clear();
              }}
              disabled={!items.length}
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <p className="muted">Nothing saved yet.</p>
        </div>
      )}

      {filtered.map((it) => (
        <div key={it.id} className="card">
          <div className="row-between">
            <div>
              <h3>
                {it.title} <span className="badge">{it.kind}</span>
              </h3>
              <p className="muted">{new Date(it.createdAt).toLocaleString()}</p>
            </div>
            <div className="row-buttons">
              <button
                type="button"
                className="ghost"
                onClick={() => setOpened(opened === it.id ? null : it.id)}
              >
                {opened === it.id ? "Hide" : "View"}
              </button>
              <button
                type="button"
                className="ghost danger"
                onClick={() => oceanStore.remove(it.id)}
              >
                Delete
              </button>
            </div>
          </div>
          {opened === it.id && (
            <pre>{JSON.stringify(it.payload, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
