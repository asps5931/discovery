import MarkdownIt from "markdown-it";
import frontMatter from "markdown-it-front-matter";
import TurndownService from "turndown";
// @ts-expect-error no types shipped for the GFM plugin bundle
import { gfm } from "turndown-plugin-gfm";
import {
  decodeMermaidSource,
  mermaidFencesToFigures,
} from "./mermaidFigure";

const md = new MarkdownIt({
  // Allow <ul>/<ol> inside table cells (GFM pipe tables are inline-only otherwise).
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});
md.use(frontMatter, () => {});

// Markdown collapses blank lines, so intentional empty lines are stored as
// `&nbsp;` paragraphs and turned back into empty paragraphs on load.
const EMPTY_LINE_MD = "&nbsp;";

// Turndown turns cell lists into multiline `- item` markdown, which breaks pipe
// tables. Park list HTML as base64 so turndown cannot re-parse the tags.
const CELL_LIST_START = "\u00abCELLLIST\u00bb";
const CELL_LIST_END = "\u00ab/CELLLIST\u00bb";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  blankReplacement: (_content, node) => {
    const el = node as HTMLElement;
    if (el.nodeName === "P") return `\n\n${EMPTY_LINE_MD}\n\n`;
    if (el.nodeName === "TD" || el.nodeName === "TH") {
      const isFirst = el.parentNode?.firstChild === el;
      return isFirst ? "|  |" : "  |";
    }
    return (node as { isBlock?: boolean }).isBlock ? "\n\n" : "";
  },
});
turndown.use(gfm);

turndown.addRule("mermaidFigure", {
  filter: (node) =>
    node.nodeName === "FIGURE" &&
    (node as HTMLElement).classList.contains("mermaid-diagram") &&
    Boolean((node as HTMLElement).getAttribute("data-mermaid")),
  replacement: (_content, node) => {
    const encoded = (node as HTMLElement).getAttribute("data-mermaid") || "";
    try {
      const source = decodeMermaidSource(encoded);
      return `\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n`;
    } catch {
      return "\n\n";
    }
  },
});

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function compactListHtml(list: Element): string {
  const tag = list.nodeName.toLowerCase();
  const items = [...list.children]
    .filter((child) => child.nodeName === "LI")
    .map((li) => `<li>${(li.textContent || "").replace(/\s+/g, " ").trim()}</li>`)
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function encodeCellList(html: string): string {
  // utf8-safe base64
  const bytes = new TextEncoder().encode(html);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return CELL_LIST_START + btoa(binary) + CELL_LIST_END;
}

function restoreCellListMarkers(markdown: string): string {
  return markdown.replace(
    new RegExp(`${CELL_LIST_START}([A-Za-z0-9+/=]+)${CELL_LIST_END}`, "g"),
    (_match, b64: string) => {
      const binary = atob(b64);
      const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
  );
}

/**
 * TipTap wraps cell text in <p> and inserts <colgroup>, which makes
 * turndown-plugin-gfm skip the table and emit raw HTML. Normalize first.
 * Lists in cells are parked as single-line markers for round-trip.
 */
function normalizeEditorHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("colgroup").forEach((el) => el.remove());

  doc.querySelectorAll("th, td").forEach((cell) => {
    // TipTap puts <p> inside <li>; unwrap those first so list text is clean.
    cell.querySelectorAll("li > p").forEach((p) => unwrapElement(p));

    // Park lists before flattening other paragraphs.
    cell.querySelectorAll("ul, ol").forEach((list) => {
      list.replaceWith(doc.createTextNode(encodeCellList(compactListHtml(list))));
    });

    cell.querySelectorAll("p").forEach((p) => {
      const parent = p.parentNode;
      if (!parent) return;
      while (p.firstChild) parent.insertBefore(p.firstChild, p);
      if (p.nextSibling) parent.insertBefore(doc.createTextNode(" "), p);
      parent.removeChild(p);
    });
    cell.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
  });

  return doc.body.innerHTML;
}

/** Collapse turndown's leftover blank lines inside pipe tables. */
function tidyMarkdownTables(markdown: string): string {
  return markdown.replace(/(^|\n)(\|[^\n]*\n)+/g, (block) =>
    block
      .split("\n")
      .map((line) =>
        line.startsWith("|")
          ? "|" +
            line
              .slice(1, -1)
              .split("|")
              .map((c) => ` ${c.replace(/\s+/g, " ").trim()} `)
              .join("|") +
            "|"
          : line
      )
      .join("\n")
  );
}

/** Render markdown → HTML for preview / TipTap load. */
export function markdownToHtml(markdown: string): string {
  return (
    md
      .render(mermaidFencesToFigures(markdown || ""))
      .replace(/<p>(?:&nbsp;|\u00a0|&#160;)<\/p>/g, "<p></p>")
      // Images are block nodes in the editor; a <p> wrapper would leave empty
      // paragraphs behind that get saved as extra blank lines.
      .replace(/<p>\s*((?:<img\b[^>]*>\s*)+)<\/p>/g, "$1")
      // markdown-it may wrap our figure passthrough in a <p>.
      .replace(/<p>\s*(<figure\b[^>]*>[\s\S]*?<\/figure>)\s*<\/p>/g, "$1")
  );
}

const EMPTY_LINE_EDGES = new RegExp(
  `^(?:\\s*${EMPTY_LINE_MD}\\s*\\n)+|(?:\\n\\s*${EMPTY_LINE_MD}\\s*)+$`,
  "g"
);

/** Serialize editor HTML → markdown for storage. */
export function htmlToMarkdown(html: string): string {
  const normalized = normalizeEditorHtml(html || "");
  const markdown = restoreCellListMarkers(
    tidyMarkdownTables(turndown.turndown(normalized))
  ).trim();
  // Blank lines only matter between content, never at the edges of a doc.
  const trimmed = markdown === EMPTY_LINE_MD ? "" : markdown.replace(EMPTY_LINE_EDGES, "");
  return trimmed.trim() + "\n";
}
