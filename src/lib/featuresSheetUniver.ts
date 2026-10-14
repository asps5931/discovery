import type { FUniver } from "@univerjs/presets";
import {
  cellHasMarkup,
  escapeHtml,
  slugifyTabName,
  tokenizeCellHtml,
  trimEmptyRows,
  uniqueTabSlug,
  wrapColumnIndexes,
  type FeaturesSheetData,
  type FeaturesTab,
  type FeaturesWorkbook,
} from "./featuresSheet";

type RichLike = {
  toPlainText: () => string;
  getData: () => {
    body?: {
      dataStream?: string;
      textRuns?: Array<{ st: number; ed: number; ts?: { bl?: number | boolean } | null }>;
    } | null;
  };
};

function isRich(value: unknown): value is RichLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RichLike).toPlainText === "function" &&
    typeof (value as RichLike).getData === "function"
  );
}

export function richTextToHtml(value: RichLike): string {
  const body = value.getData().body;
  const stream = body?.dataStream?.replace(/\r\n$/, "").replace(/\n$/, "") ?? value.toPlainText();
  if (!stream) return "";

  const bold = new Array(stream.length).fill(false);
  for (const run of body?.textRuns ?? []) {
    if (run.ts?.bl === 1 || run.ts?.bl === true) {
      for (let i = run.st; i < run.ed && i < bold.length; i++) bold[i] = true;
    }
  }

  let out = "";
  let i = 0;
  while (i < stream.length) {
    if (stream[i] === "\r") {
      out += "<br>";
      i += 1;
      continue;
    }
    if (bold[i]) {
      let j = i;
      while (j < stream.length && bold[j] && stream[j] !== "\r") j += 1;
      out += `<b>${escapeHtml(stream.slice(i, j))}</b>`;
      i = j;
    } else {
      let j = i;
      while (j < stream.length && !bold[j] && stream[j] !== "\r") j += 1;
      out += escapeHtml(stream.slice(i, j));
      i = j;
    }
  }
  return out;
}

export function cellValueToStorage(value: unknown): string {
  if (value == null) return "";
  if (isRich(value)) return richTextToHtml(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function htmlToRichText(api: FUniver, html: string) {
  let builder = api.newRichText();
  const tokens = tokenizeCellHtml(html);
  let started = false;
  for (const token of tokens) {
    if (token.type === "break") {
      builder = builder.paragraph();
      started = true;
      continue;
    }
    const text = token.text ?? "";
    if (!text && !started) continue;
    builder = token.type === "bold" ? builder.bold(text) : builder.text(text);
    started = true;
  }
  if (!started) builder = builder.text("");

  // Cell rich text often ships a fixed pageSize.height that clips wrapped content.
  const data = builder.getData();
  data.documentStyle = {
    ...(data.documentStyle ?? {}),
    pageSize: {
      width: data.documentStyle?.pageSize?.width ?? 400,
    },
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 2,
    marginRight: 2,
  };
  return data;
}

const widthFor = (header: string, index: number) => {
  const key = header.toLowerCase();
  if (key === "shopify") return 420;
  if (key === "notes") return 300;
  if (key === "feature") return 170;
  if (key === "category") return 120;
  if (key === "key" || key === "id") return 90;
  return index < 3 ? 120 : 200;
};

function fillWorksheet(
  api: FUniver,
  sheet: {
    getRange: (...args: number[]) => {
      setRichTextValueForCell: (v: unknown) => unknown;
      setValue: (v: unknown) => unknown;
      setFontWeight: (v: string) => { setBackground: (v: string) => { setHorizontalAlignment: (v: string) => { setVerticalAlignment: (v: string) => unknown } } };
      setWrap: (v: boolean) => { setVerticalAlignment: (v: string) => { setWrapStrategy?: (v: unknown) => unknown } };
      setWrapStrategy?: (v: unknown) => unknown;
      setHorizontalAlignment: (v: string) => unknown;
    };
    setColumnWidth: (c: number, w: number) => unknown;
    setFrozenRows?: (n: number) => unknown;
    setRowHeight?: (row: number, height: number) => unknown;
    setRowHeightsForced?: (start: number, num: number, height: number) => unknown;
  },
  data: FeaturesSheetData,
): string[][] {
  const grid = [data.headers, ...data.rows];
  const rowCount = grid.length;
  const colCount = data.headers.length;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const raw = String(grid[r]?.[c] ?? "");
      const range = sheet.getRange(r, c);
      if (cellHasMarkup(raw)) {
        range.setRichTextValueForCell(htmlToRichText(api, raw));
      } else {
        range.setValue(raw);
      }
    }
  }

  if (colCount > 0) {
    sheet
      .getRange(0, 0, 1, colCount)
      .setFontWeight("bold")
      .setBackground("#e5e7eb")
      .setHorizontalAlignment("left")
      .setVerticalAlignment("bottom");
  }

  for (let c = 0; c < colCount; c++) {
    const saved = data.columnWidths?.[c];
    sheet.setColumnWidth(
      c,
      typeof saved === "number" && saved > 0 ? saved : widthFor(data.headers[c] ?? "", c),
    );
  }

  const wrapCols = wrapColumnIndexes(data.headers);
  const wrapRows = Math.max(rowCount + 15, 30);
  for (const c of wrapCols) {
    const colRange = sheet.getRange(0, c, wrapRows, 1);
    colRange.setWrap(true).setVerticalAlignment("bottom");
    if (typeof colRange.setWrapStrategy === "function" && api.Enum?.WrapStrategy?.WRAP != null) {
      colRange.setWrapStrategy(api.Enum.WrapStrategy.WRAP);
    }
  }

  sheet.getRange(0, 0, wrapRows, colCount).setHorizontalAlignment("left");
  if (typeof sheet.setFrozenRows === "function") {
    sheet.setFrozenRows(1);
  }

  sizeRowsForWrappedContent(sheet, grid, wrapCols);
  return grid;
}

