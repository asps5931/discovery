import type {
  Client,
  Deck,
  RequirementDoc,
  RequirementGroup,
  Poc,
  Note,
  NoteGroup,
} from "./types";
import {
  loadDeckOverride,
  listUserDecks,
  getUserDeckSlideCount,
  getUserDeckName,
} from "./deckStorage";
import { loadDocOverride } from "./docStorage";
import {
  fileSyncEnabled,
  getCurrentRaw,
  getOriginalRaw,
  deckPath,
  registerOriginals,
  resolveDocPath,
  sessionCreatedSlugs,
  writeContentFile,
} from "./contentSync";
import { getFrontmatterField, replaceBody } from "./frontmatter";

const clientMetaModules = import.meta.glob("../content/clients/*/meta.ts", {
  eager: true,
});

// Decks are single markdown files (Marp format)
const deckModules = import.meta.glob("../content/clients/*/decks/*.md", {
  eager: true,
  as: "raw",
});

const requirementModules = import.meta.glob(
  "../content/clients/*/requirements/**/*.md",
  { eager: true, as: "raw" }
);

// Notes are markdown files for meeting notes and general reference material
const noteModules = import.meta.glob("../content/clients/*/notes/**/*.md", {
  eager: true,
  as: "raw",
});

const siteProfileModules = import.meta.glob("../content/clients/*/{site-profile,action-items}.md", {
  eager: true,
  as: "raw",
});

registerOriginals(siteProfileModules);
registerOriginals(deckModules);
registerOriginals(requirementModules);
registerOriginals(noteModules);

// POCs are live React components (index.tsx)
const pocModules = import.meta.glob("../content/clients/*/pocs/*/index.tsx", {
  eager: false,
});

const ACRONYMS = new Set(["pdp", "plp"]);

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.(mdx|md)$/, "");
  const stripped = base.replace(/^\d+[-_]/, "");
  return titleFromSlug(stripped);
}

// --- Clients ---

function discoverClients(): Client[] {
  const clients: Client[] = [];

  for (const [path, mod] of Object.entries(clientMetaModules)) {
    const match = path.match(/clients\/([^/]+)\/meta\.ts$/);
    if (!match) continue;
    const slug = match[1];
    const meta = (mod as { default?: { name?: string; description?: string } })
      .default;
    clients.push({
      slug,
      name: meta?.name || titleFromSlug(slug),
      description: meta?.description,
    });
  }

  return clients.sort((a, b) => a.name.localeCompare(b.name));
}

export const clients: Client[] = discoverClients();

// --- Decks (single Marp markdown file per deck) ---

function discoverDecks(): Deck[] {
  const decks: Deck[] = [];

  for (const path of Object.keys(deckModules)) {
    const match = path.match(/clients\/([^/]+)\/decks\/([^/]+)\.md$/);
    if (!match) continue;
    const [, clientSlug, deckSlug] = match;

    const markdown = deckModules[path] as string;
    // Count slides by counting <section> separators (--- at line start)
    const slideCount = countSlides(markdown);

    decks.push({
      clientSlug,
      slug: deckSlug,
      name: titleFromSlug(deckSlug),
      slideCount,
    });
  }

  return decks.sort(
    (a, b) =>
      a.clientSlug.localeCompare(b.clientSlug) || a.slug.localeCompare(b.slug)
  );
}

function countSlides(markdown: string): number {
  const lines = markdown.split("\n");
  let count = 1;
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip the YAML frontmatter block at the top of the file.
    if (i === 0 && line === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line === "---") inFrontmatter = false;
      continue;
    }
    if (line === "---") count++;
  }
  return count;
}

export const decks: Deck[] = discoverDecks();

// --- Requirements ---

