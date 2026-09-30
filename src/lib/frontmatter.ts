const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const match = raw.match(FRONTMATTER);
  if (!match) return { frontmatter: null, body: raw };
  return { frontmatter: match[1], body: raw.slice(match[0].length).replace(/^\r?\n/, "") };
}

export function stripFrontmatter(raw: string): string {
  return splitFrontmatter(raw).body;
}

function joinFrontmatter(frontmatter: string | null, body: string): string {
  const trimmed = frontmatter?.trim();
  return trimmed ? `---\n${trimmed}\n---\n\n${body}` : body;
}

/** Replaces the markdown body while keeping the file's existing frontmatter. */
export function replaceBody(raw: string, body: string): string {
  return joinFrontmatter(splitFrontmatter(raw).frontmatter, stripFrontmatter(body));
}

export function getFrontmatterField(raw: string, key: string): string | null {
  const { frontmatter } = splitFrontmatter(raw);
  if (!frontmatter) return null;
  const line = frontmatter
    .split(/\r?\n/)
    .find((l) => l.match(new RegExp(`^${key}\\s*:`, "i")));
  if (!line) return null;
  const value = line.slice(line.indexOf(":") + 1).trim();
  if (!value) return null;
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      /* fall through */
    }
  }
  return value.replace(/^['"]|['"]$/g, "");
}

/** Sets (or removes, when value is null/empty) a single-line frontmatter field. */
export function setFrontmatterField(raw: string, key: string, value: string | null): string {
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = (frontmatter ?? "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.match(new RegExp(`^${key}\\s*:`, "i")));
  if (value?.trim()) lines.unshift(`${key}: ${JSON.stringify(value.trim())}`);
  return joinFrontmatter(lines.join("\n") || null, body);
}