export function loadWorkbookIntoUniver(
  api: FUniver,
  workbookData: FeaturesWorkbook,
  zoomRatio = 1,
  activeSlug?: string | null,
): Map<string, string> {
  const zoom = Math.min(4, Math.max(0.1, zoomRatio));
  const tabs =
    workbookData.tabs.length > 0
      ? workbookData.tabs
      : [{ slug: "features", name: "Features", order: 0, data: { headers: [], rows: [] } }];

  const used = new Set<string>();
  const sheetIdToSlug = new Map<string, string>();
  const sheetOrder: string[] = [];
  const sheets: Record<string, { id: string; name: string; zoomRatio: number; rowCount: number; columnCount: number }> =
    {};

  for (const tab of tabs) {
    const slug = uniqueTabSlug(slugifyTabName(tab.slug || tab.name), used);
    sheetOrder.push(slug);
    sheetIdToSlug.set(slug, slug);
    sheets[slug] = {
      id: slug,
      name: tab.name || slug,
      zoomRatio: zoom,
      rowCount: Math.max(tab.data.rows.length + 20, 40),
      columnCount: Math.max(tab.data.headers.length + 3, 8),
    };
  }

  const workbook = api.createWorkbook({
    name: "Features",
    sheetOrder,
    sheets,
  });

  tabs.forEach((tab, i) => {
    const slug = sheetOrder[i]!;
    const sheet = workbook.getSheetBySheetId?.(slug) ?? workbook.getSheetByName?.(tab.name);
    if (!sheet) return;
    const data = tab.data;
    const grid = fillWorksheet(api, sheet as never, data);
    window.setTimeout(() => {
      try {
        sizeRowsForWrappedContent(sheet as never, grid, wrapColumnIndexes(data.headers));
      } catch {
        /* disposed */
      }
    }, 50);
  });

  const preferred =
    (activeSlug && workbook.getSheetBySheetId?.(activeSlug)) ||
    workbook.getSheetBySheetId?.(sheetOrder[0]!) ||
    workbook.getSheets?.()?.[0];
  if (preferred && typeof workbook.setActiveSheet === "function") workbook.setActiveSheet(preferred);

  return sheetIdToSlug;
}

/** @deprecated Prefer loadWorkbookIntoUniver */
export function loadSheetIntoUniver(
  api: FUniver,
  data: FeaturesSheetData,
  zoomRatio = 1,
): void {
  loadWorkbookIntoUniver(
    api,
    { tabs: [{ slug: "features", name: "Features", order: 0, data }] },
    zoomRatio,
  );
}

/** Use Univer's own auto-height APIs so wrapped Shopify/Notes cells fully show. */
function autoFitFeatureRows(
  sheet: {
    setRowAutoHeight?: (start: number, num: number) => unknown;
    autoFitRow?: (row: number) => unknown;
    setRangesAutoHeight?: (ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>) => unknown;
  },
  rowCount: number,
  colCount: number,
): void {
  if (rowCount <= 0) return;
  sheet.setRowAutoHeight?.(0, rowCount);
  for (let r = 0; r < rowCount; r++) {
    sheet.autoFitRow?.(r);
  }
  sheet.setRangesAutoHeight?.([
    {
      startRow: 0,
      endRow: rowCount - 1,
      startColumn: 0,
      endColumn: Math.max(colCount - 1, 0),
    },
  ]);
}

