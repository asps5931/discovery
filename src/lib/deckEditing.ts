export interface DeckParts {
  frontmatter: string;
  slides: string[];
}

// Splits a Marp deck into its YAML frontmatter block and individual slides.
// Slides are separated by a line containing only "---".
export function parseDeck(markdown: string): DeckParts {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  let frontmatter = "";
  let start = 0;

  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        frontmatter = lines.slice(0, i + 1).join("\n");
        start = i + 1;
        break;
      }
    }
  }

  const slides: string[] = [];
  let current: string[] = [];

  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      slides.push(current.join("\n"));
      current = [];
    } else {
      current.push(lines[i]);
    }
  }
  if (current.length) slides.push(current.join("\n"));

  return { frontmatter, slides: slides.map((s) => s.trim()) };
}

export function serializeDeck(parts: DeckParts): string {
  const body = parts.slides.join("\n\n---\n\n");
  if (parts.frontmatter) {
    return `${parts.frontmatter}\n\n${body}\n`;
  }
  return `${body}\n`;
}
