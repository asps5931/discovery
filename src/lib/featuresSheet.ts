import { fileSyncEnabled, getCurrentRaw, writeContentFile } from "./contentSync";

export type FeaturesSheetData = {
  headers: string[];
  rows: string[][];
};

const DEFAULT_HEADERS = ["Key", "Feature", "Category", "Notes", "Shopify"];

function pathFor(clientSlug: string): string {
  return `clients/${clientSlug}/features-sheet.md`;
}

function localKey(clientSlug: string): string {
  return `client-portal:features-sheet:${clientSlug}`;
}

function emptySheet(): FeaturesSheetData {
  return { headers: [...DEFAULT_HEADERS], rows: [] };
}

/** Rename legacy How header → Shopify; insert Category after Feature. */
export function ensureCategoryColumn(data: FeaturesSheetData): FeaturesSheetData {
  const headers = data.headers.map((h) => (String(h) === "How" ? "Shopify" : String(h)));
  const featureIdx = headers.findIndex((h) => h.toLowerCase() === "feature");
  const catIdx = headers.findIndex((h) => h.toLowerCase() === "category");
  if (catIdx !== -1) {
    if (featureIdx === -1 || catIdx === featureIdx + 1) return { ...data, headers };
    const without = headers.filter((_, i) => i !== catIdx);
    const insertAt = without.findIndex((h) => h.toLowerCase() === "feature") + 1;
    const nextHeaders = [...without.slice(0, insertAt), "Category", ...without.slice(insertAt)];
    const nextRows = data.rows.map((row) => {
      const cells = row.map((c) => String(c ?? ""));
      const value = cells[catIdx] ?? "";
      const rest = cells.filter((_, i) => i !== catIdx);
      return [...rest.slice(0, insertAt), value, ...rest.slice(insertAt)];
    });
    return { headers: nextHeaders, rows: nextRows };
  }
  const insertAt = featureIdx === -1 ? 2 : featureIdx + 1;
  return {
    headers: [...headers.slice(0, insertAt), "Category", ...headers.slice(insertAt)],
    rows: data.rows.map((row) => {
      const cells = row.map((c) => String(c ?? ""));
      return [...cells.slice(0, insertAt), "", ...cells.slice(insertAt)];
    }),
  };
}

function parseSheetBody(raw: string): FeaturesSheetData {
  const body = raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  if (!body) return emptySheet();
  try {
    const parsed = JSON.parse(body) as FeaturesSheetData;
    if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) return emptySheet();
    return ensureCategoryColumn({
      headers: parsed.headers.map(String),
      rows: parsed.rows.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "")) : [])),
    });
  } catch {
    return emptySheet();
  }
}

function serializeSheet(data: FeaturesSheetData): string {
  return `---\ntitle: "Features Sheet"\n---\n\n${JSON.stringify(data, null, 2)}\n`;
}

export function getFeaturesSheet(clientSlug: string): FeaturesSheetData {
  if (!fileSyncEnabled) {
    try {
      const local = localStorage.getItem(localKey(clientSlug));
      if (local !== null) return parseSheetBody(local);
    } catch {
      /* ignore */
    }
  }
  const raw = getCurrentRaw(pathFor(clientSlug));
  return raw ? parseSheetBody(raw) : emptySheet();
}

export function saveFeaturesSheet(clientSlug: string, data: FeaturesSheetData): void {
  const content = serializeSheet(data);
  if (!fileSyncEnabled) {
    try {
      localStorage.setItem(localKey(clientSlug), content);
    } catch {
      /* ignore */
    }
    return;
  }
  void writeContentFile(pathFor(clientSlug), content).then((ok) => {
    if (ok) return;
    try {
      localStorage.setItem(localKey(clientSlug), content);
    } catch {
      /* ignore */
    }
  });
}

export function trimEmptyRows(rows: string[][]): string[][] {
  const next = rows.map((row) => row.map((c) => String(c ?? "")));
  while (next.length && next[next.length - 1]!.every((c) => c === "")) next.pop();
  return next;
}

export function wrapColumnIndexes(headers: string[]): number[] {
  return headers
    .map((h, i) => (h.toLowerCase() === "notes" || h.toLowerCase() === "shopify" ? i : -1))
    .filter((i) => i >= 0);
}

export function cellHasMarkup(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/** Minimal HTML subset used in features-sheet.md: <b>/<strong> and <br>. */
export function tokenizeCellHtml(html: string): Array<{ type: "text" | "bold" | "break"; text?: string }> {
  const normalized = html.replace(/<br\s*\/?>/gi, "\n");
  const tokens: Array<{ type: "text" | "bold" | "break"; text?: string }> = [];
  const parts = normalized.split("\n");
  parts.forEach((part, idx) => {
    if (idx > 0) tokens.push({ type: "break" });
    const re = /<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>|([^<]+)|(<[^>]+>)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(part)) !== null) {
      if (m[1] != null) tokens.push({ type: "bold", text: unescapeHtml(m[1]) });
      else if (m[2] != null) tokens.push({ type: "bold", text: unescapeHtml(m[2]) });
      else if (m[3] != null) tokens.push({ type: "text", text: unescapeHtml(m[3]) });
      // ignore unknown tags
    }
  });
  return tokens;
}
