export type OceanItemKind =
  | "idea"
  | "proposal"
  | "literature"
  | "reference"
  | "sample-size"
  | "hypothesis"
  | "statistics"
  | "questionnaire"
  | "spss"
  | "discussion"
  | "manuscript"
  | "presentation"
  | "integrity"
  | "quality"
  | "journal"
  | "export";

export interface OceanItem {
  id: string;
  kind: OceanItemKind;
  title: string;
  createdAt: number;
  payload: unknown;
}

const KEY = "oceanfloor.knowledgeOcean.v1";

function read(): OceanItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as OceanItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OceanItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("ocean:changed"));
}

export const oceanStore = {
  list(): OceanItem[] {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  save(item: Omit<OceanItem, "id" | "createdAt">): OceanItem {
    const full: OceanItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    write([full, ...read()]);
    return full;
  },
  remove(id: string): void {
    write(read().filter((i) => i.id !== id));
  },
  clear(): void {
    write([]);
  },
};
