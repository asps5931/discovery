/**
 * ponytail: assert list-in-table-cell markdown round-trips.
 * Run: node scripts/check-table-cell-lists.mjs
 */
import { Window } from "happy-dom";
import { createRequire } from "node:module";

const window = new Window({ url: "https://localhost/" });
globalThis.window = window;
globalThis.document = window.document;
globalThis.DOMParser = window.DOMParser;
globalThis.btoa = (s) => Buffer.from(s, "binary").toString("base64");
globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

// Load compiled? Codec is TS — import via vite-node or transpile.
// Use dynamic ts import through vite's ssrLoadModule if available; else duplicate
// the critical path with markdown-it + the built functions via esbuild-register.
const require = createRequire(import.meta.url);

async function loadCodec() {
  try {
    const { createServer } = await import("vite");
    const server = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    const mod = await server.ssrLoadModule("/src/lib/markdownCodec.ts");
    await server.close();
    return mod;
  } catch (err) {
    console.error("Failed to load markdownCodec via vite:", err);
    process.exit(1);
  }
}

const { markdownToHtml, htmlToMarkdown } = await loadCodec();

const src = `| Field | Value |
| --- | --- |
| Types | <ul><li>Handbags</li><li>Wallets / SLG</li></ul> |
| Note | plain text |
`;

const html = markdownToHtml(src);
if (!html.includes("<ul>") || !html.includes("<li>Handbags</li>")) {
  console.error("FAIL markdown→html lost cell list\n", html);
  process.exit(1);
}

const tipTapShape = html
  .replace(/<td>(.*?)<\/td>/gs, (_m, inner) => {
    if (inner.includes("<ul>")) {
      return `<td><ul><li><p>Handbags</p></li><li><p>Wallets / SLG</p></li></ul></td>`;
    }
    return `<td><p>${inner}</p></td>`;
  })
  .replace(/<th>/g, "<th><p>")
  .replace(/<\/th>/g, "</p></th>");

const back = htmlToMarkdown(tipTapShape);
if (!back.includes("<ul>") || !back.includes("<li>Handbags</li>") || !back.includes("<li>Wallets / SLG</li>")) {
  console.error("FAIL html→markdown lost cell list\n", back);
  process.exit(1);
}
if (back.includes("\n- ") && back.includes("| Types |")) {
  console.error("FAIL list escaped as multiline markdown inside table\n", back);
  process.exit(1);
}

const again = markdownToHtml(back);
if (!again.includes("<li>Handbags</li>")) {
  console.error("FAIL second markdown→html lost list\n", again);
  process.exit(1);
}

console.log("ok: table cell lists round-trip");
