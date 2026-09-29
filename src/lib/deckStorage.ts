const PREFIX = "client-portal:deck-override:";

function keyFor(clientSlug: string, deckSlug: string): string {
  return `${PREFIX}${clientSlug}/${deckSlug}`;
}

export function loadDeckOverride(
  clientSlug: string,
  deckSlug: string
): string | null {
  try {
    return localStorage.getItem(keyFor(clientSlug, deckSlug));
  } catch {
    return null;
  }
}

export function saveDeckOverride(
  clientSlug: string,
  deckSlug: string,
  markdown: string
): void {
  try {
    localStorage.setItem(keyFor(clientSlug, deckSlug), markdown);
  } catch {
    // Storage may be unavailable or full; edits simply won't persist.
  }
}

export function clearDeckOverride(clientSlug: string, deckSlug: string): void {
  try {
    localStorage.removeItem(keyFor(clientSlug, deckSlug));
  } catch {
    // Ignore.
  }
}