function discoverRequirements(): RequirementGroup[] {
  const docMap = new Map<string, RequirementDoc>();

  for (const path of Object.keys(requirementModules)) {
    const match = path.match(
      /clients\/([^/]+)\/requirements\/(?:(.+?)\/)?([^/]+)\.md$/
    );
    if (!match) continue;
    const [, clientSlug, groupPath, filename] = match;
    const group = groupPath || "general";
    const docSlug = filename;
    const key = `${clientSlug}/${group}/${docSlug}`;

    docMap.set(key, {
      id: key,
      key: "", // assigned after group sort
      clientSlug,
      group,
      slug: docSlug,
      name: titleFromFilename(docSlug),
    });
  }

  const groupMap = new Map<string, RequirementGroup>();

  for (const doc of docMap.values()) {
    const key = `${doc.clientSlug}/${doc.group}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        clientSlug: doc.clientSlug,
        slug: doc.group,
        name: titleFromSlug(doc.group),
        docs: [],
      });
    }
    groupMap.get(key)!.docs.push(doc);
  }

  for (const group of groupMap.values()) {
    group.docs.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  // Jira-style keys from project (client) name: COMMERCE-1, COMMERCE-2, …
  const docsByClient = new Map<string, RequirementDoc[]>();
  for (const doc of docMap.values()) {
    const list = docsByClient.get(doc.clientSlug) ?? [];
    list.push(doc);
    docsByClient.set(doc.clientSlug, list);
  }
  // Docs with a `key:` in frontmatter keep it; the rest are numbered in order.
  for (const [clientSlug, docs] of docsByClient) {
    docs.sort(
      (a, b) => a.group.localeCompare(b.group) || a.slug.localeCompare(b.slug)
    );
    const prefix = jiraProjectKeyFromClient(clientSlug);
    let n = 0;
    for (const doc of docs) {
      const raw = getOriginalRaw(resolveDocPath("requirement", clientSlug, doc.group, doc.slug));
      doc.key = (raw && getFrontmatterField(raw, "key")) || `${prefix}-${++n}`;
    }
  }

  return Array.from(groupMap.values()).sort(
    (a, b) =>
      a.clientSlug.localeCompare(b.clientSlug) || a.slug.localeCompare(b.slug)
  );
}

export const requirementGroups: RequirementGroup[] = discoverRequirements();

// --- POCs (live React components) ---

function discoverPocs(): Poc[] {
  const pocs: Poc[] = [];

  for (const path of Object.keys(pocModules)) {
    const match = path.match(/clients\/([^/]+)\/pocs\/([^/]+)\/index\.tsx$/);
    if (!match) continue;
    const [, clientSlug, pocSlug] = match;
    pocs.push({
      clientSlug,
      slug: pocSlug,
      name: titleFromSlug(pocSlug),
    });
  }

  return pocs.sort(
    (a, b) =>
      a.clientSlug.localeCompare(b.clientSlug) || a.name.localeCompare(b.name)
  );
}

export const pocs: Poc[] = discoverPocs();

// --- Notes (meeting notes + general reference markdown) ---

function discoverNotes(): NoteGroup[] {
  const noteMap = new Map<string, Note>();

  for (const path of Object.keys(noteModules)) {
    const match = path.match(
      /clients\/([^/]+)\/notes\/(?:(.+?)\/)?([^/]+)\.md$/
    );
    if (!match) continue;
    const [, clientSlug, groupPath, filename] = match;
    const group = groupPath || "general";
    const noteSlug = filename;
    const key = `${clientSlug}/${group}/${noteSlug}`;

    noteMap.set(key, {
      clientSlug,
      group,
      slug: noteSlug,
      name: titleFromFilename(noteSlug),
    });
  }

  const groupMap = new Map<string, NoteGroup>();

  for (const note of noteMap.values()) {
    const key = `${note.clientSlug}/${note.group}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        clientSlug: note.clientSlug,
        slug: note.group,
        name: titleFromSlug(note.group),
        notes: [],
      });
    }
    groupMap.get(key)!.notes.push(note);
  }

  for (const client of clients) {
    const key = `${client.slug}/documents`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { clientSlug: client.slug, slug: "documents", name: "Documents", notes: [] });
    }
  }

  for (const group of groupMap.values()) {
    group.notes.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return Array.from(groupMap.values()).sort(
    (a, b) =>
      a.clientSlug.localeCompare(b.clientSlug) || a.slug.localeCompare(b.slug)
  );
}

