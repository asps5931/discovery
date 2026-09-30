/**
 * Persists in-app edits to the markdown files under src/content via the
 * dev-server endpoint (see vite-plugins/contentFiles.ts), so they land in git.
 * Outside `vite dev` there is no endpoint and callers fall back to localStorage.
 */

export const fileSyncEnabled = import.meta.env.DEV;

const ENDPOINT = "/__content";

/** Raw file contents as bundled at page load, keyed by `clients/...` path. */
const originals = new Map<string, string>();
/** Contents written this session; the bundled modules stay stale until reload. */
const sessionWrites = new Map<string, string | null>();
const queues = new Map<string, Promise<unknown>>();
let failureAlerted = false;

export function registerOriginals(modules: Record<string, unknown>): void {
  for (const [key, raw] of Object.entries(modules)) {
    if (typeof raw === "string") originals.set(key.replace(/^(\.\.\/)+content\//, ""), raw);
  }
}

export function getOriginalRaw(relPath: string): string | undefined {
  return originals.get(relPath);
}

export function getCurrentRaw(relPath: string): string | undefined {
  if (sessionWrites.has(relPath)) return sessionWrites.get(relPath) ?? undefined;
  return originals.get(relPath);
}

export function hasSessionWrite(relPath: string): boolean {
  return sessionWrites.has(relPath) && sessionWrites.get(relPath) !== null;
}

export function forgetSessionWrite(relPath: string): void {
  sessionWrites.delete(relPath);
}

/** Slugs of `.md` files created directly in `dir` this session (not yet in the bundle). */
export function sessionCreatedSlugs(dir: string): string[] {
  return [...sessionWrites]
    .filter(([p, v]) => v !== null && !originals.has(p) && p.startsWith(dir))
    .map(([p]) => p.slice(dir.length))
    .filter((rest) => !rest.includes("/") && rest.endsWith(".md"))
    .map((rest) => rest.replace(/\.md$/, ""));
}

export function contentExists(relPath: string): boolean {
  return getCurrentRaw(relPath) !== undefined;
}

export function resolveDocPath(
  kind: "requirement" | "note",
  clientSlug: string,
  group: string,
  slug: string
): string {
  const dir = kind === "requirement" ? "requirements" : "notes";
  const nested = `clients/${clientSlug}/${dir}/${group}/${slug}.md`;
  const root = `clients/${clientSlug}/${dir}/${slug}.md`;
  if (!contentExists(nested) && group === "general" && contentExists(root)) return root;
  return nested;
}

export function deckPath(clientSlug: string, deckSlug: string): string {
  return `clients/${clientSlug}/decks/${deckSlug}.md`;
}

async function send(payload: { action: "write" | "delete"; path: string; content?: string }) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

function enqueue(relPath: string, task: () => Promise<void>): Promise<boolean> {
  const run = (queues.get(relPath) ?? Promise.resolve())
    .catch(() => undefined)
    .then(task)
    .then(
      () => true,
      (err) => {
        console.error(`[content-sync] ${relPath}:`, err);
        if (!failureAlerted) {
          failureAlerted = true;
          window.alert(
            "Couldn't write your edit to the content files (is the dev server running?). It's kept in this browser for now and will be written on the next load."
          );
        }
        return false;
      }
    );
  queues.set(relPath, run);
  return run;
}

/** Updates the session copy immediately, then writes the file in order. */
export function writeContentFile(relPath: string, content: string): Promise<boolean> {
  sessionWrites.set(relPath, content);
  return enqueue(relPath, () => send({ action: "write", path: relPath, content }));
}

export function deleteContentFile(relPath: string): Promise<boolean> {
  sessionWrites.set(relPath, null);
  return enqueue(relPath, () => send({ action: "delete", path: relPath }));
}
