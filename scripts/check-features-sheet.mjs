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

console.log("ok: features sheet Category + HTML tokens");
