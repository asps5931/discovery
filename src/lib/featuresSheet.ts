import {
  deleteContentFile,
  fileSyncEnabled,
  getCurrentRaw,
  listContentPaths,
  writeContentFile,
} from "./contentSync";

export type FeaturesSheetData = {
  headers: string[];
  rows: string[][];
  /** Pixel widths per header column; omitted → defaults from header names. */
  columnWidths?: number[];
};

export type FeaturesTab = {
  slug: string;
  name: string;
  order: number;
  data: FeaturesSheetData;
};

export type FeaturesWorkbook = {
  tabs: FeaturesTab[];
};

const DEFAULT_HEADERS = ["Key", "Feature", "Category", "Notes", "Shopify"];

function dirFor(clientSlug: string): string {
  return `clients/${clientSlug}/features-sheet/`;
}

function legacyPath(clientSlug: string): string {
  return `clients/${clientSlug}/features-sheet.md`;
}

function tabPath(clientSlug: string, slug: string): string {
  return `${dirFor(clientSlug)}${slug}.md`;
}

function localKey(clientSlug: string): string {
  return `client-portal:features-workbook:${clientSlug}`;
}

function emptySheet(): FeaturesSheetData {
  return { headers: [...DEFAULT_HEADERS], rows: [] };
}

export function slugifyTabName(name: string): string {
  const slug = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "sheet";
}

export function uniqueTabSlug(base: string, used: Set<string>): string {
  let slug = base || "sheet";
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let n = 2;
  while (used.has(`${slug}-${n}`)) n += 1;
  const next = `${slug}-${n}`;
  used.add(next);
  return next;
}

function spliceColumnWidths(
  widths: number[] | undefined,
  fromIdx: number,
  deleteCount: number,
  insert: number[],
): number[] | undefined {
  if (!widths?.length) return widths;
  const next = [...widths];
  next.splice(fromIdx, deleteCount, ...insert);
  return next;
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
    const moved = spliceColumnWidths(data.columnWidths, catIdx, 1, []);
    return {
      headers: nextHeaders,
      rows: nextRows,
      columnWidths: spliceColumnWidths(moved, insertAt, 0, [120]),
    };
  }
  const insertAt = featureIdx === -1 ? 2 : featureIdx + 1;
  return {
    headers: [...headers.slice(0, insertAt), "Category", ...headers.slice(insertAt)],
    rows: data.rows.map((row) => {
      const cells = row.map((c) => String(c ?? ""));
      return [...cells.slice(0, insertAt), "", ...cells.slice(insertAt)];
    }),
    columnWidths: spliceColumnWidths(data.columnWidths, insertAt, 0, [120]),
  };
}

function parseColumnWidths(raw: unknown, colCount: number): number[] | undefined {
  if (!Array.isArray(raw) || !colCount) return undefined;
  const widths = Array.from({ length: colCount }, (_, i) => {
    const w = Number(raw[i]);
    return Number.isFinite(w) && w > 0 ? w : 0;
  });
  return widths.some((w) => w > 0) ? widths : undefined;
}

function parseSheetJson(body: string): FeaturesSheetData {
  if (!body) return emptySheet();
  try {
    const parsed = JSON.parse(body) as FeaturesSheetData;
    if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) return emptySheet();
    const headers = parsed.headers.map(String);
    return ensureCategoryColumn({
      headers,
      rows: parsed.rows.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "")) : [])),
      columnWidths: parseColumnWidths(parsed.columnWidths, headers.length),
    });
  } catch {
    return emptySheet();
  }
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: m[2].trim() };
}

