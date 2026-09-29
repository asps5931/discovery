import type {
  Client,
  Deck,
  RequirementDoc,
  RequirementGroup,
  Poc,
  Note,
  NoteGroup,
} from "./types";
import { loadDeckOverride } from "./deckStorage";

const clientMetaModules = import.meta.glob("../content/clients/*/meta.ts", {
  eager: true,
});

// Decks are single markdown files (Marp format)
const deckModules = import.meta.glob("../content/clients/*/decks/*.md", {
  eager: true,
  as: "raw",
});

const requirementModules = import.meta.glob(
  "../content/clients/*/requirements/**/*.mdx",
  { eager: false }
);

// Notes are markdown files for meeting notes and general reference material
const noteModules = import.meta.glob("../content/clients/*/notes/**/*.md", {
  eager: true,
  as: "raw",
});

// POCs are live React components (index.tsx)
const pocModules = import.meta.glob("../content/clients/*/pocs/*/index.tsx", {
  eager: false,
});

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
      /clients\/([^/]+)\/requirements\/(?:(.+?)\/)?([^/]+)\.mdx$/
    );
    if (!match) continue;
    const [, clientSlug, groupPath, filename] = match;
    const group = groupPath || "general";
    const docSlug = filename;
    const key = `${clientSlug}/${group}/${docSlug}`;

    docMap.set(key, {
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
  return decks.filter((d) => d.clientSlug === clientSlug);
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
  return noteGroups.filter((g) => g.clientSlug === clientSlug);
}

// --- Module loaders ---

export function getOriginalDeckMarkdown(
  clientSlug: string,
  deckSlug: string
): string | undefined {
  const key = `../content/clients/${clientSlug}/decks/${deckSlug}.md`;
  return deckModules[key] as string | undefined;
}

export function getDeckMarkdown(
  clientSlug: string,
  deckSlug: string
): string | undefined {
  const override = loadDeckOverride(clientSlug, deckSlug);
  if (override !== null) return override;
  return getOriginalDeckMarkdown(clientSlug, deckSlug);
}

export function getRequirementDocModule(
  clientSlug: string,
  group: string,
  docSlug: string
): (() => Promise<any>) | undefined {
  for (const [path, loader] of Object.entries(requirementModules)) {
    const match = path.match(
      /clients\/([^/]+)\/requirements\/(?:(.+?)\/)?([^/]+)\.mdx$/
    );
    if (!match) continue;
    const [, cSlug, groupPath, filename] = match;
    const g = groupPath || "general";
    if (cSlug === clientSlug && g === group && filename === docSlug) {
      return loader as () => Promise<any>;
    }
  }
  return undefined;
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
  const key = `../content/clients/${clientSlug}/notes/${group}/${noteSlug}.md`;
  return noteModules[key] as string | undefined;
}

export { titleFromSlug, titleFromFilename };
