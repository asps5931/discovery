import {
  contentExists,
  deckPath,
  fileSyncEnabled,
  getCurrentRaw,
  resolveDocPath,
} from "./contentSync";
import {
  DOC_OVERRIDE_PREFIX,
  DOC_TITLE_PREFIX,
  saveDocOverride,
  saveTitleOverride,
  type DocKind,
} from "./docStorage";
import { DECK_OVERRIDE_PREFIX, isUserDeck, saveDeckOverride } from "./deckStorage";
import { replaceBody } from "./frontmatter";

type DocRef = { kind: DocKind; clientSlug: string; group: string; slug: string };

function parseDocKey(rest: string): DocRef | null {
  const [kind, path] = [rest.slice(0, rest.indexOf(":")), rest.slice(rest.indexOf(":") + 1)];
  const parts = path.split("/");
  if ((kind !== "requirement" && kind !== "note") || parts.length < 3) return null;
  return {
    kind,
    clientSlug: parts[0],
    group: parts.slice(1, -1).join("/"),
    slug: parts[parts.length - 1],
  };
}

function entriesWithPrefix(prefix: string): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) out.push([key, localStorage.getItem(key) ?? ""]);
  }
  return out;
}

/**
 * Moves edits saved in this browser before file sync existed into the .md files.
 * Keys are removed once written; edits for files that no longer exist are left alone.
 */
export function migrateLocalEditsToFiles(): void {
  if (!fileSyncEnabled) return;
  try {
    for (const [key, markdown] of entriesWithPrefix(DOC_OVERRIDE_PREFIX)) {
      const ref = parseDocKey(key.slice(DOC_OVERRIDE_PREFIX.length));
      if (!ref) continue;
      const path = resolveDocPath(ref.kind, ref.clientSlug, ref.group, ref.slug);
      if (!contentExists(path) || /<table[\s>]/i.test(markdown)) continue;
      const raw = getCurrentRaw(path) ?? "";
      if (replaceBody(raw, markdown) === raw) localStorage.removeItem(key);
      else void saveDocOverride(ref.kind, ref.clientSlug, ref.group, ref.slug, markdown);
    }

    for (const [key, title] of entriesWithPrefix(DOC_TITLE_PREFIX)) {
      const ref = parseDocKey(key.slice(DOC_TITLE_PREFIX.length));
      if (!ref) continue;
      if (!contentExists(resolveDocPath(ref.kind, ref.clientSlug, ref.group, ref.slug))) continue;
      void saveTitleOverride(ref.kind, ref.clientSlug, ref.group, ref.slug, title);
    }

    for (const [key, markdown] of entriesWithPrefix(DECK_OVERRIDE_PREFIX)) {
      const [clientSlug, deckSlug] = key.slice(DECK_OVERRIDE_PREFIX.length).split("/");
      if (!clientSlug || !deckSlug) continue;
      const path = deckPath(clientSlug, deckSlug);
      if (!contentExists(path) && !isUserDeck(clientSlug, deckSlug)) continue;
      if (getCurrentRaw(path) === markdown) localStorage.removeItem(key);
      else saveDeckOverride(clientSlug, deckSlug, markdown);
    }
  } catch (err) {
    console.error("[content-sync] migration failed:", err);
  }
}