function serializeTab(tab: FeaturesTab): string {
  const title = tab.name.replace(/"/g, '\\"');
  return (
    `---\ntitle: "${title}"\norder: ${tab.order}\n---\n\n` +
    `${JSON.stringify(tab.data, null, 2)}\n`
  );
}

function parseTabFile(slug: string, raw: string, fallbackOrder: number): FeaturesTab {
  const { meta, body } = parseFrontmatter(raw);
  const order = Number(meta.order);
  return {
    slug,
    name: meta.title || slug,
    order: Number.isFinite(order) ? order : fallbackOrder,
    data: parseSheetJson(body),
  };
}

function defaultWorkbook(): FeaturesWorkbook {
  return {
    tabs: [{ slug: "features", name: "Features", order: 0, data: emptySheet() }],
  };
}

function readTabsFromDir(clientSlug: string): FeaturesTab[] {
  const dir = dirFor(clientSlug);
  const paths = listContentPaths(dir).filter(
    (p) => p.endsWith(".md") && !p.slice(dir.length).includes("/"),
  );
  return paths
    .map((p, i) => {
      const slug = p.slice(dir.length).replace(/\.md$/, "");
      const raw = getCurrentRaw(p);
      return raw ? parseTabFile(slug, raw, i) : null;
    })
    .filter((t): t is FeaturesTab => t != null)
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function getFeaturesWorkbook(clientSlug: string): FeaturesWorkbook {
  if (!fileSyncEnabled) {
    try {
      const local = localStorage.getItem(localKey(clientSlug));
      if (local !== null) {
        const parsed = JSON.parse(local) as FeaturesWorkbook;
        if (Array.isArray(parsed.tabs) && parsed.tabs.length) return parsed;
      }
    } catch {
      /* ignore */
    }
  }

  const tabs = readTabsFromDir(clientSlug);
  if (tabs.length) return { tabs };

  const legacy = getCurrentRaw(legacyPath(clientSlug));
  if (legacy) {
    const { body } = parseFrontmatter(legacy);
    return {
      tabs: [{ slug: "features", name: "Features", order: 0, data: parseSheetJson(body) }],
    };
  }

  return defaultWorkbook();
}

/** Back-compat: first tab only. */
export function getFeaturesSheet(clientSlug: string): FeaturesSheetData {
  return getFeaturesWorkbook(clientSlug).tabs[0]?.data ?? emptySheet();
}

export function saveFeaturesWorkbook(clientSlug: string, workbook: FeaturesWorkbook): void {
  const tabs = workbook.tabs.length ? workbook.tabs : defaultWorkbook().tabs;
  const normalized = tabs.map((tab, order) => ({
    ...tab,
    order,
    slug: tab.slug || uniqueTabSlug(slugifyTabName(tab.name), new Set()),
    data: (() => {
      const headers = tab.data.headers.map(String);
      const columnWidths = parseColumnWidths(tab.data.columnWidths, headers.length);
      return {
        headers,
        rows: trimEmptyRows(tab.data.rows.map((row) => row.map((c) => String(c ?? "")))),
        ...(columnWidths ? { columnWidths } : {}),
      };
    })(),
  }));

  // Deduplicate slugs.
  const used = new Set<string>();
  for (const tab of normalized) {
    tab.slug = uniqueTabSlug(slugifyTabName(tab.slug || tab.name), used);
  }

  if (!fileSyncEnabled) {
    try {
      localStorage.setItem(localKey(clientSlug), JSON.stringify({ tabs: normalized }));
    } catch {
      /* ignore */
    }
    return;
  }

  const dir = dirFor(clientSlug);
  const nextPaths = new Set(normalized.map((t) => tabPath(clientSlug, t.slug)));
  const existing = listContentPaths(dir).filter(
    (p) => p.endsWith(".md") && !p.slice(dir.length).includes("/"),
  );

  for (const tab of normalized) {
    void writeContentFile(tabPath(clientSlug, tab.slug), serializeTab(tab));
  }
  for (const path of existing) {
    if (!nextPaths.has(path)) void deleteContentFile(path);
  }
  // Drop legacy single-file source once directory tabs exist.
  if (getCurrentRaw(legacyPath(clientSlug)) !== undefined) {
    void deleteContentFile(legacyPath(clientSlug));
  }
}

/** Back-compat: save as the Features tab (or first tab). */
export function saveFeaturesSheet(clientSlug: string, data: FeaturesSheetData): void {
  const current = getFeaturesWorkbook(clientSlug);
  const tabs = current.tabs.length ? [...current.tabs] : defaultWorkbook().tabs;
  tabs[0] = {
    ...(tabs[0] ?? { slug: "features", name: "Features", order: 0, data: emptySheet() }),
    data,
  };
  saveFeaturesWorkbook(clientSlug, { tabs });
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

/** Minimal HTML subset used in features-sheet cells: <b>/<strong> and <br>. */
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
    }
  });
  return tokens;
}

export {
  cellToPlainText,
  downloadFeaturesExport,
  featuresSheetToCsv,
  featuresSheetToXlsx,
} from "./featuresSheetExport";
