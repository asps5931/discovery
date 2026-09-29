import MarkdownIt from "markdown-it";
import frontMatter from "markdown-it-front-matter";

// Renders a note's markdown to HTML, stripping any YAML frontmatter.
// markdown-it's "default" preset enables tables and strikethrough (GFM-like).
export function renderNoteMarkdown(markdown: string): string {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  });
  md.use(frontMatter, () => {});
  return md.render(markdown);
}
