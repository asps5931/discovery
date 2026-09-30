import MarkdownIt from "markdown-it";
import frontMatter from "markdown-it-front-matter";
import TurndownService from "turndown";
// @ts-expect-error no types shipped for the GFM plugin bundle
import { gfm } from "turndown-plugin-gfm";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
});
md.use(frontMatter, () => {});

// Markdown collapses blank lines, so intentional empty lines are stored as
// `&nbsp;` paragraphs and turned back into empty paragraphs on load.
const EMPTY_LINE_MD = "&nbsp;";

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

/**
 * TipTap wraps cell text in <p> and inserts <colgroup>, which makes
 * turndown-plugin-gfm skip the table and emit raw HTML. Normalize first.
 */
function normalizeEditorHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("colgroup").forEach((el) => el.remove());

  doc.querySelectorAll("th, td").forEach((cell) => {
    // Flatten block wrappers TipTap puts inside cells
    cell.querySelectorAll("p").forEach((p) => {
      const parent = p.parentNode;
      if (!parent) return;
      while (p.firstChild) parent.insertBefore(p.firstChild, p);
      // Keep a space between unwrapped blocks if needed
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
      .render(markdown || "")
      .replace(/<p>(?:&nbsp;|\u00a0|&#160;)<\/p>/g, "<p></p>")
      // Images are block nodes in the editor; a <p> wrapper would leave empty
      // paragraphs behind that get saved as extra blank lines.
      .replace(/<p>\s*((?:<img\b[^>]*>\s*)+)<\/p>/g, "$1")
  );
}

const EMPTY_LINE_EDGES = new RegExp(
  `^(?:\\s*${EMPTY_LINE_MD}\\s*\\n)+|(?:\\n\\s*${EMPTY_LINE_MD}\\s*)+$`,
  "g"
);

/** Serialize editor HTML → markdown for storage. */
export function htmlToMarkdown(html: string): string {
  const normalized = normalizeEditorHtml(html || "");
  const markdown = tidyMarkdownTables(turndown.turndown(normalized)).trim();
  // Blank lines only matter between content, never at the edges of a doc.
  const trimmed = markdown === EMPTY_LINE_MD ? "" : markdown.replace(EMPTY_LINE_EDGES, "");
  return trimmed.trim() + "\n";
}
