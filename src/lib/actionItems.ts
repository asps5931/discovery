import { stripFrontmatter } from "./frontmatter";

export type ActionItem = { id: string; text: string; done: boolean };

const TASK_LINE = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;

export function parseActionItems(markdown: string): ActionItem[] {
  return stripFrontmatter(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(TASK_LINE))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m, i) => ({ id: `${i}-${m[2]}`, text: m[2].trim(), done: m[1] !== " " }));
}

export function serializeActionItems(items: ActionItem[]): string {
  return items.map((item) => `- [${item.done ? "x" : " "}] ${item.text.replace(/\s*\n\s*/g, " ")}`).join("\n") + "\n";
}
