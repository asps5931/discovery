export interface UserNote {
  id: string;
  group: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface NoteDraft {
  group: string;
  title: string;
  content: string;
  tags: string[];
}

const NOTES_PREFIX = "client-portal:user-notes:";
const DRAFT_PREFIX = "client-portal:note-draft:";
const HIDDEN_PREFIX = "client-portal:hidden-notes:";

function notesKey(clientSlug: string): string {
  return `${NOTES_PREFIX}${clientSlug}`;
}

function draftKey(clientSlug: string, group: string): string {
  return `${DRAFT_PREFIX}${clientSlug}/${group}`;
}

function hiddenKey(clientSlug: string, group: string): string {
  return `${HIDDEN_PREFIX}${clientSlug}/${group}`;
}

export function listUserNotes(clientSlug: string): UserNote[] {
  try {
    const raw = localStorage.getItem(notesKey(clientSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserNote[]) : [];
  } catch {
    return [];
  }
}

export function addUserNote(clientSlug: string, note: UserNote): void {
  const notes = listUserNotes(clientSlug);
  notes.push(note);
  try {
    localStorage.setItem(notesKey(clientSlug), JSON.stringify(notes));
  } catch {
    // Storage may be unavailable or full.
  }
}

export function deleteUserNote(clientSlug: string, noteId: string): void {
  const notes = listUserNotes(clientSlug).filter((n) => n.id !== noteId);
  try {
    localStorage.setItem(notesKey(clientSlug), JSON.stringify(notes));
  } catch {
    // Storage may be unavailable or full.
  }
}

export function updateUserNote(
  clientSlug: string,
  noteId: string,
  patch: Partial<Pick<UserNote, "title" | "content" | "tags">>
): void {
  const notes = listUserNotes(clientSlug).map((n) =>
    n.id === noteId ? { ...n, ...patch } : n
  );
  try {
    localStorage.setItem(notesKey(clientSlug), JSON.stringify(notes));
  } catch {
    // Storage may be unavailable or full.
  }
}

export function loadNoteDraft(
  clientSlug: string,
  group: string
): NoteDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(clientSlug, group));
    if (!raw) return null;
    return JSON.parse(raw) as NoteDraft;
  } catch {
    return null;
  }
}

export function saveNoteDraft(clientSlug: string, draft: NoteDraft): void {
  try {
    localStorage.setItem(draftKey(clientSlug, draft.group), JSON.stringify(draft));
  } catch {
    // Storage may be unavailable or full.
  }
}

export function clearNoteDraft(clientSlug: string, group: string): void {
  try {
    localStorage.removeItem(draftKey(clientSlug, group));
  } catch {
    // Ignore.
  }
}

export function listHiddenNotes(clientSlug: string, group: string): string[] {
  try {
    const raw = localStorage.getItem(hiddenKey(clientSlug, group));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function hideNote(clientSlug: string, group: string, slug: string): void {
  const hidden = listHiddenNotes(clientSlug, group);
  if (!hidden.includes(slug)) hidden.push(slug);
  try {
    localStorage.setItem(hiddenKey(clientSlug, group), JSON.stringify(hidden));
  } catch {
    // Storage may be unavailable or full.
  }
}

// Reads a comma-separated `tags:` line from a markdown file's YAML frontmatter.
export function parseTagsFromMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---") break;
    const match = line.match(/^tags:\s*(.+)$/i);
    if (match) {
      return match[1]
        .split(",")
        .map((t) => t.trim().replace(/^\[|\]$/g, "").replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "note"
  );
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