function estimateWrappedLines(raw: string, charsPerLine: number): number {
  const plain = raw.replace(/<[^>]+>/g, "");
  const brLines = Math.max(raw.split(/<br\s*\/?>/i).length, plain.split(/\n/).length);
  const wrapEstimate = Math.max(1, Math.ceil(plain.length / Math.max(charsPerLine, 20)));
  return Math.max(brLines, wrapEstimate);
}

function sizeRowsForWrappedContent(
  sheet: {
    setRowHeight?: (row: number, height: number) => unknown;
    setRowHeightsForced?: (start: number, num: number, height: number) => unknown;
  },
  grid: string[][],
  wrapCols: number[],
): void {
  if (!wrapCols.length) return;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] ?? [];
    let lines = 1;
    for (const c of wrapCols) {
      const key = c; // Notes ~45 chars/line at 300px, Shopify ~55 at 420px
      const charsPerLine = c === wrapCols[wrapCols.length - 1] ? 55 : 45;
      lines = Math.max(lines, estimateWrappedLines(String(row[key] ?? ""), charsPerLine));
    }
    const height = Math.min(Math.max(lines * 20 + 10, 28), 520);
    if (typeof sheet.setRowHeightsForced === "function") {
      sheet.setRowHeightsForced(r, 1, height);
    } else {
      sheet.setRowHeight?.(r, height);
    }
  }
}

function readWorksheetData(sheet: {
  getLastRow: () => number;
  getLastColumn: () => number;
  getColumnWidth?: (c: number) => number;
  getRange: (
    r: number,
    c: number,
    rr: number,
    cc: number,
  ) => { getValues: (rich?: boolean) => unknown[][] };
}): FeaturesSheetData {
  const lastRow = Math.max(sheet.getLastRow(), 0);
  const lastCol = Math.max(sheet.getLastColumn(), 0);
  const values = sheet.getRange(0, 0, lastRow + 1, lastCol + 1).getValues(true);

  const headers = (values[0] ?? []).map((cell) => cellValueToStorage(cell));
  while (headers.length && headers[headers.length - 1] === "") headers.pop();

  const rows = trimEmptyRows(
    values.slice(1).map((row) => headers.map((_, c) => cellValueToStorage(row?.[c]))),
  );

  const columnWidths =
    typeof sheet.getColumnWidth === "function" && headers.length
      ? headers.map((_, c) => {
          const w = Number(sheet.getColumnWidth!(c));
          return Number.isFinite(w) && w > 0 ? w : widthFor(headers[c] ?? "", c);
        })
      : undefined;

  return columnWidths ? { headers, rows, columnWidths } : { headers, rows };
}

export function readSheetFromUniver(api: FUniver): FeaturesSheetData {
  const sheet = api.getActiveWorkbook()?.getActiveSheet();
  if (!sheet) return { headers: [], rows: [] };
  return readWorksheetData(sheet);
}

export function readWorkbookFromUniver(
  api: FUniver,
  sheetIdToSlug?: Map<string, string>,
): { workbook: FeaturesWorkbook; sheetIdToSlug: Map<string, string> } {
  const wb = api.getActiveWorkbook();
  const sheets = wb?.getSheets?.() ?? [];
  if (!sheets.length) {
    return {
      workbook: { tabs: [{ slug: "features", name: "Features", order: 0, data: { headers: [], rows: [] } }] },
      sheetIdToSlug: new Map([["features", "features"]]),
    };
  }

  const used = new Set<string>();
  const nextMap = new Map<string, string>();
  const tabs: FeaturesTab[] = sheets.map((sheet, order) => {
    const id = typeof sheet.getSheetId === "function" ? sheet.getSheetId() : `sheet-${order}`;
    const name =
      (typeof sheet.getSheetName === "function" ? sheet.getSheetName() : null) ||
      (typeof sheet.getName === "function" ? sheet.getName() : null) ||
      `Sheet${order + 1}`;
    const preferred =
      sheetIdToSlug?.get(id) ||
      slugifyTabName(name);
    const slug = uniqueTabSlug(preferred, used);
    nextMap.set(id, slug);
    return {
      slug,
      name: String(name),
      order,
      data: readWorksheetData(sheet),
    };
  });

  return { workbook: { tabs }, sheetIdToSlug: nextMap };
}