export const noteGroups: NoteGroup[] = discoverNotes();

// --- Lookup helpers ---

export function getClient(clientSlug: string): Client | undefined {
  return clients.find((c) => c.slug === clientSlug);
}

export function getDecksForClient(clientSlug: string): Deck[] {
  const fileDecks = decks.filter((d) => d.clientSlug === clientSlug);
  const fileSlugs = new Set(fileDecks.map((d) => d.slug));
  const userDecks: Deck[] = listUserDecks(clientSlug)
    .filter((d) => !fileSlugs.has(d.slug))
    .map((d) => ({
      clientSlug,
      slug: d.slug,
      name: d.name,
      slideCount: getUserDeckSlideCount(clientSlug, d.slug),
    }));

  return [...fileDecks, ...userDecks].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRequirementGroupsForClient(
  clientSlug: string
): RequirementGroup[] {
  return requirementGroups.filter((g) => g.clientSlug === clientSlug);
}

export function getPocsForClient(clientSlug: string): Poc[] {
  return pocs.filter((p) => p.clientSlug === clientSlug);
}

export function getNoteGroupsForClient(clientSlug: string): NoteGroup[] {
  return noteGroups
    .filter((g) => g.clientSlug === clientSlug)
    .map((g) => {
      const created: Note[] = sessionCreatedSlugs(`clients/${clientSlug}/notes/${g.slug}/`)
        .filter((slug) => !g.notes.some((n) => n.slug === slug))
        .map((slug) => ({ clientSlug, group: g.slug, slug, name: titleFromFilename(slug) }));
      const notes = [...g.notes, ...created].filter(
        (n) => getCurrentRaw(resolveDocPath("note", clientSlug, g.slug, n.slug)) !== undefined
      );
      return { ...g, notes };
    });
}

// --- Module loaders ---

export function getOriginalDeckMarkdown(
  clientSlug: string,
  deckSlug: string
): string | undefined {
  return getOriginalRaw(deckPath(clientSlug, deckSlug));
}

export function getDeckMarkdown(
  clientSlug: string,
  deckSlug: string
): string | undefined {
  const override = loadDeckOverride(clientSlug, deckSlug);
  if (override !== null) return override;
  return getOriginalDeckMarkdown(clientSlug, deckSlug);
}

export function getDeckDisplayName(clientSlug: string, deckSlug: string): string {
  return getUserDeckName(clientSlug, deckSlug) || titleFromSlug(deckSlug);
}

export function getOriginalRequirementMarkdown(
  clientSlug: string,
  group: string,
  docSlug: string
): string | undefined {
  return getOriginalRaw(resolveDocPath("requirement", clientSlug, group, docSlug));
}

export function getRequirementMarkdown(
  clientSlug: string,
  group: string,
  docSlug: string
): string | undefined {
  if (!fileSyncEnabled) {
    const override = loadDocOverride("requirement", clientSlug, group, docSlug);
    if (override !== null) return override;
  }
  return getCurrentRaw(resolveDocPath("requirement", clientSlug, group, docSlug));
}

export function getPocModule(
  clientSlug: string,
  pocSlug: string
): (() => Promise<any>) | undefined {
  const key = `../content/clients/${clientSlug}/pocs/${pocSlug}/index.tsx`;
  return pocModules[key] as (() => Promise<any>) | undefined;
}

export function getNoteMarkdown(
  clientSlug: string,
  group: string,
  noteSlug: string
): string | undefined {
  if (!fileSyncEnabled) {
    const override = loadDocOverride("note", clientSlug, group, noteSlug);
    if (override !== null) return override;
  }
  return getCurrentRaw(resolveDocPath("note", clientSlug, group, noteSlug));
}

export function requirementAnchorId(doc: {
  clientSlug: string;
  group: string;
  slug: string;
}): string {
  return `req-${doc.clientSlug}-${doc.group}-${doc.slug}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-");
}

/** Jira-style project key from the client/project name (`Commerce` → `COMM`). */
function jiraProjectKeyFromClient(clientSlug: string): string {
  const client = clients.find((c) => c.slug === clientSlug);
  const source = client?.name || clientSlug;
  const cleaned = source.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleaned.slice(0, 4) || "REQ";
}

/** Jira-style key shown before requirement titles (`COMM-1`). */
export function requirementKey(doc: { key: string }): string {
  return doc.key;
}

export const canCreateRequirements = fileSyncEnabled;

// --- Single-file client docs (site profile, action items) ---

type ClientDocName = "site-profile" | "action-items";

function clientDocLocalKey(clientSlug: string, name: ClientDocName): string {
  return `client-portal:${name}:${clientSlug}`;
}

function getClientDoc(clientSlug: string, name: ClientDocName, fallback: string): string {
  if (!fileSyncEnabled) {
    try {
      const local = localStorage.getItem(clientDocLocalKey(clientSlug, name));
      if (local !== null) return local;
    } catch {
      /* ignore */
    }
  }
  return getCurrentRaw(`clients/${clientSlug}/${name}.md`) ?? fallback;
}

function saveClientDoc(clientSlug: string, name: ClientDocName, markdown: string): void {
  const localKey = clientDocLocalKey(clientSlug, name);
  const setLocal = (value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(localKey);
      else localStorage.setItem(localKey, value);
    } catch {
      /* ignore */
    }
  };
  if (!fileSyncEnabled) return setLocal(markdown);
  const path = `clients/${clientSlug}/${name}.md`;
  void writeContentFile(path, replaceBody(getCurrentRaw(path) ?? "", markdown)).then((ok) =>
    setLocal(ok ? null : markdown)
  );
}

export function getSiteProfileMarkdown(clientSlug: string): string {
  return getClientDoc(clientSlug, "site-profile", "#### Site\n\nTBD\n");
}

export function saveSiteProfile(clientSlug: string, markdown: string): void {
  saveClientDoc(clientSlug, "site-profile", markdown);
}

export function getActionItemsMarkdown(clientSlug: string): string {
  return getClientDoc(clientSlug, "action-items", "");
}

export function saveActionItems(clientSlug: string, markdown: string): void {
  saveClientDoc(clientSlug, "action-items", markdown);
}

export function nextRequirementKey(clientSlug: string): string {
  const prefix = jiraProjectKeyFromClient(clientSlug);
  const max = getRequirementGroupsForClient(clientSlug)
    .flatMap((g) => g.docs)
    .reduce((m, d) => Math.max(m, Number(d.key.split("-").pop()) || 0), 0);
  return `${prefix}-${max + 1}`;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Writes a new requirement file and resolves with its slug (dev server only). */
export async function createRequirement(
  clientSlug: string,
  group: string,
  title: string,
  description: string
): Promise<string> {
  const key = nextRequirementKey(clientSlug);
  const taken = new Set(
    getRequirementGroupsForClient(clientSlug)
      .find((g) => g.slug === group)
      ?.docs.map((d) => d.slug) ?? []
  );
  const base = slugifyTitle(title) || key.toLowerCase();
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;

  const body = description.trim() || "_No description yet._";
  const content = `---\nkey: ${key}\ntitle: ${JSON.stringify(title.trim())}\n---\n\n#### Description\n\n${body}\n`;
  const ok = await writeContentFile(`clients/${clientSlug}/requirements/${group}/${slug}.md`, content);
  if (!ok) throw new Error("Could not write requirement file");
  return slug;
}

export { titleFromSlug, titleFromFilename };

