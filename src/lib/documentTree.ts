import type { Note } from "./types";
import {
  CONTENT_CHANGED_EVENT,
  contentExists,
  deleteContentFile,
  getCurrentRaw,
  listContentPaths,
  writeContentFile,
} from "./contentSync";
import { slugify } from "./noteStorage";

/** Hidden md marker so empty folders persist on disk (must end up as `…/_folder.md`). */
export const FOLDER_MARKER = "_folder";
export const DOCUMENTS_GROUP = "documents";

export type DocTreeNode =
  | { kind: "folder"; name: string; path: string; children: DocTreeNode[] }
  | { kind: "file"; name: string; path: string; label: string };

function labelFromFilename(filename: string): string {
  return filename
    .replace(/\.(mdx|md)$/, "")
    .replace(/^\d+[-_]/, "")
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Relative path under `notes/documents/` without leading slash. */
export function documentsPrefix(clientSlug: string): string {
  return `clients/${clientSlug}/notes/${DOCUMENTS_GROUP}/`;
}

export function documentFilePath(clientSlug: string, relPath: string): string {
  return `${documentsPrefix(clientSlug)}${relPath}.md`;
}

export function isFolderMarker(relMdPath: string): boolean {
  return relMdPath === `${FOLDER_MARKER}.md` || relMdPath.endsWith(`/${FOLDER_MARKER}.md`);
}

/** File slug relative to documents root (may include `/`). */
export function listDocumentNotes(clientSlug: string): Note[] {
  const prefix = documentsPrefix(clientSlug);
  return listContentPaths(prefix)
    .filter((p) => p.endsWith(".md") && !isFolderMarker(p.slice(prefix.length)))
    .map((p) => {
      const slug = p.slice(prefix.length, -".md".length);
      const base = slug.includes("/") ? slug.slice(slug.lastIndexOf("/") + 1) : slug;
      return {
        clientSlug,
        group: DOCUMENTS_GROUP,
        slug,
        name: labelFromFilename(base),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Build a folder/file tree from paths relative to documents root (`.md` suffix included). */
export function buildDocumentTree(relMdPaths: string[]): DocTreeNode[] {
  type FolderAcc = { kind: "folder"; name: string; path: string; children: Map<string, Acc> };
  type FileAcc = { kind: "file"; name: string; path: string; label: string };
  type Acc = FolderAcc | FileAcc;

  const root = new Map<string, Acc>();

  const ensureFolder = (map: Map<string, Acc>, name: string, folderPath: string): FolderAcc => {
    const existing = map.get(name);
    if (existing?.kind === "folder") return existing;
    if (existing?.kind === "file") {
      // File and folder share a name: keep the file, nest folder under a distinct path is rare.
      // Prefer folder and drop the colliding file from this slot.
    }
    const folder: FolderAcc = { kind: "folder", name, path: folderPath, children: new Map() };
    map.set(name, folder);
    return folder;
  };

  for (const rel of relMdPaths) {
    if (!rel.endsWith(".md")) continue;
    const withoutExt = rel.slice(0, -".md".length);
    const parts = withoutExt.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    const marker = parts[parts.length - 1] === FOLDER_MARKER;
    const folderParts = marker ? parts.slice(0, -1) : parts.slice(0, -1);
    const filePart = marker ? null : parts[parts.length - 1];

    let map = root;
    let accPath = "";
    for (const part of folderParts) {
      accPath = accPath ? `${accPath}/${part}` : part;
      map = ensureFolder(map, part, accPath).children;
    }

    if (filePart) {
      map.set(filePart, {
        kind: "file",
        name: filePart,
        path: withoutExt,
        label: labelFromFilename(filePart),
      });
    }
  }

  const toNodes = (map: Map<string, Acc>): DocTreeNode[] => {
    const nodes: DocTreeNode[] = [];
    for (const node of map.values()) {
      if (node.kind === "folder") {
        nodes.push({
          kind: "folder",
          name: node.name,
          path: node.path,
          children: toNodes(node.children),
        });
      } else {
        nodes.push(node);
      }
    }
    return nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  return toNodes(root);
}

export function getDocumentTree(clientSlug: string): DocTreeNode[] {
  const prefix = documentsPrefix(clientSlug);
  const rel = listContentPaths(prefix).map((p) => p.slice(prefix.length));
  return buildDocumentTree(rel);
}

function pathTaken(clientSlug: string, relWithoutMd: string): boolean {
  const prefix = documentsPrefix(clientSlug);
  if (contentExists(documentFilePath(clientSlug, relWithoutMd))) return true;
  if (contentExists(documentFilePath(clientSlug, `${relWithoutMd}/${FOLDER_MARKER}`))) return true;
  return listContentPaths(prefix).some((p) => {
    const rel = p.slice(prefix.length);
    return rel === `${relWithoutMd}.md` || rel.startsWith(`${relWithoutMd}/`);
  });
}

function uniqueRelPath(clientSlug: string, desired: string): string {
  let candidate = desired;
  let i = 2;
  while (pathTaken(clientSlug, candidate)) {
    candidate = `${desired}-${i}`;
    i += 1;
  }
  return candidate;
}

function notify() {
  window.dispatchEvent(new Event(CONTENT_CHANGED_EVENT));
}

export async function createDocumentFolder(
  clientSlug: string,
  parentFolder: string,
  name: string
): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;
  const desired = parentFolder ? `${parentFolder}/${base}` : base;
  const path = uniqueRelPath(clientSlug, desired);
  await writeContentFile(
    documentFilePath(clientSlug, `${path}/${FOLDER_MARKER}`),
    "---\ntype: folder\n---\n"
  );
  notify();
  return path;
}

export async function createDocumentFile(
  clientSlug: string,
  parentFolder: string,
  title: string
): Promise<string | null> {
  const base = slugify(title);
  if (!base) return null;
  const desired = parentFolder ? `${parentFolder}/${base}` : base;
  let slug = desired;
  let i = 2;
  while (contentExists(documentFilePath(clientSlug, slug))) {
    slug = `${desired}-${i}`;
    i += 1;
  }
  await writeContentFile(
    documentFilePath(clientSlug, slug),
    `---\ntitle: ${JSON.stringify(title.trim())}\n---\n\n`
  );
  notify();
  return slug;
}

/** Move a file slug (no .md) to a new slug. */
export async function moveDocumentFile(
  clientSlug: string,
  fromSlug: string,
  toSlug: string
): Promise<boolean> {
  if (fromSlug === toSlug) return true;
  const fromPath = documentFilePath(clientSlug, fromSlug);
  const toPath = documentFilePath(clientSlug, toSlug);
  const content = getCurrentRaw(fromPath);
  if (content === undefined) return false;
  if (contentExists(toPath)) return false;
  const wrote = await writeContentFile(toPath, content);
  if (!wrote) return false;
  await deleteContentFile(fromPath);
  notify();
  return true;
}

/** Move folder `fromFolder` into `toParent` (both relative, no trailing slash). */
export async function moveDocumentFolder(
  clientSlug: string,
  fromFolder: string,
  toParent: string
): Promise<boolean> {
  const folderName = fromFolder.includes("/")
    ? fromFolder.slice(fromFolder.lastIndexOf("/") + 1)
    : fromFolder;
  const destFolder = toParent ? `${toParent}/${folderName}` : folderName;
  if (fromFolder === destFolder) return true;
  if (destFolder.startsWith(`${fromFolder}/`)) return false;

  const prefix = documentsPrefix(clientSlug);
  const fromPrefix = `${fromFolder}/`;
  const children = listContentPaths(prefix).filter((p) =>
    p.slice(prefix.length).startsWith(fromPrefix)
  );

  for (const p of children) {
    const rel = p.slice(prefix.length);
    const rest = rel.slice(fromPrefix.length);
    const toPath = `${prefix}${destFolder}/${rest}`;
    if (contentExists(toPath)) return false;
  }

  for (const p of children) {
    const rel = p.slice(prefix.length);
    const rest = rel.slice(fromPrefix.length);
    const toPath = `${prefix}${destFolder}/${rest}`;
    const content = getCurrentRaw(p);
    if (content === undefined) continue;
    const wrote = await writeContentFile(toPath, content);
    if (!wrote) return false;
    await deleteContentFile(p);
  }

  const markerTo = documentFilePath(clientSlug, `${destFolder}/${FOLDER_MARKER}`);
  if (!contentExists(markerTo)) {
    await writeContentFile(markerTo, "---\ntype: folder\n---\n");
  }

  notify();
  return true;
}

/** Drop a dragged file/folder onto a target folder path ("" = root). */
export async function dropDocumentItem(
  clientSlug: string,
  drag: { kind: "file" | "folder"; path: string },
  targetFolder: string
): Promise<string | null> {
  if (drag.kind === "folder") {
    const parent = drag.path.includes("/")
      ? drag.path.slice(0, drag.path.lastIndexOf("/"))
      : "";
    if (parent === targetFolder) return drag.path;
    if (targetFolder === drag.path || targetFolder.startsWith(`${drag.path}/`)) return null;
    const ok = await moveDocumentFolder(clientSlug, drag.path, targetFolder);
    if (!ok) return null;
    const name = drag.path.includes("/")
      ? drag.path.slice(drag.path.lastIndexOf("/") + 1)
      : drag.path;
    return targetFolder ? `${targetFolder}/${name}` : name;
  }

  const fileName = drag.path.includes("/")
    ? drag.path.slice(drag.path.lastIndexOf("/") + 1)
    : drag.path;
  let toSlug = targetFolder ? `${targetFolder}/${fileName}` : fileName;
  if (toSlug === drag.path) return drag.path;
  if (contentExists(documentFilePath(clientSlug, toSlug))) {
    toSlug = uniqueRelPath(clientSlug, toSlug);
  }
  const ok = await moveDocumentFile(clientSlug, drag.path, toSlug);
  return ok ? toSlug : null;
}
