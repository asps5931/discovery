import {
  deckPath,
  deleteContentFile,
  fileSyncEnabled,
  forgetSessionWrite,
  getCurrentRaw,
  getOriginalRaw,
  hasSessionWrite,
  writeContentFile,
} from "./contentSync";

export const DECK_OVERRIDE_PREFIX = "client-portal:deck-override:";
const OVERRIDE_PREFIX = DECK_OVERRIDE_PREFIX;
const USER_DECKS_PREFIX = "client-portal:user-decks:";

export const DECKS_CHANGED_EVENT = "discovery-decks-changed";

export interface UserDeckMeta {
  slug: string;
  name: string;
  createdAt: string;
}

function overrideKey(clientSlug: string, deckSlug: string): string {
  return `${OVERRIDE_PREFIX}${clientSlug}/${deckSlug}`;
}

function userDecksKey(clientSlug: string): string {
  return `${USER_DECKS_PREFIX}${clientSlug}`;
}

function notifyDecksChanged() {
  try {
    window.dispatchEvent(new Event(DECKS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function setLocalOverride(clientSlug: string, deckSlug: string, markdown: string | null) {
  try {
    if (markdown === null) localStorage.removeItem(overrideKey(clientSlug, deckSlug));
    else localStorage.setItem(overrideKey(clientSlug, deckSlug), markdown);
  } catch {
    // Storage may be unavailable or full; edits simply won't persist.
  }
}

/**
 * Deck markdown that differs from what was bundled at page load: this session's
 * file write in dev, otherwise the browser-stored edit.
 */
export function loadDeckOverride(
  clientSlug: string,
  deckSlug: string
): string | null {
  const path = deckPath(clientSlug, deckSlug);
  if (fileSyncEnabled && hasSessionWrite(path)) {
    const raw = getCurrentRaw(path);
    return raw !== getOriginalRaw(path) ? (raw ?? null) : null;
  }
  try {
    return localStorage.getItem(overrideKey(clientSlug, deckSlug));
  } catch {
    return null;
  }
}

export function saveDeckOverride(
  clientSlug: string,
  deckSlug: string,
  markdown: string
): void {
  if (fileSyncEnabled) {
    void writeContentFile(deckPath(clientSlug, deckSlug), markdown).then((ok) =>
      setLocalOverride(clientSlug, deckSlug, ok ? null : markdown)
    );
  } else {
    setLocalOverride(clientSlug, deckSlug, markdown);
  }
  notifyDecksChanged();
}

/** Restores the deck to the version on disk at page load. */
export function clearDeckOverride(clientSlug: string, deckSlug: string): void {
  setLocalOverride(clientSlug, deckSlug, null);
  const path = deckPath(clientSlug, deckSlug);
  const original = getOriginalRaw(path);
  if (fileSyncEnabled && hasSessionWrite(path)) {
    if (original !== undefined) void writeContentFile(path, original);
    else forgetSessionWrite(path);
  }
  notifyDecksChanged();
}

export function listUserDecks(clientSlug: string): UserDeckMeta[] {
  try {
    const raw = localStorage.getItem(userDecksKey(clientSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserDeckMeta[]) : [];
  } catch {
    return [];
  }
}

function saveUserDeckList(clientSlug: string, decks: UserDeckMeta[]): void {
  try {
    localStorage.setItem(userDecksKey(clientSlug), JSON.stringify(decks));
  } catch {
    // Storage may be unavailable or full.
  }
}

export function isUserDeck(clientSlug: string, deckSlug: string): boolean {
  return listUserDecks(clientSlug).some((d) => d.slug === deckSlug);
}

export function slugifyDeckTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "deck"
  );
}

export function starterDeckMarkdown(title: string): string {
  return `---
marp: true
theme: client-portal
paginate: true
size: 16:9
---

<!-- _class: lead -->

# ${title}

**New slide deck**

---

# Agenda

- Topic one
- Topic two
- Topic three

---

# Next steps

Add your content here.
`;
}

function countSlides(markdown: string): number {
  const lines = markdown.split("\n");
  let count = 1;
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
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

export function getUserDeckSlideCount(clientSlug: string, deckSlug: string): number {
  const markdown = loadDeckOverride(clientSlug, deckSlug);
  return markdown ? countSlides(markdown) : 1;
}

/** Create a user deck. `takenSlugs` should include file + existing user deck slugs. */
export function createUserDeck(
  clientSlug: string,
  title: string,
  takenSlugs: string[]
): UserDeckMeta {
  const base = slugifyDeckTitle(title);
  let slug = base;
  let i = 2;
  const taken = new Set(takenSlugs);
  while (taken.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }

  const meta: UserDeckMeta = {
    slug,
    name: title.trim(),
    createdAt: new Date().toISOString(),
  };

  const decks = listUserDecks(clientSlug);
  decks.push(meta);
  saveUserDeckList(clientSlug, decks);
  saveDeckOverride(clientSlug, slug, starterDeckMarkdown(title.trim()));
  notifyDecksChanged();
  return meta;
}

export function deleteUserDeck(clientSlug: string, deckSlug: string): void {
  const decks = listUserDecks(clientSlug).filter((d) => d.slug !== deckSlug);
  saveUserDeckList(clientSlug, decks);
  setLocalOverride(clientSlug, deckSlug, null);
  if (fileSyncEnabled) void deleteContentFile(deckPath(clientSlug, deckSlug));
  notifyDecksChanged();
}

export function getUserDeckName(
  clientSlug: string,
  deckSlug: string
): string | undefined {
  return listUserDecks(clientSlug).find((d) => d.slug === deckSlug)?.name;
}
