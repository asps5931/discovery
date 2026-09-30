import {
  fileSyncEnabled,
  getCurrentRaw,
  resolveDocPath,
  writeContentFile,
} from "./contentSync";
import { getFrontmatterField, replaceBody, setFrontmatterField } from "./frontmatter";

export const DOC_OVERRIDE_PREFIX = "client-portal:doc-override:";

export type DocKind = "requirement" | "note";

function keyFor(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): string {
  return `${DOC_OVERRIDE_PREFIX}${kind}:${clientSlug}/${groupSlug}/${docSlug}`;
}

function setLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Pasted images are stored inline, so large docs can exceed the quota.
    window.alert(
      "Couldn't save this edit: browser storage is full. Try removing or using smaller images."
    );
  }
}

/** Browser-stored edit for a doc (used when not running `vite dev`). */
export function loadDocOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): string | null {
  try {
    const value = localStorage.getItem(keyFor(kind, clientSlug, groupSlug, docSlug));
    // Drop overrides that saved TipTap tables as raw HTML (pre-fix).
    if (value && /<table[\s>]/i.test(value)) {
      localStorage.removeItem(keyFor(kind, clientSlug, groupSlug, docSlug));
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Saves a doc body. In dev it's written to the .md file (frontmatter kept). */
export function saveDocOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string,
  markdown: string
): Promise<boolean> {
  const key = keyFor(kind, clientSlug, groupSlug, docSlug);
  if (!fileSyncEnabled) {
    setLocal(key, markdown);
    return Promise.resolve(true);
  }
  const path = resolveDocPath(kind, clientSlug, groupSlug, docSlug);
  const next = replaceBody(getCurrentRaw(path) ?? "", markdown);
  return writeContentFile(path, next).then((ok) => {
    setLocal(key, ok ? null : markdown);
    return ok;
  });
}

export function clearDocOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): void {
  try {
    localStorage.removeItem(keyFor(kind, clientSlug, groupSlug, docSlug));
  } catch {
    // Ignore.
  }
}

export function hasDocOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): boolean {
  return loadDocOverride(kind, clientSlug, groupSlug, docSlug) !== null;
}

export const DOC_TITLE_PREFIX = "client-portal:doc-title:";
export const DOC_TITLES_CHANGED_EVENT = "client-portal:doc-titles-changed";

function titleKeyFor(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): string {
  return `${DOC_TITLE_PREFIX}${kind}:${clientSlug}/${groupSlug}/${docSlug}`;
}

/** Custom title from the file's `title:` frontmatter (or browser storage outside dev). */
export function loadTitleOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string
): string | null {
  if (fileSyncEnabled) {
    const raw = getCurrentRaw(resolveDocPath(kind, clientSlug, groupSlug, docSlug));
    return raw ? getFrontmatterField(raw, "title") : null;
  }
  try {
    return localStorage.getItem(titleKeyFor(kind, clientSlug, groupSlug, docSlug));
  } catch {
    return null;
  }
}

/** Saves a title override; an empty title clears it back to the default. */
export function saveTitleOverride(
  kind: DocKind,
  clientSlug: string,
  groupSlug: string,
  docSlug: string,
  title: string
): Promise<boolean> {
  const key = titleKeyFor(kind, clientSlug, groupSlug, docSlug);
  const value = title.trim() || null;
  let done: Promise<boolean>;
  if (fileSyncEnabled) {
    const path = resolveDocPath(kind, clientSlug, groupSlug, docSlug);
    const next = setFrontmatterField(getCurrentRaw(path) ?? "", "title", value);
    done = writeContentFile(path, next).then((ok) => {
      setLocal(key, ok ? null : value);
      return ok;
    });
  } else {
    setLocal(key, value);
    done = Promise.resolve(true);
  }
  window.dispatchEvent(new Event(DOC_TITLES_CHANGED_EVENT));
  return done;
}
