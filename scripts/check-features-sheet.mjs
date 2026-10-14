/**
 * ponytail: smoke-check features sheet Category + HTML token helper.
 * Run: node scripts/check-features-sheet.mjs
 */
import assert from "node:assert/strict";

function ensureCategoryColumn(data) {
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

function tokenizeCellHtml(html) {
  const normalized = html.replace(/<br\s*\/?>/gi, "\n");
  const tokens = [];
  const parts = normalized.split("\n");
  parts.forEach((part, idx) => {
    if (idx > 0) tokens.push({ type: "break" });
    const re = /<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>|([^<]+)|(<[^>]+>)/gi;
    let m;
    while ((m = re.exec(part)) !== null) {
      if (m[1] != null) tokens.push({ type: "bold", text: m[1] });
      else if (m[2] != null) tokens.push({ type: "bold", text: m[2] });
      else if (m[3] != null) tokens.push({ type: "text", text: m[3] });
    }
  });
  return tokens;
}

const withCategory = ensureCategoryColumn({
  headers: ["Key", "Feature", "Notes", "How"],
  rows: [["COMM-13", "Image URL", "Full URLs", "TBD"]],
});
assert.deepEqual(withCategory.headers, ["Key", "Feature", "Category", "Notes", "Shopify"]);

const tokens = tokenizeCellHtml("A <b>media_gallery</b> path.<br><br>Option 2");
assert.deepEqual(
  tokens.map((t) => t.type),
  ["text", "bold", "text", "break", "break", "text"],
);
assert.equal(tokens[1].text, "media_gallery");

function cellToPlainText(value) {
  return tokenizeCellHtml(String(value ?? ""))
    .map((t) => (t.type === "break" ? "\n" : (t.text ?? "")))
    .join("");
}

function csvEscape(value) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function featuresSheetToCsv(data) {
  const grid = [data.headers, ...data.rows].map((row) => row.map(cellToPlainText));
  return grid.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

const exportSample = {
  headers: ["Key", "Feature"],
  rows: [["COMM-1", 'Say "hi", please<br><b>bold</b>']],
};
const csv = featuresSheetToCsv(exportSample);
assert.ok(csv.includes('"Say ""hi"", please\nbold"'));
assert.equal(cellToPlainText("a<br><b>b</b>"), "a\nb");

const { featuresSheetToXlsx } = await import("../src/lib/featuresSheetExport.ts");
const xlsx = featuresSheetToXlsx(exportSample);
assert.equal(xlsx[0], 0x50); // P
assert.equal(xlsx[1], 0x4b); // K
const asText = new TextDecoder().decode(xlsx);
assert.ok(asText.includes("sheetData"));
assert.ok(asText.includes("Say &quot;hi&quot;, please"));

function slugifyTabName(name) {
  const slug = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "sheet";
}

function uniqueTabSlug(base, used) {
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

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta = {};
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

const used = new Set();
assert.equal(uniqueTabSlug(slugifyTabName("CMS Notes"), used), "cms-notes");
assert.equal(uniqueTabSlug(slugifyTabName("CMS Notes"), used), "cms-notes-2");

const tabMd = `---
title: "Storefront"
order: 1
---

{"headers":["Key"],"rows":[["A"]]}
`;
const { meta, body } = parseFrontmatter(tabMd);
assert.equal(meta.title, "Storefront");
assert.equal(meta.order, "1");
assert.deepEqual(JSON.parse(body).rows, [["A"]]);

console.log("ok: features sheet Category + HTML tokens + export + multi-tab");
