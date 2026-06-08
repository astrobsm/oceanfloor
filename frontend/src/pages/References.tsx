import { FormEvent, useState } from "react";
import { apiPost } from "../api/client";
import SaveButton from "../components/SaveButton";

interface FormatResponse {
  style: string;
  rendered: string;
}

export default function References() {
  const [rendered, setRendered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const authorsRaw = String(form.get("authors") ?? "");
    const authors = authorsRaw
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => {
        const [family, given] = a.split(",").map((s) => s.trim());
        return { family: family ?? "", given: given ?? "" };
      });

    const payload = {
      style: form.get("style"),
      reference: {
        title: form.get("title"),
        authors,
        journal: form.get("journal") || null,
        year: form.get("year") ? Number(form.get("year")) : null,
        volume: form.get("volume") || null,
        issue: form.get("issue") || null,
        pages: form.get("pages") || null,
        doi: form.get("doi") || null,
        pmid: form.get("pmid") || null,
      },
    };
    try {
      const data = await apiPost<FormatResponse>("/references/format", payload);
      setRendered(data.rendered);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Universal Referencing</h2>
      <form className="card" onSubmit={submit}>
        <label>Citation style</label>
        <select name="style" defaultValue="vancouver">
          <option value="vancouver">Vancouver</option>
          <option value="ama">AMA</option>
          <option value="apa7">APA 7</option>
          <option value="harvard">Harvard</option>
          <option value="nature">Nature</option>
        </select>
        <label>Title</label>
        <input name="title" required />
        <label>Authors (Family, Given; separated by ;)</label>
        <input name="authors" placeholder="Smith, John A; Doe, Jane" />
        <label>Journal</label>
        <input name="journal" />
        <label>Year</label>
        <input name="year" type="number" />
        <label>Volume / Issue / Pages</label>
        <input name="volume" placeholder="Volume" />
        <input name="issue" placeholder="Issue" />
        <input name="pages" placeholder="Pages" />
        <label>DOI (or PMID) — required for verifiable citation</label>
        <input name="doi" placeholder="10.xxxx/xxxxx" />
        <input name="pmid" placeholder="PMID" />
        <button type="submit">Format</button>
      </form>

      {error && <p className="error">{error}</p>}
      {rendered && (
        <div className="card">
          <div className="row-between">
            <h3>Formatted citation</h3>
            <SaveButton kind="reference" title={rendered.slice(0, 80)} payload={{ rendered }} />
          </div>
          <pre>{rendered}</pre>
        </div>
      )}
    </div>
  );
}
